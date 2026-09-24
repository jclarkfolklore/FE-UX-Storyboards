# HTTP API

`server.mjs` serves `public/` and the endpoints below, on `http://localhost:4321` by default
(`PORT` and `HOST` change that). Bodies are JSON. There's no authentication, which is why the server
listens only on localhost unless you set `HOST`.

A **target** (`id` in request bodies) is a card id (`"lobby"`), `"__overall"` for the whole board,
or `"sel:<id>+<id>…"` for a group of cards.

| Method & path | Body | Returns |
|---|---|---|
| `GET /api/frames` | — | `{ title, frames: [{ id, title, tag, route, type, col, lane, desc }], links: [{ from, to, label }] }`. `desc` is plain text. This reads `public/frames.js` fresh on every call. |
| `GET /api/feedback` | — | `{ fields: { <target>: { entries: [{ text, ts }], archived: [{ ts, entries: [...] }] } } }` |
| `POST /api/feedback` | `{ id, text }` | Adds a live comment. Returns that target's `{ entries, archived }`. Returns `400` if `id` or `text` is missing. |
| `POST /api/feedback/clear` | `{ id? }` | Archives the live comments of `id`, or of every target if `id` is omitted. Returns `{ cleared: [ids] }`. |
| `POST /api/feedback/recover` | `{ id }` | Moves the most recent archived batch of `id` back to live. Returns `{ entries, archived }`. |

`ts` is epoch milliseconds.

## Examples

```bash
# What's on the board?
curl -s localhost:4321/api/frames

# What feedback is waiting?
curl -s localhost:4321/api/feedback

# Reply on a card
curl -s -X POST localhost:4321/api/feedback \
  -H 'Content-Type: application/json' \
  -d '{"id":"lobby","text":"Moved Ready below the pickers."}'

# Mark everything addressed
curl -s -X POST localhost:4321/api/feedback/clear -H 'Content-Type: application/json' -d '{}'
```

## MCP

`mcp.mjs` exposes the same operations as MCP tools (`list_frames`, `get_feedback`, `add_comment`,
`archive_feedback`, `recover_feedback`) over stdio, and forwards each call to the API above at
`STORYBOARDS_URL` (default `http://localhost:4321`). See [USING-WITH-AI.md](USING-WITH-AI.md).
