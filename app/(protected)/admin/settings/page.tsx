import { createClient } from "@/lib/supabase/server";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("org_settings")
    .select(
      "style_guide, words_per_minute, segment_seconds, total_target_seconds, submission_deadline_day, submission_deadline_time, timezone"
    )
    .single();

  return (
    <div>
      <h1>Settings</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        Controls how the script is written and timed, and when submissions count as late.
      </p>
      <SettingsForm
        initialStyleGuide={settings?.style_guide ?? ""}
        initialWordsPerMinute={settings?.words_per_minute ?? 150}
        initialSegmentSeconds={
          settings?.segment_seconds ?? { intro: 20, detroit: 40, grand_rapids: 40, indy: 40, ai_initiatives: 40 }
        }
        initialTotalTargetSeconds={settings?.total_target_seconds ?? 180}
        initialDeadlineDay={settings?.submission_deadline_day ?? "thursday"}
        initialDeadlineTime={settings?.submission_deadline_time ?? "23:59:00"}
        initialTimezone={settings?.timezone ?? "America/Detroit"}
        apiKeyConfigured={Boolean(process.env.ANTHROPIC_API_KEY)}
      />
    </div>
  );
}
