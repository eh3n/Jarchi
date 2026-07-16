#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "با sudo اجرا کنید"; exit 1; }

if ! command -v librespot >/dev/null 2>&1; then
  echo ">> تلاش برای نصب librespot از apt..."
  if ! apt-get install -y librespot 2>/dev/null; then
    echo ">> در apt نبود؛ نصب از طریق cargo (چند دقیقه طول می‌کشد)..."
    apt-get install -y cargo build-essential libasound2-dev pkg-config
    cargo install librespot --root /usr/local
  fi
fi

cat > /etc/systemd/system/jarchi-spotify.service <<'UNIT'
[Unit]
Description=Jarchi - Spotify Connect (librespot)
After=network-online.target paging-liquidsoap.service

[Service]
Type=simple
User=paging
ExecStartPre=/bin/bash -c 'mkfifo /tmp/paging/spotify_audio 2>/dev/null; chmod 666 /tmp/paging/spotify_audio; true'
ExecStart=/bin/bash -c 'exec $(command -v librespot) --name "Jarchi" --backend pipe --device /tmp/paging/spotify_audio --bitrate 320 --initial-volume 100'
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now jarchi-spotify
echo "Spotify Connect فعال شد ✓ — در اپ اسپاتیفای دنبال دستگاه «Jarchi» بگردید."
