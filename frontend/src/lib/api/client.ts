// Typed fetch wrapper — the single choke point for all backend calls.
//
// Responsibilities: base URL, auth header injection, JSON handling, and
// normalizing RFC 9457 Problem Details into a throwable ApiError so React Query
// + error boundaries get consistent errors.

import { getToken, clearToken } from "@/lib/state/auth-store";
import type { ProblemDetails } from "./types";

const BASE = "/api/v1";

export class ApiError extends Error {
  status: number;
  problem?: ProblemDetails;
  traceId?: string | null;

  constructor(message: string, status: number, problem?: ProblemDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
    this.traceId = problem?.trace_id ?? null;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean; // attach bearer token (default true)
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, auth = true, headers, ...rest } = opts;

  const finalHeaders = new Headers(headers);
  const isFormData = body instanceof FormData;
  if (body !== undefined && !isFormData) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...rest,
      headers: finalHeaders,
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Network error — could not reach the server.", 0);
  }

  if (res.status === 401 && auth) {
    clearToken();
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("json");

  if (!res.ok) {
    const problem = isJson ? ((await res.json()) as ProblemDetails) : undefined;
    throw new ApiError(problem?.detail ?? problem?.title ?? res.statusText, res.status, problem);
  }

  if (res.status === 204) return undefined as T;
  return (isJson ? await res.json() : await res.text()) as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", body }),
  del: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};
