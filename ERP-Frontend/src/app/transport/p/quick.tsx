"use client";

import { QuickActions } from "@/components/admin/quick-actions";
import { goTo } from "./menu-config";

const ACTIONS: { label: string; mark: string; href: string }[] = [
  { label: "Trip tracking", mark: "◉", href: goTo("tracking") },
  { label: "Bus attendance", mark: "✓", href: goTo("tracking", "trip-roster") },
  { label: "Routes and stops", mark: "R", href: goTo("routes") },
  { label: "Student allocation", mark: "S", href: goTo("allocation") },
  { label: "Vehicles", mark: "V", href: goTo("vehicles") },
  { label: "Drivers and attendants", mark: "D", href: goTo("crew") },
  { label: "Transport fees", mark: "₹", href: goTo("fees") },
  { label: "Parent updates", mark: "✉", href: goTo("parents") },
];
/** Quick actions and Recent pages above every tab of the Transport Dashboard. */
export const TransportQuickActions = () => <QuickActions portal="transport" chips actions={ACTIONS} />;
