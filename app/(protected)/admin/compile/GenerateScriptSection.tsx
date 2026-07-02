"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

export default function GenerateScriptSection({
  weekStart,
  initialScript,
}: {
  weekStart: string;
  initialScript: string;
}) {
  const router = useRouter();
  const [script, setScript] = useState(initialScript);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalized, setFinalized] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setFinalized(false);

    const res = await fetch("/api/generate-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart }),
    });

    const data = await res.json();
    setGenerating(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to generate script.");
      return;
    }

    setScript(data.script);
    router.refresh();
  }

  async function handleFinalize() {
    setSaving(true);
    await fetch("/api/generate-script", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart, finalScript: script }),
    });
    setSaving(false);
    setFinalized(true);
    router.refresh();
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Script</h3>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        Make sure you've saved your selections above first - this uses whatever was last saved.
      </p>
      <button onClick={handleGenerate} disabled={generating} style={buttonStyle}>
        {generating ? "Generating..." : "Generate Script"}
      </button>
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {script && (
        <>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            rows={16}
            style={{ ...textareaStyle, marginTop: "1rem" }}
          />
          <div style={{ marginTop: "0.75rem" }}>
            <button onClick={handleFinalize} disabled={saving} style={buttonStyle}>
              {saving ? "Saving..." : "Finalize"}
            </button>
            {finalized && <span style={{ color: "#4ade80", marginLeft: "0.75rem" }}>Finalized.</span>}
          </div>
        </>
      )}
    </div>
  );
}

const cardStyle: CSSProperties = {
  padding: "1rem",
  border: "1px solid var(--border)",
  borderRadius: 8,
};

const textareaStyle: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.6rem",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "1rem",
  fontFamily: "inherit",
  resize: "vertical",
  lineHeight: 1.5,
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
