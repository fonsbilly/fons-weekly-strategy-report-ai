import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWeekStart } from "@/lib/weeks";
import type { Profile } from "@/lib/types";
import SubmissionForm from "./SubmissionForm";

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
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

  if (!profile || profile.role !== "director") {
    redirect("/dashboard");
  }

  const { data: settings } = await supabase.from("org_settings").select("timezone").single();
  const weekStart = getWeekStart(new Date(), settings?.timezone ?? "America/Detroit");

  const { data: existing } = await supabase
    .from("submissions")
    .select("positives, challenges, narrative")
    .eq("director_id", user.id)
    .eq("week_start", weekStart)
    .maybeSingle();

  return (
    <div>
      <h1>Weekly report</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>Week of {weekStart}</p>
      <SubmissionForm
        initialPositives={existing?.positives ?? ""}
        initialChallenges={existing?.challenges ?? ""}
        initialNarrative={existing?.narrative ?? ""}
        alreadySubmitted={Boolean(existing)}
      />
    </div>
  );
}
