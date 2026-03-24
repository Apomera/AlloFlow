// ── Titration Lab Plugin (recovered from commit 33c3395) ──
window.StemLab.registerTool('titrationLab', {
  label: 'Titration Lab',
  icon: '\uD83E\uDDEA',
  desc: 'Virtual titration with live S-curve graphing, indicator selection, and pH calculation.',
  category: 'science',
  render: function(ctx) {
    var React = ctx.React;
    var labToolData = ctx.toolData;
    var setLabToolData = function(fn) {
      var prev = ctx.toolData;
      var next = fn(prev);
      if (next && next.titrationLab) {
        ctx.updateMulti('titrationLab', next.titrationLab);
      }
    };
    var setStemLabTool = ctx.setStemLabTool;
    var awardStemXP = ctx.awardXP;
    var setToolSnapshots = ctx.setToolSnapshots;
    var addToast = ctx.addToast;

var d = (labToolData && labToolData.titrationLab) || {};

var upd = function (k, v) {

  setLabToolData(function (p) {

    var tl = Object.assign({}, (p && p.titrationLab) || {});

    tl[k] = v;

    return Object.assign({}, p, { titrationLab: tl });

  });

};

var updMulti = function (obj) {

  setLabToolData(function (p) {

    var tl = Object.assign({}, (p && p.titrationLab) || {}, obj);

    return Object.assign({}, p, { titrationLab: tl });

  });

};



var glass = { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' };



// ── Presets ──

var presets = [

  { id: 'sa_sb', label: 'HCl + NaOH', icon: '\u2697\uFE0F', desc: 'Strong acid + Strong base', color: '#f87171',

    concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: null, Kb: null, acidName: 'HCl (0.1 M)', baseName: 'NaOH (0.1 M)' },

  { id: 'wa_sb', label: 'CH\u2083COOH + NaOH', icon: '\uD83E\uDDEA', desc: 'Weak acid + Strong base', color: '#60a5fa',

    concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: 1.8e-5, Kb: null, acidName: 'Acetic Acid (0.1 M)', baseName: 'NaOH (0.1 M)' },

  { id: 'sa_wb', label: 'HCl + NH\u2083', icon: '\uD83D\uDC9C', desc: 'Strong acid + Weak base', color: '#a855f7',

    concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: null, Kb: 1.8e-5, acidName: 'HCl (0.1 M)', baseName: 'NH\u2083 (0.1 M)' },

  { id: 'wa_wb', label: 'CH\u2083COOH + NH\u2083', icon: '\uD83D\uDC9A', desc: 'Both weak', color: '#34d399',

    concAcid: 0.1, volAcid: 25, concBase: 0.1, Ka: 1.8e-5, Kb: 1.8e-5, acidName: 'Acetic Acid (0.1 M)', baseName: 'NH\u2083 (0.1 M)' }

];



// ── Indicators ──

var indicators = [

  { id: 'phenolphthalein', label: 'Phenolphthalein', low: 8.2, high: 10.0,

    colorLow: 'rgba(255,255,255,0.15)', colorHigh: '#ec4899', colorMid: '#f9a8d4' },

  { id: 'methylOrange', label: 'Methyl Orange', low: 3.1, high: 4.4,

    colorLow: '#ef4444', colorHigh: '#eab308', colorMid: '#f97316' },

  { id: 'bromothymolBlue', label: 'Bromothymol Blue', low: 6.0, high: 7.6,

    colorLow: '#eab308', colorHigh: '#3b82f6', colorMid: '#22c55e' },

  { id: 'universal', label: 'Universal', low: 0, high: 14,

    colorLow: '#ef4444', colorHigh: '#7c3aed', colorMid: '#22c55e' }

];



// ── State with defaults ──

var presetId = d.presetId || 'sa_sb';

var preset = presets.find(function (p) { return p.id === presetId; }) || presets[0];

var indicatorId = d.indicator || 'phenolphthalein';

var indicator = indicators.find(function (ind) { return ind.id === indicatorId; }) || indicators[0];

var volumeAdded = d.volumeAdded != null ? d.volumeAdded : 0;

var maxVol = 50;

var Veq = (preset.concAcid * preset.volAcid) / preset.concBase;

var Kw = 1e-14;



// ── pH Calculation Engine ──

function calcPH(vol) {

  var Ca = preset.concAcid, Va = preset.volAcid, Cb = preset.concBase, Vb = vol;

  var Ka = preset.Ka, Kb = preset.Kb;

  var molesAcid = Ca * Va / 1000;

  var molesBase = Cb * Vb / 1000;

  var totalVolL = (Va + Vb) / 1000;

  if (Vb <= 0.001) {

    if (Ka) return Math.max(0, Math.min(14, -Math.log10(Math.sqrt(Ka * Ca))));

    return Math.max(0, Math.min(14, -Math.log10(Ca)));

  }

  var excess = molesAcid - molesBase;

  if (excess > 1e-7) {

    // Before equivalence: excess acid

    if (!Ka && !Kb) return Math.max(0, Math.min(14, -Math.log10(excess / totalVolL)));

    if (Ka) {

      if (molesBase < 1e-7) return Math.max(0, Math.min(14, -Math.log10(Math.sqrt(Ka * (excess / totalVolL)))));

      var pKa = -Math.log10(Ka);

      return Math.max(0, Math.min(14, pKa + Math.log10(molesBase / excess)));

    }

    return Math.max(0, Math.min(14, -Math.log10(excess / totalVolL)));

  }

  if (excess > -1e-7) {

    // At equivalence

    if (!Ka && !Kb) return 7;

    if (Ka && !Kb) { var CbC = molesAcid / totalVolL; return Math.max(0, Math.min(14, 14 + Math.log10(Math.sqrt((Kw / Ka) * CbC)))); }

    if (!Ka && Kb) { var CaC = molesAcid / totalVolL; return Math.max(0, Math.min(14, -Math.log10(Math.sqrt((Kw / Kb) * CaC)))); }

    return Math.max(0, Math.min(14, 7 + 0.5 * (-Math.log10(Ka) + Math.log10(Kb))));

  }

  // After equivalence: excess base

  var excessBase = -excess;

  if (!Kb) return Math.max(0, Math.min(14, 14 + Math.log10(excessBase / totalVolL)));

  var pKb = -Math.log10(Kb);

  var pOH = pKb + Math.log10(molesAcid / excessBase);

  return Math.max(0, Math.min(14, 14 - pOH));

}



// ── Indicator Color ──

function getIndicatorColor(pH) {

  if (indicatorId === 'universal') {

    var hue = pH <= 7 ? (pH * 120 / 7) : (120 + (pH - 7) * 160 / 7);

    return 'hsl(' + Math.round(hue) + ', 75%, 50%)';

  }

  if (pH <= indicator.low) return indicator.colorLow;

  if (pH >= indicator.high) return indicator.colorHigh;

  return indicator.colorMid;

}



function getFlaskColor(pH) {

  if (indicatorId === 'phenolphthalein' && pH < indicator.low) return 'rgba(200,220,255,0.25)';

  return getIndicatorColor(pH);

}



// ── Generate Titration Curve ──

var curveData = [];

for (var v = 0; v <= maxVol; v += 0.2) {

  curveData.push({ vol: Math.round(v * 100) / 100, pH: calcPH(v) });

}

var currentPH = calcPH(volumeAdded);

var currentColor = getFlaskColor(currentPH);

var pastEquivalence = volumeAdded >= Veq - 0.3;

var equivPH = calcPH(Veq);

var indicatorStatus = currentPH < indicator.low ? 'Before endpoint' :

  currentPH > indicator.high ? 'Past endpoint' : 'At endpoint';



// ── XP Awards (window-level flag prevents re-render loop) ──

if (!window._titrationXPFlags) window._titrationXPFlags = {};

if (!d._firstRun && !window._titrationXPFlags[presetId + '_first']) {

  window._titrationXPFlags[presetId + '_first'] = true;

  setTimeout(function () {

    upd('_firstRun', true);

    if (typeof awardStemXP === 'function') awardStemXP('titrationLab', 5, 'First titration');

  }, 0);

}

if (pastEquivalence && !d._reachedEquiv && !window._titrationXPFlags[presetId + '_equiv']) {

  window._titrationXPFlags[presetId + '_equiv'] = true;

  setTimeout(function () {

    upd('_reachedEquiv', true);

    if (typeof awardStemXP === 'function') awardStemXP('titrationLab', 5, 'Reached equivalence point');

  }, 0);

}



// ── SVG Chart Dimensions ──

var svgW = 700, svgH = 300;

var pad = { top: 20, right: 20, bottom: 40, left: 50 };

var chartW = svgW - pad.left - pad.right;

var chartH = svgH - pad.top - pad.bottom;

var xScale = function (v) { return pad.left + (v / maxVol) * chartW; };

var yScale = function (pH) { return pad.top + chartH - (pH / 14) * chartH; };



// Build SVG path for full curve and current progress curve

var fullPath = '', currentPath = '';

curveData.forEach(function (pt, i) {

  var x = xScale(pt.vol).toFixed(1);

  var y = yScale(pt.pH).toFixed(1);

  var cmd = i === 0 ? 'M' : 'L';

  fullPath += cmd + x + ' ' + y + ' ';

  if (pt.vol <= volumeAdded + 0.1) currentPath += cmd + x + ' ' + y + ' ';

});



// Indicator transition zone on chart

var zoneY1 = yScale(indicator.high);

var zoneY2 = yScale(indicator.low);

var zoneH = zoneY2 - zoneY1;



// Burette dimensions

var buretteH = 260, buretteW = 36;

var liquidPct = Math.max(0, (maxVol - volumeAdded) / maxVol);

var liquidH = Math.round(liquidPct * buretteH);



// ── Render ──

return React.createElement("div", { className: "space-y-4 max-w-4xl mx-auto animate-in fade-in duration-300" },



  // ── Header ──

  React.createElement("div", {

    className: "rounded-2xl p-5 border",

    style: Object.assign({}, glass, { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderColor: 'rgba(56,189,248,0.2)' })

  },

    React.createElement("div", { className: "flex items-center justify-between mb-2" },

      React.createElement("button", {

        onClick: function () { setStemLabTool(null); },

        className: "text-xs font-bold text-cyan-400 hover:text-white transition-colors"

      }, "\u2190 Back"),

      React.createElement("h3", { className: "text-lg font-black text-white" }, "\uD83E\uDDEA Virtual Titration Lab")

    ),

    React.createElement("p", { className: "text-xs text-slate-400 text-center" },

      "Flask: ", preset.acidName, " (", preset.volAcid, " mL)  \u2022  Burette: ", preset.baseName

    )

  ),



  // ── Preset Buttons ──

  React.createElement("div", { className: "flex flex-wrap gap-2 justify-center" },

    presets.map(function (p) {

      var active = p.id === presetId;

      return React.createElement("button", {

        key: p.id,

        onClick: function () {

          updMulti({ presetId: p.id, volumeAdded: 0, _reachedEquiv: false });

          if (typeof awardStemXP === 'function') awardStemXP('titrationLab', 3, 'Preset loaded');

        },

        className: "px-3 py-1.5 rounded-full text-xs font-bold transition-all " +

          (active ? "text-white shadow-lg scale-105" : "text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 border border-slate-600"),

        style: active ? { background: p.color, boxShadow: '0 0 12px ' + p.color + '60' } : {}

      }, p.icon + " " + p.label);

    })

  ),



  // ── Indicator Selector ──

  React.createElement("div", { className: "flex flex-wrap gap-2 justify-center" },

    React.createElement("span", { className: "text-[10px] text-slate-400 font-bold self-center mr-1" }, "INDICATOR:"),

    indicators.map(function (ind) {

      var active = ind.id === indicatorId;

      return React.createElement("button", {

        key: ind.id,

        onClick: function () { upd('indicator', ind.id); },

        className: "px-2.5 py-1 rounded-full text-[10px] font-bold transition-all " +

          (active ? "text-white bg-slate-700 ring-2 ring-cyan-400" : "text-slate-400 bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700")

      }, ind.label);

    })

  ),



  // ── Volume Controls ──

  React.createElement("div", {

    className: "rounded-xl p-3 border",

    style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.7)', borderColor: 'rgba(100,116,139,0.3)' })

  },

    React.createElement("div", { className: "flex items-center gap-3 flex-wrap" },

      React.createElement("span", { className: "text-[10px] text-slate-400 font-bold" }, "TITRANT VOLUME:"),

      React.createElement("input", {

        type: "range", min: 0, max: maxVol, step: 0.1, value: volumeAdded,

        onChange: function (e) { upd('volumeAdded', parseFloat(e.target.value)); },

        className: "flex-1 min-w-[120px] accent-cyan-400",

        style: { height: '6px' }

      }),

      React.createElement("span", {

        className: "text-sm font-black tabular-nums min-w-[70px] text-right",

        style: { color: pastEquivalence ? '#f87171' : '#38bdf8' }

      }, volumeAdded.toFixed(1) + " mL"),

      // Drip buttons

      [0.1, 0.5, 1, 5].map(function (amt) {

        return React.createElement("button", {

          key: amt,

          onClick: function () { upd('volumeAdded', Math.min(maxVol, Math.round((volumeAdded + amt) * 10) / 10)); },

          className: "px-2 py-1 rounded-lg text-[10px] font-bold text-cyan-300 bg-cyan-900/30 hover:bg-cyan-800/50 border border-cyan-800/40 transition-all"

        }, "+" + amt);

      }),

      React.createElement("button", {

        onClick: function () { updMulti({ volumeAdded: 0, _reachedEquiv: false }); },

        className: "px-2 py-1 rounded-lg text-[10px] font-bold text-amber-300 bg-amber-900/30 hover:bg-amber-800/50 border border-amber-800/40 transition-all"

      }, "\u21BA Reset")

    )

  ),



  // ── Main Layout: Burette/Flask + SVG Chart ──

  React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-4" },



    // ── Left: Burette & Flask Visual ──

    React.createElement("div", {

      className: "rounded-2xl p-4 border flex flex-col items-center",

      style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(100,116,139,0.3)' })

    },

      React.createElement("div", { className: "text-[10px] font-bold text-slate-400 mb-2" }, "BURETTE & FLASK"),



      // Burette container

      React.createElement("div", { style: { position: 'relative', width: buretteW + 40 + 'px', height: buretteH + 120 + 'px' } },



        // Scale markings

        [0, 10, 20, 30, 40, 50].map(function (ml) {

          var yPos = (ml / maxVol) * buretteH;

          return React.createElement("div", { key: ml, style: { position: 'absolute', left: '0px', top: yPos + 'px', display: 'flex', alignItems: 'center', gap: '2px' } },

            React.createElement("span", { style: { fontSize: '8px', color: '#94a3b8', width: '16px', textAlign: 'right', fontFamily: 'monospace' } }, ml),

            React.createElement("div", { style: { width: '4px', height: '1px', background: '#475569' } })

          );

        }),



        // Burette tube

        React.createElement("div", {

          style: { position: 'absolute', left: '20px', top: '0px', width: buretteW + 'px', height: buretteH + 'px',

            border: '2px solid rgba(148,163,184,0.4)', borderRadius: '4px 4px 2px 2px',

            background: 'rgba(15,23,42,0.5)', overflow: 'hidden' }

        },

          // Liquid fill (from top down)

          React.createElement("div", {

            style: { position: 'absolute', top: '0px', left: '0px', right: '0px', height: liquidH + 'px',

              background: 'linear-gradient(180deg, rgba(56,189,248,0.6) 0%, rgba(56,189,248,0.3) 100%)',

              borderBottom: '2px solid rgba(56,189,248,0.5)', transition: 'height 0.3s ease' }

          }),

          // Meniscus line

          React.createElement("div", {

            style: { position: 'absolute', top: liquidH + 'px', left: '2px', right: '2px', height: '3px',

              background: 'rgba(56,189,248,0.8)', borderRadius: '0 0 50% 50%', transition: 'top 0.3s ease' }

          })

        ),



        // Stopcock

        React.createElement("div", {

          style: { position: 'absolute', left: (20 + buretteW / 2 - 3) + 'px', top: buretteH + 'px',

            width: '6px', height: '15px', background: 'rgba(148,163,184,0.5)', borderRadius: '0 0 2px 2px' }

        }),



        // Drop (visible when volume > 0)

        volumeAdded > 0 && React.createElement("div", {

          style: { position: 'absolute', left: (20 + buretteW / 2 - 3) + 'px', top: buretteH + 18 + 'px',

            width: '6px', height: '8px', background: 'rgba(56,189,248,0.7)', borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%' }

        }),



        // Flask (Erlenmeyer shape via SVG)

        React.createElement("svg", {

          width: buretteW + 40, height: 85,

          style: { position: 'absolute', left: '0px', top: buretteH + 30 + 'px' }

        },

          // Flask outline

          React.createElement("path", {

            d: 'M' + (buretteW / 2 + 10) + ' 0 L' + (buretteW / 2 + 14) + ' 0 L' + (buretteW / 2 + 14) + ' 20 L' + (buretteW + 35) + ' 72 L' + (buretteW + 35) + ' 78 Q' + (buretteW + 35) + ' 82 ' + (buretteW + 31) + ' 82 L5 82 Q1 82 1 78 L1 72 L' + (buretteW / 2 + 10) + ' 20 Z',

            fill: 'none', stroke: 'rgba(148,163,184,0.4)', strokeWidth: '1.5'

          }),

          // Flask liquid fill

          React.createElement("path", {

            d: 'M' + (buretteW / 2 + 14) + ' 25 L' + (buretteW + 32) + ' 72 L' + (buretteW + 32) + ' 78 Q' + (buretteW + 32) + ' 80 ' + (buretteW + 28) + ' 80 L8 80 Q4 80 4 78 L4 72 L' + (buretteW / 2 + 10) + ' 25 Z',

            fill: currentColor, opacity: 0.7, style: { transition: 'fill 0.5s ease' }

          })

        )

      ),



      // pH display below flask

      React.createElement("div", {

        className: "mt-2 text-center rounded-lg px-4 py-2 border",

        style: { background: 'rgba(15,23,42,0.6)', borderColor: currentColor, borderWidth: '2px', transition: 'border-color 0.5s ease' }

      },

        React.createElement("span", { className: "text-[10px] text-slate-400 font-bold block" }, "CURRENT pH"),

        React.createElement("span", {

          className: "text-2xl font-black tabular-nums",

          style: { color: currentColor, transition: 'color 0.5s ease' }

        }, currentPH.toFixed(2))

      )

    ),



    // ── Right: SVG Titration Curve (2 cols wide) ──

    React.createElement("div", {

      className: "lg:col-span-2 rounded-2xl p-4 border",

      style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(100,116,139,0.3)' })

    },

      React.createElement("div", { className: "text-[10px] font-bold text-slate-400 mb-2" }, "TITRATION CURVE"),

      React.createElement("svg", {

        viewBox: '0 0 ' + svgW + ' ' + svgH, className: "w-full", preserveAspectRatio: "xMidYMid meet",

        style: { maxHeight: '340px' }

      },

        // Background

        React.createElement("rect", { x: pad.left, y: pad.top, width: chartW, height: chartH, fill: 'rgba(15,23,42,0.4)', rx: 4 }),



        // Indicator transition zone

        indicatorId !== 'universal' && React.createElement("rect", {

          x: pad.left, y: zoneY1, width: chartW, height: Math.max(0, zoneH),

          fill: indicator.colorMid, opacity: 0.12, rx: 2

        }),

        indicatorId !== 'universal' && React.createElement("text", {

          x: pad.left + 4, y: zoneY1 + 12, fill: indicator.colorMid, fontSize: '9', fontWeight: 'bold', opacity: 0.6

        }, indicator.label + ' zone'),



        // Grid lines (pH)

        [0, 2, 4, 6, 7, 8, 10, 12, 14].map(function (pH) {

          return React.createElement("line", {

            key: 'g' + pH, x1: pad.left, y1: yScale(pH), x2: pad.left + chartW, y2: yScale(pH),

            stroke: pH === 7 ? 'rgba(74,222,128,0.3)' : 'rgba(100,116,139,0.15)', strokeWidth: pH === 7 ? 1.5 : 0.5,

            strokeDasharray: pH === 7 ? '' : '3,3'

          });

        }),

        // pH 7 label

        React.createElement("text", { x: pad.left + chartW + 4, y: yScale(7) + 3, fill: '#4ade80', fontSize: '9', fontWeight: 'bold' }, 'pH 7'),



        // Y-axis labels

        [0, 2, 4, 6, 8, 10, 12, 14].map(function (pH) {

          return React.createElement("text", {

            key: 'y' + pH, x: pad.left - 6, y: yScale(pH) + 3,

            fill: '#94a3b8', fontSize: '9', textAnchor: 'end', fontFamily: 'monospace'

          }, pH);

        }),



        // X-axis labels

        [0, 10, 20, 25, 30, 40, 50].map(function (ml) {

          return React.createElement("text", {

            key: 'x' + ml, x: xScale(ml), y: pad.top + chartH + 16,

            fill: ml === Math.round(Veq) ? '#f87171' : '#94a3b8', fontSize: '9', textAnchor: 'middle',

            fontWeight: ml === Math.round(Veq) ? 'bold' : 'normal', fontFamily: 'monospace'

          }, ml + (ml === Math.round(Veq) ? ' (V\u2091)' : ''));

        }),



        // Axis labels

        React.createElement("text", { x: pad.left + chartW / 2, y: svgH - 4, fill: '#94a3b8', fontSize: '10', textAnchor: 'middle', fontWeight: 'bold' }, 'Volume of Titrant (mL)'),

        React.createElement("text", {

          x: 12, y: pad.top + chartH / 2, fill: '#94a3b8', fontSize: '10', textAnchor: 'middle', fontWeight: 'bold',

          transform: 'rotate(-90, 12, ' + (pad.top + chartH / 2) + ')'

        }, 'pH'),



        // Equivalence point vertical line

        React.createElement("line", {

          x1: xScale(Veq), y1: pad.top, x2: xScale(Veq), y2: pad.top + chartH,

          stroke: '#f87171', strokeWidth: 1.5, strokeDasharray: '5,3', opacity: 0.7

        }),



        // Full curve (faded preview)

        React.createElement("path", {

          d: fullPath, fill: 'none', stroke: 'rgba(56,189,248,0.15)', strokeWidth: 2

        }),



        // Active curve (bright, up to current volume)

        currentPath && React.createElement("path", {

          d: currentPath, fill: 'none', stroke: '#38bdf8', strokeWidth: 2.5,

          strokeLinecap: 'round', strokeLinejoin: 'round',

          style: { filter: 'drop-shadow(0 0 4px rgba(56,189,248,0.5))' }

        }),



        // Current position dot

        volumeAdded > 0 && React.createElement("circle", {

          cx: xScale(volumeAdded), cy: yScale(currentPH), r: 5,

          fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2,

          style: { filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.7))' }

        }),



        // Equivalence point marker

        React.createElement("circle", {

          cx: xScale(Veq), cy: yScale(equivPH), r: 4,

          fill: 'none', stroke: '#f87171', strokeWidth: 1.5, strokeDasharray: '2,2'

        })

      )

    )

  ),



  // ── Stats Panel ──

  React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3" },

    // Current pH

    React.createElement("div", {

      className: "rounded-xl p-3 border text-center",

      style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.7)', borderColor: 'rgba(56,189,248,0.2)' })

    },

      React.createElement("div", { className: "text-[9px] font-bold text-slate-400 mb-1" }, "CURRENT pH"),

      React.createElement("div", { className: "text-xl font-black tabular-nums", style: { color: currentColor } }, currentPH.toFixed(2)),

      React.createElement("div", {

        className: "mt-1 h-1.5 rounded-full",

        style: { background: 'linear-gradient(90deg, #ef4444, #eab308, #22c55e, #3b82f6, #7c3aed)', position: 'relative' }

      },

        React.createElement("div", {

          style: { position: 'absolute', left: (currentPH / 14 * 100) + '%', top: '-2px',

            width: '6px', height: '10px', background: 'white', borderRadius: '3px',

            transform: 'translateX(-3px)', boxShadow: '0 0 4px rgba(0,0,0,0.5)', transition: 'left 0.3s ease' }

        })

      )

    ),

    // Volume Added

    React.createElement("div", {

      className: "rounded-xl p-3 border text-center",

      style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.7)', borderColor: 'rgba(100,116,139,0.2)' })

    },

      React.createElement("div", { className: "text-[9px] font-bold text-slate-400 mb-1" }, "VOLUME ADDED"),

      React.createElement("div", { className: "text-xl font-black tabular-nums text-cyan-400" }, volumeAdded.toFixed(1) + " mL"),

      React.createElement("div", { className: "text-[10px] text-slate-500 mt-1" }, "V\u2091 = " + Veq.toFixed(1) + " mL")

    ),

    // Equivalence Point

    React.createElement("div", {

      className: "rounded-xl p-3 border text-center",

      style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.7)', borderColor: pastEquivalence ? 'rgba(248,113,113,0.3)' : 'rgba(100,116,139,0.2)' })

    },

      React.createElement("div", { className: "text-[9px] font-bold text-slate-400 mb-1" }, "EQUIVALENCE POINT"),

      React.createElement("div", { className: "text-lg font-black tabular-nums " + (pastEquivalence ? 'text-red-400' : 'text-slate-300') },

        "pH " + equivPH.toFixed(2)

      ),

      React.createElement("div", { className: "text-[10px] mt-1 " + (pastEquivalence ? 'text-red-400' : 'text-slate-500') },

        pastEquivalence ? '\u2714 Reached!' : 'Not yet reached'

      )

    ),

    // Indicator Status

    React.createElement("div", {

      className: "rounded-xl p-3 border text-center",

      style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.7)', borderColor: 'rgba(100,116,139,0.2)' })

    },

      React.createElement("div", { className: "text-[9px] font-bold text-slate-400 mb-1" }, "INDICATOR"),

      React.createElement("div", {

        className: "w-6 h-6 rounded-full mx-auto mb-1 border border-white/20",

        style: { background: currentColor, boxShadow: '0 0 8px ' + currentColor, transition: 'background 0.5s ease, box-shadow 0.5s ease' }

      }),

      React.createElement("div", { className: "text-[10px] font-bold text-slate-300" }, indicator.label),

      React.createElement("div", { className: "text-[9px] text-slate-500" }, indicatorStatus)

    )

  ),



  // ── Educational Panel ──

  React.createElement("details", {

    className: "rounded-xl border overflow-hidden",

    style: Object.assign({}, glass, { background: 'rgba(15,23,42,0.7)', borderColor: 'rgba(100,116,139,0.2)' })

  },

    React.createElement("summary", {

      className: "px-4 py-3 cursor-pointer text-sm font-bold text-slate-300 hover:text-white transition-colors"

    }, "\uD83D\uDCD6 Titration Science"),

    React.createElement("div", { className: "px-4 pb-4 space-y-3" },

      React.createElement("div", {

        className: "rounded-lg p-3 border border-cyan-800/30 bg-cyan-950/30"

      },

        React.createElement("h5", { className: "text-xs font-bold text-cyan-400 mb-1" }, "What is Titration?"),

        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed" },

          "Titration is a technique to determine the concentration of an unknown solution by reacting it with a solution of known concentration (the titrant). " +

          "The titrant is added from a burette until the reaction reaches the equivalence point \u2014 where the moles of acid equal the moles of base."

        )

      ),

      React.createElement("div", {

        className: "rounded-lg p-3 border border-amber-800/30 bg-amber-950/30"

      },

        React.createElement("h5", { className: "text-xs font-bold text-amber-400 mb-1" }, "Henderson\u2013Hasselbalch Equation"),

        React.createElement("p", { className: "text-sm font-mono text-amber-200 text-center my-2" },

          "pH = pK\u2090 + log([A\u207B] / [HA])"

        ),

        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed" },

          "This equation relates pH to the ratio of conjugate base [A\u207B] to weak acid [HA] concentrations. " +

          "At the half-equivalence point, [A\u207B] = [HA], so pH = pK\u2090."

        )

      ),

      React.createElement("div", {

        className: "rounded-lg p-3 border border-emerald-800/30 bg-emerald-950/30"

      },

        React.createElement("h5", { className: "text-xs font-bold text-emerald-400 mb-2" }, "Key Concepts"),

        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed mb-1" },

          React.createElement("span", { className: "font-bold text-cyan-400" }, "Equivalence Point"), " \u2014 Where moles of acid = moles of base. The pH at this point depends on the acid/base strength."

        ),

        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed mb-1" },

          React.createElement("span", { className: "font-bold text-pink-400" }, "Endpoint"), " \u2014 Where the indicator changes color. Ideally chosen so the endpoint \u2248 equivalence point."

        ),

        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed mb-1" },

          React.createElement("span", { className: "font-bold text-amber-400" }, "Buffer Region"), " \u2014 The flat part of a weak acid/base curve where pH resists change (Henderson\u2013Hasselbalch applies)."

        ),

        React.createElement("p", { className: "text-[11px] text-slate-300 leading-relaxed" },

          React.createElement("span", { className: "font-bold text-emerald-400" }, "Indicators"), " \u2014 Weak acids/bases that change color at specific pH ranges. Choose one whose transition range includes the equivalence pH."

        )

      )

    )

  ),



  // ── Snapshot Button ──

  React.createElement("div", { className: "flex justify-end" },

    React.createElement("button", {

      onClick: function () {

        if (typeof setToolSnapshots === 'function') {

          setToolSnapshots(function (prev) {

            return prev.concat([{

              id: 'titr-' + Date.now(), tool: 'titrationLab', label: 'Titration Lab',

              data: { presetId: presetId, indicator: indicatorId, volumeAdded: volumeAdded, pH: currentPH },

              timestamp: Date.now()

            }]);

          });

          if (addToast) addToast('\uD83D\uDCF8 Snapshot saved!', 'success');

        }

      },

      className: "px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full hover:from-cyan-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all"

    }, "\uD83D\uDCF8 Snapshot")

  )

);
  }
});
