"use client";

import { useState } from "react";
import { TabBar } from "@/components/admin/dash";
import { PageHeader } from "@/components/admin/ui";
import { DataPermissions, MenuAccess } from "./access";
import { Assignment } from "./assignment";
import { PermissionAudit } from "./audit";
import { Catalogue } from "./catalogue";
import { Approvals, PermissionMatrix } from "./matrix";
import { RolePermissions } from "./role-permissions";

type Tab = "catalogue" | "matrix" | "detail" | "approvals" | "access" | "data" | "assignment" | "audit";
const TABS: [Tab, string][] = [
  ["catalogue", "Roles"], ["matrix", "Permissions"], ["detail", "Role permissions"], ["approvals", "Approvals"],
  ["access", "Menu access"], ["data", "Data"], ["assignment", "Assignment"], ["audit", "Audit"],
];

export default function RolesPage() {
  const [tab, setTab] = useState<Tab>("catalogue");
  return (
    <>
      <PageHeader title="Roles & permissions" subtitle="Who can do what: default and custom roles, access to menus and modules, approvals and a full history." />
      <TabBar value={tab} onChange={setTab} tabs={TABS} />
      {tab === "catalogue" && <Catalogue onOpenPermissions={() => setTab("detail")} />}
      {tab === "matrix" && <PermissionMatrix />}
      {tab === "detail" && <RolePermissions />}
      {tab === "approvals" && <Approvals />}
      {tab === "access" && <MenuAccess />}
      {tab === "data" && <DataPermissions />}
      {tab === "assignment" && <Assignment />}
      {tab === "audit" && <PermissionAudit />}
    </>
  );
}
