'use client';

import { CheckCircle2, Circle, Loader2, PlayCircle, XCircle, SkipForward } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import type { StageDetail, StageInfo } from '@/lib/api/types';
import { formatDate, cn } from '@/lib/utils';

// The pipeline's dependency order (app/tasks/pipeline.py). Stages are displayed
// in this order rather than by creation time so a stage that has not started yet
// still appears in the position it will run in.
const STAGE_ORDER = [
  'static',
  'code_intel',
  'dynamic',
  'threat_intel',
  'ai_orchestrator',
  'scoring',
  'reporting',
] as const;

const STAGE_LABELS: Record<string, string> = {
  static: 'Static Analysis',
  code_intel: 'Code Intelligence',
  dynamic: 'Dynamic Analysis',
  threat_intel: 'Threat Intelligence',
  ai_orchestrator: 'Multi-Agent Reasoning',
  scoring: 'Risk Scoring',
  reporting: 'Report Generation',
};

function label(engine: string): string {
  return STAGE_LABELS[engine] ?? engine.replace(/_/g, ' ');
}

function order(engine: string): number {
  const index = STAGE_ORDER.indexOf(engine as (typeof STAGE_ORDER)[number]);
  return index === -1 ? STAGE_ORDER.length : index;
}

function duration(stage: StageInfo): string | null {
  if (!stage.started_at || !stage.finished_at) return null;
  const ms = new Date(stage.finished_at).getTime() - new Date(stage.started_at).getTime();
  if (ms < 0) return null;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function StatusIcon({ status, className }: { status: string; className?: string }) {
  if (status === 'completed' || status === 'ok') {
    return <CheckCircle2 className={cn("text-severity-low drop-shadow-[0_0_8px_hsl(160_84%_39%_/_0.6)]", className)} />;
  }
  if (status === 'running') {
    return <Loader2 className={cn("text-accent-cyan animate-spin drop-shadow-[0_0_8px_hsl(187_92%_57%_/_0.6)]", className)} />;
  }
  if (status === 'failed') {
    return <XCircle className={cn("text-severity-critical drop-shadow-[0_0_8px_hsl(347_77%_50%_/_0.6)]", className)} />;
  }
  if (status === 'partial') {
    return <PlayCircle className={cn("text-severity-medium drop-shadow-[0_0_8px_hsl(38_92%_50%_/_0.6)]", className)} />;
  }
  if (status === 'skipped') {
    return <SkipForward className={cn("text-muted-foreground", className)} />;
  }
  return <Circle className={cn("text-muted-foreground/50", className)} />;
}

/**
 * Per-stage progress with the reason each stage produced what it did.
 *
 * The reason is the reason this component exists. A skipped stage rendered as a
 * grey badge and nothing else reads as "fine" — but "dynamic analysis is
 * disabled" and "the sandbox crashed" mean very different things for how much the
 * verdict can be trusted, and only the recorded message distinguishes them.
 */
export function StageList({ stages, fallback }: { stages?: StageDetail[]; fallback: StageInfo[] }) {
  // Fall back to the inline stages on the job while the detail query is in
  // flight, so the list never blinks empty on a poll.
  const rows: (StageDetail | StageInfo)[] = stages?.length ? stages : fallback;
  const sorted = [...rows].sort((a, b) => order(a.engine) - order(b.engine));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Stages</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground pb-4">Waiting for the pipeline to start…</p>
        )}
        
        <div className="relative border-l border-border/60 ml-3 md:ml-4 space-y-6 pb-2">
          {sorted.map((stage, index) => {
            const detail = stage as StageDetail;
            const elapsed = duration(stage);
            const isLast = index === sorted.length - 1;
            const isRunning = stage.status === 'running';
            
            return (
              <div 
                key={stage.engine} 
                className="relative pl-6 md:pl-8 animate-fade-in group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Connecting line glow for active stage */}
                {isRunning && !isLast && (
                  <div className="absolute left-[-1px] top-6 bottom-[-24px] w-[2px] bg-gradient-to-b from-accent-cyan to-transparent animate-pulse" />
                )}
                
                {/* Node icon */}
                <div className="absolute left-[-12px] top-0.5 bg-card rounded-full p-0.5">
                  <StatusIcon status={stage.status} className="h-5 w-5" />
                </div>

                <div className={cn(
                  "rounded-lg border bg-muted/10 px-4 py-3 transition-colors",
                  isRunning ? "border-accent-cyan/30 shadow-[0_0_15px_hsl(187_92%_57%_/_0.1)] bg-accent-cyan/5" : "border-border/60 hover:bg-muted/20"
                )}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className={cn(
                      "text-sm font-semibold tracking-tight",
                      isRunning ? "text-accent-cyan" : "text-foreground"
                    )}>
                      {label(stage.engine)}
                    </span>
                    <div className="flex items-center gap-3">
                      {elapsed && (
                        <span className="text-xs font-mono-data text-muted-foreground">{elapsed}</span>
                      )}
                      {detail.attempt > 1 && (
                        <span className="text-xs text-muted-foreground/70 bg-muted px-2 py-0.5 rounded">attempt {detail.attempt}</span>
                      )}
                      <StatusBadge status={stage.status} />
                    </div>
                  </div>

                  {detail.error && (
                    <p
                      className={cn(
                        "mt-2 text-sm leading-relaxed p-2.5 rounded-md border",
                        stage.status === 'failed'
                          ? "bg-destructive/10 border-destructive/20 text-destructive-foreground"
                          : "bg-muted/30 border-border/50 text-muted-foreground"
                      )}
                    >
                      {detail.error}
                    </p>
                  )}

                  {detail.engine_version && (
                    <p className="mt-2.5 text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wider flex items-center gap-2">
                      <span className="bg-background border border-border/50 px-1.5 py-0.5 rounded font-mono-data normal-case">
                        v{detail.engine_version}
                      </span>
                      {stage.started_at && <span>• Started {formatDate(stage.started_at)}</span>}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
