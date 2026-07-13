export const queryKeys = {
  health: ["health"] as const,
  pentahoAdventureWorks: ["pentaho", "adventureworks"] as const,
  sideCountries: ["side", "countries"] as const,
  rcaCmsa: (filters: AnalysisFilters) => ["analysis", "rca-cmsa", filters] as const,
  rscaTbi: (filters: AnalysisFilters) => ["analysis", "rsca-tbi", filters] as const,
  rscaTbiCalculation: (filters: AnalysisFilters) =>
    ["analysis", "rsca-tbi", "calculation", filters] as const,
  rscaTbiComparison: (filters: AnalysisFilters) =>
    ["analysis", "rsca-tbi", "comparison", filters] as const,
  rcaEpd: (filters: AnalysisFilters) => ["analysis", "rca-epd", filters] as const,
  rcaEpdCalculation: (filters: AnalysisFilters) =>
    ["analysis", "rca-epd", "calculation", filters] as const,
  rcaEpdComparison: (filters: AnalysisFilters) =>
    ["analysis", "rca-epd", "comparison", filters] as const,
  rcaEpdXModelOptions: (filters: AnalysisFilters) =>
    ["analysis", "rca-epd", "xmodel-options", filters] as const,
};

export type AnalysisFilters = {
  origin?: string;
  dest?: string;
  level?: number;
  x_model?: string;
  limit?: number | "ALL";
};
