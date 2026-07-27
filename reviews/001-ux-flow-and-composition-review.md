# Review 001 — UX Flow & Composition Review of the Multiplayer Storyboards

**Purpose:** First formal review of the multiplayer UX storyboards, judging whether every screen, state, transition, and layout is resolved enough to decompose into implementation tracks (~009–017) buildable by literal Sonnet coding agents.
**Date:** 2026-07-27
**Reviewer note:** Fable-model review, first pass.
**Source of truth:** The storyboards themselves (`public/frames.js` FRAMES/LINKS/LEGEND, `public/styles.css`, rendered captures in `reviews/assets/`). The boards are the resolved target UX; `scope.md` / `ux.md` / `tasks.md` / `clarification.md` were used only as background cross-reference. Where board and plan disagree, the board is treated as the newer decision and the divergence is listed for later reconciliation (see "Plan divergences" at the end of Findings).

---

## Executive summary

1. **The happy path is genuinely well wired.** Home → mode select → create/join/automatch → lobby → shared character select → two-player stage select → fight → result → rematch/leaderboard exists, all three modes converge on the single shared Character Select as the constraints demand, and each screen's core intent is annotated well enough to explain itself. The board's own invariants (link-is-the-join, both-pick stage resolution, honest storage tier, diagnostics outside the window, host-authoritative fight, per-player theme) are stated clearly where they're stated at all.
2. **The single biggest ambiguity is the ready gate.** The lobby (`lobby`) has a `✓ Ready` button, but the fight-starting edge is `stage-sel → fight ("both ready")`, and stage select has its own Confirm + 60s timer. Three competing gates with no stated sequence — and the lobby's tag "wraps select+stage" vs the LINKS' linear lobby → select → stage-sel sequence are two different architectures. A coding agent must invent the actual state machine. This must be resolved before decomposition.
3. **The shared screens are drawn online-only.** `select`, `stage-sel`, `fight`, and `result` are, per the board's own constraint, one shared screen per role behaving differently per mode — but only `select` actually specifies per-mode behavior. Stage select's two-player negotiation makes no sense in Local 2P or vs-CPU as drawn, and the result modal (Rematch → online lobby, "recorded · match #AB12CD") has no Local-2P/vs-CPU variant. Two of the three modes have no defined end-of-flow.
4. **Failure and edge states are promised in the board's own prose but not drawn.** `join`'s desc says it "still handles a link opened twice / by a third person" — no frame shows how. `create` promises a "clear waiting state + cancel"; `automatch` promises a "bounded queue (never lingers)" — no timeout state, message, or destination exists for either. `conn` covers unstable/reconnecting/left but has **no outgoing edges**, so the forfeit path has no storyboarded destination. These are the exact states a builder cannot invent safely.
5. **One hard internal contradiction:** node `fight` draws the collapsed DIAG rail *inside* the 16:9 stage body, while node `diagnostics` (8b) — and the board's own stated invariant — put all diagnostic chrome on the page *outside* the game window. Two frames, two answers; the fight-HUD builder will pick the wrong one.
6. **Verdict: NOT ready to decompose as-is — but close.** The skeleton is right; nothing needs redesign. What's needed: one flow decision (the ready gate), per-mode variants on the shared screens, a batch of small missing-state frames, the diag-rail fix, and a short reconciliation pass over the stale plan docs (several ux.md/tasks.md details no longer match the board and will otherwise leak into track specs). Roughly 1–2 focused days of storyboard work; decomposing before that pushes these inventions onto coding agents, which is exactly what this spike exists to prevent.

---

## Findings

Severity: **Blocker** = decomposition will force a coding agent to invent UX; **Should-fix** = real gap/inconsistency, fixable during decomposition if explicitly assigned; **Nice-to-have** = polish.

### 1. Flow completeness & correctness

**F1 · Blocker · `lobby`, `select`, `stage-sel` — Three competing ready gates, and two architectures in one board.**
LINKS say `lobby → select ("pick fighters") → stage-sel → fight ("both ready")`. But the lobby wire shows a `✓ Ready` primary button (plus "fighters ▸ / shared stage ▸" summary rows), and stage select has its own `Confirm` button and 60s timer. Which action arms the fight? Is lobby-Ready a gate before picking (nonsensical — you'd ready before choosing), a gate after returning from the pickers (then a `stage-sel → lobby` return edge is missing), or is stage-select's mutual Confirm the real gate (then lobby's Ready is dead UI)? Compounding it: `lobby`'s tag says "wraps select+stage" — a lobby-as-persistent-frame model — while the LINKS draw a linear screen sequence in which `select` and `stage-sel` carry none of the lobby's presence/connection chrome. Where does the opponent's presence, the connection chip, and ready state live while picking? The board currently supports two mutually exclusive readings. Nothing downstream (lobby track, match-start sync) can be specced until one is chosen and drawn.

**F2 · Blocker · `select`, `stage-sel`, `result`, `fight` — Shared screens specified for online only.**
The board's own rule: one shared Character Select (and downstream flow) that "behaves differently per game type." `select`'s desc honors this — it defines Local 2P, Online, and vs-CPU behavior explicitly. The other shared screens don't:
- `stage-sel` is specified *only* as the online negotiation (both pick, see each other live, 60s timer, resolution rules). What Local 2P does (both at one keyboard — one shared pick? whose? is there a timer?) and what vs-CPU does (player picks alone? does the CPU "pick"?) is absent.
- `result` is online-only: "recorded · match #AB12CD", Rematch → online lobby, Leaderboard. Local 2P has an existing (unilateral, unrecorded) rematch; vs-CPU is explicitly "not recorded to leaderboard" per its own frame. Neither variant of the result modal is drawn or described.
- `fight` shows the connection chip and diag rail unconditionally; presumably online-only, but that's an inference.
A coding agent building these screens will implement the only variant shown.

**F3 · Blocker · `conn` — Connection-state screen is a dead end with no outgoing edges.**
`fight → conn ("network event")` exists; nothing leaves `conn`. "⤺ Reconnecting… 0:06 left" must resolve to `fight` (success) or a forfeit result; "✕ Opponent left → forfeit win" names a result variant (`result`, forfeit-win) that has no edge and no drawn face. The player's own disconnect (their forfeit-loss) isn't represented at all. The forfeit flow — a load-bearing outcome the board itself references in three places — currently has no storyboarded destination.

**F4 · Should-fix · `leaderboard` — Reachable only after winning a match; no exit.**
The only inbound edge is `result → leaderboard`; there is no outbound edge. As wired, a player cannot view standings without first finishing an online match, and once there, has no way out (needs at least Exit → Home). If the collapse of a separate online hub into the `create` screen is deliberate (see Plan divergences, D3), then `create` (or `home`) needs a Leaderboard entry so the board isn't only visible to winners; either way the dead end needs an exit edge.

**F5 · Should-fix · `join` vs `identity` — Two conflicting name-entry treatments for invited newcomers.**
`identity`'s desc says "New players from an invite hit this same step," but there is no `join → identity` edge; instead `join`'s wire embeds its own inline name input ("your name… (new? add one)"). Both are plausible; the board asserting both is a fork a coding agent must resolve. The inline treatment on `join` looks like the newer intent (fewest steps for a cold arrival, matching "the link IS the join") — if so, pick it and remove `identity`'s claim on the invite path.

**F6 · Should-fix · `automatch` — No timeout resolution route, and a sequencing snag on its filler.**
The desc promises "a bounded queue (never lingers)" — but there is no timeout state, message, or destination (back to `create`? `mode-select`? with what copy?). Cancel's destination is also unwired. Separately, its filler button "Practice vs Computer" reaches for the vs-CPU mode that the board's own `vs-cpu` frame marks "built last — ignore for now": as sequenced, online (with this waiting screen) ships before the bot exists. Either the button is a Phase-3 enhancement (annotate it as appearing only once vs-CPU ships) or the waiting filler needs a bot-free form for launch. The board should say which.

**F7 · Nice-to-have · `mode-select` — Disabled-mode behavior unstated.**
Modes are flag-gated per environment (background: 017.x). The frame shows all three unconditionally; one annotation ("a disabled mode is absent, not greyed out" — or whatever the intent is) hands the builder the rule.

**F8 · Nice-to-have · `home` — CTA label "Choose fighters" now leads to Mode Select.**
The button's label describes its old destination. Fine for a wireframe; flag the copy as open rather than letting it silently ship.

### 2. Missing states

**F9 · Blocker · `join` — The link edge cases the board itself names have no frames.**
"Still handles a link opened twice / by a third person" — handles *how*? Nothing shows: (a) a stale/expired link (dead match), (b) a third person opening a full match, (c) the same person opening it twice (second tab), (d) the creator opening their own link. Each needs a message and a way forward, in-window. A small states-list frame beside `join` (the format `conn` already uses) covers all four cheaply.

**F10 · Blocker · `create` — The promised waiting/cancel states aren't drawn.**
The desc says "clear waiting state + cancel." The wire shows the waiting chip; it does not show: what Cancel does (destination? does it kill the match server-side?), what happens when nobody ever joins (timeout? how long? what message? where does the player land?), or what the waiting player looks at beyond a spinner during the flow's highest-abandonment moment. These are decisions, not renderings — a builder can't infer a lobby-teardown policy from "◔ waiting for opponent…".

**F11 · Blocker · `lobby`, `select`, `stage-sel` — Opponent-leaves-mid-setup states missing.**
The connection states (`conn`) attach only to the fight. But an opponent can disconnect while in the lobby, during character select, or during stage select (a 60s window practically invites it). What does the remaining player see, and where do they land — back to `create`'s waiting state with the same link alive? A new match? These frames are the setup-phase siblings of `conn` and don't exist.

**F12 · Should-fix · `conn` — States a builder will need that the list omits.**
The three drawn states (unstable / reconnecting / left) are well framed with honest triggers. Building the fight's network UX will also require: **opponent-away** (tab-hidden grace — the board's host-stall note implies it; it's a different trigger and countdown than "unstable"), **version mismatch** ("please refresh" — stale tab after a deploy), and **server restarting** (deploy-driven mass disconnect that should read as "retry," not error). All three belong in this frame's list with the same trigger-honesty treatment.

**F13 · Should-fix · `result` — Only the win variant is drawn.**
The desc says "Win / loss / forfeit shown distinctly" — distinctly *how* is the question a wireframe exists to answer. Missing faces: loss, forfeit-win ("opponent left — you win"), forfeit-loss, and — if the game rules can produce one — draw/double-KO. Also unstated: whether the guest sees identical chrome (the host reports the result), and what the "recorded" chip shows if recording lands on the ephemeral cache tier or fails. Four small thumbnails and two sentences close this.

**F14 · Should-fix · `rematch` — Decline/abandon states missing; rematch scope unstated.**
"Both agree → back to the fight" covers agreement only. Missing: opponent declines; opponent exits to Home while you wait (the `result` modal's Exit is always available — does the survivor wait on "Rival …" forever?); offer timeout. And the flow-defining question: `rematch → fight ("again")` skips select and stage entirely, implying same-fighters-same-stage — if that's the intent (it's a clean, fast rule), one sentence makes it buildable; as-is it's an inference.

**F15 · Should-fix · `leaderboard` — No empty state; internal-scroll behavior not indicated.**
The board starts empty for everyone, so the empty state is the first thing every player sees; it's undrawn. The wire shows 3 rows with no indication of how a long list behaves — the fixed-window/no-page-scroll invariant means it must scroll inside the frame (or paginate), and show-everyone vs top-N vs window-around-you changes the layout. Annotate the scroll container and name the display policy (or mark it explicitly open — see Open questions Q6).

### 3. Composition realism

**F16 · Blocker · `fight` vs `diagnostics` — The collapsed DIAG rail is drawn INSIDE the 16:9 stage.**
The board's invariant (and node `diagnostics`, which draws it correctly) puts diagnostic chrome on the page, outside the game window, never crossing the action. Node `fight`'s wire places the `DIAG` rail *inside* the stage body, occupying the left edge of the arena. Two frames, two answers, on a stated invariant. Redraw `fight` with the rail outside the window (page-type frame like 8b), or explicitly amend the invariant — but don't leave the frames disagreeing.

**F17 · Should-fix · `stage-sel` — The online additions need explicit compaction/scroll design to fit the real screen.**
The real picker is 35 stages in groups. Online adds: both-pick pills, the opponent's live pick overlay, a 60s timer, resolution-rule text, and a Confirm bar — inside 960×540 with the grid already dominant. The wire currently spends two full rows spelling the resolution rules out as body text; on the real screen that's HUD-crowding prose (compact to a one-line hint/tooltip). Annotate that the grid scrolls internally with header/timer/confirm pinned. Not a redesign — but if the board doesn't say it, the builder will guess.

**F18 · Should-fix · `create` — The waiting state's real content will decide this screen's composition.**
As drawn (identity row, link + copy, waiting chip, two pills) the screen is comfortably sparse — realistic. But whatever F10 resolves the waiting experience to be (even just richer status + cancel + timeout messaging; more if any preview/practice content is intended) lands on this screen and could double its content. Draw the waiting state as its own variant of this frame now, so composition is settled before the track is specced.

**F19 · Nice-to-have · `fight` — HUD/chip coexistence plausible; add name-truncation notes.**
Announcer + two name/health/conf/special clusters up top, conn chip bottom-right, modal over dimmed arena for results — composes realistically. Usernames are player-supplied; annotate max rendered width/ellipsis on the HUD name slots, `lobby`'s "Rival …" row, and `join`'s "Joining PlayerName's match" so hostile-length names can't distort the layouts.

**F20 · Nice-to-have · `home` — Fits; keep the discipline.**
Hero + tagline + blurb + 2 CTAs + 3 feature cards fits a 16:9 window if the cards stay one row. The "REQUIREMENT: fit, no scroll" tag is exactly the annotation style other frames should copy.

### 4. Consistency

**F21 · Should-fix · LEGEND — The s-you/s-opp color language conflates "you" with "host".**
Legend: `s-you` = "You · host · local player", `s-opp` = "Opponent · remote · guest". On the guest's own screen, the guest is "you" — is their character green (you) or cyan (guest)? Two orthogonal axes (viewer-relative you/opponent vs role host/guest) are collapsed into one color pair, and the fight HUD, lobby, and select all trade on these colors. A literal agent could paint the guest's own character cyan on the guest's own screen. State the rule once: **colors are per-viewer — green is always the local viewer, cyan always the remote party; host/guest is a separate, uncolored attribute.** Relatedly, `fight` labels seats P1-left/P2-right: clarify whether the local player always renders left (viewer-relative) or seats are fixed by role — the board shouldn't accidentally imply "P1 = host" as a layout law.

**F22 · Should-fix · Routes — The route map is inconsistent across shared screens.**
`local2p` is tagged "/select → /play" but routed "/select · local"; online select/stage show bare `/select` / `/stage` while the lobby is "/online · lobby"; `join` is `/m/AB12CD` and lands in "/online · lobby". Does online reuse the same routes with mode context, or live under `/online/*`? What URL is a joined guest on? Decomposition into Next.js routes needs a single screen → route-per-mode table; one legend block fixes it.

**F23 · Should-fix · `result` vs `leaderboard` — Forfeits "shown distinctly" at result, invisible on the board.**
`result`'s desc: "Win / loss / forfeit shown distinctly." The leaderboard rows show plain W–L pills ("9–2") with no forfeit representation. If forfeits are recorded distinctly (as the result screen implies), the standings need a treatment for them (a third figure, an FF column, or a deliberate decision to fold them into losses *for display* — which would itself need stating). The board is internally silent on which; the builder of the standings view will guess.

**F24 · Nice-to-have · Copy/naming drift.**
"signed in" on `create` misleads — there are no accounts (identity is a browser-minted id + display name); "playing as ⟨name⟩" is honest. The opponent is "Rival" in lobby/select, "PlayerName" in join, "Guest42" in leaderboard — pick one placeholder convention. Titles number 1–11 with letter-suffixed branches (2a/2b/4b/4c/8b/8c); decomposition docs should reference `id`s, not numbers.

**F25 · Nice-to-have · Ready-up pattern repeats consistently — keep it that way.**
`lobby` and `rematch` share the You ✓ / Rival … + primary-action pattern — good; the rematch node is the lobby surviving match end, so once F1 resolves ready-up semantics, `rematch` should inherit them verbatim (one component, one behavior).

### 5. Decomposition-readiness (the guess-point inventory)

**F26 · Blocker · Consolidated guess points — where a Sonnet agent must currently invent UX.**
(1) The ready/confirm/timer gate sequence and lobby-wraps vs linear-screens architecture (F1); (2) stage-select and result behavior in Local 2P and vs-CPU (F2); (3) every failure state's face and destination (F3, F9–F12); (4) the waiting experience, cancel, and timeout policy (F10, F6); (5) rematch scope and decline paths (F14); (6) leaderboard entry/exit/empty/scroll/forfeit display (F4, F15, F23); (7) diag-rail placement (F16); (8) the viewer-relative color/seating rule (F21); (9) the route map (F22); (10) stage-select **pick-vs-confirm semantics** — the resolution rules key on *picks* ("one picks → theirs · neither → random") but the UI requires *Confirm*: does an unconfirmed selection count as a pick at timer expiry? One sentence resolves it; today it's undefined.

### Plan divergences — board is newer; update the docs during decomposition

Places where the boards and the planning docs disagree. Per this review's ground rule, the board is the current decision; these are listed so the stale docs get corrected rather than leaking old intent into track specs:

- **D1 · Stage selection model.** `ux.md` recommends "host picks the stage" (and 012.7 leaves it open). The board (`stage-sel`) resolves it differently and more fully: both pick, live-visible, 60s timer, agree/differ/one/neither resolution rules. **Board wins; update ux.md + 012.7.**
- **D2 · Waiting-room filler.** `ux.md`/012.10 specify a bot-free stage-preview + move-list fill with engagement-keyed timeouts (60s idle / 5-min practicing cap). The board shows a plain waiting chip (`create`) and bot practice (`automatch`). If the board's simpler waiting state is the newer call, 012.10's content spec and timeout table need rewriting to match (and F6's bot-sequencing note still applies on the board's own terms). Needs owner confirmation — see Q5.
- **D3 · Online hub.** `ux.md` proposed an `/online` hub (Create / Quick Match / Leaderboard). The board collapses it into `create` (with Automatch as a pill) and gives the leaderboard no hub entry. Board wins; update ux.md's flow — and resolve F4's reachability gap within the board's model.
- **D4 · Mode-select emphasis.** `ux.md` says "Primary call-to-action: Play Online" on landing. The board's `mode-select` lists "Two Players — same keyboard" first with equal visual weight, and `home`'s CTA is generic. If deliberate, update ux.md; if not, reorder (tie to F8).
- **D5 · Invite-arrival interstitial.** `ux.md` left "straight to name entry vs 'you've been challenged' interstitial" open; the board's `join` answers it ("Joining PlayerName's match" header + inline name). Record the decision in 012.2 and close the open question (after F5 unifies the treatment).
- **D6 · Lobby architecture.** `ux.md`'s recommended Option C ("lobby shell embeds the existing pickers") vs the board's linear lobby → select → stage sequence — currently *both* readable in the board (the F1 ambiguity). Whichever way F1 resolves, ux.md's integration section must be updated to match the board's final answer.

---

## Screen-by-screen table

| Screen id | Readiness | Most important note |
|---|---|---|
| `home` | Ready | Fits-no-scroll requirement well annotated; CTA copy open (F8). |
| `mode-select` | Ready (minor) | Annotate disabled-mode behavior (F7); confirm ordering/emphasis intent (D4). |
| `identity` | Needs work | Stop double-claiming the invite path — pick this overlay or `join`'s inline entry (F5). |
| `create` | Needs work | Waiting/cancel/timeout states promised but not drawn; waiting content decides the screen's composition (F10, F18). |
| `join` | Underspecified | The four link edge cases its own desc names have no frames (F9). |
| `automatch` | Needs work | Bounded-queue timeout unwired; bot-practice filler predates the mode it needs (F6). |
| `local2p` | Ready | Thin but adequate — it's the existing flow; must-not-regress is the whole spec. |
| `vs-cpu` | Ready (deferred) | Explicitly "ignore for now"; F2 still owes it a result treatment eventually. |
| `lobby` | Underspecified | The ready-gate / wraps-vs-precedes ambiguity is the board's #1 blocker (F1). |
| `select` | Ready (minor) | Best per-mode spec on the board — the template the other shared screens should copy; needs F1's answer on where presence lives while picking. |
| `stage-sel` | Needs work | Online rules excellent; per-mode behavior absent; pick-vs-confirm undefined; compaction/scroll unannotated (F2, F17, F26.10). |
| `fight` | Needs work | DIAG rail drawn inside the 16:9 window, contradicting node 8b and the invariant (F16). |
| `conn` | Needs work | Honest triggers, good; no outgoing edges, and away/version/restart states missing (F3, F12). |
| `diagnostics` | Ready | Correctly outside the window, not themed, single metrics source. Add the settings affordance that opens it — no frame shows a settings surface anywhere. |
| `result` | Needs work | Only the online win variant exists; loss/forfeit/draw and Local-2P/vs-CPU variants undrawn (F2, F13). |
| `rematch` | Needs work | Agreement drawn; decline/abandon/timeout and same-config semantics missing (F14). |
| `leaderboard` | Needs work | Storage-tier honesty: exemplary. Dead end (no exit), post-match-only entry, no empty state, forfeit display unresolved (F4, F15, F23). |

---

## Recommendations

### Before decomposition (blockers)

1. **R1 — Decide and draw the online setup state machine (F1, F26.1).** One answer to: lobby ⇄ pickers relationship, where Ready lives, what Confirm does, what finally triggers "both ready → fight". Concretely: either (a) delete the lobby's Ready button and make stage-select's mutual Confirm the gate, adding a return edge if a ready beat exists; or (b) make the lobby the persistent frame — redraw `select`/`stage-sel` with the lobby's presence/connection header and keep Ready in the lobby after both picks resolve. Either is buildable; the current mix is not.
2. **R2 — Add per-mode variants to the shared screens (F2).** Minimum: a per-mode behavior note on `stage-sel` in the same three-row style `select` already uses; two extra result thumbnails ("Local 2P result — not recorded, existing rematch" and "vs-CPU result — never recorded"); and a note that the connection chip/diag rail render only online.
3. **R3 — Add the missing state frames (F3, F9–F12).** Three cheap additions in `conn`'s list format: a **link-states frame** beside `join` (expired · match full/third person · opened twice · own link); a **waiting-states frame** beside `create`/`automatch` (cancel destination · nobody-joined timeout with duration + message + destination · queue-empty resolution); and setup-phase **opponent-left states** for lobby/select/stage. Extend `conn` with opponent-away (tab grace), version-mismatch, and server-restart, and give every `conn` state an outgoing edge (reconnected → `fight`; window elapsed/left → `result` forfeit-win; own drop → forfeit-loss).
4. **R4 — Resolve the diag-rail placement in `fight` (F16).** Redraw the collapsed rail outside the 16:9 stage (page-type frame, matching `diagnostics`), or explicitly amend the invariant. Don't leave the two frames disagreeing.
5. **R5 — Define stage-select pick-vs-confirm (F26.10).** One sentence in `stage-sel`'s desc, e.g.: "your current selection counts as your pick at timer expiry; Confirm locks it early."
6. **R6 — Run the doc-reconciliation pass (D1–D6).** Before tracks are written from the board, update `ux.md`/`tasks.md` where the board superseded them (stage-pick model, online hub, waiting filler, mode emphasis, invite arrival, lobby architecture) so track specs inherit the board's decisions, not the stale plan's.

### Improvements (during or just after decomposition)

7. **R7 — State the viewer-relative color rule in the LEGEND and decouple P1/P2 seating from host role (F21).**
8. **R8 — Add a screen → route-per-mode table (F22)** — one legend block that becomes the routing section of the mode-framework track.
9. **R9 — Leaderboard: add an entry point (from `create` and/or `home`), an exit edge, the empty state, the internal-scroll annotation, and the forfeit-display decision (F4, F15, F23).**
10. **R10 — Rematch: annotate same-fighters/same-stage (or re-pick) and add decline/abandon/timeout states (F14).**
11. **R11 — Result variants: draw loss / forfeit-win / draw thumbnails; note the guest's view and the cache-tier recording caveat (F13).**
12. **R12 — Unify invited-newcomer name entry on one treatment (F5); fix "signed in" copy and placeholder-name drift (F24); add name-truncation notes on HUD/lobby/join (F19); annotate disabled-mode behavior on `mode-select` (F7).**
13. **R13 — Add a settings affordance** — the diagnostics drawer opens "from settings," but no frame shows a settings surface; one gear on the `fight` chrome (or a note) suffices.

---

## Open questions for the user

Genuine product-owner decisions the board leaves open (not resolvable by the reviewer or a coding agent):

1. **Where does ready-up live** — stage-select's mutual Confirm as the final gate, or a return-to-lobby ready beat? (R1 needs your pick; both are defensible.)
2. **Should standings be viewable without playing** — i.e. does the leaderboard get an entry from `home` or `create`, or is post-match-only deliberate?
3. **Rematch scope** — same fighters + same stage (instant run-back, as the `rematch → fight` edge implies), or re-enter select/stage? If same-config: is there ever a point in a rematch chain where players can renegotiate?
4. **Do draws exist?** If double-KO/time-expiry can produce one, the result modal needs a face for it; if the game rules preclude draws, record that so the omission is deliberate.
5. **The waiting experience** — is the board's minimal waiting chip the current call (superseding ux.md's stage-preview + move-list fill), or should the richer bot-free filler be drawn in? And what's the nobody-joined timeout policy (duration, message, destination)?
6. **Leaderboard display policy** — everyone, top-N, or a window around the current player? And how are forfeits shown (distinct figure vs folded into losses for display)?
7. **Mirror matches** — may both players pick the same fighter? The `select` frame is silent, and allow-vs-disable changes the picker's behavior.
8. **Mode-select emphasis** — is Local-2P-first ordering deliberate (superseding "Play Online is the headline"), or should the board reorder?

---

*End of review 001.*
