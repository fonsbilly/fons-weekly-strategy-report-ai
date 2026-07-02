"use client";

import { useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

// Exactly 105 words. Keep this passage and the count in sync if edited.
const PASSAGE = `Every Monday morning, leaders across the region share a brief update on how their teams performed the previous week. The goal is simple: give everyone a clear, honest picture of where things stand without wasting anyone's time. Good news travels fast, and so do the challenges worth solving together. When we speak plainly and stick to the facts that matter, the whole organization moves a little quicker. Read this passage at your normal, comfortable speaking pace, exactly as if you were presenting it live on the call. When you reach the end of these sentences, stop the timer and we will calculate your speaking speed.`;
const PASSAGE_WORDS = 105;

export default function WpmTest({ onSaved }: { onSaved?: () => void }) {
  const router = useRouter();
  const startRef = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function start() {
    startRef.current = Date.now();
    setRunning(true);
    setResult(null);
    setSaved(false);
  }

  function stop() {
    if (startRef.current === null) return;
    const elapsedSeconds = (Date.now() - startRef.current) / 1000;
    setRunning(false);
    if (elapsedSeconds < 5) {
      // Too fast to be a real read-through; guard against an accidental double-click.
      setResult(null);
      return;
    }
    const wpm = Math.round((PASSAGE_WORDS / elapsedSeconds) * 60);
    setResult(wpm);
  }

  async function save() {
    if (result === null) return;
    setSaving(true);
    await fetch("/api/settings/wpm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordsPerMinute: result }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
    onSaved?.();
  }

  return (
    <div>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        Click Start, read the passage aloud at your natural presenting pace, then click Stop.
      </p>
      <blockquote
        style={{
          margin: "0 0 1rem",
          padding: "1rem",
          background: "var(--surface)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: 6,
          lineHeight: 1.6,
        }}
      >
        {PASSAGE}
      </blockquote>

      {!running && (
        <button onClick={start} style={buttonStyle}>
          {result === null ? "Start" : "Retake"}
        </button>
      )}
      {running && (
        <button onClick={stop} style={{ ...buttonStyle, background: "#f87171", color: "#0f172a" }}>
          Stop
        </button>
      )}

      {result !== null && (
        <div style={{ marginTop: "1rem" }}>
          <p style={{ margin: "0 0 0.5rem" }}>
            Your speaking speed: <strong>{result} words per minute</strong>
          </p>
          <button onClick={save} disabled={saving} style={buttonStyle}>
            {saving ? "Saving..." : "Use this speed"}
          </button>
          {saved && <span style={{ color: "#4ade80", marginLeft: "0.75rem" }}>Saved.</span>}
        </div>
      )}
    </div>
  );
}

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
