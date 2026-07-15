require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./db");

const username = process.env.DEFAULT_ADMIN_USER || "admin";
const password = process.env.DEFAULT_ADMIN_PASS || "ChangeMe123!";

if (!db.prepare("SELECT id FROM users WHERE username = ?").get(username)) {
  db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(
    username, bcrypt.hashSync(password, 10)
  );
  console.log(`کاربر ادمین ساخته شد: ${username} / ${password}`);
}

// ایستگاه‌های رادیوی پیش‌فرض (فقط اگر جدول خالی باشد)
// این‌ها ایستگاه‌های معروف جهانی با آدرس‌های تاریخی پایدارند؛ با
// دکمه «بررسی لینک» از سرور خودتان تست کنید (بعضی CDN ها ممکن
// است IP ایران را محدود کنند).
const count = db.prepare("SELECT COUNT(*) AS c FROM stations").get().c;
if (count === 0) {
  const ins = db.prepare("INSERT INTO stations (name, url) VALUES (?, ?)");
  ins.run("Radio Paradise (Eclectic)", "https://stream.radioparadise.com/mp3-192");
  ins.run("FIP - Radio France", "https://icecast.radiofrance.fr/fip-midfi.mp3");
  ins.run("SomaFM Groove Salad (Chill)", "https://ice1.somafm.com/groovesalad-128-mp3");
  ins.run("KEXP Seattle", "https://kexp-mp3-128.streamguys1.com/kexp128.mp3");
  ins.run("Classic FM (UK)", "https://media-ssl.musicradio.com/ClassicFM");
  ins.run("Dance Wave!", "https://dancewave.online/dance.mp3");
  ins.run("Venice Classic Radio (Italy)", "https://uk2.streamingpulse.com/ssl/vcr1");
  console.log("ایستگاه‌های رادیوی پیش‌فرض اضافه شدند.");
}
