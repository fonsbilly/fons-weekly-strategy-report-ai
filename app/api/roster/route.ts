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

function generateTempPassword() {
  const words = ["Maple", "River", "Falcon", "Harbor", "Cedar", "Summit", "Bridge", "Quarry"];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${word}${digits}!`;
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

  // Create the account with a temporary password rather than an emailed/clickable invite
  // link - corporate email security (link-scanning proxies) tends to pre-click and burn
  // single-use auth links before the real recipient gets to them, and Supabase's free-tier
  // email sending is also rate-limited. The RVP relays this password directly (e.g. Teams
  // chat text) instead.
  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create user." },
      { status: 400 }
    );
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    email,
    full_name: fullName,
    role: "director",
    branch,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, tempPassword });
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
