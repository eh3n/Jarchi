<div align="center">

# 📣 Jarchi

**The all-in-one SIP paging, background music & scheduling system for your business — on a single Linux server.**

*Turn any server with a sound card into a professional announcement system: phone paging, internet radio, playlists with crossfade, school bells, automatic Azan, and a beautiful 5-language web panel.*

[⭐ Star this repo](https://github.com/eh3n/Jarchi) · [Report a bug](https://github.com/eh3n/Jarchi/issues) · [فارسی 🇮🇷](#-جارچی-فارسی)

![Dashboard](docs/screenshots/dashboard.png)

</div>

---

## ✨ Features

- 📞 **SIP Paging** — dial an extension from any office phone and your voice plays live over the amplifier. Works with your existing PBX (Grandstream, FreePBX, 3CX, Issabel…) or standalone (phones register directly to Jarchi).
- 🔉 **Smart ducking** — background music drops to an **adjustable level** (Settings → Audio) during a page, then comes right back. No jarring cuts.
- 🎵 **Playlist with crossfade** — upload your music; tracks blend into each other Spotify-style. Shuffle, next/prev, click-to-play, seek on the progress bar, album art extracted automatically.
- 📻 **Internet radio** — add any stream URL, or search the built-in global station directory (link health & bitrate checker included).
- 🔔 **Bell scheduler** — school bells, lunch breaks, shift changes. Pick a sound, time (AM/PM picker) and weekdays. 4 ready-made bell sounds included.
- 🕌 **Automatic Azan** — daily prayer times computed for your city (50+ cities built in), plays your chosen Azan automatically. One-command download of the classic Moazzenzadeh Azan.
- ⏰ **Source scheduler** — radio in the morning, playlist in the afternoon, silence at night. Automatic.
- 🎧 **Spotify Connect** *(optional)* — the server appears as a playback device in your Spotify app.
- 📱 **AirPlay receiver** *(optional)* — every iPhone/iPad/Mac on the LAN sees "Jarchi" as a speaker.
- 🌐 **5-language panel** — فارسی / English / Русский / العربية / Türkçe, with RTL support, dark/light themes, fully responsive on mobile.
- 📢 **Page history**, one-click settings backup, sound-card test button, engine diagnostics, reboot from the panel.

## 🖥️ Requirements

| | Minimum |
|---|---|
| **OS** | Debian 12 or Ubuntu 22.04+ (fresh server recommended) |
| **CPU/RAM** | 1 CPU core, 1 GB RAM (any old PC or a small VM works) |
| **Sound card** | Onboard audio jack **or** any USB sound card |
| **Output** | Connect the sound card's line-out to your **amplifier** or powered speakers |
| **Network** | Same LAN as your phones/PBX |

```
Office phones ──SIP──▶ Jarchi server ──audio cable──▶ Amplifier ──▶ Ceiling speakers 🔊
```

## 🚀 Installation (beginner friendly)

**1.** Get a Debian/Ubuntu server and connect its audio output to your amplifier.

**2.** SSH into the server and run:

```bash
git clone https://github.com/eh3n/Jarchi.git
cd Jarchi
sudo bash install.sh
```

That's it. The installer detects fresh installs vs updates automatically, checks engine compatibility, opens firewall ports, and generates sample bell sounds.

**3.** Open `http://YOUR_SERVER_IP:8080` — login `admin` / `ChangeMe123!` *(change it immediately in Settings)*.

**4.** First-time setup inside the panel:
- **Settings → Audio Output**: pick your sound card (choose the `plughw` option for USB cards) and hit **Test sound** 🔊
- **Settings → SIP**: mode **A** (register to your existing PBX — enter the extension/password your PBX admin gives you) or mode **B** (standalone — phones register to Jarchi as 101–106, then dial the paging number)
- **Music / Radio / Bells**: upload tracks, add stations, schedule bells

**Optional — classic Azan:**
```bash
sudo bash /opt/jarchi/scripts/get-azan.sh
```

**Optional — Spotify Connect:**
```bash
sudo bash /opt/jarchi/scripts/install-spotify.sh
```

**Optional — AirPlay receiver:**
```bash
sudo bash /opt/jarchi/scripts/install-airplay.sh
```

## 🧯 Troubleshooting

```bash
systemctl status paging-liquidsoap paging-webpanel asterisk
journalctl -u paging-liquidsoap -n 40
```
The panel also has a built-in **Engine diagnostics** button (Settings → System).

## ❤️ Support the project

If Jarchi saves you from buying a $500 paging appliance, consider:
- ⭐ **starring the repo** — it really helps others find it
- ☕ **donating** (addresses in the panel footer): TRX / BNB / SOL / ETH / BTC

**Designed & developed by [Ehsan Abdoli](https://github.com/eh3n) · AGPL-3.0 License**

---
---

<div dir="rtl" align="right">

# 📣 جارچی (فارسی)

**سیستم یکپارچه پیجینگ تلفنی، موزیک پس‌زمینه و زمان‌بندی برای کسب‌وکار شما — روی یک سرور لینوکس.**

هر سرور یا کیس قدیمی که کارت صدا داشته باشد را به یک سیستم اعلان حرفه‌ای تبدیل کنید: پیج از روی تلفن داخلی، رادیوی اینترنتی، پلی‌لیست با کراس‌فید، زنگ مدرسه، اذان خودکار و پنل وب ۵ زبانه.

## ✨ امکانات

- 📞 **پیجینگ SIP** — از هر تلفن داخلی، شماره پیج را بگیرید و صدایتان زنده از آمپلی‌فایر پخش شود. هم با سانترال موجود (گرنداستریم، FreePBX، ایزابل و...) کار می‌کند، هم مستقل (گوشی‌ها مستقیم به جارچی رجیستر می‌شوند).
- 🔉 **داکینگ هوشمند** — هنگام پیج، موزیک تا سطحی **قابل تنظیم** (تنظیمات > صدا) کم می‌شود و بعد از تماس برمی‌گردد؛ نه قطع ناگهانی.
- 🎵 **پلی‌لیست با کراس‌فید** — انتهای هر آهنگ با ابتدای بعدی میکس می‌شود، مثل اسپاتیفای. شافل، قبلی/بعدی، پخش با کلیک، جابه‌جایی روی نوار پخش و استخراج خودکار کاور آلبوم.
- 📻 **رادیو اینترنتی** — با جستجوگر دیتابیس جهانی ایستگاه‌ها و دکمه بررسی سلامت و کیفیت لینک.
- 🔔 **زمان‌بند زنگ** — زنگ مدرسه، ناهار، تعویض شیفت؛ با انتخاب ساعت (قبل/بعدازظهر) و روزهای هفته. ۴ صدای زنگ آماده همراه نصب.
- 🕌 **اذان خودکار** — اوقات شرعی برای بیش از ۵۰ شهر (۳۳ شهر ایران) محاسبه و اذان انتخابی‌تان سر وقت پخش می‌شود. اذان ماندگار مؤذن‌زاده با یک دستور دانلود می‌شود.
- ⏰ **برنامه خودکار منبع** — صبح رادیو، بعدازظهر پلی‌لیست، شب خاموش.
- 🎧 **Spotify Connect** (اختیاری) — سرور به‌عنوان دستگاه پخش در اپ اسپاتیفای شما ظاهر می‌شود.
- 📱 **گیرنده AirPlay** (اختیاری) — هر آیفون/آیپد/مک داخل شبکه، «Jarchi» را به‌عنوان بلندگو می‌بیند.
- 🌐 **پنل ۵ زبانه** فارسی/انگلیسی/روسی/عربی/ترکی، راست‌چین، تم روز و شب، کاملاً رسپانسیو روی موبایل.
- 📢 تاریخچه پیج‌ها، بکاپ یک‌کلیکی، تست کارت صدا، عیب‌یابی موتور و ریبوت از داخل پنل.

## 🖥️ سیستم مورد نیاز

| | حداقل |
|---|---|
| **سیستم‌عامل** | Debian 12 یا Ubuntu 22.04 به بالا |
| **سخت‌افزار** | ۱ هسته CPU و ۱ گیگ رم (هر کیس قدیمی یا ماشین مجازی کوچک) |
| **کارت صدا** | خروجی صدای آنبورد **یا** هر کارت صدای USB |
| **خروجی** | خروجی کارت صدا را به **آمپلی‌فایر** یا اسپیکر اکتیو وصل کنید |

```
تلفن‌های داخلی ──SIP──▶ سرور جارچی ──کابل صدا──▶ آمپلی‌فایر ──▶ بلندگوهای سقفی 🔊
```

## 🚀 نصب (مناسب تازه‌کارها)

```bash
git clone https://github.com/eh3n/Jarchi.git
cd Jarchi
sudo bash install.sh
```

همین! نصب‌کننده خودش تشخیص می‌دهد نصب تازه است یا آپدیت، سازگاری موتور صدا را تست می‌کند، پورت‌های فایروال را باز می‌کند و زنگ‌های نمونه را می‌سازد.

سپس مرورگر: `http://IP-سرور:8080` — ورود با `admin` / `ChangeMe123!` (فوراً از تنظیمات عوضش کنید). بعد: از تنظیمات کارت صدا را انتخاب و «تست صدا» بزنید، مشخصات SIP را وارد و اعمال کنید، و موزیک/ایستگاه/زنگ‌هایتان را اضافه کنید.

## ❤️ حمایت

اگر جارچی به‌جای خرید دستگاه چندصد دلاری به دادتان رسید:
- ⭐ به ریپو **ستاره** بدهید — بهترین کمک برای دیده شدن پروژه
- ☕ **دونیت** کنید (آدرس‌ها در فوتر پنل): TRX / BNB / SOL / ETH / BTC

**طراحی و توسعه: [احسان عبدلی](https://github.com/eh3n) · مجوز AGPL-3.0**

</div>
