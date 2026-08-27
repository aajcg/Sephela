import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { JobStatus, StageStatus } from '@/lib/api/types';

// Risk tier → the severity token that reads as the same level of alarm. Kept
// separate from statusStyles: a tier is a judgement about the sample, a status is
// a fact about the pipeline, and colouring them from one table would let a
// "completed" job look reassuring next to a "critical" verdict.
const tierStyles: Record<string, string> = {
  benign: 'bg-severity-low/15 text-severity-low shadow-[0_0_8px_hsl(160_84%_39%_/_0.2)]',
  suspicious: 'bg-severity-medium/15 text-severity-medium shadow-[0_0_8px_hsl(38_92%_50%_/_0.2)]',
  malicious: 'bg-severity-high/15 text-severity-high shadow-[0_0_8px_hsl(25_95%_55%_/_0.2)]',
  critical: 'bg-severity-critical/15 text-severity-critical shadow-[0_0_8px_hsl(347_77%_50%_/_0.2)]',
};

const severityStyles: Record<string, string> = {
  info: 'bg-severity-info/15 text-severity-info shadow-[0_0_6px_hsl(210_90%_55%_/_0.15)]',
  low: 'bg-severity-low/15 text-severity-low shadow-[0_0_6px_hsl(160_84%_39%_/_0.15)]',
  medium: 'bg-severity-medium/15 text-severity-medium shadow-[0_0_6px_hsl(38_92%_50%_/_0.15)]',
  high: 'bg-severity-high/15 text-severity-high shadow-[0_0_6px_hsl(25_95%_55%_/_0.15)]',
  critical: 'bg-severity-critical/15 text-severity-critical shadow-[0_0_6px_hsl(347_77%_50%_/_0.15)]',
};

const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize transition-all duration-200';

const statusStyles: Record<string, string> = {
  queued: 'bg-muted text-muted-foreground',
  pending: 'bg-muted text-muted-foreground',
  running: 'bg-severity-info/15 text-severity-info shadow-[0_0_8px_hsl(210_90%_55%_/_0.2)]',
  ok: 'bg-severity-low/15 text-severity-low shadow-[0_0_6px_hsl(160_84%_39%_/_0.15)]',
  completed: 'bg-severity-low/15 text-severity-low shadow-[0_0_6px_hsl(160_84%_39%_/_0.15)]',
  partial: 'bg-severity-medium/15 text-severity-medium shadow-[0_0_6px_hsl(38_92%_50%_/_0.15)]',
  skipped: 'bg-muted text-muted-foreground',
  failed: 'bg-severity-critical/15 text-severity-critical shadow-[0_0_8px_hsl(347_77%_50%_/_0.2)]',
  cancelled: 'bg-muted text-muted-foreground',
};

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: JobStatus | StageStatus | string;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const isRunning = status === 'running';
  return (
    <span
      className={cn(base, statusStyles[status] ?? 'bg-muted text-muted-foreground', className)}
      {...props}
    >
      {isRunning && (
        <span className="mr-1.5 relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-severity-info opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-severity-info" />
        </span>
      )}
      {status}
    </span>
  );
}

/**
 * A risk tier, or "not scored" when scoring did not run.
 *
 * An unscored job must never render as benign — that is a false reassurance, not
 * a cosmetic difference.
 */
export function TierBadge({
  tier,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tier?: string | null }) {
  if (!tier) {
    return (
      <span className={cn(base, 'bg-muted text-muted-foreground', className)} {...props}>
        not scored
      </span>
    );
  }
  return (
    <span
      className={cn(base, tierStyles[tier] ?? 'bg-muted text-muted-foreground', className)}
      {...props}
    >
      {tier}
    </span>
  );
}

export function SeverityBadge({
  severity,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { severity: string }) {
  return (
    <span
      className={cn(base, severityStyles[severity] ?? 'bg-muted text-muted-foreground', className)}
      {...props}
    >
      {severity}
    </span>
  );
}
