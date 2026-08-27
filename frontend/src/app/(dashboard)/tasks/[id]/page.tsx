'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Clock, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, TierBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState, ErrorState } from '@/components/ui/feedback';
import { StageList } from '@/components/features/stage-list';
import { useJob, useJobStages, useCancelJob } from '@/lib/hooks/use-jobs';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Task / job status page — polls live until the job reaches a terminal state.
export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading, isError, error, refetch } = useJob(id);
  const active = job?.status === 'running' || job?.status === 'queued';
  // Stage detail carries the version, attempt count, and skip/failure reason that
  // the inline stages on the job do not.
  const { data: stages } = useJobStages(id, Boolean(active));
  const cancel = useCancelJob();

  if (isLoading) return <LoadingState label="Loading analysis status…" />;
  if (isError || !job) return <ErrorState error={error} retry={refetch} />;

  // A partial job is finished and has a report; it just did not run everything.
  const hasReport = job.status === 'completed' || job.status === 'partial';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Analysis Status"
        description={`Job ID: ${job.job_id}`}
        action={
          <div className="flex gap-3">
            {active && (
              <Button
                variant="destructive"
                loading={cancel.isPending}
                onClick={() => cancel.mutate(job.job_id)}
                className="animate-fade-in"
              >
                Abort Analysis
              </Button>
            )}
            {hasReport && (
              <Link href={`/reports/${job.job_id}`}>
                <Button className="animate-fade-in shadow-[0_0_15px_hsl(187_92%_57%_/_0.3)]">
                  <FileText className="h-4 w-4 mr-2" />
                  View Full Report
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <Card className="relative overflow-hidden border-border/80">
        {/* Animated background gradient based on status */}
        <div className={cn(
          "absolute inset-0 opacity-10 pointer-events-none transition-colors duration-1000",
          active ? "bg-gradient-to-br from-accent-cyan via-transparent to-transparent" :
          job.status === 'failed' ? "bg-gradient-to-br from-destructive via-transparent to-transparent" :
          "bg-gradient-to-br from-severity-low via-transparent to-transparent"
        )} />
        
        <CardContent className="flex flex-col gap-6 py-6 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Status</p>
                <StatusBadge status={job.status} className="text-sm px-3 py-1" />
              </div>
              
              <div className="h-10 w-[1px] bg-border/60" />
              
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Risk Level</p>
                <div className="flex items-center gap-3">
                  <TierBadge tier={job.risk_tier} className="text-sm px-3 py-1" />
                  {job.risk_score != null && (
                    <span className="text-xl font-bold tabular-nums text-foreground drop-shadow-md">
                      {job.risk_score.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-md border border-border/50">
              <Clock className="h-4 w-4" />
              {formatDate(job.created_at)}
            </div>
          </div>

          <div className="flex-1 w-full">
            <div className="mb-2 flex justify-between items-end">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pipeline Progress</span>
              <span className="text-sm font-bold font-mono-data text-foreground">{job.progress}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted/50 border border-border/50 shadow-inner relative">
              <div
                className={cn(
                  "h-full transition-all duration-1000 ease-out relative overflow-hidden",
                  active ? "bg-accent-cyan" : 
                  job.status === 'failed' ? "bg-destructive" : "bg-severity-low"
                )}
                style={{ width: `${job.progress}%` }}
              >
                {active && (
                  <div className="absolute inset-0 w-full animate-shimmer" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', backgroundSize: '200% 100%' }} />
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        <StageList stages={stages} fallback={job.stages} />
      </div>

      {job.error && (
        <div className="mt-4 p-4 rounded-lg border border-destructive/30 bg-destructive/10 animate-fade-in flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive-foreground">Pipeline Error</p>
            <p className="mt-1 text-sm text-destructive-foreground/90">{job.error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
