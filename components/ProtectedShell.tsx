"use client";

import { useEffect, useRef, useState } from "react";
import { AutoTimezoneBootstrap } from "@/components/AutoTimezoneBootstrap";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { ConfirmDialogProvider } from "@/components/ConfirmDialogProvider";
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
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    queueMicrotask(() => setSidebarCollapsed(true));
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) return;

    function onDocMouseDown(e: MouseEvent) {
      const el = profileMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setProfileMenuOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [profileMenuOpen]);

  return (
    <ConfirmDialogProvider>
    <div className="min-h-screen bg-palette-cream text-palette-navy">
      <AutoTimezoneBootstrap />
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((v) => !v)} />
      <div className={`transition-[padding] duration-200 ${sidebarCollapsed ? "pl-0" : "lg:pl-64"}`}>
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-palette-card-border bg-palette-card-bg/95 px-4 shadow-[0_1px_0_rgba(27,42,74,0.06)] backdrop-blur-sm sm:px-6 dark:shadow-[0_1px_0_rgba(0,0,0,0.35)]">
          <div />
          <div className="flex items-center gap-4">
            {email && (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  className="inline-flex max-w-[12rem] items-center gap-2 truncate text-left text-sm text-palette-navy/90 transition-colors hover:text-palette-navy font-medium"
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                  aria-label="User menu"
                  title="User menu"
                >
                  <span className="truncate">{email}</span>
                  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {profileMenuOpen && (
                  <div
                    role="menu"
                    aria-label="User menu"
                    className="absolute right-0 mt-2 w-44 overflow-hidden rounded-card border-[0.5px] border-palette-card-border bg-palette-card-bg shadow-sm"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setChangePasswordOpen(true);
                      }}
                      className="block w-full px-3 py-2 text-left text-sm text-palette-slate hover:bg-palette-hover"
                    >
                      Change password
                    </button>
                  </div>
                )}
              </div>
            )}
            <SignOutButton />
          </div>
        </header>
        <main className="animate-in mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </div>
    </ConfirmDialogProvider>
  );
}
