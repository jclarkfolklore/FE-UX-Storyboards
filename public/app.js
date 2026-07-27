import { FRAMES, LINKS } from "./frames.js";

const world = document.getElementById("world");
const viewport = document.getElementById("viewport");
const edges = document.getElementById("edges");

// ---------------- comment API ----------------
let STORE = { fields: {} };
async function loadStore() {
  try {
    STORE = await (await fetch("/api/feedback")).json();
  } catch {
    STORE = { fields: {} };
  }
}
async function saveComment(id, text) {
  const r = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, text }),
  });
  STORE.fields[id] = await r.json();
  renderThread(id);
}
async function recoverComment(id) {
  const r = await fetch("/api/feedback/recover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  STORE.fields[id] = await r.json();
  renderThread(id);
}
const fmtTime = (ts) => new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function renderThread(id) {
  const wrap = document.querySelector(`[data-thread="${id}"]`);
  if (!wrap) return;
  const f = STORE.fields[id] || { entries: [], archived: [] };
  const entries = f.entries || [];
  const archived = f.archived || [];
  const toggle = wrap.closest(".wf-comments")?.querySelector(".wf-comments-toggle .count");
  if (toggle) toggle.textContent = entries.length ? `(${entries.length})` : "";
  wrap.innerHTML =
    (entries.length
      ? entries.map((e) => `<div class="wf-entry"><span class="wf-entry-t">${fmtTime(e.ts)}</span>${escapeHtml(e.text)}</div>`).join("")
      : `<div class="wf-entry wf-empty">no comments yet</div>`) +
    (archived.length
      ? `<button class="wf-recover" data-recover="${id}">⤺ recover ${archived.length} archived batch${archived.length > 1 ? "es" : ""}</button>`
      : "");
}
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// ---------------- render nodes ----------------
function commentBlock(id) {
  return `<div class="wf-comments" data-comments="${id}">
    <button class="wf-comments-toggle">💬 comments <span class="count"></span> <span class="chev">▸</span></button>
    <div class="wf-comments-body">
      <div class="wf-thread" data-thread="${id}"></div>
      <textarea class="wf-ta" data-ta="${id}" placeholder="leave a comment on this view…"></textarea>
      <div class="wf-comment-actions"><button class="wf-save" data-save="${id}">Save</button></div>
    </div>
  </div>`;
}
function renderNodes() {
  for (const fr of FRAMES) {
    const el = document.createElement("div");
    el.className = "node";
    el.id = `node-${fr.id}`;
    el.style.left = fr.x + "px";
    el.style.top = fr.y + "px";
    el.style.width = fr.w + "px";
    el.innerHTML = `
      <div class="node-head"><span class="node-title">${fr.title}</span><span class="node-tag">${fr.tag}</span></div>
      <div class="node-wire">${fr.wire}</div>
      <div class="node-desc">${fr.desc}</div>
      ${commentBlock(fr.id)}`;
    world.appendChild(el);
  }
}

// ---------------- flow arrows (SVG in world space) ----------------
function drawEdges() {
  edges.innerHTML = `<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
    <path d="M0,0 L8,3 L0,6 Z" fill="var(--edge)"/></marker></defs>`;
  let maxX = 0, maxY = 0;
  const rect = (id) => {
    const n = document.getElementById(`node-${id}`);
    return { x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight };
  };
  for (const link of LINKS) {
    const a = rect(link.from), b = rect(link.to);
    maxX = Math.max(maxX, a.x + a.w, b.x + b.w);
    maxY = Math.max(maxY, a.y + a.h, b.y + b.h);
    // connect from a's right-center to b's left-center (fallback to nearest sides)
    let x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2;
    if (b.x < a.x) { x1 = a.x; x2 = b.x + b.w; } // b is to the left → exit left, enter right
    const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
    const c1 = x1 + (x2 >= x1 ? dx : -dx), c2 = x2 + (x2 >= x1 ? -dx : dx);
    const path = `M ${x1},${y1} C ${c1},${y1} ${c2},${y2} ${x2},${y2}`;
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", path);
    p.setAttribute("class", "edge");
    p.setAttribute("marker-end", "url(#arrow)");
    edges.appendChild(p);
    if (link.label) {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", (x1 + x2) / 2);
      t.setAttribute("y", (y1 + y2) / 2 - 6);
      t.setAttribute("class", "edge-label");
      t.setAttribute("text-anchor", "middle");
      t.textContent = link.label;
      edges.appendChild(t);
    }
  }
  edges.setAttribute("width", maxX + 200);
  edges.setAttribute("height", maxY + 200);
}

// ---------------- pan / zoom ----------------
let tx = 60, ty = 40, k = 0.7;
function apply() {
  world.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
}
function fit() {
  // fit all nodes into the viewport
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const fr of FRAMES) {
    const n = document.getElementById(`node-${fr.id}`);
    minX = Math.min(minX, n.offsetLeft);
    minY = Math.min(minY, n.offsetTop);
    maxX = Math.max(maxX, n.offsetLeft + n.offsetWidth);
    maxY = Math.max(maxY, n.offsetTop + n.offsetHeight);
  }
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  const pad = 80;
  k = Math.min((vw - pad * 2) / (maxX - minX), (vh - pad * 2) / (maxY - minY), 1);
  tx = pad - minX * k + (vw - pad * 2 - (maxX - minX) * k) / 2;
  ty = pad - minY * k;
  apply();
}
viewport.addEventListener("wheel", (e) => {
  e.preventDefault();
  const rect = viewport.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const wx = (mx - tx) / k, wy = (my - ty) / k;
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  k = Math.min(2.5, Math.max(0.15, k * factor));
  tx = mx - wx * k;
  ty = my - wy * k;
  apply();
}, { passive: false });

let panning = false, sx = 0, sy = 0;
viewport.addEventListener("mousedown", (e) => {
  if (e.target.closest(".node")) return; // let nodes handle their own interactions
  panning = true;
  sx = e.clientX - tx;
  sy = e.clientY - ty;
  viewport.classList.add("grabbing");
});
window.addEventListener("mousemove", (e) => {
  if (!panning) return;
  tx = e.clientX - sx;
  ty = e.clientY - sy;
  apply();
});
window.addEventListener("mouseup", () => {
  panning = false;
  viewport.classList.remove("grabbing");
});

// ---------------- events (comments + toolbar) ----------------
document.addEventListener("click", (e) => {
  const save = e.target.closest("[data-save]");
  if (save) {
    const id = save.dataset.save;
    const ta = document.querySelector(`[data-ta="${id}"]`);
    if (ta && ta.value.trim()) {
      saveComment(id, ta.value);
      ta.value = "";
    }
    return;
  }
  const rec = e.target.closest("[data-recover]");
  if (rec) return recoverComment(rec.dataset.recover);
  const toggle = e.target.closest(".wf-comments-toggle");
  if (toggle) {
    toggle.closest(".wf-comments").classList.toggle("open");
    return;
  }
});
document.getElementById("zoom-in").onclick = () => { k = Math.min(2.5, k * 1.2); apply(); };
document.getElementById("zoom-out").onclick = () => { k = Math.max(0.15, k / 1.2); apply(); };
document.getElementById("fit").onclick = fit;
document.getElementById("overall-toggle").onclick = () => document.getElementById("overall").classList.toggle("open");

// ---------------- boot ----------------
(async function boot() {
  await loadStore();
  renderNodes();
  // overall-comments panel wires to the same API under id "__overall"
  document.querySelector("#overall .wf-thread")?.setAttribute("data-thread", "__overall");
  drawEdges();
  for (const fr of FRAMES) renderThread(fr.id);
  renderThread("__overall");
  requestAnimationFrame(fit);
})();
