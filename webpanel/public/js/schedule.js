// ---------------- دیتای کشور/شهر برای اذان ----------------
const AZAN_CITIES = {
  "ایران / Iran": {
    "تهران": [35.6892, 51.3890], "مشهد": [36.2605, 59.6168], "اصفهان": [32.6546, 51.6680],
    "شیراز": [29.5918, 52.5837], "تبریز": [38.0800, 46.2919], "کرج": [35.8400, 50.9391],
    "قم": [34.6401, 50.8764], "اهواز": [31.3183, 48.6706], "کرمانشاه": [34.3142, 47.0650],
    "ارومیه": [37.5527, 45.0761], "رشت": [37.2808, 49.5832], "زاهدان": [29.4963, 60.8629],
    "همدان": [34.7983, 48.5148], "کرمان": [30.2839, 57.0834], "یزد": [31.8974, 54.3569],
    "اردبیل": [38.2498, 48.2963], "بندرعباس": [27.1832, 56.2666], "اراک": [34.0917, 49.6892],
    "قزوین": [36.2688, 50.0041], "سنندج": [35.3219, 46.9862], "ساری": [36.5633, 53.0601],
    "گرگان": [36.8456, 54.4393], "خرم‌آباد": [33.4878, 48.3558], "بوشهر": [28.9234, 50.8203],
    "زنجان": [36.6736, 48.4787], "بیرجند": [32.8663, 59.2211], "سمنان": [35.5729, 53.3971],
    "یاسوج": [30.6684, 51.5880], "شهرکرد": [32.3256, 50.8644], "ایلام": [33.6374, 46.4227],
    "بجنورد": [37.4747, 57.3290], "تبس": [33.5959, 56.9244], "قشم": [26.9581, 56.2719],
  },
  "عراق / Iraq": { "بغداد": [33.3152, 44.3661], "نجف": [32.0000, 44.3350], "کربلا": [32.6160, 44.0249], "بصره": [30.5081, 47.7804] },
  "ترکیه / Türkiye": { "استانبول": [41.0082, 28.9784], "آنکارا": [39.9334, 32.8597], "ازمیر": [38.4237, 27.1428] },
  "امارات / UAE": { "دبی": [25.2048, 55.2708], "ابوظبی": [24.4539, 54.3773] },
  "عربستان / Saudi": { "مکه": [21.3891, 39.8579], "مدینه": [24.5247, 39.5692], "ریاض": [24.7136, 46.6753] },
  "افغانستان / Afghanistan": { "کابل": [34.5553, 69.2075], "هرات": [34.3529, 62.2040], "مزار شریف": [36.7090, 67.1109] },
  "آذربایجان / Azerbaijan": { "باکو": [40.4093, 49.8671] },
  "قطر / Qatar": { "دوحه": [25.2854, 51.5310] },
  "کویت / Kuwait": { "کویت": [29.3759, 47.9774] },
  "عمان / Oman": { "مسقط": [23.5880, 58.3829] },
  "لبنان / Lebanon": { "بیروت": [33.8938, 35.5018] },
  "آلمان / Germany": { "برلین": [52.5200, 13.4050], "هامبورگ": [53.5511, 9.9937], "مونیخ": [48.1351, 11.5820] },
  "انگلیس / UK": { "لندن": [51.5074, -0.1278], "منچستر": [53.4808, -2.2426] },
  "کانادا / Canada": { "تورنتو": [43.6532, -79.3832], "ونکوور": [49.2827, -123.1207] },
};

function initAzanLocation() {
  const cSel = $("azanCountry"), citySel = $("azanCity");
  cSel.innerHTML = Object.keys(AZAN_CITIES).map((c) => `<option>${c}</option>`).join("");
  const fillCities = () => {
    citySel.innerHTML = Object.keys(AZAN_CITIES[cSel.value])
      .map((c) => `<option>${c}</option>`).join("");
  };
  const applyCoords = () => {
    const [lat, lng] = AZAN_CITIES[cSel.value][citySel.value];
    $("azanLat").value = lat;
    $("azanLng").value = lng;
  };
  cSel.addEventListener("change", () => { fillCities(); applyCoords(); });
  citySel.addEventListener("change", applyCoords);
  fillCities();
}

// ---------------- ویجت انتخاب زمان (AM/PM اول، بعد ساعت:دقیقه) ----------------
function renderTimePicker(containerId) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const mins = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  $(containerId).innerHTML = `
    <div class="form-inline" style="direction:ltr; align-items:center;">
      <select class="tp-ampm" style="flex:1.4;">
        <option value="AM">${t("t_am")}</option>
        <option value="PM">${t("t_pm")}</option>
      </select>
      <select class="tp-h" style="flex:1;">${hours.map((h) => `<option>${h}</option>`).join("")}</select>
      <span style="flex:0;">:</span>
      <select class="tp-m" style="flex:1;">${mins.map((m) => `<option>${m}</option>`).join("")}</select>
    </div>`;
}

function getPickedTime(containerId) {
  const c = $(containerId);
  let h = Number(c.querySelector(".tp-h").value) % 12;
  if (c.querySelector(".tp-ampm").value === "PM") h += 12;
  return String(h).padStart(2, "0") + ":" + c.querySelector(".tp-m").value;
}

async function loadBells() {
  const bells = await api("/api/bells");
  const list = $("bellsList");
  list.innerHTML = bells.length ? "" : `<div class="row-sub">${t("empty_list")}</div>`;
  bells.forEach((b) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="row-title">🔔 ${b.title}</div>
      <div style="display:flex; gap:6px;">
        <button data-act="test" data-id="${b.id}">${t("test")}</button>
        <button data-act="del" data-id="${b.id}" class="btn-danger">${t("delete")}</button>
      </div>`;
    list.appendChild(row);
  });
  list.querySelectorAll("button").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (btn.dataset.act === "test") {
        try { await api(`/api/bells/${btn.dataset.id}/test`, { method: "POST" }); }
        catch (err) { alert(err.message); }
      } else {
        if (!confirm(t("confirm_del"))) return;
        await api(`/api/bells/${btn.dataset.id}`, { method: "DELETE" });
        loadBells(); loadSchedules(); fillBellSelect();
      }
    }));
}

async function fillBellSelect() {
  const bells = await api("/api/bells");
  $("schBell").innerHTML = bells.map((b) => `<option value="${b.id}">${b.title}</option>`).join("");
}

function renderDayPicker() {
  const days = t("days");
  $("dayPicker").innerHTML = days.map((d, i) =>
    `<label><input type="checkbox" value="${i}" checked />${d}</label>`).join("");
}

async function loadSchedules() {
  const schedules = await api("/api/schedules");
  const list = $("schedulesList");
  const dayNames = t("days");
  list.innerHTML = schedules.length ? "" : `<div class="row-sub">${t("empty_list")}</div>`;
  schedules.forEach((s) => {
    const daysLabel = s.days.split(",").map((d) => dayNames[Number(d)]).join(" ");
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div style="min-width:0;">
        <div class="row-title">⏰ ${s.name}
          <span class="badge ${s.enabled ? "on" : "off"}">${s.enabled ? t("enabled") : t("disabled")}</span></div>
        <div class="row-sub">${s.time} · ${daysLabel} · 🔔 ${s.bell_title}</div>
      </div>
      <div style="display:flex; gap:6px;">
        <button data-act="toggle" data-id="${s.id}">${s.enabled ? t("disabled") : t("enabled")}</button>
        <button data-act="del" data-id="${s.id}" class="btn-danger">${t("delete")}</button>
      </div>`;
    list.appendChild(row);
  });
  list.querySelectorAll("button").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (btn.dataset.act === "toggle") {
        await api(`/api/schedules/${btn.dataset.id}/toggle`, { method: "POST" });
      } else {
        if (!confirm(t("confirm_del"))) return;
        await api(`/api/schedules/${btn.dataset.id}`, { method: "DELETE" });
      }
      loadSchedules();
    }));
}

$("uploadBellsBtn").addEventListener("click", async () => {
  const files = $("bellFiles").files;
  if (!files.length) return;
  const fd = new FormData();
  for (const f of files) fd.append("bells", f);
  try {
    const res = await fetch("/api/bells/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    $("bellFiles").value = "";
    loadBells(); fillBellSelect();
  } catch (err) { alert(err.message); }
});

$("addScheduleBtn").addEventListener("click", async () => {
  const days = [...document.querySelectorAll("#dayPicker input:checked")].map((c) => Number(c.value));
  try {
    await api("/api/schedules", {
      method: "POST",
      body: JSON.stringify({
        name: $("schName").value.trim(),
        time: getPickedTime("schTimePicker"),
        days,
        bell_id: Number($("schBell").value),
      }),
    });
    $("schName").value = "";
    $("schMsg").textContent = "";
    loadSchedules();
  } catch (err) {
    $("schMsg").textContent = err.message;
  }
});

// ---------------- اذان ----------------
async function loadAzan() {
  const a = await api("/api/azan");
  $("azanEnabled").checked = a.enabled;
  $("azanFajr").checked = a.fajr;
  $("azanDhuhr").checked = a.dhuhr;
  $("azanMaghrib").checked = a.maghrib;
  $("azanLat").value = a.lat;
  $("azanLng").value = a.lng;
  const bells = await api("/api/bells");
  $("azanBell").innerHTML = bells.map((b) => `<option value="${b.id}">${b.title}</option>`).join("");
  if (a.bell_id) $("azanBell").value = a.bell_id;
  if (!a.available) $("azanTimes").textContent = t("azan_missing");
  else if (a.times) $("azanTimes").textContent =
    `${t("today_times")}: ${t("fajr")} ${a.times.fajr} · ${t("dhuhr")} ${a.times.dhuhr} · ${t("maghrib")} ${a.times.maghrib}`;
}

$("saveAzanBtn").addEventListener("click", async () => {
  try {
    await api("/api/azan", { method: "POST", body: JSON.stringify({
      enabled: $("azanEnabled").checked,
      fajr: $("azanFajr").checked, dhuhr: $("azanDhuhr").checked, maghrib: $("azanMaghrib").checked,
      lat: $("azanLat").value, lng: $("azanLng").value,
      bell_id: $("azanBell").value,
    })});
    $("azanMsg").style.color = "var(--green)";
    $("azanMsg").textContent = t("done");
    loadAzan();
  } catch (err) { $("azanMsg").textContent = err.message; }
});

// ---------------- برنامه خودکار منبع ----------------
function renderSsDayPicker() {
  const days = t("days");
  $("ssDayPicker").innerHTML = days.map((d, i) =>
    `<label><input type="checkbox" value="${i}" checked />${d}</label>`).join("");
}

async function fillSsStations() {
  const st = await api("/api/stations");
  $("ssStation").innerHTML = st.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
}

$("ssSource").addEventListener("change", () => {
  $("ssStationWrap").style.display = $("ssSource").value === "radio" ? "" : "none";
});

async function loadSs() {
  const list = await api("/api/source-schedules");
  const el = $("ssList");
  const dayNames = t("days");
  el.innerHTML = list.length ? "" : `<div class="row-sub">${t("empty_list")}</div>`;
  list.forEach((s) => {
    const days = s.days.split(",").map((d) => dayNames[Number(d)]).join(" ");
    const label = { radio: t("src_radio"), playlist: t("src_playlist"), spotify: "Spotify", off: t("src_off") }[s.source];
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div style="min-width:0;">
        <div class="row-title">${s.time} → ${label}${s.station_name ? " (" + s.station_name + ")" : ""}
          <span class="badge ${s.enabled ? "on" : "off"}">${s.enabled ? t("enabled") : t("disabled")}</span></div>
        <div class="row-sub">${days}</div>
      </div>
      <div style="display:flex; gap:6px;">
        <button data-act="toggle" data-id="${s.id}">${s.enabled ? t("disabled") : t("enabled")}</button>
        <button data-act="del" data-id="${s.id}" class="btn-danger">${t("delete")}</button>
      </div>`;
    el.appendChild(row);
  });
  el.querySelectorAll("button").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (btn.dataset.act === "toggle")
        await api(`/api/source-schedules/${btn.dataset.id}/toggle`, { method: "POST" });
      else {
        if (!confirm(t("confirm_del"))) return;
        await api(`/api/source-schedules/${btn.dataset.id}`, { method: "DELETE" });
      }
      loadSs();
    }));
}

$("addSsBtn").addEventListener("click", async () => {
  const days = [...document.querySelectorAll("#ssDayPicker input:checked")].map((c) => Number(c.value));
  try {
    await api("/api/source-schedules", { method: "POST", body: JSON.stringify({
      time: getPickedTime("ssTimePicker"), days,
      source: $("ssSource").value,
      station_id: $("ssSource").value === "radio" ? Number($("ssStation").value) : null,
    })});
    loadSs();
  } catch (err) { alert(err.message); }
});

initCommon("schedule").then(() => {
  renderDayPicker(); loadBells(); fillBellSelect(); loadSchedules();
  renderTimePicker("schTimePicker"); renderTimePicker("ssTimePicker");
  initAzanLocation();
  loadAzan(); renderSsDayPicker(); fillSsStations(); loadSs();
});
