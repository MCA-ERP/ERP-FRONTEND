"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { json, qs } from "@/lib/admin-api";
import type { StudentRecord } from "@/lib/api";
import { schoolFetch, type AcademicYear, type Grade, type Section } from "@/lib/school-api";
import {
  Badge, Card, EmptyRow, ErrorBanner, Field, Modal, PageHeader, Pagination, Th,
  btnGhost, btnPrimary, inputCls, useDebounced, useLoad,
} from "@/components/admin/ui";
import { useSchool } from "../context";

const PAGE_SIZE = 20;

const emptyForm = {
  first_name: "", last_name: "", gender: "", date_of_birth: "", grade_id: "", section: "",
  guardian_name: "", guardian_phone: "", guardian_relation: "Parent", address: "",
};

export default function StudentsPage() {
  const { can } = useSchool();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);

  const { data, error, loading, reload } = useLoad(
    () =>
      schoolFetch<{ students: StudentRecord[]; total: number }>(
        `/sis/students${qs({ search: debounced, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })}`
      ),
    [debounced, page]
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  // class pickers are only loaded once the form is opened
  const setup = useLoad(
    async () => {
      if (!open) return null;
      const [years, grades] = await Promise.all([
        schoolFetch<{ years: AcademicYear[] }>("/school/years"),
        schoolFetch<{ grades: Grade[] }>("/school/grades"),
      ]);
      const current = years.years.find((y) => y.is_current);
      const sections = current
        ? (await schoolFetch<{ sections: Section[] }>(`/school/sections?academic_year_id=${current.id}`)).sections
        : [];
      return { current, grades: grades.grades.filter((g) => g.is_active), sections };
    },
    [open]
  );

  const set = (k: keyof typeof emptyForm) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value, ...(k === "grade_id" ? { section: "" } : {}) }));

  const sectionsForGrade = setup.data?.sections.filter((s) => s.grade_id === form.grade_id) ?? [];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const grade = setup.data?.grades.find((g) => g.id === form.grade_id);
    if (!grade) return setFormError("Choose a grade.");
    setSaving(true);
    setFormError("");
    try {
      const { grade_id: _g, ...rest } = form;
      const res = await schoolFetch<{ message: string }>("/sis/students", json("POST", { ...rest, grade: grade.name }));
      setNotice(res.message);
      setOpen(false);
      setForm(emptyForm);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Enrolment failed.");
    } finally {
      setSaving(false);
    }
  };

  const total = data?.total ?? 0;

  return (
    <>
      <PageHeader
        title="Students"
        subtitle="Enrolled students and their class placement."
        action={
          can("sis.student.create") && (
            <button type="button" className={btnPrimary} onClick={() => { setFormError(""); setNotice(""); setOpen(true); }}>
              + Enrol student
            </button>
          )
        }
      />
      <ErrorBanner message={error} />
      {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}

      <Card>
        <div className="p-4">
          <input
            className={`${inputCls} max-w-xs`} placeholder="Search name or student ID…" aria-label="Search students"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-100 bg-slate-50">
              <tr><Th>Student ID</Th><Th>Name</Th><Th>Class</Th><Th>Roll</Th><Th>Guardian</Th><Th>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.students.length && <EmptyRow cols={6} loading={loading} text="No students yet." />}
              {data?.students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{s.registration_no}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.program}</td>
                  <td className="px-4 py-3 text-slate-600">{s.roll_no || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.guardian?.name ? <>{s.guardian.name}<span className="block text-xs text-slate-400">{s.guardian.phone}</span></> : "—"}
                  </td>
                  <td className="px-4 py-3"><Badge tone={s.status === "Enrolled" ? "green" : "gray"}>{s.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />}
      </Card>

      <Modal open={open} title="Enrol student" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-3">
          <ErrorBanner message={formError || setup.error} />
          {setup.data && !setup.data.current && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">Set a current academic year under Academic setup before enrolling students.</p>
          )}
          {setup.data && setup.data.current && setup.data.grades.length === 0 && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">Add grades under Academic setup first.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name"><input className={inputCls} required value={form.first_name} onChange={set("first_name")} /></Field>
            <Field label="Last name"><input className={inputCls} required value={form.last_name} onChange={set("last_name")} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Gender">
              <select className={inputCls} value={form.gender} onChange={set("gender")}>
                <option value="">Not specified</option><option>Female</option><option>Male</option><option>Other</option>
              </select>
            </Field>
            <Field label="Date of birth"><input type="date" className={inputCls} value={form.date_of_birth} onChange={set("date_of_birth")} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Grade">
              <select className={inputCls} required value={form.grade_id} onChange={set("grade_id")}>
                <option value="" disabled>Select grade…</option>
                {setup.data?.grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </Field>
            <Field label="Section">
              <select className={inputCls} value={form.section} onChange={set("section")} disabled={!form.grade_id}>
                <option value="">No section yet</option>
                {sectionsForGrade.map((s) => <option key={s.id} value={s.name}>{s.name} ({s.enrolled}/{s.capacity})</option>)}
              </select>
            </Field>
          </div>
          <fieldset className="rounded-xl border border-slate-200 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Guardian</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><input className={inputCls} value={form.guardian_name} onChange={set("guardian_name")} /></Field>
              <Field label="Phone"><input className={inputCls} value={form.guardian_phone} onChange={set("guardian_phone")} /></Field>
            </div>
            <div className="mt-3">
              <Field label="Relation">
                <select className={inputCls} value={form.guardian_relation} onChange={set("guardian_relation")}>
                  <option>Parent</option><option>Father</option><option>Mother</option><option>Guardian</option>
                </select>
              </Field>
            </div>
          </fieldset>
          <Field label="Address"><input className={inputCls} value={form.address} onChange={set("address")} /></Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={saving || !setup.data?.current}>{saving ? "Enrolling…" : "Enrol"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
