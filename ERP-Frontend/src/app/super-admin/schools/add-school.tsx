"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { adminFetch, json, type Plan, type PlanMatrix } from "@/lib/admin-api";
import { ErrorBanner, Field, btnGhost, btnPrimary, inputCls, useLoad } from "@/components/admin/ui";

const STEPS = ["School details", "Documents", "Campus", "Plan", "School admin", "Modules", "Activate"];
const BOARDS = ["CBSE", "ICSE", "State Board", "IB", "Cambridge", "Montessori", "Play school"];
const TYPES = ["Co-ed day school", "Boys school", "Girls school", "Residential", "Day and residential"];
const MEDIUMS = ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Marathi", "Malayalam", "Bengali"];
const CLASSES = ["Playgroup – UKG", "Nursery – Class 5", "Nursery – Class 10", "Nursery – Class 12", "Class 1 – Class 12", "Class 6 – Class 12"];
const STATES = ["Andhra Pradesh", "Delhi", "Gujarat", "Haryana", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"];
const DOC_REG = ["Registration certificate", "Trust / society deed", "PAN of the trust", "State recognition certificate"];
const DOC_AFF = ["Board affiliation certificate", "Affiliation renewal letter", "No-objection certificate (NOC)"];

interface Doc { number: string; link: string }
interface Data {
  name: string; board: string; type: string; medium: string; classes: string; students: string; udise: string; affiliation: string; established: string; city: string; state: string; email: string; phone: string;
  docs: Record<string, Doc>;
  campusName: string; campusHead: string; campusAddress: string; campusPin: string;
  plan: string; start: "trial" | "paid";
  adminName: string; adminEmail: string; adminPhone: string;
  modules: Record<string, boolean>;
}
const blank: Data = {
  name: "", board: "CBSE", type: TYPES[0], medium: "English", classes: CLASSES[2], students: "", udise: "", affiliation: "", established: "", city: "", state: "Telangana", email: "", phone: "",
  docs: {}, campusName: "Main campus", campusHead: "", campusAddress: "", campusPin: "", plan: "", start: "trial", adminName: "", adminEmail: "", adminPhone: "", modules: {},
};

const needsBoardDocs = (board: string) => board !== "Play school" && board !== "Montessori";
const money = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const tempPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("") + "7#"; // ends with a number and a symbol, which the password rules may require
};

/** Add School: register a school in seven steps, from details to activation. Nothing is saved until the last step. */
export function AddSchool() {
  const plans = useLoad(() => adminFetch<{ plans: Plan[] }>("/plans"), []);
  const matrix = useLoad(() => adminFetch<PlanMatrix>("/plan-modules"), []);
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Data>(blank);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState<{ id: string; password: string; email: string } | null>(null);
  const [partial, setPartial] = useState<string | null>(null);

  const set = <K extends keyof Data>(k: K, v: Data[K]) => setD((x) => ({ ...x, [k]: v }));
  const planList = plans.data?.plans ?? [];
  const plan = planList.find((p) => p.code === d.plan) ?? planList[Math.min(1, planList.length - 1)];
  const students = Number(d.students) || 0;
  const included = useMemo(() => new Set(matrix.data?.plans.find((p) => p.code === plan?.code)?.module_codes ?? []), [matrix.data, plan?.code]);
  const isOn = (code: string) => d.modules[code] ?? included.has(code);
  const chosenModules = (matrix.data?.modules ?? []).filter((m) => m.is_core || isOn(m.code));
  const docRows = [...DOC_REG.map((t) => ({ t, cat: "registration" as const })), ...(needsBoardDocs(d.board) ? DOC_AFF.map((t) => ({ t, cat: "affiliation" as const })) : [])];
  const hasDoc = (t: string) => !!(d.docs[t]?.number.trim() || d.docs[t]?.link.trim());

  const problem = (s: number): string => {
    if (s === 0) {
      if (d.name.trim().length < 2) return "Enter the school name.";
      if (!students) return "Enter the number of students.";
      if (!d.city.trim()) return "Enter the city.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) return "Enter a valid school email.";
    }
    if (s === 1) {
      if (!hasDoc(DOC_REG[0])) return "Add the registration certificate's number or link.";
      if (needsBoardDocs(d.board) && !hasDoc(DOC_AFF[0])) return "Add the board affiliation certificate's number or link.";
    }
    if (s === 2) {
      if (!d.campusName.trim()) return "Enter the campus name.";
      if (!d.campusAddress.trim()) return "Enter the campus address.";
    }
    if (s === 3 && !plan) return "Choose a plan.";
    if (s === 4) {
      if (d.adminName.trim().length < 2) return "Enter the admin's name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.adminEmail.trim())) return "Enter a valid admin email.";
    }
    return "";
  };

  const next = () => {
    const p = problem(step);
    if (p) return setError(p);
    setError("");
    setStep(step + 1);
  };

  const activate = async () => {
    for (let s = 0; s < 5; s++) { const p = problem(s); if (p) { setStep(s); return setError(p); } }
    setError("");
    setPartial(null);
    const password = tempPassword();
    const [first, ...rest] = d.adminName.trim().split(/\s+/);
    let id = "";
    try {
      setBusy("Creating the school…");
      const created = await adminFetch<{ school: { id: string } }>("/schools", json("POST", {
        name: d.name.trim(), type: d.type, board: d.board, city: d.city.trim(), state: d.state, contact_email: d.email.trim(), contact_phone: d.phone.trim() || null,
        medium_of_instruction: d.medium, classes_offered: d.classes, student_estimate: students, udise_code: d.udise.trim() || null,
        affiliation_number: d.affiliation.trim() || null, established_year: d.established ? Number(d.established) : null,
        plan_code: plan!.code, status: d.start === "trial" ? "Trial" : "Active",
        admin: { first_name: first, last_name: rest.join(" ") || "Admin", email: d.adminEmail.trim(), password },
      }));
      id = created.school.id;
      setPartial(id);

      setBusy("Saving documents…");
      for (const { t, cat } of docRows) {
        if (!hasDoc(t)) continue;
        await adminFetch(`/schools/${id}/documents`, json("POST", { category: cat, doc_type: t, number: d.docs[t].number.trim() || null, file_url: d.docs[t].link.trim() || null }));
      }

      setBusy("Adding the campus…");
      await adminFetch(`/schools/${id}/campuses`, json("POST", {
        code: "MAIN", name: d.campusName.trim(), address: d.campusAddress.trim(), city: d.city.trim(), state: d.state, postal_code: d.campusPin.trim() || null, principal_name: d.campusHead.trim() || null, is_main: true,
      }));

      setBusy("Turning on modules…");
      await adminFetch(`/schools/${id}/modules`, json("PUT", { module_codes: chosenModules.map((m) => m.code) }));

      setDone({ id, password, email: d.adminEmail.trim() });
      setPartial(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while registering the school.");
    } finally {
      setBusy("");
    }
  };

  if (done) {
    return (
      <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-lg font-semibold text-emerald-900">{d.name} is registered</h2>
        <p className="text-sm text-emerald-900">The school, its campus and admin account are set up{d.start === "trial" ? " and a 14-day trial has started" : ""}.</p>
        <dl className="grid gap-1 text-sm text-slate-800">
          <div className="flex gap-2"><dt className="w-40 text-slate-500">Admin sign-in</dt><dd>{done.email}</dd></div>
          <div className="flex gap-2"><dt className="w-40 text-slate-500">Temporary password</dt><dd className="font-mono">{done.password}</dd></div>
        </dl>
        <p className="text-xs text-slate-600">Shown once. Share it securely; the admin must change it at first sign-in.</p>
        <div className="flex gap-3">
          <Link href={`/super-admin/schools/${done.id}`} className={btnPrimary}>Open the school</Link>
          <button type="button" className={btnGhost} onClick={() => { setDone(null); setD(blank); setStep(0); }}>Add another school</button>
        </div>
      </div>
    );
  }

  const text = (k: keyof Data, label: string, o: { type?: string; ph?: string; req?: boolean; hint?: string; full?: boolean } = {}): ReactNode => (
    <div className={o.full ? "sm:col-span-2" : ""}>
      <Field label={`${label}${o.req ? " *" : ""}`} hint={o.hint}>
        <input className={inputCls} type={o.type ?? "text"} placeholder={o.ph} value={String(d[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} />
      </Field>
    </div>
  );
  const pick = (k: keyof Data, label: string, options: string[]): ReactNode => (
    <Field label={label}>
      <select className={inputCls} value={String(d[k])} onChange={(e) => set(k, e.target.value as never)}>{options.map((o) => <option key={o}>{o}</option>)}</select>
    </Field>
  );

  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500">Add school → Enter school details → Upload documents → Create campus → Assign plan → Create school admin → Configure modules → Activate school</p>
      <ol className="flex gap-1.5 overflow-x-auto pb-1">
        {STEPS.map((w, i) => (
          <li key={w} className="flex-1">
            <button type="button" disabled={i > step} onClick={() => { setError(""); setStep(i); }}
              className={`flex w-full items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] ${i === step ? "border-[#41afda] bg-[#f3f9fd] font-semibold text-slate-900" : i < step ? "border-slate-200 bg-white text-slate-900" : "border-slate-200 bg-white text-slate-400"}`}>
              <span className={`grid size-6 place-items-center rounded-full border text-xs font-bold ${i === step ? "border-[#0294ce] bg-[#0294ce] text-white" : i < step ? "border-emerald-200 bg-emerald-100 text-emerald-800" : "border-slate-200 bg-slate-50"}`}>{i < step ? "✓" : i + 1}</span>
              {w}
            </button>
          </li>
        ))}
      </ol>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-baseline gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{STEPS[step]}</h2>
          <span className="text-sm text-slate-500">{[
            "Who the school is and where it is", needsBoardDocs(d.board) ? "Links and numbers for each certificate" : `Board affiliation is not required for ${d.board.toLowerCase()}s`,
            "Every school needs at least one campus. Add more later under Campus Management.", students ? `Prices for ${students.toLocaleString("en-IN")} students, before 18% GST` : "Price per student per year, before GST",
            "This person runs the school's portal and adds staff, students and parents", `Modules included in ${plan?.name ?? "the plan"} are on. Switch others on or off.`, "Check everything, then activate",
          ][step]}</span>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2"><ErrorBanner message={error} /></div>

          {step === 0 && (<>
            {text("name", "School name", { req: true, full: true, ph: "e.g. Green Valley High School" })}
            {pick("board", "Board", BOARDS)}{pick("type", "School type", TYPES)}{pick("medium", "Medium of instruction", MEDIUMS)}{pick("classes", "Classes offered", CLASSES)}
            {text("students", "Number of students", { type: "number", req: true, ph: "800" })}{text("udise", "UDISE+ code", { ph: "11 digits" })}
            {text("affiliation", "Affiliation number", { ph: "From the board certificate" })}{text("established", "Year established", { type: "number", ph: "2008" })}
            {text("city", "City", { req: true })}{pick("state", "State", STATES)}{text("email", "School email", { type: "email", req: true, ph: "office@school.edu.in" })}{text("phone", "School phone", { type: "tel", ph: "+91" })}
          </>)}

          {step === 1 && (<>
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-[13px] sm:col-span-2">
              Required: <b>Registration certificate</b>{needsBoardDocs(d.board) && <> and <b>Board affiliation certificate</b></>}. For each, enter its number, a link to the scanned file, or both. The rest can follow later.
            </p>
            {docRows.map(({ t }, i) => (
              <div key={t} className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-sm font-medium text-slate-800">{t}{(i === 0 || t === DOC_AFF[0]) && <span className="text-rose-600"> *</span>}</p>
                <input className={`${inputCls} mb-2`} placeholder="Certificate number" value={d.docs[t]?.number ?? ""} onChange={(e) => set("docs", { ...d.docs, [t]: { link: d.docs[t]?.link ?? "", number: e.target.value } })} />
                <input className={inputCls} placeholder="Link to the file (https://…)" value={d.docs[t]?.link ?? ""} onChange={(e) => set("docs", { ...d.docs, [t]: { number: d.docs[t]?.number ?? "", link: e.target.value } })} />
              </div>
            ))}
          </>)}

          {step === 2 && (<>
            {text("campusName", "Campus name", { req: true })}{text("campusHead", "Campus head", { ph: "Principal or campus in-charge" })}
            {text("campusAddress", "Address", { req: true, full: true, ph: "Building, street, area" })}{text("campusPin", "PIN code", { ph: "500081" })}
          </>)}

          {step === 3 && (<>
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-4">
              {planList.map((p) => {
                const on = (plan?.code ?? "") === p.code;
                return (
                  <label key={p.code} className={`relative flex cursor-pointer flex-col gap-1 rounded-2xl border p-4 ${on ? "border-[#41afda] bg-[#f3f9fd] ring-1 ring-[#41afda]" : "border-slate-200"}`}>
                    <input type="radio" name="plan" className="absolute right-3 top-3 accent-[#026f9b]" checked={on} onChange={() => { set("plan", p.code); set("modules", {}); }} />
                    <b className="text-[15px]">{p.name}</b>
                    <span className="text-lg font-bold">{money(p.price_per_student_paise)}<small className="text-xs font-normal text-slate-500"> / student / yr</small></span>
                    {students > 0 && <span className="text-xs text-slate-500">{money(p.price_per_student_paise * students)} a year</span>}
                    <span className="text-xs text-slate-500">{p.student_limit ? `Up to ${p.student_limit.toLocaleString("en-IN")} students` : "Unlimited students"}</span>
                  </label>
                );
              })}
            </div>
            <Field label="Start with">
              <select className={inputCls} value={d.start} onChange={(e) => set("start", e.target.value as Data["start"])}>
                <option value="trial">14-day free trial</option><option value="paid">Paid subscription from today</option>
              </select>
            </Field>
          </>)}

          {step === 4 && (<>
            {text("adminName", "Admin name", { req: true })}{text("adminEmail", "Admin email", { type: "email", req: true, hint: "Used to sign in" })}
            <p className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-[13px] sm:col-span-2">A temporary password is created when you activate the school. You will see it once, and the admin must change it at first sign-in.</p>
          </>)}

          {step === 5 && (
            <div className="grid gap-2 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-3">
              {(matrix.data?.modules ?? []).map((m) => {
                const on = m.is_core || isOn(m.code);
                return (
                  <label key={m.code} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${on ? "border-sky-200 bg-[#f3f9fd]" : "border-slate-200"}`}>
                    <input type="checkbox" className="mt-1 accent-[#026f9b]" checked={on} disabled={m.is_core} onChange={(e) => set("modules", { ...d.modules, [m.code]: e.target.checked })} />
                    <span><b className="block text-[13.5px]">{m.name}</b><small className="text-xs text-slate-500">{m.is_core ? "Always on" : included.has(m.code) ? "Included in plan" : "Add-on"}</small></span>
                  </label>
                );
              })}
            </div>
          )}

          {step === 6 && (
            <dl className="grid gap-2 text-sm sm:col-span-2 sm:grid-cols-[160px_1fr]">
              {([
                ["School", `${d.name} · ${d.board} · ${d.medium} medium`, 0], ["Location", `${d.city}, ${d.state}`, 0], ["Students", students.toLocaleString("en-IN"), 0],
                ["Documents", `${docRows.filter(({ t }) => hasDoc(t)).length} added`, 1], ["Campus", `${d.campusName} · ${d.campusAddress}`, 2],
                ["Plan", `${plan?.name ?? ""} · ${d.start === "trial" ? "14-day free trial" : "Paid from today"}`, 3],
                ["Annual value", plan ? `${money(plan.price_per_student_paise * students)} + GST` : "", 3], ["School admin", `${d.adminName} · ${d.adminEmail}`, 4],
                ["Modules", `${chosenModules.length} · ${chosenModules.map((m) => m.name).join(", ")}`, 5],
              ] as [string, string, number][]).map(([k, v, to]) => (
                <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd>{v} <button type="button" className="ml-1 text-xs font-semibold text-[#026f9b] hover:underline" onClick={() => setStep(to)}>Edit</button></dd></div>
              ))}
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] sm:col-span-2">
                Activating creates the school, its campus and admin account, turns on {chosenModules.length} modules{d.start === "trial" ? ", and starts a 14-day trial" : ", and starts the paid subscription"}.
              </p>
              {partial && error && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] sm:col-span-2">
                  The school was created, but a later step failed. <Link href={`/super-admin/schools/${partial}`} className="font-semibold text-[#026f9b] underline">Open it to finish setting it up</Link>.
                </p>
              )}
            </dl>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3.5">
          <span className="mr-auto text-sm text-slate-500">{busy || `Step ${step + 1} of ${STEPS.length}`}</span>
          {step > 0 && <button type="button" className={btnGhost} disabled={!!busy} onClick={() => { setError(""); setStep(step - 1); }}>Back</button>}
          {step < STEPS.length - 1
            ? <button type="button" className={btnPrimary} onClick={next}>Save and continue</button>
            : <button type="button" className="rounded-full bg-[#e53a35] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#ac2c28] disabled:opacity-60" disabled={!!busy || !!partial} onClick={() => void activate()}>{busy ? "Working…" : "Activate school"}</button>}
        </div>
      </section>
    </div>
  );
}
