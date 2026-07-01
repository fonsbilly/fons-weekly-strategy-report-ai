import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Branch } from "@/lib/types";

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

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://fons-weekly-strategy-report-ai.vercel.app";
}

export async function POST(request: Request) {
  const rvp = await requireRvp();
  if (!rvp) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const email: string | undefined = body.email?.trim();
  const fullName: string | undefined = body.fullName?.trim();
  const branch: Branch | undefined = body.branch;

  if (!email || !fullName || !branch) {
    return NextResponse.json({ error: "Missing email, name, or branch." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl()}/set-password`,
  });

  if (inviteError || !invited.user) {
    return NextResponse.json(
      { error: inviteError?.message ?? "Failed to invite user." },
      { status: 400 }
    );
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: invited.user.id,
    email,
    full_name: fullName,
    role: "director",
    branch,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const rvp = await requireRvp();
  if (!rvp) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id: string | undefined = body.id;
  const isActive: boolean | undefined = body.isActive;

  if (!id || typeof isActive !== "boolean") {
    return NextResponse.json({ error: "Missing id or isActive." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ is_active: isActive }).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
