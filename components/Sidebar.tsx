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
  }, [pathname]);

  const classesActive = pathname === "/classes" || pathname.startsWith("/classes/");

  const baseLinkCls =
    "sidebar-link block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";

  return (
    <>
      {!collapsed && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          onClick={onToggle}
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
        />
      )}
      <aside
        className={`sidebar fixed left-0 top-0 z-30 flex h-full w-64 max-w-[85vw] flex-col border-r border-zinc-200 bg-white transition-transform duration-200 dark:border-zinc-800 dark:bg-zinc-900 ${
          collapsed ? "-translate-x-full" : "translate-x-0"
        }`}
        aria-hidden={collapsed}
      >
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      <div className="flex h-14 shrink-0 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
        <Link
          href="/dashboard"
          className="font-semibold text-zinc-900 transition-opacity hover:opacity-80 dark:text-zinc-100"
        >
          AISmartCalendar
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <Link
          href="/calendar"
          className={`${baseLinkCls} ${
            pathname === "/calendar"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          }`}
        >
          Calendar
        </Link>

        <Link
          href="/dashboard"
          className={`${baseLinkCls} ${
            pathname === "/dashboard"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          }`}
        >
          AI Calendar
        </Link>

        <div>
          <div className="flex items-center gap-1">
            <Link
              href="/classes"
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                classesActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
            >
              Classes
            </Link>
            <button
              type="button"
              onClick={() => setClassesOpen((v) => !v)}
              className="rounded px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
                      ? "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {c.class_code}: {c.class_name}
                </Link>
              ))}
              {classes.length === 0 && (
                <p className="px-2 py-1 text-xs text-zinc-400">No classes yet</p>
              )}
            </div>
          )}
        </div>

        <Link
          href="/habits"
          className={`${baseLinkCls} ${
            pathname === "/habits"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          }`}
        >
          Habits
        </Link>

        <Link
          href="/assignments"
          className={`${baseLinkCls} ${
            pathname === "/assignments"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          }`}
        >
          To-do List
        </Link>

        <Link
          href="/preferences"
          className={`${baseLinkCls} ${
            pathname === "/preferences"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          }`}
        >
          Preferences
        </Link>
      </nav>

      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <Link
          href="/privacy"
          className="block rounded-lg px-3 py-2 text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          Privacy
        </Link>
      </div>
      </aside>
      {collapsed && (
        <button
          type="button"
          onClick={onToggle}
          className="fixed left-2 top-2 z-30 inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
