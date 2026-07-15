const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "paging.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT DEFAULT '',
  duration REAL DEFAULT 0,
  has_cover INTEGER DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  time TEXT NOT NULL,            -- "HH:MM"
  days TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',  -- 0=یکشنبه ... 6=شنبه
  bell_id INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (bell_id) REFERENCES bells(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS source_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  time TEXT NOT NULL,
  days TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6',
  source TEXT NOT NULL,           -- radio | playlist | spotify | off
  station_id INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

// مهاجرت از نسخه‌های قبلی
const cols = db.prepare("PRAGMA table_info(tracks)").all().map((c) => c.name);
if (!cols.includes("artist")) db.exec("ALTER TABLE tracks ADD COLUMN artist TEXT DEFAULT ''");
if (!cols.includes("duration")) db.exec("ALTER TABLE tracks ADD COLUMN duration REAL DEFAULT 0");
if (!cols.includes("has_cover")) db.exec("ALTER TABLE tracks ADD COLUMN has_cover INTEGER DEFAULT 0");

const defaults = {
  active_source: "off",
  volume_level: "0.85",
  premute_volume: "0.85",
  muted: "0",
  timezone: "Asia/Tehran",
  sip_mode: "A",
  sip_pbx_host: "192.168.1.10",
  sip_extension: "100",
  sip_password: "",
  sip_max_page_seconds: "120",
  sip_port: "5060",
  duck_level: "0.12",
  play_mode: "normal",
  azan_enabled: "0",
  azan_fajr: "1", azan_dhuhr: "1", azan_maghrib: "1",
  azan_lat: "35.6892", azan_lng: "51.3890",
  azan_bell_id: "",
};
const ins = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
for (const [k, v] of Object.entries(defaults)) ins.run(k, v);

function getSetting(key, fallback = null) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}
function setSetting(key, value) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, String(value));
}

module.exports = db;
module.exports.getSetting = getSetting;
module.exports.setSetting = setSetting;
