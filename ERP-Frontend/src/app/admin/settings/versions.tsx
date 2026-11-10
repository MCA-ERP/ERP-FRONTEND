"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { Panel, StatGrid, useAction } from "@/components/admin/dash";
import { ErrorBanner, Field, Modal, Th, btnGhost, btnPrimary, fmtDate, inputCls, useLoad } from "@/components/admin/ui";

interface Info {
  platform_version: string; api_version: string; node: string; environment: string; started_at: string; database: string;
  migrations: number; last_migration: { version: string; applied_at: string } | null;
}
interface Release { id: string; version: string; released_on: string; notes: string }

export function Releases() {
  const info = useLoad(() => adminFetch<Info>("/system/info"), []);
  const list = useLoad(() => adminFetch<{ releases: Release[] }>("/system/releases"), []);
  const { error: actionError, busy, run } = useAction(list.reload);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ version: "", released_on: new Date().toISOString().slice(0, 10), notes: "" });
  const [formError, setFormError] = useState("");

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run(async () => {
      try {
        await adminFetch("/system/releases", json("POST", f));
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Save failed.");
        throw err;
      }
    });
    if (ok) setOpen(false);
  };

  const i = info.data;
  return (
    <div className="space-y-4">
      <ErrorBanner message={info.error} />
      <StatGrid items={[
        { label: "Platform (backend)", value: i?.platform_version ?? "…", sub: i ? `Running since ${fmtDate(i.started_at)}` : undefined },
        { label: "API", value: i?.api_version ?? "…", sub: i?.environment },
        { label: "Database", value: i?.database ?? "…", sub: i ? `${i.migrations} changes applied` : undefined },
        { label: "Last database change", value: i?.last_migration?.version.split("_")[0] ?? "—", sub: i?.last_migration ? fmtDate(i.last_migration.applied_at) : undefined },
      ]} />
      <Panel title="Release history" sub="Notes on what changed in each version. Written by your team; nothing here installs anything."
        right={<button type="button" className={btnPrimary} onClick={() => { setFormError(""); setF({ version: "", released_on: new Date().toISOString().slice(0, 10), notes: "" }); setOpen(true); }}>+ Add release</button>}>
        <div className="p-4 pb-0"><ErrorBanner message={list.error || actionError} /></div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Version</Th><Th>Released</Th><Th>What changed</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!list.data?.releases.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{list.loading ? "Loading…" : "No releases listed yet."}</td></tr>}
            {list.data?.releases.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-4 py-3 font-mono text-xs font-semibold">{r.version}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{r.released_on}</td>
                <td className="max-w-lg px-4 py-3 text-slate-600">{r.notes || "—"}</td>
                <td className="px-4 py-3 text-right"><button type="button" className={`${btnGhost} !px-2.5 !py-1 text-xs`} disabled={busy} onClick={() => window.confirm(`Remove ${r.version}?`) && run(() => adminFetch(`/system/releases/${r.id}`, { method: "DELETE" }))}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Modal open={open} title="Add a release" onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-3">
            <ErrorBanner message={formError} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Version" hint="Like 4.12.0"><input className={inputCls} required value={f.version} onChange={(e) => setF({ ...f, version: e.target.value })} /></Field>
              <Field label="Released on"><input type="date" className={inputCls} required value={f.released_on} onChange={(e) => setF({ ...f, released_on: e.target.value })} /></Field>
            </div>
            <Field label="What changed"><textarea className={`${inputCls} min-h-[6rem]`} maxLength={2000} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className={btnPrimary} disabled={busy}>Save</button>
            </div>
          </form>
        </Modal>
      </Panel>
    </div>
  );
}
