#!/usr/bin/env bash
# Jarchi v4.7 - Smart installer (fresh install + update in one)
# Detects a previous installation and updates it (keeping the
# database and settings); otherwise performs a full install.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Please run with sudo."; exit 1; }

REPO_ISSUES="https://github.com/eh3n/Jarchi/issues"
PROJECT_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="/opt/jarchi"
MUSIC_DIR="/var/lib/paging/music"
BELL_DIR="/var/lib/paging/bells"
COVER_DIR="/var/lib/paging/covers"
LOG_DIR="/var/log/paging"
SVC_USER="paging"

report_hint() {
  echo ""
  echo "  >> If this looks like a bug, please report it (with the error above) at:"
  echo "     $REPO_ISSUES"
}

LEGACY_DIR="/opt/paging-system"
MODE="install"
SRC_PREV="$INSTALL_DIR"
if [[ -f "$INSTALL_DIR/webpanel/server.js" ]] && command -v liquidsoap >/dev/null 2>&1; then
  MODE="update"
elif [[ -f "$LEGACY_DIR/webpanel/server.js" ]] && command -v liquidsoap >/dev/null 2>&1; then
  MODE="update"
  SRC_PREV="$LEGACY_DIR"
  echo ">> Found legacy install at $LEGACY_DIR - migrating to $INSTALL_DIR ..."
fi
echo "=============================================="
echo "  Jarchi v4.7 - mode: $([ "$MODE" = "update" ] && echo 'UPDATE existing install' || echo 'FRESH INSTALL')"
echo "=============================================="

if [[ "$MODE" == "install" ]]; then
  echo ">> Installing system packages..."
  apt-get update -y
  apt-get install -y asterisk liquidsoap sox ffmpeg sqlite3 alsa-utils curl ca-certificates build-essential unzip
  apt-get install -y shairport-sync || echo "   (AirPlay package unavailable - skipping)"
  if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
  id -u "$SVC_USER" &>/dev/null || useradd --system --home "$INSTALL_DIR" --shell /usr/sbin/nologin "$SVC_USER"
  usermod -aG audio "$SVC_USER"
  usermod -aG "$SVC_USER" asterisk 2>/dev/null || true
  usermod -aG asterisk "$SVC_USER" 2>/dev/null || true
fi

echo ">> Stopping services (audio will pause during the update)..."
systemctl stop paging-webpanel 2>/dev/null || true
systemctl stop paging-liquidsoap 2>/dev/null || true

# ---------- backup previous data ----------
[[ -f "$SRC_PREV/webpanel/.env" ]] && cp "$SRC_PREV/webpanel/.env" /tmp/jarchi-env.bak
[[ -d "$SRC_PREV/webpanel/data" ]] && rm -rf /tmp/jarchi-data.bak && cp -r "$SRC_PREV/webpanel/data" /tmp/jarchi-data.bak
[[ -d "$SRC_PREV/liquidsoap/state" ]] && rm -rf /tmp/jarchi-state.bak && cp -r "$SRC_PREV/liquidsoap/state" /tmp/jarchi-state.bak
[[ -f "$SRC_PREV/liquidsoap/alsa_device.conf" ]] && cp "$SRC_PREV/liquidsoap/alsa_device.conf" /tmp/jarchi-alsa.bak
[[ -f "$SRC_PREV/liquidsoap/radio.liq" ]] && cp "$SRC_PREV/liquidsoap/radio.liq" /tmp/jarchi-engine-prev.liq

# ---------- engine compatibility check (engine is stopped now, port 1234 is free) ----------
echo ">> Checking new audio engine against this server's Liquidsoap version..."
ENGINE_FILE="$PROJECT_SRC/liquidsoap/radio.liq"
check_engine() { liquidsoap --check "$1" > /tmp/liq-check.log 2>&1; }

if check_engine "$ENGINE_FILE"; then
  echo "   Engine OK"
elif grep -q "Address already in use" /tmp/liq-check.log; then
  echo "   WARNING: port 1234 busy; assuming script is fine."
else
  echo "   ERROR: engine incompatible with this Liquidsoap version:"
  echo "   ------------------------------------------------------------"
  tail -n 12 /tmp/liq-check.log
  echo "   ------------------------------------------------------------"
  report_hint
  if [[ "$MODE" == "update" && -f /tmp/jarchi-engine-prev.liq ]]; then
    echo "   Keeping the previous engine file so audio keeps working."
    ENGINE_FILE="/tmp/jarchi-engine-prev.liq"
  fi
fi

echo ">> Copying Jarchi files..."
mkdir -p "$INSTALL_DIR"
rm -rf "$INSTALL_DIR"/{asterisk,scripts,systemd,webpanel}
cp -r "$PROJECT_SRC"/{asterisk,scripts,systemd,webpanel} "$INSTALL_DIR/"
mkdir -p "$INSTALL_DIR/liquidsoap"
cp "$ENGINE_FILE" "$INSTALL_DIR/liquidsoap/radio.liq"

[[ -f /tmp/jarchi-env.bak ]] && mv /tmp/jarchi-env.bak "$INSTALL_DIR/webpanel/.env"
[[ -d /tmp/jarchi-data.bak ]] && rm -rf "$INSTALL_DIR/webpanel/data" && mv /tmp/jarchi-data.bak "$INSTALL_DIR/webpanel/data"
[[ -d /tmp/jarchi-state.bak ]] && rm -rf "$INSTALL_DIR/liquidsoap/state" && mv /tmp/jarchi-state.bak "$INSTALL_DIR/liquidsoap/state"
[[ -f /tmp/jarchi-alsa.bak ]] && mv /tmp/jarchi-alsa.bak "$INSTALL_DIR/liquidsoap/alsa_device.conf"
[[ -f "$INSTALL_DIR/webpanel/.env" ]] && sed -i 's|/opt/paging-system|/opt/jarchi|g' "$INSTALL_DIR/webpanel/.env"
if [[ "$SRC_PREV" == "$LEGACY_DIR" && -d "$LEGACY_DIR" ]]; then
  mv "$LEGACY_DIR" "${LEGACY_DIR}.old" 2>/dev/null || true
  echo ">> Legacy folder kept as ${LEGACY_DIR}.old (safe to delete later)."
fi

mkdir -p "$MUSIC_DIR" "$BELL_DIR" "$COVER_DIR" "$LOG_DIR" \
         "$INSTALL_DIR/webpanel/data/staging" "$INSTALL_DIR/assets" "$INSTALL_DIR/liquidsoap/state"
[[ -f "$INSTALL_DIR/liquidsoap/state/active_source.txt" ]] || echo "off" > "$INSTALL_DIR/liquidsoap/state/active_source.txt"
[[ -f "$INSTALL_DIR/liquidsoap/state/volume.txt" ]] || echo "0.85" > "$INSTALL_DIR/liquidsoap/state/volume.txt"

[[ -f "$INSTALL_DIR/assets/test-sound.wav" ]] || \
  sox -n "$INSTALL_DIR/assets/test-sound.wav" synth 0.6 sine 660 synth 0.6 sine 880 fade 0.05 1.2 0.1 2>/dev/null || \
  sox -n "$INSTALL_DIR/assets/test-sound.wav" synth 2 sine 440

chmod 775 "$LOG_DIR"
touch "$LOG_DIR/pages.log"
chmod 664 "$LOG_DIR/pages.log"
chown -R "$SVC_USER":"$SVC_USER" "$INSTALL_DIR" /var/lib/paging "$LOG_DIR"

chown root:root "$INSTALL_DIR/scripts/apply-sip-config.sh"
chmod 755 "$INSTALL_DIR/scripts/"*.sh
cat > /etc/sudoers.d/paging-panel <<'SUDOERS'
paging ALL=(root) NOPASSWD: /opt/jarchi/scripts/apply-sip-config.sh
paging ALL=(root) NOPASSWD: /usr/bin/systemctl restart paging-liquidsoap
paging ALL=(root) NOPASSWD: /usr/bin/systemctl restart asterisk
paging ALL=(root) NOPASSWD: /usr/sbin/reboot
paging ALL=(root) NOPASSWD: /usr/sbin/asterisk -rx pjsip\ show\ registrations
SUDOERS
chmod 440 /etc/sudoers.d/paging-panel

cp "$INSTALL_DIR/asterisk/pjsip.conf" /etc/asterisk/pjsip_paging.conf 2>/dev/null || true
cp "$INSTALL_DIR/asterisk/extensions.conf" /etc/asterisk/extensions_paging.conf 2>/dev/null || true
grep -q 'pjsip_paging.conf' /etc/asterisk/pjsip.conf 2>/dev/null || echo '#include pjsip_paging.conf' >> /etc/asterisk/pjsip.conf
grep -q 'extensions_paging.conf' /etc/asterisk/extensions.conf 2>/dev/null || echo '#include extensions_paging.conf' >> /etc/asterisk/extensions.conf

bash "$INSTALL_DIR/scripts/setup-fifo.sh"

echo ">> Installing panel dependencies..."
usermod -d "$INSTALL_DIR" "$SVC_USER" >/dev/null 2>&1 || true
cd "$INSTALL_DIR/webpanel"
[[ -f .env ]] || cp .env.example .env

if [[ ! -d node_modules ]]; then
  for L in "$LEGACY_DIR/webpanel/node_modules" "${LEGACY_DIR}.old/webpanel/node_modules"; do
    if [[ -d "$L" ]]; then
      echo "   Reusing existing node_modules from $L"
      cp -r "$L" node_modules
      break
    fi
  done
fi
chown -R "$SVC_USER":"$SVC_USER" "$INSTALL_DIR/webpanel"

if ! sudo -u "$SVC_USER" HOME="$INSTALL_DIR" npm_config_cache="$INSTALL_DIR/.npm-cache" \
     npm install --omit=dev 2>&1 | grep -Ev "npm fund|^$" | tail -1; then
  echo "   WARNING: npm install failed (no internet connection?)."
  if [[ -d node_modules ]]; then
    echo "   Continuing with the existing modules - core features will work."
  else
    echo "   FATAL: no node_modules available at all. Fix connectivity and re-run."
    report_hint
    exit 1
  fi
fi
sudo -u "$SVC_USER" HOME="$INSTALL_DIR" node seed.js
echo ">> Generating sample bell sounds..."
bash "$INSTALL_DIR/scripts/make-bells.sh"

SIP_PORT=$(sudo -u "$SVC_USER" node -e '
const db = require("/opt/jarchi/webpanel/db.js");
const r = db.prepare("SELECT value FROM settings WHERE key=?").get("sip_port");
console.log(r ? r.value : "5060");' 2>/dev/null || echo 5060)
echo ">> Firewall check (SIP port: $SIP_PORT)..."
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 8080/tcp >/dev/null
  ufw allow "${SIP_PORT}/udp" >/dev/null
  ufw allow 10000:20000/udp >/dev/null
  echo "   Opened 8080/tcp, ${SIP_PORT}/udp and 10000-20000/udp (RTP)."
else
  echo "   ufw firewall not active - nothing to open."
fi

if ! command -v shairport-sync >/dev/null 2>&1; then
  apt-get install -y shairport-sync >/dev/null 2>&1 || true
fi
if command -v shairport-sync >/dev/null 2>&1; then
  if ! grep -q "jarchi" /etc/shairport-sync.conf 2>/dev/null; then
    cat > /etc/shairport-sync.conf <<'CONF'
// managed by jarchi installer
general = {
  name = "Jarchi";
  output_backend = "pipe";
};
pipe = {
  name = "/tmp/paging/airplay_audio";
};
CONF
  fi
  systemctl enable shairport-sync >/dev/null 2>&1 || true
  systemctl restart shairport-sync 2>/dev/null || true
  echo ">> AirPlay receiver enabled (device name: Jarchi)"
else
  echo ">> AirPlay skipped (shairport-sync not available). You can retry later:"
  echo "   sudo bash $INSTALL_DIR/scripts/install-airplay.sh"
fi

cp "$INSTALL_DIR/systemd/"*.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable paging-liquidsoap paging-webpanel >/dev/null 2>&1
systemctl restart paging-liquidsoap
sleep 3
systemctl restart paging-webpanel
systemctl enable asterisk >/dev/null 2>&1 || true
systemctl restart asterisk

echo ""
echo "=============================================="
FAIL=0
if systemctl is-active --quiet paging-liquidsoap; then
  echo "  Audio engine: RUNNING"
else
  echo "  !! Audio engine FAILED to start. Recent errors:"
  tail -n 15 "$LOG_DIR/liquidsoap.err.log" 2>/dev/null || journalctl -u paging-liquidsoap -n 15 --no-pager
  FAIL=1
fi
if systemctl is-active --quiet paging-webpanel; then
  echo "  Web panel: RUNNING  ->  http://$(hostname -I | awk '{print $1}'):8080"
else
  echo "  !! Web panel FAILED to start (journalctl -u paging-webpanel -n 20)"
  FAIL=1
fi
systemctl is-active --quiet asterisk \
  && echo "  Asterisk service: RUNNING" \
  || { echo "  !! Asterisk service FAILED (journalctl -u asterisk -n 20)"; FAIL=1; }
if ss -lnu 2>/dev/null | grep -q ":$SIP_PORT "; then
  echo "  Asterisk: listening on ${SIP_PORT}/udp"
else
  echo "  !! Asterisk is NOT listening on port $SIP_PORT."
  echo "     Open the panel > Settings > SIP and click 'Save & apply to Asterisk'."
fi
[[ "$MODE" == "install" ]] && echo "  Login: admin | initial password: ChangeMe123!"
[[ "$FAIL" == "1" ]] && report_hint
echo ""
echo "  Optional: download the classic Azan (Moazzenzadeh) for the Azan feature:"
echo "    sudo bash $INSTALL_DIR/scripts/get-azan.sh"
echo "=============================================="
