/**
 * padel-data.js
 * Static seed data for the CEMS Padel Tracker.
 *
 * Runtime overrides (venue edits, attendance, levels) live in localStorage
 * via app.js. Edit this file to change defaults, then push to deploy.
 */

const LEVEL_LABELS = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced"
};

const LEVEL_SHORT = {
  1: "Beg",
  2: "Int",
  3: "Adv"
};

const VENUES = [
  {
    id: "venue-plus-padel-indoor",
    name: "Plus Padel Indoor",
    address: "Av. del Carrilet, 219, 08907 L'Hospitalet de Llobregat, Barcelona, Spain",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Plus+Padel+Indoor+Av.+del+Carrilet+219+L%27Hospitalet+de+Llobregat",
    defaultPriceNote: "90 min session"
  }
];

// Roster: Name, Level, Nationality, Home School, Year
const PLAYERS = [
  { id: "p-joao", name: "João Rawes Freitas", level: 3, active: true, nationality: "Portuguese", homeSchool: "ESADE" },
  { id: "p-chris", name: "Chris Imhoff", level: 2, active: true, nationality: "German", homeSchool: "ESADE" },
  { id: "p-mark", name: "Mark Erhan", level: 2, active: true, nationality: "German", homeSchool: "SSE" },
  { id: "p-matteo", name: "Matteo Guardamagna", level: 3, active: true, nationality: "Italian", homeSchool: "ESADE" },
  { id: "p-ameer", name: "Ameer", level: 1, active: true, nationality: "Indian", homeSchool: "NUS" },
  { id: "p-linus", name: "Linus", level: 3, active: true, nationality: "German", homeSchool: "WU" }
];

// Only the live week is seeded. History stays empty until real past weeks are added.
// isCurrent: true forces Home/Balance/Admin to use this session.
const SESSIONS = [
  {
    id: "session-2026-10-01-v4",
    isCurrent: true,
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
    notes: "90 minutes (17:00-18:30). Bring a racket if you have one.",
    whatsappUrl: "",
    attendeeIds: []
  }
];
