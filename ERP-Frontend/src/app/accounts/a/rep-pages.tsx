"use client";

import { schoolFetch } from "@/lib/school-api";
import { ErrorBanner, useLoad } from "@/components/admin/ui";
import { ListPanel } from "../../school/s/fo-pages";
import { inr } from "../../school/s/fee-pages";
import { Head } from "../../teacher/t/head";
import { useState } from "react";

const bold = (s: string) => <b key={s}>{s}</b>;
const yearOf = (ys: string) => `${ys.slice(0, 4)}–${String((Number(ys.slice(0, 4)) + 1) % 100).padStart(2, "0")}`;

export function ClassWise() {
  const r = useLoad(() => schoolFetch<{ as_on: string; year_start: string; students: number; items: { name: string; demand: number; collected: number; outstanding: number }[]; total: { demand: number; collected: number; outstanding: number } }>("/accounts/reports/class-wise"), []);
  const [q, setQ] = useState(""); const x = r.data;
  const rows = (x?.items ?? []).filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Head title="Class-wise" subtitle={`Demand, collection and outstanding by class group for ${x ? yearOf(x.year_start) : ""}, whole school.`} />
      <ErrorBanner message={r.error} />
      <ListPanel title="Class-wise collection" noun="class groups" search={q} onSearch={setQ} exportName="class-wise-collection" head={["Classes", "Demand to date", "Collected", "Outstanding"]}
        exportRows={[...rows.map((m) => [m.name, m.demand, m.collected, m.outstanding]), ...(x ? [["Total", x.total.demand, x.total.collected, x.total.outstanding]] : [])]} tableHead={["Classes", "Demand to date", "Collected", "Outstanding"]}
        rows={[...rows.map((m) => [bold(m.name), inr(m.demand), inr(m.collected), inr(m.outstanding)]), ...(x && rows.length ? [[bold("Total"), bold(inr(x.total.demand)), bold(inr(x.total.collected)), bold(inr(x.total.outstanding))]] : [])]} empty="No dues have fallen due yet." />
    </div>
  );
}

export function CategoryWise() {
  const r = useLoad(() => schoolFetch<{ year_start: string; total: number; items: { name: string; collected: number; share: number }[] }>("/accounts/reports/category-wise"), []);
  const [q, setQ] = useState(""); const x = r.data;
  const rows = (x?.items ?? []).filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <Head title="Category-wise" subtitle={`Fees collected by fee category for ${x ? yearOf(x.year_start) : ""}, whole school.`} />
      <ErrorBanner message={r.error} />
      <ListPanel title="Category-wise collection" noun="categories" search={q} onSearch={setQ} exportName="category-wise-collection" head={["Category", "Collected", "Share"]}
        exportRows={rows.map((m) => [m.name, m.collected, `${m.share}%`])} tableHead={["Category", "Collected", "Share"]}
        rows={rows.map((m) => [bold(m.name), inr(m.collected), `${m.share}%`])} empty="No fees collected yet." />
    </div>
  );
}
