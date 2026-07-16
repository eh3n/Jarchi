require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");

const { requireLogin } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const apiRoutes = require("./routes/api");
const { startScheduler } = require("./scheduler");
const db = require("./db");
const { getSetting } = require("./db");
const liquidsoap = require("./liquidsoap-client");

const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 },
}));

app.get("/", (req, res) => {
  res.redirect(req.session.userId ? "/dashboard.html" : "/login.html");
});

for (const page of ["dashboard.html", "music.html", "radio.html", "schedule.html", "settings.html"]) {
  app.get("/" + page, requireLogin, (_req, res) =>
    res.sendFile(path.join(__dirname, "public", page))
  );
}

app.use(express.static(path.join(__dirname, "public"), { index: false }));

const DONATE_WALLETS = {
  TRX: "TWMuMN3435R6Pzyz9cf8quGsReYxj1LNmC",
  BNB: "0xC6ab05293641Db86457BF32A54E4680a9527Be7E",
  SOL: "7KdTtuxkh1daRXUHaCVoH8YnfAs9FqmAupzGSbSg1d6q",
  ETH: "0xC6ab05293641Db86457BF32A54E4680a9527Be7E",
  BTC: "bc1q5sdkmwn4fk7ed8awqvzxqxnmkncjyz580ppyl6",
};

app.get("/meta", (_req, res) => {
  res.json({ app: "Jarchi", version: "4.7", author: "Ehsan Abdoli", wallets: DONATE_WALLETS });
});

app.use("/auth", authRoutes);
app.use("/api", requireLogin, apiRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "internal error" });
});

// -----------------------------------------------------------------
// -----------------------------------------------------------------
async function writeStateFromDb() {
  try {
    await liquidsoap.setActiveSource(getSetting("active_source", "off"));
    await liquidsoap.setVolume(Number(getSetting("volume_level", "0.85")));
    const st = db.prepare("SELECT * FROM stations WHERE is_active=1").get();
    if (st) await liquidsoap.setRadioUrl(st.url);
  } catch (e) { console.error("state init:", e.message); }
}
writeStateFromDb();

startScheduler();
require("./player").startPlayer();

// -----------------------------------------------------------------
// -----------------------------------------------------------------
const PAGES_LOG = "/var/log/paging/pages.log";
let pagesPos = 0;
let duckRestoreTimer = null;
try { pagesPos = fs.statSync(PAGES_LOG).size; } catch (_) {}

function applyDuck(active) {
  const lvl = active ? Number(getSetting("duck_level", "0.12")) : 1;
  liquidsoap.setDuck(lvl).catch(() => {});
}

setInterval(() => {
  try {
    const st = fs.statSync(PAGES_LOG);
    if (st.size < pagesPos) pagesPos = 0;
    if (st.size === pagesPos) return;
    const fd = fs.openSync(PAGES_LOG, "r");
    const buf = Buffer.alloc(st.size - pagesPos);
    fs.readSync(fd, buf, 0, buf.length, pagesPos);
    fs.closeSync(fd);
    pagesPos = st.size;
    for (const line of buf.toString("utf8").split("\n")) {
      if (line.includes(",start")) {
        applyDuck(true);
        clearTimeout(duckRestoreTimer);
        const maxSec = Number(getSetting("sip_max_page_seconds", "120")) + 15;
        duckRestoreTimer = setTimeout(() => applyDuck(false), maxSec * 1000);
      } else if (line.includes(",end")) {
        clearTimeout(duckRestoreTimer);
        applyDuck(false);
      }
    }
  } catch (_) {}
}, 600);
applyDuck(false);

app.listen(PORT, () => {
  console.log(`پنل وب سیستم پیجینگ روی پورت ${PORT} در حال اجراست`);
});
