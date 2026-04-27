// ═══════════════════════════════════════════
// stem_tool_throwlab.js — Sports Physics Lab
// Headline mode: Pitcher's Mound (baseball)
// Teaches: projectile motion + drag + Magnus effect
// "Same arm, different ball, different game. See why."
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
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Focus-visible outline (WCAG 2.4.7 Focus Visible) ──
  // Inline styles on buttons/sliders below would suppress the browser's default
  // focus ring. This scoped CSS restores a visible 3px amber outline on
  // keyboard focus only (mouse clicks won't trigger it). Limited to elements
  // tagged `data-tl-focusable` so we don't fight any host-app focus styles.
  (function() {
    if (document.getElementById('allo-throwlab-focus-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-throwlab-focus-css';
    st.textContent = '[data-tl-focusable]:focus-visible{outline:3px solid #fbbf24!important;outline-offset:2px!important;border-radius:6px}';
    document.head.appendChild(st);
  })();


  // ── Audio (whoosh on throw, thwack on hit) ─────────────────
  var _tlAC = null;
  function getTlAC() {
    if (!_tlAC) {
      try { _tlAC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    if (_tlAC && _tlAC.state === 'suspended') { try { _tlAC.resume(); } catch (e) {} }
    return _tlAC;
  }
  function tlTone(f, d, tp, v) {
    var ac = getTlAC(); if (!ac) return;
    try {
      var o = ac.createOscillator(); var g = ac.createGain();
      o.type = tp || 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(v || 0.07, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (d || 0.1));
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + (d || 0.1));
    } catch (e) {}
  }
  function sfxThrow() { tlTone(420, 0.20, 'sine', 0.05); tlTone(280, 0.25, 'sine', 0.04); }
  function sfxStrike() { tlTone(900, 0.05, 'square', 0.08); tlTone(600, 0.10, 'sine', 0.06); }
  function sfxBall() { tlTone(180, 0.18, 'sawtooth', 0.05); }
  function sfxCatch() { tlTone(150, 0.08, 'sine', 0.06); }

  // ── ARIA live region for screen-reader announcements ───────
  (function() {
    if (document.getElementById('allo-live-throwlab')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-throwlab';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();
  // Live-region announcer with rapid-fire protection.
  // Setting textContent twice within ~500ms can drop the first announcement
  // before the SR engine picks it up. We clear → wait one frame → set, so
  // each call produces a distinct mutation the SR will read. Pending
  // announcements stack via micro-queue: only the LAST queued message wins
  // (we don't want to read 3 stale messages back-to-back), but it always
  // fires in a fresh tick so it can't get clobbered by a same-tick second
  // call.
  var _tlAnnounceTimer = null;
  function tlAnnounce(msg) {
    var lr = document.getElementById('allo-live-throwlab');
    if (!lr) return;
    if (_tlAnnounceTimer) clearTimeout(_tlAnnounceTimer);
    lr.textContent = '';
    _tlAnnounceTimer = setTimeout(function() {
      lr.textContent = msg;
      _tlAnnounceTimer = null;
    }, 60);
  }

  // ═══════════════════════════════════════════
  // PHYSICS ENGINE
  // ═══════════════════════════════════════════

  // Air density at sea level, room temperature (kg/m³)
  var RHO = 1.225;
  // Gravity (m/s² Earth). simulatePitch accepts opts.gravity to override.
  var G = 9.81;
  // Planetary gravity presets — same numbers stem_tool_physics.js exposes,
  // so the two tools agree on "what gravity feels like on Mars". Pluto is
  // not included (its surface gravity is so weak the trajectory would walk
  // off the canvas).
  var GRAVITY_PRESETS = [
    { id: 'earth',   label: 'Earth',   g: 9.81,   icon: '🌍' },
    { id: 'moon',    label: 'Moon',    g: 1.62,   icon: '🌙' },
    { id: 'mercury', label: 'Mercury', g: 3.70,   icon: '☿️' },   // closest to Sun, gravity ≈ Mars
    { id: 'mars',    label: 'Mars',    g: 3.71,   icon: '🔴' },
    { id: 'saturn',  label: 'Saturn',  g: 10.44,  icon: '🪐' },   // sneaky-close to Earth
    { id: 'jupiter', label: 'Jupiter', g: 24.79, icon: '⚫' },
    { id: 'sun',     label: 'Sun',     g: 274.0,  icon: '☀️' }   // 28× Earth — extreme dropper
  ];
  // ── Engagement layer: Personal Bests ──
  // Per-sport "career highs" tracked across sessions. Each metric is a
  // simple number; on any throw, we walk the relevant metrics, compare,
  // and announce + persist if the student broke a record. Mirrors NBA
  // 2K MyCareer Highs / fantasy-sports records pages — a kid sees
  // their own all-time best and wants to top it.
  function checkPersonalBests(d, lr, stats) {
    var pbs = Object.assign({}, d.personalBests || {});
    var modeKey = d.mode;
    pbs[modeKey] = pbs[modeKey] || {};
    var sport = pbs[modeKey];
    var newRecords = [];
    function tryPB(metricKey, candidate, label, formatVal) {
      if (typeof candidate !== 'number' || isNaN(candidate)) return;
      var prev = sport[metricKey];
      if (prev == null || candidate > prev) {
        sport[metricKey] = candidate;
        newRecords.push({ label: label, value: formatVal ? formatVal(candidate) : candidate });
      }
    }
    var loc = lr && lr.location;
    var isMake = loc === 'strike' || loc === 'swish' || loc === 'made' || loc === 'goal' || loc === 'caught'
      || loc === 'good' || loc === 'wicket' || loc === 'shaved' || loc === 'ace' || loc === 'in'
      || loc === 'green' || loc === 'fairway';
    if (d.mode === 'pitching' && loc === 'strike') {
      tryPB('fastestStrike', d.speedMph, 'Fastest strike', function(v) { return v + ' mph'; });
      tryPB('longestStrikeStreak', stats.streakStrikes || 0, 'Longest strike streak');
    }
    if (d.mode === 'freekick' && loc === 'goal' && lr.samples) {
      var xs = lr.samples.map(function(s) { return s.x; });
      var curl = Math.max.apply(null, xs) - Math.min.apply(null, xs);
      tryPB('biggestCurl', +curl.toFixed(2), 'Biggest curl on a goal', function(v) { return v.toFixed(2) + ' m'; });
    }
    if (d.mode === 'fieldgoal' && loc === 'good') {
      tryPB('longestFG', d.fgDistanceYd || 0, 'Longest field goal made', function(v) { return v + ' yd'; });
    }
    if (d.mode === 'bowling' && (loc === 'wicket' || loc === 'shaved')) {
      tryPB('mostWickets', stats.totalWickets || 0, 'Most wickets in a session');
    }
    if (d.mode === 'golf' && loc === 'green') {
      tryPB('greensInSession', (stats.golfClubsOnGreen ? Object.keys(stats.golfClubsOnGreen).length : 0), 'Different clubs to a green');
    }
    if (d.mode === 'volleyball' && loc === 'ace') {
      tryPB('mostAces', stats.volleyAceCount || 0, 'Most aces in a session');
      tryPB('fastestAce', d.speedMph, 'Fastest ace serve', function(v) { return v + ' mph'; });
    }
    if (d.mode === 'freethrow' && (loc === 'swish' || loc === 'made')) {
      tryPB('longestMakeStreak', stats.hotStreak || 0, 'Longest make streak');
      tryPB('mostMakes', d.shotMakeCount || 0, 'Most makes in a session');
    }
    // Cross-sport: longest hot streak ever (any mode)
    pbs.cross = pbs.cross || {};
    if (isMake && (stats.hotStreak || 0) > (pbs.cross.longestStreakAnySport || 0)) {
      pbs.cross.longestStreakAnySport = stats.hotStreak;
      newRecords.push({ label: 'Longest streak (any sport)', value: stats.hotStreak });
    }
    return { personalBests: pbs, newRecords: newRecords };
  }

  // ── Engagement layer: Daily Challenge ──
  // Deterministic-by-date pick from SCENARIOS + customScenarios so
  // every student in the same class sees the same challenge today.
  // Tracks attempt + completion in toolData (dailyAttempted /
  // dailyCompleted, both keyed to date string). Mirrors fantasy-
  // sports daily-lineup hooks: come back tomorrow, see a new one.
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  // Tiny string-hash so the same date → same scenario index
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }
  function getDailyChallenge() {
    var pool = SCENARIOS; // built-ins only — class-wide consistency
    if (!pool.length) return null;
    var idx = hashStr(todayKey()) % pool.length;
    return pool[idx];
  }

  // ── Engagement layer: Stats Card builder ──
  // Returns rows of {label, value} per sport — a fantasy-sports
  // stat-line a kid recognizes from their phone screen. Renders in
  // a "Your Numbers" panel + reuses the same data points the badges
  // and trading card already pull from. Pure data formatting, no
  // new state.
  function getStatsRows(d) {
    var s = d.drillStats || {};
    var pct = function(num, den) { return den ? Math.round((num / den) * 100) + '%' : '—'; };
    var rows = [];
    var totalThrows = d.throwCount || 0;
    rows.push({ label: 'Total throws', value: totalThrows });
    rows.push({ label: 'Hot streak', value: s.hotStreak || 0 });
    if (d.mode === 'pitching') {
      rows.push({ label: 'Strikes', value: d.strikeCount || 0 });
      rows.push({ label: 'Strike rate', value: pct(d.strikeCount || 0, totalThrows) });
      rows.push({ label: 'Pitch types thrown', value: Object.keys(d.pitchTypesUsed || {}).length });
      rows.push({ label: 'Pitch types struck', value: Object.keys(s.strikeTypes || {}).length });
    } else if (d.mode === 'freethrow') {
      rows.push({ label: 'Makes', value: d.shotMakeCount || 0 });
      rows.push({ label: 'Make rate', value: pct(d.shotMakeCount || 0, totalThrows) });
      rows.push({ label: 'Different swish heights', value: s.swishHeights || 0 });
      rows.push({ label: 'Bounce pass completed', value: s.completedBouncePass ? '✓' : '—' });
    } else if (d.mode === 'freekick') {
      rows.push({ label: 'Goals', value: d.goalCount || 0 });
      rows.push({ label: 'Goal rate', value: pct(d.goalCount || 0, totalThrows) });
      rows.push({ label: 'Kick styles scored', value: Object.keys(s.goalKickTypes || {}).length });
    } else if (d.mode === 'fieldgoal') {
      rows.push({ label: 'FGs made', value: d.fgMakeCount || 0 });
      rows.push({ label: 'Make rate', value: pct(d.fgMakeCount || 0, totalThrows) });
      rows.push({ label: 'Distances cleared', value: Object.keys(s.fgMadeByDist || {}).length });
    } else if (d.mode === 'bowling') {
      rows.push({ label: 'Wickets', value: d.wicketCount || 0 });
      rows.push({ label: 'Wicket rate', value: pct(d.wicketCount || 0, totalThrows) });
      rows.push({ label: 'Delivery types used', value: Object.keys(s.bowlTypes || {}).length });
    } else if (d.mode === 'golf') {
      rows.push({ label: 'Greens hit', value: d.golfGreenCount || 0 });
      rows.push({ label: 'Green rate', value: pct(d.golfGreenCount || 0, totalThrows) });
      rows.push({ label: 'Fairways hit', value: s.golfFairwaysHit || 0 });
      rows.push({ label: 'Clubs to a green', value: Object.keys(s.golfClubsOnGreen || {}).length });
    } else if (d.mode === 'volleyball') {
      rows.push({ label: 'Aces', value: d.volleyAceCount || 0 });
      rows.push({ label: 'Ace rate', value: pct(d.volleyAceCount || 0, totalThrows) });
      rows.push({ label: 'In-court serves', value: s.volleyInCount || 0 });
      rows.push({ label: 'Serve types in court', value: Object.keys(s.volleyServesIn || {}).length });
    }
    rows.push({ label: 'Badges earned', value: Object.keys(d.badgesEarned || {}).length + ' / ' + BADGES.length });
    // Career Highs — append the active sport\'s personal-bests as a
    // sub-section (separator first, then each PB in the same column
    // grid).
    var pbs = (d.personalBests && d.personalBests[d.mode]) || {};
    var pbKeys = Object.keys(pbs);
    if (pbKeys.length) {
      rows.push({ label: '── Career Highs ──', value: '' });
      // Pretty-print the metric keys we expect; fall back to raw key
      var pbLabels = {
        fastestStrike: 'Fastest strike (mph)',
        longestStrikeStreak: 'Longest strike streak',
        biggestCurl: 'Biggest curl (m)',
        longestFG: 'Longest FG (yd)',
        mostWickets: 'Most wickets',
        greensInSession: 'Greens / clubs',
        mostAces: 'Most aces',
        fastestAce: 'Fastest ace (mph)',
        longestMakeStreak: 'Longest make streak',
        mostMakes: 'Most makes'
      };
      pbKeys.forEach(function(k) {
        rows.push({ label: pbLabels[k] || k, value: pbs[k] });
      });
    }
    return rows;
  }

  // ── Engagement layer: Coach personality picker ──
  // Same Gemini call, different voice. Each persona prepends a short
  // system-style prefix to the Coach Mode prompt so the response
  // matches the persona's tone. The kid who wants Phil Jackson zen
  // calm gets it; the kid who wants Vince Lombardi intensity gets it.
  // Persisted in toolData.coachPersona; defaults to 'analyst'.
  var COACH_PERSONAS = [
    { id: 'analyst', label: 'Analyst', icon: '🎙️',
      prepend: 'Use a calm, analytical voice — present the physics like a broadcast color commentator. Educational but warm.' },
    { id: 'oldschool', label: 'Old School', icon: '🧢',
      prepend: 'Use a terse, demanding old-school coach voice. No frills. Short sentences. Tell the student what they did well, then exactly what to fix. "Good ball, kid. Now lower your release point" energy.' },
    { id: 'hype', label: 'Hype Man', icon: '🔥',
      prepend: 'Use an energetic, encouraging hype-man voice. Pump the student up. Use exclamation points sparingly but enthusiastically. "THERE YOU GO" / "THAT\'S WHAT I\'M TALKING ABOUT" energy. Stay specific and physics-grounded.' },
    { id: 'zen', label: 'Zen', icon: '🧘',
      prepend: 'Use a calm, reflective Phil Jackson zen-coach voice. Speak in measured rhythm. Connect the throw to a deeper principle. "Notice the apex. Notice where the ball wanted to go." Present-tense, observational.' }
  ];

  // ── Engagement layer: Achievements / Badges ──
  // Named badges unlocked from drill-stat criteria. The earn-detector
  // walks BADGES on every throw, awarding any whose `check` returns
  // true. Earned set persists in toolData.badgesEarned. Each first-
  // earn awards a small XP bonus + toast + tlAnnounce. Designed so
  // an athletic kid sees their collection grow as they explore — the
  // dopamine loop a sports kid recognizes from Madden / FIFA.
  var BADGES = [
    { id: 'beckham', emoji: '🌀', label: 'Beckham Badge',
      hint: 'Score a free kick with > 1.5 m of curl',
      check: function(d, lr) {
        if (d.mode !== 'freekick' || lr.location !== 'goal' || !lr.samples) return false;
        var xs = lr.samples.map(function(s) { return s.x; });
        var curl = Math.max.apply(null, xs) - Math.min.apply(null, xs);
        return curl > 1.5;
      } },
    { id: 'howzat', emoji: '🏏', label: 'Howzat',
      hint: '3 wickets in one session',
      check: function(d, lr, stats) { return d.mode === 'bowling' && (stats.totalWickets || 0) >= 3; } },
    { id: 'money', emoji: '💰', label: 'Money',
      hint: 'Make 5 free throws in a row',
      check: function(d, lr, stats) { return d.mode === 'freethrow' && (stats.hotStreak || 0) >= 5; } },
    { id: 'hailmary-hero', emoji: '🌠', label: 'Hail Mary Hero',
      hint: 'Make a 50+ yd field goal',
      check: function(d, lr) { return d.mode === 'fieldgoal' && lr.location === 'good' && (d.fgDistanceYd || 0) >= 50; } },
    { id: 'cutter', emoji: '⚡', label: 'Cutter',
      hint: 'Strike with the slider pitch',
      check: function(d, lr) { return d.mode === 'pitching' && lr.location === 'strike' && d.pitchType === 'slider'; } },
    { id: 'fastball-heat', emoji: '🔥', label: 'Fastball Heat',
      hint: 'Strike with a 4-Seam at 100+ mph',
      check: function(d, lr) { return d.mode === 'pitching' && lr.location === 'strike' && d.pitchType === '4seam' && d.speedMph >= 100; } },
    { id: 'knuckle-king', emoji: '🦋', label: 'Knuckle King',
      hint: 'Strike with the knuckleball',
      check: function(d, lr) { return d.mode === 'pitching' && lr.location === 'strike' && d.pitchType === 'knuckle'; } },
    { id: 'birdie-threat', emoji: '⛳', label: 'Birdie Threat',
      hint: 'Hit the green with the Sand Wedge',
      check: function(d, lr) { return d.mode === 'golf' && lr.location === 'green' && d.golfClub === 'wedge'; } },
    { id: 'ace-server', emoji: '🏐', label: 'Ace Server',
      hint: 'Land a volleyball ace',
      check: function(d, lr) { return d.mode === 'volleyball' && lr.location === 'ace'; } }
  ];

  // ── Engagement layer: Hot-Hand + Hype ──
  // Sports broadcasting language scaffolding for athletic students who
  // bounce off academic framing. Streak indicator mirrors NBA Jam's
  // "He's heating up / On fire" momentum trope. Hype phrases are
  // cycled into a small pre-throw text box that auto-fades — never
  // blocks input. Tied to drillStats.streakStrikes (already tracked).
  var HYPE_PHRASES = [
    'Money time',
    'Show me what you got',
    'Lights, camera, clutch',
    'This is your moment',
    "Let's see it",
    'Time to cook',
    'Buckets',
    'In the zone',
    'Stay locked in',
    'One more rep',
    'Make it count',
    'Show out',
    'Let it rip',
    'Trust the work',
    'Take the shot'
  ];
  function pickHypePhrase() {
    return HYPE_PHRASES[Math.floor(Math.random() * HYPE_PHRASES.length)];
  }
  // Map a streak count to a Hot-Hand label. Returns null if the streak
  // is too short to surface (keeps the UI quiet during early misses).
  function getHotHand(streak) {
    if (!streak || streak < 2) return null;
    if (streak === 2) return { emoji: '🟧', label: 'Warming up', color: '#fb923c' };
    if (streak <= 4) return { emoji: '🔥', label: "He's heating up!", color: '#ef4444' };
    return { emoji: '🔥🔥', label: 'ON FIRE', color: '#dc2626' };
  }

  // ── Scenarios ──
  // One-click teaching demos that combine mode + preset + gravity + wind
  // into a configured setup. Useful as a "warm up the lab" feature: the
  // teacher picks a scenario, the simulator snaps to it, students can
  // immediately throw and discuss WITHOUT manually dialing 6 controls.
  // Each scenario has a teach blurb describing what the student should
  // notice when they run it.
  var SCENARIOS = [
    { id: 'beckham', label: "Beckham's Curl", icon: '⚽',
      mode: 'freekick', presetId: 'curling', gravityId: 'earth',
      windMph: 0, windDirDeg: 0,
      teach: '22 m free kick with 600 rpm of sidespin. Watch the ball bend ~1.5 m around the wall — that\'s Magnus force in action. The signature soccer free kick.',
      questions: [
        'Magnus force scales with v² × ω (speed squared × spin rate). Why does Beckham strike the ball so hard if curl matters more than power?',
        'The wall is 9.15 m away, the goal is 22 m. How does the BALL position itself laterally over each segment of the flight?',
        'A right-footed kicker curls the ball one direction. What changes if the kicker is left-footed and standing on the same spot?'
      ] },
    { id: 'moon-fg', label: 'Field Goal on the Moon', icon: '🌙',
      mode: 'fieldgoal', presetId: 'long', gravityId: 'moon',
      windMph: 0, windDirDeg: 0,
      teach: '50-yard field goal at 1/6 Earth gravity. The ball stays airborne ~6× as long, traveling far past the goalposts. Same speed + angle, drastically different trajectory — the lesson is that range scales with 1/g.',
      questions: [
        'Why does horizontal range scale with 1/g (inversely with gravity)? Derive it from the kinematic equations.',
        'The Moon has no atmosphere. How would adding Moon-gravity AND Earth-atmosphere change the trajectory differently?',
        'If you could pick ANY gravity for an Olympic javelin event, what would maximize distance — minimum gravity or some other value?'
      ] },
    { id: 'mariano', label: "Mariano's Cutter", icon: '⚾',
      mode: 'pitching', presetId: 'slider', gravityId: 'earth',
      windMph: 0, windDirDeg: 0,
      teach: 'Mariano Rivera\'s legendary cut fastball: 92 mph with bullet-spin sidespin. Watch the ball slide ~6 inches laterally just before the plate. The pitch that built a Hall of Fame career.',
      questions: [
        'A 92 mph slider reaches the plate in ~0.42 s. The hitter has ~0.15 s of decision time after recognizing spin. How does that timing math favor the pitcher?',
        'Magnus force creates lateral break in the LAST third of the flight (the curve is non-linear). Why does the break feel more "sudden" than a constant curve?',
        'Why is Rivera\'s cutter called a "cutter" rather than a "slider" — what subtle difference in spin axis or velocity defines each?'
      ] },
    { id: 'parker-floater', label: "Tony Parker Floater", icon: '☔',
      mode: 'freethrow', presetId: 'floater', gravityId: 'earth',
      windMph: 0, windDirDeg: 0,
      teach: 'Slow, ultra-high (~62°) arc over a contesting big man. The hangtime is ~1.5 s; the defender\'s hand is on the way DOWN by the time the ball drops through. Geometry beats reach.',
      questions: [
        'A 62° arc has more hangtime than a 45° arc but covers less horizontal distance per second. What\'s the physics trade-off?',
        'A 7-foot defender can reach ~2.8 m with arms up. The floater apex is ~3.5 m. Why does that 0.7 m gap matter so much when the defender is right there?',
        'Why don\'t guards just shoot floaters all the time? What\'s the accuracy cost of releasing at high arc?'
      ] },
    { id: 'headwind-hailmary', label: 'Hail Mary into Headwind', icon: '💨',
      mode: 'fieldgoal', presetId: 'hailmary', gravityId: 'earth',
      windMph: 15, windDirDeg: 0,
      teach: '60-yard kick into a 15 mph headwind. The headwind both slows the ball AND increases drag-induced lift loss — total range drops ~8-12 yards. A demonstration of why kickers check the flags.',
      questions: [
        'Drag scales with v² (relative to air, not ground). Headwind ADDS to relative airspeed — why does this make drag MORE than just additive?',
        'A 15 mph headwind eats ~8-12 yards. Would a 15 mph crosswind affect range as much, or differently?',
        'What\'s the optimal launch angle WITH wind? Does it shift higher or lower than 42° (the calm-air optimum)?'
      ] },
    { id: 'warne-googly', label: "Warne's Googly", icon: '🌪️',
      mode: 'bowling', presetId: 'legspin', gravityId: 'earth',
      windMph: 0, windDirDeg: 0,
      teach: 'Shane Warne territory: 50 mph leg-spin delivery with the spin axis pulling the ball into the off-stump line. After bouncing, the ball turns ~40-60 cm — wider than any other delivery in cricket. The "Ball of the Century" rolled into one preset.',
      questions: [
        'In cricket the ball BOUNCES before reaching the batter. Why does spin in the AIR matter less than spin off the SURFACE?',
        '50 mph leg-spin is much slower than a 90 mph fast ball. How does the bowler use the speed difference to deceive the batter?',
        'A "googly" is a leg-spinner\'s wrong\'un — same arm action, opposite spin direction. Why does that work psychologically and geometrically?'
      ] },
    { id: 'driver-tail', label: 'Driver in a Tailwind', icon: '🏌️',
      mode: 'golf', presetId: 'driver', gravityId: 'earth',
      windMph: 8, windDirDeg: 180,
      teach: '250 yd driver with an 8 mph tailwind. The wind pushes the ball forward AND reduces drag (relative wind speed drops), adding ~20-30 yards of carry. PGA pros chase tailwind days for personal-best drives.',
      questions: [
        'A tailwind at 8 mph pushes the ball forward by 8 mph during its airtime. Why does the actual carry increase by MORE than just (8 mph × airtime)?',
        'Tailwinds reduce ball-to-air relative speed, which reduces drag AND backspin lift. Which effect dominates for a driver, and why?',
        'If you played the same hole into an 8 mph headwind, would the carry decrease by the same amount? Why or why not?'
      ] },
    { id: 'olympic-jump', label: 'Olympic Jump Serve', icon: '🏐',
      mode: 'volleyball', presetId: 'jump', gravityId: 'earth',
      windMph: 0, windDirDeg: 0,
      teach: '70 mph jump serve from a 3.0 m release height with topspin. The Magnus force pulls the ball DOWN past the net at speed — the receiver has ~0.5 s to react. Wilfredo Leon territory.',
      questions: [
        'A 70 mph jump serve crosses 18 m in ~0.6 s. The receiver\'s reaction time is ~0.25 s. What does that leave for the pass?',
        'Topspin Magnus force pulls the ball DOWN. Why is that helpful (rather than hurtful) for a high-speed serve over a 2.43 m net?',
        'The release height is 3.0 m, much higher than overhand serves. Why does a higher release point + topspin combine multiplicatively to make this serve so dangerous?'
      ] },
    { id: 'jupiter-pitcher', label: 'Pitching on Jupiter', icon: '⚫',
      mode: 'pitching', presetId: '4seam', gravityId: 'jupiter',
      windMph: 0, windDirDeg: 0,
      teach: 'A 92 mph 4-seam fastball at 2.5× Earth gravity. The ball drops dramatically — strike zone almost impossible. Lesson: gravity rules trajectory; without backspin lift, the ball falls a meter from release to plate.',
      questions: [
        'A 4-seam fastball has backspin (Magnus lift up). On Jupiter, does the same backspin compensate for stronger gravity, or is it overwhelmed?',
        'How would a pitcher have to ADJUST their release angle on Jupiter to throw a strike?',
        'On Jupiter, would a curveball (topspin → drop) reach the plate at all? Compute the trajectory mentally.'
      ] }
  ];

  // Wind presets — quick-pick alternatives to manually setting speed +
  // direction. Direction convention: 0° = head (against the throw), 90° =
  // R-to-L cross, 180° = tail (with the throw), 270° = L-to-R cross.
  // Calm zeroes both fields; Tornado is intentionally exaggerated for
  // a dramatic teaching demo (real tornado speeds at the funnel are
  // 65-300+ mph, but ball physics break down past about 40 mph).
  var WIND_PRESETS = [
    { id: 'calm',     label: 'Calm',            mph: 0,  dirDeg: 0,   icon: '🌤️' },
    { id: 'tail',     label: 'Tailwind',        mph: 8,  dirDeg: 180, icon: '⬆️' },
    { id: 'head',     label: 'Strong Headwind', mph: 15, dirDeg: 0,   icon: '⬇️' },
    { id: 'cross',    label: 'Crosswind',       mph: 12, dirDeg: 90,  icon: '➡️' },
    { id: 'tornado',  label: 'Tornado',         mph: 40, dirDeg: 270, icon: '🌪️' }
  ];
  // Conversion helpers
  var MPH_PER_MPS = 2.23694;
  var FT_PER_M = 3.28084;

  // Ball specs — real-world. Each entry has flight params (mass, radius,
  // Cd, Cm) PLUS regulation specs (pressure, mass range, diameter range,
  // material) PLUS a coefficient of restitution (cor) for bounce physics.
  //
  // COR = coefficient of restitution. After a bounce, |v_after| = e·|v_before|
  // along the surface normal, so kinetic energy after = e² × KE before. A
  // perfectly elastic ball (no energy loss) has e = 1; a dead ball, e = 0.
  // Values calibrated against published drop-height standards: a basketball
  // dropped from 6 ft (1.8 m) onto hardwood must rebound 49-54 in (1.24-1.37 m)
  // per NBA spec, giving e ≈ 0.83-0.87. Our 0.78 averages bounce off other
  // surfaces (court vs gym floor vs concrete).
  //
  // Cd values are approximate flight averages; real Cd varies with Reynolds
  // number + spin. Cm scaler tunes Magnus lift response — calibrated so
  // default pitches produce visually-recognizable break (curveball drops
  // ~12 inches more than fastball over 60.5 ft).
  var BALLS = {
    baseball: {
      label: 'Baseball', mass: 0.145, radius: 0.0366,
      cd: 0.35, cm: 0.95, cor: 0.55,
      color: '#fafafa', seamColor: '#dc2626',
      icon: '⚾',
      // Regulation specs — MLB (Rule 3.01) + 2021 ball spec
      regs: {
        league: 'MLB Rule 3.01',
        massSpec: '0.142–0.149 kg (5–5¼ oz)',
        diameterSpec: '0.073–0.075 m (9–9¼ in circumference)',
        pressureSpec: 'N/A (solid, not pressurized)',
        material: 'Cork-and-rubber core, wool yarn windings, cowhide cover with 108 raised red stitches',
        physics: 'Mass + tight stitching keep Cd predictable. The seams trip airflow into a turbulent boundary layer, which is what lets a 4-seam fastball generate ~9 N of upward Magnus force at 95 mph.'
      }
    },
    basketball: {
      label: 'Basketball', mass: 0.624, radius: 0.119,
      cd: 0.50, cm: 0.40, cor: 0.78,
      color: '#f97316', seamColor: '#1a1a1a',
      icon: '🏀',
      // NBA Rule 1, official ball spec
      regs: {
        league: 'NBA Rule 1',
        massSpec: '0.567–0.624 kg (20–22 oz)',
        diameterSpec: '0.239–0.243 m (29.5 in circumference, men\'s)',
        pressureSpec: '7.5–8.5 PSI (51–58 kPa)',
        material: 'Composite leather (since 2009 — earlier full-grain leather), 8 panels with channel seams. Pebbled grip surface for friction',
        physics: 'PSI is everything: under-inflate by 1 PSI and the ball "thuds" instead of bouncing because COR drops ~10%. The pebbled surface gives the friction needed to put backspin on a free throw.'
      }
    },
    soccer: {
      label: 'Soccer Ball', mass: 0.430, radius: 0.110,
      cd: 0.22, cm: 1.20, cor: 0.80,
      color: '#fafafa', seamColor: '#1a1a1a',
      icon: '⚽',
      regs: {
        league: 'FIFA Quality / Law 2',
        massSpec: '0.410–0.450 kg (14–16 oz) at start of match',
        diameterSpec: '0.218–0.222 m (68–70 cm circumference, size 5)',
        pressureSpec: '0.6–1.1 atm (8.5–15.6 PSI)',
        material: 'Synthetic-leather (TPU / PU) panels — modern balls use 6 (Adidas Telstar) or 32 hexagons/pentagons. Inner latex bladder',
        physics: 'Smooth synthetic surface (vs old leather) makes the ball less stable in flight at high speed — that\'s why the modern "knuckleball" works: no spin → seam-induced drag asymmetry sends the ball wobbling unpredictably.'
      }
    },
    football: {
      label: 'Football', mass: 0.410, radius: 0.110,
      cd: 0.20, cm: 0.10, cor: 0.62,
      color: '#7c2d12', seamColor: '#fafafa',
      icon: '🏈',
      regs: {
        league: 'NFL Rule 2',
        massSpec: '0.397–0.425 kg (14–15 oz)',
        diameterSpec: '~0.171 m short axis × 0.279 m long axis (prolate spheroid; we sphere-approximate for trajectory)',
        pressureSpec: '12.5–13.5 PSI (86–93 kPa)',
        material: 'Pebbled cowhide leather (Wilson "Duke" — same maker since 1941), four-panel design with hand-stitched lacing',
        physics: 'A tight spiral spins ALONG the axis of motion, so ω×v ≈ 0 — Magnus barely contributes (Cm ≈ 0.10). That\'s why footballs travel mostly gravity + drag dominant. "Deflategate" allegedly used 11.5 PSI; a softer ball is easier to grip but bounces less predictably.'
      }
    },
    cricket: {
      label: 'Cricket Ball', mass: 0.160, radius: 0.0364,
      cd: 0.42, cm: 0.55, cor: 0.45,
      color: '#7f1d1d', seamColor: '#fafafa',
      icon: '🏏',
      regs: {
        league: 'ICC Law 4 (test cricket)',
        massSpec: '0.156–0.163 kg (5.5–5.75 oz)',
        diameterSpec: '0.071–0.073 m (8.81–9.0 in circumference)',
        pressureSpec: 'N/A (solid)',
        material: 'Cork core, twine winding, leather cover with a single raised seam (~6 stitches per inch). The seam is THE pitch-deviation engine — not the cover.',
        physics: 'Heavier than a baseball + a single proud seam = bigger swing. Tilt the seam 30° toward fine leg and you get ~30 cm of out-swing over 18 m. The leather hardens with age, COR drops, and reverse swing kicks in (~50 overs old).'
      }
    },
    golf: {
      label: 'Golf Ball', mass: 0.0459, radius: 0.0214,
      cd: 0.24, cm: 0.30, cor: 0.78,
      color: '#fafafa', seamColor: '#cbd5e1',
      icon: '⛳',
      regs: {
        league: 'USGA / R&A Rule 5',
        massSpec: '≤ 0.0459 kg (1.62 oz max)',
        diameterSpec: '≥ 0.04267 m (1.68 in min)',
        pressureSpec: 'N/A (solid multi-layer core)',
        material: '3- or 4-piece construction: rubber inner core, mantle layer, ionomer or urethane cover. ~336–392 dimples in symmetrical pattern.',
        physics: 'Dimples are the genius. They TRIP airflow into a turbulent boundary layer that hugs the ball longer before separating — a smooth ball would only fly half as far. Backspin (~2500–9500 rpm) generates Magnus lift that DOUBLES the airtime relative to no-spin, the entire reason golf clubs are built with loft.'
      }
    },
    volleyball: {
      label: 'Volleyball', mass: 0.270, radius: 0.105,
      cd: 0.30, cm: 0.50, cor: 0.65,
      color: '#fafafa', seamColor: '#1e3a8a',
      icon: '🏐',
      regs: {
        league: 'FIVB Rule 3',
        massSpec: '0.260–0.280 kg (9.2–9.9 oz)',
        diameterSpec: '0.205–0.210 m (65–67 cm circumference)',
        pressureSpec: '0.30–0.325 atm (4.3–4.6 PSI)',
        material: 'Synthetic leather (formerly cowhide), 18 panels glued to a butyl bladder. Modern Mikasa V200W uses an 8-panel "wave" design adopted in 2008.',
        physics: 'Light + low drag = strong spin-axis effect. A no-spin "float serve" wobbles like a knuckleball; a top-spin jump serve dives sharply past the net. The seam pattern matters more than any other ball in the lab — the wave-design panels reduce drag asymmetry, killing the float effect for advanced servers.'
      }
    }
  };

  // Pitch type presets — speed mph, spin rate rpm, spin axis (degrees relative to backspin)
  // axis 0° = pure backspin (4-seam fastball); axis 90° = pure sidespin (slider);
  // axis 180° = pure topspin (curveball drops faster). Spin axis is what the
  // student tweaks via grip preset; the underlying physics treats it as a unit
  // vector in 3D world space.
  var PITCH_TYPES = [
    { id: '4seam', label: '4-Seam Fastball', icon: '🚀',
      speedMph: 92, spinRpm: 2300, spinAxisDeg: 0,
      grip: 'Across the horseshoe, two fingers on the seams',
      teach: 'Pure backspin → maximum lift. Fastest, straightest pitch. Magnus lift fights gravity ~10% so it "rises" relative to a no-spin trajectory.' },
    { id: '2seam', label: '2-Seam Fastball', icon: '🎯',
      speedMph: 90, spinRpm: 2150, spinAxisDeg: 25,
      grip: 'Along the seams where they come closest',
      teach: 'Tilted backspin → small lateral run (3-6 inches) toward the throwing arm side. Slightly slower than 4-seam.' },
    { id: 'curve', label: 'Curveball (12-6)', icon: '🌀',
      speedMph: 78, spinRpm: 2600, spinAxisDeg: 180,
      grip: 'Middle finger along the seam, snap downward',
      teach: 'Pure topspin → Magnus pushes the ball DOWN. Curveballs drop ~12 inches more than a fastball over 60.5 ft.' },
    { id: 'slider', label: 'Slider', icon: '↔️',
      speedMph: 84, spinRpm: 2400, spinAxisDeg: 90,
      grip: 'Off-center, fingers along the side seam',
      teach: 'Pure sidespin → lateral break (~6 inches), little vertical drop. The "bullet spin" pitch.' },
    { id: 'knuckle', label: 'Knuckleball', icon: '🦋',
      speedMph: 65, spinRpm: 100, spinAxisDeg: 0,
      grip: 'Knuckles on the ball, no wrist snap',
      teach: 'Almost no spin → unpredictable wobble from seam-induced drag asymmetry. Slow but un-hittable when it works.' },
    { id: 'changeup', label: 'Change-Up', icon: '🐢',
      speedMph: 80, spinRpm: 1800, spinAxisDeg: 15,
      grip: 'Circle change — ball deeper in the palm',
      teach: 'Looks like a fastball at release but ~12 mph slower. Hitter\'s timing is wrecked.' }
  ];

  // Basketball shot presets — speed mph, release angle, release height, spin (almost always
  // backspin for basketball; spin axis stays at 0°). The teaching surface here is RELEASE
  // ANGLE + RELEASE HEIGHT, not pitch type — that's the whole free-throw lesson.
  var SHOT_TYPES = [
    { id: 'freethrow', label: 'Free Throw', icon: '🆓',
      speedMph: 16, spinRpm: 180, spinAxisDeg: 0, aimDegV: 52, releaseHeight: 2.2,
      grip: 'Square stance, ball balanced on shooting hand fingertips',
      teach: 'Standard free-throw form: high arc (~52°), backspin to "soften" the ball if it hits the rim. The taller you are, the flatter you can shoot — Shaq vs Steph.' },
    { id: 'jumper', label: 'Jump Shot', icon: '🦘',
      speedMph: 18, spinRpm: 200, spinAxisDeg: 0, aimDegV: 48, releaseHeight: 2.6,
      grip: 'Released at the top of the jump for higher release point',
      teach: 'Jumping raises your release point ~0.4m. Same arc but harder to defend — defender\'s arms can\'t reach the higher release.' },
    { id: 'hook', label: 'Hook Shot', icon: '🪝',
      speedMph: 17, spinRpm: 150, spinAxisDeg: 30, aimDegV: 55, releaseHeight: 2.8,
      grip: 'One-handed sweep across the body, very high release',
      teach: 'Shaq, Kareem, Jokic. The release point is so high (~2.8m) that defenders can\'t block it; tradeoff is some lateral spin so accuracy is harder.' },
    { id: 'bank', label: 'Bank Shot', icon: '🪞',
      speedMph: 19, spinRpm: 220, spinAxisDeg: 0, aimDegV: 45, releaseHeight: 2.3,
      grip: 'Aim for the upper square painted on the backboard',
      teach: 'Off the backboard. Lower arc + harder shot, but the backboard absorbs error — geometry forgives a wider release angle than a swish would.' },
    { id: 'three', label: '3-Pointer', icon: '🎯',
      speedMph: 21, spinRpm: 220, spinAxisDeg: 0, aimDegV: 49, releaseHeight: 2.5,
      grip: 'Same form as a free throw but with more leg drive',
      teach: '3-point line is 6.75m (NBA). Speed scales linearly with distance; arc stays similar (~49°) so the ball still drops "in" rather than skips off the back of the rim.' },
    { id: 'floater', label: 'Floater / Teardrop', icon: '☔',
      speedMph: 14, spinRpm: 280, spinAxisDeg: 0, aimDegV: 62, releaseHeight: 2.4,
      grip: 'One-handed soft touch, fingers flick UP and forward',
      teach: 'Tony Parker / Trae Young finishing move. Ultra-high arc (~62°) over a contesting big man. Released early in the jump (lower than a true jumper) but with extreme arc to clear the defender. Math: a 62° release at slow speed gives the ball ~1.5 s of hangtime — defender\'s hand is already coming down by the time the ball drops.' },
    { id: 'stepback', label: 'Step-Back Jumper', icon: '⬅️',
      speedMph: 19, spinRpm: 230, spinAxisDeg: 0, aimDegV: 50, releaseHeight: 2.5,
      grip: 'Plant inside foot, push off + away; release slightly behind base',
      teach: 'James Harden / Luka Dončić signature move. Step backward 0.5-1.0 m to create separation. The ball still has to reach the rim — ~1 m extra distance means slightly more speed (+1-2 mph). Ideal arc stays ~50°; release height drops slightly because of backward momentum.' },
    { id: 'halfcourt', label: 'Half-Court Heave', icon: '🌠',
      speedMph: 30, spinRpm: 100, spinAxisDeg: 0, aimDegV: 47, releaseHeight: 2.4,
      grip: 'Two-handed overhead toss — chuck it like a soccer throw-in',
      teach: 'End-of-quarter buzzer-beater from ~14 m (47 ft). Speed needs to almost double from a 3-pointer (21 → 30 mph). NBA conversion rate ~3% — Stephen Curry hits ~7%. The math: at 47°, the ball spends ~1.7 s in the air — keeper distance + reaction time = no defense, only physics decides.' },
    // PASS variants — use COR physics, target a teammate at chest height ~6 m away.
    // kind: 'pass' switches the scene + classifier (passing court vs hoop).
    { id: 'bouncepass', kind: 'pass', label: 'Bounce Pass', icon: '↘️',
      speedMph: 14, spinRpm: 60, spinAxisDeg: 0, aimDegV: -15, releaseHeight: 1.2,
      grip: 'Two-handed chest position, push down and forward',
      teach: 'Aim for ~⅔ of the distance to the teammate. The ball bounces once with COR ≈ 0.78, losing ~22% of vertical speed but staying chest-height on arrival. Hard to deflect because the ball is below the defender\'s reach.' },
    { id: 'chestpass', kind: 'pass', label: 'Chest Pass', icon: '➡️',
      speedMph: 17, spinRpm: 50, spinAxisDeg: 0, aimDegV: 0, releaseHeight: 1.4,
      grip: 'Two-handed chest position, snap wrists forward',
      teach: 'Direct flat pass at chest height. Faster than a bounce pass (no time lost to bouncing) but easier to intercept — defender just needs hands up. Backspin keeps the ball from sailing.' }
  ];

  // Soccer free-kick presets — the headline lesson is SPIN AXIS:
  //   90° ≈ pure sidespin (curling shot, ball bends around the wall)
  //    0° ≈ backspin (lifts a low chip)
  //   ~30° wobble = knuckle (Cristiano Ronaldo, near-zero spin)
  // Curve magnitude over a 22m kick is ~1-1.5m for ~600 rpm of sidespin —
  // recognizably "Beckham" without being a cartoon.
  var KICK_TYPES = [
    { id: 'curling', label: 'Curling Shot', icon: '🌀',
      speedMph: 60, spinRpm: 600, spinAxisDeg: 105, aimDegV: 12, releaseHeight: 0.11,
      grip: 'Strike with the inside of the foot, follow through across the body',
      teach: 'Bend it like Beckham: ~600 rpm of sidespin curls the ball around the wall. Magnus pushes the ball ~1-1.5 m laterally over a 22m kick. More spin = more curl, but harder to control.' },
    { id: 'knuckle', label: 'Knuckle Shot', icon: '🦋',
      speedMph: 70, spinRpm: 30, spinAxisDeg: 0, aimDegV: 8, releaseHeight: 0.11,
      grip: 'Strike dead-center with the laces, no follow-through',
      teach: 'Cristiano Ronaldo\'s shot. Almost no spin → seam-induced drag asymmetry makes the ball wobble unpredictably mid-flight. Hard to hit, harder to defend.' },
    { id: 'power', label: 'Power Drive', icon: '💥',
      speedMph: 78, spinRpm: 200, spinAxisDeg: 0, aimDegV: 5, releaseHeight: 0.11,
      grip: 'Full-foot strike, low backswing, ankle locked',
      teach: 'Pure speed (~78 mph). Low arc — ball rockets straight at goal. No curve, but the keeper has only ~0.5 s to react.' },
    { id: 'chip', label: 'Chip / Lob', icon: '🥄',
      speedMph: 35, spinRpm: 400, spinAxisDeg: 0, aimDegV: 35, releaseHeight: 0.11,
      grip: 'Underneath the ball with the toe, short backswing',
      teach: 'High arc (~35°) over the wall. Backspin keeps the ball in the air longer, makes it drop late. Used when the keeper is off the line.' }
  ];

  // ── Cricket bowling presets ──
  // Cricket bowling is the SECOND ball-bouncing sport in ThrowLab (after the
  // basketball bounce-pass). Distance is 20.12 m (22 yards crease-to-crease;
  // stumps live at the batter's end). The ball is heavier than a baseball
  // (~0.16 kg) and is delivered with a STRAIGHT ARM — by rule, no elbow
  // flexion > 15° — which limits speed to ~95 mph for the fastest bowlers.
  //
  // The headline cricket lesson: ball BOUNCES off the pitch ~3-5 m before
  // the batter ("good length"), which means the trajectory you see at
  // release is NOT the trajectory the batter sees. Spin axis controls
  // post-bounce deviation — off-spin and leg-spin turn the ball laterally
  // off the surface, which is the entire point of slow bowling.
  //
  // Modeling note: simulatePitch does not currently bounce the ball off the
  // pitch. We accept this for MVP — students see the in-flight trajectory,
  // and the teach blurbs describe what would happen post-bounce. The
  // outcome classifier targets the stumps directly.
  var CRICKET_DELIVERIES = [
    { id: 'fast', label: 'Fast (Pace Bowling)', icon: '🚀',
      speedMph: 90, spinRpm: 1200, spinAxisDeg: 0, aimDegV: -2, releaseHeight: 2.3,
      grip: 'Two fingers along the seam, wrist behind the ball',
      teach: 'Express pace: 85-95 mph (~150 km/h). Backspin keeps the ball low after bouncing — skids onto the batter rather than rising. The fastest delivery, with the least lateral deviation. Maximum-pressure ball.' },
    { id: 'outswing', label: 'Out-Swinger', icon: '↗️',
      speedMph: 82, spinRpm: 1400, spinAxisDeg: 60, aimDegV: -1, releaseHeight: 2.3,
      grip: 'Seam tilted toward fine leg (away from the batter)',
      teach: 'Curves AWAY from a right-handed batter mid-flight. The angled seam creates aerodynamic asymmetry — pressure differential pushes the ball off-side ~25-40 cm over 18 m. Edge-to-slip dismissal is the classic out-swinger wicket.' },
    { id: 'inswing', label: 'In-Swinger', icon: '↙️',
      speedMph: 82, spinRpm: 1400, spinAxisDeg: -60, aimDegV: -1, releaseHeight: 2.3,
      grip: 'Seam tilted toward leg slip (into the batter)',
      teach: 'Curves INTO a right-handed batter. The bowler aims wide of off-stump and the swing brings it back onto middle. Classic LBW or bowled dismissal — the batter plays for one line, the ball ends up on another.' },
    { id: 'offspin', label: 'Off-Spin', icon: '🌀',
      speedMph: 55, spinRpm: 2400, spinAxisDeg: 90, aimDegV: 4, releaseHeight: 2.4,
      grip: 'Index finger pulls down on the seam; ball spins clockwise (RHB view)',
      teach: 'Slow finger-spinner. Pitches in front and turns from off side toward leg side after bounce — 30 mph slower than pace, but the post-bounce break (~30-50 cm) is what beats the bat. Saqlain Mushtaq, R Ashwin specialty.' },
    { id: 'legspin', label: 'Leg-Spin', icon: '🌪️',
      speedMph: 50, spinRpm: 2500, spinAxisDeg: -90, aimDegV: 5, releaseHeight: 2.4,
      grip: 'Wrist flicked outward; ball spins counter-clockwise',
      teach: 'Shane Warne territory. Ball turns from leg side to off side after pitching — biggest break in the game (~40-60 cm). Hard to bowl accurately, devastating when controlled. The "googly" is its wrong\'un — same action, opposite spin.' },
    { id: 'bouncer', label: 'Bouncer (Short)', icon: '⬆️',
      speedMph: 88, spinRpm: 1100, spinAxisDeg: 0, aimDegV: 1, releaseHeight: 2.3,
      grip: 'Pitch HALF-WAY down the wicket; ball rises to chest/head height',
      teach: 'Intentional short delivery — pitches ~10 m from bowler instead of ~17 m, rising sharply at the batter (like a basketball bounce that springs to chest height). Used to intimidate. Limited to 2 per over in test cricket.' }
  ];

  // Score classifier for cricket bowling. Walks samples for the first crossing
  // of z = stumpsZ (the batter's end). If the ball passes through the stumps
  // box (|x| ≤ stumpsHalfWidth, 0 < y ≤ stumpsHeight) at that crossing → wicket.
  // Wide line is at |x| ≈ 0.46 m (set by ICC standard). Above the head height
  // (y > 1.8) → over the bails (likely a no-ball-bouncer). y ≤ 0 before
  // reaching the stumps → short of the wicket / unplayable bouncer fail.
  function classifyBowlResult(samples, mm) {
    if (!samples || samples.length < 2) return 'short';
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      // Short bounce that doesn't reach the batter
      if (cur.y <= 0 && cur.z < mm.targetZ) {
        // For the bouncer preset, a low-z bounce is the WHOLE POINT — but only
        // if the ball still travels forward. We treat it as a wide if it falls
        // way short, otherwise classify at the stumps crossing below.
        if (cur.z < mm.targetZ * 0.7) return 'short';
      }
      // Stumps crossing
      if (prev.z < mm.targetZ && cur.z >= mm.targetZ) {
        var f = (mm.targetZ - prev.z) / (cur.z - prev.z);
        var sx = prev.x + (cur.x - prev.x) * f;
        var sy = prev.y + (cur.y - prev.y) * f;
        // Way above the bails — head-height bouncer (ICC penalty in test)
        if (sy > 1.8) return 'overhead';
        // Hits the stumps
        if (Math.abs(sx) <= mm.stumpsHalfWidth && sy > 0 && sy <= mm.stumpsHeight) return 'wicket';
        // Just clipping the stumps line (bail-shave — count as wicket with bail-trembler footnote)
        if (Math.abs(sx) <= mm.stumpsHalfWidth + 0.04 && sy > 0 && sy <= mm.stumpsHeight + 0.04) return 'shaved';
        // Outside the wide line
        if (Math.abs(sx) > mm.wideHalfWidth) return 'wide';
        // Inside wide line but missing stumps — that's a "playable" delivery
        // the batter would normally defend or score off. Outcome: dot ball.
        return 'dot';
      }
    }
    return 'short';
  }

  // ── Golf tee-shot presets ──
  // Golf is the LONGEST-distance sport in ThrowLab — driver shots travel
  // ~228 m (250 yd) of carry, 50% farther than the next-longest event
  // (Hail Mary FG at ~55 m). The headline golf lesson is the LOFT-DISTANCE
  // tradeoff: low-loft clubs (driver, 12°) carry the farthest but offer no
  // help when the lie is bad; high-loft clubs (sand wedge, 56°) only carry
  // ~75 m but rise sharply, drop steeply, and stop near the landing point.
  //
  // Spin matters too: backspin on a wedge (~9000 rpm) is what makes a ball
  // "check up" on the green — the Magnus lift slows the descent so the ball
  // lands soft. Drivers spin much less (~2500 rpm) so they roll out for ~30
  // yards extra distance.
  //
  // Modeling note: ThrowLab's simulator does not model post-landing roll.
  // We classify total carry only — students see WHERE the ball lands,
  // teach blurbs explain that real golf adds 10-30 yards of roll on a
  // driver vs ~0 yards on a wedge. Targets are fairway / green zones at
  // varying distances per club.
  var GOLF_TYPES = [
    { id: 'driver', label: 'Driver (1W)', icon: '🚀',
      speedMph: 165, spinRpm: 2500, spinAxisDeg: 0, aimDegV: 12, releaseHeight: 0.04,
      carryYd: 250,
      grip: 'Tee height ~3 cm; ball off the inside of front foot; full shoulder turn',
      teach: 'Longest club, lowest loft (~10°). Ball speed ~165 mph at impact (smash factor 1.49 × clubhead 110 mph). Carries ~250 yd, rolls another 20-30 on a hard fairway. The lesson: low loft + low spin = max distance; tradeoff is no margin if the lie is bad.' },
    { id: 'fairway', label: '5-Wood', icon: '🌲',
      speedMph: 145, spinRpm: 3500, spinAxisDeg: 0, aimDegV: 16, releaseHeight: 0.0,
      carryYd: 210,
      grip: 'Ball middle-of-stance; sweep through, no divot',
      teach: 'Lower distance than driver but easier to hit off the fairway. ~210 yd carry. Higher loft (~17°) means a steeper descent — the ball "stops" sooner with less rollout. Use when you need accuracy over distance.' },
    { id: 'iron', label: '7-Iron', icon: '⛳',
      speedMph: 120, spinRpm: 6500, spinAxisDeg: 0, aimDegV: 25, releaseHeight: 0.0,
      carryYd: 150,
      grip: 'Ball center-of-stance; descending strike, take a divot AFTER the ball',
      teach: 'Mid-iron, the workhorse. ~150 yd carry. Loft ~33°. Higher spin (~6500 rpm) pulls the ball UP in flight (Magnus lift), making the apex ~25 m. Lands soft on the green — perfect approach club from 150 yards.' },
    { id: 'wedge', label: 'Sand Wedge (60°)', icon: '🏖️',
      speedMph: 95, spinRpm: 9500, spinAxisDeg: 0, aimDegV: 50, releaseHeight: 0.0,
      carryYd: 85,
      grip: 'Open the clubface; ball forward; cut across the ball for extra spin',
      teach: 'Highest-loft full-swing club (~56-60°). ~85 yd carry but the ball stops within 1-2 yards of landing — that\'s the 9500 rpm of backspin "checking" the ball. Used for greenside shots and short approaches. Great for trouble.' }
  ];

  // Score classifier for golf. Each preset has a target distance (carryYd).
  // The "fairway" zone is ±15 yd of target distance. The "green" zone is
  // ±5 yd of target. Way long → in the woods (or trouble); way short →
  // chunked / topped. Lateral spread matters too — a slice/hook misses
  // the fairway sideways.
  function classifyGolfResult(samples, targetYd, lateralTol) {
    if (!samples || samples.length < 2) return 'topped';
    // Find landing point (first sample where y <= 0 with z > 5)
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      if (cur.y <= 0 && cur.z > 5) {
        // Interpolate exact landing
        var f = (cur.y === prev.y) ? 0 : prev.y / (prev.y - cur.y);
        var lz = prev.z + (cur.z - prev.z) * f;
        var lx = prev.x + (cur.x - prev.x) * f;
        var landYd = lz / 0.9144;
        var lateralYd = Math.abs(lx) / 0.9144;
        var distOff = Math.abs(landYd - targetYd);
        // Way off line → in the woods regardless of distance
        if (lateralYd > lateralTol * 2.5) return 'woods';
        if (lateralYd > lateralTol * 1.5) return 'rough';
        // On-line: classify by distance
        if (distOff <= 5) return 'green';      // pin-high or close
        if (distOff <= 15) return 'fairway';   // good shot, just past pin
        if (landYd < targetYd - 25) return 'short';
        if (landYd > targetYd + 25) return 'long';
        return 'rough';
      }
    }
    return 'topped';  // never reached the ground = ball never hit / driver swing whiff
  }

  // ── Volleyball serve presets ──
  // Volleyball is the SHORTEST-distance major sport in ThrowLab — server's
  // line is 9 m from the net, target court is the back 9 m beyond. The
  // headline lesson is SPIN AXIS: a no-spin float serve wobbles like a
  // soccer knuckleball, while top-spin jump serves dive sharply past the
  // net. Server stands at z=0, net stretches across z=9 m at 2.43 m height
  // (men's), target court is z=9 m to z=18 m, court width ±4.5 m.
  //
  // Spin axis convention here:
  //   0° = topspin (drops the ball — what you want past the net)
  // 180° = backspin (lifts; rarely used in serves)
  //  ~0 rpm + 0° = "float" (no-spin wobble — most common at all levels)
  //
  // Modeling note: simulatePitch handles 3D drag + Magnus correctly for
  // these speeds. We don't model the receiving team's pass — the outcome
  // classifies at the LANDING POINT (where the ball first hits y=0
  // beyond the net).
  var VOLLEYBALL_TYPES = [
    { id: 'float', label: 'Float Serve', icon: '🦋',
      speedMph: 50, spinRpm: 30, spinAxisDeg: 0, aimDegV: 8, releaseHeight: 2.0,
      grip: 'Stiff wrist, contact dead-center of the ball, NO follow-through',
      teach: 'No spin = unpredictable wobble from seam-induced drag asymmetry. The same physics as a soccer knuckleball or baseball knuckler. Lower speed than a jump serve but harder to pass — passers can\'t predict where the ball will be. Most common serve at every level (rec → Olympic).' },
    { id: 'jump', label: 'Jump Serve', icon: '🚀',
      speedMph: 70, spinRpm: 1500, spinAxisDeg: 0, aimDegV: 4, releaseHeight: 3.0,
      grip: 'Toss high in front, attack-jump approach, snap-wrist top-spin contact',
      teach: 'Highest-skill serve. Toss the ball ~3 m high in front of you, run a 3-step approach, jump to ~3.0 m release height, contact with topspin. The Magnus lift pushes the ball DOWN, so it can clear the net at speed and still land in. Top servers (Wilfredo Leon ~80+ mph) make this almost unplayable.' },
    { id: 'topspin', label: 'Top-Spin Serve', icon: '🌀',
      speedMph: 55, spinRpm: 1000, spinAxisDeg: 0, aimDegV: 12, releaseHeight: 2.4,
      grip: 'Toss above hitting shoulder, brush UP and OVER the ball at contact',
      teach: 'Topspin without the jump — middle-school + JV staple. ~1000 rpm of topspin makes the ball drop ~1 m faster than a no-spin equivalent over 18 m. Clears the net with margin, still lands deep. Easier to control than a jump serve, harder to ace.' },
    { id: 'underhand', label: 'Underhand Serve', icon: '🤲',
      speedMph: 35, spinRpm: 80, spinAxisDeg: 180, aimDegV: 25, releaseHeight: 1.0,
      grip: 'Stable platform with non-dominant hand, swing dominant hand from below the waist',
      teach: 'Beginner serve. High arc (~25° launch), slow speed, gentle backspin. Easy to land in (high arc clears the net), but easy to pass — a passer has 1+ second of reaction time. Great for skill-building before progressing to overhand.' }
  ];

  // Score classifier for volleyball serves. Walks samples; first checks
  // for a NET hit (z crossing the net plane below net height), then for
  // a LANDING (y crossing 0 beyond the net). Returns:
  //   'net' — hit the net, didn't clear
  //   'short' — landed on server's side of the net (over-net unders)
  //   'long' — landed past the back line
  //   'out' — landed wide of the sideline
  //   'ace' — landed in the deep-corner zone (back 15% × outer 30%)
  //   'in' — clean serve, landed in the receiving court
  function classifyVolleyResult(samples, mm) {
    if (!samples || samples.length < 2) return 'short';
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      // Net intersection? (z crosses netZ plane below net height)
      if (prev.z < mm.netZ && cur.z >= mm.netZ) {
        var fn = (mm.netZ - prev.z) / (cur.z - prev.z);
        var nx = prev.x + (cur.x - prev.x) * fn;
        var ny = prev.y + (cur.y - prev.y) * fn;
        if (Math.abs(nx) <= mm.courtHalfWidth && ny > 0 && ny <= mm.netHeight) return 'net';
      }
      // Ball lands? (y crosses 0)
      if (prev.y > 0 && cur.y <= 0) {
        var fy = prev.y / (prev.y - cur.y);
        var lz = prev.z + (cur.z - prev.z) * fy;
        var lx = prev.x + (cur.x - prev.x) * fy;
        if (lz < mm.netZ) return 'short';
        if (lz > mm.targetZ) return 'long';
        if (Math.abs(lx) > mm.courtHalfWidth) return 'out';
        // Ace zone: back 15% of court × outer 30% of width
        if (lz > mm.targetZ - (mm.targetZ - mm.netZ) * 0.15
            && Math.abs(lx) > mm.courtHalfWidth * 0.70) return 'ace';
        return 'in';
      }
    }
    return 'short';
  }

  // Football field goal presets — distance + power tradeoff. The headline lesson
  // is the angle ↔ distance tradeoff: too flat and the ball crashes into the
  // crossbar; too steep and you lose distance to vertical wastage. Each preset
  // sets a target distance the player should TRY to clear by adjusting speed
  // and angle. Spin axis = 0 (no Magnus); spinRpm scales kick power slightly.
  // distanceYd is metadata used for UI label + scenario distance setup.
  var GOAL_TYPES = [
    { id: 'chipshot', label: 'Chip Shot (20 yd)', icon: '🥧',
      speedMph: 50, spinRpm: 0, spinAxisDeg: 0, aimDegV: 35, releaseHeight: 0.0,
      distanceYd: 20,
      grip: 'Hold the laces away, plant foot beside the ball',
      teach: 'Easy money. From 20 yards (~30 ft from crossbar) any pro kicker is automatic. The lesson: you don\'t need raw power — you need a clean strike + correct angle.' },
    { id: 'midrange', label: 'Mid-Range (35 yd)', icon: '🎯',
      speedMph: 60, spinRpm: 0, spinAxisDeg: 0, aimDegV: 38, releaseHeight: 0.0,
      distanceYd: 35,
      grip: 'Standard placement, full leg drive',
      teach: 'The sweet spot for most NFL kickers. ~38° launch angle is the optimal balance of distance and clearance — too flat hits the line; too steep wastes distance to vertical motion.' },
    { id: 'long', label: 'Long Field Goal (50 yd)', icon: '💪',
      speedMph: 70, spinRpm: 0, spinAxisDeg: 0, aimDegV: 40, releaseHeight: 0.0,
      distanceYd: 50,
      grip: 'Full backswing, dig the toe under the ball',
      teach: '50-yard FG is the modern NFL average. Speed scales linearly with distance, but ANGLE has a sweet spot near 40° — drag is enough that you can\'t just tilt up and add power.' },
    { id: 'hailmary', label: 'Hail Mary (60+ yd)', icon: '🌠',
      speedMph: 80, spinRpm: 0, spinAxisDeg: 0, aimDegV: 42, releaseHeight: 0.0,
      distanceYd: 60,
      grip: 'Maximum power; risk of pulling the kick',
      teach: 'Justin Tucker territory (longest NFL FG: 66 yards). At this distance every variable matters — wind, snap timing, the kicker\'s leg fatigue. Drag eats ~12% of horizontal range.' }
  ];

  // ── DRILLS — per-mode challenge sequences ──
  // Each drill has a list of "tasks" the player completes in order. Each
  // task carries a goal description, a success check (run after each throw),
  // and a reset condition (run only when the throw fails the constraint).
  // Drills give students a structured progression on top of the sandbox.
  //
  // Design rule: tasks check the LATEST throw against state-derived
  // condition. Streak tasks track count via a session counter that resets
  // on miss; "type-coverage" tasks track a Set of pitch IDs used.
  var DRILLS = {
    pitching: {
      label: 'Pitcher Drills',
      tasks: [
        { id: 'p1', goal: 'Throw 3 strikes in a row',
          test: function(s) { return s.streakStrikes >= 3; },
          progress: function(s) { return s.streakStrikes + ' / 3 strike streak'; },
          tip: 'Hint: lower release angle by ~1° if you keep going high.' },
        { id: 'p2', goal: 'Throw a 4-seam, a curveball, and a slider — each for a strike',
          test: function(s) { return s.strikeTypes['4seam'] && s.strikeTypes.curve && s.strikeTypes.slider; },
          progress: function(s) {
            var seen = ['4seam','curve','slider'].filter(function(id) { return s.strikeTypes[id]; });
            return seen.length + ' / 3 pitch types ✓ (need 4-seam, curve, slider)';
          },
          tip: 'Each pitch type sets its own grip + spin — let the preset do the work.' },
        { id: 'p3', goal: 'Strike with a knuckleball (spin under 200 rpm)',
          test: function(s) { return s.strikeWithLowSpin; },
          progress: function(s) { return s.strikeWithLowSpin ? 'Done!' : 'Need a strike with the knuckle preset'; },
          tip: 'Knucklers wobble — accept that "strike" might be lucky and keep throwing.' }
      ]
    },
    freethrow: {
      label: 'Basketball Drills',
      tasks: [
        { id: 'f1', goal: 'Make 5 free throws',
          test: function(s) { return s.makeCount >= 5; },
          progress: function(s) { return s.makeCount + ' / 5 makes'; },
          tip: 'Backspin softens rim contact — keep spin around 180-220 rpm.' },
        { id: 'f2', goal: 'Make a swish from 3 different release heights',
          test: function(s) { return s.swishHeights >= 3; },
          progress: function(s) { return s.swishHeights + ' / 3 different release heights'; },
          tip: 'Higher release = flatter arc; lower = steeper arc. Both can swish.' },
        { id: 'f3', goal: 'Complete a successful Bounce Pass',
          test: function(s) { return s.completedBouncePass; },
          progress: function(s) { return s.completedBouncePass ? 'Done!' : 'Pick Bounce Pass and aim for the yellow zone'; },
          tip: 'Aim ⅔ of the way to the teammate; the bounce eats ~22% of vertical speed.' },
        { id: 'f4', goal: 'Make a Floater (high-arc finish over a defender)',
          test: function(s) { return s.shotsMadeByType && s.shotsMadeByType.floater; },
          progress: function(s) { return (s.shotsMadeByType && s.shotsMadeByType.floater) ? 'Done!' : 'Pick the Floater preset and let the high arc do the work'; },
          tip: '~62° release angle = ~1.5s hangtime. The defender\'s hand is already coming down by the time the ball drops.' },
        { id: 'f5', goal: 'Make a Step-Back Jumper',
          test: function(s) { return s.shotsMadeByType && s.shotsMadeByType.stepback; },
          progress: function(s) { return (s.shotsMadeByType && s.shotsMadeByType.stepback) ? 'Done!' : 'Pick Step-Back Jumper — slightly more speed than a regular jumper to cover the extra distance'; },
          tip: 'Stepping back ~1m means +1-2 mph clubhead speed equivalent. Same ~50° arc.' },
        { id: 'f6', goal: 'Hit a Half-Court Heave (no rim contact required, just on-target)',
          test: function(s) { return s.shotsMadeByType && (s.shotsMadeByType.halfcourt || s.attemptedHalfCourt); },
          progress: function(s) { return (s.shotsMadeByType && (s.shotsMadeByType.halfcourt || s.attemptedHalfCourt)) ? 'Done!' : 'Pick Half-Court Heave; success = the ball reaches the backboard area'; },
          tip: 'NBA conversion is ~3% so this drill counts ANY shot that reaches the rim/backboard zone — the math is the lesson, not the make.' }
      ]
    },
    freekick: {
      label: 'Soccer Drills',
      tasks: [
        { id: 'k1', goal: 'Score a goal with a Curling Shot',
          test: function(s) { return s.goalKickTypes.curling; },
          progress: function(s) { return s.goalKickTypes.curling ? 'Done!' : 'Pick Curling Shot and bend it around the wall'; },
          tip: '~600 rpm of sidespin curls the ball ~1.5m laterally over 22m.' },
        { id: 'k2', goal: 'Score with a Power Drive (no curl)',
          test: function(s) { return s.goalKickTypes.power; },
          progress: function(s) { return s.goalKickTypes.power ? 'Done!' : 'Power Drive, then thread between defenders'; },
          tip: 'No spin = no curl, but the wall is just 9.15m away — go OVER or AROUND with a wide aim.' },
        { id: 'k3', goal: 'Score 3 goals total (any kick style)',
          test: function(s) { return s.totalGoals >= 3; },
          progress: function(s) { return s.totalGoals + ' / 3 goals'; },
          tip: 'Different styles for different defender configurations.' }
      ]
    },
    fieldgoal: {
      label: 'Kicker Drills',
      tasks: [
        { id: 'g1', goal: 'Make a 20-yard field goal',
          test: function(s) { return s.fgMadeByDist['20']; },
          progress: function(s) { return s.fgMadeByDist['20'] ? 'Done!' : 'Switch to Chip Shot preset'; },
          tip: 'Chip is automatic — don\'t overthink power.' },
        { id: 'g2', goal: 'Make a 35-yard field goal',
          test: function(s) { return s.fgMadeByDist['35']; },
          progress: function(s) { return s.fgMadeByDist['35'] ? 'Done!' : 'Mid-Range preset; 38° launch is the sweet spot'; },
          tip: 'Optimal angle near 38° at this range.' },
        { id: 'g3', goal: 'Make a 50-yard field goal',
          test: function(s) { return s.fgMadeByDist['50']; },
          progress: function(s) { return s.fgMadeByDist['50'] ? 'Done!' : 'Long preset; 40° launch'; },
          tip: 'Drag eats ~10% of horizontal range at this distance — bump speed.' }
      ]
    },
    golf: {
      label: 'Golf Drills',
      tasks: [
        { id: 'gf1', goal: 'Hit the green with a 7-Iron',
          test: function(s) { return s.golfClubsOnGreen && s.golfClubsOnGreen.iron; },
          progress: function(s) { return (s.golfClubsOnGreen && s.golfClubsOnGreen.iron) ? 'Done!' : 'Pick 7-Iron preset; aim ~25° launch'; },
          tip: 'Backspin pulls the ball up. Leave launch + spin near defaults; tweak speed for distance.' },
        { id: 'gf2', goal: 'Hit the green with a Sand Wedge',
          test: function(s) { return s.golfClubsOnGreen && s.golfClubsOnGreen.wedge; },
          progress: function(s) { return (s.golfClubsOnGreen && s.golfClubsOnGreen.wedge) ? 'Done!' : 'Sand Wedge; 50° launch, very high spin'; },
          tip: 'Wedge stops fast — 9500 rpm of backspin is the "check" effect.' },
        { id: 'gf3', goal: 'Stripe a Driver to the fairway 3 times',
          test: function(s) { return (s.golfFairwaysHit || 0) >= 3; },
          progress: function(s) { return (s.golfFairwaysHit || 0) + ' / 3 fairways'; },
          tip: 'Driver loves a positive attack angle. Keep launch ~12-15°, low spin (~2500 rpm).' }
      ]
    },
    bowling: {
      label: 'Cricket Drills',
      tasks: [
        { id: 'b1', goal: 'Hit the stumps with a Fast delivery',
          test: function(s) { return s.bowlTypes && s.bowlTypes.fast; },
          progress: function(s) { return (s.bowlTypes && s.bowlTypes.fast) ? 'Done!' : 'Pick Fast preset and aim middle-stump'; },
          tip: 'Backspin keeps the ball low after pitching — aim slightly below the bails.' },
        { id: 'b2', goal: 'Bowl a wicket with the In-Swinger',
          test: function(s) { return s.bowlTypes && s.bowlTypes.inswing; },
          progress: function(s) { return (s.bowlTypes && s.bowlTypes.inswing) ? 'Done!' : 'In-Swinger preset; aim wide of off-stump'; },
          tip: 'Start the line outside off-stump and let the swing bring it back onto middle.' },
        { id: 'b3', goal: 'Take 3 wickets total (any delivery)',
          test: function(s) { return s.totalWickets >= 3; },
          progress: function(s) { return (s.totalWickets || 0) + ' / 3 wickets'; },
          tip: 'Mix pace and spin — keep the batter guessing about line and length.' }
      ]
    },
    volleyball: {
      label: 'Volleyball Drills',
      tasks: [
        { id: 'v1', goal: 'Land 3 serves IN (any preset)',
          test: function(s) { return (s.volleyInCount || 0) >= 3; },
          progress: function(s) { return (s.volleyInCount || 0) + ' / 3 serves in'; },
          tip: 'Underhand is most forgiving for first attempts — high arc, low speed.' },
        { id: 'v2', goal: 'Land a Float Serve in the receiving court',
          test: function(s) { return s.volleyServesIn && s.volleyServesIn.float; },
          progress: function(s) { return (s.volleyServesIn && s.volleyServesIn.float) ? 'Done!' : 'Pick Float Serve and aim deep'; },
          tip: 'Float serves wobble unpredictably — accept that landing IN is partially luck.' },
        { id: 'v3', goal: 'Score an Ace (deep corner)',
          test: function(s) { return s.volleyAceCount >= 1; },
          progress: function(s) { return (s.volleyAceCount || 0) > 0 ? 'Done!' : 'Aim for the deep corner — back 15% × outer 30% of court'; },
          tip: 'Aces are deep + wide. Jump serves with topspin clear the net then dive into back corners.' }
      ]
    }
  };

  // Mode metadata — controls which target / preset list / distances apply.
  var MODES = {
    pitching: {
      label: "Pitcher's Mound", icon: '⚾', ball: 'baseball', presets: PITCH_TYPES,
      targetZ: 18.44, // 60 ft 6 in
      releaseStrideDefault: 1.5,
      releaseHeightRange: [1.4, 2.4],
      speedRange: [50, 105]
    },
    freethrow: {
      label: 'Free Throw', icon: '🏀', ball: 'basketball', presets: SHOT_TYPES,
      targetZ: 4.57, // 15 ft = NBA free throw line to backboard, rim ~ 4.34m
      rimY: 3.05, rimZ: 4.34, rimRadius: 0.23,
      releaseStrideDefault: 0.0,
      releaseHeightRange: [1.8, 3.0],
      speedRange: [10, 28]
    },
    freekick: {
      label: 'Free Kick', icon: '⚽', ball: 'soccer', presets: KICK_TYPES,
      targetZ: 22.0, // 22m typical free-kick distance (just outside the box)
      // Goal: 7.32m wide × 2.44m tall — FIFA spec
      goalHalfWidth: 3.66, goalHeight: 2.44,
      // Defender wall: 9.15m (10 yd) from ball, 4 silhouettes shoulder-to-shoulder
      wallZ: 9.15, wallHalfWidth: 1.0, wallHeight: 1.7,
      releaseStrideDefault: 0.0,
      releaseHeightRange: [0.11, 0.11], // ball sits on ground; not user-adjustable
      speedRange: [25, 90]
    },
    fieldgoal: {
      label: 'Field Goal', icon: '🏈', ball: 'football', presets: GOAL_TYPES,
      // Default mid-range. Actual goal-line distance comes from the active
      // preset's distanceYd (the side-view canvas + classifier read it from
      // d.fgDistanceYd, set by applyGoalPreset).
      targetZ: 35 * 0.9144, // 35 yd in m — overridden per preset
      goalHalfWidth: 5.64 / 2, // 18.5 ft (NFL pro hash) → 5.64m → ±2.82
      crossbarHeight: 3.05,    // 10 ft
      releaseStrideDefault: 0.0,
      releaseHeightRange: [0.0, 0.0],
      speedRange: [30, 95]
    },
    bowling: {
      label: "Bowler's Crease", icon: '🏏', ball: 'cricket', presets: CRICKET_DELIVERIES,
      // 22 yd between creases = 20.12 m. Bowler's pop crease is "0"; batter's
      // stumps live at the far end (z = 20.12). The actual delivery stride
      // means the ball is RELEASED from ~17.5 m, not 20.12 — but for the
      // canvas physics we keep the bowler at z=0 and target the stumps.
      targetZ: 20.12,
      // Stumps: 71.1 cm tall, 22.86 cm overall width (3 stumps spaced ~7.6cm)
      stumpsHeight: 0.711,
      stumpsHalfWidth: 0.1143,
      // Wide line per ICC (test cricket): 0.92m total (0.46 each side of middle stump)
      wideHalfWidth: 0.46,
      releaseStrideDefault: 1.2,
      releaseHeightRange: [1.8, 2.6],
      speedRange: [40, 100]
    },
    golf: {
      label: 'Golf Tee Shot', icon: '⛳', ball: 'golf', presets: GOLF_TYPES,
      // Target distance is preset-driven (driver carries 250 yd, sand wedge 85 yd).
      // Actual targetZ comes from the active preset's carryYd × 0.9144 m/yd.
      // Default to 7-iron 150 yd carry until preset applied.
      targetZ: 150 * 0.9144,
      // Lateral tolerance for a fairway hit (±15 yd from centerline = ±13.7 m).
      // Used by classifyGolfResult — anything outside is rough/woods.
      fairwayHalfYd: 15,
      releaseStrideDefault: 0.0,
      releaseHeightRange: [0.0, 0.05], // ball on ground, driver allows tiny tee
      speedRange: [50, 180]
    },
    volleyball: {
      label: "Server's Line", icon: '🏐', ball: 'volleyball', presets: VOLLEYBALL_TYPES,
      // FIVB Rule 1: court is 18m × 9m total (each side 9m × 9m).
      // Server stands behind end-line at z=0, net stretches across z=9m at
      // height 2.43m (men) / 2.24m (women) — we use men's height.
      targetZ: 18.0,            // far end-line (ball must land in [9, 18])
      netZ: 9.0,                // midcourt net plane
      netHeight: 2.43,          // men's net top (women's: 2.24)
      courtHalfWidth: 4.5,      // ±4.5 m from centerline = 9m wide
      releaseStrideDefault: 0.0,
      releaseHeightRange: [0.5, 3.2], // underhand low, jump-serve high
      speedRange: [25, 80]
    }
  };

  // Score classifier for field goal mode. Walks samples for the first crossing
  // of z = goalLineZ, then checks: ball must be UNDER the crossbar (y > 0) for
  // a missed/short FG, ABOVE the crossbar (y > crossbarHeight) AND between
  // posts (|x| ≤ goalHalfWidth) for a make. "Doink" if it kisses the post or
  // crossbar within a small tolerance.
  function classifyFieldGoalResult(samples, goalLineZ, crossbarHeight, goalHalfWidth) {
    if (!samples || samples.length < 2) return 'short';
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      // Short bounce before reaching goal line
      if (cur.y <= 0 && cur.z < goalLineZ) return 'short';
      // Goal-line crossing
      if (prev.z < goalLineZ && cur.z >= goalLineZ) {
        var f = (goalLineZ - prev.z) / (cur.z - prev.z);
        var gx = prev.x + (cur.x - prev.x) * f;
        var gy = prev.y + (cur.y - prev.y) * f;
        // Must clear the crossbar
        if (gy < crossbarHeight) {
          // Hit the bar?
          if (Math.abs(gy - crossbarHeight) < 0.30 && Math.abs(gx) < goalHalfWidth) return 'doink';
          return 'shortbar';
        }
        // Must be between the uprights
        if (Math.abs(gx) > goalHalfWidth) {
          // Just outside the post?
          if (Math.abs(gx) - goalHalfWidth < 0.30) return 'doink';
          return Math.abs(gx) > goalHalfWidth + 2 ? 'wide' : 'wideclose';
        }
        return 'good';
      }
    }
    return 'short';
  }

  // Score classifier for free kick mode. Walks samples for the first crossing
  // of z = goal-line plane (targetZ). If at that crossing the ball is inside
  // the goal mouth (|x| ≤ goalHalfWidth, 0 < y ≤ goalHeight) → goal. Otherwise
  // miss. Also detects wall-block (ball intersects wall plane below wallHeight
  // with |x| ≤ wallHalfWidth) and short-bounce (y ≤ 0 before reaching goal).
  function classifyKickResult(samples, mm) {
    if (!samples || samples.length < 2) return 'miss';
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      // Wall block? (z crosses wallZ before reaching goal)
      if (prev.z < mm.wallZ && cur.z >= mm.wallZ) {
        var fw = (mm.wallZ - prev.z) / (cur.z - prev.z);
        var wx = prev.x + (cur.x - prev.x) * fw;
        var wy = prev.y + (cur.y - prev.y) * fw;
        if (Math.abs(wx) <= mm.wallHalfWidth && wy > 0 && wy <= mm.wallHeight) return 'blocked';
        // Otherwise the ball cleared the wall — keep walking
      }
      // Short bounce?
      if (cur.y <= 0 && cur.z < mm.targetZ) return 'short';
      // Goal-line crossing?
      if (prev.z < mm.targetZ && cur.z >= mm.targetZ) {
        var fg = (mm.targetZ - prev.z) / (cur.z - prev.z);
        var gx = prev.x + (cur.x - prev.x) * fg;
        var gy = prev.y + (cur.y - prev.y) * fg;
        if (Math.abs(gx) <= mm.goalHalfWidth && gy > 0 && gy <= mm.goalHeight) return 'goal';
        if (Math.abs(gx) <= mm.goalHalfWidth + 0.5 && gy <= mm.goalHeight + 0.5) return 'post';
        if (gy > mm.goalHeight) return 'over';
        return 'wide';
      }
    }
    return 'short';
  }

  // Score classifier for basketball PASS shot types (bounce / chest).
  // Receiver is at z = receiverZ (~6 m), catching at chest height ~1.2 m.
  // Categories:
  //   'caught'        — arrived at receiver with y in chest band
  //   'highpass'      — arrived above the chest band (sailed)
  //   'lowpass'       — arrived below the chest band (worm-burner)
  //   'wide'          — lateral miss
  //   'short'         — never reached the receiver
  //   'wrongbounce'   — bounce pass with no bounces, OR chest pass that bounced
  function classifyPassResult(samples, kind, receiverZ) {
    if (!samples || samples.length < 2) return 'short';
    var bounceCount = 0;
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      // Count ground-level transitions as bounces (matches simulator's bounce reflection)
      if (prev.y > 0.05 && cur.y <= 0.05) bounceCount++;
      // Arrival at receiver plane
      if (prev.z < receiverZ && cur.z >= receiverZ) {
        var f = (receiverZ - prev.z) / (cur.z - prev.z);
        var rcvX = prev.x + (cur.x - prev.x) * f;
        var rcvY = prev.y + (cur.y - prev.y) * f;
        // Lateral first
        if (Math.abs(rcvX) > 0.45) return 'wide';
        // Bounce-mode requirements
        if (kind === 'bouncepass' && bounceCount < 1) return 'wrongbounce';
        if (kind === 'chestpass' && bounceCount > 0) return 'wrongbounce';
        // Chest band
        if (rcvY > 1.6) return 'highpass';
        if (rcvY < 0.6) return 'lowpass';
        return 'caught';
      }
    }
    // Never reached receiver
    return 'short';
  }

  // Score classifier for free throw mode: "swish" / "rim" / "backboard" / "miss".
  // We classify by walking the trajectory and looking for the first downward
  // crossing of rim height that lands within rim radius. Rim is centered at
  // (x=0, z=rimZ); ball must descend through it (vy < 0).
  function classifyShotResult(samples, rimY, rimZ, rimRadius) {
    if (!samples || samples.length < 2) return 'miss';
    for (var i = 1; i < samples.length; i++) {
      var prev = samples[i - 1], cur = samples[i];
      // Look for downward crossing of rim plane
      if (prev.y > rimY && cur.y <= rimY && cur.vy < 0) {
        // Lerp to exact crossing
        var f = (prev.y - rimY) / (prev.y - cur.y);
        var cx = prev.x + (cur.x - prev.x) * f;
        var cz = prev.z + (cur.z - prev.z) * f;
        var dx = cx - 0;
        var dz = cz - rimZ;
        var dist = Math.sqrt(dx * dx + dz * dz);
        if (dist <= rimRadius * 0.85) return 'swish';     // clean center
        if (dist <= rimRadius) return 'made';              // in but kissed rim
        if (dist <= rimRadius + 0.18) return 'rim';        // off the rim, may bounce in
        // Backboard plane is at z = rimZ + 0.10 (backboard sits behind rim)
        if (cz > rimZ + 0.10 && Math.abs(cx) < 0.9) return 'backboard';
        return 'miss';
      }
    }
    return 'air';
  }

  // Convert pitch axis (degrees) into a 3D angular velocity unit vector.
  // World coords: +X = toward right-handed batter (3rd-base side from mound),
  // +Y = up, +Z = toward catcher (mound to plate axis).
  // axis 0°   = backspin (ω points in +X for a RHP)
  // axis 180° = topspin (ω points in -X)
  // axis 90°  = sidespin (ω points in +Y for a slider that breaks toward 3B)
  function spinAxisVector(axisDeg, throwerHand) {
    var rad = axisDeg * Math.PI / 180;
    var sign = throwerHand === 'left' ? -1 : 1;
    // Lerp between backspin axis (1, 0, 0) and topspin (-1, 0, 0) through sidespin (0, 1, 0)
    var x = Math.cos(rad) * sign;
    var y = Math.sin(rad);
    return { x: x, y: y, z: 0 };
  }

  // Simulate pitch flight: from release point to plate.
  // Returns array of {t, x, y, z, vx, vy, vz} samples and outcome metadata.
  // Coordinate system:
  //   x: lateral (+ = catcher's right = batter's left = 1B-side from mound)
  //   y: vertical (+ = up; ground = 0)
  //   z: forward (+ = toward plate; release ~ 0, plate ~ 18.4 m for MLB)
  function simulatePitch(opts) {
    var ball = BALLS[opts.ball || 'baseball'];
    var v0Mph = opts.speedMph || 90;
    var v0 = v0Mph / MPH_PER_MPS; // m/s
    var releaseHeight = opts.releaseHeight !== undefined ? opts.releaseHeight : 1.85; // m (typical MLB ~6 ft)
    var releaseSide = opts.releaseSide !== undefined ? opts.releaseSide : 0.0; // m off centerline
    var releaseStride = opts.releaseStride !== undefined ? opts.releaseStride : 1.5; // m forward of mound rubber
    var aimDegV = opts.aimDegV !== undefined ? opts.aimDegV : -1.5; // small downward tilt
    var aimDegH = opts.aimDegH !== undefined ? opts.aimDegH : 0;
    var spinRpm = opts.spinRpm || 2300;
    var spinAxis = spinAxisVector(opts.spinAxisDeg || 0, opts.throwerHand || 'right');
    var omegaMag = spinRpm * 2 * Math.PI / 60; // rad/s
    var omega = { x: spinAxis.x * omegaMag, y: spinAxis.y * omegaMag, z: spinAxis.z * omegaMag };
    var area = Math.PI * ball.radius * ball.radius;
    var massInv = 1 / ball.mass;
    // Initial velocity vector (release direction)
    var radV = aimDegV * Math.PI / 180;
    var radH = aimDegH * Math.PI / 180;
    var vx = v0 * Math.sin(radH);
    var vy = v0 * Math.sin(radV);
    var vz = v0 * Math.cos(radV) * Math.cos(radH);
    var pos = { x: releaseSide, y: releaseHeight, z: releaseStride };
    var samples = [{ t: 0, x: pos.x, y: pos.y, z: pos.z, vx: vx, vy: vy, vz: vz }];
    var dt = 1 / 240; // small step for Magnus stability
    var t = 0;
    var maxT = opts.maxT !== undefined ? opts.maxT : 2.0;
    var plateZ = opts.targetZ !== undefined ? opts.targetZ : 18.44; // baseball plate default
    // Gravity (m/s²) — defaults to Earth. Overridable so the same pitch can
    // be replayed on Moon/Mars/Jupiter for the "what if" lesson.
    var gNow = opts.gravity !== undefined ? opts.gravity : G;
    // Wind vector in m/s (world frame). Headwind in -Z direction (0°),
    // tailwind +Z (180°), crosswinds ±X. Drag uses RELATIVE air-frame
    // velocity (ball minus wind), so a tailwind shrinks |v_rel| and reduces
    // drag (extends range); a crosswind pushes the ball laterally even
    // without spin.
    var windMph = opts.windMph || 0;
    var windDirDeg = opts.windDirDeg || 0;
    var windMps = windMph / MPH_PER_MPS;
    var windRad = windDirDeg * Math.PI / 180;
    var wVx = -Math.sin(windRad) * windMps; // 90° → -X is wrong, 90° = +X cross. Convention: 0°=headwind (-Z), 90°=crossX +X, 180°=tail +Z, 270°=crossX -X.
    var wVy = 0;
    var wVz = -Math.cos(windRad) * windMps;
    // Quick fix: standard convention 0°=headwind means wind blows toward the
    // pitcher (in -Z), so wind vector should be (0, 0, -|w|). Re-derive:
    // 0°=head: wind in -Z; 180°=tail: wind in +Z. So:
    wVx = Math.sin(windRad) * windMps;  // 90° → +X
    wVy = 0;
    wVz = -Math.cos(windRad) * windMps; // 0° → -Z (headwind), 180° → +Z (tailwind)
    var outcome = null;
    while (t < maxT) {
      // Relative-to-air velocity (used by drag + Magnus). Without wind this
      // collapses to ball velocity. With wind, |v_rel| > |v| if headwind,
      // |v_rel| < |v| if tailwind, and crosswind pushes the drag vector
      // sideways without spin.
      var rvx = vx - wVx;
      var rvy = vy - wVy;
      var rvz = vz - wVz;
      var spd = Math.sqrt(rvx * rvx + rvy * rvy + rvz * rvz);
      // Drag: F = -½ρ|v_rel|²·Cd·A · v_rel̂
      var dragMag = 0.5 * RHO * spd * spd * ball.cd * area;
      var dragFx = spd > 0 ? -dragMag * (rvx / spd) : 0;
      var dragFy = spd > 0 ? -dragMag * (rvy / spd) : 0;
      var dragFz = spd > 0 ? -dragMag * (rvz / spd) : 0;
      // Magnus: F = ½ρ|v_rel|²·Cm·A · (ω̂ × v_rel̂)
      // The ω × v̂ direction gives the lift sense; Cm scales magnitude.
      // Use relative-to-air velocity so wind shifts the Magnus direction
      // realistically (e.g., a tailwind reduces effective Magnus).
      var vhx = spd > 0 ? rvx / spd : 0;
      var vhy = spd > 0 ? rvy / spd : 0;
      var vhz = spd > 0 ? rvz / spd : 0;
      var crossX = omega.y * vhz - omega.z * vhy;
      var crossY = omega.z * vhx - omega.x * vhz;
      var crossZ = omega.x * vhy - omega.y * vhx;
      var magnusMag = 0.5 * RHO * spd * spd * ball.cm * area * 0.0001; // 0.0001 brings ω rad/s into a force-scaler range that matches real break
      var magFx = magnusMag * crossX;
      var magFy = magnusMag * crossY;
      var magFz = magnusMag * crossZ;
      // Total acceleration
      var ax = (dragFx + magFx) * massInv;
      var ay = (dragFy + magFy) * massInv - gNow;
      var az = (dragFz + magFz) * massInv;
      // Euler integrate
      vx += ax * dt; vy += ay * dt; vz += az * dt;
      pos.x += vx * dt; pos.y += vy * dt; pos.z += vz * dt;
      t += dt;
      // Sample every 10ms for trajectory rendering
      if (samples.length === 0 || t - samples[samples.length - 1].t > 0.01) {
        samples.push({ t: t, x: pos.x, y: pos.y, z: pos.z, vx: vx, vy: vy, vz: vz });
      }
      // Reached plate?
      // Record plate-plane crossing the FIRST time z reaches plateZ — but DON'T
      // truncate the simulation. Free Throw mode wants the trajectory to keep
      // arcing past the rim plane until it lands; pitching mode just uses the
      // recorded crossing for strike/ball classification.
      if (!outcome && pos.z >= plateZ) {
        var prev = samples[samples.length - 2] || samples[0];
        var dz = pos.z - prev.z;
        var f = dz > 0 ? (plateZ - prev.z) / dz : 0;
        var px = prev.x + (pos.x - prev.x) * f;
        var py = prev.y + (pos.y - prev.y) * f;
        var pt = prev.t + (t - prev.t) * f;
        outcome = { reachedPlate: true, plateX: px, plateY: py, plateT: pt };
        // Insert the exact crossing sample so the trail draws to the right spot.
        samples.push({ t: pt, x: px, y: py, z: plateZ, vx: vx, vy: vy, vz: vz });
        // For pitching mode (truncateAtTarget), stop here. Free Throw passes
        // truncateAtTarget=false so the arc continues to the ground.
        if (opts.truncateAtTarget !== false) break;
      }
      // Bounced (hit the ground)?
      if (pos.y <= 0) {
        // Record the FIRST bounce in outcome so existing classifiers can read
        // it. Subsequent bounces only matter when allowBounces is on.
        if (!outcome) outcome = { bounced: true, bounceX: pos.x, bounceZ: pos.z, bounceT: t, bounceCount: 0 };
        else if (outcome.bounceCount === undefined) {
          outcome.bounced = true; outcome.bounceX = pos.x; outcome.bounceZ = pos.z; outcome.bounceT = t; outcome.bounceCount = 0;
        }
        outcome.bounceCount = (outcome.bounceCount || 0) + 1;
        if (!opts.allowBounces || outcome.bounceCount > 6) break;
        // ── Coefficient-of-restitution reflection ──
        // |v_after_y| = e · |v_before_y|. Tangential velocity (X, Z) loses
        // energy too — combination of sliding friction + ball deformation
        // — modeled here as a simple 0.78× scale (rough match to a ball
        // sliding on hardwood / grass without skidding far). Ball stays at
        // y=0 (we don't track sub-surface penetration).
        var e = ball.cor || 0.6;
        pos.y = 0.0001;            // tiny lift so the next iter doesn't re-trigger immediately
        vy = -vy * e;
        vx *= 0.78;
        vz *= 0.78;
        // Spin loses ~30% per bounce (frictional torque). Approximate as
        // 0.7× scale on omega magnitude; direction unchanged.
        omega.x *= 0.7; omega.y *= 0.7; omega.z *= 0.7;
      }
    }
    if (!outcome) outcome = { lostInFlight: true };
    return { samples: samples, outcome: outcome, opts: opts };
  }

  // Strike zone (MLB approximate, in meters)
  // Width: ±0.2159 m (= half of 17 in plate)
  // Height: 0.45 m (knees) to 1.05 m (mid-chest), assumes ~6 ft batter
  var STRIKE_ZONE = { xMin: -0.2159, xMax: 0.2159, yMin: 0.45, yMax: 1.05 };

  function classifyPlateLocation(plateX, plateY) {
    if (plateX === undefined || plateY === undefined) return 'wild';
    var inX = plateX >= STRIKE_ZONE.xMin && plateX <= STRIKE_ZONE.xMax;
    var inY = plateY >= STRIKE_ZONE.yMin && plateY <= STRIKE_ZONE.yMax;
    if (inX && inY) return 'strike';
    var nearX = plateX >= STRIKE_ZONE.xMin - 0.08 && plateX <= STRIKE_ZONE.xMax + 0.08;
    var nearY = plateY >= STRIKE_ZONE.yMin - 0.10 && plateY <= STRIKE_ZONE.yMax + 0.10;
    if (nearX && nearY) return 'borderline';
    return 'ball';
  }

  // ═══════════════════════════════════════════
  // TOOL REGISTRATION
  // ═══════════════════════════════════════════
  window.StemLab.registerTool('throwlab', {
    icon: '⚾',
    label: 'ThrowLab',
    desc: 'Sports physics: how spin, speed, and release point shape the ball\'s path',
    color: 'amber',
    category: 'science',
    questHooks: [
      { id: 'tl_throw_5',
        label: 'Throw 5 pitches',
        icon: '⚾',
        check: function(d) { return (d.throwCount || 0) >= 5; },
        progress: function(d) { return (d.throwCount || 0) + '/5 pitches'; } },
      { id: 'tl_strike_3',
        label: 'Land 3 pitches in the strike zone',
        icon: '🎯',
        check: function(d) { return (d.strikeCount || 0) >= 3; },
        progress: function(d) { return (d.strikeCount || 0) + '/3 strikes'; } },
      { id: 'tl_throw_each',
        label: 'Throw every pitch type at least once',
        icon: '🏆',
        check: function(d) { return (d.pitchTypesUsed && Object.keys(d.pitchTypesUsed).length >= PITCH_TYPES.length); },
        progress: function(d) { return ((d.pitchTypesUsed && Object.keys(d.pitchTypesUsed).length) || 0) + '/' + PITCH_TYPES.length + ' types'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;

      // ── State init guard ─────────────────────────────────
      if (!labToolData || !labToolData.throwlab) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { throwlab: {
            pitchType: '4seam',
            speedMph: 92,
            releaseHeight: 1.85,
            aimDegV: -1.5,
            aimDegH: 0,
            spinRpm: 2300,
            spinAxisDeg: 0,
            throwerHand: 'right',
            showPhysics: false,
            scaffoldTier: 1, // 1 = Rookie (speed only), 2 = Pro (+angle), 3 = All-Star (+spin), 4 = Hall of Fame (full physics + formulas)
            lastResult: null,
            replayActive: false,
            replayT: 0,
            throwCount: 0,
            strikeCount: 0,
            pitchTypesUsed: {},
            // Mode + per-mode extras
            mode: 'pitching',          // 'pitching' | 'freethrow' | 'freekick'
            shotType: 'freethrow',
            shotMakeCount: 0,          // free-throw scoring
            kickType: 'curling',
            goalCount: 0,              // free-kick scoring
            goalType: 'midrange',
            fgDistanceYd: 35,          // active field-goal distance
            fgMakeCount: 0,            // field-goal scoring
            // Compare Mode — pinned reference trajectory drawn behind the
            // current one so students can change ONE variable and see the
            // effect against a held-constant baseline.
            referenceResult: null,
            referenceLabel: '',        // "92 mph 4-Seam" etc.
            // Wind — defaults to calm. Outdoor modes (freekick, fieldgoal)
            // show the controls in the UI; indoor modes hide them. 0° =
            // headwind (against the throw), 90° = crosswind right, 180° =
            // tailwind, 270° = crosswind left.
            windMph: 0,
            windDirDeg: 0,
            // Gravity preset — defaults to Earth. Mars / Moon / Jupiter for
            // the "what if I pitched on another planet?" lesson.
            gravityId: 'earth',
            // Math view — opt-in toggle that appends a "Math behind the
            // throw" panel with the actual physics formulas + current
            // values. Default off so younger students don't see equations
            // they haven't been taught yet.
            showFormulas: false,
            // Coach Mode — Gemini-powered conversational feedback that
            // looks at recent history (not just the last throw) and
            // accommodates the student's scaffold tier.
            coachLoading: false,
            coachReply: '',
            coachError: '',
            recentThrows: [],          // last ~5 throws for history-aware coaching
            // Drills — pre-defined challenge sequences per mode. drillActive
            // toggles the goal panel above the canvas; drillTaskIdx tracks
            // progression through DRILLS[mode].tasks; drillStats accumulates
            // session counters that the task test functions read from.
            drillActive: false,
            drillTaskIdx: 0,
            drillStats: {
              streakStrikes: 0, strikeTypes: {}, strikeWithLowSpin: false,
              makeCount: 0, swishHeights: 0, swishHeightSet: {}, completedBouncePass: false,
              goalKickTypes: {}, totalGoals: 0,
              fgMadeByDist: {}
            }
          }});
        });
        return h('div', { className: 'p-8 text-center text-slate-600' }, 'Loading ThrowLab…');
      }
      var d = labToolData.throwlab;
      var upd = function(key, val) {
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab); next[key] = val;
          return Object.assign({}, prev, { throwlab: next });
        });
      };

      // ── Helpers ─────────────────────────────────────────
      function applyPitchPreset(pid) {
        var pt = PITCH_TYPES.find(function(p) { return p.id === pid; });
        if (!pt) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            pitchType: pid,
            speedMph: pt.speedMph,
            spinRpm: pt.spinRpm,
            spinAxisDeg: pt.spinAxisDeg
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected pitch: ' + pt.label + '. Speed ' + pt.speedMph + ' mph, ' + pt.spinRpm + ' rpm.');
      }

      function applyShotPreset(sid) {
        var st = SHOT_TYPES.find(function(s) { return s.id === sid; });
        if (!st) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            shotType: sid,
            speedMph: st.speedMph,
            spinRpm: st.spinRpm,
            spinAxisDeg: st.spinAxisDeg,
            aimDegV: st.aimDegV,
            releaseHeight: st.releaseHeight
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected shot: ' + st.label + '. Release angle ' + st.aimDegV + ' degrees, height ' + st.releaseHeight + ' meters.');
      }

      function applyKickPreset(kid) {
        var kt = KICK_TYPES.find(function(k) { return k.id === kid; });
        if (!kt) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            kickType: kid,
            speedMph: kt.speedMph,
            spinRpm: kt.spinRpm,
            spinAxisDeg: kt.spinAxisDeg,
            aimDegV: kt.aimDegV,
            releaseHeight: kt.releaseHeight
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected kick: ' + kt.label + '. Speed ' + kt.speedMph + ' mph, spin axis ' + kt.spinAxisDeg + ' degrees.');
      }

      function applyBowlPreset(bid) {
        var bt = CRICKET_DELIVERIES.find(function(b) { return b.id === bid; });
        if (!bt) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            bowlType: bid,
            speedMph: bt.speedMph,
            spinRpm: bt.spinRpm,
            spinAxisDeg: bt.spinAxisDeg,
            aimDegV: bt.aimDegV,
            releaseHeight: bt.releaseHeight
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected delivery: ' + bt.label + '. Speed ' + bt.speedMph + ' mph, spin axis ' + bt.spinAxisDeg + ' degrees.');
      }

      function applyGolfPreset(gid) {
        var gt = GOLF_TYPES.find(function(g) { return g.id === gid; });
        if (!gt) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            golfClub: gid,
            speedMph: gt.speedMph,
            spinRpm: gt.spinRpm,
            spinAxisDeg: gt.spinAxisDeg,
            aimDegV: gt.aimDegV,
            releaseHeight: gt.releaseHeight
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected club: ' + gt.label + '. Carry ' + gt.carryYd + ' yards, ' + gt.aimDegV + ' degree launch.');
      }

      // ── Custom scenarios ──
      // Save the current setup (mode + preset + gravity + wind) as a
      // personalized scenario. Persisted in toolData.customScenarios.
      // Capped at 12 entries (FIFO) so the toolData blob doesn't grow
      // unbounded across sessions. Each custom scenario carries the
      // same parameter shape as the built-in SCENARIOS, plus a
      // `custom: true` flag so the UI can mark + offer delete.
      var MAX_CUSTOM_SCENARIOS = 12;

      function saveCustomScenario() {
        var defaultName;
        var modeLbl = (MODES[d.mode] || {}).label || d.mode;
        var presetId = d.mode === 'pitching' ? d.pitchType
                     : d.mode === 'freethrow' ? d.shotType
                     : d.mode === 'freekick' ? d.kickType
                     : d.mode === 'fieldgoal' ? d.goalType
                     : d.mode === 'bowling' ? d.bowlType
                     : d.mode === 'golf' ? d.golfClub
                     : d.serveType;
        var presetList = d.mode === 'pitching' ? PITCH_TYPES
                       : d.mode === 'freethrow' ? SHOT_TYPES
                       : d.mode === 'freekick' ? KICK_TYPES
                       : d.mode === 'fieldgoal' ? GOAL_TYPES
                       : d.mode === 'bowling' ? CRICKET_DELIVERIES
                       : d.mode === 'golf' ? GOLF_TYPES
                       : VOLLEYBALL_TYPES;
        var preset = presetList.find(function(p) { return p.id === presetId; });
        var gravLbl = (GRAVITY_PRESETS.find(function(g) { return g.id === (d.gravityId || 'earth'); }) || {}).label || 'Earth';
        defaultName = (preset ? preset.label : modeLbl) + ' on ' + gravLbl
                    + (d.windMph ? ' + ' + d.windMph + ' mph wind' : '');
        var name = (typeof window !== 'undefined' && typeof window.prompt === 'function')
          ? window.prompt('Name this scenario:', defaultName)
          : defaultName;
        if (!name) return; // user cancelled
        name = String(name).trim().slice(0, 60);
        if (!name) return;
        var newScenario = {
          id: 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
          label: name,
          icon: '⭐',
          mode: d.mode,
          presetId: presetId,
          gravityId: d.gravityId || 'earth',
          windMph: d.windMph || 0,
          windDirDeg: d.windDirDeg || 0,
          aimDegV: d.aimDegV,
          aimDegH: d.aimDegH || 0,
          releaseHeight: d.releaseHeight,
          custom: true,
          createdAt: Date.now(),
          teach: 'Custom scenario you saved on ' + new Date().toLocaleDateString() + '. Adjust any parameter and re-throw to compare against the saved baseline.'
        };
        setLabToolData(function(prev) {
          var existing = (prev.throwlab.customScenarios || []).slice();
          existing.push(newScenario);
          while (existing.length > MAX_CUSTOM_SCENARIOS) existing.shift(); // FIFO eviction
          var next = Object.assign({}, prev.throwlab, { customScenarios: existing });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Saved custom scenario: ' + name);
        if (addToast) addToast('⭐ Saved: ' + name);
      }

      function deleteCustomScenario(scenarioId) {
        setLabToolData(function(prev) {
          var existing = (prev.throwlab.customScenarios || []).filter(function(s) { return s.id !== scenarioId; });
          var next = Object.assign({}, prev.throwlab, { customScenarios: existing });
          // If the active scenario was the one deleted, clear the briefing
          if (prev.throwlab.activeScenarioId === scenarioId) {
            next.activeScenarioId = null;
          }
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Custom scenario removed.');
      }

      // ── Trading Card export (engagement layer) ──
      // Generate a Topps-style baseball card from the student\'s latest
      // throw + their stats + earned badges. Prompts for a player name
      // on first use; cached in toolData so subsequent exports just go.
      // Alternative to the academic activity-sheet PDF — a printable
      // shareable artifact a kid would actually pin to their wall.
      function exportTradingCard() {
        if (!d.lastResult) {
          tlAnnounce('Throw something first, then export a trading card.');
          if (addToast) addToast('Throw first — card needs a result');
          return;
        }
        var name = d.playerName;
        if (!name) {
          name = (typeof window !== 'undefined' && typeof window.prompt === 'function')
            ? window.prompt('What\'s your player name? (Saved for next time)', 'Lab Athlete')
            : 'Lab Athlete';
          if (!name) return;
          name = String(name).trim().slice(0, 30);
          if (!name) return;
          // Persist for future exports
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, { playerName: name })});
          });
        }
        var lr = d.lastResult;
        var stats = d.drillStats || {};
        var modeLbl = (MODES[d.mode] || {}).label || d.mode;
        var modeIcon = (MODES[d.mode] || {}).icon || '🏆';
        var presetLbl = isPitching ? (currentPitch && currentPitch.label) || 'pitch'
                      : isFreeThrow ? (currentShot && currentShot.label) || 'shot'
                      : isFreeKick ? (currentKick && currentKick.label) || 'kick'
                      : isFieldGoal ? (currentGoal && currentGoal.label) || 'kick'
                      : isBowling ? (currentBowl && currentBowl.label) || 'delivery'
                      : isGolf ? (currentGolfClub && currentGolfClub.label) || 'club'
                      : isVolleyball ? (currentVolley && currentVolley.label) || 'serve'
                      : 'throw';
        // Build a tiny inline SVG trajectory of the last throw
        var samples = (lr.samples || []).slice(0, 60);
        var maxZ = Math.max.apply(null, samples.map(function(s) { return s.z; })) || 1;
        var maxY = Math.max(2, Math.max.apply(null, samples.map(function(s) { return s.y; })) || 1);
        var pts = samples.map(function(s) {
          var px = (s.z / maxZ) * 280;
          var py = 120 - (s.y / maxY) * 110;
          return px.toFixed(1) + ',' + py.toFixed(1);
        }).join(' ');
        // Compose stat line per sport
        var statLine;
        if (isPitching) statLine = 'Strikes: ' + (d.strikeCount || 0) + ' · Streak: ' + (stats.streakStrikes || 0) + ' · Pitch types used: ' + Object.keys(stats.strikeTypes || {}).length;
        else if (isFreeThrow) statLine = 'Makes: ' + (d.shotMakeCount || 0) + ' · Hot streak: ' + (stats.hotStreak || 0) + ' · Different swish heights: ' + (stats.swishHeights || 0);
        else if (isFreeKick) statLine = 'Goals: ' + (d.goalCount || 0) + ' · Kick types scored: ' + Object.keys(stats.goalKickTypes || {}).length;
        else if (isFieldGoal) statLine = 'FGs made: ' + (d.fgMakeCount || 0) + ' · Distances cleared: ' + Object.keys(stats.fgMadeByDist || {}).length;
        else if (isBowling) statLine = 'Wickets: ' + (d.wicketCount || 0) + ' · Delivery types used: ' + Object.keys(stats.bowlTypes || {}).length;
        else if (isGolf) statLine = 'Greens hit: ' + (d.golfGreenCount || 0) + ' · Fairways hit: ' + (stats.golfFairwaysHit || 0);
        else if (isVolleyball) statLine = 'Aces: ' + (d.volleyAceCount || 0) + ' · In-court serves: ' + (stats.volleyInCount || 0);
        else statLine = 'Throws: ' + (d.throwCount || 0);
        // Earned badges (top 5)
        var earnedBadges = BADGES.filter(function(b) { return d.badgesEarned && d.badgesEarned[b.id]; }).slice(0, 5);
        var badgesHtml = earnedBadges.length
          ? earnedBadges.map(function(b) { return '<span class="badge">' + b.emoji + ' ' + b.label + '</span>'; }).join('')
          : '<span class="badge-empty">No badges yet — keep throwing!</span>';
        var cardHtml = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
          + '<title>ThrowLab Trading Card — ' + name + '</title>'
          + '<style>'
          + '*{box-sizing:border-box} body{margin:30px;font-family:Georgia,serif;background:#0f172a;color:#1a1a1a;display:flex;justify-content:center}'
          + '.card{width:380px;border:8px solid #fbbf24;border-radius:18px;background:linear-gradient(135deg,#fef3c7,#fde68a);padding:0;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.3)}'
          + '.banner{background:linear-gradient(135deg,#1e293b,#334155);color:#fbbf24;padding:14px 20px;text-align:center}'
          + '.banner .icon{font-size:32px;display:block;margin-bottom:4px}'
          + '.banner .name{font-size:24px;font-weight:bold;margin:0;letter-spacing:1px}'
          + '.banner .sport{font-size:11px;color:#cbd5e1;text-transform:uppercase;letter-spacing:2px;margin-top:4px}'
          + '.body{padding:18px}'
          + '.preset{background:#1e293b;color:#fbbf24;padding:6px 12px;border-radius:6px;display:inline-block;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}'
          + '.svg-frame{background:#0f172a;border-radius:8px;padding:8px;margin-bottom:10px}'
          + '.svg-frame svg{display:block}'
          + '.params{font-family:ui-monospace,monospace;font-size:11px;color:#475569;margin-bottom:8px}'
          + '.stat-line{font-size:12px;color:#1a1a1a;font-weight:bold;margin-bottom:10px;padding:8px;background:rgba(30,41,59,0.05);border-radius:6px;border-left:3px solid #fbbf24}'
          + '.badges{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}'
          + '.badge{background:#1e293b;color:#fbbf24;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:bold}'
          + '.badge-empty{color:#94a3b8;font-style:italic;font-size:10px}'
          + '.footer{text-align:center;font-size:9px;color:#666;border-top:1px dashed #94a3b8;padding-top:6px;margin-top:8px}'
          + '@media print{body{background:white;margin:0}.card{box-shadow:none}}'
          + '</style></head><body>'
          + '<div class="card">'
          + '  <div class="banner">'
          + '    <span class="icon">' + modeIcon + '</span>'
          + '    <div class="name">' + name + '</div>'
          + '    <div class="sport">' + modeLbl + '</div>'
          + '  </div>'
          + '  <div class="body">'
          + '    <div class="preset">' + presetLbl + ' — ' + (lr.location || 'result').toUpperCase() + '</div>'
          + '    <div class="svg-frame"><svg width="100%" height="120" viewBox="0 0 280 120" xmlns="http://www.w3.org/2000/svg">'
          + '      <line x1="0" y1="120" x2="280" y2="120" stroke="#475569" stroke-width="1"/>'
          + '      <polyline points="' + pts + '" fill="none" stroke="#fbbf24" stroke-width="2.5"/>'
          + '    </svg></div>'
          + '    <div class="params">' + d.speedMph + ' mph · ' + d.spinRpm + ' rpm @ ' + d.spinAxisDeg + '° axis · launch ' + d.aimDegV.toFixed(1) + '°</div>'
          + '    <div class="stat-line">' + statLine + '</div>'
          + '    <div class="badges">' + badgesHtml + '</div>'
          + '    <div class="footer">ThrowLab — Sports Physics Lab · AlloFlow · ' + new Date().toLocaleDateString() + '</div>'
          + '  </div>'
          + '</div>'
          + '</body></html>';
        try {
          var win = window.open('', '_blank');
          if (win) {
            win.document.write(cardHtml);
            win.document.close();
            setTimeout(function() { try { win.print(); } catch(e) {} }, 400);
          } else if (addToast) addToast('Pop-up blocked — allow pop-ups to print', 'error');
        } catch(e) {
          if (addToast) addToast('Card export failed', 'error');
        }
        tlAnnounce('Trading card exported for ' + name + '.');
        if (addToast) addToast('📇 Trading card!');
      }

      // Open a printable activity sheet listing every ThrowLab
      // scenario with its teach + 3 discussion questions, formatted
      // for in-class handout. Triggers window.print() so the teacher
      // can print or save as PDF.
      function printThrowLabActivitySheet() {
        if (!SCENARIOS.length) return;
        var dateStr = new Date().toLocaleDateString();
        var sheetHtml = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
          + '<title>ThrowLab Activity Sheet</title>'
          + '<style>'
          + 'body{font-family:Georgia,serif;max-width:780px;margin:30px auto;padding:0 20px;color:#1a1a1a;line-height:1.5}'
          + 'h1{font-size:22px;border-bottom:3px solid #1a1a1a;padding-bottom:6px;margin-bottom:6px}'
          + '.meta{color:#666;font-size:11px;margin-bottom:24px}'
          + '.scenario{margin-bottom:32px;page-break-inside:avoid;border:1px solid #cbd5e1;border-radius:6px;padding:14px}'
          + '.scenario h2{font-size:16px;margin:0 0 4px 0}'
          + '.scenario .icon{margin-right:6px}'
          + '.scenario .setup{font-size:11px;color:#666;margin:2px 0 4px 0}'
          + '.scenario .teach{font-size:12px;color:#334155;margin:6px 0 10px 0;font-style:italic}'
          + '.scenario .qhead{font-weight:bold;font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:0.5px;margin-top:10px}'
          + '.scenario ol{margin:6px 0 0 22px;padding:0;font-size:12px}'
          + '.scenario ol li{margin-bottom:4px}'
          + '.answer-line{border-bottom:1px solid #94a3b8;height:18px;margin:4px 0}'
          + 'footer{font-size:10px;color:#94a3b8;text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #cbd5e1}'
          + '@media print{.scenario{break-inside:avoid}}'
          + '</style></head><body>'
          + '<h1>ThrowLab Activity Sheet — Sports Physics</h1>'
          + '<div class="meta">Name: ____________________________________  Date: ' + dateStr + '</div>';
        SCENARIOS.forEach(function(sc) {
          var modeLbl = (MODES[sc.mode] || {}).label || sc.mode;
          var gravLbl = (GRAVITY_PRESETS.find(function(g) { return g.id === sc.gravityId; }) || {}).label || 'Earth';
          var setup = modeLbl + ' · gravity: ' + gravLbl
            + (sc.windMph ? ' · wind: ' + sc.windMph + ' mph @ ' + sc.windDirDeg + '°' : '');
          sheetHtml += '<div class="scenario">'
            + '<h2><span class="icon">' + sc.icon + '</span>' + sc.label + '</h2>'
            + '<div class="setup">Setup: ' + setup + '</div>'
            + '<div class="teach">' + sc.teach + '</div>'
            + '<div class="qhead">Discussion Questions</div>'
            + '<ol>';
          (sc.questions || []).forEach(function(q) {
            sheetHtml += '<li>' + q
              + '<div class="answer-line"></div><div class="answer-line"></div><div class="answer-line"></div>'
              + '</li>';
          });
          sheetHtml += '</ol></div>';
        });
        sheetHtml += '<footer>ThrowLab — STEM Lab tool for sports physics · AlloFlow</footer>'
          + '</body></html>';
        try {
          var win = window.open('', '_blank');
          if (win) {
            win.document.write(sheetHtml);
            win.document.close();
            setTimeout(function() { try { win.print(); } catch(e) {} }, 300);
          } else if (addToast) addToast('Pop-up blocked — allow pop-ups to print', 'error');
        } catch(e) {
          if (addToast) addToast('Print failed', 'error');
        }
        tlAnnounce('Activity sheet opened with ' + SCENARIOS.length + ' scenarios.');
      }

      // Quick-Play: pick a random scenario from built-ins + customs and
      // apply it. Targets the athletic kid who arrives and doesn\'t want
      // to read setup — one click and they\'re throwing something fun.
      function runRandomScenario() {
        var pool = SCENARIOS.concat(d.customScenarios || []);
        if (!pool.length) return;
        var pick = pool[Math.floor(Math.random() * pool.length)];
        applyScenario(pick.id);
      }

      function applyScenario(scenarioId) {
        var s = SCENARIOS.find(function(sc) { return sc.id === scenarioId; });
        if (!s) {
          // Fall back to custom scenarios
          s = (d.customScenarios || []).find(function(sc) { return sc.id === scenarioId; });
        }
        if (!s) return;
        var presetList = s.mode === 'pitching' ? PITCH_TYPES
                       : s.mode === 'freethrow' ? SHOT_TYPES
                       : s.mode === 'freekick' ? KICK_TYPES
                       : s.mode === 'fieldgoal' ? GOAL_TYPES
                       : s.mode === 'bowling' ? CRICKET_DELIVERIES
                       : s.mode === 'golf' ? GOLF_TYPES
                       : VOLLEYBALL_TYPES;
        var preset = presetList.find(function(p) { return p.id === s.presetId; });
        if (!preset) return;
        var presetIdField = s.mode === 'pitching' ? 'pitchType'
                          : s.mode === 'freethrow' ? 'shotType'
                          : s.mode === 'freekick' ? 'kickType'
                          : s.mode === 'fieldgoal' ? 'goalType'
                          : s.mode === 'bowling' ? 'bowlType'
                          : s.mode === 'golf' ? 'golfClub'
                          : 'serveType';
        setLabToolData(function(prev) {
          var nextThrowlab = Object.assign({}, prev.throwlab, {
            mode: s.mode,
            speedMph: preset.speedMph,
            spinRpm: preset.spinRpm,
            spinAxisDeg: preset.spinAxisDeg,
            aimDegV: s.aimDegV != null ? s.aimDegV : preset.aimDegV,
            aimDegH: s.aimDegH != null ? s.aimDegH : 0,
            releaseHeight: s.releaseHeight != null ? s.releaseHeight : preset.releaseHeight,
            windMph: s.windMph || 0,
            windDirDeg: s.windDirDeg || 0,
            gravityId: s.gravityId || 'earth',
            lastResult: null, replayActive: false, replayT: 0,
            coachReply: '', coachError: '',
            activeScenarioId: scenarioId
          });
          nextThrowlab[presetIdField] = s.presetId;
          if (s.mode === 'fieldgoal' && preset.distanceYd) nextThrowlab.fgDistanceYd = preset.distanceYd;
          return Object.assign({}, prev, { throwlab: nextThrowlab });
        });
        tlAnnounce('Scenario loaded: ' + s.label + '. ' + s.teach);
      }

      function applyVolleyPreset(vid) {
        var vt = VOLLEYBALL_TYPES.find(function(v) { return v.id === vid; });
        if (!vt) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            serveType: vid,
            speedMph: vt.speedMph,
            spinRpm: vt.spinRpm,
            spinAxisDeg: vt.spinAxisDeg,
            aimDegV: vt.aimDegV,
            releaseHeight: vt.releaseHeight
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected serve: ' + vt.label + '. Speed ' + vt.speedMph + ' mph, ' + vt.spinRpm + ' rpm.');
      }

      // ── Compare Mode helpers ──
      // Pin the most recent trajectory as a "reference ghost" — drawn behind
      // the next throw in a faded color so students can change one parameter
      // and see its isolated effect.
      // Multi-ghost compare — students can save up to 4 reference
      // trajectories at distinct colors and overlay them all. The
      // existing single-reference fields (referenceResult / referenceLabel)
      // are kept for backwards compatibility — first-saved trajectory
      // also writes to those so older saved sessions still render.
      var REFERENCE_COLORS = [
        { color: '#d946ef', name: 'Fuchsia' },  // ref #1 — original
        { color: '#22d3ee', name: 'Cyan' },     // ref #2
        { color: '#a3e635', name: 'Lime' },     // ref #3
        { color: '#fb923c', name: 'Orange' }    // ref #4
      ];
      var MAX_REFERENCES = 4;

      function buildRefLabel() {
        var modeLabel = isPitching ? (currentPitch && currentPitch.label) || 'pitch'
                      : isFreeThrow ? (currentShot && currentShot.label) || 'shot'
                      : isFreeKick ? (currentKick && currentKick.label) || 'kick'
                      : isFieldGoal ? (currentGoal && currentGoal.label) || 'kick'
                      : isBowling ? (currentBowl && currentBowl.label) || 'delivery'
                      : isGolf ? (currentGolfClub && currentGolfClub.label) || 'club'
                      : isVolleyball ? (currentVolley && currentVolley.label) || 'serve'
                      : 'throw';
        return d.speedMph + ' mph · ' + modeLabel
             + (isPitching || isFreeKick || isBowling || isVolleyball ? ' · ' + d.spinRpm + ' rpm @ ' + d.spinAxisDeg + '°' : '')
             + (isFreeThrow || isFieldGoal || isGolf ? ' · ' + d.aimDegV.toFixed(1) + '°' : '');
      }

      function saveReference() {
        if (!d.lastResult) {
          tlAnnounce('Throw a pitch first, then you can save it as a reference.');
          if (addToast) addToast('No throw to save yet');
          return;
        }
        var label = buildRefLabel();
        setLabToolData(function(prev) {
          var existingList = prev.throwlab.referenceList || [];
          // Hydrate from legacy single-reference if list is empty + legacy is set
          if (!existingList.length && prev.throwlab.referenceResult) {
            existingList = [{ result: prev.throwlab.referenceResult, label: prev.throwlab.referenceLabel || 'reference', color: REFERENCE_COLORS[0].color }];
          }
          var nextList;
          if (existingList.length >= MAX_REFERENCES) {
            // Cap reached — replace the oldest (FIFO)
            nextList = existingList.slice(1).concat([{
              result: prev.throwlab.lastResult,
              label: label,
              color: REFERENCE_COLORS[(existingList.length) % REFERENCE_COLORS.length].color
            }]);
          } else {
            nextList = existingList.concat([{
              result: prev.throwlab.lastResult,
              label: label,
              color: REFERENCE_COLORS[existingList.length % REFERENCE_COLORS.length].color
            }]);
          }
          var next = Object.assign({}, prev.throwlab, {
            referenceList: nextList,
            // Keep legacy fields synced to the FIRST entry for back-compat
            referenceResult: nextList[0].result,
            referenceLabel: nextList[0].label
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Saved as reference: ' + label + '. Change one parameter and throw again to compare.');
        if (addToast) addToast('📌 Reference saved');
      }

      function clearReference() {
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            referenceList: [],
            referenceResult: null,
            referenceLabel: ''
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('All references cleared.');
      }

      function removeReferenceAt(idx) {
        setLabToolData(function(prev) {
          var list = (prev.throwlab.referenceList || []).slice();
          list.splice(idx, 1);
          var next = Object.assign({}, prev.throwlab, {
            referenceList: list,
            referenceResult: list.length ? list[0].result : null,
            referenceLabel: list.length ? list[0].label : ''
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Reference removed.');
      }

      // ── Coach Mode (Gemini) ──
      // Sends the recent-throws history + last-throw context to Gemini for
      // conversational, history-aware feedback. Falls back gracefully if
      // callGemini isn't available (host harness without API access).
      function askCoach() {
        if (!d.lastResult) {
          tlAnnounce('Throw a pitch first, then ask the coach for feedback.');
          if (addToast) addToast('Throw something first');
          return;
        }
        if (typeof callGemini !== 'function') {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, {
              coachError: 'Coach is offline (AI not available in this build).'
            })});
          });
          tlAnnounce('Coach is offline.');
          return;
        }
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, {
            coachLoading: true, coachReply: '', coachError: ''
          })});
        });
        var tier = d.scaffoldTier || 3;
        var tierHint = tier === 1
          ? 'a young or beginner student — only mention SPEED, not angles or spin'
          : tier === 2
          ? 'an upper-elementary student — speed and angle are fair game, but go easy on spin'
          : 'a high-school physics student — full equations, spin axis, drag, Magnus all fair game';
        var modeLabel = (MODES[d.mode] || {}).label || d.mode;
        var lastSummary = JSON.stringify((d.recentThrows || []).slice(-5));
        var lastLoc = d.lastResult.location;
        // Per-sport physics anchor — reminds the coach about what's
        // distinctive about THIS sport so feedback uses the right
        // vocabulary and references the right geometry.
        var sportAnchor = d.mode === 'pitching'
          ? 'Strike zone is ~17 in wide × ~25 in tall at home plate (60 ft 6 in). Spin axis controls break: 0° = backspin lift (4-seam), 180° = topspin drop (curveball), 90° = sidespin (slider). Outcomes: strike / borderline / ball / wild.'
          : d.mode === 'freethrow'
          ? 'Rim is 4.34 m from shooter at 3.05 m height (NBA). Backspin softens rim contact; higher arc is more forgiving but needs more speed. Pass variants (bounce/chest) target a teammate at 6 m. Outcomes: swish / made / rim / backboard / air / caught / wrongbounce.'
          : d.mode === 'freekick'
          ? 'Goal is 7.32 m wide × 2.44 m tall at 22 m. Defender wall at 9.15 m, ~1.7 m tall. Sidespin (axis ~90°) curls the ball laterally — Beckham gets ~1.5 m of curl from 600 rpm. Outcomes: goal / post / over / wide / blocked / short.'
          : d.mode === 'fieldgoal'
          ? 'Crossbar at 3.05 m; uprights ±2.82 m. Goal-line distance is preset-driven (20-60 yd). Optimal launch is ~38-42° depending on distance — drag eats ~10-12% of horizontal range at long FGs. Outcomes: good / doink / shortbar / wideclose / wide / short.'
          : d.mode === 'bowling'
          ? 'Stumps are 0.71 m tall × 0.23 m wide at 20.12 m. Ball BOUNCES on the pitch before reaching the batter (good length is 5-8 m in front of stumps). Seam tilt creates in-swing or out-swing in the air; off-spin / leg-spin turn off the surface after the bounce. Outcomes: wicket / shaved / overhead / wide / dot / short.'
          : d.mode === 'golf'
          ? 'Target distance is preset-driven (~85-250 yd carry). Backspin generates Magnus lift = airtime; dimples trip airflow into a turbulent boundary layer that doubles range vs a smooth ball. Loft + clubhead speed determine carry. Outcomes: green / fairway / rough / woods / short / long / topped.'
          : d.mode === 'volleyball'
          ? 'Net at 9 m midcourt, height 2.43 m (men). Receiving court is 9 m wide × 9 m deep beyond the net. Topspin drops the ball past the net (jump serve); no-spin "float" wobbles unpredictably from drag asymmetry. Outcomes: ace (deep corner) / in / net / out / long / short.'
          : '';
        var presetTeach = (activePreset && activePreset.teach) ? activePreset.teach : '';
        // Coach personality — prepended so the same physics anchors come
        // through in different voices (Analyst / Old School / Hype Man / Zen)
        var personaId = d.coachPersona || 'analyst';
        var persona = COACH_PERSONAS.find(function(p) { return p.id === personaId; }) || COACH_PERSONAS[0];
        var prompt = (persona.prepend ? persona.prepend + ' ' : '')
          + 'You are coaching a student in a sports physics simulator (ThrowLab). '
          + 'The student is in ' + modeLabel + ' mode. They are ' + tierHint + '. '
          + (sportAnchor ? 'Sport context: ' + sportAnchor + ' ' : '')
          + (presetTeach ? 'Active preset (' + (activePreset.label || '') + '): ' + presetTeach + ' ' : '')
          + 'Their last throw outcome: ' + lastLoc + '. Last 5 throws history (JSON): ' + lastSummary + '. '
          + 'Current parameters: speed ' + d.speedMph + ' mph, vertical aim ' + (d.aimDegV || 0).toFixed(1) + '°, '
          + 'horizontal aim ' + (d.aimDegH || 0).toFixed(1) + '°, spin ' + d.spinRpm + ' rpm at axis ' + d.spinAxisDeg + '°, '
          + 'gravity ' + d.gravityId + ', wind ' + (d.windMph || 0) + ' mph @ ' + (d.windDirDeg || 0) + '°. '
          + 'Give 2-3 sentences of warm, specific coaching: (1) acknowledge what just happened using the sport\'s actual vocabulary (wicket / ace / doink / etc.), (2) suggest ONE concrete change tied to the sport\'s SPECIFIC geometry above, '
          + '(3) tie it to the underlying physics in a way the student can use next throw. '
          + 'Plain prose, no markdown, no bullets, no headings.';
        callGemini(prompt, false, false, 0.7).then(function(resp) {
          var reply = String(resp || '').trim();
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, {
              coachLoading: false, coachReply: reply, coachError: ''
            })});
          });
          tlAnnounce('Coach: ' + reply);
        }).catch(function() {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, {
              coachLoading: false, coachError: 'Could not reach the coach. Try again in a moment.'
            })});
          });
        });
      }

      function applyGoalPreset(gid) {
        var gt = GOAL_TYPES.find(function(g) { return g.id === gid; });
        if (!gt) return;
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            goalType: gid,
            fgDistanceYd: gt.distanceYd,
            speedMph: gt.speedMph,
            spinRpm: gt.spinRpm,
            spinAxisDeg: gt.spinAxisDeg,
            aimDegV: gt.aimDegV,
            releaseHeight: gt.releaseHeight,
            lastResult: null            // distance change → invalidate previous result
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Selected field goal: ' + gt.label + '. Distance ' + gt.distanceYd + ' yards, launch angle ' + gt.aimDegV + ' degrees.');
      }

      function switchMode(newMode) {
        var modeMeta = MODES[newMode];
        if (!modeMeta) return;
        setLabToolData(function(prev) {
          var defaults;
          if (newMode === 'pitching') {
            defaults = { speedMph: 92, releaseHeight: 1.85, aimDegV: -1.5, aimDegH: 0, spinRpm: 2300, spinAxisDeg: 0 };
          } else if (newMode === 'freethrow') {
            defaults = { speedMph: 16, releaseHeight: 2.2, aimDegV: 52, aimDegH: 0, spinRpm: 180, spinAxisDeg: 0 };
          } else if (newMode === 'freekick') {
            defaults = { speedMph: 60, releaseHeight: 0.11, aimDegV: 12, aimDegH: 0, spinRpm: 600, spinAxisDeg: 105 };
          } else if (newMode === 'fieldgoal') {
            defaults = { speedMph: 60, releaseHeight: 0.0, aimDegV: 38, aimDegH: 0, spinRpm: 0, spinAxisDeg: 0, fgDistanceYd: 35 };
          } else if (newMode === 'bowling') {
            defaults = { speedMph: 90, releaseHeight: 2.3, aimDegV: -2, aimDegH: 0, spinRpm: 1200, spinAxisDeg: 0, bowlType: 'fast' };
          } else if (newMode === 'golf') {
            defaults = { speedMph: 120, releaseHeight: 0.0, aimDegV: 25, aimDegH: 0, spinRpm: 6500, spinAxisDeg: 0, golfClub: 'iron' };
          } else { // volleyball
            defaults = { speedMph: 50, releaseHeight: 2.0, aimDegV: 8, aimDegH: 0, spinRpm: 30, spinAxisDeg: 0, serveType: 'float' };
          }
          var next = Object.assign({}, prev.throwlab, defaults, {
            mode: newMode, lastResult: null, replayActive: false, replayT: 0
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        tlAnnounce('Switched to ' + modeMeta.label + ' mode.');
      }

      // Plain-language trajectory shape for screen-reader narration.
      // WCAG 1.1.1 Non-text Content: the canvas trajectory has no SR
      // equivalent without this — describes apex height + distance + duration
      // so a blind student gets the same shape information a sighted student
      // sees in the line. ~1 sentence, appended to outcome-specific text.
      function describeShape(rs) {
        if (!rs || !rs.samples || rs.samples.length < 2) return '';
        var apex = Math.max.apply(null, rs.samples.map(function(s) { return s.y; }));
        var maxZ = Math.max.apply(null, rs.samples.map(function(s) { return s.z; }));
        var hangT = rs.samples[rs.samples.length - 1].t || 0;
        return ' Trajectory peaked at ' + apex.toFixed(1) + ' meters, traveled ' + maxZ.toFixed(1) + ' meters forward over ' + hangT.toFixed(2) + ' seconds.';
      }

      function throwPitch() {
        var modeMeta = MODES[d.mode] || MODES.pitching;
        // Field goal distance is preset-driven so the goal line moves per kick type.
        var effectiveTargetZ = d.mode === 'fieldgoal'
          ? (d.fgDistanceYd || 35) * 0.9144  // yd → m
          : modeMeta.targetZ;
        var simOpts = {
          ball: modeMeta.ball,
          speedMph: d.speedMph,
          releaseHeight: d.releaseHeight,
          aimDegV: d.aimDegV,
          aimDegH: d.aimDegH,
          spinRpm: d.spinRpm,
          spinAxisDeg: d.spinAxisDeg,
          throwerHand: d.throwerHand,
          targetZ: effectiveTargetZ,
          releaseStride: modeMeta.releaseStrideDefault,
          truncateAtTarget: d.mode === 'pitching' || d.mode === 'bowling', // free throw / free kick / field goal / golf need the full arc to land
          // Bounces — basketball needs them for rim-out → bounce on the
          // floor → continued motion. Soccer / football / golf let the
          // ball roll after a kick / shot. Pitching / bowling: a "bounced"
          // ball is either a wild pitch or normal cricket — we already
          // classify at the target plane, so bouncing past that doesn't matter.
          allowBounces: d.mode !== 'pitching' && d.mode !== 'bowling',
          windMph: d.windMph || 0,
          windDirDeg: d.windDirDeg || 0,
          gravity: (function() {
            var p = GRAVITY_PRESETS.find(function(g) { return g.id === (d.gravityId || 'earth'); });
            return p ? p.g : G;
          })()
        };
        // Free kick + field goal let the arc continue past the goal line so we
        // can detect missed-over / wide / post cases.
        if (d.mode === 'freekick' || d.mode === 'fieldgoal') simOpts.truncateAtTarget = false;
        var result = simulatePitch(simOpts);
        var loc;
        // Identify pass-kind shot types so we route to the pass classifier
        // instead of the hoop classifier even though we're in 'freethrow' mode.
        var activeShotPreset = SHOT_TYPES.find(function(s) { return s.id === d.shotType; });
        var isPassKind = activeShotPreset && activeShotPreset.kind === 'pass';
        if (d.mode === 'freethrow' && isPassKind) {
          loc = classifyPassResult(result.samples, d.shotType, 6.0);
        } else if (d.mode === 'freethrow') {
          loc = classifyShotResult(result.samples, modeMeta.rimY, modeMeta.rimZ, modeMeta.rimRadius);
        } else if (d.mode === 'freekick') {
          loc = classifyKickResult(result.samples, modeMeta);
        } else if (d.mode === 'fieldgoal') {
          loc = classifyFieldGoalResult(result.samples, effectiveTargetZ, modeMeta.crossbarHeight, modeMeta.goalHalfWidth);
        } else if (d.mode === 'bowling') {
          loc = classifyBowlResult(result.samples, modeMeta);
        } else if (d.mode === 'golf') {
          var golfPreset = GOLF_TYPES.find(function(g) { return g.id === d.golfClub; }) || GOLF_TYPES[0];
          loc = classifyGolfResult(result.samples, golfPreset.carryYd, modeMeta.fairwayHalfYd);
        } else if (d.mode === 'volleyball') {
          loc = classifyVolleyResult(result.samples, modeMeta);
        } else {
          loc = result.outcome.reachedPlate
            ? classifyPlateLocation(result.outcome.plateX, result.outcome.plateY)
            : 'wild';
        }
        result.location = loc;
        // Compute break stats relative to a no-spin baseline. Pass through
        // the same wind so the baseline is "what would happen WITHOUT spin
        // but WITH the same conditions" — break attribution stays clean.
        var noSpin = simulatePitch({
          ball: modeMeta.ball,
          speedMph: d.speedMph,
          releaseHeight: d.releaseHeight,
          aimDegV: d.aimDegV,
          aimDegH: d.aimDegH,
          spinRpm: 0,
          spinAxisDeg: 0,
          throwerHand: d.throwerHand,
          windMph: d.windMph || 0,
          windDirDeg: d.windDirDeg || 0,
          gravity: simOpts.gravity
        });
        if (result.outcome.reachedPlate && noSpin.outcome.reachedPlate) {
          result.vBreakIn = (noSpin.outcome.plateY - result.outcome.plateY) * FT_PER_M * 12;
          result.hBreakIn = (result.outcome.plateX - noSpin.outcome.plateX) * FT_PER_M * 12;
        } else {
          result.vBreakIn = null; result.hBreakIn = null;
        }
        sfxThrow();
        var newThrowCount = (d.throwCount || 0) + 1;
        // Unified "make" predicate across all sports — feeds the
        // cross-sport Hot-Hand streak counter so a great cricket bowl
        // followed by a great golf shot keeps the flame lit.
        var isMakeOutcome = loc === 'strike' || loc === 'swish' || loc === 'made' || loc === 'goal' || loc === 'caught'
          || loc === 'good' || loc === 'wicket' || loc === 'shaved'
          || loc === 'ace' || loc === 'in'
          || loc === 'green' || loc === 'fairway';
        var newStrikeCount = (d.mode === 'pitching' && loc === 'strike') ? (d.strikeCount || 0) + 1 : (d.strikeCount || 0);
        var newMakeCount = (d.mode === 'freethrow' && (loc === 'swish' || loc === 'made' || loc === 'caught')) ? (d.shotMakeCount || 0) + 1 : (d.shotMakeCount || 0);
        var newGoalCount = (d.mode === 'freekick' && loc === 'goal') ? (d.goalCount || 0) + 1 : (d.goalCount || 0);
        var newFgMakeCount = (d.mode === 'fieldgoal' && loc === 'good') ? (d.fgMakeCount || 0) + 1 : (d.fgMakeCount || 0);
        var newWicketCount = (d.mode === 'bowling' && (loc === 'wicket' || loc === 'shaved')) ? (d.wicketCount || 0) + 1 : (d.wicketCount || 0);
        var newGolfGreenCount = (d.mode === 'golf' && loc === 'green') ? (d.golfGreenCount || 0) + 1 : (d.golfGreenCount || 0);
        var newVolleyAceCount = (d.mode === 'volleyball' && loc === 'ace') ? (d.volleyAceCount || 0) + 1 : (d.volleyAceCount || 0);
        var newTypesUsed = Object.assign({}, d.pitchTypesUsed || {});
        if (d.mode === 'pitching') newTypesUsed[d.pitchType] = true;
        // Roll a compact history entry for Coach Mode — last 5 throws.
        // We only keep the fields a coach would need (mode, parameters,
        // outcome) so this object stays small even if the user throws
        // hundreds of times.
        var newRecent = (d.recentThrows || []).slice(-4);
        newRecent.push({
          mode: d.mode,
          shotKind: d.mode === 'pitching' ? d.pitchType
                  : d.mode === 'freekick' ? d.kickType
                  : d.mode === 'fieldgoal' ? d.goalType
                  : d.mode === 'bowling' ? d.bowlType
                  : d.mode === 'golf' ? d.golfClub
                  : d.mode === 'volleyball' ? d.serveType
                  : d.shotType,
          speedMph: d.speedMph, angleV: d.aimDegV, angleH: d.aimDegH,
          spinRpm: d.spinRpm, spinAxisDeg: d.spinAxisDeg,
          gravityId: d.gravityId, windMph: d.windMph,
          location: loc
        });
        // ── Drill stat updates ──
        // We compute the new drillStats here (synchronously, off d) and
        // include it in the same setLabToolData so the active task's
        // test() function sees up-to-date counters.
        var stats = Object.assign({
          streakStrikes: 0, strikeTypes: {}, strikeWithLowSpin: false,
          makeCount: 0, swishHeights: 0, swishHeightSet: {}, completedBouncePass: false,
          shotsMadeByType: {}, attemptedHalfCourt: false,
          goalKickTypes: {}, totalGoals: 0,
          fgMadeByDist: {},
          bowlTypes: {}, totalWickets: 0,
          golfClubsOnGreen: {}, golfFairwaysHit: 0,
          volleyServesIn: {}, volleyInCount: 0, volleyAceCount: 0,
          // Hot-Hand: cross-sport streak counter (incremented on ANY make,
          // reset on any miss). Surfaced as the broadcasting-style flame
          // indicator for athletic engagement.
          hotStreak: 0
        }, d.drillStats || {});
        // Cross-sport Hot Hand — increment / reset on the unified make
        // outcome so every sport feeds the same streak meter.
        if (isMakeOutcome) {
          stats.hotStreak = (stats.hotStreak || 0) + 1;
        } else {
          stats.hotStreak = 0;
        }
        // Pitching streak + type-coverage
        if (d.mode === 'pitching') {
          if (loc === 'strike') {
            stats.streakStrikes = (stats.streakStrikes || 0) + 1;
            stats.strikeTypes = Object.assign({}, stats.strikeTypes); stats.strikeTypes[d.pitchType] = true;
            if (d.spinRpm < 200) stats.strikeWithLowSpin = true;
          } else {
            stats.streakStrikes = 0;
          }
        }
        // Free throw makes + multi-height swishes + bounce-pass completion
        if (d.mode === 'freethrow') {
          if (loc === 'caught' && d.shotType === 'bouncepass') stats.completedBouncePass = true;
          if (loc === 'swish' || loc === 'made' || loc === 'caught') {
            stats.makeCount = (stats.makeCount || 0) + 1;
            // Track makes per shot-type so the floater / step-back drills can complete
            stats.shotsMadeByType = Object.assign({}, stats.shotsMadeByType);
            stats.shotsMadeByType[d.shotType] = true;
          }
          // Half-court heave drill — counts ANY attempt that reaches the rim
          // (rim / made / swish / backboard / bouncepass-style 'caught').
          // Per the drill tip: NBA conversion is ~3% so we don't gate on a
          // make. Just need the ball to get there.
          if (d.shotType === 'halfcourt' && (loc !== 'air' && loc !== 'short')) {
            stats.attemptedHalfCourt = true;
          }
          if (loc === 'swish') {
            var hKey = d.releaseHeight.toFixed(1);
            stats.swishHeightSet = Object.assign({}, stats.swishHeightSet);
            if (!stats.swishHeightSet[hKey]) {
              stats.swishHeightSet[hKey] = true;
              stats.swishHeights = Object.keys(stats.swishHeightSet).length;
            }
          }
        }
        // Free kick goals + per-kick-style coverage
        if (d.mode === 'freekick' && loc === 'goal') {
          stats.goalKickTypes = Object.assign({}, stats.goalKickTypes);
          stats.goalKickTypes[d.kickType] = true;
          stats.totalGoals = (stats.totalGoals || 0) + 1;
        }
        // Field goal makes by distance
        if (d.mode === 'fieldgoal' && loc === 'good') {
          stats.fgMadeByDist = Object.assign({}, stats.fgMadeByDist);
          stats.fgMadeByDist[String(d.fgDistanceYd)] = true;
        }
        // Bowling wickets + per-delivery-style coverage
        if (d.mode === 'bowling' && (loc === 'wicket' || loc === 'shaved')) {
          stats.bowlTypes = Object.assign({}, stats.bowlTypes);
          stats.bowlTypes[d.bowlType] = true;
          stats.totalWickets = (stats.totalWickets || 0) + 1;
        }
        // Golf: track green hits per club + total fairway hits
        if (d.mode === 'golf') {
          if (loc === 'green') {
            stats.golfClubsOnGreen = Object.assign({}, stats.golfClubsOnGreen);
            stats.golfClubsOnGreen[d.golfClub] = true;
          }
          if (loc === 'fairway' || loc === 'green') {
            stats.golfFairwaysHit = (stats.golfFairwaysHit || 0) + 1;
          }
        }
        // Volleyball: track in-court serves per type + ace + total-in counter
        if (d.mode === 'volleyball') {
          if (loc === 'in' || loc === 'ace') {
            stats.volleyServesIn = Object.assign({}, stats.volleyServesIn);
            stats.volleyServesIn[d.serveType] = true;
            stats.volleyInCount = (stats.volleyInCount || 0) + 1;
          }
          if (loc === 'ace') {
            stats.volleyAceCount = (stats.volleyAceCount || 0) + 1;
          }
        }
        // ── Personal Best check ──
        // Walk the per-sport metrics; if any record was broken, queue
        // an announcement + persist the new best to toolData.
        var pbResult = checkPersonalBests(d, result, stats);
        var newPersonalBests = pbResult.personalBests;
        var newPbRecords = pbResult.newRecords;

        // ── Daily Challenge completion check ──
        // If the student loaded today's daily challenge AND just landed
        // a make outcome, mark the challenge complete (idempotent — set
        // once per date). Fires a celebratory toast + small XP reward.
        var dailyKey = todayKey();
        var newDailyCompleted = d.dailyCompleted || null;
        var dailyJustCompleted = false;
        if (d.activeScenarioId && isMakeOutcome) {
          var daily = getDailyChallenge();
          if (daily && d.activeScenarioId === daily.id && newDailyCompleted !== dailyKey) {
            newDailyCompleted = dailyKey;
            dailyJustCompleted = true;
          }
        }
        // ── Achievement / Badge earn-detection ──
        // Walk BADGES, awarding any whose `check` returns true that
        // the student hasn\'t earned yet. Each earn fires a toast +
        // tlAnnounce + small XP bonus; the earned set persists in
        // toolData so badges stay lit across reloads.
        var earnedSet = Object.assign({}, d.badgesEarned || {});
        var newlyEarned = [];
        BADGES.forEach(function(b) {
          if (earnedSet[b.id]) return;
          try {
            if (b.check(d, result, stats)) {
              earnedSet[b.id] = Date.now();
              newlyEarned.push(b);
            }
          } catch (e) { /* defensive — never let a bad check break the throw flow */ }
        });
        // ── Drill task progression ──
        var newDrillTaskIdx = d.drillTaskIdx || 0;
        var taskJustCompleted = null;
        if (d.drillActive) {
          var modeDrills = DRILLS[d.mode];
          if (modeDrills && newDrillTaskIdx < modeDrills.tasks.length) {
            var task = modeDrills.tasks[newDrillTaskIdx];
            if (task && task.test(stats)) {
              taskJustCompleted = task;
              newDrillTaskIdx = newDrillTaskIdx + 1;
            }
          }
        }
        setLabToolData(function(prev) {
          var next = Object.assign({}, prev.throwlab, {
            lastResult: result,
            replayActive: true,
            replayT: 0,
            throwCount: newThrowCount,
            strikeCount: newStrikeCount,
            shotMakeCount: newMakeCount,
            goalCount: newGoalCount,
            fgMakeCount: newFgMakeCount,
            wicketCount: newWicketCount,
            golfGreenCount: newGolfGreenCount,
            volleyAceCount: newVolleyAceCount,
            badgesEarned: earnedSet,
            dailyCompleted: newDailyCompleted,
            personalBests: newPersonalBests,
            pitchTypesUsed: newTypesUsed,
            recentThrows: newRecent,
            drillStats: stats,
            drillTaskIdx: newDrillTaskIdx,
            // Throwing again invalidates the current coaching reply.
            coachReply: '', coachError: ''
          });
          return Object.assign({}, prev, { throwlab: next });
        });
        if (taskJustCompleted) {
          var modeDrills2 = DRILLS[d.mode];
          var allDone = modeDrills2 && newDrillTaskIdx >= modeDrills2.tasks.length;
          setTimeout(function() {
            if (allDone) {
              tlAnnounce('Drill complete! All ' + modeDrills2.tasks.length + ' tasks finished.');
              if (addToast) addToast('🏆 Drill complete!');
              if (awardXP) awardXP('throwlab', 25, 'Drill complete');
              if (celebrate) celebrate();
            } else {
              tlAnnounce('Task done. New goal: ' + modeDrills2.tasks[newDrillTaskIdx].goal);
              if (addToast) addToast('✅ Task ' + (newDrillTaskIdx) + ' complete');
              if (awardXP) awardXP('throwlab', 12, 'Drill task');
            }
          }, 800);
        }
        // Newly-earned badges — fire toast + tlAnnounce + XP per badge,
        // staggered so multiple earns don\'t pile on top of each other
        if (newlyEarned.length) {
          newlyEarned.forEach(function(b, i) {
            setTimeout(function() {
              tlAnnounce('Badge unlocked: ' + b.label + '. ' + b.hint + '.');
              if (addToast) addToast('🏅 ' + b.emoji + ' ' + b.label + '!');
              if (awardXP) awardXP('throwlab', 8, 'Badge: ' + b.label);
              if (celebrate && i === 0) celebrate();
            }, 1200 + (i * 800));
          });
        }
        // Personal Best announcements — fire each as its own toast +
        // tlAnnounce + small XP, staggered after badges so they don\'t
        // collide. PBs are rarer than badges so 12 XP each.
        if (newPbRecords.length) {
          newPbRecords.forEach(function(r, i) {
            setTimeout(function() {
              tlAnnounce('NEW PERSONAL BEST: ' + r.label + ' — ' + r.value);
              if (addToast) addToast('🏆 New PB: ' + r.label + ' (' + r.value + ')');
              if (awardXP) awardXP('throwlab', 12, 'Personal Best: ' + r.label);
              if (celebrate && i === 0) celebrate();
            }, 1800 + (i * 700));
          });
        }
        // Daily Challenge celebration — separate from drill / badge so
        // it stacks rather than getting drowned out
        if (dailyJustCompleted) {
          var dailyName = (getDailyChallenge() || {}).label || 'Today\'s Challenge';
          setTimeout(function() {
            tlAnnounce('Daily Challenge complete: ' + dailyName + '!');
            if (addToast) addToast('🌟 Daily Challenge done!');
            if (awardXP) awardXP('throwlab', 15, 'Daily Challenge');
            if (celebrate) celebrate();
          }, 600);
        }
        // Outcome SFX + announcement after a tiny delay so it doesn't talk over the throw
        setTimeout(function() {
          if (d.mode === 'pitching') {
            if (loc === 'strike') {
              sfxStrike();
              tlAnnounce('Strike! Pitch crossed the plate ' + Math.round((result.outcome.plateY || 0) * 39.37) + ' inches up.' + describeShape(result));
              if (addToast) addToast('🎯 STRIKE!');
              if (awardXP) awardXP('throwlab', 5, 'Strike thrown');
            } else if (loc === 'borderline') {
              sfxCatch();
              tlAnnounce('Borderline pitch. Just outside the strike zone.');
              if (addToast) addToast('⚪ Borderline pitch');
            } else if (loc === 'ball') {
              sfxBall();
              tlAnnounce('Ball. Pitch missed the strike zone.');
              if (addToast) addToast('Ball — outside the zone');
            } else {
              sfxBall();
              tlAnnounce('Wild pitch. Bounced or sailed past the catcher.');
              if (addToast) addToast('Wild pitch!');
            }
            if (newStrikeCount === 3 && (d.strikeCount || 0) < 3 && celebrate) celebrate();
          } else if (d.mode === 'freethrow') {
            // Pass-kind outcomes (Bounce / Chest pass) come through here too,
            // routed by classifyPassResult instead of classifyShotResult.
            if (loc === 'caught') {
              sfxStrike();
              tlAnnounce('Caught! Pass arrived at chest height — clean delivery.' + describeShape(result));
              if (addToast) addToast('🏀 CAUGHT');
              if (awardXP) awardXP('throwlab', 6, 'Pass completed');
              if (celebrate) celebrate();
            } else if (loc === 'highpass') {
              sfxBall();
              tlAnnounce('Sailed high — your teammate had to jump for it.');
              if (addToast) addToast('Too high');
            } else if (loc === 'lowpass') {
              sfxBall();
              tlAnnounce('Worm-burner — pass arrived below the knees.');
              if (addToast) addToast('Too low');
            } else if (loc === 'wrongbounce') {
              sfxBall();
              tlAnnounce(d.shotType === 'bouncepass' ? 'No bounce — that was a chest pass, not a bounce pass.' : 'Bounced — chest passes should NOT bounce. Use less downward angle.');
              if (addToast) addToast(d.shotType === 'bouncepass' ? 'Need more downward angle' : 'Don\'t bounce a chest pass');
            } else if (loc === 'short') {
              sfxBall();
              tlAnnounce('Short — pass didn\'t reach the teammate.');
              if (addToast) addToast('Short');
            } else if (loc === 'wide') {
              sfxBall();
              tlAnnounce('Wide of the teammate — adjust horizontal aim.');
              if (addToast) addToast('Wide');
            } else if (loc === 'swish') {
              sfxStrike(); sfxStrike();
              tlAnnounce('Swish! Clean shot through the center of the rim.' + describeShape(result));
              if (addToast) addToast('🏀 SWISH!');
              if (awardXP) awardXP('throwlab', 8, 'Swish');
              if (celebrate) celebrate();
            } else if (loc === 'made') {
              sfxStrike();
              tlAnnounce('Made it! Ball kissed the rim and dropped through.');
              if (addToast) addToast('🏀 SCORE!');
              if (awardXP) awardXP('throwlab', 5, 'Shot made');
            } else if (loc === 'rim') {
              sfxBall();
              tlAnnounce('Off the rim. Close — adjust your arc.');
              if (addToast) addToast('Rim out');
            } else if (loc === 'backboard') {
              sfxCatch();
              tlAnnounce('Off the backboard. Try a softer shot or shorter arc.');
              if (addToast) addToast('Off the backboard');
            } else if (loc === 'air') {
              sfxBall();
              tlAnnounce('Airball — short of the rim entirely.');
              if (addToast) addToast('Airball');
            } else {
              sfxBall();
              tlAnnounce('Missed the rim.');
              if (addToast) addToast('Miss');
            }
          } else if (d.mode === 'fieldgoal') {
            if (loc === 'good') {
              sfxStrike(); sfxStrike();
              tlAnnounce('GOOD! Field goal from ' + d.fgDistanceYd + ' yards is up and through.' + describeShape(result));
              if (addToast) addToast('🏈 GOOD!');
              if (awardXP) awardXP('throwlab', 10, 'Field goal made');
              if (celebrate) celebrate();
            } else if (loc === 'doink') {
              sfxStrike();
              tlAnnounce('Doink! Off the post or crossbar — inches from a make.');
              if (addToast) addToast('🥁 DOINK');
            } else if (loc === 'shortbar') {
              sfxBall();
              tlAnnounce('Short. Kick failed to clear the crossbar — needs more power or steeper angle.');
              if (addToast) addToast('Short — under the bar');
            } else if (loc === 'wideclose') {
              sfxBall();
              tlAnnounce('No good — wide of the upright by inches.');
              if (addToast) addToast('Wide — barely');
            } else if (loc === 'wide') {
              sfxBall();
              tlAnnounce('No good — wide of the goalposts.');
              if (addToast) addToast('Wide');
            } else {
              sfxBall();
              tlAnnounce('Short — kick didn\'t reach the goal line.');
              if (addToast) addToast('Short of the line');
            }
          } else if (d.mode === 'freekick') {
            if (loc === 'goal') {
              sfxStrike(); sfxStrike();
              tlAnnounce('GOAL! Free kick found the back of the net.' + describeShape(result));
              if (addToast) addToast('⚽ GOAL!');
              if (awardXP) awardXP('throwlab', 10, 'Free kick goal');
              if (celebrate) celebrate();
            } else if (loc === 'post') {
              sfxStrike();
              tlAnnounce('Off the post! Inches from a goal.');
              if (addToast) addToast('🥅 Off the post');
            } else if (loc === 'over') {
              sfxBall();
              tlAnnounce('Over the bar. Reduce your launch angle.');
              if (addToast) addToast('Over the bar');
            } else if (loc === 'wide') {
              sfxBall();
              tlAnnounce('Wide of the goal. Adjust your aim or curl.');
              if (addToast) addToast('Wide');
            } else if (loc === 'blocked') {
              sfxCatch();
              tlAnnounce('Blocked by the wall. Add more curl or arc.');
              if (addToast) addToast('Wall block');
            } else {
              sfxBall();
              tlAnnounce('Short — kick didn\'t reach the goal line.');
              if (addToast) addToast('Short');
            }
          } else if (d.mode === 'bowling') {
            if (loc === 'wicket') {
              sfxStrike(); sfxStrike();
              tlAnnounce('HOWZAT! Wicket — ball clattered into the stumps.' + describeShape(result));
              if (addToast) addToast('🏏 WICKET!');
              if (awardXP) awardXP('throwlab', 10, 'Wicket taken');
              if (celebrate) celebrate();
            } else if (loc === 'shaved') {
              sfxStrike();
              tlAnnounce('Bail-trembler! Ball just clipped the stumps — count it.');
              if (addToast) addToast('🏏 Bail-trembler');
              if (awardXP) awardXP('throwlab', 7, 'Wicket (bail-shaver)');
            } else if (loc === 'overhead') {
              sfxBall();
              tlAnnounce('Over the bails — head-height ball is a no-ball penalty in test cricket. Reduce launch angle.');
              if (addToast) addToast('Overhead — no-ball');
            } else if (loc === 'wide') {
              sfxBall();
              tlAnnounce('Wide. Outside the wide line — adjust your line tighter to off-stump.');
              if (addToast) addToast('Wide call');
            } else if (loc === 'dot') {
              sfxBall();
              tlAnnounce('Dot ball — passes the bat without hitting stumps. Defensible delivery.');
              if (addToast) addToast('Dot ball');
            } else {
              sfxBall();
              tlAnnounce('Short of a length — ball bounced too far in front of the batter.');
              if (addToast) addToast('Short of length');
            }
          } else if (d.mode === 'volleyball') {
            if (loc === 'ace') {
              sfxStrike(); sfxStrike();
              tlAnnounce('ACE! Serve landed in the deep corner — untouchable.' + describeShape(result));
              if (addToast) addToast('🏐 ACE!');
              if (awardXP) awardXP('throwlab', 12, 'Service ace');
              if (celebrate) celebrate();
            } else if (loc === 'in') {
              sfxStrike();
              tlAnnounce('Serve in. Receivable, but landed in court — point stays in play.');
              if (addToast) addToast('🏐 In');
              if (awardXP) awardXP('throwlab', 5, 'Serve in');
            } else if (loc === 'net') {
              sfxBall();
              tlAnnounce('Net! Hit the tape — service error. Add launch angle by 2-4°.');
              if (addToast) addToast('Net');
            } else if (loc === 'out') {
              sfxBall();
              tlAnnounce('Out wide of the sideline — adjust horizontal aim.');
              if (addToast) addToast('Out');
            } else if (loc === 'long') {
              sfxBall();
              tlAnnounce('Long — past the back line. Reduce speed by 5-8 mph or steepen launch slightly.');
              if (addToast) addToast('Long');
            } else {
              sfxBall();
              tlAnnounce('Short — landed on your side of the net. Add power.');
              if (addToast) addToast('Short');
            }
          } else if (d.mode === 'golf') {
            if (loc === 'green') {
              sfxStrike(); sfxStrike();
              tlAnnounce('On the green! Pin-high approach.' + describeShape(result));
              if (addToast) addToast('⛳ ON THE GREEN!');
              if (awardXP) awardXP('throwlab', 10, 'Green in regulation');
              if (celebrate) celebrate();
            } else if (loc === 'fairway') {
              sfxStrike();
              tlAnnounce('Fairway! Solid strike, in the short grass.');
              if (addToast) addToast('⛳ Fairway');
              if (awardXP) awardXP('throwlab', 6, 'Fairway hit');
            } else if (loc === 'rough') {
              sfxBall();
              tlAnnounce('In the rough. Playable, but the next shot is harder out of long grass.');
              if (addToast) addToast('Rough');
            } else if (loc === 'woods') {
              sfxBall();
              tlAnnounce('In the trees! Way off-line — check your horizontal aim or spin axis.');
              if (addToast) addToast('Woods');
            } else if (loc === 'short') {
              sfxBall();
              tlAnnounce('Short of the green. Need more clubhead speed or a longer club.');
              if (addToast) addToast('Short');
            } else if (loc === 'long') {
              sfxBall();
              tlAnnounce('Long — flew the green. Same club, ease back on speed by 5-10 mph.');
              if (addToast) addToast('Over the green');
            } else {
              sfxBall();
              tlAnnounce('Topped or shanked — barely got airborne.');
              if (addToast) addToast('Topped');
            }
          }
        }, 350);
      }

      // ── Side-view canvas (Z = horizontal axis = mound→plate, Y = vertical) ──
      var canvasRef = React.useRef(null);
      React.useEffect(function() {
        var canvas = canvasRef.current; if (!canvas) return;
        var gfx = canvas.getContext('2d');
        var W = canvas.width, H = canvas.height;
        gfx.clearRect(0, 0, W, H);

        var modeMeta = MODES[d.mode] || MODES.pitching;
        // FREE KICK uses a TOP-DOWN view (z forward / x lateral) so the curl
        // around the wall is visible. Pitching + Free Throw + Field Goal stay
        // side-view (z forward / y vertical) so the arc reads.
        var isTopDown = d.mode === 'freekick';
        // For field goal mode the goal line is preset-driven (20-60 yd).
        var fgGoalZ = d.mode === 'fieldgoal' ? (d.fgDistanceYd || 35) * 0.9144 : 0;
        // Layout
        var marginL = 40, marginR = 80, marginT = 30, marginB = 60;
        var fieldW = W - marginL - marginR;
        var fieldH = H - marginT - marginB;
        // Render-window Z extent — pitching shows the full 60.5 ft, free throw
        // zooms in on the much shorter 15-ft court so the arc reads clearly,
        // free kick shows ~25m so the goal mouth fits with margin, field goal
        // adds ~5m beyond the goalposts so a missed-over kick is still visible.
        // Golf needs the longest renderMaxZ — driver carry is 250 yd ≈ 228 m,
        // plus a margin so the landing zone is visible past the carry point.
        var golfTargetZ = d.mode === 'golf' ? (function() {
          var p = GOLF_TYPES.find(function(g) { return g.id === d.golfClub; }) || GOLF_TYPES[0];
          return p.carryYd * 0.9144;
        })() : 0;
        var renderMaxZ = d.mode === 'pitching' ? modeMeta.targetZ
                       : d.mode === 'freekick' ? 25
                       : d.mode === 'fieldgoal' ? (fgGoalZ + 5)
                       : d.mode === 'bowling' ? modeMeta.targetZ
                       : d.mode === 'golf' ? (golfTargetZ + 30)
                       : d.mode === 'volleyball' ? (modeMeta.targetZ + 2)
                       : 6.5;
        // For top-down: maxB = lateral half-width × 2 ≈ 12m so a curling shot
        // with 1.5m of curl + the 7.32m goal both fit. Field goal apex can hit
        // 15m+ on a 60-yd kick so we need extra vertical room. Bowling stays
        // tight (~3m vertical) so the stumps are tall enough to read. Golf
        // apex can reach ~50 m on a wedge — needs the most vertical room.
        var maxB = isTopDown ? 6.0
                 : d.mode === 'pitching' ? 3.0
                 : d.mode === 'fieldgoal' ? 18
                 : d.mode === 'bowling' ? 3.2
                 : d.mode === 'golf' ? 60
                 : d.mode === 'volleyball' ? 6.0
                 : 4.5;
        // For top-down, B is symmetrical around 0 (lateral X); we map [-maxB, +maxB] to canvas height.
        // For side-view, B is from 0 (ground) up to +maxB.
        // World (z, b) → canvas (px, py). b = y for side-view, b = x for top-down.
        function worldToCanvas(z, b) {
          var px = marginL + (z / renderMaxZ) * fieldW;
          var py;
          if (isTopDown) {
            // Center 0 vertically; +x maps to top of canvas, -x to bottom (so the
            // curling shot bending +X visually bends UP on screen).
            py = (marginT + fieldH / 2) - (b / maxB) * (fieldH / 2);
          } else {
            py = (marginT + fieldH) - (b / maxB) * fieldH;
          }
          return [px, py];
        }
        // Helper: pull the right "b" component from a sample for the active view.
        function sampleB(s) { return isTopDown ? s.x : s.y; }
        if (isTopDown) {
          // Top-down pitch view: full canvas is grass, bird's-eye.
          gfx.fillStyle = '#3a7a26';
          gfx.fillRect(0, 0, W, H);
          // Mowing stripes for top-down readability — alternating bands
          gfx.fillStyle = 'rgba(0, 0, 0, 0.06)';
          for (var ms = 0; ms < W; ms += 60) gfx.fillRect(ms, 0, 30, H);
        } else {
          // Side view: sky gradient + ground band
          var skyTop = d.mode === 'pitching' || d.mode === 'bowling' ? '#1e3a5f' : d.mode === 'golf' ? '#1e4d6f' : d.mode === 'volleyball' ? '#27316b' : '#3a2e2a';
          var skyBot = d.mode === 'pitching' || d.mode === 'bowling' ? '#5a7ba8' : d.mode === 'golf' ? '#7fb5c8' : d.mode === 'volleyball' ? '#5b6cb5' : '#6e5a48';
          var skyGrad = gfx.createLinearGradient(0, 0, 0, marginT + fieldH);
          skyGrad.addColorStop(0, skyTop);
          skyGrad.addColorStop(1, skyBot);
          gfx.fillStyle = skyGrad;
          gfx.fillRect(0, 0, W, marginT + fieldH);
          gfx.fillStyle = d.mode === 'pitching' ? '#3a7a26' : d.mode === 'bowling' ? '#a47b4f' : d.mode === 'golf' ? '#5fa83a' : d.mode === 'volleyball' ? '#b8854d' : '#c8965a';
          gfx.fillRect(0, marginT + fieldH, W, H - (marginT + fieldH));
          if (d.mode === 'freethrow') {
            // Hardwood plank lines for the gym floor
            gfx.strokeStyle = 'rgba(0,0,0,0.18)';
            gfx.lineWidth = 1;
            for (var hp = 0; hp < W; hp += 22) {
              gfx.beginPath();
              gfx.moveTo(hp, marginT + fieldH);
              gfx.lineTo(hp, H);
              gfx.stroke();
            }
          }
        }

        if (d.mode === 'pitching') {
          var plateZ = modeMeta.targetZ;
          // Pitcher's mound (small bump on left)
          gfx.fillStyle = '#a16207';
          var moundPts = worldToCanvas(0, 0);
          gfx.beginPath();
          gfx.moveTo(moundPts[0] - 22, moundPts[1]);
          gfx.lineTo(moundPts[0] + 22, moundPts[1]);
          gfx.lineTo(moundPts[0] + 30, moundPts[1] + 10);
          gfx.lineTo(moundPts[0] - 30, moundPts[1] + 10);
          gfx.closePath();
          gfx.fill();
          // Home plate (white)
          gfx.fillStyle = '#ffffff';
          var plPts = worldToCanvas(plateZ, 0);
          gfx.fillRect(plPts[0] - 10, plPts[1] - 4, 20, 8);
          // Strike zone (dashed box ABOVE the plate)
          var szTop = worldToCanvas(plateZ, STRIKE_ZONE.yMax);
          var szBot = worldToCanvas(plateZ, STRIKE_ZONE.yMin);
          gfx.strokeStyle = '#fbbf24';
          gfx.lineWidth = 2;
          gfx.setLineDash([6, 4]);
          gfx.strokeRect(plPts[0] - 14, szTop[1], 28, szBot[1] - szTop[1]);
          gfx.setLineDash([]);
          // Labels
          gfx.fillStyle = '#cbd5e1';
          gfx.font = '11px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('60 ft 6 in →', (moundPts[0] + plPts[0]) / 2, marginT + fieldH + 22);
          gfx.fillText('Mound', moundPts[0], marginT + fieldH + 22);
          gfx.fillText('Plate', plPts[0], marginT + fieldH + 36);
        } else if (d.mode === 'freethrow' && (function() {
          var sp = SHOT_TYPES.find(function(s) { return s.id === d.shotType; });
          return sp && sp.kind === 'pass';
        })()) {
          // Passing court — passer on left, receiver silhouette on right at z=6m.
          // Same hardwood + plank lines from the free-throw scene; receiver is a
          // simple stick figure with a chest-band marker so students see the
          // target zone. The bounce-pass landing zone is shaded between
          // passer + receiver.
          var passReceiverZ = 6.0;
          var passerPts = worldToCanvas(0, 0);
          var receiverPts = worldToCanvas(passReceiverZ, 0);
          // Shaded "ideal bounce zone" — between 60-75% of the way to receiver
          var bzStart = worldToCanvas(passReceiverZ * 0.55, 0);
          var bzEnd = worldToCanvas(passReceiverZ * 0.78, 0);
          gfx.fillStyle = 'rgba(251, 191, 36, 0.18)';
          gfx.fillRect(bzStart[0], bzStart[1] - 6, bzEnd[0] - bzStart[0], 12);
          // Passer stick figure (you)
          gfx.strokeStyle = '#fbbf24';
          gfx.fillStyle = '#fbbf24';
          gfx.lineWidth = 2;
          var pHead = worldToCanvas(0, 1.7);
          var pHip = worldToCanvas(0, 1.0);
          var pFeet = worldToCanvas(0, 0);
          gfx.beginPath(); gfx.arc(pHead[0], pHead[1], 6, 0, Math.PI * 2); gfx.fill();
          gfx.beginPath();
          gfx.moveTo(pHead[0], pHead[1] + 6); gfx.lineTo(pHip[0], pHip[1]);
          gfx.moveTo(pHip[0], pHip[1]); gfx.lineTo(pFeet[0] - 6, pFeet[1]);
          gfx.moveTo(pHip[0], pHip[1]); gfx.lineTo(pFeet[0] + 6, pFeet[1]);
          gfx.stroke();
          // Receiver stick figure (teammate)
          gfx.strokeStyle = '#60a5fa';
          gfx.fillStyle = '#60a5fa';
          var rHead = worldToCanvas(passReceiverZ, 1.7);
          var rHip = worldToCanvas(passReceiverZ, 1.0);
          var rFeet = worldToCanvas(passReceiverZ, 0);
          gfx.beginPath(); gfx.arc(rHead[0], rHead[1], 6, 0, Math.PI * 2); gfx.fill();
          gfx.beginPath();
          gfx.moveTo(rHead[0], rHead[1] + 6); gfx.lineTo(rHip[0], rHip[1]);
          gfx.moveTo(rHip[0], rHip[1]); gfx.lineTo(rFeet[0] - 6, rFeet[1]);
          gfx.moveTo(rHip[0], rHip[1]); gfx.lineTo(rFeet[0] + 6, rFeet[1]);
          // Outstretched receiving arms (chest band marker)
          var rChestL = worldToCanvas(passReceiverZ - 0.4, 1.2);
          var rChestR = worldToCanvas(passReceiverZ + 0.4, 1.2);
          gfx.moveTo(rHip[0], pHead[1] + 8); gfx.lineTo(rChestL[0], rChestL[1]);
          gfx.moveTo(rHip[0], pHead[1] + 8); gfx.lineTo(rChestR[0], rChestR[1]);
          gfx.stroke();
          // Chest-band target zone (dashed box at receiver, y in [0.6, 1.6])
          var cbTop = worldToCanvas(passReceiverZ, 1.6);
          var cbBot = worldToCanvas(passReceiverZ, 0.6);
          gfx.strokeStyle = '#60a5fa';
          gfx.setLineDash([4, 3]);
          gfx.strokeRect(cbTop[0] - 12, cbTop[1], 24, cbBot[1] - cbTop[1]);
          gfx.setLineDash([]);
          // Labels
          gfx.fillStyle = '#cbd5e1';
          gfx.font = '11px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('You', passerPts[0], marginT + fieldH + 22);
          gfx.fillText('6 m to teammate →', (passerPts[0] + receiverPts[0]) / 2, marginT + fieldH + 22);
          gfx.fillText('Teammate', receiverPts[0], marginT + fieldH + 36);
          if (d.shotType === 'bouncepass') {
            gfx.fillStyle = 'rgba(251, 191, 36, 0.85)';
            gfx.fillText('Aim bounce here →', (bzStart[0] + bzEnd[0]) / 2, bzStart[1] - 12);
          }
        } else if (d.mode === 'freethrow') {
          // Free Throw rendering: shooter on left, hoop + backboard on right
          var ftLineZ = modeMeta.targetZ;
          var rimZ = modeMeta.rimZ;
          var rimY = modeMeta.rimY;
          var rimRadius = modeMeta.rimRadius;
          // Free throw line marker on the floor
          var ftLinePts = worldToCanvas(0, 0);
          var ftPlPts = worldToCanvas(ftLineZ, 0);
          gfx.strokeStyle = '#fafafa';
          gfx.lineWidth = 2;
          gfx.beginPath();
          gfx.moveTo(ftLinePts[0] - 18, ftLinePts[1]);
          gfx.lineTo(ftLinePts[0] + 18, ftLinePts[1]);
          gfx.stroke();
          // Backboard (white rectangle behind rim)
          var bbBot = worldToCanvas(rimZ + 0.10, rimY - 0.30);
          var bbTop = worldToCanvas(rimZ + 0.10, rimY + 1.05);
          gfx.fillStyle = '#fafafa';
          gfx.fillRect(bbBot[0] - 1, bbTop[1], 6, bbBot[1] - bbTop[1]);
          // Backboard square (small painted target on glass)
          gfx.strokeStyle = '#dc2626';
          gfx.lineWidth = 2;
          var sqL = worldToCanvas(rimZ + 0.09, rimY + 0.45);
          var sqR = worldToCanvas(rimZ + 0.09, rimY + 0.05);
          gfx.strokeRect(sqL[0] - 12, sqL[1], 24, sqR[1] - sqL[1]);
          // Rim (orange horizontal bar at rim height) + net hash
          var rimLeft = worldToCanvas(rimZ - rimRadius, rimY);
          var rimRight = worldToCanvas(rimZ + rimRadius, rimY);
          gfx.strokeStyle = '#f97316';
          gfx.lineWidth = 4;
          gfx.beginPath();
          gfx.moveTo(rimLeft[0], rimLeft[1]);
          gfx.lineTo(rimRight[0], rimRight[1]);
          gfx.stroke();
          // Net (dashed lines hanging down from rim)
          gfx.strokeStyle = 'rgba(255,255,255,0.7)';
          gfx.lineWidth = 1;
          gfx.setLineDash([3, 3]);
          var netBot = worldToCanvas(rimZ, rimY - 0.35);
          gfx.beginPath();
          gfx.moveTo(rimLeft[0], rimLeft[1]); gfx.lineTo(netBot[0] - 4, netBot[1]);
          gfx.moveTo(rimRight[0], rimRight[1]); gfx.lineTo(netBot[0] + 4, netBot[1]);
          gfx.moveTo((rimLeft[0] + rimRight[0]) / 2, rimLeft[1]); gfx.lineTo(netBot[0], netBot[1]);
          gfx.stroke();
          gfx.setLineDash([]);
          // Pole (gray vertical from floor to backboard top)
          gfx.fillStyle = '#475569';
          var poleX = bbTop[0] + 6;
          var poleBot = worldToCanvas(rimZ + 0.10, 0);
          gfx.fillRect(poleX, bbTop[1], 4, poleBot[1] - bbTop[1]);
          // Labels
          gfx.fillStyle = '#cbd5e1';
          gfx.font = '11px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('FT line', ftLinePts[0], marginT + fieldH + 22);
          gfx.fillText('15 ft to backboard →', (ftLinePts[0] + ftPlPts[0]) / 2, marginT + fieldH + 22);
          gfx.fillText('Hoop', ftPlPts[0], marginT + fieldH + 36);
        } else if (d.mode === 'fieldgoal') {
          // Side-view field goal scene: kicker on left (z=0), goalposts at fgGoalZ.
          // Hash-marked field every 10 yards so distance reads at a glance.
          var hashCb = modeMeta.crossbarHeight;
          // Hash marks on the field (every 10 yd, in m: 10yd ≈ 9.14m)
          gfx.fillStyle = 'rgba(255,255,255,0.4)';
          gfx.font = '9px system-ui';
          gfx.textAlign = 'center';
          for (var hyd = 10; hyd < d.fgDistanceYd + 6; hyd += 10) {
            var hzm = hyd * 0.9144;
            if (hzm > renderMaxZ) break;
            var hpos = worldToCanvas(hzm, 0);
            gfx.fillRect(hpos[0] - 0.5, hpos[1] - 4, 1, 8);
            gfx.fillText(hyd + ' yd', hpos[0], marginT + fieldH + 14);
          }
          // Tee + ball spot at z=0
          var teePts = worldToCanvas(0, 0);
          gfx.fillStyle = '#fef3c7';
          gfx.beginPath(); gfx.ellipse(teePts[0], teePts[1], 6, 3, 0, 0, Math.PI * 2); gfx.fill();
          // Goalposts: vertical uprights at fgGoalZ rising to (canvas) above crossbar.
          // Side view: only one upright is visible from the side, but we draw a small
          // depth offset so both posts read as a "Y" frame.
          var postBase = worldToCanvas(fgGoalZ, 0);
          var crossbar = worldToCanvas(fgGoalZ, hashCb);
          var postTop = worldToCanvas(fgGoalZ, hashCb + 4);
          gfx.strokeStyle = '#fde047';
          gfx.lineWidth = 4;
          gfx.beginPath();
          // Single base post (gooseneck base)
          gfx.moveTo(postBase[0], postBase[1]); gfx.lineTo(crossbar[0], crossbar[1]);
          // Crossbar (a short horizontal stub since this is side view; the whole
          // crossbar + uprights extend toward + away from the camera)
          gfx.moveTo(crossbar[0] - 14, crossbar[1]); gfx.lineTo(crossbar[0] + 14, crossbar[1]);
          // Two uprights rising from the crossbar (front + back)
          gfx.moveTo(crossbar[0] - 14, crossbar[1]); gfx.lineTo(crossbar[0] - 14, postTop[1]);
          gfx.moveTo(crossbar[0] + 14, crossbar[1]); gfx.lineTo(crossbar[0] + 14, postTop[1]);
          gfx.stroke();
          // Crossbar height label (10 ft)
          gfx.fillStyle = '#fde047';
          gfx.font = '10px system-ui';
          gfx.textAlign = 'right';
          gfx.fillText('10 ft →', crossbar[0] - 18, crossbar[1] + 3);
          // Distance label (centered between tee + posts)
          gfx.fillStyle = '#cbd5e1';
          gfx.font = '12px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText(d.fgDistanceYd + ' yd', (teePts[0] + postBase[0]) / 2, marginT + fieldH + 28);
        } else if (d.mode === 'freekick') {
          // Top-down free-kick scene: ball at left (z=0), wall at z=9.15m,
          // goal at z=22m. Centerline = canvas vertical center.
          var goalLineZ = modeMeta.targetZ;
          // Pitch markings — penalty area arc and centerline
          gfx.strokeStyle = 'rgba(255,255,255,0.55)';
          gfx.lineWidth = 1;
          // Centerline (helps reading lateral curve)
          var cl = worldToCanvas(0, 0);
          var clEnd = worldToCanvas(renderMaxZ, 0);
          gfx.setLineDash([4, 4]);
          gfx.beginPath();
          gfx.moveTo(cl[0], cl[1]); gfx.lineTo(clEnd[0], clEnd[1]);
          gfx.stroke();
          gfx.setLineDash([]);
          // Ball spot (small white circle at z=0, x=0)
          var ballSpot = worldToCanvas(0, 0);
          gfx.fillStyle = '#fafafa';
          gfx.beginPath(); gfx.arc(ballSpot[0], ballSpot[1], 4, 0, Math.PI * 2); gfx.fill();
          // Defender wall — 4 silhouettes shoulder-to-shoulder at z = wallZ.
          // Each defender ~ 0.5m wide; total wall ~ 2m (centered).
          var wallLeftEdge = worldToCanvas(modeMeta.wallZ, -modeMeta.wallHalfWidth);
          var wallRightEdge = worldToCanvas(modeMeta.wallZ, modeMeta.wallHalfWidth);
          gfx.fillStyle = '#1e293b';
          gfx.fillRect(wallLeftEdge[0] - 2, wallRightEdge[1], 4, wallLeftEdge[1] - wallRightEdge[1]);
          // Defender heads (4 small circles along the wall)
          gfx.fillStyle = '#cbd5e1';
          for (var di = 0; di < 4; di++) {
            var dt = (di + 0.5) / 4;
            var dx = -modeMeta.wallHalfWidth + dt * (modeMeta.wallHalfWidth * 2);
            var dpos = worldToCanvas(modeMeta.wallZ, dx);
            gfx.beginPath(); gfx.arc(dpos[0], dpos[1], 5, 0, Math.PI * 2); gfx.fill();
          }
          // Goal mouth — white posts at z=22m, x=±3.66m (FIFA goal)
          var postL = worldToCanvas(goalLineZ, -modeMeta.goalHalfWidth);
          var postR = worldToCanvas(goalLineZ, modeMeta.goalHalfWidth);
          gfx.strokeStyle = '#fafafa';
          gfx.lineWidth = 4;
          gfx.beginPath();
          gfx.moveTo(postL[0], postL[1] - 12); gfx.lineTo(postL[0], postL[1] + 12);
          gfx.moveTo(postR[0], postR[1] - 12); gfx.lineTo(postR[0], postR[1] + 12);
          // Crossbar (between posts, drawn as a single horizontal line on top-down)
          gfx.moveTo(postL[0], postL[1]); gfx.lineTo(postR[0], postR[1]);
          gfx.stroke();
          // Net (subtle hatch behind the goal line)
          gfx.strokeStyle = 'rgba(255,255,255,0.25)';
          gfx.lineWidth = 1;
          for (var nh = -2; nh <= 2; nh++) {
            var nh1 = worldToCanvas(goalLineZ, nh * 1.5);
            var nh2 = worldToCanvas(goalLineZ + 1.5, nh * 1.5);
            gfx.beginPath(); gfx.moveTo(nh1[0], nh1[1]); gfx.lineTo(nh2[0], nh2[1]); gfx.stroke();
          }
          // Distance + label
          gfx.fillStyle = '#fafafa';
          gfx.font = '11px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('Ball', ballSpot[0], ballSpot[1] + 16);
          gfx.fillText('Wall (10 yd)', (wallLeftEdge[0] + wallRightEdge[0]) / 2, marginT + fieldH + 18);
          gfx.fillText('Goal — 7.32 m wide', (postL[0] + postR[0]) / 2, marginT + fieldH + 18);
        } else if (d.mode === 'volleyball') {
          // Volleyball court (side view): server's line at z=0, net at z=9m,
          // far end-line at z=18m. Receiving court (z=9 to z=18) shaded
          // light blue. Ace zone (deep ~15% of court) shaded brighter.
          var serverPts = worldToCanvas(0, 0);
          var netBase = worldToCanvas(modeMeta.netZ, 0);
          var netTop = worldToCanvas(modeMeta.netZ, modeMeta.netHeight);
          var farLine = worldToCanvas(modeMeta.targetZ, 0);
          var aceStart = worldToCanvas(modeMeta.targetZ - (modeMeta.targetZ - modeMeta.netZ) * 0.15, 0);
          // Receiving court band — light blue
          gfx.fillStyle = 'rgba(96,165,250,0.20)';
          gfx.fillRect(netBase[0], netBase[1] - 3, farLine[0] - netBase[0], 6);
          // Ace zone (deep section, brighter)
          gfx.fillStyle = 'rgba(34,197,94,0.30)';
          gfx.fillRect(aceStart[0], aceStart[1] - 4, farLine[0] - aceStart[0], 8);
          // Net (vertical line) + tape at the top
          gfx.strokeStyle = '#1a1a1a';
          gfx.lineWidth = 2;
          gfx.beginPath();
          gfx.moveTo(netBase[0], netBase[1]); gfx.lineTo(netTop[0], netTop[1]);
          gfx.stroke();
          gfx.fillStyle = '#fafafa';
          gfx.fillRect(netTop[0] - 3, netTop[1] - 2, 6, 4);
          // Server's end-line + far end-line (white floor markings)
          gfx.strokeStyle = '#fafafa';
          gfx.lineWidth = 2;
          gfx.beginPath();
          gfx.moveTo(serverPts[0] - 14, serverPts[1]); gfx.lineTo(serverPts[0] + 14, serverPts[1]);
          gfx.moveTo(farLine[0] - 14, farLine[1]); gfx.lineTo(farLine[0] + 14, farLine[1]);
          gfx.stroke();
          // Labels
          gfx.fillStyle = '#cbd5e1';
          gfx.font = '11px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('Server', serverPts[0], marginT + fieldH + 22);
          gfx.fillText('Net (2.43 m)', netBase[0], marginT + fieldH + 22);
          gfx.fillText('End line', farLine[0], marginT + fieldH + 22);
          gfx.fillStyle = 'rgba(34,197,94,0.85)';
          gfx.font = '10px system-ui';
          gfx.fillText('Ace zone', (aceStart[0] + farLine[0]) / 2, aceStart[1] - 8);
        } else if (d.mode === 'golf') {
          // Golf side view: tee on left at z=0, fairway zone (light green
          // band) from ~75% target distance to the green, flagstick at the
          // exact target carry distance. Layered rings shade out into the
          // rough at the edges of the fairway. We draw the green as a
          // small disc and put a flag on top of it.
          var teePts = worldToCanvas(0, 0);
          // Tee marker (small triangle peg + ball on top)
          gfx.fillStyle = '#fef3c7';
          gfx.beginPath();
          gfx.moveTo(teePts[0] - 4, teePts[1] + 2);
          gfx.lineTo(teePts[0] + 4, teePts[1] + 2);
          gfx.lineTo(teePts[0], teePts[1] - 4);
          gfx.closePath();
          gfx.fill();
          gfx.fillStyle = '#fafafa';
          gfx.beginPath();
          gfx.arc(teePts[0], teePts[1] - 6, 3, 0, Math.PI * 2);
          gfx.fill();
          // Fairway zone: from ~10% to 100% of target distance, shaded brighter green
          var fwStart = worldToCanvas(golfTargetZ * 0.10, 0);
          var fwEnd = worldToCanvas(golfTargetZ + 13.7, 0); // +15 yd past target = top of fairway
          gfx.fillStyle = 'rgba(95, 168, 58, 0.55)';
          gfx.fillRect(fwStart[0], fwStart[1] - 4, fwEnd[0] - fwStart[0], 8);
          // Green disc at target distance — circular blob in plan, drawn as
          // a flat ellipse here (since side view) of radius ~4.5 m
          var greenCenter = worldToCanvas(golfTargetZ, 0);
          gfx.fillStyle = '#86efac';
          gfx.beginPath();
          gfx.ellipse(greenCenter[0], greenCenter[1], 14, 5, 0, 0, Math.PI * 2);
          gfx.fill();
          // Flagstick (vertical pole with red triangular flag)
          var flagBase = worldToCanvas(golfTargetZ, 0);
          var flagTop = worldToCanvas(golfTargetZ, 2.1);
          gfx.strokeStyle = '#fafafa';
          gfx.lineWidth = 1.5;
          gfx.beginPath();
          gfx.moveTo(flagBase[0], flagBase[1]); gfx.lineTo(flagTop[0], flagTop[1]);
          gfx.stroke();
          gfx.fillStyle = '#dc2626';
          gfx.beginPath();
          gfx.moveTo(flagTop[0], flagTop[1]);
          gfx.lineTo(flagTop[0] + 14, flagTop[1] + 4);
          gfx.lineTo(flagTop[0], flagTop[1] + 8);
          gfx.closePath();
          gfx.fill();
          // Distance markers — every 50 yards from tee, faint dashed verticals
          gfx.strokeStyle = 'rgba(255,255,255,0.20)';
          gfx.setLineDash([2, 4]);
          gfx.lineWidth = 1;
          var distMarks = [50, 100, 150, 200, 250];
          for (var dm = 0; dm < distMarks.length; dm++) {
            var dz = distMarks[dm] * 0.9144;
            if (dz > golfTargetZ + 25) break;
            var dpTop = worldToCanvas(dz, maxB * 0.5);
            var dpBot = worldToCanvas(dz, 0);
            gfx.beginPath();
            gfx.moveTo(dpTop[0], dpTop[1]); gfx.lineTo(dpBot[0], dpBot[1]);
            gfx.stroke();
            gfx.fillStyle = 'rgba(203, 213, 225, 0.6)';
            gfx.font = '9px system-ui';
            gfx.textAlign = 'center';
            gfx.fillText(distMarks[dm] + 'y', dpTop[0], dpTop[1] - 4);
          }
          gfx.setLineDash([]);
          // Labels
          gfx.fillStyle = '#cbd5e1';
          gfx.font = '11px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('Tee', teePts[0], marginT + fieldH + 22);
          gfx.fillText((d.golfClub === 'wedge' ? 85 : d.golfClub === 'iron' ? 150 : d.golfClub === 'fairway' ? 210 : 250) + ' yd target →', (teePts[0] + greenCenter[0]) / 2, marginT + fieldH + 22);
          gfx.fillStyle = '#86efac';
          gfx.fillText('Green', greenCenter[0], marginT + fieldH + 36);
        } else if (d.mode === 'bowling') {
          // Cricket pitch (side view): bowler's crease at z=0, batter's stumps
          // at z=20.12. Brown rectangle for the pitch strip ("the wicket").
          // Stumps drawn as 3 vertical sticks at the far end (71 cm tall).
          // "Good length" zone shaded between the bowler and batter — that's
          // where you WANT to pitch the ball for a good delivery.
          var pitchEnd = worldToCanvas(modeMeta.targetZ, 0);
          var bowlerCrease = worldToCanvas(0, 0);
          // "Good length" zone: 5-8 m from the batter's stumps = 12-15 m from bowler.
          // (Pitching the ball there = ball reaches batter at knee/thigh height.)
          var goodLenStart = worldToCanvas(modeMeta.targetZ - 8, 0);
          var goodLenEnd = worldToCanvas(modeMeta.targetZ - 5, 0);
          // Pitch strip — slightly darker than the surrounding ground
          gfx.fillStyle = '#7a5837';
          gfx.fillRect(bowlerCrease[0], bowlerCrease[1] - 3, pitchEnd[0] - bowlerCrease[0], 6);
          // Good-length zone shading
          gfx.fillStyle = 'rgba(251, 191, 36, 0.22)';
          gfx.fillRect(goodLenStart[0], goodLenStart[1] - 6, goodLenEnd[0] - goodLenStart[0], 12);
          // Bowler's popping crease (white horizontal mark at z=0)
          gfx.strokeStyle = '#fafafa';
          gfx.lineWidth = 2;
          gfx.beginPath();
          gfx.moveTo(bowlerCrease[0] - 14, bowlerCrease[1]);
          gfx.lineTo(bowlerCrease[0] + 14, bowlerCrease[1]);
          gfx.stroke();
          // Batter's popping crease at z=targetZ-1.22 (the 4-foot batter zone)
          var batterCrease = worldToCanvas(modeMeta.targetZ - 1.22, 0);
          gfx.beginPath();
          gfx.moveTo(batterCrease[0] - 14, batterCrease[1]);
          gfx.lineTo(batterCrease[0] + 14, batterCrease[1]);
          gfx.stroke();
          // Stumps at z=targetZ — three vertical sticks rising 71.1 cm
          var stumpsTop = worldToCanvas(modeMeta.targetZ, modeMeta.stumpsHeight);
          gfx.strokeStyle = '#e5e5e5';
          gfx.lineWidth = 3;
          gfx.beginPath();
          gfx.moveTo(pitchEnd[0] - 6, pitchEnd[1]); gfx.lineTo(pitchEnd[0] - 6, stumpsTop[1]);
          gfx.moveTo(pitchEnd[0],     pitchEnd[1]); gfx.lineTo(pitchEnd[0],     stumpsTop[1]);
          gfx.moveTo(pitchEnd[0] + 6, pitchEnd[1]); gfx.lineTo(pitchEnd[0] + 6, stumpsTop[1]);
          gfx.stroke();
          // Bails on top — two thin horizontal lines bridging the stumps
          gfx.strokeStyle = '#d4a574';
          gfx.lineWidth = 1.5;
          gfx.beginPath();
          gfx.moveTo(pitchEnd[0] - 7, stumpsTop[1]); gfx.lineTo(pitchEnd[0] + 1, stumpsTop[1]);
          gfx.moveTo(pitchEnd[0] - 1, stumpsTop[1]); gfx.lineTo(pitchEnd[0] + 7, stumpsTop[1]);
          gfx.stroke();
          // Labels
          gfx.fillStyle = '#cbd5e1';
          gfx.font = '11px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('Bowler', bowlerCrease[0], marginT + fieldH + 22);
          gfx.fillText('22 yd pitch →', (bowlerCrease[0] + pitchEnd[0]) / 2, marginT + fieldH + 22);
          gfx.fillText('Stumps', pitchEnd[0], marginT + fieldH + 36);
          gfx.fillStyle = 'rgba(251, 191, 36, 0.85)';
          gfx.font = '10px system-ui';
          gfx.fillText('Good length', (goodLenStart[0] + goodLenEnd[0]) / 2, goodLenStart[1] - 12);
        }

        // ── Wind indicator (outdoor modes only, when wind is on) ──
        // Small compass-style arrow + speed label in the upper-right of the
        // canvas. Only renders when wind is non-zero so calm scenes stay
        // clean. Direction matches the simulator's convention (0° = headwind
        // pointing toward the thrower / down on the canvas in side-view).
        if ((d.mode === 'freekick' || d.mode === 'fieldgoal' || d.mode === 'bowling' || d.mode === 'golf') && (d.windMph || 0) > 0) {
          var wIndW = 60, wIndH = 60;
          var wcx = W - 20 - wIndW / 2;
          var wcy = 20 + wIndH / 2;
          // Background card
          gfx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          gfx.strokeStyle = '#475569';
          gfx.lineWidth = 1;
          gfx.beginPath(); gfx.roundRect ? gfx.roundRect(wcx - wIndW / 2, wcy - wIndH / 2, wIndW, wIndH, 6) : gfx.rect(wcx - wIndW / 2, wcy - wIndH / 2, wIndW, wIndH);
          gfx.fill(); gfx.stroke();
          // Arrow direction: pointing in the direction the wind BLOWS toward.
          // Convention used by sim: 0° = headwind = wind blows in -Z
          // direction (= toward the thrower). On the side-view canvas, +Z
          // is to the right, so a 0° headwind arrow should point LEFT.
          // Top-down (free kick) view: +Z is to the right too. So same
          // direction convention works.
          var wDeg = d.windDirDeg || 0;
          // Math.cos(0)=1, sin(0)=0. We want 0° → arrow points left (-X) so:
          var arx = -Math.cos(wDeg * Math.PI / 180);
          var ary = -Math.sin(wDeg * Math.PI / 180);
          var arLen = 18;
          gfx.strokeStyle = '#60a5fa';
          gfx.fillStyle = '#60a5fa';
          gfx.lineWidth = 2.5;
          gfx.beginPath();
          gfx.moveTo(wcx - arx * arLen / 2, wcy - ary * arLen / 2);
          gfx.lineTo(wcx + arx * arLen / 2, wcy + ary * arLen / 2);
          gfx.stroke();
          // Arrowhead
          var ahead = arLen / 2;
          var perpX = -ary, perpY = arx;
          gfx.beginPath();
          gfx.moveTo(wcx + arx * ahead, wcy + ary * ahead);
          gfx.lineTo(wcx + arx * (ahead - 5) + perpX * 4, wcy + ary * (ahead - 5) + perpY * 4);
          gfx.lineTo(wcx + arx * (ahead - 5) - perpX * 4, wcy + ary * (ahead - 5) - perpY * 4);
          gfx.closePath();
          gfx.fill();
          // Speed label
          gfx.fillStyle = '#cbd5e1';
          gfx.font = 'bold 10px system-ui';
          gfx.textAlign = 'center';
          gfx.fillText('Wind', wcx, wcy - 22);
          gfx.fillText(d.windMph + ' mph', wcx, wcy + 25);
        }

        // ── Saved REFERENCE trajectories (multi-ghost Compare Mode) ──
        // Drawn FIRST so they sit behind the current trajectory + no-spin
        // guide. Each ghost gets its own color from the saved entry; the
        // tag is "REF1" / "REF2" / etc. so students can map the colored
        // line to the entry in the saved list. Backwards compat: if no
        // referenceList but a legacy referenceResult exists, render that.
        var refList = (d.referenceList && d.referenceList.length)
          ? d.referenceList
          : (d.referenceResult ? [{ result: d.referenceResult, label: d.referenceLabel, color: '#d946ef' }] : []);
        refList.forEach(function(ref, refIdx) {
          var rrSamples = ref.result && ref.result.samples;
          if (!rrSamples || rrSamples.length < 2) return;
          gfx.strokeStyle = ref.color || '#d946ef';
          gfx.globalAlpha = 0.55;
          gfx.lineWidth = 2;
          gfx.setLineDash([6, 5]);
          gfx.beginPath();
          for (var ri = 0; ri < rrSamples.length; ri++) {
            var rs = rrSamples[ri];
            if (rs.z > renderMaxZ + 0.5) break;
            var rp = worldToCanvas(rs.z, sampleB(rs));
            if (ri === 0) gfx.moveTo(rp[0], rp[1]); else gfx.lineTo(rp[0], rp[1]);
          }
          gfx.stroke();
          gfx.setLineDash([]);
          gfx.globalAlpha = 1.0;
          // "REF1" / "REF2" tag near the trajectory's end-of-render point
          var lastRef = rrSamples[rrSamples.length - 1];
          for (var rj = rrSamples.length - 1; rj >= 0; rj--) {
            if (rrSamples[rj].z <= renderMaxZ + 0.5) { lastRef = rrSamples[rj]; break; }
          }
          var refTagPos = worldToCanvas(lastRef.z, sampleB(lastRef));
          gfx.fillStyle = ref.color || '#d946ef';
          gfx.font = 'bold 10px system-ui';
          gfx.textAlign = 'left';
          gfx.fillText('REF' + (refIdx + 1), refTagPos[0] + 6, refTagPos[1] + 3);
        });

        // No-spin reference trajectory (gray, dashed) — only when there's a result
        var lr = d.lastResult;
        if (lr && d.showPhysics) {
          var noSpin = simulatePitch({
            ball: modeMeta.ball,
            speedMph: d.speedMph, releaseHeight: d.releaseHeight,
            aimDegV: d.aimDegV, aimDegH: d.aimDegH,
            spinRpm: 0, spinAxisDeg: 0,
            throwerHand: d.throwerHand,
            targetZ: modeMeta.targetZ,
            releaseStride: modeMeta.releaseStrideDefault,
            windMph: d.windMph || 0, windDirDeg: d.windDirDeg || 0,
            truncateAtTarget: d.mode === 'pitching',
            gravity: (function() {
              var p = GRAVITY_PRESETS.find(function(g) { return g.id === (d.gravityId || 'earth'); });
              return p ? p.g : G;
            })()
          });
          gfx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
          gfx.lineWidth = 1.5;
          gfx.setLineDash([4, 4]);
          gfx.beginPath();
          for (var i = 0; i < noSpin.samples.length; i++) {
            var s = noSpin.samples[i];
            if (s.z > renderMaxZ) break;
            var p = worldToCanvas(s.z, sampleB(s));
            if (i === 0) gfx.moveTo(p[0], p[1]); else gfx.lineTo(p[0], p[1]);
          }
          gfx.stroke();
          gfx.setLineDash([]);
        }

        // Actual trajectory (color by outcome — palette per mode).
        if (lr) {
          var trajColor;
          if (d.mode === 'freethrow') {
            trajColor = lr.location === 'swish' ? '#10b981'
                      : lr.location === 'made' ? '#3b82f6'
                      : lr.location === 'caught' ? '#10b981'
                      : (lr.location === 'highpass' || lr.location === 'lowpass') ? '#fbbf24'
                      : lr.location === 'wrongbounce' ? '#f97316'
                      : lr.location === 'rim' ? '#fbbf24'
                      : lr.location === 'backboard' ? '#94a3b8'
                      : '#ef4444';
          } else if (d.mode === 'freekick') {
            trajColor = lr.location === 'goal' ? '#10b981'
                      : lr.location === 'post' ? '#fbbf24'
                      : lr.location === 'blocked' ? '#94a3b8'
                      : '#ef4444';
          } else if (d.mode === 'fieldgoal') {
            trajColor = lr.location === 'good' ? '#10b981'
                      : lr.location === 'doink' ? '#fbbf24'
                      : lr.location === 'wideclose' ? '#f97316'
                      : '#ef4444';
          } else {
            trajColor = lr.location === 'strike' ? '#10b981'
                      : lr.location === 'borderline' ? '#fbbf24'
                      : lr.location === 'ball' ? '#94a3b8'
                      : '#ef4444';
          }
          gfx.strokeStyle = trajColor;
          gfx.lineWidth = 2.5;
          gfx.beginPath();
          var renderUpTo = d.replayActive ? Math.floor(lr.samples.length * Math.min(1, d.replayT)) : lr.samples.length;
          for (var j = 0; j < renderUpTo; j++) {
            var sj = lr.samples[j];
            if (sj.z > renderMaxZ + 0.5) break;
            var pj = worldToCanvas(sj.z, sampleB(sj));
            if (j === 0) gfx.moveTo(pj[0], pj[1]); else gfx.lineTo(pj[0], pj[1]);
          }
          gfx.stroke();
          // Ball at the leading edge of the trajectory
          if (renderUpTo > 0) {
            var ballSample = lr.samples[Math.min(renderUpTo - 1, lr.samples.length - 1)];
            var bp = worldToCanvas(ballSample.z, sampleB(ballSample));
            gfx.fillStyle = '#fafafa';
            gfx.beginPath();
            gfx.arc(bp[0], bp[1], 5, 0, Math.PI * 2);
            gfx.fill();
            gfx.strokeStyle = '#dc2626';
            gfx.lineWidth = 1;
            gfx.stroke();
          }
        }
      }, [
        d.lastResult, d.replayActive, d.replayT,
        d.speedMph, d.releaseHeight, d.aimDegV, d.aimDegH,
        d.spinRpm, d.spinAxisDeg, d.throwerHand, d.showPhysics,
        d.referenceResult, d.mode, d.fgDistanceYd,
        d.windMph, d.windDirDeg, d.gravityId
      ]);

      // ── Space-key hotkey for throw/shoot/kick ──
      // WCAG 2.1.1 Keyboard: the throw button is already keyboard-reachable,
      // but power users want a single-key shortcut. Listen on window so the
      // hotkey works regardless of whether a slider has focus. Skip when the
      // user is typing in an input that handles Space natively (none in this
      // tool, but defensive against future text inputs).
      React.useEffect(function() {
        function onKey(e) {
          if (e.key !== ' ' && e.code !== 'Space') return;
          var tag = e.target && e.target.tagName;
          if (tag === 'INPUT' && e.target.type !== 'range') return;
          if (tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
          e.preventDefault();
          throwPitch();
        }
        window.addEventListener('keydown', onKey);
        return function() { window.removeEventListener('keydown', onKey); };
      }, [d.mode, d.speedMph, d.releaseHeight, d.aimDegV, d.aimDegH, d.spinRpm, d.spinAxisDeg, d.fgDistanceYd]);

      // ── Replay animator: walk replayT from 0 → 1 over ~1s ──
      // WCAG 2.3.3 (Animation from Interactions): if the user prefers reduced
      // motion, skip the replay walk and snap straight to the final trajectory.
      // The CSS guard at the top of the IIFE only handles CSS animations; the
      // canvas trajectory is JS-driven so we have to honor the preference here.
      React.useEffect(function() {
        if (!d.replayActive) return;
        var prefersReduced = false;
        try {
          prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {}
        if (prefersReduced) {
          // Snap to end immediately
          upd('replayT', 1);
          upd('replayActive', false);
          return;
        }
        var start = performance.now();
        var raf;
        // Slow-mo extends the 0→1 walk from 1.0s to 3.5s when toggled.
        // Same data, same trajectory — just three-and-a-half-times more
        // dwell time so students can SEE the curl / drop / break unfold.
        // Sports-broadcast aesthetic: the replay reveals what was too
        // fast to perceive at full speed.
        var dur = d.slowMoActive ? 3.5 : 1.0;
        function step() {
          var t = (performance.now() - start) / 1000;
          var prog = Math.min(1, t / dur);
          upd('replayT', prog);
          if (prog < 1) {
            raf = requestAnimationFrame(step);
          } else {
            upd('replayActive', false);
          }
        }
        raf = requestAnimationFrame(step);
        return function() { if (raf) cancelAnimationFrame(raf); };
      }, [d.replayActive]);

      // ── UI ──────────────────────────────────────────────
      var currentPitch = PITCH_TYPES.find(function(p) { return p.id === d.pitchType; }) || PITCH_TYPES[0];

      function slider(label, value, min, max, step, onChange, suffix) {
        // WCAG 1.3.1 Info & Relationships: bind the visible label to the
        // <input type=range> via htmlFor + id so screen readers announce the
        // label when the slider gets focus. WCAG 4.1.2 Name, Role, Value:
        // aria-valuetext gives the live value with units (otherwise the SR
        // would read "92" instead of "92 mph").
        // Mode prefix on the ID protects against collisions if a future
        // refactor renders multiple modes' sliders simultaneously.
        var inputId = 'tl-' + d.mode + '-slider-' + label.replace(/\s+/g, '-').toLowerCase();
        return h('div', { style: { marginBottom: 10 } },
          h('label', {
            htmlFor: inputId,
            style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#cbd5e1', marginBottom: 4, cursor: 'pointer' }
          },
            h('span', null, label),
            h('span', { style: { color: '#fbbf24', fontWeight: 600 } }, value + (suffix || ''))
          ),
          h('input', {
            id: inputId,
            'data-tl-focusable': 'true',
            type: 'range', min: min, max: max, step: step, value: value,
            'aria-valuetext': value + (suffix || ''),
            onChange: function(e) { onChange(parseFloat(e.target.value)); },
            style: { width: '100%', accentColor: '#fbbf24' }
          })
        );
      }

      var lr = d.lastResult;
      var modeMeta = MODES[d.mode] || MODES.pitching;
      var isPitching = d.mode === 'pitching';
      var isFreeThrow = d.mode === 'freethrow';
      var isFreeKick = d.mode === 'freekick';
      var isFieldGoal = d.mode === 'fieldgoal';
      var isBowling = d.mode === 'bowling';
      var isGolf = d.mode === 'golf';
      var isVolleyball = d.mode === 'volleyball';
      // Active preset for the bottom-of-canvas teach blurb
      var currentShot = SHOT_TYPES.find(function(s) { return s.id === d.shotType; }) || SHOT_TYPES[0];
      var currentKick = KICK_TYPES.find(function(k) { return k.id === d.kickType; }) || KICK_TYPES[0];
      var currentGoal = GOAL_TYPES.find(function(g) { return g.id === d.goalType; }) || GOAL_TYPES[0];
      var currentBowl = CRICKET_DELIVERIES.find(function(b) { return b.id === d.bowlType; }) || CRICKET_DELIVERIES[0];
      var currentGolfClub = GOLF_TYPES.find(function(g) { return g.id === d.golfClub; }) || GOLF_TYPES[0];
      var currentVolley = VOLLEYBALL_TYPES.find(function(v) { return v.id === d.serveType; }) || VOLLEYBALL_TYPES[0];
      var activePreset = isPitching ? currentPitch
                       : isFreeThrow ? currentShot
                       : isFreeKick ? currentKick
                       : isFieldGoal ? currentGoal
                       : isBowling ? currentBowl
                       : isGolf ? currentGolfClub
                       : isVolleyball ? currentVolley
                       : currentGolfClub;

      // Outcome label + color (mode-specific)
      function outcomeLabel(loc) {
        if (isPitching) {
          return loc === 'strike' ? '🎯 STRIKE'
               : loc === 'borderline' ? '⚪ Borderline'
               : loc === 'ball' ? '⚾ Ball (outside zone)'
               : '😬 Wild pitch';
        }
        if (isFreeKick) {
          return loc === 'goal' ? '⚽ GOAL'
               : loc === 'post' ? '🥅 Off the post'
               : loc === 'over' ? '⬆️ Over the bar'
               : loc === 'wide' ? '↔️ Wide of the goal'
               : loc === 'blocked' ? '🧱 Blocked by the wall'
               : '😬 Short';
        }
        if (isFieldGoal) {
          return loc === 'good' ? '🏈 IT IS GOOD'
               : loc === 'doink' ? '🥁 DOINK'
               : loc === 'shortbar' ? '⬇️ Short — under the bar'
               : loc === 'wideclose' ? '↔️ No good — wide by inches'
               : loc === 'wide' ? '↔️ No good — wide'
               : '😬 Short of the line';
        }
        if (isBowling) {
          return loc === 'wicket' ? '🏏 WICKET — howzat!'
               : loc === 'shaved' ? '🏏 Bail-trembler (still out)'
               : loc === 'overhead' ? '⬆️ Over the bails (no-ball)'
               : loc === 'wide' ? '↔️ Wide call'
               : loc === 'dot' ? '⚪ Dot ball — defended'
               : '😬 Short of length';
        }
        if (isGolf) {
          return loc === 'green' ? '⛳ ON THE GREEN'
               : loc === 'fairway' ? '🌱 Fairway'
               : loc === 'rough' ? '🌾 In the rough'
               : loc === 'woods' ? '🌳 In the trees'
               : loc === 'short' ? '😬 Short of the green'
               : loc === 'long' ? '↔️ Over the green'
               : '😬 Topped';
        }
        if (isVolleyball) {
          return loc === 'ace' ? '🏐 ACE'
               : loc === 'in' ? '✅ In'
               : loc === 'net' ? '🪤 Net (service error)'
               : loc === 'long' ? '↔️ Long (past back line)'
               : loc === 'out' ? '↔️ Out wide'
               : '😬 Short';
        }
        // Pass outcomes (kind: 'pass' shot types) reuse this same function.
        return loc === 'swish' ? '🌊 SWISH (clean center)'
             : loc === 'made' ? '🏀 MADE IT'
             : loc === 'caught' ? '🤝 CAUGHT (chest height)'
             : loc === 'highpass' ? '⬆️ Sailed high'
             : loc === 'lowpass' ? '⬇️ Worm-burner'
             : loc === 'wrongbounce' ? '〰️ Wrong bounce style'
             : loc === 'rim' ? '〰️ Off the rim'
             : loc === 'backboard' ? '🪞 Off the backboard'
             : loc === 'short' ? '😬 Short'
             : loc === 'wide' ? '↔️ Wide'
             : loc === 'air' ? '💨 Airball (short)'
             : '😬 Miss';
      }
      // Dynamic explainer — generates outcome-specific feedback after a throw.
      // Combines what JUST happened (location, parameters) with the underlying
      // physics so the student gets coaching without needing a Gemini call.
      // Returns null when there's no result yet (we fall back to the static
      // grip/teach blurb of the active preset).
      function explainResult(lr) {
        if (!lr) return null;
        var loc = lr.location;
        // Pitching
        if (isPitching) {
          if (loc === 'strike') {
            var heightIn = Math.round((lr.outcome.plateY || 0) * 39.37);
            var lateralIn = Math.round(((lr.outcome.plateX || 0)) * 39.37);
            var lateralWord = Math.abs(lateralIn) < 2 ? 'right down the middle' : (lateralIn > 0 ? lateralIn + ' in to the throwing-arm side' : Math.abs(lateralIn) + ' in to the glove side');
            return 'Pitch crossed the plate ' + heightIn + ' in up, ' + lateralWord + '. ' + (lr.vBreakIn !== null && Math.abs(lr.vBreakIn) > 4 ? 'That ' + lr.vBreakIn.toFixed(1) + ' in of vertical break is the spin doing its job — Magnus pushing the ball ' + (lr.vBreakIn > 0 ? 'down (topspin)' : 'up (backspin)') + '.' : 'Spin had small effect at this speed.');
          }
          if (loc === 'borderline') return 'Just nicked the edge of the strike zone. Real umps would call this either way.';
          if (loc === 'ball') {
            var off = (lr.outcome.plateY < 0.45) ? 'low' : lr.outcome.plateY > 1.05 ? 'high' : Math.abs(lr.outcome.plateX) > 0.22 ? 'outside' : 'off-center';
            return 'Pitch missed ' + off + '. Adjust your release angle: try ' + (lr.outcome.plateY < 0.45 ? 'a higher release point or less negative vertical aim' : 'a lower release or more downward aim') + '.';
          }
          return 'Wild pitch. Either the angle was extreme or the spin axis pulled the ball off-target — try a smaller spin axis change next.';
        }
        // Free throw
        if (isFreeThrow) {
          if (loc === 'swish') return 'Clean swish! Your release angle (' + d.aimDegV.toFixed(1) + '°) and speed (' + d.speedMph + ' mph) line up perfectly for a 15 ft shot from ' + d.releaseHeight.toFixed(2) + ' m.';
          if (loc === 'made') return 'In with a friendly bounce. Your arc was close to ideal — backspin helped soften the rim contact.';
          if (loc === 'rim') {
            var apex = Math.max.apply(null, lr.samples.map(function(s) { return s.y; }));
            return 'Rim out. Apex was ' + apex.toFixed(2) + ' m. ' + (apex < 3.6 ? 'Try a higher arc — increase release angle by ~3°.' : 'Arc was OK — speed was the issue. Increase by ~1 mph.');
          }
          if (loc === 'backboard') return 'Backboard catch. Your shot was too hard or too flat — bank shots need a flatter angle, but your apex still has to clear the rim.';
          if (loc === 'air') return 'Airball — short of the rim entirely. You need either more speed or steeper release angle.';
          return 'Missed the rim. Most likely lateral aim was off.';
        }
        // Free kick
        if (isFreeKick) {
          var curlM = lr.samples ? (Math.max.apply(null, lr.samples.map(function(s) { return s.x; })) - Math.min.apply(null, lr.samples.map(function(s) { return s.x; }))) : 0;
          if (loc === 'goal') {
            return 'GOAL! Magnus curl bent the ball ' + curlM.toFixed(2) + ' m laterally — that\'s ' + (d.spinRpm > 400 ? 'classic Beckham work.' : 'a low-spin power finish.');
          }
          if (loc === 'post') return 'Inches from glory. Tweak spin axis by ±5° or speed by 1-2 mph and you\'ll find the net.';
          if (loc === 'over') return 'Over the bar. Reduce launch angle (vertical aim) by 4-6° or lower speed slightly.';
          if (loc === 'wide') return 'Wide of the goal. Either your aim was off or your spin axis curled the ball away from goal — flip the axis sign.';
          if (loc === 'blocked') return 'Wall block. The wall is at 9.15 m and ~1.7 m tall. You need either MORE arc (chip over) or MORE spin (curl around).';
          return 'Short of the goal line. Add 5-10 mph or steepen launch by 3-5°.';
        }
        // Field goal
        if (isFieldGoal) {
          var apexFG = Math.max.apply(null, lr.samples.map(function(s) { return s.y; }));
          if (loc === 'good') {
            return 'GOOD from ' + d.fgDistanceYd + ' yards. Peak height ' + apexFG.toFixed(1) + ' m. Optimal launch angle for this distance was around ' + (d.fgDistanceYd < 30 ? '38°' : d.fgDistanceYd < 45 ? '40°' : '42°') + ' — you used ' + d.aimDegV.toFixed(0) + '°.';
          }
          if (loc === 'doink') return 'Doink! The post or crossbar got it by inches. Move your speed up 1-2 mph or shift launch angle by 1-2°.';
          if (loc === 'shortbar') return 'Under the crossbar. You needed either more launch angle (try ' + Math.min(60, (d.aimDegV + 5)).toFixed(0) + '°) or more power.';
          if (loc === 'wideclose') return 'Just wide of the upright. Lateral aim is the lever here — check your horizontal aim slider.';
          if (loc === 'wide') return 'No good — well wide of the goalposts. Reset horizontal aim toward 0°.';
          return 'Short of the goal line — kick didn\'t carry the distance. Add power, or accept a shorter distance preset.';
        }
        // Volleyball
        if (isVolleyball) {
          if (loc === 'ace') return 'ACE! Deep corner — receiver had no chance. ' + (d.spinRpm > 800 ? 'Topspin (' + d.spinRpm + ' rpm) made the ball dive past the net.' : 'No-spin float wobble forced a misread.');
          if (loc === 'in') return 'Serve in. Receivable, but landed in court. To level up, aim for the deep corner (back 15% × outer 30% of the court) for an ace.';
          if (loc === 'net') return 'Hit the net. Net is 2.43 m at center; you cleared it ' + (d.aimDegV < 4 ? 'too flat — add 2-4° vertical aim' : 'narrowly') + '. Try ' + (d.aimDegV + 3).toFixed(0) + '° launch.';
          if (loc === 'out') return 'Wide of the sideline. Court is 9 m wide (±4.5 m). Reset horizontal aim toward 0°.';
          if (loc === 'long') return 'Past the back line. Reduce speed by 5-8 mph or ease back launch angle by 2-3°. Topspin would also pull the ball down faster.';
          return 'Short — landed on your side of the net. Add power (try ' + (d.speedMph + 8) + ' mph) or a steeper launch.';
        }
        // Golf
        if (isGolf) {
          var apexG = Math.max.apply(null, lr.samples.map(function(s) { return s.y; }));
          var landZ = lr.outcome && lr.outcome.landZ ? lr.outcome.landZ : null;
          var carryYd = currentGolfClub.carryYd;
          if (loc === 'green') {
            return 'On the green from ' + d.speedMph + ' mph ball speed. Apex ' + apexG.toFixed(1) + ' m. Backspin (' + d.spinRpm + ' rpm) created Magnus lift to keep the ball airborne and dropped it pin-high.';
          }
          if (loc === 'fairway') return 'In the fairway, just past pin distance. Tweak speed by 2-3 mph and you\'ll be on the green next time.';
          if (loc === 'rough') return 'In the rough — your line drifted off-center. Spin axis (' + d.spinAxisDeg + '°) is curving the ball; reset toward 0° for a straight shot.';
          if (loc === 'woods') return 'Way off-line. The spin axis or horizontal aim is the lever — drop them both toward 0° and rebuild your shot from straight.';
          if (loc === 'short') return 'Short of the ' + carryYd + '-yard target. Add 5-10 mph clubhead speed, or pick a longer club (one less number = ~10 more yards).';
          if (loc === 'long') return 'Flew the green. Either ease back on speed by 5 mph, or pick a shorter club (one more number = ~10 fewer yards).';
          return 'Topped or thinned — ball never got airborne. Increase launch angle by 5-8°.';
        }
        // Bowling
        if (isBowling) {
          var swingM = lr.samples ? (Math.max.apply(null, lr.samples.map(function(s) { return s.x; })) - Math.min.apply(null, lr.samples.map(function(s) { return s.x; }))) : 0;
          if (loc === 'wicket') {
            return 'WICKET! Ball clattered into the stumps at ' + d.speedMph + ' mph after ' + swingM.toFixed(2) + ' m of lateral swing. ' + (d.spinRpm > 2000 ? 'Spin axis ' + d.spinAxisDeg + '° produced classic finger/wrist deviation.' : 'Pace + line did the work — minimal swing needed.');
          }
          if (loc === 'shaved') return 'Bail-trembler — just clipped the stumps. Tighten line by ~5 cm and the next one is unmistakable.';
          if (loc === 'overhead') return 'Over the bails — that\'s a head-height ball, no-ball under test cricket rules. Lower your launch angle by 3-5°.';
          if (loc === 'wide') return 'Outside the wide line. Cricket\'s wide is ~46 cm from middle stump — your line drifted past that. Adjust horizontal aim toward 0°.';
          if (loc === 'dot') return 'Dot ball — the batter would defend this one. Good line and length but missed the stumps. Move ~10 cm closer to the off-stump line.';
          return 'Short of length — ball pitched too far in front of the batter. Increase release angle or reduce vertical aim by 2-3° for a fuller delivery.';
        }
        return null;
      }

      // ── Math view: physics formulas + values for the last throw ──
      // Renders a small panel of the actual equations the simulator runs
      // with the current ball / wind / gravity numbers slotted in. WCAG
      // 1.1.1: each formula is text (not an image), so screen readers can
      // announce them. Only renders when d.showFormulas is true.
      function formulasPanel(lr) {
        if (!d.showFormulas) return null;
        var ball = BALLS[modeMeta.ball] || BALLS.baseball;
        var area = Math.PI * ball.radius * ball.radius;
        var gp = GRAVITY_PRESETS.find(function(g) { return g.id === (d.gravityId || 'earth'); });
        var gV = gp ? gp.g : G;
        var v0 = d.speedMph / MPH_PER_MPS;
        var dragF = 0.5 * 1.225 * v0 * v0 * ball.cd * area;
        var magnusF = 0.5 * 1.225 * v0 * v0 * ball.cm * area;
        // Ideal no-drag range: R = v²·sin(2θ)/g (assumes y0 = 0, only valid
        // when launch + landing are at the same height — close enough for a
        // teaching estimate).
        var thetaRad = d.aimDegV * Math.PI / 180;
        var idealRange = (v0 * v0) * Math.sin(2 * Math.abs(thetaRad)) / gV;
        var actualRange = lr && lr.samples && lr.samples.length
          ? lr.samples[lr.samples.length - 1].z
          : null;
        var rowStyle = { fontSize: 11, color: '#cbd5e1', marginBottom: 4, fontFamily: 'system-ui' };
        var eqStyle = { fontSize: 11, color: '#fafafa', fontFamily: 'monospace' };
        var headStyle = { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 4, fontWeight: 600 };
        return h('section', {
          'aria-labelledby': 'tl-formulas-heading',
          style: { marginTop: 10, padding: 12, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10 }
        },
          h('h3', {
            id: 'tl-formulas-heading',
            style: { fontSize: 12, margin: 0, marginBottom: 6, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
          }, 'Math behind the throw'),
          // Gravity + ball params
          h('div', { style: rowStyle },
            'g = ',
            h('span', { style: { color: '#fbbf24', fontWeight: 700 } }, gV.toFixed(2)),
            ' m/s² (', gp ? gp.label : 'Earth', ')'),
          h('div', { style: rowStyle },
            'Ball: m = ', h('span', { style: { color: '#fbbf24' } }, ball.mass), ' kg, ',
            'r = ', h('span', { style: { color: '#fbbf24' } }, ball.radius), ' m, ',
            'Cd = ', h('span', { style: { color: '#fbbf24' } }, ball.cd.toFixed(2)), ', ',
            'Cm = ', h('span', { style: { color: '#fbbf24' } }, ball.cm.toFixed(2))),
          h('div', { style: rowStyle },
            'A = πr² = ', h('span', { style: { color: '#fbbf24' } }, area.toExponential(2)), ' m²'),
          // Drag
          h('div', { style: headStyle }, 'Drag force'),
          h('div', { style: eqStyle }, 'F_drag = ½·ρ·|v_rel|²·Cd·A'),
          h('div', { style: rowStyle, 'aria-label': 'At release, drag force is ' + dragF.toFixed(2) + ' newtons' },
            '  ≈ ', h('span', { style: { color: '#fbbf24' } }, dragF.toFixed(2)), ' N at release'),
          // Magnus
          h('div', { style: headStyle }, 'Magnus (lift) force'),
          h('div', { style: eqStyle }, 'F_mag = ½·ρ·|v_rel|²·Cm·A · (ω̂ × v̂)'),
          h('div', { style: rowStyle, 'aria-label': 'At release, Magnus force magnitude is ' + magnusF.toFixed(2) + ' newtons' },
            '  ≈ ', h('span', { style: { color: '#fbbf24' } }, magnusF.toFixed(2)), ' N (max possible at this speed)'),
          // Ideal vs actual range
          h('div', { style: headStyle }, 'Ideal (no-drag) range'),
          h('div', { style: eqStyle }, 'R = v²·sin(2θ)/g'),
          h('div', { style: rowStyle },
            '  ≈ ', h('span', { style: { color: '#fbbf24' } }, idealRange.toFixed(1)), ' m at θ = ', d.aimDegV.toFixed(1), '°',
            actualRange !== null ? h('span', null, ' · actual: ',
              h('span', { style: { color: '#fbbf24' } }, actualRange.toFixed(1)), ' m') : null,
            actualRange !== null && idealRange > 0
              ? h('span', { style: { color: '#94a3b8', fontStyle: 'italic' } },
                  ' (' + (((actualRange - idealRange) / idealRange) * 100).toFixed(0) + '% drag/Magnus delta)')
              : null
          ),
          // Bounce — coefficient of restitution
          h('div', { style: headStyle }, 'Bounce (coefficient of restitution)'),
          h('div', { style: eqStyle }, '|v_after| = e · |v_before|     KE_after = e²·KE_before'),
          h('div', { style: rowStyle },
            'e = ', h('span', { style: { color: '#fbbf24' } }, (ball.cor || 0).toFixed(2)),
            ' for a ', ball.label, ' on a regulation surface. ',
            h('span', { style: { color: '#94a3b8', fontStyle: 'italic' } },
              'A 1m drop bounces back ', ((ball.cor || 0) * (ball.cor || 0)).toFixed(2), ' m of height (energy retained).'))
        );
      }

      // ── Ball regulations + materials panel ──
      // Surfaced under the formulas panel when showFormulas is on. Each ball
      // spec is real (MLB / NBA / NFL / FIFA published rules) + a one-line
      // physics explanation tying the spec to its on-field consequence.
      function ballSpecsPanel() {
        if (!d.showFormulas) return null;
        var ball = BALLS[modeMeta.ball] || BALLS.baseball;
        var regs = ball.regs;
        if (!regs) return null;
        var rowStyle = { fontSize: 11, color: '#cbd5e1', marginBottom: 6 };
        var labelStyle = { color: '#94a3b8', fontWeight: 600, marginRight: 6 };
        return h('section', {
          'aria-labelledby': 'tl-regs-heading',
          style: { marginTop: 10, padding: 12, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10 }
        },
          h('h3', {
            id: 'tl-regs-heading',
            style: { fontSize: 12, margin: 0, marginBottom: 6, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
          }, ball.icon + ' ' + ball.label + ' regulations & materials'),
          h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 8, fontStyle: 'italic' } }, regs.league),
          h('div', { style: rowStyle }, h('span', { style: labelStyle }, 'Mass:'), regs.massSpec),
          h('div', { style: rowStyle }, h('span', { style: labelStyle }, 'Diameter:'), regs.diameterSpec),
          h('div', { style: rowStyle }, h('span', { style: labelStyle }, 'Pressure:'), regs.pressureSpec),
          h('div', { style: rowStyle }, h('span', { style: labelStyle }, 'Material:'), regs.material),
          h('div', { style: { marginTop: 8, padding: 8, background: '#1e293b', borderRadius: 6, fontSize: 11, color: '#cbd5e1' } },
            h('span', { style: { color: '#fbbf24', fontWeight: 700, marginRight: 6 } }, 'Why it matters:'),
            regs.physics)
        );
      }

      function outcomeColor(loc) {
        if (isPitching) {
          return loc === 'strike' ? '#10b981' : loc === 'borderline' ? '#fbbf24' : loc === 'ball' ? '#94a3b8' : '#ef4444';
        }
        if (isFreeKick) {
          return loc === 'goal' ? '#10b981' : loc === 'post' ? '#fbbf24' : loc === 'blocked' ? '#94a3b8' : '#ef4444';
        }
        if (isFieldGoal) {
          return loc === 'good' ? '#10b981' : loc === 'doink' ? '#fbbf24' : loc === 'wideclose' ? '#f97316' : '#ef4444';
        }
        // Pass outcomes reuse this palette: caught = green, high/low = yellow,
        // wrongbounce = orange, others = red.
        return loc === 'swish' ? '#10b981'
             : loc === 'made' ? '#3b82f6'
             : loc === 'caught' ? '#10b981'
             : loc === 'highpass' || loc === 'lowpass' ? '#fbbf24'
             : loc === 'wrongbounce' ? '#f97316'
             : loc === 'rim' ? '#fbbf24'
             : loc === 'backboard' ? '#94a3b8'
             : '#ef4444';
      }

      return h('div', { style: { padding: 16, color: '#f1f5f9', maxWidth: 1100, margin: '0 auto' } },
        // Header — mode-aware title
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          ArrowLeft && h('button', {
            onClick: function() { setStemLabTool && setStemLabTool(null); },
            'data-tl-focusable': 'true',
            'aria-label': 'Back to STEM Lab',
            style: { background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }
          }, '← Back'),
          h('h2', { style: { margin: 0, fontSize: 20 } }, modeMeta.icon + ' ThrowLab — ' + modeMeta.label),
          h('span', { style: { fontSize: 12, color: '#cbd5e1' } }, 'Same arm, different ball, different game.')
        ),

        // Mode picker — pill row, prominent under header. role=tablist makes
        // assistive-tech treat it as a single-select control group.
        h('div', { role: 'tablist', 'aria-label': 'Sport modes', style: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' } },
          Object.keys(MODES).map(function(mid) {
            var mm = MODES[mid];
            var sel = d.mode === mid;
            return h('button', {
              key: mid,
              role: 'tab',
              onClick: function() { switchMode(mid); },
              'aria-selected': sel,
              'data-tl-focusable': 'true',
              style: {
                padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                color: '#f1f5f9', fontSize: 13, fontWeight: 600
              }
            }, mm.icon + ' ' + mm.label);
          })
        ),

        // ── Scenarios ──
        // One-click teaching demos. Each pill snaps mode + preset +
        // gravity + wind into a configured setup. Useful as a warm-up
        // for class discussion: pick a scenario, throw it, talk about
        // the physics. Hidden behind a collapsed details so it doesn't
        // dominate the UI for students who want to free-explore.
        h('details', {
          style: { marginBottom: 14, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '8px 12px' }
        },
          h('summary', {
            style: { cursor: 'pointer', fontSize: 12, color: '#cbd5e1', fontWeight: 600 }
          }, '🎬 Scenarios — one-click teaching demos (' + SCENARIOS.length + ' built-in' + ((d.customScenarios || []).length ? ' + ' + (d.customScenarios || []).length + ' custom' : '') + ')'),
          h('div', {
            role: 'group', 'aria-label': 'Scenarios',
            style: { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }
          },
            SCENARIOS.map(function(sc) {
              return h('button', {
                key: 'sc-' + sc.id,
                onClick: function() { applyScenario(sc.id); },
                'aria-label': sc.label + ' scenario: ' + sc.teach,
                'data-tl-focusable': 'true',
                title: sc.teach,
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid #334155',
                  background: '#1e293b',
                  color: '#f1f5f9', fontSize: 11, fontWeight: 600
                }
              }, sc.icon + ' ' + sc.label);
            }).concat(
              // Custom scenarios — same pill style + small delete button
              (d.customScenarios || []).map(function(sc) {
                return h('span', {
                  key: 'csc-' + sc.id,
                  style: { display: 'inline-flex', alignItems: 'stretch', borderRadius: 6, overflow: 'hidden' }
                },
                  h('button', {
                    onClick: function() { applyScenario(sc.id); },
                    'aria-label': sc.label + ' (custom): ' + (sc.teach || ''),
                    'data-tl-focusable': 'true',
                    title: sc.teach || sc.label,
                    style: {
                      padding: '6px 11px', cursor: 'pointer',
                      border: '1px solid #a78bfa',
                      borderRight: 'none',
                      background: 'rgba(167,139,250,0.10)',
                      color: '#a78bfa', fontSize: 11, fontWeight: 600
                    }
                  }, sc.icon + ' ' + sc.label),
                  h('button', {
                    onClick: function() { deleteCustomScenario(sc.id); },
                    'aria-label': 'Delete custom scenario: ' + sc.label,
                    'data-tl-focusable': 'true',
                    title: 'Delete this custom scenario',
                    style: {
                      padding: '6px 8px', cursor: 'pointer',
                      border: '1px solid #a78bfa',
                      background: 'rgba(167,139,250,0.10)',
                      color: '#a78bfa', fontSize: 11
                    }
                  }, '✕')
                );
              })
            ).concat([
              // Quick-Play — random scenario, one click
              h('button', {
                key: 'sc-random',
                onClick: runRandomScenario,
                'aria-label': 'Run a random scenario — go straight to throwing without reading setup',
                'data-tl-focusable': 'true',
                title: 'Pick a random scenario and start immediately — no setup, just throw',
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px dashed #6366f1', background: 'rgba(99,102,241,0.10)',
                  color: '#a5b4fc', fontSize: 11, fontWeight: 700
                }
              }, '🎲 Run something cool'),
              // Save current as scenario
              h('button', {
                key: 'sc-save',
                onClick: saveCustomScenario,
                'aria-label': 'Save current setup as a custom scenario',
                'data-tl-focusable': 'true',
                title: 'Save the current mode + preset + gravity + wind as a personalized scenario',
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px dashed #a78bfa', background: 'transparent',
                  color: '#a78bfa', fontSize: 11, fontWeight: 700
                }
              }, '⭐ Save current'),
              h('button', {
                key: 'sc-print',
                onClick: printThrowLabActivitySheet,
                'aria-label': 'Print activity sheet for all scenarios',
                'data-tl-focusable': 'true',
                title: 'Open a printable activity sheet with all scenarios + discussion questions',
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid #fbbf24', background: 'rgba(251,191,36,0.10)',
                  color: '#fbbf24', fontSize: 11, fontWeight: 700, marginLeft: 4
                }
              }, '📄 Print activity sheet'),
              h('button', {
                key: 'sc-card',
                onClick: exportTradingCard,
                'aria-label': 'Export your last throw as a printable trading card',
                'data-tl-focusable': 'true',
                title: 'Make a Topps-style trading card from your last throw + stats + badges',
                style: {
                  padding: '6px 11px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid #f59e0b', background: 'rgba(245,158,11,0.10)',
                  color: '#fbbf24', fontSize: 11, fontWeight: 700
                }
              }, '📇 Trading card')
            ])
          )
        ),

        // ── Daily Challenge (engagement layer) ──
        // Deterministic-by-date scenario, prominent above the scenarios
        // row. State has 3 visual modes: NEW (today, untried), GO
        // (loaded but not yet made), DONE (already completed today).
        (function() {
          var daily = getDailyChallenge();
          if (!daily) return null;
          var key = todayKey();
          var done = d.dailyCompleted === key;
          var loaded = d.activeScenarioId === daily.id;
          var bg = done ? 'rgba(34,197,94,0.15)' : loaded ? 'rgba(251,191,36,0.18)' : 'rgba(167,139,250,0.10)';
          var border = done ? '#22c55e' : loaded ? '#fbbf24' : '#a78bfa';
          var label = done ? '✅ Today\'s Challenge complete!' : loaded ? '🎯 In progress: ' + daily.label : '🌟 Today\'s Challenge: ' + daily.label;
          return h('button', {
            onClick: function() {
              if (done) {
                tlAnnounce('Daily Challenge already complete. Come back tomorrow for a new one.');
                return;
              }
              applyScenario(daily.id);
            },
            'aria-label': label,
            'data-tl-focusable': 'true',
            title: daily.teach,
            style: {
              display: 'block', width: '100%', marginBottom: 14,
              padding: '10px 14px', borderRadius: 8,
              border: '1px solid ' + border, background: bg,
              color: '#f1f5f9', fontSize: 12, fontWeight: 600,
              textAlign: 'left', cursor: done ? 'default' : 'pointer'
            }
          },
            h('div', { style: { fontSize: 11, color: border, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, label),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 2, fontWeight: 400 } },
              done ? 'Earned 15 XP. Try again tomorrow.' : daily.teach.slice(0, 110) + (daily.teach.length > 110 ? '…' : ''))
          );
        })(),

        // ── Achievements / Badges (engagement layer) ──
        // Collection mechanic for athletic students. All badges shown
        // dimmed; earned badges glow with their color. Tooltip shows the
        // hint so students can see how to unlock unearned ones — turns
        // it into a checklist rather than a mystery box.
        h('details', {
          style: { marginBottom: 14, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '8px 12px' }
        },
          h('summary', {
            style: { cursor: 'pointer', fontSize: 12, color: '#cbd5e1', fontWeight: 600 }
          }, '🏅 Achievements (' + Object.keys(d.badgesEarned || {}).length + ' / ' + BADGES.length + ')'),
          h('div', {
            role: 'list', 'aria-label': 'Badge achievements',
            style: { marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }
          },
            BADGES.map(function(b) {
              var earned = !!(d.badgesEarned && d.badgesEarned[b.id]);
              return h('span', {
                key: 'badge-' + b.id,
                role: 'listitem',
                'aria-label': b.label + (earned ? ' (earned)' : ' (locked)') + ': ' + b.hint,
                title: b.hint,
                style: {
                  padding: '5px 10px', borderRadius: 999,
                  border: '1px solid ' + (earned ? '#fbbf24' : '#334155'),
                  background: earned ? 'rgba(251,191,36,0.18)' : '#1e293b',
                  color: earned ? '#fbbf24' : '#475569',
                  fontSize: 11, fontWeight: earned ? 700 : 500,
                  opacity: earned ? 1 : 0.6
                }
              }, b.emoji + ' ' + b.label);
            })
          )
        ),

        // ── Stats Card (engagement layer) ──
        // Baseball-card-style "your numbers" surface. Pulls from the
        // same drillStats / throwCount / per-sport counters the badges
        // and trading card already use; formats them as a 2-column
        // grid the way fantasy sports apps display stat lines.
        h('details', {
          style: { marginBottom: 14, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '8px 12px' }
        },
          h('summary', {
            style: { cursor: 'pointer', fontSize: 12, color: '#cbd5e1', fontWeight: 600 }
          }, '📊 Your Numbers — ' + (d.playerName || 'session stats')),
          h('div', {
            role: 'table', 'aria-label': 'Session stats',
            style: { marginTop: 10, display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', fontSize: 12 }
          },
            getStatsRows(d).reduce(function(acc, row) {
              acc.push(h('span', {
                key: 'sl-' + row.label, role: 'rowheader',
                style: { color: '#94a3b8' }
              }, row.label));
              acc.push(h('span', {
                key: 'sv-' + row.label, role: 'cell',
                style: {
                  color: '#fbbf24', fontWeight: 700,
                  fontFamily: 'ui-monospace, monospace', textAlign: 'right'
                }
              }, row.value));
              return acc;
            }, [])
          )
        ),

        // ── Active Scenario Briefing ──
        // When a scenario was just loaded, surface its teach blurb +
        // discussion questions in a dedicated panel above the main
        // controls. Persists until the user dismisses it OR loads a
        // different scenario. Useful for teachers in front of a class —
        // gives them ready-made physics-discussion prompts.
        (function() {
          var active = d.activeScenarioId
            ? (SCENARIOS.find(function(sc) { return sc.id === d.activeScenarioId; })
               || (d.customScenarios || []).find(function(sc) { return sc.id === d.activeScenarioId; }))
            : null;
          if (!active) return null;
          return h('section', {
            'aria-label': 'Scenario briefing',
            style: {
              padding: 12, borderRadius: 10, marginBottom: 14,
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
                'data-tl-focusable': 'true',
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

        // Difficulty / scaffold tier selector — IEP / UDL onramp.
        // Tier 1 = speed only (early elementary, "more push = farther").
        // Tier 2 = + release height + angle (when angle starts mattering).
        // Tier 3 = + spin (full physics, MS / HS / AP).
        // Wind controls follow tier 2+ so the wind panel doesn't confuse a
        // Tier 1 student. Stored on d.scaffoldTier; defaults to 3.
        // Difficulty selector — re-skinned in athlete language.
        // Internally still scaffoldTier 1/2/3/4 (same data model), but
        // UI reads as career progression: Rookie → Pro → All-Star → HOF.
        // Tier 4 (Hall of Fame) auto-toggles showFormulas for the
        // physics-deep-dive student. Same simulation underneath.
        h('div', { role: 'group', 'aria-label': 'Skill level',
          style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap', fontSize: 12 }
        },
          h('span', { style: { color: '#cbd5e1' } }, 'Skill:'),
          [
            { tier: 1, label: '🏆 Rookie',     sub: 'Speed only' },
            { tier: 2, label: '🏆 Pro',        sub: '+ Angle' },
            { tier: 3, label: '🏆 All-Star',   sub: '+ Spin' },
            { tier: 4, label: '🏆 Hall of Fame', sub: 'Full physics + formulas' }
          ].map(function(opt) {
            var sel = (d.scaffoldTier || 3) === opt.tier;
            return h('button', {
              key: 'tier' + opt.tier,
              onClick: function() {
                setLabToolData(function(prev) {
                  var next = Object.assign({}, prev.throwlab, { scaffoldTier: opt.tier });
                  // HOF tier auto-shows the physics formulas overlay
                  if (opt.tier === 4) next.showFormulas = true;
                  return Object.assign({}, prev, { throwlab: next });
                });
                tlAnnounce('Skill level: ' + opt.label.replace(/^\S+\s/, '') + ' — ' + opt.sub);
              },
              'aria-pressed': sel,
              'aria-label': opt.label.replace(/^\S+\s/, '') + ': ' + opt.sub,
              'data-tl-focusable': 'true',
              title: opt.sub,
              style: {
                padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                color: '#f1f5f9', fontSize: 12, fontWeight: sel ? 700 : 500
              }
            }, opt.label);
          })
        ),

        // Gravity preset selector — "what would this look like on Mars?"
        // Available at any tier since it's the most concrete scientific
        // teaching moment in the tool: g changes, every trajectory changes
        // proportionally, and students can reason about WHY.
        h('div', { role: 'group', 'aria-label': 'Gravity preset',
          style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap', fontSize: 12 }
        },
          h('span', { style: { color: '#cbd5e1' } }, 'Gravity:'),
          GRAVITY_PRESETS.map(function(gp) {
            var sel = (d.gravityId || 'earth') === gp.id;
            return h('button', {
              key: 'g-' + gp.id,
              onClick: function() {
                upd('gravityId', gp.id);
                tlAnnounce('Gravity set to ' + gp.label + ', ' + gp.g.toFixed(2) + ' meters per second squared.');
              },
              'aria-pressed': sel,
              'aria-label': gp.label + ' gravity, ' + gp.g.toFixed(2) + ' m/s squared',
              'data-tl-focusable': 'true',
              style: {
                padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                color: '#f1f5f9', fontSize: 12
              }
            }, gp.icon + ' ' + gp.label + ' (' + gp.g.toFixed(1) + ')');
          })
        ),

        // ── Drills panel ──
        // Toggle + active goal display. When inactive, shows a small "Start
        // drill" pill; when active, shows the current task goal + progress
        // + restart. Per-mode drills come from the DRILLS const.
        (function() {
          var modeDrills = DRILLS[d.mode];
          if (!modeDrills) return null;
          var taskIdx = d.drillTaskIdx || 0;
          var allDone = taskIdx >= modeDrills.tasks.length;
          var task = modeDrills.tasks[Math.min(taskIdx, modeDrills.tasks.length - 1)];
          var stats = d.drillStats || {};
          if (!d.drillActive) {
            return h('div', { style: { marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
              h('button', {
                onClick: function() {
                  // Reset drill state on start
                  setLabToolData(function(prev) {
                    return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, {
                      drillActive: true, drillTaskIdx: 0,
                      drillStats: {
                        streakStrikes: 0, strikeTypes: {}, strikeWithLowSpin: false,
                        makeCount: 0, swishHeights: 0, swishHeightSet: {}, completedBouncePass: false,
                        goalKickTypes: {}, totalGoals: 0,
                        fgMadeByDist: {}
                      }
                    })});
                  });
                  tlAnnounce('Drill started: ' + modeDrills.tasks[0].goal);
                },
                'data-tl-focusable': 'true',
                style: {
                  padding: '8px 14px', borderRadius: 999, cursor: 'pointer',
                  border: '1px solid #10b981', background: 'rgba(16,185,129,0.18)',
                  color: '#f1f5f9', fontSize: 12, fontWeight: 600
                }
              }, '🎯 Start ' + modeDrills.label),
              h('span', { style: { fontSize: 11, color: '#94a3b8' } },
                modeDrills.tasks.length + ' tasks · sandbox stays open while a drill runs'));
          }
          // Active drill panel
          return h('section', {
            'aria-labelledby': 'tl-drill-heading',
            style: { marginBottom: 14, padding: 12,
              background: allDone ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.06)',
              border: '1px solid #10b981', borderRadius: 10 }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6, flexWrap: 'wrap' } },
              h('h3', { id: 'tl-drill-heading', style: { margin: 0, fontSize: 12, color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 } },
                allDone ? '🏆 Drill complete · ' + modeDrills.label : '🎯 ' + modeDrills.label + ' · Task ' + (taskIdx + 1) + ' of ' + modeDrills.tasks.length),
              h('button', {
                onClick: function() {
                  setLabToolData(function(prev) {
                    return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, {
                      drillActive: false, drillTaskIdx: 0
                    })});
                  });
                  tlAnnounce('Drill stopped.');
                },
                'aria-label': 'Stop the current drill',
                'data-tl-focusable': 'true',
                style: { padding: '4px 8px', minHeight: 24, borderRadius: 4, cursor: 'pointer',
                  border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', fontSize: 11 }
              }, allDone ? 'Close' : 'Stop')),
            allDone
              ? h('div', { style: { fontSize: 13, color: '#cbd5e1' } },
                  'You finished all ' + modeDrills.tasks.length + ' tasks. Try another sport mode\'s drills, or hit Stop to return to sandbox.')
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

          // LEFT: side-view canvas + result panel
          h('div', null,
            h('canvas', {
              ref: canvasRef, width: 720, height: 360,
              role: 'img',
              tabIndex: 0,
              'data-tl-focusable': 'true',
              'aria-label': (isPitching
                ? 'Pitcher\'s mound side view. Mound on the left, home plate on the right, dashed yellow strike zone above the plate.'
                : isFreeKick
                  ? 'Soccer pitch top-down view. Ball at bottom, four-defender wall in the middle at 10 yards, goalposts 7.32 meters wide at the top. Spin curls the ball laterally.'
                  : isFieldGoal
                    ? 'Football field side view with hash-mark distance labels, yellow tee on the left, and yellow goalposts at ' + d.fgDistanceYd + ' yards.'
                    : 'Basketball court side view. Free-throw line on the left, hoop with backboard on the right. Orange bar is the rim at 10 feet.')
                + (lr ? ' Last throw outcome: ' + outcomeLabel(lr.location).replace(/^[^A-Za-z]+/, '') + '.' : ''),
              style: { width: '100%', maxWidth: 720, height: 'auto', borderRadius: 10, border: '1px solid #334155', background: '#0f172a' }
            }),
            // Result panel — given an h3 so AT users tabbing into the section
            // know what they're reading. region role makes the panel announce
            // its label when entered.
            h('section', {
              'aria-labelledby': 'tl-result-heading',
              style: { marginTop: 10, padding: 12, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10 }
            },
              h('h3', {
                id: 'tl-result-heading',
                style: { fontSize: 12, margin: 0, marginBottom: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
              }, lr ? 'Last throw' : 'Ready to throw'),
              lr ? (
                h('div', null,
                  h('div', { style: { fontSize: 14, fontWeight: 700, color: outcomeColor(lr.location), marginBottom: 6 } }, outcomeLabel(lr.location)),
                  h('div', { style: { fontSize: 12, color: '#cbd5e1', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 } },
                    h('div', null, h('div', { style: { color: '#94a3b8', fontSize: 11 } }, 'Speed'), h('div', { style: { fontWeight: 700 } }, d.speedMph + ' mph')),
                    h('div', null,
                      h('div', { style: { color: '#94a3b8', fontSize: 11 } },
                        isPitching ? 'Time to plate'
                        : isFreeKick ? 'Time to goal'
                        : isFieldGoal ? 'Hang time'
                        : 'Hang time'),
                      h('div', { style: { fontWeight: 700 } }, isPitching
                        ? (lr.outcome.plateT ? lr.outcome.plateT.toFixed(2) + ' s' : '—')
                        : (lr.samples && lr.samples.length ? lr.samples[lr.samples.length - 1].t.toFixed(2) + ' s' : '—'))),
                    h('div', null, h('div', { style: { color: '#94a3b8', fontSize: 11 } },
                        isPitching ? 'Vert. break' : isFreeKick ? 'Curl' : isFieldGoal ? 'Peak height' : 'Apex'),
                      h('div', { style: { fontWeight: 700 } }, isPitching
                        ? (lr.vBreakIn !== null ? lr.vBreakIn.toFixed(1) + ' in' : '—')
                        : isFreeKick
                          ? (lr.samples ? (Math.max.apply(null, lr.samples.map(function(s) { return s.x; })) - Math.min.apply(null, lr.samples.map(function(s) { return s.x; }))).toFixed(2) + ' m' : '—')
                          : (lr.samples ? Math.max.apply(null, lr.samples.map(function(s) { return s.y; })).toFixed(2) + ' m' : '—'))),
                    h('div', null, h('div', { style: { color: '#94a3b8', fontSize: 11 } },
                        isPitching ? 'Horiz. break' : isFreeKick ? 'Spin axis' : isFieldGoal ? 'Launch ∠' : 'Release ∠'),
                      h('div', { style: { fontWeight: 700 } }, isPitching
                        ? (lr.hBreakIn !== null ? lr.hBreakIn.toFixed(1) + ' in' : '—')
                        : isFreeKick
                          ? (d.spinAxisDeg + '°')
                          : (d.aimDegV.toFixed(1) + '°')))
                  ),
                  // Dynamic explainer — outcome-specific feedback after a throw,
                  // generated from the actual physics result. Falls through to
                  // the active preset's static teach blurb if there's no result.
                  h('div', { style: { marginTop: 8, fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' } },
                    explainResult(lr) || activePreset.teach)
                )
              ) : h('div', { style: { color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 16 } },
                isPitching
                  ? 'Pick a pitch type, set your release, and click THROW to see the path.'
                  : isFreeKick
                    ? 'Pick a kick style and click STRIKE — watch the ball curl around the wall.'
                    : isFieldGoal
                      ? 'Pick a distance, set your launch angle and power, and click KICK — clear the bar and split the uprights.'
                      : 'Pick a shot, set your release angle, and click SHOOT to see the arc.')
            ),
            // "Show physics" + "Show formulas" toggles + keyboard shortcuts hint.
            // Bumped to slate-300 (#cbd5e1) for AA contrast on dark panel.
            h('div', { style: { marginTop: 10, fontSize: 12, color: '#cbd5e1', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 } },
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                h('label', { style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } },
                  h('input', {
                    type: 'checkbox',
                    'data-tl-focusable': 'true',
                    checked: !!d.showPhysics,
                    onChange: function(e) { upd('showPhysics', e.target.checked); }
                  }),
                  'Show physics overlays (no-spin reference trajectory)'),
                h('label', { style: { cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 } },
                  h('input', {
                    type: 'checkbox',
                    'data-tl-focusable': 'true',
                    checked: !!d.showFormulas,
                    onChange: function(e) { upd('showFormulas', e.target.checked); }
                  }),
                  'Show formulas (math behind the throw)')
              ),
              h('span', { style: { fontSize: 11, color: '#94a3b8' } },
                'Hotkey: ',
                h('kbd', { style: { padding: '1px 5px', borderRadius: 3, border: '1px solid #475569', background: '#0f172a', color: '#cbd5e1', fontFamily: 'monospace' } }, 'Space'),
                ' to throw')
            ),
            // ── Coach Mode bubble ──
            // Sits between the toggles and the formulas panel so it always
            // appears prominently when there's a reply or an error. The
            // button itself is rendered inside the right panel near the
            // throw button (further down) so it's adjacent to the action.
            (d.coachReply || d.coachError || d.coachLoading) ? h('section', {
              'aria-labelledby': 'tl-coach-heading',
              'aria-busy': !!d.coachLoading,
              style: { marginTop: 10, padding: 12, background: 'linear-gradient(135deg, rgba(217,70,239,0.10), rgba(124,58,237,0.10))', border: '1px solid #d946ef', borderRadius: 10 }
            },
              h('h3', { id: 'tl-coach-heading',
                style: { fontSize: 12, margin: 0, marginBottom: 6, color: '#d946ef', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }
              }, '🤖 Coach'),
              d.coachLoading
                ? h('div', { style: { color: '#cbd5e1', fontSize: 12, fontStyle: 'italic' } }, 'Thinking…')
                : d.coachError
                ? h('div', { style: { color: '#ef4444', fontSize: 12 } }, d.coachError)
                : h('div', { style: { color: '#f1f5f9', fontSize: 13, lineHeight: 1.5 } }, d.coachReply)
            ) : null,
            // Math view + ball regulations appear below the toggles when enabled
            formulasPanel(lr),
            ballSpecsPanel()
          ),

          // RIGHT: preset picker + sliders + throw button
          h('div', null,
            // Preset picker (pitches OR shots, mode-driven)
            h('div', { style: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 12 } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } },
                isPitching ? 'Pitch type' : isFreeKick ? 'Kick style' : isFieldGoal ? 'Distance' : isBowling ? 'Delivery' : isGolf ? 'Club' : isVolleyball ? 'Serve type' : 'Shot type'),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 } },
                modeMeta.presets.map(function(pt) {
                  var sel = isPitching ? d.pitchType === pt.id
                          : isFreeKick ? d.kickType === pt.id
                          : isFieldGoal ? d.goalType === pt.id
                          : isBowling ? d.bowlType === pt.id
                          : isGolf ? d.golfClub === pt.id
                          : isVolleyball ? d.serveType === pt.id
                          : d.shotType === pt.id;
                  return h('button', {
                    key: pt.id,
                    onClick: function() {
                      if (isPitching) applyPitchPreset(pt.id);
                      else if (isFreeKick) applyKickPreset(pt.id);
                      else if (isFieldGoal) applyGoalPreset(pt.id);
                      else if (isBowling) applyBowlPreset(pt.id);
                      else if (isGolf) applyGolfPreset(pt.id);
                      else if (isVolleyball) applyVolleyPreset(pt.id);
                      else applyShotPreset(pt.id);
                    },
                    'aria-pressed': sel,
                    'data-tl-focusable': 'true',
                    style: {
                      padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                      border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                      background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                      color: '#f1f5f9', fontSize: 12, textAlign: 'left'
                    }
                  }, h('div', { style: { fontSize: 14 } }, pt.icon + ' ' + pt.label),
                     h('div', { style: { fontSize: 10, color: '#94a3b8' } },
                       pt.speedMph + ' mph' + (isPitching ? ' · ' + pt.spinRpm + ' rpm'
                                              : isFreeKick ? ' · spin ' + pt.spinAxisDeg + '°'
                                              : isFieldGoal ? ' · ' + pt.aimDegV + '° launch'
                                              : isBowling ? ' · spin ' + pt.spinAxisDeg + '°'
                                              : isGolf ? ' · ' + pt.carryYd + ' yd carry'
                                              : isVolleyball ? ' · ' + pt.spinRpm + ' rpm'
                                              : ' · ' + pt.aimDegV + '° arc')));
                })
              ),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 8, padding: 8, background: '#1e293b', borderRadius: 6 } },
                h('div', { style: { fontWeight: 700, marginBottom: 2 } }, 'Grip:'),
                activePreset.grip)
            ),
            // ── Preset Compendium (study table) ──
            // A side-by-side comparison of EVERY preset in the active
            // sport — speed / spin / axis / launch / release height (+
            // carry distance for golf). Lets students see how the
            // presets relate to each other parameter-by-parameter
            // without flipping back and forth. Click any row to load
            // that preset. Collapsed by default to keep the layout tight.
            h('details', {
              style: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }
            },
              h('summary', {
                style: { cursor: 'pointer', fontSize: 11, color: '#cbd5e1', fontWeight: 600 }
              }, '📋 Preset compendium — compare every ' + (isPitching ? 'pitch' : isFreeKick ? 'kick' : isFieldGoal ? 'distance' : isBowling ? 'delivery' : isGolf ? 'club' : isVolleyball ? 'serve' : 'shot') + ' in this sport'),
              h('div', {
                role: 'table',
                'aria-label': 'Preset comparison — ' + modeMeta.label,
                style: { marginTop: 8, fontSize: 11, color: '#cbd5e1' }
              },
                // Header row
                h('div', { role: 'row', style: { display: 'flex', borderBottom: '1px solid #334155', paddingBottom: 4, marginBottom: 4, fontWeight: 700, color: '#94a3b8' } },
                  h('div', { style: { flex: '0 0 110px' } }, 'Preset'),
                  h('div', { style: { flex: '0 0 50px', textAlign: 'right' } }, 'Speed'),
                  h('div', { style: { flex: '0 0 60px', textAlign: 'right' } }, 'Spin'),
                  h('div', { style: { flex: '0 0 50px', textAlign: 'right' } }, 'Axis'),
                  h('div', { style: { flex: '0 0 50px', textAlign: 'right' } }, 'Launch'),
                  h('div', { style: { flex: '0 0 50px', textAlign: 'right' } }, isGolf ? 'Carry' : 'Height')
                ),
                // Data rows
                modeMeta.presets.map(function(pt) {
                  var activePresetId = isPitching ? d.pitchType
                                     : isFreeThrow ? d.shotType
                                     : isFreeKick ? d.kickType
                                     : isFieldGoal ? d.goalType
                                     : isBowling ? d.bowlType
                                     : isGolf ? d.golfClub
                                     : d.serveType;
                  var sel = pt.id === activePresetId;
                  return h('button', {
                    key: 'comp-' + pt.id,
                    role: 'row',
                    onClick: function() {
                      if (isPitching) applyPitchPreset(pt.id);
                      else if (isFreeKick) applyKickPreset(pt.id);
                      else if (isFieldGoal) applyGoalPreset(pt.id);
                      else if (isBowling) applyBowlPreset(pt.id);
                      else if (isGolf) applyGolfPreset(pt.id);
                      else if (isVolleyball) applyVolleyPreset(pt.id);
                      else applyShotPreset(pt.id);
                    },
                    'aria-label': pt.label + ': ' + pt.speedMph + ' mph, ' + pt.spinRpm + ' rpm, axis ' + pt.spinAxisDeg + '°, launch ' + pt.aimDegV + '°',
                    'aria-pressed': sel,
                    'data-tl-focusable': 'true',
                    style: {
                      display: 'flex', alignItems: 'center',
                      width: '100%', padding: '4px 6px', borderRadius: 4,
                      border: sel ? '1px solid #fbbf24' : '1px solid transparent',
                      background: sel ? 'rgba(251,191,36,0.10)' : 'transparent',
                      color: sel ? '#fbbf24' : '#cbd5e1',
                      cursor: 'pointer', fontSize: 11, fontWeight: sel ? 700 : 500,
                      marginBottom: 1
                    }
                  },
                    h('div', { style: { flex: '0 0 110px', textAlign: 'left' } }, pt.icon + ' ' + pt.label),
                    h('div', { style: { flex: '0 0 50px', textAlign: 'right', fontFamily: 'ui-monospace, monospace' } }, pt.speedMph + ' mph'),
                    h('div', { style: { flex: '0 0 60px', textAlign: 'right', fontFamily: 'ui-monospace, monospace' } }, pt.spinRpm + ' rpm'),
                    h('div', { style: { flex: '0 0 50px', textAlign: 'right', fontFamily: 'ui-monospace, monospace' } }, pt.spinAxisDeg + '°'),
                    h('div', { style: { flex: '0 0 50px', textAlign: 'right', fontFamily: 'ui-monospace, monospace' } }, pt.aimDegV + '°'),
                    h('div', { style: { flex: '0 0 50px', textAlign: 'right', fontFamily: 'ui-monospace, monospace' } },
                      isGolf ? (pt.carryYd + ' yd') : (pt.releaseHeight.toFixed(2) + ' m'))
                  );
                })
              )
            ),

            // Sliders — ranges scale with mode
            h('div', { style: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 12 } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Release controls'),
              slider('Speed', d.speedMph, modeMeta.speedRange[0], modeMeta.speedRange[1], 1, function(v) { upd('speedMph', v); }, ' mph'),
              // Tier 2+: release height + angles. Tier 1 hides them so the
              // student can focus on the speed-distance relationship alone.
              (d.scaffoldTier || 3) >= 2 ? slider('Release height', d.releaseHeight.toFixed(2), modeMeta.releaseHeightRange[0], modeMeta.releaseHeightRange[1], 0.05, function(v) { upd('releaseHeight', v); }, ' m') : null,
              (d.scaffoldTier || 3) >= 2 ? slider('Vertical aim', d.aimDegV.toFixed(1),
                isPitching ? -8 : isFreeKick ? -2 : isFieldGoal ? 20 : isBowling ? -8 : isGolf ? 5 : isVolleyball ? -2 : 30,
                isPitching ? 4 : isFreeKick ? 45 : isFieldGoal ? 60 : isBowling ? 12 : isGolf ? 60 : isVolleyball ? 35 : 70,
                0.5, function(v) { upd('aimDegV', v); }, '°') : null,
              (d.scaffoldTier || 3) >= 2 ? slider('Horizontal aim', d.aimDegH.toFixed(1), -5, 5, 0.1, function(v) { upd('aimDegH', v); }, '°') : null,
              // Tier 3: spin (the full physics surface).
              (d.scaffoldTier || 3) >= 3 ? slider('Spin rate', d.spinRpm, 0, 3500, 50, function(v) { upd('spinRpm', v); }, ' rpm') : null,
              (d.scaffoldTier || 3) >= 3 ? slider('Spin axis', d.spinAxisDeg, 0, 360, 5, function(v) { upd('spinAxisDeg', v); }, '°') : null
            ),
            // ── Wind (outdoor modes only, Tier 2+) ──
            // Free kick + field goal + bowling + golf happen outdoors so
            // wind is part of the physics. Indoor modes (basketball is
            // indoor; volleyball typically indoor) keep the panel hidden
            // so the UI doesn't clutter with irrelevant sliders.
            // Tier 1 students stick to "more speed = more distance"; wind
            // joins at Tier 2 once they've grasped the basic relationship.
            ((isFreeKick || isFieldGoal || isBowling || isGolf) && (d.scaffoldTier || 3) >= 2) ? h('div', {
              style: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, padding: 12, marginBottom: 12 }
            },
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } },
                'Wind (relative to throw)'),
              // Quick-pick wind presets — calm / tailwind / headwind / cross / tornado
              h('div', { role: 'group', 'aria-label': 'Wind presets',
                style: { display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' } },
                WIND_PRESETS.map(function(wp) {
                  var sel = (d.windMph || 0) === wp.mph && (d.windDirDeg || 0) === wp.dirDeg;
                  return h('button', {
                    key: 'wp-' + wp.id,
                    onClick: function() {
                      setLabToolData(function(prev) {
                        return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, {
                          windMph: wp.mph, windDirDeg: wp.dirDeg
                        })});
                      });
                      tlAnnounce('Wind preset: ' + wp.label + (wp.mph ? ' (' + wp.mph + ' mph)' : ''));
                    },
                    'aria-pressed': sel,
                    'data-tl-focusable': 'true',
                    style: {
                      padding: '4px 9px', borderRadius: 999, cursor: 'pointer',
                      border: '1px solid ' + (sel ? '#fbbf24' : '#334155'),
                      background: sel ? 'rgba(251,191,36,0.18)' : '#1e293b',
                      color: '#f1f5f9', fontSize: 11, fontWeight: 600
                    }
                  }, wp.icon + ' ' + wp.label);
                })
              ),
              slider('Wind speed', d.windMph || 0, 0, 40, 1, function(v) { upd('windMph', v); }, ' mph'),
              // Wind direction: 0° head, 90° R, 180° tail, 270° L
              slider('Wind direction', d.windDirDeg || 0, 0, 359, 5, function(v) { upd('windDirDeg', v); }, '°'),
              h('div', { style: { fontSize: 10, color: '#cbd5e1', marginTop: 4 } },
                (function() {
                  var deg = d.windDirDeg || 0;
                  if (deg < 22 || deg >= 338) return '↓ Headwind (slows the ball)';
                  if (deg < 68) return '↘ Quartering head/right';
                  if (deg < 112) return '→ Crosswind from left';
                  if (deg < 158) return '↗ Quartering tail/right';
                  if (deg < 202) return '↑ Tailwind (extends range)';
                  if (deg < 248) return '↖ Quartering tail/left';
                  if (deg < 292) return '← Crosswind from right';
                  return '↙ Quartering head/left';
                })())
            ) : null,
            // ── Hot Hand + Hype HUD (engagement layer) ──
            // Sits directly above the throw button so the streak status
            // and pre-throw motivator are inline with where the student's
            // attention already is. Both auto-derive from existing state:
            // Hot Hand from drillStats.hotStreak, hype from a freshly
            // picked phrase whenever the user has no result yet (i.e.,
            // before they\'ve thrown — once a throw has happened, the
            // outcome banner takes over the spot).
            (function() {
              var hot = getHotHand((d.drillStats || {}).hotStreak);
              var showHype = !d.lastResult && !d.replayActive;
              if (!hot && !showHype) return null;
              return h('div', {
                role: 'status', 'aria-live': 'polite',
                style: {
                  marginBottom: 8, padding: '6px 10px', borderRadius: 6,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  background: hot ? 'rgba(220,38,38,0.10)' : 'rgba(167,139,250,0.10)',
                  border: '1px solid ' + (hot ? hot.color : '#a78bfa'),
                  fontSize: 12
                }
              },
                hot ? h('span', { style: { color: hot.color, fontWeight: 700 } },
                  hot.emoji + ' ' + hot.label + ' (streak: ' + d.drillStats.hotStreak + ')'
                ) : h('span', { style: { color: '#a78bfa', fontStyle: 'italic' } },
                  '🎙️ ' + pickHypePhrase()
                )
              );
            })(),
            // Throw / Shoot button — mode-aware label
            h('button', {
              onClick: throwPitch,
              'data-tl-focusable': 'true',
              'aria-keyshortcuts': 'Space',
              style: {
                width: '100%', padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid #fbbf24', background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: '#1a1a2e', fontSize: 16, fontWeight: 800
              }
            }, isPitching ? '⚾ THROW PITCH' : isFreeKick ? '⚽ STRIKE' : isFieldGoal ? '🏈 KICK' : isBowling ? '🏏 BOWL' : isGolf ? '⛳ TEE OFF' : isVolleyball ? '🏐 SERVE' : '🏀 SHOOT'),
            // ── Slow-mo replay controls ──
            // "Replay last throw" re-runs the canvas trajectory animation
            // for the current lastResult — students can re-watch a throw
            // they already executed. Slow-mo toggle stretches the replay
            // duration from 1.0s to 3.5s. Together they give a SportsCenter-
            // style "let's see that again, slowed down" experience that
            // also reveals subtle physics (Magnus curl, late break, etc.)
            d.lastResult ? h('div', { style: { marginTop: 6, display: 'flex', gap: 6 } },
              h('button', {
                onClick: function() {
                  setLabToolData(function(prev) {
                    return Object.assign({}, prev, { throwlab: Object.assign({}, prev.throwlab, {
                      replayActive: true, replayT: 0
                    })});
                  });
                  tlAnnounce(d.slowMoActive ? 'Replaying in slow-motion.' : 'Replaying last throw.');
                },
                disabled: !!d.replayActive,
                'aria-label': 'Replay the last throw' + (d.slowMoActive ? ' in slow motion' : ''),
                'data-tl-focusable': 'true',
                style: {
                  flex: 1, padding: '8px 10px', borderRadius: 6, cursor: d.replayActive ? 'wait' : 'pointer',
                  border: '1px solid #475569',
                  background: d.replayActive ? '#1e293b' : 'rgba(34,197,94,0.10)',
                  color: '#86efac', fontSize: 11, fontWeight: 600
                }
              }, d.replayActive ? '▶ Playing…' : '⏪ Replay last throw'),
              h('button', {
                onClick: function() {
                  upd('slowMoActive', !d.slowMoActive);
                  tlAnnounce(d.slowMoActive ? 'Slow-motion off.' : 'Slow-motion on.');
                },
                'aria-label': 'Toggle slow-motion replay (3.5x slower)',
                'aria-pressed': !!d.slowMoActive,
                'data-tl-focusable': 'true',
                title: 'Toggle slow-motion — replays at 3.5× slower so you can see the curl / drop / break',
                style: {
                  padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                  border: '1px solid ' + (d.slowMoActive ? '#86efac' : '#475569'),
                  background: d.slowMoActive ? 'rgba(34,197,94,0.18)' : '#1e293b',
                  color: d.slowMoActive ? '#86efac' : '#cbd5e1',
                  fontSize: 11, fontWeight: 600
                }
              }, '🐢 ' + (d.slowMoActive ? 'Slow-mo ON' : 'Slow-mo'))
            ) : null,
            // ── Compare Mode controls ──
            // Save the latest trajectory as a reference ghost for the next throw,
            // OR clear the existing reference. Sits between the throw button and
            // the stats so it reads as a secondary action.
            (function() {
              var refList = (d.referenceList && d.referenceList.length)
                ? d.referenceList
                : (d.referenceResult ? [{ result: d.referenceResult, label: d.referenceLabel, color: '#d946ef' }] : []);
              var atCap = refList.length >= MAX_REFERENCES;
              return h('div', { style: { marginTop: 8 } },
                h('div', { style: { display: 'flex', gap: 6 } },
                  h('button', {
                    onClick: saveReference,
                    'aria-label': atCap
                      ? 'Save current throw as reference (oldest will be replaced; ' + MAX_REFERENCES + ' max)'
                      : 'Save current throw as reference (' + refList.length + ' of ' + MAX_REFERENCES + ' saved)',
                    'data-tl-focusable': 'true',
                    style: {
                      flex: 1, padding: '10px 12px', minHeight: 32, borderRadius: 6, cursor: 'pointer',
                      border: '1px solid #d946ef',
                      background: refList.length ? 'rgba(217,70,239,0.18)' : '#1e293b',
                      color: '#f1f5f9', fontSize: 11, fontWeight: 600
                    }
                  }, refList.length === 0 ? '📌 Save as reference'
                     : atCap ? '📌 Replace oldest (' + refList.length + '/' + MAX_REFERENCES + ')'
                     : '📌 Save reference (' + refList.length + '/' + MAX_REFERENCES + ')'),
                  refList.length ? h('button', {
                    onClick: clearReference,
                    'aria-label': 'Clear all saved reference trajectories',
                    'data-tl-focusable': 'true',
                    style: {
                      minWidth: 32, minHeight: 32, padding: '10px 12px',
                      borderRadius: 6, cursor: 'pointer',
                      border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', fontSize: 12
                    }
                  }, 'Clear') : null
                ),
                // Per-reference list with color swatch + label + per-item remove
                refList.length ? h('div', { style: { marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 } },
                  refList.map(function(ref, idx) {
                    return h('div', {
                      key: 'ref-' + idx,
                      style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }
                    },
                      h('span', {
                        'aria-hidden': 'true',
                        style: {
                          width: 12, height: 12, borderRadius: 2, flexShrink: 0,
                          background: ref.color || '#d946ef', border: '1px solid rgba(255,255,255,0.2)'
                        }
                      }),
                      h('span', { style: { color: ref.color || '#d946ef', fontWeight: 700, flexShrink: 0 } }, 'REF' + (idx + 1)),
                      h('span', { style: { color: '#cbd5e1', fontStyle: 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, ref.label || 'reference'),
                      h('button', {
                        onClick: (function(i) { return function() { removeReferenceAt(i); }; })(idx),
                        'aria-label': 'Remove reference ' + (idx + 1) + ': ' + (ref.label || ''),
                        'data-tl-focusable': 'true',
                        style: {
                          minWidth: 24, minHeight: 24, padding: '2px 6px', borderRadius: 4, cursor: 'pointer',
                          border: '1px solid #475569', background: 'transparent', color: '#cbd5e1', fontSize: 11
                        }
                      }, '✕')
                    );
                  })
                ) : null
              );
            })(),
            // Coach Mode button — only renders if Gemini is available AND
            // there's been at least one throw, so we don't tease a button
            // that wouldn't do anything useful yet.
            (typeof callGemini === 'function' && d.lastResult) ? h('div', { style: { marginTop: 8 } },
              // Coach persona picker — pill row of 4 voice options
              h('div', { role: 'group', 'aria-label': 'Coach voice',
                style: { display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' } },
                COACH_PERSONAS.map(function(p) {
                  var sel = (d.coachPersona || 'analyst') === p.id;
                  return h('button', {
                    key: 'coachp-' + p.id,
                    onClick: function() {
                      upd('coachPersona', p.id);
                      tlAnnounce('Coach voice: ' + p.label);
                    },
                    'aria-pressed': sel,
                    'aria-label': 'Coach voice: ' + p.label,
                    'data-tl-focusable': 'true',
                    title: p.prepend,
                    style: {
                      padding: '4px 9px', borderRadius: 999, cursor: 'pointer',
                      border: '1px solid ' + (sel ? '#d946ef' : '#334155'),
                      background: sel ? 'rgba(217,70,239,0.18)' : '#1e293b',
                      color: '#f1f5f9', fontSize: 11, fontWeight: sel ? 700 : 500
                    }
                  }, p.icon + ' ' + p.label);
                })
              ),
              h('button', {
                onClick: askCoach,
                disabled: !!d.coachLoading,
                'aria-busy': !!d.coachLoading,
                'aria-label': d.coachLoading ? 'Coach is thinking' : 'Ask the coach for feedback on your last throw',
                'data-tl-focusable': 'true',
                style: {
                  width: '100%', padding: '10px 14px', minHeight: 36,
                  borderRadius: 6, cursor: d.coachLoading ? 'wait' : 'pointer',
                  border: '1px solid #d946ef',
                  background: d.coachLoading ? '#1e293b' : 'rgba(217, 70, 239, 0.18)',
                  color: '#f1f5f9', fontSize: 12, fontWeight: 600
                }
              }, d.coachLoading ? '🤖 Coach is thinking…' : '🤖 Ask the coach')
            ) : null,
            // Stats line — mode-aware. Bumped slate-400 → slate-300 (#cbd5e1)
            // for AA contrast on the dark panel background.
            h('div', { style: { marginTop: 12, fontSize: 11, color: '#cbd5e1', display: 'flex', justifyContent: 'space-between' } },
              h('span', null, (isPitching ? 'Pitches: ' : isFreeKick ? 'Kicks: ' : isFieldGoal ? 'FGs: ' : 'Shots: ') + (d.throwCount || 0)),
              h('span', null, isPitching ? 'Strikes: ' + (d.strikeCount || 0)
                            : isFreeKick ? 'Goals: ' + (d.goalCount || 0)
                            : isFieldGoal ? 'Made: ' + (d.fgMakeCount || 0)
                            : 'Made: ' + (d.shotMakeCount || 0)),
              h('span', null, isPitching
                ? 'Types: ' + Object.keys(d.pitchTypesUsed || {}).length + '/' + PITCH_TYPES.length
                : isFreeKick ? 'Kick: ' + currentKick.label
                : isFieldGoal ? d.fgDistanceYd + ' yd'
                : 'Shot: ' + currentShot.label)
            )
          )
        )
      );
    }
  });

})();
