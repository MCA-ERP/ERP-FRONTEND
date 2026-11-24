"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { Loading } from "../../admissions/m/ui";
import { usePrincipal } from "../context";

const Lbl = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}{hint && <span className="mt-1 block text-[11.5px] text-[#026f9b]">{hint}</span>}</label>;
const FILE = "block w-full text-[13px] text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:px-2 file:py-1 file:text-[13px]";
const readImage = (f: File | undefined): Promise<string | null> => new Promise((res, rej) => { if (!f) return res(null); if (!/^image\/(png|jpeg)$/.test(f.type)) return rej(new Error("Use a PNG or JPG image.")); if (f.size > 150 * 1024) return rej(new Error("Keep the image under 150 KB.")); const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("Could not read that file.")); r.readAsDataURL(f); });

interface Account { profile?: { first_name: string; last_name: string; phone: string | null; email: string }; two_factor?: { enabled: boolean; own_setting: boolean; required_by_platform: boolean } }
interface Mine { designation: string; designations: string[]; photo: string | null; signature: string | null; prefs: Record<string, boolean> }

// ═════════════ Profile ═════════════
export function ProfileSettings() {
  const acc = useLoad(() => schoolFetch<Account>("/auth/account"), []);
  const mine = useLoad(() => schoolFetch<Mine>("/principal/settings"), []);
  const act = useAction(() => { acc.reload(); mine.reload(); });
  const [edit, setEdit] = useState<{ name: string; designation: string; mobile: string } | null>(null);
  const [files, setFiles] = useState<{ photo?: string | null; signature?: string | null }>({});
  const [key, setKey] = useState(0); const [ferr, setFerr] = useState(""); const [saved, setSaved] = useState(false);
  const p = acc.data?.profile; const m = mine.data;
  const f = edit ?? (p && m ? { name: `${p.first_name} ${p.last_name}`.trim(), designation: m.designation, mobile: p.phone ?? "" } : null);
  const pick = async (k: "photo" | "signature", file: File | undefined) => { setFerr(""); setSaved(false); try { const v = await readImage(file); setFiles((x) => ({ ...x, [k]: v })); } catch (e) { setFerr(e instanceof Error ? e.message : "Could not use that file."); } };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (!f) return; setSaved(false);
    const [first, ...rest] = f.name.trim().split(/\s+/);
    const ok = await act.run(async () => {
      await schoolFetch("/auth/account", json("PATCH", { first_name: first, last_name: rest.join(" ") || "-", phone: f.mobile.trim() || null }));
      await schoolFetch("/principal/settings", json("PUT", { designation: f.designation, ...(files.photo !== undefined ? { photo: files.photo } : {}), ...(files.signature !== undefined ? { signature: files.signature } : {}) }));
    });
    if (ok) { setEdit(null); setFiles({}); setKey((k) => k + 1); setSaved(true); }
  };
  return (
    <div>
      <Head title="Profile" subtitle="Your name, designation and contact details. Your official email can’t be changed here." />
      <ErrorBanner message={acc.error || mine.error || act.error || ferr} />
      {!f || !p || !m ? <Loading /> : (
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Profile</h2></div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
            <Lbl label="Full name"><input className={inputCls} required minLength={2} maxLength={200} value={f.name} onChange={(e) => { setEdit({ ...f, name: e.target.value }); setSaved(false); }} /></Lbl>
            <Lbl label="Designation"><select className={inputCls} value={f.designation} onChange={(e) => { setEdit({ ...f, designation: e.target.value }); setSaved(false); }}>{[...new Set(["", f.designation, ...m.designations])].map((d) => <option key={d} value={d}>{d || "—"}</option>)}</select></Lbl>
            <Lbl label="Email" hint="Set by the school"><input className={`${inputCls} bg-slate-50`} value={p.email} disabled /></Lbl>
            <Lbl label="Mobile"><input className={inputCls} maxLength={30} value={f.mobile} onChange={(e) => { setEdit({ ...f, mobile: e.target.value }); setSaved(false); }} /></Lbl>
            <Lbl label="Photo" hint={m.photo ? "A photo is saved" : "PNG or JPG, under 150 KB"}><input key={`p${key}`} type="file" accept="image/png,image/jpeg" className={FILE} onChange={(e) => void pick("photo", e.target.files?.[0])} /></Lbl>
            <Lbl label="Signature" hint="Used on certificates and report cards"><input key={`s${key}`} type="file" accept="image/png,image/jpeg" className={FILE} onChange={(e) => void pick("signature", e.target.files?.[0])} /></Lbl>
          </div>
          {(m.photo || m.signature) && <div className="flex flex-wrap items-center gap-6 border-t border-slate-100 px-5 py-3">{m.photo && <span className="text-[12px] text-slate-500">Photo <img src={m.photo} alt="" className="mt-1 size-16 rounded-full border border-slate-200 object-cover" /></span>}{m.signature && <span className="text-[12px] text-slate-500">Signature <img src={m.signature} alt="" className="mt-1 h-12 rounded border border-slate-200 bg-white object-contain p-1" /></span>}</div>}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">{saved && <span className="mr-auto text-[12.5px] text-[#065740]">Saved.</span>}<button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { setEdit(null); setFiles({}); setKey((k) => k + 1); setSaved(false); }}>Discard</button><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>Save</button></div>
        </form>
      )}
    </div>
  );
}

// ═════════════ Password ═════════════
export function PasswordSettings() {
  const acc = useLoad(() => schoolFetch<Account>("/auth/account"), []);
  const blank = { current: "", next: "", again: "" };
  const [f, setF] = useState(blank); const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const act = useAction(acc.reload);
  const tf = acc.data?.two_factor;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMsg(""); setErr("");
    if (f.next !== f.again) return setErr("The two new passwords are different.");
    if (f.next.length < 10) return setErr("Use at least 10 characters.");
    if (await act.run(() => schoolFetch("/auth/change-password", json("POST", { current_password: f.current, new_password: f.next })))) { setF(blank); setMsg("Password changed. You were signed out of your other devices."); }
  };
  return (
    <div>
      <Head title="Password" subtitle="Change your password and the extra sign-in step." />
      <ErrorBanner message={err || act.error || acc.error} />
      {msg && <p className="mb-3 rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-[13px] text-slate-800">{msg}</p>}
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Change password</h2></div>
        <div className="space-y-4 p-5">
          <Lbl label="Current password"><input type="password" autoComplete="current-password" className={inputCls} required value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} /></Lbl>
          <div className="grid gap-4 sm:grid-cols-2"><Lbl label="New password" hint="At least 10 characters"><input type="password" autoComplete="new-password" className={inputCls} required minLength={10} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></Lbl><Lbl label="Confirm new password"><input type="password" autoComplete="new-password" className={inputCls} required value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} /></Lbl></div>
        </div>
        {tf && <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-3.5"><span><span className="block text-[13.5px] text-slate-900">Two-factor sign-in</span><span className="block text-[11.5px] text-slate-500">{tf.required_by_platform ? "Required by the platform" : "A code is sent when you sign in"}</span></span><Toggle label="Two-factor sign-in" checked={tf.enabled} disabled={tf.required_by_platform || act.busy} onChange={(v) => void act.run(() => schoolFetch("/auth/two-factor", json("PUT", { enabled: v })))} /></div>}
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-3.5"><span className="block text-[13.5px] text-slate-900">Sign out of other devices<span className="block text-[11.5px] text-slate-500">Always done when you change your password</span></span><Toggle label="Sign out of other devices" checked disabled onChange={() => undefined} /></div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { setF(blank); setErr(""); setMsg(""); }}>Discard</button><button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy}>Change password</button></div>
      </form>
    </div>
  );
}

// ═════════════ Notifications ═════════════
interface Note { key: string; tone: string; title: string; href: string; read: boolean }
const CHOICES: [string, string, string][] = [["approvals", "New approvals", "App, as they arrive"], ["summary", "Daily summary", "Attendance, fees and approvals at 9:00 am"], ["concerns", "Escalated parent concerns", "Right away"], ["unmarked", "Classes not marked by 10:30 am", ""], ["fee_weekly", "Fee collection weekly report", "Every Monday"], ["quiet", "Quiet hours", "No notifications from 9 pm to 7 am"]];
export function NotificationSettings() {
  const { refreshBadges } = usePrincipal();
  const list = useLoad(() => schoolFetch<{ items: Note[]; total: number }>("/principal/notifications"), []);
  const mine = useLoad(() => schoolFetch<Mine>("/principal/settings"), []);
  const [edit, setEdit] = useState<Record<string, boolean> | null>(null); const [saved, setSaved] = useState(false);
  const read = useAction(() => { list.reload(); refreshBadges(); });
  const save = useAction(mine.reload);
  const prefs = edit ?? mine.data?.prefs ?? {}; const on = (k: string) => prefs[k] !== false;
  return (
    <div>
      <Head title="Notifications" subtitle="Everything the portal has told you recently, and which notifications you get." />
      <ErrorBanner message={list.error || mine.error || read.error || save.error} />
      <Panel title="All notifications" sub={`${list.data?.total ?? 0} unread`} right={<button type="button" className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400 disabled:opacity-50" disabled={read.busy || !list.data?.total} onClick={() => void read.run(() => schoolFetch("/principal/notifications/read", json("POST", {})))}>Mark all as read</button>}>
        {!list.data ? <Loading /> : !list.data.items.length ? <p className="p-6 text-center text-sm text-slate-400">Nothing new. You are up to date.</p> : <ul>{list.data.items.map((n) => <li key={n.key} className={`border-t border-slate-100 first:border-t-0 ${n.read ? "" : "bg-[#f3f9fd]"}`}><Link href={n.href} onClick={() => void schoolFetch("/principal/notifications/read", json("POST", { keys: [n.key] })).then(refreshBadges, () => undefined)} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50"><span className="min-w-0 flex-1 text-[13.5px] font-semibold text-slate-900">{n.title}</span>{!n.read && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#0294CE]" aria-label="Unread" />}</Link></li>)}</ul>}
      </Panel>
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Notifications</h2></div>
        {CHOICES.map(([k, label, hint]) => <div key={k} className="flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-3.5 first:border-t-0"><span><span className="block text-[13.5px] text-slate-900">{label}</span>{hint && <span className="block text-[11.5px] text-slate-500">{hint}</span>}</span><Toggle label={label} checked={on(k)} onChange={(v) => { setEdit({ ...prefs, [k]: v }); setSaved(false); }} /></div>)}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">{saved && <span className="mr-auto text-[12.5px] text-[#065740]">Saved.</span>}<button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { setEdit(null); setSaved(false); }}>Discard</button><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={save.busy || !edit} onClick={async () => { if (edit && await save.run(() => schoolFetch("/principal/settings", json("PUT", { prefs: edit })))) { setEdit(null); setSaved(true); } }}>Save</button></div>
      </div>
    </div>
  );
}
