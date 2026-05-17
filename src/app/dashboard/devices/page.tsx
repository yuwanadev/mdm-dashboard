'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { getDevices } from '@/lib/api';
import { useDeviceStore } from '@/lib/store';
import { StatusBadge } from '@/components/status-badge';
import { formatRelativeTime, cn } from '@/lib/utils';
import { 
  Smartphone, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronRight,
  ExternalLink,
  MoreVertical
} from 'lucide-react';

export default function DevicesPage() {
  const { setDevices, getDeviceList } = useDeviceStore();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');

  const devices = getDeviceList();

  const fetchDevices = async () => {
    setLoading(true);
    const res = await getDevices();
    if (res.success && res.data) {
      setDevices(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const matchesSearch = 
        (d.device_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.device_model || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' || 
        (statusFilter === 'online' && d.is_online) || 
        (statusFilter === 'offline' && !d.is_online);
      
      return matchesSearch && matchesStatus;
    });
  }, [devices, searchQuery, statusFilter]);

  return (
    <div className="space-y-8 subtle-gradient min-h-full -m-8 p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Device Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete list of managed assets and their connectivity status.
          </p>
        </div>
        <button
          onClick={fetchDevices}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/40 text-foreground hover:bg-secondary transition-all disabled:opacity-50 text-[13px] font-medium"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Sync
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search by name, ID, or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary/20 border border-border/40 text-sm focus:outline-none focus:border-primary/30 transition-all placeholder:text-muted-foreground/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-secondary/20 border border-border/40 rounded-lg px-4 py-2 text-[13px] text-foreground focus:outline-none focus:border-primary/30 transition-all cursor-pointer appearance-none"
          >
            <option value="all">All Status</option>
            <option value="online">Online Only</option>
            <option value="offline">Offline Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="minimal-card border-border/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40">
                <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Device</th>
                <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Model & OS</th>
                <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Last Activity</th>
                <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest text-right">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {loading && devices.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-6 py-6">
                      <div className="h-3 bg-secondary/30 rounded w-full animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-xs text-muted-foreground uppercase tracking-widest font-medium">
                    No matching devices
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <tr 
                    key={device.id} 
                    className="hover:bg-secondary/20 transition-colors group cursor-pointer"
                    onClick={() => window.location.href = `/dashboard/devices/${device.id}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-4 h-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                        <div>
                          <p className="text-[13px] font-medium text-foreground leading-tight">{device.device_name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{device.id?.slice(0, 8) || 'unknown'}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          device.is_online ? "bg-emerald-500 status-online" : "bg-muted-foreground/30"
                        )} />
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                          {device.is_online ? 'Live' : 'Offline'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] text-foreground font-medium">{device.device_model || '—'}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">Android {device.android_version || '?'} · Agent {device.agent_version || '?'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {formatRelativeTime(device.last_seen)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-foreground group-hover:translate-x-0.5 transition-all inline" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-2">
        <p>{filteredDevices.length} / {devices.length} Devices</p>
        <p>Live Monitoring</p>
      </div>
    </div>
  );
}
