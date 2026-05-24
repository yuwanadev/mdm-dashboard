'use client';

import { useEffect, useState, useCallback } from 'react';
import { getGroups, createGroup, deleteGroup, sendGroupCommand } from '@/lib/api';
import { Group } from '@/lib/types';
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Search,
  Shield,
  Zap,
  Smartphone,
  Battery,
  HardDrive,
  Send,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bulk command state
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [isCommandModalOpen, setIsCommandModalOpen] = useState(false);
  const [sendingCmd, setSendingCmd] = useState<string | null>(null);
  const [cmdResult, setCmdResult] = useState<{ total: number; sent: number } | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const res = await getGroups();
    if (res.success && res.data) {
      setGroups(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setCreating(true);
    const res = await createGroup(newGroupName.trim());
    if (res.success && res.data) {
      setGroups(prev => [...prev, res.data!].sort((a, b) => a.name.localeCompare(b.name)));
      setNewGroupName('');
      setIsAdding(false);
    }
    setCreating(false);
  };

  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`Delete group "${name}"? Devices in this group will become unassigned.`)) return;

    setDeletingId(id);
    const res = await deleteGroup(id);
    if (res.success) {
      setGroups(prev => prev.filter(g => g.id !== id));
    }
    setDeletingId(null);
  };

  const handleRunCommand = async (commandType: string) => {
    if (!activeGroup) return;

    setSendingCmd(commandType);
    setCmdResult(null);
    const res = await sendGroupCommand(activeGroup.id, commandType);
    if (res.success && res.data) {
      setCmdResult(res.data);
      // Automatically close success message after 3 seconds
      setTimeout(() => setCmdResult(null), 3000);
    }
    setSendingCmd(null);
  };

  return (
    <div className="space-y-6 subtle-gradient min-h-full -m-4 p-4 lg:-m-8 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Device Groups</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize your fleet into logical segments for bulk management.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      </div>

      {/* Group Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Create New Group Card */}
          {isAdding && (
            <div className="minimal-card p-5 bg-primary/5 border-primary/20 border-dashed animate-in fade-in slide-in-from-top-2 duration-200">
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-primary font-bold">Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Sales Team, Lobby Devices..."
                    className="w-full mt-2 bg-background border border-primary/30 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary transition-all"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={creating || !newGroupName.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAdding(false); setNewGroupName(''); }}
                    className="px-3 py-2 rounded-lg bg-secondary text-foreground text-xs font-bold hover:bg-secondary/80 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.id} className="minimal-card p-5 bg-secondary/20 flex flex-col justify-between group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground leading-tight">{group.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground uppercase font-medium">
                      <Calendar className="w-3 h-3" />
                      {new Date(group.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteGroup(group.id, group.name)}
                  disabled={deletingId === group.id}
                  className="p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20 disabled:opacity-50"
                >
                  {deletingId === group.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={() => {
                    setActiveGroup(group);
                    setIsCommandModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Run Bulk Command
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-border/10 flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold italic">
                  Administrative Segment
                </p>
                <div className="w-6 h-6 rounded bg-secondary/40 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  G
                </div>
              </div>
            </div>
          ))}

          {!isAdding && groups.length === 0 && (
            <div className="col-span-full py-20 text-center bg-secondary/5 rounded-2xl border-2 border-dashed border-border/20">
              <Shield className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">No Groups Created</h3>
              <p className="text-xs text-muted-foreground mt-1">Start by creating your first segment to organize assets.</p>
              <button
                onClick={() => setIsAdding(true)}
                className="mt-6 px-4 py-2 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all"
              >
                + Add New Group
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bulk Command Modal */}
      {isCommandModalOpen && activeGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="minimal-card max-w-md w-full bg-background overflow-hidden relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/40 bg-secondary/10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Group Command: {activeGroup.name}
              </h3>
              <button
                onClick={() => {
                  setIsCommandModalOpen(false);
                  setCmdResult(null);
                }}
                className="p-1 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                This command will be sent to all online devices in the <span className="text-foreground font-bold">{activeGroup.name}</span> group.
              </p>

              {cmdResult ? (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center animate-in zoom-in duration-300">
                  <p className="text-sm font-bold text-emerald-500">Command Dispatched!</p>
                  <p className="text-[10px] text-emerald-500/80 mt-1 uppercase tracking-widest">
                    Sent to {cmdResult.sent} of {cmdResult.total} devices
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { type: 'PING', label: 'Ping All', icon: Zap },
                    { type: 'GET_DEVICE_INFO', label: 'Update All Specs', icon: Smartphone },
                    { type: 'GET_BATTERY', label: 'Refresh All Power', icon: Battery },
                    { type: 'GET_STORAGE', label: 'Map All Storage', icon: HardDrive },
                    { type: 'TAKE_SCREENSHOT', label: 'Capture All Displays', icon: Send },
                  ].map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => handleRunCommand(type)}
                      disabled={sendingCmd != null}
                      className={cn(
                        'flex items-center justify-between px-4 py-3 rounded-lg text-[13px] font-medium transition-all',
                        'bg-secondary/40 border border-border/20 text-foreground hover:bg-secondary',
                        'disabled:opacity-30 disabled:cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-muted-foreground/60" />
                        {label}
                      </div>
                      {sendingCmd === type && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border/40 bg-secondary/5 text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-tight italic">
                Only active (online) assets will receive the payload immediately.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
