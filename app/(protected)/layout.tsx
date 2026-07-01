import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import SignOutButton from "./SignOutButton";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, branch, is_active")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div>
      <header
        style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong>Weekly Strategy Report</strong>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "var(--text-muted)" }}>
            {profile.full_name} · {profile.role}
          </span>
          <SignOutButton />
        </div>
      </header>
      <main style={{ padding: "1.5rem" }}>{children}</main>
    </div>
  );
}
