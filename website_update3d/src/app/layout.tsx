"use client";
import type React from "react";
import "./globals.css";
import Sidebar from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
// import { Toaster } from "@/components/ui/toaster";
import { Suspense } from "react";
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <div className="flex min-h-screen bg-background">
          {pathname !== "/control" && <Sidebar />}
          <div
            className={`flex-1 ${pathname === "/control" ? "pl-0" : "pl-64"}`}
          >
            <Suspense fallback={<div>Loading...</div>}>
              {pathname !== "/control" && <Header />}
              <main className="pt-16">{children}</main>
            </Suspense>
          </div>
        </div>
        {/* <Toaster /> */}
        {/* <Analytics /> */}
      </body>
    </html>
  );
}
