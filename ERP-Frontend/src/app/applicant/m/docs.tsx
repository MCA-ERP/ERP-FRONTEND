"use client";

import { useRef, useState } from "react";
import { API_BASE, getAuthHeaders } from "@/lib/api";
import { schoolFetch } from "@/lib/school-api";
import { useAction } from "@/components/admin/dash";
import { ErrorBanner, useLoad } from "@/components/admin/ui";
import { useApplicant } from "../context";
import { Chip, DataTable, Head, Loading, Note, brandBtn, has, pillBtn, toneOf } from "./kit";

export interface DocRow { id: string | null; doc_type: string; required: boolean; file_name: string; status: string; note: string; has_file: boolean }
interface Docs { application: { id: string; code: string; child: string }; items: DocRow[]; max_mb: number; accepted: string }
const OK = ["application/pdf", "image/png", "image/jpeg"];

/** Sends one file as the raw body (the server checks its type from its first bytes and its size against 5 MB). */
export async function send(appId: string, docType: string, file: File) {
  const base = (await getAuthHeaders()) as Record<string, string>;
  const res = await fetch(`${API_BASE}/applicant/applications/${appId}/documents`, { method: "POST", headers: { Authorization: base.Authorization ?? "", "Content-Type": file.type, "x-doc-type": encodeURIComponent(docType), "x-file-name": encodeURIComponent(file.name) }, body: file });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Upload failed (${res.status}).`);
}

export function UploadDocuments() {
  const a = useApplicant();
  const id = a.active?.id;
  const r = useLoad(() => (id ? schoolFetch<Docs>(`/applicant/applications/${id}/documents`) : Promise.resolve(null)), [id]);
  const act = useAction(() => { r.reload(); a.refreshBadges(); });
  const [search, setSearch] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState("");
  const [localError, setLocalError] = useState("");
  const x = r.data;
  const returned = (x?.items ?? []).filter((d) => d.status === "Re-upload needed");
  const rows = (x?.items ?? []).filter((d) => has(d, search));
  const choose = (docType: string) => { setTarget(docType); setLocalError(""); input.current?.click(); };
  const picked = async (f: File | undefined) => {
    if (!f || !id) return;
    if (!OK.includes(f.type)) return setLocalError("Upload a PDF, JPG or PNG file.");
    if (f.size > 5 * 1024 * 1024) return setLocalError("The file is larger than 5 MB.");
    await act.run(() => send(id, target, f));
    if (input.current) input.current.value = "";
  };
  const view = async (d: DocRow) => { if (!d.id) return; try { const l = await schoolFetch<{ url: string }>(`/applicant/documents/${d.id}/link`); window.open(l.url, "_blank", "noopener,noreferrer"); } catch (e) { setLocalError(e instanceof Error ? e.message : "Could not open the file."); } };
  return (
    <div>
      <Head title="Documents" subtitle="Upload clear photos or PDFs. The admissions office checks each one within two working days." />
      <ErrorBanner message={r.error || act.error || localError} />
      <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => void picked(e.target.files?.[0])} />
      {!id ? <Note>Start an application first, then upload its documents here.</Note> : !x ? <Loading /> : (
        <>
          {returned.length > 0 && <Note tone="amber"><b>{returned.length} document{returned.length === 1 ? " needs" : "s need"} a clearer copy.</b> {returned[0].note || `The ${returned[0].doc_type.toLowerCase()} could not be accepted.`}</Note>}
          <DataTable title={`Documents · ${x.application.code}`} noun="documents" search={search} onSearch={setSearch} exportName="documents" exportHead={["Document", "Needed", "File", "Status"]} exportRows={rows.map((d) => [d.doc_type, d.required ? "Required" : "Optional", d.file_name, d.status])}
            head={["Document", "Needed", "File", "Status", ""]} empty="No documents."
            rows={rows.map((d) => [<b key="d" className="font-semibold text-slate-900">{d.doc_type}</b>, <Chip key="n" tone={d.required ? "info" : "mute"}>{d.required ? "Required" : "Optional"}</Chip>, d.file_name || "—", <Chip key="s" tone={d.status === "Not uploaded" ? "mute" : d.status === "Under review" ? "info" : toneOf(d.status)}>{d.status}</Chip>,
              <span key="a" className="flex gap-2">{d.has_file && <button type="button" className={pillBtn} onClick={() => void view(d)}>View</button>}{d.status !== "Verified" && <button type="button" disabled={act.busy} className={d.status === "Re-upload needed" ? brandBtn.replace("px-5 py-2", "px-3.5 py-1.5") : pillBtn} onClick={() => choose(d.doc_type)}>{d.has_file ? "Re-upload" : "Upload"}</button>}</span>])} />
          <div className="mt-4"><Note>Accepted: {x.accepted}, up to {x.max_mb} MB each. Bring the originals on the assessment day.</Note></div>
        </>
      )}
    </div>
  );
}
