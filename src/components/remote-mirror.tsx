"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getAccessToken } from "@/lib/api";
import {
  Monitor,
  X,
  MousePointer,
  Loader2,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface RemoteMirrorProps {
  deviceId: string;
  isOnline: boolean;
  onClose: () => void;
}

export function RemoteMirror({
  deviceId,
  isOnline,
  onClose,
}: RemoteMirrorProps) {
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchFeedback, setTouchFeedback] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [videoAspect, setVideoAspect] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const stopMirror = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "STOP_MIRROR",
          payload: { device_id: deviceId },
          timestamp: new Date().toISOString(),
        }),
      );
    }
    pcRef.current?.close();
    pcRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setStreaming(false);
    setConnected(false);
  }, [deviceId]);

  const startMirror = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws/dashboard?token=${token}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = async () => {
      console.log("[Mirror] WS connected for WebRTC signaling");
      setConnected(true);

      // Tell device to start WebRTC pipeline
      ws.send(
        JSON.stringify({
          type: "START_MIRROR",
          payload: { device_id: deviceId },
          timestamp: new Date().toISOString(),
        }),
      );

      // Initialize WebRTC PeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      pcRef.current = pc;

      // Handle incoming ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "WEBRTC_SIGNAL",
              payload: {
                device_id: deviceId,
                signal: {
                  type: "ice_candidate",
                  candidate: event.candidate,
                },
              },
            }),
          );
        }
      };

      // Handle incoming video track
      pc.ontrack = (event) => {
        console.log("[Mirror] Received WebRTC track");
        if (videoRef.current) {
          if (event.streams && event.streams.length > 0) {
            videoRef.current.srcObject = event.streams[0];
          } else {
            videoRef.current.srcObject = new MediaStream([event.track]);
          }
          // Detect video dimensions once metadata is loaded
          videoRef.current.onloadedmetadata = () => {
            const v = videoRef.current;
            if (v && v.videoWidth && v.videoHeight) {
              setVideoAspect(v.videoWidth / v.videoHeight);
              console.log(`[Mirror] Video dimensions: ${v.videoWidth}x${v.videoHeight}`);
            }
          };
          videoRef.current.play().catch(console.error);
          setStreaming(true);
        }
      };

      // Device will generate the offer once its MediaProjection is fully acquired
    };

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "WEBRTC_SIGNAL") {
          const signal = msg.payload.signal;
          const pc = pcRef.current;
          if (!pc) return;

          if (signal.type === "offer") {
            console.log("[Mirror] Received WebRTC offer");
            await pc.setRemoteDescription(
              new RTCSessionDescription({ type: "offer", sdp: signal.sdp }),
            );
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "WEBRTC_SIGNAL",
                  payload: {
                    device_id: deviceId,
                    signal: {
                      type: "answer",
                      sdp: answer.sdp,
                    },
                  },
                }),
              );
            }
          } else if (signal.type === "answer") {
            console.log("[Mirror] Received WebRTC answer");
            await pc.setRemoteDescription(
              new RTCSessionDescription({ type: "answer", sdp: signal.sdp }),
            );
          } else if (signal.type === "ice_candidate") {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        } else if (
          msg.type === "ERROR" &&
          msg.payload.error === "MEDIA_PROJECTION_REVOKED"
        ) {
          console.warn("[Mirror] Device projection revoked");
          stopMirror();
          alert("Screen mirror permission was revoked on the device.");
        } else if (msg.type === "STOP_MIRROR") {
          stopMirror();
        }
      } catch (err) {
        // Ignore non-JSON
      }
    };

    ws.onclose = () => {
      console.log("[Mirror] WS disconnected");
      setConnected(false);
      setStreaming(false);
      pcRef.current?.close();
    };
  }, [deviceId, stopMirror]);

  // Auto-start on mount, cleanup on unmount
  useEffect(() => {
    if (isOnline) {
      startMirror();
    }
    return () => stopMirror();
  }, [isOnline, startMirror, stopMirror]);

  // ── Touch handling ───────────────────────────

  const getNormalizedCoords = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = videoRef.current;
    if (!video) return null;

    const rect = video.getBoundingClientRect();

    // Natural dimensions of the video stream
    const naturalW = video.videoWidth;
    const naturalH = video.videoHeight;

    if (!naturalW || !naturalH) return null;

    // Calculate rendered dimensions inside object-fit: contain
    const imgRatio = naturalW / naturalH;
    const containerRatio = rect.width / rect.height;

    let renderedW, renderedH, offsetX, offsetY;

    if (containerRatio > imgRatio) {
      // Pillarboxing (bars on left/right)
      renderedH = rect.height;
      renderedW = rect.height * imgRatio;
      offsetX = (rect.width - renderedW) / 2;
      offsetY = 0;
    } else {
      // Letterboxing (bars on top/bottom)
      renderedW = rect.width;
      renderedH = rect.width / imgRatio;
      offsetX = 0;
      offsetY = (rect.height - renderedH) / 2;
    }

    // Coordinates relative to the actual rendered video
    const x = (e.clientX - rect.left - offsetX) / renderedW;
    const y = (e.clientY - rect.top - offsetY) / renderedH;

    // Prevent clicks outside the rendered video
    if (x < 0 || x > 1 || y < 0 || y > 1) {
      return null;
    }

    return { x, y };
  };

  const sendTouchEvent = (payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "TOUCH_EVENT",
          payload: {
            device_id: deviceId,
            touch: payload,
          },
          timestamp: new Date().toISOString(),
        }),
      );
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLVideoElement>) => {
    const coords = getNormalizedCoords(e);
    if (!coords) return;

    isDraggingRef.current = false;
    dragStartRef.current = coords;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (dragStartRef.current) {
      isDraggingRef.current = true;
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLVideoElement>) => {
    const coords = getNormalizedCoords(e);
    if (!coords) return;

    if (isDraggingRef.current && dragStartRef.current) {
      // Swipe
      const dx = Math.abs(coords.x - dragStartRef.current.x);
      const dy = Math.abs(coords.y - dragStartRef.current.y);

      if (dx > 0.02 || dy > 0.02) {
        sendTouchEvent({
          action: "swipe",
          x: dragStartRef.current.x,
          y: dragStartRef.current.y,
          end_x: coords.x,
          end_y: coords.y,
          duration: 300,
        });
      }
    } else {
      // Tap
      sendTouchEvent({
        action: "tap",
        x: coords.x,
        y: coords.y,
      });

      // Visual feedback
      const video = videoRef.current;
      if (video) {
        const rect = video.getBoundingClientRect();
        setTouchFeedback({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        setTimeout(() => setTouchFeedback(null), 300);
      }
    }

    dragStartRef.current = null;
    isDraggingRef.current = false;
  };

  const getNormalizedCoordsFromTouch = (
    e: React.TouchEvent<HTMLVideoElement>,
    touchIndex = 0,
  ) => {
    const video = videoRef.current;
    if (!video) return null;

    const touch = e.touches[touchIndex] || e.changedTouches[touchIndex];
    if (!touch) return null;

    const rect = video.getBoundingClientRect();
    const naturalW = video.videoWidth;
    const naturalH = video.videoHeight;

    if (!naturalW || !naturalH) return null;

    const imgRatio = naturalW / naturalH;
    const containerRatio = rect.width / rect.height;

    let renderedW, renderedH, offsetX, offsetY;

    if (containerRatio > imgRatio) {
      renderedH = rect.height;
      renderedW = rect.height * imgRatio;
      offsetX = (rect.width - renderedW) / 2;
      offsetY = 0;
    } else {
      renderedW = rect.width;
      renderedH = rect.width / imgRatio;
      offsetX = 0;
      offsetY = (rect.height - renderedH) / 2;
    }

    const x = (touch.clientX - rect.left - offsetX) / renderedW;
    const y = (touch.clientY - rect.top - offsetY) / renderedH;

    if (x < 0 || x > 1 || y < 0 || y > 1) {
      return null;
    }

    return { x, y };
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLVideoElement>) => {
    e.preventDefault();
    const coords = getNormalizedCoordsFromTouch(e);
    if (!coords) return;

    isDraggingRef.current = false;
    dragStartRef.current = coords;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLVideoElement>) => {
    e.preventDefault();
    if (dragStartRef.current) {
      isDraggingRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLVideoElement>) => {
    e.preventDefault();
    const coords = getNormalizedCoordsFromTouch(e);
    if (!coords) return;

    if (isDraggingRef.current && dragStartRef.current) {
      const dx = Math.abs(coords.x - dragStartRef.current.x);
      const dy = Math.abs(coords.y - dragStartRef.current.y);

      if (dx > 0.02 || dy > 0.02) {
        sendTouchEvent({
          action: "swipe",
          x: dragStartRef.current.x,
          y: dragStartRef.current.y,
          end_x: coords.x,
          end_y: coords.y,
          duration: 300,
        });
      }
    } else {
      sendTouchEvent({
        action: "tap",
        x: coords.x,
        y: coords.y,
      });

      const video = videoRef.current;
      if (video) {
        const rect = video.getBoundingClientRect();
        const touch = e.changedTouches[0];
        if (touch) {
          setTouchFeedback({
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
          });
          setTimeout(() => setTouchFeedback(null), 300);
        }
      }
    }

    dragStartRef.current = null;
    isDraggingRef.current = false;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        ref={containerRef}
        className="flex flex-col w-full max-h-[95vh] bg-background rounded-xl border border-border/30 overflow-hidden shadow-2xl"
        style={{
          maxWidth: videoAspect
            ? videoAspect < 1
              ? `min(${Math.round(95 * videoAspect)}vh, 480px)` // Portrait: narrow container
              : '1024px' // Landscape: wide container
            : '480px', // Default before video loads
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/30 bg-secondary/10">
          <div className="flex items-center gap-3">
            <Monitor className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Remote Mirror
            </h3>
            <div className="flex items-center gap-2 ml-3">
              {connected ? (
                <div className="flex items-center gap-1.5 text-emerald-500">
                  <Wifi className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase">Live</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-500">
                  <WifiOff className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase">
                    Offline
                  </span>
                </div>
              )}
              {streaming && (
                <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  WebRTC
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-md hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => {
                stopMirror();
                onClose();
              }}
              className="p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stream viewport */}
        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden min-h-[300px]">
          {!streaming && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-4 bg-black/80">
              <Loader2 className="w-8 h-8 animate-spin text-primary/60 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {connected
                  ? "Negotiating WebRTC PeerConnection..."
                  : "Connecting..."}
              </p>
            </div>
          )}

          <div className="relative inline-block w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-h-[calc(95vh-120px)] max-w-full object-contain cursor-crosshair select-none"
              style={{ touchAction: "none" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onContextMenu={(e) => {
                // Right-click = long press
                e.preventDefault();
                const coords = getNormalizedCoords(e);
                if (coords) {
                  sendTouchEvent({
                    action: "long_press",
                    x: coords.x,
                    y: coords.y,
                    duration: 800,
                  });
                }
              }}
            />
            {/* Touch feedback ripple */}
            {touchFeedback && (
              <div
                className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary/60 animate-ping pointer-events-none"
                style={{ left: touchFeedback.x, top: touchFeedback.y }}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-border/30 bg-secondary/5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <MousePointer className="w-3 h-3" />
              <span>Click = Tap · Drag = Swipe · Right-click = Long Press</span>
            </div>
          </div>
          <button
            onClick={() => {
              stopMirror();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-secondary/60 text-foreground text-xs font-bold hover:bg-secondary transition-all"
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
}
