"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { allocateTime, wordTarget } from "@/lib/timing";
import WpmTest from "./WpmTest";

const DEADLINE_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function SettingsForm({
  initialStyleGuide,
  wordsPerMinute,
  wpmCalibrated,
  initialTotalTargetSeconds,
  initialIntroSeconds,
  initialAiSeconds,
  activeBranchCount,
  initialDeadlineDay,
  initialDeadlineTime,
  initialTimezone,
  apiKeyConfigured,
}: {
  initialStyleGuide: string;
  wordsPerMinute: number;
  wpmCalibrated: boolean;
  initialTotalTargetSeconds: number;
  initialIntroSeconds: number;
  initialAiSeconds: number;
  activeBranchCount: number;
  initialDeadlineDay: string;
  initialDeadlineTime: string;
  initialTimezone: string;
  apiKeyConfigured: boolean;
}) {
  const router = useRouter();
  const [styleGuide, setStyleGuide] = useState(initialStyleGuide);
  const [totalTargetSeconds, setTotalTargetSeconds] = useState(initialTotalTargetSeconds);
  const [introSeconds, setIntroSeconds] = useState(initialIntroSeconds);
  const [aiSeconds, setAiSeconds] = useState(initialAiSeconds);
  const [deadlineDay, setDeadlineDay] = useState(initialDeadlineDay);
  const [deadlineTime, setDeadlineTime] = useState(initialDeadlineTime);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [showTest, setShowTest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const allocation = allocateTime(totalTargetSeconds, introSeconds, aiSeconds, activeBranchCount);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        styleGuide,
        totalTargetSeconds,
        introSeconds,
        aiSeconds,
        submissionDeadlineDay: deadlineDay,
        submissionDeadlineTime: deadlineTime,
        timezone,
      }),
    });

    setSaving(false);
    setSaved(true);
    router.refresh();
  }

  function markDirty() {
    setSaved(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: 720 }}>
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Anthropic API key</h3>
        <p style={{ margin: 0 }}>
          Status:{" "}
          <strong style={{ color: apiKeyConfigured ? "#4ade80" : "#f87171" }}>
            {apiKeyConfigured ? "Configured" : "Not configured"}
          </strong>
        </p>
        <p style={{ color: "var(--text-muted)", marginBottom: 0 }}>
          Set or rotate this in the{" "}
          <a
            href="https://vercel.com/fons1/fons-weekly-strategy-report-ai/settings/environments"
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--accent)" }}
          >
            Vercel dashboard
          </a>{" "}
          (Environment Variables, key <code>ANTHROPIC_API_KEY</code>) - it's never stored in this
          app's database.
        </p>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Reading speed</h3>
        <p style={{ margin: "0 0 0.5rem" }}>
          Current: <strong>{wordsPerMinute} words per minute</strong>{" "}
          {wpmCalibrated ? (
            <span style={{ color: "#4ade80" }}>(calibrated)</span>
          ) : (
            <span style={{ color: "#facc15" }}>(not yet calibrated - default value)</span>
          )}
        </p>
        <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
          This sets how many words fit in each timed segment so the script reads to time at your
          natural pace.
        </p>
        {!showTest ? (
          <button type="button" onClick={() => setShowTest(true)} style={secondaryButtonStyle}>
            {wpmCalibrated ? "Retake reading test" : "Take reading test"}
          </button>
        ) : (
          <WpmTest onSaved={() => setShowTest(false)} />
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Talk time</h3>
        <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
          Total time is split automatically: intro and AI get fixed amounts, and the rest is
          divided evenly across your {activeBranchCount} active{" "}
          {activeBranchCount === 1 ? "branch" : "branches"}.
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <label>
            Total seconds
            <input
              type="number"
              value={totalTargetSeconds}
              onChange={(e) => {
                setTotalTargetSeconds(Number(e.target.value));
                markDirty();
              }}
              style={inputStyle}
            />
          </label>
          <label>
            Intro seconds
            <input
              type="number"
              value={introSeconds}
              onChange={(e) => {
                setIntroSeconds(Number(e.target.value));
                markDirty();
              }}
              style={inputStyle}
            />
          </label>
          <label>
            AI seconds
            <input
              type="number"
              value={aiSeconds}
              onChange={(e) => {
                setAiSeconds(Number(e.target.value));
                markDirty();
              }}
              style={inputStyle}
            />
          </label>
        </div>
        <div style={{ background: "var(--surface)", borderRadius: 6, padding: "0.75rem" }}>
          <strong>Computed allocation</strong>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem", color: "var(--text-muted)" }}>
            <li>
              Intro: {introSeconds}s (~{wordTarget(introSeconds, wordsPerMinute)} words)
            </li>
            <li>
              Each branch: {allocation.perBranchSeconds}s (~
              {wordTarget(allocation.perBranchSeconds, wordsPerMinute)} words)
            </li>
            <li>
              AI: {aiSeconds}s (~{wordTarget(aiSeconds, wordsPerMinute)} words)
            </li>
          </ul>
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Voice &amp; style</h3>
        <label>
          Style guide
          <textarea
            value={styleGuide}
            onChange={(e) => {
              setStyleGuide(e.target.value);
              markDirty();
            }}
            rows={6}
            style={textareaStyle}
          />
        </label>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Submission deadline</h3>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <label>
            Day
            <select
              value={deadlineDay}
              onChange={(e) => {
                setDeadlineDay(e.target.value);
                markDirty();
              }}
              style={inputStyle}
            >
              {DEADLINE_DAYS.map((d) => (
                <option key={d} value={d}>
                  {d[0].toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Time
            <input
              type="time"
              value={deadlineTime.slice(0, 5)}
              onChange={(e) => {
                setDeadlineTime(`${e.target.value}:00`);
                markDirty();
              }}
              style={inputStyle}
            />
          </label>
          <label>
            Timezone
            <input
              type="text"
              value={timezone}
              onChange={(e) => {
                setTimezone(e.target.value);
                markDirty();
              }}
              style={inputStyle}
            />
          </label>
        </div>
      </div>

      <div>
        <button type="submit" disabled={saving} style={buttonStyle}>
          {saving ? "Saving..." : "Save settings"}
        </button>
        {saved && <span style={{ color: "#4ade80", marginLeft: "0.75rem" }}>Saved.</span>}
      </div>
    </form>
  );
}

const cardStyle: CSSProperties = {
  padding: "1rem",
  border: "1px solid var(--border)",
  borderRadius: 8,
};

const inputStyle: CSSProperties = {
  display: "block",
  width: "160px",
  marginTop: "0.35rem",
  padding: "0.55rem",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "0.95rem",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  width: "100%",
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

const secondaryButtonStyle: CSSProperties = {
  padding: "0.6rem 1.2rem",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "0.95rem",
  cursor: "pointer",
};
