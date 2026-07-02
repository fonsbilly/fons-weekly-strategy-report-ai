import { createClient } from "@/lib/supabase/server";
import { getWeekStart } from "@/lib/weeks";
import CompileScrubView from "./CompileScrubView";
import GenerateScriptSection from "./GenerateScriptSection";

export default async function CompilePage() {
  const supabase = await createClient();

  const { data: settings } = await supabase.from("org_settings").select("timezone").single();
  const weekStart = getWeekStart(new Date(), settings?.timezone ?? "America/Detroit");

  const { data: submissions } = await supabase
    .from("submissions")
    .select("director_id, branch, positives, challenges, narrative, profiles(full_name)")
    .eq("week_start", weekStart);

  const { data: draft } = await supabase
    .from("weekly_scripts")
    .select("selected_fields, ai_initiatives_content, generated_script, final_script")
    .eq("week_start", weekStart)
    .maybeSingle();

  const rows = (submissions ?? []).map((s: any) => ({
    director_id: s.director_id,
    director_name: s.profiles?.full_name ?? "Unknown",
    branch: s.branch,
    positives: s.positives,
    challenges: s.challenges,
    narrative: s.narrative,
  }));

  return (
    <div>
      <h1>Compile</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>Week of {weekStart}</p>
      <CompileScrubView
        weekStart={weekStart}
        submissions={rows}
        initialSelectedFields={(draft?.selected_fields as Record<string, string[]>) ?? {}}
        initialAiContent={draft?.ai_initiatives_content ?? ""}
      />
      <div style={{ marginTop: "1.5rem" }}>
        <GenerateScriptSection
          weekStart={weekStart}
          initialScript={draft?.final_script ?? draft?.generated_script ?? ""}
        />
      </div>
    </div>
  );
}
