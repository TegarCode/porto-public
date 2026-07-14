const PRODUCTION_API_BASE_URL = "https://porto-backend-pearl.vercel.app/api/v1";
const LOCAL_API_BASE_URL = "http://127.0.0.1:8000/api/v1";

function resolveApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_API_BASE_URL;
  }

  return LOCAL_API_BASE_URL;
}

export const appConfig = {
  apiBaseUrl: resolveApiBaseUrl(),
};
