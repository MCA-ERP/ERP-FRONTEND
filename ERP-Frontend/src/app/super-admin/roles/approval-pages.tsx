"use client";

import { useEffect, useState } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { ToggleRow } from "../schools/pages/shared";

export type ApprovalTab = "admission" | "fees" | "payroll" | "results" | "leave" | "attcorr" | "lesson" | "mobile" | "mess" | "health" | "staffdocs";
interface Level { level: number; approver_role: string; when_text: string; within_days: number }
interface Flow { key: string; label: string; require_approval: boolean; require_hint: string; escalate_overdue: boolean; allow_delegate: boolean; notify_requester: boolean; levels: Level[] }
const day = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

/** Who approves one kind of request: the chain of levels, the rules around it, and how long each level has. */
export function ApprovalChain({ tab }: { tab: ApprovalTab }) {
  const flows = useLoad(() => adminFetch<{ flows: Flow[] }>("/role-config/approval-flows"), []);
  const roles = useLoad(() => adminFetch<{ roles: { display_name: string; scope: string }[] }>("/role-config/roles"), []);
  const flow = flows.data?.flows.find((f) => f.key === tab);
  const [d, setD] = useState<Flow | null>(null);
  const [saved, setSaved] = useState(false);
  const act = useAction(flows.reload);
  useEffect(() => { if (flow) { setD(structuredClone(flow)); setSaved(false); } }, [flow]);

  if (!flow || !d) return <><ErrorBanner message={flows.error} /><p className="py-10 text-center text-sm text-slate-400">{flows.loading ? "Loading…" : "This approval chain is not set up."}</p></>;
  const options = [...new Set([...(roles.data?.roles ?? []).filter((r) => r.scope === "school").map((r) => r.display_name), ...(flows.data?.flows ?? []).flatMap((f) => f.levels.map((l) => l.approver_role)), ...d.levels.map((l) => l.approver_role)])].sort();
  const rule = (k: "require_approval" | "escalate_overdue" | "allow_delegate" | "notify_requester", v: boolean) => { setD({ ...d, [k]: v }); setSaved(false); };
  const level = (n: number, patch: Partial<Level>) => { setD({ ...d, levels: d.levels.map((l) => (l.level === n ? { ...l, ...patch } : l)) }); setSaved(false); };
  const save = async () => {
    if (await act.run(() => adminFetch(`/role-config/approval-flows/${tab}`, json("PUT", { require_approval: d.require_approval, escalate_overdue: d.escalate_overdue, allow_delegate: d.allow_delegate, notify_requester: d.notify_requester, levels: d.levels.map((l) => ({ level: l.level, approver_role: l.approver_role, within_days: l.within_days })) })))) setSaved(true);
  };

  return (
    <div className="space-y-5">
      <ErrorBanner message={flows.error || act.error} />
      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <Panel title={`${flow.label} approval chain`} sub={`${d.levels.length} level${d.levels.length === 1 ? "" : "s"}`}>
          <div className="space-y-1 p-4">
            {d.levels.map((l, i) => (
              <div key={l.level}>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#0294ce] text-xs font-bold text-white">{l.level}</span>
                  <div><p className="text-[13.5px] font-semibold text-slate-900">{l.approver_role}</p><p className="text-xs text-slate-500">{l.when_text} · within {day(l.within_days)}</p></div>
                </div>
                {i < d.levels.length - 1 && <p className="py-1 text-center text-xs text-slate-400" aria-hidden="true">↓</p>}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Rules">
          <div className="px-5">
          <ToggleRow label="Require approval" hint={flow.require_hint} checked={d.require_approval} onChange={(v) => rule("require_approval", v)} />
          <ToggleRow label="Escalate when overdue" hint="Goes to the next level automatically" checked={d.escalate_overdue} onChange={(v) => rule("escalate_overdue", v)} />
          <ToggleRow label="Let approvers delegate" hint="While on leave" checked={d.allow_delegate} onChange={(v) => rule("allow_delegate", v)} />
          <ToggleRow label="Notify the requester" hint="By app notification and email" checked={d.notify_requester} onChange={(v) => rule("notify_requester", v)} />
          </div>
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
            {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
            <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { setD(structuredClone(flow)); setSaved(false); }}>Discard</button>
            <button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy} onClick={save}>{act.busy ? "Saving…" : "Save rules"}</button>
          </div>
        </Panel>
      </div>
      <Panel title="Approvers" sub={`${d.levels.length} level${d.levels.length === 1 ? "" : "s"}`} right={<ExportPrint name={`${tab}-approvers`} head={["Level", "Approver role", "When", "Time to approve"]} rows={d.levels.map((l) => [l.level, l.approver_role, l.when_text, day(l.within_days)])} />}>
        <SimpleTable head={[{ h: "Level" }, { h: "Approver role" }, { h: "When" }, { h: "Time to approve" }]} empty="No levels."
          rows={d.levels.map((l) => [
            l.level,
            <select key="r" aria-label={`Level ${l.level} approver`} className={`${inputCls} max-w-[17rem]`} value={l.approver_role} onChange={(e) => level(l.level, { approver_role: e.target.value })}>{options.map((o) => <option key={o}>{o}</option>)}</select>,
            l.when_text,
            <select key="t" aria-label={`Level ${l.level} time`} className={`${inputCls} max-w-[7rem]`} value={l.within_days} onChange={(e) => level(l.level, { within_days: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 7, 10, 14].map((n) => <option key={n} value={n}>{day(n)}</option>)}</select>,
          ])} />
      </Panel>
    </div>
  );
}
