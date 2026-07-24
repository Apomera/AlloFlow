// ═══════════════════════════════════════════
// stem_tool_science.js — STEM Lab Science Tools
// 5 registered tools (aquarium, ecosystem, molecule, solarSystem, universe, behaviorLab, economicsLab, companionPlanting extracted) (cell, chemBalance, punnett, fractionViz, gameStudio extracted)
// Auto-extracted (Phase 2 modularization)
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
// Ensure window.StemLab is available before registering tools.
// If stem_lab_module.js hasn't loaded yet, create the registry stub.
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
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-science')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-science';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();



  /* molecule tool extracted to stem_tool_molecule.js */


  /* solarSystem tool extracted to stem_tool_solarsystem.js */

  // ═══ 🔬 universe (universe) ═══

  /* universe tool extracted to stem_tool_universe.js */

  /* decomposer tool extracted to stem_tool_decomposer.js */

  /* anatomy tool extracted to stem_tool_anatomy.js */


  /* dissection: removed � see stem_tool_dissection.js */



  /* brainAtlas: removed — see stem_tool_brainatlas.js */


  /* graphCalc tool extracted to stem_tool_graphcalc.js */

  /* algebraCAS tool extracted to stem_tool_algebraCAS.js */

  // ═══ 🔬 circuit (circuit) ═══
  window.StemLab.registerTool('circuit', {
    icon: '🔬',
    label: 'circuit',
    desc: '',
    color: 'slate',
    category: 'science',
    render: function(ctx) {
      // Aliases — maps ctx properties to original variable names
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var canvasA11yDesc = ctx.canvasA11yDesc;
      var props = ctx.props;
      var canvasNarrate = ctx.canvasNarrate;

      // ── Tool body (circuit) ──
      return (function() {
var _isCircuit = stemLabTab === 'explore' && stemLabTool === 'circuit'; if (!_isCircuit) { React.useEffect(function(){}, []); return null; }

          const d = labToolData.circuit;

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('science', 'init', {
              first: 'Science Lab loaded. Explore physics, chemistry, and biology experiments with interactive simulations.',
              repeat: 'Science Lab active.',
              terse: 'Science Lab.'
            }, { debounce: 800 });
          }

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, circuit: { ...prev.circuit, [key]: val } }));

          const mode = d.mode || 'series';

          // Component resistance helper (switch, LED, ammeter, voltmeter support)

          const getCompR = (c) => c.type === 'switch' ? (c.closed ? 0.001 : 1e9) : c.type === 'ammeter' ? 0.001 : c.type === 'voltmeter' ? 1e9 : (c.value || 1);

          const toggleSwitch = (compId) => upd('components', d.components.map(c => c.id === compId ? Object.assign({}, c, { closed: !c.closed }) : c));

          const cycleLedColor = (compId) => { var _cs = ['#ef4444','#22c55e','#3b82f6','#eab308','#f8fafc']; upd('components', d.components.map(c => { if (c.id !== compId) return c; var ci = _cs.indexOf(c.ledColor || '#ef4444'); return Object.assign({}, c, { ledColor: _cs[(ci + 1) % _cs.length] }); })); };

          const hasOpenSwitch = mode === 'series' && d.components.some(c => c.type === 'switch' && !c.closed);

          const totalR = hasOpenSwitch ? 1e9 : (mode === 'series'

            ? d.components.reduce((s, c) => s + getCompR(c), 0) || 0.001

            : (d.components.length > 0 ? 1 / d.components.reduce((s, c) => s + 1 / (getCompR(c) || 1), 0) : 0.001));

          const current = hasOpenSwitch ? 0 : d.voltage / totalR;

          const power = d.voltage * current;

          const isShort = d.components.length > 0 && totalR < 1 && !hasOpenSwitch;

          const isOpen = hasOpenSwitch;

          const W = 440, H = 200;



          // Electron animation tick (proper useEffect with cleanup)

          var tick = d.tick || 0;

          React.useEffect(function () {

            if (current < 0.001 || isShort) return;

            var _tickTimer = setTimeout(function () {

              upd('tick', (tick + 1) % 400);

            }, 60);

            return function () { clearTimeout(_tickTimer); };

          }, [tick, current, isShort]);



          // Electron dots along the wire path

          var electronDots = [];

          if (current > 0.001 && !isShort) {

            var numDots = Math.min(Math.ceil(current * 3), 12);

            for (var ei = 0; ei < numDots; ei++) {

              var phase = ((tick * 2 + ei * (400 / numDots)) % 400) / 400;

              var ex, ey;

              // Path: top wire (left to right), right wire (top to bottom), bottom wire (right to left), left wire (bottom to top)

              if (phase < 0.3) { // top wire

                ex = 35 + (380 - 35) * (phase / 0.3);

                ey = 20;

              } else if (phase < 0.4) { // right wire

                ex = 380;

                ey = 20 + 120 * ((phase - 0.3) / 0.1);

              } else if (phase < 0.7) { // bottom wire

                ex = 380 - (380 - 35) * ((phase - 0.4) / 0.3);

                ey = 140;

              } else { // left wire

                ex = 35;

                ey = 140 - 120 * ((phase - 0.7) / 0.3);

              }

              electronDots.push({ x: ex, y: ey });

            }

          }



          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200" },

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDD0C Circuit Builder"),

              React.createElement("span", { className: "px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full" }, "INTERACTIVE"),

              isShort && React.createElement("span", { className: "px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full animate-pulse" }, "\u26A0 SHORT CIRCUIT!"),

              React.createElement("div", { className: "flex gap-1 ml-auto" },

                ["series", "parallel"].map(m => React.createElement("button", { "aria-label": "Upd", key: m, onClick: () => upd("mode", m), className: "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all " + (mode === m ? 'bg-yellow-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-yellow-50') }, m))

              )

            ),

            React.createElement("p", { className: "text-xs text-slate-500 italic -mt-1 mb-3" }, "Build " + mode + " circuits. V = IR. Add components and adjust voltage to see live calculations."),

            // SVG Schematic

            React.createElement("svg", { viewBox: "0 0 " + W + " " + H, className: "w-full rounded-xl border-2 shadow-sm transition-colors " + (isShort ? 'bg-red-50 border-red-300' : 'bg-gradient-to-b from-yellow-50 to-white border-yellow-200'), style: { maxHeight: "220px" } },

              // Battery

              React.createElement("rect", { x: 15, y: 40, width: 40, height: 60, fill: isShort ? '#fca5a5' : '#fbbf24', stroke: isShort ? '#dc2626' : '#92400e', strokeWidth: 2, rx: 5 }),

              React.createElement("text", { x: 35, y: 72, textAnchor: "middle", style: { fontSize: '11px', fontWeight: 'bold' }, fill: isShort ? '#dc2626' : '#92400e' }, d.voltage + "V"),

              React.createElement("text", { x: 35, y: 32, textAnchor: "middle", style: { fontSize: '12px' }, fill: "#92400e" }, "\uD83D\uDD0B"),

              // + / - terminals

              React.createElement("text", { x: 20, y: 38, fill: "#dc2626", style: { fontSize: '12px', fontWeight: 'bold' } }, "+"),

              React.createElement("text", { x: 20, y: 110, fill: "#3b82f6", style: { fontSize: '12px', fontWeight: 'bold' } }, "\u2212"),

              // Wires

              React.createElement("line", { x1: 35, y1: 40, x2: 35, y2: 20, stroke: isShort ? '#dc2626' : '#1e293b', strokeWidth: 2 }),

              React.createElement("line", { x1: 35, y1: 20, x2: 400, y2: 20, stroke: isShort ? '#dc2626' : '#1e293b', strokeWidth: 2 }),

              React.createElement("line", { x1: 35, y1: 100, x2: 35, y2: 140, stroke: isShort ? '#dc2626' : '#1e293b', strokeWidth: 2 }),

              React.createElement("line", { x1: 35, y1: 140, x2: 400, y2: 140, stroke: isShort ? '#dc2626' : '#1e293b', strokeWidth: 2 }),

              React.createElement("line", { x1: 400, y1: 20, x2: 400, y2: 140, stroke: isShort ? '#dc2626' : '#1e293b', strokeWidth: 2 }),

              // Current direction arrow

              !isShort && current > 0.01 && React.createElement("g", null,

                React.createElement("polygon", { points: "210,12 220,8 220,16", fill: "#3b82f6" }),

                React.createElement("text", { x: 225, y: 15, fill: "#3b82f6", style: { fontSize: '7px', fontWeight: 'bold' } }, "I = " + current.toFixed(2) + "A")

              ),

              // Components — Series

              mode === 'series'

                ? d.components.map(function (comp, i) {

                  var spacing = Math.min(70, 280 / Math.max(d.components.length, 1));

                  var cx = 80 + i * spacing;

                  var compI = current;

                  var compR = getCompR(comp);

                  var compV = current * compR;

                  var compP = compV * compI;

                  var bulbBright = comp.type === 'bulb' ? Math.min(compP / 10, 1) : 0;

                  var ledGlow = comp.type === 'led' && current > 0.005 ? Math.min(current * 20, 1) : 0;

                  return React.createElement("g", { key: comp.id },

                    React.createElement("line", { x1: cx, y1: 20, x2: cx, y2: 55, stroke: "#1e293b", strokeWidth: 2 }),

                    comp.type === 'resistor'

                      ? React.createElement("g", null,

                        React.createElement("rect", { x: cx - 12, y: 55, width: 24, height: 45, fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.5, rx: 3 }),

                        React.createElement("line", { x1: cx - 8, y1: 65, x2: cx + 8, y2: 65, stroke: "#ca8a04", strokeWidth: 1 }),

                        React.createElement("line", { x1: cx - 8, y1: 72, x2: cx + 8, y2: 72, stroke: "#ca8a04", strokeWidth: 1 }),

                        React.createElement("line", { x1: cx - 8, y1: 79, x2: cx + 8, y2: 79, stroke: "#ca8a04", strokeWidth: 1 }),

                        React.createElement("line", { x1: cx - 8, y1: 86, x2: cx + 8, y2: 86, stroke: "#ca8a04", strokeWidth: 1 })

                      )

                      : comp.type === 'switch'

                      ? React.createElement("g", { onClick: function () { toggleSwitch(comp.id); }, style: { cursor: 'pointer' } },

                        React.createElement("rect", { x: cx - 14, y: 55, width: 28, height: 40, fill: comp.closed ? '#d1fae5' : '#fee2e2', stroke: comp.closed ? '#059669' : '#dc2626', strokeWidth: 1.5, rx: 4 }),

                        React.createElement("circle", { cx: cx - 6, cy: 75, r: 3, fill: '#1e293b' }),

                        React.createElement("circle", { cx: cx + 6, cy: 75, r: 3, fill: '#1e293b' }),

                        comp.closed

                          ? React.createElement("line", { x1: cx - 6, y1: 75, x2: cx + 6, y2: 75, stroke: '#059669', strokeWidth: 2.5 })

                          : React.createElement("line", { x1: cx - 6, y1: 75, x2: cx + 4, y2: 62, stroke: '#dc2626', strokeWidth: 2.5 }),

                        React.createElement("text", { x: cx, y: 68, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: 'bold' }, fill: comp.closed ? '#059669' : '#dc2626' }, comp.closed ? 'ON' : 'OFF')

                      )

                      : comp.type === 'led'

                      ? React.createElement("g", { onClick: function () { cycleLedColor(comp.id); }, style: { cursor: 'pointer' } },

                        ledGlow > 0.1 && React.createElement("circle", { cx: cx, cy: 75, r: 18 + ledGlow * 8, fill: (comp.ledColor || '#ef4444').replace(')', ',' + (ledGlow * 0.3).toFixed(2) + ')').replace('rgb', 'rgba').replace('#ef4444', 'rgba(239,68,68,' + (ledGlow * 0.3).toFixed(2) + ')').replace('#22c55e', 'rgba(34,197,94,' + (ledGlow * 0.3).toFixed(2) + ')').replace('#3b82f6', 'rgba(59,130,246,' + (ledGlow * 0.3).toFixed(2) + ')').replace('#eab308', 'rgba(234,179,8,' + (ledGlow * 0.3).toFixed(2) + ')').replace('#f8fafc', 'rgba(248,250,252,' + (ledGlow * 0.3).toFixed(2) + ')') }),

                        React.createElement("polygon", { points: (cx - 10) + ',65 ' + (cx + 10) + ',65 ' + cx + ',88', fill: ledGlow > 0.2 ? (comp.ledColor || '#ef4444') : '#fecaca', stroke: comp.ledColor || '#ef4444', strokeWidth: 1.5 }),

                        React.createElement("line", { x1: cx - 10, y1: 88, x2: cx + 10, y2: 88, stroke: comp.ledColor || '#ef4444', strokeWidth: 2 }),

                        React.createElement("line", { x1: cx + 7, y1: 70, x2: cx + 13, y2: 63, stroke: comp.ledColor || '#ef4444', strokeWidth: 1 }),

                        React.createElement("polygon", { points: (cx + 13) + ',63 ' + (cx + 11) + ',66 ' + (cx + 14) + ',65', fill: comp.ledColor || '#ef4444' }),

                        React.createElement("line", { x1: cx + 10, y1: 74, x2: cx + 16, y2: 67, stroke: comp.ledColor || '#ef4444', strokeWidth: 1 }),

                        React.createElement("polygon", { points: (cx + 16) + ',67 ' + (cx + 14) + ',70 ' + (cx + 17) + ',69', fill: comp.ledColor || '#ef4444' })

                      )

                      : comp.type === 'ammeter'

                      ? React.createElement("g", null,

                        React.createElement("circle", { cx: cx, cy: 75, r: 15, fill: '#eff6ff', stroke: '#2563eb', strokeWidth: 2 }),

                        React.createElement("text", { x: cx, y: 79, textAnchor: 'middle', style: { fontSize: '12px', fontWeight: 'bold' }, fill: '#2563eb' }, 'A'),

                        current > 0.001 && React.createElement("text", { x: cx, y: 68, textAnchor: 'middle', style: { fontSize: '6px', fontWeight: 'bold' }, fill: '#1d4ed8' }, current.toFixed(3) + 'A')

                      )

                      : comp.type === 'voltmeter'

                      ? React.createElement("g", null,

                        React.createElement("circle", { cx: cx, cy: 75, r: 15, fill: '#fefce8', stroke: '#ca8a04', strokeWidth: 2 }),

                        React.createElement("text", { x: cx, y: 79, textAnchor: 'middle', style: { fontSize: '12px', fontWeight: 'bold' }, fill: '#ca8a04' }, 'V'),

                        React.createElement("text", { x: cx, y: 68, textAnchor: 'middle', style: { fontSize: '6px', fontWeight: 'bold' }, fill: '#a16207' }, d.voltage.toFixed(1) + 'V')

                      )

                      : React.createElement("g", null,

                        // Glowing halo for bulb

                        bulbBright > 0.1 && React.createElement("circle", { cx: cx, cy: 77, r: 20 + bulbBright * 8, fill: "rgba(251,191,36," + (bulbBright * 0.25).toFixed(2) + ")" }),

                        React.createElement("circle", { cx: cx, cy: 77, r: 15, fill: bulbBright > 0.3 ? "rgba(251,191,36," + (0.3 + bulbBright * 0.7).toFixed(2) + ")" : '#fef3c7', stroke: "#f59e0b", strokeWidth: 1.5 }),

                        React.createElement("line", { x1: cx - 5, y1: 72, x2: cx + 5, y2: 82, stroke: "#92400e", strokeWidth: 1 }),

                        React.createElement("line", { x1: cx + 5, y1: 72, x2: cx - 5, y2: 82, stroke: "#92400e", strokeWidth: 1 })

                      ),

                    comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter' && React.createElement("text", { x: cx, y: comp.type === 'resistor' ? 110 : (comp.type === 'led' ? 104 : 100), textAnchor: "middle", style: { fontSize: '8px', fontWeight: 'bold' }, fill: "#78350f" }, (comp.type === 'led' ? '~2V drop' : comp.value + "\u03A9")),

                    // Voltage drop label

                    current > 0.01 && comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter' && React.createElement("text", { x: cx, y: comp.type === 'resistor' ? 118 : (comp.type === 'led' ? 112 : 108), textAnchor: "middle", style: { fontSize: '7px' }, fill: "#3b82f6" }, compV.toFixed(1) + "V"),

                    React.createElement("line", { x1: cx, y1: comp.type === 'resistor' ? 100 : (comp.type === 'switch' ? 95 : (comp.type === 'ammeter' || comp.type === 'voltmeter' ? 90 : 92)), x2: cx, y2: 140, stroke: "#1e293b", strokeWidth: 2 })

                  );

                })

                // Components — Parallel

                : d.components.map(function (comp, i) {

                  var cy = 40 + i * Math.min(30, 80 / Math.max(d.components.length, 1));

                  var compR2 = getCompR(comp);

                  var compI2 = d.voltage / compR2;

                  var compP2 = d.voltage * compI2;

                  var bulbBright2 = comp.type === 'bulb' ? Math.min(compP2 / 10, 1) : 0;

                  var ledGlow2 = comp.type === 'led' && compI2 > 0.005 ? Math.min(compI2 * 20, 1) : 0;

                  return React.createElement("g", { key: comp.id },

                    React.createElement("line", { x1: 180, y1: cy, x2: 200, y2: cy, stroke: "#1e293b", strokeWidth: 1.5 }),

                    comp.type === 'resistor'

                      ? React.createElement("rect", { x: 200, y: cy - 8, width: 40, height: 16, fill: "#fef9c3", stroke: "#ca8a04", strokeWidth: 1.5, rx: 2 })

                      : comp.type === 'switch'

                      ? React.createElement("g", { onClick: function () { toggleSwitch(comp.id); }, style: { cursor: 'pointer' } },

                        React.createElement("rect", { x: 200, y: cy - 8, width: 40, height: 16, fill: comp.closed ? '#d1fae5' : '#fee2e2', stroke: comp.closed ? '#059669' : '#dc2626', strokeWidth: 1.5, rx: 3 }),

                        React.createElement("text", { x: 220, y: cy + 4, textAnchor: 'middle', style: { fontSize: '8px', fontWeight: 'bold' }, fill: comp.closed ? '#059669' : '#dc2626' }, comp.closed ? 'ON' : 'OFF')

                      )

                      : comp.type === 'led'

                      ? React.createElement("g", { onClick: function () { cycleLedColor(comp.id); }, style: { cursor: 'pointer' } },

                        ledGlow2 > 0.1 && React.createElement("circle", { cx: 220, cy: cy, r: 14 + ledGlow2 * 5, fill: 'rgba(239,68,68,' + (ledGlow2 * 0.25).toFixed(2) + ')' }),

                        React.createElement("polygon", { points: '210,' + (cy - 6) + ' 230,' + (cy - 6) + ' 220,' + (cy + 8), fill: ledGlow2 > 0.2 ? (comp.ledColor || '#ef4444') : '#fecaca', stroke: comp.ledColor || '#ef4444', strokeWidth: 1 }),

                        React.createElement("line", { x1: 210, y1: cy + 8, x2: 230, y2: cy + 8, stroke: comp.ledColor || '#ef4444', strokeWidth: 1.5 })

                      )

                      : comp.type === 'ammeter'

                      ? React.createElement("g", null,

                        React.createElement("circle", { cx: 220, cy: cy, r: 10, fill: '#eff6ff', stroke: '#2563eb', strokeWidth: 1.5 }),

                        React.createElement("text", { x: 220, y: cy + 4, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: 'bold' }, fill: '#2563eb' }, 'A')

                      )

                      : comp.type === 'voltmeter'

                      ? React.createElement("g", null,

                        React.createElement("circle", { cx: 220, cy: cy, r: 10, fill: '#fefce8', stroke: '#ca8a04', strokeWidth: 1.5 }),

                        React.createElement("text", { x: 220, y: cy + 4, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: 'bold' }, fill: '#ca8a04' }, 'V')

                      )

                      : React.createElement("g", null,

                        bulbBright2 > 0.1 && React.createElement("circle", { cx: 220, cy: cy, r: 15 + bulbBright2 * 5, fill: "rgba(251,191,36," + (bulbBright2 * 0.25).toFixed(2) + ")" }),

                        React.createElement("circle", { cx: 220, cy: cy, r: 10, fill: bulbBright2 > 0.3 ? "rgba(251,191,36," + (0.3 + bulbBright2 * 0.7).toFixed(2) + ")" : '#fef3c7', stroke: "#f59e0b", strokeWidth: 1.5 })

                      ),

                    comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter' && React.createElement("text", { x: 220, y: cy + 4, textAnchor: "middle", style: { fontSize: '7px', fontWeight: 'bold' }, fill: "#78350f" }, comp.type === 'led' ? '~2V' : comp.value + "\u03A9"),

                    comp.type === 'ammeter' && React.createElement("text", { x: 250, y: cy + 3, style: { fontSize: '6px', fontWeight: 'bold' }, fill: "#2563eb" }, compI2.toFixed(3) + 'A'),

                    comp.type === 'voltmeter' && React.createElement("text", { x: 250, y: cy + 3, style: { fontSize: '6px', fontWeight: 'bold' }, fill: "#ca8a04" }, d.voltage.toFixed(1) + 'V'),

                    comp.type !== 'ammeter' && comp.type !== 'voltmeter' && React.createElement("text", { x: 250, y: cy + 3, style: { fontSize: '6px' }, fill: "#3b82f6" }, compI2.toFixed(2) + "A"),

                    React.createElement("line", { x1: 240, y1: cy, x2: 260, y2: cy, stroke: "#1e293b", strokeWidth: 1.5 })

                  );

                }),

              // Electron dots

              electronDots.map(function (dot, i) {

                return React.createElement("circle", { key: 'e' + i, cx: dot.x, cy: dot.y, r: 3, fill: "#3b82f6", opacity: 0.8 });

              }),

              // Empty state

              d.components.length === 0 && React.createElement("text", { x: W / 2, y: H / 2, textAnchor: "middle", fill: "#94a3b8", style: { fontSize: '12px' } }, "Add components below")

            ),

            // Component buttons

            React.createElement("div", { className: "flex flex-wrap gap-2 mt-3 mb-3" },

              React.createElement("button", { "aria-label": "Resistor", onClick: () => upd('components', [...d.components, { type: 'resistor', value: 100, id: Date.now() }]), className: "px-3 py-1.5 bg-yellow-100 text-yellow-800 font-bold rounded-lg text-sm border border-yellow-300 hover:bg-yellow-200 transition-all" }, "\u2795 Resistor"),

              React.createElement("button", { "aria-label": "Bulb", onClick: () => upd('components', [...d.components, { type: 'bulb', value: 50, id: Date.now() + 1 }]), className: "px-3 py-1.5 bg-amber-100 text-amber-800 font-bold rounded-lg text-sm border border-amber-300 hover:bg-amber-200 transition-all" }, "\uD83D\uDCA1 Bulb"),

              React.createElement("button", { "aria-label": "Switch", onClick: () => upd('components', [...d.components, { type: 'switch', value: 0, id: Date.now() + 2, closed: true }]), className: "px-3 py-1.5 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-sm border border-emerald-300 hover:bg-emerald-200 transition-all" }, "\uD83D\uDD18 Switch"),

              React.createElement("button", { "aria-label": "LED", onClick: () => upd('components', [...d.components, { type: 'led', value: 40, id: Date.now() + 3, ledColor: '#ef4444' }]), className: "px-3 py-1.5 bg-rose-100 text-rose-800 font-bold rounded-lg text-sm border border-rose-300 hover:bg-rose-200 transition-all" }, "\uD83D\uDD34 LED"),

              React.createElement("button", { "aria-label": "Ammeter", onClick: () => upd('components', [...d.components, { type: 'ammeter', value: 0, id: Date.now() + 4 }]), className: "px-3 py-1.5 bg-blue-100 text-blue-800 font-bold rounded-lg text-sm border border-blue-300 hover:bg-blue-200 transition-all" }, "\u26A1 Ammeter"),

              React.createElement("button", { "aria-label": "Voltmeter", onClick: () => upd('components', [...d.components, { type: 'voltmeter', value: 0, id: Date.now() + 5 }]), className: "px-3 py-1.5 bg-orange-100 text-orange-800 font-bold rounded-lg text-sm border border-orange-300 hover:bg-orange-200 transition-all" }, "\uD83D\uDD0B Voltmeter"),

              React.createElement("button", { "aria-label": "Clear", onClick: () => upd('components', []), className: "px-3 py-1.5 bg-red-50 text-red-600 font-bold rounded-lg text-sm border border-red-200 hover:bg-red-100 transition-all" }, "\uD83D\uDDD1 Clear"),

              d.components.length > 0 && React.createElement("span", { className: "self-center text-xs text-slate-500 ml-auto" }, d.components.length + " component" + (d.components.length > 1 ? 's' : ''))

            ),

            // Voltage slider + component editor

            React.createElement("div", { className: "bg-white rounded-xl border border-yellow-200 p-3" },

              React.createElement("div", { className: "flex items-center gap-3 mb-3" },

                React.createElement("span", { className: "text-xl" }, "\uD83D\uDD0B"),

                React.createElement("input", { type: "range", min: 1, max: 24, step: 0.5, value: d.voltage, onChange: e => upd('voltage', parseFloat(e.target.value)), className: "flex-1 accent-yellow-600" }),

                React.createElement("span", { className: "font-bold text-yellow-700 w-12 text-right" }, d.voltage + "V")

              ),

              React.createElement("div", { className: "flex flex-wrap gap-2" },

                d.components.map(function (comp, i) {

                  var compIcon = comp.type === 'resistor' ? '\u2AE8' : comp.type === 'bulb' ? '\uD83D\uDCA1' : comp.type === 'switch' ? '\uD83D\uDD18' : comp.type === 'led' ? '\uD83D\uDD34' : comp.type === 'ammeter' ? '\u26A1' : '\uD83D\uDD0B';

                  var compLabel = comp.type === 'resistor' ? 'R' : comp.type === 'bulb' ? 'Bulb' : comp.type === 'switch' ? (comp.closed ? 'ON' : 'OFF') : comp.type === 'led' ? 'LED' : comp.type === 'ammeter' ? 'Ammeter' : 'Voltmeter';

                  return React.createElement("div", { key: comp.id, className: "flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-400" },

                    React.createElement("span", null, compIcon),

                    React.createElement("span", { className: "text-xs font-bold text-slate-600 min-w-[40px]" }, compLabel),

                    (comp.type === 'resistor' || comp.type === 'bulb') && React.createElement("input", { type: "number", min: 1, max: 10000, value: comp.value, onChange: function (e) { var nc = [...d.components]; nc[i] = Object.assign({}, nc[i], { value: parseInt(e.target.value) || 1 }); upd('components', nc); }, className: "w-20 px-2 py-1 text-sm border rounded text-center font-mono" }),

                    (comp.type === 'resistor' || comp.type === 'bulb') && React.createElement("span", { className: "text-xs text-slate-500" }, "\u03A9"),

                    comp.type === 'switch' && React.createElement("button", { "aria-label": "Close", onClick: function () { toggleSwitch(comp.id); }, className: "px-2 py-1 text-xs font-bold rounded border transition-all " + (comp.closed ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-red-100 text-red-700 border-red-300') }, comp.closed ? 'Close' : 'Open'),

                    comp.type === 'led' && React.createElement("button", { "aria-label": "Cycle Led Color", onClick: function () { cycleLedColor(comp.id); }, className: "w-5 h-5 rounded-full border-2 border-slate-300", style: { backgroundColor: comp.ledColor || '#ef4444' } }),

                    React.createElement("button", { "aria-label": "Change components", onClick: function () { upd('components', d.components.filter(function (_, j) { return j !== i; })); }, className: "text-red-400 hover:text-red-600 ml-auto" }, "\u00D7")

                  );

                })

              )

            ),

            // Readout cards

            React.createElement("div", { className: "mt-3 grid grid-cols-4 gap-2" },

              [

                { label: t('stem.circuit.mode'), val: mode, color: 'slate', icon: mode === 'series' ? '\u2192' : '\u2261' },

                { label: t('stem.circuit.resistance'), val: totalR.toFixed(1) + '\u03A9', color: 'yellow', icon: '\u2AE8' },

                { label: t('stem.circuit.current'), val: current.toFixed(3) + 'A', color: 'blue', icon: '\u26A1' },

                { label: t('stem.circuit.power'), val: power.toFixed(2) + 'W', color: 'red', icon: '\uD83D\uDD25' }

              ].map(function (m) {

                return React.createElement("div", { key: m.label, className: "text-center p-2 rounded-xl border transition-all " + (isShort && m.label !== t('stem.circuit.mode') ? 'bg-red-50 border-red-200' : 'bg-' + m.color + '-50 border-' + m.color + '-200') },

                  React.createElement("p", { className: "text-[10px] font-bold uppercase " + (isShort && m.label !== t('stem.circuit.mode') ? 'text-red-600' : 'text-' + m.color + '-600') }, m.icon + ' ' + m.label),

                  React.createElement("p", { className: "text-sm font-bold " + (isShort && m.label !== t('stem.circuit.mode') ? 'text-red-800' : 'text-' + m.color + '-800') }, m.val)

                );

              })

            ),

            // Per-component analysis

            d.components.length > 0 && React.createElement("div", { className: "mt-3 bg-yellow-50 rounded-xl border border-yellow-200 p-3" },

              React.createElement("p", { className: "text-[10px] font-bold text-yellow-700 uppercase tracking-wider mb-2" }, "\u26A1 Per-Component Analysis"),

              React.createElement("div", { className: "space-y-1" },

                d.components.map(function (comp, i) {

                  var compR = getCompR(comp);

                  var compI = mode === 'series' ? current : d.voltage / compR;

                  var compV = mode === 'series' ? current * compR : d.voltage;

                  var compP = compV * compI;

                  var typeIcon = comp.type === 'resistor' ? '\u2AE8 R' : comp.type === 'bulb' ? '\uD83D\uDCA1 B' : comp.type === 'switch' ? '\uD83D\uDD18 S' : comp.type === 'led' ? '\uD83D\uDD34 L' : comp.type === 'ammeter' ? '\u26A1 A' : '\uD83D\uDD0B V';

                  var rDisplay = comp.type === 'switch' ? (comp.closed ? '~0\u03A9' : '\u221E') : comp.type === 'ammeter' ? '~0\u03A9' : comp.type === 'voltmeter' ? '\u221E' : comp.type === 'led' ? '~40\u03A9' : comp.value + '\u03A9';

                  return React.createElement("div", { key: comp.id, className: "flex items-center gap-2 text-xs bg-white rounded-lg px-2 py-1.5 border" },

                    React.createElement("span", { className: "font-bold text-yellow-700 w-16" }, typeIcon + (i + 1)),

                    React.createElement("span", { className: "text-slate-500 w-16" }, rDisplay),

                    comp.type === 'ammeter' ? React.createElement("span", { className: "text-blue-600 w-40 font-mono font-bold" }, '\u27A1 ' + compI.toFixed(3) + 'A (reads current)')

                    : comp.type === 'voltmeter' ? React.createElement("span", { className: "text-amber-600 w-40 font-mono font-bold" }, '\u27A1 ' + d.voltage.toFixed(1) + 'V (reads voltage)')

                    : React.createElement(React.Fragment, null,

                      React.createElement("span", { className: "text-blue-600 w-20 font-mono" }, compV.toFixed(2) + 'V'),

                      React.createElement("span", { className: "text-emerald-600 w-20 font-mono" }, compI.toFixed(3) + 'A'),

                      React.createElement("span", { className: "text-red-600 w-20 font-mono font-bold" }, compP.toFixed(2) + 'W')

                    ),

                    comp.type === 'bulb' && React.createElement("span", { className: "text-yellow-500" }, compP > 10 ? '\uD83D\uDD06' : compP > 3 ? '\uD83D\uDCA1' : '\uD83D\uDD05'),

                    comp.type === 'switch' && React.createElement("span", { className: comp.closed ? 'text-emerald-500' : 'text-red-500' }, comp.closed ? '\u2705 Closed' : '\u274C Open'),

                    comp.type === 'led' && React.createElement("span", { style: { color: comp.ledColor || '#ef4444' } }, compI > 0.005 ? '\u2B50 Lit' : '\u26AB Off')

                  );

                })

              ),

              React.createElement("div", { className: "mt-2 flex items-center gap-2 text-[10px] text-slate-500" },

                React.createElement("span", null, "\u2696 V = IR"),

                React.createElement("span", null, "\u2022"),

                React.createElement("span", null, "P = IV"),

                React.createElement("span", null, "\u2022"),

                React.createElement("span", null, mode === 'series' ? 'Series: same current through all' : 'Parallel: same voltage across all')

              )

            ),

            // Open circuit warning

            isOpen && React.createElement("div", { className: "mt-3 bg-amber-100 rounded-xl border-2 border-amber-400 p-3 text-center" },

              React.createElement("p", { className: "text-lg font-black text-amber-700" }, "\uD83D\uDD13 CIRCUIT OPEN"),

              React.createElement("p", { className: "text-xs text-amber-600 mt-1" }, "A switch is open \u2014 no current flows. Close all switches to complete the circuit.")

            ),

            // Short circuit warning

            isShort && React.createElement("div", { className: "mt-3 bg-red-100 rounded-xl border-2 border-red-400 p-3 text-center animate-pulse" },

              React.createElement("p", { className: "text-lg font-black text-red-700" }, "\u26A0\uFE0F SHORT CIRCUIT DETECTED"),

              React.createElement("p", { className: "text-xs text-red-600 mt-1" }, "Total resistance is below 1\u03A9! In real life, this could damage components or cause a fire. Add more resistance.")

            ),

            // Circuit challenges

            React.createElement("div", { className: "mt-3 bg-amber-50 rounded-xl border border-amber-200 p-3" },

              React.createElement("p", { className: "text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2" }, "\uD83C\uDFAF Circuit Challenges"),

              React.createElement("div", { className: "flex flex-wrap gap-2" },

                [

                  { label: t('stem.circuit.get_2a_current'), target: 2, type: 'current', unit: 'A' },

                  { label: t('stem.circuit.get_05a_current'), target: 0.5, type: 'current', unit: 'A' },

                  { label: t('stem.circuit.total_r_200u03a9'), target: 200, type: 'resistance', unit: '\u03A9' },

                  { label: t('stem.circuit.power_24w'), target: 24, type: 'power', unit: 'W' },

                  { label: t('stem.circuit.total_r_50u03a9'), target: 50, type: 'resistance', unit: '\u03A9' },

                ].map(function (ch) {

                  var actual = ch.type === 'current' ? current : ch.type === 'resistance' ? totalR : power;

                  var close = Math.abs(actual - ch.target) < ch.target * 0.05;

                  return React.createElement("button", { "aria-label": "Science action",

                    key: ch.label, onClick: function () {

                      if (close) { addToast(t('stem.circuit.u2705_challenge_complete_you_hit') + actual.toFixed(3) + ch.unit + ' (target: ' + ch.target + ch.unit + ')', 'success'); }

                      else { addToast(t('stem.circuit.ud83cudfaf_target') + ch.target + ch.unit + ' | Current: ' + actual.toFixed(3) + ch.unit + '. Adjust components!', 'info'); }

                      upd('challenge', ch);

                    }, className: "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all " + (close ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50')

                  }, (close ? '\u2705 ' : '\uD83C\uDFAF ') + ch.label);

                })

              )

            ),

            // ── Ohm's Law Quiz ──

            (() => {

              var cq = d.ohmQuiz || null;

              var cqScore = d.ohmScore || 0;

              var cqStreak = d.ohmStreak || 0;

              function makeOhmQ() {

                var qTypes = [

                  function () { var V = [3, 5, 6, 9, 12, 24][Math.floor(Math.random() * 6)]; var R = [10, 20, 50, 100, 200, 500][Math.floor(Math.random() * 6)]; var I = V / R; return { q: 'A ' + V + 'V battery drives current through a ' + R + 'Ω resistor. What is the current?', a: parseFloat(I.toFixed(3)), unit: 'A', formula: 'I = V/R = ' + V + '/' + R + ' = ' + I.toFixed(3) + 'A' }; },

                  function () { var I2 = [0.1, 0.2, 0.5, 1, 2, 3][Math.floor(Math.random() * 6)]; var R2 = [10, 20, 50, 100, 200][Math.floor(Math.random() * 5)]; var V2 = I2 * R2; return { q: 'A current of ' + I2 + 'A flows through a ' + R2 + 'Ω resistor. What voltage is required?', a: parseFloat(V2.toFixed(1)), unit: 'V', formula: 'V = IR = ' + I2 + '×' + R2 + ' = ' + V2.toFixed(1) + 'V' }; },

                  function () { var V3 = [6, 9, 12, 24][Math.floor(Math.random() * 4)]; var I3 = [0.1, 0.2, 0.5, 1, 2][Math.floor(Math.random() * 5)]; var R3 = V3 / I3; return { q: 'A ' + V3 + 'V source pushes ' + I3 + 'A of current. What is the resistance?', a: parseFloat(R3.toFixed(1)), unit: 'Ω', formula: 'R = V/I = ' + V3 + '/' + I3 + ' = ' + R3.toFixed(1) + 'Ω' }; },

                  function () { var V4 = [6, 9, 12][Math.floor(Math.random() * 3)]; var I4 = [0.5, 1, 2, 3][Math.floor(Math.random() * 4)]; var P4 = V4 * I4; return { q: 'A ' + V4 + 'V circuit draws ' + I4 + 'A. What is the power consumed?', a: parseFloat(P4.toFixed(1)), unit: 'W', formula: 'P = IV = ' + I4 + '×' + V4 + ' = ' + P4.toFixed(1) + 'W' }; },

                  function () { var R5a = [50, 100, 200][Math.floor(Math.random() * 3)]; var R5b = [50, 100, 200][Math.floor(Math.random() * 3)]; var Rtot = R5a + R5b; return { q: 'Two resistors (' + R5a + 'Ω and ' + R5b + 'Ω) are in series. What is the total resistance?', a: parseFloat(Rtot.toFixed(1)), unit: 'Ω', formula: 'R_total = R₁ + R₂ = ' + R5a + ' + ' + R5b + ' = ' + Rtot + 'Ω' }; },

                  function () { var R6a = [100, 200, 300][Math.floor(Math.random() * 3)]; var R6b = [100, 200, 300][Math.floor(Math.random() * 3)]; var Rpar = (R6a * R6b) / (R6a + R6b); return { q: 'Two resistors (' + R6a + 'Ω and ' + R6b + 'Ω) are in parallel. What is the total resistance?', a: parseFloat(Rpar.toFixed(1)), unit: 'Ω', formula: 'R = (R₁×R₂)/(R₁+R₂) = (' + R6a + '×' + R6b + ')/(' + R6a + '+' + R6b + ') = ' + Rpar.toFixed(1) + 'Ω' }; }

                ];

                var gen = qTypes[Math.floor(Math.random() * qTypes.length)]();

                var wrong1 = parseFloat((gen.a * (1.5 + Math.random())).toFixed(gen.unit === 'A' ? 3 : 1));

                var wrong2 = parseFloat((gen.a * (0.2 + Math.random() * 0.5)).toFixed(gen.unit === 'A' ? 3 : 1));

                var wrong3 = parseFloat((gen.a + (Math.random() > 0.5 ? 1 : -1) * (gen.a * 0.3 + 5)).toFixed(gen.unit === 'A' ? 3 : 1));

                if (wrong2 <= 0) wrong2 = parseFloat((gen.a * 2.5).toFixed(gen.unit === 'A' ? 3 : 1));

                var opts = [gen.a, wrong1, wrong2, wrong3].sort(function () { return Math.random() - 0.5; });

                return { text: gen.q, answer: gen.a, unit: gen.unit, formula: gen.formula, opts: opts, answered: false };

              }

              return React.createElement("div", { className: "mt-3 bg-blue-50 rounded-xl border border-blue-200 p-3" },

                React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                  React.createElement("button", { "aria-label": "Science action",

                    onClick: function () { var q = makeOhmQ(); upd('ohmQuiz', q); },

                    className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (cq ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-blue-600 text-white hover:bg-blue-700')

                  }, cq ? '🔄 Next Question' : '⚡ Ohm\'s Law Quiz'),

                  cqScore > 0 && React.createElement("span", { className: "text-xs font-bold text-emerald-600" }, '⭐ ' + cqScore + ' correct'),

                  cqStreak > 1 && React.createElement("span", { className: "text-xs font-bold text-orange-600" }, '🔥 ' + cqStreak + ' streak')

                ),

                cq && !cq.answered && React.createElement("div", { className: "bg-white rounded-lg p-3 border border-blue-200" },

                  React.createElement("p", { className: "text-sm font-bold text-blue-800 mb-3" }, cq.text),

                  React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                    cq.opts.map(function (opt, oi) {

                      return React.createElement("button", { "aria-label": "Science action",

                        key: oi, onClick: function () {

                          var correct = Math.abs(opt - cq.answer) < 0.01;

                          upd('ohmQuiz', Object.assign({}, cq, { answered: true, chosen: opt }));

                          upd('ohmScore', cqScore + (correct ? 1 : 0));

                          upd('ohmStreak', correct ? cqStreak + 1 : 0);

                          if (correct) { addToast('⚡ Correct! ' + cq.formula, 'success'); awardStemXP('circuit', 10, 'Ohm\'s Law Quiz'); }

                          else { addToast('❌ ' + cq.formula, 'error'); }

                        }, className: "px-3 py-2.5 rounded-lg text-sm font-bold border-2 bg-white text-slate-700 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all"

                      }, opt + cq.unit);

                    })

                  )

                ),

                cq && cq.answered && React.createElement("div", { className: "p-3 rounded-lg text-sm font-bold " + (Math.abs(cq.chosen - cq.answer) < 0.01 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') },

                  Math.abs(cq.chosen - cq.answer) < 0.01 ? '✅ Correct!' : '❌ Answer: ' + cq.answer + cq.unit,

                  React.createElement("p", { className: "text-xs font-normal mt-1 " + (Math.abs(cq.chosen - cq.answer) < 0.01 ? 'text-emerald-600' : 'text-red-600') }, '📐 ' + cq.formula)

                )

              );

            })(),

            React.createElement("button", { "aria-label": "Snapshot", onClick: () => { setToolSnapshots(prev => [...prev, { id: 'ci-' + Date.now(), tool: 'circuit', label: d.components.length + ' parts ' + d.voltage + 'V ' + mode, data: Object.assign({}, d, { mode: mode }), timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

          )
      })();
    }
  });

  console.log('[StemLab] stem_tool_science.js loaded — 29 tools');
})();