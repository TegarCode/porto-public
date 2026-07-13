import type { SentimentAnalysis } from "@/services/sentiment-service";

export const sentimentAspects = [
  "network",
  "body",
  "display",
  "platform",
  "performance",
  "memory",
  "camera",
  "sound",
  "communications",
  "features",
  "battery",
  "accessories",
];

export const sentimentPreview: SentimentAnalysis = {
  summary:
    "Analisis sentimen menemukan 42 sinyal sentimen, didominasi kelas positive. Aspek dengan sentimen positif paling kuat adalah camera.",
  insight:
    "Analisis sentimen menemukan 42 sinyal sentimen, didominasi kelas positive. Aspek dengan sentimen positif paling kuat adalah camera (14 sinyal positif), sehingga area ini dapat menjadi angle utama untuk benchmark produk.",
  distribution: {
    positive: 28,
    neutral: 6,
    negative: 8,
  },
  highlight: [
    { label: "positive", count: 28 },
    { label: "camera", count: 14 },
    { label: "performance", count: 9 },
  ],
  aspects: [
    { aspect: "network", positive: 3, datasets: [1, 2], percentages: [12, 18] },
    { aspect: "body", positive: 2, datasets: [1, 1], percentages: [8, 9] },
    { aspect: "display", positive: 5, datasets: [2, 3], percentages: [18, 24] },
    { aspect: "platform", positive: 2, datasets: [1, 1], percentages: [9, 11] },
    { aspect: "performance", positive: 9, datasets: [4, 5], percentages: [28, 31] },
    { aspect: "memory", positive: 4, datasets: [1, 3], percentages: [10, 20] },
    { aspect: "camera", positive: 14, datasets: [8, 6], percentages: [42, 36] },
    { aspect: "sound", positive: 2, datasets: [1, 1], percentages: [7, 8] },
    { aspect: "communications", positive: 3, datasets: [1, 2], percentages: [9, 14] },
    { aspect: "features", positive: 5, datasets: [2, 3], percentages: [17, 22] },
    { aspect: "battery", positive: 7, datasets: [5, 2], percentages: [30, 18] },
    { aspect: "accessories", positive: 1, datasets: [1, 0], percentages: [6, 0] },
  ],
  datasets: [
    {
      name: "Dataset 1",
      rows: 120,
      distribution: { positive: 16, neutral: 3, negative: 4 },
    },
    {
      name: "Dataset 2",
      rows: 110,
      distribution: { positive: 12, neutral: 3, negative: 4 },
    },
  ],
  spider: {
    metric: "positive_percentage",
    groups: [
      {
        label: "Network - Memory",
        aspects: [
          "network",
          "body",
          "display",
          "platform",
          "performance",
          "memory",
        ],
      },
      {
        label: "Camera - Accessories",
        aspects: [
          "camera",
          "sound",
          "communications",
          "features",
          "battery",
          "accessories",
        ],
      },
    ],
  },
  meta: {
    source: "Preview",
    mode: "preview",
  },
};
