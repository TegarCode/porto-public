import argparse
import json
import os
import sys
import warnings
from typing import Any

warnings.filterwarnings("ignore")
os.environ.setdefault("PYTHONWARNINGS", "ignore")


TEXT_COLUMNS = [
    "full_text",
    "text",
    "tweet",
    "comment",
    "comments",
    "komentar",
    "content",
    "review",
]

LABEL_BY_VALUE = {
    0: "neutral",
    1: "negative",
    2: "positive",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run BenchmarkSentimen models and return API-friendly JSON."
    )
    parser.add_argument("--benchmark-root", required=True)
    parser.add_argument("--file", action="append", default=[])
    parser.add_argument("--name", action="append", default=[])
    parser.add_argument("--aspect", default="all")
    parser.add_argument("--enable-ocr", action="store_true")

    return parser.parse_args()


def import_benchmark_app(benchmark_root: str):
    os.chdir(benchmark_root)
    sys.path.insert(0, benchmark_root)

    import app as benchmark_app  # type: ignore

    for model in benchmark_app.models.values():
        if not hasattr(model, "_effective_probability"):
            model._effective_probability = bool(getattr(model, "probability", False))

    return benchmark_app


def read_csv(pd: Any, path: str):
    for encoding in ["utf-8-sig", "utf-8", "latin1"]:
        try:
            return pd.read_csv(path, encoding=encoding)
        except UnicodeDecodeError:
            continue

    return pd.read_csv(path)


def first_existing_column(columns: list[str]) -> str | None:
    normalized = {
        column.strip().lower().lstrip("\ufeff").lstrip("ï»¿"): column
        for column in columns
    }

    for candidate in TEXT_COLUMNS:
        if candidate in normalized:
            return normalized[candidate]

    return None


def extract_ocr_text(url: str, headers: dict[str, str], timeout: int = 10) -> str:
    if not url or not url.lower().startswith(("http://", "https://")):
        return ""

    try:
        import requests
        import pytesseract
        from io import BytesIO
        from PIL import Image

        response = requests.get(url, headers=headers, timeout=timeout)
        if "image" not in response.headers.get("Content-Type", ""):
            return ""

        image = Image.open(BytesIO(response.content)).convert("RGB")
        return pytesseract.image_to_string(image)
    except Exception:
        return ""


def combined_texts(df: Any, text_column: str, enable_ocr: bool) -> Any:
    if "combined_text" in df.columns:
        return df["combined_text"].fillna("").astype(str)

    text = df[text_column].fillna("").astype(str)

    if "ocr_text" in df.columns:
        return text + " " + df["ocr_text"].fillna("").astype(str)

    if enable_ocr and "image_url" in df.columns:
        headers = {"User-Agent": "Mozilla/5.0"}
        ocr_text = [
            extract_ocr_text(str(value), headers)
            for value in df["image_url"].fillna("").tolist()
        ]

        return text + " " + df.__class__({"ocr_text": ocr_text})["ocr_text"]

    return text


def distribution_from_predictions(df: Any, aspects: list[str]) -> dict[str, int]:
    distribution = {
        "positive": 0,
        "neutral": 0,
        "negative": 0,
    }

    for aspect in aspects:
        column = f"pred_{aspect}"
        if column not in df.columns:
            continue

        counts = df[column].value_counts().to_dict()
        for value, label in LABEL_BY_VALUE.items():
            distribution[label] += int(counts.get(value, 0))

    return distribution


def process_file(
    benchmark_app: Any,
    pd: Any,
    path: str,
    name: str,
    selected_aspects: list[str],
    enable_ocr: bool,
) -> dict[str, Any]:
    df = read_csv(pd, path)
    prediction_columns_ready = all(
        f"pred_{aspect}" in df.columns for aspect in selected_aspects
    )

    if not prediction_columns_ready:
        text_column = first_existing_column(list(df.columns))

        if text_column is None:
            raise ValueError(
                "CSV must contain one text column such as full_text, text, comment, or review."
            )

        if "processed_combined_text" not in df.columns:
            df["combined_text"] = combined_texts(df, text_column, enable_ocr).fillna("")
            df["processed_combined_text"] = df["combined_text"].apply(
                benchmark_app.preprocess_text
            )

        transformed = benchmark_app.vectorizer.transform(df["processed_combined_text"])

        for aspect in selected_aspects:
            df[f"pred_{aspect}"] = benchmark_app.models[aspect].predict(transformed)

    rows = int(len(df))
    aspect_counts = {}
    aspect_percentages = {}

    for aspect in selected_aspects:
        column = f"pred_{aspect}"
        positive_count = int((df[column] == 2).sum())
        aspect_counts[aspect] = positive_count
        aspect_percentages[aspect] = (positive_count / rows * 100) if rows else 0

    return {
        "name": name,
        "rows": rows,
        "distribution": distribution_from_predictions(df, selected_aspects),
        "positive_counts": aspect_counts,
        "positive_percentages": aspect_percentages,
    }


def build_aspect_rows(datasets: list[dict[str, Any]], aspects: list[str]) -> list[dict[str, Any]]:
    rows = []

    for aspect in aspects:
        positive_by_dataset = [
            int(dataset["positive_counts"].get(aspect, 0)) for dataset in datasets
        ]
        percentage_by_dataset = [
            round(float(dataset["positive_percentages"].get(aspect, 0)), 2)
            for dataset in datasets
        ]

        rows.append(
            {
                "aspect": aspect,
                "positive": sum(positive_by_dataset),
                "datasets": positive_by_dataset,
                "percentages": percentage_by_dataset,
            }
        )

    return rows


def summarize(distribution: dict[str, int], aspects: list[dict[str, Any]]) -> str:
    total = sum(distribution.values())
    if total == 0:
        return "Analisis sentimen belum menghasilkan distribusi yang dapat dihitung."

    dominant = max(distribution, key=distribution.get)
    top_aspect = max(aspects, key=lambda item: int(item.get("positive", 0)), default=None)

    if top_aspect and top_aspect.get("positive", 0) > 0:
        return (
            f"Analisis sentimen menemukan {total} sinyal model, didominasi kelas "
            f"{dominant}. Aspek paling kuat adalah {top_aspect['aspect']} "
            f"({top_aspect['positive']} sinyal positif)."
        )

    return (
        f"Analisis sentimen menemukan {total} sinyal model, didominasi kelas "
        f"{dominant}, sehingga distribusi ini dapat dipakai sebagai ringkasan awal."
    )


def main() -> int:
    args = parse_args()

    if not args.file:
        raise ValueError("Upload at least one CSV file.")

    benchmark_root = os.path.abspath(args.benchmark_root)
    benchmark_app = import_benchmark_app(benchmark_root)

    import pandas as pd

    all_aspects = list(benchmark_app.aspects)
    if args.aspect and args.aspect != "all":
        if args.aspect not in all_aspects:
            raise ValueError(f"Unknown aspect: {args.aspect}")
        selected_aspects = [args.aspect]
    else:
        selected_aspects = all_aspects

    names = list(args.name or [])
    datasets = []

    for index, path in enumerate(args.file):
        fallback_name = os.path.basename(path) or f"Dataset {index + 1}"
        name = names[index] if index < len(names) and names[index] else fallback_name
        datasets.append(
            process_file(
                benchmark_app=benchmark_app,
                pd=pd,
                path=path,
                name=name,
                selected_aspects=selected_aspects,
                enable_ocr=args.enable_ocr,
            )
        )

    aspects = build_aspect_rows(datasets, selected_aspects)
    distribution = {
        "positive": sum(dataset["distribution"]["positive"] for dataset in datasets),
        "neutral": sum(dataset["distribution"]["neutral"] for dataset in datasets),
        "negative": sum(dataset["distribution"]["negative"] for dataset in datasets),
    }

    result = {
        "summary": summarize(distribution, aspects),
        "distribution": distribution,
        "aspects": aspects,
        "datasets": datasets,
        "spider": {
            "groups": [
                {
                    "label": "Network - Memory",
                    "aspects": [aspect for aspect in all_aspects[:6] if aspect in selected_aspects],
                },
                {
                    "label": "Camera - Accessories",
                    "aspects": [aspect for aspect in all_aspects[6:] if aspect in selected_aspects],
                },
            ],
            "metric": "positive_percentage",
        },
        "meta": {
            "source": "BenchmarkSentimen",
            "mode": "python_model_adapter",
            "benchmark_root": benchmark_root,
            "ocr_enabled": bool(args.enable_ocr),
        },
    }

    json.dump(result, sys.stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        if os.environ.get("SENTIMENT_ADAPTER_DEBUG") == "1":
            import traceback

            traceback.print_exc(file=sys.stderr)

        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
