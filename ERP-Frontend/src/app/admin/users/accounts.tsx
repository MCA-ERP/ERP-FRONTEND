"use client";

import { useState } from "react";
import { adminFetch, json, qs, type Paged, type SchoolRow } from "@/lib/admin-api";
import { Panel, useAction } from "@/components/admin/dash";
import { Badge, ErrorBanner, Pagination, Th, btnGhost, btnPrimary, fmtDate, inputCls, useDebounced, useLoad } from "@/components/admin/ui";
import { downloadCsv, small } from "./shared";

interface Cred { student_id?: string; guardian_id?: string; name: string; login_id: string; temporary_password: string }
interface Stu {
  id: string; registration_no: string; first_name: string; last_name: string; status: string; user_profile_id: string | null;
  institutions: { name: string } | null; user_profiles: { status: string; last_login_at: string | null; locked_until: string | null } | null;
}
interface Par {
  id: string; full_name: string; phone: string; user_profile_id: string | null; institutions: { name: string } | null;
  user_profiles: { status: string; last_login_at: string | null } | null; student_guardians: { students: { first_name: string; last_name: string } | null }[];
}

const Empty = ({ cols, loading, text }: { cols: number; loading: boolean; text: string }) => (
  <tr><td colSpan={cols} className="px-4 py-8 text-center text-slate-400">{loading ? "Loading…" : text}</td></tr>
);

/** Passwords are shown once, here, and can be saved as a file to hand out. */
function Credentials({ rows, onClose }: { rows: Cred[]; onClose: () => void }) {
  return (
    <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <p className="font-semibold text-emerald-900">{rows.length} account{rows.length === 1 ? "" : "s"} created. Save these now: the passwords are not shown again.</p>
      <div className="mt-3 max-h-56 overflow-y-auto rounded-xl bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Name</Th><Th>Sign-in ID</Th><Th>Temporary password</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((r) => <tr key={r.login_id}><td className="px-4 py-2">{r.name}</td><td className="px-4 py-2 font-mono">{r.login_id}</td><td className="px-4 py-2 font-mono">{r.temporary_password}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className={btnPrimary} onClick={() => downloadCsv("new-accounts.csv", [["Name", "Sign-in ID", "Temporary password"], ...rows.map((r) => [r.name, r.login_id, r.temporary_password])])}>Download CSV</button>
        <button type="button" className={btnGhost} onClick={onClose}>I have saved them</button>
      </div>
    </div>
  );
}

function Filters({ school, setSchool, account, setAccount, search, setSearch }: { school: string; setSchool: (v: string) => void; account: string; setAccount: (v: string) => void; search: string; setSearch: (v: string) => void }) {
  const schools = useLoad(() => adminFetch<Paged<SchoolRow>>("/schools?pageSize=100"), []);
  return (
    <div className="flex flex-wrap gap-3 p-4">
      <select className={`${inputCls} max-w-[14rem]`} aria-label="School" value={school} onChange={(e) => setSchool(e.target.value)}><option value="">All schools</option>{schools.data?.items.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      <select className={`${inputCls} max-w-[12rem]`} aria-label="Account" value={account} onChange={(e) => setAccount(e.target.value)}><option value="">With or without</option><option value="with">Has an account</option><option value="without">No account yet</option></select>
      <input className={`${inputCls} max-w-xs`} placeholder="Search…" aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
    </div>
  );
}

export function StudentAccounts() {
  const [school, setSchool] = useState("");
  const [account, setAccount] = useState("without");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [creds, setCreds] = useState<Cred[]>([]);
  const [note, setNote] = useState("");
  const q = useDebounced(search);
  const { data, error, loading, reload } = useLoad(() => adminFetch<Paged<Stu> & { login_domain: string }>(`/student-accounts${qs({ school, account, search: q, page })}`), [school, account, q, page]);
  const act = useAction(reload);

  const create = async (ids: string[]) => {
    setNote("");
    await act.run(async () => {
      const r = await adminFetch<{ created: Cred[]; skipped: { reason: string }[] }>("/student-accounts", json("POST", { student_ids: ids }));
      setCreds((c) => [...r.created, ...c]);
      setPicked(new Set());
      if (r.skipped.length) setNote(`${r.skipped.length} skipped: ${[...new Set(r.skipped.map((s) => s.reason))].join("; ")}`);
    });
  };
  const withoutAccount = (data?.items ?? []).filter((s) => !s.user_profile_id);

  return (
    <>
      {creds.length > 0 && <Credentials rows={creds} onClose={() => setCreds([])} />}
      <Panel title="Student login accounts" sub="Sign-in accounts for students in the student app. A student signs in with their registration number and the temporary password, then chooses their own."
        right={<button type="button" className={btnPrimary} disabled={act.busy || !picked.size} onClick={() => create([...picked])}>Create {picked.size || ""} account{picked.size === 1 ? "" : "s"}</button>}>
        <ErrorBanner message={error || act.error} />
        {note && <p role="status" className="mx-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{note}</p>}
        <Filters school={school} setSchool={(v) => { setSchool(v); setPage(1); }} account={account} setAccount={(v) => { setAccount(v); setPage(1); }} search={search} setSearch={(v) => { setSearch(v); setPage(1); }} />
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th><input type="checkbox" aria-label="Select all on this page" className="size-4 accent-mca-blue" checked={!!withoutAccount.length && withoutAccount.every((s) => picked.has(s.id))} onChange={(e) => setPicked(e.target.checked ? new Set(withoutAccount.map((s) => s.id)) : new Set())} /></Th><Th>Student</Th><Th>School</Th><Th>Sign-in ID</Th><Th>Account</Th><Th>Last sign-in</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!data?.items.length && <Empty cols={7} loading={loading} text="No students found." />}
            {data?.items.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${s.first_name}`} className="size-4 accent-mca-blue" disabled={!!s.user_profile_id} checked={picked.has(s.id)} onChange={() => { const n = new Set(picked); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); setPicked(n); }} /></td>
                <td className="px-4 py-3 font-semibold text-slate-900">{s.first_name} {s.last_name}</td>
                <td className="px-4 py-3 text-slate-600">{s.institutions?.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{s.registration_no}</td>
                <td className="px-4 py-3">{!s.user_profile_id ? <Badge tone="gray">None</Badge> : s.user_profiles?.status === "active" ? <Badge tone="green">Active</Badge> : <Badge tone="red">Turned off</Badge>}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{s.user_profiles?.last_login_at ? fmtDate(s.user_profiles.last_login_at) : "—"}</td>
                <td className="px-4 py-3 text-right">{!s.user_profile_id && <button type="button" className={small} disabled={act.busy} onClick={() => create([s.id])}>Create</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Behind the scenes each account uses the address <span className="font-mono">registration-number@{data?.login_domain ?? "…"}</span>. No email is ever sent to it. To turn an account off or reset its password, find the student in the Directory.</p>
      </Panel>
    </>
  );
}

export function ParentAccounts() {
  const [school, setSchool] = useState("");
  const [account, setAccount] = useState("without");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [creds, setCreds] = useState<Cred[]>([]);
  const q = useDebounced(search);
  const { data, error, loading, reload } = useLoad(() => adminFetch<Paged<Par>>(`/parent-accounts${qs({ school, account, search: q, page })}`), [school, account, q, page]);
  const act = useAction(reload);

  const make = (id: string) =>
    act.run(async () => {
      const r = await adminFetch<Cred>("/parent-accounts", json("POST", { guardian_id: id }));
      setCreds((c) => [r, ...c]);
    });

  return (
    <>
      {creds.length > 0 && <Credentials rows={creds} onClose={() => setCreds([])} />}
      <Panel title="Parent login accounts" sub="One account per guardian, created from their mobile number. Parents are meant to sign in with that number and a one-time code.">
        <p className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">One-time-code sign-in is not available yet: it needs the Parent App and an approved SMS template. Until then, an account signs in with its mobile number and the temporary password below.</p>
        <ErrorBanner message={error || act.error} />
        <Filters school={school} setSchool={(v) => { setSchool(v); setPage(1); }} account={account} setAccount={(v) => { setAccount(v); setPage(1); }} search={search} setSearch={(v) => { setSearch(v); setPage(1); }} />
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr><Th>Parent</Th><Th>School</Th><Th>Children</Th><Th>Account</Th><Th>Last sign-in</Th><Th /></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!data?.items.length && <Empty cols={6} loading={loading} text="No guardians found. Guardians are added when students are enrolled." />}
            {data?.items.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3"><p className="font-semibold text-slate-900">{p.full_name}</p><p className="text-xs text-slate-400">{p.phone}</p></td>
                <td className="px-4 py-3 text-slate-600">{p.institutions?.name}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{p.student_guardians.map((s) => s.students && `${s.students.first_name} ${s.students.last_name}`).filter(Boolean).join(", ") || "—"}</td>
                <td className="px-4 py-3">{!p.user_profile_id ? <Badge tone="gray">None</Badge> : p.user_profiles?.status === "active" ? <Badge tone="green">Active</Badge> : <Badge tone="red">Turned off</Badge>}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{p.user_profiles?.last_login_at ? fmtDate(p.user_profiles.last_login_at) : "—"}</td>
                <td className="px-4 py-3 text-right">{!p.user_profile_id && <button type="button" className={small} disabled={act.busy} onClick={() => make(p.id)}>Create account</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />}
      </Panel>
    </>
  );
}
