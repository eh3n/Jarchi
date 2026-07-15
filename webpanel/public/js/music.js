async function loadTracks() {
  const tracks = await api("/api/tracks");
  const list = $("tracksList");
  list.innerHTML = tracks.length ? "" : `<div class="row-sub">${t("empty_list")}</div>`;
  tracks.forEach((tr) => {
    const row = document.createElement("div");
    row.className = "row";
    const thumb = tr.has_cover
      ? `<img class="track-thumb" src="/api/tracks/${tr.id}/cover" alt="" />`
      : `<span class="track-thumb">🎵</span>`;
    const dur = tr.duration ? `${Math.floor(tr.duration/60)}:${String(Math.floor(tr.duration%60)).padStart(2,"0")}` : "";
    row.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; min-width:0;">
        ${thumb}
        <div style="min-width:0;">
          <div class="row-title">${tr.title}</div>
          <div class="row-sub">${tr.artist || t("unknown_artist")}${dur ? " · " + dur : ""}</div>
        </div>
      </div>
      <button data-id="${tr.id}" class="btn-danger">${t("delete")}</button>`;
    list.appendChild(row);
  });
  list.querySelectorAll("button").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!confirm(t("confirm_del"))) return;
      await api(`/api/tracks/${btn.dataset.id}`, { method: "DELETE" });
      loadTracks();
    }));
}

$("uploadTracksBtn").addEventListener("click", async () => {
  const files = $("trackFiles").files;
  if (!files.length) return;
  const fd = new FormData();
  for (const f of files) fd.append("tracks", f);
  $("uploadStatus").textContent = t("applying");
  try {
    const res = await fetch("/api/tracks/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    $("trackFiles").value = "";
    $("uploadStatus").textContent = t("done");
    loadTracks();
    setTimeout(loadTracks, 4000);
  } catch (err) { $("uploadStatus").textContent = ""; alert(err.message); }
});

initCommon("music").then(loadTracks);
