"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { json } from "@/lib/admin-api";
import { schoolFetch } from "@/lib/school-api";
import { Panel } from "@/components/admin/dash";
import { ErrorBanner, useLoad } from "@/components/admin/ui";
import { useApplicant } from "../context";
import { sectionHref } from "./menu-config";
import { AMBERTILE, BLUETILE } from "./tiles";
import { Chip, FamilyQuickActions, GREEN, Head, Loading, Tile, brandBtn, dmy, inr, pillBtn, toneOf, whiteBtn } from "./kit";

export interface Step { n: number; label: string; state: "done" | "current" | "todo" }
interface Overview {
  applications: { id: string; code: string; child: string }[];
  application: { id: string; code: string; child: string; class_sought: string; year: string; status: string; steps: Step[] } | null;
  next: { title: string; text: string; action: string; href: string } | null;
  tiles: { documents: { verified: number; total: number }; assessment: { label: string; sub: string }; seats: { left: number; total: number; class: string }; paid: number };
  key_dates: { date: string; what: string; details: string; status: string }[];
  messages: { id: string; from: string; body: string; at: string }[];
}
const yearLabel = (y: string) => y.replace(/^(\d{4})-(\d{4})$/, (_, a: string, b: string) => `${a}-${b.slice(2)}`);
const nextHref = (h: string) => (h.includes("/") ? `/applicant/${h}` : h);

/** The eight steps of an admission: the ones done are ticked, the one you are on is outlined. */
export function StepCards({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid gap-2.5 p-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))" }} aria-label="Admission steps">
      {steps.map((s) => (
        <li key={s.n} className={`rounded-xl border px-3 py-3 text-[12px] ${s.state === "done" ? "border-[#bfe3cf] bg-[#eefaf3] text-slate-800" : s.state === "current" ? "border-[#0294CE] bg-[#f1f9fd] font-semibold text-slate-900" : "border-slate-200 bg-white text-slate-500"}`}>
          <span className={`mb-2 grid size-6 place-items-center rounded-full text-[11px] font-bold ${s.state === "done" ? "bg-[#1b7a55] text-white" : s.state === "current" ? "bg-[#026f9b] text-white" : "border border-slate-300 text-slate-500"}`}>{s.state === "done" ? "✓" : s.n}</span>
          {s.label}
        </li>
      ))}
    </ol>
  );
}

// ═════════════ Application Status › My Application ═════════════
export function Status() {
  const a = useApplicant();
  const router = useRouter();
  const r = useLoad(() => schoolFetch<Overview>(`/applicant/overview${a.active ? `?application=${a.active.id}` : ""}`), [a.active?.id]);
  const x = r.data;
  const first = a.name || "there";
  const sub = x?.application ? `Hello ${first}. Here's where ${x.application.child.split(" ")[0]}'s application for ${x.application.class_sought.replace(/\s*·.*$/, "")}, ${yearLabel(x.application.year)} stands.` : `Hello ${first}. Start an application for your child below.`;
  if (!x) return <><Head title="My Application" subtitle={sub} /><FamilyQuickActions /><ErrorBanner message={r.error} /><Loading /></>;
  const app = x.application;
  return (
    <div>
      <Head title="My Application" subtitle={sub} />
      <FamilyQuickActions />
      {!app ? (
        <Panel title="No application yet" sub="Check eligibility, then apply">
          <div className="space-y-3 p-5 text-[13px] text-slate-700"><p>You have not started an application. Check which programme your child is eligible for, then fill in the form. Your answers are saved as a draft as you go.</p>
            <div className="flex gap-2"><button type="button" className={brandBtn} onClick={() => router.push(`${sectionHref("application", "application")}?tab=eligibility-check`)}>Check eligibility</button><button type="button" className={whiteBtn} onClick={() => router.push(`${sectionHref("application", "application")}?tab=new-application`)}>New application</button></div></div>
        </Panel>
      ) : (
        <>
          <Panel title={`Application ${app.code}`} sub={`${app.child} · ${app.class_sought} · ${yearLabel(app.year)}`} right={<Chip tone={toneOf(app.status)}>{app.status}</Chip>}>
            <StepCards steps={app.steps} />
          </Panel>
          {x.next && (
            <div className="my-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-[#0294CE] bg-white px-5 py-4">
              <div><p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-500">Next step</p><p className="text-[17px] font-bold text-slate-900">{x.next.title}</p><p className="text-[13px] text-slate-600">{x.next.text}</p></div>
              <button type="button" className={brandBtn} onClick={() => router.push(nextHref(x.next!.href))}>{x.next.action}</button>
            </div>
          )}
          <div className="mb-5 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
            <Tile label="Documents" value={`${x.tiles.documents.verified} / ${x.tiles.documents.total}`} sub="Verified" bg={BLUETILE} />
            <Tile label="Assessment" value={x.tiles.assessment.label} sub={x.tiles.assessment.sub} bg={BLUETILE} />
            <Tile label={`Seats left · ${x.tiles.seats.class}`} value={x.tiles.seats.left} sub={`of ${x.tiles.seats.total}`} bg={AMBERTILE} />
            <Tile label="Fees paid" value={inr(x.tiles.paid)} sub="Application fee and admission fee" bg={GREEN} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Key dates" sub={yearLabel(app.year)} right={<button type="button" className={pillBtn} onClick={() => router.push(`${sectionHref("school", "about-the-school")}?tab=admission-calendar`)}>Full calendar</button>}>
              {x.key_dates.length ? <ul className="divide-y divide-slate-100">{x.key_dates.map((d) => <li key={d.what + d.date} className="flex items-start gap-3 px-5 py-3"><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-[11px] ${d.status === "Done" ? "bg-[#d9efe8] text-[#065740]" : "bg-[#dceff9] text-[#026f9b]"}`}>{d.status === "Done" ? "✓" : "·"}</span><span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-slate-900">{d.what}</span><span className="block text-[11.5px] text-slate-500">{d.details}</span></span><span className="shrink-0 text-[12px] text-slate-600">{dmy(d.date)}</span></li>)}</ul> : <p className="p-6 text-center text-sm text-slate-400">The school has not published admission dates yet.</p>}
            </Panel>
            <Panel title="Latest messages" right={<Link href={sectionHref("messages", "messages")} className={pillBtn}>Open</Link>}>
              {x.messages.length ? <ul className="divide-y divide-slate-100">{x.messages.map((m) => <li key={m.id} className="flex gap-3 px-5 py-3"><span className="grid size-6 shrink-0 place-items-center rounded-md bg-[#dceff9] text-[11px] font-bold text-[#026f9b]">A</span><span className="min-w-0 flex-1"><span className="flex justify-between gap-3"><b className="text-[13px] text-slate-900">{m.from}</b><span className="text-[11.5px] text-slate-500">{dmy(m.at)}</span></span><span className="block text-[12px] text-slate-600">{m.body}</span></span></li>)}</ul> : <p className="p-6 text-center text-sm text-slate-400">No messages from the admissions office yet.</p>}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

// ═════════════ Application Status › Notifications ═════════════
interface Notices { items: { key: string; kind: string; title: string; text: string; at: string; unread: boolean; href: string }[]; unread: number }
const when = (iso: string) => { const d = new Date(iso); const t = new Date(); const same = d.toDateString() === t.toDateString(); return same ? `Today ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}` : dmy(iso); };

export function Notifications() {
  const a = useApplicant();
  const router = useRouter();
  const r = useLoad(() => schoolFetch<Notices>("/applicant/notifications"), []);
  const x = r.data;
  const mark = async (keys: string[]) => { if (!keys.length) return; try { await schoolFetch("/applicant/notifications/read", json("POST", { keys })); r.reload(); a.refreshBadges(); } catch { /* shown on reload */ } };
  return (
    <div>
      <Head title="Notifications" subtitle="Updates on your application from the admissions office." action={<button type="button" className={whiteBtn} disabled={!x?.unread} onClick={() => void mark((x?.items ?? []).filter((n) => n.unread).map((n) => n.key))}>Mark all as read</button>} />
      <FamilyQuickActions />
      <ErrorBanner message={r.error} />
      <Panel title="All notifications" sub={x ? `${x.unread} unread` : ""}>
        {!x ? <Loading /> : !x.items.length ? <p className="p-6 text-center text-sm text-slate-400">Nothing yet. Updates from the admissions office appear here.</p> : (
          <ul className="divide-y divide-slate-100">{x.items.map((n) => (
            <li key={n.key}><button type="button" onClick={() => { void mark(n.unread ? [n.key] : []); router.push(n.href); }} className={`flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-slate-50 ${n.unread ? "bg-[#f7fbfe]" : ""}`}>
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-[#dceff9] text-[12px] font-bold text-[#026f9b]">{n.kind}</span>
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-slate-900">{n.title}</span><span className="block text-[12px] text-slate-600">{n.text}</span><span className="block text-[11.5px] text-slate-500">{when(n.at)}</span></span>
              {n.unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-[#0294CE]" aria-label="Unread" />}
            </button></li>
          ))}</ul>
        )}
      </Panel>
    </div>
  );
}
