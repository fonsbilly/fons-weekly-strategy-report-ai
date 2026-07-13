"use client";

import { useState, type CSSProperties } from "react";

type TrendResult = {
  branchThemes: { branch: string; branchLabel: string; themes: string[] }[];
  crossBranchFlags: string[];
};

export default function TrendAnalysis({
  isRvp,
  from,
  to,
}: {
  isRvp: boolean;
  from: string;
  to: string;
}) {
  const [result, setResult] = useState<TrendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to analyze trends.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to analyze trends.");
    }
    setLoading(false);
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>
        {isRvp ? "Cross-branch correlations" : "Recurring themes"}
      </h3>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        {isRvp
          ? "Reads the selected date range of reports across all branches and flags issues that span more than one branch - shared operational or product problems, common performance-goal struggles, or something rolling through the region - so a systemic issue isn't mistaken for a local one. Runs on demand (uses the AI, takes a few seconds)."
          : "Reads recent reports and pulls out patterns for your branch. Runs on demand (uses the AI, takes a few seconds)."}
      </p>
      <button onClick={run} disabled={loading} style={buttonStyle}>
        {loading ? "Analyzing..." : "Analyze"}
      </button>

      {error && <p style={{ color: "#f87171" }}>{error}</p>}

      {result && isRvp && (
        <div style={{ marginTop: "1.25rem" }}>
          {result.crossBranchFlags.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>
              No cross-branch correlations found in this range.
            </p>
          ) : (
            <div
              style={{
                border: "1px solid #facc15",
                background: "rgba(250, 204, 21, 0.08)",
                borderRadius: 8,
                padding: "1rem",
              }}
            >
              <strong>Potential systemic patterns</strong>
              <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem", lineHeight: 1.6 }}>
                {result.crossBranchFlags.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {result && !isRvp && (
        <div style={{ marginTop: "1.25rem" }}>
          {result.branchThemes.length === 0 && (
            <p style={{ color: "var(--text-muted)" }}>No clear recurring themes yet.</p>
          )}
          {result.branchThemes.map((bt) => (
            <div key={bt.branch} style={{ marginBottom: "1rem" }}>
              <strong>{bt.branchLabel}</strong>
              {bt.themes.length === 0 ? (
                <p style={{ color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
                  No recurring pattern.
                </p>
              ) : (
                <ul style={{ margin: "0.25rem 0 0", paddingLeft: "1.2rem" }}>
                  {bt.themes.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const cardStyle: CSSProperties = {
  padding: "1rem",
  border: "1px solid var(--border)",
  borderRadius: 8,
};

const buttonStyle: CSSProperties = {
  padding: "0.7rem 1.4rem",
  background: "var(--accent)",
  border: "none",
  borderRadius: 6,
  color: "#0f172a",
  fontWeight: 600,
  fontSize: "1rem",
  cursor: "pointer",
};
