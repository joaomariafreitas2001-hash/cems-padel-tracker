# CEMS Padel Tracker

A simple weekly hub for CEMS colleagues in Barcelona: where padel is this
week, price, courts, who's playing and at what level, plus a balance
helper that suggests fair court groupings. Vanilla HTML/CSS/JS, no
backend, no build step - everything persists in the browser via
`localStorage`.

## Quick start (open locally)

No build step needed, but the app fetches its own JS files, so open it
through a local server rather than double-clicking `index.html` (some
browsers block `file://` script loading).

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000
```

Or, if you have Node:

```bash
npx serve .
```

## File map

```
project-root/
  index.html            # single HTML shell; #main-content is the SPA mount point
  css/
    style.css            # all styling (mobile-first, navy + lime/coral)
  js/
    padel-data.js         # static seed data: VENUES, PLAYERS, SESSIONS, LEVEL_LABELS
    app.js                # navigate(view) + render*() + localStorage logic
  assets/
    cems-club-barcelona-logo.jpg   # club logo (included)
    favicon.svg
  vercel.json             # optional cache headers for Vercel
  version.json            # build number, for simple "is there an update" polling
  README.md
```

## How the app works

`index.html` loads `js/padel-data.js` then `js/app.js`. On load, `app.js`
reads the URL hash (`#home`, `#players`, `#balance`, `#history`,
`#admin`) and calls `navigate(view)`, which:

1. Updates `window.location.hash`
2. Calls the matching `render*()` function, which returns an HTML string
3. Writes that string into `#main-content` via `innerHTML`
4. Attaches event listeners for that view (forms, buttons, selects)

All data starts from the static arrays in `js/padel-data.js`. At render
time, `app.js` layers any `localStorage` overrides on top (player level
edits, this-week session edits, attendance) - see **Data model** and
**localStorage keys** below. Nothing is ever sent to a server; everything
lives in the visitor's own browser.

## Editing this week's session (the fast way)

You don't need Admin for permanent changes - just edit the seed data:

Open `js/padel-data.js` and find the `SESSIONS` array. The app treats
whichever session has the soonest `dateISO` that is today-or-later as
"this week" (falls back to the most recent past one if none is
upcoming). To set up next week:

1. Add a new object to `SESSIONS` with a new `id`, the correct
   `dateISO`, `venueId` (must match an id in `VENUES`), `pricePerPerson`,
   `courts`, etc.
2. Leave `attendeeIds: []` - people can mark themselves in from Home.

Alternatively, use the in-app **Admin -> Edit this week** form - but note
that saves changes to that specific session only in the visitor's own
`localStorage`, so it won't be visible to other people unless you also
update `padel-data.js` and redeploy.

### Changing venue / price / courts for everyone

Edit the matching entry in `VENUES` and `SESSIONS` in
`js/padel-data.js`, commit, and redeploy. This is the only way a change
is visible to *all* visitors (localStorage is per-browser).

## Level system

- **1 = Beginner** - new to padel, still learning the basics
- **2 = Intermediate** - comfortable rallying, knows the rules well
- **3 = Advanced** - strong, competitive, strategic play

Levels start from `PLAYERS[].level` in `padel-data.js` and can be
updated by anyone from the **Players** page (trust-based, no login) -
edits are stored in `localStorage` and stamped with a "last updated"
time, and they override the seed value.

## Balance helper

On the **Balance** page, the app takes this week's attendees and the
number of booked courts and deals players onto "Court A / B / C…" using
a snake-draft: players are sorted by level (high -> low) and distributed
round-robin back and forth across courts, so each court gets a mix
instead of stacking all Advanced on one court and all Beginners on
another. Use **Reshuffle** to re-roll (still balanced, different mix
within level bands) and **Copy groupings** to copy a plain-text summary
to the clipboard for WhatsApp.

## Data model (`js/padel-data.js`)

```js
LEVEL_LABELS = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' }

VENUES[] = { id, name, address, mapsUrl, defaultPriceNote }

PLAYERS[] = { id, name, level /* 1-3 */, active }

SESSIONS[] = {
  id, weekLabel, dateISO, time, venueId,
  pricePerPerson, courtTotalPrice, courts,
  notes, whatsappUrl, attendeeIds: []
}
```

`localStorage` overrides layer on top at render time: player level
edits, added players, this-week session edits, and attendance always
win over the static defaults.

## localStorage keys

All keys are prefixed `cemspadel_` and versioned (`_v1`) so future
schema changes can migrate cleanly.

| Key | Shape | Purpose |
|---|---|---|
| `cemspadel_playerLevels_v1` | `{ [playerId]: { level, updatedAt } }` | Overrides a seeded player's level + last-updated timestamp |
| `cemspadel_customPlayers_v1` | `[{ id, name, level, active, notes, levelUpdatedAt }]` | Players added via the Players page that aren't in the seed data |
| `cemspadel_sessionOverrides_v1` | `{ [sessionId]: { venueId, dateISO, time, pricePerPerson, courtTotalPrice, courts, notes, whatsappUrl } }` | Admin edits to a specific session |
| `cemspadel_attendance_v1` | `{ [sessionId]: [playerId, ...] }` | Who's marked as attending a given session (overrides seeded `attendeeIds`) |
| `cemspadel_myPlayerId_v1` | `"p-xxxx"` | Remembers which roster player "you" are, for the Home "I'm in / I'm out" control |
| `cemspadel_groupings_v1` | `{ [sessionId]: { groups: [[playerId,...],...], _forIds, _courts } }` | Last generated (or reshuffled) balance-helper groupings, cached per session/attendee-set |

Clear any of these from your browser's DevTools -> Application ->
Local Storage to reset that piece of state back to the seed data.

## Club logo

The CEMS Club Barcelona logo ships at:

```
assets/cems-club-barcelona-logo.jpg
```

(sourced from the club LinkedIn company page). The header (`index.html`)
points at that path. If the file is missing, the `<img>` `onerror`
handler swaps in a text wordmark so the site never shows a broken image.

## Admin lock

The **Admin** view is password-locked. Organizers unlock with the club
password configured as `ADMIN_PASSWORD` in `js/app.js`.

After a correct unlock, this browser remembers the unlock in
`cemspadel_adminUnlocked_v1` until you click **Lock Admin** (or clear
localStorage). This is a light client-side gate only; it stops casual
edits, not a determined inspector.

## Accessibility notes

- Skip link at the top jumps straight to `#main-content`
- `#main-content` has `aria-live="polite"` so view changes are announced
- The active nav link gets `aria-current="page"`
- All user-entered text (player names, notes, admin fields) is passed
  through `escHtml()` before being inserted via `innerHTML`
- Level badges use color **and** text/label, not color alone

## Deploying to Vercel

1. Push this folder to a GitHub repo (e.g. as `main` branch root, or
   point Vercel's "Root Directory" setting at this folder if it's nested
   in a monorepo).
2. In Vercel: **New Project -> Import** the repo.
3. Framework preset: **Other** (this is a static site, no build
   command needed).
4. Build command: leave empty. Output directory: leave as project root
   (`.`) - `index.html` is already at the top level.
5. Deploy. `vercel.json` is optional and only adds cache headers for
   static assets; you can delete it and Vercel will still serve the
   site fine with sensible defaults.

`version.json` is a small optional convenience: if you ever want the
site to poll for "is there a new build" (e.g. show a "refresh for
updates" banner), fetch `version.json` periodically and compare
`build` to a value cached at load time. Not wired up in v1 - left as
a hook for later.

## Out of scope for v1

- No real authentication, no backend, no payments
- No WhatsApp bot (only a manual link field)
- Admin is password-locked (see ADMIN_PASSWORD in js/app.js). Player level edits stay trust-based.
