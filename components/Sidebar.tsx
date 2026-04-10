"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type ClassItem = { id: string; class_code: string; class_name: string };

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const [classesOpen, setClassesOpen] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));
  }, []);

  const classesActive = pathname === "/classes" || pathname.startsWith("/classes/");

  const baseLinkCls =
    "sidebar-link block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";

  const navInactive = "text-white/85 hover:bg-white/10 hover:text-white";
  const navActive = "bg-palette-sky text-palette-ink shadow-sm";

  return (
    <>
      {!collapsed && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={onToggle}
          className="fixed inset-0 z-20 bg-black/45 lg:hidden"
        />
      )}
      <aside
        className={`sidebar pointer-events-auto fixed left-0 top-0 z-30 flex h-full w-64 max-w-[85vw] flex-col border-r border-white/10 bg-sidebar-bg shadow-sm transition-transform duration-200 ${
          collapsed ? "-translate-x-full" : "translate-x-0"
        }`}
        aria-hidden={collapsed}
      >
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/20 text-white hover:bg-white/10"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex h-14 shrink-0 items-center border-b border-white/10 px-4">
          <Link href="/dashboard" className="font-medium text-white transition-opacity hover:opacity-90">
            Rhythm
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <Link href="/calendar" className={`${baseLinkCls} ${pathname === "/calendar" ? navActive : navInactive}`}>
            Calendar
          </Link>

          <Link href="/dashboard" className={`${baseLinkCls} ${pathname === "/dashboard" ? navActive : navInactive}`}>
            AI Calendar
          </Link>

          <div>
            <div className="flex items-center gap-1">
              <Link
                href="/classes"
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  classesActive ? navActive : navInactive
                }`}
              >
                Classes
              </Link>
              <button
                type="button"
                onClick={() => setClassesOpen((v) => !v)}
                className="rounded px-2 py-1 text-sm text-white/80 hover:bg-white/10"
                aria-label="Toggle class sub tabs"
              >
                {classesOpen ? "−" : "+"}
              </button>
            </div>

            {classesOpen && (
              <div className="mt-1 space-y-1 pl-2">
                {classes.map((c) => (
                  <Link
                    key={c.id}
                    href={`/classes/${c.id}`}
                    className={`block rounded px-2 py-1.5 text-xs transition-colors ${
                      pathname === `/classes/${c.id}`
                        ? "bg-palette-sky font-medium text-palette-ink"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {c.class_code}: {c.class_name}
                  </Link>
                ))}
                {classes.length === 0 && <p className="px-2 py-1 text-xs text-white/50">No classes yet</p>}
              </div>
            )}
          </div>

          <Link href="/habits" className={`${baseLinkCls} ${pathname === "/habits" ? navActive : navInactive}`}>
            Habits
          </Link>

          <Link href="/assignments" className={`${baseLinkCls} ${pathname === "/assignments" ? navActive : navInactive}`}>
            To-do List
          </Link>

          <Link href="/preferences" className={`${baseLinkCls} ${pathname === "/preferences" ? navActive : navInactive}`}>
            Preferences
          </Link>
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link href="/help" className={`${baseLinkCls} ${pathname === "/help" ? navActive : `${navInactive} text-white/75`}`}>
            Help
          </Link>
        </div>
      </aside>
      {collapsed && (
        <button
          type="button"
          onClick={onToggle}
          className="fixed left-2 top-2 z-30 inline-flex h-8 w-8 items-center justify-center rounded-card border-[0.5px] border-palette-card-border bg-palette-card-bg text-palette-navy shadow-sm hover:bg-palette-hover"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </>
  );
}
