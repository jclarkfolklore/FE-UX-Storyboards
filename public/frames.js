// Storyboard content model — grounded in the REAL app (routes /, /select, /stage,
// /play, results, settings) and starting from the actual home screen.
//
// Layout is a GRID (col × lane) — app.js computes non-overlapping positions from
// col widths + lane heights, so cards never collide.
//   col  = left→right flow step
//   lane = 0 top branch · 1 main spine · 2 bottom branch
//
// type: 'stage' = the fixed 16:9 game window (true proportion) · 'page' = the whole
//   browser page (for things that live OUTSIDE the game window, e.g. the diag drawer).
// isNew = added by the multiplayer work (vs a reused existing screen).
//
// SEMANTIC COLOR (grayscale base; color only organizes detail — see the Legend):
//   .s-act network/nav primary action · .s-you you/host/local · .s-opp opponent/remote
//   .s-wait waiting/pending/degraded · .s-err error/disconnect · .s-net network·data·metrics

const box = (t, cls = "") => `<div class="wf-box ${cls}">${t}</div>`;
const btn = (t, cls = "") => `<div class="wf-btn ${cls}">${t}</div>`;
const inp = (t, cls = "") => `<div class="wf-input ${cls}">${t}</div>`;
const pill = (t, cls = "") => `<span class="wf-pill ${cls}">${t}</span>`;
const av = (t, cls = "") => `<div class="wf-avatar ${cls}">${t}</div>`;
const row = (...k) => `<div class="wf-row">${k.join("")}</div>`;
const col = (...k) => `<div class="wf-col">${k.join("")}</div>`;
const note = (t) => `<div class="wf-note">${t}</div>`;
const bars = () => `<div class="wf-hud"><span class="s-you"></span><span class="s-opp"></span></div>`;
const grid = (cols, cells) => `<div class="wf-grid" style="grid-template-columns:repeat(${cols},1fr)">${cells.join("")}</div>`;
const cell = (t = "", cls = "") => `<div class="wf-cell ${cls}">${t}</div>`;
// A faithful top HUD bar (announcer + P1 left / P2 right, each name+health+conf+special).
const fightHud = () => `<div class="wf-fhud">
  <div class="wf-fhud-ann">announcer line</div>
  <div class="wf-fhud-row">
    <div class="wf-fhud-side s-you"><b>P1</b><span class="wf-bar"></span><div class="wf-fhud-sub"><span class="wf-bar sm"></span><span class="wf-bar sm"></span></div></div>
    <div class="wf-fhud-side s-opp right"><b>P2</b><span class="wf-bar"></span><div class="wf-fhud-sub"><span class="wf-bar sm"></span><span class="wf-bar sm"></span></div></div>
  </div></div>`;

// A true-proportion game window: a 16:9 stage with a route bar (which real screen).
const stage = (route, body) =>
  `<div class="wf-stage"><div class="wf-stage-bar"><span class="wf-dot"></span><span class="wf-route">${route}</span></div>` +
  `<div class="wf-stage-body">${body}</div></div>`;
// The whole browser page: the 16:9 window sits inside; used for things OUTSIDE it.
const page = (route, inner) =>
  `<div class="wf-page"><div class="wf-page-bar"><span class="wf-dot"></span><span class="wf-route">${route}</span><span class="wf-page-note">whole page — element lives OUTSIDE the game window</span></div>` +
  `<div class="wf-page-body">${inner}</div></div>`;
const gameWindow = (body) => `<div class="wf-gamewin"><div class="wf-gamewin-tag">16:9 game window</div>${body}</div>`;

// ─────────────────────────────────────────────────────────────────────────
// NEW badge — cleared. These storyboards are now treated as the resolved
// target design (to be decomposed into the multiplayer plan), so the
// new-vs-existing scaffolding distinction is retired. Leaving the set empty
// means no frame renders the NEW badge; isNew is derived below.
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// BOARD — the page title and the "What is this?" brief. Replace these for your
// own project; everything else on the page is driven by FRAMES / LINKS / LEGEND.
// ─────────────────────────────────────────────────────────────────────────
export const BOARD = {
  title: "Multiplayer UX — Flow Storyboards",
  eyebrow: "Design spike · what we're figuring out",
  meta: "wireframes · theme-agnostic · design spike",
  info: `
<h2>Designing online multiplayer for Rock-em-Sock-em</h2>
<p class="modal-lede">Today the game is <b>local-only</b> — two players share one keyboard. This spike designs the <b>experience</b> of playing online: how you get from the home screen into a match against someone else, and back out. We agree the <b>flow and layout</b> here, before any UI is built.</p>

<div class="modal-cols">
  <section class="modal-sec">
    <h3>Why it matters</h3>
    <p>Local-only caps the game at a demo. Online turns it into something people actually use: <b>send a friend a link and fight</b>, get <b>matched</b> with whoever's around, or <b>practice against a bot</b> alone.</p>
  </section>
  <section class="modal-sec">
    <h3>Why decide it now</h3>
    <p>The visuals will change and evolve — we're <b>not</b> locking a look, and we don't prescribe a technical solution here. But agreeing the <b>flow</b>, and <b>which screens are new vs. reused</b>, prevents building unreviewed UX and expensive rework later.</p>
  </section>
</div>

<h3 class="modal-crit-h">What the design must satisfy</h3>
<ul class="modal-crit">
  <li><b>Starts from the real home</b> — the actual landing screen is unchanged; a mode-select step comes after it.</li>
  <li><b>Invite by link</b> — a friend joins by opening a URL, with no account or setup to accept.</li>
  <li><b>Automatch</b> — pair with whoever's waiting, and never leave someone waiting forever.</li>
  <li><b>Lobby</b> — both players see each other, pick fighters and a <b>shared stage</b>, and ready up.</li>
  <li><b>Rematch</b> — run it back by mutual agreement, without exchanging a new link.</li>
  <li><b>Connection feedback</b> — a player can tell <i>"it's the network"</i> from <i>"the game broke"</i> (unstable vs. left).</li>
  <li><b>Identity</b> — a name kept in the browser, no accounts; renaming keeps your record.</li>
  <li><b>Leaderboard</b> — wins and losses, multiplayer matches only.</li>
  <li><b>One fixed window</b> — everything lives inside the game's fixed 16:9 stage window; theme is per-player and layered on later.</li>
</ul>
<p class="modal-foot">Read the map with the <b>Key</b> (top-left). Cards marked <b>NEW</b> are added by this work; unmarked screens already exist and are reused.</p>
`,
};

export const NEW_SCREENS = new Set([]);

export const FRAMES = [
  // ── col 0 · HOME (the real current landing — start here) ─────
  {
    id: "home", title: "1 · Home", tag: "/ · REQUIREMENT: fit, no scroll", col: 0, lane: 1, w: 380, type: "stage", route: "/ · home",
    desc: "The landing screen — hero, tagline, blurb, primary CTA, feature cards. <b>Hard requirement (your note): it must fit entirely within the fixed 16:9 game window, with NO scrolling on first load</b> (today the page can scroll — that's out; everything is composed to one view). ‘Choose fighters’ leads to a new Mode Select step (next). A <b>Leaderboard</b> entry sits here too — standings are viewable without playing a match.",
    wire: stage("/ · home", col(
      note("INTERNAL · AGENCY SIMULATOR"),
      box("ROCK-EM-SOCK-EM", "hero"),
      note("Prompt Wars"),
      note("Two AI agents enter the arena. One leaves with its context window intact."),
      row(btn("Choose fighters", "s-act"), pill("How to play"), pill("Leaderboard ▸", "s-net")),
      row(box("Local 2P", "grow"), box("Roster", "grow"), box("AI flavor", "grow")),
    )),
  },

  // ── col 1 · MODE SELECT + identity overlay ───────────────
  {
    id: "mode-select", title: "2 · Mode Select", tag: "/play/mode · fork after home", col: 1, lane: 1, w: 340, type: "stage", route: "/play/mode",
    desc: "New step inserted <b>after</b> the home screen. Today ‘Choose fighters’ goes straight to local select; multiplayer forks it here into the three modes. <b>Play Online is the headline (primary action)</b> — it's the point of this work; Local 2P and vs-Computer are secondary. Modes are environment-flag-gated: a <b>disabled mode is absent, not greyed out</b>. (Plan: 017 mode framework.)",
    wire: stage("/play/mode", col(
      note("how do you want to play?"),
      btn("▶ Play Online — friend or random", "s-act primary"),
      note("— or —"),
      btn("Two Players — same keyboard", "ghost"),
      btn("vs Computer", "ghost"),
    )),
  },
  {
    id: "local2p", title: "2a · Local 2P", tag: "/select → /play · EXISTING", col: 3, lane: 0, w: 300, type: "stage", route: "/select",
    desc: "The existing same-keyboard flow. Must not regress. Unchanged by multiplayer — just now reached via Mode Select. It flows into the <b>shared Character Select</b> (both P1 &amp; P2 on one keyboard) — the same select node every mode uses.",
    wire: stage("/select · local", col(note("two players · one keyboard"), row(box("P1", "s-you"), box("P2", "grow")), btn("→ shared character select", "s-act"))),
  },
  {
    id: "vs-cpu", title: "2b · vs Computer", tag: "/play · built last · reuses /play", col: 3, lane: 2, w: 300, type: "stage", route: "/play",
    desc: "Single-player stand-in, built last — <b>ignore for now</b>. Uses the <b>same shared Character Select</b> as every mode: you pick your fighter, the CPU’s is auto-assigned. All modes share this select; it just behaves differently per game type. Same input path a remote player uses; bot matches never touch the leaderboard.",
    wire: stage("/play · vs cpu", col(note("practice vs a simple bot"), row(box("YOU", "s-you"), box("CPU auto", "grow")), box("→ shared character select · CPU auto-picks", "s-act"), box("not recorded to leaderboard", "s-net"))),
  },

  // ── col 2 · online entry (create / join / automatch) ─────
  {
    id: "identity", title: "3 · Name / Identity", tag: "/play/mode · overlay", col: 1, lane: 0, w: 320, type: "stage", route: "/play/mode (overlay)",
    desc: "First-time <b>create-side</b> online use (or storage empty). A durable player id is minted; the name is only the display label. No account. <b>Invited newcomers do NOT hit this step</b> — they name themselves <b>inline on Join</b> (fewest steps for a cold arrival). This overlay covers only the player starting a match.",
    wire: stage("name entry", col(note("pick a name — no signup"), inp("your name…", "s-you"), btn("Continue", "s-act"), note("stored on device · rename later keeps your record"))),
  },
  {
    id: "create", title: "4 · Create & Invite", tag: "/online · create", col: 2, lane: 1, w: 360, type: "stage", route: "/online",
    desc: "‘Play Online’ → create a private match (server-issued id) and share the link, or automatch. <b>States:</b> default (link + copy) · <b>waiting</b> (invited, none joined) · <b>cancel</b> (kills the match → back to Mode Select) · <b>nobody-joined timeout</b> (~60s → nudge to automatch or exit). The <b>waiting area is a self-contained slot</b> — minimal now (status + cancel), so richer filler (stage preview / move list) drops in later without touching create/queue logic. Also carries a <b>Leaderboard</b> entry. Copy says ‘playing as ⟨name⟩’ — there are no accounts.",
    wire: stage("/online · create", col(
      row(av("YOU", "s-you"), box("playing as ⟨name⟩", "grow")),
      note("send this to a friend"),
      row(inp("…/m/AB12CD", "s-act"), btn("Copy", "s-act")),
      box("◔ waiting for opponent… · 0:47", "s-wait"),
      note("waiting slot — minimal (status + cancel); rich filler drops in here later"),
      row(btn("Cancel", "s-err"), pill("⚄ Automatch", "s-act"), pill("Leaderboard ▸", "s-net")),
      note("nobody after ~60s → suggest automatch or exit"),
    )),
  },
  {
    id: "join", title: "4b · Join by Link", tag: "/m/AB12CD · direct, no code", col: 2, lane: 2, w: 340, type: "stage", route: "/m/AB12CD",
    desc: "Opening the invite link drops you <b>directly into the match that was set up — no code to enter</b> (the link IS the join). A returning player lands straight in the lobby; a brand-new player just adds a name inline, then they're in — this is the <b>only</b> name step on the invite path (no separate identity screen). <b>Edge cases below are drawn faces, each with a way forward:</b> expired/dead-match link · match full / third person · link opened twice (second tab) · you open your own link.",
    wire: stage("/m/AB12CD", col(
      box("Joining PlayerName's match", "s-opp"),
      note("no code to type — the link brought you straight here"),
      inp("your name… (new? add one)", "s-opp"),
      btn("Join now", "s-act"),
      note("— edge cases —"),
      box("⌛ link expired — match no longer open", "s-err"),
      box("● match full — you're a third person → spectate? / new match", "s-wait"),
      box("↻ opened twice / your own link → resume, don't double-join", "s-wait"),
    )),
  },

  // ── col 3 · lobby / automatch ────────────────────────────────
  {
    id: "automatch", title: "4c · Automatch / Waiting", tag: "/online · queue", col: 2, lane: 0, w: 340, type: "stage", route: "/online · queue",
    desc: "No link — pair with whoever’s waiting. <b>Bounded queue (never lingers):</b> searching → matched, or a <b>~60s timeout</b> with a drawn resolution (keep waiting / back to Mode Select). <b>Cancel has a wired destination.</b> Bot-practice filler is gated behind vs-CPU shipping — a <b>bot-free waiting form exists for launch</b> (online ships before the bot).",
    wire: stage("/online · finding", col(
      box("◍ searching…  0:12", "s-wait"),
      note("bounded — never lingers"),
      box("⌛ ~60s, nobody yet → keep waiting / exit", "s-wait"),
      btn("Practice vs Computer  (once vs-CPU ships)", "ghost"),
      btn("Cancel → Mode Select", "s-err"),
    )),
  },
  {
    id: "lobby", title: "5 · Lobby — persistent shell", tag: "/online · lobby · PERSISTENT shell", col: 3, lane: 1, w: 400, type: "stage", route: "/online · lobby",
    desc: "<b>The persistent frame that holds the entire online setup.</b> Both players present (you=green, rival=cyan); <b>presence + connection stay visible the whole time</b>. Character select and stage select render as <b>panels INSIDE this shell</b> — not as separate destinations — so the opponent never disappears while you pick. <b>Ready-up lives here, after both picks resolve;</b> mutual ready → fight. If the opponent <b>drops during setup</b>, the remaining player sees a drawn state and holds (link stays alive) or starts a new match. Theme is per-player; the <b>stage is shared</b>.",
    wire: stage("/online · lobby", col(
      note("persistent shell — presence + connection persist across every pick"),
      row(col(av("P1", "s-you"), box("You", "s-you")), box("● ~40ms", "s-net"), col(av("P2", "s-opp"), box("Rival", "s-opp"))),
      row(box("▸ character select", "grow"), box("▸ stage select", "grow")),
      note("pickers are panels in this shell, not separate screens"),
      row(box("You ✓ ready", "s-you grow"), box("Rival: picking…", "s-opp")),
      btn("✓ Ready  (enabled after both pick)", "s-act"),
      box("⚠ opponent left mid-setup → hold (link alive) / new match", "s-wait"),
    )),
  },

  // ── col 4–5 · reused pick screens ────────────────────────────
  {
    id: "select", title: "6 · Character Select", tag: "/select · EXISTING · SHARED by every mode", col: 4, lane: 1, w: 360, type: "stage", route: "/select",
    desc: "The real character picker — <b>one shared screen every game type routes into</b>. Same node, <b>behaves differently per mode</b>: <b>Local 2P</b> picks both slots on one keyboard · <b>Online</b> picks <b>one slot</b> — yours (green) while the opponent’s streams in (cyan); rendered <b>inside the lobby shell</b> (presence + connection header persist) · <b>vs-CPU</b> picks yours, CPU auto. <b>Mirror matches are allowed</b> — picking a fighter does NOT lock it out for the other player. Existing screen, adapted.",
    wire: stage("/select", `<div class="wf-screen">
      <div class="wf-screen-h">Select fighters <span class="wf-dim">· shared · online: inside lobby shell</span></div>
      ${row(pill("P1 · you", "s-you"), pill("P2 · rival / CPU", "s-opp"), pill("mirror ok", "s-net"))}
      ${grid(3, [cell("QA Goblin", "s-you"), cell("Scope Creep"), cell("Deploy Demon"), cell("Refactor"), cell("Merge Bot"), cell("Null Ptr")])}
      ${row(box("your pick ✓", "s-you grow"), box("opponent: picking…", "s-opp"), btn("Confirm", "s-act"))}
    </div>`),
  },
  {
    id: "stage-sel", title: "7 · Stage Select", tag: "/stage · EXISTING · shared, per-mode", col: 5, lane: 1, w: 360, type: "stage", route: "/stage",
    desc: "The real stage picker (35 stages, grouped; grid <b>scrolls internally</b> with header / timer / confirm pinned). <b>Online:</b> both pick, see each other’s pick <b>live</b>, <b>60s timer</b>; resolves — agree → that · differ → random of the two · one picks → theirs · neither → random. <b>Pick-vs-confirm:</b> your current selection counts as your pick at timer expiry; Confirm just locks it early. <b>Local 2P / vs-CPU:</b> a <b>single</b> stage pick by the human(s) — <b>no live-opponent overlay, no negotiation, no 60s timer</b>. Result writes to MatchConfig, then the fight.",
    wire: stage("/stage", `<div class="wf-screen">
      <div class="wf-screen-h">Choose Your Stage <span class="wf-dim">· online: both pick · ⏱ 0:60</span></div>
      ${row(pill("you", "s-you"), pill("rival", "s-opp"), pill("scrolls ⇕", "s-net"))}
      <div class="wf-group-label">infra · meetings · … (35 stages)</div>
      ${grid(6, [cell("✓ you", "s-you"), cell(), cell("rival", "s-opp"), cell(), cell(), cell()])}
      ${row(box("agree→that · differ→random of 2 · one→theirs · none→random", "s-wait grow"))}
      ${row(box("selection = your pick at 0:00", "grow"), btn("Confirm (lock early)", "s-act"))}
      ${row(box("local / vs-CPU: single pick, no timer/overlay", "grow"))}
    </div>`),
  },

  // ── col 6 · the fight + its overlays/page ────────────────────
  {
    id: "diagnostics", title: "8b · Diagnostics Drawer", tag: "/play · 011.13 · OUTSIDE window", col: 6, lane: 0, w: 460, type: "page", route: "/play",
    desc: "Opened from the fight's <b>settings gear</b>; a left-edge drawer on the <b>page</b>, outside the 16:9 game window so it never crosses the action. NOT theme-aware (fixed diagnostic chrome). Reads the one shared metrics source (011.15) — the same tier the result 'recorded' chip reports.",
    wire: page("/play", `<div class="wf-page-split">
      <div class="wf-drawer">
        <div class="wf-drawer-h">DIAGNOSTICS <span class="wf-dim">(not themed)</span></div>
        ${row(box("RTT p50/p95", "k"), box("41 / 88 ms", "v s-net"))}
        ${row(box("felt lag", "k"), box("5.1 frames", "v s-net"))}
        ${row(box("fps / throttle", "k"), box("60 · ok", "v s-net"))}
        ${row(box("storage tier", "k"), box("sqlite-local", "v s-net"))}
        ${row(box("build", "k"), box("1f720c4", "v s-net"))}
      </div>
      ${gameWindow(`<div class="wf-mini-arena">${bars()}${note("the fight — unobstructed")}</div>`)}
    </div>`),
  },
  {
    id: "fight", title: "8 · The Fight", tag: "/play · fight + net overlays", col: 6, lane: 1, w: 440, type: "stage", route: "/play",
    desc: "The real fight: Phaser canvas (fighters + stage bg) with the React FightHUD (health / confidence / special bars, announcer, round). Multiplayer adds a small <b>connection chip (online only)</b> and a <b>settings gear that opens the diagnostics drawer</b>. The <b>diagnostics rail lives OUTSIDE the 16:9 window</b> — on the page, never inside the arena (see 8b). HUD name slots <b>truncate/ellipsis</b> hostile-length usernames. Host-authoritative: host sims, guest renders + predicts its own character.",
    wire: stage("/play", `<div class="wf-fight">
        <div class="wf-arena-full">
          ${fightHud()}
          <div class="wf-fighters">${av("P1", "s-you")}${box("VS", "vs")}${av("P2", "s-opp")}</div>
          <div class="wf-conn-chip s-net">● 41ms · online only</div>
          <div class="wf-gear" title="settings → diagnostics">⚙ settings</div>
        </div>
      </div>`),
  },
  {
    id: "conn", title: "8c · Connection States", tag: "/play · 011.8/011.9 · overlays", col: 6, lane: 2, w: 400, type: "stage", route: "/play (overlays)",
    desc: "Distinct, honestly-triggered states, and <b>every one resolves</b> (no dead ends): reconnected → back to the fight; window-elapsed / opponent-left → forfeit-WIN result; <b>your own drop → forfeit-LOSS result</b>. ‘Unstable’ (RTT/heartbeat, amber) ≠ ‘away’ (tab hidden, grace) ≠ ‘left’ (socket closed, red). Version-mismatch and server-restart read as ‘retry/refresh’, not error. Host stalling freezes both → guest detects it independently.",
    wire: col(
      box("⚠ Opponent unstable — holding… (amber)", "s-wait"),
      box("◍ Opponent away — tab hidden · grace 0:20", "s-wait"),
      box("⤺ Reconnecting… 0:06 left → back to fight", "s-wait"),
      box("✕ Opponent left → forfeit WIN → result", "s-err"),
      box("✕ You dropped → forfeit LOSS → result", "s-err"),
      box("↻ Please refresh — build changed", "s-net"),
      box("↻ Server restarting — retrying (not an error)", "s-net"),
    ),
  },

  // ── col 7 · result / rematch ─────────────────────────────────
  {
    id: "result", title: "9 · Result", tag: "/play · result · modal over the game", col: 7, lane: 1, w: 360, type: "stage", route: "/play · result",
    desc: "A <b>modal floating over the dimmed fight</b> — not a separate page. One honest result, recorded once. <b>Five faces, shown distinctly:</b> win · loss · forfeit-win (‘opponent left’) · forfeit-loss · <b>draw</b> (double-KO / time expiry). <b>Per-mode recording:</b> Online → recorded, with the honest storage-tier chip + Rematch/Leaderboard · Local 2P → not recorded (existing unilateral rematch) · vs-CPU → never recorded. The <b>guest sees identical chrome</b> (host reports the result); the ‘recorded’ chip shows a failure/cache caveat honestly. Forfeits carry an <b>FF</b> tag. <b>Exit → Home.</b>",
    wire: stage("/play · win", `<div class="wf-modal-over">
      <div class="wf-behind">${row(av("P1", "s-you"), box("VS", "vs"), av("P2", "s-opp"))}</div>
      <div class="wf-winmodal">
        ${box("YOU WIN!", "hero s-you")}
        ${box("recorded · #AB12CD · sqlite-local", "s-net")}
        ${row(btn("↻ Rematch", "s-act"), btn("Leaderboard", "s-act"))}
        ${btn("Exit → Home")}
      </div>
    </div>
    ${row(box("WIN", "s-you"), box("LOSS", "s-opp"), box("WIN·FF", "s-wait"), box("LOSS·FF", "s-err"), box("DRAW", "grow"))}
    ${note("faces: win · loss · forfeit-win · forfeit-loss · draw — online only records")}`),
  },
  {
    id: "rematch", title: "10 · Rematch", tag: "/online · lobby · full re-pick", col: 7, lane: 0, w: 340, type: "stage", route: "/online · lobby",
    desc: "Run it back with mutual agreement — the lobby survives match end, no new link. <b>Full re-pick:</b> agreement sends both players <b>back through character + stage select inside the lobby shell</b> (not straight to the fight). <b>States:</b> agree · <b>opponent declines</b> · <b>opponent exits to Home while you wait</b> · <b>offer timeout</b>.",
    wire: stage("rematch", col(
      row(box("You ✓", "s-you"), box("Rival …", "s-opp")),
      note("both agree → full re-pick (fighters + stage, in the lobby)"),
      btn("✓ Rematch", "s-act"),
      box("✕ Rival declined → result / Home", "s-err"),
      box("… Rival left while you waited → offer times out", "s-wait"),
    )),
  },

  // ── col 8 · leaderboard ──────────────────────────────────────
  {
    id: "leaderboard", title: "11 · Leaderboard", tag: "/leaderboard · 015 + 009.9", col: 8, lane: 1, w: 380, type: "stage", route: "/leaderboard",
    desc: "Standings — online matches only, one record per player (survives renames). <b>Reachable any time</b> (from Home, Create, and the result) with an <b>Exit → Home</b>. <b>Display:</b> top ~10, and if you're outside it your own row is <b>pinned</b> below; scrolls inside the fixed window. <b>Empty state</b> at launch is the first thing everyone sees. Forfeits count as normal W/L (the <b>FF</b> tag lives on the match result, not here — standings stay clean W–L). Always states, <b>accurately</b>, the live storage tier so an ephemeral board is never mistaken for durable.",
    wire: stage("/leaderboard", col(
      box("⛭ storage: server-cache — live session, resets on restart", "s-net"),
      col(row(box("1 · Rival", "grow s-opp"), pill("9–2")), row(box("2 · You", "grow s-you"), pill("7–3")), row(box("3 · Guest42", "grow"), pill("1–5"))),
      note("… top 10 · scrolls inside window ⇕ …"),
      row(box("47 · You  (pinned when outside top-N)", "grow s-you"), pill("7–3")),
      note("empty at launch: ‘no matches yet — play online to rank’"),
      row(box("online only · bot games excluded", "grow"), btn("Exit → Home", "s-act")),
    )),
  },
];

// Derive the NEW badge from the set above — the ONE place to edit classifications.
FRAMES.forEach((f) => { f.isNew = NEW_SCREENS.has(f.id); });

export const LINKS = [
  { from: "home", to: "mode-select", label: "Choose fighters" },
  { from: "mode-select", to: "local2p", label: "Local 2P" },
  { from: "mode-select", to: "vs-cpu", label: "vs Computer" },
  { from: "mode-select", to: "identity", label: "Play Online (first time)" },
  { from: "mode-select", to: "create", label: "Play Online" },
  { from: "identity", to: "create", label: "" },
  { from: "create", to: "lobby", label: "friend joins" },
  { from: "join", to: "lobby", label: "opens link" },
  { from: "create", to: "automatch", label: "or automatch" },
  { from: "automatch", to: "lobby", label: "matched" },
  { from: "lobby", to: "select", label: "pick fighters" },
  { from: "local2p", to: "select", label: "shared character select" },
  { from: "vs-cpu", to: "select", label: "shared character select" },
  { from: "select", to: "stage-sel", label: "" },
  { from: "stage-sel", to: "fight", label: "both ready" },
  { from: "fight", to: "diagnostics", label: "open diagnostics" },
  { from: "fight", to: "conn", label: "network event" },
  { from: "conn", to: "fight", label: "reconnected" },
  { from: "conn", to: "result", label: "forfeit" },
  { from: "fight", to: "result", label: "KO / time" },
  { from: "result", to: "rematch", label: "run it back" },
  { from: "result", to: "leaderboard", label: "recorded" },
  { from: "rematch", to: "select", label: "again · full re-pick" },
  { from: "home", to: "leaderboard", label: "standings (anytime)" },
  { from: "leaderboard", to: "home", label: "exit" },
];

// Legend / key — rendered by app.js.
export const LEGEND = {
  color: [
    ["s-act", "Action / navigation", "primary buttons, links that move you forward"],
    ["s-you", "You — local viewer (always green)", "green is ALWAYS whoever is looking at the screen; on the guest's own screen the guest is green. Host/guest is a separate, uncolored attribute. Seats (P1 left / P2 right) are viewer-relative, not a host law."],
    ["s-opp", "Opponent — remote party (always cyan)", "cyan is ALWAYS the other player, on either screen — streamed over the wire"],
    ["s-wait", "Waiting · pending · degraded", "queuing, unstable connection, reconnecting"],
    ["s-err", "Error · disconnect · forfeit", "dropped, left, cancelled"],
    ["s-net", "Network · data · metrics", "RTT/felt lag, storage tier, recorded results, diagnostics"],
  ],
  frame: [
    ["stage", "Game window (16:9)", "true-proportion fixed stage window a screen renders in"],
    ["page", "Whole page", "used when an element (e.g. diagnostics drawer) lives OUTSIDE the game window"],
  ],
};
