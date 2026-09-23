/**
 * padel-data.js
 * -----------------------------------------------------------------------
 * Static seed data for the CEMS Padel Tracker.
 *
 * This file is the "source of truth" for defaults. At runtime, app.js
 * layers localStorage overrides on top of these arrays (player level
 * edits, this-week session edits, attendance, etc.) so the site keeps
 * working with zero backend. Edit the arrays below to change defaults
 * (e.g. swap in the real venue / real players) — see README.md.
 * -----------------------------------------------------------------------
 */

// Level system --------------------------------------------------------
const LEVEL_LABELS = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced"
};

// Short label used for compact badges
const LEVEL_SHORT = {
  1: "Beg",
  2: "Int",
  3: "Adv"
};

// Venues ----------------------------------------------------------------
// id, name, address, mapsUrl, defaultPriceNote
const VENUES = [
  {
    id: "venue-drop-shot",
    name: "Drop Shot Padel Club (placeholder)",
    address: "Carrer d'Aragó 300, 08009 Barcelona",
    mapsUrl: "https://maps.google.com/?q=Carrer+d%27Arag%C3%B3+300+Barcelona",
    defaultPriceNote: "~€10-14 per person / hour, court split evenly"
  },
  {
    id: "venue-vall-hebron",
    name: "Vall d'Hebron Padel Center (placeholder)",
    address: "Passeig de la Vall d'Hebron 178, 08035 Barcelona",
    mapsUrl: "https://maps.google.com/?q=Passeig+de+la+Vall+d%27Hebron+178+Barcelona",
    defaultPriceNote: "~€8-12 per person / hour"
  },
  {
    id: "venue-diagonal",
    name: "Diagonal Mar Sports Club (placeholder)",
    address: "Av. Diagonal 177, 08018 Barcelona",
    mapsUrl: "https://maps.google.com/?q=Av+Diagonal+177+Barcelona",
    defaultPriceNote: "~€12-16 per person / hour"
  }
];

// Players -----------------------------------------------------------------
// id, name, level (1-3), active
// NOTE: level here is the DEFAULT. localStorage (cemspadel_playerLevels_v1)
// overrides this at runtime once someone edits a level on the Players page.
const PLAYERS = [
  { id: "p-amara",    name: "Amara Okafor",     level: 3, active: true },
  { id: "p-luca",     name: "Luca Bianchi",     level: 2, active: true },
  { id: "p-sofia",    name: "Sofia Nowak",      level: 1, active: true },
  { id: "p-erik",     name: "Erik Lindqvist",   level: 2, active: true },
  { id: "p-mei",      name: "Mei Zhang",        level: 1, active: true },
  { id: "p-tomas",    name: "Tomás Herrera",    level: 3, active: true },
  { id: "p-lea",      name: "Léa Dubois",       level: 2, active: true },
  { id: "p-daniel",   name: "Daniel Kwiat",     level: 1, active: true },
  { id: "p-ines",     name: "Inês Carvalho",    level: 3, active: true },
  { id: "p-nikolai",  name: "Nikolai Petrov",   level: 2, active: true }
];

// Sessions ------------------------------------------------------------
// id, weekLabel, dateISO, time, venueId, pricePerPerson, courts, notes, attendeeIds[]
// NOTE: the CURRENT week's session is whichever one app.js resolves as
// "this week" (see getCurrentSession in app.js — currently: the session
// with the latest dateISO that is today or in the future, else the most
// recent one). localStorage (cemspadel_sessionOverrides_v1) can override
// venue/date/time/price/courts/notes for that session, and
// cemspadel_currentAttendance_v1 overrides who's signed up.
const SESSIONS = [
  {
    id: "session-2026-09-26",
    weekLabel: "This week",
    dateISO: "2026-09-26",
    time: "19:00",
    venueId: "venue-drop-shot",
    pricePerPerson: 12,
    courtTotalPrice: 48,
    courts: 2,
    notes: "Bring your own rackets if you have them — a few club rackets available to borrow. WhatsApp group link: (add yours in Admin).",
    whatsappUrl: "",
    attendeeIds: ["p-amara", "p-luca", "p-sofia", "p-erik", "p-mei", "p-tomas", "p-lea", "p-daniel"]
  },
  {
    id: "session-2026-09-19",
    weekLabel: "Week of Sep 19",
    dateISO: "2026-09-19",
    time: "19:00",
    venueId: "venue-drop-shot",
    pricePerPerson: 12,
    courtTotalPrice: 48,
    courts: 2,
    notes: "Great turnout, sunny evening.",
    whatsappUrl: "",
    attendeeIds: ["p-amara", "p-tomas", "p-lea", "p-nikolai", "p-sofia", "p-daniel", "p-erik", "p-ines"]
  },
  {
    id: "session-2026-09-12",
    weekLabel: "Week of Sep 12",
    dateISO: "2026-09-12",
    time: "18:30",
    venueId: "venue-vall-hebron",
    pricePerPerson: 10,
    courtTotalPrice: 40,
    courts: 1,
    notes: "Small group — first session of the semester.",
    whatsappUrl: "",
    attendeeIds: ["p-mei", "p-luca", "p-erik", "p-nikolai"]
  }
];
