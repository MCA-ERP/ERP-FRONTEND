"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { API_BASE } from "@/lib/api";
import { ErrorBanner, Field, btnPrimary, inputCls } from "@/components/admin/ui";

/** Where a family creates its Applicant account: the school's code, then its own details. Public (no sign-in). */
export default function ApplyPage() {
  const [code, setCode] = useState("");
  const [school, setSchool] = useState<{ name: string; code: string } | null>(null);
  const [f, setF] = useState({ first_name: "", last_name: "", email: "", mobile: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  async function find(e: FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/public/applicant/school/${encodeURIComponent(code.trim())}`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not check the school code.");
      setSchool(body);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not check the school code."); } finally { setBusy(false); }
  }
  async function create(e: FormEvent) {
    e.preventDefault(); if (!school) return; setError(""); setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/public/applicant/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ school_code: school.code, ...f }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not create your account.");
      setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create your account."); } finally { setBusy(false); }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f5f7] p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mca-logo.svg" alt="My Class Assist" style={{ width: 112, height: "auto" }} />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Apply for admission</h1>
        {done ? (
          <div className="mt-4 space-y-4 text-sm text-slate-700">
            <p>Your family account is ready for {school?.name}. Sign in with your email and password to start.</p>
            <Link href="/login" className={`${btnPrimary} inline-block`}>Sign in</Link>
          </div>
        ) : !school ? (
          <form onSubmit={find} className="mt-4 space-y-4">
            <p className="text-sm text-slate-600">Enter the school code the school gave you.</p>
            <Field label="School code"><input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} placeholder="For example, BANYAN" required autoFocus /></Field>
            {error && <ErrorBanner message={error} />}
            <button type="submit" disabled={busy || !code.trim()} className={btnPrimary}>{busy ? "Checking…" : "Continue"}</button>
            <p className="text-[13px] text-slate-600">Already have an account? <Link href="/login" className="font-semibold text-[#0294CE]">Sign in</Link></p>
          </form>
        ) : (
          <form onSubmit={create} className="mt-4 space-y-3">
            <p className="text-sm text-slate-600">Creating an account with <b className="text-slate-900">{school.name}</b>. <button type="button" onClick={() => setSchool(null)} className="font-semibold text-[#0294CE]">Change</button></p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name"><input className={inputCls} value={f.first_name} onChange={(e) => set("first_name", e.target.value)} required /></Field>
              <Field label="Last name"><input className={inputCls} value={f.last_name} onChange={(e) => set("last_name", e.target.value)} required /></Field>
            </div>
            <Field label="Email"><input type="email" className={inputCls} value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" required /></Field>
            <Field label="Mobile number" hint="The school contacts you on this number."><input type="tel" className={inputCls} value={f.mobile} onChange={(e) => set("mobile", e.target.value)} autoComplete="tel" required /></Field>
            <Field label="Password" hint="At least 8 characters."><input type="password" className={inputCls} value={f.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" minLength={8} required /></Field>
            {error && <ErrorBanner message={error} />}
            <button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Creating…" : "Create account"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
