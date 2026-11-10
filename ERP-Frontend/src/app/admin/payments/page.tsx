"use client";

import { useState } from "react";
import { adminFetch, type Analytics } from "@/lib/admin-api";
import { StatGrid, TabBar, lakh } from "@/components/admin/dash";
import { ErrorBanner, PageHeader, useLoad } from "@/components/admin/ui";
import { Gateway } from "./gateway";
import { Invoices } from "./invoices";
import { Refunds } from "./refunds";
import { Revenue, Tax } from "./tax-revenue";
import { Transactions } from "./transactions";

type Tab = "invoices" | "tx" | "school" | "refunds" | "gateway" | "tax" | "revenue";
type InvTab = "all" | "generated" | "paid" | "unpaid";

export default function PaymentsPage() {
  const [tab, setTab] = useState<Tab>("invoices");
  const [inv, setInv] = useState<InvTab>("all");
  const [school, setSchool] = useState<"subscription" | "renewal">("subscription");
  const analytics = useLoad(() => adminFetch<Analytics>("/payments/analytics"), []);
  const t = analytics.data?.totals;

  return (
    <>
      <PageHeader title="Payments" subtitle="Invoices to schools, what has been paid, refunds, tax and revenue." />
      <ErrorBanner message={analytics.error} />
      <StatGrid
        items={[
          { label: "Collected this month", value: lakh(t?.collected_this_month_paise ?? 0), sub: "After refunds" },
          { label: "Collected this financial year", value: lakh(t?.collected_this_fy_paise ?? 0) },
          { label: "Outstanding", value: lakh(t?.outstanding_paise ?? 0), sub: "Issued, not yet fully paid" },
          { label: "Overdue", value: lakh(t?.overdue_paise ?? 0), sub: "Past the due date" },
        ]}
      />
      <div className="mt-6">
        <TabBar
          value={tab}
          onChange={setTab}
          tabs={[["invoices", "Invoices"], ["tx", "Transactions"], ["school", "School payments"], ["refunds", "Refunds"], ["gateway", "Payment gateway"], ["tax", "Tax"], ["revenue", "Revenue reports"]]}
        />
        {tab === "invoices" && (
          <>
            <TabBar value={inv} onChange={setInv} tabs={[["all", "All invoices"], ["generated", "Generated"], ["paid", "Paid"], ["unpaid", "Unpaid"]]} />
            <Invoices key={inv} onChange={analytics.reload} group={inv === "all" ? undefined : inv} />
          </>
        )}
        {tab === "tx" && <Transactions />}
        {tab === "school" && (
          <>
            <TabBar value={school} onChange={setSchool} tabs={[["subscription", "Subscription payments"], ["renewal", "Renewal payments"]]} />
            <Transactions key={school} kind={school} />
          </>
        )}
        {tab === "refunds" && <Refunds onChange={analytics.reload} />}
        {tab === "gateway" && <Gateway />}
        {tab === "tax" && <Tax />}
        {tab === "revenue" && <Revenue />}
      </div>
    </>
  );
}
