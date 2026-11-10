"use client";

import { useState } from "react";
import { TabBar } from "@/components/admin/dash";
import { PageHeader } from "@/components/admin/ui";
import { ParentAccounts, StudentAccounts } from "./accounts";
import { LoginActivity } from "./activity";
import { Directory } from "./directory";

type Tab = "directory" | "students" | "parents" | "activity";

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>("directory");
  return (
    <>
      <PageHeader title="Users" subtitle="Everyone who signs in: platform team, school staff, students and parents." />
      <TabBar value={tab} onChange={setTab} tabs={[["directory", "Directory"], ["students", "Student accounts"], ["parents", "Parent accounts"], ["activity", "Login activity"]]} />
      {tab === "directory" && <Directory />}
      {tab === "students" && <StudentAccounts />}
      {tab === "parents" && <ParentAccounts />}
      {tab === "activity" && <LoginActivity />}
    </>
  );
}
