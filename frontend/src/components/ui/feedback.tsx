// Shared loading / error / empty states — used across every data view so the
// dashboard has consistent async UX (docs requirement: loading + error states).

import { AlertCircle, Inbox, Loader2, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { ApiError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-accent-cyan', className)} />;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-2 border-muted" />
        <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-t-accent-cyan border-r-transparent border-b-transparent border-l-transparent animate-spin" />
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Something went wrong.';
  const traceId = error instanceof ApiError ? error.traceId : null;

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center animate-fade-in">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 shadow-[0_0_20px_hsl(0_72%_51%_/_0.15)]">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <div>
        <p className="font-semibold text-foreground">{message}</p>
        {traceId && <p className="mt-1 text-xs text-muted-foreground font-mono">Trace: {traceId}</p>}
      </div>
      {retry && (
        <button
          onClick={retry}
          className="text-sm font-medium text-accent-cyan hover:text-accent-cyan/80 underline underline-offset-4 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/60">
        <ShieldAlert className="h-7 w-7 text-muted-foreground" />
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
