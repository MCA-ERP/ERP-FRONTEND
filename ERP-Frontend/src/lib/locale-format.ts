/** How dates and times are shown across the admin portal. Set from Settings → Date & time. */
export interface LocaleConfig {
  timeZone: string;
  dateFormat: string;
  hour12: boolean;
  seconds: boolean;
}

let config: LocaleConfig = { timeZone: "Asia/Kolkata", dateFormat: "DD MMM YYYY", hour12: true, seconds: false };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Takes the `locale` block of /public/branding. Unknown values keep the current setting. */
export function setLocaleConfig(l: { time_zone?: string; date_format?: string; time_format?: string; show_seconds?: boolean } | null | undefined) {
  if (!l) return;
  config = {
    timeZone: l.time_zone || config.timeZone,
    dateFormat: l.date_format || config.dateFormat,
    hour12: l.time_format ? l.time_format !== "24h" : config.hour12,
    seconds: l.show_seconds ?? config.seconds,
  };
}

export const getLocaleConfig = () => config;

function partsOf(date: Date, timeZone: string): Record<string, string> {
  const make = (tz: string) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  let parts;
  try {
    parts = make(timeZone);
  } catch {
    parts = make("Asia/Kolkata");
  }
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

/** A calendar date in the chosen format, from year, month (1-12) and day. */
export function formatYmd(y: string, m: string, d: string, format = config.dateFormat): string {
  switch (format) {
    case "DD/MM/YYYY": return `${d}/${m}/${y}`;
    case "MM/DD/YYYY": return `${m}/${d}/${y}`;
    case "YYYY-MM-DD": return `${y}-${m}-${d}`;
    default: return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
  }
}

/** A moment as date and time, in the platform time zone. */
export function formatDateTime(iso: string | Date, cfg: LocaleConfig = config): string {
  const p = partsOf(new Date(iso), cfg.timeZone);
  const date = formatYmd(p.year, p.month, p.day, cfg.dateFormat);
  const h = Number(p.hour);
  const clock = cfg.hour12
    ? `${h % 12 === 0 ? 12 : h % 12}:${p.minute}${cfg.seconds ? ":" + p.second : ""} ${h < 12 ? "am" : "pm"}`
    : `${p.hour}:${p.minute}${cfg.seconds ? ":" + p.second : ""}`;
  return `${date}, ${clock}`;
}

/** A plain calendar date (YYYY-MM-DD) in the chosen format. No time zone shifting, since it has no time. */
export function formatDayOnly(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return m ? formatYmd(m[1], m[2], m[3]) : ymd;
}
