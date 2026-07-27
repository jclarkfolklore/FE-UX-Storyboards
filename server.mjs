// Zero-dependency viewer server for the multiplayer UX storyboards spike.
//   node server.mjs        → serves the viewer on http://localhost:4321
// Serves ./public and persists per-field comment threads to ./feedback.json.
//
// Comment model (recoverable by design): each field holds an array of entries
// { text, ts }. Saving APPENDS (never overwrites). "Clearing" (done after
// feedback is addressed) ARCHIVES the current batch into `archived` and resets
// the live thread — so nothing is ever destroyed and a mistake is recoverable.
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC = join(HERE, "public");
const STORE = join(HERE, "feedback.json");
const PORT = process.env.PORT ? Number(process.env.PORT) : 4321;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

async function loadStore() {
  if (!existsSync(STORE)) return { fields: {} };
  try {
    return JSON.parse(await readFile(STORE, "utf8"));
  } catch {
    return { fields: {} };
  }
}
async function saveStore(data) {
  await writeFile(STORE, JSON.stringify(data, null, 2));
}
function field(store, id) {
  if (!store.fields[id]) store.fields[id] = { entries: [], archived: [] };
  return store.fields[id];
}
function readBody(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      try {
        resolve(b ? JSON.parse(b) : {});
      } catch {
        resolve({});
      }
    });
  });
}
const json = (res, code, obj) => {
  res.writeHead(code, { "Content-Type": MIME[".json"], "Cache-Control": "no-cache" });
  res.end(JSON.stringify(obj));
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  // ---- comment API ----
  if (path === "/api/feedback" && req.method === "GET") {
    return json(res, 200, await loadStore());
  }
  if (path === "/api/feedback" && req.method === "POST") {
    const { id, text } = await readBody(req);
    if (!id || typeof text !== "string" || !text.trim()) return json(res, 400, { error: "id + non-empty text required" });
    const store = await loadStore();
    field(store, id).entries.push({ text: text.trim(), ts: Date.now() });
    await saveStore(store);
    return json(res, 200, store.fields[id]);
  }
  // Archive a field's live thread (or all) — recoverable, called after feedback is addressed.
  if (path === "/api/feedback/clear" && req.method === "POST") {
    const { id } = await readBody(req);
    const store = await loadStore();
    const ids = id ? [id] : Object.keys(store.fields);
    for (const fid of ids) {
      const f = field(store, fid);
      if (f.entries.length) {
        f.archived.push({ ts: Date.now(), entries: f.entries });
        f.entries = [];
      }
    }
    await saveStore(store);
    return json(res, 200, { cleared: ids });
  }
  // Recover: pop the most recent archived batch back into the live thread.
  if (path === "/api/feedback/recover" && req.method === "POST") {
    const { id } = await readBody(req);
    const store = await loadStore();
    const f = field(store, id);
    const batch = f.archived.pop();
    if (batch) f.entries = [...batch.entries, ...f.entries];
    await saveStore(store);
    return json(res, 200, store.fields[id]);
  }

  // ---- static ----
  let rel = decodeURIComponent(path);
  if (rel === "/") rel = "/index.html";
  const file = normalize(join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) {
    res.writeHead(400).end("bad path");
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  } catch {
    res.writeHead(404).end("not found");
  }
});

server.listen(PORT, () => {
  console.log(`\n  Multiplayer UX storyboards → http://localhost:${PORT}\n  Comments persist to feedback.json (array history, recoverable).\n`);
});
