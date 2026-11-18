"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { setLocaleConfig } from "@/lib/locale-format";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Field as FormField, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { small, smallPrimary } from "../schools/pages/shared";
import { Fields, Field, Select, SelectLine, SettingsCard, ToggleLine, useSettings } from "./kit";
import type { Opt } from "./kit";

const has = (t: string, q: string) => !q.trim() || t.toLowerCase().includes(q.trim().toLowerCase());
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="grid grid-cols-[7rem_1fr] gap-3 py-1.5 text-sm"><dt className="text-slate-500">{k}</dt><dd className="break-words font-medium text-slate-900">{v}</dd></div>;
const Footer = ({ on }: { on: () => void }) => <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={on}>Close</button></div>;
const Search = ({ v, set, label }: { v: string; set: (s: string) => void; label: string }) => <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder={label} aria-label={label} value={v} onChange={(e) => set(e.target.value)} /></div>;
const text = (v: unknown) => (typeof v === "string" ? v : "");

// ═════════════ General settings ═════════════
export type GeneralTab = "name" | "logo" | "contact";
export function GeneralPages({ tab }: { tab: GeneralTab }) {
  return tab === "name" ? <PlatformName /> : tab === "logo" ? <Logos /> : <Contact />;
}

function Inputs({ s, items, cols }: { s: ReturnType<typeof useSettings>; items: [string, string, string?][]; cols: 3 | 5 }) {
  return (
    <Fields cols={cols}>
      {items.map(([key, label, hint]) => <Field key={key} label={label} hint={hint}><input className={inputCls} maxLength={150} value={text(s.draft[key])} onChange={(e) => s.set(key, e.target.value)} /></Field>)}
    </Fields>
  );
}

function PlatformName() {
  const s = useSettings({ "general.platform_name": "", "general.short_name": "", "general.tagline": "", "general.company": "", "general.main_domain": "", "general.app_store_name": "" });
  return (
    <SettingsCard title="Platform name" s={s} onSubmit={(e) => void s.save(e)}>
      <Inputs s={s} cols={5} items={[["general.platform_name", "Platform name"], ["general.short_name", "Short name", "Used where space is tight"], ["general.tagline", "Tagline"], ["general.company", "Registered company"], ["general.main_domain", "Main domain"], ["general.app_store_name", "App name in stores"]]} />
    </SettingsCard>
  );
}

function Contact() {
  const s = useSettings({ "general.support_email": "", "general.support_phone": "", "contact.whatsapp": "", "contact.hours": "", "contact.sales_email": "", "contact.address": "" });
  return (
    <SettingsCard title="Contact" s={s} saveLabel="Save contact details" onSubmit={(e) => void s.save(e)}>
      <Inputs s={s} cols={5} items={[["general.support_email", "Support email"], ["general.support_phone", "Support phone"], ["contact.whatsapp", "WhatsApp"], ["contact.hours", "Support hours"], ["contact.sales_email", "Sales email"]]} />
      <div className="px-5 pb-5"><Field label="Office address"><textarea className={`${inputCls} min-h-[5rem]`} maxLength={400} value={text(s.draft["contact.address"])} onChange={(e) => s.set("contact.address", e.target.value)} /></Field></div>
    </SettingsCard>
  );
}

const MAX_IMAGE = 400 * 1024;
function Logos() {
  const s = useSettings({ "branding.logo_url": "", "branding.mark_url": "", "branding.favicon_url": "", "branding.invoice_logo_url": "" });
  const [fileError, setFileError] = useState("");
  const pick = (key: string, file: File | undefined) => {
    setFileError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) { setFileError("Choose an image file."); return; }
    if (file.size > MAX_IMAGE) { setFileError("Keep each image under 400 KB."); return; }
    const r = new FileReader();
    r.onload = () => s.set(key, String(r.result));
    r.readAsDataURL(file);
  };
  const files: [string, string, string][] = [["branding.logo_url", "Main logo", "Shown in the sidebar and emails"], ["branding.mark_url", "Logo mark", "Square, for app icons"], ["branding.favicon_url", "Favicon", "32 × 32 PNG"], ["branding.invoice_logo_url", "Invoice logo", "Printed on invoices"]];
  const current = text(s.draft["branding.logo_url"]) || "/mca-logo.svg";
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <SettingsCard title="Logo" s={{ ...s, error: fileError || s.error, discard: () => { s.discard(); setFileError(""); } }} saveLabel="Save logos" onSubmit={(e: FormEvent) => void s.save(e)}>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          {files.map(([key, label, hint]) => (
            <Field key={key} label={label} hint={hint}>
              <input type="file" accept="image/*" className={`${inputCls} file:mr-2`} onChange={(e) => pick(key, e.target.files?.[0])} />
            </Field>
          ))}
        </div>
      </SettingsCard>
      <Panel title="Current logo">
        <div className="grid min-h-[12rem] place-items-center p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt="Current logo" className="max-h-32 max-w-full object-contain" />
        </div>
      </Panel>
    </div>
  );
}

// ═════════════ Regional settings ═════════════
export type RegionalTab = "country" | "state" | "timezone";
export function RegionalPages({ tab }: { tab: RegionalTab }) {
  return tab === "country" ? <Countries /> : tab === "state" ? <States /> : <Timezone />;
}

const COUNTRIES: [string, string, string][] = [["IN", "India", "Default · ₹ INR"], ["AE", "United Arab Emirates", "AED · for Indian-curriculum schools"], ["NP", "Nepal", "NPR"], ["LK", "Sri Lanka", "LKR"], ["BD", "Bangladesh", "BDT"]];
function Countries() {
  const s = useSettings({ "regional.countries": ["IN"] });
  const on = (s.draft["regional.countries"] as string[]) ?? [];
  const toggle = (code: string, v: boolean) => s.set("regional.countries", v ? [...new Set([...on, code])] : on.filter((c) => c !== code));
  return (
    <SettingsCard title="Countries" s={s} onSubmit={(e) => void s.save(e)}>
      {COUNTRIES.map(([code, name, hint]) => <ToggleLine key={code} label={name} hint={hint} checked={code === "IN" || on.includes(code)} disabled={code === "IN"} onChange={(v) => toggle(code, v)} />)}
    </SettingsCard>
  );
}

interface StateRow { name: string; schools: number; enabled: boolean; locked: boolean }
function States() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ states: StateRow[] }>("/system/states"), []);
  const act = useAction(reload);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (data) setOff(new Set(data.states.filter((x) => !x.enabled).map((x) => x.name))); }, [data]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const enabled = (data?.states ?? []).filter((x) => !off.has(x.name)).map((x) => x.name);
    if (await act.run(() => adminFetch("/settings", json("PUT", { values: { "regional.states": enabled } })))) setSaved(true);
  };
  const discard = () => { if (data) setOff(new Set(data.states.filter((x) => !x.enabled).map((x) => x.name))); setSaved(false); };
  const flip = (name: string, v: boolean) => { setSaved(false); setOff((o) => { const n = new Set(o); if (v) n.delete(name); else n.add(name); return n; }); };
  return (
    <SettingsCard title="States" s={{ busy: act.busy, saved, error: error || act.error, discard, ready: !!data }} onSubmit={save}>
      {loading && <p className="px-5 py-6 text-sm text-slate-400">Loading…</p>}
      {(data?.states ?? []).map((x) => <ToggleLine key={x.name} label={x.name} hint={x.schools ? `${x.schools} ${x.schools === 1 ? "school" : "schools"}` : "No schools yet"} checked={!off.has(x.name)} disabled={x.locked} onChange={(v) => flip(x.name, v)} />)}
    </SettingsCard>
  );
}

const ZONES: Opt[] = [["Asia/Kolkata", "Asia/Kolkata (IST, UTC+05:30)"], ["Asia/Dubai", "Asia/Dubai (GST, UTC+04:00)"], ["Asia/Singapore", "Asia/Singapore (SGT, UTC+08:00)"], ["Europe/London", "Europe/London (UK time)"], ["America/New_York", "America/New_York (Eastern)"], ["UTC", "UTC"]];
function Timezone() {
  const s = useSettings({ "locale.timezone": "Asia/Kolkata", "locale.schools_own_timezone": false, "locale.show_viewer_timezone": false });
  return (
    <SettingsCard title="Time zone" s={s} onSubmit={async (e) => { if (await s.save(e)) setLocaleConfig({ time_zone: String(s.draft["locale.timezone"]) }); }}>
      <div className="p-5"><Field label="Platform time zone"><Select label="Platform time zone" value={s.draft["locale.timezone"]} onChange={(v) => s.set("locale.timezone", String(v))} options={ZONES} /></Field></div>
      <ToggleLine label="Let schools set their own time zone" hint="For schools outside India" checked={s.draft["locale.schools_own_timezone"] === true} onChange={(v) => s.set("locale.schools_own_timezone", v)} />
      <ToggleLine label="Show times in the viewer's time zone" hint="In the Super Admin portal" checked={s.draft["locale.show_viewer_timezone"] === true} onChange={(v) => s.set("locale.show_viewer_timezone", v)} />
    </SettingsCard>
  );
}

// ═════════════ Language ═════════════
export type LanguageTab = "list" | "translation";
export function LanguagePages({ tab }: { tab: LanguageTab }) {
  return tab === "list" ? <LanguageList /> : <Translations />;
}

interface Lang { code: string; name: string; status: "active" | "draft"; is_default: boolean; translated: number }
function LanguageList() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ languages: Lang[] }>("/system/languages"), []);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Lang | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", code: "" });
  const [formError, setFormError] = useState("");
  useEffect(() => {
    const h = (e: Event) => { if ((e as CustomEvent).detail === "system-settings/language") { setFormError(""); setF({ name: "", code: "" }); setAdding(true); } };
    window.addEventListener("mca-cta", h);
    return () => window.removeEventListener("mca-cta", h);
  }, []);
  const rows = (data?.languages ?? []).filter((l) => has(`${l.name} ${l.code}`, search));
  const state = (l: Lang): [string, "info" | "good" | "mute"] => (l.is_default ? ["Default", "info"] : l.status === "active" ? ["Active", "good"] : ["Draft", "mute"]);
  const add = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await act.run(async () => { try { await adminFetch("/system/languages", json("POST", f)); } catch (err) { setFormError(err instanceof Error ? err.message : "Save failed."); throw err; } });
    if (ok) setAdding(false);
  };
  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Panel title="Languages" sub={`${rows.length} languages`} right={<ExportPrint name="languages" head={["Language", "Code", "Translated", "Status"]} rows={rows.map((l) => [l.name, l.code, `${l.translated}%`, state(l)[0]])} />}>
        <Search v={search} set={setSearch} label="Search languages" />
        <SimpleTable head={[{ h: "Language" }, { h: "Code" }, { h: "Translated" }, { h: "Status" }, { h: "" }]} empty={loading ? "Loading…" : "No languages."}
          rows={rows.map((l) => [<b key="n" className="font-semibold text-slate-900">{l.name}</b>, l.code,
            <span key="t" className="flex items-center gap-3"><span className="h-1.5 w-40 overflow-hidden rounded-full bg-[#dceff9]"><span className="block h-full rounded-full bg-[#0294ce]" style={{ width: `${l.translated}%` }} /></span><span className="text-xs tabular-nums text-slate-700">{l.translated}%</span></span>,
            <Chip key="s" tone={state(l)[1]}>{state(l)[0]}</Chip>,
            <span key="a" className="flex gap-1.5">{!l.is_default && l.status === "draft" && <button type="button" className={smallPrimary} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/system/languages/${l.code}`, json("PATCH", { status: "active" })))}>Publish</button>}<button type="button" className={small} onClick={() => setView(l)}>View details</button></span>])} />
      </Panel>
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Language" v={view.name} /><Row k="Code" v={view.code} /><Row k="Translated" v={`${view.translated}%`} /><Row k="Status" v={state(view)[0]} /></dl><Footer on={() => setView(null)} /></>}</Modal>
      <Modal open={adding} title="Add language" onClose={() => setAdding(false)}>
        <form onSubmit={add} className="space-y-3">
          <ErrorBanner message={formError} />
          <FormField label="Language"><input className={inputCls} required maxLength={60} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></FormField>
          <FormField label="Code" hint="Two letters, like gu."><input className={inputCls} required maxLength={10} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></FormField>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Add language</button></div>
        </form>
      </Modal>
    </div>
  );
}

interface TData { languages: { code: string; name: string }[]; keys: { key: string; english: string; values: Record<string, string> }[] }
function Translations() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<TData>("/system/translations"), []);
  const act = useAction(reload);
  const [vals, setVals] = useState<Record<string, Record<string, string>>>({});
  const [saved, setSaved] = useState(false);
  const fresh = () => Object.fromEntries((data?.keys ?? []).map((k) => [k.key, { ...k.values }]));
  useEffect(() => { if (data) setVals(Object.fromEntries(data.keys.map((k) => [k.key, { ...k.values }]))); }, [data]);
  const edit = (key: string, code: string, v: string) => { setSaved(false); setVals((o) => ({ ...o, [key]: { ...o[key], [code]: v } })); };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const out: Record<string, Record<string, string>> = {};
    for (const k of data?.keys ?? []) { out[k.key] = {}; for (const l of data?.languages ?? []) out[k.key][l.code] = vals[k.key]?.[l.code] ?? ""; }
    if (await act.run(() => adminFetch("/system/translations", json("PUT", { values: out })))) setSaved(true);
  };
  return (
    <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Translations</h2></div>
      {(error || act.error) && <div className="px-5 pt-4"><ErrorBanner message={error || act.error} /></div>}
      <SimpleTable head={[{ h: "Key" }, { h: "English" }, ...(data?.languages ?? []).map((l) => ({ h: l.name }))]} empty={loading ? "Loading…" : "Nothing to translate yet."}
        rows={(data?.keys ?? []).map((k) => [k.key, k.english, ...(data?.languages ?? []).map((l) => {
          const v = vals[k.key]?.[l.code] ?? "";
          return <span key={l.code} className="flex items-center gap-2"><input className="w-full min-w-[9rem] rounded border border-slate-300 px-2 py-1 text-sm" aria-label={`${k.key} in ${l.name}`} value={v} onChange={(e) => edit(k.key, l.code, e.target.value)} />{!v.trim() && <Chip tone="bad">Missing</Chip>}</span>;
        })])} />
      <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
        {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
        <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { setVals(fresh()); setSaved(false); }}>Discard</button>
        <button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !data}>{act.busy ? "Saving…" : "Save translations"}</button>
      </div>
    </form>
  );
}

// ═════════════ Date & time ═════════════
export type DateTimeTab = "date" | "time";
const p2 = (v: number) => String(v).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function dateText(d: Date, f: string) {
  const dd = p2(d.getDate()), mm = p2(d.getMonth() + 1), y = d.getFullYear();
  return f === "MM/DD/YYYY" ? `${mm}/${dd}/${y}` : f === "YYYY-MM-DD" ? `${y}-${mm}-${dd}` : f === "DD MMM YYYY" ? `${dd} ${MONTHS[d.getMonth()]} ${y}` : `${dd}/${mm}/${y}`;
}
const fyText = (d: Date, f: string) => { if (f.startsWith("January")) return `FY ${d.getFullYear()}`; const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return `FY ${y}-${String(y + 1).slice(2)}`; };

export function DateTimePages({ tab }: { tab: DateTimeTab }) {
  const s = useSettings({ "locale.date_format": "DD/MM/YYYY", "locale.week_start": "Monday", "locale.financial_year": "April - March", "locale.time_format": "12h", "locale.show_seconds": false });
  const d = s.draft;
  const now = new Date();
  const apply = async (e: FormEvent) => {
    if (await s.save(e)) setLocaleConfig({ date_format: String(d["locale.date_format"]), time_format: String(d["locale.time_format"]), show_seconds: d["locale.show_seconds"] === true });
  };
  const h12 = now.getHours() % 12 || 12;
  const clock = d["locale.time_format"] === "24h" ? `${p2(now.getHours())}:${p2(now.getMinutes())}` : `${h12}:${p2(now.getMinutes())} ${now.getHours() < 12 ? "am" : "pm"}`;
  const logs = `${p2(now.getHours())}:${p2(now.getMinutes())}${d["locale.show_seconds"] === true ? `:${p2(now.getSeconds())}` : ""}`;
  return (
    <div className="space-y-5">
      {tab === "date" ? (
        <SettingsCard title="Date format" s={s} onSubmit={apply}>
          <Fields cols={3}>
            <Field label="Date format"><Select label="Date format" value={d["locale.date_format"]} onChange={(v) => s.set("locale.date_format", String(v))} options={[["DD/MM/YYYY", "DD/MM/YYYY"], ["MM/DD/YYYY", "MM/DD/YYYY"], ["YYYY-MM-DD", "YYYY-MM-DD"], ["DD MMM YYYY", "DD MMM YYYY"]]} /></Field>
            <Field label="Week starts on"><Select label="Week starts on" value={d["locale.week_start"]} onChange={(v) => s.set("locale.week_start", String(v))} options={[["Monday", "Monday"], ["Sunday", "Sunday"]]} /></Field>
            <Field label="Financial year"><Select label="Financial year" value={d["locale.financial_year"]} onChange={(v) => s.set("locale.financial_year", String(v))} options={[["April - March", "April – March"], ["January - December", "January – December"]]} /></Field>
          </Fields>
        </SettingsCard>
      ) : (
        <SettingsCard title="Time format" s={s} onSubmit={apply}>
          <Fields cols={2}>
            <Field label="Time format"><Select label="Time format" value={d["locale.time_format"]} onChange={(v) => s.set("locale.time_format", String(v))} options={[["12h", "12-hour (8:30 am)"], ["24h", "24-hour (08:30)"]]} /></Field>
            <Field label="Show seconds in logs"><Select label="Show seconds in logs" value={d["locale.show_seconds"] === true} onChange={(v) => s.set("locale.show_seconds", v === true)} options={[[true, "Yes"], [false, "No"]]} /></Field>
          </Fields>
        </SettingsCard>
      )}
      <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">
        {tab === "date" ? `Preview: ${dateText(now, String(d["locale.date_format"]))} · ${DAYS[now.getDay()]} · ${fyText(now, String(d["locale.financial_year"]))}` : `Preview: ${clock} · logs ${logs}`}
      </p>
    </div>
  );
}

// ═════════════ File management ═════════════
export type FilesTab = "uploads" | "storage";
export function FilePages({ tab }: { tab: FilesTab }) {
  return tab === "uploads" ? <Uploads /> : <Storage />;
}

function Uploads() {
  const s = useSettings({ "files.max_document_mb": 10, "files.max_image_mb": 5, "files.max_video_mb": 500, "files.allowed_types": "PDF, JPG, PNG, DOCX, XLSX, MP4", "files.scan_viruses": true, "files.compress_photos": true });
  const d = s.draft;
  const mb = (list: number[]): Opt[] => list.map((v) => [v, `${v} MB`]);
  return (
    <SettingsCard title="Upload limits" s={s} onSubmit={(e) => void s.save(e)}>
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="Max document size"><Select label="Max document size" value={d["files.max_document_mb"]} onChange={(v) => s.set("files.max_document_mb", Number(v))} options={mb([5, 10, 25, 50])} /></Field>
        <Field label="Max image size"><Select label="Max image size" value={d["files.max_image_mb"]} onChange={(v) => s.set("files.max_image_mb", Number(v))} options={mb([2, 5, 10, 20])} /></Field>
        <Field label="Max video size"><Select label="Max video size" value={d["files.max_video_mb"]} onChange={(v) => s.set("files.max_video_mb", Number(v))} options={mb([100, 250, 500, 1000])} /></Field>
        <div className="sm:col-span-3"><Field label="Allowed types"><input className={inputCls} maxLength={300} value={text(d["files.allowed_types"])} onChange={(e) => s.set("files.allowed_types", e.target.value)} /></Field></div>
      </div>
      <ToggleLine label="Scan uploads for viruses" checked={d["files.scan_viruses"] === true} onChange={(v) => s.set("files.scan_viruses", v)} />
      <ToggleLine label="Compress photos" hint="Saves storage, keeps them sharp on phones" checked={d["files.compress_photos"] === true} onChange={(v) => s.set("files.compress_photos", v)} />
    </SettingsCard>
  );
}

function Storage() {
  const s = useSettings({ "files.storage": "Amazon S3 · Mumbai", "files.delivery": "CloudFront CDN", "files.cold_storage": false });
  const d = s.draft;
  const note = "Not measured yet";
  return (
    <div className="space-y-5">
      <Tiles items={[{ label: "Used", value: "—", sub: note }, { label: "Documents", value: "—", sub: note }, { label: "Photos", value: "—", sub: note }, { label: "Videos", value: "—", sub: note }]} />
      <SettingsCard title="Storage" s={s} onSubmit={(e) => void s.save(e)}>
        <Fields cols={2}>
          <Field label="Storage"><Select label="Storage" value={d["files.storage"]} onChange={(v) => s.set("files.storage", String(v))} options={[["Amazon S3 · Mumbai", "Amazon S3 · Mumbai"], ["Supabase Storage", "Supabase Storage"]]} /></Field>
          <Field label="Delivery"><Select label="Delivery" value={d["files.delivery"]} onChange={(v) => s.set("files.delivery", String(v))} options={[["CloudFront CDN", "CloudFront CDN"], ["Direct", "Direct"]]} /></Field>
        </Fields>
        <ToggleLine label="Move files older than 2 years to cold storage" hint="Cheaper, takes a few hours to fetch" checked={d["files.cold_storage"] === true} onChange={(v) => s.set("files.cold_storage", v)} />
      </SettingsCard>
    </div>
  );
}

// ═════════════ Email configuration ═════════════
interface Service { configured: boolean; fields: { label: string; value: string }[] }
interface TestRes { to: string; message: { status: "sent" | "failed" | "queued"; error: string | null } }
export function EmailConfiguration() {
  const svc = useLoad(() => adminFetch<Service>("/integrations/services/email"), []);
  const s = useSettings({ "notify.email_from_name": "", "notify.email_from_address": "", "notify.reply_to": "" });
  const act = useAction(() => undefined);
  const [res, setRes] = useState<TestRes | null>(null);
  const field = (label: string) => svc.data?.fields.find((f) => f.label === label)?.value ?? "";
  const port = field("Port");
  const test = () => act.run(async () => { setRes(await adminFetch<TestRes>("/system/test-email", json("POST", {}))); });
  const ro = (v: string) => <input className={inputCls} readOnly disabled value={v} />;
  return (
    <SettingsCard title="SMTP settings" s={{ ...s, error: s.error || svc.error || act.error }} saveLabel="Save SMTP settings" onSubmit={(e) => void s.save(e)}>
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2 lg:col-span-5"><Field label="Host">{ro(field("Host"))}</Field></div>
        <Field label="Port">{ro(port.split(" ")[0])}</Field>
        <Field label="Security">{ro(/\((.+)\)/.exec(port)?.[1] ?? "")}</Field>
        <Field label="Username">{ro(field("Username"))}</Field>
        <Field label="Password">{ro(svc.data?.configured ? "••••••••••••" : field("Password"))}</Field>
        <Field label="From name"><input className={inputCls} maxLength={100} value={text(s.draft["notify.email_from_name"])} onChange={(e) => s.set("notify.email_from_name", e.target.value)} /></Field>
        <div className="lg:col-span-1"><Field label="From address"><input className={inputCls} type="email" maxLength={200} value={text(s.draft["notify.email_from_address"])} onChange={(e) => s.set("notify.email_from_address", e.target.value)} /></Field></div>
        <div className="lg:col-span-1"><Field label="Reply-to"><input className={inputCls} type="email" maxLength={200} value={text(s.draft["notify.reply_to"])} onChange={(e) => s.set("notify.reply_to", e.target.value)} /></Field></div>
      </div>
      <div className="flex items-center gap-4 border-t border-slate-100 px-5 py-3.5">
        <div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium text-slate-900">Send a test email</p><p className="text-xs text-slate-500">{res ? (res.message.status === "sent" ? `Sent to ${res.to}. Check the inbox (and spam).` : `Failed: ${res.message.error ?? "the mail server refused it"}`) : "To the address you are signed in with"}</p></div>
        <button type="button" className={small} disabled={act.busy || !svc.data?.configured} onClick={test}>{act.busy ? "Sending…" : "Send test"}</button>
      </div>
      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">The server, username and password are set in the backend <code className="rounded bg-slate-100 px-1">.env</code> and are never shown or edited in the browser.</p>
    </SettingsCard>
  );
}

// ═════════════ System configuration ═════════════
export type SysConfigTab = "maintenance" | "app";
const toIso = (local: string) => (local ? new Date(local).toISOString() : "");
const toLocal = (iso: unknown) => {
  if (typeof iso !== "string" || !iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const hour = (d: Date) => { const h = d.getHours() % 12 || 12; return d.getMinutes() ? `${h}:${p2(d.getMinutes())}` : `${h}`; };

export function ConfigPages({ tab }: { tab: SysConfigTab }) {
  return tab === "maintenance" ? <Maintenance /> : <AppSettings />;
}

function Maintenance() {
  const s = useSettings({ "maintenance.message": "We are upgrading the platform and will be back shortly.", "maintenance.starts_at": "", "maintenance.ends_at": "", "maintenance.enabled": false, "maintenance.parent_read_only": false });
  const d = s.draft;
  const a = typeof s.raw["maintenance.starts_at"] === "string" && s.raw["maintenance.starts_at"] ? new Date(s.raw["maintenance.starts_at"] as string) : null;
  const b = typeof s.raw["maintenance.ends_at"] === "string" && s.raw["maintenance.ends_at"] ? new Date(s.raw["maintenance.ends_at"] as string) : null;
  const next = a && b && b.getTime() > Date.now() ? `Next planned maintenance: ${a.getDate()} ${MONTHS[a.getMonth()]}, ${hour(a)} – ${hour(b)} ${b.getHours() < 12 ? "am" : "pm"}.` : "";
  return (
    <div className="space-y-5">
      {next && <p role="status" className="rounded-2xl border border-[#f0d9a8] bg-[#fdf6e7] px-4 py-3 text-[13px] text-slate-800">{next}</p>}
      <SettingsCard title="Maintenance mode" s={s} onSubmit={(e) => void s.save(e)}>
        <div className="space-y-4 p-5">
          <Field label="Message schools see"><textarea className={`${inputCls} min-h-[5.5rem]`} maxLength={500} value={text(d["maintenance.message"])} onChange={(e) => s.set("maintenance.message", e.target.value)} /></Field>
          <div className="grid gap-4 sm:max-w-xl sm:grid-cols-2">
            <Field label="Start"><input type="datetime-local" className={inputCls} value={toLocal(d["maintenance.starts_at"])} onChange={(e) => s.set("maintenance.starts_at", toIso(e.target.value))} /></Field>
            <Field label="End"><input type="datetime-local" className={inputCls} value={toLocal(d["maintenance.ends_at"])} onChange={(e) => s.set("maintenance.ends_at", toIso(e.target.value))} /></Field>
          </div>
        </div>
        <ToggleLine label="Maintenance mode is on" hint="Schools see the message and can't sign in. Your team keeps access." checked={d["maintenance.enabled"] === true} onChange={(v) => s.set("maintenance.enabled", v)} />
        <ToggleLine label="Keep the parent app read-only" hint="Parents can still see attendance and fees" checked={d["maintenance.parent_read_only"] === true} onChange={(v) => s.set("maintenance.parent_read_only", v)} />
      </SettingsCard>
    </div>
  );
}

function AppSettings() {
  const s = useSettings({ "app.self_signup": true, "app.support_impersonation": true, "app.beta_menu": false, "app.rate_limit_per_minute": 120, "app.debug_logging": false });
  const d = s.draft;
  return (
    <SettingsCard title="Application settings" s={s} onSubmit={(e) => void s.save(e)}>
      <ToggleLine label="Allow self sign-up" hint="Schools register from the website and wait for approval" checked={d["app.self_signup"] === true} onChange={(v) => s.set("app.self_signup", v)} />
      <ToggleLine label="Support can sign in as a school" hint="Every session is logged" checked={d["app.support_impersonation"] === true} onChange={(v) => s.set("app.support_impersonation", v)} />
      <ToggleLine label="Show the beta features menu" hint="For schools that opted in" checked={d["app.beta_menu"] === true} onChange={(v) => s.set("app.beta_menu", v)} />
      <SelectLine label="Rate limit" hint="API calls per key" value={d["app.rate_limit_per_minute"]} onChange={(v) => s.set("app.rate_limit_per_minute", Number(v))} options={[60, 120, 300, 600, 1200].map((v): Opt => [v, `${v} a minute`])} />
      <ToggleLine label="Debug logging" hint="Turn on only while fixing a problem" checked={d["app.debug_logging"] === true} onChange={(v) => s.set("app.debug_logging", v)} />
    </SettingsCard>
  );
}
