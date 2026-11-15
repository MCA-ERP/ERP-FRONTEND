export const small = "rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";

/** A short device description from a browser's user-agent text. */
export function deviceName(ua: string | null): string {
  if (!ua) return "Unknown device";
  const os = /Windows/i.test(ua) ? "Windows" : /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : /Mac OS/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return [br, os].filter(Boolean).join(" on ") || ua.slice(0, 40);
}

export const reasonLabel: Record<string, string> = {
  ok: "Signed in", bad_password: "Wrong password", locked: "Account locked", suspended: "Account turned off",
  school_inactive: "School not active", no_profile: "No ERP profile", unknown_email: "No such account", sign_out: "Signed out",
};

/** Downloads rows as a CSV file (done in the browser; nothing is stored). Cells starting with a formula character are neutralised. */
export function downloadCsv(filename: string, rows: string[][]) {
  const cell = (v: string) => {
    const safe = /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const blob = new Blob([rows.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
