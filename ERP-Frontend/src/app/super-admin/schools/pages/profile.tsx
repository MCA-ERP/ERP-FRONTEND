"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, type SchoolRow } from "@/lib/admin-api";
import { useAction } from "@/components/admin/dash";
import { inputCls, useLoad } from "@/components/admin/ui";
import { BOARDS, FormCard, Labelled, SchoolBar, STATES, ToggleRow } from "./shared";

export type ProfileTab = "basic" | "contact" | "branding";

type Profile = Record<string, string | number | boolean | null>;
interface Contact { id: string; role: string; name: string }
interface Loaded { profile: Profile; contacts: Contact[] }

const TYPES = ["Co-ed day school", "Boys school", "Girls school", "Residential", "Day and residential", "School", "Primary school", "High School", "Higher secondary", "Pre-primary / Play school", "International school"];
const MEDIUMS = ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Marathi", "Malayalam", "Bengali"];
const SWATCHES = ["#0294ce", "#0a7f5b", "#e53a35", "#014a67", "#7c5cbf", "#b7791f"];

/** School Profile: basic details, contact details, and logo and branding, for the school chosen at the top. */
export function SchoolProfile({ tab }: { tab: ProfileTab }) {
  return <SchoolBar>{(school) => <ProfileForm school={school} tab={tab} />}</SchoolBar>;
}

function ProfileForm({ school, tab }: { school: SchoolRow; tab: ProfileTab }) {
  const { data, error, reload } = useLoad(() => adminFetch<Loaded>(`/schools/${school.id}/profile`), [school.id]);
  const act = useAction(reload);
  const [d, setD] = useState<Record<string, string>>({});
  const [people, setPeople] = useState({ Principal: "", Administrator: "", Accounts: "" });
  const [own, setOwn] = useState(false);
  const [saved, setSaved] = useState(false);

  const reset = () => {
    if (!data) return;
    setD(Object.fromEntries(Object.entries(data.profile).map(([k, v]) => [k, v === null || typeof v === "boolean" ? "" : String(v)])));
    setOwn(data.profile.own_branding === true);
    const by = (role: string) => data.contacts.find((c) => c.role === role)?.name ?? "";
    setPeople({ Principal: by("Principal"), Administrator: by("Administrator"), Accounts: by("Accounts") });
    setSaved(false);
  };
  useEffect(reset, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string) => (e: { target: { value: string } }) => { setD((x) => ({ ...x, [k]: e.target.value })); setSaved(false); };
  const text = (k: string, props: { placeholder?: string; readOnly?: boolean; type?: string } = {}) => <input className={inputCls} value={d[k] ?? ""} onChange={set(k)} {...props} />;

  const patch = (fields: Record<string, unknown>) => adminFetch(`/schools/${school.id}/profile`, json("PATCH", fields));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const ok = await act.run(async () => {
      if (tab === "basic") {
        await patch({
          name: d.name, board: d.board || null, affiliation_number: d.affiliation_number || null, udise_code: d.udise_code || null,
          established_year: d.established_year ? Number(d.established_year) : null, type: d.type || "School", medium_of_instruction: d.medium_of_instruction || null, classes_offered: d.classes_offered || null,
        });
      } else if (tab === "contact") {
        await patch({ address: d.address || null, city: d.city || null, state: d.state || null, postal_code: d.postal_code || null, contact_phone: d.contact_phone || null, contact_email: d.contact_email || null, website: d.website || null });
        // the three named people are contacts of the school, one per role
        for (const role of ["Principal", "Administrator", "Accounts"] as const) {
          const old = data?.contacts.find((c) => c.role === role);
          const name = people[role].trim();
          if (old && old.name === name) continue;
          if (old) await adminFetch(`/schools/${school.id}/contacts/${old.id}`, { method: "DELETE" });
          if (name) await adminFetch(`/schools/${school.id}/contacts`, json("POST", { role, name }));
        }
      } else {
        await patch({
          logo_url: d.logo_url || null, primary_color: d.primary_color || null, app_name: d.app_name || null, receipt_header: d.receipt_header || null, tagline: d.tagline || null,
          own_branding: school.plan_code === "enterprise" ? own : false,
        });
      }
    });
    if (ok) setSaved(true);
  };

  const common = { onSubmit: save, onDiscard: reset, busy: act.busy, saved, error: error || act.error, disabled: !data };

  if (tab === "basic") {
    return (
      <FormCard title="Basic details" saveLabel="Save basic details" {...common}>
        <Labelled label="School name">{text("name")}</Labelled>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Labelled label="School code">{text("code", { readOnly: true })}</Labelled>
          <Labelled label="Board"><select className={inputCls} value={d.board ?? ""} onChange={set("board")}><option value="">—</option>{BOARDS.map((b) => <option key={b}>{b}</option>)}</select></Labelled>
          <Labelled label="Affiliation number">{text("affiliation_number")}</Labelled>
          <Labelled label="UDISE+ code">{text("udise_code")}</Labelled>
          <Labelled label="Year established">{text("established_year", { type: "number" })}</Labelled>
          <Labelled label="School type"><select className={inputCls} value={d.type ?? ""} onChange={set("type")}>{[...new Set([d.type, ...TYPES].filter(Boolean))].map((t) => <option key={t}>{t}</option>)}</select></Labelled>
          <Labelled label="Medium"><select className={inputCls} value={d.medium_of_instruction ?? ""} onChange={set("medium_of_instruction")}><option value="">—</option>{MEDIUMS.map((m) => <option key={m}>{m}</option>)}</select></Labelled>
          <Labelled label="Students" hint="Enrolled students, counted automatically."><input className={inputCls} readOnly value={school.students} /></Labelled>
          <Labelled label="Classes offered">{text("classes_offered", { placeholder: "Nursery – Class 10" })}</Labelled>
        </div>
      </FormCard>
    );
  }

  if (tab === "contact") {
    return (
      <FormCard title="Contact details" saveLabel="Save contact details" {...common}>
        <Labelled label="Address"><textarea className={`${inputCls} min-h-[5rem]`} value={d.address ?? ""} onChange={set("address")} /></Labelled>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Labelled label="City">{text("city")}</Labelled>
          <Labelled label="State"><select className={inputCls} value={d.state ?? ""} onChange={set("state")}><option value="">—</option>{[...new Set([d.state, ...STATES].filter(Boolean))].map((s) => <option key={s}>{s}</option>)}</select></Labelled>
          <Labelled label="PIN code">{text("postal_code")}</Labelled>
          <Labelled label="Office phone">{text("contact_phone")}</Labelled>
          <Labelled label="Office email">{text("contact_email", { type: "email" })}</Labelled>
          <Labelled label="Website">{text("website")}</Labelled>
          <Labelled label="Principal"><input className={inputCls} value={people.Principal} onChange={(e) => setPeople({ ...people, Principal: e.target.value })} /></Labelled>
          <Labelled label="School admin"><input className={inputCls} value={people.Administrator} onChange={(e) => setPeople({ ...people, Administrator: e.target.value })} /></Labelled>
          <Labelled label="Accounts contact"><input className={inputCls} value={people.Accounts} onChange={(e) => setPeople({ ...people, Accounts: e.target.value })} /></Labelled>
        </div>
      </FormCard>
    );
  }

  const colour = d.primary_color || "#0294ce";
  const initials = (d.app_name || d.name || school.name).split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <FormCard title="Logo & branding" saveLabel="Save branding" {...common}>
        <Labelled label="School logo" hint="A full https:// link to a square PNG or SVG, at least 512 px. Uploading files comes later.">{text("logo_url", { placeholder: "https://…" })}</Labelled>
        <div>
          <p className="mb-1 text-[12.5px] font-medium text-slate-900">Brand colour</p>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => <button key={c} type="button" aria-label={`Use ${c}`} aria-pressed={colour.toLowerCase() === c} onClick={() => { setD({ ...d, primary_color: c }); setSaved(false); }} className="h-7 w-7 rounded-lg border-2 border-white shadow-[0_0_0_1px_#e1e5ea]" style={{ background: c, boxShadow: colour.toLowerCase() === c ? "0 0 0 2px #111827" : undefined }} />)}
            <input type="color" aria-label="Pick another colour" value={colour} onChange={set("primary_color")} className="h-7 w-9 cursor-pointer rounded-lg border border-slate-200" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Labelled label="Name shown in apps">{text("app_name", { placeholder: school.name })}</Labelled>
          <Labelled label="Receipt header">{text("receipt_header", { placeholder: `${school.name}${school.city ? ", " + school.city : ""}` })}</Labelled>
        </div>
        <Labelled label="Motto on report cards">{text("tagline", { placeholder: "Learn. Lead. Serve." })}</Labelled>
        <ToggleRow label="Use the school's own branding in its apps" hint={school.plan_code === "enterprise" ? "The school's name and colour replace My Class Assist in its apps." : "Available on the Enterprise plan"} checked={own && school.plan_code === "enterprise"} disabled={school.plan_code !== "enterprise"} onChange={(v) => { setOwn(v); setSaved(false); }} />
      </FormCard>
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Preview</h2><span className="text-xs text-slate-500">Parent app sign-in</span></div>
        <div className="grid place-items-center p-6">
          <div className="w-52 rounded-[28px] border-[6px] border-[#111827] bg-white px-4 py-6 text-center">
            {d.logo_url?.startsWith("https://")
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={d.logo_url} alt="School logo preview" className="mx-auto h-12 w-12 rounded-xl object-contain" />
              : <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl text-base font-bold text-white" style={{ background: colour }}>{initials}</span>}
            <p className="mt-2 text-[13px] font-bold leading-snug text-slate-900">{d.app_name || d.name || school.name}</p>
            <p className="text-[11px]" style={{ color: colour }}>{d.city || school.city}</p>
            <div className="mt-3 rounded-lg border border-slate-200 px-2 py-1.5 text-left text-[11px] text-slate-400">Mobile number</div>
            <div className="mt-2 rounded-full px-2 py-1.5 text-xs font-semibold text-white" style={{ background: colour }}>Send OTP</div>
            <p className="mt-3 text-[10px] text-slate-400">Powered by My Class Assist</p>
          </div>
        </div>
      </div>
    </div>
  );
}
