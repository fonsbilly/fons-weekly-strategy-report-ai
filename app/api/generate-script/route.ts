import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateScript } from "@/lib/anthropic/generateScript";

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

const BRANCH_LABELS: Record<string, string> = {
  detroit: "Detroit",
  grand_rapids: "Grand Rapids",
  indianapolis: "Indianapolis",
};

export async function POST(request: Request) {
  const rvp = await requireRvp();
  if (!rvp) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const body = await request.json();
  const weekStart: string | undefined = body.weekStart;

  if (!weekStart) {
    return NextResponse.json({ error: "Missing weekStart." }, { status: 400 });
  }

  const { data: settings } = await supabase
    .from("org_settings")
    .select("style_guide, words_per_minute, segment_seconds, total_target_seconds")
    .single();

  const { data: draft } = await supabase
    .from("weekly_scripts")
    .select("selected_fields, ai_initiatives_content")
    .eq("week_start", weekStart)
    .maybeSingle();

  const { data: submissions } = await supabase
    .from("submissions")
    .select("director_id, branch, positives, challenges, narrative, profiles(full_name)")
    .eq("week_start", weekStart);

  const selectedFields = (draft?.selected_fields as Record<string, string[]>) ?? {};

  const branches = (submissions ?? []).map((s: any) => {
    const fields = selectedFields[s.director_id] ?? [];
    const parts: string[] = [];
    if (fields.includes("positives") && s.positives) parts.push(`Positives: ${s.positives}`);
    if (fields.includes("challenges") && s.challenges) parts.push(`Challenges: ${s.challenges}`);
    if (fields.includes("narrative") && s.narrative) parts.push(`Narrative: ${s.narrative}`);

    return {
      branchLabel: BRANCH_LABELS[s.branch] ?? s.branch,
      directorName: s.profiles?.full_name ?? "Unknown",
      text: parts.join("\n"),
    };
  });

  try {
    const script = await generateScript({
      styleGuide: settings?.style_guide ?? "",
      wordsPerMinute: settings?.words_per_minute ?? 150,
      segmentSeconds:
        settings?.segment_seconds ?? { intro: 20, detroit: 40, grand_rapids: 40, indy: 40, ai_initiatives: 40 },
      totalTargetSeconds: settings?.total_target_seconds ?? 180,
      branches,
      aiInitiativesContent: draft?.ai_initiatives_content ?? "",
    });

    const { error } = await supabase.from("weekly_scripts").upsert(
      {
        week_start: weekStart,
        generated_script: script,
        status: "generated",
        created_by: rvp.id,
      },
      { onConflict: "week_start" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ script });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate script.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const rvp = await requireRvp();
  if (!rvp) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const body = await request.json();
  const weekStart: string | undefined = body.weekStart;
  const finalScript: string | undefined = body.finalScript;

  if (!weekStart || typeof finalScript !== "string") {
    return NextResponse.json({ error: "Missing weekStart or finalScript." }, { status: 400 });
  }

  const { error } = await supabase
    .from("weekly_scripts")
    .update({ final_script: finalScript, status: "finalized" })
    .eq("week_start", weekStart);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
