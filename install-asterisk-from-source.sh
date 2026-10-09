#!/usr/bin/env bash
# Build & install Asterisk 20 LTS from source.
# Used automatically by install.sh when the distro's apt repo has no
# 'asterisk' package (this currently affects Debian 13/trixie, where
# Asterisk hasn't been republished upstream due to a libgnutls ABI
# transition - not a Jarchi bug; see:
# lists.debian.org/debian-user/2026/02/msg00135.html).
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Please run with sudo."; exit 1; }

if command -v asterisk >/dev/null 2>&1; then
  echo ">> Asterisk already installed ($(asterisk -V 2>/dev/null || true)); skipping build."
  exit 0
fi

ASTERISK_VER="20"
WORKDIR="/usr/src/asterisk-build"

echo ">> Installing build dependencies..."
apt-get update -y
apt-get install -y build-essential git wget subversion pkg-config \
  libssl-dev libncurses5-dev libedit-dev libjansson-dev libsqlite3-dev \
  libxml2-dev uuid-dev

rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

echo ">> Downloading Asterisk $ASTERISK_VER LTS source..."
wget -q "https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-${ASTERISK_VER}-current.tar.gz"
tar xzf "asterisk-${ASTERISK_VER}-current.tar.gz"
cd asterisk-"${ASTERISK_VER}"*/

echo ">> Running Asterisk's own prerequisite installer..."
contrib/scripts/install_prereq install || true

echo ">> Configuring..."
./configure --with-jansson-bundled

echo ">> Selecting default module set (non-interactive)..."
make menuselect.makeopts >/dev/null

echo ">> Compiling (this takes several minutes)..."
make -j"$(nproc)"

echo ">> Installing..."
make install

echo ">> Installing systemd service + default config skeleton..."
make config
ldconfig

echo "Asterisk ${ASTERISK_VER} installed from source: $(asterisk -V)"
