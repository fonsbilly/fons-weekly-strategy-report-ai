import { createClient } from "@/lib/supabase/server";
import TrendAnalysis from "./TrendAnalysis";
import DateRangeControl from "./DateRangeControl";

export const dynamic = "force-dynamic";

const BRANCH_LABELS: Record<string, string> = {
  detroit: "Detroit",
  grand_rapids: "Grand Rapids",
  indianapolis: "Indianapolis",
};

type Row = { branch: string; is_late: boolean; week_start: string };

type Metric = {
  branch: string;
  branchLabel: string;
  total: number;
  onTime: number;
  late: number;
  lastWeek: string | null;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;

  const today = new Date();
  const defaultTo = isoDate(today);
  const defaultFrom = isoDate(new Date(today.getTime() - 84 * 24 * 60 * 60 * 1000)); // ~12 weeks back
  const from = params.from ?? defaultFrom;
  const to = params.to ?? defaultTo;

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
    .select("branch, is_late, week_start")
    .gte("week_start", from)
    .lte("week_start", to)
    .order("week_start", { ascending: false })
    .returns<Row[]>();

  const metricByBranch = new Map<string, Metric>();
  for (const s of submissions ?? []) {
    if (!metricByBranch.has(s.branch)) {
      metricByBranch.set(s.branch, {
        branch: s.branch,
        branchLabel: BRANCH_LABELS[s.branch] ?? s.branch,
        total: 0,
        onTime: 0,
        late: 0,
        lastWeek: null,
      });
    }
    const m = metricByBranch.get(s.branch)!;
    m.total += 1;
    if (s.is_late) m.late += 1;
    else m.onTime += 1;
    if (!m.lastWeek || s.week_start > m.lastWeek) m.lastWeek = s.week_start;
  }

  const metrics = Array.from(metricByBranch.values()).sort((a, b) =>
    a.branchLabel.localeCompare(b.branchLabel)
  );

  return (
    <div>
      <h1>Trends</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        {isRvp ? "Patterns across your branches over time." : "Your submission history and patterns."}
      </p>

      <DateRangeControl from={from} to={to} />

      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        Showing {from} to {to}.
      </p>

      {/* Timeliness/tardiness metrics are RVP-only. Directors get recurring-themes
          analysis (their own branch) instead. */}
      {isRvp && (
        <div style={{ ...cardStyle, marginBottom: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Timeliness &amp; activity</h3>
          {metrics.length === 0 ? (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>No submissions in this range.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                  <th style={th}>Branch</th>
                  <th style={th}>Submissions</th>
                  <th style={th}>On time</th>
                  <th style={th}>Late</th>
                  <th style={th}>On-time rate</th>
                  <th style={th}>Last submitted</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.branch} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={td}>{m.branchLabel}</td>
                    <td style={td}>{m.total}</td>
                    <td style={td}>{m.onTime}</td>
                    <td style={td}>{m.late}</td>
                    <td style={td}>{m.total > 0 ? Math.round((m.onTime / m.total) * 100) : 0}%</td>
                    <td style={td}>{m.lastWeek ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* RVP: cross-branch correlations. Director: own-branch recurring themes.
          (The component switches its content by role.) */}
      <TrendAnalysis key={`${from}-${to}`} isRvp={isRvp} from={from} to={to} />
    </div>
  );
}

const cardStyle = { padding: "1rem", border: "1px solid var(--border)", borderRadius: 8 };
const th = { padding: "0.5rem", color: "var(--text-muted)", fontWeight: 500 };
const td = { padding: "0.5rem" };
