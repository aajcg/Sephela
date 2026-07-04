"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, ErrorState } from "@/components/ui/feedback";
import { useJob, useCancelJob } from "@/lib/hooks/use-jobs";
import { formatDate } from "@/lib/utils";

// Task / job status page — polls live until the job reaches a terminal state.
export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading, isError, error, refetch } = useJob(id);
  const cancel = useCancelJob();

  if (isLoading) return <LoadingState label="Loading job…" />;
  if (isError || !job) return <ErrorState error={error} retry={refetch} />;

  const active = job.status === "running" || job.status === "queued";
  const done = job.status === "completed";

  return (
    <div>
      <PageHeader
        title="Analysis status"
        description={job.job_id}
        action={
          <div className="flex gap-2">
            {active && (
              <Button
                variant="destructive"
                size="sm"
                loading={cancel.isPending}
                onClick={() => cancel.mutate(job.job_id)}
              >
                Cancel
              </Button>
            )}
            {done && (
              <Link href={`/reports/${job.job_id}`}>
                <Button size="sm">View report</Button>
              </Link>
            )}
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <StatusBadge status={job.status} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{job.progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>
          <div className="text-sm text-muted-foreground">Created {formatDate(job.created_at)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline stages</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {job.stages.length === 0 && (
            <p className="text-sm text-muted-foreground">Waiting for pipeline to start…</p>
          )}
          {job.stages.map((stage) => (
            <div
              key={stage.engine}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <span className="text-sm font-medium capitalize">{stage.engine.replace("_", " ")}</span>
              <StatusBadge status={stage.status} />
            </div>
          ))}
        </CardContent>
      </Card>

      {job.error && (
        <p className="mt-4 text-sm text-destructive">Error: {job.error}</p>
      )}
    </div>
  );
}
