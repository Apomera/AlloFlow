// ═══════════════════════════════════════════
// stem_tool_coordgrid.js — Coordinate Grid Plugin (Enhanced v2)
// Plot points, connect lines, calculate slope, distance, midpoint
// + sound effects, 10 badges, AI tutor, distance challenge,
//   keyboard shortcuts, enhanced stats
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

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

      // ── State from ctx (hosted in parent) ──
      var gridPoints = ctx.gridPoints || [];
      var setGridPoints = ctx.setGridPoints;
      var gridChallenge = ctx.gridChallenge || null;
      var setGridChallenge = ctx.setGridChallenge;
      var gridFeedback = ctx.gridFeedback || null;
      var setGridFeedback = ctx.setGridFeedback;
      var gridRange = ctx.gridRange || { min: -10, max: 10 };
      var setToolSnapshots = ctx.setToolSnapshots;
      var exploreScore = ctx.exploreScore || { correct: 0, total: 0 };
      var setExploreScore = ctx.setExploreScore;

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

      // ═══ SOUND EFFECTS ═══
      var _audioCtx = null;
      var getAudio = function() {
        if (!_audioCtx) { try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
        return _audioCtx;
      };
      var playTone = function(freq, dur, type, vol) {
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
        { id: 'aiLearner', icon: '\uD83E\uDD16', name: 'AI Learner', desc: 'Ask the AI tutor', check: function(u) { return u.aiAsked >= 1; } }
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
            h('text', { key: 'xl' + gi, x: toSvg(v, 'x'), y: toSvg(0, 'y') + 14, textAnchor: 'middle', className: 'text-[9px] fill-slate-400' }, v),
            h('text', { key: 'yl' + gi, x: toSvg(0, 'x') - 8, y: toSvg(v, 'y') + 3, textAnchor: 'end', className: 'text-[9px] fill-slate-400' }, v)
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
          ln.slope.rise !== 0 && h('text', { x: riseX + 10, y: riseMidY + 3, className: 'text-[8px] fill-red-500 font-bold' }, '\u0394y=' + ln.slope.rise),
          h('line', { x1: toSvg(ln.from.x, 'x'), y1: toSvg(ln.from.y, 'y'), x2: toSvg(ln.to.x, 'x'), y2: toSvg(ln.from.y, 'y'), stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '3,2', opacity: 0.6 }),
          ln.slope.run !== 0 && h('text', { x: runMidX, y: runY - 6, textAnchor: 'middle', className: 'text-[8px] fill-blue-500 font-bold' }, '\u0394x=' + ln.slope.run),
          h('rect', { x: midX - 24, y: midY - 10, width: 48, height: 18, rx: 5, fill: '#6366f1', opacity: 0.9 }),
          h('text', { x: midX, y: midY + 3, textAnchor: 'middle', fill: '#fff', style: { fontSize: '9px', fontWeight: 'bold' } }, 'm=' + ln.slope.display),
          h('text', { x: midX, y: midY + 16, textAnchor: 'middle', className: 'text-[8px] fill-indigo-400 font-mono' }, eq)
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
              h('text', { x: toSvg(p2.x, 'x') + 12, y: rMidY + 3, className: 'text-[9px] fill-red-500 font-bold' }, 'rise'),
              h('line', { x1: toSvg(p1.x, 'x'), y1: toSvg(p1.y, 'y'), x2: toSvg(p2.x, 'x'), y2: toSvg(p1.y, 'y'), stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '4,2', opacity: 0.7 }),
              h('text', { x: rMidX, y: toSvg(p1.y, 'y') - 6, textAnchor: 'middle', className: 'text-[9px] fill-blue-500 font-bold' }, 'run'),
              h('circle', { cx: toSvg(p1.x, 'x'), cy: toSvg(p1.y, 'y'), r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }),
              h('circle', { cx: toSvg(p2.x, 'x'), cy: toSvg(p2.y, 'y'), r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 })
            );
          })()
        : null;

      // Distance challenge line (green)
      var distChallengeElements = distanceChallenge && gridChallenge.p1
        ? (function() {
            var p1 = gridChallenge.p1, p2 = gridChallenge.p2;
            var mid = calcMidpoint(p1, p2);
            return h(React.Fragment, null,
              h('line', { x1: toSvg(p1.x, 'x'), y1: toSvg(p1.y, 'y'), x2: toSvg(p2.x, 'x'), y2: toSvg(p2.y, 'y'), stroke: '#22c55e', strokeWidth: 2.5 }),
              h('circle', { cx: toSvg(p1.x, 'x'), cy: toSvg(p1.y, 'y'), r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }),
              h('circle', { cx: toSvg(p2.x, 'x'), cy: toSvg(p2.y, 'y'), r: 6, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }),
              h('circle', { cx: toSvg(mid.x, 'x'), cy: toSvg(mid.y, 'y'), r: 3, fill: '#a855f7', stroke: '#fff', strokeWidth: 1 }),
              h('text', { x: toSvg(mid.x, 'x'), y: toSvg(mid.y, 'y') - 8, textAnchor: 'middle', className: 'text-[8px] fill-purple-500 font-bold' }, 'M(' + mid.x + ',' + mid.y + ')')
            );
          })()
        : null;

      // Plotted points
      var pointElements = gridPoints.map(function(p, i) {
        return h('circle', { key: 'pt' + i, cx: toSvg(p.x, 'x'), cy: toSvg(p.y, 'y'), r: 5, fill: connectFirst === i ? '#6366f1' : '#0891b2', stroke: '#fff', strokeWidth: 2, className: 'cursor-pointer' });
      });
      var labelElements = gridPoints.map(function(p, i) {
        return h('text', { key: 'lb' + i, x: toSvg(p.x, 'x') + 8, y: toSvg(p.y, 'y') - 8, className: 'text-[10px] fill-cyan-700 font-bold' }, '(' + p.x + ',' + p.y + ')');
      });

      // ═══ BADGES PANEL ═══
      var renderBadges = function() {
        var earned = Object.keys(badges).length;
        if (earned === 0) return null;
        return h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-3' },
          h('p', { className: 'text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2' }, '\uD83C\uDFC5 Badges (' + earned + '/' + BADGES.length + ')'),
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
              className: 'flex-1 px-3 py-2 border border-sky-300 rounded-lg text-sm'
            }),
            h('button', {
              onClick: askAITutor, disabled: aiLoading || !aiQuestion.trim(),
              className: 'px-4 py-2 bg-sky-600 text-white font-bold rounded-lg text-sm hover:bg-sky-700 disabled:opacity-50'
            }, aiLoading ? '\u23F3' : 'Ask')
          ),
          h('div', { className: 'flex flex-wrap gap-1.5' },
            ['What is slope?', 'How to find distance?', 'What is a midpoint?', 'What are quadrants?'].map(function(q) {
              return h('button', {
                key: q, onClick: function() { updCG({ aiQuestion: q }); },
                className: 'px-2 py-1 text-[10px] font-bold bg-sky-100 text-sky-700 rounded-full hover:bg-sky-200 transition-all'
              }, q);
            })
          ),
          aiResponse && h('div', { className: 'bg-white rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap border border-sky-100' }, aiResponse)
        );
      };

      // ══════════ MAIN RENDER ══════════
      return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
        // Header
        h('div', { className: 'flex items-center gap-3 mb-2' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg transition-colors', 'aria-label': 'Back to tools' },
            h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
          h('h3', { className: 'text-lg font-bold text-cyan-800' }, '\uD83D\uDCCD Coordinate Grid'),
          h('div', { className: 'ml-auto flex items-center gap-3' },
            streak > 0 && h('span', { className: 'text-xs font-bold text-orange-600' }, '\uD83D\uDD25 ' + streak),
            bestStreak > 0 && h('span', { className: 'text-[10px] text-slate-500' }, 'Best: ' + bestStreak),
            h('span', { className: 'text-xs font-bold text-emerald-600' }, exploreScore.correct + '/' + exploreScore.total),
            h('button', {
              onClick: function() {
                var snap = { id: 'snap-' + Date.now(), tool: 'coordinate', label: 'Grid: ' + gridPoints.length + ' points', data: { points: gridPoints.slice() }, timestamp: Date.now() };
                setToolSnapshots(function(prev) { return prev.concat([snap]); });
                sfxClick();
                addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
              },
              className: 'text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all'
            }, '\uD83D\uDCF8')
          )
        ),

        // SVG Grid
        h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-4 flex justify-center' },
          h('svg', { width: gridW, height: gridH, onClick: handleGridClick, onTouchStart: handleGridTouch, className: 'cursor-crosshair', style: { background: '#f8fafc', touchAction: 'none' } },
            gridElements,
            lineElements,
            slopeChallengeElements,
            distChallengeElements,
            pointElements,
            labelElements
          )
        ),

        // Core Tools
        h('div', { className: 'flex gap-2 flex-wrap' },
          h('button', {
            onClick: function() {
              sfxClick();
              if (connectMode) { setGridFeedback(null); } else { setGridFeedback({ connectMode: true, lines: gridLines, connectFirst: null }); }
              setGridChallenge(null);
            },
            className: 'flex-1 py-2 font-bold rounded-lg text-sm transition-all shadow-md ' + (connectMode ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600')
          }, connectMode ? '\u2714 Connect ON' : '\uD83D\uDD17 Connect Points'),
          h('button', {
            onClick: function() { setGridPoints([]); setGridChallenge(null); setGridFeedback(null); },
            className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all'
          }, '\u21BA Clear')
        ),

        // Challenge Modes
        h('div', { className: 'space-y-2' },
          h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wider' }, '\uD83C\uDFAF Challenges'),
          h('div', { className: 'flex gap-2 flex-wrap' },
            h('button', {
              onClick: function() {
                sfxClick();
                var tx = -8 + Math.floor(Math.random() * 17);
                var ty = -8 + Math.floor(Math.random() * 17);
                setGridChallenge({ type: 'plot', target: { x: tx, y: ty } });
                setGridPoints([]); setGridFeedback(null);
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-cyan-600 hover:to-teal-600 transition-all shadow-md'
            }, '\uD83D\uDCCD Plot a Point'),
            h('button', {
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
            h('button', {
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
          h('p', { className: 'text-[10px] text-amber-600 mb-2 italic' }, 'Fill in rise (\u0394y), run (\u0394x), then slope (m = rise/run)'),
          h('div', { className: 'grid grid-cols-3 gap-2 mb-2' },
            h('div', { className: 'flex flex-col gap-1' },
              h('label', { className: 'text-[10px] font-bold text-red-600 uppercase' }, 'Rise (\u0394y)'),
              h('input', { type: 'number', placeholder: '?', value: (gridFeedback && gridFeedback.riseAnswer) || '', onChange: function(e) { setGridFeedback(function(prev) { return Object.assign({}, prev, { riseAnswer: e.target.value }); }); }, disabled: gridFeedback && gridFeedback.hinted, className: 'px-2 py-1.5 border-2 border-red-200 rounded-lg text-sm font-bold text-center focus:border-red-400 focus:outline-none' + ((gridFeedback && gridFeedback.hinted) ? ' bg-red-50 text-red-400' : '') })
            ),
            h('div', { className: 'flex flex-col gap-1' },
              h('label', { className: 'text-[10px] font-bold text-blue-600 uppercase' }, 'Run (\u0394x)'),
              h('input', { type: 'number', placeholder: '?', value: (gridFeedback && gridFeedback.runAnswer) || '', onChange: function(e) { setGridFeedback(function(prev) { return Object.assign({}, prev, { runAnswer: e.target.value }); }); }, disabled: gridFeedback && gridFeedback.hinted, className: 'px-2 py-1.5 border-2 border-blue-200 rounded-lg text-sm font-bold text-center focus:border-blue-400 focus:outline-none' + ((gridFeedback && gridFeedback.hinted) ? ' bg-blue-50 text-blue-400' : '') })
            ),
            h('div', { className: 'flex flex-col gap-1' },
              h('label', { className: 'text-[10px] font-bold text-amber-700 uppercase' }, 'Slope (m)'),
              h('input', { type: 'text', placeholder: 'e.g. 2/3', value: (gridFeedback && gridFeedback.slopeAnswer) || '', onChange: function(e) { setGridFeedback(function(prev) { return Object.assign({}, prev, { slopeAnswer: e.target.value }); }); }, onKeyDown: function(e) { if (e.key === 'Enter') checkGrid(); }, className: 'px-2 py-1.5 border-2 border-amber-300 rounded-lg text-sm font-bold text-center focus:border-amber-500 focus:outline-none' })
            )
          ),
          h('div', { className: 'flex gap-2 items-center' },
            !(gridFeedback && gridFeedback.hinted) && h('button', { onClick: function() { setGridFeedback(function(prev) { return Object.assign({}, prev, { hinted: true, riseAnswer: String(gridChallenge.slopeData.rise), runAnswer: String(gridChallenge.slopeData.run) }); }); }, className: 'px-3 py-1.5 bg-amber-100 text-amber-700 font-bold rounded-lg text-[11px] hover:bg-amber-200 transition-all border border-amber-300' }, '\uD83D\uDCA1 Hint'),
            (gridFeedback && gridFeedback.hinted) && h('span', { className: 'text-[10px] text-amber-500 italic' }, '\uD83D\uDCA1 Hint used'),
            h('button', { onClick: checkGrid, className: 'ml-auto px-4 py-1.5 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600' }, '\u2714 Check')
          ),
          gridFeedback && gridFeedback.msg && h('p', { className: 'text-sm font-bold mt-2 ' + (gridFeedback.correct ? 'text-green-600' : 'text-red-600') }, gridFeedback.msg)
        ),

        // Distance challenge UI
        distanceChallenge && h('div', { className: 'bg-green-50 rounded-lg p-3 border border-green-200' },
          h('p', { className: 'text-sm font-bold text-green-800 mb-2' }, '\uD83D\uDCCF Find the distance: (' + gridChallenge.p1.x + ',' + gridChallenge.p1.y + ') to (' + gridChallenge.p2.x + ',' + gridChallenge.p2.y + ')'),
          h('p', { className: 'text-[10px] text-green-600 mb-2 italic' }, '\uD83D\uDCA1 d = \u221A((x\u2082\u2212x\u2081)\u00B2 + (y\u2082\u2212y\u2081)\u00B2)  \u2014 Round to 1 decimal place'),
          h('div', { className: 'flex gap-2 items-center' },
            h('input', {
              type: 'number', step: '0.1', placeholder: 'Distance = ?',
              value: (gridFeedback && gridFeedback.distanceAnswer) || '',
              onChange: function(e) { setGridFeedback(function(prev) { return Object.assign({}, prev, { distanceAnswer: e.target.value }); }); },
              onKeyDown: function(e) { if (e.key === 'Enter') checkGrid(); },
              className: 'flex-1 px-3 py-2 border border-green-300 rounded-lg text-sm font-mono'
            }),
            h('button', { onClick: checkGrid, className: 'px-4 py-2 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700' }, '\u2714 Check')
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
            h('button', { onClick: checkGrid, className: 'ml-auto px-4 py-1.5 bg-cyan-500 text-white font-bold rounded-lg text-sm hover:bg-cyan-600' }, '\u2714 Check')
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
              return h('div', { key: li, className: 'flex items-center gap-2 text-[10px] bg-white rounded px-2 py-1 border flex-wrap' },
                h('span', { className: 'font-bold text-indigo-600' }, '(' + ln.from.x + ',' + ln.from.y + ') \u2192 (' + ln.to.x + ',' + ln.to.y + ')'),
                h('span', { className: 'font-bold text-indigo-800' }, 'm=' + ln.slope.display),
                h('span', { className: 'text-green-600' }, 'd=' + dist.toFixed(1)),
                h('span', { className: 'text-purple-600' }, 'M(' + mid.x + ',' + mid.y + ')'),
                h('span', { className: 'ml-auto text-[9px] font-mono text-indigo-400' }, eq)
              );
            })
          ),
          h('button', { onClick: function() { setGridFeedback(function(prev) { return Object.assign({}, prev, { lines: [], connectFirst: null }); }); }, className: 'mt-2 px-3 py-1 text-[10px] font-bold bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200' }, '\uD83D\uDDD1 Clear Lines')
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
        ),

        // Badges
        renderBadges(),

        // AI Tutor toggle + panel
        !showAITutor && h('button', {
          onClick: function() { sfxClick(); updCG({ showAITutor: true }); },
          className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-all'
        }, '\uD83E\uDD16 AI Tutor'),
        renderAITutor(),

        // Keyboard hints
        h('div', { className: 'text-center text-[9px] text-slate-300 mt-2' },
          '\u2328\uFE0F C: connect mode | R: clear | ?: AI tutor'
        )
      );
    }
  });
})();
