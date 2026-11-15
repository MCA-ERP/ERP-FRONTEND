"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { ErrorBanner, Field, btnPrimary, inputCls } from "@/components/admin/ui";

/**
 * Where the "Reset your password" email link lands. It is public (not behind the sign-in gate): the link
 * itself signs the person in for this one step, then they choose a new password and go back to sign in.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // The email link can come back with an error in the address (#error=...) when it was used or has expired.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const urlError = hash.get("error_description") || query.get("error_description");
    if (urlError) {
      setLinkError(urlError.replace(/\+/g, " "));
      setChecked(true);
      return;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        setReady(true);
        setChecked(true);
      }
    });
    // Give the link a moment to be exchanged for a session before deciding it did not work.
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
      setChecked(true);
    }, 2500);
    return () => {
      sub.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      await supabase.auth.signOut();
      setDone(true);
      window.setTimeout(() => router.replace("/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-mca-cloud p-6">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl text-slate-900">Reset your password</h1>
          <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>
        </div>

        {done ? (
          <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Password changed. Taking you to sign in…
          </p>
        ) : !checked ? (
          <p className="py-6 text-center text-sm text-slate-400">Checking your link…</p>
        ) : !ready ? (
          <div className="space-y-3">
            <ErrorBanner message={linkError || "This reset link is invalid or has expired."} />
            <p className="text-sm text-slate-500">
              Open the link in the same browser where you asked for it, and use it only once. Then request a new one from the sign-in page.
            </p>
            <Link href="/login" className={`${btnPrimary} block w-full text-center`}>Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <ErrorBanner message={error} />
            <Field label="New password" hint="At least 8 characters.">
              <input type="password" autoComplete="new-password" className={inputCls} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Field label="Confirm password">
              <input type="password" autoComplete="new-password" className={inputCls} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
            <button type="submit" className={`${btnPrimary} w-full`} disabled={saving}>
              {saving ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
