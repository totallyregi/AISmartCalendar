import Link from "next/link";

export default function AssignmentsPage() {
  return (
    <div className="space-y-4 animate-in">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Assignments</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Assignments are now class-locked. Open a class tab under Classes in the sidebar and add assignments there.
      </p>
      <Link href="/classes" className="text-sm font-medium text-zinc-700 underline dark:text-zinc-300">
        Go to Classes
      </Link>
    </div>
  );
}
