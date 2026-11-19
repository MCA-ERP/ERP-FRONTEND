"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { Toggle } from "@/components/admin/toggle";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, FormCard, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";

interface Year { id: string; name: string; start_date: string; end_date: string; working_days: number | null; students: number; status: "Draft" | "Active" | "Closed" }
const AY = "/school/academic-years";
const primaryCls = "rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const quietCls = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400 disabled:opacity-50";
const Foot = ({ close, left }: { close: () => void; left?: ReactNode }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex gap-1.5">{left}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const tone = (s: string): "good" | "mute" => (s === "Active" ? "good" : "mute");
const useYears = () => useLoad(() => schoolFetch<{ items: Year[] }>(AY), []);

export type YearTab = "create-year" | "edit-year" | "activate-year" | "close-year";

export function AcademicYearPages({ tab }: { tab: YearTab }) {
  const years = useYears();
  const act = useAction(() => years.reload());
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Year | null>(null);
  const [pick, setPick] = useState("");
  const blank = { name: "", start_date: new Date().toISOString().slice(0, 10), end_date: "", working_days: "" };
  const [f, setF] = useState<Record<string, string>>(blank);
  const [status, setStatus] = useState("");
  const [saved, setSaved] = useState("");
  const all = years.data?.items ?? [];
  const cur = all.find((y) => y.id === (pick || all[0]?.id));
  const n = (s: string) => all.filter((y) => y.status === s).length;
  const body = (g: Record<string, string>) => ({ name: g.name, start_date: g.start_date, end_date: g.end_date, working_days: g.working_days ? Number(g.working_days) : null });
  const lock = cur?.status === "Closed";
  const v = (k: keyof Omit<Year, "id" | "students" | "status">) => f[k] ?? String(cur?.[k] ?? "");
  const submitCreate = async (e: FormEvent) => { e.preventDefault(); setSaved(""); if (await act.run(() => schoolFetch(AY, json("POST", body(f))))) { setSaved(`${f.name} created. It is in Activate Year, ready to switch on.`); setF(blank); } };
  const submitEdit = async (e: FormEvent) => {
    e.preventDefault(); if (!cur) return; setSaved("");
    const ok = await act.run(async () => {
      await schoolFetch(`${AY}/${cur.id}`, json("PUT", body({ name: v("name"), start_date: v("start_date"), end_date: v("end_date"), working_days: v("working_days") })));
      const to = status || cur.status;
      if (to === "Active" && cur.status !== "Active") await schoolFetch(`${AY}/${cur.id}/activate`, json("POST", {}));
      if (to === "Closed" && cur.status !== "Closed") await schoolFetch(`${AY}/${cur.id}/close`, json("POST", {}));
    });
    if (ok) { setF({}); setStatus(""); setSaved("Saved"); }
  };
  const go = (y: Year, path: "activate" | "close") => act.run(() => schoolFetch(`${AY}/${y.id}/${path}`, json("POST", {})));
  const err = <ErrorBanner message={years.error || act.error} />;
  const ok = saved && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{saved}</p>;

  if (tab === "create-year") {
    return (
      <div>{err}{ok}
        <FormCard title="Create Year" cols="lg:grid-cols-4" onSubmit={submitCreate} onDiscard={() => { setF(blank); setSaved(""); }} busy={act.busy} error="">
          <Field label="Academic year"><input className={inputCls} required minLength={4} maxLength={50} placeholder="2027-28" value={f.name ?? ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Starts"><input type="date" className={inputCls} required value={f.start_date ?? ""} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
          <Field label="Ends"><input type="date" className={inputCls} required value={f.end_date ?? ""} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
          <Field label="Working days"><input type="number" min={1} max={366} className={inputCls} value={f.working_days ?? ""} onChange={(e) => setF({ ...f, working_days: e.target.value })} /></Field>
        </FormCard>
      </div>
    );
  }
  if (tab === "edit-year") {
    return (
      <div>{err}{ok}
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
          <label className="inline-flex items-center gap-2 rounded-full border border-[#c0e4f3] bg-[#f3f9fd] py-0.5 pl-3.5 pr-2 text-[13px] text-[#026f9b]">Choose
            <select aria-label="Academic year" value={cur?.id ?? ""} onChange={(e) => { setPick(e.target.value); setF({}); setStatus(""); setSaved(""); }} className="cursor-pointer bg-transparent py-1.5 font-semibold text-slate-900 outline-none">{!all.length && <option value="">No years</option>}{all.map((y) => <option key={y.id} value={y.id}>{y.name} · {y.start_date}</option>)}</select>
          </label>
        </div>
        {cur && <FormCard title={`Edit ${cur.name}`} cols="lg:grid-cols-4" onSubmit={submitEdit} onDiscard={() => { setF({}); setStatus(""); setSaved(""); }} busy={act.busy || lock} error="">
          <Field label="Academic year"><input className={inputCls} required minLength={4} maxLength={50} disabled={lock} value={v("name")} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Starts"><input type="date" className={inputCls} required disabled={lock} value={v("start_date")} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field>
          <Field label="Ends"><input type="date" className={inputCls} required disabled={lock} value={v("end_date")} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></Field>
          <Field label="Working days"><input type="number" min={1} max={366} className={inputCls} disabled={lock} value={v("working_days")} onChange={(e) => setF({ ...f, working_days: e.target.value })} /></Field>
          <Field label="Status"><select className={inputCls} disabled={lock} value={status || cur.status} onChange={(e) => setStatus(e.target.value)}><option disabled={cur.status !== "Draft"}>Draft</option><option>Active</option><option disabled={cur.status === "Draft"}>Closed</option></select></Field>
          {lock && <p className="text-xs text-slate-500 sm:col-span-2 lg:col-span-4">A closed year can&apos;t be edited.</p>}
        </FormCard>}
      </div>
    );
  }
  const rows = all.filter((y) => has(y, search));
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={[{ label: "Academic years", value: all.length, sub: "All records" }, { label: "Closed", value: n("Closed"), sub: pct(n("Closed"), all.length) }, { label: "Draft", value: n("Draft"), sub: pct(n("Draft"), all.length) }, { label: "Active", value: n("Active"), sub: pct(n("Active"), all.length) }]} />
      <ListPanel title="Academic years" noun="years" search={search} onSearch={setSearch} exportName={tab} head={["Academic year", "Starts", "Ends", "Working days", "Students", "Status"]} exportRows={rows.map((y) => [y.name, day(y.start_date), day(y.end_date), y.working_days, y.students, y.status])}
        tableHead={["Academic year", "Starts", "Ends", "Working days", "Students", "Status", ""]} empty={years.loading ? "Loading…" : "No academic years yet."}
        rows={rows.map((y) => [<b key="n" className="font-semibold text-slate-900">{y.name}</b>, day(y.start_date), day(y.end_date), y.working_days ?? "—", y.students ? y.students.toLocaleString("en-IN") : "—", <Chip key="s" tone={tone(y.status)}>{y.status}</Chip>,
          <span key="a" className="flex gap-1.5">{y.status === "Draft" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void go(y, "activate")}>Activate</button>}{y.status === "Active" && <button type="button" className={quietCls} disabled={act.busy} onClick={() => void go(y, "close")}>Close year</button>}<button type="button" className={small} onClick={() => setView(y)}>View details</button></span>])} />
      <Modal open={!!view} title={view?.name ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Starts" v={day(view.start_date)} /><Row k="Ends" v={day(view.end_date)} /><Row k="Working days" v={view.working_days ?? "—"} /><Row k="Students" v={view.students || "—"} /><Row k="Status" v={view.status} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}

// ═════════════ school board ═════════════
interface Board { board: string; in_use: boolean; loc_reminders: boolean; classes: string; affiliation_no: string; grading: string; exams: string }
export type BoardTab = "cbse" | "icse" | "state-board" | "other-board";
const NAME: Record<BoardTab, string> = { cbse: "CBSE", icse: "ICSE", "state-board": "State Board", "other-board": "Other Board" };
const KV = ({ k, v }: { k: string; v: string }) => <div className="grid grid-cols-[8rem_1fr] gap-3 py-1.5 text-[13px]"><dt className="text-slate-500">{k}</dt><dd className="text-slate-800">{v}</dd></div>;

export function SchoolBoardPages({ tab }: { tab: BoardTab }) {
  const name = NAME[tab];
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Board[] }>("/school/boards"), []);
  const act = useAction(reload);
  const b = data?.items.find((x) => x.board === name);
  const [use, setUse] = useState<boolean | null>(null);
  const [loc, setLoc] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const inUse = use ?? b?.in_use ?? false;
  const reminders = inUse && (loc ?? b?.loc_reminders ?? false);
  const save = async () => { setSaved(false); if (await act.run(() => schoolFetch("/school/boards", json("PUT", { board: name, in_use: inUse, loc_reminders: reminders })))) { setUse(null); setLoc(null); setSaved(true); } };
  return (
    <div>
      <ErrorBanner message={error || act.error} />
      {saved && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Saved</p>}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title={name}>
          <dl className="px-5 py-3">
            <KV k="In use" v={b?.in_use ? `Yes${b.classes ? ` · ${b.classes}` : ""}` : loading ? "…" : "No"} />
            <KV k="Affiliation no." v={b?.affiliation_no || "—"} />
            <KV k="Grading" v={b?.grading ?? "—"} />
            <KV k="Exams" v={b?.in_use ? b.exams : "—"} />
          </dl>
        </Panel>
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-semibold text-slate-900">Settings</h2></div>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5"><span className="text-[13px] text-slate-900">Use {name} for this school</span><Toggle checked={inUse} onChange={(x) => { setUse(x); setSaved(false); }} label={`Use ${name} for this school`} /></div>
          <div className="flex items-center justify-between px-5 py-3.5"><span className="text-[13px] text-slate-900">Board registration (LOC) reminders</span><Toggle checked={reminders} disabled={!inUse} onChange={(x) => { setLoc(x); setSaved(false); }} label="Board registration (LOC) reminders" /></div>
          <div className="flex justify-end gap-2.5 border-t border-slate-100 px-5 py-3"><button type="button" className={`${btnGhost} !px-4 !py-1.5 text-[13px]`} onClick={() => { setUse(null); setLoc(null); setSaved(false); }}>Discard</button><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} disabled={act.busy} onClick={() => void save()}>{act.busy ? "Saving…" : "Save"}</button></div>
        </div>
      </div>
    </div>
  );
}
