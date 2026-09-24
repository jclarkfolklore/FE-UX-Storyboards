# How it works

FE-UX-Storyboards has three parts. They share one HTTP API and one board file.

```
                    ┌────────────────── public/ (static) ───────────────────┐
 browser  ────────▶ │ index.html · styles.css · app.js  ◀── imports ── frames.js │
                    └───────────────────────────────────────────────────────┘
                              │ fetch /api/*                        ▲ imports
                              ▼                                     │
 server.mjs  (node:http + node:sqlite) ── comments.db       /api/frames
                              ▲
                              │ HTTP (same API)
 mcp.mjs  (stdio JSON-RPC) ◀──── Claude Desktop / Claude Code / any MCP client
```

- **`public/`** is the whole app, and it's static. `app.js` imports the board from `frames.js`,
  lays it out and draws it.
- **`server.mjs`** serves `public/` and adds the comment API, stored in `comments.db`. It's only
  needed for commenting. Without it the page is view-only.
- **`mcp.mjs`** is a thin adapter that exposes that same API as MCP tools. It keeps no state of its
  own.

## The board: `public/frames.js`

Everything on the canvas comes from four exports.

### `BOARD`: the title and brief

```js
export const BOARD = {
  title: "Checkout — Flow Storyboards",       // top bar + browser tab
  eyebrow: "Design review · what we're deciding",
  meta: "wireframes · low-fi",                // small print at the bottom of the brief
  info: `<h2>…</h2><p class="modal-lede">…</p>`, // HTML shown by "What is this?"
};
```

`info` can use the brief's own classes: `modal-lede`, `modal-cols` / `modal-sec`, `modal-crit-h`,
`modal-crit` (a bulleted list) and `modal-foot`.

### `FRAMES`: the cards

```js
{
  id: "cart",                  // stable id — comments are keyed by it, so don't rename casually
  title: "2 · Cart",           // card heading
  tag: "/cart",                // small label beside the title
  route: "/cart",              // shown in the wireframe's address bar
  type: "stage",               // "stage" = the app's viewport · "page" = the whole browser page
  col: 1,                      // left→right step in the flow (0, 1, 2 …)
  lane: 1,                     // 0 = top branch · 1 = main spine · 2 = bottom branch
  w: 380,                      // card width in px
  desc: "What this screen does and why. <b>HTML allowed.</b>",
  wire: stage("/cart", col(box("Line items"), row(btn("Checkout", "s-act")))),
}
```

**Layout is automatic.** Cards sit on a grid of **columns** (steps in the flow) and **lanes** (the
main path in the middle, with branches above and below). `app.js` measures each card and spaces the
columns and lanes so nothing overlaps. You never set pixel positions.

**`wire` is HTML**, built with small helper functions defined at the top of `frames.js`:

| Helper | Draws |
|---|---|
| `stage(route, body)` | A 16:9 app window with an address bar |
| `page(route, inner)` / `gameWindow(body)` | A whole browser page, for things outside the app window, with the app window inside it |
| `row(...)` / `col(...)` / `grid(n, cells)` / `cell(t)` | Layout |
| `box(t)` · `btn(t)` · `inp(t)` · `pill(t)` · `av(t)` · `note(t)` | Wireframe elements: a block, a button, an input, a chip, an avatar and a caption |

Every helper takes an optional class as its last argument. The wireframe is **greyscale**, and colour
is used only to **organise meaning**, through these semantic classes (explained in the Key):

| Class | Means (in the example) |
|---|---|
| `s-act` | Primary action or navigation |
| `s-you` | You, the local viewer |
| `s-opp` | The other party (remote) |
| `s-wait` | Waiting, pending or degraded |
| `s-err` | An error or disconnect |
| `s-net` | Network, data or metrics |

These names suit a multiplayer flow. For your own board, reuse them with your own meanings: edit the
labels in `LEGEND` and the colours in `styles.css`.

### `LINKS`: the arrows

```js
{ from: "cart", to: "payment", label: "Checkout" }
```

Arrows are drawn at right angles through the gaps between cards. An arrow that points left (to an
earlier step, such as "rematch → select") is a loop back: it lights cyan on hover, and forward
arrows light magenta.

### `LEGEND`: the Key panel

`LEGEND.color` lists `[class, label, explanation]` for each semantic colour. `LEGEND.frame` explains
the two card types.

## Make your own board

1. Fork or clone the repo, then run `npm start`.
2. In `public/frames.js`, set `BOARD` to your project's title and brief. Replace `FRAMES` and `LINKS`
   with your screens and transitions, and keep the helper functions at the top.
3. Reload the page. There's no build step and no restart.
4. Update `LEGEND`, and optionally the `s-*` colours in `styles.css`, to match what colour means on
   your board.
5. Delete `SPEC.md` and `reviews/`. They belong to the example.

**Or let your AI do it.** Point it at this repo and describe your flow (see the
[prompts](USING-WITH-AI.md#prompts-you-can-copy)). `frames.js` is plain data plus HTML strings, which
is easy for a model to write.

**Tip:** comments are keyed by card `id`. Keep ids stable once people have started commenting.
Renaming an id orphans its thread. The notes stay in the database but no longer show on a card.

## Comments: the storage model

`server.mjs` keeps a single SQLite table in `comments.db`:

| Column | Meaning |
|---|---|
| `field` | What the note targets: a card id (`"cart"`), a group (`"sel:cart+payment"`) or the whole board (`"__overall"`) |
| `text`, `ts` | The note and when it was written (epoch ms) |
| `batch` | `0` means **live**. A value above `0` is an **archived batch** |

- **Saving** always inserts a new row. Nothing is ever edited in place.
- **Clearing** (archiving) moves a target's live rows into the next batch number for that target.
- **Recovering** moves a target's most recent archived batch back to live.
- Nothing is ever deleted. To start completely fresh, stop the server and delete `comments.db`.

## View-only mode

On load, `app.js` requests `GET /api/feedback`. If that fails, which happens on any static host, it
removes the comment tools and shows a **VIEW ONLY** flag. That's why the same `public/` folder works
both as a review tool on your own machine and as a read-only site to share with a team.
