import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProtectedShell } from "@/components/ProtectedShell";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <ProtectedShell email={user.email ?? undefined}>{children}</ProtectedShell>
  );
}
