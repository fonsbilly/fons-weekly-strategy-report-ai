import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { coachCheck } from "@/lib/anthropic/coachCheck";

export const dynamic = "force-dynamic";

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
    .select("id, role, focus_notes")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "director") {
    return NextResponse.json({ needsAttention: false, message: "" });
  }

  const { data: settings } = await supabase
    .from("org_settings")
    .select("coaching_guidance")
    .single();

  const body = await request.json();

  try {
    const result = await coachCheck({
      generalGuidance: settings?.coaching_guidance ?? "",
      focusNotes: profile.focus_notes ?? "",
      positives: body.positives ?? "",
      challenges: body.challenges ?? "",
      narrative: body.narrative ?? "",
    });
    return NextResponse.json(result);
  } catch {
    // Fail open - never block a submission because the coaching check errored.
    return NextResponse.json({ needsAttention: false, message: "" });
  }
}
