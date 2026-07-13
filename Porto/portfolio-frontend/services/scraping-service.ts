import { apiClient, unwrapApiData } from "@/services/api-client";

export type ScrapingSourceId = "bps" | "ssinas" | "trademap";
export type ScrapingStatusValue =
  | "queued"
  | "running"
  | "awaiting_decision"
  | "stopping"
  | "completed"
  | "stopped"
  | "failed"
  | "launched";

export type ScrapingJob = {
  job_id: string;
  status: ScrapingStatusValue;
  source: string;
  message: string;
  started_at?: string;
};

export type ScrapingStatus = {
  job_id: string;
  status: ScrapingStatusValue;
  status_label?: string;
  status_tone?: string;
  progress: number;
  current_step: string;
  source: string;
  updated_at: string;
  logs?: string[];
  can_stop?: boolean;
  awaiting_decision?: boolean;
  decision_context?: {
    page_number: number;
    processed_count: number;
    inserted_count: number;
    ignored_count: number;
  } | null;
  insight?: string;
};

export type ScrapingResult = {
  summary: string;
  source: string;
  rows: Array<Record<string, string | number | null>>;
  meta: {
    total_rows: number;
    columns: string[];
    mode: string;
    preview_source?: string;
    logs?: string[];
    can_stop?: boolean;
    awaiting_decision?: boolean;
  };
};

export type StartScrapingInput = {
  source: ScrapingSourceId;
  year?: string;
  flow?: "export" | "import";
  start_from_hs?: string;
  launch_mode?: "background" | "terminal";
  start_page?: number;
  end_page?: number;
  auth_mode?: "manual_token" | "browser_manual";
  phpsessid?: string;
  cookie_header?: string;
  parser_mode?: "model_1_default" | "model_2_negara_all";
  status?: "export" | "import";
  parser_profile?: "auto" | "html" | "excel";
  folder_upload?: File[];
};

export type ScrapingOptionItem = {
  value: string;
  label: string;
  description?: string;
};

export type ScrapingOptions = {
  sources: Array<{
    id: ScrapingSourceId;
    tool_key: string;
    name: string;
    kind: string;
    description: string;
  }>;
  bps: {
    years: ScrapingOptionItem[];
    default_year: string;
    flows: ScrapingOptionItem[];
    checkpoints: ScrapingOptionItem[];
    checkpoint_count: number;
    checkpoint_source: string;
  };
  ssinas: {
    default_start_page: number;
    default_end_page: number;
    auth_flow: string;
    auth_modes: ScrapingOptionItem[];
  };
  trademap: {
    parser_modes: ScrapingOptionItem[];
    statuses: ScrapingOptionItem[];
    parser_profiles: ScrapingOptionItem[];
  };
  dashboard: {
    base_url: string;
    root: string;
  };
};

export type ScrapingDatabaseConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

export type ScrapingDatabaseStatus = {
  configured: boolean;
  server_ok: boolean;
  database_exists: boolean;
  schema_ready: boolean;
  message: string;
  missing_tables: string[];
  table_counts: Record<string, number>;
  config: ScrapingDatabaseConfig;
  setup_result?: {
    executed?: number;
    ignored?: number;
    skipped?: number;
  } | null;
  setup_error?: string | null;
  dashboard: {
    base_url: string;
    root: string;
  };
  insight: string;
};

export async function startScraping(
  input: StartScrapingInput,
): Promise<ScrapingJob> {
  const files = input.folder_upload ?? [];

  if (files.length > 0) {
    const formData = new FormData();

    Object.entries(input).forEach(([key, value]) => {
      if (key === "folder_upload" || value === undefined || value === null) {
        return;
      }

      formData.append(key, String(value));
    });

    files.forEach((file) => {
      const relativePath =
        "webkitRelativePath" in file && typeof file.webkitRelativePath === "string"
          ? file.webkitRelativePath
          : file.name;

      formData.append("folder_upload[]", file, relativePath || file.name);
    });

    const response = await apiClient.post("/scraping/start", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return unwrapApiData<ScrapingJob>(response);
  }

  const response = await apiClient.post("/scraping/start", input);

  return unwrapApiData<ScrapingJob>(response);
}

export async function getScrapingOptions(): Promise<ScrapingOptions> {
  const response = await apiClient.get("/scraping/options");

  return unwrapApiData<ScrapingOptions>(response);
}

export async function getScrapingDatabaseStatus(): Promise<ScrapingDatabaseStatus> {
  const response = await apiClient.get("/scraping/database/status");

  return unwrapApiData<ScrapingDatabaseStatus>(response);
}

export async function setupScrapingDatabase(
  input: ScrapingDatabaseConfig,
): Promise<ScrapingDatabaseStatus> {
  const response = await apiClient.post("/scraping/database/setup", input);

  return unwrapApiData<ScrapingDatabaseStatus>(response);
}

export async function getScrapingStatus(
  jobId?: string,
): Promise<ScrapingStatus> {
  const response = await apiClient.get("/scraping/status", {
    params: jobId ? { job_id: jobId } : undefined,
  });

  return unwrapApiData<ScrapingStatus>(response);
}

export async function getScrapingResult(
  jobId?: string,
): Promise<ScrapingResult> {
  const response = await apiClient.get("/scraping/result", {
    params: jobId ? { job_id: jobId } : undefined,
  });

  return unwrapApiData<ScrapingResult>(response);
}

export async function stopScrapingJob(jobId: string): Promise<ScrapingJob> {
  const response = await apiClient.post("/scraping/stop", { job_id: jobId });

  return unwrapApiData<ScrapingJob>(response);
}

export async function resolveScrapingDecision(
  jobId: string,
  choice: "continue" | "stop",
): Promise<ScrapingJob> {
  const response = await apiClient.post("/scraping/decision", {
    job_id: jobId,
    choice,
  });

  return unwrapApiData<ScrapingJob>(response);
}
