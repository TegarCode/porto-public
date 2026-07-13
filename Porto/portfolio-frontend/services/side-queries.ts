"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/services/query-keys";
import {
  getSideCountryOptions,
  type SideCountryOptions,
} from "@/services/side-service";

export function useSideCountryOptions() {
  return useQuery<SideCountryOptions>({
    queryKey: queryKeys.sideCountries,
    queryFn: getSideCountryOptions,
    staleTime: 10 * 60 * 1000,
  });
}
