'use client';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  online: boolean;
  className?: string;
  showLabel?: boolean;
}

export function StatusBadge({ online, className }: StatusBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border',
        online
          ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20'
          : 'bg-muted-foreground/5 text-muted-foreground border-border/40',
        className
      )}
    >
      <div className={cn(
        "w-1 h-1 rounded-full",
        online ? "bg-emerald-500 status-online" : "bg-muted-foreground/30"
      )} />
      {online ? 'Live' : 'Offline'}
    </div>
  );
}
