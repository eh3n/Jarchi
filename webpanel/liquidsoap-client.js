// Persistent telnet client for the audio engine + file-based state writers.
const net = require("net");
const fs = require("fs");
const path = require("path");

const STATE_DIR = "/opt/jarchi/liquidsoap/state";
function writeState(name, value) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STATE_DIR, name), String(value) + "\n");
}

const HOST = process.env.LIQUIDSOAP_HOST || "127.0.0.1";
const PORT = Number(process.env.LIQUIDSOAP_PORT || 1234);

let socket = null;
let connected = false;
let buffer = "";
let queue = [];
let current = null;

function failAll(err) {
  if (current) {
    clearTimeout(current.timer);
    current.reject(err);
    current = null;
  }
  while (queue.length) queue.shift().reject(err);
}

function teardown(err) {
  connected = false;
  buffer = "";
  if (socket) {
    socket.removeAllListeners();
    socket.destroy();
    socket = null;
  }
  failAll(err || new Error("liquidsoap connection closed"));
}

function ensureSocket() {
  if (socket) return;
  socket = net.createConnection({ host: HOST, port: PORT });
  socket.setNoDelay(true);
  socket.on("connect", () => { connected = true; pump(); });
  socket.on("error", (e) => teardown(e));
  socket.on("close", () => teardown(new Error("liquidsoap connection closed")));
  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    if (!current) { buffer = ""; return; }
    const m = buffer.match(/^([\s\S]*?)\r?\n?END\r?\n?/);
    if (m) {
      const job = current;
      current = null;
      buffer = "";
      clearTimeout(job.timer);
      job.resolve(m[1].trim());
      pump();
    }
  });
}

function pump() {
  if (current || !queue.length) return;
  ensureSocket();
  if (!connected) return;
  current = queue.shift();
  current.timer = setTimeout(() => {
    const job = current;
    current = null;
    job.reject(new Error("Liquidsoap timeout"));
    teardown(new Error("Liquidsoap timeout"));
  }, current.timeoutMs);
  socket.write(current.cmd + "\n");
}

function sendCommand(cmd, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    if (queue.length > 100) return reject(new Error("command queue overflow"));
    queue.push({ cmd, resolve, reject, timeoutMs, timer: null });
    pump();
  });
}

async function sendWithRetry(cmd, timeoutMs = 4000) {
  try {
    return await sendCommand(cmd, timeoutMs);
  } catch (_) {
    await new Promise((r) => setTimeout(r, 150));
    return sendCommand(cmd, timeoutMs);
  }
}

const setActiveSource = async (s) => { writeState("active_source.txt", s); return "ok"; };
const setDuck = async (l) => {
  writeState("duck.txt", Math.min(1, Math.max(0, Number(l))));
  return "ok";
};
const setVolume = async (l) => {
  writeState("volume.txt", Math.min(1, Math.max(0, Number(l))));
  return "ok";
};

const setRadioUrl = async (u) => {
  const url = u.replace(/["\s]/g, "");
  writeState("radio_url.txt", url);
  try { await sendCommand(`radio_stream.url ${url}`); } catch (_) {}
  try { await sendCommand("radio_stream.stop"); } catch (_) {}
  try { await sendCommand("radio_stream.start"); } catch (_) {}
  return "ok";
};
const skipTrack = async () => {
  try { return await sendCommand("player.next"); } catch (_) { return "ok"; }
};
const setPlayMode = async (mode) => { writeState("play_mode.txt", mode); return "ok"; };
const seek = (deltaSeconds) => sendWithRetry(`player.seek ${Number(deltaSeconds).toFixed(1)}`);
const pushMusic = (p) => sendWithRetry(`musicq.push ${p}`);
const pushBell = (p) => sendWithRetry(`bellq.push ${p}`);
const pushTest = (p) => sendWithRetry(`testq.push ${p}`);

async function getStatus() {
  try {
    const uptime = await sendWithRetry("uptime", 3000);
    return { online: true, uptime };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

module.exports = {
  sendCommand: sendWithRetry, setActiveSource, setRadioUrl, setVolume,
  skipTrack, pushMusic, pushBell, pushTest, getStatus, setPlayMode, seek, setDuck,
};
