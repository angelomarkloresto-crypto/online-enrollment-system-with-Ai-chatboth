const PRODUCTION_API_BASE_URL = "https://online-enrollment-backend.onrender.com";
const CONFIGURED_API_BASE_URL = (() => {
  const value = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : "";
  } catch {
    return "";
  }
})();
const API_BASE_URL =
  CONFIGURED_API_BASE_URL ||
  (import.meta.env.PROD ? PRODUCTION_API_BASE_URL : "");

export function apiUrl(path) {
  const normalizedPath = String(path).replace(/^\/+/, "");
  const route = API_BASE_URL
    ? normalizedPath.replace(/^backend-online-enrollment\/?/, "")
    : normalizedPath;
  const base = API_BASE_URL.replace(/\/+$/, "");

  return base ? `${base}/${route}` : `/${route}`;
}
