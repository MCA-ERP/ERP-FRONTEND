import { redirect } from "next/navigation";

/** The old demo dashboard has been replaced by the school portal. */
export default function LegacyDashboard() {
  redirect("/school");
}
