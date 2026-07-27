# Spike: multiplayer UX storyboards

**Status:** open · **Opened:** 2026-07-27 · **Concluded:** —
**Remote:** https://github.com/jclarkfolklore/rock-em-sock-em_M-UI-IX

## Question

What should the multiplayer UI/UX **flow** be? Explore it as **theme-agnostic HTML wireframe storyboards** on a pannable/zoomable canvas (like a diagram tool), with an in-app **comment/feedback loop**, built to double as a **team presentation** — so the flow is agreed *before* any UI is built.

## Context

The multiplayer server-side is specced in detail (plan `conductor/planning/multiplayer/`, tracks 009–017) and the netcode is proven (spike 008, archived). But the **experience** — lobby, invite, ready-up, in-fight connection feedback, result, rematch, leaderboard, the diagnostics drawer — has no agreed shape. Building UI straight from ticket prose would bake in unreviewed UX. This spike designs the flow first. It is registered as a plan ticket (`tasks.md` → Phase 0, ref `multiplayer-ux-storyboards`); like spike 008, its agreed findings will be **folded back into the plan + docs and decomposed into the existing tracks**.

Design constraints honored:
- **Theme-agnostic, low-fidelity.** Wireframes are for **flow + layout**, not visual design (theme is per-player and layered on later — architecture invariant).
- **Wireframes are semantic HTML**, so **real DOM is discernible directly from them** — `stage → the fixed 16:9 game-stage window`, `wf-btn → button`, `wf-input → input`, `wf-row/col → layout`. Translating to real components at the end is a read, not a reinterpretation.
- **Fixed 16:9 stage window** — every screen lives inside one stage-sized window (project invariant).

## The app (how to run / present)

```bash
cd conductor/spikes/multiplayer-ux-storyboards
npm start          # zero-dependency: node server.mjs → http://localhost:4321
```

- **Infinite canvas** — drag to pan, scroll to zoom, **Fit** to frame everything. Each screen is a card; **flow arrows** connect them (labelled transitions) so the whole journey reads at a glance.
- **Comment loop** — every card has a collapsible 💬 comments thread + an **Overall notes** panel. Each field is an **append-only array of entries** (explicit **Save** per field), persisted server-side to `feedback.json` — so it survives reloads, and **nothing is destroyed**: a batch that's been addressed is *archived* (recoverable via ⤺), not deleted. Claude reads `feedback.json` to see feedback, revises the wireframes, then archives the addressed batch so fresh notes can be written on the new version.
- **Zero dependencies** — a plain Node server; trivial for the team to run, and keeps the wireframes readable as DOM (no framework abstraction between the wireframe and the component it implies).

## Flow covered (14 frames)

mode select (three modes) → name/identity → online home → create + invite link → join by link (new player) → automatch/waiting → lobby (see each other, pick fighters + shared stage, ready) → the fight (connection chip + left-edge diagnostics rail) → diagnostics drawer (expanded; not themed) → connection states (unstable / reconnecting / left) → result → rematch → leaderboard (with the **accurate storage-tier indicator** — durable / sqlite / server-cache). Plus the vs-Computer branch.

## Research / iteration log

- 2026-07-27: v1 canvas viewer + 14 wireframes + comment loop built and pushed. Awaiting review comments in-app.

## Finding

_Not yet concluded — pending review of the flow. On conclusion: the agreed flow decisions get folded into `conductor/planning/multiplayer/` (mode framework, lobby 012, connection feedback 011.9/011.13, leaderboard 015, identity 010, and the `For design / UX` sections) and this spike is concluded via `/spike conclude`._

## References

- `conductor/planning/multiplayer/` — the plan this feeds (scope, approach, clarification, tasks)
- `conductor/tracks/ARCHIVE/008-netcode-feasibility_20260723/` — the netcode spike whose findings this integrates with
- Remote: https://github.com/jclarkfolklore/rock-em-sock-em_M-UI-IX
