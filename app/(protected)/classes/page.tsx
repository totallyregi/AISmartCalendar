import { createClient } from "@/lib/supabase/server";
import { ClassList } from "@/components/ClassList";
import type { ClassSection } from "@/lib/types";

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_sections")
    .select("id,user_id,class_code,class_name,created_at,class_meetings(id,day_of_week,start_time,end_time)")
    .order("class_code");

  const classes = (data ?? []) as unknown as ClassSection[];

  return (
    <div className="space-y-6 animate-in">
      <h1 className="text-2xl font-medium text-palette-navy">Classes</h1>
      {classes.length === 0 && (
        <div className="ds-card border-dashed p-6">
          <p className="text-sm font-medium text-palette-navy">No classes yet</p>
          <p className="mt-2 text-sm text-palette-slate">
            Add a class code, name, and weekly meeting times (15-minute intervals). Use the <strong>Add class</strong> button below to get started.
          </p>
        </div>
      )}
      <ClassList classes={classes} />
    </div>
  );
}
