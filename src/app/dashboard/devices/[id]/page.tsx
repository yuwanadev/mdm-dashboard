'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDevice, sendCommand, getCommandHistory, deleteDevice, updateDevice, getGroups, getDeviceAccounts } from '@/lib/api';
import { useDeviceStore } from '@/lib/store';
import { Device, DeviceStatus, CommandLog, Group } from '@/lib/types';
import { StatusBadge } from '@/components/status-badge';
import { formatRelativeTime, getBatteryColor, cn } from '@/lib/utils';
import { RemoteMirror } from '@/components/remote-mirror';
import {
  ArrowLeft,
  Battery,
  Thermometer,
  HardDrive,
  MemoryStick,
  Smartphone,
  Code,
  Terminal,
  Clock,
  Zap,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  Globe,
  AppWindow,
  Edit2,
  Save,
  X,
  Lock,
  Bell,
  AlertTriangle,
  MapPin,
  Monitor,
  RefreshCw,
} from 'lucide-react';

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.id as string;

  const storeDevice = useDeviceStore((s) => s.devices[deviceId]);
  const [device, setDevice] = useState<(Device & { status?: DeviceStatus }) | null>(null);
  const [commands, setCommands] = useState<CommandLog[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingCmd, setSendingCmd] = useState<string | null>(null);
  
  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  
  // Group state
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Screenshot state
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

  // Mirror state
  const [showMirror, setShowMirror] = useState(false);

  const fetchDevice = useCallback(async () => {
    const res = await getDevice(deviceId);
    if (res.success && res.data) {
      setDevice(res.data);
      setNewName(res.data.device_name);
      setNewLabel(res.data.label || '');
      setNewNotes(res.data.notes || '');
      setSelectedGroupId(res.data.group_id || '');
    }
    setLoading(false);
  }, [deviceId]);

  const fetchCommands = useCallback(async () => {
    const res = await getCommandHistory(deviceId, 20);
    if (res.success && res.data) {
      setCommands(res.data);
    }
  }, [deviceId]);

  const fetchGroups = useCallback(async () => {
    const res = await getGroups();
    if (res.success && res.data) {
      setGroups(res.data);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    const res = await getDeviceAccounts(deviceId);
    if (res.success && res.data) {
      setAccounts(res.data);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchDevice();
    fetchCommands();
    fetchGroups();
    fetchAccounts();
  }, [fetchDevice, fetchCommands, fetchGroups, fetchAccounts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDevice(), fetchCommands()]);
    setTimeout(() => setRefreshing(false), 500); // Artificial delay for UX
  };

  // Periodic refresh to keep location/status data live
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDevice();
      fetchCommands();
    }, 15000); // every 15 seconds
    return () => clearInterval(interval);
  }, [fetchDevice, fetchCommands]);

  // Merge store updates (realtime) with fetched data
  const displayDevice = storeDevice
    ? { ...device, ...storeDevice, status: storeDevice.status || device?.status }
    : device;

  const handleSendCommand = async (cmdType: string, payload?: any) => {
    setSendingCmd(cmdType);
    const res = await sendCommand(deviceId, cmdType, payload);
    setSendingCmd(null);
    
    // Refresh commands after a short delay
    setTimeout(fetchCommands, 1000);

    if (cmdType === 'TAKE_SCREENSHOT') {
      // If screenshot was requested, wait a bit longer then update URL to bypass cache
      setTimeout(() => {
        const timestamp = new Date().getTime();
        setScreenshotUrl(`/screenshots/${deviceId}?t=${timestamp}`);
        setShowScreenshot(true);
      }, 3000);
    }
  };

  const handleUpdateDetails = async () => {
    setUpdating(true);
    try {
      const res = await updateDevice(deviceId, newName, newLabel, newNotes, selectedGroupId || undefined);
      if (res.success) {
        setDevice(prev => prev ? { ...prev, device_name: newName, label: newLabel, notes: newNotes, group_id: selectedGroupId } : null);
        setIsEditingName(false);
        setIsEditingMetadata(false);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await deleteDevice(deviceId);
      if (res.success) {
        router.push('/dashboard');
      } else {
        setShowDeleteModal(false);
        // Optionally show an error toast here
      }
    } catch {
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!displayDevice) {
    return (
      <div className="text-center py-20">
        <h3 className="text-lg font-semibold text-foreground">Device not found</h3>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 text-sm text-primary hover:underline"
        >
          ← Back to dashboard
        </button>
      </div>
    );
  }

  const status = displayDevice.status;

  return (
    <div className="space-y-6 lg:space-y-8 subtle-gradient min-h-full -m-4 p-4 lg:-m-8 lg:p-8">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-secondary/80 flex items-center justify-center text-muted-foreground">
            <Smartphone className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-secondary/40 border border-primary/30 rounded px-2 py-1 text-xl font-bold text-foreground outline-none focus:border-primary"
                    autoFocus
                  />
                  <button
                    onClick={handleUpdateDetails}
                    disabled={updating}
                    className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { setIsEditingName(false); setNewName(displayDevice.device_name); }}
                    className="p-1.5 rounded-md bg-secondary/80 text-foreground hover:bg-secondary transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">{displayDevice.device_name}</h1>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full mt-1.5",
                    displayDevice.is_online ? "bg-emerald-500 status-online" : "bg-muted-foreground/30"
                  )} />
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 uppercase tracking-wider font-medium">
              {displayDevice.device_model || 'Standard Asset'} · Android {displayDevice.android_version || '?'} · Agent {displayDevice.agent_version || '?'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/40 text-[13px] font-medium text-foreground hover:bg-secondary transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            Sync
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/40 text-[13px] font-medium text-foreground hover:bg-secondary transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 text-[13px] font-medium text-red-500 hover:bg-red-500/20 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Battery"
          value={status?.battery != null ? `${status.battery}%` : '—'}
          subValue={status?.battery_status ? `${status.battery_status} · ${status.battery_health || 'OK'}` : 'Power level'}
          icon={Battery}
          color={status?.battery != null ? getBatteryColor(status.battery) : undefined}
        />
        <MetricCard
          label="Thermal"
          value={status?.temperature != null ? `${status.temperature.toFixed(1)}°C` : '—'}
          subValue={status?.battery_technology || 'Hardware sensors'}
          icon={Thermometer}
        />
        <MetricCard
          label="Memory"
          value={status?.ram_usage != null ? `${status.ram_usage} MB` : '—'}
          subValue="Active RAM"
          icon={MemoryStick}
        />
        <MetricCard
          label="Storage"
          value={
            status?.storage_used != null && status?.storage_total != null
              ? `${Math.round(status.storage_used / 1024)}/${Math.round(status.storage_total / 1024)}G`
              : '—'
          }
          subValue="Disk usage"
          icon={HardDrive}
        />
      </div>

      {/* Network & Foreground App Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="minimal-card p-5 bg-secondary/20 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Globe className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Network Connectivity</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm font-bold text-foreground">
                {status?.network_info?.ip || 'No IP Address'}
              </p>
              {status?.network_info?.type && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary uppercase">
                  {status.network_info.type}
                </span>
              )}
              {status?.network_strength != null && status.network_strength >= 0 && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-500 uppercase">
                  Signal: {status.network_strength}/4
                </span>
              )}
            </div>
            {status?.network_info?.ssid && (
              <p className="text-[10px] text-muted-foreground mt-0.5">Connected to: <span className="text-foreground font-medium">{status.network_info.ssid}</span></p>
            )}
          </div>
        </div>

        <div className="minimal-card p-5 bg-secondary/20 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <AppWindow className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Foreground Activity</p>
            <p className="text-sm font-bold text-foreground mt-1 truncate">
              {status?.foreground_app || 'System / Idle'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Last detected app</p>
          </div>
        </div>

        {status?.location && (
          <div className="minimal-card p-5 bg-secondary/20 flex items-center gap-4 col-span-1 md:col-span-2">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Geographical Tracking</p>
              <div className="flex items-center justify-between mt-1">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {status.location.lat.toFixed(6)}, {status.location.lon.toFixed(6)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Accuracy: ±{Math.round(status.location.acc)}m</p>
                </div>
                <a 
                  href={`https://www.google.com/maps?q=${status.location.lat},${status.location.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-md bg-secondary/80 text-[11px] font-bold text-foreground hover:bg-secondary transition-all flex items-center gap-2"
                >
                  View on Map
                  <Globe className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ... existing cards ... */}
      </div>

      {/* Screenshot Modal */}
      {showScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="minimal-card max-w-4xl w-full bg-background overflow-hidden relative animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/40 bg-secondary/10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Device Display Capture
              </h3>
              <button
                onClick={() => setShowScreenshot(false)}
                className="p-1 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 bg-black/20 flex justify-center min-h-[300px] items-center">
              {screenshotUrl ? (
                <img
                  src={screenshotUrl}
                  alt="Device Screenshot"
                  className="max-h-[70vh] object-contain rounded border border-border/10"
                  onLoad={() => console.log("Screenshot loaded")}
                  onError={() => {
                    console.log("Screenshot not ready, retrying in 2s...");
                    setTimeout(() => {
                      setScreenshotUrl(`/screenshots/${deviceId}?t=${new Date().getTime()}`);
                    }, 2000);
                  }}
                />
              ) : (
                <div className="py-20 text-center">
                  <p className="text-sm text-muted-foreground">Waiting for device to send capture...</p>
                  <div className="mt-4 w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border/40 flex justify-end gap-3 bg-secondary/5">
              <button
                onClick={() => setScreenshotUrl(`/screenshots/${deviceId}?t=${new Date().getTime()}`)}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all"
              >
                Refresh View
              </button>
              <button
                onClick={() => setShowScreenshot(false)}
                className="px-4 py-2 rounded-lg bg-secondary/80 text-foreground text-xs font-bold hover:bg-secondary transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Message Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="minimal-card max-w-md w-full bg-background overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/40 bg-secondary/10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Broadcast Alert Message
              </h3>
              <button
                onClick={() => setShowAlertModal(false)}
                className="p-1 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Send a system-wide alert message to this device. The message will be displayed as a priority notification.
              </p>
              <textarea
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
                className="w-full bg-secondary/20 border border-border/40 rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary resize-none"
              />
            </div>
            <div className="p-4 border-t border-border/40 flex justify-end gap-3 bg-secondary/5">
              <button
                onClick={() => {
                  handleSendCommand('SHOW_ALERT', { message: alertMessage });
                  setShowAlertModal(false);
                  setAlertMessage('');
                }}
                disabled={!alertMessage.trim() || sendingCmd === 'SHOW_ALERT'}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                Send Alert
              </button>
              <button
                onClick={() => setShowAlertModal(false)}
                className="px-4 py-2 rounded-lg bg-secondary/80 text-foreground text-xs font-bold hover:bg-secondary transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remote Mirror Modal */}
      {showMirror && (
        <RemoteMirror
          deviceId={deviceId}
          isOnline={!!displayDevice.is_online}
          onClose={() => setShowMirror(false)}
        />
      )}

      {/* Delete Device Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="minimal-card max-w-sm w-full bg-background overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/40 bg-red-500/10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-red-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Remove Device
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 rounded-full hover:bg-red-500/20 text-red-500 transition-colors"
                disabled={deleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-foreground">
                Are you sure you want to remove <strong>{displayDevice.device_name}</strong>?
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This will permanently delete the device record and disconnect it from the server. This action cannot be undone.
              </p>
            </div>
            <div className="p-4 border-t border-border/40 flex justify-end gap-3 bg-secondary/5">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {deleting ? 'Removing...' : 'Yes, Remove Device'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-secondary/80 text-foreground text-xs font-bold hover:bg-secondary transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
        {/* Commands Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="minimal-card p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Action Panel</h3>
              <button
                onClick={() => {
                  setScreenshotUrl(`/screenshots/${deviceId}?t=${new Date().getTime()}`);
                  setShowScreenshot(true);
                }}
                className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tight"
              >
                View Latest
              </button>
            </div>

            {/* Diagnostics */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Diagnostics</p>
              {[
                { type: 'PING', label: 'Ping Device', icon: Zap },
                { type: 'GET_DEVICE_INFO', label: 'Refresh Specs', icon: Smartphone },
                { type: 'GET_BATTERY', label: 'Power Query', icon: Battery },
                { type: 'GET_STORAGE', label: 'Storage Map', icon: HardDrive },
              ].map(({ type, label, icon: Icon }) => (
                <ActionButton key={type} icon={Icon} label={label} loading={sendingCmd === type} disabled={!displayDevice.is_online} onClick={() => handleSendCommand(type)} />
              ))}
            </div>

            {/* Screen & Media */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Screen & Media</p>
              <ActionButton icon={Send} label="Take Screenshot" loading={sendingCmd === 'TAKE_SCREENSHOT'} disabled={!displayDevice.is_online} onClick={() => handleSendCommand('TAKE_SCREENSHOT')} />
              <ActionButton icon={Monitor} label="Remote Mirror" loading={false} disabled={!displayDevice.is_online} onClick={() => setShowMirror(true)} />
              <ActionButton icon={Bell} label="Broadcast Alert" loading={sendingCmd === 'SHOW_ALERT'} disabled={!displayDevice.is_online} onClick={() => setShowAlertModal(true)} />
            </div>

            {/* Developer Tools */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Developer Tools</p>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-muted-foreground flex items-center gap-2 min-w-[100px]">
                  <Code className="w-3.5 h-3.5 text-muted-foreground/50" /> Dev Mode
                </span>
                <div className="flex flex-1 gap-1.5">
                  <button
                    onClick={() => handleSendCommand('SET_DEV_MODE', { enabled: true })}
                    disabled={!displayDevice.is_online || sendingCmd === 'SET_DEV_MODE_ON'}
                    className="flex-1 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {sendingCmd === 'SET_DEV_MODE_ON' ? '...' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleSendCommand('SET_DEV_MODE', { enabled: false })}
                    disabled={!displayDevice.is_online || sendingCmd === 'SET_DEV_MODE_OFF'}
                    className="flex-1 px-3 py-1.5 rounded-md bg-secondary/40 border border-border/20 text-foreground text-[11px] font-bold hover:bg-secondary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {sendingCmd === 'SET_DEV_MODE_OFF' ? '...' : 'Disable'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-muted-foreground flex items-center gap-2 min-w-[100px]">
                  <Terminal className="w-3.5 h-3.5 text-muted-foreground/50" /> ADB
                </span>
                <div className="flex flex-1 gap-1.5">
                  <button
                    onClick={() => handleSendCommand('SET_USB_DEBUGGING', { enabled: true })}
                    disabled={!displayDevice.is_online || sendingCmd === 'SET_ADB_ON'}
                    className="flex-1 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {sendingCmd === 'SET_ADB_ON' ? '...' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleSendCommand('SET_USB_DEBUGGING', { enabled: false })}
                    disabled={!displayDevice.is_online || sendingCmd === 'SET_ADB_OFF'}
                    className="flex-1 px-3 py-1.5 rounded-md bg-secondary/40 border border-border/20 text-foreground text-[11px] font-bold hover:bg-secondary transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {sendingCmd === 'SET_ADB_OFF' ? '...' : 'Disable'}
                  </button>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">Security</p>
              <ActionButton icon={Lock} label="Remote Lock" loading={sendingCmd === 'LOCK_DEVICE'} disabled={!displayDevice.is_online} onClick={() => handleSendCommand('LOCK_DEVICE')} />
              <button
                onClick={() => handleSendCommand('FACTORY_RESET')}
                disabled={!displayDevice.is_online || sendingCmd === 'FACTORY_RESET'}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 opacity-60" />
                  Factory Reset
                </div>
                {sendingCmd === 'FACTORY_RESET' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              </button>
            </div>

            {!displayDevice.is_online && (
              <p className="text-[11px] text-center text-red-500/60 font-medium pt-1">
                Device offline — Commands disabled
              </p>
            )}
          </div>

          <div className="minimal-card p-5 bg-secondary/10 relative group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Asset Identity</h3>
              {!isEditingMetadata && (
                <button 
                  onClick={() => setIsEditingMetadata(true)}
                  className="p-1 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {isEditingMetadata ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Admin Label</label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="e.g. Lobby Terminal"
                      className="w-full mt-1 bg-background/50 border border-border/40 rounded px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Organizational Group</label>
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="w-full mt-1 bg-background/50 border border-border/40 rounded px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                    >
                      <option value="">No Group</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Internal Notes</label>
                    <textarea
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Maintenance history, location details..."
                      rows={3}
                      className="w-full mt-1 bg-background/50 border border-border/40 rounded px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleUpdateDetails}
                      disabled={updating}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-all"
                    >
                      {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingMetadata(false);
                        setNewLabel(displayDevice.label || '');
                        setNewNotes(displayDevice.notes || '');
                      }}
                      className="px-3 py-1.5 rounded bg-secondary/80 text-foreground text-[11px] font-bold hover:bg-secondary transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Admin Label</p>
                    <p className="text-[12px] font-bold text-foreground mt-0.5">{displayDevice.label || 'None assigned'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Group</p>
                    <p className="text-[12px] font-bold text-primary mt-0.5">
                      {groups.find(g => g.id === displayDevice.group_id)?.name || 'Unassigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Internal Notes</p>
                    <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed italic whitespace-pre-wrap">
                      {displayDevice.notes || 'No internal notes recorded for this asset.'}
                    </p>
                  </div>
                </>
              )}
              
              <div className="pt-2 border-t border-border/10">
                <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Unique Identifier</p>
                <p className="text-[11px] font-mono text-muted-foreground/80 mt-0.5 break-all">{displayDevice.id}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-tight">First Registered</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(displayDevice.created_at).toLocaleDateString()} at {new Date(displayDevice.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Command Log Panel */}
          <div className="minimal-card flex flex-col max-h-[600px]">
            <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between bg-secondary/10">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Command Ledger</h3>
              <button
                onClick={fetchCommands}
                className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-tight"
              >
                Sync
              </button>
            </div>

            <div className="p-2 space-y-2 overflow-y-auto flex-1">
              {commands.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">No activity recorded</p>
                </div>
              ) : (
                commands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="rounded-lg bg-secondary/20 border border-border/10 overflow-hidden"
                  >
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary/30">
                      <CommandStatusIcon status={cmd.status} />
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-foreground tracking-tight">{cmd.command_type}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {formatRelativeTime(cmd.created_at)}
                      </span>
                    </div>
                    
                    {cmd.message && (
                      <div className="px-4 py-2 bg-secondary/10 border-t border-border/5">
                        <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                          {cmd.message}
                        </p>
                      </div>
                    )}
                    
                    {cmd.result && (
                      <div className="px-4 py-3 border-t border-border/10 bg-black/5">
                        <div className="flex-1 overflow-x-auto">
                          {typeof cmd.result === 'object' ? (
                            <pre className="text-[11px] font-mono text-muted-foreground/90 leading-relaxed bg-black/20 p-3 rounded border border-border/10">
                              {JSON.stringify(cmd.result, null, 2)}
                            </pre>
                          ) : (
                            <p className="text-xs text-muted-foreground leading-relaxed italic">
                              {cmd.result}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Device Accounts Panel */}
          <div className="minimal-card flex flex-col">
            <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between bg-secondary/10">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Device Accounts</h3>
              <button
                onClick={fetchAccounts}
                className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-tight"
              >
                Sync
              </button>
            </div>
            <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto">
              {accounts.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">No accounts found</p>
                </div>
              ) : (
                accounts.map((acc) => (
                  <div key={acc.id} className="rounded-lg bg-secondary/20 border border-border/10 p-3 flex flex-col gap-1">
                    <p className="text-sm font-medium text-foreground">{acc.account_name}</p>
                    <p className="text-xs text-muted-foreground">{acc.account_type}</p>
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

// ── Minimalist Detail Components ──────────────────────────

function MetricCard({
  label,
  value,
  subValue,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  subValue: string;
  icon?: any;
  color?: string;
}) {
  return (
    <div className="minimal-card p-5 bg-secondary/20 flex flex-col justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
        <p className={cn("text-xl font-bold tracking-tight mt-2", color || "text-foreground")}>{value}</p>
      </div>
      <div className="flex items-center justify-between mt-1">
        <p className="text-[10px] text-muted-foreground font-medium">{subValue}</p>
        {Icon && <Icon className="w-3 h-3 text-muted-foreground/40" />}
      </div>
    </div>
  );
}

function CommandStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'SUCCESS':
      return <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />;
    case 'FAILED':
      return <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" />;
    case 'SENT':
      return <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />;
    case 'TIMEOUT':
      return <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.3)]" />;
    default:
      return <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />;
  }
}

function ActionButton({ icon: Icon, label, loading, disabled, onClick }: {
  icon: any;
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all bg-secondary/40 border border-border/20 text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-muted-foreground/60" />
        {label}
      </div>
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
    </button>
  );
}
