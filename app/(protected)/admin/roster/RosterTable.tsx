"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";

const BRANCH_LABELS: Record<string, string> = {
  detroit: "Detroit",
  grand_rapids: "Grand Rapids",
  indianapolis: "Indianapolis",
};

export default function RosterTable({ directors }: { directors: Profile[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function toggleActive(id: string, isActive: boolean) {
    setPendingId(id);
    await fetch("/api/roster", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    setPendingId(null);
    router.refresh();
  }

  if (directors.length === 0) {
    return <p style={{ color: "var(--text-muted)" }}>No directors added yet.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
          <th style={thStyle}>Name</th>
          <th style={thStyle}>Email</th>
          <th style={thStyle}>Branch</th>
          <th style={thStyle}>Status</th>
          <th style={thStyle}></th>
        </tr>
      </thead>
      <tbody>
        {directors.map((d) => (
          <tr key={d.id} style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={tdStyle}>{d.full_name}</td>
            <td style={tdStyle}>{d.email}</td>
            <td style={tdStyle}>{d.branch ? BRANCH_LABELS[d.branch] : "—"}</td>
            <td style={tdStyle}>{d.is_active ? "Active" : "Deactivated"}</td>
            <td style={tdStyle}>
              <button
                onClick={() => toggleActive(d.id, d.is_active)}
                disabled={pendingId === d.id}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text)",
                  padding: "0.35rem 0.7rem",
                  cursor: "pointer",
                }}
              >
                {d.is_active ? "Deactivate" : "Reactivate"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const thStyle = { padding: "0.5rem", color: "var(--text-muted)", fontWeight: 500 };
const tdStyle = { padding: "0.5rem" };
