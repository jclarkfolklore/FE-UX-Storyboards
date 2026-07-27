// Storyboard content model. Each FRAME is a node on the infinite canvas:
//   { id, title, tag, x, y, w, desc, wire }  — `wire` is theme-agnostic wireframe HTML.
// Each LINK is a flow arrow between frames: { from, to, label }.
// Positions form a left→right flow with branches; edit freely (the canvas reads these).

// ---- tiny wireframe helpers (theme-agnostic: grayscale, boxy, labelled) ----
const box = (label, cls = "") => `<div class="wf-box ${cls}">${label}</div>`;
const btn = (label, cls = "") => `<div class="wf-btn ${cls}">${label}</div>`;
const input = (label) => `<div class="wf-input">${label}</div>`;
const pill = (label, cls = "") => `<span class="wf-pill ${cls}">${label}</span>`;
const avatar = (label) => `<div class="wf-avatar">${label}</div>`;
const row = (...kids) => `<div class="wf-row">${kids.join("")}</div>`;
const col = (...kids) => `<div class="wf-col">${kids.join("")}</div>`;
const note = (t) => `<div class="wf-note">${t}</div>`;
// A faithful 16:9 "game stage window" wrapper — the project invariant is that
// every screen lives inside one fixed stage-sized window, so wireframes honor it.
const stage = (title, body) => `<div class="wf-stage"><div class="wf-stage-bar">${title}</div><div class="wf-stage-body">${body}</div></div>`;

export const FRAMES = [
  {
    id: "mode-select", title: "1 · Mode Select", tag: "entry",
    x: 0, y: 300, w: 360,
    desc: "The hub. Three distinct modes (the plan treats them as separate, flag-gated plug-ins). Online is the priority; vs Computer ships last. Local 2P already exists and must not regress.",
    wire: stage("AI ARENA — PROMPT WARS", col(
      note("choose how to play"),
      btn("▶ Play Online &nbsp;— vs a friend or random", "primary"),
      btn("Two Players — same keyboard"),
      btn("vs Computer &nbsp;<span class='wf-dim'>(coming last)</span>"),
      row(pill("leaderboard ▸"), pill("settings ▸")),
    )),
  },
  {
    id: "identity", title: "2 · Name / Identity", tag: "first-run",
    x: 470, y: 40, w: 340,
    desc: "First time online (or when browser storage is empty). A durable player id is minted behind the scenes; the name is only the display label. No account. New players arriving by invite hit this same step.",
    wire: stage("WHO ARE YOU?", col(
      note("pick a name — no signup"),
      input("your name…"),
      btn("Continue", "primary"),
      note("stored on this device · you can rename later without losing your record"),
    )),
  },
  {
    id: "online-home", title: "3 · Online Home", tag: "online",
    x: 470, y: 300, w: 340,
    desc: "The online entry point. Create a private match and share a link, or get matched with whoever's waiting.",
    wire: stage("PLAY ONLINE", col(
      row(avatar("YOU"), box("signed in as <b>PlayerName</b>", "grow")),
      btn("＋ Create Match &nbsp;— get an invite link", "primary"),
      btn("⚄ Find an Opponent &nbsp;— automatch"),
      note("connection: ● good &nbsp;·&nbsp; relay: near you"),
    )),
  },
  {
    id: "vs-computer", title: "1b · vs Computer", tag: "solo",
    x: 470, y: 560, w: 340,
    desc: "Single-player stand-in, built last. Same input path a remote player uses (so 1P/2P share one code path). Bot matches never touch the leaderboard.",
    wire: stage("vs COMPUTER", col(
      note("practice against a simple bot"),
      row(box("pick fighter", "grow"), box("pick stage", "grow")),
      btn("Start", "primary"),
      note("results here are NOT recorded to the leaderboard"),
    )),
  },
  {
    id: "create-invite", title: "4 · Create & Invite", tag: "online",
    x: 940, y: 120, w: 360,
    desc: "Match created (server-issued id). Share the link; the frame waits for the friend to arrive, with a clear 'waiting' state and a way to cancel.",
    wire: stage("MATCH CREATED", col(
      note("send this to your friend"),
      row(input("https://…/m/AB12CD"), btn("Copy")),
      box("◔ waiting for opponent to join…", "waiting"),
      row(btn("Cancel"), pill("expires in ~10 min")),
    )),
  },
  {
    id: "join-link", title: "4b · Join by Link", tag: "online",
    x: 940, y: 420, w: 360,
    desc: "The friend opens the link. Brand-new player → name entry → straight into the lobby. No signup. Handles link opened twice / by a third person per spec.",
    wire: stage("JOIN MATCH", col(
      note("PlayerName invited you"),
      input("your name…  <span class='wf-dim'>(new here)</span>"),
      btn("Join the Match", "primary"),
      note("opened already elsewhere? we'll tell you, not fail silently"),
    )),
  },
  {
    id: "automatch", title: "4c · Automatch / Waiting", tag: "online",
    x: 940, y: 700, w: 360,
    desc: "No link — pair with whoever's waiting. A queue that never lingers forever (bounded wait), and 'something to do while waiting' (e.g. bot practice) so the wait isn't dead air.",
    wire: stage("FINDING AN OPPONENT", col(
      box("◍ searching… &nbsp; 0:12", "waiting"),
      note("nobody yet — want to warm up?"),
      btn("Practice vs Computer while you wait"),
      btn("Cancel", ""),
    )),
  },
  {
    id: "lobby", title: "5 · Lobby", tag: "online",
    x: 1420, y: 300, w: 420,
    desc: "Both players present. See each other, pick fighters, pick the shared stage, ready up. Theme is per-player (each sees their own); the STAGE is shared. Mutual 'ready' starts the fight.",
    wire: stage("LOBBY", col(
      row(col(avatar("P1"), box("You — <b>ready</b>", "ok")), col(avatar("P2"), box("Rival — picking…", "wait"))),
      row(box("your fighter ▸", "grow"), box("shared stage ▸", "grow")),
      note("● connected to opponent · ~40ms"),
      btn("✓ Ready", "primary"),
    )),
  },
  {
    id: "fight", title: "6 · The Fight", tag: "match",
    x: 1960, y: 300, w: 440,
    desc: "The match. The stage window is the fight; a small always-on connection-quality chip sits in a corner; the diagnostics drawer lives on the LEFT edge (collapsed to a rail so it never crosses the action). Host-authoritative: the host sims, the guest renders + predicts its own character.",
    wire: stage("● FIGHT — round 1", `<div class="wf-fight">
        <div class="wf-diag-rail" title="diagnostics drawer (collapsed)">⋮<br>DIAG</div>
        <div class="wf-arena">${row(avatar("P1"), box("VS", "vs"), avatar("P2"))}<div class="wf-hp"><span></span></div>${note("HP bars · timer · combo")}</div>
        <div class="wf-conn-chip">● 41ms</div>
      </div>`),
  },
  {
    id: "diagnostics", title: "6b · Diagnostics Drawer", tag: "match · 011.13",
    x: 1960, y: -140, w: 420,
    desc: "Opened from settings; a left-edge drawer that persists across views and never blocks the fight. NOT theme-aware (fixed diagnostic chrome). Reads the ONE shared metrics source (011.15): RTT vs felt lag (separated), fps/throttle, storage tier, version.",
    wire: `<div class="wf-drawer">
      <div class="wf-drawer-h">DIAGNOSTICS &nbsp;<span class='wf-dim'>(diagnostic — not themed)</span></div>
      ${row(box("link", "k"), box("● open", "v"))}
      ${row(box("peer", "k"), box("● present", "v"))}
      ${row(box("RTT p50/p95", "k"), box("41 / 88 ms", "v"))}
      ${row(box("felt lag", "k"), box("5.1 frames", "v"))}
      ${row(box("fps / throttle", "k"), box("60 · ok", "v"))}
      ${row(box("storage tier", "k"), box("sqlite-local", "v"))}
      ${row(box("build", "k"), box("1f720c4", "v"))}
      ${note("collapses to a hairline rail during play")}
    </div>`,
  },
  {
    id: "conn-states", title: "6c · Connection States", tag: "match · 011.8/011.9",
    x: 1960, y: 720, w: 440,
    desc: "Distinct, honestly-triggered states — 'opponent unstable' (RTT/heartbeat thresholds) is clearly different from 'opponent left' (socket closed / reconnect window elapsed). The host stalling freezes both, so the guest must detect it independently.",
    wire: col(
      stage("⚠ OPPONENT UNSTABLE", note("their connection is struggling — holding the fight…")),
      stage("⤺ RECONNECTING…", note("you dropped — trying to rejoin (0:06 left)")),
      stage("✕ OPPONENT LEFT", note("they didn't come back → recorded as a forfeit win")),
    ),
  },
  {
    id: "result", title: "7 · Result", tag: "match",
    x: 2520, y: 300, w: 380,
    desc: "One honest result, recorded once against the server-issued match id. Win / loss / forfeit shown distinctly. Offers a rematch without a new link.",
    wire: stage("YOU WIN!", col(
      row(avatar("P1"), box("★ Winner", "ok"), avatar("P2")),
      note("recorded to the leaderboard · match #AB12CD"),
      row(btn("↻ Rematch", "primary"), btn("Leaderboard")),
      btn("Leave"),
    )),
  },
  {
    id: "rematch", title: "8 · Rematch", tag: "online",
    x: 3020, y: 60, w: 340,
    desc: "Run it back with mutual agreement — the lobby survives match end, no new link exchanged. Loops back to the lobby/fight.",
    wire: stage("REMATCH?", col(
      row(box("You — ✓ ready", "ok"), box("Rival — waiting…", "wait")),
      note("both agree → straight back into the fight"),
      btn("✓ Rematch", "primary"),
    )),
  },
  {
    id: "leaderboard", title: "9 · Leaderboard", tag: "015 + 009.9",
    x: 3020, y: 420, w: 380,
    desc: "Standings — online matches only, one record per player (survives renames). Crucially, it ALWAYS states which storage tier is live, accurately (durable DB / local SQLite / server-cache), so an ephemeral 'live session' board is never mistaken for a durable one.",
    wire: stage("LEADERBOARD", col(
      box("⛭ storage: <b>server-cache</b> — live session, resets on restart", "tier"),
      col(row(box("1 · Rival", "grow"), pill("9–2")), row(box("2 · You", "grow"), pill("7–3")), row(box("3 · Guest42", "grow"), pill("1–5"))),
      note("online matches only · bot games excluded"),
    )),
  },
];

export const LINKS = [
  { from: "mode-select", to: "online-home", label: "Play Online" },
  { from: "mode-select", to: "vs-computer", label: "vs Computer" },
  { from: "mode-select", to: "identity", label: "first time → name" },
  { from: "identity", to: "online-home", label: "" },
  { from: "online-home", to: "create-invite", label: "Create Match" },
  { from: "online-home", to: "automatch", label: "Find Opponent" },
  { from: "create-invite", to: "lobby", label: "friend joins" },
  { from: "join-link", to: "lobby", label: "opponent opens link" },
  { from: "automatch", to: "lobby", label: "matched" },
  { from: "lobby", to: "fight", label: "both ready" },
  { from: "fight", to: "result", label: "KO / time" },
  { from: "fight", to: "diagnostics", label: "open diagnostics" },
  { from: "fight", to: "conn-states", label: "network event" },
  { from: "result", to: "rematch", label: "run it back" },
  { from: "result", to: "leaderboard", label: "recorded" },
  { from: "rematch", to: "lobby", label: "again" },
];
