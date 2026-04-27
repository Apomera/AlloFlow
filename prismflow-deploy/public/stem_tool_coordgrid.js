// ═══════════════════════════════════════════
// stem_tool_coordgrid.js — Coordinate Grid Plugin
// Plot points, connect lines, calculate slope
// Enhanced: button reorder, equation display, touch, rise/run labels
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
    desc: 'Plot points, draw lines, calculate slope on an interactive grid.',
    color: 'cyan', category: 'math',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var t = ctx.t;

      // ── State from ctx (hosted in AlloFlowANTI.txt) ──
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

      var calcSlope = function(p1, p2) {
        var dy = p2.y - p1.y;
        var dx = p2.x - p1.x;
        if (dx === 0) return { rise: dy, run: 0, value: 'undefined', display: 'undefined' };
        var gcdFn = function(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t2 = b; b = a % t2; a = t2; } return a || 1; };
        var g = gcdFn(dy, dx);
        var num = dy / g; var den = dx / g;
        var frac = den < 0 ? (-num) + '/' + (-den) : den === 1 ? '' + num : num + '/' + den;
        return { rise: dy, run: dx, value: dy / dx, display: frac };
      };

      // ── Line equation (y = mx + b) ──
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

      // ── Quadrant helper ──
      var getQuadrant = function(x, y) {
        if (x === 0 || y === 0) return x === 0 && y === 0 ? 'Origin' : x === 0 ? 'Y-axis' : 'X-axis';
        if (x > 0 && y > 0) return 'Q I';
        if (x < 0 && y > 0) return 'Q II';
        if (x < 0 && y < 0) return 'Q III';
        return 'Q IV';
      };

      // ── Click handler (mouse) ──
      var processClick = function(clientX, clientY, svgEl) {
        var rect = svgEl.getBoundingClientRect();
        var x = fromSvg(clientX - rect.left, 'x');
        var y = fromSvg(clientY - rect.top, 'y');
        if (x < gridRange.min || x > gridRange.max || y < gridRange.min || y > gridRange.max) return;

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
              setGridFeedback(function(prev) { return Object.assign({}, prev, { lines: (prev.lines || []).concat([{ from: from, to: to, slope: slope }]), connectFirst: null }); });
            }
            return;
          }
          if (connectFirst === null || connectFirst === undefined) {
            setGridFeedback(function(prev) { return Object.assign({}, prev, { connectFirst: clickedIdx }); });
          } else if (clickedIdx !== connectFirst) {
            var from2 = gridPoints[connectFirst];
            var to2 = gridPoints[clickedIdx];
            var slope2 = calcSlope(from2, to2);
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

      var handleGridClick = function(e) {
        processClick(e.clientX, e.clientY, e.currentTarget);
      };

      // ── Touch handler (iPad/mobile) ──
      var handleGridTouch = function(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
          processClick(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget);
        }
      };

      // ── Check answer ──
      var checkGrid = function() {
        if (!gridChallenge) return;
        if (gridChallenge.type === 'plot') {
          var ok = gridPoints.some(function(p) { return p.x === gridChallenge.target.x && p.y === gridChallenge.target.y; });
          announceToSR(ok ? 'Correct!' : 'Incorrect, try again');
          setGridFeedback(ok
            ? { correct: true, msg: '\u2705 Correct! Point (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ') plotted!' }
            : { correct: false, msg: '\u274C Point (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ') not found on your grid.' }
          );
          setExploreScore(function(prev) { return { correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }; });
          if (ok) awardXP('coordinate', 5, 'plot point');
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
          var msg;
          if (allCorrect && !hinted) {
            msg = '\u2705 Perfect! rise=' + cs.rise + ', run=' + cs.run + ', slope = ' + cs.display;
          } else if (allCorrect && hinted) {
            msg = '\u2705 Correct (hint used). slope = ' + cs.display;
          } else {
            var parts = [];
            if (!riseOk) parts.push('rise should be ' + cs.rise);
            if (!runOk) parts.push('run should be ' + cs.run);
            if (!slopeOk) parts.push('slope should be ' + cs.display);
            msg = '\u274C ' + parts.join(', ');
          }
          setGridFeedback(function(prev) { return Object.assign({}, prev, { correct: allCorrect, msg: msg }); });
          setExploreScore(function(prev) { return { correct: prev.correct + (allCorrect ? 1 : 0), total: prev.total + 1 }; });
          if (allCorrect) awardXP('coordinate', 5, 'slope calc');
        }
      };

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
            h('text', { key: 'xl' + gi, x: toSvg(v, 'x'), y: toSvg(0, 'y') + 14, textAnchor: 'middle', className: 'text-[10px] fill-slate-400' }, v),
            h('text', { key: 'yl' + gi, x: toSvg(0, 'x') - 8, y: toSvg(v, 'y') + 3, textAnchor: 'end', className: 'text-[10px] fill-slate-400' }, v)
          );
        }
      }

      // Connected lines with slope badges + equation labels
      var lineElements = gridLines.map(function(ln, li) {
        var eq = calcLineEq(ln.from, ln.slope);
        var midX = (toSvg(ln.from.x, 'x') + toSvg(ln.to.x, 'x')) / 2;
        var midY = (toSvg(ln.from.y, 'y') + toSvg(ln.to.y, 'y')) / 2;
        // Rise label (vertical dashed line)
        var riseMidY = (toSvg(ln.from.y, 'y') + toSvg(ln.to.y, 'y')) / 2;
        var riseX = toSvg(ln.to.x, 'x');
        // Run label (horizontal dashed line)
        var runMidX = (toSvg(ln.from.x, 'x') + toSvg(ln.to.x, 'x')) / 2;
        var runY = toSvg(ln.from.y, 'y');
        return h(React.Fragment, { key: 'ln' + li },
          // Main connecting line
          h('line', { x1: toSvg(ln.from.x, 'x'), y1: toSvg(ln.from.y, 'y'), x2: toSvg(ln.to.x, 'x'), y2: toSvg(ln.to.y, 'y'), stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '6,3', opacity: 0.8 }),
          // Rise line (vertical, red)
          h('line', { x1: toSvg(ln.to.x, 'x'), y1: toSvg(ln.from.y, 'y'), x2: toSvg(ln.to.x, 'x'), y2: toSvg(ln.to.y, 'y'), stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '3,2', opacity: 0.6 }),
          // Rise label
          ln.slope.rise !== 0 && h('text', { x: riseX + 10, y: riseMidY + 3, className: 'text-[8px] fill-red-500 font-bold' }, '\u0394y=' + ln.slope.rise),
          // Run line (horizontal, blue)
          h('line', { x1: toSvg(ln.from.x, 'x'), y1: toSvg(ln.from.y, 'y'), x2: toSvg(ln.to.x, 'x'), y2: toSvg(ln.from.y, 'y'), stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '3,2', opacity: 0.6 }),
          // Run label
          ln.slope.run !== 0 && h('text', { x: runMidX, y: runY - 6, textAnchor: 'middle', className: 'text-[8px] fill-blue-500 font-bold' }, '\u0394x=' + ln.slope.run),
          // Slope badge
          h('rect', { x: midX - 24, y: midY - 10, width: 48, height: 18, rx: 5, fill: '#6366f1', opacity: 0.9 }),
          h('text', { x: midX, y: midY + 3, textAnchor: 'middle', fill: '#fff', style: { fontSize: '9px', fontWeight: 'bold' } }, 'm=' + ln.slope.display),
          // Equation label below slope badge
          h('text', { x: midX, y: midY + 16, textAnchor: 'middle', className: 'text-[8px] fill-indigo-400 font-mono' }, eq)
        );
      });

      // Slope challenge line (golden) with rise/run triangle labels
      var slopeChallengeElements = slopeChallenge && gridChallenge.p1
        ? (function() {
            var p1 = gridChallenge.p1, p2 = gridChallenge.p2;
            var rMidY = (toSvg(p1.y, 'y') + toSvg(p2.y, 'y')) / 2;
            var rMidX = (toSvg(p1.x, 'x') + toSvg(p2.x, 'x')) / 2;
            return h(React.Fragment, null,
              // Main line
              h('line', { x1: toSvg(p1.x, 'x'), y1: toSvg(p1.y, 'y'), x2: toSvg(p2.x, 'x'), y2: toSvg(p2.y, 'y'), stroke: '#f59e0b', strokeWidth: 2.5 }),
              // Rise line (vertical)
              h('line', { x1: toSvg(p2.x, 'x'), y1: toSvg(p1.y, 'y'), x2: toSvg(p2.x, 'x'), y2: toSvg(p2.y, 'y'), stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '4,2', opacity: 0.7 }),
              h('text', { x: toSvg(p2.x, 'x') + 12, y: rMidY + 3, className: 'text-[10px] fill-red-500 font-bold' }, 'rise'),
              // Run line (horizontal)
              h('line', { x1: toSvg(p1.x, 'x'), y1: toSvg(p1.y, 'y'), x2: toSvg(p2.x, 'x'), y2: toSvg(p1.y, 'y'), stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '4,2', opacity: 0.7 }),
              h('text', { x: rMidX, y: toSvg(p1.y, 'y') - 6, textAnchor: 'middle', className: 'text-[10px] fill-blue-500 font-bold' }, 'run'),
              // Points
              h('circle', { cx: toSvg(p1.x, 'x'), cy: toSvg(p1.y, 'y'), r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }),
              h('circle', { cx: toSvg(p2.x, 'x'), cy: toSvg(p2.y, 'y'), r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 })
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

      return h('div', { className: 'space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200' },
        // Header
        h('div', { className: 'flex items-center gap-3 mb-2' },
          h('button', { onClick: function() { setStemLabTool(null); }, className: 'p-1.5 hover:bg-slate-100 rounded-lg transition-colors', 'aria-label': 'Back to tools' },
            h(ArrowLeft, { size: 18, className: 'text-slate-500' })),
          h('h3', { className: 'text-lg font-bold text-cyan-800' }, '\uD83D\uDCCD Coordinate Grid'),
          h('div', { className: 'flex items-center gap-2 ml-2' },
            h('div', { className: 'text-xs font-bold text-emerald-600' }, exploreScore.correct + '/' + exploreScore.total),
            h('button', {
              onClick: function() {
                var snap = { id: 'snap-' + Date.now(), tool: 'coordinate', label: 'Grid: ' + gridPoints.length + ' points', data: { points: gridPoints.slice() }, timestamp: Date.now() };
                setToolSnapshots(function(prev) { return prev.concat([snap]); });
                addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
              },
              className: 'text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-400 rounded-full px-2 py-0.5 transition-all'
            }, '\uD83D\uDCF8 Snapshot')
          )
        ),

        // SVG Grid (with touch support)
        h('div', { className: 'bg-white rounded-xl border-2 border-cyan-200 p-4 flex justify-center' },
          h('svg', { width: gridW, height: gridH, onClick: handleGridClick, onTouchStart: handleGridTouch, className: 'cursor-crosshair', style: { background: '#f8fafc', touchAction: 'none' } },
            gridElements,
            lineElements,
            slopeChallengeElements,
            pointElements,
            labelElements
          )
        ),

        // ── Core Tools ──
        h('div', { className: 'flex gap-2 flex-wrap' },
          // Connect Mode toggle (FIRST — core exploration tool)
          h('button', {
            onClick: function() {
              if (connectMode) { setGridFeedback(null); } else { setGridFeedback({ connectMode: true, lines: gridLines, connectFirst: null }); }
              setGridChallenge(null);
            },
            className: 'flex-1 py-2 font-bold rounded-lg text-sm transition-all shadow-md ' + (connectMode ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600')
          }, connectMode ? '\u2714 Connect ON' : '\uD83D\uDD17 Connect Points'),
          // Clear
          h('button', {
            onClick: function() { setGridPoints([]); setGridChallenge(null); setGridFeedback(null); },
            className: 'px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all'
          }, '\u21BA Clear')
        ),

        // ── Challenge Modes (visually separated) ──
        h('div', { className: 'space-y-2' },
          h('p', { className: 'text-[10px] font-bold text-slate-400 uppercase tracking-wider' }, '\uD83C\uDFAF Challenges'),
          h('div', { className: 'flex gap-2 flex-wrap' },
            // Plot a Point
            h('button', {
              onClick: function() {
                var tx = -8 + Math.floor(Math.random() * 17);
                var ty = -8 + Math.floor(Math.random() * 17);
                setGridChallenge({ type: 'plot', target: { x: tx, y: ty } });
                setGridPoints([]);
                setGridFeedback(null);
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-cyan-600 hover:to-teal-600 transition-all shadow-md'
            }, '\uD83D\uDCCD Plot a Point'),
            // Find Slope
            h('button', {
              onClick: function() {
                var x1 = -6 + Math.floor(Math.random() * 13); var y1 = -6 + Math.floor(Math.random() * 13);
                var x2 = x1, y2 = y1;
                while (x2 === x1 && y2 === y1) { x2 = -6 + Math.floor(Math.random() * 13); y2 = -6 + Math.floor(Math.random() * 13); }
                var p1 = { x: x1, y: y1 }; var p2 = { x: x2, y: y2 };
                setGridChallenge({ type: 'slope', p1: p1, p2: p2, slopeData: calcSlope(p1, p2) });
                setGridPoints([p1, p2]);
                setGridFeedback({ slopeAnswer: '' });
              },
              className: 'flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md'
            }, '\uD83D\uDCCF Find Slope')
          )
        ),

        // ── Slope challenge UI ──
        slopeChallenge && h('div', { className: 'bg-amber-50 rounded-lg p-3 border border-amber-200' },
          h('p', { className: 'text-sm font-bold text-amber-800 mb-2' }, '\uD83D\uDCCF Find the slope: (' + gridChallenge.p1.x + ',' + gridChallenge.p1.y + ') \u2192 (' + gridChallenge.p2.x + ',' + gridChallenge.p2.y + ')'),
          h('p', { className: 'text-[10px] text-amber-600 mb-2 italic' }, 'Show your work: fill in rise (\u0394y), run (\u0394x), then slope (m = rise/run)'),
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
            !(gridFeedback && gridFeedback.hinted) && h('button', { onClick: function() { setGridFeedback(function(prev) { return Object.assign({}, prev, { hinted: true, riseAnswer: String(gridChallenge.slopeData.rise), runAnswer: String(gridChallenge.slopeData.run) }); }); }, className: 'px-3 py-1.5 bg-amber-100 text-amber-700 font-bold rounded-lg text-[11px] hover:bg-amber-200 transition-all border border-amber-300' }, '\uD83D\uDCA1 Hint (\u00BD credit)'),
            (gridFeedback && gridFeedback.hinted) && h('span', { className: 'text-[10px] text-amber-500 italic' }, '\uD83D\uDCA1 Hint used \u2014 rise & run filled in'),
            h('button', { onClick: checkGrid, className: 'ml-auto px-4 py-1.5 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600' }, '\u2714 Check')
          ),
          gridFeedback && gridFeedback.msg && h('p', { className: 'text-sm font-bold mt-2 ' + (gridFeedback.correct ? 'text-green-600' : 'text-red-600') }, gridFeedback.msg)
        ),

        // ── Plot challenge UI ──
        gridChallenge && gridChallenge.type === 'plot' && h('div', { className: 'bg-cyan-50 rounded-lg p-3 border border-cyan-200' },
          h('p', { className: 'text-sm font-bold text-cyan-800 mb-2' }, '\uD83D\uDCCD Plot (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ')'),
          h('div', { className: 'flex gap-2 items-center' },
            h('span', { className: 'text-xs text-cyan-600' }, 'Points: ', h('span', { className: 'font-bold' }, gridPoints.length)),
            h('button', { onClick: checkGrid, className: 'ml-auto px-4 py-1.5 bg-cyan-500 text-white font-bold rounded-lg text-sm hover:bg-cyan-600' }, '\u2714 Check')
          ),
          gridFeedback && gridFeedback.msg && h('p', { className: 'text-sm font-bold mt-2 ' + (gridFeedback.correct ? 'text-green-600' : 'text-red-600') }, gridFeedback.msg)
        ),

        // ── Connect mode info ──
        connectMode && h('div', { className: 'bg-indigo-50 rounded-lg p-3 border border-indigo-200' },
          h('p', { className: 'text-sm font-bold text-indigo-700 mb-1' }, '\uD83D\uDD17 Connect Mode'),
          h('p', { className: 'text-xs text-indigo-600' }, connectFirst != null ? 'Click a second point to draw a line.' : 'Click any point on the grid to start.'),
          gridLines.length > 0 && h('div', { className: 'mt-2 space-y-1' },
            gridLines.map(function(ln, li) {
              var eq = calcLineEq(ln.from, ln.slope);
              return h('div', { key: li, className: 'flex items-center gap-2 text-[10px] bg-white rounded px-2 py-1 border' },
                h('span', { className: 'font-bold text-indigo-600' }, '(' + ln.from.x + ',' + ln.from.y + ') \u2192 (' + ln.to.x + ',' + ln.to.y + ')'),
                h('span', { className: 'font-bold text-indigo-800' }, 'm=' + ln.slope.display),
                h('span', { className: 'ml-auto text-[10px] font-mono text-indigo-400' }, eq)
              );
            })
          ),
          h('button', { onClick: function() { setGridFeedback(function(prev) { return Object.assign({}, prev, { lines: [], connectFirst: null }); }); }, className: 'mt-2 px-3 py-1 text-[10px] font-bold bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200' }, '\uD83D\uDDD1 Clear Lines')
        ),

        // ── Stats with quadrant info ──
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
      );
    }
  });
})();
