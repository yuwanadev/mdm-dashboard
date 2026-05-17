'use client';

import { useState, useEffect, useCallback } from 'react';
import { getGroups, sendGroupCommand, sendCommand } from '@/lib/api';
import { Group, APK } from '@/lib/types';
import {
  Download,
  Upload,
  Plus,
  Trash2,
  Send,
  Loader2,
  Package,
  Clock,
  ArrowRight,
  X,
  FileUp,
} from 'lucide-react';
import { formatRelativeTime, cn } from '@/lib/utils';

export default function UpdatesPage() {
  const [apks, setApks] = useState<APK[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Upload form
  const [packageName, setPackageName] = useState('');
  const [versionName, setVersionName] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    // In a real app, these would be API calls
    // For now, let's fetch APKs from a new endpoint I'll add to API
    const apksRes = await fetch('/api/apks', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('mdm_tokens') ? JSON.parse(localStorage.getItem('mdm_tokens')!).access_token : ''}` }
    });
    const apksData = await apksRes.json();
    if (apksData.success) setApks(apksData.data);

    const groupsRes = await getGroups();
    if (groupsRes.success && groupsRes.data) setGroups(groupsRes.data);
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('package_name', packageName);
    formData.append('version_name', versionName);
    formData.append('version_code', versionCode);

    try {
      const res = await fetch('/api/apks', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${JSON.parse(localStorage.getItem('mdm_tokens')!).access_token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setShowUploadModal(false);
        fetchData();
        // Clear form
        setPackageName('');
        setVersionName('');
        setVersionCode('');
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  const deployToGroup = async (apk: APK, groupId: string) => {
    if (!confirm(`Deploy ${apk.package_name} v${apk.version_name} to all devices in group?`)) return;
    
    const downloadUrl = `${window.location.origin}/api/apks/${apk.id}`;
    await sendGroupCommand(groupId, 'INSTALL_APK', { url: downloadUrl });
    alert('Deployment signal sent to group.');
  };

  return (
    <div className="space-y-6 subtle-gradient min-h-full -m-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">App Distribution</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and deploy OTA application updates across your fleet.</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary/90 transition-all"
        >
          <Upload className="w-4 h-4" />
          Upload APK
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
          </div>
        ) : apks.length === 0 ? (
          <div className="minimal-card py-20 text-center bg-secondary/10">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">No APKs Uploaded</h3>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">Upload your first Android package to start orchestrating fleet-wide updates.</p>
          </div>
        ) : (
          apks.map((apk) => (
            <div key={apk.id} className="minimal-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-secondary/20 transition-colors border-border/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{apk.package_name}</h3>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                    Version {apk.version_name} ({apk.version_code}) · {Math.round(apk.file_size / 1024 / 1024 * 100) / 100} MB
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="w-3 h-3 text-muted-foreground/60" />
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                      Uploaded {formatRelativeTime(apk.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 pr-4 border-r border-border/20">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-2">Deploy to:</p>
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => deployToGroup(apk, group.id)}
                      className="px-3 py-1.5 rounded-md bg-secondary/60 text-[11px] font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-all flex items-center gap-2"
                    >
                      {group.name}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ))}
                </div>
                <button
                  className="p-2 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                  title="Delete APK"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="minimal-card max-w-md w-full bg-background overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/40 bg-secondary/10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <FileUp className="w-4 h-4" />
                New Application Package
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1 rounded-full hover:bg-secondary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-5 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Package Name</label>
                  <input
                    type="text"
                    required
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    placeholder="com.example.app"
                    className="w-full mt-1 bg-secondary/20 border border-border/40 rounded px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Version Name</label>
                    <input
                      type="text"
                      required
                      value={versionName}
                      onChange={(e) => setVersionName(e.target.value)}
                      placeholder="1.0.4"
                      className="w-full mt-1 bg-secondary/20 border border-border/40 rounded px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Version Code</label>
                    <input
                      type="number"
                      required
                      value={versionCode}
                      onChange={(e) => setVersionCode(e.target.value)}
                      placeholder="14"
                      className="w-full mt-1 bg-secondary/20 border border-border/40 rounded px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">APK File</label>
                  <input
                    type="file"
                    required
                    accept=".apk"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full mt-1 text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border/10">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Deploy Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
