"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Pills } from "@/components/admin/pills";
import { Badge, ErrorBanner, Field, Modal, Th, btnGhost, btnPrimary, fmtDate, inputCls, useLoad } from "@/components/admin/ui";
import { small } from "../users/shared";

type Severity = "Low" | "Medium" | "High";
type Status = "Open" | "Investigating" | "Mitigated" | "Resolved";
interface Alert { id: string; severity: Severity; title: string; detail: string; when: string; ip?: string; blocked?: boolean }
interface Incident { id: string; code: string; title: string; severity: Severity; status: Status; notes: string; started_at: string; resolved_at: string | null }

const SEV_TONE = { High: "red", Medium: "blue", Low: "gray" } as const;
const STATUS_TONE = { Open: "red", Investigating: "blue", Mitigated: "blue", Resolved: "green" } as const;
const STATUSES: Status[] = ["Open", "Investigating", "Mitigated", "Resolved"];

export function Incidents() {
  const [view, setView] = useState<"alerts" | "history">("alerts");
  const incidents = useLoad(() => adminFetch<{ incidents: Incident[] }>("/security/incidents"), []);
  const [open, setOpen] = useState<Incident | "new" | null>(null);
  const [f, setF] = useState({ title: "", severity: "Medium" as Severity, status: "Open" as Status, notes: "" });
  const [formError, setFormError] = useState("");
  const { error: actionError, busy, run } = useAction(incidents.reload);

  const openForm = (i: Incident | "new", prefill?: Partial<typeof f>) => {
    setFormError("");
    setF(i === "new" ? { title: "", severity: "Medium", status: "Open", notes: "", ...prefill } : { title: i.title, severity: i.severity, status: i.status, notes: i.notes });
    setOpen(i);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run(async () => {
      try {
        if (open === "new") await adminFetch("/security/incidents", json("POST", { title: f.title, severity: f.severity, notes: f.notes }));
        else if (open) await adminFetch(`/security/incidents/${open.id}`, json("PATCH", f));
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Save failed.");
        throw err;
      }
    });
    if (ok) { setOpen(null); setView("history"); }
  };

  return (
    <>
      <Pills label="Incidents" value={view} onChange={setView} items={[["alerts", "Security alerts"], ["history", "Incident history"]]} />
      {view === "alerts" ? <Alerts onReport={(a) => openForm("new", { title: a.title, severity: a.severity, notes: a.detail })} /> : (
        <Panel title="Incidents" sub="What happened, how serious it was, and what was done." right={<button type="button" className={btnPrimary} onClick={() => openForm("new")}>+ Report incident</button>}>
          <div className="p-4 pb-0"><ErrorBanner message={incidents.error || actionError} /></div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr><Th>Incident</Th><Th>Severity</Th><Th>Status</Th><Th>Started</Th><Th>Notes</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!incidents.data?.incidents.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{incidents.loading ? "Loading…" : "No incidents reported."}</td></tr>}
              {incidents.data?.incidents.map((i) => (
                <tr key={i.id} className="align-top">
                  <td className="px-4 py-3"><p className="font-semibold text-slate-900">{i.title}</p><p className="font-mono text-xs text-slate-400">{i.code}</p></td>
                  <td className="px-4 py-3"><Badge tone={SEV_TONE[i.severity]}>{i.severity}</Badge></td>
                  <td className="px-4 py-3"><Badge tone={STATUS_TONE[i.status]}>{i.status}</Badge></td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(i.started_at)}{i.resolved_at && <><br />Resolved {fmtDate(i.resolved_at)}</>}</td>
                  <td className="max-w-xs px-4 py-3 text-xs text-slate-600"><span className="line-clamp-2">{i.notes || "—"}</span></td>
                  <td className="px-4 py-3 text-right"><button type="button" className={small} onClick={() => openForm(i)}>Update</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
      <Modal open={open !== null} title={open === "new" ? "Report an incident" : "Update incident"} onClose={() => setOpen(null)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={formError} />
          <Field label="What happened"><input className={inputCls} required minLength={3} maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Severity"><select className={inputCls} value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value as Severity })}>{(["Low", "Medium", "High"] as Severity[]).map((s) => <option key={s}>{s}</option>)}</select></Field>
            {open !== "new" && <Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Status })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>}
          </div>
          <Field label="Notes" hint="What you found and what was done."><textarea className={`${inputCls} min-h-[7rem]`} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnGhost} onClick={() => setOpen(null)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={busy}>Save</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function Alerts({ onReport }: { onReport: (a: Alert) => void }) {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ alerts: Alert[] }>("/security/alerts"), []);
  const { error: actionError, busy, run } = useAction(reload);
  return (
    <Panel title="Security alerts" sub="Things that look wrong right now, worked out from sign-ins, lockouts and blocked attempts. An alert goes away when its cause does."
      right={<button type="button" className={small} onClick={reload}>Refresh</button>}>
      <div className="p-4 pb-0"><ErrorBanner message={error || actionError} /></div>
      {!data?.alerts.length && <p className="px-4 py-8 text-center text-sm text-slate-400">{loading ? "Loading…" : "Nothing needs attention."}</p>}
      <ul className="divide-y divide-slate-100">
        {data?.alerts.map((a) => (
          <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900"><Badge tone={SEV_TONE[a.severity]}>{a.severity}</Badge> <span className="ml-1">{a.title}</span></p>
              <p className="mt-1 text-sm text-slate-600">{a.detail}</p>
              <p className="mt-0.5 text-xs text-slate-400">{fmtDate(a.when)}</p>
            </div>
            <div className="flex gap-2">
              {a.ip && !a.blocked && <button type="button" className={small} disabled={busy} onClick={() => window.confirm(`Block ${a.ip}?`) && run(() => adminFetch("/ip-blocklist", json("POST", { cidr: a.ip, reason: a.title })))}>Block IP</button>}
              {a.ip && a.blocked && <Badge tone="gray">Blocked</Badge>}
              <button type="button" className={small} onClick={() => onReport(a)}>Report incident</button>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
