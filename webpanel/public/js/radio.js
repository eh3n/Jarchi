async function loadStations() {
  const stations = await api("/api/stations");
  const list = $("stationsList");
  list.innerHTML = stations.length ? "" : `<div class="row-sub">${t("empty_list")}</div>`;
  stations.forEach((st) => {
    const row = document.createElement("div");
    row.className = "row";
    row.dataset.id = st.id;
    row.innerHTML = `
      <div style="min-width:0; flex:1;">
        <div class="row-title">📻 <span class="st-name">${st.name}</span>
          ${st.is_active ? `<span class="badge on">${t("on_air_badge")}</span>` : ""}</div>
        <div class="row-sub st-url">${st.url}</div>
        <div class="check-result" id="check-${st.id}"></div>
      </div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button data-act="activate" class="btn-primary">${t("play")}</button>
        <button data-act="check">${t("check")}</button>
        <button data-act="edit">${t("edit")}</button>
        <button data-act="delete" class="btn-danger">${t("delete")}</button>
      </div>`;
    list.appendChild(row);
  });

  list.querySelectorAll("button").forEach((btn) => {
    const row = btn.closest(".row");
    const id = row.dataset.id;
    btn.addEventListener("click", async () => {
      const act = btn.dataset.act;
      try {
        if (act === "activate") {
          await api(`/api/stations/${id}/activate`, { method: "POST" });
          loadStations();
        } else if (act === "delete") {
          if (!confirm(t("confirm_del"))) return;
          await api(`/api/stations/${id}`, { method: "DELETE" });
          loadStations();
        } else if (act === "check") {
          const out = $(`check-${id}`);
          out.className = "check-result";
          out.textContent = t("checking");
          const d = await api(`/api/stations/${id}/check`);
          if (d.ok) {
            out.className = "check-result ok";
            let s = `${t("stream_ok")} — ${t("quality")}: ${d.codec || "?"}`;
            if (d.bitrate) s += ` ${d.bitrate}kbps`;
            if (d.sample_rate) s += ` ${d.sample_rate}Hz`;
            if (d.channels) s += ` ${d.channels}ch`;
            if (d.format) s += ` (${d.format})`;
            if (d.icy_name) s += ` — ${d.icy_name}`;
            out.textContent = s;
            if (d.hls_warning) out.textContent += " ⚠ " + t("hls_warn");
          } else {
            out.className = "check-result fail";
            out.textContent = `${t("stream_fail")} — ${d.error}`;
          }
        } else if (act === "edit") {
          startEdit(row, id);
        }
      } catch (err) { alert(err.message); }
    });
  });
}

function startEdit(row, id) {
  const name = row.querySelector(".st-name").textContent;
  const url = row.querySelector(".st-url").textContent;
  row.innerHTML = `
    <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
      <input type="text" class="e-name" value="${name.replace(/"/g,'&quot;')}" />
      <input type="url" class="e-url" value="${url.replace(/"/g,'&quot;')}" style="direction:ltr;" />
    </div>
    <div style="display:flex; gap:6px;">
      <button class="btn-primary e-save">${t("save")}</button>
      <button class="e-cancel">${t("cancel")}</button>
    </div>`;
  row.querySelector(".e-save").addEventListener("click", async () => {
    try {
      await api(`/api/stations/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: row.querySelector(".e-name").value.trim(),
          url: row.querySelector(".e-url").value.trim(),
        }),
      });
      loadStations();
    } catch (err) { alert(err.message); }
  });
  row.querySelector(".e-cancel").addEventListener("click", loadStations);
}

$("addStationBtn").addEventListener("click", async () => {
  const name = $("stationName").value.trim();
  const url = $("stationUrl").value.trim();
  if (!name || !url) return;
  try {
    await api("/api/stations", { method: "POST", body: JSON.stringify({ name, url }) });
    $("stationName").value = ""; $("stationUrl").value = "";
    loadStations();
  } catch (err) { alert(err.message); }
});

$("rbSearchBtn").addEventListener("click", async () => {
  const q = $("rbQuery").value.trim();
  if (!q) return;
  const out = $("rbResults");
  out.innerHTML = `<div class="row-sub">${t("checking")}</div>`;
  try {
    const list = await api("/api/radiobrowser?q=" + encodeURIComponent(q));
    if (!list.length) { out.innerHTML = `<div class="row-sub">${t("empty_list")}</div>`; return; }
    out.innerHTML = "";
    list.forEach((s) => {
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <div style="min-width:0;">
          <div class="row-title">📻 ${s.name} <span class="badge">${s.country || ""} ${s.codec || ""} ${s.bitrate ? s.bitrate + "k" : ""}</span></div>
          <div class="row-sub">${s.url}</div>
        </div>
        <button class="btn-primary">${t("add")}</button>`;
      row.querySelector("button").addEventListener("click", async () => {
        await api("/api/stations", { method: "POST", body: JSON.stringify({ name: s.name, url: s.url }) });
        loadStations();
      });
      out.appendChild(row);
    });
  } catch (err) { out.innerHTML = `<div class="row-sub">${err.message}</div>`; }
});
$("rbQuery").addEventListener("keydown", (e) => { if (e.key === "Enter") $("rbSearchBtn").click(); });

initCommon("radio").then(loadStations);
