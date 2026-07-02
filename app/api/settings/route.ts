import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireRvp() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "rvp") return null;

  return user;
}

export async function PUT(request: Request) {
  const rvp = await requireRvp();
  if (!rvp) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const body = await request.json();

  const { error } = await supabase
    .from("org_settings")
    .update({
      style_guide: body.styleGuide ?? "",
      total_target_seconds: body.totalTargetSeconds ?? 180,
      intro_seconds: body.introSeconds ?? 20,
      ai_seconds: body.aiSeconds ?? 40,
      submission_deadline_day: body.submissionDeadlineDay ?? "thursday",
      submission_deadline_time: body.submissionDeadlineTime ?? "23:59:00",
      timezone: body.timezone ?? "America/Detroit",
    })
    .eq("id", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
