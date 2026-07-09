"use client";

import { useState, type CSSProperties } from "react";

type TrendResult = {
  branchThemes: { branch: string; branchLabel: string; themes: string[] }[];
  crossBranchFlags: string[];
};

export default function TrendAnalysis({ isRvp }: { isRvp: boolean }) {
  const [result, setResult] = useState<TrendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trends", { method: "POST" });
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
      <h3 style={{ marginTop: 0 }}>Recurring themes{isRvp ? " & cross-branch flags" : ""}</h3>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        Reads recent reports and pulls out patterns. Runs on demand (uses the AI, takes a few
        seconds).
      </p>
      <button onClick={run} disabled={loading} style={buttonStyle}>
        {loading ? "Analyzing..." : "Analyze trends"}
      </button>

      {error && <p style={{ color: "#f87171" }}>{error}</p>}

      {result && (
        <div style={{ marginTop: "1.25rem" }}>
          {isRvp && result.crossBranchFlags.length > 0 && (
            <div
              style={{
                border: "1px solid #facc15",
                background: "rgba(250, 204, 21, 0.08)",
                borderRadius: 8,
                padding: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              <strong>Cross-branch flags</strong>
              <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
                {result.crossBranchFlags.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

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
