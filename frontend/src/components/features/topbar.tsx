'use client';

import { useEffect, useState } from 'react';
import { LogOut, Bell, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser, useLogout } from '@/lib/hooks/use-auth';

function Greeting() {
  const [greeting, setGreeting] = useState('Good evening');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  return <span className="font-medium text-foreground">{greeting}</span>;
}

export function Topbar() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/50 glass px-4 md:px-6 relative z-10 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Placeholder search to make it feel like a real command center */}
        <div className="hidden md:flex items-center gap-2 rounded-full bg-muted/30 border border-border/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 focus-within:bg-muted/50 focus-within:border-accent-cyan/50">
          <Search className="h-4 w-4" />
          <input
            type="text"
            placeholder="Search jobs, hashes, IPs..."
            className="bg-transparent outline-none w-64 placeholder:text-muted-foreground/70 text-foreground"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="hidden text-sm sm:flex items-center gap-1.5">
            <span className="text-muted-foreground"><Greeting />,</span>
            <span className="font-semibold text-accent-cyan">{user.email.split('@')[0]}</span>
          </div>
        )}

        <div className="flex items-center gap-2 border-l border-border/50 pl-4 ml-2">
          <button className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent-rose shadow-[0_0_8px_hsl(347_77%_50%_/_0.8)]" />
          </button>
          
          <div className="h-8 w-8 rounded-full bg-gradient-animated p-[1.5px] cursor-pointer">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
              <User className="h-4 w-4 text-foreground" />
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={logout} aria-label="Log out" className="ml-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
