"use client";

import { useState } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Row } from "../../school/s/dash-pages";
import { Head } from "../../teacher/t/head";
import { AMBER, BLUE, DataTable, Loading, Tile, dmy, has } from "../../admissions/m/ui";
import { usePrincipal } from "../context";

interface Act { key: string; label: string; tone: "good" | "bad" | "plain" }
interface Item { kind: string; id: string; title: string; sub: string; when: string | null; detail: [string, string][]; actions: Act[] }
interface Data { kinds: { key: string; label: string; count: number }[]; items: Item[]; total: number; summary?: { cycle: string; teachers: number; cost: number; budget: number; over: number; budget_pct: number } | null }
const pill = "rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400 disabled:opacity-50";
const good = "rounded-full bg-[#026f9b] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const bad = "rounded-full border border-[#f0b8b5] bg-white px-3 py-1 text-[12px] font-semibold text-[#ac2c28] hover:bg-[#fde3e1] disabled:opacity-50";
const cls = (t: Act["tone"]) => (t === "good" ? good : t === "bad" ? bad : pill);
const TITLE: Record<string, [string, string]> = {
  "": ["Approval Centre", "Everything that waits for your decision. A decision here updates the same record the other portals read."],
  admissions: ["Admissions", "Applications that have cleared document verification and the admissions head, waiting for your final approval. Approving makes the seat offer."],
  leave: ["Leave", "Staff leave that has reached the Principal in the approval chain. Your own leave goes to the School Admin."],
  concession: ["Fees", "Fee concessions and waivers. Approving notifies the person who raised it."],
  results: ["Results", "Report cards generated after every mark was verified. Publishing tells the parents the report card is ready."],
  increment: ["Increments", "Increment recommendations HR sent to you. Approving confirms the percentage for payroll; sending back returns it to HR."],
  claim: ["Claims", "Staff claims above the limit, or marked for the Principal. Approved claims go to accounts to pay."],
  circular: ["Circulars", "Circulars drafted by the office. Approving publishes them, rejecting archives them."],
};

/** A list of what waits for the Principal: one kind, or all of them. Each row opens its details; the buttons decide it. */
export function Approvals({ kind }: { kind?: string }) {
  const p = usePrincipal();
  const r = useLoad(() => schoolFetch<Data>(`/principal/approvals${kind ? `?kind=${kind}` : ""}`), [kind]);
  const [filter, setFilter] = useState(""); const [q, setQ] = useState("");
  const [view, setView] = useState<Item | null>(null); const [note, setNote] = useState("");
  const act = useAction(() => { r.reload(); p.refreshBadges(); });
  const [head, sub] = TITLE[kind ?? ""] ?? TITLE[""];
  const decide = async (i: Item, a: Act) => { if (await act.run(() => schoolFetch(`/principal/approvals/${i.kind}/${encodeURIComponent(i.id)}`, json("POST", { action: a.key, note: note.trim() || undefined })))) { setView(null); setNote(""); } };
  const items = (r.data?.items ?? []).filter((i) => (!filter || i.kind === filter) && has(i, q));
  const label = (k: string) => r.data?.kinds.find((x) => x.key === k)?.label ?? k;
  const all = async () => { for (const i of items.filter((x) => x.actions.some((y) => y.key === "approve"))) { if (!(await act.run(() => schoolFetch(`/principal/approvals/${i.kind}/${encodeURIComponent(i.id)}`, json("POST", { action: "approve" }))))) break; } };
  const sm = r.data?.summary; const rs = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  return (
    <div data-report>
      <Head title={head} subtitle={sub} action={kind === "increment" && items.length ? <button type="button" className="rounded-full bg-[#e53a35] px-6 py-2.5 text-[15px] font-bold text-white shadow-sm hover:bg-[#ac2c28] disabled:opacity-60" disabled={act.busy} onClick={() => void all()}>Approve all waiting</button> : undefined} />
      <ErrorBanner message={r.error || act.error} />
      {!r.data ? <Loading /> : (
        <>
          {sm && <div className="mb-5 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}><Tile label="Teachers" value={sm.teachers} sub={`Cycle ${sm.cycle}`} bg={BLUE} /><Tile label="Yearly cost" value={rs(sm.cost)} sub="Of the recommended increments" bg={BLUE} /><Tile label="Budget" value={rs(sm.budget)} sub={`${sm.budget_pct}% of teaching payroll`} bg={BLUE} /><Tile label="Over budget" value={rs(sm.over)} sub={sm.over ? "Ask HR to trim" : "Within budget"} bg={sm.over ? "bg-[#fde3e1]" : "bg-[#d9efe8]"} tone={sm.over ? "text-[#ac2c28]" : "text-[#065740]"} /></div>}
          {!kind && <div className="mb-5 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>{r.data.kinds.map((k) => <button key={k.key} type="button" onClick={() => setFilter(filter === k.key ? "" : k.key)} className={`rounded-2xl text-left ring-2 ${filter === k.key ? "ring-[#0294CE]" : "ring-transparent"}`}><Tile label={k.label} value={k.count} sub={k.count ? "Waiting for you" : "Nothing waiting"} bg={k.count ? AMBER : BLUE} tone={k.count ? "text-[#8a5a0b]" : undefined} /></button>)}</div>}
          <DataTable title="Waiting for your decision" noun="items" search={q} onSearch={setQ} exportName="approvals" exportHead={["Kind", "Item", "Details", "Since"]} exportRows={items.map((i) => [label(i.kind), i.title, i.sub, i.when])}
            head={["Kind", "Item", "Since", ""]} empty="Nothing is waiting for your decision."
            rows={items.map((i) => [<Chip key="k" tone="info">{label(i.kind)}</Chip>, <span key="t" className="block leading-tight"><b className="block font-semibold text-slate-900">{i.title}</b><span className="block text-[11.5px] text-slate-500">{i.sub}</span></span>, dmy(i.when), <span key="a" className="flex flex-wrap justify-end gap-1.5"><button type="button" className={pill} onClick={() => { setView(i); setNote(""); }}>View details</button>{i.actions.slice(0, 2).map((a) => <button key={a.key} type="button" className={cls(a.tone)} disabled={act.busy} onClick={() => void decide(i, a)}>{a.label}</button>)}</span>])} />
          <Modal open={!!view} title={view?.title ?? ""} onClose={() => setView(null)}>{view && <>
            <p className="mb-2 text-[12px] text-slate-500">{label(view.kind)} · {view.sub}</p>
            <dl>{view.detail.map(([k, v]) => <Row key={k} k={k} v={v} />)}</dl>
            <label className="mt-3 block text-[12.5px] font-medium text-slate-900">Note (kept with the decision)<textarea className={`${inputCls} mt-1 min-h-[3.5rem]`} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></label>
            <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">{view.actions.map((a) => <button key={a.key} type="button" className={cls(a.tone)} disabled={act.busy} onClick={() => void decide(view, a)}>{a.label}</button>)}<button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={() => setView(null)}>Close</button></div></>}</Modal>
        </>
      )}
    </div>
  );
}

/** What the Principal has decided, newest first. */
export function Decided() {
  const r = useLoad(() => schoolFetch<{ items: { id: string; kind: string; title: string; action: string; note: string | null; decided_name: string; decided_at: string }[]; kinds: Record<string, string> }>("/principal/decided"), []);
  const [q, setQ] = useState("");
  const items = (r.data?.items ?? []).filter((i) => has(i, q));
  const kind = (k: string) => r.data?.kinds[k] ?? (k === "concern" ? "Parent concern" : k);
  return (
    <div data-report>
      <Head title="Decided" subtitle="Every decision you made here, with who decided it and when." />
      <ErrorBanner message={r.error} />
      <DataTable title="Decisions" noun="decisions" search={q} onSearch={setQ} exportName="principal-decisions" exportHead={["Kind", "Item", "Decision", "Note", "By", "When"]} exportRows={items.map((i) => [kind(i.kind), i.title, i.action, i.note, i.decided_name, i.decided_at])}
        head={["Kind", "Item", "Decision", "Note", "By", "When"]} empty={r.loading ? "Loading…" : "Nothing decided yet."}
        rows={items.map((i) => [<Chip key="k" tone="info">{kind(i.kind)}</Chip>, i.title, i.action, i.note ?? "—", i.decided_name, dmy(i.decided_at)])} />
    </div>
  );
}

interface Concern { source: "complaint" | "ticket"; id: string; code: string; title: string; from: string; details: string; since: string; status: string; priority: string }
export function Concerns() {
  const p = usePrincipal();
  const r = useLoad(() => schoolFetch<{ items: Concern[] }>("/principal/concerns"), []);
  const act = useAction(() => { r.reload(); p.refreshBadges(); });
  const [q, setQ] = useState("");
  const items = (r.data?.items ?? []).filter((i) => has(i, q));
  const set = (c: Concern, status: string) => void act.run(() => schoolFetch(`/principal/concerns/${c.source}/${c.id}`, json("POST", { status })));
  return (
    <div data-report>
      <Head title="Parent Concerns" subtitle="Complaints and help-desk requests from parents that are still open, oldest first." />
      <ErrorBanner message={r.error || act.error} />
      <DataTable title="Open concerns" noun="concerns" search={q} onSearch={setQ} exportName="parent-concerns" exportHead={["Number", "Concern", "From", "Details", "Since", "Status"]} exportRows={items.map((c) => [c.code, c.title, c.from, c.details, c.since, c.status])}
        head={["Number", "Concern", "From", "Since", "Status", ""]} empty={r.loading ? "Loading…" : "No open parent concerns."}
        rows={items.map((c) => [c.code, <span key="t" className="block leading-tight"><b className="block font-semibold text-slate-900">{c.title}</b><span className="block text-[11.5px] text-slate-500">{c.details}</span></span>, c.from, dmy(c.since), <Chip key="s" tone={c.status === "In progress" ? "info" : c.priority === "High" ? "bad" : "warn"}>{c.status}</Chip>, <span key="a" className="flex justify-end gap-1.5">{c.status !== "In progress" && <button type="button" className={pill} disabled={act.busy} onClick={() => set(c, "In progress")}>Take up</button>}<button type="button" className={good} disabled={act.busy} onClick={() => set(c, "Resolved")}>Resolve</button></span>])} />
    </div>
  );
}
