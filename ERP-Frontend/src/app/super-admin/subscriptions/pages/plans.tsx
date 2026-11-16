"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { downloadCsv } from "@/components/admin/csv";
import { Panel, SimpleTable, num, useAction } from "@/components/admin/dash";
import { Chip, ViewButton } from "@/components/admin/dash-ui";
import { ErrorBanner, inputCls, useLoad } from "@/components/admin/ui";
import { FormCard, Labelled, ToggleRow, small } from "../../schools/pages/shared";

export type PlanTab = "create" | "edit" | "list";

export interface PlanFull {
  id: string; code: string; name: string; description: string | null; price_per_student_paise: number;
  student_limit: number | null; staff_limit: number | null; campus_limit: number | null; storage_gb: number | null; trial_days: number | null; sort_order: number; is_active: boolean;
  admin_limit: number | null; max_file_mb: number | null; video_storage_gb: number | null; extra_storage_paise: number | null; sms_per_year: number | null; support: string | null;
  show_on_pricing: boolean; allow_instalments: boolean; schools: number; module_count: number;
}

export const usePlans = () => useLoad(() => adminFetch<{ plans: PlanFull[] }>("/subscriptions/plans"), []);
export const rupees0 = (paise: number) => "₹" + Math.round(paise / 100).toLocaleString("en-IN");
export const limitText = (n: number | null, unit = "") => (n === null ? "Unlimited" : n.toLocaleString("en-IN") + unit);
const GB = (n: number | null) => (n === null ? "Unlimited" : n >= 1000 ? `${n / 1000} TB` : `${n} GB`);
const STORAGE = [10, 25, 50, 100, 250, 500, 1000];
const toNum = (v: string) => (v.trim() === "" ? null : Number(v));

interface Form {
  name: string; price: string; student_limit: string; staff_limit: string; storage_gb: string; from: string; description: string;
  show_on_pricing: boolean; allow_instalments: boolean; sms_per_year: string; support: string;
}
const blank: Form = { name: "", price: "", student_limit: "", staff_limit: "", storage_gb: "50", from: "", description: "", show_on_pricing: false, allow_instalments: true, sms_per_year: "", support: "" };
const fromPlan = (p: PlanFull): Form => ({
  name: p.name, price: String(p.price_per_student_paise / 100), student_limit: p.student_limit?.toString() ?? "", staff_limit: p.staff_limit?.toString() ?? "", storage_gb: p.storage_gb?.toString() ?? "",
  from: "", description: p.description ?? "", show_on_pricing: p.show_on_pricing, allow_instalments: p.allow_instalments, sms_per_year: p.sms_per_year?.toString() ?? "", support: p.support ?? "",
});

export function PlanManagement({ tab }: { tab: PlanTab }) {
  const plans = usePlans();
  if (tab === "list") return <PlanList plans={plans.data?.plans ?? []} loading={plans.loading} error={plans.error} />;
  return <PlanForm mode={tab} plans={plans.data?.plans ?? []} reload={plans.reload} loadError={plans.error} />;
}

function PlanForm({ mode, plans, reload, loadError }: { mode: "create" | "edit"; plans: PlanFull[]; reload: () => void; loadError: string }) {
  const params = useSearchParams();
  const [picked, setPicked] = useState(params.get("plan") ?? "");
  const [f, setF] = useState<Form>(blank);
  const [saved, setSaved] = useState(false);
  const act = useAction(reload);
  const plan = mode === "edit" ? plans.find((p) => p.code === picked) ?? plans[0] : undefined;
  useEffect(() => { setPicked(params.get("plan") ?? ""); }, [params]);
  useEffect(() => { if (mode === "edit" && plan) { setF(fromPlan(plan)); setSaved(false); } }, [plan?.id, plans]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof Form) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setSaved(false); };
  const copyFrom = (code: string) => {
    const p = plans.find((x) => x.code === code);
    setF(p ? { ...fromPlan(p), name: f.name, from: code, show_on_pricing: f.show_on_pricing, price: f.price || String(p.price_per_student_paise / 100) } : { ...f, from: code });
  };

  const body = () => {
    const src = plans.find((p) => p.code === f.from) ?? plan;
    return {
      name: f.name.trim(), description: f.description.trim() || null, price_per_student_paise: Math.round(Number(f.price) * 100),
      student_limit: toNum(f.student_limit), staff_limit: toNum(f.staff_limit), storage_gb: toNum(f.storage_gb),
      campus_limit: src?.campus_limit ?? null, trial_days: src?.trial_days ?? null, sort_order: src?.sort_order ?? plans.length + 1,
      sms_per_year: toNum(f.sms_per_year), support: f.support.trim() || null, show_on_pricing: f.show_on_pricing, allow_instalments: f.allow_instalments,
    };
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const ok = await act.run(async () => {
      if (mode === "edit" && plan) {
        await adminFetch(`/subscriptions/plans/${plan.id}`, json("PATCH", body()));
      } else {
        const base = f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 26) || "plan";
        for (let n = 0; n < 5; n++) {
          try { await adminFetch("/subscriptions/plans", json("POST", { ...body(), code: n ? `${base}-${n + 1}` : base })); return; }
          catch (err) { if (!(err instanceof Error && /already exists/i.test(err.message))) throw err; }
        }
        throw new Error("A plan with that name already exists.");
      }
    });
    if (ok) { setSaved(true); if (mode === "create") setF(blank); }
  };

  const storageOptions = [...new Set([...(f.storage_gb ? [Number(f.storage_gb)] : []), ...STORAGE])].sort((a, b) => a - b);
  return (
    <div className="space-y-5">
      <ErrorBanner message={loadError} />
      {mode === "edit" && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
          <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">
            Plan
            <select aria-label="Plan" value={plan?.code ?? ""} onChange={(e) => setPicked(e.target.value)} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">
              {plans.map((p) => <option key={p.id} value={p.code}>{p.name}</option>)}
            </select>
          </label>
        </div>
      )}
      <FormCard title={mode === "edit" ? `Edit ${plan?.name ?? "plan"}` : "New plan"} saveLabel={mode === "edit" ? "Save plan" : "Create plan"} onSubmit={submit} onDiscard={() => (mode === "edit" && plan ? setF(fromPlan(plan)) : setF(blank))}
        busy={act.busy} saved={saved} error={act.error} disabled={mode === "edit" && !plan}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Labelled label="Plan name"><input className={inputCls} required placeholder="e.g. Starter" value={f.name} onChange={set("name")} /></Labelled>
          <Labelled label="Price per student per year (₹)"><input type="number" min={0} step="0.01" required className={inputCls} value={f.price} onChange={set("price")} /></Labelled>
          <Labelled label="Student limit" hint="Empty: unlimited"><input type="number" min={1} className={inputCls} value={f.student_limit} onChange={set("student_limit")} /></Labelled>
          <Labelled label="Staff accounts" hint="Empty: unlimited"><input type="number" min={1} className={inputCls} value={f.staff_limit} onChange={set("staff_limit")} /></Labelled>
          <Labelled label="Storage"><select className={inputCls} value={f.storage_gb} onChange={set("storage_gb")}><option value="">Unlimited</option>{storageOptions.map((n) => <option key={n} value={n}>{GB(n)}</option>)}</select></Labelled>
          {mode === "create"
            ? <Labelled label="Start from" hint="Copies its limits"><select className={inputCls} value={f.from} onChange={(e) => copyFrom(e.target.value)}><option value="">Nothing (blank plan)</option>{plans.map((p) => <option key={p.id} value={p.code}>{p.name}</option>)}</select></Labelled>
            : <Labelled label="SMS a year" hint="Empty: not limited"><input type="number" min={0} className={inputCls} value={f.sms_per_year} onChange={set("sms_per_year")} /></Labelled>}
        </div>
        {mode === "edit" && <Labelled label="Support"><input className={inputCls} placeholder="Priority + onboarding" value={f.support} onChange={set("support")} /></Labelled>}
        {mode === "create" && <Labelled label="Description on the pricing page"><textarea className={`${inputCls} min-h-[5rem]`} value={f.description} onChange={set("description")} /></Labelled>}
        <ToggleRow label="Show on the pricing page" hint="Hidden plans can still be assigned by your team" checked={f.show_on_pricing} onChange={(v) => { setF({ ...f, show_on_pricing: v }); setSaved(false); }} />
        <ToggleRow label="Allow instalments" hint="Schools can pay in 4 parts" checked={f.allow_instalments} onChange={(v) => { setF({ ...f, allow_instalments: v }); setSaved(false); }} />
      </FormCard>
      {mode === "edit" && <p className="rounded-xl border border-[#c0e4f3] bg-[#f3f9fd] px-3.5 py-2.5 text-[12.5px] text-slate-800">Price changes apply to new subscriptions and to existing schools at their next renewal.</p>}
    </div>
  );
}

function PlanList({ plans, loading, error }: { plans: PlanFull[]; loading: boolean; error: string }) {
  const router = useRouter();
  const edit = (code: string) => router.push(`/super-admin/subscriptions/plans?tab=edit&plan=${code}`);
  const popular = plans.reduce((b, p) => (p.schools > (b?.schools ?? 0) ? p : b), undefined as PlanFull | undefined);
  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {plans.filter((p) => p.is_active).map((p) => {
          const best = popular?.id === p.id && p.schools > 0;
          return (
            <section key={p.id} className={`flex flex-col rounded-2xl border bg-white p-5 ${best ? "border-[#0294ce] bg-[#f3f9fd] shadow-[0_0_0_1px_#0294ce]" : "border-slate-200"}`}>
              <h3 className="flex items-center gap-2 text-[17px] font-semibold text-slate-900">{p.name}{best && <Chip tone="good">Most chosen</Chip>}</h3>
              <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{rupees0(p.price_per_student_paise)}<small className="ml-1 text-xs font-normal text-slate-500">/ student / year</small></p>
              <ul className="mt-3 flex-1 space-y-1.5 text-[13px] text-slate-800">
                <li>{p.student_limit === null ? "Unlimited students" : `Up to ${num(p.student_limit)} students`}</li>
                <li>{p.staff_limit === null ? "Unlimited staff accounts" : `${num(p.staff_limit)} staff accounts`} · {GB(p.storage_gb)} storage</li>
                <li>{p.module_count} modules{p.sms_per_year !== null ? ` · ${num(p.sms_per_year)} SMS a year` : ""}</li>
                {p.support && <li>{p.support}</li>}
              </ul>
              <div className="mt-3 flex justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-600"><span>{p.campus_limit === null ? "Unlimited campuses" : `${p.campus_limit} campus${p.campus_limit === 1 ? "" : "es"}`}</span><span>{p.schools} school{p.schools === 1 ? "" : "s"}</span></div>
              <button type="button" className={`${small} mt-3 self-start`} onClick={() => edit(p.code)}>Edit plan</button>
            </section>
          );
        })}
      </div>
      <Panel title="Plans" sub={`${plans.length} plan${plans.length === 1 ? "" : "s"}`} right={<button type="button" className={small} onClick={() => downloadCsv("plans", ["Plan", "Price per student", "Students", "Modules", "Schools"], plans.map((p) => [p.name, p.price_per_student_paise / 100, p.student_limit ?? "Unlimited", p.module_count, p.schools]))}>Export</button>}>
        <SimpleTable
          head={[{ h: "Plan" }, { h: "Price / student / yr" }, { h: "Students", right: true }, { h: "Modules", right: true }, { h: "Schools", right: true }, { h: "Status" }, { h: "" }]}
          empty={loading ? "Loading…" : "No plans."}
          rows={plans.map((p) => [
            <b key="n" className="font-semibold text-slate-900">{p.name}</b>, rupees0(p.price_per_student_paise), limitText(p.student_limit), p.module_count, p.schools,
            !p.is_active ? <Chip key="s" tone="mute">Retired</Chip> : p.show_on_pricing ? <Chip key="s" tone="good">Published</Chip> : <Chip key="s" tone="info">Hidden</Chip>,
            <ViewButton key="v" href={`/super-admin/subscriptions/plans?tab=edit&plan=${p.code}`} />,
          ])}
        />
      </Panel>
    </div>
  );
}
