import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getWeekStart } from "@/lib/weeks";
import StatusDashboardTable from "./StatusDashboardTable";

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

  const showCalibratePrompt = profile?.role === "rvp" && !settings?.wpm_calibrated;

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

      <StatusDashboardTable statuses={statuses ?? []} />
    </div>
  );
}
