"use client";

import Link from "next/link";
import { schoolFetch } from "@/lib/school-api";
import { useLoad } from "@/components/admin/ui";
import { STEP_LINKS } from "./menu-config";

export interface StepCount { n: number; label: string; count: number }

/** The 11 steps of an admission with how many families wait at each. The one you are on is outlined; every step opens its page. */
export function PipelineStrip({ active, steps }: { active?: number; steps?: StepCount[] }) {
  const own = useLoad(() => (steps ? Promise.resolve(null) : schoolFetch<{ steps: StepCount[] }>("/admissions/steps")), [steps]);
  const list = steps ?? own.data?.steps;
  return (
    <ol className="mb-5 flex gap-2.5 overflow-x-auto pb-2 [scrollbar-width:thin]" aria-label="Admission steps">
      {STEP_LINKS.map((s, i) => {
        const on = i + 1 === active;
        return (
          <li key={s.label} className="shrink-0">
            <Link href={s.href} aria-current={on ? "step" : undefined} className={`flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-[12px] hover:border-slate-400 ${on ? "border-[#0294CE] font-semibold text-slate-900 ring-1 ring-[#0294CE]/40" : "border-slate-200 text-slate-600"}`}>
              <span className={`grid size-5 place-items-center rounded-full text-[11px] font-bold ${on ? "bg-[#026f9b] text-white" : "bg-slate-100 text-slate-600"}`}>{i + 1}</span>
              {s.label}
              <span className="grid min-w-[20px] place-items-center rounded-full bg-[#dceff9] px-1.5 text-[11px] font-semibold leading-5 text-[#026f9b]">{list ? list[i]?.count ?? 0 : "·"}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
