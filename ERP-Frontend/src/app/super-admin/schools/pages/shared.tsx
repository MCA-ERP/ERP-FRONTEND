"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { adminFetch, type Paged, type SchoolRow } from "@/lib/admin-api";
import { PlanTag, StatusPill } from "@/components/admin/dash";
import { ErrorBanner, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";

export const small = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:border-slate-400 disabled:opacity-50";
export const smallPrimary = "rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";

/** The schools list, for the pickers. */
export function useSchools() {
  return useLoad(() => adminFetch<Paged<SchoolRow>>("/schools?pageSize=100"), []);
}

/**
 * The bar at the top of a page that works on one school: pick the school, and see its status, plan and where it is.
 * The page below is rebuilt when the school changes, so nothing from the last school lingers.
 */
export function SchoolBar({ children }: { children: (school: SchoolRow) => ReactNode }) {
  const schools = useSchools();
  const [id, setId] = useState("");
  const list = schools.data?.items ?? [];
  const chosen = list.find((s) => s.id === id) ?? list[0];
  return (
    <>
      <ErrorBanner message={schools.error} />
      {chosen ? (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
            <label className="flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">
              School
              <select aria-label="School" value={chosen.id} onChange={(e) => setId(e.target.value)} className="max-w-[16rem] cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">
                {list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <StatusPill status={chosen.status} />
            <PlanTag code={chosen.plan_code} name={chosen.plan_name} />
            <span className="ml-auto text-xs text-slate-600">{chosen.code}{chosen.city ? ` · ${chosen.city}` : ""}{chosen.state ? `, ${chosen.state}` : ""}{chosen.board ? ` · ${chosen.board}` : ""}</span>
          </div>
          <div key={chosen.id}>{children(chosen)}</div>
        </>
      ) : (
        <p className="py-10 text-center text-sm text-slate-400">{schools.loading ? "Loading…" : "No schools yet. Add one first."}</p>
      )}
    </>
  );
}

/** A form card: a heading, the fields, and Discard / Save at the bottom. */
export function FormCard({ title, sub, children, onSubmit, onDiscard, saveLabel, busy, saved, error, disabled }: {
  title: string; sub?: string; children: ReactNode; onSubmit: (e: React.FormEvent) => void; onDiscard?: () => void; saveLabel: string; busy?: boolean; saved?: boolean; error?: string; disabled?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{title}</h2>{sub && <span className="text-xs text-slate-500">{sub}</span>}</div>
      <div className="space-y-4 p-5">
        <ErrorBanner message={error ?? ""} />
        {children}
      </div>
      <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
        {saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
        {onDiscard && <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={onDiscard}>Discard</button>}
        <button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={busy || disabled}>{busy ? "Saving…" : saveLabel}</button>
      </div>
    </form>
  );
}

/** A labelled switch with a line of help under it. */
export function ToggleRow({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="-mx-5 flex items-center gap-4 border-t border-slate-100 px-5 py-3.5">
      <div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium text-slate-900">{label}</p>{hint && <p className="text-xs text-slate-500">{hint}</p>}</div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 flex-none rounded-full transition ${checked ? "bg-[#41afda]" : "bg-slate-300"} ${disabled ? "opacity-50" : ""}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

/** Small labelled input used on the forms. */
export function Labelled({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-slate-500">{hint}</span>}
    </label>
  );
}

export const selectCls = `${inputCls}`;
export const STATES = ["Andhra Pradesh", "Delhi", "Gujarat", "Haryana", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"];
export const BOARDS = ["CBSE", "ICSE", "State Board", "IB", "Cambridge", "Montessori", "Play school"];
