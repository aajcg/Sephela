'use client';

import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import type { Finding } from '@/lib/api/types';
import { cn } from '@/lib/utils';

// Worst first. Findings arrive in insertion order, which is engine order — not
// an order any analyst wants to read.
const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const SEVERITY_FILTERS = ['critical', 'high', 'medium', 'low', 'info'] as const;

function rank(finding: Finding): number {
  return SEVERITY_RANK[String(finding.severity)] ?? 99;
}

function confidenceLabel(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'unstated';
  if (value >= 0.95) return 'very high';
  if (value >= 0.75) return 'high';
  if (value >= 0.45) return 'medium';
  return 'low';
}

/**
 * Findings ranked by severity, each expandable to the evidence behind it.
 *
 * The expansion is the product. A finding without its provenance is an assertion;
 * with it, an analyst can check the claim and a regulator can be shown why the
 * platform said what it said.
 */
export function FindingsList({ findings }: { findings: Finding[] }) {
  const [severity, setSeverity] = useState<string | null>(null);

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const f of findings) {
      const key = String(f.severity);
      out[key] = (out[key] ?? 0) + 1;
    }
    return out;
  }, [findings]);

  const visible = useMemo(() => {
    const filtered = severity
      ? findings.filter((f) => String(f.severity) === severity)
      : [...findings];
    return filtered.sort((a, b) => rank(a) - rank(b) || a.finding_id.localeCompare(b.finding_id));
  }, [findings, severity]);

  if (findings.length === 0) {
    return (
      <EmptyState
        title="No findings"
        description="No analysis stage recorded a finding for this sample. That is not the same as a clean verdict — check the pipeline stages for anything that was skipped or failed."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Findings <span className="bg-muted px-2 py-0.5 rounded-full text-xs font-mono-data font-medium text-muted-foreground">{findings.length}</span>
        </CardTitle>
        <div className="mt-3 flex flex-wrap gap-2">
          <FilterChip active={severity === null} onClick={() => setSeverity(null)}>
            All <span className="opacity-70 ml-1">{findings.length}</span>
          </FilterChip>
          {SEVERITY_FILTERS.filter((s) => counts[s]).map((s) => (
            <FilterChip key={s} active={severity === s} onClick={() => setSeverity(s)} severity={s}>
              {s} <span className="opacity-70 ml-1">{counts[s]}</span>
            </FilterChip>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5">
        {visible.map((finding, index) => (
          <FindingRow key={`${finding.source_engine}:${finding.finding_id}`} finding={finding} index={index} />
        ))}
      </CardContent>
    </Card>
  );
}

function FilterChip({
  active,
  onClick,
  severity,
  children,
}: {
  active: boolean;
  onClick: () => void;
  severity?: string;
  children: React.ReactNode;
}) {
  const getGlow = () => {
    if (!active) return '';
    if (severity === 'critical') return 'bg-severity-critical/20 text-severity-critical border-severity-critical/50 shadow-[0_0_10px_hsl(347_77%_50%_/_0.3)]';
    if (severity === 'high') return 'bg-severity-high/20 text-severity-high border-severity-high/50 shadow-[0_0_10px_hsl(25_95%_55%_/_0.3)]';
    if (severity === 'medium') return 'bg-severity-medium/20 text-severity-medium border-severity-medium/50 shadow-[0_0_10px_hsl(38_92%_50%_/_0.3)]';
    if (severity === 'low') return 'bg-severity-low/20 text-severity-low border-severity-low/50 shadow-[0_0_10px_hsl(160_84%_39%_/_0.3)]';
    if (severity === 'info') return 'bg-severity-info/20 text-severity-info border-severity-info/50 shadow-[0_0_10px_hsl(210_90%_55%_/_0.3)]';
    return 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/50 shadow-[0_0_10px_hsl(187_92%_57%_/_0.3)]';
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-all duration-300',
        active 
          ? getGlow() 
          : 'border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground hover:border-border/80',
      )}
    >
      {children}
    </button>
  );
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'bg-severity-critical',
  high: 'bg-severity-high',
  medium: 'bg-severity-medium',
  low: 'bg-severity-low',
  info: 'bg-severity-info',
};

function FindingRow({ finding, index }: { finding: Finding, index: number }) {
  const [open, setOpen] = useState(false);
  const provenance = finding.provenance ?? {};
  const hasProvenance = Object.keys(provenance).length > 0;

  return (
    <div 
      className={cn(
        "rounded-lg border bg-card transition-all duration-300 overflow-hidden animate-slide-up hover:border-border/80 hover:shadow-md",
        open ? "border-border/80 shadow-md" : "border-border/40"
      )}
      style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-3.5 text-left transition-colors hover:bg-muted/30 relative group"
      >
        {/* Left severity indicator bar */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-1 opacity-70 group-hover:opacity-100 transition-opacity", SEVERITY_COLOR[String(finding.severity)] ?? 'bg-muted')} />
        
        <ChevronRight
          className={cn(
            'mt-0.5 ml-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out',
            open && 'rotate-90 text-foreground',
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <SeverityBadge severity={String(finding.severity)} />
            <span className="font-semibold text-foreground capitalize tracking-tight text-[15px]">{finding.type.replace(/_/g, ' ')}</span>
          </div>
          {finding.detail && (
            <p className={cn('mt-1.5 text-sm text-muted-foreground/90 leading-relaxed', !open && 'line-clamp-1')}>
              {finding.detail}
            </p>
          )}
        </div>
        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 mt-1 mr-2">{finding.source_engine}</span>
      </button>

      {open && (
        <div className="border-t border-border/50 bg-muted/10 px-4 py-4 text-sm animate-fade-in">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-4 mb-5">
            <div>
              <dt className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Finding ID</dt>
              <dd className="mt-1 font-mono-data text-xs bg-background border border-border/50 px-2 py-1 rounded inline-block">{finding.finding_id}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">Confidence</dt>
              <dd className="mt-1 capitalize text-sm font-medium">
                {confidenceLabel(finding.confidence)}
                {finding.confidence != null && (
                  <span className="ml-1.5 font-mono-data text-xs text-muted-foreground">
                    ({(finding.confidence * 100).toFixed(0)}%)
                  </span>
                )}
              </dd>
            </div>
            {finding.mitre.length > 0 && (
              <div className="md:col-span-2">
                <dt className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">MITRE ATT&amp;CK</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {finding.mitre.map((t) => (
                    <span key={t} className="rounded bg-accent-cyan/10 border border-accent-cyan/20 px-2 py-0.5 font-mono-data text-[11px] text-accent-cyan">
                      {t}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {finding.owasp_mobile.length > 0 && (
              <div className="md:col-span-2">
                <dt className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">OWASP Mobile</dt>
                <dd className="mt-1.5 flex flex-wrap gap-1.5">
                  {finding.owasp_mobile.map((c) => (
                    <span key={c} className="rounded bg-accent-violet/10 border border-accent-violet/20 px-2 py-0.5 font-mono-data text-[11px] text-accent-violet">
                      {c}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>

          <div>
            <p className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">Evidence Provenance</p>
            {hasProvenance ? (
              <div className="relative group">
                <pre className="max-h-80 overflow-auto rounded-lg bg-[#0d1117] border border-border/60 p-4 text-[13px] font-mono-data text-slate-300 shadow-inner">
                  {JSON.stringify(provenance, null, 2)}
                </pre>
                <div className="absolute top-0 right-0 h-full w-4 bg-gradient-to-l from-[#0d1117] to-transparent pointer-events-none rounded-r-lg" />
              </div>
            ) : (
              <div className="rounded-md border border-border/50 bg-background/50 p-3">
                <p className="text-sm text-muted-foreground">
                  This finding carries no provenance. It cannot be traced to a specific artifact —
                  treat it as a lead rather than as evidence.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
