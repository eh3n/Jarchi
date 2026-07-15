let npState = null;
let currentStatus = null;
let lastCoverKey = null;

function setCover(html, spinning, key) {
  const cover = $("npCover");
  if (key === lastCoverKey) return; // بازسازی نکن تا انیمیشن چرخش ریست نشود
  lastCoverKey = key;
  cover.innerHTML = html;
  cover.classList.toggle("spinning", spinning);
}

function fmtTime(sec) {
  if (!sec || sec <= 0 || !isFinite(sec)) return "";
  sec = Math.floor(sec);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

// ---------------- وضعیت ----------------
let engineFailCount = 0;

async function refreshStatus() {
  try {
    const s = await api("/api/status");
    currentStatus = s;

    // ضد سوسو زدن: فقط بعد از ۲ بررسی ناموفق پشت‌سرهم «قطع» اعلام کن
    engineFailCount = s.engine.online ? 0 : engineFailCount + 1;
    const showDown = engineFailCount >= 2;

    $("engineBanner").style.display = showDown ? "block" : "none";
    $("engineBanner").textContent = t("engine_down");
    $("engineStatus").textContent = showDown ? t("engine_down") : t("engine_ok");

    ["btnRadio", "btnPlaylist", "btnSpotify", "btnOff"].forEach((id) => $(id).classList.remove("active"));
    const srcMap = { radio: "btnRadio", playlist: "btnPlaylist", spotify: "btnSpotify", off: "btnOff" };
    srcMap[s.active_source] && $(srcMap[s.active_source]).classList.add("active");

    if (document.activeElement !== $("volumeRange"))
      $("volumeRange").value = Math.round(Number(s.volume_level) * 100);

    $("btnMute").classList.toggle("muted-on", s.muted);
    $("btnShuffle").classList.toggle("mode-on", s.play_mode === "shuffle");
    $("btnPlayStop").innerHTML = s.active_source === "off"
      ? '<svg viewBox="0 0 24 24"><path d="M8 5l12 7-12 7z"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>';
  } catch (err) {
    $("engineStatus").textContent = err.message;
  }
}

// ---------------- در حال پخش ----------------
async function refreshNowPlaying() {
  try {
    const d = await api("/api/nowplaying");
    npState = d;
    npState._fetchedAt = Date.now() / 1000;
    const eq = $("npEq");

    if (d.active_source === "off") {
      $("npTitle").textContent = t("nothing");
      $("npArtist").textContent = "—";
      setCover("🔇", false, "off");
      eq.style.display = "none";
      $("npProgress").classList.remove("indeterminate");
      $("npFill").style.width = "0%";
      $("npElapsed").textContent = ""; $("npDuration").textContent = "";
      highlightLists(null, null);
      return;
    }

    eq.style.display = "inline-flex";

    if (d.active_source === "spotify") {
      $("npTitle").textContent = "Spotify Connect";
      $("npArtist").textContent = "🎧";
      setCover("🎧", false, "spotify");
      $("npProgress").classList.add("indeterminate");
      $("npElapsed").textContent = t("live"); $("npDuration").textContent = "∞";
      highlightLists(null, null);
    } else if (d.active_source === "radio") {
      // حتی بدون متادیتا، اسم ایستگاه و «در حال پخش رادیو» نمایش داده می‌شود
      const stName = d.station ? d.station.name : t("radio_playing");
      const raw = (d.now && d.now.source === "radio" && d.now.title || "").trim();
      let title = stName, artist = t("radio_playing");
      if (raw) {
        if (raw.includes(" - ")) {
          const [a, ...rest] = raw.split(" - ");
          artist = a.trim(); title = rest.join(" - ").trim();
        } else title = raw;
        artist = artist === t("radio_playing") ? stName : `${artist} · ${stName}`;
      }
      $("npTitle").textContent = title;
      $("npArtist").textContent = artist;
      setCover("📻", false, "radio");
      $("npProgress").classList.add("indeterminate");
      $("npElapsed").textContent = t("live"); $("npDuration").textContent = "∞";
      highlightLists(d.station ? d.station.id : null, null);
    } else {
      const valid = d.now && d.now.source === "playlist";
      const tr = d.track;
      $("npTitle").textContent = (tr && tr.title) || (valid && d.now.title) || t("nothing");
      $("npArtist").textContent = (tr && tr.artist) || (valid && d.now.artist) || t("unknown_artist");
      if (tr && tr.has_cover) {
        setCover(`<img src="/api/tracks/${tr.id}/cover?v=${tr.id}" alt="" />`, true, "track-" + tr.id);
      } else { setCover("🎵", false, "track-nocover"); }
      $("npProgress").classList.remove("indeterminate");
      highlightLists(null, tr ? tr.id : null);
    }
  } catch (err) { console.error(err); }
}

setInterval(() => {
  if (!npState || npState.active_source !== "playlist" || !npState.now) return;
  const dur = Number((npState.track && npState.track.duration) || npState.now.duration || 0);
  if (!dur) { $("npProgress").classList.add("indeterminate"); return; }
  const serverNow = npState.server_time + (Date.now() / 1000 - npState._fetchedAt);
  const elapsed = Math.min(dur, Math.max(0, serverNow - npState.now.started_at));
  $("npFill").style.width = `${(elapsed / dur) * 100}%`;
  $("npElapsed").textContent = fmtTime(elapsed);
  $("npDuration").textContent = fmtTime(dur);
}, 1000);

// ---------------- ستون‌های انتخاب ----------------
let stationsCache = [], tracksCache = [];

function highlightLists(stationId, trackId) {
  document.querySelectorAll("#stationPick .pick-item").forEach((el) =>
    el.classList.toggle("playing", Number(el.dataset.id) === stationId));
  document.querySelectorAll("#trackPick .pick-item").forEach((el) =>
    el.classList.toggle("playing", Number(el.dataset.id) === trackId));
}

async function loadPickLists() {
  stationsCache = await api("/api/stations");
  tracksCache = await api("/api/tracks");

  const sp = $("stationPick");
  sp.innerHTML = stationsCache.length
    ? stationsCache.map((s) => `
        <div class="pick-item" data-id="${s.id}">
          <span>📻</span>
          <div style="min-width:0;"><div class="pi-title">${s.name}</div></div>
        </div>`).join("")
    : `<div class="row-sub">${t("empty_list")}</div>`;
  sp.querySelectorAll(".pick-item").forEach((el) =>
    el.addEventListener("click", async () => {
      try {
        await api(`/api/stations/${el.dataset.id}/activate`, { method: "POST" });
        refreshStatus(); setTimeout(refreshNowPlaying, 1200);
      } catch (err) { alert(err.message); }
    }));

  const tp = $("trackPick");
  tp.innerHTML = tracksCache.length
    ? tracksCache.map((tr) => `
        <div class="pick-item" data-id="${tr.id}">
          ${tr.has_cover ? `<img class="track-thumb" src="/api/tracks/${tr.id}/cover" style="width:34px;height:34px;" />` : "<span>🎵</span>"}
          <div style="min-width:0;">
            <div class="pi-title">${tr.title}</div>
            <div class="pi-sub">${tr.artist || ""}</div>
          </div>
        </div>`).join("")
    : `<div class="row-sub">${t("empty_list")}</div>`;
  tp.querySelectorAll(".pick-item").forEach((el) =>
    el.addEventListener("click", async () => {
      try {
        await api(`/api/transport/play-track/${el.dataset.id}`, { method: "POST" });
        refreshStatus(); setTimeout(refreshNowPlaying, 1200);
      } catch (err) { alert(err.message); }
    }));
}

// ---------------- transport ----------------
$("btnPlayStop").addEventListener("click", async () => {
  const off = currentStatus && currentStatus.active_source === "off";
  const target = off ? (localStorage.getItem("last_source") || "playlist") : "off";
  if (!off) localStorage.setItem("last_source", currentStatus.active_source);
  try {
    await api("/api/source", { method: "POST", body: JSON.stringify({ source: target }) });
    refreshStatus(); setTimeout(refreshNowPlaying, 1200);
  } catch (err) { alert(err.message); }
});

$("btnNext").addEventListener("click", async () => {
  try { await api("/api/transport/next", { method: "POST" }); setTimeout(refreshNowPlaying, 1200); }
  catch (err) { alert(err.message); }
});

$("btnPrev").addEventListener("click", async () => {
  try { await api("/api/transport/prev", { method: "POST" }); setTimeout(refreshNowPlaying, 1200); }
  catch (err) { alert(err.message); }
});

$("btnShuffle").addEventListener("click", async () => {
  const next = currentStatus && currentStatus.play_mode === "shuffle" ? "normal" : "shuffle";
  try {
    const r = await api("/api/transport/playmode", { method: "POST", body: JSON.stringify({ mode: next }) });
    $("btnShuffle").classList.toggle("mode-on", r.mode === "shuffle");
    refreshStatus();
  } catch (err) { alert(err.message); }
});

// کلیک روی نوار پخش = جابه‌جایی در آهنگ (seek)
$("npProgress").addEventListener("click", async (e) => {
  if (!npState || npState.active_source !== "playlist" || !npState.now) return;
  const dur = Number((npState.track && npState.track.duration) || npState.now.duration || 0);
  if (!dur) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  try {
    await api("/api/transport/seek", { method: "POST", body: JSON.stringify({ position: ratio * dur }) });
    setTimeout(refreshNowPlaying, 600);
  } catch (err) { console.error(err); }
});

$("btnMute").addEventListener("click", async () => {
  try {
    const d = await api("/api/transport/mute", { method: "POST" });
    $("btnMute").classList.toggle("muted-on", d.muted);
    $("volumeRange").value = Math.round(d.volume * 100);
  } catch (err) { alert(err.message); }
});

["btnRadio", "btnPlaylist", "btnSpotify", "btnOff"].forEach((id) => {
  $(id).addEventListener("click", async () => {
    try {
      await api("/api/source", { method: "POST", body: JSON.stringify({ source: $(id).dataset.source }) });
      refreshStatus(); setTimeout(refreshNowPlaying, 1200);
    } catch (err) { alert(err.message); }
  });
});

let volumeTimer = null;
$("volumeRange").addEventListener("input", () => {
  clearTimeout(volumeTimer);
  volumeTimer = setTimeout(async () => {
    try { await api("/api/volume", { method: "POST", body: JSON.stringify({ value: Number($("volumeRange").value) / 100 }) }); }
    catch (err) { console.error(err); }
  }, 250);
});

async function loadPageHistory() {
  try {
    const pages = await api("/api/pages/history");
    const el = $("pageHistory");
    if (!pages.length) { el.innerHTML = `<div class="row-sub">${t("no_pages")}</div>`; return; }
    el.innerHTML = pages.map((p) => {
      const d = new Date(p.start * 1000).toLocaleString(undefined, { timeZone: panelTimezone });
      const dur = p.duration != null ? `${p.duration} ${t("seconds")}` : "⏳";
      return `<div class="row"><div class="row-title">📢 ${t("caller")} ${p.caller || "?"}</div><div class="row-sub">${d} · ${dur}</div></div>`;
    }).join("");
  } catch (_) {}
}

initCommon("dashboard").then(() => {
  refreshStatus(); refreshNowPlaying(); loadPickLists();
  setInterval(refreshStatus, 5000);
  setInterval(refreshNowPlaying, 5000);
  setInterval(loadPickLists, 30000);
  loadPageHistory();
  setInterval(loadPageHistory, 15000);
});
