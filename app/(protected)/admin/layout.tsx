import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  if (!profile || profile.role !== "rvp") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
