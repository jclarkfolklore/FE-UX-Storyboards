// Zero-dependency LOCAL viewer + comment server for the UX storyboards spike.
//   node server.mjs   → http://localhost:4321   (comment feedback loop ON)
//
// This server exists ONLY for local review (the Claude↔user feedback loop). The
// DEPLOYED build is static + view-only (Netlify publishes ./public; with no /api
// the client hides the comment feature entirely).
//
// Comments persist in a local SQLite file (comments.db) via Node's built-in
// `node:sqlite` — recoverable by design: every save APPENDS a row; "clearing"
// (after feedback is addressed) moves the live rows into an archived batch;
// "recover" pulls the most recent archived batch back. Nothing is deleted.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC = join(HERE, "public");
const PORT = process.env.PORT ? Number(process.env.PORT) : 4321;

const db = new DatabaseSync(join(HERE, "comments.db"));
db.exec(`CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  field TEXT NOT NULL,
  text  TEXT NOT NULL,
  ts    INTEGER NOT NULL,
  batch INTEGER NOT NULL DEFAULT 0   -- 0 = live thread; >0 = archived batch id
);`);
const qAll = db.prepare("SELECT field, text, ts, batch FROM notes ORDER BY ts ASC");
const qField = db.prepare("SELECT text, ts, batch FROM notes WHERE field=? ORDER BY ts ASC");
const qInsert = db.prepare("INSERT INTO notes (field, text, ts, batch) VALUES (?,?,?,0)");
const qMaxBatch = db.prepare("SELECT COALESCE(MAX(batch),0) AS m FROM notes WHERE field=?");
const qArchiveLive = db.prepare("UPDATE notes SET batch=? WHERE field=? AND batch=0");
const qMaxArch = db.prepare("SELECT COALESCE(MAX(batch),0) AS m FROM notes WHERE field=? AND batch>0");
const qUnarchive = db.prepare("UPDATE notes SET batch=0 WHERE field=? AND batch=?");
const qDistinctFields = db.prepare("SELECT DISTINCT field FROM notes");

function shapeRows(rows) {
  const entries = [];
  const batches = new Map();
  for (const r of rows) {
    if (r.batch === 0) entries.push({ text: r.text, ts: r.ts });
    else {
      if (!batches.has(r.batch)) batches.set(r.batch, { ts: r.ts, entries: [] });
      batches.get(r.batch).entries.push({ text: r.text, ts: r.ts });
    }
  }
  const archived = [...batches.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  return { entries, archived };
}
const fieldStore = (field) => shapeRows(qField.all(field));
function fullStore() {
  const byField = {};
  for (const r of qAll.all()) (byField[r.field] ||= []).push(r);
  const fields = {};
  for (const [f, rows] of Object.entries(byField)) fields[f] = shapeRows(rows);
  return { fields };
}

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": MIME[".json"], "Cache-Control": "no-cache" }); res.end(JSON.stringify(obj)); };
const readBody = (req) => new Promise((resolve) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); } }); });

const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;

  if (path === "/api/feedback" && req.method === "GET") return json(res, 200, fullStore());
  if (path === "/api/feedback" && req.method === "POST") {
    const { id, text } = await readBody(req);
    if (!id || typeof text !== "string" || !text.trim()) return json(res, 400, { error: "id + non-empty text required" });
    qInsert.run(id, text.trim(), Date.now());
    return json(res, 200, fieldStore(id));
  }
  if (path === "/api/feedback/clear" && req.method === "POST") {
    const { id } = await readBody(req);
    const ids = id ? [id] : qDistinctFields.all().map((r) => r.field);
    for (const f of ids) { const next = qMaxBatch.get(f).m + 1; qArchiveLive.run(next, f); }
    return json(res, 200, { cleared: ids });
  }
  if (path === "/api/feedback/recover" && req.method === "POST") {
    const { id } = await readBody(req);
    const m = qMaxArch.get(id).m;
    if (m > 0) qUnarchive.run(id, m);
    return json(res, 200, fieldStore(id));
  }

  // static
  let rel = decodeURIComponent(path);
  if (rel === "/") rel = "/index.html";
  const file = normalize(join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) { res.writeHead(400).end("bad path"); return; }
  try {
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  } catch { res.writeHead(404).end("not found"); }
});

server.listen(PORT, () => console.log(`\n  Multiplayer UX storyboards → http://localhost:${PORT}\n  Comments persist in comments.db (SQLite, recoverable). Deployed build is view-only.\n`));
