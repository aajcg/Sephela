'use client';

import { useState, type FormEvent } from 'react';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLogin } from '@/lib/hooks/use-auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <Card className="glass-strong border-accent-cyan/20 shadow-2xl shadow-black/50 animate-fade-in relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-accent-cyan/5 to-transparent pointer-events-none" />
      
      <CardHeader className="text-center pb-8 pt-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-animated shadow-[0_0_30px_hsl(187_92%_57%_/_0.4)]">
          <Shield className="h-8 w-8 text-white drop-shadow-md" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
        <CardDescription className="mt-2 text-muted-foreground/80">
          Sign in to access the command center
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-8 pb-10">
        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
              Work Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-background/50 border-border/80 focus-visible:bg-background transition-colors"
              placeholder="analyst@sephela.local"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center ml-1">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Password
              </label>
              <span className="text-xs font-medium text-accent-cyan hover:text-accent-cyan/80 cursor-pointer transition-colors">
                Forgot password?
              </span>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-background/50 border-border/80 focus-visible:bg-background transition-colors"
              placeholder="••••••••"
            />
          </div>
          
          {login.isError && (
            <div className="mt-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive-foreground text-center animate-shake">
              {login.error instanceof Error ? login.error.message : 'Authentication failed. Please verify credentials.'}
            </div>
          )}
          
          <Button 
            type="submit" 
            loading={login.isPending} 
            className="mt-4 w-full h-12 text-base font-bold tracking-wide shadow-[0_0_20px_hsl(187_92%_57%_/_0.3)] hover:shadow-[0_0_30px_hsl(187_92%_57%_/_0.5)] transition-shadow duration-300"
          >
            Authenticate
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
