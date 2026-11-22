"use client";

import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel, SimpleTable, useAction } from "@/components/admin/dash";
import { Chip, Tiles } from "@/components/admin/dash-ui";
import { ExportPrint } from "@/components/admin/export-print";
import { ErrorBanner, Modal, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";
import { Head } from "./head";
import { Empty, Loading, day } from "./dash-pages";
import { SearchBox, blueBtn, smallBtn } from "./ui";

const L = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => <label className="block min-w-0"><span className="mb-1 block text-[12.5px] font-medium text-slate-900">{label}</span>{children}{hint && <span className="mt-1 block text-[11.5px] text-slate-500">{hint}</span>}</label>;
const KV = ({ rows }: { rows: [string, ReactNode][] }) => <dl className="divide-y divide-slate-100 text-[13px]">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2"><dt className="text-slate-500">{k}</dt><dd className="break-all font-medium text-slate-900">{v}</dd></div>)}</dl>;
const FILE = "block w-full text-[13px] text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-slate-50 file:px-2 file:py-1 file:text-[13px]";
const size = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace(/\.0$/, "")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const share = (n: number, t: number) => (t ? `${Math.round((n / t) * 100)}% of shown` : "");

type Kind = "PDF" | "Document" | "Video";
interface Mat { id: string; title: string; type: string; class_label: string; chapter: string; uploaded_on: string; size: string; views: number; shared: boolean; file_name: string; url: string }
interface Mats { items: Mat[]; sections: { id: string; label: string; subject: string; chapters: string[] }[] }
const META: Record<Kind, { title: string; sub: string; noun: string; plural: string; accept: string; hint: string; limit: number; list: string }> = {
  PDF: { title: "PDF", sub: "Notes and worksheets as PDF. Students in the section see them in the app.", noun: "PDF", plural: "pdf", accept: ".pdf", hint: "Up to 20 MB", limit: 20, list: "My pdf" },
  Document: { title: "Documents", sub: "Slides, Word documents and spreadsheets. Students in the section see them in the app.", noun: "document", plural: "documents", accept: ".ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv", hint: "Up to 20 MB", limit: 20, list: "My documents" },
  Video: { title: "Videos", sub: "Short videos, or a YouTube link. Students in the section see them in the app.", noun: "video", plural: "videos", accept: ".mp4", hint: "MP4, up to 200 MB", limit: 200, list: "My videos" },
};

function MatDetails({ m, onClose }: { m: Mat; onClose: () => void }) {
  return <Modal open title={m.title} onClose={onClose}><KV rows={[["Type", m.type], ["Class", m.class_label], ["Chapter", m.chapter || "—"], ["Uploaded", day(m.uploaded_on)], ["File", m.file_name || "—"], ["Link", m.url || "—"], ["Size", m.size || "—"], ["Views", m.views], ["Sharing", <Chip key="s" tone={m.shared ? "info" : "mute"}>{m.shared ? "Shared" : "Private"}</Chip>]]} /></Modal>;
}

export function UploadMaterial({ kind }: { kind: Kind }) {
  const meta = META[kind];
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Mats>("/teacher/materials"), []);
  const act = useAction(reload);
  const blank = { title: "", section_id: "", chapter: null as string | null, shared: false, url: "" };
  const [f, setF] = useState(blank);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [fileErr, setFileErr] = useState("");
  const [q, setQ] = useState("");
  const [done, setDone] = useState("");
  const [view, setView] = useState<Mat | null>(null);
  const sec = data?.sections.find((s) => s.id === (f.section_id || data.sections[0]?.id));
  const chapter = f.chapter ?? sec?.chapters[0] ?? "";
  const mine = (data?.items ?? []).filter((m) => m.type === kind);
  const items = useMemo(() => mine.filter((m) => !q || `${m.title} ${m.class_label} ${m.chapter}`.toLowerCase().includes(q.toLowerCase())), [mine, q]);
  const subject = sec?.subject ?? "";
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setDone("");
    if (!file && !f.url) { setFileErr(kind === "Video" ? "Choose a video or paste a YouTube link." : "Choose a file to upload."); return; }
    if (await act.run(() => schoolFetch("/teacher/materials", json("POST", { doc_type: kind, title: f.title, section_id: sec?.id, chapter, file_name: file?.name, size_label: file ? size(file.size) : undefined, url: f.url || undefined, shared: f.shared })))) { setF({ ...blank, section_id: f.section_id }); setFile(null); setFileKey((k) => k + 1); setDone(`${meta.noun[0].toUpperCase()}${meta.noun.slice(1)} uploaded.`); }
  };
  return (
    <div data-report>
      <Head title={meta.title} subtitle={meta.sub} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base text-slate-900">Upload a {meta.noun}</h2></div>
            {!data.sections.length ? <Empty text="You have no classes with a subject yet." /> : (
              <div className="space-y-4 p-5">
                <L label="Title"><input className={inputCls} required minLength={2} maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></L>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <L label="Section"><select className={inputCls} value={sec?.id ?? ""} onChange={(e) => setF({ ...f, section_id: e.target.value, chapter: null })}>{data.sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></L>
                  <L label="Chapter"><select className={inputCls} value={chapter} onChange={(e) => setF({ ...f, chapter: e.target.value })}>{!sec?.chapters.length && <option value="">No chapters set up</option>}{sec?.chapters.map((c) => <option key={c}>{c}</option>)}</select></L>
                  <L label="File" hint={fileErr || meta.hint}><input key={fileKey} type="file" accept={meta.accept} className={FILE} onChange={(e) => { const x = e.target.files?.[0] ?? null; if (x && x.size > meta.limit * 1024 * 1024) { setFileErr(`That file is over ${meta.limit} MB.`); e.target.value = ""; setFile(null); } else { setFileErr(""); setFile(x); } }} /></L>
                  {kind === "Video" && <L label="Or a YouTube link"><input className={inputCls} type="url" maxLength={300} placeholder="https://youtube.com/…" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></L>}
                </div>
                <label className="flex items-center gap-2 text-[12.5px] text-slate-900"><input type="checkbox" checked={f.shared} onChange={(e) => setF({ ...f, shared: e.target.checked })} className="size-4 accent-[#0294CE]" />Share with other {subject || "subject"} teachers</label>
              </div>
            )}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3">{done && <span role="status" className="mr-auto text-sm font-semibold text-emerald-700">{done}</span>}<button type="button" className={`${btnGhost} !rounded-full !px-4 !py-1.5 text-[13px]`} onClick={() => { setF(blank); setFile(null); setFileKey((k) => k + 1); setFileErr(""); }}>Discard</button><button type="submit" disabled={act.busy || !sec} className={`${btnPrimary} !rounded-full !px-4 !py-1.5 text-[13px]`}>{act.busy ? "Uploading…" : "Upload"}</button></div>
          </form>
          <Panel title={meta.list} sub={`${mine.length} materials`} right={<ExportPrint name={`my-${meta.plural}`} head={["Title", "Type", "Class", "Chapter", "Uploaded", "Size", "Views", "Sharing"]} rows={items.map((m) => [m.title, m.type, m.class_label, m.chapter, m.uploaded_on, m.size, m.views, m.shared ? "Shared" : "Private"])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label={`Search my ${meta.plural}`} /></div>
            <SimpleTable head={[{ h: "Title" }, { h: "Type" }, { h: "Class" }, { h: "Chapter" }, { h: "Uploaded" }, { h: "Size" }, { h: "Views", right: true }, { h: "Sharing" }, { h: "" }]} empty={`You have not uploaded a ${meta.noun} yet.`} rows={items.map((m) => [m.title, m.type, m.class_label.replace(/^Class /, "Class "), m.chapter || "—", day(m.uploaded_on), m.size || "—", m.views, <Chip key="s" tone={m.shared ? "info" : "mute"}>{m.shared ? "Shared" : "Private"}</Chip>, <button key="v" type="button" className={smallBtn} onClick={() => setView(m)}>View details</button>])} />
          </Panel>
        </div>
      )}
      {view && <MatDetails m={view} onClose={() => setView(null)} />}
    </div>
  );
}

export function MyMaterials() {
  const { data, error, loading, reload } = useLoad(() => schoolFetch<Mats>("/teacher/materials"), []);
  const act = useAction(reload);
  const [q, setQ] = useState("");
  const [view, setView] = useState<Mat | null>(null);
  const all = data?.items ?? [];
  const items = all.filter((m) => !q || `${m.title} ${m.type} ${m.class_label} ${m.chapter}`.toLowerCase().includes(q.toLowerCase()));
  const nShared = all.filter((m) => m.shared).length;
  const subject = data?.sections[0]?.subject ?? "";
  return (
    <div data-report>
      <Head title="My Materials" subtitle={`Everything you've uploaded. Shared items also appear in other ${subject ? `${subject} ` : ""}teachers' libraries.`} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {data && (
        <div className="space-y-5">
          <Tiles items={[{ label: "Study materials", value: all.length, sub: "This year" }, { label: "Shared", value: nShared, sub: share(nShared, all.length) }, { label: "Private", value: all.length - nShared, sub: share(all.length - nShared, all.length) }]} />
          <Panel title="Study materials" sub={`${all.length} materials`} right={<ExportPrint name="my-materials" head={["Title", "Type", "Class", "Chapter", "Uploaded", "Size", "Views", "Sharing"]} rows={items.map((m) => [m.title, m.type, m.class_label, m.chapter, m.uploaded_on, m.size, m.views, m.shared ? "Shared" : "Private"])} />}>
            <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search study materials" /></div>
            <SimpleTable head={[{ h: "Title" }, { h: "Type" }, { h: "Class" }, { h: "Chapter" }, { h: "Uploaded" }, { h: "Size" }, { h: "Views", right: true }, { h: "Sharing" }, { h: "" }]} empty="You have not uploaded any study material yet." rows={items.map((m) => [m.title, m.type, m.class_label, m.chapter || "—", day(m.uploaded_on), m.size || "—", m.views, <Chip key="s" tone={m.shared ? "info" : "mute"}>{m.shared ? "Shared" : "Private"}</Chip>,
              <span key="a" className="flex gap-1.5">{m.shared ? <button type="button" disabled={act.busy} className={smallBtn} onClick={() => void act.run(() => schoolFetch(`/teacher/materials/${m.id}/sharing`, json("POST", { shared: false })))}>Make private</button> : <button type="button" disabled={act.busy} className={blueBtn} onClick={() => void act.run(() => schoolFetch(`/teacher/materials/${m.id}/sharing`, json("POST", { shared: true })))}>Share</button>}<button type="button" className={smallBtn} onClick={() => setView(m)}>View details</button></span>])} />
          </Panel>
        </div>
      )}
      {view && <MatDetails m={view} onClose={() => setView(null)} />}
    </div>
  );
}

interface Shared { id: string; title: string; type: string; class_label: string; shared_by: string; shared_on: string; chapter: string; size: string }
export function SharedMaterials() {
  const { data, error, loading } = useLoad(() => schoolFetch<{ items: Shared[] }>("/teacher/materials/shared"), []);
  const mine = useLoad(() => schoolFetch<Mats>("/teacher/materials"), []);
  const act = useAction(() => mine.reload());
  const [q, setQ] = useState("");
  const [view, setView] = useState<Shared | null>(null);
  const [note, setNote] = useState("");
  const items = (data?.items ?? []).filter((m) => !q || `${m.title} ${m.type} ${m.shared_by}`.toLowerCase().includes(q.toLowerCase()));
  const subject = mine.data?.sections[0]?.subject ?? "";
  return (
    <div data-report>
      <Head title="Shared Materials" subtitle={`Materials other ${subject ? `${subject} ` : ""}teachers have shared.`} />
      <ErrorBanner message={error || act.error} />
      <Loading on={loading && !data} />
      {note && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{note}</p>}
      {data && (
        <Panel title="Shared materials" sub={`${data.items.length} materials`} right={<ExportPrint name="shared-materials" head={["Title", "Type", "Class", "Shared by", "Shared on"]} rows={items.map((m) => [m.title, m.type, m.class_label, m.shared_by, m.shared_on])} />}>
          <div className="border-b border-slate-100 px-5 py-3"><SearchBox q={q} onQ={setQ} label="Search shared materials" /></div>
          <SimpleTable head={[{ h: "Title" }, { h: "Type" }, { h: "Class" }, { h: "Shared by" }, { h: "Shared on" }, { h: "" }]} empty="No other teacher has shared a material yet." rows={items.map((m) => [m.title, m.type, m.class_label, m.shared_by, day(m.shared_on),
            <span key="a" className="flex gap-1.5"><button type="button" disabled={act.busy} className={smallBtn} onClick={() => void act.run(async () => { const r = await schoolFetch<{ class_label: string }>(`/teacher/materials/shared/${m.id}/save`, json("POST", {})); setNote(`Saved to your materials for ${r.class_label}.`); })}>Save to my materials</button><button type="button" className={smallBtn} onClick={() => setView(m)}>View details</button></span>])} />
        </Panel>
      )}
      {view && <Modal open title={view.title} onClose={() => setView(null)}><KV rows={[["Type", view.type], ["Class", view.class_label], ["Chapter", view.chapter || "—"], ["Size", view.size || "—"], ["Shared by", view.shared_by], ["Shared on", day(view.shared_on)]]} /></Modal>}
    </div>
  );
}
