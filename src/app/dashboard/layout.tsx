'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAccessToken } from '@/lib/api';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { useWebSocket } from '@/hooks/use-websocket';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const { isConnected } = useWebSocket();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Overview';
    if (pathname === '/dashboard/devices') return 'Inventory';
    if (pathname.startsWith('/dashboard/devices/')) return 'Device Control';
    return 'Dashboard';
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <Header wsConnected={isConnected} pageTitle={getPageTitle()} />
        <main className="flex-1 p-8 bg-background relative overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
