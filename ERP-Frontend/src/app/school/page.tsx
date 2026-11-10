"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { schoolFetch, type SetupStatus } from "@/lib/school-api";
import { Card, ErrorBanner, Modal, PageHeader, btnPrimary, useLoad } from "@/components/admin/ui";
import { StatGrid, num } from "@/components/admin/dash";
import { useSchool } from "./context";

interface Notice {
  id: string;
  title: string;
  body: string;
  sent_at: string;
  kind: "announcement" | "banner" | "alert" | "popup";
  read: boolean;
}

interface Stats {
  totalStudents: number;
  totalFaculty: number;
  totalGrades: number;
  totalSections: number;
}

const stepLink: Record<string, string> = {
  year: "/school/setup?tab=years",
  grades: "/school/setup?tab=grades",
  sections: "/school/setup?tab=sections",
  subjects: "/school/setup?tab=subjects",
  students: "/school/students",
};

export default function SchoolHomePage() {
  const { user, school, can, hasModule } = useSchool();
  const canView = can("sis.student.view") && hasModule("student_information");

  const status = useLoad(() => (canView ? schoolFetch<SetupStatus>("/school/setup/status") : Promise.resolve(null)), [canView]);
  const stats = useLoad(() => (canView ? schoolFetch<Stats>("/sis/stats") : Promise.resolve(null)), [canView]);

  const notices = useLoad(() => schoolFetch<{ announcements: Notice[] }>("/school/announcements"), []);

  const [dismissed, setDismissed] = useState<string[]>([]);
  const markRead = (id: string) => {
    setDismissed((d) => [...d, id]);
    void schoolFetch("/school/announcements/" + id + "/read", { method: "POST" }).catch(() => undefined);
  };
  const all = notices.data?.announcements ?? [];
  const strips = all.filter((n) => (n.kind === "banner" || n.kind === "alert") && !n.read && !dismissed.includes(n.id));
  const popup = all.find((n) => n.kind === "popup" && !n.read && !dismissed.includes(n.id));
  const plain = all.filter((n) => n.kind === "announcement");
  // plain announcements count as read once the home page has shown them
  useEffect(() => {
    plain.filter((n) => !n.read).forEach((n) => void schoolFetch("/school/announcements/" + n.id + "/read", { method: "POST" }).catch(() => undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notices.data]);

  const done = status.data?.steps.filter((s) => s.done).length ?? 0;
  const total = status.data?.steps.length ?? 0;

  return (
    <>
      <PageHeader title={`Welcome, ${user.email.split("@")[0]}`} subtitle={school.name} />
      <ErrorBanner message={status.error || stats.error} />

      {strips.map((n) => (
        <div key={n.id} role="alert" className={"mb-3 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm " + (n.kind === "alert" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-mca-blue/30 bg-mca-blue-sky/60 text-mca-blue-dark")}>
          <div className="flex-1"><p className="font-semibold">{n.title}</p><p className="whitespace-pre-wrap">{n.body}</p></div>
          <button type="button" className="text-xs font-semibold underline" onClick={() => markRead(n.id)}>Dismiss</button>
        </div>
      ))}
      <Modal open={!!popup} title={popup?.title ?? ""} onClose={() => popup && markRead(popup.id)}>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{popup?.body}</p>
        <div className="mt-4 flex justify-end"><button type="button" className={btnPrimary} onClick={() => popup && markRead(popup.id)}>Got it</button></div>
      </Modal>

      {plain.length > 0 && (
        <Card className="mb-6">
          <div className="border-b border-slate-100 px-5 py-3"><h2 className="text-base text-slate-900">From My Class Assist</h2></div>
          <ul className="divide-y divide-slate-100">
            {plain.slice(0, 3).map((n) => (
              <li key={n.id} className="px-5 py-3">
                <p className="font-semibold text-slate-900">{n.title}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">{n.body}</p>
                <p className="mt-1 text-xs text-slate-400">{new Date(n.sent_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {stats.data && (
        <StatGrid
          items={[
            { label: "Students", value: num(stats.data.totalStudents), sub: "Currently enrolled" },
            { label: "Teachers", value: num(stats.data.totalFaculty) },
            { label: "Grades", value: num(stats.data.totalGrades) },
            { label: "Sections", value: num(stats.data.totalSections) },
          ]}
        />
      )}

      {status.data && !status.data.complete && (
        <Card className="mt-6">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base text-slate-900">Get your school ready</h2>
            <p className="mt-1 text-sm text-slate-500">{done} of {total} steps done</p>
            <div className="mt-3 h-2 overflow-hidden rounded bg-slate-100">
              <div className="h-full rounded bg-mca-green" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {status.data.steps.map((s) => (
              <li key={s.key} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span
                  aria-hidden="true"
                  className={`grid size-5 place-items-center rounded-full text-xs font-bold ${s.done ? "bg-mca-green text-white" : "border border-slate-300 text-transparent"}`}
                >
                  ✓
                </span>
                <span className={s.done ? "text-slate-400 line-through" : "font-semibold text-slate-800"}>{s.label}</span>
                {!s.done && (
                  <Link href={stepLink[s.key]} className="ml-auto text-xs font-semibold text-mca-blue hover:underline">
                    Start
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {status.data?.complete && (
        <Card className="mt-6 p-5 text-sm text-slate-600">Your school is set up. More modules will appear here as your plan includes them.</Card>
      )}

      {!canView && !status.loading && (
        <Card className="mt-6 p-5 text-sm text-slate-600">Your account does not have access to student records yet.</Card>
      )}
    </>
  );
}
