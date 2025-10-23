"use client";

import React from "react";
import {
  Cable as Cube,
  Upload,
  LayoutDashboard,
  Settings,
  VideoIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import Link from "next/link";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Upload", href: "/upload", icon: Upload },
  { name: "MediaPipe", href: "/MediaPipe", icon: VideoIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div>
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-sidebar transition-transform">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary">
              <Cube className="size-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-sans text-lg font-semibold text-sidebar-foreground">
                3D Manager
              </h1>
              <p className="text-xs text-muted-foreground">Model Hub</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="size-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4">
            <button className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
              <Settings className="size-5" />
              Settings
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
