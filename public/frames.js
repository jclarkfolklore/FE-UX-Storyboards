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

export const FRAMES = [
  // ── col 0 · HOME (the real current landing — start here) ─────
  {
    id: "home", title: "1 · Home", tag: "/ · EXISTING — unchanged", col: 0, lane: 1, w: 380, type: "stage", route: "/ · home",
    desc: "The <b>actual current landing</b>, exactly as it is today — hero, tagline, blurb, ‘Choose fighters’ + ‘How to play’, and the three feature cards. <b>Multiplayer changes nothing on this screen.</b> The only difference downstream: ‘Choose fighters’ now leads to a Mode Select step (next) instead of straight to local character select.",
    wire: stage("/ · home", col(
      note("INTERNAL · AGENCY SIMULATOR"),
      box("ROCK-EM-SOCK-EM", "hero"),
      note("Prompt Wars"),
      note("Two AI agents enter the arena. One leaves with its context window intact."),
      row(btn("Choose fighters", "s-act"), pill("How to play")),
      row(box("Local 2P", "grow"), box("Roster", "grow"), box("AI flavor", "grow")),
    )),
  },

  // ── col 1 · MODE SELECT (new step, AFTER home) ───────────────
  {
    id: "mode-select", title: "2 · Mode Select", tag: "NEW — after home", col: 1, lane: 1, w: 340, type: "stage", route: "/play/mode", isNew: true,
    desc: "New step inserted <b>after</b> the home screen. Today ‘Choose fighters’ goes straight to local select; multiplayer forks it here into the three modes. Local 2P is the existing flow; Online and vs-Computer are the branches. (Plan: 017 mode framework.)",
    wire: stage("/play/mode", col(
      note("how do you want to play?"),
      btn("Two Players — same keyboard", "s-act"),
      btn("▶ Play Online — friend or random", "s-act is-new"),
      btn("vs Computer", "s-act"),
    )),
  },
  {
    id: "local2p", title: "2a · Local 2P", tag: "/select → /play · EXISTING", col: 1, lane: 0, w: 300, type: "stage", route: "/select",
    desc: "The existing same-keyboard flow. Must not regress. Unchanged by multiplayer — just now reached via Mode Select.",
    wire: stage("/select · local", col(note("two players · one keyboard"), row(box("P1", "s-you"), box("P2", "grow")), btn("Start"))),
  },
  {
    id: "vs-cpu", title: "2b · vs Computer", tag: "EXISTING (built last)", col: 1, lane: 2, w: 300, type: "stage", route: "/play",
    desc: "Single-player stand-in, built last. Same input path a remote player uses. Bot matches never touch the leaderboard.",
    wire: stage("/play · vs cpu", col(note("practice vs a simple bot"), row(box("YOU", "s-you"), box("CPU", "grow")), box("not recorded to leaderboard", "s-net"))),
  },

  // ── col 2 · online entry ─────────────────────────────────────
  {
    id: "identity", title: "3 · Name / Identity", tag: "NEW · overlay", col: 2, lane: 0, w: 320, type: "stage", route: "/play/mode (overlay)", isNew: true,
    desc: "First time online (or storage empty). A durable player id is minted; the name is only the display label. No account. New players from an invite hit this same step.",
    wire: stage("name entry", col(note("pick a name — no signup"), inp("your name…", "s-you"), btn("Continue", "s-act"), note("stored on device · rename later keeps your record"))),
  },
  {
    id: "create", title: "4 · Create & Invite", tag: "NEW", col: 2, lane: 1, w: 360, type: "stage", route: "/online", isNew: true,
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
    id: "join", title: "4b · Join by Link", tag: "NEW", col: 2, lane: 2, w: 340, type: "stage", route: "/m/AB12CD", isNew: true,
    desc: "The friend opens the link. Brand-new player → name → straight in. Handles link opened twice / by a third person.",
    wire: stage("/m/AB12CD", col(note("PlayerName invited you"), inp("your name… (new here)", "s-opp"), btn("Join the Match", "s-act"), note("opened elsewhere already? we say so, not fail silently"))),
  },

  // ── col 3 · lobby / automatch ────────────────────────────────
  {
    id: "automatch", title: "4c · Automatch / Waiting", tag: "NEW", col: 3, lane: 2, w: 340, type: "stage", route: "/online · queue", isNew: true,
    desc: "No link — pair with whoever’s waiting. A bounded queue (never lingers) + ‘something to do while waiting’ (bot practice).",
    wire: stage("/online · finding", col(box("◍ searching…  0:12", "s-wait"), note("nobody yet — warm up?"), btn("Practice vs Computer", "s-act"), btn("Cancel", "s-err"))),
  },
  {
    id: "lobby", title: "5 · Lobby (ready-up)", tag: "NEW · wraps select+stage", col: 3, lane: 1, w: 400, type: "stage", route: "/online · lobby", isNew: true,
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
    id: "select", title: "6 · Character Select", tag: "/select · EXISTING (online: 1 slot)", col: 4, lane: 1, w: 360, type: "stage", route: "/select",
    desc: "The real character picker. Online reuses it for <b>one slot at a time</b> — you pick yours (green); the opponent’s pick streams in (cyan, remote). Existing screen, adapted.",
    wire: stage("/select", `<div class="wf-screen">
      <div class="wf-screen-h">Select fighters</div>
      ${row(pill("P1 · you", "s-you"), pill("P2 · rival", "s-opp"))}
      ${grid(3, [cell("QA Goblin", "s-you"), cell("Scope Creep"), cell("Deploy Demon"), cell("Refactor"), cell("Merge Bot"), cell("Null Ptr")])}
      ${row(box("your pick ✓", "s-you grow"), box("opponent: picking…", "s-opp"), btn("Confirm", "s-act"))}
    </div>`),
  },
  {
    id: "stage-sel", title: "7 · Stage Select", tag: "/stage · EXISTING (shared)", col: 5, lane: 1, w: 340, type: "stage", route: "/stage",
    desc: "The real stage picker (35 stages, grouped). Online: a <b>shared</b> pick — one stage for both. Writes into MatchConfig, then to the fight.",
    wire: stage("/stage", `<div class="wf-screen">
      <div class="wf-screen-h">Choose Your Stage <span class="wf-dim">· shared</span></div>
      <div class="wf-group-label">infra</div>
      ${grid(6, [cell("", "s-act"), cell(), cell(), cell(), cell(), cell()])}
      <div class="wf-group-label">meetings</div>
      ${grid(6, [cell(), cell(), cell(), cell(), cell(), cell()])}
      ${row(box("both see this choice", "s-opp grow"), btn("To the fight", "s-act"))}
    </div>`),
  },

  // ── col 6 · the fight + its overlays/page ────────────────────
  {
    id: "diagnostics", title: "8b · Diagnostics Drawer", tag: "NEW · 011.13 · OUTSIDE window", col: 6, lane: 0, w: 460, type: "page", route: "/play", isNew: true,
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
    id: "conn", title: "8c · Connection States", tag: "NEW · 011.8/011.9", col: 6, lane: 2, w: 380, type: "stage", route: "/play (overlays)", isNew: true,
    desc: "Distinct, honestly-triggered states. ‘Unstable’ (RTT/heartbeat thresholds, amber) is clearly different from ‘left’ (socket closed / window elapsed, red). Host stalling freezes both → guest detects it independently.",
    wire: col(
      box("⚠ Opponent unstable — holding…", "s-wait"),
      box("⤺ Reconnecting… 0:06 left", "s-wait"),
      box("✕ Opponent left → forfeit win", "s-err"),
    ),
  },

  // ── col 7 · result / rematch ─────────────────────────────────
  {
    id: "result", title: "9 · Result", tag: "results · EXISTING (minimal)", col: 7, lane: 1, w: 340, type: "stage", route: "/play · result",
    desc: "The minimal results screen (winner + rematch + return). One honest result recorded once against the server match id. Win/loss/forfeit shown distinctly.",
    wire: stage("result", col(box("YOU WIN!", "hero s-you"), box("recorded · match #AB12CD", "s-net"), row(btn("↻ Rematch", "s-act"), btn("Leaderboard", "s-act")), btn("Leave"))),
  },
  {
    id: "rematch", title: "10 · Rematch", tag: "NEW", col: 7, lane: 0, w: 320, type: "stage", route: "/online · lobby", isNew: true,
    desc: "Run it back with mutual agreement — the lobby survives match end, no new link. Loops back to the fight.",
    wire: stage("rematch", col(row(box("You ✓", "s-you"), box("Rival …", "s-opp")), note("both agree → back to the fight"), btn("✓ Rematch", "s-act"))),
  },

  // ── col 8 · leaderboard ──────────────────────────────────────
  {
    id: "leaderboard", title: "11 · Leaderboard", tag: "NEW · 015 + 009.9", col: 8, lane: 1, w: 380, type: "stage", route: "/leaderboard", isNew: true,
    desc: "Standings — online matches only, one record per player (survives renames). Always states, <b>accurately</b>, which storage tier is live (durable / sqlite / server-cache) so an ephemeral ‘live session’ board is never mistaken for durable.",
    wire: stage("/leaderboard", col(
      box("⛭ storage: server-cache — live session, resets on restart", "s-net"),
      col(row(box("1 · Rival", "grow s-opp"), pill("9–2")), row(box("2 · You", "grow s-you"), pill("7–3")), row(box("3 · Guest42", "grow"), pill("1–5"))),
      note("online only · bot games excluded"),
    )),
  },
];

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
