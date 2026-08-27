'use client';

import { useRef, useState, type DragEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, Shield, UploadCloud, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { useUpload } from '@/lib/hooks/use-jobs';
import { cn } from '@/lib/utils';

export default function UploadPage() {
  const router = useRouter();
  const upload = useUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileSize, setFileSize] = useState<string>('');

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const pick = (f: File | null) => {
    if (f && (f.name.endsWith('.apk') || f.name.endsWith('.xapk'))) {
      setFile(f);
      setFileSize(formatSize(f.size));
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0] ?? null);
  };

  const submit = () => {
    if (!file) return;
    upload.mutate(file, {
      onSuccess: (res) => router.push(`/tasks/${res.job_id}`),
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader 
        title="Upload Sample" 
        description="Submit an Android APK for automated multi-agent analysis and risk scoring." 
      />

      <Card className="relative overflow-hidden border-accent-cyan/20">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/5 via-transparent to-accent-violet/5 pointer-events-none" />
        
        <CardContent className="pt-8 relative z-10">
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-14 text-center transition-all duration-300',
                dragging 
                  ? 'border-accent-cyan bg-accent-cyan/10 scale-[0.98]' 
                  : 'border-border/80 bg-muted/20 hover:border-accent-cyan/50 hover:bg-muted/40',
                'overflow-hidden'
              )}
            >
              {/* Animated dashed border effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 dashed-animated pointer-events-none" />
              </div>

              <div className={cn(
                "relative flex h-20 w-20 items-center justify-center rounded-full transition-all duration-500",
                dragging 
                  ? "bg-accent-cyan/20 text-accent-cyan scale-110 shadow-[0_0_30px_hsl(187_92%_57%_/_0.3)]" 
                  : "bg-background border border-border text-muted-foreground group-hover:bg-accent-cyan/10 group-hover:text-accent-cyan group-hover:border-accent-cyan/30"
              )}>
                <UploadCloud className="h-10 w-10 transition-transform duration-300 group-hover:-translate-y-1" />
                {dragging && <div className="absolute inset-0 rounded-full animate-ping border-2 border-accent-cyan/40" />}
              </div>
              
              <div className="space-y-1 relative z-10">
                <p className="text-lg font-semibold text-foreground tracking-tight">
                  Drag & drop your APK here
                </p>
                <p className="text-sm text-muted-foreground">
                  or click to browse from your computer
                </p>
              </div>
              
              <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full bg-background border border-border/50 text-xs text-muted-foreground relative z-10">
                <Shield className="h-3 w-3 text-accent-emerald" />
                Supports .apk and .xapk files up to 200MB
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".apk,.xapk"
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
              />
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between p-5 rounded-xl border border-accent-cyan/30 bg-accent-cyan/5 shadow-[0_0_20px_hsl(187_92%_57%_/_0.1)]">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-background border border-accent-cyan/20 flex items-center justify-center text-accent-cyan shadow-inner">
                    <FileUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-sm md:max-w-md">{file.name}</p>
                    <p className="text-xs text-muted-foreground font-mono-data mt-0.5">{fileSize}</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-background hover:text-foreground border border-transparent hover:border-border transition-all"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {upload.isPending && (
                <div className="mt-4 p-4 rounded-xl border border-border/50 bg-muted/20 flex flex-col items-center justify-center gap-3">
                  <div className="relative w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="absolute top-0 left-0 h-full bg-accent-cyan animate-shimmer" style={{ width: '100%', backgroundSize: '200% 100%' }} />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground animate-pulse">Uploading and initializing analysis pipeline...</p>
                </div>
              )}
            </div>
          )}

          {upload.isError && (
            <div className="mt-4 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive-foreground animate-slide-up flex items-start gap-2">
              <X className="h-4 w-4 shrink-0 mt-0.5" />
              <p>{upload.error instanceof Error ? upload.error.message : 'Upload failed. Please try again.'}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-border/50 pt-6">
            <Button variant="ghost" onClick={() => setFile(null)} disabled={!file || upload.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} loading={upload.isPending} disabled={!file} className="min-w-[140px]">
              Start Analysis
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
