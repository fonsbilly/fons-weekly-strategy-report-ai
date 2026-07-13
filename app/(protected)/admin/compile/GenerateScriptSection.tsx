"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow the edit box to fit the whole script so there's no scrolling inside it.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [script]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setSaved(false);

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

  async function handleSave() {
    setSaving(true);
    await fetch("/api/generate-script", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart, finalScript: script }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Script</h3>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        Save your selections above first - Generate uses whatever was last saved. You can edit the
        result below and save your changes as many times as you like.
      </p>
      <button onClick={handleGenerate} disabled={generating} style={buttonStyle}>
        {generating ? "Generating..." : script ? "Regenerate Script" : "Generate Script"}
      </button>
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {script && (
        <>
          <textarea
            ref={textareaRef}
            value={script}
            onChange={(e) => {
              setScript(e.target.value);
              setSaved(false);
            }}
            style={{ ...textareaStyle, marginTop: "1rem" }}
          />
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button onClick={handleSave} disabled={saving} style={buttonStyle}>
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button onClick={handleCopy} style={secondaryButtonStyle}>
              {copied ? "Copied!" : "Copy to clipboard"}
            </button>
            {saved && <span style={{ color: "#4ade80" }}>Saved.</span>}
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
  minHeight: "200px",
  padding: "0.75rem",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "1rem",
  fontFamily: "inherit",
  resize: "vertical",
  lineHeight: 1.6,
  overflow: "hidden",
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

const secondaryButtonStyle: CSSProperties = {
  padding: "0.7rem 1.4rem",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "1rem",
  cursor: "pointer",
};
