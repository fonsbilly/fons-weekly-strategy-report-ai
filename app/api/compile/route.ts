import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

export async function POST(request: Request) {
  const rvp = await requireRvp();
  if (!rvp) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const body = await request.json();
  const weekStart: string | undefined = body.weekStart;
  const selectedFields: Record<string, string[]> | undefined = body.selectedFields;
  const aiInitiativesContent: string = body.aiInitiativesContent ?? "";
  const useHistoryBranches: string[] = body.useHistoryBranches ?? [];

  if (!weekStart || !selectedFields) {
    return NextResponse.json({ error: "Missing weekStart or selectedFields." }, { status: 400 });
  }

  const { error } = await supabase.from("weekly_scripts").upsert(
    {
      week_start: weekStart,
      selected_fields: selectedFields,
      ai_initiatives_content: aiInitiativesContent,
      use_history_branches: useHistoryBranches,
      created_by: rvp.id,
    },
    { onConflict: "week_start" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
