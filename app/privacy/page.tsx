import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Privacy
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        AISmartCalendar is a student prototype. We do not sell or share your data.
      </p>
      <div className="mt-6 space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
        <p>
          We store your account (email), classes, assignments, habits, daily plans, and check-in responses so the app works across sessions. Data is stored in Supabase and is scoped to your account. We use HTTPS and secure authentication.
        </p>
        <p>
          We do not collect health or therapy data. No behavioral tracking is used for advertising. This is a productivity and planning tool for college students.
        </p>
      </div>
      <p className="mt-6">
        <Link href="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          ← Back
        </Link>
      </p>
    </div>
  );
}
