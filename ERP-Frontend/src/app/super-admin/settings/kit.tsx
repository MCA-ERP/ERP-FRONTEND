"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";

export type SVal = string | number | boolean | string[];

/**
 * The platform settings a page edits. `defaults` says which keys the page owns and what to show when nothing is saved.
 * Saving sends only those keys; Discard goes back to what is saved.
 */
export function useSettings(defaults: Record<string, SVal>) {
  const { data, error, loading, reload } = useLoad(() => adminFetch<{ settings: Record<string, unknown> }>("/settings"), []);
  const base = useRef(defaults);
  const [draft, setDraft] = useState<Record<string, SVal>>(defaults);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const from = (src: Record<string, unknown>) => Object.fromEntries(Object.entries(base.current).map(([k, d]) => [k, src[k] === undefined || src[k] === null ? d : (src[k] as SVal)]));
  useEffect(() => { if (data) setDraft(from(data.settings)); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key: string, value: SVal) => { setDraft((d) => ({ ...d, [key]: value })); setSaved(false); };
  const discard = () => { if (data) setDraft(from(data.settings)); setSaved(false); setSaveError(""); };
  const save = async (e?: FormEvent, extra?: Record<string, SVal>): Promise<boolean> => {
    e?.preventDefault();
    setBusy(true); setSaved(false); setSaveError("");
    try {
      await adminFetch("/settings", json("PUT", { values: { ...draft, ...extra } }));
      setSaved(true);
      reload();
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { draft, set, save, discard, busy, saved, error: saveError || error, loading: loading && !data, ready: !!data, raw: data?.settings ?? {} };
}
export type Settings = ReturnType<typeof useSettings>;

/** A settings card: a heading, rows, and Discard / Save at the bottom. */
export function SettingsCard({ title, sub, s, saveLabel = "Save", onSubmit, children }: { title: string; sub?: string; s: Pick<Settings, "busy" | "saved" | "error" | "discard" | "ready">; saveLabel?: string; onSubmit: (e: FormEvent) => void; children: ReactNode }) {
  return (
    <form onSubmit={onSubmit} className="min-w-0 rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-baseline gap-3 border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">{title}</h2>{sub && <span className="text-xs text-slate-500">{sub}</span>}</div>
      {s.error && <div className="px-5 pt-4"><ErrorBanner message={s.error} /></div>}
      {children}
      <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">
        {s.saved && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">Saved</span>}
        <button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={s.discard}>Discard</button>
        <button type="submit" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={s.busy || !s.ready}>{s.busy ? "Saving…" : saveLabel}</button>
      </div>
    </form>
  );
}

/** A padded block of fields, in columns. */
export function Fields({ cols = 3, children }: { cols?: 2 | 3 | 4 | 5; children: ReactNode }) {
  const grid = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4", 5: "sm:grid-cols-2 lg:grid-cols-5" }[cols];
  return <div className={`grid gap-4 p-5 ${grid}`}>{children}</div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-slate-500">{hint}</span>}
    </label>
  );
}

export type Opt = [string | number | boolean, string];
/** The options, plus the saved value when it is not one of them, so an existing setting is never hidden. */
export const withCurrent = (opts: Opt[], v: SVal | undefined, label?: (v: SVal) => string): Opt[] => (v === undefined || opts.some((o) => o[0] === v) ? opts : [...opts, [v as string | number, label ? label(v) : String(v)]]);

export function Select({ value, onChange, options, label, className = "" }: { value: SVal; onChange: (v: string | number | boolean) => void; options: Opt[]; label: string; className?: string }) {
  const opts = withCurrent(options, value);
  return (
    <select aria-label={label} className={`${inputCls} ${className}`} value={String(value)} onChange={(e) => onChange(opts.find((o) => String(o[0]) === e.target.value)![0])}>
      {opts.map(([v, text]) => <option key={String(v)} value={String(v)}>{text}</option>)}
    </select>
  );
}

const rowCls = "flex items-center gap-4 border-t border-slate-100 px-5 py-3.5";
export function ToggleLine({ label, hint, checked, onChange, disabled }: { label: string; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={rowCls}>
      <div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium text-slate-900">{label}</p>{hint && <p className="text-xs text-slate-500">{hint}</p>}</div>
      <Toggle checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}
export function SelectLine({ label, hint, value, onChange, options }: { label: string; hint?: string; value: SVal; onChange: (v: string | number | boolean) => void; options: Opt[] }) {
  return (
    <div className={rowCls}>
      <div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium text-slate-900">{label}</p>{hint && <p className="text-xs text-slate-500">{hint}</p>}</div>
      <Select label={label} value={value} onChange={onChange} options={options} className="!w-auto min-w-[9rem]" />
    </div>
  );
}
