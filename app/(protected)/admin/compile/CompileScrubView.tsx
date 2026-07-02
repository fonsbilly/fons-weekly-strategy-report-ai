"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

type SubmissionRow = {
  director_id: string;
  director_name: string;
  branch: string;
  positives: string;
  challenges: string;
  narrative: string;
};

type MissingRow = {
  director_id: string;
  director_name: string;
  branch: string;
};

const BRANCH_LABELS: Record<string, string> = {
  detroit: "Detroit",
  grand_rapids: "Grand Rapids",
  indianapolis: "Indianapolis",
};

const FIELDS: { key: "positives" | "challenges" | "narrative"; label: string }[] = [
  { key: "positives", label: "Positives" },
  { key: "challenges", label: "Challenges" },
  { key: "narrative", label: "Narrative" },
];

export default function CompileScrubView({
  weekStart,
  submissions,
  missing,
  initialSelectedFields,
  initialAiContent,
  initialUseHistoryBranches,
}: {
  weekStart: string;
  submissions: SubmissionRow[];
  missing: MissingRow[];
  initialSelectedFields: Record<string, string[]>;
  initialAiContent: string;
  initialUseHistoryBranches: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, string[]>>(initialSelectedFields);
  const [aiContent, setAiContent] = useState(initialAiContent);
  const [useHistory, setUseHistory] = useState<Set<string>>(new Set(initialUseHistoryBranches));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleField(directorId: string, field: string) {
    setSaved(false);
    setSelected((prev) => {
      const current = prev[directorId] ?? [];
      const next = current.includes(field)
        ? current.filter((f) => f !== field)
        : [...current, field];
      return { ...prev, [directorId]: next };
    });
  }

  function toggleHistory(branch: string) {
    setSaved(false);
    setUseHistory((prev) => {
      const next = new Set(prev);
      if (next.has(branch)) {
        next.delete(branch);
      } else {
        next.add(branch);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart,
        selectedFields: selected,
        aiInitiativesContent: aiContent,
        useHistoryBranches: Array.from(useHistory),
      }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {submissions.length === 0 && missing.length === 0 && (
        <p style={{ color: "var(--text-muted)" }}>No directors on the roster yet.</p>
      )}

      {submissions.map((s) => (
        <div key={s.director_id} style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: "0.75rem" }}>
            {BRANCH_LABELS[s.branch] ?? s.branch} — {s.director_name}
          </h3>
          {FIELDS.map((f) => (
            <div key={f.key} style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={(selected[s.director_id] ?? []).includes(f.key)}
                  onChange={() => toggleField(s.director_id, f.key)}
                  style={{ marginTop: "0.3rem" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ color: "var(--text-muted)", marginBottom: "0.2rem" }}>{f.label}</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{s[f.key] || "(empty)"}</div>
                </div>
              </label>
            </div>
          ))}
        </div>
      ))}

      {missing.map((m) => (
        <div key={m.director_id} style={{ ...cardStyle, borderColor: "#facc15" }}>
          <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>
            {BRANCH_LABELS[m.branch] ?? m.branch} — {m.director_name}
          </h3>
          <p style={{ color: "#facc15", marginTop: 0, marginBottom: "0.75rem" }}>
            No submission this week. The script will leave this segment brief rather than
            inventing content, unless you opt in below.
          </p>
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={useHistory.has(m.branch)}
              onChange={() => toggleHistory(m.branch)}
            />
            Use their last 4 weeks of reports to draft a continuation update instead of leaving
            this blank
          </label>
        </div>
      ))}

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: "0.75rem" }}>AI Initiatives</h3>
        <textarea
          value={aiContent}
          onChange={(e) => {
            setAiContent(e.target.value);
            setSaved(false);
          }}
          rows={5}
          style={textareaStyle}
          placeholder="Write your own AI Initiatives update for this week's script..."
        />
      </div>

      <div>
        <button onClick={handleSave} disabled={saving} style={buttonStyle}>
          {saving ? "Saving..." : "Save selections"}
        </button>
        {saved && <span style={{ color: "#4ade80", marginLeft: "0.75rem" }}>Saved.</span>}
      </div>
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
