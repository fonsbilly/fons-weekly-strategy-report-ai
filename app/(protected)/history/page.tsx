import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BRANCH_LABELS: Record<string, string> = {
  detroit: "Detroit",
  grand_rapids: "Grand Rapids",
  indianapolis: "Indianapolis",
};

type Row = {
  branch: string;
  week_start: string;
  positives: string;
  challenges: string;
  narrative: string;
  is_late: boolean;
  profiles: { full_name: string } | null;
};

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();

  const isRvp = profile?.role === "rvp";

  // RLS scopes rows: RVP sees all, a director sees only their own.
  const { data: submissions } = await supabase
    .from("submissions")
    .select("branch, week_start, positives, challenges, narrative, is_late, profiles(full_name)")
    .order("week_start", { ascending: false })
    .returns<Row[]>();

  const scripts = isRvp
    ? (
        await supabase
          .from("weekly_scripts")
          .select("week_start, final_script")
          .order("week_start", { ascending: false })
      ).data ?? []
    : [];
  const scriptByWeek = new Map(scripts.map((s: any) => [s.week_start, s.final_script]));

  // Group submissions by week (most recent first).
  const weeks: string[] = [];
  const byWeek = new Map<string, Row[]>();
  for (const s of submissions ?? []) {
    if (!byWeek.has(s.week_start)) {
      byWeek.set(s.week_start, []);
      weeks.push(s.week_start);
    }
    byWeek.get(s.week_start)!.push(s);
  }

  return (
    <div>
      <h1>History</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        {isRvp
          ? "Past weekly reports across all branches, plus the finalized script for each week."
          : "Your past weekly reports."}
      </p>

      {weeks.length === 0 && <p style={{ color: "var(--text-muted)" }}>No past reports yet.</p>}

      {weeks.map((week) => (
        <div key={week} style={{ marginBottom: "2rem" }}>
          <h2 style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.4rem" }}>
            Week of {week}
          </h2>
          {byWeek.get(week)!.map((s, i) => (
            <div key={i} style={cardStyle}>
              <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>
                {BRANCH_LABELS[s.branch] ?? s.branch}
                {isRvp && s.profiles ? ` — ${s.profiles.full_name}` : ""}{" "}
                <span style={{ fontSize: "0.85rem", color: s.is_late ? "#facc15" : "#4ade80" }}>
                  ({s.is_late ? "late" : "on time"})
                </span>
              </h3>
              <Field label="Positives" value={s.positives} />
              <Field label="Challenges" value={s.challenges} />
              <Field label="Narrative" value={s.narrative} />
            </div>
          ))}
          {isRvp && scriptByWeek.get(week) && (
            <details style={{ ...cardStyle, background: "var(--surface)" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Finalized script</summary>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", marginBottom: 0 }}>
                {scriptByWeek.get(week)}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{label}</div>
      <div style={{ whiteSpace: "pre-wrap" }}>{value || "(empty)"}</div>
    </div>
  );
}

const cardStyle = {
  padding: "1rem",
  border: "1px solid var(--border)",
  borderRadius: 8,
  marginBottom: "0.75rem",
};
