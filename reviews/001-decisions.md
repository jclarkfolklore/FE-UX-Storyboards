# Review 001 — Resolved Decisions

**Date:** 2026-07-27
**Context:** Answers to the open questions raised in `001-ux-flow-and-composition-review.md`, decided by the product owner. These are the authoritative UX decisions; the storyboards (`public/frames.js`) were updated to match, and the multiplayer plan docs (`conductor/planning/multiplayer/*`) inherit these during decomposition.

---

## The eight decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Ready-up / fight-start gate | **Persistent lobby shell** — the lobby stays on-screen through setup; character + stage pickers render *inside* it with opponent presence + connection chrome always visible. Ready-up happens in the lobby after both picks resolve. |
| 2 | Leaderboard access | **Viewable anytime** — entry from `home` (and `create`) plus an exit back. Not gated behind finishing a match. |
| 3 | Rematch scope | **Full re-pick** — a rematch returns both players through character select + stage select (inside the lobby shell), not straight back to the fight. |
| 4 | Draws | **Possible** — double-KO / time-expiry can tie. `result` needs a draw face; the leaderboard records draws. |
| 5 | Waiting screen | **Minimal now, expandable** — waiting chip + clear Cancel + ~60s timeout. Build minimal, but structure it so the richer filler (stage preview / move list / bot practice) is a documented drop-in stretch goal. Do not back the design into a corner. |
| 6 | Leaderboard display | **Top-N + your row** — show the top ~10; if you're outside it, pin your own rank at the bottom. Scrolls inside the fixed window. Forfeits recorded as normal W/L with an `FF` tag on the *match result* only (leaderboard stays clean W–L). |
| 7 | Mirror matches | **Allowed** — both players may pick the same fighter. Picker does not lock a fighter out. (Verify the engine renders two identical characters cleanly at build time.) |
| 8 | Mode-select emphasis | **Play Online headline** — Play Online is the visually primary mode; Local 2P + vs-CPU are secondary. |

---

## Rich waiting-filler — deferred stretch goal (decision 5)

Built minimal for launch, but the waiting screen must be structured so this drops in without rework:

- **Minimal (build now):** waiting/searching status chip, a clear **Cancel** (kills the match/queue and returns to `create` / `mode-select`), and a **~60s timeout** that nudges the waiter toward automatch or out.
- **Rich filler (later, documented):** stage preview carousel, a fighter move-list to read, and — once vs-CPU ships — bot practice while waiting. Engagement-keyed timeouts (idle vs actively-practicing).
- **Do-not-corner-us constraint:** the waiting state is its own component/slot inside `create`/`automatch`, so filler content can be injected without touching the match-creation or queue logic.

---

## Plan-doc reconciliation (from review divergences D1–D6)

The board is newer than `ux.md`/`tasks.md`. During decomposition, update the plan docs so track specs inherit the board's decisions, not stale intent:

- **D1 stage model** → board's both-pick + 60s + agree/differ/one/neither resolution supersedes ux.md's "host picks." Update ux.md + 012.7.
- **D2 waiting filler** → decision 5 above is the current call (minimal-now/rich-later). Rewrite 012.10's content + timeout spec to match.
- **D3 online hub** → board collapses `/online` hub into `create` (+ Automatch pill); leaderboard reachable from `home`/`create` per decision 2. Update ux.md flow.
- **D4 mode emphasis** → decision 8 (Play Online headline). Update ux.md.
- **D5 invite arrival** → board's inline name-on-`join` is the decision (see F5 unification). Record in 012.2, close the open question.
- **D6 lobby architecture** → decision 1 (persistent lobby shell) resolves ux.md's Option C. Update the integration section.
