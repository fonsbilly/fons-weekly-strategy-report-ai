"use client";

import type { CSSProperties } from "react";

export default function RemindButton({
  recipients,
  names,
  weekStart,
}: {
  recipients: string[];
  names: string[];
  weekStart: string;
}) {
  if (recipients.length === 0) return null;

  const subject = `Weekly strategy report reminder - week of ${weekStart}`;
  const body = `Hi${names.length === 1 ? ` ${names[0].split(" ")[0]}` : ""},

Quick reminder that your weekly strategy report for the week of ${weekStart} hasn't come in yet. Please submit it here before end of day:

https://fons-weekly-strategy-report-ai.vercel.app

Thanks,
Bill`;

  const href = `mailto:${recipients.join(",")}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <a href={href} style={buttonStyle}>
        Remind {recipients.length} non-submitter{recipients.length === 1 ? "" : "s"}
      </a>
      <p style={{ color: "var(--text-muted)", marginTop: "0.5rem", marginBottom: 0 }}>
        Opens your email with {recipients.length === 1 ? "the director" : "them"} pre-filled and a
        reminder written - you just hit send.
      </p>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  display: "inline-block",
  padding: "0.6rem 1.2rem",
  background: "var(--accent)",
  color: "#0f172a",
  borderRadius: 6,
  fontWeight: 600,
  textDecoration: "none",
};
