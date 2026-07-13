function resolveApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  if (typeof window !== "undefined") {
    return "http://127.0.0.1:8000/api/v1";
  }

  return "http://127.0.0.1:8000/api/v1";
}

export const appConfig = {
  apiBaseUrl: resolveApiBaseUrl(),
};
