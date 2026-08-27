'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TierBadge } from '@/components/ui/badge';
import type { ScoreBreakdown } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const TIER_STROKE: Record<string, string> = {
  benign: 'stroke-severity-low drop-shadow-[0_0_8px_hsl(160_84%_39%_/_0.5)]',
  suspicious: 'stroke-severity-medium drop-shadow-[0_0_8px_hsl(38_92%_50%_/_0.5)]',
  malicious: 'stroke-severity-high drop-shadow-[0_0_8px_hsl(25_95%_55%_/_0.5)]',
  critical: 'stroke-severity-critical drop-shadow-[0_0_12px_hsl(347_77%_50%_/_0.6)]',
};

const TIER_FILL: Record<string, string> = {
  benign: 'bg-severity-low shadow-[0_0_8px_hsl(160_84%_39%_/_0.4)]',
  suspicious: 'bg-severity-medium shadow-[0_0_8px_hsl(38_92%_50%_/_0.4)]',
  malicious: 'bg-severity-high shadow-[0_0_8px_hsl(25_95%_55%_/_0.4)]',
  critical: 'bg-severity-critical shadow-[0_0_12px_hsl(347_77%_50%_/_0.5)]',
};

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Helper to animate count up
function useCountUp(endValue: number, duration = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const tick = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing out quintic
      const easeOut = 1 - Math.pow(1 - progress, 5);
      
      setValue(endValue * easeOut);
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [endValue, duration]);

  return value;
}

export function RiskScoreGauge({ score }: { score: ScoreBreakdown }) {
  const tier = String(score.tier);
  const total = Math.max(0, Math.min(100, score.final_score));
  const basePortion = Math.max(0, Math.min(total, score.base_score));

  const animatedTotal = useCountUp(total, 1200);
  const animatedBasePortion = useCountUp(basePortion, 1200);

  const baseDash = (animatedBasePortion / 100) * CIRCUMFERENCE;
  const totalDash = (animatedTotal / 100) * CIRCUMFERENCE;

  return (
    <Card className="relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent-violet/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none group-hover:bg-accent-violet/10 transition-colors duration-500" />
      <CardContent className="flex flex-wrap items-center gap-10 py-8 relative z-10">
        <div className="relative h-36 w-36 shrink-0 animate-count-up">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90 drop-shadow-xl">
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
              className="stroke-muted/30"
            />
            {/* Synergy sits outside the base arc */}
            {score.synergy_bonus > 0 && (
              <circle
                cx="60"
                cy="60"
                r={RADIUS}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${totalDash} ${CIRCUMFERENCE}`}
                className={cn('opacity-40 transition-all duration-300', TIER_STROKE[tier] ?? 'stroke-muted-foreground')}
              />
            )}
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${baseDash} ${CIRCUMFERENCE}`}
              className={cn('transition-all duration-300', TIER_STROKE[tier] ?? 'stroke-muted-foreground')}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold tabular-nums tracking-tighter text-foreground drop-shadow-md">
              {animatedTotal.toFixed(1)}
            </span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1">
              Score
            </span>
          </div>
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-x-10 gap-y-6 text-sm sm:grid-cols-3">
          <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <dt className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider mb-1.5">Risk Tier</dt>
            <dd>
              <TierBadge tier={tier} className="text-sm px-3 py-1" />
            </dd>
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <dt className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider mb-1.5">Category</dt>
            <dd className="font-semibold text-foreground capitalize flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-accent-cyan" />
              {score.primary_category?.replace(/_/g, ' ') ?? '—'}
            </dd>
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <dt className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider mb-1.5">Confidence</dt>
            <dd className="font-mono-data text-foreground text-lg">
              {Math.round((score.confidence ?? 0) * 100)}%
            </dd>
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
            <dt className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider mb-1.5">Base Score</dt>
            <dd className="font-mono-data text-foreground">{score.base_score.toFixed(1)}</dd>
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '500ms' }}>
            <dt className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider mb-1.5">Synergy Bonus</dt>
            <dd className="font-mono-data font-semibold text-accent-amber">
              {score.synergy_bonus > 0 ? `+${score.synergy_bonus.toFixed(1)}` : '—'}
            </dd>
          </div>
          {score.scoring_version && (
            <div className="animate-fade-in" style={{ animationDelay: '600ms' }}>
              <dt className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider mb-1.5">Engine Version</dt>
              <dd className="font-mono-data text-xs text-muted-foreground/80 bg-muted/30 inline-block px-2 py-0.5 rounded border border-border/50">
                {score.scoring_version}
              </dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

export function ScoreDecomposition({ score }: { score: ScoreBreakdown }) {
  const tier = String(score.tier);
  const domains = [...score.domain_scores].sort((a, b) => b.weighted_score - a.weighted_score);
  const max = Math.max(...domains.map((d) => d.weighted_score), 1);

  if (domains.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Decomposition</CardTitle>
        <p className="text-sm text-muted-foreground">
          Domain contributions weighted by their share of the model.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {domains.map((domain, i) => (
          <div key={domain.domain} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="mb-2 flex items-baseline justify-between gap-4 text-sm">
              <span className="font-semibold capitalize text-foreground">{domain.domain.replace(/_/g, ' ')}</span>
              <span className="shrink-0 text-xs font-mono-data text-muted-foreground/80">
                <span className="text-foreground font-medium">{domain.weighted_score.toFixed(1)} pts</span> · 
                raw {domain.raw_score.toFixed(0)} × w {domain.weight.toFixed(2)} · 
                {domain.finding_count} {domain.finding_count === 1 ? 'finding' : 'findings'}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/40 shadow-inner">
              <div
                className={cn('h-full transition-all duration-1000 ease-out animate-progress-fill relative overflow-hidden', TIER_FILL[tier] ?? 'bg-primary')}
                style={{ width: `${(domain.weighted_score / max) * 100}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
              </div>
            </div>
            {domain.description && (
              <p className="mt-1.5 text-xs text-muted-foreground">{domain.description}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SynergyRules({ score }: { score: ScoreBreakdown }) {
  if (score.synergy_bonuses.length === 0) return null;

  return (
    <Card className="border-accent-amber/20">
      <div className="absolute inset-0 bg-accent-amber/5 opacity-50 rounded-lg pointer-events-none" />
      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent-amber drop-shadow-[0_0_8px_hsl(38_92%_50%_/_0.6)]" />
          <CardTitle>Synergy Rules Triggered</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Combinations that are more dangerous together. Added{' '}
          <strong className="text-accent-amber font-mono-data">+{score.synergy_bonus.toFixed(1)}</strong> points.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 relative z-10">
        {score.synergy_bonuses.map((rule, i) => (
          <div key={rule.rule_id} className="rounded-lg border border-border/60 bg-muted/20 p-4 transition-all hover:bg-muted/40 hover:border-accent-amber/30 animate-fade-in" style={{ animationDelay: `${i * 150}ms` }}>
            <div className="flex items-baseline justify-between gap-4 mb-1">
              <span className="text-sm font-semibold text-foreground">{rule.name}</span>
              <span className="shrink-0 text-sm font-mono-data font-bold text-accent-amber drop-shadow-[0_0_4px_hsl(38_92%_50%_/_0.4)]">
                +{rule.bonus.toFixed(1)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{rule.description}</p>
            {(rule.matched_domains.length > 0 || rule.matched_techniques.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {rule.matched_domains.map((d) => (
                  <span
                    key={d}
                    className="rounded bg-background border border-border px-2 py-0.5 text-[11px] font-medium text-foreground capitalize"
                  >
                    {d}
                  </span>
                ))}
                {rule.matched_techniques.map((t) => (
                  <span key={t} className="rounded bg-accent-cyan/10 border border-accent-cyan/20 px-2 py-0.5 font-mono-data text-[11px] text-accent-cyan">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
