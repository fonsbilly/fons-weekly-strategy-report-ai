import { createClient } from "@/lib/supabase/server";
import { getWeekStart } from "@/lib/weeks";
import StatusDashboardTable from "./StatusDashboardTable";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase.from("org_settings").select("timezone").single();
  const weekStart = getWeekStart(new Date(), settings?.timezone ?? "America/Detroit");

  const { data: statuses } = await supabase.rpc("get_week_status", { p_week_start: weekStart });

  return (
    <div>
      <h1>Dashboard</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>Week of {weekStart}</p>
      <StatusDashboardTable statuses={statuses ?? []} />
    </div>
  );
}
