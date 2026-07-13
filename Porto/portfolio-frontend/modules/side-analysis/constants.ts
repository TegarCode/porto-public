import type { SideMethod } from "@/modules/side-analysis/types";

export const sideMethods: SideMethod[] = [
  {
    key: "rca-cmsa",
    title: "RCA - CMSA",
    problem:
      "Keunggulan komparatif perlu dibandingkan dengan perubahan pangsa pasar agar produk potensial tidak hanya dilihat dari satu angka.",
    data: "RCA asal, CMSA asal, RCA tujuan, CMSA tujuan",
    insight:
      "Metode ini disiapkan untuk membaca produk yang kuat secara daya saing sekaligus relevan terhadap dinamika pasar.",
    chartType: "Bar / Line",
    status: "planned",
  },
  {
    key: "rsca-tbi",
    title: "RSCA - TBI",
    problem:
      "Produk yang kompetitif belum tentu menjadi net exporter, sehingga posisi pasar perlu dibaca lewat kuadran.",
    data: "RSCA sebagai sumbu daya saing, TBI sebagai sumbu neraca perdagangan",
    insight:
      "Kuadran membantu memisahkan competitive exporter, import-oriented opportunity, fragile exporter, dan weak position.",
    chartType: "Scatter Quadrant",
    status: "ready",
  },
  {
    key: "rca-epd",
    title: "RCA - EPD",
    problem:
      "Produk perlu dipetakan dari pertumbuhan permintaan dan pangsa ekspor untuk membaca strategi pasar.",
    data: "AVG growth share, AVG growth demand, AVG RCA, kategori EPD",
    insight:
      "Matrix EPD memperlihatkan produk rising star, lost opportunity, falling star, dan retreat untuk prioritas strategi.",
    chartType: "Matrix Scatter",
    status: "ready",
  },
];

export const sideDefaultFilters = {
  origin: "IDN",
  dest: "CHN",
  level: 6,
};

export const quadrantPreview = [
  { name: "Coffee", x: 0.62, y: 0.38 },
  { name: "Cocoa", x: 0.22, y: -0.32 },
  { name: "Rice", x: -0.18, y: -0.48 },
  { name: "Spices", x: -0.12, y: 0.27 },
];

export const rcaCmsaPreview = [
  {
    product: "Coffee",
    rcaOrigin: 1.42,
    cmsaOrigin: 0.32,
    rcaDestination: 0.91,
    cmsaDestination: 0.14,
  },
  {
    product: "Cocoa",
    rcaOrigin: 1.18,
    cmsaOrigin: 0.21,
    rcaDestination: 0.76,
    cmsaDestination: -0.06,
  },
  {
    product: "Spices",
    rcaOrigin: 0.96,
    cmsaOrigin: -0.08,
    rcaDestination: 1.08,
    cmsaDestination: 0.25,
  },
  {
    product: "Palm Oil",
    rcaOrigin: 1.67,
    cmsaOrigin: 0.18,
    rcaDestination: 1.21,
    cmsaDestination: 0.31,
  },
];

export const rcaCmsaAnalysisPreview = {
  title: "RCA CMSA Analysis",
  insight:
    "Preview RCA-CMSA menunjukkan Palm Oil sebagai sinyal terkuat karena RCA asal dan tujuan sama-sama tinggi, dengan CMSA tujuan positif sebagai indikasi momentum pasar.",
  data: rcaCmsaPreview.map((item) => ({
    label: item.product,
    rca_origin: item.rcaOrigin,
    cmsa_origin: item.cmsaOrigin,
    rca_destination: item.rcaDestination,
    cmsa_destination: item.cmsaDestination,
    strength_score:
      item.rcaOrigin + item.cmsaOrigin + item.rcaDestination + item.cmsaDestination,
    record: {},
  })),
  buckets: {
    export: [
      {
        rank: 1,
        hs4: "1511",
        kode: "1511",
        nama: "Palm Oil",
        strategi: "EXPORT",
        nilai: 24823,
      },
      {
        rank: 2,
        hs4: "0901",
        kode: "0901",
        nama: "Coffee",
        strategi: "EXPORT",
        nilai: 12040,
      },
    ],
    import: [
      {
        rank: 1,
        hs4: "1801",
        kode: "1801",
        nama: "Cocoa",
        strategi: "IMPORT",
        nilai: 6410,
      },
    ],
    fdiInbound: [],
    fdiOutbound: [],
  },
  totals: {
    allCount: 3,
    exportCount: 2,
    importCount: 1,
    fdiInboundCount: 0,
    fdiOutboundCount: 0,
    exportSum: 36863,
    importSum: 6410,
    fdiInboundSum: 0,
    fdiOutboundSum: 0,
  },
  origin: { code: "IDN", name: "Indonesia" },
  destination: { code: "CHN", name: "Tiongkok" },
  highlight: [
    {
      label: "Palm Oil",
      count: 1,
      description: "RCA origin 1.67, CMSA destination 0.31.",
    },
    {
      label: "Coffee",
      count: 1,
      description: "RCA origin 1.42, CMSA destination 0.14.",
    },
  ],
  chart: {
    type: "bar_line" as const,
    label_key: "label" as const,
    bar_keys: ["rca_origin", "rca_destination"] as Array<
      "rca_origin" | "rca_destination"
    >,
    line_keys: ["cmsa_origin", "cmsa_destination"] as Array<
      "cmsa_origin" | "cmsa_destination"
    >,
    data: rcaCmsaPreview.map((item) => ({
      label: item.product,
      rca_origin: item.rcaOrigin,
      cmsa_origin: item.cmsaOrigin,
      rca_destination: item.rcaDestination,
      cmsa_destination: item.cmsaDestination,
      strength_score:
        item.rcaOrigin + item.cmsaOrigin + item.rcaDestination + item.cmsaDestination,
      record: {},
    })),
  },
  filters: sideDefaultFilters,
  source: "Preview",
};

export const rcaEpdPreview = {
  title: "RCA EPD Analysis",
  insight:
    "Pemetaan RCA-EPD menunjukkan contoh produk terkonsentrasi pada Rising Star, dengan Palm Oil sebagai produk RCA terkuat pada preview.",
  matrix: [
    {
      key: "rising_star",
      label: "Rising Star",
      count: 2,
      avg_rca: 2.955,
      items: [
        {
          label: "Coffee",
          growth_share: 0.42,
          growth_demand: 0.33,
          avg_rca: 2.14,
          x_model: "Market Expansion",
        },
        {
          label: "Palm Oil",
          growth_share: 0.51,
          growth_demand: 0.18,
          avg_rca: 3.77,
          x_model: "Market Expansion",
        },
      ],
    },
    {
      key: "lost_opportunity",
      label: "Lost Opportunity",
      count: 1,
      avg_rca: 1.35,
      items: [
        {
          label: "Cocoa",
          growth_share: -0.12,
          growth_demand: 0.29,
          avg_rca: 1.35,
          x_model: "Market Recovery",
        },
      ],
    },
  ],
  chart: {
    type: "matrix" as const,
    x_axis: {
      key: "growth_share",
      label: "Export Share Growth",
      threshold: 0,
    },
    y_axis: {
      key: "growth_demand",
      label: "Demand Growth",
      threshold: 0,
    },
    size_key: "avg_rca" as const,
    points: [
      {
        label: "Coffee",
        x: 0.42,
        y: 0.33,
        growth_share: 0.42,
        growth_demand: 0.33,
        avg_rca: 2.14,
        position: "rising_star",
        position_label: "Rising Star",
        x_model: "Market Expansion",
        record: {},
      },
      {
        label: "Cocoa",
        x: -0.12,
        y: 0.29,
        growth_share: -0.12,
        growth_demand: 0.29,
        avg_rca: 1.35,
        position: "lost_opportunity",
        position_label: "Lost Opportunity",
        x_model: "Market Recovery",
        record: {},
      },
      {
        label: "Palm Oil",
        x: 0.51,
        y: 0.18,
        growth_share: 0.51,
        growth_demand: 0.18,
        avg_rca: 3.77,
        position: "rising_star",
        position_label: "Rising Star",
        x_model: "Market Expansion",
        record: {},
      },
    ],
  },
  filters: sideDefaultFilters,
  source: "Preview",
  highlight: [
    {
      label: "Rising Star",
      count: 2,
      avg_rca: 2.955,
    },
    {
      label: "Lost Opportunity",
      count: 1,
      avg_rca: 1.35,
    },
  ],
};
