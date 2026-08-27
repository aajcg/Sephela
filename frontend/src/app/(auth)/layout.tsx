import type { ReactNode } from 'react';

// Centered, minimal shell for unauthenticated pages with premium animated background.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-background">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 mesh-gradient pointer-events-none z-0" />
      
      {/* Noise overlay for texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

      <div className="w-full max-w-[420px] px-6 relative z-10 animate-fade-in">
        <div className="mb-10 text-center animate-slide-up">
          <div className="inline-block relative">
            <h1 className="text-4xl font-extrabold tracking-tighter text-white drop-shadow-lg">
              Sephela
            </h1>
            <div className="absolute -inset-x-4 -inset-y-2 bg-accent-cyan/20 blur-xl rounded-full -z-10 animate-pulse-glow" />
          </div>
          <p className="mt-3 text-sm font-medium tracking-widest uppercase text-accent-cyan drop-shadow-[0_0_8px_hsl(187_92%_57%_/_0.5)]">
            Risk Analysis Platform
          </p>
        </div>
        {children}
      </div>
      
      {/* Footer text */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-xs font-mono-data text-muted-foreground/60 z-10 animate-fade-in" style={{ animationDelay: '500ms' }}>
        v2.0.0-beta • Enterprise Edition
      </div>
    </div>
  );
}
