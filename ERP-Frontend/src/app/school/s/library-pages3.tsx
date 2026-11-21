"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { Foot, FormFoot, inr, okBox, primaryCls } from "./fee-pages";
import { useGoTab } from "./tab-context";

const L = "/school/lib"; const V = "/school/inv";
const nowIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const T = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (["Active", "Issued", "Paid", "Available", "In stock", "Ready to collect", "Returned"].includes(s) ? "good" : ["Overdue", "Unpaid", "Waiting", "Low stock"].includes(s) ? "warn" : ["Blocked", "Lost"].includes(s) ? "bad" : "mute");
const Loading = ({ e }: { e?: string }) => <div><ErrorBanner message={e ?? ""} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></div>;
const tiles = (items: [string, string | number, string?][]) => <Tiles items={items.map(([label, value, sub]) => ({ label, value, sub: sub ?? "" }))} />;
const cnt = (all: { status: string }[], s: string): [string, number, string] => [s, all.filter((x) => x.status === s).length, `${pct(all.filter((x) => x.status === s).length, all.length)} of shown`];

// ═════════════ membership ═════════════
interface Mb { id: string; code: string; name: string; type: string; group: string; allowed: number; out: number; valid_until: string; status: string; fines: boolean }
export function MembershipPages({ tab }: { tab: "student-membership" | "staff-membership" }) {
  const kind = tab === "student-membership" ? "Student" : "Staff";
  const d = useLoad(() => schoolFetch<{ items: Mb[]; people: { id: string; name: string }[] }>(`${L}/members/${kind}`), [kind]); const act = useAction(() => d.reload());
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [view, setView] = useState<Mb | null>(null); const [adding, setAdding] = useState(false); const [pick, setPick] = useState("");
  const all = d.data?.items ?? []; const rows = all.filter((i) => has(i, search)); const people = d.data?.people ?? [];
  const add = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${L}/members`, json("POST", { kind, ref_id: pick || people[0]?.id })))) setAdding(false); };
  return <div className="space-y-5" data-report><ErrorBanner message={d.error || act.error} />{okBox(msg)}{tiles([["Library members", all.length, "All records"], [...cnt(all, "Active")], ...(all.some((x) => x.status === "Blocked") ? [cnt(all, "Blocked")] : [])])}
    <ListPanel title="Library members" noun="members" search={search} onSearch={setSearch} exportName={tab} head={["Member ID", "Name", "Type", "Class / dept", "Books allowed", "Books out", "Valid until", "Status"]} exportRows={rows.map((i) => [i.code, i.name, i.type, i.group, i.allowed, i.out, day(i.valid_until), i.status])}
      extra={<>{people.length > 0 && <button type="button" className={small} onClick={() => setAdding(true)}>+ Add member</button>}{people.length > 0 && <button type="button" className={`${primaryCls} !px-3`} disabled={act.busy} onClick={() => void act.run(async () => { const r = await schoolFetch<{ added: number }>(`${L}/members/enrol/${kind}`, json("POST", {})); setMsg(`${r.added} ${kind.toLowerCase()}s enrolled until 31 March.`); })}>Enrol everyone ({people.length})</button>}</>}
      tableHead={["Member ID", "Name", "Type", "Class / dept", "Books allowed", "Books out", "Valid until", "Status", ""]} empty={d.loading ? "Loading…" : "No members yet."}
      rows={rows.map((i) => [i.code, <b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.type, i.group || "—", i.allowed, i.out, day(i.valid_until), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(i)}>View details</button>])} />
    <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Member ID" v={view.code} /><Row k="Class / dept" v={view.group || "—"} /><Row k="Books" v={`${view.out} of ${view.allowed}`} /><Row k="Valid until" v={day(view.valid_until)} /><Row k="Unpaid fines" v={view.fines ? "Yes" : "No"} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} left={<button type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${L}/members/${view.id}`, json("PATCH", { status: view.status === "Active" ? "Blocked" : "Active" }))).then((ok) => ok && setView(null))}>{view.status === "Active" ? "Block" : "Unblock"}</button>} /></>}</Modal>
    <Modal open={adding} title="Add a member" onClose={() => setAdding(false)}><form onSubmit={add} className="space-y-3"><Field label={kind}><select className={inputCls} value={pick || people[0]?.id || ""} onChange={(e) => setPick(e.target.value)}>{people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal></div>;
}

// ═════════════ issues, returns, reports ═════════════
interface Is { id: string; acc_no: string; book: string; member: string; group: string; issued_on: string; due_on: string; returned_on: string | null; renewals: number; status: string }
export function IssuePages({ tab }: { tab: "issue-book" | "issue-history" | "return-book" | "renewal" | "issued" | "overdue" | "lost" }) {
  const view = { "return-book": "out", renewal: "out", issued: "issued", overdue: "overdue", lost: "lost" }[tab as string];
  const h = useLoad(() => (tab !== "issue-book" ? schoolFetch<{ items: Is[] }>(`${L}/issues${view ? `?view=${view}` : ""}`) : Promise.resolve(null)), [tab]);
  const fm = useLoad(() => (tab === "issue-book" ? schoolFetch<{ members: { id: string; name: string; code: string }[]; copies: { id: string; acc_no: string; title: string }[] }>(`${L}/issue-form`) : Promise.resolve(null)), [tab]);
  const st = useLoad(() => (tab === "issue-book" ? schoolFetch<{ days_student: number; days_staff: number }>(`${L}/settings`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { h.reload(); fm.reload(); }); const go = useGoTab();
  const [f, setF] = useState({ acc_no: "", member_id: "", issued_on: nowIst() }); const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [v, setV] = useState<Is | null>(null);
  const err = h.error || fm.error || act.error;
  if (tab === "issue-book") {
    const copy = fm.data?.copies.find((c) => c.acc_no === f.acc_no.trim()); const due = new Date(Date.parse(f.issued_on) + (st.data?.days_student ?? 14) * 86400000).toISOString().slice(0, 10);
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${L}/issues`, json("POST", { acc_no: f.acc_no, member_id: f.member_id || fm.data?.members[0]?.id, issued_on: f.issued_on })))) { setF({ ...f, acc_no: "" }); setMsg("Saved. It appears in Issue History."); } };
    return <div>{okBox(msg)}<FormCard title="Issue Book" cols="lg:grid-cols-6" onSubmit={save} onDiscard={() => { setF({ acc_no: "", member_id: "", issued_on: nowIst() }); setMsg(""); }} busy={act.busy} error={err}>
      <Field label="Acc. no."><input className={inputCls} required list="lib-acc" value={f.acc_no} onChange={(e) => setF({ ...f, acc_no: e.target.value })} /><datalist id="lib-acc">{fm.data?.copies.map((c) => <option key={c.id} value={c.acc_no}>{c.title}</option>)}</datalist></Field>
      <Field label="Book"><input className={inputCls} readOnly value={copy?.title ?? ""} /></Field>
      <Field label="Member"><select className={inputCls} required value={f.member_id || fm.data?.members[0]?.id || ""} onChange={(e) => setF({ ...f, member_id: e.target.value })}>{fm.data?.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
      <Field label="Issued"><input type="date" required className={inputCls} value={f.issued_on} onChange={(e) => setF({ ...f, issued_on: e.target.value })} /></Field>
      <Field label="Due (students)"><input type="date" className={inputCls} readOnly value={due} /></Field></FormCard>
      <p className="mt-3 text-xs text-slate-500">Members, limits, expired memberships and unpaid fines are checked when you save. Staff get their own return period.</p></div>;
  }
  const all = h.data?.items ?? []; const rows = all.filter((i) => has(i, search));
  const run = (path: string, ok: string) => void act.run(async () => { const r = await schoolFetch<{ fine?: number; due?: string }>(`${L}/issues/${path}`, json("POST", {})); setMsg(`${ok}${r.fine ? ` A fine of ${inr(r.fine)} was added.` : ""}${r.due ? ` New due date ${day(r.due)}.` : ""}`); setV(null); });
  const ret = tab === "return-book"; const ren = tab === "renewal";
  const title = { "issue-history": "Book issues", "return-book": "Book issues", renewal: "Book issues", issued: "Book issues", overdue: "Book issues", lost: "Book issues" }[tab];
  return <div className="space-y-5" data-report><ErrorBanner message={err} />{okBox(msg)}{tiles([["Book issues", all.length, "All records"], ...(tab === "lost" ? [] : tab === "issued" ? [cnt(all, "Issued")] : tab === "overdue" ? [cnt(all, "Overdue")] : [cnt(all, "Issued"), cnt(all, "Overdue")])])}
    <ListPanel title={title} noun="issues" search={search} onSearch={setSearch} exportName={tab} head={["Acc. no.", "Book", "Member", "Class", "Issued", "Due", "Status"]} exportRows={rows.map((i) => [i.acc_no, i.book, i.member, i.group, day(i.issued_on), day(i.due_on), i.status])}
      tableHead={["Acc. no.", "Book", "Member", "Class", "Issued", "Due", "Status", ""]} empty={h.loading ? "Loading…" : "Nothing in this list yet."}
      rows={rows.map((i) => [i.acc_no, <b key="b" className="font-semibold text-slate-900">{i.book}</b>, i.member, i.group || "—", day(i.issued_on), day(i.due_on), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>,
        <span key="a" className="flex gap-1.5">{ret && <button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => run(`${i.id}/return`, "Returned.")}>Return</button>}{ren && <button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => run(`${i.id}/renew`, "Renewed.")}>Renew</button>}<button type="button" className={small} onClick={() => setV(i)}>View details</button></span>])} />
    <Modal open={!!v} title={v?.book ?? ""} onClose={() => setV(null)}>{v && <><ErrorBanner message={act.error} /><dl><Row k="Acc. no." v={v.acc_no} /><Row k="Member" v={`${v.member} · ${v.group}`} /><Row k="Issued" v={day(v.issued_on)} /><Row k="Due" v={day(v.due_on)} /><Row k="Returned" v={v.returned_on ? day(v.returned_on) : "—"} /><Row k="Renewals" v={v.renewals} /><Row k="Status" v={v.status} /></dl>
      <Foot close={() => setV(null)} left={["Issued", "Overdue"].includes(v.status) ? <><button type="button" className={small} disabled={act.busy} onClick={() => run(`${v.id}/lost`, "Marked lost.")}>Mark lost</button><button type="button" className={small} disabled={act.busy} onClick={() => run(`${v.id}/renew`, "Renewed.")}>Renew</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => run(`${v.id}/return`, "Returned.")}>Return</button></> : undefined} /></>}</Modal>
    {tab === "issue-history" && <button type="button" className="hidden" onClick={() => go("issue-book")} />}</div>;
}
export function AvailableReport() {
  const b = useLoad(() => schoolFetch<{ items: { id: string; book_no: string; title: string; author: string; category: string; publisher: string; copies: number; available: number; status: string }[] }>(`${L}/books`), []);
  const [search, setSearch] = useState(""); const all = (b.data?.items ?? []).filter((x) => x.available > 0); const rows = all.filter((i) => has(i, search));
  return <div className="space-y-5" data-report><ErrorBanner message={b.error} />{tiles([["Books", all.length, "All records"], ["Available", all.length, "100% of shown"]])}<ListPanel title="Books" noun="titles" search={search} onSearch={setSearch} exportName="available-books" head={["Book no.", "Title", "Author", "Category", "Publisher", "Copies", "Available"]} exportRows={rows.map((i) => [i.book_no, i.title, i.author, i.category, i.publisher, i.copies, i.available])}
    tableHead={["Book no.", "Title", "Author", "Category", "Publisher", "Copies", "Available", "Status"]} empty={b.loading ? "Loading…" : "Nothing available."} rows={rows.map((i) => [i.book_no, <b key="t" className="font-semibold text-slate-900">{i.title}</b>, i.author || "—", i.category || "—", i.publisher || "—", i.copies, i.available, <Chip key="s" tone="good">Available</Chip>])} /></div>;
}

// ═════════════ reservations ═════════════
interface Rv { id: string; code: string; book: string; member: string; group: string; reserved_on: string; position: number; status: string; book_id: string }
export function ReservationPages({ tab }: { tab: "book-reservation" | "reservation-queue" }) {
  const d = useLoad(() => schoolFetch<{ books: { id: string; title: string }[]; members: { id: string; name: string; group: string }[]; items: Rv[] }>(`${L}/reservations`), []); const act = useAction(() => d.reload());
  const [f, setF] = useState({ book_id: "", member_id: "" }); const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [v, setV] = useState<Rv | null>(null);
  const x = d.data; const err = d.error || act.error;
  if (tab === "book-reservation") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${L}/reservations`, json("POST", { book_id: f.book_id || x?.books[0]?.id, member_id: f.member_id || x?.members[0]?.id })))) setMsg("Saved. It appears in Reservation Queue."); };
    return <div>{okBox(msg)}<FormCard title="Book Reservation" cols="lg:grid-cols-4" onSubmit={save} onDiscard={() => setMsg("")} busy={act.busy} error={err}>
      <Field label="Book"><select className={inputCls} value={f.book_id || x?.books[0]?.id || ""} onChange={(e) => setF({ ...f, book_id: e.target.value })}>{x?.books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</select></Field>
      <Field label="Member"><select className={inputCls} value={f.member_id || x?.members[0]?.id || ""} onChange={(e) => setF({ ...f, member_id: e.target.value })}>{x?.members.map((m) => <option key={m.id} value={m.id}>{m.name} · {m.group}</option>)}</select></Field>
      <Field label="Reserved on"><input className={inputCls} readOnly value={day(nowIst())} /></Field><Field label="Queue position"><input className={inputCls} readOnly placeholder="Worked out when saved" /></Field></FormCard></div>;
  }
  const all = x?.items ?? []; const rows = all.filter((i) => has(i, search));
  const cancel = (r: Rv) => void act.run(() => schoolFetch(`${L}/reservations/${r.id}/cancel`, json("POST", {}))).then((ok) => ok && setV(null));
  return <div className="space-y-5" data-report><ErrorBanner message={err} />{tiles([["Reservations", all.length, "All records"], ...(["Waiting", "Ready to collect", "Cancelled"] as const).map((s) => cnt(all, s))])}
    <ListPanel title="Reservations" noun="reservations" search={search} onSearch={setSearch} exportName="reservations" head={["Ref.", "Book", "Member", "Class", "Reserved on", "Queue position", "Status"]} exportRows={rows.map((i) => [i.code, i.book, i.member, i.group, day(i.reserved_on), i.position, i.status])}
      tableHead={["Ref.", "Book", "Member", "Class", "Reserved on", "Queue position", "Status", ""]} empty={d.loading ? "Loading…" : "No reservations yet."}
      rows={rows.map((i) => [i.code, i.book, <b key="m" className="font-semibold text-[#026f9b]">{i.member}</b>, i.group || "—", day(i.reserved_on), <span key="p" className="block text-right">{i.position || "—"}</span>, <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setV(i)}>View details</button>])} />
    <p className="text-xs text-slate-500">When a copy is returned, the first person waiting is marked Ready to collect. Issue it from Book Issue using the copy&apos;s accession number.</p>
    <Modal open={!!v} title={v?.code ?? ""} onClose={() => setV(null)}>{v && <><dl><Row k="Book" v={v.book} /><Row k="Member" v={`${v.member} · ${v.group}`} /><Row k="Reserved on" v={day(v.reserved_on)} /><Row k="Queue position" v={v.position || "—"} /><Row k="Status" v={v.status} /></dl><Foot close={() => setV(null)} left={["Waiting", "Ready to collect"].includes(v.status) ? <button type="button" className={small} disabled={act.busy} onClick={() => cancel(v)}>Cancel reservation</button> : undefined} /></>}</Modal></div>;
}

// ═════════════ fines ═════════════
export function LibraryFinePage() {
  const d = useLoad(() => schoolFetch<{ items: { id: string; code: string; member: string; book: string; reason: string; amount: number; fined_on: string; status: string }[] }>(`${L}/fines`), []); const act = useAction(() => d.reload());
  const [search, setSearch] = useState(""); const all = d.data?.items ?? []; const rows = all.filter((i) => has(i, search));
  const set = (id: string, status: string) => void act.run(() => schoolFetch(`${L}/fines/${id}`, json("PATCH", { status })));
  return <div className="space-y-5" data-report><ErrorBanner message={d.error || act.error} />{tiles([["Library fines", all.length, "All records"], cnt(all, "Unpaid"), cnt(all, "Paid")])}
    <ListPanel title="Library fines" noun="fines" search={search} onSearch={setSearch} exportName="library-fines" head={["Ref.", "Member", "Book", "Reason", "Amount", "Date", "Status"]} exportRows={rows.map((i) => [i.code, i.member, i.book, i.reason, i.amount, day(i.fined_on), i.status])}
      tableHead={["Ref.", "Member", "Book", "Reason", "Amount", "Date", "Status", ""]} empty={d.loading ? "Loading…" : "No fines yet."}
      rows={rows.map((i) => [i.code, i.member, i.book, i.reason, inr(i.amount), day(i.fined_on), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <span key="a" className="flex gap-1.5">{i.status === "Unpaid" && <><button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => set(i.id, "Paid")}>Collect</button><button type="button" className={small} disabled={act.busy} onClick={() => set(i.id, "Waived")}>Waive</button></>}</span>])} /></div>;
}

// ═════════════ settings ═════════════
interface St { options: { ref_rule: string[]; remind_days: number[]; max_fine: string[]; lost_rule: string[] }; lim_low: number; lim_high: number; lim_staff: number; ref_rule: string; days_student: number; days_staff: number; renewals: number; remind_days: number; late_student: number; late_staff: number; max_fine: string; lost_rule: string; block_unpaid: boolean }
const Rw = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3.5"><div><p className="text-[13px] text-slate-900">{title}</p>{hint && <p className="text-[11px] text-[#026f9b]">{hint}</p>}</div>{children}</div>;
export function LibrarySettingsPages({ tab }: { tab: "issue-limits" | "return-period" | "fine-rules" }) {
  const l = useLoad(() => schoolFetch<St>(`${L}/settings`), []); const act = useAction(() => l.reload()); const [d, setD] = useState<Partial<St>>({}); const [msg, setMsg] = useState(""); const c = l.data;
  if (!c) return <Loading e={l.error} />;
  const v = <K extends keyof St>(k: K) => (d[k] ?? c[k]) as St[K]; const box = "w-36 rounded-md border border-slate-300 px-2.5 py-1.5 text-right text-[13px]"; const sel = "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px]";
  const num = (k: "lim_low" | "lim_high" | "lim_staff" | "days_student" | "days_staff" | "renewals" | "late_student", t: string, h?: string) => <Rw key={k} title={t} hint={h}><input type="number" min={0} aria-label={t} className={box} value={v(k)} onChange={(e) => setD({ ...d, [k]: Number(e.target.value) })} /></Rw>;
  const sl = (k: "ref_rule" | "max_fine" | "lost_rule", t: string) => <Rw key={k} title={t}><select aria-label={t} className={sel} value={v(k)} onChange={(e) => setD({ ...d, [k]: e.target.value })}>{c.options[k].map((o) => <option key={o}>{o}</option>)}</select></Rw>;
  const save = async () => { setMsg(""); const { options, ...cur } = c; void options; if (await act.run(() => schoolFetch(`${L}/settings`, json("PUT", { ...cur, ...d })))) { setD({}); setMsg("Saved."); } };
  const body = tab === "issue-limits" ? <>{num("lim_low", "Books per student", "Classes 1 – 5 and below")}{num("lim_high", "Books per student", "Classes 6 – 12")}{num("lim_staff", "Books per staff member")}{sl("ref_rule", "Reference books")}</>
    : tab === "return-period" ? <>{num("days_student", "Students (days)")}{num("days_staff", "Staff (days)")}{num("renewals", "Renewals allowed")}<Rw title="Remind before due"><select aria-label="Remind before due" className={sel} value={v("remind_days")} onChange={(e) => setD({ ...d, remind_days: Number(e.target.value) })}>{c.options.remind_days.map((o) => <option key={o} value={o}>{o} days</option>)}</select></Rw></>
    : <>{num("late_student", "Late return (₹ per book per day)", "Staff rate is set below")}<Rw title="Late return, staff (₹ a day)"><input type="number" min={0} aria-label="Staff late fee" className={box} value={v("late_staff")} onChange={(e) => setD({ ...d, late_staff: Number(e.target.value) })} /></Rw>{sl("max_fine", "Maximum fine per book")}{sl("lost_rule", "Lost book")}<Rw title="Block new issues while fines are unpaid"><Toggle checked={v("block_unpaid")} onChange={(x) => setD({ ...d, block_unpaid: x })} label="Block new issues while fines are unpaid" /></Rw></>;
  return <div>{msg && okBox(msg)}<ErrorBanner message={l.error || act.error} /><div className="rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{{ "issue-limits": "Issue limits", "return-period": "Return period", "fine-rules": "Fine rules" }[tab]}</h2></div>{body}<div className="flex justify-end gap-2.5 px-5 py-3.5"><button type="button" className={btnGhost} onClick={() => { setD({}); setMsg(""); }}>Discard</button><button type="button" className={btnPrimary} disabled={act.busy} onClick={() => void save()}>Save</button></div></div>
    <p className="mt-3 text-xs text-slate-500">Issue limits, return periods, renewals, late fees and the unpaid-fine block are applied. Reference-book rules and reminders are saved only. A fine is capped at a book&apos;s price only when the book has a price, and books have no price field yet, so late fines aren&apos;t capped and a lost book costs the ₹50 processing fee.</p></div>;
}

// ═════════════ inventory items ═════════════
interface It { id: string; code: string; name: string; category_id: string | null; category: string; unit: string; in_stock: number; reorder_at: number; unit_price: number; status: string }
export function ItemPages({ tab }: { tab: "item-list" | "add-item" | "item-categories" }) {
  const it = useLoad(() => schoolFetch<{ categories: { id: string; name: string }[]; items: It[] }>(`${V}/items`), []);
  const ct = useLoad(() => (tab === "item-categories" ? schoolFetch<{ items: { id: string; name: string; status: string; items: number; stock_value: number; low: number }[] }>(`${V}/item-categories`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { it.reload(); ct.reload(); });
  const blank = { code: "", name: "", category_id: "", in_stock: "", reorder_at: "40", unit: "pieces", unit_price: "" }; const [f, setF] = useState(blank); const [cn, setCn] = useState("");
  const [search, setSearch] = useState(""); const [msg, setMsg] = useState(""); const [v, setV] = useState<It | null>(null); const [ed, setEd] = useState({ in_stock: "", reorder_at: "", unit_price: "" }); const err = it.error || ct.error || act.error;
  if (tab === "add-item") {
    const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${V}/items`, json("POST", { code: f.code || undefined, name: f.name, category_id: f.category_id || it.data?.categories[0]?.id || null, unit: f.unit, in_stock: Number(f.in_stock) || 0, reorder_at: Number(f.reorder_at) || 0, unit_price: Number(f.unit_price) || 0 })))) { setF(blank); setMsg("Saved. It appears in Item List."); } };
    return <div>{okBox(msg)}<FormCard title="Add Item" cols="lg:grid-cols-6" onSubmit={save} onDiscard={() => { setF(blank); setMsg(""); }} busy={act.busy} error={err}>
      <Field label="Item code"><input className={inputCls} maxLength={12} placeholder="Automatic" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field><Field label="Item"><input className={inputCls} required minLength={2} maxLength={160} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Category"><select className={inputCls} value={f.category_id || it.data?.categories[0]?.id || ""} onChange={(e) => setF({ ...f, category_id: e.target.value })}>{it.data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="In stock"><input type="number" min={0} required className={inputCls} value={f.in_stock} onChange={(e) => setF({ ...f, in_stock: e.target.value })} /></Field><Field label="Unit"><input className={inputCls} maxLength={20} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></Field>
      <Field label="Reorder at"><input type="number" min={0} className={inputCls} value={f.reorder_at} onChange={(e) => setF({ ...f, reorder_at: e.target.value })} /></Field><Field label="Unit price (₹)"><input type="number" min={0} className={inputCls} value={f.unit_price} onChange={(e) => setF({ ...f, unit_price: e.target.value })} /></Field></FormCard></div>;
  }
  if (tab === "item-categories") {
    const all = ct.data?.items ?? []; const rows = all.filter((i) => has(i, search));
    const add = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${V}/item-categories`, json("POST", { name: cn })))) setCn(""); };
    return <div className="space-y-5" data-report><ErrorBanner message={err} /><form onSubmit={add} className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4"><div className="w-64"><Field label="New category"><input className={inputCls} required minLength={2} maxLength={80} value={cn} onChange={(e) => setCn(e.target.value)} /></Field></div><button type="submit" className={btnPrimary} disabled={act.busy}>Add category</button></form>
      <ListPanel title="Item categories" noun="categories" search={search} onSearch={setSearch} exportName="item-categories" head={["Category", "Items", "Stock value", "Low or out", "Status"]} exportRows={rows.map((i) => [i.name, i.items, i.stock_value, i.low, i.status])} tableHead={["Category", "Items", "Stock value", "Low or out", "Status", ""]} empty={ct.loading ? "Loading…" : "No categories yet."}
        rows={rows.map((i) => [<b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.items, inr(i.stock_value), i.low, <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="t" type="button" className={small} disabled={act.busy} onClick={() => void act.run(() => schoolFetch(`${V}/item-categories/${i.id}`, json("PATCH", { status: i.status === "Active" ? "Inactive" : "Active" })))}>{i.status === "Active" ? "Make inactive" : "Make active"}</button>])} /></div>;
  }
  const all = it.data?.items ?? []; const rows = all.filter((i) => has(i, search));
  const save = () => void act.run(() => schoolFetch(`${V}/items/${v!.id}`, json("PUT", { name: v!.name, category_id: v!.category_id, unit: v!.unit, in_stock: Number(ed.in_stock), reorder_at: Number(ed.reorder_at), unit_price: Number(ed.unit_price) }))).then((ok) => ok && setV(null));
  return <div className="space-y-5" data-report><ErrorBanner message={err} />{tiles([["Items", all.length, "All records"], cnt(all, "In stock"), cnt(all, "Low stock")])}
    <ListPanel title="Items" noun="items" search={search} onSearch={setSearch} exportName="items" head={["Item code", "Item", "Category", "In stock", "Reorder at", "Unit price", "Status"]} exportRows={rows.map((i) => [i.code, i.name, i.category, `${i.in_stock} ${i.unit}`, i.reorder_at, i.unit_price, i.status])}
      tableHead={["Item code", "Item", "Category", "In stock", "Reorder at", "Unit price", "Status", ""]} empty={it.loading ? "Loading…" : "No items yet."}
      rows={rows.map((i) => [i.code, <b key="n" className="font-semibold text-slate-900">{i.name}</b>, i.category, `${i.in_stock.toLocaleString("en-IN")} ${i.unit}`, i.reorder_at, inr(i.unit_price), <Chip key="s" tone={T(i.status)}>{i.status}</Chip>, <button key="v" type="button" className={small} onClick={() => { setV(i); setEd({ in_stock: String(i.in_stock), reorder_at: String(i.reorder_at), unit_price: String(i.unit_price) }); }}>View details</button>])} />
    <Modal open={!!v} title={v?.name ?? ""} onClose={() => setV(null)}>{v && <><dl><Row k="Item code" v={v.code} /><Row k="Category" v={v.category} /></dl><div className="mt-3 grid grid-cols-3 gap-3"><Field label={`In stock (${v.unit})`}><input type="number" min={0} className={inputCls} value={ed.in_stock} onChange={(e) => setEd({ ...ed, in_stock: e.target.value })} /></Field><Field label="Reorder at"><input type="number" min={0} className={inputCls} value={ed.reorder_at} onChange={(e) => setEd({ ...ed, reorder_at: e.target.value })} /></Field><Field label="Unit price (₹)"><input type="number" min={0} className={inputCls} value={ed.unit_price} onChange={(e) => setEd({ ...ed, unit_price: e.target.value })} /></Field></div><Foot close={() => setV(null)} left={<button type="button" className={primaryCls} disabled={act.busy} onClick={save}>Save</button>} /></>}</Modal></div>;
}
