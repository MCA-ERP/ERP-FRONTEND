"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable } from "@/components/admin/dash";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, useLoad } from "@/components/admin/ui";
import { Head, whiteBtn } from "./head";
import { Loading, day } from "./dash-pages";

interface Ev { id: string; title: string; event_date: string; end_date: string | null; kind: string; audience: string; note: string | null }
const KINDS = ["Holiday", "Exam", "PTM", "Event", "Sports", "Fee due", "Staff"] as const;
const CHIP: Record<string, string> = { Holiday: "bg-[#fce0df] text-[#ac2c28]", Exam: "bg-[#f8ecd6] text-[#8a5a0b]", PTM: "bg-[#dceff9] text-[#026f9b]", Event: "bg-[#d9efe8] text-[#065740]", Sports: "bg-[#d9efe8] text-[#065740]", "Fee due": "bg-[#ece6f8] text-[#5b3fa0]", Staff: "bg-slate-100 text-slate-700" };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Downloads the dates as a calendar file that opens in the phone's calendar app. */
export function downloadIcs(items: (Pick<Ev, "id" | "title" | "event_date" | "end_date" | "kind" | "note">)[]) {
  const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const compact = (s: string) => s.replace(/-/g, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//My Class Assist//School Calendar//EN"];
  for (const e of items) {
    const end = iso(addDays(new Date(`${e.end_date ?? e.event_date}T00:00:00`), 1));
    lines.push("BEGIN:VEVENT", `UID:${e.id}@myclassassist`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`, `DTSTART;VALUE=DATE:${compact(e.event_date)}`, `DTEND;VALUE=DATE:${compact(end)}`, `SUMMARY:${esc(e.title)}`, `CATEGORIES:${esc(e.kind)}`, ...(e.note ? [`DESCRIPTION:${esc(e.note)}`] : []), "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" }));
  a.download = "school-calendar.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}

const Add = ({ items }: { items: Ev[] }) => <button type="button" disabled={!items.length} className={whiteBtn} onClick={() => downloadIcs(items)}>Add all to my phone calendar</button>;

export function MonthView({ subtitle = "Holidays, exams, PTMs, events, fee due dates and staff dates in one place. The School Admin keeps it up to date." }: { subtitle?: string } = {}) {
  const [cursor, setCursor] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(KINDS.map((k) => [k, true])));
  const gridFrom = addDays(cursor, -((cursor.getDay() + 6) % 7));
  const gridTo = addDays(gridFrom, 41);
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: Ev[] }>(`/teacher/calendar?from=${iso(gridFrom)}&to=${iso(gridTo)}`), [iso(gridFrom)]);
  const today = iso(new Date());
  const items = (data?.items ?? []).filter((e) => on[e.kind] !== false);
  const cells = useMemo(() => {
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const weeks = Math.ceil((((cursor.getDay() + 6) % 7) + last.getDate()) / 7);
    return Array.from({ length: weeks * 7 }, (_, i) => addDays(gridFrom, i));
  }, [cursor]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div data-report>
      <Head title="Month View" subtitle={subtitle} action={<Add items={data?.items ?? []} />} />
      <ErrorBanner message={error} />
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" aria-label="Previous month" className="grid size-7 place-items-center rounded-full border border-slate-200 hover:border-slate-400" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="size-4" aria-hidden="true" /></button>
          <h2 className="min-w-[9rem] text-center text-[15px] font-semibold text-slate-900">{cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</h2>
          <button type="button" aria-label="Next month" className="grid size-7 place-items-center rounded-full border border-slate-200 hover:border-slate-400" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="size-4" aria-hidden="true" /></button>
          <button type="button" className="rounded-full border border-slate-200 px-3 py-1 text-[12px] font-semibold text-slate-900 hover:border-slate-400" onClick={() => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); }}>Today</button>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {KINDS.map((k) => <label key={k} className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium ${CHIP[k]}`}><input type="checkbox" checked={on[k]} onChange={(e) => setOn({ ...on, [k]: e.target.checked })} className="size-3.5 accent-[#026f9b]" />{k}</label>)}
          </div>
        </div>
        <Loading on={loading && !data} />
        <div className="grid grid-cols-7 gap-1.5 text-[11px] text-slate-500">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="px-1">{d}</div>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {cells.map((d) => {
            const k = iso(d);
            const here = items.filter((e) => e.event_date <= k && (e.end_date ?? e.event_date) >= k);
            const inMonth = d.getMonth() === cursor.getMonth();
            return (
              <div key={k} className={`min-h-[4.5rem] rounded-lg border p-1.5 text-[11px] ${k === today ? "border-[#0294CE] ring-1 ring-[#0294CE]" : "border-slate-200"} ${inMonth ? "bg-white" : "bg-slate-50 text-slate-400"}`}>
                <p className={`font-semibold ${inMonth ? "text-slate-900" : ""}`}>{d.getDate()}</p>
                {here.slice(0, 2).map((e) => <p key={e.id} title={`${e.title}${e.note ? ` — ${e.note}` : ""}`} className={`mt-0.5 truncate rounded px-1 py-0.5 ${CHIP[e.kind] ?? CHIP.Staff}`}>{e.title}</p>)}
                {here.length > 2 && <p className="mt-0.5 text-slate-500">+{here.length - 2} more</p>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function ComingUp() {
  const from = new Date();
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: Ev[] }>(`/teacher/calendar?from=${iso(from)}&to=${iso(addDays(from, 180))}`), []);
  const [q, setQ] = useState("");
  const items = useMemo(() => (data?.items ?? []).filter((e) => !q || `${e.title} ${e.kind} ${e.audience} ${e.note ?? ""}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  const span = (e: Ev) => (e.end_date && e.end_date !== e.event_date ? `${day(e.event_date)} – ${day(e.end_date)}` : day(e.event_date));
  return (
    <div data-report>
      <Head title="Coming Up" subtitle="The next dates to plan for." action={<Add items={data?.items ?? []} />} />
      <ErrorBanner message={error} />
      <Loading on={loading && !data} />
      {data && (
        <Panel title="Coming up" sub={`${data.items.length} dates`} right={<ExportPrint name="school-calendar" head={["Date", "What", "Type", "For"]} rows={items.map((e) => [span(e), e.title, e.kind, e.audience])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><label className="flex w-72 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px]"><Search className="size-4 text-slate-400" aria-hidden="true" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search coming up" aria-label="Search coming up" className="w-full bg-transparent outline-none" /></label></div>
          <SimpleTable head={[{ h: "Date" }, { h: "What" }, { h: "Type" }, { h: "For" }]} empty="Nothing is coming up." rows={items.map((e) => [span(e), <div key="w"><p className="font-semibold text-slate-900">{e.title}</p>{e.note && <p className="text-[11px] text-slate-500">{e.note}</p>}</div>, <span key="t" className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${CHIP[e.kind] ?? CHIP.Staff}`}>{e.kind}</span>, e.audience])} />
        </Panel>
      )}
    </div>
  );
}
