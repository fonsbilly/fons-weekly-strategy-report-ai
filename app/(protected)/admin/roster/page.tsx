import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import AddDirectorForm from "./AddDirectorForm";
import RosterTable from "./RosterTable";

export default async function RosterPage() {
  const supabase = await createClient();

  const { data: directors } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, branch, is_active")
    .eq("role", "director")
    .order("full_name")
    .returns<Profile[]>();

  return (
    <div>
      <h1>Roster</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        Add and manage your branch directors. New directors get an email invite to set their own
        password.
      </p>
      <AddDirectorForm />
      <RosterTable directors={directors ?? []} />
    </div>
  );
}
