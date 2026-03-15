import { createClient } from "./supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers: HeadersInit = {
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${token}`,
  };
  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  } else {
    delete (headers as Record<string, string>)["Content-Type"];
  }
  return fetch(url, { ...options, headers });
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await authFetch(path);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(res.status === 401 ? "Unauthorized" : text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body?: unknown | FormData
): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await authFetch(path, {
    method: "POST",
    body: isForm ? body : (body ? JSON.stringify(body) : undefined),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function apiPut<T>(
  path: string,
  body: unknown
): Promise<T> {
  const res = await authFetch(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const res = await authFetch(path, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
}

export async function apiGetBlob(path: string): Promise<string> {
  const res = await authFetch(path);
  if (!res.ok) throw new Error("Failed to load image");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export { API_BASE };
