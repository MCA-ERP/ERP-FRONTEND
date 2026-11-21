"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { Bar, CollectBox, Foot, FormFoot, Pill, Rw, Sec, StudentBar, inr, okBox, pillSel, primaryCls, printReceipt, tone, useStudent } from "./fee-pages";
import type { Rcpt } from "./fee-pages";

const F = "/school/fees";
const redBtn = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-[#ac2c28] disabled:opacity-50";
const setIn = "w-48 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-right text-[13px] text-slate-900";
const setSel = "rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-900";
const lakh = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : inr(n));
const num = (s: string) => parseInt(s.replace(/[^\d]/g, ""), 10) || 0;
const stTone = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (s === "Scheduled" ? "info" : tone(s) !== "mute" ? tone(s) : ["Unpaid", "Under review", "Info asked", "Part paid", "Overdue"].includes(s) ? "warn" : ["Valid"].includes(s) ? "good" : ["Cancelled", "Declined"].includes(s) ? "bad" : "mute");
const SaveBar = ({ busy, discard }: { busy: boolean; discard: () => void }) => <div className="flex justify-end gap-2.5 px-5 py-3.5"><button type="button" className={btnGhost} onClick={discard}>Discard</button><button type="submit" className={btnPrimary} disabled={busy}>Save</button></div>;
const Head = ({ children }: { children: ReactNode }) => <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{children}</h2></div>;

// ═════════════ pending fees (also the Due Dates tab) ═════════════
interface PRow { student_id: string; student: string; registration_no: string; class_label: string; father: string; mobile: string; due: number; days_overdue: number; last_reminder: string | null }
type Kind = "outstanding" | "overdue" | "defaulters";
const TITLE: Record<Kind, string> = { outstanding: "Outstanding", overdue: "Overdue", defaulters: "Defaulters" };
export function PendingList({ kind, title }: { kind: Kind; title?: string }) {
  const d = useLoad(() => schoolFetch<{ items: PRow[] }>(`${F}/pending/${kind}`), [kind]);
  const act = useAction(() => d.reload());
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [view, setView] = useState<PRow | null>(null);
  const [pay, setPay] = useState<PRow | null>(null);
  const all = d.data?.items ?? []; const rows = all.filter((x) => has(x, search));
  const remind = async (ids: string[]) => {
    if (!ids.length) return;
    let t = "";
    if (await act.run(async () => { const r = await schoolFetch<{ reminded: number; skipped: number }>(`${F}/remind`, json("POST", { student_ids: ids })); t = r.reminded ? `Reminder sent to ${r.reminded} ${r.reminded === 1 ? "parent" : "parents"}.${r.skipped ? ` ${r.skipped} had no parent on file.` : ""}` : "No parent is on file to remind."; })) setMsg(t);
  };
  const go = useRef(remind); const ids = useRef<string[]>([]);
  useEffect(() => { go.current = remind; ids.current = all.map((x) => x.student_id); });
  useEffect(() => { if (kind !== "defaulters") return; const h = () => void go.current(ids.current); window.addEventListener("fee-remind-all", h); return () => window.removeEventListener("fee-remind-all", h); }, [kind]);
  return (
    <div data-report><ErrorBanner message={d.error || act.error} />{okBox(msg)}
      <ListPanel title={title ?? TITLE[kind]} noun="students" search={search} onSearch={setSearch} exportName={`${kind}-fees`} head={["Student", "Admission no.", "Class", "Father", "Mobile", "Due", "Days overdue", "Last reminder"]} exportRows={rows.map((x) => [x.student, x.registration_no, x.class_label, x.father, x.mobile, x.due, x.days_overdue, x.last_reminder ? day(x.last_reminder) : ""])}
        tableHead={["Student", "Class", "Father", "Mobile", "Due", "Days overdue", "Last reminder", ""]} empty={d.loading ? "Loading…" : kind === "outstanding" ? "No fees are pending." : "Nobody is overdue."}
        rows={rows.map((x) => [<span key="n"><b className="font-semibold text-[#026f9b]">{x.student}</b><span className="block text-[11px] text-slate-500">{x.registration_no}</span></span>, x.class_label, x.father || "—", x.mobile || "—", inr(x.due), x.days_overdue, x.last_reminder ? day(x.last_reminder) : "—",
          <span key="b" className="flex gap-1.5"><button type="button" className={small} disabled={act.busy} onClick={() => void remind([x.student_id])}>Remind</button><button type="button" className={`${primaryCls} !py-1`} onClick={() => setPay(x)}>Collect</button><button type="button" className={small} onClick={() => setView(x)}>View details</button></span>])} />
      <Modal open={!!view} title={view?.student ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Admission no." v={view.registration_no} /><Row k="Class" v={view.class_label} /><Row k="Father" v={view.father || "—"} /><Row k="Mobile" v={view.mobile || "—"} /><Row k="Due" v={inr(view.due)} /><Row k="Days overdue" v={view.days_overdue} /><Row k="Last reminder" v={view.last_reminder ? day(view.last_reminder) : "—"} /></dl><Foot close={() => setView(null)} /></>}</Modal>
      <Modal open={!!pay} title={pay ? `Collect fee · ${pay.student}` : ""} onClose={() => setPay(null)}>{pay && <CollectBox key={pay.student_id} studentId={pay.student_id} collectedAt="Counter" onDone={(m) => { setMsg(m); setPay(null); d.reload(); }} />}</Modal>
    </div>
  );
}
export function PendingPages({ tab }: { tab: "outstanding" | "overdue" | "defaulter-list" }) { return <PendingList kind={tab === "defaulter-list" ? "defaulters" : tab} key={tab} />; }

// ═════════════ installments ═════════════
interface Inst { terms: number[]; due_dates: string[]; year_discount: number; reminders: string }
const DEF: Record<number, { split: string; dates: string }> = { 1: { split: "100%", dates: "10 Apr" }, 2: { split: "50% · 50%", dates: "10 Apr · 10 Oct" }, 3: { split: "40% · 35% · 25%", dates: "10 Apr · 10 Oct · 10 Jan" }, 4: { split: "25% · 25% · 25% · 25%", dates: "10 Apr · 10 Jul · 10 Oct · 10 Jan" } };
const REMINDERS = ["7 and 1 days before, 3 days after", "3 days before, 1 day after", "1 day before", "On the due date only", "No reminders"];
function InstallmentSetup() {
  const l = useLoad(() => schoolFetch<Inst>(`${F}/installments`), []);
  const act = useAction(() => l.reload());
  const [d, setD] = useState<Partial<{ n: number; split: string; dates: string; disc: string; rem: string }>>({});
  const [msg, setMsg] = useState("");
  const c = l.data;
  if (!c) return <div><ErrorBanner message={l.error} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></div>;
  const n = d.n ?? c.terms.length; const split = d.split ?? c.terms.map((t) => `${t}%`).join(" · "); const dates = d.dates ?? c.due_dates.join(" · "); const disc = d.disc ?? `${c.year_discount}%`; const rem = d.rem ?? c.reminders;
  const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${F}/installments`, json("PUT", { terms: (split.match(/\d+/g) ?? []).map(Number), due_dates: dates.split(/\s*[·,]\s*/).map((x) => x.trim()).filter(Boolean), year_discount: num(disc), reminders: rem })))) { setD({}); setMsg("Saved."); } };
  return (
    <div><ErrorBanner message={l.error || act.error} />{okBox(msg)}
      <form onSubmit={save}><Sec><Head>Instalment setup</Head>
        <Rw title="Instalments a year"><select aria-label="Instalments a year" className={setSel} value={n} onChange={(e) => { const v = Number(e.target.value); setD({ ...d, n: v, split: DEF[v].split, dates: DEF[v].dates }); }}>{[1, 2, 3, 4].map((k) => <option key={k} value={k}>{k} {k === 1 ? "term" : "terms"}</option>)}</select></Rw>
        <Rw title="Split" hint={Array.from({ length: n }, (_, k) => `Term ${k + 1}`).join(" · ")}><input aria-label="Split" className={setIn} value={split} onChange={(e) => setD({ ...d, split: e.target.value })} /></Rw>
        <Rw title="Due dates"><input aria-label="Due dates" className={setIn} value={dates} onChange={(e) => setD({ ...d, dates: e.target.value })} /></Rw>
        <Rw title="Discount for paying the year at once"><input aria-label="Discount for paying the year at once" className={setIn} value={disc} onChange={(e) => setD({ ...d, disc: e.target.value })} /></Rw>
        <Rw title="Reminders" hint="Before and after each due date"><select aria-label="Reminders" className={setSel} value={rem} onChange={(e) => setD({ ...d, rem: e.target.value })}>{(REMINDERS.includes(rem) ? REMINDERS : [rem, ...REMINDERS]).map((r) => <option key={r}>{r}</option>)}</select></Rw>
        <SaveBar busy={act.busy} discard={() => { setD({}); setMsg(""); }} /></Sec></form>
    </div>
  );
}
interface Sched { student: { id: string; name: string }; has_plan: boolean; overdue: boolean; terms: { term: number; name: string; date: string; amount: number; paid: number; due: number; status: string; lines: { label: string; amount: number; due: number }[] }[] }
function PaymentSchedule() {
  const s = useStudent();
  const sc = useLoad(() => (s.id ? schoolFetch<Sched>(`${F}/schedule/${s.id}`) : Promise.resolve(null)), [s.id]);
  const [view, setView] = useState<Sched["terms"][number] | null>(null);
  const x = sc.data;
  return (
    <div data-report><ErrorBanner message={s.error || sc.error} />
      <StudentBar s={s}>{x?.has_plan && <Chip tone={x.overdue ? "warn" : "good"}>{x.overdue ? "Overdue" : "Up to date"}</Chip>}</StudentBar>
      {x && !x.has_plan ? <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">This student has no fee group yet. Assign one in Student Fee Assignment.</p> :
        <ListPanel title="Instalments" noun="instalments" hideSearch search="" onSearch={() => undefined} exportName="payment-schedule" head={["Instalment", "Due", "Amount", "Status"]} exportRows={(x?.terms ?? []).map((t) => [t.name, day(t.date), t.amount, t.status])}
          tableHead={["Instalment", "Due", "Amount", "Status", ""]} empty={sc.loading ? "Loading…" : "No instalments."}
          rows={(x?.terms ?? []).map((t) => [<b key="n" className="font-semibold text-slate-900">{t.name}</b>, day(t.date), <span key="a" className="block text-right">{inr(t.amount)}</span>, <Chip key="s" tone={stTone(t.status)}>{t.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(t)}>View details</button>])} />}
      <Modal open={!!view} title={view ? `${view.name} · ${x?.student.name ?? ""}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Due" v={day(view.date)} /><Row k="Status" v={view.status} />{view.lines.map((ln) => <Row key={ln.label} k={ln.label} v={`${inr(ln.amount)}${ln.due ? ` (₹${ln.due.toLocaleString("en-IN")} due)` : " (paid)"}`} />)}<Row k="Total" v={inr(view.amount)} /><Row k="Paid" v={inr(view.paid)} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}
export function InstallmentPages({ tab }: { tab: "installment-setup" | "due-dates" | "payment-schedule" }) {
  return tab === "installment-setup" ? <InstallmentSetup /> : tab === "due-dates" ? <PendingList kind="outstanding" /> : <PaymentSchedule />;
}

// ═════════════ concessions ═════════════
interface Conc { id: string; code: string; student: string; class_label: string; ctype: string; reason: string; amount: number; requested_on: string; status: string; source: string }
const OPEN = ["Pending", "Under review", "Info asked"];
const lab = (s: string) => (s === "Rejected" ? "Declined" : s === "Info asked" ? "More info asked" : s);
const CTYPE: Record<string, string> = { discount: "Discount", scholarship: "Scholarship", "fee-waiver": "Fee waiver" };
export type ConcTab = "discount" | "scholarship" | "fee-waiver" | "parent-requests";
export function ConcessionPages({ tab }: { tab: ConcTab }) {
  const con = useLoad(() => schoolFetch<{ items: Conc[]; students: { id: string; name: string; class_label: string }[] }>(`${F}/concessions`), []);
  const tot = useLoad(() => (tab === "parent-requests" ? schoolFetch<{ given: number; billed: number }>(`${F}/concession-totals`) : Promise.resolve(null)), [tab]);
  const act = useAction(() => { con.reload(); tot.reload(); });
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Conc | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ student_id: "", ctype: "", reason: "", amount: "" });
  const parent = tab === "parent-requests";
  const all = (con.data?.items ?? []).filter((x) => (parent ? x.source === "Parent" : x.ctype === CTYPE[tab]));
  const rows = all.filter((x) => has(x, search)); const n = (v: string) => all.filter((x) => x.status === v).length;
  const decide = async (x: Conc, status: string) => { if (await act.run(() => schoolFetch(`${F}/concessions/${x.id}`, json("PATCH", { status })))) setView(null); };
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${F}/concessions`, json("POST", { student_id: f.student_id || con.data?.students[0]?.id, ctype: parent ? f.ctype || "Financial aid" : CTYPE[tab], reason: f.reason, amount: Number(f.amount), source: parent ? "Parent" : "Office" })))) { setAdding(false); setF({ ...f, reason: "", amount: "" }); } };
  const err = <ErrorBanner message={con.error || tot.error || act.error} />;
  const tiles = parent
    ? [{ label: "Waiting", value: all.filter((x) => OPEN.includes(x.status)).length, sub: "decide within 7 working days" }, { label: "Approved", value: n("Approved"), sub: "" }, { label: "Declined", value: n("Rejected"), sub: "" }, { label: "Concessions this year", value: lakh(tot.data?.given ?? 0), sub: `${tot.data?.billed ? ((tot.data.given / tot.data.billed) * 100).toFixed(1) : 0}% of billed fees` }]
    : [{ label: "Concessions", value: all.length, sub: "All records" }, ...(n("Approved") ? [{ label: "Approved", value: n("Approved"), sub: `${pct(n("Approved"), all.length)} of shown` }] : []), ...(n("Pending") ? [{ label: "Pending", value: n("Pending"), sub: `${pct(n("Pending"), all.length)} of shown` }] : [])];
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={tiles} />
      <ListPanel title={parent ? "Parent requests · online" : "Concessions"} noun={parent ? "requests" : "concessions"} search={search} onSearch={setSearch} exportName={tab} head={["Ref.", "Student", "Class", "Type", "Reason", "Amount", "Requested", "Status"]} exportRows={rows.map((x) => [x.code, x.student, x.class_label, x.ctype, x.reason, x.amount, day(x.requested_on), lab(x.status)])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>{parent ? "+ Log parent request" : "+ New concession"}</button>}
        tableHead={parent ? ["Request", "Child", "Type", "Reason", "Sent", "Status", ""] : ["Ref.", "Student", "Class", "Type", "Reason", "Amount", "Requested", "Status", ""]} empty={con.loading ? "Loading…" : "None yet."}
        rows={rows.map((x) => parent
          ? [x.code, <span key="n"><b className="font-semibold text-slate-900">{x.student}</b><span className="block text-[11px] text-slate-500">{x.class_label}</span></span>, `${x.ctype} · ${inr(x.amount)}`, x.reason || "—", day(x.requested_on), <Chip key="s" tone={stTone(x.status === "Rejected" ? "Declined" : x.status)}>{lab(x.status)}</Chip>,
            <span key="b" className="flex gap-1.5">{OPEN.includes(x.status) ? <><button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => void decide(x, "Approved")}>Approve</button>{x.status !== "Info asked" && <button type="button" className={small} disabled={act.busy} onClick={() => void decide(x, "Info asked")}>Ask for more</button>}<button type="button" className={small} disabled={act.busy} onClick={() => void decide(x, "Rejected")}>Decline</button></> : <button type="button" className={small} onClick={() => setView(x)}>View details</button>}</span>]
          : [x.code, <b key="n" className="font-semibold text-slate-900">{x.student}</b>, x.class_label, x.ctype, x.reason || "—", <span key="a" className="block text-right">{inr(x.amount)}</span>, day(x.requested_on), <Chip key="s" tone={stTone(x.status)}>{lab(x.status)}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(x)}>View details</button>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.student}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class" v={view.class_label} /><Row k="Type" v={view.ctype} /><Row k="Reason" v={view.reason || "—"} /><Row k="Amount" v={inr(view.amount)} /><Row k="Requested" v={day(view.requested_on)} /><Row k="From" v={view.source === "Parent" ? "Parent" : "School office"} /><Row k="Status" v={lab(view.status)} /></dl>
        <Foot close={() => setView(null)} left={OPEN.includes(view.status) ? <><button type="button" className={small} disabled={act.busy} onClick={() => void decide(view, "Rejected")}>Decline</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void decide(view, "Approved")}>Approve</button></> : undefined} /></>}</Modal>
      <Modal open={adding} title={parent ? "Log a parent request" : `New ${CTYPE[tab].toLowerCase()}`} onClose={() => setAdding(false)}><form onSubmit={save} className="space-y-3">
        <Field label="Student"><select className={inputCls} value={f.student_id || con.data?.students[0]?.id || ""} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{con.data?.students.map((k) => <option key={k.id} value={k.id}>{k.name} · {k.class_label}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">{parent && <Field label="Type"><select className={inputCls} value={f.ctype || "Financial aid"} onChange={(e) => setF({ ...f, ctype: e.target.value })}>{["Financial aid", "Scholarship", "Sibling", "Staff ward", "Discount", "Fee waiver", "Other"].map((t) => <option key={t}>{t}</option>)}</select></Field>}<Field label="Amount (₹)"><input type="number" min={1} required className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field></div>
        <Field label="Reason"><input className={inputCls} maxLength={200} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field><p className="text-xs text-slate-500">Approving lowers that student&apos;s annual fee by this amount.</p><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
    </div>
  );
}

// ═════════════ fines ═════════════
interface Fine { id: string; code: string; student: string; class_label: string; reason: string; days_late: number; amount: number; fined_on: string; status: string; mode: string | null; settled_on: string | null }
const DAMAGE = ["Assessed case by case", "Fixed amount", "Actual repair cost"]; const WAIVERS = ["Principal", "Vice Principal", "School admin", "Accountant"];
function LateFeeSetup() {
  const l = useLoad(() => schoolFetch<{ enabled: boolean; grace: number; per_day: number; max: number; waive: boolean }>(`${F}/late-fee`), []);
  const act = useAction(() => l.reload());
  const [d, setD] = useState<Partial<{ enabled: boolean; grace: number; per: string; max: string; waive: boolean }>>({});
  const [msg, setMsg] = useState("");
  const c = l.data;
  if (!c) return <div><ErrorBanner message={l.error} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></div>;
  const v = { enabled: d.enabled ?? c.enabled, grace: d.grace ?? c.grace, per: d.per ?? `₹${c.per_day} a day`, max: d.max ?? `₹${c.max.toLocaleString("en-IN")}`, waive: d.waive ?? c.waive };
  const graces = [...new Set([0, 1, 2, 3, 5, 7, 10, 15, v.grace])].sort((a, b) => a - b);
  const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${F}/late-fee`, json("PUT", { enabled: v.enabled, grace: v.grace, per_day: num(v.per), max: num(v.max), waive: v.waive })))) { setD({}); setMsg("Saved."); } };
  return (
    <div><ErrorBanner message={l.error || act.error} />{okBox(msg)}
      <form onSubmit={save}><Sec><Head>Late fee</Head>
        <Rw title="Charge a late fee"><Toggle checked={v.enabled} onChange={(x) => setD({ ...d, enabled: x })} label="Charge a late fee" /></Rw>
        <Rw title="Grace period after due date"><select aria-label="Grace period" className={setSel} value={v.grace} onChange={(e) => setD({ ...d, grace: Number(e.target.value) })}>{graces.map((g) => <option key={g} value={g}>{g} {g === 1 ? "day" : "days"}</option>)}</select></Rw>
        <Rw title="Late fee"><input aria-label="Late fee" className={setIn} value={v.per} onChange={(e) => setD({ ...d, per: e.target.value })} /></Rw>
        <Rw title="Maximum late fee per instalment"><input aria-label="Maximum late fee per instalment" className={setIn} value={v.max} onChange={(e) => setD({ ...d, max: e.target.value })} /></Rw>
        <Rw title="Waive for students with approved concessions"><Toggle checked={v.waive} onChange={(x) => setD({ ...d, waive: x })} label="Waive for students with approved concessions" /></Rw>
        <SaveBar busy={act.busy} discard={() => { setD({}); setMsg(""); }} /></Sec></form>
    </div>
  );
}
function FineRulesSetup() {
  const l = useLoad(() => schoolFetch<{ lost_id: number; lost_book: number; damage: string; waiver: string }>(`${F}/fine-rules`), []);
  const act = useAction(() => l.reload());
  const [d, setD] = useState<Partial<{ id: string; book: string; damage: string; waiver: string }>>({});
  const [msg, setMsg] = useState("");
  const c = l.data;
  if (!c) return <div><ErrorBanner message={l.error} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></div>;
  const v = { id: d.id ?? `₹${c.lost_id}`, book: d.book ?? `₹${c.lost_book}`, damage: d.damage ?? c.damage, waiver: d.waiver ?? c.waiver };
  const save = async (e: FormEvent) => { e.preventDefault(); setMsg(""); if (await act.run(() => schoolFetch(`${F}/fine-rules`, json("PUT", { lost_id: num(v.id), lost_book: num(v.book), damage: v.damage, waiver: v.waiver })))) { setD({}); setMsg("Saved."); } };
  return (
    <div><ErrorBanner message={l.error || act.error} />{okBox(msg)}
      <form onSubmit={save}><Sec><Head>Fine rules</Head>
        <Rw title="Lost ID card" hint="Includes a new RFID card"><input aria-label="Lost ID card" className={setIn} value={v.id} onChange={(e) => setD({ ...d, id: e.target.value })} /></Rw>
        <Rw title="Lost library book" hint="Book price plus"><input aria-label="Lost library book" className={setIn} value={v.book} onChange={(e) => setD({ ...d, book: e.target.value })} /></Rw>
        <Rw title="Damaged school property" hint="Assessed by the principal"><select aria-label="Damaged school property" className={setSel} value={v.damage} onChange={(e) => setD({ ...d, damage: e.target.value })}>{DAMAGE.map((x) => <option key={x}>{x}</option>)}</select></Rw>
        <Rw title="Who can waive fines"><select aria-label="Who can waive fines" className={setSel} value={v.waiver} onChange={(e) => setD({ ...d, waiver: e.target.value })}>{WAIVERS.map((x) => <option key={x}>{x}</option>)}</select></Rw>
        <SaveBar busy={act.busy} discard={() => { setD({}); setMsg(""); }} /></Sec></form>
    </div>
  );
}
function FineCollection() {
  const fl = useLoad(() => schoolFetch<{ items: Fine[]; students: { id: string; name: string; class_label: string }[]; waiver: string; rules: { lost_id: number; lost_book: number } }>(`${F}/fines`), []);
  const act = useAction(() => fl.reload());
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Fine | null>(null);
  const [mode, setMode] = useState("Cash");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ student_id: "", reason: "Lost ID card", days: "", amount: "" });
  const all = fl.data?.items ?? []; const rows = all.filter((x) => has(x, search)); const n = (v: string) => all.filter((x) => x.status === v).length;
  const settle = async (x: Fine, status: "Paid" | "Waived") => { if (await act.run(() => schoolFetch(`${F}/fines/${x.id}`, json("PATCH", { status, mode: status === "Paid" ? mode : undefined })))) setView(null); };
  const hint = /lost id/i.test(f.reason) ? fl.data?.rules.lost_id : /lost library/i.test(f.reason) ? fl.data?.rules.lost_book : undefined;
  const add = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${F}/fines`, json("POST", { student_id: f.student_id || fl.data?.students[0]?.id, reason: f.reason, days_late: Number(f.days) || 0, amount: f.amount ? Number(f.amount) : undefined })))) { setAdding(false); setF({ ...f, days: "", amount: "" }); } };
  return (
    <div className="space-y-5" data-report><ErrorBanner message={fl.error || act.error} />
      <Tiles items={[{ label: "Fines", value: all.length, sub: "All records" }, { label: "Unpaid", value: n("Unpaid"), sub: `${pct(n("Unpaid"), all.length)} of shown` }, { label: "Paid", value: n("Paid"), sub: `${pct(n("Paid"), all.length)} of shown` }, { label: "Waived", value: n("Waived"), sub: `${pct(n("Waived"), all.length)} of shown` }]} />
      <ListPanel title="Fines" noun="fines" search={search} onSearch={setSearch} exportName="fines" head={["Ref.", "Student", "Class", "Reason", "Days late", "Amount", "Date", "Status"]} exportRows={rows.map((x) => [x.code, x.student, x.class_label, x.reason, x.days_late, x.amount, day(x.fined_on), x.status])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ Add fine</button>} tableHead={["Ref.", "Student", "Class", "Reason", "Days late", "Amount", "Date", "Status", ""]} empty={fl.loading ? "Loading…" : "No fines yet."}
        rows={rows.map((x) => [x.code, <b key="n" className="font-semibold text-[#026f9b]">{x.student}</b>, x.class_label, x.reason, <span key="d" className="block text-right">{x.days_late}</span>, <span key="a" className="block text-right">{inr(x.amount)}</span>, day(x.fined_on), <Chip key="s" tone={stTone(x.status)}>{x.status}</Chip>,
          <span key="b" className="flex gap-1.5">{x.status === "Unpaid" && <button type="button" className={`${primaryCls} !py-1`} onClick={() => { setMode("Cash"); setView(x); }}>Collect</button>}<button type="button" className={small} onClick={() => { setMode("Cash"); setView(x); }}>View details</button></span>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.student}` : ""} onClose={() => setView(null)}>{view && <><ErrorBanner message={act.error} /><dl><Row k="Class" v={view.class_label} /><Row k="Reason" v={view.reason} /><Row k="Days late" v={view.days_late} /><Row k="Amount" v={inr(view.amount)} /><Row k="Date" v={day(view.fined_on)} /><Row k="Status" v={view.status} />{view.settled_on && <Row k={view.status === "Waived" ? "Waived on" : "Paid on"} v={`${day(view.settled_on)}${view.mode ? ` · ${view.mode}` : ""}`} />}</dl>
        {view.status === "Unpaid" && <div className="mt-3"><Field label="Payment mode"><select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>{["Cash", "UPI", "Card", "Cheque", "Bank"].map((m) => <option key={m}>{m}</option>)}</select></Field><p className="mt-2 text-xs text-slate-500">Only the {fl.data?.waiver} can waive a fine.</p></div>}
        <Foot close={() => setView(null)} left={view.status === "Unpaid" ? <><button type="button" className={small} disabled={act.busy} onClick={() => void settle(view, "Waived")}>Waive</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void settle(view, "Paid")}>Collect</button></> : undefined} /></>}</Modal>
      <Modal open={adding} title="Add a fine" onClose={() => setAdding(false)}><form onSubmit={add} className="space-y-3">
        <Field label="Student"><select className={inputCls} value={f.student_id || fl.data?.students[0]?.id || ""} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{fl.data?.students.map((k) => <option key={k.id} value={k.id}>{k.name} · {k.class_label}</option>)}</select></Field>
        <Field label="Reason"><input className={inputCls} required minLength={2} maxLength={80} list="fine-reasons" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /><datalist id="fine-reasons">{["Lost ID card", "Lost library book", "Library overdue", "Damaged school property"].map((r) => <option key={r} value={r} />)}</datalist></Field>
        <div className="grid grid-cols-2 gap-3"><Field label={hint ? `Amount (₹, default ${hint})` : "Amount (₹)"}><input type="number" min={1} required={!hint} className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field><Field label="Days late"><input type="number" min={0} className={inputCls} value={f.days} onChange={(e) => setF({ ...f, days: e.target.value })} /></Field></div>
        <FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
    </div>
  );
}
export function FinePages({ tab }: { tab: "late-fee" | "fine-rules" | "fine-collection" }) { return tab === "late-fee" ? <LateFeeSetup /> : tab === "fine-rules" ? <FineRulesSetup /> : <FineCollection />; }

// ═════════════ receipts ═════════════
interface RL { id: string; receipt_no: string; student: string; class_label: string; total: number; mode: string; paid_on: string; issued_by: string; status: "Valid" | "Cancelled"; cancel_reason: string | null }
function ReceiptCard({ r, duplicate }: { r: Rcpt; duplicate?: boolean }) {
  const k: [string, string][] = [["Receipt no.", r.receipt_no], ["Date", day(r.paid_on)], ["Student", r.student], ["Class", r.class_label], ["Admission no.", r.registration_no]];
  return (
    <div className="mx-auto my-6 max-w-[520px] rounded-xl border border-slate-200 bg-white p-6 text-[13px] text-slate-900">
      <p className="text-center text-base font-semibold">{r.school}</p><p className="border-b border-slate-300 pb-2 text-center text-[11px] text-[#026f9b]">{r.address || " "}</p>
      <p className="my-4 text-center text-sm font-semibold">FEE RECEIPT{duplicate && <span className="ml-2 rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">DUPLICATE</span>}{r.status === "Cancelled" && <span className="ml-2 rounded border border-[#e5413a] px-1.5 py-0.5 text-[10px] font-medium text-[#ac2c28]">CANCELLED</span>}</p>
      <dl className="space-y-1.5">{k.map(([a, b]) => <div key={a} className="flex gap-6"><dt className="w-28 text-slate-500">{a}</dt><dd>{b}</dd></div>)}</dl>
      <table className="mt-5 w-full"><thead><tr className="bg-[#f3f6f9] text-left text-[10px] uppercase text-slate-500"><th className="px-2 py-2 font-medium">Fee</th><th className="px-2 py-2 text-right font-medium">Amount</th></tr></thead>
        <tbody>{r.lines.map((l) => <tr key={l.label} className="border-b border-slate-100"><td className="px-2 py-2">{l.label}</td><td className="px-2 py-2 text-right">{inr(l.amount)}</td></tr>)}{r.concession > 0 && <tr className="border-b border-slate-100"><td className="px-2 py-2">Concession</td><td className="px-2 py-2 text-right">- {inr(r.concession)}</td></tr>}<tr><td className="px-2 py-2 font-semibold">Total paid</td><td className="px-2 py-2 text-right font-semibold">{inr(r.total)}</td></tr></tbody></table>
      <p className="mt-4 text-[11px] text-[#026f9b]">Paid by {r.mode}. This is a computer-generated receipt.</p>
      <div className="mt-10 flex justify-between text-[11px] text-slate-500"><span className="w-28 border-t border-slate-400 pt-1 text-center">Cashier</span><span className="w-28 border-t border-slate-400 pt-1 text-center">School seal</span></div>
    </div>
  );
}
export function ReceiptPages({ tab }: { tab: "generate" | "print" | "cancel" | "duplicate" }) {
  const list = useLoad(() => schoolFetch<{ items: RL[] }>(`${F}/receipts`), []);
  const [pick, setPick] = useState("");
  const items = list.data?.items ?? [];
  const id = pick || items[0]?.id || "";
  const rc = useLoad(() => (tab !== "cancel" && id ? schoolFetch<Rcpt>(`${F}/receipt/${id}`) : Promise.resolve(null)), [tab, id]);
  const act = useAction(() => list.reload());
  const [search, setSearch] = useState("");
  const [view, setView] = useState<RL | null>(null);
  const [kill, setKill] = useState<RL | null>(null);
  const [why, setWhy] = useState("");
  const err = <ErrorBanner message={list.error || rc.error || act.error} />;
  if (tab !== "cancel") {
    const r = rc.data;
    return (
      <div>{err}
        <Bar><Pill label="Receipt"><select aria-label="Receipt" value={id} onChange={(e) => setPick(e.target.value)} className={pillSel}>{!items.length && <option value="">No receipts</option>}{items.map((x) => <option key={x.id} value={x.id}>{x.receipt_no} · {x.student}</option>)}</select></Pill></Bar>
        {r ? <Sec><div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Receipt <span className="ml-1 text-xs font-normal text-slate-500">{r.receipt_no}</span></h2><button type="button" className={`${primaryCls} !px-4 !py-1.5 text-[13px]`} disabled={r.status === "Cancelled"} onClick={() => printReceipt(r, tab === "duplicate")}>Print</button></div><ReceiptCard r={r} duplicate={tab === "duplicate"} /></Sec> : <p className="py-10 text-center text-sm text-slate-400">{list.loading || rc.loading ? "Loading…" : "No receipts yet. They appear here once a fee is collected."}</p>}
      </div>
    );
  }
  const rows = items.filter((x) => has(x, search)); const n = (v: string) => items.filter((x) => x.status === v).length;
  const doCancel = async (e: FormEvent) => { e.preventDefault(); if (kill && await act.run(() => schoolFetch(`${F}/receipts/${kill.id}/cancel`, json("POST", { reason: why })))) { setKill(null); setWhy(""); setView(null); } };
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Receipts", value: items.length, sub: "All records" }, { label: "Valid", value: n("Valid"), sub: `${pct(n("Valid"), items.length)} of shown` }, { label: "Cancelled", value: n("Cancelled"), sub: `${pct(n("Cancelled"), items.length)} of shown` }]} />
      <ListPanel title="Receipts" noun="receipts" search={search} onSearch={setSearch} exportName="receipts" head={["Receipt", "Student", "Class", "Amount", "Mode", "Date", "Issued by", "Status"]} exportRows={rows.map((x) => [x.receipt_no, x.student, x.class_label, x.total, x.mode, day(x.paid_on), x.issued_by, x.status])}
        tableHead={["Receipt", "Student", "Class", "Amount", "Mode", "Date", "Issued by", "Status", ""]} empty={list.loading ? "Loading…" : "No receipts yet."}
        rows={rows.map((x) => [x.receipt_no, <b key="n" className="font-semibold text-[#026f9b]">{x.student}</b>, x.class_label, <span key="a" className="block text-right">{inr(x.total)}</span>, x.mode, day(x.paid_on), x.issued_by, <Chip key="s" tone={stTone(x.status)}>{x.status}</Chip>,
          <span key="b" className="flex gap-1.5">{x.status === "Valid" && <button type="button" className={redBtn} onClick={() => { setWhy(""); setKill(x); }}>Cancel receipt</button>}<button type="button" className={small} onClick={() => setView(x)}>View details</button></span>])} />
      <Modal open={!!view} title={view?.receipt_no ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Student" v={view.student} /><Row k="Class" v={view.class_label} /><Row k="Amount" v={inr(view.total)} /><Row k="Mode" v={view.mode} /><Row k="Date" v={day(view.paid_on)} /><Row k="Issued by" v={view.issued_by} /><Row k="Status" v={view.status} />{view.cancel_reason && <Row k="Cancelled because" v={view.cancel_reason} />}</dl><Foot close={() => setView(null)} /></>}</Modal>
      <Modal open={!!kill} title={kill ? `Cancel ${kill.receipt_no}` : ""} onClose={() => setKill(null)}><form onSubmit={doCancel} className="space-y-3"><p className="text-[13px] text-slate-600">The receipt stays on record as cancelled, and {kill?.student}&apos;s fee goes back to due.</p>
        <Field label="Reason"><input className={inputCls} required minLength={3} maxLength={200} value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setKill(null)}>Keep receipt</button><button type="submit" className="rounded-full bg-[#e5413a] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#c9322c] disabled:opacity-50" disabled={act.busy}>Cancel receipt</button></div></form></Modal>
    </div>
  );
}

// ═════════════ refunds ═════════════
interface Ref { id: string; code: string; student: string; class_label: string; reason: string; amount: number; requested_on: string; status: string; decided_on: string | null; paid_on: string | null }
export function RefundPages({ tab }: { tab: "refund-request" | "approval" | "refund-history" }) {
  const rf = useLoad(() => schoolFetch<{ items: Ref[]; students: { id: string; name: string; class_label: string }[] }>(`${F}/refunds`), []);
  const act = useAction(() => rf.reload());
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Ref | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ student_id: "", reason: "", amount: "" });
  const all = (rf.data?.items ?? []).filter((x) => (tab === "approval" ? x.status === "Pending" : tab === "refund-history" ? x.status === "Paid" : true));
  const rows = all.filter((x) => has(x, search)); const n = (v: string) => all.filter((x) => x.status === v).length;
  const move = async (x: Ref, status: string) => { if (await act.run(() => schoolFetch(`${F}/refunds/${x.id}`, json("PATCH", { status })))) setView(null); };
  const add = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${F}/refunds`, json("POST", { student_id: f.student_id || rf.data?.students[0]?.id, reason: f.reason, amount: Number(f.amount) })))) { setAdding(false); setF({ ...f, reason: "", amount: "" }); } };
  const tiles = [{ label: "Fee refunds", value: all.length, sub: "All records" }, ...(tab !== "refund-history" ? [{ label: "Pending", value: n("Pending"), sub: `${pct(n("Pending"), all.length)} of shown` }] : []), ...(tab === "refund-request" ? [{ label: "Approved", value: n("Approved"), sub: `${pct(n("Approved"), all.length)} of shown` }] : []), ...(tab !== "approval" ? [{ label: "Paid", value: n("Paid"), sub: `${pct(n("Paid"), all.length)} of shown` }] : [])];
  return (
    <div className="space-y-5" data-report><ErrorBanner message={rf.error || act.error} />
      <Tiles items={tiles} />
      <ListPanel title="Fee refunds" noun="refunds" search={search} onSearch={setSearch} exportName={tab} head={["Ref.", "Student", "Class", "Reason", "Amount", "Requested", "Status"]} exportRows={rows.map((x) => [x.code, x.student, x.class_label, x.reason, x.amount, day(x.requested_on), x.status])}
        extra={tab === "refund-request" ? <button type="button" className={small} onClick={() => setAdding(true)}>+ New refund request</button> : null} tableHead={["Ref.", "Student", "Class", "Reason", "Amount", "Requested", "Status", ""]} empty={rf.loading ? "Loading…" : "No refunds yet."}
        rows={rows.map((x) => [x.code, <b key="n" className="font-semibold text-[#026f9b]">{x.student}</b>, x.class_label, x.reason, <span key="a" className="block text-right">{inr(x.amount)}</span>, day(x.requested_on), <Chip key="s" tone={stTone(x.status)}>{x.status}</Chip>,
          <span key="b" className="flex gap-1.5">{tab === "approval" && <><button type="button" className={redBtn} disabled={act.busy} onClick={() => void move(x, "Rejected")}>Reject</button><button type="button" className={`${primaryCls} !py-1`} disabled={act.busy} onClick={() => void move(x, "Approved")}>Approve</button></>}<button type="button" className={small} onClick={() => setView(x)}>View details</button></span>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.student}` : ""} onClose={() => setView(null)}>{view && <><dl><Row k="Class" v={view.class_label} /><Row k="Reason" v={view.reason} /><Row k="Amount" v={inr(view.amount)} /><Row k="Requested" v={day(view.requested_on)} /><Row k="Status" v={view.status} />{view.decided_on && <Row k="Decided on" v={day(view.decided_on)} />}{view.paid_on && <Row k="Paid on" v={day(view.paid_on)} />}</dl>
        <Foot close={() => setView(null)} left={view.status === "Approved" ? <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void move(view, "Paid")}>Mark as paid</button> : view.status === "Pending" ? <><button type="button" className={redBtn} disabled={act.busy} onClick={() => void move(view, "Rejected")}>Reject</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void move(view, "Approved")}>Approve</button></> : undefined} /></>}</Modal>
      <Modal open={adding} title="New refund request" onClose={() => setAdding(false)}><form onSubmit={add} className="space-y-3">
        <Field label="Student"><select className={inputCls} value={f.student_id || rf.data?.students[0]?.id || ""} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{rf.data?.students.map((k) => <option key={k.id} value={k.id}>{k.name} · {k.class_label}</option>)}</select></Field>
        <Field label="Reason"><input className={inputCls} required minLength={3} maxLength={200} placeholder="Bus service stopped" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
        <Field label="Amount (₹)"><input type="number" min={1} required className={inputCls} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field><FormFoot close={() => setAdding(false)} busy={act.busy} /></form></Modal>
    </div>
  );
}
