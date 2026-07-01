"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const res = await fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positives, challenges, narrative }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to submit.");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: 640 }}
    >
      <label>
        Positives
        <textarea
          value={positives}
          onChange={(e) => setPositives(e.target.value)}
          rows={4}
          style={textareaStyle}
        />
      </label>
      <label>
        Challenges
        <textarea
          value={challenges}
          onChange={(e) => setChallenges(e.target.value)}
          rows={4}
          style={textareaStyle}
        />
      </label>
      <label>
        Narrative
        <textarea
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          rows={4}
          style={textareaStyle}
        />
      </label>
      {error && <p style={{ color: "#f87171", margin: 0 }}>{error}</p>}
      {success && <p style={{ color: "#4ade80", margin: 0 }}>Saved.</p>}
      <button type="submit" disabled={loading} style={buttonStyle}>
        {loading ? "Saving..." : alreadySubmitted ? "Update report" : "Submit report"}
      </button>
    </form>
  );
}

const textareaStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "0.35rem",
  padding: "0.6rem",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "1rem",
  fontFamily: "inherit",
  resize: "vertical",
};

const buttonStyle: CSSProperties = {
  padding: "0.7rem",
  background: "var(--accent)",
  border: "none",
  borderRadius: 6,
  color: "#0f172a",
  fontWeight: 600,
  fontSize: "1rem",
  cursor: "pointer",
  width: "fit-content",
};
