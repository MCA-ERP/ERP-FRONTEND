"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { API_BASE } from "@/lib/api";

/** Signs out: tells the backend (so the session is closed and recorded), clears the browser session, goes to the sign-in page. */
export function useSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const signOut = async () => {
    setBusy(true);
    setError("");
    try {
      const { data: s } = await supabase.auth.getSession();
      if (s.session) {
        await fetch(`${API_BASE}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${s.session.access_token}` } }).catch(() => undefined);
      }
      const { error: err } = await supabase.auth.signOut();
      if (err) {
        setError(err.message);
        return;
      }
      router.replace("/login?signedout=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to log out. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return { signOut, busy, error };
}

export default function LogoutButton() {
  const { signOut, busy, error } = useSignOut();
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/15 disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "Logging out…" : "Log out"}
      </button>
      {error && <p role="alert" className="max-w-52 text-right text-xs text-rose-600">{error}</p>}
    </div>
  );
}
