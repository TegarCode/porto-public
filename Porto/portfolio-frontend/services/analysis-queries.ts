"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getRcaCmsaAnalysis,
  getRcaEpdAnalysis,
  getRcaEpdCalculation,
  getRcaEpdComparison,
  getRcaEpdXModelOptions,
  getRscaTbiAnalysis,
  getRscaTbiCalculation,
  getRscaTbiComparison,
  type RcaCmsaAnalysis,
  type RcaEpdAnalysis,
  type RcaEpdCalculationRow,
  type RcaEpdComparisonRow,
  type RcaEpdTablePayload,
  type RcaEpdXModelOptions,
  type RscaTbiAnalysis,
  type RscaTbiCalculationRow,
  type RscaTbiComparisonRow,
  type RscaTbiTablePayload,
} from "@/services/analysis-service";
import { queryKeys, type AnalysisFilters } from "@/services/query-keys";

export function useRcaCmsaAnalysis(filters: AnalysisFilters = {}) {
  return useQuery<RcaCmsaAnalysis>({
    queryKey: queryKeys.rcaCmsa(filters),
    queryFn: () => getRcaCmsaAnalysis(filters),
  });
}

export function useRscaTbiAnalysis(filters: AnalysisFilters = {}) {
  return useQuery<RscaTbiAnalysis>({
    queryKey: queryKeys.rscaTbi(filters),
    queryFn: () => getRscaTbiAnalysis(filters),
  });
}

export function useRscaTbiCalculation(filters: AnalysisFilters = {}) {
  return useQuery<RscaTbiTablePayload<RscaTbiCalculationRow>>({
    queryKey: queryKeys.rscaTbiCalculation(filters),
    queryFn: () => getRscaTbiCalculation(filters),
  });
}

export function useRscaTbiComparison(filters: AnalysisFilters = {}) {
  return useQuery<RscaTbiTablePayload<RscaTbiComparisonRow>>({
    queryKey: queryKeys.rscaTbiComparison(filters),
    queryFn: () => getRscaTbiComparison(filters),
  });
}

export function useRcaEpdAnalysis(filters: AnalysisFilters = {}) {
  return useQuery<RcaEpdAnalysis>({
    queryKey: queryKeys.rcaEpd(filters),
    queryFn: () => getRcaEpdAnalysis(filters),
  });
}

export function useRcaEpdCalculation(filters: AnalysisFilters = {}) {
  return useQuery<RcaEpdTablePayload<RcaEpdCalculationRow>>({
    queryKey: queryKeys.rcaEpdCalculation(filters),
    queryFn: () => getRcaEpdCalculation(filters),
  });
}

export function useRcaEpdComparison(filters: AnalysisFilters = {}) {
  return useQuery<RcaEpdTablePayload<RcaEpdComparisonRow>>({
    queryKey: queryKeys.rcaEpdComparison(filters),
    queryFn: () => getRcaEpdComparison(filters),
  });
}

export function useRcaEpdXModelOptions(filters: AnalysisFilters = {}) {
  return useQuery<RcaEpdXModelOptions>({
    queryKey: queryKeys.rcaEpdXModelOptions(filters),
    queryFn: () => getRcaEpdXModelOptions(filters),
  });
}
