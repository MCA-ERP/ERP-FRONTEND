/**
 * Which portal a web address belongs to.
 *   admin.<domain>  the platform team (Super Admin)
 *   erp.<domain>    schools
 *   <domain>, www.  the public website
 * Anything else (localhost, *.vercel.app previews) has no rules, so development and previews keep working.
 * Set NEXT_PUBLIC_APP_DOMAIN (like myclassassist.in) so the public website's address is recognised too.
 * For local testing, admin.localhost:3000 and erp.localhost:3000 behave like the real subdomains.
 */
export type HostKind = "admin" | "erp" | "site" | "other";
export type PortalKind = Exclude<HostKind, "other">;

const ROOT = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

export function hostKindOf(host: string): HostKind {
  const h = host.toLowerCase().split(":")[0];
  if (h.startsWith("admin.")) return "admin";
  if (h.startsWith("erp.")) return "erp";
  if (ROOT && (h === ROOT || h === `www.${ROOT}`)) return "site";
  return "other";
}

/** The same address on another portal's host, keeping the port (for localhost). */
export function siblingHost(host: string, kind: PortalKind): string {
  const [name, port] = host.toLowerCase().split(":");
  const base = name.replace(/^(admin|erp|www)\./, "");
  const next = kind === "site" ? base : `${kind}.${base}`;
  return port ? `${next}:${port}` : next;
}

/** The portal a signed-in person belongs on. */
export const portalFor = (staff: boolean): "admin" | "erp" => (staff ? "admin" : "erp");
