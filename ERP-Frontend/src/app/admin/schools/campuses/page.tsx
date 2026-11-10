"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, qs, type Paged, type SchoolList } from "@/lib/admin-api";
import { useAction } from "@/components/admin/dash";
import { Badge, Card, ErrorBanner, Field, Modal, PageHeader, Pagination, Th, btnGhost, btnPrimary, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { CampusForm, emptyCampus } from "../[id]/sections";

interface CampusRow {
  id: string; code: string; name: string; city: string | null; state: string | null; phone: string | null; principal_name: string | null;
  is_main: boolean; is_active: boolean; institution_id: string; institutions: { name: string; code: string; status: string } | null;
}
interface CampusDetail { campus: Record<string, string | null> & { id: string; name: string; code: string; institutions: { name: string } | null }; counts: { students: number; users: number } }

export default function CampusesPage() {
  const [search, setSearch] = useState("");
  const [school, setSchool] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const schools = useLoad(() => adminFetch<SchoolList>("/schools?pageSize=100"), []);
  const { data, error, loading, reload } = useLoad(() => adminFetch<Paged<CampusRow>>(`/campuses${qs({ search: q, school, page })}`), [q, school, page]);
  const act = useAction(reload);

  const [mode, setMode] = useState<"add" | null>(null);
  const [target, setTarget] = useState("");
  const [f, setF] = useState(emptyCampus);
  const [detail, setDetail] = useState<CampusDetail | null>(null);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await act.run(() => adminFetch(`/schools/${target}/campuses`, json("POST", f)))) { setMode(null); setF(emptyCampus); }
  };
  const view = async (id: string) => {
    try { setDetail(await adminFetch<CampusDetail>(`/campuses/${id}`)); } catch { /* shown by the next reload error */ }
  };

  return (
    <>
      <PageHeader title="Campuses" subtitle="Every campus across all schools." action={<button type="button" className={btnPrimary} onClick={() => { setTarget(school || schools.data?.items[0]?.id || ""); setMode("add"); }}>+ Add campus</button>} />
      <ErrorBanner message={error || act.error} />
      <Card>
        <div className="flex flex-wrap gap-3 p-4">
          <input className={`${inputCls} max-w-xs`} placeholder="Search campus, code or city…" aria-label="Search campuses" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select className={`${inputCls} max-w-xs`} aria-label="School" value={school} onChange={(e) => { setSchool(e.target.value); setPage(1); }}>
            <option value="">All schools</option>
            {schools.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-100 bg-slate-50"><tr><Th>Campus</Th><Th>School</Th><Th>Place</Th><Th>Principal</Th><Th>Status</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.items.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No campuses found."}</td></tr>}
              {data?.items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><p className="font-semibold text-slate-900">{c.name}{c.is_main && <span className="ml-2"><Badge tone="blue">Main</Badge></span>}</p><p className="text-xs text-slate-400">{c.code}</p></td>
                  <td className="px-4 py-3 text-slate-600">{c.institutions?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.principal_name || "—"}</td>
                  <td className="px-4 py-3">{c.is_active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Off</Badge>}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} onClick={() => view(c.id)}>Details</button>
                      <Link href={`/admin/schools/${c.institution_id}?tab=campuses`} className={`${btnGhost} !px-2.5 !py-1 text-xs`}>Edit</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Card>

      <Modal open={!!detail} title={detail?.campus.name ?? ""} onClose={() => setDetail(null)}>
        {detail && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {([["School", detail.campus.institutions?.name], ["Code", detail.campus.code], ["Address", detail.campus.address], ["City", detail.campus.city], ["State", detail.campus.state], ["PIN code", detail.campus.postal_code],
              ["Principal", detail.campus.principal_name], ["Phone", detail.campus.phone], ["Email", detail.campus.email]] as const).map(([k, v]) => (
              <div key={k}><dt className="text-xs font-semibold uppercase text-slate-500">{k}</dt><dd className="text-slate-900">{v || "—"}</dd></div>
            ))}
            <div><dt className="text-xs font-semibold uppercase text-slate-500">Students</dt><dd className="text-slate-900">{detail.counts.students}</dd></div>
            <div><dt className="text-xs font-semibold uppercase text-slate-500">Staff accounts</dt><dd className="text-slate-900">{detail.counts.users}</dd></div>
          </dl>
        )}
      </Modal>

      <Modal open={mode === "add"} title="Add campus" onClose={() => setMode(null)}>
        <div className="mb-3">
          <Field label="School">
            <select className={inputCls} value={target} onChange={(e) => setTarget(e.target.value)}>
              {schools.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </div>
        <CampusForm f={f} setF={setF} onSubmit={add} busy={act.busy} error={act.error} isNew onCancel={() => setMode(null)} />
      </Modal>
    </>
  );
}
