"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  adminFetch, json, qs,
  type Plan, type SchoolDetail, type SchoolList, type SchoolRow, type SchoolStatus,
} from "@/lib/admin-api";
import { PlanTag, StatusPill, TabBar, fmtDay, inr, num } from "@/components/admin/dash";
import {
  Card, EmptyRow, ErrorBanner, Field, Modal, PageHeader, Pagination, Th,
  btnGhost, btnPrimary, fmtDate, inputCls, useDebounced, useLoad,
} from "@/components/admin/ui";

type Tab = "all" | "pending" | "active" | "inactive" | "suspended";
type Dialog =
  | { kind: "create" }
  | { kind: "edit"; school: SchoolRow }
  | { kind: "view"; id: string }
  | { kind: "plan"; school: SchoolRow }
  | null;

const BOARDS = ["CBSE", "ICSE", "State Board", "IB", "Cambridge", "Montessori", "Play school"];

interface Form {
  name: string; code: string; type: string; board: string; city: string; state: string;
  contact_name: string; contact_email: string; contact_phone: string; address: string; website: string; gst_number: string;
  plan_code: string; status: "Pending" | "Trial" | "Active";
  admin_first: string; admin_last: string; admin_email: string; admin_password: string;
}
const emptyForm: Form = {
  name: "", code: "", type: "School", board: "CBSE", city: "", state: "", contact_name: "", contact_email: "",
  contact_phone: "", address: "", website: "", plan_code: "standard", status: "Trial",
  gst_number: "", admin_first: "", admin_last: "", admin_email: "", admin_password: "",
};

export default function SchoolsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "pending" || t === "active" || t === "inactive" || t === "suspended") setTab(t);
  }, []);

  const plans = useLoad(() => adminFetch<{ plans: Plan[] }>("/plans"), []);
  const { data, error, loading, reload } = useLoad(
    () => adminFetch<SchoolList>(`/schools${qs({ group: tab === "all" ? undefined : tab, search: debounced, plan, page })}`),
    [tab, debounced, plan, page]
  );

  const [dialog, setDialog] = useState<Dialog>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [planChoice, setPlanChoice] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionError, setActionError] = useState("");

  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const close = () => setDialog(null);

  const openCreate = () => {
    setForm({ ...emptyForm, plan_code: plans.data?.plans.find((p) => p.code === "standard")?.code ?? plans.data?.plans[0]?.code ?? "standard" });
    setFormError("");
    setDialog({ kind: "create" });
  };
  // address, website and GSTIN are not in the list row, so load the full record before editing
  // (otherwise saving would blank them)
  const openEdit = async (s: SchoolRow) => {
    setActionError("");
    try {
      const { school: full } = await adminFetch<SchoolDetail>(`/schools/${s.id}`);
      setForm({
        ...emptyForm, name: s.name, code: s.code, type: s.type || "School", board: s.board || "", city: s.city || "",
        state: s.state || "", contact_name: s.contact_name || "", contact_email: s.contact_email || "",
        contact_phone: s.contact_phone || "", address: full.address || "", website: full.website || "", gst_number: full.gst_number || "",
      });
      setFormError("");
      setDialog({ kind: "edit", school: s });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not load the school.");
    }
  };
  const openPlan = (s: SchoolRow) => {
    setPlanChoice(s.plan_code || "");
    setFormError("");
    setDialog({ kind: "plan", school: s });
  };

  const run = async (fn: () => Promise<unknown>, onOk?: () => void) => {
    setSaving(true);
    setFormError("");
    try {
      await fn();
      onOk?.();
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  };

  const submitForm = (e: FormEvent) => {
    e.preventDefault();
    if (!dialog) return;
    const { plan_code, status, code, admin_first, admin_last, admin_email, admin_password, ...fields } = form;
    if (dialog.kind === "create") {
      const admin = admin_email.trim()
        ? { first_name: admin_first, last_name: admin_last, email: admin_email, password: admin_password }
        : undefined;
      void run(() => adminFetch("/schools", json("POST", { ...fields, code, plan_code, status, admin })), close);
    } else if (dialog.kind === "edit") {
      void run(() => adminFetch(`/schools/${dialog.school.id}`, json("PATCH", fields)), close);
    }
  };

  /** Status changes go through the status-action route so a reason is kept in the school's history. */
  const changeStatus = async (s: SchoolRow, action: "suspend" | "deactivate" | "reactivate" | "activate", ask?: string) => {
    let reason: string | undefined;
    if (ask) {
      const answer = window.prompt(ask);
      if (answer === null) return;
      reason = answer.trim();
      if (!reason) { setActionError("A reason is needed."); return; }
    }
    setActionError("");
    try {
      await adminFetch(`/schools/${s.id}/status-action`, json("POST", { action, reason }));
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Update failed.");
    }
  };

  const small = `${btnGhost} !px-2.5 !py-1 text-xs`;
  const counts = data?.counts;

  return (
    <>
      <PageHeader
        title="Schools"
        subtitle="Register schools, approve sign-ups and manage their plans."
        action={<button type="button" className={btnPrimary} onClick={openCreate}>+ Add school</button>}
      />
      <ErrorBanner message={error || actionError} />

      <TabBar
        value={tab}
        onChange={(t) => { setTab(t); setPage(1); }}
        tabs={[
          ["all", "All schools", counts?.all],
          ["pending", "Pending approval", counts?.pending],
          ["active", "Active", counts?.active],
          ["inactive", "Inactive", counts?.inactive],
          ["suspended", "Suspended", counts?.suspended],
        ]}
      />

      <Card>
        <div className="flex flex-wrap gap-3 p-4">
          <input
            className={`${inputCls} max-w-xs`} placeholder="Search name, code or city…" aria-label="Search schools"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className={`${inputCls} max-w-[10rem]`} aria-label="Plan" value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }}>
            <option value="">All plans</option>
            {plans.data?.plans.map((p) => <option key={p.id} value={p.code}>{p.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-100 bg-slate-50">
              <tr><Th>School</Th><Th>Board</Th><Th>Plan</Th><Th>Students</Th><Th>Status</Th><Th>Renews</Th><Th /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!data?.items.length && <EmptyRow cols={7} loading={loading} text="No schools found." />}
              {data?.items.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.code}{s.city ? ` · ${s.city}` : ""}{s.contact_name ? ` · ${s.contact_name}` : ""}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.board || "—"}</td>
                  <td className="px-4 py-3"><PlanTag code={s.plan_code} name={s.plan_name} /></td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{num(s.students)}</td>
                  <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtDay(s.trial_ends_on ?? s.renews_on)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/schools/${s.id}`} className={small}>Open</Link>
                      <button type="button" className={small} onClick={() => setDialog({ kind: "view", id: s.id })}>View</button>
                      <button type="button" className={small} onClick={() => openEdit(s)}>Edit</button>
                      {s.status !== "Pending" && <button type="button" className={small} onClick={() => openPlan(s)}>Plan</button>}
                      {s.status === "Pending" && (
                        <Link href={`/admin/schools/${s.id}?tab=setup`} className={`${btnPrimary} !px-2.5 !py-1 text-xs`}>Review &amp; approve</Link>
                      )}
                      {(s.status === "Trial" || s.status === "Active" || s.status === "Overdue" || s.status === "Inactive" || s.status === "Expired") && (
                        <button type="button" className={small} onClick={() => changeStatus(s, "suspend", `Why is ${s.name} being suspended? Its users will lose access.`)}>Suspend</button>
                      )}
                      {s.status === "Trial" && (
                        <button type="button" className={small} onClick={() => adminFetch(`/schools/${s.id}/status`, json("POST", { status: "Active" })).then(reload, (e) => setActionError(e instanceof Error ? e.message : "Update failed."))}>Mark paid</button>
                      )}
                      {(s.status === "Suspended" || s.status === "Expired" || s.status === "Inactive") && (
                        <button type="button" className={small} onClick={() => changeStatus(s, "reactivate")}>Reactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Card>

      {/* create / edit */}
      <Modal open={dialog?.kind === "create" || dialog?.kind === "edit"} title={dialog?.kind === "create" ? "Add school" : "Edit school"} onClose={close}>
        <form onSubmit={submitForm} className="space-y-3">
          <ErrorBanner message={formError} />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="School name"><input className={inputCls} required minLength={2} value={form.name} onChange={set("name")} /></Field>
            </div>
            <Field label="Code" hint={dialog?.kind === "create" ? "Optional" : undefined}>
              <input className={inputCls} value={form.code} onChange={set("code")} disabled={dialog?.kind === "edit"} placeholder="RAV" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Board">
              <select className={inputCls} value={form.board} onChange={set("board")}>
                <option value="">Not set</option>
                {BOARDS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Type"><input className={inputCls} value={form.type} onChange={set("type")} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City"><input className={inputCls} value={form.city} onChange={set("city")} /></Field>
            <Field label="State"><input className={inputCls} value={form.state} onChange={set("state")} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact person"><input className={inputCls} value={form.contact_name} onChange={set("contact_name")} /></Field>
            <Field label="Contact phone"><input className={inputCls} value={form.contact_phone} onChange={set("contact_phone")} /></Field>
          </div>
          <Field label="Contact email"><input type="email" className={inputCls} value={form.contact_email} onChange={set("contact_email")} /></Field>
          <Field label="GSTIN" hint="Used on GST reports. 15 characters."><input className={inputCls} maxLength={15} value={form.gst_number} onChange={set("gst_number")} /></Field>
          {dialog?.kind === "create" && (
            <fieldset className="rounded-xl border border-slate-200 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">School administrator (optional)</legend>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First name"><input className={inputCls} required={!!form.admin_email} value={form.admin_first} onChange={set("admin_first")} /></Field>
                  <Field label="Last name"><input className={inputCls} required={!!form.admin_email} value={form.admin_last} onChange={set("admin_last")} /></Field>
                </div>
                <Field label="Login email"><input type="email" autoComplete="off" className={inputCls} value={form.admin_email} onChange={set("admin_email")} /></Field>
                <Field label="Temporary password" hint="At least 8 characters. They must change it at first sign-in.">
                  <input type="password" autoComplete="new-password" className={inputCls} required={!!form.admin_email} minLength={8} value={form.admin_password} onChange={set("admin_password")} />
                </Field>
              </div>
            </fieldset>
          )}
          {dialog?.kind === "create" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Plan">
                <select className={inputCls} value={form.plan_code} onChange={set("plan_code")}>
                  {plans.data?.plans.map((p) => <option key={p.id} value={p.code}>{p.name} · {inr(p.price_per_student_paise)}/student/yr</option>)}
                </select>
              </Field>
              <Field label="Starting status">
                <select className={inputCls} value={form.status} onChange={set("status")}>
                  <option value="Trial">Trial (14 days)</option>
                  <option value="Active">Active (paid)</option>
                  <option value="Pending">Pending approval</option>
                </select>
              </Field>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={btnGhost} onClick={close}>Cancel</button>
            <button type="submit" className={btnPrimary} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>

      {/* change plan */}
      <Modal open={dialog?.kind === "plan"} title="Change plan" onClose={close}>
        {dialog?.kind === "plan" && (
          <div className="space-y-4">
            <ErrorBanner message={formError} />
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{dialog.school.name}</span> has {num(dialog.school.students)} students. The new price applies from now; the old subscription is kept in history.
            </p>
            <div className="space-y-2">
              {plans.data?.plans.map((p) => {
                const over = p.student_limit !== null && dialog.school.students > p.student_limit;
                return (
                  <label key={p.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${planChoice === p.code ? "border-mca-blue bg-mca-blue-sky/40" : "border-slate-200"}`}>
                    <input type="radio" name="plan" className="accent-mca-blue" checked={planChoice === p.code} onChange={() => setPlanChoice(p.code)} />
                    <span className="flex-1">
                      <span className="font-semibold">{p.name}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        {inr(p.price_per_student_paise)}/student/yr · {p.student_limit ? `up to ${num(p.student_limit)} students` : "unlimited students"}
                      </span>
                      {over && <span className="ml-2 text-xs font-semibold text-amber-700">over limit</span>}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-slate-600">{inr(p.price_per_student_paise * dialog.school.students)}/yr</span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={close}>Cancel</button>
              <button
                type="button" className={btnPrimary} disabled={saving || !planChoice || planChoice === dialog.school.plan_code}
                onClick={() => run(() => adminFetch(`/schools/${dialog.school.id}/plan`, json("POST", { plan_code: planChoice })), close)}
              >
                {saving ? "Saving…" : "Change plan"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* details */}
      <Modal open={dialog?.kind === "view"} title="School details" onClose={close}>
        {dialog?.kind === "view" && <SchoolDetails id={dialog.id} />}
      </Modal>
    </>
  );
}

function SchoolDetails({ id }: { id: string }) {
  const { data, error, loading } = useLoad(() => adminFetch<SchoolDetail>(`/schools/${id}`), [id]);
  if (loading && !data) return <p className="py-8 text-center text-sm text-slate-400">Loading…</p>;
  if (error) return <ErrorBanner message={error} />;
  if (!data) return null;
  const { school: s } = data;

  const rows: [string, string][] = [
    ["Code", s.code], ["Type", s.type || "—"], ["Board", s.board || "—"],
    ["Location", [s.city, s.state].filter(Boolean).join(", ") || "—"],
    ["Contact", [s.contact_name, s.contact_email, s.contact_phone].filter(Boolean).join(" · ") || "—"],
    ["Website", s.website || "—"], ["Registered", fmtDate(s.created_at)],
    ["Students", num(s.students)], ["Annual value", inr(s.arr_paise)],
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg text-slate-900">{s.name}</h3>
        <StatusPill status={s.status} />
        <PlanTag code={s.plan_code} name={s.plan_name} />
      </div>
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-500">{k}</dt>
            <dd className="break-words text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Subscription history</h4>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
          {data.subscriptions.map((x) => (
            <li key={x.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
              <span className="font-semibold">{x.plans?.name ?? "—"}{x.is_current && <span className="ml-2 text-xs font-medium text-mca-green">current</span>}</span>
              <span className="text-xs text-slate-500">
                {fmtDay(x.started_on)} → {x.ended_on ? fmtDay(x.ended_on) : x.renews_on ? `renews ${fmtDay(x.renews_on)}` : x.trial_ends_on ? `trial ends ${fmtDay(x.trial_ends_on)}` : "ongoing"}
              </span>
            </li>
          ))}
          {data.subscriptions.length === 0 && <li className="px-3 py-3 text-slate-400">No subscription yet.</li>}
        </ul>
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Campuses & users</h4>
        <p className="text-sm text-slate-600">
          {data.campuses.length ? data.campuses.map((c) => c.name).join(", ") : "No campuses yet."}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {data.userCounts.length ? data.userCounts.map((u) => `${u.n} ${u.role}`).join(" · ") : "No user accounts yet."}
        </p>
      </section>
    </div>
  );
}
