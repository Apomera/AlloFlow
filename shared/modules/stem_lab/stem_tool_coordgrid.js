// ═══════════════════════════════════════════
// stem_tool_coordgrid.js — Coordinate Grid Plugin (Enhanced v3)
// 3 tabs: Explore, Quadrant Tour, Real-World Maps
// + sound effects (mutable), 10 badges, AI tutor, plot/slope/distance challenges,
//   quadrant color overlay, reflection viewer, walk-the-coordinate animator,
//   multi-representation panel (ordered pair / words / vector / movement arrows),
//   real-world coordinate systems (chess, battleship, lat/long w/ city presets),
//   atmospheric backgrounds, marker slide, focus ring, keyboard shortcuts
// ═══════════════════════════════════════════

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
    if (document.getElementById('allo-live-coordgrid')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-coordgrid';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // Coord-grid v3: atmospheric backgrounds + slide/pulse + focus ring
  (function() {
    if (document.getElementById('allo-coordgrid-v3-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-coordgrid-v3-css';
    st.textContent = [
      '@keyframes allo-cg-point-pulse { 0% { filter: drop-shadow(0 0 0 rgba(8,145,178,0.6)); } 50% { filter: drop-shadow(0 0 6px rgba(8,145,178,0.6)); } 100% { filter: drop-shadow(0 0 0 rgba(8,145,178,0.6)); } }',
      '@keyframes allo-cg-pop { 0% { transform: scale(1); } 30% { transform: scale(1.22); } 60% { transform: scale(0.94); } 100% { transform: scale(1); } }',
      '@keyframes allo-cg-splash { 0% { r: 6; opacity: 0.9; stroke-width: 3; } 100% { r: 30; opacity: 0; stroke-width: 0.5; } }',
      '@keyframes allo-cg-trail-fade { 0% { opacity: 0; } 100% { opacity: 0.6; } }',
      '.allo-cg-splash { animation: allo-cg-splash 0.6s ease-out forwards; pointer-events: none; }',
      '.allo-cg-quad-rect { transition: opacity 0.32s ease; }',
      '.allo-cg-trail { animation: allo-cg-trail-fade 0.5s ease-out forwards; pointer-events: none; }',
      '.allo-cg-bg-explore { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(8,145,178,0.10) 0%, rgba(8,145,178,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-cg-bg-quadrants { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(147,51,234,0.10) 0%, rgba(147,51,234,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-cg-bg-challenges { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(217,119,6,0.10) 0%, rgba(217,119,6,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-cg-bg-maps { background: radial-gradient(ellipse 1100px 480px at 50% -10%, rgba(16,185,129,0.10) 0%, rgba(16,185,129,0.04) 35%, rgba(255,255,255,0) 70%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 16px; padding: 10px; }',
      '.allo-cg-walker { transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1); transform-box: fill-box; transform-origin: center; }',
      '.allo-cg-pop { animation: allo-cg-pop 0.5s ease-out; transform-box: fill-box; transform-origin: center; }',
      '.allo-cg-point-pulse { animation: allo-cg-point-pulse 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }',
      '.allo-cg-fill { transition: fill 0.28s ease, opacity 0.28s ease, transform 0.28s ease; }',
      'svg.allo-cg-grid:focus { outline: 3px solid rgba(8,145,178,0.55); outline-offset: 2px; border-radius: 4px; }',
      'svg.allo-cg-grid:focus-visible { outline: 3px solid rgba(8,145,178,0.55); outline-offset: 2px; border-radius: 4px; }',
      '@media (prefers-reduced-motion: reduce) { .allo-cg-walker, .allo-cg-fill { transition: none !important; } .allo-cg-pop, .allo-cg-point-pulse { animation: none !important; } }'
    ].join('\n');
    document.head.appendChild(st);
  })();


  window.StemLab.registerTool('coordinate', {
    icon: '\uD83D\uDCCD', label: 'Coordinate Grid',
    desc: 'Plot points, draw lines, calculate slope/distance/midpoint with sound effects and badges.',
    color: 'cyan', category: 'math',
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

      // ── State handling ──
      var setToolSnapshots = ctx.setToolSnapshots;
      var exploreScore = ctx.exploreScore || { correct: 0, total: 0 };
      var setExploreScore = ctx.setExploreScore;
      var gridRange = ctx.gridRange || { min: -10, max: 10 };

      // ── Extended state via labToolData ──
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var _cg = labToolData._coordGrid || {};
      var updCG = function(obj) {
        if (typeof setLabToolData === 'function') {
          setLabToolData(function(prev) {
            var cg = Object.assign({}, (prev && prev._coordGrid) || {}, obj);
            return Object.assign({}, prev, { _coordGrid: cg });
          });
        }
      };

      // ── Local state overrides (formerly from ctx) ──
      var gridPoints = _cg.gridPoints || [];
      var setGridPoints = function(updater) {
        if (typeof updater === 'function') updCG({ gridPoints: updater(_cg.gridPoints || []) });
        else updCG({ gridPoints: updater });
      };
      var gridChallenge = _cg.gridChallenge || null;
      var setGridChallenge = function(val) { updCG({ gridChallenge: val }); };
      var gridFeedback = _cg.gridFeedback || null;
      var setGridFeedback = function(updater) {
        if (typeof updater === 'function') updCG({ gridFeedback: updater(_cg.gridFeedback || null) });
        else updCG({ gridFeedback: updater });
      };



      var badges = _cg.badges || {};
      var streak = _cg.streak || 0;
      var bestStreak = _cg.bestStreak || 0;
      var showAITutor = _cg.showAITutor || false;
      var aiResponse = _cg.aiResponse || '';
      var aiLoading = _cg.aiLoading || false;
      var aiQuestion = _cg.aiQuestion || '';
      var plotsSolved = _cg.plotsSolved || 0;
      var slopesSolved = _cg.slopesSolved || 0;
      var distanceSolved = _cg.distanceSolved || 0;
      var linesMade = _cg.linesMade || 0;

      // v3 additions
      var muted = _cg.muted || false;                             // global mute
      var cgTab = _cg.cgTab || 'explore';                         // active tab
      var showQuadOverlay = _cg.showQuadOverlay !== false;        // colored quadrant rectangles in Explore (default ON)
      // Quadrant Tour state
      var qtPointX = _cg.qtPointX != null ? _cg.qtPointX : 3;
      var qtPointY = _cg.qtPointY != null ? _cg.qtPointY : 2;
      var qtFocusedQuad = _cg.qtFocusedQuad || null;              // 'I', 'II', 'III', 'IV' when a quad is selected
      var qtShowReflections = _cg.qtShowReflections !== false;    // default ON
      var qtWalkPhase = _cg.qtWalkPhase || 0;                     // 0=idle, 1=at (x,0), 2=at (x,y), 3=done

      // Real-World Maps tab state
      var mapScenario = _cg.mapScenario || 'chess';               // chess | battleship | world
      var chessSelected = _cg.chessSelected || 'e4';
      var chessInput = _cg.chessInput || '';
      var bsShips = Array.isArray(_cg.bsShips) ? _cg.bsShips : null;
      var bsShots = Array.isArray(_cg.bsShots) ? _cg.bsShots : [];
      var bsWon = _cg.bsWon || false;
      var bsLastResult = _cg.bsLastResult || '';
      var worldCity = _cg.worldCity || 'portland_me';
      var worldClickLat = _cg.worldClickLat != null ? _cg.worldClickLat : null;
      var worldClickLon = _cg.worldClickLon != null ? _cg.worldClickLon : null;

      // Map practice modes (skill-based challenges)
      var chessPracticeOn = _cg.chessPracticeOn || false;
      var chessChallenge = _cg.chessChallenge || null;       // { type: 'name'|'find', target: 'e4' }
      var chessChallengeInput = _cg.chessChallengeInput || '';
      var chessFeedback = _cg.chessFeedback || null;         // { correct: bool, msg: string }
      var chessSolved = _cg.chessSolved || 0;
      var chessChallStreak = _cg.chessChallStreak || 0;
      var bsBest = _cg.bsBest != null ? _cg.bsBest : null;   // fewest shots to win
      var worldPracticeOn = _cg.worldPracticeOn || false;
      var worldChallenge = _cg.worldChallenge || null;       // { lat, lon, cityName }
      var worldFeedback = _cg.worldFeedback || null;
      var worldSolved = _cg.worldSolved || 0;
      var worldChallStreak = _cg.worldChallStreak || 0;

      // Function plotting (Explore tab)
      var funcsOn = _cg.funcsOn || false;
      var funcInput = _cg.funcInput || '';
      var funcs = Array.isArray(_cg.funcs) ? _cg.funcs : [];
      var FUNC_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#a855f7'];

      // Safe-ish expression compiler: strip everything but digits, decimals, operators,
      // parens, x, and ^. Replace ^ with **. Wrap in Function('x', 'return ' + ...).
      // Returns null on parse error or non-finite y(0).
      var compileFunc = function(expr) {
        var safe = (expr || '').replace(/[^0-9.+\-*\/()xX^ ]/g, '').replace(/\^/g, '**').replace(/X/g, 'x');
        if (!safe) return null;
        try {
          var fn = new Function('x', 'return ' + safe);
          var probe = fn(0);
          if (typeof probe !== 'number' || isNaN(probe)) {
            var probe2 = fn(1);
            if (typeof probe2 !== 'number' || isNaN(probe2)) return null;
          }
          return fn;
        } catch (e) { return null; }
      };
      var addFunc = function(expr) {
        var trimmed = (expr || '').trim();
        if (!trimmed) return;
        if (compileFunc(trimmed) === null) {
          addToast('Could not parse "' + trimmed + '". Try 2x+1, -x+3, x^2, 0.5x-2.', 'warning');
          return;
        }
        var newFunc = {
          id: 'f-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          expr: trimmed,
          color: FUNC_COLORS[funcs.length % FUNC_COLORS.length],
          visible: true
        };
        sfxClick();
        updCG({ funcs: funcs.concat([newFunc]), funcInput: '' });
        announceToSR('Added y = ' + trimmed);
      };
      var removeFunc = function(id) { sfxClick(); updCG({ funcs: funcs.filter(function(f) { return f.id !== id; }) }); };
      var toggleFunc = function(id) { updCG({ funcs: funcs.map(function(f) { return f.id === id ? Object.assign({}, f, { visible: !f.visible }) : f; }) }); };

      // ═══ SOUND EFFECTS ═══
      var _audioCtx = null;
      var getAudio = function() {
        if (!_audioCtx) { try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
        return _audioCtx;
      };
      var playTone = function(freq, dur, type, vol) {
        if (muted) return;
        var ac = getAudio(); if (!ac) return;
        try {
          var osc = ac.createOscillator();
          var gain = ac.createGain();
          osc.type = type || 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
          osc.connect(gain); gain.connect(ac.destination);
          osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
        } catch(e) {}
      };
      var sfxCorrect = function() { playTone(523, 0.1, 'sine', 0.12); setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.14); }, 160); };
      var sfxWrong = function() { playTone(220, 0.25, 'sawtooth', 0.08); };
      var sfxBadge = function() { playTone(523, 0.08, 'sine', 0.1); setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 70); setTimeout(function() { playTone(784, 0.08, 'sine', 0.1); }, 140); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 210); };
      var sfxClick = function() { playTone(880, 0.05, 'sine', 0.06); };
      var sfxStreak = function() { playTone(440, 0.06, 'sine', 0.1); setTimeout(function() { playTone(554, 0.06, 'sine', 0.1); }, 50); setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 100); setTimeout(function() { playTone(880, 0.15, 'sine', 0.12); }, 150); };

      // ═══ BADGE SYSTEM ═══
      var BADGES = [
        { id: 'firstPlot', icon: '\uD83D\uDCCD', name: 'First Plot', desc: 'Solve your first challenge', check: function(u) { return u.correct >= 1; } },
        { id: 'streak3', icon: '\uD83D\uDD25', name: 'Hot Streak', desc: 'Get a streak of 3', check: function(u) { return u.streak >= 3; } },
        { id: 'streak5', icon: '\u26A1', name: 'Lightning', desc: 'Get a streak of 5', check: function(u) { return u.streak >= 5; } },
        { id: 'score10', icon: '\uD83C\uDFC5', name: 'Ten Points', desc: 'Score 10 correct', check: function(u) { return u.correct >= 10; } },
        { id: 'plotter', icon: '\uD83D\uDCCC', name: 'Plotter', desc: 'Plot 5 points correctly', check: function(u) { return u.plotsSolved >= 5; } },
        { id: 'slopeMaster', icon: '\uD83D\uDCCF', name: 'Slope Master', desc: 'Solve 5 slope challenges', check: function(u) { return u.slopesSolved >= 5; } },
        { id: 'distancePro', icon: '\uD83D\uDCCF', name: 'Distance Pro', desc: 'Solve 3 distance challenges', check: function(u) { return u.distanceSolved >= 3; } },
        { id: 'connector', icon: '\uD83D\uDD17', name: 'Connector', desc: 'Create 5 lines', check: function(u) { return u.linesMade >= 5; } },
        { id: 'allQuadrants', icon: '\uD83C\uDF0D', name: 'Globe Trotter', desc: 'Plot points in all 4 quadrants', check: function(u) { return u.allQuadrants; } },
        { id: 'aiLearner', icon: '\uD83E\uDD16', name: 'AI Learner', desc: 'Ask the AI tutor', check: function(u) { return u.aiAsked >= 1; } },
        { id: 'chessMaster',   icon: '\u265F\uFE0F', name: 'Chess Master',        desc: 'Solve 5 chess notation challenges',     check: function(u) { return u.chessSolved >= 5; } },
        { id: 'naval',         icon: '\u2693',       name: 'Naval Strategist',    desc: 'Win battleship in 30 shots or fewer',  check: function(u) { return u.bsBest != null && u.bsBest <= 30; } },
        { id: 'worldExplorer', icon: '\uD83C\uDF0D', name: 'World Geographer',    desc: 'Identify 5 places by coordinates',      check: function(u) { return u.worldSolved >= 5; } }
      ];

      var checkBadges = function(updates) {
        var newBadges = Object.assign({}, badges);
        var awarded = false;
        BADGES.forEach(function(b) {
          if (!newBadges[b.id] && b.check(updates)) {
            newBadges[b.id] = true;
            awarded = true;
            sfxBadge();
            addToast(b.icon + ' Badge: ' + b.name + ' \u2014 ' + b.desc, 'success');
            awardXP('coordBadge', 15, b.name);
          }
        });
        if (awarded) updCG({ badges: newBadges });
      };

      // Check all quadrants
      var hasAllQuadrants = function(pts) {
        var q = { I: false, II: false, III: false, IV: false };
        pts.forEach(function(p) {
          if (p.x > 0 && p.y > 0) q.I = true;
          if (p.x < 0 && p.y > 0) q.II = true;
          if (p.x < 0 && p.y < 0) q.III = true;
          if (p.x > 0 && p.y < 0) q.IV = true;
        });
        return q.I && q.II && q.III && q.IV;
      };

      // ── Grid math ──
      var gridW = 400, gridH = 400;
      var range = gridRange.max - gridRange.min;
      var step = gridW / range;

      var toSvg = function(v, axis) {
        return axis === 'x' ? (v - gridRange.min) * step : gridH - (v - gridRange.min) * step;
      };
      var fromSvg = function(px, axis) {
        return axis === 'x' ? Math.round(px / step + gridRange.min) : Math.round((gridH - px) / step + gridRange.min);
      };

      // ── Connect mode & slope state ──
      var connectMode = gridFeedback && gridFeedback.connectMode;
      var gridLines = (gridFeedback && gridFeedback.lines) || [];
      var connectFirst = gridFeedback && gridFeedback.connectFirst;
      var slopeChallenge = gridChallenge && gridChallenge.type === 'slope';
      var distanceChallenge = gridChallenge && gridChallenge.type === 'distance';

      var calcSlope = function(p1, p2) {
        var dy = p2.y - p1.y;
        var dx = p2.x - p1.x;
        if (dx === 0) return { rise: dy, run: 0, value: 'undefined', display: 'undefined' };
        var gcdFn = function(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var tmp = b; b = a % tmp; a = tmp; } return a || 1; };
        var g = gcdFn(dy, dx);
        var num = dy / g; var den = dx / g;
        var frac = den < 0 ? (-num) + '/' + (-den) : den === 1 ? '' + num : num + '/' + den;
        return { rise: dy, run: dx, value: dy / dx, display: frac };
      };

      var calcLineEq = function(p, slope) {
        if (slope.run === 0) return 'x = ' + p.x;
        var m = slope.value;
        var b = p.y - m * p.x;
        var bRound = Math.round(b * 100) / 100;
        var mStr = slope.display;
        if (bRound === 0) return 'y = ' + mStr + 'x';
        var sign = bRound > 0 ? ' + ' : ' \u2212 ';
        return 'y = ' + mStr + 'x' + sign + Math.abs(bRound);
      };

      var calcDistance = function(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      };

      var calcMidpoint = function(p1, p2) {
        return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      };

      var getQuadrant = function(x, y) {
        if (x === 0 || y === 0) return x === 0 && y === 0 ? 'Origin' : x === 0 ? 'Y-axis' : 'X-axis';
        if (x > 0 && y > 0) return 'Q I';
        if (x < 0 && y > 0) return 'Q II';
        if (x < 0 && y < 0) return 'Q III';
        return 'Q IV';
      };

      // ── Click handler ──
      var processClick = function(clientX, clientY, svgEl) {
        var rect = svgEl.getBoundingClientRect();
        var x = fromSvg(clientX - rect.left, 'x');
        var y = fromSvg(clientY - rect.top, 'y');
        if (x < gridRange.min || x > gridRange.max || y < gridRange.min || y > gridRange.max) return;

        sfxClick();

        if (connectMode) {
          var clickedIdx = -1;
          for (var ci = 0; ci < gridPoints.length; ci++) {
            if (gridPoints[ci].x === x && gridPoints[ci].y === y) { clickedIdx = ci; break; }
          }
          if (clickedIdx < 0) {
            setGridPoints(function(prev) { return prev.concat([{ x: x, y: y }]); });
            var newIdx = gridPoints.length;
            if (connectFirst === null || connectFirst === undefined) {
              setGridFeedback(function(prev) { return Object.assign({}, prev, { connectFirst: newIdx }); });
            } else {
              var from = gridPoints[connectFirst];
              var to = { x: x, y: y };
              var slope = calcSlope(from, to);
              var newLines = linesMade + 1;
              updCG({ linesMade: newLines });
              setGridFeedback(function(prev) { return Object.assign({}, prev, { lines: (prev.lines || []).concat([{ from: from, to: to, slope: slope }]), connectFirst: null }); });
              checkBadges({
                correct: exploreScore.correct, streak: streak, plotsSolved: plotsSolved,
                slopesSolved: slopesSolved, distanceSolved: distanceSolved,
                linesMade: newLines, allQuadrants: hasAllQuadrants(gridPoints),
                aiAsked: _cg.aiAsked || 0
              });
            }
            return;
          }
          if (connectFirst === null || connectFirst === undefined) {
            setGridFeedback(function(prev) { return Object.assign({}, prev, { connectFirst: clickedIdx }); });
          } else if (clickedIdx !== connectFirst) {
            var from2 = gridPoints[connectFirst];
            var to2 = gridPoints[clickedIdx];
            var slope2 = calcSlope(from2, to2);
            var newLines2 = linesMade + 1;
            updCG({ linesMade: newLines2 });
            setGridFeedback(function(prev) { return Object.assign({}, prev, { lines: (prev.lines || []).concat([{ from: from2, to: to2, slope: slope2 }]), connectFirst: null }); });
          }
          return;
        }

        var existing = -1;
        for (var ei = 0; ei < gridPoints.length; ei++) {
          if (gridPoints[ei].x === x && gridPoints[ei].y === y) { existing = ei; break; }
        }
        if (existing >= 0) {
          setGridPoints(function(prev) { return prev.filter(function(_, i) { return i !== existing; }); });
        } else {
          setGridPoints(function(prev) { return prev.concat([{ x: x, y: y }]); });
        }
        setGridFeedback(null);
      };

      var handleGridClick = function(e) { processClick(e.clientX, e.clientY, e.currentTarget); };
      var handleGridTouch = function(e) {
        e.preventDefault();
        if (e.touches.length === 1) processClick(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
      };

      // ── Check answer ──
      var checkGrid = function() {
        if (!gridChallenge) return;
        if (gridChallenge.type === 'plot') {
          var ok = gridPoints.some(function(p) { return p.x === gridChallenge.target.x && p.y === gridChallenge.target.y; });
          var newStreak = ok ? streak + 1 : 0;
          var newPlots = plotsSolved + (ok ? 1 : 0);
          if (ok) { sfxCorrect(); if (newStreak >= 3) sfxStreak(); } else { sfxWrong(); }
          announceToSR(ok ? 'Correct!' : 'Incorrect');
          setGridFeedback(ok
            ? { correct: true, msg: '\u2705 Correct! Point (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ') plotted!' }
            : { correct: false, msg: '\u274C Point (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ') not found.' }
          );
          setExploreScore(function(prev) { return { correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }; });
          updCG({ streak: newStreak, bestStreak: Math.max(bestStreak, newStreak), plotsSolved: newPlots });
          if (ok) awardXP('coordinate', 5, 'plot point');
          checkBadges({
            correct: exploreScore.correct + (ok ? 1 : 0), streak: newStreak, plotsSolved: newPlots,
            slopesSolved: slopesSolved, distanceSolved: distanceSolved,
            linesMade: linesMade, allQuadrants: hasAllQuadrants(gridPoints),
            aiAsked: _cg.aiAsked || 0
          });

        } else if (gridChallenge.type === 'slope') {
          var cs = gridChallenge.slopeData;
          var riseAns = parseInt((gridFeedback && gridFeedback.riseAnswer) || '');
          var runAns = parseInt((gridFeedback && gridFeedback.runAnswer) || '');
          var slopeAns = ((gridFeedback && gridFeedback.slopeAnswer) || '').trim();
          var riseOk = riseAns === cs.rise;
          var runOk = runAns === cs.run;
          var slopeOk = slopeAns === cs.display || slopeAns === '' + cs.value || (cs.run !== 0 && Math.abs(parseFloat(slopeAns) - cs.value) < 0.01);
          var hinted = gridFeedback && gridFeedback.hinted;
          var allCorrect = riseOk && runOk && slopeOk;
          var newStreak2 = allCorrect ? streak + 1 : 0;
          var newSlopes = slopesSolved + (allCorrect ? 1 : 0);
          if (allCorrect) { sfxCorrect(); if (newStreak2 >= 3) sfxStreak(); } else { sfxWrong(); }
          var msg;
          if (allCorrect && !hinted) { msg = '\u2705 Perfect! rise=' + cs.rise + ', run=' + cs.run + ', slope = ' + cs.display; }
          else if (allCorrect && hinted) { msg = '\u2705 Correct (hint used). slope = ' + cs.display; }
          else {
            var parts = [];
            if (!riseOk) parts.push('rise should be ' + cs.rise);
            if (!runOk) parts.push('run should be ' + cs.run);
            if (!slopeOk) parts.push('slope should be ' + cs.display);
            msg = '\u274C ' + parts.join(', ');
          }
          setGridFeedback(function(prev) { return Object.assign({}, prev, { correct: allCorrect, msg: msg }); });
          setExploreScore(function(prev) { return { correct: prev.correct + (allCorrect ? 1 : 0), total: prev.total + 1 }; });
          updCG({ streak: newStreak2, bestStreak: Math.max(bestStreak, newStreak2), slopesSolved: newSlopes });
          if (allCorrect) awardXP('coordinate', 5, 'slope calc');
          checkBadges({
            correct: exploreScore.correct + (allCorrect ? 1 : 0), streak: newStreak2, plotsSolved: plotsSolved,
            slopesSolved: newSlopes, distanceSolved: distanceSolved,
            linesMade: linesMade, allQuadrants: hasAllQuadrants(gridPoints),
            aiAsked: _cg.aiAsked || 0
          });

        } else if (gridChallenge.type === 'distance') {
          var distAns = parseFloat((gridFeedback && gridFeedback.distanceAnswer) || '');
          var expected = gridChallenge.distance;
          var dOk = Math.abs(distAns - expected) < 0.06;
          var newStreak3 = dOk ? streak + 1 : 0;
          var newDist = distanceSolved + (dOk ? 1 : 0);
          if (dOk) { sfxCorrect(); if (newStreak3 >= 3) sfxStreak(); } else { sfxWrong(); }
          announceToSR(dOk ? 'Correct!' : 'Incorrect');
          setGridFeedback(function(prev) {
            return Object.assign({}, prev, {
              correct: dOk,
              msg: dOk ? '\u2705 Correct! Distance = ' + expected.toFixed(1) : '\u274C Distance = ' + expected.toFixed(1) + ' (you said ' + distAns.toFixed(1) + ')'
            });
          });
          setExploreScore(function(prev) { return { correct: prev.correct + (dOk ? 1 : 0), total: prev.total + 1 }; });
          updCG({ streak: newStreak3, bestStreak: Math.max(bestStreak, newStreak3), distanceSolved: newDist });
          if (dOk) awardXP('coordinate', 5, 'distance calc');
          checkBadges({
            correct: exploreScore.correct + (dOk ? 1 : 0), streak: newStreak3, plotsSolved: plotsSolved,
            slopesSolved: slopesSolved, distanceSolved: newDist,
            linesMade: linesMade, allQuadrants: hasAllQuadrants(gridPoints),
            aiAsked: _cg.aiAsked || 0
          });
        }
      };

      // ═══ AI TUTOR ═══
      var askAITutor = function() {
        if (!aiQuestion.trim()) return;
        updCG({ aiLoading: true, aiResponse: '' });
        var prompt = 'You are a friendly math tutor helping a student learn about coordinate grids, graphing, and slope. ' +
          'They have ' + gridPoints.length + ' points plotted. ' +
          'Their question: "' + aiQuestion + '"\n\nExplain clearly. Keep under 150 words.';
        ctx.callGemini(prompt, false, false, 0.7).then(function(resp) {
          updCG({ aiResponse: resp, aiLoading: false, aiAsked: (_cg.aiAsked || 0) + 1 });
          checkBadges(Object.assign({
            correct: exploreScore.correct, streak: streak, plotsSolved: plotsSolved,
            slopesSolved: slopesSolved, distanceSolved: distanceSolved,
            linesMade: linesMade, allQuadrants: hasAllQuadrants(gridPoints)
          }, { aiAsked: (_cg.aiAsked || 0) + 1 }));
        }).catch(function() {
          updCG({ aiResponse: 'Sorry, could not connect to the AI tutor.', aiLoading: false });
        });
      };

      // ═══ KEYBOARD SHORTCUTS (managed without useEffect) ═══
      if (window._coordGridKeyHandler) {
        window.removeEventListener('keydown', window._coordGridKeyHandler);
      }
      window._coordGridKeyHandler = function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'c' || e.key === 'C') {
          sfxClick();
          if (connectMode) { setGridFeedback(null); } else { setGridFeedback({ connectMode: true, lines: gridLines, connectFirst: null }); }
          setGridChallenge(null);
        } else if (e.key === 'r' || e.key === 'R') {
          setGridPoints([]); setGridChallenge(null); setGridFeedback(null);
        } else if (e.key === '?' || e.key === '/') {
          updCG({ showAITutor: !showAITutor });
        }
      };
      window.addEventListener('keydown', window._coordGridKeyHandler);

      // ════════════════════════════════
      // ═══ RENDER ═══
      // ════════════════════════════════

      // Grid lines + axis labels
      var gridElements = [];
      for (var gi = 0; gi <= range; gi++) {
        var v = gridRange.min + gi;
        var px = toSvg(v, 'x');
        var py = toSvg(v, 'y');
        gridElements.push(
          h('line', { key: 'vl' + gi, x1: px, y1: 0, x2: px, y2: gridH, stroke: v === 0 ? '#334155' : '#e2e8f0', strokeWidth: v === 0 ? 2 : 0.5 }),
          h('line', { key: 'hl' + gi, x1: 0, y1: py, x2: gridW, y2: py, stroke: v === 0 ? '#334155' : '#e2e8f0', strokeWidth: v === 0 ? 2 : 0.5 })
        );
        if (v !== 0 && v % 2 === 0) {
          gridElements.push(
            h('text', { key: 'xl' + gi, x: toSvg(v, 'x'), y: toSvg(0, 'y') + 14, textAnchor: 'middle', className: 'text-[11px] fill-slate-400' }, v),
            h('text', { key: 'yl' + gi, x: toSvg(0, 'x') - 8, y: toSvg(v, 'y') + 3, textAnchor: 'end', className: 'text-[11px] fill-slate-400' }, v)
          );
        }
      }

      // Connected lines with slope badges + equation labels
      var lineElements = gridLines.map(function(ln, li) {
        var eq = calcLineEq(ln.from, ln.slope);
        var midX = (toSvg(ln.from.x, 'x') + toSvg(ln.to.x, 'x')) / 2;
        var midY = (toSvg(ln.from.y, 'y') + toSvg(ln.to.y, 'y')) / 2;
        var riseMidY = (toSvg(ln.from.y, 'y') + toSvg(ln.to.y, 'y')) / 2;
        var riseX = toSvg(ln.to.x, 'x');
        var runMidX = (toSvg(ln.from.x, 'x') + toSvg(ln.to.x, 'x')) / 2;
        var runY = toSvg(ln.from.y, 'y');
        return h(React.Fragment, { key: 'ln' + li },
          h('line', { x1: toSvg(ln.from.x, 'x'), y1: toSvg(ln.from.y, 'y'), x2: toSvg(ln.to.x, 'x'), y2: toSvg(ln.to.y, 'y'), stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '6,3', opacity: 0.8 }),
          h('line', { x1: toSvg(ln.to.x, 'x'), y1: toSvg(ln.from.y, 'y'), x2: toSvg(ln.to.x, 'x'), y2: toSvg(ln.to.y, 'y'), stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '3,2', opacity: 0.6 }),
          ln.slope.rise !== 0 && h('text', { x: riseX + 10, y: riseMidY + 3, className: 'text-[11px] fill-red-500 font-bold' }, '\u0394y=' + ln.slope.rise),
          h('line', { x1: toSvg(ln.from.x, 'x'), y1: toSvg(ln.from.y, 'y'), x2: toSvg(ln.to.x, 'x'), y2: toSvg(ln.from.y, 'y'), stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '3,2', opacity: 0.6 }),
          ln.slope.run !== 0 && h('text', { x: runMidX, y: runY - 6, textAnchor: 'middle', className: 'text-[11px] fill-blue-500 font-bold' }, '\u0394x=' + ln.slope.run),
          h('rect', { x: midX - 24, y: midY - 10, width: 48, height: 18, rx: 5, fill: '#6366f1', opacity: 0.9 }),
          h('text', { x: midX, y: midY + 3, textAnchor: 'middle', fill: '#fff', style: { fontSize: '11px', fontWeight: 'bold' } }, 'm=' + ln.slope.display),
          h('text', { x: midX, y: midY + 16, textAnchor: 'middle', className: 'text-[11px] fill-indigo-400 font-mono' }, eq)
        );
      });

      // Slope challenge line (golden)
      var slopeChallengeElements = slopeChallenge && gridChallenge.p1
        ? (function() {
            var p1 = gridChallenge.p1, p2 = gridChallenge.p2;
            var rMidY = (toSvg(p1.y, 'y') + toSvg(p2.y, 'y')) / 2;
            var rMidX = (toSvg(p1.x, 'x') + toSvg(p2.x, 'x')) / 2;
            return h(React.Fragment, null,
              h('line', { x1: toSvg(p1.x, 'x'), y1: toSvg(p1.y, 'y'), x2: toSvg(p2.x, 'x'), y2: toSvg(p2.y, 'y'), stroke: '#f59e0b', strokeWidth: 2.5 }),
              h('line', { x1: toSvg(p2.x, 'x'), y1: toSvg(p1.y, 'y'), x2: toSvg(p2.x, 'x'), y2: toSvg(p2.y, 'y'), stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '4,2', opacity: 0.7 }),
              h('text', { x: toSvg(p2.x, 'x') + 12, y: rMidY + 3, className: 'text-[11px] fill-red-500 font-bold' }, 'rise'),
              h('line', { x1: toSvg(p1.x, 'x'), y1: toSvg(p1.y, 'y'), x2: toSvg(p2.x, 'x'), y2: toSvg(p1.y, 'y'), stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '4,2', opacity: 0.7 }),
              h('text', { x: rMidX, y: toSvg(p1.y, 'y') - 6, textAnchor: 'middle', className: 'text-[11px] fill-blue-500 font-bold' }, 'run'),
              h('circle', { cx: toSvg(p1.x, 'x'), cy: toSvg(p1.y, 'y'), r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }),
              h('circle', { cx: toSvg(p2.x, 'x'), cy: toSvg(p2.y, 'y'), r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 })
            );
          })()
        : null;

      // Distance challenge line + Pythagorean triangle decomposition
      var distChallengeElements = distanceChallenge && gridChallenge.p1
        ? (function() {
            var p1 = gridChallenge.p1, p2 = gridChallenge.p2;
            var mid = calcMidpoint(p1, p2);
            var dx = p2.x - p1.x, dy = p2.y - p1.y;
            // Right-angle corner: same y as p1, same x as p2
            var corner = { x: p2.x, y: p1.y };
            var legMidX = (toSvg(p1.x, 'x') + toSvg(corner.x, 'x')) / 2;
            var legMidY = (toSvg(corner.y, 'y') + toSvg(p2.y, 'y')) / 2;
            return h(React.Fragment, null,
              // Horizontal leg (Δx) in blue
              h('line', { x1: toSvg(p1.x, 'x'), y1: toSvg(p1.y, 'y'), x2: toSvg(corner.x, 'x'), y2: toSvg(corner.y, 'y'),
                stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '4 3', opacity: 0.7 }),
              h('text', { x: legMidX, y: toSvg(p1.y, 'y') - 6, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: '#3b82f6' },
                'Δx = ' + Math.abs(dx)
              ),
              // Vertical leg (Δy) in red
              h('line', { x1: toSvg(corner.x, 'x'), y1: toSvg(corner.y, 'y'), x2: toSvg(p2.x, 'x'), y2: toSvg(p2.y, 'y'),
                stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '4 3', opacity: 0.7 }),
              h('text', { x: toSvg(corner.x, 'x') + 8, y: legMidY + 3, textAnchor: 'start', fontSize: 11, fontWeight: 'bold', fill: '#ef4444' },
                'Δy = ' + Math.abs(dy)
              ),
              // Right-angle square marker at the corner (small square inset toward the line)
              (function() {
                var cx = toSvg(corner.x, 'x'), cy = toSvg(corner.y, 'y');
                var sgnX = dx >= 0 ? -1 : 1, sgnY = dy >= 0 ? 1 : -1;
                var s = 7;
                return h('polyline', {
                  points: (cx + sgnX * s) + ',' + cy + ' ' + (cx + sgnX * s) + ',' + (cy + sgnY * s) + ' ' + cx + ',' + (cy + sgnY * s),
                  fill: 'none', stroke: '#0f172a', strokeWidth: 1, opacity: 0.55
                });
              })(),
              // Hypotenuse (the actual distance line)
              h('line', { x1: toSvg(p1.x, 'x'), y1: toSvg(p1.y, 'y'), x2: toSvg(p2.x, 'x'), y2: toSvg(p2.y, 'y'),
                stroke: '#22c55e', strokeWidth: 2.5 }),
              h('circle', { cx: toSvg(p1.x, 'x'), cy: toSvg(p1.y, 'y'), r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }),
              h('circle', { cx: toSvg(p2.x, 'x'), cy: toSvg(p2.y, 'y'), r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }),
              // Pythagorean formula badge near the hypotenuse mid
              (function() {
                var d2 = Math.abs(dx) * Math.abs(dx) + Math.abs(dy) * Math.abs(dy);
                var dRound = Math.round(Math.sqrt(d2) * 10) / 10;
                var label = '√(' + Math.abs(dx) + '² + ' + Math.abs(dy) + '²) = √' + d2 + ' ≈ ' + dRound;
                var labelW = Math.max(label.length * 5.5, 130);
                var mx = toSvg(mid.x, 'x'), my = toSvg(mid.y, 'y');
                return h(React.Fragment, null,
                  h('rect', { x: mx - labelW / 2, y: my - 28, width: labelW, height: 18, rx: 4, fill: '#16a34a', opacity: 0.92 }),
                  h('text', { x: mx, y: my - 15, textAnchor: 'middle', fill: '#fff', fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' }, label)
                );
              })(),
              h('circle', { cx: toSvg(mid.x, 'x'), cy: toSvg(mid.y, 'y'), r: 3, fill: '#a855f7', stroke: '#fff', strokeWidth: 1 }),
              h('text', { x: toSvg(mid.x, 'x'), y: toSvg(mid.y, 'y') + 14, textAnchor: 'middle', className: 'text-[11px] fill-purple-500 font-bold' }, 'M(' + mid.x + ',' + mid.y + ')')
            );
          })()
        : null;

      // ── Function polylines (y = f(x), sampled across the grid range) ──
      var funcElements = [];
      if (funcsOn && funcs.length > 0) {
        var samples = 120;
        funcs.forEach(function(f) {
          if (!f.visible) return;
          var fn = compileFunc(f.expr);
          if (!fn) return;
          // Build polyline segments, breaking on undefined / out-of-bounds samples
          var segments = [];
          var current = [];
          for (var si = 0; si <= samples; si++) {
            var x = gridRange.min + (si / samples) * range;
            var y;
            try { y = fn(x); } catch (e) { current = []; continue; }
            if (typeof y !== 'number' || isNaN(y) || !isFinite(y)) {
              if (current.length > 1) segments.push(current);
              current = [];
              continue;
            }
            // Allow a small overshoot beyond the visible range so the line touches the edge
            if (y < gridRange.min - 2 || y > gridRange.max + 2) {
              if (current.length > 1) segments.push(current);
              current = [];
              continue;
            }
            current.push(toSvg(x, 'x') + ',' + toSvg(y, 'y'));
          }
          if (current.length > 1) segments.push(current);
          segments.forEach(function(seg, segIdx) {
            funcElements.push(h('polyline', {
              key: 'fseg-' + f.id + '-' + segIdx,
              points: seg.join(' '),
              fill: 'none', stroke: f.color, strokeWidth: 2.5, opacity: 0.85,
              strokeLinejoin: 'round', strokeLinecap: 'round'
            }));
          });
          // Label near the rightmost endpoint of the last segment
          var lastSeg = segments[segments.length - 1];
          if (lastSeg && lastSeg.length > 0) {
            var endPt = lastSeg[Math.floor(lastSeg.length * 0.7)].split(',');
            funcElements.push(h('text', {
              key: 'flbl-' + f.id,
              x: parseFloat(endPt[0]) + 4, y: parseFloat(endPt[1]) - 6,
              fontSize: 11, fontWeight: 'bold', fill: f.color,
              style: { pointerEvents: 'none' }
            }, 'y = ' + f.expr));
          }
        });
      }

      // Plotted points
      var pointElements = gridPoints.map(function(p, i) {
        return h('circle', { key: 'pt' + i, cx: toSvg(p.x, 'x'), cy: toSvg(p.y, 'y'), r: 5, fill: connectFirst === i ? '#6366f1' : '#0891b2', stroke: '#fff', strokeWidth: 2, className: 'cursor-pointer' });
      });
      var labelElements = gridPoints.map(function(p, i) {
        return h('text', { key: 'lb' + i, x: toSvg(p.x, 'x') + 8, y: toSvg(p.y, 'y') - 8, className: 'text-[11px] fill-cyan-700 font-bold' }, '(' + p.x + ',' + p.y + ')');
      });

      // ═══ BADGES PANEL ═══
      var renderBadges = function() {
        var earned = Object.keys(badges).length;
        if (earned === 0) return null;
        return h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-3' },
          h('p', { className: 'text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-2' }, '\uD83C\uDFC5 Badges (' + earned + '/' + BADGES.length + ')'),
          h('div', { className: 'flex flex-wrap gap-1.5' },
            BADGES.map(function(b) {
              var has = badges[b.id];
              return h('div', {
                key: b.id, title: b.name + ': ' + b.desc,
                className: 'w-8 h-8 rounded-lg flex items-center justify-center text-base ' + (has ? 'bg-amber-200 shadow-sm' : 'bg-slate-100 opacity-30'),
                style: { filter: has ? 'none' : 'grayscale(1)' }
              }, b.icon);
            })
          )
        );
      };

      // ═══ AI TUTOR PANEL ═══
      var renderAITutor = function() {
        if (!showAITutor) return null;
        return h('div', { className: 'bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl border-2 border-sky-200 p-4 space-y-3' },
          h('div', { className: 'flex items-center justify-between' },
            h('h4', { className: 'text-sm font-bold text-sky-800' }, '\uD83E\uDD16 AI Coordinate Tutor'),
            h('button', { onClick: function() { updCG({ showAITutor: false }); }, className: 'text-sky-400 hover:text-sky-600 text-lg font-bold' }, '\u00D7')
          ),
          h('div', { className: 'flex gap-2' },
            h('input', {
              type: 'text', value: aiQuestion,
              onChange: function(e) { updCG({ aiQuestion: e.target.value }); },
              onKeyDown: function(e) { if (e.key === 'Enter' && aiQuestion.trim()) askAITutor(); },
              placeholder: 'Ask about coordinates...',
              className: 'flex-1 px-3 py-2 border border-sky-600 rounded-lg text-sm'
            }),
            h('button', { onClick: askAITutor, disabled: aiLoading || !aiQuestion.trim(),
              className: 'px-4 py-2 bg-sky-600 text-white font-bold rounded-lg text-sm hover:bg-sky-700 disabled:opacity-50'
            }, aiLoading ? '\u23F3' : 'Ask')
          ),
          h('div', { className: 'flex flex-wrap gap-1.5' },
            ['What is slope?', 'How to find distance?', 'What is a midpoint?', 'What are quadrants?'].map(function(q) {
              return h('button', { 'aria-label': 'Ask question',
                key: q, onClick: function() { updCG({ aiQuestion: q }); },
                className: 'px-2 py-1 text-[11px] font-bold bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 transition-all'
              }, q);
            })
          ),
          aiResponse && h('div', { className: 'bg-white rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap border border-sky-100' }, aiResponse)
        );
      };

      // ═══ QUADRANT TOUR TAB ═══
      // Pedagogical move: make quadrant signs (+,+)(−,+)(−,−)(+,−) VISIBLE via
      // color, then make reflection (sign-flipping) and "walking the coordinate"
      // (movement) tangible operations. Closes the #1 confusion for middle schoolers.
      var renderQuadrantTour = function() {
        var quadrants = [
          { id: 'II',  name: 'Q II',  sign: '(−, +)', color: '#dc2626', soft: 'rgba(220,38,38,0.10)',  sample: { x: -3, y: 3 },  desc: 'x negative, y positive' },
          { id: 'I',   name: 'Q I',   sign: '(+, +)', color: '#16a34a', soft: 'rgba(22,163,74,0.10)',  sample: { x: 3,  y: 3 },  desc: 'both positive' },
          { id: 'III', name: 'Q III', sign: '(−, −)', color: '#d97706', soft: 'rgba(217,119,6,0.10)',  sample: { x: -3, y: -3 }, desc: 'both negative' },
          { id: 'IV',  name: 'Q IV',  sign: '(+, −)', color: '#7c3aed', soft: 'rgba(124,58,237,0.10)', sample: { x: 3,  y: -3 }, desc: 'x positive, y negative' }
        ];

        var ref_x = { x: qtPointX,  y: -qtPointY };  // across x-axis
        var ref_y = { x: -qtPointX, y: qtPointY };   // across y-axis
        var ref_o = { x: -qtPointX, y: -qtPointY };  // through origin

        var doWalk = function() {
          sfxClick();
          updCG({ qtWalkPhase: 0 });
          setTimeout(function() { updCG({ qtWalkPhase: 1 }); }, 80);   // origin → (x, 0)
          setTimeout(function() { updCG({ qtWalkPhase: 2 }); }, 900);  // (x, 0) → (x, y)
          setTimeout(function() { updCG({ qtWalkPhase: 3 }); }, 1800); // settled
          announceToSR('Walking from origin: right ' + qtPointX + ', up ' + qtPointY);
        };

        // Walker live position
        var walkerCoord = { x: 0, y: 0 };
        if (qtWalkPhase >= 2) walkerCoord = { x: qtPointX, y: qtPointY };
        else if (qtWalkPhase === 1) walkerCoord = { x: qtPointX, y: 0 };

        // Colored quadrant rectangles in SVG space
        var hcx = toSvg(0, 'x'), hcy = toSvg(0, 'y');
        var quadOverlay = [
          h('rect', { key: 'qIb',   className: 'allo-cg-quad-rect', x: hcx,  y: 0,    width: gridW - hcx, height: hcy,           fill: quadrants[1].soft, opacity: qtFocusedQuad === 'I'   ? 0.85 : 0.55 }),
          h('rect', { key: 'qIIb',  className: 'allo-cg-quad-rect', x: 0,    y: 0,    width: hcx,         height: hcy,           fill: quadrants[0].soft, opacity: qtFocusedQuad === 'II'  ? 0.85 : 0.55 }),
          h('rect', { key: 'qIIIb', className: 'allo-cg-quad-rect', x: 0,    y: hcy,  width: hcx,         height: gridH - hcy,   fill: quadrants[2].soft, opacity: qtFocusedQuad === 'III' ? 0.85 : 0.55 }),
          h('rect', { key: 'qIVb',  className: 'allo-cg-quad-rect', x: hcx,  y: hcy,  width: gridW - hcx, height: gridH - hcy,   fill: quadrants[3].soft, opacity: qtFocusedQuad === 'IV'  ? 0.85 : 0.55 }),
          h('text', { key: 'qIL',   x: gridW - 30, y: 18,         textAnchor: 'middle', fontSize: 14, fontWeight: 'bold', fill: quadrants[1].color, opacity: 0.7 }, 'Q I'),
          h('text', { key: 'qIIL',  x: 30,         y: 18,         textAnchor: 'middle', fontSize: 14, fontWeight: 'bold', fill: quadrants[0].color, opacity: 0.7 }, 'Q II'),
          h('text', { key: 'qIIIL', x: 30,         y: gridH - 8,  textAnchor: 'middle', fontSize: 14, fontWeight: 'bold', fill: quadrants[2].color, opacity: 0.7 }, 'Q III'),
          h('text', { key: 'qIVL',  x: gridW - 30, y: gridH - 8,  textAnchor: 'middle', fontSize: 14, fontWeight: 'bold', fill: quadrants[3].color, opacity: 0.7 }, 'Q IV')
        ];

        var mainPx = toSvg(qtPointX, 'x');
        var mainPy = toSvg(qtPointY, 'y');

        // Reflection ghost markers
        var reflectionEls = [];
        if (qtShowReflections) {
          var refs = [
            { p: ref_x, color: '#dc2626', label: 'across x' },
            { p: ref_y, color: '#2563eb', label: 'across y' },
            { p: ref_o, color: '#9333ea', label: 'thru origin' }
          ];
          refs.forEach(function(r, ri) {
            var rx = toSvg(r.p.x, 'x'), ry = toSvg(r.p.y, 'y');
            reflectionEls.push(h('line', { key: 'refl-' + ri, x1: mainPx, y1: mainPy, x2: rx, y2: ry, stroke: r.color, strokeWidth: 1, strokeDasharray: '4 3', opacity: 0.35 }));
            reflectionEls.push(h('g', { key: 'refp-' + ri },
              h('circle', { cx: rx, cy: ry, r: 6, fill: r.color, opacity: 0.55, stroke: '#fff', strokeWidth: 1.5 }),
              h('text', { x: rx + 8, y: ry - 8, fontSize: 10, fontWeight: 'bold', fill: r.color }, '(' + r.p.x + ',' + r.p.y + ')')
            ));
          });
        }

        // Walker (animated dot following walk-the-coordinate path)
        var wPx = toSvg(walkerCoord.x, 'x'), wPy = toSvg(walkerCoord.y, 'y');
        var walkerEl = qtWalkPhase > 0 ? h('g', {
          key: 'walker',
          className: 'allo-cg-walker',
          style: { transform: 'translate(' + (wPx - mainPx) + 'px, ' + (wPy - mainPy) + 'px)' }
        },
          h('circle', { cx: mainPx, cy: mainPy, r: 9, fill: '#0891b2', stroke: '#fff', strokeWidth: 2.5 }),
          h('circle', { cx: mainPx, cy: mainPy, r: 4, fill: '#fff' })
        ) : null;

        // Walk path trail: L-shape from origin → (x, 0) → (x, y) with step labels.
        // Visible during/after walk, reinforces "first number = horizontal, second = vertical."
        var trailEls = [];
        var originPx = toSvg(0, 'x'), originPy = toSvg(0, 'y');
        var xAxisPx = toSvg(qtPointX, 'x');  // x coord on the x-axis (y=0)
        if (qtWalkPhase >= 1) {
          // Horizontal leg: origin → (qtPointX, 0)
          trailEls.push(h('line', {
            key: 'trail-h', className: 'allo-cg-trail',
            x1: originPx, y1: originPy, x2: xAxisPx, y2: originPy,
            stroke: '#0891b2', strokeWidth: 2.5, strokeDasharray: '6 3'
          }));
          // Label above mid-leg
          var hMidX = (originPx + xAxisPx) / 2;
          trailEls.push(h('text', { key: 'trail-h-lbl', className: 'allo-cg-trail',
            x: hMidX, y: originPy - 8, textAnchor: 'middle',
            fontSize: 11, fontWeight: 'bold', fill: '#0891b2'
          }, (qtPointX >= 0 ? '→' : '←') + ' ' + Math.abs(qtPointX)));
        }
        if (qtWalkPhase >= 2) {
          // Vertical leg: (qtPointX, 0) → (qtPointX, qtPointY)
          trailEls.push(h('line', {
            key: 'trail-v', className: 'allo-cg-trail',
            x1: xAxisPx, y1: originPy, x2: mainPx, y2: mainPy,
            stroke: '#0891b2', strokeWidth: 2.5, strokeDasharray: '6 3'
          }));
          var vMidY = (originPy + mainPy) / 2;
          trailEls.push(h('text', { key: 'trail-v-lbl', className: 'allo-cg-trail',
            x: xAxisPx + 8, y: vMidY + 4, textAnchor: 'start',
            fontSize: 11, fontWeight: 'bold', fill: '#0891b2'
          }, (qtPointY >= 0 ? '↑' : '↓') + ' ' + Math.abs(qtPointY)));
        }

        return h('div', { className: 'space-y-4 allo-cg-bg-quadrants' },

          // Four-up quadrant cards
          h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
            [quadrants[0], quadrants[1], quadrants[2], quadrants[3]].map(function(q) {
              var active = qtFocusedQuad === q.id;
              return h('button', {
                key: 'qcard-' + q.id,
                onClick: function() {
                  sfxClick();
                  updCG({ qtFocusedQuad: active ? null : q.id, qtPointX: q.sample.x, qtPointY: q.sample.y, qtWalkPhase: 0 });
                  announceToSR('Quadrant ' + q.id + ', ' + q.desc + '. Example point: ' + q.sample.x + ', ' + q.sample.y);
                },
                'aria-pressed': active,
                'aria-label': 'Quadrant ' + q.id + ', ' + q.desc,
                className: 'rounded-lg p-2 text-center transition-all border-2 ' + (active ? 'shadow-lg ring-2 ring-offset-1' : 'hover:shadow-md opacity-90 hover:opacity-100'),
                style: { backgroundColor: q.soft, borderColor: q.color, color: q.color }
              },
                h('div', { className: 'text-[10px] font-bold uppercase tracking-wider' }, q.name),
                h('div', { className: 'text-lg font-bold font-mono leading-tight' }, q.sign),
                h('div', { className: 'text-[10px] italic mt-1' }, q.desc),
                h('div', { className: 'text-[10px] font-mono mt-0.5 opacity-70' }, 'e.g. (' + q.sample.x + ', ' + q.sample.y + ')')
              );
            })
          ),

          // Grid with quadrant overlay + point + reflections + walker
          h('div', { className: 'bg-white rounded-xl border-2 border-purple-200 p-3' },
            h('p', { className: 'text-[11px] font-bold text-purple-700 mb-2' },
              '🗺 Colored regions are the four quadrants. Change the focus point below to see how it moves.'
            ),
            h('div', { className: 'flex justify-center' },
              h('svg', {
                width: gridW, height: gridH,
                style: { background: '#f8fafc', touchAction: 'none' },
                className: 'allo-cg-grid',
                role: 'img',
                'aria-label': 'Coordinate grid showing focus point at ' + qtPointX + ', ' + qtPointY + ', in quadrant ' + getQuadrant(qtPointX, qtPointY)
              },
                quadOverlay,
                gridElements,
                reflectionEls,
                trailEls,
                h('g', { className: 'allo-cg-point-pulse' },
                  h('circle', { cx: mainPx, cy: mainPy, r: 9, fill: '#0891b2', stroke: '#fff', strokeWidth: 2.5, className: 'allo-cg-fill' }),
                  h('text', { x: mainPx + 12, y: mainPy - 10, fontSize: 13, fontWeight: 'bold', fill: '#0891b2' }, '(' + qtPointX + ', ' + qtPointY + ')')
                ),
                walkerEl
              )
            )
          ),

          // Point input controls
          h('div', { className: 'bg-purple-50 rounded-lg p-3 border border-purple-200' },
            h('p', { className: 'text-[11px] font-bold text-purple-800 mb-2' }, '📍 Focus point: ( x , y )'),
            h('div', { className: 'flex flex-wrap items-center gap-2' },
              h('label', { className: 'text-xs font-bold text-purple-700' }, 'x:'),
              h('input', { type: 'number', value: qtPointX, min: gridRange.min, max: gridRange.max, step: 1,
                onChange: function(e) { var v = parseInt(e.target.value, 10); if (!isNaN(v)) updCG({ qtPointX: v, qtWalkPhase: 0 }); },
                'aria-label': 'X coordinate',
                className: 'w-16 px-2 py-1 border border-purple-300 rounded text-center font-mono'
              }),
              h('label', { className: 'text-xs font-bold text-purple-700 ml-2' }, 'y:'),
              h('input', { type: 'number', value: qtPointY, min: gridRange.min, max: gridRange.max, step: 1,
                onChange: function(e) { var v = parseInt(e.target.value, 10); if (!isNaN(v)) updCG({ qtPointY: v, qtWalkPhase: 0 }); },
                'aria-label': 'Y coordinate',
                className: 'w-16 px-2 py-1 border border-purple-300 rounded text-center font-mono'
              }),
              h('span', { className: 'text-[11px] text-purple-700 ml-1 font-bold' }, '→ ' + getQuadrant(qtPointX, qtPointY)),
              h('button', {
                onClick: doWalk,
                'aria-label': 'Animate walk from origin to this point',
                className: 'ml-auto px-3 py-1 bg-purple-700 text-white text-xs font-bold rounded hover:bg-purple-800 transition-all'
              }, '▶ Walk it'),
              h('label', { className: 'text-[11px] font-bold text-purple-700 flex items-center gap-1 cursor-pointer ml-2' },
                h('input', { type: 'checkbox', checked: qtShowReflections, onChange: function() { updCG({ qtShowReflections: !qtShowReflections }); } }),
                'Show reflections'
              )
            )
          ),

          // Reflection breakdown (three cards)
          qtShowReflections && h('div', { className: 'grid grid-cols-3 gap-2' },
            h('div', { className: 'bg-red-50 rounded-lg p-2 border border-red-200 text-center' },
              h('p', { className: 'text-[10px] font-bold text-red-700 uppercase tracking-wider' }, 'Across x-axis'),
              h('p', { className: 'text-base font-bold text-red-900 font-mono' }, '(' + ref_x.x + ', ' + ref_x.y + ')'),
              h('p', { className: 'text-[10px] text-red-700 italic mt-1' }, 'y flips sign')
            ),
            h('div', { className: 'bg-blue-50 rounded-lg p-2 border border-blue-200 text-center' },
              h('p', { className: 'text-[10px] font-bold text-blue-700 uppercase tracking-wider' }, 'Across y-axis'),
              h('p', { className: 'text-base font-bold text-blue-900 font-mono' }, '(' + ref_y.x + ', ' + ref_y.y + ')'),
              h('p', { className: 'text-[10px] text-blue-700 italic mt-1' }, 'x flips sign')
            ),
            h('div', { className: 'bg-purple-50 rounded-lg p-2 border border-purple-200 text-center' },
              h('p', { className: 'text-[10px] font-bold text-purple-700 uppercase tracking-wider' }, 'Through origin'),
              h('p', { className: 'text-base font-bold text-purple-900 font-mono' }, '(' + ref_o.x + ', ' + ref_o.y + ')'),
              h('p', { className: 'text-[10px] text-purple-700 italic mt-1' }, 'BOTH flip')
            )
          ),

          // Multi-representation panel
          h('div', { className: 'bg-white rounded-xl border-2 border-purple-200 p-3' },
            h('p', { className: 'text-[11px] font-bold text-purple-700 mb-2' }, '🔄 Same point, three names'),
            h('div', { className: 'grid grid-cols-3 gap-3' },
              h('div', { className: 'text-center bg-purple-50 rounded-lg p-2 border border-purple-200' },
                h('p', { className: 'text-[10px] font-bold text-purple-700 uppercase' }, 'Ordered pair'),
                h('p', { className: 'text-xl font-bold text-purple-900 font-mono mt-1' }, '(' + qtPointX + ', ' + qtPointY + ')')
              ),
              h('div', { className: 'text-center bg-purple-50 rounded-lg p-2 border border-purple-200' },
                h('p', { className: 'text-[10px] font-bold text-purple-700 uppercase' }, 'In words'),
                h('p', { className: 'text-sm font-bold text-purple-900 mt-1' },
                  (qtPointX === 0 && qtPointY === 0) ? 'at origin' :
                  (Math.abs(qtPointX) + ' ' + (qtPointX >= 0 ? 'right' : 'left') + ', ' + Math.abs(qtPointY) + ' ' + (qtPointY >= 0 ? 'up' : 'down'))
                )
              ),
              h('div', { className: 'text-center bg-purple-50 rounded-lg p-2 border border-purple-200' },
                h('p', { className: 'text-[10px] font-bold text-purple-700 uppercase' }, 'Movement'),
                h('p', { className: 'text-base font-bold text-purple-900 mt-1 break-all' },
                  (Math.abs(qtPointX) === 0 ? '·' : (qtPointX > 0 ? '→' : '←').repeat(Math.min(Math.abs(qtPointX), 6))) + ' ' +
                  (Math.abs(qtPointY) === 0 ? '·' : (qtPointY > 0 ? '↑' : '↓').repeat(Math.min(Math.abs(qtPointY), 6)))
                )
              )
            )
          ),

          // Pedagogy panel
          h('details', { className: 'bg-white rounded-xl border border-purple-200 p-3' },
            h('summary', { className: 'text-xs font-bold text-purple-700 cursor-pointer' }, '💡 Why coordinates have two numbers'),
            h('div', { className: 'mt-2 space-y-2 text-xs text-slate-700' },
              h('p', {}, h('b', {}, 'Every point on the plane has exactly two numbers. '),
                'The first is the x-coordinate (how far horizontal from origin: right is +, left is −). The second is the y-coordinate (how far vertical: up is +, down is −).'
              ),
              h('p', {}, h('b', {}, 'The order MATTERS. '),
                '(3, 2) is NOT the same point as (2, 3). The first number always pairs with x, the second always with y. Memory hook: "x comes first" alphabetically.'
              ),
              h('p', {}, h('b', {}, 'Four quadrants = four sign combinations. '),
                'Q I both positive (top-right). Q II x is negative (top-left). Q III both negative (bottom-left). Q IV y is negative (bottom-right). The roman numerals go counterclockwise from top-right.'
              ),
              h('p', {}, h('b', {}, 'Reflection flips signs. '),
                'Across the x-axis: y flips. Across the y-axis: x flips. Through the origin: both flip. It is the simplest transformation in coordinate geometry.'
              )
            )
          )
        );
      };

      // ═══ REAL-WORLD MAPS TAB ═══
      // Pedagogical move: every grid system the student has ever seen — chess
      // boards, battleship grids, latitude/longitude — is a coordinate plane in
      // disguise. Different labeling (letters/numbers, degrees), same structure.
      var renderRealWorldMaps = function() {

        // ── Chess board (8×8, files a-h, ranks 1-8) ──
        var renderChess = function() {
          var sz = 360, cells = 8, cell = sz / cells;
          var files = ['a','b','c','d','e','f','g','h'];
          var fileFromX = function(x) { return files[x] || '?'; };
          var notationFor = function(fx, ry) { return fileFromX(fx) + (8 - ry); };  // ry is SVG row 0=top

          // Practice-mode helpers
          var newChessChallenge = function() {
            var f = files[Math.floor(Math.random() * 8)];
            var r = 1 + Math.floor(Math.random() * 8);
            var type = Math.random() < 0.5 ? 'name' : 'find';
            var target = f + r;
            sfxClick();
            updCG({
              chessChallenge: { type: type, target: target },
              chessChallengeInput: '',
              chessFeedback: null,
              // For "name" challenges, highlight the target square so the student SEES it
              chessSelected: type === 'name' ? target : chessSelected
            });
            announceToSR(type === 'name' ? 'Name the highlighted square' : 'Click the square at ' + target);
          };
          var resolveChessChallenge = function(answered) {
            if (!chessChallenge) return;
            var ok = answered === chessChallenge.target;
            var newStreak = ok ? chessChallStreak + 1 : 0;
            var newSolved = chessSolved + (ok ? 1 : 0);
            if (ok) { sfxCorrect(); if (newStreak >= 3) sfxStreak(); } else { sfxWrong(); }
            announceToSR(ok ? 'Correct, ' + chessChallenge.target : 'The answer was ' + chessChallenge.target);
            updCG({
              chessFeedback: { correct: ok, msg: ok ? '✅ Correct! ' + chessChallenge.target : '❌ The answer was ' + chessChallenge.target + ' (you said ' + answered + ')' },
              chessSolved: newSolved,
              chessChallStreak: newStreak
            });
            if (ok) awardXP('coordinate', 4, 'chess notation');
            checkBadges({
              correct: exploreScore.correct, streak: streak, plotsSolved: plotsSolved,
              slopesSolved: slopesSolved, distanceSolved: distanceSolved,
              linesMade: linesMade, allQuadrants: hasAllQuadrants(gridPoints),
              aiAsked: _cg.aiAsked || 0,
              chessSolved: newSolved, bsBest: bsBest, worldSolved: worldSolved
            });
          };
          var submitChessName = function() {
            var v = (chessChallengeInput || '').toLowerCase().trim();
            if (v.length === 2 && files.indexOf(v.charAt(0)) >= 0 && '12345678'.indexOf(v.charAt(1)) >= 0) {
              resolveChessChallenge(v);
            } else {
              addToast('Type a square like "e4" — letter a-h then number 1-8.', 'warning');
            }
          };

          var selFile = chessSelected.charAt(0);
          var selRank = parseInt(chessSelected.charAt(1), 10);
          var selFx = files.indexOf(selFile);
          var selRy = 8 - selRank;
          var squares = [];
          for (var ry = 0; ry < cells; ry++) {
            for (var fx = 0; fx < cells; fx++) {
              var isLight = (fx + ry) % 2 === 0;
              var isSelected = fx === selFx && ry === selRy;
              squares.push(h('rect', {
                key: 'cs-' + fx + '-' + ry,
                x: fx * cell, y: ry * cell, width: cell, height: cell,
                fill: isSelected ? '#10b981' : (isLight ? '#f5deb3' : '#a0826d'),
                stroke: isSelected ? '#047857' : '#7c5e48',
                strokeWidth: isSelected ? 2.5 : 0.5,
                style: { cursor: 'pointer', transition: 'fill 0.18s ease' },
                onClick: function(f, r) { return function() {
                  var notation = notationFor(f, r);
                  // If practice mode + Find challenge is active, treat clicks as answers
                  if (chessPracticeOn && chessChallenge && chessChallenge.type === 'find' && !chessFeedback) {
                    resolveChessChallenge(notation);
                    return;
                  }
                  sfxClick();
                  updCG({ chessSelected: notation });
                  announceToSR('Selected ' + notation);
                }; }(fx, ry)
              }));
              if (isSelected) {
                squares.push(h('text', { key: 'cstxt-' + fx + '-' + ry,
                  x: fx * cell + cell / 2, y: ry * cell + cell / 2 + 5,
                  textAnchor: 'middle', fontSize: 18, fontWeight: 'bold', fill: '#fff',
                  style: { pointerEvents: 'none' }
                }, notationFor(fx, ry)));
              } else {
                // Starting-position chess piece glyphs (ry: 0=rank 8 black, 1=rank 7, 6=rank 2, 7=rank 1 white)
                var pieceChar = null, pieceColor = null;
                if (ry === 0) { pieceChar = '♜♞♝♛♚♝♞♜'.charAt(fx); pieceColor = '#1e293b'; }
                else if (ry === 1) { pieceChar = '♟'; pieceColor = '#1e293b'; }
                else if (ry === 6) { pieceChar = '♙'; pieceColor = '#f8fafc'; }
                else if (ry === 7) { pieceChar = '♖♘♗♕♔♗♘♖'.charAt(fx); pieceColor = '#f8fafc'; }
                if (pieceChar) {
                  squares.push(h('text', { key: 'piece-' + fx + '-' + ry,
                    x: fx * cell + cell / 2, y: ry * cell + cell / 2 + 9,
                    textAnchor: 'middle', fontSize: 24, fill: pieceColor,
                    style: { pointerEvents: 'none',
                      textShadow: pieceColor === '#f8fafc' ? '0 0 2px rgba(0,0,0,0.6)' : '0 0 2px rgba(255,255,255,0.3)'
                    }
                  }, pieceChar));
                }
              }
            }
          }
          // File/rank labels around board
          var labels = [];
          for (var i = 0; i < 8; i++) {
            labels.push(h('text', { key: 'fl-' + i, x: i * cell + cell / 2, y: sz + 16, textAnchor: 'middle', fontSize: 12, fontWeight: 'bold', fill: '#7c5e48' }, files[i]));
            labels.push(h('text', { key: 'rl-' + i, x: -10, y: i * cell + cell / 2 + 4, textAnchor: 'end', fontSize: 12, fontWeight: 'bold', fill: '#7c5e48' }, 8 - i));
          }
          return h('div', { className: 'space-y-3' },
            h('p', { className: 'text-[11px] text-slate-700' },
              h('b', {}, 'Chess board notation. '),
              'Columns (files) are letters a-h. Rows (ranks) are numbers 1-8. Every square has a letter+number coordinate. The white queen starts at d1, the black king at e8.'
            ),
            h('div', { className: 'flex justify-center bg-white rounded-xl border-2 border-emerald-200 p-4' },
              h('svg', { width: sz + 30, height: sz + 30, viewBox: '-15 -5 ' + (sz + 30) + ' ' + (sz + 30),
                style: { background: 'transparent' }, role: 'img',
                'aria-label': 'Chess board, currently selected square ' + chessSelected
              }, squares, labels)
            ),
            h('div', { className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-200 flex flex-wrap items-center gap-3' },
              h('div', { className: 'flex items-center gap-1' },
                h('span', { className: 'text-xs font-bold text-emerald-800' }, 'Selected:'),
                h('span', { className: 'text-lg font-bold font-mono text-emerald-900' }, chessSelected),
                h('span', { className: 'text-[11px] text-emerald-700' }, '= (file ' + (selFx + 1) + ', rank ' + (8 - selRy) + ')')
              ),
              h('div', { className: 'flex items-center gap-1 ml-auto' },
                h('span', { className: 'text-xs font-bold text-emerald-800' }, 'Type a square:'),
                h('input', { type: 'text', value: chessInput, maxLength: 2,
                  onChange: function(e) { updCG({ chessInput: e.target.value.toLowerCase() }); },
                  onKeyDown: function(e) {
                    if (e.key === 'Enter') {
                      var v = (chessInput || '').toLowerCase().trim();
                      if (v.length === 2 && files.indexOf(v.charAt(0)) >= 0 && '12345678'.indexOf(v.charAt(1)) >= 0) {
                        sfxClick(); updCG({ chessSelected: v, chessInput: '' });
                        announceToSR('Jumped to ' + v);
                      } else {
                        addToast('Enter like "e4" — letter a-h then number 1-8.', 'warning');
                      }
                    }
                  },
                  placeholder: 'e4',
                  'aria-label': 'Type a chess square like e4',
                  className: 'w-16 px-2 py-1 border border-emerald-400 rounded text-center font-mono uppercase'
                })
              )
            ),
            h('div', { className: 'flex flex-wrap gap-1 text-[11px]' },
              h('span', { className: 'font-bold text-emerald-700 self-center mr-1' }, 'Try:'),
              ['a1','e4','h8','d5','g2','b6'].map(function(s) {
                return h('button', { key: 'cspre-' + s,
                  onClick: function() { sfxClick(); updCG({ chessSelected: s }); },
                  className: 'px-2 py-0.5 rounded bg-white text-emerald-700 border border-emerald-300 font-mono hover:bg-emerald-50'
                }, s);
              })
            ),

            // ── Practice mode (skill drill) ──
            h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-3' },
              h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
                h('label', { className: 'text-xs font-bold text-amber-800 flex items-center gap-1 cursor-pointer' },
                  h('input', { type: 'checkbox', checked: chessPracticeOn,
                    onChange: function() { sfxClick(); updCG({ chessPracticeOn: !chessPracticeOn, chessChallenge: null, chessFeedback: null, chessChallengeInput: '' }); }
                  }),
                  '🎯 Practice mode — translate squares to notation'
                ),
                chessPracticeOn && h('span', { className: 'text-[11px] font-bold text-amber-700 ml-auto' },
                  '✓ ' + chessSolved + '  ·  🔥 ' + chessChallStreak
                )
              ),
              chessPracticeOn && !chessChallenge && h('button', {
                onClick: newChessChallenge,
                className: 'w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md'
              }, '▶ Start a challenge'),
              chessPracticeOn && chessChallenge && h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm font-bold text-amber-900' },
                  chessChallenge.type === 'name'
                    ? '🟢 What square is highlighted? Type the chess notation.'
                    : '🎯 Click the square at ' + chessChallenge.target + '.'
                ),
                chessChallenge.type === 'name' && !chessFeedback && h('div', { className: 'flex items-center gap-2' },
                  h('input', { type: 'text', value: chessChallengeInput, maxLength: 2,
                    onChange: function(e) { updCG({ chessChallengeInput: e.target.value.toLowerCase() }); },
                    onKeyDown: function(e) { if (e.key === 'Enter') submitChessName(); },
                    placeholder: 'e.g. f6',
                    'aria-label': 'Type the chess notation for the highlighted square',
                    className: 'flex-1 px-3 py-1.5 border-2 border-amber-400 rounded-lg text-sm font-mono uppercase text-center'
                  }),
                  h('button', { onClick: submitChessName,
                    className: 'px-4 py-1.5 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-800'
                  }, '✔ Check')
                ),
                chessFeedback && h('p', { className: 'text-sm font-bold ' + (chessFeedback.correct ? 'text-green-700' : 'text-red-600'), 'aria-live': 'polite' }, chessFeedback.msg),
                chessFeedback && h('button', { onClick: newChessChallenge,
                  className: 'text-xs font-bold text-amber-700 hover:underline'
                }, '➡ Next challenge')
              ),
              chessPracticeOn && h('p', { className: 'text-[10px] text-amber-700 italic mt-2' },
                'Alternates two directions: see-the-square name it, hear-the-name find it. 5 in a row earns the ♟️ Chess Master badge.'
              )
            ),

            h('p', { className: 'text-[11px] text-slate-600 italic' },
              '💡 Chess notation works because it pairs one number-system (letters as positions) with another (numbers as positions). The "name" of the square IS its coordinate, just written differently than (5, 4).'
            )
          );
        };

        // ── Battleship (10×10, ships placed once, click cells to call shots) ──
        var generateShips = function() {
          var sizes = [4, 3, 3, 2];
          var ships = [];
          var occupied = {};
          for (var s = 0; s < sizes.length; s++) {
            var size = sizes[s];
            var placed = false, attempts = 0;
            while (!placed && attempts < 200) {
              attempts++;
              var horizontal = Math.random() < 0.5;
              var x = Math.floor(Math.random() * (horizontal ? (10 - size + 1) : 10));
              var y = Math.floor(Math.random() * (horizontal ? 10 : (10 - size + 1)));
              var cells = [], conflict = false;
              for (var k = 0; k < size; k++) {
                var cx = horizontal ? x + k : x;
                var cy = horizontal ? y : y + k;
                if (occupied[cx + '_' + cy]) { conflict = true; break; }
                cells.push({ x: cx, y: cy });
              }
              if (!conflict) {
                cells.forEach(function(c) { occupied[c.x + '_' + c.y] = s; });
                ships.push({ size: size, cells: cells });
                placed = true;
              }
            }
          }
          return ships;
        };

        var startBattleship = function() {
          sfxClick();
          updCG({ bsShips: generateShips(), bsShots: [], bsWon: false, bsLastResult: '' });
          announceToSR('New battleship game started');
        };

        var renderBattleship = function() {
          var sz = 360, cells = 10, cell = sz / cells;
          var letters = ['A','B','C','D','E','F','G','H','I','J'];
          var notationFor = function(cx, cy) { return letters[cx] + (cy + 1); };

          if (!bsShips) {
            return h('div', { className: 'space-y-3' },
              h('p', { className: 'text-[11px] text-slate-700' },
                h('b', {}, 'Battleship: a coordinate-calling game. '),
                'I will hide 4 ships (sizes 4, 3, 3, 2) on a 10×10 grid. Letters A-J across, numbers 1-10 down. Call coordinates to find them. All ships sunk = you win.'
              ),
              h('div', { className: 'bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-center' },
                h('p', { className: 'text-sm font-bold text-emerald-800 mb-2' }, '⚓ Ready to play?'),
                h('button', {
                  onClick: startBattleship,
                  className: 'px-4 py-2 bg-emerald-700 text-white font-bold rounded-lg text-sm hover:bg-emerald-800 shadow-md transition-all'
                }, '▶ Start new game')
              )
            );
          }

          // Build lookup tables
          var hitMap = {}; // "x_y" → 'hit' | 'miss'
          bsShots.forEach(function(sh) {
            var key = sh.x + '_' + sh.y;
            hitMap[key] = sh.hit ? 'hit' : 'miss';
          });

          // Ship sunk status (a ship is sunk if all its cells are hit)
          var sunkShips = bsShips.map(function(ship) {
            return ship.cells.every(function(c) { return hitMap[c.x + '_' + c.y] === 'hit'; });
          });
          var totalSunk = sunkShips.filter(Boolean).length;
          var totalHits = bsShots.filter(function(s) { return s.hit; }).length;
          var totalShots = bsShots.length;
          var won = sunkShips.every(Boolean);

          if (won && !bsWon) {
            setTimeout(function() {
              var isNewBest = bsBest == null || totalShots < bsBest;
              var updates = { bsWon: true };
              if (isNewBest) updates.bsBest = totalShots;
              updCG(updates);
              sfxBadge();
              addToast(isNewBest
                ? '🏆 NEW BEST! All ships sunk in ' + totalShots + ' shots.'
                : '🏆 All ships sunk in ' + totalShots + ' shots! (best: ' + bsBest + ')',
                'success'
              );
              // Trigger badge check (in case Naval Strategist is newly earned)
              checkBadges({
                correct: exploreScore.correct, streak: streak, plotsSolved: plotsSolved,
                slopesSolved: slopesSolved, distanceSolved: distanceSolved,
                linesMade: linesMade, allQuadrants: hasAllQuadrants(gridPoints),
                aiAsked: _cg.aiAsked || 0,
                chessSolved: chessSolved, bsBest: isNewBest ? totalShots : bsBest, worldSolved: worldSolved
              });
            }, 0);
          }

          var fireAt = function(cx, cy) {
            var key = cx + '_' + cy;
            if (hitMap[key]) return; // already shot
            var hit = false;
            for (var si = 0; si < bsShips.length; si++) {
              if (bsShips[si].cells.some(function(c) { return c.x === cx && c.y === cy; })) { hit = true; break; }
            }
            if (hit) sfxCorrect(); else sfxWrong();
            var newShots = bsShots.concat([{ x: cx, y: cy, hit: hit }]);
            // Explicit coordinate translation: shows "B5 = column 2, row 5" alongside hit/miss
            var notation = notationFor(cx, cy);
            var translation = notation + ' = column ' + (cx + 1) + ', row ' + (cy + 1);
            var msg = (hit ? '💥 HIT at ' : '💧 Miss at ') + notation + '   (' + translation + ')';
            updCG({ bsShots: newShots, bsLastResult: msg });
            announceToSR(msg);
          };

          var squares = [];
          for (var ry = 0; ry < cells; ry++) {
            for (var cx = 0; cx < cells; cx++) {
              var key = cx + '_' + ry;
              var state = hitMap[key];
              var fillColor = '#dbeafe';
              if (state === 'hit') fillColor = '#fca5a5';
              else if (state === 'miss') fillColor = '#f1f5f9';
              // Show sunk ship cells in darker red
              if (state === 'hit') {
                for (var si2 = 0; si2 < bsShips.length; si2++) {
                  if (sunkShips[si2] && bsShips[si2].cells.some(function(c) { return c.x === cx && c.y === ry; })) {
                    fillColor = '#dc2626';
                  }
                }
              }
              squares.push(h('rect', {
                key: 'bs-' + cx + '-' + ry,
                x: cx * cell, y: ry * cell, width: cell, height: cell,
                fill: fillColor,
                stroke: '#0c4a6e', strokeWidth: 0.5,
                style: { cursor: state || won ? 'default' : 'crosshair', transition: 'fill 0.18s ease' },
                onClick: function(x, y) { return function() { if (!won) fireAt(x, y); }; }(cx, ry)
              }));
              if (state === 'hit') {
                squares.push(h('text', { key: 'bst-' + cx + '-' + ry,
                  x: cx * cell + cell / 2, y: ry * cell + cell / 2 + 5,
                  textAnchor: 'middle', fontSize: 16, style: { pointerEvents: 'none' }
                }, '💥'));
              } else if (state === 'miss') {
                squares.push(h('circle', { key: 'bsm-' + cx + '-' + ry,
                  cx: cx * cell + cell / 2, cy: ry * cell + cell / 2, r: 3,
                  fill: '#64748b', style: { pointerEvents: 'none' }
                }));
              }
            }
          }
          // Letter labels (top) and number labels (left)
          var labels = [];
          for (var i = 0; i < 10; i++) {
            labels.push(h('text', { key: 'bl-' + i, x: i * cell + cell / 2, y: -6, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: '#0c4a6e' }, letters[i]));
            labels.push(h('text', { key: 'bn-' + i, x: -8, y: i * cell + cell / 2 + 4, textAnchor: 'end', fontSize: 11, fontWeight: 'bold', fill: '#0c4a6e' }, i + 1));
          }

          // Splash animation on the most-recent shot (red for hit, blue for miss).
          // The React key includes bsShots.length so a new shot re-mounts the element
          // and the CSS animation replays.
          var splashEl = null;
          if (bsShots.length > 0) {
            var ls = bsShots[bsShots.length - 1];
            splashEl = h('circle', {
              key: 'splash-' + bsShots.length,
              cx: ls.x * cell + cell / 2,
              cy: ls.y * cell + cell / 2,
              r: 6,
              fill: 'none',
              stroke: ls.hit ? '#dc2626' : '#0ea5e9',
              strokeWidth: 3,
              className: 'allo-cg-splash'
            });
          }
          return h('div', { className: 'space-y-3' },
            h('div', { className: 'flex flex-wrap items-center gap-3' },
              h('p', { className: 'text-[11px] text-slate-700 flex-1' },
                h('b', {}, 'Call coordinates to find the ships. '),
                'Click any cell to fire. 💥 = hit, · = miss. A ship is sunk when all its cells are hit.'
              ),
              h('button', { onClick: startBattleship,
                className: 'px-3 py-1.5 bg-white text-emerald-700 border border-emerald-400 text-xs font-bold rounded hover:bg-emerald-50'
              }, '🔄 New game')
            ),
            h('div', { className: 'flex justify-center bg-white rounded-xl border-2 border-emerald-200 p-4' },
              h('svg', { width: sz + 30, height: sz + 30, viewBox: '-15 -15 ' + (sz + 30) + ' ' + (sz + 30),
                style: { background: 'transparent' }, role: 'img',
                'aria-label': 'Battleship grid, ' + totalShots + ' shots fired, ' + totalHits + ' hits, ' + totalSunk + ' of 4 ships sunk'
              }, squares, labels, splashEl)
            ),
            h('div', { className: 'grid grid-cols-4 gap-2' },
              h('div', { className: 'bg-emerald-50 rounded-lg p-2 border border-emerald-200 text-center' },
                h('p', { className: 'text-[10px] font-bold text-emerald-700 uppercase' }, 'Shots'),
                h('p', { className: 'text-xl font-bold text-emerald-900' }, totalShots)
              ),
              h('div', { className: 'bg-rose-50 rounded-lg p-2 border border-rose-200 text-center' },
                h('p', { className: 'text-[10px] font-bold text-rose-700 uppercase' }, 'Hits'),
                h('p', { className: 'text-xl font-bold text-rose-900' }, totalHits)
              ),
              h('div', { className: 'bg-slate-50 rounded-lg p-2 border border-slate-200 text-center' },
                h('p', { className: 'text-[10px] font-bold text-slate-700 uppercase' }, 'Accuracy'),
                h('p', { className: 'text-xl font-bold text-slate-900' }, totalShots > 0 ? Math.round(totalHits / totalShots * 100) + '%' : '—')
              ),
              h('div', { className: 'bg-amber-50 rounded-lg p-2 border border-amber-200 text-center' },
                h('p', { className: 'text-[10px] font-bold text-amber-700 uppercase' }, 'Ships sunk'),
                h('p', { className: 'text-xl font-bold text-amber-900' }, totalSunk + ' / 4')
              )
            ),
            bsBest != null && h('p', { className: 'text-[11px] text-center text-emerald-700 font-bold' },
              '🏆 Personal best: ' + bsBest + ' shots' + (bsBest <= 30 ? ' — Naval Strategist ⚓' : '')
            ),
            bsLastResult && h('p', { className: 'text-sm font-bold text-center', 'aria-live': 'polite' }, bsLastResult),
            won && h('div', { className: 'bg-emerald-50 rounded-xl p-3 border-2 border-emerald-400 text-center' },
              h('p', { className: 'text-base font-bold text-emerald-800' }, '🏆 Victory! All ships sunk in ' + totalShots + ' shots.'),
              h('p', { className: 'text-[11px] text-emerald-700 italic mt-1' }, 'Naval coordinates work the same way as math coordinates. Letter + number = a point on the grid.')
            )
          );
        };

        // ── World map (lat/long, equirectangular, city presets) ──
        var renderWorld = function() {
          var sz = 500, hh = 250, PAD = 20;
          var W = sz - 2 * PAD, H = hh - 2 * PAD;
          var cities = [
            { id: 'portland_me', name: 'Portland, ME',     lat: 43.66,  lon: -70.26, hint: 'Aaron is here!' },
            { id: 'nyc',         name: 'New York, NY',     lat: 40.71,  lon: -74.01 },
            { id: 'london',      name: 'London, UK',       lat: 51.51,  lon: -0.13 },
            { id: 'cairo',       name: 'Cairo, Egypt',     lat: 30.04,  lon: 31.24 },
            { id: 'tokyo',       name: 'Tokyo, Japan',     lat: 35.68,  lon: 139.69 },
            { id: 'sydney',      name: 'Sydney, Australia',lat: -33.87, lon: 151.21 },
            { id: 'rio',         name: 'Rio de Janeiro',   lat: -22.91, lon: -43.17 },
            { id: 'reykjavik',   name: 'Reykjavik, Iceland',lat: 64.13, lon: -21.94 },
            { id: 'cape_town',   name: 'Cape Town, S.Af',  lat: -33.92, lon: 18.42 },
            { id: 'quito',       name: 'Quito, Ecuador',   lat: -0.18,  lon: -78.47 },
            { id: 'mcmurdo',     name: 'McMurdo, Antarctica', lat: -77.85, lon: 166.67 }
          ];

          // Practice-mode helpers
          var newWorldChallenge = function() {
            var c = cities[Math.floor(Math.random() * cities.length)];
            sfxClick();
            updCG({
              worldChallenge: { lat: c.lat, lon: c.lon, cityName: c.name },
              worldFeedback: null,
              worldClickLat: null, worldClickLon: null
            });
            announceToSR('Find the place at latitude ' + c.lat + ', longitude ' + c.lon);
          };
          var resolveWorldChallenge = function(clickLat, clickLon) {
            if (!worldChallenge) return;
            // Tolerance: within 15° of target in both lat and lon = correct
            var dLat = Math.abs(clickLat - worldChallenge.lat);
            var dLon = Math.abs(clickLon - worldChallenge.lon);
            // Handle wrap-around for longitude (e.g. clicking at -179 when target is 179)
            if (dLon > 180) dLon = 360 - dLon;
            var ok = dLat <= 15 && dLon <= 15;
            var newSt = ok ? worldChallStreak + 1 : 0;
            var newSv = worldSolved + (ok ? 1 : 0);
            if (ok) { sfxCorrect(); if (newSt >= 3) sfxStreak(); } else { sfxWrong(); }
            announceToSR(ok ? 'Correct, that is near ' + worldChallenge.cityName : 'Off by ' + Math.round(dLat) + ' degrees lat, ' + Math.round(dLon) + ' degrees lon. The target was ' + worldChallenge.cityName);
            updCG({
              worldFeedback: { correct: ok,
                msg: ok
                  ? '✅ Correct! That is ' + worldChallenge.cityName + ' (off by ' + Math.round(dLat) + '° lat, ' + Math.round(dLon) + '° lon)'
                  : '❌ Off by ' + Math.round(dLat) + '° lat, ' + Math.round(dLon) + '° lon. The target was ' + worldChallenge.cityName
              },
              worldSolved: newSv,
              worldChallStreak: newSt,
              worldClickLat: clickLat, worldClickLon: clickLon
            });
            if (ok) awardXP('coordinate', 4, 'world coords');
            checkBadges({
              correct: exploreScore.correct, streak: streak, plotsSolved: plotsSolved,
              slopesSolved: slopesSolved, distanceSolved: distanceSolved,
              linesMade: linesMade, allQuadrants: hasAllQuadrants(gridPoints),
              aiAsked: _cg.aiAsked || 0,
              chessSolved: chessSolved, bsBest: bsBest, worldSolved: newSv
            });
          };
          var current = null;
          for (var i = 0; i < cities.length; i++) {
            if (cities[i].id === worldCity) { current = cities[i]; break; }
          }

          var toMapX = function(lon) { return PAD + ((lon + 180) / 360) * W; };
          var toMapY = function(lat) { return PAD + ((90 - lat) / 180) * H; };
          var fromMap = function(mx, my) {
            var lon = ((mx - PAD) / W) * 360 - 180;
            var lat = 90 - ((my - PAD) / H) * 180;
            return { lat: Math.round(lat * 10) / 10, lon: Math.round(lon * 10) / 10 };
          };

          // Stylized continent outlines (low-poly, approximate; for visual context only)
          // Each entry is a flat array of lat,lon vertex pairs
          var continents = [
            // North America (Alaska → E. Canada → Florida → Central America → Pacific)
            [72,-165, 72,-100, 73,-78, 60,-60, 45,-58, 35,-75, 25,-80, 18,-65, 8,-78, 9,-90, 16,-95, 22,-107, 32,-117, 50,-127, 60,-140, 70,-160],
            // South America
            [12,-72, 11,-60, 4,-50, -5,-35, -23,-42, -38,-58, -53,-68, -52,-72, -42,-74, -25,-71, -10,-78, 0,-80, 8,-78, 12,-72],
            // Africa
            [37,-7, 37,11, 33,30, 31,34, 12,43, 0,42, -12,40, -26,33, -34,25, -34,18, -22,12, -8,9, 5,1, 11,-15, 21,-17, 26,-12, 33,-9],
            // Eurasia (Europe + Asia + India)
            [38,-10, 50,-5, 60,5, 70,28, 75,55, 78,80, 76,105, 73,140, 66,170, 60,170, 55,160, 40,140, 30,120, 22,108, 8,98, 6,80, 22,68, 28,55, 32,35, 36,28, 42,28, 40,18, 38,10, 36,-2],
            // Australia
            [-10,142, -12,135, -12,124, -22,113, -34,116, -39,140, -34,150, -25,153, -16,145, -10,142],
            // British Isles (a small extra splash)
            [60,-8, 58,-2, 50,-5, 50,-10, 55,-9, 60,-8],
            // Greenland
            [83,-30, 78,-20, 70,-22, 60,-44, 70,-55, 78,-50, 83,-30],
            // Antarctica (simplified bottom strip)
            [-67,-180, -67,180, -85,180, -85,-180]
          ];
          var continentEls = continents.map(function(c, ci) {
            var d = '';
            for (var i = 0; i < c.length; i += 2) {
              var lat = c[i], lon = c[i + 1];
              d += (i === 0 ? 'M ' : 'L ') + toMapX(lon).toFixed(1) + ' ' + toMapY(lat).toFixed(1) + ' ';
            }
            d += 'Z';
            return h('path', { key: 'cont-' + ci, d: d,
              fill: '#d9f99d', opacity: 0.55, stroke: '#65a30d', strokeWidth: 0.6
            });
          });

          // Grid lines every 30°
          var gridLines = [];
          for (var lon = -180; lon <= 180; lon += 30) {
            var gx = toMapX(lon);
            gridLines.push(h('line', { key: 'gml-' + lon, x1: gx, y1: PAD, x2: gx, y2: PAD + H, stroke: lon === 0 ? '#475569' : '#cbd5e1', strokeWidth: lon === 0 ? 1.2 : 0.5 }));
            if (lon !== -180 && lon !== 180) {
              gridLines.push(h('text', { key: 'gmlt-' + lon, x: gx, y: PAD + H + 14, textAnchor: 'middle', fontSize: 9, fill: '#64748b' }, lon + '°'));
            }
          }
          for (var lat = -90; lat <= 90; lat += 30) {
            var gy = toMapY(lat);
            gridLines.push(h('line', { key: 'gpl-' + lat, x1: PAD, y1: gy, x2: PAD + W, y2: gy, stroke: lat === 0 ? '#475569' : '#cbd5e1', strokeWidth: lat === 0 ? 1.2 : 0.5 }));
            if (lat !== 90 && lat !== -90) {
              gridLines.push(h('text', { key: 'gplt-' + lat, x: PAD - 4, y: gy + 3, textAnchor: 'end', fontSize: 9, fill: '#64748b' }, lat + '°'));
            }
          }
          // Equator + prime meridian labels
          gridLines.push(h('text', { key: 'eq-lbl', x: PAD + 4, y: toMapY(0) - 3, fontSize: 9, fill: '#475569', fontStyle: 'italic' }, 'Equator (lat 0°)'));
          gridLines.push(h('text', { key: 'pm-lbl', x: toMapX(0) + 3, y: PAD + 12, fontSize: 9, fill: '#475569', fontStyle: 'italic' }, 'Prime meridian (lon 0°)'));

          var cityDots = cities.map(function(c) {
            var active = c.id === worldCity;
            return h('g', { key: 'city-' + c.id,
              style: { cursor: 'pointer' },
              onClick: function() { sfxClick(); updCG({ worldCity: c.id, worldClickLat: null, worldClickLon: null }); announceToSR(c.name + ' at latitude ' + c.lat + ', longitude ' + c.lon); }
            },
              h('circle', { cx: toMapX(c.lon), cy: toMapY(c.lat), r: active ? 6 : 3.5, fill: active ? '#10b981' : '#0891b2', stroke: '#fff', strokeWidth: active ? 2.5 : 1.5,
                style: { transition: 'r 0.18s ease' }
              }),
              active && h('text', { x: toMapX(c.lon) + 9, y: toMapY(c.lat) - 7, fontSize: 11, fontWeight: 'bold', fill: '#065f46' }, c.name)
            );
          });

          // User-clicked point
          var clickEl = null;
          if (worldClickLat != null && worldClickLon != null) {
            clickEl = h('g', { key: 'click-pt' },
              h('circle', { cx: toMapX(worldClickLon), cy: toMapY(worldClickLat), r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }),
              h('text', { x: toMapX(worldClickLon) + 8, y: toMapY(worldClickLat) + 3, fontSize: 10, fontWeight: 'bold', fill: '#b45309' }, '(' + worldClickLat + '°, ' + worldClickLon + '°)')
            );
          }

          return h('div', { className: 'space-y-3' },
            h('p', { className: 'text-[11px] text-slate-700' },
              h('b', {}, 'Latitude and longitude: Earth’s coordinate system. '),
              'Lat tells you how far north/south of the equator (0° to 90°, N positive, S negative). Lon tells you how far east/west of the prime meridian (−180° to 180°). Every place on Earth has two numbers.'
            ),
            h('div', { className: 'flex justify-center bg-white rounded-xl border-2 border-emerald-200 p-4' },
              h('svg', { width: sz, height: hh,
                style: { background: 'linear-gradient(180deg, #e0f2fe 0%, #ddd6fe 100%)', cursor: 'crosshair', borderRadius: 8 },
                role: 'img',
                'aria-label': 'World map showing ' + (current ? current.name + ' at ' + current.lat + ' degrees, ' + current.lon + ' degrees' : 'cities'),
                onClick: function(e) {
                  var rect = e.currentTarget.getBoundingClientRect();
                  var mx = (e.clientX - rect.left) * (sz / rect.width);
                  var my = (e.clientY - rect.top) * (hh / rect.height);
                  if (mx < PAD || mx > PAD + W || my < PAD || my > PAD + H) return;
                  var coord = fromMap(mx, my);
                  // If practice + challenge active and no feedback yet, treat as answer
                  if (worldPracticeOn && worldChallenge && !worldFeedback) {
                    resolveWorldChallenge(coord.lat, coord.lon);
                    return;
                  }
                  sfxClick();
                  updCG({ worldClickLat: coord.lat, worldClickLon: coord.lon });
                  announceToSR('Clicked at latitude ' + coord.lat + ', longitude ' + coord.lon);
                }
              },
                h('rect', { x: PAD, y: PAD, width: W, height: H, fill: 'rgba(255,255,255,0.5)', stroke: '#475569', strokeWidth: 1 }),
                continentEls,
                gridLines,
                cityDots,
                clickEl
              )
            ),
            current && h('div', { className: 'bg-emerald-50 rounded-lg p-3 border border-emerald-200 grid grid-cols-2 md:grid-cols-4 gap-2 text-center' },
              h('div', {},
                h('p', { className: 'text-[10px] font-bold text-emerald-700 uppercase' }, 'City'),
                h('p', { className: 'text-sm font-bold text-emerald-900' }, current.name)
              ),
              h('div', {},
                h('p', { className: 'text-[10px] font-bold text-emerald-700 uppercase' }, 'Latitude'),
                h('p', { className: 'text-sm font-bold font-mono text-emerald-900' }, current.lat + '°' + (current.lat > 0 ? ' N' : current.lat < 0 ? ' S' : ''))
              ),
              h('div', {},
                h('p', { className: 'text-[10px] font-bold text-emerald-700 uppercase' }, 'Longitude'),
                h('p', { className: 'text-sm font-bold font-mono text-emerald-900' }, current.lon + '°' + (current.lon > 0 ? ' E' : current.lon < 0 ? ' W' : ''))
              ),
              h('div', {},
                h('p', { className: 'text-[10px] font-bold text-emerald-700 uppercase' }, 'Hemisphere'),
                h('p', { className: 'text-sm font-bold text-emerald-900' }, (current.lat >= 0 ? 'N' : 'S') + ' / ' + (current.lon >= 0 ? 'E' : 'W'))
              )
            ),
            current && current.hint && h('p', { className: 'text-[11px] text-emerald-700 italic text-center' }, '💡 ' + current.hint),
            h('div', { className: 'flex flex-wrap gap-1' },
              h('span', { className: 'text-[11px] font-bold text-emerald-700 self-center mr-1' }, 'Cities:'),
              cities.map(function(c) {
                return h('button', { key: 'wcb-' + c.id,
                  onClick: function() { sfxClick(); updCG({ worldCity: c.id, worldClickLat: null, worldClickLon: null }); },
                  className: 'px-2 py-0.5 rounded text-[11px] font-bold transition-all ' +
                    (c.id === worldCity ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50')
                }, c.name.split(',')[0]);
              })
            ),
            worldClickLat != null && !worldFeedback && h('p', { className: 'text-[11px] text-amber-700 text-center italic' },
              '🎯 You clicked: ' + worldClickLat + '° lat, ' + worldClickLon + '° lon. ' +
              (worldClickLat >= 0 ? 'Northern' : 'Southern') + ' hemisphere, ' + (worldClickLon >= 0 ? 'Eastern' : 'Western') + ' hemisphere.'
            ),

            // ── Practice mode (skill drill) ──
            h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-3' },
              h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
                h('label', { className: 'text-xs font-bold text-amber-800 flex items-center gap-1 cursor-pointer' },
                  h('input', { type: 'checkbox', checked: worldPracticeOn,
                    onChange: function() { sfxClick(); updCG({ worldPracticeOn: !worldPracticeOn, worldChallenge: null, worldFeedback: null, worldClickLat: null, worldClickLon: null }); }
                  }),
                  '🎯 Practice mode — find the place from its coordinates'
                ),
                worldPracticeOn && h('span', { className: 'text-[11px] font-bold text-amber-700 ml-auto' },
                  '✓ ' + worldSolved + '  ·  🔥 ' + worldChallStreak
                )
              ),
              worldPracticeOn && !worldChallenge && h('button', {
                onClick: newWorldChallenge,
                className: 'w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md'
              }, '▶ Start a challenge'),
              worldPracticeOn && worldChallenge && h('div', { className: 'space-y-2' },
                h('p', { className: 'text-sm font-bold text-amber-900' },
                  '🌎 Click the place at ',
                  h('span', { className: 'font-mono bg-white px-2 py-0.5 rounded border border-amber-300' },
                    worldChallenge.lat + '° lat, ' + worldChallenge.lon + '° lon'
                  ),
                  h('span', { className: 'text-[11px] font-normal text-amber-700 ml-1' },
                    '(' + (worldChallenge.lat >= 0 ? 'N' : 'S') + ' / ' + (worldChallenge.lon >= 0 ? 'E' : 'W') + ' hemisphere)'
                  )
                ),
                !worldFeedback && h('p', { className: 'text-[10px] text-amber-700 italic' },
                  'Click on the map above. Within 15° of the target counts as correct.'
                ),
                worldFeedback && h('p', { className: 'text-sm font-bold ' + (worldFeedback.correct ? 'text-green-700' : 'text-red-600'), 'aria-live': 'polite' }, worldFeedback.msg),
                worldFeedback && h('button', { onClick: newWorldChallenge,
                  className: 'text-xs font-bold text-amber-700 hover:underline'
                }, '➡ Next place')
              ),
              worldPracticeOn && h('p', { className: 'text-[10px] text-amber-700 italic mt-2' },
                'Trains spatial reasoning: lat/lon to a position on the planet. 5 correct earns the 🌍 World Geographer badge.'
              )
            ),

            h('p', { className: 'text-[11px] text-slate-600 italic' },
              '💡 Every (lat, lon) pair is a coordinate just like (x, y), just at planetary scale. Negative lat = south, negative lon = west. GPS, weather maps, ship navigation — all the same idea.'
            )
          );
        };

        var scenarios = [
          { id: 'chess',      icon: '♟', label: 'Chess' },
          { id: 'battleship', icon: '⚓', label: 'Battleship' },
          { id: 'world',      icon: '🌍', label: 'Lat / Long' }
        ];

        return h('div', { className: 'space-y-4 allo-cg-bg-maps' },
          // Scenario selector
          h('div', { className: 'flex gap-1 bg-emerald-50 rounded-xl p-1 border border-emerald-200', role: 'tablist', 'aria-label': 'Real-world coordinate scenarios' },
            scenarios.map(function(s) {
              return h('button', {
                key: 'mscen-' + s.id,
                onClick: function() { sfxClick(); updCG({ mapScenario: s.id }); },
                role: 'tab',
                'aria-selected': mapScenario === s.id,
                className: 'flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ' +
                  (mapScenario === s.id ? 'bg-white text-emerald-800 shadow-sm' : 'text-emerald-600 hover:text-emerald-800')
              }, s.icon + ' ' + s.label);
            })
          ),

          // Active scenario
          mapScenario === 'chess' && renderChess(),
          mapScenario === 'battleship' && renderBattleship(),
          mapScenario === 'world' && renderWorld(),

          // Bottom pedagogy
          h('details', { className: 'bg-white rounded-xl border border-emerald-200 p-3' },
            h('summary', { className: 'text-xs font-bold text-emerald-700 cursor-pointer' }, '💡 Why these are all coordinate planes'),
            h('div', { className: 'mt-2 space-y-2 text-xs text-slate-700' },
              h('p', {}, h('b', {}, 'Chess: letters + numbers. '), 'The file letter a-h is column 1-8. The rank number is row 1-8. e4 = (5, 4) underneath.'),
              h('p', {}, h('b', {}, 'Battleship: letters + numbers. '), 'Identical structure to chess. Letter for column, number for row. B5 = (2, 5).'),
              h('p', {}, h('b', {}, 'Latitude + longitude: degrees north/south + degrees east/west. '), 'Same two-number-pair idea, scaled to a sphere. Portland, Maine is at (43.66°N, 70.26°W). GPS, weather, ship navigation: all coordinates.'),
              h('p', {}, h('b', {}, 'The underlying idea: '), 'every grid system in the world is a (first-number, second-number) pair. Once a student sees that chess notation and (x, y) are the same thing, the algebra grid stops feeling alien.')
            )
          )
        );
      };

      // ══════════ MAIN RENDER ══════════
      return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
        // Header
        h('div', { className: 'flex items-center gap-3 mb-2' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg transition-colors', 'aria-label': 'Back to tools' },
            h(ArrowLeft, { size: 18, className: 'text-slate-600' })),
          h('h3', { className: 'text-lg font-bold text-cyan-800' }, '\uD83D\uDCCD Coordinate Grid'),
          h('div', { className: 'ml-auto flex items-center gap-3' },
            streak > 0 && h('span', { className: 'text-xs font-bold text-orange-600' }, '\uD83D\uDD25 ' + streak),
            bestStreak > 0 && h('span', { className: 'text-[11px] text-slate-600' }, 'Best: ' + bestStreak),
            h('span', { className: 'text-xs font-bold text-emerald-600' }, exploreScore.correct + '/' + exploreScore.total),
            h('button', { onClick: function() {
                var snap = { id: 'snap-' + Date.now(), tool: 'coordinate', label: 'Grid: ' + gridPoints.length + ' points', data: { points: gridPoints.slice() }, timestamp: Date.now() };
                setToolSnapshots(function(prev) { return prev.concat([snap]); });
                sfxClick();
                addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
              },
              'aria-label': 'Save snapshot',
              className: 'text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-400 rounded-full px-2 py-0.5 transition-all'
            }, '\uD83D\uDCF8'),
            h('button', {
              onClick: function() {
                var next = !muted;
                updCG({ muted: next });
                if (!next) { setTimeout(function() { playTone(660, 0.08, 'sine', 0.08); }, 0); }
                announceToSR(next ? 'Sound muted' : 'Sound on');
              },
              'aria-label': muted ? 'Unmute sound effects' : 'Mute sound effects',
              'aria-pressed': muted,
              title: muted ? 'Unmute (sounds are off)' : 'Mute (sounds are on)',
              className: 'p-1 rounded-md text-base hover:bg-slate-100 transition-colors ' + (muted ? 'text-slate-400' : 'text-cyan-700')
            }, muted ? '\uD83D\uDD07' : '\uD83D\uDD0A'),
            h('button', {
              onClick: function() {
                sfxClick();
                setGridPoints([]);
                setGridChallenge(null);
                setGridFeedback(null);
                updCG({
                  streak: 0,
                  qtPointX: 3, qtPointY: 2, qtFocusedQuad: null, qtWalkPhase: 0,
                  qtShowReflections: true,
                  mapScenario: 'chess', chessSelected: 'e4', chessInput: '',
                  bsShips: null, bsShots: [], bsWon: false, bsLastResult: '',
                  worldCity: 'portland_me', worldClickLat: null, worldClickLon: null,
                  chessPracticeOn: false, chessChallenge: null, chessChallengeInput: '', chessFeedback: null,
                  worldPracticeOn: false, worldChallenge: null, worldFeedback: null,
                  funcsOn: false, funcInput: '', funcs: []
                  // Note: chessSolved, worldSolved, bsBest, chessChallStreak, worldChallStreak persist across resets
                });
                announceToSR('Coordinate grid reset to defaults');
              },
              'aria-label': 'Reset everything',
              title: 'Reset all points, lines, and quadrant tour',
              className: 'px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all'
            }, '\u21BA Reset')
          )
        ),

        // Tab bar
        h('div', { className: 'flex gap-1 bg-cyan-50 rounded-xl p-1 border border-cyan-200', role: 'tablist', 'aria-label': 'Coordinate Grid sections' },
          [
            { id: 'explore', icon: '\uD83D\uDCCD', label: 'Explore' },
            { id: 'quadrants', icon: '\uD83D\uDDFA', label: 'Quadrant Tour' },
            { id: 'maps', icon: '\uD83C\uDF10', label: 'Real-World Maps' }
          ].map(function(t2) {
            return h('button', {
              key: 't-' + t2.id,
              onClick: function() { sfxClick(); updCG({ cgTab: t2.id }); },
              role: 'tab',
              'aria-selected': cgTab === t2.id,
              className: 'flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ' +
                (cgTab === t2.id ? 'bg-white text-cyan-800 shadow-sm' : 'text-cyan-600 hover:text-cyan-800')
            }, t2.icon + ' ' + t2.label);
          })
        ),

        // EXPLORE TAB content (wraps existing grid + tools + challenges + stats)
        cgTab === 'explore' && h('div', { className: 'space-y-4 allo-cg-bg-explore' },

        // SVG Grid
        h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-4 flex justify-center' },
          h('svg', { width: gridW, height: gridH, onClick: handleGridClick, onTouchStart: handleGridTouch, className: 'cursor-crosshair', style: { background: '#f8fafc', touchAction: 'none' } },
            gridElements,
            funcElements,
            lineElements,
            slopeChallengeElements,
            distChallengeElements,
            pointElements,
            labelElements
          )
        ),

        // Core Tools
        h('div', { className: 'flex gap-2 flex-wrap' },
          h('button', { onClick: function() {
              sfxClick();
              if (connectMode) { setGridFeedback(null); } else { setGridFeedback({ connectMode: true, lines: gridLines, connectFirst: null }); }
              setGridChallenge(null);
            },
            className: 'flex-1 py-2 font-bold rounded-lg text-sm transition-all shadow-md ' + (connectMode ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600')
          }, connectMode ? '\u2714 Connect ON' : '\uD83D\uDD17 Connect Points'),
          h('button', { 'aria-label': 'Clear',
            onClick: function() { setGridPoints([]); setGridChallenge(null); setGridFeedback(null); },
            className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all'
          }, '\u21BA Clear')
        ),

        // Challenge Modes
        h('div', { className: 'space-y-2' },
          h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider' }, '\uD83C\uDFAF Challenges'),
          h('div', { className: 'flex gap-2 flex-wrap' },
            h('button', { 'aria-label': 'Plot a Point',
              onClick: function() {
                sfxClick();
                var tx = -8 + Math.floor(Math.random() * 17);
                var ty = -8 + Math.floor(Math.random() * 17);
                setGridChallenge({ type: 'plot', target: { x: tx, y: ty } });
                setGridPoints([]); setGridFeedback(null);
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-cyan-600 hover:to-teal-600 transition-all shadow-md'
            }, '\uD83D\uDCCD Plot a Point'),
            h('button', { 'aria-label': 'Find Slope',
              onClick: function() {
                sfxClick();
                var x1 = -6 + Math.floor(Math.random() * 13); var y1 = -6 + Math.floor(Math.random() * 13);
                var x2 = x1, y2 = y1;
                while (x2 === x1 && y2 === y1) { x2 = -6 + Math.floor(Math.random() * 13); y2 = -6 + Math.floor(Math.random() * 13); }
                var p1 = { x: x1, y: y1 }; var p2 = { x: x2, y: y2 };
                setGridChallenge({ type: 'slope', p1: p1, p2: p2, slopeData: calcSlope(p1, p2) });
                setGridPoints([p1, p2]); setGridFeedback({ slopeAnswer: '' });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md'
            }, '\uD83D\uDCCF Find Slope'),
            h('button', { 'aria-label': 'Find Distance',
              onClick: function() {
                sfxClick();
                var x1 = -6 + Math.floor(Math.random() * 13); var y1 = -6 + Math.floor(Math.random() * 13);
                var x2 = x1, y2 = y1;
                while (x2 === x1 && y2 === y1) { x2 = -6 + Math.floor(Math.random() * 13); y2 = -6 + Math.floor(Math.random() * 13); }
                var p1 = { x: x1, y: y1 }; var p2 = { x: x2, y: y2 };
                var dist = calcDistance(p1, p2);
                setGridChallenge({ type: 'distance', p1: p1, p2: p2, distance: Math.round(dist * 10) / 10 });
                setGridPoints([p1, p2]); setGridFeedback({ distanceAnswer: '' });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg text-sm hover:from-green-600 hover:to-emerald-600 transition-all shadow-md'
            }, '\uD83D\uDCCF Find Distance')
          )
        ),

        // Slope challenge UI
        slopeChallenge && h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
          h('p', { className: 'text-sm font-bold text-amber-800 mb-2' }, '\uD83D\uDCCF Find the slope: (' + gridChallenge.p1.x + ',' + gridChallenge.p1.y + ') \u2192 (' + gridChallenge.p2.x + ',' + gridChallenge.p2.y + ')'),
          h('p', { className: 'text-[11px] text-amber-600 mb-2 italic' }, 'Fill in rise (\u0394y), run (\u0394x), then slope (m = rise/run)'),
          h('div', { className: 'grid grid-cols-3 gap-2 mb-2' },
            h('div', { className: 'flex flex-col gap-1' },
              h('label', { className: 'text-[11px] font-bold text-red-600 uppercase' }, 'Rise (\u0394y)'),
              h('input', { type: 'number', placeholder: '?', 'aria-label': 'Rise (delta y) — vertical change', value: (gridFeedback && gridFeedback.riseAnswer) || '', onChange: function(e) { setGridFeedback(function(prev) { return Object.assign({}, prev, { riseAnswer: e.target.value }); }); }, disabled: gridFeedback && gridFeedback.hinted, className: 'px-2 py-1.5 border-2 border-red-600 rounded-lg text-sm font-bold text-center focus:border-red-400 ' + ((gridFeedback && gridFeedback.hinted) ? ' bg-red-50 text-red-400' : '') })
            ),
            h('div', { className: 'flex flex-col gap-1' },
              h('label', { className: 'text-[11px] font-bold text-blue-600 uppercase' }, 'Run (\u0394x)'),
              h('input', { type: 'number', placeholder: '?', 'aria-label': 'Run (delta x) — horizontal change', value: (gridFeedback && gridFeedback.runAnswer) || '', onChange: function(e) { setGridFeedback(function(prev) { return Object.assign({}, prev, { runAnswer: e.target.value }); }); }, disabled: gridFeedback && gridFeedback.hinted, className: 'px-2 py-1.5 border-2 border-blue-600 rounded-lg text-sm font-bold text-center focus:border-blue-400 ' + ((gridFeedback && gridFeedback.hinted) ? ' bg-blue-50 text-blue-400' : '') })
            ),
            h('div', { className: 'flex flex-col gap-1' },
              h('label', { className: 'text-[11px] font-bold text-amber-700 uppercase' }, 'Slope (m)'),
              h('input', { type: 'text', placeholder: 'e.g. 2/3', 'aria-label': 'Slope as a fraction (example: 2/3)', value: (gridFeedback && gridFeedback.slopeAnswer) || '', onChange: function(e) { setGridFeedback(function(prev) { return Object.assign({}, prev, { slopeAnswer: e.target.value }); }); }, onKeyDown: function(e) { if (e.key === 'Enter') checkGrid(); }, className: 'px-2 py-1.5 border-2 border-amber-600 rounded-lg text-sm font-bold text-center focus:border-amber-500 ' })
            )
          ),
          h('div', { className: 'flex gap-2 items-center' },
            !(gridFeedback && gridFeedback.hinted) && h('button', { 'aria-label': 'Hint', onClick: function() { setGridFeedback(function(prev) { return Object.assign({}, prev, { hinted: true, riseAnswer: String(gridChallenge.slopeData.rise), runAnswer: String(gridChallenge.slopeData.run) }); }); }, className: 'px-3 py-1.5 bg-amber-100 text-amber-700 font-bold rounded-lg text-[11px] hover:bg-amber-200 transition-all border border-amber-600' }, '\uD83D\uDCA1 Hint'),
            (gridFeedback && gridFeedback.hinted) && h('span', { className: 'text-[11px] text-amber-500 italic' }, '\uD83D\uDCA1 Hint used'),
            h('button', { 'aria-label': 'Check', onClick: checkGrid, className: 'ml-auto px-4 py-1.5 bg-amber-700 text-white font-bold rounded-lg text-sm hover:bg-amber-600' }, '\u2714 Check')
          ),
          gridFeedback && gridFeedback.msg && h('p', { className: 'text-sm font-bold mt-2 ' + (gridFeedback.correct ? 'text-green-600' : 'text-red-600') }, gridFeedback.msg)
        ),

        // Distance challenge UI
        distanceChallenge && h('div', { className: 'bg-green-50 rounded-lg p-3 border border-green-200' },
          h('p', { className: 'text-sm font-bold text-green-800 mb-2' }, '\uD83D\uDCCF Find the distance: (' + gridChallenge.p1.x + ',' + gridChallenge.p1.y + ') to (' + gridChallenge.p2.x + ',' + gridChallenge.p2.y + ')'),
          h('p', { className: 'text-[11px] text-green-600 mb-2 italic' }, '\uD83D\uDCA1 d = \u221A((x\u2082\u2212x\u2081)\u00B2 + (y\u2082\u2212y\u2081)\u00B2)  \u2014 Round to 1 decimal place'),
          h('div', { className: 'flex gap-2 items-center' },
            h('input', {
              type: 'number', step: '0.1', placeholder: 'Distance = ?',
              value: (gridFeedback && gridFeedback.distanceAnswer) || '',
              onChange: function(e) { setGridFeedback(function(prev) { return Object.assign({}, prev, { distanceAnswer: e.target.value }); }); },
              onKeyDown: function(e) { if (e.key === 'Enter') checkGrid(); },
              className: 'flex-1 px-3 py-2 border border-green-600 rounded-lg text-sm font-mono'
            }),
            h('button', { 'aria-label': 'Check', onClick: checkGrid, className: 'px-4 py-2 bg-green-700 text-white font-bold rounded-lg text-sm hover:bg-green-700' }, '\u2714 Check')
          ),
          // Show midpoint info
          h('div', { className: 'mt-2 text-xs text-purple-600' },
            '\uD83D\uDCCD Midpoint: (' + ((gridChallenge.p1.x + gridChallenge.p2.x) / 2) + ', ' + ((gridChallenge.p1.y + gridChallenge.p2.y) / 2) + ')'
          ),
          gridFeedback && gridFeedback.msg && h('p', { className: 'text-sm font-bold mt-2 ' + (gridFeedback.correct ? 'text-green-600' : 'text-red-600') }, gridFeedback.msg)
        ),

        // Plot challenge UI
        gridChallenge && gridChallenge.type === 'plot' && h('div', { className: 'bg-cyan-50 rounded-lg p-3 border border-cyan-200' },
          h('p', { className: 'text-sm font-bold text-cyan-800 mb-2' }, '\uD83D\uDCCD Plot (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ')'),
          h('div', { className: 'flex gap-2 items-center' },
            h('span', { className: 'text-xs text-cyan-600' }, 'Quadrant: ', h('span', { className: 'font-bold' }, getQuadrant(gridChallenge.target.x, gridChallenge.target.y))),
            h('span', { className: 'text-xs text-cyan-600 ml-2' }, 'Points: ', h('span', { className: 'font-bold' }, gridPoints.length)),
            h('button', { 'aria-label': 'Check', onClick: checkGrid, className: 'ml-auto px-4 py-1.5 bg-cyan-700 text-white font-bold rounded-lg text-sm hover:bg-cyan-600' }, '\u2714 Check')
          ),
          gridFeedback && gridFeedback.msg && h('p', { className: 'text-sm font-bold mt-2 ' + (gridFeedback.correct ? 'text-green-600' : 'text-red-600') }, gridFeedback.msg)
        ),

        // Connect mode info
        connectMode && h('div', { className: 'bg-indigo-50 rounded-lg p-3 border border-indigo-200' },
          h('p', { className: 'text-sm font-bold text-indigo-700 mb-1' }, '\uD83D\uDD17 Connect Mode'),
          h('p', { className: 'text-xs text-indigo-600' }, connectFirst != null ? 'Click a second point to draw a line.' : 'Click any point on the grid to start.'),
          gridLines.length > 0 && h('div', { className: 'mt-2 space-y-1' },
            gridLines.map(function(ln, li) {
              var eq = calcLineEq(ln.from, ln.slope);
              var dist = calcDistance(ln.from, ln.to);
              var mid = calcMidpoint(ln.from, ln.to);
              return h('div', { key: li, className: 'flex items-center gap-2 text-[11px] bg-white rounded px-2 py-1 border flex-wrap' },
                h('span', { className: 'font-bold text-indigo-600' }, '(' + ln.from.x + ',' + ln.from.y + ') \u2192 (' + ln.to.x + ',' + ln.to.y + ')'),
                h('span', { className: 'font-bold text-indigo-800' }, 'm=' + ln.slope.display),
                h('span', { className: 'text-green-600' }, 'd=' + dist.toFixed(1)),
                h('span', { className: 'text-purple-600' }, 'M(' + mid.x + ',' + mid.y + ')'),
                h('span', { className: 'ml-auto text-[11px] font-mono text-indigo-400' }, eq)
              );
            })
          ),
          h('button', { 'aria-label': 'Clear Lines', onClick: function() { setGridFeedback(function(prev) { return Object.assign({}, prev, { lines: [], connectFirst: null }); }); }, className: 'mt-2 px-3 py-1 text-[11px] font-bold bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200' }, '\uD83D\uDDD1 Clear Lines')
        ),

        // Function plotting panel
        h('div', { className: 'bg-indigo-50 rounded-xl p-3 border border-indigo-200' },
          h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
            h('label', { className: 'text-xs font-bold text-indigo-800 flex items-center gap-1 cursor-pointer' },
              h('input', { type: 'checkbox', checked: funcsOn,
                onChange: function() { sfxClick(); updCG({ funcsOn: !funcsOn }); }
              }),
              '📈 Plot functions on the grid'
            ),
            funcsOn && h('span', { className: 'text-[11px] text-indigo-700 ml-auto' }, funcs.length + ' plotted')
          ),
          funcsOn && h('div', { className: 'space-y-2' },
            h('div', { className: 'flex items-center gap-1' },
              h('span', { className: 'text-sm font-bold text-indigo-700 font-mono' }, 'y ='),
              h('input', { type: 'text', value: funcInput,
                onChange: function(e) { updCG({ funcInput: e.target.value }); },
                onKeyDown: function(e) { if (e.key === 'Enter') addFunc(funcInput); },
                placeholder: 'e.g. 2x+1, x^2, -0.5x+3',
                'aria-label': 'Function expression in x',
                className: 'flex-1 px-2 py-1 border border-indigo-400 rounded text-sm font-mono'
              }),
              h('button', { onClick: function() { addFunc(funcInput); },
                'aria-label': 'Add function to the grid',
                className: 'px-3 py-1 bg-indigo-700 text-white text-xs font-bold rounded hover:bg-indigo-800 transition-all'
              }, '+ Add')
            ),
            h('div', { className: 'flex flex-wrap gap-1' },
              h('span', { className: 'text-[10px] font-bold text-indigo-700 self-center mr-1' }, 'Presets:'),
              ['x', '2x+1', '-x+3', '0.5x-2', 'x^2', '-x^2+4'].map(function(p) {
                return h('button', { key: 'fpre-' + p,
                  onClick: function() { addFunc(p); },
                  className: 'px-2 py-0.5 rounded text-[11px] font-mono bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-100'
                }, 'y = ' + p);
              })
            ),
            funcs.length > 0 && h('div', { className: 'space-y-1' },
              funcs.map(function(f) {
                return h('div', { key: 'fitem-' + f.id, className: 'flex items-center gap-2 bg-white rounded px-2 py-1 border border-indigo-100' },
                  h('span', { className: 'inline-block w-3 h-3 rounded-full flex-shrink-0', style: { backgroundColor: f.color } }),
                  h('span', { className: 'text-xs font-mono font-bold flex-1', style: { color: f.color, opacity: f.visible ? 1 : 0.4 } }, 'y = ' + f.expr),
                  h('button', { onClick: function() { toggleFunc(f.id); }, 'aria-label': f.visible ? 'Hide function' : 'Show function',
                    className: 'text-[11px] text-slate-600 hover:text-slate-900 px-1.5 py-0.5 rounded hover:bg-slate-100'
                  }, f.visible ? '👁' : '🚫'),
                  h('button', { onClick: function() { removeFunc(f.id); }, 'aria-label': 'Remove function',
                    className: 'text-sm text-rose-600 hover:text-rose-800 px-1.5 py-0.5 rounded hover:bg-rose-50 font-bold leading-none'
                  }, '×')
                );
              })
            ),
            h('p', { className: 'text-[10px] text-indigo-700 italic' },
              'Try: 2x+1 (linear, slope 2), -x+3 (negative slope, y-intercept 3), x^2 (parabola), 0.5x-2 (fractional slope). Use ^ for exponents.'
            )
          )
        ),

        // Stats
        h('div', { className: 'grid grid-cols-3 gap-3' },
          h('div', { className: 'bg-white rounded-xl p-3 border border-cyan-100 text-center' },
            h('div', { className: 'text-xs font-bold text-cyan-600 uppercase mb-1' }, 'Points'),
            h('div', { className: 'text-2xl font-bold text-cyan-800' }, gridPoints.length)
          ),
          h('div', { className: 'bg-white rounded-xl p-3 border border-cyan-100 text-center' },
            h('div', { className: 'text-xs font-bold text-cyan-600 uppercase mb-1' }, 'Lines'),
            h('div', { className: 'text-2xl font-bold text-cyan-800' }, gridLines.length)
          ),
          h('div', { className: 'bg-white rounded-xl p-3 border border-cyan-100 text-center' },
            h('div', { className: 'text-xs font-bold text-cyan-600 uppercase mb-1' }, 'Quadrants'),
            h('div', { className: 'text-sm font-bold text-cyan-700' },
              gridPoints.length > 0
                ? (function() {
                    var qs = {};
                    gridPoints.forEach(function(p) { var q = getQuadrant(p.x, p.y); qs[q] = (qs[q] || 0) + 1; });
                    return Object.keys(qs).join(', ');
                  })()
                : '\u2014'
            )
          )
        )
        ), // \u2500\u2500 end of Explore tab wrapper \u2500\u2500

        // QUADRANT TOUR TAB content
        cgTab === 'quadrants' && renderQuadrantTour(),

        // REAL-WORLD MAPS TAB content
        cgTab === 'maps' && renderRealWorldMaps(),

        // Badges (shared across tabs)
        renderBadges(),

        // AI Tutor toggle + panel
        !showAITutor && h('button', { 'aria-label': 'AI Tutor',
          onClick: function() { sfxClick(); updCG({ showAITutor: true }); },
          className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-600 hover:bg-sky-100 transition-all'
        }, '\uD83E\uDD16 AI Tutor'),
        renderAITutor(),

        // Keyboard hints
        h('div', { className: 'text-center text-[11px] text-slate-600 mt-2' },
          '\u2328\uFE0F C: connect mode | R: clear | ?: AI tutor'
        )
      );
    }
  });
})();
