"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json, type SchoolRow } from "@/lib/admin-api";
import { useAction } from "@/components/admin/dash";
import { inputCls, useLoad } from "@/components/admin/ui";
import { FormCard, Labelled, SchoolBar, STATES, ToggleRow } from "./shared";

export type ConfigTab = "academic" | "regional" | "language";

interface Config {
  academic: { current_year: string; year_start_month: number; terms: number; grading: string; pass_mark: number; working_days: string; attendance_rule: string; min_attendance_percent: number; promote_auto: boolean; lock_marks: boolean };
  regional: { country: string; state: string; timezone: string; currency: string; number_format: string; date_format: string; week_start: string };
  language: { default: string; report_card: string; comms: string; parents_choose: boolean; enabled: string[] };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const LANGUAGES = ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Marathi", "Malayalam", "Bengali"];
const GRADING = ["CBSE 8-point (A1 - E)", "10-point (CGPA)", "Percentage", "Cambridge (A* - G)", "IB 7-point", "Marks and percentage", "Grades (A-E)", "CGPA", "Descriptive only"];
const COUNTRIES = ["India", "United Arab Emirates", "Nepal", "Sri Lanka", "Bangladesh"];

/** The academic years to pick from: last year, this one, and the next two. */
const years = (current: string) => {
  const y = new Date().getFullYear();
  const list = [-1, 0, 1, 2].map((n) => `${y + n}-${String((y + n + 1) % 100).padStart(2, "0")}`);
  return current && !list.includes(current) ? [current, ...list] : list;
};
const withCurrent = (list: string[], value: string) => (value && !list.includes(value) ? [value, ...list] : list);

/** School Configuration: academic, regional and language settings for the school chosen at the top. */
export function SchoolConfiguration({ tab }: { tab: ConfigTab }) {
  return <SchoolBar>{(school) => <ConfigForm school={school} tab={tab} />}</SchoolBar>;
}

function ConfigForm({ school, tab }: { school: SchoolRow; tab: ConfigTab }) {
  const { data, error, reload } = useLoad(() => adminFetch<{ config: Config }>(`/schools/${school.id}/config`), [school.id]);
  const act = useAction(reload);
  const [c, setC] = useState<Config | null>(null);
  const [saved, setSaved] = useState(false);
  const reset = () => { if (data) { setC(structuredClone(data.config)); setSaved(false); } };
  useEffect(reset, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!c) return;
    setSaved(false);
    if (await act.run(() => adminFetch(`/schools/${school.id}/config/${tab}`, json("PUT", { ...c[tab], ...(tab === "academic" ? { current_year: c.academic.current_year || years("")[1] } : {}) })))) setSaved(true);
  };
  const common = { onSubmit: save, onDiscard: reset, busy: act.busy, saved, error: error || act.error, disabled: !c };
  if (!c) return <p className="py-10 text-center text-sm text-slate-400">Loading…</p>;

  const ac = c.academic;
  const re = c.regional;
  const la = c.language;
  const setA = (patch: Partial<Config["academic"]>) => { setC({ ...c, academic: { ...ac, ...patch } }); setSaved(false); };
  const setR = (patch: Partial<Config["regional"]>) => { setC({ ...c, regional: { ...re, ...patch } }); setSaved(false); };
  const setL = (patch: Partial<Config["language"]>) => { setC({ ...c, language: { ...la, ...patch } }); setSaved(false); };
  const sel = (value: string | number, onChange: (v: string) => void, options: (string | [string | number, string])[]) => (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (typeof o === "string" ? <option key={o}>{o}</option> : <option key={o[0]} value={o[0]}>{o[1]}</option>))}
    </select>
  );

  if (tab === "academic") {
    const rule = ["Once a day", "Twice a day", "Per period"];
    return (
      <FormCard title="Academic settings" saveLabel="Save academic settings" {...common}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Labelled label="Current academic year">{sel(ac.current_year || years("")[1], (v) => setA({ current_year: v }), years(ac.current_year))}</Labelled>
          <Labelled label="Year starts in">{sel(ac.year_start_month, (v) => setA({ year_start_month: Number(v) }), MONTHS.map((m, i) => [i + 1, m]))}</Labelled>
          <Labelled label="Terms">{sel(ac.terms, (v) => setA({ terms: Number(v) }), [1, 2, 3, 4].map((n) => [n, `${n} term${n === 1 ? "" : "s"}`]))}</Labelled>
          <Labelled label="Grading scale">{sel(ac.grading, (v) => setA({ grading: v }), withCurrent(GRADING, ac.grading))}</Labelled>
          <Labelled label="Pass mark" hint="Percent, per subject"><input type="number" min={0} max={100} className={inputCls} value={ac.pass_mark} onChange={(e) => setA({ pass_mark: Number(e.target.value) })} /></Labelled>
          <Labelled label="Working days">{sel(ac.working_days, (v) => setA({ working_days: v }), ["Monday - Friday", "Monday - Saturday", "Monday - Sunday"])}</Labelled>
          <Labelled label="Attendance">{sel(ac.attendance_rule === "Daily" ? "Once a day" : ac.attendance_rule, (v) => setA({ attendance_rule: v }), rule)}</Labelled>
          <Labelled label="Minimum attendance" hint="Percent needed to sit final exams"><input type="number" min={0} max={100} className={inputCls} value={ac.min_attendance_percent} onChange={(e) => setA({ min_attendance_percent: Number(e.target.value) })} /></Labelled>
        </div>
        <ToggleRow label="Promote students automatically at year end" hint="Students who pass move to the next class; others are held for review" checked={ac.promote_auto} onChange={(v) => setA({ promote_auto: v })} />
        <ToggleRow label="Lock marks after the result date" hint="Teachers need the principal's approval to change marks" checked={ac.lock_marks} onChange={(v) => setA({ lock_marks: v })} />
      </FormCard>
    );
  }

  if (tab === "regional") {
    return (
      <FormCard title="Regional settings" saveLabel="Save regional settings" {...common}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Labelled label="Country">{sel(re.country, (v) => setR({ country: v }), withCurrent(COUNTRIES, re.country))}</Labelled>
          <Labelled label="State">{sel(re.state, (v) => setR({ state: v }), ["", ...withCurrent(STATES, re.state)].map((s) => [s, s || "—"] as [string, string]))}</Labelled>
          <Labelled label="Time zone">{sel(re.timezone, (v) => setR({ timezone: v }), ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"])}</Labelled>
          <Labelled label="Currency">{sel(re.currency, (v) => setR({ currency: v }), [["INR", "Indian rupee (₹)"], ["USD", "US dollar ($)"], ["AED", "UAE dirham"], ["GBP", "Pound (£)"], ["SGD", "Singapore dollar"]])}</Labelled>
          <Labelled label="Number format">{sel(re.number_format, (v) => setR({ number_format: v }), ["1,00,000 (Indian)", "100,000 (International)"])}</Labelled>
          <Labelled label="Date format">{sel(re.date_format, (v) => setR({ date_format: v }), ["DD/MM/YYYY", "DD MMM YYYY", "MM/DD/YYYY", "YYYY-MM-DD"])}</Labelled>
          <Labelled label="Week starts on">{sel(re.week_start, (v) => setR({ week_start: v }), ["Monday", "Sunday"])}</Labelled>
        </div>
      </FormCard>
    );
  }

  const enabled = new Set(la.enabled);
  const toggleLang = (l: string, on: boolean) => {
    const next = on ? [...la.enabled, l] : la.enabled.filter((x) => x !== l);
    const pick = (v: string) => (next.includes(v) ? v : "English");
    setL({ enabled: next, default: pick(la.default), report_card: pick(la.report_card), comms: pick(la.comms) });
  };
  return (
    <FormCard title="Language" saveLabel="Save language" {...common}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Labelled label="Default language">{sel(la.default, (v) => setL({ default: v }), la.enabled)}</Labelled>
        <Labelled label="Report card language">{sel(la.report_card, (v) => setL({ report_card: v }), la.enabled)}</Labelled>
        <Labelled label="SMS and WhatsApp language">{sel(la.comms, (v) => setL({ comms: v }), la.enabled)}</Labelled>
      </div>
      <ToggleRow label="Ask parents to choose at sign-in" hint="The parent portal sign-in page lists every language turned on below. Parents can switch by signing out." checked={la.parents_choose} onChange={(v) => setL({ parents_choose: v })} />
      {LANGUAGES.map((l) => (
        <ToggleRow key={l} label={l} hint={l === "English" ? "Always on" : "Offer in the parent and student apps"} checked={l === "English" || enabled.has(l)} disabled={l === "English"} onChange={(v) => toggleLang(l, v)} />
      ))}
    </FormCard>
  );
}
