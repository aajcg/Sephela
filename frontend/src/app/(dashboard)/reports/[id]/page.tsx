"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/feedback";
import { useJob } from "@/lib/hooks/use-jobs";

// Report page — framework shell only. Malware findings / risk visualization is
// added in later phases (Phase 8 scoring, Phase 9 reporting). For now it shows
// the report availability and download entrypoints.
export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading, isError, error, refetch } = useJob(id);

  if (isLoading) return <LoadingState label="Loading report…" />;
  if (isError || !job) return <ErrorState error={error} retry={refetch} />;

  if (job.status !== "completed") {
    return (
      <div>
        <PageHeader title="Report" description={job.job_id} />
        <EmptyState
          title="Report not ready"
          description={
            <>
              This analysis is <StatusBadge status={job.status} />. Track progress on the{" "}
              <Link href={`/tasks/${job.job_id}`} className="text-primary underline">
                status page
              </Link>
              .
            </>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Report"
        description={job.job_id}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled>
              Download PDF
            </Button>
            <Button variant="secondary" size="sm" disabled>
              Download JSON
            </Button>
          </div>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Report rendering (risk score, findings, IoCs, MITRE mapping) is delivered in later
            phases. The framework, data plumbing, and download entrypoints are wired here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
