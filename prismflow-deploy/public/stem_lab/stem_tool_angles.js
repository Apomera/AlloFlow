// ═══════════════════════════════════════════════════════════════
// stem_tool_angles.js — Angle Explorer Plugin (Enhanced)
// Interactive protractor with angle classification, real-world
// examples, polygon angles, clock calculator, AI tutor, speed
// rounds, estimate mode, achievement badges, and more.
// Registered tool ID: "protractor"
// ═══════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

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

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-angles')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-angles';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ══════════════════════════════════════════════════════════════
  // ── Sound Effects Engine (Web Audio API) ──
  // ══════════════════════════════════════════════════════════════
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) { /* silent */ }
    }
    return _audioCtx;
  }
  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.1, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
    } catch(e) { /* silent */ }
  }
  function sfxCorrect() { playTone(523, 0.1, 'sine', 0.08); setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 160); }
  function sfxWrong() { playTone(330, 0.15, 'sawtooth', 0.06); setTimeout(function() { playTone(262, 0.2, 'sawtooth', 0.05); }, 100); }
  function sfxClick() { playTone(880, 0.04, 'sine', 0.05); }
  function sfxBadge() { playTone(523, 0.12, 'sine', 0.1); setTimeout(function() { playTone(659, 0.12, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 200); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.12); }, 350); }
  function sfxTick() { playTone(1200, 0.02, 'square', 0.03); }

  // ══════════════════════════════════════════════════════════════
  // ── Real-World Angle Examples Database ──
  // ══════════════════════════════════════════════════════════════
  var realWorldExamples = {
    'Zero':    [{ icon: '\uD83D\uDCD0', example: 'A ruler lying flat — both edges overlap' }],
    'Acute':   [
      { icon: '\uD83C\uDF55', example: 'A slice of pizza (about 30\u00B0-45\u00B0)' },
      { icon: '\u2702\uFE0F', example: 'Scissors slightly open' },
      { icon: '\u26F0\uFE0F', example: 'A steep mountain slope' },
      { icon: '\uD83D\uDD52', example: 'Clock at 1:00 (30\u00B0)' }
    ],
    'Right':   [
      { icon: '\uD83D\uDCDA', example: 'Corner of a book or paper' },
      { icon: '\uD83C\uDFE0', example: 'Where a wall meets the floor' },
      { icon: '\u271A\uFE0F', example: 'A plus sign (+) has four 90\u00B0 angles' },
      { icon: '\uD83D\uDD52', example: 'Clock at 3:00 or 9:00' }
    ],
    'Obtuse':  [
      { icon: '\uD83E\uDD4F', example: 'A boomerang\u2019s angle' },
      { icon: '\uD83D\uDCFA', example: 'A reclining chair leaned back' },
      { icon: '\uD83D\uDD52', example: 'Clock at 4:00 (120\u00B0)' }
    ],
    'Straight':  [
      { icon: '\u2194\uFE0F', example: 'A perfectly straight line' },
      { icon: '\uD83D\uDD52', example: 'Clock at 6:00' },
      { icon: '\uD83D\uDEE3\uFE0F', example: 'A road going in both directions' }
    ],
    'Reflex':  [
      { icon: '\uD83D\uDD04', example: 'The outside angle of an open door' },
      { icon: '\u2B55', example: 'Most of a full rotation' },
      { icon: '\uD83D\uDD52', example: 'Clock at 7:00 measured going clockwise from minute to hour hand' }
    ],
    'Full':    [{ icon: '\u2B55', example: 'One complete rotation (360\u00B0) — a full circle' }]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Polygon Angle Data ──
  // ══════════════════════════════════════════════════════════════
  var polygonData = [
    { sides: 3, name: 'Triangle',   icon: '\uD83D\uDD3A' },
    { sides: 4, name: 'Square',     icon: '\u25A0' },
    { sides: 5, name: 'Pentagon',   icon: '\u2B1F' },
    { sides: 6, name: 'Hexagon',    icon: '\u2B21' },
    { sides: 7, name: 'Heptagon',   icon: '\u2B22' },
    { sides: 8, name: 'Octagon',    icon: '\uD83D\uDED1' },
    { sides: 9, name: 'Nonagon',    icon: '\u25CB' },
    { sides: 10, name: 'Decagon',   icon: '\u2B23' },
    { sides: 12, name: 'Dodecagon', icon: '\u2B22' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Achievement Badge Definitions ──
  // ══════════════════════════════════════════════════════════════
  var badgeDefs = [
    { id: 'first_angle',  icon: '\uD83D\uDCD0', name: 'First Angle',      desc: 'Create your first angle' },
    { id: 'right_on',     icon: '\uD83D\uDC4D', name: 'Right On!',        desc: 'Create a perfect 90\u00B0 angle' },
    { id: 'straight_up',  icon: '\u2194\uFE0F', name: 'Straight Up',      desc: 'Create a 180\u00B0 angle' },
    { id: 'full_circle',  icon: '\u2B55',       name: 'Full Circle',       desc: 'Explore 360\u00B0' },
    { id: 'acute_eye',    icon: '\uD83D\uDC41\uFE0F', name: 'Acute Eye',  desc: 'Correctly classify 5 acute angles' },
    { id: 'streak_5',     icon: '\uD83D\uDD25', name: 'On Fire',           desc: '5 correct answers in a row' },
    { id: 'streak_10',    icon: '\u2B50',       name: 'Unstoppable',       desc: '10 correct answers in a row' },
    { id: 'speed_demon',  icon: '\u26A1',       name: 'Speed Demon',       desc: 'Score 10+ in speed round' },
    { id: 'estimator',    icon: '\uD83C\uDFAF', name: 'Sharp Estimator',   desc: 'Estimate within 5\u00B0 three times' },
    { id: 'all_types',    icon: '\uD83C\uDFC6', name: 'Angle Master',      desc: 'Classify all 5 angle types correctly' },
    { id: 'polygon_pro',  icon: '\u2B21',       name: 'Polygon Pro',       desc: 'Explore polygon angles for 5+ shapes' },
    { id: 'century',      icon: '\uD83D\uDCAF', name: 'Century Club',      desc: 'Answer 100 challenges total' }
  ];

  window.StemLab.registerTool('protractor', {
    icon: '\uD83D\uDCD0', label: 'Angle Explorer',
    desc: 'Measure and construct angles. Classify acute, right, obtuse, and reflex.',
    color: 'purple', category: 'math',
    questHooks: [
      { id: 'pin_3_angles', label: 'Save 3 angle measurements', icon: '\uD83D\uDCCD', check: function(d) { return (d.anglePins || []).length >= 3; }, progress: function(d) { return (d.anglePins || []).length + '/3 pins'; } },
      { id: 'use_bisector', label: 'Use the angle bisector tool', icon: '\u2702\uFE0F', check: function(d) { return d.showBisector || false; }, progress: function(d) { return d.showBisector ? 'Used!' : 'Toggle bisector'; } },
      { id: 'explore_challenges', label: 'Try the angle challenges tab', icon: '\uD83C\uDFAF', check: function(d) { return d.activeTab === 'challenges'; }, progress: function(d) { return d.activeTab === 'challenges' ? 'Exploring!' : 'Open challenges tab'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var t = ctx.t;
      var callGemini = ctx.callGemini || window.callGemini;
      var celebrate = ctx.celebrate;

      // ── Original state (hosted in main module) ──
      var angleValue = ctx.angleValue != null ? ctx.angleValue : 45;
      var setAngleValue = ctx.setAngleValue;
      var angleChallenge = ctx.angleChallenge || null;
      var setAngleChallenge = ctx.setAngleChallenge;
      var angleFeedback = ctx.angleFeedback || null;
      var setAngleFeedback = ctx.setAngleFeedback;
      var setToolSnapshots = ctx.setToolSnapshots;
      var exploreScore = ctx.exploreScore || { correct: 0, total: 0 };
      var setExploreScore = ctx.setExploreScore;

      // ── Extended state (via toolData.protractor) ──
      var d = (ctx.toolData && ctx.toolData.protractor) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('protractor', key); }
        else { if (ctx.update) ctx.update('protractor', key, val); }
      };

      var soundEnabled = d.soundEnabled != null ? d.soundEnabled : true;
      var activeTab = d.activeTab || 'explore'; // explore, challenges, reference, tools
      var showBisector = d.showBisector || false;
      var showSecondRay = d.showSecondRay || false;
      var secondAngle = d.secondAngle != null ? d.secondAngle : 120;
      var anglePins = d.anglePins || []; // saved angle markers on protractor
      var snapEnabled = d.snapEnabled != null ? d.snapEnabled : false; // snap to 15° increments

      // AI Tutor state
      var aiAdvice = d.aiAdvice || '';
      var aiLoading = d.aiLoading || false;

      // Speed Round state
      var speedActive = d.speedActive || false;
      var speedScore = d.speedScore || 0;
      var speedTimeLeft = d.speedTimeLeft != null ? d.speedTimeLeft : 30;
      var speedTarget = d.speedTarget || null;

      // Estimate Mode state
      var estimateActive = d.estimateActive || false;
      var estimateTarget = d.estimateTarget != null ? d.estimateTarget : 0;
      var estimateGuess = d.estimateGuess || '';
      var estimateResult = d.estimateResult || null;
      var estimateCount = d.estimateCount || 0; // count of close estimates

      // Streak counter
      var streak = d.streak || 0;
      var bestStreak = d.bestStreak || 0;

      // Badge state
      var earnedBadges = d.earnedBadges || {};
      var showBadges = d.showBadges || false;

      // Angle history log
      var angleHistory = d.angleHistory || [];

      // Polygon explorer
      var selectedPolygon = d.selectedPolygon != null ? d.selectedPolygon : 3;
      var polygonsExplored = d.polygonsExplored || {};

      // Clock calculator
      var clockHour = d.clockHour != null ? d.clockHour : 3;
      var clockMinute = d.clockMinute != null ? d.clockMinute : 0;

      // Triangle angle sum
      var triAngle1 = d.triAngle1 != null ? d.triAngle1 : 60;
      var triAngle2 = d.triAngle2 != null ? d.triAngle2 : 60;

      // Angle relationships
      var showRelationships = d.showRelationships || false;

      // Unit conversion
      var angleUnit = d.angleUnit || 'deg'; // deg, rad, grad, turns

      // Types seen for badge tracking
      var typesSeen = d.typesSeen || {};

      // ══════════════════════════════════════════════════════════════
      // ── Angle Classification ──
      // ══════════════════════════════════════════════════════════════
      var classifyAngle = function(a) {
        if (a === 0) return 'Zero';
        if (a < 90) return 'Acute';
        if (a === 90) return t('stem.calculus.right') || 'Right';
        if (a < 180) return 'Obtuse';
        if (a === 180) return 'Straight';
        if (a < 360) return 'Reflex';
        return 'Full';
      };
      var angleClass = classifyAngle(angleValue);

      // ── Class colors ──
      var classColors = {};
      classColors['Zero'] = { text: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' };
      classColors['Acute'] = { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
      classColors[t('stem.calculus.right') || 'Right'] = { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
      classColors['Obtuse'] = { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
      classColors['Straight'] = { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' };
      classColors['Reflex'] = { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
      classColors['Full'] = { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' };
      var cc = classColors[angleClass] || classColors['Acute'];

      // ── Angle conversion ──
      var toRadians = function(deg) { return (deg * Math.PI / 180).toFixed(4); };
      var toGradians = function(deg) { return (deg * 400 / 360).toFixed(2); };
      var toTurns = function(deg) { return (deg / 360).toFixed(4); };
      var convertedAngle = angleUnit === 'rad' ? toRadians(angleValue) + ' rad'
        : angleUnit === 'grad' ? toGradians(angleValue) + ' grad'
        : angleUnit === 'turns' ? toTurns(angleValue) + ' turns'
        : angleValue + '\u00B0';

      // ── Supplementary / Complementary ──
      var complementary = angleValue <= 90 ? (90 - angleValue) : null;
      var supplementary = angleValue <= 180 ? (180 - angleValue) : null;
      var verticalAngle = angleValue; // vertical angles are equal
      var explementary = 360 - angleValue; // explement (conjugate)

      // ══════════════════════════════════════════════════════════════
      // ── SVG Geometry ──
      // ══════════════════════════════════════════════════════════════
      var cx = 200, cy = 200, r = 160, rayLen = 170;
      var rad = angleValue * Math.PI / 180;
      var rayEndX = cx + rayLen * Math.cos(-rad);
      var rayEndY = cy + rayLen * Math.sin(-rad);
      var arcR = 60;
      var arcEndX = cx + arcR * Math.cos(-rad);
      var arcEndY = cy + arcR * Math.sin(-rad);
      var largeArc = angleValue > 180 ? 1 : 0;

      // Bisector ray
      var bisectorRad = (angleValue / 2) * Math.PI / 180;
      var bisEndX = cx + (rayLen * 0.85) * Math.cos(-bisectorRad);
      var bisEndY = cy + (rayLen * 0.85) * Math.sin(-bisectorRad);

      // Second ray
      var rad2 = secondAngle * Math.PI / 180;
      var ray2EndX = cx + rayLen * Math.cos(-rad2);
      var ray2EndY = cy + rayLen * Math.sin(-rad2);
      var angleBetween = Math.abs(secondAngle - angleValue);
      if (angleBetween > 180) angleBetween = 360 - angleBetween;

      // ── Clock angle calculation ──
      var calcClockAngle = function(hr, min) {
        var hourAngle = (hr % 12) * 30 + min * 0.5;
        var minuteAngle = min * 6;
        var diff = Math.abs(hourAngle - minuteAngle);
        return diff > 180 ? 360 - diff : diff;
      };
      var clockAngle = calcClockAngle(clockHour, clockMinute);

      // ── Polygon interior angle ──
      var polyInterior = function(n) { return ((n - 2) * 180) / n; };
      var polyExterior = function(n) { return 360 / n; };
      var polyAngleSum = function(n) { return (n - 2) * 180; };

      // ── Triangle angle sum ──
      var triAngle3 = 180 - triAngle1 - triAngle2;
      var triValid = triAngle3 > 0 && triAngle1 > 0 && triAngle2 > 0;

      // ══════════════════════════════════════════════════════════════
      // ── Snap Helper ──
      // ══════════════════════════════════════════════════════════════
      var snapAngle = function(deg) {
        if (!snapEnabled) return deg;
        return Math.round(deg / 15) * 15;
      };

      // ══════════════════════════════════════════════════════════════
      // ── Drag Handlers ──
      // ══════════════════════════════════════════════════════════════
      var calcAngleFromEvent = function(svgEl, clientX, clientY) {
        var rect = svgEl.getBoundingClientRect();
        var dx = clientX - rect.left - cx * (rect.width / 400);
        var dy = -(clientY - rect.top - cy * (rect.height / 420));
        var deg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
        if (deg < 0) deg += 360;
        return snapAngle(deg);
      };
      var handleDrag = function(startEvt) {
        var svgEl = startEvt.target.closest('svg');
        var onMove = function(me) {
          setAngleValue(calcAngleFromEvent(svgEl, me.clientX, me.clientY));
          setAngleFeedback(null);
        };
        var onUp = function() {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      };
      var handleTouchDrag = function(startEvt) {
        startEvt.preventDefault();
        var svgEl = startEvt.target.closest('svg');
        var onTouchMove = function(te) {
          te.preventDefault();
          if (te.touches.length === 1) {
            setAngleValue(calcAngleFromEvent(svgEl, te.touches[0].clientX, te.touches[0].clientY));
            setAngleFeedback(null);
          }
        };
        var onTouchEnd = function() {
          window.removeEventListener('touchmove', onTouchMove);
          window.removeEventListener('touchend', onTouchEnd);
        };
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
      };
      // Second ray drag
      var handleDrag2 = function(startEvt) {
        var svgEl = startEvt.target.closest('svg');
        var onMove = function(me) { upd('secondAngle', calcAngleFromEvent(svgEl, me.clientX, me.clientY)); };
        var onUp = function() { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      };
      var handleTouchDrag2 = function(startEvt) {
        startEvt.preventDefault();
        var svgEl = startEvt.target.closest('svg');
        var onTouchMove = function(te) { te.preventDefault(); if (te.touches.length === 1) upd('secondAngle', calcAngleFromEvent(svgEl, te.touches[0].clientX, te.touches[0].clientY)); };
        var onTouchEnd = function() { window.removeEventListener('touchmove', onTouchMove); window.removeEventListener('touchend', onTouchEnd); };
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
      };

      // ══════════════════════════════════════════════════════════════
      // ── Badge Checker ──
      // ══════════════════════════════════════════════════════════════
      var checkBadges = function(updates) {
        var newBadges = Object.assign({}, earnedBadges);
        var awarded = [];
        var check = function(id, cond) {
          if (!newBadges[id] && cond) { newBadges[id] = Date.now(); awarded.push(id); }
        };
        var s = updates || {};
        var curStreak = s.streak != null ? s.streak : streak;
        var curTotal = exploreScore.total + (s.totalDelta || 0);
        var curEstCount = s.estimateCount != null ? s.estimateCount : estimateCount;
        var curSpeedScore = s.speedScore != null ? s.speedScore : speedScore;
        var curTypesSeen = s.typesSeen || typesSeen;
        var curPolygons = s.polygonsExplored || polygonsExplored;

        check('first_angle', angleValue > 0);
        check('right_on', angleValue === 90);
        check('straight_up', angleValue === 180);
        check('full_circle', angleValue === 360 || angleValue === 0);
        check('acute_eye', (curTypesSeen['Acute'] || 0) >= 5);
        check('streak_5', curStreak >= 5);
        check('streak_10', curStreak >= 10);
        check('speed_demon', curSpeedScore >= 10);
        check('estimator', curEstCount >= 3);
        check('all_types', (curTypesSeen['Acute'] || 0) >= 1 && ((curTypesSeen[t('stem.calculus.right') || 'Right'] || 0) >= 1 || (curTypesSeen['Right'] || 0) >= 1) && (curTypesSeen['Obtuse'] || 0) >= 1 && (curTypesSeen['Straight'] || 0) >= 1 && (curTypesSeen['Reflex'] || 0) >= 1);
        check('polygon_pro', Object.keys(curPolygons).length >= 5);
        check('century', curTotal >= 100);

        if (awarded.length > 0) {
          upd('earnedBadges', newBadges);
          awarded.forEach(function(bid) {
            var badge = badgeDefs.find(function(b) { return b.id === bid; });
            if (badge && addToast) addToast('\uD83C\uDFC5 Badge: ' + badge.icon + ' ' + badge.name + '!', 'success');
            if (awardXP) awardXP('protractor_badge_' + bid, 5, 'Badge: ' + (badge ? badge.name : bid));
          });
          if (soundEnabled) sfxBadge();
          if (celebrate) celebrate();
        }
      };

      // ══════════════════════════════════════════════════════════════
      // ── Challenge Logic ──
      // ══════════════════════════════════════════════════════════════
      var targetAngles = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 240, 270, 300, 330];

      var recordCorrect = function(classType) {
        var newStreak = streak + 1;
        var newBest = Math.max(bestStreak, newStreak);
        var newTypes = Object.assign({}, typesSeen);
        newTypes[classType] = (newTypes[classType] || 0) + 1;
        upd({ streak: newStreak, bestStreak: newBest, typesSeen: newTypes });
        if (soundEnabled) sfxCorrect();
        checkBadges({ streak: newStreak, totalDelta: 1, typesSeen: newTypes });
      };

      var recordWrong = function() {
        upd('streak', 0);
        if (soundEnabled) sfxWrong();
      };

      // Tolerance shrinks with streak (progressive difficulty)
      var tolerance = Math.max(1, 5 - Math.floor(streak / 3));

      var checkAngle = function() {
        if (!angleChallenge) return;
        if (angleChallenge.type === 'create') {
          var diff = Math.abs(angleValue - angleChallenge.target);
          var ok = diff <= tolerance;
          announceToSR(ok ? 'Correct!' : 'Incorrect, try again');
          setAngleFeedback(ok
            ? { correct: true, msg: '\u2705 Correct! ' + angleValue + '\u00B0 is a ' + classifyAngle(angleValue) + ' angle! (tolerance: \u00B1' + tolerance + '\u00B0)' }
            : { correct: false, msg: '\u274C You made ' + angleValue + '\u00B0. Target is ' + angleChallenge.target + '\u00B0. (within ' + tolerance + '\u00B0)' }
          );
          setExploreScore(function(prev) { return { correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }; });
          if (ok) { awardXP('protractor', 5, 'create angle'); recordCorrect(classifyAngle(angleChallenge.target)); }
          else recordWrong();
        } else if (angleChallenge.type === 'classify') {
          var correctClass = classifyAngle(angleChallenge.target);
          var ok2 = classifyAngle(angleValue) === correctClass;
          announceToSR(ok2 ? 'Correct!' : 'Incorrect, try again');
          setAngleFeedback(ok2
            ? { correct: true, msg: '\u2705 Correct! ' + angleChallenge.target + '\u00B0 is ' + correctClass + '.' }
            : { correct: false, msg: '\u274C ' + angleChallenge.target + '\u00B0 is ' + correctClass + ', not ' + classifyAngle(angleValue) + '.' }
          );
          setExploreScore(function(prev) { return { correct: prev.correct + (ok2 ? 1 : 0), total: prev.total + 1 }; });
          if (ok2) { awardXP('protractor', 5, 'classify angle'); recordCorrect(correctClass); }
          else recordWrong();
        }
      };

      // ── Estimate Mode ──
      var startEstimate = function() {
        var target = targetAngles[Math.floor(Math.random() * targetAngles.length)];
        setAngleValue(target);
        upd({ estimateActive: true, estimateTarget: target, estimateGuess: '', estimateResult: null });
      };

      var checkEstimate = function() {
        var guess = parseInt(estimateGuess);
        if (isNaN(guess)) return;
        var diff = Math.abs(guess - estimateTarget);
        // Progressive difficulty: tolerance tightens as the streak grows (6° down to 2°).
        var estTolerance = Math.max(2, 6 - Math.floor((streak || 0) / 2));
        var ok = diff <= estTolerance;
        var exact = diff === 0;
        var newEstCount = estimateCount + (ok ? 1 : 0);
        upd({
          estimateResult: { guess: guess, target: estimateTarget, diff: diff, ok: ok, exact: exact },
          estimateCount: newEstCount
        });
        setExploreScore(function(prev) { return { correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }; });
        if (ok) { awardXP('protractor', exact ? 10 : 5, 'estimate angle'); recordCorrect(classifyAngle(estimateTarget)); checkBadges({ estimateCount: newEstCount, totalDelta: 1 }); }
        else recordWrong();
      };

      // ── Speed Round ──
      var startSpeedRound = function() {
        var target = targetAngles[Math.floor(Math.random() * targetAngles.length)];
        upd({ speedActive: true, speedScore: 0, speedTimeLeft: 30, speedTarget: { angle: target, type: classifyAngle(target) } });
        // Timer countdown (uses setTimeout chain)
        var countdown = function() {
          upd('speedTimeLeft', (function() {
            var cur = (ctx.toolData && ctx.toolData.protractor && ctx.toolData.protractor.speedTimeLeft) || 0;
            if (cur <= 1) {
              upd('speedActive', false);
              var finalScore = (ctx.toolData && ctx.toolData.protractor && ctx.toolData.protractor.speedScore) || 0;
              if (addToast) addToast('\u23F1\uFE0F Time\u2019s up! Score: ' + finalScore, 'info');
              checkBadges({ speedScore: finalScore });
              return 0;
            }
            if (soundEnabled) sfxTick();
            setTimeout(countdown, 1000);
            return cur - 1;
          })());
        };
        setTimeout(countdown, 1000);
      };

      var answerSpeed = function(cls) {
        if (!speedTarget) return;
        var ok = cls === speedTarget.type;
        if (ok) {
          var newScore = speedScore + 1;
          var nextAngle = targetAngles[Math.floor(Math.random() * targetAngles.length)];
          upd({ speedScore: newScore, speedTarget: { angle: nextAngle, type: classifyAngle(nextAngle) } });
          if (soundEnabled) sfxCorrect();
          setExploreScore(function(prev) { return { correct: prev.correct + 1, total: prev.total + 1 }; });
        } else {
          if (soundEnabled) sfxWrong();
          setExploreScore(function(prev) { return { correct: prev.correct, total: prev.total + 1 }; });
        }
      };

      // ── AI Tutor ──
      // aiLoading prevents simultaneous fetches; the request-ID guard
      // prevents a stale response from overwriting newer context (e.g.,
      // student changes angle while a fetch is mid-flight).
      var askAITutor = function() {
        if (!callGemini || aiLoading) return;
        window.__anglesAiReqId = (window.__anglesAiReqId || 0) + 1;
        var thisReqId = window.__anglesAiReqId;
        upd({ aiLoading: true });
        var desc = 'The student is exploring ' + angleValue + '\u00B0 (' + angleClass + ' angle). '
          + 'Score: ' + exploreScore.correct + '/' + exploreScore.total + '. '
          + 'Streak: ' + streak + '. '
          + (angleChallenge ? 'Current challenge: ' + angleChallenge.type + ' (' + angleChallenge.target + '\u00B0). ' : '')
          + 'Complementary: ' + (complementary != null ? complementary + '\u00B0' : 'N/A') + ', Supplementary: ' + (supplementary != null ? supplementary + '\u00B0' : 'N/A') + '.';
        var prompt = 'You are a friendly math tutor in a kids\' angle explorer game. ' + desc +
          ' Give 2-3 SHORT, encouraging tips about angles. Include one fun real-world angle fact. '
          + 'Use emoji. Keep it fun for ages 8-14. Return JSON: { "tips": ["tip1","tip2","tip3"], "funFact": "..." }';
        callGemini(prompt, true, false, 0.8).then(function(resp) {
          if (thisReqId !== window.__anglesAiReqId) return;
          try {
            var parsed = typeof resp === 'string' ? JSON.parse(resp.replace(/```json\s*/g,'').replace(/```/g,'').trim()) : resp;
            var text = '';
            if (parsed.tips) parsed.tips.forEach(function(t,i) { text += (i > 0 ? '\n' : '') + t; });
            if (parsed.funFact) text += '\n\n\uD83D\uDCD0 ' + parsed.funFact;
            upd({ aiAdvice: text, aiLoading: false });
          } catch(e) { upd({ aiAdvice: typeof resp === 'string' ? resp : 'Try exploring different angles!', aiLoading: false }); }
        }).catch(function() {
          if (thisReqId !== window.__anglesAiReqId) return;
          upd({ aiAdvice: '\u26A0\uFE0F Could not reach AI tutor. Try again later!', aiLoading: false });
        });
      };

      // ── Pin current angle ──
      var pinAngle = function() {
        var pins = (anglePins || []).slice();
        if (pins.length >= 8) { if (addToast) addToast('\u26A0\uFE0F Max 8 pins! Remove one first.', 'error'); return; }
        pins.push({ deg: angleValue, cls: angleClass, color: cc.text.replace('text-', '') });
        upd('anglePins', pins);
        if (soundEnabled) sfxClick();
      };

      var removePin = function(idx) {
        var pins = (anglePins || []).slice();
        pins.splice(idx, 1);
        upd('anglePins', pins);
      };

      // ── History logger ──
      var logAngle = function(angle, action) {
        var hist = (angleHistory || []).slice();
        hist.unshift({ deg: angle, cls: classifyAngle(angle), action: action, ts: Date.now() });
        if (hist.length > 20) hist = hist.slice(0, 20);
        upd('angleHistory', hist);
      };

      // ── SVG Export ──
      var exportSVG = function() {
        var svgEl = document.querySelector('[data-protractor-svg]');
        if (!svgEl) { if (addToast) addToast('\u26A0\uFE0F SVG not ready', 'error'); return; }
        var svgData = new XMLSerializer().serializeToString(svgEl);
        var blob = new Blob([svgData], { type: 'image/svg+xml' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'angle_explorer_' + angleValue + 'deg_' + Date.now() + '.svg'; a.click();
        URL.revokeObjectURL(url);
        if (addToast) addToast('\uD83D\uDCD0 SVG exported!', 'success');
      };

      // ── Tick marks ──
      var tickAngles = [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345];
      var tickElements = tickAngles.map(function(a) {
        var ar = a * Math.PI / 180;
        var major = a % 90 === 0;
        var mid = a % 30 === 0;
        var tickLen = major ? 12 : mid ? 8 : 4;
        var els = [
          h('line', { key: 'tk' + a, x1: cx + (r - tickLen) * Math.cos(-ar), y1: cy + (r - tickLen) * Math.sin(-ar), x2: cx + (r + 2) * Math.cos(-ar), y2: cy + (r + 2) * Math.sin(-ar), stroke: major ? '#7c3aed' : '#a78bfa', strokeWidth: major ? 2 : mid ? 1.5 : 0.8 })
        ];
        if (a % 30 === 0) {
          els.push(h('text', { key: 'tl' + a, x: cx + (r + 16) * Math.cos(-ar), y: cy + (r + 16) * Math.sin(-ar) + 3, textAnchor: 'middle', className: 'text-[11px] fill-purple-400 font-mono select-none' }, a + '\u00B0'));
        }
        return h(React.Fragment, { key: 'tg' + a }, els);
      });

      // Pin markers on protractor
      var pinElements = (anglePins || []).map(function(pin, i) {
        var pr = pin.deg * Math.PI / 180;
        var px = cx + (rayLen * 0.7) * Math.cos(-pr);
        var py = cy + (rayLen * 0.7) * Math.sin(-pr);
        return h('g', { key: 'pin' + i },
          h('circle', { cx: px, cy: py, r: 6, fill: '#fbbf24', fillOpacity: 0.7, stroke: '#f59e0b', strokeWidth: 1.5 }),
          h('text', { x: px, y: py + 3, textAnchor: 'middle', className: 'text-[11px] fill-amber-900 font-bold select-none' }, pin.deg + '\u00B0')
        );
      });

      // ══════════════════════════════════════════════════════════════
      // ── Tab Button Helper ──
      // ══════════════════════════════════════════════════════════════
      var tabBtn = function(id, label, icon) {
        var active = activeTab === id;
        return h('button', { onClick: function() { upd('activeTab', id); if (soundEnabled) sfxClick(); },
          role: 'tab', 'aria-selected': active,
          className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' +
            (active ? 'bg-purple-700 text-white shadow-md' : 'bg-white text-purple-600 hover:bg-purple-50 border border-purple-600')
        }, icon + ' ' + label);
      };

      // ══════════════════════════════════════════════════════════════
      // ── RENDER ──
      // ══════════════════════════════════════════════════════════════
      var __anglesMainView = h('div', { className: 'space-y-3 max-w-4xl mx-auto animate-in fade-in duration-200' },

        // ── Header ──
        h('div', { className: 'flex items-center gap-3 mb-1' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg transition-colors', 'aria-label': 'Back to tools' },
            h(ArrowLeft, { size: 18, className: 'text-slate-600' })),
          h('h3', { className: 'text-lg font-bold text-purple-800' }, '\uD83D\uDCD0 Angle Explorer'),
          // Score + streak
          h('div', { className: 'flex items-center gap-2 ml-1' },
            h('div', { className: 'text-xs font-bold text-emerald-600' }, '\u2714 ' + exploreScore.correct + '/' + exploreScore.total),
            streak > 0 && h('div', { className: 'text-xs font-bold text-amber-500' }, '\uD83D\uDD25 ' + streak),
            bestStreak > 0 && h('div', { className: 'text-[11px] text-slate-600' }, 'Best: ' + bestStreak)
          ),
          h('div', { className: 'flex items-center gap-1 ml-auto' },
            // Badge count
            h('button', { onClick: function() { upd('showBadges', !showBadges); }, className: 'text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all ' + (showBadges ? 'bg-amber-100 border-amber-600 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200') },
              '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + badgeDefs.length),
            // Sound toggle
            h('button', { onClick: function() { upd('soundEnabled', !soundEnabled); }, className: 'text-sm px-1.5 py-0.5 rounded transition-colors hover:bg-slate-100', title: 'Sound effects' },
              soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
            // Snapshot
            h('button', { 'aria-label': 'Export S V G',
              onClick: function() {
                var snap = { id: 'snap-' + Date.now(), tool: 'protractor', label: 'Angle: ' + angleValue + '\u00B0', data: { angle: angleValue }, timestamp: Date.now() };
                setToolSnapshots(function(prev) { return prev.concat([snap]); });
                addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
                logAngle(angleValue, 'snapshot');
              },
              className: 'text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-400 rounded-full px-2 py-0.5 transition-all'
            }, '\uD83D\uDCF8'),
            // SVG Export
            h('button', { 'aria-label': 'SVG', onClick: exportSVG, className: 'text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-400 rounded-full px-2 py-0.5 transition-all' },
              '\uD83D\uDCE5 SVG')
          )
        ),

        // ── Badge Drawer ──
        showBadges && h('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
          h('div', { className: 'text-xs font-bold text-amber-700 uppercase mb-2' }, '\uD83C\uDFC5 Achievement Badges'),
          h('div', { className: 'grid grid-cols-3 sm:grid-cols-4 gap-2' },
            badgeDefs.map(function(badge) {
              var earned = !!earnedBadges[badge.id];
              return h('div', { key: badge.id, className: 'flex items-center gap-2 p-2 rounded-lg transition-all ' + (earned ? 'bg-amber-100 border border-amber-300' : 'bg-white border border-slate-400 opacity-50') },
                h('span', { className: 'text-lg', style: earned ? {} : { filter: 'grayscale(1)' } }, badge.icon),
                h('div', null,
                  h('div', { className: 'text-[11px] font-bold ' + (earned ? 'text-amber-800' : 'text-slate-600') }, badge.name),
                  h('div', { className: 'text-[11px] ' + (earned ? 'text-amber-600' : 'text-slate-600') }, badge.desc)
                )
              );
            })
          )
        ),

        // ── Tab Navigation ──
        h('div', { className: 'flex gap-2 flex-wrap', role: 'tablist', 'aria-label': 'Angle Explorer sections' },
          tabBtn('explore', 'Explore', '\uD83D\uDCD0'),
          tabBtn('challenges', 'Challenges', '\uD83C\uDFAF'),
          tabBtn('reference', 'Learn', '\uD83D\uDCDA'),
          tabBtn('tools', 'Tools', '\uD83D\uDEE0\uFE0F')
        ),

        // ── Topic-accent hero band per tab ──
        (function() {
          var TAB_META = {
            explore:    { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '\uD83D\uDCD0', title: 'Explore \u2014 drag the protractor, name the angle', hint: 'Acute < 90\u00b0, right = 90\u00b0, obtuse 90\u2013180\u00b0, straight = 180\u00b0, reflex > 180\u00b0. The protractor was invented around 1801; the half-circle version still runs every geometry class.' },
            challenges: { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83C\uDFAF', title: 'Challenges \u2014 estimate, classify, measure',     hint: 'Estimation builds spatial sense; precise measurement builds the protractor habit. Common Core 4.MD.5\u20137: angles as fractions of a full turn (1/360 of a rotation).' },
            reference:  { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83D\uDCDA', title: 'Learn \u2014 the angle relationships',              hint: 'Complementary sum to 90\u00b0; supplementary to 180\u00b0; vertical pairs are equal; alternate interior angles match when lines are parallel. These four facts unlock most middle-school proofs.' },
            tools:      { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)',  icon: '\uD83D\uDEE0',  title: 'Tools \u2014 bisector, second ray, calculator',     hint: 'Bisect = cut in half (the construction with compass + straightedge is in Euclid Book I, Proposition 9). Modern tools: protractor, miter saw, theodolite \u2014 all the same idea, calibrated.' }
          };
          var meta = TAB_META[activeTab] || TAB_META.explore;
          return h('div', {
            style: {
              margin: '0 0 12px',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
              border: '1px solid ' + meta.accent + '55',
              borderLeft: '4px solid ' + meta.accent,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }
          },
            h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
              h('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),

        // ══════════════════════════════════════════════════════════
        // ── TAB: Explore ──
        // ══════════════════════════════════════════════════════════
        activeTab === 'explore' && h('div', { className: 'space-y-3' },
          // ── SVG Protractor ──
          h('div', { className: 'bg-white rounded-xl border-2 border-purple-200 p-3 flex justify-center relative' },
            h('svg', { width: 400, height: 420, className: 'select-none', 'data-protractor-svg': true },
              // Outer circle + semi-circle fills
              h('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: '#e9d5ff', strokeWidth: 1 }),
              // Filled angle wedge
              angleValue > 0 && angleValue < 360 && h('path', {
                d: 'M ' + cx + ' ' + cy + ' L ' + (cx + arcR) + ' ' + cy + ' A ' + arcR + ' ' + arcR + ' 0 ' + largeArc + ' 0 ' + arcEndX + ' ' + arcEndY + ' Z',
                fill: 'hsla(270,80%,60%,0.1)', stroke: 'none'
              }),
              // Tick marks
              tickElements,
              // Pin markers
              pinElements,
              // Base ray
              h('line', { x1: cx, y1: cy, x2: cx + rayLen, y2: cy, stroke: '#94a3b8', strokeWidth: 2 }),
              // Angle ray
              h('line', { x1: cx, y1: cy, x2: rayEndX, y2: rayEndY, stroke: '#7c3aed', strokeWidth: 3, strokeLinecap: 'round' }),
              // Bisector ray (dashed)
              showBisector && h('line', { x1: cx, y1: cy, x2: bisEndX, y2: bisEndY, stroke: '#f59e0b', strokeWidth: 1.5, strokeDasharray: '6,3', strokeLinecap: 'round' }),
              showBisector && h('text', { x: bisEndX + 8, y: bisEndY - 4, className: 'text-[11px] fill-amber-500 font-bold select-none' }, (angleValue / 2).toFixed(1) + '\u00B0'),
              // Second ray
              showSecondRay && h('line', { x1: cx, y1: cy, x2: ray2EndX, y2: ray2EndY, stroke: '#06b6d4', strokeWidth: 2.5, strokeLinecap: 'round', strokeDasharray: '8,3' }),
              showSecondRay && h('circle', { cx: ray2EndX, cy: ray2EndY, r: 12, fill: '#06b6d4', fillOpacity: 0.15, stroke: '#06b6d4', strokeWidth: 1.5, className: 'cursor-grab', onMouseDown: handleDrag2, onTouchStart: handleTouchDrag2 }),
              showSecondRay && h('text', { x: cx, y: cy + arcR + 22, textAnchor: 'middle', className: 'text-[11px] fill-cyan-600 font-bold select-none' }, '\u2220 Between: ' + angleBetween + '\u00B0'),
              // Arc
              angleValue > 0 && angleValue < 360 && h('path', {
                d: 'M ' + (cx + arcR) + ' ' + cy + ' A ' + arcR + ' ' + arcR + ' 0 ' + largeArc + ' 0 ' + arcEndX + ' ' + arcEndY,
                fill: 'none', stroke: '#7c3aed', strokeWidth: 1.5
              }),
              // Right angle marker
              angleValue === 90 && h('rect', { x: cx + 14, y: cy - 14, width: 12, height: 12, fill: 'none', stroke: '#22c55e', strokeWidth: 2 }),
              // Angle label in center
              h('text', { x: cx + arcR * 0.5 * Math.cos(-rad / 2), y: cy + arcR * 0.5 * Math.sin(-rad / 2) + 4, textAnchor: 'middle', className: 'text-sm fill-purple-700 font-bold select-none' },
                estimateActive ? '?' : convertedAngle
              ),
              // Draggable handle
              h('circle', { cx: rayEndX, cy: rayEndY, r: 14, fill: '#7c3aed', fillOpacity: 0.2, stroke: '#7c3aed', strokeWidth: 2, className: 'cursor-grab', onMouseDown: estimateActive ? undefined : handleDrag, onTouchStart: estimateActive ? undefined : handleTouchDrag }),
              // Center dot
              h('circle', { cx: cx, cy: cy, r: 4, fill: '#334155' }),
              // Vertex label
              h('text', { x: cx - 12, y: cy + 5, className: 'text-[11px] fill-slate-500 font-mono select-none' }, 'V')
            ),
            // Overlay: type badge
            h('div', { className: 'absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold ' + cc.bg + ' ' + cc.text + ' ' + cc.border + ' border' }, angleClass)
          ),

          // ── Controls row ──
          h('div', { className: 'grid grid-cols-4 gap-2' },
            h('div', { className: 'bg-white rounded-xl p-2.5 border border-purple-100 text-center' },
              h('div', { className: 'text-[11px] font-bold text-purple-600 uppercase mb-0.5' }, 'Angle'),
              h('div', { className: 'text-xl font-bold text-purple-800' }, convertedAngle)
            ),
            h('div', { className: 'bg-white rounded-xl p-2.5 border border-purple-100 text-center' },
              h('div', { className: 'text-[11px] font-bold text-purple-600 uppercase mb-0.5' }, 'Type'),
              h('div', { className: 'text-base font-bold ' + cc.text }, angleClass)
            ),
            h('div', { className: 'bg-white rounded-xl p-2.5 border border-purple-100 text-center' },
              h('div', { className: 'text-[11px] font-bold text-purple-600 uppercase mb-0.5' }, 'Explement'),
              h('div', { className: 'text-base font-bold text-slate-700' }, explementary + '\u00B0')
            ),
            h('div', { className: 'bg-white rounded-xl p-2.5 border border-purple-100 text-center col-span-1' },
              h('div', { className: 'text-[11px] font-bold text-purple-600 uppercase mb-0.5' }, 'Unit'),
              h('select', { value: angleUnit, onChange: function(e) { upd('angleUnit', e.target.value); }, 'aria-label': 'Angle unit', className: 'text-xs font-bold text-purple-800 bg-transparent border-none outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 cursor-pointer w-full text-center' },
                h('option', { value: 'deg' }, 'Degrees'),
                h('option', { value: 'rad' }, 'Radians'),
                h('option', { value: 'grad' }, 'Gradians'),
                h('option', { value: 'turns' }, 'Turns')
              )
            )
          ),

          // Slider
          h('div', { className: 'bg-white rounded-xl p-3 border border-purple-100' },
            h('input', { type: 'range', min: 0, max: 360, value: angleValue, onChange: function(e) { setAngleValue(snapAngle(parseInt(e.target.value))); setAngleFeedback(null); }, 'aria-label': 'Angle value slider', className: 'w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600' }),
            h('div', { className: 'flex justify-between mt-1' },
              h('span', { className: 'text-[11px] text-slate-600' }, '0\u00B0'),
              h('div', { className: 'flex gap-2' },
                h('label', { className: 'flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer' },
                  h('input', { type: 'checkbox', checked: snapEnabled, onChange: function() { upd('snapEnabled', !snapEnabled); }, className: 'accent-purple-500' }),
                  'Snap 15\u00B0'
                ),
                h('label', { className: 'flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer' },
                  h('input', { type: 'checkbox', checked: showBisector, onChange: function() { upd('showBisector', !showBisector); }, className: 'accent-amber-500' }),
                  'Bisector'
                ),
                h('label', { className: 'flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer' },
                  h('input', { type: 'checkbox', checked: showSecondRay, onChange: function() { upd('showSecondRay', !showSecondRay); }, className: 'accent-cyan-500' }),
                  '2nd Ray'
                )
              ),
              h('span', { className: 'text-[11px] text-slate-600' }, '360\u00B0')
            )
          ),

          // Quick angle buttons + Pin
          h('div', { className: 'flex gap-1.5 flex-wrap' },
            [0, 30, 45, 60, 90, 120, 135, 150, 180, 270, 360].map(function(a) {
              return h('button', { 'aria-label': 'Set angle to ' + a + ' degrees', 'aria-pressed': angleValue === a, key: a, onClick: function() { setAngleValue(a); setAngleFeedback(null); if (soundEnabled) sfxClick(); logAngle(a, 'quick'); },
                className: 'px-2 py-1 rounded-lg text-[11px] font-bold transition-all ' + (angleValue === a ? 'bg-purple-700 text-white shadow' : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-600')
              }, a + '\u00B0');
            }),
            h('button', { 'aria-label': 'Pin', onClick: pinAngle, className: 'px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-600 transition-all', title: 'Pin this angle on protractor' }, '\uD83D\uDCCC Pin')
          ),

          // Pinned angles
          anglePins.length > 0 && h('div', { className: 'flex gap-1.5 flex-wrap items-center' },
            h('span', { className: 'text-[11px] text-slate-600 font-bold' }, 'Pins:'),
            anglePins.map(function(pin, i) {
              return h('button', { 'aria-label': 'Complementary', key: i, onClick: function() { removePin(i); }, className: 'px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-600 hover:bg-red-100 hover:text-red-600 hover:border-red-600 transition-all', title: 'Click to remove' },
                pin.deg + '\u00B0 \u2715'
              );
            })
          ),

          // ── Supplementary / Complementary / Relationships ──
          h('div', { className: 'flex gap-2 flex-wrap' },
            complementary != null && h('div', { className: 'flex-1 bg-blue-50 rounded-lg p-2 border border-blue-100 text-center min-w-[120px]' },
              h('div', { className: 'text-[11px] font-bold text-blue-500 uppercase' }, 'Complementary'),
              h('div', { className: 'text-sm font-bold text-blue-700' }, complementary + '\u00B0'),
              h('div', { className: 'text-[11px] text-blue-400' }, angleValue + '\u00B0 + ' + complementary + '\u00B0 = 90\u00B0')
            ),
            supplementary != null && h('div', { className: 'flex-1 bg-teal-50 rounded-lg p-2 border border-teal-100 text-center min-w-[120px]' },
              h('div', { className: 'text-[11px] font-bold text-teal-500 uppercase' }, 'Supplementary'),
              h('div', { className: 'text-sm font-bold text-teal-700' }, supplementary + '\u00B0'),
              h('div', { className: 'text-[11px] text-teal-400' }, angleValue + '\u00B0 + ' + supplementary + '\u00B0 = 180\u00B0')
            ),
            h('div', { className: 'flex-1 bg-indigo-50 rounded-lg p-2 border border-indigo-100 text-center min-w-[120px]' },
              h('div', { className: 'text-[11px] font-bold text-indigo-500 uppercase' }, 'Vertical Angle'),
              h('div', { className: 'text-sm font-bold text-indigo-700' }, verticalAngle + '\u00B0'),
              h('div', { className: 'text-[11px] text-indigo-400' }, 'Vertical angles are equal!')
            )
          ),

          // ── Real-world examples ──
          h('div', { className: cc.bg + ' rounded-xl p-3 border ' + cc.border },
            h('div', { className: 'text-[11px] font-bold ' + cc.text + ' uppercase mb-1.5' }, '\uD83C\uDF0D Real-World ' + angleClass + ' Angles'),
            h('div', { className: 'space-y-1' },
              (realWorldExamples[angleClass] || []).map(function(ex, i) {
                return h('div', { key: i, className: 'flex items-center gap-2 text-xs text-slate-700' },
                  h('span', { className: 'text-base' }, ex.icon),
                  h('span', null, ex.example)
                );
              })
            )
          ),

          // ── AI Tutor ──
          callGemini && h('div', { className: 'bg-pink-50 rounded-xl p-3 border border-pink-200' },
            h('div', { className: 'flex items-center gap-2 mb-1.5' },
              h('span', { className: 'text-[11px] font-bold text-pink-600 uppercase' }, '\uD83E\uDD16 AI Angle Tutor'),
              h('button', { 'aria-label': 'Click to get personalized angle tips!', onClick: askAITutor, disabled: aiLoading, className: 'ml-auto px-3 py-1 text-[11px] font-bold rounded-full transition-all ' + (aiLoading ? 'bg-pink-200 text-pink-400 cursor-wait' : 'bg-pink-700 text-white hover:bg-pink-600 cursor-pointer') },
                aiLoading ? '\u23F3 Thinking...' : '\u2728 Ask for Tips')
            ),
            aiAdvice
              ? h('div', { className: 'text-xs text-slate-700 leading-relaxed whitespace-pre-line' }, aiAdvice)
              : h('div', { className: 'text-xs text-pink-400' }, 'Click to get personalized angle tips!')
          )
        ),

        // ══════════════════════════════════════════════════════════
        // ── TAB: Challenges ──
        // ══════════════════════════════════════════════════════════
        activeTab === 'challenges' && h('div', { className: 'space-y-3' },
          // Tolerance indicator
          h('div', { className: 'flex items-center gap-2 text-[11px]' },
            h('span', { className: 'text-slate-600' }, 'Difficulty:'),
            h('span', { className: 'font-bold ' + (tolerance <= 2 ? 'text-red-500' : tolerance <= 3 ? 'text-orange-500' : 'text-green-500') },
              tolerance <= 2 ? '\uD83D\uDD25 Expert (\u00B1' + tolerance + '\u00B0)' : tolerance <= 3 ? '\u26A1 Medium (\u00B1' + tolerance + '\u00B0)' : '\uD83C\uDF3F Easy (\u00B1' + tolerance + '\u00B0)'
            ),
            streak > 0 && h('span', { className: 'text-amber-500 font-bold' }, '\uD83D\uDD25 Streak: ' + streak)
          ),

          // ── Challenge buttons ──
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
            h('button', { 'aria-label': 'Create',
              onClick: function() {
                var ta = targetAngles[Math.floor(Math.random() * targetAngles.length)];
                setAngleChallenge({ type: 'create', target: ta }); setAngleValue(0); setAngleFeedback(null);
                logAngle(ta, 'create_challenge');
              },
              className: 'py-2.5 bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold rounded-lg text-sm hover:from-purple-600 hover:to-violet-600 transition-all shadow-md'
            }, '\uD83C\uDFAF Create'),
            h('button', { 'aria-label': 'Classify',
              onClick: function() {
                var ta = targetAngles[Math.floor(Math.random() * targetAngles.length)];
                setAngleChallenge({ type: 'classify', target: ta }); setAngleValue(ta); setAngleFeedback(null);
                logAngle(ta, 'classify_challenge');
              },
              className: 'py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-bold rounded-lg text-sm hover:from-indigo-600 hover:to-blue-600 transition-all shadow-md'
            }, '\uD83E\uDDE0 Classify'),
            h('button', { 'aria-label': 'Estimate',
              onClick: startEstimate,
              className: 'py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md'
            }, '\uD83D\uDC41\uFE0F Estimate'),
            h('button', { 'aria-label': 'Speed Round',
              onClick: startSpeedRound,
              disabled: speedActive,
              className: 'py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold rounded-lg text-sm hover:from-red-600 hover:to-rose-600 transition-all shadow-md disabled:opacity-50'
            }, '\u26A1 Speed Round')
          ),

          // ── Speed Round UI ──
          speedActive && h('div', { className: 'bg-red-50 rounded-xl p-4 border-2 border-red-300 animate-in fade-in' },
            h('div', { className: 'flex items-center justify-between mb-3' },
              h('div', { className: 'text-sm font-bold text-red-700' }, '\u26A1 Speed Round'),
              h('div', { className: 'flex gap-3' },
                h('div', { className: 'text-lg font-bold text-red-600' }, '\u23F1 ' + speedTimeLeft + 's'),
                h('div', { className: 'text-lg font-bold text-emerald-600' }, '\u2714 ' + speedScore)
              )
            ),
            speedTarget && h('div', null,
              h('div', { className: 'text-center mb-2' },
                h('div', { className: 'text-3xl font-bold text-red-800' }, speedTarget.angle + '\u00B0'),
                h('div', { className: 'text-xs text-red-500' }, 'What type of angle is this?')
              ),
              h('div', { className: 'flex gap-2 flex-wrap justify-center' },
                ['Acute', t('stem.calculus.right') || 'Right', 'Obtuse', 'Straight', 'Reflex'].map(function(cls) {
                  return h('button', { 'aria-label': 'Answer Speed', key: cls, onClick: function() { answerSpeed(cls); },
                    className: 'px-4 py-2 rounded-lg text-sm font-bold bg-white border-2 border-red-600 text-red-700 hover:bg-red-100 hover:border-red-400 transition-all cursor-pointer'
                  }, cls);
                })
              )
            )
          ),

          // ── Estimate Mode UI ──
          estimateActive && h('div', { className: 'bg-amber-50 rounded-xl p-4 border-2 border-amber-300' },
            h('div', { className: 'text-sm font-bold text-amber-700 mb-2' }, '\uD83D\uDC41\uFE0F Estimate the Angle!'),
            h('div', { className: 'text-xs text-amber-600 mb-3' }, 'Look at the angle on the protractor (number hidden). How many degrees is it?'),
            h('div', { className: 'flex gap-2 items-center' },
              h('input', { type: 'number', min: 0, max: 360, value: estimateGuess, placeholder: 'Your guess...',
                onChange: function(e) { upd('estimateGuess', e.target.value); },
                'aria-label': 'Angle estimate guess in degrees',
                className: 'flex-1 px-3 py-2 border-2 border-amber-600 rounded-lg text-sm font-bold text-amber-800 focus:border-amber-500'
              }),
              h('span', { className: 'text-sm text-amber-600' }, '\u00B0'),
              h('button', { 'aria-label': 'Check', onClick: checkEstimate, className: 'px-4 py-2 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-600 transition-all' }, '\u2714 Check')
            ),
            estimateResult && h('div', { className: 'mt-2 p-2 rounded-lg text-sm font-bold ' + (estimateResult.ok ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300') },
              estimateResult.ok
                ? (estimateResult.exact ? '\uD83C\uDFAF Perfect! Exactly ' + estimateResult.target + '\u00B0!' : '\u2705 Close! You guessed ' + estimateResult.guess + '\u00B0, actual was ' + estimateResult.target + '\u00B0 (off by ' + estimateResult.diff + '\u00B0)')
                : '\u274C Off by ' + estimateResult.diff + '\u00B0. You guessed ' + estimateResult.guess + '\u00B0, actual was ' + estimateResult.target + '\u00B0.',
              h('button', { 'aria-label': 'Next', onClick: startEstimate, className: 'ml-2 text-xs font-bold underline' }, '\u27A1 Next')
            ),
            h('button', { 'aria-label': 'Exit Estimate Mode', onClick: function() { upd({ estimateActive: false, estimateResult: null }); setAngleValue(45); }, className: 'mt-2 text-xs text-amber-600 font-bold hover:underline' }, '\u2716 Exit Estimate Mode')
          ),

          // ── Create/Classify Challenge UI ──
          angleChallenge && !estimateActive && !speedActive && h('div', { className: 'bg-purple-50 rounded-lg p-3 border border-purple-200' },
            h('p', { className: 'text-sm font-bold text-purple-800 mb-2' },
              angleChallenge.type === 'create'
                ? '\uD83C\uDFAF Create a ' + angleChallenge.target + '\u00B0 angle (within \u00B1' + tolerance + '\u00B0)'
                : '\uD83E\uDDE0 What type of angle is ' + angleChallenge.target + '\u00B0?'
            ),
            angleChallenge.type === 'create' && h('div', { className: 'flex gap-2 items-center' },
              h('span', { className: 'text-xs text-purple-600' }, 'Your angle: ', h('span', { className: 'font-bold text-purple-900' }, angleFeedback ? (angleValue + '\u00B0') : '\u2753')),
              h('button', { 'aria-label': 'Check', onClick: checkAngle, className: 'ml-auto px-4 py-1.5 bg-purple-700 text-white font-bold rounded-lg text-sm hover:bg-purple-600 transition-all' }, '\u2714 Check')
            ),
            angleChallenge.type === 'classify' && h('div', { className: 'flex gap-2 flex-wrap' },
              ['Acute', t('stem.calculus.right') || 'Right', 'Obtuse', 'Straight', 'Reflex'].map(function(cls) {
                return h('button', { key: cls,
                  onClick: function() {
                    var correctClass = classifyAngle(angleChallenge.target);
                    var ok = cls === correctClass;
                    announceToSR(ok ? 'Correct!' : 'Incorrect, try again');
                    setAngleFeedback(ok
                      ? { correct: true, msg: '\u2705 Correct! ' + angleChallenge.target + '\u00B0 is ' + correctClass + '.' }
                      : { correct: false, msg: '\u274C ' + angleChallenge.target + '\u00B0 is ' + correctClass + ', not ' + cls + '.' }
                    );
                    setExploreScore(function(prev) { return { correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }; });
                    if (ok) { awardXP('protractor', 5, 'classify angle'); recordCorrect(correctClass); }
                    else recordWrong();
                  },
                  className: 'px-3 py-2 rounded-lg text-sm font-bold transition-all border ' +
                    (angleFeedback ? (cls === classifyAngle(angleChallenge.target) ? 'bg-green-100 border-green-400 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600') : 'bg-white border-purple-600 text-purple-700 hover:bg-purple-100 hover:border-purple-400 cursor-pointer')
                }, cls);
              })
            ),
            angleFeedback && h('p', { className: 'text-sm font-bold mt-2 ' + (angleFeedback.correct ? 'text-green-600' : 'text-red-600') }, angleFeedback.msg),
            angleFeedback && h('button', { 'aria-label': 'Next Challenge',
              onClick: function() {
                var ta = targetAngles[Math.floor(Math.random() * targetAngles.length)];
                setAngleChallenge({ type: angleChallenge.type, target: ta });
                if (angleChallenge.type === 'create') setAngleValue(0);
                else setAngleValue(ta);
                setAngleFeedback(null);
              },
              className: 'mt-2 text-xs text-purple-600 font-bold hover:underline'
            }, '\u27A1 Next Challenge')
          ),

          // Reset
          h('div', { className: 'flex gap-2' },
            h('button', { 'aria-label': 'Reset',
              onClick: function() { setAngleValue(45); setAngleChallenge(null); setAngleFeedback(null); upd({ estimateActive: false, speedActive: false, estimateResult: null }); },
              className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all'
            }, '\u21BA Reset')
          )
        ),

        // ══════════════════════════════════════════════════════════
        // ── TAB: Learn / Reference ──
        // ══════════════════════════════════════════════════════════
        activeTab === 'reference' && h('div', { className: 'space-y-3' },

          // ── Angle Types Reference Chart ──
          h('div', { className: 'bg-white rounded-xl p-4 border border-purple-200' },
            h('div', { className: 'text-xs font-bold text-purple-700 uppercase mb-3' }, '\uD83D\uDCD6 Angle Types Reference'),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-3' },
              [
                { type: 'Acute', range: '0\u00B0 < \u03B8 < 90\u00B0', icon: '\uD83D\uDD35', ex: '45\u00B0', color: 'blue' },
                { type: 'Right', range: '\u03B8 = 90\u00B0', icon: '\uD83D\uDFE2', ex: '90\u00B0', color: 'green' },
                { type: 'Obtuse', range: '90\u00B0 < \u03B8 < 180\u00B0', icon: '\uD83D\uDFE0', ex: '135\u00B0', color: 'orange' },
                { type: 'Straight', range: '\u03B8 = 180\u00B0', icon: '\u2194\uFE0F', ex: '180\u00B0', color: 'rose' },
                { type: 'Reflex', range: '180\u00B0 < \u03B8 < 360\u00B0', icon: '\uD83D\uDD34', ex: '270\u00B0', color: 'red' },
                { type: 'Full', range: '\u03B8 = 360\u00B0', icon: '\u2B55', ex: '360\u00B0', color: 'purple' }
              ].map(function(ref) {
                return h('div', { key: ref.type, role: 'button', tabIndex: 0, 'aria-label': 'Set angle to ' + ref.type + ' (' + ref.ex + '°)', onClick: function() { setAngleValue(parseInt(ref.ex)); if (soundEnabled) sfxClick(); upd('activeTab', 'explore'); },
                  onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAngleValue(parseInt(ref.ex)); if (soundEnabled) sfxClick(); upd('activeTab', 'explore'); } },
                  className: 'p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md bg-' + ref.color + '-50 border-' + ref.color + '-200'
                },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-lg' }, ref.icon),
                    h('span', { className: 'font-bold text-sm text-' + ref.color + '-700' }, ref.type)
                  ),
                  h('div', { className: 'text-[11px] text-' + ref.color + '-500 font-mono' }, ref.range),
                  h('div', { className: 'text-[11px] text-' + ref.color + '-400 mt-0.5' }, 'Example: ' + ref.ex)
                );
              })
            )
          ),

          // ── Angle Relationships ──
          h('div', { className: 'bg-white rounded-xl p-4 border border-indigo-200' },
            h('div', { className: 'text-xs font-bold text-indigo-700 uppercase mb-3' }, '\uD83D\uDD17 Angle Relationships'),
            h('div', { className: 'grid grid-cols-2 gap-3' },
              [
                { name: 'Complementary', desc: 'Two angles that add to 90\u00B0', example: '30\u00B0 + 60\u00B0 = 90\u00B0', icon: '\uD83E\uDDE9', color: 'blue' },
                { name: 'Supplementary', desc: 'Two angles that add to 180\u00B0', example: '60\u00B0 + 120\u00B0 = 180\u00B0', icon: '\u2696\uFE0F', color: 'teal' },
                { name: 'Vertical', desc: 'Opposite angles formed by intersecting lines; always equal', example: '\u2220A = \u2220C', icon: '\u2716', color: 'purple' },
                { name: 'Adjacent', desc: 'Angles that share a common vertex and side', example: '\u2220AOB + \u2220BOC', icon: '\uD83D\uDC49', color: 'green' }
              ].map(function(rel) {
                return h('div', { key: rel.name, className: 'p-3 rounded-xl bg-' + rel.color + '-50 border border-' + rel.color + '-200' },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-base' }, rel.icon),
                    h('span', { className: 'text-sm font-bold text-' + rel.color + '-700' }, rel.name)
                  ),
                  h('div', { className: 'text-[11px] text-' + rel.color + '-600 mb-1' }, rel.desc),
                  h('div', { className: 'text-[11px] text-' + rel.color + '-400 font-mono' }, rel.example)
                );
              })
            )
          ),

          // ── Triangle Angle Sum Demo ──
          h('div', { className: 'bg-white rounded-xl p-4 border border-emerald-200' },
            h('div', { className: 'text-xs font-bold text-emerald-700 uppercase mb-3' }, '\uD83D\uDD3A Triangle Angle Sum (\u2220A + \u2220B + \u2220C = 180\u00B0)'),
            h('div', { className: 'grid grid-cols-3 gap-3 mb-3' },
              h('div', null,
                h('div', { className: 'text-[11px] font-bold text-emerald-600 mb-1' }, '\u2220A'),
                h('input', { type: 'range', min: 5, max: 170, value: triAngle1, onChange: function(e) { upd('triAngle1', parseInt(e.target.value)); }, className: 'w-full accent-emerald-500', 'aria-label': 'Angle A: ' + triAngle1 + ' degrees' }),
                h('div', { className: 'text-center text-sm font-bold text-emerald-800' }, triAngle1 + '\u00B0')
              ),
              h('div', null,
                h('div', { className: 'text-[11px] font-bold text-emerald-600 mb-1' }, '\u2220B'),
                h('input', { type: 'range', min: 5, max: 170, value: triAngle2, onChange: function(e) { upd('triAngle2', parseInt(e.target.value)); }, className: 'w-full accent-emerald-500', 'aria-label': 'Angle B: ' + triAngle2 + ' degrees' }),
                h('div', { className: 'text-center text-sm font-bold text-emerald-800' }, triAngle2 + '\u00B0')
              ),
              h('div', null,
                h('div', { className: 'text-[11px] font-bold text-emerald-600 mb-1' }, '\u2220C (computed)'),
                h('div', { className: 'text-center text-2xl font-bold mt-1 ' + (triValid ? 'text-emerald-700' : 'text-red-600') }, triAngle3 + '\u00B0')
              )
            ),
            h('div', { className: 'text-center text-xs font-bold ' + (triValid ? 'text-emerald-600' : 'text-red-500') },
              triValid
                ? '\u2705 ' + triAngle1 + '\u00B0 + ' + triAngle2 + '\u00B0 + ' + triAngle3 + '\u00B0 = 180\u00B0'
                : '\u26A0\uFE0F Invalid triangle! \u2220C must be > 0\u00B0'
            ),
            // Triangle classification
            triValid && h('div', { className: 'mt-2 text-[11px] text-emerald-500 text-center' },
              'This is a ' +
              (triAngle1 === 60 && triAngle2 === 60 ? 'Equilateral' :
               (triAngle1 === triAngle2 || triAngle1 === triAngle3 || triAngle2 === triAngle3) ? 'Isosceles' : 'Scalene') +
              ' ' +
              ([triAngle1, triAngle2, triAngle3].some(function(a) { return a === 90; }) ? 'Right' :
               [triAngle1, triAngle2, triAngle3].some(function(a) { return a > 90; }) ? 'Obtuse' : 'Acute') +
              ' triangle'
            )
          ),

          // ── Polygon Interior Angles ──
          h('div', { className: 'bg-white rounded-xl p-4 border border-violet-200' },
            h('div', { className: 'text-xs font-bold text-violet-700 uppercase mb-3' }, '\u2B21 Polygon Interior Angles'),
            h('div', { className: 'flex gap-2 flex-wrap mb-3' },
              polygonData.map(function(p) {
                var active = selectedPolygon === p.sides;
                return h('button', { key: p.sides, onClick: function() {
                  upd('selectedPolygon', p.sides);
                  var explored = Object.assign({}, polygonsExplored);
                  explored[p.sides] = true;
                  upd('polygonsExplored', explored);
                  checkBadges({ polygonsExplored: explored });
                },
                  className: 'px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all ' +
                    (active ? 'bg-violet-700 text-white shadow' : 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-600')
                }, p.icon + ' ' + p.name);
              })
            ),
            h('div', { className: 'grid grid-cols-3 gap-3' },
              h('div', { className: 'bg-violet-50 rounded-lg p-3 text-center' },
                h('div', { className: 'text-[11px] font-bold text-violet-500 uppercase' }, 'Interior Angle'),
                h('div', { className: 'text-xl font-bold text-violet-800' }, polyInterior(selectedPolygon).toFixed(1) + '\u00B0')
              ),
              h('div', { className: 'bg-violet-50 rounded-lg p-3 text-center' },
                h('div', { className: 'text-[11px] font-bold text-violet-500 uppercase' }, 'Exterior Angle'),
                h('div', { className: 'text-xl font-bold text-violet-800' }, polyExterior(selectedPolygon).toFixed(1) + '\u00B0')
              ),
              h('div', { className: 'bg-violet-50 rounded-lg p-3 text-center' },
                h('div', { className: 'text-[11px] font-bold text-violet-500 uppercase' }, 'Angle Sum'),
                h('div', { className: 'text-xl font-bold text-violet-800' }, polyAngleSum(selectedPolygon) + '\u00B0')
              )
            ),
            h('div', { className: 'mt-2 text-[11px] text-violet-500 text-center' },
              'Formula: Interior = (n\u22122)\u00D7180\u00B0 \u00F7 n, where n = ' + selectedPolygon)
          )
        ),

        // ══════════════════════════════════════════════════════════
        // ── TAB: Tools ──
        // ══════════════════════════════════════════════════════════
        activeTab === 'tools' && h('div', { className: 'space-y-3' },

          // ── Clock Angle Calculator ──
          h('div', { className: 'bg-white rounded-xl p-4 border border-sky-200' },
            h('div', { className: 'text-xs font-bold text-sky-700 uppercase mb-3' }, '\uD83D\uDD52 Clock Angle Calculator'),
            h('div', { className: 'flex gap-4 items-center justify-center mb-3' },
              h('div', null,
                h('div', { className: 'text-[11px] font-bold text-sky-600 mb-1' }, 'Hour'),
                h('select', { value: clockHour, onChange: function(e) { upd('clockHour', parseInt(e.target.value)); }, 'aria-label': 'Clock hour', className: 'px-3 py-1.5 border-2 border-sky-500 rounded-lg text-sm font-bold text-sky-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' },
                  [1,2,3,4,5,6,7,8,9,10,11,12].map(function(hr) { return h('option', { key: hr, value: hr }, hr); })
                )
              ),
              h('span', { className: 'text-2xl font-bold text-sky-700' }, ':'),
              h('div', null,
                h('div', { className: 'text-[11px] font-bold text-sky-600 mb-1' }, 'Minute'),
                h('select', { value: clockMinute, onChange: function(e) { upd('clockMinute', parseInt(e.target.value)); }, 'aria-label': 'Clock minute', className: 'px-3 py-1.5 border-2 border-sky-500 rounded-lg text-sm font-bold text-sky-800 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1' },
                  [0,5,10,15,20,25,30,35,40,45,50,55].map(function(m) { return h('option', { key: m, value: m }, m < 10 ? '0' + m : m); })
                )
              )
            ),
            // Mini clock SVG
            h('div', { className: 'flex justify-center mb-3' },
              h('svg', { width: 120, height: 120 },
                h('circle', { cx: 60, cy: 60, r: 55, fill: 'none', stroke: '#bae6fd', strokeWidth: 2 }),
                // Hour numbers
                [1,2,3,4,5,6,7,8,9,10,11,12].map(function(n) {
                  var na = (n * 30 - 90) * Math.PI / 180;
                  return h('text', { key: n, x: 60 + 42 * Math.cos(na), y: 60 + 42 * Math.sin(na) + 4, textAnchor: 'middle', className: 'text-[11px] fill-sky-600 font-bold select-none' }, n);
                }),
                // Hour hand
                (function() {
                  var ha = ((clockHour % 12) * 30 + clockMinute * 0.5 - 90) * Math.PI / 180;
                  return h('line', { x1: 60, y1: 60, x2: 60 + 28 * Math.cos(ha), y2: 60 + 28 * Math.sin(ha), stroke: '#0369a1', strokeWidth: 3, strokeLinecap: 'round' });
                })(),
                // Minute hand
                (function() {
                  var ma = (clockMinute * 6 - 90) * Math.PI / 180;
                  return h('line', { x1: 60, y1: 60, x2: 60 + 40 * Math.cos(ma), y2: 60 + 40 * Math.sin(ma), stroke: '#38bdf8', strokeWidth: 2, strokeLinecap: 'round' });
                })(),
                h('circle', { cx: 60, cy: 60, r: 3, fill: '#0369a1' })
              )
            ),
            h('div', { className: 'text-center' },
              h('div', { className: 'text-2xl font-bold text-sky-800' }, clockAngle.toFixed(1) + '\u00B0'),
              h('div', { className: 'text-xs text-sky-500' }, 'Angle between hands at ' + clockHour + ':' + (clockMinute < 10 ? '0' : '') + clockMinute),
              h('div', { className: 'text-[11px] mt-1 font-bold ' + (classColors[classifyAngle(Math.round(clockAngle))] || classColors['Acute']).text }, classifyAngle(Math.round(clockAngle)) + ' angle'),
              h('button', { 'aria-label': 'Show on protractor', onClick: function() { setAngleValue(Math.round(clockAngle)); upd('activeTab', 'explore'); }, className: 'mt-2 text-[11px] font-bold text-sky-600 underline' }, '\u2192 Show on protractor')
            )
          ),

          // ── Angle Unit Converter ──
          h('div', { className: 'bg-white rounded-xl p-4 border border-green-200' },
            h('div', { className: 'text-xs font-bold text-green-700 uppercase mb-3' }, '\uD83D\uDD04 Angle Unit Converter'),
            h('div', { className: 'grid grid-cols-4 gap-3' },
              h('div', { className: 'bg-green-50 rounded-lg p-3 text-center' },
                h('div', { className: 'text-[11px] font-bold text-green-500 uppercase' }, 'Degrees'),
                h('div', { className: 'text-lg font-bold text-green-800' }, angleValue + '\u00B0')
              ),
              h('div', { className: 'bg-green-50 rounded-lg p-3 text-center' },
                h('div', { className: 'text-[11px] font-bold text-green-500 uppercase' }, 'Radians'),
                h('div', { className: 'text-lg font-bold text-green-800' }, toRadians(angleValue))
              ),
              h('div', { className: 'bg-green-50 rounded-lg p-3 text-center' },
                h('div', { className: 'text-[11px] font-bold text-green-500 uppercase' }, 'Gradians'),
                h('div', { className: 'text-lg font-bold text-green-800' }, toGradians(angleValue))
              ),
              h('div', { className: 'bg-green-50 rounded-lg p-3 text-center' },
                h('div', { className: 'text-[11px] font-bold text-green-500 uppercase' }, 'Turns'),
                h('div', { className: 'text-lg font-bold text-green-800' }, toTurns(angleValue))
              )
            ),
            h('div', { className: 'mt-2 text-[11px] text-green-500 text-center' },
              '\u03C0 rad = 180\u00B0 = 200 grad = 0.5 turns')
          ),

          // ── Angle History ──
          h('div', { className: 'bg-white rounded-xl p-4 border border-slate-400' },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('div', { className: 'text-xs font-bold text-slate-700 uppercase' }, '\uD83D\uDCDC Recent Angles'),
              angleHistory.length > 0 && h('button', { 'aria-label': 'Clear', onClick: function() { upd('angleHistory', []); }, className: 'text-[11px] text-slate-600 hover:text-red-400' }, 'Clear')
            ),
            angleHistory.length === 0
              ? h('div', { className: 'text-xs text-slate-600 text-center py-2' }, 'No angles explored yet')
              : h('div', { className: 'flex gap-1.5 flex-wrap' },
                  angleHistory.slice(0, 15).map(function(entry, i) {
                    return h('button', { 'aria-label': 'Set Angle Value', key: i, onClick: function() { setAngleValue(entry.deg); upd('activeTab', 'explore'); },
                      className: 'px-2 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700 border border-slate-400 transition-all'
                    }, entry.deg + '\u00B0');
                  })
                )
          )
        ),

        // ── Coach tip (always visible) ──
        h('div', { className: 'bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-3 border border-purple-100 text-xs text-purple-700 leading-relaxed' },
          streak >= 10 ? '\uD83D\uDD25 Incredible ' + streak + '-streak! You\u2019re an angle genius!'
            : streak >= 5 ? '\u26A1 ' + streak + ' in a row! Keep the streak alive!'
            : exploreScore.total === 0 ? '\uD83D\uDCD0 Welcome! Drag the purple ray to explore angles, or try a Challenge!'
            : exploreScore.correct > 0 && exploreScore.correct === exploreScore.total ? '\u2B50 Perfect score! Try the Speed Round for an extra challenge!'
            : angleClass === (t('stem.calculus.right') || 'Right') ? '\uD83D\uDC4D A right angle (90\u00B0) is everywhere \u2014 corners of books, screens, and buildings!'
            : angleClass === 'Obtuse' ? '\uD83E\uDD14 Obtuse angles are wider than 90\u00B0. A clock at 4:00 shows \u2248120\u00B0!'
            : angleClass === 'Reflex' ? '\uD83D\uDD04 Reflex angles go past 180\u00B0 \u2014 they wrap more than halfway around!'
            : '\uD83D\uDCA1 Tip: Architects use precise angles to design buildings. The Eiffel Tower has a 54\u00B0 incline!'
        )
      );

      // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
      // ANGLES EXPANSION SECTIONS \u2014 interactive geometry reference (2026-05-31)
      // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
      // ctx.toolData / ctx.setToolData are the plugin-bridge surface (stem_lab_module.js:4718-4719).
      // The bare labToolData / setLabToolData identifiers used by the original expansion code
      // were never declared in this scope — caused "ReferenceError: labToolData is not defined"
      // the moment the protractor tab mounted. Fixed 2026-06-01.
      var d2 = (ctx.toolData && ctx.toolData.angles) || {};
      var expSection = d2.expSection || null;
      function setExp(patch) {
        ctx.setToolData(function(prev) {
          var prior = (prev && prev.angles) || {};
          return Object.assign({}, prev, { angles: Object.assign({}, prior, patch) });
        });
      }

      var ANGLE_TYPES = [
        { name: 'Zero', range: '0\u00B0', icon: '\u2014', desc: 'Two rays overlap exactly. No rotation.' },
        { name: 'Acute', range: '0\u00B0 < \u03B8 < 90\u00B0', icon: '<', desc: 'Less than a right angle. Pizza slice, "less than square".' },
        { name: 'Right', range: '90\u00B0', icon: '\u2310', desc: 'Exactly 90\u00B0. Corner of a square. Perpendicular lines.' },
        { name: 'Obtuse', range: '90\u00B0 < \u03B8 < 180\u00B0', icon: '>', desc: 'Between right and straight. Wider than square corner.' },
        { name: 'Straight', range: '180\u00B0', icon: '\u2014', desc: 'Half rotation. The two rays form a straight line.' },
        { name: 'Reflex', range: '180\u00B0 < \u03B8 < 360\u00B0', icon: '\u21BA', desc: 'Greater than a straight angle. Measure the "outside" of the angle.' },
        { name: 'Full rotation', range: '360\u00B0', icon: '\u25CB', desc: 'Complete turn. The two rays overlap exactly (like 0\u00B0, but went all the way around).' }
      ];

      var ANGLE_RELATIONSHIPS = [
        { name: 'Complementary', condition: 'Sum to 90\u00B0', example: '30\u00B0 + 60\u00B0 = 90\u00B0', visual: 'Two angles fit together to make a right angle.' },
        { name: 'Supplementary', condition: 'Sum to 180\u00B0', example: '110\u00B0 + 70\u00B0 = 180\u00B0', visual: 'Two angles fit together to make a straight line.' },
        { name: 'Vertical (vertically opposite)', condition: 'Equal', example: 'X-shape: opposite angles are equal', visual: 'Two intersecting lines make 4 angles in 2 equal pairs.' },
        { name: 'Adjacent', condition: 'Share a vertex + ray', example: 'No specific sum', visual: 'Two angles next to each other on either side of a common ray.' },
        { name: 'Linear pair', condition: 'Adjacent + supplementary (sum 180\u00B0)', example: 'On a straight line', visual: 'Special case of adjacent + supplementary.' },
        { name: 'Corresponding (parallel lines + transversal)', condition: 'Equal', example: 'Same position at each intersection', visual: 'Like-position angles when a line crosses two parallel lines.' },
        { name: 'Alternate interior', condition: 'Equal', example: 'Z-pattern', visual: 'Between the parallel lines, on opposite sides of the transversal.' },
        { name: 'Alternate exterior', condition: 'Equal', example: 'Outside the parallels', visual: 'Outside the parallel lines, on opposite sides of the transversal.' },
        { name: 'Co-interior (consecutive interior)', condition: 'Supplementary (sum 180\u00B0)', example: 'C-pattern', visual: 'Between the parallels on the same side of the transversal.' }
      ];

      var POLYGON_ANGLES = [
        { sides: 3, name: 'Triangle', interiorSum: '180\u00B0', regularInterior: '60\u00B0', exteriorEach: '120\u00B0', notes: 'Sum is constant. Equilateral all 60\u00B0.' },
        { sides: 4, name: 'Quadrilateral', interiorSum: '360\u00B0', regularInterior: '90\u00B0', exteriorEach: '90\u00B0', notes: 'Square (regular) has all 90\u00B0. Sum holds even for irregular shapes.' },
        { sides: 5, name: 'Pentagon', interiorSum: '540\u00B0', regularInterior: '108\u00B0', exteriorEach: '72\u00B0', notes: 'Regular: ~108\u00B0 interior.' },
        { sides: 6, name: 'Hexagon', interiorSum: '720\u00B0', regularInterior: '120\u00B0', exteriorEach: '60\u00B0', notes: 'Regular hexagons tile the plane perfectly (honeycomb).' },
        { sides: 7, name: 'Heptagon', interiorSum: '900\u00B0', regularInterior: '~128.6\u00B0', exteriorEach: '~51.4\u00B0', notes: 'Cannot be constructed with compass + straightedge alone.' },
        { sides: 8, name: 'Octagon', interiorSum: '1080\u00B0', regularInterior: '135\u00B0', exteriorEach: '45\u00B0', notes: 'STOP signs.' },
        { sides: 9, name: 'Nonagon', interiorSum: '1260\u00B0', regularInterior: '140\u00B0', exteriorEach: '40\u00B0', notes: 'Also called enneagon.' },
        { sides: 10, name: 'Decagon', interiorSum: '1440\u00B0', regularInterior: '144\u00B0', exteriorEach: '36\u00B0', notes: 'Regular decagons have 10-fold rotational symmetry.' },
        { sides: 12, name: 'Dodecagon', interiorSum: '1800\u00B0', regularInterior: '150\u00B0', exteriorEach: '30\u00B0', notes: 'Some coins (UK \u00A31 since 2017).' },
        { sides: 'n', name: 'n-gon (general)', interiorSum: '(n\u22122) \u00D7 180\u00B0', regularInterior: '(n\u22122) \u00D7 180\u00B0 / n', exteriorEach: '360\u00B0 / n', notes: 'As n \u2192 \u221E, the polygon approaches a circle.' }
      ];

      var TRIG_REF = [
        { fn: 'sin \u03B8', mnemonic: 'opposite / hypotenuse', range: '\u22121 \u2264 sin \u2264 1', notes: 'Positive in Q1 (0-90\u00B0) + Q2 (90-180\u00B0). sin 30\u00B0=0.5, sin 45\u00B0=\u221A2/2, sin 60\u00B0=\u221A3/2, sin 90\u00B0=1.' },
        { fn: 'cos \u03B8', mnemonic: 'adjacent / hypotenuse', range: '\u22121 \u2264 cos \u2264 1', notes: 'Positive in Q1 + Q4. cos 0\u00B0=1, cos 30\u00B0=\u221A3/2, cos 45\u00B0=\u221A2/2, cos 60\u00B0=0.5, cos 90\u00B0=0.' },
        { fn: 'tan \u03B8', mnemonic: 'opposite / adjacent = sin/cos', range: '\u2212\u221E to +\u221E', notes: 'Undefined at 90\u00B0, 270\u00B0. tan 30\u00B0=1/\u221A3, tan 45\u00B0=1, tan 60\u00B0=\u221A3.' },
        { fn: 'csc \u03B8', mnemonic: '1 / sin = hyp / opp', range: '|csc| \u2265 1', notes: 'Reciprocal of sine. Undefined where sin = 0 (0\u00B0, 180\u00B0, 360\u00B0).' },
        { fn: 'sec \u03B8', mnemonic: '1 / cos = hyp / adj', range: '|sec| \u2265 1', notes: 'Reciprocal of cosine. Undefined where cos = 0 (90\u00B0, 270\u00B0).' },
        { fn: 'cot \u03B8', mnemonic: '1 / tan = adj / opp = cos/sin', range: 'all reals', notes: 'Reciprocal of tangent. Undefined where sin = 0.' }
      ];

      var ANGLE_UNITS = [
        { unit: 'Degrees', symbol: '\u00B0', fullCircle: '360\u00B0', use: 'Everyday geometry, navigation, surveying. Divides naturally (90, 60, 45, 30, 18, 15...).' },
        { unit: 'Radians', symbol: 'rad', fullCircle: '2\u03C0 rad \u2248 6.283', use: 'Math, calculus, physics. Arc length = r \u00D7 \u03B8 when \u03B8 is in radians. Natural unit for trig derivatives.' },
        { unit: 'Gradians (gons)', symbol: 'g', fullCircle: '400 gons', use: 'European surveying. 100 gons = right angle. Decimal-friendly.' },
        { unit: 'Turns (revolutions)', symbol: 'rev', fullCircle: '1 turn', use: 'Rotational mechanics, engineering. 1 rev/min = 1 RPM.' },
        { unit: 'Arc minutes', symbol: '\u2032', fullCircle: '21,600 \u2032', use: 'Astronomy, surveying. 1\u00B0 = 60\u2032. Moon\'s apparent diameter ~30\u2032.' },
        { unit: 'Arc seconds', symbol: '\u2033', fullCircle: '1,296,000 \u2033', use: 'Astronomy. 1\u2032 = 60\u2033. Hubble can resolve ~0.05\u2033 angles.' },
        { unit: 'Milliradians (mils)', symbol: 'mrad', fullCircle: '~6283 mrad', use: 'Ballistics, military scopes. ~1 m at 1 km distance. 1 mrad \u2248 3.4 arc minutes.' }
      ];

      var SPECIAL_ANGLES = [
        { deg: '0\u00B0', rad: '0', sin: '0', cos: '1', tan: '0', notes: 'Identity reference.' },
        { deg: '30\u00B0', rad: '\u03C0/6', sin: '1/2', cos: '\u221A3/2', tan: '1/\u221A3', notes: 'Half of an equilateral triangle.' },
        { deg: '45\u00B0', rad: '\u03C0/4', sin: '\u221A2/2', cos: '\u221A2/2', tan: '1', notes: 'Isosceles right triangle. Sin and cos equal.' },
        { deg: '60\u00B0', rad: '\u03C0/3', sin: '\u221A3/2', cos: '1/2', tan: '\u221A3', notes: 'Equilateral triangle vertex.' },
        { deg: '90\u00B0', rad: '\u03C0/2', sin: '1', cos: '0', tan: 'undef', notes: 'Maximum sin. Tan blows up.' },
        { deg: '120\u00B0', rad: '2\u03C0/3', sin: '\u221A3/2', cos: '\u22121/2', tan: '\u2212\u221A3', notes: 'Quadrant 2.' },
        { deg: '135\u00B0', rad: '3\u03C0/4', sin: '\u221A2/2', cos: '\u2212\u221A2/2', tan: '\u22121', notes: 'Quadrant 2 mirror of 45\u00B0.' },
        { deg: '150\u00B0', rad: '5\u03C0/6', sin: '1/2', cos: '\u2212\u221A3/2', tan: '\u22121/\u221A3', notes: 'Quadrant 2 mirror of 30\u00B0.' },
        { deg: '180\u00B0', rad: '\u03C0', sin: '0', cos: '\u22121', tan: '0', notes: 'Half rotation.' },
        { deg: '270\u00B0', rad: '3\u03C0/2', sin: '\u22121', cos: '0', tan: 'undef', notes: 'Minimum sin. Tan blows up again.' },
        { deg: '360\u00B0', rad: '2\u03C0', sin: '0', cos: '1', tan: '0', notes: 'Full rotation = back to start.' }
      ];

      var REAL_WORLD_ANGLES = [
        { thing: 'Pizza slice (8 cuts)', angle: '45\u00B0', notes: '360\u00B0 / 8 = 45\u00B0 per slice.' },
        { thing: 'Hexagon honeycomb cell', angle: '120\u00B0', notes: 'Each interior angle of a regular hexagon.' },
        { thing: 'Skyscraper corner', angle: '90\u00B0', notes: 'Most buildings use right angles for structural simplicity.' },
        { thing: 'Yield sign', angle: '60\u00B0', notes: 'Equilateral triangle.' },
        { thing: 'Stop sign', angle: '135\u00B0', notes: 'Regular octagon interior angles.' },
        { thing: 'Eiffel Tower incline (legs)', angle: '54\u00B0', notes: 'Helps the structure resist wind.' },
        { thing: 'Earth\'s axial tilt', angle: '23.5\u00B0', notes: 'Causes seasons. Tilted relative to orbital plane.' },
        { thing: 'Critical angle (water/air, refraction)', angle: '~48.6\u00B0', notes: 'Beyond this angle, light is totally internally reflected. Used in fiber optics.' },
        { thing: 'Snowflake symmetry', angle: '60\u00B0 (6-fold)', notes: 'Hexagonal ice crystals always have 6-fold symmetry.' },
        { thing: 'DNA helix angle', angle: '~36\u00B0', notes: 'Each base pair rotates ~36\u00B0 around the helix axis (~10 bp per turn).' },
        { thing: 'Highway curve banking', angle: 'varies (5-10\u00B0)', notes: 'Tilts road so gravity component balances centripetal force at design speed.' },
        { thing: 'Sun at zenith (equator, equinox)', angle: '90\u00B0', notes: 'Sun directly overhead. Only happens between Tropics during the year.' }
      ];

      var ANGLE_TRICKS = [
        { trick: 'Sum of angles in triangle = 180\u00B0', use: 'Find missing angle if you know the other two: 180 \u2212 (a + b).' },
        { trick: 'Exterior angle of triangle = sum of remote interior', use: 'Faster than calculating + then subtracting from 180.' },
        { trick: 'Angles in same segment of circle are equal', use: 'Inscribed angle theorem. Subtend same arc \u2192 equal.' },
        { trick: 'Inscribed angle = \u00BD central angle', use: 'Central + inscribed angle subtend same arc; inscribed is exactly half.' },
        { trick: 'Tangent \u22A5 radius at point of contact', use: 'Right angle at tangent point. Useful for many circle problems.' },
        { trick: 'Pythagorean identity', use: 'sin\u00B2\u03B8 + cos\u00B2\u03B8 = 1. Find one trig value from another.' },
        { trick: 'CAST rule (quadrant signs)', use: 'C(IV: cos+), A(I: all+), S(II: sin+), T(III: tan+). Memorize quadrant signs of trig functions.' },
        { trick: 'sin(180\u00B0 \u2212 \u03B8) = sin \u03B8', use: 'Supplementary angles have same sine. Useful in triangle problems.' },
        { trick: 'cos(360\u00B0 \u2212 \u03B8) = cos \u03B8', use: 'Cosine is symmetric about 0\u00B0 (cosine is an even function).' },
        { trick: 'Doubling formula: sin 2\u03B8 = 2 sin \u03B8 cos \u03B8', use: 'Compute trig of doubled angle from original.' }
      ];

      var COMPASS_BEARINGS = [
        { dir: 'N', bearing: '0\u00B0' }, { dir: 'NNE', bearing: '22.5\u00B0' }, { dir: 'NE', bearing: '45\u00B0' }, { dir: 'ENE', bearing: '67.5\u00B0' },
        { dir: 'E', bearing: '90\u00B0' }, { dir: 'ESE', bearing: '112.5\u00B0' }, { dir: 'SE', bearing: '135\u00B0' }, { dir: 'SSE', bearing: '157.5\u00B0' },
        { dir: 'S', bearing: '180\u00B0' }, { dir: 'SSW', bearing: '202.5\u00B0' }, { dir: 'SW', bearing: '225\u00B0' }, { dir: 'WSW', bearing: '247.5\u00B0' },
        { dir: 'W', bearing: '270\u00B0' }, { dir: 'WNW', bearing: '292.5\u00B0' }, { dir: 'NW', bearing: '315\u00B0' }, { dir: 'NNW', bearing: '337.5\u00B0' }
      ];

      var ANGLES_GLOSSARY = [
        { term: 'Vertex', def: 'The common endpoint of two rays that form an angle.' },
        { term: 'Ray', def: 'Half of a line \u2014 starts at a point, extends infinitely in one direction.' },
        { term: 'Vertex angle', def: 'In an isosceles triangle, the angle opposite the equal sides.' },
        { term: 'Base angle', def: 'In an isosceles triangle, one of the two equal angles opposite the equal sides.' },
        { term: 'Bisector', def: 'A ray that divides an angle into two equal angles.' },
        { term: 'Perpendicular', def: 'Two lines that meet at a right angle (90\u00B0).' },
        { term: 'Parallel', def: 'Two lines that never meet (same slope). Always equidistant.' },
        { term: 'Transversal', def: 'A line that crosses two or more other lines.' },
        { term: 'Coterminal angles', def: 'Angles with same initial + terminal sides but different rotations. E.g., 30\u00B0 and 390\u00B0 are coterminal.' },
        { term: 'Reference angle', def: 'The acute angle between the terminal side and the x-axis. Always between 0\u00B0 and 90\u00B0.' },
        { term: 'Polar angle (\u03B8)', def: 'In polar coordinates, the angle from the positive x-axis to the point.' },
        { term: 'Azimuth', def: 'Horizontal angle measured clockwise from a reference direction (usually north). Used in navigation, astronomy.' },
        { term: 'Altitude angle', def: 'Vertical angle above the horizon. 0\u00B0 = horizon, 90\u00B0 = zenith.' },
        { term: 'Angle of incidence', def: 'Angle between incoming ray and normal to surface.' },
        { term: 'Angle of refraction', def: 'Angle between refracted ray and normal. Snell\'s law relates the two.' },
        { term: 'Angle of elevation', def: 'Angle above horizontal to a point above (e.g., top of a tree).' },
        { term: 'Angle of depression', def: 'Angle below horizontal to a point below.' }
      ];

      function expHeader() {
        return h('div', { className: 'mt-6 mb-2 flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-200' },
          h('div', null,
            h('h3', { className: 'text-base font-black text-rose-900' }, '\uD83D\uDCD0 Angles Reference Library'),
            h('div', { className: 'text-[11px] text-rose-700 mt-0.5' }, 'Interactive geometry references \u2014 pick a topic.')
          ),
          expSection && h('button', {
            onClick: function() { setExp({ expSection: null }); },
            className: 'px-3 py-1 rounded-md text-xs font-bold bg-white border border-rose-300 text-rose-700 hover:bg-rose-100'
          }, '\u2715 Close section')
        );
      }

      function expTabBar() {
        // 47 angle/geometry sections grouped into 6 cohesive domains. All
        // IDs preserved. Groups: Angles & Trig \u00B7 Shapes & Solids \u00B7 Coords
        // & Transforms \u00B7 Real World \u00B7 Math History \u00B7 Reference.
        var TAB_GROUPS = [
          { id: 'angles', label: 'Angles & Trig', color: 'rose', tabs: [
            { id: 'types', label: 'Types', icon: '<' },
            { id: 'relationships', label: 'Relationships', icon: '\u2AEF' },
            { id: 'special', label: 'Special angles', icon: '\u2605' },
            { id: 'units', label: 'Angle units', icon: '\u00B0' },
            { id: 'trig', label: 'Trig functions', icon: 'sin' },
            { id: 'pythag', label: 'Pythagorean', icon: 'a\u00B2+b\u00B2' },
            { id: 'theorems', label: 'Classic theorems', icon: '\u220E' },
            { id: 'tricks', label: 'Shortcuts', icon: '\u26A1' }
          ] },
          { id: 'shapes', label: 'Shapes & Solids', color: 'amber', tabs: [
            { id: 'triangles', label: 'Triangle types', icon: '\u25B3' },
            { id: 'polygons', label: 'Polygon angles', icon: '\u2B21' },
            { id: 'circle', label: 'Circle geometry', icon: '\u25EF' },
            { id: 'conics', label: 'Conic sections', icon: '\u25C9' },
            { id: 'solids', label: '3D solids', icon: '\u2B22' },
            { id: 'platonic', label: 'Platonic solids', icon: '\u2B21' },
            { id: 'curves', label: 'Famous curves', icon: '\u223F' },
            { id: 'shapes_iq', label: 'Shape facts', icon: '\u25C7' }
          ] },
          { id: 'coords', label: 'Coords & Transforms', color: 'cyan', tabs: [
            { id: 'coords', label: 'Coordinates', icon: '(x,y)' },
            { id: 'vectors', label: 'Vectors', icon: '\u2192' },
            { id: 'transform', label: 'Transformations', icon: '\u21BB' },
            { id: 'symmetry', label: 'Symmetry', icon: '\u27C2' },
            { id: 'tilings', label: 'Tessellations', icon: '\u2B21' },
            { id: 'tessell2', label: 'Famous tilings', icon: '\u25C7' },
            { id: 'fractals', label: 'Fractals', icon: '\u2744' },
            { id: 'noneuclid', label: 'Non-Euclidean', icon: '\u2295' },
            { id: 'goldenratio', label: 'Golden ratio', icon: '\u03C6' }
          ] },
          { id: 'world', label: 'Real World', color: 'emerald', tabs: [
            { id: 'world', label: 'Real-world', icon: '\uD83C\uDF0D' },
            { id: 'practical', label: 'Practical angles', icon: '\uD83D\uDEE0' },
            { id: 'tools', label: 'Measuring tools', icon: '\uD83D\uDCCF' },
            { id: 'compass', label: 'Compass', icon: '\uD83E\uDDED' },
            { id: 'sundial', label: 'Sundials', icon: '\u263C' },
            { id: 'sports', label: 'Angles in sports', icon: '\uD83C\uDFC6' },
            { id: 'art', label: 'Angles in art', icon: '\uD83C\uDFA8' },
            { id: 'origami', label: 'Origami geometry', icon: '\u2726' },
            { id: 'building_angles', label: 'Roof + ramp pitch', icon: '\u25E2' },
            { id: 'buildings', label: 'Famous structures', icon: '\uD83C\uDFDB' },
            { id: 'flag_design', label: 'Flag geometry', icon: '\uD83D\uDEA9' },
            { id: 'projection', label: 'Map projections', icon: '\uD83D\uDDFA' },
            { id: 'rivers', label: 'Earth measurements', icon: '\uD83C\uDF0E' },
            { id: 'cities', label: 'City coordinates', icon: '\uD83C\uDF06' },
            { id: 'mountains', label: 'Mountains + peaks', icon: '\u26F0' },
            { id: 'planets', label: 'Planet data', icon: '\uD83E\uDE90' }
          ] },
          { id: 'history', label: 'History & Careers', color: 'violet', tabs: [
            { id: 'famous', label: 'History', icon: '\uD83D\uDD70' },
            { id: 'mathematicians', label: 'Mathematicians', icon: '\uD83D\uDC68\u200D\uD83C\uDFEB' },
            { id: 'careers', label: 'Careers using angles', icon: '\uD83D\uDCBC' }
          ] },
          { id: 'reference', label: 'Reference', color: 'slate', tabs: [
            { id: 'constants', label: 'Math constants', icon: '\u03C0' },
            { id: 'puzzles', label: 'Geometry puzzles', icon: '\uD83E\uDDE9' },
            { id: 'glossary', label: 'Glossary', icon: '\uD83D\uDCD6' }
          ] }
        ];
        function renderBtn(s, accent) {
          var active = expSection === s.id;
          return h('button', {
            key: s.id,
            onClick: function() { setExp({ expSection: active ? null : s.id }); },
            className: 'px-2 py-1 rounded-md text-[11px] font-bold border transition-colors ' + (active ? 'bg-' + accent + '-600 text-white border-' + accent + '-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-' + accent + '-50 hover:border-' + accent + '-300')
          }, s.icon + ' ' + s.label);
        }
        return h('div', { className: 'mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5' },
          TAB_GROUPS.map(function(g) {
            return h('div', { key: g.id, role: 'group', 'aria-label': g.label + ' tabs', className: 'flex items-center gap-2 flex-wrap' },
              h('span', { 'aria-hidden': 'true', className: 'text-[9px] font-extrabold tracking-widest uppercase text-' + g.color + '-700 min-w-[120px] text-right pr-1 border-r border-' + g.color + '-200 shrink-0' }, g.label),
              g.tabs.map(function(s) { return renderBtn(s, g.color); })
            );
          })
        );
      }

      function renderTypesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '< Types of angles by size'),
          h('div', { className: 'space-y-2' },
            ANGLE_TYPES.map(function(a, i) {
              return h('div', { key: 'a'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1' },
                  h('span', { className: 'text-xl text-rose-600 font-mono' }, a.icon),
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, a.name),
                  h('span', { className: 'text-[11px] font-bold ml-auto px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono' }, a.range)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, a.desc)
              );
            })
          )
        );
      }

      function renderRelationshipsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '\u2AEF Angle pair relationships'),
          h('div', { className: 'space-y-2' },
            ANGLE_RELATIONSHIPS.map(function(r, i) {
              return h('div', { key: 'r'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, r.name),
                  h('span', { className: 'text-[10px] font-bold ml-auto px-2 py-0.5 rounded bg-rose-100 text-rose-800' }, r.condition)
                ),
                h('div', { className: 'text-[11px] text-slate-700 mb-0.5' }, h('strong', null, 'Example: '), r.example),
                h('div', { className: 'text-[11px] text-slate-600 italic' }, r.visual)
              );
            })
          )
        );
      }

      function renderPolygonsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '\u2B21 Polygon angle sums'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Interior angle sum = (n \u2212 2) \u00D7 180\u00B0 for any n-sided polygon. Each exterior angle of a REGULAR polygon = 360\u00B0/n. Sum of exterior angles always = 360\u00B0.'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['n', 'Name', 'Sum interior', 'Each (regular)', 'Each exterior', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                POLYGON_ANGLES.map(function(p, i) {
                  return h('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-mono font-bold text-slate-800' }, p.sides),
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, p.name),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, p.interiorSum),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, p.regularInterior),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, p.exteriorEach),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, p.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderTrigSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, 'sin Trigonometric functions'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'SOH-CAH-TOA: Sine = Opp/Hyp, Cosine = Adj/Hyp, Tangent = Opp/Adj. The trig functions express ratios of right-triangle sides; extended to all angles via the unit circle.'),
          h('div', { className: 'space-y-2' },
            TRIG_REF.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1' },
                  h('span', { className: 'text-base font-black text-rose-700 font-mono min-w-[48px]' }, t.fn),
                  h('span', { className: 'text-[11px] font-bold text-slate-700' }, t.mnemonic),
                  h('span', { className: 'text-[10px] font-mono ml-auto px-2 py-0.5 rounded bg-rose-100 text-rose-800' }, t.range)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, t.notes)
              );
            })
          )
        );
      }

      function renderSpecialSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '\u2605 Special angles (unit circle)'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'These angles + their trig values are worth memorizing \u2014 they appear constantly in math, physics, and engineering.'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Degrees', 'Radians', 'sin', 'cos', 'tan', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                SPECIAL_ANGLES.map(function(s, i) {
                  return h('tr', { key: 's'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-mono font-bold text-slate-800' }, s.deg),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, s.rad),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, s.sin),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, s.cos),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, s.tan),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, s.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderUnitsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '\u00B0 Angle units'),
          h('div', { className: 'space-y-2' },
            ANGLE_UNITS.map(function(u, i) {
              return h('div', { key: 'u'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, u.unit),
                  h('span', { className: 'text-[11px] font-bold ml-2 text-rose-700' }, u.symbol),
                  h('span', { className: 'text-[10px] font-mono ml-auto px-2 py-0.5 rounded bg-rose-100 text-rose-800' }, u.fullCircle)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, u.use)
              );
            })
          ),
          h('div', { className: 'mt-3 p-2.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-900' },
            h('strong', null, '\uD83D\uDD01 Conversions: '), '1 rad = 180/\u03C0 \u2248 57.296\u00B0. 1\u00B0 = \u03C0/180 \u2248 0.01745 rad. 1 gon = 0.9\u00B0. Most calculators have a degrees/radians mode toggle \u2014 make sure you\'re in the right mode!'
          )
        );
      }

      function renderWorldSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '\uD83C\uDF0D Real-world angles'),
          h('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2' },
            REAL_WORLD_ANGLES.map(function(r, i) {
              return h('div', { key: 'r'+i, className: 'p-2.5 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, r.thing),
                  h('span', { className: 'text-[11px] font-mono ml-auto px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold' }, r.angle)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, r.notes)
              );
            })
          )
        );
      }

      function renderTricksSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '\u26A1 Angle problem-solving shortcuts'),
          h('div', { className: 'space-y-2' },
            ANGLE_TRICKS.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-2.5 rounded-lg bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-rose-900 mb-0.5' }, t.trick),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, t.use)
              );
            })
          )
        );
      }

      function renderCompassSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '\uD83E\uDDED Compass bearings (16-point)'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Bearings measured CLOCKWISE from north. Standard 16-point compass has 22.5\u00B0 between adjacent directions.'),
          h('div', { className: 'grid grid-cols-4 gap-2' },
            COMPASS_BEARINGS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-2 rounded-md bg-slate-50 border border-slate-200 text-center' },
                h('div', { className: 'text-base font-black text-rose-700' }, c.dir),
                h('div', { className: 'text-[10px] font-mono text-slate-600' }, c.bearing)
              );
            })
          )
        );
      }

      function renderGlossarySection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '\uD83D\uDCD6 Angles glossary'),
          h('div', { className: 'space-y-1' },
            ANGLES_GLOSSARY.map(function(g, i) {
              return h('div', { key: 'g'+i, className: 'p-2 rounded-md bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-rose-900' }, g.term),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, g.def)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 2 EXPANSION — More geometry references (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var PYTHAG_TRIPLES = [
        { a: 3, b: 4, c: 5, notes: 'Smallest primitive triple. Egyptians used 3:4:5 ropes to make right angles.' },
        { a: 5, b: 12, c: 13, notes: 'Second smallest primitive.' },
        { a: 8, b: 15, c: 17, notes: 'Primitive.' },
        { a: 7, b: 24, c: 25, notes: 'Primitive.' },
        { a: 20, b: 21, c: 29, notes: 'Primitive — legs close in length.' },
        { a: 9, b: 40, c: 41, notes: 'Primitive.' },
        { a: 12, b: 35, c: 37, notes: 'Primitive.' },
        { a: 11, b: 60, c: 61, notes: 'Primitive.' },
        { a: 28, b: 45, c: 53, notes: 'Primitive.' },
        { a: 33, b: 56, c: 65, notes: 'Primitive.' },
        { a: 16, b: 63, c: 65, notes: 'Primitive. Two triples with hypotenuse 65.' },
        { a: 6, b: 8, c: 10, notes: '2× of (3,4,5). Multiples are also Pythagorean (just not primitive).' },
        { a: 9, b: 12, c: 15, notes: '3× of (3,4,5).' }
      ];

      var TRIANGLE_TYPES = [
        { type: 'Equilateral', sides: 'All 3 sides equal', angles: 'All 60°', notes: 'Three lines of symmetry. Maximum area for given perimeter (among triangles).' },
        { type: 'Isosceles', sides: 'Two sides equal', angles: 'Two equal base angles', notes: 'Single line of symmetry through apex.' },
        { type: 'Scalene', sides: 'No sides equal', angles: 'No angles equal', notes: 'No special symmetry.' },
        { type: 'Right', sides: 'No constraint', angles: 'One 90° angle', notes: 'Pythagoras applies. Hypotenuse is longest side.' },
        { type: 'Acute', sides: 'No constraint', angles: 'All angles < 90°', notes: 'All three angles are acute.' },
        { type: 'Obtuse', sides: 'No constraint', angles: 'One angle > 90°', notes: 'Only one angle can be obtuse — sum is 180°.' },
        { type: 'Right isosceles', sides: 'Two equal legs', angles: '90°, 45°, 45°', notes: 'Hypotenuse = leg × √2. Diagonal of a square.' },
        { type: '30-60-90', sides: 'Ratio 1 : √3 : 2', angles: '30°, 60°, 90°', notes: 'Half of an equilateral triangle.' }
      ];

      var TRIANGLE_FORMULAS = [
        { name: 'Area (base × height)', formula: 'A = ½·b·h', notes: 'Most common. b and h must be perpendicular.' },
        { name: 'Area (Heron\'s formula)', formula: 'A = √[s(s−a)(s−b)(s−c)], s = (a+b+c)/2', notes: 'Uses three sides only. No angles needed.' },
        { name: 'Area (two sides + included angle)', formula: 'A = ½·a·b·sin C', notes: 'When you know two sides and the angle between them.' },
        { name: 'Law of Sines', formula: 'a/sin A = b/sin B = c/sin C = 2R', notes: 'R = circumradius. Useful when you know one side + opposite angle.' },
        { name: 'Law of Cosines', formula: 'c² = a² + b² − 2ab·cos C', notes: 'Generalization of Pythagoras. Cos C = 0 (C=90°) → Pythagoras.' },
        { name: 'Sum of angles', formula: 'A + B + C = 180°', notes: 'Euclidean (flat) triangles. Sum > 180° on sphere.' },
        { name: 'Pythagorean theorem', formula: 'a² + b² = c²', notes: 'Right triangles only. c = hypotenuse.' },
        { name: 'Triangle inequality', formula: 'a + b > c (and permutations)', notes: 'Sum of any two sides > third side.' },
        { name: 'Centroid', formula: 'Intersection of medians', notes: 'Center of mass. Divides each median 2:1 from vertex.' },
        { name: 'Circumcenter', formula: 'Intersection of perpendicular bisectors', notes: 'Center of circumscribed circle (passes through all 3 vertices).' },
        { name: 'Incenter', formula: 'Intersection of angle bisectors', notes: 'Center of inscribed circle (tangent to all 3 sides).' },
        { name: 'Orthocenter', formula: 'Intersection of altitudes', notes: 'Inside acute triangles, outside obtuse, at right-angle vertex of right triangles.' }
      ];

      var CIRCLE_FACTS = [
        { name: 'Circumference', formula: 'C = 2πr = πd', notes: 'd = diameter. π ≈ 3.14159...' },
        { name: 'Area', formula: 'A = πr²', notes: 'Maximum area for given perimeter (isoperimetric inequality).' },
        { name: 'Arc length', formula: 's = r·θ (θ in radians)', notes: 'Or s = (θ°/360°)·2πr.' },
        { name: 'Sector area', formula: 'A = ½·r²·θ (θ in radians)', notes: 'Or A = (θ°/360°)·πr².' },
        { name: 'Chord length', formula: 'L = 2r·sin(θ/2)', notes: 'θ = central angle to the chord.' },
        { name: 'Inscribed angle theorem', formula: 'Inscribed angle = ½ central angle', notes: 'Both subtend the same arc.' },
        { name: 'Thales\' theorem', formula: 'Angle inscribed in semicircle = 90°', notes: 'Special case of inscribed angle theorem.' },
        { name: 'Power of a point', formula: 'For two secants: PA·PB = PC·PD', notes: 'Holds for any two lines through P intersecting circle.' },
        { name: 'Equation of circle (center h,k)', formula: '(x−h)² + (y−k)² = r²', notes: 'Standard form.' },
        { name: 'Tangent-radius', formula: 'Tangent ⊥ radius at point of contact', notes: 'Right angle between radius and tangent line.' }
      ];

      var SOLID_VOLUMES = [
        { name: 'Cube', V: 's³', SA: '6s²', notes: '6 faces, 12 edges, 8 vertices. All edges equal.' },
        { name: 'Rectangular prism (box)', V: 'lwh', SA: '2(lw + lh + wh)', notes: '6 faces, 12 edges, 8 vertices.' },
        { name: 'Sphere', V: '(4/3)πr³', SA: '4πr²', notes: 'Maximum volume for given surface area. Soap bubbles minimize surface area.' },
        { name: 'Cylinder', V: 'πr²h', SA: '2πr² + 2πrh', notes: 'Like a prism but with circular ends.' },
        { name: 'Cone', V: '(1/3)πr²h', SA: 'πr² + πr·ℓ (ℓ = slant)', notes: 'Volume = 1/3 of cylinder with same r and h.' },
        { name: 'Square pyramid', V: '(1/3)s²h', SA: 's² + 2s·ℓ', notes: 'Egyptian pyramids. Volume = 1/3 of prism with same base + height.' },
        { name: 'Triangular prism', V: '(1/2)bh·L', SA: 'sum of 5 faces', notes: 'Cross-section is triangle. Toblerone bar.' },
        { name: 'Tetrahedron (regular)', V: 's³/(6√2)', SA: 's²·√3', notes: '4 triangular faces. Simplest 3D shape (just 4 vertices).' },
        { name: 'Octahedron (regular)', V: '(√2/3)s³', SA: '2s²·√3', notes: '8 triangular faces. Diamond crystal shape.' },
        { name: 'Dodecahedron (regular)', V: '(15+7√5)/4·s³', SA: '3·s²·√(25+10√5)', notes: '12 pentagonal faces. Plato linked to "the heavens".' },
        { name: 'Icosahedron (regular)', V: '(5(3+√5)/12)·s³', SA: '5·s²·√3', notes: '20 triangular faces. Most spherelike Platonic solid.' }
      ];

      var TRANSFORMATIONS = [
        { name: 'Translation', effect: 'Slides shape (no rotation, no reflection, no resize)', preserves: 'Size, shape, orientation', notes: 'Just adds a vector to every point. (x,y) → (x+a, y+b).' },
        { name: 'Rotation', effect: 'Turns shape around a fixed point', preserves: 'Size, shape', notes: 'Specified by center + angle. Around origin: (x,y) → (x·cos θ − y·sin θ, x·sin θ + y·cos θ).' },
        { name: 'Reflection', effect: 'Mirrors shape across a line', preserves: 'Size, shape (but reverses orientation/chirality)', notes: 'Across x-axis: (x,y) → (x,−y). Across y-axis: (x,y) → (−x,y). Across y=x: (x,y) → (y,x).' },
        { name: 'Glide reflection', effect: 'Reflection + translation along the line of reflection', preserves: 'Size, shape (reverses orientation)', notes: 'Footprints in sand are a glide reflection pattern.' },
        { name: 'Dilation (scaling)', effect: 'Stretches/shrinks shape from a center', preserves: 'Shape (similarity), but not size', notes: 'Factor k: (x,y) → (kx, ky). k > 1 = enlargement; 0 < k < 1 = reduction; k < 0 = reflection through center.' },
        { name: 'Shear', effect: 'Skews shape — parallel lines stay parallel but slide', preserves: 'Area', notes: 'Horizontal shear: (x,y) → (x + k·y, y). Italic fonts are sheared.' },
        { name: 'Identity', effect: 'Does nothing', preserves: 'Everything', notes: 'The trivial transformation.' },
        { name: 'Composition', effect: 'Apply one after another', preserves: 'Depends on the composition', notes: 'Order matters! Rotate-then-translate ≠ translate-then-rotate (in general).' }
      ];

      var COORD_SYSTEMS = [
        { name: 'Cartesian (rectangular) 2D', coords: '(x, y)', use: 'Most common. Standard graph paper.', notes: 'x-axis horizontal, y-axis vertical. Origin (0,0).' },
        { name: 'Cartesian (rectangular) 3D', coords: '(x, y, z)', use: 'Standard for 3D graphics, physics.', notes: 'Right-handed: thumb x, index y, middle z.' },
        { name: 'Polar 2D', coords: '(r, θ)', use: 'Circular/radial symmetry.', notes: 'r = distance from origin, θ = angle from +x axis. x = r cos θ, y = r sin θ.' },
        { name: 'Cylindrical 3D', coords: '(r, θ, z)', use: 'Cylinders, helices, axial symmetry.', notes: 'Polar in plane + z height. Used for solenoids, pipe flow.' },
        { name: 'Spherical 3D', coords: '(ρ, θ, φ)', use: 'Spheres, planetary motion, antennas.', notes: 'ρ = distance from origin; conventions vary on which angle is θ vs φ.' },
        { name: 'Geographic (lat, lon)', coords: '(lat, lon)', use: 'Earth surface.', notes: 'Latitude: −90° (S pole) to +90° (N pole). Longitude: −180° to +180° from prime meridian.' },
        { name: 'UTM (Universal Transverse Mercator)', coords: 'zone + (E, N)', use: 'Local-scale maps, surveys.', notes: 'Projects Earth onto cylinder. Less distortion at small scales than lat/lon.' },
        { name: 'Homogeneous (projective)', coords: '(x, y, w) or (x, y, z, w)', use: 'Computer graphics, projective geometry.', notes: 'Adds a "weight" coordinate. Enables translations as matrix multiplication.' }
      ];

      var VECTOR_NOTES = [
        { topic: 'What is a vector', detail: 'Quantity with both magnitude AND direction. Drawn as arrow. Examples: velocity, force, displacement.' },
        { topic: 'Scalar vs vector', detail: 'Scalar = just a number (mass, temperature, time). Vector = magnitude + direction.' },
        { topic: 'Vector addition (head-to-tail)', detail: 'Place tail of second at head of first. Resultant = first tail to second head.' },
        { topic: 'Vector addition (parallelogram)', detail: 'Place tails together. Diagonal of parallelogram = resultant.' },
        { topic: 'Components', detail: 'Vector v at angle θ: vₓ = v·cos θ, v_y = v·sin θ.' },
        { topic: 'Magnitude', detail: '|v| = √(vₓ² + v_y² + v_z²). Pythagoras in any dimension.' },
        { topic: 'Unit vector', detail: 'Magnitude 1. v̂ = v / |v|. Often called the "direction" of v.' },
        { topic: 'Dot product', detail: 'a·b = |a||b|cos θ. Gives scalar. Zero when perpendicular. Negative when angle > 90°.' },
        { topic: 'Cross product (3D only)', detail: 'a×b = |a||b|sin θ · n̂. Gives vector PERPENDICULAR to both. Magnitude = area of parallelogram.' },
        { topic: 'Right-hand rule (cross)', detail: 'Curl fingers from a to b. Thumb points in direction of a×b. (Right-handed coordinates.)' },
        { topic: 'Linear combination', detail: 'c₁·a + c₂·b. Generates a plane (or line) of vectors.' },
        { topic: 'Real-world: forces', detail: 'Newton\'s 2nd law: F = ma. Net force is vector sum of all forces.' },
        { topic: 'Real-world: navigation', detail: 'Airplane heading + wind vector → ground velocity (vector sum).' }
      ];

      var SYMMETRY_TYPES = [
        { name: 'Reflection (mirror) symmetry', count: 'one or more axes', example: 'Butterfly (1 axis), snowflake (6 axes), letter A (1 axis vertical)', notes: 'Shape unchanged when reflected across the axis.' },
        { name: 'Rotational symmetry', count: 'n-fold (rotation 360°/n)', example: 'Pinwheel (4-fold), starfish (5-fold), honeycomb cell (6-fold)', notes: 'Looks identical after rotating 360°/n.' },
        { name: 'Translational symmetry', count: 'unlimited (along translation vector)', example: 'Wallpaper, brick wall, fence', notes: 'Pattern repeats by translation.' },
        { name: 'Glide reflection', count: '—', example: 'Footprints, frieze patterns', notes: 'Reflect + translate combined.' },
        { name: 'Point symmetry (centrosymmetric)', count: '2-fold rotation about a point', example: 'Letter S, letter Z, recycling logo', notes: 'Looks identical when rotated 180° about center.' },
        { name: 'Bilateral symmetry', count: '1 mirror axis', example: 'Vertebrate animals (you!), most leaves', notes: 'Left/right halves are mirror images.' },
        { name: 'Radial symmetry', count: 'rotational', example: 'Sea stars, daisies, jellyfish', notes: 'Multiple mirror lines through a center.' },
        { name: 'Crystallographic groups', count: '17 wallpaper, 230 3D space groups', example: 'Crystals, M.C. Escher tilings', notes: 'Mathematically classified symmetry of repeating patterns.' }
      ];

      var TILING_FACTS = [
        { name: 'Regular tessellations (3 only)', detail: 'Equilateral triangle, square, regular hexagon. Only regular polygons that tile the plane.' },
        { name: 'Why only 3?', detail: 'Interior angle must divide 360°. Triangle 60° (×6), square 90° (×4), hexagon 120° (×3). Pentagon 108° doesn\'t divide 360° → can\'t tile alone.' },
        { name: 'Semiregular (Archimedean) tessellations', detail: '8 in total. Combine multiple regular polygons; same arrangement at each vertex.' },
        { name: 'Penrose tilings (1974)', detail: 'Aperiodic tiling — never repeats exactly. 5-fold symmetry. Inspired discovery of quasicrystals.' },
        { name: 'Honeycomb conjecture', detail: 'Hexagonal tiling minimizes total perimeter for given area. Proven by Hales (1999). Why bees use hexagons.' },
        { name: 'Voronoi diagrams', detail: 'Each region = points closest to one "seed" point. Appears in nature (giraffe spots, mud cracks, cell organization).' },
        { name: 'Hyperbolic tilings', detail: 'On a hyperbolic plane, regular pentagons (and many other shapes) CAN tile. M.C. Escher\'s "Circle Limit" series.' },
        { name: 'Wang tiles (1961)', detail: 'Colored squares that must match neighbors on edges. Can simulate Turing machine → tiling problem is undecidable in general.' },
        { name: '"Einstein" tile (2023)', detail: 'A single tile that aperiodically tiles the plane (the "hat" and "spectre" shapes). Major recent discovery.' }
      ];

      var GEOMETRY_HISTORY = [
        { year: '~3000 BCE', who: 'Egyptians + Babylonians', what: 'Used 3-4-5 ropes to lay out right angles for pyramids + buildings.' },
        { year: '~300 BCE', who: 'Euclid', what: '"Elements" — 13 books axiomatized geometry. Basis of geometry for 2000+ years.' },
        { year: '~250 BCE', who: 'Archimedes', what: 'Calculated π to high precision. Volume + surface area of sphere. Almost developed integral calculus.' },
        { year: '~150 CE', who: 'Ptolemy', what: 'Trigonometry tables. Geocentric model of solar system (Almagest).' },
        { year: '~830 CE', who: 'al-Khwarizmi', what: 'Founded algebra ("al-jabr"). Linked to geometry. "Algorithm" derives from his name.' },
        { year: '1637', who: 'René Descartes', what: 'Analytic geometry — coordinates link algebra + geometry. "Cartesian" named for him.' },
        { year: '1675', who: 'Isaac Newton + Leibniz', what: 'Independently developed calculus. Tangent lines + areas → infinitesimal geometry.' },
        { year: '1820s', who: 'Lobachevsky + Bolyai + Gauss', what: 'Non-Euclidean geometry — parallel postulate not required.' },
        { year: '1854', who: 'Bernhard Riemann', what: 'Differential geometry — curved manifolds. Basis of Einstein\'s general relativity.' },
        { year: '1872', who: 'Felix Klein', what: 'Erlangen program — classified geometries by their symmetry groups.' },
        { year: '1899', who: 'David Hilbert', what: 'Axiomatized Euclidean geometry more rigorously than Euclid himself.' },
        { year: '1915', who: 'Albert Einstein', what: 'General relativity: gravity is curvature of spacetime. Pure geometry of physics.' },
        { year: '1975', who: 'Benoit Mandelbrot', what: 'Fractals — shapes with infinite detail at every scale.' },
        { year: '2003', who: 'Grigori Perelman', what: 'Proved Poincaré conjecture (a Millennium Prize problem). Declined the $1M prize.' }
      ];

      var ANGLE_CAREERS = [
        { career: 'Architect', use: 'Angles in building design — roof pitches, structural braces, sight lines. CAD software computes structural angles.' },
        { career: 'Surveyor', use: 'Theodolites measure horizontal + vertical angles. Triangulation determines land boundaries, elevations.' },
        { career: 'Civil engineer', use: 'Road banking angles, bridge truss angles, dam slopes. Loads decomposed into perpendicular components.' },
        { career: 'Astronomer', use: 'Telescope pointing, parallax measurements (very small angles), star positions in arcseconds.' },
        { career: 'Pilot / navigator', use: 'Compass headings, glide slopes, bearings. Air traffic control headings always in degrees.' },
        { career: 'Photographer / cinematographer', use: 'Field of view (FOV), Dutch tilts, sun angles. Lens choices determined by angle of view.' },
        { career: 'Carpenter', use: 'Miter saw angles for picture frames, roof rafters, stair stringers. Speed square is angle reference.' },
        { career: 'Sailor', use: 'Wind angle (point of sail), compass headings, celestial navigation with sextant.' },
        { career: 'Optometrist', use: 'Astigmatism axes measured in degrees. Prism prescription for binocular vision problems.' },
        { career: 'Animator / game dev', use: 'Bone rotations in rigs, camera frustums, lighting angles.' },
        { career: 'Athletic coach', use: 'Optimal launch angles for projectiles (shot put ~38°, long jump ~21°, javelin ~30-35°).' },
        { career: 'Geologist', use: 'Strike and dip of rock layers — measured with Brunton compass.' },
        { career: 'Robotics engineer', use: 'Joint angles of robot arms, sensor field of view, path planning.' },
        { career: 'Anesthesiologist', use: 'Needle insertion angles for nerve blocks, epidurals.' }
      ];

      function renderPythagSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, 'a²+b² Pythagorean theorem'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'In a right triangle, a² + b² = c² where c is the hypotenuse. Sets of integers (a, b, c) that satisfy this are called Pythagorean triples. A "primitive" triple has no common factor.'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['a', 'b', 'c', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                PYTHAG_TRIPLES.map(function(t, i) {
                  return h('tr', { key: 't'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold' }, t.a),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold' }, t.b),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold' }, t.c),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px] italic' }, t.notes)
                  );
                })
              )
            )
          ),
          h('div', { className: 'mt-3 p-2.5 rounded bg-rose-50 border border-rose-200 text-[11px] text-rose-900' },
            h('strong', null, 'Generating primitive triples: '), 'For positive integers m > n with no common factor and not both odd, a = m² − n², b = 2mn, c = m² + n². Tries m=2, n=1 → (3,4,5).'
          )
        );
      }

      function renderTrianglesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '△ Triangle types and formulas'),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Classification'),
            h('div', { className: 'space-y-1' },
              TRIANGLE_TYPES.map(function(t, i) {
                return h('div', { key: 't'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  h('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                    h('span', { className: 'text-[11px] font-black text-slate-800' }, t.type),
                    h('span', { className: 'text-[10px] text-rose-700 font-mono ml-auto' }, t.angles)
                  ),
                  h('div', { className: 'text-[10px] text-slate-700 italic mb-0.5' }, t.sides),
                  h('div', { className: 'text-[10px] text-slate-700' }, t.notes)
                );
              })
            )
          ),
          h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Key formulas'),
          h('div', { className: 'space-y-1' },
            TRIANGLE_FORMULAS.map(function(f, i) {
              return h('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                  h('span', { className: 'text-[11px] font-black text-slate-800' }, f.name),
                  h('span', { className: 'text-[11px] font-mono ml-auto text-rose-700 font-bold' }, f.formula)
                ),
                h('div', { className: 'text-[10px] text-slate-700' }, f.notes)
              );
            })
          )
        );
      }

      function renderCircleSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '◯ Circle geometry'),
          h('div', { className: 'space-y-1' },
            CIRCLE_FACTS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                  h('span', { className: 'text-[11px] font-black text-slate-800' }, c.name),
                  h('span', { className: 'text-[11px] font-mono ml-auto text-rose-700 font-bold' }, c.formula)
                ),
                h('div', { className: 'text-[10px] text-slate-700' }, c.notes)
              );
            })
          )
        );
      }

      function renderSolidsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⬢ 3D solids — volumes and surface areas'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Solid', 'Volume (V)', 'Surface area (SA)', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                SOLID_VOLUMES.map(function(s, i) {
                  return h('tr', { key: 's'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, s.name),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[10px]' }, s.V),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 text-[10px]' }, s.SA),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, s.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderTransformSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '↻ Geometric transformations'),
          h('div', { className: 'space-y-2' },
            TRANSFORMATIONS.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, t.name),
                h('div', { className: 'text-[11px] text-rose-700 font-bold mb-1' }, t.effect),
                h('div', { className: 'text-[10px] text-slate-700 mb-1' }, h('strong', null, 'Preserves: '), t.preserves),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, t.notes)
              );
            })
          )
        );
      }

      function renderCoordsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '(x,y) Coordinate systems'),
          h('div', { className: 'space-y-2' },
            COORD_SYSTEMS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, c.name),
                  h('span', { className: 'text-[11px] font-mono text-rose-700 font-bold ml-auto px-2 py-0.5 rounded bg-rose-100' }, c.coords)
                ),
                h('div', { className: 'text-[11px] text-slate-700 mb-1' }, h('strong', null, 'Use: '), c.use),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.notes)
              );
            })
          )
        );
      }

      function renderVectorsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '→ Vectors'),
          h('div', { className: 'space-y-1' },
            VECTOR_NOTES.map(function(v, i) {
              return h('div', { key: 'v'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-rose-900 mb-0.5' }, v.topic),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, v.detail)
              );
            })
          )
        );
      }

      function renderSymmetrySection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⟂ Symmetry'),
          h('div', { className: 'space-y-2' },
            SYMMETRY_TYPES.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, s.name),
                  h('span', { className: 'text-[10px] text-rose-700 font-mono ml-auto' }, s.count)
                ),
                h('div', { className: 'text-[10px] text-slate-700 italic mb-1' }, 'Example: ' + s.example),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.notes)
              );
            })
          )
        );
      }

      function renderTilingsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⬡ Tessellations & tilings'),
          h('div', { className: 'space-y-2' },
            TILING_FACTS.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-rose-900 mb-0.5' }, t.name),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, t.detail)
              );
            })
          )
        );
      }

      function renderFamousSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🕰 History of geometry'),
          h('div', { className: 'space-y-2' },
            GEOMETRY_HISTORY.map(function(g, i) {
              return h('div', { key: 'g'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-0.5' },
                  h('span', { className: 'text-[10px] font-mono text-rose-700 font-bold' }, g.year),
                  h('span', { className: 'text-[12px] font-black text-rose-900' }, g.who)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, g.what)
              );
            })
          )
        );
      }

      function renderCareersSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '💼 Careers that use angles every day'),
          h('div', { className: 'space-y-2' },
            ANGLE_CAREERS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-rose-900 mb-0.5' }, c.career),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.use)
              );
            })
          )
        );
      }

      function renderActiveSection() {
        if (expSection === 'types') return renderTypesSection();
        if (expSection === 'relationships') return renderRelationshipsSection();
        if (expSection === 'polygons') return renderPolygonsSection();
        if (expSection === 'trig') return renderTrigSection();
        if (expSection === 'special') return renderSpecialSection();
        if (expSection === 'units') return renderUnitsSection();
        if (expSection === 'world') return renderWorldSection();
        if (expSection === 'tricks') return renderTricksSection();
        if (expSection === 'compass') return renderCompassSection();
        if (expSection === 'pythag') return renderPythagSection();
        if (expSection === 'triangles') return renderTrianglesSection();
        if (expSection === 'circle') return renderCircleSection();
        if (expSection === 'solids') return renderSolidsSection();
        if (expSection === 'transform') return renderTransformSection();
        if (expSection === 'coords') return renderCoordsSection();
        if (expSection === 'vectors') return renderVectorsSection();
        if (expSection === 'symmetry') return renderSymmetrySection();
        if (expSection === 'tilings') return renderTilingsSection();
        if (expSection === 'famous') return renderFamousSection();
        if (expSection === 'careers') return renderCareersSection();
        if (expSection === 'conics') return renderConicsSection();
        if (expSection === 'platonic') return renderPlatonicSection();
        if (expSection === 'fractals') return renderFractalsSection();
        if (expSection === 'noneuclid') return renderNoneuclidSection();
        if (expSection === 'projection') return renderProjectionSection();
        if (expSection === 'sundial') return renderSundialSection();
        if (expSection === 'goldenratio') return renderGoldenRatioSection();
        if (expSection === 'origami') return renderOrigamiSection();
        if (expSection === 'sports') return renderSportsSection();
        if (expSection === 'art') return renderArtSection();
        if (expSection === 'tools') return renderToolsSection();
        if (expSection === 'constants') return renderConstantsSection();
        if (expSection === 'rivers') return renderRiversSection();
        if (expSection === 'buildings') return renderBuildingsSection();
        if (expSection === 'curves') return renderCurvesSection();
        if (expSection === 'mathematicians') return renderMathematiciansSection();
        if (expSection === 'practical') return renderPracticalSection();
        if (expSection === 'puzzles') return renderPuzzlesSection();
        if (expSection === 'tessell2') return renderTessell2Section();
        if (expSection === 'cities') return renderCitiesSection();
        if (expSection === 'mountains') return renderMountainsSection();
        if (expSection === 'planets') return renderPlanetsSection();
        if (expSection === 'building_angles') return renderBuildingAnglesSection();
        if (expSection === 'flag_design') return renderFlagDesignSection();
        if (expSection === 'shapes_iq') return renderShapesIqSection();
        if (expSection === 'theorems') return renderTheoremsSection();
        if (expSection === 'glossary') return renderGlossarySection();
        return null;
      }

      var CLASSIC_THEOREMS = [
        { theorem: 'Pythagorean theorem', statement: 'a² + b² = c² for right triangles', notes: 'Pre-dates Pythagoras; Babylonians knew it. >370 distinct proofs exist.' },
        { theorem: 'Thales\'s theorem', statement: 'Inscribed angle in semicircle = 90°', notes: 'Special case of inscribed angle theorem.' },
        { theorem: 'Triangle inequality', statement: 'a + b > c (for any two sides + third)', notes: 'Generalizes to: distance is "shortest along straight line".' },
        { theorem: 'Law of cosines', statement: 'c² = a² + b² − 2ab cos C', notes: 'Generalization of Pythagoras. C=90° → Pythagoras.' },
        { theorem: 'Euler\'s formula (polyhedra)', statement: 'V − E + F = 2 for convex polyhedron', notes: 'Holds for all 5 Platonic solids + many others.' },
        { theorem: 'Four-color theorem', statement: 'Every planar map can be colored with 4 colors', notes: 'First major theorem proved by computer (1976).' },
        { theorem: 'Fermat\'s last theorem', statement: 'No integer solutions to aⁿ + bⁿ = cⁿ for n > 2', notes: 'Conjectured 1637, proved 1994 by Andrew Wiles.' },
        { theorem: 'Gödel\'s incompleteness', statement: 'Any consistent formal system contains true statements unprovable in that system', notes: 'Devastated formalist program in mathematics (1931).' },
        { theorem: 'Banach-Tarski paradox', statement: 'A solid ball can be split + reassembled into two identical balls', notes: 'Uses non-measurable pieces + axiom of choice.' },
        { theorem: 'Bayes\' theorem', statement: 'P(A|B) = P(B|A) · P(A) / P(B)', notes: 'Foundation of probabilistic inference + modern ML.' },
        { theorem: 'Central limit theorem', statement: 'Sum of many independent random variables tends to normal distribution', notes: 'Why bell curve appears so often.' },
        { theorem: 'Euclidean parallel postulate', statement: 'Through a point not on a line, exactly one parallel line exists', notes: 'Equivalent forms: triangle angles sum to 180°, Pythagoras holds. Dropping it gives non-Euclidean geometries.' },
        { theorem: 'Stokes\' theorem', statement: 'Integral of curl over surface = integral around boundary', notes: 'Unifies Green\'s, divergence, fundamental theorem of calculus. Foundation of vector calculus.' },
        { theorem: 'Noether\'s theorem', statement: 'Every continuous symmetry implies a conservation law', notes: 'Time symmetry → conservation of energy. Space symmetry → momentum. Rotation → angular momentum.' },
        { theorem: 'Poincaré conjecture', statement: 'A simply-connected 3-manifold is a 3-sphere', notes: 'Proved by Grigori Perelman (2003). He declined the $1M Millennium Prize and the Fields Medal.' },
        { theorem: 'Hairy ball theorem', statement: 'Cannot comb a hairy ball flat without creating a cowlick', notes: 'There is always at least one point on a sphere where wind speed = 0. Implications for weather.' },
        { theorem: 'Brouwer fixed-point theorem', statement: 'Continuous map from a disk to itself has at least one fixed point', notes: 'Stir a cup of coffee — at least one point ends up where it started.' },
        { theorem: 'Borsuk-Ulam theorem', statement: 'For any continuous map S² → R², two antipodal points map to the same point', notes: 'At any moment, two antipodal places on Earth share exact same temperature + pressure.' }
      ];

      function renderTheoremsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '∎ Classic mathematical theorems'),
          h('div', { className: 'space-y-2' },
            CLASSIC_THEOREMS.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-rose-900 mb-1' }, t.theorem),
                h('div', { className: 'text-[11px] text-slate-800 font-mono mb-1' }, t.statement),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed italic' }, t.notes)
              );
            })
          )
        );
      }

      var SHAPE_FACTS = [
        { fact: 'Circle has most area for a perimeter', detail: 'Isoperimetric inequality: 4πA ≤ P². Equality only for circles. Why soap bubbles + planets are round.' },
        { fact: 'Sphere has most volume for a surface area', detail: '3D version of above. Single bubbles are spheres; merged bubbles meet at 120° angles.' },
        { fact: 'Regular hexagons tile most efficiently', detail: 'Honeycomb conjecture (proven 1999 by Hales): hexagonal tiling has lowest total edge length per area among any partition.' },
        { fact: 'Triangle is most rigid shape', detail: 'Cannot be deformed without changing side lengths. Why bridges + roof trusses use triangles.' },
        { fact: 'Squares stack densely (100%)', detail: 'Square tiles fill the plane with no gaps. Same for rectangles + parallelograms.' },
        { fact: 'Circles tile poorly', detail: 'Hexagonal packing of circles fills ~90.7% of plane (best possible). Square packing only ~78.5%.' },
        { fact: 'Sphere packing in 3D', detail: 'FCC + HCP both achieve ~74% density (Kepler conjecture, proven 2014 by Hales).' },
        { fact: 'Five regular polyhedra', detail: 'Only 5 in 3D: tetrahedron, cube, octahedron, dodecahedron, icosahedron. (Plato discussed.)' },
        { fact: 'Tetrahedron is simplest', detail: '4 vertices, 6 edges, 4 faces. Minimum 3D shape.' },
        { fact: 'Sphere/cube/cylinder volumes', detail: 'For sphere inscribed in cylinder (h = 2r): V_sphere = 2/3 × V_cylinder. (Archimedes\'s favorite result.)' },
        { fact: '4D hypercube (tesseract)', detail: '16 vertices, 32 edges, 24 faces, 8 cells. Can be unfolded into 8 cubes (per Salvador Dalí).' },
        { fact: 'Möbius strip', detail: 'Single-sided surface. Cut down middle → longer single loop. Cut at 1/3 → two interlocked rings (one Möbius).' },
        { fact: 'Klein bottle', detail: 'Closed non-orientable surface. Inside = outside. Can be made in 3D only with self-intersection.' },
        { fact: 'Reuleaux triangle', detail: 'Curve of constant width (not a circle!). Can roll a board on three Reuleaux rollers smoothly. Drill bits use it.' },
        { fact: 'Antiprism', detail: 'Two parallel polygons rotated 360°/2n, connected by triangles. Tetrahedron is the simplest antiprism.' },
        { fact: 'Snub cube', detail: 'Has chirality — left- + right-handed forms. One of two chiral Archimedean solids (other is snub dodecahedron).' },
        { fact: 'Hyperbolic paraboloid (saddle)', detail: 'Equation z = xy. Straight lines lie on it in 2 families. Used in Pringles + some roofs.' },
        { fact: 'Stable polyhedron count', detail: '"Gomboc" (2006) is first known mono-monostatic — one stable + one unstable equilibrium. Like a self-righting Weeble.' },
        { fact: 'Egg shape (oval) tessellation', detail: 'Cannot tile plane alone — gaps. But 7 egg-shapes form a hex-like cluster.' },
        { fact: 'Polyhedra in nature', detail: 'Common in crystals: cube (NaCl), octahedron (diamond, fluorite), dodecahedron (pyrite, garnet).' },
        { fact: 'Buckyball (C₆₀)', detail: 'Truncated icosahedron. 60 carbons. Like soccer ball pattern. Discovered 1985.' },
        { fact: 'DNA double helix', detail: 'Helical, ~10.5 base pairs per turn. Major + minor grooves. Constant diameter ~2 nm.' },
        { fact: 'Honeycomb cells', detail: 'Hexagonal prisms with rhombic bottoms. Bees do not consciously calculate — biophysics naturally minimizes surface area.' },
        { fact: '"Spaghetti theorem"', detail: 'Drop spaghetti at random — average number of intersections = (L/πd) × π × n. Used to estimate π in classroom.' }
      ];

      function renderShapesIqSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '◇ Surprising shape facts'),
          h('div', { className: 'space-y-1' },
            SHAPE_FACTS.map(function(f, i) {
              return h('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-rose-900 mb-0.5' }, f.fact),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      var FLAG_GEOMETRY = [
        { flag: 'United States', ratio: '1.0 : 1.9', features: '50 stars in alternating rows of 6/5; 13 stripes', notes: 'Stars on union (canton): 5 rows of 6 + 4 rows of 5. Each star points up.' },
        { flag: 'United Kingdom (Union Jack)', ratio: '1 : 2', features: 'Crosses of St. George, St. Andrew, St. Patrick combined', notes: 'Asymmetric — has a correct "up" orientation. Flying upside-down is distress signal.' },
        { flag: 'France', ratio: '2 : 3', features: 'Blue, white, red vertical stripes (equal)', notes: 'Tricolore inspired many revolutionary flags worldwide.' },
        { flag: 'Japan', ratio: '2 : 3', features: 'White field with red circle in center', notes: 'Circle radius = 3/10 of width. Center of flag.' },
        { flag: 'China', ratio: '2 : 3', features: '5 yellow stars on red field', notes: 'Large star + 4 small stars arc; smaller stars have one point facing the large star\'s center.' },
        { flag: 'Canada', ratio: '1 : 2', features: 'White square (1:1) with 11-point maple leaf flanked by red bars', notes: '11 points: 5 left, 5 right, 1 base. Adopted 1965.' },
        { flag: 'Switzerland', ratio: '1 : 1 (square)', features: 'Red field with white cross', notes: 'One of only two square national flags (other: Vatican City).' },
        { flag: 'Nepal', ratio: 'unique non-rectangular', features: 'Two stacked triangular pennants', notes: 'Only non-rectangular national flag. Constitution specifies exact geometric construction.' },
        { flag: 'Israel', ratio: '8 : 11', features: 'White field, two blue horizontal stripes, Star of David in center', notes: 'Star of David = two overlapping equilateral triangles.' },
        { flag: 'Brazil', ratio: '7 : 10', features: 'Green field, yellow rhombus, blue disc with stars + motto', notes: 'Stars represent constellations visible from Rio at moment of independence proclamation.' },
        { flag: 'South Africa', ratio: '2 : 3', features: 'Y-shape pall (horizontal Y) dividing 6 colors', notes: 'Adopted 1994. Six colors represent the new democracy.' },
        { flag: 'EU', ratio: '2 : 3', features: '12 yellow stars in circle on blue field', notes: '12 = symbol of perfection (not member count). Stars 5-pointed, pointed up.' },
        { flag: 'NATO', ratio: '3 : 4', features: 'Dark blue field with white compass rose + circle', notes: 'Compass rose = 4 cardinal directions, symbolizing unity of purpose.' },
        { flag: 'Olympic', ratio: '2 : 3', features: '5 interlocking rings (blue, yellow, black, green, red) on white field', notes: 'Five rings = five inhabited continents. Six colors (with white field) cover all national flags at time of design.' },
        { flag: 'Pirate (Jolly Roger)', ratio: 'varies', features: 'Skull above crossed bones', notes: 'Different captains had distinct designs. Edward Teach (Blackbeard) had skeleton + spear + heart.' }
      ];

      var FLAG_GEOMETRY_NOTES = [
        { topic: 'Vexillology', detail: 'Study of flags. Comes from Latin vexillum (flag carried by Roman cavalry).' },
        { topic: 'Good flag design principles (NAVA)', detail: 'Keep it simple (a child can draw from memory), use meaningful symbolism, 2-3 basic colors, no lettering or seals, be distinctive.' },
        { topic: 'Aspect ratios', detail: 'Most common: 2:3 (e.g., France, Germany). US is 1:1.9. UK is 1:2. Some unusual: Switzerland 1:1, Nepal non-rectangular.' },
        { topic: 'Charges', detail: 'Symbols added to flag (stars, crosses, animals). Heraldic vocabulary describes positioning.' },
        { topic: 'Canton', detail: 'Upper-left rectangle (about 1/4 the flag). US stars go here. Australia, NZ also use canton design.' },
        { topic: 'Field', detail: 'Background color/colors of flag.' },
        { topic: 'Hoist + fly', detail: 'Hoist = side attached to pole. Fly = opposite (free) side.' },
        { topic: 'Color symbolism (common)', detail: 'Red = courage, revolution, blood. Blue = ocean, sky, freedom. Green = land, nature, Islam. White = peace, purity. Yellow/Gold = wealth, sun.' },
        { topic: 'Distress signals', detail: 'Flying flag upside-down (where asymmetric); flying flag at half-staff = mourning.' },
        { topic: 'NATO + UN flags', detail: 'Light blue with map (UN) or compass (NATO). Intentionally avoid national/religious symbols.' }
      ];

      function renderFlagDesignSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🚩 Flag geometry'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Flags are codified geometry. Every national flag has precise specifications: aspect ratio, color codes, charge positions, star angles.'),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Selected national + organizational flags'),
            h('div', { className: 'space-y-2' },
              FLAG_GEOMETRY.map(function(f, i) {
                return h('div', { key: 'f'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                  h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                    h('span', { className: 'text-[12px] font-black text-slate-800' }, f.flag),
                    h('span', { className: 'text-[10px] text-rose-700 font-mono ml-auto px-2 py-0.5 rounded bg-rose-100' }, f.ratio)
                  ),
                  h('div', { className: 'text-[10px] text-slate-700 mb-1' }, h('strong', null, 'Features: '), f.features),
                  h('div', { className: 'text-[10px] text-slate-600 italic' }, f.notes)
                );
              })
            )
          ),
          h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Flag design principles'),
          h('div', { className: 'space-y-1' },
            FLAG_GEOMETRY_NOTES.map(function(n, i) {
              return h('div', { key: 'n'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[11px] font-black text-rose-900 mb-0.5' }, n.topic),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, n.detail)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 7 — Final angles data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var ROOF_PITCHES = [
        { name: '1:12 (flat-ish)', degrees: '4.76°', percent: '8.3%', notes: 'Membrane roofs only. Too shallow for shingles. Drainage barely works.' },
        { name: '2:12', degrees: '9.46°', percent: '16.7%', notes: 'Low-slope. Some metal + membrane. Below shingle minimum.' },
        { name: '3:12', degrees: '14.04°', percent: '25.0%', notes: 'Minimum recommended for asphalt shingles.' },
        { name: '4:12', degrees: '18.43°', percent: '33.3%', notes: 'Common modern residential pitch.' },
        { name: '5:12', degrees: '22.62°', percent: '41.7%', notes: 'Typical residential.' },
        { name: '6:12 (standard)', degrees: '26.57°', percent: '50.0%', notes: 'Very common. Good water/snow shed. Walkable with care.' },
        { name: '7:12', degrees: '30.26°', percent: '58.3%', notes: 'Steeper traditional. Requires safety gear to work on.' },
        { name: '8:12', degrees: '33.69°', percent: '66.7%', notes: 'Steep. Common in colder climates (sheds snow).' },
        { name: '9:12', degrees: '36.87°', percent: '75.0%', notes: 'Steep traditional. Cathedral ceilings.' },
        { name: '10:12', degrees: '39.81°', percent: '83.3%', notes: 'Very steep. Victorian + Tudor styles.' },
        { name: '12:12 (45°)', degrees: '45.00°', percent: '100.0%', notes: 'A-frame. Strong shedding. Distinctive look.' },
        { name: '18:12', degrees: '56.31°', percent: '150.0%', notes: 'Extreme. Some chalets + churches. Steep enough to be dangerous to work on.' },
        { name: '24:12 (steep)', degrees: '63.43°', percent: '200.0%', notes: 'Very rare in residential. Gothic + chalet styles.' }
      ];

      var RAMP_GRADES = [
        { use: 'Wheelchair (ADA standard)', grade: '1:12', degrees: '4.76°', notes: 'Max for public accessibility. 1 inch rise per 12 inches run. 30 ft ramp for 30 inches rise.' },
        { use: 'Wheelchair (preferred)', grade: '1:16-1:20', degrees: '2.86-3.58°', notes: 'Easier than 1:12. Used where space allows.' },
        { use: 'Wheelchair (max short)', grade: '1:8', degrees: '7.13°', notes: 'For very short runs only (< 3 inches rise).' },
        { use: 'Pedestrian sidewalk max', grade: '1:20', degrees: '2.86°', notes: 'No ramp considered needed below this. ADA cross-slope: max 2%.' },
        { use: 'Bike path max', grade: '5%', degrees: '2.86°', notes: 'Comfortable. 8% considered max for most cyclists.' },
        { use: 'Driveway typical', grade: '12% max', degrees: '6.84°', notes: 'Steeper risks bottoming out cars + snow problems.' },
        { use: 'Driveway max (cities allow)', grade: '20%', degrees: '11.31°', notes: 'San Francisco hills + some neighborhoods. Lillet Street ~31.5%.' },
        { use: 'Highway interstate max', grade: '6%', degrees: '3.43°', notes: 'Federal interstate standard. Mountain interstates up to 7%.' },
        { use: 'Highway secondary', grade: '7-9%', degrees: '4-5.14°', notes: 'Steeper allowed on lower-volume roads.' },
        { use: 'Railroad standard', grade: '1-2%', degrees: '0.57-1.15°', notes: 'Steel-on-steel friction is limiting factor.' },
        { use: 'Railroad mountain (max)', grade: '4-5%', degrees: '2.29-2.86°', notes: 'Special equipment or cog/rack needed for steeper.' },
        { use: 'Cog railway', grade: 'up to ~48%', degrees: '~25.6°', notes: 'Pikes Peak Cog Railway, Mount Washington Cog Railway.' },
        { use: 'Funicular', grade: 'up to ~31%', degrees: '~17.2°', notes: 'Two cars counterbalance via cable.' },
        { use: 'Loading ramp (truck)', grade: '15-30%', degrees: '8.5-16.7°', notes: 'Varies by application. Steeper = shorter but harder.' },
        { use: 'Skate ramp (mini)', grade: '~80% (38°)', degrees: '38°+', notes: 'Quarter pipes go to vertical (90°) at top.' },
        { use: 'Roller coaster max drop', grade: '~80-90°', degrees: '80-90° (some past vertical)', notes: 'Drops past 90° (overhanging): Mumbo Jumbo, Takabisha.' }
      ];

      function renderBuildingAnglesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '◢ Roof pitch + ramp grade tables'),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Roof pitches (rise:run notation)'),
            h('p', { className: 'text-[11px] text-slate-700 mb-2' }, 'X:12 means X inches rise per 12 inches of horizontal run.'),
            h('div', { className: 'overflow-x-auto' },
              h('table', { className: 'min-w-full text-[11px] border-collapse' },
                h('thead', null,
                  h('tr', { className: 'bg-slate-100' },
                    ['Pitch (X:12)', 'Angle', '% slope', 'Notes'].map(function(hh, i) {
                      return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                    })
                  )
                ),
                h('tbody', null,
                  ROOF_PITCHES.map(function(r, i) {
                    return h('tr', { key: 'r'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                      h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, r.name),
                      h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold' }, r.degrees),
                      h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, r.percent),
                      h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, r.notes)
                    );
                  })
                )
              )
            )
          ),
          h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Ramp grades + transportation slopes'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Use case', 'Grade', 'Angle', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                RAMP_GRADES.map(function(g, i) {
                  return h('tr', { key: 'g'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, g.use),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[10px]' }, g.grade),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, g.degrees),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, g.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 6 — Final dense data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var MOUNTAINS = [
        { peak: 'Mount Everest', height: '8,848.86 m', range: 'Himalaya', country: 'Nepal/China', notes: 'Highest point on Earth above sea level. Slope angles up to 60° on some sections.' },
        { peak: 'K2 (Mount Godwin-Austen)', height: '8,611 m', range: 'Karakoram', country: 'Pakistan/China', notes: 'Second highest. Much harder + more dangerous than Everest.' },
        { peak: 'Kangchenjunga', height: '8,586 m', range: 'Himalaya', country: 'Nepal/India', notes: 'Third highest. Five peaks; locals consider it sacred.' },
        { peak: 'Annapurna I', height: '8,091 m', range: 'Himalaya', country: 'Nepal', notes: 'Among the most dangerous 8000ers (~32% fatality rate).' },
        { peak: 'Aconcagua', height: '6,961 m', range: 'Andes', country: 'Argentina', notes: 'Highest outside Asia. Non-technical climb (mostly walk-up).' },
        { peak: 'Denali (Mount McKinley)', height: '6,190 m', range: 'Alaska Range', country: 'USA', notes: 'Highest in North America. Extreme cold + altitude.' },
        { peak: 'Mount Kilimanjaro', height: '5,895 m', range: 'standalone', country: 'Tanzania', notes: 'Highest in Africa. Volcanic. Glaciers receding fast.' },
        { peak: 'Mont Blanc', height: '4,808 m', range: 'Alps', country: 'France/Italy', notes: 'Highest in western Europe.' },
        { peak: 'Mount Elbrus', height: '5,642 m', range: 'Caucasus', country: 'Russia', notes: 'Highest in Europe (geographic definition varies).' },
        { peak: 'Mount Whitney', height: '4,421 m', range: 'Sierra Nevada', country: 'USA', notes: 'Highest in contiguous US. ~85 mi from Badwater (lowest in US).' },
        { peak: 'Mount Fuji', height: '3,776 m', range: 'standalone', country: 'Japan', notes: 'Iconic stratovolcano. Symmetrical slopes ~30-35°.' },
        { peak: 'Mount Olympus', height: '2,917 m', range: 'standalone', country: 'Greece', notes: 'Highest in Greece. Mythological home of Greek gods.' },
        { peak: 'Mount Etna', height: '~3,357 m (grows)', range: 'standalone', country: 'Italy (Sicily)', notes: 'Most active volcano in Europe. Frequent eruptions change height.' },
        { peak: 'Mauna Kea', height: '4,207 m (above sea); ~10,200 m from base', range: 'standalone', country: 'USA (Hawaii)', notes: 'Tallest from base. Hosts world-class observatories.' },
        { peak: 'Olympus Mons (Mars)', height: '~21,900 m', range: 'standalone', country: 'Mars', notes: 'Tallest known mountain in solar system. ~3× Everest.' }
      ];

      var PLANET_DATA = [
        { planet: 'Mercury', diameter: '4,879 km', distance: '0.39 AU', day: '58.6 Earth days', year: '88 Earth days', tilt: '0.034°', notes: 'No atmosphere. Extreme temperature swings (−180°C to +430°C).' },
        { planet: 'Venus', diameter: '12,104 km', distance: '0.72 AU', day: '243 Earth days (retrograde)', year: '225 Earth days', tilt: '177.4°', notes: 'Day longer than year. Hellish atmosphere (96% CO₂, ~92 atm, 462°C).' },
        { planet: 'Earth', diameter: '12,742 km', distance: '1.00 AU', day: '23.93 hr', year: '365.25 days', tilt: '23.44°', notes: 'Tilt causes seasons. Only known life-bearing planet.' },
        { planet: 'Mars', diameter: '6,779 km', distance: '1.52 AU', day: '24.6 hr', year: '687 Earth days', tilt: '25.19°', notes: 'Similar day length to Earth. Water ice + evidence of ancient oceans.' },
        { planet: 'Jupiter', diameter: '139,820 km', distance: '5.20 AU', day: '9.93 hr', year: '11.86 Earth years', tilt: '3.13°', notes: 'Largest planet. Could fit all other planets inside. Great Red Spot storm.' },
        { planet: 'Saturn', diameter: '116,460 km', distance: '9.58 AU', day: '10.7 hr', year: '29.4 Earth years', tilt: '26.73°', notes: 'Most famous rings. Lower density than water — would float.' },
        { planet: 'Uranus', diameter: '50,724 km', distance: '19.22 AU', day: '17.2 hr (retrograde)', year: '84 Earth years', tilt: '97.77°', notes: 'Rotates on its side. Pale blue from methane.' },
        { planet: 'Neptune', diameter: '49,244 km', distance: '30.05 AU', day: '16.1 hr', year: '165 Earth years', tilt: '28.32°', notes: 'Strongest winds in solar system (2,100 km/h). Has never completed an orbit since discovery (1846).' },
        { planet: 'Pluto (dwarf)', diameter: '2,377 km', distance: '39.5 AU avg', day: '6.4 Earth days', year: '248 Earth years', tilt: '122.5°', notes: 'Reclassified as dwarf planet (2006). Has 5 moons. Heart-shaped Tombaugh Regio.' },
        { planet: 'Moon (Earth\'s)', diameter: '3,474 km', distance: '0.0026 AU from Earth', day: '27.3 Earth days (tidally locked)', year: 'orbits Earth in 27.3 days', tilt: '6.68°', notes: 'Same face always toward Earth. Tides arise from Moon\'s gravity.' },
        { planet: 'Ceres (dwarf)', diameter: '940 km', distance: '2.77 AU', day: '9 hr', year: '4.6 Earth years', tilt: '4°', notes: 'Largest object in asteroid belt. Visited by Dawn (2015).' },
        { planet: 'Eris (dwarf)', diameter: '2,326 km', distance: '67.8 AU avg', day: '25.9 hr', year: '558 Earth years', tilt: 'unknown', notes: 'Discovery triggered Pluto demotion. Slightly more massive than Pluto.' }
      ];

      var SOLAR_SYSTEM_FACTS = [
        { fact: 'Total solar system mass', detail: 'Sun = 99.86%. Jupiter = 0.095%. Everything else = 0.045%.' },
        { fact: 'Astronomical Unit (AU)', detail: '149,597,870,700 m. Defined exactly. Light takes ~8.3 min to cross 1 AU.' },
        { fact: 'Light-year', detail: '9.461×10¹⁵ m. Distance light travels in 1 Julian year.' },
        { fact: 'Parsec', detail: '~3.26 light-years. Distance at which 1 AU subtends 1 arcsecond.' },
        { fact: 'Voyager 1 distance', detail: '~165 AU (2024). Fastest human-made object leaving solar system. Still receiving data.' },
        { fact: 'Sun mass', detail: '1.989×10³⁰ kg. ~333,000 Earth masses.' },
        { fact: 'Sun fusion', detail: '~620 million tons of H → He every second. Loses ~4 million tons as energy (E = mc²).' },
        { fact: 'Solar wind', detail: 'Stream of charged particles. ~400-800 km/s near Earth. Creates auroras + sculpts comet tails.' }
      ];

      function renderMountainsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⛰ Notable peaks + their slopes'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Peak', 'Height', 'Range', 'Country', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                MOUNTAINS.map(function(m, i) {
                  return h('tr', { key: 'm'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, m.peak),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[10px]' }, m.height),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, m.range),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, m.country),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, m.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderPlanetsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🪐 Solar system planets + dwarf planets'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Axial tilt drives seasons. Tilt > 90° means retrograde rotation (Venus, Uranus, Pluto).'),
          h('div', { className: 'overflow-x-auto mb-3' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Planet', 'Diameter', 'Distance', 'Day', 'Year', 'Tilt', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                PLANET_DATA.map(function(p, i) {
                  return h('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, p.planet),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, p.diameter),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, p.distance),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, p.day),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, p.year),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[10px]' }, p.tilt),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, p.notes)
                  );
                })
              )
            )
          ),
          h('h5', { className: 'text-[12px] font-bold text-slate-700 mb-1' }, 'Solar system facts'),
          h('div', { className: 'space-y-1' },
            SOLAR_SYSTEM_FACTS.map(function(f, i) {
              return h('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[11px] font-black text-rose-900 mb-0.5' }, f.fact),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 5 — Dense data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var GEOMETRY_PUZZLES = [
        { name: 'Königsberg bridges', description: 'Can you cross each of the 7 bridges of Königsberg exactly once?', answer: 'No. Euler proved (1736) you need each node to have even degree, except possibly 2 odd-degree nodes. Königsberg had 4 odd-degree nodes. Founded graph theory.' },
        { name: 'Squaring the circle', description: 'Using only compass + straightedge, construct a square with same area as a given circle.', answer: 'Impossible. π is transcendental (Lindemann 1882). Cannot be constructed with finite C+S operations.' },
        { name: 'Doubling the cube', description: 'Construct a cube with twice the volume of a given cube using compass + straightedge.', answer: 'Impossible. Requires ∛2, which is algebraic of degree 3, but C+S only produces 2ⁿ-degree numbers.' },
        { name: 'Trisecting an angle', description: 'Divide an arbitrary angle into 3 equal parts with compass + straightedge.', answer: 'Impossible in general. Some specific angles (e.g., 180°) can be. Origami CAN trisect arbitrary angles.' },
        { name: 'Two-circle problem', description: 'Given two circles, how do they relate?', answer: '5 cases: separate, externally tangent, intersecting (2 points), internally tangent, one inside the other.' },
        { name: 'Four color theorem', description: 'Can every planar map be colored with 4 colors so no adjacent regions share a color?', answer: 'Yes. Proven by Appel + Haken (1976) — first major theorem proved with computer assistance.' },
        { name: 'Brachistochrone', description: 'What path from A to B (B lower) minimizes time of sliding object under gravity?', answer: 'Cycloid. Posed by Bernoulli (1696). Solved by Newton overnight + by 4 others including Leibniz.' },
        { name: 'Pizza theorem', description: 'Cut a circular pizza into 8 sectors with cuts through one point (not necessarily center). Alternating pieces have equal area.', answer: 'True for any odd-multiple-of-4 sectors. Works for 8, 12, 16, ...' },
        { name: 'Mrs. Miniver problem', description: 'For what radii of intersecting circles do the moon-shape ("lune") + lens have equal area?', answer: 'Ratio depends — solved analytically. Romantic geometry from a 1942 novel.' },
        { name: 'Steinmetz solid', description: 'Intersection of two perpendicular cylinders of same radius.', answer: 'Has 4 vertices, looks like a 4-faced cushion. Volume = (16/3)r³.' },
        { name: 'Buffon\'s needle', description: 'Drop a needle of length L onto parallel lines spaced d apart. What\'s the probability it crosses a line?', answer: '2L/(πd) for L ≤ d. Method to compute π by dropping needles!' },
        { name: 'Tarski circle-squaring', description: 'Can you cut a circle into pieces + rearrange them into a square of equal area?', answer: 'Yes (Laczkovich 1990) — with ~10⁵⁰ pieces. Choice axiom required. Cannot use scissors-style cuts; pieces are bizarre.' },
        { name: 'Banach-Tarski paradox', description: 'Can you cut a ball into pieces + rearrange them into two balls of the same size?', answer: 'Yes — requires axiom of choice + non-measurable pieces. Defies intuition but mathematically valid.' },
        { name: 'Soap film minimal surface', description: 'Why do soap films take certain shapes?', answer: 'They minimize surface area. Catenoid (between rings), Plateau border (junctions). Yields beautiful geometry.' }
      ];

      var FAMOUS_TILINGS = [
        { name: 'Square tiling', detail: 'Simplest regular tiling. Schläfli symbol {4,4}.' },
        { name: 'Triangular tiling', detail: '6 triangles around each vertex. {3,6}.' },
        { name: 'Hexagonal tiling', detail: '3 hexagons around each vertex. {6,3}. Honeycomb. Most efficient.' },
        { name: 'Truncated square tiling', detail: 'Octagons + squares (4.8.8). Hispanic colonial tile patterns.' },
        { name: 'Truncated hexagonal tiling', detail: 'Dodecagons + triangles (3.12.12). Some pavements.' },
        { name: 'Snub square tiling', detail: 'Squares + triangles (3.3.4.3.4). Chiral — has handedness.' },
        { name: 'Rhombic tiling', detail: 'Just rhombi. Can be combined to make Penrose tilings.' },
        { name: 'Penrose tiling (P3)', detail: 'Two rhombi (fat + thin). Aperiodic — never repeats. 5-fold symmetry.' },
        { name: 'Penrose tiling (P2)', detail: 'Kite + dart. Aperiodic with 5-fold symmetry.' },
        { name: 'Pinwheel tiling', detail: 'Right triangles arranged in pinwheels. Aperiodic. Used in tiles at Federation Square (Melbourne).' },
        { name: '"Hat" einstein tile (2023)', detail: 'Single polygon that tiles aperiodically. Major recent discovery by Smith, Myers, Kaplan, Goodman-Strauss.' },
        { name: '"Spectre" einstein tile (2023)', detail: 'Improvement on hat — uses only direct (not reflected) tiles.' },
        { name: 'Cairo pentagonal', detail: '5-sided tiles. Found in Cairo street paving. Each tile has 4 angles of ~120° + one of 90°.' },
        { name: 'Demiregular tilings', detail: 'Use 2 vertex types. 14 distinct ones (some debate). More complex than Archimedean.' },
        { name: 'Voronoi tessellation', detail: 'Divide plane into cells closest to each "seed" point. Appears in nature (giraffe spots, foam).' },
        { name: 'Delaunay triangulation', detail: 'Triangle mesh with property that no point is inside any triangle\'s circumcircle. Dual of Voronoi.' },
        { name: '15 pentagon types', detail: '15 distinct convex pentagon shapes can tile the plane. Last one found 2015 (Mann, McLoud, Von Derau). Marjorie Rice found 4 as amateur in 1970s.' },
        { name: 'Hyperbolic {7,3} tiling', detail: 'Heptagons (impossible in Euclidean) tile hyperbolic plane with 3 around each vertex. Drawn by Escher.' },
        { name: 'Truchet tiles', detail: 'Square tiles with curves or diagonals. Random orientation → maze-like patterns.' }
      ];

      var WORLD_CITIES = [
        { city: 'Reykjavik', lat: '64.13°N', lon: '21.94°W', notes: 'Northernmost capital. Solstice extremes: ~4 hr / 21 hr daylight.' },
        { city: 'Helsinki', lat: '60.17°N', lon: '24.94°E', notes: 'Finnish capital. ~6 hr daylight in December.' },
        { city: 'Stockholm', lat: '59.33°N', lon: '18.07°E', notes: 'Swedish capital.' },
        { city: 'Moscow', lat: '55.75°N', lon: '37.62°E', notes: 'Russian capital.' },
        { city: 'London', lat: '51.51°N', lon: '0.13°W', notes: 'Near prime meridian (0°). Greenwich is in London.' },
        { city: 'Berlin', lat: '52.52°N', lon: '13.40°E', notes: 'German capital.' },
        { city: 'Paris', lat: '48.86°N', lon: '2.35°E', notes: 'French capital.' },
        { city: 'Vienna', lat: '48.21°N', lon: '16.37°E', notes: 'Austrian capital.' },
        { city: 'New York', lat: '40.71°N', lon: '74.01°W', notes: 'Same latitude as Madrid + Beijing.' },
        { city: 'Madrid', lat: '40.42°N', lon: '3.70°W', notes: 'Spanish capital.' },
        { city: 'Beijing', lat: '39.90°N', lon: '116.41°E', notes: 'Chinese capital.' },
        { city: 'Tokyo', lat: '35.68°N', lon: '139.69°E', notes: 'Japanese capital. Largest metro area.' },
        { city: 'Cairo', lat: '30.05°N', lon: '31.24°E', notes: 'Egyptian capital. On the Nile.' },
        { city: 'New Delhi', lat: '28.61°N', lon: '77.21°E', notes: 'Indian capital.' },
        { city: 'Mexico City', lat: '19.43°N', lon: '99.13°W', notes: '~2,250 m elevation.' },
        { city: 'Bangkok', lat: '13.76°N', lon: '100.50°E', notes: 'Thai capital.' },
        { city: 'Lagos', lat: '6.52°N', lon: '3.38°E', notes: 'Largest city in Africa.' },
        { city: 'Jakarta', lat: '6.21°S', lon: '106.85°E', notes: 'Indonesian capital. Sinking ~10 cm/year.' },
        { city: 'Nairobi', lat: '1.29°S', lon: '36.82°E', notes: 'Kenyan capital. Equatorial.' },
        { city: 'Singapore', lat: '1.35°N', lon: '103.82°E', notes: 'Equatorial city-state. Tropical year-round.' },
        { city: 'Quito', lat: '0.19°S', lon: '78.45°W', notes: 'Capital nearest to equator. 2,850 m elevation.' },
        { city: 'São Paulo', lat: '23.55°S', lon: '46.63°W', notes: 'Largest city in southern hemisphere.' },
        { city: 'Sydney', lat: '33.87°S', lon: '151.21°E', notes: 'Australian east coast.' },
        { city: 'Buenos Aires', lat: '34.61°S', lon: '58.38°W', notes: 'Argentine capital.' },
        { city: 'Auckland', lat: '36.85°S', lon: '174.76°E', notes: 'Largest NZ city.' },
        { city: 'Wellington', lat: '41.29°S', lon: '174.78°E', notes: 'NZ capital. Southernmost capital.' },
        { city: 'McMurdo Station', lat: '77.85°S', lon: '166.67°E', notes: 'Largest Antarctic research station.' },
        { city: 'South Pole', lat: '90.00°S', lon: 'all', notes: 'All directions are north from here. ~2,835 m elevation (on ice).' },
        { city: 'North Pole', lat: '90.00°N', lon: 'all', notes: 'All directions are south. On floating sea ice — no fixed surface.' }
      ];

      function renderPuzzlesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🧩 Famous geometry puzzles'),
          h('div', { className: 'space-y-2' },
            GEOMETRY_PUZZLES.map(function(p, i) {
              return h('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-rose-900 mb-1' }, p.name),
                h('div', { className: 'text-[11px] text-slate-700 mb-1 italic' }, p.description),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, h('strong', null, '→ '), p.answer)
              );
            })
          )
        );
      }

      function renderTessell2Section() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '◇ Famous tilings of the plane'),
          h('div', { className: 'space-y-1' },
            FAMOUS_TILINGS.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-rose-900 mb-0.5' }, t.name),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, t.detail)
              );
            })
          )
        );
      }

      function renderCitiesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌆 World city coordinates'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Latitude + longitude in decimal degrees. Lat: 0° = equator, ±90° = poles. Lon: 0° = Greenwich, ±180° = international date line area.'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['City', 'Latitude', 'Longitude', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                WORLD_CITIES.map(function(c, i) {
                  return h('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, c.city),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[10px]' }, c.lat),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[10px]' }, c.lon),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, c.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 4 — Dense reference data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var MATH_CONSTANTS = [
        { symbol: 'π (pi)', value: '3.14159265358979...', notes: 'Ratio of circle\'s circumference to diameter. Irrational + transcendental.' },
        { symbol: 'e', value: '2.71828182845904...', notes: 'Base of natural logarithm. Limit of (1 + 1/n)ⁿ as n → ∞. Irrational + transcendental.' },
        { symbol: 'φ (phi, golden ratio)', value: '1.61803398874989...', notes: '(1+√5)/2. Satisfies φ² = φ + 1.' },
        { symbol: '√2', value: '1.41421356237309...', notes: 'Pythagoras\'s diagonal of unit square. First known irrational number.' },
        { symbol: '√3', value: '1.73205080756887...', notes: 'Diagonal of unit cube face. Appears in equilateral triangle altitude.' },
        { symbol: '√5', value: '2.23606797749979...', notes: 'Diagonal of 1×2 rectangle. Component of φ.' },
        { symbol: 'γ (Euler-Mascheroni)', value: '0.57721566490153...', notes: 'Limit of (1 + 1/2 + ... + 1/n) − ln n. Unknown if irrational.' },
        { symbol: 'ln 2', value: '0.69314718055994...', notes: 'Natural log of 2. Appears in radioactive decay (half-life formula).' },
        { symbol: 'log₁₀ 2', value: '0.30102999566398...', notes: 'Doubling = ~30% extra. Useful for decibels.' },
        { symbol: 'Catalan\'s constant (G)', value: '0.91596559417721...', notes: 'Sum of (−1)ⁿ/(2n+1)². Unknown if irrational.' },
        { symbol: 'Apéry\'s constant ζ(3)', value: '1.20205690315959...', notes: 'Sum of 1/n³. Proven irrational by Apéry (1978).' },
        { symbol: 'Conway\'s constant', value: '1.30357726903429...', notes: 'Growth rate of look-and-say sequence. Algebraic of degree 71.' },
        { symbol: 'Feigenbaum δ', value: '4.66920160910299...', notes: 'Period-doubling ratio in chaos theory. Appears in many systems.' },
        { symbol: 'Planck length', value: '1.616×10⁻³⁵ m', notes: 'Smallest meaningful length in physics.' },
        { symbol: 'Avogadro number', value: '6.02214076×10²³', notes: 'Particles per mole. Exact (defined since 2019).' },
        { symbol: 'Speed of light (c)', value: '299,792,458 m/s', notes: 'Exact. Defines the meter.' },
        { symbol: 'Gravitational constant (G)', value: '6.674×10⁻¹¹ N·m²/kg²', notes: 'Force between two 1 kg masses 1 m apart: ~6.7×10⁻¹¹ N.' },
        { symbol: '180/π', value: '57.29577951308232...', notes: 'Convert radians to degrees: multiply by this.' },
        { symbol: 'π/180', value: '0.01745329251994...', notes: 'Convert degrees to radians: multiply by this.' }
      ];

      var EARTH_DATA = [
        { measurement: 'Equatorial radius', value: '6,378.137 km', notes: 'Defined by WGS84 (GPS reference).' },
        { measurement: 'Polar radius', value: '6,356.752 km', notes: 'Earth is slightly oblate (flattened at poles).' },
        { measurement: 'Mean radius', value: '6,371.0 km', notes: 'Often used for general calculations.' },
        { measurement: 'Circumference (equator)', value: '40,075 km', notes: 'Original definition of meter: 10,000 km from pole to equator (slightly off).' },
        { measurement: 'Surface area', value: '510,072,000 km²', notes: '~71% ocean, ~29% land.' },
        { measurement: 'Land area', value: '148,940,000 km²', notes: '~29.2% of surface.' },
        { measurement: 'Ocean area', value: '361,132,000 km²', notes: '~70.8% of surface.' },
        { measurement: 'Volume', value: '1.0832×10¹² km³', notes: '~1 trillion km³.' },
        { measurement: 'Mass', value: '5.972×10²⁴ kg', notes: '~6 septillion kg.' },
        { measurement: 'Density (mean)', value: '5.514 g/cm³', notes: 'Densest planet in solar system.' },
        { measurement: 'Distance to Sun (mean)', value: '149,598,023 km', notes: '1 AU (Astronomical Unit).' },
        { measurement: 'Distance to Sun (perihelion)', value: '147,098,074 km', notes: 'Closest, in early January.' },
        { measurement: 'Distance to Sun (aphelion)', value: '152,097,701 km', notes: 'Farthest, in early July.' },
        { measurement: 'Orbital period', value: '365.256 days', notes: '~1 sidereal year. Civil year = 365.25 days (with leap years).' },
        { measurement: 'Axial tilt (obliquity)', value: '23.44°', notes: 'Causes seasons. Slowly varies (22°-24.5° on ~41,000 yr cycle).' },
        { measurement: 'Rotation period (sidereal)', value: '23 h 56 min 4.1 s', notes: 'Solar day = 24 h because Earth also moves around Sun.' },
        { measurement: 'Highest point (Everest)', value: '8,848.86 m above sea level', notes: 'But Mount Chimborazo is the farthest from Earth\'s center (because of equatorial bulge).' },
        { measurement: 'Lowest point (Challenger Deep)', value: '−10,935 m below sea level', notes: 'Mariana Trench. Pressure ~1,086 atm.' },
        { measurement: 'Highest altitude human (ISS)', value: '~400 km (low Earth orbit)', notes: 'Inhabited continuously since November 2000.' },
        { measurement: 'Atmosphere mass', value: '5.15×10¹⁸ kg', notes: '~1 millionth of Earth\'s mass.' },
        { measurement: 'Magnetic field (surface)', value: '~25-65 μT', notes: 'Strongest near poles. Flips periodically (last ~780,000 yr ago).' }
      ];

      var FAMOUS_BUILDINGS = [
        { building: 'Great Pyramid of Giza', height: '146.6 m original / 138.8 m today', built: '~2560 BCE', angles: 'Slope 51.84° (each face)', notes: 'Tallest human structure for 3,800+ years. Base ratio surprisingly close to 2π.' },
        { building: 'Eiffel Tower', height: '330 m', built: '1889', angles: 'Legs 54° from horizontal', notes: 'Was tallest in world until 1930 (Chrysler Building).' },
        { building: 'Sydney Opera House', height: '65 m', built: '1973', angles: 'Sails are sections of a sphere', notes: 'Iconic curves are spherical-segment shells.' },
        { building: 'Burj Khalifa', height: '828 m', built: '2010', angles: 'Tapers in three Y-arms', notes: 'Tallest building in the world. Y-shape minimizes wind load.' },
        { building: 'Taipei 101', height: '508 m', built: '2004', angles: '8-tier pagoda inspired', notes: 'Tuned mass damper (660-ton sphere) at top counters wind sway.' },
        { building: 'CN Tower', height: '553 m', built: '1976', angles: 'Tapering cylinder', notes: 'Tallest free-standing structure 1976-2007.' },
        { building: 'Hagia Sophia', height: '55 m to top of dome', built: '537 CE', angles: 'Pendentive dome', notes: 'Innovation: pendentives transfer dome weight to 4 piers, allowing large dome on square base.' },
        { building: 'Pantheon (Rome)', height: '43.3 m dome', built: '126 CE', angles: 'Hemisphere = perfect dome', notes: 'Largest unreinforced concrete dome in the world. Oculus 8.7 m wide at top.' },
        { building: 'Notre Dame (Paris)', height: '69 m (towers) / 96 m (spire pre-2019)', built: '1163-1345', angles: 'Pointed Gothic arches', notes: 'Flying buttresses transfer roof loads outward. Spire collapsed in 2019 fire.' },
        { building: 'Leaning Tower of Pisa', height: '57 m', built: '1372', angles: 'Currently leans ~3.97°', notes: 'Was up to 5.5° before 1990s stabilization.' },
        { building: 'Empire State Building', height: '443 m', built: '1931', angles: 'Setback design (zoning law)', notes: 'Setbacks were required by NYC zoning to allow sunlight to reach streets.' },
        { building: 'Sears (Willis) Tower', height: '527 m', built: '1973', angles: '9 bundled tubes', notes: 'Tube structure invented by Fazlur Khan revolutionized tall building design.' },
        { building: 'St. Louis Gateway Arch', height: '192 m', built: '1965', angles: 'Catenary curve', notes: 'Mathematical curve assumed by hanging chain. Inverted = stable arch.' },
        { building: 'Stonehenge', height: 'Up to 7.3 m', built: '~3000-1500 BCE', angles: 'Solstice alignments', notes: 'Heel Stone aligns with summer solstice sunrise.' },
        { building: 'Great Wall of China', length: '~21,000 km total', built: '7th c. BCE - 17th c. CE', angles: 'Follows terrain', notes: 'Different dynasties built different sections. Most surviving sections are Ming dynasty.' }
      ];

      var FAMOUS_CURVES = [
        { name: 'Circle', equation: 'x² + y² = r²', notes: 'All points equidistant from center.' },
        { name: 'Ellipse', equation: 'x²/a² + y²/b² = 1', notes: 'Sum of distances to two foci is constant. Planetary orbits.' },
        { name: 'Parabola', equation: 'y = ax²', notes: 'All points equidistant from focus + directrix.' },
        { name: 'Hyperbola', equation: 'x²/a² − y²/b² = 1', notes: 'Difference of distances to two foci is constant.' },
        { name: 'Logarithmic spiral', equation: 'r = a·e^(bθ)', notes: 'Constant angle between radius + tangent. Nautilus shells, galaxies.' },
        { name: 'Archimedean spiral', equation: 'r = a + bθ', notes: 'Equal spacing between coils. Vinyl records, springs.' },
        { name: 'Catenary', equation: 'y = a·cosh(x/a)', notes: 'Shape of hanging chain. Different from parabola.' },
        { name: 'Brachistochrone (cycloid)', equation: 'parametric: x = r(t − sin t), y = r(1 − cos t)', notes: 'Curve of fastest descent under gravity. Found by Bernoulli (1696).' },
        { name: 'Tractrix', equation: 'parametric', notes: '"Dog curve" — path of object dragged behind moving point.' },
        { name: 'Lissajous figures', equation: 'parametric sin/cos', notes: 'Closed curves from perpendicular oscillations at different frequencies. Oscilloscope art.' },
        { name: 'Helix', equation: '3D parametric', notes: 'DNA backbone. Springs. Screw threads.' },
        { name: 'Sine wave', equation: 'y = A sin(ωt + φ)', notes: 'Fundamental oscillation. Most natural-sounding tone.' },
        { name: 'Cosine wave', equation: 'y = A cos(ωt + φ)', notes: 'Same as sine but 90° phase shifted.' },
        { name: 'Bell curve (Gaussian)', equation: 'y = e^(−x²)', notes: 'Normal distribution shape.' },
        { name: 'Heart curve (cardioid)', equation: 'r = a(1 + cos θ)', notes: 'Heart shape. Apple\'s logo + valentine.' },
        { name: 'Trefoil knot', equation: '3D parametric', notes: 'Simplest nontrivial mathematical knot.' },
        { name: 'Möbius strip', equation: 'Boundary parametric', notes: 'One-sided surface. Cut down middle → longer single loop.' },
        { name: 'Klein bottle', equation: '4D — no inside/outside', notes: 'Non-orientable surface. Can be made in 3D only with self-intersection.' }
      ];

      var GREAT_MATHEMATICIANS = [
        { name: 'Pythagoras', year: '~570-495 BCE', contrib: 'Pythagorean theorem. Founded mystical mathematical brotherhood. May not have personally proved the theorem named for him.' },
        { name: 'Euclid', year: '~325-265 BCE', contrib: '"Elements" — 13 books axiomatizing geometry. Most influential math textbook ever.' },
        { name: 'Archimedes', year: '~287-212 BCE', contrib: 'Pi to several digits. Lever, screw, war machines. "Eureka!" displacement principle.' },
        { name: 'Hypatia', year: '~370-415 CE', contrib: 'Alexandrian mathematician + astronomer + philosopher. One of first known female mathematicians.' },
        { name: 'al-Khwarizmi', year: '~780-850', contrib: 'Founded algebra ("al-jabr"). "Algorithm" comes from his Latinized name.' },
        { name: 'Fibonacci (Leonardo of Pisa)', year: '~1170-1250', contrib: 'Introduced Hindu-Arabic numerals to Europe. Fibonacci sequence (from a rabbit-population problem).' },
        { name: 'René Descartes', year: '1596-1650', contrib: 'Analytic geometry (Cartesian coordinates linking algebra to geometry). "I think, therefore I am."' },
        { name: 'Pierre de Fermat', year: '1601-1665', contrib: 'Number theory. Famous Last Theorem (unproved for 358 years!). Probability with Pascal.' },
        { name: 'Blaise Pascal', year: '1623-1662', contrib: 'Probability theory. Pascal\'s triangle. Mechanical calculator. Pascal\'s wager.' },
        { name: 'Isaac Newton', year: '1643-1727', contrib: 'Calculus (independent of Leibniz). Laws of motion + gravitation. Optics.' },
        { name: 'Gottfried Leibniz', year: '1646-1716', contrib: 'Calculus (with modern notation). Binary number system. Concept of momentum.' },
        { name: 'Leonhard Euler', year: '1707-1783', contrib: 'Most prolific mathematician ever. Notation (f(x), e, i, π, Σ, sin, cos). Euler\'s identity e^(iπ) + 1 = 0.' },
        { name: 'Carl Friedrich Gauss', year: '1777-1855', contrib: 'Prince of mathematicians. Number theory, statistics, geometry, electromagnetism, geodesy.' },
        { name: 'Évariste Galois', year: '1811-1832', contrib: 'Founded group theory + Galois theory. Wrote his theories the night before dying in a duel at age 20.' },
        { name: 'Bernhard Riemann', year: '1826-1866', contrib: 'Riemann sums (integration). Riemann hypothesis ($1M Millennium Prize). Curved geometry (basis of relativity).' },
        { name: 'Sofia Kovalevskaya', year: '1850-1891', contrib: 'First woman to earn a doctorate in mathematics. Partial differential equations. Rotation of bodies.' },
        { name: 'Georg Cantor', year: '1845-1918', contrib: 'Set theory. Different sizes of infinity. Diagonal argument.' },
        { name: 'Henri Poincaré', year: '1854-1912', contrib: 'Topology founder. Chaos theory (three-body problem). Poincaré conjecture (solved 2003 by Perelman).' },
        { name: 'David Hilbert', year: '1862-1943', contrib: 'Hilbert\'s 23 problems shaped 20th c math. Foundations of mathematics. Quantum mechanics.' },
        { name: 'Emmy Noether', year: '1882-1935', contrib: 'Abstract algebra. Noether\'s theorem (every symmetry → conservation law) — foundational in physics.' },
        { name: 'Srinivasa Ramanujan', year: '1887-1920', contrib: 'Self-taught Indian genius. Discovered thousands of identities, many proved decades later. Died at 32.' },
        { name: 'Alan Turing', year: '1912-1954', contrib: 'Theoretical computer science. Turing machine, Turing test. Broke Enigma in WWII.' },
        { name: 'John von Neumann', year: '1903-1957', contrib: 'Game theory, computer architecture (von Neumann architecture). Manhattan Project. Quantum mechanics formalism.' },
        { name: 'Paul Erdős', year: '1913-1996', contrib: 'Most prolific 20th c mathematician (~1500 papers). Itinerant life. Erdős number = collaboration distance to him.' },
        { name: 'Andrew Wiles', year: '1953-', contrib: 'Proved Fermat\'s Last Theorem (1994), 358 years after Fermat\'s famous margin.' },
        { name: 'Maryam Mirzakhani', year: '1977-2017', contrib: 'First woman to win Fields Medal (2014). Riemann surfaces + their moduli. Died at 40 of cancer.' }
      ];

      var PRACTICAL_ANGLES = [
        { context: 'Ramp accessibility (ADA)', angle: '≤ 4.76° (1:12 slope)', notes: 'US ADA standard. 1 inch rise per 12 inches run.' },
        { context: 'Wheelchair ramp residential', angle: '≤ 2.86° (1:20)', notes: 'Recommended where space allows. Easier than 1:12.' },
        { context: 'Stair rise/run (US)', angle: '~30-37°', notes: 'Typical: 7" rise, 11" run → ~32.5°. IRC code: max 7¾" rise.' },
        { context: 'Roof pitch (residential)', angle: '14° (3:12) to 45° (12:12)', notes: 'Steeper = sheds water/snow faster, more usable attic. Lower = easier installation.' },
        { context: 'Solar panel tilt (mid-latitude)', angle: '≈ latitude (±15° seasonal)', notes: 'Maximize annual energy. Adjustable mounts swap winter (steeper) vs summer (shallower).' },
        { context: 'Highway curve banking', angle: '~3-10°', notes: 'Tilt provides centripetal force assistance at design speed.' },
        { context: 'Highway max grade', angle: '~3-6° (5-10%)', notes: 'Interstate standard. Mountain roads up to ~7%.' },
        { context: 'Railroad max grade', angle: '~1-2%', notes: 'Steel-on-steel limits traction. Cog/rack railways for steeper.' },
        { context: 'Driveway max', angle: '~12% (~7°)', notes: 'Steeper risks scraping car undersides + bad in snow.' },
        { context: 'Earth\'s axial tilt', angle: '23.5°', notes: 'Causes seasons.' },
        { context: 'Sun at zenith (equator equinox)', angle: '90° altitude', notes: 'Directly overhead.' },
        { context: 'Highway sight line', angle: 'depends on speed', notes: 'AASHTO formulas. Decision sight distance grows with speed.' },
        { context: 'Drone gimbal compensation', angle: 'continuous', notes: 'IMU-stabilized camera gimbal keeps shot level.' },
        { context: 'Eye HFOV (binocular)', angle: '~120°', notes: 'Total horizontal visual field with both eyes.' },
        { context: 'Eye HFOV (each)', angle: '~150-200°', notes: 'Includes far peripheral. Stereopsis only ~120° overlap.' },
        { context: 'Camera FOV (50mm lens, 35mm full-frame)', angle: '~46° diagonal', notes: '"Normal" lens — close to human comfortable view.' },
        { context: 'Wide-angle (24mm)', angle: '~84° diagonal', notes: 'Landscape, architecture.' },
        { context: 'Fisheye (8mm)', angle: '~180° diagonal', notes: 'Distorted, hemispheric view.' },
        { context: 'Telephoto (200mm)', angle: '~12° diagonal', notes: 'Wildlife, sports.' },
        { context: 'TV viewing optimum', angle: '~30° horizontal FOV', notes: 'THX recommends. Higher (~40°) for more cinematic.' }
      ];

      function renderConstantsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, 'π Mathematical + physical constants'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Symbol', 'Value', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                MATH_CONSTANTS.map(function(c, i) {
                  return h('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-mono font-black text-rose-700' }, c.symbol),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[10px]' }, c.value),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, c.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderRiversSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌎 Earth measurements'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Measurement', 'Value', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                EARTH_DATA.map(function(e, i) {
                  return h('tr', { key: 'e'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, e.measurement),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[10px]' }, e.value),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, e.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderBuildingsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🏛 Famous structures + their angles'),
          h('div', { className: 'space-y-2' },
            FAMOUS_BUILDINGS.map(function(b, i) {
              return h('div', { key: 'b'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, b.building),
                  h('span', { className: 'text-[10px] text-rose-700 font-mono ml-auto px-2 py-0.5 rounded bg-rose-100' }, b.height)
                ),
                h('div', { className: 'flex items-baseline gap-3 text-[10px] mb-1 flex-wrap' },
                  h('span', { className: 'font-mono text-slate-600' }, 'Built: ' + b.built),
                  h('span', { className: 'font-mono text-rose-700 font-bold' }, b.angles)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, b.notes)
              );
            })
          )
        );
      }

      function renderCurvesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '∿ Famous mathematical curves'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Curve', 'Equation', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                FAMOUS_CURVES.map(function(c, i) {
                  return h('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, c.name),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[10px]' }, c.equation),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, c.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderMathematiciansSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '👨‍🏫 Great mathematicians'),
          h('div', { className: 'space-y-2' },
            GREAT_MATHEMATICIANS.map(function(m, i) {
              return h('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-0.5 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-rose-900' }, m.name),
                  h('span', { className: 'text-[10px] font-mono text-slate-500 ml-auto' }, m.year)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, m.contrib)
              );
            })
          )
        );
      }

      function renderPracticalSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🛠 Practical angle standards'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Context', 'Angle', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                PRACTICAL_ANGLES.map(function(p, i) {
                  return h('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, p.context),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold text-[10px]' }, p.angle),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, p.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 3 EXPANSION (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var CONIC_SECTIONS = [
        { name: 'Circle', eccentricity: 'e = 0', equation: 'x² + y² = r²', cut: 'Plane perpendicular to cone axis', use: 'Wheels, gears, orbits (almost — most planetary orbits are slightly elliptical).' },
        { name: 'Ellipse', eccentricity: '0 < e < 1', equation: 'x²/a² + y²/b² = 1', cut: 'Oblique plane through cone (both nappes uncut)', use: 'Planetary orbits (Kepler\'s 1st law). Whispering galleries (St. Paul\'s Cathedral).' },
        { name: 'Parabola', eccentricity: 'e = 1', equation: 'y² = 4ax', cut: 'Plane parallel to cone\'s slant side', use: 'Satellite dishes (parallel rays focus to one point). Projectile motion (in vacuum). Suspension bridge cables.' },
        { name: 'Hyperbola', eccentricity: 'e > 1', equation: 'x²/a² − y²/b² = 1', cut: 'Plane parallel to axis (cuts both nappes)', use: 'Sundials. Hyperbolic mirrors. Comet orbits (some). Long-baseline navigation (LORAN).' },
        { name: 'Degenerate (point)', eccentricity: '—', equation: 'x² + y² = 0', cut: 'Plane through apex perpendicular to axis', use: '—' },
        { name: 'Degenerate (line)', eccentricity: '—', equation: 'y² = 0 (and y = 0)', cut: 'Plane through apex along slant', use: '—' },
        { name: 'Degenerate (two lines)', eccentricity: '—', equation: 'x² − y² = 0', cut: 'Plane through apex through both nappes', use: '—' }
      ];

      var PLATONIC_SOLIDS = [
        { name: 'Tetrahedron', faces: '4 triangles', vertices: 4, edges: 6, dual: 'self-dual', notes: 'Simplest 3D shape. Vertex angle ~70.5°.' },
        { name: 'Cube (hexahedron)', faces: '6 squares', vertices: 8, edges: 12, dual: 'octahedron', notes: 'Most familiar. All angles 90°.' },
        { name: 'Octahedron', faces: '8 triangles', vertices: 6, edges: 12, dual: 'cube', notes: 'Diamond crystals. Two pyramids base-to-base.' },
        { name: 'Dodecahedron', faces: '12 pentagons', vertices: 20, edges: 30, dual: 'icosahedron', notes: 'Plato associated with "the heavens" (5th element).' },
        { name: 'Icosahedron', faces: '20 triangles', vertices: 12, edges: 30, dual: 'dodecahedron', notes: 'Most spherelike Platonic solid. D20 die in tabletop games.' }
      ];

      var PLATONIC_NOTES = [
        { note: 'Why only 5?', detail: 'At each vertex, you need 3+ polygons whose angle sum is < 360° (else flat or impossible). Only 5 combinations work for regular polygons.' },
        { note: 'Euler\'s formula', detail: 'V − E + F = 2 holds for every convex polyhedron (including all 5 Platonic solids).' },
        { note: 'Duality', detail: 'Connecting face centers of a Platonic solid gives its "dual". Cube ↔ octahedron; dodecahedron ↔ icosahedron; tetrahedron ↔ itself.' },
        { note: 'Archimedean solids', detail: '13 semi-regular solids — same arrangement at each vertex, but multiple polygon types. Includes truncated icosahedron (soccer ball pattern).' },
        { note: 'Kepler-Poinsot polyhedra', detail: '4 regular star polyhedra with pentagram faces or vertices. Non-convex.' }
      ];

      var FRACTAL_NOTES = [
        { name: 'Koch snowflake', detail: 'Start with triangle. On each side, replace middle third with two sides of a smaller triangle. Repeat. Infinite perimeter, finite area.' },
        { name: 'Sierpinski triangle', detail: 'Start with triangle. Remove middle (smaller) triangle. Repeat on each remaining triangle. Hausdorff dimension log(3)/log(2) ≈ 1.585.' },
        { name: 'Cantor set', detail: 'Remove middle third of segment. Repeat on each remaining segment. Uncountably infinite but total length zero.' },
        { name: 'Mandelbrot set', detail: 'Points c where iterating z = z² + c stays bounded. Infinite detail at any zoom. Discovered 1980.' },
        { name: 'Julia set', detail: 'For each c, points z where iterating z = z² + c stays bounded. Each c gives a different Julia set; together they tile the Mandelbrot set.' },
        { name: 'Dragon curve', detail: 'Fold a strip of paper in half repeatedly; unfold each fold at 90°. Or recursive replacement of segments.' },
        { name: 'Barnsley fern', detail: 'Iterated function system. Random selection of 4 affine maps produces a fern shape.' },
        { name: 'Hausdorff dimension', detail: 'Fractional dimension. Coastline ~1.2-1.3 depending on country. Captures "roughness" beyond integer dimensions.' },
        { name: 'Self-similarity', detail: 'Defining property. Strict self-similarity (Koch) or statistical (coastlines).' },
        { name: 'Real-world fractals', detail: 'Coastlines, trees, lungs (bronchi), blood vessels, river networks, mountain ranges, clouds, lightning.' }
      ];

      var NONEUCLID_FACTS = [
        { topic: 'Euclidean geometry', detail: 'Flat plane. Parallel postulate holds. Angles in triangle sum to exactly 180°.' },
        { topic: 'Spherical geometry', detail: 'Surface of sphere. Triangle angles sum to MORE than 180°. Excess proportional to area. Used in navigation.' },
        { topic: 'Hyperbolic geometry', detail: 'Saddle-shaped surface. Triangle angles sum to LESS than 180°. Many parallels through a point not on a line.' },
        { topic: 'Geodesics', detail: 'Shortest paths on a surface. Straight lines (Euclidean); great circles (sphere); hyperbolic lines.' },
        { topic: 'Great circles', detail: 'Largest circles on a sphere. Equator + meridians. Plane flights follow great-circle paths.' },
        { topic: 'Curvature', detail: 'Euclidean = 0. Spherical = positive. Hyperbolic = negative. Curvature determines geometry.' },
        { topic: 'Sum of angles excess', detail: 'On sphere of radius R, triangle area = R² × (angle sum − π).' },
        { topic: 'Real-world spherical: GPS', detail: 'Positions on Earth\'s surface use spherical (or more precisely, ellipsoidal) geometry.' },
        { topic: 'Real-world spherical: airplane routes', detail: 'NYC to Tokyo is shortest via the Arctic, not straight east — that\'s the great circle.' },
        { topic: 'General relativity', detail: 'Spacetime is curved by mass-energy. Geodesics through curved spacetime ARE the paths of free-falling objects.' }
      ];

      var MAP_PROJECTIONS = [
        { name: 'Mercator', preserves: 'Angles (conformal)', distorts: 'Areas (massively near poles)', use: 'Marine navigation — straight lines on map = constant compass bearing.' },
        { name: 'Gall-Peters', preserves: 'Areas', distorts: 'Shapes (elongated)', use: 'Equal-area focus. Used to challenge Mercator\'s "Europe is bigger" distortion.' },
        { name: 'Robinson', preserves: 'Neither perfectly', distorts: 'Some of both', use: 'Compromise. National Geographic used 1988-1998.' },
        { name: 'Winkel tripel', preserves: 'Neither perfectly', distorts: 'Minimizes total', use: 'National Geographic since 1998.' },
        { name: 'Mollweide', preserves: 'Areas', distorts: 'Shapes near edges', use: 'Equal-area. Used for global thematic maps.' },
        { name: 'Sinusoidal', preserves: 'Areas, distances along equator + meridians', distorts: 'Shapes', use: 'Old projection. Variant: interrupted to reduce distortion.' },
        { name: 'Albers conic', preserves: 'Areas', distorts: 'Shapes', use: 'Conic projection. Common for continental US maps.' },
        { name: 'Lambert conformal conic', preserves: 'Angles + shapes (locally)', distorts: 'Areas', use: 'Aeronautical charts. FAA sectionals.' },
        { name: 'Azimuthal equidistant', preserves: 'Distances from center point', distorts: 'Areas + shapes far from center', use: 'UN logo. Useful for showing distances + bearings from one location.' },
        { name: 'Goode\'s homolosine', preserves: 'Areas', distorts: 'Splits continents', use: 'Interrupted to keep continent shapes accurate.' }
      ];

      var SUNDIAL_NOTES = [
        { topic: 'How they work', detail: 'A vertical or angled "gnomon" casts a shadow. As Earth rotates, shadow moves across markings.' },
        { topic: 'Gnomon angle', detail: 'For accuracy, gnomon must be parallel to Earth\'s axis — angle to horizontal = local latitude.' },
        { topic: 'Equatorial sundial', detail: 'Dial plate perpendicular to gnomon (parallel to equator). Hour lines evenly spaced 15° apart.' },
        { topic: 'Horizontal sundial', detail: 'Dial plate parallel to ground. Hour lines NOT evenly spaced — formula: tan(hour line angle) = sin(latitude) × tan(hour angle).' },
        { topic: 'Vertical sundial', detail: 'Dial on a wall. Hour lines depend on wall\'s azimuth + latitude.' },
        { topic: 'Equation of time', detail: 'Sundial time differs from clock time by up to ~16 minutes through the year. Due to Earth\'s elliptical orbit + axial tilt.' },
        { topic: 'Analemma', detail: 'Figure-8 trace of sun\'s position at same clock time each day for a year. Shown on some advanced sundials.' },
        { topic: 'Time zones complication', detail: 'Sundial shows LOCAL apparent solar time. Differs from civil time by longitude offset within timezone + DST.' },
        { topic: 'Heliochronometer', detail: 'Very precise sundials with corrections for equation of time + longitude. Accurate to seconds.' }
      ];

      var GOLDEN_RATIO = [
        { fact: 'Value', detail: 'φ (phi) ≈ 1.61803398874989... Irrational. Roots of x² = x + 1.' },
        { fact: 'Algebraic definition', detail: 'A line divided so that whole : larger = larger : smaller. (a+b)/a = a/b = φ.' },
        { fact: 'Fibonacci connection', detail: 'Ratio of consecutive Fibonacci numbers approaches φ: 1, 1, 2, 3, 5, 8, 13, 21 → 21/13 ≈ 1.615.' },
        { fact: 'Golden rectangle', detail: 'Long side / short side = φ. Remove a square → remaining rectangle is also golden.' },
        { fact: 'Golden spiral', detail: 'Logarithmic spiral with growth factor φ per quarter turn. Approximated by Fibonacci squares + arcs.' },
        { fact: 'Pentagram', detail: 'Ratios of pentagram diagonals to sides = φ. Pythagoras knew this.' },
        { fact: 'In nature', detail: 'Spiral arrangements in sunflowers, pinecones, nautilus shells. Reflects optimal packing for growing meristems.' },
        { fact: 'In art (overstated)', detail: 'Often claimed in Parthenon, Mona Lisa, etc. — most claims unsupported. Real golden ratio art: 20th-century deliberate use (Le Corbusier, Dali).' },
        { fact: '"Aesthetic" claim', detail: 'Long believed humans find golden ratio most beautiful. Robust evidence weaker than popular accounts suggest.' },
        { fact: 'Continued fraction', detail: 'φ = 1 + 1/(1 + 1/(1 + 1/(...))). Most irrational number — slowest converging continued fraction.' }
      ];

      var ORIGAMI_FACTS = [
        { fact: 'Mathematical origami', detail: 'Active research area. Can solve cubic equations (impossible with compass + straightedge alone). Connect to algebra.' },
        { fact: 'Maekawa\'s theorem', detail: 'At any flat-foldable vertex, |# mountain folds − # valley folds| = 2.' },
        { fact: 'Kawasaki\'s theorem', detail: 'At a flat-foldable vertex, alternating angles around the vertex sum to 180°.' },
        { fact: '7-fold limit (paper)', detail: 'Standard paper can be folded in half ~7 times. Each fold doubles thickness. After 7, paper is too stiff. Record (with special equipment + huge paper): 12 folds.' },
        { fact: 'Crease pattern → 3D', detail: 'Flat sheet can fold into virtually any 3D shape with enough creases. Modern origami extremely complex.' },
        { fact: 'Real-world: space telescopes', detail: 'James Webb Space Telescope sunshield folded for launch (origami principles), unfolded in space.' },
        { fact: 'Real-world: airbags', detail: 'Folded efficiently to fit in compartment, unfold rapidly.' },
        { fact: 'Real-world: stents', detail: 'Origami-inspired medical stents fold tiny for insertion, expand in artery.' },
        { fact: 'Miura fold', detail: 'Parallelogram-based fold lets large surface (solar panel) deploy from compact bundle via single pull.' },
        { fact: 'Kirigami', detail: 'Cuts allowed in addition to folds. Used for pop-up books + scientific structures.' }
      ];

      var SPORTS_ANGLES = [
        { sport: 'Basketball shot arc', angle: 'Optimal launch: ~45-52° above horizontal', notes: 'Higher arc = more forgiving on rim — but harder to control distance.' },
        { sport: 'Soccer free kick', angle: 'Optimal launch: ~20-30°', notes: 'Trade-off between hang time + speed past defenders.' },
        { sport: 'Long jump', angle: 'Optimal launch: ~21-23° (NOT 45°)', notes: 'Launch height higher than landing height; biomechanical limits reduce optimum.' },
        { sport: 'Shot put', angle: '~38°', notes: 'Less than 45° because release height > landing height.' },
        { sport: 'Javelin', angle: '~30-36°', notes: 'Aerodynamic lift makes optimum less than ballistic 45°.' },
        { sport: 'Discus', angle: '~33-38°', notes: 'Like javelin, aerodynamic lift matters.' },
        { sport: 'Golf', angle: 'Driver loft ~9-12°, wedge ~52-60°', notes: 'Higher loft = higher trajectory + more spin = less distance.' },
        { sport: 'Pool / billiards', angle: 'Cushion angles: angle in = angle out (with English/spin modifying)', notes: 'Pure geometry, plus spin (English) for control.' },
        { sport: 'Tennis serve', angle: 'Toss angle, racket angle, ball spin', notes: 'Topspin curves ball down (allows hard hit landing in court).' },
        { sport: 'Skiing tilt', angle: 'Edge angle controls carve radius', notes: 'Higher edge angle = tighter turn. Ski sidecut + tilt define carve.' },
        { sport: 'Pole vault', angle: 'Pole plant ~85-90°, take-off angle', notes: 'Plant pole nearly vertical to convert horizontal speed to height.' },
        { sport: 'Ski jumping', angle: 'In-run, take-off ~10-11° down, hill ~36-37°', notes: 'Jumpers angle bodies into V-shape for aerodynamic lift.' }
      ];

      var ART_ANGLES = [
        { topic: 'Linear perspective', detail: 'Parallel lines converge to vanishing points. 1-point (looking down a road), 2-point (corner of building), 3-point (looking up at a tower).' },
        { topic: 'Vanishing point', detail: 'Where parallel lines appear to meet on horizon. Determined by viewer\'s position + line direction.' },
        { topic: 'Eye level / horizon', detail: 'Horizontal line at viewer\'s eye height. All vanishing points lie on it (for lines parallel to ground).' },
        { topic: 'Foreshortening', detail: 'Objects pointing at viewer appear compressed. Drawing a hand pointed at viewer = challenge.' },
        { topic: 'Rule of thirds', detail: 'Divide canvas/photo into 9 equal sections. Place subjects on intersections for dynamic composition.' },
        { topic: 'Dutch angle (camera tilt)', detail: 'Camera tilted off-horizontal creates unease, instability, dynamism.' },
        { topic: 'Angle of light', detail: 'Sun angle determines shadow length + direction. Low angle (golden hour) = long shadows + warm color.' },
        { topic: 'Renaissance perspective', detail: 'Brunelleschi (~1413) demonstrated mathematical linear perspective. Alberti formalized it (1435).' },
        { topic: 'Atmospheric perspective', detail: 'Distant objects appear bluer + less distinct due to atmospheric scattering.' },
        { topic: 'Sacred geometry in art', detail: 'Some traditions use specific angles + ratios (Islamic geometric patterns, Indian mandalas, gothic cathedrals).' },
        { topic: 'M.C. Escher', detail: 'Mathematical artist. Impossible objects (Penrose triangles), tessellations, hyperbolic geometry.' },
        { topic: 'Origami art', detail: 'Folding angles + crease patterns produce 3D sculptures from flat paper.' }
      ];

      var MEASURING_TOOLS = [
        { tool: 'Protractor', use: 'Measure or draw angles 0-180° (semicircle) or 0-360° (full).', notes: 'Standard school tool.' },
        { tool: 'Theodolite', use: 'Surveying. Horizontal + vertical angles with high precision.', notes: 'Telescope on calibrated rotating mounts.' },
        { tool: 'Total station', use: 'Modern survey instrument. Theodolite + electronic distance measurement.', notes: 'Computes 3D coordinates directly.' },
        { tool: 'Sextant', use: 'Marine navigation. Measure angle between horizon + celestial body.', notes: 'Determines latitude. Brought maritime navigation to high accuracy.' },
        { tool: 'Inclinometer', use: 'Measure tilt or slope from horizontal.', notes: 'Smartphone has one (accelerometer-based level app).' },
        { tool: 'Compass (drawing)', use: 'Draw circles + arcs.', notes: 'Two-legged. Holds pencil at fixed distance from pivot.' },
        { tool: 'Set square (triangle)', use: 'Draw specific angles: 45°-45°-90° or 30°-60°-90°.', notes: 'Combine with T-square for parallel lines.' },
        { tool: 'Speed square (carpentry)', use: 'Mark right angles, 45° angles, roof pitches.', notes: 'Triangular metal/plastic. Lots of built-in markings.' },
        { tool: 'Bevel gauge', use: 'Transfer angles between locations.', notes: 'Adjustable, locks at any angle.' },
        { tool: 'Goniometer', use: 'Measure joint angles in physical therapy.', notes: 'Specialized for human body movement.' },
        { tool: 'Sundial (gnomon)', use: 'Tells time from shadow angle.', notes: 'Ancient. Still works without batteries.' },
        { tool: 'Plumb bob', use: 'Establishes vertical (90° from level ground).', notes: 'String + weight. Gravity does the work.' },
        { tool: 'Spirit level', use: 'Establishes horizontal (90° from gravity).', notes: 'Bubble in liquid-filled tube. Modern versions have laser variants.' },
        { tool: 'Smartphone (sensors)', use: 'Apps use accelerometer + gyroscope for tilt + heading.', notes: 'Many free angle-measuring apps.' }
      ];

      function renderConicsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '◉ Conic sections'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Curves formed when a plane intersects a (double) cone. The angle of the plane to the cone\'s axis determines the curve type.'),
          h('div', { className: 'space-y-2' },
            CONIC_SECTIONS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, c.name),
                  h('span', { className: 'text-[10px] font-mono text-rose-700 ml-auto px-2 py-0.5 rounded bg-rose-100' }, c.eccentricity)
                ),
                h('div', { className: 'text-[11px] font-mono text-rose-700 font-bold mb-1' }, c.equation),
                h('div', { className: 'text-[11px] text-slate-700 mb-1' }, h('strong', null, 'Cut: '), c.cut),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, c.use)
              );
            })
          )
        );
      }

      function renderPlatonicSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⬡ Platonic solids'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'The only 5 convex regular polyhedra. All faces are congruent regular polygons, same number meeting at each vertex.'),
          h('div', { className: 'overflow-x-auto mb-3' },
            h('table', { className: 'min-w-full text-[11px] border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Name', 'Faces', 'V', 'E', 'Dual', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                PLATONIC_SOLIDS.map(function(p, i) {
                  return h('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold text-slate-800' }, p.name),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, p.faces),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold' }, p.vertices),
                    h('td', { className: 'px-2 py-1 font-mono text-rose-700 font-bold' }, p.edges),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[10px]' }, p.dual),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[10px] italic' }, p.notes)
                  );
                })
              )
            )
          ),
          h('div', { className: 'space-y-1' },
            PLATONIC_NOTES.map(function(n, i) {
              return h('div', { key: 'n'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[11px] font-black text-rose-900 mb-0.5' }, n.note),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, n.detail)
              );
            })
          )
        );
      }

      function renderFractalsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '❄ Fractals'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Shapes that exhibit self-similarity at every scale. Coined by Benoit Mandelbrot (1975) from Latin fractus, "broken".'),
          h('div', { className: 'space-y-2' },
            FRACTAL_NOTES.map(function(f, i) {
              return h('div', { key: 'f'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-rose-900 mb-0.5' }, f.name),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, f.detail)
              );
            })
          )
        );
      }

      function renderNoneuclidSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⊕ Non-Euclidean geometry'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Geometries on curved surfaces. Euclid\'s parallel postulate doesn\'t hold. Discovered 1820s (Lobachevsky, Bolyai, Gauss).'),
          h('div', { className: 'space-y-1' },
            NONEUCLID_FACTS.map(function(n, i) {
              return h('div', { key: 'n'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-rose-900 mb-0.5' }, n.topic),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, n.detail)
              );
            })
          )
        );
      }

      function renderProjectionSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🗺 Map projections'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Projecting curved Earth onto a flat map ALWAYS distorts something — angles, areas, distances, or shapes. Each projection optimizes for different uses.'),
          h('div', { className: 'space-y-2' },
            MAP_PROJECTIONS.map(function(m, i) {
              return h('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, m.name),
                h('div', { className: 'text-[11px] text-rose-700 font-bold mb-1' }, 'Preserves: ' + m.preserves),
                h('div', { className: 'text-[11px] text-slate-700 mb-1' }, h('strong', null, 'Distorts: '), m.distorts),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, h('strong', null, 'Use: '), m.use)
              );
            })
          )
        );
      }

      function renderSundialSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '☼ Sundials'),
          h('div', { className: 'space-y-1' },
            SUNDIAL_NOTES.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-rose-900 mb-0.5' }, s.topic),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.detail)
              );
            })
          )
        );
      }

      function renderGoldenRatioSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, 'φ Golden ratio'),
          h('div', { className: 'p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 mb-3' },
            h('strong', null, '⚠ Reality check: '), 'Many popular claims about the golden ratio in art, architecture, and "beauty" are unsupported or invented retroactively. The mathematical properties are real + beautiful; the cultural claims often aren\'t.'
          ),
          h('div', { className: 'space-y-1' },
            GOLDEN_RATIO.map(function(g, i) {
              return h('div', { key: 'g'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-rose-900 mb-0.5' }, g.fact),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, g.detail)
              );
            })
          )
        );
      }

      function renderOrigamiSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '✦ Origami geometry'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Origami connects geometry to engineering, biology, and design. Mathematical theorems govern what folds are possible.'),
          h('div', { className: 'space-y-1' },
            ORIGAMI_FACTS.map(function(o, i) {
              return h('div', { key: 'o'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-rose-900 mb-0.5' }, o.fact),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, o.detail)
              );
            })
          )
        );
      }

      function renderSportsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🏆 Angles in sports'),
          h('p', { className: 'text-[12px] text-slate-700 mb-3 leading-relaxed' }, 'Many athletic skills depend on launch angles. The classic "45° is optimal" is true only for projectiles launched + landing at the same height (without air resistance).'),
          h('div', { className: 'space-y-2' },
            SPORTS_ANGLES.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[12px] font-black text-slate-800' }, s.sport),
                  h('span', { className: 'text-[11px] font-mono text-rose-700 font-bold ml-auto px-2 py-0.5 rounded bg-rose-100' }, s.angle)
                ),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, s.notes)
              );
            })
          )
        );
      }

      function renderArtSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎨 Angles in art + perspective'),
          h('div', { className: 'space-y-1' },
            ART_ANGLES.map(function(a, i) {
              return h('div', { key: 'a'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-rose-400 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-rose-900 mb-0.5' }, a.topic),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, a.detail)
              );
            })
          )
        );
      }

      function renderToolsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📏 Angle-measuring tools'),
          h('div', { className: 'space-y-2' },
            MEASURING_TOOLS.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[12px] font-black text-slate-800 mb-1' }, t.tool),
                h('div', { className: 'text-[11px] text-rose-700 font-bold mb-1' }, 'Use: ' + t.use),
                h('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, t.notes)
              );
            })
          )
        );
      }

      var __anglesExpansions = h('div', { className: 'mt-4 max-w-4xl mx-auto' },
        expHeader(),
        expTabBar(),
        expSection && h('div', { className: 'mt-2' }, renderActiveSection())
      );

      return h(React.Fragment, null, __anglesMainView, __anglesExpansions);
    }
  });
})();
