// Jarchi player: panel-driven track ordering (prefetch exactly one item,
// deterministic next/prev/select on the engine queue).
const fs = require("fs");
const path = require("path");
const db = require("./db");
const { getSetting } = require("./db");
const ls = require("./liquidsoap-client");

const MUSIC_DIR = process.env.MUSIC_DIR || "/var/lib/paging/music";
const NP = "/tmp/paging/now_playing.json";

let lastStarted = null;
let prefetchedAfter = null;
let busyUntil = 0;
let staleCount = 0;

const tracks = () => db.prepare("SELECT * FROM tracks ORDER BY sort_order, id").all();

function nextOf(fname) {
  const list = tracks();
  if (!list.length) return null;
  if (getSetting("play_mode", "normal") === "shuffle") {
    if (list.length === 1) return list[0];
    let n;
    do { n = list[Math.floor(Math.random() * list.length)]; } while (n.filename === fname);
    return n;
  }
  const idx = list.findIndex((t) => t.filename === fname);
  return list[(idx + 1 + list.length) % list.length];
}

function prevOf(fname) {
  const list = tracks();
  if (!list.length) return null;
  const idx = list.findIndex((t) => t.filename === fname);
  return list[(idx - 1 + list.length) % list.length];
}

function readNp() {
  try { return JSON.parse(fs.readFileSync(NP, "utf8")); } catch (_) { return null; }
}

async function pendingRids() {
  try {
    const out = await ls.sendCommand("musicq.secondary_queue");
    return out.match(/\d+/g) || [];
  } catch (_) {
    try {
      const out = await ls.sendCommand("musicq.queue");
      return (out.match(/\d+/g) || []).slice(1);
    } catch (_) { return []; }
  }
}

async function flushPending() {
  for (const rid of await pendingRids()) {
    try { await ls.sendCommand(`musicq.ignore ${rid}`); } catch (_) {}
  }
}

async function pushTrack(t) {
  if (t) await ls.pushMusic(path.join(MUSIC_DIR, t.filename));
}

async function tick() {
  try {
    if (Date.now() < busyUntil) return;
    if (getSetting("active_source", "off") !== "playlist") {
      lastStarted = null; prefetchedAfter = null;
      return;
    }
    const list = tracks();
    if (!list.length) return;

    const np = readNp();
    const valid = np && np.source === "playlist" && np.filename;
    const fname = valid ? path.basename(np.filename) : null;
    const dur = valid ? Number(np.duration || 0) : 0;
    const age = valid ? Date.now() / 1000 - np.started_at : 1e9;

    if (valid && (dur ? age < dur + 15 : age < 900)) {
      staleCount = 0;
      if (fname !== lastStarted) lastStarted = fname;
      if (prefetchedAfter !== lastStarted) {
        const pending = await pendingRids();
        if (pending.length === 0) {
          await pushTrack(nextOf(lastStarted));
        }
        prefetchedAfter = lastStarted;
      }
    } else {
      staleCount++;
      if (staleCount < 2) return;
      staleCount = 0;
      const pending = await pendingRids();
      if (pending.length === 0) {
        const start = lastStarted ? nextOf(lastStarted) : list[0];
        await pushTrack(start);
        try { await ls.sendCommand("player.next"); } catch (_) {}
      }
      lastStarted = null; prefetchedAfter = "pending";
      busyUntil = Date.now() + 6000;
    }
  } catch (_) {}
}

async function selectTrack(t) {
  busyUntil = Date.now() + 5000;
  await flushPending();
  await pushTrack(t);
  try { await ls.sendCommand("player.next"); } catch (_) {}
  lastStarted = null; prefetchedAfter = "pending";
}

async function next() {
  busyUntil = Date.now() + 4000;
  const np = readNp();
  const cur = np && np.filename ? path.basename(np.filename) : lastStarted;
  if (prefetchedAfter !== cur) {
    await flushPending();
    await pushTrack(nextOf(cur));
  }
  try { await ls.sendCommand("player.next"); } catch (_) {}
  lastStarted = null; prefetchedAfter = "pending";
}

async function prev() {
  busyUntil = Date.now() + 4000;
  const np = readNp();
  const cur = np && np.filename ? path.basename(np.filename) : lastStarted;
  await flushPending();
  await pushTrack(prevOf(cur));
  try { await ls.sendCommand("player.next"); } catch (_) {}
  lastStarted = null; prefetchedAfter = "pending";
}

function kick() {
  busyUntil = 0; lastStarted = null; prefetchedAfter = null;
  setTimeout(tick, 500);
}

function startPlayer() {
  setInterval(tick, 2500);
  console.log("Jarchi player فعال شد (مدیریت ترتیب پخش).");
}

module.exports = { startPlayer, selectTrack, next, prev, kick };
