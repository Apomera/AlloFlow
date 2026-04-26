// ═══════════════════════════════════════════
// stem_tool_playlab.js — Sports Play & Coverage Lab
// Headline: American Football play-design — geometry of routes,
// defensive coverages, and "open receiver" detection.
// "Every play is a coordinated math problem on a fixed grid."
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

(function() {
  'use strict';

  // ── Reduced-motion CSS (WCAG 2.3.3) — shared across STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Focus-visible outline (WCAG 2.4.7) ──
  (function() {
    if (document.getElementById('allo-playlab-focus-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-playlab-focus-css';
    st.textContent = '[data-pl-focusable]:focus-visible{outline:3px solid #fbbf24!important;outline-offset:2px!important;border-radius:6px}';
    document.head.appendChild(st);
  })();

  // ── ARIA live region ──
  (function() {
    if (document.getElementById('allo-live-playlab')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-playlab';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();
  function plAnnounce(msg) {
    var lr = document.getElementById('allo-live-playlab');
    if (lr) lr.textContent = msg;
  }

  // ═══════════════════════════════════════════
  // FIELD MODEL — football (yards) + soccer (meters)
  // ═══════════════════════════════════════════
  // FOOTBALL world coordinates (yards):
  //   x: 0 (offense end zone back) → 120 (defense end zone back)
  //      Field is 100 yards between goal lines + 10-yard end zones each side.
  //   y: 0 (right sideline) → 53.33 (left sideline)
  // Line of scrimmage (LOS) defaults to x = 35 (offense at own 25-yard line).
  // Hash marks (NFL): inset 23.58 yards from sideline → y = 23.58 and y = 29.75.
  var FIELD_LENGTH = 120;     // yd, includes both end zones
  var FIELD_WIDTH = 53.33;    // yd
  var END_ZONE_DEPTH = 10;    // yd
  var LOS_DEFAULT = 35;       // x at line of scrimmage
  var HASH_LEFT = 23.58;      // y of left hash
  var HASH_RIGHT = 29.75;     // y of right hash

  // SOCCER world coordinates (meters), per FIFA Laws of the Game:
  //   x: 0 (defending goal line) → 105 (attacking goal line). Attack
  //      moves to the right.
  //   y: 0 (top sideline) → 68 (bottom sideline)
  // Halfway line at x = 52.5. Penalty mark at x = 11 (from each goal line).
  var PITCH_LENGTH = 105;            // m
  var PITCH_WIDTH = 68;              // m
  var SOCCER_GOAL_WIDTH = 7.32;      // m (used to align rendering)
  var PENALTY_AREA_DEPTH = 16.5;     // m, "18-yard box"
  var PENALTY_AREA_WIDTH = 40.32;    // m
  var GOAL_AREA_DEPTH = 5.5;         // m, "6-yard box"
  var GOAL_AREA_WIDTH = 18.32;       // m
  var CENTER_CIRCLE_R = 9.15;        // m (= 10 yd legacy)
  var PENALTY_SPOT_X = 11;           // m from goal line
  var PENALTY_ARC_R = 9.15;          // m

  // Offense roles. We use abbreviations in the data and full labels for SR.
  var OFFENSE_ROLES = {
    QB: 'Quarterback',
    RB: 'Running Back',
    LT: 'Left Tackle', LG: 'Left Guard', C: 'Center', RG: 'Right Guard', RT: 'Right Tackle',
    TE: 'Tight End',
    WR1: 'Wide Receiver (X)',
    WR2: 'Wide Receiver (Z)',
    SLOT: 'Slot Receiver'
  };

  // Default I-Form / 11 personnel formation. Coordinates are at LOS_DEFAULT
  // baseline; specific plays may override individual positions.
  function defaultFormation(losX) {
    losX = losX !== undefined ? losX : LOS_DEFAULT;
    return [
      // Offensive line — 5 across the LOS, splits ~ 1 yd
      { id: 'LT', role: 'OL', x: losX, y: FIELD_WIDTH / 2 + 2.5, route: null },
      { id: 'LG', role: 'OL', x: losX, y: FIELD_WIDTH / 2 + 1.0, route: null },
      { id: 'C',  role: 'OL', x: losX, y: FIELD_WIDTH / 2,        route: null },
      { id: 'RG', role: 'OL', x: losX, y: FIELD_WIDTH / 2 - 1.0, route: null },
      { id: 'RT', role: 'OL', x: losX, y: FIELD_WIDTH / 2 - 2.5, route: null },
      // QB: 5 yards behind the C (shotgun)
      { id: 'QB', role: 'QB', x: losX - 5, y: FIELD_WIDTH / 2, route: null },
      // RB: alongside the QB
      { id: 'RB', role: 'RB', x: losX - 5, y: FIELD_WIDTH / 2 - 2, route: null },
      // TE: outside the RT
      { id: 'TE', role: 'TE', x: losX, y: FIELD_WIDTH / 2 - 4, route: null },
      // Wideouts split wide
      { id: 'WR1',  role: 'WR', x: losX, y: 4,                  route: null },
      { id: 'WR2',  role: 'WR', x: losX, y: FIELD_WIDTH - 4,    route: null },
      { id: 'SLOT', role: 'WR', x: losX, y: FIELD_WIDTH - 9,    route: null }
    ];
  }

  // ═══════════════════════════════════════════
  // PLAY LIBRARY — famous concepts every football fan recognizes
  // ═══════════════════════════════════════════
  // Each play stores DELTA positions (relative to LOS) for non-OL players + a
  // route per eligible receiver. Routes are arrays of waypoints in (Δx, Δy)
  // from the player's snap position; the geometry helpers below convert them
  // to absolute field coords.
  //
  // The route tree (NFL standard):
  //   0 = stop / hitch         5 = curl
  //   1 = quick out            6 = in (dig)
  //   2 = slant                7 = corner
  //   3 = comeback             8 = post
  //   4 = curl                 9 = fly / go (deep)
  var PLAYS = [
    {
      id: 'slant',
      label: 'Slant (West Coast)',
      icon: '↗️',
      teach: 'Quick 3-step drop, slot receiver runs a 5-yd slant (route 2). Beats man coverage and Cover 3 underneath. Total throw distance ~7 yards. Why it works: the receiver crosses the corner\'s leverage at full speed.',
      beats: ['cover1', 'cover0'], struggles: ['cover4'],
      routes: {
        SLOT: [{ dx: 5, dy: -3 }],          // 5 yd up, cut inside 3 yd
        WR1:  [{ dx: 12, dy: 0 }],          // hitch / clear-out
        WR2:  [{ dx: 12, dy: 0 }],
        TE:   [{ dx: 4, dy: 0 }],           // chip-and-release flat
        RB:   [{ dx: 0, dy: -3 }, { dx: 6, dy: -1 }] // check-down
      }
    },
    {
      id: 'fourverts',
      label: '4 Verticals (Air Coryell)',
      icon: '🎯',
      teach: 'Take-a-shot deep play. All 4 receivers run vertical (route 9). Slot bends to a post seam vs single-high safety, OR splits two safeties vs Cover 2. The math: 4 routes × 4 zones = at least one mismatch.',
      beats: ['cover1', 'cover3'], struggles: ['cover4'],
      routes: {
        WR1:  [{ dx: 22, dy: 0 }],
        WR2:  [{ dx: 22, dy: 0 }],
        SLOT: [{ dx: 12, dy: 0 }, { dx: 22, dy: -4 }],     // bend to post
        TE:   [{ dx: 18, dy: 0 }],
        RB:   [{ dx: 8, dy: 2 }]                            // swing
      }
    },
    {
      id: 'mesh',
      label: 'Mesh (Air Raid)',
      icon: '✕',
      teach: 'Two receivers run shallow crossing routes (route 6) — natural rub when defenders try to follow in man coverage. Hill Mumme staple, used by every NFL team now. Why it works: man coverage gets picked.',
      beats: ['cover1', 'cover0', 'robber'], struggles: ['tampa2'],
      routes: {
        SLOT: [{ dx: 5, dy: 18 }],          // shallow cross from slot
        TE:   [{ dx: 5, dy: -18 }],         // crossing the other way
        WR1:  [{ dx: 14, dy: 0 }, { dx: 14, dy: 5 }],   // dig
        WR2:  [{ dx: 14, dy: 0 }, { dx: 14, dy: -5 }],
        RB:   [{ dx: 0, dy: 6 }, { dx: 6, dy: 6 }]      // arrow
      }
    },
    {
      id: 'rpo',
      label: 'RPO Glance',
      icon: '🔁',
      teach: 'Run-Pass Option. Slot runs a glance (mini-post, ~6 yards). QB reads the LB: if he steps up to stop the run → throw the glance behind him. The math: defender can\'t cover two responsibilities.',
      beats: ['cover1', 'cover3'], struggles: ['cover4'],
      routes: {
        SLOT: [{ dx: 6, dy: -3 }],          // glance route
        WR1:  [{ dx: 8, dy: 1 }],           // bubble
        WR2:  [{ dx: 8, dy: -1 }],
        TE:   null,                          // blocking
        RB:   [{ dx: 5, dy: 0 }]            // run mesh
      }
    },
    {
      id: 'smash',
      label: 'Smash (Hi-Lo Corner)',
      icon: '🌽',
      teach: 'Two-receiver same-side combo: outside WR runs a hitch at 5 yd (route 0); slot or TE runs a corner (route 7) over the top. Crushes Cover 2 — the corner attacks the deep half safety while the hitch sits under the corner. The math: any single defender can only chase ONE depth at a time.',
      beats: ['cover2', 'tampa2'], struggles: ['cover4'],
      routes: {
        WR1:  [{ dx: 5, dy: 0 }],           // hitch underneath
        SLOT: [{ dx: 12, dy: -8 }],         // corner route over the top — to the same sideline
        WR2:  [{ dx: 5, dy: 0 }],           // backside hitch (mirror)
        TE:   [{ dx: 4, dy: 1 }],
        RB:   [{ dx: 0, dy: 4 }, { dx: 6, dy: 4 }]
      }
    },
    {
      id: 'stick',
      label: 'Stick (3rd-and-3)',
      icon: '📏',
      teach: 'Short-yardage 3rd down staple. TE runs a 5-yd stick (route 5 / curl). RB swings to the flat as the safety valve. WR runs a clear-out vertical to pull the corner away. The math: ~80% conversion rate vs zone, ~70% vs man — best percentage 3rd-and-short play in the NFL.',
      beats: ['cover3', 'cover4'], struggles: ['cover0'],
      routes: {
        TE:   [{ dx: 5, dy: -1 }],          // 5-yd stick
        RB:   [{ dx: 0, dy: -3 }, { dx: 6, dy: -3 }], // arrow / flat
        WR1:  [{ dx: 18, dy: 0 }],          // clear-out vertical
        WR2:  [{ dx: 18, dy: 0 }],
        SLOT: [{ dx: 6, dy: 5 }]            // option underneath
      }
    },
    {
      id: 'wildcat',
      label: 'Wildcat (Direct Snap)',
      icon: '🐯',
      teach: 'No QB pass — direct shotgun snap to the RB. WRs and TE run downfield blocking patterns to seal edges. Adds a numbers advantage in the box: defense expects QB read, gets a runner with a head start. Made famous by 2008 Miami Dolphins (Ronnie Brown).',
      beats: ['cover0', 'cover1'], struggles: ['cover4'],
      routes: {
        RB:   [{ dx: 4, dy: 0 }, { dx: 8, dy: -4 }],  // power off-tackle
        WR1:  [{ dx: 4, dy: 0 }],           // crack block
        WR2:  [{ dx: 4, dy: 0 }],
        SLOT: [{ dx: 3, dy: 4 }],           // motion across
        TE:   null                           // pull and lead
      }
    },
    {
      id: 'hailmary',
      label: 'Hail Mary',
      icon: '🙏',
      teach: 'Last-second desperation play. All eligible receivers sprint to the end zone goal post, QB heaves it 50+ yards, hope a tip ball lands in friendly hands. Probability of completion is ~10% but tied games at 0:00 happen — so you take the shot. The math: no other play has positive expected value at this state.',
      beats: ['cover0'], struggles: ['cover4', 'cover6', 'cover3'],
      routes: {
        WR1:  [{ dx: 45, dy: 5 }],          // streak to corner of end zone
        WR2:  [{ dx: 45, dy: -5 }],
        SLOT: [{ dx: 45, dy: 0 }],          // streak to middle of end zone
        TE:   [{ dx: 40, dy: 2 }],
        RB:   [{ dx: 8, dy: 4 }]            // outlet
      }
    },
    {
      // ── Counter Trey: classic Joe Gibbs power-running play. RB takes a
      // jab-step right to influence the LBs, then cuts back left behind two
      // pulling guards leading through the C-gap. Geometry: defenders flow
      // right with the jab, then have to redirect — every step they take
      // the wrong way is yardage gained.
      id: 'counter',
      label: 'Counter Trey (Power Run)',
      icon: '🔁',
      teach: 'RB jabs one way, cuts back the other behind two pulling guards. The math is misdirection: every defensive step toward the jab is two yards of recovery to get to the actual run lane. Joe Gibbs ran this for three Super Bowls. ~5.0 yd/carry vs Cover 1, ~3.5 vs Cover 4 (8 in the box).',
      beats: ['cover0', 'cover1'], struggles: ['cover4'],
      routes: {
        RB:   [{ dx: -2, dy: 1 }, { dx: 8, dy: -3 }],   // jab right, cut left for the hole
        WR1:  [{ dx: 4, dy: 0 }],                        // crack block to playside
        WR2:  [{ dx: 4, dy: 0 }],                        // backside seal block
        SLOT: [{ dx: 3, dy: 1 }],                        // edge / kick-out
        TE:   null                                       // base block
      }
    },
    {
      // ── Bootleg: QB rolls AWAY from the run-action. After a hard play-fake
      // to the RB going one way, the QB sprints out the other way. LBs and
      // safeties bite on the run, leaving the boot side wide open. Mike +
      // Kyle Shanahan + Sean McVay built entire offenses around this concept.
      id: 'bootleg',
      label: 'Bootleg (PA)',
      icon: '🎭',
      teach: 'QB fakes a handoff one way, rolls out the OTHER way. Defenders bite on the run, opening up the boot-side. Geometry: the QB cuts the field in HALF — only one side of the field is in the throwing window, but it\'s a side defenders just abandoned. Conversion rate ~70% on play-action vs single-high.',
      beats: ['cover1', 'cover3'], struggles: ['cover0'],
      routes: {
        TE:   [{ dx: 4, dy: 6 }],                        // drag across to boot side
        RB:   [{ dx: 0, dy: 5 }, { dx: 4, dy: 5 }],     // flat to boot side
        WR1:  [{ dx: 12, dy: 0 }, { dx: 10, dy: 1 }],   // comeback at 12 (primary read)
        WR2:  [{ dx: 18, dy: 1 }],                       // backside post (decoy clears safety)
        SLOT: [{ dx: 8, dy: 6 }]                         // out-route at 8
      }
    },
    {
      // ── Wheel: RB releases out of the backfield like he\'s running a flat
      // route, then turns up the sideline at full speed. Linebackers chase
      // expecting the flat — when the RB turns up, the LB is in trail
      // position with no leverage. Pair with a clearing route from the
      // outside WR to vacate the corner.
      id: 'wheel',
      label: 'Wheel Route',
      icon: '🎡',
      teach: 'RB runs out then up the sideline. LBs chase the flat route, then have no chance to turn and run with a 4.5-second 40-yd RB. Geometric trap: defender commits to one direction, then has to reverse at full speed. Big-play hit rate ~25% — when it works, it\'s 30+ yards.',
      beats: ['cover1', 'cover3'], struggles: ['cover2'],
      routes: {
        RB:   [{ dx: 4, dy: 6 }, { dx: 25, dy: 6 }],    // out then up the sideline
        WR1:  [{ dx: 6, dy: 4 }],                        // shallow dig — clears the corner
        SLOT: [{ dx: 8, dy: -2 }],                       // pivot underneath
        WR2:  [{ dx: 12, dy: -2 }],                      // backside curl
        TE:   [{ dx: 4, dy: 1 }]                         // chip-and-release
      }
    },
    {
      // ── Y-Cross: high-percentage 3rd-down concept. The Y (TE/slot)
      // releases vertical 6 yards, then crosses the field at intermediate
      // depth (~15 yd). Behind a vertical clear-out by the X (WR1), the
      // crosser eats the soft underbelly of zone coverage right at the
      // first-down marker. Andy Reid / Doug Pederson staple.
      id: 'ycross',
      label: 'Y-Cross (3rd-and-Long)',
      icon: '✗',
      teach: 'Y receiver runs 6 vertical, then crosses at ~15 yd depth — right at the first-down marker on 3rd-and-12. Beats Cover 3 because the deep middle defender has to choose between the crosser and the vertical clear-out. ~62% completion rate league-wide on 3rd-and-7+.',
      beats: ['cover3', 'cover6', 'robber'], struggles: ['cover0'],
      routes: {
        TE:   [{ dx: 6, dy: 0 }, { dx: 16, dy: -10 }],  // 6 vertical, 10-yard cross
        SLOT: [{ dx: 14, dy: 4 }, { dx: 14, dy: 1 }],   // bender → dig
        WR1:  [{ dx: 22, dy: 0 }],                       // vertical clear (pulls deep safety)
        WR2:  [{ dx: 14, dy: 1 }],                       // backside dig (cleanup read)
        RB:   [{ dx: 0, dy: 4 }, { dx: 5, dy: 4 }]      // checkdown
      }
    },
    {
      // ── Outside Zone (Sweep / Toss): perimeter run. Whole O-line steps
      // playside on the snap; RB sprints to the sideline, reading the
      // defensive flow. If the edge holds → cut back inside. If the edge
      // breaks → bounce wide. Mike Shanahan, Sean McVay, Kyle Shanahan
      // entire offenses are built on this single play with different
      // window dressing.
      id: 'sweep',
      label: 'Outside Zone (Sweep)',
      icon: '🏃',
      teach: 'RB sprints toward the sideline reading the playside DE. Whole O-line zone-blocks one direction; the RB CHOOSES which gap to hit based on flow. Math: defenders must commit before the RB does. Average ~4.8 yd/carry, but ~25% of carries break for 10+ on flow misreads.',
      beats: ['cover0', 'cover1'], struggles: ['cover4'],
      routes: {
        RB:   [{ dx: 1, dy: -3 }, { dx: 6, dy: -8 }],    // jab inside, then bounce wide
        WR1:  [{ dx: 6, dy: -2 }],                        // crackback block (nearside)
        SLOT: [{ dx: 4, dy: -1 }],                        // edge seal
        TE:   [{ dx: 3, dy: -2 }],                        // reach block on playside DE
        WR2:  [{ dx: 4, dy: 0 }]                          // backside cutoff
      }
    },
    {
      // ── Bubble Screen: quick perimeter pass to slot WR with two
      // teammates blocking. Defeats off-coverage and stacked boxes — if
      // the corner is 8 yards off, that's a free 5-yard gain. Combines
      // with run action so it functions as a quasi-RPO.
      id: 'bubble',
      label: 'Bubble Screen',
      icon: '🫧',
      teach: 'Slot receiver takes 1 step back + sideways, catches a quick lateral toss. Two teammates lead-block. Math: if the nearest defender is 7+ yards away, the bubble gains 4-6 yards on average — and 25% of attempts go for 10+ when the defense is in a stacked-box look.',
      beats: ['cover4', 'cover3'], struggles: ['cover2'],
      routes: {
        SLOT: [{ dx: 0, dy: -3 }, { dx: 2, dy: -5 }],    // step back, catch, sprint sideways
        WR1:  [{ dx: 3, dy: -2 }],                        // lead block #1
        WR2:  [{ dx: 18, dy: 0 }],                        // backside vertical (clear-out / decoy)
        TE:   [{ dx: 2, dy: -2 }],                        // chip then lead block #2
        RB:   [{ dx: 4, dy: 0 }]                          // run-action fake
      }
    },
    {
      // ── Drive Concept: shallow cross + dig combo. Classic Erhardt-Perkins
      // 3rd-and-medium answer. Shallow crosser (under) and dig (over) attack
      // the SAME zone defender — he can only carry one. Everyone uses this
      // because it works against both man AND zone.
      id: 'drive',
      label: 'Drive (Shallow + Dig)',
      icon: '🏎️',
      teach: 'Shallow crosser at 2 yd + dig at 12 yd in the SAME area of the field. The MIKE linebacker has to pick one — whichever he doesn\'t cover is the throw. Beats man (rub on the cross) AND zone (high-low on the LB). Tom Brady\'s favorite concept for 20 years.',
      beats: ['cover1', 'cover2', 'cover3'], struggles: ['cover0'],
      routes: {
        SLOT: [{ dx: 3, dy: 14 }],                        // shallow crosser left → right
        WR2:  [{ dx: 12, dy: -3 }],                       // dig route at 12 yd, opposite side
        WR1:  [{ dx: 18, dy: 0 }],                        // vertical clear
        TE:   [{ dx: 4, dy: 1 }],                         // chip-release flat
        RB:   [{ dx: 0, dy: -4 }, { dx: 4, dy: -4 }]     // arrow / checkdown
      }
    },
    {
      // ── Trips Bunch (Spot Concept): 3 receivers stacked tightly on one
      // side. Inside man runs corner, middle man runs flat, outside man
      // runs hitch — together it's a triangle that flooods one zone. Best
      // 4th-and-short / red-zone play in football. Cover 2 has no answer:
      // the corner can\'t cover three depths at once.
      id: 'trips',
      label: 'Trips Bunch (Spot)',
      icon: '⫷',
      teach: 'Three receivers form a triangle: corner (deep) + flat (low) + hitch (middle). Whichever way the cornerback picks, the QB throws to the OPPOSITE level. ~80% conversion rate inside the 5-yard line. Geometric trap: one defender, three depths.',
      beats: ['cover2', 'cover6', 'robber'], struggles: ['cover0'],
      routes: {
        WR1:  [{ dx: 6, dy: -1 }],                        // hitch at 6 (middle of triangle)
        SLOT: [{ dx: 3, dy: -5 }],                        // flat (low corner)
        TE:   [{ dx: 12, dy: -7 }],                       // corner route (high corner)
        WR2:  [{ dx: 14, dy: 2 }],                        // backside dig (cleanup)
        RB:   [{ dx: 0, dy: 3 }, { dx: 4, dy: 3 }]       // arrow opposite the trips side
      }
    }
  ];

  // ═══════════════════════════════════════════
  // COVERAGE LIBRARY — defensive zones as polygons
  // ═══════════════════════════════════════════
  // Zones are polygons in field coords (yards). Each zone has a label so
  // SR users can hear "deep half left" etc. The drawing layer fills each
  // zone with a translucent color; the open-receiver detector checks each
  // receiver against the zone they're standing in + nearest defender.
  //
  // For MVP we draw zones STATIC at the LOS+ position. Real coverages flex
  // based on play side; we'll punt on that until Tier 3 / animated mode.
  function buildZones(coverageId, losX) {
    losX = losX !== undefined ? losX : LOS_DEFAULT;
    var W = FIELD_WIDTH;
    var deepStart = losX + 12;     // most coverages start their deep zones ~12 yd past LOS
    var midStart = losX + 5;
    var deepEnd = losX + 35;       // we render deep zones up to 35 yd past LOS
    if (coverageId === 'cover1') {
      // Single-high safety + man underneath. We paint ONE deep zone (the
      // FS over the top) and don't paint the man assignments — they'd
      // clutter the field.
      return [
        { label: 'Free safety (deep middle)', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 0], [deepStart, W], [deepEnd, W], [deepEnd, 0]] }
      ];
    }
    if (coverageId === 'cover2') {
      return [
        { label: 'Deep half — right', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 0], [deepStart, W / 2], [deepEnd, W / 2], [deepEnd, 0]] },
        { label: 'Deep half — left', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, W / 2], [deepStart, W], [deepEnd, W], [deepEnd, W / 2]] },
        { label: 'Flat — right', color: 'rgba(251,191,36,0.18)',
          poly: [[losX, 0], [losX, 12], [midStart + 5, 12], [midStart + 5, 0]] },
        { label: 'Flat — left', color: 'rgba(251,191,36,0.18)',
          poly: [[losX, W - 12], [losX, W], [midStart + 5, W], [midStart + 5, W - 12]] },
        { label: 'Hook — middle', color: 'rgba(34,197,94,0.16)',
          poly: [[midStart, 18], [midStart, W - 18], [deepStart, W - 18], [deepStart, 18]] }
      ];
    }
    if (coverageId === 'cover3') {
      var third = W / 3;
      return [
        { label: 'Deep third — right', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 0], [deepStart, third], [deepEnd, third], [deepEnd, 0]] },
        { label: 'Deep third — middle', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, third], [deepStart, 2 * third], [deepEnd, 2 * third], [deepEnd, third]] },
        { label: 'Deep third — left', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 2 * third], [deepStart, W], [deepEnd, W], [deepEnd, 2 * third]] },
        { label: 'Curl-flat — right', color: 'rgba(251,191,36,0.18)',
          poly: [[losX, 0], [losX, 18], [deepStart, 18], [deepStart, 0]] },
        { label: 'Curl-flat — left', color: 'rgba(251,191,36,0.18)',
          poly: [[losX, W - 18], [losX, W], [deepStart, W], [deepStart, W - 18]] },
        { label: 'Hook — middle', color: 'rgba(34,197,94,0.16)',
          poly: [[midStart, 18], [midStart, W - 18], [deepStart, W - 18], [deepStart, 18]] }
      ];
    }
    if (coverageId === 'cover4') {
      // Cover 4 / Quarters — four deep zones split into quarters of the field.
      // Three underneath defenders. Modern college + Saban Alabama staple
      // because EVERY deep route gets a defender. Beat with: short-and-quick
      // (Stick, Slant) since the underneath is light. Hard to beat deep.
      var quarter = W / 4;
      return [
        { label: 'Deep quarter — right outside', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 0], [deepStart, quarter], [deepEnd, quarter], [deepEnd, 0]] },
        { label: 'Deep quarter — right inside', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, quarter], [deepStart, 2 * quarter], [deepEnd, 2 * quarter], [deepEnd, quarter]] },
        { label: 'Deep quarter — left inside', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 2 * quarter], [deepStart, 3 * quarter], [deepEnd, 3 * quarter], [deepEnd, 2 * quarter]] },
        { label: 'Deep quarter — left outside', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 3 * quarter], [deepStart, W], [deepEnd, W], [deepEnd, 3 * quarter]] },
        { label: 'Hook — right', color: 'rgba(34,197,94,0.16)',
          poly: [[losX, 0], [losX, 18], [deepStart, 18], [deepStart, 0]] },
        { label: 'Hook — middle', color: 'rgba(34,197,94,0.16)',
          poly: [[midStart, 18], [midStart, W - 18], [deepStart, W - 18], [deepStart, 18]] },
        { label: 'Hook — left', color: 'rgba(34,197,94,0.16)',
          poly: [[losX, W - 18], [losX, W], [deepStart, W], [deepStart, W - 18]] }
      ];
    }
    if (coverageId === 'tampa2') {
      // Cover 2 but the MLB drops deep into the middle hole — closes the
      // seam that beats traditional Cover 2.
      return [
        { label: 'Deep half — right', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 0], [deepStart, W / 2 - 6], [deepEnd, W / 2 - 6], [deepEnd, 0]] },
        { label: 'Deep half — left', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, W / 2 + 6], [deepStart, W], [deepEnd, W], [deepEnd, W / 2 + 6]] },
        { label: 'MLB deep middle (Tampa hole-fill)', color: 'rgba(168,85,247,0.20)',
          poly: [[deepStart - 4, W / 2 - 6], [deepStart - 4, W / 2 + 6], [deepEnd, W / 2 + 6], [deepEnd, W / 2 - 6]] },
        { label: 'Flat — right', color: 'rgba(251,191,36,0.18)',
          poly: [[losX, 0], [losX, 12], [midStart + 5, 12], [midStart + 5, 0]] },
        { label: 'Flat — left', color: 'rgba(251,191,36,0.18)',
          poly: [[losX, W - 12], [losX, W], [midStart + 5, W], [midStart + 5, W - 12]] }
      ];
    }
    if (coverageId === 'cover0') {
      // Cover 0 — ALL-OUT BLITZ. No deep safety, no help over the top. 7+
      // rushers, everyone else in man. Pure pressure look. We paint a thin
      // "blitz alley" to communicate the rush vs leaving the field open
      // (no zone shading because there are NO zones — pure man).
      return [
        { label: 'Blitz alley — A-gap (no help over the top)', color: 'rgba(220,38,38,0.18)',
          poly: [[losX - 4, W / 2 - 4], [losX - 4, W / 2 + 4], [midStart, W / 2 + 4], [midStart, W / 2 - 4]] }
      ];
    }
    if (coverageId === 'cover6') {
      // Cover 6 / "Quarter-Quarter-Half" — split-field. One side (we paint
      // the RIGHT side) plays Cover 4 quarters, the other side plays Cover
      // 2 halves. The check-down on the field side. Pittsburgh / Saban
      // staple to balance a 3x1 trips set: quarters into trips, halves to
      // the single-receiver side.
      var quarter6 = W / 4;
      return [
        // Cover 4 side (right): two deep quarters
        { label: 'Deep quarter — far right', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, 0], [deepStart, quarter6], [deepEnd, quarter6], [deepEnd, 0]] },
        { label: 'Deep quarter — right inside', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart, quarter6], [deepStart, 2 * quarter6], [deepEnd, 2 * quarter6], [deepEnd, quarter6]] },
        // Cover 2 side (left): one deep half
        { label: 'Deep half — left', color: 'rgba(168,85,247,0.20)',
          poly: [[deepStart, 2 * quarter6], [deepStart, W], [deepEnd, W], [deepEnd, 2 * quarter6]] },
        // Hooks underneath
        { label: 'Hook — right (quarters side)', color: 'rgba(34,197,94,0.16)',
          poly: [[losX, 0], [losX, 18], [deepStart, 18], [deepStart, 0]] },
        { label: 'Hook — middle', color: 'rgba(34,197,94,0.16)',
          poly: [[midStart, 18], [midStart, W - 18], [deepStart, W - 18], [deepStart, 18]] },
        { label: 'Flat — left (halves side)', color: 'rgba(251,191,36,0.18)',
          poly: [[losX, W - 12], [losX, W], [midStart + 5, W], [midStart + 5, W - 12]] }
      ];
    }
    if (coverageId === 'robber') {
      // Robber coverage — Cover 1 (man-free with single high safety) PLUS
      // a "robber" defender lurking in the middle hole at ~10-12 yd. The
      // robber's job is to bait the QB into throwing a dig / over route,
      // then break on it for a pick. Patrick Peterson + Tyrann Mathieu
      // were elite robbers. Beat with: anything that pulls the robber out
      // of position (mesh, crossing routes that occupy the middle).
      return [
        { label: 'Free safety (deep middle, over the top)', color: 'rgba(96,165,250,0.18)',
          poly: [[deepStart + 5, 0], [deepStart + 5, W], [deepEnd, W], [deepEnd, 0]] },
        { label: 'Robber (middle hole — baiting digs)', color: 'rgba(220,38,38,0.20)',
          poly: [[midStart + 6, W / 2 - 9], [midStart + 6, W / 2 + 9], [deepStart + 4, W / 2 + 9], [deepStart + 4, W / 2 - 9]] }
      ];
    }
    return [];
  }

  // ═══════════════════════════════════════════
  // SOCCER MODEL — formations, plays, defensive shapes
  // ═══════════════════════════════════════════
  // Soccer plays don't break down into discrete "plays" the way football
  // does — the closest analog is a CONCEPT (tiki-taka, counter-attack)
  // played out of a FORMATION (4-3-3, 4-4-2, etc.). For the MVP we ship
  // 3 formations × 3 concepts × 3 defensive shapes = a teachable matrix.
  //
  // Roles use FIFA-standard codes: GK / RB / CB / LB / CDM / CM / CAM /
  // RW / LW / ST / SS. Player IDs include the role + jersey-style number
  // so SR users hear "RB2 right back" cleanly.
  function soccerFormation433() {
    var L = PITCH_LENGTH, W = PITCH_WIDTH;
    return [
      { id: 'GK',   role: 'GK',  x: 5,        y: W / 2 },
      { id: 'RB',   role: 'DEF', x: 18,       y: W * 0.20 },
      { id: 'RCB',  role: 'DEF', x: 16,       y: W * 0.40 },
      { id: 'LCB',  role: 'DEF', x: 16,       y: W * 0.60 },
      { id: 'LB',   role: 'DEF', x: 18,       y: W * 0.80 },
      { id: 'CDM',  role: 'MID', x: 35,       y: W / 2 },
      { id: 'RCM',  role: 'MID', x: 45,       y: W * 0.35 },
      { id: 'LCM',  role: 'MID', x: 45,       y: W * 0.65 },
      { id: 'RW',   role: 'FWD', x: 78,       y: W * 0.18 },
      { id: 'ST',   role: 'FWD', x: 85,       y: W / 2 },
      { id: 'LW',   role: 'FWD', x: 78,       y: W * 0.82 }
    ];
  }
  function soccerFormation442() {
    var L = PITCH_LENGTH, W = PITCH_WIDTH;
    return [
      { id: 'GK',   role: 'GK',  x: 5,        y: W / 2 },
      { id: 'RB',   role: 'DEF', x: 18,       y: W * 0.18 },
      { id: 'RCB',  role: 'DEF', x: 16,       y: W * 0.40 },
      { id: 'LCB',  role: 'DEF', x: 16,       y: W * 0.60 },
      { id: 'LB',   role: 'DEF', x: 18,       y: W * 0.82 },
      { id: 'RM',   role: 'MID', x: 50,       y: W * 0.15 },
      { id: 'RCM',  role: 'MID', x: 45,       y: W * 0.40 },
      { id: 'LCM',  role: 'MID', x: 45,       y: W * 0.60 },
      { id: 'LM',   role: 'MID', x: 50,       y: W * 0.85 },
      { id: 'RST',  role: 'FWD', x: 80,       y: W * 0.40 },
      { id: 'LST',  role: 'FWD', x: 80,       y: W * 0.60 }
    ];
  }
  function soccerFormation4231() {
    var L = PITCH_LENGTH, W = PITCH_WIDTH;
    return [
      { id: 'GK',   role: 'GK',  x: 5,        y: W / 2 },
      { id: 'RB',   role: 'DEF', x: 18,       y: W * 0.20 },
      { id: 'RCB',  role: 'DEF', x: 16,       y: W * 0.40 },
      { id: 'LCB',  role: 'DEF', x: 16,       y: W * 0.60 },
      { id: 'LB',   role: 'DEF', x: 18,       y: W * 0.80 },
      { id: 'RDM',  role: 'MID', x: 32,       y: W * 0.42 },
      { id: 'LDM',  role: 'MID', x: 32,       y: W * 0.58 },
      { id: 'RW',   role: 'MID', x: 60,       y: W * 0.18 },
      { id: 'CAM',  role: 'MID', x: 60,       y: W / 2 },
      { id: 'LW',   role: 'MID', x: 60,       y: W * 0.82 },
      { id: 'ST',   role: 'FWD', x: 85,       y: W / 2 }
    ];
  }
  // ── 3-4-3 (back-three) ──
  // Conte / Tuchel modern back-three system. Three CBs cover the central
  // channels; wing-backs (RWB / LWB) cover BOTH the touchline AND the
  // attacking side of the field — they're effectively wide midfielders
  // when the team has the ball, full-backs when they don't. Two central
  // mids (we use RCM/LCM IDs for concept compatibility) anchor the
  // middle. Front three of RW / ST / LW.
  function soccerFormation343() {
    var L = PITCH_LENGTH, W = PITCH_WIDTH;
    return [
      { id: 'GK',   role: 'GK',  x: 5,        y: W / 2 },
      { id: 'RCB',  role: 'DEF', x: 16,       y: W * 0.30 },
      { id: 'CB',   role: 'DEF', x: 14,       y: W / 2 },
      { id: 'LCB',  role: 'DEF', x: 16,       y: W * 0.70 },
      { id: 'RWB',  role: 'MID', x: 35,       y: W * 0.10 },
      { id: 'RCM',  role: 'MID', x: 40,       y: W * 0.40 },
      { id: 'LCM',  role: 'MID', x: 40,       y: W * 0.60 },
      { id: 'LWB',  role: 'MID', x: 35,       y: W * 0.90 },
      { id: 'RW',   role: 'FWD', x: 78,       y: W * 0.20 },
      { id: 'ST',   role: 'FWD', x: 85,       y: W / 2 },
      { id: 'LW',   role: 'FWD', x: 78,       y: W * 0.80 }
    ];
  }
  // ── 3-5-2 (Italian classic) ──
  // Famous Italian 1990s formation (Sacchi, Conte). Three CBs + two
  // wing-backs that stretch the field, three central midfielders anchored
  // by a CDM (defensive mid) flanked by two box-to-box mids. Two strikers
  // up top — the modern variant uses a SS (second striker) drifting
  // slightly deeper than the main ST.
  function soccerFormation352() {
    var L = PITCH_LENGTH, W = PITCH_WIDTH;
    return [
      { id: 'GK',   role: 'GK',  x: 5,        y: W / 2 },
      { id: 'RCB',  role: 'DEF', x: 16,       y: W * 0.30 },
      { id: 'CB',   role: 'DEF', x: 14,       y: W / 2 },
      { id: 'LCB',  role: 'DEF', x: 16,       y: W * 0.70 },
      { id: 'RWB',  role: 'MID', x: 35,       y: W * 0.10 },
      { id: 'RCM',  role: 'MID', x: 45,       y: W * 0.35 },
      { id: 'CDM',  role: 'MID', x: 35,       y: W / 2 },
      { id: 'LCM',  role: 'MID', x: 45,       y: W * 0.65 },
      { id: 'LWB',  role: 'MID', x: 35,       y: W * 0.90 },
      { id: 'SS',   role: 'FWD', x: 75,       y: W / 2 },     // second striker (deeper)
      { id: 'ST',   role: 'FWD', x: 85,       y: W * 0.42 }   // main striker (advanced)
    ];
  }

  var SOCCER_FORMATIONS = [
    { id: '433',  label: '4-3-3 (Barcelona)',   icon: '🔺', build: soccerFormation433,
      teach: 'Pep Guardiola Barcelona base. Wide front three stretches the field; the lone CDM (defensive mid) provides cover so the fullbacks can push high. The three midfielders form triangles in possession — see the passing-network arrows.' },
    { id: '442',  label: '4-4-2 (Classic)',     icon: '🔄', build: soccerFormation442,
      teach: 'Classic English formation — flat back four, flat midfield four, two strikers. Easy to teach, hard to break down centrally. Vulnerable in midfield against 4-3-3 because of the 3-vs-2 numbers.' },
    { id: '4231', label: '4-2-3-1 (Modern)',    icon: '👑', build: soccerFormation4231,
      teach: 'Most-used formation in modern football. Two defensive mids screen the back four; a CAM (central attacking mid, the "10") connects midfield to the lone striker. Wingers cut inside.' },
    { id: '343',  label: '3-4-3 (Tuchel/Conte)', icon: '🔻', build: soccerFormation343,
      teach: 'Modern back-three with attacking wing-backs. Three CBs cover the central channels; the wing-backs sprint up and down the touchline (effectively wide midfielders in possession). Two CMs anchor the middle. Front three: RW / ST / LW. Beats 4-4-2 because of the WB-vs-FB mismatch wide; vulnerable to 4-3-3 if the wing-backs get caught upfield.' },
    { id: '352',  label: '3-5-2 (Italian)',     icon: '🛡️', build: soccerFormation352,
      teach: 'Italian classic (Sacchi, Conte). Three CBs + two wing-backs + a midfield triangle (CDM screening, two box-to-box mids). Two strikers — main ST + a deeper second striker (SS) who drops into space between the lines. Strong defensively (5 in the back when WBs drop), unmatched in central midfield numbers (3 mids vs typical 2-3).' }
  ];

  // Soccer "concepts" — passing-network patterns that overlay the formation.
  // Each concept's `passes` is an array of [fromId, toId] pairs that get
  // drawn as arrows on the field, illustrating the team's preferred ball
  // movement out of the formation.
  var SOCCER_CONCEPTS = [
    { id: 'tikitaka',
      label: 'Tiki-Taka',
      icon: '🔁',
      teach: 'Short, sharp passes in tight triangles. Goal: keep possession until the defense commits, then exploit the gap. Math: ~85% of passes < 15 m. The triangle is geometrically optimal — every player has 2 passing options at all times.',
      beats: ['lowblock', 'midblock'], struggles: ['highpress'],
      passes: [
        ['CDM', 'RCM'], ['RCM', 'RW'], ['RW', 'ST'],
        ['CDM', 'LCM'], ['LCM', 'LW'], ['LW', 'ST'],
        ['RCM', 'LCM'], ['CDM', 'CAM'], ['RCM', 'CAM'], ['LCM', 'CAM']
      ] },
    { id: 'counter',
      label: 'Counter-Attack',
      icon: '⚡',
      teach: 'Win the ball, hit a long ball over the top to a sprinting forward. Klopp / Mourinho staple. Math: averaged ~3 passes per goal (vs 8+ for possession teams). Wins by EXPLOITING space the opponent leaves while attacking.',
      beats: ['highpress'], struggles: ['lowblock'],
      passes: [
        ['GK', 'CDM'], ['CDM', 'RW'], ['RW', 'ST'],
        ['CDM', 'LW'], ['LW', 'ST']
      ] },
    { id: 'gegenpress',
      label: 'Gegenpress (Counter-Press)',
      icon: '🔥',
      teach: 'Klopp\'s "5-second rule" — when you LOSE the ball, all 11 players sprint to win it back within 5 seconds. Why? Because the opponent is at their LEAST organized in those first seconds. Math: a turnover during transition is geometrically a worse position for the defense than a static set play.',
      beats: ['highpress', 'midblock'], struggles: ['lowblock'],
      passes: [
        // Recovery + immediate attack — passes drawn from the press point
        ['CDM', 'CAM'], ['CAM', 'ST'], ['CAM', 'RW'], ['CAM', 'LW']
      ] },
    // ─────────────────────────────────────────────────────────
    // Set-piece library — restarts of play from a dead ball.
    // Set pieces account for ~30% of all goals in modern football
    // (corners ~10%, free kicks ~10%, penalties ~5%, throw-ins ~5%).
    // The math behind them is geometry: where the ball starts, the
    // angle of approach, and the running paths into the box.
    // ─────────────────────────────────────────────────────────
    { id: 'corner-in',
      label: 'Corner — In-Swinger',
      icon: '↪️',
      setPiece: true,
      teach: 'Ball curves IN toward goal — bends away from the keeper toward the near post. Right-footed taker on the LEFT corner (LW), or left-footed on the right. Math: the curve creates ~30°/m of swerve in the last 6 m, putting the ball where the keeper can\'t reach without coming through traffic. Highest-conversion corner in the data — ~5%.',
      passes: [
        ['LW', 'ST'],     // primary: in-swung header at near post
        ['LW', 'RCB'],    // secondary: aerial threat — CB pushed up for the set piece
        ['LW', 'RCM']     // recycled clear → outside shot
      ] },
    { id: 'corner-out',
      label: 'Corner — Out-Swinger',
      icon: '↩️',
      setPiece: true,
      teach: 'Ball curves AWAY from goal — bends toward the penalty spot / far post. Right-footed taker on the RIGHT corner (RW), or left-footed on the left. The keeper has more time to come, but the receiver runs ONTO the ball at full speed — favored for late headers and volleys. ~3.5% conversion, but ~50% chance of a decent shot.',
      passes: [
        ['RW', 'CAM'],    // primary: penalty-spot run
        ['RW', 'CDM'],    // edge-of-box volley setup
        ['RW', 'LW']      // far-post header
      ] },
    { id: 'corner-short',
      label: 'Corner — Short',
      icon: '↔️',
      setPiece: true,
      teach: 'Skip the cross — pass to a teammate within 5 m of the corner arc, then build up. Pulls a defender out of the box (now 10v10 inside instead of 10v11), creating space. Mancity / Arteta favorite. Conversion ~2% but xG-per-shot is HIGHER because shots come from a better angle.',
      passes: [
        ['LW', 'LCM'],    // short to overlapping mid
        ['LCM', 'CAM'],   // build to 18-yard line
        ['CAM', 'ST']     // pull-back finish
      ] },
    { id: 'freekick-direct',
      label: 'Free Kick — Direct Strike',
      icon: '🎯',
      setPiece: true,
      teach: 'Wall is 9.15 m (10 yd) away, 4 defenders shoulder-to-shoulder. Goal is 7.32 m × 2.44 m. From 22 m straight on, the keeper covers about 75% of the goal mouth — the corners are scoring zones. Math: ball curves at ~5°/m at 25 m/s; aim ~1 m wide of the wall and let the swerve bring it back. Real-world conversion ~7% from 18-25 m.',
      passes: [
        ['CAM', 'ST'],    // direct strike toward goal (modeled as CAM→ST)
        ['CAM', 'CDM']    // recycled second phase if blocked
      ] },
    { id: 'freekick-cross',
      label: 'Free Kick — Cross to Box',
      icon: '🪂',
      setPiece: true,
      teach: 'From wide positions (30+ m out), the FK becomes a corner-substitute — server delivers high cross to attackers in the 6-yd box. Same wall geometry but the goal is ASSIST, not direct goal. ~15% chance of a scoring chance per delivery, ~3% chance of a goal.',
      passes: [
        ['LW', 'ST'],     // cross to striker on near post run
        ['LW', 'CAM'],    // cross to penalty-spot run
        ['LW', 'RCB']     // back-post header target — CB up for FK
      ] },
    { id: 'throwin-long',
      label: 'Throw-In — Long (Delap)',
      icon: '🪂',
      setPiece: true,
      teach: 'Long throw-in = corner kick from the touchline. Stoke City\'s Rory Delap had 38 m hand-off-feet throws that landed in the 6-yd box. Math: a perfectly-flat throw at ~22 m/s carries 35-40 m before bouncing. Crosses the offside line because there\'s no offside on a throw-in! That\'s the loophole — it\'s a set piece masquerading as a normal restart.',
      passes: [
        ['RW', 'ST'],     // long throw to near post — striker flicks on
        ['RW', 'RCB'],    // CB run to back post
        ['RW', 'CAM']     // mid-box volley
      ] },
    { id: 'throwin-buildup',
      label: 'Throw-In — Build-Up',
      icon: '🤝',
      setPiece: true,
      teach: 'Short throw to retain possession + draw a defender to the line. Modern teams (City, Brighton) treat throw-ins like restart-from-the-back. Math: a 5 m throw to a teammate, who returns to the thrower (now back on the field), creates a 2v1 against the closest defender ~70% of the time.',
      passes: [
        ['LW', 'LCM'],    // short throw to receiving mid
        ['LCM', 'LW'],    // give-and-go return
        ['LW', 'CAM']     // turn and play forward
      ] },
    { id: 'penalty',
      label: 'Penalty Kick',
      icon: '⚽',
      setPiece: true,
      teach: 'Spot kick from 11 m (12 yd). 1v1: striker vs keeper, no defenders in the box. Math: ball travels 11 m in ~0.4 s at 70 mph; keeper\'s reaction time + dive is ~0.6 s. Top corners are physically unsavable — the keeper can\'t reach them in time. Bottom corners need precision (~30 cm tolerance) but the keeper can theoretically reach. Elite-league conversion rate: ~76%. Strategy: PICK A CORNER and commit; "down the middle" works ~80% but only if the keeper dives, which they do ~75% of the time.',
      passes: [
        ['CAM', 'ST'],    // run-up coordination — CAM (or whoever) sets the kick
        ['ST', 'CAM']     // rebound option if keeper saves (fastest player to 2nd ball wins)
      ] },
    { id: 'goalkick-long',
      label: 'Goal Kick — Long Ball',
      icon: '⚡',
      setPiece: true,
      beats: ['highpress'], struggles: ['midblock'],
      teach: 'Restart from inside the 6-yd box after the attacking team puts it over the byline. Long: keeper booms it 60+ m to the halfway line, contesting an aerial duel with the striker. Math: ball spends ~3 s in the air, so all 22 players reposition during flight — turns the restart into a 50/50 second-ball scramble. Used by direct teams (Burnley, Bielsa-era Leeds against the press).',
      passes: [
        ['GK', 'ST'],     // long boomed ball to the striker
        ['ST', 'CAM']     // flick-on / second-ball winner
      ] },
    { id: 'goalkick-short',
      label: 'Goal Kick — Build From Back',
      icon: '🧩',
      setPiece: true,
      beats: ['lowblock'], struggles: ['highpress'],
      teach: 'Modern alternative since the 2019 rule change (defenders can receive inside the box). Keeper plays short to a CB, who breaks the press with a vertical pass to a midfielder. Math: 4-vs-3 numbers advantage at the back creates a passing triangle that is almost impossible to press without leaving someone open. City + Brighton score ~5% of their goals from sequences that started here.',
      passes: [
        ['GK', 'RCB'],    // short to right CB
        ['RCB', 'CDM'],   // CB breaks press to defensive mid
        ['CDM', 'CAM']    // mid switches to attacking mid → forward play
      ] }
  ];

  var SOCCER_SHAPES = [
    { id: 'highpress',
      label: 'High Press (Klopp)',
      teach: 'Defenders push up to the halfway line; forwards press the opposition\'s back four. High risk: a long ball over the top can spring a counter. High reward: forces turnovers in the opponent\'s third.' },
    { id: 'midblock',
      label: 'Mid-Block',
      teach: 'Defensive line at ~30m from own goal. Most common modern shape. Compromises between catching opponents in their half (high press) and protecting the box (low block).' },
    { id: 'lowblock',
      label: 'Low Block (Park the Bus)',
      teach: 'All 11 defenders inside the defensive third. Used when leading or facing a stronger team. Math: shrinks the spaces the attack can exploit, but concedes possession + territory.' },
    { id: 'offsidetrap',
      label: 'Offside Trap',
      teach: 'Defensive line steps up in unison just as the ball is played, catching the attacker offside (Law 11: any part of head/body/feet ahead of the second-last defender at the moment of the pass). Geometric line — perfect coordination required.' }
  ];

  // Soccer defenders — 11 markers placed by defensive shape. Returns the
  // same { id, role, x, y } shape as football's buildDefenders so the
  // renderer + analysis don't need to special-case sport.
  function buildSoccerDefenders(shapeId) {
    var W = PITCH_WIDTH;
    // Defending team starts on the LEFT half of the pitch. We mirror the
    // attacker layout so the visual is symmetric: 4 DEF + 4 MID + 2 FWD + GK.
    if (shapeId === 'highpress') {
      return [
        { id: 'dGK',   role: 'GK',  x: 100,      y: W / 2 },
        { id: 'dRB',   role: 'DEF', x: 75,       y: W * 0.20 },
        { id: 'dRCB',  role: 'DEF', x: 70,       y: W * 0.40 },
        { id: 'dLCB',  role: 'DEF', x: 70,       y: W * 0.60 },
        { id: 'dLB',   role: 'DEF', x: 75,       y: W * 0.80 },
        { id: 'dCDM',  role: 'MID', x: 55,       y: W / 2 },
        { id: 'dRCM',  role: 'MID', x: 50,       y: W * 0.35 },
        { id: 'dLCM',  role: 'MID', x: 50,       y: W * 0.65 },
        { id: 'dRW',   role: 'FWD', x: 30,       y: W * 0.20 },
        { id: 'dST',   role: 'FWD', x: 25,       y: W / 2 },
        { id: 'dLW',   role: 'FWD', x: 30,       y: W * 0.80 }
      ];
    }
    if (shapeId === 'lowblock') {
      // Whole team inside their own third (from x=70 to x=105)
      return [
        { id: 'dGK',   role: 'GK',  x: 100,      y: W / 2 },
        { id: 'dRB',   role: 'DEF', x: 90,       y: W * 0.20 },
        { id: 'dRCB',  role: 'DEF', x: 88,       y: W * 0.40 },
        { id: 'dLCB',  role: 'DEF', x: 88,       y: W * 0.60 },
        { id: 'dLB',   role: 'DEF', x: 90,       y: W * 0.80 },
        { id: 'dRM',   role: 'MID', x: 80,       y: W * 0.20 },
        { id: 'dRCM',  role: 'MID', x: 78,       y: W * 0.42 },
        { id: 'dLCM',  role: 'MID', x: 78,       y: W * 0.58 },
        { id: 'dLM',   role: 'MID', x: 80,       y: W * 0.80 },
        { id: 'dRST',  role: 'FWD', x: 70,       y: W * 0.42 },
        { id: 'dLST',  role: 'FWD', x: 70,       y: W * 0.58 }
      ];
    }
    if (shapeId === 'offsidetrap') {
      // Mid-block but with the back 4 stepped up sharply on a single line
      return [
        { id: 'dGK',   role: 'GK',  x: 100,      y: W / 2 },
        { id: 'dRB',   role: 'DEF', x: 60,       y: W * 0.20 },
        { id: 'dRCB',  role: 'DEF', x: 60,       y: W * 0.40 },
        { id: 'dLCB',  role: 'DEF', x: 60,       y: W * 0.60 },
        { id: 'dLB',   role: 'DEF', x: 60,       y: W * 0.80 },
        { id: 'dCDM',  role: 'MID', x: 70,       y: W / 2 },
        { id: 'dRCM',  role: 'MID', x: 75,       y: W * 0.35 },
        { id: 'dLCM',  role: 'MID', x: 75,       y: W * 0.65 },
        { id: 'dRW',   role: 'FWD', x: 85,       y: W * 0.20 },
        { id: 'dST',   role: 'FWD', x: 85,       y: W / 2 },
        { id: 'dLW',   role: 'FWD', x: 85,       y: W * 0.80 }
      ];
    }
    // Default: midblock
    return [
      { id: 'dGK',   role: 'GK',  x: 100,      y: W / 2 },
      { id: 'dRB',   role: 'DEF', x: 80,       y: W * 0.20 },
      { id: 'dRCB',  role: 'DEF', x: 78,       y: W * 0.40 },
      { id: 'dLCB',  role: 'DEF', x: 78,       y: W * 0.60 },
      { id: 'dLB',   role: 'DEF', x: 80,       y: W * 0.80 },
      { id: 'dCDM',  role: 'MID', x: 65,       y: W / 2 },
      { id: 'dRCM',  role: 'MID', x: 62,       y: W * 0.35 },
      { id: 'dLCM',  role: 'MID', x: 62,       y: W * 0.65 },
      { id: 'dRW',   role: 'FWD', x: 50,       y: W * 0.20 },
      { id: 'dST',   role: 'FWD', x: 45,       y: W / 2 },
      { id: 'dLW',   role: 'FWD', x: 50,       y: W * 0.80 }
    ];
  }

  // ═══════════════════════════════════════════
  // FOOTBALL EPA MODEL — simplified expected-points lookup
  // ═══════════════════════════════════════════
  // Real EPA models (nflfastR, ESPN) are gradient-boosted classifiers fit
  // to ~500K plays with features for down, distance, score, time, field
  // position, etc. Our textbook model uses ONLY field position + down,
  // calibrated against published nflfastR averages so the numbers are
  // recognizable to anyone who's read a football analytics article.
  //
  // expectedPoints(yardsToGoal, down) → expected next-score value (in
  // points, can be negative if the opponent is more likely to score
  // next from this state).
  //
  // Calibration:
  //   1st-and-10 own 25 (75 yd to goal)        ≈ +1.4 EP
  //   1st-and-10 midfield (50 yd to goal)      ≈ +2.4 EP
  //   1st-and-10 opp 25 (25 yd to goal)        ≈ +4.6 EP
  //   1st-and-goal opp 5                       ≈ +5.7 EP
  //   1st-and-goal opp 1                       ≈ +6.0 EP
  //   3rd-and-10 own 10                        ≈ +0.0 EP
  //   4th-and-1 opp 5 (decision time)          ≈ +5.3 EP
  function expectedPoints(yardsToGoal, down) {
    // Field-position component — closer to goal = higher EP. Approximated
    // as a sigmoid that peaks near 6 (touchdown ≈ 7 with point-after) at
    // the goal line and goes asymptotic at ~+1.0 from the team's own end.
    var ytg = Math.max(1, Math.min(99, yardsToGoal));
    var fieldComponent = 6.5 - 5.5 / (1 + Math.exp((50 - ytg) * 0.045));
    // Down penalty — each later down sheds a bit of EP because remaining
    // attempts shrink. Calibrated so 1st down ≈ baseline, 4th down on
    // your side of midfield is near zero.
    var downPenalty = (down - 1) * 0.45;
    return Math.max(-2, fieldComponent - downPenalty);
  }
  // Translate a Run Play outcome into ΔEPA. We need yards-gained, which
  // we approximate from the receiver's route end-point distance from the
  // line of scrimmage; the next play would start there if the catch was
  // clean. Turnovers (broken-up + intercepted) flip sign and use ~50 yd
  // as the opponent's typical post-INT field position.
  function computeEPA(losYardsToGoal, down, outcome, receiverEndpointX) {
    var preEP = expectedPoints(losYardsToGoal, down);
    if (!outcome) return { preEP: preEP, postEP: preEP, dEPA: 0 };
    if (outcome.location === 'caught') {
      // Yards gained = distance from LOS to receiver's end position.
      // (PlayLab's LOS is at d.losX yards-from-back-of-our-end-zone, so
      // receiver_x - LOS_x = yards downfield.)
      var yardsGained = Math.max(0, (receiverEndpointX || 0) - (LOS_DEFAULT));
      var newYTG = Math.max(1, losYardsToGoal - yardsGained);
      var newDown = 1; // first down on a completion (simplification — we
                      // don't track whether the catch made the line-to-gain)
      var postEP = expectedPoints(newYTG, newDown);
      return { preEP: preEP, postEP: postEP, dEPA: postEP - preEP, yardsGained: yardsGained };
    }
    if (outcome.location === 'brokenup') {
      // Pass break-up = incomplete, down + 1, yardline unchanged
      var nextDown = Math.min(4, down + 1);
      var postBU = expectedPoints(losYardsToGoal, nextDown);
      return { preEP: preEP, postEP: postBU, dEPA: postBU - preEP, yardsGained: 0 };
    }
    // Default (incomplete / wild): same as broken-up
    var postInc = expectedPoints(losYardsToGoal, Math.min(4, down + 1));
    return { preEP: preEP, postEP: postInc, dEPA: postInc - preEP, yardsGained: 0 };
  }

  // ═══════════════════════════════════════════
  // SOCCER xG MODEL — simplified expected-goals lookup
  // ═══════════════════════════════════════════
  // Real xG models (StatsBomb, Opta) are gradient-boosted classifiers
  // fit to ~1M shots with features for body part, defender pressure,
  // pre-shot pass type, etc. We use the textbook "geometric xG" — only
  // distance + angle subtended by the goal — which captures ~70% of
  // the variance in real xG values for open-play shots.
  //
  // angle θ = the visible angle of the goal from the shooting position
  //           (atan2 between left post and right post, capped at π).
  // distance d = straight-line distance from shot location to goal center
  //           (in meters; goal at x=PITCH_LENGTH for the attacking team).
  // xG ≈ sin(θ) / (1 + (d/12)^1.5)
  // Calibrated so a penalty kick (11m, ~38° angle) ≈ 0.76 xG (real
  // average is 0.78), a 25-yd central shot ≈ 0.05, near-side narrow
  // angle approaches 0.
  function computeXG(shotX, shotY) {
    var goalLineX = PITCH_LENGTH;
    var halfGoal = SOCCER_GOAL_WIDTH / 2;
    var goalCenterY = PITCH_WIDTH / 2;
    // Angle subtended by the goal from the shot
    var leftPostY = goalCenterY - halfGoal;
    var rightPostY = goalCenterY + halfGoal;
    var dxGoal = goalLineX - shotX;
    if (dxGoal <= 0.5) return 0; // behind / on the goal line — no shot
    var aL = Math.atan2(leftPostY - shotY, dxGoal);
    var aR = Math.atan2(rightPostY - shotY, dxGoal);
    var theta = Math.abs(aR - aL);
    // Distance to goal center
    var dx = goalCenterY - shotY;
    var d = Math.sqrt(dxGoal * dxGoal + dx * dx);
    // The model
    var xg = Math.sin(theta) / (1 + Math.pow(d / 12, 1.5));
    return Math.max(0, Math.min(1, xg));
  }

  // ── Defender layout per coverage ──
  // Returns 11 defender positions for the active coverage. The four down
  // linemen (DL) sit just past LOS regardless of coverage. The back 7
  // (3 LB + 4 DB) move based on the coverage. We position zone defenders
  // at their zone centroid so the visual matches the open-receiver
  // analysis math; man defenders (Cover 1) sit ON the receivers they're
  // covering for a clear "X covers Y" read.
  function buildDefenders(coverageId, losX, offense) {
    losX = losX !== undefined ? losX : LOS_DEFAULT;
    var W = FIELD_WIDTH;
    // 4-man front, on the LOS just past it
    var dl = [
      { id: 'DE1', role: 'DL', x: losX + 1, y: W / 2 + 4 },
      { id: 'DT1', role: 'DL', x: losX + 1, y: W / 2 + 1 },
      { id: 'DT2', role: 'DL', x: losX + 1, y: W / 2 - 1 },
      { id: 'DE2', role: 'DL', x: losX + 1, y: W / 2 - 4 }
    ];
    // The back 7 — coverage-specific
    if (coverageId === 'cover1') {
      // 1 deep safety + 3 LBs + 3 man corners (one slot/nickel)
      var wr1 = (offense || []).find(function(p) { return p.id === 'WR1'; });
      var wr2 = (offense || []).find(function(p) { return p.id === 'WR2'; });
      var slot = (offense || []).find(function(p) { return p.id === 'SLOT'; });
      var te = (offense || []).find(function(p) { return p.id === 'TE'; });
      return dl.concat([
        { id: 'FS', role: 'S', x: losX + 25, y: W / 2 },                                     // deep middle
        { id: 'CB1', role: 'CB', x: (wr1 ? wr1.x : losX) + 5, y: (wr1 ? wr1.y : 4) + 1 },     // shadows WR1
        { id: 'CB2', role: 'CB', x: (wr2 ? wr2.x : losX) + 5, y: (wr2 ? wr2.y : W - 4) - 1 }, // shadows WR2
        { id: 'NB',  role: 'CB', x: (slot ? slot.x : losX) + 5, y: (slot ? slot.y : W - 9) }, // shadows slot
        { id: 'SLB', role: 'LB', x: losX + 5, y: (te ? te.y : W / 2 - 4) + 1 },               // shadows TE
        { id: 'MLB', role: 'LB', x: losX + 6, y: W / 2 },                                     // middle
        { id: 'WLB', role: 'LB', x: losX + 5, y: W / 2 + 4 }                                  // weakside
      ]);
    }
    if (coverageId === 'cover0') {
      // Pure man, no FS. Same WR/slot/TE shadowing as Cover 1, but the
      // single high safety becomes an EXTRA RUSHER at the LOS — the
      // signature blitz look. 5-man front + 5 in man + 1 alley filler.
      var wr1c0 = (offense || []).find(function(p) { return p.id === 'WR1'; });
      var wr2c0 = (offense || []).find(function(p) { return p.id === 'WR2'; });
      var slotc0 = (offense || []).find(function(p) { return p.id === 'SLOT'; });
      var tec0 = (offense || []).find(function(p) { return p.id === 'TE'; });
      var rb = (offense || []).find(function(p) { return p.id === 'RB'; });
      return dl.concat([
        { id: 'BZR', role: 'LB', x: losX + 1, y: W / 2 },                                     // 5th rusher (free safety blitzing)
        { id: 'CB1', role: 'CB', x: (wr1c0 ? wr1c0.x : losX) + 4, y: (wr1c0 ? wr1c0.y : 4) },
        { id: 'CB2', role: 'CB', x: (wr2c0 ? wr2c0.x : losX) + 4, y: (wr2c0 ? wr2c0.y : W - 4) },
        { id: 'NB',  role: 'CB', x: (slotc0 ? slotc0.x : losX) + 4, y: (slotc0 ? slotc0.y : W - 9) },
        { id: 'SLB', role: 'LB', x: losX + 4, y: (tec0 ? tec0.y : W / 2 - 4) },                // shadows TE
        { id: 'MLB', role: 'LB', x: losX + 4, y: (rb ? rb.y : W / 2) - 2 },                    // shadows RB
        { id: 'WLB', role: 'LB', x: losX + 5, y: W / 2 + 6 }                                   // backside fold
      ]);
    }
    if (coverageId === 'robber') {
      // Cover 1 + a robber lurker. Same man shadows as cover1 but the
      // strong-side LB becomes the ROBBER, sitting in the middle hole at
      // ~10-12 yards.
      var wr1r = (offense || []).find(function(p) { return p.id === 'WR1'; });
      var wr2r = (offense || []).find(function(p) { return p.id === 'WR2'; });
      var slotr = (offense || []).find(function(p) { return p.id === 'SLOT'; });
      var ter = (offense || []).find(function(p) { return p.id === 'TE'; });
      return dl.concat([
        { id: 'FS',  role: 'S',  x: losX + 28, y: W / 2 },                                    // deep middle (deeper than C1)
        { id: 'ROB', role: 'S',  x: losX + 11, y: W / 2 },                                    // robber in the middle hole
        { id: 'CB1', role: 'CB', x: (wr1r ? wr1r.x : losX) + 5, y: (wr1r ? wr1r.y : 4) + 1 },
        { id: 'CB2', role: 'CB', x: (wr2r ? wr2r.x : losX) + 5, y: (wr2r ? wr2r.y : W - 4) - 1 },
        { id: 'NB',  role: 'CB', x: (slotr ? slotr.x : losX) + 5, y: (slotr ? slotr.y : W - 9) },
        { id: 'SLB', role: 'LB', x: losX + 5, y: (ter ? ter.y : W / 2 - 4) + 1 },
        { id: 'WLB', role: 'LB', x: losX + 5, y: W / 2 + 4 }
      ]);
    }
    // Zone coverages — place each back-7 defender at the centroid of
    // their assigned zone (matches the open-receiver analysis math).
    var zones = buildZones(coverageId, losX);
    var back7 = zones.map(function(z) {
      var c = polyCentroid(z.poly);
      // Use the zone label to pick a role tag — matches "S" / "CB" / "LB"
      var role = z.label.indexOf('Deep') === 0 ? (z.label.indexOf('half') !== -1 ? 'S' : (z.label.indexOf('third') !== -1 ? 'CB' : 'S'))
               : z.label.indexOf('Hook') === 0 ? 'LB'
               : z.label.indexOf('Flat') === 0 ? 'LB'
               : z.label.indexOf('Curl') === 0 ? 'LB'
               : z.label.indexOf('MLB') === 0 ? 'LB'
               : 'DB';
      return { id: 'D' + role + (Math.round(c.y * 10) % 100), role: role, x: c.x, y: c.y };
    });
    // If the coverage produced fewer than 7 zones (e.g., only the FS zone
    // for Cover 1), pad with generic LB positions in the box. We hit this
    // path only for malformed coverages — the case is defensive.
    while (back7.length < 7) {
      back7.push({ id: 'LB' + back7.length, role: 'LB', x: losX + 5, y: W / 2 });
    }
    return dl.concat(back7);
  }

  var COVERAGES = [
    { id: 'cover1', label: 'Cover 1 (Man)', short: 'C1',
      teach: 'One deep safety. Everyone else man-to-man. Beat with: pick routes (mesh), speed mismatches, RPOs.' },
    { id: 'cover2', label: 'Cover 2', short: 'C2',
      teach: 'Two deep safeties split the field. Five underneath zones. Beat with: 4 verticals (slot up the seam), or routes that find the gap between deep & underneath.' },
    { id: 'cover3', label: 'Cover 3', short: 'C3',
      teach: 'Three deep thirds + four underneath. Beat with: short crossing routes, slants, or smash (corner+hitch from same side).' },
    { id: 'tampa2', label: 'Tampa 2', short: 'T2',
      teach: 'Cover 2 with the MLB dropping into the deep middle to close the seam. Beat with: deep over routes, intermediate digs, or attacking the curl-flat between defenders.' },
    { id: 'cover4', label: 'Cover 4 (Quarters)', short: 'C4',
      teach: 'Four deep zones — every deep route is covered. Modern college + Saban Alabama staple. Beat with: short-and-quick (Stick, Slant) — the underneath is LIGHT (only 3 defenders). Hard to beat deep, easy to nickel-and-dime.' },
    { id: 'cover0', label: 'Cover 0 (All-Out Blitz)', short: 'C0',
      teach: 'NO deep safety. 7+ rushers, everyone else in man. The QB has ~2 seconds before contact — accuracy + quick decisions decide it. Beat with: hot routes (slant, quick out), max protect (RB + TE stay in to block), or a back-shoulder fade if your WR is taller than the corner.' },
    { id: 'cover6', label: 'Cover 6 (Quarter-Quarter-Half)', short: 'C6',
      teach: 'Split-field coverage. Right side plays Cover 4 (two deep quarters), left side plays Cover 2 (one deep half). Used to handle 3x1 trips formations — quarters into trips, halves to the lone receiver. Beat with: attack the seam BETWEEN the coverages where the safeties\' rules conflict.' },
    { id: 'robber', label: 'Robber (C1 + Lurker)', short: 'RB',
      teach: 'Cover 1 with a "robber" defender lurking in the middle hole at ~10-12 yd. He BAITS the QB into throwing a dig or over route, then breaks for a pick. Tyrann Mathieu / Patrick Peterson built careers here. Beat with: clear out the middle (mesh, double-cross), then attack the soft spot the robber vacated.' }
  ];

  // ═══════════════════════════════════════════
  // DRILLS — challenge sequences
  // ═══════════════════════════════════════════
  // Same pattern as ThrowLab drills: each task has goal + test(stats) +
  // progress(stats). Tasks complete in order; the active task shows above
  // the canvas. Stats accumulate from "Run Play" outcomes — drills only
  // count animated runs, not just toggling between coverages, so the
  // student has to actually execute the play to advance.
  var PLAYLAB_SOCCER_DRILLS = {
    label: 'Tactical Drills',
    tasks: [
      { id: 'highxg-shot',
        goal: 'Run a sequence ending in a high-xG position (xG > 0.30)',
        test: function(s) { return s.highXgShot; },
        progress: function(s) { return s.highXgShot ? 'Done!' : 'Pick a concept that gets the ball into the box, then Run Play'; },
        tip: 'Toggle the xG heatmap — anything red is > 0.30. Tiki-Taka into a low block tends to thread through; Counter against a high press is also high-xG.' },
      { id: 'six-concepts',
        goal: 'Try 6 different tactical concepts',
        test: function(s) { return Object.keys(s.conceptsRun || {}).length >= 6; },
        progress: function(s) { return Object.keys(s.conceptsRun || {}).length + ' / 6 concepts run'; },
        tip: '13 concepts in the library: 3 build-up (Tiki-Taka / Counter / Gegenpress) + 10 set-pieces. Mix build-up patterns with set-pieces to see different geometric ideas.' },
      { id: 'beat-each-shape',
        goal: 'Get a sequence through each of the 4 defensive shapes',
        test: function(s) { return Object.keys(s.shapesPlayed || {}).length >= 4; },
        progress: function(s) { return Object.keys(s.shapesPlayed || {}).length + ' / 4 defensive shapes faced'; },
        tip: 'High Press, Mid-Block, Low Block, Offside Trap — each demands different ball-progression math.' },
      { id: 'try-a-set-piece',
        goal: 'Execute any set-piece concept (corner / FK / throw-in / penalty / goal kick)',
        test: function(s) { return s.setPieceRun; },
        progress: function(s) { return s.setPieceRun ? 'Done!' : 'Pick a concept marked with the set-piece icon and Run Play'; },
        tip: 'Set-pieces account for ~30% of all goals in modern football. The math is geometry — fixed starting position lets you plan the run-up and the runs into the box.' },
      { id: 'four-set-piece-types',
        goal: 'Run all 4 set-piece TYPES (corner, free kick, throw-in, penalty/goal-kick)',
        test: function(s) { return Object.keys(s.setPieceTypesRun || {}).length >= 4; },
        progress: function(s) { return Object.keys(s.setPieceTypesRun || {}).length + ' / 4 set-piece types tried'; },
        tip: 'Corners curve toward (in-swinger) or away from (out-swinger) the goal. Free kicks attack the goal directly or serve to the box. Throw-ins skip offside. Penalties are 1v1 math.' },
      { id: 'design-and-shoot',
        goal: 'Move at least 2 players (custom formation) and end in a > 0.20 xG position',
        test: function(s) { return s.customHighXg; },
        progress: function(s) { return s.customHighXg ? 'Done!' : 'Drag 2+ players, then Run Play and aim for a yellow-or-red xG cell'; },
        tip: 'Push a winger inside, drop the striker between lines, see if you can engineer a better shot. Coach Mode helps analyze your design.' }
    ]
  };

  var PLAYLAB_DRILLS = {
    label: 'Coordinator Drills',
    tasks: [
      { id: 'beat-each-coverage',
        goal: 'Complete a pass against 6 different coverages',
        test: function(s) { return s.coveragesBeaten >= 6; },
        progress: function(s) { return s.coveragesBeaten + ' / 6 coverages beaten ✓'; },
        tip: 'Switch the defense after each completion. With 8 coverages in the library, you\'ll need at least 6 distinct looks. Different plays beat different coverages — that\'s the whole game.' },
      { id: 'three-different-plays',
        goal: 'Complete passes with 3 DIFFERENT plays',
        test: function(s) { return Object.keys(s.completionsByPlay || {}).length >= 3; },
        progress: function(s) { return Object.keys(s.completionsByPlay || {}).length + ' / 3 different plays completed'; },
        tip: 'Variety matters — a great offense has multiple concepts, not just a favorite play.' },
      { id: 'beat-cover-2-with-smash',
        goal: 'Beat Cover 2 specifically with the Smash concept',
        test: function(s) { return s.smashVsCover2; },
        progress: function(s) { return s.smashVsCover2 ? 'Done!' : 'Pick Smash + Cover 2, then Run Play'; },
        tip: 'Smash is THE Cover-2 beater. The hi-lo corner attacks the deep half safety while the hitch sits under the corner.' },
      { id: 'beat-cover-0-with-hot',
        goal: 'Beat Cover 0 (all-out blitz) with a hot route — Slant, Bubble, or Stick',
        test: function(s) { return s.c0WithHot; },
        progress: function(s) { return s.c0WithHot ? 'Done!' : 'Pick Slant / Bubble / Stick + Cover 0, then Run Play'; },
        tip: 'Cover 0 = no deep safety + 7 rushers. The QB has ~2 seconds. Hot routes (3-step concepts) are the only safe answer — anything longer gets sacked.' },
      { id: 'beat-cover-6-with-trips',
        goal: 'Beat Cover 6 (split-field) with the Trips Bunch concept',
        test: function(s) { return s.c6WithTrips; },
        progress: function(s) { return s.c6WithTrips ? 'Done!' : 'Pick Trips Bunch + Cover 6, then Run Play'; },
        tip: 'Cover 6 = quarters one side, halves the other. The seam between coverages is the soft spot. Trips Bunch overloads ONE side — pick the side facing halves to triangle the lone safety.' },
      { id: 'beat-robber-with-mesh',
        goal: 'Beat Robber coverage with the Mesh concept',
        test: function(s) { return s.robberWithMesh; },
        progress: function(s) { return s.robberWithMesh ? 'Done!' : 'Pick Mesh + Robber, then Run Play'; },
        tip: 'The Robber lives at ~10 yd in the middle hole, baiting digs. Mesh sends two crossers under the robber\'s area — he picks one, the other comes wide open.' },
      { id: 'design-and-complete',
        goal: 'Design a custom play (drag at least 2 players) and complete it',
        test: function(s) { return s.completedCustomPlay; },
        progress: function(s) { return s.completedCustomPlay ? 'Done!' : 'Drag 2+ players, then Run Play and complete the throw'; },
        tip: 'Move your slot WR wider, push your TE deeper, see if you can find a new window. Coach Mode can help analyze.' }
    ]
  };

  // ═══════════════════════════════════════════
  // GEOMETRY HELPERS — convert play data → absolute field coords
  // ═══════════════════════════════════════════
  // Apply a play's routes to a formation, returning a new players array
  // with `route: [{x, y}, ...]` populated for each receiver.
  // ═══════════════════════════════════════════
  // SCENARIOS — one-click teaching demos
  // ═══════════════════════════════════════════
  // Each scenario sets sport + play/concept + coverage/shape + (optional)
  // line of scrimmage for football, in a single batched state update.
  // Scenarios are how a teacher demos a tactical idea in front of a
  // class without manually dialing 4-5 settings.
  var PLAYLAB_SCENARIOS = [
    // ── Football ──
    { id: 'patriots-2828', label: 'Patriots 28-3 Comeback', icon: '🏆',
      sport: 'football', playId: 'stick', coverageId: 'cover3', losX: 25,
      teach: 'Stick concept on 3rd-and-medium from own 25 vs Cover 3. The TE\'s 5-yd curl in the soft underbelly of zone — the route Brady ran 100+ times during the 2017 Super Bowl comeback. ~80% conversion vs zone.',
      questions: [
        'Why is the TE\'s 5-yard curl ALWAYS open against Cover 3 zone — what is the geometry of the empty space?',
        'If the defense flipped to Cover 1 (man), would Stick still work? What\'s the new math?',
        'Down 25 points, 6 minutes left. Does playing for 5-yard chunks make sense? When does that math break?'
      ] },
    { id: 'greatest-show', label: '"Greatest Show on Turf"', icon: '🚀',
      sport: 'football', playId: 'fourverts', coverageId: 'cover1', losX: 50,
      teach: 'Mike Martz\'s Rams: 4 Verticals from midfield vs Cover 1. The single-high safety can\'t cover 4 deep routes — somebody is mathematically open. The vertical-passing-game blueprint from 1999-2001.',
      questions: [
        'You have 4 deep routes vs 1 deep safety. By the pigeonhole principle, what is GUARANTEED to be true?',
        'The QB has ~2.5 seconds to throw deep. How does that change which routes are realistic options?',
        'Cover 1 has only 1 deep safety. Can you design a 5-vertical concept that guarantees 2 open receivers?'
      ] },
    { id: 'bradys-drive', label: "Brady's 3rd-Down Drive", icon: '🎯',
      sport: 'football', playId: 'drive', coverageId: 'cover2', losX: 30,
      teach: 'Drive concept (shallow + dig) vs Cover 2 from own 30. The MIKE has to pick — whichever route he doesn\'t carry is the throw. The clutch 3rd-and-medium concept Tom Brady ran for 20 years.',
      questions: [
        'The MIKE linebacker can only cover ONE depth at a time (shallow or dig). Why is forcing a defender into a "pick one" decision such a recurring offensive idea?',
        'If the MIKE picks the dig, the shallow is open — but how does the throw timing change? What\'s the trade-off in YPA (yards per attempt)?',
        'Could you defend Drive with a "spy" defender who specifically watches both routes? What would that cost you elsewhere?'
      ] },
    { id: 'wildcat-special', label: 'Wildcat Goal-Line', icon: '🐯',
      sport: 'football', playId: 'wildcat', coverageId: 'cover1', losX: 95,
      teach: '2008 Miami Dolphins, 5 yards from the goal line. Direct snap to the RB with WRs blocking the edges. Adds a numbers-in-the-box advantage at the moment when the defense is stacked tightest.',
      questions: [
        'Removing the QB from the play means he can\'t throw — but what does it ADD to the offense\'s blocking math?',
        'Why is the Wildcat used MORE in short-yardage / goal-line than at midfield? What changes geometrically at the 5-yard line?',
        'The defense COULD always blitz an extra man to overwhelm the box. Why don\'t they?'
      ] },
    { id: 'hail-mary', label: 'Hail Mary at 0:00', icon: '🙏',
      sport: 'football', playId: 'hailmary', coverageId: 'cover4', losX: 40,
      teach: 'Last second, down 3, no timeouts. Hail Mary vs Cover 4 (every deep route covered). 10% chance of a miracle, but it\'s the only play with positive expected value at this state. Hand-to-God geometry.',
      questions: [
        'Down 3, time = 0:00. EV(field goal) requires getting 25+ yards closer in zero time. EV(Hail Mary) ≈ 10% × 6 = 0.6. Why is "Hail Mary" the right choice here mathematically?',
        'A jump-ball in the end zone is ~1-on-3 (one WR vs a CB + 2 safeties). What spatial geometry gives the offense a fighting chance anyway?',
        'If you were the defensive coordinator, would you play Cover 4, or Cover 0 with no rush? Defend each.'
      ] },
    { id: 'beat-c0-blitz', label: 'Slant vs All-Out Blitz', icon: '⚡',
      sport: 'football', playId: 'slant', coverageId: 'cover0', losX: 35,
      teach: 'Cover 0 = 7 rushers, no deep safety, all man underneath. The QB has ~2 seconds. The Slant is the ONLY answer that gets the ball out fast enough — a 5-yd in-cut at full speed beats man coverage and beats the rush clock.',
      questions: [
        'Cover 0 sends 7 rushers but leaves no deep safety. What\'s the trade-off the defense is making?',
        'A slant takes ~1.5 seconds from snap to catch. Could a 4 Verticals concept also work here? Why or why not?',
        'If you\'re the offense and you SUSPECT Cover 0, what do you change pre-snap?'
      ] },
    { id: 'trips-bunch-rz', label: 'Trips Bunch in the Red Zone', icon: '⫷',
      sport: 'football', playId: 'trips', coverageId: 'cover2', losX: 92,
      teach: 'Three receivers form a triangle (corner / flat / hitch) at the goal line vs Cover 2. The single corner has to pick a depth — the OPPOSITE level is the throw. ~80% conversion inside the 5.',
      questions: [
        'Three receivers running corner / flat / hitch attack 3 different depths. With ONE corner defender available to that side, why does the offense always have a winner?',
        'How does this concept change when you\'re at the 50 vs the 5? Why does field position make Trips so much more dangerous in the red zone?',
        'If the defense rolls a safety down to help, what new vulnerability does that open?'
      ] },

    // ── Soccer ──
    { id: 'pep-tikitaka', label: "Pep's Tiki-Taka vs Burnley", icon: '🔁',
      sport: 'soccer', formationId: '433', conceptId: 'tikitaka', shapeId: 'lowblock',
      teach: 'Manchester City\'s 4-3-3 + Tiki-Taka vs a parked-bus Burnley low block. The triangles probe the compressed defense for the smallest window — possession often crosses 80% in these matchups, but the scoreboard hinges on whether City finds the through-ball.',
      questions: [
        'City has 80% possession but the score is 0-0. Why don\'t possession statistics directly predict goals?',
        'The defense has 10 players inside their own third. How does that change the geometry of available passing lanes?',
        'Pep famously says "we attack to defend." How does keeping the ball in the opposite half also serve as defense?'
      ] },
    { id: 'klopp-counter', label: 'Klopp Counter-Attack', icon: '⚡',
      sport: 'soccer', formationId: '433', conceptId: 'counter', shapeId: 'highpress',
      teach: 'Liverpool 2019: opposition is high-pressing, Liverpool wins the ball at midfield, Salah / Mané / Firmino sprint into space. The MORE aggressive the press, the MORE space behind for the counter. Geometry favors the side that wins the ball.',
      questions: [
        'A high press WINS turnovers in dangerous areas. So why does it also CREATE the space that beats it?',
        'Counter-attacking goals average ~3 passes. Possession-based goals average ~8+. What does that say about which approach is more efficient when it works?',
        'Should the high-pressing team drop deeper after losing the ball? When is that the right call vs continuing to press?'
      ] },
    { id: 'conte-352', label: 'Conte 3-5-2 Defense', icon: '🛡️',
      sport: 'soccer', formationId: '352', conceptId: 'gegenpress', shapeId: 'midblock',
      teach: 'Antonio Conte\'s Inter / Tottenham 3-5-2: 3 CBs + 2 wing-backs deny wide overloads, the 3-man midfield outnumbers a 4-3-3 opponent in central areas. Combined with gegenpress on the turnover, opponents can\'t get out.',
      questions: [
        '3-5-2 has 3 central midfielders vs 4-3-3\'s 3 midfielders — same number, but is the geometry the same?',
        'Wing-backs have to cover the WHOLE flank from box to box. Why is that fitness demand the formation\'s biggest weakness?',
        'When the wing-backs are pushed up and the team loses the ball, the back 3 are exposed wide. How does gegenpress mitigate that?'
      ] },
    { id: 'pirlo-fk', label: 'Pirlo Free Kick', icon: '🎯',
      sport: 'soccer', formationId: '4231', conceptId: 'freekick-direct', shapeId: 'midblock',
      teach: 'Andrea Pirlo\'s knuckle-direct from 22 m. The geometry: keeper covers ~75% of the goal mouth from 22 m straight on, but the corners are scoring zones. Pirlo\'s knuckle-strike (no spin → wobble) made the keeper\'s job impossible.',
      questions: [
        'The keeper covers 75% of the goal mouth statically. But a knuckle ball wobbles unpredictably — why does that effectively ENLARGE the unsavable area?',
        'A curling shot bends ~1.5 m around the wall. A knuckle shot doesn\'t curl but wobbles. Which is harder for the keeper, and why?',
        'From 22 m, ball flight is ~0.5 s. How much reaction time does the keeper actually have, and how does that interact with the wobble?'
      ] },
    { id: 'corner-out-equalizer', label: 'Late Out-Swinger Equalizer', icon: '↩️',
      sport: 'soccer', formationId: '4231', conceptId: 'corner-out', shapeId: 'lowblock',
      teach: '88th minute, down 1, defending team has parked the bus. Out-swinging corner toward the penalty spot — your CAM and pushed-up CB attack the ball at full speed. ~3.5% conversion per corner, but cumulative odds across multiple corners + low-block fatigue make this the highest-EV equalizer concept.',
      questions: [
        '~3.5% conversion sounds low, but if you take 4 corners in 5 minutes, what\'s the cumulative probability of scoring?',
        'Why is the OUT-SWINGER better than the in-swinger when the defense is in a tight low block?',
        'Pushing your CB up for corners is risky — what happens if the defense wins the ball and breaks at speed? How do you mitigate the geometric exposure?'
      ] }
  ];

  // ═══════════════════════════════════════════
  // MATCHUP INTELLIGENCE — play vs coverage compatibility
  // ═══════════════════════════════════════════
  // Each PLAY entry carries `beats` (coverages it exploits) and
  // `struggles` (coverages it has trouble with). We derive a 3-tier
  // grade for the active play vs the active coverage, plus a one-line
  // reason that ties the grade to the underlying geometry. Used by
  // the matchup badge in the football UI so students see whether
  // their call is favorable BEFORE they run the play.
  function getMatchup(play, coverage) {
    if (!play || !coverage) return null;
    var beats = play.beats || [];
    var struggles = play.struggles || [];
    if (beats.indexOf(coverage.id) !== -1) {
      return {
        grade: 'great', emoji: '✅', color: '#16a34a', bg: 'rgba(22,163,74,0.12)',
        label: 'Great match',
        reason: play.label + ' is built to attack ' + coverage.label + '. Geometry favors you.'
      };
    }
    if (struggles.indexOf(coverage.id) !== -1) {
      return {
        grade: 'tough', emoji: '⚠️', color: '#dc2626', bg: 'rgba(220,38,38,0.12)',
        label: 'Tough match',
        reason: coverage.label + ' is specifically designed to stop concepts like ' + play.label + '. Pick a different play, or move players to create new windows.'
      };
    }
    return {
      grade: 'okay', emoji: '👍', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',
      label: 'Workable',
      reason: 'Neither great nor terrible. Execution + adjustments will decide it. Try the Coach Mode for specifics.'
    };
  }

  // Suggest alternative plays that BEAT the active coverage. Returns up
  // to 3 play references (sorted by stable original PLAYS order). Used
  // by the matchup badge to give the student a concrete next step when
  // their current call is a tough match.
  function suggestPlaysForCoverage(coverage) {
    if (!coverage) return [];
    return PLAYS.filter(function(p) {
      return (p.beats || []).indexOf(coverage.id) !== -1;
    }).slice(0, 3);
  }

  function suggestConceptsForShape(shape) {
    if (!shape) return [];
    return SOCCER_CONCEPTS.filter(function(c) {
      return (c.beats || []).indexOf(shape.id) !== -1;
    }).slice(0, 3);
  }

  // Soccer matchup — concept vs defensive shape. Set-pieces (corner /
  // free kick / throw-in / penalty) are mostly shape-neutral because
  // dead-ball restarts override normal team shape; we tag those with
  // a separate "set-piece" flavor that doesn't grade them. Goal-kicks
  // DO interact with shape (long ball vs press is the classic).
  function getSoccerMatchup(concept, shape) {
    if (!concept || !shape) return null;
    // Penalty kicks ignore the defending shape (1v1 by rule)
    if (concept.id === 'penalty') {
      return {
        grade: 'okay', emoji: '🎯', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)',
        label: 'Spot kick',
        reason: 'Penalty: 1v1 striker vs keeper. Defensive shape doesn\'t apply — only striker placement vs keeper guess matters.'
      };
    }
    // Corner / free kick / throw-in — neutral matchup; the shape teach
    // describes general defensive principles but doesn\'t grade the call.
    if (concept.setPiece && !(concept.beats || concept.struggles)) {
      return {
        grade: 'okay', emoji: '⚐', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)',
        label: 'Set-piece',
        reason: 'Set-pieces interrupt normal shape — defenders organize around the dead ball, not their usual press/block. Execution + run patterns decide it.'
      };
    }
    var beats = concept.beats || [];
    var struggles = concept.struggles || [];
    if (beats.indexOf(shape.id) !== -1) {
      return {
        grade: 'great', emoji: '✅', color: '#16a34a', bg: 'rgba(22,163,74,0.12)',
        label: 'Great match',
        reason: concept.label + ' specifically exploits ' + shape.label + '. Geometry favors you.'
      };
    }
    if (struggles.indexOf(shape.id) !== -1) {
      return {
        grade: 'tough', emoji: '⚠️', color: '#dc2626', bg: 'rgba(220,38,38,0.12)',
        label: 'Tough match',
        reason: shape.label + ' is built to neutralize ' + concept.label + '. Switch concepts or move players to create new passing lanes.'
      };
    }
    return {
      grade: 'okay', emoji: '👍', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',
      label: 'Workable',
      reason: 'Concept and shape are roughly neutral. Execution + adjustments will decide it.'
    };
  }

  function applyPlayToFormation(formation, play) {
    if (!play || !play.routes) return formation;
    return formation.map(function(p) {
      var routeDeltas = play.routes[p.id];
      if (!routeDeltas) return p;
      var route = [{ x: p.x, y: p.y }]; // starts at snap position
      var cur = { x: p.x, y: p.y };
      routeDeltas.forEach(function(d) {
        cur = { x: cur.x + d.dx, y: cur.y + d.dy };
        route.push(cur);
      });
      return Object.assign({}, p, { route: route });
    });
  }

  // Receiver's "final" location — last waypoint of the route, or the snap
  // position if no route.
  function receiverEndPoint(p) {
    if (!p.route || p.route.length === 0) return { x: p.x, y: p.y };
    return p.route[p.route.length - 1];
  }

  // Point-in-polygon (ray-casting). poly is an array of [x, y] pairs.
  function pointInPoly(x, y, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1];
      var xj = poly[j][0], yj = poly[j][1];
      var intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // Find the receiver(s) MOST OPEN against the active coverage.
  // Heuristic for MVP:
  //   • Each zone has a single defender at its CENTROID.
  //   • For each eligible receiver's end point, find the nearest defender
  //     centroid; "openness" = distance in yards.
  //   • The receiver with the highest openness is the "open receiver."
  // This is rough but pedagogically clear: students see "the slot is most
  // open against Cover 2 because the deep safeties are far apart."
  function polyCentroid(poly) {
    var sx = 0, sy = 0;
    poly.forEach(function(pt) { sx += pt[0]; sy += pt[1]; });
    return { x: sx / poly.length, y: sy / poly.length };
  }
  function openReceiverAnalysis(players, defenders) {
    var receivers = players.filter(function(p) {
      return (p.role === 'WR' || p.role === 'TE' || p.role === 'RB') && p.route;
    });
    // Use actual defender positions (DL excluded — they don't drop into
    // coverage). This makes the analysis correct for Cover 1 (man) where
    // defenders sit directly on receivers, not at zone centroids.
    var coverageDefenders = (defenders || []).filter(function(dx) { return dx.role !== 'DL'; });
    var analysis = receivers.map(function(p) {
      var ep = receiverEndPoint(p);
      var nearestDist = Infinity;
      var nearestId = null;
      var nearestRole = null;
      coverageDefenders.forEach(function(c) {
        var dx = c.x - ep.x;
        var dy = c.y - ep.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearestDist) { nearestDist = d; nearestId = c.id; nearestRole = c.role; }
      });
      return { id: p.id, role: p.role, ep: ep, opennessYd: nearestDist,
               nearestZone: nearestId ? (nearestRole + ' ' + nearestId) : 'open field' };
    });
    // Sort: most open first
    analysis.sort(function(a, b) { return b.opennessYd - a.opennessYd; });
    return analysis;
  }

  // ═══════════════════════════════════════════
  // TOOL REGISTRATION
  // ═══════════════════════════════════════════
  window.StemLab.registerTool('playlab', {
    icon: '🏈',
    label: 'PlayLab',
    desc: 'Football play-design: route geometry, coverage zones, open-receiver analysis',
    color: 'lime',
    category: 'science',
    questHooks: [
      { id: 'pl_load_3_plays',
        label: 'Study 3 different plays',
        icon: '📋',
        check: function(d) { return (d.playsViewed && Object.keys(d.playsViewed).length >= 3); },
        progress: function(d) { return ((d.playsViewed && Object.keys(d.playsViewed).length) || 0) + ' / 3 plays'; } },
      { id: 'pl_try_each_coverage',
        label: 'See every coverage',
        icon: '🛡️',
        check: function(d) { return (d.coveragesViewed && Object.keys(d.coveragesViewed).length >= COVERAGES.length); },
        progress: function(d) { return ((d.coveragesViewed && Object.keys(d.coveragesViewed).length) || 0) + ' / ' + COVERAGES.length + ' coverages'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var addToast = ctx.addToast;
      var callGemini = ctx.callGemini;
      var awardXP = ctx.awardXP;

      // State init
      if (!labToolData || !labToolData.playlab) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { playlab: {
            // Sport mode — toggle between American football + soccer.
            // Each sport has its own field, formations/plays, defensive
            // shapes, and visual scale (yards vs meters). State for both
            // sports lives in the same object since switching modes is
            // expected to be common (a coach explores both).
            sport: 'football',
            // Soccer state
            formationId: '433',
            conceptId: 'tikitaka',
            shapeId: 'midblock',
            showXG: false,             // expected-goals heatmap overlay (soccer only)
            // Saved plays — student-designed plays (drag-edited or
            // formation/concept tweaks) named and stored. Each entry
            // captures sport + base preset + custom positions so loading
            // restores the exact view. Lives in d so the harness's
            // localStorage persists it across sessions automatically.
            savedPlays: [],
            savePromptOpen: false,
            savePromptName: '',
            // Football state
            playId: 'slant',
            coverageId: 'cover2',
            // Down + distance — fed into the EPA calculation. Defaults to
            // 1st-and-10 from the offense's own 25-yard line (75 yd to goal,
            // 1.4 EP) which is the textbook starting point.
            down: 1,
            yardsToGoal: 75,
            losX: LOS_DEFAULT,
            showZones: true,
            showRoutes: true,
            showOpen: true,
            playsViewed: { slant: true },
            coveragesViewed: { cover2: true },
            // Custom-play overrides — when the student drags players,
            // their new (x, y) positions land here keyed by player id.
            // null entry = follow the play's preset position. Cleared
            // when a different play preset is loaded.
            customPositions: {},
            // Coach Mode — Gemini-powered analysis of the active play
            // against the active coverage. Same shape as ThrowLab's coach.
            coachLoading: false,
            coachReply: '',
            coachError: '',
            // Animated simulation — driven by an rAF loop in a separate
            // useEffect. runT is seconds-since-snap; ROUTE_DURATION = 2.5s
            // running phase, then THROW_DURATION = 0.8s ball flight.
            runActive: false,
            runT: 0,
            runOutcome: null,           // { receiverId, location: 'caught' | 'broken-up' | 'incomplete', etc. }
            // Drills — coordinator challenge sequence. Stats accumulate
            // from animated "Run Play" outcomes so the student has to
            // actually execute, not just stare at the field.
            drillActive: false,
            drillTaskIdx: 0,
            drillStats: {
              // Football
              coveragesBeaten: 0,
              coveragesBeatenSet: {},
              completionsByPlay: {},
              smashVsCover2: false,
              c0WithHot: false,
              c6WithTrips: false,
              robberWithMesh: false,
              completedCustomPlay: false,
              // Soccer
              highXgShot: false,
              conceptsRun: {},
              shapesPlayed: {},
              customHighXg: false,
              setPieceRun: false,
              setPieceTypesRun: {}
            }
          }});
        });
        return h('div', { className: 'p-8 text-center text-slate-600' }, 'Loading PlayLab…');
      }
      var d = labToolData.playlab;
      var upd = function(key, val) {
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.playlab); next[key] = val;
          return Object.assign({}, prev, { playlab: next });
        });
      };

      var isSoccer = d.sport === 'soccer';
      // Soccer-derived vars (only meaningful when isSoccer === true). They
      // shadow into the same `formation` / `defenders` slots so downstream
      // code (canvas, etc.) reads from one source of truth.
      var formationDef = SOCCER_FORMATIONS.find(function(f) { return f.id === d.formationId; }) || SOCCER_FORMATIONS[0];
      var concept = SOCCER_CONCEPTS.find(function(c) { return c.id === d.conceptId; }) || SOCCER_CONCEPTS[0];
      var soccerShape = SOCCER_SHAPES.find(function(s) { return s.id === d.shapeId; }) || SOCCER_SHAPES[0];
      var play = PLAYS.find(function(p) { return p.id === d.playId; }) || PLAYS[0];
      var coverage = COVERAGES.find(function(c) { return c.id === d.coverageId; }) || COVERAGES[0];
      // Build the base formation, apply any custom drag overrides FIRST,
      // then run the play's routes against the (possibly moved) snap
      // positions — so a dragged WR's route still starts from where they
      // are now.
      var rawFormation = defaultFormation(d.losX).map(function(p) {
        var override = (d.customPositions || {})[p.id];
        if (override) return Object.assign({}, p, { x: override.x, y: override.y });
        return p;
      });
      var formation = isSoccer ? formationDef.build() : applyPlayToFormation(rawFormation, play);
      var zones = isSoccer ? [] : buildZones(d.coverageId, d.losX);
      var defenders = isSoccer ? buildSoccerDefenders(d.shapeId)
                               : buildDefenders(d.coverageId, d.losX, formation);
      var analysis = isSoccer ? [] : openReceiverAnalysis(formation, defenders);
      var openReceiverId = analysis.length ? analysis[0].id : null;

      function applyPlayLabScenario(scenarioId) {
        var s = PLAYLAB_SCENARIOS.find(function(sc) { return sc.id === scenarioId; });
        if (!s) return;
        setLabToolData(function(prev) {
          var nextPlaylab = Object.assign({}, prev.playlab, {
            sport: s.sport,
            customPositions: {},
            runActive: false,
            runT: 0,
            runOutcome: null,
            coachReply: '', coachError: '',
            activeScenarioId: scenarioId
          });
          if (s.sport === 'soccer') {
            nextPlaylab.formationId = s.formationId;
            nextPlaylab.conceptId = s.conceptId;
            nextPlaylab.shapeId = s.shapeId;
          } else {
            nextPlaylab.playId = s.playId;
            nextPlaylab.coverageId = s.coverageId;
            if (s.losX != null) nextPlaylab.losX = s.losX;
          }
          return Object.assign({}, prev, { playlab: nextPlaylab });
        });
        plAnnounce('Scenario loaded: ' + s.label + '. ' + s.teach);
      }

      function loadPlay(pid) {
        var seen = Object.assign({}, d.playsViewed || {}); seen[pid] = true;
        // Loading a new preset wipes any custom drag positions — students
        // get a clean slate for the new play. Their previous edits are
        // gone unless they save first (future feature).
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
            playId: pid, playsViewed: seen, customPositions: {}
          })});
        });
        var p = PLAYS.find(function(P) { return P.id === pid; });
        plAnnounce('Loaded play: ' + (p ? p.label : pid) + '. ' + (p ? p.teach : ''));
      }
      function resetPositions() {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
            customPositions: {}
          })});
        });
        plAnnounce('Player positions reset to preset.');
      }

      // ── Saved plays ──
      // Capture the current sport + preset + custom positions as a named
      // entry. Loading restores the entire view; deleting removes from
      // the list. Capped at 24 entries (FIFO eviction) so the toolData
      // blob doesn't grow unbounded across sessions.
      function openSavePrompt() {
        // Suggest a default name from the active preset + custom-edit count
        var basePresetLabel = isSoccer
          ? formationDef.label + ' · ' + concept.label
          : play.label;
        var customCount = Object.keys(d.customPositions || {}).length;
        var defaultName = basePresetLabel + (customCount ? ' (' + customCount + ' edit' + (customCount === 1 ? '' : 's') + ')' : '');
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
            savePromptOpen: true, savePromptName: defaultName
          })});
        });
      }
      function cancelSavePrompt() {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
            savePromptOpen: false, savePromptName: ''
          })});
        });
      }
      function commitSavePlay() {
        var name = (d.savePromptName || '').trim();
        if (!name) {
          plAnnounce('Please give the play a name.');
          return;
        }
        var entry = {
          id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          name: name,
          sport: d.sport,
          createdAt: Date.now(),
          customPositions: Object.assign({}, d.customPositions || {})
        };
        if (isSoccer) {
          entry.formationId = d.formationId;
          entry.conceptId = d.conceptId;
          entry.shapeId = d.shapeId;
        } else {
          entry.playId = d.playId;
          entry.coverageId = d.coverageId;
        }
        var saved = (d.savedPlays || []).concat([entry]);
        // FIFO eviction at 24 entries
        if (saved.length > 24) saved = saved.slice(saved.length - 24);
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
            savedPlays: saved, savePromptOpen: false, savePromptName: ''
          })});
        });
        plAnnounce('Saved play: ' + name + '.');
        if (addToast) addToast('💾 Saved: ' + name);
        if (awardXP) awardXP('playlab', 4, 'Saved play');
      }
      function loadSavedPlay(entry) {
        if (!entry) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.playlab, {
            sport: entry.sport,
            customPositions: Object.assign({}, entry.customPositions || {}),
            // Clear in-flight animation + ephemeral state on load
            runActive: false, runT: 0, runOutcome: null, coachReply: '', coachError: ''
          });
          if (entry.sport === 'soccer') {
            if (entry.formationId) next.formationId = entry.formationId;
            if (entry.conceptId) next.conceptId = entry.conceptId;
            if (entry.shapeId) next.shapeId = entry.shapeId;
          } else {
            if (entry.playId) next.playId = entry.playId;
            if (entry.coverageId) next.coverageId = entry.coverageId;
          }
          return Object.assign({}, prev, { playlab: next });
        });
        plAnnounce('Loaded saved play: ' + entry.name + '.');
      }
      function deleteSavedPlay(id) {
        setLabToolData(function(prev) {
          var saved = (prev.playlab.savedPlays || []).filter(function(e) { return e.id !== id; });
          return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, { savedPlays: saved })});
        });
        plAnnounce('Deleted saved play.');
      }

      // ── Coach Mode (Gemini) ──
      // Sends the active play, the active coverage, the open-receiver
      // analysis, and any custom-position edits to Gemini for tactical
      // feedback. Coaches a specific adjustment for THIS play vs THIS
      // defense, not generic advice.
      function askCoach() {
        if (typeof callGemini !== 'function') {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
              coachError: 'Coach is offline (AI not available in this build).'
            })});
          });
          plAnnounce('Coach is offline.');
          return;
        }
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
            coachLoading: true, coachReply: '', coachError: ''
          })});
        });
        // Compact representation of the formation so the prompt is small.
        // Round to whole units (yd or m) to keep numbers human-readable.
        var prompt;
        // Pull the live matchup grade + suggestions so the AI's coaching
        // is anchored in the same diagnosis the student already sees on
        // the matchup badge — coach acknowledges the grade, then explains
        // WHY in geometric terms instead of contradicting the badge.
        var liveMatchup = isSoccer
          ? getSoccerMatchup(concept, soccerShape)
          : (play && coverage ? getMatchup(play, coverage) : null);
        var liveSuggestions = (liveMatchup && liveMatchup.grade === 'tough')
          ? (isSoccer ? suggestConceptsForShape(soccerShape) : suggestPlaysForCoverage(coverage))
          : [];
        var matchupDigest = liveMatchup
          ? 'Matchup grade for this call: ' + liveMatchup.label + ' — ' + liveMatchup.reason
            + (liveSuggestions.length ? ' Suggested alternatives: ' + liveSuggestions.map(function(s) { return s.label; }).join(', ') + '.' : '')
            + ' '
          : '';
        if (isSoccer) {
          // Soccer-flavored prompt: formation + concept + defensive shape +
          // optional xG context. No route end-points (soccer plays don't
          // have routes); we describe player positions instead.
          var posDigest = formation.map(function(p) {
            return p.id + '(' + p.role + ') @ (' + p.x.toFixed(0) + ',' + p.y.toFixed(0) + ')';
          }).join(', ');
          var passDigest = (concept.passes || []).map(function(pair) {
            return pair[0] + '→' + pair[1];
          }).join(', ');
          // Sample xG at the striker's position (or wherever the most
          // advanced attacker is) — gives the coach a "what's our best
          // shot location?" anchor.
          var lead = formation.reduce(function(best, p) {
            return (p.role === 'FWD' && (!best || p.x > best.x)) ? p : best;
          }, null) || formation[0];
          var leadXG = lead ? computeXG(lead.x, lead.y).toFixed(2) : '0.00';
          prompt = 'You are a soccer (football) tactical coach analyzing a student\'s setup. '
            + 'Formation: "' + formationDef.label + '". ' + formationDef.teach + ' '
            + 'Concept: "' + concept.label + '". ' + concept.teach + ' '
            + 'Defending team is in: ' + soccerShape.label + '. ' + soccerShape.teach + ' '
            + matchupDigest
            + 'Pitch is 105×68 m, attacking right. '
            + 'Attacker positions: ' + posDigest + '. '
            + 'Concept passing pattern: ' + (passDigest || '(none)') + '. '
            + 'Most advanced attacker (' + (lead ? lead.id : 'none') + ') has xG ≈ ' + leadXG + ' from current position. '
            + 'Give 3-4 sentences of warm, specific coaching: (1) ACKNOWLEDGE the matchup grade (don\'t contradict it — if it\'s tough, agree it\'s tough and explain WHY geometrically), (2) name the player or zone with the best opportunity and WHY in geometric terms, (3) suggest ONE concrete adjustment (move a player N meters, swap a passing lane, OR pick one of the suggested alternative concepts above), (4) tie the suggestion to the math the student can see (xG, passing-triangle geometry, line of confrontation). '
            + 'Plain prose, no markdown, no bullets, no headings.';
        } else {
          // Football-flavored prompt (original)
          var formationDigest = formation.filter(function(p) {
            return p.role === 'WR' || p.role === 'TE' || p.role === 'RB' || p.role === 'QB';
          }).map(function(p) {
            var endX = p.route ? p.route[p.route.length - 1].x : p.x;
            var endY = p.route ? p.route[p.route.length - 1].y : p.y;
            return p.id + ' starts (' + p.x.toFixed(0) + ',' + p.y.toFixed(0) + ')'
              + (p.route && p.route.length > 1 ? ' → route ends (' + endX.toFixed(0) + ',' + endY.toFixed(0) + ')' : ' [no route]');
          }).join('; ');
          var topOpen = analysis.slice(0, 3).map(function(r) {
            return r.id + ' (' + r.opennessYd.toFixed(1) + ' yd from nearest defender, near ' + r.nearestZone + ')';
          }).join(', ');
          var customEdits = Object.keys(d.customPositions || {}).length;
          prompt = 'You are a football coach analyzing a student\'s play call. '
            + 'Active play: "' + play.label + '". Concept: ' + play.teach + ' '
            + 'Active defense: ' + coverage.label + '. Note: ' + coverage.teach + ' '
            + matchupDigest
            + 'Field is 100×53.33 yards. LOS at x=' + d.losX + '. '
            + 'Eligible receivers + their routes: ' + formationDigest + '. '
            + 'Open-receiver analysis (top 3): ' + topOpen + '. '
            + (Object.keys(d.customPositions || {}).length ? 'Student has made ' + Object.keys(d.customPositions).length + ' custom position edits to the preset. ' : '')
            + 'Give 3-4 sentences of warm, specific coaching: (1) ACKNOWLEDGE the matchup grade (don\'t contradict it — if it\'s tough, agree it\'s tough and explain WHY geometrically), (2) name the most-open receiver and explain WHY they\'re open in geometric terms (not just "no defender nearby"), (3) suggest ONE concrete adjustment (move a player N yards, change a route depth, OR pick one of the suggested alternative plays above), (4) tie the suggestion to the math the student can see on the field. '
            + 'Plain prose, no markdown, no bullets, no headings.';
        }
        callGemini(prompt, false, false, 0.7).then(function(resp) {
          var reply = String(resp || '').trim();
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
              coachLoading: false, coachReply: reply, coachError: ''
            })});
          });
          plAnnounce('Coach: ' + reply);
          if (awardXP) awardXP('playlab', 5, 'Asked the coach');
        }).catch(function() {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
              coachLoading: false, coachError: 'Could not reach the coach. Try again in a moment.'
            })});
          });
        });
      }
      function loadCoverage(cid) {
        var seen = Object.assign({}, d.coveragesViewed || {}); seen[cid] = true;
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
            coverageId: cid, coveragesViewed: seen
          })});
        });
        var cv = COVERAGES.find(function(c) { return c.id === cid; });
        plAnnounce('Defense changed to: ' + (cv ? cv.label : cid) + '. ' + (cv ? cv.teach : ''));
      }

      // ── Play simulation engine ──
      // ROUTE_DURATION: time the receivers spend running their routes.
      //   At ~9 yd/s a 22-yd vertical takes ~2.4s, so 2.5s covers most plays.
      // THROW_DURATION: time the ball spends in the air (deep throws are
      //   longer in real life, but we're collapsing to a constant for the
      //   MVP — Tier 4 can swap in ThrowLab's simulatePitch for accuracy).
      // OUTCOME_HOLD: how long we keep the result on screen before idling.
      var ROUTE_DURATION = 2.5;
      var THROW_DURATION = 0.8;
      var OUTCOME_HOLD = 1.2;
      var TOTAL_DURATION = ROUTE_DURATION + THROW_DURATION + OUTCOME_HOLD;
      // Soccer animation: each pass = 0.55s of travel; +0.7s outcome hold
      // at the end to show the final xG. Total = passes·0.55 + 0.7.
      var SOCCER_PASS_DURATION = 0.55;
      var SOCCER_OUTCOME_HOLD = 0.7;
      var soccerPassesCount = (concept && concept.passes && concept.passes.length) || 1;
      var SOCCER_TOTAL = soccerPassesCount * SOCCER_PASS_DURATION + SOCCER_OUTCOME_HOLD;

      // Walk a player along their route waypoints at uniform speed.
      // Returns { x, y } at time fraction t in [0, 1] across the entire route.
      function lerpRoute(route, t) {
        if (!route || route.length === 0) return null;
        if (route.length === 1) return route[0];
        // Compute cumulative distances
        var segs = [];
        var total = 0;
        for (var i = 1; i < route.length; i++) {
          var dx = route[i].x - route[i - 1].x;
          var dy = route[i].y - route[i - 1].y;
          var d = Math.sqrt(dx * dx + dy * dy);
          segs.push(d);
          total += d;
        }
        if (total === 0) return route[0];
        var target = t * total;
        var acc = 0;
        for (var j = 0; j < segs.length; j++) {
          if (acc + segs[j] >= target) {
            var f = segs[j] === 0 ? 0 : (target - acc) / segs[j];
            return {
              x: route[j].x + (route[j + 1].x - route[j].x) * f,
              y: route[j].y + (route[j + 1].y - route[j].y) * f
            };
          }
          acc += segs[j];
        }
        return route[route.length - 1];
      }

      // Position of a player at time t (seconds). Receivers walk their
      // routes during the route phase; QB stays put for now.
      function positionAtTime(p, t) {
        if (!p.route || p.route.length < 2) return { x: p.x, y: p.y };
        var f = Math.min(1, Math.max(0, t / ROUTE_DURATION));
        return lerpRoute(p.route, f);
      }

      // Pick the throw target as the most-open receiver from the static
      // analysis we already compute every render. This matches what the
      // student sees in the analysis panel.
      function pickThrowTarget() {
        if (!analysis || analysis.length === 0) return null;
        // Filter out non-receivers (should already be done in analysis)
        return analysis[0].id;
      }

      function startRun() {
        if (d.runActive) return;
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
            runActive: true, runT: 0, runOutcome: null
          })});
        });
        if (isSoccer) {
          plAnnounce('Running sequence. ' + concept.label + ' from ' + formationDef.label + '.');
        } else {
          plAnnounce('Running play. ' + play.label + ' against ' + coverage.label + '.');
        }
      }

      // rAF loop — runs only while d.runActive is true. WCAG 2.3.3:
      // honor prefers-reduced-motion by snapping straight to the outcome
      // instead of animating.
      React.useEffect(function() {
        if (!d.runActive) return;
        var prefersReduced = false;
        try { prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

        // ── Soccer branch ──
        // Animate the ball along the concept's passing sequence. End at the
        // final receiver's xG → "Sequence complete: shot from xG 0.32".
        if (isSoccer) {
          var passes = (concept.passes || []);
          var finalReceiver = passes.length > 0 ? formation.find(function(p) { return p.id === passes[passes.length - 1][1]; }) : null;
          var finalXG = finalReceiver ? computeXG(finalReceiver.x, finalReceiver.y) : 0;
          var soccerOutcome = { sport: 'soccer', xG: finalXG, finalReceiverId: finalReceiver ? finalReceiver.id : null };
          if (prefersReduced) {
            setLabToolData(function(prev) {
              return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
                runActive: false, runT: SOCCER_TOTAL, runOutcome: soccerOutcome
              })});
            });
            plAnnounce('Sequence complete. Final position xG ' + finalXG.toFixed(2) + '.');
            return;
          }
          var sStart = performance.now();
          var sRaf;
          function sStep() {
            var sElapsed = (performance.now() - sStart) / 1000;
            if (sElapsed >= SOCCER_TOTAL) {
              // Drill stat updates — track concept + shape coverage and
              // whether the sequence ended in a high-xG position. Custom
              // formation success counts when the student moved ≥2 players
              // AND landed in xG > 0.20.
              var sStats = Object.assign({
                highXgShot: false, conceptsRun: {}, shapesPlayed: {}, customHighXg: false,
                setPieceRun: false, setPieceTypesRun: {}
              }, d.drillStats || {});
              sStats.conceptsRun = Object.assign({}, sStats.conceptsRun);
              sStats.conceptsRun[d.conceptId] = true;
              sStats.shapesPlayed = Object.assign({}, sStats.shapesPlayed);
              sStats.shapesPlayed[d.shapeId] = true;
              if (finalXG > 0.30) sStats.highXgShot = true;
              if (finalXG > 0.20 && Object.keys(d.customPositions || {}).length >= 2) sStats.customHighXg = true;
              // Set-piece tracking — derived from the active concept's
              // setPiece flag + an ID-prefix mapping to a set-piece TYPE
              // (corner / freekick / throwin / penalty / goalkick). Players
              // unlock the "all 4 types" task by mixing across the categories.
              var activeConcept = SOCCER_CONCEPTS.find(function(c) { return c.id === d.conceptId; });
              if (activeConcept && activeConcept.setPiece) {
                sStats.setPieceRun = true;
                var spType = activeConcept.id.indexOf('corner') === 0 ? 'corner'
                           : activeConcept.id.indexOf('freekick') === 0 ? 'freekick'
                           : activeConcept.id.indexOf('throwin') === 0 ? 'throwin'
                           : activeConcept.id.indexOf('penalty') === 0 ? 'penalty'
                           : activeConcept.id.indexOf('goalkick') === 0 ? 'goalkick'
                           : 'other';
                sStats.setPieceTypesRun = Object.assign({}, sStats.setPieceTypesRun);
                sStats.setPieceTypesRun[spType] = true;
              }
              // Active-drill task progression (soccer drill set)
              var sNewTaskIdx = d.drillTaskIdx || 0;
              var sTaskJustCompleted = null;
              if (d.drillActive && sNewTaskIdx < PLAYLAB_SOCCER_DRILLS.tasks.length) {
                var sTask = PLAYLAB_SOCCER_DRILLS.tasks[sNewTaskIdx];
                if (sTask && sTask.test(sStats)) {
                  sTaskJustCompleted = sTask;
                  sNewTaskIdx = sNewTaskIdx + 1;
                }
              }
              setLabToolData(function(prev) {
                return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
                  runActive: false, runT: SOCCER_TOTAL, runOutcome: soccerOutcome,
                  drillStats: sStats, drillTaskIdx: sNewTaskIdx
                })});
              });
              var qualLabel = finalXG > 0.30 ? 'high-quality chance' : finalXG > 0.10 ? 'decent shot' : 'low-percentage shot';
              plAnnounce('Sequence complete. ' + (finalReceiver ? finalReceiver.id : 'Final attacker') + ' arrives at xG ' + finalXG.toFixed(2) + ' — a ' + qualLabel + '.');
              if (finalXG > 0.20 && awardXP) awardXP('playlab', 8, 'High-xG sequence');
              if (sTaskJustCompleted) {
                var sAllDone = sNewTaskIdx >= PLAYLAB_SOCCER_DRILLS.tasks.length;
                setTimeout(function() {
                  if (sAllDone) {
                    plAnnounce('Tactical Drills complete! All ' + PLAYLAB_SOCCER_DRILLS.tasks.length + ' tasks finished.');
                    if (addToast) addToast('🏆 Tactical Drills complete!');
                    if (awardXP) awardXP('playlab', 25, 'Drill complete');
                  } else {
                    plAnnounce('Task done. Next goal: ' + PLAYLAB_SOCCER_DRILLS.tasks[sNewTaskIdx].goal);
                    if (addToast) addToast('✅ Drill task ' + sNewTaskIdx + ' complete');
                    if (awardXP) awardXP('playlab', 12, 'Drill task');
                  }
                }, 800);
              }
              return;
            }
            setLabToolData(function(prev) {
              return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
                runT: sElapsed
              })});
            });
            sRaf = requestAnimationFrame(sStep);
          }
          sRaf = requestAnimationFrame(sStep);
          return function() { if (sRaf) cancelAnimationFrame(sRaf); };
        }

        // ── Football branch (original) ──
        if (prefersReduced) {
          var targetId = pickThrowTarget();
          var outcome = targetId ? { receiverId: targetId, location: 'caught' } : { location: 'incomplete' };
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
              runActive: false, runT: TOTAL_DURATION, runOutcome: outcome
            })});
          });
          plAnnounce(targetId ? 'Pass complete to ' + targetId + '.' : 'Incomplete pass.');
          return;
        }
        var start = performance.now();
        var raf;
        function step() {
          var elapsed = (performance.now() - start) / 1000;
          if (elapsed >= TOTAL_DURATION) {
            // Resolve outcome at end of throw phase
            var targetId = pickThrowTarget();
            var topOpenness = analysis && analysis[0] ? analysis[0].opennessYd : 0;
            // Simple coverage-aware completion model: > 6 yd open = caught,
            // 3-6 = contested (50/50 random), < 3 = broken up. Real NFL
            // catch rates against tight coverage are ~30%, and against
            // wide-open ~85%, which lines up roughly.
            var loc;
            if (topOpenness >= 6) loc = 'caught';
            else if (topOpenness >= 3) loc = (Math.random() > 0.5) ? 'caught' : 'brokenup';
            else loc = 'brokenup';
            var outcome = { receiverId: targetId, location: loc, opennessYd: topOpenness };
            // ── Drill stat updates — only on a completion ──
            // We capture the play / coverage / custom-edit count at the
            // moment the play resolves (closure over render-time vars).
            var newStats = Object.assign({
              coveragesBeaten: 0, coveragesBeatenSet: {},
              completionsByPlay: {}, smashVsCover2: false,
              c0WithHot: false, c6WithTrips: false, robberWithMesh: false,
              completedCustomPlay: false
            }, d.drillStats || {});
            if (loc === 'caught') {
              if (!newStats.coveragesBeatenSet[d.coverageId]) {
                newStats.coveragesBeatenSet = Object.assign({}, newStats.coveragesBeatenSet);
                newStats.coveragesBeatenSet[d.coverageId] = true;
                newStats.coveragesBeaten = Object.keys(newStats.coveragesBeatenSet).length;
              }
              newStats.completionsByPlay = Object.assign({}, newStats.completionsByPlay);
              newStats.completionsByPlay[d.playId] = true;
              if (d.playId === 'smash' && d.coverageId === 'cover2') newStats.smashVsCover2 = true;
              // New drill flags for the expanded coverage library
              if (d.coverageId === 'cover0' && (d.playId === 'slant' || d.playId === 'bubble' || d.playId === 'stick')) newStats.c0WithHot = true;
              if (d.coverageId === 'cover6' && d.playId === 'trips') newStats.c6WithTrips = true;
              if (d.coverageId === 'robber' && d.playId === 'mesh') newStats.robberWithMesh = true;
              if (Object.keys(d.customPositions || {}).length >= 2) newStats.completedCustomPlay = true;
            }
            // Active-drill task progression
            var newDrillTaskIdx = d.drillTaskIdx || 0;
            var taskJustCompleted = null;
            if (d.drillActive && newDrillTaskIdx < PLAYLAB_DRILLS.tasks.length) {
              var task = PLAYLAB_DRILLS.tasks[newDrillTaskIdx];
              if (task && task.test(newStats)) {
                taskJustCompleted = task;
                newDrillTaskIdx = newDrillTaskIdx + 1;
              }
            }
            setLabToolData(function(prev) {
              return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
                runActive: false, runT: TOTAL_DURATION, runOutcome: outcome,
                drillStats: newStats, drillTaskIdx: newDrillTaskIdx
              })});
            });
            plAnnounce(loc === 'caught'
              ? 'Pass complete to ' + targetId + '!'
              : loc === 'brokenup' ? 'Pass broken up by the defense at ' + targetId + '.'
              : 'Incomplete pass.');
            if (loc === 'caught' && awardXP) awardXP('playlab', 8, 'Completion');
            if (taskJustCompleted) {
              var allDone = newDrillTaskIdx >= PLAYLAB_DRILLS.tasks.length;
              setTimeout(function() {
                if (allDone) {
                  plAnnounce('Drill complete! All ' + PLAYLAB_DRILLS.tasks.length + ' coordinator tasks finished.');
                  if (addToast) addToast('🏆 Coordinator Drills complete!');
                  if (awardXP) awardXP('playlab', 25, 'Drill complete');
                } else {
                  plAnnounce('Task done. Next goal: ' + PLAYLAB_DRILLS.tasks[newDrillTaskIdx].goal);
                  if (addToast) addToast('✅ Drill task ' + (newDrillTaskIdx) + ' complete');
                  if (awardXP) awardXP('playlab', 12, 'Drill task');
                }
              }, 800);
            }
            return;
          }
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
              runT: elapsed
            })});
          });
          raf = requestAnimationFrame(step);
        }
        raf = requestAnimationFrame(step);
        return function() { if (raf) cancelAnimationFrame(raf); };
      }, [d.runActive]);

      // ── Drag-to-place player editing ──
      // dragRef tracks the in-flight drag (playerId + last canvas coords).
      // mousedown picks the closest player within a generous radius;
      // mousemove updates customPositions (snapped to whole-yard grid);
      // mouseup ends the drag. Live region announces the start + end so
      // SR users know what changed and can read the new yard line.
      var dragRef = React.useRef({ playerId: null });
      function canvasYardCoords(evt) {
        var canvas = canvasRef.current; if (!canvas) return null;
        var rect = canvas.getBoundingClientRect();
        // Match the marginL/marginR/marginT/marginB used by the renderer
        var marginL = 30, marginR = 30, marginT = 18, marginB = 32;
        // Canvas may be CSS-resized vs its native 720x360 — scale by the
        // actual displayed size, not the buffer size.
        var nx = (evt.clientX - rect.left) * (canvas.width / rect.width);
        var ny = (evt.clientY - rect.top) * (canvas.height / rect.height);
        var fieldPxW = canvas.width - marginL - marginR;
        var fieldPxH = canvas.height - marginT - marginB;
        var yardX = (nx - marginL) / fieldPxW * FIELD_LENGTH;
        var yardY = (ny - marginT) / fieldPxH * FIELD_WIDTH;
        return { yardX: yardX, yardY: yardY };
      }
      function nearestPlayer(yardX, yardY, players) {
        var best = null, bestD = Infinity;
        players.forEach(function(p) {
          var dx = p.x - yardX, dy = p.y - yardY;
          var dist = Math.sqrt(dx * dx + dy * dy);
          // Within 4 yards = a generous click target since players render as 6px circles
          if (dist < 4 && dist < bestD) { bestD = dist; best = p; }
        });
        return best;
      }
      function handleMouseDown(evt) {
        var c = canvasYardCoords(evt); if (!c) return;
        var p = nearestPlayer(c.yardX, c.yardY, formation);
        if (!p) return;
        dragRef.current = { playerId: p.id };
        plAnnounce('Dragging ' + p.id + '. Move to reposition.');
      }
      function handleMouseMove(evt) {
        if (!dragRef.current || !dragRef.current.playerId) return;
        var c = canvasYardCoords(evt); if (!c) return;
        // Snap to whole-yard grid + clamp to inside the field of play
        var snappedX = Math.max(0.5, Math.min(FIELD_LENGTH - 0.5, Math.round(c.yardX)));
        var snappedY = Math.max(0.5, Math.min(FIELD_WIDTH - 0.5, Math.round(c.yardY)));
        var pid = dragRef.current.playerId;
        setLabToolData(function(prev) {
          var existing = Object.assign({}, prev.playlab.customPositions || {});
          existing[pid] = { x: snappedX, y: snappedY };
          return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
            customPositions: existing
          })});
        });
      }
      function handleMouseUp() {
        var pid = dragRef.current && dragRef.current.playerId;
        if (pid) {
          plAnnounce('Released ' + pid + '. Position saved.');
        }
        dragRef.current = { playerId: null };
      }

      // ── Field canvas ──
      var canvasRef = React.useRef(null);
      React.useEffect(function() {
        var canvas = canvasRef.current; if (!canvas) return;
        var gfx = canvas.getContext('2d');
        var W = canvas.width, H = canvas.height;
        gfx.clearRect(0, 0, W, H);
        // Field is rendered HORIZONTALLY: x (yards) maps to canvas x (px),
        // y (yards across the field) maps to canvas y. End zone left, defense right.
        var marginL = 30, marginR = 30, marginT = 18, marginB = 32;
        var fieldPxW = W - marginL - marginR;
        var fieldPxH = H - marginT - marginB;
        // Sport-aware coordinate mappers — football (yards, 120×53.33) or
        // soccer (meters, 105×68). Both use the same canvas margins.
        var fLen = isSoccer ? PITCH_LENGTH : FIELD_LENGTH;
        var fWid = isSoccer ? PITCH_WIDTH : FIELD_WIDTH;
        function fx(worldX) { return marginL + (worldX / fLen) * fieldPxW; }
        function fy(worldY) { return marginT + (worldY / fWid) * fieldPxH; }

        if (isSoccer) {
          // ── Soccer pitch render (FIFA spec) ──
          // Bright pitch green + crisp white markings, centered halfway line,
          // center circle, two penalty boxes, two goal areas, penalty spots,
          // penalty arcs, corner arcs, goal markers.
          gfx.fillStyle = '#1e5d2e';   // pitch green
          gfx.fillRect(0, 0, W, H);
          gfx.fillStyle = '#2a7a3a';
          gfx.fillRect(fx(0), fy(0), fx(PITCH_LENGTH) - fx(0), fy(PITCH_WIDTH) - fy(0));
          // Mowing stripes (low contrast bands every 7m)
          gfx.fillStyle = 'rgba(0,0,0,0.07)';
          for (var ms = 0; ms < PITCH_LENGTH; ms += 14) {
            gfx.fillRect(fx(ms), fy(0), fx(ms + 7) - fx(ms), fy(PITCH_WIDTH) - fy(0));
          }
          gfx.strokeStyle = '#fafafa';
          gfx.lineWidth = 2;
          // Pitch outline + halfway line
          gfx.strokeRect(fx(0), fy(0), fx(PITCH_LENGTH) - fx(0), fy(PITCH_WIDTH) - fy(0));
          gfx.beginPath();
          gfx.moveTo(fx(PITCH_LENGTH / 2), fy(0));
          gfx.lineTo(fx(PITCH_LENGTH / 2), fy(PITCH_WIDTH));
          gfx.stroke();
          // Center circle + center spot
          var ccCx = fx(PITCH_LENGTH / 2), ccCy = fy(PITCH_WIDTH / 2);
          var ccPxR = (CENTER_CIRCLE_R / fLen) * fieldPxW;
          gfx.beginPath();
          gfx.arc(ccCx, ccCy, ccPxR, 0, Math.PI * 2);
          gfx.stroke();
          gfx.fillStyle = '#fafafa';
          gfx.beginPath(); gfx.arc(ccCx, ccCy, 2, 0, Math.PI * 2); gfx.fill();
          // Penalty + goal areas (each end)
          [0, PITCH_LENGTH].forEach(function(goalLineX) {
            var dirSign = goalLineX === 0 ? 1 : -1;
            // Penalty area
            var paLeft = goalLineX;
            var paRight = goalLineX + dirSign * PENALTY_AREA_DEPTH;
            var paTop = (PITCH_WIDTH - PENALTY_AREA_WIDTH) / 2;
            var paBot = paTop + PENALTY_AREA_WIDTH;
            gfx.strokeRect(
              Math.min(fx(paLeft), fx(paRight)),
              fy(paTop),
              Math.abs(fx(paRight) - fx(paLeft)),
              fy(paBot) - fy(paTop)
            );
            // Goal area
            var gaRight = goalLineX + dirSign * GOAL_AREA_DEPTH;
            var gaTop = (PITCH_WIDTH - GOAL_AREA_WIDTH) / 2;
            var gaBot = gaTop + GOAL_AREA_WIDTH;
            gfx.strokeRect(
              Math.min(fx(goalLineX), fx(gaRight)),
              fy(gaTop),
              Math.abs(fx(gaRight) - fx(goalLineX)),
              fy(gaBot) - fy(gaTop)
            );
            // Penalty spot
            var psX = goalLineX + dirSign * PENALTY_SPOT_X;
            gfx.fillStyle = '#fafafa';
            gfx.beginPath(); gfx.arc(fx(psX), fy(PITCH_WIDTH / 2), 2, 0, Math.PI * 2); gfx.fill();
            // Penalty arc — only the portion outside the penalty area
            var arcRpx = (PENALTY_ARC_R / fLen) * fieldPxW;
            gfx.beginPath();
            // Sweep facing AWAY from the goal line
            var startAng = goalLineX === 0 ? -Math.PI / 3 : Math.PI - Math.PI / 3;
            var endAng = goalLineX === 0 ? Math.PI / 3 : Math.PI + Math.PI / 3;
            gfx.arc(fx(psX), fy(PITCH_WIDTH / 2), arcRpx, startAng, endAng);
            gfx.stroke();
            // Goal markers (the 7.32 m wide goal mouth — small black bars
            // outside the goal line so the goal direction reads clearly)
            var gmTop = (PITCH_WIDTH - SOCCER_GOAL_WIDTH) / 2;
            var gmBot = gmTop + SOCCER_GOAL_WIDTH;
            gfx.fillStyle = '#fafafa';
            gfx.fillRect(fx(goalLineX) - dirSign * 4, fy(gmTop), 4, fy(gmBot) - fy(gmTop));
          });
          // Corner arcs
          [[0, 0], [PITCH_LENGTH, 0], [0, PITCH_WIDTH], [PITCH_LENGTH, PITCH_WIDTH]].forEach(function(c) {
            var sx = c[0] === 0 ? 0 : Math.PI;
            var ex = sx + Math.PI / 2 * (c[1] === 0 ? 1 : -1);
            gfx.beginPath();
            gfx.arc(fx(c[0]), fy(c[1]), 6, sx, ex);
            gfx.stroke();
          });
          // ── xG (expected goals) heatmap ──
          // Sample a 1m grid inside the attacking third + the area in front
          // of the goal, compute xG per cell, draw colored squares with
          // alpha proportional to xG. Higher = more red. Centered on the
          // attacking goal (x=105). Skipped when toggle is off.
          if (d.showXG) {
            var xgStartX = PITCH_LENGTH - 35;  // attacking third + a bit
            var xgStep = 1.5;                   // m
            for (var gx = xgStartX; gx < PITCH_LENGTH - 0.5; gx += xgStep) {
              for (var gy = 5; gy < PITCH_WIDTH - 5; gy += xgStep) {
                var xg = computeXG(gx, gy);
                if (xg < 0.01) continue; // skip near-zero cells for performance
                var alpha = Math.min(0.62, xg * 1.4);
                // Color ramp: dark blue (low) → green → yellow → red (high)
                var red, green, blue;
                if (xg < 0.10) { red = 30; green = 80; blue = 200; }
                else if (xg < 0.25) { red = 60; green = 180; blue = 60; }
                else if (xg < 0.50) { red = 230; green = 200; blue = 30; }
                else { red = 230; green = 50; blue = 30; }
                gfx.fillStyle = 'rgba(' + red + ',' + green + ',' + blue + ',' + alpha + ')';
                var cellX = fx(gx);
                var cellY = fy(gy);
                var cellW = fx(gx + xgStep) - cellX + 0.5;
                var cellH = fy(gy + xgStep) - cellY + 0.5;
                gfx.fillRect(cellX, cellY, cellW, cellH);
              }
            }
            // Legend strip in the bottom-right corner of the canvas
            gfx.fillStyle = 'rgba(15,23,42,0.75)';
            gfx.fillRect(W - 110, H - 36, 100, 24);
            gfx.fillStyle = '#fafafa';
            gfx.font = 'bold 9px system-ui';
            gfx.textAlign = 'left';
            gfx.fillText('xG: ', W - 105, H - 22);
            ['rgba(30,80,200,0.8)', 'rgba(60,180,60,0.8)', 'rgba(230,200,30,0.8)', 'rgba(230,50,30,0.8)'].forEach(function(c, i) {
              gfx.fillStyle = c;
              gfx.fillRect(W - 80 + i * 16, H - 28, 14, 12);
            });
            gfx.fillStyle = '#cbd5e1';
            gfx.font = '8px system-ui';
            gfx.fillText('low ← → high', W - 80, H - 14);
          }
          // Skip the football-specific scene entirely
        } else {
        // Field background
        gfx.fillStyle = '#1e3a26';
        gfx.fillRect(0, 0, W, H);
        // Field of play (between end zones)
        gfx.fillStyle = '#2a5a3a';
        gfx.fillRect(fx(END_ZONE_DEPTH), marginT, fx(FIELD_LENGTH - END_ZONE_DEPTH) - fx(END_ZONE_DEPTH), fieldPxH);
        // End zones — slightly darker
        gfx.fillStyle = '#1a3a1a';
        gfx.fillRect(fx(0), marginT, fx(END_ZONE_DEPTH) - fx(0), fieldPxH);
        gfx.fillRect(fx(FIELD_LENGTH - END_ZONE_DEPTH), marginT, fx(FIELD_LENGTH) - fx(FIELD_LENGTH - END_ZONE_DEPTH), fieldPxH);
        // Yard lines every 5 yards, with 10-yard lines bolder + numbered
        gfx.strokeStyle = 'rgba(255,255,255,0.35)';
        gfx.lineWidth = 1;
        for (var yd = 10; yd <= 110; yd += 5) {
          var px = fx(yd);
          gfx.lineWidth = (yd % 10 === 0) ? 1.5 : 0.7;
          gfx.beginPath(); gfx.moveTo(px, marginT); gfx.lineTo(px, marginT + fieldPxH); gfx.stroke();
        }
        // Yard numbers every 10 yards (NFL: 10, 20, 30, 40, 50, 40, 30, 20, 10)
        gfx.fillStyle = 'rgba(255,255,255,0.55)';
        gfx.font = 'bold 11px system-ui';
        gfx.textAlign = 'center';
        var yardLabels = [10, 20, 30, 40, 50, 40, 30, 20, 10];
        for (var i = 0; i < yardLabels.length; i++) {
          var lblX = fx(20 + i * 10);
          gfx.fillText(String(yardLabels[i]), lblX, marginT + 12);
          gfx.fillText(String(yardLabels[i]), lblX, marginT + fieldPxH - 4);
        }
        // Hash marks — small ticks at every yard line on the two hashes
        gfx.strokeStyle = 'rgba(255,255,255,0.25)';
        gfx.lineWidth = 1;
        for (var hd = 11; hd < 110; hd++) {
          var hpx = fx(hd);
          gfx.beginPath(); gfx.moveTo(hpx, fy(HASH_LEFT)); gfx.lineTo(hpx, fy(HASH_LEFT) + 3); gfx.stroke();
          gfx.beginPath(); gfx.moveTo(hpx, fy(HASH_RIGHT)); gfx.lineTo(hpx, fy(HASH_RIGHT) - 3); gfx.stroke();
        }
        // Line of scrimmage — bold blue line at d.losX
        var losPx = fx(d.losX);
        gfx.strokeStyle = '#60a5fa';
        gfx.lineWidth = 2;
        gfx.beginPath(); gfx.moveTo(losPx, marginT); gfx.lineTo(losPx, marginT + fieldPxH); gfx.stroke();
        gfx.fillStyle = '#60a5fa';
        gfx.font = 'bold 10px system-ui';
        gfx.fillText('LOS', losPx, marginT + fieldPxH + 14);

        // ── Coverage zones ──
        if (d.showZones) {
          zones.forEach(function(z) {
            gfx.fillStyle = z.color;
            gfx.beginPath();
            z.poly.forEach(function(pt, idx) {
              var px = fx(pt[0]), py = fy(pt[1]);
              if (idx === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py);
            });
            gfx.closePath();
            gfx.fill();
            gfx.strokeStyle = z.color.replace(/[\d.]+\)$/, '0.55)');
            gfx.lineWidth = 1;
            gfx.stroke();
            // Zone label at centroid
            var c = polyCentroid(z.poly);
            gfx.fillStyle = 'rgba(255,255,255,0.9)';
            gfx.font = 'bold 9px system-ui';
            gfx.fillText(z.label, fx(c.x), fy(c.y));
          });
        }

        // ── Routes ──
        if (d.showRoutes) {
          formation.forEach(function(p) {
            if (!p.route || p.route.length < 2) return;
            gfx.strokeStyle = '#fbbf24';
            gfx.lineWidth = 2;
            gfx.beginPath();
            p.route.forEach(function(pt, idx) {
              var px = fx(pt.x), py = fy(pt.y);
              if (idx === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py);
            });
            gfx.stroke();
            // Arrowhead at end
            if (p.route.length >= 2) {
              var a = p.route[p.route.length - 2];
              var b = p.route[p.route.length - 1];
              var ang = Math.atan2(fy(b.y) - fy(a.y), fx(b.x) - fx(a.x));
              gfx.fillStyle = '#fbbf24';
              gfx.beginPath();
              gfx.moveTo(fx(b.x), fy(b.y));
              gfx.lineTo(fx(b.x) - 8 * Math.cos(ang - 0.4), fy(b.y) - 8 * Math.sin(ang - 0.4));
              gfx.lineTo(fx(b.x) - 8 * Math.cos(ang + 0.4), fy(b.y) - 8 * Math.sin(ang + 0.4));
              gfx.closePath();
              gfx.fill();
            }
          });
        }
        } // end !isSoccer (football scene)

        // ── Soccer passing-network arrows (concept overlay) ──
        // Draw arrows between player IDs from the active concept's `passes`.
        // Skipped for football modes since the route lines already serve
        // as movement cues there.
        if (isSoccer && concept && concept.passes && d.showRoutes !== false) {
          gfx.strokeStyle = '#fbbf24';
          gfx.lineWidth = 2;
          gfx.fillStyle = '#fbbf24';
          concept.passes.forEach(function(pair) {
            var from = formation.find(function(p) { return p.id === pair[0]; });
            var to = formation.find(function(p) { return p.id === pair[1]; });
            if (!from || !to) return;
            var ax = fx(from.x), ay = fy(from.y);
            var bx = fx(to.x), by = fy(to.y);
            gfx.beginPath();
            gfx.moveTo(ax, ay); gfx.lineTo(bx, by);
            gfx.stroke();
            // Arrowhead
            var ang = Math.atan2(by - ay, bx - ax);
            gfx.beginPath();
            gfx.moveTo(bx, by);
            gfx.lineTo(bx - 7 * Math.cos(ang - 0.4), by - 7 * Math.sin(ang - 0.4));
            gfx.lineTo(bx - 7 * Math.cos(ang + 0.4), by - 7 * Math.sin(ang + 0.4));
            gfx.closePath();
            gfx.fill();
          });
        }

        // ── Defenders ──
        // 11 red dots: 4 DL just past LOS, 3 LBs underneath, 4 DBs in
        // their assigned spots (man for Cover 1, zone-centroid for the
        // others). Drawn BEFORE offensive players so the offense reads
        // on top. Dot color is red across the board; the role label
        // ('DL' / 'LB' / 'CB' / 'S' / 'NB') reads inside.
        defenders.forEach(function(D) {
          var dpx = fx(D.x), dpy = fy(D.y);
          gfx.fillStyle = '#ef4444';
          gfx.beginPath(); gfx.arc(dpx, dpy, 5.5, 0, Math.PI * 2); gfx.fill();
          gfx.strokeStyle = '#0f172a';
          gfx.lineWidth = 1;
          gfx.stroke();
          gfx.fillStyle = '#fafafa';
          gfx.font = 'bold 7px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText(D.role, dpx, dpy + 2.5);
        });

        // ── Players ──
        // During an active run, players walk along their routes; otherwise
        // they sit at snap (or end-of-route) positions. We use d.runT as
        // the elapsed time. After the route phase ends, players hold at
        // their end-of-route positions while the ball is in flight.
        var runT = d.runT || 0;
        var isAnimating = !!d.runActive || (d.runT > 0 && d.runT < TOTAL_DURATION);
        formation.forEach(function(p) {
          var pos;
          if (isAnimating && p.route && p.route.length >= 2) {
            // During route phase, lerp; after, hold at end of route.
            pos = positionAtTime(p, Math.min(runT, ROUTE_DURATION));
          } else {
            pos = { x: p.x, y: p.y };
          }
          var px = fx(pos.x), py = fy(pos.y);
          var isOpen = d.showOpen && p.id === openReceiverId && !isAnimating;
          var fill = p.role === 'QB' ? '#fbbf24'
                   : p.role === 'OL' ? '#94a3b8'
                   : p.role === 'WR' || p.role === 'TE' ? '#fafafa'
                   : p.role === 'RB' ? '#f97316'
                   : '#cbd5e1';
          if (isOpen) {
            gfx.fillStyle = 'rgba(16,185,129,0.35)';
            gfx.beginPath(); gfx.arc(px, py, 12, 0, Math.PI * 2); gfx.fill();
          }
          gfx.fillStyle = fill;
          gfx.beginPath(); gfx.arc(px, py, 6, 0, Math.PI * 2); gfx.fill();
          gfx.strokeStyle = '#0f172a';
          gfx.lineWidth = 1;
          gfx.stroke();
          gfx.fillStyle = '#0f172a';
          gfx.font = 'bold 8px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText(p.id, px, py + 3);
        });

        // ── Soccer ball traveling along the passing sequence ──
        // During an active run, the ball walks each pass over
        // SOCCER_PASS_DURATION seconds. The current segment + linear
        // progress within the segment come from runT.
        if (isSoccer && d.runActive && concept && concept.passes && concept.passes.length) {
          var passes = concept.passes;
          var sIdx = Math.min(passes.length - 1, Math.floor(runT / SOCCER_PASS_DURATION));
          var sFrac = (runT - sIdx * SOCCER_PASS_DURATION) / SOCCER_PASS_DURATION;
          var pair = passes[sIdx];
          var fromP = formation.find(function(p) { return p.id === pair[0]; });
          var toP = formation.find(function(p) { return p.id === pair[1]; });
          if (fromP && toP) {
            var bx = fromP.x + (toP.x - fromP.x) * sFrac;
            var by = fromP.y + (toP.y - fromP.y) * sFrac;
            var bpx = fx(bx);
            var bpy = fy(by);
            // Soccer ball — white circle with black hex outline
            gfx.fillStyle = '#fafafa';
            gfx.beginPath(); gfx.arc(bpx, bpy, 5, 0, Math.PI * 2); gfx.fill();
            gfx.strokeStyle = '#1a1a1a';
            gfx.lineWidth = 1;
            gfx.stroke();
            // Highlight the active pass segment
            gfx.strokeStyle = 'rgba(251,191,36,0.85)';
            gfx.lineWidth = 3;
            gfx.beginPath();
            gfx.moveTo(fx(fromP.x), fy(fromP.y));
            gfx.lineTo(fx(toP.x), fy(toP.y));
            gfx.stroke();
          }
        }

        // ── Football in flight ──
        // After the route phase, the ball travels from the QB to the
        // designated target receiver over THROW_DURATION. We use a simple
        // parabolic arc — peak at midpoint, equal to ~3 yards above ground
        // visually (rendered as a vertical Y offset on the canvas, since
        // the field view is top-down 2D).
        if (runT > ROUTE_DURATION && runT <= ROUTE_DURATION + THROW_DURATION) {
          var throwT = (runT - ROUTE_DURATION) / THROW_DURATION;
          var qb = formation.find(function(p) { return p.id === 'QB'; });
          var targetId = pickThrowTarget();
          var target = formation.find(function(p) { return p.id === targetId; });
          if (qb && target) {
            // Receiver is at end-of-route during throw phase
            var rx = target.route ? target.route[target.route.length - 1].x : target.x;
            var ry = target.route ? target.route[target.route.length - 1].y : target.y;
            var ballX = qb.x + (rx - qb.x) * throwT;
            var ballY = qb.y + (ry - qb.y) * throwT;
            // Arc lift: small parabolic visual offset so the ball appears
            // to rise then fall. Convert to canvas px directly.
            var liftPx = Math.sin(throwT * Math.PI) * 14;
            var bpx = fx(ballX);
            var bpy = fy(ballY) - liftPx;
            // Draw the football — small brown ellipse
            gfx.fillStyle = '#7c2d12';
            gfx.beginPath();
            gfx.ellipse(bpx, bpy, 5, 3, 0, 0, Math.PI * 2);
            gfx.fill();
            gfx.strokeStyle = '#fafafa';
            gfx.lineWidth = 1;
            gfx.beginPath(); gfx.moveTo(bpx - 3, bpy); gfx.lineTo(bpx + 3, bpy); gfx.stroke();
          }
        }

        // ── Outcome callout ──
        // After the ball arrives, hold the result on screen for OUTCOME_HOLD
        // seconds. Renders a banner over the field with the verdict.
        // Soccer + football share the banner format; the texts differ.
        var soccerBannerVisible = isSoccer && d.runOutcome && d.runOutcome.sport === 'soccer'
          && (!d.runActive) && runT >= soccerPassesCount * SOCCER_PASS_DURATION;
        var footballBannerVisible = !isSoccer && d.runOutcome && runT > ROUTE_DURATION + THROW_DURATION;
        if (soccerBannerVisible) {
          var sro = d.runOutcome;
          var sxg = sro.xG || 0;
          var sBannerColor = sxg > 0.30 ? 'rgba(16,185,129,0.85)'
                           : sxg > 0.10 ? 'rgba(251,191,36,0.85)'
                           : 'rgba(239,68,68,0.85)';
          var sBannerText = '⚽ ' + (sro.finalReceiverId || 'Final attacker') + ' arrives · xG ' + sxg.toFixed(2);
          gfx.fillStyle = sBannerColor;
          gfx.fillRect(W / 2 - 150, marginT + fieldPxH / 2 - 18, 300, 36);
          gfx.fillStyle = '#0f172a';
          gfx.font = 'bold 14px system-ui';
          gfx.textAlign = 'center';
          gfx.textBaseline = 'middle';
          gfx.fillText(sBannerText, W / 2, marginT + fieldPxH / 2);
          gfx.textBaseline = 'alphabetic';
          gfx.font = '11px system-ui';
          var sQual = sxg > 0.30 ? 'high-quality chance' : sxg > 0.10 ? 'decent shot' : 'low-percentage shot';
          gfx.fillText('(' + sQual + ' — toggle xG heatmap to see why)', W / 2, marginT + fieldPxH / 2 + 28);
        }
        if (footballBannerVisible) {
          var ro = d.runOutcome;
          var bannerColor = ro.location === 'caught' ? 'rgba(16,185,129,0.85)'
                          : ro.location === 'brokenup' ? 'rgba(251,191,36,0.85)'
                          : 'rgba(239,68,68,0.85)';
          var bannerText = ro.location === 'caught' ? '✅ COMPLETE to ' + ro.receiverId
                        : ro.location === 'brokenup' ? '✋ Pass broken up at ' + ro.receiverId
                        : '❌ Incomplete';
          gfx.fillStyle = bannerColor;
          gfx.fillRect(W / 2 - 130, marginT + fieldPxH / 2 - 18, 260, 36);
          gfx.fillStyle = '#0f172a';
          gfx.font = 'bold 14px system-ui';
          gfx.textAlign = 'center';
          gfx.textBaseline = 'middle';
          gfx.fillText(bannerText, W / 2, marginT + fieldPxH / 2);
          gfx.textBaseline = 'alphabetic';
          if (ro.opennessYd !== undefined) {
            gfx.font = '11px system-ui';
            gfx.fillText('(receiver was ' + ro.opennessYd.toFixed(1) + ' yd from nearest defender)', W / 2, marginT + fieldPxH / 2 + 28);
          }
          // EPA line — translates the outcome into expected-points-added.
          // Computed fresh from the active down + yardsToGoal + receiver
          // route end-point, so the same throw against a different
          // down/distance shows different math.
          var rcvId = ro.receiverId;
          var rcv = formation.find(function(p) { return p.id === rcvId; });
          var rcvEP = rcv ? receiverEndPoint(rcv) : null;
          var epaResult = computeEPA(d.yardsToGoal || 75, d.down || 1, ro, rcvEP ? rcvEP.x : null);
          var dEPA = epaResult.dEPA || 0;
          var epaSign = dEPA >= 0 ? '+' : '';
          gfx.font = 'bold 11px system-ui';
          gfx.fillStyle = dEPA >= 0 ? '#10b981' : '#ef4444';
          gfx.fillText('EPA: ' + epaSign + dEPA.toFixed(2) + '  (pre ' + epaResult.preEP.toFixed(1) + ' → post ' + epaResult.postEP.toFixed(1) + ')',
                       W / 2, marginT + fieldPxH / 2 + 44);
        }
      }, [d.playId, d.coverageId, d.losX, d.showZones, d.showRoutes, d.showOpen,
          d.customPositions, d.runActive, d.runT, d.runOutcome,
          d.sport, d.formationId, d.conceptId, d.shapeId, d.showXG,
          d.down, d.yardsToGoal]);

      // ── UI ──
      function pillBtn(label, sel, onClick, opts) {
        opts = opts || {};
        return h('button', {
          onClick: onClick, 'aria-pressed': sel, 'data-pl-focusable': 'true',
          style: {
            padding: opts.small ? '6px 10px' : '8px 14px', borderRadius: 999, cursor: 'pointer',
            border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
            background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
            color: '#f1f5f9', fontSize: opts.small ? 11 : 13, fontWeight: 600
          }
        }, label);
      }

      return h('div', { style: { padding: 16, color: '#f1f5f9', maxWidth: 1100, margin: '0 auto' } },
        // Header
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          ArrowLeft && h('button', {
            onClick: function() { setStemLabTool && setStemLabTool(null); },
            'data-pl-focusable': 'true', 'aria-label': 'Back to STEM Lab',
            style: { background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }
          }, '← Back'),
          h('h2', { style: { margin: 0, fontSize: 20 } },
            (isSoccer ? '⚽ PlayLab — Soccer Tactics' : '🏈 PlayLab — Football Play & Coverage')),
          h('span', { style: { fontSize: 12, color: '#cbd5e1' } }, 'Every play is a coordinated math problem on a fixed grid.')
        ),

        // Sport picker — football vs soccer. role=tablist so AT treats it
        // as a single-select group. Switching sports preserves separate
        // state for each (football presets stay set even when you flip
        // to soccer and back).
        h('div', { role: 'tablist', 'aria-label': 'Sport',
          style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' } },
          [
            { id: 'football', label: '🏈 American Football' },
            { id: 'soccer', label: '⚽ Soccer' }
          ].map(function(sp) {
            var sel = (d.sport || 'football') === sp.id;
            return h('button', {
              key: 'sport-' + sp.id,
              role: 'tab',
              onClick: function() {
                upd('sport', sp.id);
                plAnnounce('Switched to ' + sp.label.replace(/^\S+\s/, '') + ' mode.');
              },
              'aria-selected': sel,
              'data-pl-focusable': 'true',
              style: {
                padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                color: '#f1f5f9', fontSize: 13, fontWeight: 600
              }
            }, sp.label);
          })
        ),

        // ── Scenarios ──
        // One-click teaching demos. Each pill snaps sport + play/concept +
        // coverage/shape (and optionally LOS for football) into a
        // configured tactical setup. Useful as a warm-up for class
        // discussion. Filtered to the active sport so students don't see
        // 5 football scenarios when they're in soccer mode.
        h('details', {
          style: { marginBottom: 10, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '8px 12px' }
        },
          h('summary', {
            style: { cursor: 'pointer', fontSize: 12, color: '#cbd5e1', fontWeight: 600 }
          }, '🎬 Scenarios — one-click teaching demos (' + PLAYLAB_SCENARIOS.filter(function(sc) { return sc.sport === (d.sport || 'football'); }).length + ' for ' + (isSoccer ? 'soccer' : 'football') + ')'),
          h('div', {
            role: 'group', 'aria-label': 'Tactical scenarios',
            style: { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }
          },
            PLAYLAB_SCENARIOS.filter(function(sc) {
              return sc.sport === (d.sport || 'football');
            }).map(function(sc) {
              return h('button', {
                key: 'plsc-' + sc.id,
                onClick: function() { applyPlayLabScenario(sc.id); },
                'aria-label': sc.label + ' scenario: ' + sc.teach,
                'data-pl-focusable': 'true',
                title: sc.teach,
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#f1f5f9', fontSize: 11, fontWeight: 600
                }
              }, sc.icon + ' ' + sc.label);
            })
          )
        ),

        // ── Active Scenario Briefing ──
        // When a scenario was just loaded, surface its teach blurb +
        // discussion questions in a dedicated panel above the main
        // controls. Persists until the user dismisses it OR loads a
        // different scenario / play. Useful for teachers in front of
        // a class — gives them ready-made discussion prompts.
        (function() {
          var active = d.activeScenarioId
            ? PLAYLAB_SCENARIOS.find(function(sc) { return sc.id === d.activeScenarioId; })
            : null;
          if (!active) return null;
          return h('section', {
            'aria-label': 'Scenario briefing',
            style: {
              padding: 12, borderRadius: 10, marginBottom: 12,
              background: 'rgba(167,139,250,0.10)',
              border: '1px solid rgba(167,139,250,0.45)',
              color: '#f1f5f9', fontSize: 13, lineHeight: 1.5
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 } },
              h('span', { style: { fontSize: 18 }, 'aria-hidden': 'true' }, active.icon),
              h('div', { style: { flex: 1 } },
                h('div', { style: { fontWeight: 700, color: '#a78bfa', fontSize: 13, marginBottom: 2 } },
                  '🎬 Scenario: ' + active.label),
                h('div', null, active.teach)
              ),
              h('button', {
                onClick: function() { upd('activeScenarioId', null); },
                'aria-label': 'Dismiss scenario briefing',
                'data-pl-focusable': 'true',
                style: {
                  padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid #475569', background: 'transparent',
                  color: '#cbd5e1', fontSize: 11
                }
              }, '✕ Dismiss')
            ),
            (active.questions && active.questions.length) ? h('div', {
              style: { marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(167,139,250,0.30)' }
            },
              h('div', { style: { fontSize: 11, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
                '💭 Discussion'),
              h('ol', { style: { margin: '4px 0 0 18px', padding: 0, color: '#cbd5e1', fontSize: 12, lineHeight: 1.5 } },
                active.questions.map(function(q, i) {
                  return h('li', { key: 'q-' + i, style: { marginBottom: 4 } }, q);
                })
              )
            ) : null
          );
        })(),

        // Play / Formation picker
        h('div', { role: 'group', 'aria-label': isSoccer ? 'Formation library' : 'Play library',
          style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap', fontSize: 12 } },
          h('span', { style: { color: '#cbd5e1' } }, isSoccer ? 'Formation:' : 'Play:'),
          (isSoccer ? SOCCER_FORMATIONS : PLAYS).map(function(p) {
            var sel = isSoccer ? d.formationId === p.id : d.playId === p.id;
            return pillBtn(p.icon + ' ' + p.label, sel, function() {
              if (isSoccer) {
                upd('formationId', p.id);
                plAnnounce('Loaded formation: ' + p.label + '. ' + p.teach);
              } else {
                loadPlay(p.id);
              }
            });
          })
        ),

        // Concept picker — soccer only
        isSoccer ? h('div', { role: 'group', 'aria-label': 'Tactical concept',
          style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap', fontSize: 12 } },
          h('span', { style: { color: '#cbd5e1' } }, 'Concept:'),
          SOCCER_CONCEPTS.map(function(c) {
            return pillBtn(c.icon + ' ' + c.label, d.conceptId === c.id, function() {
              upd('conceptId', c.id);
              plAnnounce('Concept: ' + c.label + '. ' + c.teach);
            });
          })
        ) : null,

        // Down + Distance picker — football only. Drives the EPA math
        // shown in the post-play banner. 1st-and-10 from own 25 (75 yd
        // to goal) is the default; students can tweak to see how the
        // value of the same play changes by situation.
        !isSoccer ? h('div', { role: 'group', 'aria-label': 'Down and field position',
          style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap', fontSize: 12 } },
          h('span', { style: { color: '#cbd5e1' } }, 'Situation:'),
          h('label', { htmlFor: 'pl-down', style: { color: '#cbd5e1' } }, 'Down:'),
          h('select', {
            id: 'pl-down', value: String(d.down || 1),
            onChange: function(e) { upd('down', parseInt(e.target.value, 10) || 1); },
            'data-pl-focusable': 'true',
            style: { padding: '4px 6px', borderRadius: 4, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 12 }
          },
            [1, 2, 3, 4].map(function(n) { return h('option', { key: n, value: String(n) }, n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th')); })
          ),
          h('label', { htmlFor: 'pl-ytg', style: { color: '#cbd5e1' } }, 'Yards to goal:'),
          h('input', {
            id: 'pl-ytg', type: 'number', min: 1, max: 99,
            value: d.yardsToGoal || 75,
            onChange: function(e) { upd('yardsToGoal', Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 75))); },
            'data-pl-focusable': 'true',
            style: { width: 60, padding: '4px 6px', borderRadius: 4, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 12 }
          }),
          h('span', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } },
            'EP at this state: ', h('span', { style: { color: '#fbbf24', fontWeight: 700 } },
              expectedPoints(d.yardsToGoal || 75, d.down || 1).toFixed(1)))
        ) : null,

        // Coverage / Defensive shape picker
        h('div', { role: 'group', 'aria-label': isSoccer ? 'Defensive shape' : 'Defensive coverage',
          style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap', fontSize: 12 } },
          h('span', { style: { color: '#cbd5e1' } }, 'Defense:'),
          (isSoccer ? SOCCER_SHAPES : COVERAGES).map(function(c) {
            var sel = isSoccer ? d.shapeId === c.id : d.coverageId === c.id;
            return pillBtn(c.label, sel, function() {
              if (isSoccer) {
                upd('shapeId', c.id);
                plAnnounce('Defensive shape: ' + c.label + '. ' + c.teach);
              } else {
                loadCoverage(c.id);
              }
            });
          })
        ),

        // ── Matchup badge ──
        // Football: reads the play's `beats` / `struggles` arrays vs the
        // active coverage. Soccer: reads the concept's same arrays vs the
        // active defensive shape (or a set-piece-flavored neutral grade
        // for corners / FKs / throw-ins / penalties where shape doesn\'t
        // apply). Three tiers in both: ✅ great / 👍 workable / ⚠️ tough.
        // When the grade is "tough", surfaces up to 3 suggested
        // alternative plays/concepts as click-to-swap pills.
        (function() {
          var matchup = isSoccer
            ? getSoccerMatchup(concept, soccerShape)
            : (play && coverage ? getMatchup(play, coverage) : null);
          if (!matchup) return null;
          var suggestions = (matchup.grade === 'tough')
            ? (isSoccer ? suggestConceptsForShape(soccerShape) : suggestPlaysForCoverage(coverage))
            : [];
          return h('div', {
            role: 'status',
            'aria-live': 'polite',
            style: {
              padding: '8px 14px', borderRadius: 8, marginBottom: 12,
              border: '1px solid ' + matchup.color, background: matchup.bg,
              fontSize: 13, lineHeight: 1.4, color: '#f1f5f9'
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('span', { style: { fontSize: 18 }, 'aria-hidden': 'true' }, matchup.emoji),
              h('div', null,
                h('span', { style: { color: matchup.color, fontWeight: 700, marginRight: 6 } }, matchup.label + ':'),
                h('span', null, matchup.reason)
              )
            ),
            // Suggested-counter pills (only when matchup is tough)
            suggestions.length > 0 ? h('div', {
              style: { marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(241,245,249,0.18)',
                       display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }
            },
              h('span', { style: { fontSize: 12, color: '#cbd5e1', marginRight: 4 } }, '💡 Try instead:'),
              suggestions.map(function(s) {
                return h('button', {
                  key: 'sug-' + s.id,
                  onClick: function() {
                    if (isSoccer) {
                      upd('conceptId', s.id);
                      plAnnounce('Concept switched to ' + s.label + '. ' + s.teach);
                    } else {
                      loadPlay(s.id);
                    }
                  },
                  'aria-label': 'Try ' + s.label + ' instead',
                  style: {
                    padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                    border: '1px solid ' + matchup.color, background: 'rgba(15,23,42,0.55)',
                    color: '#f1f5f9', fontSize: 12, fontWeight: 600
                  }
                }, (s.icon || '') + ' ' + s.label);
              })
            ) : null
          );
        })(),

        // ── Drills panel ──
        // Toggle + active goal display, mirrors ThrowLab. Tasks advance only
        // when the student RUNS a play (not just toggles between settings),
        // so the drill rewards genuine play execution.
        (function() {
          // Pick the right drill set per active sport — football and soccer
          // each have their own 4-task progression. drillTaskIdx is shared
          // (it's a single counter; switching sport mid-drill doesn't
          // currently reset it, which is intentional — the student can
          // pause a drill, explore, then return).
          var DRILL_SET = isSoccer ? PLAYLAB_SOCCER_DRILLS : PLAYLAB_DRILLS;
          var taskIdx = d.drillTaskIdx || 0;
          var allDone = taskIdx >= DRILL_SET.tasks.length;
          var task = DRILL_SET.tasks[Math.min(taskIdx, DRILL_SET.tasks.length - 1)];
          var stats = d.drillStats || {};
          if (!d.drillActive) {
            return h('div', { style: { marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
              h('button', {
                onClick: function() {
                  setLabToolData(function(prev) {
                    return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
                      drillActive: true, drillTaskIdx: 0,
                      drillStats: {
                        coveragesBeaten: 0, coveragesBeatenSet: {},
                        completionsByPlay: {}, smashVsCover2: false, completedCustomPlay: false,
                        highXgShot: false, conceptsRun: {}, shapesPlayed: {}, customHighXg: false,
                        setPieceRun: false, setPieceTypesRun: {}
                      }
                    })});
                  });
                  plAnnounce('Drill started: ' + DRILL_SET.tasks[0].goal);
                },
                'data-pl-focusable': 'true',
                style: {
                  padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                  border: '1px solid #10b981', background: 'rgba(16,185,129,0.18)',
                  color: '#f1f5f9', fontSize: 12, fontWeight: 600
                }
              }, '🎯 Start ' + DRILL_SET.label),
              h('span', { style: { fontSize: 11, color: '#94a3b8' } },
                DRILL_SET.tasks.length + ' tasks · sandbox stays open while a drill runs'));
          }
          return h('section', {
            'aria-labelledby': 'pl-drill-heading',
            style: { marginBottom: 14, padding: 12,
              background: allDone ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.06)',
              border: '1px solid #10b981', borderRadius: 10 }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6, flexWrap: 'wrap' } },
              h('h3', { id: 'pl-drill-heading', style: { margin: 0, fontSize: 12, color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 } },
                allDone ? '🏆 Drill complete · ' + DRILL_SET.label : '🎯 ' + DRILL_SET.label + ' · Task ' + (taskIdx + 1) + ' of ' + DRILL_SET.tasks.length),
              h('button', {
                onClick: function() {
                  setLabToolData(function(prev) {
                    return Object.assign({}, prev, { playlab: Object.assign({}, prev.playlab, {
                      drillActive: false, drillTaskIdx: 0
                    })});
                  });
                  plAnnounce('Drill stopped.');
                },
                'aria-label': 'Stop the current drill',
                'data-pl-focusable': 'true',
                style: { padding: '4px 8px', minHeight: 24, borderRadius: 4, cursor: 'pointer',
                  border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', fontSize: 11 }
              }, allDone ? 'Close' : 'Stop')),
            allDone
              ? h('div', { style: { fontSize: 13, color: '#cbd5e1' } },
                  'You finished all ' + DRILL_SET.tasks.length + ' tasks. Mix concepts and shapes to keep practicing, or hit Stop to close the drill.')
              : h('div', null,
                  h('div', { style: { fontSize: 14, color: '#f1f5f9', fontWeight: 600, marginBottom: 4 } }, task.goal),
                  h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 4 } },
                    h('span', { style: { color: '#10b981', fontWeight: 700, marginRight: 6 } }, 'Progress:'),
                    task.progress(stats)),
                  task.tip ? h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } },
                    h('span', { style: { color: '#fbbf24' } }, '💡 '), task.tip) : null)
          );
        })(),

        // Two-column layout
        h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16 } },

          // LEFT: field canvas + analysis panel
          h('div', null,
            h('canvas', {
              ref: canvasRef, width: 720, height: 360,
              role: 'img', tabIndex: 0, 'data-pl-focusable': 'true',
              'aria-label': 'Football field, ' + play.label + ' against ' + coverage.label
                + (openReceiverId ? '. Most open receiver: ' + openReceiverId : '')
                + '. Click and drag a player to reposition them.',
              onMouseDown: handleMouseDown,
              onMouseMove: handleMouseMove,
              onMouseUp: handleMouseUp,
              onMouseLeave: handleMouseUp,
              style: { width: '100%', maxWidth: 720, height: 'auto', borderRadius: 10, border: '1px solid #334155', background: '#0f172a', cursor: 'pointer', touchAction: 'none' }
            }),
            // ── Run Play button — the headline action ──
            // A green pill below the canvas that animates the play.
            // Disabled while a run is in flight; re-enables after the
            // outcome banner clears. Reduced-motion users get an instant
            // outcome (no animation) — handled in the rAF effect.
            h('div', { style: { marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
              h('button', {
                onClick: startRun,
                disabled: !!d.runActive,
                'aria-busy': !!d.runActive,
                'data-pl-focusable': 'true',
                'aria-label': d.runActive ? 'Play is running' : 'Run the active play with animation',
                style: {
                  padding: '10px 18px', minHeight: 38, borderRadius: 8,
                  cursor: d.runActive ? 'wait' : 'pointer',
                  border: '1px solid #10b981',
                  background: d.runActive ? '#1e293b' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: d.runActive ? '#94a3b8' : '#0f172a',
                  fontSize: 14, fontWeight: 800
                }
              }, d.runActive ? '⏱ Running…' : '▶ Run Play'),
              d.runOutcome ? h('span', {
                style: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' }
              },
                d.runOutcome.location === 'caught' ? 'Last result: ✅ Complete to ' + d.runOutcome.receiverId
                  : d.runOutcome.location === 'brokenup' ? 'Last result: ✋ Broken up'
                  : 'Last result: ❌ Incomplete'
              ) : null
            ),

            // Toggle row + reset positions
            h('div', { style: { marginTop: 8, display: 'flex', gap: 12, fontSize: 12, color: '#cbd5e1', flexWrap: 'wrap', alignItems: 'center' } },
              h('label', { style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } },
                h('input', { type: 'checkbox', checked: !!d.showZones, 'data-pl-focusable': 'true',
                  onChange: function(e) { upd('showZones', e.target.checked); } }),
                'Coverage zones'),
              h('label', { style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } },
                h('input', { type: 'checkbox', checked: !!d.showRoutes, 'data-pl-focusable': 'true',
                  onChange: function(e) { upd('showRoutes', e.target.checked); } }),
                'Route lines'),
              h('label', { style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } },
                h('input', { type: 'checkbox', checked: !!d.showOpen, 'data-pl-focusable': 'true',
                  onChange: function(e) { upd('showOpen', e.target.checked); } }),
                isSoccer ? 'Open-player halo' : 'Open-receiver halo'),
              // Soccer-only: xG heatmap toggle. Lives next to the open-halo
              // toggle so all visualization options sit together.
              isSoccer ? h('label', { style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } },
                h('input', { type: 'checkbox', checked: !!d.showXG, 'data-pl-focusable': 'true',
                  onChange: function(e) { upd('showXG', e.target.checked); } }),
                'xG heatmap') : null,
              // "Custom edits" indicator + Reset button. Only renders when the
              // student has actually moved a player, so the UI stays clean
              // when running stock plays.
              Object.keys(d.customPositions || {}).length > 0 ? h('span', {
                style: { marginLeft: 'auto', fontSize: 11, color: '#fbbf24', fontStyle: 'italic' }
              }, '✎ ' + Object.keys(d.customPositions).length + ' custom position' + (Object.keys(d.customPositions).length === 1 ? '' : 's')) : null,
              Object.keys(d.customPositions || {}).length > 0 ? h('button', {
                onClick: resetPositions,
                'data-pl-focusable': 'true',
                'aria-label': 'Reset all custom player positions to the play preset',
                style: {
                  padding: '4px 10px', minHeight: 24, borderRadius: 4, cursor: 'pointer',
                  border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', fontSize: 11
                }
              }, 'Reset positions') : null,
              // Save play — only renders when there's something custom to save
              Object.keys(d.customPositions || {}).length > 0 ? h('button', {
                onClick: openSavePrompt,
                'data-pl-focusable': 'true',
                'aria-label': 'Save the current custom play with a name',
                style: {
                  padding: '4px 10px', minHeight: 24, borderRadius: 4, cursor: 'pointer',
                  border: '1px solid #d946ef', background: 'rgba(217,70,239,0.18)',
                  color: '#f1f5f9', fontSize: 11, fontWeight: 600
                }
              }, '💾 Save play') : null
            ),
            // Save prompt — inline form below the toggle row
            d.savePromptOpen ? h('div', {
              role: 'dialog', 'aria-label': 'Save play',
              style: { marginTop: 8, padding: 12, background: '#0f172a', border: '1px solid #d946ef', borderRadius: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }
            },
              h('label', { htmlFor: 'pl-save-name', style: { fontSize: 12, color: '#cbd5e1' } }, 'Play name:'),
              h('input', {
                id: 'pl-save-name', type: 'text',
                value: d.savePromptName || '',
                onChange: function(e) { upd('savePromptName', e.target.value); },
                onKeyDown: function(e) {
                  if (e.key === 'Enter') commitSavePlay();
                  else if (e.key === 'Escape') cancelSavePrompt();
                },
                'data-pl-focusable': 'true', autoFocus: true,
                style: { flex: 1, minWidth: 200, padding: '6px 8px', borderRadius: 4, border: '1px solid #475569', background: '#1e293b', color: '#f1f5f9', fontSize: 12 }
              }),
              h('button', {
                onClick: commitSavePlay, 'data-pl-focusable': 'true',
                style: { padding: '6px 12px', minHeight: 30, borderRadius: 4, cursor: 'pointer', border: '1px solid #d946ef', background: 'rgba(217,70,239,0.18)', color: '#f1f5f9', fontSize: 11, fontWeight: 600 }
              }, 'Save'),
              h('button', {
                onClick: cancelSavePrompt, 'data-pl-focusable': 'true',
                style: { padding: '6px 12px', minHeight: 30, borderRadius: 4, cursor: 'pointer', border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', fontSize: 11 }
              }, 'Cancel')
            ) : null,
            // Drag hint — only on first load (no custom edits yet) so it
            // doesn't nag returning students
            !Object.keys(d.customPositions || {}).length ? h('div', {
              style: { marginTop: 6, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }
            }, '💡 Tip: click and drag any player on the field to reposition them. The route stays attached so you can design your own play.') : null,
            // ── Coach Mode bubble ──
            // Renders only when there's a reply, error, or in-flight request.
            // Sits between the toggles and the analysis panel so coaching
            // appears prominently right under the field.
            (d.coachReply || d.coachError || d.coachLoading) ? h('section', {
              'aria-labelledby': 'pl-coach-heading',
              'aria-busy': !!d.coachLoading,
              style: { marginTop: 10, padding: 12, background: 'linear-gradient(135deg, rgba(217,70,239,0.10), rgba(124,58,237,0.10))', border: '1px solid #d946ef', borderRadius: 10 }
            },
              h('h3', { id: 'pl-coach-heading',
                style: { fontSize: 12, margin: 0, marginBottom: 6, color: '#d946ef', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
              }, '🤖 Coach analysis'),
              d.coachLoading
                ? h('div', { style: { color: '#cbd5e1', fontSize: 12, fontStyle: 'italic' } }, 'Analyzing the play vs the coverage…')
                : d.coachError
                ? h('div', { style: { color: '#ef4444', fontSize: 12 } }, d.coachError)
                : h('div', { style: { color: '#f1f5f9', fontSize: 13, lineHeight: 1.5 } }, d.coachReply)
            ) : null,

            // Analysis panel
            h('section', {
              'aria-labelledby': 'pl-analysis-heading',
              style: { marginTop: 10, padding: 12, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10 }
            },
              h('h3', { id: 'pl-analysis-heading', style: { fontSize: 12, margin: 0, marginBottom: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 } },
                'Open-receiver analysis'),
              analysis.length === 0
                ? h('div', { style: { color: '#94a3b8', fontSize: 13, fontStyle: 'italic' } }, 'No eligible receivers running routes.')
                : h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 } },
                    analysis.slice(0, 3).map(function(r, idx) {
                      var winner = idx === 0;
                      return h('div', {
                        key: r.id,
                        style: {
                          padding: 8, borderRadius: 6,
                          background: winner ? 'rgba(16,185,129,0.18)' : '#1e293b',
                          border: '1px solid ' + (winner ? '#10b981' : '#334155')
                        }
                      },
                        h('div', { style: { fontWeight: 700, color: winner ? '#10b981' : '#fbbf24', marginBottom: 2 } },
                          winner ? '🟢 Most open' : (idx === 1 ? 'Second' : 'Third')),
                        h('div', { style: { color: '#f1f5f9', fontSize: 13 } }, r.id),
                        h('div', { style: { color: '#cbd5e1', fontSize: 11 } },
                          r.opennessYd === Infinity ? 'No defender' : r.opennessYd.toFixed(1) + ' yd from nearest defender'),
                        h('div', { style: { color: '#94a3b8', fontSize: 10, marginTop: 2 } }, r.nearestZone || '—')
                      );
                    })
                  )
            )
          ),

          // RIGHT: teach + coverage info + stats
          h('div', null,
            h('section', {
              'aria-labelledby': 'pl-play-heading',
              style: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 10 }
            },
              h('h3', { id: 'pl-play-heading', style: { fontSize: 12, margin: 0, marginBottom: 6, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 } },
                isSoccer ? (formationDef.icon + ' ' + formationDef.label) : (play.icon + ' ' + play.label)),
              h('div', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 } },
                isSoccer ? formationDef.teach : play.teach)
            ),
            // Soccer-only: concept teach blurb (the passing-network pattern)
            isSoccer ? h('section', {
              'aria-labelledby': 'pl-concept-heading',
              style: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 10 }
            },
              h('h3', { id: 'pl-concept-heading', style: { fontSize: 12, margin: 0, marginBottom: 6, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 } },
                concept.icon + ' ' + concept.label),
              h('div', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 } }, concept.teach)
            ) : null,
            h('section', {
              'aria-labelledby': 'pl-cov-heading',
              style: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 10 }
            },
              h('h3', { id: 'pl-cov-heading', style: { fontSize: 12, margin: 0, marginBottom: 6, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 } },
                '🛡️ ' + (isSoccer ? soccerShape.label : coverage.label)),
              h('div', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 } },
                isSoccer ? soccerShape.teach : coverage.teach)
            ),
            // Coach button — only renders if Gemini is available. The
            // analysis itself appears in the bubble under the field canvas
            // (left column) so it doesn't squeeze the narrow right column.
            typeof callGemini === 'function' ? h('button', {
              onClick: askCoach,
              disabled: !!d.coachLoading,
              'aria-busy': !!d.coachLoading,
              'aria-label': d.coachLoading ? 'Coach is thinking' : 'Ask the coach to analyze this play vs the active coverage',
              'data-pl-focusable': 'true',
              style: {
                width: '100%', marginBottom: 10,
                padding: '10px 14px', minHeight: 36, borderRadius: 6,
                cursor: d.coachLoading ? 'wait' : 'pointer',
                border: '1px solid #d946ef',
                background: d.coachLoading ? '#1e293b' : 'rgba(217, 70, 239, 0.18)',
                color: '#f1f5f9', fontSize: 12, fontWeight: 600
              }
            }, d.coachLoading ? '🤖 Coach is analyzing…' : '🤖 Ask the coach') : null,
            // ── Saved plays list ──
            // Only renders when at least one play has been saved. Each row
            // shows the name + sport icon + load + delete. Clicking the
            // row label loads the play; clicking the X deletes it.
            (d.savedPlays && d.savedPlays.length) ? h('section', {
              'aria-labelledby': 'pl-saved-heading',
              style: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 10 }
            },
              h('h3', { id: 'pl-saved-heading',
                style: { fontSize: 12, margin: 0, marginBottom: 6, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
              }, '💾 My Plays (' + d.savedPlays.length + ')'),
              h('ul', { style: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 } },
                d.savedPlays.slice().reverse().map(function(entry) {
                  return h('li', {
                    key: entry.id,
                    style: { display: 'flex', gap: 6, alignItems: 'center', padding: '4px 6px', borderRadius: 4, background: '#1e293b', border: '1px solid #334155' }
                  },
                    h('span', { style: { fontSize: 14 } }, entry.sport === 'soccer' ? '⚽' : '🏈'),
                    h('button', {
                      onClick: function() { loadSavedPlay(entry); },
                      'aria-label': 'Load saved play ' + entry.name,
                      'data-pl-focusable': 'true',
                      style: { flex: 1, padding: '4px 6px', borderRadius: 4, cursor: 'pointer',
                        border: '1px solid transparent', background: 'transparent',
                        color: '#f1f5f9', fontSize: 12, textAlign: 'left' }
                    }, entry.name),
                    h('button', {
                      onClick: function() { if (confirm('Delete saved play "' + entry.name + '"?')) deleteSavedPlay(entry.id); },
                      'aria-label': 'Delete saved play ' + entry.name,
                      'data-pl-focusable': 'true',
                      style: { padding: '4px 8px', minHeight: 24, minWidth: 24, borderRadius: 4, cursor: 'pointer',
                        border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', fontSize: 12 }
                    }, '✕')
                  );
                })
              )
            ) : null,
            h('div', { style: { fontSize: 11, color: '#94a3b8', display: 'flex', justifyContent: 'space-between' } },
              h('span', null, 'Plays seen: ' + Object.keys(d.playsViewed || {}).length + ' / ' + PLAYS.length),
              h('span', null, 'Coverages seen: ' + Object.keys(d.coveragesViewed || {}).length + ' / ' + COVERAGES.length)
            )
          )
        )
      );
    }
  });

})();
