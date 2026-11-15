"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { adminFetch, type Paged, type SchoolRow } from "@/lib/admin-api";
import { ErrorBanner, inputCls, useLoad } from "@/components/admin/ui";

/** Pages that work on one school at a time: pick the school first, then show its page. */
export function WithSchool({ children }: { children: (schoolId: string) => ReactNode }) {
  const schools = useLoad(() => adminFetch<Paged<SchoolRow>>("/schools?pageSize=100"), []);
  const [id, setId] = useState("");
  const list = schools.data?.items ?? [];
  const chosen = id || list[0]?.id || "";
  return (
    <>
      <ErrorBanner message={schools.error} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label htmlFor="pick-school" className="text-sm font-medium text-slate-700">School</label>
        <select id="pick-school" className={`${inputCls} max-w-sm`} value={chosen} onChange={(e) => setId(e.target.value)}>
          {list.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {chosen ? <div key={chosen}>{children(chosen)}</div> : <p className="py-8 text-center text-sm text-slate-400">{schools.loading ? "Loading…" : "No schools yet."}</p>}
    </>
  );
}
