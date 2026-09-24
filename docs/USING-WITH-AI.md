# Using it with AI

The idea: **people review, and the AI does the edits.** Reviewers leave comments on the board. An AI
assistant reads them, changes the board, replies to explain what it did, and archives the batch so
the next round starts clean.

```
 you ── comment ──▶ board ── get_feedback ──▶ AI
  ▲                                            │ edits public/frames.js
  └──── reload & review ◀── add_comment / archive_feedback
```

There are three ways to connect an AI. Pick whichever matches your setup. All of them need the
storyboard server running:

```bash
cd FE-UX-Storyboards
npm start            # → http://localhost:4321
```

---

## 1. Claude Desktop (MCP)

This gives Claude Desktop five tools: `list_frames`, `get_feedback`, `add_comment`,
`archive_feedback` and `recover_feedback`.

1. Find the absolute path to `mcp.mjs`. From the repo folder, run: `echo "$PWD/mcp.mjs"`
2. In Claude Desktop, open **Settings → Developer → Edit Config**. That opens
   `claude_desktop_config.json`:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
3. Add the server. If the file already has `mcpServers`, add this entry inside it:

   ```json
   {
     "mcpServers": {
       "fe-ux-storyboards": {
         "command": "node",
         "args": ["/absolute/path/to/FE-UX-Storyboards/mcp.mjs"],
         "env": { "STORYBOARDS_URL": "http://localhost:4321" }
       }
     }
   }
   ```

4. Quit and reopen Claude Desktop. **fe-ux-storyboards** should now appear under the tools (🔨 / "Search
   and tools") menu.
5. Try it: *"Use fe-ux-storyboards to show me what feedback is waiting on the board."*

**Editing the board from Claude Desktop.** The MCP tools cover comments and reading the board, but
changing `public/frames.js` means writing a file. Either add a filesystem MCP server scoped to the
repo folder, or read the feedback in Claude Desktop and do the edits in Claude Code (below).

## 2. Claude Code (MCP + file editing)

Claude Code can both use the tools and edit `frames.js`, so it can run the whole loop.

```bash
cd FE-UX-Storyboards
claude mcp add fe-ux-storyboards -e STORYBOARDS_URL=http://localhost:4321 -- node "$PWD/mcp.mjs"
claude
```

Then: *"Read the storyboard feedback, make the changes in public/frames.js, reply on each card with
what you changed, then archive the batch."*

If you'd rather not use MCP, Claude Code can call the HTTP API with `curl` directly (see
[API.md](API.md)).

## 3. Claude in Chrome, or any AI with a browser

Open `http://localhost:4321` in the browser the AI controls, and it can see the board like a person
would. It can also open these directly:

- `http://localhost:4321/api/frames`: every card's id, title and description as JSON
- `http://localhost:4321/api/feedback`: every comment as JSON

That's enough for an AI to **review** the flow and **leave comments** through the page. To change
the board, it still needs to edit `frames.js`, so pair it with a coding tool (option 2).

## Other MCP clients

`mcp.mjs` is a standard stdio MCP server, so the same `command` / `args` / `env` block works in
Cursor, Windsurf, VS Code and other clients. Only the name and location of their config file differ.

---

## The tools

| Tool | Arguments | What it does |
|---|---|---|
| `list_frames` | — | Every card: `id`, `title`, `route`, `type`, `col`/`lane` and a plain-text `desc`, plus all `links`. Call this first to learn the ids. |
| `get_feedback` | `target?`, `include_archived?` | Live comments grouped by target. Add `include_archived: true` to see past batches as well. |
| `add_comment` | `target`, `text` | Leave a note. Use it to reply to feedback or ask a question. |
| `archive_feedback` | `target?` | Mark feedback as addressed. Omit `target` to archive the whole board. |
| `recover_feedback` | `target` | Undo the last archive for a target. |

A **target** is a card id (`"lobby"`), `"__overall"` for the whole board, or `"sel:a+b"` for one
note about a group of cards.

---

## Prompts you can copy

**Work through the feedback**
> Use fe-ux-storyboards to read all live feedback. For each comment, update the relevant card in
> `public/frames.js`. Then reply on that card with `add_comment`, saying in one line what you
> changed. Once every comment has a reply, archive the batch. Leave anything you're unsure about
> unarchived, and ask me about it in a comment.

**Review a flow**
> Call `list_frames`, then review this flow as a UX designer. Look for dead ends, missing
> error/empty/loading states, and steps that could merge. Leave each finding as a comment on the
> card it concerns (or `__overall` for board-level issues). Don't edit anything yet.

**Start a board for my own project**
> This repo is a wireframe storyboard tool. `public/frames.js` holds the board (`BOARD`, `FRAMES`,
> `LINKS`, `LEGEND`), and `docs/HOW-IT-WORKS.md` explains the format. Replace the example board with
> the flow for **[describe your app and the journey]**. Keep the helper functions, use `col` for
> steps and `lane` for branches, and give every card a stable `id`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| A tool replies *"Cannot reach the storyboard server"* | `npm start` isn't running, or it's on another port. Set `STORYBOARDS_URL` to match. |
| The tools don't appear in Claude Desktop | The config path must be **absolute**, and the JSON must be valid. Fully quit and reopen the app. Logs are in `~/Library/Logs/Claude/mcp*.log` on macOS. |
| `node: command not found` from Claude Desktop | Desktop apps may not see your shell's `PATH`. Put the full path to node in `"command"`, for example the output of `which node`. |
| `No such built-in module: node:sqlite` | Node is too old. The server needs **22.13+**. `mcp.mjs` itself only needs Node 18+. |
| Comments don't show on the page | The page is being served statically, so it's view-only. Open it through `npm start` instead. |
| A card lost its comments after an edit | Its `id` changed. Change it back, or accept that the old notes are orphaned. They're still in `comments.db`. |
