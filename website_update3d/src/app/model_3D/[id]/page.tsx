/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import MichelleView from "@/components/model3D/model3D";
import { io, Socket } from "socket.io-client";
import { useParams } from "next/navigation";
import { getModel3D } from "@/services/save_model_3D/model3D";

export default function Home() {
  const params = useParams();
  const modelId = (params as { id?: string })?.id || "";
  // Camera position and angle
  const [pos, setPos] = useState({ x: 10.5, y: 1.6, z: 3.2, angle: 0 });
  const [autoRotate, setAutoRotate] = useState(false);
  const [modelUrl, setModelUrl] = useState<string>("/3D/Michelle.glb");
  const [selectedAnimation, setSelectedAnimation] = useState<
    string | undefined
  >(undefined);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const socketRef = useRef<Socket | null>(null);
  // Angular velocities for orbit (rad/sec)
  const angVelRef = useRef({ omegaAz: 0, omegaEl: 0, angle: 0 });
  const lastTimeRef = useRef<number | null>(null);
  // Orbit state
  const azimuthRef = useRef(0); // around Y axis (radians)
  const elevationRef = useRef(0.2); // up/down (radians)
  const radiusRef = useRef(10); // camera distance (zoom)
  const needsUpdateRef = useRef(false); // force recompute (e.g., zoom change)
  const lastInteractionRef = useRef<number>(performance.now());

  // Handle control data from both BroadcastChannel and Socket.io
  const handleControlData = useCallback(
    (type: string, payload: any) => {
      // Map joystick X/Y to angular velocities; ignore Z for distance
      const azSpeed = Math.PI; // rad/sec around model
      const elSpeed = Math.PI / 2; // rad/sec up-down
      if (type === "joystick:move" && payload) {
        lastInteractionRef.current = performance.now();
        if (autoRotate) setAutoRotate(false);
        angVelRef.current = {
          omegaAz: payload.x * azSpeed,
          omegaEl: -payload.y * elSpeed, // invert so up on joystick raises camera
          angle: payload.angle,
        };
      }
      if (type === "joystick:end") {
        // Stop orbiting but keep current spherical coords
        lastInteractionRef.current = performance.now();
        if (autoRotate) setAutoRotate(false);
        angVelRef.current = {
          omegaAz: 0,
          omegaEl: 0,
          angle: angVelRef.current.angle,
        };
      }
      if (type === "zoom:set" && payload?.value != null) {
        radiusRef.current = Math.max(2, Math.min(200, Number(payload.value)));
        needsUpdateRef.current = true; // apply zoom immediately
        lastInteractionRef.current = performance.now();
        if (autoRotate) setAutoRotate(false);
      }
      if (type === "animation:select" && payload?.name) {
        setSelectedAnimation(String(payload.name));
      }
    },
    [autoRotate]
  );

  useEffect(() => {
    const toAbsoluteUrl = (u: string) => {
      if (!u) return "/3D/Michelle.glb";
      if (/^https?:\/\//i.test(u)) return u;
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(
        /\/$/,
        ""
      );
      if (apiBase) return `${apiBase}/files/${u.replace(/^\//, "")}`;
      return `/3D/${u.replace(/^\//, "")}`;
    };
    const loadModel = async () => {
      try {
        if (!modelId) return;
        const data = await getModel3D(modelId);
        setModelUrl(toAbsoluteUrl(data?.fileUrl));
      } catch {
        // ignore; fallback URL remains
      }
    };
    loadModel();
  }, [modelId]);

  useEffect(() => {
    // Setup BroadcastChannel for same-browser communication
    const channel = new BroadcastChannel("hololab-control");
    channelRef.current = channel;
    channel.onmessage = (event) => {
      const { type, payload } = event.data || {};
      handleControlData(type, payload);
    };

    // Setup Socket.io for cross-device communication
    const socketBase =
      process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:1909";
    const socket = io(socketBase);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to socket server");
      socket.emit("register", "viewer");
    });

    socket.on("joystick:move", (data) => {
      handleControlData("joystick:move", data);
    });

    socket.on("joystick:end", (data) => {
      handleControlData("joystick:end", data);
    });

    socket.on("zoom:set", (data) => {
      handleControlData("zoom:set", data);
    });

    socket.on("animation:select", (data) => {
      handleControlData("animation:select", data);
    });

    return () => {
      channel.close();
      channelRef.current = null;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [handleControlData]);

  // Integrate velocity over time to update position continuously
  useEffect(() => {
    let rafId: number;
    const tick = (t: number) => {
      const last = lastTimeRef.current;
      lastTimeRef.current = t;
      if (last != null) {
        const dt = Math.min((t - last) / 1000, 0.05);
        const { omegaAz, omegaEl, angle } = angVelRef.current;
        if (
          omegaAz !== 0 ||
          omegaEl !== 0 ||
          angle !== pos.angle ||
          needsUpdateRef.current
        ) {
          azimuthRef.current += omegaAz * dt;
          elevationRef.current = Math.max(
            0.05,
            Math.min(Math.PI - 0.05, elevationRef.current + omegaEl * dt)
          );
          const r = radiusRef.current;
          const el = elevationRef.current;
          const az = azimuthRef.current;
          const rHoriz = r * Math.sin(el);
          const x = rHoriz * Math.cos(az);
          const z = rHoriz * Math.sin(az);
          const y = r * Math.cos(el);
          setPos({ x, y, z, angle });
          needsUpdateRef.current = false;
        }
        // Idle detection: enable auto-rotate after 5s of no joystick events
        if (
          !autoRotate &&
          performance.now() - lastInteractionRef.current >= 5000
        ) {
          setAutoRotate(true);
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [pos.angle, autoRotate]);

  return (
    <div>
      <MichelleView
        x={pos.x}
        y={pos.y}
        z={pos.z}
        angle={pos.angle}
        autoRotate={autoRotate}
        autoRotateSpeed={2.0}
        URL={modelUrl}
        animationName={selectedAnimation}
        onAnimationsReady={(names) => {
          // Broadcast to controller UIs
          channelRef.current?.postMessage({
            type: "animations:list",
            payload: { names },
          });
          socketRef.current?.emit("animations:list", { names });
          // If no selection yet, pick the first
          if (!selectedAnimation && names?.length) {
            setSelectedAnimation(names[0]);
          }
        }}
      />
    </div>
  );
}
