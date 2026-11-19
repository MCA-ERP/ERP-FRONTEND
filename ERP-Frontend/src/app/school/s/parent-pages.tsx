"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { downloadCsv } from "@/components/admin/csv";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { useRoster } from "./student-pages2";
import { parseCsv } from "./student-pages";

const PM = "/school/parents-mgmt";
const primaryCls = "rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const quietCls = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-slate-400 disabled:opacity-50";
const Foot = ({ close, left }: { close: () => void; left?: ReactNode }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex gap-1.5">{left}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const Note = ({ children }: { children: ReactNode }) => <p className="px-5 pb-4 text-[13px] text-slate-600 sm:col-span-2 lg:col-span-5">{children}</p>;
const todayIso = () => new Date().toISOString().slice(0, 10);

interface Kid { id: string; name: string; class_label: string }
export interface Parent { id: string; name: string; relation: string; mobile: string; email: string; parent_code: string; login: "Not installed" | "Active" | "Inactive"; app: "Installed" | "Not installed"; students: Kid[]; spouse: { id: string; name: string; occupation: string } | null; can_pick_up: boolean }
interface Full extends Parent { qualification: string; occupation: string; whatsapp: string; language: string; emergency_name: string; emergency_phone: string; address: string; city: string; pincode: string; income_band: string }
export const useParents = () => useLoad(() => schoolFetch<{ items: Parent[] }>(PM), []);
const tone = (s: string): "good" | "mute" | "warn" => (s === "Active" || s === "Installed" || s === "Approved" ? "good" : s === "Inactive" || s === "Not installed" ? "mute" : "warn");
const loginLabel = (p: Parent) => (p.login === "Not installed" ? "No login" : p.login);
const kidLinks = (ks: Kid[], long = true) => ks.length ? ks.map((k, i) => <span key={k.id}>{i > 0 && ", "}<Link href="/school/students/student-profile" className="font-semibold text-[#026f9b] hover:underline">{long ? k.name : k.name.split(" ")[0]}</Link>{long && <span className="text-slate-500"> {k.class_label}</span>}</span>) : <span className="text-slate-400">—</span>;
const NameCell = ({ p }: { p: Parent }) => <div><p className="font-semibold text-slate-900">{p.name}</p>{p.spouse && <p className="text-xs text-slate-400">{p.spouse.name}</p>}</div>;

function ParentModal({ p, close, left }: { p: Parent | null; close: () => void; left?: ReactNode }) {
  return <Modal open={!!p} title={p?.name ?? ""} onClose={close}>{p && <>
    <dl><Row k="Parent ID" v={p.parent_code || "—"} /><Row k="Relation" v={p.relation} />{p.spouse && <Row k="Other parent" v={p.spouse.name} />}<Row k="Children" v={p.students.map((k) => `${k.name} (${k.class_label})`).join(", ") || "—"} /><Row k="Mobile" v={p.mobile || "—"} /><Row k="Email" v={p.email || "—"} /><Row k="Parent app" v={p.app} /><Row k="Login" v={loginLabel(p)} /></dl>
    <Foot close={close} left={left} /></>}</Modal>;
}

// ═════════════ directory ═════════════
export type DirTab = "all-parents" | "active-parents" | "inactive-parents";
export function ParentDirectoryPages({ tab, heading }: { tab: DirTab; heading?: string }) {
  const { data, error, loading } = useParents();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Parent | null>(null);
  const all = data?.items ?? [];
  const list = tab === "active-parents" ? all.filter((p) => p.login !== "Inactive") : tab === "inactive-parents" ? all.filter((p) => p.login === "Inactive") : all;
  const rows = list.filter((p) => has({ n: p.name, s: p.students.map((k) => k.name), m: p.mobile, c: p.parent_code }, search));
  const title = heading ?? { "all-parents": "All Parents", "active-parents": "Active Parents", "inactive-parents": "Inactive Parents" }[tab];
  return (
    <div data-report>
      <ErrorBanner message={error} />
      <ListPanel title={title} noun="parents" search={search} onSearch={setSearch} exportName={tab} head={["Parent", "Other parent", "Student", "Mobile", "Parent app", "Login"]}
        exportRows={rows.map((p) => [p.name, p.spouse?.name ?? "", p.students.map((k) => `${k.name} ${k.class_label}`).join("; "), p.mobile, p.app, loginLabel(p)])}
        tableHead={["Parent", "Student", "Mobile", "Parent app", "Login", ""]} empty={loading ? "Loading…" : "No parents yet."}
        rows={rows.map((p) => [<NameCell key="n" p={p} />, kidLinks(p.students), p.mobile || "—", <Chip key="a" tone={tone(p.app)}>{p.app}</Chip>, <Chip key="l" tone={tone(p.login)}>{loginLabel(p)}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(p)}>View details</button>])} />
      <ParentModal p={view} close={() => setView(null)} />
    </div>
  );
}

// ═════════════ registration ═════════════
const RELATIONS = ["Father", "Mother", "Guardian"];
function AddParent() {
  const roster = useRoster();
  const act = useAction(() => undefined);
  const blank = { full_name: "", relation: "Father", phone: "", email: "", occupation: "", student_id: "", address: "", create_login: true };
  const [f, setF] = useState(blank);
  const [done, setDone] = useState("");
  const kids = roster.data?.items ?? [];
  const sid = f.student_id || kids[0]?.id || "";
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setDone("");
    const ok = await act.run(() => schoolFetch(PM, json("POST", { ...f, student_id: sid })));
    if (ok) { setDone(`${f.full_name} added.`); setF(blank); }
  };
  return (
    <div className="space-y-4">
      <ErrorBanner message={roster.error} />
      {done && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{done}</p>}
      <FormCard title="New parent" onSubmit={submit} onDiscard={() => { setF(blank); setDone(""); }} busy={act.busy} error={act.error}>
        <Field label="Full name"><input className={inputCls} required minLength={2} maxLength={200} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></Field>
        <Field label="Relation"><select className={inputCls} value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })}>{RELATIONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="Mobile"><input className={inputCls} required inputMode="tel" placeholder="+91" maxLength={30} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Email"><input type="email" className={inputCls} maxLength={255} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Occupation"><input className={inputCls} maxLength={100} value={f.occupation} onChange={(e) => setF({ ...f, occupation: e.target.value })} /></Field>
        <div className="sm:col-span-2 lg:col-span-5"><Field label="Link to student"><select className={`${inputCls} max-w-xs`} required value={sid} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{!kids.length && <option value="">No students</option>}{kids.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.class_label}</option>)}</select></Field></div>
        <div className="sm:col-span-2 lg:col-span-5"><Field label="Address"><textarea className={`${inputCls} min-h-20`} maxLength={400} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field></div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 sm:col-span-2 lg:col-span-5"><div><p className="text-[13px] font-medium text-slate-900">Create a parent app login</p><p className="text-[11px] text-slate-500">The one-time password goes out when SMS is connected.</p></div><Toggle checked={f.create_login} onChange={(v) => setF({ ...f, create_login: v })} label="Create a parent app login" /></div>
      </FormCard>
    </div>
  );
}

const COLS = ["Parent", "Relation", "Mobile", "Email", "Student admission no."];
interface Line { row: number; name: string; relation: string; mobile: string; email: string; adm: string; student: string; cls: string; problem: string }
function BulkParents() {
  const roster = useRoster();
  const act = useAction(() => undefined);
  const [lines, setLines] = useState<Line[]>([]);
  const [fileError, setFileError] = useState("");
  const [result, setResult] = useState("");
  const by = new Map((roster.data?.items ?? []).map((r) => [r.registration_no.toLowerCase(), r]));
  const check = (cells: string[], row: number): Line => {
    const [name = "", relation = "", mobile = "", email = "", adm = ""] = cells.map((c) => c.trim());
    const s = by.get(adm.toLowerCase());
    const problems: string[] = [];
    if (name.length < 2) problems.push("name");
    if (mobile.length < 8) problems.push("mobile");
    if (!s) problems.push("student admission no.");
    return { row, name, relation, mobile, email, adm, student: s?.name ?? "", cls: s?.class_label ?? "", problem: problems.join(", ") };
  };
  const onFile = async (file: File | undefined) => {
    setResult(""); setFileError("");
    if (!file) return;
    if (file.size > 500_000) { setFileError("Keep the file under 500 KB."); return; }
    const rows = parseCsv(await file.text());
    if (rows.length < 2) { setFileError("The file has no parent rows."); return; }
    setLines(rows.slice(1, 501).map((r, i) => check(r, i + 2)));
  };
  const valid = lines.filter((l) => !l.problem);
  const doImport = async () => {
    const ok = await act.run(async () => {
      const r = await schoolFetch<{ added: number; problems: { row: number; message: string }[] }>(`${PM}/bulk`, json("POST", { rows: valid.map((l) => ({ full_name: l.name, relation: l.relation, phone: l.mobile, email: l.email, student_admission_no: l.adm })) }));
      setResult(`${r.added} parents imported.${r.problems.length ? ` ${r.problems.length} failed: ${r.problems.slice(0, 3).map((p) => `row ${p.row} ${p.message}`).join(" · ")}` : ""}`);
    });
    if (ok) setLines(lines.filter((l) => l.problem));
  };
  const box = "flex min-h-[8.5rem] flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4";
  return (
    <div className="space-y-5">
      <ErrorBanner message={fileError || roster.error || act.error} />
      <div className="grid gap-4 md:grid-cols-3">
        <div className={box}><b className="text-[14px] text-slate-900">1. Download the template</b><p className="text-xs text-slate-500">A CSV with the right columns and an example row</p><button type="button" className={`${small} mt-auto w-fit`} onClick={() => downloadCsv("parent-import-template", COLS, [["Mr. Kiran Shah", "Father", "+91 98480 12311", "kiran@example.com", roster.data?.items[0]?.registration_no ?? ""]])}>Download template</button></div>
        <div className={box}><b className="text-[14px] text-slate-900">2. Fill it in</b><p className="text-xs text-slate-500">One row per parent. Relation is Father, Mother or Guardian.</p><p className="mt-auto text-xs text-slate-500">{COLS.length} columns</p></div>
        <div className={box}><b className="text-[14px] text-slate-900">3. Upload</b><p className="text-xs text-slate-500">We check every row before importing</p><input type="file" accept=".csv,text/csv" aria-label="Choose a CSV file" onChange={(e) => void onFile(e.target.files?.[0])} className="text-sm" /></div>
      </div>
      {result && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{result}</p>}
      <Panel title="Preview" sub={lines.length ? `${valid.length} of ${lines.length} rows are ready` : "Upload a file to see its rows checked"} right={<button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy || !valid.length} onClick={() => void doImport()}>{act.busy ? "Importing…" : "Import valid rows"}</button>}>
        <SimpleTable head={["Row", "Parent", "Relation", "Mobile", "Email", "Student", "Class", "Check"].map((h) => ({ h }))} empty="No file checked yet." rows={lines.map((l) => [l.row, l.name, l.relation, l.mobile, l.email, l.student, l.cls, l.problem ? <span key="c" className="flex items-center gap-1.5"><Chip tone="bad">Missing</Chip><span className="text-xs text-slate-600">{l.problem}</span></span> : <Chip key="c" tone="good">Verified</Chip>])} />
      </Panel>
    </div>
  );
}
export function ParentRegistrationPages({ tab }: { tab: "add-parent" | "bulk-import" }) { return tab === "add-parent" ? <AddParent /> : <BulkParents />; }

// ═════════════ profile ═════════════
export type ProfTab = "personal-details" | "contact-details" | "address";
const BANDS = ["Below ₹5 lakh", "₹5–10 lakh", "₹10–20 lakh", "Above ₹20 lakh"];
export function ParentProfilePages({ tab }: { tab: ProfTab }) {
  const list = useParents();
  const [pick, setPick] = useState("");
  const parents = list.data?.items ?? [];
  const id = pick || parents[0]?.id || "";
  const one = useLoad(() => (id ? schoolFetch<Full>(`${PM}/${id}`) : Promise.resolve(null)), [id]);
  const act = useAction(() => one.reload());
  const [f, setF] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const p = one.data;
  const v = (k: string, d = "") => f[k] ?? ((p as unknown as Record<string, string> | null)?.[k] || d);
  const set = (k: string, x: string) => { setF((o) => ({ ...o, [k]: x })); setSaved(false); };
  const inp = (k: string, label: string, o: { max?: number; type?: string; ro?: boolean; value?: string } = {}) => <Field label={label}><input type={o.type ?? "text"} className={inputCls} maxLength={o.max ?? 150} readOnly={o.ro} disabled={o.ro} value={o.value ?? v(k)} onChange={(e) => set(k, e.target.value)} /></Field>;
  const submit = async (e: FormEvent) => { e.preventDefault(); setSaved(false); const body: Record<string, string> = { ...f }; if (await act.run(() => schoolFetch(`${PM}/${id}`, json("PUT", body)))) { setF({}); setSaved(true); } };
  const cur = parents.find((x) => x.id === id);
  const title = { "personal-details": "Personal details", "contact-details": "Contact details", address: "Address" }[tab];
  const sp = p?.relation === "Mother" ? "Father" : "Mother";
  return (
    <div>
      <ErrorBanner message={list.error || one.error} />
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
        <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Parent
          <select aria-label="Parent" value={id} onChange={(e) => { setPick(e.target.value); setF({}); setSaved(false); }} className="max-w-[24rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{!parents.length && <option value="">No parents</option>}{parents.map((x) => <option key={x.id} value={x.id}>{x.name}{x.students[0] ? ` · parent of ${x.students[0].name}` : ""}</option>)}</select>
        </label>
        {cur && <Chip tone={tone(cur.login)}>{loginLabel(cur)}</Chip>}
      </div>
      {p && <FormCard title={title} onSubmit={submit} onDiscard={() => { setF({}); setSaved(false); }} busy={act.busy} error={act.error}>
        {tab === "personal-details" && <>
          {inp("full_name", "Name", { max: 200 })}
          <Field label="Relation"><select className={inputCls} disabled value={p.relation}>{RELATIONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
          {inp("occupation", "Occupation", { max: 100 })}{inp("qualification", "Qualification", { max: 100 })}
          <div><Field label="Parent ID"><input className={inputCls} disabled readOnly value={p.parent_code} /></Field><p className="mt-1 text-[11px] text-slate-500">Set by the system. Parents see it in their portal.</p></div>
          {p.spouse && <>{inp("spouse_name", `${sp}'s name`, { max: 200, value: f.spouse_name ?? p.spouse.name })}{inp("spouse_occupation", `${sp}'s occupation`, { max: 100, value: f.spouse_occupation ?? p.spouse.occupation })}</>}
          <Field label="Annual income (optional)"><select className={inputCls} value={v("income_band")} onChange={(e) => set("income_band", e.target.value)}><option value="">—</option>{[...new Set([...BANDS, ...(p.income_band ? [p.income_band] : [])])].map((b) => <option key={b}>{b}</option>)}</select></Field>
        </>}
        {tab === "contact-details" && <>
          {inp("phone", "Mobile", { max: 30, value: v("phone", p.mobile) })}{inp("email", "Email", { max: 255, type: "email" })}{inp("whatsapp", "WhatsApp", { max: 30 })}
          <Field label="Preferred language"><select className={inputCls} value={v("language")} onChange={(e) => set("language", e.target.value)}><option value="">—</option>{["English", "Hindi", "Telugu"].map((l) => <option key={l}>{l}</option>)}</select></Field>
          {inp("emergency_name", "Emergency contact name")}{inp("emergency_phone", "Emergency contact number", { max: 30 })}
          <Note>Parents can&apos;t change their mobile number themselves. They request it, and you approve it in Parent Requests › Mobile Number Changes.</Note>
        </>}
        {tab === "address" && <>
          <div className="sm:col-span-2 lg:col-span-5"><Field label="Address"><textarea className={`${inputCls} min-h-20`} maxLength={400} value={v("address")} onChange={(e) => set("address", e.target.value)} /></Field></div>
          {inp("city", "City", { max: 100 })}{inp("pincode", "PIN code", { max: 10 })}
        </>}
        {saved && <p role="status" className="text-sm font-semibold text-emerald-700 sm:col-span-2 lg:col-span-5">Saved</p>}
      </FormCard>}
      {!p && !one.loading && <p className="py-8 text-center text-sm text-slate-400">No parents yet.</p>}
    </div>
  );
}

// ═════════════ family mapping ═════════════
interface Fam { siblings: { id: string; family: string; children: Kid[] }[]; guardians: { id: string; student_id: string; student: string; guardian: string; relation: string; can_pick_up: boolean }[] }
export type FamTab = "link-students" | "sibling-mapping" | "guardian-mapping";
export function FamilyMappingPages({ tab }: { tab: FamTab }) {
  const list = useParents();
  const fam = useLoad(() => schoolFetch<Fam>(`${PM}/family`), []);
  const roster = useRoster();
  const act = useAction(() => { list.reload(); fam.reload(); });
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Parent | null>(null);
  const [vf, setVf] = useState<Fam["siblings"][number] | null>(null);
  const [vg, setVg] = useState<Fam["guardians"][number] | null>(null);
  const [link, setLink] = useState<Parent | null>(null);
  const [lf, setLf] = useState({ student_id: "", relation: "Father" });
  const err = <ErrorBanner message={list.error || fam.error || roster.error || act.error} />;
  if (tab === "link-students") {
    const all = list.data?.items ?? [];
    const rows = all.filter((p) => has({ n: p.name, s: p.students.map((k) => k.name), m: p.mobile }, search));
    const kids = (roster.data?.items ?? []).filter((r) => !link?.students.some((k) => k.id === r.id));
    const save = async (e: FormEvent) => { e.preventDefault(); if (link && await act.run(() => schoolFetch(`${PM}/${link.id}/link`, json("POST", { student_id: lf.student_id || kids[0]?.id, relation: lf.relation })))) setLink(null); };
    return (
      <div data-report>{err}
        <ListPanel title="Linked students" noun="parents" search={search} onSearch={setSearch} exportName="linked-students" head={["Parent", "Students", "Mobile"]} exportRows={rows.map((p) => [p.name, p.students.map((k) => `${k.name} (${k.class_label})`).join("; "), p.mobile])}
          tableHead={["Parent", "Students", "Mobile", ""]} empty={list.loading ? "Loading…" : "No parents yet."}
          rows={rows.map((p) => [<b key="n" className="font-semibold text-slate-900">{p.name}</b>, kidLinks(p.students.map((k) => ({ ...k, name: `${k.name.split(" ")[0]} (${k.class_label.replace(/\s+[A-Z]$/, "")})` })), false), p.mobile || "—", <span key="a" className="flex gap-1.5"><button type="button" className={small} onClick={() => { setLink(p); setLf({ student_id: "", relation: p.relation }); }}>Link a student</button><button type="button" className={small} onClick={() => setView(p)}>View details</button></span>])} />
        <ParentModal p={view} close={() => setView(null)} />
        <Modal open={!!link} title={`Link a student to ${link?.name ?? ""}`} onClose={() => setLink(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Student"><select className={inputCls} required value={lf.student_id || kids[0]?.id || ""} onChange={(e) => setLf({ ...lf, student_id: e.target.value })}>{kids.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.class_label}</option>)}</select></Field>
            <Field label="Relation"><select className={inputCls} value={lf.relation} onChange={(e) => setLf({ ...lf, relation: e.target.value })}>{RELATIONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setLink(null)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Link</button></div>
          </form>
        </Modal>
      </div>
    );
  }
  if (tab === "sibling-mapping") {
    const rows = (fam.data?.siblings ?? []).filter((x) => has({ f: x.family, c: x.children.map((k) => k.name) }, search));
    return (
      <div data-report>{err}
        <ListPanel title="Siblings" noun="families" search={search} onSearch={setSearch} exportName="siblings" head={["Family", "Children"]} exportRows={rows.map((x) => [x.family, x.children.map((k) => `${k.name} ${k.class_label}`).join("; ")])}
          tableHead={["Family", "Children", "Sibling discount", ""]} empty={fam.loading ? "Loading…" : "No families with more than one child yet."}
          rows={rows.map((x) => [<b key="n" className="font-semibold text-slate-900">{x.family}</b>, <span key="c">{x.children.map((k, i) => <span key={k.id}>{i > 0 && ", "}<span className="font-semibold text-[#026f9b]">{k.name.split(" ")[0]}</span> · {k.class_label}</span>)}</span>, <Chip key="d" tone="good">Eligible</Chip>, <button key="v" type="button" className={small} onClick={() => setVf(x)}>View details</button>])} />
        <Modal open={!!vf} title={vf?.family ?? ""} onClose={() => setVf(null)}>{vf && <><dl>{vf.children.map((k) => <Row key={k.id} k={k.name} v={k.class_label} />)}</dl><Foot close={() => setVf(null)} /></>}</Modal>
      </div>
    );
  }
  const rows = (fam.data?.guardians ?? []).filter((x) => has(x, search));
  return (
    <div data-report>{err}
      <ListPanel title="Guardians" noun="students" search={search} onSearch={setSearch} exportName="guardians" head={["Student", "Guardian", "Relation", "Can pick up"]} exportRows={rows.map((x) => [x.student, x.guardian, x.relation, x.can_pick_up ? "Approved" : "Not approved"])}
        tableHead={["Student", "Guardian", "Relation", "Can pick up", ""]} empty={fam.loading ? "Loading…" : "No guardians apart from parents."}
        rows={rows.map((x) => [<span key="n" className="font-semibold text-[#026f9b]">{x.student}</span>, x.guardian, x.relation, <Chip key="p" tone={x.can_pick_up ? "good" : "mute"}>{x.can_pick_up ? "Approved" : "Not approved"}</Chip>, <button key="v" type="button" className={small} onClick={() => setVg(x)}>View details</button>])} />
      <Modal open={!!vg} title={vg?.guardian ?? ""} onClose={() => setVg(null)}>{vg && <><dl><Row k="Student" v={vg.student} /><Row k="Relation" v={vg.relation} /><Row k="Can pick up" v={vg.can_pick_up ? "Approved" : "Not approved"} /></dl><Foot close={() => setVg(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ access ═════════════
export type AccessTab = "create-login" | "reset-password" | "activate-deactivate";
export function ParentAccessPages({ tab }: { tab: AccessTab }) {
  const { data, error, loading, reload } = useParents();
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const all = data?.items ?? [];
  const base = tab === "create-login" ? all.filter((p) => p.login === "Not installed") : all;
  const rows = base.filter((p) => has({ n: p.name, s: p.students.map((k) => k.name), m: p.mobile }, search));
  const go = async (p: Parent, action: string, ok: string) => { setMsg(""); if (await act.run(() => schoolFetch(`${PM}/${p.id}/login`, json("PUT", { action })))) setMsg(ok); };
  const title = { "create-login": "Create Login", "reset-password": "Reset Password", "activate-deactivate": "Activate / Deactivate" }[tab];
  return (
    <div data-report>
      <ErrorBanner message={error || act.error} />
      {msg && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
      <ListPanel title={title} noun="parents" search={search} onSearch={setSearch} exportName={tab} head={["Parent", "Student", "Mobile", "Login"]} exportRows={rows.map((p) => [p.name, p.students.map((k) => k.name).join("; "), p.mobile, loginLabel(p)])}
        tableHead={["Parent", "Student", "Mobile", "Login", ""]} empty={loading ? "Loading…" : tab === "create-login" ? "Every parent already has a login." : "No parents yet."}
        rows={rows.map((p) => [<b key="n" className="font-semibold text-slate-900">{p.name}</b>, kidLinks(p.students.slice(0, 1)), p.mobile || "—", <Chip key="l" tone={tone(p.login)}>{p.login === "Not installed" && tab !== "create-login" ? "Not installed" : p.login}</Chip>,
          tab === "create-login" ? <button key="a" type="button" className={primaryCls} disabled={act.busy} onClick={() => void go(p, "create", `Login created for ${p.name}.`)}>Create login</button>
            : tab === "reset-password" ? <button key="a" type="button" className={small} disabled={act.busy || p.login === "Not installed"} onClick={() => void go(p, "reset", `New one-time password requested for ${p.name}. It goes out when SMS is connected.`)}>Send OTP</button>
              : p.login === "Active" ? <button key="a" type="button" className={quietCls} disabled={act.busy} onClick={() => void go(p, "deactivate", `${p.name} deactivated.`)}>Deactivate</button>
                : <button key="a" type="button" className={primaryCls} disabled={act.busy} onClick={() => void go(p, p.login === "Inactive" ? "activate" : "create", `${p.name} activated.`)}>Activate</button>])} />
    </div>
  );
}

// ═════════════ communication ═════════════
interface Msg { id: string; code: string; subject: string; body: string; sent_on: string; status: string; parent: string; student: string }
export type CommTab = "messages" | "notifications" | "meeting-history";
const KIND = { messages: "message", notifications: "notification", "meeting-history": "meeting" } as const;
const KIND_LABEL = { messages: "Messages", notifications: "Notifications", "meeting-history": "Meeting history" } as const;
const NEXT: Record<string, [string, string][]> = { Delivered: [["Mark read", "Read"]], Read: [["Mark replied", "Replied"]], Scheduled: [["Mark held", "Held"], ["Cancel", "Cancelled"]] };
export function ParentCommunicationPages({ tab }: { tab: CommTab }) {
  const kind = KIND[tab];
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Msg[]; statuses: string[] }>(`${PM}/messages/${kind}`), [kind]);
  const parents = useParents();
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Msg | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ guardian_id: "", student_id: "", subject: "", body: "", sent_on: todayIso() });
  const all = data?.items ?? [];
  const rows = all.filter((m) => has(m, search));
  const n = (s: string) => all.filter((m) => m.status === s).length;
  const ps = parents.data?.items ?? [];
  const gid = f.guardian_id || ps[0]?.id || "";
  const chosen = ps.find((p) => p.id === gid);
  const tiles = [{ label: "Parent messages", value: all.length, sub: "All records" }, ...(data?.statuses ?? []).filter((s) => all.some((m) => m.status === s) || s === "Read" || s === "Delivered").map((s) => ({ label: s, value: n(s), sub: pct(n(s), all.length) }))].slice(0, 4);
  const set = async (m: Msg, status: string) => { if (await act.run(() => schoolFetch(`${PM}/messages/${m.id}`, json("PATCH", { status })))) setView(null); };
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${PM}/messages`, json("POST", { kind, guardian_id: gid, student_id: f.student_id || chosen?.students[0]?.id || "", subject: f.subject, body: f.body, sent_on: f.sent_on })))) { setAdding(false); setF({ guardian_id: "", student_id: "", subject: "", body: "", sent_on: todayIso() }); } };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || parents.error || act.error} />
      <Tiles items={tiles} />
      <ListPanel title="Parent messages" noun="messages" search={search} onSearch={setSearch} exportName={tab} head={["Ref.", "Parent", "Student", "Type", "Subject", "Date", "Status"]} exportRows={rows.map((m) => [m.code, m.parent, m.student, KIND_LABEL[tab], m.subject, day(m.sent_on), m.status])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ New {kind === "meeting" ? "meeting" : kind}</button>}
        tableHead={["Ref.", "Parent", "Student", "Type", "Subject", "Date", "Status", ""]} empty={loading ? "Loading…" : "Nothing here yet."}
        rows={rows.map((m) => [m.code, m.parent, <span key="s" className="font-semibold text-[#026f9b]">{m.student || "—"}</span>, KIND_LABEL[tab], m.subject, day(m.sent_on), <Chip key="t" tone={m.status === "Delivered" || m.status === "Read" || m.status === "Held" ? "good" : m.status === "Cancelled" ? "bad" : "mute"}>{m.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(m)}>View details</button>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.subject}` : ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Parent" v={view.parent} /><Row k="Student" v={view.student || "—"} /><Row k="Date" v={day(view.sent_on)} /><Row k="Status" v={view.status} />{view.body && <Row k="Message" v={view.body} />}</dl>
        <Foot close={() => setView(null)} left={<>{(NEXT[view.status] ?? []).filter(([, s]) => (data?.statuses ?? []).includes(s)).map(([label, s]) => <button key={s} type="button" className={s === "Cancelled" ? quietCls : primaryCls} disabled={act.busy} onClick={() => void set(view, s)}>{label}</button>)}</>} /></>}</Modal>
      <Modal open={adding} title={`New ${kind === "meeting" ? "meeting" : kind}`} onClose={() => setAdding(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Parent"><select className={inputCls} required value={gid} onChange={(e) => setF({ ...f, guardian_id: e.target.value, student_id: "" })}>{ps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Student"><select className={inputCls} value={f.student_id || chosen?.students[0]?.id || ""} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{(chosen?.students ?? []).map((k) => <option key={k.id} value={k.id}>{k.name} · {k.class_label}</option>)}</select></Field>
          <Field label="Subject"><input className={inputCls} required minLength={2} maxLength={200} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
          <Field label="Date"><input type="date" className={inputCls} required value={f.sent_on} onChange={(e) => setF({ ...f, sent_on: e.target.value })} /></Field>
          <Field label="Details"><textarea className={`${inputCls} min-h-20`} maxLength={2000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}
