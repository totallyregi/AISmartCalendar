import type { ReactNode } from "react";
import Link from "next/link";
import {
  AiWorkflowIllustration,
  CalendarVsAiIllustration,
  ClassAssignmentsTabsIllustration,
  SidebarIllustration,
} from "@/components/help/HelpDiagrams";

const linkCls =
  "font-medium text-emerald-700 underline decoration-emerald-600/40 underline-offset-2 hover:text-emerald-800 hover:decoration-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{children}</div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="space-y-10 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">How to use AISmartCalendar</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
          This guide walks through each area of the app, what it is for, and how the pieces fit together. Use the links to jump straight into a screen while you read.
        </p>
      </div>

      <nav
        aria-label="On this page"
        className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">On this page</p>
        <ul className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
          {[
            ["#intro", "What this app does"],
            ["#sidebar", "Sidebar & navigation"],
            ["#calendar-vs-ai", "Calendar vs AI Calendar"],
            ["#classes", "Classes"],
            ["#habits", "Habits"],
            ["#todo", "To-do List"],
            ["#preferences", "Preferences"],
            ["#workflow", "Recommended weekly flow"],
            ["#calendar-ui", "Calendar views & colors"],
            ["#extras", "Personal events & Google"],
            ["#mobile", "Mobile"],
            ["#troubleshooting", "Troubleshooting"],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="text-emerald-700 hover:underline dark:text-emerald-400">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="intro" title="What this app does">
        <p>
          AISmartCalendar combines your fixed commitments (classes, fixed habits, personal and imported events) with flexible work (assignments and flexible habits). You can generate{" "}
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">AI scheduling suggestions</strong> in a separate workspace, review them, then apply only what you want to your main calendar.
        </p>
      </Section>

      <Section id="sidebar" title="Sidebar & navigation">
        <p>
          After you sign in, the <strong className="font-medium text-zinc-800 dark:text-zinc-200">left sidebar</strong> lists every main area. Tap the app title or use the layout to reach your screens; on small screens, open or close the sidebar with the arrow button so the calendar can use full width.
        </p>
        <SidebarIllustration />
        <ul className="list-inside list-disc space-y-1 text-zinc-600 dark:text-zinc-300">
          <li>
            <Link href="/calendar" className={linkCls}>
              Calendar
            </Link>{" "}
            — your committed schedule (classes, habits, applied assignment blocks, personal and external events).
          </li>
          <li>
            <Link href="/dashboard" className={linkCls}>
              AI Calendar
            </Link>{" "}
            — planning sandbox: generate and review draft blocks before applying.
          </li>
          <li>
            <Link href="/classes" className={linkCls}>
              Classes
            </Link>{" "}
            — course sections and meeting times; each class has its own page for assignments.
          </li>
          <li>
            <Link href="/habits" className={linkCls}>
              Habits
            </Link>{" "}
            — fixed (day/time) and flexible (weekly targets) routines.
          </li>
          <li>
            <Link href="/assignments" className={linkCls}>
              To-do List
            </Link>{" "}
            — all assignments across classes in one place.
          </li>
          <li>
            <Link href="/preferences" className={linkCls}>
              Preferences
            </Link>{" "}
            — timezone, daily limits, workdays, and work windows for the scheduler.
          </li>
        </ul>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          The <strong className="font-medium text-zinc-600 dark:text-zinc-300">Help</strong> link at the bottom of the sidebar opens this page anytime.
        </p>
      </Section>

      <Section id="calendar-vs-ai" title="Calendar vs AI Calendar">
        <CalendarVsAiIllustration />
        <p>
          Open{" "}
          <Link href="/calendar" className={linkCls}>
            Calendar
          </Link>{" "}
          to see what is actually on your plate. Open{" "}
          <Link href="/dashboard" className={linkCls}>
            AI Calendar
          </Link>{" "}
          to run the generator for a week, inspect suggested blocks in the month and day views, then use the planner actions to <strong className="font-medium text-zinc-800 dark:text-zinc-200">apply</strong> drafts to your real calendar when you are satisfied.
        </p>
        <AiWorkflowIllustration />
      </Section>

      <Section id="classes" title="Classes">
        <p>
          Go to{" "}
          <Link href="/classes" className={linkCls}>
            Classes
          </Link>{" "}
          to add each section: class code, name, and weekly meeting times. Meetings show as recurring events on your calendar. Click a class in the sidebar (under <strong className="font-medium text-zinc-800 dark:text-zinc-200">Classes</strong>) to open that class’s detail page.
        </p>
        <p>
          On each class page, manage assignments with <strong className="font-medium text-zinc-800 dark:text-zinc-200">Add assignment</strong>, and use <strong className="font-medium text-zinc-800 dark:text-zinc-200">Mark done</strong>, <strong className="font-medium text-zinc-800 dark:text-zinc-200">Edit</strong>, or <strong className="font-medium text-zinc-800 dark:text-zinc-200">Delete</strong> on each row. Switch between incomplete and completed work with the tabs (incomplete is the default).
        </p>
        <ClassAssignmentsTabsIllustration />
      </Section>

      <Section id="habits" title="Habits">
        <p>
          <Link href="/habits" className={linkCls}>
            Habits
          </Link>{" "}
          are split into two columns: <strong className="font-medium text-zinc-800 dark:text-zinc-200">Fixed</strong> habits (specific days and times, like gym at 9:30 PM) and <strong className="font-medium text-zinc-800 dark:text-zinc-200">Flexible</strong> habits (duration-based weekly targets the AI can place inside your preferences). Use <strong className="font-medium text-zinc-800 dark:text-zinc-200">Add habit</strong> and fill the form for the type you need; pause, edit, or delete from each card.
        </p>
      </Section>

      <Section id="todo" title="To-do List (all assignments)">
        <p>
          <Link href="/assignments" className={linkCls}>
            To-do List
          </Link>{" "}
          shows assignments from every class together, with sorting and the same incomplete/completed tabs. Use it when you want a single board across courses rather than opening each class.
        </p>
      </Section>

      <Section id="preferences" title="Preferences">
        <p>
          Visit{" "}
          <Link href="/preferences" className={linkCls}>
            Preferences
          </Link>{" "}
          before relying on AI generation: set <strong className="font-medium text-zinc-800 dark:text-zinc-200">daily workload limits</strong> (min, preferred, max, consecutive work, breaks), <strong className="font-medium text-zinc-800 dark:text-zinc-200">timezone</strong>, <strong className="font-medium text-zinc-800 dark:text-zinc-200">preferred work days</strong>, and at least one <strong className="font-medium text-zinc-800 dark:text-zinc-200">work window</strong> per day you want the scheduler to use. Click <strong className="font-medium text-zinc-800 dark:text-zinc-200">Save preferences</strong> after editing limits; add windows with the day and time pickers, then save.
        </p>
        <p className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          The AI Calendar generator stays disabled until preferences are sufficiently configured (including work windows).
        </p>
      </Section>

      <Section id="workflow" title="Recommended weekly flow">
        <ol className="list-inside list-decimal space-y-2 text-zinc-600 dark:text-zinc-300">
          <li>
            Configure{" "}
            <Link href="/preferences" className={linkCls}>
              Preferences
            </Link>
            .
          </li>
          <li>
            Keep{" "}
            <Link href="/classes" className={linkCls}>
              Classes
            </Link>{" "}
            and{" "}
            <Link href="/habits" className={linkCls}>
              Habits
            </Link>{" "}
            up to date.
          </li>
          <li>
            Add or update assignments from{" "}
            <Link href="/assignments" className={linkCls}>
              To-do List
            </Link>{" "}
            or each class page.
          </li>
          <li>
            Open{" "}
            <Link href="/dashboard" className={linkCls}>
              AI Calendar
            </Link>
            , pick the week, and generate.
          </li>
          <li>Review draft blocks in the month grid and day timeline, then apply to your main calendar.</li>
          <li>
            Confirm results on{" "}
            <Link href="/calendar" className={linkCls}>
              Calendar
            </Link>
            .
          </li>
        </ol>
      </Section>

      <Section id="calendar-ui" title="Calendar views & colors">
        <p>
          On both Calendar and AI Calendar, the <strong className="font-medium text-zinc-800 dark:text-zinc-200">month grid</strong> shows dots and short previews by time; pick a date to open the <strong className="font-medium text-zinc-800 dark:text-zinc-200">day details</strong> panel with a full timeline. Colors distinguish sources (external, class, fixed habit, flexible habit, assignment, personal, and generated drafts on the AI view). Use <strong className="font-medium text-zinc-800 dark:text-zinc-200">Add personal event</strong> on the main calendar for one-off busy time.
        </p>
      </Section>

      <Section id="extras" title="Personal events & Google Calendar">
        <p>
          From{" "}
          <Link href="/calendar" className={linkCls}>
            Calendar
          </Link>
          , add personal events that block time. Connect Google from the integration card to import external busy times; those imports affect scheduling visibility.
        </p>
      </Section>

      <Section id="mobile" title="Mobile">
        <p>
          The layout is responsive: collapse the sidebar on phones for more room, and scroll the calendar horizontally when needed. The same links in this guide work on any screen size.
        </p>
      </Section>

      <Section id="troubleshooting" title="Troubleshooting">
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">Nothing generates:</strong> ensure Preferences include work windows and saved limits.
          </li>
          <li>
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">Too little time before a due date:</strong> widen work windows or reduce conflicting events.
          </li>
          <li>
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">Crowded days:</strong> review personal events, imports, and already-applied blocks.
          </li>
        </ul>
      </Section>

      <footer className="border-t border-zinc-200 pt-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <p>
          For data practices, see the{" "}
          <Link href="/privacy" className={linkCls}>
            Privacy
          </Link>{" "}
          page.
        </p>
      </footer>
    </div>
  );
}
