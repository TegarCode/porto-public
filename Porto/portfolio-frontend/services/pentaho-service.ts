import { apiClient, unwrapApiData } from "@/services/api-client";

export type PentahoSummary = {
  total_sales: number;
  total_freight: number;
  min_year: number;
  max_year: number;
  fact_rows: number;
  sales_reason_count: number;
  region_group_count: number;
  product_count: number;
};

export type PentahoRegionMetric = {
  region: string;
  subtotal?: number;
  freight?: number;
};

export type PentahoYearRegionMetric = {
  year: number;
  region: string;
  subtotal?: number;
  freight?: number;
};

export type PentahoCountryYearMetric = {
  country: string;
  year: number;
  transactions: number;
};

export type PentahoSalesReasonMetric = {
  reason: string;
  year: number;
  total_sales: number;
};

export type PentahoProductCategoryMetric = {
  category: string;
  subtotal: number;
  share: number;
};

export type PentahoProductCategoryMonthlyMetric = {
  category: string;
  month: number;
  subtotal: number;
  share: number;
};

export type PentahoTopProduct = {
  product_id: number;
  product_name: string;
  category: string;
  subtotal: number;
  freight: number;
  transactions: number;
};

export type AdventureWorksDashboard = {
  title: string;
  source: string;
  source_tables: string[];
  summary: PentahoSummary;
  insight: string;
  charts: {
    sales_by_region: PentahoRegionMetric[];
    freight_by_region: PentahoRegionMetric[];
    yearly_sales_by_region: PentahoYearRegionMetric[];
    yearly_freight_by_region: PentahoYearRegionMetric[];
    transactions_by_country_year: PentahoCountryYearMetric[];
    sales_reason_by_year: PentahoSalesReasonMetric[];
    product_category_share: PentahoProductCategoryMetric[];
    product_category_monthly_share: PentahoProductCategoryMonthlyMetric[];
  };
  tables: {
    top_products: PentahoTopProduct[];
    table_counts: Record<string, number>;
  };
};

export async function getAdventureWorksDashboard(): Promise<AdventureWorksDashboard> {
  const response = await apiClient.get("/pentaho/adventureworks");

  return unwrapApiData<AdventureWorksDashboard>(response);
}
