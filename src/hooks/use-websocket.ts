'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getAccessToken } from '@/lib/api';
import { useDeviceStore } from '@/lib/store';
import { WSMessage } from '@/lib/types';



/**
 * Custom hook for WebSocket connection to the dashboard endpoint.
 * Auto-reconnects with exponential backoff.
 * Dispatches incoming messages to the Zustand device store.
 */
export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const attemptRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  const { setDeviceOnline, updateDeviceStatus, updateDevice } = useDeviceStore();

  const connect = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/dashboard?token=${token}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Dashboard connected');
        setIsConnected(true);
        attemptRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          handleMessage(msg);
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Dashboard disconnected');
        setIsConnected(false);
        scheduleReconnect();
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
        ws.close();
      };
    } catch (e) {
      console.error('[WS] Connect error:', e);
      scheduleReconnect();
    }
  }, []);

  const handleMessage = useCallback(
    (msg: WSMessage) => {
      switch (msg.type) {
        case 'DEVICE_ONLINE':
          if (msg.payload?.device_id) {
            setDeviceOnline(msg.payload.device_id, true);
          }
          break;

        case 'DEVICE_OFFLINE':
          if (msg.payload?.device_id) {
            setDeviceOnline(msg.payload.device_id, false);
          }
          break;

        case 'STATUS_UPDATE':
          if (msg.payload?.device_id) {
            updateDeviceStatus(msg.payload.device_id, {
              ...msg.payload,
              updated_at: msg.timestamp || new Date().toISOString(),
            });
            // Also update last_seen
            updateDevice(msg.payload.device_id, {
              last_seen: new Date().toISOString(),
              is_online: true,
            });
          }
          break;

        case 'DEVICE_INFO':
          if (msg.payload?.device_id) {
            updateDevice(msg.payload.device_id, {
              device_model: `${msg.payload.manufacturer || ''} ${msg.payload.model || ''}`.trim(),
              android_version: msg.payload.android_version,
            });
          }
          break;

        case 'COMMAND_RESULT':
          // Could dispatch to a command results store in the future
          console.log('[WS] Command result:', msg.payload);
          break;

        default:
          console.log('[WS] Unknown message:', msg.type);
      }
    },
    [setDeviceOnline, updateDeviceStatus, updateDevice]
  );

  const scheduleReconnect = useCallback(() => {
    const backoff = Math.min(1000 * Math.pow(2, attemptRef.current), 30000);
    const jitter = Math.random() * backoff * 0.25;
    attemptRef.current++;
    console.log(`[WS] Reconnecting in ${Math.round(backoff + jitter)}ms (attempt ${attemptRef.current})`);

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, backoff + jitter);
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { isConnected, send, disconnect, reconnect: connect, wsRef };
}
