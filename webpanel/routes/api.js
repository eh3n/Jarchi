const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { execFile } = require("child_process");
const db = require("../db");
const { getSetting, setSetting } = require("../db");
const liquidsoap = require("../liquidsoap-client");
const { applySipConfig } = require("../sip-config");
const { azanTimes, adhanAvailable } = require("../scheduler");
const player = require("../player");

function cleanUrl(u) {
  const m = String(u || "").match(/https?:\/\/[^\s"'<>]+/);
  return m ? m[0] : String(u || "").trim();
}

const router = express.Router();

const MUSIC_DIR = process.env.MUSIC_DIR || "/var/lib/paging/music";
const BELL_DIR = process.env.BELL_DIR || "/var/lib/paging/bells";
const COVER_DIR = process.env.COVER_DIR || "/var/lib/paging/covers";
const NP_FILE = "/tmp/paging/now_playing.json";
const TEST_SOUND = "/opt/jarchi/assets/test-sound.wav";
for (const d of [MUSIC_DIR, BELL_DIR, COVER_DIR]) fs.mkdirSync(d, { recursive: true });

function makeUploader(dir, maxMb) {
  return multer({
    storage: multer.diskStorage({
      destination: (_r, _f, cb) => cb(null, dir),
      filename: (_r, f, cb) => cb(null, Date.now() + "-" + f.originalname.replace(/[^\w.\-آ-ی ]/g, "_")),
    }),
    fileFilter: (_r, f, cb) => {
      const ok = /\.(mp3|wav|ogg|flac|m4a)$/i.test(f.originalname);
      cb(ok ? null : new Error("only audio files allowed (mp3, wav, ogg, flac, m4a)"), ok);
    },
    limits: { fileSize: maxMb * 1024 * 1024 },
  });
}
const uploadMusic = makeUploader(MUSIC_DIR, 60);
const uploadBell = makeUploader(BELL_DIR, 20);

function run(cmd, args, timeout = 20000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

async function extractTrackMeta(trackId, filePath, fallbackTitle) {
  let title = fallbackTitle.replace(/\.[^.]+$/, "");
  let artist = "", duration = 0, hasCover = 0;
  try {
    const info = JSON.parse(await run("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_format", filePath]));
    const tags = (info.format && info.format.tags) || {};
    if (tags.title || tags.TITLE) title = tags.title || tags.TITLE;
    if (tags.artist || tags.ARTIST) artist = tags.artist || tags.ARTIST;
    duration = Number(info.format?.duration || 0);
  } catch (_) {}
  try {
    const coverPath = path.join(COVER_DIR, `${trackId}.jpg`);
    await run("ffmpeg", ["-y", "-i", filePath, "-an", "-vf", "scale=400:-1", "-frames:v", "1", coverPath]);
    if (fs.existsSync(coverPath) && fs.statSync(coverPath).size > 0) hasCover = 1;
  } catch (_) {}
  db.prepare("UPDATE tracks SET title=?, artist=?, duration=?, has_cover=? WHERE id=?")
    .run(title, artist, duration, hasCover, trackId);
}

router.get("/status", async (_req, res) => {
  const engine = await liquidsoap.getStatus();
  res.json({
    engine,
    active_source: getSetting("active_source", "off"),
    volume_level: getSetting("volume_level", "0.85"),
    muted: getSetting("muted", "0") === "1",
    play_mode: getSetting("play_mode", "normal"),
    timezone: getSetting("timezone", "Asia/Tehran"),
    active_station: db.prepare("SELECT * FROM stations WHERE is_active=1").get() || null,
  });
});

router.get("/nowplaying", (_req, res) => {
  let np = null;
  try { np = JSON.parse(fs.readFileSync(NP_FILE, "utf8")); } catch (_) {}
  let track = null;
  if (np && np.filename) {
    track = db.prepare("SELECT * FROM tracks WHERE filename = ?").get(path.basename(np.filename)) || null;
  }
  res.json({
    active_source: getSetting("active_source", "off"),
    now: np,
    track,
    station: db.prepare("SELECT * FROM stations WHERE is_active=1").get() || null,
    server_time: Date.now() / 1000,
  });
});

router.post("/source", async (req, res) => {
  const { source } = req.body;
  if (!["radio", "playlist", "spotify", "airplay", "off"].includes(source))
    return res.status(400).json({ error: "invalid source" });
  setSetting("active_source", source);
  try {
    await liquidsoap.setActiveSource(source);
    if (source === "playlist") player.kick();
    res.json({ ok: true });
  } catch (err) {
    res.status(502).json({ error: "engine unreachable: " + err.message });
  }
});

router.post("/transport/next", async (_req, res) => {
  try { await player.next(); res.json({ ok: true }); }
  catch (err) { res.status(502).json({ error: err.message }); }
});

router.post("/transport/prev", async (_req, res) => {
  try { await player.prev(); res.json({ ok: true }); }
  catch (err) { res.status(502).json({ error: err.message }); }
});

router.post("/transport/play-track/:id", async (req, res) => {
  const t = db.prepare("SELECT * FROM tracks WHERE id=?").get(req.params.id);
  if (!t) return res.status(404).json({ error: "track not found" });
  try {
    setSetting("active_source", "playlist");
    await liquidsoap.setActiveSource("playlist");
    await player.selectTrack(t);
    res.json({ ok: true });
  } catch (err) { res.status(502).json({ error: err.message }); }
});

router.post("/volume", async (req, res) => {
  const level = Number(req.body.value);
  if (Number.isNaN(level) || level < 0 || level > 1)
    return res.status(400).json({ error: "volume must be 0..1" });
  setSetting("volume_level", level);
  setSetting("muted", "0");
  try { await liquidsoap.setVolume(level); res.json({ ok: true }); }
  catch (err) { res.status(502).json({ error: err.message }); }
});

router.post("/transport/mute", async (_req, res) => {
  try {
    const muted = getSetting("muted", "0") === "1";
    if (muted) {
      const prev = Number(getSetting("premute_volume", "0.85"));
      setSetting("muted", "0");
      setSetting("volume_level", prev);
      await liquidsoap.setVolume(prev);
      res.json({ ok: true, muted: false, volume: prev });
    } else {
      setSetting("premute_volume", getSetting("volume_level", "0.85"));
      setSetting("muted", "1");
      setSetting("volume_level", 0);
      await liquidsoap.setVolume(0);
      res.json({ ok: true, muted: true, volume: 0 });
    }
  } catch (err) { res.status(502).json({ error: err.message }); }
});

router.post("/transport/playmode", async (req, res) => {
  const { mode } = req.body;
  if (!["normal", "shuffle"].includes(mode))
    return res.status(400).json({ error: "invalid mode" });
  setSetting("play_mode", mode);
  try { await liquidsoap.setPlayMode(mode); res.json({ ok: true, mode }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/transport/seek", async (req, res) => {
  const target = Number(req.body.position);
  if (Number.isNaN(target) || target < 0)
    return res.status(400).json({ error: "invalid position" });
  try {
    let np = JSON.parse(fs.readFileSync(NP_FILE, "utf8"));
    const elapsed = Math.max(0, Date.now() / 1000 - np.started_at);
    const delta = target - elapsed;
    const reply = await liquidsoap.seek(delta);
    const moved = Number((String(reply).match(/-?\d+(\.\d+)?/) || [0])[0]);
    if (Math.abs(delta) > 1 && Math.abs(moved) < 0.5) {
      return res.status(400).json({ error: "seek not supported for this track/decoder" });
    }
    np.started_at = Date.now() / 1000 - (elapsed + moved);
    fs.writeFileSync(NP_FILE, JSON.stringify(np));
    res.json({ ok: true, moved });
  } catch (err) { res.status(502).json({ error: err.message }); }
});

router.get("/stations", (_req, res) => {
  res.json(db.prepare("SELECT * FROM stations ORDER BY id").all());
});

router.post("/stations", (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 100);
  const url = cleanUrl(req.body.url);
  if (!name || !url) return res.status(400).json({ error: "name and url required" });
  const info = db.prepare("INSERT INTO stations (name, url) VALUES (?, ?)").run(name, url);
  res.json({ ok: true, id: info.lastInsertRowid });
});

router.put("/stations/:id", async (req, res) => {
  const st = db.prepare("SELECT * FROM stations WHERE id=?").get(req.params.id);
  if (!st) return res.status(404).json({ error: "station not found" });
  const name = String(req.body.name || "").trim().slice(0, 100);
  const url = cleanUrl(req.body.url);
  if (!name || !url) return res.status(400).json({ error: "name and url required" });
  db.prepare("UPDATE stations SET name=?, url=? WHERE id=?").run(name, url, st.id);
  if (st.is_active) {
    try { await liquidsoap.setRadioUrl(url); } catch (_) {}
  }
  res.json({ ok: true });
});

router.delete("/stations/:id", (req, res) => {
  db.prepare("DELETE FROM stations WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

router.post("/stations/:id/activate", async (req, res) => {
  const st = db.prepare("SELECT * FROM stations WHERE id=?").get(req.params.id);
  if (!st) return res.status(404).json({ error: "station not found" });
  db.prepare("UPDATE stations SET is_active=0").run();
  db.prepare("UPDATE stations SET is_active=1 WHERE id=?").run(st.id);
  setSetting("active_source", "radio");
  try {
    await liquidsoap.setRadioUrl(st.url);
    await liquidsoap.setActiveSource("radio");
    res.json({ ok: true });
  } catch (err) { res.status(502).json({ error: err.message }); }
});

router.get("/stations/:id/check", async (req, res) => {
  const st = db.prepare("SELECT * FROM stations WHERE id=?").get(req.params.id);
  if (!st) return res.status(404).json({ error: "station not found" });
  try {
    const out = await run("ffprobe", [
      "-v", "quiet", "-print_format", "json",
      "-show_format", "-show_streams",
      "-rw_timeout", "10000000", st.url,
    ], 15000);
    const info = JSON.parse(out);
    const audio = (info.streams || []).find((s) => s.codec_type === "audio") || {};
    const fmt = info.format || {};
    const isHls = /m3u8/i.test(st.url) || /hls/i.test(fmt.format_name || "");
    res.json({
      ok: true,
      format: fmt.format_name || "?",
      codec: audio.codec_name || "?",
      bitrate: Math.round(Number(fmt.bit_rate || audio.bit_rate || 0) / 1000) || null,
      sample_rate: audio.sample_rate || null,
      channels: audio.channels || null,
      hls_warning: isHls,
      icy_name: (fmt.tags && (fmt.tags["icy-name"] || fmt.tags.StreamTitle)) || null,
    });
  } catch (err) {
    res.json({ ok: false, error: err.message.slice(0, 300) });
  }
});

router.get("/tracks", (_req, res) => {
  res.json(db.prepare("SELECT * FROM tracks ORDER BY sort_order, id").all());
});

router.post("/tracks/upload", uploadMusic.array("tracks", 20), (req, res) => {
  const files = req.files || [];
  const insert = db.prepare("INSERT INTO tracks (filename, title, sort_order) VALUES (?, ?, ?)");
  const maxOrder = db.prepare("SELECT MAX(sort_order) AS m FROM tracks").get().m || 0;
  files.forEach((f, i) => {
    const info = insert.run(f.filename, f.originalname, maxOrder + i + 1);
    extractTrackMeta(info.lastInsertRowid, path.join(MUSIC_DIR, f.filename), f.originalname).catch(() => {});
  });
  res.json({ ok: true, uploaded: files.length });
});

router.get("/tracks/:id/cover", (req, res) => {
  const p = path.join(COVER_DIR, `${Number(req.params.id)}.jpg`);
  if (fs.existsSync(p)) return res.sendFile(p);
  res.status(404).end();
});

router.delete("/tracks/:id", (req, res) => {
  const t = db.prepare("SELECT * FROM tracks WHERE id=?").get(req.params.id);
  if (t) {
    fs.unlink(path.join(MUSIC_DIR, t.filename), () => {});
    fs.unlink(path.join(COVER_DIR, `${t.id}.jpg`), () => {});
    db.prepare("DELETE FROM tracks WHERE id=?").run(t.id);
  }
  res.json({ ok: true });
});

router.get("/bells", (_req, res) => {
  res.json(db.prepare("SELECT * FROM bells ORDER BY id").all());
});

router.post("/bells/upload", uploadBell.array("bells", 10), (req, res) => {
  const insert = db.prepare("INSERT INTO bells (filename, title) VALUES (?, ?)");
  (req.files || []).forEach((f) => insert.run(f.filename, f.originalname));
  res.json({ ok: true, uploaded: (req.files || []).length });
});

router.delete("/bells/:id", (req, res) => {
  const b = db.prepare("SELECT * FROM bells WHERE id=?").get(req.params.id);
  if (b) {
    fs.unlink(path.join(BELL_DIR, b.filename), () => {});
    db.prepare("DELETE FROM schedules WHERE bell_id=?").run(b.id);
    db.prepare("DELETE FROM bells WHERE id=?").run(b.id);
  }
  res.json({ ok: true });
});

router.post("/bells/:id/test", async (req, res) => {
  const b = db.prepare("SELECT * FROM bells WHERE id=?").get(req.params.id);
  if (!b) return res.status(404).json({ error: "bell not found" });
  try { await liquidsoap.pushBell(path.join(BELL_DIR, b.filename)); res.json({ ok: true }); }
  catch (err) { res.status(502).json({ error: err.message }); }
});

router.get("/schedules", (_req, res) => {
  res.json(db.prepare(`
    SELECT s.*, b.title AS bell_title FROM schedules s
    JOIN bells b ON b.id = s.bell_id ORDER BY s.time
  `).all());
});

router.post("/schedules", (req, res) => {
  const { name, time, days, bell_id } = req.body;
  if (!name || !/^\d{2}:\d{2}$/.test(time || "") || !bell_id)
    return res.status(400).json({ error: "name, time (HH:MM) and bell required" });
  const daysStr = (Array.isArray(days) && days.length ? days : [0,1,2,3,4,5,6]).join(",");
  const info = db.prepare("INSERT INTO schedules (name, time, days, bell_id) VALUES (?, ?, ?, ?)")
    .run(name, time, daysStr, bell_id);
  res.json({ ok: true, id: info.lastInsertRowid });
});

router.post("/schedules/:id/toggle", (req, res) => {
  db.prepare("UPDATE schedules SET enabled = 1 - enabled WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

router.delete("/schedules/:id", (req, res) => {
  db.prepare("DELETE FROM schedules WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

router.get("/settings", (_req, res) => {
  const out = {};
  for (const k of ["timezone", "sip_mode", "sip_pbx_host", "sip_extension", "sip_max_page_seconds"])
    out[k] = getSetting(k, "");
  out.sip_password_set = !!getSetting("sip_password", "");
  out.sip_port = getSetting("sip_port", "5060");
  out.duck_level = getSetting("duck_level", "0.12");
  try {
    out.alsa_device = fs.readFileSync("/opt/jarchi/liquidsoap/alsa_device.conf", "utf8").trim();
  } catch (_) { out.alsa_device = "default"; }
  res.json(out);
});

router.post("/settings/duck", (req, res) => {
  const v = Number(req.body.value);
  if (Number.isNaN(v) || v < 0 || v > 0.9)
    return res.status(400).json({ error: "duck level must be 0..0.9" });
  setSetting("duck_level", String(v));
  res.json({ ok: true });
});

router.post("/settings/timezone", (req, res) => {
  const { timezone } = req.body;
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }); }
  catch (_) { return res.status(400).json({ error: "invalid timezone" }); }
  setSetting("timezone", timezone);
  res.json({ ok: true });
});

router.get("/settings/audio-devices", async (_req, res) => {
  let raw = "";
  const devices = [{ id: "default", label: "default" }];
  try {
    raw = await run("aplay", ["-l"]);
    for (const line of raw.split("\n")) {
      const m = line.match(/^card (\d+): (\S+) \[(.+?)\], device (\d+): (.+?) \[/);
      if (m) {
        devices.push({ id: `plughw:${m[1]},${m[4]}`, label: `${m[3]} — ${m[5]} (plughw:${m[1]},${m[4]})` });
        devices.push({ id: `hw:${m[1]},${m[4]}`, label: `${m[3]} — ${m[5]} (hw:${m[1]},${m[4]})` });
      }
    }
  } catch (err) { raw = err.message; }
  res.json({ devices, raw });
});

router.post("/settings/audio-device", async (req, res) => {
  const { device } = req.body;
  if (!device || !/^[\w:,.-]+$/.test(device))
    return res.status(400).json({ error: "invalid device name" });
  try {
    fs.writeFileSync("/opt/jarchi/liquidsoap/alsa_device.conf", device + "\n");
    await run("sudo", ["/usr/bin/systemctl", "restart", "paging-liquidsoap"], 30000);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/settings/test-sound", async (_req, res) => {
  try { await liquidsoap.pushTest(TEST_SOUND); res.json({ ok: true }); }
  catch (err) { res.status(502).json({ error: "engine unreachable: " + err.message }); }
});

router.post("/settings/sip", async (req, res) => {
  const { mode, pbx_host, extension, password, max_page_seconds, port } = req.body;
  const sipPort = Number(port) || 5060;
  if (sipPort < 1024 || sipPort > 65535)
    return res.status(400).json({ error: "SIP port must be 1024-65535" });
  if (!["A", "B"].includes(mode)) return res.status(400).json({ error: "invalid mode" });
  if (!/^\d{2,6}$/.test(String(extension))) return res.status(400).json({ error: "extension must be 2-6 digits" });
  if (mode === "A" && !pbx_host) return res.status(400).json({ error: "PBX host required in mode A" });
  if (pbx_host && !/^[\w.\-:]+$/.test(pbx_host)) return res.status(400).json({ error: "invalid PBX host" });

  setSetting("sip_mode", mode);
  setSetting("sip_pbx_host", pbx_host || "");
  setSetting("sip_extension", String(extension));
  setSetting("sip_port", String(sipPort));
  if (password) setSetting("sip_password", password);
  setSetting("sip_max_page_seconds", String(Math.min(600, Math.max(10, Number(max_page_seconds) || 120))));

  if (!getSetting("sip_password", ""))
    return res.status(400).json({ error: "SIP password not set yet" });

  try {
    const output = await applySipConfig();
    res.json({ ok: true, message: output });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/settings/sip-status", async (_req, res) => {
  try {
    const out = await run("asterisk", ["-rx", "pjsip show registrations"], 10000);
    return res.json({ ok: true, output: out.trim() });
  } catch (err) {
    try {
      const out = await run("sudo", ["-n", "/usr/sbin/asterisk", "-rx", "pjsip show registrations"], 10000);
      return res.json({ ok: true, output: out.trim() });
    } catch (err2) {
      let hint = err2.message;
      if (/asterisk\.ctl/.test(hint)) {
        hint += "\n\nHINT: Asterisk is probably not running. Try: systemctl status asterisk";
      }
      res.json({ ok: false, output: hint });
    }
  }
});

router.get("/system/backup", (_req, res) => {
  const out = "/tmp/jarchi-backup.tar.gz";
  execFile("tar", [
    "--ignore-failed-read", "-czf", out, "-C", "/opt/jarchi",
    "webpanel/data", "liquidsoap/state", "liquidsoap/alsa_device.conf",
  ], (err) => {
    if (err && !fs.existsSync(out)) return res.status(500).json({ error: err.message });
    res.download(out, "jarchi-backup-" + new Date().toISOString().slice(0, 10) + ".tar.gz");
  });
});

router.get("/system/services", async (_req, res) => {
  const check = async (svc) => {
    try { return (await run("systemctl", ["is-active", svc], 5000)).trim(); }
    catch (err) { return (err.message || "unknown").trim(); }
  };
  res.json({
    liquidsoap: await check("paging-liquidsoap"),
    asterisk: await check("asterisk"),
  });
});

router.post("/system/restart-engine", async (_req, res) => {
  try {
    await run("sudo", ["/usr/bin/systemctl", "restart", "paging-liquidsoap"], 30000);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/system/reboot", (_req, res) => {
  res.json({ ok: true });
  setTimeout(() => {
    execFile("sudo", ["/usr/sbin/reboot"], () => {});
  }, 1000);
});

router.get("/azan", (_req, res) => {
  res.json({
    available: adhanAvailable(),
    times: azanTimes(getSetting("timezone", "Asia/Tehran")),
    enabled: getSetting("azan_enabled", "0") === "1",
    fajr: getSetting("azan_fajr", "1") === "1",
    dhuhr: getSetting("azan_dhuhr", "1") === "1",
    maghrib: getSetting("azan_maghrib", "1") === "1",
    lat: getSetting("azan_lat", "35.6892"),
    lng: getSetting("azan_lng", "51.3890"),
    bell_id: getSetting("azan_bell_id", ""),
  });
});

router.post("/azan", (req, res) => {
  const b = req.body;
  setSetting("azan_enabled", b.enabled ? "1" : "0");
  for (const p of ["fajr", "dhuhr", "maghrib"]) setSetting(`azan_${p}`, b[p] ? "1" : "0");
  if (b.lat) setSetting("azan_lat", String(Number(b.lat) || 35.6892));
  if (b.lng) setSetting("azan_lng", String(Number(b.lng) || 51.389));
  if (b.bell_id !== undefined) setSetting("azan_bell_id", String(b.bell_id || ""));
  res.json({ ok: true });
});

router.get("/source-schedules", (_req, res) => {
  res.json(db.prepare(`
    SELECT s.*, st.name AS station_name FROM source_schedules s
    LEFT JOIN stations st ON st.id = s.station_id ORDER BY s.time`).all());
});

router.post("/source-schedules", (req, res) => {
  const { time, days, source, station_id } = req.body;
  if (!/^\d{2}:\d{2}$/.test(time || "") || !["radio", "playlist", "spotify", "airplay", "off"].includes(source))
    return res.status(400).json({ error: "time (HH:MM) and valid source required" });
  const d = (Array.isArray(days) && days.length ? days : [0,1,2,3,4,5,6]).join(",");
  const info = db.prepare("INSERT INTO source_schedules (time, days, source, station_id) VALUES (?, ?, ?, ?)")
    .run(time, d, source, station_id || null);
  res.json({ ok: true, id: info.lastInsertRowid });
});

router.post("/source-schedules/:id/toggle", (req, res) => {
  db.prepare("UPDATE source_schedules SET enabled = 1 - enabled WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

router.delete("/source-schedules/:id", (req, res) => {
  db.prepare("DELETE FROM source_schedules WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

router.get("/radiobrowser", async (req, res) => {
  const q = String(req.query.q || "").slice(0, 60);
  if (!q) return res.json([]);
  try {
    const r = await fetch(
      "https://de1.api.radio-browser.info/json/stations/search?name=" +
        encodeURIComponent(q) + "&hidebroken=true&order=votes&reverse=true&limit=15",
      { headers: { "User-Agent": "Jarchi/4.0" } }
    );
    const list = await r.json();
    res.json(list.map((s) => ({
      name: s.name, url: s.url_resolved || s.url,
      codec: s.codec, bitrate: s.bitrate, country: s.countrycode,
    })));
  } catch (err) { res.status(502).json({ error: err.message }); }
});

router.get("/pages/history", (_req, res) => {
  let lines = [];
  try {
    lines = fs.readFileSync("/var/log/paging/pages.log", "utf8").trim().split("\n").slice(-200);
  } catch (_) {}
  const events = lines.map((l) => l.split(",")).filter((p) => p.length >= 3);
  const pages = [];
  const open = {};
  for (const [epoch, caller, ev] of events) {
    if (ev === "start") open[caller] = Number(epoch);
    else if (ev === "end" && open[caller]) {
      pages.push({ caller, start: open[caller], duration: Number(epoch) - open[caller] });
      delete open[caller];
    }
  }
  for (const [caller, start] of Object.entries(open)) pages.push({ caller, start, duration: null });
  res.json(pages.slice(-30).reverse());
});

router.get("/system/diagnose", async (_req, res) => {
  const out = {};
  const cmds = {
    uptime: "uptime",
    radio_status: "radio_stream.status",
    playlist_next: "music.next",
  };
  for (const [k, c] of Object.entries(cmds)) {
    try { out[k] = await liquidsoap.sendCommand(c, 3000); }
    catch (e) { out[k] = "ERR: " + e.message; }
  }
  const stateDir = "/opt/jarchi/liquidsoap/state";
  for (const [k, f] of Object.entries({
    active_source: "active_source.txt",
    volume_level: "volume.txt",
    radio_url: "radio_url.txt",
  })) {
    try { out[k] = fs.readFileSync(require("path").join(stateDir, f), "utf8").trim(); }
    catch (_) { out[k] = "(state file missing)"; }
  }
  try {
    const log = fs.readFileSync("/var/log/paging/liquidsoap.log", "utf8");
    out.log_tail = log.split("\n").slice(-50).join("\n");
  } catch (e) { out.log_tail = "log unreadable: " + e.message; }
  res.json(out);
});

module.exports = router;
