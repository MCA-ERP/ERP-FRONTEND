"use client";

import { useState } from "react";
import { adminFetch } from "@/lib/admin-api";
import { StatGrid, TabBar, num } from "@/components/admin/dash";
import { ErrorBanner, PageHeader, useLoad } from "@/components/admin/ui";
import { Assignment, Categories } from "./categories-assignment";
import { Escalations, Feedback, KnowledgeBase } from "./kb-feedback";
import { Tickets } from "./tickets";

type Tab = "tickets" | "categories" | "assignment" | "kb" | "feedback" | "escalations";

export default function SupportPage() {
  const [tab, setTab] = useState<Tab>("tickets");
  const stats = useLoad(() => adminFetch<{ counts: { all: number; open: number; pending: number; resolved: number } }>("/support/tickets?pageSize=1"), []);
  const esc = useLoad(() => adminFetch<{ overdue_now: number }>("/support/escalations?pageSize=1"), []);
  const c = stats.data?.counts;

  return (
    <>
      <PageHeader title="Support" subtitle="Tickets from schools, the help centre, feedback and response targets." />
      <ErrorBanner message={stats.error || esc.error} />
      <StatGrid
        items={[
          { label: "Open", value: num(c?.open ?? 0), sub: "Nobody has replied yet" },
          { label: "Pending", value: num(c?.pending ?? 0), sub: "Being worked on or waiting on the school" },
          { label: "Resolved", value: num(c?.resolved ?? 0) },
          { label: "Overdue now", value: num(esc.data?.overdue_now ?? 0), sub: "Past their reply or fix target" },
        ]}
      />
      <div className="mt-6">
        <TabBar value={tab} onChange={setTab} tabs={[["tickets", "Tickets"], ["categories", "Categories"], ["assignment", "Assignment"], ["kb", "Knowledge base"], ["feedback", "Feedback"], ["escalations", "Escalations"]]} />
        {tab === "tickets" && <Tickets onChanged={() => { stats.reload(); esc.reload(); }} />}
        {tab === "categories" && <Categories />}
        {tab === "assignment" && <Assignment />}
        {tab === "kb" && <KnowledgeBase />}
        {tab === "feedback" && <Feedback />}
        {tab === "escalations" && <Escalations />}
      </div>
    </>
  );
}
