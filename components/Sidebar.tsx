"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type ClassItem = { id: string; class_code: string; class_name: string };

export function Sidebar() {
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
    <aside className="sidebar fixed left-0 top-0 z-20 flex h-full w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
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
          href="/dashboard"
          className={`${baseLinkCls} ${
            pathname === "/dashboard"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          }`}
        >
          AI Calendar
        </Link>

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
  );
}
