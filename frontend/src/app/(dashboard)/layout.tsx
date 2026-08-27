import type { ReactNode } from 'react';
import { AuthGuard } from '@/components/features/auth-guard';
import { Sidebar } from '@/components/features/sidebar';
import { Topbar } from '@/components/features/topbar';

// Responsive dashboard shell: sidebar collapses on small screens.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        {/* Subtle background effects for the whole app */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-violet/5 rounded-full blur-[100px] mix-blend-screen" />
          <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-accent-cyan/5 rounded-full blur-[100px] mix-blend-screen" />
        </div>

        <Topbar />
        
        <div className="flex flex-1 overflow-hidden relative z-10">
          <aside className="hidden w-64 shrink-0 md:block relative">
            <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-border/10 via-border/60 to-border/10" />
            <Sidebar />
          </aside>
          
          <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="mx-auto max-w-6xl animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
