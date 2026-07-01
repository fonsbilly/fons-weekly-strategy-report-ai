"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 360, margin: "6rem auto", padding: "0 1rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Weekly Strategy Report</h1>
      <p style={{ color: "var(--text-muted)", marginTop: 0, marginBottom: "2rem" }}>Sign in</p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        {error && <p style={{ color: "#f87171", margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "0.35rem",
  padding: "0.6rem",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  fontSize: "1rem",
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
};
