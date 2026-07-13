import { apiClient, unwrapApiData } from "@/services/api-client";

export type SentimentDistribution = {
  positive: number;
  neutral: number;
  negative: number;
};

export type SentimentAspect = {
  aspect: string;
  positive: number;
  datasets?: number[];
  percentages?: number[];
};

export type SentimentHighlight = {
  label: string;
  count: number;
};

export type SentimentDataset = {
  name: string;
  rows: number;
  distribution: SentimentDistribution;
};

export type SentimentSpiderGroup = {
  label: string;
  aspects: string[];
};

export type SentimentAnalysis = {
  summary: string;
  insight: string;
  distribution: SentimentDistribution;
  highlight: SentimentHighlight[];
  aspects: SentimentAspect[];
  datasets?: SentimentDataset[];
  spider?: {
    groups: SentimentSpiderGroup[];
    metric: string;
  };
  meta: {
    source: string;
    mode: string;
    source_message?: string | null;
    note?: string;
  };
};

export type SentimentAnalyzeInput = {
  dataset?: File;
  dataset_1?: File;
  dataset_2?: File;
  aspect?: string;
};

export async function analyzeSentiment(
  input: SentimentAnalyzeInput,
): Promise<SentimentAnalysis> {
  const formData = new FormData();

  if (input.dataset) {
    formData.append("dataset", input.dataset);
  }

  if (input.dataset_1) {
    formData.append("dataset_1", input.dataset_1);
  }

  if (input.dataset_2) {
    formData.append("dataset_2", input.dataset_2);
  }

  if (input.aspect) {
    formData.append("aspect", input.aspect);
  }

  const response = await apiClient.post("/sentiment/analyze", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return unwrapApiData<SentimentAnalysis>(response);
}
