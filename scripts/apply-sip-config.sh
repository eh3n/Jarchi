#!/usr/bin/env bash
# این اسکریپت با sudo از طرف پنل وب اجرا می‌شود.
# فایل‌های کانفیگ SIP که پنل در پوشه staging تولید کرده را به
# /etc/asterisk منتقل و Asterisk را ری‌استارت می‌کند.
set -euo pipefail

STAGE="/opt/jarchi/webpanel/data/staging"

if [[ ! -f "$STAGE/pjsip_paging.conf" || ! -f "$STAGE/extensions_paging.conf" ]]; then
  echo "فایل‌های staging پیدا نشدند." >&2
  exit 1
fi

install -m 640 -o root -g asterisk "$STAGE/pjsip_paging.conf" /etc/asterisk/pjsip_paging.conf
install -m 640 -o root -g asterisk "$STAGE/extensions_paging.conf" /etc/asterisk/extensions_paging.conf

systemctl restart asterisk
echo "SIP config applied and Asterisk restarted."
