#!/usr/bin/env node
// Zero-dependency MCP server (stdio) for FE-UX-Storyboards.
//
// Lets an MCP client — Claude Desktop, Claude Code, Cursor, … — use a running
// storyboard server as a tool: read the board, read and leave comments, and
// archive feedback once it has been addressed. It talks to the same HTTP API the
// browser uses, so the storyboard server must be running (`npm start`).
//
//   STORYBOARDS_URL   where the server is (default http://localhost:4321)
//
// Protocol: newline-delimited JSON-RPC 2.0 on stdin/stdout. stdout carries
// protocol messages ONLY — every log line goes to stderr.

import { createInterface } from "node:readline";

const BASE = (process.env.STORYBOARDS_URL || "http://localhost:4321").replace(/\/$/, "");
const SERVER_INFO = { name: "fe-ux-storyboards", version: "1.0.0" };
const DEFAULT_PROTOCOL = "2025-06-18";

const log = (...a) => console.error("[fe-ux-storyboards]", ...a);

async function api(path, body) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, body === undefined
      ? { cache: "no-store" }
      : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error(`Cannot reach the storyboard server at ${BASE}. Start it with \`npm start\` in the FE-UX-Storyboards folder (or set STORYBOARDS_URL).`);
  }
  const data = await res.json().catch(() => null);
  if (res.status === 404 || data === null) {
    throw new Error(`Something is running at ${BASE}, but it isn't the storyboard server. Check which port \`npm start\` printed and set STORYBOARDS_URL to match.`);
  }
  if (!res.ok) throw new Error(data.error || `${path} → HTTP ${res.status}`);
  return data;
}

const TARGET_HELP = 'A card id from list_frames (e.g. "lobby"), "__overall" for the whole board, or "sel:<id>+<id>" for one note about a group of cards.';

const TOOLS = [
  {
    name: "list_frames",
    description: "List every storyboard card (screen) on the board: its id, title, route, type and a plain-text description, plus the links (arrows) between cards. Call this first to learn the card ids that comments target.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: () => api("/api/frames"),
  },
  {
    name: "get_feedback",
    description: "Read the comments people have left on the board. Returns live (unaddressed) comments and archived batches, grouped by target. Pass `target` to read one card or group only; set `include_archived` to also see past, already-addressed batches.",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: TARGET_HELP },
        include_archived: { type: "boolean", description: "Include archived (already-addressed) batches. Default false." },
      },
      additionalProperties: false,
    },
    run: async ({ target, include_archived = false } = {}) => {
      const { fields } = await api("/api/feedback");
      const out = {};
      for (const [id, v] of Object.entries(fields)) {
        if (target && id !== target) continue;
        const entry = { live: v.entries.map((e) => ({ text: e.text, at: new Date(e.ts).toISOString() })) };
        if (include_archived) entry.archived = v.archived.map((b) => b.entries.map((e) => ({ text: e.text, at: new Date(e.ts).toISOString() })));
        if (entry.live.length || include_archived) out[id] = entry;
      }
      return { server: BASE, targets: out };
    },
  },
  {
    name: "add_comment",
    description: "Leave a comment on a card, a group of cards, or the whole board — e.g. to ask the human a question or to record what you changed. Comments are append-only.",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: TARGET_HELP },
        text: { type: "string", description: "The comment text." },
      },
      required: ["target", "text"],
      additionalProperties: false,
    },
    run: ({ target, text }) => api("/api/feedback", { id: target, text }),
  },
  {
    name: "archive_feedback",
    description: "Mark feedback as addressed: moves the live comments into an archived batch so fresh notes can be left. Nothing is deleted (see recover_feedback). Omit `target` to archive every live comment on the board.",
    inputSchema: {
      type: "object",
      properties: { target: { type: "string", description: `${TARGET_HELP} Omit to archive everything.` } },
      additionalProperties: false,
    },
    run: ({ target } = {}) => api("/api/feedback/clear", target ? { id: target } : {}),
  },
  {
    name: "recover_feedback",
    description: "Undo an archive for one target: brings its most recently archived batch back to live.",
    inputSchema: {
      type: "object",
      properties: { target: { type: "string", description: TARGET_HELP } },
      required: ["target"],
      additionalProperties: false,
    },
    run: ({ target }) => api("/api/feedback/recover", { id: target }),
  },
];

const send = (msg) => process.stdout.write(`${JSON.stringify(msg)}\n`);
const reply = (id, result) => send({ jsonrpc: "2.0", id, result });
const fail = (id, code, message) => send({ jsonrpc: "2.0", id, error: { code, message } });

async function handle(msg) {
  const { id, method, params = {} } = msg;
  const isRequest = id !== undefined && id !== null;
  switch (method) {
    case "initialize":
      return reply(id, {
        protocolVersion: params.protocolVersion || DEFAULT_PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: `Tools for a UX storyboard board served at ${BASE}. Humans leave comments on cards; read them with get_feedback, change the board by editing public/frames.js in the FE-UX-Storyboards repo, reply with add_comment, and archive_feedback once a batch is addressed.`,
      });
    case "ping":
      return reply(id, {});
    case "tools/list":
      return reply(id, { tools: TOOLS.map(({ run, ...t }) => t) });
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === params.name);
      if (!tool) return fail(id, -32602, `Unknown tool: ${params.name}`);
      try {
        const result = await tool.run(params.arguments || {});
        return reply(id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
      } catch (err) {
        return reply(id, { content: [{ type: "text", text: String(err.message || err) }], isError: true });
      }
    }
    default:
      // Notifications (no id) need no answer; unknown requests get method-not-found.
      if (isRequest) return fail(id, -32601, `Method not found: ${method}`);
  }
}

createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return fail(null, -32700, "Parse error"); }
  handle(msg).catch((err) => { log(err); if (msg.id != null) fail(msg.id, -32603, String(err.message || err)); });
});
log(`ready — talking to ${BASE}`);
