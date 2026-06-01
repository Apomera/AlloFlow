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
      var d2 = (labToolData && labToolData.angles) || {};
      var expSection = d2.expSection || null;
      function setExp(patch) {
        setLabToolData(function(prev) {
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
        var sections = [
          { id: 'types', label: 'Types', icon: '<' },
          { id: 'relationships', label: 'Relationships', icon: '\u2AEF' },
          { id: 'polygons', label: 'Polygon angles', icon: '\u2B21' },
          { id: 'trig', label: 'Trig functions', icon: 'sin' },
          { id: 'special', label: 'Special angles', icon: '\u2605' },
          { id: 'units', label: 'Angle units', icon: '\u00B0' },
          { id: 'world', label: 'Real-world', icon: '\uD83C\uDF0D' },
          { id: 'tricks', label: 'Shortcuts', icon: '\u26A1' },
          { id: 'compass', label: 'Compass', icon: '\uD83E\uDDED' },
          { id: 'glossary', label: 'Glossary', icon: '\uD83D\uDCD6' }
        ];
        return h('div', { className: 'flex flex-wrap gap-1.5 mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200' },
          sections.map(function(s) {
            var active = expSection === s.id;
            return h('button', {
              key: s.id,
              onClick: function() { setExp({ expSection: active ? null : s.id }); },
              className: 'px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ' + (active ? 'bg-rose-600 text-white border-rose-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-rose-50 hover:border-rose-300')
            }, s.icon + ' ' + s.label);
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
        if (expSection === 'glossary') return renderGlossarySection();
        return null;
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
