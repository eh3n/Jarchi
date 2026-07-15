#!/usr/bin/env bash
# Generate sample bell sounds with sox (copyright-free, synthesized)
# and register them in the Jarchi database.
set -uo pipefail
BELL_DIR="/var/lib/paging/bells"
mkdir -p "$BELL_DIR"

gen() { [[ -f "$BELL_DIR/$1" ]] || sox -n "$BELL_DIR/$1" "${@:2}" 2>/dev/null || true; }

# 1) زنگ مدرسه (رینگ ممتد)
gen sample-school-bell.wav synth 4 sine 990 sine 1480 tremolo 16 60 fade 0 4 0.6 vol 0.8

# 2) دینگ-دانگ (اعلان دوتُنی)
if [[ ! -f "$BELL_DIR/sample-ding-dong.wav" ]]; then
  sox -n /tmp/jb1.wav synth 0.8 sine 659 sine 1318 fade 0 0.8 0.7 vol 0.7 2>/dev/null
  sox -n /tmp/jb2.wav synth 1.2 sine 523 sine 1046 fade 0 1.2 1.1 vol 0.7 2>/dev/null
  sox /tmp/jb1.wav /tmp/jb2.wav "$BELL_DIR/sample-ding-dong.wav" 2>/dev/null || true
  rm -f /tmp/jb1.wav /tmp/jb2.wav
fi

# 3) چایم سه‌نُتی (شروع اعلان، سبک فرودگاه)
if [[ ! -f "$BELL_DIR/sample-chime.wav" ]]; then
  sox -n /tmp/jc1.wav synth 0.5 sine 784 fade 0 0.5 0.45 vol 0.7 2>/dev/null
  sox -n /tmp/jc2.wav synth 0.5 sine 988 fade 0 0.5 0.45 vol 0.7 2>/dev/null
  sox -n /tmp/jc3.wav synth 1.1 sine 1175 fade 0 1.1 1.0 vol 0.7 2>/dev/null
  sox /tmp/jc1.wav /tmp/jc2.wav /tmp/jc3.wav "$BELL_DIR/sample-chime.wav" 2>/dev/null || true
  rm -f /tmp/jc1.wav /tmp/jc2.wav /tmp/jc3.wav
fi

# 4) گونگ (پایان شیفت)
gen sample-gong.wav synth 3.5 sine 196 sine 294 sine 392 fade 0.02 3.5 3.2 vol 0.85

chown paging:paging "$BELL_DIR"/sample-*.wav 2>/dev/null || true

# ثبت در دیتابیس (اگر قبلاً ثبت نشده)
node -e '
const db = require("/opt/jarchi/webpanel/db.js");
const bells = [
  ["sample-school-bell.wav", "🔔 زنگ مدرسه (نمونه)"],
  ["sample-ding-dong.wav",  "🛎️ دینگ‌دانگ (نمونه)"],
  ["sample-chime.wav",      "🎵 چایم اعلان (نمونه)"],
  ["sample-gong.wav",       "🥁 گونگ (نمونه)"],
];
const ins = db.prepare("INSERT INTO bells (filename, title) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM bells WHERE filename = ?)");
for (const [f, t] of bells) ins.run(f, t, f);
console.log("sample bells registered");
' 2>/dev/null || true
