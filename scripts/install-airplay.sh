#!/usr/bin/env bash
# Optional: turn the Jarchi server into an AirPlay speaker.
# Any iPhone/iPad/Mac on the LAN will see "Jarchi" as an audio output.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Please run with sudo."; exit 1; }

echo ">> Installing shairport-sync..."
apt-get install -y shairport-sync

echo ">> Configuring pipe output..."
cat > /etc/shairport-sync.conf <<'CONF'
general = {
  name = "Jarchi";
  output_backend = "pipe";
};
pipe = {
  name = "/tmp/paging/airplay_audio";
};
CONF

bash /opt/jarchi/scripts/setup-fifo.sh
systemctl enable shairport-sync >/dev/null 2>&1 || true
systemctl restart shairport-sync

if systemctl is-active --quiet shairport-sync; then
  echo "AirPlay is ready. On your iPhone: AirPlay menu -> 'Jarchi',"
  echo "then in the panel set the source to AirPlay."
else
  echo "!! shairport-sync failed to start: journalctl -u shairport-sync -n 20"
fi
