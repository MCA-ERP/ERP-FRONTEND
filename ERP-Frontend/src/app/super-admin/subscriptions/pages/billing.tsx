"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { useAction } from "@/components/admin/dash";
import { inputCls, useLoad } from "@/components/admin/ui";
import { FormCard, Labelled, ToggleRow, STATES } from "../../schools/pages/shared";

type V = string | number | boolean | string[] | null;

/** The billing and trial settings: values from the server with a draft to edit, saved together. */
export function useBillingForm(defaults: Record<string, V>, keys: string[]) {
  const { data, error, reload } = useLoad(() => adminFetch<{ settings: Record<string, V> }>("/subscriptions/billing-settings"), []);
  const [draft, setDraft] = useState<Record<string, V>>(defaults);
  const [saved, setSaved] = useState(false);
  const act = useAction(reload);
  const reset = () => setDraft(Object.fromEntries(Object.keys(defaults).map((k) => [k, data?.settings[k] ?? defaults[k]])));
  useEffect(() => { if (data) reset(); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, v: V) => { setDraft((d) => ({ ...d, [k]: v })); setSaved(false); };
  const save = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const values = Object.fromEntries(keys.map((k) => [k, draft[k]]));
    if (await act.run(() => adminFetch("/subscriptions/billing-settings", json("PUT", { values })))) setSaved(true);
  };
  return { draft, set, save, reset, saved, busy: act.busy, error: error || act.error, ready: !!data };
}

const num = (v: V) => (v === "" || v === null ? 0 : Number(v));

export type BillingTab = "cycle" | "invoice" | "tax";

const DEFAULTS: Record<string, V> = {
  "billing.cycles_enabled": ["annual", "instalments"], "billing.default_cycle": "annual", "billing.renewal_invoice_days": 30, "billing.grace_days": 15,
  "billing.payment_terms_days": 15, "billing.billed_by": "", "billing.invoice_footer": "", "billing.bank_details": "", "billing.email_invoices": true, "billing.attach_pdf": true, "billing.include_gstin": true,
  "billing.gst_rate_percent": 18, "general.gst_number": "", "billing.supplier_state": "", "billing.sac_code": "", "billing.prices_include_gst": false, "billing.split_gst": true, "billing.allow_tds": true, "billing.round_tax": true,
};
const KEYS: Record<BillingTab, string[]> = {
  cycle: ["billing.cycles_enabled", "billing.default_cycle", "billing.renewal_invoice_days", "billing.grace_days"],
  invoice: ["billing.payment_terms_days", "billing.billed_by", "billing.invoice_footer", "billing.bank_details", "billing.email_invoices", "billing.attach_pdf", "billing.include_gstin"],
  tax: ["billing.gst_rate_percent", "general.gst_number", "billing.supplier_state", "billing.sac_code", "billing.prices_include_gst", "billing.split_gst", "billing.allow_tds", "billing.round_tax"],
};

const CYCLES: [string, string, string][] = [
  ["annual", "Annual", "One invoice a year, before the renewal date"],
  ["half_yearly", "Half-yearly", "Two invoices"],
  ["instalments", "Four instalments", "Four invoices a year (quarterly)"],
  ["monthly", "Monthly", "Not offered yet"],
];

export function BillingSettings({ tab }: { tab: BillingTab }) {
  const f = useBillingForm(DEFAULTS, KEYS[tab]);
  const d = f.draft;
  const on = (k: string) => d[k] === true;
  const text = (k: string) => (d[k] === null || d[k] === undefined ? "" : String(d[k]));
  const input = (k: string, props: Record<string, unknown> = {}): ReactNode => <input className={inputCls} value={text(k)} onChange={(e) => f.set(k, e.target.value)} {...props} />;
  const cycles = (d["billing.cycles_enabled"] as string[]) ?? [];
  const flipCycle = (c: string) => f.set("billing.cycles_enabled", cycles.includes(c) ? cycles.filter((x) => x !== c) : [...cycles, c]);
  const cast = (e: { preventDefault: () => void }) => {
    // numbers must go to the server as numbers
    for (const k of ["billing.renewal_invoice_days", "billing.grace_days", "billing.payment_terms_days", "billing.gst_rate_percent"]) if (typeof d[k] === "string") d[k] = num(d[k]);
    return f.save(e);
  };
  const common = { busy: f.busy, saved: f.saved, error: f.error, disabled: !f.ready, onDiscard: f.reset, onSubmit: cast };

  if (tab === "cycle") {
    return (
      <div className="space-y-5">
        <FormCard title="Billing cycles" saveLabel="Save billing cycles" {...common}>
          {CYCLES.map(([k, label, hint]) => <ToggleRow key={k} label={label} hint={hint} checked={cycles.includes(k)} disabled={k === "annual"} onChange={() => flipCycle(k)} />)}
          <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
            <Labelled label="Default for new schools"><select className={inputCls} value={text("billing.default_cycle")} onChange={(e) => f.set("billing.default_cycle", e.target.value)}><option value="annual">Annual</option><option value="quarterly">Four instalments</option></select></Labelled>
            <Labelled label="Raise renewal invoices" hint="Days before the renewal date"><input type="number" min={0} max={120} className={inputCls} value={text("billing.renewal_invoice_days")} onChange={(e) => f.set("billing.renewal_invoice_days", e.target.value)} /></Labelled>
            <Labelled label="Grace period" hint="Days a late school stays read-only before it expires"><input type="number" min={0} max={90} className={inputCls} value={text("billing.grace_days")} onChange={(e) => f.set("billing.grace_days", e.target.value)} /></Labelled>
          </div>
        </FormCard>
        <p className="text-xs text-slate-500">Schools can be billed annually or in four instalments today. Half-yearly and monthly are recorded as choices but not offered on invoices yet; renewal invoices are raised by your team from Renewal management.</p>
      </div>
    );
  }

  if (tab === "invoice") {
    return (
      <div className="space-y-5">
        <FormCard title="Invoice settings" saveLabel="Save invoice settings" {...common}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Labelled label="Invoice prefix" hint="Set by the financial year"><input className={inputCls} value="INV/2026-27/" disabled readOnly /></Labelled>
            <Labelled label="Next number" hint="Counted automatically, never repeated"><input className={inputCls} value="Automatic" disabled readOnly /></Labelled>
            <Labelled label="Payment due"><select className={inputCls} value={text("billing.payment_terms_days")} onChange={(e) => f.set("billing.payment_terms_days", Number(e.target.value))}>{[0, 7, 15, 30, 45].map((n) => <option key={n} value={n}>{n === 0 ? "On issue" : `${n} days after issue`}</option>)}</select></Labelled>
            <Labelled label="Billed by">{input("billing.billed_by", { placeholder: "My Class Assist Pvt Ltd" })}</Labelled>
          </div>
          <Labelled label="Notes printed on every invoice"><textarea className={`${inputCls} min-h-[5rem]`} maxLength={500} value={text("billing.invoice_footer")} onChange={(e) => f.set("billing.invoice_footer", e.target.value)} /></Labelled>
          <Labelled label="Bank details for transfers"><textarea className={`${inputCls} min-h-[5rem]`} maxLength={500} value={text("billing.bank_details")} onChange={(e) => f.set("billing.bank_details", e.target.value)} /></Labelled>
          <ToggleRow label="Email invoices automatically" hint="To the school's accounts contact and admin" checked={on("billing.email_invoices")} onChange={(v) => f.set("billing.email_invoices", v)} />
          <ToggleRow label="Attach PDF to email" checked={on("billing.attach_pdf")} onChange={(v) => f.set("billing.attach_pdf", v)} />
          <ToggleRow label="Include the school's GSTIN" hint="When the school has one" checked={on("billing.include_gstin")} onChange={(v) => f.set("billing.include_gstin", v)} />
        </FormCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FormCard title="Tax settings" saveLabel="Save tax settings" {...common}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Labelled label="GST rate"><select className={inputCls} value={text("billing.gst_rate_percent")} onChange={(e) => f.set("billing.gst_rate_percent", Number(e.target.value))}>{[0, 5, 12, 18, 28].map((n) => <option key={n} value={n}>{n}%</option>)}</select></Labelled>
          <Labelled label="Your GSTIN">{input("general.gst_number")}</Labelled>
          <Labelled label="Registered state"><select className={inputCls} value={text("billing.supplier_state")} onChange={(e) => f.set("billing.supplier_state", e.target.value)}><option value="">Choose</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></Labelled>
          <Labelled label="SAC code" hint="Services code printed on invoices. Confirm it with your CA.">{input("billing.sac_code")}</Labelled>
          <Labelled label="Prices are"><select className={inputCls} value={on("billing.prices_include_gst") ? "incl" : "excl"} onChange={(e) => f.set("billing.prices_include_gst", e.target.value === "incl")}><option value="excl">Before GST (GST added)</option><option value="incl">Including GST</option></select></Labelled>
        </div>
        <ToggleRow label="Split GST by place of supply" hint="CGST + SGST inside the registered state, IGST for other states" checked={on("billing.split_gst")} onChange={(v) => f.set("billing.split_gst", v)} />
        <ToggleRow label="Allow TDS deduction" hint="Schools can deduct TDS and upload the certificate" checked={on("billing.allow_tds")} onChange={(v) => f.set("billing.allow_tds", v)} />
        <ToggleRow label="Round tax to the nearest rupee" checked={on("billing.round_tax")} onChange={(v) => f.set("billing.round_tax", v)} />
      </FormCard>
    </div>
  );
}
