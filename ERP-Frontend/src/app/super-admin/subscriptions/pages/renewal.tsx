"use client";

import { useState } from "react";
import { adminFetch, qs, type Paged } from "@/lib/admin-api";
import { downloadCsv } from "@/components/admin/csv";
import { Panel, PlanTag, SimpleTable, StatusPill, daysTo, fmtDay, inr, num } from "@/components/admin/dash";
import { Chip, DaysChip, ViewButton } from "@/components/admin/dash-ui";
import { ErrorBanner, useLoad } from "@/components/admin/ui";
import { small } from "../../schools/pages/shared";
import { RenewModal } from "../renew-modal";
import type { SubRow } from "../shared";

export type RenewalTab = "upcoming" | "history";
interface Upcoming extends SubRow { open_invoice: string | null }
interface Hist { id: string; type: string; summary: string; created_at: string; institution_id: string; institutions: { name: string } | null }

const LABEL: Record<string, string> = { renewed: "Renewed", lapsed: "Lapsed", expired: "Expired", cancelled: "Cancelled", trial_expired: "Trial ended", plan_changed: "Plan changed", reinstated: "Reinstated", plan_request_approved: "Plan change approved" };
const TONE: Record<string, "good" | "bad" | "info"> = { renewed: "good", lapsed: "bad", expired: "bad", cancelled: "bad", trial_expired: "bad", plan_changed: "info", reinstated: "good", plan_request_approved: "info" };

/** Renewal management: what renews soon (with a way to raise the invoice), and what has happened before. */
export function RenewalManagement({ tab }: { tab: RenewalTab }) {
  const [page, setPage] = useState(1);
  const [renew, setRenew] = useState<{ id: string; name: string } | null>(null);
  const up = useLoad(() => (tab === "upcoming" ? adminFetch<{ renewals: Upcoming[] }>("/subscriptions/renewals/upcoming?days=90") : Promise.resolve(null)), [tab]);
  const hist = useLoad(() => (tab === "history" ? adminFetch<Paged<Hist>>(`/subscriptions/renewals/history${qs({ page })}`) : Promise.resolve(null)), [tab, page]);

  if (tab === "history") {
    const items = hist.data?.items ?? [];
    return (
      <div className="space-y-5">
        <ErrorBanner message={hist.error} />
        <Panel title="Renewal history" sub="Renewals, plan changes, lapses and cancellations"
          right={<button type="button" className={small} onClick={() => downloadCsv("renewal-history", ["Date", "School", "Event", "Details"], items.map((e) => [e.created_at.slice(0, 10), e.institutions?.name ?? "", LABEL[e.type] ?? e.type, e.summary]))}>Export</button>}>
          <SimpleTable head={[{ h: "Date" }, { h: "School" }, { h: "Event" }, { h: "Details" }]} empty={hist.loading ? "Loading…" : "Nothing yet."}
            rows={items.map((e) => [fmtDay(e.created_at.slice(0, 10)), <b key="s" className="font-semibold text-slate-900">{e.institutions?.name ?? "—"}</b>, <Chip key="c" tone={TONE[e.type] ?? "mute"}>{LABEL[e.type] ?? e.type}</Chip>, e.summary])} />
          {hist.data && hist.data.total > hist.data.pageSize && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <button type="button" className={small} disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</button>
              <span className="text-xs text-slate-500">Page {page}</span>
              <button type="button" className={small} disabled={page * hist.data.pageSize >= hist.data.total} onClick={() => setPage(page + 1)}>Older</button>
            </div>
          )}
        </Panel>
      </div>
    );
  }

  const items = up.data?.renewals ?? [];
  return (
    <div className="space-y-5">
      <ErrorBanner message={up.error} />
      <Panel title="Upcoming renewals" sub="Renewing in the next 90 days. When the invoice is paid, the subscription renews by itself."
        right={<button type="button" className={small} onClick={() => downloadCsv("upcoming-renewals", ["School", "Plan", "Students", "Annual value", "Renews"], items.map((r) => [r.name, r.plan_name ?? "", r.students, r.arr_paise / 100, r.renews_on ?? ""]))}>Export</button>}>
        <SimpleTable
          head={[{ h: "School" }, { h: "Plan" }, { h: "Students", right: true }, { h: "Annual value", right: true }, { h: "Renews" }, { h: "In" }, { h: "Status" }, { h: "" }]}
          empty={up.loading ? "Loading…" : "Nothing renews soon."}
          rows={items.map((r) => {
            const d = daysTo(r.renews_on);
            return [
              <div key="s"><p className="font-semibold text-slate-900">{r.name}</p><p className="text-xs text-slate-400">{r.code}</p></div>,
              <PlanTag key="p" code={r.plan_code} name={r.plan_name} />,
              num(r.students), inr(r.arr_paise), fmtDay(r.renews_on),
              d === null ? "—" : d < 0 ? <Chip key="d" tone="bad">{Math.abs(d)} days late</Chip> : <DaysChip key="d" days={d} />,
              r.open_invoice ? <Chip key="st" tone="info">Invoice {r.open_invoice}</Chip> : <StatusPill key="st" status={r.status as never} />,
              <span key="a" className="flex gap-1.5">
                <button type="button" className={small} disabled={!!r.open_invoice} onClick={() => setRenew({ id: r.id, name: r.name })}>Raise invoice</button>
                <ViewButton href={`/super-admin/subscriptions/${r.id}`} />
              </span>,
            ];
          })}
        />
      </Panel>
      <RenewModal school={renew} onClose={() => setRenew(null)} onDone={up.reload} />
    </div>
  );
}
