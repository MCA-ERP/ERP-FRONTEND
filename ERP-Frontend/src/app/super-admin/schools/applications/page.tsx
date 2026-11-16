"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, qs, type Paged, type Plan } from "@/lib/admin-api";
import { downloadCsv } from "@/components/admin/csv";
import { Panel, SimpleTable, fmtDay, num, useAction } from "@/components/admin/dash";
import { Chip, Tag, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Field, Modal, btnGhost, btnPrimary, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { small, smallPrimary } from "../pages/shared";

type Status = "new" | "in_review" | "documents_pending" | "converted" | "rejected";
interface App {
  id: string; code: string; source: "website" | "demo" | "referral"; school_name: string; contact_name: string; contact_email: string; contact_phone: string | null;
  city: string | null; state: string | null; board: string | null; student_estimate: number | null; plan_interest: string | null; message: string | null;
  status: Status; notes: string | null; created_at: string; institution_id: string | null;
}
type Res = Paged<App> & { open: number; counts: { new: number; in_review: number; documents_pending: number; rejected_30d: number } };

const SOURCE = { website: "Website form", demo: "Demo request", referral: "Referral" } as const;
const TONE = { new: "warn", in_review: "warn", documents_pending: "info", converted: "good", rejected: "bad" } as const;
const LABEL = { new: "New", in_review: "Under review", documents_pending: "Documents pending", converted: "Became a school", rejected: "Rejected" } as const;

/** School Application: requests from the website, demos and referrals, and what to do with each. */
export default function ApplicationsPage() {
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const plans = useLoad(() => adminFetch<{ plans: Plan[] }>("/plans"), []);
  const { data, error, loading, reload } = useLoad(() => adminFetch<Res>(`/applications${qs({ search: q, pageSize: 100 })}`), [q]);
  const act = useAction(reload);
  const [review, setReview] = useState<App | null>(null);
  const [adding, setAdding] = useState(false);
  const blank = { source: "referral", school_name: "", contact_name: "", contact_email: "", contact_phone: "", city: "", state: "", board: "", plan_interest: "standard", message: "" };
  const [f, setF] = useState(blank);
  const items = data?.items ?? [];
  const c = data?.counts;

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => adminFetch("/applications", json("POST", f)))) { setAdding(false); setF(blank); }
  };
  const requestDocs = (a: App) => {
    const note = window.prompt(`Which documents does ${a.school_name} need to send?`, a.notes ?? "");
    if (note === null) return;
    void act.run(() => adminFetch(`/applications/${a.id}`, json("PATCH", { status: "documents_pending", notes: note.trim() || null })));
    setReview(null);
  };
  const convert = (a: App) => {
    if (!window.confirm(`Create ${a.school_name} as a school waiting for approval?`)) return;
    void act.run(() => adminFetch(`/applications/${a.id}/convert`, json("POST", { plan_code: a.plan_interest || undefined })));
    setReview(null);
  };
  const reject = (a: App) => {
    const why = window.prompt(`Why is ${a.school_name} being turned down?`);
    if (!why?.trim()) return;
    void act.run(() => adminFetch(`/applications/${a.id}`, json("PATCH", { status: "rejected", notes: why.trim() })));
    setReview(null);
  };

  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Tiles items={[
        { label: "New", value: c ? num(c.new) : "…", sub: "Not yet reviewed" },
        { label: "Under review", value: c ? num(c.in_review) : "…", sub: "Documents being checked" },
        { label: "Documents pending", value: c ? num(c.documents_pending) : "…", sub: "Waiting on the school" },
        { label: "Rejected", value: c ? num(c.rejected_30d) : "…", sub: "Last 30 days" },
      ]} />
      <Panel title="Applications" sub={`${data?.total ?? 0} application${data?.total === 1 ? "" : "s"}`}
        right={<span className="flex gap-2"><button type="button" className={small} onClick={() => setAdding(true)}>+ Add application</button><button type="button" className={small} onClick={() => downloadCsv("applications", ["Application", "School", "City", "Board", "Students", "Contact", "Email", "Source", "Received", "Status"], items.map((a) => [a.code, a.school_name, a.city, a.board, a.student_estimate, a.contact_name, a.contact_email, SOURCE[a.source], a.created_at.slice(0, 10), LABEL[a.status]]))}>Export</button></span>}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search applications" aria-label="Search applications" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable
          head={[{ h: "Application" }, { h: "School" }, { h: "Board" }, { h: "Students", right: true }, { h: "Contact" }, { h: "Source" }, { h: "Received" }, { h: "Status" }, { h: "" }]}
          empty={loading ? "Loading…" : "No applications yet."}
          rows={items.map((a) => [
            <span key="c" className="font-medium tabular-nums text-slate-700">{a.code}</span>,
            <div key="s"><p className="font-semibold text-slate-900">{a.school_name}</p><p className="text-xs text-slate-400">{a.city ?? ""}</p></div>,
            a.board ? <Tag key="b">{a.board}</Tag> : "—",
            a.student_estimate ? num(a.student_estimate) : "—",
            a.contact_name,
            SOURCE[a.source],
            fmtDay(a.created_at.slice(0, 10)),
            <Chip key="st" tone={TONE[a.status]}>{LABEL[a.status]}</Chip>,
            <span key="a" className="inline-flex items-center gap-2">
              {a.status === "new" && <button type="button" className={small} disabled={act.busy} onClick={() => requestDocs(a)}>Request documents</button>}
              {(a.status === "in_review" || a.status === "documents_pending") && <button type="button" className={small} onClick={() => setReview(a)}>Review</button>}
              {a.status === "converted" && a.institution_id && <Link href={`/super-admin/schools/${a.institution_id}?tab=setup`} className={small}>Open school</Link>}
              <button type="button" className={small} onClick={() => setReview(a)}>View details</button>
            </span>,
          ])}
        />
      </Panel>

      <Modal open={!!review} title={review ? `${review.code} · ${review.school_name}` : ""} onClose={() => setReview(null)}>
        {review && (
          <div className="space-y-3 text-sm">
            <dl className="grid grid-cols-2 gap-3">
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Contact</dt><dd>{review.contact_name}<br />{review.contact_email}{review.contact_phone ? ` · ${review.contact_phone}` : ""}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Place</dt><dd>{[review.city, review.state, review.board].filter(Boolean).join(" · ") || "—"}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Interested in</dt><dd>{plans.data?.plans.find((p) => p.code === review.plan_interest)?.name ?? review.plan_interest ?? "—"}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Status</dt><dd><Chip tone={TONE[review.status]}>{LABEL[review.status]}</Chip></dd></div>
            </dl>
            <div><p className="text-xs font-semibold uppercase text-slate-500">Message</p><p className="whitespace-pre-wrap">{review.message || "—"}</p></div>
            {review.notes && <div><p className="text-xs font-semibold uppercase text-slate-500">Notes</p><p className="whitespace-pre-wrap">{review.notes}</p></div>}
            {(review.status === "new" || review.status === "in_review" || review.status === "documents_pending") && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                {review.status === "new" && <button type="button" className={small} disabled={act.busy} onClick={() => { void act.run(() => adminFetch(`/applications/${review.id}`, json("PATCH", { status: "in_review" }))); setReview(null); }}>Start review</button>}
                <button type="button" className={small} onClick={() => requestDocs(review)}>Request documents</button>
                <button type="button" className={small} onClick={() => reject(review)}>Reject</button>
                <button type="button" className={smallPrimary} disabled={act.busy} onClick={() => convert(review)}>Create school</button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={adding} title="Add an application" onClose={() => setAdding(false)}>
        <form onSubmit={add} className="space-y-3">
          <ErrorBanner message={act.error} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Source"><select className={inputCls} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}><option value="referral">Referral</option><option value="demo">Demo request</option></select></Field>
            <Field label="Plan interest"><select className={inputCls} value={f.plan_interest} onChange={(e) => setF({ ...f, plan_interest: e.target.value })}>{plans.data?.plans.map((p) => <option key={p.id} value={p.code}>{p.name}</option>)}</select></Field>
          </div>
          <Field label="School name"><input className={inputCls} required value={f.school_name} onChange={(e) => setF({ ...f, school_name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact name"><input className={inputCls} required value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} /></Field>
            <Field label="Contact email"><input type="email" className={inputCls} required value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputCls} value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} /></Field>
            <Field label="City"><input className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={act.busy}>Add</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
