"use client";

import Link from "next/link";
import { useState } from "react";
import type { ClassSection } from "@/lib/types";
import { formatClassMeetingLine } from "@/lib/datetimeDisplay";
import { ClassForm } from "./ClassForm";

export function ClassList({ classes }: { classes: ClassSection[] }) {
  const [editing, setEditing] = useState<ClassSection | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          setAdding(true);
          setEditing(null);
        }}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Add class
      </button>

      {(adding || editing) && (
        <ClassForm
          item={editing ?? undefined}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={() => window.location.reload()}
        />
      )}

      <ul className="space-y-2">
        {classes.map((c) => (
          <li key={c.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/classes/${c.id}`} className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100">
                  {c.class_code} — {c.class_name}
                </Link>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {(c.class_meetings ?? [])
                    .map((m) => formatClassMeetingLine(m.day_of_week, m.start_time, m.end_time))
                    .join(" · ") || "No meeting slots"}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setEditing(c); setAdding(false); }} className="text-sm text-zinc-600 dark:text-zinc-400">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm("Delete this class?")) return;
                    await fetch(`/api/classes/${c.id}`, { method: "DELETE" });
                    window.location.reload();
                  }}
                  className="text-sm text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
