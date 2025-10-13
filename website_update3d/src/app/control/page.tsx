"use client";

import { FloatingJoystick } from "@/components/control/FloatingJoystick";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export default function ControlMichelle() {
  const [position, setPosition] = useState({
    x: 0,
    y: 0,
    z: 0,
    angle: 0,
    distance: 0,
  });
  const [isMoving, setIsMoving] = useState(false);
  const [zoom, setZoom] = useState(10); // orbit radius on viewer
  const [animations, setAnimations] = useState<string[]>([]);
  const [selectedAnim, setSelectedAnim] = useState<string>("");

  // BroadcastChannel to send joystick positions to the home page
  const channelRef = useRef<BroadcastChannel | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Setup BroadcastChannel for same-browser communication
    const channel = new BroadcastChannel("hololab-control");
    channelRef.current = channel;

    // Setup Socket.io for cross-device communication
    const socketBase =
      process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:1909";
    const socket = io(socketBase);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Control connected to socket server");
      socket.emit("register", "controller");
    });

    // Listen for animation list from viewer
    channel.onmessage = (event) => {
      const { type, payload } = event.data || {};
      if (type === "animations:list" && payload?.names) {
        setAnimations(payload.names as string[]);
        if (!selectedAnim && payload.names.length) {
          setSelectedAnim(payload.names[0]);
        }
      }
    };

    socket.on("animations:list", (data) => {
      if (data?.names) {
        setAnimations(data.names as string[]);
        if (!selectedAnim && data.names.length) {
          setSelectedAnim(data.names[0]);
        }
      }
    });

    return () => {
      channel.close();
      channelRef.current = null;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedAnim]);

  const [characterPosition, setCharacterPosition] = useState({
    near: { x: 0, y: 0, z: 0 },
    far: { x: 0, y: 0, z: 0 },
  });

  // Helper function to send zoom data via both channels
  const sendZoomData = (value: number) => {
    const zoomData = { value };
    // Send via BroadcastChannel
    channelRef.current?.postMessage({
      type: "zoom:set",
      payload: zoomData,
    });
    // Send via Socket.io
    socketRef.current?.emit("zoom:set", zoomData);
  };

  const handleJoystickMove = (pos: {
    x: number;
    y: number;
    z: number;
    angle: number;
    distance: number;
  }) => {
    setPosition(pos);
    setIsMoving(true);

    // Publish to other tabs/pages via BroadcastChannel
    channelRef.current?.postMessage({ type: "joystick:move", payload: pos });

    // Publish to other devices via Socket.io
    socketRef.current?.emit("joystick:move", pos);

    // Calculate near position (closer to camera)
    const near = {
      x: pos.x * 5, // Scale for visibility
      y: pos.y * 5,
      z: pos.z * 2,
    };

    // Calculate far position (further from camera)
    const far = {
      x: pos.x * 10,
      y: pos.y * 10,
      z: pos.z * 5,
    };

    setCharacterPosition({ near, far });
  };

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Demo area */}
        <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
            {/* Joystick */}
            <div className="flex items-center justify-center">
              <FloatingJoystick
                onMove={handleJoystickMove}
                onEnd={() => {
                  setIsMoving(false);
                  setPosition({ x: 0, y: 0, z: 0, angle: 0, distance: 0 });
                  setCharacterPosition({
                    near: { x: 0, y: 0, z: 0 },
                    far: { x: 0, y: 0, z: 0 },
                  });
                  const endData = { x: 0, y: 0, z: 0, angle: 0, distance: 0 };
                  // Send via BroadcastChannel
                  channelRef.current?.postMessage({
                    type: "joystick:end",
                    payload: endData,
                  });
                  // Send via Socket.io
                  socketRef.current?.emit("joystick:end", endData);
                }}
              />
            </div>

            {/* Zoom control */}
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm font-medium text-muted-foreground">
                Zoom
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground border border-border"
                  onClick={() => {
                    const next = Math.max(2, zoom - 1);
                    setZoom(next);
                    sendZoomData(next);
                  }}
                >
                  -
                </button>
                <input
                  type="range"
                  min={2}
                  max={50}
                  step={1}
                  value={zoom}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setZoom(next);
                    sendZoomData(next);
                  }}
                />
                <button
                  className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground border border-border"
                  onClick={() => {
                    const next = Math.min(50, zoom + 1);
                    setZoom(next);
                    sendZoomData(next);
                  }}
                >
                  +
                </button>
              </div>
              <div className="text-xs text-muted-foreground">
                Radius: {zoom.toFixed(0)}
              </div>
            </div>

            {/* Animation selector */}
            <div className="flex flex-col items-center gap-2 min-w-[200px]">
              <div className="text-sm font-medium text-muted-foreground">
                Animation
              </div>
              <select
                className="w-full px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground border border-border"
                value={selectedAnim}
                onChange={(e) => {
                  const name = e.target.value;
                  setSelectedAnim(name);
                  const payload = { name };
                  channelRef.current?.postMessage({
                    type: "animation:select",
                    payload,
                  });
                  socketRef.current?.emit("animation:select", payload);
                }}
              >
                {animations.length === 0 ? (
                  <option value="" disabled>
                    No animations
                  </option>
                ) : (
                  animations.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Position display */}
            <div className="flex-1 space-y-4 min-w-[280px]">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    X Position
                  </span>
                  <span className="text-sm font-mono text-foreground">
                    {position.x.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-75"
                    style={{
                      width: `${Math.abs(position.x) * 100}%`,
                      marginLeft: position.x < 0 ? "auto" : "0",
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Y Position
                  </span>
                  <span className="text-sm font-mono text-foreground">
                    {position.y.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-75"
                    style={{
                      width: `${Math.abs(position.y) * 100}%`,
                      marginLeft: position.y < 0 ? "auto" : "0",
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Z Position (Depth)
                  </span>
                  <span className="text-sm font-mono text-foreground">
                    {position.z.toFixed(2)}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-chart-2 transition-all duration-75"
                    style={{ width: `${position.z * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Distance
                  </span>
                  <span className="text-sm font-mono text-foreground">
                    {(position.distance * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-chart-3 transition-all duration-75"
                    style={{ width: `${position.distance * 100}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Angle
                </span>
                <span className="text-sm font-mono text-foreground">
                  {position.angle.toFixed(0)}°
                </span>
              </div>

              <div className="pt-2">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isMoving
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isMoving
                        ? "bg-primary-foreground animate-pulse"
                        : "bg-muted-foreground"
                    }`}
                  />
                  {isMoving ? "Active" : "Idle"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
