import { apiClient, unwrapApiData } from "@/services/api-client";

export type HealthStatus = {
  service: string;
  environment: string;
  version: string;
  timestamp: string;
  dependencies: Record<
    "side" | "sentiment" | "scraping",
    {
      base_url: string;
      configured: boolean;
    }
  >;
};

export async function getHealthStatus(): Promise<HealthStatus> {
  const response = await apiClient.get("/health");

  return unwrapApiData<HealthStatus>(response);
}
