"use client";

import { useEffect, useRef, useState } from "react";

interface JoystickPosition {
  x: number;
  y: number;
  z: number;
  angle: number;
  distance: number;
}

interface FloatingJoystickProps {
  onMove?: (position: JoystickPosition) => void;
  onEnd?: () => void;
  size?: number;
  maxDistance?: number;
  className?: string;
}

export function FloatingJoystick({
  onMove,
  onEnd,
  size = 140,
  maxDistance = 50,
  className = "",
}: FloatingJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setIsActive(true);
    handleMove(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const angle = Math.atan2(deltaY, deltaX);

    if (distance > maxDistance) {
      deltaX = Math.cos(angle) * maxDistance;
      deltaY = Math.sin(angle) * maxDistance;
    }

    setPosition({ x: deltaX, y: deltaY });

    if (onMove) {
      onMove({
        x: deltaX / maxDistance,
        y: deltaY / maxDistance,
        z: distance / maxDistance, // Z represents depth/forward movement
        angle: (angle * 180) / Math.PI,
        distance: Math.min(distance / maxDistance, 1),
      });
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
    setIsActive(false);
    setPosition({ x: 0, y: 0 });
    if (onEnd) onEnd();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleMove(e.clientX, e.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) handleEnd();
    };

    const handleTouchEnd = () => {
      if (isDragging) handleEnd();
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className={`relative select-none touch-none ${className}`}
      style={{ width: size, height: size }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onTouchStart={(e) => {
        if (e.touches[0]) {
          handleStart(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
    >
      {/* Outer ring */}
      <div
        className={`absolute inset-0 rounded-full bg-secondary/40 backdrop-blur-sm border-2 transition-all duration-200 ${
          isActive
            ? "border-primary shadow-lg shadow-primary/20 scale-105"
            : "border-border"
        }`}
      >
        {/* Direction indicators */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute top-2 w-1 h-3 bg-muted-foreground/30 rounded-full" />
          <div className="absolute bottom-2 w-1 h-3 bg-muted-foreground/30 rounded-full" />
          <div className="absolute left-2 h-1 w-3 bg-muted-foreground/30 rounded-full" />
          <div className="absolute right-2 h-1 w-3 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
        </div>
      </div>

      {/* Joystick handle */}
      <div
        className={`absolute w-16 h-16 rounded-full bg-primary shadow-lg transition-all duration-75 cursor-grab active:cursor-grabbing ${
          isActive ? "scale-110" : "scale-100"
        }`}
        style={{
          left: "50%",
          top: "50%",
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${
            position.y
          }px)) scale(${isActive ? 1.1 : 1})`,
        }}
      >
        {/* Inner gradient effect */}
        <div className="absolute inset-2 rounded-full bg-primary-foreground/20" />

        {/* Center highlight */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-primary-foreground/30 backdrop-blur-sm" />
        </div>

        {/* Active pulse effect */}
        {isActive && (
          <div className="absolute inset-0 rounded-full bg-accent/30 animate-ping" />
        )}
      </div>
    </div>
  );
}
