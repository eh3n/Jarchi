const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");

const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "نام کاربری و رمز عبور را وارد کنید." });
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است." });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/me", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "وارد نشده‌اید." });
  res.json({ username: req.session.username });
});

router.post("/change-password", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: "وارد نشده‌اید." });
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "رمز جدید باید حداقل ۶ کاراکتر باشد و رمز فعلی الزامی است." });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.userId);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: "رمز فعلی اشتباه است." });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
  res.json({ ok: true });
});

module.exports = router;
