"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type SegmentSeconds = {
  intro: number;
  detroit: number;
  grand_rapids: number;
  indy: number;
  ai_initiatives: number;
};

const DEADLINE_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function SettingsForm({
  initialStyleGuide,
  initialWordsPerMinute,
  initialSegmentSeconds,
  initialTotalTargetSeconds,
  initialDeadlineDay,
  initialDeadlineTime,
  initialTimezone,
  apiKeyConfigured,
}: {
  initialStyleGuide: string;
  initialWordsPerMinute: number;
  initialSegmentSeconds: SegmentSeconds;
  initialTotalTargetSeconds: number;
  initialDeadlineDay: string;
  initialDeadlineTime: string;
  initialTimezone: string;
  apiKeyConfigured: boolean;
}) {
  const router = useRouter();
  const [styleGuide, setStyleGuide] = useState(initialStyleGuide);
  const [wordsPerMinute, setWordsPerMinute] = useState(initialWordsPerMinute);
  const [segmentSeconds, setSegmentSeconds] = useState(initialSegmentSeconds);
  const [totalTargetSeconds, setTotalTargetSeconds] = useState(initialTotalTargetSeconds);
  const [deadlineDay, setDeadlineDay] = useState(initialDeadlineDay);
  const [deadlineTime, setDeadlineTime] = useState(initialDeadlineTime);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateSegment(key: keyof SegmentSeconds, value: number) {
    setSaved(false);
    setSegmentSeconds((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);

    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        styleGuide,
        wordsPerMinute,
        segmentSeconds,
        totalTargetSeconds,
        submissionDeadlineDay: deadlineDay,
        submissionDeadlineTime: deadlineTime,
        timezone,
      }),
    });

    setSaving(false);
    setSaved(true);
    router.refresh();
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
        <h3 style={{ marginTop: 0 }}>Voice &amp; style</h3>
        <label>
          Style guide
          <textarea
            value={styleGuide}
            onChange={(e) => {
              setStyleGuide(e.target.value);
              setSaved(false);
            }}
            rows={6}
            style={textareaStyle}
          />
        </label>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Timing</h3>
        <label style={{ display: "block", marginBottom: "0.75rem" }}>
          Words per minute
          <input
            type="number"
            value={wordsPerMinute}
            onChange={(e) => {
              setWordsPerMinute(Number(e.target.value));
              setSaved(false);
            }}
            style={inputStyle}
          />
        </label>
        <label style={{ display: "block", marginBottom: "0.75rem" }}>
          Total target seconds
          <input
            type="number"
            value={totalTargetSeconds}
            onChange={(e) => {
              setTotalTargetSeconds(Number(e.target.value));
              setSaved(false);
            }}
            style={inputStyle}
          />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
          {(Object.keys(segmentSeconds) as (keyof SegmentSeconds)[]).map((key) => (
            <label key={key}>
              {key.replace("_", " ")} (sec)
              <input
                type="number"
                value={segmentSeconds[key]}
                onChange={(e) => updateSegment(key, Number(e.target.value))}
                style={inputStyle}
              />
            </label>
          ))}
        </div>
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
                setSaved(false);
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
                setSaved(false);
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
                setSaved(false);
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
  width: "100%",
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
