"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";

const NOTICE_TITLE = "We are currently enhancing our website to serve you better.";
const NOTICE_BODY =
  "Our new website will be launching shortly with improved features, a refreshed design, and an enhanced user experience. Thank you for your patience and understanding. We look forward to welcoming you soon.";

const NAV = ["Modules", "Why MCA", "Mobile app", "Getting started", "Schools", "Contact"];

/**
 * The public front page of myclassassist.in while the new website is being built.
 * Everything on it that can be clicked opens the same "under construction" pop-up, so nobody lands on a dead link.
 */
export default function SiteHome() {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  const show = useCallback((from?: Element | null) => {
    opener.current = (from as HTMLElement | null) ?? null;
    setOpen(true);
  }, []);

  // One handler for the whole page: any link or button opens the pop-up instead of going anywhere.
  const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    if (target.closest("[data-dialog]") || target.closest("[data-go]")) return; // [data-go] links really go (the family sign-up)
    const hit = target.closest("a, button, [role='button']");
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    show(hit);
  };

  return (
    <div onClickCapture={onClickCapture} className="min-h-screen bg-white text-slate-900">
      <div role="status" className="border-b border-sky-200 bg-[#dceff9] px-4 py-3 text-center text-[13px] leading-relaxed text-slate-700 sm:text-sm">
        <strong className="font-semibold text-slate-900">{NOTICE_TITLE}</strong> {NOTICE_BODY}
      </div>

      <header className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
        <a href="#top" aria-label="My Class Assist home" className="shrink-0">
          <Image src="/mca-logo.svg" alt="My Class Assist" width={112} height={64} priority style={{ width: "96px", height: "auto" }} />
        </a>
        <nav aria-label="Main" className="order-3 hidden w-full justify-center gap-6 text-[13px] font-medium text-slate-900 md:order-none md:flex md:w-auto">
          {NAV.map((n) => <a key={n} href={`#${n.toLowerCase().replace(/\s+/g, "-")}`} className="hover:text-[#026f9b]">{n}</a>)}
        </nav>
        <div className="flex items-center gap-3">
          <a href="/apply" data-go="" className="rounded-full border border-[#026f9b] px-5 py-2 text-[13px] font-semibold text-[#026f9b] hover:bg-[#dceff9]">Apply for admission</a>
          <button type="button" className="rounded-full border border-[#026f9b] px-5 py-2 text-[13px] font-semibold text-[#026f9b] hover:bg-[#dceff9]">School Log in</button>
          <button type="button" className="rounded-full bg-[#026f9b] px-5 py-2 text-[13px] font-semibold text-white hover:bg-[#014a67]">Parent Login</button>
          <button type="button" aria-label="Open menu" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 md:hidden">
            <span className="block h-0.5 w-4 bg-slate-800 shadow-[0_5px_0_#1e293b,0_-5px_0_#1e293b]" />
          </button>
        </div>
      </header>

      <main id="top" className="mx-auto grid max-w-[1200px] items-center gap-10 px-6 pb-20 pt-10 md:grid-cols-[1fr_1.05fr] md:pt-16">
        <section>
          <span className="inline-block rounded-full bg-[#d9efe8] px-3.5 py-1.5 text-xs font-semibold text-[#065740]">Cloud school ERP</span>
          <h1 className="mt-5 max-w-md text-[44px] font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-[56px]">Your school, assisted.</h1>
          <p className="mt-5 max-w-[30rem] text-[15px] leading-relaxed text-slate-700">
            My Class Assist runs admissions, fees, academics, attendance, transport and parent communication from one place — so your staff spend less time on paperwork and more time with students.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" className="rounded-full bg-[#e53a35] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#ac2c28]">Book a free demo</button>
            <button type="button" className="rounded-full border border-[#026f9b] px-6 py-3 text-sm font-semibold text-[#026f9b] hover:bg-[#dceff9]">Explore modules</button>
          </div>
        </section>
        <Mockup />
      </main>

      <footer className="border-t border-slate-100 px-6 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} My Class Assist ·{" "}
        <a href="mailto:support@myclassassist.in" className="underline hover:text-[#026f9b]">support@myclassassist.in</a>
      </footer>

      {open && <ConstructionDialog onClose={() => { setOpen(false); opener.current?.focus?.(); }} />}
    </div>
  );
}

function ConstructionDialog({ onClose }: { onClose: () => void }) {
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ok.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // keep focus inside the dialog
      if (e.key === "Tab") { e.preventDefault(); ok.current?.focus(); }
    };
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div data-dialog className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="uc-title" aria-describedby="uc-body" className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl">
        <span aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#dceff9] text-2xl">🚧</span>
        <h2 id="uc-title" className="mt-4 text-xl font-bold text-slate-900">Website under construction</h2>
        <p id="uc-body" className="mt-3 text-sm leading-relaxed text-slate-700">
          <strong className="font-semibold text-slate-900">{NOTICE_TITLE}</strong> {NOTICE_BODY}
        </p>
        <button ref={ok} type="button" onClick={onClose} className="mt-6 rounded-full bg-[#026f9b] px-8 py-2.5 text-sm font-semibold text-white hover:bg-[#014a67]">Okay</button>
      </div>
    </div>
  );
}

/** A drawn laptop and phone showing the dashboard, so the page has a picture without any image file. */
function Mockup() {
  const bars = [38, 58, 44, 92, 70, 52, 34];
  return (
    <div aria-hidden="true" className="relative rounded-[28px] bg-[#dceff9] p-6 pb-10 sm:p-8">
      <div className="rounded-xl border-[6px] border-[#1b2434] bg-white p-3 shadow-lg">
        <div className="grid grid-cols-[22%_1fr] gap-3">
          <div className="space-y-2 rounded-lg bg-[#f3f9fd] p-2">
            <div className="h-2 w-3/4 rounded bg-[#026f9b]" />
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className={`h-1.5 rounded ${i === 0 ? "bg-[#7ec8e8]" : "bg-[#dbe7ee]"}`} />)}
          </div>
          <div>
            <div className="mb-2 h-1.5 w-1/3 rounded bg-slate-300" />
            <div className="grid grid-cols-4 gap-1.5">
              {["#dceff9", "#d9efe8", "#fce0df", "#c0e4f3"].map((c, i) => (
                <div key={c} className="rounded-md p-1.5" style={{ background: c }}><div className="h-1 w-1/2 rounded" style={{ background: ["#026f9b", "#0a7f5b", "#e53a35", "#026f9b"][i] }} /><div className="mt-1 h-1.5 w-3/4 rounded bg-slate-400/60" /></div>
              ))}
            </div>
            <div className="mt-2 flex h-28 items-end gap-2 rounded-lg border border-slate-100 p-2 sm:h-32">
              {bars.map((h, i) => <div key={i} className={`flex-1 rounded-t ${i === 3 ? "bg-[#41afda]" : "bg-[#b9e0f2]"}`} style={{ height: `${h}%` }} />)}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto h-2.5 w-[104%] -translate-x-[2%] rounded-b-xl bg-[#1b2434]" />

      <div className="absolute -bottom-4 right-5 w-[26%] min-w-[96px] rounded-[18px] border-[5px] border-[#1b2434] bg-white p-2 shadow-xl sm:right-8">
        <div className="mx-auto mb-2 h-1 w-6 rounded bg-slate-300" />
        <div className="rounded-md bg-[#dceff9] p-1.5"><div className="h-1 w-1/2 rounded bg-[#026f9b]" /><div className="mt-1 h-1.5 w-3/4 rounded bg-slate-400/60" /></div>
        {[["#d9efe8", "#0a7f5b"], ["#fce0df", "#e53a35"], ["#d9efe8", "#0a7f5b"]].map(([bg, dot], i) => (
          <div key={i} className="mt-1.5 flex items-center justify-between gap-1 rounded-md border border-slate-100 p-1.5"><div className="h-1.5 w-1/2 rounded bg-slate-300" /><span className="h-2 w-4 rounded-full" style={{ background: bg, boxShadow: `inset 0 0 0 1px ${dot}33` }} /></div>
        ))}
      </div>
    </div>
  );
}
