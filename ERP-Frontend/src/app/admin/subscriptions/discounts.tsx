"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, type Paged, type Plan, type SchoolRow } from "@/lib/admin-api";
import { Panel, TabBar, fmtDay, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Field, Modal, Th, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { rupees, small } from "./shared";

const Empty = ({ cols, loading, text }: { cols: number; loading: boolean; text: string }) => (
  <tr><td colSpan={cols} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : text}</td></tr>
);

function PlanChecks({ plans, value, onChange }: { plans: Plan[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Plans <span className="font-normal normal-case">(none ticked = every plan)</span></legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {plans.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-mca-blue" checked={value.includes(p.code)} onChange={() => onChange(value.includes(p.code) ? value.filter((c) => c !== p.code) : [...value, p.code])} />{p.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const validity = (from: string | null, until: string | null) => (!from && !until ? "Always" : `${from ? fmtDay(from) : "…"} to ${until ? fmtDay(until) : "no end"}`);
const live = (from: string | null, until: string | null, active: boolean) => {
  const d = new Date().toISOString().slice(0, 10);
  return active && (!from || from <= d) && (!until || until >= d);
};

export function DiscountsSection() {
  const [part, setPart] = useState<"coupons" | "offers" | "special">("coupons");
  return (
    <>
      <TabBar value={part} onChange={setPart} tabs={[["coupons", "Coupons"], ["offers", "Offers"], ["special", "Special pricing"]]} />
      <p className="mb-4 text-sm text-slate-500">Only one discount applies to a renewal. A school&apos;s special price is final; otherwise the better of an automatic offer or the coupon entered wins.</p>
      {part === "coupons" && <Coupons />}
      {part === "offers" && <Offers />}
      {part === "special" && <Special />}
    </>
  );
}

// ── coupons ──
interface Coupon { id: string; code: string; description: string | null; kind: "percent" | "per_student"; value: number; plan_codes: string[]; valid_from: string | null; valid_until: string | null; max_redemptions: number | null; redeemed_count: number; is_active: boolean }

function Coupons() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ coupons: Coupon[] }>("/subscriptions/coupons"), []);
  const plans = useLoad(() => adminFetch<{ plans: Plan[] }>("/plans"), []);
  const act = useAction(reload);
  const blank = { code: "", description: "", kind: "percent" as Coupon["kind"], value: "", plan_codes: [] as string[], max: "", from: "", until: "" };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const body = {
      code: f.code, description: f.description || null, kind: f.kind, plan_codes: f.plan_codes,
      value: f.kind === "percent" ? Number(f.value) : Math.round(Number(f.value) * 100),
      max_redemptions: f.max ? Number(f.max) : null, valid_from: f.from || null, valid_until: f.until || null,
    };
    if (await act.run(() => adminFetch("/subscriptions/coupons", json("POST", body)))) { setOpen(false); setF(blank); }
  };

  return (
    <Panel title="Coupons" sub="Codes you give a school; staff enter them when raising a renewal invoice." right={<button type="button" className={btnPrimary} onClick={() => setOpen(true)}>+ New coupon</button>}>
      <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Code</Th><Th>Discount</Th><Th>Applies to</Th><Th>Valid</Th><Th>Used</Th><Th>Status</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.coupons.length && <Empty cols={7} loading={loading} text="No coupons yet." />}
          {data?.coupons.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3"><p className="font-mono font-bold text-slate-900">{c.code}</p><p className="text-xs text-slate-400">{c.description}</p></td>
              <td className="px-4 py-3">{c.kind === "percent" ? c.value + "% off" : rupees(c.value) + " off each student"}</td>
              <td className="px-4 py-3 text-slate-600">{c.plan_codes.length ? c.plan_codes.join(", ") : "Every plan"}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{validity(c.valid_from, c.valid_until)}</td>
              <td className="px-4 py-3 tabular-nums">{c.redeemed_count}{c.max_redemptions ? " / " + c.max_redemptions : ""}</td>
              <td className="px-4 py-3">{live(c.valid_from, c.valid_until, c.is_active) && (!c.max_redemptions || c.redeemed_count < c.max_redemptions) ? <Badge tone="green">Live</Badge> : <Badge tone="gray">{c.is_active ? "Not valid now" : "Off"}</Badge>}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <button type="button" className={small} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/subscriptions/coupons/${c.id}`, json("PATCH", { is_active: !c.is_active })))}>{c.is_active ? "Switch off" : "Switch on"}</button>
                  <button type="button" className={small} disabled={act.busy || c.redeemed_count > 0} title={c.redeemed_count ? "Used coupons are kept for the record" : undefined} onClick={() => window.confirm(`Delete ${c.code}?`) && act.run(() => adminFetch(`/subscriptions/coupons/${c.id}`, { method: "DELETE" }))}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={open} title="New coupon" onClose={() => setOpen(false)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code"><input className={`${inputCls} font-mono uppercase`} required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" /></Field>
            <Field label="Type"><select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Coupon["kind"] })}><option value="percent">Percent off</option><option value="per_student">₹ off each student</option></select></Field>
            <Field label={f.kind === "percent" ? "Percent (1-100)" : "Rupees off per student"}><input type="number" min={1} max={f.kind === "percent" ? 100 : undefined} step={f.kind === "percent" ? 1 : "0.01"} className={inputCls} required value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
            <Field label="Most uses" hint="Empty = no limit"><input type="number" min={1} className={inputCls} value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} /></Field>
            <Field label="Valid from"><input type="date" className={inputCls} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
            <Field label="Valid until"><input type="date" className={inputCls} value={f.until} onChange={(e) => setF({ ...f, until: e.target.value })} /></Field>
          </div>
          <Field label="Note"><input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <PlanChecks plans={plans.data?.plans ?? []} value={f.plan_codes} onChange={(v) => setF({ ...f, plan_codes: v })} />
          <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Create coupon</button></div>
        </form>
      </Modal>
    </Panel>
  );
}

// ── offers ──
interface Offer { id: string; name: string; percent_off: number; plan_codes: string[]; min_students: number | null; valid_from: string | null; valid_until: string | null; is_active: boolean }

function Offers() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ offers: Offer[] }>("/subscriptions/offers"), []);
  const plans = useLoad(() => adminFetch<{ plans: Plan[] }>("/plans"), []);
  const act = useAction(reload);
  const blank = { name: "", percent: "", plan_codes: [] as string[], min: "", from: "", until: "" };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const body = { name: f.name, percent_off: Number(f.percent), plan_codes: f.plan_codes, min_students: f.min ? Number(f.min) : null, valid_from: f.from || null, valid_until: f.until || null };
    if (await act.run(() => adminFetch("/subscriptions/offers", json("POST", body)))) { setOpen(false); setF(blank); }
  };
  return (
    <Panel title="Offers" sub="Automatic discounts: no code needed. They apply whenever a school qualifies." right={<button type="button" className={btnPrimary} onClick={() => setOpen(true)}>+ New offer</button>}>
      <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>Offer</Th><Th>Discount</Th><Th>Who qualifies</Th><Th>Valid</Th><Th>Status</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.offers.length && <Empty cols={6} loading={loading} text="No offers yet." />}
          {data?.offers.map((o) => (
            <tr key={o.id}>
              <td className="px-4 py-3 font-semibold text-slate-900">{o.name}</td>
              <td className="px-4 py-3">{o.percent_off}% off</td>
              <td className="px-4 py-3 text-slate-600">{o.plan_codes.length ? o.plan_codes.join(", ") : "Every plan"}{o.min_students ? ` · ${o.min_students}+ students` : ""}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{validity(o.valid_from, o.valid_until)}</td>
              <td className="px-4 py-3">{live(o.valid_from, o.valid_until, o.is_active) ? <Badge tone="green">Live</Badge> : <Badge tone="gray">{o.is_active ? "Not valid now" : "Off"}</Badge>}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right"><div className="flex justify-end gap-2">
                <button type="button" className={small} disabled={act.busy} onClick={() => act.run(() => adminFetch(`/subscriptions/offers/${o.id}`, json("PATCH", { is_active: !o.is_active })))}>{o.is_active ? "Switch off" : "Switch on"}</button>
                <button type="button" className={small} disabled={act.busy} onClick={() => window.confirm(`Delete ${o.name}?`) && act.run(() => adminFetch(`/subscriptions/offers/${o.id}`, { method: "DELETE" }))}>Delete</button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={open} title="New offer" onClose={() => setOpen(false)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="Name"><input className={inputCls} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Early renewal 2027" /></Field></div>
            <Field label="Percent off"><input type="number" min={1} max={100} className={inputCls} required value={f.percent} onChange={(e) => setF({ ...f, percent: e.target.value })} /></Field>
            <Field label="Minimum students" hint="Empty = any size"><input type="number" min={1} className={inputCls} value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} /></Field>
            <Field label="Valid from"><input type="date" className={inputCls} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
            <Field label="Valid until"><input type="date" className={inputCls} value={f.until} onChange={(e) => setF({ ...f, until: e.target.value })} /></Field>
          </div>
          <PlanChecks plans={plans.data?.plans ?? []} value={f.plan_codes} onChange={(v) => setF({ ...f, plan_codes: v })} />
          <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Create offer</button></div>
        </form>
      </Modal>
    </Panel>
  );
}

// ── special pricing ──
interface Special { id: string; institution_id: string; price_per_student_paise: number; valid_from: string; valid_until: string | null; reason: string; is_active: boolean; institutions: { name: string; code: string } | null }

export function Special() {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ items: Special[] }>("/subscriptions/special-pricing"), []);
  const schools = useLoad(() => adminFetch<Paged<SchoolRow>>("/schools?pageSize=100"), []);
  const act = useAction(reload);
  const blank = { school: "", price: "", from: "", until: "", reason: "" };
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const body = { institution_id: f.school, price_per_student_paise: Math.round(Number(f.price) * 100), valid_from: f.from || undefined, valid_until: f.until || null, reason: f.reason };
    if (await act.run(() => adminFetch("/subscriptions/special-pricing", json("POST", body)))) { setOpen(false); setF(blank); }
  };
  return (
    <Panel title="Special pricing" sub="A negotiated price per student for one school. It replaces the plan price while valid. A school has one at a time." right={<button type="button" className={btnPrimary} onClick={() => setOpen(true)}>+ Set special price</button>}>
      <div className="p-4 pb-0"><ErrorBanner message={error || act.error} /></div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50"><tr><Th>School</Th><Th>Price per student / year</Th><Th>Valid</Th><Th>Reason</Th><Th>Status</Th><Th /></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {!data?.items.length && <Empty cols={6} loading={loading} text="No special prices." />}
          {data?.items.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-3 font-semibold text-slate-900">{s.institutions?.name}</td>
              <td className="px-4 py-3 tabular-nums">{rupees(s.price_per_student_paise)}</td>
              <td className="px-4 py-3 text-xs text-slate-600">{validity(s.valid_from, s.valid_until)}</td>
              <td className="px-4 py-3 text-slate-600">{s.reason}</td>
              <td className="px-4 py-3">{live(s.valid_from, s.valid_until, s.is_active) ? <Badge tone="green">In effect</Badge> : <Badge tone="gray">{s.is_active ? "Not in effect" : "Ended"}</Badge>}</td>
              <td className="px-4 py-3 text-right">{s.is_active && <button type="button" className={small} disabled={act.busy} onClick={() => window.confirm("End this special price?") && act.run(() => adminFetch(`/subscriptions/special-pricing/${s.id}`, { method: "DELETE" }))}>End</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Modal open={open} title="Set a special price" onClose={() => setOpen(false)}>
        <form onSubmit={save} className="space-y-3">
          <ErrorBanner message={act.error} />
          <Field label="School"><select className={inputCls} required value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })}><option value="">Choose a school</option>{schools.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="₹ per student / year"><input type="number" min={0} step="0.01" className={inputCls} required value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
            <Field label="From"><input type="date" className={inputCls} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
            <Field label="Until"><input type="date" className={inputCls} value={f.until} onChange={(e) => setF({ ...f, until: e.target.value })} /></Field>
          </div>
          <Field label="Reason"><input className={inputCls} required minLength={3} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="3-year agreement signed" /></Field>
          <div className="flex justify-end gap-2 pt-2"><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </Panel>
  );
}

// ═════════════ Billing rules ═════════════
export function BillingSection() {
  const [part, setPart] = useState<"cycle" | "invoice" | "tax">("cycle");
  const { data, error, reload } = useLoad(() => adminFetch<{ settings: Record<string, unknown> }>("/subscriptions/billing-settings"), []);
  const act = useAction(reload);
  const [d, setD] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (data) setD(Object.fromEntries(Object.entries(data.settings).map(([k, v]) => [k, v == null ? "" : String(v)]))); }, [data]);

  const keys: Record<typeof part, string[]> = { cycle: ["billing.default_cycle", "billing.grace_days"], invoice: ["billing.payment_terms_days", "billing.invoice_footer"], tax: ["billing.gst_rate_percent", "general.gst_number"] };
  const numeric = new Set(["billing.grace_days", "billing.payment_terms_days", "billing.gst_rate_percent"]);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const values = Object.fromEntries(keys[part].map((k) => [k, numeric.has(k) ? Number(d[k]) : d[k] ?? ""]));
    if (await act.run(() => adminFetch("/subscriptions/billing-settings", json("PUT", { values })))) setSaved(true);
  };
  const set = (k: string) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value });

  return (
    <>
      <TabBar value={part} onChange={(p) => { setPart(p); setSaved(false); }} tabs={[["cycle", "Billing cycle"], ["invoice", "Invoice settings"], ["tax", "Tax settings"]]} />
      <ErrorBanner message={error} />
      <Panel title={{ cycle: "Billing cycle", invoice: "Invoice settings", tax: "Tax settings" }[part]} sub={{ cycle: "How often schools are billed, and how long a late school keeps access.", invoice: "Due dates and what appears at the bottom of every invoice.", tax: "GST on subscriptions." }[part]}>
        <form onSubmit={save} className="space-y-4 p-5">
          <ErrorBanner message={act.error} />
          {part === "cycle" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default billing cycle" hint="Used for schools that have not chosen one. A school can be switched on its subscription page."><select className={inputCls} value={d["billing.default_cycle"] ?? "annual"} onChange={set("billing.default_cycle")}><option value="annual">Annual</option><option value="quarterly">Quarterly</option></select></Field>
              <Field label="Grace period (days)" hint="After a renewal date passes the school is Overdue; this many days later it becomes Expired and read-only."><input type="number" min={0} max={90} className={inputCls} value={d["billing.grace_days"] ?? ""} onChange={set("billing.grace_days")} /></Field>
            </div>
          )}
          {part === "invoice" && (
            <div className="grid gap-4">
              <Field label="Payment due after (days)" hint="Invoices are due this many days after they are issued."><input type="number" min={0} max={120} className={`${inputCls} max-w-[10rem]`} value={d["billing.payment_terms_days"] ?? ""} onChange={set("billing.payment_terms_days")} /></Field>
              <Field label="Invoice footer" hint="Bank details, a thank-you line or terms. Shown at the bottom of each invoice."><textarea className={`${inputCls} min-h-[5rem]`} maxLength={500} value={d["billing.invoice_footer"] ?? ""} onChange={set("billing.invoice_footer")} /></Field>
              <p className="text-xs text-slate-400">Invoice numbers follow the financial year (INV/2026-27/0001) and never skip or repeat; they cannot be edited.</p>
            </div>
          )}
          {part === "tax" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="GST rate (%)" hint="Added to new invoices. Existing invoices keep theirs."><input type="number" min={0} max={100} step="0.01" className={inputCls} value={d["billing.gst_rate_percent"] ?? ""} onChange={set("billing.gst_rate_percent")} /></Field>
              <Field label="Your GSTIN"><input className={inputCls} value={d["general.gst_number"] ?? ""} onChange={set("general.gst_number")} /></Field>
            </div>
          )}
          <div className="flex items-center justify-end gap-3">{saved && <span className="text-sm font-semibold text-mca-green">Saved</span>}<button type="submit" className={btnPrimary} disabled={act.busy || !data}>Save changes</button></div>
        </form>
      </Panel>
    </>
  );
}
