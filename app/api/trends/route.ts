import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeTrends } from "@/lib/anthropic/trendAnalysis";

export const dynamic = "force-dynamic";

const BRANCH_LABELS: Record<string, string> = {
  detroit: "Detroit",
  grand_rapids: "Grand Rapids",
  indianapolis: "Indianapolis",
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const body = await request.json().catch(() => ({}));
  const from: string | undefined = body.from;
  const to: string | undefined = body.to;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, branch, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "No profile." }, { status: 403 });
  }

  const isRvp = profile.role === "rvp";

  // RLS scopes this automatically: RVP sees all submissions, a director sees only their own.
  let query = supabase
    .from("submissions")
    .select("director_id, branch, week_start, positives, challenges, narrative, profiles(full_name)")
    .order("week_start", { ascending: true });

  // week_start is a YYYY-MM-DD date, so string comparison is chronological.
  if (from) query = query.gte("week_start", from);
  if (to) query = query.lte("week_start", to);

  const { data: submissions } = await query;

  const byDirector = new Map<string, any>();
  for (const s of submissions ?? []) {
    const key = s.director_id;
    if (!byDirector.has(key)) {
      byDirector.set(key, {
        branch: s.branch,
        branchLabel: BRANCH_LABELS[s.branch] ?? s.branch,
        directorName: (s.profiles as any)?.full_name ?? "Unknown",
        weeks: [],
      });
    }
    byDirector.get(key).weeks.push({
      weekStart: s.week_start,
      positives: s.positives,
      challenges: s.challenges,
      narrative: s.narrative,
    });
  }

  const branches = Array.from(byDirector.values());

  try {
    const result = await analyzeTrends({ branches, includeCrossBranch: isRvp });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to analyze trends.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
