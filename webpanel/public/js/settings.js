function showMsg(id, text, ok = false) {
  const el = $(id);
  el.style.color = ok ? "var(--green)" : "var(--red)";
  el.textContent = text;
}

async function loadDevices() {
  const d = await api("/api/settings/audio-devices");
  const sel = $("audioDevice");
  sel.innerHTML = d.devices.map((x) => `<option value="${x.id}">${x.label}</option>`).join("");
  $("aplayRaw").style.display = "block";
  $("aplayRaw").textContent = d.raw || "";
  return d.devices;
}

async function loadSettings() {
  const s = await api("/api/settings");
  $("optModeA").textContent = t("mode_a");
  $("optModeB").textContent = t("mode_b");
  $("sipMode").value = s.sip_mode || "A";
  $("sipPbxHost").value = s.sip_pbx_host || "";
  $("sipExtension").value = s.sip_extension || "100";
  $("sipMaxSec").value = s.sip_max_page_seconds || "120";
  $("sipPassHint").textContent = s.sip_password_set ? t("pass_set") : t("pass_unset");
  togglePbxHost();

  const devices = await loadDevices();
  const sel = $("audioDevice");
  if (devices.some((d) => d.id === s.alsa_device)) sel.value = s.alsa_device;
  else {
    sel.insertAdjacentHTML("afterbegin", `<option value="${s.alsa_device}">${s.alsa_device} *</option>`);
    sel.value = s.alsa_device;
  }

  const tzSel = $("timezoneSelect");
  let zones = ["Asia/Tehran", "UTC", "Europe/Istanbul", "Europe/Moscow", "Asia/Dubai", "Europe/Berlin", "Europe/London"];
  try { zones = Intl.supportedValuesOf("timeZone"); } catch (_) {}
  tzSel.innerHTML = zones.map((z) => `<option value="${z}">${z}</option>`).join("");
  tzSel.value = s.timezone || "Asia/Tehran";
  $("sipPort").value = s.sip_port || "5060";
  $("duckLevel").value = Math.round(Number(s.duck_level || 0.12) * 100);
  $("duckValue").textContent = $("duckLevel").value;

  refreshServices();
}

async function refreshServices() {
  try {
    const d = await api("/api/system/services");
    $("svcStatus").textContent = `liquidsoap: ${d.liquidsoap} | asterisk: ${d.asterisk}`;
  } catch (_) {}
}

function togglePbxHost() {
  $("pbxHostWrap").style.display = $("sipMode").value === "A" ? "" : "none";
}
$("sipMode").addEventListener("change", togglePbxHost);

$("saveSipBtn").addEventListener("click", async () => {
  showMsg("sipMsg", t("applying"), true);
  try {
    await api("/api/settings/sip", {
      method: "POST",
      body: JSON.stringify({
        mode: $("sipMode").value,
        pbx_host: $("sipPbxHost").value.trim(),
        extension: $("sipExtension").value.trim(),
        port: $("sipPort").value,
        password: $("sipPassword").value,
        max_page_seconds: $("sipMaxSec").value,
      }),
    });
    $("sipPassword").value = "";
    showMsg("sipMsg", t("done"), true);
    loadSettings();
  } catch (err) { showMsg("sipMsg", err.message); }
});

$("sipStatusBtn").addEventListener("click", async () => {
  const out = $("sipStatusOut");
  out.style.display = "block";
  out.textContent = t("checking");
  const d = await api("/api/settings/sip-status");
  out.textContent = d.output || "-";
});

$("duckLevel").addEventListener("input", () => {
  $("duckValue").textContent = $("duckLevel").value;
});

$("saveAudioBtn").addEventListener("click", async () => {
  showMsg("audioMsg", t("applying"), true);
  try {
    await api("/api/settings/duck", {
      method: "POST", body: JSON.stringify({ value: Number($("duckLevel").value) / 100 }),
    });
    await api("/api/settings/audio-device", {
      method: "POST", body: JSON.stringify({ device: $("audioDevice").value }),
    });
    showMsg("audioMsg", t("done"), true);
    setTimeout(refreshServices, 3000);
  } catch (err) { showMsg("audioMsg", err.message); }
});

$("testSoundBtn").addEventListener("click", async () => {
  try {
    await api("/api/settings/test-sound", { method: "POST" });
    showMsg("audioMsg", t("test_sent"), true);
  } catch (err) { showMsg("audioMsg", err.message); }
});

$("refreshDevBtn").addEventListener("click", loadDevices);

$("saveTzBtn").addEventListener("click", async () => {
  try {
    await api("/api/settings/timezone", {
      method: "POST", body: JSON.stringify({ timezone: $("timezoneSelect").value }),
    });
    showMsg("tzMsg", t("done"), true);
    panelTimezone = $("timezoneSelect").value;
  } catch (err) { showMsg("tzMsg", err.message); }
});

$("restartEngineBtn").addEventListener("click", async () => {
  showMsg("sysMsg", t("applying"), true);
  try {
    await api("/api/system/restart-engine", { method: "POST" });
    showMsg("sysMsg", t("done"), true);
    setTimeout(refreshServices, 3000);
  } catch (err) { showMsg("sysMsg", err.message); }
});

$("rebootBtn").addEventListener("click", async () => {
  if (!confirm(t("reboot_confirm"))) return;
  try {
    await api("/api/system/reboot", { method: "POST" });
    showMsg("sysMsg", t("rebooting"), true);
  } catch (err) { showMsg("sysMsg", err.message); }
});

$("backupBtn").addEventListener("click", () => {
  window.location.href = "/api/system/backup";
});

$("diagBtn").addEventListener("click", async () => {
  const out = $("diagOut");
  out.style.display = "block";
  out.textContent = t("checking");
  try {
    const d = await api("/api/system/diagnose");
    out.textContent =
      `uptime:        ${d.uptime}\n` +
      `active_source: ${d.active_source}\n` +
      `volume_level:  ${d.volume_level}\n` +
      `radio_url:     ${d.radio_url}\n` +
      `radio_status:  ${d.radio_status}\n` +
      `playlist_next:\n${d.playlist_next}\n\n` +
      `--- liquidsoap log (last 50 lines) ---\n${d.log_tail}`;
  } catch (err) { out.textContent = err.message; }
});

$("changePasswordBtn").addEventListener("click", async () => {
  try {
    await api("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword: $("currentPassword").value,
        newPassword: $("newPassword").value,
      }),
    });
    $("currentPassword").value = ""; $("newPassword").value = "";
    showMsg("passwordMsg", t("done"), true);
  } catch (err) { showMsg("passwordMsg", err.message); }
});

initCommon("settings").then(loadSettings);
setInterval(refreshServices, 10000);
