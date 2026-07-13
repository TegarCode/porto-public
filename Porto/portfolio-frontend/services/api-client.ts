import axios from "axios";
import { appConfig } from "@/utils/config";

export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: {
    Accept: "application/json",
  },
  timeout: 15_000,
});

export function unwrapApiData<T>(response: { data: ApiResponse<T> }): T {
  return response.data.data;
}

export type ApiResponse<TData> = {
  status: "success" | "error";
  data: TData;
  meta: Record<string, unknown>;
  message: string;
};

export type ApiErrorPayload = ApiResponse<Record<string, never>>;
