"use client";

import { useConfirm } from "@/components/ConfirmDialogProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ClassSection } from "@/lib/types";
import { ClassForm } from "./ClassForm";
import { ScheduleSlotList } from "./ScheduleSlotList";

export function ClassList({ classes }: { classes: ClassSection[] }) {
  const router = useRouter();
  const confirm = useConfirm();
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
        className="rounded-lg bg-palette-sky px-4 py-2 text-sm font-medium text-palette-ink"
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
          onSaved={() => router.refresh()}
        />
      )}

      <ul className="space-y-2">
        {classes.map((c) => (
          <li key={c.id} className="ds-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/classes/${c.id}`} className="font-medium text-palette-navy underline-offset-2 hover:underline">
                  {c.class_code} — {c.class_name}
                </Link>
                <ScheduleSlotList slots={c.class_meetings} emptyLabel="No meeting slots" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setEditing(c); setAdding(false); }} className="text-sm text-palette-slate hover:text-palette-navy">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Delete class?",
                      message: "Delete this class and its meetings? Assignments under this class will be removed.",
                      confirmLabel: "Delete",
                      tone: "danger",
                    });
                    if (!ok) return;
                    const delRes = await fetch(`/api/classes/${c.id}`, { method: "DELETE" });
                    if (delRes.ok) router.refresh();
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
