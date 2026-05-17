'use client';

import { useEffect, useState, useCallback } from 'react';
import { getDevices } from '@/lib/api';
import { useDeviceStore } from '@/lib/store';
import { DeviceCard } from '@/components/device-card';
import { AddDeviceModal } from '@/components/add-device-modal';
import { cn } from '@/lib/utils';
import { Plus, Smartphone, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const { setDevices, getDeviceList } = useDeviceStore();
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const devices = getDeviceList();
  const onlineCount = devices.filter((d) => d.is_online).length;

  const fetchDevices = useCallback(async () => {
    const res = await getDevices();
    if (res.success && res.data) {
      setDevices(res.data);
    }
    setLoading(false);
  }, [setDevices]);

  useEffect(() => {
    fetchDevices();
    // Refresh device list every 60 seconds
    const interval = setInterval(fetchDevices, 60000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  return (
    <div className="space-y-8 subtle-gradient min-h-full -m-8 p-8">
      {/* Header Info */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System status and device connectivity overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDevices}
            className="p-2 rounded-lg bg-secondary/40 text-muted-foreground hover:text-foreground transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            id="add-device-btn"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Device
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Connected Devices"
          value={devices.length.toString()}
          subValue={`${onlineCount} active now`}
        />
        <StatCard
          label="Online Rate"
          value={devices.length > 0 ? `${Math.round((onlineCount / devices.length) * 100)}%` : '0%'}
          subValue="Real-time connectivity"
        />
        <StatCard
          label="Last Update"
          value="Just now"
          subValue="Auto-refreshing"
        />
      </div>

      {/* Device Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Devices</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin" />
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-20 minimal-card bg-secondary/10">
            <Smartphone className="w-8 h-8 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-foreground">No devices yet</h3>
            <p className="text-xs text-muted-foreground mt-1">Connect your first device to see it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {devices.map((device) => (
              <DeviceCard key={device.id} device={device} />
            ))}
          </div>
        )}
      </div>

      {/* Add Device Modal */}
      <AddDeviceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onDeviceCreated={fetchDevices}
      />
    </div>
  );
}

// ── Minimalist Stat Card ────────────────────────────────────

function StatCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue: string;
}) {
  return (
    <div className="minimal-card p-6 bg-secondary/20">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
      </div>
      <p className="text-[11px] text-muted-foreground/80 mt-1 font-medium">{subValue}</p>
    </div>
  );
}
