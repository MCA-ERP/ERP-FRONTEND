import { headers } from "next/headers";
import Image from "next/image";

/**
 * The public front page of myclassassist.in while the new website is being built.
 * The ERP itself (sign-in and every portal) lives on the app address, set by NEXT_PUBLIC_ADMIN_DASHBOARD_URL.
 * On the app address itself, "/" goes straight to the sign-in page (see redirects in next.config.js).
 */
const APP_URL = (process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_URL || "https://erp.myclassassist.in").replace(/\/$/, "");

export default async function Home() {
  // Only the public main domain sends people to the app address. On localhost or the app address itself, "Log in" stays on the same site.
  const host = ((await headers()).get("host") ?? "").toLowerCase();
  const rootDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN || "").toLowerCase();
  const onMainDomain = !!rootDomain && (host === rootDomain || host === `www.${rootDomain}`);
  const loginHref = onMainDomain ? `${APP_URL}/login` : "/login";

  return (
    <main className="min-h-screen bg-white">
      <div role="status" className="border-b border-sky-200 bg-mca-blue-sky px-4 py-3 text-center text-sm text-slate-700">
        <strong className="font-semibold text-slate-900">We are currently enhancing our website to serve you better.</strong>{" "}
        Our new website will be launching shortly with improved features, a refreshed design, and an enhanced user experience.
        Thank you for your patience and understanding. We look forward to welcoming you soon.
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Image src="/mca-logo.svg" alt="My Class Assist" width={160} height={90} priority style={{ width: "160px", height: "auto" }} />
        <a href={loginHref} className="rounded-full bg-mca-blue px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90">
          Log in
        </a>
      </header>

      <section className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 pb-24 pt-16 md:pt-24">
        <span className="rounded-full bg-mca-green-mint px-4 py-1.5 text-xs font-semibold text-mca-green-deep">Cloud school ERP · Coming soon</span>
        <h1 className="max-w-2xl text-5xl font-extrabold leading-tight text-slate-900 md:text-6xl">Your school, assisted.</h1>
        <p className="max-w-xl text-lg text-slate-600">
          My Class Assist runs admissions, fees, academics, attendance, transport and parent communication from one place, so your staff spend
          less time on paperwork and more time with students.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={loginHref} className="rounded-full bg-mca-blue px-7 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90">
            Log in to My Class Assist
          </a>
          <a href="mailto:support@myclassassist.in" className="rounded-full border border-mca-blue px-7 py-3 text-sm font-semibold text-mca-blue hover:bg-mca-blue-sky">
            Contact us
          </a>
        </div>
      </section>

      <footer className="border-t border-slate-100 px-6 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} My Class Assist · support@myclassassist.in
      </footer>
    </main>
  );
}
