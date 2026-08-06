"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import MicButton from "@/components/MicButton";

function appendText(prev: string, added: string): string {
  return prev.trim() ? `${prev.trim()} ${added}` : added;
}

function AutoTextarea({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={textareaStyle}
    />
  );
}

export default function SubmissionForm({
  initialPositives,
  initialChallenges,
  initialNarrative,
  alreadySubmitted,
}: {
  initialPositives: string;
  initialChallenges: string;
  initialNarrative: string;
  alreadySubmitted: boolean;
}) {
  const router = useRouter();
  const [positives, setPositives] = useState(initialPositives);
  const [challenges, setChallenges] = useState(initialChallenges);
  const [narrative, setNarrative] = useState(initialNarrative);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState<{ title: string; body: string } | null>(null);

  async function doSave(acknowledgedDuplicateWarning: boolean) {
    setSaving(true);
    setError(null);

    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positives, challenges, narrative, acknowledgedDuplicateWarning }),
    });

    const data = await res.json();
    setSaving(false);
    setWarning(null);

    if (!res.ok) {
      setError(data.error ?? "Failed to submit.");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setWarning(null);
    setChecking(true);

    const payload = { positives, challenges, narrative };
    const post = (url: string) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((r) => r.json())
        .catch(() => ({}));

    // Run the coaching check and the duplicate check together.
    const [coach, dup] = await Promise.all([
      post("/api/submissions/coach-check"),
      post("/api/submissions/check-duplicate"),
    ]);
    setChecking(false);

    // Coaching nudge takes priority (it's the RVP's specific ask), then the duplicate warning.
    if (coach?.needsAttention && coach?.message) {
      setWarning({ title: "A note from your RVP", body: coach.message });
      return;
    }
    if (dup?.isSimilar) {
      const weeks: string[] = dup.similarWeekStarts ?? [];
      const explanation: string = dup.explanation ?? "";
      const body =
        `This is substantially similar to what you already reported` +
        (weeks.length > 0 ? ` (week of ${weeks.join(", ")}).` : ".") +
        (explanation ? ` ${explanation}` : "");
      setWarning({ title: "Looks familiar", body });
      return;
    }

    await doSave(false);
  }

  const busy = checking || saving;

  return (
    <>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 900 }}
      >
        <label>
          <div style={fieldHeaderStyle}>
            <span style={labelTextStyle}>Positives</span>
            <MicButton onText={(t) => setPositives((p) => appendText(p, t))} />
          </div>
          <AutoTextarea value={positives} onChange={setPositives} />
        </label>
        <label>
          <div style={fieldHeaderStyle}>
            <span style={labelTextStyle}>Challenges</span>
            <MicButton onText={(t) => setChallenges((p) => appendText(p, t))} />
          </div>
          <AutoTextarea value={challenges} onChange={setChallenges} />
        </label>
        <label>
          <div style={fieldHeaderStyle}>
            <span style={labelTextStyle}>Narrative</span>
            <MicButton onText={(t) => setNarrative((p) => appendText(p, t))} />
          </div>
          <AutoTextarea value={narrative} onChange={setNarrative} />
        </label>
        {error && <p style={{ color: "#f87171", margin: 0 }}>{error}</p>}
        {success && <p style={{ color: "#4ade80", margin: 0 }}>Saved.</p>}
        <button type="submit" disabled={busy} style={buttonStyle}>
          {checking
            ? "Checking..."
            : saving
              ? "Saving..."
              : alreadySubmitted
                ? "Update report"
                : "Submit report"}
        </button>
      </form>

      {warning && (
        <div style={overlayStyle}>
          <div style={dialogStyle}>
            <h3 style={{ marginTop: 0 }}>{warning.title}</h3>
            <p style={{ color: "var(--text-muted)" }}>{warning.body}</p>
            <p>Submit it anyway?</p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button onClick={() => setWarning(null)} disabled={saving} style={secondaryButtonStyle}>
                Go back &amp; edit
              </button>
              <button onClick={() => doSave(true)} disabled={saving} style={buttonStyle}>
                {saving ? "Saving..." : "Submit anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const labelTextStyle: CSSProperties = {
  fontWeight: 600,
};

const fieldHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "0.35rem",
};

const textareaStyle: CSSProperties = {
  display: "block",
  width: "100%",
  minHeight: "140px",
  padding: "0.75rem",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "1rem",
  fontFamily: "inherit",
  lineHeight: 1.6,
  resize: "vertical",
  overflow: "hidden",
};

const buttonStyle: CSSProperties = {
  padding: "0.7rem 1.2rem",
  background: "var(--accent)",
  border: "none",
  borderRadius: 6,
  color: "#0f172a",
  fontWeight: 600,
  fontSize: "1rem",
  cursor: "pointer",
  width: "fit-content",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "0.7rem 1.2rem",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "1rem",
  cursor: "pointer",
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
};

const dialogStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "1.5rem",
  maxWidth: 460,
  width: "100%",
};
