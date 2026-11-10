"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import {
  schoolFetch, type AcademicYear, type Grade, type Section, type Subject,
} from "@/lib/school-api";
import { Panel, TabBar, fmtDay, num } from "@/components/admin/dash";
import { Badge, ErrorBanner, PageHeader, Th, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { useSchool } from "../context";

type Tab = "years" | "grades" | "sections" | "subjects";

export default function SetupPage() {
  const { can } = useSchool();
  const [tab, setTab] = useState<Tab>("years");
  const editable = can("academics.setup.manage");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "years" || t === "grades" || t === "sections" || t === "subjects") setTab(t);
  }, []);

  return (
    <>
      <PageHeader title="Academic setup" subtitle="Years, grades, sections and subjects for your school." />
      <TabBar value={tab} onChange={setTab} tabs={[["years", "Academic years"], ["grades", "Grades"], ["sections", "Sections"], ["subjects", "Subjects"]]} />
      {tab === "years" && <Years editable={editable} />}
      {tab === "grades" && <Grades editable={editable} />}
      {tab === "sections" && <Sections editable={editable} />}
      {tab === "subjects" && <Subjects editable={editable} />}
    </>
  );
}

/** Runs a mutation, shows its error, and reloads the list on success. */
function useAction(reload: () => void) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    setError("");
    try {
      await fn();
      reload();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, run };
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 p-4">{children}</div>;
}

function Labeled({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Years({ editable }: { editable: boolean }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ years: AcademicYear[] }>("/school/years"), []);
  const { error: actionError, busy, run } = useAction(reload);
  const [f, setF] = useState({ name: "", start_date: "", end_date: "" });

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => schoolFetch("/school/years", json("POST", f)))) setF({ name: "", start_date: "", end_date: "" });
  };

  return (
    <Panel title="Academic years" sub="Exactly one year is current; new enrolments go into it">
      <ErrorBanner message={error || actionError} />
      {editable && (
        <form onSubmit={add}>
          <Row>
            <Labeled label="Name"><input className={inputCls} required placeholder="2026-2027" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labeled>
            <Labeled label="Starts"><input type="date" className={inputCls} required value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Labeled>
            <Labeled label="Ends"><input type="date" className={inputCls} required value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Labeled>
            <button type="submit" className={btnPrimary} disabled={busy}>Add year</button>
          </Row>
        </form>
      )}
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Year</Th><Th>Dates</Th><Th>Status</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.years.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No academic years yet."}</td></tr>}
          {data?.years.map((y) => (
            <tr key={y.id}>
              <td className="px-4 py-3 font-semibold text-slate-900">{y.name}</td>
              <td className="px-4 py-3 text-slate-600">{fmtDay(y.start_date)} – {fmtDay(y.end_date)}</td>
              <td className="px-4 py-3">{y.is_current ? <Badge tone="green">Current</Badge> : <Badge tone="gray">Not current</Badge>}</td>
              <td className="px-4 py-3 text-right">
                {editable && !y.is_current && (
                  <button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => run(() => schoolFetch(`/school/years/${y.id}/current`, json("POST", {})))}>
                    Make current
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function Grades({ editable }: { editable: boolean }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ grades: Grade[] }>("/school/grades"), []);
  const { error: actionError, busy, run } = useAction(reload);
  const [f, setF] = useState({ code: "", name: "" });

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => schoolFetch("/school/grades", json("POST", f)))) setF({ code: "", name: "" });
  };

  return (
    <Panel
      title="Grades"
      sub={`${data?.grades.length ?? 0} grades`}
      right={editable && <button type="button" className={btnGhost} disabled={busy} onClick={() => run(() => schoolFetch("/school/grades/defaults", json("POST", {})))}>Add LKG, UKG and Class 1–12</button>}
    >
      <ErrorBanner message={error || actionError} />
      {editable && (
        <form onSubmit={add}>
          <Row>
            <Labeled label="Code" className="w-28"><input className={inputCls} required placeholder="G13" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Labeled>
            <Labeled label="Name"><input className={inputCls} required placeholder="Class 13" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labeled>
            <button type="submit" className={btnPrimary} disabled={busy}>Add grade</button>
          </Row>
        </form>
      )}
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Order</Th><Th>Code</Th><Th>Name</Th><Th>Active</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.grades.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No grades yet. Use the button above to add the standard set."}</td></tr>}
          {data?.grades.map((g) => (
            <tr key={g.id}>
              <td className="px-4 py-2.5 tabular-nums text-slate-500">{g.sort_order}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{g.code}</td>
              <td className="px-4 py-2.5 font-semibold text-slate-900">{g.name}</td>
              <td className="px-4 py-2.5">
                <input
                  type="checkbox" className="size-4 accent-mca-blue" aria-label={`${g.name} active`} checked={g.is_active} disabled={!editable || busy}
                  onChange={() => run(() => schoolFetch(`/school/grades/${g.id}`, json("PATCH", { is_active: !g.is_active })))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function Sections({ editable }: { editable: boolean }) {
  const years = useLoad(() => schoolFetch<{ years: AcademicYear[] }>("/school/years"), []);
  const grades = useLoad(() => schoolFetch<{ grades: Grade[] }>("/school/grades"), []);
  const [yearId, setYearId] = useState("");

  useEffect(() => {
    if (!yearId && years.data?.years.length) setYearId((years.data.years.find((y) => y.is_current) ?? years.data.years[0]).id);
  }, [years.data, yearId]);

  const { data, error, loading, reload } = useLoad(
    () => (yearId ? schoolFetch<{ sections: Section[] }>(`/school/sections?academic_year_id=${yearId}`) : Promise.resolve(null)),
    [yearId]
  );
  const { error: actionError, busy, run } = useAction(reload);
  const [f, setF] = useState({ grade_id: "", name: "", capacity: "40" });

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => schoolFetch("/school/sections", json("POST", { grade_id: f.grade_id, academic_year_id: yearId, name: f.name, capacity: Number(f.capacity) })))) {
      setF({ ...f, name: "" });
    }
  };

  return (
    <Panel
      title="Sections"
      sub={`${data?.sections.length ?? 0} sections`}
      right={
        editable && (
          <button type="button" className={btnGhost} disabled={busy || !yearId} onClick={() => run(() => schoolFetch("/school/sections/defaults", json("POST", { academic_year_id: yearId, names: ["A", "B"] })))}>
            Add sections A and B to every grade
          </button>
        )
      }
    >
      <ErrorBanner message={years.error || grades.error || error || actionError} />
      <Row>
        <Labeled label="Academic year">
          <select className={`${inputCls} min-w-[10rem]`} value={yearId} onChange={(e) => setYearId(e.target.value)}>
            {years.data?.years.map((y) => <option key={y.id} value={y.id}>{y.name}{y.is_current ? " (current)" : ""}</option>)}
          </select>
        </Labeled>
      </Row>
      {editable && yearId && (
        <form onSubmit={add}>
          <Row>
            <Labeled label="Grade">
              <select className={inputCls} required value={f.grade_id} onChange={(e) => setF({ ...f, grade_id: e.target.value })}>
                <option value="" disabled>Select grade…</option>
                {grades.data?.grades.filter((g) => g.is_active).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Labeled>
            <Labeled label="Section" className="w-28"><input className={inputCls} required placeholder="C" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labeled>
            <Labeled label="Capacity" className="w-28"><input type="number" min={1} max={500} className={inputCls} required value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></Labeled>
            <button type="submit" className={btnPrimary} disabled={busy}>Add section</button>
          </Row>
        </form>
      )}
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Grade</Th><Th>Section</Th><Th>Students</Th><Th>Capacity</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.sections.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No sections for this year yet."}</td></tr>}
          {data?.sections.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-2.5 font-semibold text-slate-900">{s.grade_name}</td>
              <td className="px-4 py-2.5">{s.name}</td>
              <td className="px-4 py-2.5 tabular-nums">{num(s.enrolled)}</td>
              <td className="px-4 py-2.5 tabular-nums text-slate-600">{s.capacity}</td>
              <td className="px-4 py-2.5 text-right">
                {editable && (
                  <button
                    type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} disabled={busy || s.enrolled > 0}
                    title={s.enrolled > 0 ? "Move the students first" : undefined}
                    onClick={() => window.confirm(`Delete ${s.grade_name} ${s.name}?`) && run(() => schoolFetch(`/school/sections/${s.id}`, { method: "DELETE" }))}
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function Subjects({ editable }: { editable: boolean }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ subjects: Subject[] }>("/school/subjects"), []);
  const { error: actionError, busy, run } = useAction(reload);
  const [f, setF] = useState({ code: "", name: "" });

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => schoolFetch("/school/subjects", json("POST", f)))) setF({ code: "", name: "" });
  };

  return (
    <Panel
      title="Subjects"
      sub={`${data?.subjects.length ?? 0} subjects`}
      right={editable && <button type="button" className={btnGhost} disabled={busy} onClick={() => run(() => schoolFetch("/school/subjects/defaults", json("POST", {})))}>Add common subjects</button>}
    >
      <ErrorBanner message={error || actionError} />
      {editable && (
        <form onSubmit={add}>
          <Row>
            <Labeled label="Code" className="w-28"><input className={inputCls} required placeholder="ART" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Labeled>
            <Labeled label="Name"><input className={inputCls} required placeholder="Art & Craft" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Labeled>
            <button type="submit" className={btnPrimary} disabled={busy}>Add subject</button>
          </Row>
        </form>
      )}
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Code</Th><Th>Name</Th><Th>Active</Th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.subjects.length && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : "No subjects yet."}</td></tr>}
          {data?.subjects.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-2.5 font-mono text-xs">{s.code}</td>
              <td className="px-4 py-2.5 font-semibold text-slate-900">{s.name}</td>
              <td className="px-4 py-2.5">
                <input
                  type="checkbox" className="size-4 accent-mca-blue" aria-label={`${s.name} active`} checked={s.is_active} disabled={!editable || busy}
                  onChange={() => run(() => schoolFetch(`/school/subjects/${s.id}`, json("PATCH", { is_active: !s.is_active })))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
