"use client";

/** A row of small pills for the pages inside a tab. */
export function Pills<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: [T, string][]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="mb-4 flex flex-wrap gap-2">
      {items.map(([k, text]) => (
        <button key={k} type="button" role="tab" aria-selected={value === k} onClick={() => onChange(k)}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${value === k ? "border-[#026f9b] bg-white text-[#026f9b] shadow-sm" : "border-slate-200 bg-white/60 text-slate-600 hover:bg-white"}`}>
          {text}
        </button>
      ))}
    </div>
  );
}
