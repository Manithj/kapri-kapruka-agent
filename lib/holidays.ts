// Built-in Sri Lankan gifting occasions for 2026. Dates are approximate for the
// lunar Poya days but close enough for "coming up" nudges; the user can always
// add their own occasions on top of these.

export interface Holiday {
  label: string;
  date: string; // YYYY-MM-DD
  emoji: string;
}

// Curated, gifting-relevant subset (full-moon Poya days + the big celebrations).
const HOLIDAYS_2026: Holiday[] = [
  { label: "Duruthu Poya", date: "2026-01-03", emoji: "🌕" },
  { label: "Valentine's Day", date: "2026-02-14", emoji: "💝" },
  { label: "Navam Poya", date: "2026-02-01", emoji: "🌕" },
  { label: "Medin Poya", date: "2026-03-03", emoji: "🌕" },
  { label: "Bak Poya", date: "2026-04-01", emoji: "🌕" },
  { label: "Sinhala & Tamil New Year (Avurudu)", date: "2026-04-13", emoji: "🎏" },
  { label: "Vesak Poya", date: "2026-05-01", emoji: "🪔" },
  { label: "Mother's Day", date: "2026-05-10", emoji: "💐" },
  { label: "Poson Poya", date: "2026-05-31", emoji: "🌕" },
  { label: "Father's Day", date: "2026-06-21", emoji: "👔" },
  { label: "Esala Poya", date: "2026-06-29", emoji: "🌕" },
  { label: "Nikini Poya", date: "2026-07-28", emoji: "🌕" },
  { label: "Binara Poya", date: "2026-08-27", emoji: "🌕" },
  { label: "Vap Poya", date: "2026-09-25", emoji: "🌕" },
  { label: "Deepavali", date: "2026-11-08", emoji: "🪔" },
  { label: "Ill Poya", date: "2026-10-25", emoji: "🌕" },
  { label: "Christmas", date: "2026-12-25", emoji: "🎄" },
];

function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + "T00:00:00Z").getTime();
  const b = new Date(toISO + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

export interface UpcomingHoliday extends Holiday {
  inDays: number;
}

// Holidays within `horizonDays` of `todayISO`, soonest first.
export function upcomingHolidays(todayISO: string, horizonDays = 30): UpcomingHoliday[] {
  return HOLIDAYS_2026.map((h) => ({ ...h, inDays: daysBetween(todayISO, h.date) }))
    .filter((h) => h.inDays >= 0 && h.inDays <= horizonDays)
    .sort((a, b) => a.inDays - b.inDays);
}
