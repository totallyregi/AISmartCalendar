import { createClient } from "@/lib/supabase/server";
import { CheckInForm } from "@/components/CheckInForm";

export default async function CheckInPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("check_ins")
    .select("date, responses_json")
    .eq("date", today)
    .single();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Daily check-in
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Quick reflection for today. No guilt — just notes for your weekly summary.
      </p>
      <CheckInForm date={today} initialResponses={(existing?.responses_json as Record<string, string>) ?? {}} />
    </div>
  );
}
