"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        background: "transparent",
        border: "1px solid var(--border)",
        borderRadius: 6,
        color: "var(--text)",
        padding: "0.4rem 0.75rem",
        cursor: "pointer",
      }}
    >
      Sign out
    </button>
  );
}
