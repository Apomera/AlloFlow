// ═══════════════════════════════════════════════════════
// stem_tool_semiconductor.js — Semiconductor Lab Plugin v3.0
// Interactive semiconductor physics: band gaps, doping,
// P-N junctions, transistors (MOSFET/BJT), logic gates,
// I-V curves, circuit sandbox, wafer fab, LED spectrum,
// solar cells, Moore's Law, quantum wells, memory cells,
// signal amplifiers, and Chip Defense battle mode
// Usage: Add <script src="stem_tool_semiconductor.js"></script> after stem_lab_module.js
// ═══════════════════════════════════════════════════════

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

  // ── Audio + WCAG (auto-injected) ──
  var _semiAC = null;
  function getSemiAC() { if (!_semiAC) { try { _semiAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_semiAC && _semiAC.state==="suspended") { try { _semiAC.resume(); } catch(e) {} } return _semiAC; }
  function semiTone(f,d,tp,v) { var ac=getSemiAC(); if(!ac) return; try { var o=ac.createOscillator(); var g=ac.createGain(); o.type=tp||"sine"; o.frequency.value=f; g.gain.setValueAtTime(v||0.07,ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxSemiClick() { semiTone(600,0.03,"sine",0.04); }
  function sfxSemiSuccess() { semiTone(523,0.08,"sine",0.07); setTimeout(function(){semiTone(659,0.08,"sine",0.07);},70); setTimeout(function(){semiTone(784,0.1,"sine",0.08);},140); }
  if(!document.getElementById("semi-a11y")){var _s=document.createElement("style");_s.id="semi-a11y";_s.textContent="@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important}}.text-slate-400{color:#64748b!important}";document.head.appendChild(_s);}

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-semiconductor')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-semiconductor';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  window.StemLab.registerTool('semiconductor', {
    icon: '\u{1F4A1}',
    label: 'Semiconductor Lab',
    desc: 'Explore band gaps, doping, junctions, transistors, gates, I-V curves, wafer fab, LEDs, solar cells, quantum wells, memory & amplifiers.',
    color: 'cyan',
    category: 'science',
    ready: true,

    render: function(ctx) {
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
      var canvasNarrate = ctx.canvasNarrate;
      var props = ctx.props;

      // ═══ STATE INIT GUARD ═══
      var d = (labToolData && labToolData.semiconductor) || {};
      var _semiInitialized = !!(labToolData && labToolData.semiconductor);
      if (!_semiInitialized) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { semiconductor: {
            // sub-tool selection
            subtool: 'bandgap',
            // Band Gap
            material: 'silicon',
            temperature: 300,
            showPhoton: false,
            showFermi: false,
            // Doping
            dopant: 'none',
            dopantCount: 3,
            crystalSize: 8,
            dopingTemp: 300,
            showResistivity: false,
            // P-N Junction
            pnBias: 0,
            pnShowField: true,
            pnShowCarriers: true,
            pnShowDepletion: true,
            pnAnimating: true,
            pnShowIV: false,
            pnLedMode: false,
            // Transistor
            transistorType: 'mosfet-n',
            gateVoltage: 0,
            drainVoltage: 5,
            showCurrentFlow: true,
            showCMOS: false,
            // Logic Gates
            gateType: 'NOT',
            inputA: false,
            inputB: false,
            gateChain: [],
            showTruthGrid: false,
            // I-V Curve
            ivDevice: 'diode',
            ivSweepV: 0,
            ivTracePoints: [],
            ivShowIdeal: true,
            ivTemp: 300,
            // Circuit Sandbox
            circuitComponents: [],
            circuitWires: [],
            circuitSelectedComp: null,
            circuitVoltage: 5,
            circuitSimResult: null,
            // Wafer Fab
            fabStage: 0,
            fabRunning: false,
            fabTemp: 1000,
            fabTime: 30,
            fabDopant: 'phosphorus',
            fabHistory: [],
            fabGuided: true,
            // LED Spectrum
            ledMaterial: 'red-gan',
            ledCurrent: 20,
            ledShowSpectrum: true,
            ledMixR: 100, ledMixG: 0, ledMixB: 0,
            ledMixMode: false,
            // Solar Cell
            solarIrradiance: 1000,
            solarTemp: 300,
            solarArea: 100,
            solarMaterial: 'silicon',
            solarShowPV: true,
            solarLoadR: 100,
            // Moore's Law
            mooreYear: 2024,
            mooreShowPred: true,
            mooreLogScale: true,
            mooreHighlight: null,
            // Quantum Wells
            qwWidth: 5,
            qwDepth: 0.3,
            qwMaterial: 'gaas-algaas',
            qwLevels: 3,
            qwShowWave: true,
            qwShowProb: false,
            qwElectricField: 0,
            // Semiconductor Memory
            memType: 'sram',
            memBitValue: 0,
            memWriteEnable: false,
            memShowArray: false,
            memRefreshing: false,
            memCellCount: 4,
            memShowTiming: false,
            // Signal Amplifier
            ampType: 'common-source',
            ampVin: 0.01,
            ampFreq: 1000,
            ampVdd: 5,
            ampRd: 10000,
            ampShowBode: false,
            ampShowDC: true,
            ampBiasPoint: 2.5,
            // Battle Mode — Chip Defense
            battleActive: false,
            battleRound: 0,
            battleScore: 0,
            battleHP: 5,
            battleEnemyHP: 5,
            battleLog: [],
            battleConstraint: null,
            battleFeedback: null,
            battleDifficulty: 'cadet',
            // Challenge (10-tier)
            challengeActive: false,
            challengeTier: 0,
            challengeScore: 0,
            challengeStreak: 0,
            challengeFeedback: null,
            challengeAnswer: null,
            challengeIdx: 0,
            challengeMisses: 0,
            challengeShowHint: false,
            // Learn
            showLearn: false,
            learnTopic: null,
            // AI
            aiExplain: null,
            aiLoading: false,
            // XP tracking
            xpAwardedKeys: {}
          }});
        });
        // Don't early-return — hooks below must always execute (Rules of Hooks).
        // Render a loading placeholder at the end instead.
      }

      var upd = function(key, val) { setLabToolData(function(prev) { return Object.assign({}, prev, { semiconductor: Object.assign({}, prev.semiconductor, (typeof key === 'object' ? key : (function() { var o = {}; o[key] = val; return o; })()))}); }); };
      var updMulti = function(obj) { upd(obj); };

      // Canvas Narration: Semiconductor Lab init
      if (typeof canvasNarrate === 'function') canvasNarrate('semiconductor', 'init', {
        first: 'Semiconductor Lab loaded. Explore band gaps, doping, P-N junctions, transistors, logic gates, I-V curves, wafer fabrication, LEDs, solar cells, and more. Use the sub-tool navigation to switch topics.',
        repeat: 'Semiconductor Lab ready.',
        terse: 'Semiconductor Lab ready.'
      });

      // ═══ GRADE BAND HELPER ═══
      var GRADE_BANDS = ['K-2', '3-5', '6-8', '9-12'];
      function getGradeBand() {
        var gl = (gradeLevel || '5th Grade').toLowerCase();
        if (/k|1st|2nd|pre/.test(gl)) return 'K-2';
        if (/3rd|4th|5th/.test(gl)) return '3-5';
        if (/6th|7th|8th/.test(gl)) return '6-8';
        if (/9th|10|11|12|high/.test(gl)) return '9-12';
        return '3-5';
      }
      var gradeBand = getGradeBand();

      // Grade-band text helper
      function gradeText(k2, g35, g68, g912) {
        if (gradeBand === 'K-2') return k2;
        if (gradeBand === '3-5') return g35;
        if (gradeBand === '6-8') return g68;
        return g912;
      }

      // ═══ MATERIAL DATA ═══
      var MATERIALS = {
        silicon:    { name: 'Silicon (Si)',     bandGap: 1.12, color: '#4F46E5', lattice: 'Diamond Cubic', electrons: 4, tempCoeff: -0.000473, ni: 1.5e10, mobility: 1400 },
        germanium:  { name: 'Germanium (Ge)',   bandGap: 0.67, color: '#7C3AED', lattice: 'Diamond Cubic', electrons: 4, tempCoeff: -0.000377, ni: 2.4e13, mobility: 3900 },
        gaas:       { name: 'GaAs',             bandGap: 1.42, color: '#DC2626', lattice: 'Zinc Blende',   electrons: 4, tempCoeff: -0.000540, ni: 1.8e6,  mobility: 8500 },
        diamond:    { name: 'Diamond (C)',       bandGap: 5.47, color: '#F59E0B', lattice: 'Diamond Cubic', electrons: 4, tempCoeff: -0.000050, ni: 1e-27,  mobility: 2200 },
        sic:        { name: 'SiC',              bandGap: 3.26, color: '#10B981', lattice: 'Zinc Blende',   electrons: 4, tempCoeff: -0.000330, ni: 6.9e-11,mobility: 900 },
        gan:        { name: 'GaN',              bandGap: 3.40, color: '#06B6D4', lattice: 'Wurtzite',      electrons: 4, tempCoeff: -0.000420, ni: 1.9e-10,mobility: 1000 },
        copper:     { name: 'Copper (Cu)',       bandGap: 0,    color: '#D97706', lattice: 'FCC',           electrons: 1, tempCoeff: 0,         ni: 8.5e22, mobility: 32 },
        insulator:  { name: 'Glass (SiO\u2082)', bandGap: 9.0,  color: '#94A3B8', lattice: 'Amorphous',    electrons: 0, tempCoeff: 0,         ni: 0,      mobility: 0 }
      };

      var DOPANTS = {
        none:      { name: 'Intrinsic',    type: null,   valence: 4, color: '#6B7280', symbol: '-' },
        phosphorus:{ name: 'Phosphorus (P)', type: 'n',   valence: 5, color: '#EF4444', symbol: 'P' },
        arsenic:   { name: 'Arsenic (As)',  type: 'n',    valence: 5, color: '#F97316', symbol: 'As' },
        boron:     { name: 'Boron (B)',     type: 'p',    valence: 3, color: '#3B82F6', symbol: 'B' },
        gallium:   { name: 'Gallium (Ga)', type: 'p',     valence: 3, color: '#8B5CF6', symbol: 'Ga' },
        antimony:  { name: 'Antimony (Sb)', type: 'n',    valence: 5, color: '#F43F5E', symbol: 'Sb' },
        indium:    { name: 'Indium (In)',   type: 'p',    valence: 3, color: '#14B8A6', symbol: 'In' }
      };

      // ═══ SUB-TOOL NAV ═══
      var SUBTOOLS = [
        { id: 'bandgap',    icon: '\u26A1', label: 'Band Gap',     short: 'Bands' },
        { id: 'doping',     icon: '\uD83E\uDDEA', label: 'Doping',       short: 'Dope' },
        { id: 'pnjunction', icon: '\u2194\uFE0F', label: 'P-N Junction', short: 'P-N' },
        { id: 'transistor', icon: '\uD83D\uDD0C', label: 'Transistor',   short: 'FET' },
        { id: 'gates',      icon: '\uD83D\uDDA5\uFE0F', label: 'Logic Gates',  short: 'Gates' },
        { id: 'ivcurve',    icon: '\uD83D\uDCC8', label: 'I-V Curves',   short: 'I-V' },
        { id: 'sandbox',    icon: '\uD83D\uDD27', label: 'Circuit Lab',  short: 'Circuit' },
        { id: 'waferfab',   icon: '\uD83C\uDFED', label: 'Wafer Fab',    short: 'Fab' },
        { id: 'ledspec',    icon: '\uD83C\uDF08', label: 'LED Spectrum',  short: 'LED' },
        { id: 'solarcell',  icon: '\u2600\uFE0F', label: 'Solar Cell',   short: 'Solar' },
        { id: 'moorelaw',   icon: '\uD83D\uDCC9', label: 'Moore\'s Law', short: 'Moore' },
        { id: 'qwell',     icon: '\uD83C\uDF0A', label: 'Quantum Wells', short: 'QWell' },
        { id: 'memory',    icon: '\uD83D\uDCBE', label: 'Memory Cells',  short: 'Memory' },
        { id: 'amplifier', icon: '\uD83D\uDD09', label: 'Amplifier',     short: 'Amp' }
      ];

      // ═══ SHARED HELPERS ═══
      function btn(label, onClick, extraClass) {
        return h('button', Object.assign({
          onClick: onClick,
          className: 'px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-sm hover:shadow-md ' + (extraClass || 'bg-cyan-700 text-white hover:bg-cyan-700')
        }, a11yClick ? a11yClick(onClick) : {}), label);
      }

      function pill(label, active, onClick) {
        return h('button', Object.assign({
          onClick: onClick,
          className: 'px-2.5 py-1 text-xs font-semibold rounded-full transition-all ' +
            (active ? 'bg-cyan-700 text-white shadow-md' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')
        }, a11yClick ? a11yClick(onClick) : {}), label);
      }

      function sliderRow(label, value, min, max, step, onChange, unit) {
        return h('div', { className: 'flex items-center gap-2 mt-1' },
          h('span', { className: 'text-xs text-slate-600 w-20 shrink-0' }, label),
          h('input', {
            type: 'range', 'aria-label': 'value', min: min, max: max, step: step, value: value,
            onChange: function(e) { onChange(parseFloat(e.target.value)); },
            className: 'flex-1 accent-cyan-500 h-1.5',
            'aria-label': label
          }),
          h('span', { className: 'text-xs font-mono text-cyan-300 w-16 text-right' }, value + (unit || ''))
        );
      }

      function infoBox(text, color) {
        return h('div', { className: 'mt-2 p-2 rounded-lg border text-xs leading-relaxed ' +
          (color === 'green' ? 'bg-emerald-900/30 border-emerald-700 text-emerald-200' :
           color === 'amber' ? 'bg-amber-900/30 border-amber-700 text-amber-200' :
           color === 'red' ? 'bg-red-900/30 border-red-700 text-red-200' :
           'bg-slate-800/60 border-slate-700 text-slate-300') }, text);
      }

      function statBadge(label, value, color) {
        return h('div', { className: 'flex flex-col items-center px-2 py-1 rounded-lg bg-slate-800/60 border border-slate-700' },
          h('span', { className: 'text-[11px] text-slate-600 uppercase tracking-wider' }, label),
          h('span', { className: 'text-sm font-bold ' + (color || 'text-cyan-400') }, value)
        );
      }

      // ═══ AI EXPLAIN (grade-aware) ═══
      function askAI(topic) {
        if (d.aiLoading) return;
        updMulti({ aiLoading: true, aiExplain: null });
        var gradeCtx = gradeBand === 'K-2' ? 'kindergarten, very simple with fun analogies'
          : gradeBand === '3-5' ? '3rd-5th grade, simple but accurate'
          : gradeBand === '6-8' ? '6th-8th grade, include basic equations'
          : '9th-12th grade AP Physics, include equations and Fermi level concepts';
        var prompt = 'Explain "' + topic + '" for a ' + gradeCtx + ' student in 3-4 sentences. Focus on semiconductor physics. Be concise.';
        callGemini(prompt).then(function(resp) {
          updMulti({ aiExplain: resp, aiLoading: false });
          if (announceToSR) announceToSR('AI explanation loaded for ' + topic);
        }).catch(function() {
          updMulti({ aiExplain: 'Could not load AI explanation.', aiLoading: false });
        });
      }

      // ═══ TTS HELPER ═══
      function speakText(text) {
        if (callTTS) {
          try { callTTS(text); } catch(e) { /* TTS unavailable */ }
        }
      }

      // ═══ XP HELPER ═══
      function tryAwardXP(key, amount, reason) {
        if (d.xpAwardedKeys && d.xpAwardedKeys[key]) return;
        awardStemXP('semi-' + key, amount, reason);
        var newKeys = Object.assign({}, d.xpAwardedKeys || {});
        newKeys[key] = true;
        upd('xpAwardedKeys', newKeys);
        if (stemCelebrate) stemCelebrate();
        if (announceToSR) announceToSR('Earned ' + amount + ' XP: ' + reason);
      }

      // ═══ AI RESPONSE BOX (shared) ═══
      function aiBox() {
        if (!d.aiExplain && !d.aiLoading) return null;
        return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-2 p-2 rounded-lg bg-indigo-900/40 border border-indigo-700 text-xs text-indigo-200' },
          d.aiLoading ? h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'animate-pulse' }, '\u2728 Thinking\u2026') : [
            d.aiExplain,
            callTTS ? h('button', {
              onClick: function() { speakText(d.aiExplain); },
              className: 'ml-2 px-1.5 py-0.5 text-[11px] bg-indigo-700 rounded hover:bg-indigo-600 transition-colors',
              'aria-label': 'Read aloud'
            }, '\uD83D\uDD0A') : null
          ]
        );
      }

      // ════════════════════════════════════════════
      // BAND GAP VISUALIZER (enhanced)
      // ════════════════════════════════════════════
      function renderBandGap() {
        var mat = MATERIALS[d.material] || MATERIALS.silicon;
        var tempK = d.temperature || 300;
        var Eg = Math.max(0, mat.bandGap + mat.tempCoeff * (tempK - 300));
        var isConductor = mat.bandGap === 0;
        var isInsulator = mat.bandGap > 4;

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var cx = canvasEl.getContext('2d');
          var W = canvasEl.width, H = canvasEl.height;
          cx.clearRect(0, 0, W, H);

          var midY = H / 2;
          var gapPx = Math.min(H * 0.40, Math.max(10, Eg * 28));
          var valenceTop = midY + gapPx / 2;
          var conductionBot = midY - gapPx / 2;

          // Background gradient
          var bgGrad = cx.createLinearGradient(0, 0, 0, H);
          bgGrad.addColorStop(0, '#0F172A');
          bgGrad.addColorStop(1, '#1E293B');
          cx.fillStyle = bgGrad;
          cx.fillRect(0, 0, W, H);

          // Valence band (filled)
          var vGrad = cx.createLinearGradient(0, valenceTop, 0, H);
          vGrad.addColorStop(0, mat.color);
          vGrad.addColorStop(1, '#1E293B');
          cx.fillStyle = vGrad;
          cx.fillRect(30, valenceTop, W - 60, H - valenceTop - 15);
          cx.fillStyle = '#E2E8F0';
          cx.font = 'bold 11px sans-serif';
          cx.textAlign = 'center';
          cx.fillText('Valence Band (E\u1D65)', W / 2, valenceTop + 22);

          // Conduction band
          var cGrad = cx.createLinearGradient(0, 15, 0, conductionBot);
          cGrad.addColorStop(0, '#1E293B');
          cGrad.addColorStop(1, isConductor ? mat.color : '#334155');
          cx.fillStyle = cGrad;
          cx.fillRect(30, 15, W - 60, conductionBot - 15);
          cx.fillStyle = '#E2E8F0';
          cx.fillText('Conduction Band (E\u1D9C)', W / 2, conductionBot - 12);

          // Band gap region
          if (!isConductor) {
            cx.fillStyle = 'rgba(0,0,0,0.35)';
            cx.fillRect(30, conductionBot, W - 60, gapPx);

            // Gap label with glow
            cx.shadowColor = '#FCD34D';
            cx.shadowBlur = 8;
            cx.fillStyle = '#FCD34D';
            cx.font = 'bold 14px sans-serif';
            cx.fillText('E\u2097 = ' + Eg.toFixed(2) + ' eV', W / 2, midY + 5);
            cx.shadowBlur = 0;

            // Arrow
            cx.strokeStyle = '#FCD34D';
            cx.lineWidth = 2;
            cx.setLineDash([4, 3]);
            cx.beginPath();
            cx.moveTo(W / 2 - 45, conductionBot + 2);
            cx.lineTo(W / 2 - 45, valenceTop - 2);
            cx.stroke();
            cx.setLineDash([]);
            // Arrowheads
            cx.beginPath();
            cx.moveTo(W / 2 - 49, conductionBot + 8); cx.lineTo(W / 2 - 45, conductionBot + 2); cx.lineTo(W / 2 - 41, conductionBot + 8);
            cx.stroke();
            cx.beginPath();
            cx.moveTo(W / 2 - 49, valenceTop - 8); cx.lineTo(W / 2 - 45, valenceTop - 2); cx.lineTo(W / 2 - 41, valenceTop - 8);
            cx.stroke();
          }

          // Fermi level (9-12 or toggle)
          if (d.showFermi && !isConductor) {
            var fermiY = midY; // intrinsic: mid-gap
            cx.strokeStyle = '#F97316';
            cx.lineWidth = 1.5;
            cx.setLineDash([6, 4]);
            cx.beginPath();
            cx.moveTo(35, fermiY); cx.lineTo(W - 35, fermiY);
            cx.stroke();
            cx.setLineDash([]);
            cx.fillStyle = '#F97316';
            cx.font = '10px sans-serif';
            cx.textAlign = 'right';
            cx.fillText('E\u1DA0 (Fermi)', W - 10, fermiY - 4);
          }

          // Electrons in valence band
          cx.fillStyle = '#60A5FA';
          var electronY = isConductor ? midY : valenceTop + 30;
          for (var i = 0; i < 8; i++) {
            var ex = 60 + i * (W - 120) / 7;
            cx.beginPath();
            cx.arc(ex, electronY + Math.sin(Date.now() / 500 + i) * 3, 4, 0, Math.PI * 2);
            cx.fill();
          }

          // Thermal excitation — more electrons jump at higher temp
          var thermalProb = isConductor ? 0.5 : Math.min(0.4, Math.exp(-Eg / (2 * 8.617e-5 * tempK)) * 1e5);
          var excitedCount = Math.floor(thermalProb * 6);
          for (var ti = 0; ti < excitedCount; ti++) {
            var tex = 70 + ti * (W - 140) / Math.max(1, excitedCount - 1);
            var tBob = Math.sin(Date.now() / 400 + ti * 2) * 5;
            // Excited electron in conduction band
            cx.fillStyle = '#F59E0B';
            cx.beginPath();
            cx.arc(tex, conductionBot - 20 + tBob, 4, 0, Math.PI * 2);
            cx.fill();
            // Hole left behind
            cx.strokeStyle = '#F87171';
            cx.lineWidth = 1.5;
            cx.beginPath();
            cx.arc(tex + 10, valenceTop + 30 - tBob, 4, 0, Math.PI * 2);
            cx.stroke();
          }

          // Photon excitation
          if (d.showPhoton && !isConductor) {
            var pTime = (Date.now() % 2000) / 2000;
            var px = 60 + pTime * (W - 120);
            // Photon wavy arrow
            cx.strokeStyle = '#FBBF24';
            cx.lineWidth = 2;
            cx.beginPath();
            for (var pw = 0; pw < 6; pw++) {
              var pwy = valenceTop + 30 - pw * (gapPx + 45) / 6;
              var pwx = px + Math.sin(pw * 1.5) * 6;
              if (pw === 0) cx.moveTo(pwx, pwy); else cx.lineTo(pwx, pwy);
            }
            cx.stroke();
            // Photon label
            cx.fillStyle = '#FBBF24';
            cx.font = '9px sans-serif';
            cx.textAlign = 'center';
            cx.fillText('h\u03BD \u2265 ' + Eg.toFixed(2) + ' eV', px, valenceTop + 45);
            // Excited electron
            cx.fillStyle = '#F59E0B';
            cx.beginPath();
            cx.arc(px, conductionBot - 15 + Math.sin(Date.now() / 300) * 4, 5, 0, Math.PI * 2);
            cx.fill();
            // Hole
            cx.strokeStyle = '#F87171';
            cx.lineWidth = 1.5;
            cx.beginPath();
            cx.arc(px, valenceTop + 30, 5, 0, Math.PI * 2);
            cx.stroke();
          }

          // Carrier concentration bar (9-12)
          if (gradeBand === '9-12' || gradeBand === '6-8') {
            var niLog = mat.ni > 0 ? Math.log10(mat.ni) : 0;
            var barW = Math.max(5, Math.min(80, niLog * 3.5));
            cx.fillStyle = '#475569';
            cx.fillRect(W - 95, H - 35, 85, 12);
            cx.fillStyle = '#22D3EE';
            cx.fillRect(W - 95, H - 35, barW, 12);
            cx.fillStyle = '#94A3B8';
            cx.font = '8px sans-serif';
            cx.textAlign = 'right';
            cx.fillText('n\u1D62 carrier conc.', W - 10, H - 40);
          }

          // Classification label
          cx.fillStyle = isConductor ? '#34D399' : (isInsulator ? '#F87171' : '#FBBF24');
          cx.font = 'bold 12px sans-serif';
          cx.textAlign = 'left';
          var classLabel = isConductor ? '\u2713 Conductor' : (isInsulator ? '\u2717 Insulator' : '\u26A1 Semiconductor');
          cx.fillText(classLabel, 10, H - 5);
        };

        var animRef = React.useRef(null);
        React.useEffect(function() {
          var canvas = document.getElementById('semi-bandgap-canvas');
          if (!canvas) return;
          if (canvasA11yDesc) canvasA11yDesc(canvas, 'Band gap energy diagram. Shows valence and conduction bands for ' + mat.name + '. Band gap is ' + Eg.toFixed(2) + ' electron volts at ' + tempK + ' Kelvin.');
          function draw() { canvasRef(canvas); animRef.current = requestAnimationFrame(draw); }
          draw();
          return function() { cancelAnimationFrame(animRef.current); };
        }, [d.material, d.temperature, d.showPhoton, d.showFermi]);

        return h('div', null,
          // Material selector
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            Object.keys(MATERIALS).map(function(key) {
              var m = MATERIALS[key];
              return pill(m.name, d.material === key, function() {
                upd('material', key);
                tryAwardXP('mat-' + key, 5, 'Explored ' + m.name);
                if (typeof canvasNarrate === 'function') canvasNarrate('semiconductor', 'materialSelect', 'Selected ' + m.name + '. Band gap: ' + m.bandGap + ' electron volts. Lattice: ' + m.lattice + '.', { debounce: 500 });
                if (announceToSR) announceToSR('Selected ' + m.name + ', band gap ' + m.bandGap + ' eV');
              });
            })
          ),
          h('canvas', { 'aria-label': 'Semiconductor visualization',
            id: 'semi-bandgap-canvas', width: 440, height: 240,
            className: 'w-full rounded-lg bg-slate-900 border border-slate-700',
            role: 'img', 'aria-label': 'Band gap diagram for ' + mat.name + ' at ' + tempK + 'K'
          }),
          sliderRow('Temperature', tempK, 50, 800, 10, function(v) { upd('temperature', v); }, ' K'),
          h('div', { className: 'flex flex-wrap items-center gap-3 mt-2' },
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!d.showPhoton, onChange: function() { upd('showPhoton', !d.showPhoton); }, className: 'accent-amber-500' }),
              'Photon Excitation'
            ),
            (gradeBand === '9-12' || gradeBand === '6-8') && h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!d.showFermi, onChange: function() { upd('showFermi', !d.showFermi); }, className: 'accent-orange-500' }),
              'Fermi Level'
            ),
            btn('\uD83E\uDD16 AI Explain', function() { askAI('band gap of ' + mat.name + ' semiconductor'); }),
            btn('\uD83D\uDD0A Read', function() { speakText(mat.name + ' has a band gap of ' + Eg.toFixed(2) + ' electron volts. ' + (isConductor ? 'It is a conductor.' : isInsulator ? 'It is an insulator.' : 'It is a semiconductor.')); }, 'bg-slate-600 text-slate-200 hover:bg-slate-500')
          ),
          // Stats bar
          h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
            statBadge('Band Gap', Eg.toFixed(2) + ' eV', isConductor ? 'text-emerald-400' : isInsulator ? 'text-red-400' : 'text-amber-400'),
            statBadge('Lattice', mat.lattice),
            statBadge('Mobility', mat.mobility + ' cm\u00B2/Vs'),
            gradeBand === '9-12' && mat.ni > 0 && statBadge('n\u1D62', mat.ni.toExponential(1) + ' /cm\u00B3')
          ),
          // Grade-differentiated info
          infoBox(gradeText(
            mat.name + ' \u2014 ' + (isConductor ? 'Electricity flows through it easily, like water in a pipe!' : isInsulator ? 'Electricity cannot flow through it \u2014 it blocks like a wall.' : 'A special material! Sometimes it conducts, sometimes it doesn\'t. We can control it like a switch!'),
            mat.name + ' \u2014 Band Gap: ' + Eg.toFixed(2) + ' eV. ' + (isConductor ? 'Conductor: free electrons flow easily.' : isInsulator ? 'Insulator: electrons are stuck.' : 'Semiconductor: moderate gap \u2014 we can control conduction with heat, light, or doping.'),
            mat.name + ' \u2014 E\u2097 = ' + Eg.toFixed(2) + ' eV at ' + tempK + 'K. Lattice: ' + mat.lattice + '. ' + (isConductor ? 'Conductor: overlapping bands, metallic bonding.' : isInsulator ? 'Insulator: very large gap, covalent/ionic bonding.' : 'Semiconductor: moderate gap. Conductivity \u221D exp(-E\u2097/2kT).'),
            mat.name + ' \u2014 E\u2097(' + tempK + 'K) = ' + Eg.toFixed(3) + ' eV (Varshni: E\u2097(T) = E\u2097(0) + \u03B1T). Lattice: ' + mat.lattice + '. \u03BC\u2099 = ' + mat.mobility + ' cm\u00B2/Vs. n\u1D62(' + tempK + 'K) \u2248 ' + (mat.ni > 0 ? mat.ni.toExponential(1) : '0') + ' cm\u207B\u00B3. ' + (isConductor ? 'Metal: E\u1DA0 in conduction band.' : isInsulator ? 'E\u2097 >> kT, negligible intrinsic carriers.' : 'Intrinsic: E\u1DA0 \u2248 mid-gap. \u03C3 = n\u1D62\u00B7q\u00B7(\u03BC\u2099+\u03BC\u209A).')
          )),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // DOPING SIMULATOR (enhanced)
      // ════════════════════════════════════════════
      function renderDoping() {
        var dopant = DOPANTS[d.dopant] || DOPANTS.none;
        var count = d.dopantCount || 3;
        var gridSize = d.crystalSize || 8;

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var cx = canvasEl.getContext('2d');
          var W = canvasEl.width, H = canvasEl.height;
          cx.clearRect(0, 0, W, H);

          // Background
          cx.fillStyle = '#0F172A';
          cx.fillRect(0, 0, W, H);

          var cellW = (W - 20) / gridSize;
          var cellH = (H - 30) / gridSize;

          var dopantPositions = {};
          var seed = d.dopant.length * 7 + count * 13;
          for (var di = 0; di < count && di < gridSize * gridSize * 0.3; di++) {
            var pos = (seed * (di + 1) * 37 + di * 53) % (gridSize * gridSize);
            dopantPositions[pos] = true;
          }

          // Draw crystal lattice
          for (var row = 0; row < gridSize; row++) {
            for (var col = 0; col < gridSize; col++) {
              var cx1 = 10 + col * cellW + cellW / 2;
              var cy1 = 10 + row * cellH + cellH / 2;
              var idx = row * gridSize + col;
              var isDopant = dopantPositions[idx] && d.dopant !== 'none';

              // Bonds
              cx.strokeStyle = '#334155';
              cx.lineWidth = 1;
              if (col < gridSize - 1) { cx.beginPath(); cx.moveTo(cx1, cy1); cx.lineTo(cx1 + cellW, cy1); cx.stroke(); }
              if (row < gridSize - 1) { cx.beginPath(); cx.moveTo(cx1, cy1); cx.lineTo(cx1, cy1 + cellH); cx.stroke(); }

              var radius = Math.min(cellW, cellH) * 0.26;
              cx.beginPath();
              cx.arc(cx1, cy1, radius, 0, Math.PI * 2);

              if (isDopant) {
                // Glow effect
                cx.shadowColor = dopant.color;
                cx.shadowBlur = 6;
                cx.fillStyle = dopant.color;
                cx.fill();
                cx.shadowBlur = 0;
                cx.strokeStyle = '#FCD34D';
                cx.lineWidth = 2;
                cx.stroke();
                cx.fillStyle = '#FFF';
                cx.font = 'bold ' + Math.max(8, radius * 0.8) + 'px sans-serif';
                cx.textAlign = 'center';
                cx.textBaseline = 'middle';
                cx.fillText(dopant.symbol, cx1, cy1);

                // Animated free carrier
                var carrierT = Date.now() / 600 + idx;
                var carrierDx = Math.sin(carrierT) * (radius + 6);
                var carrierDy = Math.cos(carrierT * 0.7) * (radius + 6);
                if (dopant.type === 'n') {
                  cx.fillStyle = '#60A5FA';
                  cx.beginPath();
                  cx.arc(cx1 + carrierDx, cy1 + carrierDy, 3, 0, Math.PI * 2);
                  cx.fill();
                  if (radius > 10) { cx.fillStyle = '#93C5FD'; cx.font = '7px sans-serif'; cx.fillText('e\u207B', cx1 + carrierDx, cy1 + carrierDy - 7); }
                } else if (dopant.type === 'p') {
                  cx.strokeStyle = '#F87171';
                  cx.lineWidth = 1.5;
                  cx.beginPath();
                  cx.arc(cx1 + carrierDx, cy1 + carrierDy, 3, 0, Math.PI * 2);
                  cx.stroke();
                  if (radius > 10) { cx.fillStyle = '#FCA5A5'; cx.font = '7px sans-serif'; cx.fillText('h\u207A', cx1 + carrierDx, cy1 + carrierDy - 7); }
                }
              } else {
                cx.fillStyle = '#4F46E5';
                cx.fill();
                cx.strokeStyle = '#6366F1';
                cx.lineWidth = 1;
                cx.stroke();
                cx.fillStyle = '#C7D2FE';
                cx.font = Math.max(7, radius * 0.65) + 'px sans-serif';
                cx.textAlign = 'center';
                cx.textBaseline = 'middle';
                cx.fillText('Si', cx1, cy1);
              }
            }
          }

          // Legend
          cx.fillStyle = '#94A3B8';
          cx.font = '10px sans-serif';
          cx.textAlign = 'left';
          cx.textBaseline = 'alphabetic';
          cx.fillText('Si lattice' + (d.dopant !== 'none' ? ' + ' + dopant.name + ' (' + dopant.type + '-type)' : ' (intrinsic)'), 10, H - 5);

          // Doping concentration readout (6-8+)
          if (gradeBand !== 'K-2' && gradeBand !== '3-5' && d.dopant !== 'none') {
            var concExp = 14 + count;
            cx.fillStyle = '#22D3EE';
            cx.font = '9px sans-serif';
            cx.textAlign = 'right';
            cx.fillText('N\u2093 \u2248 10^' + concExp + ' cm\u207B\u00B3', W - 10, H - 5);
          }
        };

        var animRef = React.useRef(null);
        React.useEffect(function() {
          var canvas = document.getElementById('semi-doping-canvas');
          if (!canvas) return;
          function draw() { canvasRef(canvas); animRef.current = requestAnimationFrame(draw); }
          draw();
          return function() { cancelAnimationFrame(animRef.current); };
        }, [d.dopant, d.dopantCount, d.crystalSize]);

        return h('div', null,
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            Object.keys(DOPANTS).map(function(key) {
              var dp = DOPANTS[key];
              return pill(dp.name, d.dopant === key, function() {
                upd('dopant', key);
                if (key !== 'none') tryAwardXP('dope-' + key, 8, 'Tried ' + dp.name + ' doping');
                if (typeof canvasNarrate === 'function') canvasNarrate('semiconductor', 'dopantSelect', dp.name + (dp.type ? ', ' + dp.type + '-type doping. Majority carriers: ' + (dp.type === 'n' ? 'electrons' : 'holes') + '.' : '. Intrinsic silicon, no doping.'), { debounce: 500 });
                if (announceToSR) announceToSR('Selected dopant: ' + dp.name + (dp.type ? ', ' + dp.type + '-type' : ''));
              });
            })
          ),
          h('canvas', { 'aria-label': 'Semiconductor visualization',
            id: 'semi-doping-canvas', width: 440, height: 300,
            className: 'w-full rounded-lg bg-slate-900 border border-slate-700',
            role: 'img', 'aria-label': 'Crystal lattice showing ' + (d.dopant !== 'none' ? dopant.name + ' doped silicon' : 'intrinsic silicon')
          }),
          sliderRow('Dopant atoms', count, 1, Math.floor(gridSize * gridSize * 0.3), 1, function(v) { upd('dopantCount', v); }),
          sliderRow('Grid size', gridSize, 4, 12, 1, function(v) { upd('crystalSize', v); }),
          // Stats
          d.dopant !== 'none' && h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
            statBadge('Type', dopant.type + '-type', dopant.type === 'n' ? 'text-red-400' : 'text-blue-400'),
            statBadge('Valence e\u207B', String(dopant.valence)),
            statBadge('Majority', dopant.type === 'n' ? 'Electrons' : 'Holes'),
            statBadge('Minority', dopant.type === 'n' ? 'Holes' : 'Electrons')
          ),
          infoBox(gradeText(
            d.dopant === 'none' ? 'Silicon is like a team where everyone holds hands. No free helpers!' : dopant.type === 'n' ? dopant.name + ' brings an EXTRA helper (electron) that can move around freely!' : dopant.name + ' is missing a helper, leaving a hole that other helpers can jump into!',
            d.dopant === 'none' ? 'Intrinsic silicon: 4 valence electrons each, all shared in bonds. Very few free carriers.' : dopant.type === 'n' ? 'N-type: ' + dopant.name + ' has ' + dopant.valence + ' electrons (1 extra). Extra electrons are free to move and carry current.' : 'P-type: ' + dopant.name + ' has ' + dopant.valence + ' electrons (1 fewer). Creates holes that act as positive charge carriers.',
            d.dopant === 'none' ? 'Intrinsic Si: n\u1D62 = p\u1D62 = 1.5\u00D710\u00B9\u2070 cm\u207B\u00B3 at 300K. Equal electron-hole pairs from thermal generation.' : dopant.type === 'n' ? 'N-type with ' + dopant.name + ': N\u2093 >> n\u1D62. Majority: electrons, minority: holes. E\u1DA0 shifts toward E\u1D9C.' : 'P-type with ' + dopant.name + ': N\u2090 >> n\u1D62. Majority: holes, minority: electrons. E\u1DA0 shifts toward E\u1D65.',
            d.dopant === 'none' ? 'Intrinsic Si at 300K: n = p = n\u1D62 = 1.5\u00D710\u00B9\u2070 cm\u207B\u00B3. Fermi level at mid-gap. \u03C3 = q\u00B7n\u1D62\u00B7(\u03BC\u2099 + \u03BC\u209A) \u2248 4.4\u00D710\u207B\u2074 S/cm.' : dopant.type === 'n' ? 'N-type (' + dopant.name + '): n \u2248 N\u2093, p = n\u1D62\u00B2/N\u2093. E\u1DA0 \u2212 E\u1D62 = kT\u00B7ln(N\u2093/n\u1D62). Conductivity \u03C3 \u2248 q\u00B7N\u2093\u00B7\u03BC\u2099. Mass-action law: np = n\u1D62\u00B2.' : 'P-type (' + dopant.name + '): p \u2248 N\u2090, n = n\u1D62\u00B2/N\u2090. E\u1D62 \u2212 E\u1DA0 = kT\u00B7ln(N\u2090/n\u1D62). \u03C3 \u2248 q\u00B7N\u2090\u00B7\u03BC\u209A. Mass-action law: np = n\u1D62\u00B2.'
          )),
          h('div', { className: 'flex gap-2 mt-2' },
            btn('\uD83E\uDD16 AI Explain', function() { askAI(d.dopant === 'none' ? 'intrinsic semiconductor crystal lattice' : dopant.type + '-type doping with ' + dopant.name); }, 'bg-indigo-600 text-white hover:bg-indigo-700'),
            btn('\uD83D\uDD0A Read', function() { speakText(d.dopant === 'none' ? 'Intrinsic silicon with 4 valence electrons in covalent bonds.' : dopant.type + '-type doping with ' + dopant.name + '. Majority carriers are ' + (dopant.type === 'n' ? 'electrons' : 'holes') + '.'); }, 'bg-slate-600 text-slate-200 hover:bg-slate-500')
          ),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // P-N JUNCTION (enhanced with I-V overlay + LED)
      // ════════════════════════════════════════════
      function renderPNJunction() {
        var bias = d.pnBias || 0;
        var showField = d.pnShowField !== false;
        var showCarriers = d.pnShowCarriers !== false;
        var showDepletion = d.pnShowDepletion !== false;

        var animFrameRef = React.useRef(null);

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var cx = canvasEl.getContext('2d');
          var W = canvasEl.width, H = canvasEl.height;
          cx.clearRect(0, 0, W, H);

          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          var midX = W / 2;
          var junctionY = 30;
          var junctionH = H - 70;
          var depletionW = Math.max(8, 60 - bias * 20);
          if (bias > 2.5) depletionW = 5;
          if (bias < -2) depletionW = Math.min(120, 60 + Math.abs(bias) * 20);

          // P-side
          var pGrad = cx.createLinearGradient(10, 0, midX - depletionW / 2, 0);
          pGrad.addColorStop(0, '#1E40AF'); pGrad.addColorStop(1, '#3B82F6');
          cx.fillStyle = pGrad;
          cx.fillRect(10, junctionY, midX - 10 - depletionW / 2, junctionH);
          cx.fillStyle = '#FFF'; cx.font = 'bold 13px sans-serif'; cx.textAlign = 'center';
          cx.fillText('P-type', (10 + midX - depletionW / 2) / 2, junctionY + 18);
          // Fixed ions (-)
          cx.fillStyle = '#93C5FD'; cx.font = '10px sans-serif';
          for (var pi = 0; pi < 3; pi++) {
            var pix = midX - depletionW / 2 - 15 - pi * 18;
            cx.fillText('\u2296', pix, junctionY + junctionH / 2 + 5);
          }

          // N-side
          var nGrad = cx.createLinearGradient(midX + depletionW / 2, 0, W - 10, 0);
          nGrad.addColorStop(0, '#EF4444'); nGrad.addColorStop(1, '#991B1B');
          cx.fillStyle = nGrad;
          cx.fillRect(midX + depletionW / 2, junctionY, W - 10 - midX - depletionW / 2, junctionH);
          cx.fillStyle = '#FFF';
          cx.fillText('N-type', (midX + depletionW / 2 + W - 10) / 2, junctionY + 18);
          // Fixed ions (+)
          cx.fillStyle = '#FCA5A5'; cx.font = '10px sans-serif';
          for (var ni = 0; ni < 3; ni++) {
            cx.fillText('\u2295', midX + depletionW / 2 + 10 + ni * 18, junctionY + junctionH / 2 + 5);
          }

          // Depletion region
          if (showDepletion) {
            cx.fillStyle = 'rgba(148, 163, 184, 0.25)';
            cx.fillRect(midX - depletionW / 2, junctionY, depletionW, junctionH);
            cx.strokeStyle = '#CBD5E1'; cx.setLineDash([4, 3]); cx.lineWidth = 1;
            cx.strokeRect(midX - depletionW / 2, junctionY, depletionW, junctionH);
            cx.setLineDash([]);
            cx.fillStyle = '#CBD5E1'; cx.font = '9px sans-serif'; cx.textAlign = 'center';
            cx.fillText('Depletion (' + depletionW.toFixed(0) + 'px)', midX, junctionY + junctionH + 12);
          }

          // E-field arrows
          if (showField && depletionW > 15) {
            cx.strokeStyle = '#FBBF24'; cx.lineWidth = 2;
            var arrowCount = Math.floor(junctionH / 35);
            for (var ai = 0; ai < arrowCount; ai++) {
              var ay = junctionY + 30 + ai * 35;
              var ax1 = midX - depletionW / 3, ax2 = midX + depletionW / 3;
              cx.beginPath(); cx.moveTo(ax2, ay); cx.lineTo(ax1, ay); cx.stroke();
              cx.beginPath(); cx.moveTo(ax1 + 5, ay - 4); cx.lineTo(ax1, ay); cx.lineTo(ax1 + 5, ay + 4); cx.stroke();
            }
            cx.fillStyle = '#FBBF24'; cx.font = '9px sans-serif'; cx.fillText('\u2190 E field', midX, junctionY + junctionH - 8);
          }

          // Carrier animation
          if (showCarriers) {
            var t = (Date.now() % 3000) / 3000;
            if (bias > 0.5) {
              var flowSpeed = t;
              cx.strokeStyle = '#93C5FD'; cx.lineWidth = 1.5;
              for (var hi = 0; hi < 6; hi++) {
                var hx = 40 + ((flowSpeed * W + hi * 70) % (W - 80));
                var hy = junctionY + 40 + (hi % 3) * (junctionH / 4);
                cx.beginPath(); cx.arc(hx, hy, 4, 0, Math.PI * 2); cx.stroke();
              }
              cx.fillStyle = '#FCA5A5';
              for (var ei = 0; ei < 6; ei++) {
                var exx = W - 40 - ((flowSpeed * W + ei * 70) % (W - 80));
                var ey = junctionY + 55 + (ei % 3) * (junctionH / 4);
                cx.beginPath(); cx.arc(exx, ey, 3, 0, Math.PI * 2); cx.fill();
              }
              // Current indicator with glow
              cx.shadowColor = '#34D399'; cx.shadowBlur = 8;
              cx.fillStyle = '#34D399'; cx.font = 'bold 12px sans-serif';
              cx.fillText('I \u2192 Current: ' + Math.min(100, Math.round((bias - 0.5) * 80)) + '%', midX, junctionY - 10);
              cx.shadowBlur = 0;

              // LED glow effect
              if (d.pnLedMode && bias > 0.6) {
                var glowIntensity = Math.min(1, (bias - 0.6) / 1.5);
                cx.beginPath();
                cx.arc(midX, junctionY - 25, 12, 0, Math.PI * 2);
                cx.fillStyle = 'rgba(251, 191, 36, ' + glowIntensity.toFixed(2) + ')';
                cx.shadowColor = '#FBBF24'; cx.shadowBlur = 20 * glowIntensity;
                cx.fill();
                cx.shadowBlur = 0;
                cx.fillStyle = '#FCD34D'; cx.font = '8px sans-serif';
                cx.fillText('LED \u2728', midX, junctionY - 38);
              }
            } else if (bias < -0.3) {
              cx.fillStyle = '#F87171'; cx.font = '11px sans-serif'; cx.textAlign = 'center';
              cx.fillText('\u26A0 Reverse bias \u2014 no current (depletion widens)', midX, junctionY - 10);
              // Breakdown warning at high reverse bias
              if (bias < -2.5) {
                cx.fillStyle = '#EF4444'; cx.font = 'bold 11px sans-serif';
                cx.fillText('\u26A1 Approaching BREAKDOWN!', midX, junctionY - 25);
              }
            } else {
              cx.strokeStyle = '#93C5FD'; cx.lineWidth = 1.5;
              for (var qpi = 0; qpi < 5; qpi++) {
                var ppx = 30 + qpi * ((midX - depletionW / 2 - 30) / 4);
                var ppy = junctionY + 45 + (qpi % 3) * 30 + Math.sin(Date.now() / 700 + qpi) * 5;
                cx.beginPath(); cx.arc(ppx, ppy, 4, 0, Math.PI * 2); cx.stroke();
              }
              cx.fillStyle = '#FCA5A5';
              for (var qni = 0; qni < 5; qni++) {
                var nnx = midX + depletionW / 2 + 15 + qni * ((W - midX - depletionW / 2 - 30) / 4);
                var nny = junctionY + 45 + (qni % 3) * 30 + Math.sin(Date.now() / 700 + qni + 3) * 5;
                cx.beginPath(); cx.arc(nnx, nny, 3, 0, Math.PI * 2); cx.fill();
              }
            }
          }

          // I-V curve mini-graph overlay
          if (d.pnShowIV) {
            var ivX = W - 110, ivY = H - 65, ivW = 100, ivH = 55;
            cx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            cx.fillRect(ivX, ivY, ivW, ivH);
            cx.strokeStyle = '#475569'; cx.lineWidth = 1; cx.strokeRect(ivX, ivY, ivW, ivH);
            // Axes
            cx.strokeStyle = '#64748B'; cx.lineWidth = 0.5;
            cx.beginPath(); cx.moveTo(ivX + ivW / 3, ivY + 2); cx.lineTo(ivX + ivW / 3, ivY + ivH - 2); cx.stroke();
            cx.beginPath(); cx.moveTo(ivX + 2, ivY + ivH * 0.7); cx.lineTo(ivX + ivW - 2, ivY + ivH * 0.7); cx.stroke();
            // Diode curve
            cx.strokeStyle = '#22D3EE'; cx.lineWidth = 1.5; cx.beginPath();
            for (var iv = -3; iv <= 3; iv += 0.1) {
              var iCurrent = iv > 0 ? (Math.exp(iv * 15) - 1) * 0.0001 : -0.00001;
              var px = ivX + ivW / 3 + (iv / 3) * (ivW * 2 / 3);
              var py = ivY + ivH * 0.7 - Math.min(ivH * 0.65, Math.max(-ivH * 0.2, iCurrent * ivH * 500));
              if (iv === -3) cx.moveTo(px, py); else cx.lineTo(px, py);
            }
            cx.stroke();
            // Current bias point
            var bpx = ivX + ivW / 3 + (bias / 3) * (ivW * 2 / 3);
            var bpI = bias > 0 ? (Math.exp(bias * 15) - 1) * 0.0001 : -0.00001;
            var bpy = ivY + ivH * 0.7 - Math.min(ivH * 0.65, Math.max(-ivH * 0.2, bpI * ivH * 500));
            cx.fillStyle = '#F59E0B'; cx.beginPath(); cx.arc(bpx, bpy, 3, 0, Math.PI * 2); cx.fill();
            cx.fillStyle = '#94A3B8'; cx.font = '7px sans-serif'; cx.textAlign = 'center';
            cx.fillText('I-V Curve', ivX + ivW / 2, ivY + ivH + 8);
          }

          // Battery / bias
          cx.fillStyle = '#E2E8F0'; cx.font = '11px sans-serif'; cx.textAlign = 'left';
          cx.fillText('V\u2090\u209A\u209A = ' + (bias >= 0 ? '+' : '') + bias.toFixed(1) + ' V', 10, H - 5);
        };

        React.useEffect(function() {
          var canvas = document.getElementById('semi-pn-canvas');
          if (!canvas) return;
          function draw() { canvasRef(canvas); animFrameRef.current = requestAnimationFrame(draw); }
          draw();
          return function() { cancelAnimationFrame(animFrameRef.current); };
        }, [d.pnBias, d.pnShowField, d.pnShowCarriers, d.pnShowDepletion, d.pnShowIV, d.pnLedMode]);

        return h('div', null,
          h('canvas', { 'aria-label': 'Semiconductor visualization',
            id: 'semi-pn-canvas', width: 440, height: 280,
            className: 'w-full rounded-lg bg-slate-900 border border-slate-700',
            role: 'img', 'aria-label': 'P-N junction with ' + bias.toFixed(1) + 'V bias'
          }),
          sliderRow('Bias Voltage', bias, -3, 3, 0.1, function(v) {
            upd('pnBias', v);
            if (v > 0.6) tryAwardXP('pn-forward', 10, 'Applied forward bias to P-N junction');
            if (v < -1) tryAwardXP('pn-reverse', 10, 'Applied reverse bias');
            if (v < -2.5) tryAwardXP('pn-breakdown', 15, 'Explored breakdown voltage');
          }, ' V'),
          h('div', { className: 'flex flex-wrap gap-3 mt-2' },
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showField, onChange: function() { upd('pnShowField', !showField); }, className: 'accent-yellow-500' }), 'E-Field'),
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showCarriers, onChange: function() { upd('pnShowCarriers', !showCarriers); }, className: 'accent-blue-500' }), 'Carriers'),
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showDepletion, onChange: function() { upd('pnShowDepletion', !showDepletion); }, className: 'accent-slate-400' }), 'Depletion'),
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!d.pnShowIV, onChange: function() { upd('pnShowIV', !d.pnShowIV); }, className: 'accent-cyan-500' }), 'I-V Curve'),
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!d.pnLedMode, onChange: function() { upd('pnLedMode', !d.pnLedMode); if (!d.pnLedMode) tryAwardXP('pn-led', 10, 'Explored LED mode'); }, className: 'accent-amber-500' }), 'LED Mode'),
            btn('\uD83E\uDD16 AI', function() {
              askAI(bias > 0.5 ? 'forward biased P-N junction current flow' : bias < -0.3 ? 'reverse biased P-N junction depletion' : 'P-N junction equilibrium');
            })
          ),
          infoBox(gradeText(
            bias > 0.5 ? 'Push the positive side \u2014 electricity flows through like opening a gate!' : bias < -0.3 ? 'Push the wrong way \u2014 the gate closes tighter!' : 'The gate is balanced \u2014 no electricity flows yet.',
            bias > 0.5 ? 'Forward Bias: voltage pushes carriers across the junction. Current flows!' : bias < -0.3 ? 'Reverse Bias: voltage pulls carriers apart. Depletion widens, blocking current.' : 'Equilibrium: internal electric field balances diffusion. No net current.',
            bias > 0.5 ? 'Forward Bias (V > 0.6V): depletion narrows, diffusion current dominates. I = I\u2080(e^(V/V\u209C) \u2212 1). This is how diodes and LEDs work.' : bias < -0.3 ? 'Reverse Bias: depletion widens \u221D \u221A(V\u2091\u1D62 + |V\u1D63|). Only leakage current I\u2080 flows. Breakdown at V\u2091\u1D63.' : 'Equilibrium: built-in potential V\u2091\u1D62 \u2248 0.6-0.7V (Si). Drift and diffusion currents balance.',
            bias > 0.5 ? 'Forward: I = I\u2080(e^(qV/nkT) \u2212 1), n\u22481-2. Depletion width W \u221D \u221A(V\u2091\u1D62\u2212V\u1DA0). Minority carrier injection dominates. At V >> V\u209C: I \u2248 I\u2080\u00B7e^(qV/kT).' : bias < -0.3 ? 'Reverse: W = \u221A(2\u03B5(V\u2091\u1D62+|V\u1D63|)/q \u00B7 (1/N\u2090+1/N\u2093)). C\u2C7C = \u03B5A/W (junction capacitance). Breakdown: Zener (E\u2097<5V) or Avalanche (E\u2097>5V).' : 'Equilibrium: V\u2091\u1D62 = (kT/q)ln(N\u2090N\u2093/n\u1D62\u00B2). Built-in field \u2248 10\u2074-10\u2075 V/cm. Depletion: no mobile carriers, only fixed ions.'
          )),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // TRANSISTOR SIMULATOR (enhanced + CMOS)
      // ════════════════════════════════════════════
      function renderTransistor() {
        var type = d.transistorType || 'mosfet-n';
        var Vg = d.gateVoltage || 0;
        var Vd = d.drainVoltage || 5;
        var showCMOS = !!d.showCMOS;

        var threshold = type === 'mosfet-n' ? 1.5 : type === 'mosfet-p' ? -1.5 : 0.6;
        var isOn = type === 'mosfet-n' ? Vg > threshold : type === 'mosfet-p' ? Vg < threshold : Vg > threshold;
        var currentPct = 0;
        if (isOn) {
          if (type.startsWith('mosfet')) {
            currentPct = Math.min(100, Math.round(Math.pow(Math.abs(Vg) - Math.abs(threshold), 2) / 25 * 100));
          } else {
            currentPct = Math.min(100, Math.round((Math.abs(Vg) - Math.abs(threshold)) / 0.3 * 100));
          }
        }

        // CMOS inverter output
        var cmosOut = Vg > 2.5 ? false : true; // inverted logic

        var animRef = React.useRef(null);
        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var cx = canvasEl.getContext('2d');
          var W = canvasEl.width, H = canvasEl.height;
          cx.clearRect(0, 0, W, H);
          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          var midX = W / 2, midY = H / 2;

          if (showCMOS) {
            // ═══ CMOS INVERTER DIAGRAM ═══
            var vdd = 5;
            // VDD rail
            cx.strokeStyle = '#EF4444'; cx.lineWidth = 2;
            cx.beginPath(); cx.moveTo(midX, 15); cx.lineTo(midX, 35); cx.stroke();
            cx.fillStyle = '#EF4444'; cx.font = 'bold 10px sans-serif'; cx.textAlign = 'center';
            cx.fillText('VDD = ' + vdd + 'V', midX, 12);

            // PMOS (top)
            cx.fillStyle = '#1E3A5F'; cx.fillRect(midX - 30, 35, 60, 40);
            cx.strokeStyle = '#3B82F6'; cx.lineWidth = 1.5; cx.strokeRect(midX - 30, 35, 60, 40);
            cx.fillStyle = '#93C5FD'; cx.font = 'bold 10px sans-serif';
            cx.fillText('PMOS', midX, 58);
            var pmosOn = Vg < (vdd - 1.5);
            cx.fillStyle = pmosOn ? '#34D399' : '#64748B'; cx.font = '9px sans-serif';
            cx.fillText(pmosOn ? 'ON' : 'OFF', midX + 40, 55);

            // Connection
            cx.strokeStyle = '#64748B'; cx.lineWidth = 2;
            cx.beginPath(); cx.moveTo(midX, 75); cx.lineTo(midX, 95); cx.stroke();

            // Output node
            cx.fillStyle = cmosOut ? '#34D399' : '#EF4444';
            cx.beginPath(); cx.arc(midX, 95, 6, 0, Math.PI * 2); cx.fill();
            cx.strokeStyle = '#64748B'; cx.beginPath(); cx.moveTo(midX + 6, 95); cx.lineTo(midX + 50, 95); cx.stroke();
            cx.fillStyle = cmosOut ? '#34D399' : '#EF4444'; cx.font = 'bold 11px sans-serif'; cx.textAlign = 'left';
            cx.fillText('OUT = ' + (cmosOut ? '1 (HIGH)' : '0 (LOW)'), midX + 55, 98);

            // NMOS (bottom)
            cx.fillStyle = '#3B1212'; cx.fillRect(midX - 30, 105, 60, 40);
            cx.strokeStyle = '#EF4444'; cx.lineWidth = 1.5; cx.strokeRect(midX - 30, 105, 60, 40);
            cx.fillStyle = '#FCA5A5'; cx.font = 'bold 10px sans-serif'; cx.textAlign = 'center';
            cx.fillText('NMOS', midX, 128);
            var nmosOn = Vg > 1.5;
            cx.fillStyle = nmosOn ? '#34D399' : '#64748B'; cx.font = '9px sans-serif';
            cx.fillText(nmosOn ? 'ON' : 'OFF', midX + 40, 125);

            // GND rail
            cx.strokeStyle = '#64748B'; cx.lineWidth = 2;
            cx.beginPath(); cx.moveTo(midX, 145); cx.lineTo(midX, 165); cx.stroke();
            cx.fillStyle = '#64748B'; cx.font = 'bold 10px sans-serif';
            cx.fillText('GND', midX, 178);

            // Gate input
            cx.strokeStyle = '#FBBF24'; cx.lineWidth = 2;
            cx.beginPath(); cx.moveTo(30, 95); cx.lineTo(midX - 30, 95); cx.stroke();
            // Branch to both gates
            cx.beginPath(); cx.moveTo(midX - 35, 55); cx.lineTo(midX - 30, 55); cx.stroke();
            cx.beginPath(); cx.moveTo(midX - 35, 125); cx.lineTo(midX - 30, 125); cx.stroke();
            cx.beginPath(); cx.moveTo(midX - 35, 55); cx.lineTo(midX - 35, 125); cx.stroke();
            cx.beginPath(); cx.moveTo(midX - 35, 95); cx.lineTo(30, 95); cx.stroke();
            cx.fillStyle = '#FBBF24'; cx.font = 'bold 11px sans-serif'; cx.textAlign = 'right';
            cx.fillText('IN = ' + Vg.toFixed(1) + 'V', 28, 92);

            // Current flow animation
            if (nmosOn) {
              var ft = (Date.now() % 1200) / 1200;
              cx.fillStyle = 'rgba(52, 211, 153, 0.6)';
              cx.beginPath(); cx.arc(midX, 125 + ft * 40, 3, 0, Math.PI * 2); cx.fill();
            }
            if (pmosOn) {
              var ft2 = (Date.now() % 1200) / 1200;
              cx.fillStyle = 'rgba(52, 211, 153, 0.6)';
              cx.beginPath(); cx.arc(midX, 35 + ft2 * 40, 3, 0, Math.PI * 2); cx.fill();
            }

            // Truth table
            cx.fillStyle = '#94A3B8'; cx.font = '9px monospace'; cx.textAlign = 'left';
            cx.fillText('IN\u2502OUT', W - 55, 30);
            cx.fillText(' 0 \u2502 1', W - 55, 42);
            cx.fillText(' 1 \u2502 0', W - 55, 54);
          } else if (type.startsWith('mosfet')) {
            // ═══ SINGLE MOSFET ═══
            cx.fillStyle = '#1E293B'; cx.fillRect(midX - 60, midY - 30, 120, 60);
            cx.strokeStyle = '#475569'; cx.lineWidth = 2; cx.strokeRect(midX - 60, midY - 30, 120, 60);
            // Gate
            cx.fillStyle = '#FBBF24'; cx.fillRect(midX - 40, midY - 55, 80, 18);
            cx.fillStyle = '#FFF'; cx.font = 'bold 11px sans-serif'; cx.textAlign = 'center';
            cx.fillText('Gate', midX, midY - 42);
            // Oxide
            cx.fillStyle = '#94A3B8'; cx.fillRect(midX - 40, midY - 37, 80, 7);
            cx.fillStyle = '#475569'; cx.font = '7px sans-serif'; cx.fillText('SiO\u2082', midX, midY - 32);
            // Source
            cx.fillStyle = type === 'mosfet-n' ? '#EF4444' : '#3B82F6';
            cx.fillRect(midX - 80, midY - 15, 25, 30);
            cx.fillStyle = '#FFF'; cx.font = 'bold 10px sans-serif'; cx.fillText('S', midX - 67, midY + 4);
            // Drain
            cx.fillStyle = type === 'mosfet-n' ? '#EF4444' : '#3B82F6';
            cx.fillRect(midX + 55, midY - 15, 25, 30);
            cx.fillText('D', midX + 68, midY + 4);
            // Substrate label
            cx.fillStyle = '#64748B'; cx.font = '8px sans-serif';
            cx.fillText(type === 'mosfet-n' ? 'p-substrate' : 'n-substrate', midX, midY + 25);

            // Channel
            if (isOn) {
              var channelAlpha = currentPct / 100;
              cx.fillStyle = 'rgba(52, 211, 153, ' + channelAlpha.toFixed(2) + ')';
              cx.fillRect(midX - 55, midY - 5, 110, 10);
              cx.strokeStyle = '#34D399'; cx.lineWidth = 2;
              var flowOffset = (Date.now() % 1000) / 1000 * 30;
              for (var fi = 0; fi < 5; fi++) {
                var fx = midX - 50 + (fi * 25 + flowOffset) % 110;
                cx.beginPath(); cx.moveTo(fx, midY); cx.lineTo(fx + 8, midY); cx.stroke();
                cx.beginPath(); cx.moveTo(fx + 6, midY - 3); cx.lineTo(fx + 8, midY); cx.lineTo(fx + 6, midY + 3); cx.stroke();
              }
            }

            // Labels
            cx.fillStyle = '#E2E8F0'; cx.font = '10px sans-serif'; cx.textAlign = 'left';
            cx.fillText('V\u2097\u209B = ' + Vg.toFixed(1) + 'V', 10, 20);
            cx.fillText('V\u2093\u209B = ' + Vd.toFixed(1) + 'V', 10, 35);
            cx.fillText('V\u209C\u2095 = ' + Math.abs(threshold).toFixed(1) + 'V', 10, 50);
            cx.fillStyle = isOn ? '#34D399' : '#F87171'; cx.font = 'bold 14px sans-serif';
            cx.fillText(isOn ? '\u2713 ON' : '\u2717 OFF', W - 50, 25);
            cx.fillStyle = '#60A5FA'; cx.font = '10px sans-serif';
            cx.fillText('I\u2093 \u2248 ' + currentPct + '%', W - 60, 45);

            // Operating region (9-12)
            if (gradeBand === '9-12' && isOn) {
              var region = (Vd - Vg + threshold) < 0 ? 'Saturation' : 'Linear';
              cx.fillStyle = '#A78BFA'; cx.font = '9px sans-serif';
              cx.fillText('Region: ' + region, W - 90, 60);
            }

            // Wires
            cx.strokeStyle = '#64748B'; cx.lineWidth = 2;
            cx.beginPath(); cx.moveTo(midX, midY - 55); cx.lineTo(midX, midY - 75); cx.stroke();
            cx.fillStyle = '#FBBF24'; cx.font = '10px sans-serif'; cx.textAlign = 'center'; cx.fillText('G', midX, midY - 78);
            cx.strokeStyle = '#64748B';
            cx.beginPath(); cx.moveTo(midX - 80, midY); cx.lineTo(midX - 100, midY); cx.stroke();
            cx.beginPath(); cx.moveTo(midX + 80, midY); cx.lineTo(midX + 100, midY); cx.stroke();
          } else {
            // ═══ BJT ═══
            cx.fillStyle = '#475569'; cx.fillRect(midX - 4, midY - 40, 8, 80);
            cx.strokeStyle = '#EF4444'; cx.lineWidth = 3;
            cx.beginPath(); cx.moveTo(midX + 4, midY + 10); cx.lineTo(midX + 50, midY + 40); cx.stroke();
            // Emitter arrow
            cx.beginPath(); cx.moveTo(midX + 40, midY + 35); cx.lineTo(midX + 50, midY + 40); cx.lineTo(midX + 42, midY + 30); cx.stroke();
            cx.strokeStyle = '#3B82F6';
            cx.beginPath(); cx.moveTo(midX + 4, midY - 10); cx.lineTo(midX + 50, midY - 40); cx.stroke();
            cx.strokeStyle = '#FBBF24';
            cx.beginPath(); cx.moveTo(midX - 4, midY); cx.lineTo(midX - 50, midY); cx.stroke();

            cx.fillStyle = '#FFF'; cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center';
            cx.fillText('B', midX - 60, midY + 4);
            cx.fillText('C', midX + 60, midY - 40);
            cx.fillText('E', midX + 60, midY + 44);

            // Beta/gain for 9-12
            if (gradeBand === '9-12' && isOn) {
              cx.fillStyle = '#A78BFA'; cx.font = '10px sans-serif';
              cx.fillText('\u03B2 \u2248 100 (I\u1D9C = \u03B2\u00B7I\u1D47)', midX, midY + 65);
            }

            cx.fillStyle = isOn ? '#34D399' : '#F87171'; cx.font = 'bold 14px sans-serif';
            cx.fillText(isOn ? '\u2713 ON \u2014 I\u1D9C flows' : '\u2717 OFF \u2014 cutoff', midX, midY + 80);
            if (isOn) {
              var bft = (Date.now() % 800) / 800;
              cx.fillStyle = 'rgba(52, 211, 153, 0.7)';
              cx.beginPath(); cx.arc(midX + 4 + bft * 46, midY - 10 - bft * 30, 3, 0, Math.PI * 2); cx.fill();
            }

            cx.fillStyle = '#E2E8F0'; cx.font = '10px sans-serif'; cx.textAlign = 'left';
            cx.fillText('V\u2091\u2091 = ' + Vg.toFixed(1) + 'V (turn on > ' + threshold.toFixed(1) + 'V)', 10, H - 10);
          }
        };

        React.useEffect(function() {
          var canvas = document.getElementById('semi-transistor-canvas');
          if (!canvas) return;
          function draw() { canvasRef(canvas); animRef.current = requestAnimationFrame(draw); }
          draw();
          return function() { cancelAnimationFrame(animRef.current); };
        }, [d.transistorType, d.gateVoltage, d.drainVoltage, d.showCMOS]);

        return h('div', null,
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            pill('N-MOSFET', type === 'mosfet-n' && !showCMOS, function() { updMulti({ transistorType: 'mosfet-n', showCMOS: false }); }),
            pill('P-MOSFET', type === 'mosfet-p' && !showCMOS, function() { updMulti({ transistorType: 'mosfet-p', showCMOS: false }); }),
            pill('NPN BJT', type === 'bjt-npn' && !showCMOS, function() { updMulti({ transistorType: 'bjt-npn', showCMOS: false }); tryAwardXP('bjt', 10, 'Explored BJT'); }),
            pill('\u2699\uFE0F CMOS Inverter', showCMOS, function() { updMulti({ showCMOS: !showCMOS }); tryAwardXP('cmos', 15, 'Explored CMOS inverter'); })
          ),
          h('canvas', { 'aria-label': 'Semiconductor visualization',
            id: 'semi-transistor-canvas', width: 440, height: showCMOS ? 200 : 220,
            className: 'w-full rounded-lg bg-slate-900 border border-slate-700',
            role: 'img', 'aria-label': (showCMOS ? 'CMOS inverter' : type + ' transistor') + ', Vg=' + Vg.toFixed(1) + 'V'
          }),
          sliderRow(showCMOS ? 'Input V' : 'Gate V', Vg, type === 'mosfet-p' && !showCMOS ? -5 : 0, type === 'mosfet-p' && !showCMOS ? 0 : 5, 0.1, function(v) {
            upd('gateVoltage', v);
            if (isOn) tryAwardXP('trans-on', 10, 'Turned transistor ON');
          }, ' V'),
          !showCMOS && sliderRow('Drain V', Vd, 0, 10, 0.5, function(v) { upd('drainVoltage', v); }, ' V'),
          // Current bar
          h('div', { className: 'mt-2 flex items-center gap-2' },
            h('span', { className: 'text-xs text-slate-600 w-20' }, showCMOS ? 'Output' : 'Current'),
            h('div', { className: 'flex-1 h-3 bg-slate-800 rounded-full overflow-hidden' },
              h('div', { className: 'h-full rounded-full transition-all duration-300 ' + (showCMOS ? (cmosOut ? 'bg-emerald-500' : 'bg-red-500') : isOn ? 'bg-emerald-500' : 'bg-slate-700'),
                style: { width: (showCMOS ? (cmosOut ? 100 : 0) : currentPct) + '%' }
              })
            ),
            h('span', { className: 'text-xs font-mono w-14 text-right ' + (isOn || cmosOut ? 'text-emerald-400' : 'text-slate-500') },
              showCMOS ? (cmosOut ? 'HIGH' : 'LOW') : currentPct + '%'
            )
          ),
          infoBox(gradeText(
            showCMOS ? 'A CMOS inverter flips the signal \u2014 put in 1, get out 0!' : (isOn ? 'The transistor is ON \u2014 electricity flows like an open gate!' : 'The transistor is OFF \u2014 the gate is closed, no flow!'),
            showCMOS ? 'CMOS uses two transistors (PMOS + NMOS) that work as a team. One is always ON and one OFF \u2014 very energy efficient!' : (type.startsWith('mosfet') ? 'MOSFET: Gate voltage controls the channel. Above threshold = ON.' : 'BJT: Small base current controls large collector current. It amplifies!'),
            showCMOS ? 'CMOS Inverter: PMOS pulls output HIGH when input LOW, NMOS pulls LOW when input HIGH. No static power consumption \u2014 only switches during transitions.' : (type.startsWith('mosfet') ? type.toUpperCase() + ': V\u2097\u209B > V\u209C\u2095 (' + Math.abs(threshold) + 'V) creates inversion layer. I\u2093 \u221D (V\u2097\u209B \u2212 V\u209C\u2095)\u00B2 in saturation.' : 'NPN BJT: I\u1D9C = \u03B2\u00B7I\u1D47. V\u1D47\u1D49 > 0.6V for active mode. Three regions: cutoff, active, saturation.'),
            showCMOS ? 'CMOS Inverter: P\u209B\u209C\u2090\u209C\u1D62\u209C = 0 (rail-to-rail). P\u2093\u2098\u2099 = C\u2097\u00B7V\u2093\u2093\u00B2\u00B7f. Noise margin: NM\u2097 = V\u1D62\u2097 \u2212 V\u2092\u2097, NM\u2095 = V\u2092\u2095 \u2212 V\u1D62\u2095. Transition at V\u1D62\u2099 \u2248 VDD/2.' : (type.startsWith('mosfet') ? type.toUpperCase() + ': I\u2093 = \u03BC\u2099C\u2092\u2093(W/L)[(V\u2097\u209B\u2212V\u209C\u2095)V\u2093\u209B \u2212 V\u2093\u209B\u00B2/2] (linear). I\u2093 = (\u03BC\u2099C\u2092\u2093/2)(W/L)(V\u2097\u209B\u2212V\u209C\u2095)\u00B2 (sat). g\u2098 = \u22022I\u2093/\u2202V\u2097\u209B.' : 'NPN BJT: I\u1D9C = I\u209B(e^(V\u1D47\u1D49/V\u209C)\u22121). \u03B2 = I\u1D9C/I\u1D47 (current gain). Early effect: I\u1D9C(1+V\u1D9C\u1D49/V\u1D00). f\u209C = g\u2098/(2\u03C0C\u03C0).')
          )),
          h('div', { className: 'flex gap-2 mt-2' },
            btn('\uD83E\uDD16 AI Explain', function() { askAI(showCMOS ? 'CMOS inverter operation' : type + ' transistor'); }, 'bg-indigo-600 text-white hover:bg-indigo-700'),
            btn('\uD83D\uDD0A Read', function() { speakText(showCMOS ? 'CMOS inverter. Input ' + Vg.toFixed(1) + ' volts. Output is ' + (cmosOut ? 'HIGH' : 'LOW') + '.' : type + ' transistor. Gate voltage ' + Vg.toFixed(1) + ' volts. Transistor is ' + (isOn ? 'ON' : 'OFF') + '.'); }, 'bg-slate-600 text-slate-200 hover:bg-slate-500')
          ),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // LOGIC GATES (enhanced with truth table grid + multi-gate chain)
      // ════════════════════════════════════════════
      function renderLogicGates() {
        var gateType = d.gateType || 'NOT';
        var inA = !!d.inputA;
        var inB = !!d.inputB;

        var GATES = {
          NOT:  { inputs: 1, fn: function(a)    { return !a; },       truth: '0\u21921, 1\u21920', transistors: 2, desc: 'Inverts input. Built from 1 PMOS + 1 NMOS (CMOS inverter).' },
          AND:  { inputs: 2, fn: function(a, b) { return a && b; },   truth: '00\u21920, 01\u21920, 10\u21920, 11\u21921', transistors: 6, desc: 'Output HIGH only when BOTH inputs are HIGH. NAND + NOT (6 transistors).' },
          OR:   { inputs: 2, fn: function(a, b) { return a || b; },   truth: '00\u21920, 01\u21921, 10\u21921, 11\u21921', transistors: 6, desc: 'Output HIGH when ANY input is HIGH. NOR + NOT (6 transistors).' },
          NAND: { inputs: 2, fn: function(a, b) { return !(a && b); },truth: '00\u21921, 01\u21921, 10\u21921, 11\u21920', transistors: 4, desc: 'Universal gate! 2 series NMOS + 2 parallel PMOS. All logic from NANDs.' },
          NOR:  { inputs: 2, fn: function(a, b) { return !(a || b); },truth: '00\u21921, 01\u21920, 10\u21920, 11\u21920', transistors: 4, desc: 'Universal gate! 2 parallel NMOS + 2 series PMOS.' },
          XOR:  { inputs: 2, fn: function(a, b) { return a !== b; },  truth: '00\u21920, 01\u21921, 10\u21921, 11\u21920', transistors: 8, desc: 'Output HIGH when inputs differ. Key for adders. Uses ~8 transistors.' },
          XNOR: { inputs: 2, fn: function(a, b) { return a === b; },  truth: '00\u21921, 01\u21920, 10\u21920, 11\u21921', transistors: 8, desc: 'Output HIGH when inputs match. Used in comparators.' }
        };

        var gate = GATES[gateType];
        var output = gate.inputs === 1 ? gate.fn(inA) : gate.fn(inA, inB);

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var cx = canvasEl.getContext('2d');
          var W = canvasEl.width, H = canvasEl.height;
          cx.clearRect(0, 0, W, H);
          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          var midX = W / 2, midY = H / 2;
          var gateW = 80, gateH = 60;

          // Input wires with signal propagation glow
          cx.lineWidth = 3;
          cx.strokeStyle = inA ? '#34D399' : '#475569';
          if (inA) { cx.shadowColor = '#34D399'; cx.shadowBlur = 6; }
          cx.beginPath();
          cx.moveTo(30, gate.inputs === 1 ? midY : midY - 15);
          cx.lineTo(midX - gateW / 2, gate.inputs === 1 ? midY : midY - 15);
          cx.stroke(); cx.shadowBlur = 0;

          cx.fillStyle = inA ? '#34D399' : '#64748B';
          cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center';
          cx.fillText('A=' + (inA ? '1' : '0'), 18, (gate.inputs === 1 ? midY : midY - 15) - 10);

          if (gate.inputs === 2) {
            cx.strokeStyle = inB ? '#34D399' : '#475569';
            if (inB) { cx.shadowColor = '#34D399'; cx.shadowBlur = 6; }
            cx.beginPath(); cx.moveTo(30, midY + 15); cx.lineTo(midX - gateW / 2, midY + 15); cx.stroke();
            cx.shadowBlur = 0;
            cx.fillStyle = inB ? '#34D399' : '#64748B';
            cx.fillText('B=' + (inB ? '1' : '0'), 18, midY + 15 - 10);
          }

          // Gate body
          cx.fillStyle = '#1E293B'; cx.strokeStyle = '#818CF8'; cx.lineWidth = 2;
          if (gateType === 'NOT') {
            cx.beginPath(); cx.moveTo(midX - gateW / 2, midY - gateH / 2); cx.lineTo(midX + gateW / 2 - 8, midY); cx.lineTo(midX - gateW / 2, midY + gateH / 2); cx.closePath(); cx.fill(); cx.stroke();
            cx.beginPath(); cx.arc(midX + gateW / 2 - 2, midY, 6, 0, Math.PI * 2); cx.fillStyle = output ? '#34D399' : '#1E293B'; cx.fill(); cx.stroke();
          } else if (gateType === 'AND' || gateType === 'NAND') {
            cx.beginPath(); cx.moveTo(midX - gateW / 2, midY - gateH / 2); cx.lineTo(midX, midY - gateH / 2); cx.arc(midX, midY, gateH / 2, -Math.PI / 2, Math.PI / 2); cx.lineTo(midX - gateW / 2, midY + gateH / 2); cx.closePath(); cx.fill(); cx.stroke();
            if (gateType === 'NAND') { cx.beginPath(); cx.arc(midX + gateH / 2 + 6, midY, 6, 0, Math.PI * 2); cx.fillStyle = output ? '#34D399' : '#1E293B'; cx.fill(); cx.stroke(); }
          } else if (gateType === 'OR' || gateType === 'NOR') {
            cx.beginPath(); cx.moveTo(midX - gateW / 2, midY - gateH / 2); cx.quadraticCurveTo(midX + 10, midY - gateH / 2, midX + gateW / 2, midY); cx.quadraticCurveTo(midX + 10, midY + gateH / 2, midX - gateW / 2, midY + gateH / 2); cx.quadraticCurveTo(midX - gateW / 4, midY, midX - gateW / 2, midY - gateH / 2); cx.fill(); cx.stroke();
            if (gateType === 'NOR') { cx.beginPath(); cx.arc(midX + gateW / 2 + 6, midY, 6, 0, Math.PI * 2); cx.fillStyle = output ? '#34D399' : '#1E293B'; cx.fill(); cx.stroke(); }
          } else {
            cx.beginPath(); cx.moveTo(midX - gateW / 2, midY - gateH / 2); cx.quadraticCurveTo(midX + 10, midY - gateH / 2, midX + gateW / 2, midY); cx.quadraticCurveTo(midX + 10, midY + gateH / 2, midX - gateW / 2, midY + gateH / 2); cx.quadraticCurveTo(midX - gateW / 4, midY, midX - gateW / 2, midY - gateH / 2); cx.fill(); cx.stroke();
            cx.beginPath(); cx.strokeStyle = '#818CF8'; cx.moveTo(midX - gateW / 2 - 8, midY - gateH / 2); cx.quadraticCurveTo(midX - gateW / 4 - 8, midY, midX - gateW / 2 - 8, midY + gateH / 2); cx.stroke();
            if (gateType === 'XNOR') { cx.beginPath(); cx.arc(midX + gateW / 2 + 6, midY, 6, 0, Math.PI * 2); cx.fillStyle = output ? '#34D399' : '#1E293B'; cx.fill(); cx.strokeStyle = '#818CF8'; cx.stroke(); }
          }

          // Gate label
          cx.fillStyle = '#E2E8F0'; cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center';
          cx.fillText(gateType, gateType === 'NOT' ? midX - 12 : midX - 5, midY + 4);

          // Output wire with glow
          var outStartX = midX + gateW / 2 + (['NOT', 'NAND', 'NOR', 'XNOR'].indexOf(gateType) >= 0 ? 12 : 0);
          cx.strokeStyle = output ? '#34D399' : '#475569'; cx.lineWidth = 3;
          if (output) { cx.shadowColor = '#34D399'; cx.shadowBlur = 6; }
          cx.beginPath(); cx.moveTo(outStartX, midY); cx.lineTo(W - 30, midY); cx.stroke();
          cx.shadowBlur = 0;

          // Output LED
          cx.fillStyle = output ? '#34D399' : '#EF4444';
          cx.shadowColor = output ? '#34D399' : '#EF4444'; cx.shadowBlur = 10;
          cx.beginPath(); cx.arc(W - 18, midY, 10, 0, Math.PI * 2); cx.fill();
          cx.shadowBlur = 0;
          cx.fillStyle = '#FFF'; cx.font = 'bold 12px sans-serif'; cx.fillText(output ? '1' : '0', W - 18, midY + 4);
          cx.fillStyle = output ? '#34D399' : '#F87171'; cx.font = 'bold 10px sans-serif';
          cx.fillText('Q=' + (output ? '1' : '0'), W - 18, midY - 16);

          // Transistor count label
          cx.fillStyle = '#64748B'; cx.font = '9px sans-serif'; cx.textAlign = 'left';
          cx.fillText(gate.transistors + ' transistors', 10, H - 5);
        };

        React.useEffect(function() {
          var canvas = document.getElementById('semi-gates-canvas');
          if (canvas) canvasRef(canvas);
        }, [d.gateType, d.inputA, d.inputB]);

        // Full truth table grid
        var truthTableGrid = null;
        if (d.showTruthGrid) {
          var rows = gate.inputs === 1
            ? [[false], [true]]
            : [[false, false], [false, true], [true, false], [true, true]];
          truthTableGrid = h('div', { className: 'mt-2 rounded-lg bg-slate-800/60 border border-slate-700 p-2 overflow-x-auto' },
            h('table', { className: 'w-full text-xs' },
              h('caption', { className: 'sr-only' }, 'Data table: A, B, Q'), h('thead', null, h('tr', null,
                h('th', { scope: 'col', className: 'text-left text-slate-600 px-2 py-1' }, 'A'),
                gate.inputs === 2 && h('th', { scope: 'col', className: 'text-left text-slate-600 px-2 py-1' }, 'B'),
                h('th', { scope: 'col', className: 'text-left text-cyan-400 px-2 py-1' }, 'Q')
              )),
              h('tbody', null, rows.map(function(r, ri) {
                var qVal = gate.inputs === 1 ? gate.fn(r[0]) : gate.fn(r[0], r[1]);
                var isActive = gate.inputs === 1 ? (r[0] === inA) : (r[0] === inA && r[1] === inB);
                return h('tr', { key: ri, className: isActive ? 'bg-cyan-900/30' : '' },
                  h('td', { className: 'px-2 py-0.5 font-mono ' + (r[0] ? 'text-emerald-400' : 'text-slate-500') }, r[0] ? '1' : '0'),
                  gate.inputs === 2 && h('td', { className: 'px-2 py-0.5 font-mono ' + (r[1] ? 'text-emerald-400' : 'text-slate-500') }, r[1] ? '1' : '0'),
                  h('td', { className: 'px-2 py-0.5 font-bold font-mono ' + (qVal ? 'text-emerald-400' : 'text-red-400') }, qVal ? '1' : '0')
                );
              }))
            )
          );
        }

        return h('div', null,
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            Object.keys(GATES).map(function(key) {
              return pill(key, gateType === key, function() {
                upd('gateType', key);
                tryAwardXP('gate-' + key, 5, 'Explored ' + key + ' gate');
              });
            })
          ),
          h('canvas', { 'aria-label': 'Semiconductor visualization',
            id: 'semi-gates-canvas', width: 440, height: 180,
            className: 'w-full rounded-lg bg-slate-900 border border-slate-700',
            role: 'img', 'aria-label': gateType + ' gate: A=' + (inA ? 1 : 0) + (gate.inputs === 2 ? ' B=' + (inB ? 1 : 0) : '') + ' Q=' + (output ? 1 : 0)
          }),
          // Input toggles
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-3 mt-3' },
            h('button', Object.assign({
              onClick: function() { upd('inputA', !inA); if (stemBeep) stemBeep(); },
              className: 'flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ' + (inA ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')
            }, a11yClick ? a11yClick(function() { upd('inputA', !inA); }) : {}), 'A = ' + (inA ? '1' : '0')),
            gate.inputs === 2 && h('button', Object.assign({
              onClick: function() { upd('inputB', !inB); if (stemBeep) stemBeep(); },
              className: 'flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ' + (inB ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-700 text-slate-300 hover:bg-slate-600')
            }, a11yClick ? a11yClick(function() { upd('inputB', !inB); }) : {}), 'B = ' + (inB ? '1' : '0')),
            h('div', { className: 'ml-auto px-3 py-2 rounded-lg font-bold text-sm shadow-lg ' + (output ? 'bg-emerald-700 text-white shadow-emerald-500/20' : 'bg-red-600 text-white shadow-red-500/20') },
              'Q = ' + (output ? '1' : '0')
            )
          ),
          h('div', { className: 'flex items-center gap-3 mt-2' },
            h('span', { className: 'text-xs text-slate-600' }, h('span', { className: 'font-bold text-slate-300' }, 'Truth: '), gate.truth),
            pill(d.showTruthGrid ? 'Hide Table' : 'Full Table', d.showTruthGrid, function() { upd('showTruthGrid', !d.showTruthGrid); })
          ),
          truthTableGrid,
          // Stats
          h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
            statBadge('Transistors', String(gate.transistors)),
            statBadge('Type', ['NAND', 'NOR'].indexOf(gateType) >= 0 ? 'Universal' : 'Basic'),
            gradeBand === '9-12' && statBadge('Prop Delay', '~' + (gate.transistors * 0.5).toFixed(1) + ' ns')
          ),
          infoBox(gate.desc),
          gradeBand === '9-12' && infoBox(
            'Modern CPUs contain 10-50+ billion transistors implementing these gates. A64-bit adder chains ~64 full adders, each using ~28 transistors. NAND and NOR are "universal" \u2014 any Boolean function can be built from just one type!', 'amber'
          ),
          h('div', { className: 'flex gap-2 mt-2' },
            btn('\uD83E\uDD16 AI Explain', function() { askAI(gateType + ' logic gate CMOS implementation with transistors'); }, 'bg-indigo-600 text-white hover:bg-indigo-700'),
            btn('\uD83D\uDD0A Read', function() { speakText(gateType + ' gate. Input A is ' + (inA ? '1' : '0') + (gate.inputs === 2 ? ', input B is ' + (inB ? '1' : '0') : '') + '. Output Q is ' + (output ? '1' : '0') + '.'); }, 'bg-slate-600 text-slate-200 hover:bg-slate-500')
          ),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // I-V CURVE PLOTTER (new sub-tool)
      // ════════════════════════════════════════════
      function renderIVCurve() {
        var device = d.ivDevice || 'diode';
        var sweepV = d.ivSweepV || 0;
        var showIdeal = d.ivShowIdeal !== false;
        var ivTemp = d.ivTemp || 300;
        var Vt = 8.617e-5 * ivTemp; // thermal voltage kT/q

        // Current calculation
        function calcCurrent(V) {
          if (device === 'diode') {
            var Is = 1e-12; // reverse saturation
            return Is * (Math.exp(V / (2 * Vt)) - 1);
          } else if (device === 'zener') {
            var Vz = -5.1;
            if (V < Vz) return -0.05 * (Vz - V);
            return 1e-12 * (Math.exp(V / (2 * Vt)) - 1);
          } else if (device === 'led') {
            var Vf = 1.8;
            if (V < Vf * 0.8) return 1e-14 * (Math.exp(V / Vt) - 1);
            return 0.001 * Math.pow(Math.max(0, V - Vf * 0.7), 2.5);
          } else { // resistor
            return V / 1000; // 1k ohm
          }
        }

        var currentI = calcCurrent(sweepV);

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var cx = canvasEl.getContext('2d');
          var W = canvasEl.width, H = canvasEl.height;
          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          var originX = W * 0.35, originY = H * 0.65;
          var scaleX = (W - 40) / 8; // -3V to 5V
          var scaleY = H * 0.5 / 0.05; // current scale

          // Grid
          cx.strokeStyle = '#1E293B'; cx.lineWidth = 0.5;
          for (var gv = -3; gv <= 5; gv++) {
            var gx = originX + gv * scaleX;
            cx.beginPath(); cx.moveTo(gx, 10); cx.lineTo(gx, H - 10); cx.stroke();
            cx.fillStyle = '#475569'; cx.font = '8px sans-serif'; cx.textAlign = 'center';
            cx.fillText(gv + 'V', gx, H - 3);
          }

          // Axes
          cx.strokeStyle = '#64748B'; cx.lineWidth = 1.5;
          cx.beginPath(); cx.moveTo(15, originY); cx.lineTo(W - 5, originY); cx.stroke(); // V axis
          cx.beginPath(); cx.moveTo(originX, 5); cx.lineTo(originX, H - 15); cx.stroke(); // I axis
          cx.fillStyle = '#94A3B8'; cx.font = '10px sans-serif'; cx.textAlign = 'center';
          cx.fillText('V (Volts)', W / 2, H - 12);
          cx.save(); cx.translate(8, H / 2); cx.rotate(-Math.PI / 2);
          cx.fillText('I (mA)', 0, 0); cx.restore();

          // I-V curve
          cx.strokeStyle = '#22D3EE'; cx.lineWidth = 2; cx.beginPath();
          var first = true;
          for (var v = -3; v <= 5; v += 0.05) {
            var i = calcCurrent(v);
            var px = originX + v * scaleX;
            var py = originY - i * scaleY * 1000; // to mA
            py = Math.max(10, Math.min(H - 15, py));
            if (first) { cx.moveTo(px, py); first = false; } else cx.lineTo(px, py);
          }
          cx.stroke();

          // Ideal reference (Ohm's law line)
          if (showIdeal && device !== 'resistor') {
            cx.strokeStyle = 'rgba(148, 163, 184, 0.3)'; cx.lineWidth = 1; cx.setLineDash([4, 4]);
            cx.beginPath();
            cx.moveTo(originX - 3 * scaleX, originY + 3 * scaleY);
            cx.lineTo(originX + 5 * scaleX, originY - 5 * scaleY * 0.005);
            cx.stroke(); cx.setLineDash([]);
            cx.fillStyle = '#475569'; cx.font = '8px sans-serif'; cx.textAlign = 'right';
            cx.fillText('Ohm ref.', W - 10, originY - 5);
          }

          // Current sweep marker
          var markerX = originX + sweepV * scaleX;
          var markerI = calcCurrent(sweepV);
          var markerY = originY - markerI * scaleY * 1000;
          markerY = Math.max(10, Math.min(H - 15, markerY));
          cx.fillStyle = '#F59E0B';
          cx.shadowColor = '#F59E0B'; cx.shadowBlur = 8;
          cx.beginPath(); cx.arc(markerX, markerY, 5, 0, Math.PI * 2); cx.fill();
          cx.shadowBlur = 0;

          // Crosshairs
          cx.strokeStyle = 'rgba(245, 158, 11, 0.3)'; cx.lineWidth = 1; cx.setLineDash([3, 3]);
          cx.beginPath(); cx.moveTo(markerX, originY); cx.lineTo(markerX, markerY); cx.stroke();
          cx.beginPath(); cx.moveTo(originX, markerY); cx.lineTo(markerX, markerY); cx.stroke();
          cx.setLineDash([]);

          // Readout
          cx.fillStyle = '#FCD34D'; cx.font = 'bold 11px sans-serif'; cx.textAlign = 'left';
          var iDisplay = Math.abs(currentI) < 0.001 ? (currentI * 1e6).toFixed(1) + ' \u03BCA' : (currentI * 1000).toFixed(2) + ' mA';
          cx.fillText('V = ' + sweepV.toFixed(2) + 'V', markerX + 8, markerY - 8);
          cx.fillText('I = ' + iDisplay, markerX + 8, markerY + 8);

          // Device icon
          cx.fillStyle = '#94A3B8'; cx.font = '10px sans-serif'; cx.textAlign = 'right';
          cx.fillText(device.charAt(0).toUpperCase() + device.slice(1) + ' @ ' + ivTemp + 'K', W - 10, 15);

          // LED glow for LED device
          if (device === 'led' && sweepV > 1.5) {
            var ledGlow = Math.min(1, (sweepV - 1.5) / 2);
            cx.beginPath(); cx.arc(W - 25, 30, 8, 0, Math.PI * 2);
            cx.fillStyle = 'rgba(251, 191, 36, ' + ledGlow.toFixed(2) + ')';
            cx.shadowColor = '#FBBF24'; cx.shadowBlur = 15 * ledGlow; cx.fill(); cx.shadowBlur = 0;
          }
        };

        React.useEffect(function() {
          var canvas = document.getElementById('semi-iv-canvas');
          if (canvas) canvasRef(canvas);
        }, [d.ivDevice, d.ivSweepV, d.ivShowIdeal, d.ivTemp]);

        var iDisplay = Math.abs(currentI) < 0.001 ? (currentI * 1e6).toFixed(1) + ' \u03BCA' : (currentI * 1000).toFixed(2) + ' mA';

        return h('div', null,
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            pill('Diode', device === 'diode', function() { upd('ivDevice', 'diode'); tryAwardXP('iv-diode', 8, 'Explored diode I-V'); }),
            pill('Zener', device === 'zener', function() { upd('ivDevice', 'zener'); tryAwardXP('iv-zener', 10, 'Explored Zener I-V'); }),
            pill('LED', device === 'led', function() { upd('ivDevice', 'led'); tryAwardXP('iv-led', 10, 'Explored LED I-V'); }),
            pill('Resistor', device === 'resistor', function() { upd('ivDevice', 'resistor'); tryAwardXP('iv-resistor', 5, 'Explored resistor I-V'); })
          ),
          h('canvas', { 'aria-label': 'Semiconductor visualization',
            id: 'semi-iv-canvas', width: 440, height: 260,
            className: 'w-full rounded-lg bg-slate-900 border border-slate-700',
            role: 'img', 'aria-label': 'I-V curve for ' + device + ' at V=' + sweepV.toFixed(2) + 'V, I=' + iDisplay
          }),
          sliderRow('Sweep V', sweepV, -3, 5, 0.05, function(v) { upd('ivSweepV', v); }, ' V'),
          sliderRow('Temp', ivTemp, 200, 500, 10, function(v) { upd('ivTemp', v); }, ' K'),
          h('div', { className: 'flex items-center gap-3 mt-2' },
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showIdeal, onChange: function() { upd('ivShowIdeal', !showIdeal); }, className: 'accent-slate-400' }), 'Ohm Reference'),
            btn('\uD83E\uDD16 AI Explain', function() { askAI('I-V characteristic curve of a ' + device); }, 'bg-indigo-600 text-white hover:bg-indigo-700')
          ),
          // Stats
          h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
            statBadge('Voltage', sweepV.toFixed(2) + ' V'),
            statBadge('Current', iDisplay),
            statBadge('Power', (Math.abs(sweepV * currentI) * 1000).toFixed(2) + ' mW'),
            device === 'resistor' && statBadge('R', '1 k\u03A9')
          ),
          infoBox(gradeText(
            device === 'diode' ? 'A diode is like a one-way door for electricity!' : device === 'led' ? 'An LED makes light when electricity goes through it the right way!' : device === 'zener' ? 'A Zener diode lets electricity go backwards at a certain voltage!' : 'A resistor slows down electricity evenly in both directions.',
            device === 'diode' ? 'Diodes only conduct in one direction. Forward: current grows exponentially past ~0.6V. Reverse: almost no current.' : device === 'led' ? 'LEDs emit light when forward biased (>1.5V). Different colors = different voltage drops.' : device === 'zener' ? 'Zener diodes break down at a specific reverse voltage (5.1V here). Used for voltage regulation.' : 'Resistors follow Ohm\'s Law: V = IR. Linear I-V curve.',
            device === 'diode' ? 'Shockley equation: I = I\u2080(e^(V/nV\u209C) \u2212 1). V\u209C = kT/q = ' + (Vt * 1000).toFixed(1) + 'mV at ' + ivTemp + 'K. n \u2248 1-2 (ideality factor).' : device === 'led' ? 'LED: E\u2097 determines color (\u03BB = hc/E\u2097). Red ~1.8eV, Blue ~2.8eV, UV ~3.4eV. I \u221D V\u00B2 above threshold.' : device === 'zener' ? 'Zener breakdown (E\u2097<5V): quantum tunneling. Avalanche (E\u2097>5V): impact ionization. V\u2093 has negative temp coefficient for Zener, positive for avalanche.' : 'Ohm\'s law: V = IR. R = \u03C1L/A where \u03C1 is resistivity. Power: P = IV = I\u00B2R = V\u00B2/R.',
            device === 'diode' ? 'Shockley: I = I\u2080(e^(qV/nkT) \u2212 1). I\u2080 = qAn\u1D62\u00B2(D\u2099/L\u2099N\u2090 + D\u209A/L\u209AN\u2093). At ' + ivTemp + 'K: V\u209C = ' + (Vt * 1000).toFixed(2) + 'mV. Small-signal: r\u2093 = nV\u209C/I\u2093, C\u2093 = \u03C4\u2093\u00B7g\u2093.' : device === 'led' ? 'LED internal quantum efficiency \u03B7\u1D62 = B\u00B7n/(A + B\u00B7n + C\u00B7n\u00B2). Wall-plug efficiency = P\u2092\u209A\u209C/P\u2091\u2097\u2091\u209C. Spectral emission: \u0394\u03BB \u2248 1.8kT\u03BB\u00B2/hc.' : device === 'zener' ? 'Zener: V\u2093(T) = V\u2093\u2080 + \u03B1\u209C\u00B7(T\u2212T\u2080). \u03B1\u209C < 0 for V\u2093<5V (tunneling), \u03B1\u209C > 0 for V\u2093>5V (avalanche). Dynamic impedance: Z\u2093 = \u0394V\u2093/\u0394I\u2093.' : 'Ohm: J = \u03C3E. \u03C3 = nq\u03BC. Temperature: R(T) = R\u2080(1+\u03B1\u0394T). Noise: V\u2099 = \u221A(4kTRB).'
          )),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // CIRCUIT SANDBOX (new sub-tool)
      // ════════════════════════════════════════════
      function renderCircuitSandbox() {
        var components = d.circuitComponents || [];
        var supplyV = d.circuitVoltage || 5;
        var simResult = d.circuitSimResult;

        var COMP_PALETTE = [
          { type: 'resistor', icon: '\u2237', label: 'Resistor', value: '1k\u03A9' },
          { type: 'diode', icon: '\u25B7|', label: 'Diode', value: 'Si' },
          { type: 'led', icon: '\uD83D\uDCA1', label: 'LED', value: 'Red' },
          { type: 'capacitor', icon: '\u2225', label: 'Capacitor', value: '100\u03BCF' },
          { type: 'nmos', icon: '\uD83D\uDD0C', label: 'NMOS FET', value: 'N-ch' },
          { type: 'pmos', icon: '\uD83D\uDD0C', label: 'PMOS FET', value: 'P-ch' }
        ];

        function addComponent(type) {
          var comp = COMP_PALETTE.find(function(c) { return c.type === type; });
          if (!comp) return;
          var newComp = {
            id: 'c' + Date.now(),
            type: type,
            label: comp.label,
            value: comp.value,
            x: 50 + components.length * 60,
            y: 100
          };
          upd('circuitComponents', components.concat([newComp]));
          tryAwardXP('circ-' + type, 5, 'Added ' + comp.label + ' to circuit');
          if (announceToSR) announceToSR('Added ' + comp.label + ' to circuit');
        }

        function removeComponent(id) {
          upd('circuitComponents', components.filter(function(c) { return c.id !== id; }));
        }

        function simulateCircuit() {
          if (components.length === 0) {
            upd('circuitSimResult', { error: 'Add components first!' });
            return;
          }
          // Simple behavioral simulation
          var resistors = components.filter(function(c) { return c.type === 'resistor'; });
          var diodes = components.filter(function(c) { return c.type === 'diode' || c.type === 'led'; });
          var totalR = resistors.length > 0 ? resistors.length * 1000 : 1000;
          var diodeDrop = diodes.length * 0.7;
          var effectiveV = Math.max(0, supplyV - diodeDrop);
          var current = effectiveV / totalR;
          var power = effectiveV * current;
          var ledOn = diodes.some(function(c) { return c.type === 'led'; }) && effectiveV > 0;

          upd('circuitSimResult', {
            voltage: effectiveV.toFixed(2),
            current: (current * 1000).toFixed(2),
            power: (power * 1000).toFixed(2),
            diodeDrop: diodeDrop.toFixed(1),
            ledOn: ledOn,
            resistors: resistors.length,
            diodes: diodes.length
          });
          tryAwardXP('circ-sim', 15, 'Simulated a circuit');
          if (announceToSR) announceToSR('Simulation complete. Current: ' + (current * 1000).toFixed(2) + ' milliamps.');
        }

        return h('div', null,
          h('div', { className: 'text-xs text-slate-600 mb-2' }, 'Build a circuit from components. Add parts, then simulate!'),
          // Palette
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            COMP_PALETTE.map(function(comp) {
              return btn(comp.icon + ' ' + comp.label, function() { addComponent(comp.type); }, 'bg-slate-700 text-slate-200 hover:bg-slate-600');
            })
          ),
          // Circuit board
          h('div', { className: 'rounded-lg bg-slate-900 border border-slate-700 p-3 min-h-[120px] mb-3' },
            components.length === 0
              ? h('div', { className: 'text-center text-slate-600 py-8' }, 'Click components above to add them')
              : h('div', { className: 'flex flex-wrap gap-2' },
                  // Supply
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-col items-center px-2 py-1 rounded bg-red-900/30 border border-red-700' },
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-lg' }, '\u26A1'),
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[11px] text-red-400' }, supplyV + 'V')
                  ),
                  // Wire
                  h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'self-center text-slate-600' }, '\u2014'),
                  // Components
                  components.map(function(comp, ci) {
                    var compInfo = COMP_PALETTE.find(function(p) { return p.type === comp.type; }) || {};
                    return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: comp.id, className: 'flex flex-col items-center px-2 py-1 rounded bg-slate-800 border border-slate-600 relative group' },
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-lg' }, compInfo.icon || '?'),
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[11px] text-slate-600' }, comp.value),
                      h('button', {
                        onClick: function() { removeComponent(comp.id); },
                        className: 'absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[11px] rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center',
                        'aria-label': 'Remove ' + comp.label
                      }, '\u2715'),
                      ci < components.length - 1 ? null : null
                    );
                  }),
                  // Wire to ground
                  h('span', { className: 'self-center text-slate-600' }, '\u2014'),
                  h('div', { className: 'flex flex-col items-center px-2 py-1 rounded bg-slate-800 border border-slate-600' },
                    h('span', { className: 'text-lg' }, '\u23DA'),
                    h('span', { className: 'text-[11px] text-slate-600' }, 'GND')
                  )
                )
          ),
          // Controls
          h('div', { className: 'flex items-center gap-3 mb-3' },
            sliderRow('Supply', supplyV, 0, 12, 0.5, function(v) { upd('circuitVoltage', v); }, ' V'),
            btn('\u25B6 Simulate', simulateCircuit, 'bg-emerald-700 text-white hover:bg-emerald-700'),
            btn('\uD83D\uDDD1 Clear', function() { updMulti({ circuitComponents: [], circuitSimResult: null }); }, 'bg-red-600/80 text-white hover:bg-red-700')
          ),
          // Simulation results
          simResult && (simResult.error
            ? infoBox(simResult.error, 'red')
            : h('div', { className: 'rounded-lg bg-emerald-900/20 border border-emerald-700 p-3' },
                h('div', { className: 'text-xs font-bold text-emerald-400 mb-2' }, '\u2713 Simulation Results'),
                h('div', { className: 'flex flex-wrap gap-2' },
                  statBadge('V\u2092\u1D64\u209C', simResult.voltage + ' V', 'text-cyan-400'),
                  statBadge('Current', simResult.current + ' mA', 'text-emerald-400'),
                  statBadge('Power', simResult.power + ' mW', 'text-amber-400'),
                  simResult.diodeDrop > 0 && statBadge('V\u2093\u1D62\u2092\u2093\u2091', simResult.diodeDrop + ' V', 'text-red-400'),
                  simResult.ledOn && statBadge('LED', '\u2728 ON', 'text-yellow-400')
                )
              )
          ),
          infoBox(gradeText(
            'Build a circuit like building with LEGO blocks! Add parts and see what happens.',
            'Connect resistors, diodes, and LEDs in series. The simulator calculates current using V = IR.',
            'Series circuit: V\u209B\u1D64\u209A\u209A\u2097\u2098 = V\u1D63\u2091\u209B + V\u2093\u1D62\u2092\u2093\u2091 + V\u2097\u2091\u2093. KVL: sum of voltages around a loop = 0.',
            'KVL: \u2211V = 0. KCL: \u2211I\u1D62\u2099 = \u2211I\u2092\u1D64\u209C. For each diode: I = I\u2080(e^(V/nV\u209C)\u22121). Load line analysis: V\u2093\u2093 = V\u2093 + I\u2093R\u2093.'
          )),
          btn('\uD83E\uDD16 AI: Analyze my circuit', function() {
            var desc = components.map(function(c) { return c.label; }).join(', ');
            askAI('circuit analysis with ' + desc + ' at ' + supplyV + 'V supply');
          }, 'mt-2 bg-indigo-600 text-white hover:bg-indigo-700'),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // WAFER FABRICATION SIMULATOR (guided multi-step)
      // ════════════════════════════════════════════
      function renderWaferFab() {
        var stage = d.fabStage || 0;
        var guided = d.fabGuided !== false;
        var fabTemp = d.fabTemp || 1000;
        var fabTime = d.fabTime || 30;

        var FAB_STAGES = [
          { id: 'ingot',    name: 'Crystal Growth',   icon: '\uD83E\uDDCA', color: '#6366F1',
            desc: 'A silicon ingot is pulled from molten silicon using the Czochralski method at ~1414\u00B0C.',
            detail: gradeText('Melted sand becomes a shiny crystal stick!', 'Molten silicon is slowly pulled upward to form a single crystal cylinder called an ingot.', 'Czochralski process: seed crystal rotated and pulled from 1414\u00B0C melt. Growth rate ~1mm/min. Boule diameter up to 300mm.', 'Czochralski: \u03C9\u209B\u2091\u2091\u2093 ~10-30 rpm, pull rate ~1mm/min. Dopant segregation coefficient k\u2091\u2092 determines initial resistivity. Float-zone for ultra-high purity.') },
          { id: 'wafer',    name: 'Wafer Slicing',    icon: '\uD83D\uDD2A', color: '#8B5CF6',
            desc: 'The ingot is sliced into thin wafers (~775\u03BCm thick) using diamond wire saws.',
            detail: gradeText('The crystal stick is cut into thin circles like slicing a cucumber!', 'Diamond wire saws cut the ingot into round wafers. Each wafer is polished mirror-smooth on one side.', 'Inner-diameter or wire saw slicing. CMP (Chemical-Mechanical Polishing) achieves <0.5nm RMS roughness. Wafer flats/notches indicate crystal orientation.', 'Wire saw: ~160\u03BCm kerf loss. Double-side polishing to TTV < 2\u03BCm. Edge profiling prevents chipping. Crystal orientation <100> for CMOS.') },
          { id: 'oxidation', name: 'Thermal Oxidation', icon: '\uD83D\uDD25', color: '#F59E0B',
            desc: 'A thin layer of SiO\u2082 is grown on the wafer surface at ~1000\u00B0C in an oxygen furnace.',
            detail: gradeText('The wafer gets a glass coat by baking it really hot!', 'Heating silicon in oxygen grows a thin glass (SiO\u2082) layer. This insulating layer protects the silicon underneath.', 'Dry oxidation: Si + O\u2082 \u2192 SiO\u2082 (thin, high quality). Wet: Si + 2H\u2082O \u2192 SiO\u2082 + 2H\u2082 (faster, thicker). Deal-Grove model: x\u2092\u00B2 + Ax\u2092 = B(t+\u03C4).', 'Deal-Grove: x\u2092\u00B2 + Ax\u2092 = B(t+\u03C4). B = parabolic rate (diffusion-limited). B/A = linear rate (reaction-limited). Activation energy ~1.2eV (dry), ~0.7eV (wet). Chlorine added for Na\u207A gettering.') },
          { id: 'photolith', name: 'Photolithography',  icon: '\uD83D\uDCF7', color: '#EC4899',
            desc: 'UV light transfers circuit patterns from a mask onto photoresist-coated wafers.',
            detail: gradeText('A special camera prints tiny circuit patterns onto the wafer using light!', 'Photoresist is spread on the wafer, UV light shines through a stencil (mask) to print the pattern, then chemicals wash away the exposed areas.', 'Spin-coat photoresist \u2192 soft bake \u2192 UV exposure through mask \u2192 develop. Resolution \u221D \u03BB/(2\u00B7NA). DUV (193nm) and EUV (13.5nm) for modern nodes.', 'Rayleigh: CD = k\u2081\u03BB/NA, DoF = k\u2082\u03BB/NA\u00B2. Immersion (n=1.44): effective NA > 1. EUV (13.5nm): reflective optics, tin droplet plasma source. OPC + SRAF for sub-wavelength features. Multi-patterning: SADP/SAQP.') },
          { id: 'etch',      name: 'Etching',           icon: '\u2702\uFE0F', color: '#EF4444',
            desc: 'Unwanted material is removed by chemical (wet) or plasma (dry) etching.',
            detail: gradeText('Chemicals eat away the parts we don\'t want, like carving a sculpture!', 'Etching removes the unprotected areas. Wet etching uses chemicals; dry etching uses plasma gas to be more precise.', 'Wet etch: isotropic, high selectivity. Dry (RIE): anisotropic, directional plasma ions. Etch rate, selectivity, and anisotropy are key metrics.', 'RIE: Cl\u2082/HBr for Si, CF\u2084/CHF\u2083 for SiO\u2082. ICP for high-density plasma. Aspect-ratio dependent etching (ARDE). Notching at insulator interfaces. Etch stop layers (SiGe, SiN).') },
          { id: 'doping',    name: 'Ion Implantation',  icon: '\u2622\uFE0F', color: '#10B981',
            desc: 'Dopant atoms are shot into the silicon at high energy to change its electrical properties.',
            detail: gradeText('Special atoms are shot into the wafer like tiny bullets to give it superpowers!', 'An ion beam accelerates dopant atoms (like boron or phosphorus) into the silicon. This controls where the wafer conducts electricity.', 'Ion implant: 10-400 keV, dose 10\u00B9\u00B2-10\u00B9\u2076 cm\u207B\u00B2. Gaussian profile: R\u209A (projected range), \u0394R\u209A (straggle). Followed by annealing to activate dopants and repair lattice damage.', 'LSS theory: R\u209A = \u222B\u2080\u1D49(dE/dx)\u207B\u00B9dE. Nuclear + electronic stopping. Channeling along <110>. Rapid thermal annealing (RTA): 1000-1100\u00B0C, 1-10s. Transient enhanced diffusion (TED) from interstitials.') },
          { id: 'deposit',   name: 'Thin Film Deposition', icon: '\uD83C\uDF2B\uFE0F', color: '#06B6D4',
            desc: 'Metal and insulator layers are deposited by CVD, PVD, or ALD techniques.',
            detail: gradeText('Thin coats of metal and glass are sprayed onto the wafer like paint!', 'Chemical vapor deposition (CVD) grows thin films from gas. Physical vapor deposition (PVD/sputtering) shoots metal atoms at the wafer. These create the circuit wires.', 'CVD: SiH\u2084 \u2192 Si + 2H\u2082 (poly-Si), TEOS for SiO\u2082. PVD/Sputtering: Al, Cu, Ti, TaN targets. ALD: atomic layer precision for high-k (HfO\u2082) gate dielectrics.', 'PECVD: lower temp (300-400\u00B0C) using plasma assist. ALD: self-limiting surface reactions, ~1\u00C5/cycle. Cu damascene: deposit barrier (TaN/Ta) \u2192 Cu seed \u2192 electroplate \u2192 CMP. Cobalt replacing Cu at <10nm for via resistance.') },
          { id: 'metal',     name: 'Metallization & CMP', icon: '\u2699\uFE0F', color: '#D97706',
            desc: 'Metal interconnects are patterned and polished flat. Multiple layers build up the circuit wiring.',
            detail: gradeText('Metal wires connect all the tiny switches together, and then we polish it smooth!', 'Copper wires are plated into trenches, then polished perfectly flat. This process repeats for 10+ metal layers to connect all transistors.', 'Dual damascene: trench + via etch \u2192 barrier (TaN) \u2192 Cu seed \u2192 electroplate \u2192 CMP. Preston equation: RR = K\u209A\u00B7P\u00B7V. Modern chips: 10-15 metal layers (BEOL).', 'Cu resistivity increases at <28nm due to electron scattering at grain boundaries and interfaces. R = \u03C1L/A + 2\u03C1\u2097/t. Ruthenium and cobalt for narrow vias. Air gaps for low-k ILD (\u03BA < 2.5). BEOL thermal budget < 400\u00B0C.') }
        ];

        var currentStage = FAB_STAGES[stage % FAB_STAGES.length];

        // Canvas: wafer cross-section that builds up layers
        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var cx = canvasEl.getContext('2d');
          var W = canvasEl.width, H = canvasEl.height;
          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          var waferY = H * 0.55, waferH = 40;
          var layerH = 8;

          // Silicon substrate (always present)
          var subGrad = cx.createLinearGradient(0, waferY, 0, waferY + waferH);
          subGrad.addColorStop(0, '#4338CA'); subGrad.addColorStop(1, '#312E81');
          cx.fillStyle = subGrad;
          cx.fillRect(40, waferY, W - 80, waferH);
          cx.fillStyle = '#C7D2FE'; cx.font = '9px sans-serif'; cx.textAlign = 'center';
          cx.fillText('Si Substrate', W / 2, waferY + waferH / 2 + 3);

          // Build up layers based on stage progress
          var layers = [];
          if (stage >= 2) layers.push({ name: 'SiO\u2082', color: '#94A3B8', h: layerH });
          if (stage >= 3) layers.push({ name: 'Photoresist', color: '#EC4899', h: layerH * 0.6, pattern: true });
          if (stage >= 5) layers.push({ name: 'Doped region', color: '#10B981', h: layerH * 0.8, inside: true });
          if (stage >= 6) layers.push({ name: 'Poly-Si / Metal', color: '#F59E0B', h: layerH });
          if (stage >= 7) layers.push({ name: 'Cu Interconnect', color: '#D97706', h: layerH });

          var yOff = waferY;
          layers.forEach(function(layer) {
            if (layer.inside) {
              // Doped region inside substrate
              cx.fillStyle = layer.color;
              cx.globalAlpha = 0.4;
              cx.fillRect(100, waferY + 5, 80, waferH - 10);
              cx.fillRect(W - 180, waferY + 5, 80, waferH - 10);
              cx.globalAlpha = 1;
            } else {
              yOff -= layer.h;
              cx.fillStyle = layer.color;
              if (layer.pattern) {
                // Patterned photoresist with gaps
                cx.fillRect(40, yOff, 80, layer.h);
                cx.fillRect(W / 2 - 30, yOff, 60, layer.h);
                cx.fillRect(W - 120, yOff, 80, layer.h);
              } else {
                cx.fillRect(40, yOff, W - 80, layer.h);
              }
              cx.fillStyle = '#FFF'; cx.font = '7px sans-serif'; cx.textAlign = 'left';
              cx.fillText(layer.name, 45, yOff + layer.h - 1);
            }
          });

          // Animated particles for current stage
          var tick = Date.now();
          if (stage === 0) {
            // Crystal pulling — rotating seed
            for (var cp = 0; cp < 5; cp++) {
              var angle = (tick / 500 + cp * 1.2) % (Math.PI * 2);
              cx.fillStyle = '#818CF8';
              cx.beginPath(); cx.arc(W / 2 + Math.cos(angle) * 30, H * 0.3 + Math.sin(angle) * 10, 3, 0, Math.PI * 2); cx.fill();
            }
            cx.fillStyle = '#A78BFA'; cx.font = 'bold 10px sans-serif'; cx.textAlign = 'center';
            cx.fillText('\uD83E\uDDCA Pulling crystal...', W / 2, H * 0.2);
          } else if (stage === 2) {
            // Oxidation — oxygen particles
            for (var ox = 0; ox < 8; ox++) {
              var oxY = waferY - 20 - ((tick / 30 + ox * 40) % 60);
              cx.fillStyle = '#FBBF24'; cx.globalAlpha = 0.6;
              cx.beginPath(); cx.arc(80 + ox * (W - 160) / 7, oxY, 2, 0, Math.PI * 2); cx.fill();
            }
            cx.globalAlpha = 1;
          } else if (stage === 3) {
            // UV photons
            for (var uv = 0; uv < 6; uv++) {
              var uvY = 20 + ((tick / 20 + uv * 30) % (waferY - 30));
              cx.strokeStyle = '#A855F7'; cx.lineWidth = 1; cx.globalAlpha = 0.5;
              cx.beginPath(); cx.moveTo(80 + uv * (W - 160) / 5, uvY); cx.lineTo(80 + uv * (W - 160) / 5, uvY + 8); cx.stroke();
            }
            cx.globalAlpha = 1;
          } else if (stage === 5) {
            // Ion implantation — fast particles
            for (var ion = 0; ion < 10; ion++) {
              var ionY = 10 + ((tick / 15 + ion * 25) % (waferY - 10));
              var ionX = 100 + (ion % 3) * (W - 200) / 2.5;
              cx.fillStyle = '#34D399';
              cx.beginPath(); cx.arc(ionX + Math.sin(ion) * 5, ionY, 2, 0, Math.PI * 2); cx.fill();
            }
          }

          // Stage label
          cx.fillStyle = currentStage.color; cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center';
          cx.fillText(currentStage.icon + ' Stage ' + (stage + 1) + ': ' + currentStage.name, W / 2, 15);

          // Progress bar
          cx.fillStyle = '#1E293B'; cx.fillRect(40, H - 18, W - 80, 8);
          cx.fillStyle = currentStage.color;
          cx.fillRect(40, H - 18, (W - 80) * ((stage + 1) / FAB_STAGES.length), 8);
          cx.fillStyle = '#94A3B8'; cx.font = '7px sans-serif';
          cx.fillText((stage + 1) + '/' + FAB_STAGES.length, W / 2, H - 4);
        };

        var animRef = React.useRef(null);
        React.useEffect(function() {
          var canvas = document.getElementById('semi-fab-canvas');
          if (!canvas) return;
          function draw() { canvasRef(canvas); animRef.current = requestAnimationFrame(draw); }
          draw();
          return function() { cancelAnimationFrame(animRef.current); };
        }, [d.fabStage]);

        return h('div', null,
          h('canvas', { 'aria-label': 'Semiconductor visualization',
            id: 'semi-fab-canvas', width: 440, height: 240,
            className: 'w-full rounded-lg bg-slate-900 border border-slate-700',
            role: 'img', 'aria-label': 'Wafer fabrication stage ' + (stage + 1) + ': ' + currentStage.name
          }),
          // Stage navigation
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2 mt-3' },
            btn('\u2190 Prev', function() { if (stage > 0) upd('fabStage', stage - 1); }, 'bg-slate-700 text-slate-300 hover:bg-slate-600' + (stage === 0 ? ' opacity-40' : '')),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex-1 flex gap-1 justify-center' },
              FAB_STAGES.map(function(fs, i) {
                return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
                  key: i,
                  onClick: function() { upd('fabStage', i); },
                  className: 'w-6 h-6 rounded-full flex items-center justify-center text-[11px] cursor-pointer transition-all ' +
                    (i === stage ? 'ring-2 ring-offset-1 ring-offset-slate-900' : '') + ' ' +
                    (i <= stage ? 'bg-opacity-100' : 'bg-opacity-30'),
                  style: { backgroundColor: fs.color + (i <= stage ? '' : '40') },
                  title: fs.name
                }, fs.icon);
              })
            ),
            btn('Next \u2192', function() {
              if (stage < FAB_STAGES.length - 1) {
                upd('fabStage', stage + 1);
                tryAwardXP('fab-' + stage, 10, 'Completed fab stage: ' + currentStage.name);
              } else {
                tryAwardXP('fab-complete', 50, 'Completed full wafer fabrication!');
                addToast('\uD83C\uDFC6 Fabrication Complete!', 'success');
              }
              if (announceToSR) announceToSR('Advanced to stage ' + (stage + 2));
            }, 'bg-cyan-600 text-white hover:bg-cyan-700')
          ),
          // Stage info card
          h('div', { className: 'mt-3 p-3 rounded-xl border', style: { borderColor: currentStage.color + '60', backgroundColor: currentStage.color + '10' } },
            h('div', { className: 'flex items-center gap-2 mb-1' },
              h('span', { className: 'text-lg' }, currentStage.icon),
              h('span', { className: 'text-sm font-bold text-white' }, currentStage.name)
            ),
            h('p', { className: 'text-xs text-slate-300 mb-2' }, currentStage.desc),
            h('p', { className: 'text-xs text-slate-600 leading-relaxed' }, currentStage.detail)
          ),
          // Process parameters (6-8+)
          (gradeBand === '6-8' || gradeBand === '9-12') && (stage === 2 || stage === 5) && h('div', { className: 'mt-2' },
            stage === 2 && sliderRow('Temperature', fabTemp, 800, 1200, 50, function(v) { upd('fabTemp', v); }, '\u00B0C'),
            stage === 5 && sliderRow('Implant time', fabTime, 10, 120, 5, function(v) { upd('fabTime', v); }, ' min')
          ),
          h('div', { className: 'flex gap-2 mt-2' },
            btn('\uD83E\uDD16 AI Explain', function() { askAI(currentStage.name + ' step in semiconductor wafer fabrication'); }, 'bg-indigo-600 text-white hover:bg-indigo-700'),
            btn('\uD83D\uDD0A Read', function() { speakText('Stage ' + (stage + 1) + ': ' + currentStage.name + '. ' + currentStage.desc); }, 'bg-slate-600 text-slate-200 hover:bg-slate-500')
          ),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // LED SPECTRUM LAB
      // ════════════════════════════════════════════
      function renderLedSpectrum() {
        var LED_MATERIALS = {
          'infrared':  { name: 'GaAs (Infrared)',   wavelength: 940, bandGap: 1.32, color: '#7F1D1D', rgb: [80,0,0] },
          'red-gaas':  { name: 'AlGaAs (Red)',      wavelength: 660, bandGap: 1.88, color: '#EF4444', rgb: [255,0,0] },
          'red-gan':   { name: 'GaAsP (Red)',       wavelength: 630, bandGap: 1.97, color: '#F87171', rgb: [255,30,0] },
          'orange':    { name: 'GaAsP (Orange)',    wavelength: 605, bandGap: 2.05, color: '#F97316', rgb: [255,140,0] },
          'yellow':    { name: 'GaP:N (Yellow)',    wavelength: 585, bandGap: 2.12, color: '#EAB308', rgb: [255,230,0] },
          'green':     { name: 'InGaN (Green)',     wavelength: 525, bandGap: 2.36, color: '#22C55E', rgb: [0,255,0] },
          'blue':      { name: 'InGaN (Blue)',      wavelength: 470, bandGap: 2.64, color: '#3B82F6', rgb: [0,100,255] },
          'uv':        { name: 'AlGaN (UV)',        wavelength: 365, bandGap: 3.40, color: '#7C3AED', rgb: [120,0,255] },
          'white':     { name: 'Blue InGaN + Phosphor', wavelength: 460, bandGap: 2.70, color: '#FAFAFA', rgb: [255,255,230] }
        };

        var mat = LED_MATERIALS[d.ledMaterial] || LED_MATERIALS['red-gan'];
        var current = d.ledCurrent || 20;
        var mixMode = !!d.ledMixMode;

        // Photon energy
        var photonE = 1240 / mat.wavelength; // eV from nm

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var cx = canvasEl.getContext('2d');
          var W = canvasEl.width, H = canvasEl.height;
          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          if (mixMode) {
            // RGB mixing mode
            var r = d.ledMixR || 0, g = d.ledMixG || 0, b = d.ledMixB || 0;
            var mixColor = 'rgb(' + r + ',' + g + ',' + b + ')';
            // Three LED circles
            cx.globalAlpha = 0.7;
            cx.fillStyle = 'rgb(' + r + ',0,0)';
            cx.beginPath(); cx.arc(W / 2 - 40, H / 2 - 15, 50, 0, Math.PI * 2); cx.fill();
            cx.fillStyle = 'rgb(0,' + g + ',0)';
            cx.beginPath(); cx.arc(W / 2 + 40, H / 2 - 15, 50, 0, Math.PI * 2); cx.fill();
            cx.fillStyle = 'rgb(0,0,' + b + ')';
            cx.beginPath(); cx.arc(W / 2, H / 2 + 30, 50, 0, Math.PI * 2); cx.fill();
            cx.globalAlpha = 1;
            // Mixed result
            cx.fillStyle = mixColor;
            cx.shadowColor = mixColor; cx.shadowBlur = 20;
            cx.beginPath(); cx.arc(W / 2, H / 2, 25, 0, Math.PI * 2); cx.fill();
            cx.shadowBlur = 0;
            cx.fillStyle = '#FFF'; cx.font = 'bold 11px sans-serif'; cx.textAlign = 'center';
            cx.fillText('RGB(' + r + ',' + g + ',' + b + ')', W / 2, H - 10);
          } else {
            // Single LED mode
            // Spectrum bar
            var specY = H - 35;
            var specGrad = cx.createLinearGradient(30, 0, W - 30, 0);
            specGrad.addColorStop(0, '#7C3AED'); specGrad.addColorStop(0.15, '#3B82F6');
            specGrad.addColorStop(0.3, '#06B6D4'); specGrad.addColorStop(0.45, '#22C55E');
            specGrad.addColorStop(0.6, '#EAB308'); specGrad.addColorStop(0.75, '#F97316');
            specGrad.addColorStop(0.9, '#EF4444'); specGrad.addColorStop(1, '#7F1D1D');
            cx.fillStyle = specGrad;
            cx.fillRect(30, specY, W - 60, 15);
            cx.strokeStyle = '#475569'; cx.lineWidth = 1; cx.strokeRect(30, specY, W - 60, 15);
            // Wavelength labels
            cx.fillStyle = '#94A3B8'; cx.font = '7px sans-serif'; cx.textAlign = 'center';
            var nmLabels = [380, 450, 500, 550, 600, 650, 700, 780];
            nmLabels.forEach(function(nm) {
              var frac = (nm - 350) / 450;
              cx.fillText(nm + 'nm', 30 + frac * (W - 60), specY + 25);
            });
            // Marker for current LED
            var markerFrac = (mat.wavelength - 350) / 450;
            var markerX = 30 + markerFrac * (W - 60);
            cx.fillStyle = '#FFF';
            cx.beginPath(); cx.moveTo(markerX - 4, specY); cx.lineTo(markerX, specY - 6); cx.lineTo(markerX + 4, specY); cx.fill();
            cx.font = 'bold 9px sans-serif'; cx.fillText(mat.wavelength + 'nm', markerX, specY - 10);

            // LED glow
            var brightness = Math.min(1, current / 30);
            cx.beginPath(); cx.arc(W / 2, H * 0.35, 35, 0, Math.PI * 2);
            cx.fillStyle = mat.color; cx.shadowColor = mat.color; cx.shadowBlur = 40 * brightness;
            cx.globalAlpha = 0.3 + brightness * 0.7; cx.fill();
            cx.globalAlpha = 1; cx.shadowBlur = 0;

            // Inner LED
            cx.beginPath(); cx.arc(W / 2, H * 0.35, 12, 0, Math.PI * 2);
            cx.fillStyle = mat.color; cx.fill();
            cx.strokeStyle = '#FFF'; cx.lineWidth = 1; cx.stroke();

            // Photon emission particles
            var tick = Date.now();
            cx.fillStyle = mat.color; cx.globalAlpha = 0.6;
            for (var ph = 0; ph < Math.floor(brightness * 8); ph++) {
              var phAngle = (tick / 600 + ph * 0.8) % (Math.PI * 2);
              var phR = 20 + ((tick / 200 + ph * 100) % 50);
              cx.beginPath();
              cx.arc(W / 2 + Math.cos(phAngle) * phR, H * 0.35 + Math.sin(phAngle) * phR, 2, 0, Math.PI * 2);
              cx.fill();
            }
            cx.globalAlpha = 1;

            // Labels
            cx.fillStyle = '#E2E8F0'; cx.font = '10px sans-serif'; cx.textAlign = 'left';
            cx.fillText('E = ' + photonE.toFixed(2) + ' eV', 10, 20);
            cx.fillText('\u03BB = ' + mat.wavelength + ' nm', 10, 35);
            cx.fillText('E\u2097 = ' + mat.bandGap + ' eV', 10, 50);
            cx.fillText('I = ' + current + ' mA', 10, 65);
          }
        };

        var animRef = React.useRef(null);
        React.useEffect(function() {
          var canvas = document.getElementById('semi-led-canvas');
          if (!canvas) return;
          function draw() { canvasRef(canvas); animRef.current = requestAnimationFrame(draw); }
          draw();
          return function() { cancelAnimationFrame(animRef.current); };
        }, [d.ledMaterial, d.ledCurrent, d.ledMixMode, d.ledMixR, d.ledMixG, d.ledMixB]);

        return h('div', null,
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2 mb-3' },
            pill('\uD83D\uDCA1 Single LED', !mixMode, function() { upd('ledMixMode', false); }),
            pill('\uD83C\uDFA8 RGB Mixer', mixMode, function() { upd('ledMixMode', true); tryAwardXP('led-mix', 10, 'Explored RGB color mixing'); })
          ),
          !mixMode && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1.5 mb-3' },
            Object.keys(LED_MATERIALS).map(function(key) {
              var m = LED_MATERIALS[key];
              return h('button', Object.assign({
                key: key,
                onClick: function() { upd('ledMaterial', key); tryAwardXP('led-' + key, 5, 'Explored ' + m.name + ' LED'); },
                className: 'px-2 py-1 text-[11px] font-semibold rounded-full transition-all ' +
                  (d.ledMaterial === key ? 'ring-2 ring-white shadow-lg' : 'opacity-70 hover:opacity-100'),
                style: { backgroundColor: m.color, color: key === 'white' || key === 'yellow' ? '#000' : '#FFF' }
              }, a11yClick ? a11yClick(function() { upd('ledMaterial', key); }) : {}), m.name.split(' ')[0]);
            })
          ),
          h('canvas', { 'aria-label': 'Semiconductor visualization',
            id: 'semi-led-canvas', width: 440, height: 220,
            className: 'w-full rounded-lg bg-slate-900 border border-slate-700',
            role: 'img', 'aria-label': mixMode ? 'RGB color mixing' : mat.name + ' LED at ' + mat.wavelength + 'nm'
          }),
          !mixMode && sliderRow('Current', current, 1, 50, 1, function(v) { upd('ledCurrent', v); }, ' mA'),
          mixMode && h('div', null,
            sliderRow('Red', d.ledMixR || 0, 0, 255, 1, function(v) { upd('ledMixR', v); }),
            sliderRow('Green', d.ledMixG || 0, 0, 255, 1, function(v) { upd('ledMixG', v); }),
            sliderRow('Blue', d.ledMixB || 0, 0, 255, 1, function(v) { upd('ledMixB', v); })
          ),
          !mixMode && h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
            statBadge('Wavelength', mat.wavelength + ' nm'),
            statBadge('Energy', photonE.toFixed(2) + ' eV'),
            statBadge('Band Gap', mat.bandGap + ' eV'),
            statBadge('Material', mat.name.split('(')[0].trim())
          ),
          infoBox(gradeText(
            'LEDs make light when electricity flows through them! Different materials make different colors.',
            'LEDs emit light when electrons jump across the band gap. The color depends on the band gap energy: bigger gap = shorter wavelength = bluer light.',
            'LED emission: \u03BB = hc/E\u2097 = 1240/E\u2097(eV) nm. Efficiency = photons out / electrons in (\u03B7\u2091\u2093\u209C \u00D7 \u03B7\u1D62\u2099\u209C). InGaN covers blue\u2192green, AlGaInP covers red\u2192yellow.',
            'Spectral width: \u0394\u03BB \u2248 1.8kT\u03BB\u00B2\u209A/hc. Internal quantum efficiency: \u03B7\u1D62 = B\u00B7n/(A + B\u00B7n + C\u00B7n\u00B2) where A=SRH, B=radiative, C=Auger. Green gap problem: InGaN efficiency drops 50-60% around 530nm due to piezoelectric fields in c-plane QWs.'
          )),
          h('div', { className: 'flex gap-2 mt-2' },
            btn('\uD83E\uDD16 AI Explain', function() { askAI(mixMode ? 'RGB LED color mixing additive colors' : mat.name + ' LED physics and emission wavelength'); }, 'bg-indigo-600 text-white hover:bg-indigo-700'),
            btn('\uD83D\uDD0A Read', function() { speakText(mixMode ? 'RGB color mixer. Red ' + (d.ledMixR || 0) + ', Green ' + (d.ledMixG || 0) + ', Blue ' + (d.ledMixB || 0) + '.' : mat.name + '. Wavelength ' + mat.wavelength + ' nanometers. Band gap ' + mat.bandGap + ' electron volts.'); }, 'bg-slate-600 text-slate-200 hover:bg-slate-500')
          ),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // SOLAR CELL SIMULATOR
      // ════════════════════════════════════════════
      function renderSolarCell() {
        var irradiance = d.solarIrradiance || 1000; // W/m^2
        var temp = d.solarTemp || 300;
        var area = d.solarArea || 100; // cm^2
        var material = d.solarMaterial || 'silicon';
        var loadR = d.solarLoadR || 100;

        var SOLAR_MATS = {
          silicon: { name: 'Crystalline Si', eff: 0.22, Voc: 0.72, color: '#4F46E5', record: 26.7 },
          thinfilm: { name: 'CdTe Thin Film', eff: 0.18, Voc: 0.87, color: '#10B981', record: 22.1 },
          perovskite: { name: 'Perovskite', eff: 0.25, Voc: 1.18, color: '#F59E0B', record: 25.7 },
          gaas: { name: 'GaAs (III-V)', eff: 0.29, Voc: 1.12, color: '#EF4444', record: 29.1 },
          organic: { name: 'Organic PV', eff: 0.12, Voc: 0.85, color: '#8B5CF6', record: 18.2 },
          tandem: { name: 'Perovskite/Si Tandem', eff: 0.33, Voc: 1.90, color: '#06B6D4', record: 33.7 }
        };

        var sMat = SOLAR_MATS[material] || SOLAR_MATS.silicon;
        // Simplified calculations
        var irradianceFactor = irradiance / 1000;
        var tempFactor = 1 - 0.004 * (temp - 298); // ~0.4%/K loss
        var effActual = sMat.eff * irradianceFactor * Math.max(0.5, tempFactor);
        var powerOut = effActual * irradiance * (area / 10000); // W
        var Voc = sMat.Voc * (1 + 0.0025 * Math.log(irradianceFactor + 0.01)) * (1 - 0.002 * (temp - 298));
        var Isc = powerOut / Math.max(0.01, Voc) * 1.15;
        var Vmp = Voc * 0.82;
        var Imp = Isc * 0.92;
        var Pmax = Vmp * Imp;
        var FF = Pmax / (Voc * Isc + 0.001);

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var cx = canvasEl.getContext('2d');
          var W = canvasEl.width, H = canvasEl.height;
          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          // Sun
          var sunPulse = 1 + Math.sin(Date.now() / 800) * 0.1;
          cx.fillStyle = '#FBBF24'; cx.shadowColor = '#FBBF24'; cx.shadowBlur = 20 * irradianceFactor;
          cx.beginPath(); cx.arc(60, 30, 18 * sunPulse, 0, Math.PI * 2); cx.fill();
          cx.shadowBlur = 0;
          cx.fillStyle = '#FCD34D'; cx.font = '8px sans-serif'; cx.textAlign = 'center';
          cx.fillText(irradiance + ' W/m\u00B2', 60, 58);

          // Photon rays
          cx.strokeStyle = '#FCD34D'; cx.lineWidth = 1; cx.globalAlpha = 0.4;
          for (var ray = 0; ray < 5; ray++) {
            var rayT = ((Date.now() / 400 + ray * 200) % 1000) / 1000;
            var rx1 = 80 + ray * 15;
            var ry1 = 45 + rayT * 50;
            cx.beginPath(); cx.moveTo(rx1, ry1); cx.lineTo(rx1 + 40, ry1 + 40); cx.stroke();
          }
          cx.globalAlpha = 1;

          // Solar panel
          var panelX = 120, panelY = 100, panelW = 160, panelH = 50;
          cx.fillStyle = sMat.color; cx.fillRect(panelX, panelY, panelW, panelH);
          cx.strokeStyle = '#CBD5E1'; cx.lineWidth = 1;
          // Grid lines on panel
          for (var gr = 1; gr < 4; gr++) {
            cx.beginPath(); cx.moveTo(panelX + gr * panelW / 4, panelY); cx.lineTo(panelX + gr * panelW / 4, panelY + panelH); cx.stroke();
            cx.beginPath(); cx.moveTo(panelX, panelY + gr * panelH / 4); cx.lineTo(panelX + panelW, panelY + gr * panelH / 4); cx.stroke();
          }
          cx.fillStyle = '#FFF'; cx.font = 'bold 10px sans-serif'; cx.textAlign = 'center';
          cx.fillText(sMat.name, panelX + panelW / 2, panelY + panelH / 2 + 4);

          // Electron-hole pairs generated inside
          var tick = Date.now();
          var pairCount = Math.floor(irradianceFactor * 6);
          for (var ep = 0; ep < pairCount; ep++) {
            var epx = panelX + 15 + (ep * panelW / pairCount);
            var epy = panelY + 10 + Math.sin(tick / 300 + ep) * 12;
            // electron
            cx.fillStyle = '#60A5FA';
            cx.beginPath(); cx.arc(epx, epy, 2.5, 0, Math.PI * 2); cx.fill();
            // hole
            cx.strokeStyle = '#F87171'; cx.lineWidth = 1;
            cx.beginPath(); cx.arc(epx + 5, epy + 8, 2.5, 0, Math.PI * 2); cx.stroke();
          }

          // Wires to load
          cx.strokeStyle = '#64748B'; cx.lineWidth = 2;
          cx.beginPath(); cx.moveTo(panelX + panelW, panelY + 15); cx.lineTo(panelX + panelW + 50, panelY + 15); cx.lineTo(panelX + panelW + 50, panelY + panelH + 30); cx.stroke();
          cx.beginPath(); cx.moveTo(panelX + panelW, panelY + panelH - 15); cx.lineTo(panelX + panelW + 30, panelY + panelH - 15); cx.lineTo(panelX + panelW + 30, panelY + panelH + 30); cx.stroke();
          // Load resistor
          cx.fillStyle = '#334155'; cx.fillRect(panelX + panelW + 25, panelY + panelH + 30, 30, 20);
          cx.fillStyle = '#CBD5E1'; cx.font = '8px sans-serif'; cx.textAlign = 'center';
          cx.fillText('Load', panelX + panelW + 40, panelY + panelH + 43);

          // Power output with glow
          cx.fillStyle = '#34D399'; cx.shadowColor = '#34D399'; cx.shadowBlur = 10;
          cx.font = 'bold 14px sans-serif'; cx.textAlign = 'center';
          cx.fillText(Pmax.toFixed(1) + ' W', W / 2, H - 25);
          cx.shadowBlur = 0;
          cx.fillStyle = '#94A3B8'; cx.font = '9px sans-serif';
          cx.fillText('\u03B7 = ' + (effActual * 100).toFixed(1) + '%', W / 2, H - 10);

          // Mini I-V curve
          if (d.solarShowPV) {
            var ivX = W - 115, ivY = 15, ivW = 105, ivH = 65;
            cx.fillStyle = 'rgba(15, 23, 42, 0.85)'; cx.fillRect(ivX, ivY, ivW, ivH);
            cx.strokeStyle = '#334155'; cx.lineWidth = 1; cx.strokeRect(ivX, ivY, ivW, ivH);
            // I-V curve
            cx.strokeStyle = '#22D3EE'; cx.lineWidth = 1.5; cx.beginPath();
            for (var sv = 0; sv <= 1; sv += 0.02) {
              var sV = sv * Voc * 1.1;
              var sI = Isc * (1 - Math.pow(sV / Voc, 5));
              if (sI < 0) sI = 0;
              var spx = ivX + 5 + sv * (ivW - 10);
              var spy = ivY + ivH - 5 - (sI / Isc) * (ivH - 10);
              if (sv === 0) cx.moveTo(spx, spy); else cx.lineTo(spx, spy);
            }
            cx.stroke();
            // Power curve
            cx.strokeStyle = '#F59E0B'; cx.lineWidth = 1; cx.setLineDash([3, 2]); cx.beginPath();
            var maxPy = ivY + ivH;
            for (var pv = 0; pv <= 1; pv += 0.02) {
              var pV = pv * Voc * 1.1;
              var pI = Isc * (1 - Math.pow(pV / Voc, 5));
              if (pI < 0) pI = 0;
              var pPow = pV * pI;
              var ppx = ivX + 5 + pv * (ivW - 10);
              var ppy = ivY + ivH - 5 - (pPow / (Pmax * 1.3)) * (ivH - 10);
              if (pv === 0) cx.moveTo(ppx, ppy); else cx.lineTo(ppx, ppy);
            }
            cx.stroke(); cx.setLineDash([]);
            // MPP dot
            var mppFrac = Vmp / (Voc * 1.1);
            cx.fillStyle = '#F59E0B';
            cx.beginPath(); cx.arc(ivX + 5 + mppFrac * (ivW - 10), ivY + ivH - 5 - (Pmax / (Pmax * 1.3)) * (ivH - 10), 3, 0, Math.PI * 2); cx.fill();
            cx.fillStyle = '#94A3B8'; cx.font = '7px sans-serif'; cx.textAlign = 'center';
            cx.fillText('I-V (cyan) / P-V (gold)', ivX + ivW / 2, ivY + ivH + 10);
          }

          // Temperature indicator
          cx.fillStyle = temp > 320 ? '#EF4444' : temp > 300 ? '#F59E0B' : '#34D399';
          cx.font = '9px sans-serif'; cx.textAlign = 'left';
          cx.fillText(temp + 'K' + (temp > 320 ? ' \u26A0 Hot!' : ''), 10, H - 5);
        };

        var animRef = React.useRef(null);
        React.useEffect(function() {
          var canvas = document.getElementById('semi-solar-canvas');
          if (!canvas) return;
          function draw() { canvasRef(canvas); animRef.current = requestAnimationFrame(draw); }
          draw();
          return function() { cancelAnimationFrame(animRef.current); };
        }, [d.solarIrradiance, d.solarTemp, d.solarArea, d.solarMaterial, d.solarShowPV]);

        return h('div', null,
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            Object.keys(SOLAR_MATS).map(function(key) {
              var sm = SOLAR_MATS[key];
              return pill(sm.name, material === key, function() {
                upd('solarMaterial', key);
                tryAwardXP('solar-' + key, 8, 'Explored ' + sm.name + ' solar cell');
              });
            })
          ),
          h('canvas', { 'aria-label': 'Semiconductor visualization',
            id: 'semi-solar-canvas', width: 440, height: 230,
            className: 'w-full rounded-lg bg-slate-900 border border-slate-700',
            role: 'img', 'aria-label': sMat.name + ' solar cell producing ' + Pmax.toFixed(1) + ' watts'
          }),
          sliderRow('Irradiance', irradiance, 100, 1200, 50, function(v) { upd('solarIrradiance', v); }, ' W/m\u00B2'),
          sliderRow('Cell Temp', temp, 270, 370, 5, function(v) { upd('solarTemp', v); }, ' K'),
          sliderRow('Area', area, 10, 500, 10, function(v) { upd('solarArea', v); }, ' cm\u00B2'),
          h('div', { className: 'flex items-center gap-3 mt-2' },
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: !!d.solarShowPV, onChange: function() { upd('solarShowPV', !d.solarShowPV); }, className: 'accent-cyan-500' }), 'I-V / P-V Curve'),
            btn('\uD83E\uDD16 AI Explain', function() { askAI(sMat.name + ' solar cell photovoltaic effect and efficiency'); }, 'bg-indigo-600 text-white hover:bg-indigo-700')
          ),
          // Stats
          h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
            statBadge('Power', Pmax.toFixed(1) + ' W', 'text-emerald-400'),
            statBadge('Efficiency', (effActual * 100).toFixed(1) + '%'),
            statBadge('V\u2092\u1D9C', Voc.toFixed(2) + ' V'),
            statBadge('I\u209B\u1D9C', Isc.toFixed(2) + ' A'),
            statBadge('FF', (FF * 100).toFixed(0) + '%'),
            statBadge('Record', sMat.record + '%', 'text-amber-400')
          ),
          infoBox(gradeText(
            'Solar cells turn sunlight into electricity! Brighter sun = more power. They work because light knocks electrons free inside the material.',
            'Solar cells are P-N junctions that absorb photons. Each photon with enough energy creates an electron-hole pair. The junction\'s electric field separates them, creating current. More sun = more pairs = more power!',
            'Photovoltaic effect: photons with h\u03BD > E\u2097 generate e-h pairs separated by junction field. V\u2092\u1D9C = (kT/q)ln(I\u2097/I\u2080 + 1). Shockley-Queisser limit: ~33.7% for single-junction at 1.34 eV. FF = P\u2098\u2090\u2093/(V\u2092\u1D9CI\u209B\u1D9C).',
            'Detailed balance: \u03B7\u2098\u2090\u2093 = 33.7% at E\u2097 = 1.34eV (Shockley-Queisser). Losses: thermalization (' + ((1 - sMat.eff / 0.337) * 50).toFixed(0) + '%), sub-bandgap transparency, Carnot, recombination. V\u2092\u1D9C = (nkT/q)ln(J\u2097/J\u2080). Temperature coefficient: dP/dT \u2248 -0.4%/K (Si). Tandem cells bypass SQ via multiple junctions: 47.1% record (6-junction III-V).'
          )),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // MOORE'S LAW INTERACTIVE TIMELINE
      // ════════════════════════════════════════════
      function renderMooreLaw() {
        var year = d.mooreYear || 2024;
        var showPred = d.mooreShowPred !== false;
        var logScale = d.mooreLogScale !== false;

        var MILESTONES = [
          { year: 1965, transistors: 64,        node: null,   name: 'Moore\'s paper published', chip: null },
          { year: 1971, transistors: 2300,      node: '10\u03BCm', name: 'Intel 4004', chip: '4-bit CPU' },
          { year: 1978, transistors: 29000,     node: '3\u03BCm',  name: 'Intel 8086', chip: '16-bit CPU' },
          { year: 1985, transistors: 275000,    node: '1.5\u03BCm', name: 'Intel 386', chip: '32-bit CPU' },
          { year: 1993, transistors: 3100000,   node: '0.8\u03BCm', name: 'Pentium', chip: 'Superscalar' },
          { year: 1999, transistors: 9500000,   node: '250nm', name: 'Pentium III', chip: 'Deep pipeline' },
          { year: 2004, transistors: 125000000, node: '90nm',  name: 'Prescott', chip: 'Strained Si' },
          { year: 2006, transistors: 291000000, node: '65nm',  name: 'Core 2 Duo', chip: 'Multi-core era' },
          { year: 2010, transistors: 1170000000,node: '32nm',  name: 'Core i7 (Westmere)', chip: 'High-k/Metal gate' },
          { year: 2014, transistors: 2600000000,node: '14nm',  name: 'Core i7 (Broadwell)', chip: 'FinFET' },
          { year: 2017, transistors: 19200000000, node: '10nm', name: 'Apple A11', chip: 'Neural engine' },
          { year: 2020, transistors: 50000000000, node: '5nm',  name: 'Apple M1', chip: 'Arm SoC' },
          { year: 2022, transistors: 114000000000, node: '3nm', name: 'Apple M2 Ultra', chip: 'Chiplet' },
          { year: 2024, transistors: 208000000000, node: '3nm', name: 'Apple M4 Ultra', chip: 'Advanced packaging' }
        ];

        // Find nearest milestone
        var nearest = MILESTONES.reduce(function(best, m) {
          return Math.abs(m.year - year) < Math.abs(best.year - year) ? m : best;
        }, MILESTONES[0]);

        // Moore's prediction for selected year
        var moorePred = 64 * Math.pow(2, (year - 1965) / 2);

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var cx = canvasEl.getContext('2d');
          var W = canvasEl.width, H = canvasEl.height;
          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          var padL = 55, padR = 15, padT = 20, padB = 35;
          var gW = W - padL - padR, gH = H - padT - padB;
          var yearMin = 1965, yearMax = 2030;

          // Grid
          cx.strokeStyle = '#1E293B'; cx.lineWidth = 0.5;
          for (var gy = yearMin; gy <= yearMax; gy += 5) {
            var gx = padL + (gy - yearMin) / (yearMax - yearMin) * gW;
            cx.beginPath(); cx.moveTo(gx, padT); cx.lineTo(gx, padT + gH); cx.stroke();
            cx.fillStyle = '#475569'; cx.font = '7px sans-serif'; cx.textAlign = 'center';
            cx.fillText(String(gy), gx, H - 5);
          }

          // Y-axis (log scale)
          var yMin = 1, yMax = 15; // log10 scale
          cx.fillStyle = '#475569'; cx.font = '7px sans-serif'; cx.textAlign = 'right';
          for (var yy = 2; yy <= 14; yy += 2) {
            var gYy = padT + gH - (yy - yMin) / (yMax - yMin) * gH;
            cx.beginPath(); cx.moveTo(padL, gYy); cx.lineTo(W - padR, gYy); cx.stroke();
            cx.fillText('10^' + yy, padL - 3, gYy + 3);
          }

          // Moore's Law prediction line
          if (showPred) {
            cx.strokeStyle = '#F59E0B'; cx.lineWidth = 1.5; cx.setLineDash([5, 3]);
            cx.beginPath();
            for (var my = yearMin; my <= yearMax; my++) {
              var mPred = Math.log10(64 * Math.pow(2, (my - 1965) / 2));
              var mpx = padL + (my - yearMin) / (yearMax - yearMin) * gW;
              var mpy = padT + gH - (mPred - yMin) / (yMax - yMin) * gH;
              if (my === yearMin) cx.moveTo(mpx, mpy); else cx.lineTo(mpx, mpy);
            }
            cx.stroke(); cx.setLineDash([]);
            cx.fillStyle = '#F59E0B'; cx.font = '7px sans-serif'; cx.textAlign = 'left';
            cx.fillText('Moore\'s Law (2x/2yr)', padL + 5, padT + 12);
          }

          // Actual data points
          cx.fillStyle = '#22D3EE';
          MILESTONES.forEach(function(m) {
            var mx = padL + (m.year - yearMin) / (yearMax - yearMin) * gW;
            var my = padT + gH - (Math.log10(m.transistors) - yMin) / (yMax - yMin) * gH;
            var isHighlight = Math.abs(m.year - year) < 3;

            cx.beginPath(); cx.arc(mx, my, isHighlight ? 5 : 3, 0, Math.PI * 2);
            cx.fillStyle = isHighlight ? '#F59E0B' : '#22D3EE';
            if (isHighlight) { cx.shadowColor = '#F59E0B'; cx.shadowBlur = 8; }
            cx.fill(); cx.shadowBlur = 0;

            if (isHighlight) {
              cx.fillStyle = '#FFF'; cx.font = 'bold 8px sans-serif'; cx.textAlign = 'center';
              cx.fillText(m.name, mx, my - 10);
              cx.fillStyle = '#94A3B8'; cx.font = '7px sans-serif';
              cx.fillText(m.transistors.toLocaleString() + ' trans.', mx, my - 2);
            }
          });

          // Trend line through data
          cx.strokeStyle = '#22D3EE'; cx.lineWidth = 1.5; cx.beginPath();
          MILESTONES.forEach(function(m, i) {
            var mx = padL + (m.year - yearMin) / (yearMax - yearMin) * gW;
            var my = padT + gH - (Math.log10(m.transistors) - yMin) / (yMax - yMin) * gH;
            if (i === 0) cx.moveTo(mx, my); else cx.lineTo(mx, my);
          });
          cx.stroke();

          // Year selector line
          var selX = padL + (year - yearMin) / (yearMax - yearMin) * gW;
          cx.strokeStyle = '#F87171'; cx.lineWidth = 1; cx.setLineDash([3, 2]);
          cx.beginPath(); cx.moveTo(selX, padT); cx.lineTo(selX, padT + gH); cx.stroke();
          cx.setLineDash([]);
          cx.fillStyle = '#F87171'; cx.font = 'bold 9px sans-serif'; cx.textAlign = 'center';
          cx.fillText(String(year), selX, padT - 5);

          // Axis labels
          cx.fillStyle = '#94A3B8'; cx.font = '9px sans-serif'; cx.textAlign = 'center';
          cx.fillText('Year', W / 2, H - 18);
          cx.save(); cx.translate(10, H / 2); cx.rotate(-Math.PI / 2);
          cx.fillText('Transistors (log scale)', 0, 0); cx.restore();
        };

        React.useEffect(function() {
          var canvas = document.getElementById('semi-moore-canvas');
          if (canvas) canvasRef(canvas);
        }, [d.mooreYear, d.mooreShowPred, d.mooreLogScale]);

        return h('div', null,
          h('canvas', { 'aria-label': 'Semiconductor visualization',
            id: 'semi-moore-canvas', width: 440, height: 240,
            className: 'w-full rounded-lg bg-slate-900 border border-slate-700',
            role: 'img', 'aria-label': 'Moore\'s Law graph showing transistor counts from 1965 to 2030'
          }),
          sliderRow('Year', year, 1965, 2030, 1, function(v) { upd('mooreYear', v); }, ''),
          h('div', { className: 'flex items-center gap-3 mt-2' },
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showPred, onChange: function() { upd('mooreShowPred', !showPred); }, className: 'accent-amber-500' }), 'Moore Prediction'),
            btn('\uD83E\uDD16 AI Explain', function() { askAI('Moore\'s Law semiconductor scaling in year ' + year); }, 'bg-indigo-600 text-white hover:bg-indigo-700')
          ),
          // Milestone info
          h('div', { className: 'mt-2 p-3 rounded-xl bg-slate-800/60 border border-slate-700' },
            h('div', { className: 'flex items-center justify-between mb-1' },
              h('span', { className: 'text-sm font-bold text-white' }, nearest.name || ('Year ' + year)),
              nearest.node && h('span', { className: 'text-xs px-2 py-0.5 rounded bg-cyan-900 text-cyan-300' }, nearest.node)
            ),
            h('div', { className: 'flex gap-2 flex-wrap' },
              statBadge('Year', String(nearest.year)),
              statBadge('Transistors', nearest.transistors > 1e9 ? (nearest.transistors / 1e9).toFixed(1) + 'B' : nearest.transistors > 1e6 ? (nearest.transistors / 1e6).toFixed(1) + 'M' : nearest.transistors > 1e3 ? (nearest.transistors / 1e3).toFixed(1) + 'K' : String(nearest.transistors)),
              nearest.chip && statBadge('Innovation', nearest.chip),
              statBadge('Moore Pred.', moorePred > 1e9 ? (moorePred / 1e9).toFixed(0) + 'B' : moorePred > 1e6 ? (moorePred / 1e6).toFixed(0) + 'M' : moorePred > 1e3 ? (moorePred / 1e3).toFixed(0) + 'K' : moorePred.toFixed(0), 'text-amber-400')
            )
          ),
          infoBox(gradeText(
            'In 1965, Gordon Moore predicted that the number of tiny switches (transistors) on a chip would double every 2 years. He was right for 60 years! Today\'s chips have BILLIONS of transistors!',
            'Moore\'s Law says transistor counts double every ~2 years. In 1971 the Intel 4004 had 2,300 transistors. Today\'s chips have over 100 billion! This makes computers faster and cheaper over time.',
            'Moore\'s observation (1965): transistor density doubles every ~18-24 months. Dennard scaling (ended ~2006): voltage, current, dimensions all shrink together. Post-Dennard: multi-core, chiplets, 3D stacking. Current leading edge: 3nm FinFET/GAA-FET.',
            'Moore\'s Law: N(t) = N\u2080\u00B72^(t/T\u2082) where T\u2082 \u2248 2 years. Dennard scaling: P/transistor \u221D V\u00B2\u00B7f/L\u00B2 (broke ~2006 due to leakage). Scaling limit drivers: quantum tunneling at <1nm gate oxide, lithography (EUV at 13.5nm), thermal density (>100W/cm\u00B2), interconnect RC delay. Beyond-CMOS: spintronics, quantum, photonic, neuromorphic.'
          )),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // QUANTUM WELLS — Confinement & Wavefunctions
      // ════════════════════════════════════════════
      function renderQuantumWell() {
        var wellWidth = d.qwWidth || 5; // nm
        var wellDepth = d.qwDepth || 0.3; // eV
        var showWave = d.qwShowWave !== false;
        var showProb = !!d.qwShowProb;
        var efield = d.qwElectricField || 0; // kV/cm
        var numLevels = d.qwLevels || 3;

        var QW_MATS = {
          'gaas-algaas': { name: 'GaAs/AlGaAs', well: 'GaAs', barrier: 'AlGaAs', me: 0.067, color: '#EF4444', barrierColor: '#7C3AED' },
          'inas-gaas':   { name: 'InAs/GaAs',   well: 'InAs', barrier: 'GaAs',   me: 0.023, color: '#F59E0B', barrierColor: '#4F46E5' },
          'gan-algan':   { name: 'GaN/AlGaN',    well: 'GaN',  barrier: 'AlGaN',  me: 0.20,  color: '#06B6D4', barrierColor: '#10B981' },
          'inp-ingaasp': { name: 'InP/InGaAsP',  well: 'InP',  barrier: 'InGaAsP', me: 0.077, color: '#EC4899', barrierColor: '#8B5CF6' }
        };

        var qmat = QW_MATS[d.qwMaterial || 'gaas-algaas'] || QW_MATS['gaas-algaas'];

        // Infinite well energy levels: E_n = n² π² ℏ² / (2 m* L²)
        var hbar = 1.055e-34; // J·s
        var eV2J = 1.6e-19;
        var me = qmat.me * 9.109e-31; // kg
        var Lm = wellWidth * 1e-9; // m
        function levelEnergy(n) {
          var En = (n * n * Math.PI * Math.PI * hbar * hbar) / (2 * me * Lm * Lm);
          return En / eV2J; // eV
        }

        var levels = [];
        for (var lv = 1; lv <= Math.min(numLevels, 6); lv++) {
          var en = levelEnergy(lv);
          if (en < wellDepth * 1.5) levels.push({ n: lv, E: en, bound: en < wellDepth });
        }

        // Transition energies
        var transitions = [];
        for (var ti = 0; ti < levels.length - 1; ti++) {
          transitions.push({
            from: levels[ti + 1].n, to: levels[ti].n,
            dE: levels[ti + 1].E - levels[ti].E,
            wavelength: 1240 / (levels[ti + 1].E - levels[ti].E) // nm
          });
        }

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var cx = canvasEl.getContext('2d');
          var W = canvasEl.width, H = canvasEl.height;
          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          var padL = 50, padR = 20, padT = 25, padB = 25;
          var gW = W - padL - padR, gH = H - padT - padB;

          // Draw potential well
          var wellCenterX = padL + gW / 2;
          var wellPixW = Math.min(gW * 0.5, wellWidth * 12);
          var wellLeft = wellCenterX - wellPixW / 2;
          var wellRight = wellCenterX + wellPixW / 2;
          var wellBottom = padT + gH - 10;
          var depthPx = Math.min(gH * 0.75, wellDepth * gH / 0.5);
          var wellTop = wellBottom - depthPx;

          // Barriers
          cx.fillStyle = qmat.barrierColor + '50';
          cx.fillRect(padL, wellTop, wellLeft - padL, wellBottom - wellTop);
          cx.fillRect(wellRight, wellTop, padL + gW - wellRight, wellBottom - wellTop);
          // Barrier tops
          cx.fillStyle = qmat.barrierColor;
          cx.fillRect(padL, wellTop - 2, wellLeft - padL, 4);
          cx.fillRect(wellRight, wellTop - 2, padL + gW - wellRight, 4);

          // Well
          cx.strokeStyle = qmat.color; cx.lineWidth = 2;
          cx.beginPath();
          cx.moveTo(padL, wellTop); cx.lineTo(wellLeft, wellTop);
          cx.lineTo(wellLeft, wellBottom); cx.lineTo(wellRight, wellBottom);
          cx.lineTo(wellRight, wellTop); cx.lineTo(padL + gW, wellTop);
          cx.stroke();

          // Electric field tilt
          if (efield !== 0) {
            var tiltPx = efield * 0.3;
            cx.strokeStyle = '#F59E0B'; cx.lineWidth = 1; cx.setLineDash([4, 3]);
            cx.beginPath();
            cx.moveTo(wellLeft, wellBottom + tiltPx);
            cx.lineTo(wellRight, wellBottom - tiltPx);
            cx.stroke(); cx.setLineDash([]);
            cx.fillStyle = '#F59E0B'; cx.font = '8px sans-serif'; cx.textAlign = 'center';
            cx.fillText('E-field: ' + efield + ' kV/cm', wellCenterX, wellBottom + 18);
          }

          // Energy levels & wavefunctions
          var colors = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#F472B6'];
          levels.forEach(function(lev, idx) {
            var ePx = wellBottom - (lev.E / (wellDepth * 1.5)) * depthPx * 1.4;
            if (ePx < padT) return;

            // Energy level line
            cx.strokeStyle = lev.bound ? colors[idx % colors.length] : '#64748B';
            cx.lineWidth = lev.bound ? 2 : 1;
            cx.setLineDash(lev.bound ? [] : [4, 3]);
            cx.beginPath(); cx.moveTo(wellLeft + 3, ePx); cx.lineTo(wellRight - 3, ePx); cx.stroke();
            cx.setLineDash([]);

            // Label
            cx.fillStyle = lev.bound ? colors[idx % colors.length] : '#64748B';
            cx.font = 'bold 9px sans-serif'; cx.textAlign = 'right';
            cx.fillText('E' + lev.n + ' = ' + lev.E.toFixed(3) + ' eV', wellLeft - 5, ePx + 3);

            // Wavefunction ψ_n(x)
            if (showWave && lev.bound) {
              cx.strokeStyle = colors[idx % colors.length] + '90';
              cx.lineWidth = 1.5;
              cx.beginPath();
              var nPts = 60;
              for (var wp = 0; wp <= nPts; wp++) {
                var xFrac = wp / nPts;
                var xPos = wellLeft + xFrac * wellPixW;
                var psi = Math.sin(lev.n * Math.PI * xFrac);
                if (showProb) psi = psi * psi; // |ψ|²
                var amp = 12 + idx * 2;
                var yPos = ePx - psi * amp;
                if (wp === 0) cx.moveTo(xPos, yPos); else cx.lineTo(xPos, yPos);
              }
              cx.stroke();
            }
          });

          // Axes
          cx.fillStyle = '#94A3B8'; cx.font = '8px sans-serif'; cx.textAlign = 'center';
          cx.fillText('Position (x)', wellCenterX, H - 3);
          cx.save(); cx.translate(10, H / 2); cx.rotate(-Math.PI / 2);
          cx.fillText('Energy (eV)', 0, 0); cx.restore();

          // Material labels
          cx.fillStyle = qmat.barrierColor; cx.font = '8px sans-serif'; cx.textAlign = 'center';
          cx.fillText(qmat.barrier, padL + (wellLeft - padL) / 2, padT + 12);
          cx.fillText(qmat.barrier, wellRight + (padL + gW - wellRight) / 2, padT + 12);
          cx.fillStyle = qmat.color;
          cx.fillText(qmat.well, wellCenterX, wellBottom - 5);

          // Well width label
          cx.strokeStyle = '#CBD5E1'; cx.lineWidth = 0.5;
          cx.beginPath(); cx.moveTo(wellLeft, wellBottom + 8); cx.lineTo(wellRight, wellBottom + 8); cx.stroke();
          cx.fillStyle = '#CBD5E1'; cx.font = '8px sans-serif'; cx.textAlign = 'center';
          cx.fillText(wellWidth + ' nm', wellCenterX, wellBottom + 16);
        };

        React.useEffect(function() {
          var canvas = document.getElementById('semi-qw-canvas');
          if (canvas) canvasRef(canvas);
        }, [d.qwWidth, d.qwDepth, d.qwMaterial, d.qwLevels, d.qwShowWave, d.qwShowProb, d.qwElectricField]);

        return h('div', null,
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            Object.keys(QW_MATS).map(function(key) {
              var m = QW_MATS[key];
              return pill(m.name, (d.qwMaterial || 'gaas-algaas') === key, function() {
                upd('qwMaterial', key);
                tryAwardXP('qw-' + key, 8, 'Explored ' + m.name + ' quantum well');
              });
            })
          ),
          h('canvas', { 'aria-label': 'Semiconductor visualization',
            id: 'semi-qw-canvas', width: 440, height: 260,
            className: 'w-full rounded-lg bg-slate-900 border border-slate-700',
            role: 'img', 'aria-label': 'Quantum well potential with ' + levels.length + ' energy levels'
          }),
          sliderRow('Well Width', wellWidth, 1, 20, 0.5, function(v) { upd('qwWidth', v); }, ' nm'),
          sliderRow('Well Depth', wellDepth, 0.1, 1.0, 0.05, function(v) { upd('qwDepth', v); }, ' eV'),
          sliderRow('Levels', numLevels, 1, 6, 1, function(v) { upd('qwLevels', v); }),
          (gradeBand === '6-8' || gradeBand === '9-12') && sliderRow('E-field', efield, -50, 50, 5, function(v) { upd('qwElectricField', v); }, ' kV/cm'),
          h('div', { className: 'flex items-center gap-3 mt-2' },
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showWave, onChange: function() { upd('qwShowWave', !showWave); }, className: 'accent-cyan-500' }), '\u03C8(x) Wavefunction'),
            h('label', { className: 'flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer' },
              h('input', { type: 'checkbox', checked: showProb, onChange: function() { upd('qwShowProb', !showProb); }, className: 'accent-amber-500' }), '|\u03C8|\u00B2 Probability')
          ),
          // Energy level stats
          h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
            levels.map(function(lev) {
              return statBadge('E' + lev.n, lev.E.toFixed(3) + ' eV', lev.bound ? 'text-cyan-400' : 'text-slate-500');
            })
          ),
          // Transition energies
          transitions.length > 0 && h('div', { className: 'mt-2 p-2 rounded-lg bg-slate-800/60 border border-slate-700' },
            h('div', { className: 'text-[11px] text-slate-600 uppercase tracking-wider mb-1' }, 'Optical Transitions'),
            h('div', { className: 'flex flex-wrap gap-2' },
              transitions.filter(function(tr) { return tr.dE > 0; }).slice(0, 4).map(function(tr) {
                return h('div', { key: tr.from + '-' + tr.to, className: 'text-xs text-slate-300' },
                  'E' + tr.from + '\u2192E' + tr.to + ': ', h('span', { className: 'text-cyan-400 font-mono' }, tr.dE.toFixed(3) + ' eV'),
                  ' (', h('span', { className: 'text-amber-400 font-mono' }, (tr.wavelength > 0 && isFinite(tr.wavelength) ? tr.wavelength.toFixed(0) : '\u221E') + ' nm'), ')'
                );
              })
            )
          ),
          infoBox(gradeText(
            'When a space is really tiny, electrons act like waves! They can only have certain energy levels, like steps on a staircase. Smaller space = bigger steps.',
            'Quantum wells trap electrons in a thin layer of semiconductor. Because the well is so small (nanometers), electrons can only have certain discrete energies \u2014 like standing waves on a guitar string.',
            'Particle-in-a-box: E\u2099 = n\u00B2\u03C0\u00B2\u0127\u00B2/(2m*L\u00B2). Narrower wells = wider level spacing. Finite well: levels shift and wavefunctions leak into barriers. Used in quantum well lasers (telecom), QW-LEDs, and HEMTs.',
            'Finite well: transcendental equations tan(kL/2) = \u03BA/k (even) and -cot(kL/2) = \u03BA/k (odd). Stark effect: E-field tilts well \u2192 QCSE (red-shift), used in modulators. Coupled QWs \u2192 minibands in superlattices. 2DEG at heterointerface: \u03BC > 10\u2076 cm\u00B2/Vs at low T.'
          )),
          h('div', { className: 'flex gap-2 mt-2' },
            btn('\uD83E\uDD16 AI Explain', function() { askAI('quantum well confinement in ' + qmat.name + ' with width ' + wellWidth + ' nm'); }, 'bg-indigo-600 text-white hover:bg-indigo-700'),
            btn('\uD83D\uDD0A Read', function() { speakText('Quantum well in ' + qmat.name + '. Width ' + wellWidth + ' nanometers, depth ' + wellDepth + ' electron volts. ' + levels.length + ' energy levels.'); }, 'bg-slate-600 text-slate-200 hover:bg-slate-500')
          ),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // SEMICONDUCTOR MEMORY CELLS
      // ════════════════════════════════════════════
      function renderMemoryCells() {
        var memType = d.memType || 'sram';
        var bitVal = d.memBitValue || 0;
        var writeEn = !!d.memWriteEnable;
        var showArray = !!d.memShowArray;
        var showTiming = !!d.memShowTiming;

        var MEM_TYPES = {
          sram:  { name: 'SRAM (6T)',     transistors: 6,  volatile: true,  speed: 'Very Fast', density: 'Low',     color: '#22D3EE', desc: '6 transistors per bit: 2 cross-coupled inverters + 2 access transistors. Used in CPU caches.' },
          dram:  { name: 'DRAM (1T1C)',   transistors: 1,  volatile: true,  speed: 'Fast',      density: 'High',    color: '#10B981', desc: '1 transistor + 1 capacitor per bit. Must refresh every ~64ms. Used in main memory (RAM sticks).' },
          flash: { name: 'Flash (NOR)',    transistors: 1,  volatile: false, speed: 'Medium',    density: 'Medium',  color: '#F59E0B', desc: 'Floating-gate transistor traps charge. NOR: random access, used in firmware/BIOS.' },
          nand:  { name: 'Flash (NAND)',   transistors: 1,  volatile: false, speed: 'Slow Read', density: 'Very High', color: '#EF4444', desc: 'Series-connected floating gates. Sequential access but extremely dense. SSDs, USB drives, SD cards.' },
          feram: { name: 'FeRAM',          transistors: 1,  volatile: false, speed: 'Fast',      density: 'Medium',  color: '#8B5CF6', desc: 'Ferroelectric capacitor stores charge with remnant polarization. Non-volatile + fast write. Used in smart cards, automotive.' }
        };

        var mt = MEM_TYPES[memType] || MEM_TYPES.sram;

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var cx = canvasEl.getContext('2d');
          var W = canvasEl.width, H = canvasEl.height;
          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          if (showArray) {
            // Memory array view
            var rows = 4, cols = 8;
            var cellW = (W - 80) / cols, cellH = (H - 60) / rows;
            cx.fillStyle = mt.color; cx.font = 'bold 10px sans-serif'; cx.textAlign = 'center';
            cx.fillText(mt.name + ' Array (' + rows + '\u00D7' + cols + ')', W / 2, 15);

            // Word lines (rows)
            for (var r = 0; r < rows; r++) {
              var ry = 30 + r * cellH;
              cx.fillStyle = '#475569'; cx.font = '7px sans-serif'; cx.textAlign = 'right';
              cx.fillText('WL' + r, 35, ry + cellH / 2 + 3);
              cx.strokeStyle = r === 0 && writeEn ? '#F59E0B' : '#334155';
              cx.lineWidth = r === 0 && writeEn ? 2 : 0.5;
              cx.beginPath(); cx.moveTo(40, ry + cellH / 2); cx.lineTo(W - 20, ry + cellH / 2); cx.stroke();

              for (var c = 0; c < cols; c++) {
                var cx2 = 45 + c * cellW;
                var randomBit = ((r * cols + c + (bitVal ? 1 : 0)) % 3 === 0) ? 1 : 0;
                if (r === 0 && c === 0) randomBit = bitVal;
                // Cell
                cx.fillStyle = randomBit ? mt.color + '60' : '#1E293B';
                cx.strokeStyle = mt.color + '40'; cx.lineWidth = 0.5;
                cx.fillRect(cx2, ry + 3, cellW - 4, cellH - 6);
                cx.strokeRect(cx2, ry + 3, cellW - 4, cellH - 6);
                // Bit value
                cx.fillStyle = randomBit ? '#FFF' : '#475569';
                cx.font = 'bold 9px monospace'; cx.textAlign = 'center';
                cx.fillText(String(randomBit), cx2 + (cellW - 4) / 2, ry + cellH / 2 + 3);
              }
            }
            // Bit lines (columns)
            for (var bl = 0; bl < cols; bl++) {
              var bx = 45 + bl * cellW + (cellW - 4) / 2;
              cx.strokeStyle = bl === 0 && writeEn ? '#F59E0B' : '#334155';
              cx.lineWidth = bl === 0 && writeEn ? 2 : 0.5;
              cx.beginPath(); cx.moveTo(bx, 25); cx.lineTo(bx, H - 15); cx.stroke();
              cx.fillStyle = '#475569'; cx.font = '6px sans-serif'; cx.textAlign = 'center';
              cx.fillText('BL' + bl, bx, H - 5);
            }
            // Highlight selected cell
            if (writeEn) {
              cx.strokeStyle = '#F59E0B'; cx.lineWidth = 2;
              cx.strokeRect(45, 33, cellW - 4, cellH - 6);
              cx.fillStyle = '#F59E0B'; cx.font = '7px sans-serif'; cx.textAlign = 'left';
              cx.fillText('\u25C0 Selected', 45 + cellW + 2, 33 + cellH / 2);
            }
          } else {
            // Single cell detail view
            cx.fillStyle = mt.color; cx.font = 'bold 11px sans-serif'; cx.textAlign = 'center';
            cx.fillText(mt.name + ' Cell', W / 2, 18);

            if (memType === 'sram') {
              // 6T SRAM cell schematic
              var mcy = H / 2;
              // Two cross-coupled inverters
              // Inverter 1 (left)
              cx.strokeStyle = '#60A5FA'; cx.lineWidth = 1.5;
              cx.strokeRect(W / 2 - 80, mcy - 25, 35, 50); // PMOS+NMOS box 1
              cx.fillStyle = '#60A5FA'; cx.font = '8px sans-serif'; cx.textAlign = 'center';
              cx.fillText('INV1', W / 2 - 62, mcy + 3);
              // Inverter 2 (right)
              cx.strokeStyle = '#F87171';
              cx.strokeRect(W / 2 + 45, mcy - 25, 35, 50);
              cx.fillStyle = '#F87171';
              cx.fillText('INV2', W / 2 + 63, mcy + 3);
              // Cross coupling
              cx.strokeStyle = '#FCD34D'; cx.lineWidth = 1;
              cx.beginPath();
              cx.moveTo(W / 2 - 45, mcy - 10); cx.lineTo(W / 2 + 45, mcy + 10); cx.stroke();
              cx.beginPath();
              cx.moveTo(W / 2 - 45, mcy + 10); cx.lineTo(W / 2 + 45, mcy - 10); cx.stroke();
              // Access transistors
              cx.strokeStyle = '#34D399'; cx.lineWidth = 1.5;
              cx.strokeRect(W / 2 - 115, mcy - 12, 25, 24); // Access T1
              cx.strokeRect(W / 2 + 90, mcy - 12, 25, 24); // Access T2
              cx.fillStyle = '#34D399'; cx.font = '7px sans-serif';
              cx.fillText('M5', W / 2 - 103, mcy + 3);
              cx.fillText('M6', W / 2 + 103, mcy + 3);
              // Word line
              cx.strokeStyle = '#F59E0B'; cx.lineWidth = writeEn ? 2 : 1; cx.setLineDash(writeEn ? [] : [3, 2]);
              cx.beginPath(); cx.moveTo(W / 2 - 103, mcy - 20); cx.lineTo(W / 2 - 103, mcy - 35);
              cx.lineTo(W / 2 + 103, mcy - 35); cx.lineTo(W / 2 + 103, mcy - 20); cx.stroke();
              cx.setLineDash([]);
              cx.fillStyle = '#F59E0B'; cx.font = '8px sans-serif'; cx.textAlign = 'center';
              cx.fillText('Word Line' + (writeEn ? ' (ACTIVE)' : ''), W / 2, mcy - 42);
              // Bit lines
              cx.strokeStyle = '#94A3B8'; cx.lineWidth = 1;
              cx.beginPath(); cx.moveTo(W / 2 - 103, mcy + 12); cx.lineTo(W / 2 - 103, mcy + 50); cx.stroke();
              cx.beginPath(); cx.moveTo(W / 2 + 103, mcy + 12); cx.lineTo(W / 2 + 103, mcy + 50); cx.stroke();
              cx.fillStyle = '#94A3B8'; cx.font = '8px sans-serif';
              cx.fillText('BL', W / 2 - 103, mcy + 62);
              cx.fillText('BL\u0305', W / 2 + 103, mcy + 62);
              // Stored value
              var nodeQ = bitVal ? 'HIGH' : 'LOW';
              cx.fillStyle = bitVal ? '#34D399' : '#EF4444';
              cx.font = 'bold 12px sans-serif'; cx.textAlign = 'center';
              cx.fillText('Q = ' + nodeQ, W / 2, mcy + 45);
              cx.fillStyle = !bitVal ? '#34D399' : '#EF4444';
              cx.fillText('Q\u0305 = ' + (!bitVal ? 'HIGH' : 'LOW'), W / 2, mcy + 60);
              // VDD / GND
              cx.fillStyle = '#EF4444'; cx.font = '7px sans-serif';
              cx.fillText('VDD', W / 2, mcy - 55);
              cx.fillStyle = '#64748B';
              cx.fillText('GND', W / 2, mcy + 75);
            } else if (memType === 'dram') {
              // 1T1C DRAM cell
              var dy = H / 2;
              // Capacitor
              cx.strokeStyle = mt.color; cx.lineWidth = 2;
              cx.beginPath(); cx.moveTo(W / 2 - 15, dy + 15); cx.lineTo(W / 2 + 15, dy + 15); cx.stroke();
              cx.beginPath(); cx.moveTo(W / 2 - 15, dy + 22); cx.lineTo(W / 2 + 15, dy + 22); cx.stroke();
              cx.fillStyle = bitVal ? mt.color + '80' : '#1E293B';
              cx.fillRect(W / 2 - 12, dy + 16, 24, 5);
              cx.fillStyle = '#FFF'; cx.font = '8px sans-serif'; cx.textAlign = 'center';
              cx.fillText('C\u209B = ' + (bitVal ? 'Charged' : 'Empty'), W / 2, dy + 42);
              // Transistor
              cx.strokeStyle = '#64748B'; cx.lineWidth = 1.5;
              cx.strokeRect(W / 2 - 15, dy - 25, 30, 30);
              cx.fillStyle = '#94A3B8'; cx.font = '9px sans-serif';
              cx.fillText('NMOS', W / 2, dy - 8);
              // Wire to cap
              cx.strokeStyle = '#475569'; cx.lineWidth = 1;
              cx.beginPath(); cx.moveTo(W / 2, dy + 5); cx.lineTo(W / 2, dy + 15); cx.stroke();
              // BL
              cx.strokeStyle = '#94A3B8'; cx.lineWidth = 1;
              cx.beginPath(); cx.moveTo(W / 2 - 30, dy - 10); cx.lineTo(W / 2 - 15, dy - 10); cx.stroke();
              cx.fillStyle = '#94A3B8'; cx.font = '8px sans-serif'; cx.textAlign = 'right';
              cx.fillText('Bit Line', W / 2 - 35, dy - 7);
              // WL
              cx.strokeStyle = writeEn ? '#F59E0B' : '#64748B'; cx.lineWidth = writeEn ? 2 : 1;
              cx.beginPath(); cx.moveTo(W / 2, dy - 25); cx.lineTo(W / 2, dy - 45); cx.stroke();
              cx.fillStyle = writeEn ? '#F59E0B' : '#64748B'; cx.font = '8px sans-serif'; cx.textAlign = 'center';
              cx.fillText('Word Line' + (writeEn ? ' (ON)' : ''), W / 2, dy - 50);
              // Refresh indicator
              var tick = Date.now();
              var refreshPhase = (tick % 3000) / 3000;
              cx.fillStyle = '#F59E0B'; cx.globalAlpha = 0.4 + refreshPhase * 0.5;
              cx.font = '8px sans-serif';
              cx.fillText('\u21BB Refresh every 64ms', W / 2, dy + 60);
              cx.globalAlpha = 1;
              // Charge leaking animation
              if (bitVal) {
                cx.fillStyle = mt.color; cx.globalAlpha = 0.3;
                for (var lk = 0; lk < 3; lk++) {
                  var lky = dy + 25 + ((tick / 500 + lk * 300) % 30);
                  cx.beginPath(); cx.arc(W / 2 + (lk - 1) * 8, lky, 2, 0, Math.PI * 2); cx.fill();
                }
                cx.globalAlpha = 1;
              }
            } else {
              // Flash cell (NOR/NAND/FeRAM)
              var fy = H / 2;
              // Floating gate structure
              cx.fillStyle = '#334155'; cx.fillRect(W / 2 - 40, fy - 30, 80, 60); // substrate
              cx.fillStyle = mt.color + '40'; cx.fillRect(W / 2 - 30, fy - 20, 60, 15); // floating gate
              cx.fillStyle = mt.color; cx.fillRect(W / 2 - 30, fy - 5, 60, 10); // control gate
              cx.strokeStyle = mt.color; cx.lineWidth = 1; cx.strokeRect(W / 2 - 30, fy - 20, 60, 15);
              // Oxide layers
              cx.fillStyle = '#94A3B880'; cx.fillRect(W / 2 - 30, fy + 5, 60, 3);
              cx.fillRect(W / 2 - 30, fy - 22, 60, 2);
              // Labels
              cx.fillStyle = '#FFF'; cx.font = '8px sans-serif'; cx.textAlign = 'center';
              cx.fillText('Control Gate', W / 2, fy + 2);
              cx.fillText('Floating Gate', W / 2, fy - 10);
              cx.fillStyle = '#94A3B8';
              cx.fillText('Tunnel Oxide', W / 2, fy + 14);
              cx.fillText('Source', W / 2 - 50, fy + 40);
              cx.fillText('Drain', W / 2 + 50, fy + 40);
              // Trapped electrons
              if (bitVal) {
                cx.fillStyle = '#60A5FA';
                for (var fe = 0; fe < 5; fe++) {
                  cx.beginPath();
                  cx.arc(W / 2 - 20 + fe * 10, fy - 13 + Math.sin(Date.now() / 400 + fe) * 2, 2, 0, Math.PI * 2);
                  cx.fill();
                }
              }
              cx.fillStyle = bitVal ? '#EF4444' : '#34D399';
              cx.font = 'bold 11px sans-serif';
              cx.fillText('Stored: ' + (bitVal ? '0 (charged)' : '1 (erased)'), W / 2, fy + 55);
              if (memType === 'nand') {
                cx.fillStyle = '#94A3B8'; cx.font = '7px sans-serif';
                cx.fillText('NAND: cells in series \u2192 ultra-dense', W / 2, fy - 45);
              }
            }
          }
        };

        var animRef = React.useRef(null);
        React.useEffect(function() {
          var canvas = document.getElementById('semi-mem-canvas');
          if (!canvas) return;
          function draw() { canvasRef(canvas); animRef.current = requestAnimationFrame(draw); }
          draw();
          return function() { cancelAnimationFrame(animRef.current); };
        }, [d.memType, d.memBitValue, d.memWriteEnable, d.memShowArray]);

        return h('div', null,
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            Object.keys(MEM_TYPES).map(function(key) {
              var m = MEM_TYPES[key];
              return pill(m.name, memType === key, function() {
                upd('memType', key);
                tryAwardXP('mem-' + key, 8, 'Explored ' + m.name + ' memory');
              });
            })
          ),
          h('canvas', { 'aria-label': 'Semiconductor visualization',
            id: 'semi-mem-canvas', width: 440, height: 240,
            className: 'w-full rounded-lg bg-slate-900 border border-slate-700',
            role: 'img', 'aria-label': mt.name + ' memory cell storing bit ' + bitVal
          }),
          h('div', { className: 'flex items-center gap-3 mt-3' },
            btn(bitVal ? '\u25CF Bit = 1' : '\u25CB Bit = 0', function() {
              upd('memBitValue', bitVal ? 0 : 1);
              tryAwardXP('mem-flip', 5, 'Flipped memory bit');
              if (announceToSR) announceToSR('Bit set to ' + (bitVal ? 0 : 1));
            }, bitVal ? 'bg-emerald-700 text-white hover:bg-emerald-700' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'),
            btn(writeEn ? '\uD83D\uDD13 Write ON' : '\uD83D\uDD12 Write OFF', function() {
              upd('memWriteEnable', !writeEn);
            }, writeEn ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'),
            pill(showArray ? '\uD83D\uDD0D Cell' : '\uD83D\uDCCA Array', true, function() { upd('memShowArray', !showArray); })
          ),
          // Stats
          h('div', { className: 'flex gap-2 mt-3 flex-wrap' },
            statBadge('Transistors/bit', String(mt.transistors)),
            statBadge('Speed', mt.speed),
            statBadge('Density', mt.density),
            statBadge('Volatile', mt.volatile ? 'Yes' : 'No', mt.volatile ? 'text-amber-400' : 'text-emerald-400')
          ),
          h('div', { className: 'mt-2 p-2 rounded-lg border border-slate-700 bg-slate-800/40 text-xs text-slate-300' }, mt.desc),
          infoBox(gradeText(
            'Computer memory stores 1s and 0s! SRAM is super fast (like your brain\'s short-term memory). DRAM needs to keep refreshing. Flash memory keeps data even when the power is off!',
            'SRAM uses 6 transistors per bit and is very fast (CPU cache). DRAM uses 1 transistor + 1 capacitor and needs refreshing. Flash stores data on a floating gate that traps electrons \u2014 non-volatile!',
            'SRAM: cross-coupled inverters, bistable \u2192 no refresh needed, but 6T per bit limits density. DRAM: charge on C\u209B decays via leakage (\u03C4 \u2248 ms) \u2192 must refresh every 64ms. Flash: Fowler-Nordheim tunneling programs floating gate; hot-carrier injection for writes. NAND Flash: pages/blocks.',
            'SRAM SNM (static noise margin): measured via butterfly curve. DRAM scaling: trench \u2192 stack capacitors, C\u209B \u2265 25 fF. Flash endurance: 10\u00B3-10\u2075 P/E cycles, limited by oxide trap generation. 3D NAND: 100+ layers vertical. Emerging: MRAM (STT/SOT), ReRAM (HfO\u2093 filament), PCM (GST phase change).'
          )),
          h('div', { className: 'flex gap-2 mt-2' },
            btn('\uD83E\uDD16 AI Explain', function() { askAI(mt.name + ' memory cell architecture and operation'); }, 'bg-indigo-600 text-white hover:bg-indigo-700'),
            btn('\uD83D\uDD0A Read', function() { speakText(mt.name + '. Uses ' + mt.transistors + ' transistor' + (mt.transistors > 1 ? 's' : '') + ' per bit. Speed: ' + mt.speed + '. ' + (mt.volatile ? 'Volatile, needs power to keep data.' : 'Non-volatile, keeps data without power.')); }, 'bg-slate-600 text-slate-200 hover:bg-slate-500')
          ),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // SIGNAL AMPLIFIER
      // ════════════════════════════════════════════
      function renderAmplifier() {
        var ampType = d.ampType || 'common-source';
        var Vin = d.ampVin || 0.01; // V peak
        var freq = d.ampFreq || 1000; // Hz
        var Vdd = d.ampVdd || 5;
        var Rd = d.ampRd || 10000; // ohms
        var showBode = !!d.ampShowBode;
        var showDC = d.ampShowDC !== false;
        var biasPoint = d.ampBiasPoint || 2.5;

        var AMP_TYPES = {
          'common-source': { name: 'Common Source (MOSFET)', gain: -10, inputZ: 'Very High', outputZ: 'Medium', bandwidth: 'Medium', icon: 'CS', desc: 'Voltage amplifier. High input impedance (\u221E for ideal). Gain = -g\u2098R\u2093. Inverts signal. Most common MOSFET amp.' },
          'common-drain':  { name: 'Source Follower',        gain: 0.9, inputZ: 'Very High', outputZ: 'Low',    bandwidth: 'Wide',   icon: 'CD', desc: 'Voltage buffer. Gain \u2248 1 (no inversion). Low output impedance \u2192 good for driving loads. Also called source follower.' },
          'common-gate':   { name: 'Common Gate (MOSFET)',   gain: 10,  inputZ: 'Low',       outputZ: 'High',   bandwidth: 'Wide',   icon: 'CG', desc: 'Current buffer. Low input impedance. Non-inverting. Wide bandwidth \u2192 good for RF applications.' },
          'common-emitter': { name: 'Common Emitter (BJT)',  gain: -50, inputZ: 'Medium',    outputZ: 'Medium', bandwidth: 'Medium', icon: 'CE', desc: 'BJT voltage amplifier. Gain = -g\u2098R\u1D9C. Inverts signal. Higher gain than MOSFET but lower input impedance.' },
          'diff-pair':     { name: 'Differential Pair',       gain: 20,  inputZ: 'High',      outputZ: 'Medium', bandwidth: 'Medium', icon: 'DP', desc: 'Amplifies difference of two inputs. Rejects common-mode noise. Foundation of op-amps. CMRR typically >60dB.' }
        };

        var amp = AMP_TYPES[ampType] || AMP_TYPES['common-source'];
        var absGain = Math.abs(amp.gain);
        var inverts = amp.gain < 0;
        var Vout = Math.min(Vdd, Math.max(0, biasPoint + amp.gain * Vin));
        var gainDB = 20 * Math.log10(absGain);

        var canvasRef = function(canvasEl) {
          if (!canvasEl) return;
          var cx = canvasEl.getContext('2d');
          var W = canvasEl.width, H = canvasEl.height;
          cx.fillStyle = '#0F172A'; cx.fillRect(0, 0, W, H);

          if (showBode) {
            // Bode plot (simplified)
            var padL = 50, padR = 15, padT = 20, padB = 30;
            var gW = W - padL - padR, gH = H - padT - padB;

            // Background grid
            cx.strokeStyle = '#1E293B'; cx.lineWidth = 0.5;
            for (var bx = 0; bx <= 6; bx++) {
              var x = padL + bx * gW / 6;
              cx.beginPath(); cx.moveTo(x, padT); cx.lineTo(x, padT + gH); cx.stroke();
              cx.fillStyle = '#475569'; cx.font = '7px sans-serif'; cx.textAlign = 'center';
              cx.fillText('10^' + bx, x, H - 5);
            }
            for (var by = 0; by <= 4; by++) {
              var y = padT + by * gH / 4;
              cx.beginPath(); cx.moveTo(padL, y); cx.lineTo(padL + gW, y); cx.stroke();
              cx.fillStyle = '#475569'; cx.font = '7px sans-serif'; cx.textAlign = 'right';
              var dbVal = gainDB + 10 - by * 10;
              cx.fillText(dbVal.toFixed(0) + 'dB', padL - 3, y + 3);
            }

            // Bode magnitude curve
            var fLow = 100; // low-frequency pole
            var fHigh = 1e6 / absGain; // high-frequency pole (GBW)
            cx.strokeStyle = '#22D3EE'; cx.lineWidth = 2; cx.beginPath();
            for (var fi = 0; fi <= 200; fi++) {
              var fLog = fi * 6 / 200;
              var fHz = Math.pow(10, fLog);
              var magLow = 1 / Math.sqrt(1 + Math.pow(fLow / fHz, 2));
              var magHigh = 1 / Math.sqrt(1 + Math.pow(fHz / fHigh, 2));
              var mag = absGain * magLow * magHigh;
              var magdB = 20 * Math.log10(Math.max(0.01, mag));
              var px = padL + fLog / 6 * gW;
              var py = padT + gH / 2 - (magdB - gainDB + 20) / 40 * gH;
              py = Math.max(padT, Math.min(padT + gH, py));
              if (fi === 0) cx.moveTo(px, py); else cx.lineTo(px, py);
            }
            cx.stroke();

            // -3dB line
            cx.strokeStyle = '#F87171'; cx.lineWidth = 0.5; cx.setLineDash([4, 3]);
            var m3dBY = padT + gH / 2 - (gainDB - 3 - gainDB + 20) / 40 * gH;
            cx.beginPath(); cx.moveTo(padL, m3dBY); cx.lineTo(padL + gW, m3dBY); cx.stroke();
            cx.setLineDash([]);
            cx.fillStyle = '#F87171'; cx.font = '7px sans-serif'; cx.textAlign = 'left';
            cx.fillText('-3dB', padL + 3, m3dBY - 3);

            // Freq marker
            var freqLog = Math.log10(freq);
            var markerX = padL + freqLog / 6 * gW;
            cx.strokeStyle = '#F59E0B'; cx.lineWidth = 1; cx.setLineDash([3, 2]);
            cx.beginPath(); cx.moveTo(markerX, padT); cx.lineTo(markerX, padT + gH); cx.stroke();
            cx.setLineDash([]);
            cx.fillStyle = '#F59E0B'; cx.font = 'bold 8px sans-serif'; cx.textAlign = 'center';
            cx.fillText(freq >= 1000 ? (freq / 1000) + 'kHz' : freq + 'Hz', markerX, padT - 5);

            // Axes
            cx.fillStyle = '#94A3B8'; cx.font = '8px sans-serif'; cx.textAlign = 'center';
            cx.fillText('Frequency (Hz)', W / 2, H - 15);
          } else {
            // Time-domain waveforms
            var padL = 15, padR = 15, padT = 15, padB = 10;
            var gW = W - padL - padR, halfH = (H - padT - padB) / 2 - 5;
            var tick = Date.now();

            // Input waveform (top half)
            cx.fillStyle = '#1E293B'; cx.fillRect(padL, padT, gW, halfH);
            cx.strokeStyle = '#22D3EE'; cx.lineWidth = 1.5; cx.beginPath();
            for (var ti = 0; ti <= gW; ti++) {
              var t = ti / gW * 4;
              var vIn = Vin * Math.sin(2 * Math.PI * t + tick / 500);
              var py = padT + halfH / 2 - (vIn / (Vin * 1.3)) * halfH / 2;
              if (ti === 0) cx.moveTo(padL + ti, py); else cx.lineTo(padL + ti, py);
            }
            cx.stroke();
            // Zero line
            cx.strokeStyle = '#475569'; cx.lineWidth = 0.5;
            cx.beginPath(); cx.moveTo(padL, padT + halfH / 2); cx.lineTo(padL + gW, padT + halfH / 2); cx.stroke();
            cx.fillStyle = '#22D3EE'; cx.font = '9px sans-serif'; cx.textAlign = 'left';
            cx.fillText('V\u1D62\u2099 = ' + (Vin * 1000).toFixed(0) + ' mV peak', padL + 5, padT + 12);

            // Output waveform (bottom half)
            var outTop = padT + halfH + 10;
            cx.fillStyle = '#1E293B'; cx.fillRect(padL, outTop, gW, halfH);
            cx.strokeStyle = '#34D399'; cx.lineWidth = 1.5; cx.beginPath();
            var VoutPeak = Math.min(Vdd / 2, Math.abs(amp.gain * Vin));
            for (var to = 0; to <= gW; to++) {
              var tOut = to / gW * 4;
              var vOut = VoutPeak * Math.sin(2 * Math.PI * tOut + tick / 500 + (inverts ? Math.PI : 0));
              var clipped = Math.max(-Vdd / 2, Math.min(Vdd / 2, vOut));
              var pyo = outTop + halfH / 2 - (clipped / (VoutPeak * 1.3 + 0.001)) * halfH / 2;
              if (to === 0) cx.moveTo(padL + to, pyo); else cx.lineTo(padL + to, pyo);
            }
            cx.stroke();
            // Zero line
            cx.strokeStyle = '#475569'; cx.lineWidth = 0.5;
            cx.beginPath(); cx.moveTo(padL, outTop + halfH / 2); cx.lineTo(padL + gW, outTop + halfH / 2); cx.stroke();
            cx.fillStyle = '#34D399'; cx.font = '9px sans-serif'; cx.textAlign = 'left';
            cx.fillText('V\u2092\u1D64\u209C = ' + (VoutPeak * 1000).toFixed(0) + ' mV peak' + (inverts ? ' (inverted)' : ''), padL + 5, outTop + 12);

            // Gain label
            cx.fillStyle = '#F59E0B'; cx.font = 'bold 10px sans-serif'; cx.textAlign = 'center';
            cx.fillText('A\u1D65 = ' + amp.gain + ' (' + gainDB.toFixed(1) + ' dB)', W / 2, padT + halfH + 7);
          }
        };

        var animRef = React.useRef(null);
        React.useEffect(function() {
          var canvas = document.getElementById('semi-amp-canvas');
          if (!canvas) return;
          function draw() { canvasRef(canvas); animRef.current = requestAnimationFrame(draw); }
          draw();
          return function() { cancelAnimationFrame(animRef.current); };
        }, [d.ampType, d.ampVin, d.ampFreq, d.ampVdd, d.ampRd, d.ampShowBode, d.ampBiasPoint]);

        return h('div', null,
          h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
            Object.keys(AMP_TYPES).map(function(key) {
              var a = AMP_TYPES[key];
              return pill(a.icon + ' ' + a.name.split(' ')[0], ampType === key, function() {
                upd('ampType', key);
                tryAwardXP('amp-' + key, 8, 'Explored ' + a.name + ' amplifier');
              });
            })
          ),
          h('canvas', { 'aria-label': 'Semiconductor visualization',
            id: 'semi-amp-canvas', width: 440, height: 240,
            className: 'w-full rounded-lg bg-slate-900 border border-slate-700',
            role: 'img', 'aria-label': amp.name + ' amplifier with gain ' + amp.gain
          }),
          sliderRow('V\u1D62\u2099', Vin * 1000, 1, 200, 1, function(v) { upd('ampVin', v / 1000); }, ' mV'),
          sliderRow('Frequency', freq, 10, 100000, 10, function(v) { upd('ampFreq', v); }, ' Hz'),
          (gradeBand === '6-8' || gradeBand === '9-12') && sliderRow('VDD', Vdd, 1, 12, 0.5, function(v) { upd('ampVdd', v); }, ' V'),
          (gradeBand === '9-12') && sliderRow('R\u2093', Rd / 1000, 1, 100, 1, function(v) { upd('ampRd', v * 1000); }, ' k\u03A9'),
          h('div', { className: 'flex items-center gap-3 mt-2' },
            pill('\uD83D\uDCC9 Waveform', !showBode, function() { upd('ampShowBode', false); }),
            pill('\uD83D\uDCC8 Bode Plot', showBode, function() { upd('ampShowBode', true); tryAwardXP('amp-bode', 10, 'Explored frequency response'); })
          ),
          // Stats
          h('div', { className: 'flex gap-2 mt-2 flex-wrap' },
            statBadge('Gain', amp.gain + ' (' + gainDB.toFixed(1) + ' dB)'),
            statBadge('Z\u1D62\u2099', amp.inputZ),
            statBadge('Z\u2092\u1D64\u209C', amp.outputZ),
            statBadge('BW', amp.bandwidth),
            statBadge('Inverts', inverts ? 'Yes' : 'No', inverts ? 'text-amber-400' : 'text-emerald-400')
          ),
          h('div', { className: 'mt-2 p-2 rounded-lg border border-slate-700 bg-slate-800/40 text-xs text-slate-300' }, amp.desc),
          infoBox(gradeText(
            'An amplifier makes small signals bigger! Like a megaphone for electricity. You speak softly in, and it comes out loud!',
            'Amplifiers use transistors to make weak signals stronger. The gain tells you how much bigger the output is. Some amplifiers flip the signal upside down (inversion). They\'re in phones, radios, and speakers!',
            'Voltage gain: A\u1D65 = V\u2092\u1D64\u209C/V\u1D62\u2099. Common source: A\u1D65 = -g\u2098R\u2093 where g\u2098 = 2I\u2093/(V\u2097\u209B-V\u209C\u2095). Bandwidth-gain tradeoff: GBW = A\u1D65 \u00D7 f\u2083\u2093\u0042. Input/output impedance determines loading effects.',
            'Small-signal model: hybrid-\u03C0 for BJT, MOSFET small-signal params: g\u2098 = \u2202I\u2093/\u2202V\u2097\u209B, r\u2092 = 1/\u03BB\u00B7I\u2093. Miller effect: C\u2098\u2097 = C\u2097\u2093(1+|A\u1D65|). Cascode: improved bandwidth via reduced Miller effect. Diff pair CMRR = A\u2093\u2098/A\u1D9C\u2098 \u221D g\u2098R\u209B\u209B. Noise figure: NF = 10\u00B7log(1 + v\u2099\u00B2/(4kTR\u209B)).'
          )),
          h('div', { className: 'flex gap-2 mt-2' },
            btn('\uD83E\uDD16 AI Explain', function() { askAI(amp.name + ' amplifier gain and frequency response'); }, 'bg-indigo-600 text-white hover:bg-indigo-700'),
            btn('\uD83D\uDD0A Read', function() { speakText(amp.name + '. Voltage gain is ' + amp.gain + ', or ' + gainDB.toFixed(1) + ' decibels. Input impedance: ' + amp.inputZ + '. ' + (inverts ? 'This amplifier inverts the signal.' : 'This amplifier does not invert.')); }, 'bg-slate-600 text-slate-200 hover:bg-slate-500')
          ),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // CHALLENGE MODE — 10-Tier Progression
      // ════════════════════════════════════════════
      var CHALLENGES = [
        // Tier 0 — Cadet
        { q: 'Silicon has a band gap of ~1.12 eV. Is it a conductor, semiconductor, or insulator?', a: 'Semiconductor', opts: ['Conductor', 'Semiconductor', 'Insulator'], xp: 10, tier: 0, hint: 'Band gaps between 0.5 and 3.5 eV are semiconductors.', topic: 'bandgap' },
        { q: 'Phosphorus has 5 valence electrons. Adding it to silicon creates what type?', a: 'N-type', opts: ['N-type', 'P-type', 'Intrinsic'], xp: 10, tier: 0, hint: 'Extra electrons = N for Negative charge carriers.', topic: 'doping' },
        { q: 'Which logic gate outputs HIGH only when BOTH inputs are HIGH?', a: 'AND', opts: ['OR', 'AND', 'XOR', 'NAND'], xp: 10, tier: 0, hint: 'Think of it as multiplication: 1\u00D71=1, everything else=0.', topic: 'gates' },
        // Tier 1 — Technician
        { q: 'In a P-N junction at equilibrium, the depletion region has:', a: 'No free carriers', opts: ['Maximum current', 'No free carriers', 'Only holes'], xp: 15, tier: 1, hint: 'Carriers recombine at the junction leaving fixed ions.', topic: 'pnjunction' },
        { q: 'To turn ON an N-channel MOSFET, the gate voltage must be:', a: 'Above the threshold voltage', opts: ['Zero', 'Above the threshold voltage', 'Negative'], xp: 15, tier: 1, hint: 'Positive gate attracts electrons to form a channel.', topic: 'transistor' },
        { q: 'Forward biasing a P-N junction means:', a: 'Positive to P, negative to N', opts: ['Positive to P, negative to N', 'Negative to P, positive to N', 'No voltage'], xp: 15, tier: 1, hint: 'Forward = pushing carriers TOWARD the junction.', topic: 'pnjunction' },
        { q: 'As temperature increases, a semiconductor\'s conductivity:', a: 'Increases', opts: ['Increases', 'Decreases', 'Stays the same'], xp: 15, tier: 1, hint: 'More thermal energy = more electron-hole pairs.', topic: 'bandgap' },
        // Tier 2 — Engineer
        { q: 'A NAND gate is called "universal" because:', a: 'Any logic function can be built from NANDs', opts: ['It is the fastest', 'Any logic function can be built from NANDs', 'It uses fewest transistors'], xp: 20, tier: 2, hint: 'NAND can implement NOT, AND, OR \u2014 everything!', topic: 'gates' },
        { q: 'In CMOS technology, what does the "C" stand for?', a: 'Complementary', opts: ['Complementary', 'Conductive', 'Capacitive', 'Compound'], xp: 20, tier: 2, hint: 'PMOS + NMOS work as a complementary pair.', topic: 'transistor' },
        { q: 'GaAs is better than Si for high-frequency applications because:', a: 'Higher electron mobility', opts: ['Larger band gap', 'Higher electron mobility', 'Lower cost'], xp: 20, tier: 2, hint: 'Speed \u221D mobility. GaAs: 8500 vs Si: 1400 cm\u00B2/Vs.', topic: 'bandgap' },
        // Tier 3 — Specialist
        { q: 'A Zener diode operates in which region?', a: 'Reverse breakdown', opts: ['Forward bias', 'Reverse breakdown', 'Cutoff'], xp: 25, tier: 3, hint: 'Zener diodes are designed to conduct in reverse!', topic: 'ivcurve' },
        { q: 'In a MOSFET, the gate oxide (SiO\u2082) acts as:', a: 'An insulator between gate and channel', opts: ['A conductor', 'An insulator between gate and channel', 'A semiconductor'], xp: 25, tier: 3, hint: 'The "O" in MOS stands for Oxide (insulator).', topic: 'transistor' },
        { q: 'Boron doping creates which type of majority carriers?', a: 'Holes', opts: ['Electrons', 'Holes', 'Protons', 'Neutrons'], xp: 20, tier: 3, hint: 'Boron has 3 valence electrons (1 fewer than Si).', topic: 'doping' },
        // Tier 4 — Master
        { q: 'The built-in potential of a Si P-N junction at 300K is approximately:', a: '0.6-0.7 V', opts: ['0.1-0.2 V', '0.6-0.7 V', '1.5-2.0 V', '5.0 V'], xp: 30, tier: 4, hint: 'V\u2091\u1D62 = (kT/q)ln(N\u2090N\u2093/n\u1D62\u00B2) for typical doping levels.', topic: 'pnjunction' },
        { q: 'Which material has the widest band gap?', a: 'Diamond', opts: ['Silicon', 'GaAs', 'Diamond', 'Germanium'], xp: 25, tier: 4, hint: 'Carbon forms very strong bonds.', topic: 'bandgap' },
        { q: 'In CMOS, static power dissipation is ideally:', a: 'Zero', opts: ['Zero', 'Proportional to frequency', 'Constant', 'Proportional to VDD'], xp: 30, tier: 4, hint: 'In CMOS, one transistor is always OFF blocking current.', topic: 'transistor' },
        // Tier 5+ — Grandmaster
        { q: 'The Shockley diode equation ideality factor n equals 1 when:', a: 'Diffusion current dominates', opts: ['Recombination dominates', 'Diffusion current dominates', 'Tunneling occurs', 'Avalanche breakdown'], xp: 40, tier: 5, hint: 'n=1 for ideal junction, n=2 for recombination in depletion region.', topic: 'ivcurve' },
        { q: 'GaN is preferred for power electronics because of its:', a: 'Wide band gap and high breakdown field', opts: ['Low cost', 'Wide band gap and high breakdown field', 'High mobility', 'Small size'], xp: 35, tier: 5, hint: 'E\u2097 = 3.4 eV allows higher voltage operation.', topic: 'bandgap' },
        { q: 'A half-adder circuit requires which gates?', a: 'XOR + AND', opts: ['OR + NOT', 'XOR + AND', 'NAND + NAND', 'NOR + OR'], xp: 35, tier: 5, hint: 'Sum = A XOR B, Carry = A AND B.', topic: 'gates' },
        { q: 'The Early effect in BJTs causes:', a: 'Output current to increase with V_CE', opts: ['Output current to decrease', 'Output current to increase with V_CE', 'Base current to double', 'Thermal runaway'], xp: 40, tier: 5, hint: 'Higher V_CE widens the depletion region into the base.', topic: 'transistor' },
        // Quantum Wells
        { q: 'In a quantum well, making the well narrower causes energy levels to:', a: 'Spread further apart', opts: ['Move closer together', 'Spread further apart', 'Disappear', 'Stay the same'], xp: 15, tier: 1, hint: 'E \u221D 1/L\u00B2 \u2014 smaller box = higher energy steps.', topic: 'qwell' },
        { q: 'Quantum wells are used in which common device?', a: 'Laser diodes', opts: ['Resistors', 'Laser diodes', 'Capacitors', 'Transformers'], xp: 20, tier: 2, hint: 'Telecom lasers use InGaAsP quantum wells for precise wavelength control.', topic: 'qwell' },
        { q: 'In an infinite potential well, the ground state energy is proportional to:', a: 'n\u00B2/L\u00B2', opts: ['n/L', 'n\u00B2/L\u00B2', 'L/n', 'L\u00B2/n'], xp: 30, tier: 4, hint: 'E\u2099 = n\u00B2\u03C0\u00B2\u0127\u00B2/(2m*L\u00B2).', topic: 'qwell' },
        // Memory
        { q: 'SRAM uses how many transistors per bit?', a: '6', opts: ['1', '2', '4', '6'], xp: 10, tier: 0, hint: '6T SRAM: 2 cross-coupled inverters (4T) + 2 access transistors.', topic: 'memory' },
        { q: 'DRAM must be refreshed because:', a: 'The capacitor charge leaks away', opts: ['Transistors overheat', 'The capacitor charge leaks away', 'Wires corrode', 'Power supply fluctuates'], xp: 15, tier: 1, hint: 'DRAM stores bits as charge on a tiny capacitor \u2014 it leaks!', topic: 'memory' },
        { q: 'Flash memory stores data by trapping electrons on a:', a: 'Floating gate', opts: ['Control gate', 'Floating gate', 'Base region', 'Emitter'], xp: 20, tier: 2, hint: 'The floating gate is electrically isolated by oxide layers.', topic: 'memory' },
        { q: 'Which memory type is used in CPU L1 cache?', a: 'SRAM', opts: ['DRAM', 'SRAM', 'Flash', 'MRAM'], xp: 20, tier: 3, hint: 'L1 cache needs the fastest possible access time.', topic: 'memory' },
        // Amplifiers
        { q: 'A common-source MOSFET amplifier does what to the signal?', a: 'Amplifies and inverts it', opts: ['Only amplifies', 'Amplifies and inverts it', 'Only inverts', 'Attenuates it'], xp: 15, tier: 1, hint: 'Gain is negative: A\u1D65 = -g\u2098R\u2093.', topic: 'amplifier' },
        { q: 'What does a source follower (common drain) provide?', a: 'Gain \u2248 1 with low output impedance', opts: ['High voltage gain', 'Gain \u2248 1 with low output impedance', 'Current amplification only', 'Frequency doubling'], xp: 20, tier: 2, hint: 'It\'s a buffer: unity gain, impedance transformation.', topic: 'amplifier' },
        { q: 'The gain-bandwidth product (GBW) of an amplifier is:', a: 'Constant', opts: ['Constant', 'Proportional to gain', 'Proportional to bandwidth', 'Random'], xp: 30, tier: 4, hint: 'Higher gain = lower bandwidth. A\u1D65 \u00D7 BW = GBW = constant.', topic: 'amplifier' }
      ];

      function renderChallenge() {
        var tier = d.challengeTier || 0;
        var score = d.challengeScore || 0;
        var streak = d.challengeStreak || 0;
        var idx = d.challengeIdx || 0;
        var misses = d.challengeMisses || 0;

        var tierNames = ['Cadet', 'Technician', 'Engineer', 'Specialist', 'Master', 'Grandmaster'];
        var tierColors = ['text-slate-400', 'text-blue-400', 'text-cyan-400', 'text-purple-400', 'text-amber-400', 'text-red-400'];
        var tierName = tierNames[Math.min(tier, tierNames.length - 1)];
        var tierColor = tierColors[Math.min(tier, tierColors.length - 1)];

        var available = CHALLENGES.filter(function(c) { return c.tier <= tier; });
        var current = d.challengeActive ? available[idx % available.length] : null;

        if (!d.challengeActive) {
          return h('div', { className: 'text-center py-6' },
            h('div', { className: 'text-4xl mb-2' }, '\uD83C\uDFC6'),
            h('div', { className: 'text-lg font-bold text-white mb-1' }, 'Semiconductor Challenge'),
            h('div', { className: 'flex justify-center gap-3 mb-3' },
              statBadge('Score', String(score)),
              statBadge('Rank', tierName, tierColor),
              statBadge('Streak', streak > 0 ? '\uD83D\uDD25 ' + streak : '0'),
              statBadge('Questions', String(CHALLENGES.length))
            ),
            // Tier progress bar
            h('div', { className: 'w-48 mx-auto mb-4' },
              h('div', { className: 'text-[11px] text-slate-600 mb-1' }, 'Progress to next rank'),
              h('div', { className: 'h-2 bg-slate-800 rounded-full overflow-hidden' },
                h('div', { className: 'h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all', style: { width: Math.min(100, (score % 5) * 20) + '%' } })
              )
            ),
            btn('\uD83D\uDE80 Start Challenge', function() { updMulti({ challengeActive: true, challengeFeedback: null, challengeAnswer: null, challengeIdx: Math.floor(Math.random() * available.length), challengeShowHint: false }); }, 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white px-6 py-2 text-sm')
          );
        }

        return h('div', null,
          // Header stats
          h('div', { className: 'flex items-center justify-between mb-3' },
            h('div', { className: 'flex gap-2' },
              statBadge('Score', String(score)),
              statBadge('Streak', streak > 0 ? '\uD83D\uDD25 ' + streak : '0')
            ),
            h('div', { className: 'text-xs font-bold ' + tierColor }, tierName + ' (Tier ' + (tier + 1) + ')'),
            btn('Quit', function() { upd('challengeActive', false); }, 'bg-slate-700 text-slate-300 hover:bg-slate-600')
          ),
          // Question card
          h('div', { className: 'p-4 rounded-xl bg-slate-800 border border-slate-700 mb-3' },
            current.topic && h('span', { className: 'text-[11px] uppercase tracking-wider text-cyan-500 mb-1 block' }, current.topic),
            h('p', { className: 'text-sm font-semibold text-white mb-3', role: 'status' }, current.q),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-col gap-2' },
              current.opts.map(function(opt) {
                var isSelected = d.challengeAnswer === opt;
                var isCorrect = opt === current.a;
                var showResult = d.challengeFeedback !== null;
                var optClass = 'px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ';
                if (showResult && isSelected && isCorrect) optClass += 'bg-emerald-700 text-white ring-2 ring-emerald-400';
                else if (showResult && isSelected && !isCorrect) optClass += 'bg-red-600 text-white';
                else if (showResult && isCorrect) optClass += 'bg-emerald-600/30 text-emerald-300 border border-emerald-500';
                else optClass += 'bg-slate-700 text-slate-200 hover:bg-slate-600';

                return h('button', Object.assign({
                  key: opt, disabled: showResult,
                  onClick: function() {
                    var correct = opt === current.a;
                    var newStreak = correct ? streak + 1 : 0;
                    var newMisses = correct ? misses : misses + 1;
                    updMulti({ challengeAnswer: opt, challengeFeedback: correct ? 'correct' : 'wrong', challengeStreak: newStreak, challengeMisses: newMisses });
                    if (correct) {
                      var bonusXP = newStreak >= 5 ? current.xp * 2 : newStreak >= 3 ? Math.round(current.xp * 1.5) : current.xp;
                      tryAwardXP('ch-' + idx + '-' + score, bonusXP, 'Challenge: ' + current.q.substring(0, 30) + '...');
                      if (stemBeep) stemBeep();
                      if (newStreak >= 5 && stemCelebrate) stemCelebrate();
                    }
                    if (announceToSR) announceToSR(correct ? 'Correct!' : 'Incorrect. The answer is ' + current.a);
                  },
                  className: optClass
                }, a11yClick ? a11yClick(function() {}) : {}), opt);
              })
            ),
            // Hint (show after 1 miss on this question)
            !d.challengeFeedback && h('div', { className: 'mt-2' },
              d.challengeShowHint
                ? h('div', { className: 'text-xs text-amber-400 bg-amber-900/20 rounded p-2 border border-amber-800' }, '\uD83D\uDCA1 ' + current.hint)
                : btn('\uD83D\uDCA1 Hint (-5 XP)', function() { upd('challengeShowHint', true); }, 'bg-amber-700/50 text-amber-300 hover:bg-amber-700/70')
            )
          ),
          // Feedback
          d.challengeFeedback && h('div', { className: 'text-center mb-3' },
            h('p', { className: 'text-sm font-bold ' + (d.challengeFeedback === 'correct' ? 'text-emerald-400' : 'text-red-400') },
              d.challengeFeedback === 'correct'
                ? '\u2705 Correct! +' + (streak >= 5 ? current.xp * 2 : streak >= 3 ? Math.round(current.xp * 1.5) : current.xp) + ' XP' + (streak >= 3 ? ' (\uD83D\uDD25 streak bonus!)' : '')
                : '\u274C The answer is: ' + current.a
            ),
            d.challengeFeedback === 'wrong' && current.hint && h('div', { className: 'text-xs text-amber-400 mt-1' }, '\uD83D\uDCA1 ' + current.hint),
            h('div', { className: 'mt-2' },
              btn('Next Question \u2192', function() {
                var newScore = d.challengeFeedback === 'correct' ? score + 1 : score;
                var newTier = newScore >= 15 ? 5 : newScore >= 11 ? 4 : newScore >= 8 ? 3 : newScore >= 5 ? 2 : newScore >= 3 ? 1 : 0;
                var newAvailable = CHALLENGES.filter(function(c) { return c.tier <= newTier; });
                updMulti({ challengeScore: newScore, challengeTier: newTier, challengeFeedback: null, challengeAnswer: null, challengeIdx: Math.floor(Math.random() * newAvailable.length), challengeShowHint: false });
              })
            )
          )
        );
      }

      // ════════════════════════════════════════════
      // BATTLE MODE — CHIP DEFENSE
      // ════════════════════════════════════════════
      function renderBattle() {
        var round = d.battleRound || 0;
        var playerHP = d.battleHP || 5;
        var enemyHP = d.battleEnemyHP || 5;
        var log = d.battleLog || [];
        var feedback = d.battleFeedback;
        var difficulty = d.battleDifficulty || 'cadet';

        var BATTLE_ROUNDS = [
          { enemy: '\uD83D\uDC1B Bug Swarm', desc: 'A swarm of logic bugs! What gate outputs 1 when A=0?', answer: 'NOT', opts: ['AND', 'NOT', 'OR', 'XOR'], damage: 1, xp: 15 },
          { enemy: '\u26A1 Voltage Spike', desc: 'A voltage spike is overloading! Which device regulates voltage?', answer: 'Zener diode', opts: ['Resistor', 'Zener diode', 'Capacitor', 'LED'], damage: 1, xp: 15 },
          { enemy: '\uD83D\uDD25 Thermal Runaway', desc: 'Temperature rising! In a semiconductor, increasing temp does what to conductivity?', answer: 'Increases it', opts: ['Increases it', 'Decreases it', 'No effect', 'Destroys it'], damage: 1, xp: 20 },
          { enemy: '\uD83D\uDC7E Bit Flipper', desc: 'An enemy flipped all bits! Which gate can invert every signal?', answer: 'NOT', opts: ['AND', 'OR', 'NOT', 'NAND'], damage: 1, xp: 15 },
          { enemy: '\uD83E\uDDA0 Leakage Virus', desc: 'Carriers are leaking! What narrows the depletion region?', answer: 'Forward bias', opts: ['Forward bias', 'Reverse bias', 'No bias', 'Heating'], damage: 2, xp: 25 },
          { enemy: '\uD83D\uDCA3 ESD Strike', desc: 'Electrostatic discharge! What protects ICs from ESD?', answer: 'Diode clamps', opts: ['Resistors', 'Diode clamps', 'Capacitors', 'Inductors'], damage: 2, xp: 25 },
          { enemy: '\uD83C\uDF0A Clock Jitter', desc: 'Clock is unstable! CMOS power dissipation is proportional to:', answer: 'Frequency', opts: ['Voltage only', 'Frequency', 'Temperature', 'Resistance'], damage: 2, xp: 30 },
          { enemy: '\uD83D\uDC80 BOSS: Short Circuit', desc: 'Direct short! What is the threshold voltage of a typical Si MOSFET?', answer: '~1-2V', opts: ['~0.1V', '~1-2V', '~5V', '~12V'], damage: 3, xp: 50 },
          { enemy: '\uD83C\uDF0A Quantum Tunneler', desc: 'Electrons are tunneling through the oxide! In a quantum well, narrower well =', answer: 'Wider energy spacing', opts: ['Wider energy spacing', 'Narrower spacing', 'No change', 'Infinite energy'], damage: 2, xp: 25 },
          { enemy: '\uD83D\uDCBE Memory Corruptor', desc: 'Memory bits are flipping! Which memory type needs refreshing?', answer: 'DRAM', opts: ['SRAM', 'DRAM', 'Flash', 'ROM'], damage: 1, xp: 20 },
          { enemy: '\uD83D\uDD0A Noise Invader', desc: 'Signal-to-noise ratio dropping! What does a differential amplifier reject?', answer: 'Common-mode noise', opts: ['All signals', 'Common-mode noise', 'Differential signals', 'DC voltage'], damage: 2, xp: 30 },
          { enemy: '\uD83D\uDC80 BOSS: Quantum Decoherence', desc: 'Final boss! What limits transistor scaling below ~1nm gate oxide?', answer: 'Quantum tunneling', opts: ['Overheating', 'Quantum tunneling', 'Wire resistance', 'Cost'], damage: 3, xp: 60 }
        ];

        if (!d.battleActive) {
          return h('div', { className: 'text-center py-6' },
            h('div', { className: 'text-4xl mb-2' }, '\u2694\uFE0F'),
            h('div', { className: 'text-lg font-bold text-white mb-1' }, 'Chip Defense'),
            h('div', { className: 'text-sm text-slate-500 mb-3' }, 'Protect your chip from waves of hardware enemies! Use semiconductor knowledge to fight back.'),
            h('div', { className: 'flex justify-center gap-3 mb-4' },
              statBadge('Best Score', String(d.battleScore || 0)),
              statBadge('Rounds', String(BATTLE_ROUNDS.length))
            ),
            btn('\u2694\uFE0F Start Battle', function() {
              updMulti({ battleActive: true, battleRound: 0, battleHP: 5, battleEnemyHP: 5, battleLog: [], battleFeedback: null });
              tryAwardXP('battle-start', 5, 'Started Chip Defense');
            }, 'bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-2 text-sm')
          );
        }

        var currentRound = BATTLE_ROUNDS[round % BATTLE_ROUNDS.length];
        var gameOver = playerHP <= 0;
        var victory = round >= BATTLE_ROUNDS.length;

        if (gameOver || victory) {
          return h('div', { className: 'text-center py-6' },
            h('div', { className: 'text-4xl mb-2' }, victory ? '\uD83C\uDFC6' : '\uD83D\uDCA5'),
            h('div', { className: 'text-lg font-bold ' + (victory ? 'text-emerald-400' : 'text-red-400') + ' mb-2' },
              victory ? 'CHIP DEFENDED!' : 'CHIP DESTROYED!'
            ),
            h('div', { className: 'flex justify-center gap-3 mb-4' },
              statBadge('Rounds', round + '/' + BATTLE_ROUNDS.length),
              statBadge('HP Left', String(playerHP))
            ),
            victory && (function() { tryAwardXP('battle-victory', 100, 'Defeated all enemies in Chip Defense!'); return null; })(),
            // Battle log
            log.length > 0 && h('div', { className: 'max-h-32 overflow-y-auto text-xs text-left bg-slate-800/60 rounded-lg border border-slate-700 p-2 mb-3' },
              log.map(function(entry, i) {
                return h('div', { key: i, className: 'py-0.5 ' + (entry.hit ? 'text-emerald-400' : 'text-red-400') }, entry.text);
              })
            ),
            btn('Play Again', function() { updMulti({ battleActive: false }); }, 'bg-cyan-700 text-white hover:bg-cyan-700')
          );
        }

        return h('div', null,
          // HP bars
          h('div', { className: 'flex items-center gap-3 mb-3' },
            h('div', { className: 'flex-1' },
              h('div', { className: 'text-[11px] text-slate-600 mb-0.5' }, '\uD83D\uDEE1\uFE0F Your Chip'),
              h('div', { className: 'h-3 bg-slate-800 rounded-full overflow-hidden' },
                h('div', { className: 'h-full bg-emerald-500 rounded-full transition-all', style: { width: (playerHP / 5 * 100) + '%' } })
              ),
              h('div', { className: 'text-[11px] text-emerald-400 mt-0.5' }, playerHP + '/5 HP')
            ),
            h('div', { className: 'text-sm font-bold text-slate-600' }, 'VS'),
            h('div', { className: 'flex-1' },
              h('div', { className: 'text-[11px] text-slate-600 mb-0.5 text-right' }, currentRound.enemy),
              h('div', { className: 'h-3 bg-slate-800 rounded-full overflow-hidden' },
                h('div', { className: 'h-full bg-red-500 rounded-full transition-all', style: { width: (enemyHP / 5 * 100) + '%' } })
              ),
              h('div', { className: 'text-[11px] text-red-400 mt-0.5 text-right' }, enemyHP + '/5 HP')
            )
          ),
          // Round info
          h('div', { className: 'text-xs text-slate-500 mb-1' }, 'Round ' + (round + 1) + '/' + BATTLE_ROUNDS.length),
          // Enemy card
          h('div', { className: 'p-4 rounded-xl bg-red-900/20 border border-red-800 mb-3' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-lg mb-1' }, currentRound.enemy),
            h('p', { className: 'text-sm text-white mb-3' }, currentRound.desc),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-col gap-2' },
              currentRound.opts.map(function(opt) {
                var showResult = feedback !== null;
                var isSelected = d.battleFeedback === opt || (showResult && feedback === 'wrong-' + opt);
                var isCorrect = opt === currentRound.answer;
                var optClass = 'px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ';
                if (showResult && isCorrect) optClass += 'bg-emerald-700 text-white ring-2 ring-emerald-400';
                else if (showResult && isSelected) optClass += 'bg-red-600 text-white';
                else optClass += 'bg-slate-700 text-slate-200 hover:bg-slate-600';

                return h('button', { 'aria-label': 'Select option',
                  key: opt, disabled: showResult,
                  onClick: function() {
                    var hit = opt === currentRound.answer;
                    var newLog = log.concat([{
                      text: (hit ? '\u2694\uFE0F Hit! ' : '\uD83D\uDCA5 Miss! ') + 'R' + (round + 1) + ': ' + currentRound.enemy + (hit ? ' takes damage!' : ' attacks! -' + currentRound.damage + ' HP'),
                      hit: hit
                    }]);
                    var newPlayerHP = hit ? playerHP : playerHP - currentRound.damage;
                    var newEnemyHP = hit ? enemyHP - 1 : enemyHP;
                    updMulti({
                      battleFeedback: hit ? 'correct' : 'wrong-' + opt,
                      battleHP: Math.max(0, newPlayerHP),
                      battleEnemyHP: Math.max(0, newEnemyHP),
                      battleLog: newLog
                    });
                    if (hit) {
                      tryAwardXP('battle-r' + round, currentRound.xp, 'Defeated ' + currentRound.enemy);
                      if (stemBeep) stemBeep();
                    }
                  },
                  className: optClass
                }, opt);
              })
            )
          ),
          // Next round
          feedback && h('div', { className: 'text-center' },
            btn('Next Round \u2192', function() {
              updMulti({ battleRound: round + 1, battleFeedback: null, battleEnemyHP: 5 });
            }, feedback === 'correct' ? 'bg-emerald-700 text-white' : 'bg-red-600 text-white')
          ),
          // Log
          log.length > 0 && h('div', { className: 'mt-3 max-h-24 overflow-y-auto text-xs bg-slate-800/60 rounded-lg border border-slate-700 p-2' },
            log.slice(-5).map(function(entry, i) {
              return h('div', { key: i, className: 'py-0.5 ' + (entry.hit ? 'text-emerald-400' : 'text-red-400') }, entry.text);
            })
          )
        );
      }

      // ════════════════════════════════════════════
      // LEARN TAB (grade-differentiated)
      // ════════════════════════════════════════════
      function renderLearn() {
        var TOPICS = [
          {
            title: 'What is a Semiconductor?',
            body: gradeText(
              'Some materials let electricity flow (like metal wires), and some don\'t (like rubber). Semiconductors are special \u2014 they\'re in between! We can control when they let electricity through.',
              'Semiconductors have conductivity between metals and insulators. Silicon is the most common. We control their behavior by adding tiny amounts of other elements (doping) or by applying voltage.',
              'Semiconductors have band gaps of 0.5-3.5 eV. At 0K they\'re insulators, but at room temperature thermal energy promotes some electrons across the gap. Conductivity: \u03C3 = nq\u03BC.',
              'Intrinsic carrier concentration: n\u1D62 = \u221A(N\u1D9CN\u1D65)\u00B7exp(-E\u2097/2kT). Fermi-Dirac distribution: f(E) = 1/(1+exp((E-E\u1DA0)/kT)). Effective mass accounts for band curvature: m* = \u0127\u00B2(d\u00B2E/dk\u00B2)\u207B\u00B9.'
            )
          },
          {
            title: 'Band Gap Energy',
            body: gradeText(
              'Think of it like a wall. Electricity needs to jump over the wall. Small wall = easy (conductor). Huge wall = impossible (insulator). Medium wall = controllable (semiconductor)!',
              'The band gap is the energy electrons need to become free. Conductors: no gap. Insulators: very large gap (>4 eV). Semiconductors: moderate gap that can be overcome with heat or light.',
              'E\u2097 is the energy between valence band maximum and conduction band minimum. Direct gap (GaAs): efficient photon emission. Indirect gap (Si): requires phonon assistance for optical transitions.',
              'Band structure from Bloch theorem: \u03C8(r) = u\u2096(r)\u00B7e^(ik\u00B7r). Direct gap: optical transitions at k\u2080. Indirect gap: requires phonon (momentum change). Varshni: E\u2097(T) = E\u2097(0) - \u03B1T\u00B2/(T+\u03B2).'
            )
          },
          {
            title: 'Doping & Carriers',
            body: gradeText(
              'We add special atoms to make semiconductors work! Some atoms bring extra electrons (N-type). Some create empty spots called holes (P-type). It\'s like adding ingredients to a recipe!',
              'N-type: add atoms with 5 electrons (like Phosphorus) to get extra free electrons. P-type: add atoms with 3 electrons (like Boron) to create holes. Majority carriers determine the type.',
              'Doping concentration N\u2093 or N\u2090 typically 10\u00B9\u2074-10\u00B9\u2078 cm\u207B\u00B3. Mass action law: np = n\u1D62\u00B2 always holds. Fermi level shifts: E\u1DA0-E\u1D62 = kT\u00B7ln(n/n\u1D62) for n-type.',
              'Compensation doping: n = N\u2093-N\u2090 (for N\u2093>N\u2090). Degenerate doping: E\u1DA0 inside band when N\u2093 > N\u1D9C (~10\u00B9\u2079 cm\u207B\u00B3). Carrier freeze-out at low T: n \u2248 \u221A(N\u2093N\u1D9C/2)\u00B7exp(-E\u2093/2kT).'
            )
          },
          {
            title: 'P-N Junction & Diodes',
            body: gradeText(
              'When P-type meets N-type, magic happens! A barrier forms that only lets electricity through one way \u2014 like a one-way door. This is called a diode!',
              'At the P-N junction, electrons and holes combine near the boundary creating a depletion region with an electric field. Forward bias: current flows. Reverse bias: current blocked.',
              'Built-in potential V\u2091\u1D62 \u2248 0.6-0.7V for Si. Depletion width W \u221D \u221A(V\u2091\u1D62+V\u1D63). Shockley equation: I = I\u2080(e^(V/nV\u209C)-1). Applications: rectifiers, LEDs, solar cells, Zener regulators.',
              'V\u2091\u1D62 = (kT/q)ln(N\u2090N\u2093/n\u1D62\u00B2). Junction capacitance: C\u2C7C = \u03B5A/W = C\u2C7C\u2080/\u221A(1+V\u1D63/V\u2091\u1D62). Diffusion capacitance: C\u2093 = \u03C4\u1DA0\u00B7g\u2093 = \u03C4\u1DA0\u00B7I/(nV\u209C). Breakdown: V\u2091\u1D63 \u221D E\u2097\u00B3\u00B2/(N\u2093).'
            )
          },
          {
            title: 'MOSFETs & Digital Logic',
            body: gradeText(
              'A transistor is an electric switch! Apply a small voltage to the "gate" and it opens or closes a bigger circuit. Billions of these tiny switches make up your computer!',
              'MOSFETs have a gate, source, and drain. Gate voltage above threshold creates a conductive channel. CMOS uses both N and P type MOSFETs paired together for zero standby power.',
              'MOSFET: I\u2093 = \u03BC\u00B7C\u2092\u2093\u00B7(W/L)\u00B7[(V\u2097\u209B-V\u209C\u2095)V\u2093\u209B - V\u2093\u209B\u00B2/2] (triode). Saturation: I\u2093 = (1/2)\u03BC\u00B7C\u2092\u2093\u00B7(W/L)\u00B7(V\u2097\u209B-V\u209C\u2095)\u00B2. CMOS: P\u2093\u2098\u2099 = C\u2097V\u00B2f.',
              'Subthreshold: I\u2093 = I\u2080\u00B7e^((V\u2097\u209B-V\u209C\u2095)/nV\u209C). Subthreshold swing: SS = n\u00B7V\u209C\u00B7ln(10) \u2248 60-100 mV/dec. Short-channel effects: DIBL, V\u209C\u2095 roll-off. FinFET: improved gate control via 3D geometry.'
            )
          },
          {
            title: 'Real-World Applications',
            body: gradeText(
              'Semiconductors are in everything! Phones, tablets, cars, toys, and even refrigerators. They help computers think, LEDs make light, and solar panels catch sunshine!',
              'CPUs: billions of transistors doing logic. Memory (RAM/Flash): transistors storing 1s and 0s. LEDs: P-N junctions emitting light. Solar cells: P-N junctions converting light to electricity.',
              'IC fabrication: photolithography patterns circuits at nm scale. Moore\'s Law: transistor count doubles ~2 years. Current nodes: 3-5nm (FinFET/GAA). Applications span logic, memory, power, RF, photonics.',
              'Leading-edge nodes: TSMC/Samsung 3nm GAA-FET. EUV lithography at 13.5nm wavelength. Power electronics: SiC/GaN replacing Si for high-voltage/high-frequency. Quantum computing: superconducting qubits use Josephson junctions.'
            )
          },
          {
            title: 'Quantum Confinement',
            body: gradeText(
              'When spaces are super tiny (just a few atoms wide), electrons act like waves! They can only have certain energy steps, like climbing a special staircase.',
              'Quantum wells trap electrons in ultra-thin semiconductor layers (nanometers). The particle-in-a-box model shows that smaller wells = wider energy steps. This is used in lasers and LEDs.',
              'Quantum confinement: when L \u2248 de Broglie wavelength, energy becomes quantized. E\u2099 = n\u00B2\u03C0\u00B2\u0127\u00B2/(2m*L\u00B2). Applications: QW lasers, HEMTs (2DEG), quantum dots (0D), quantum cascade lasers.',
              'Heterostructure design: band offsets determine well depth. Anderson model: \u0394Ec = \u03C7\u2082 - \u03C7\u2081. Finite well corrections reduce bound state count. Superlattices: miniband formation via Kronig-Penney model. Stark effect: QCSE for modulators.'
            )
          },
          {
            title: 'Memory Technologies',
            body: gradeText(
              'Computer memory is like a notebook for your computer! Some memory forgets when power turns off (volatile). Some remembers forever (non-volatile), like a USB drive!',
              'SRAM (6 transistors/bit) is fastest but biggest \u2192 CPU cache. DRAM (1 transistor + capacitor) is dense but needs refreshing \u2192 main memory. Flash traps electrons on a floating gate \u2192 SSDs and USB drives.',
              'SRAM: bistable cross-coupled inverters, no refresh, 6T cell, access time <1ns. DRAM: 1T1C, refresh every 64ms, trench/stack capacitors. Flash: Fowler-Nordheim tunneling for write, 10\u00B3-10\u2075 P/E cycles. 3D NAND: 100+ vertical layers.',
              'Emerging memories: STT-MRAM (spin-transfer torque, MTJ), ReRAM (resistive switching via filament), PCM (GST phase change), FeRAM (ferroelectric HfO\u2082). Neuromorphic: analog memristive weights. Memory-compute architectures for AI workloads.'
            )
          },
          {
            title: 'Amplifier Circuits',
            body: gradeText(
              'Amplifiers make tiny signals bigger! Like a megaphone for electricity. They\'re in your phone, your speakers, and everywhere sound and signals need a boost!',
              'Transistor amplifiers take a small input signal and produce a bigger output. The gain tells you how much bigger. Common types: common-source (MOSFET), common-emitter (BJT). They have tradeoffs between gain, speed, and impedance.',
              'Voltage gain: A\u1D65 = -g\u2098R\u2093 (common source). Bandwidth-gain tradeoff: GBW = A\u1D65\u00D7f\u2083\u2093\u0042. Source follower: gain \u22481, low Z\u2092\u1D64\u209C. Differential pair: rejects common-mode noise (CMRR). Miller effect limits bandwidth in CE/CS.',
              'Small-signal analysis: hybrid-\u03C0 model. Cascode: stacked transistors reduce Miller effect. Op-amps: A\u2092\u2097 > 10\u2075, virtual ground principle. Feedback: A\u1DA0 = A/(1+A\u03B2). Stability: Barkhausen criterion. Noise: thermal (4kTR), shot (2qI), flicker (1/f).'
            )
          }
        ];

        return h('div', { className: 'space-y-3' },
          h('div', { className: 'flex items-center justify-between' },
            h('div', { className: 'text-sm font-bold text-white' }, '\uD83D\uDCDA Semiconductor Concepts'),
            h('div', { className: 'text-[11px] text-slate-300 px-2 py-0.5 rounded bg-slate-800' }, 'Grade band: ' + gradeBand)
          ),
          TOPICS.map(function(item) {
            return h('details', { className: 'group', key: item.title },
              h('summary', { className: 'cursor-pointer text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors list-none flex items-center gap-1', 'aria-expanded': 'false' },
                h('span', { className: 'text-[11px] text-slate-600 group-open:rotate-90 transition-transform' }, '\u25B6'),
                item.title
              ),
              h('div', { className: 'mt-1 pl-4 text-xs text-slate-300 leading-relaxed' }, item.body)
            );
          }),
          h('div', { className: 'flex gap-2 mt-3' },
            btn('\uD83E\uDD16 AI: Explain all for my level', function() { askAI('comprehensive semiconductor overview for ' + gradeBand + ' student'); }, 'bg-indigo-600 text-white hover:bg-indigo-700'),
            btn('\uD83D\uDD0A Read intro', function() { speakText('Semiconductors are materials whose electrical conductivity is between conductors and insulators. Silicon is the most important semiconductor. We control it with doping, temperature, and voltage.'); }, 'bg-slate-600 text-slate-200 hover:bg-slate-500')
          ),
          aiBox()
        );
      }

      // ════════════════════════════════════════════
      // KEYBOARD HANDLER
      // ════════════════════════════════════════════
      React.useEffect(function() {
        function handleKey(e) {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
          var subtoolIds = SUBTOOLS.map(function(s) { return s.id; });
          var currentIdx = subtoolIds.indexOf(d.subtool);

          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            var nextIdx = (currentIdx + 1) % subtoolIds.length;
            updMulti({ subtool: subtoolIds[nextIdx], aiExplain: null });
            if (announceToSR) announceToSR('Switched to ' + SUBTOOLS[nextIdx].label);
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            var prevIdx = (currentIdx - 1 + subtoolIds.length) % subtoolIds.length;
            updMulti({ subtool: subtoolIds[prevIdx], aiExplain: null });
            if (announceToSR) announceToSR('Switched to ' + SUBTOOLS[prevIdx].label);
          } else if (e.key === 'Escape') {
            setStemLabTool(null);
          }
        }
        document.addEventListener('keydown', handleKey);
        return function() { document.removeEventListener('keydown', handleKey); };
      }, [d.subtool]);

      // ════════════════════════════════════════════
      // MAIN RENDER
      // ════════════════════════════════════════════
      var subtool = d.subtool || 'bandgap';
      var tab = stemLabTab || 'explore';

      var backBtn = h('button', Object.assign({
        onClick: function() { setStemLabTool(null); if (announceToSR) announceToSR('Returned to STEM Lab tools'); },
        className: 'flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors mb-2'
      }, a11yClick ? a11yClick(function() { setStemLabTool(null); }) : {}),
        h(ArrowLeft, { size: 14 }), ' Back to STEM Lab'
      );

      var tabBar = h('div', { className: 'flex gap-1 mb-3 border-b border-slate-700 pb-2', role: 'tablist' },
        ['explore', 'challenge', 'battle', 'learn'].map(function(tb) {
          var labels = { explore: '\uD83D\uDD2C Explore', challenge: '\uD83C\uDFC6 Challenge', battle: '\u2694\uFE0F Battle', learn: '\uD83D\uDCDA Learn' };
          return pill(labels[tb], tab === tb, function() { setStemLabTab(tb); if (announceToSR) announceToSR(tb + ' tab selected'); });
        })
      );

      var subtoolNav = tab === 'explore' ? h('div', { className: 'flex flex-wrap gap-1.5 mb-4', role: 'navigation', 'aria-label': 'Semiconductor sub-tools' },
        SUBTOOLS.map(function(st) {
          return pill(st.icon + ' ' + st.short, subtool === st.id, function() {
            updMulti({ subtool: st.id, aiExplain: null });
            if (typeof canvasNarrate === 'function') canvasNarrate('semiconductor', 'subtoolSwitch', 'Switched to ' + st.label + ' simulation.', { debounce: 500 });
            if (announceToSR) announceToSR('Selected ' + st.label + ' tool');
          });
        }),
        h('span', { className: 'text-[11px] text-slate-600 self-center ml-1' }, '\u2190\u2192 keys')
      ) : null;

      var content;
      if (tab === 'challenge') content = renderChallenge();
      else if (tab === 'battle') content = renderBattle();
      else if (tab === 'learn') content = renderLearn();
      else {
        if (subtool === 'bandgap') content = renderBandGap();
        else if (subtool === 'doping') content = renderDoping();
        else if (subtool === 'pnjunction') content = renderPNJunction();
        else if (subtool === 'transistor') content = renderTransistor();
        else if (subtool === 'gates') content = renderLogicGates();
        else if (subtool === 'ivcurve') content = renderIVCurve();
        else if (subtool === 'sandbox') content = renderCircuitSandbox();
        else if (subtool === 'waferfab') content = renderWaferFab();
        else if (subtool === 'ledspec') content = renderLedSpectrum();
        else if (subtool === 'solarcell') content = renderSolarCell();
        else if (subtool === 'moorelaw') content = renderMooreLaw();
        else if (subtool === 'qwell') content = renderQuantumWell();
        else if (subtool === 'memory') content = renderMemoryCells();
        else if (subtool === 'amplifier') content = renderAmplifier();
        else content = renderBandGap();
      }

      // Enhanced snapshot with context
      var snapshotBtn = h('button', { 'aria-label': 'Action',
        onClick: function() {
          var label = tab === 'explore' ? subtool : tab;
          var detail = '';
          if (subtool === 'bandgap') detail = ' ' + (MATERIALS[d.material] || {}).name + ' ' + d.temperature + 'K';
          else if (subtool === 'pnjunction') detail = ' V=' + (d.pnBias || 0).toFixed(1) + 'V';
          else if (subtool === 'transistor') detail = ' ' + d.transistorType + ' Vg=' + (d.gateVoltage || 0).toFixed(1);
          else if (subtool === 'gates') detail = ' ' + d.gateType + ' A=' + (d.inputA ? 1 : 0) + (d.inputB !== undefined ? ' B=' + (d.inputB ? 1 : 0) : '');
          else if (subtool === 'ivcurve') detail = ' ' + d.ivDevice + ' V=' + (d.ivSweepV || 0).toFixed(1) + 'V';
          else if (subtool === 'waferfab') detail = ' Stage ' + ((d.fabStage || 0) + 1) + '/8';
          else if (subtool === 'ledspec') detail = ' ' + (d.ledMaterial || 'GaAs') + (d.ledMixMode ? ' RGB-Mix' : '');
          else if (subtool === 'solarcell') detail = ' ' + (d.solarMaterial || 'silicon') + ' ' + (d.solarIrradiance || 1000) + 'W/m²';
          else if (subtool === 'moorelaw') detail = ' Year=' + (d.mooreYear || 2024);
          else if (subtool === 'qwell') detail = ' ' + (d.qwWidth || 5) + 'nm ' + (d.qwMaterial || 'gaas-algaas');
          else if (subtool === 'memory') detail = ' ' + (d.memType || 'sram') + ' bit=' + (d.memBitValue || 0);
          else if (subtool === 'amplifier') detail = ' ' + (d.ampType || 'common-source') + ' Vin=' + ((d.ampVin || 0.01) * 1000).toFixed(0) + 'mV';
          setToolSnapshots(function(prev) {
            return prev.concat([{
              id: 'semi-' + Date.now(), tool: 'semiconductor',
              label: 'Semi: ' + label + detail,
              data: Object.assign({}, d), timestamp: Date.now()
            }]);
          });
          addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
          if (announceToSR) announceToSR('Snapshot saved');
        },
        className: 'mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full hover:from-cyan-600 hover:to-indigo-600 shadow-md hover:shadow-lg transition-all'
      }, '\uD83D\uDCF8 Snapshot');

      // Show loading placeholder while state initializes (hooks already called above)
      if (!_semiInitialized) return h('div', { className: 'p-8 text-center text-slate-600' }, 'Loading Semiconductor Lab\u2026');

      return h('div', { className: 'flex flex-col h-full', role: 'application', 'aria-label': 'Semiconductor Lab' },
        backBtn,
        h('div', { className: 'flex items-center gap-2 mb-2' },
          h('span', { className: 'text-2xl' }, '\uD83D\uDCA1'),
          h('h2', { className: 'text-lg font-bold text-white' }, 'Semiconductor Lab'),
          h('span', { className: 'text-[11px] text-slate-600 ml-1' }, 'v3.0'),
          h('span', { className: 'ml-auto text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400' }, '\u2B50 ' + (getStemXP ? getStemXP() : 0) + ' XP')
        ),
        tabBar,
        subtoolNav,
        h('div', { className: 'flex-1 overflow-y-auto pr-1' }, content),
        snapshotBtn
      );
    }
  });

})();
