import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateScript } from "@/lib/anthropic/generateScript";

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
    .select("selected_fields, ai_initiatives_content, use_history_branches")
    .eq("week_start", weekStart)
    .maybeSingle();

  const { data: directors } = await supabase
    .from("profiles")
    .select("id, full_name, branch")
    .eq("role", "director")
    .eq("is_active", true);

  const { data: submissions } = await supabase
    .from("submissions")
    .select("director_id, positives, challenges, narrative")
    .eq("week_start", weekStart);

  const selectedFields = (draft?.selected_fields as Record<string, string[]>) ?? {};
  const useHistoryBranches = new Set(draft?.use_history_branches ?? []);
  const submissionByDirector = new Map((submissions ?? []).map((s: any) => [s.director_id, s]));

  const branches = [];

  for (const director of directors ?? []) {
    const branchLabel = BRANCH_LABELS[director.branch] ?? director.branch;
    const current = submissionByDirector.get(director.id);
    const fields = selectedFields[director.id] ?? [];

    if (current && fields.length > 0) {
      const parts: string[] = [];
      if (fields.includes("positives") && current.positives) parts.push(`Positives: ${current.positives}`);
      if (fields.includes("challenges") && current.challenges) parts.push(`Challenges: ${current.challenges}`);
      if (fields.includes("narrative") && current.narrative) parts.push(`Narrative: ${current.narrative}`);

      branches.push({
        branchLabel,
        directorName: director.full_name,
        status: "current" as const,
        text: parts.join("\n"),
      });
      continue;
    }

    if (useHistoryBranches.has(director.branch)) {
      const { data: history } = await supabase
        .from("submissions")
        .select("week_start, positives, challenges, narrative")
        .eq("director_id", director.id)
        .lt("week_start", weekStart)
        .order("week_start", { ascending: false })
        .limit(4);

      const ordered = (history ?? []).slice().reverse();
      const text = ordered
        .map((h: any) => {
          const parts: string[] = [];
          if (h.positives) parts.push(`Positives: ${h.positives}`);
          if (h.challenges) parts.push(`Challenges: ${h.challenges}`);
          if (h.narrative) parts.push(`Narrative: ${h.narrative}`);
          return `Week of ${h.week_start}:\n${parts.join("\n")}`;
        })
        .join("\n\n");

      branches.push({
        branchLabel,
        directorName: director.full_name,
        status: "history" as const,
        text,
      });
      continue;
    }

    branches.push({
      branchLabel,
      directorName: director.full_name,
      status: "none" as const,
      text: "",
    });
  }

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
