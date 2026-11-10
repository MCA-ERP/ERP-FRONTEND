"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, qs, type Paged, type Plan } from "@/lib/admin-api";
import { TabBar, useAction } from "@/components/admin/dash";
import { Badge, Card, ErrorBanner, Field, Modal, PageHeader, Pagination, Th, btnGhost, btnPrimary, fmtDate, inputCls, useDebounced, useLoad } from "@/components/admin/ui";

interface App {
  id: string; source: "website" | "demo" | "referral"; school_name: string; contact_name: string; contact_email: string; contact_phone: string | null;
  city: string | null; state: string | null; board: string | null; student_estimate: number | null; plan_interest: string | null; message: string | null;
  status: "new" | "in_review" | "converted" | "rejected"; notes: string | null; created_at: string; institution_id: string | null;
}
type Res = Paged<App> & { open: number };
const small = `${btnGhost} !px-2.5 !py-1 text-xs`;
const SOURCE = { website: "Website", demo: "Demo request", referral: "Referral" } as const;
const tone = { new: "blue", in_review: "gray", converted: "green", rejected: "red" } as const;
const label = { new: "New", in_review: "In review", converted: "Became a school", rejected: "Rejected" } as const;

export default function ApplicationsPage() {
  const [tab, setTab] = useState<"open" | "new" | "in_review" | "converted" | "rejected">("open");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const plans = useLoad(() => adminFetch<{ plans: Plan[] }>("/plans"), []);
  const { data, error, loading, reload } = useLoad(
    () => adminFetch<Res>(`/applications${qs({ status: tab === "open" ? undefined : tab, source, search: q, page })}`),
    [tab, source, q, page]
  );
  const act = useAction(reload);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<App | null>(null);
  const blank = { source: "referral", school_name: "", contact_name: "", contact_email: "", contact_phone: "", city: "", state: "", board: "", plan_interest: "standard", message: "" };
  const [f, setF] = useState(blank);

  const items = (data?.items ?? []).filter((a) => tab !== "open" || a.status === "new" || a.status === "in_review");

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => adminFetch("/applications", json("POST", f)))) { setOpen(false); setF(blank); }
  };
  const convert = (a: App) =>
    window.confirm(`Create ${a.school_name} as a school waiting for approval?`) &&
    act.run(() => adminFetch(`/applications/${a.id}/convert`, json("POST", { plan_code: a.plan_interest || undefined })));
  const reject = (a: App) => {
    const why = window.prompt(`Why is ${a.school_name} being turned down?`);
    if (why?.trim()) void act.run(() => adminFetch(`/applications/${a.id}`, json("PATCH", { status: "rejected", notes: why.trim() })));
  };

  return (
    <>
      <PageHeader title="School applications" subtitle="Applications from the website, demos and referrals." action={<button type="button" className={btnPrimary} onClick={() => setOpen(true)}>+ Add application</button>} />
      <ErrorBanner message={error || act.error} />
      <TabBar value={tab} onChange={(t) => { setTab(t); setPage(1); }} tabs={[["open", "Open", data?.open], ["new", "New"], ["in_review", "In review"], ["converted", "Became schools"], ["rejected", "Rejected"]]} />
      <Card>
        <div className="flex flex-wrap gap-3 p-4">
          <input className={`${inputCls} max-w-xs`} placeholder="Search school, contact or email…" aria-label="Search applications" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className={`${inputCls} max-w-[11rem]`} aria-label="Source" value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
            <option value="">All sources</option><option value="website">Website</option><option value="demo">Demo request</option><option value="referral">Referral</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-100 bg-slate-50"><tr><Th>School</Th><Th>Contact</Th><Th>Source</Th><Th>Status</Th><Th>Received</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!items.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No applications here."}</td></tr>}
              {items.map((a) => (
                <tr key={a.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3"><p className="font-semibold text-slate-900">{a.school_name}</p><p className="text-xs text-slate-400">{[a.city, a.state, a.board].filter(Boolean).join(" · ")}{a.student_estimate ? ` · ~${a.student_estimate} students` : ""}</p></td>
                  <td className="px-4 py-3"><p className="text-slate-900">{a.contact_name}</p><p className="text-xs text-slate-400">{a.contact_email}{a.contact_phone ? ` · ${a.contact_phone}` : ""}</p></td>
                  <td className="px-4 py-3 text-slate-600">{SOURCE[a.source]}</td>
                  <td className="px-4 py-3"><Badge tone={tone[a.status]}>{label[a.status]}</Badge>{a.status === "rejected" && a.notes && <p className="mt-1 max-w-[14rem] text-xs text-rose-700">{a.notes}</p>}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDate(a.created_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" className={small} onClick={() => setDetail(a)}>Details</button>
                      {a.status === "new" && <button type="button" className={small} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/applications/${a.id}`, json("PATCH", { status: "in_review" })))}>Start review</button>}
                      {(a.status === "new" || a.status === "in_review") && <button type="button" className={`${btnPrimary} !px-2.5 !py-1 text-xs`} disabled={act.busy} onClick={() => convert(a)}>Create school</button>}
                      {(a.status === "new" || a.status === "in_review") && <button type="button" className={small} disabled={act.busy} onClick={() => reject(a)}>Reject</button>}
                      {a.status === "converted" && a.institution_id && <Link href={`/admin/schools/${a.institution_id}?tab=setup`} className={small}>Open school</Link>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Card>

      <Modal open={!!detail} title={detail?.school_name ?? ""} onClose={() => setDetail(null)}>
        {detail && (
          <dl className="space-y-2 text-sm">
            <div><dt className="text-xs font-semibold uppercase text-slate-500">Contact</dt><dd>{detail.contact_name} · {detail.contact_email}{detail.contact_phone ? ` · ${detail.contact_phone}` : ""}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-500">Interested in</dt><dd>{plans.data?.plans.find((p) => p.code === detail.plan_interest)?.name ?? detail.plan_interest ?? "—"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-500">Message</dt><dd className="whitespace-pre-wrap">{detail.message || "—"}</dd></div>
          </dl>
        )}
      </Modal>

      <Modal open={open} title="Add an application" onClose={() => setOpen(false)}>
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
            <button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={act.busy}>Add</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
