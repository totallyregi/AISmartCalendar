/** Inline SVG illustrations for the Help page (no external assets). */

export function SidebarIllustration() {
  return (
    <figure
      className="mx-auto max-w-md overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50"
      aria-label="Diagram: sidebar navigation layout"
    >
      <svg viewBox="0 0 280 320" className="h-auto w-full text-zinc-800 dark:text-zinc-100" role="img">
        <title>Sidebar with main navigation links</title>
        <rect x="8" y="8" width="264" height="304" rx="12" fill="currentColor" className="text-white dark:text-zinc-900" stroke="currentColor" strokeWidth="1" />
        <text x="24" y="36" className="fill-zinc-900 text-[13px] font-semibold dark:fill-zinc-100" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Rhythm
        </text>
        <rect x="16" y="52" width="248" height="28" rx="6" className="fill-zinc-900 dark:fill-zinc-100" />
        <text x="28" y="70" className="fill-white text-[11px] font-medium dark:fill-zinc-900" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Calendar
        </text>
        <rect x="16" y="88" width="248" height="28" rx="6" className="fill-zinc-100 dark:fill-zinc-800" />
        <text x="28" y="106" className="fill-zinc-800 text-[11px] dark:fill-zinc-200" fontFamily="ui-sans-serif, system-ui, sans-serif">
          AI Calendar
        </text>
        <rect x="16" y="124" width="248" height="28" rx="6" className="fill-zinc-100 dark:fill-zinc-800" />
        <text x="28" y="142" className="fill-zinc-800 text-[11px] dark:fill-zinc-200" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Classes
        </text>
        <rect x="28" y="158" width="224" height="22" rx="4" className="fill-zinc-50 dark:fill-zinc-950" />
        <text x="36" y="173" className="fill-zinc-500 text-[9px] dark:fill-zinc-400" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Your courses…
        </text>
        <rect x="16" y="190" width="248" height="28" rx="6" className="fill-zinc-100 dark:fill-zinc-800" />
        <text x="28" y="208" className="fill-zinc-800 text-[11px] dark:fill-zinc-200" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Habits
        </text>
        <rect x="16" y="226" width="248" height="28" rx="6" className="fill-zinc-100 dark:fill-zinc-800" />
        <text x="28" y="244" className="fill-zinc-800 text-[11px] dark:fill-zinc-200" fontFamily="ui-sans-serif, system-ui, sans-serif">
          To-do List
        </text>
        <rect x="16" y="262" width="248" height="28" rx="6" className="fill-zinc-100 dark:fill-zinc-800" />
        <text x="28" y="280" className="fill-zinc-800 text-[11px] dark:fill-zinc-200" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Preferences
        </text>
        <line x1="16" y1="298" x2="264" y2="298" className="stroke-zinc-200 dark:stroke-zinc-700" strokeWidth="1" />
        <text x="24" y="312" className="fill-emerald-600 text-[10px] font-medium dark:fill-emerald-400" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Help
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Use the left sidebar to switch areas. Expand or collapse it with the arrow at the top (especially on mobile).
      </figcaption>
    </figure>
  );
}

export function AiWorkflowIllustration() {
  return (
    <figure
      className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-zinc-100 p-4 dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-950"
      aria-label="Diagram: recommended planning flow"
    >
      <svg viewBox="0 0 520 200" className="h-auto w-full" role="img">
        <title>Planning workflow</title>
        <defs>
          <marker id="arrowHead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" className="fill-zinc-400" />
          </marker>
        </defs>
        <rect x="8" y="24" width="100" height="56" rx="8" className="fill-white stroke-zinc-300 dark:fill-zinc-800 dark:stroke-zinc-600" strokeWidth="1.5" />
        <text x="58" y="50" textAnchor="middle" className="fill-zinc-800 text-[11px] font-semibold dark:fill-zinc-100" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Preferences
        </text>
        <text x="58" y="66" textAnchor="middle" className="fill-zinc-500 text-[9px] dark:fill-zinc-400" fontFamily="ui-sans-serif, system-ui, sans-serif">
          windows & limits
        </text>
        <line x1="108" y1="52" x2="132" y2="52" className="stroke-zinc-400" strokeWidth="2" markerEnd="url(#arrowHead)" />
        <rect x="136" y="24" width="112" height="56" rx="8" className="fill-white stroke-zinc-300 dark:fill-zinc-800 dark:stroke-zinc-600" strokeWidth="1.5" />
        <text x="192" y="48" textAnchor="middle" className="fill-zinc-800 text-[10px] font-semibold dark:fill-zinc-100" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Classes · Habits
        </text>
        <text x="192" y="62" textAnchor="middle" className="fill-zinc-800 text-[10px] font-semibold dark:fill-zinc-100" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Assignments
        </text>
        <text x="192" y="76" textAnchor="middle" className="fill-zinc-500 text-[9px] dark:fill-zinc-400" fontFamily="ui-sans-serif, system-ui, sans-serif">
          your real data
        </text>
        <line x1="248" y1="52" x2="272" y2="52" className="stroke-zinc-400" strokeWidth="2" markerEnd="url(#arrowHead)" />
        <rect x="276" y="16" width="120" height="72" rx="8" className="fill-emerald-100 stroke-emerald-400 dark:fill-emerald-950 dark:stroke-emerald-600" strokeWidth="1.5" />
        <text x="336" y="44" textAnchor="middle" className="fill-emerald-900 text-[11px] font-semibold dark:fill-emerald-100" fontFamily="ui-sans-serif, system-ui, sans-serif">
          AI Calendar
        </text>
        <text x="336" y="62" textAnchor="middle" className="fill-emerald-800 text-[9px] dark:fill-emerald-200" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Generate → review
        </text>
        <text x="336" y="78" textAnchor="middle" className="fill-emerald-700 text-[9px] dark:fill-emerald-300" fontFamily="ui-sans-serif, system-ui, sans-serif">
          drafts (sandbox)
        </text>
        <line x1="396" y1="52" x2="420" y2="52" className="stroke-zinc-400" strokeWidth="2" markerEnd="url(#arrowHead)" />
        <rect x="424" y="24" width="88" height="56" rx="8" className="fill-white stroke-zinc-300 dark:fill-zinc-800 dark:stroke-zinc-600" strokeWidth="1.5" />
        <text x="468" y="50" textAnchor="middle" className="fill-zinc-800 text-[11px] font-semibold dark:fill-zinc-100" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Calendar
        </text>
        <text x="468" y="66" textAnchor="middle" className="fill-zinc-500 text-[9px] dark:fill-zinc-400" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Apply when ready
        </text>
        <text x="260" y="118" textAnchor="middle" className="fill-zinc-500 text-[10px] dark:fill-zinc-400" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Apply suggested blocks only after you are happy with them.
        </text>
      </svg>
      <figcaption className="mt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
        Set up scheduling rules first, keep your data current, then generate in AI Calendar and apply to your main calendar.
      </figcaption>
    </figure>
  );
}

export function CalendarVsAiIllustration() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <figure className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <svg viewBox="0 0 200 128" className="h-auto w-full" role="img" aria-labelledby="cal-title">
          <title id="cal-title">Main calendar — committed schedule</title>
          <text x="100" y="22" textAnchor="middle" className="fill-zinc-900 text-[12px] font-semibold dark:fill-zinc-100" fontFamily="ui-sans-serif, system-ui, sans-serif">
            Calendar
          </text>
          <rect x="16" y="36" width="168" height="80" rx="6" className="fill-zinc-50 stroke-zinc-200 dark:fill-zinc-950 dark:stroke-zinc-700" strokeWidth="1" />
          <rect x="24" y="48" width="52" height="16" rx="3" className="fill-sky-200/90 dark:fill-sky-800/80" />
          <rect x="84" y="48" width="48" height="16" rx="3" className="fill-violet-200/90 dark:fill-violet-800/80" />
          <rect x="24" y="72" width="90" height="16" rx="3" className="fill-amber-200/90 dark:fill-amber-800/80" />
          <text
            x="100"
            y="100"
            textAnchor="middle"
            className="fill-zinc-500 dark:fill-zinc-400"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
            fontSize="8"
          >
            <tspan x="100" dy="0">
              Classes · habits · applied work
            </tspan>
            <tspan x="100" dy="11">
              Personal &amp; imported events
            </tspan>
          </text>
        </svg>
        <figcaption className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
          Your <strong className="font-medium text-zinc-900 dark:text-zinc-100">real</strong> schedule: what you have committed to.
        </figcaption>
      </figure>
      <figure className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
        <svg viewBox="0 0 200 120" className="h-auto w-full" role="img" aria-labelledby="ai-title">
          <title id="ai-title">AI Calendar — draft suggestions</title>
          <text x="100" y="22" textAnchor="middle" className="fill-emerald-900 text-[12px] font-semibold dark:fill-emerald-100" fontFamily="ui-sans-serif, system-ui, sans-serif">
            AI Calendar
          </text>
          <rect x="16" y="36" width="168" height="72" rx="6" className="fill-white stroke-emerald-200 dark:fill-zinc-900 dark:stroke-emerald-800" strokeWidth="1" />
          <rect
            x="24"
            y="52"
            width="70"
            height="18"
            rx="4"
            className="fill-emerald-300/90 stroke-emerald-600 dark:fill-emerald-700/80 dark:stroke-emerald-400"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <text x="59" y="64" textAnchor="middle" className="fill-emerald-900 text-[8px] dark:fill-emerald-100" fontFamily="ui-sans-serif, system-ui, sans-serif">
            draft
          </text>
          <rect x="100" y="76" width="76" height="18" rx="4" className="fill-emerald-300/90 dark:fill-emerald-700/80" />
          <text x="138" y="88" textAnchor="middle" className="fill-emerald-900 text-[8px] dark:fill-emerald-100" fontFamily="ui-sans-serif, system-ui, sans-serif">
            draft
          </text>
          <text x="100" y="112" textAnchor="middle" className="fill-emerald-800 text-[9px] dark:fill-emerald-200" fontFamily="ui-sans-serif, system-ui, sans-serif">
            Preview before applying
          </text>
        </svg>
        <figcaption className="mt-2 text-xs text-emerald-900 dark:text-emerald-200">
          A <strong className="font-medium">sandbox</strong>: generated blocks until you apply them to Calendar.
        </figcaption>
      </figure>
    </div>
  );
}

export function ClassAssignmentsTabsIllustration() {
  return (
    <figure className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
      <svg viewBox="0 0 360 100" className="h-auto w-full" role="img">
        <title>Assignment list tabs</title>
        <rect x="8" y="12" width="344" height="40" rx="8" className="fill-zinc-100 dark:fill-zinc-800" />
        <rect x="12" y="16" width="168" height="32" rx="6" className="fill-white shadow-sm dark:fill-zinc-900" />
        <text x="96" y="36" textAnchor="middle" className="fill-zinc-900 text-[11px] font-medium dark:fill-zinc-100" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Incomplete (3)
        </text>
        <text x="268" y="36" textAnchor="middle" className="fill-zinc-500 text-[11px] dark:fill-zinc-400" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Completed (0)
        </text>
        <text x="180" y="78" textAnchor="middle" className="fill-zinc-500 text-[10px] dark:fill-zinc-400" fontFamily="ui-sans-serif, system-ui, sans-serif">
          Toggle to switch lists without scrolling past both.
        </text>
      </svg>
      <figcaption className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
        On each class page, use <strong className="font-medium text-zinc-700 dark:text-zinc-300">Incomplete</strong> and{" "}
        <strong className="font-medium text-zinc-700 dark:text-zinc-300">Completed</strong> to focus on one list at a time.
      </figcaption>
    </figure>
  );
}
