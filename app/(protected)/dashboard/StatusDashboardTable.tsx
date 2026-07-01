type StatusRow = {
  director_id: string;
  director_name: string;
  branch: string;
  submitted_at: string | null;
  is_late: boolean | null;
  has_submitted: boolean;
};

const BRANCH_LABELS: Record<string, string> = {
  detroit: "Detroit",
  grand_rapids: "Grand Rapids",
  indianapolis: "Indianapolis",
};

export default function StatusDashboardTable({ statuses }: { statuses: StatusRow[] }) {
  if (statuses.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>No directors on the roster yet.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
      <thead>
        <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
          <th style={thStyle}>Director</th>
          <th style={thStyle}>Branch</th>
          <th style={thStyle}>Status</th>
          <th style={thStyle}>Submitted</th>
        </tr>
      </thead>
      <tbody>
        {statuses.map((s) => (
          <tr key={s.director_id} style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={tdStyle}>{s.director_name}</td>
            <td style={tdStyle}>{BRANCH_LABELS[s.branch] ?? s.branch}</td>
            <td style={tdStyle}>
              {s.has_submitted ? (s.is_late ? "Submitted late" : "Submitted on time") : "Not submitted"}
            </td>
            <td style={tdStyle}>{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const thStyle = { padding: "0.5rem", color: "var(--text-muted)", fontWeight: 500 };
const tdStyle = { padding: "0.5rem" };
