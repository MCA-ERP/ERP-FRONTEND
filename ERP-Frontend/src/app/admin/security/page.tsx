"use client";

import { useState } from "react";
import { TabBar } from "@/components/admin/dash";
import { PageHeader } from "@/components/admin/ui";
import { AccessControl } from "./access";
import { AuditSection } from "./audit";
import { Backups } from "./backups";
import { Incidents } from "./incidents";
import { LoginSecurity } from "./login";
import { Retention } from "./retention";
import { SecuritySettings } from "./settings";

type Tab = "login" | "audit" | "access" | "settings" | "retention" | "incidents" | "backups";

export default function SecurityPage() {
  const [tab, setTab] = useState<Tab>("login");
  return (
    <>
      <PageHeader title="Security & audit" subtitle="Who signed in, who did what, who may get in, and how long records are kept." />
      <TabBar value={tab} onChange={setTab} tabs={[["login", "Login security"], ["audit", "Audit logs"], ["access", "Access control"], ["settings", "Security settings"], ["retention", "Data retention"], ["incidents", "Incidents"], ["backups", "Backups"]]} />
      {tab === "login" && <LoginSecurity />}
      {tab === "audit" && <AuditSection />}
      {tab === "access" && <AccessControl />}
      {tab === "settings" && <SecuritySettings />}
      {tab === "retention" && <Retention />}
      {tab === "incidents" && <Incidents />}
      {tab === "backups" && <Backups />}
    </>
  );
}
