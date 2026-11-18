import SiteHome from "./site-home";

/**
 * The public front page of myclassassist.in while the new website is being built.
 * The ERP itself (sign-in and every portal) lives on the app addresses (erp. and sch.), where "/" goes straight to the
 * sign-in page (see redirects in next.config.js). Everything on this page opens an "under construction" pop-up.
 */
export default function Home() {
  return <SiteHome />;
}
