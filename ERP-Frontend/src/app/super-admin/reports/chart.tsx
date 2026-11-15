"use client";

import { inr2, lakh, num } from "@/components/admin/dash";

export interface ChartData {
  kind: "bar" | "line" | "stacked";
  unit: "int" | "money" | "percent" | "ms";
  labels: string[];
  series: { label: string; values: number[] }[];
}

const COLORS = ["#0294ce", "#0a7f5b", "#e53a35", "#b7791f", "#026f9b", "#7c5cbf"];

const fmt = (unit: ChartData["unit"], v: number, short = false) =>
  unit === "money" ? (short ? lakh(v) : inr2(v)) : unit === "percent" ? `${v}%` : unit === "ms" ? `${num(v)} ms` : num(v);

/** A small SVG chart. The table under every report carries the same numbers, so the picture is a summary, not the only source. */
export function Chart({ chart, title }: { chart: ChartData; title: string }) {
  const { kind, unit, labels, series } = chart;
  if (!labels.length || !series.length) return null;
  const W = 640, H = 220, left = 52, right = 12, top = 12, bottom = 30;
  const n = labels.length;
  const totals = labels.map((_, i) => (kind === "stacked" ? series.reduce((a, s) => a + (s.values[i] ?? 0), 0) : Math.max(...series.map((s) => s.values[i] ?? 0))));
  const max = Math.max(1, ...totals);
  const plotW = W - left - right;
  const y = (v: number) => top + ((max - v) / max) * (H - top - bottom);
  const slot = plotW / n;
  const every = Math.max(1, Math.ceil(n / 10));
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const empty = totals.every((t) => t === 0);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${series.map((s) => s.label).join(", ")} by ${n} ${n === 1 ? "point" : "points"}`} className="h-auto w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="#e1e5ea" />
            <text x={left - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#6b7280">{fmt(unit, t, true)}</text>
          </g>
        ))}
        {kind === "line" ? (
          series.map((s, si) => {
            const x = (i: number) => left + slot * i + slot / 2;
            const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
            return <polyline key={s.label} points={pts} fill="none" stroke={COLORS[si % COLORS.length]} strokeWidth="2" strokeLinejoin="round" />;
          })
        ) : (
          labels.map((_, i) => {
            const gx = left + slot * i + slot * 0.15;
            const bw = slot * 0.7;
            if (kind === "stacked") {
              let acc = 0;
              return series.map((s, si) => {
                const v = Math.max(0, s.values[i] ?? 0);
                const r = <rect key={`${i}-${si}`} x={gx} y={y(acc + v)} width={bw} height={Math.max(0, y(acc) - y(acc + v))} fill={COLORS[si % COLORS.length]}><title>{`${labels[i]} · ${s.label}: ${fmt(unit, v)}`}</title></rect>;
                acc += v;
                return r;
              });
            }
            const w = bw / series.length;
            return series.map((s, si) => {
              const v = Math.max(0, s.values[i] ?? 0);
              return <rect key={`${i}-${si}`} x={gx + w * si} y={y(v)} width={Math.max(1, w - 1)} height={Math.max(0, y(0) - y(v))} rx="2" fill={COLORS[si % COLORS.length]}><title>{`${labels[i]} · ${s.label}: ${fmt(unit, v)}`}</title></rect>;
            });
          })
        )}
        {labels.map((l, i) => i % every === 0 && (
          <text key={i} x={left + slot * i + slot / 2} y={H - 10} textAnchor="middle" fontSize="10" fill="#6b7280">{l.length > 14 ? l.slice(0, 13) + "…" : l}</text>
        ))}
        {empty && <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="12" fill="#9ca3af">Nothing to show for this period</text>}
      </svg>
      {series.length > 1 && (
        <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          {series.map((s, i) => <span key={s.label} className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} aria-hidden="true" />{s.label}</span>)}
        </figcaption>
      )}
    </figure>
  );
}
