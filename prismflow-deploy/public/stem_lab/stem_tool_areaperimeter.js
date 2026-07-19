// Area & Perimeter Lab
// Interactive measurement, decomposition, comparison, and deterministic practice.

(function(global) {
  'use strict';

  if (!global) return;

  // Defensive StemLab guard: this module can load independently in previews/tests.
  global.StemLab = global.StemLab || {
    _registry: {},
    _order: [],
    registerTool: function(id, config) {
      config.id = id;
      config.ready = config.ready !== false;
      this._registry[id] = config;
      if (this._order.indexOf(id) === -1) this._order.push(id);
    },
    getRegisteredTools: function() {
      var self = this;
      return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
    },
    isRegistered: function(id) { return !!this._registry[id]; },
    renderTool: function(id, ctx) {
      var tool = this._registry[id];
      if (!tool || typeof tool.render !== 'function') return null;
      try { return tool.render(ctx); } catch (err) {
        if (global.console && typeof global.console.error === 'function') {
          global.console.error('[StemLab] Error rendering ' + id, err);
        }
        return null;
      }
    }
  };

  function questData(data) {
    return (data && data._areaPerimeter) || data || {};
  }

  var AREA_MODE_IDS = ['explore', 'compare', 'composite', 'investigate', 'challenge'];
  var AREA_TARGET_IDS = ['12', '18', '24', '30', '36'];
  var AREA_METHOD_IDS = ['add', 'subtract'];
  var AREA_CHALLENGE_IDS = Array.from({ length: 10 }, function(_, index) { return String(index); });

  function countAllowed(map, allowedIds) {
    map = map || {};
    return allowedIds.filter(function(id) { return !!map[id]; }).length;
  }

  function clampInteger(value, min, max) {
    value = Number(value);
    if (!isFinite(value)) value = min;
    return Math.max(min, Math.min(max, Math.round(value)));
  }

  function rectangleMetrics(width, height) {
    width = Number(width);
    height = Number(height);
    if (!isFinite(width) || width < 0) width = 0;
    if (!isFinite(height) || height < 0) height = 0;
    return {
      area: width * height,
      perimeter: 2 * (width + height)
    };
  }

  function compositeMetrics(outerWidth, outerHeight, leftWidth, notchHeight) {
    outerWidth = Number(outerWidth);
    outerHeight = Number(outerHeight);
    leftWidth = Number(leftWidth);
    notchHeight = Number(notchHeight);
    if (!isFinite(outerWidth) || outerWidth < 0) outerWidth = 0;
    if (!isFinite(outerHeight) || outerHeight < 0) outerHeight = 0;
    if (!isFinite(leftWidth)) leftWidth = 0;
    if (!isFinite(notchHeight)) notchHeight = 0;
    leftWidth = Math.max(0, Math.min(outerWidth, leftWidth));
    notchHeight = Math.max(0, Math.min(outerHeight, notchHeight));
    var cutWidth = outerWidth - leftWidth;
    return {
      cutWidth: cutWidth,
      area: outerWidth * outerHeight - cutWidth * notchHeight,
      perimeter: 2 * (outerWidth + outerHeight),
      boundaryEdges: [leftWidth, notchHeight, cutWidth, outerHeight - notchHeight, outerWidth, outerHeight]
    };
  }

  function factorPairs(value) {
    value = Number(value);
    if (!isFinite(value) || value < 1) return [];
    value = Math.floor(value);
    var pairs = [];
    for (var factor = 1; factor * factor <= value; factor += 1) {
      if (value % factor === 0) {
        pairs.push({ w: value / factor, h: factor, p: 2 * (value / factor + factor) });
      }
    }
    return pairs;
  }

  function isCorrectNumericAnswer(input, expected) {
    if (String(input).trim() === '') return false;
    var numeric = Number(input);
    return isFinite(numeric) && Math.abs(numeric - Number(expected)) < 0.000001;
  }

  global.AreaPerimeterPure = Object.freeze({
    clampInteger: clampInteger,
    rectangleMetrics: rectangleMetrics,
    compositeMetrics: compositeMetrics,
    factorPairs: factorPairs,
    isCorrectNumericAnswer: isCorrectNumericAnswer
  });

  window.StemLab.registerTool('areaPerimeter', {
    icon: '\uD83D\uDCD0',
    label: 'Area & Perimeter Lab',
    desc: 'Tile, compare, decompose, and investigate 2-D shapes while building area and perimeter reasoning.',
    color: 'teal',
    category: 'math',
    questHooks: [
      {
        id: 'tile_counter',
        label: 'Reveal 20 unit squares',
        icon: '\uD83D\uDFE9',
        check: function(data) { return (questData(data).revealedBest || 0) >= 20; },
        progress: function(data) { return Math.min(questData(data).revealedBest || 0, 20) + '/20 tiles'; }
      },
      {
        id: 'measurement_tour',
        label: 'Explore all 5 lab modes',
        icon: '\uD83E\uDDED',
        check: function(data) { return countAllowed(questData(data).modeVisits, AREA_MODE_IDS) >= 5; },
        progress: function(data) { return countAllowed(questData(data).modeVisits, AREA_MODE_IDS) + '/5 modes'; }
      },
      {
        id: 'challenge_five',
        label: 'Solve 5 deterministic challenges',
        icon: '\uD83C\uDFC5',
        check: function(data) { return countAllowed(questData(data).solvedChallenges, AREA_CHALLENGE_IDS) >= 5; },
        progress: function(data) { return Math.min(countAllowed(questData(data).solvedChallenges, AREA_CHALLENGE_IDS), 5) + '/5 solved'; }
      },
      {
        id: 'same_area_three',
        label: 'Investigate 3 target areas',
        icon: '\uD83D\uDD0E',
        check: function(data) { return countAllowed(questData(data).targetsExplored, AREA_TARGET_IDS) >= 3; },
        progress: function(data) { return Math.min(countAllowed(questData(data).targetsExplored, AREA_TARGET_IDS), 3) + '/3 areas'; }
      },
      {
        id: 'decomposition_duo',
        label: 'Use both composite-shape strategies',
        icon: '\u2702\uFE0F',
        check: function(data) { return countAllowed(questData(data).compositeMethods, AREA_METHOD_IDS) >= 2; },
        progress: function(data) { return countAllowed(questData(data).compositeMethods, AREA_METHOD_IDS) + '/2 strategies'; }
      }
    ],

    render: function(ctx) {
      ctx = ctx || {};
      var React = ctx.React;
      if (!React || typeof React.createElement !== 'function') return null;
      var h = React.createElement;
      var icons = ctx.icons || {};
      var ArrowLeft = icons.ArrowLeft;
      var rootData = ctx.toolData || {};
      var state = rootData._areaPerimeter || {};
      var setToolData = ctx.setToolData;
      var addToast = typeof ctx.addToast === 'function' ? ctx.addToast : function() {};
      var announce = typeof ctx.announceToSR === 'function' ? ctx.announceToSR : function() {};
      var awardXP = typeof ctx.awardXP === 'function' ? ctx.awardXP : function() {};
      var isDark = !!ctx.isDark;

      var COLORS = isDark ? {
        page: '#0f172a', panel: '#172033', panelAlt: '#111827', text: '#f8fafc',
        muted: '#cbd5e1', border: '#475569', soft: '#1e293b', teal: '#2dd4bf',
        tealDark: '#99f6e4', blue: '#60a5fa', amber: '#fbbf24', red: '#f87171',
        green: '#4ade80', tile: '#0f766e', tileSoft: '#134e4a', onTeal: '#0f172a'
      } : {
        page: '#f8fafc', panel: '#ffffff', panelAlt: '#f0fdfa', text: '#0f172a',
        muted: '#475569', border: '#cbd5e1', soft: '#e2e8f0', teal: '#0f766e',
        tealDark: '#115e59', blue: '#2563eb', amber: '#b45309', red: '#b91c1c',
        green: '#15803d', tile: '#14b8a6', tileSoft: '#ccfbf1', onTeal: '#ffffff'
      };

      function clamp(value, min, max) {
        return clampInteger(value, min, max);
      }

      function patch(next) {
        if (typeof setToolData !== 'function') return;
        setToolData(function(previous) {
          previous = previous || {};
          var current = previous._areaPerimeter || {};
          var changes = typeof next === 'function' ? next(current) : next;
          return Object.assign({}, previous, {
            _areaPerimeter: Object.assign({}, current, changes || {})
          });
        });
      }

      function speak(message) {
        announce(message);
      }

      var mode = state.mode || 'explore';
      var width = clamp(state.width == null ? 6 : state.width, 1, 20);
      var height = clamp(state.height == null ? 4 : state.height, 1, 16);
      var compareWidth = clamp(state.compareWidth == null ? 8 : state.compareWidth, 1, 20);
      var compareHeight = clamp(state.compareHeight == null ? 3 : state.compareHeight, 1, 16);
      var outerWidth = clamp(state.outerWidth == null ? 10 : state.outerWidth, 4, 14);
      var outerHeight = clamp(state.outerHeight == null ? 8 : state.outerHeight, 4, 12);
      var leftWidth = clamp(state.leftWidth == null ? 4 : state.leftWidth, 1, outerWidth - 1);
      var notchHeight = clamp(state.notchHeight == null ? 3 : state.notchHeight, 1, outerHeight - 1);
      var decomposition = state.decomposition === 'subtract' ? 'subtract' : 'add';
      var targetArea = [12, 18, 24, 30, 36].indexOf(Number(state.targetArea)) >= 0 ? Number(state.targetArea) : 24;
      var challengeIndex = 0;
      var answer = state.answer == null ? '' : String(state.answer);
      var revealedTiles = state.revealedTiles || {};
      var score = state.score || { correct: 0, attempts: 0 };

      var rectangle = rectangleMetrics(width, height);
      var comparison = rectangleMetrics(compareWidth, compareHeight);
      var composite = compositeMetrics(outerWidth, outerHeight, leftWidth, notchHeight);
      var area = rectangle.area;
      var perimeter = rectangle.perimeter;
      var compareArea = comparison.area;
      var comparePerimeter = comparison.perimeter;
      var cutWidth = composite.cutWidth;
      var compositeArea = composite.area;
      var compositePerimeter = composite.perimeter;
      var validRevealed = Object.keys(revealedTiles).filter(function(key) {
        var bits = key.split('-');
        return Number(bits[0]) < width && Number(bits[1]) < height;
      }).length;
      var focusedTile = typeof state.focusedTile === 'string' ? state.focusedTile : '0-0';
      var focusedBits = focusedTile.split('-');
      if (focusedBits.length !== 2 || Number(focusedBits[0]) < 0 || Number(focusedBits[0]) >= width || Number(focusedBits[1]) < 0 || Number(focusedBits[1]) >= height) {
        focusedTile = '0-0';
      }

      var MODES = [
        { id: 'explore', icon: '\uD83E\uDDF1', label: 'Tile Explorer', short: 'Tile' },
        { id: 'compare', icon: '\u2696\uFE0F', label: 'Compare Shapes', short: 'Compare' },
        { id: 'composite', icon: '\uD83E\uDDE9', label: 'Composite Shapes', short: 'Composite' },
        { id: 'investigate', icon: '\uD83D\uDD0E', label: 'Same Area Lab', short: 'Investigate' },
        { id: 'challenge', icon: '\uD83C\uDFAF', label: 'Challenges', short: 'Challenge' }
      ];
      if (!MODES.some(function(item) { return item.id === mode; })) mode = 'explore';

      var CHALLENGES = [
        { prompt: 'A rectangular garden is 7 m long and 4 m wide. What is its area?', answer: 28, unit: 'm\u00B2', kind: 'rect', w: 7, h: 4, find: 'Area', explanation: 'Area = length \u00D7 width = 7 \u00D7 4 = 28 m\u00B2.' },
        { prompt: 'A picture frame is 9 cm long and 3 cm wide. What is its perimeter?', answer: 24, unit: 'cm', kind: 'rect', w: 9, h: 3, find: 'Perimeter', explanation: 'Perimeter = 2(9 + 3) = 24 cm.' },
        { prompt: 'A rectangle has area 48 ft\u00B2 and width 6 ft. What is its missing length?', answer: 8, unit: 'ft', kind: 'missing', w: 6, h: 8, missing: 'length', missingAxis: 'h', find: 'Missing length', explanation: 'Missing length = area \u00F7 width = 48 \u00F7 6 = 8 ft.' },
        { prompt: 'A rectangle has perimeter 30 yd and length 9 yd. What is its missing width?', answer: 6, unit: 'yd', kind: 'missing', w: 9, h: 6, missing: 'width', missingAxis: 'h', find: 'Missing width', explanation: '30 = 2(9 + w), so 15 = 9 + w and w = 6 yd.' },
        { prompt: 'An L-shape starts as a 10 by 8 rectangle. A 4 by 3 corner is removed. What is the remaining area?', answer: 68, unit: 'units\u00B2', kind: 'composite', outerW: 10, outerH: 8, cutW: 4, cutH: 3, find: 'Composite area', explanation: 'Whole area 10 \u00D7 8 = 80. Removed area 4 \u00D7 3 = 12. Remaining area = 80 - 12 = 68 units\u00B2.' },
        { prompt: 'Rectangles 3 by 8 and 4 by 6 have equal area. How much greater is the first perimeter?', answer: 2, unit: 'units', kind: 'compare', w: 3, h: 8, w2: 4, h2: 6, find: 'Perimeter difference', explanation: 'Their perimeters are 22 and 20 units, so the first is 2 units greater.' },
        { prompt: 'A rectangle has area 63 in\u00B2 and height 7 in. What is its width?', answer: 9, unit: 'in', kind: 'missing', w: 9, h: 7, missing: 'width', missingAxis: 'w', find: 'Missing width', explanation: 'Width = area \u00F7 height = 63 \u00F7 7 = 9 in.' },
        { prompt: 'A rug is 5 ft by 11 ft. How many feet of trim go around its edge?', answer: 32, unit: 'ft', kind: 'rect', w: 11, h: 5, find: 'Perimeter', explanation: 'Trim follows the perimeter: 2(11 + 5) = 32 ft.' },
        { prompt: 'A square playground has perimeter 36 m. What is the length of one side?', answer: 9, unit: 'm', kind: 'missing', w: 9, h: 9, missing: 'side', find: 'Side length', explanation: 'A square has four equal sides, so 36 \u00F7 4 = 9 m.' },
        { prompt: 'A 12 by 7 rectangle loses a 5 by 2 corner. What area remains?', answer: 74, unit: 'units\u00B2', kind: 'composite', outerW: 12, outerH: 7, cutW: 5, cutH: 2, find: 'Composite area', explanation: 'Whole area 84 minus removed area 10 leaves 74 units\u00B2.' }
      ];
      challengeIndex = clamp(state.challengeIndex == null ? 0 : state.challengeIndex, 0, CHALLENGES.length - 1);

      function panel(children, extra) {
        return h('section', Object.assign({
          className: 'rounded-2xl border shadow-sm',
          style: { background: COLORS.panel, borderColor: COLORS.border, padding: 'clamp(14px, 2.5vw, 24px)' }
        }, extra || {}), children);
      }

      function actionButton(label, onClick, options) {
        options = options || {};
        var disabled = !!options.disabled;
        return h('button', {
          key: options.key || label,
          type: options.type || 'button',
          onClick: onClick,
          disabled: disabled,
          'aria-pressed': options.pressed == null ? undefined : !!options.pressed,
          'aria-label': options.ariaLabel,
          className: 'rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500',
          style: Object.assign({
            padding: options.compact ? '7px 11px' : '10px 15px',
            borderColor: options.primary ? COLORS.teal : COLORS.border,
            background: disabled ? COLORS.soft : (options.primary ? COLORS.teal : COLORS.panel),
            color: disabled ? COLORS.muted : (options.primary ? COLORS.onTeal : COLORS.text),
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.65 : 1
          }, options.style || {})
        }, label);
      }

      function metricCard(label, value, formula, accent) {
        return h('div', {
          key: 'metric-' + label,
          className: 'rounded-xl border',
          style: { borderColor: COLORS.border, background: COLORS.panelAlt, padding: '14px', minWidth: 0 }
        }, [
          h('div', { key: 'label', style: { color: COLORS.muted, fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' } }, label),
          h('div', { key: 'value', style: { color: accent || COLORS.tealDark, fontSize: 'clamp(1.45rem, 4vw, 2rem)', fontWeight: 800, lineHeight: 1.2 } }, value),
          h('div', { key: 'formula', style: { color: COLORS.muted, fontSize: '0.9rem', marginTop: '4px' } }, formula)
        ]);
      }

      function rangeControl(label, value, min, max, onChange, suffix) {
        var id = 'ap-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return h('label', { key: id, htmlFor: id, style: { display: 'block', color: COLORS.text, fontWeight: 700 } }, [
          h('span', { key: 'line', style: { display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '7px' } }, [
            h('span', { key: 'name' }, label),
            h('output', { key: 'out', htmlFor: id, style: { color: COLORS.tealDark } }, String(value) + (suffix || ''))
          ]),
          h('input', {
            key: 'input', id: id, type: 'range', min: min, max: max, step: 1, value: value,
            onChange: function(event) { onChange(Number(event.target.value)); },
            style: { width: '100%', accentColor: COLORS.teal },
            'aria-label': label
          })
        ]);
      }

      function formulaTable(rows, caption) {
        return h('div', { key: 'formula-' + caption, style: { overflowX: 'auto', marginTop: '14px' } },
          h('table', { style: { width: '100%', borderCollapse: 'collapse', color: COLORS.text, minWidth: '420px' } }, [
            h('caption', { key: 'cap', style: { textAlign: 'left', fontWeight: 800, marginBottom: '8px', color: COLORS.text } }, caption),
            h('thead', { key: 'head' }, h('tr', null, ['Measure', 'How it is found', 'Result'].map(function(item) {
              return h('th', { key: item, scope: 'col', style: { borderBottom: '2px solid ' + COLORS.border, padding: '9px', textAlign: 'left' } }, item);
            }))),
            h('tbody', { key: 'body' }, rows.map(function(row, index) {
              return h('tr', { key: index }, row.map(function(cell, cellIndex) {
                return h(cellIndex === 0 ? 'th' : 'td', {
                  key: cellIndex,
                  scope: cellIndex === 0 ? 'row' : undefined,
                  style: { borderBottom: '1px solid ' + COLORS.border, padding: '9px', textAlign: 'left', fontWeight: cellIndex === 0 ? 700 : 400 }
                }, cell);
              }));
            }))
          ])
        );
      }

      function selectMode(nextMode) {
        var visits = Object.assign({}, state.modeVisits || {});
        visits[mode] = true;
        visits[nextMode] = true;
        var next = { mode: nextMode, modeVisits: visits };
        if (nextMode === 'investigate') {
          next.targetsExplored = Object.assign({}, state.targetsExplored || {});
          next.targetsExplored[targetArea] = true;
        }
        if (nextMode === 'composite') {
          next.compositeMethods = Object.assign({}, state.compositeMethods || {});
          next.compositeMethods[decomposition] = true;
        }
        patch(next);
        var selected = MODES.filter(function(item) { return item.id === nextMode; })[0];
        speak((selected ? selected.label : nextMode) + ' selected.');
      }

      function handleModeKeyDown(event, index) {
        var nextIndex = index;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % MODES.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + MODES.length) % MODES.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = MODES.length - 1;
        else return;
        event.preventDefault();
        selectMode(MODES[nextIndex].id);
        var tabs = event.currentTarget.parentNode.querySelectorAll('[role="tab"]');
        if (tabs[nextIndex] && typeof tabs[nextIndex].focus === 'function') tabs[nextIndex].focus();
      }

      function setDimension(key, value, message) {
        var next = {};
        next[key] = value;
        if (key === 'width' || key === 'height') next.revealedTiles = {};
        patch(next);
        speak(message);
      }

      function toggleTile(column, row) {
        var key = column + '-' + row;
        var nextTiles = Object.assign({}, revealedTiles);
        if (nextTiles[key]) delete nextTiles[key]; else nextTiles[key] = true;
        var count = Object.keys(nextTiles).length;
        patch({ revealedTiles: nextTiles, revealedBest: Math.max(state.revealedBest || 0, count) });
        speak((nextTiles[key] ? 'Revealed' : 'Hid') + ' unit square at column ' + (column + 1) + ', row ' + (row + 1) + '. ' + count + ' of ' + area + ' revealed.');
      }

      function revealAll() {
        var all = {};
        for (var row = 0; row < height; row += 1) {
          for (var column = 0; column < width; column += 1) all[column + '-' + row] = true;
        }
        patch({ revealedTiles: all, revealedBest: Math.max(state.revealedBest || 0, area) });
        speak('All ' + area + ' unit squares revealed.');
      }

      function rectangleSvg() {
        var maxW = 450;
        var maxH = 270;
        var cell = Math.min(maxW / width, maxH / height, 46);
        var shapeW = cell * width;
        var shapeH = cell * height;
        var originX = (640 - shapeW) / 2;
        var originY = 62 + (maxH - shapeH) / 2;
        var cells = [];
        for (var row = 0; row < height; row += 1) {
          for (var column = 0; column < width; column += 1) {
            (function(c, r) {
              var key = c + '-' + r;
              var shown = !!revealedTiles[key];
              cells.push(h('rect', {
                key: key,
                x: originX + c * cell,
                y: originY + r * cell,
                width: cell,
                height: cell,
                fill: shown ? COLORS.tile : COLORS.tileSoft,
                stroke: isDark ? '#94a3b8' : '#64748b',
                strokeWidth: shown ? 1.6 : 1,
                role: 'button',
                tabIndex: focusedTile === key ? 0 : -1,
                focusable: 'true',
                'data-ap-tile': key,
                'aria-pressed': shown,
                'aria-label': 'Unit square column ' + (c + 1) + ', row ' + (r + 1) + (shown ? ', revealed' : ', hidden'),
                onFocus: function() { if (focusedTile !== key) patch({ focusedTile: key }); },
                onClick: function() { toggleTile(c, r); },
                onKeyDown: function(event) {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleTile(c, r);
                    return;
                  }
                  var nextColumn = c;
                  var nextRow = r;
                  if (event.key === 'ArrowRight') nextColumn = Math.min(width - 1, c + 1);
                  else if (event.key === 'ArrowLeft') nextColumn = Math.max(0, c - 1);
                  else if (event.key === 'ArrowDown') nextRow = Math.min(height - 1, r + 1);
                  else if (event.key === 'ArrowUp') nextRow = Math.max(0, r - 1);
                  else if (event.key === 'Home') { nextColumn = 0; nextRow = 0; }
                  else if (event.key === 'End') { nextColumn = width - 1; nextRow = height - 1; }
                  else return;
                  event.preventDefault();
                  var svg = event.currentTarget.ownerSVGElement;
                  var nextTile = svg && svg.querySelector('[data-ap-tile="' + nextColumn + '-' + nextRow + '"]');
                  if (nextTile && typeof nextTile.focus === 'function') nextTile.focus();
                },
                style: { cursor: 'pointer' }
              }));
            })(column, row);
          }
        }
        return h('svg', {
          key: 'rectangle-svg',
          viewBox: '0 0 640 390',
          role: 'group',
          'aria-labelledby': 'ap-explore-title ap-explore-desc',
          style: { display: 'block', width: '100%', maxHeight: '430px' }
        }, [
          h('title', { key: 'title', id: 'ap-explore-title' }, width + ' by ' + height + ' tiled rectangle'),
          h('desc', { key: 'desc', id: 'ap-explore-desc' }, 'Interactive grid with ' + area + ' unit squares. ' + validRevealed + ' squares are revealed. The perimeter is ' + perimeter + ' units.'),
          h('text', { key: 'top', x: originX + shapeW / 2, y: originY - 23, textAnchor: 'middle', fill: COLORS.text, fontSize: 18, fontWeight: 800 }, width + ' units'),
          h('text', { key: 'side', x: originX - 28, y: originY + shapeH / 2, textAnchor: 'middle', fill: COLORS.text, fontSize: 18, fontWeight: 800, transform: 'rotate(-90 ' + (originX - 28) + ' ' + (originY + shapeH / 2) + ')' }, height + ' units')
        ].concat(cells).concat([
          h('text', { key: 'count', x: 320, y: 370, textAnchor: 'middle', fill: COLORS.tealDark, fontSize: 18, fontWeight: 800 }, validRevealed + ' of ' + area + ' unit squares revealed')
        ]));
      }

      function compareSvg() {
        var largestW = Math.max(width, compareWidth);
        var largestH = Math.max(height, compareHeight);
        var unit = Math.min(205 / largestW, 130 / largestH, 30);
        var firstW = width * unit;
        var firstH = height * unit;
        var secondW = compareWidth * unit;
        var secondH = compareHeight * unit;
        var y1 = 90 + (135 - firstH) / 2;
        var y2 = 90 + (135 - secondH) / 2;
        return h('svg', {
          key: 'compare-svg',
          viewBox: '0 0 640 310', role: 'img',
          'aria-labelledby': 'ap-compare-title ap-compare-desc',
          style: { display: 'block', width: '100%', maxHeight: '360px' }
        }, [
          h('title', { key: 'title', id: 'ap-compare-title' }, 'Two rectangles compared by area and perimeter'),
          h('desc', { key: 'desc', id: 'ap-compare-desc' }, 'Rectangle A is ' + width + ' by ' + height + ', area ' + area + ', perimeter ' + perimeter + '. Rectangle B is ' + compareWidth + ' by ' + compareHeight + ', area ' + compareArea + ', perimeter ' + comparePerimeter + '.'),
          h('text', { key: 'la', x: 165, y: 37, textAnchor: 'middle', fill: COLORS.text, fontSize: 18, fontWeight: 800 }, 'Rectangle A'),
          h('rect', { key: 'a', x: 165 - firstW / 2, y: y1, width: firstW, height: firstH, rx: 3, fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 4 }),
          h('text', { key: 'ad', x: 165, y: 250, textAnchor: 'middle', fill: COLORS.text, fontSize: 15 }, width + ' \u00D7 ' + height),
          h('text', { key: 'lb', x: 475, y: 37, textAnchor: 'middle', fill: COLORS.text, fontSize: 18, fontWeight: 800 }, 'Rectangle B'),
          h('rect', { key: 'b', x: 475 - secondW / 2, y: y2, width: secondW, height: secondH, rx: 3, fill: isDark ? '#1e3a5f' : '#dbeafe', stroke: COLORS.blue, strokeWidth: 4 }),
          h('text', { key: 'bd', x: 475, y: 250, textAnchor: 'middle', fill: COLORS.text, fontSize: 15 }, compareWidth + ' \u00D7 ' + compareHeight),
          h('line', { key: 'divider', x1: 320, y1: 30, x2: 320, y2: 270, stroke: COLORS.border, strokeDasharray: '7 7' }),
          h('text', { key: 'summary', x: 320, y: 295, textAnchor: 'middle', fill: COLORS.muted, fontSize: 14 }, 'Drawn with the same unit scale')
        ]);
      }

      function compositeSvg() {
        var scale = Math.min(440 / outerWidth, 275 / outerHeight, 38);
        var x = (640 - outerWidth * scale) / 2;
        var y = 57 + (275 - outerHeight * scale) / 2;
        var points = [
          [x, y], [x + leftWidth * scale, y],
          [x + leftWidth * scale, y + notchHeight * scale],
          [x + outerWidth * scale, y + notchHeight * scale],
          [x + outerWidth * scale, y + outerHeight * scale],
          [x, y + outerHeight * scale]
        ].map(function(point) { return point[0] + ',' + point[1]; }).join(' ');
        var grid = [];
        for (var row = 0; row < outerHeight; row += 1) {
          for (var column = 0; column < outerWidth; column += 1) {
            if (column < leftWidth || row >= notchHeight) {
              grid.push(h('rect', {
                key: column + '-' + row,
                x: x + column * scale, y: y + row * scale,
                width: scale, height: scale,
                fill: (column + row) % 2 ? COLORS.tileSoft : (isDark ? '#115e59' : '#99f6e4'),
                stroke: isDark ? '#64748b' : '#94a3b8', strokeWidth: 0.8
              }));
            }
          }
        }
        var overlay = decomposition === 'add' ? [
          h('line', { key: 'split', x1: x + leftWidth * scale, y1: y + notchHeight * scale, x2: x + leftWidth * scale, y2: y + outerHeight * scale, stroke: COLORS.red, strokeWidth: 3, strokeDasharray: '8 5' }),
          h('text', { key: 'one', x: x + leftWidth * scale / 2, y: y + outerHeight * scale / 2, fill: COLORS.text, textAnchor: 'middle', fontSize: 17, fontWeight: 800 }, 'A'),
          h('text', { key: 'two', x: x + (leftWidth + outerWidth) * scale / 2, y: y + (notchHeight + outerHeight) * scale / 2, fill: COLORS.text, textAnchor: 'middle', fontSize: 17, fontWeight: 800 }, 'B')
        ] : [
          h('rect', { key: 'cut', x: x + leftWidth * scale, y: y, width: cutWidth * scale, height: notchHeight * scale, fill: 'none', stroke: COLORS.red, strokeWidth: 3, strokeDasharray: '8 5' }),
          h('text', { key: 'minus', x: x + (leftWidth + outerWidth) * scale / 2, y: y + notchHeight * scale / 2 + 6, fill: COLORS.red, textAnchor: 'middle', fontSize: 16, fontWeight: 800 }, 'subtract')
        ];
        return h('svg', {
          key: 'composite-svg',
          viewBox: '0 0 640 390', role: 'img',
          'aria-labelledby': 'ap-composite-title ap-composite-desc',
          style: { display: 'block', width: '100%', maxHeight: '430px' }
        }, [
          h('title', { key: 'title', id: 'ap-composite-title' }, 'L-shaped composite figure'),
          h('desc', { key: 'desc', id: 'ap-composite-desc' }, 'An L-shape inside an outer ' + outerWidth + ' by ' + outerHeight + ' rectangle with a top-right ' + cutWidth + ' by ' + notchHeight + ' corner removed. Its area is ' + compositeArea + ' square units and perimeter is ' + compositePerimeter + ' units.'),
          h('polygon', { key: 'base', points: points, fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 4 })
        ].concat(grid).concat(overlay).concat([
          h('polygon', { key: 'outline', points: points, fill: 'none', stroke: COLORS.tealDark, strokeWidth: 4 }),
          h('text', { key: 'w', x: x + outerWidth * scale / 2, y: y + outerHeight * scale + 28, fill: COLORS.text, textAnchor: 'middle', fontSize: 17, fontWeight: 800 }, outerWidth + ' units'),
          h('text', { key: 'h', x: x - 27, y: y + outerHeight * scale / 2, fill: COLORS.text, textAnchor: 'middle', fontSize: 17, fontWeight: 800, transform: 'rotate(-90 ' + (x - 27) + ' ' + (y + outerHeight * scale / 2) + ')' }, outerHeight + ' units')
        ]));
      }


      function factorSvg(pairs) {
        var rowHeight = 94;
        var svgHeight = 38 + pairs.length * rowHeight;
        var shapes = [];
        var minP = Math.min.apply(null, pairs.map(function(pair) { return pair.p; }));
        var maxWidth = Math.max.apply(null, pairs.map(function(pair) { return pair.w; }));
        var maxHeight = Math.max.apply(null, pairs.map(function(pair) { return pair.h; }));
        var sharedUnit = Math.min(350 / maxWidth, 54 / maxHeight, 25);
        pairs.forEach(function(pair, index) {
          var unit = sharedUnit;
          var w = pair.w * unit;
          var hgt = pair.h * unit;
          var y = 28 + index * rowHeight + (56 - hgt) / 2;
          shapes.push(h('g', { key: pair.w + 'x' + pair.h }, [
            h('text', { key: 'name', x: 18, y: 28 + index * rowHeight + 32, fill: COLORS.text, fontSize: 16, fontWeight: 800 }, pair.w + ' \u00D7 ' + pair.h),
            h('rect', { key: 'rect', x: 120, y: y, width: w, height: hgt, 'data-factor-pair': pair.w + 'x' + pair.h, 'data-square-unit': unit, fill: pair.p === minP ? (isDark ? '#14532d' : '#dcfce7') : COLORS.tileSoft, stroke: pair.p === minP ? COLORS.green : COLORS.teal, strokeWidth: 3 }),
            h('text', { key: 'p', x: 500, y: 28 + index * rowHeight + 32, fill: pair.p === minP ? COLORS.green : COLORS.muted, fontSize: 15, fontWeight: 700 }, 'P = ' + pair.p + (pair.p === minP ? ' (least)' : ''))
          ]));
        });
        return h('svg', {
          key: 'factor-svg',
          viewBox: '0 0 640 ' + svgHeight,
          role: 'img',
          'aria-labelledby': 'ap-factors-title ap-factors-desc',
          style: { display: 'block', width: '100%', maxHeight: '480px' }
        }, [
          h('title', { key: 'title', id: 'ap-factors-title' }, 'Rectangles with area ' + targetArea),
          h('desc', { key: 'desc', id: 'ap-factors-desc' }, pairs.map(function(pair) { return pair.w + ' by ' + pair.h + ', perimeter ' + pair.p; }).join('. ') + '. All have area ' + targetArea + '.')
        ].concat(shapes));
      }

      function challengeSvg(challenge) {
        var elements = [
          h('title', { key: 'title', id: 'ap-challenge-title' }, 'Diagram for challenge ' + (challengeIndex + 1)),
          h('desc', { key: 'desc', id: 'ap-challenge-desc' }, challenge.prompt)
        ];
        if (challenge.kind === 'composite') {
          var scale = Math.min(300 / challenge.outerW, 170 / challenge.outerH);
          var x = 170;
          var y = 48;
          var left = challenge.outerW - challenge.cutW;
          var pts = [[x,y],[x+left*scale,y],[x+left*scale,y+challenge.cutH*scale],[x+challenge.outerW*scale,y+challenge.cutH*scale],[x+challenge.outerW*scale,y+challenge.outerH*scale],[x,y+challenge.outerH*scale]].map(function(point) { return point.join(','); }).join(' ');
          elements.push(h('polygon', { key: 'shape', points: pts, fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 4 }));
          elements.push(h('rect', { key: 'cut', x: x + left * scale, y: y, width: challenge.cutW * scale, height: challenge.cutH * scale, fill: 'none', stroke: COLORS.red, strokeWidth: 3, strokeDasharray: '7 5' }));
          elements.push(h('text', { key: 'whole', x: 320, y: 255, textAnchor: 'middle', fill: COLORS.text, fontSize: 17 }, challenge.outerW + ' \u00D7 ' + challenge.outerH + ' minus ' + challenge.cutW + ' \u00D7 ' + challenge.cutH));
        } else if (challenge.kind === 'compare') {
          elements.push(h('rect', { key: 'a', x: 85, y: 55, width: challenge.w * 20, height: challenge.h * 20, fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 4 }));
          elements.push(h('rect', { key: 'b', x: 390, y: 75, width: challenge.w2 * 20, height: challenge.h2 * 20, fill: isDark ? '#1e3a5f' : '#dbeafe', stroke: COLORS.blue, strokeWidth: 4 }));
          elements.push(h('text', { key: 'al', x: 165, y: 245, textAnchor: 'middle', fill: COLORS.text, fontSize: 17 }, challenge.w + ' \u00D7 ' + challenge.h));
          elements.push(h('text', { key: 'bl', x: 455, y: 245, textAnchor: 'middle', fill: COLORS.text, fontSize: 17 }, challenge.w2 + ' \u00D7 ' + challenge.h2));
        } else {
          var rectangleScale = Math.min(330 / challenge.w, 170 / challenge.h);
          var drawW = challenge.w * rectangleScale;
          var drawH = challenge.h * rectangleScale;
          var dx = (640 - drawW) / 2;
          var dy = 55 + (170 - drawH) / 2;
          elements.push(h('rect', { key: 'r', x: dx, y: dy, width: drawW, height: drawH, 'data-challenge-shape': 'rectangle', 'data-square-unit': rectangleScale, fill: COLORS.tileSoft, stroke: COLORS.teal, strokeWidth: 4 }));
          elements.push(h('text', { key: 'w', x: 320, y: dy + drawH + 27, textAnchor: 'middle', fill: COLORS.text, fontSize: 17, fontWeight: 800 }, challenge.missingAxis === 'w' || challenge.missing === 'side' ? '?' : challenge.w));
          elements.push(h('text', { key: 'h', x: dx - 25, y: dy + drawH / 2, textAnchor: 'middle', fill: COLORS.text, fontSize: 17, fontWeight: 800, transform: 'rotate(-90 ' + (dx - 25) + ' ' + (dy + drawH / 2) + ')' }, challenge.missingAxis === 'h' || challenge.missing === 'side' ? '?' : challenge.h));
        }
        return h('svg', {
          key: 'challenge-svg',
          viewBox: '0 0 640 280', role: 'img',
          'aria-labelledby': 'ap-challenge-title ap-challenge-desc',
          style: { display: 'block', width: '100%', maxHeight: '330px' }
        }, elements);
      }

      function exploreView() {
        return h('div', { style: { display: 'grid', gap: '16px' } }, [
          panel([
            h('div', { key: 'heading', style: { display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'flex-start', flexWrap: 'wrap' } }, [
              h('div', { key: 'copy' }, [
                h('h2', { key: 'h', style: { color: COLORS.text, fontSize: '1.35rem', fontWeight: 850, margin: 0 } }, 'Build area one square at a time'),
                h('p', { key: 'p', style: { color: COLORS.muted, margin: '6px 0 0', maxWidth: '720px' } }, 'Click or keyboard-activate unit squares. The inside squares measure area; the outside edge measures perimeter.')
              ]),
              h('div', { key: 'actions', style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [
                actionButton('Reveal all', revealAll, { primary: true, compact: true }),
                actionButton('Hide all', function() { patch({ revealedTiles: {} }); speak('All unit squares hidden.'); }, { compact: true, disabled: validRevealed === 0 })
              ])
            ]),
            h('div', { key: 'controls', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '18px', marginTop: '18px' } }, [
              rangeControl('Rectangle width', width, 1, 20, function(value) { setDimension('width', value, 'Width set to ' + value + ' units.'); }),
              rangeControl('Rectangle height', height, 1, 16, function(value) { setDimension('height', value, 'Height set to ' + value + ' units.'); })
            ])
          ], { key: 'controls' }),
          panel([
            h('div', { key: 'svg' }, rectangleSvg()),
            h('div', { key: 'metrics', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' } }, [
              metricCard('Area', area + ' square units', width + ' \u00D7 ' + height, COLORS.tealDark),
              metricCard('Perimeter', perimeter + ' units', '2(' + width + ' + ' + height + ')', COLORS.blue),
              metricCard('Tiles counted', validRevealed + ' / ' + area, 'one tile = 1 square unit', COLORS.green)
            ]),
            h('details', { key: 'details', style: { marginTop: '14px', color: COLORS.text } }, [
              h('summary', { key: 'summary', style: { cursor: 'pointer', fontWeight: 800 } }, 'View formulas and text alternative'),
              h('p', { key: 'description', style: { color: COLORS.muted } }, 'The rectangle has ' + width + ' columns and ' + height + ' rows. That makes ' + area + ' unit squares inside and ' + perimeter + ' unit lengths around the boundary.'),
              formulaTable([
                ['Area', width + ' columns \u00D7 ' + height + ' rows', area + ' square units'],
                ['Perimeter', width + ' + ' + height + ' + ' + width + ' + ' + height, perimeter + ' units']
              ], 'Rectangle measurements')
            ])
          ], { key: 'visual', 'aria-label': 'Interactive rectangle model' })
        ]);
      }

      function compareView() {
        var areaRelation = area === compareArea ? 'The areas are equal.' : 'Rectangle ' + (area > compareArea ? 'A' : 'B') + ' has ' + Math.abs(area - compareArea) + ' more square units of area.';
        var perimeterRelation = perimeter === comparePerimeter ? 'The perimeters are equal.' : 'Rectangle ' + (perimeter > comparePerimeter ? 'A' : 'B') + ' has a perimeter ' + Math.abs(perimeter - comparePerimeter) + ' units longer.';
        return h('div', { style: { display: 'grid', gap: '16px' } }, [
          panel([
            h('h2', { key: 'h', style: { color: COLORS.text, fontSize: '1.35rem', fontWeight: 850, margin: 0 } }, 'Area and perimeter can change differently'),
            h('p', { key: 'p', style: { color: COLORS.muted, margin: '6px 0 16px' } }, 'Adjust either rectangle. Compare the space inside with the distance around the edge.'),
            h('div', { key: 'controls', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '22px' } }, [
              h('fieldset', { key: 'a', style: { border: '1px solid ' + COLORS.border, borderRadius: '12px', padding: '14px', minWidth: 0 } }, [
                h('legend', { key: 'legend', style: { color: COLORS.tealDark, fontWeight: 850, padding: '0 6px' } }, 'Rectangle A'),
                rangeControl('A width', width, 1, 20, function(value) { setDimension('width', value, 'Rectangle A width set to ' + value + '.'); }),
                h('div', { key: 'gap', style: { height: '12px' } }),
                rangeControl('A height', height, 1, 16, function(value) { setDimension('height', value, 'Rectangle A height set to ' + value + '.'); })
              ]),
              h('fieldset', { key: 'b', style: { border: '1px solid ' + COLORS.border, borderRadius: '12px', padding: '14px', minWidth: 0 } }, [
                h('legend', { key: 'legend', style: { color: COLORS.blue, fontWeight: 850, padding: '0 6px' } }, 'Rectangle B'),
                rangeControl('B width', compareWidth, 1, 20, function(value) { patch({ compareWidth: value }); speak('Rectangle B width set to ' + value + '.'); }),
                h('div', { key: 'gap', style: { height: '12px' } }),
                rangeControl('B height', compareHeight, 1, 16, function(value) { patch({ compareHeight: value }); speak('Rectangle B height set to ' + value + '.'); })
              ])
            ])
          ], { key: 'controls' }),
          panel([
            compareSvg(),
            h('div', { key: 'relations', role: 'status', 'aria-live': 'polite', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px', marginTop: '6px' } }, [
              metricCard('Area comparison', areaRelation, 'A: ' + area + ' | B: ' + compareArea, COLORS.tealDark),
              metricCard('Perimeter comparison', perimeterRelation, 'A: ' + perimeter + ' | B: ' + comparePerimeter, COLORS.blue)
            ]),
            formulaTable([
              ['Rectangle A area', width + ' \u00D7 ' + height, area + ' square units'],
              ['Rectangle A perimeter', '2(' + width + ' + ' + height + ')', perimeter + ' units'],
              ['Rectangle B area', compareWidth + ' \u00D7 ' + compareHeight, compareArea + ' square units'],
              ['Rectangle B perimeter', '2(' + compareWidth + ' + ' + compareHeight + ')', comparePerimeter + ' units']
            ], 'Side-by-side measurements')
          ], { key: 'visual' })
        ]);
      }

      function compositeView() {
        var addOne = leftWidth * outerHeight;
        var addTwo = cutWidth * (outerHeight - notchHeight);
        var whole = outerWidth * outerHeight;
        var removed = cutWidth * notchHeight;
        return h('div', { style: { display: 'grid', gap: '16px' } }, [
          panel([
            h('h2', { key: 'h', style: { color: COLORS.text, fontSize: '1.35rem', fontWeight: 850, margin: 0 } }, 'Decompose an L-shape'),
            h('p', { key: 'p', style: { color: COLORS.muted, margin: '6px 0 16px' } }, 'Find the same area by adding two rectangles or subtracting a missing corner.'),
            h('div', { key: 'controls', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' } }, [
              rangeControl('Outer width', outerWidth, 4, 14, function(value) {
                patch({ outerWidth: value, leftWidth: Math.min(leftWidth, value - 1) }); speak('Outer width set to ' + value + '.');
              }),
              rangeControl('Outer height', outerHeight, 4, 12, function(value) {
                patch({ outerHeight: value, notchHeight: Math.min(notchHeight, value - 1) }); speak('Outer height set to ' + value + '.');
              }),
              rangeControl('Left section width', leftWidth, 1, outerWidth - 1, function(value) { patch({ leftWidth: value }); speak('Left section width set to ' + value + '.'); }),
              rangeControl('Notch height', notchHeight, 1, outerHeight - 1, function(value) { patch({ notchHeight: value }); speak('Notch height set to ' + value + '.'); })
            ]),
            h('div', { key: 'methods', role: 'group', 'aria-label': 'Decomposition strategy', style: { display: 'flex', gap: '9px', flexWrap: 'wrap', marginTop: '18px' } }, [
              actionButton('Add two rectangles', function() {
                var used = Object.assign({}, state.compositeMethods || {}, { add: true });
                patch({ decomposition: 'add', compositeMethods: used }); speak('Add two rectangles strategy selected.');
              }, { primary: decomposition === 'add', pressed: decomposition === 'add' }),
              actionButton('Subtract the corner', function() {
                var used = Object.assign({}, state.compositeMethods || {}, { subtract: true });
                patch({ decomposition: 'subtract', compositeMethods: used }); speak('Subtract the corner strategy selected.');
              }, { primary: decomposition === 'subtract', pressed: decomposition === 'subtract' })
            ])
          ], { key: 'controls' }),
          panel([
            compositeSvg(),
            h('div', { key: 'metrics', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' } }, [
              metricCard('Composite area', compositeArea + ' square units', decomposition === 'add' ? addOne + ' + ' + addTwo : whole + ' - ' + removed, COLORS.tealDark),
              metricCard('Outer boundary', compositePerimeter + ' units', composite.boundaryEdges.join(' + '), COLORS.blue)
            ]),
            h('div', { key: 'reason', style: { marginTop: '14px', padding: '14px', borderRadius: '12px', background: COLORS.panelAlt, color: COLORS.text, border: '1px solid ' + COLORS.border } }, decomposition === 'add'
              ? h('p', { style: { margin: 0 } }, [h('strong', { key: 'b' }, 'Add strategy: '), 'Rectangle A is ' + leftWidth + ' \u00D7 ' + outerHeight + ' = ' + addOne + '. Rectangle B is ' + cutWidth + ' \u00D7 ' + (outerHeight - notchHeight) + ' = ' + addTwo + '. Together: ' + compositeArea + ' square units.'])
              : h('p', { style: { margin: 0 } }, [h('strong', { key: 'b' }, 'Subtract strategy: '), 'Start with ' + outerWidth + ' \u00D7 ' + outerHeight + ' = ' + whole + '. Remove ' + cutWidth + ' \u00D7 ' + notchHeight + ' = ' + removed + '. The L-shape has ' + compositeArea + ' square units.'])),
            formulaTable([
              ['Whole rectangle', outerWidth + ' \u00D7 ' + outerHeight, whole + ' square units'],
              ['Missing corner', cutWidth + ' \u00D7 ' + notchHeight, removed + ' square units'],
              ['L-shape area', whole + ' - ' + removed, compositeArea + ' square units'],
              ['L-shape perimeter', 'sum all 6 outside edges', compositePerimeter + ' units']
            ], 'Composite-shape measurements')
          ], { key: 'visual' })
        ]);
      }

      function investigationView() {
        var pairs = factorPairs(targetArea);
        var smallest = pairs.slice().sort(function(a, b) { return a.p - b.p; })[0];
        return h('div', { style: { display: 'grid', gap: '16px' } }, [
          panel([
            h('h2', { key: 'h', style: { color: COLORS.text, fontSize: '1.35rem', fontWeight: 850, margin: 0 } }, 'Same area, different perimeter'),
            h('p', { key: 'p', style: { color: COLORS.muted, margin: '6px 0 14px' } }, 'Every rectangle below has the same number of unit squares. Watch what happens to perimeter as the shape becomes longer and thinner.'),
            h('div', { key: 'targets', role: 'group', 'aria-label': 'Target area', style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [12, 18, 24, 30, 36].map(function(value) {
              return actionButton('Area ' + value, function() {
                var explored = Object.assign({}, state.targetsExplored || {});
                explored[value] = true;
                patch({ targetArea: value, targetsExplored: explored });
                speak('Target area ' + value + ' selected.');
              }, { primary: targetArea === value, pressed: targetArea === value, compact: true });
            }))
          ], { key: 'controls' }),
          panel([
            factorSvg(pairs),
            h('div', { key: 'insight', style: { padding: '14px', borderRadius: '12px', border: '1px solid ' + COLORS.border, background: COLORS.panelAlt, color: COLORS.text } }, [
              h('strong', { key: 'lead', style: { color: COLORS.green } }, 'Pattern spotted: '),
              'For area ' + targetArea + ', the ' + smallest.w + ' \u00D7 ' + smallest.h + ' rectangle has the least perimeter (' + smallest.p + ' units) because its side lengths are closest together.'
            ]),
            h('div', { key: 'table', style: { overflowX: 'auto', marginTop: '14px' } },
              h('table', { style: { width: '100%', borderCollapse: 'collapse', color: COLORS.text, minWidth: '470px' } }, [
                h('caption', { key: 'cap', style: { textAlign: 'left', fontWeight: 800, marginBottom: '8px' } }, 'Factor-pair rectangles for area ' + targetArea),
                h('thead', { key: 'head' }, h('tr', null, ['Dimensions', 'Area', 'Perimeter', 'Observation'].map(function(item) {
                  return h('th', { key: item, scope: 'col', style: { padding: '9px', borderBottom: '2px solid ' + COLORS.border, textAlign: 'left' } }, item);
                }))),
                h('tbody', { key: 'body' }, pairs.map(function(pair) {
                  return h('tr', { key: pair.w + '-' + pair.h }, [
                    h('th', { key: 'd', scope: 'row', style: { padding: '9px', borderBottom: '1px solid ' + COLORS.border, textAlign: 'left' } }, pair.w + ' \u00D7 ' + pair.h),
                    h('td', { key: 'a', style: { padding: '9px', borderBottom: '1px solid ' + COLORS.border } }, targetArea + ' square units'),
                    h('td', { key: 'p', style: { padding: '9px', borderBottom: '1px solid ' + COLORS.border } }, pair.p + ' units'),
                    h('td', { key: 'o', style: { padding: '9px', borderBottom: '1px solid ' + COLORS.border, color: pair.p === smallest.p ? COLORS.green : COLORS.muted, fontWeight: pair.p === smallest.p ? 800 : 400 } }, pair.p === smallest.p ? 'Least perimeter' : 'Longer boundary')
                  ]);
                }))
              ])
            )
          ], { key: 'visual' })
        ]);
      }

      function challengeView() {
        var challenge = CHALLENGES[challengeIndex];
        var feedback = state.feedback;
        var solvedMap = state.solvedChallenges || {};
        var challengeSolved = !!solvedMap[challengeIndex];
        var submitLocked = challengeSolved;
        var displayedAnswer = challengeSolved ? String(challenge.answer) : answer;
        if (challengeSolved && !feedback) feedback = { correct: true, text: 'Solved previously. ' + challenge.explanation };

        function moveChallenge(direction) {
          var nextIndex = (challengeIndex + direction + CHALLENGES.length) % CHALLENGES.length;
          patch({ challengeIndex: nextIndex, answer: '', feedback: null, showHint: false });
          speak('Challenge ' + (nextIndex + 1) + ' of ' + CHALLENGES.length + '.');
        }

        function submit(event) {
          if (event && typeof event.preventDefault === 'function') event.preventDefault();
          if (submitLocked) return;
          var numeric = Number(answer);
          if (answer.trim() === '' || !isFinite(numeric)) {
            patch({ feedback: { correct: false, text: 'Enter a number before checking.' } });
            return;
          }
          var correct = isCorrectNumericAnswer(answer, challenge.answer);
          if (correct) {
            submitLocked = true;
            var firstSolve = !solvedMap[challengeIndex];
            patch(function(current) {
              var nextSolved = Object.assign({}, current.solvedChallenges || {});
              nextSolved[challengeIndex] = true;
              var currentScore = current.score || { correct: 0, attempts: 0 };
              var nextStreak = firstSolve ? (current.streak || 0) + 1 : (current.streak || 0);
              return {
                score: { correct: countAllowed(nextSolved, AREA_CHALLENGE_IDS), attempts: (currentScore.attempts || 0) + 1 },
                solvedChallenges: nextSolved,
                streak: nextStreak,
                bestStreak: Math.max(current.bestStreak || 0, nextStreak),
                feedback: { correct: true, text: 'Correct! ' + challenge.explanation }
              };
            });
            if (firstSolve) {
              awardXP('areaPerimeter', 5, 'Area & Perimeter challenge');
              addToast('Correct! ' + challenge.answer + ' ' + challenge.unit, 'success');
            }
          } else {
            patch(function(current) {
              var currentScore = current.score || { correct: 0, attempts: 0 };
              return { score: { correct: currentScore.correct || 0, attempts: (currentScore.attempts || 0) + 1 }, streak: 0, feedback: { correct: false, text: 'Not yet. Check whether the problem asks for inside space, outside distance, or a missing side.' } };
            });
          }
        }

        return h('div', { style: { display: 'grid', gap: '16px' } }, [
          panel([
            h('div', { key: 'top', style: { display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' } }, [
              h('div', { key: 'label' }, [
                h('div', { key: 'eyebrow', style: { color: COLORS.tealDark, fontWeight: 850, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Deterministic set \u2022 Challenge ' + (challengeIndex + 1) + ' of ' + CHALLENGES.length),
                h('h2', { key: 'h', style: { color: COLORS.text, fontSize: '1.3rem', margin: '5px 0 0' } }, challenge.find)
              ]),
              h('div', { key: 'score', style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [
                h('span', { key: 'correct', style: { padding: '7px 11px', borderRadius: '999px', background: COLORS.panelAlt, color: COLORS.green, fontWeight: 800, border: '1px solid ' + COLORS.border } }, (score.correct || 0) + ' solved'),
                h('span', { key: 'streak', style: { padding: '7px 11px', borderRadius: '999px', background: COLORS.panelAlt, color: COLORS.amber, fontWeight: 800, border: '1px solid ' + COLORS.border } }, '\uD83D\uDD25 ' + (state.streak || 0) + ' streak')
              ])
            ]),
            h('p', { key: 'prompt', style: { color: COLORS.text, fontSize: '1.08rem', lineHeight: 1.55, fontWeight: 650, margin: '18px 0 8px' } }, challenge.prompt),
            challengeSvg(challenge),
            h('form', { key: 'form', onSubmit: submit, style: { display: 'flex', gap: '9px', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: '8px' } }, [
              h('label', { key: 'label', htmlFor: 'ap-answer', style: { color: COLORS.text, fontWeight: 800, flex: '1 1 210px' } }, [
                h('span', { key: 'text', style: { display: 'block', marginBottom: '6px' } }, 'Your answer (' + challenge.unit + ')'),
                h('input', {
                  key: 'input', id: 'ap-answer', type: 'number', inputMode: 'decimal', value: displayedAnswer, disabled: challengeSolved,
                  onChange: function(event) { patch({ answer: event.target.value, feedback: null }); },
                  style: { width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: '10px', border: '2px solid ' + COLORS.border, background: COLORS.panel, color: COLORS.text, fontSize: '1rem' },
                  'aria-describedby': feedback ? 'ap-feedback' : undefined
                })
              ]),
              actionButton(challengeSolved ? 'Solved' : 'Check answer', null, { type: 'submit', primary: true, disabled: challengeSolved }),
              actionButton(state.showHint ? 'Hide hint' : 'Show hint', function() { patch({ showHint: !state.showHint }); }, {})
            ]),
            state.showHint ? h('p', { key: 'hint', style: { padding: '12px', borderRadius: '10px', background: isDark ? '#422006' : '#fffbeb', color: isDark ? '#fde68a' : '#92400e', border: '1px solid ' + (isDark ? '#a16207' : '#fcd34d') } }, challenge.kind === 'composite' ? 'Find the whole rectangle, then subtract the missing corner.' : challenge.find.indexOf('Perimeter') >= 0 ? 'Trace the entire outside boundary and add every side.' : challenge.find.indexOf('Missing') >= 0 || challenge.find.indexOf('Side') >= 0 ? 'Work backward from the area or perimeter formula.' : 'Area counts square units inside; perimeter counts unit lengths around.') : null,
            feedback ? h('div', {
              key: 'feedback', id: 'ap-feedback', role: 'status', 'aria-live': 'polite',
              style: { marginTop: '12px', padding: '13px', borderRadius: '11px', border: '1px solid ' + (feedback.correct ? COLORS.green : COLORS.red), background: feedback.correct ? (isDark ? '#052e16' : '#f0fdf4') : (isDark ? '#450a0a' : '#fef2f2'), color: feedback.correct ? (isDark ? '#bbf7d0' : '#166534') : (isDark ? '#fecaca' : '#991b1b'), fontWeight: 700 }
            }, feedback.text) : null,
            h('div', { key: 'nav', style: { display: 'flex', justifyContent: 'space-between', gap: '9px', flexWrap: 'wrap', marginTop: '16px' } }, [
              actionButton('\u2190 Previous', function() { moveChallenge(-1); }, { compact: true }),
              h('span', { key: 'progress', style: { alignSelf: 'center', color: COLORS.muted, fontSize: '0.9rem' } }, countAllowed(solvedMap, AREA_CHALLENGE_IDS) + ' of ' + CHALLENGES.length + ' unique challenges complete'),
              actionButton('Next \u2192', function() { moveChallenge(1); }, { compact: true, primary: !!feedback && feedback.correct })
            ])
          ], { key: 'challenge' }),
          panel([
            h('h3', { key: 'h', style: { color: COLORS.text, fontSize: '1.05rem', margin: '0 0 8px' } }, 'Problem translation'),
            h('div', { key: 'table', style: { overflowX: 'auto' } }, h('table', { style: { width: '100%', borderCollapse: 'collapse', color: COLORS.text, minWidth: '420px' } }, [
              h('thead', { key: 'head' }, h('tr', null, ['What is given?', 'What is unknown?', 'Useful relationship'].map(function(item) { return h('th', { key: item, scope: 'col', style: { padding: '9px', borderBottom: '2px solid ' + COLORS.border, textAlign: 'left' } }, item); }))),
              h('tbody', { key: 'body' }, h('tr', null, [
                h('td', { key: 'g', style: { padding: '9px', verticalAlign: 'top' } }, challenge.kind === 'composite' ? 'Outer and removed rectangle dimensions' : challenge.kind === 'compare' ? 'Two pairs of side lengths' : 'Rectangle measurements in the prompt'),
                h('td', { key: 'u', style: { padding: '9px', verticalAlign: 'top', fontWeight: 800 } }, challenge.find),
                h('td', { key: 'r', style: { padding: '9px', verticalAlign: 'top' } }, challenge.kind === 'composite' ? 'remaining area = whole - removed' : challenge.find.indexOf('Perimeter') >= 0 ? 'P = 2(l + w)' : challenge.find.indexOf('Missing') >= 0 || challenge.find.indexOf('Side') >= 0 ? 'use the formula backward' : 'A = l \u00D7 w')
              ]))
            ]))
          ], { key: 'translation' })
        ]);
      }

      var activeView = mode === 'compare' ? compareView() : mode === 'composite' ? compositeView() : mode === 'investigate' ? investigationView() : mode === 'challenge' ? challengeView() : exploreView();

      return h('div', {
        className: 'area-perimeter-lab',
        style: { background: COLORS.page, color: COLORS.text, borderRadius: '18px', padding: 'clamp(12px, 2.5vw, 24px)', minHeight: '620px', fontFamily: 'inherit' }
      }, [
        h('header', { key: 'header', style: { marginBottom: '16px' } }, [
          h('div', { key: 'top', style: { display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' } }, [
            h('div', { key: 'titleWrap', style: { display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 } }, [
              typeof ctx.setStemLabTool === 'function' ? h('button', {
                key: 'back', type: 'button', onClick: function() { ctx.setStemLabTool(null); },
                'aria-label': 'Back to STEM tools', title: 'Back to STEM tools',
                className: 'rounded-xl border focus:outline-none focus:ring-2 focus:ring-teal-500',
                style: { width: '42px', height: '42px', display: 'grid', placeItems: 'center', borderColor: COLORS.border, background: COLORS.panel, color: COLORS.text, cursor: 'pointer', flex: '0 0 auto' }
              }, ArrowLeft ? h(ArrowLeft, { size: 20, 'aria-hidden': true }) : '\u2190') : null,
              h('div', { key: 'titles', style: { minWidth: 0 } }, [
                h('h1', { key: 'h', style: { margin: 0, color: COLORS.text, fontSize: 'clamp(1.45rem, 4vw, 2.15rem)', lineHeight: 1.15 } }, '\uD83D\uDCD0 Area & Perimeter Lab'),
                h('p', { key: 'p', style: { margin: '5px 0 0', color: COLORS.muted, lineHeight: 1.45 } }, 'Measure space inside, distance around, and the shapes between.')
              ])
            ]),
            h('div', { key: 'quick', style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [
              h('span', { key: 'solved', style: { padding: '7px 11px', borderRadius: '999px', border: '1px solid ' + COLORS.border, background: COLORS.panel, color: COLORS.green, fontWeight: 800 } }, ((score || {}).correct || 0) + ' solved'),
              h('span', { key: 'best', style: { padding: '7px 11px', borderRadius: '999px', border: '1px solid ' + COLORS.border, background: COLORS.panel, color: COLORS.amber, fontWeight: 800 } }, 'Best streak ' + (state.bestStreak || 0))
            ])
          ]),
          h('nav', { key: 'nav', 'aria-label': 'Area and perimeter lab modes', style: { marginTop: '16px' } },
            h('div', { role: 'tablist', 'aria-label': 'Lab modes', style: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '7px', overflowX: 'auto' } }, MODES.map(function(item, index) {
              var active = mode === item.id;
              return h('button', {
                key: item.id, id: 'ap-tab-' + item.id, type: 'button', role: 'tab', 'aria-selected': active,
                'aria-controls': 'ap-mode-panel', tabIndex: active ? 0 : -1,
                onClick: function() { selectMode(item.id); },
                onKeyDown: function(event) { handleModeKeyDown(event, index); },
                className: 'rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500',
                style: { minWidth: '92px', padding: '10px 7px', borderColor: active ? COLORS.teal : COLORS.border, background: active ? COLORS.teal : COLORS.panel, color: active ? COLORS.onTeal : COLORS.text, cursor: 'pointer' }
              }, h('span', null, [h('span', { key: 'icon', 'aria-hidden': true }, item.icon + ' '), h('span', { key: 'text' }, item.short)]));
            }))
          )
        ]),
        h('main', { key: 'main', id: 'ap-mode-panel', role: 'tabpanel', tabIndex: 0, 'aria-labelledby': 'ap-tab-' + mode }, activeView),
        h('footer', { key: 'footer', style: { marginTop: '15px', padding: '12px 14px', borderRadius: '12px', border: '1px solid ' + COLORS.border, background: COLORS.panel, color: COLORS.muted, fontSize: '0.9rem', lineHeight: 1.5 } }, [
          h('strong', { key: 'label', style: { color: COLORS.text } }, 'Measurement reminder: '),
          'Area uses square units because it covers a surface. Perimeter uses linear units because it traces a boundary.'
        ])
      ]);
    }
  });
})(typeof window !== 'undefined' ? window : null);
