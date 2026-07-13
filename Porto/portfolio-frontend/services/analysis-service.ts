import { apiClient, unwrapApiData } from "@/services/api-client";
import type { AnalysisFilters } from "@/services/query-keys";

export type Highlight = {
  label: string;
  count: number;
  description?: string;
  avg_rca?: number | null;
};

export type RcaCmsaRow = {
  label: string;
  bucket?: string;
  strategy?: string;
  value?: number | null;
  rank?: number;
  rca_origin?: number | null;
  cmsa_origin?: number | null;
  rca_destination?: number | null;
  cmsa_destination?: number | null;
  strength_score: number;
  record: Record<string, unknown>;
};

export type RcaCmsaSimpleRow = {
  rank: number;
  hs4: string;
  kode: string;
  nama: string;
  strategi: string;
  nilai: number | null;
};

export type RcaCmsaAnalysis = {
  title: string;
  insight: string;
  data: RcaCmsaRow[];
  buckets: {
    export: RcaCmsaSimpleRow[];
    import: RcaCmsaSimpleRow[];
    fdiInbound: RcaCmsaSimpleRow[];
    fdiOutbound: RcaCmsaSimpleRow[];
  };
  totals: {
    allCount: number;
    exportCount: number;
    importCount: number;
    fdiInboundCount: number;
    fdiOutboundCount: number;
    exportSum: number | null;
    importSum: number | null;
    fdiInboundSum: number | null;
    fdiOutboundSum: number | null;
  };
  origin?: { code: string | null; name: string | null };
  destination?: { code: string | null; name: string | null };
  highlight: Highlight[];
  chart: {
    type: "bar_line" | "strategy_bar";
    label_key: "label";
    bar_keys: string[];
    line_keys: string[];
    data: RcaCmsaRow[];
  };
  filters: AnalysisFilters;
  source: string;
};

export type RscaTbiPoint = {
  label: string;
  kode?: string;
  hs4?: string;
  x: number;
  y: number;
  rsca: number;
  tbi: number;
  quadrant: string;
  record: Record<string, unknown>;
};

export type RscaTbiRow = {
  kode: string;
  hs4: string;
  nama: string;
  pm2019: string | null;
  pm2023: string | null;
  share2019: number | null;
  share2023: number | null;
  rsca2019: number | null;
  rsca2023: number | null;
  tbi2019: number | null;
  tbi2023: number | null;
};

export type RscaTbiCalculationRow = RscaTbiRow & {
  nilai2019: number | null;
  nilai2023: number | null;
  dunia2019: number | null;
  dunia2023: number | null;
  rca2019: number | null;
  rca2023: number | null;
  groupRsca2019: number | null;
  groupRsca2023: number | null;
  groupTbi2019: number | null;
  groupTbi2023: number | null;
};

export type RscaTbiComparisonRow = Record<string, string | number | null>;

export type RscaTbiTablePayload<TRow> = {
  rows: TRow[];
  origin?: { code: string | null; name: string | null; alpha2?: string | null };
  destination?: {
    code: string | null;
    name: string | null;
    alpha2?: string | null;
  };
  filters: AnalysisFilters;
  source: string;
  source_name?: string;
  sourceName?: string;
  record_count?: number;
};

export type RscaTbiQuadrant = {
  key: string;
  label: string;
  description: string;
  count: number;
  items: Array<{
    label: string;
    rsca: number;
    tbi: number;
  }>;
};

export type RscaTbiAnalysis = {
  title: string;
  insight: string;
  rows?: RscaTbiRow[];
  quadrants: RscaTbiQuadrant[];
  scatter: {
    x_axis: AxisDefinition;
    y_axis: AxisDefinition;
    points: RscaTbiPoint[];
  };
  filters: AnalysisFilters;
  source: string;
  sourceName?: string;
  origin?: { code: string | null; name: string | null; alpha2?: string | null };
  destination?: {
    code: string | null;
    name: string | null;
    alpha2?: string | null;
  };
  recordCount?: number;
  highlight: Highlight[];
};

export type RcaEpdPoint = {
  label: string;
  kode?: string;
  hs4?: string;
  x: number;
  y: number;
  growth_share: number;
  growth_demand: number;
  avg_rca: number | null;
  position: string;
  position_label: string;
  x_model: string | null;
  record: Record<string, unknown>;
};

export type RcaEpdRow = {
  kode: string;
  hs4: string;
  komoditas: string;
  kategoriEpd: string | null;
  avgGrowthShare: number | null;
  avgGrowthDemand: number | null;
  avgRca: number | null;
  xModel: string | null;
};

export type RcaEpdTablePayload<TRow> = {
  rows: TRow[];
  origin?: { code: string | null; name: string | null; alpha2?: string | null };
  destination?: {
    code: string | null;
    name: string | null;
    alpha2?: string | null;
  };
  filters: AnalysisFilters;
  source: string;
  source_name?: string;
  sourceName?: string;
  record_count?: number;
};

export type RcaEpdCalculationRow = Record<string, string | number | null>;

export type RcaEpdComparisonRow = Record<string, string | number | null>;

export type RcaEpdXModelOptions = {
  options: string[];
  origin?: { code: string | null; name: string | null; alpha2?: string | null };
  destination?: {
    code: string | null;
    name: string | null;
    alpha2?: string | null;
  };
  filters: AnalysisFilters;
  source: string;
  sourceName?: string;
};

export type RcaEpdMatrixGroup = {
  key: string;
  label: string;
  count: number;
  avg_rca: number | null;
  items: Array<{
    label: string;
    growth_share: number;
    growth_demand: number;
    avg_rca: number | null;
    x_model: string | null;
  }>;
};

export type RcaEpdAnalysis = {
  title: string;
  insight: string;
  rows?: RcaEpdRow[];
  matrix: RcaEpdMatrixGroup[];
  chart: {
    type: "matrix";
    x_axis: AxisDefinition;
    y_axis: AxisDefinition;
    size_key: "avg_rca";
    points: RcaEpdPoint[];
  };
  filters: AnalysisFilters;
  source: string;
  sourceName?: string;
  origin?: { code: string | null; name: string | null; alpha2?: string | null };
  destination?: {
    code: string | null;
    name: string | null;
    alpha2?: string | null;
  };
  xModelOptions?: string[];
  recordCount?: number;
  highlight: Highlight[];
};

type AxisDefinition = {
  key: string;
  label: string;
  threshold: number;
};

export async function getRcaCmsaAnalysis(
  filters: AnalysisFilters = {},
): Promise<RcaCmsaAnalysis> {
  const response = await apiClient.get("/analysis/rca-cmsa", {
    params: filters,
  });

  return unwrapApiData<RcaCmsaAnalysis>(response);
}

export async function getRscaTbiAnalysis(
  filters: AnalysisFilters = {},
): Promise<RscaTbiAnalysis> {
  const response = await apiClient.get("/analysis/rsca-tbi", {
    params: filters,
  });

  return unwrapApiData<RscaTbiAnalysis>(response);
}

export async function getRscaTbiCalculation(
  filters: AnalysisFilters = {},
): Promise<RscaTbiTablePayload<RscaTbiCalculationRow>> {
  const response = await apiClient.get("/analysis/rsca-tbi/calculation", {
    params: filters,
  });

  return unwrapApiData<RscaTbiTablePayload<RscaTbiCalculationRow>>(response);
}

export async function getRscaTbiComparison(
  filters: AnalysisFilters = {},
): Promise<RscaTbiTablePayload<RscaTbiComparisonRow>> {
  const response = await apiClient.get("/analysis/rsca-tbi/comparison", {
    params: filters,
  });

  return unwrapApiData<RscaTbiTablePayload<RscaTbiComparisonRow>>(response);
}

export async function getRcaEpdAnalysis(
  filters: AnalysisFilters = {},
): Promise<RcaEpdAnalysis> {
  const response = await apiClient.get("/analysis/rca-epd", {
    params: filters,
  });

  return unwrapApiData<RcaEpdAnalysis>(response);
}

export async function getRcaEpdCalculation(
  filters: AnalysisFilters = {},
): Promise<RcaEpdTablePayload<RcaEpdCalculationRow>> {
  const response = await apiClient.get("/analysis/rca-epd/calculation", {
    params: filters,
  });

  return unwrapApiData<RcaEpdTablePayload<RcaEpdCalculationRow>>(response);
}

export async function getRcaEpdComparison(
  filters: AnalysisFilters = {},
): Promise<RcaEpdTablePayload<RcaEpdComparisonRow>> {
  const response = await apiClient.get("/analysis/rca-epd/comparison", {
    params: filters,
  });

  return unwrapApiData<RcaEpdTablePayload<RcaEpdComparisonRow>>(response);
}

export async function getRcaEpdXModelOptions(
  filters: AnalysisFilters = {},
): Promise<RcaEpdXModelOptions> {
  const response = await apiClient.get("/analysis/rca-epd/xmodel-options", {
    params: filters,
  });

  return unwrapApiData<RcaEpdXModelOptions>(response);
}
