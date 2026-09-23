/**
 * app.js
 * -----------------------------------------------------------------------
 * CEMS Padel Tracker â€” vanilla JS single-page app.
 *
 * Pattern: navigate(view) swaps the visible view and calls the matching
 * render*() function, which builds an HTML string and writes it into
 * #main-content via innerHTML. All persistence is localStorage, using
 * prefixed keys documented in README.md (search "localStorage keys").
 *
 * No build step, no framework. Depends only on js/padel-data.js being
 * loaded first (see index.html script order).
 * -----------------------------------------------------------------------
 */

/* ============================== Storage keys ============================== */

const LS_KEYS = {
  PLAYER_LEVELS: "cemspadel_playerLevels_v1",     // { [playerId]: { level:1-3, updatedAt: ISOString } }
  CUSTOM_PLAYERS: "cemspadel_customPlayers_v1",   // [ { id, name, level, active, notes, updatedAt } ]
  SESSION_OVERRIDES: "cemspadel_sessionOverrides_v1", // { [sessionId]: { venueName, venueAddress, mapsUrl, venueId?, dateISO, time, pricePerPerson, courtTotalPrice, courts, notes, whatsappUrl } }
  ATTENDANCE: "cemspadel_attendance_v1",          // { [sessionId]: [playerId, ...] }
  MY_PLAYER_ID: "cemspadel_myPlayerId_v1",        // string playerId (or "" )
  GROUPINGS: "cemspadel_groupings_v1",            // { [sessionId]: [ [playerId,...], [playerId,...], ... ] }
  PLAYER_HISTORY: "cemspadel_playerHistory_v1",   // { [playerId]: [sessionId, ...] }
  ADMIN_UNLOCKED: "cemspadel_adminUnlocked_v1",   // "1" while this browser session has unlocked Admin
  DELETED_PLAYERS: "cemspadel_deletedPlayers_v1"  // [playerId, ...] hidden from roster (seed + custom)
};

/** Club organizer password for the Admin view (client-side gate only). */
const ADMIN_PASSWORD = "cems26";

function isAdminUnlocked() {
  return localStorage.getItem(LS_KEYS.ADMIN_UNLOCKED) === "1";
}

function setAdminUnlocked(unlocked) {
  if (unlocked) {
    localStorage.setItem(LS_KEYS.ADMIN_UNLOCKED, "1");
  } else {
    localStorage.removeItem(LS_KEYS.ADMIN_UNLOCKED);
  }
}

/* ============================== Utilities ============================== */

/** Escape a user-entered string before inserting into innerHTML. */
function escHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (e) {
    console.warn("cemspadel: failed to read", key, e);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("cemspadel: failed to write", key, e);
  }
}

function formatDate(dateISO) {
  try {
    const d = new Date(dateISO + "T00:00:00");
    return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  } catch (e) {
    return dateISO;
  }
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function nowISO() {
  return new Date().toISOString();
}

/* ============================== Data access layer ============================== */
/* Merges static padel-data.js defaults with localStorage overrides. */

function getAllPlayers() {
  const custom = readJSON(LS_KEYS.CUSTOM_PLAYERS, []);
  const levels = readJSON(LS_KEYS.PLAYER_LEVELS, {});
  const deleted = new Set(readJSON(LS_KEYS.DELETED_PLAYERS, []));
  const base = PLAYERS.map(p => ({ ...p }));
  const merged = base.concat(custom.map(p => ({ ...p }))).filter(p => !deleted.has(p.id));
  return merged.map(p => {
    const override = levels[p.id];
    if (override && override.level) {
      return { ...p, level: override.level, levelUpdatedAt: override.updatedAt || null };
    }
    return { ...p, levelUpdatedAt: p.levelUpdatedAt || null };
  });
}

function getPlayerById(id) {
  return getAllPlayers().find(p => p.id === id) || null;
}

function getVenueById(id) {
  return VENUES.find(v => v.id === id) || null;
}

/** Resolve display venue for a session: custom Admin fields win over preset venueId. */
function resolveSessionVenue(session) {
  if (!session) return { name: "", address: "", mapsUrl: "" };
  const preset = session.venueId ? getVenueById(session.venueId) : null;
  const name = (session.venueName && String(session.venueName).trim())
    || (preset && preset.name)
    || "";
  const address = (session.venueAddress && String(session.venueAddress).trim())
    || (preset && preset.address)
    || "";
  const mapsUrl = (session.mapsUrl && String(session.mapsUrl).trim())
    || (preset && preset.mapsUrl)
    || "";
  return { name, address, mapsUrl };
}

function getAllSessionsSorted() {
  // Newest first
  return [...SESSIONS].sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
}

function getSessionWithOverrides(sessionId) {
  const base = SESSIONS.find(s => s.id === sessionId);
  if (!base) return null;
  const overrides = readJSON(LS_KEYS.SESSION_OVERRIDES, {});
  const attendanceMap = readJSON(LS_KEYS.ATTENDANCE, {});
  const merged = { ...base, ...(overrides[sessionId] || {}) };
  merged.attendeeIds = attendanceMap[sessionId] || base.attendeeIds || [];
  return merged;
}

/** Resolve "this week's" session: soonest upcoming (today or later) by dateISO,
 *  falling back to the most recent past session if none is upcoming. */
function getCurrentSession() {
  const today = todayISO();
  const sorted = [...SESSIONS].sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));
  const upcoming = sorted.find(s => s.dateISO >= today);
  const chosen = upcoming || sorted[sorted.length - 1];
  return chosen ? getSessionWithOverrides(chosen.id) : null;
}

function getPastSessions() {
  const current = getCurrentSession();
  return getAllSessionsSorted()
    .filter(s => !current || s.id !== current.id)
    .map(s => getSessionWithOverrides(s.id));
}

/* ============================== Mutations ============================== */

function setPlayerLevel(playerId, level) {
  const levels = readJSON(LS_KEYS.PLAYER_LEVELS, {});
  levels[playerId] = { level: Number(level), updatedAt: nowISO() };
  writeJSON(LS_KEYS.PLAYER_LEVELS, levels);
}

function addCustomPlayer(name, level, notes) {
  const custom = readJSON(LS_KEYS.CUSTOM_PLAYERS, []);
  const id = "p-custom-" + Date.now().toString(36);
  custom.push({
    id,
    name: name.trim(),
    level: Number(level),
    active: true,
    notes: (notes || "").trim(),
    levelUpdatedAt: nowISO()
  });
  writeJSON(LS_KEYS.CUSTOM_PLAYERS, custom);
  // If previously deleted, allow re-adding under a new id (custom always new).
  return id;
}

/** Remove a player from the roster (Admin). Seed players are hidden via DELETED_PLAYERS. */
function deletePlayer(playerId) {
  if (!playerId) return;

  // Drop from custom list if present
  const custom = readJSON(LS_KEYS.CUSTOM_PLAYERS, []).filter(p => p.id !== playerId);
  writeJSON(LS_KEYS.CUSTOM_PLAYERS, custom);

  // Hide seed players (and any leftovers)
  const deleted = readJSON(LS_KEYS.DELETED_PLAYERS, []);
  if (!deleted.includes(playerId)) {
    deleted.push(playerId);
    writeJSON(LS_KEYS.DELETED_PLAYERS, deleted);
  }

  // Clear level override
  const levels = readJSON(LS_KEYS.PLAYER_LEVELS, {});
  if (levels[playerId]) {
    delete levels[playerId];
    writeJSON(LS_KEYS.PLAYER_LEVELS, levels);
  }

  // Remove from all attendance lists
  const attendance = readJSON(LS_KEYS.ATTENDANCE, {});
  Object.keys(attendance).forEach(sid => {
    attendance[sid] = (attendance[sid] || []).filter(id => id !== playerId);
  });
  writeJSON(LS_KEYS.ATTENDANCE, attendance);

  // Clear "I am" if it was this player
  if (localStorage.getItem(LS_KEYS.MY_PLAYER_ID) === playerId) {
    localStorage.removeItem(LS_KEYS.MY_PLAYER_ID);
  }

  // Strip from cached groupings
  const groupings = readJSON(LS_KEYS.GROUPINGS, {});
  Object.keys(groupings).forEach(sid => {
    const entry = groupings[sid];
    if (!entry || !entry.groups) return;
    entry.groups = entry.groups.map(g => g.filter(id => id !== playerId));
    if (entry._forIds) {
      entry._forIds = entry._forIds.split(",").filter(id => id !== playerId).join(",");
    }
  });
  writeJSON(LS_KEYS.GROUPINGS, groupings);
}

function setSessionOverride(sessionId, patch) {
  const overrides = readJSON(LS_KEYS.SESSION_OVERRIDES, {});
  overrides[sessionId] = { ...(overrides[sessionId] || {}), ...patch };
  writeJSON(LS_KEYS.SESSION_OVERRIDES, overrides);
}

function setAttendance(sessionId, attendeeIds) {
  const map = readJSON(LS_KEYS.ATTENDANCE, {});
  map[sessionId] = attendeeIds;
  writeJSON(LS_KEYS.ATTENDANCE, map);
}

function toggleMyAttendance(sessionId, playerId, joining) {
  const session = getSessionWithOverrides(sessionId);
  let ids = session.attendeeIds ? [...session.attendeeIds] : [];
  if (joining) {
    if (!ids.includes(playerId)) ids.push(playerId);
  } else {
    ids = ids.filter(id => id !== playerId);
  }
  setAttendance(sessionId, ids);
}

function setGroupings(sessionId, groups) {
  const map = readJSON(LS_KEYS.GROUPINGS, {});
  map[sessionId] = groups;
  writeJSON(LS_KEYS.GROUPINGS, map);
}

function getGroupings(sessionId) {
  const map = readJSON(LS_KEYS.GROUPINGS, {});
  return map[sessionId] || null;
}

/* ============================== Balance helper algorithm ============================== */

/**
 * Compatibility rule (padel gap too big otherwise):
 *   - Level 1 (Beginner) may play with Level 2 only (never Level 3)
 *   - Level 3 (Advanced) may play with Level 2 or other Level 3s (never Level 1)
 *   - Level 2 (Intermediate) bridges either band
 *
 * Courts are assigned a band: "low" = {1,2}, "high" = {2,3}.
 * Then players are dealt into those courts (snake within band).
 */

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function groupAverage(group) {
  if (!group.length) return 0;
  return group.reduce((sum, p) => sum + p.level, 0) / group.length;
}

function groupBand(group) {
  const levels = new Set(group.map(p => p.level));
  if (levels.has(1) && levels.has(3)) return "invalid";
  if (levels.size === 1 && levels.has(1) && group.length >= 4) return "beginner";
  if (levels.size === 1 && levels.has(3) && group.length >= 4) return "advanced";
  if (levels.has(1)) return "low";
  if (levels.has(3)) return "high";
  return "mid"; // only 2s (or empty)
}

function bandLabel(band) {
  if (band === "beginner") return "Beginners (full court)";
  if (band === "advanced") return "Advanced (full court)";
  if (band === "low") return "Levels 1-2";
  if (band === "high") return "Levels 2-3";
  if (band === "mid") return "Level 2";
  return "Check levels";
}

function courtHasConflict(group) {
  return groupBand(group) === "invalid";
}

/**
 * Decide how many remaining courts are "low" (1+2) vs "high" (2+3) vs "mid".
 * Used after pure beginner/advanced full courts have already been packed.
 */
function allocateCourtBands(l1Count, l2Count, l3Count, courts) {
  const n = Math.max(0, courts);
  if (n === 0) return [];
  const bands = Array(n).fill(null);

  if (l1Count === 0 && l3Count === 0) {
    return bands.map(() => "mid");
  }
  if (l1Count === 0) {
    return bands.map(() => "high");
  }
  if (l3Count === 0) {
    return bands.map(() => "low");
  }

  const target = 4;
  let lowNeeded = Math.max(1, Math.ceil(l1Count / target));
  let highNeeded = Math.max(1, Math.ceil(l3Count / target));

  if (lowNeeded + highNeeded > n) {
    const totalEnds = l1Count + l3Count;
    lowNeeded = Math.max(1, Math.round((l1Count / totalEnds) * n));
    highNeeded = n - lowNeeded;
    if (highNeeded < 1) {
      highNeeded = 1;
      lowNeeded = n - 1;
    }
  }

  let remaining = n - lowNeeded - highNeeded;
  const lowWeight = l1Count + l2Count * 0.5;
  const highWeight = l3Count + l2Count * 0.5;
  while (remaining > 0) {
    if (lowWeight >= highWeight) lowNeeded += 1;
    else highNeeded += 1;
    remaining -= 1;
  }

  let i = 0;
  for (let k = 0; k < lowNeeded; k++) bands[i++] = "low";
  for (let k = 0; k < highNeeded; k++) bands[i++] = "high";
  return bands;
}

function snakeDeal(players, groups) {
  if (!groups.length) return;
  let idx = 0;
  let dir = 1;
  for (const player of players) {
    groups[idx].push(player);
    if (groups.length === 1) continue;
    if (idx + dir >= groups.length || idx + dir < 0) {
      dir *= -1;
    } else {
      idx += dir;
    }
  }
}

/**
 * Pack as many full courts of exactly `size` players from one level as court
 * budget allows. Returns { packed, rest }.
 */
function packFullLevelCourts(levelPlayers, band, size, maxCourts) {
  const full = Math.min(Math.floor(levelPlayers.length / size), Math.max(0, maxCourts));
  const packed = [];
  for (let i = 0; i < full; i++) {
    const g = levelPlayers.slice(i * size, (i + 1) * size);
    g._band = band;
    packed.push(g);
  }
  return { packed, rest: levelPlayers.slice(full * size) };
}

/**
 * Build compatible court groupings.
 * Prefer packing full beginner courts (4x level 1) when possible; same for
 * advanced (4x level 3). Leftovers mix with level 2 within the 1-2 / 2-3 bands.
 */
function computeBalancedGroups(players, courts, opts) {
  opts = opts || {};
  const COURT_SIZE = 4;
  let l1 = players.filter(p => p.level === 1);
  let l2 = players.filter(p => p.level === 2);
  let l3 = players.filter(p => p.level === 3);
  // Need at least 2 courts when both beginners and advanced are present.
  let n = Math.max(1, courts, (l1.length && l3.length) ? 2 : 1);

  if (opts.shuffleLevels) {
    l1 = shuffleArray(l1);
    l2 = shuffleArray(l2);
    l3 = shuffleArray(l3);
  } else {
    const byName = (a, b) => a.name.localeCompare(b.name);
    l1.sort(byName);
    l2.sort(byName);
    l3.sort(byName);
  }

  const groups = [];
  let slotsLeft = n;

  // 1) Pack full beginner courts first whenever we have 4+ beginners.
  //    Keep at least one slot free if any advanced still need a home.
  const begBudget = Math.max(0, slotsLeft - (l3.length > 0 ? 1 : 0));
  const beg = packFullLevelCourts(l1, "beginner", COURT_SIZE, begBudget);
  groups.push(...beg.packed);
  l1 = beg.rest;
  slotsLeft -= beg.packed.length;

  // 2) Pack full advanced courts next (level-3-only games).
  //    Keep a slot if leftover beginners still need a mixed 1-2 court.
  const advBudget = Math.max(0, slotsLeft - (l1.length > 0 ? 1 : 0));
  const adv = packFullLevelCourts(l3, "advanced", COURT_SIZE, advBudget);
  groups.push(...adv.packed);
  l3 = adv.rest;
  slotsLeft -= adv.packed.length;

  // If both leftover L1 and L3 remain but only 1 slot, force a second band court.
  if (l1.length && l3.length && slotsLeft < 2) {
    slotsLeft = 2;
    n = groups.length + 2;
  }

  // 3) Remaining courts: mix leftover L1 with L2 (low) and leftover L3 with L2 (high).
  const bands = allocateCourtBands(l1.length, l2.length, l3.length, slotsLeft);
  const mixed = bands.map(band => {
    const g = [];
    g._band = band;
    return g;
  });
  groups.push(...mixed);

  const lowGroups = mixed.filter(g => g._band === "low");
  const highGroups = mixed.filter(g => g._band === "high");

  snakeDeal(l1, lowGroups.length ? lowGroups : mixed);
  snakeDeal(l3, highGroups.length ? highGroups : mixed);

  // L2 fill: prefer courts under COURT_SIZE, then smallest; never create 1+3.
  for (const p of l2) {
    const candidates = groups
      .filter(g => g._band !== "beginner" && g._band !== "advanced") // keep pure courts pure
      .filter(g => !courtHasConflict([...g, p]));
    const pool = candidates.length ? candidates : groups.filter(g => !courtHasConflict([...g, p]));
    pool.sort((a, b) => {
      const aUnder = a.length < COURT_SIZE ? 0 : 1;
      const bUnder = b.length < COURT_SIZE ? 0 : 1;
      if (aUnder !== bUnder) return aUnder - bUnder;
      return a.length - b.length;
    });
    if (pool[0]) pool[0].push(p);
  }

  // Safety: split any accidental 1+3 court.
  groups.forEach(g => {
    if (courtHasConflict(g)) {
      const moved = g.filter(p => p.level === 1);
      const kept = g.filter(p => p.level !== 1);
      g.length = 0;
      kept.forEach(p => g.push(p));
      const sink = groups.find(x => (x._band === "low" || x._band === "beginner") && !courtHasConflict([...x, ...moved]));
      if (sink) moved.forEach(p => sink.push(p));
      else moved.forEach(p => g.push(p));
    }
  });

  return groups;
}

function computeReshuffledGroups(players, courts) {
  return computeBalancedGroups(players, courts, { shuffleLevels: true });
}

/* ============================== Navigation ============================== */

const VIEWS = ["home", "players", "balance", "history", "admin"];

function navigate(view) {
  if (!VIEWS.includes(view)) view = "home";
  window.location.hash = view;
  renderView(view);
  updateNavState(view);
  const main = document.getElementById("main-content");
  if (main) main.focus();
}

function updateNavState(view) {
  document.querySelectorAll(".nav-link").forEach(link => {
    if (link.dataset.view === view) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

function renderView(view) {
  const main = document.getElementById("main-content");
  if (!main) return;
  switch (view) {
    case "home":
      main.innerHTML = renderHome();
      attachHomeHandlers();
      break;
    case "players":
      main.innerHTML = renderPlayers();
      attachPlayersHandlers();
      break;
    case "balance":
      main.innerHTML = renderBalance();
      attachBalanceHandlers();
      break;
    case "history":
      main.innerHTML = renderHistory();
      break;
    case "admin":
      if (!isAdminUnlocked()) {
        main.innerHTML = renderAdminLock();
        attachAdminLockHandlers();
      } else {
        main.innerHTML = renderAdmin();
        attachAdminHandlers();
      }
      break;
    default:
      main.innerHTML = renderHome();
      attachHomeHandlers();
  }
}

function currentViewFromHash() {
  const hash = (window.location.hash || "").replace("#", "");
  return VIEWS.includes(hash) ? hash : "home";
}

/* ============================== Level badge helper ============================== */

function levelBadge(level, opts) {
  opts = opts || {};
  const cls = `level-badge level-${level}${opts.large ? " level-badge--lg" : ""}`;
  const label = opts.short ? LEVEL_SHORT[level] : LEVEL_LABELS[level];
  return `<span class="${cls}" title="${escHtml(LEVEL_LABELS[level] || "")}">${escHtml(label || "?")}</span>`;
}

/* ============================== View: Home ============================== */

function renderHome() {
  const session = getCurrentSession();
  const myId = localStorage.getItem(LS_KEYS.MY_PLAYER_ID) || "";
  const players = getAllPlayers().filter(p => p.active !== false);

  if (!session) {
    return `
      <section class="view view-home">
        <div class="empty-state">
          <h2>No session set for this week yet</h2>
          <p>Head to <button type="button" class="link-button" data-nav="admin">Admin &rarr; Edit this week</button> to add one.</p>
        </div>
      </section>`;
  }

  const venue = resolveSessionVenue(session);
  const attendees = (session.attendeeIds || [])
    .map(id => getPlayerById(id))
    .filter(Boolean);
  const spotsLine = session.courts
    ? `${session.courts} court${session.courts > 1 ? "s" : ""} booked &middot; up to ${session.courts * 4} players`
    : "";
  const spotsLeft = session.courts ? Math.max(0, session.courts * 4 - attendees.length) : null;

  const isIn = myId && attendees.some(p => p.id === myId);

  const playerOptions = players
    .map(p => `<option value="${escHtml(p.id)}">${escHtml(p.name)}</option>`)
    .join("");

  return `
    <section class="view view-home">
      <div class="hero-card">
        <p class="eyebrow">${escHtml(session.weekLabel || "This week")}</p>
        <h2 class="hero-title">${venue.name ? escHtml(venue.name) : "Venue TBD"}</h2>
        <dl class="session-facts">
          <div><dt>Date</dt><dd>${escHtml(formatDate(session.dateISO))}</dd></div>
          <div><dt>Time</dt><dd>${escHtml(session.time || "TBD")}</dd></div>
          <div><dt>Address</dt><dd>${venue.address ? escHtml(venue.address) : "TBD"}${venue.mapsUrl ? ` <a href="${escHtml(venue.mapsUrl)}" target="_blank" rel="noopener">Open in Google Maps &rarr;</a>` : ""}</dd></div>
          <div><dt>Price</dt><dd>${session.pricePerPerson ? `&euro;${escHtml(session.pricePerPerson)} / person` : "TBD"}${session.courtTotalPrice ? ` <span class="muted">(&euro;${escHtml(session.courtTotalPrice)} total court)</span>` : ""}</dd></div>
          <div><dt>Courts</dt><dd>${escHtml(spotsLine || "TBD")}${spotsLeft !== null ? ` &middot; <strong>${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left</strong>` : ""}</dd></div>
        </dl>
        ${session.notes ? `<p class="session-notes">${escHtml(session.notes)}</p>` : ""}
        ${session.whatsappUrl ? `<a class="btn btn-ghost" href="${escHtml(session.whatsappUrl)}" target="_blank" rel="noopener">Open WhatsApp group</a>` : ""}

        <div class="rsvp-row">
          <label for="rsvp-player" class="rsvp-label">I am:</label>
          <select id="rsvp-player">
            <option value="">Choose your name&hellip;</option>
            ${playerOptions}
          </select>
          <div class="rsvp-buttons">
            <button type="button" class="btn btn-primary" id="btn-im-in">I'm in</button>
            <button type="button" class="btn btn-outline" id="btn-im-out">I'm out</button>
          </div>
        </div>
        <p id="rsvp-status" class="rsvp-status" aria-live="polite">${isIn ? "You're marked as in for this session." : ""}</p>
      </div>

      <div class="card">
        <h3>Who's playing (${attendees.length})</h3>
        ${attendees.length === 0
          ? `<p class="empty-inline">No one signed up yet â€” be the first!</p>`
          : `<ul class="attendee-list">
              ${attendees.map(p => `
                <li class="attendee-item">
                  <span class="attendee-name">${escHtml(p.name)}</span>
                  ${levelBadge(p.level, { short: true })}
                </li>`).join("")}
             </ul>`}
        <button type="button" class="link-button" data-nav="balance">Suggest balanced court groupings &rarr;</button>
      </div>
    </section>`;
}

function attachHomeHandlers() {
  const inBtn = document.getElementById("btn-im-in");
  const outBtn = document.getElementById("btn-im-out");
  const select = document.getElementById("rsvp-player");
  const status = document.getElementById("rsvp-status");
  const session = getCurrentSession();

  document.querySelectorAll("[data-nav]").forEach(el => {
    el.addEventListener("click", () => navigate(el.dataset.nav));
  });

  const savedId = localStorage.getItem(LS_KEYS.MY_PLAYER_ID);
  if (select && savedId) select.value = savedId;

  if (inBtn) {
    inBtn.addEventListener("click", () => {
      const id = select.value;
      if (!id) {
        status.textContent = "Pick your name from the list first.";
        return;
      }
      localStorage.setItem(LS_KEYS.MY_PLAYER_ID, id);
      toggleMyAttendance(session.id, id, true);
      status.textContent = "You're marked as in for this session. Enjoy the game!";
      renderView("home");
    });
  }
  if (outBtn) {
    outBtn.addEventListener("click", () => {
      const id = select.value || savedId;
      if (!id) {
        status.textContent = "Pick your name from the list first.";
        return;
      }
      toggleMyAttendance(session.id, id, false);
      status.textContent = "You're marked as out for this session.";
      renderView("home");
    });
  }
}

/* ============================== View: Players ============================== */

function renderPlayers() {
  const players = getAllPlayers().sort((a, b) => a.name.localeCompare(b.name));

  return `
    <section class="view view-players">
      <div class="view-header">
        <h2>Players &amp; Levels</h2>
        <p class="muted">View-only roster. Organizers edit names and levels in <button type="button" class="link-button" data-nav="admin">Admin</button>.</p>
      </div>

      <div class="level-legend card">
        <h3>Level legend</h3>
        <ul class="legend-list">
          <li>${levelBadge(1)} - new to padel, still learning the basics</li>
          <li>${levelBadge(2)} - comfortable rallying, knows the rules well (can bridge either band)</li>
          <li>${levelBadge(3)} - strong, competitive, strategic play</li>
        </ul>
        <p class="muted" style="margin-top:0.75rem">Balance rule: Level 1 never plays with Level 3. Courts are Levels 1-2, Levels 2-3, or Level 3 only.</p>
      </div>

      <div class="card">
        <h3>Roster (${players.length})</h3>
        <ul class="player-list" id="player-list">
          ${players.map(p => renderPlayerRow(p)).join("")}
        </ul>
      </div>
    </section>`;
}

function renderPlayerRow(p) {
  const lastUpdated = p.levelUpdatedAt
    ? `Last updated ${escHtml(new Date(p.levelUpdatedAt).toLocaleString())}`
    : "Not yet updated";
  const history = getAttendanceHistoryForPlayer(p.id, 5);
  return `
    <li class="player-row" data-player-id="${escHtml(p.id)}">
      <div class="player-row-main">
        <span class="player-name">${escHtml(p.name)}</span>
        ${levelBadge(p.level, { short: true })}
      </div>
      ${p.notes ? `<p class="player-notes muted">${escHtml(p.notes)}</p>` : ""}
      <p class="last-updated muted">${lastUpdated}</p>
      ${history.length ? `<p class="muted player-history">Recent: ${history.join(", ")}</p>` : ""}
    </li>`;
}

function renderAdminPlayerRow(p) {
  const lastUpdated = p.levelUpdatedAt
    ? `Last updated ${escHtml(new Date(p.levelUpdatedAt).toLocaleString())}`
    : "Not yet updated";
  return `
    <li class="player-row" data-player-id="${escHtml(p.id)}">
      <div class="player-row-main">
        <span class="player-name">${escHtml(p.name)}</span>
        ${levelBadge(p.level, { short: true })}
      </div>
      ${p.notes ? `<p class="player-notes muted">${escHtml(p.notes)}</p>` : ""}
      <div class="player-row-controls">
        <label class="visually-hidden" for="level-select-${escHtml(p.id)}">Level for ${escHtml(p.name)}</label>
        <select class="level-select" id="level-select-${escHtml(p.id)}" data-player-id="${escHtml(p.id)}">
          <option value="1" ${p.level === 1 ? "selected" : ""}>1 - Beginner</option>
          <option value="2" ${p.level === 2 ? "selected" : ""}>2 - Intermediate</option>
          <option value="3" ${p.level === 3 ? "selected" : ""}>3 - Advanced</option>
        </select>
        <button type="button" class="btn btn-danger btn-sm btn-delete-player" data-player-id="${escHtml(p.id)}" data-player-name="${escHtml(p.name)}">Delete</button>
        <span class="last-updated muted">${lastUpdated}</span>
      </div>
    </li>`;
}

function getAttendanceHistoryForPlayer(playerId, limit) {
  const sessions = getAllSessionsSorted();
  const labels = [];
  for (const s of sessions) {
    const full = getSessionWithOverrides(s.id);
    if (full.attendeeIds && full.attendeeIds.includes(playerId)) {
      labels.push(full.weekLabel || full.dateISO);
    }
    if (labels.length >= limit) break;
  }
  return labels;
}

function attachPlayersHandlers() {
  document.querySelectorAll("[data-nav]").forEach(el => {
    el.addEventListener("click", () => navigate(el.dataset.nav));
  });
}

/* ============================== View: Balance helper ============================== */

function renderBalance() {
  const session = getCurrentSession();
  if (!session) {
    return `<section class="view view-balance"><div class="empty-state"><h2>No session set for this week yet</h2><p>Set one up in Admin first.</p></div></section>`;
  }

  const attendees = (session.attendeeIds || []).map(id => getPlayerById(id)).filter(Boolean);
  const courts = session.courts || 1;

  if (attendees.length === 0) {
    return `
      <section class="view view-balance">
        <div class="view-header"><h2>Balance helper</h2></div>
        <div class="empty-state">
          <h2>No attendees yet</h2>
          <p>Once people mark themselves "I'm in" on Home, come back here to see balanced court groupings.</p>
        </div>
      </section>`;
  }

  let groups = getGroupings(session.id);
  const attendeeIds = attendees.map(p => p.id).sort().join(",");
  const cacheValid = groups && groups._forIds === attendeeIds && groups._courts === courts;
  if (!cacheValid) {
    groups = computeBalancedGroups(attendees, courts);
  } else {
    groups = groups.groups.map(ids => {
      const g = ids.map(id => getPlayerById(id)).filter(Boolean);
      g._band = groupBand(g);
      return g;
    });
  }

  const hasBothEnds = attendees.some(p => p.level === 1) && attendees.some(p => p.level === 3);
  const extraCourtNote = (hasBothEnds && courts < 2)
    ? `<p class="rsvp-status">Beginners and advanced both signed up: showing 2 bands even though only ${courts} court is booked. Book a second court if you can.</p>`
    : "";

  return `
    <section class="view view-balance">
      <div class="view-header">
        <h2>Balance helper</h2>
        <p class="muted">Courts keep beginners (1) and advanced (3) apart. When there are 4+ beginners, they get a full beginner court first; same for advanced. Leftovers mix with level 2 (1-2 or 2-3). Reshuffle remixes within those rules.</p>
      </div>

      ${extraCourtNote}
      <div class="balance-toolbar">
        <button type="button" class="btn btn-primary" id="btn-reshuffle">Reshuffle</button>
        <button type="button" class="btn btn-outline" id="btn-copy">Copy groupings</button>
      </div>
      <p id="balance-status" class="rsvp-status" aria-live="polite"></p>

      <div class="court-grid" id="court-grid">
        ${groups.map((group, i) => renderCourtCard(group, i)).join("")}
      </div>
    </section>`;
}

function renderCourtCard(group, index) {
  const letter = String.fromCharCode(65 + index); // A, B, C...
  const avg = groupAverage(group);
  const band = group._band || groupBand(group);
  const warn = courtHasConflict(group)
    ? `<p class="rsvp-status">Warning: beginner + advanced on this court. Reshuffle.</p>`
    : "";
  return `
    <div class="court-card">
      <h3>Court ${letter}</h3>
      <p class="court-avg muted">${escHtml(bandLabel(band))} &middot; Avg level: ${avg.toFixed(1)}</p>
      ${warn}
      <ul class="court-player-list">
        ${group.map(p => `
          <li>
            <span>${escHtml(p.name)}</span>
            ${levelBadge(p.level, { short: true })}
          </li>`).join("")}
      </ul>
    </div>`;
}

function attachBalanceHandlers() {
  const session = getCurrentSession();
  if (!session) return;
  const attendees = (session.attendeeIds || []).map(id => getPlayerById(id)).filter(Boolean);
  const courts = session.courts || 1;
  const status = document.getElementById("balance-status");

  const persistCurrentGrid = groups => {
    const attendeeIds = attendees.map(p => p.id).sort().join(",");
    writeJSON(LS_KEYS.GROUPINGS, {
      ...readJSON(LS_KEYS.GROUPINGS, {}),
      [session.id]: { groups: groups.map(g => g.map(p => p.id)), _forIds: attendeeIds, _courts: courts }
    });
  };

  const reshuffleBtn = document.getElementById("btn-reshuffle");
  if (reshuffleBtn) {
    reshuffleBtn.addEventListener("click", () => {
      const newGroups = computeReshuffledGroups(attendees, courts);
      persistCurrentGrid(newGroups);
      document.getElementById("court-grid").innerHTML = newGroups.map((g, i) => renderCourtCard(g, i)).join("");
      if (status) status.textContent = "Groupings reshuffled.";
    });
  }

  const copyBtn = document.getElementById("btn-copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const cards = document.querySelectorAll(".court-card");
      let text = `${session.weekLabel || "This week"}  - court groupings\n`;
      cards.forEach(card => {
        const title = card.querySelector("h3").textContent;
        const names = Array.from(card.querySelectorAll(".court-player-list li span")).map(s => s.textContent);
        text += `\n${title}: ${names.join(", ")}`;
      });
      try {
        await navigator.clipboard.writeText(text);
        if (status) status.textContent = "Groupings copied to clipboard.";
      } catch (e) {
        if (status) status.textContent = "Couldn't copy automatically â€” select and copy the text below.";
        console.warn("cemspadel: clipboard write failed", e);
      }
    });
  }
}

/* ============================== View: History ============================== */

function renderHistory() {
  const sessions = getPastSessions();

  if (sessions.length === 0) {
    return `
      <section class="view view-history">
        <div class="view-header"><h2>Session history</h2></div>
        <div class="empty-state">
          <h2>No past sessions yet</h2>
          <p>Once a week has passed, it'll show up here with who played and their levels at the time.</p>
        </div>
      </section>`;
  }

  return `
    <section class="view view-history">
      <div class="view-header"><h2>Session history</h2></div>
      <ul class="history-list">
        ${sessions.map(s => renderHistoryCard(s)).join("")}
      </ul>
    </section>`;
}

function renderHistoryCard(session) {
  const venue = resolveSessionVenue(session);
  const attendees = (session.attendeeIds || []).map(id => getPlayerById(id)).filter(Boolean);
  return `
    <li class="card history-card">
      <div class="history-card-header">
        <h3>${escHtml(session.weekLabel || session.dateISO)}</h3>
        <span class="muted">${escHtml(formatDate(session.dateISO))}</span>
      </div>
      <dl class="session-facts session-facts--compact">
        <div><dt>Venue</dt><dd>${venue.name ? escHtml(venue.name) : "Unknown"}${venue.mapsUrl ? ` <a href="${escHtml(venue.mapsUrl)}" target="_blank" rel="noopener">Map</a>` : ""}</dd></div>
        <div><dt>Price</dt><dd>${session.pricePerPerson ? `&euro;${escHtml(session.pricePerPerson)}/person` : "TBD"}</dd></div>
        <div><dt>Courts</dt><dd>${escHtml(session.courts || "?")}</dd></div>
      </dl>
      ${attendees.length ? `
        <ul class="attendee-list attendee-list--compact">
          ${attendees.map(p => `<li>${escHtml(p.name)} ${levelBadge(p.level, { short: true })}</li>`).join("")}
        </ul>` : `<p class="empty-inline">No attendee record.</p>`}
    </li>`;
}

/* ============================== View: Admin ============================== */

function renderAdminLock() {
  return `
    <section class="view view-admin">
      <div class="view-header">
        <h2>Admin locked</h2>
        <p class="muted">Only organizers can edit this week's session and the player roster.</p>
      </div>
      <form id="admin-lock-form" class="card stacked-form admin-lock-card">
        <label for="admin-password">Password</label>
        <input id="admin-password" name="password" type="password" autocomplete="current-password" required autofocus placeholder="Enter admin password">
        <button type="submit" class="btn btn-primary">Unlock Admin</button>
        <p id="admin-lock-status" class="rsvp-status" aria-live="polite"></p>
      </form>
    </section>`;
}

function attachAdminLockHandlers() {
  const form = document.getElementById("admin-lock-form");
  if (!form) return;
  form.addEventListener("submit", e => {
    e.preventDefault();
    const input = document.getElementById("admin-password");
    const status = document.getElementById("admin-lock-status");
    const value = (input && input.value) || "";
    if (value === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      renderView("admin");
      return;
    }
    if (status) status.textContent = "Wrong password. Try again.";
    if (input) {
      input.value = "";
      input.focus();
    }
  });
}

function renderAdmin() {
  const session = getCurrentSession();
  const players = getAllPlayers().sort((a, b) => a.name.localeCompare(b.name));
  const venue = session ? resolveSessionVenue(session) : { name: "", address: "", mapsUrl: "" };

  const sessionForm = !session
    ? `<div class="empty-state"><h2>No session set for this week yet</h2></div>`
    : `
      <form id="admin-form" class="card stacked-form">
        <h3>Edit this week</h3>
        <label for="admin-venue-name">Venue name</label>
        <input id="admin-venue-name" name="venueName" type="text" required maxlength="120" placeholder="e.g. Drop Shot Padel Club" value="${escHtml(venue.name)}">

        <label for="admin-venue-address">Address (optional)</label>
        <input id="admin-venue-address" name="venueAddress" type="text" maxlength="200" placeholder="e.g. Carrer d'Arago 300, Barcelona" value="${escHtml(venue.address)}">

        <label for="admin-maps-url">Google Maps link</label>
        <input id="admin-maps-url" name="mapsUrl" type="url" maxlength="500" placeholder="https://maps.google.com/... or https://maps.app.goo.gl/..." value="${escHtml(venue.mapsUrl)}">
        <p class="muted" style="margin-top:-0.35rem;margin-bottom:0.75rem">Paste a Google Maps share link so people can open the location in one tap.</p>

        <label for="admin-date">Date</label>
        <input id="admin-date" name="dateISO" type="date" value="${escHtml(session.dateISO)}">

        <label for="admin-time">Time</label>
        <input id="admin-time" name="time" type="time" value="${escHtml(session.time || "")}">

        <label for="admin-price">Price per person (&euro;)</label>
        <input id="admin-price" name="pricePerPerson" type="number" min="0" step="0.5" value="${escHtml(session.pricePerPerson || "")}">

        <label for="admin-court-total">Court total price (&euro;, optional)</label>
        <input id="admin-court-total" name="courtTotalPrice" type="number" min="0" step="0.5" value="${escHtml(session.courtTotalPrice || "")}">

        <label for="admin-courts">Courts booked</label>
        <input id="admin-courts" name="courts" type="number" min="1" max="8" value="${escHtml(session.courts || 1)}">

        <label for="admin-whatsapp">WhatsApp link (optional)</label>
        <input id="admin-whatsapp" name="whatsappUrl" type="url" placeholder="https://chat.whatsapp.com/..." value="${escHtml(session.whatsappUrl || "")}">

        <label for="admin-notes">Notes</label>
        <textarea id="admin-notes" name="notes" rows="3">${escHtml(session.notes || "")}</textarea>

        <div class="admin-actions">
          <button type="submit" class="btn btn-primary">Save session</button>
          <button type="button" class="btn btn-outline" id="btn-admin-lock">Lock Admin</button>
        </div>
        <p id="admin-status" class="rsvp-status" aria-live="polite"></p>
      </form>`;

  return `
    <section class="view view-admin">
      <div class="view-header">
        <h2>Admin</h2>
        <p class="muted">Edit this week's session and the player roster. Changes save in this browser only (localStorage).</p>
      </div>

      ${sessionForm}

      <div class="card">
        <h3>Add a player</h3>
        <form id="add-player-form" class="stacked-form">
          <label for="new-player-name">Name</label>
          <input id="new-player-name" name="name" type="text" required maxlength="60" placeholder="e.g. Marta Silva">

          <label for="new-player-level">Level</label>
          <select id="new-player-level" name="level">
            <option value="1">1 - Beginner</option>
            <option value="2" selected>2 - Intermediate</option>
            <option value="3">3 - Advanced</option>
          </select>

          <label for="new-player-notes">Notes (optional)</label>
          <input id="new-player-notes" name="notes" type="text" maxlength="120" placeholder="e.g. lefty, prefers back court">

          <button type="submit" class="btn btn-primary">Add player</button>
        </form>
        <p id="roster-status" class="rsvp-status" aria-live="polite"></p>
      </div>

      <div class="card">
        <h3>Edit roster (${players.length})</h3>
        <ul class="player-list" id="admin-player-list">
          ${players.map(p => renderAdminPlayerRow(p)).join("")}
        </ul>
      </div>
    </section>`;
}

function attachAdminHandlers() {
  const session = getCurrentSession();
  const form = document.getElementById("admin-form");
  if (form && session) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const fd = new FormData(form);
      setSessionOverride(session.id, {
        venueName: (fd.get("venueName") || "").toString().trim(),
        venueAddress: (fd.get("venueAddress") || "").toString().trim(),
        mapsUrl: (fd.get("mapsUrl") || "").toString().trim(),
        dateISO: fd.get("dateISO") || session.dateISO,
        time: fd.get("time") || session.time,
        pricePerPerson: fd.get("pricePerPerson") ? Number(fd.get("pricePerPerson")) : session.pricePerPerson,
        courtTotalPrice: fd.get("courtTotalPrice") ? Number(fd.get("courtTotalPrice")) : session.courtTotalPrice,
        courts: fd.get("courts") ? Number(fd.get("courts")) : session.courts,
        whatsappUrl: fd.get("whatsappUrl") || "",
        notes: fd.get("notes") || ""
      });
      const status = document.getElementById("admin-status");
      if (status) status.textContent = "Saved. Check Home to see the update.";
    });
  }

  const lockBtn = document.getElementById("btn-admin-lock");
  if (lockBtn) {
    lockBtn.addEventListener("click", () => {
      setAdminUnlocked(false);
      renderView("admin");
    });
  }

  const addForm = document.getElementById("add-player-form");
  if (addForm) {
    addForm.addEventListener("submit", e => {
      e.preventDefault();
      const name = document.getElementById("new-player-name").value.trim();
      const level = document.getElementById("new-player-level").value;
      const notes = document.getElementById("new-player-notes").value.trim();
      if (!name) return;
      addCustomPlayer(name, level, notes);
      renderView("admin");
    });
  }

  document.querySelectorAll(".level-select").forEach(select => {
    select.addEventListener("change", () => {
      setPlayerLevel(select.dataset.playerId, select.value);
      const status = document.getElementById("roster-status");
      if (status) status.textContent = "Level updated.";
      renderView("admin");
    });
  });

  document.querySelectorAll(".btn-delete-player").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.playerId;
      const name = btn.dataset.playerName || "this player";
      if (!id) return;
      if (!confirm(`Delete ${name} from the roster?`)) return;
      deletePlayer(id);
      const status = document.getElementById("roster-status");
      if (status) status.textContent = `${name} deleted.`;
      renderView("admin");
    });
  });
}

/* ============================== Boot ============================== */

function initNav() {
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      navigate(link.dataset.view);
    });
  });
}

window.addEventListener("hashchange", () => {
  const view = currentViewFromHash();
  renderView(view);
  updateNavState(view);
});

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  const view = currentViewFromHash();
  renderView(view);
  updateNavState(view);
});
