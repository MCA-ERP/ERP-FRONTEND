"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase/client";
import { API_BASE, fetchServerUser, getAuthHeaders, homePathFor } from "@/lib/api";
import { ErrorBanner, Field, btnPrimary, inputCls } from "@/components/admin/ui";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [home, setHome] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      try {
        const me = await fetchServerUser(data.session.access_token);
        if (!me.mustChangePassword) router.replace(homePathFor(me));
        else setHome(homePathFor(me));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not verify your account.");
      }
    })();
  }, [router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");

    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);

      const res = await fetch(`${API_BASE}/auth/password-changed`, { method: "POST", headers: await getAuthHeaders() });
      if (!res.ok) throw new Error("Your password was changed, but the account could not be updated. Please sign in again.");

      router.replace(home ?? "/school");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-mca-cloud p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-xl text-slate-900">Set a new password</h1>
          <p className="mt-1 text-sm text-slate-500">Your administrator gave you a temporary password. Choose your own to continue.</p>
        </div>
        <ErrorBanner message={error} />
        <Field label="New password" hint="At least 8 characters.">
          <input type="password" autoComplete="new-password" className={inputCls} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Confirm password">
          <input type="password" autoComplete="new-password" className={inputCls} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <button type="submit" className={`${btnPrimary} w-full`} disabled={saving || !home}>
          {saving ? "Saving…" : "Save and continue"}
        </button>
      </form>
    </main>
  );
}
