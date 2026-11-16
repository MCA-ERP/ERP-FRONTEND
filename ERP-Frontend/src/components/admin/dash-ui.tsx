"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** The small "View details" button at the end of a row. */
export function ViewButton({ href, label = "View details" }: { href: string; label?: string }) {
  return <Link href={href} className="inline-block whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:border-slate-400">{label}</Link>;
}

/** A small outlined label, like a board name. */
export function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-block rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-600">{children}</span>;
}

/** "12 days" chip: amber when close, blue when further away. */
export function DaysChip({ days }: { days: number }) {
  const cls = days <= 15 ? "bg-[#f8ecd6] text-[#8a5a0b]" : "bg-[#dceff9] text-[#026f9b]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{days} days</span>;
}

/** The tiles under the page actions. Fits any number of tiles on one row where there is room. */
export function Tiles({ items }: { items: { label: string; value: ReactNode; sub?: ReactNode }[] }) {
  const bg = ["bg-[#dceff9]", "bg-[#d9efe8]", "bg-[#fce0df]", "bg-[#c0e4f3]", "bg-[#dceff9]"];
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
      {items.map((s, i) => (
        <div key={s.label} className={`rounded-2xl px-4 py-3.5 ${bg[i % bg.length]}`}>
          <p className="text-xs text-slate-700">{s.label}</p>
          <p className="mt-0.5 text-[26px] font-bold leading-tight tabular-nums text-slate-900">{s.value}</p>
          {s.sub && <p className="mt-0.5 text-xs text-slate-700">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export interface Column { label: string; value: number; partial?: boolean; note?: string }

/** Bars with a scale on the left, like the collections chart. A "partial" bar (the month so far) is drawn lighter. */
export function ColumnChart({ data, format, title }: { data: Column[]; format: (n: number) => string; title: string }) {
  const W = 640, H = 250, left = 46, right = 8, top = 10, bottom = 28;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = niceStep(max / 4);
  const top4 = Math.ceil(max / step) * step || step;
  const ticks = Array.from({ length: Math.round(top4 / step) + 1 }, (_, i) => i * step);
  const slot = (W - left - right) / Math.max(1, data.length);
  const y = (v: number) => top + (1 - v / top4) * (H - top - bottom);
  return (
    <figure className="m-0 px-3 pb-2 pt-3">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${format(d.value)}`).join(", ")}`} className="h-auto w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="#e1e5ea" strokeWidth="1" />
            <text x={left - 6} y={y(t) + 3.5} textAnchor="end" fontSize="11" fill="#4b5563">{format(t).replace("₹", "")}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <g key={d.label + i}>
            <rect x={left + slot * i + slot * 0.14} y={y(d.value)} width={slot * 0.72} height={Math.max(0, y(0) - y(d.value))} rx="3" fill={d.partial ? "#b9e0f2" : "#7ec8e8"}>
              <title>{`${d.label}: ${format(d.value)}${d.note ? " (" + d.note + ")" : ""}`}</title>
            </rect>
            <text x={left + slot * i + slot / 2} y={H - 9} textAnchor="middle" fontSize="11" fill="#4b5563">{d.label}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

const SEG = ["#b9e0f2", "#41afda", "#0294ce", "#0a7f5b", "#7c5cbf", "#e3a54a"];

/** One bar split into parts, with a legend underneath. */
export function StackedBar({ parts, noun = "" }: { parts: { label: string; value: number }[]; noun?: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <div className="px-4 pt-4">
      <div role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")} className="flex h-3 gap-0.5 overflow-hidden rounded-md bg-slate-100">
        {total > 0 && parts.filter((p) => p.value > 0).map((p) => <div key={p.label} title={`${p.label}: ${p.value}${noun}`} style={{ width: `${(p.value / total) * 100}%`, background: SEG[parts.indexOf(p) % SEG.length] }} />)}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {parts.map((p, i) => <li key={p.label} className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SEG[i % SEG.length] }} aria-hidden="true" />{p.label} {p.value}{noun}</li>)}
      </ul>
    </div>
  );
}

/** Horizontal bars with the number at the right end, like "By board". */
export function CountBars({ rows, format = (n: number) => n.toLocaleString("en-IN") }: { rows: [string, number][]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  if (!rows.length) return <p className="p-6 text-center text-sm text-slate-400">Nothing to show yet.</p>;
  return (
    <ul className="space-y-1.5 px-5 py-4">
      {rows.map(([label, v]) => (
        <li key={label} className="grid grid-cols-[minmax(5rem,9rem)_1fr_4.5rem] items-center gap-3 text-[13px]">
          <span className="truncate text-slate-800">{label}</span>
          <span className="h-2 overflow-hidden rounded-full border border-[#c0e4f3] bg-[#f3f9fd]"><span className="block h-full rounded-full bg-[#41afda]" style={{ width: `${(v / max) * 100}%` }} /></span>
          <span className="text-right tabular-nums text-slate-800">{format(v)}</span>
        </li>
      ))}
    </ul>
  );
}

/** A status chip: a coloured dot and a word. */
export function Chip({ tone, children }: { tone: "good" | "warn" | "bad" | "info" | "mute"; children: ReactNode }) {
  const cls = { good: "bg-[#d9efe8] text-[#065740]", warn: "bg-[#f8ecd6] text-[#8a5a0b]", bad: "bg-[#fce0df] text-[#ac2c28]", info: "bg-[#dceff9] text-[#026f9b]", mute: "border border-slate-200 bg-slate-50 text-slate-600" }[tone];
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{children}</span>;
}

/** "▲ 11%" in green or "▼" in red, from a change. `lowerIsBetter` flips the colours. */
export function Change({ text, up, good }: { text: string; up: boolean | null; good: boolean | null }) {
  if (up === null) return <span className="text-slate-400">—</span>;
  return <span className={`font-medium ${good ? "text-[#065740]" : "text-[#ac2c28]"}`}>{up ? "▲" : "▼"} {text}</span>;
}
