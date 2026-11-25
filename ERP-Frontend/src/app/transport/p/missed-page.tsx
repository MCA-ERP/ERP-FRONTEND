"use client";

import { schoolFetch } from "@/lib/school-api";
import { Chip } from "@/components/admin/dash-ui";
import { ErrorBanner, useLoad } from "@/components/admin/ui";
import { Head } from "../../teacher/t/head";
import { Loading } from "../../teacher/t/dash-pages";
import { Filtered } from "./ui";

interface Missed { student_id: string; student: string; class_label: string; trip: string; stop: string; status: string; resolution: string }
const tone = (s: string) => (s === "Found" ? "good" : s === "Missing at stop" ? "bad" : "warn") as "good" | "bad" | "warn";

/** Today's children who were expected on a bus and didn't board, including those found since. */
export function MissedBoardings() {
  const { data: x, error, loading } = useLoad(() => schoolFetch<{ items: Missed[] }>("/school/tr/missed"), []);
  return (
    <div data-report>
      <Head title="Missed Boardings" subtitle="Students who were expected on a bus but didn't board, and what happened. Each one alerted the transport desk and the parent." />
      <ErrorBanner message={error} />
      <Loading on={loading && !x} />
      {x && <Filtered title="Missed boardings today" noun="students" exportName="missed-boardings" empty="Nobody missed the bus today." head={["Student", "Class", "Trip", "Stop", "Status", "Resolution"]}
        rows={x.items.map((m) => { const klass = m.class_label.replace(/^Class /, ""); return { key: `${m.student_id}:${m.trip}`, find: `${m.student} ${klass} ${m.trip} ${m.stop} ${m.status} ${m.resolution}`, out: [m.student, klass, m.trip, m.stop, m.status, m.resolution], cells: [<b key="n" className="font-semibold text-slate-900">{m.student}</b>, klass, m.trip, m.stop, <Chip key="s" tone={tone(m.status)}>{m.status}</Chip>, m.resolution] }; })} />}
    </div>
  );
}
