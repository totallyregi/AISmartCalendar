"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { SignOutButton } from "@/components/SignOutButton";

export function ProtectedShell({
  email,
  children,
}: {
  email?: string;
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
      <div className={`transition-[padding] duration-200 ${sidebarCollapsed ? "pl-0" : "pl-64"}`}>
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80 sm:px-6">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{email}</span>
            <SignOutButton />
          </div>
        </header>
        <main className="animate-in mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
