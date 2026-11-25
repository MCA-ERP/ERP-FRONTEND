"use client";

import Link from "next/link";
import { STEPS } from "./menu-config";

/** The 8-step transport flow: the current module's step is marked. */
export function StepStrip({ active }: { active?: string }) {
  return (
    <nav aria-label="Transport steps" data-noprint="" className="mb-4 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {STEPS.map((s, i) => {
        const on = s.module === active;
        return (
          <Link key={s.module} href={s.href} aria-current={on ? "step" : undefined} className={`flex flex-1 items-center gap-2 whitespace-nowrap rounded-full border px-1.5 py-1 pr-3 text-[12px] ${on ? "border-[#0294CE] bg-[#f3f9fd] font-semibold text-slate-900" : "border-slate-200 bg-white text-slate-600 hover:border-[#41afda]"}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${on ? "bg-[#026f9b] text-white" : "bg-slate-100 text-slate-700"}`}>{i + 1}</span>{s.label}
          </Link>
        );
      })}
    </nav>
  );
}
