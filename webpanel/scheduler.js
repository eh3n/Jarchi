// Scheduler: bells, automatic Azan (adhan lib) and source auto-switching.
const path = require("path");
const db = require("./db");
const { getSetting, setSetting } = require("./db");
const liquidsoap = require("./liquidsoap-client");

let adhan = null;
try { adhan = require("adhan"); } catch (_) { /* npm install adhan */ }

const BELL_DIR = process.env.BELL_DIR || "/var/lib/paging/bells";
const fired = new Set();

function nowInTz(tz) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    hour: "2-digit", minute: "2-digit", weekday: "short",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let hour = get("hour");
  if (hour === "24") hour = "00";
  return { hhmm: `${hour}:${get("minute")}`, day: dayMap[get("weekday")], dateKey: `${get("year")}-${get("month")}-${get("day")}` };
}

function azanTimes(tz) {
  if (!adhan) return null;
  try {
    const coords = new adhan.Coordinates(
      Number(getSetting("azan_lat", "35.6892")),
      Number(getSetting("azan_lng", "51.3890"))
    );
    const pt = new adhan.PrayerTimes(coords, new Date(), adhan.CalculationMethod.Tehran());
    const fmt = (d) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
    return { fajr: fmt(pt.fajr), dhuhr: fmt(pt.dhuhr), maghrib: fmt(pt.maghrib) };
  } catch (_) { return null; }
}

function fireOnce(key, fn) {
  if (fired.has(key)) return;
  fired.add(key);
  fn();
}

async function tick() {
  try {
    const tz = getSetting("timezone", "Asia/Tehran");
    const now = nowInTz(tz);

    for (const s of db.prepare(`
      SELECT s.*, b.filename FROM schedules s JOIN bells b ON b.id = s.bell_id
      WHERE s.enabled = 1 AND s.time = ?`).all(now.hhmm)) {
      if (!s.days.split(",").map(Number).includes(now.day)) continue;
      fireOnce(`bell|${s.id}|${now.dateKey}|${now.hhmm}`, () => {
        liquidsoap.pushBell(path.join(BELL_DIR, s.filename)).catch(() => {});
        console.log(`🔔 زنگ "${s.name}" (${now.hhmm})`);
      });
    }

    if (getSetting("azan_enabled", "0") === "1") {
      const bellId = Number(getSetting("azan_bell_id", ""));
      const bell = bellId && db.prepare("SELECT * FROM bells WHERE id=?").get(bellId);
      const times = azanTimes(tz);
      if (bell && times) {
        for (const prayer of ["fajr", "dhuhr", "maghrib"]) {
          if (getSetting(`azan_${prayer}`, "1") !== "1") continue;
          if (times[prayer] !== now.hhmm) continue;
          fireOnce(`azan|${prayer}|${now.dateKey}`, () => {
            liquidsoap.pushBell(path.join(BELL_DIR, bell.filename)).catch(() => {});
            console.log(`🕌 اذان ${prayer} (${now.hhmm})`);
          });
        }
      }
    }

    for (const s of db.prepare("SELECT * FROM source_schedules WHERE enabled = 1 AND time = ?").all(now.hhmm)) {
      if (!s.days.split(",").map(Number).includes(now.day)) continue;
      fireOnce(`src|${s.id}|${now.dateKey}|${now.hhmm}`, async () => {
        try {
          if (s.source === "radio" && s.station_id) {
            const st = db.prepare("SELECT * FROM stations WHERE id=?").get(s.station_id);
            if (st) {
              db.prepare("UPDATE stations SET is_active=0").run();
              db.prepare("UPDATE stations SET is_active=1 WHERE id=?").run(st.id);
              await liquidsoap.setRadioUrl(st.url);
            }
          }
          setSetting("active_source", s.source);
          await liquidsoap.setActiveSource(s.source);
          console.log(`⏰ منبع خودکار → ${s.source} (${now.hhmm})`);
        } catch (e) { console.error("source schedule:", e.message); }
      });
    }

    if (fired.size > 800) fired.clear();
  } catch (err) { console.error("scheduler:", err.message); }
}

function startScheduler() {
  setInterval(tick, 20000);
  console.log("زمان‌بند جارچی فعال شد (زنگ / اذان / منبع خودکار).");
}

module.exports = { startScheduler, azanTimes, adhanAvailable: () => !!adhan };
