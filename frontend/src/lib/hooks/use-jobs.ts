"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobsApi, uploadsApi } from "@/lib/api/endpoints";
import type { Job } from "@/lib/api/types";

const TERMINAL: Job["status"][] = ["completed", "failed", "cancelled"];

export function useJobs(status?: string) {
  return useQuery({
    queryKey: ["jobs", status ?? "all"],
    queryFn: () => jobsApi.list({ status }),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: () => jobsApi.get(id),
    // Poll while the job is still running (docs/architecture/06-api-spec.md).
    refetchInterval: (query) => {
      const data = query.state.data as Job | undefined;
      return data && TERMINAL.includes(data.status) ? false : 3000;
    },
  });
}

export function useUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadsApi.upload(file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
}

export function useCancelJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => jobsApi.cancel(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["job", id] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
