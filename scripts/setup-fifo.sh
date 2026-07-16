#!/usr/bin/env bash
# Create FIFOs. .sln = headerless signed-linear 8kHz (WAV headers
# break over pipes because Asterisk can't seek back to fix sizes).
FIFO_DIR="/tmp/paging"
mkdir -p "$FIFO_DIR" 2>/dev/null || true
chmod 777 "$FIFO_DIR" 2>/dev/null || true
rm -f "$FIFO_DIR/page_audio.wav" 2>/dev/null || true
for f in page_audio.sln spotify_audio airplay_audio; do
  [[ -p "$FIFO_DIR/$f" ]] || mkfifo "$FIFO_DIR/$f" 2>/dev/null || true
  chmod 666 "$FIFO_DIR/$f" 2>/dev/null || true
done
chown -R paging:paging "$FIFO_DIR" 2>/dev/null || true
exit 0
