"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, qs, type Paged, type Plan } from "@/lib/admin-api";
import { downloadCsv } from "@/components/admin/csv";
import { Panel, SimpleTable, num, useAction } from "@/components/admin/dash";
import { Chip, Tiles, ViewButton } from "@/components/admin/dash-ui";
import { Modal, ErrorBanner, btnGhost, btnPrimary, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { FormCard, Labelled, small, useSchools } from "./shared";

export type CampusTab = "add" | "list" | "details";

interface CampusRow {
  id: string; code: string; name: string; city: string | null; state: string | null; phone: string | null; principal_name: string | null; classes_offered: string | null;
  classrooms: number | null; opened_year: number | null; is_main: boolean; is_active: boolean; institution_id: string; students: number;
  institutions: { name: string; code: string; status: string } | null;
}
interface ListRes extends Paged<CampusRow> { summary: { campuses: number; schools: number; multi_campus_schools: number; inactive: number } }
interface Detail {
  campus: CampusRow & { address: string | null; postal_code: string | null; email: string | null; facilities: string[] };
  counts: { students: number; users: number; teachers: number };
}

const CLASSES = ["Playgroup – UKG", "Nursery – Class 5", "Nursery – Class 10", "Nursery – Class 12", "Class 1 – Class 12", "Class 6 – Class 12"];
const codeFrom = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 8) || "CAMPUS";

export function SchoolCampus({ tab }: { tab: CampusTab }) {
  return tab === "add" ? <AddCampus /> : tab === "list" ? <CampusList /> : <CampusDetails />;
}

function AddCampus() {
  const schools = useSchools();
  const plans = useLoad(() => adminFetch<{ plans: (Plan & { campus_limit?: number | null })[] }>("/plans"), []);
  const [f, setF] = useState({ school: "", name: "", city: "", address: "", head: "", classes: CLASSES[2] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const list = schools.data?.items ?? [];
  const school = list.find((s) => s.id === f.school) ?? list[0];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!school) return;
    setBusy(true); setError(""); setDone("");
    try {
      // the code is made from the name; if it is taken, a number is added
      for (let n = 0; n < 5; n++) {
        const code = n === 0 ? codeFrom(f.name) : `${codeFrom(f.name).slice(0, 6)}${n + 1}`;
        try {
          await adminFetch(`/schools/${school.id}/campuses`, json("POST", { code, name: f.name, city: f.city || school.city || null, address: f.address || null, principal_name: f.head || null, classes_offered: f.classes || null }));
          setDone(`${f.name} was added to ${school.name}.`);
          setF({ ...f, name: "", address: "", head: "" });
          return;
        } catch (err) {
          if (!(err instanceof Error && /already exists/i.test(err.message))) throw err;
        }
      }
      throw new Error("A campus with that name already exists in this school.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the campus.");
    } finally {
      setBusy(false);
    }
  };

  const limits = plans.data?.plans.filter((p) => p.campus_limit !== undefined) ?? [];
  return (
    <div className="space-y-5">
      <FormCard title="New campus" saveLabel="Add campus" onSubmit={submit} onDiscard={() => setF({ ...f, name: "", address: "", head: "" })} busy={busy} error={error} saved={!!done} disabled={!school}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Labelled label="School"><select className={inputCls} value={school?.id ?? ""} onChange={(e) => setF({ ...f, school: e.target.value })}>{list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Labelled>
          <Labelled label="Campus name"><input className={inputCls} required maxLength={255} placeholder="e.g. North campus" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labelled>
          <Labelled label="City"><input className={inputCls} placeholder={school?.city ?? ""} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Labelled>
        </div>
        <Labelled label="Address"><textarea className={`${inputCls} min-h-[5rem]`} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Labelled>
        <div className="grid gap-4 sm:grid-cols-3">
          <Labelled label="Campus head"><input className={inputCls} value={f.head} onChange={(e) => setF({ ...f, head: e.target.value })} /></Labelled>
          <Labelled label="Classes">
            <select className={inputCls} value={f.classes} onChange={(e) => setF({ ...f, classes: e.target.value })}>{CLASSES.map((c) => <option key={c}>{c}</option>)}</select>
          </Labelled>
        </div>
      </FormCard>
      {done && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{done}</p>}
      <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-3.5 py-2.5 text-[12.5px] text-slate-800">
        {limits.length
          ? `Campuses each plan includes: ${limits.map((p) => `${p.name} ${p.campus_limit ?? "unlimited"}`).join(", ")}. A school cannot add more than its plan allows.`
          : "A school cannot add more campuses than its plan allows."}
      </p>
    </div>
  );
}

function CampusList() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const { data, error, loading } = useLoad(() => adminFetch<ListRes>(`/campuses${qs({ search: q, pageSize: 100 })}`), [q]);
  const items = data?.items ?? [];
  const s = data?.summary;
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <Tiles items={[
        { label: "Campuses", value: s ? num(s.campuses) : "…", sub: s ? `Across ${s.schools} school${s.schools === 1 ? "" : "s"}` : undefined },
        { label: "Multi-campus schools", value: s ? num(s.multi_campus_schools) : "…", sub: "Two or more campuses" },
        { label: "Inactive campuses", value: s ? num(s.inactive) : "…", sub: "Turned off, or school suspended or expired" },
      ]} />
      <Panel title="Campuses" sub={`${data?.total ?? 0} campus${data?.total === 1 ? "" : "es"}`}
        right={<button type="button" className={small} onClick={() => downloadCsv("campuses", ["Campus ID", "Campus", "School", "City", "Head", "Classes", "Students", "Status"], items.map((c) => [c.code, c.name, c.institutions?.name, c.city, c.principal_name, c.classes_offered, c.students, c.is_active ? "Active" : "Off"]))}>Export</button>}>
        <div className="border-b border-slate-100 p-4"><input className={`${inputCls} max-w-xs`} placeholder="Search campuses" aria-label="Search campuses" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <SimpleTable
          head={[{ h: "Campus ID" }, { h: "Campus" }, { h: "City" }, { h: "Head" }, { h: "Classes" }, { h: "Students", right: true }, { h: "Status" }, { h: "" }]}
          empty={loading ? "Loading…" : "No campuses yet."}
          rows={items.map((c) => [
            <span key="i" className="tabular-nums text-slate-700">{c.code}</span>,
            <div key="n"><p className="font-semibold text-slate-900">{c.name}</p><p className="text-xs text-slate-400">{c.institutions?.name}</p></div>,
            c.city || "—", c.principal_name || "—", c.classes_offered || "—", num(c.students),
            c.is_active ? <Chip key="s" tone="good">Active</Chip> : <Chip key="s" tone="mute">Off</Chip>,
            <span key="a" className="inline-flex items-center gap-2">
              <button type="button" className={small} onClick={() => router.push(`/super-admin/schools/campus?tab=details&campus=${c.id}`)}>Open</button>
              <ViewButton href={`/super-admin/schools/${c.institution_id}`} />
            </span>,
          ])}
        />
      </Panel>
    </div>
  );
}

function CampusDetails() {
  const params = useSearchParams();
  const wanted = params.get("campus") ?? "";
  const all = useLoad(() => adminFetch<ListRes>("/campuses?pageSize=100"), []);
  const [picked, setPicked] = useState("");
  const list = all.data?.items ?? [];
  const id = picked || (list.some((c) => c.id === wanted) ? wanted : list[0]?.id) || "";
  const { data, error, reload } = useLoad(() => (id ? adminFetch<Detail>(`/campuses/${id}`) : Promise.resolve(null)), [id]);
  const act = useAction(reload);
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ name: "", city: "", address: "", principal_name: "", classes_offered: "", classrooms: "", opened_year: "", facilities: "", phone: "", email: "" });
  useEffect(() => { setPicked(""); }, [wanted]);

  if (!all.loading && !list.length) return <p className="py-10 text-center text-sm text-slate-400">No campuses yet. Add one first.</p>;
  const c = data?.campus;

  const open = () => {
    if (!c) return;
    setF({ name: c.name, city: c.city ?? "", address: c.address ?? "", principal_name: c.principal_name ?? "", classes_offered: c.classes_offered ?? "", classrooms: c.classrooms?.toString() ?? "", opened_year: c.opened_year?.toString() ?? "", facilities: (c.facilities ?? []).join(", "), phone: c.phone ?? "", email: c.email ?? "" });
    setEditing(true);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!c) return;
    const ok = await act.run(() => adminFetch(`/campuses/${c.id}`, json("PATCH", {
      name: f.name, city: f.city || null, address: f.address || null, principal_name: f.principal_name || null, classes_offered: f.classes_offered || null,
      classrooms: f.classrooms ? Number(f.classrooms) : null, opened_year: f.opened_year ? Number(f.opened_year) : null,
      facilities: f.facilities.split(",").map((x) => x.trim()).filter(Boolean), phone: f.phone || null, email: f.email || null,
    })));
    if (ok) { setEditing(false); all.reload(); }
  };

  return (
    <div className="space-y-5">
      <ErrorBanner message={error || all.error || act.error} />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
        <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">
          Campus
          <select aria-label="Campus" value={id} onChange={(e) => setPicked(e.target.value)} className="max-w-[22rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">
            {list.map((x) => <option key={x.id} value={x.id}>{x.institutions?.name} · {x.name}</option>)}
          </select>
        </label>
      </div>
      <Tiles items={[
        { label: "Students", value: data ? num(data.counts.students) : "…", sub: c?.classes_offered ?? undefined },
        { label: "Teachers", value: data ? num(data.counts.teachers) : "…", sub: data && data.counts.teachers && data.counts.students ? `1 per ${Math.round(data.counts.students / data.counts.teachers)} students` : undefined },
        { label: "Classrooms", value: c?.classrooms != null ? num(c.classrooms) : "—", sub: c?.classrooms && data?.counts.students ? `Avg ${Math.round(data.counts.students / c.classrooms)} students` : "Not entered" },
        { label: "Staff accounts", value: data ? num(data.counts.users) : "…", sub: "Sign in to the school portal" },
      ]} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title={c?.name ?? "Campus"} sub={c?.institutions?.name} right={<span className="flex gap-2"><button type="button" className={small} onClick={open} disabled={!c}>Edit campus</button><Link href="/super-admin/schools/campus?tab=list" className={small}>All campuses</Link></span>}>
          <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2.5 p-5 text-[13px]">
            {([["Campus ID", c?.code], ["School", c?.institutions?.name], ["City", c?.city], ["Campus head", c?.principal_name], ["Classes", c?.classes_offered], ["Opened", c?.opened_year]] as const).map(([k, v]) => (
              <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="text-slate-900">{v ?? "—"}</dd></div>
            ))}
            <dt className="text-slate-500">Status</dt><dd>{c ? (c.is_active ? <Chip tone="good">Active</Chip> : <Chip tone="mute">Off</Chip>) : "—"}</dd>
          </dl>
        </Panel>
        <Panel title="Facilities">
          <div className="flex flex-wrap gap-2 p-5">
            {c?.facilities?.length ? c.facilities.map((x) => <span key={x} className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-600">{x}</span>) : <span className="text-sm text-slate-400">None entered yet. Use Edit campus to add them.</span>}
          </div>
        </Panel>
      </div>

      <Modal open={editing} title="Edit campus" onClose={() => setEditing(false)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Campus name"><input className={inputCls} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labelled>
            <Labelled label="City"><input className={inputCls} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Labelled>
            <Labelled label="Campus head"><input className={inputCls} value={f.principal_name} onChange={(e) => setF({ ...f, principal_name: e.target.value })} /></Labelled>
            <Labelled label="Classes"><input className={inputCls} value={f.classes_offered} onChange={(e) => setF({ ...f, classes_offered: e.target.value })} /></Labelled>
            <Labelled label="Classrooms"><input type="number" min={0} className={inputCls} value={f.classrooms} onChange={(e) => setF({ ...f, classrooms: e.target.value })} /></Labelled>
            <Labelled label="Opened in"><input type="number" min={1800} max={2100} className={inputCls} value={f.opened_year} onChange={(e) => setF({ ...f, opened_year: e.target.value })} /></Labelled>
            <Labelled label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Labelled>
            <Labelled label="Email"><input type="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Labelled>
          </div>
          <Labelled label="Address"><input className={inputCls} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Labelled>
          <Labelled label="Facilities" hint="Separate with commas, like Library, Computer lab, Auditorium."><input className={inputCls} value={f.facilities} onChange={(e) => setF({ ...f, facilities: e.target.value })} /></Labelled>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={btnGhost} onClick={() => setEditing(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={act.busy}>Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
