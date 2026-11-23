import Link from "next/link";

const STEPS: [string, string][] = [["Fee categories", "fee-categories/fee-categories"], ["Class-wise structures", "fee-structures/fee-structures"], ["Assign to students", "fee-assignment/fee-assignment"], ["Generate dues", "installment-dues/installment-dues"], ["Parent views dues", "parent-payment/parent-payment"], ["Receipt & ledger", "receipts-ledger/receipts-ledger"], ["Dashboard updates", "dashboard/finance-dashboard"]];
/** The seven steps of how fees flow; the active one is highlighted. Every step is a link to its page. */
export const FLOW_HREFS = STEPS.map((s) => s[1]);

export function FlowStrip({ active }: { active: number }) {
  return <ol className="mb-5 flex flex-wrap gap-2.5" aria-label="How fees flow">{STEPS.map(([label, href], i) => <li key={label}><Link href={`/accounts/${href}`} aria-current={i + 1 === active ? "step" : undefined} className={`flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-[12px] hover:border-slate-400 ${i + 1 === active ? "border-[#0294CE] font-semibold text-slate-900 ring-1 ring-[#0294CE]/40" : "border-slate-200 text-slate-600"}`}><span className={`grid size-5 place-items-center rounded-full text-[11px] font-bold ${i + 1 === active ? "bg-[#026f9b] text-white" : "bg-slate-100 text-slate-600"}`}>{i + 1}</span>{label}</Link></li>)}</ol>;
}
