import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkDuplicate } from "@/lib/anthropic/duplicateCheck";
import { getWeekStart } from "@/lib/weeks";

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
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "director") {
    return NextResponse.json({ error: "Only directors submit reports." }, { status: 403 });
  }

  const body = await request.json();
  const positives: string = body.positives ?? "";
  const challenges: string = body.challenges ?? "";
  const narrative: string = body.narrative ?? "";

  const { data: settings } = await supabase.from("org_settings").select("timezone").single();
  const weekStart = getWeekStart(new Date(), settings?.timezone ?? "America/Detroit");

  // Same director only - the session-scoped client plus this director_id filter both enforce it.
  const { data: prior } = await supabase
    .from("submissions")
    .select("week_start, positives, challenges, narrative")
    .eq("director_id", user.id)
    .neq("week_start", weekStart)
    .order("week_start", { ascending: false })
    .limit(12);

  if (!prior || prior.length === 0) {
    return NextResponse.json({ isSimilar: false, similarWeekStarts: [], explanation: "" });
  }

  try {
    const result = await checkDuplicate({
      newPositives: positives,
      newChallenges: challenges,
      newNarrative: narrative,
      prior: prior.map((p: any) => ({
        weekStart: p.week_start,
        positives: p.positives,
        challenges: p.challenges,
        narrative: p.narrative,
      })),
    });
    return NextResponse.json(result);
  } catch {
    // Fail open - never block a submission just because the check errored.
    return NextResponse.json({ isSimilar: false, similarWeekStarts: [], explanation: "" });
  }
}
