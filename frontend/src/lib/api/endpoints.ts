// Endpoint functions grouped by domain. Components use the hooks in
// lib/hooks; these are the thin typed wrappers over the API client.

import { api } from "./client";
import type { Job, Paginated, Token, UserOut } from "./types";

export const authApi = {
  login: (email: string, password: string) =>
    api.post<Token>("/auth/login", { email, password }, { auth: false }),
  me: () => api.get<UserOut>("/auth/me"),
};

export const jobsApi = {
  list: (params?: { status?: string; cursor?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.cursor) q.set("cursor", params.cursor);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return api.get<Paginated<Job>>(`/jobs${qs ? `?${qs}` : ""}`);
  },
  get: (id: string) => api.get<Job>(`/jobs/${id}`),
  cancel: (id: string) => api.post<Job>(`/jobs/${id}/cancel`),
};

export const uploadsApi = {
  upload: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<{ job_id: string; sample_id: string; status: string; duplicate: boolean }>(
      "/uploads",
      fd,
    );
  },
};
