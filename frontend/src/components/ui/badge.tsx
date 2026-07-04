import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { JobStatus, StageStatus } from "@/lib/api/types";

const statusStyles: Record<string, string> = {
  queued: "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
  running: "bg-severity-info/15 text-severity-info",
  ok: "bg-severity-low/15 text-severity-low",
  completed: "bg-severity-low/15 text-severity-low",
  partial: "bg-severity-medium/15 text-severity-medium",
  skipped: "bg-muted text-muted-foreground",
  failed: "bg-severity-critical/15 text-severity-critical",
  cancelled: "bg-muted text-muted-foreground",
};

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: JobStatus | StageStatus | string;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusStyles[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
      {...props}
    >
      {status}
    </span>
  );
}
