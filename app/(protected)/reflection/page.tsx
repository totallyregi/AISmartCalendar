import { WeeklyReflection } from "@/components/WeeklyReflection";

export default function ReflectionPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Weekly reflection
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        AI-generated summary of your week — supportive, no guilt.
      </p>
      <WeeklyReflection />
    </div>
  );
}
