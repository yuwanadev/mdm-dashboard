'use client';

import { useDeviceStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Wifi, WifiOff, Bell } from 'lucide-react';

interface HeaderProps {
  wsConnected: boolean;
  pageTitle?: string;
}

export function Header({ wsConnected, pageTitle = 'Dashboard' }: HeaderProps) {
  const devices = useDeviceStore((s) => s.getDeviceList());
  const onlineCount = devices.filter((d) => d.is_online).length;

  return (
    <header className="h-16 border-b border-border/40 bg-background flex items-center justify-between px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {pageTitle}
        </h2>
        <div className="w-[1px] h-4 bg-border/40" />
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            wsConnected ? "bg-emerald-500 status-online" : "bg-muted-foreground/30"
          )} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
            {wsConnected ? 'System Live' : 'System Offline'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all">
          <Bell className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-secondary/80 flex items-center justify-center text-[11px] font-bold text-foreground border border-border/40">
          AD
        </div>
      </div>
    </header>
  );
}
