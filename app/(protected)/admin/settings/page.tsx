import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("org_settings")
    .select(
      "style_guide, words_per_minute, total_target_seconds, intro_seconds, ai_seconds, submission_deadline_day, submission_deadline_time, timezone, wpm_calibrated"
    )
    .single();

  const { count: activeBranchCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "director")
    .eq("is_active", true);

  return (
    <div>
      <h1>Settings</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        Controls how the script is written and timed, and when submissions count as late.
      </p>
      <SettingsForm
        initialStyleGuide={settings?.style_guide ?? ""}
        wordsPerMinute={settings?.words_per_minute ?? 150}
        wpmCalibrated={settings?.wpm_calibrated ?? false}
        initialTotalTargetSeconds={settings?.total_target_seconds ?? 180}
        initialIntroSeconds={settings?.intro_seconds ?? 20}
        initialAiSeconds={settings?.ai_seconds ?? 40}
        activeBranchCount={activeBranchCount ?? 0}
        initialDeadlineDay={settings?.submission_deadline_day ?? "thursday"}
        initialDeadlineTime={settings?.submission_deadline_time ?? "23:59:00"}
        initialTimezone={settings?.timezone ?? "America/Detroit"}
        apiKeyConfigured={Boolean(process.env.ANTHROPIC_API_KEY)}
      />
    </div>
  );
}
