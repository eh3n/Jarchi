#!/usr/bin/env bash
# Download the classic Azan of Rahim Moazzenzadeh Ardabili from the
# Internet Archive and register it as a bell file in Jarchi.
#
set -euo pipefail
ITEM="azan.moazenzadeh"
BELL_DIR="/var/lib/paging/bells"
OUT="$BELL_DIR/azan-moazenzadeh.mp3"
mkdir -p "$BELL_DIR"

echo ">> Fetching file list from archive.org ..."
META=$(curl -sL "https://archive.org/metadata/$ITEM")

FILE=$(node -e '
let d = "";
process.stdin.on("data", (c) => (d += c));
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(d);
    const f = (j.files || [])
      .filter((x) => /\.mp3$/i.test(x.name))
      .sort((a, b) => Number(b.size || 0) - Number(a.size || 0))[0];
    console.log(f ? f.name : "");
  } catch (_) { console.log(""); }
});' <<< "$META")

[[ -n "$FILE" ]] || { echo "!! Could not find an mp3 in the archive item."; exit 1; }

ENC=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$FILE")
echo ">> Downloading: $FILE"
curl -L --fail -o "$OUT" "https://archive.org/download/$ITEM/$ENC"
chown paging:paging "$OUT" 2>/dev/null || true

node -e '
const db = require("/opt/jarchi/webpanel/db.js");
db.prepare("INSERT INTO bells (filename, title) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM bells WHERE filename = ?)")
  .run("azan-moazenzadeh.mp3", "🕌 اذان مؤذن‌زاده اردبیلی", "azan-moazenzadeh.mp3");
console.log("Azan registered as a bell file.");
'
echo ">> Done. In the panel: Bells > Automatic Azan > select this file."
