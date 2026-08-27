'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Upload, ListChecks, FileText, Settings, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/reports', label: 'Reports', icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col justify-between glass-strong">
      <div>
        <div className="flex h-14 items-center px-4 border-b border-border/50">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-animated shadow-lg shadow-accent-cyan/20">
              <span className="font-bold text-white tracking-tight">S</span>
            </div>
            <span className="font-bold tracking-wide text-foreground">Sephela</span>
          </Link>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-accent-cyan/10 text-accent-cyan relative overflow-hidden'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                {active && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-accent-cyan rounded-r-md glow-cyan" />
                )}
                <Icon
                  className={cn(
                    'h-4 w-4 transition-transform duration-200 group-hover:scale-110',
                    active && 'text-accent-cyan drop-shadow-[0_0_8px_hsl(187_92%_57%_/_0.5)]'
                  )}
                />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3">
        <div className="mb-2 px-3 py-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent-emerald drop-shadow-[0_0_8px_hsl(160_84%_39%_/_0.5)]" />
              <span className="text-xs font-medium text-foreground">System Status</span>
            </div>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-emerald" />
            </span>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">All systems operational</p>
        </div>

        <Link
          href="#"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}
