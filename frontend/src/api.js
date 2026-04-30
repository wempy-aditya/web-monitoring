const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const AUTH_KEY = "wm_basic_auth";

export function getAuthHeader() {
  const token = sessionStorage.getItem(AUTH_KEY);
  if (!token) {
    return null;
  }

  return `Basic ${token}`;
}

export function setAuth(username, password) {
  const token = btoa(`${username}:${password}`);
  sessionStorage.setItem(AUTH_KEY, token);
}

export function clearAuth() {
  sessionStorage.removeItem(AUTH_KEY);
}

async function parseError(response) {
  try {
    const data = await response.json();
    return data?.error ?? data?.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
}

export async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers ?? {})
  };

  const authHeader = getAuthHeader();
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(await parseError(response));
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}
