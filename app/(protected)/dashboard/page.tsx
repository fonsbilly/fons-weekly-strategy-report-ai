import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWeekStart } from "@/lib/weeks";
import StatusDashboardTable from "./StatusDashboardTable";
import RemindButton from "./RemindButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  const { data: settings } = await supabase
    .from("org_settings")
    .select("timezone, wpm_calibrated")
    .single();
  const weekStart = getWeekStart(new Date(), settings?.timezone ?? "America/Detroit");

  const { data: statuses } = await supabase.rpc("get_week_status", { p_week_start: weekStart });

  const isRvp = profile?.role === "rvp";
  const showCalibratePrompt = isRvp && !settings?.wpm_calibrated;

  // For the RVP: figure out who hasn't submitted this week, and pull their emails for the
  // one-click reminder (mailto from the RVP's own mail client - no server-side sending).
  let nonSubmitterEmails: string[] = [];
  let nonSubmitterNames: string[] = [];
  if (isRvp) {
    const submittedIds = new Set(
      (statuses ?? []).filter((s: any) => s.has_submitted).map((s: any) => s.director_id)
    );
    const { data: directors } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "director")
      .eq("is_active", true);
    const missing = (directors ?? []).filter((d: any) => !submittedIds.has(d.id));
    nonSubmitterEmails = missing.map((d: any) => d.email);
    nonSubmitterNames = missing.map((d: any) => d.full_name);
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>Week of {weekStart}</p>

      {showCalibratePrompt && (
        <div
          style={{
            border: "1px solid #facc15",
            background: "rgba(250, 204, 21, 0.08)",
            borderRadius: 8,
            padding: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <strong>Set your reading speed</strong>
          <p style={{ margin: "0.35rem 0 0.75rem", color: "var(--text-muted)" }}>
            Take a quick 1-minute reading test so generated scripts match your natural speaking
            pace and hit the time target.
          </p>
          <Link
            href="/admin/settings"
            style={{
              display: "inline-block",
              padding: "0.5rem 1rem",
              background: "var(--accent)",
              color: "#0f172a",
              borderRadius: 6,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Go to Settings
          </Link>
        </div>
      )}

      {isRvp && (
        <RemindButton
          recipients={nonSubmitterEmails}
          names={nonSubmitterNames}
          weekStart={weekStart}
        />
      )}

      <StatusDashboardTable statuses={statuses ?? []} />
    </div>
  );
}
