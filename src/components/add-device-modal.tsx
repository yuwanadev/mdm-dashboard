"use client";

import { useState } from "react";
import { createDevice } from "@/lib/api";
import { CreateDeviceResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, Copy, Check, X } from "lucide-react";

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceCreated: () => void;
}

export function AddDeviceModal({
  isOpen,
  onClose,
  onDeviceCreated,
}: AddDeviceModalProps) {
  const [deviceName, setDeviceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CreateDeviceResult | null>(null);
  const [copiedServer, setCopiedServer] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      setError("Device name is required");
      return;
    }

    setLoading(true);
    setError("");

    const res = await createDevice(deviceName.trim());
    setLoading(false);

    if (res.success && res.data) {
      setResult(res.data);
      onDeviceCreated();
    } else {
      setError(res.error || "Failed to create device");
    }
  };

  const handleCopyServer = async () => {
    if (result?.server_url) {
      await navigator.clipboard.writeText(result.server_url);
      setCopiedServer(true);
      setTimeout(() => setCopiedServer(false), 2000);
    }
  };

  const handleCopyToken = async () => {
    if (result?.token) {
      await navigator.clipboard.writeText(result.token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleClose = () => {
    setDeviceName("");
    setError("");
    setResult(null);
    setCopiedServer(false);
    setCopiedToken(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border/40 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!result ? (
          /* Form view */
          <>
            <h2 className="text-xl font-semibold text-foreground mb-1">
              Add Device
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Register a new Android device to monitor.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Device Name
                </label>
                <input
                  id="device-name-input"
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. Pixel 8 Pro"
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg bg-secondary/20 border border-border/40",
                    "text-foreground placeholder:text-muted-foreground/30",
                    "focus:outline-none focus:border-primary/40",
                    "transition-all duration-200 text-sm",
                  )}
                  autoFocus
                />
              </div>

              {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

              <button
                id="create-device-btn"
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-widest transition-all duration-200",
                  "bg-primary text-primary-foreground hover:opacity-90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2",
                )}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Device
                  </>
                )}
              </button>
            </form>
          </>
        ) : (
          /* Token display view */
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-emerald-400/10 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                Device Created!
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Copy the token below and enter it in the Android app.
              </p>
            </div>

            {/* Device info */}
            <div className="bg-secondary/50 rounded-xl p-4 mb-4">
              <div className="text-xs text-muted-foreground mb-1">
                Device Name
              </div>
              <div className="text-sm font-medium text-foreground">
                {result.device.device_name}
              </div>
            </div>

            {/* Server URL */}
            <div className="mb-4">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <span>Server URL</span>
              </div>
              <div className="relative">
                <code className="block w-full p-4 rounded-xl bg-secondary/50 border border-border text-xs text-foreground font-mono break-all select-all leading-relaxed">
                  {result.server_url}
                </code>
                <button
                  onClick={() => handleCopyServer()}
                  className={cn(
                    "absolute top-2 right-2 p-2 rounded-lg transition-all duration-200",
                    copiedServer
                      ? "bg-emerald-400/20 text-emerald-400"
                      : "bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {copiedServer ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Token */}
            <div className="mb-4">
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <span>Device Token</span>
                <span className="text-amber-400">(shown once only!)</span>
              </div>
              <div className="relative">
                <code className="block w-full p-4 rounded-xl bg-secondary/50 border border-border text-xs text-foreground font-mono break-all select-all leading-relaxed">
                  {result.token}
                </code>
                <button
                  onClick={() => handleCopyToken()}
                  className={cn(
                    "absolute top-2 right-2 p-2 rounded-lg transition-all duration-200",
                    copiedToken
                      ? "bg-emerald-400/20 text-emerald-400"
                      : "bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {copiedToken ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl font-medium text-sm bg-secondary hover:bg-secondary/80 text-foreground transition-all duration-200"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
