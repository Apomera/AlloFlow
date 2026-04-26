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
  // FIELD MODEL
  // ═══════════════════════════════════════════
  // World coordinates (yards):
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
      routes: {
        WR1:  [{ dx: 45, dy: 5 }],          // streak to corner of end zone
        WR2:  [{ dx: 45, dy: -5 }],
        SLOT: [{ dx: 45, dy: 0 }],          // streak to middle of end zone
        TE:   [{ dx: 40, dy: 2 }],
        RB:   [{ dx: 8, dy: 4 }]            // outlet
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
    return [];
  }

  var COVERAGES = [
    { id: 'cover1', label: 'Cover 1 (Man)', short: 'C1',
      teach: 'One deep safety. Everyone else man-to-man. Beat with: pick routes (mesh), speed mismatches, RPOs.' },
    { id: 'cover2', label: 'Cover 2', short: 'C2',
      teach: 'Two deep safeties split the field. Five underneath zones. Beat with: 4 verticals (slot up the seam), or routes that find the gap between deep & underneath.' },
    { id: 'cover3', label: 'Cover 3', short: 'C3',
      teach: 'Three deep thirds + four underneath. Beat with: short crossing routes, slants, or smash (corner+hitch from same side).' },
    { id: 'tampa2', label: 'Tampa 2', short: 'T2',
      teach: 'Cover 2 with the MLB dropping into the deep middle to close the seam. Beat with: deep over routes, intermediate digs, or attacking the curl-flat between defenders.' }
  ];

  // ═══════════════════════════════════════════
  // GEOMETRY HELPERS — convert play data → absolute field coords
  // ═══════════════════════════════════════════
  // Apply a play's routes to a formation, returning a new players array
  // with `route: [{x, y}, ...]` populated for each receiver.
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
  function openReceiverAnalysis(players, zones) {
    var receivers = players.filter(function(p) {
      return (p.role === 'WR' || p.role === 'TE' || p.role === 'RB') && p.route;
    });
    var defenderCentroids = zones.map(function(z) { return Object.assign({ label: z.label }, polyCentroid(z.poly)); });
    var analysis = receivers.map(function(p) {
      var ep = receiverEndPoint(p);
      var nearestDist = Infinity;
      var nearestZone = null;
      defenderCentroids.forEach(function(c) {
        var dx = c.x - ep.x;
        var dy = c.y - ep.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < nearestDist) { nearestDist = d; nearestZone = c.label; }
      });
      return { id: p.id, role: p.role, ep: ep, opennessYd: nearestDist, nearestZone: nearestZone };
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

      // State init
      if (!labToolData || !labToolData.playlab) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { playlab: {
            playId: 'slant',
            coverageId: 'cover2',
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
            customPositions: {}
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
      var formation = applyPlayToFormation(rawFormation, play);
      var zones = buildZones(d.coverageId, d.losX);
      var analysis = openReceiverAnalysis(formation, zones);
      var openReceiverId = analysis.length ? analysis[0].id : null;

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
        function fx(yardX) { return marginL + (yardX / FIELD_LENGTH) * fieldPxW; }
        function fy(yardY) { return marginT + (yardY / FIELD_WIDTH) * fieldPxH; }
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

        // ── Players ──
        formation.forEach(function(p) {
          var px = fx(p.x), py = fy(p.y);
          var isOpen = d.showOpen && p.id === openReceiverId;
          var fill = p.role === 'QB' ? '#fbbf24'
                   : p.role === 'OL' ? '#94a3b8'
                   : p.role === 'WR' || p.role === 'TE' ? '#fafafa'
                   : p.role === 'RB' ? '#f97316'
                   : '#cbd5e1';
          if (isOpen) {
            // Pulsing halo around the open receiver
            gfx.fillStyle = 'rgba(16,185,129,0.35)';
            gfx.beginPath(); gfx.arc(px, py, 12, 0, Math.PI * 2); gfx.fill();
          }
          gfx.fillStyle = fill;
          gfx.beginPath(); gfx.arc(px, py, 6, 0, Math.PI * 2); gfx.fill();
          gfx.strokeStyle = '#0f172a';
          gfx.lineWidth = 1;
          gfx.stroke();
          // Player ID label
          gfx.fillStyle = '#0f172a';
          gfx.font = 'bold 8px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText(p.id, px, py + 3);
        });
      }, [d.playId, d.coverageId, d.losX, d.showZones, d.showRoutes, d.showOpen]);

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
          h('h2', { style: { margin: 0, fontSize: 20 } }, '🏈 PlayLab — Football Play & Coverage'),
          h('span', { style: { fontSize: 12, color: '#cbd5e1' } }, 'Every play is a coordinated math problem on a fixed grid.')
        ),

        // Play picker
        h('div', { role: 'group', 'aria-label': 'Play library',
          style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap', fontSize: 12 } },
          h('span', { style: { color: '#cbd5e1' } }, 'Play:'),
          PLAYS.map(function(p) {
            return pillBtn(p.icon + ' ' + p.label, d.playId === p.id, function() { loadPlay(p.id); });
          })
        ),

        // Coverage picker
        h('div', { role: 'group', 'aria-label': 'Defensive coverage',
          style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap', fontSize: 12 } },
          h('span', { style: { color: '#cbd5e1' } }, 'Defense:'),
          COVERAGES.map(function(c) {
            return pillBtn(c.label, d.coverageId === c.id, function() { loadCoverage(c.id); });
          })
        ),

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
                'Open-receiver halo'),
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
              }, 'Reset positions') : null
            ),
            // Drag hint — only on first load (no custom edits yet) so it
            // doesn't nag returning students
            !Object.keys(d.customPositions || {}).length ? h('div', {
              style: { marginTop: 6, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }
            }, '💡 Tip: click and drag any player on the field to reposition them. The route stays attached so you can design your own play.') : null,
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
                          r.opennessYd === Infinity ? 'No defender' : r.opennessYd.toFixed(1) + ' yd from nearest zone'),
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
                play.icon + ' ' + play.label),
              h('div', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 } }, play.teach)
            ),
            h('section', {
              'aria-labelledby': 'pl-cov-heading',
              style: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 10 }
            },
              h('h3', { id: 'pl-cov-heading', style: { fontSize: 12, margin: 0, marginBottom: 6, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 } },
                '🛡️ ' + coverage.label),
              h('div', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 } }, coverage.teach)
            ),
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
