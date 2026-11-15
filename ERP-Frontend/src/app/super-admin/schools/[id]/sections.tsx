"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, type Paged } from "@/lib/admin-api";
import { Panel, TabBar, fmtDay, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Field, Modal, Th, btnGhost, btnPrimary, fmtDate, inputCls, useLoad } from "@/components/admin/ui";

const small = `${btnGhost} !px-2.5 !py-1 text-xs`;
const Empty = ({ cols, loading, text }: { cols: number; loading: boolean; text: string }) => (
  <tr><td colSpan={cols} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : text}</td></tr>
);

// ═════════════════════════ Profile ═════════════════════════
type Profile = Record<string, string | number | null>;
interface Contact { id: string; role: string; name: string; email: string | null; phone: string | null }
interface FieldDef { key: string; label: string; type?: "text" | "number" | "color" | "select" | "textarea"; options?: string[]; hint?: string }

const PROFILE: Record<string, { label: string; sub: string; fields: FieldDef[] }> = {
  basic: {
    label: "Basic details", sub: "The school's identity, board and size.",
    fields: [
      { key: "name", label: "School name" },
      { key: "type", label: "Type", type: "select", options: ["School", "Primary school", "High School", "Higher secondary", "Pre-primary / Play school", "International school"] },
      { key: "board", label: "Board", type: "select", options: ["", "CBSE", "ICSE", "State Board", "IB", "Cambridge", "Montessori", "Play school"] },
      { key: "established_year", label: "Year established", type: "number" },
      { key: "registration_number", label: "Registration number" },
      { key: "affiliation_number", label: "Affiliation number" },
      { key: "website", label: "Website" },
      { key: "gst_number", label: "GSTIN", hint: "15 letters and digits." },
    ],
  },
  contact: {
    label: "Contact details", sub: "Address and the people to contact at the school.",
    fields: [
      { key: "address", label: "Address", type: "textarea" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "postal_code", label: "PIN code" },
      { key: "country", label: "Country" },
      { key: "contact_name", label: "Main contact" },
      { key: "contact_email", label: "Contact email" },
      { key: "contact_phone", label: "Contact phone" },
    ],
  },
  branding: {
    label: "Logo & branding", sub: "How the school appears in its portal, apps, receipts and report cards.",
    fields: [
      { key: "logo_url", label: "Logo address", hint: "A full https:// link to the logo image." },
      { key: "tagline", label: "Tagline" },
      { key: "primary_color", label: "Primary colour", type: "color" },
      { key: "secondary_color", label: "Secondary colour", type: "color" },
    ],
  },
};

export function ProfileSection({ id, onSaved }: { id: string; onSaved: () => void }) {
  const [part, setPart] = useState<keyof typeof PROFILE>("basic");
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ profile: Profile; contacts: Contact[] }>(`/schools/${id}/profile`), [id]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const act = useAction(() => { reload(); onSaved(); });
  const def = PROFILE[part];

  useEffect(() => {
    if (data) setDraft(Object.fromEntries(Object.entries(data.profile).map(([k, v]) => [k, v == null ? "" : String(v)])));
  }, [data]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const body = Object.fromEntries(def.fields.map((f) => [f.key, f.type === "number" ? (draft[f.key] ? Number(draft[f.key]) : null) : draft[f.key] ?? ""]));
    if (await act.run(() => adminFetch(`/schools/${id}/profile`, json("PATCH", body)))) setSaved(true);
  };

  return (
    <>
      <TabBar value={part} onChange={(p) => { setPart(p); setSaved(false); }} tabs={(Object.keys(PROFILE) as (keyof typeof PROFILE)[]).map((k) => [k, PROFILE[k].label])} />
      <ErrorBanner message={error} />
      <Panel title={def.label} sub={def.sub}>
        <form onSubmit={save} className="space-y-4 p-5">
          <ErrorBanner message={act.error} />
          {loading && !data && <p className="text-sm text-slate-400">Loading…</p>}
          {data && (
            <div className="grid gap-4 sm:grid-cols-2">
              {def.fields.map((f) => (
                <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                  <Field label={f.label} hint={f.hint}>
                    {f.type === "select" ? (
                      <select className={inputCls} value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}>
                        {f.options!.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
                      </select>
                    ) : f.type === "textarea" ? (
                      <textarea className={`${inputCls} min-h-[5rem]`} value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                    ) : f.type === "color" ? (
                      <div className="flex gap-2">
                        <input type="color" aria-label={f.label} className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200" value={draft[f.key] || "#0294ce"} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                        <input className={inputCls} value={draft[f.key] ?? ""} placeholder="#0294ce" onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                      </div>
                    ) : (
                      <input type={f.type === "number" ? "number" : "text"} className={inputCls} value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                    )}
                  </Field>
                </div>
              ))}
            </div>
          )}
          {part === "branding" && data && (
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 p-4" style={{ borderTop: `4px solid ${draft.primary_color || "#0294ce"}` }}>
              {draft.logo_url?.startsWith("https://")
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={draft.logo_url} alt="School logo preview" className="size-14 rounded-lg object-contain" />
                : <div className="grid size-14 place-items-center rounded-lg bg-slate-100 text-xs text-slate-400">Logo</div>}
              <div>
                <p className="font-bold text-slate-900">{draft.name}</p>
                <p className="text-sm" style={{ color: draft.secondary_color || "#64748b" }}>{draft.tagline || "Your tagline appears here"}</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            {saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}
            <button type="submit" className={btnPrimary} disabled={act.busy || !data}>{act.busy ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      </Panel>
      {part === "contact" && <Contacts id={id} contacts={data?.contacts ?? []} reload={reload} />}
    </>
  );
}

function Contacts({ id, contacts, reload }: { id: string; contacts: Contact[]; reload: () => void }) {
  const act = useAction(reload);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ role: "Principal", name: "", email: "", phone: "" });
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => adminFetch(`/schools/${id}/contacts`, json("POST", f)))) { setOpen(false); setF({ role: "Principal", name: "", email: "", phone: "" }); }
  };
  return (
    <div className="mt-6">
      <Panel title="People to contact" right={<button type="button" className={btnPrimary} onClick={() => setOpen(true)}>+ Add person</button>}>
        <div className="p-4 pb-0"><ErrorBanner message={act.error} /></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Role</Th><Th>Name</Th><Th>Email</Th><Th>Phone</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!contacts.length && <Empty cols={5} loading={false} text="No one added yet." />}
            {contacts.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3"><Badge tone="blue">{c.role}</Badge></td>
                <td className="px-4 py-3 font-semibold text-slate-900">{c.name}</td>
                <td className="px-4 py-3 text-slate-600">{c.email || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{c.phone || "—"}</td>
                <td className="px-4 py-3 text-right"><button type="button" className={small} disabled={act.busy} onClick={() => window.confirm(`Remove ${c.name}?`) && act.run(() => adminFetch(`/schools/${id}/contacts/${c.id}`, { method: "DELETE" }))}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Modal open={open} title="Add a contact" onClose={() => setOpen(false)}>
        <form onSubmit={add} className="space-y-3">
          <ErrorBanner message={act.error} />
          <Field label="Role">
            <select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              {["Principal", "Administrator", "Accounts", "IT", "Other"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Name"><input className={inputCls} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"><input type="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={act.busy}>Add</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ═════════════════════════ Configuration ═════════════════════════
type Config = {
  academic: { year_start_month: number; terms: number; grading: string; attendance_rule: string; min_attendance_percent: number };
  regional: { country: string; timezone: string; currency: string; date_format: string };
  language: { default: string; enabled: string[] };
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const LANGUAGES = ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi", "Urdu", "Arabic"];

export function ConfigSection({ id }: { id: string }) {
  const [part, setPart] = useState<"academic" | "regional" | "language">("academic");
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ config: Config }>(`/schools/${id}/config`), [id]);
  const [c, setC] = useState<Config | null>(null);
  const [saved, setSaved] = useState(false);
  const act = useAction(reload);
  useEffect(() => { if (data) setC(structuredClone(data.config)); }, [data]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!c) return;
    setSaved(false);
    if (await act.run(() => adminFetch(`/schools/${id}/config/${part}`, json("PUT", c[part])))) setSaved(true);
  };
  const subs = { academic: ["Academic settings", "Academic year, terms, grading and attendance rules for the school."], regional: ["Regional settings", "Country, time zone, currency and formats for this school."], language: ["Language", "Languages the school's portal, apps and documents use."] } as const;

  return (
    <>
      <TabBar value={part} onChange={(p) => { setPart(p); setSaved(false); }} tabs={[["academic", "Academic"], ["regional", "Regional"], ["language", "Language"]]} />
      <ErrorBanner message={error} />
      <Panel title={subs[part][0]} sub={subs[part][1]}>
        <form onSubmit={save} className="space-y-4 p-5">
          <ErrorBanner message={act.error} />
          {loading && !c && <p className="text-sm text-slate-400">Loading…</p>}
          {c && part === "academic" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Academic year starts in">
                <select className={inputCls} value={c.academic.year_start_month} onChange={(e) => setC({ ...c, academic: { ...c.academic, year_start_month: Number(e.target.value) } })}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </Field>
              <Field label="Terms per year">
                <select className={inputCls} value={c.academic.terms} onChange={(e) => setC({ ...c, academic: { ...c.academic, terms: Number(e.target.value) } })}>
                  {[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Grading">
                <select className={inputCls} value={c.academic.grading} onChange={(e) => setC({ ...c, academic: { ...c.academic, grading: e.target.value } })}>
                  {["Marks and percentage", "Grades (A-E)", "CGPA", "Descriptive only"].map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Attendance is taken">
                <select className={inputCls} value={c.academic.attendance_rule} onChange={(e) => setC({ ...c, academic: { ...c.academic, attendance_rule: e.target.value } })}>
                  <option>Daily</option><option>Per period</option>
                </select>
              </Field>
              <Field label="Minimum attendance (%)" hint="Students below this are flagged.">
                <input type="number" min={0} max={100} className={inputCls} value={c.academic.min_attendance_percent} onChange={(e) => setC({ ...c, academic: { ...c.academic, min_attendance_percent: Number(e.target.value) } })} />
              </Field>
            </div>
          )}
          {c && part === "regional" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Country"><input className={inputCls} value={c.regional.country} onChange={(e) => setC({ ...c, regional: { ...c.regional, country: e.target.value } })} /></Field>
              <Field label="Time zone">
                <select className={inputCls} value={c.regional.timezone} onChange={(e) => setC({ ...c, regional: { ...c.regional, timezone: e.target.value } })}>
                  {["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Currency">
                <select className={inputCls} value={c.regional.currency} onChange={(e) => setC({ ...c, regional: { ...c.regional, currency: e.target.value } })}>
                  {["INR", "USD", "AED", "GBP", "SGD"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Date format">
                <select className={inputCls} value={c.regional.date_format} onChange={(e) => setC({ ...c, regional: { ...c.regional, date_format: e.target.value } })}>
                  {["DD MMM YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>
          )}
          {c && part === "language" && (
            <div className="space-y-4">
              <fieldset>
                <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Languages available</legend>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {LANGUAGES.map((l) => (
                    <label key={l} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="size-4 accent-mca-blue" checked={c.language.enabled.includes(l)}
                        onChange={() => {
                          const on = c.language.enabled.includes(l);
                          const enabled = on ? c.language.enabled.filter((x) => x !== l) : [...c.language.enabled, l];
                          setC({ ...c, language: { enabled, default: enabled.includes(c.language.default) ? c.language.default : enabled[0] ?? "English" } });
                        }} />
                      {l}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label="Default language">
                <select className={`${inputCls} max-w-xs`} value={c.language.default} onChange={(e) => setC({ ...c, language: { ...c.language, default: e.target.value } })}>
                  {c.language.enabled.map((l) => <option key={l}>{l}</option>)}
                </select>
              </Field>
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            {saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}
            <button type="submit" className={btnPrimary} disabled={act.busy || !c}>{act.busy ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      </Panel>
    </>
  );
}

// ═════════════════════════ Campuses ═════════════════════════
interface Campus {
  id: string; code: string; name: string; address: string | null; city: string | null; state: string | null; postal_code: string | null;
  phone: string | null; email: string | null; principal_name: string | null; is_main: boolean; is_active: boolean;
}
const emptyCampus = { code: "", name: "", address: "", city: "", state: "", postal_code: "", phone: "", email: "", principal_name: "" };

export function CampusSection({ id }: { id: string }) {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ campuses: Campus[] }>(`/schools/${id}/campuses`), [id]);
  const act = useAction(reload);
  const [open, setOpen] = useState<Campus | "new" | null>(null);
  const [f, setF] = useState(emptyCampus);
  const [counts, setCounts] = useState<Record<string, { students: number; users: number }>>({});

  const openForm = (c: Campus | "new") => {
    setF(c === "new" ? emptyCampus : { code: c.code, name: c.name, address: c.address ?? "", city: c.city ?? "", state: c.state ?? "", postal_code: c.postal_code ?? "", phone: c.phone ?? "", email: c.email ?? "", principal_name: c.principal_name ?? "" });
    setOpen(c);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await act.run(() =>
      open === "new" ? adminFetch(`/schools/${id}/campuses`, json("POST", f)) : adminFetch(`/campuses/${(open as Campus).id}`, json("PATCH", { ...f, code: undefined }))
    );
    if (ok) setOpen(null);
  };
  const loadCounts = async (c: Campus) => {
    const r = await adminFetch<{ counts: { students: number; users: number } }>(`/campuses/${c.id}`);
    setCounts((m) => ({ ...m, [c.id]: r.counts }));
  };

  return (
    <Panel title="Campuses" sub="Branches of this school" right={<button type="button" className={btnPrimary} onClick={() => openForm("new")}>+ Add campus</button>}>
      <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Campus</Th><Th>Place</Th><Th>Principal</Th><Th>Students · Staff</Th><Th>Status</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.campuses.length && <Empty cols={6} loading={loading} text="No campus yet. A school needs one before it can be approved." />}
          {data?.campuses.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-4 py-3"><p className="font-semibold text-slate-900">{c.name}{c.is_main && <span className="ml-2"><Badge tone="blue">Main</Badge></span>}</p><p className="text-xs text-slate-400">{c.code}</p></td>
              <td className="px-4 py-3 text-slate-600">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</td>
              <td className="px-4 py-3 text-slate-600">{c.principal_name || "—"}</td>
              <td className="px-4 py-3 text-slate-600">
                {counts[c.id] ? `${counts[c.id].students} · ${counts[c.id].users}` : <button type="button" className="text-xs font-semibold text-mca-blue" onClick={() => loadCounts(c)}>Show</button>}
              </td>
              <td className="px-4 py-3">{c.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Off</Badge>}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button type="button" className={small} onClick={() => openForm(c)}>Edit</button>
                  {!c.is_main && c.is_active && <button type="button" className={small} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/campuses/${c.id}`, json("PATCH", { is_main: true })))}>Make main</button>}
                  {!c.is_main && <button type="button" className={small} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/campuses/${c.id}`, json("PATCH", { is_active: !c.is_active })))}>{c.is_active ? "Turn off" : "Turn on"}</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={open !== null} title={open === "new" ? "Add campus" : "Edit campus"} onClose={() => setOpen(null)}>
        <CampusForm f={f} setF={setF} onSubmit={save} busy={act.busy} error={act.error} isNew={open === "new"} onCancel={() => setOpen(null)} />
      </Modal>
    </Panel>
  );
}

export function CampusForm({
  f, setF, onSubmit, busy, error, isNew, onCancel,
}: { f: typeof emptyCampus; setF: (v: typeof emptyCampus) => void; onSubmit: (e: FormEvent) => void; busy: boolean; error: string; isNew: boolean; onCancel: () => void }) {
  const set = (k: keyof typeof emptyCampus) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <ErrorBanner message={error} />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Code"><input className={inputCls} required value={f.code} onChange={set("code")} disabled={!isNew} placeholder="MAIN" /></Field>
        <div className="col-span-2"><Field label="Name"><input className={inputCls} required value={f.name} onChange={set("name")} /></Field></div>
      </div>
      <Field label="Address"><input className={inputCls} value={f.address} onChange={set("address")} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="City"><input className={inputCls} value={f.city} onChange={set("city")} /></Field>
        <Field label="State"><input className={inputCls} value={f.state} onChange={set("state")} /></Field>
        <Field label="PIN code"><input className={inputCls} value={f.postal_code} onChange={set("postal_code")} /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Principal"><input className={inputCls} value={f.principal_name} onChange={set("principal_name")} /></Field>
        <Field label="Phone"><input className={inputCls} value={f.phone} onChange={set("phone")} /></Field>
        <Field label="Email"><input type="email" className={inputCls} value={f.email} onChange={set("email")} /></Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className={btnGhost} onClick={onCancel}>Cancel</button>
        <button type="submit" className={btnPrimary} disabled={busy}>{isNew ? "Add campus" : "Save"}</button>
      </div>
    </form>
  );
}
export { emptyCampus };

// ═════════════════════════ Admins ═════════════════════════
interface AdminRow { id: string; email: string; first_name: string; last_name: string; phone: string | null; status: string; last_login_at: string | null; must_change_password: boolean }
interface Access { role: string; permissions: { code: string; module: string; description: string | null }[]; modules: { code: string; name: string }[] }

export function AdminsSection({ id }: { id: string }) {
  const [part, setPart] = useState<"admins" | "access">("admins");
  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["admins", "Admins"], ["access", "Admin access"]]} />
      {part === "admins" ? <AdminList id={id} /> : <AdminAccess id={id} />}
    </>
  );
}

function AdminList({ id }: { id: string }) {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ admins: AdminRow[]; primary_admin_id: string | null }>(`/schools/${id}/admins`), [id]);
  const act = useAction(reload);
  const [open, setOpen] = useState(false);
  const blank = { first_name: "", last_name: "", email: "", phone: "", password: "", make_primary: false };
  const [f, setF] = useState(blank);
  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => adminFetch(`/schools/${id}/admins`, json("POST", { ...f, phone: f.phone || undefined })))) { setOpen(false); setF(blank); }
  };
  return (
    <Panel title="School administrators" sub="They manage everything inside the school's portal. The primary admin is the main contact." right={<button type="button" className={btnPrimary} onClick={() => setOpen(true)}>+ Create admin</button>}>
      <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Name</Th><Th>Email</Th><Th>Status</Th><Th>Last sign-in</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.admins.length && <Empty cols={5} loading={loading} text="No administrator yet. Create one so the school can sign in." />}
          {data?.admins.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3 font-semibold text-slate-900">{a.first_name} {a.last_name}{a.id === data.primary_admin_id && <span className="ml-2"><Badge tone="blue">Primary</Badge></span>}</td>
              <td className="px-4 py-3 text-slate-600">{a.email}</td>
              <td className="px-4 py-3">{a.status === "active" ? <Badge tone="green">Active</Badge> : <Badge tone="gray">{a.status}</Badge>}{a.must_change_password && <p className="mt-1 text-xs text-amber-700">Has not set own password</p>}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(a.last_login_at)}</td>
              <td className="px-4 py-3 text-right">
                {a.id !== data.primary_admin_id && a.status === "active" && (
                  <button type="button" className={small} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/schools/${id}/primary-admin`, json("POST", { admin_id: a.id })))}>Make primary</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={open} title="Create school administrator" onClose={() => setOpen(false)}>
        <form onSubmit={create} className="space-y-3">
          <ErrorBanner message={act.error} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><input className={inputCls} required value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></Field>
            <Field label="Last name"><input className={inputCls} required value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></Field>
          </div>
          <Field label="Email"><input type="email" className={inputCls} required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
            <Field label="Temporary password" hint="They must change it at first sign-in."><input type="password" autoComplete="new-password" className={inputCls} required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-mca-blue" checked={f.make_primary} onChange={(e) => setF({ ...f, make_primary: e.target.checked })} />Make this the primary administrator</label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={act.busy}>Create admin</button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}

function AdminAccess({ id }: { id: string }) {
  const { data, error, loading } = useLoad(() => adminFetch<Access>(`/schools/${id}/admin-access`), [id]);
  const byModule = new Map<string, string[]>();
  data?.permissions.forEach((p) => byModule.set(p.module, [...(byModule.get(p.module) ?? []), p.description || p.code]));
  return (
    <Panel title="What school admins can do" sub={`Role: ${data?.role ?? "…"}. They can use the modules this school's plan includes.`}>
      <div className="space-y-5 p-5">
        <ErrorBanner message={error} />
        {loading && !data && <p className="text-sm text-slate-400">Loading…</p>}
        {data && (
          <>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Modules available</p>
              <div className="flex flex-wrap gap-2">{data.modules.map((m) => <Badge key={m.code} tone="green">{m.name}</Badge>)}{!data.modules.length && <span className="text-sm text-slate-400">None yet</span>}</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[...byModule.entries()].map(([mod, items]) => (
                <div key={mod} className="rounded-xl border border-slate-200 p-4">
                  <p className="mb-1 text-sm font-bold capitalize text-slate-900">{mod.replace(/_/g, " ")}</p>
                  <ul className="list-disc space-y-0.5 pl-5 text-sm text-slate-600">{items.map((d) => <li key={d}>{d}</li>)}</ul>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400">To change what the school administrator role can do, use Roles &amp; permissions.</p>
          </>
        )}
      </div>
    </Panel>
  );
}

// ═════════════════════════ Documents ═════════════════════════
interface Doc {
  id: string; category: "registration" | "affiliation"; doc_type: string; number: string | null; issued_by: string | null;
  issue_date: string | null; expiry_date: string | null; file_url: string | null; status: "pending" | "verified" | "rejected"; notes: string | null;
}
const DOC_TYPES = {
  registration: ["School registration certificate", "Society / trust registration", "Land ownership / lease deed", "Building safety certificate", "Fire safety certificate", "Sanitation certificate"],
  affiliation: ["Board affiliation certificate", "No Objection Certificate (NOC)", "Recognition certificate", "UDISE+ code"],
};

export function DocumentsSection({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [cat, setCat] = useState<"registration" | "affiliation">("registration");
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ documents: Doc[] }>(`/schools/${id}/documents?category=${cat}`), [id, cat]);
  const act = useAction(() => { reload(); onChanged(); });
  const [open, setOpen] = useState(false);
  const blank = { doc_type: "", number: "", issued_by: "", issue_date: "", expiry_date: "", file_url: "", notes: "" };
  const [f, setF] = useState(blank);
  const today = new Date().toISOString().slice(0, 10);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => adminFetch(`/schools/${id}/documents`, json("POST", { ...f, category: cat })))) { setOpen(false); setF(blank); }
  };
  const review = (d: Doc, status: Doc["status"], notes?: string) => act.run(() => adminFetch(`/schools/${id}/documents/${d.id}/review`, json("POST", { status, notes: notes ?? null })));
  const tone = { pending: "gray", verified: "green", rejected: "red" } as const;

  return (
    <>
      <TabBar value={cat} onChange={setCat} tabs={[["registration", "Registration documents"], ["affiliation", "Affiliation documents"]]} />
      <Panel
        title={cat === "registration" ? "Registration documents" : "Affiliation documents"}
        sub={cat === "registration" ? "Certificates that prove the school is registered." : "Board affiliation certificates and NOCs."}
        right={<button type="button" className={btnPrimary} onClick={() => setOpen(true)}>+ Add document</button>}
      >
        <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Document</Th><Th>Number</Th><Th>Valid</Th><Th>Status</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!data?.documents.length && <Empty cols={5} loading={loading} text="No documents recorded." />}
            {data?.documents.map((d) => (
              <tr key={d.id} className="align-top">
                <td className="px-4 py-3"><p className="font-semibold text-slate-900">{d.doc_type}</p><p className="text-xs text-slate-400">{d.issued_by || ""}{d.file_url && <> · <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-mca-blue">Open file</a></>}</p></td>
                <td className="px-4 py-3 text-slate-600">{d.number || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                  {d.issue_date ? fmtDay(d.issue_date) : "—"} → {d.expiry_date ? fmtDay(d.expiry_date) : "no expiry"}
                  {d.expiry_date && d.expiry_date < today && <p className="font-semibold text-rose-700">Expired</p>}
                </td>
                <td className="px-4 py-3"><Badge tone={tone[d.status]}>{d.status}</Badge>{d.status === "rejected" && d.notes && <p className="mt-1 max-w-[14rem] text-xs text-rose-700">{d.notes}</p>}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {d.status !== "verified" && <button type="button" className={`${btnPrimary} !px-2.5 !py-1 text-xs`} disabled={act.busy} onClick={() => review(d, "verified")}>Verify</button>}
                    {d.status !== "rejected" && <button type="button" className={small} disabled={act.busy} onClick={() => { const why = window.prompt("Why is this document rejected?"); if (why?.trim()) void review(d, "rejected", why.trim()); }}>Reject</button>}
                    {d.status !== "pending" && <button type="button" className={small} disabled={act.busy} onClick={() => review(d, "pending")}>Reset</button>}
                    <button type="button" className={small} disabled={act.busy} onClick={() => window.confirm("Remove this document?") && act.run(() => adminFetch(`/schools/${id}/documents/${d.id}`, { method: "DELETE" }))}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">The platform records each certificate&apos;s details and a link to the scanned file; it does not store the files itself.</p>
        <Modal open={open} title="Add a document" onClose={() => setOpen(false)}>
          <form onSubmit={add} className="space-y-3">
            <ErrorBanner message={act.error} />
            <Field label="Document">
              <input className={inputCls} required list="doc-types" value={f.doc_type} onChange={(e) => setF({ ...f, doc_type: e.target.value })} />
              <datalist id="doc-types">{DOC_TYPES[cat].map((t) => <option key={t} value={t} />)}</datalist>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Number"><input className={inputCls} value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} /></Field>
              <Field label="Issued by"><input className={inputCls} value={f.issued_by} onChange={(e) => setF({ ...f, issued_by: e.target.value })} /></Field>
              <Field label="Issue date"><input type="date" className={inputCls} value={f.issue_date} onChange={(e) => setF({ ...f, issue_date: e.target.value })} /></Field>
              <Field label="Expiry date"><input type="date" className={inputCls} value={f.expiry_date} onChange={(e) => setF({ ...f, expiry_date: e.target.value })} /></Field>
            </div>
            <Field label="Link to the file" hint="A full https:// link (for example from your drive)."><input className={inputCls} value={f.file_url} onChange={(e) => setF({ ...f, file_url: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className={btnPrimary} disabled={act.busy}>Add</button>
            </div>
          </form>
        </Modal>
      </Panel>
    </>
  );
}

// ═════════════════════════ History ═════════════════════════
interface EventRow { id: string; type: string; summary: string; actor_name: string | null; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null; created_at: string }
interface AuditRow { id: string; actor_email: string | null; action: string; new_data: unknown; ip_address: string | null; created_at: string }
interface SubHistory {
  subscriptions: { id: string; started_on: string; renews_on: string | null; trial_ends_on: string | null; ended_on: string | null; is_current: boolean; plans: { name: string } | null }[];
  invoices: { id: string; number: string; description: string; issue_date: string; due_on: string; total_paise: number; paid_paise: number; status: string }[];
}
const show = (v: unknown) => (v === null || v === undefined || v === "" ? "empty" : typeof v === "object" ? JSON.stringify(v) : String(v));
const rupees = (p: number) => `₹${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function HistorySection({ id }: { id: string }) {
  const [part, setPart] = useState<"activity" | "subscription" | "audit">("activity");
  const [page, setPage] = useState(1);
  const ev = useLoad(() => (part === "activity" ? adminFetch<Paged<EventRow>>(`/schools/${id}/history/activity?page=${page}`) : Promise.resolve(null)), [id, part, page]);
  const sub = useLoad(() => (part === "subscription" ? adminFetch<SubHistory>(`/schools/${id}/history/subscription`) : Promise.resolve(null)), [id, part]);
  const au = useLoad(() => (part === "audit" ? adminFetch<{ items: AuditRow[] }>(`/schools/${id}/history/audit?page=${page}`) : Promise.resolve(null)), [id, part, page]);
  const err = ev.error || sub.error || au.error;

  return (
    <>
      <TabBar value={part} onChange={(p) => { setPart(p); setPage(1); }} tabs={[["activity", "Activity history"], ["subscription", "Subscription history"], ["audit", "Audit trail"]]} />
      <ErrorBanner message={err} />
      {part === "activity" && (
        <Panel title="Activity history" sub="Everything that happened to this school on the platform">
          <ul className="divide-y divide-slate-100">
            {!ev.data?.items.length && <li className="px-5 py-8 text-center text-sm text-slate-400">{ev.loading ? "Loading…" : "Nothing recorded yet."}</li>}
            {ev.data?.items.map((e) => (
              <li key={e.id} className="px-5 py-3">
                <p className="text-sm font-semibold text-slate-900">{e.summary}</p>
                <p className="text-xs text-slate-400">{e.actor_name || "System"} · {fmtDate(e.created_at)}</p>
                {e.new_data && Object.keys(e.new_data).length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 text-xs text-slate-600">
                    {Object.keys(e.new_data).map((k) => (
                      <li key={k}><span className="font-semibold">{k.replace(/_/g, " ")}</span>: <span className="text-rose-700 line-through">{show(e.old_data?.[k])}</span> → <span className="text-emerald-700">{show(e.new_data?.[k])}</span></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          {ev.data && ev.data.total > ev.data.pageSize && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm">
              <button type="button" className={small} disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</button>
              <span className="text-xs text-slate-400">Page {page}</span>
              <button type="button" className={small} disabled={page * ev.data.pageSize >= ev.data.total} onClick={() => setPage(page + 1)}>Older</button>
            </div>
          )}
        </Panel>
      )}
      {part === "subscription" && (
        <>
          <Panel title="Plans" sub="Every plan this school has been on">
            <table className="w-full text-sm">
              <thead className="bg-slate-50"><tr><Th>Plan</Th><Th>Started</Th><Th>Renews / trial ends</Th><Th>Ended</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {!sub.data?.subscriptions.length && <Empty cols={4} loading={sub.loading} text="No subscriptions." />}
                {sub.data?.subscriptions.map((s) => (
                  <tr key={s.id}><td className="px-4 py-3 font-semibold text-slate-900">{s.plans?.name ?? "—"}{s.is_current && <span className="ml-2"><Badge tone="green">Current</Badge></span>}</td>
                    <td className="px-4 py-3 text-slate-600">{fmtDay(s.started_on)}</td><td className="px-4 py-3 text-slate-600">{fmtDay(s.renews_on ?? s.trial_ends_on)}</td><td className="px-4 py-3 text-slate-600">{s.ended_on ? fmtDay(s.ended_on) : "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <div className="mt-6">
            <Panel title="Invoices and payments">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><Th>Invoice</Th><Th>Issued</Th><Th>Due</Th><Th>Total</Th><Th>Paid</Th><Th>Status</Th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {!sub.data?.invoices.length && <Empty cols={6} loading={sub.loading} text="No invoices yet." />}
                  {sub.data?.invoices.map((i) => (
                    <tr key={i.id}><td className="px-4 py-3"><p className="font-semibold text-slate-900">{i.number}</p><p className="text-xs text-slate-400">{i.description}</p></td>
                      <td className="px-4 py-3 text-slate-600">{fmtDay(i.issue_date)}</td><td className="px-4 py-3 text-slate-600">{fmtDay(i.due_on)}</td>
                      <td className="px-4 py-3 tabular-nums">{rupees(i.total_paise)}</td><td className="px-4 py-3 tabular-nums">{rupees(i.paid_paise)}</td><td className="px-4 py-3"><Badge tone={i.status === "Paid" ? "green" : i.status === "Overdue" ? "red" : "gray"}>{i.status}</Badge></td></tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>
        </>
      )}
      {part === "audit" && (
        <Panel title="Audit trail" sub="Every request that changed this school's records: who, from where, and what was sent">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>When</Th><Th>Who</Th><Th>Action</Th><Th>Details</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!au.data?.items.length && <Empty cols={4} loading={au.loading} text="Nothing recorded yet." />}
              {au.data?.items.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(a.created_at)}</td>
                  <td className="px-4 py-3"><p className="text-slate-900">{a.actor_email}</p><p className="text-xs text-slate-400">{a.ip_address}</p></td>
                  <td className="px-4 py-3 text-xs text-slate-700">{a.action.replace("/api/v1/admin", "")}</td>
                  <td className="max-w-xs px-4 py-3"><code className="block max-h-16 overflow-hidden break-all text-xs text-slate-500">{a.new_data ? JSON.stringify(a.new_data) : "—"}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <button type="button" className={small} disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</button>
            <span className="text-xs text-slate-400">Page {page}</span>
            <button type="button" className={small} disabled={(au.data?.items.length ?? 0) < 20} onClick={() => setPage(page + 1)}>Older</button>
          </div>
        </Panel>
      )}
    </>
  );
}
