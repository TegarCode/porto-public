import type {
  ScrapingDatabaseStatus,
  ScrapingResult,
  ScrapingOptions,
  ScrapingStatus,
} from "@/services/scraping-service";

export const scrapingSources = [
  {
    id: "bps",
    name: "BPS Trade Unified",
    description:
      "Runner BPS gabungan dengan pilihan tahun, export/import, dan checkpoint HS dari Excel.",
  },
  {
    id: "ssinas",
    name: "SSINAS Session Token",
    description:
      "Paste PHPSESSID atau full cookie aktif dari browser user agar scraping berjalan tanpa browser server.",
  },
  {
    id: "trademap",
    name: "TradeMap Folder Import",
    description:
      "Parser folder Excel atau HTML TradeMap ke database dengan mode export/import.",
  },
] as const;

const currentYear = new Date().getFullYear();
const fallbackYears = Array.from({ length: 10 }, (_, index) => currentYear - 10 + index);

export const scrapingFallbackOptions: ScrapingOptions = {
  sources: scrapingSources.map((source) => ({
    id: source.id,
    tool_key:
      source.id === "bps"
        ? "bps-trade"
        : source.id === "trademap"
          ? "trademap-folder-parser"
          : "ssinas",
    name: source.name,
    kind: source.id === "ssinas" ? "internal" : "script",
    description: source.description,
  })),
  bps: {
    years: fallbackYears.map((year) => ({
      value: String(year),
      label: String(year),
    })),
    default_year: String(currentYear - 1),
    flows: [
      { value: "export", label: "Export" },
      { value: "import", label: "Import" },
    ],
    checkpoints: [],
    checkpoint_count: 0,
    checkpoint_source: "DashboardScraper resources/bps/hscode_clean_BPS.xlsx",
  },
  ssinas: {
    default_start_page: 1,
    default_end_page: 5,
    auth_flow:
      "Login dilakukan di browser user, paste PHPSESSID/full cookie ke form, lalu server menjalankan scraping dengan session tersebut.",
    auth_modes: [
      { value: "manual_token", label: "Manual PHPSESSID / Cookie" },
      { value: "browser_manual", label: "Browser Manual Lokal" },
    ],
  },
  trademap: {
    parser_modes: [
      { value: "model_1_default", label: "Negara-Mitra" },
      { value: "model_2_negara_all", label: "Negara-ALL" },
    ],
    statuses: [
      { value: "export", label: "Export" },
      { value: "import", label: "Import" },
    ],
    parser_profiles: [
      { value: "auto", label: "Auto Detect" },
      { value: "html", label: "HTML TradeMap" },
      { value: "excel", label: "Excel Template" },
    ],
  },
  dashboard: {
    base_url: "http://127.0.0.1:5000",
    root: "C:\\laragon\\www\\DashboardScraper",
  },
};

export const scrapingFallbackDatabaseStatus: ScrapingDatabaseStatus = {
  configured: false,
  server_ok: false,
  database_exists: false,
  schema_ready: false,
  message: "Konfigurasi database DashboardScraper belum dibaca.",
  missing_tables: [
    "perusahaan",
    "tbtrade",
    "tbnegara",
    "ref_negara",
    "tbsumber",
    "data_perdagangan_full_v3",
    "data_perdagangan",
  ],
  table_counts: {},
  config: {
    host: "localhost",
    port: 3306,
    user: "root",
    password: "",
    database: "flask",
  },
  setup_result: null,
  setup_error: null,
  dashboard: {
    base_url: "http://127.0.0.1:5000",
    root: "C:\\laragon\\www\\DashboardScraper",
  },
  insight:
    "Jalankan setup schema supaya SSINAS, BPS, dan TradeMap menulis ke database yang sama.",
};

export const scrapingPreviewStatus: ScrapingStatus = {
  job_id: "preview-job",
  status: "completed",
  status_label: "Selesai",
  status_tone: "success",
  progress: 100,
  current_step: "Data normalized and ready for preview",
  source: "BPS",
  updated_at: "2026-07-03 20:00",
  logs: [
    "Background process dimulai.",
    "Request source selesai.",
    "Data normalized and ready for preview.",
  ],
  can_stop: false,
  awaiting_decision: false,
};

export const scrapingPreviewResult: ScrapingResult = {
  summary:
    "Pipeline preview menunjukkan data berhasil melewati tahap request, parsing, normalisasi, dan preview table.",
  source: "BPS",
  rows: [
    {
      indicator: "Export Value",
      period: 2024,
      value: 24823,
      unit: "Ribu US$",
    },
    {
      indicator: "Import Value",
      period: 2024,
      value: 21618,
      unit: "Ribu US$",
    },
    {
      indicator: "Trade Balance",
      period: 2024,
      value: 3205,
      unit: "Ribu US$",
    },
  ],
  meta: {
    total_rows: 3,
    columns: ["indicator", "period", "value", "unit"],
    mode: "preview",
  },
};

export const scrapingSteps = [
  "Request source",
  "Parse response",
  "Normalize schema",
  "Preview data",
];
