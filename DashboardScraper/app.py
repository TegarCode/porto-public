from pathlib import Path
from uuid import uuid4

from flask import Flask, abort, jsonify, redirect, render_template, request, send_file, url_for

from db_runtime import (
    build_db_profile,
    initialize_database,
    is_database_configured,
    load_db_config,
    normalize_db_config,
    probe_database,
    save_db_config,
    DatabaseSetupError,
)
from job_manager import get_job, list_jobs, resolve_job_decision, start_tool_job, stop_job
from ml_predictor import (
    EXPORT_ONLY_NOTE,
    PredictionInputError,
    get_ml_asset_status,
    get_prediction_download_path,
    predict_from_manual_dataset,
)
from tool_registry import APP_DIR, build_dashboard_context, get_tool

app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0
app.jinja_env.auto_reload = True

UPLOAD_ROOT = APP_DIR / "runtime" / "uploads"


def wants_json_response():
    return (
        request.args.get("format") == "json"
        or request.headers.get("X-Requested-With") == "XMLHttpRequest"
        or request.is_json
        or request.accept_mimetypes.best == "application/json"
    )


def json_database_setup_payload(
    form_state,
    status_snapshot,
    setup_result=None,
    setup_error=None,
    saved_config=None,
):
    payload = {
        "form_state": form_state,
        "current_config": saved_config,
        "status_snapshot": status_snapshot,
        "setup_result": setup_result,
        "setup_error": setup_error,
    }

    return jsonify(
        {
            "data": payload,
            "message": setup_error or status_snapshot.get("message", "Database setup status ready."),
        }
    )


def build_page_context(current_section=None, selected_job=None):
    if selected_job is not None and current_section is None:
        current_section = selected_job.get("tool_workspace")

    context = build_dashboard_context(current_workspace=current_section)
    jobs = list_jobs(limit=30)
    filtered_jobs = [
        job for job in jobs if job.get("tool_workspace") == context["current_section"]
    ]
    context["jobs"] = filtered_jobs[:10]
    context["selected_job"] = selected_job
    context["db_profile"] = build_db_profile()
    return context


def build_db_form_state(saved_config=None, form_data=None):
    fallback = saved_config or load_db_config() or {}
    merged = normalize_db_config(form_data or {}, fallback=fallback)

    if saved_config and form_data is None:
        return merged

    if saved_config and not str((form_data or {}).get("password", "")).strip():
        merged["password"] = saved_config["password"]

    return merged


def build_ml_workspace_context(prediction_result=None, page_alert=None):
    context = build_page_context(current_section="ml")
    context["ml_tool"] = get_tool("ml-gravity-predictor")
    context["ml_asset_status"] = get_ml_asset_status()
    context["prediction_result"] = prediction_result
    context["page_alert"] = page_alert
    context["manual_dataset_note"] = EXPORT_ONLY_NOTE
    return context


def _sanitize_relative_upload_path(raw_name: str):
    cleaned = str(raw_name).replace("\\", "/").strip()
    parts = [part for part in cleaned.split("/") if part not in {"", ".", ".."}]
    if not parts:
        return None
    return Path(*parts)


def _save_uploaded_folder(tool, files):
    saved_files = []
    upload_dir = UPLOAD_ROOT / tool.key / uuid4().hex[:10]
    upload_dir.mkdir(parents=True, exist_ok=True)

    for storage in files:
        if storage is None or not storage.filename:
            continue

        relative_path = _sanitize_relative_upload_path(storage.filename)
        if relative_path is None:
            continue

        destination = upload_dir / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        storage.save(destination)
        saved_files.append(destination)

    if not saved_files:
        return None, 0

    return upload_dir, len(saved_files)


@app.before_request
def require_database_setup():
    if request.endpoint in {"database_setup", "static"}:
        return None

    if request.endpoint is None:
        return None

    if not is_database_configured():
        return redirect(url_for("database_setup"))

    return None


@app.get("/")
def index():
    current_section = request.args.get("section")
    if current_section == "ml":
        return render_template("ml_workspace.html", **build_ml_workspace_context())
    return render_template("index.html", **build_page_context(current_section=current_section))


@app.route("/setup/database", methods=["GET", "POST"])
def database_setup():
    saved_config = load_db_config()
    form_state = build_db_form_state(saved_config=saved_config)
    setup_error = None
    setup_result = None
    status_snapshot = probe_database(saved_config) if saved_config else probe_database(None)

    if request.method == "POST":
        raw_form_data = request.get_json(silent=True) if request.is_json else None
        if raw_form_data is None:
            raw_form_data = request.form.to_dict()

        form_state = build_db_form_state(
            saved_config=saved_config,
            form_data=raw_form_data,
        )

        try:
            setup_result = initialize_database(form_state)
        except DatabaseSetupError as exc:
            setup_error = str(exc)
            status_snapshot = probe_database(form_state)
            if wants_json_response():
                return json_database_setup_payload(
                    form_state=form_state,
                    status_snapshot=status_snapshot,
                    setup_result=setup_result,
                    setup_error=setup_error,
                    saved_config=saved_config,
                ), 422
        else:
            saved_config = save_db_config(form_state)
            status_snapshot = setup_result["snapshot"]
            if wants_json_response():
                return json_database_setup_payload(
                    form_state=form_state,
                    status_snapshot=status_snapshot,
                    setup_result=setup_result,
                    saved_config=saved_config,
                )
            return redirect(url_for("index"))

    if wants_json_response():
        return json_database_setup_payload(
            form_state=form_state,
            status_snapshot=status_snapshot,
            setup_result=setup_result,
            setup_error=setup_error,
            saved_config=saved_config,
        )

    return render_template(
        "setup_db.html",
        form_state=form_state,
        current_config=saved_config,
        setup_error=setup_error,
        setup_result=setup_result,
        status_snapshot=status_snapshot,
    )


@app.post("/run/<tool_key>")
def run_tool(tool_key):
    tool = get_tool(tool_key)
    if tool is None:
        abort(404)

    params = request.form.to_dict()

    if tool.key == "trademap-folder-parser":
        upload_dir, file_count = _save_uploaded_folder(
            tool,
            request.files.getlist("folder_upload"),
        )
        if upload_dir is None:
            context = build_page_context(current_section=tool.workspace)
            context["page_alert"] = {
                "tone": "warning",
                "eyebrow": "Upload Folder",
                "title": "Folder TradeMap belum dipilih",
                "message": (
                    "Pilih folder yang berisi file `.xls` atau `.xlsx` dulu, "
                    "baru jalankan parser."
                ),
            }
            return render_template("index.html", **context), 400

        params["folder_source"] = str(upload_dir)
        params["uploaded_file_count"] = str(file_count)

    job = start_tool_job(tool, params)

    if wants_json_response():
        return jsonify({"data": job, "message": "Job started."}), 201

    return redirect(url_for("job_result", job_id=job["id"]))


@app.get("/jobs/<job_id>")
def job_result(job_id):
    job = get_job(job_id)
    if job is None:
        abort(404)

    if wants_json_response():
        return jsonify({"data": job, "message": "Job detail."})

    context = build_page_context(selected_job=job)
    context["selected_tool"] = get_tool(job.get("tool_key"))
    context["selected_form_values"] = job.get("params", {})
    return render_template("result.html", **context)


@app.post("/ml/predict/tbtrade")
def ml_predict_tbtrade():
    context = build_ml_workspace_context(
        page_alert={
            "tone": "warning",
            "eyebrow": "Mode tbtrade",
            "title": "Mode tbtrade dinonaktifkan",
            "message": (
                "Workspace ML sekarang difokuskan ke upload dataset manual penuh. "
                "Gunakan template dataset yang tersedia di halaman ini agar format input sesuai model."
            ),
        },
    )
    return render_template("ml_workspace.html", **context), 410


@app.post("/ml/predict/dataset")
def ml_predict_dataset():
    dataset_file = request.files.get("dataset_file")

    try:
        prediction_result = predict_from_manual_dataset(dataset_file)
    except (PredictionInputError, ValueError) as exc:
        context = build_ml_workspace_context(
            page_alert={
                "tone": "warning",
                "eyebrow": "Prediksi Dataset",
                "title": "Dataset belum bisa diprediksi",
                "message": str(exc),
            }
        )
        return render_template("ml_workspace.html", **context), 400

    context = build_ml_workspace_context(
        prediction_result=prediction_result,
        page_alert={
            "tone": "info",
            "eyebrow": "Prediksi Dataset",
            "title": "Prediksi dataset berhasil dibuat",
            "message": "Preview hasil tampil di bawah dan file CSV lengkapnya bisa langsung diunduh.",
        },
    )
    return render_template("ml_workspace.html", **context)


@app.get("/ml/download/<download_token>")
def ml_download_prediction(download_token):
    file_path = get_prediction_download_path(download_token)
    if file_path is None:
        abort(404)

    return send_file(
        file_path,
        as_attachment=True,
        download_name=file_path.name,
        mimetype="text/csv",
    )


@app.post("/jobs/<job_id>/stop")
def stop_job_route(job_id):
    job = stop_job(job_id)
    if job is None:
        abort(404)

    if wants_json_response():
        return jsonify({"data": job, "message": "Stop request sent."})

    return redirect(url_for("job_result", job_id=job_id))


@app.post("/jobs/<job_id>/decision")
def resolve_job_decision_route(job_id):
    choice = request.form.get("choice", "")
    job = resolve_job_decision(job_id, choice)
    if job is None:
        abort(404)

    if wants_json_response():
        return jsonify({"data": job, "message": "Decision request sent."})

    return redirect(url_for("job_result", job_id=job_id))


if __name__ == "__main__":
    app.run(debug=True, use_reloader=True)
