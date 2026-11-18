"use client";

/** A switch: a pill with a white knob, in the brand blue when on. */
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-10 flex-none rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0294ce]/30 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-[#0294ce]" : "bg-slate-300"}`}>
      <span className={`absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : ""}`} />
    </button>
  );
}
