# Spike: multiplayer UX storyboards

**Status:** open · **Opened:** 2026-07-27 · **Concluded:** —
**Live (view-only):** https://rock-em-m-ux-storyboards.netlify.app
**Remote:** https://github.com/jclarkfolklore/rock-em-sock-em_M-UI-IX

## Question

What should the multiplayer UI/UX **flow** be? Explore it as **theme-agnostic HTML wireframe storyboards** on a pannable/zoomable canvas (like a diagram tool), with a local **comment/feedback loop**, deployed **view-only** as a **team presentation** — so the flow is agreed *before* any UI is built.

## Context

The multiplayer server-side is specced (plan `conductor/planning/multiplayer/`, tracks 009–017) and the netcode is proven (spike 008, archived). The **experience** wasn't designed. This spike designs the flow first. Registered as a plan ticket (`tasks.md` → Phase 0, ref `multiplayer-ux-storyboards`); like spike 008, its agreed findings will **fold back into the plan + docs and decompose into the existing tracks**.

Grounded in the **real app** (`/` landing → `/select` → `/stage` → `/play` → results, all React HUD inside a fixed 16:9 arena window; settings openable anywhere):
- **Starts at the actual home screen** (unchanged). **Mode Select is a NEW step *after* home** — today "Choose fighters" goes straight to local select; multiplayer forks it into Local 2P / Online / vs Computer.
- **True 16:9 game-window proportions.** Screens render as the fixed stage window; a **whole-page** frame is used for elements that live *outside* it (the diagnostics drawer).
- **Theme-agnostic, low-fi** (flow + layout, not visual design), and **wireframes are semantic HTML** so real DOM is discernible directly (`stage → 16:9 window`, `wf-btn → button`, `wf-input → input`).
- **Semantic color** organizes detail (you/host · opponent/remote · action · waiting · error · network) with a **Key/legend**; `NEW` badges mark multiplayer-added screens.

## The app

**Local (feedback loop ON):**
```bash
cd conductor/spikes/multiplayer-ux-storyboards
npm start          # zero-dependency: node server.mjs → http://localhost:4321
```
- **Infinite canvas** — drag to pan, scroll to zoom, **Fit**, **Key** legend.
- **Comments (local only):** every card has a 💬 thread; **multi-select** cards by clicking their headers (yellow glow) and leave **one comment on the whole selection**; **Overall notes** for board-level comments. Explicit **Save** per field; **append-only history**, recoverable (⤺) — nothing is destroyed. Persisted to **SQLite** (`comments.db`, Node's built-in `node:sqlite`, zero-dep). Claude reads `comments.db` to see feedback, revises, then archives the addressed batch.
- **Text-selection nuance:** you can drag-highlight *within* a card's text; the canvas itself isn't selectable, so a drag never smears a highlight across cards.

**Deployed (view-only):** the Netlify build publishes only `public/` (static). With no comment server the app **hides the comment/notes feature entirely** — it's a read-only presentation of the wireframes.

## Deploy (Netlify — manual, via CLI, only when asked)

Once the design is resolved a static deploy is all the web needs. **Deploy only when explicitly asked** (not after every change), through the CLI:
```bash
cd conductor/spikes/multiplayer-ux-storyboards
npx netlify-cli deploy --prod --dir=public       # → https://rock-em-m-ux-storyboards.netlify.app
```
Site: `rock-em-m-ux-storyboards` (Netlify account `jclark@folklore.digital`). Config in `netlify.toml` (publish `public/`, no build). Auth: `npx netlify-cli login` if needed. First deploy: 2026-07-27.

## Flow covered (16 frames)

home (real `/`) → **mode select (new)** → [Local 2P · vs Computer branches] → name/identity → create + invite link → join by link (new player) → automatch/waiting → lobby (see each other, pick fighters + shared stage, ready) → `/select` → `/stage` → the fight (`/play`: connection chip + left-edge diagnostics rail) → diagnostics drawer (whole-page; outside the window; not themed) → connection states (unstable / reconnecting / left) → result → rematch → leaderboard (accurate storage-tier indicator).

## Research / iteration log

- 2026-07-27: canvas viewer built; reworked to start from the real home + mode-select, grid auto-layout (no overlap), semantic color + legend, whole-page vs game-window frames, multi-select + selection comments, SQLite local persistence. Deployed view-only to Netlify. Awaiting review comments.

## Finding

_Not yet concluded — pending review of the flow. On conclusion the agreed decisions fold into `conductor/planning/multiplayer/` (mode framework/017, lobby/012, connection feedback/011.9/011.13, leaderboard/015, identity/010, and the `For design / UX` sections) and this spike is concluded via `/spike conclude`._

## References

- `conductor/planning/multiplayer/` — the plan this feeds
- `conductor/tracks/ARCHIVE/008-netcode-feasibility_20260723/` — the netcode spike whose findings this integrates with
- Live (view-only): https://rock-em-m-ux-storyboards.netlify.app · Remote: https://github.com/jclarkfolklore/rock-em-sock-em_M-UI-IX
