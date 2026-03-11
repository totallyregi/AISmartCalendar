"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/today", label: "Today" },
  { href: "/classes", label: "Classes" },
  { href: "/assignments", label: "Assignments" },
  { href: "/habits", label: "Habits" },
  { href: "/check-in", label: "Check-in" },
  { href: "/reflection", label: "Reflection" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-4">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`text-sm font-medium ${
            pathname === href
              ? "text-zinc-900 dark:text-zinc-100"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
