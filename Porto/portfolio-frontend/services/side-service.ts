import { apiClient, unwrapApiData } from "@/services/api-client";

export type SideCountryOption = {
  code: string;
  alpha2: string | null;
  name: string | null;
};

export type SideCountryOptions = {
  countries: SideCountryOption[];
  origins: SideCountryOption[];
  destinations: SideCountryOption[];
  source: string;
};

export async function getSideCountryOptions(): Promise<SideCountryOptions> {
  const response = await apiClient.get("/side/countries");

  return unwrapApiData<SideCountryOptions>(response);
}
