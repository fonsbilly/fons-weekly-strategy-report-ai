"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

export default function DateRangeControl({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState(from);
  const [toDate, setToDate] = useState(to);

  function apply() {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    router.push(`/trends?${params.toString()}`);
  }

  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "1.5rem" }}>
      <label>
        From
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
      </label>
      <label>
        To
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
      </label>
      <button onClick={apply} style={buttonStyle}>
        Apply range
      </button>
    </div>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  marginTop: "0.35rem",
  padding: "0.55rem",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "0.95rem",
};

const buttonStyle: CSSProperties = {
  padding: "0.6rem 1.2rem",
  background: "transparent",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "0.95rem",
  cursor: "pointer",
};
