# Multiplayer UX — Storyboards Spike Spec

**Spike:** `multiplayer-ux-storyboards`
**Status:** Resolved (pending board alignment) — 2026-07-27
**Owner decisions:** captured in [`reviews/001-decisions.md`](reviews/001-decisions.md)
**First review:** [`reviews/001-ux-flow-and-composition-review.md`](reviews/001-ux-flow-and-composition-review.md)
**Feeds:** `conductor/planning/multiplayer/` (tracks ~009–017)

> **Retroactive note.** This spec was written *after* the storyboards were built and first-reviewed. The spike ran without a spec; this document reconstructs the authoritative intent, folds in the review outcome and the owner's eight decisions, and becomes the source that decomposition reads **alongside the boards** (`public/frames.js`). Where this spec and the boards ever disagree, this spec + the boards are reconciled together — neither the stale plan docs nor an un-updated board wins by default.

---

## 1. Purpose & question

The multiplayer **server-side** is specced (`conductor/planning/multiplayer/`) and the **netcode** is proven (spike 008, archived). The missing piece was the **experience**: how a player gets from the home screen into a real two-player match and back out — invite, lobby, ready-up, shared picks, in-fight connection feedback, result, rematch, leaderboard, and the diagnostics surface.

**Question this spike answers:** *What is the complete, resolved screen-and-flow design for multiplayer — decomposable into implementation tracks and buildable by literal coding agents without inventing missing UX?*

The deliverable is not production code. It is an **agreed flow**, expressed as realistic wireframes on an infinite canvas, that folds back into the multiplayer plan and tracks.

---

## 2. Scope

**In scope**
- Every screen/surface a multiplayer session touches, from `home` to `leaderboard`.
- The three modes (Local 2P, Online, vs-Computer) and how they share screens.
- Failure/edge states (connection loss, forfeits, link edge cases, waiting timeouts).
- Layout/composition realistic enough to judge fit in the fixed 16:9 game window.

**Out of scope**
- Visual/theme design (per-player theming is layered later).
- Netcode mechanics (settled by spike 008).
- Server schema, hosting, matchmaking internals (settled by the plan).
- The vs-CPU bot's AI quality (built last; a stand-in).

---

## 3. Invariants (hard constraints — every screen obeys these)

1. **Fixed 16:9 window.** Every game screen renders inside one fixed 16:9 window the size of the stage. **No page scroll**; `home` especially must fit entirely on first load. Long content (stage grid, leaderboard) scrolls *inside* its frame, never the page.
2. **Host-authoritative netcode.** Host simulates; guest renders and predicts its own character.
3. **Shared screens, per-mode behavior.** Character Select, Stage Select, Fight, and Result are **one screen each**, entered by all applicable modes and behaving differently per mode — not per-mode duplicate screens.
4. **Link is the join.** An invite link drops the recipient straight into the match. No code to type. A brand-new recipient only adds a display name.
5. **Identity is local-only.** A durable device-minted player id + a display name. No accounts, passwords, or email.
6. **Honest storage tier.** Any surface that persists or reports results (leaderboard, result "recorded" chip) states its live storage tier accurately (durable / sqlite-local / server-cache) and never implies durability it doesn't have.
7. **Diagnostics live outside the window.** All diagnostic chrome (the drawer and its collapsed rail) renders on the page **outside** the 16:9 window, never crossing the action. It is not theme-aware.
8. **Viewer-relative color.** Green (`s-you`) is always the **local viewer**; cyan (`s-opp`) is always the **remote party** — on the guest's own screen the guest is green. Host/guest is a separate, uncolored attribute. Seat layout (P1 left / P2 right) is viewer-relative, not a host/guest law.

---

## 4. The resolved flow

```
                            ┌───────────────► leaderboard ◄──── (home / create entry; exit → home)
                            │
home ─► mode-select ─┬─► local2p ───────────────────────────────┐
   │                 │                                            │
   │  (Play Online   ├─► vs-cpu ───────────────────────────────┐ │
   │   = headline)   │                                          │ │
   │                 └─► [identity?] ─► create ─┬─ friend joins ─┤ │
   │                                            ├─ automatch ────┤ │
   │                              join (link) ──┴────────────────┤ │
   │                                                             ▼ ▼
   │                                        ┌──────── LOBBY (persistent shell) ────────┐
   │                                        │  presence + connection always visible     │
   │                                        │  ▸ character select  ▸ stage select        │
   │                                        │  ▸ ready-up (after both picks)             │
   │                                        └───────────────┬───────────────────────────┘
   │                                                        │ both ready
   │                                                        ▼
   │                              fight ──► result ──┬─► rematch ─► (full re-pick: back into lobby picks)
   │                                │  (win/loss/    └─► leaderboard
   │                                │   forfeit/draw)
   │                                └─► conn states ─► fight (reconnected) │ result (forfeit)
   │
   └─ Local 2P and vs-CPU share select / stage / fight / result, without the lobby shell,
      presence chrome, connection states, timers, or leaderboard recording.
```

Online setup happens **inside the persistent lobby shell** (decision 1): the pickers are panels within the lobby, not separate destinations, so opponent presence and connection status never disappear during setup.

---

## 5. Screen catalog

Each entry: **purpose · per-mode behavior · required states · acceptance criteria**. Screen `id`s match `public/frames.js`. Decomposition should reference `id`s, not the display numbers.

### `home` — Landing
- **Purpose:** hero + CTA; the real current landing, unchanged.
- **States:** single view.
- **Acceptance:** fits the 16:9 window with **no scroll** on first load; feature cards stay one row; a **Leaderboard** entry point exists (decision 2). CTA leads to `mode-select`.

### `mode-select` — Mode fork (after home)
- **Purpose:** fork into Local 2P · Play Online · vs-Computer.
- **Behavior:** **Play Online is the visually primary option** (decision 8); the other two are secondary. Modes are environment-flag-gated; a disabled mode is **absent, not greyed** (background: 017).
- **Acceptance:** all enabled modes route correctly; Play Online reads as the headline; disabled modes don't render.

### `identity` — Name / identity (first-time online)
- **Purpose:** mint a durable device id; capture a display name. First online use, or storage empty.
- **Behavior:** invited newcomers do **not** hit this as a separate step — name entry for an invite is **inline on `join`** (decision, F5). `identity` covers only the create-side first-time path.
- **Acceptance:** no account UI; rename keeps the same record; only appears when no id exists yet.

### `create` — Create & invite
- **Purpose:** create a private match, share the link, or start automatch. Also hosts a **Leaderboard** entry (decision 2).
- **Required states:** default (link + copy) · **waiting** (someone invited, none joined yet) · **cancel** (kills the match, returns to `mode-select`) · **nobody-joined timeout** (~60s → nudge to automatch or out).
- **Waiting content (decision 5):** minimal now — status chip + Cancel + timeout — but the waiting area is a **self-contained slot** so rich filler (stage preview / move list / bot practice) drops in later without touching create/queue logic.
- **Acceptance:** copy label says **"playing as ⟨name⟩"** (not "signed in"); every waiting state has a drawn face, a destination, and stated timeout copy.

### `join` — Join by link
- **Purpose:** opening an invite link lands the recipient in the match directly.
- **Behavior:** returning player → straight into the lobby; new player → inline name field, then in. The link **is** the join.
- **Required edge-case states (drawn):** expired/dead-match link · match full / third person · link opened twice (second tab) · creator opens own link. Each has a message and a way forward, in-window.
- **Acceptance:** no code entry anywhere; all four edge cases have a face and a route.

### `automatch` — Automatch / waiting
- **Purpose:** pair with whoever's waiting; no link.
- **Required states:** searching · **cancel** (destination wired) · **queue-empty / timeout** (bounded — never lingers; ~60s → resolution). Bot-practice filler is gated behind vs-CPU shipping; a **bot-free waiting form exists for launch** (F6).
- **Acceptance:** the queue is bounded with a drawn timeout resolution; cancel has a destination; no filler depends on unbuilt vs-CPU at launch.

### `local2p` — Local 2P (existing)
- **Purpose:** the existing same-keyboard flow; must not regress.
- **Behavior:** reaches the **shared** character select (both P1 & P2 on one keyboard). No lobby shell, no network chrome.
- **Acceptance:** unchanged from today except entry via `mode-select`.

### `vs-cpu` — vs Computer (built last)
- **Purpose:** single-player stand-in; built last, ignore for now.
- **Behavior:** shared character select (you pick, CPU auto); shared stage select (single pick, no negotiation); **never recorded** to the leaderboard.
- **Acceptance:** uses the same input path a remote player would; bot matches never touch standings.

### `lobby` — Lobby (persistent shell) ★ decision 1
- **Purpose:** the persistent frame that holds the entire **online** setup. Both players present; see each other (green=you, cyan=rival); connection status always visible.
- **Behavior:** character select and stage select render as **panels inside the lobby** — presence and connection chrome persist across both. **Ready-up lives here, after both picks resolve.** Mutual ready → fight.
- **Required states:** waiting-for-both-present · one-ready/both-ready · **opponent-left-during-setup** (see cross-cutting §6.2) · reconnecting.
- **Acceptance:** presence + connection never disappear during picking; a single clear ready gate; opponent drop mid-setup has a drawn face and destination.

### `select` — Character Select (shared)
- **Purpose:** the real character picker; **one screen every mode routes into**.
- **Per-mode behavior:** **Local 2P** picks both slots on one keyboard · **Online** picks one slot (yours, green) while the opponent's streams in (cyan); rendered inside the lobby shell with presence header · **vs-CPU** picks yours, CPU auto.
- **Behavior:** **mirror matches allowed** (decision 7) — selecting a fighter does not lock it out for the other player.
- **Acceptance:** per-mode behavior explicit on the frame; online variant shows lobby presence chrome; no lockout logic implied.

### `stage-sel` — Stage Select (shared)
- **Purpose:** the real stage picker (35 stages, grouped).
- **Per-mode behavior:**
  - **Online:** both pick, see each other's pick **live**, **60s timer**, both may Confirm. Resolution — both agree → that stage · differ → random of the two · one picks → theirs · neither → random. **Pick-vs-confirm rule:** your current selection counts as your pick at timer expiry; Confirm just locks it early.
  - **Local 2P / vs-CPU:** a **single** stage pick by the human(s); **no live-opponent overlay, no negotiation, no 60s timer**.
- **Composition:** the 35-stage grid scrolls internally with header / timer / confirm pinned; resolution rules render as a **compact one-line hint**, not body-text rows.
- **Acceptance:** online resolution rules complete and unambiguous; local/vs-CPU variant stated; grid scroll + pinned chrome annotated.

### `fight` — The Fight (shared)
- **Purpose:** the real fight — Phaser canvas + React FightHUD.
- **Per-mode behavior:** the **connection chip renders online only**; local/vs-CPU show no network chrome.
- **Diagnostics:** the collapsed diagnostics rail is **on the page, outside the 16:9 window** (invariant 7, F16) — not inside the stage body. A **settings affordance** (gear on the fight chrome) opens the diagnostics drawer.
- **Composition:** announcer + P1/P2 HUD clusters + conn chip coexist; HUD name slots **truncate/ellipsis** hostile-length usernames.
- **Acceptance:** no diagnostic chrome inside the window; conn chip online-only; a settings entry to diagnostics exists; names can't distort the HUD.

### `conn` — Connection states (online, in-fight)
- **Purpose:** honest, distinctly-triggered network states over the fight.
- **Required states:** unstable (RTT/heartbeat, amber) · reconnecting (countdown) · opponent-left (socket closed / window elapsed, red) · **opponent-away** (tab-hidden grace — distinct trigger/countdown) · **version-mismatch** ("please refresh") · **server-restarting** ("retry", not error).
- **Edges (every state resolves):** reconnected → `fight` · window-elapsed / left → `result` (forfeit-win) · **own drop → `result` (forfeit-loss)**.
- **Acceptance:** every state has an honest trigger and an outgoing destination; the forfeit path terminates at a drawn result.

### `diagnostics` — Diagnostics drawer (page, outside window)
- **Purpose:** left-edge drawer on the page, outside the 16:9 window; reads the one shared metrics source; not themed.
- **Acceptance:** never crosses the action; opened from the fight's settings affordance; shows RTT p50/p95, felt lag, fps/throttle, **accurate** storage tier, build.

### `result` — Result (shared, modal over the game)
- **Purpose:** a modal floating over the dimmed fight; one honest result, recorded once. Exiting → home.
- **Required faces (decision 4 adds draw):** win · loss · forfeit-win ("opponent left — you win") · forfeit-loss · **draw** (double-KO / time expiry).
- **Per-mode behavior:** **Online** — recorded (with the honest storage-tier chip), Rematch + Leaderboard actions · **Local 2P** — not recorded, existing unilateral rematch · **vs-CPU** — never recorded.
- **Behavior:** the **guest sees identical chrome** (host reports the result); the "recorded" chip reflects the real tier and shows a failure/cache caveat honestly.
- **Acceptance:** all five faces drawn/described; per-mode recording correct; forfeits tagged `FF` on the result.

### `rematch` — Rematch ★ decision 3
- **Purpose:** run it back with mutual agreement; the lobby survives match end (no new link).
- **Behavior:** **full re-pick** — agreement returns both players through **character select + stage select inside the lobby shell**, not straight to the fight.
- **Required states:** agreement · **opponent declines** · **opponent exits to home while you wait** · **offer timeout**.
- **Acceptance:** rematch routes back into the lobby picks (not directly to fight); every non-agreement path has a face and destination.

### `leaderboard` — Leaderboard
- **Purpose:** standings — **online matches only**, one record per player (survives renames).
- **Access (decision 2):** reachable from `home` and `create`, plus from `result`; has an **exit → home**. Not gated behind finishing a match.
- **Display (decision 6):** **top-N (~10) + your own row pinned** if you're outside it; scrolls inside the fixed window.
- **States:** **empty** (the first thing every player sees at launch) · populated.
- **Forfeits:** recorded as normal W/L; `FF` tag on the match result only — standings stay clean W–L.
- **Storage honesty:** always states the live tier (durable / sqlite / server-cache).
- **Acceptance:** empty state drawn; entry + exit edges exist; top-N + your-row policy annotated; bot games excluded.

---

## 6. Cross-cutting systems

### 6.1 Identity
Device-minted durable id + display name; no accounts. Invite newcomers name themselves inline on `join`; create-side newcomers use `identity`. Rename preserves the record.

### 6.2 Failure & connection states
- **In-fight:** owned by `conn` (§5), every state resolving to fight or a forfeit result.
- **Setup-phase (new):** an opponent can drop while in the lobby / character select / stage select. The remaining player sees a drawn "opponent left" state and lands at a defined destination (the create-side waiting state with the same link alive, or a new match) — the setup-phase sibling of `conn`.
- **Own disconnect:** produces a forfeit-loss result.

### 6.3 Leaderboard & recording
Online-only; top-N + your row; empty state at launch; honest tier; forfeits as W/L + `FF` tag; draws recorded (decision 4).

### 6.4 Color & seating semantics
Viewer-relative (invariant 8). Documented in the board LEGEND: green = local viewer always, cyan = remote always; host/guest uncolored; seats viewer-relative.

### 6.5 Routes
A single **screen → route-per-mode** table is the routing contract for the mode-framework track. Online screens carry mode context; the joined guest's URL is defined. (To be finalized as a LEGEND/route block on the board and inherited by track 017.)

---

## 7. What this feeds (decomposition map)

| Area | Screens | Plan target |
|---|---|---|
| Mode framework + routing | `mode-select`, route table | 017 |
| Identity | `identity`, `join` inline name | 010 |
| Create / invite / automatch | `create`, `join`, `automatch` | 012 |
| Lobby (persistent shell) + ready-up | `lobby`, `select`/`stage` as panels | 012 |
| Shared picks | `select`, `stage-sel` | existing screens adapted |
| Connection feedback | `conn`, setup-phase drop, `diagnostics` | 011.8 / 011.9 / 011.13 |
| Result + rematch | `result`, `rematch` | 011 / 012 |
| Leaderboard | `leaderboard` | 015 + 009.9 |

---

## 8. Definition of done (for this spike)

1. Every screen in §5 renders on the board with its per-mode behavior and required states drawn or explicitly annotated.
2. Every flow edge has a source and a destination — no dead ends (esp. `conn`, `leaderboard`, forfeit paths).
3. The eight decisions (§ `reviews/001-decisions.md`) are reflected on the board.
4. No board frame contradicts an invariant in §3 (esp. diag-rail placement, F16).
5. The plan-doc reconciliation (D1–D6) is scheduled as a decomposition task (not necessarily done within the spike).
6. Review 001's blockers (R1–R5) are resolved; improvements (R7–R13) applied or explicitly deferred.

---

## 9. Open items / follow-ups

- **Plan-doc reconciliation (D1–D6)** — update `conductor/planning/multiplayer/ux.md` + `tasks.md` during decomposition so track specs inherit the board's decisions (details in `reviews/001-decisions.md`).
- **Engine verifications at build time:** two identical fighters render cleanly (mirror matches, decision 7); whether the engine can produce a draw (decision 4 assumes yes — confirm the trigger).
- **Rich waiting filler** — documented stretch goal (decision 5); build minimal, keep the slot.

---

## 10. Provenance

- Storyboards built as a design spike (see `README.md` for run/deploy).
- Reviewed: `reviews/001-ux-flow-and-composition-review.md` (Fable-model, first pass) — boards treated as source of truth.
- Decisions: `reviews/001-decisions.md` (owner, 2026-07-27).
- This spec authored retroactively to give the spike an authoritative record before board alignment and decomposition.
