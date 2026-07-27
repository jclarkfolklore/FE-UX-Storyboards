<div align="center">

# 🎮 Multiplayer UX — Flow Storyboards

**A design spike for the `rock-em-sock-em` multiplayer experience.**
Theme-agnostic wireframes on an infinite canvas — pan, zoom, and follow the flow between every screen.

[**▶ Live (view-only)**](https://rock-em-m-ux-storyboards.netlify.app) · [**Repo**](https://github.com/jclarkfolklore/rock-em-sock-em_M-UI-IX)

`design spike` · `wireframes` · `theme-agnostic` · `netlify` · `zero-dependency`

</div>

---

## 🎯 What this is

The multiplayer **server-side** is fully specced (plan `conductor/planning/multiplayer/`, tracks 009–017) and the **netcode** is proven (spike 008, archived). What was missing: the **experience** — lobby, invite, ready-up, in-fight connection feedback, result, rematch, leaderboard, the diagnostics drawer.

This spike **designs the flow first**, as reviewable wireframes, so the UX is agreed *before* any UI is built. Like spike 008, the agreed findings **fold back into the multiplayer plan + tracks**.

> **Registered** as a Phase-0 plan ticket (`tasks.md`, ref `multiplayer-ux-storyboards`).

---

## 🗺️ The flow (16 frames)

```
        ┌─ Local 2P            ┌─ Diagnostics drawer (page)
        │                      │
Home → Mode Select → Create/Invite → Lobby → Select → Stage → Fight → Result → Leaderboard
  (real /)   (NEW)   │  Join by link │        │        │       │        └→ Rematch ─┘
                     └  Automatch ───┘     (/select) (/stage) (/play)   └─ Connection states
```

- **Starts at the real home** (`/`, unchanged) → **Mode Select is a NEW step after it** (Local 2P · Online · vs Computer).
- Reuses the actual screens — **`/select`**, **`/stage`**, **`/play`** — drawn to their **true composition** (character grid, stage grids, top HUD bar with P1-left / P2-right).
- **`NEW` badges** mark multiplayer-added screens; existing screens are unmarked.

---

## ✨ Design principles

| Principle | Why |
|---|---|
| **True proportions** | Every game screen is a **16:9 window**; a **whole-page** frame is used for anything *outside* it (the diagnostics drawer). Grounded in the real layouts, not guessed. |
| **Low-fidelity, theme-agnostic** | Flow + layout only — visual design is layered on later (theme is per-player). |
| **Wireframes are semantic HTML** | `stage → 16:9 window`, `wf-btn → button`, `wf-input → input` — so **real DOM is discernible directly** from the markup. |
| **Semantic color + a Key** | Grayscale base; color only *organizes* detail (you·host / opponent·remote / action / waiting / error / network). |
| **Zero dependencies** | A plain Node server — trivial to run, nothing between the wireframe and the component it implies. |

---

## 🚀 Run it

### Local — feedback loop **ON**
```bash
cd conductor/spikes/multiplayer-ux-storyboards
npm start          # node server.mjs → http://localhost:4321
```

**Canvas** — drag to pan · scroll to zoom · **Fit** · **Key** (hover a color to make matching elements glow) · **Select** mode (click anywhere on a card).

**Comments** *(local only)*:
- 💬 per-card threads · **multi-select** cards (yellow glow) → **one comment on the whole selection** · the bottom bar defaults to a **whole-board** note when nothing is selected.
- Explicit **Save** · **append-only, recoverable** history (nothing is destroyed) · persisted to **SQLite** (`comments.db`, built-in `node:sqlite`).
- Text is selectable *within* a card; the canvas isn't, so a drag never smears a highlight across cards.

### Deployed — **view-only**
The Netlify build publishes only `public/`. With no comment server, the app **hides the comment feature** — a clean, read-only presentation for the team.

---

## 🌐 Deploy (Netlify · manual · only when asked)

Once the design is resolved, a static deploy is all the web needs. **Deploy only on explicit request** — not after every change:

```bash
cd conductor/spikes/multiplayer-ux-storyboards
npx netlify-cli deploy --prod --dir=public
# → https://rock-em-m-ux-storyboards.netlify.app
```

| | |
|---|---|
| **Site** | `rock-em-m-ux-storyboards` |
| **Account** | `jclark@folklore.digital` |
| **Config** | `netlify.toml` (publish `public/`, no build) |
| **Auth** | `npx netlify-cli login` if needed |

---

## 📌 Status

**Open** — awaiting review of the flow. On conclusion, the agreed decisions fold into `conductor/planning/multiplayer/` (mode framework/017, lobby/012, connection feedback/011.9 · 011.13, leaderboard/015, identity/010, and the *For design / UX* sections), and the spike is concluded via `/spike conclude`.

## 🔗 References

- [`conductor/planning/multiplayer/`](../../planning/multiplayer/) — the plan this feeds
- [`conductor/tracks/ARCHIVE/008-netcode-feasibility_20260723/`](../../tracks/ARCHIVE/) — the netcode spike this integrates with
