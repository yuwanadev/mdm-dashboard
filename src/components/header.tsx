'use client';

import { useState, useRef, useEffect } from 'react';
import { useDeviceStore } from '@/lib/store';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Wifi, WifiOff, Bell, Menu } from 'lucide-react';
import { useToastStore } from '@/components/toaster';

interface HeaderProps {
  wsConnected: boolean;
  pageTitle?: string;
  onMenuToggle?: () => void;
}

export function Header({ wsConnected, pageTitle = 'Dashboard', onMenuToggle }: HeaderProps) {
  const devices = useDeviceStore((s) => s.getDeviceList());
  const onlineCount = devices.filter((d) => d.is_online).length;
  
  const { history, unreadCount, markAsRead, clearHistory } = useToastStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleNotifications = () => {
    if (!showNotifications) {
      markAsRead();
    }
    setShowNotifications(!showNotifications);
  };

  return (
    <header className="h-16 border-b border-border/40 bg-background flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-2 lg:gap-4">
        {onMenuToggle && (
          <button 
            onClick={onMenuToggle}
            className="lg:hidden p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider hidden sm:block">
          {pageTitle}
        </h2>
        <div className="hidden sm:block w-[1px] h-4 bg-border/40" />
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
        <div className="relative" ref={notifRef}>
          <button 
            onClick={handleToggleNotifications}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-background border border-border/40 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-3 border-b border-border/40 flex items-center justify-between bg-secondary/20">
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Notifications</h3>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="text-[10px] font-bold text-muted-foreground hover:text-red-400 transition-colors uppercase tracking-tight"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto p-2 space-y-1">
                {history.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest">No history</p>
                  </div>
                ) : (
                  history.map((t) => (
                    <div key={t.id} className="p-3 rounded-lg bg-secondary/10 hover:bg-secondary/30 transition-colors text-left border border-transparent hover:border-border/40">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={cn("text-xs font-bold", t.type === 'error' ? 'text-red-400' : t.type === 'warning' ? 'text-amber-400' : 'text-foreground')}>
                          {t.title}
                        </h4>
                        <span className="text-[9px] text-muted-foreground shrink-0 mt-0.5">
                          {formatRelativeTime(new Date(t.timestamp).toISOString())}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          {t.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-lg bg-secondary/80 flex items-center justify-center text-[11px] font-bold text-foreground border border-border/40">
          AD
        </div>
      </div>
    </header>
  );
}
