"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Branch } from "@/lib/types";

const BRANCH_OPTIONS: { value: Branch; label: string }[] = [
  { value: "detroit", label: "Detroit" },
  { value: "grand_rapids", label: "Grand Rapids" },
  { value: "indianapolis", label: "Indianapolis" },
];

export default function AddDirectorForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [branch, setBranch] = useState<Branch>("detroit");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const res = await fetch("/api/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName, branch }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to add director.");
      return;
    }

    setSuccess(`Invite sent to ${email}.`);
    setEmail("");
    setFullName("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "1rem",
        alignItems: "flex-end",
        padding: "1rem",
        border: "1px solid var(--border)",
        borderRadius: 8,
        marginBottom: "1.5rem",
      }}
    >
      <label style={{ flex: "1 1 180px" }}>
        Full name
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          style={inputStyle}
        />
      </label>
      <label style={{ flex: "1 1 220px" }}>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
      </label>
      <label style={{ flex: "1 1 160px" }}>
        Branch
        <select value={branch} onChange={(e) => setBranch(e.target.value as Branch)} style={inputStyle}>
          {BRANCH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={loading} style={buttonStyle}>
        {loading ? "Adding..." : "Add director"}
      </button>
      {error && <p style={{ color: "#f87171", width: "100%", margin: 0 }}>{error}</p>}
      {success && <p style={{ color: "#4ade80", width: "100%", margin: 0 }}>{success}</p>}
    </form>
  );
}

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

const buttonStyle: CSSProperties = {
  padding: "0.6rem 1.2rem",
  background: "var(--accent)",
  border: "none",
  borderRadius: 6,
  color: "#0f172a",
  fontWeight: 600,
  cursor: "pointer",
  height: "fit-content",
};
