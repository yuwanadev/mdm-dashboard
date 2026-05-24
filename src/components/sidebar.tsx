'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { clearTokens } from '@/lib/api';
import { useDeviceStore } from '@/lib/store';
import {
  LayoutDashboard,
  Smartphone,
  Users,
  Settings,
  LogOut,
  Shield,
  ChevronRight,
  Circle,
  Download,
  X,
} from 'lucide-react';

import packageJson from '../../package.json';

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen = false, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const devices = useDeviceStore((s) => s.getDeviceList());

  const handleLogout = () => {
    clearTokens();
    router.push('/login');
  };

  const navItems = [
    { 
      label: 'Dashboard', 
      href: '/dashboard', 
      icon: LayoutDashboard,
      active: pathname === '/dashboard'
    },
    { 
      label: 'Devices', 
      href: '/dashboard/devices', 
      icon: Smartphone,
      active: pathname.startsWith('/dashboard/devices'),
      subItems: devices.map(d => ({
        label: d.device_name,
        href: `/dashboard/devices/${d.id}`,
        online: d.is_online
      }))
    },
    { 
      label: 'Groups', 
      href: '/dashboard/groups', 
      icon: Users,
      active: pathname === '/dashboard/groups'
    },
    { 
      label: 'Accounts', 
      href: '/dashboard/accounts', 
      icon: Users,
      active: pathname === '/dashboard/accounts'
    },
    { 
      label: 'App Updates', 
      href: '/dashboard/updates', 
      icon: Download,
      active: pathname === '/dashboard/updates'
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && setIsOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside className={cn(
        "fixed left-0 top-0 h-screen w-64 bg-background border-r border-border/40 flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setIsOpen?.(false)}>
          <Shield className="w-6 h-6 text-foreground" />
          <div>
            <h1 className="text-sm font-bold tracking-tight">YuwanaDev MDM</h1>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
              <span>Management</span>
              <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50"></span>
              <span>v{packageJson.version}</span>
            </p>
          </div>
        </Link>
        {setIsOpen && (
          <button 
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <div key={item.label} className="space-y-0.5">
            <Link
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200',
                item.active
                  ? 'text-foreground bg-secondary/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
              )}
              onClick={() => {
                if (!item.subItems) {
                  setIsOpen?.(false);
                }
              }}
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
              {item.subItems && item.subItems.length > 0 && (
                <ChevronRight className={cn("w-3.5 h-3.5 transition-transform duration-200", item.active && "rotate-90")} />
              )}
            </Link>

            {/* Sub Items */}
            {item.subItems && (item.active || pathname.startsWith(item.href)) && (
              <div className="ml-4 space-y-0.5 mt-0.5 border-l border-border/40 pl-2">
                {item.subItems.map((sub) => {
                  const isSubActive = pathname === sub.href;
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => setIsOpen?.(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all duration-200',
                        isSubActive
                          ? 'text-foreground bg-secondary/60'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                      )}
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        sub.online ? "bg-emerald-500" : "bg-muted-foreground/40"
                      )} />
                      <span className="truncate">{sub.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/40">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all duration-200 w-full"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
    </>
  );
}
