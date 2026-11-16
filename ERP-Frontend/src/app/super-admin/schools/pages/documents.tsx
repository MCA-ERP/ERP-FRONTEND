"use client";

import { useState } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { downloadCsv } from "@/components/admin/csv";
import { Panel, SimpleTable, fmtDay, num, useAction } from "@/components/admin/dash";
import { Chip, Tiles, ViewButton } from "@/components/admin/dash-ui";
import { ErrorBanner, inputCls, useLoad } from "@/components/admin/ui";
import { small } from "./shared";

export type DocTab = "registration" | "affiliation";
type St = "verified" | "review" | "missing" | "expired" | "rejected";
interface Row { document_id: string | null; school: { id: string; code: string; name: string; status: string }; doc_type: string; file_name: string | null; uploaded_at: string | null; valid_until: string | null; status: St }
interface Overview { items: Row[]; counts: Record<St, number> }

const LABEL: Record<St, string> = { verified: "Verified", review: "To review", missing: "Missing", expired: "Expired", rejected: "Rejected" };
const TONE: Record<St, "good" | "warn" | "bad" | "info" | "mute"> = { verified: "good", review: "info", missing: "mute", expired: "bad", rejected: "bad" };

/** School Documents: registration or affiliation papers of every school, and which are verified, waiting, missing or expired. */
export function SchoolDocuments({ tab }: { tab: DocTab }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [asked, setAsked] = useState<string[]>([]);
  const { data, error, loading } = useLoad(() => adminFetch<Overview>(`/school-documents?category=${tab}`), [tab]);
  const act = useAction(() => undefined);
  const q = search.trim().toLowerCase();
  const items = (data?.items ?? []).filter((r) => (!status || r.status === status) && (!q || `${r.school.name} ${r.school.code} ${r.doc_type}`.toLowerCase().includes(q)));
  const c = data?.counts;
  const affiliation = tab === "affiliation";
  const title = affiliation ? "Affiliation documents" : "Registration documents";

  const request = (r: Row) => act.run(async () => {
    await adminFetch(`/schools/${r.school.id}/document-requests`, json("POST", { doc_type: r.doc_type }));
    setAsked((a) => [...a, r.school.id + r.doc_type]);
  });

  return (
    <div className="space-y-5">
      <ErrorBanner message={error || act.error} />
      <Tiles items={[
        { label: "Verified", value: c ? num(c.verified) : "…", sub: "Checked by the platform team" },
        { label: "To review", value: c ? num(c.review) : "…", sub: "Uploaded, not yet checked" },
        { label: "Missing", value: c ? num(c.missing) : "…", sub: "Ask the school to upload" },
        { label: "Expired", value: c ? num(c.expired) : "…", sub: "Renewal needed" },
      ]} />
      <Panel title={title} sub={`${items.length} document${items.length === 1 ? "" : "s"}`}
        right={<button type="button" className={small} onClick={() => downloadCsv(`${tab}-documents`, ["School", "Document", "File", "Uploaded", "Valid until", "Status"], items.map((r) => [r.school.name, r.doc_type, r.file_name ?? "", r.uploaded_at?.slice(0, 10) ?? "", r.valid_until ?? "", LABEL[r.status]]))}>Export</button>}>
        <div className="flex flex-wrap gap-2.5 border-b border-slate-100 p-4">
          <input className={`${inputCls} max-w-xs`} placeholder="Search school or document" aria-label="Search documents" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={`${inputCls} max-w-[10rem]`} aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {(Object.keys(LABEL) as St[]).map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
          </select>
        </div>
        <SimpleTable
          head={[{ h: "School" }, { h: "Document" }, { h: "File" }, { h: "Uploaded" }, ...(affiliation ? [{ h: "Valid until" }] : []), { h: "Status" }, { h: "" }]}
          empty={loading ? "Loading…" : "No documents match."}
          rows={items.map((r) => [
            <b key="s" className="font-semibold text-slate-900">{r.school.name}</b>,
            r.doc_type,
            r.file_name ?? "—",
            fmtDay(r.uploaded_at?.slice(0, 10)),
            ...(affiliation ? [fmtDay(r.valid_until)] : []),
            <Chip key="st" tone={TONE[r.status]}>{LABEL[r.status]}</Chip>,
            r.status === "missing"
              ? <button key="a" type="button" className={small} disabled={act.busy || asked.includes(r.school.id + r.doc_type)} onClick={() => request(r)}>{asked.includes(r.school.id + r.doc_type) ? "Requested" : "Request"}</button>
              : <ViewButton key="v" href={`/super-admin/schools/${r.school.id}?tab=documents`} />,
          ])}
        />
      </Panel>
    </div>
  );
}
