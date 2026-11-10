"use client";

import { useEffect, useState } from "react";
import { adminFetch, json } from "@/lib/admin-api";
import { useAction, fmtDay } from "@/components/admin/dash";
import { ErrorBanner, Field, Modal, btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";
import { PricingBadge, rupees, type Quote } from "./shared";

/** Shows what a school would be charged for a renewal, lets a coupon or billing cycle be tried, and issues the invoice. */
export function RenewModal({ school, onClose, onDone }: { school: { id: string; name: string } | null; onClose: () => void; onDone: () => void }) {
  const [coupon, setCoupon] = useState("");
  const [cycle, setCycle] = useState<"annual" | "quarterly" | "">("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [problem, setProblem] = useState("");
  const [issued, setIssued] = useState(false);
  const act = useAction(() => undefined);

  useEffect(() => { setCoupon(""); setCycle(""); setQuote(null); setProblem(""); setIssued(false); }, [school?.id]);

  const body = () => ({ coupon_code: coupon.trim() || undefined, cycle: cycle || undefined });
  const preview = async () => {
    if (!school) return;
    setProblem("");
    try {
      setQuote(await adminFetch<Quote>(`/subscriptions/schools/${school.id}/renewal-preview`, json("POST", body())));
    } catch (e) {
      setQuote(null);
      setProblem(e instanceof Error ? e.message : "Could not work out the price.");
    }
  };
  useEffect(() => { if (school) void preview(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [school?.id, cycle]);

  const issue = async () => {
    if (!school) return;
    if (await act.run(() => adminFetch(`/subscriptions/schools/${school.id}/renew`, json("POST", body())))) { setIssued(true); onDone(); }
  };

  return (
    <Modal open={!!school} title={`Renewal invoice: ${school?.name ?? ""}`} onClose={onClose}>
      {issued ? (
        <div className="space-y-4">
          <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">The invoice was issued and the school has been told. When it is paid, the subscription renews by itself.</p>
          <div className="flex justify-end"><button type="button" className={btnPrimary} onClick={onClose}>Done</button></div>
        </div>
      ) : (
        <div className="space-y-3">
          <ErrorBanner message={act.error || problem} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Coupon code (optional)"><input className={inputCls} value={coupon} onChange={(e) => setCoupon(e.target.value)} onBlur={preview} placeholder="e.g. WELCOME10" /></Field>
            <Field label="Billing cycle">
              <select className={inputCls} value={cycle} onChange={(e) => setCycle(e.target.value as typeof cycle)}>
                <option value="">School&apos;s current cycle</option><option value="annual">Annual</option><option value="quarterly">Quarterly</option>
              </select>
            </Field>
          </div>
          {quote && (
            <div className="space-y-2 rounded-xl border border-slate-200 p-4 text-sm">
              <div className="flex items-center justify-between"><span className="font-semibold text-slate-900">{quote.plan_name} · {quote.cycle}</span><PricingBadge applied={quote.applied} /></div>
              <p className="text-slate-600">{fmtDay(quote.period_start)} to {fmtDay(quote.period_end)}</p>
              <p className="text-slate-600">{quote.students.toLocaleString("en-IN")} students × {rupees(quote.unit_price_paise)}{quote.unit_price_paise < quote.list_price_paise / (quote.cycle === "quarterly" ? 4 : 1) ? <span className="text-slate-400"> (list {rupees(quote.cycle === "quarterly" ? Math.round(quote.list_price_paise / 4) : quote.list_price_paise)})</span> : null}</p>
              {quote.addons.map((a) => <p key={a.name} className="text-slate-600">+ {a.name}: {quote.students.toLocaleString("en-IN")} × {rupees(a.unit_price_paise)}</p>)}
              <p className="border-t border-slate-100 pt-2 font-bold text-slate-900">{rupees(quote.total_paise)} <span className="text-xs font-normal text-slate-500">before GST</span></p>
              {quote.note && <p className="text-xs text-amber-700">{quote.note}</p>}
              <p className="text-xs text-slate-400">One discount applies: a negotiated price, otherwise the better of an offer or the coupon.</p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
            <button type="button" className={btnPrimary} disabled={act.busy || !quote} onClick={issue}>Issue invoice</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
