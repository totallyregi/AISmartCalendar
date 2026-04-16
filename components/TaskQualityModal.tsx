"use client";

import { useState } from "react";

export function TaskQualityModal({
  open,
  assignmentName,
  loading,
  onClose,
  onSubmit,
}: {
  open: boolean;
  assignmentName: string;
  loading: boolean;
  onClose: () => void;
  onSubmit: (quality: number) => void;
}) {
  const [quality, setQuality] = useState(3);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 dark:bg-black/55"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-quality-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border-[0.5px] border-palette-card-border bg-palette-card-bg p-5 shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="task-quality-title" className="text-base font-semibold text-palette-navy">
          Rate task quality
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-palette-slate">
          You marked <span className="font-medium text-palette-navy">{assignmentName}</span> as completed. How was the quality?
        </p>

        <div className="mt-4">
          <label className="block text-sm font-medium text-palette-navy">Quality (1 = low, 5 = high)</label>
          <select
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            disabled={loading}
            className="mt-1 w-full rounded-lg border border-palette-card-border bg-palette-card-bg px-3 py-2 text-palette-navy"
          >
            {[1, 2, 3, 4, 5].map((rating) => (
              <option key={rating} value={rating}>
                {rating}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border-[0.5px] border-palette-card-border bg-palette-card-bg px-4 py-2 text-sm font-medium text-palette-navy transition-colors hover:bg-palette-hover disabled:opacity-60"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-palette-navy px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:brightness-110 disabled:opacity-60"
            onClick={() => onSubmit(quality)}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save and mark done"}
          </button>
        </div>
      </div>
    </div>
  );
}
