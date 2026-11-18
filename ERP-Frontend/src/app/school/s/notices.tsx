"use client";

import { useEffect, useState } from "react";
import { schoolFetch } from "@/lib/school-api";
import { Card, Modal, btnPrimary, useLoad } from "@/components/admin/ui";

interface Notice { id: string; title: string; body: string; sent_at: string; kind: "announcement" | "banner" | "alert" | "popup"; read: boolean }

/** What My Class Assist has sent this school: strips, a pop-up, and plain announcements. Renders nothing when there is nothing. */
export function PlatformNotices() {
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
  // plain announcements count as read once they have been shown
  useEffect(() => {
    plain.filter((n) => !n.read).forEach((n) => void schoolFetch("/school/announcements/" + n.id + "/read", { method: "POST" }).catch(() => undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notices.data]);

  return (
    <>
      {strips.map((n) => (
        <div key={n.id} role="alert" className={"mb-3 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm " + (n.kind === "alert" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-sky-200 bg-sky-50 text-sky-900")}>
          <div className="flex-1"><p className="font-semibold">{n.title}</p><p className="whitespace-pre-wrap">{n.body}</p></div>
          <button type="button" className="text-xs font-semibold underline" onClick={() => markRead(n.id)}>Dismiss</button>
        </div>
      ))}
      <Modal open={!!popup} title={popup?.title ?? ""} onClose={() => popup && markRead(popup.id)}>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{popup?.body}</p>
        <div className="mt-4 flex justify-end"><button type="button" className={btnPrimary} onClick={() => popup && markRead(popup.id)}>Got it</button></div>
      </Modal>
      {plain.length > 0 && (
        <Card className="mb-5">
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
    </>
  );
}
