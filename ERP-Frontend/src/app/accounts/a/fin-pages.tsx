"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, inputCls, useLoad } from "@/components/admin/ui";
import { ListPanel, has } from "../../school/s/fo-pages";
import { inr } from "../../school/s/fee-pages";
import { Head } from "../../teacher/t/head";
import { useAccounts } from "../context";
import { short } from "./dash-pages";

const blueBtn = "rounded-full bg-[#026f9b] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const pillBtn = "rounded-full border border-slate-200 bg-white px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400 disabled:opacity-50";
const dmy = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const Loading = ({ e }: { e?: string }) => <div><ErrorBanner message={e ?? ""} /><p className="py-10 text-center text-sm text-slate-400">Loading…</p></div>;

// ═════════════ AI insights ═════════════
interface Ins { key: string; level: "high" | "medium"; title: string; text: string; suggest: string; task: boolean }
export function Insights() {
  const a = useAccounts();
  const l = useLoad(() => schoolFetch<{ items: Ins[] }>("/accounts/insights"), []);
  const act = useAction(() => l.reload());
  return (
    <div>
      <Head title="Insights" subtitle="Things the AI found in this month's accounts, fees and spending, with what to do. It checks every night." />
      <ErrorBanner message={l.error || act.error} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{l.data?.items.map((i) => (
        <div key={i.key} className={`flex flex-col rounded-xl border border-slate-200 border-l-4 bg-white p-4 ${i.level === "high" ? "border-l-[#e5413a]" : "border-l-[#d9902f]"}`}>
          <div className="flex items-start justify-between gap-2"><h3 className="text-[14px] font-semibold text-slate-900">{i.title}</h3><Chip tone="warn">New</Chip></div>
          <p className="mt-2 text-[12.5px] text-slate-700">{i.text}</p>
          <p className="mt-2 text-[12.5px] text-slate-700"><b>Suggested:</b> {i.suggest}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className={blueBtn} disabled={act.busy || i.task} onClick={() => void act.run(() => schoolFetch("/accounts/insights/task", json("POST", { key: i.key, title: i.title, detail: i.suggest })))}>{i.task ? "Task created" : "Create task"}</button>
            <button type="button" className={pillBtn} disabled={act.busy} onClick={() => void act.run(() => schoolFetch("/school/fees/insights/review", json("POST", { key: i.key })))}>Mark reviewed</button>
          </div>
        </div>
      ))}</div>
      {l.data && !l.data.items.length && <p className="rounded-2xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-3 text-[13px] text-slate-700">Nothing needs a look right now.</p>}
      <p className="mt-5 rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-4 py-2.5 text-xs text-slate-600">Insights use only this school&apos;s own records.{a.hasModule("school_assistant") ? " Ask AI (bottom right) can explain any of them in more detail." : ""}</p>
    </div>
  );
}

export function AlertRules() {
  const l = useLoad(() => schoolFetch<{ items: { key: string; check: string; raises: string; on: boolean }[] }>("/accounts/alert-rules"), []);
  const act = useAction(() => l.reload());
  return (
    <div>
      <Head title="Alert Rules" subtitle="What the AI watches for. Turn checks on or off; alerts go to the accountant and the Principal." />
      <ErrorBanner message={l.error || act.error} />
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-[13px]"><thead><tr className="bg-[#f3f9fd] text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="px-5 py-2.5 font-medium">Check</th><th className="px-3 py-2.5 font-medium">Raises</th><th className="px-3 py-2.5 font-medium">On</th></tr></thead>
        <tbody>{l.data?.items.map((r) => <tr key={r.key} className="border-t border-slate-100"><td className="px-5 py-3.5">{r.check}</td><td className="px-3 py-3.5">{r.raises}</td><td className="px-3 py-3.5"><label className="inline-flex items-center gap-2"><input type="checkbox" aria-label={r.check} className="h-4 w-4 accent-[#0294CE]" checked={r.on} disabled={act.busy} onChange={(e) => void act.run(() => schoolFetch("/accounts/alert-rules", json("PUT", { key: r.key, on: e.target.checked })))} />{r.on ? "On" : "Off"}</label></td></tr>)}</tbody></table></div>
    </div>
  );
}

// ═════════════ hiring budget ═════════════
interface Vac { id: string; code: string; post: string; department: string; vtype: string; note: string; posts: number; cost_year: number; requested_by: string; requested_on: string; stage: string }
const total = (v: Vac) => v.posts * v.cost_year;
const label = (v: Vac) => `${v.post}${v.posts > 1 ? ` (${v.posts} posts)` : ""}`;

export function PostApprovals() {
  const a = useAccounts();
  const r = useLoad(() => schoolFetch<{ waiting: Vac[]; decided: Vac[] }>("/accounts/hiring/posts"), []);
  const act = useAction(() => { r.reload(); a.refreshBadges(); });
  const [q, setQ] = useState(""); const [q2, setQ2] = useState("");
  const [view, setView] = useState<Vac | null>(null);
  const waiting = (r.data?.waiting ?? []).filter((v) => has(v, q)); const decided = (r.data?.decided ?? []).filter((v) => has(v, q2));
  const decide = (v: Vac, action: "approve" | "reject") => { if (action === "reject" && !window.confirm(`Reject ${v.code}, ${v.post}? It goes back to HR.`)) return; void act.run(() => schoolFetch(`/accounts/hiring/posts/${v.id}`, json("POST", { action }))); };
  return (
    <div className="space-y-5">
      <Head title="Post Approvals" subtitle="Posts the Principal approved. Check the cost against this year's salary budget." />
      <ErrorBanner message={r.error || act.error} />
      <ListPanel title="Waiting for you" noun="requests" search={q} onSearch={setQ} exportName="posts-waiting" head={["Ref.", "Post", "Why", "Posts", "Cost a year", "Requested by"]}
        exportRows={waiting.map((v) => [v.code, v.post, v.note, v.posts, total(v), v.requested_by])} tableHead={["Ref.", "Post", "Why", "Posts", "Cost a year", "Requested by", ""]}
        rows={waiting.map((v) => [v.code, <div key="p"><p className="font-semibold text-slate-900">{v.post}</p><p className="text-[11px] text-slate-500">{v.department}</p></div>, v.note, v.posts, inr(total(v)), v.requested_by,
          <span key="a" className="flex gap-2 whitespace-nowrap"><button type="button" className={blueBtn} disabled={act.busy} onClick={() => decide(v, "approve")}>Approve</button><button type="button" className={pillBtn} disabled={act.busy} onClick={() => decide(v, "reject")}>Reject</button><button type="button" className={pillBtn} onClick={() => setView(v)}>View details</button></span>])} empty="Nothing is waiting for you." />
      <ListPanel title="Recently decided" noun="requests" search={q2} onSearch={setQ2} exportName="posts-decided" head={["Post", "Cost a year", "Stage"]}
        exportRows={decided.map((v) => [label(v), total(v), v.stage])} tableHead={["Post", "Cost a year", "Stage"]}
        rows={decided.map((v) => [<b key="p">{label(v)}</b>, inr(total(v)), <Chip key="s" tone={v.stage === "Rejected" ? "bad" : v.stage === "Filled" ? "good" : "info"}>{v.stage}</Chip>])} empty="Nothing decided yet." />
      <Modal open={!!view} title={view ? `${view.code} · ${view.post}` : ""} onClose={() => setView(null)}>
        {view && <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-[13px]">
          {([["Post", label(view)], ["Department", view.department || "—"], ["Type", view.vtype], ["Why", view.note || "—"], ["Number of posts", String(view.posts)], ["Cost of one post a year", inr(view.cost_year)], ["Total cost a year", inr(total(view))], ["Requested by", view.requested_by], ["Requested on", dmy(view.requested_on)]] as [string, string][]).map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}
        </dl>}
      </Modal>
    </div>
  );
}

export function SalaryBudget() {
  const r = useLoad(() => schoolFetch<{ budget: number | null; payroll: number; staff: number; approved: number; waiting: number; left: number | null }>("/accounts/hiring/budget"), []);
  const x = r.data;
  const y = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1; const fy = `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
  if (!x) return <><Head title="Salary Budget" /><Loading e={r.error} /></>;
  const max = Math.max(1, x.budget ?? 0, x.payroll + x.approved + x.waiting);
  const rows: [string, number][] = [["Current payroll", x.payroll], ["Approved hiring", x.approved], ["Pending requests", x.waiting], ["Left in budget", x.left ?? 0]];
  return (
    <div>
      <Head title="Salary Budget" subtitle="This year's salary budget against current payroll, approved new posts and requests still waiting." />
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div className="rounded-2xl bg-[#dceff9] px-4 py-3.5"><p className="text-xs text-slate-700">Salary budget {fy}</p><p className="mt-0.5 text-[26px] font-bold tabular-nums">{x.budget === null ? "Not set" : short(x.budget)}</p>{x.budget === null && <p className="text-xs text-slate-700">Add a salary head in Budgets &amp; Forecasts</p>}</div>
        <div className="rounded-2xl bg-[#dceff9] px-4 py-3.5"><p className="text-xs text-slate-700">Current payroll (annualised)</p><p className="mt-0.5 text-[26px] font-bold tabular-nums">{short(x.payroll)}</p><p className="text-xs text-slate-700">{x.staff} staff</p></div>
        <div className="rounded-2xl bg-[#d9efe8] px-4 py-3.5"><p className="text-xs text-slate-700">Approved new hiring</p><p className="mt-0.5 text-[26px] font-bold tabular-nums">{short(x.approved)}</p></div>
        <div className="rounded-2xl bg-[#f8ecd6] px-4 py-3.5"><p className="text-xs text-slate-700">Waiting for approval</p><p className="mt-0.5 text-[26px] font-bold tabular-nums text-[#8a5a0b]">{short(x.waiting)}</p></div>
      </div>
      <div className="mt-5"><Panel title="Budget used" sub={fy}><div className="space-y-3 px-5 py-4">{rows.map(([k, v]) => <div key={k} className="flex items-center gap-3 text-[12.5px]"><span className="w-32 shrink-0 text-slate-900">{k}</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sky-50 ring-1 ring-sky-100"><span className="block h-full rounded-full bg-[#41afda]" style={{ width: `${Math.min(100, (Math.max(0, v) / max) * 100)}%` }} /></span><span className="w-28 text-right tabular-nums text-slate-700">{x.budget === null && k === "Left in budget" ? "—" : v.toLocaleString("en-IN")}</span></div>)}</div></Panel></div>
    </div>
  );
}

interface Settle { id: string; name: string; designation: string; years: number; last_day: string; lines: { item: string; amount: number }[]; net: number; status: string; waiting_for: string; paid_on?: string | null; paid_ref?: string | null }
const sign = (n: number) => (n < 0 ? `− ${inr(Math.abs(n))}` : inr(n));
export function FinalSettlements() {
  const r = useLoad(() => schoolFetch<{ items: Settle[] }>("/accounts/hiring/settlements"), []);
  const act = useAction(() => r.reload());
  const [pay, setPay] = useState<Settle | null>(null); const [f, setF] = useState({ tds: "0", reference: "" });
  const record = async (e: FormEvent) => { e.preventDefault(); if (pay && await act.run(() => schoolFetch(`/accounts/hiring/settlements/${pay.id}/pay`, json("POST", { tds: Number(f.tds) || 0, reference: f.reference })))) setPay(null); };
  return (
    <div className="space-y-5">
      <Head title="Final Settlements" subtitle="Final settlements HR has sent for payment. Check the working, then pay." />
      <ErrorBanner message={r.error} />
      {r.data && !r.data.items.length && <p className="py-10 text-center text-sm text-slate-400">No final settlements yet.</p>}
      {r.data?.items.map((s) => (
        <Panel key={s.id} title={`${s.name} · ${s.designation}`} sub={`${s.years} years · last day ${dmy(s.last_day)}`} right={<Chip tone={s.status === "Pending" ? "warn" : "good"}>{s.status}</Chip>}>
          <SimpleTable head={[{ h: "Item" }, { h: "Amount" }]} rows={[...s.lines.map((l) => [l.item, sign(l.amount)]), [<b key="n">Net payable</b>, <b key="a">{inr(s.net)}</b>]]} />
          {s.waiting_for && <p className="px-5 py-3 text-right text-[12px] text-slate-500">{s.waiting_for}</p>}
          {s.status === "Ready for Finance" && <div className="flex justify-end px-5 py-3"><button type="button" className="rounded-full bg-[#026f9b] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#014a67]" onClick={() => { setPay(s); setF({ tds: "0", reference: "" }); }}>Record payment</button></div>}
          {s.status === "Paid" && <p className="px-5 py-3 text-right text-[12px] text-slate-500">Paid on {dmy(s.paid_on ?? "")}{s.paid_ref ? ` · ${s.paid_ref}` : ""}</p>}
        </Panel>
      ))}
      <Modal open={!!pay} title={pay ? `Pay settlement · ${pay.name}` : ""} onClose={() => setPay(null)}>{pay && <form onSubmit={record} className="space-y-3"><ErrorBanner message={act.error} /><label className="block text-[13px] text-slate-700">Tax deducted (TDS, ₹)<input type="number" min={0} max={pay.net} required className={`${inputCls} mt-1`} value={f.tds} onChange={(e) => setF({ ...f, tds: e.target.value })} /></label><label className="block text-[13px] text-slate-700">Payment reference<input required minLength={2} maxLength={80} placeholder="UTR or cheque number" className={`${inputCls} mt-1`} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></label><p className="text-[13px] font-semibold text-slate-900">Amount to pay: {inr(Math.max(0, pay.net - (Number(f.tds) || 0)))}</p><p className="text-[12px] text-slate-500">This records a payment you have made. No money is moved from here, and it can&apos;t be changed afterwards.</p><div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className="rounded-full border border-slate-200 px-3.5 py-1.5 text-[12px] font-semibold" onClick={() => setPay(null)}>Cancel</button><button type="submit" disabled={act.busy} className="rounded-full bg-[#026f9b] px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">Record payment</button></div></form>}</Modal>
    </div>
  );
}
