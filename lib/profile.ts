// Unified client-side profile store. One localStorage key backs memory,
// occasions, order history and the active budget. The server stays stateless —
// a compact WireProfile is computed here and sent up in each request body.

import type {
  KapriProfile,
  ProfileOccasion,
  ProfileOp,
  ProfileOrder,
  WireProfile,
} from "./types";
import { upcomingHolidays } from "./holidays";

const KEY = "kapri_profile";

export function emptyProfile(): KapriProfile {
  return { v: 1, recipients: [], occasions: [], orders: [] };
}

export function loadProfile(): KapriProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProfile();
    const p = JSON.parse(raw);
    if (!p || p.v !== 1) return emptyProfile();
    return {
      v: 1,
      language: p.language,
      defaultCity: p.defaultCity,
      budget: p.budget ?? null,
      recipients: Array.isArray(p.recipients) ? p.recipients : [],
      occasions: Array.isArray(p.occasions) ? p.occasions : [],
      orders: Array.isArray(p.orders) ? p.orders : [],
    };
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(p: KapriProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

const rid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// Pure reducer — applies a profile_op (or order log) to produce a new profile.
export function applyProfileOp(p: KapriProfile, op: ProfileOp): KapriProfile {
  const next: KapriProfile = {
    ...p,
    recipients: [...p.recipients],
    occasions: [...p.occasions],
    orders: [...p.orders],
  };
  switch (op.op) {
    case "remember_recipient": {
      const existing = next.recipients.find(
        (r) => r.name.toLowerCase() === op.name.toLowerCase()
      );
      if (existing) {
        if (op.relationship) existing.relationship = op.relationship;
        if (op.city) existing.city = op.city;
        if (op.notes) existing.notes = op.notes;
      } else {
        next.recipients.push({
          id: rid(),
          name: op.name,
          relationship: op.relationship,
          city: op.city,
          notes: op.notes,
        });
      }
      next.recipients = next.recipients.slice(-12);
      break;
    }
    case "add_occasion": {
      const dup = next.occasions.find(
        (o) => o.label.toLowerCase() === op.label.toLowerCase() && o.date === op.date
      );
      if (!dup) {
        next.occasions.push({
          id: rid(),
          label: op.label,
          date: op.date,
          recurring: op.recurring ?? true,
          type: op.occasionType ?? "custom",
          recipientName: op.recipientName,
        });
        next.occasions = next.occasions.slice(-20);
      }
      break;
    }
    case "set_budget":
      next.budget = { amount: op.amount, currency: op.currency || "LKR" };
      break;
    case "clear_budget":
      next.budget = null;
      break;
    case "set_language":
      next.language = op.language;
      break;
    case "set_city":
      next.defaultCity = op.city;
      break;
  }
  return next;
}

export function logOrder(p: KapriProfile, order: ProfileOrder): KapriProfile {
  if (p.orders.some((o) => o.order_ref === order.order_ref)) return p;
  return { ...p, orders: [...p.orders, order].slice(-20) };
}

export function addOccasion(p: KapriProfile, o: Omit<ProfileOccasion, "id">): KapriProfile {
  return { ...p, occasions: [...p.occasions, { ...o, id: rid() }].slice(-20) };
}

export function removeOccasion(p: KapriProfile, id: string): KapriProfile {
  return { ...p, occasions: p.occasions.filter((o) => o.id !== id) };
}

// Resolve a (possibly recurring) occasion to its next upcoming date and day count.
export function nextOccurrence(o: ProfileOccasion, todayISO: string): { date: string; inDays: number } {
  const today = new Date(todayISO + "T00:00:00Z");
  const base = new Date(o.date + "T00:00:00Z");
  const day = (d: Date) => Math.floor(d.getTime() / 86400000);
  if (!o.recurring) {
    return { date: o.date, inDays: day(base) - day(today) };
  }
  const year = today.getUTCFullYear();
  let cand = new Date(Date.UTC(year, base.getUTCMonth(), base.getUTCDate()));
  if (day(cand) < day(today)) cand = new Date(Date.UTC(year + 1, base.getUTCMonth(), base.getUTCDate()));
  return { date: cand.toISOString().slice(0, 10), inDays: day(cand) - day(today) };
}

// Merge saved occasions + built-in holidays, soonest first, within a horizon.
export function upcomingOccasions(
  p: KapriProfile,
  todayISO: string,
  horizonDays = 30
): { label: string; date: string; inDays: number; recipientName?: string; emoji?: string }[] {
  const personal = p.occasions
    .map((o) => {
      const n = nextOccurrence(o, todayISO);
      return { label: o.label, date: n.date, inDays: n.inDays, recipientName: o.recipientName, emoji: "🎂" };
    })
    .filter((o) => o.inDays >= 0 && o.inDays <= horizonDays);
  const holidays = upcomingHolidays(todayISO, horizonDays).map((h) => ({
    label: h.label,
    date: h.date,
    inDays: h.inDays,
    emoji: h.emoji,
  }));
  return [...personal, ...holidays].sort((a, b) => a.inDays - b.inDays);
}

// Compact summary sent to the server each turn. Keeps the context message small.
export function profileToWire(p: KapriProfile, todayISO: string): WireProfile {
  const wire: WireProfile = {};
  if (p.language) wire.language = p.language;
  if (p.defaultCity) wire.defaultCity = p.defaultCity;
  if (p.budget) wire.budget = p.budget;
  if (p.recipients.length) {
    wire.recipients = p.recipients
      .slice(-8)
      .map((r) => ({ name: r.name, relationship: r.relationship, city: r.city, notes: r.notes }));
  }
  const upcoming = upcomingOccasions(p, todayISO, 30)
    .filter((o) => o.emoji === "🎂" || o.inDays <= 21) // personal always; holidays only if near
    .slice(0, 6)
    .map((o) => ({ label: o.label, date: o.date, inDays: o.inDays, recipientName: o.recipientName }));
  if (upcoming.length) wire.upcoming = upcoming;
  if (p.orders.length) {
    wire.recentOrders = p.orders
      .slice(-3)
      .map((o) => ({ order_ref: o.order_ref, recipient: o.recipient, city: o.city }));
  }
  return wire;
}
