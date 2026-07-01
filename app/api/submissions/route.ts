import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWeekStart, isLate } from "@/lib/weeks";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, branch")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "director" || !profile.branch) {
    return NextResponse.json({ error: "Only directors can submit reports." }, { status: 403 });
  }

  const { data: settings } = await supabase
    .from("org_settings")
    .select("submission_deadline_day, submission_deadline_time, timezone")
    .single();

  const body = await request.json();
  const positives: string = body.positives ?? "";
  const challenges: string = body.challenges ?? "";
  const narrative: string = body.narrative ?? "";
  const acknowledgedDuplicateWarning: boolean = body.acknowledgedDuplicateWarning ?? false;

  const timezone = settings?.timezone ?? "America/Detroit";
  const now = new Date();
  const weekStart = getWeekStart(now, timezone);
  const late = isLate(
    now,
    weekStart,
    settings?.submission_deadline_day ?? "thursday",
    settings?.submission_deadline_time ?? "23:59:00",
    timezone
  );

  const { error } = await supabase.from("submissions").upsert(
    {
      director_id: user.id,
      branch: profile.branch,
      week_start: weekStart,
      positives,
      challenges,
      narrative,
      submitted_at: now.toISOString(),
      is_late: late,
      acknowledged_duplicate_warning: acknowledgedDuplicateWarning,
    },
    { onConflict: "director_id,week_start" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, weekStart });
}
