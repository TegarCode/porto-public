"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getHealthStatus,
  type HealthStatus,
} from "@/services/health-service";
import { queryKeys } from "@/services/query-keys";

export function useHealthStatus() {
  return useQuery<HealthStatus>({
    queryKey: queryKeys.health,
    queryFn: getHealthStatus,
  });
}
