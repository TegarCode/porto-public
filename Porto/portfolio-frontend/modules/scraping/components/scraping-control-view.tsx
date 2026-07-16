"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  scrapingFallbackDatabaseStatus,
  scrapingFallbackOptions,
  scrapingPreviewResult,
  scrapingPreviewStatus,
  scrapingSteps,
} from "@/modules/scraping/constants";
import {
  getScrapingDatabaseStatus,
  getScrapingOptions,
  getScrapingResult,
  getScrapingStatus,
  resolveScrapingDecision,
  setupScrapingDatabase,
  startScraping,
  stopScrapingJob,
  type ScrapingDatabaseConfig,
  type ScrapingSourceId,
  type ScrapingStatusValue,
} from "@/services/scraping-service";
import type { ApiErrorPayload } from "@/services/api-client";
import { ScrapingDataPreview } from "@/modules/scraping/components/scraping-data-preview";

const activeStatuses: ScrapingStatusValue[] = [
  "queued",
  "running",
  "awaiting_decision",
  "stopping",
];

type UiError = {
  message: string;
  hint?: string;
};

function readError(error: unknown): UiError | null {
  if (!error) {
    return null;
  }

  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const payload = error.response?.data;
    const hint =
      typeof payload?.meta?.hint === "string" ? payload.meta.hint : undefined;

    return {
      message: payload?.message || error.message,
      hint,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Request scraping gagal diproses." };
}

export function ScrapingControlView() {
  const queryClient = useQueryClient();
  const [source, setSource] = useState<ScrapingSourceId>("bps");
  const [year, setYear] = useState(scrapingFallbackOptions.bps.default_year);
  const [flow, setFlow] = useState<"export" | "import">("export");
  const [startFromHs, setStartFromHs] = useState("");
  const [launchMode, setLaunchMode] = useState<"background" | "terminal">(
    "background",
  );
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(5);
  const [ssinasAuthMode, setSsinasAuthMode] = useState<
    "manual_token" | "browser_manual"
  >("manual_token");
  const [ssinasPhpSessid, setSsinasPhpSessid] = useState("");
  const [ssinasCookieHeader, setSsinasCookieHeader] = useState("");
  const [parserMode, setParserMode] = useState<
    "model_1_default" | "model_2_negara_all"
  >("model_1_default");
  const [tradeStatus, setTradeStatus] = useState<"export" | "import">("export");
  const [parserProfile, setParserProfile] = useState<"auto" | "html" | "excel">(
    "auto",
  );
  const [folderFiles, setFolderFiles] = useState<File[]>([]);
  const [jobId, setJobId] = useState<string | undefined>();
  const [dbConfig, setDbConfig] = useState<ScrapingDatabaseConfig>(
    scrapingFallbackDatabaseStatus.config,
  );

  const optionsQuery = useQuery({
    queryKey: ["scraping", "options"],
    queryFn: getScrapingOptions,
  });

  const databaseQuery = useQuery({
    queryKey: ["scraping", "database"],
    queryFn: getScrapingDatabaseStatus,
    refetchInterval: 15000,
  });

  const options = optionsQuery.data ?? scrapingFallbackOptions;
  const databaseStatus = databaseQuery.data ?? scrapingFallbackDatabaseStatus;
  const databaseReady = databaseStatus.schema_ready;
  const tableCountEntries = Object.entries(databaseStatus.table_counts);
  const selectedSource = useMemo(
    () => options.sources.find((item) => item.id === source) ?? options.sources[0],
    [options.sources, source],
  );

  const startMutation = useMutation({
    mutationFn: startScraping,
    onSuccess: (job) => {
      setJobId(job.job_id);
      queryClient.invalidateQueries({ queryKey: ["scraping"] });
    },
  });

  const setupDatabaseMutation = useMutation({
    mutationFn: setupScrapingDatabase,
    onSuccess: (result) => {
      setDbConfig({ ...result.config, password: "" });
      queryClient.invalidateQueries({ queryKey: ["scraping", "database"] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: stopScrapingJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping", "status", jobId] });
      queryClient.invalidateQueries({ queryKey: ["scraping", "result", jobId] });
    },
  });

  const decisionMutation = useMutation({
    mutationFn: (choice: "continue" | "stop") =>
      resolveScrapingDecision(jobId ?? "", choice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping", "status", jobId] });
      queryClient.invalidateQueries({ queryKey: ["scraping", "result", jobId] });
    },
  });

  const statusQuery = useQuery({
    queryKey: ["scraping", "status", jobId],
    queryFn: () => getScrapingStatus(jobId),
    enabled: Boolean(jobId),
    refetchInterval: (query) =>
      query.state.data && activeStatuses.includes(query.state.data.status)
        ? 3000
        : false,
  });

  const resultQuery = useQuery({
    queryKey: ["scraping", "result", jobId],
    queryFn: () => getScrapingResult(jobId),
    enabled: Boolean(jobId),
    refetchInterval: () =>
      statusQuery.data && activeStatuses.includes(statusQuery.data.status)
        ? 4000
        : false,
  });

  const status = statusQuery.data ?? scrapingPreviewStatus;
  const result = resultQuery.data ?? scrapingPreviewResult;
  const isPreview = !jobId || !statusQuery.data || !resultQuery.data;
  const isRunning = activeStatuses.includes(status.status);
  const isBusy = startMutation.isPending;
  const ssinasSessionMissing =
    source === "ssinas" &&
    ssinasAuthMode === "manual_token" &&
    !ssinasPhpSessid.trim() &&
    !ssinasCookieHeader.trim();
  const hasError =
    startMutation.isError ||
    setupDatabaseMutation.isError ||
    databaseQuery.isError ||
    statusQuery.isError ||
    resultQuery.isError ||
    optionsQuery.isError;
  const apiError = useMemo(
    () =>
      [
        readError(startMutation.error),
        readError(setupDatabaseMutation.error),
        readError(databaseQuery.error),
        readError(statusQuery.error),
        readError(resultQuery.error),
        readError(optionsQuery.error),
      ].find((error): error is UiError => Boolean(error)) ?? null,
    [
      startMutation.error,
      setupDatabaseMutation.error,
      databaseQuery.error,
      statusQuery.error,
      resultQuery.error,
      optionsQuery.error,
    ],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!databaseReady) {
      return;
    }

    if (source === "bps") {
      startMutation.mutate({
        source,
        year,
        flow,
        start_from_hs: startFromHs || undefined,
        launch_mode: launchMode,
      });
      return;
    }

    if (source === "ssinas") {
      startMutation.mutate({
        source,
        start_page: startPage,
        end_page: endPage,
        auth_mode: ssinasAuthMode,
        phpsessid:
          ssinasAuthMode === "manual_token"
            ? ssinasPhpSessid.trim() || undefined
            : undefined,
        cookie_header:
          ssinasAuthMode === "manual_token"
            ? ssinasCookieHeader.trim() || undefined
            : undefined,
      });
      return;
    }

    startMutation.mutate({
      source,
      parser_mode: parserMode,
      status: tradeStatus,
      parser_profile: parserProfile,
      launch_mode: launchMode,
      folder_upload: folderFiles,
    });
  }

  function updateDbConfig<Key extends keyof ScrapingDatabaseConfig>(
    key: Key,
    value: ScrapingDatabaseConfig[Key],
  ) {
    setDbConfig((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-7xl px-6 pb-10 pt-24 md:px-10 lg:px-14">
        <header className="border-b border-ink/15 pb-8">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.2em] text-muted transition hover:text-ink"
          >
            Back to portfolio
          </Link>
          <div className="mt-10">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
                Scraping Dashboard
              </p>
              <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.02] text-ink md:text-7xl">
                Run the same scraper workflow.
              </h1>
            </div>
          </div>
        </header>
      </section>

      <section className="border-y border-ink/15 bg-paper">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 border-b border-ink/15 px-6 py-6 md:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-14">
          <div className="border border-ink/15 bg-background p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  Database Setup
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-ink">
                  {databaseReady ? "Schema siap dipakai." : "Schema belum siap."}
                </h2>
              </div>
              <span
                className={`border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] ${
                  databaseReady
                    ? "border-emerald text-emerald"
                    : "border-rose text-rose"
                }`}
              >
                {databaseReady ? "Ready" : "Setup Needed"}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              {databaseStatus.message}
            </p>
            <p className="mt-3 text-sm leading-6 text-ink">
              {databaseStatus.insight}
            </p>

            {databaseStatus.missing_tables.length > 0 ? (
              <div className="mt-4 border-l-2 border-amber px-4 py-2 text-sm leading-6 text-muted">
                Missing table: {databaseStatus.missing_tables.join(", ")}
              </div>
            ) : null}

            {tableCountEntries.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-px bg-ink/15 md:grid-cols-3">
                {tableCountEntries.map(([tableName, rowCount]) => (
                  <div key={tableName} className="bg-paper p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      {tableName}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-ink">
                      {rowCount.toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="border border-ink/15 bg-background p-5">
            <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  MySQL Config
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Ini mengikuti setup database DashboardScraper dan akan membuat
                  tabel otomatis dari schema aslinya.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDbConfig({ ...databaseStatus.config, password: "" })}
                className="border border-ink/20 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition hover:border-ink hover:text-ink"
              >
                Pakai Config
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_120px]">
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
                  Host
                </span>
                <input
                  value={dbConfig.host}
                  onChange={(event) => updateDbConfig("host", event.target.value)}
                  className="h-11 w-full border border-ink/20 bg-paper px-3 font-mono text-sm outline-none transition focus:border-ink"
                />
              </label>
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
                  Port
                </span>
                <input
                  type="number"
                  min={1}
                  value={dbConfig.port}
                  onChange={(event) =>
                    updateDbConfig("port", Number(event.target.value) || 3306)
                  }
                  className="h-11 w-full border border-ink/20 bg-paper px-3 font-mono text-sm outline-none transition focus:border-ink"
                />
              </label>
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
                  User
                </span>
                <input
                  value={dbConfig.user}
                  onChange={(event) => updateDbConfig("user", event.target.value)}
                  className="h-11 w-full border border-ink/20 bg-paper px-3 font-mono text-sm outline-none transition focus:border-ink"
                />
              </label>
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
                  Password
                </span>
                <input
                  type="password"
                  value={dbConfig.password}
                  onChange={(event) => updateDbConfig("password", event.target.value)}
                  placeholder="Kosong jika tidak ada"
                  className="h-11 w-full border border-ink/20 bg-paper px-3 font-mono text-sm outline-none transition focus:border-ink"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
                  Database
                </span>
                <input
                  value={dbConfig.database}
                  onChange={(event) => updateDbConfig("database", event.target.value)}
                  className="h-11 w-full border border-ink/20 bg-paper px-3 font-mono text-sm outline-none transition focus:border-ink"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
              <button
                type="button"
                onClick={() => setupDatabaseMutation.mutate(dbConfig)}
                disabled={setupDatabaseMutation.isPending}
                className="h-11 border border-ink bg-ink px-4 font-mono text-xs uppercase tracking-[0.16em] text-white transition hover:bg-background hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {setupDatabaseMutation.isPending ? "Setting Up" : "Simpan & Init Schema"}
              </button>
              {setupDatabaseMutation.data ? (
                <p className="text-sm leading-6 text-muted">
                  {setupDatabaseMutation.data.message}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-6 py-6 md:px-10 lg:px-14"
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr_170px]">
            <label className="space-y-2">
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                Workspace
              </span>
              <select
                value={source}
                onChange={(event) => setSource(event.target.value as ScrapingSourceId)}
                className="h-12 w-full border border-ink/20 bg-background px-4 font-mono text-sm outline-none transition focus:border-ink"
              >
                {options.sources.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-2">
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                Source Context
              </span>
              <p className="min-h-12 border border-ink/20 bg-background px-4 py-3 text-sm leading-6 text-muted">
                {selectedSource.description}
              </p>
            </div>
            <button
              type="submit"
              disabled={
                isBusy ||
                !databaseReady ||
                ssinasSessionMissing ||
                (source === "trademap" && folderFiles.length === 0)
              }
              className="mt-6 h-12 border border-ink bg-ink px-4 font-mono text-xs uppercase tracking-[0.18em] text-white transition hover:bg-background hover:text-ink disabled:cursor-not-allowed disabled:border-ink/30 disabled:bg-ink/30 disabled:text-white"
            >
              {isBusy
                ? "Starting"
                : ssinasSessionMissing
                  ? "Isi Token"
                  : databaseReady
                    ? "Start"
                    : "Setup DB"}
            </button>
          </div>

          {source === "bps" ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-[160px_170px_1fr_180px]">
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  Tahun
                </span>
                <select
                  value={year}
                  onChange={(event) => setYear(event.target.value)}
                  className="h-12 w-full border border-ink/20 bg-background px-4 font-mono text-sm outline-none transition focus:border-ink"
                >
                  {options.bps.years.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  Jenis Data
                </span>
                <select
                  value={flow}
                  onChange={(event) => setFlow(event.target.value as "export" | "import")}
                  className="h-12 w-full border border-ink/20 bg-background px-4 font-mono text-sm outline-none transition focus:border-ink"
                >
                  {options.bps.flows.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  Checkpoint HS
                </span>
                <input
                  value={startFromHs}
                  list="bps-hs-checkpoints"
                  onChange={(event) => setStartFromHs(event.target.value)}
                  placeholder="Kosongkan untuk mulai dari awal"
                  className="h-12 w-full border border-ink/20 bg-background px-4 font-mono text-sm outline-none transition focus:border-ink"
                />
                <datalist id="bps-hs-checkpoints">
                  {options.bps.checkpoints.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </datalist>
                <p className="text-xs leading-5 text-muted">
                  {options.bps.checkpoint_count.toLocaleString("id-ID")} HS dari
                  Excel tersedia; 500 pertama dimuat untuk pencarian cepat.
                </p>
              </label>
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  Run Mode
                </span>
                <select
                  value={launchMode}
                  onChange={(event) =>
                    setLaunchMode(event.target.value as "background" | "terminal")
                  }
                  className="h-12 w-full border border-ink/20 bg-background px-4 font-mono text-sm outline-none transition focus:border-ink"
                >
                  <option value="background">Dashboard</option>
                  <option value="terminal">Terminal</option>
                </select>
              </label>
            </div>
          ) : null}

          {source === "ssinas" ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[230px_150px_150px_1fr]">
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  Auth Mode
                </span>
                <select
                  value={ssinasAuthMode}
                  onChange={(event) =>
                    setSsinasAuthMode(
                      event.target.value as "manual_token" | "browser_manual",
                    )
                  }
                  className="h-12 w-full border border-ink/20 bg-background px-4 font-mono text-sm outline-none transition focus:border-ink"
                >
                  {options.ssinas.auth_modes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  Start Page
                </span>
                <input
                  type="number"
                  min={1}
                  value={startPage}
                  onChange={(event) => setStartPage(Number(event.target.value))}
                  className="h-12 w-full border border-ink/20 bg-background px-4 font-mono text-sm outline-none transition focus:border-ink"
                />
              </label>
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  End Page
                </span>
                <input
                  type="number"
                  min={1}
                  value={endPage}
                  onChange={(event) => setEndPage(Number(event.target.value))}
                  className="h-12 w-full border border-ink/20 bg-background px-4 font-mono text-sm outline-none transition focus:border-ink"
                />
              </label>
              <div className="border border-ink/15 bg-background px-4 py-3">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">
                  Auth Flow
                </p>
                <p className="mt-2 text-sm leading-6 text-ink">
                  {options.ssinas.auth_flow}
                </p>
              </div>

              {ssinasAuthMode === "manual_token" ? (
                <>
                  <label className="space-y-2 lg:col-span-2">
                    <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                      PHPSESSID
                    </span>
                    <input
                      type="password"
                      value={ssinasPhpSessid}
                      onChange={(event) => setSsinasPhpSessid(event.target.value)}
                      placeholder="Paste value PHPSESSID dari browser"
                      className="h-12 w-full border border-ink/20 bg-background px-4 font-mono text-sm outline-none transition focus:border-ink"
                    />
                  </label>
                  <label className="space-y-2 lg:col-span-2">
                    <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                      Full Cookie Header
                    </span>
                    <textarea
                      value={ssinasCookieHeader}
                      onChange={(event) => setSsinasCookieHeader(event.target.value)}
                      placeholder="Opsional: PHPSESSID=...; cookie_lain=..."
                      rows={3}
                      className="w-full resize-y border border-ink/20 bg-background px-4 py-3 font-mono text-sm outline-none transition focus:border-ink"
                    />
                  </label>
                  <p className="border-l-2 border-amber px-4 py-2 text-sm leading-6 text-muted lg:col-span-4">
                    Cara pakai VPS: login ke SSINAS dari browser pribadi, buka
                    DevTools/Application/Cookies, ambil value `PHPSESSID`, lalu
                    paste ke form ini. Jika portal butuh cookie tambahan, paste
                    seluruh header cookie di field Full Cookie Header.
                  </p>
                </>
              ) : (
                <p className="border-l-2 border-rose px-4 py-2 text-sm leading-6 text-muted lg:col-span-4">
                  Browser Manual Lokal hanya cocok saat DashboardScraper jalan
                  di komputer yang punya GUI. Untuk VPS/public deployment,
                  gunakan Manual PHPSESSID / Cookie.
                </p>
              )}
            </div>
          ) : null}

          {source === "trademap" ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[190px_150px_190px_1fr_180px]">
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  Mode Parser
                </span>
                <select
                  value={parserMode}
                  onChange={(event) =>
                    setParserMode(
                      event.target.value as "model_1_default" | "model_2_negara_all",
                    )
                  }
                  className="h-12 w-full border border-ink/20 bg-background px-4 font-mono text-sm outline-none transition focus:border-ink"
                >
                  {options.trademap.parser_modes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  Status
                </span>
                <select
                  value={tradeStatus}
                  onChange={(event) =>
                    setTradeStatus(event.target.value as "export" | "import")
                  }
                  className="h-12 w-full border border-ink/20 bg-background px-4 font-mono text-sm outline-none transition focus:border-ink"
                >
                  {options.trademap.statuses.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  Profil Parser
                </span>
                <select
                  value={parserProfile}
                  onChange={(event) =>
                    setParserProfile(event.target.value as "auto" | "html" | "excel")
                  }
                  className="h-12 w-full border border-ink/20 bg-background px-4 font-mono text-sm outline-none transition focus:border-ink"
                >
                  {options.trademap.parser_profiles.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  Folder TradeMap
                </span>
                <input
                  ref={(node) => {
                    node?.setAttribute("webkitdirectory", "");
                    node?.setAttribute("directory", "");
                  }}
                  type="file"
                  accept=".xls,.xlsx"
                  multiple
                  onChange={(event) =>
                    setFolderFiles(Array.from(event.target.files ?? []))
                  }
                  className="block h-12 w-full border border-ink/20 bg-background px-3 py-2 text-sm file:mr-4 file:border-0 file:bg-ink file:px-3 file:py-2 file:text-xs file:uppercase file:tracking-[0.14em] file:text-white"
                />
                <p className="text-xs leading-5 text-muted">
                  {folderFiles.length} file dipilih.
                </p>
              </label>
              <label className="space-y-2">
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  Run Mode
                </span>
                <select
                  value={launchMode}
                  onChange={(event) =>
                    setLaunchMode(event.target.value as "background" | "terminal")
                  }
                  className="h-12 w-full border border-ink/20 bg-background px-4 font-mono text-sm outline-none transition focus:border-ink"
                >
                  <option value="background">Dashboard</option>
                  <option value="terminal">Terminal</option>
                </select>
              </label>
            </div>
          ) : null}
        </form>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 md:px-10 lg:grid-cols-[0.78fr_1.22fr] lg:px-14">
        <article className="space-y-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">
              Problem
            </p>
            <p className="mt-3 text-base leading-7 text-ink">
              Pipeline scraping sering tidak terlihat oleh user. UI ini
              memperlihatkan tahap pengambilan data agar prosesnya bisa
              dipercaya dan diaudit.
            </p>
          </div>

          <div className="border-y border-ink/15 py-7">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">
              Insight
            </p>
            <p className="mt-4 text-xl leading-8 text-ink">{result.summary}</p>
            {hasError ? (
              <p className="mt-4 border-l-2 border-rose bg-paper px-4 py-3 text-sm leading-6 text-rose">
                {apiError?.message ||
                  `Pastikan DashboardScraper berjalan di ${options.dashboard.base_url}.`}
                {apiError?.hint ? (
                  <>
                    <br />
                    {apiError.hint}
                  </>
                ) : (
                  <>
                    <br />
                    Jalankan dari folder DashboardScraper dengan command `py
                    flask-scrapSSinas run` atau launcher project.
                  </>
                )}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 border border-ink/15 bg-paper">
            <div className="border-r border-ink/15 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                Status
              </p>
              <p className="mt-2 text-2xl font-semibold">{status.status}</p>
            </div>
            <div className="p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                Rows
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {result.meta.total_rows}
              </p>
            </div>
          </div>
        </article>

        <section className="space-y-6">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Pipeline Status
              </p>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                Tahap pipeline ditampilkan sebagai narasi proses: request,
                parsing, normalisasi, lalu preview data.
              </p>
            </div>
            <span className="border border-ink/15 px-3 py-2 font-mono text-xs uppercase tracking-[0.16em] text-muted">
              {isPreview ? "Preview data" : "Live DashboardScraper"}
            </span>
          </div>

          <div className="border border-ink/15 bg-paper p-5">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  {status.job_id}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-ink">
                  {status.current_step}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {status.can_stop ? (
                  <button
                    type="button"
                    onClick={() => jobId && stopMutation.mutate(jobId)}
                    disabled={stopMutation.isPending}
                    className="border border-rose px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-rose transition hover:bg-rose hover:text-white disabled:opacity-50"
                  >
                    Stop
                  </button>
                ) : null}
                <p className="text-4xl font-semibold text-ink">
                  {status.progress}%
                </p>
              </div>
            </div>
            <div className="mt-5 h-3 bg-background">
              <div
                className="h-3 bg-amber transition-all"
                style={{ width: `${status.progress}%` }}
              />
            </div>
            {isRunning ? (
              <p className="mt-4 text-sm leading-6 text-muted">
                Job masih berjalan. Status akan diperbarui otomatis dari
                DashboardScraper.
              </p>
            ) : null}
          </div>

          {status.awaiting_decision && status.decision_context ? (
            <div className="border border-amber bg-paper p-5">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                Duplicate Alert
              </p>
              <p className="mt-3 text-sm leading-6 text-ink">
                Halaman {status.decision_context.page_number} memproses{" "}
                {status.decision_context.processed_count} row,{" "}
                {status.decision_context.inserted_count} row baru masuk, dan{" "}
                {status.decision_context.ignored_count} row duplicate diabaikan.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => decisionMutation.mutate("continue")}
                  disabled={decisionMutation.isPending}
                  className="border border-ink bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-white transition hover:bg-paper hover:text-ink disabled:opacity-50"
                >
                  Lanjutkan
                </button>
                <button
                  type="button"
                  onClick={() => decisionMutation.mutate("stop")}
                  disabled={decisionMutation.isPending}
                  className="border border-rose px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-rose transition hover:bg-rose hover:text-white disabled:opacity-50"
                >
                  Hentikan
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-px bg-ink/15 md:grid-cols-4">
            {scrapingSteps.map((step, index) => (
              <article key={step} className="bg-paper p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                  Step 0{index + 1}
                </p>
                <p className="mt-4 text-lg font-semibold text-ink">{step}</p>
              </article>
            ))}
          </div>

          {status.logs && status.logs.length > 0 ? (
            <div className="border border-ink/15 bg-paper p-5">
              <div className="mb-4 border-b border-ink/15 pb-3">
                <h3 className="text-xl font-semibold text-ink">Log Output</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Log ini dibaca dari job DashboardScraper untuk mengecek
                  browser login, batch BPS, atau parser folder.
                </p>
              </div>
              <div className="max-h-[260px] overflow-y-auto bg-ink p-4 font-mono text-xs leading-6 text-white">
                {status.logs.slice(-80).map((line, index) => (
                  <div key={`${line}-${index}`}>{line}</div>
                ))}
              </div>
            </div>
          ) : null}

          <ScrapingDataPreview result={result} />
        </section>
      </section>
    </main>
  );
}
