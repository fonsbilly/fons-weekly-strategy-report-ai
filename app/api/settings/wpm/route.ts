import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "rvp") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const wordsPerMinute = Number(body.wordsPerMinute);

  if (!Number.isFinite(wordsPerMinute) || wordsPerMinute < 40 || wordsPerMinute > 400) {
    return NextResponse.json({ error: "Invalid words-per-minute value." }, { status: 400 });
  }

  const { error } = await supabase
    .from("org_settings")
    .update({ words_per_minute: Math.round(wordsPerMinute), wpm_calibrated: true })
    .eq("id", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
