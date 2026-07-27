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
  window.refreshComments?.();
}
async function recoverComment(id) {
  const r = await fetch("/api/feedback/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
  STORE.fields[id] = await r.json();
  renderThread(id);
  window.refreshComments?.();
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
  FRAMES.forEach((fr, i) => {
    const el = document.createElement("div");
    el.className = "node enter" + (fr.isNew ? " new" : "");
    el.id = `node-${fr.id}`;
    el.style.width = Math.round(fr.w * 1.15) + "px"; // scale up so bumped text stays in-proportion
    el.style.animationDelay = i * 16 + "ms"; // gentle staggered entrance
    el.innerHTML = `<div class="node-head"><span class="node-title">${fr.title}</span><span class="node-tag">${fr.tag}</span></div>
      <div class="node-wire">${fr.wire}</div><div class="node-desc">${fr.desc}</div>${COMMENTS ? commentBlock(fr.id) : ""}`;
    world.appendChild(el);
  });
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
// Orthogonal routing (the flow-chart approach): edges travel the empty GUTTERS
// between cards — the vertical channels between columns and the horizontal
// channels between lanes — so a connector never disappears behind a card.
// Cards occupy column×lane bands; the gutters between them are always clear
// across the whole board, so a segment placed in a gutter can't hit a card.
function orthoPath(pts, r = 12) {
  if (pts.length === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    const s1 = Math.sign(p1.x - p0.x), t1 = Math.sign(p1.y - p0.y);
    const s2 = Math.sign(p2.x - p1.x), t2 = Math.sign(p2.y - p1.y);
    const d1 = Math.min(r, Math.hypot(p1.x - p0.x, p1.y - p0.y) / 2);
    const d2 = Math.min(r, Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2);
    d += ` L ${p1.x - s1 * d1},${p1.y - t1 * d1} Q ${p1.x},${p1.y} ${p1.x + s2 * d2},${p1.y + t2 * d2}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L ${last.x},${last.y}`;
}

function routeEdge(a, b) {
  const aCx = a.x + a.w / 2, bCx = b.x + b.w / 2;
  const aMy = a.y + a.h / 2, bMy = b.y + b.h / 2;
  // same column → vertical connector down the gutter between the two lanes
  if (Math.abs(aCx - bCx) < 24) {
    const x = (aCx + bCx) / 2;
    const y1 = b.y > a.y ? a.y + a.h : a.y;
    const y2 = b.y > a.y ? b.y : b.y + b.h;
    return { pts: [{ x, y: y1 }, { x, y: y2 }], lx: x, ly: (y1 + y2) / 2 };
  }
  const forward = bCx > aCx;
  const ax = forward ? a.x + a.w : a.x;   // exit side
  const bx = forward ? b.x : b.x + b.w;   // enter side
  const multi = Math.abs(bx - ax) > GAP_X * 1.6;   // spans an intermediate column
  if (!multi) {
    // adjacent columns: one vertical hop in the column gutter between them
    const midX = (ax + bx) / 2;
    return {
      pts: [{ x: ax, y: aMy }, { x: midX, y: aMy }, { x: midX, y: bMy }, { x: bx, y: bMy }],
      lx: midX, ly: (aMy + bMy) / 2,
    };
  }
  // multi-column: lift into the horizontal channel (lane gutter) between the
  // two lanes and run across it, clear of every intermediate card.
  const upper = a.y <= b.y ? a : b, lower = a.y <= b.y ? b : a;
  const channelY = (upper.y + upper.h + lower.y) / 2;
  const gx1 = ax + (forward ? GAP_X / 2 : -GAP_X / 2);
  const gx2 = bx - (forward ? GAP_X / 2 : -GAP_X / 2);
  return {
    pts: [
      { x: ax, y: aMy }, { x: gx1, y: aMy }, { x: gx1, y: channelY },
      { x: gx2, y: channelY }, { x: gx2, y: bMy }, { x: bx, y: bMy },
    ],
    lx: (gx1 + gx2) / 2, ly: channelY,
  };
}

function drawEdges() {
  edges.innerHTML = `<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#9aa0a6"/></marker></defs>`;
  const rect = (id) => { const n = document.getElementById(`node-${id}`); return { x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight }; };
  let mx = 0, my = 0;
  for (const link of LINKS) {
    const a = rect(link.from), b = rect(link.to);
    mx = Math.max(mx, a.x + a.w, b.x + b.w); my = Math.max(my, a.y + a.h, b.y + b.h);
    const { pts, lx, ly } = routeEdge(a, b);
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", orthoPath(pts)); p.setAttribute("class", "edge"); p.setAttribute("marker-end", "url(#arrow)");
    edges.appendChild(p);
    if (link.label) {
      const ns = "http://www.w3.org/2000/svg", g = document.createElementNS(ns, "g");
      const t = document.createElementNS(ns, "text");
      t.setAttribute("x", lx); t.setAttribute("y", ly - 4);
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

// ---------------- comments browser (local dev only) ----------------
// A searchable / filterable index of every saved comment, labelled by what it
// targets: an individual card, a group (multi-select), or the whole board.
// Scope is read from the note's field id: "__overall" → board, "sel:a+b" →
// group, anything else → that card id.
let cmtSearch = "", cmtScope = "all";
const titleOf = (id) => FRAMES.find((f) => f.id === id)?.title || id;
function classifyField(fieldId) {
  if (fieldId === "__overall") return { scope: "board", label: "Whole board", ids: [] };
  if (fieldId.startsWith("sel:")) { const ids = fieldId.slice(4).split("+"); return { scope: "group", label: `Group of ${ids.length}`, ids }; }
  return { scope: "card", label: titleOf(fieldId), ids: [fieldId] };
}
function renderComments() {
  const list = document.getElementById("comments-list");
  if (!list) return;
  const all = Object.entries(STORE.fields || {}).filter(([, d]) => d && d.entries && d.entries.length);
  const rows = [];
  for (const [fieldId, data] of all) {
    const c = classifyField(fieldId);
    if (cmtScope !== "all" && c.scope !== cmtScope) continue;
    const hay = (c.label + " " + c.ids.map(titleOf).join(" ") + " " + data.entries.map((e) => e.text).join(" ")).toLowerCase();
    if (cmtSearch && !hay.includes(cmtSearch)) continue;
    rows.push({ fieldId, c, entries: data.entries, last: data.entries[data.entries.length - 1].ts });
  }
  rows.sort((a, b) => b.last - a.last);
  document.getElementById("comments-count").textContent = `${rows.length}/${all.length}`;
  list.innerHTML = rows.length
    ? rows.map((r) => `<div class="cmt-item" data-ids="${esc(r.c.ids.join(","))}" tabindex="0">
        <div class="cmt-head"><span class="cmt-scope cmt-scope-${r.c.scope}">${r.c.scope}</span><span class="cmt-target">${esc(r.c.label)}</span></div>
        ${r.c.scope === "group" ? `<div class="cmt-sub">${esc(r.c.ids.map(titleOf).join(" · "))}</div>` : ""}
        ${r.entries.map((e) => `<div class="cmt-text"><span class="cmt-time">${fmtTime(e.ts)}</span>${esc(e.text)}</div>`).join("")}
      </div>`).join("")
    : `<div class="cmt-empty">${cmtSearch || cmtScope !== "all" ? "no comments match" : "no comments yet"}</div>`;
}
function panToNodes(ids) {
  const ns = ids.map((id) => document.getElementById(`node-${id}`)).filter(Boolean);
  if (!ns.length) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  ns.forEach((n) => { minX = Math.min(minX, n.offsetLeft); minY = Math.min(minY, n.offsetTop); maxX = Math.max(maxX, n.offsetLeft + n.offsetWidth); maxY = Math.max(maxY, n.offsetTop + n.offsetHeight); });
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, a = avail();
  animateView(() => { tx = a.cx - cx * k; ty = a.cy - cy * k; apply(); });
}
function setupCommentsPanel() {
  const tools = document.querySelector(".topbar .tools");
  if (tools && !document.getElementById("comments-toggle")) {
    const b = document.createElement("button");
    b.id = "comments-toggle"; b.title = "browse all comments";
    b.innerHTML = ICON_CHAT;
    tools.appendChild(b); // far right, after the zoom/fit/center/reset group
  }
  if (!document.getElementById("comments-panel")) {
    const aside = document.createElement("aside");
    aside.id = "comments-panel"; aside.className = "panel comments-panel";
    aside.innerHTML = `<div class="panel-h">Comments <span class="panel-sub" id="comments-count"></span></div>
      <input id="comments-search" class="comments-search" placeholder="search comments…" autocomplete="off" spellcheck="false" />
      <div class="comments-filters" id="comments-filters">
        ${["all", "card", "group", "board"].map((s) => `<button class="cf${s === "all" ? " active" : ""}" data-scope="${s}">${s}</button>`).join("")}
      </div>
      <div class="comments-list" id="comments-list"></div>`;
    document.body.appendChild(aside);
  }
  document.getElementById("comments-toggle").onclick = (e) => {
    const open = document.getElementById("comments-panel").classList.toggle("open");
    document.body.classList.toggle("comments-open", open);
    e.currentTarget.classList.toggle("on", open);
    if (open) renderComments();
  };
  document.getElementById("comments-search").oninput = (e) => { cmtSearch = e.target.value.trim().toLowerCase(); renderComments(); };
  document.getElementById("comments-filters").onclick = (e) => {
    const b = e.target.closest(".cf"); if (!b) return;
    cmtScope = b.dataset.scope;
    document.querySelectorAll("#comments-filters .cf").forEach((x) => x.classList.toggle("active", x === b));
    renderComments();
  };
  document.getElementById("comments-list").onclick = (e) => {
    const it = e.target.closest(".cmt-item"); if (!it) return;
    const ids = it.dataset.ids ? it.dataset.ids.split(",").filter(Boolean) : [];
    clearSel();
    ids.forEach((id) => { const n = document.getElementById(`node-${id}`); if (n) { selected.add(id); n.classList.add("selected"); } });
    renderNotesBar();
    if (ids.length) panToNodes(ids);
  };
  window.refreshComments = renderComments;
  renderComments();
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
// Usable viewport region — EXCLUDES the open Key panel (left) and the floating
// notes bar (bottom) so Fit/Center/Reset never frame content behind them (users
// can still pan content behind them manually).
function avail() {
  const insetL = document.getElementById("legend")?.classList.contains("open") ? 340 : 0;
  const insetR = document.getElementById("comments-panel")?.classList.contains("open") ? 340 : 0;
  const bar = document.getElementById("sel-bar");
  const insetB = bar ? bar.offsetHeight + 24 + 18 : 0; // bar height + its 24px bottom gap + margin
  const pad = 40, W = viewport.clientWidth, H = viewport.clientHeight;
  const w = W - insetL - insetR - pad * 2, h = H - insetB - pad * 2;
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
// Eased transition for discrete view changes (buttons); NOT during drag/wheel.
let animTimer;
function animateView(fn) {
  world.style.transition = "transform .42s cubic-bezier(.22,.61,.36,1)";
  fn();
  clearTimeout(animTimer);
  animTimer = setTimeout(() => (world.style.transition = ""), 450);
}
viewport.addEventListener("wheel", (e) => { e.preventDefault(); world.style.transition = ""; zoomTo(k * (e.deltaY < 0 ? 1.08 : 1 / 1.08)); }, { passive: false });

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
  world.style.transition = ""; // cancel any in-flight eased view change so dragging stays snappy
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
  // Clear button: enabled + glowing only when something is selected
  const clearFab = document.getElementById("fab-clear");
  if (clearFab) { clearFab.disabled = selected.size === 0; clearFab.classList.toggle("armed", selected.size > 0); }
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
document.getElementById("zoom-in").onclick = () => animateView(() => zoomTo(k * 1.2));
document.getElementById("zoom-out").onclick = () => animateView(() => zoomTo(k / 1.2));
document.getElementById("fit").onclick = () => animateView(fit);
document.getElementById("center").onclick = () => animateView(center);
document.getElementById("reset").onclick = () => animateView(reset);
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
  document.getElementById("info-mode").textContent = COMMENTS ? "feedback loop on · comments.db (local)" : "view only · static build";
  if (!COMMENTS) { // deployed/static: view-only — no comment tools, and NEW signifiers are irrelevant to the team view
    document.body.classList.add("view-only");
    document.getElementById("tool-fabs")?.remove();
    document.getElementById("viewonly-flag").hidden = false;
  }
  renderNodes();
  renderLegend();
  if (COMMENTS) setupCommentsPanel(); // searchable/filterable comments index (local only)
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
