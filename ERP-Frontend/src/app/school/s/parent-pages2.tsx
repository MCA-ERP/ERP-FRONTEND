"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Field, ListPanel, has, pct } from "./fo-pages";
import { Row, day, small } from "./dash-pages";
import { useParents } from "./parent-pages";

const PM = "/school/parents-mgmt";
const primaryCls = "rounded-full bg-[#026f9b] px-3 py-1 text-xs font-semibold text-white hover:bg-[#014a67] disabled:opacity-50";
const quietCls = "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-[#ac2c28] hover:border-slate-400 disabled:opacity-50";
const Foot = ({ close, left }: { close: () => void; left?: ReactNode }) => <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="flex flex-wrap gap-1.5">{left}</span><button type="button" className={`${btnPrimary} !px-4 !py-1.5 text-[13px]`} onClick={close}>Close</button></div>;
const tone = (s: string): "good" | "warn" | "bad" | "info" | "mute" => (["Approved", "Resolved", "Booked", "Pass issued", "Read"].includes(s) ? "good" : ["Pending", "Open"].includes(s) ? "warn" : ["Rejected", "Declined"].includes(s) ? "bad" : ["Number verified", "Code sent", "Sent", "In progress"].includes(s) ? "info" : "mute");
const Who = ({ name, sub }: { name: string; sub?: string }) => <div><p className="font-semibold text-slate-900">{name}</p>{sub && <p className="text-xs text-slate-400">{sub}</p>}</div>;

interface Req { id: string; code: string; req_type: string; details: string; current_number: string; new_number: string; reason: string; raised_on: string; status: string; parent: string; student: string; student_id: string | null; class_label: string }
interface ReqData { items: Req[]; statuses: string[] }

function NewRequest({ open, close, kind, types, mobile, onSaved }: { open: boolean; close: () => void; kind: string; types?: string[]; mobile?: boolean; onSaved: () => void }) {
  const parents = useParents();
  const act = useAction(onSaved);
  const [f, setF] = useState({ guardian_id: "", student_id: "", req_type: "", details: "", new_number: "", reason: "" });
  const ps = parents.data?.items ?? [];
  const gid = f.guardian_id || ps[0]?.id || "";
  const chosen = ps.find((p) => p.id === gid);
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${PM}/requests`, json("POST", { kind, guardian_id: gid, student_id: f.student_id || chosen?.students[0]?.id || "", req_type: f.req_type || types?.[0] || "", details: f.details, new_number: f.new_number, reason: f.reason })))) { close(); setF({ guardian_id: "", student_id: "", req_type: "", details: "", new_number: "", reason: "" }); } };
  return (
    <Modal open={open} title="New request" onClose={close}>
      <form onSubmit={save} className="space-y-3">
        <ErrorBanner message={act.error} />
        <Field label="Parent"><select className={inputCls} required value={gid} onChange={(e) => setF({ ...f, guardian_id: e.target.value, student_id: "" })}>{ps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        {!mobile && <Field label="Student"><select className={inputCls} value={f.student_id || chosen?.students[0]?.id || ""} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{(chosen?.students ?? []).map((k) => <option key={k.id} value={k.id}>{k.name} · {k.class_label}</option>)}</select></Field>}
        {types && <Field label="Type"><select className={inputCls} value={f.req_type || types[0]} onChange={(e) => setF({ ...f, req_type: e.target.value })}>{types.map((t) => <option key={t}>{t}</option>)}</select></Field>}
        {mobile ? <>
          <Field label="New number"><input className={inputCls} required inputMode="tel" placeholder="+91" maxLength={30} value={f.new_number} onChange={(e) => setF({ ...f, new_number: e.target.value })} /></Field>
          <Field label="Reason"><input className={inputCls} maxLength={200} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
        </> : <Field label="Details"><input className={inputCls} required minLength={2} maxLength={400} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={close}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
      </form>
    </Modal>
  );
}

// ═════════════ requests ═════════════
export type ReqTab = "leave-requests" | "profile-corrections" | "mobile-number-changes" | "other-requests" | "from-the-apps";
const RCFG: Record<string, { kind: string; label: string; order: string[] }> = {
  "leave-requests": { kind: "leave", label: "Leave request", order: ["Pending", "Rejected", "Approved"] },
  "profile-corrections": { kind: "correction", label: "Profile correction", order: ["Approved", "Pending"] },
  "other-requests": { kind: "other", label: "Other request", order: ["Pending", "Approved", "Rejected"] },
};
const APP_TYPES = ["Transport change", "Hostel application", "Counselling", "Medication consent", "Early pickup", "Question for the office"];
const APP_ACTION = (t: string): [string, string] => (t === "Counselling" ? ["Book", "Booked"] : t === "Early pickup" ? ["Issue pass", "Pass issued"] : ["Approve", "Approved"]);

export function ParentRequestPages({ tab }: { tab: ReqTab }) {
  const kind = tab === "mobile-number-changes" ? "mobile" : tab === "from-the-apps" ? "app" : RCFG[tab].kind;
  const { data, error, loading, reload } = useLoad(() => schoolFetch<ReqData>(`${PM}/requests/${kind}`), [kind]);
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [step, setStep] = useState(0);
  const [view, setView] = useState<Req | null>(null);
  const [adding, setAdding] = useState(false);
  const all = data?.items ?? [];
  const n = (s: string) => all.filter((r) => r.status === s).length;
  const set = async (r: Req, status: string) => { if (await act.run(() => schoolFetch(`${PM}/requests/${r.id}`, json("PATCH", { status })))) setView(null); };
  const open = (s: string) => ["Pending", "Code sent", "Number verified", "Sent"].includes(s);
  const addBtn = <button type="button" className={small} onClick={() => setAdding(true)}>+ New request</button>;
  const err = <ErrorBanner message={error || act.error} />;

  if (kind === "mobile") {
    const shown = all.filter((r) => step === 0 || (step === 1 ? ["Pending", "Code sent"].includes(r.status) : ["Number verified", "Approved"].includes(r.status)));
    const rows = shown.filter((r) => has(r, search));
    const steps = ["Parent requests", "Verify new number", "Approve & update"];
    return (
      <div className="space-y-5" data-report>{err}
        <div className="flex flex-wrap gap-2">{steps.map((s, i) => <button key={s} type="button" onClick={() => setStep(step === i + 1 ? 0 : i + 1)} className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] ${step === i + 1 ? "border-[#0294ce] bg-white text-slate-900" : "border-slate-200 bg-white text-slate-600"}`}><span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold ${step === i + 1 ? "bg-[#0294ce] text-white" : "bg-[#dceff9] text-[#026f9b]"}`}>{i + 1}</span>{s}</button>)}</div>
        <ListPanel title="Mobile number changes" noun="requests" search={search} onSearch={setSearch} exportName={tab} head={["Ref.", "Requested by", "Current number", "New number", "Reason", "Raised", "Status"]} exportRows={rows.map((r) => [r.code, r.parent, r.current_number, r.new_number, r.reason || r.details, day(r.raised_on), r.status])}
          extra={addBtn} tableHead={["Ref.", "Requested by", "Current number", "New number", "Reason", "Raised", "Status", ""]} empty={loading ? "Loading…" : "No mobile number requests."}
          rows={rows.map((r) => [r.code, <Who key="w" name={r.parent} sub={r.student} />, r.current_number, r.new_number, r.reason || r.details, day(r.raised_on), <Chip key="s" tone={tone(r.status)}>{r.status}</Chip>,
            <span key="a" className="flex flex-wrap gap-1.5">
              {r.status === "Pending" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(r, "Code sent")}>Send code to new number</button>}
              {r.status === "Code sent" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(r, "Number verified")}>Mark number verified</button>}
              {r.status === "Number verified" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(r, "Approved")}>Approve &amp; update</button>}
              {["Pending", "Code sent"].includes(r.status) && <button type="button" className={quietCls} disabled={act.busy} onClick={() => void set(r, "Rejected")}>Reject</button>}
              <button type="button" className={small} onClick={() => setView(r)}>View details</button></span>])} />
        <Detail r={view} close={() => setView(null)} />
        <NewRequest open={adding} close={() => setAdding(false)} kind="mobile" mobile onSaved={reload} />
      </div>
    );
  }
  if (kind === "app") {
    const rows = all.filter((r) => has(r, search));
    return (
      <div data-report>{err}
        <ListPanel title="All requests from the parent and student apps" noun="requests" search={search} onSearch={setSearch} exportName={tab} head={["Request", "Type", "Child", "Parent", "Details", "Sent", "Status"]} exportRows={rows.map((r) => [r.code, r.req_type, r.student, r.parent, r.details, day(r.raised_on), r.status])}
          extra={addBtn} tableHead={["Request", "Type", "Child", "Details", "Sent", "Status", ""]} empty={loading ? "Loading…" : "Nothing from the apps yet."}
          rows={rows.map((r) => { const [label, to] = APP_ACTION(r.req_type); return [r.code, r.req_type, <Who key="c" name={r.student ? `${r.student} · ${r.class_label.replace(/^Class /, "")}` : "—"} sub={r.parent} />, r.details, day(r.raised_on), <Chip key="s" tone={tone(r.status)}>{r.status}</Chip>,
            <span key="a" className="flex gap-1.5">{r.status === "Sent" && <><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(r, to)}>{label}</button><button type="button" className={small} disabled={act.busy} onClick={() => void set(r, "Declined")}>Decline</button></>}{r.status !== "Sent" && <button type="button" className={small} onClick={() => setView(r)}>View details</button>}</span>]; })} />
        <Detail r={view} close={() => setView(null)} />
        <NewRequest open={adding} close={() => setAdding(false)} kind="app" types={APP_TYPES} onSaved={reload} />
      </div>
    );
  }
  const cfg = RCFG[tab];
  const rows = all.filter((r) => has(r, search));
  const tiles = [{ label: "Parent requests", value: all.length, sub: "All records" }, ...cfg.order.map((s) => ({ label: s, value: n(s), sub: pct(n(s), all.length) }))];
  return (
    <div className="space-y-5" data-report>{err}
      <Tiles items={tiles} />
      <ListPanel title="Parent requests" noun="requests" search={search} onSearch={setSearch} exportName={tab} head={["Request no.", "Parent", "Student", "Type", "Details", "Raised", "Status"]} exportRows={rows.map((r) => [r.code, r.parent, r.student, cfg.label, r.details, day(r.raised_on), r.status])}
        extra={addBtn} tableHead={["Request no.", "Parent", "Student", "Type", "Details", "Raised", "Status", ""]} empty={loading ? "Loading…" : "No requests yet."}
        rows={rows.map((r) => [r.code, r.parent, <span key="s" className="font-semibold text-[#026f9b]">{r.student || "—"}</span>, cfg.label, r.details, day(r.raised_on), <Chip key="t" tone={tone(r.status)}>{r.status}</Chip>, <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      <Detail r={view} close={() => setView(null)} left={view && open(view.status) ? <><button type="button" className={quietCls} disabled={act.busy} onClick={() => void set(view, "Rejected")}>Reject</button><button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(view, "Approved")}>Approve</button></> : undefined} />
      <NewRequest open={adding} close={() => setAdding(false)} kind={kind} onSaved={reload} />
    </div>
  );
}
function Detail({ r, close, left }: { r: Req | null; close: () => void; left?: ReactNode }) {
  return <Modal open={!!r} title={r ? `${r.code} · ${r.parent}` : ""} onClose={close}>{r && <>
    <dl>{r.student && <Row k="Student" v={`${r.student} · ${r.class_label}`} />}{r.req_type && <Row k="Type" v={r.req_type} />}<Row k="Details" v={r.details} />{r.new_number && <><Row k="Current number" v={r.current_number} /><Row k="New number" v={r.new_number} /></>}{r.reason && <Row k="Reason" v={r.reason} />}<Row k="Raised" v={day(r.raised_on)} /><Row k="Status" v={r.status} /></dl>
    <Foot close={close} left={left} /></>}</Modal>;
}

// ═════════════ feedback ═════════════
interface Fb { id: string; code: string; kind: string; about: string; comment: string; rating: number | null; raised_on: string; status: string; resolution: string; parent: string; student: string }
export type FbTab = "feedback-list" | "complaints" | "resolution";
export function ParentFeedbackPages({ tab }: { tab: FbTab }) {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<{ items: Fb[] }>(`${PM}/feedback`), []);
  const parents = useParents();
  const act = useAction(reload);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Fb | null>(null);
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ kind: "feedback", guardian_id: "", student_id: "", about: "", rating: "3", comment: "" });
  const every = data?.items ?? [];
  const all = tab === "complaints" ? every.filter((r) => r.kind === "complaint") : tab === "resolution" ? every.filter((r) => r.status !== "Resolved") : every;
  const rows = all.filter((r) => has(r, search));
  const n = (s: string) => all.filter((r) => r.status === s).length;
  const order = tab === "feedback-list" ? ["Open", "In progress", "Resolved"] : tab === "complaints" ? ["In progress", "Open"] : ["Open", "In progress"];
  const set = async (r: Fb, status: string, resolution?: string) => { if (await act.run(() => schoolFetch(`${PM}/feedback/${r.id}`, json("PATCH", { status, ...(resolution ? { resolution } : {}) })))) { setView(null); setNote(""); } };
  const ps = parents.data?.items ?? [];
  const gid = f.guardian_id || ps[0]?.id || "";
  const chosen = ps.find((p) => p.id === gid);
  const save = async (e: FormEvent) => { e.preventDefault(); if (await act.run(() => schoolFetch(`${PM}/feedback`, json("POST", { kind: f.kind, guardian_id: gid, student_id: f.student_id || chosen?.students[0]?.id || "", about: f.about, rating: Number(f.rating), comment: f.comment })))) { setAdding(false); setF({ kind: "feedback", guardian_id: "", student_id: "", about: "", rating: "3", comment: "" }); } };
  const label = (r: Fb) => (r.kind === "complaint" ? "Complaint" : "Feedback");
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error || parents.error || act.error} />
      <Tiles items={[{ label: "Parent feedback", value: all.length, sub: "All records" }, ...order.map((s) => ({ label: s, value: n(s), sub: pct(n(s), all.length) }))]} />
      <ListPanel title="Parent feedback" noun="feedback" search={search} onSearch={setSearch} exportName={tab} head={["Ref.", "Parent", "Student", "Type", "About", "Rating", "Date", "Status"]} exportRows={rows.map((r) => [r.code, r.parent, r.student, label(r), r.about, r.rating, day(r.raised_on), r.status])}
        extra={<button type="button" className={small} onClick={() => setAdding(true)}>+ New feedback</button>}
        tableHead={["Ref.", "Parent", "Student", "Type", "About", "Rating", "Date", "Status", ""]} empty={loading ? "Loading…" : "No feedback yet."}
        rows={rows.map((r) => [r.code, r.parent, <span key="s" className="font-semibold text-[#026f9b]">{r.student || "—"}</span>, label(r), r.about, <span key="r" className="block text-right">{r.rating ?? "—"}</span>, day(r.raised_on), <Chip key="t" tone={tone(r.status)}>{r.status}</Chip>,
          <span key="a" className="flex gap-1.5">{tab === "resolution" && <button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(r, "Resolved")}>Mark resolved</button>}<button type="button" className={small} onClick={() => { setView(r); setNote(r.resolution); }}>View details</button></span>])} />
      <Modal open={!!view} title={view ? `${view.code} · ${view.about}` : ""} onClose={() => setView(null)}>{view && <>
        <dl><Row k="Parent" v={view.parent} /><Row k="Student" v={view.student || "—"} /><Row k="Type" v={label(view)} /><Row k="Rating" v={view.rating ?? "—"} /><Row k="Date" v={day(view.raised_on)} /><Row k="Status" v={view.status} />{view.comment && <Row k="Comment" v={view.comment} />}{view.status === "Resolved" && <Row k="Resolution" v={view.resolution || "—"} />}</dl>
        {view.status !== "Resolved" && <div className="mt-3"><Field label="Resolution note"><textarea className={`${inputCls} min-h-16`} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /></Field></div>}
        <Foot close={() => setView(null)} left={view.status !== "Resolved" ? <>{view.status === "Open" && <button type="button" className={small} disabled={act.busy} onClick={() => void set(view, "In progress")}>Mark in progress</button>}<button type="button" className={primaryCls} disabled={act.busy} onClick={() => void set(view, "Resolved", note)}>Mark resolved</button></> : undefined} /></>}</Modal>
      <Modal open={adding} title="New feedback" onClose={() => setAdding(false)}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Parent"><select className={inputCls} required value={gid} onChange={(e) => setF({ ...f, guardian_id: e.target.value, student_id: "" })}>{ps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Student"><select className={inputCls} value={f.student_id || chosen?.students[0]?.id || ""} onChange={(e) => setF({ ...f, student_id: e.target.value })}>{(chosen?.students ?? []).map((k) => <option key={k.id} value={k.id}>{k.name} · {k.class_label}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Type"><select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="feedback">Feedback</option><option value="complaint">Complaint</option></select></Field><Field label="Rating"><select className={inputCls} value={f.rating} onChange={(e) => setF({ ...f, rating: e.target.value })}>{[1, 2, 3, 4, 5].map((v) => <option key={v}>{v}</option>)}</select></Field></div>
          <Field label="About"><input className={inputCls} required minLength={2} maxLength={150} value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} /></Field>
          <Field label="Comment"><textarea className={`${inputCls} min-h-16`} maxLength={2000} value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" className={btnGhost} onClick={() => setAdding(false)}>Cancel</button><button type="submit" className={btnPrimary} disabled={act.busy}>Save</button></div>
        </form>
      </Modal>
    </div>
  );
}

// ═════════════ login activity ═════════════
interface Act { total: number; signed_in: number; daily: number; never: number; items: { id: string; parent: string; student: string; device: string; last: string | null }[] }
export function LoginActivityPage() {
  const { data, error, loading } = useLoad(() => schoolFetch<Act>(`${PM}/login-activity`), []);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<Act["items"][number] | null>(null);
  const rows = (data?.items ?? []).filter((r) => has(r, search));
  const when = (s: string | null) => { if (!s) return "Never"; const d = new Date(s); const t = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }); return d.toDateString() === new Date().toDateString() ? `Today ${t}` : `${day(s)} ${t}`; };
  return (
    <div className="space-y-5" data-report>
      <ErrorBanner message={error} />
      <Tiles items={[{ label: "Parents signed in", value: data?.signed_in ?? 0, sub: `${pct(data?.signed_in ?? 0, data?.total ?? 0)} of parents` }, { label: "Daily active", value: data?.daily ?? 0, sub: "In the last day" }, { label: "Never signed in", value: data?.never ?? 0, sub: "No sign-in recorded" }]} />
      <ListPanel title="Recent sign-ins" noun="sign-ins" search={search} onSearch={setSearch} exportName="login-activity" head={["Parent", "Student", "Device", "Last sign-in"]} exportRows={rows.map((r) => [r.parent, r.student, r.device, when(r.last)])}
        tableHead={["Parent", "Student", "Device", "Last sign-in", ""]} empty={loading ? "Loading…" : "No parent has a login yet."}
        rows={rows.map((r) => [<b key="n" className="font-semibold text-slate-900">{r.parent}</b>, <span key="s" className="font-semibold text-[#026f9b]">{r.student || "—"}</span>, r.device || "—", when(r.last), <button key="v" type="button" className={small} onClick={() => setView(r)}>View details</button>])} />
      <Modal open={!!view} title={view?.parent ?? ""} onClose={() => setView(null)}>{view && <><dl><Row k="Student" v={view.student || "—"} /><Row k="Device" v={view.device || "—"} /><Row k="Last sign-in" v={when(view.last)} /></dl><Foot close={() => setView(null)} /></>}</Modal>
    </div>
  );
}
