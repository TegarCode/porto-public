export type SideMethodKey = "rca-cmsa" | "rsca-tbi" | "rca-epd";

export type SideMethod = {
  key: SideMethodKey;
  title: string;
  problem: string;
  data: string;
  insight: string;
  chartType: string;
  status: "ready" | "planned";
};

export type SideFilterState = {
  origin: string;
  dest: string;
  level: number;
};
