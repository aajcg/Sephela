'use client';

import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Loader2, ShieldCheck, Upload, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingState, ErrorState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { useJobs } from '@/lib/hooks/use-jobs';
import type { Job } from '@/lib/api/types';
import { cn, formatDate } from '@/lib/utils';

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  colorClass,
  delay = 0 
}: { 
  label: string; 
  value: number | string; 
  icon: React.ElementType; 
  colorClass: string;
  delay?: number;
}) {
  return (
    <Card className="relative overflow-hidden animate-fade-in group" style={{ animationDelay: `${delay}ms` }}>
      <div className={cn("absolute -right-4 -top-4 opacity-10 transition-transform duration-500 group-hover:scale-110", colorClass)}>
        <Icon className="h-24 w-24" />
      </div>
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center bg-card shadow-inner border border-border/50", colorClass)}>
            <Icon className="h-5 w-5 drop-shadow-md" />
          </div>
          <p className="text-3xl font-bold tracking-tight text-foreground font-mono-data">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Visual pipeline representation for the dashboard
function ArchitectureDiagram() {
  const nodes = [
    { id: 'static', label: 'Static Analysis' },
    { id: 'code', label: 'Code Intel' },
    { id: 'dynamic', label: 'Dynamic Analysis' },
    { id: 'threat', label: 'Threat Intel' },
    { id: 'ai', label: 'AI Reasoning', highlight: true },
    { id: 'scoring', label: 'Risk Scoring' }
  ];

  return (
    <Card className="animate-fade-in" style={{ animationDelay: '400ms' }}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent-cyan" />
          Pipeline Architecture
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative flex justify-between items-center py-6 px-2 overflow-x-auto custom-scrollbar">
          {/* Animated connection line */}
          <div className="absolute top-1/2 left-8 right-8 h-[2px] -translate-y-1/2 bg-muted/50 z-0">
            <div className="h-full bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-emerald animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
          </div>
          
          {nodes.map((node, i) => (
            <div key={node.id} className="relative z-10 flex flex-col items-center gap-3 min-w-[80px]">
              <div className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center text-xs font-bold border transition-transform hover:scale-110",
                node.highlight 
                  ? "bg-gradient-animated border-accent-cyan/50 text-white shadow-[0_0_15px_hsl(187_92%_57%_/_0.4)]" 
                  : "bg-card border-border/80 text-muted-foreground shadow-md"
              )}>
                {i + 1}
              </div>
              <span className={cn(
                "text-[10px] uppercase tracking-wider font-semibold text-center whitespace-nowrap",
                node.highlight ? "text-accent-cyan" : "text-muted-foreground/80"
              )}>
                {node.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivity({ jobs }: { jobs: Job[] }) {
  const recent = jobs.slice(0, 5);
  
  if (recent.length === 0) {
    return (
      <div className="py-8 text-center border border-dashed border-border/60 rounded-lg">
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {recent.map((job, i) => {
        const isRunning = job.status === 'running' || job.status === 'queued';
        const isFailed = job.status === 'failed';
        
        return (
          <Link key={job.job_id} href={`/tasks/${job.job_id}`} className="block">
            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg border bg-card transition-colors hover:bg-muted/30 animate-fade-in",
              isRunning ? "border-accent-cyan/30" : "border-border/50"
            )} style={{ animationDelay: `${500 + i * 100}ms` }}>
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent-cyan" />
                  ) : isFailed ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-severity-low" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium font-mono-data">{job.job_id}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(job.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {job.risk_tier && (
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                    job.risk_tier === 'benign' ? "bg-severity-low/20 text-severity-low" :
                    job.risk_tier === 'suspicious' ? "bg-severity-medium/20 text-severity-medium" :
                    job.risk_tier === 'malicious' ? "bg-severity-high/20 text-severity-high" :
                    "bg-severity-critical/20 text-severity-critical"
                  )}>
                    {job.risk_tier}
                  </span>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useJobs();

  const jobs: Job[] = data?.items ?? [];
  const running = jobs.filter((j) => j.status === 'running' || j.status === 'queued').length;
  const completed = jobs.filter((j) => j.status === 'completed' || j.status === 'partial').length;
  const failed = jobs.filter((j) => j.status === 'failed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        description="Overview of AI-orchestrated APK analysis platform."
        action={
          <Link href="/upload">
            <Button className="animate-slide-up shadow-[0_0_15px_hsl(187_92%_57%_/_0.3)]">
              <Upload className="h-4 w-4 mr-2" />
              New Analysis
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <LoadingState label="Loading telemetry..." />
      ) : isError ? (
        <ErrorState error={error} retry={refetch} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              label="Total Analyses" 
              value={jobs.length} 
              icon={ShieldCheck} 
              colorClass="text-accent-violet" 
              delay={0}
            />
            <StatCard 
              label="In Progress" 
              value={running} 
              icon={Zap} 
              colorClass="text-accent-cyan" 
              delay={100}
            />
            <StatCard 
              label="Completed" 
              value={completed} 
              icon={CheckCircle2} 
              colorClass="text-severity-low" 
              delay={200}
            />
            <StatCard 
              label="Failed" 
              value={failed} 
              icon={AlertTriangle} 
              colorClass="text-destructive" 
              delay={300}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
            <div className="lg:col-span-2 space-y-6">
              <ArchitectureDiagram />
              
              {/* Optional: Add a stylized chart here if risk_tier distribution is needed */}
              <Card className="animate-fade-in" style={{ animationDelay: '500ms' }}>
                <CardHeader>
                  <CardTitle className="text-base">Analysis Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 flex items-center justify-center border border-dashed border-border/50 rounded-lg bg-muted/10">
                    <p className="text-sm text-muted-foreground">Select jobs from activity feed to view detailed reports.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-1">
              <Card className="h-full animate-fade-in" style={{ animationDelay: '400ms' }}>
                <CardHeader>
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <RecentActivity jobs={jobs} />
                  
                  {jobs.length > 5 && (
                    <Link href="/tasks" className="mt-4 block text-center text-sm font-medium text-accent-cyan hover:text-accent-cyan/80 transition-colors">
                      View all tasks &rarr;
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
