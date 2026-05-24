'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Search, User, Smartphone } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { ApiResponse } from '@/lib/types';

interface DeviceAccount {
  id: string;
  device_id: string;
  account_name: string;
  account_type: string;
  created_at: string;
  updated_at: string;
  device_name: string;
  device_model?: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<DeviceAccount[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data: ApiResponse<DeviceAccount[]> = await apiFetch('/api/accounts');
        setAccounts(data.data || []);
      } catch (e) {
        console.error('Failed to fetch accounts', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  const filteredAccounts = accounts.filter(acc => 
    acc.account_name.toLowerCase().includes(search.toLowerCase()) ||
    acc.account_type.toLowerCase().includes(search.toLowerCase()) ||
    acc.device_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Device Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unified list of all accounts found on managed devices.
          </p>
        </div>
      </div>

      <div className="minimal-card flex flex-col">
        <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between bg-secondary/10">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search accounts, types, or devices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background/50 border border-border/40 rounded-lg pl-9 pr-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            Total: <span className="font-medium text-foreground">{filteredAccounts.length}</span>
          </div>
        </div>
        <div className="p-5">
          <div className="rounded-md border border-border/40 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-border/40 bg-secondary/10 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <div className="col-span-4">Account Name</div>
              <div className="col-span-3">Type</div>
              <div className="col-span-3">Device</div>
              <div className="col-span-2 text-right">Last Seen</div>
            </div>
            <div className="divide-y divide-border/20">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading accounts...</div>
              ) : filteredAccounts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No accounts found</div>
              ) : (
                filteredAccounts.map((acc) => (
                  <div key={acc.id} className="grid grid-cols-12 gap-4 p-4 items-center text-sm hover:bg-secondary/20 transition-colors">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-foreground truncate">{acc.account_name}</span>
                    </div>
                    <div className="col-span-3 text-muted-foreground truncate">
                      {acc.account_type.replace('com.', '')}
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground truncate">{acc.device_name}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{acc.device_model || 'Unknown model'}</span>
                      </div>
                    </div>
                    <div className="col-span-2 text-right text-muted-foreground text-[11px]">
                      {formatRelativeTime(acc.updated_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
