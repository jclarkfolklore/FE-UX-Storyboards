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
// NEW vs EXISTING — single source of truth for the ★ NEW badge.
// A frame gets the badge iff its id is in this set. To re-classify a screen,
// add/remove its id HERE — nothing else to touch (isNew is derived below).
//   NEW      = a screen/surface added by the multiplayer work (doesn't exist today)
//   existing = already in the game and reused/adapted (not listed here)
// ─────────────────────────────────────────────────────────────────────────
export const NEW_SCREENS = new Set([
  "mode-select",   // new fork after home (Local · Online · vs-CPU)
  "vs-cpu",        // new mode, built last (reuses /play)
  "identity",      // name/identity — no accounts today
  "create",        // create & invite
  "join",          // join by link
  "automatch",     // matchmaking queue
  "lobby",         // ready-up lobby
  "diagnostics",   // netcode diagnostics drawer
  "conn",          // connection-state overlays
  "result",        // dedicated result surface (today it's a transient HUD banner)
  "rematch",       // networked rematch
  "leaderboard",   // multiplayer leaderboard
]);
// existing/reused (NOT new): home, local2p, select, stage-sel, fight

export const FRAMES = [
  // ── col 0 · HOME (the real current landing — start here) ─────
  {
    id: "home", title: "1 · Home", tag: "/ · REQUIREMENT: fit, no scroll", col: 0, lane: 1, w: 380, type: "stage", route: "/ · home",
    desc: "The landing screen — hero, tagline, blurb, primary CTA, feature cards. <b>Hard requirement (your note): it must fit entirely within the fixed 16:9 game window, with NO scrolling on first load</b> (today the page can scroll — that's out; everything is composed to one view). ‘Choose fighters’ leads to a new Mode Select step (next).",
    wire: stage("/ · home", col(
      note("INTERNAL · AGENCY SIMULATOR"),
      box("ROCK-EM-SOCK-EM", "hero"),
      note("Prompt Wars"),
      note("Two AI agents enter the arena. One leaves with its context window intact."),
      row(btn("Choose fighters", "s-act"), pill("How to play")),
      row(box("Local 2P", "grow"), box("Roster", "grow"), box("AI flavor", "grow")),
    )),
  },

  // ── col 1 · MODE SELECT + identity overlay ───────────────
  {
    id: "mode-select", title: "2 · Mode Select", tag: "NEW — after home", col: 1, lane: 1, w: 340, type: "stage", route: "/play/mode",
    desc: "New step inserted <b>after</b> the home screen. Today ‘Choose fighters’ goes straight to local select; multiplayer forks it here into the three modes. Local 2P is the existing flow; Online and vs-Computer are the branches. (Plan: 017 mode framework.)",
    wire: stage("/play/mode", col(
      note("how do you want to play?"),
      btn("Two Players — same keyboard", "s-act"),
      btn("▶ Play Online — friend or random", "s-act is-new"),
      btn("vs Computer", "s-act"),
    )),
  },
  {
    id: "local2p", title: "2a · Local 2P", tag: "/select → /play · EXISTING", col: 3, lane: 0, w: 300, type: "stage", route: "/select",
    desc: "The existing same-keyboard flow. Must not regress. Unchanged by multiplayer — just now reached via Mode Select. It flows into the <b>shared Character Select</b> (both P1 &amp; P2 on one keyboard) — the same select node every mode uses.",
    wire: stage("/select · local", col(note("two players · one keyboard"), row(box("P1", "s-you"), box("P2", "grow")), btn("→ shared character select", "s-act"))),
  },
  {
    id: "vs-cpu", title: "2b · vs Computer", tag: "NEW · built last · reuses /play", col: 3, lane: 2, w: 300, type: "stage", route: "/play",
    desc: "Single-player stand-in, built last — <b>ignore for now</b>. Uses the <b>same shared Character Select</b> as every mode: you pick your fighter, the CPU’s is auto-assigned. All modes share this select; it just behaves differently per game type. Same input path a remote player uses; bot matches never touch the leaderboard.",
    wire: stage("/play · vs cpu", col(note("practice vs a simple bot"), row(box("YOU", "s-you"), box("CPU auto", "grow")), box("→ shared character select · CPU auto-picks", "s-act"), box("not recorded to leaderboard", "s-net"))),
  },

  // ── col 2 · online entry (create / join / automatch) ─────
  {
    id: "identity", title: "3 · Name / Identity", tag: "NEW · overlay", col: 1, lane: 0, w: 320, type: "stage", route: "/play/mode (overlay)",
    desc: "First time online (or storage empty). A durable player id is minted; the name is only the display label. No account. New players from an invite hit this same step.",
    wire: stage("name entry", col(note("pick a name — no signup"), inp("your name…", "s-you"), btn("Continue", "s-act"), note("stored on device · rename later keeps your record"))),
  },
  {
    id: "create", title: "4 · Create & Invite", tag: "NEW", col: 2, lane: 1, w: 360, type: "stage", route: "/online",
    desc: "‘Play Online’ → create a private match (server-issued id) and share the link, or automatch. Clear waiting state + cancel.",
    wire: stage("/online · create", col(
      row(av("YOU", "s-you"), box("signed in", "grow")),
      note("send this to a friend"),
      row(inp("…/m/AB12CD", "s-act"), btn("Copy", "s-act")),
      box("◔ waiting for opponent…", "s-wait"),
      row(pill("＋ Create"), pill("⚄ Automatch", "s-act")),
    )),
  },
  {
    id: "join", title: "4b · Join by Link", tag: "NEW · direct, no code", col: 2, lane: 2, w: 340, type: "stage", route: "/m/AB12CD",
    desc: "Opening the invite link drops you <b>directly into the match that was set up — no code to enter</b> (the link IS the join, per your note). A returning player lands straight in the lobby; a brand-new player just adds a name, then they're in. Still handles a link opened twice / by a third person.",
    wire: stage("/m/AB12CD", col(
      box("Joining PlayerName's match", "s-opp"),
      note("no code to type — the link brought you straight here"),
      inp("your name… (new? add one)", "s-opp"),
      btn("Join now", "s-act"),
    )),
  },

  // ── col 3 · lobby / automatch ────────────────────────────────
  {
    id: "automatch", title: "4c · Automatch / Waiting", tag: "NEW", col: 2, lane: 0, w: 340, type: "stage", route: "/online · queue",
    desc: "No link — pair with whoever’s waiting. A bounded queue (never lingers) + ‘something to do while waiting’ (bot practice).",
    wire: stage("/online · finding", col(box("◍ searching…  0:12", "s-wait"), note("nobody yet — warm up?"), btn("Practice vs Computer", "s-act"), btn("Cancel", "s-err"))),
  },
  {
    id: "lobby", title: "5 · Lobby (ready-up)", tag: "NEW · wraps select+stage", col: 3, lane: 1, w: 400, type: "stage", route: "/online · lobby",
    desc: "Both players present. See each other (you=green, opponent=cyan), go through character + stage picks together, then ready up. Theme is per-player; the <b>stage is shared</b>. Mutual ready → fight.",
    wire: stage("/online · lobby", col(
      row(col(av("P1", "s-you"), box("You ✓", "s-you")), col(av("P2", "s-opp"), box("Rival …", "s-opp"))),
      row(box("fighters ▸", "grow"), box("shared stage ▸", "grow")),
      box("● connected · ~40ms", "s-net"),
      btn("✓ Ready", "s-act"),
    )),
  },

  // ── col 4–5 · reused pick screens ────────────────────────────
  {
    id: "select", title: "6 · Character Select", tag: "/select · EXISTING · SHARED by every mode", col: 4, lane: 1, w: 360, type: "stage", route: "/select",
    desc: "The real character picker — <b>one shared screen every game type routes into</b> (Local 2P, Online, vs-Computer). It’s the same node; it just <b>behaves differently per mode</b>: <b>Local 2P</b> picks both slots on one keyboard · <b>Online</b> picks <b>one slot</b> — yours (green) while the opponent’s streams in (cyan, remote) · <b>vs-CPU</b> picks yours, the CPU is auto. Existing screen, adapted.",
    wire: stage("/select", `<div class="wf-screen">
      <div class="wf-screen-h">Select fighters <span class="wf-dim">· shared by all modes</span></div>
      ${row(pill("P1 · you", "s-you"), pill("P2 · rival / CPU", "s-opp"))}
      ${grid(3, [cell("QA Goblin", "s-you"), cell("Scope Creep"), cell("Deploy Demon"), cell("Refactor"), cell("Merge Bot"), cell("Null Ptr")])}
      ${row(box("your pick ✓", "s-you grow"), box("opponent: picking…", "s-opp"), btn("Confirm", "s-act"))}
    </div>`),
  },
  {
    id: "stage-sel", title: "7 · Stage Select", tag: "/stage · EXISTING · both-pick, 60s", col: 5, lane: 1, w: 360, type: "stage", route: "/stage",
    desc: "The real stage picker (35 stages, grouped). <b>Two-player resolution (your rules):</b> <b>both</b> players pick a preferred stage and can <b>see the other’s pick live</b>; a <b>60-second</b> timer runs, and both must confirm. Then it resolves: <b>both agree</b> → that stage · <b>differ</b> → one of the two is chosen at random · <b>only one picks</b> → theirs · <b>neither picks</b> (timeout) → a random stage. Result writes to MatchConfig, then the fight.",
    wire: stage("/stage", `<div class="wf-screen">
      <div class="wf-screen-h">Choose Your Stage <span class="wf-dim">· both pick · ⏱ 0:60</span></div>
      ${row(pill("you", "s-you"), pill("rival", "s-opp"))}
      <div class="wf-group-label">infra · meetings · …</div>
      ${grid(6, [cell("✓ you", "s-you"), cell(), cell("rival", "s-opp"), cell(), cell(), cell()])}
      ${row(box("agree → that stage · differ → random of the two", "grow"))}
      ${row(box("one picks → theirs · neither → random", "s-wait grow"), btn("Confirm", "s-act"))}
    </div>`),
  },

  // ── col 6 · the fight + its overlays/page ────────────────────
  {
    id: "diagnostics", title: "8b · Diagnostics Drawer", tag: "NEW · 011.13 · OUTSIDE window", col: 6, lane: 0, w: 460, type: "page", route: "/play",
    desc: "Opened from settings; a left-edge drawer on the <b>page</b>, outside the 16:9 game window so it never crosses the action. NOT theme-aware (fixed diagnostic chrome). Reads the one shared metrics source (011.15).",
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
    id: "fight", title: "8 · The Fight", tag: "/play · EXISTING + NEW overlays", col: 6, lane: 1, w: 440, type: "stage", route: "/play",
    desc: "The real fight: Phaser canvas (fighters + stage bg) with the React FightHUD (health / confidence / special bars, announcer, round). Multiplayer adds a small <b>connection chip</b> + the left-edge <b>diagnostics rail</b>. Host-authoritative: host sims, guest renders + predicts its own character.",
    wire: stage("/play", `<div class="wf-fight">
        <div class="wf-diag-rail s-net" title="diagnostics (collapsed)">DIAG</div>
        <div class="wf-arena-full">
          ${fightHud()}
          <div class="wf-fighters">${av("P1", "s-you")}${box("VS", "vs")}${av("P2", "s-opp")}</div>
          <div class="wf-conn-chip s-net">● 41ms</div>
        </div>
      </div>`),
  },
  {
    id: "conn", title: "8c · Connection States", tag: "NEW · 011.8/011.9", col: 6, lane: 2, w: 380, type: "stage", route: "/play (overlays)",
    desc: "Distinct, honestly-triggered states. ‘Unstable’ (RTT/heartbeat thresholds, amber) is clearly different from ‘left’ (socket closed / window elapsed, red). Host stalling freezes both → guest detects it independently.",
    wire: col(
      box("⚠ Opponent unstable — holding…", "s-wait"),
      box("⤺ Reconnecting… 0:06 left", "s-wait"),
      box("✕ Opponent left → forfeit win", "s-err"),
    ),
  },

  // ── col 7 · result / rematch ─────────────────────────────────
  {
    id: "result", title: "9 · Result", tag: "NEW · modal over the game", col: 7, lane: 1, w: 360, type: "stage", route: "/play · result",
    desc: "The win state is a <b>modal that floats over the game screen</b> (per your note) — the fight stays visible, dimmed, behind it; it's not a separate page. One honest result, recorded once. Win / loss / forfeit shown distinctly. <b>Exiting the modal takes you back home.</b>",
    wire: stage("/play · win", `<div class="wf-modal-over">
      <div class="wf-behind">${row(av("P1", "s-you"), box("VS", "vs"), av("P2", "s-opp"))}</div>
      <div class="wf-winmodal">
        ${box("YOU WIN!", "hero s-you")}
        ${box("recorded · match #AB12CD", "s-net")}
        ${row(btn("↻ Rematch", "s-act"), btn("Leaderboard", "s-act"))}
        ${btn("Exit → Home")}
      </div>
    </div>`),
  },
  {
    id: "rematch", title: "10 · Rematch", tag: "NEW", col: 7, lane: 0, w: 320, type: "stage", route: "/online · lobby",
    desc: "Run it back with mutual agreement — the lobby survives match end, no new link. Loops back to the fight.",
    wire: stage("rematch", col(row(box("You ✓", "s-you"), box("Rival …", "s-opp")), note("both agree → back to the fight"), btn("✓ Rematch", "s-act"))),
  },

  // ── col 8 · leaderboard ──────────────────────────────────────
  {
    id: "leaderboard", title: "11 · Leaderboard", tag: "NEW · 015 + 009.9", col: 8, lane: 1, w: 380, type: "stage", route: "/leaderboard",
    desc: "Standings — online matches only, one record per player (survives renames). Always states, <b>accurately</b>, which storage tier is live (durable / sqlite / server-cache) so an ephemeral ‘live session’ board is never mistaken for durable.",
    wire: stage("/leaderboard", col(
      box("⛭ storage: server-cache — live session, resets on restart", "s-net"),
      col(row(box("1 · Rival", "grow s-opp"), pill("9–2")), row(box("2 · You", "grow s-you"), pill("7–3")), row(box("3 · Guest42", "grow"), pill("1–5"))),
      note("online only · bot games excluded"),
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
  { from: "fight", to: "result", label: "KO / time" },
  { from: "result", to: "rematch", label: "run it back" },
  { from: "result", to: "leaderboard", label: "recorded" },
  { from: "rematch", to: "fight", label: "again" },
];

// Legend / key — rendered by app.js.
export const LEGEND = {
  color: [
    ["s-act", "Action / navigation", "primary buttons, links that move you forward"],
    ["s-you", "You · host · local player", "your slot, your inputs, your health"],
    ["s-opp", "Opponent · remote · guest", "the other player, streamed over the wire"],
    ["s-wait", "Waiting · pending · degraded", "queuing, unstable connection, reconnecting"],
    ["s-err", "Error · disconnect · forfeit", "dropped, left, cancelled"],
    ["s-net", "Network · data · metrics", "RTT/felt lag, storage tier, recorded results, diagnostics"],
  ],
  marker: [
    ["is-new", "NEW for multiplayer", "added by this work; unmarked cards are existing screens, reused"],
  ],
  frame: [
    ["stage", "Game window (16:9)", "true-proportion fixed stage window a screen renders in"],
    ["page", "Whole page", "used when an element (e.g. diagnostics drawer) lives OUTSIDE the game window"],
  ],
};
