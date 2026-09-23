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
    id: "venue-plus-padel-indoor",
    name: "Plus Padel Indoor",
    address: "Av. del Carrilet, 219, 08907 L'Hospitalet de Llobregat, Barcelona, Spain",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Plus+Padel+Indoor+Av.+del+Carrilet+219+L%27Hospitalet+de+Llobregat",
    defaultPriceNote: "€38 / court (90 min) → €11 / person incl. €1.50 balls"
  },
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
  }
];

// Players -----------------------------------------------------------------
// id, name, level (1-3), nationality, homeSchool, year ("1st"|"2nd"), active
// NOTE: level DEFAULT can be overridden via localStorage (cemspadel_playerLevels_v1).
const PLAYERS = [
  { id: "p-joao",   name: "João Rawes Freitas", level: 3, active: true, nationality: "Portuguese", homeSchool: "ESADE", year: "2nd" },
  { id: "p-chris",  name: "Chris Imhoff",       level: 2, active: true, nationality: "German",     homeSchool: "ESADE", year: "1st" },
  { id: "p-mark",   name: "Mark Erhan",         level: 2, active: true, nationality: "German",     homeSchool: "SSE",   year: "2nd" },
  { id: "p-matteo", name: "Matteo Guardamagna", level: 3, active: true, nationality: "Italian",    homeSchool: "ESADE", year: "2nd" }
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
    id: "session-2026-10-01",
    weekLabel: "Thu 1 Oct",
    dateISO: "2026-10-01",
    time: "17:00",
    venueId: "venue-plus-padel-indoor",
    venueName: "Plus Padel Indoor",
    venueAddress: "Av. del Carrilet, 219, 08907 L'Hospitalet de Llobregat, Barcelona, Spain",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Plus+Padel+Indoor+Av.+del+Carrilet+219+L%27Hospitalet+de+Llobregat",
    pricePerPerson: 11,
    courtTotalPrice: 38,
    courts: 1,
    notes: "90 minutes (17:00-18:30). €38/court ÷ 4 + €1.50 balls = €11 per person. Bring a racket if you have one.",
    whatsappUrl: "",
    attendeeIds: []
  },
  {
    id: "session-2026-09-26",
    weekLabel: "Week of Sep 26",
    dateISO: "2026-09-26",
    time: "19:00",
    venueId: "venue-drop-shot",
    pricePerPerson: 12,
    courtTotalPrice: 48,
    courts: 2,
    notes: "Past session.",
    whatsappUrl: "",
    attendeeIds: ["p-joao", "p-chris", "p-mark", "p-matteo"]
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
    attendeeIds: ["p-joao", "p-chris", "p-matteo"]
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
    attendeeIds: ["p-chris", "p-mark"]
  }
];
