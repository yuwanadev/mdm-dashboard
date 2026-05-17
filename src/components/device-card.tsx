'use client';

import Link from 'next/link';
import { Device } from '@/lib/types';
import { StatusBadge } from './status-badge';
import { formatRelativeTime, getBatteryColor, cn } from '@/lib/utils';
import {
  Smartphone,
  Battery,
  Thermometer,
  HardDrive,
  Clock,
} from 'lucide-react';

interface DeviceCardProps {
  device: Device;
}

export function DeviceCard({ device }: DeviceCardProps) {
  const battery = device.status?.battery;
  const temp = device.status?.temperature;
  const storageUsed = device.status?.storage_used;
  const storageTotal = device.status?.storage_total;

  return (
    <Link href={`/dashboard/devices/${device.id}`}>
      <div className="minimal-card p-4 hover:border-primary/20 group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-secondary/80 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-medium text-foreground text-sm tracking-tight leading-none">
                {device.device_name}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                {device.device_model || 'Standard Device'}
              </p>
            </div>
          </div>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            device.is_online ? "bg-emerald-500 status-online" : "bg-muted-foreground/30"
          )} />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-y-2.5">
          <InfoRow label="Battery" value={battery != null ? `${battery}%` : '—'} />
          <InfoRow label="Temp" value={temp != null ? `${temp.toFixed(1)}°C` : '—'} />
          <InfoRow 
            label="Storage" 
            value={storageUsed != null && storageTotal != null
              ? `${Math.round(storageUsed / 1024)}G`
              : '—'} 
          />
          <InfoRow label="Activity" value={formatRelativeTime(device.last_seen)} />
        </div>
      </div>
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <span className="text-xs font-semibold text-foreground/90">{value}</span>
    </div>
  );
}
