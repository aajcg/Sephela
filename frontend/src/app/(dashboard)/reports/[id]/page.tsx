'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Download, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/feedback';
import { RiskScoreGauge, ScoreDecomposition, SynergyRules } from '@/components/features/risk-score';
import { FindingsList } from '@/components/features/findings-list';
import { ApiError } from '@/lib/api/client';
import { useJob, useJobFindings } from '@/lib/hooks/use-jobs';
import { useReport, useDownloadReport } from '@/lib/hooks/use-report';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

// Preferred download order — most useful to a human first.
const FORMAT_LABELS: Record<string, string> = {
  pdf: 'PDF',
  html: 'HTML',
  markdown: 'Markdown',
  json: 'JSON',
  sarif: 'SARIF',
};
const FORMAT_ORDER = ['pdf', 'html', 'markdown', 'json', 'sarif'];

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading: jobLoading, isError: jobFailed, error: jobError } = useJob(id);
  const report = useReport(id);
  const findings = useJobFindings(id, { limit: 500 });
  const download = useDownloadReport(id);

  if (jobLoading) return <LoadingState label="Loading report…" />;
  if (jobFailed || !job) return <ErrorState error={jobError} />;

  const active = job.status === 'queued' || job.status === 'running';
  const notGenerated = report.error instanceof ApiError && report.error.status === 404;

  if (active) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Analysis Report" description={`Job ID: ${job.job_id}`} />
        <EmptyState
          title="Analysis still running"
          description={
            <div className="mt-2 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                This job is currently <StatusBadge status={job.status} />
              </div>
              <Link href={`/tasks/${job.job_id}`}>
                <Button variant="secondary">View Live Status</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  if (notGenerated) {
    return (
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Analysis Report" description={`Job ID: ${job.job_id}`} />
        <EmptyState
          title="No report was generated"
          description={
            <div className="mt-2 flex flex-col items-center gap-4">
              <p className="max-w-md text-sm text-muted-foreground text-center">
                The reporting stage produced nothing for this job. It may have been disabled, 
                or no stage produced evidence to report on.
              </p>
              <Link href={`/tasks/${job.job_id}`}>
                <Button variant="secondary">Check Stage Logs</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  if (report.isLoading) return <LoadingState label="Compiling report data…" />;
  if (report.isError) return <ErrorState error={report.error} retry={report.refetch} />;

  const data = report.data;
  const formats = FORMAT_ORDER.filter((f) => data?.formats[f]);
  const summary = (data?.report as { executive_summary?: Record<string, unknown> } | undefined)
    ?.executive_summary;
  const overview = typeof summary?.overview === 'string' ? summary.overview : null;
  const actions = Array.isArray(summary?.recommended_actions)
    ? (summary.recommended_actions as string[])
    : [];

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <FileText className="h-8 w-8 text-accent-cyan drop-shadow-[0_0_8px_hsl(187_92%_57%_/_0.5)]" />
            Intelligence Report
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-mono-data">
            Job ID: <span className="text-foreground">{job.job_id}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Report {data?.report_id} • Generated {formatDate(data?.generated_at)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {formats.map((format) => (
            <Button
              key={format}
              variant="secondary"
              size="sm"
              loading={download.isPending && download.variables === format}
              onClick={() => download.mutate(format)}
              className="hover:border-accent-cyan/50 hover:text-accent-cyan transition-colors"
            >
              <Download className="h-4 w-4 mr-2" aria-hidden />
              Download {FORMAT_LABELS[format] ?? format.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {download.isError && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive-foreground animate-fade-in">
          Download failed: {(download.error as Error).message}
        </div>
      )}

      {/* A partial job produced a report over incomplete analysis. Saying so up
          front matters more than the score itself. */}
      {job.status === 'partial' && (
        <div className="flex items-start gap-3 rounded-lg border border-accent-amber/40 bg-accent-amber/10 p-4 shadow-[0_0_15px_hsl(38_92%_50%_/_0.1)] animate-fade-in">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent-amber drop-shadow-[0_0_8px_hsl(38_92%_50%_/_0.5)]" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">Incomplete Analysis</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Some stages were skipped or failed, so this report covers less
              than a full run. See the{' '}
              <Link href={`/tasks/${job.job_id}`} className="text-accent-amber hover:underline font-medium">
                stage logs
              </Link>{' '}
              for details on what is missing.
            </p>
          </div>
        </div>
      )}

      {data?.warnings.length ? (
        <div className="rounded-lg border border-accent-amber/40 bg-accent-amber/10 p-4 shadow-[0_0_15px_hsl(38_92%_50%_/_0.1)] animate-fade-in">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-accent-amber" />
            Report generated with warnings
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground space-y-1">
            {data.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-3">
          {data?.score ? (
            <RiskScoreGauge score={data.score} />
          ) : (
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Not Scored</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No risk score was computed for this job, so this report carries findings without a
                  tier. An unscored sample is not a benign one.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {data?.score && (
          <div className="xl:col-span-2">
            <ScoreDecomposition score={data.score} />
          </div>
        )}

        {data?.score && (
          <div className="xl:col-span-1">
            <SynergyRules score={data.score} />
          </div>
        )}
      </div>

      {overview && (
        <Card className="animate-fade-in shadow-lg border-accent-cyan/20 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 w-1 h-full bg-accent-cyan" />
          
          <CardHeader className="relative z-10 pb-2">
            <CardTitle className="text-lg">Executive Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 relative z-10">
            <p className="text-[15px] leading-relaxed text-foreground/90">{overview}</p>
            
            {actions.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-5 border border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recommended Actions</p>
                <ul className="space-y-2.5">
                  {actions.map((a) => (
                    <li key={a} className="flex items-start gap-2.5 text-sm text-foreground/80">
                      <CheckCircle2 className="h-4 w-4 text-accent-cyan shrink-0 mt-0.5 drop-shadow-[0_0_5px_hsl(187_92%_57%_/_0.5)]" />
                      <span className="leading-snug">{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
        {findings.isLoading ? (
          <LoadingState label="Loading detailed findings…" />
        ) : findings.isError ? (
          <ErrorState error={findings.error} retry={findings.refetch} />
        ) : (
          <FindingsList findings={findings.data?.items ?? []} />
        )}
      </div>
    </div>
  );
}
