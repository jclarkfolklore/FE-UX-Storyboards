import { FRAMES, LINKS, LEGEND } from "./frames.js";

// Carbon "Chat" icon (no emoji) for the comment surfaces
const ICON_CHAT = `<svg class="ic" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M17.74 30L16 29l4-7h6a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9v2H6a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h20a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4h-4.84Z"/></svg>`;

const world = document.getElementById("world");
const viewport = document.getElementById("viewport");
const edges = document.getElementById("edges");

// ---------------- comments (server only; the DEPLOYED static build is view-only) ----------------
// COMMENTS = true only when the comment server is present (local `npm start`) — that's
// the Claude↔user feedback loop. On Netlify (static, no /api) the whole comment/notes
// feature is hidden and the app is view-only.
let COMMENTS = false;
let STORE = { fields: {} };
async function detectAndLoad() {
  try {
    const r = await fetch("/api/feedback", { cache: "no-store" });
    if (r.ok) { COMMENTS = true; STORE = await r.json(); STORE.fields ||= {}; }
  } catch { COMMENTS = false; }
}
async function saveComment(id, text) {
  const r = await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, text }) });
  STORE.fields[id] = await r.json();
  renderThread(id);
}
async function recoverComment(id) {
  const r = await fetch("/api/feedback/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  STORE.fields[id] = await r.json();
  renderThread(id);
}
const fmtTime = (ts) => new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function renderThread(id) {
  const wrap = document.querySelector(`[data-thread="${id}"]`);
  if (!wrap) return;
  const f = STORE.fields[id] || { entries: [], archived: [] };
  const count = wrap.closest(".wf-comments, .overall")?.querySelector(".count");
  if (count) count.textContent = f.entries?.length ? `(${f.entries.length})` : "";
  wrap.innerHTML =
    (f.entries?.length
      ? f.entries.map((e) => `<div class="wf-entry"><span class="wf-entry-t">${fmtTime(e.ts)}</span>${esc(e.text)}</div>`).join("")
      : `<div class="wf-entry wf-empty">no comments yet</div>`) +
    (f.archived?.length ? `<button class="wf-recover" data-recover="${id}">⤺ recover ${f.archived.length} archived</button>` : "");
}

// ---------------- render nodes ----------------
const commentBlock = (id) => `<div class="wf-comments">
    <button class="wf-comments-toggle">${ICON_CHAT} Comments &amp; notes <span class="count"></span><span class="chev">›</span></button>
    <div class="wf-comments-body"><div class="wf-thread" data-thread="${id}"></div>
      <textarea class="wf-ta" data-ta="${id}" placeholder="comment on this view…"></textarea>
      <div class="wf-comment-actions"><button class="wf-save" data-save="${id}">Save</button></div></div></div>`;

function renderNodes() {
  for (const fr of FRAMES) {
    const el = document.createElement("div");
    el.className = "node" + (fr.isNew ? " new" : "");
    el.id = `node-${fr.id}`;
    el.style.width = Math.round(fr.w * 1.15) + "px"; // scale up so bumped text stays in-proportion
    el.innerHTML = `<div class="node-head"><span class="node-title">${fr.title}</span><span class="node-tag">${fr.tag}</span></div>
      <div class="node-wire">${fr.wire}</div><div class="node-desc">${fr.desc}</div>${COMMENTS ? commentBlock(fr.id) : ""}`;
    world.appendChild(el);
  }
}

// ---------------- grid auto-layout (col × lane → non-overlapping) ----------------
const GAP_X = 130, GAP_Y = 96; // generous spacing so connector labels have room to breathe
function layout() {
  const cols = [...new Set(FRAMES.map((f) => f.col))].sort((a, b) => a - b);
  const lanes = [...new Set(FRAMES.map((f) => f.lane))].sort((a, b) => a - b);
  const nodeH = {}, nodeW = {};
  for (const f of FRAMES) {
    const n = document.getElementById(`node-${f.id}`);
    nodeH[f.id] = n.offsetHeight; nodeW[f.id] = n.offsetWidth;
  }
  const colW = {}, laneH = {};
  for (const c of cols) colW[c] = Math.max(...FRAMES.filter((f) => f.col === c).map((f) => nodeW[f.id]));
  for (const l of lanes) laneH[l] = Math.max(...FRAMES.filter((f) => f.lane === l).map((f) => nodeH[f.id]));
  const colX = {}; let x = 0;
  for (const c of cols) { colX[c] = x; x += colW[c] + GAP_X; }
  const laneY = {}; let y = 0;
  for (const l of lanes) { laneY[l] = y; y += laneH[l] + GAP_Y; }
  for (const f of FRAMES) {
    const n = document.getElementById(`node-${f.id}`);
    n.style.left = colX[f.col] + (colW[f.col] - nodeW[f.id]) / 2 + "px";  // center in cell
    n.style.top = laneY[f.lane] + (laneH[f.lane] - nodeH[f.id]) / 2 + "px";
  }
}

// ---------------- flow arrows ----------------
function drawEdges() {
  edges.innerHTML = `<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#9aa0a6"/></marker></defs>`;
  const rect = (id) => { const n = document.getElementById(`node-${id}`); return { x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight }; };
  let mx = 0, my = 0;
  for (const link of LINKS) {
    const a = rect(link.from), b = rect(link.to);
    mx = Math.max(mx, a.x + a.w, b.x + b.w); my = Math.max(my, a.y + a.h, b.y + b.h);
    let x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2;
    if (b.x + b.w <= a.x) { x1 = a.x; x2 = b.x + b.w; }             // target strictly left → exit left
    else if (Math.abs(b.x - a.x) < 20) {                            // roughly same column → vertical
      x1 = a.x + a.w / 2; x2 = b.x + b.w / 2;
      y1 = b.y > a.y ? a.y + a.h : a.y; y2 = b.y > a.y ? b.y : b.y + b.h;
    }
    const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
    const vert = x1 === x2;
    const d = vert
      ? `M ${x1},${y1} C ${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`
      : `M ${x1},${y1} C ${x1 + (x2 >= x1 ? dx : -dx)},${y1} ${x2 + (x2 >= x1 ? -dx : dx)},${y2} ${x2},${y2}`;
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d); p.setAttribute("class", "edge"); p.setAttribute("marker-end", "url(#arrow)");
    edges.appendChild(p);
    if (link.label) {
      const ns = "http://www.w3.org/2000/svg", g = document.createElementNS(ns, "g");
      const t = document.createElementNS(ns, "text");
      t.setAttribute("x", (x1 + x2) / 2); t.setAttribute("y", (y1 + y2) / 2 - 4);
      t.setAttribute("class", "edge-label"); t.setAttribute("text-anchor", "middle"); t.setAttribute("dominant-baseline", "middle");
      t.textContent = link.label;
      g.appendChild(t); edges.appendChild(g);
      const bb = t.getBBox(), r = document.createElementNS(ns, "rect");
      r.setAttribute("x", bb.x - 8); r.setAttribute("y", bb.y - 4); r.setAttribute("width", bb.width + 16); r.setAttribute("height", bb.height + 8);
      r.setAttribute("rx", 9); r.setAttribute("class", "edge-label-bg");
      g.insertBefore(r, t);
    }
  }
  edges.setAttribute("width", mx + 200); edges.setAttribute("height", my + 200);
}

// ---------------- legend ----------------
function renderLegend() {
  const el = document.getElementById("legend-body");
  const swatch = (cls) => `<div class="legend-swatch" style="border-color:var(--${cls});background:color-mix(in srgb, var(--${cls}) 12%, #fff)"></div>`;
  const item = (sw, b, s, sem) => `<div class="legend-item"${sem ? ` data-sem="${sem}"` : ""}>${sw}<div><b>${b}</b><span>${s}</span></div></div>`;
  el.innerHTML =
    `<div class="legend-group"><h4>Semantic color <span style="text-transform:none;letter-spacing:0">— hover to glow</span></h4>${LEGEND.color.map(([c, b, s]) => item(swatch(c), b, s, c)).join("")}</div>` +
    (COMMENTS ? `<div class="legend-group"><h4>Markers</h4>${item(`<div class="legend-swatch mark-new"></div>`, "NEW for multiplayer", "added by this work; unmarked = existing screen, reused")}</div>` : "") +
    `<div class="legend-group"><h4>Frame type</h4>${item(`<div class="legend-swatch frame-stage"></div>`, "Game window (16:9)", "true-proportion fixed stage a screen renders in")}${item(`<div class="legend-swatch frame-page"></div>`, "Whole page", "element lives OUTSIDE the game window (e.g. diagnostics drawer)")}</div>` +
    `<div class="legend-group"><h4>Reading the map</h4><div class="legend-item"><div><span>Arrows = flow transitions. Top lane = branches, middle = the online happy path, bottom = alternate/error paths.</span></div></div></div>`;
}

// ---------------- pan / zoom ----------------
let tx = 60, ty = 40, k = 0.7;
const pctEl = () => document.getElementById("zoompct");
function apply() {
  world.style.transform = `translate(${tx}px,${ty}px) scale(${k})`;
  // keep the NEW badge a constant size regardless of zoom (counter-scale, clamped)
  document.documentElement.style.setProperty("--inv", Math.min(2.8, Math.max(1, 1 / k)));
  if (pctEl()) pctEl().textContent = Math.round(k * 100) + "%";
}
function contentBounds() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const f of FRAMES) { const n = document.getElementById(`node-${f.id}`); minX = Math.min(minX, n.offsetLeft); minY = Math.min(minY, n.offsetTop); maxX = Math.max(maxX, n.offsetLeft + n.offsetWidth); maxY = Math.max(maxY, n.offsetTop + n.offsetHeight); }
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY };
}
// Usable viewport region — EXCLUDES the open Key panel so we never center/fit
// behind it (users can still pan content behind the panel manually).
function avail() {
  const insetL = document.getElementById("legend")?.classList.contains("open") ? 340 : 0;
  const pad = 40, W = viewport.clientWidth, H = viewport.clientHeight;
  const w = W - insetL - pad * 2, h = H - pad * 2;
  return { w, h, cx: insetL + pad + w / 2, cy: pad + h / 2 };
}
function fit() { const b = contentBounds(), a = avail(); k = Math.min(a.w / b.w, a.h / b.h, 1); tx = a.cx - b.cx * k; ty = a.cy - b.cy * k; apply(); }
function center() { const b = contentBounds(), a = avail(); tx = a.cx - b.cx * k; ty = a.cy - b.cy * k; apply(); } // recenter, keep zoom
function reset() { fit(); } // center + fit (the default home view)
// Zoom keeping the CENTER of the available space fixed (so centered content stays
// centered — you don't get lost). Used by wheel, the +/- buttons, and modifier-drag.
function zoomTo(newK) {
  newK = Math.min(2.5, Math.max(0.12, newK)); if (newK === k) return;
  const a = avail(), wx = (a.cx - tx) / k, wy = (a.cy - ty) / k;
  k = newK; tx = a.cx - wx * k; ty = a.cy - wy * k; apply();
}
viewport.addEventListener("wheel", (e) => { e.preventDefault(); zoomTo(k * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });

// mode: 'pan' | 'zoom' (⌘/ctrl/alt + drag up-down) | 'marquee' (drag-select)
let mode = null, sx = 0, sy = 0, lastY = 0, marq = null;
let suppressClick = false; // after a marquee/zoom drag, swallow the trailing click so it can't clear the selection
function updateMarquee(e) {
  const vp = viewport.getBoundingClientRect(), x = e.clientX - vp.left, y = e.clientY - vp.top, d = document.getElementById("marquee");
  if (!d || !marq) return;
  d.style.left = Math.min(marq.x0, x) + "px"; d.style.top = Math.min(marq.y0, y) + "px";
  d.style.width = Math.abs(x - marq.x0) + "px"; d.style.height = Math.abs(y - marq.y0) + "px";
}
viewport.addEventListener("mousedown", (e) => {
  if (e.target.closest(".node, #sel-bar, #tool-fabs, .panel")) return;
  const vp = viewport.getBoundingClientRect();
  if (document.body.classList.contains("marquee-mode")) {
    mode = "marquee"; marq = { x0: e.clientX - vp.left, y0: e.clientY - vp.top };
    const d = document.createElement("div"); d.id = "marquee"; viewport.appendChild(d); updateMarquee(e); e.preventDefault(); return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) { mode = "zoom"; lastY = e.clientY; viewport.classList.add("grabbing"); e.preventDefault(); return; }
  mode = "pan"; sx = e.clientX - tx; sy = e.clientY - ty; viewport.classList.add("grabbing");
});
window.addEventListener("mousemove", (e) => {
  if (mode === "marquee") return updateMarquee(e);
  if (mode === "zoom") { zoomTo(k * Math.exp((lastY - e.clientY) * 0.006)); lastY = e.clientY; return; }
  if (mode === "pan") { tx = e.clientX - sx; ty = e.clientY - sy; apply(); }
});
window.addEventListener("mouseup", (e) => {
  if (mode === "marquee") {
    const vp = viewport.getBoundingClientRect();
    selectInRect(marq.x0, marq.y0, e.clientX - vp.left, e.clientY - vp.top);
    document.getElementById("marquee")?.remove(); marq = null; suppressClick = true; setTimeout(() => (suppressClick = false), 0);
  }
  mode = null; viewport.classList.remove("grabbing");
});

// ---------------- selection + one always-present notes bar ----------------
// The bar targets the SELECTION when frames are selected, else the WHOLE BOARD
// (so a general note doesn't require opening a separate panel).
const selected = new Set();
const notesTarget = () => (selected.size ? "sel:" + [...selected].sort().join("+") : "__overall");
function toggleSel(node) {
  const id = node.id.replace("node-", "");
  selected.has(id) ? (selected.delete(id), node.classList.remove("selected")) : (selected.add(id), node.classList.add("selected"));
  renderNotesBar();
}
function clearSel() { selected.forEach((id) => document.getElementById(`node-${id}`)?.classList.remove("selected")); selected.clear(); renderNotesBar(); }
function renderNotesBar() {
  if (!COMMENTS) return;
  let bar = document.getElementById("sel-bar");
  if (!bar) { bar = document.createElement("div"); bar.id = "sel-bar"; document.body.appendChild(bar); }
  const has = selected.size > 0, fid = notesTarget(), ids = [...selected].sort();
  bar.classList.toggle("for-sel", has);
  bar.innerHTML = `<div class="sel-bar-h">${ICON_CHAT} ${has ? `one comment on <b>${ids.length}</b> selected frame${ids.length > 1 ? "s" : ""}` : "comment on the <b>whole board</b>"}
      <span class="sel-ids">${has ? ids.join(" · ") : "nothing selected — posts a general board note"}</span></div>
    <div class="wf-thread" data-thread="${fid}"></div>
    <textarea class="wf-ta" id="sel-ta" placeholder="${has ? "one comment for all selected frames…" : "a note on the whole board…"}"></textarea>
    <div class="wf-comment-actions"><button class="wf-save" id="sel-save">Save</button></div>`;
  renderThread(fid);
}

// ---------------- events ----------------
document.addEventListener("click", (e) => {
  if (suppressClick) return; // trailing click right after a marquee drag — ignore it
  // SELECT MODE: click anywhere on a card toggles its selection
  if (COMMENTS && document.body.classList.contains("select-mode")) {
    const n = e.target.closest(".node"); if (n) return toggleSel(n);
  }
  const save = e.target.closest("[data-save]");
  if (save) { const id = save.dataset.save, ta = document.querySelector(`[data-ta="${id}"]`); if (ta?.value.trim()) { saveComment(id, ta.value); ta.value = ""; } return; }
  if (e.target.id === "sel-save") { const ta = document.getElementById("sel-ta"); if (ta?.value.trim()) { saveComment(notesTarget(), ta.value); ta.value = ""; } return; }
  const rec = e.target.closest("[data-recover]"); if (rec) return recoverComment(rec.dataset.recover);
  const tog = e.target.closest(".wf-comments-toggle"); if (tog) return tog.closest(".wf-comments").classList.toggle("open");
  if (!COMMENTS) return;
  // NORMAL mode: click a card's HEADER selects (leaves text/buttons alone)
  const head = e.target.closest(".node-head");
  if (head && !e.target.closest("button,a,textarea,input")) return toggleSel(head.closest(".node"));
  if (!document.body.classList.contains("marquee-mode") && !document.body.classList.contains("select-mode")
    && !e.target.closest(".node, #sel-bar, #tool-fabs, .panel, .topbar")) clearSel();
});
document.getElementById("zoom-in").onclick = () => zoomTo(k * 1.2);
document.getElementById("zoom-out").onclick = () => zoomTo(k / 1.2);
document.getElementById("fit").onclick = fit;
document.getElementById("center").onclick = center;
document.getElementById("reset").onclick = reset;
// Info modal (design brief)
const infoModal = document.getElementById("info-modal");
document.getElementById("info-btn").onclick = () => (infoModal.hidden = false);
document.getElementById("info-close").onclick = () => (infoModal.hidden = true);
infoModal.addEventListener("click", (e) => { if (e.target === infoModal) infoModal.hidden = true; });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") infoModal.hidden = true; });
// Key: hamburger toggle (closed by default), persists across refreshes
document.getElementById("nav-menu").onclick = (e) => {
  const open = document.getElementById("legend").classList.toggle("open");
  e.currentTarget.classList.toggle("on", open);
  localStorage.setItem("ux-legend", open ? "open" : "closed");
};
// hover a Key color row → matching wireframe elements glow
const lb = document.getElementById("legend-body");
lb.addEventListener("mouseover", (e) => { const it = e.target.closest("[data-sem]"); if (it) document.querySelectorAll(`.node .${it.dataset.sem}`).forEach((el) => el.classList.add("glow")); });
lb.addEventListener("mouseout", (e) => { if (e.target.closest("[data-sem]")) document.querySelectorAll(".glow").forEach((el) => el.classList.remove("glow")); });
// select FABs (click-to-select mode · drag-a-box mode · clear)
document.getElementById("fab-select").onclick = (e) => {
  const on = document.body.classList.toggle("select-mode"); e.currentTarget.classList.toggle("on", on);
  if (on) { document.body.classList.remove("marquee-mode"); document.getElementById("fab-marquee").classList.remove("on"); }
};
document.getElementById("fab-marquee").onclick = (e) => {
  const on = document.body.classList.toggle("marquee-mode"); e.currentTarget.classList.toggle("on", on);
  if (on) { document.body.classList.remove("select-mode"); document.getElementById("fab-select").classList.remove("on"); }
};
document.getElementById("fab-clear").onclick = clearSel;

// ---------------- marquee selection helper ----------------
function selectInRect(x0, y0, x1, y1) {
  const vp = viewport.getBoundingClientRect();
  const L = Math.min(x0, x1), R = Math.max(x0, x1), T = Math.min(y0, y1), B = Math.max(y0, y1);
  for (const f of FRAMES) {
    const n = document.getElementById(`node-${f.id}`), b = n.getBoundingClientRect();
    const nx = b.left - vp.left, ny = b.top - vp.top;
    const hit = nx < R && nx + b.width > L && ny < B && ny + b.height > T;
    if (hit && !selected.has(f.id)) { selected.add(f.id); n.classList.add("selected"); }
  }
  renderNotesBar();
}

// ---------------- boot ----------------
(async function boot() {
  await detectAndLoad();
  document.getElementById("mode-badge").textContent = COMMENTS ? "feedback loop on · comments.db" : "view only";
  if (!COMMENTS) { // deployed/static: view-only — no comment tools, and NEW signifiers are irrelevant to the team view
    document.body.classList.add("view-only");
    document.getElementById("tool-fabs")?.remove();
    document.getElementById("viewonly-flag").hidden = false;
  }
  renderNodes();
  renderLegend();
  // Key: restore persisted open/closed state (default CLOSED — the ☰ hamburger opens it)
  const legendOpen = localStorage.getItem("ux-legend") === "open";
  document.getElementById("legend").classList.toggle("open", legendOpen);
  document.getElementById("nav-menu").classList.toggle("on", legendOpen);
  requestAnimationFrame(() => {
    layout();
    drawEdges();
    if (COMMENTS) { for (const f of FRAMES) renderThread(f.id); renderNotesBar(); }
    fit();
  });
})();
