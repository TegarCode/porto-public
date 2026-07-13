"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAdventureWorksDashboard,
  type AdventureWorksDashboard,
} from "@/services/pentaho-service";
import { queryKeys } from "@/services/query-keys";

export function useAdventureWorksDashboard() {
  return useQuery<AdventureWorksDashboard>({
    queryKey: queryKeys.pentahoAdventureWorks,
    queryFn: getAdventureWorksDashboard,
  });
}
