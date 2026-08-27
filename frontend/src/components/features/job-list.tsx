'use client';

import Link from 'next/link';
import { ChevronRight, FileCode2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, TierBadge } from '@/components/ui/badge';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/feedback';
import { useJobs } from '@/lib/hooks/use-jobs';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Reusable list of analysis jobs, linking to their status page. Shared by the
// Tasks and Reports views (Reports filters to completed).
export function JobList({
  status,
  hrefBase = '/tasks',
  emptyTitle = 'No analyses yet',
  emptyDescription = 'Upload an APK to get started.',
}: {
  status?: string | string[];
  hrefBase?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { data, isLoading, isError, error, refetch } = useJobs(status);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} retry={refetch} />;

  const jobs = data?.items ?? [];
  if (jobs.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {jobs.map((job, i) => {
        const isRunning = job.status === 'running' || job.status === 'queued';
        return (
          <Link key={job.job_id} href={`${hrefBase}/${job.job_id}`} className="block group">
            <Card className={cn(
              "transition-all duration-300 hover:-translate-y-0.5 animate-fade-in relative overflow-hidden",
              isRunning ? "border-accent-cyan/30 shadow-[0_0_15px_hsl(187_92%_57%_/_0.1)]" : "hover:border-border/80"
            )} style={{ animationDelay: `${Math.min(i * 50, 500)}ms` }}>
              {isRunning && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-accent-cyan animate-progress-fill transition-all duration-500 ease-out" 
                    style={{ width: `${job.progress}%` }} 
                  />
                </div>
              )}
              <CardContent className="flex items-center justify-between gap-4 p-4 sm:p-5">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 border border-border/50 text-muted-foreground group-hover:bg-accent-cyan/10 group-hover:text-accent-cyan group-hover:border-accent-cyan/20 transition-colors">
                    <FileCode2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono-data text-sm font-medium text-foreground group-hover:text-accent-cyan transition-colors">{job.job_id}</p>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mt-1">
                      {formatDate(job.created_at)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="text-right">
                      {job.risk_score != null && (
                        <div className="text-sm font-bold tabular-nums text-foreground">
                          {job.risk_score.toFixed(1)}
                        </div>
                      )}
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Score</div>
                    </div>
                    <TierBadge tier={job.risk_tier} />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {isRunning && (
                      <span className="hidden sm:inline-block text-xs font-mono-data font-medium text-accent-cyan">
                        {job.progress}%
                      </span>
                    )}
                    <StatusBadge status={job.status} />
                  </div>
                  
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-foreground transition-colors group-hover:translate-x-0.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
