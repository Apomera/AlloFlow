// ═══════════════════════════════════════════
// stem_tool_economicslab.js — Economics Lab (standalone CDN module)
// 5 simulators: Supply & Demand, Personal Finance, Stock Market, Business Sim, National Economy
// AI-powered scenarios, quiz system, glossary, achievements
// Extracted from stem_tool_science.js and enhanced
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

// Dedup: skip if already registered (hub may have loaded inline copy)
if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('economicsLab'))) {

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

  // Economics Lab visual shell: scoped theme and accessibility refinements.
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-economicslab-refine-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-economicslab-refine-css';
    st.textContent = [
      '.economicslab-tool-shell{--eco-surface:var(--allo-stem-canvas,#ffffff);--eco-panel:var(--allo-stem-panel,#f8fafc);--eco-deeper:var(--allo-stem-deeper,#e2e8f0);--eco-text:var(--allo-stem-text,#0f172a);--eco-muted:var(--allo-stem-text-soft,#475569);--eco-border:var(--allo-stem-border,#cbd5e1);--eco-button:var(--allo-stem-button-bg,#f1f5f9);--eco-button-text:var(--allo-stem-button-text,#0f172a);--eco-button-border:var(--allo-stem-button-border,#cbd5e1);color:var(--eco-text);}',
      '.economicslab-tool-shell .bg-white{background:var(--eco-surface)!important;color:var(--eco-text)!important;}',
      '.economicslab-tool-shell .bg-gradient-to-r,.economicslab-tool-shell .bg-slate-50,.economicslab-tool-shell .bg-blue-50,.economicslab-tool-shell .bg-indigo-50,.economicslab-tool-shell .bg-emerald-50,.economicslab-tool-shell .bg-green-50,.economicslab-tool-shell .bg-amber-50,.economicslab-tool-shell .bg-yellow-50,.economicslab-tool-shell .bg-orange-50,.economicslab-tool-shell .bg-red-50,.economicslab-tool-shell .bg-rose-50,.economicslab-tool-shell .bg-pink-50,.economicslab-tool-shell .bg-violet-50,.economicslab-tool-shell .bg-purple-50,.economicslab-tool-shell .bg-cyan-50,.economicslab-tool-shell .bg-sky-50,.economicslab-tool-shell .bg-zinc-50{background:var(--eco-panel)!important;color:var(--eco-text)!important;}',
      '.economicslab-tool-shell .bg-slate-100,.economicslab-tool-shell .bg-blue-100,.economicslab-tool-shell .bg-indigo-100,.economicslab-tool-shell .bg-emerald-100,.economicslab-tool-shell .bg-green-100,.economicslab-tool-shell .bg-amber-100,.economicslab-tool-shell .bg-red-100,.economicslab-tool-shell .bg-rose-100,.economicslab-tool-shell .bg-violet-100,.economicslab-tool-shell .bg-purple-100,.economicslab-tool-shell .bg-sky-100{background:var(--eco-deeper)!important;}',
      '.economicslab-tool-shell .text-slate-800,.economicslab-tool-shell .text-slate-700{color:var(--eco-text)!important;}',
      '.economicslab-tool-shell .text-slate-600,.economicslab-tool-shell .text-slate-500,.economicslab-tool-shell .text-slate-400{color:var(--eco-muted)!important;}',
      '.economicslab-tool-shell input,.economicslab-tool-shell textarea,.economicslab-tool-shell select{background:var(--eco-surface)!important;color:var(--eco-text)!important;border-color:var(--eco-border)!important;}',
      '.economicslab-topic-card{background:linear-gradient(135deg,var(--eco-panel) 0%,var(--eco-surface) 100%)!important;color:var(--eco-text);border-radius:8px!important;}',
      '.economicslab-tabbar{background:var(--eco-panel)!important;border:1px solid var(--eco-border);overflow-x:auto;scrollbar-width:thin;}',
      '.economicslab-tool-shell [role="tab"]{border:1px solid transparent;min-width:112px;white-space:normal;line-height:1.15;}',
      '.economicslab-tool-shell [role="tab"][aria-selected="true"]{background:var(--eco-surface)!important;color:var(--eco-text)!important;border:1px solid var(--eco-border);}',
      '.economicslab-reference-shelf{border:1px solid var(--eco-border);border-radius:8px;background:var(--eco-panel);padding:10px 12px;margin:0 0 12px;color:var(--eco-text);}',
      '.economicslab-reference-shelf-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;}',
      '.economicslab-reference-shelf-title{font-size:11px;font-weight:900;text-transform:uppercase;color:var(--eco-text);}',
      '.economicslab-reference-shelf-count{font-size:11px;color:var(--eco-muted);}',
      '.economicslab-reference-actions{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:thin;}',
      '.economicslab-reference-chip{flex:0 0 auto;border:1px solid var(--eco-border);border-radius:999px;background:var(--eco-surface);color:var(--eco-muted);font-size:11px;font-weight:800;padding:4px 9px;white-space:nowrap;cursor:pointer;}',
      '.economicslab-reference-chip[aria-pressed="true"]{background:var(--eco-text);color:var(--eco-surface);border-color:var(--eco-text);}',
      '.economicslab-canvas-shell{border:1px solid var(--eco-border);border-radius:8px;background:var(--eco-surface);overflow:hidden;margin-bottom:12px;}',
      '.economicslab-canvas-shell canvas{border:0!important;border-radius:0!important;display:block;}',
      '.economicslab-canvas-summary{border-top:1px solid var(--eco-border);background:var(--eco-surface);padding:10px 12px;color:var(--eco-muted);font-size:11px;line-height:1.55;}',
      '.economicslab-canvas-summary strong{display:block;color:var(--eco-text);font-size:11px;margin-bottom:2px;}',
      '.economicslab-teacher-prompt{border-top:1px solid var(--eco-border);background:var(--eco-panel);padding:10px 12px;color:var(--eco-muted);font-size:11px;line-height:1.5;}',
      '.economicslab-teacher-prompt strong{display:block;color:var(--eco-text);font-size:11px;text-transform:uppercase;margin-bottom:2px;}',
      '.theme-dark .economicslab-tool-shell .text-blue-800,.theme-dark .economicslab-tool-shell .text-blue-700,.theme-dark .economicslab-tool-shell .text-blue-600,.theme-dark .economicslab-tool-shell .text-sky-800,.theme-dark .economicslab-tool-shell .text-sky-700,.theme-dark .economicslab-tool-shell .text-sky-600,.theme-dark .economicslab-tool-shell .text-cyan-800,.theme-dark .economicslab-tool-shell .text-cyan-700,.theme-dark .economicslab-tool-shell .text-cyan-600{color:#7dd3fc!important;}',
      '.theme-dark .economicslab-tool-shell .text-green-800,.theme-dark .economicslab-tool-shell .text-green-700,.theme-dark .economicslab-tool-shell .text-green-600,.theme-dark .economicslab-tool-shell .text-emerald-800,.theme-dark .economicslab-tool-shell .text-emerald-700,.theme-dark .economicslab-tool-shell .text-emerald-600{color:#86efac!important;}',
      '.theme-dark .economicslab-tool-shell .text-amber-800,.theme-dark .economicslab-tool-shell .text-amber-700,.theme-dark .economicslab-tool-shell .text-amber-600,.theme-dark .economicslab-tool-shell .text-orange-800,.theme-dark .economicslab-tool-shell .text-orange-700,.theme-dark .economicslab-tool-shell .text-orange-600{color:#fcd34d!important;}',
      '.theme-dark .economicslab-tool-shell .text-red-800,.theme-dark .economicslab-tool-shell .text-red-700,.theme-dark .economicslab-tool-shell .text-red-600,.theme-dark .economicslab-tool-shell .text-rose-800,.theme-dark .economicslab-tool-shell .text-rose-700,.theme-dark .economicslab-tool-shell .text-rose-600{color:#fda4af!important;}',
      '.theme-dark .economicslab-tool-shell .text-purple-800,.theme-dark .economicslab-tool-shell .text-purple-700,.theme-dark .economicslab-tool-shell .text-purple-600,.theme-dark .economicslab-tool-shell .text-violet-800,.theme-dark .economicslab-tool-shell .text-violet-700,.theme-dark .economicslab-tool-shell .text-violet-600,.theme-dark .economicslab-tool-shell .text-indigo-800,.theme-dark .economicslab-tool-shell .text-indigo-700,.theme-dark .economicslab-tool-shell .text-indigo-600{color:#c4b5fd!important;}',
      '.theme-contrast .economicslab-tool-shell *{box-shadow:none!important;text-shadow:none!important;}',
      '.theme-contrast .economicslab-tool-shell button:not([aria-pressed="true"]):not([aria-selected="true"]){background:var(--eco-button)!important;color:var(--eco-button-text)!important;border-color:var(--eco-button-border)!important;}',
      '.theme-contrast .economicslab-tool-shell [role="tab"][aria-selected="true"]{outline:2px solid var(--eco-text);outline-offset:-2px;}',
      '.theme-contrast .economicslab-tool-shell .text-blue-800,.theme-contrast .economicslab-tool-shell .text-blue-700,.theme-contrast .economicslab-tool-shell .text-blue-600,.theme-contrast .economicslab-tool-shell .text-sky-800,.theme-contrast .economicslab-tool-shell .text-sky-700,.theme-contrast .economicslab-tool-shell .text-sky-600,.theme-contrast .economicslab-tool-shell .text-cyan-800,.theme-contrast .economicslab-tool-shell .text-cyan-700,.theme-contrast .economicslab-tool-shell .text-cyan-600,.theme-contrast .economicslab-tool-shell .text-green-800,.theme-contrast .economicslab-tool-shell .text-green-700,.theme-contrast .economicslab-tool-shell .text-green-600,.theme-contrast .economicslab-tool-shell .text-emerald-800,.theme-contrast .economicslab-tool-shell .text-emerald-700,.theme-contrast .economicslab-tool-shell .text-emerald-600,.theme-contrast .economicslab-tool-shell .text-amber-800,.theme-contrast .economicslab-tool-shell .text-amber-700,.theme-contrast .economicslab-tool-shell .text-amber-600,.theme-contrast .economicslab-tool-shell .text-red-800,.theme-contrast .economicslab-tool-shell .text-red-700,.theme-contrast .economicslab-tool-shell .text-red-600,.theme-contrast .economicslab-tool-shell .text-rose-800,.theme-contrast .economicslab-tool-shell .text-rose-700,.theme-contrast .economicslab-tool-shell .text-rose-600,.theme-contrast .economicslab-tool-shell .text-purple-800,.theme-contrast .economicslab-tool-shell .text-purple-700,.theme-contrast .economicslab-tool-shell .text-purple-600,.theme-contrast .economicslab-tool-shell .text-violet-800,.theme-contrast .economicslab-tool-shell .text-violet-700,.theme-contrast .economicslab-tool-shell .text-violet-600,.theme-contrast .economicslab-tool-shell .text-indigo-800,.theme-contrast .economicslab-tool-shell .text-indigo-700,.theme-contrast .economicslab-tool-shell .text-indigo-600{color:var(--eco-text)!important;}',
      '.theme-contrast .economicslab-tool-shell .border-blue-200,.theme-contrast .economicslab-tool-shell .border-indigo-200,.theme-contrast .economicslab-tool-shell .border-emerald-200,.theme-contrast .economicslab-tool-shell .border-green-200,.theme-contrast .economicslab-tool-shell .border-amber-200,.theme-contrast .economicslab-tool-shell .border-red-200,.theme-contrast .economicslab-tool-shell .border-rose-200,.theme-contrast .economicslab-tool-shell .border-violet-200,.theme-contrast .economicslab-tool-shell .border-purple-200,.theme-contrast .economicslab-tool-shell .border-cyan-200,.theme-contrast .economicslab-tool-shell .border-sky-200{border-color:var(--eco-border)!important;}'
    ].join('');
    document.head.appendChild(st);
  })();


  // ── Audio (auto-injected) ──
  var _ecoAC = null;
  function getEcoAC() { if (!_ecoAC) { try { _ecoAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_ecoAC && _ecoAC.state === "suspended") { try { _ecoAC.resume(); } catch(e) {} } return _ecoAC; }
  function ecoTone(f,d,tp,v) { var ac = getEcoAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxEcoClick() { ecoTone(600, 0.03, "sine", 0.04); }
  function sfxEcoSuccess() { ecoTone(523, 0.08, "sine", 0.07); setTimeout(function() { ecoTone(659, 0.08, "sine", 0.07); }, 70); setTimeout(function() { ecoTone(784, 0.1, "sine", 0.08); }, 140); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-economicslab')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-economicslab';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  window.StemLab.registerTool('economicsLab', {
    icon: "💹",
    label: "Economics Lab",
    desc: "Explore economics through supply & demand curves, personal finance, stock-market, business, and macro-policy simulations.",
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'explore_supply_demand', label: 'Explore supply and demand curves', icon: '\uD83D\uDCC8', check: function(d) { return (d.sdDemandShift || 0) !== 0 || (d.sdSupplyShift || 0) !== 0; }, progress: function(d) { return (d.sdDemandShift || d.sdSupplyShift) ? 'Exploring!' : 'Shift a curve'; } },
      { id: 'set_price_control', label: 'Set a price floor or ceiling', icon: '\uD83D\uDCB0', check: function(d) { return (d.sdPriceFloor || 0) > 0 || (d.sdPriceCeiling || 0) > 0; }, progress: function(d) { return (d.sdPriceFloor || d.sdPriceCeiling) ? 'Set!' : 'Not yet'; } },
      { id: 'explore_3_tabs', label: 'Explore 3 economics topics', icon: '\uD83C\uDF0D', check: function(d) { return Object.keys(d.tabsViewed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.tabsViewed || {}).length + '/3 topics'; } }
    ],
    render: function(ctx) {
      // Aliases â€” maps ctx properties to original variable names
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
      // honor the 2nd-arg English fallback (ctx.t is single-arg & ignores it; see dev-tools/check_i18n_fallback.cjs)
      var t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      // The quiz / question / Life-Sim handlers call addXP(amount, reason), but
      // addXP was never defined → `typeof addXP === 'function'` was always false
      // → XP was never awarded anywhere. Define it against the host signature
      // awardStemXP(toolId, points, reason).
      var addXP = function(amount, reason) { if (typeof awardStemXP === 'function') awardStemXP('economicsLab', amount, reason); };
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

      // â”€â”€ Tool body (economicsLab) â”€â”€
      return (function() {
var d = labToolData || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('economicsLab', 'init', {
              first: 'Economics Lab loaded. Explore supply and demand, market simulations, and economic concepts with interactive models.',
              repeat: 'Economics Lab active.',
              terse: 'Economics.'
            }, { debounce: 800 });
          }

          var upd = function (k, v) { setLabToolData(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); };

          var econTab = d.econTab || 'supplyDemand';

          if (!window._econCanvasRef) window._econCanvasRef = { current: null };

          var canvasRef = window._econCanvasRef;



          // â”€â”€ Supply & Demand State â”€â”€

          var sdDemandShift = d.sdDemandShift || 0;

          var sdSupplyShift = d.sdSupplyShift || 0;

          var sdPriceFloor = d.sdPriceFloor || 0;

          var sdPriceCeiling = d.sdPriceCeiling || 0;

          var sdTax = d.sdTax || 0;

          // Curve slopes = elasticity levers. Flat (0.3) = elastic, steep (1.5)
          // = inelastic. Every S&D formula below (equilibrium, floor/ceiling
          // markers, tax wedge, probe, canvas summary) derives from these two —
          // change them TOGETHER or the graph and its annotations disagree.

          var sdDemSlope = d.sdDemSlope !== undefined ? d.sdDemSlope : 0.8;

          var sdSupSlope = d.sdSupSlope !== undefined ? d.sdSupSlope : 0.8;



          // â”€â”€ Personal Finance Life Sim State â”€â”€

          var pfAge = d.pfAge || 22;

          var pfCash = d.pfCash || 2000;

          var pfDebt = d.pfDebt || 0;

          var pfSalary = d.pfSalary || 35000;

          var pfHappiness = d.pfHappiness || 70;



          // â”€â”€ Personal Finance Budget Breakdown â”€â”€

          var pfIncome = Math.round((d.pfSalary || 35000) / 12);

          var pfRent = d.pfRent || Math.round(pfIncome * 0.30);

          var pfFood = d.pfFood || Math.round(pfIncome * 0.15);

          var pfTransport = d.pfTransport || Math.round(pfIncome * 0.10);

          var pfEntertain = d.pfEntertain || Math.round(pfIncome * 0.05);

          var pfSavings = d.pfSavings || Math.round(pfIncome * 0.20);

          // Compound interest calculator state (was missing)
          var pfPrincipal = d.pfPrincipal || 1000;
          var pfRate = d.pfRate || 7;
          var pfYears = d.pfYears || 30;



          // â”€â”€ Stock Market State â”€â”€

          var smCash = d.smCash !== undefined ? d.smCash : 10000;

          var smPortfolio = d.smPortfolio || {};

          var smDay = d.smDay || 0;

          var smCompanies = d.smCompanies || [];

          var smSelected = d.smSelected || 0;

          var smNews = d.smNews || null;



          // â”€â”€ Entrepreneur State â”€â”€

          // Legacy lemonade-stand state (enDay/enCash/enPrice/enCups/enAdBudget/
          // enWeather/enHistory) removed — the live sim is d.enBusiness + enBiz*.



          // â”€â”€ National Economy (Macro) State â”€â”€

          var macroGDP = d.macroGDP || 2.1;

          var macroInflation = d.macroInflation || 3.2;

          var macroInterest = d.macroInterest || 5.25;

          var macroUnemployment = d.macroUnemployment || 3.8;

          var macroTrade = d.macroTrade || -0.5;

          var macroYear = d.macroYear || 2025;

          var macroHistory = d.macroHistory || [];



          // â”€â”€ Achievement Tracking â”€â”€

          // Net worth = liquid cash + home equity + investment portfolio \u2212 debt.
          // The "Net worth" achievements check this, not raw cash, so investing
          // and homeownership count toward them (they are assets, not losses).
          var pfNetWorth = (d.pfCash || 2000) + (d.pfEquity || 0) + (d.pfInvested || 0) - (d.pfDebt || 0);

          var econAchievements = [];

          if ((d.pfCash || 0) >= 100000) econAchievements.push({ icon: '\uD83D\uDCB0', title: t('stem.economicslab.six_figures', 'Six Figures'), desc: t('stem.economicslab.saved_100k', 'Saved $100K+') });

          if (pfNetWorth >= 1000000) econAchievements.push({ icon: '\uD83D\uDC8E', title: t('stem.economicslab.millionaire', 'Millionaire'), desc: t('stem.economicslab.net_worth_1m', 'Net worth $1M+') });

          if ((d.pfAge || 22) >= 65 && pfNetWorth > 500000) econAchievements.push({ icon: '\uD83C\uDFD6\uFE0F', title: t('stem.economicslab.comfortable_retirement', 'Comfortable Retirement'), desc: t('stem.economicslab.retired_with_500k', 'Retired with $500K+') });

          if ((d.pfCredit || 650) >= 800) econAchievements.push({ icon: '\u2B50', title: t('stem.economicslab.excellent_credit', 'Excellent Credit'), desc: t('stem.economicslab.credit_score_800', 'Credit score 800+') });

          if ((d.pfHappiness || 70) >= 95) econAchievements.push({ icon: '\uD83C\uDF1F', title: t('stem.economicslab.living_the_dream', 'Living the Dream'), desc: t('stem.economicslab.95_happiness', '95%+ happiness') });

          if ((d.pfDebt || 0) === 0 && (d.pfAge || 22) > 25) econAchievements.push({ icon: '\u2705', title: t('stem.economicslab.debt_free', 'Debt Free'), desc: t('stem.economicslab.eliminated_all_debt', 'Eliminated all debt') });

          var smTotalVal = (d.smCash || 10000) + (d.smCompanies || []).reduce(function (s, c) { return s + ((d.smPortfolio || {})[c.ticker] || 0) * c.price; }, 0);

          if (smTotalVal >= 15000) econAchievements.push({ icon: '\uD83D\uDCC8', title: t('stem.economicslab.market_gains', 'Market Gains'), desc: t('stem.economicslab.portfolio_grew_50', 'Portfolio grew 50%+') });

          if (smTotalVal >= 25000) econAchievements.push({ icon: '\uD83D\uDE80', title: t('stem.economicslab.wall_street_wolf', 'Wall Street Wolf'), desc: t('stem.economicslab.portfolio_hit_25k', 'Portfolio hit $25K') });

          if ((d.smDay || 0) >= 30) econAchievements.push({ icon: '\uD83D\uDCC5', title: t('stem.economicslab.seasoned_trader', 'Seasoned Trader'), desc: t('stem.economicslab.30_trading_days', '30+ trading days') });

          if ((d.enBizDay || 0) >= 20) econAchievements.push({ icon: '\uD83C\uDFC6', title: t('stem.economicslab.business_survivor', 'Business Survivor'), desc: t('stem.economicslab.20_days_in_business', '20+ days in business') });

          if ((d.enBizCash || 0) >= 50000) econAchievements.push({ icon: '\uD83D\uDCBC', title: t('stem.economicslab.tycoon', 'Tycoon'), desc: t('stem.economicslab.business_cash_50k', 'Business cash $50K+') });

          if ((d.enBizRep || 0) >= 90) econAchievements.push({ icon: '\uD83C\uDF1F', title: t('stem.economicslab.5_star_business', '5-Star Business'), desc: t('stem.economicslab.reputation_90', 'Reputation 90+') });

          if ((d.enBizEmployees || 0) >= 5) econAchievements.push({ icon: '\uD83D\uDC65', title: t('stem.economicslab.job_creator', 'Job Creator'), desc: t('stem.economicslab.hired_5_employees', 'Hired 5+ employees') });

          if ((d.macroHistory || []).length >= 10) econAchievements.push({ icon: '\uD83C\uDFDB\uFE0F', title: t('stem.economicslab.policy_veteran', 'Policy Veteran'), desc: t('stem.economicslab.10_years_of_policy', '10+ years of policy') });

          if (macroGDP >= 5) econAchievements.push({ icon: '\uD83D\uDCC8', title: t('stem.economicslab.economic_boom', 'Economic Boom'), desc: t('stem.economicslab.gdp_growth_5', 'GDP growth 5%+') });

          if (macroUnemployment <= 2) econAchievements.push({ icon: '\uD83D\uDCAA', title: t('stem.economicslab.full_employment', 'Full Employment'), desc: t('stem.economicslab.unemployment_2', 'Unemployment <2%') });

          var lastMacroYr = (d.macroHistory || [])[(d.macroHistory || []).length - 1];

          if ((d.macroHistory || []).length >= 3 && lastMacroYr && lastMacroYr.gdp >= 2 && lastMacroYr.gdp <= 4 && lastMacroYr.inflation >= 1 && lastMacroYr.inflation <= 3 && lastMacroYr.unemployment < 5) econAchievements.push({ icon: '\uD83D\uDEEC', title: t('stem.economicslab.soft_landing', 'Soft Landing'), desc: t('stem.economicslab.soft_landing_desc', '3+ years in: growth 2\u20134%, inflation 1\u20133%, unemployment <5%') });

          var conceptsLearned = (d.econGlossary || []).length;

          // Economic Literacy Score (0-100)

          var econLiteracyScore = Math.min(100, Math.round(

            conceptsLearned * 2 +

            Math.min(20, (d.pfHistory || []).length * 1.5) +

            Math.min(15, (d.smDay || 0) * 0.5) +

            Math.min(15, (d.enBizDay || 0) * 0.75) +

            Math.min(15, (d.macroHistory || []).length * 1.5) +

            Math.min(10, (d.quizScore || 0) * 2) +

            (econAchievements.length * 0.5)

          ));

          if (conceptsLearned >= 5) econAchievements.push({ icon: '\uD83D\uDCDA', title: t('stem.economicslab.student', 'Student'), desc: t('stem.economicslab.5_concepts_learned', '5+ concepts learned') });

          if (conceptsLearned >= 15) econAchievements.push({ icon: '\uD83C\uDF93', title: t('stem.economicslab.economics_major', 'Economics Major'), desc: t('stem.economicslab.15_concepts_learned', '15+ concepts learned') });

          if (conceptsLearned >= 30) econAchievements.push({ icon: '\uD83E\uDDD1\u200D\uD83C\uDF93', title: t('stem.economicslab.phd_economist', 'PhD Economist'), desc: t('stem.economicslab.30_concepts_learned', '30+ concepts learned') });

          if (((d.policyIQ || {}).log || []).length >= 3) econAchievements.push({ icon: '\uD83D\uDD2C', title: t('stem.economicslab.macro_researcher', 'Macro Researcher'), desc: t('stem.economicslab.logged_3_policy_mixes', 'Logged 3+ policy mixes in Policy Inquiry') });

          // === Wave 1: ECON_CONCEPTS ===
          var ECON_CONCEPTS = [
            { id: 'scarcity', name: t('stem.economicslab.scarcity', 'Scarcity'), icon: '\u26A0\uFE0F', def: 'Limited resources vs unlimited wants. The fundamental economic problem.', example: 'There are only 24 hours in a day \u2014 you can\'t do everything.', category: 'fundamentals' },
            { id: 'oppCost', name: t('stem.economicslab.opportunity_cost', 'Opportunity Cost'), icon: '\uD83D\uDD04', def: 'The value of the next best alternative you give up when making a choice.', example: 'Going to college costs tuition PLUS the salary you could have earned working.', category: 'fundamentals' },
            { id: 'supplyDemand', name: t('stem.economicslab.supply_demand', 'Supply & Demand'), icon: '\u2696\uFE0F', def: 'Prices are determined by the interaction of buyers (demand) and sellers (supply).', example: 'When a new iPhone launches, high demand + limited supply = high price.', category: 'micro' },
            { id: 'marginal', name: t('stem.economicslab.marginal_analysis', 'Marginal Analysis'), icon: '\uD83D\uDCC8', def: 'Decisions should be made by comparing the additional (marginal) benefit to the additional cost.', example: 'Is one more hour of study worth giving up one more hour of sleep?', category: 'fundamentals' },
            { id: 'incentives', name: t('stem.economicslab.incentives', 'Incentives'), icon: '\uD83C\uDFAF', def: 'People respond to rewards and penalties. Change the incentives, change the behavior.', example: 'Tax credits for electric cars increase EV purchases.', category: 'fundamentals' },
            { id: 'gdp', name: 'GDP', icon: '\uD83C\uDFDB\uFE0F', def: 'Gross Domestic Product: total value of all goods and services produced in a country in a year.', example: 'US GDP is ~$27 trillion (2024). GDP = C + I + G + (X - M).', category: 'macro' },
            { id: 'inflation', name: t('stem.economicslab.inflation', 'Inflation'), icon: '\uD83D\uDCC8', def: 'A general increase in prices over time, reducing purchasing power.', example: 'If inflation is 3%, something that cost $100 last year costs $103 now.', category: 'macro' },
            { id: 'unemployment', name: t('stem.economicslab.unemployment', 'Unemployment'), icon: '\uD83D\uDCBC', def: 'The percentage of the labor force that is jobless and actively seeking work.', example: 'Frictional (between jobs), structural (skills mismatch), cyclical (recession).', category: 'macro' },
            { id: 'compAdv', name: t('stem.economicslab.comparative_advantage', 'Comparative Advantage'), icon: '\uD83C\uDF0D', def: 'Countries should specialize in producing goods where they have the lowest opportunity cost.', example: 'Even if Country A is better at everything, both benefit by specializing.', category: 'trade' },
            { id: 'elasticity', name: t('stem.economicslab.elasticity', 'Elasticity'), icon: '\uD83C\uDFF9', def: 'How much quantity demanded/supplied changes in response to a price change.', example: 'Gasoline is inelastic (need it regardless), luxury goods are elastic.', category: 'micro' },
            { id: 'externality', name: t('stem.economicslab.externalities', 'Externalities'), icon: '\u2601\uFE0F', def: 'Costs or benefits that affect third parties not involved in the transaction.', example: 'Pollution (negative externality), education (positive externality).', category: 'micro' },
            { id: 'publicGood', name: t('stem.economicslab.public_goods', 'Public Goods'), icon: '\uD83D\uDEE3\uFE0F', def: 'Non-rival and non-excludable goods that markets underprovide.', example: 'National defense, street lights, public parks.', category: 'micro' },
            { id: 'moneySupply', name: t('stem.economicslab.money_supply', 'Money Supply'), icon: '\uD83D\uDCB5', def: 'The total amount of money circulating in the economy, controlled by the central bank.', example: 'The Fed controls M1 (cash + checking) and M2 (M1 + savings + CDs).', category: 'macro' },
            { id: 'fiscalPolicy', name: t('stem.economicslab.fiscal_policy', 'Fiscal Policy'), icon: '\uD83C\uDFDB\uFE0F', def: 'Government use of taxation and spending to influence the economy.', example: 'Stimulus checks during COVID = expansionary fiscal policy.', category: 'macro' },
            { id: 'monetaryPolicy', name: t('stem.economicslab.monetary_policy', 'Monetary Policy'), icon: '\uD83C\uDFE6', def: 'Central bank actions (interest rates, money supply) to manage the economy.', example: 'The Fed raising interest rates to fight inflation.', category: 'macro' },
            { id: 'tradeoff', name: 'Trade-offs', icon: '\u2194\uFE0F', def: 'Every choice involves giving something up. There is no free lunch.', example: 'More military spending = less education funding (government budget).', category: 'fundamentals' },
            { id: 'marketFailure', name: t('stem.economicslab.market_failure', 'Market Failure'), icon: '\u274C', def: 'When free markets fail to allocate resources efficiently.', example: 'Monopolies, externalities, public goods, information asymmetry.', category: 'micro' },
            { id: 'compoundInterest', name: t('stem.economicslab.compound_interest', 'Compound Interest'), icon: '\uD83D\uDCCA', def: 'Interest earned on interest. The most powerful force in finance.', example: '$1,000 at 7% for 30 years = $7,612. Time is your greatest asset!', category: 'finance' },
            { id: 'riskReturn', name: t('stem.economicslab.risk_vs_return', 'Risk vs Return'), icon: '\u2696\uFE0F', def: 'Higher potential returns require accepting higher risk.', example: 'Stocks: ~10% return, high risk. Bonds: ~4% return, low risk.', category: 'finance' },
            { id: 'diversification', name: t('stem.economicslab.diversification', 'Diversification'), icon: '\uD83E\uDDE9', def: 'Spreading investments across many assets to reduce risk.', example: '"Don\'t put all your eggs in one basket." Index funds diversify automatically.', category: 'finance' }
          ];

          // === Wave 1: FAMOUS_ECONOMISTS ===
          var FAMOUS_ECONOMISTS = [
            { name: t('stem.economicslab.adam_smith', 'Adam Smith'), years: '1723\u20131790', icon: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74\uDB40\uDC7F', contribution: 'Father of Economics', work: 'The Wealth of Nations (1776)', idea: 'The "invisible hand" of the market: individuals pursuing self-interest unintentionally benefit society. Division of labor increases productivity.', school: 'Classical' },
            { name: t('stem.economicslab.karl_marx', 'Karl Marx'), years: '1818\u20131883', icon: '\uD83C\uDDE9\uD83C\uDDEA', contribution: 'Class Struggle Theory', work: 'Das Kapital (1867)', idea: 'Capitalism exploits workers. Class conflict between bourgeoisie (owners) and proletariat (workers) drives history.', school: 'Marxian' },
            { name: t('stem.economicslab.john_maynard_keynes', 'John Maynard Keynes'), years: '1883\u20131946', icon: '\uD83C\uDDEC\uD83C\uDDE7', contribution: 'Macroeconomics Pioneer', work: 'General Theory (1936)', idea: 'Government spending can stimulate the economy during recessions. "In the long run, we are all dead."', school: 'Keynesian' },
            { name: t('stem.economicslab.milton_friedman', 'Milton Friedman'), years: '1912\u20132006', icon: '\uD83C\uDDFA\uD83C\uDDF8', contribution: 'Monetarism', work: 'Capitalism and Freedom (1962)', idea: 'Inflation is always a monetary phenomenon. Free markets work better than government intervention.', school: 'Chicago/Monetarist' },
            { name: t('stem.economicslab.friedrich_hayek', 'Friedrich Hayek'), years: '1899\u20131992', icon: '\uD83C\uDDE6\uD83C\uDDF9', contribution: 'Austrian Economics', work: 'The Road to Serfdom (1944)', idea: 'Central planning leads to tyranny. Market prices contain information no planner can replicate.', school: 'Austrian' },
            { name: t('stem.economicslab.paul_samuelson', 'Paul Samuelson'), years: '1915\u20132009', icon: '\uD83C\uDDFA\uD83C\uDDF8', contribution: 'Mathematical Economics', work: 'Economics Textbook (1948)', idea: 'Made economics rigorous with math. His textbook taught economics to millions of students worldwide.', school: 'Neo-Keynesian' },
            { name: t('stem.economicslab.janet_yellen', 'Janet Yellen'), years: '1946\u2013', icon: '\uD83C\uDDFA\uD83C\uDDF8', contribution: 'First Female Fed Chair & Treasury Sec', work: 'Labor economics research', idea: 'Focused on unemployment and labor markets. Advocated for data-driven monetary policy.', school: 'New Keynesian' },
            { name: t('stem.economicslab.thomas_sowell', 'Thomas Sowell'), years: '1930\u2013', icon: '\uD83C\uDDFA\uD83C\uDDF8', contribution: 'Economics & Social Policy', work: 'Basic Economics (2000)', idea: 'Economics is about trade-offs, not solutions. Price controls create shortages. Incentives matter more than intentions.', school: 'Chicago' },
            { name: t('stem.economicslab.elinor_ostrom', 'Elinor Ostrom'), years: '1933\u20132012', icon: '\uD83C\uDDFA\uD83C\uDDF8', contribution: 'First Female Economics Nobel', work: 'Governing the Commons (1990)', idea: 'Communities can manage shared resources without government or privatization through self-governance.', school: 'Institutional' },
            { name: t('stem.economicslab.daniel_kahneman', 'Daniel Kahneman'), years: '1934\u20132024', icon: '\uD83C\uDDEE\uD83C\uDDF1', contribution: 'Behavioral Economics', work: 'Thinking, Fast and Slow (2011)', idea: 'Humans are NOT rational. Cognitive biases (loss aversion, anchoring, framing) affect all economic decisions.', school: 'Behavioral' }
          ];

          // === Wave 1: MARKET_STRUCTURES ===
          var MARKET_STRUCTURES = [
            { id: 'perfect', name: t('stem.economicslab.perfect_competition', 'Perfect Competition'), sellers: 'Many', product: 'Identical', barriers: 'None', pricing: 'Price taker', profit: 'Normal (long run)', examples: 'Farming, commodities', color: '#22c55e', icon: '\uD83C\uDF3E' },
            { id: 'monopolistic', name: t('stem.economicslab.monopolistic_competition', 'Monopolistic Competition'), sellers: 'Many', product: 'Differentiated', barriers: 'Low', pricing: 'Some power', profit: 'Normal (long run)', examples: 'Restaurants, clothing', color: '#3b82f6', icon: '\uD83D\uDC54' },
            { id: 'oligopoly', name: t('stem.economicslab.oligopoly', 'Oligopoly'), sellers: 'Few', product: 'Similar/Identical', barriers: 'High', pricing: 'Interdependent', profit: 'Above normal', examples: 'Airlines, cell carriers, cars', color: '#f59e0b', icon: '\u2708\uFE0F' },
            { id: 'monopoly', name: t('stem.economicslab.monopoly', 'Monopoly'), sellers: 'One', product: 'Unique', barriers: 'Very high', pricing: 'Price maker', profit: 'Above normal', examples: 'Utilities, patents, De Beers', color: '#ef4444', icon: '\uD83D\uDC51' }
          ];

          // === Wave 1: GDP_COMPONENTS ===
          var GDP_COMPONENTS = [
            { id: 'C', name: t('stem.economicslab.consumption', 'Consumption'), pct: 68, color: '#3b82f6', icon: '\uD83D\uDED2', desc: t('stem.economicslab.household_spending_on_goods_and_servic', 'Household spending on goods and services. The largest component of GDP.'), examples: 'Food, clothing, healthcare, entertainment, housing' },
            { id: 'I', name: t('stem.economicslab.investment', 'Investment'), pct: 18, color: '#22c55e', icon: '\uD83C\uDFED', desc: t('stem.economicslab.business_spending_on_capital_goods_new', 'Business spending on capital goods, new construction, and inventory changes.'), examples: 'Factories, equipment, new homes, software' },
            { id: 'G', name: t('stem.economicslab.government', 'Government'), pct: 17, color: '#f59e0b', icon: '\uD83C\uDFDB\uFE0F', desc: t('stem.economicslab.government_spending_on_goods_and_servi', 'Government spending on goods and services (excludes transfer payments like Social Security).'), examples: 'Military, roads, schools, public employees' },
            { id: 'NX', name: t('stem.economicslab.net_exports_x_m', 'Net Exports (X-M)'), pct: -3, color: '#ef4444', icon: '\uD83D\uDEA2', desc: t('stem.economicslab.exports_minus_imports_currently_negati', 'Exports minus imports. Currently negative for the US (trade deficit).'), examples: 'US exports tech/agriculture, imports oil/electronics' }
          ];

          // === Wave 1: ECONOMIC_INDICATORS ===
          var ECONOMIC_INDICATORS = [
            { name: t('stem.economicslab.gdp_growth_rate', 'GDP Growth Rate'), desc: t('stem.economicslab.percentage_change_in_real_gdp_2_3_is_h', 'Percentage change in real GDP. 2-3% is healthy.'), good: '>2%', bad: '<0% (recession)', icon: '\uD83D\uDCC8' },
            { name: t('stem.economicslab.cpi_consumer_price_index', 'CPI (Consumer Price Index)'), desc: t('stem.economicslab.measures_average_price_changes_the_mai', 'Measures average price changes. The main inflation gauge.'), good: '2% target', bad: '>5% (high inflation)', icon: '\uD83D\uDCB2' },
            { name: t('stem.economicslab.unemployment_rate', 'Unemployment Rate'), desc: t('stem.economicslab.percent_of_labor_force_without_jobs_na', 'Percent of labor force without jobs. Natural rate is ~4%.'), good: '<5%', bad: '>7%', icon: '\uD83D\uDCBC' },
            { name: t('stem.economicslab.federal_funds_rate', 'Federal Funds Rate'), desc: t('stem.economicslab.interest_rate_banks_charge_each_other_', 'Interest rate banks charge each other. The Fed\'s main tool.'), good: 'Depends on inflation', bad: 'Too high or too low', icon: '\uD83C\uDFE6' },
            { name: t('stem.economicslab.s_p_500', 'S&P 500'), desc: t('stem.economicslab.index_of_500_large_us_companies_proxy_', 'Index of 500 large US companies. Proxy for the stock market.'), good: 'Upward trend', bad: '>20% drop (bear market)', icon: '\uD83D\uDCC9' },
            { name: t('stem.economicslab.consumer_confidence', 'Consumer Confidence'), desc: t('stem.economicslab.survey_of_how_optimistic_consumers_fee', 'Survey of how optimistic consumers feel about the economy.'), good: 'Rising', bad: 'Sharp decline', icon: '\uD83D\uDE04' },
            { name: t('stem.economicslab.housing_starts', 'Housing Starts'), desc: t('stem.economicslab.number_of_new_residential_construction', 'Number of new residential construction projects begun.'), good: 'Steady growth', bad: 'Sharp decline', icon: '\uD83C\uDFE0' },
            { name: t('stem.economicslab.trade_balance', 'Trade Balance'), desc: t('stem.economicslab.exports_minus_imports_surplus_positive', 'Exports minus imports. Surplus = positive, deficit = negative.'), good: 'Balance/surplus', bad: 'Large persistent deficit', icon: '\uD83D\uDEA2' },
            { name: t('stem.economicslab.national_debt', 'National Debt'), desc: t('stem.economicslab.total_government_borrowing_us_debt_is_', 'Total government borrowing. US debt is ~$34 trillion (2024).'), good: 'Stable debt-to-GDP', bad: 'Rising faster than GDP', icon: '\uD83D\uDCB3' },
            { name: t('stem.economicslab.yield_curve', 'Yield Curve'), desc: t('stem.economicslab.plots_interest_rates_vs_bond_maturity_', 'Plots interest rates vs bond maturity. Inverted = recession signal.'), good: 'Normal (upward)', bad: 'Inverted (downward)', icon: '\uD83D\uDCC9' },
            { name: t('stem.economicslab.pmi_purchasing_managers', 'PMI (Purchasing Managers)'), desc: t('stem.economicslab.survey_of_manufacturing_activity_50_ex', 'Survey of manufacturing activity. >50 = expanding, <50 = contracting.'), good: '>50', bad: '<45', icon: '\uD83C\uDFED' },
            { name: t('stem.economicslab.gini_coefficient', 'Gini Coefficient'), desc: t('stem.economicslab.measures_income_inequality_0_perfect_e', 'Measures income inequality. 0 = perfect equality, 1 = maximum inequality.'), good: '<0.3 (low inequality)', bad: '>0.5 (high inequality)', icon: '\u2696\uFE0F' }
          ];

          // === Wave 2: BUSINESS_CYCLE_PHASES ===
          var BUSINESS_CYCLE_PHASES = [
            { id: 'expansion', name: t('stem.economicslab.expansion', 'Expansion'), icon: '\uD83D\uDCC8', color: '#22c55e', duration: '3-10 years',
              characteristics: ['GDP rising', 'Unemployment falling', 'Business investment increasing', 'Consumer confidence high', 'Stock market rising'],
              policy: 'Central bank may raise interest rates to prevent overheating. Government may reduce stimulus spending.',
              indicators: 'PMI > 50, unemployment < 5%, GDP growth > 2%' },
            { id: 'peak', name: t('stem.economicslab.peak', 'Peak'), icon: '\u26A0\uFE0F', color: '#f59e0b', duration: 'Brief turning point',
              characteristics: ['GDP at maximum', 'Inflation accelerating', 'Asset bubbles forming', 'Labor shortage', 'Over-optimism'],
              policy: 'Warning signs appear. Wise investors start being cautious. "Be fearful when others are greedy."',
              indicators: 'Inflation > 4%, yield curve flattening, very low unemployment' },
            { id: 'contraction', name: 'Contraction/Recession', icon: '\uD83D\uDCC9', color: '#ef4444', duration: '6-18 months',
              characteristics: ['GDP declining (2+ consecutive quarters)', 'Unemployment rising rapidly', 'Business failures increasing', 'Consumer spending drops', 'Stock market declining'],
              policy: 'Fed cuts interest rates. Government increases spending (stimulus, unemployment benefits). "Buy when there\'s blood in the streets."',
              indicators: 'GDP < 0%, unemployment rising, consumer confidence collapsing' },
            { id: 'trough', name: t('stem.economicslab.trough', 'Trough'), icon: '\uD83D\uDCA1', color: '#3b82f6', duration: 'Brief turning point',
              characteristics: ['GDP at minimum', 'Unemployment at maximum', 'Bargain prices on assets', 'New opportunities emerge', 'Recovery begins'],
              policy: 'Stimulus spending continues. Interest rates at floor. Smart investors buy undervalued assets.',
              indicators: 'GDP stabilizing, layoffs slowing, leading indicators turning up' }
          ];

          // === Wave 2: ECON_SCHOOLS ===
          var ECON_SCHOOLS = [
            { name: t('stem.economicslab.classical', 'Classical'), era: '1776-1930s', icon: '\uD83C\uDFDB\uFE0F', color: '#8b5cf6', key: 'Markets self-correct. Government should stay out.', famous: 'Adam Smith, David Ricardo', govRole: 'Minimal', onRecession: 'Wait it out \u2014 markets adjust', onInflation: 'Reduce money supply' },
            { name: t('stem.economicslab.keynesian', 'Keynesian'), era: '1936-present', icon: '\uD83D\uDCB5', color: '#3b82f6', key: 'Government spending can fix recessions. Demand drives the economy.', famous: 'John Maynard Keynes', govRole: 'Active fiscal policy', onRecession: 'Government spends MORE', onInflation: 'Government spends LESS' },
            { name: t('stem.economicslab.monetarist', 'Monetarist'), era: '1960s-present', icon: '\uD83C\uDFE6', color: '#f59e0b', key: 'Control the money supply. Inflation is always monetary.', famous: 'Milton Friedman', govRole: 'Stable money growth rules', onRecession: 'Expand money supply steadily', onInflation: 'Restrict money supply' },
            { name: t('stem.economicslab.austrian', 'Austrian'), era: '1870s-present', icon: '\u26A1', color: '#ef4444', key: 'Free markets, no central planning. Government causes more problems than it solves.', famous: 'Hayek, Mises, Rothbard', govRole: 'None/minimal', onRecession: 'Let bad businesses fail', onInflation: 'End central banking' },
            { name: t('stem.economicslab.behavioral', 'Behavioral'), era: '2000s-present', icon: '\uD83E\uDDE0', color: '#10b981', key: 'People are irrational. Psychology drives economic decisions.', famous: 'Kahneman, Thaler, Ariely', govRole: '"Nudge" better decisions', onRecession: 'Address panic/confidence', onInflation: 'Anchor expectations' },
            { name: t('stem.economicslab.mmt_modern_monetary', 'MMT (Modern Monetary)'), era: '2010s-present', icon: '\uD83D\uDDA8\uFE0F', color: '#ec4899', key: 'Governments that print their own currency can\'t go broke. Deficits don\'t matter (much).', famous: 'Stephanie Kelton', govRole: 'Spend freely, tax to control inflation', onRecession: 'Print and spend', onInflation: 'Raise taxes to remove money' }
          ];

          // === Wave 2: BUDGET_RULES ===
          var BUDGET_RULES = [
            { name: t('stem.economicslab.50_30_20_rule', '50/30/20 Rule'), icon: '\uD83D\uDCB0', desc: t('stem.economicslab.the_most_popular_simple_budgeting_fram', 'The most popular simple budgeting framework.'),
              parts: [
                { label: t('stem.economicslab.needs', 'Needs'), pct: 50, color: '#ef4444', items: 'Rent, food, utilities, insurance, minimum debt payments, transportation' },
                { label: t('stem.economicslab.wants', 'Wants'), pct: 30, color: '#3b82f6', items: 'Dining out, entertainment, hobbies, subscriptions, vacations' },
                { label: t('stem.economicslab.savings', 'Savings'), pct: 20, color: '#22c55e', items: 'Emergency fund, retirement, investments, extra debt payments' }
              ] },
            { name: t('stem.economicslab.pay_yourself_first', 'Pay Yourself First'), icon: '\uD83C\uDFE6', desc: t('stem.economicslab.save_a_fixed_percentage_before_spendin', 'Save a fixed percentage BEFORE spending on anything else.'),
              parts: [
                { label: t('stem.economicslab.savings_first', 'Savings First'), pct: 20, color: '#22c55e', items: 'Automatically transfer to savings/investments on payday' },
                { label: t('stem.economicslab.bills', 'Bills'), pct: 50, color: '#f59e0b', items: 'Fixed expenses after savings are set aside' },
                { label: t('stem.economicslab.flexible', 'Flexible'), pct: 30, color: '#3b82f6', items: 'Whatever remains for discretionary spending' }
              ] },
            { name: t('stem.economicslab.zero_based_budget', 'Zero-Based Budget'), icon: '\uD83D\uDCDD', desc: t('stem.economicslab.every_dollar_gets_assigned_a_job_incom', 'Every dollar gets assigned a job. Income minus expenses = exactly zero.'),
              parts: [
                { label: t('stem.economicslab.essential', 'Essential'), pct: 55, color: '#ef4444', items: 'Housing, food, transport, utilities' },
                { label: t('stem.economicslab.goals', 'Goals'), pct: 25, color: '#22c55e', items: 'Savings, debt payoff, investments' },
                { label: t('stem.economicslab.lifestyle', 'Lifestyle'), pct: 20, color: '#3b82f6', items: 'Fun, dining, hobbies — every dollar planned' }
              ] }
          ];

          // === Wave 3: ECON_SCENARIOS ===
          var ECON_SCENARIOS = [
            { id: 1, scenario: 'You just got a $5,000 tax refund. You have $3,000 in credit card debt at 22% APR and no emergency fund.', question: t('stem.economicslab.what_should_you_do_first', 'What should you do FIRST?'),
              options: ['Invest in stocks', 'Pay off credit card debt', 'Buy something nice', 'Put it all in savings'], correct: 1,
              explain: 'Pay off the 22% APR credit card first! No investment reliably returns 22%. Paying off high-interest debt is the best guaranteed "return" you can get. After that, build your emergency fund.',
              concept: 'Opportunity Cost & Guaranteed Returns' },
            { id: 2, scenario: 'Gas prices jumped from $3 to $5 per gallon. Your commute is 30 miles each way.', question: t('stem.economicslab.why_doesn_t_gas_demand_drop_as_much_as', 'Why doesn\'t gas demand drop as much as you\'d expect?'),
              options: ['People like expensive gas', 'Gas is price inelastic', 'Supply increased', 'Government subsidies'], correct: 1,
              explain: 'Gasoline has few substitutes for most commuters \u2014 you need it to get to work. This makes it price INELASTIC: even large price changes produce small quantity changes. That\'s why gas taxes raise a lot of revenue.',
              concept: 'Price Elasticity of Demand' },
            { id: 3, scenario: 'The Federal Reserve just raised interest rates by 0.75%. The stock market dropped 3% the same day.', question: t('stem.economicslab.why_does_raising_rates_hurt_stocks', 'Why does raising rates hurt stocks?'),
              options: ['The Fed hates stocks', 'Higher rates make borrowing expensive, slowing growth', 'It\'s random coincidence', 'Taxes went up'], correct: 1,
              explain: 'Higher interest rates increase borrowing costs for businesses (less investment, less growth) and make bonds more attractive relative to stocks. Future corporate profits are also "discounted" at a higher rate, reducing stock valuations.',
              concept: 'Monetary Policy & Interest Rates' },
            { id: 4, scenario: 'Country A can make 100 cars OR 50 computers per year. Country B can make 80 cars OR 80 computers.', question: t('stem.economicslab.which_country_has_comparative_advantag', 'Which country has comparative advantage in computers?'),
              options: ['Country A', 'Country B', 'Neither', 'Both'], correct: 1,
              explain: 'Country B! For Country A, 1 computer costs 2 cars (100/50). For Country B, 1 computer costs 1 car (80/80). Country B gives up fewer cars per computer, so it has the LOWER opportunity cost for computers.',
              concept: 'Comparative Advantage & Trade' },
            { id: 5, scenario: 'A city passes a rent control law capping apartment rent at $800/month. Market rate is $1,200.', question: t('stem.economicslab.what_is_the_most_likely_long_term_effe', 'What is the most likely long-term effect?'),
              options: ['More affordable housing', 'Housing shortage', 'Landlords build more apartments', 'No effect'], correct: 1,
              explain: 'Price ceilings below equilibrium create SHORTAGES. At $800, more people want apartments (high Qd) but landlords supply fewer (low Qs). Long-term: less maintenance, fewer new apartments built, black markets, discrimination in tenant selection.',
              concept: 'Price Ceilings & Shortages' },
            { id: 6, scenario: 'You can earn $50,000/year at your current job, or go to grad school for 2 years (tuition: $30,000/year).', question: t('stem.economicslab.what_is_the_true_cost_of_grad_school', 'What is the TRUE cost of grad school?'),
              options: ['$60,000 (tuition only)', '$100,000 (tuition + lost wages)', '$160,000 (tuition + lost wages)', '$30,000 (one year tuition)'], correct: 2,
              explain: '$160,000! Tuition: $30K \u00D7 2 = $60K. Plus opportunity cost: $50K salary \u00D7 2 = $100K in wages you gave up. Total: $160K. Opportunity cost is the most important concept in economics!',
              concept: 'Opportunity Cost' },
            { id: 7, scenario: 'During COVID, the government sent $1,200 stimulus checks to most Americans and the Fed printed trillions.', question: t('stem.economicslab.what_economic_consequence_followed_in_', 'What economic consequence followed in 2021-2022?'),
              options: ['Deflation', 'High inflation', 'Lower unemployment', 'Trade surplus'], correct: 1,
              explain: 'Too much money chasing too few goods = INFLATION. Supply chains were disrupted (less supply) while stimulus increased spending power (more demand). Inflation hit 9.1% in June 2022 \u2014 the highest in 40 years.',
              concept: 'Money Supply & Inflation' },
            { id: 8, scenario: 'Two gas stations are across the street from each other. One drops its price by $0.05.', question: t('stem.economicslab.what_will_the_other_station_likely_do', 'What will the other station likely do?'),
              options: ['Raise its price', 'Keep the same price', 'Match or beat the price drop', 'Close permanently'], correct: 2,
              explain: 'This is oligopoly behavior! With few sellers of an identical product, firms are interdependent. They tend to match competitors\' price cuts (kinked demand curve) but NOT price increases. This is why gas stations cluster and have similar prices.',
              concept: 'Oligopoly & Game Theory' },
            { id: 9, scenario: 'A factory pollutes a river, causing $2 million in damage to downstream fisheries. The factory pays nothing.', question: t('stem.economicslab.what_type_of_market_failure_is_this', 'What type of market failure is this?'),
              options: ['Monopoly', 'Public good', 'Negative externality', 'Information asymmetry'], correct: 2,
              explain: 'Negative externality! The factory imposes costs on third parties (fisheries) who aren\'t part of the transaction. The market price doesn\'t reflect the true social cost. Solutions: Pigouvian tax, cap-and-trade, regulation, or Coase bargaining.',
              concept: 'Externalities & Market Failure' },
            { id: 10, scenario: 'You\'re 25 years old. Your employer offers a 401(k) match: they\'ll match your contribution up to 6% of your salary.', question: t('stem.economicslab.how_much_should_you_contribute_at_mini', 'How much should you contribute at minimum?'),
              options: ['Nothing \u2014 wait until older', '3% \u2014 save some', '6% \u2014 get the full match', '50% \u2014 maximize savings'], correct: 2,
              explain: 'Always get the full employer match \u2014 it\'s a 100% INSTANT return on your money! If you earn $50K and contribute 6% ($3,000), your employer adds $3,000 FREE. Not contributing is literally turning down free money.',
              concept: 'Employer Match & Free Money' }
          ];

          // === Wave 3: ECON_EVENTS ===
          var ECON_EVENTS = [
            { year: 1929, event: 'The Great Depression begins with Black Tuesday stock market crash', icon: '\uD83D\uDCC9', impact: 'GDP fell 30%, unemployment reached 25%. Led to New Deal, FDIC, SEC.', lesson: 'Markets can fail catastrophically. Bank runs destroy economies.' },
            { year: 1944, event: 'Bretton Woods establishes US dollar as world reserve currency', icon: '\uD83C\uDF0D', impact: 'Created IMF and World Bank. Dollar pegged to gold at $35/oz.', lesson: 'International monetary cooperation enables global trade.' },
            { year: 1971, event: 'Nixon ends gold standard ("Nixon Shock")', icon: '\uD83D\uDCB5', impact: 'Currencies now "float" based on supply/demand. Era of fiat money begins.', lesson: 'Modern money is backed by trust in government, not physical gold.' },
            { year: 1973, event: 'OPEC oil embargo causes stagflation', icon: '\u26FD', impact: 'Oil prices quadrupled. Both inflation AND unemployment rose simultaneously.', lesson: 'Supply shocks can cause inflation + recession at the same time.' },
            { year: 1987, event: 'Black Monday: Dow drops 22.6% in one day', icon: '\uD83D\uDCC9', impact: 'Largest single-day percentage drop. Led to circuit breakers in markets.', lesson: 'Markets can crash fast. Automated trading amplifies panic.' },
            { year: 2000, event: 'Dot-com bubble bursts', icon: '\uD83D\uDCBB', impact: 'Nasdaq lost 78% of its value. $5 trillion in market cap evaporated.', lesson: 'Speculation detached from fundamentals always ends badly.' },
            { year: 2007, event: 'Subprime mortgage crisis triggers Great Recession', icon: '\uD83C\uDFE0', impact: 'Housing prices crashed 33%. Lehman Brothers collapsed. Global financial crisis.', lesson: 'Complex financial products can hide risk. Too much leverage is deadly.' },
            { year: 2008, event: 'Federal Reserve drops rates to 0% and begins quantitative easing', icon: '\uD83C\uDFE6', impact: 'Unprecedented monetary stimulus. Fed balance sheet grew from $900B to $4.5T.', lesson: 'Central banks are the "lender of last resort" in financial crises.' },
            { year: 2010, event: 'Greek debt crisis threatens the Eurozone', icon: '\uD83C\uDDEC\uD83C\uDDF7', impact: 'Greece faced default. EU/IMF bailouts with severe austerity. Youth unemployment hit 60%.', lesson: 'Sovereign debt crises show the dangers of fiscal irresponsibility.' },
            { year: 2020, event: 'COVID-19 pandemic causes fastest GDP drop in history', icon: '\uD83E\uDDA0', impact: 'US GDP fell 31.4% (annualized) in Q2. $5T+ in stimulus spending. Remote work revolution.', lesson: 'Black swan events can reshape the entire economy overnight.' },
            { year: 2022, event: 'Inflation hits 9.1% \u2014 highest since 1981', icon: '\uD83D\uDCC8', impact: 'Fed raised rates from 0% to 5.5%. Mortgage rates doubled. Crypto crashed 70%.', lesson: 'Printing money has consequences. Rate hikes are painful but necessary.' },
            { year: 2023, event: 'Silicon Valley Bank collapses in 48 hours', icon: '\uD83C\uDFE6', impact: '2nd largest bank failure in US history. Fed created emergency lending facility.', lesson: 'Even modern banks can face runs. Interest rate risk affects everyone.' }
          ];

          // === Wave 3: ECON_QUICK_REF ===
          var ECON_QUICK_REF = [
            { title: t('stem.economicslab.supply_demand_2', 'Supply & Demand'), content: t('stem.economicslab.price_rises_less_demanded_more_supplie', 'Price rises \u2192 less demanded, more supplied. Price falls \u2192 more demanded, less supplied. Equilibrium: where S meets D.'), icon: '\u2696\uFE0F', color: '#3b82f6' },
            { title: t('stem.economicslab.gdp_formula', 'GDP Formula'), content: t('stem.economicslab.gdp_c_i_g_x_m_consumption_investment_g', 'GDP = C + I + G + (X-M). Consumption + Investment + Government + Net Exports. Measures total economic output.'), icon: '\uD83C\uDFDB\uFE0F', color: '#f59e0b' },
            { title: t('stem.economicslab.inflation_types', 'Inflation Types'), content: t('stem.economicslab.demand_pull_too_much_money_chasing_goo', 'Demand-pull: too much money chasing goods. Cost-push: rising production costs. Built-in: wage-price spiral expectations.'), icon: '\uD83D\uDCC8', color: '#ef4444' },
            { title: t('stem.economicslab.fed_tools', 'Fed Tools'), content: t('stem.economicslab.interest_rates_ffr_open_market_operati', 'Interest rates (FFR) \u2022 Open market operations (buy/sell bonds) \u2022 Reserve requirements \u2022 Discount window \u2022 Forward guidance'), icon: '\uD83C\uDFE6', color: '#8b5cf6' },
            { title: t('stem.economicslab.fiscal_vs_monetary', 'Fiscal vs Monetary'), content: t('stem.economicslab.fiscal_congress_tax_spend_monetary_fed', 'Fiscal = Congress (tax/spend). Monetary = Fed (interest rates/money supply). Both affect the economy differently.'), icon: '\uD83D\uDCCA', color: '#22c55e' },
            { title: t('stem.economicslab.rule_of_72', 'Rule of 72'), content: t('stem.economicslab.divide_72_by_the_interest_rate_to_find', 'Divide 72 by the interest rate to find how many years it takes to double your money. 72 \u00F7 8% = 9 years to double.'), icon: '\u2728', color: '#ec4899' },
            { title: t('stem.economicslab.elasticity_rules', 'Elasticity Rules'), content: t('stem.economicslab.elastic_1_luxury_has_substitutes_inela', 'Elastic (>1): luxury, has substitutes. Inelastic (<1): necessity, no substitutes. Unit elastic (=1): % change in P = % change in Q.'), icon: '\uD83C\uDFF9', color: '#10b981' },
            { title: t('stem.economicslab.4_market_structures', '4 Market Structures'), content: t('stem.economicslab.perfect_competition_monopolistic_compe', 'Perfect Competition \u2192 Monopolistic Competition \u2192 Oligopoly \u2192 Monopoly. More market power = higher prices, less efficiency.'), icon: '\uD83C\uDFEA', color: '#f97316' }
          ];

          // Wave 3 state
          var econScenarioIdx = d.econScenarioIdx || 0;
          var econScenarioAnswer = d.econScenarioAnswer === undefined ? -1 : d.econScenarioAnswer;
          var econScenarioScore = d.econScenarioScore || 0;
          var econScenarioTotal = d.econScenarioTotal || 0;
          var econStreak = d.econStreak || 0;
          var econBestStreak = d.econBestStreak || 0;



          // â”€â”€ Canvas Rendering â”€â”€ (non-hook: setTimeout to avoid conditional hook)

          setTimeout(function () {

            var canvas = canvasRef.current;

            if (!canvas) return;

            var ctx = canvas.getContext('2d');

            var W = canvas.width = canvas.offsetWidth * 2;

            var H = canvas.height = 500;

            ctx.scale(1, 1);

            ctx.clearRect(0, 0, W, H);



            if (econTab === 'supplyDemand') {

              // â”€â”€ Supply & Demand Graph â”€â”€

              // NB: the canvas is a 2x supersample (drawn at offsetWidth*2 / 500,
              // displayed at offsetWidth / 250), so font px here render at HALF
              // size on screen — all text in this draw pass uses ~2x sizes.

              var gx = 76, gy = 44, gw = W - 140, gh = H - 110;

              // Background

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              // Grid

              ctx.strokeStyle = 'rgba(148,163,184,0.1)'; ctx.lineWidth = 1;

              for (var gi = 0; gi <= 10; gi++) {

                ctx.beginPath(); ctx.moveTo(gx + gi * gw / 10, gy); ctx.lineTo(gx + gi * gw / 10, gy + gh); ctx.stroke();

                ctx.beginPath(); ctx.moveTo(gx, gy + gi * gh / 10); ctx.lineTo(gx + gw, gy + gi * gh / 10); ctx.stroke();

              }

              // Axes

              ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;

              ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();

              ctx.font = 'bold 24px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('Price ($)', 8, 26);

              ctx.fillText('Quantity', gx + gw / 2 - 50, gy + gh + 46);

              // Labels

              ctx.font = '18px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

              for (var li = 0; li <= 10; li++) {

                ctx.fillText((100 - li * 10).toString(), gx - 46, gy + li * gh / 10 + 6);

                ctx.fillText((li * 10).toString(), gx + li * gw / 10 - 10, gy + gh + 24);

              }



              // Demand curve (downward sloping, shifted)

              ctx.save(); ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 8; ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3; ctx.beginPath();

              var dStarted = false;

              for (var dx = 0; dx <= 100; dx++) {

                var dp = 90 - dx * sdDemSlope + sdDemandShift * 5;

                if (dp < 0 || dp > 100) continue;

                var px = gx + dx / 100 * gw;

                var py = gy + (100 - dp) / 100 * gh;

                if (!dStarted) { ctx.moveTo(px, py); dStarted = true; } else { ctx.lineTo(px, py); }

              }

              ctx.stroke();

              ctx.restore(); ctx.fillStyle = '#3b82f6'; ctx.font = 'bold 24px Inter, system-ui';

              // Label sits at the demand curve's VISIBLE right end. With steep
              // slopes the curve is clipped where price hits 0 mid-chart, so the
              // anchor follows that exit point instead of floating at q=100.

              var dExitQ = Math.max(2, Math.min(100, (90 + sdDemandShift * 5) / sdDemSlope));

              var dEndP = 90 - dExitQ * sdDemSlope + sdDemandShift * 5;

              ctx.fillText('D' + (sdDemandShift !== 0 ? '\'' : ''), Math.max(gx + 8, gx + dExitQ / 100 * gw - 34), Math.max(gy + 24, Math.min(gy + gh - 10, gy + (100 - dEndP) / 100 * gh - 12)));



              // Supply curve (upward sloping, shifted)

              ctx.save(); ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 8; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.beginPath();

              var sStarted = false;

              for (var sx = 0; sx <= 100; sx++) {

                var sp = 10 + sx * sdSupSlope + sdSupplyShift * 5;

                if (sp < 0 || sp > 100) continue;

                var spx = gx + sx / 100 * gw;

                var spy = gy + (100 - sp) / 100 * gh;

                if (!sStarted) { ctx.moveTo(spx, spy); sStarted = true; } else { ctx.lineTo(spx, spy); }

              }

              ctx.stroke();

              ctx.restore(); ctx.fillStyle = '#ef4444';

              var sExitQ = Math.max(2, Math.min(100, (90 - sdSupplyShift * 5) / sdSupSlope));

              var sEndP = 10 + sExitQ * sdSupSlope + sdSupplyShift * 5;

              ctx.fillText('S' + (sdSupplyShift !== 0 ? '\'' : ''), Math.max(gx + 8, gx + sExitQ / 100 * gw - 34), Math.max(gy + 24, Math.min(gy + gh - 10, gy + (100 - sEndP) / 100 * gh - 12)));



              // Equilibrium point

              var eqQ = (80 - sdSupplyShift * 5 + sdDemandShift * 5) / (sdDemSlope + sdSupSlope);

              var eqP = 10 + eqQ * sdSupSlope + sdSupplyShift * 5;

              var eqInRange = eqQ >= 0 && eqQ <= 100 && eqP >= 0 && eqP <= 100;

              // Shade consumer (blue) & producer (red) surplus — the headline pedagogy that the text below
              // describes but the graph never actually drew. Exact triangles since both curves are linear.
              if (eqInRange) {
                var _pxQ = function(q) { return gx + q / 100 * gw; };
                var _pyP = function(p) { return gy + (100 - p) / 100 * gh; };
                ctx.fillStyle = 'rgba(59,130,246,0.18)';
                ctx.beginPath(); ctx.moveTo(_pxQ(0), _pyP(90 + sdDemandShift * 5)); ctx.lineTo(_pxQ(0), _pyP(eqP)); ctx.lineTo(_pxQ(eqQ), _pyP(eqP)); ctx.closePath(); ctx.fill();
                ctx.fillStyle = 'rgba(239,68,68,0.18)';
                ctx.beginPath(); ctx.moveTo(_pxQ(0), _pyP(10 + sdSupplyShift * 5)); ctx.lineTo(_pxQ(0), _pyP(eqP)); ctx.lineTo(_pxQ(eqQ), _pyP(eqP)); ctx.closePath(); ctx.fill();
              }

              // Clamp the marker/labels to the plot box so extreme slider shifts don't draw them off-canvas
              var eqPx = gx + Math.max(0, Math.min(100, eqQ)) / 100 * gw;

              var eqPy = gy + (100 - Math.max(0, Math.min(100, eqP))) / 100 * gh;

              // Dashed lines to axes

              ctx.setLineDash([5, 5]); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;

              ctx.beginPath(); ctx.moveTo(eqPx, eqPy); ctx.lineTo(gx, eqPy); ctx.stroke();

              ctx.beginPath(); ctx.moveTo(eqPx, eqPy); ctx.lineTo(eqPx, gy + gh); ctx.stroke();

              ctx.setLineDash([]);

              // Equilibrium dot

              ctx.beginPath(); ctx.arc(eqPx, eqPy, 8, 0, Math.PI * 2);

              ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 14; ctx.fillStyle = '#fbbf24'; ctx.fill(); ctx.shadowBlur = 0;

              ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();

              ctx.font = 'bold 22px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

              ctx.fillText('E', eqPx + 14, eqPy - 10);

              ctx.font = '19px Inter, system-ui';

              ctx.fillText('P* = $' + eqP.toFixed(0), gx + 8, Math.max(gy + 20, eqPy - 8));

              ctx.fillText('Q* = ' + eqQ.toFixed(0), Math.min(gx + gw - 100, eqPx + 12), gy + gh - 12);

              if (!eqInRange) { ctx.fillStyle = '#fbbf24'; ctx.font = '18px Inter, system-ui'; ctx.fillText('Equilibrium is off the chart — reduce the shift sliders', gx + 10, gy + 24); }

              // Label the shaded surplus triangles right on the chart (the old
              // bullet-list version of this drew at y >= H, below the visible canvas).

              if (eqInRange && eqQ > 18) {

                ctx.font = 'bold 20px Inter, system-ui';

                ctx.fillStyle = 'rgba(147,197,253,0.95)';

                ctx.fillText('CS', gx + eqQ / 100 * gw * 0.2, gy + (100 - (eqP + (90 + sdDemandShift * 5 - eqP) * 0.4)) / 100 * gh);

                ctx.fillStyle = 'rgba(252,165,165,0.95)';

                ctx.fillText('PS', gx + eqQ / 100 * gw * 0.2, gy + (100 - (eqP - (eqP - (10 + sdSupplyShift * 5)) * 0.4)) / 100 * gh);

              }



              // Price floor

              if (sdPriceFloor > 0) {

                var pfY = gy + (100 - sdPriceFloor) / 100 * gh;

                ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.setLineDash([8, 4]);

                ctx.beginPath(); ctx.moveTo(gx, pfY); ctx.lineTo(gx + gw, pfY); ctx.stroke();

                ctx.setLineDash([]); ctx.fillStyle = '#22c55e'; ctx.font = 'bold 19px Inter, system-ui';

                ctx.fillText('Price Floor $' + sdPriceFloor, gx + gw - 240, pfY - 10);

                if (sdPriceFloor > eqP) {

                  // Mark Qd and Qs at the floor price (curves are linear, so these
                  // are exact) and quantify the unsold surplus between them.

                  var fQd = Math.max(0, Math.min(100, (90 + sdDemandShift * 5 - sdPriceFloor) / sdDemSlope));

                  var fQs = Math.max(0, Math.min(100, (sdPriceFloor - 10 - sdSupplyShift * 5) / sdSupSlope));

                  var fXd = gx + fQd / 100 * gw, fXs = gx + fQs / 100 * gw;

                  ctx.fillStyle = '#22c55e';

                  ctx.beginPath(); ctx.arc(fXd, pfY, 6, 0, Math.PI * 2); ctx.fill();

                  ctx.beginPath(); ctx.arc(fXs, pfY, 6, 0, Math.PI * 2); ctx.fill();

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;

                  ctx.beginPath(); ctx.moveTo(fXd, pfY); ctx.lineTo(fXs, pfY); ctx.stroke();

                  ctx.font = 'bold 19px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                  ctx.fillText('\u26A0 SURPLUS \u2248 ' + Math.max(0, fQs - fQd).toFixed(0) + ' units unsold (Qs > Qd)', gx + 10, Math.max(gy + 22, pfY - 34));

                }

              }

              // Price ceiling

              if (sdPriceCeiling > 0) {

                var pcY = gy + (100 - sdPriceCeiling) / 100 * gh;

                ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.setLineDash([8, 4]);

                ctx.beginPath(); ctx.moveTo(gx, pcY); ctx.lineTo(gx + gw, pcY); ctx.stroke();

                ctx.setLineDash([]); ctx.fillStyle = '#f97316'; ctx.font = 'bold 19px Inter, system-ui';

                ctx.fillText('Price Ceiling $' + sdPriceCeiling, gx + gw - 260, pcY + 26);

                if (sdPriceCeiling < eqP) {

                  // Mark Qs and Qd at the ceiling price and quantify the unmet demand.

                  var cQd = Math.max(0, Math.min(100, (90 + sdDemandShift * 5 - sdPriceCeiling) / sdDemSlope));

                  var cQs = Math.max(0, Math.min(100, (sdPriceCeiling - 10 - sdSupplyShift * 5) / sdSupSlope));

                  var cXd = gx + cQd / 100 * gw, cXs = gx + cQs / 100 * gw;

                  ctx.fillStyle = '#f97316';

                  ctx.beginPath(); ctx.arc(cXd, pcY, 6, 0, Math.PI * 2); ctx.fill();

                  ctx.beginPath(); ctx.arc(cXs, pcY, 6, 0, Math.PI * 2); ctx.fill();

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;

                  ctx.beginPath(); ctx.moveTo(cXs, pcY); ctx.lineTo(cXd, pcY); ctx.stroke();

                  ctx.font = 'bold 19px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                  ctx.fillText('\u26A0 SHORTAGE \u2248 ' + Math.max(0, cQd - cQs).toFixed(0) + ' units unmet (Qd > Qs)', gx + 10, Math.min(gy + gh - 12, pcY + 52));

                }

              }

              // Tax wedge

              if (sdTax > 0) {

                // Real tax geometry (linear curves make this exact): trades fall to
                // Qt where the curves are $tax apart; buyers pay Pd(Qt), sellers
                // keep Ps(Qt); the triangle from Qt to Q* is the deadweight loss.
                // (The old drawing was a decorative rectangle centered on E.)

                var txQ = Math.max(0, eqQ - sdTax / (sdDemSlope + sdSupSlope));

                var txPd = 90 + sdDemandShift * 5 - sdDemSlope * txQ;

                var txPs = 10 + sdSupSlope * txQ + sdSupplyShift * 5;

                var txX = gx + Math.min(100, txQ) / 100 * gw;

                var txPy = function (p) { return gy + (100 - Math.max(0, Math.min(100, p))) / 100 * gh; };

                if (eqInRange && txQ > 0) {

                  ctx.fillStyle = 'rgba(168,85,247,0.25)';

                  ctx.beginPath(); ctx.moveTo(txX, txPy(txPd)); ctx.lineTo(txX, txPy(txPs)); ctx.lineTo(eqPx, eqPy); ctx.closePath(); ctx.fill();

                  ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 4;

                  ctx.beginPath(); ctx.moveTo(txX, txPy(txPd)); ctx.lineTo(txX, txPy(txPs)); ctx.stroke();

                  ctx.fillStyle = '#c084fc'; ctx.font = 'bold 19px Inter, system-ui';

                  ctx.fillText('Buyers pay $' + txPd.toFixed(0), Math.max(gx + 8, txX - 220), txPy(txPd) - 10);

                  ctx.fillText('Sellers get $' + txPs.toFixed(0), Math.max(gx + 8, txX - 220), txPy(txPs) + 26);

                  if (eqQ - txQ > 8) ctx.fillText('DWL', (txX + eqPx) / 2 - 22, (txPy(txPd) + txPy(txPs)) / 2 + 7);

                  ctx.font = '18px Inter, system-ui';

                  ctx.fillText('Tax $' + sdTax + ': trades fall ' + eqQ.toFixed(0) + ' → ' + txQ.toFixed(0), txX + 14, gy + 46);

                }

              }

              // Curve probe: click the canvas (or focus it and use arrow keys)
              // to read marginal value vs marginal cost at any quantity — the
              // "should society produce this unit?" question made tangible.

              if (d.sdProbe !== null && d.sdProbe !== undefined) {

                var prQ = Math.max(0, Math.min(100, d.sdProbe));

                var prPd = 90 - prQ * sdDemSlope + sdDemandShift * 5;

                var prPs = 10 + prQ * sdSupSlope + sdSupplyShift * 5;

                var prX = gx + prQ / 100 * gw;

                var prPy = function (p) { return gy + (100 - Math.max(0, Math.min(100, p))) / 100 * gh; };

                ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);

                ctx.beginPath(); ctx.moveTo(prX, gy); ctx.lineTo(prX, gy + gh); ctx.stroke(); ctx.setLineDash([]);

                ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(prX, prPy(prPd), 7, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(prX, prPy(prPs), 7, 0, Math.PI * 2); ctx.fill();

                ctx.font = 'bold 19px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

                var prVerdict = prPd > prPs ? 'worth producing (value > cost)' : 'NOT worth producing (cost > value)';

                ctx.fillText('Q=' + prQ + ': buyers value $' + Math.max(0, prPd).toFixed(0) + ', producer cost $' + Math.max(0, prPs).toFixed(0) + ' — ' + prVerdict, gx + 10, gy + gh - 44);

              }

            }



            else if (econTab === 'personalFinance') {

              // â”€â”€ Life Sim Net Worth Chart â”€â”€

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              var pieX = W * 0.25, pieY = H * 0.45, pieR = Math.min(W * 0.2, H * 0.35);

              var expenses = [

                { name: 'Rent/Housing', val: pfRent, color: '#ef4444' },

                { name: t('stem.economicslab.food', 'Food'), val: pfFood, color: '#f59e0b' },

                { name: t('stem.economicslab.transport', 'Transport'), val: pfTransport, color: '#3b82f6' },

                { name: t('stem.economicslab.entertainment', 'Entertainment'), val: pfEntertain, color: '#8b5cf6' },

                { name: t('stem.economicslab.savings_2', 'Savings'), val: pfSavings, color: '#22c55e' }

              ];

              var totalExp = expenses.reduce(function (s, e) { return s + e.val; }, 0);

              var remaining = Math.max(0, pfIncome - totalExp);

              // Literal color — canvas fillStyle can't resolve CSS var(); the
              // var() string was silently ignored, leaving the previous fill
              // (the white slice-label color) so this slice painted WHITE and
              // its white label disappeared into it.

              if (remaining > 0) expenses.push({ name: t('stem.economicslab.remaining', 'Remaining'), val: remaining, color: '#64748b' });

              var total = expenses.reduce(function (s, e) { return s + e.val; }, 0);

              var angle = -Math.PI / 2;

              expenses.forEach(function (e) {

                var sliceAngle = (e.val / total) * Math.PI * 2;

                ctx.beginPath(); ctx.moveTo(pieX, pieY);

                ctx.arc(pieX, pieY, pieR, angle, angle + sliceAngle);

                ctx.closePath(); ctx.fillStyle = e.color; ctx.fill();

                ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();

                // Label

                var midAngle = angle + sliceAngle / 2;

                var lx = pieX + Math.cos(midAngle) * (pieR * 0.65);

                var ly = pieY + Math.sin(midAngle) * (pieR * 0.65);

                if (e.val / total > 0.05) {

                  ctx.font = 'bold 18px Inter, system-ui'; ctx.fillStyle = '#fff';

                  ctx.textAlign = 'center';

                  ctx.fillText(Math.round(e.val / total * 100) + '%', lx, ly);

                  ctx.fillText(e.name, lx, ly + 22);

                }

                angle += sliceAngle;

              });

              ctx.textAlign = 'left';

              // Income display

              ctx.font = 'bold 28px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('Monthly Income: $' + pfIncome.toLocaleString(), W * 0.55, 44);

              ctx.font = '22px Inter, system-ui'; ctx.fillStyle = totalExp > pfIncome ? '#ef4444' : '#22c55e';

              ctx.fillText('Total Expenses: $' + totalExp.toLocaleString() + (totalExp > pfIncome ? ' \u26A0 OVER BUDGET' : ' \u2713 Within Budget'), W * 0.55, 82);

              ctx.fillStyle = '#94a3b8';

              ctx.fillText('Savings Rate: ' + (pfSavings / pfIncome * 100).toFixed(1) + '%', W * 0.55, 116);



              // Compound Interest Chart (right side)

              ctx.font = 'bold 24px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('\uD83D\uDCC8 Compound Interest Growth', W * 0.55, 160);

              var ciX = W * 0.55, ciY = 176, ciW = W * 0.4, ciH = H - 240;

              ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;

              ctx.strokeRect(ciX, ciY, ciW, ciH);

              // Growth curve

              var maxVal = pfPrincipal * Math.pow(1 + pfRate / 100, pfYears);

              ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2.5; ctx.beginPath();

              for (var yr = 0; yr <= pfYears; yr++) {

                var val = pfPrincipal * Math.pow(1 + pfRate / 100, yr);

                var cx2 = ciX + (yr / pfYears) * ciW;

                var cy2 = ciY + ciH - (val / maxVal) * ciH;

                yr === 0 ? ctx.moveTo(cx2, cy2) : ctx.lineTo(cx2, cy2);

              }

              ctx.stroke();

              // Fill under curve

              ctx.lineTo(ciX + ciW, ciY + ciH); ctx.lineTo(ciX, ciY + ciH); ctx.closePath();

              ctx.fillStyle = 'rgba(34,197,94,0.1)'; ctx.fill();

              // End value label

              ctx.font = 'bold 24px Inter, system-ui'; ctx.fillStyle = '#22c55e';

              ctx.fillText('$' + Math.round(maxVal).toLocaleString(), ciX + ciW - 170, ciY + 30);

              ctx.font = '18px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

              ctx.fillText('Year 0', ciX, ciY + ciH + 24);

              ctx.fillText('Year ' + pfYears, ciX + ciW - 90, ciY + ciH + 24);

              ctx.fillText('$' + pfPrincipal.toLocaleString() + ' @ ' + pfRate + '% for ' + pfYears + ' years', ciX, ciY + ciH + 50);

            }



            else if (econTab === 'stockMarket') {

              // â”€â”€ Stock Market Chart â”€â”€

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              var co = smCompanies[smSelected];

              if (!co) return;

              // Price chart area

              var chX = 60, chY = 50, chW = W - 120, chH = H * 0.55;

              // Chart background

              ctx.fillStyle = '#1e293b'; ctx.fillRect(chX, chY, chW, chH);

              // Grid

              ctx.strokeStyle = 'rgba(148,163,184,0.08)'; ctx.lineWidth = 1;

              for (var cgi = 0; cgi <= 5; cgi++) {

                var cgy = chY + cgi * chH / 5;

                ctx.beginPath(); ctx.moveTo(chX, cgy); ctx.lineTo(chX + chW, cgy); ctx.stroke();

              }

              // Price history line

              var hist = co.history;

              if (hist.length > 1) {

                var minP = Math.min.apply(null, hist) * 0.9;

                var maxP = Math.max.apply(null, hist) * 1.1;

                var priceRange = maxP - minP || 1;

                // Area fill

                ctx.beginPath();

                for (var hi = 0; hi < hist.length; hi++) {

                  var hx = chX + (hi / (hist.length - 1)) * chW;

                  var hy = chY + chH - ((hist[hi] - minP) / priceRange) * chH;

                  hi === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);

                }

                ctx.lineTo(chX + chW, chY + chH); ctx.lineTo(chX, chY + chH); ctx.closePath();

                ctx.fillStyle = co.color.replace(')', ',0.1)').replace('rgb', 'rgba');

                if (!ctx.fillStyle.startsWith('rgba')) ctx.fillStyle = 'rgba(59,130,246,0.1)';

                ctx.fill();

                // Line

                ctx.beginPath();

                for (var hi2 = 0; hi2 < hist.length; hi2++) {

                  var hx2 = chX + (hi2 / (hist.length - 1)) * chW;

                  var hy2 = chY + chH - ((hist[hi2] - minP) / priceRange) * chH;

                  hi2 === 0 ? ctx.moveTo(hx2, hy2) : ctx.lineTo(hx2, hy2);

                }

                ctx.strokeStyle = co.color; ctx.lineWidth = 2.5; ctx.stroke();

                // Moving average line (5-period)

                if (hist.length >= 5) {

                  ctx.strokeStyle = 'rgba(251,191,36,0.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath();

                  for (var mai = 4; mai < hist.length; mai++) {

                    var maVal = (hist[mai] + hist[mai - 1] + hist[mai - 2] + hist[mai - 3] + hist[mai - 4]) / 5;

                    var maxr = chX + (mai / (hist.length - 1)) * chW;

                    var mayr = chY + chH - ((maVal - minP) / priceRange) * chH;

                    mai === 4 ? ctx.moveTo(maxr, mayr) : ctx.lineTo(maxr, mayr);

                  }

                  ctx.stroke(); ctx.setLineDash([]);

                  ctx.font = '16px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                  ctx.fillText('MA(5)', chX + chW - 80, chY + 24);

                }

                // Current price dot

                var lastX = chX + chW;

                var lastY = chY + chH - ((hist[hist.length - 1] - minP) / priceRange) * chH;

                ctx.beginPath(); ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);

                ctx.shadowColor = co.color; ctx.shadowBlur = 12; ctx.fillStyle = co.color; ctx.fill(); ctx.shadowBlur = 0;

                // Price labels

                ctx.font = '18px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                ctx.fillText('$' + maxP.toFixed(0), chX - 56, chY + 16);

                ctx.fillText('$' + minP.toFixed(0), chX - 56, chY + chH);

              }

              // Company header

              ctx.font = 'bold 30px Inter, system-ui'; ctx.fillStyle = co.color;

              ctx.fillText(co.ticker, chX, 36);

              ctx.font = '20px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

              ctx.fillText(co.name + ' | ' + co.sector, chX + 150, 34);

              ctx.font = 'bold 26px Inter, system-ui';

              var priceChange = hist.length > 1 ? hist[hist.length - 1] - hist[hist.length - 2] : 0;

              ctx.fillStyle = priceChange >= 0 ? '#22c55e' : '#ef4444';

              ctx.fillText('$' + co.price.toFixed(2) + ' ' + (priceChange >= 0 ? '\u25B2' : '\u25BC') + Math.abs(priceChange).toFixed(2), chX + chW - 280, 36);



              // Portfolio summary at bottom

              var portY = chY + chH + 30;

              ctx.font = 'bold 24px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('\uD83D\uDCBC Portfolio', chX, portY);

              ctx.font = '20px Inter, system-ui'; ctx.fillStyle = '#22c55e';

              ctx.fillText('Cash: $' + smCash.toFixed(2), chX + 210, portY);

              // Holdings

              var portVal = 0;

              var holdX = chX;

              smCompanies.forEach(function (c, ci) {

                var shares = (smPortfolio[c.ticker] || 0);

                if (shares > 0) {

                  portVal += shares * c.price;

                  ctx.fillStyle = c.color; ctx.font = '19px Inter, system-ui';

                  ctx.fillText(c.ticker + ': ' + shares + ' ($' + (shares * c.price).toFixed(0) + ')', holdX, portY + 34);

                  holdX += 260;

                }

              });

              ctx.font = 'bold 22px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

              ctx.fillText('Total Value: $' + (smCash + portVal).toFixed(2), chX + chW - 320, portY);

              // News banner

              // News banner reads the live smNewsEvent (legacy smNews was never
              // written by the AI day-sim, so the banner never appeared).

              var newsHeadline = (d.smNewsEvent && d.smNewsEvent.headline) || smNews;

              if (newsHeadline) {

                ctx.fillStyle = 'rgba(251,191,36,0.15)';

                ctx.fillRect(chX, portY + 48, chW, 46);

                ctx.font = 'bold 20px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                ctx.fillText('\uD83D\uDCF0 ' + newsHeadline, chX + 12, portY + 79);

              }

            }



            else if (econTab === 'macro') {

              // â”€â”€ National Economy Dashboard â”€â”€

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              ctx.font = 'bold 28px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('\uD83C\uDFDB\uFE0F National Economy — Year ' + macroYear, 30, 35);

              // Indicator gauges

              var indicators = [

                { label: t('stem.economicslab.gdp_growth', 'GDP Growth'), val: macroGDP, unit: '%', good: macroGDP > 0, color: macroGDP > 2 ? '#22c55e' : macroGDP > 0 ? '#fbbf24' : '#ef4444' },

                { label: t('stem.economicslab.inflation_2', 'Inflation'), val: macroInflation, unit: '%', good: macroInflation < 3, color: macroInflation > 5 ? '#ef4444' : macroInflation > 3 ? '#fbbf24' : '#22c55e' },

                { label: t('stem.economicslab.interest_rate', 'Interest Rate'), val: macroInterest, unit: '%', good: macroInterest < 5, color: macroInterest > 7 ? '#ef4444' : macroInterest > 4 ? '#fbbf24' : '#22c55e' },

                { label: t('stem.economicslab.unemployment_3', 'Unemployment'), val: macroUnemployment, unit: '%', good: macroUnemployment < 5, color: macroUnemployment > 7 ? '#ef4444' : macroUnemployment > 4 ? '#fbbf24' : '#22c55e' },

                { label: t('stem.economicslab.trade_balance_2', 'Trade Balance'), val: macroTrade, unit: '%', good: macroTrade > 0, color: macroTrade > 0 ? '#22c55e' : macroTrade > -2 ? '#fbbf24' : '#ef4444' }

              ];

              var gaugeW = (W - 80) / 5;

              indicators.forEach(function (ind, ii) {

                var gx2 = 40 + ii * gaugeW;

                // Background bar

                ctx.fillStyle = '#1e293b'; ctx.fillRect(gx2, 60, gaugeW - 10, 50);

                // Value bar

                var pct = Math.min(1, Math.abs(ind.val) / 10);

                ctx.fillStyle = ind.color;

                ctx.fillRect(gx2, 60, (gaugeW - 10) * pct, 50);

                ctx.globalAlpha = 0.3; ctx.fillRect(gx2, 60, (gaugeW - 10) * pct, 50); ctx.globalAlpha = 1;

                // Labels

                ctx.font = 'bold 18px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

                ctx.fillText(ind.label, gx2 + 6, 82);

                // White, not ind.color — the value text starts INSIDE the value
                // bar, so color-matched text (green on green) was invisible.

                ctx.font = 'bold 24px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

                ctx.fillText((ind.val >= 0 ? '+' : '') + ind.val.toFixed(1) + ind.unit, gx2 + 6, 106);

              });

              // History chart

              if (macroHistory.length > 1) {

                var mhX = 40, mhY = 140, mhW = W - 80, mhH = H - 200;

                ctx.fillStyle = '#1e293b'; ctx.fillRect(mhX, mhY, mhW, mhH);

                // Plot GDP line

                var gdpVals = macroHistory.map(function (h) { return h.gdp; });

                var gdpMin = Math.min.apply(null, gdpVals) - 1;

                var gdpMax = Math.max.apply(null, gdpVals) + 1;

                var gdpRange = gdpMax - gdpMin || 1;

                ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.beginPath();

                gdpVals.forEach(function (v, vi) {

                  var x = mhX + (vi / Math.max(1, gdpVals.length - 1)) * mhW;

                  var y = mhY + mhH - ((v - gdpMin) / gdpRange) * mhH;

                  vi === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);

                });

                ctx.stroke();

                // Plot inflation line

                var infVals = macroHistory.map(function (h) { return h.inflation; });

                ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); ctx.beginPath();

                infVals.forEach(function (v, vi) {

                  var infRange = (Math.max.apply(null, infVals) + 1) - (Math.min.apply(null, infVals) - 1) || 1;

                  var infMin = Math.min.apply(null, infVals) - 1;

                  var x = mhX + (vi / Math.max(1, infVals.length - 1)) * mhW;

                  var y = mhY + mhH - ((v - infMin) / infRange) * mhH;

                  vi === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);

                });

                ctx.stroke(); ctx.setLineDash([]);

                // Plot unemployment line (entries created before this feature
                // existed lack the field \u2014 skip the line rather than plot NaN)

                var unVals = macroHistory.map(function (h) { return h.unemployment; });

                if (unVals.every(function (v) { return typeof v === 'number'; })) {

                  var unMin = Math.min.apply(null, unVals) - 1;

                  var unRange = (Math.max.apply(null, unVals) + 1) - unMin || 1;

                  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.setLineDash([2, 4]); ctx.beginPath();

                  unVals.forEach(function (v, vi) {

                    var x = mhX + (vi / Math.max(1, unVals.length - 1)) * mhW;

                    var y = mhY + mhH - ((v - unMin) / unRange) * mhH;

                    vi === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);

                  });

                  ctx.stroke(); ctx.setLineDash([]);

                }

                // Legend

                ctx.font = '18px Inter, system-ui';

                ctx.fillStyle = '#22c55e'; ctx.fillText('\u2014 GDP Growth', mhX + 12, mhY + 26);

                ctx.fillStyle = '#ef4444'; ctx.fillText('--- Inflation', mhX + 200, mhY + 26);

                ctx.fillStyle = '#fbbf24'; ctx.fillText('\u00b7\u00b7\u00b7 Unemployment', mhX + 360, mhY + 26);

                ctx.fillStyle = '#94a3b8';

                ctx.fillText('Year ' + (macroHistory[0].year || 2025), mhX, mhY + mhH + 24);

                ctx.fillText('Year ' + (macroHistory[macroHistory.length - 1].year || macroYear), mhX + mhW - 110, mhY + mhH + 24);

              } else {

                ctx.font = '24px Inter, system-ui'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';

                ctx.fillText('Set your policy levers below, then press "Advance One Year"', W / 2, H / 2);

                ctx.font = '19px Inter, system-ui'; ctx.fillStyle = '#64748b';

                ctx.fillText('Each simulated year plots GDP growth and inflation here', W / 2, H / 2 + 36);

                ctx.textAlign = 'left';

              }

            }



            else if (econTab === 'entrepreneur') {

              // -- Business Sim dashboard: draws the LIVE enBiz* state --
              // (The old lemonade-stand drawing read enDay/enCash/enHistory,
              // which the AI business sim never writes, so the canvas showed a
              // frozen Day 1 / $20.00 forever regardless of play.)

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              var bz = d.enBusiness;

              if (!bz) {

                ctx.textAlign = 'center';

                ctx.font = 'bold 60px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

                ctx.fillText('🚀', W / 2, H / 2 - 50);

                ctx.font = 'bold 26px Inter, system-ui';

                ctx.fillText('No business yet', W / 2, H / 2 + 4);

                ctx.font = '20px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                ctx.fillText('Describe a business idea below and launch it to see your dashboard here.', W / 2, H / 2 + 42);

                ctx.textAlign = 'left';

              }

              if (bz) {

                var bzPrice = d.enBizPrice || bz.suggestedPrice || 10;

                var bzUnitCost = bz.unitCost || 5;

                var bzFixed = bz.dailyFixedCosts || 50;

                ctx.font = 'bold 40px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

                ctx.fillText(bz.emoji || '🏪', 40, 64);

                ctx.font = 'bold 28px Inter, system-ui';

                ctx.fillText(bz.businessName || 'My Business', 104, 54);

                ctx.font = '20px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                ctx.fillText('Day ' + (d.enBizDay || 1) + '  |  ' + (d.enBizEmployees || 0) + ' staff', 104, 84);

                ctx.font = 'bold 32px Inter, system-ui'; ctx.fillStyle = (d.enBizCash || 0) >= 0 ? '#22c55e' : '#ef4444';

                ctx.fillText('💵 $' + (d.enBizCash || 0).toLocaleString(), 40, 134);

                ctx.font = '20px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                ctx.fillText('Reputation', 40, 176);

                ctx.fillStyle = '#1e293b'; ctx.fillRect(170, 158, 300, 22);

                var bzRep = Math.min(100, Math.max(0, d.enBizRep || 50));

                ctx.fillStyle = bzRep >= 70 ? '#22c55e' : bzRep >= 40 ? '#fbbf24' : '#ef4444';

                ctx.fillRect(170, 158, 300 * bzRep / 100, 22);

                ctx.fillStyle = '#e2e8f0'; ctx.fillText(bzRep + '/100', 484, 176);

                ctx.font = '20px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                ctx.fillText('Price: $' + bzPrice.toFixed(2) + ' per ' + (bz.unitName || 'unit') + '   Unit cost: $' + bzUnitCost.toFixed(2) + '   Fixed: $' + bzFixed.toFixed(0) + '/day', 40, 222);

                var bzBreakEven = Math.ceil(bzFixed / Math.max(0.01, bzPrice - bzUnitCost));

                ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 22px Inter, system-ui';

                ctx.fillText('Break-even: ' + bzBreakEven + ' ' + (bz.unitName || 'unit') + 's/day to cover fixed costs', 40, 258);

                var bzHist = d.enBizHistory || [];

                if (bzHist.length > 0) {

                  var phX = W * 0.55, phY = 120, phW = W * 0.4, phH = H - 250;

                  ctx.fillStyle = '#1e293b'; ctx.fillRect(phX, phY, phW, phH);

                  ctx.font = 'bold 22px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

                  ctx.fillText('Daily Profit', phX, phY - 12);

                  var maxProfit = Math.max.apply(null, bzHist.map(function (h) { return Math.abs(h.profit || 0); })) || 1;

                  var zeroY = phY + phH / 2;

                  ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;

                  ctx.beginPath(); ctx.moveTo(phX, zeroY); ctx.lineTo(phX + phW, zeroY); ctx.stroke();

                  ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.beginPath();

                  bzHist.forEach(function (h, hi) {

                    var hx3 = phX + (hi / (Math.max(1, bzHist.length - 1))) * phW;

                    var hy3 = zeroY - ((h.profit || 0) / maxProfit) * phH / 2;

                    hi === 0 ? ctx.moveTo(hx3, hy3) : ctx.lineTo(hx3, hy3);

                  });

                  ctx.stroke();

                  bzHist.forEach(function (h, hi) {

                    var hx4 = phX + (hi / (Math.max(1, bzHist.length - 1))) * phW;

                    var hy4 = zeroY - ((h.profit || 0) / maxProfit) * phH / 2;

                    ctx.beginPath(); ctx.arc(hx4, hy4, 5, 0, Math.PI * 2);

                    ctx.fillStyle = (h.profit || 0) >= 0 ? '#22c55e' : '#ef4444'; ctx.fill();

                  });

                  var bzLast = bzHist[bzHist.length - 1];

                  ctx.font = '18px Inter, system-ui'; ctx.fillStyle = (bzLast.profit || 0) >= 0 ? '#22c55e' : '#ef4444';

                  ctx.fillText('Yesterday: ' + ((bzLast.profit || 0) >= 0 ? '+' : '') + '$' + (bzLast.profit || 0).toFixed(0) + ' (' + (bzLast.customers || 0) + ' customers)', phX, phY + phH + 30);

                } else {

                  ctx.font = '20px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                  ctx.fillText('Run your first day to chart daily profit here.', W * 0.55, H / 2);

                }

              }

            }
          }, 0);

          function economicsCanvasSummary() {
            if (econTab === 'supplyDemand') {
              var eqQ = (80 - sdSupplyShift * 5 + sdDemandShift * 5) / (sdDemSlope + sdSupSlope);
              var eqP = 10 + eqQ * sdSupSlope + sdSupplyShift * 5;
              var sdSummary = t('stem.economicslab.canvas_summary_supply_demand', 'Supply and demand graph showing demand, supply, equilibrium price, equilibrium quantity, surplus, shortage, and tax effects.') + ' P* $' + eqP.toFixed(0) + ', Q* ' + eqQ.toFixed(0) + '.';
              if (sdPriceCeiling > 0 && sdPriceCeiling < eqP) {
                var sumQd = Math.max(0, Math.min(100, (90 + sdDemandShift * 5 - sdPriceCeiling) / sdDemSlope));
                var sumQs = Math.max(0, Math.min(100, (sdPriceCeiling - 10 - sdSupplyShift * 5) / sdSupSlope));
                sdSummary += ' ' + t('stem.economicslab.canvas_summary_shortage', 'Binding price ceiling: shortage of about') + ' ' + Math.max(0, sumQd - sumQs).toFixed(0) + ' ' + t('stem.economicslab.units', 'units') + '.';
              }
              if (sdPriceFloor > 0 && sdPriceFloor > eqP) {
                var sumQd2 = Math.max(0, Math.min(100, (90 + sdDemandShift * 5 - sdPriceFloor) / sdDemSlope));
                var sumQs2 = Math.max(0, Math.min(100, (sdPriceFloor - 10 - sdSupplyShift * 5) / sdSupSlope));
                sdSummary += ' ' + t('stem.economicslab.canvas_summary_surplus', 'Binding price floor: surplus of about') + ' ' + Math.max(0, sumQs2 - sumQd2).toFixed(0) + ' ' + t('stem.economicslab.units', 'units') + '.';
              }
              if (sdTax > 0) {
                var sumQt = Math.max(0, eqQ - sdTax / (sdDemSlope + sdSupSlope));
                sdSummary += ' ' + t('stem.economicslab.canvas_summary_tax', 'Per-unit tax of') + ' $' + sdTax + ' ' + t('stem.economicslab.canvas_summary_tax_2', 'cuts trades to about') + ' ' + sumQt.toFixed(0) + ' ' + t('stem.economicslab.units', 'units') + ' (' + t('stem.economicslab.deadweight_loss', 'deadweight loss') + ').';
              }
              if (d.sdProbe !== null && d.sdProbe !== undefined) {
                var sumPd = 90 - d.sdProbe * sdDemSlope + sdDemandShift * 5;
                var sumPs = 10 + d.sdProbe * sdSupSlope + sdSupplyShift * 5;
                sdSummary += ' ' + t('stem.economicslab.canvas_summary_probe', 'Probe at quantity') + ' ' + d.sdProbe + ': $' + Math.max(0, sumPd).toFixed(0) + ' / $' + Math.max(0, sumPs).toFixed(0) + '.';
              }
              sdSummary += ' ' + t('stem.economicslab.canvas_probe_hint', 'Click the graph — or focus it and use arrow keys — to probe buyer value vs producer cost at any quantity.');
              return sdSummary;
            }
            if (econTab === 'personalFinance') {
              var expensesTotal = pfRent + pfFood + pfTransport + pfEntertain + pfSavings;
              return t('stem.economicslab.canvas_summary_personal_finance', 'Personal finance chart showing a monthly budget pie chart and compound-interest growth projection.') + ' Income $' + pfIncome.toLocaleString() + ', expenses $' + expensesTotal.toLocaleString() + '.';
            }
            if (econTab === 'stockMarket') {
              var co = smCompanies[smSelected];
              return co
                ? t('stem.economicslab.canvas_summary_stock_market', 'Stock market chart showing selected company price history, portfolio cash, holdings, and current value.') + ' Selected: ' + co.ticker + ' at $' + co.price.toFixed(2) + '.'
                : t('stem.economicslab.canvas_summary_stock_market_empty', 'Stock market chart area ready for a generated market. Start a market simulation to see price history and holdings.');
            }
            if (econTab === 'entrepreneur') {
              return d.enBusiness
                ? t('stem.economicslab.canvas_summary_business', 'Business dashboard showing cash, reputation, unit economics, break-even point, and daily profit history.') + ' ' + (d.enBusiness.businessName || '') + ', ' + t('stem.economicslab.day', 'day') + ' ' + (d.enBizDay || 1) + ', $' + (d.enBizCash || 0).toLocaleString() + '.'
                : t('stem.economicslab.canvas_summary_business_empty', 'Business dashboard placeholder. Launch a business below to see cash, reputation, and daily profit here.');
            }
            if (econTab === 'macro') {
              return t('stem.economicslab.canvas_summary_macro', 'National economy dashboard showing GDP growth, inflation, interest rate, unemployment, trade balance, and policy history.') + ' GDP ' + macroGDP.toFixed(1) + '%, inflation ' + macroInflation.toFixed(1) + '%, unemployment ' + macroUnemployment.toFixed(1) + '%.';
            }
            return t('stem.economicslab.canvas_summary_inquiry', 'Policy inquiry mode uses four policy levers to model a toy macro outcome. Use the policy bars below to compare GDP, inflation, and unemployment changes.');
          }

          function economicsTeacherPrompt() {
            if (econTab === 'supplyDemand') return t('stem.economicslab.teacher_prompt_supply_demand', 'Ask students to predict whether price, quantity, surplus, or shortage changes before moving a slider.');
            if (econTab === 'personalFinance') return t('stem.economicslab.teacher_prompt_personal_finance', 'Ask students to name one trade-off in the budget and one reason compound interest rewards starting early.');
            if (econTab === 'stockMarket') return t('stem.economicslab.teacher_prompt_stock_market', 'Ask students to separate price movement, business fundamentals, and portfolio risk in one explanation.');
            if (econTab === 'entrepreneur') return t('stem.economicslab.teacher_prompt_entrepreneur', 'Ask students to estimate break-even cups before opening the business for the day.');
            if (econTab === 'macro') return t('stem.economicslab.teacher_prompt_macro', 'Ask students to choose one policy goal and identify the metric that would show progress or harm.');
            return t('stem.economicslab.teacher_prompt_inquiry', 'Ask students which policy lever economists would most disagree about, then explain why the model is only a heuristic.');
          }

          var econCanvasSummary = economicsCanvasSummary();
          var econTeacherPrompt = economicsTeacherPrompt();
          var econReferenceItems = [
            { key: 'showScenarioChallenge', label: t('stem.economicslab.reference_challenge', 'Challenge') },
            { key: 'showEconQuickRef', label: t('stem.economicslab.reference_quick_ref', 'Quick ref') },
            { key: 'showEconTimeline', label: t('stem.economicslab.reference_timeline', 'Timeline') },
            { key: 'showConceptLib', label: t('stem.economicslab.reference_concepts', 'Concepts') },
            { key: 'showEconSchools', label: t('stem.economicslab.reference_schools', 'Schools') },
            { key: 'showMarketStructures', label: t('stem.economicslab.reference_markets', 'Markets') },
            { key: 'showBudgetRules', label: t('stem.economicslab.reference_budget', 'Budget') },
            { key: 'showCompoundCalc', label: t('stem.economicslab.reference_compound', 'Compound') },
            { key: 'showInflationCalc', label: t('stem.economicslab.reference_inflation', 'Inflation') },
            { key: 'showBizCycle', label: t('stem.economicslab.reference_cycle', 'Cycle') },
            { key: 'showGdpBreakdown', label: t('stem.economicslab.reference_gdp', 'GDP') },
            { key: 'showEconomists', label: t('stem.economicslab.reference_people', 'People') },
            { key: 'showIndicators', label: t('stem.economicslab.reference_indicators', 'Indicators') }
          ];
          var econOpenReferenceCount = econReferenceItems.reduce(function(total, item) {
            return total + (d[item.key] ? 1 : 0);
          }, 0);

          var ECON_TABS = [
            { id: 'supplyDemand', label: t('stem.economicslab.supply_demand_3', '📉 Supply & Demand') },
            { id: 'personalFinance', label: t('stem.economicslab.personal_finance', '🏦 Personal Finance') },
            { id: 'stockMarket', label: t('stem.economicslab.stock_market', '📈 Stock Market') },
            { id: 'entrepreneur', label: t('stem.economicslab.business_sim', '🏪 Business Sim') },
            { id: 'macro', label: t('stem.economicslab.national_economy', '🏛️ National Economy') },
            { id: 'inquiry', label: t('stem.economicslab.policy_inquiry', '🔬 Policy Inquiry') }
          ];

          var econSelectTab = function (tabId, focusAfter) {
            var viewed = Object.assign({}, d.tabsViewed || {});
            viewed[tabId] = true;
            upd('tabsViewed', viewed);
            upd('econTab', tabId);
            if (focusAfter) setTimeout(function () { var el = document.getElementById('economicslab-tab-' + tabId); if (el) el.focus(); }, 0);
          };



          return React.createElement('div', { className: 'economicslab-tool-shell max-w-4xl mx-auto', "data-economicslab-tool": "true" },

            // Header

            React.createElement('div', { className: 'flex items-center gap-3 mb-4 flex-wrap' },

              React.createElement('button', {

                "aria-label": t('stem.economicslab.back_to_stem_tools', 'Back to STEM tools'),

                title: t('stem.economicslab.back', 'Back'),

                onClick: function () { setStemLabTool(null); },

                className: 'text-slate-500 hover:text-slate-700 transition-colors text-lg'

              }, '\u2190'),

              React.createElement('h2', { className: 'text-xl font-bold text-slate-800' }, t('stem.economicslab.economics_lab', '\uD83D\uDCB0 Economics Lab')),

              React.createElement('span', { className: 'text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full' }, t('stem.economicslab.5_simulators', '5 simulators')),

              React.createElement('span', {

                title: t('stem.economicslab.literacy_tooltip', 'Economic literacy grows with concepts learned, years simulated across the sims, quiz accuracy, and achievements earned'),

                className: 'text-[11px] font-bold px-2 py-0.5 rounded-full border ' +

                  (econLiteracyScore >= 80 ? 'text-green-700 bg-green-50 border-green-200' :

                    econLiteracyScore >= 50 ? 'text-blue-700 bg-blue-50 border-blue-200' :

                      econLiteracyScore >= 25 ? 'text-amber-700 bg-amber-50 border-amber-200' :

                        'text-slate-600 bg-slate-50 border-slate-200')

              }, '\uD83C\uDF93 Literacy: ' + econLiteracyScore + '%'),

              React.createElement('span', { className: 'text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200' }, t('stem.economicslab.ai_powered_learning', '\uD83D\uDCDA AI-Powered Learning')),

              econAchievements.length > 0 && React.createElement('button', {

                type: 'button',
                'aria-expanded': d.showAchievements ? 'true' : 'false',
                className: 'text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 cursor-pointer',

                onClick: function () { upd('showAchievements', !(d.showAchievements)); }

              }, '\uD83C\uDFC6 ' + econAchievements.length + ' achievements'),

              React.createElement('button', {

                type: 'button',
                'aria-expanded': d.showGlossary ? 'true' : 'false',
                className: 'text-[11px] text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200 cursor-pointer',

                onClick: function () { upd('showGlossary', !(d.showGlossary)); }

              }, '\uD83D\uDCD6 Glossary (' + (d.econGlossary || []).length + ')'),

              React.createElement('button', {

                type: 'button',
                'aria-expanded': d.showQuiz ? 'true' : 'false',
                onClick: function () { upd('showQuiz', !(d.showQuiz)); },

                className: 'text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 cursor-pointer font-bold'

              }, t('stem.economicslab.quiz_me', '\u270D\uFE0F Quiz Me')),

              React.createElement('button', {

                type: 'button',
                'aria-expanded': d.showAdvisor ? 'true' : 'false',
                onClick: function () { upd('showAdvisor', !(d.showAdvisor)); },

                className: 'text-[11px] text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 cursor-pointer font-bold'

              }, t('stem.economicslab.ask_tutor', '\uD83E\uDDD1\u200D\uD83C\uDFEB Ask Tutor')),

              React.createElement('select', {

                'aria-label': t('stem.economicslab.difficulty', 'Difficulty'),

                value: d.econDifficulty || 'medium',

                onChange: function (e) { upd('econDifficulty', e.target.value); if (addToast) addToast('Difficulty: ' + e.target.value.toUpperCase(), 'info'); },

                className: 'text-[11px] bg-slate-100 border border-slate-400 rounded-full px-2 py-0.5 text-slate-600 cursor-pointer'

              },

                React.createElement('option', { value: 'easy' }, t('stem.economicslab.easy', '\uD83C\uDF31 Easy')),

                React.createElement('option', { value: 'medium' }, t('stem.economicslab.medium', '\u2699\uFE0F Medium')),

                React.createElement('option', { value: 'hard' }, t('stem.economicslab.hard', '\uD83D\uDD25 Hard'))

              )

            ),

            // Tab bar

            React.createElement('div', {
              className: 'economicslab-tabbar flex gap-1 mb-4 bg-slate-100 rounded-xl p-1',
              role: 'tablist',
              'aria-label': t('stem.economicslab.topic_tabs', 'Economics Lab topics')
            },

              ECON_TABS.map(function (tab) {

                return React.createElement('button', {

                  key: tab.id,

                  role: 'tab',
                  id: 'economicslab-tab-' + tab.id,
                  'aria-selected': econTab === tab.id ? 'true' : 'false',
                  'aria-controls': 'economicslab-panel-' + tab.id,
                  // Roving tabindex + arrow keys (WAI-ARIA tabs pattern)
                  tabIndex: econTab === tab.id ? 0 : -1,
                  onKeyDown: function (e) {
                    var ids = ECON_TABS.map(function (x) { return x.id; });
                    var idx = ids.indexOf(tab.id);
                    var next = null;
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = ids[(idx + 1) % ids.length];
                    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = ids[(idx - 1 + ids.length) % ids.length];
                    else if (e.key === 'Home') next = ids[0];
                    else if (e.key === 'End') next = ids[ids.length - 1];
                    if (next) { e.preventDefault(); econSelectTab(next, true); }
                  },
                  onClick: function () {
                    econSelectTab(tab.id, false);
                  },

                  className: 'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ' +

                    (econTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-700')

                }, tab.label);

              })

            ),

            // ── Topic-accent hero band per tab ──
            (function() {
              var TAB_META = {
                supplyDemand:    { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)',  icon: '\uD83D\uDCC9', title: t('stem.economicslab.supply_demand_the_price_discovery_engi', 'Supply & Demand \u2014 the price-discovery engine'),     hint: t('stem.economicslab.demand_slopes_down_cheap_buy_more_supp', 'Demand slopes down (cheap = buy more); supply slopes up (expensive = produce more). Equilibrium price + quantity is where they cross. Adam Smith\u2019s 1776 Wealth of Nations is still the foundation.') },
                personalFinance: { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83C\uDFE6', title: t('stem.economicslab.personal_finance_budgeting_saving_cred', 'Personal Finance \u2014 budgeting, saving, credit'),     hint: t('stem.economicslab.50_30_20_needs_wants_save_compound_int', '50/30/20: needs / wants / save. Compound interest is the eighth wonder; a 30-year head start at 7% turns $1 into $7.61. Pay credit cards in full \u2014 19% APR is mafia rates.') },
                stockMarket:     { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\uD83D\uDCC8', title: t('stem.economicslab.stock_market_ownership_at_fractional_s', 'Stock Market \u2014 ownership at fractional scale'),     hint: t('stem.economicslab.buy_a_share_own_a_slice_of_the_company', 'Buy a share = own a slice of the company. S&P 500 has averaged ~10% annual returns over 100 years. Diversify (don\u2019t bet on one ticker), hold long (time in market beats timing it).') },
                entrepreneur:    { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83C\uDFEA', title: t('stem.economicslab.business_sim_you_re_the_founder', 'Business Sim \u2014 you\u2019re the founder'),           hint: t('stem.economicslab.revenue_costs_profit_break_even_point_', 'Revenue \u2212 costs = profit. Break-even point is when fixed costs are covered. Most small businesses fail in year 5; the survivors found product-market fit. Customer acquisition cost (CAC) vs lifetime value (LTV) is the founder\u2019s daily math.') },
                macro:           { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83C\uDFDB', title: t('stem.economicslab.national_economy_gdp_inflation_unemplo', 'National Economy \u2014 GDP, inflation, unemployment'),  hint: t('stem.economicslab.gdp_measures_total_output_cpi_measures', 'GDP measures total output; CPI measures inflation; unemployment U-3 is the headline rate. The Fed sets interest rates to balance growth vs inflation \u2014 the dual mandate Congress gave it in 1977.') }
              };
              // The inquiry tab used to fall back to the Supply & Demand hero.
              TAB_META.inquiry = { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)', icon: '🔬', title: t('stem.economicslab.policy_inquiry_hero', 'Policy Inquiry — no answer key'), hint: t('stem.economicslab.policy_inquiry_hero_hint', 'Move the levers, predict the macro state BEFORE reading it, and defend your reasoning. Real economists genuinely disagree about these signs and magnitudes.') };
              // One concrete predict-then-test task per tab.
              var TAB_TRY = {
                supplyDemand: t('stem.economicslab.try_supply_demand', 'Try: set a Price Ceiling of $30 (rent control). Predict first — how many units short will the market run?'),
                personalFinance: t('stem.economicslab.try_personal_finance', 'Try: invest 15% in Balanced and choose the Roommate housing. Watch net worth vs cash over 5 years.'),
                stockMarket: t('stem.economicslab.try_stock_market', 'Try: trade for 5 days, then compare your return to the buy-and-hold Index tile. Who is winning?'),
                entrepreneur: t('stem.economicslab.try_entrepreneur', 'Try: find your break-even before opening, then test a price 50% higher for one day. What happened to profit?'),
                macro: t('stem.economicslab.try_macro', 'Try: pick "Cool inflation" as your goal, raise the interest rate 2 points, and advance one year.'),
                inquiry: t('stem.economicslab.try_inquiry', 'Try: produce stagflation (high inflation + falling GDP) with the fewest lever moves you can.')
              };
              var meta = TAB_META[econTab] || TAB_META.supplyDemand;
              return React.createElement('div', {
                className: 'economicslab-topic-card',
                'data-economicslab-topic-card': 'true',
                id: 'economicslab-panel-' + econTab,
                role: 'tabpanel',
                'aria-labelledby': 'economicslab-tab-' + econTab,
                style: {
                  margin: '0 0 12px',
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, var(--allo-stem-canvas, #ffffff) 100%)',
                  border: '1px solid ' + meta.accent + '55',
                  borderLeft: '4px solid ' + meta.accent,
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                }
              },
                React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                React.createElement('div', { style: { flex: 1, minWidth: 220 } },
                  React.createElement('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                  React.createElement('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint),
                  TAB_TRY[econTab] && React.createElement('p', { style: { margin: '5px 0 0', color: meta.accent, fontSize: 11, lineHeight: 1.4, fontWeight: 700 } }, '🧪 ' + TAB_TRY[econTab])
                )
              );
            })(),

            React.createElement('div', {
              className: 'economicslab-reference-shelf',
              'data-economicslab-reference-shelf': 'true'
            },
              React.createElement('div', { className: 'economicslab-reference-shelf-head' },
                React.createElement('span', { className: 'economicslab-reference-shelf-title' }, t('stem.economicslab.reference_tools', 'Reference tools')),
                React.createElement('span', { className: 'economicslab-reference-shelf-count' },
                  econOpenReferenceCount > 0
                    ? t('stem.economicslab.reference_open_count', 'Open: ') + econOpenReferenceCount
                    : t('stem.economicslab.reference_closed_hint', 'Optional support')
                )
              ),
              React.createElement('div', {
                className: 'economicslab-reference-actions',
                role: 'group',
                'aria-label': t('stem.economicslab.reference_tool_group', 'Economics reference tools')
              },
                econReferenceItems.map(function(item) {
                  var isOpen = !!d[item.key];
                  return React.createElement('button', {
                    key: item.key,
                    type: 'button',
                    className: 'economicslab-reference-chip',
                    'aria-pressed': isOpen ? 'true' : 'false',
                    'aria-expanded': isOpen ? 'true' : 'false',
                    onClick: function() { upd(item.key, !isOpen); }
                  }, item.label);
                })
              )
            ),

            // Achievement panel

            d.showAchievements && React.createElement('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200 mb-4' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFC6 Achievements (' + econAchievements.length + '/21)'),

                React.createElement('button', { onClick: function () { upd('showAchievements', false); }, className: 'text-amber-400 hover:text-amber-600 text-xs' }, '\u2715')

              ),

              React.createElement('div', { className: 'grid grid-cols-4 gap-2' },

                econAchievements.map(function (a, ai) {

                  return React.createElement('div', { key: ai, className: 'bg-white rounded-lg p-2 text-center border border-amber-100 shadow-sm' },

                    React.createElement('div', { className: 'text-xl' }, a.icon),

                    React.createElement('div', { className: 'text-[11px] font-bold text-amber-800 mt-1' }, a.title),

                    React.createElement('div', { className: 'text-[11px] text-amber-600' }, a.desc)

                  );

                })

              )

            ),

            // Glossary panel

            d.showGlossary && React.createElement('div', { className: 'bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200 mb-4 max-h-60 overflow-y-auto' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-violet-800' }, '\uD83D\uDCD6 Economics Glossary (' + (d.econGlossary || []).length + ' concepts learned)'),

                React.createElement('div', { className: 'flex items-center gap-2' },

                  (d.econGlossary || []).length > 0 && React.createElement('button', {
                    onClick: function () {
                      var glossaryText = (d.econGlossary || []).map(function (g) { return g.concept + ' \u2014 ' + g.explanation; }).join('\n');
                      try { navigator.clipboard.writeText(glossaryText); if (addToast) addToast(t('stem.economicslab.glossary_copied', 'Glossary copied \u2014 paste it into your notes'), 'success'); } catch (e) { if (addToast) addToast('Copy failed', 'error'); }
                    },
                    className: 'text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 font-bold'
                  }, t('stem.economicslab.copy_glossary', '\uD83D\uDCCB Copy')),

                  React.createElement('button', { onClick: function () { upd('showGlossary', false); }, className: 'text-violet-400 hover:text-violet-600 text-xs', 'aria-label': t('stem.economicslab.close_glossary', 'Close glossary') }, '\u2715')

                )

              ),

              (d.econGlossary || []).length === 0 ? React.createElement('p', { className: 'text-xs text-violet-500 text-center py-4' }, t('stem.economicslab.play_the_simulations_to_discover_econo', 'Play the simulations to discover economics concepts! Each event teaches a new concept that gets added here.')) :

                React.createElement('div', { className: 'space-y-2' },

                  (d.econGlossary || []).map(function (g, gi) {

                    return React.createElement('div', { key: gi, className: 'bg-white rounded-lg p-2 border border-violet-100' },

                      React.createElement('div', { className: 'flex items-center gap-2' },

                        React.createElement('span', { className: 'text-[11px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-bold' }, g.tab),

                        React.createElement('span', { className: 'text-[11px] font-bold text-slate-700' }, g.concept)

                      ),

                      React.createElement('p', { className: 'text-[11px] text-slate-600 mt-1' }, g.explanation)

                    );

                  })

                )

            ),

            // Quiz mode

            d.showQuiz && React.createElement('div', { className: 'bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200 mb-4' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-rose-800' }, t('stem.economicslab.economics_quiz', '\u270D\uFE0F Economics Quiz')),

                React.createElement('button', { onClick: function () { upd('showQuiz', false); upd('quizQuestion', null); }, className: 'text-rose-400 hover:text-rose-600 text-xs' }, '\u2715')

              ),

              d.quizQuestion ? React.createElement('div', null,

                React.createElement('p', { className: 'text-xs text-slate-700 font-bold mb-3' }, d.quizQuestion.question),

                React.createElement('div', { className: 'grid gap-2' },

                  (d.quizQuestion.options || []).map(function (opt, oi) {

                    var isAnswered = d.quizAnswer !== undefined && d.quizAnswer !== null;

                    var isCorrect = oi === d.quizQuestion.correctIndex;

                    var isSelected = d.quizAnswer === oi;

                    return React.createElement('button', {

                      key: oi,

                      onClick: function () {

                        if (isAnswered) return;

                        upd('quizAnswer', oi);

                        upd('quizScore', (d.quizScore || 0) + (oi === d.quizQuestion.correctIndex ? 1 : 0));

                        if (oi === d.quizQuestion.correctIndex && typeof addXP === 'function') addXP(20, 'Economics Quiz: Correct answer!');

                        upd('quizTotal', (d.quizTotal || 0) + 1);

                      },

                      className: 'w-full text-left p-3 rounded-xl border-2 text-xs transition-all ' +

                        (isAnswered && isCorrect ? 'border-green-400 bg-green-50 text-green-800' :

                          isAnswered && isSelected && !isCorrect ? 'border-red-400 bg-red-50 text-red-800' :

                            isAnswered ? 'border-slate-200 bg-white text-slate-400 opacity-70' :

                              'border-rose-100 bg-white hover:border-rose-400 text-slate-700')

                    }, (isAnswered && isCorrect ? '\u2705 ' : isAnswered && isSelected ? '\u274C ' : '') + opt);

                  })

                ),

                d.quizAnswer !== undefined && d.quizAnswer !== null && React.createElement('div', { className: 'mt-3 bg-white rounded-lg p-3 border border-rose-100' },

                  React.createElement('p', { className: 'text-xs text-slate-600' },

                    React.createElement('span', { className: 'font-bold text-rose-700' }, t('stem.economicslab.explanation', '\uD83D\uDCDA Explanation: ')),

                    d.quizQuestion.explanation

                  )

                ),

                d.quizAnswer !== undefined && d.quizAnswer !== null && React.createElement('button', {

                  onClick: function () { upd('quizQuestion', null); upd('quizAnswer', null); },

                  className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200'

                }, t('stem.economicslab.next_question', '\u27A1\uFE0F Next Question'))

              ) :

                React.createElement('div', { className: 'text-center' },

                  React.createElement('div', { className: 'text-xs text-slate-600 mb-2' }, 'Score: ' + (d.quizScore || 0) + '/' + (d.quizTotal || 0) + (d.quizTotal > 0 ? ' (' + Math.round((d.quizScore || 0) / (d.quizTotal || 1) * 100) + '%)' : '')),

                  React.createElement('button', {

                    onClick: function () {

                      upd('quizLoading', true);

                      var topics = (d.econGlossary || []).map(function (g) { return g.concept; }).join(', ') || 'supply and demand, inflation, GDP, interest rates, opportunity cost';

                      var prompt = 'You are an economics teacher creating a quiz (difficulty: ' + (d.econDifficulty || 'medium') + '). The student has studied these topics: ' + topics + '.\n\nGenerate 1 multiple-choice question. Return ONLY valid JSON:\n{"question":"<question text>","options":["<option A>","<option B>","<option C>","<option D>"],"correctIndex":<0-3>,"explanation":"<2-3 sentence explanation of the correct answer and the underlying economic concept>"}\n\nMake questions that test UNDERSTANDING, not just definitions. Include real-world application questions, cause-and-effect reasoning, and scenario-based problems. Vary difficulty.';

                      callGemini(prompt, true).then(function (result) {

                        try {

                          var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                          var s = cleaned.indexOf('{'); if (s > 0) cleaned = cleaned.substring(s);

                          var e = cleaned.lastIndexOf('}'); if (e > 0) cleaned = cleaned.substring(0, e + 1);

                          upd('quizQuestion', JSON.parse(cleaned));

                          upd('quizAnswer', null);

                          upd('quizLoading', false);

                        } catch (err) { upd('quizLoading', false); if (addToast) addToast(t('stem.economicslab.quiz_failed_offline_hint', 'Quiz generation failed — try the Challenge scenarios in the reference shelf (they work offline)'), 'error'); }

                      }).catch(function () { upd('quizLoading', false); if (addToast) addToast(t('stem.economicslab.quiz_failed_offline_hint', 'Quiz generation failed — try the Challenge scenarios in the reference shelf (they work offline)'), 'error'); });

                    },

                    disabled: d.quizLoading,

                    className: 'py-3 px-8 rounded-xl text-sm font-bold transition-all ' + (d.quizLoading ? 'bg-slate-300 text-slate-600' : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:shadow-lg')

                  }, d.quizLoading ? '\u23F3 Generating...' : '\uD83C\uDFB2 Generate Quiz Question')

                )

            ),

            // AI Economic Advisor

            d.showAdvisor && React.createElement('div', { className: 'bg-gradient-to-r from-sky-50 to-cyan-50 rounded-xl p-4 border border-sky-200 mb-4' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-sky-800' }, t('stem.economicslab.ai_economics_tutor', '\uD83E\uDDD1\u200D\uD83C\uDFEB AI Economics Tutor')),

                React.createElement('button', { onClick: function () { upd('showAdvisor', false); }, className: 'text-sky-400 hover:text-sky-600 text-xs' }, '\u2715')

              ),

              d.advisorAnswer && React.createElement('div', { className: 'bg-white rounded-lg p-3 border border-sky-100 mb-3 text-xs text-slate-700 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto' },

                d.advisorAnswer

              ),

              React.createElement('div', { className: 'flex gap-2' },

                React.createElement('input', {

                  type: 'text',

                  value: d.advisorInput || '',

                  onChange: function (e) { upd('advisorInput', e.target.value); },

                  onKeyDown: function (e) { if (e.key === 'Enter' && (d.advisorInput || '').trim()) { document.getElementById('econ-advisor-ask').click(); } },

                  placeholder: t('stem.economicslab.ask_any_economics_question', 'Ask any economics question...'),

                  className: 'flex-1 px-3 py-2 border-2 border-sky-200 rounded-xl text-xs focus:border-sky-400'

                }),

                React.createElement('button', {

                  id: 'econ-advisor-ask',

                  onClick: function () {

                    if (!(d.advisorInput || '').trim()) return;

                    upd('advisorLoading', true);

                    var context = 'Student is using an economics simulator with: Supply & Demand (equilibrium, shifts, price controls), Personal Finance Life Sim (age ' + (d.pfAge || 22) + ', salary $' + (d.pfSalary || 35000) + ', credit ' + (d.pfCredit || 650) + '), Stock Market (day ' + (d.smDay || 0) + '), Business Sim (day ' + (d.enBizDay || 0) + '), and National Economy (GDP ' + (d.macroGDP || 2.1) + '%, inflation ' + (d.macroInflation || 3.2) + '%, interest ' + (d.macroInterest || 5.25) + '%).';

                    var prompt = 'You are a friendly economics tutor for students. ' + context + '\n\nStudent asks: "' + d.advisorInput.trim() + '"\n\nProvide a clear, educational answer. Use real-world examples. If relevant, explain how this connects to what the student is experiencing in their simulation. Keep the answer concise but thorough (3-5 paragraphs max). Use simple language appropriate for students.';

                    callGemini(prompt, true).then(function (result) {

                      upd('advisorAnswer', result);

                      upd('advisorLoading', false);

                      upd('advisorInput', '');

                      // Add to glossary

                      var gl = (d.econGlossary || []).slice();

                      var exists = gl.some(function (g) { return g.concept === d.advisorInput.trim().substring(0, 50); });

                      if (!exists && gl.length < 100) { gl.push({ tab: 'Advisor', concept: d.advisorInput.trim().substring(0, 50), explanation: result.substring(0, 200) + '...' }); upd('econGlossary', gl); }

                      if (typeof addXP === 'function') addXP(10, 'Asked an economics question');

                    }).catch(function () { upd('advisorLoading', false); });

                  },

                  disabled: d.advisorLoading || !(d.advisorInput || '').trim(),

                  className: 'px-4 py-2 rounded-xl text-xs font-bold ' + (d.advisorLoading ? 'bg-slate-300 text-slate-600' : 'bg-sky-500 text-white')

                }, d.advisorLoading ? '\u23F3' : '\uD83D\uDCAC Ask')

              ),

              // Quick question suggestions

              !d.advisorAnswer && React.createElement('div', { className: 'flex flex-wrap gap-1 mt-2' },

                // Suggestions follow the active tab so the tutor meets students
                // where they are instead of offering the same six generic asks.
                (({
                  supplyDemand: ['Why do price ceilings cause shortages?', 'What shifts a demand curve?', 'What is deadweight loss?', 'Why do buyers AND sellers pay part of a tax?'],
                  personalFinance: ['Why does compound interest matter more when young?', 'Good debt vs bad debt?', 'How does a credit score work?', 'How big should an emergency fund be?'],
                  stockMarket: ['What is an index fund?', 'Why diversify investments?', 'What makes stock prices move?', 'Is timing the market a good idea?'],
                  entrepreneur: ['What is break-even analysis?', 'How do I price a product?', 'Why do most small businesses fail?', 'Fixed vs variable costs?'],
                  macro: ['How do interest rates fight inflation?', 'What causes a recession?', 'What is the Fed\'s dual mandate?', 'Why is some unemployment normal?'],
                  inquiry: ['Why do economists disagree so much?', 'What is stagflation?', 'Do tax cuts pay for themselves?', 'What would flip this model\'s signs?']
                })[econTab] || ['What is inflation?', 'How do interest rates work?', 'What causes a recession?', 'What is GDP?']).map(function (q) {

                  return React.createElement('button', {

                    key: q,

                    onClick: function () { upd('advisorInput', q); },

                    className: 'text-[11px] px-2 py-1 rounded-full bg-sky-100 text-sky-600 hover:bg-sky-200'

                  }, q);

                })

              )

            ),

            
            
            
            // === ECONOMICS SCENARIO CHALLENGES ===
            d.showScenarioChallenge && React.createElement('div', { className: 'bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200 mb-4' },
              React.createElement('h4', { className: 'text-sm font-bold text-rose-800 mb-2' }, '\uD83C\uDFAF Economics Scenarios (' + (econScenarioIdx + 1) + '/' + ECON_SCENARIOS.length + ')'),
              // Streak + score
              React.createElement('div', { className: 'flex justify-between items-center mb-2' },
                econStreak > 0 ? React.createElement('span', { className: 'inline-block px-3 py-0.5 rounded-full text-[11px] font-bold ' + (econStreak >= 5 ? 'bg-amber-700 text-white animate-pulse' : econStreak >= 3 ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600') },
                  '\uD83D\uDD25 ' + econStreak + ' streak!' + (econStreak >= 5 ? ' AMAZING!' : econStreak >= 3 ? ' On fire!' : '')) : null,
                React.createElement('span', { className: 'text-[11px] text-slate-600' }, 'Score: ' + econScenarioScore + '/' + econScenarioTotal + ' | Best: ' + econBestStreak)
              ),
              econScenarioTotal >= ECON_SCENARIOS.length && React.createElement('div', { className: 'text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 mb-2 text-center' },
                t('stem.economicslab.scenario_complete', '🏁 Full deck answered! ') + econScenarioScore + '/' + econScenarioTotal + t('stem.economicslab.scenario_complete_2', ' correct, best streak ') + econBestStreak + t('stem.economicslab.scenario_complete_3', '. Scenarios repeat — can you beat your streak?')),
              (function() {
                var sc = ECON_SCENARIOS[econScenarioIdx];
                if (!sc) return null;
                var answered = econScenarioAnswer >= 0;
                var isCorrect = econScenarioAnswer === sc.correct;
                return React.createElement('div', null,
                  React.createElement('div', { className: 'bg-white rounded-xl p-3 mb-2 border border-rose-100' },
                    React.createElement('div', { className: 'text-[11px] text-slate-700 leading-relaxed' }, sc.scenario)
                  ),
                  React.createElement('div', { className: 'text-[11px] font-bold text-slate-800 mb-2' }, sc.question),
                  React.createElement('div', { className: 'space-y-1.5 mb-2' },
                    sc.options.map(function(opt, oi) {
                      var isSelected = econScenarioAnswer === oi;
                      var isRight = oi === sc.correct;
                      var cls = !answered ? 'border-rose-100 bg-white hover:border-rose-400 cursor-pointer' :
                        isRight ? 'border-green-400 bg-green-50' :
                        isSelected && !isRight ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white opacity-40';
                      return React.createElement('button', { key: oi,
                        onClick: function() {
                          if (answered) return;
                          upd('econScenarioAnswer', oi);
                          upd('econScenarioTotal', econScenarioTotal + 1);
                          if (oi === sc.correct) {
                            upd('econScenarioScore', econScenarioScore + 1);
                            var ns = econStreak + 1;
                            upd('econStreak', ns);
                            if (ns > econBestStreak) upd('econBestStreak', ns);
                            if (addToast) addToast('\u2705 Correct! +1 streak', 'success');
                            if (announceToSR) announceToSR('Correct! Streak is now ' + ns + '.');
                          } else {
                            upd('econStreak', 0);
                            if (addToast) addToast('\u274C Read the explanation!', 'info');
                            if (announceToSR) announceToSR('Incorrect. Read the explanation below.');
                          }
                        },
                        className: 'w-full text-left p-2.5 rounded-xl border-2 text-xs transition-all ' + cls,
                        disabled: answered
                      },
                        React.createElement('span', { className: 'font-bold mr-1 ' + (answered && isRight ? 'text-green-600' : answered && isSelected ? 'text-red-500' : 'text-slate-400') }, String.fromCharCode(65 + oi) + '.'),
                        React.createElement('span', { className: answered && isRight ? 'text-green-700' : answered && isSelected && !isRight ? 'text-red-600' : 'text-slate-700' }, ' ' + opt)
                      );
                    })
                  ),
                  answered && React.createElement('div', { className: 'space-y-2' },
                    React.createElement('div', { className: 'rounded-xl p-2.5 text-[11px] ' + (isCorrect ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700') },
                      (isCorrect ? '\u2705 ' : '\u274C ') + sc.explain
                    ),
                    React.createElement('div', { className: 'rounded-xl p-2 text-[11px] bg-indigo-50 border border-indigo-200 text-indigo-700' },
                      '\uD83D\uDCDA Concept: ' + sc.concept
                    ),
                    React.createElement('button', {
                      onClick: function() {
                        upd('econScenarioIdx', (econScenarioIdx + 1) % ECON_SCENARIOS.length);
                        upd('econScenarioAnswer', -1);
                      },
                      className: 'w-full py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                    }, t('stem.economicslab.next_scenario', 'Next Scenario \u2192'))
                  )
                );
              })()
            ),

            // === HISTORIC ECONOMIC EVENTS TIMELINE ===
            d.showEconTimeline && React.createElement('div', { className: 'bg-gradient-to-r from-slate-50 to-zinc-50 rounded-xl p-4 border border-slate-400 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-slate-800' }, t('stem.economicslab.economic_history_timeline', '\uD83D\uDCC5 Economic History Timeline')),
                React.createElement('button', {
                  onClick: function() { upd('showEconTimeline', !(d.showEconTimeline)); },
                  className: 'text-[11px] text-slate-600 hover:text-slate-700 font-bold'
                }, d.showEconTimeline ? 'Hide' : 'Explore \u2192')
              ),
              d.showEconTimeline && React.createElement('div', { className: 'relative ml-3 max-h-80 overflow-y-auto' },
                React.createElement('div', { className: 'absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-400 via-red-400 to-blue-400' }),
                React.createElement('div', { className: 'space-y-2 pl-5' },
                  ECON_EVENTS.map(function(ev, ei) {
                    var isActive = d.econEventIdx === ei;
                    return React.createElement('div', { key: ei,
                      onClick: function() { upd('econEventIdx', isActive ? null : ei); },
                      className: 'relative cursor-pointer'
                    },
                      React.createElement('div', { className: 'absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-slate-400' }),
                      React.createElement('div', { className: 'rounded-xl p-2.5 border transition-all ' + (isActive ? 'border-slate-400 bg-white shadow-md' : 'border-slate-100 bg-slate-50 hover:bg-white') },
                        React.createElement('div', { className: 'flex items-center gap-1.5' },
                          React.createElement('span', { className: 'text-lg' }, ev.icon),
                          React.createElement('span', { className: 'text-[11px] font-black text-amber-600 font-mono' }, ev.year),
                          React.createElement('span', { className: 'text-[11px] text-slate-700 font-bold flex-1' }, ev.event)
                        ),
                        isActive && React.createElement('div', { className: 'mt-2 space-y-1.5 pl-7' },
                          React.createElement('div', { className: 'text-[11px] text-slate-600' },
                            React.createElement('span', { className: 'font-bold text-red-600' }, t('stem.economicslab.impact', '\uD83D\uDCA5 Impact: ')),
                            ev.impact
                          ),
                          React.createElement('div', { className: 'text-[11px] text-indigo-600 bg-indigo-50 rounded-lg p-1.5 border border-indigo-100' },
                            React.createElement('span', { className: 'font-bold' }, t('stem.economicslab.lesson', '\uD83D\uDCDA Lesson: ')),
                            ev.lesson
                          )
                        )
                      )
                    );
                  })
                )
              )
            ),

            // === QUICK REFERENCE CARDS ===
            d.showEconQuickRef && React.createElement('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, t('stem.economicslab.quick_reference_cards', '\uD83D\uDCCB Quick Reference Cards')),
                React.createElement('button', {
                  onClick: function() { upd('showEconQuickRef', !(d.showEconQuickRef)); },
                  className: 'text-[11px] text-amber-500 hover:text-amber-700 font-bold'
                }, d.showEconQuickRef ? 'Hide' : 'View \u2192')
              ),
              d.showEconQuickRef && React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
                ECON_QUICK_REF.map(function(card, ci) {
                  return React.createElement('div', { key: ci,
                    className: 'rounded-xl p-2.5 border bg-white hover:shadow-sm transition-all hover:scale-[1.01]',
                    style: { borderColor: card.color + '40' }
                  },
                    React.createElement('div', { className: 'flex items-center gap-1 mb-1' },
                      React.createElement('span', { className: 'text-lg' }, card.icon),
                      React.createElement('span', { className: 'text-[11px] font-black', style: { color: card.color } }, card.title)
                    ),
                    React.createElement('div', { className: 'text-[11px] text-slate-600 leading-relaxed' }, card.content)
                  );
                })
              )
            ),


            // === INFLATION CALCULATOR ===
            d.showInflationCalc && React.createElement('div', { className: 'bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-red-800' }, t('stem.economicslab.inflation_calculator', '\uD83D\uDCB2 Inflation Calculator')),
                React.createElement('button', {
                  onClick: function() { upd('showInflationCalc', !(d.showInflationCalc)); },
                  className: 'text-[11px] text-red-500 hover:text-red-700 font-bold'
                }, d.showInflationCalc ? 'Hide' : 'Calculate \u2192')
              ),
              d.showInflationCalc && React.createElement('div', null,
                React.createElement('div', { className: 'text-[11px] text-slate-600 italic mb-3' }, t('stem.economicslab.see_how_inflation_erodes_purchasing_po', 'See how inflation erodes purchasing power over time. A dollar today is worth more than a dollar tomorrow!')),
                React.createElement('div', { className: 'grid grid-cols-3 gap-3 mb-3' },
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[11px] font-bold text-red-600 block mb-0.5' }, t('stem.economicslab.amount', 'Amount ($)')),
                    React.createElement('input', { type: 'number', value: d.inflationAmt || 100,
                      onChange: function(e) { upd('inflationAmt', parseFloat(e.target.value) || 100); },
                      className: 'w-full px-2 py-1.5 border border-red-200 rounded-lg text-xs focus:border-red-400'
                    })
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[11px] font-bold text-red-600 block mb-0.5' }, t('stem.economicslab.inflation_rate', 'Inflation Rate (%)')),
                    React.createElement('input', { type: 'range', 'aria-valuetext': (d.inflationRate || 3) + '%', 'aria-label': t('stem.economicslab.inflation_rate_percent', 'Inflation rate, percent'), min: 0.5, max: 15, step: 0.5, value: d.inflationRate || 3,
                      onChange: function(e) { upd('inflationRate', parseFloat(e.target.value)); },
                      className: 'w-full accent-red-500'
                    }),
                    React.createElement('div', { className: 'text-[11px] text-center text-red-600 font-bold' }, (d.inflationRate || 3) + '%')
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[11px] font-bold text-red-600 block mb-0.5' }, t('stem.economicslab.years', 'Years')),
                    React.createElement('input', { type: 'range', 'aria-valuetext': (d.inflationYears || 20) + ' years', 'aria-label': t('stem.economicslab.years_2', 'Years'), min: 1, max: 50, value: d.inflationYears || 20,
                      onChange: function(e) { upd('inflationYears', parseInt(e.target.value)); },
                      className: 'w-full accent-red-500'
                    }),
                    React.createElement('div', { className: 'text-[11px] text-center text-red-600 font-bold' }, (d.inflationYears || 20) + ' years')
                  )
                ),
                (function() {
                  var amt = d.inflationAmt || 100;
                  var rate = (d.inflationRate || 3) / 100;
                  var yrs = d.inflationYears || 20;
                  var futureValue = amt / Math.pow(1 + rate, yrs);
                  var lostPct = ((1 - futureValue / amt) * 100).toFixed(1);
                  return React.createElement('div', { className: 'bg-white rounded-xl p-3 border border-red-100 text-center' },
                    React.createElement('div', { className: 'text-2xl font-black text-red-600' }, '$' + futureValue.toFixed(2)),
                    React.createElement('div', { className: 'text-[11px] text-slate-600 mt-0.5' }, 'Your $' + amt + ' will only buy $' + futureValue.toFixed(2) + ' worth of today\'s goods in ' + yrs + ' years'),
                    React.createElement('div', { className: 'text-[11px] font-bold text-red-500 mt-1' }, '\uD83D\uDCC9 ' + lostPct + '% of purchasing power lost!'),
                    React.createElement('div', { className: 'text-[11px] text-slate-600 mt-1 italic' }, 'Rule of 72: Money loses half its value in ~' + Math.round(72 / ((d.inflationRate || 3))) + ' years at ' + (d.inflationRate || 3) + '% inflation')
                  );
                })()
              )
            ),

            // === BUSINESS CYCLE DIAGRAM ===
            d.showBizCycle && React.createElement('div', { className: 'bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-green-800' }, t('stem.economicslab.business_cycle', '\uD83D\uDD04 Business Cycle')),
                React.createElement('button', {
                  onClick: function() { upd('showBizCycle', !(d.showBizCycle)); },
                  className: 'text-[11px] text-green-500 hover:text-green-700 font-bold'
                }, d.showBizCycle ? 'Hide' : 'Explore \u2192')
              ),
              d.showBizCycle && React.createElement('div', null,
                React.createElement('div', { className: 'text-[11px] text-slate-600 italic mb-3' }, t('stem.economicslab.the_economy_moves_through_repeating_cy', 'The economy moves through repeating cycles of expansion and contraction. Understanding where we are in the cycle helps predict what comes next.')),
                // Visual cycle
                React.createElement('div', { className: 'flex items-center justify-center gap-1 mb-3' },
                  BUSINESS_CYCLE_PHASES.map(function(phase, pi) {
                    var isActive = (d.bizCycleIdx || 0) === pi;
                    return React.createElement('div', { key: pi, className: 'flex items-center' },
                      React.createElement('button', {
                        onClick: function() { upd('bizCycleIdx', pi); },
                        className: 'flex flex-col items-center px-3 py-2 rounded-xl border-2 transition-all ' + (isActive ? 'scale-110 shadow-lg' : 'hover:scale-105'),
                        style: { borderColor: isActive ? phase.color : phase.color + '40', background: isActive ? phase.color + '15' : '#fff' }
                      },
                        React.createElement('span', { className: 'text-xl' }, phase.icon),
                        React.createElement('span', { className: 'text-[11px] font-black', style: { color: phase.color } }, phase.name)
                      ),
                      pi < 3 && React.createElement('span', { className: 'text-slate-400 text-lg mx-0.5', 'aria-hidden': 'true' }, '\u2192')
                    );
                  })
                ),
                // Detail for selected phase
                (function() {
                  var phase = BUSINESS_CYCLE_PHASES[d.bizCycleIdx || 0];
                  return React.createElement('div', {
                    className: 'rounded-xl p-3 border bg-white',
                    style: { borderColor: phase.color + '40' }
                  },
                    React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
                      React.createElement('span', { className: 'text-2xl' }, phase.icon),
                      React.createElement('div', null,
                        React.createElement('div', { className: 'text-[11px] font-black', style: { color: phase.color } }, phase.name),
                        React.createElement('div', { className: 'text-[11px] text-slate-600' }, 'Duration: ' + phase.duration)
                      )
                    ),
                    React.createElement('div', { className: 'text-[11px] font-bold text-slate-600 mb-1' }, 'Characteristics:'),
                    React.createElement('ul', { className: 'space-y-0.5 ml-3 mb-2' },
                      phase.characteristics.map(function(ch, chi) {
                        return React.createElement('li', { key: chi, className: 'text-[11px] text-slate-600 list-disc' }, ch);
                      })
                    ),
                    React.createElement('div', { className: 'text-[11px] text-blue-600 bg-blue-50 rounded-lg p-2 border border-blue-100 mb-1' },
                      React.createElement('span', { className: 'font-bold' }, t('stem.economicslab.policy_response', '\uD83C\uDFDB\uFE0F Policy Response: ')),
                      phase.policy
                    ),
                    React.createElement('div', { className: 'text-[11px] text-amber-600 italic' }, '\uD83D\uDCCA Indicators: ' + phase.indicators)
                  );
                })()
              )
            ),

            // === COMPOUND INTEREST CALCULATOR CONTROLS ===
            d.showCompoundCalc && React.createElement('div', { className: 'bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-emerald-800' }, t('stem.economicslab.compound_interest_calculator', '\uD83D\uDCCA Compound Interest Calculator')),
                React.createElement('button', {
                  onClick: function() { upd('showCompoundCalc', !(d.showCompoundCalc)); },
                  className: 'text-[11px] text-emerald-500 hover:text-emerald-700 font-bold'
                }, d.showCompoundCalc ? 'Hide' : 'Calculate \u2192')
              ),
              d.showCompoundCalc && React.createElement('div', null,
                React.createElement('div', { className: 'grid grid-cols-3 gap-3 mb-3' },
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[11px] font-bold text-emerald-600 block mb-0.5' }, 'Starting Amount: $' + (d.pfPrincipal || 1000).toLocaleString()),
                    React.createElement('input', { type: 'range', 'aria-valuetext': '$' + (d.pfPrincipal || 1000).toLocaleString(), 'aria-label': t('stem.economicslab.starting_amount_in_dollars', 'Starting amount in dollars'), min: 100, max: 50000, step: 100, value: d.pfPrincipal || 1000,
                      onChange: function(e) { upd('pfPrincipal', parseInt(e.target.value)); },
                      className: 'w-full accent-emerald-500'
                    })
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[11px] font-bold text-emerald-600 block mb-0.5' }, 'Annual Return: ' + (d.pfRate || 7) + '%'),
                    React.createElement('input', { type: 'range', 'aria-valuetext': (d.pfRate || 7) + '%', 'aria-label': t('stem.economicslab.annual_return_percent', 'Annual return, percent'), min: 1, max: 15, step: 0.5, value: d.pfRate || 7,
                      onChange: function(e) { upd('pfRate', parseFloat(e.target.value)); },
                      className: 'w-full accent-emerald-500'
                    })
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[11px] font-bold text-emerald-600 block mb-0.5' }, 'Years: ' + (d.pfYears || 30)),
                    React.createElement('input', { type: 'range', 'aria-valuetext': (d.pfYears || 30) + ' years', 'aria-label': t('stem.economicslab.years_3', 'Years'), min: 1, max: 50, value: d.pfYears || 30,
                      onChange: function(e) { upd('pfYears', parseInt(e.target.value)); },
                      className: 'w-full accent-emerald-500'
                    })
                  )
                ),
                (function() {
                  var p = d.pfPrincipal || 1000;
                  var r = (d.pfRate || 7) / 100;
                  var y = d.pfYears || 30;
                  var fv = p * Math.pow(1 + r, y);
                  var earned = fv - p;
                  return React.createElement('div', { className: 'bg-white rounded-xl p-3 border border-emerald-100 text-center' },
                    React.createElement('div', { className: 'text-2xl font-black text-emerald-600' }, '$' + Math.round(fv).toLocaleString()),
                    React.createElement('div', { className: 'text-[11px] text-slate-600 mt-0.5' }, 'From $' + p.toLocaleString() + ' invested at ' + (d.pfRate || 7) + '% for ' + y + ' years'),
                    React.createElement('div', { className: 'text-[11px] font-bold text-emerald-500 mt-1' }, '\uD83D\uDCC8 $' + Math.round(earned).toLocaleString() + ' earned through compound interest!'),
                    React.createElement('div', { className: 'text-[11px] text-slate-600 mt-1 italic' }, t('stem.economicslab.compound_interest_is_the_eighth_wonder', '"Compound interest is the eighth wonder of the world." \u2014 Albert Einstein (attributed)'))
                  );
                })()
              )
            ),

            // === BUDGET RULES ===
            d.showBudgetRules && React.createElement('div', { className: 'bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-blue-800' }, t('stem.economicslab.budget_rules', '\uD83D\uDCB0 Budget Rules')),
                React.createElement('button', {
                  onClick: function() { upd('showBudgetRules', !(d.showBudgetRules)); },
                  className: 'text-[11px] text-blue-500 hover:text-blue-700 font-bold'
                }, d.showBudgetRules ? 'Hide' : 'Learn \u2192')
              ),
              d.showBudgetRules && React.createElement('div', { className: 'space-y-3' },
                BUDGET_RULES.map(function(rule, ri) {
                  var isActive = (d.budgetRuleIdx || 0) === ri;
                  return React.createElement('div', { key: ri,
                    role: 'button', tabIndex: 0, 'aria-label': 'Show ' + rule.name + ' details',
                    onClick: function() { upd('budgetRuleIdx', ri); },
                    onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('budgetRuleIdx', ri); } },
                    className: 'cursor-pointer rounded-xl p-3 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 ' + (isActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300')
                  },
                    React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                      React.createElement('span', { className: 'text-lg' }, rule.icon),
                      React.createElement('span', { className: 'text-[11px] font-black text-slate-800' }, rule.name),
                      React.createElement('span', { className: 'text-[11px] text-slate-600' }, rule.desc)
                    ),
                    isActive && React.createElement('div', null,
                      // Visual bar
                      React.createElement('div', { className: 'flex rounded-full overflow-hidden h-6 mb-2' },
                        rule.parts.map(function(part) {
                          return React.createElement('div', { key: part.label,
                            className: 'flex items-center justify-center text-[11px] font-bold text-white',
                            style: { background: part.color, width: part.pct + '%' }
                          }, part.label + ' ' + part.pct + '%');
                        })
                      ),
                      // Applied to user income
                      React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
                        rule.parts.map(function(part) {
                          var monthlyIncome = Math.round((d.pfSalary || 35000) / 12);
                          var allocated = Math.round(monthlyIncome * part.pct / 100);
                          return React.createElement('div', { key: part.label,
                            className: 'rounded-lg p-2 text-center border',
                            style: { borderColor: part.color + '40' }
                          },
                            React.createElement('div', { className: 'text-[11px] font-bold', style: { color: part.color } }, part.label + ' (' + part.pct + '%)'),
                            React.createElement('div', { className: 'text-[11px] font-black text-slate-800' }, '$' + allocated.toLocaleString() + '/mo'),
                            React.createElement('div', { className: 'text-[11px] text-slate-600' }, part.items)
                          );
                        })
                      )
                    )
                  );
                })
              )
            ),

            // === SCHOOLS OF ECONOMIC THOUGHT ===
            d.showEconSchools && React.createElement('div', { className: 'bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl p-4 border border-purple-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-purple-800' }, t('stem.economicslab.schools_of_economic_thought', '\uD83C\uDFDB\uFE0F Schools of Economic Thought')),
                React.createElement('button', {
                  onClick: function() { upd('showEconSchools', !(d.showEconSchools)); },
                  className: 'text-[11px] text-purple-500 hover:text-purple-700 font-bold'
                }, d.showEconSchools ? 'Hide' : 'Compare \u2192')
              ),
              d.showEconSchools && React.createElement('div', null,
                React.createElement('div', { className: 'text-[11px] text-slate-600 italic mb-3' }, t('stem.economicslab.economists_disagree_different_schools_', 'Economists disagree! Different schools of thought offer different answers to the same questions. Understanding these perspectives helps you think critically about economic policy.')),
                // Comparison table
                React.createElement('div', { className: 'rounded-xl overflow-hidden border border-purple-200' },
                  // Header
                  React.createElement('div', { className: 'grid grid-cols-4 bg-purple-100 text-[11px] font-bold text-purple-800 uppercase' },
                    React.createElement('div', { className: 'p-1.5' }, t('stem.economicslab.school', 'School')),
                    React.createElement('div', { className: 'p-1.5 border-l border-purple-200' }, t('stem.economicslab.gov_t_role', 'Gov\'t Role')),
                    React.createElement('div', { className: 'p-1.5 border-l border-purple-200' }, t('stem.economicslab.on_recession', 'On Recession')),
                    React.createElement('div', { className: 'p-1.5 border-l border-purple-200' }, t('stem.economicslab.on_inflation', 'On Inflation'))
                  ),
                  ECON_SCHOOLS.map(function(school, si) {
                    var isActive = d.econSchoolIdx === si;
                    return React.createElement('div', { key: si },
                      React.createElement('div', {
                        role: 'button', tabIndex: 0, 'aria-label': 'Toggle ' + school.name + ' school details',
                        className: 'grid grid-cols-4 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 ' + (isActive ? '' : 'hover:bg-purple-50') + (si % 2 === 0 ? ' bg-white' : ' bg-slate-50'),
                        onClick: function() { upd('econSchoolIdx', isActive ? null : si); },
                        onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('econSchoolIdx', isActive ? null : si); } },
                        style: isActive ? { background: school.color + '10', borderLeft: '3px solid ' + school.color } : {}
                      },
                        React.createElement('div', { className: 'p-1.5 text-[11px]' },
                          React.createElement('span', { className: 'font-bold', style: { color: school.color } }, school.icon + ' ' + school.name),
                          React.createElement('div', { className: 'text-[11px] text-slate-600' }, school.era)
                        ),
                        React.createElement('div', { className: 'p-1.5 text-[11px] text-slate-600 border-l border-slate-100' }, school.govRole),
                        React.createElement('div', { className: 'p-1.5 text-[11px] text-slate-600 border-l border-slate-100' }, school.onRecession),
                        React.createElement('div', { className: 'p-1.5 text-[11px] text-slate-600 border-l border-slate-100' }, school.onInflation)
                      ),
                      isActive && React.createElement('div', { className: 'px-3 py-2 border-t border-slate-100', style: { background: school.color + '08', borderLeft: '3px solid ' + school.color } },
                        React.createElement('div', { className: 'text-[11px] text-slate-600 mb-1' },
                          React.createElement('span', { className: 'font-bold', style: { color: school.color } }, t('stem.economicslab.key_idea', '\uD83D\uDCA1 Key Idea: ')),
                          school.key
                        ),
                        React.createElement('div', { className: 'text-[11px] text-slate-600' },
                          React.createElement('span', { className: 'font-bold' }, t('stem.economicslab.famous', '\uD83C\uDF93 Famous: ')),
                          school.famous
                        )
                      )
                    );
                  })
                )
              )
            ),


            // === ECONOMICS CONCEPT LIBRARY ===
            d.showConceptLib && React.createElement('div', { className: 'bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-indigo-800' }, '\uD83D\uDCDA Economics Concept Library (' + ECON_CONCEPTS.length + ')'),
                React.createElement('button', {
                  onClick: function() { upd('showConceptLib', !(d.showConceptLib)); },
                  className: 'text-[11px] text-indigo-500 hover:text-indigo-700 font-bold'
                }, d.showConceptLib ? 'Hide' : 'Explore \u2192')
              ),
              d.showConceptLib && React.createElement('div', null,
                // Category filter
                React.createElement('div', { className: 'flex gap-1 mb-3 flex-wrap' },
                  ['all', 'fundamentals', 'micro', 'macro', 'finance', 'trade'].map(function(cat) {
                    return React.createElement('button', { key: cat,
                      onClick: function() { upd('econConceptFilter', cat); },
                      className: 'px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ' +
                        ((d.econConceptFilter || 'all') === cat ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-100')
                    }, cat.charAt(0).toUpperCase() + cat.slice(1));
                  })
                ),
                React.createElement('div', { className: 'grid grid-cols-2 gap-2 max-h-72 overflow-y-auto' },
                  ECON_CONCEPTS.filter(function(c) { return (d.econConceptFilter || 'all') === 'all' || c.category === d.econConceptFilter; }).map(function(concept, ci) {
                    var isActive = d.econConceptIdx === ci;
                    return React.createElement('div', { key: ci,
                      role: 'button', tabIndex: 0, 'aria-label': 'Toggle ' + concept.name + ' details',
                      onClick: function() { upd('econConceptIdx', isActive ? null : ci); },
                      onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('econConceptIdx', isActive ? null : ci); } },
                      className: 'cursor-pointer rounded-xl p-2.5 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ' + (isActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300')
                    },
                      React.createElement('div', { className: 'flex items-center gap-1.5 mb-1' },
                        React.createElement('span', { className: 'text-lg' }, concept.icon),
                        React.createElement('span', { className: 'text-[11px] font-black text-slate-800' }, concept.name),
                        React.createElement('span', { className: 'text-[11px] px-1 py-0.5 rounded bg-' + (concept.category === 'macro' ? 'blue' : concept.category === 'micro' ? 'green' : concept.category === 'finance' ? 'amber' : concept.category === 'trade' ? 'purple' : 'slate') + '-100 text-' + (concept.category === 'macro' ? 'blue' : concept.category === 'micro' ? 'green' : concept.category === 'finance' ? 'amber' : concept.category === 'trade' ? 'purple' : 'slate') + '-700 font-bold' }, concept.category)
                      ),
                      React.createElement('div', { className: 'text-[11px] text-slate-600' }, concept.def),
                      isActive && React.createElement('div', { className: 'mt-1.5 text-[11px] text-indigo-600 bg-indigo-50 rounded-lg p-1.5 border border-indigo-100' },
                        React.createElement('span', { className: 'font-bold' }, t('stem.economicslab.example', '\uD83D\uDCA1 Example: ')),
                        concept.example
                      )
                    );
                  })
                )
              )
            ),

            // === MARKET STRUCTURES ===
            d.showMarketStructures && React.createElement('div', { className: 'bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-emerald-800' }, t('stem.economicslab.market_structures', '\uD83C\uDFEA Market Structures')),
                React.createElement('button', {
                  onClick: function() { upd('showMarketStructures', !(d.showMarketStructures)); },
                  className: 'text-[11px] text-emerald-500 hover:text-emerald-700 font-bold'
                }, d.showMarketStructures ? 'Hide' : 'Compare \u2192')
              ),
              d.showMarketStructures && React.createElement('div', null,
                React.createElement('div', { className: 'text-[11px] text-slate-600 italic mb-2' }, t('stem.economicslab.markets_range_from_perfect_competition', 'Markets range from perfect competition (many sellers, identical products) to monopoly (one seller, unique product). Click each to learn more:')),
                // Spectrum bar
                React.createElement('div', { className: 'flex mb-3 rounded-full overflow-hidden h-4' },
                  MARKET_STRUCTURES.map(function(ms) {
                    return React.createElement('div', { key: ms.id,
                      className: 'flex-1 flex items-center justify-center text-[11px] font-bold text-white',
                      style: { background: ms.color },
                      title: ms.name
                    }, ms.name.split(' ')[0]);
                  })
                ),
                React.createElement('div', { className: 'flex items-center justify-between text-[11px] text-slate-600 mb-3' },
                  React.createElement('span', null, t('stem.economicslab.more_competition', '\u2190 More Competition')),
                  React.createElement('span', null, t('stem.economicslab.more_market_power', 'More Market Power \u2192'))
                ),
                // Cards
                React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
                  MARKET_STRUCTURES.map(function(ms, mi) {
                    var isActive = d.marketStructIdx === mi;
                    return React.createElement('div', { key: mi,
                      role: 'button', tabIndex: 0, 'aria-label': 'Toggle ' + ms.name + ' details',
                      onClick: function() { upd('marketStructIdx', isActive ? null : mi); },
                      onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('marketStructIdx', isActive ? null : mi); } },
                      className: 'cursor-pointer rounded-xl p-3 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 ' + (isActive ? 'scale-[1.02] shadow-md' : 'hover:scale-[1.01]'),
                      style: { borderColor: isActive ? ms.color : ms.color + '40', background: isActive ? ms.color + '08' : '#fff' }
                    },
                      React.createElement('div', { className: 'flex items-center gap-1 mb-1' },
                        React.createElement('span', { className: 'text-lg' }, ms.icon),
                        React.createElement('div', { className: 'text-[11px] font-black', style: { color: ms.color } }, ms.name)
                      ),
                      isActive && React.createElement('div', { className: 'space-y-1 mt-1' },
                        React.createElement('div', { className: 'grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]' },
                          React.createElement('span', { className: 'text-slate-600 font-bold' }, 'Sellers:'),
                          React.createElement('span', { className: 'text-slate-700' }, ms.sellers),
                          React.createElement('span', { className: 'text-slate-600 font-bold' }, 'Product:'),
                          React.createElement('span', { className: 'text-slate-700' }, ms.product),
                          React.createElement('span', { className: 'text-slate-600 font-bold' }, 'Barriers:'),
                          React.createElement('span', { className: 'text-slate-700' }, ms.barriers),
                          React.createElement('span', { className: 'text-slate-600 font-bold' }, 'Pricing:'),
                          React.createElement('span', { className: 'text-slate-700' }, ms.pricing),
                          React.createElement('span', { className: 'text-slate-600 font-bold' }, t('stem.economicslab.long_run_profit', 'Long-run Profit:')),
                          React.createElement('span', { className: 'text-slate-700' }, ms.profit)
                        ),
                        React.createElement('div', { className: 'text-[11px] text-amber-600 font-medium mt-1' }, '\uD83D\uDCA1 Examples: ' + ms.examples)
                      )
                    );
                  })
                )
              )
            ),

            // === GDP COMPONENTS ===
            d.showGdpBreakdown && React.createElement('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, t('stem.economicslab.gdp_c_i_g_x_m', '\uD83C\uDFDB\uFE0F GDP = C + I + G + (X\u2212M)')),
                React.createElement('button', {
                  onClick: function() { upd('showGdpBreakdown', !(d.showGdpBreakdown)); },
                  className: 'text-[11px] text-amber-500 hover:text-amber-700 font-bold'
                }, d.showGdpBreakdown ? 'Hide' : 'Explore \u2192')
              ),
              d.showGdpBreakdown && React.createElement('div', null,
                React.createElement('div', { className: 'text-[11px] text-slate-600 italic mb-3' }, t('stem.economicslab.gross_domestic_product_measures_the_to', 'Gross Domestic Product measures the total value of all final goods and services produced within a country\'s borders in a given year. Here\'s how it breaks down for the United States:')),
                // Bar chart visualization
                React.createElement('div', { className: 'flex items-end gap-1 h-24 mb-2 px-4' },
                  GDP_COMPONENTS.map(function(comp) {
                    var barH = Math.max(5, Math.abs(comp.pct) / 68 * 100);
                    return React.createElement('div', { key: comp.id, className: 'flex-1 flex flex-col items-center' },
                      React.createElement('div', { className: 'text-[11px] font-bold mb-0.5', style: { color: comp.color } }, (comp.pct > 0 ? '' : '') + comp.pct + '%'),
                      React.createElement('div', {
                        className: 'w-full rounded-t-lg transition-all',
                        style: { background: comp.color, height: barH + '%', minHeight: 8, opacity: 0.8 }
                      }),
                      React.createElement('div', { className: 'text-[11px] font-bold text-slate-600 mt-1' }, comp.id),
                      React.createElement('div', { className: 'text-[11px] text-slate-600' }, comp.name)
                    );
                  })
                ),
                // Detail cards
                React.createElement('div', { className: 'grid grid-cols-2 gap-2 mt-2' },
                  GDP_COMPONENTS.map(function(comp) {
                    return React.createElement('div', { key: comp.id,
                      className: 'rounded-xl p-2.5 border bg-white',
                      style: { borderColor: comp.color + '40' }
                    },
                      React.createElement('div', { className: 'flex items-center gap-1 mb-1' },
                        React.createElement('span', { className: 'text-lg' }, comp.icon),
                        React.createElement('span', { className: 'text-[11px] font-black', style: { color: comp.color } }, comp.id + ' \u2014 ' + comp.name),
                        React.createElement('span', { className: 'text-[11px] font-bold ml-auto', style: { color: comp.color } }, comp.pct + '%')
                      ),
                      React.createElement('div', { className: 'text-[11px] text-slate-600' }, comp.desc),
                      React.createElement('div', { className: 'text-[11px] text-amber-600 mt-0.5 italic' }, '\uD83D\uDCA1 ' + comp.examples)
                    );
                  })
                )
              )
            ),

            // === FAMOUS ECONOMISTS TIMELINE ===
            d.showEconomists && React.createElement('div', { className: 'bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-violet-800' }, t('stem.economicslab.famous_economists', '\uD83C\uDF93 Famous Economists')),
                React.createElement('button', {
                  onClick: function() { upd('showEconomists', !(d.showEconomists)); },
                  className: 'text-[11px] text-violet-500 hover:text-violet-700 font-bold'
                }, d.showEconomists ? 'Hide' : 'Meet Them \u2192')
              ),
              d.showEconomists && React.createElement('div', { className: 'space-y-2 max-h-72 overflow-y-auto' },
                FAMOUS_ECONOMISTS.map(function(econ, ei) {
                  var isActive = d.economistIdx === ei;
                  return React.createElement('div', { key: ei,
                    role: 'button', tabIndex: 0, 'aria-label': 'Toggle ' + econ.name + ' biography',
                    onClick: function() { upd('economistIdx', isActive ? null : ei); },
                    onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('economistIdx', isActive ? null : ei); } },
                    className: 'cursor-pointer rounded-xl p-2.5 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 ' + (isActive ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-300')
                  },
                    React.createElement('div', { className: 'flex items-center gap-2' },
                      React.createElement('span', { className: 'text-xl' }, econ.icon),
                      React.createElement('div', { className: 'flex-1' },
                        React.createElement('div', { className: 'flex items-center gap-2' },
                          React.createElement('span', { className: 'text-[11px] font-black text-slate-800' }, econ.name),
                          React.createElement('span', { className: 'text-[11px] text-slate-600 font-mono' }, econ.years)
                        ),
                        React.createElement('div', { className: 'text-[11px] text-violet-600 font-bold' }, econ.contribution)
                      ),
                      React.createElement('span', { className: 'text-[11px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-bold' }, econ.school)
                    ),
                    isActive && React.createElement('div', { className: 'mt-2 space-y-1 pl-8' },
                      React.createElement('div', { className: 'text-[11px] text-slate-600' },
                        React.createElement('span', { className: 'font-bold text-violet-700' }, t('stem.economicslab.key_work', '\uD83D\uDCDA Key Work: ')),
                        econ.work
                      ),
                      React.createElement('div', { className: 'text-[11px] text-slate-600 leading-relaxed' },
                        React.createElement('span', { className: 'font-bold text-amber-600' }, t('stem.economicslab.big_idea', '\uD83D\uDCA1 Big Idea: ')),
                        econ.idea
                      )
                    )
                  );
                })
              )
            ),

            // === ECONOMIC INDICATORS REFERENCE ===
            d.showIndicators && React.createElement('div', { className: 'bg-gradient-to-r from-cyan-50 to-sky-50 rounded-xl p-4 border border-cyan-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-cyan-800' }, '\uD83D\uDCCA Key Economic Indicators (' + ECONOMIC_INDICATORS.length + ')'),
                React.createElement('button', {
                  onClick: function() { upd('showIndicators', !(d.showIndicators)); },
                  className: 'text-[11px] text-cyan-500 hover:text-cyan-700 font-bold'
                }, d.showIndicators ? 'Hide' : 'View \u2192')
              ),
              d.showIndicators && React.createElement('div', { className: 'grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto' },
                ECONOMIC_INDICATORS.map(function(ind, ii) {
                  return React.createElement('div', { key: ii, className: 'rounded-lg p-2 bg-white border border-cyan-100' },
                    React.createElement('div', { className: 'flex items-center gap-1 mb-0.5' },
                      React.createElement('span', null, ind.icon),
                      React.createElement('span', { className: 'text-[11px] font-bold text-slate-700' }, ind.name)
                    ),
                    React.createElement('div', { className: 'text-[11px] text-slate-600' }, ind.desc),
                    React.createElement('div', { className: 'flex gap-2 mt-0.5' },
                      React.createElement('span', { className: 'text-[11px] text-green-600 font-bold' }, '\u2705 ' + ind.good),
                      React.createElement('span', { className: 'text-[11px] text-red-500 font-bold' }, '\u26A0 ' + ind.bad)
                    )
                  );
                })
              )
            ),


            // Macro indicators banner (always visible)

            (d.macroHistory || []).length > 0 && React.createElement('div', { className: 'flex gap-2 mb-2 bg-slate-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-300 overflow-x-auto' },

              React.createElement('span', { className: 'text-slate-600' }, t('stem.economicslab.macro', '\uD83C\uDFDB\uFE0F MACRO |')),

              React.createElement('span', { className: macroGDP >= 0 ? 'text-green-400' : 'text-red-400' }, 'GDP ' + (macroGDP >= 0 ? '+' : '') + macroGDP.toFixed(1) + '%'),

              React.createElement('span', { className: macroInflation > 4 ? 'text-red-400' : macroInflation > 2 ? 'text-amber-400' : 'text-green-400' }, 'INF ' + macroInflation.toFixed(1) + '%'),

              React.createElement('span', { className: macroInterest > 6 ? 'text-red-400' : 'text-amber-400' }, 'INT ' + macroInterest.toFixed(2) + '%'),

              React.createElement('span', { className: macroUnemployment > 5 ? 'text-red-400' : 'text-green-400' }, 'UNEMP ' + macroUnemployment.toFixed(1) + '%'),

              React.createElement('span', { className: macroTrade >= 0 ? 'text-green-400' : 'text-amber-400' }, 'TRADE ' + (macroTrade >= 0 ? '+' : '') + macroTrade.toFixed(1) + '%')

            ),

            // Canvas

            React.createElement('div', {
              className: 'economicslab-canvas-shell',
              'data-economicslab-canvas-shell': 'true'
            },

              // The inquiry tab has its own SVG visualization — don't render a
              // large permanently-empty canvas above it.
              econTab !== 'inquiry' && React.createElement('canvas', {

                ref: canvasRef,

                role: 'img',
                'aria-label': econCanvasSummary,
                'aria-describedby': 'economicslab-canvas-summary',
                tabIndex: 0,

                // Supply & Demand curve probe: click a quantity, or focus the
                // canvas and use arrow keys (Escape clears). Announced to SR.
                onClick: function (e) {
                  if (econTab !== 'supplyDemand') return;
                  var el = e.currentTarget;
                  var rect = el.getBoundingClientRect();
                  var xInternal = (e.clientX - rect.left) * 2;
                  var q = Math.round((xInternal - 76) / (el.offsetWidth * 2 - 140) * 100);
                  if (q < 0 || q > 100) { upd('sdProbe', null); return; }
                  upd('sdProbe', q);
                  var pd0 = 90 - q * sdDemSlope + sdDemandShift * 5;
                  var ps0 = 10 + q * sdSupSlope + sdSupplyShift * 5;
                  if (announceToSR) announceToSR('Quantity ' + q + ': buyers value $' + Math.max(0, pd0).toFixed(0) + ', producer cost $' + Math.max(0, ps0).toFixed(0) + (pd0 > ps0 ? '. Worth producing.' : '. Not worth producing.'));
                },
                onKeyDown: function (e) {
                  if (econTab !== 'supplyDemand') return;
                  var cur = (d.sdProbe === null || d.sdProbe === undefined) ? 50 : d.sdProbe;
                  var np = null;
                  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') np = Math.min(100, cur + 2);
                  else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') np = Math.max(0, cur - 2);
                  else if (e.key === 'Escape') { e.preventDefault(); upd('sdProbe', null); return; }
                  else return;
                  e.preventDefault();
                  upd('sdProbe', np);
                  var pd1 = 90 - np * sdDemSlope + sdDemandShift * 5;
                  var ps1 = 10 + np * sdSupSlope + sdSupplyShift * 5;
                  if (announceToSR) announceToSR('Quantity ' + np + ': buyers value $' + Math.max(0, pd1).toFixed(0) + ', producer cost $' + Math.max(0, ps1).toFixed(0) + (pd1 > ps1 ? '. Worth producing.' : '. Not worth producing.'));
                },

                className: 'w-full rounded-xl border border-slate-400',

                style: { height: '250px', background: 'var(--allo-stem-canvas, #0f172a)', cursor: econTab === 'supplyDemand' ? 'crosshair' : 'default' }

              }),

              React.createElement('div', {
                id: 'economicslab-canvas-summary',
                className: 'economicslab-canvas-summary',
                'data-economicslab-canvas-summary': 'true',
                'aria-live': 'polite'
              },
                React.createElement('strong', null, t('stem.economicslab.canvas_summary_label', 'Canvas summary')),
                econCanvasSummary
              ),

              React.createElement('div', {
                className: 'economicslab-teacher-prompt',
                'data-economicslab-teacher-prompt': 'true'
              },
                React.createElement('strong', null, t('stem.economicslab.teacher_move_label', 'Teacher move')),
                econTeacherPrompt
              )

            ),

            // Controls (below canvas, based on active tab)

            econTab === 'supplyDemand' && React.createElement('div', { className: 'mt-4' },

              // Educational Concept Panel

              React.createElement('div', { className: 'bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 mb-4' },

                React.createElement('h4', { className: 'text-sm font-bold text-blue-800 mb-2' }, t('stem.economicslab.key_concepts', '\uD83D\uDCDA Key Concepts')),

                React.createElement('div', { className: 'grid grid-cols-2 gap-3 text-[11px] text-slate-600 leading-relaxed' },

                  React.createElement('div', null,

                    React.createElement('span', { className: 'font-bold text-blue-700' }, t('stem.economicslab.law_of_demand', 'Law of Demand: ')),

                    t('stem.economicslab.as_price_quantity_demanded_consumers_b', 'As price \u2191, quantity demanded \u2193. Consumers buy less when prices rise. The demand curve slopes downward.')

                  ),

                  React.createElement('div', null,

                    React.createElement('span', { className: 'font-bold text-red-600' }, t('stem.economicslab.law_of_supply', 'Law of Supply: ')),

                    t('stem.economicslab.as_price_quantity_supplied_producers_m', 'As price \u2191, quantity supplied \u2191. Producers make more when prices are high. The supply curve slopes upward.')

                  ),

                  React.createElement('div', null,

                    React.createElement('span', { className: 'font-bold text-amber-600' }, 'Equilibrium: '),

                    t('stem.economicslab.where_supply_meets_demand_this_e_point', 'Where supply meets demand. This "E" point sets the market price (P*) and quantity (Q*) automatically.')

                  ),

                  React.createElement('div', null,

                    React.createElement('span', { className: 'font-bold text-emerald-600' }, t('stem.economicslab.shifts_vs_movements', 'Shifts vs. Movements: ')),

                    t('stem.economicslab.changing_the_price_moves_along_a_curve', 'Changing the price moves ALONG a curve. External factors (technology, income, preferences) SHIFT the entire curve.')

                  )

                ),

                // Dynamic educational feedback based on current slider values

                (sdPriceFloor > 0 || sdPriceCeiling > 0 || sdTax > 0 || sdDemandShift !== 0 || sdSupplyShift !== 0 || sdDemSlope !== 0.8 || sdSupSlope !== 0.8) && React.createElement('div', { className: 'mt-3 bg-white rounded-lg p-3 border border-blue-100' },

                  React.createElement('h5', { className: 'text-[11px] font-bold text-indigo-700 mb-1' }, t('stem.economicslab.what_s_happening_right_now', '\uD83D\uDCA1 What\'s Happening Right Now:')),

                  React.createElement('div', { className: 'text-[11px] text-slate-600 space-y-1' },

                    sdDemandShift > 0 && React.createElement('p', null, t('stem.economicslab.demand_shifted_right_more_people_want_', '\u25B6 Demand shifted RIGHT \u2014 More people want this product (maybe income rose, or a trend made it popular). This raises both equilibrium price AND quantity.')),

                    sdDemandShift < 0 && React.createElement('p', null, t('stem.economicslab.demand_shifted_left_fewer_people_want_', '\u25B6 Demand shifted LEFT \u2014 Fewer people want this product (substitute became cheaper, or preferences changed). Both price AND quantity fall.')),

                    sdSupplyShift > 0 && React.createElement('p', null, t('stem.economicslab.supply_shifted_right_producers_can_mak', '\u25B6 Supply shifted RIGHT \u2014 Producers can make more cheaply (new technology, lower input costs). Price falls, but quantity rises.')),

                    sdSupplyShift < 0 && React.createElement('p', null, t('stem.economicslab.supply_shifted_left_production_became_', '\u25B6 Supply shifted LEFT \u2014 Production became harder (natural disaster, regulations). Price rises, but quantity falls.')),

                    sdDemSlope !== 0.8 && React.createElement('p', null, '\u25B6 Demand slope ' + sdDemSlope.toFixed(1) + (sdDemSlope < 0.8 ? t('stem.economicslab.demand_flatter', ' \u2014 flatter, more ELASTIC: buyers respond sharply to price (luxuries, goods with substitutes).') : t('stem.economicslab.demand_steeper', ' \u2014 steeper, more INELASTIC: buyers barely change quantity when price moves (necessities like gasoline or medicine).'))),

                    sdSupSlope !== 0.8 && React.createElement('p', null, '\u25B6 Supply slope ' + sdSupSlope.toFixed(1) + (sdSupSlope < 0.8 ? t('stem.economicslab.supply_flatter', ' \u2014 flatter, more ELASTIC: producers can easily ramp output up or down (manufactured goods).') : t('stem.economicslab.supply_steeper', ' \u2014 steeper, more INELASTIC: output is hard to change quickly (housing, farmland, concert seats).'))),

                    sdPriceFloor > 0 && React.createElement('p', null, '\u25B6 Price Floor at $' + sdPriceFloor + ' \u2014 Government sets a MINIMUM price (e.g., minimum wage). If above equilibrium: creates SURPLUS (quantity supplied > quantity demanded). Workers want jobs, but firms hire fewer.'),

                    sdPriceCeiling > 0 && React.createElement('p', null, '\u25B6 Price Ceiling at $' + sdPriceCeiling + ' \u2014 Government sets a MAXIMUM price (e.g., rent control). If below equilibrium: creates SHORTAGE (quantity demanded > quantity supplied). Everyone wants it, but not enough is produced.'),

                    sdTax > 0 && (function () {
                      // Tax incidence, computed live: buyers bear Dm/(Dm+Sm) of the
                      // wedge \u2014 the steeper (more inelastic) side always bears more.
                      var buyerShare = Math.max(0, Math.min(100, sdDemSlope / (sdDemSlope + sdSupSlope) * 100));
                      return React.createElement('p', null, '\u25B6 Tax of $' + sdTax + t('stem.economicslab.tax_incidence_1', ' \u2014 a "tax wedge" opens between what buyers pay and sellers keep, and some mutually beneficial trades stop happening (DEADWEIGHT LOSS). Right now buyers bear ~') + buyerShare.toFixed(0) + t('stem.economicslab.tax_incidence_2', '% of it and sellers ~') + (100 - buyerShare).toFixed(0) + t('stem.economicslab.tax_incidence_3', '% \u2014 the more INELASTIC (steeper) side always bears more. Tilt the elasticity sliders and watch the split move.'));
                    })()

                  )

                )

              ),

              React.createElement('div', { className: 'grid grid-cols-2 gap-4' },

                React.createElement('div', { className: 'space-y-3 bg-blue-50 rounded-xl p-4 border border-blue-200' },

                  React.createElement('h4', { className: 'text-sm font-bold text-blue-700' }, t('stem.economicslab.curve_shifts', '\uD83D\uDCC9 Curve Shifts')),

                  React.createElement('label', { className: 'block text-xs text-blue-600' }, 'Demand Shift: ' + sdDemandShift),

                  React.createElement('input', {

                    type: 'range', 'aria-valuetext': (sdDemandShift === 0 ? 'no shift' : sdDemandShift > 0 ? ('shifted right ' + sdDemandShift) : ('shifted left ' + Math.abs(sdDemandShift))), 'aria-label': t('stem.economicslab.sd_demand_shift', 'sd demand shift'), min: -5, max: 5, value: sdDemandShift,

                    onChange: function (e) { upd('sdDemandShift', parseInt(e.target.value)); },

                    className: 'w-full accent-blue-500'

                  }),

                  React.createElement('label', { className: 'block text-xs text-red-600' }, 'Supply Shift: ' + sdSupplyShift),

                  React.createElement('input', {

                    type: 'range', 'aria-valuetext': (sdSupplyShift === 0 ? 'no shift' : sdSupplyShift > 0 ? ('shifted right ' + sdSupplyShift) : ('shifted left ' + Math.abs(sdSupplyShift))), 'aria-label': t('stem.economicslab.sd_supply_shift', 'sd supply shift'), min: -5, max: 5, value: sdSupplyShift,

                    onChange: function (e) { upd('sdSupplyShift', parseInt(e.target.value)); },

                    className: 'w-full accent-red-500'

                  }),

                  (function () {
                    var slopeTag = function (m) { return m <= 0.5 ? t('stem.economicslab.elastic_flat', 'elastic (flat)') : m >= 1.1 ? t('stem.economicslab.inelastic_steep', 'inelastic (steep)') : t('stem.economicslab.moderate', 'moderate'); };
                    return React.createElement(React.Fragment, null,
                      React.createElement('label', { className: 'block text-xs text-blue-600' }, t('stem.economicslab.demand_elasticity', 'Demand elasticity — slope ') + sdDemSlope.toFixed(1) + ': ' + slopeTag(sdDemSlope)),
                      React.createElement('input', {
                        type: 'range', min: 0.3, max: 1.5, step: 0.1, value: sdDemSlope,
                        'aria-label': t('stem.economicslab.demand_elasticity_2', 'Demand curve slope (elasticity)'),
                        'aria-valuetext': sdDemSlope.toFixed(1) + ', ' + slopeTag(sdDemSlope),
                        onChange: function (e) { upd('sdDemSlope', parseFloat(e.target.value)); },
                        className: 'w-full accent-blue-500'
                      }),
                      React.createElement('label', { className: 'block text-xs text-red-600' }, t('stem.economicslab.supply_elasticity', 'Supply elasticity — slope ') + sdSupSlope.toFixed(1) + ': ' + slopeTag(sdSupSlope)),
                      React.createElement('input', {
                        type: 'range', min: 0.3, max: 1.5, step: 0.1, value: sdSupSlope,
                        'aria-label': t('stem.economicslab.supply_elasticity_2', 'Supply curve slope (elasticity)'),
                        'aria-valuetext': sdSupSlope.toFixed(1) + ', ' + slopeTag(sdSupSlope),
                        onChange: function (e) { upd('sdSupSlope', parseFloat(e.target.value)); },
                        className: 'w-full accent-red-500'
                      }),
                      React.createElement('div', { className: 'text-[11px] text-slate-600 bg-white rounded-lg p-2 border border-blue-100' },
                        t('stem.economicslab.slope_note', '📚 Flat = elastic: people react strongly to price (luxuries, substitutes). Steep = inelastic: they can\'t easily change behavior (gasoline, medicine). Watch who bears a tax as you tilt the curves.'))
                    );
                  })()

                ),

                React.createElement('div', { className: 'space-y-3 bg-emerald-50 rounded-xl p-4 border border-emerald-200' },

                  React.createElement('h4', { className: 'text-sm font-bold text-emerald-700' }, t('stem.economicslab.government_controls', '\u2696\uFE0F Government Controls')),

                  React.createElement('label', { className: 'block text-xs text-emerald-600' }, 'Price Floor: $' + sdPriceFloor),

                  React.createElement('input', {

                    type: 'range', 'aria-valuetext': (sdPriceFloor === 0 ? 'no price floor' : '$' + sdPriceFloor + ' price floor'), 'aria-label': t('stem.economicslab.sd_price_floor', 'sd price floor'), min: 0, max: 90, value: sdPriceFloor,

                    onChange: function (e) { upd('sdPriceFloor', parseInt(e.target.value)); },

                    className: 'w-full accent-emerald-500'

                  }),

                  React.createElement('label', { className: 'block text-xs text-orange-600' }, 'Price Ceiling: $' + sdPriceCeiling),

                  React.createElement('input', {

                    type: 'range', 'aria-valuetext': (sdPriceCeiling === 0 ? 'no price ceiling' : '$' + sdPriceCeiling + ' price ceiling'), 'aria-label': t('stem.economicslab.sd_price_ceiling', 'sd price ceiling'), min: 0, max: 90, value: sdPriceCeiling,

                    onChange: function (e) { upd('sdPriceCeiling', parseInt(e.target.value)); },

                    className: 'w-full accent-orange-500'

                  }),

                  React.createElement('label', { className: 'block text-xs text-purple-600' }, 'Tax: $' + sdTax),

                  React.createElement('input', {

                    type: 'range', 'aria-valuetext': (sdTax === 0 ? 'no tax' : '$' + sdTax + ' per-unit tax'), 'aria-label': t('stem.economicslab.sd_tax', 'sd tax'), min: 0, max: 30, value: sdTax,

                    onChange: function (e) { upd('sdTax', parseInt(e.target.value)); },

                    className: 'w-full accent-purple-500'

                  })

                )

              ),

              React.createElement('button', {
                onClick: function () { upd('sdDemandShift', 0); upd('sdSupplyShift', 0); upd('sdPriceFloor', 0); upd('sdPriceCeiling', 0); upd('sdTax', 0); upd('sdProbe', null); upd('sdDemSlope', 0.8); upd('sdSupSlope', 0.8); if (announceToSR) announceToSR('Supply and demand graph reset to defaults.'); },
                className: 'mt-3 mb-2 w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-400'
              }, t('stem.economicslab.reset_graph', '♻ Reset Graph')),

              // Elasticity Education

              React.createElement('div', { className: 'col-span-2 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-3 border border-cyan-200 mb-2' },

                React.createElement('h4', { className: 'text-[11px] font-bold text-cyan-700 mb-1' }, t('stem.economicslab.price_elasticity_of_demand', '\uD83D\uDCCF Price Elasticity of Demand')),

                React.createElement('div', { className: 'text-[11px] text-slate-600 leading-relaxed' },

                  React.createElement('p', null, '\uD83D\uDCDA ',

                    React.createElement('strong', null, t('stem.economicslab.elasticity_2', 'Elasticity')), t('stem.economicslab.measures_how_much_quantity_demanded_ch', ' measures how much quantity demanded changes when price changes. '),

                    React.createElement('strong', null, t('stem.economicslab.elastic', 'Elastic')), t('stem.economicslab.goods_luxury_items_products_with_subst', ' goods (luxury items, products with substitutes) see big demand drops from small price increases. '),

                    React.createElement('strong', null, t('stem.economicslab.inelastic', 'Inelastic')), t('stem.economicslab.goods_necessities_like_medicine_gasoli', ' goods (necessities like medicine, gasoline) have stable demand regardless of price.')

                  ),

                  React.createElement('div', { className: 'grid grid-cols-3 gap-2 mt-2' },

                    React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center border border-cyan-100' },

                      React.createElement('div', { className: 'text-lg' }, '\uD83D\uDC8E'),

                      React.createElement('div', { className: 'text-[11px] font-bold text-cyan-700' }, t('stem.economicslab.elastic_1', 'Elastic (>1)')),

                      React.createElement('div', { className: 'text-[11px] text-slate-600' }, t('stem.economicslab.luxury_goods_restaurants_vacations', 'Luxury goods, restaurants, vacations'))

                    ),

                    React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center border border-cyan-100' },

                      React.createElement('div', { className: 'text-lg' }, '\u2696\uFE0F'),

                      React.createElement('div', { className: 'text-[11px] font-bold text-cyan-700' }, t('stem.economicslab.unit_elastic_1', 'Unit Elastic (=1)')),

                      React.createElement('div', { className: 'text-[11px] text-slate-600' }, t('stem.economicslab.revenue_unchanged_by_price', 'Revenue unchanged by price'))

                    ),

                    React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center border border-cyan-100' },

                      React.createElement('div', { className: 'text-lg' }, '\uD83D\uDC8A'),

                      React.createElement('div', { className: 'text-[11px] font-bold text-cyan-700' }, t('stem.economicslab.inelastic_1', 'Inelastic (<1)')),

                      React.createElement('div', { className: 'text-[11px] text-slate-600' }, t('stem.economicslab.medicine_gasoline_utilities', 'Medicine, gasoline, utilities'))

                    )

                  )

                )

              ),

              // AI Scenario Generator

              React.createElement('div', { className: 'col-span-2 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200' },

                React.createElement('h4', { className: 'text-sm font-bold text-violet-700 mb-2' }, t('stem.economicslab.ai_scenario_generator', '\u2728 AI Scenario Generator')),

                d.sdScenario ? React.createElement('div', null,

                  React.createElement('div', { className: 'bg-white rounded-lg p-3 mb-2 border border-violet-100' },

                    React.createElement('h5', { className: 'text-xs font-bold text-slate-800' }, d.sdScenario.title),

                    React.createElement('p', { className: 'text-[11px] text-slate-600 mt-1' }, d.sdScenario.explanation),

                    React.createElement('div', { className: 'flex gap-2 mt-2 text-[11px]' },

                      React.createElement('span', { className: 'text-blue-600 font-bold' }, 'Demand: ' + (d.sdScenario.demandShift > 0 ? '+' : '') + d.sdScenario.demandShift),

                      React.createElement('span', { className: 'text-red-600 font-bold' }, 'Supply: ' + (d.sdScenario.supplyShift > 0 ? '+' : '') + d.sdScenario.supplyShift)

                    ),

                    d.sdScenario.lesson && React.createElement('div', { className: 'mt-2 bg-violet-100 rounded-lg px-3 py-2 text-[11px] text-violet-800 border border-violet-200' },

                      React.createElement('span', { className: 'font-bold' }, t('stem.economicslab.concept', '\uD83D\uDCDA Concept: ')),

                      d.sdScenario.lesson

                    )

                  ),

                  React.createElement('button', {

                    onClick: function () {

                      upd('sdDemandShift', d.sdScenario.demandShift || 0);

                      upd('sdSupplyShift', d.sdScenario.supplyShift || 0);

                      upd('sdPriceFloor', d.sdScenario.priceFloor || 0);

                      upd('sdPriceCeiling', d.sdScenario.priceCeiling || 0);

                      upd('sdTax', d.sdScenario.tax || 0);

                      if (addToast) addToast('\u2705 Scenario applied to graph!', 'success');
                      if (announceToSR) announceToSR('Economic scenario applied. Supply and demand graph updated.');

                      if (d.sdScenario && d.sdScenario.lesson) {

                        var gl5 = (d.econGlossary || []).slice();

                        var exists5 = gl5.some(function (g) { return g.concept === d.sdScenario.title; });

                        if (!exists5) { gl5.push({ tab: 'S&D', concept: d.sdScenario.title, explanation: d.sdScenario.lesson }); upd('econGlossary', gl5); }

                      }

                    },

                    className: 'w-full py-2 rounded-lg text-xs font-bold bg-violet-700 text-white mb-1'

                  }, t('stem.economicslab.apply_scenario_to_graph', '\u2705 Apply Scenario to Graph')),

                  React.createElement('button', {

                    onClick: function () { upd('sdScenario', null); },

                    className: 'w-full py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-600'

                  }, t('stem.economicslab.dismiss', 'Dismiss'))

                ) : React.createElement('button', {

                  onClick: function () {

                    upd('sdLoading', true);

                    var prompt = 'You are an economics teacher. Generate a real-world supply and demand scenario for students (difficulty: ' + (d.econDifficulty || 'medium') + ').\n\nReturn ONLY valid JSON:\n{"title":"<short scenario title>","explanation":"<2-3 sentences explaining what happened and why it shifts supply/demand>","demandShift":<integer -5 to 5>,"supplyShift":<integer -5 to 5>,"priceFloor":<0 or number if relevant>,"priceCeiling":<0 or number if relevant>,"tax":<0 or number if relevant>}\n\nExamples: new iPhone launch (demand +3), oil embargo (supply -4), minimum wage law (price floor 40), rent control (price ceiling 30), sugar tax (tax 5). Be creative.\n\nIMPORTANT: Include a "lesson" field with a 1-2 sentence economics concept (e.g., elasticity, substitute goods, complement goods, deadweight loss, consumer surplus, producer surplus, market failure, externalities, public goods).';

                    callGemini(prompt, true).then(function (result) {

                      try {

                        var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                        var s = cleaned.indexOf('{'); if (s > 0) cleaned = cleaned.substring(s);

                        var e = cleaned.lastIndexOf('}'); if (e > 0) cleaned = cleaned.substring(0, e + 1);

                        upd('sdScenario', JSON.parse(cleaned));

                        upd('sdLoading', false);

                      } catch (err2) { upd('sdLoading', false); if (addToast) addToast('Scenario generation failed', 'error'); }

                    }).catch(function () { upd('sdLoading', false); });

                  },

                  disabled: d.sdLoading,

                  className: 'w-full py-3 rounded-xl text-xs font-bold transition-all ' + (d.sdLoading ? 'bg-slate-300 text-slate-600' : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg')

                }, d.sdLoading ? '\u23F3 Generating...' : '\uD83C\uDFB2 Generate Random Scenario')

              )

            ),



            econTab === 'personalFinance' && React.createElement('div', { className: 'mt-4' },

              // Life Sim Event Display

              d.lifeEvent ? React.createElement('div', { className: 'bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-5 border border-indigo-200 mb-4 shadow-sm' },

                React.createElement('div', { className: 'flex items-start gap-3 mb-4' },

                  React.createElement('span', { className: 'text-3xl' }, d.lifeEvent.emoji || '\uD83C\uDFB2'),

                  React.createElement('div', null,

                    React.createElement('h4', { className: 'text-sm font-bold text-slate-800' }, d.lifeEvent.title || 'Life Event'),

                    React.createElement('p', { className: 'text-xs text-slate-600 mt-1 leading-relaxed' }, d.lifeEvent.description),

                    d.lifeEvent.lesson && React.createElement('div', { className: 'mt-2 bg-indigo-100 rounded-lg px-3 py-2 text-[11px] text-indigo-800 border border-indigo-200' },

                      React.createElement('span', { className: 'font-bold' }, t('stem.economicslab.economics_concept', '\uD83D\uDCDA Economics Concept: ')),

                      d.lifeEvent.lesson

                    )

                  )

                ),

                React.createElement('div', { className: 'grid gap-2' },

                  (d.lifeEvent.choices || []).map(function (choice, ci) {

                    return React.createElement('button', {

                      key: ci,

                      onClick: function () {

                        var eff = choice.effect || {};

                        // Debt accrues 10% APR each simulated year — carrying a
                        // balance has to visibly cost something, or "pay it off"
                        // choices never look better than spending.

                        var newDebt = Math.max(0, (d.pfDebt || 0) + (eff.debt || 0));

                        var debtInterest = Math.round(newDebt * 0.10);

                        upd('pfDebt', newDebt + debtInterest);

                        upd('pfSalary', Math.max(0, (d.pfSalary || 35000) + (eff.salary || 0)));

                        upd('pfHappiness', Math.min(100, Math.max(0, (d.pfHappiness || 70) + (eff.happiness || 0))));

                        upd('pfCredit', Math.min(850, Math.max(300, (d.pfCredit || 650) + (eff.credit || 0))));

                        if (eff.career) upd('pfCareer', eff.career);

                        if (eff.insurance !== undefined && eff.insurance !== null) upd('pfInsurance', eff.insurance);

                        // Cash flows for the year are computed ONCE and applied in a single
                        // upd('pfCash', ...) — sequential upds each read stale `d`, so the last
                        // write silently dropped the housing cost whenever investing was on.

                        var startCash = d.pfCash || 2000;

                        var housingCost = { renting: 12000, owning: 21600, frugal: 6000 };

                        var hCost = housingCost[d.pfHousing || 'renting'] || 12000;

                        // If owning, build equity (30% of payment goes to equity)

                        if ((d.pfHousing || 'renting') === 'owning') {

                          upd('pfEquity', (d.pfEquity || 0) + Math.round(hCost * 0.3));

                        }

                        // Investing moves cash INTO a tracked portfolio (pfInvested) that
                        // compounds at the chosen risk profile's rate — it is an asset, not
                        // an expense, so students see compounding instead of vanishing money.

                        var investAmt = 0;

                        var investGrowth = 0;

                        if ((d.pfInvestPct || 0) > 0 && d.pfInvestType) {

                          investAmt = Math.round((d.pfSalary || 35000) * (d.pfInvestPct || 0) / 100);

                          var returns = { Conservative: 0.04, Balanced: 0.07, Aggressive: 0.10, Speculative: (Math.random() - 0.3) * 0.5 };

                          var returnRate = returns[d.pfInvestType] || 0;

                          investGrowth = Math.round((d.pfInvested || 0) * returnRate);

                          upd('pfInvested', Math.max(0, (d.pfInvested || 0) + investGrowth + investAmt));

                        }

                        var finalCash = startCash + (eff.cash || 0) - hCost - investAmt;

                        upd('pfCash', finalCash);

                        var h = (d.pfHistory || []).slice(-29);

                        h.push({ age: d.pfAge || 22, cash: finalCash, debt: newDebt + debtInterest, event: d.lifeEvent.title, choice: choice.label });

                        upd('pfHistory', h);

                        upd('pfAge', (d.pfAge || 22) + 1);

                        upd('lifeEvent', null);

                        upd('pfLoading', false);

                        if (typeof addXP === 'function') addXP(15, 'Life Sim: Made a financial decision');

                        var netChange = finalCash - startCash;

                        // Itemized flows for the "Last year's money flow" card \u2014
                        // students should SEE where every dollar went.

                        upd('pfLastYear', { event: d.lifeEvent.title || 'Life event', choice: choice.label || '', eventCash: (eff.cash || 0), housing: hCost, invested: investAmt, growth: investGrowth, debtInterest: debtInterest, net: netChange });

                        if (addToast) addToast((netChange >= 0 ? '\uD83D\uDCB0 +$' : '\uD83D\uDCC9 -$') + Math.abs(netChange).toLocaleString() + ' net this year (after housing' + (investAmt > 0 ? ' + investing' : '') + ') | ' + choice.label, netChange >= 0 ? 'success' : 'warning');

                        // Auto-add lesson to glossary

                        if (d.lifeEvent && d.lifeEvent.lesson) {

                          var gl = (d.econGlossary || []).slice();

                          var exists = gl.some(function (g) { return g.concept === d.lifeEvent.title; });

                          if (!exists) { gl.push({ tab: 'Life Sim', concept: d.lifeEvent.title, explanation: d.lifeEvent.lesson }); upd('econGlossary', gl); }

                        }

                      },

                      className: 'w-full text-left p-3 rounded-xl border-2 border-indigo-100 hover:border-indigo-400 bg-white hover:bg-indigo-50 transition-all text-xs group'

                    },

                      React.createElement('div', { className: 'font-bold text-slate-700 group-hover:text-indigo-700' }, choice.label),

                      React.createElement('div', { className: 'text-slate-500 mt-0.5 flex gap-3 flex-wrap' },

                        choice.effect && choice.effect.cash ? React.createElement('span', { className: choice.effect.cash >= 0 ? 'text-green-600' : 'text-red-500' }, (choice.effect.cash >= 0 ? '+' : '') + '$' + choice.effect.cash.toLocaleString()) : null,

                        choice.effect && choice.effect.debt ? React.createElement('span', { className: 'text-orange-500' }, 'Debt ' + (choice.effect.debt > 0 ? '+' : '') + '$' + choice.effect.debt.toLocaleString()) : null,

                        choice.effect && choice.effect.salary ? React.createElement('span', { className: 'text-blue-500' }, 'Salary ' + (choice.effect.salary > 0 ? '+' : '') + '$' + choice.effect.salary.toLocaleString()) : null,

                        choice.effect && choice.effect.happiness ? React.createElement('span', { className: choice.effect.happiness >= 0 ? 'text-pink-500' : 'text-slate-600' }, (choice.effect.happiness > 0 ? '+' : '') + choice.effect.happiness + ' happiness') : null,

                        choice.effect && choice.effect.credit ? React.createElement('span', { className: choice.effect.credit >= 0 ? 'text-emerald-500' : 'text-orange-500' }, (choice.effect.credit > 0 ? '+' : '') + choice.effect.credit + ' credit') : null

                      )

                    );

                  })

                )

              ) : null,

              // Stats bar

              React.createElement('div', { className: 'grid grid-cols-5 gap-2 mb-4' },

                [

                  { label: 'Age', val: (d.pfAge || 22), icon: '\uD83C\uDF82', color: 'indigo' },

                  { label: t('stem.economicslab.cash', 'Cash'), val: '$' + (d.pfCash || 2000).toLocaleString(), icon: '\uD83D\uDCB5', color: (d.pfCash || 2000) >= 0 ? 'green' : 'red' },

                  { label: t('stem.economicslab.debt', 'Debt'), val: '$' + (d.pfDebt || 0).toLocaleString(), icon: '\uD83D\uDCB3', color: (d.pfDebt || 0) > 0 ? 'red' : 'green' },

                  { label: t('stem.economicslab.happiness', 'Happiness'), val: (d.pfHappiness || 70) + '%', icon: '\u2764\uFE0F', color: (d.pfHappiness || 70) > 50 ? 'pink' : 'slate' },

                  { label: t('stem.economicslab.credit', 'Credit'), val: (d.pfCredit || 650), icon: '\uD83D\uDCB3', color: (d.pfCredit || 650) > 700 ? 'green' : (d.pfCredit || 650) > 580 ? 'amber' : 'red' }

                ].map(function (s) {

                  return React.createElement('div', { key: s.label, className: 'bg-white rounded-xl p-3 border border-slate-400 text-center' },

                    React.createElement('div', { className: 'text-lg' }, s.icon),

                    React.createElement('div', { className: 'text-[11px] text-slate-600 font-bold uppercase tracking-wide' }, s.label),

                    React.createElement('div', { className: 'text-sm font-bold text-' + s.color + '-600' }, s.val)

                  );

                })

              ),

              React.createElement('div', { className: 'text-xs text-slate-600 text-center mb-2' }, (d.pfCareer ? '\uD83D\uDCBC ' + d.pfCareer + ' | ' : '') + 'Salary: $' + (d.pfSalary || 35000).toLocaleString() + '/yr | Net Worth: $' + pfNetWorth.toLocaleString() + ((d.pfInvested || 0) > 0 ? ' | \uD83D\uDCC8 Invested: $' + (d.pfInvested || 0).toLocaleString() : '') + ((d.pfEquity || 0) > 0 ? ' | \uD83C\uDFE0 Equity: $' + (d.pfEquity || 0).toLocaleString() : '') + (d.pfInsurance ? ' | \uD83D\uDEE1\uFE0F Insured' : ' | \u26A0\uFE0F No Insurance') + ((d.pfDebt || 0) > 0 ? ' | \uD83D\uDCB3 Debt +10%/yr APR' : '')),

              (d.pfCash || 2000) < 0 && React.createElement('div', { className: 'text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center mb-2', role: 'alert' },
                t('stem.economicslab.cash_flow_warning', '\u26A0\uFE0F Your cash is negative \u2014 you are spending more than you earn. Try cheaper housing, a lower investment %, or paying down debt before it compounds.')),

              (function () {
                var pfMonthlyExp = pfRent + pfFood + pfTransport + pfEntertain;
                var runway = Math.max(0, (d.pfCash || 2000)) / Math.max(1, pfMonthlyExp);
                var runwayCls = runway >= 6 ? 'text-green-700 bg-green-50 border-green-200' : runway >= 3 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-700 bg-red-50 border-red-200';
                return React.createElement('div', { className: 'text-[11px] text-center rounded-lg border px-3 py-1.5 mb-2 ' + runwayCls },
                  t('stem.economicslab.emergency_fund', '\uD83D\uDEDF Emergency fund: ') + runway.toFixed(1) + ' ' + t('stem.economicslab.months_of_expenses', 'months of expenses in cash') + ' \u2014 ' + t('stem.economicslab.emergency_fund_target', 'advisors suggest keeping 3\u20136 months'));
              })(),

              // Itemized "where did the money go" card for the last simulated year
              d.pfLastYear && (function () {
                var ly = d.pfLastYear;
                var rows = [[ly.event + ' \u2192 ' + ly.choice, ly.eventCash, false]];
                rows.push([t('stem.economicslab.flow_housing', 'Housing'), -ly.housing, false]);
                if (ly.invested > 0) rows.push([t('stem.economicslab.flow_invested', 'Moved into investments (still yours!)'), -ly.invested, false]);
                if (ly.growth > 0) rows.push([t('stem.economicslab.flow_growth', 'Portfolio growth (inside investments)'), ly.growth, true]);
                if (ly.debtInterest > 0) rows.push([t('stem.economicslab.flow_debt_interest', 'Debt interest added (10% APR)'), -ly.debtInterest, true]);
                return React.createElement('div', { className: 'bg-white rounded-xl border border-slate-400 p-3 mb-2' },
                  React.createElement('h4', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1' }, t('stem.economicslab.last_year_flow', '\uD83E\uDDFE Last year\'s money flow')),
                  rows.map(function (r, ri) {
                    return React.createElement('div', { key: ri, className: 'flex justify-between text-[11px] py-0.5 border-b border-slate-50' },
                      React.createElement('span', { className: 'text-slate-600 flex-1 pr-2' }, r[0] + (r[2] ? ' *' : '')),
                      React.createElement('span', { className: (r[1] >= 0 ? 'text-green-600' : 'text-red-500') + ' font-bold' }, (r[1] >= 0 ? '+' : '\u2212') + '$' + Math.abs(r[1]).toLocaleString()));
                  }),
                  React.createElement('div', { className: 'flex justify-between text-[11px] pt-1 font-bold' },
                    React.createElement('span', { className: 'text-slate-700' }, t('stem.economicslab.flow_net', 'Net cash change')),
                    React.createElement('span', { className: ly.net >= 0 ? 'text-green-700' : 'text-red-600' }, (ly.net >= 0 ? '+' : '\u2212') + '$' + Math.abs(ly.net).toLocaleString())),
                  React.createElement('p', { className: 'text-[10px] text-slate-500 italic mt-1 m-0' }, t('stem.economicslab.flow_footnote', '* not part of cash \u2014 growth compounds inside your portfolio; interest compounds inside your debt.')));
              })(),

              // Next Year / Generate Event button

              !d.lifeEvent && React.createElement('button', {

                onClick: function () {

                  upd('pfLoading', true);

                  var prompt = 'You are a life simulation game engine (difficulty: ' + (d.econDifficulty || 'medium') + '). The player is ' + (d.pfAge || 22) + ' years old, earns $' + (d.pfSalary || 35000).toLocaleString() + '/year, has $' + (d.pfCash || 2000).toLocaleString() + ' in savings, $' + (d.pfDebt || 0).toLocaleString() + ' in debt, and ' + (d.pfHappiness || 70) + '% happiness.\n\nGenerate a realistic random life event with 3 choices. Return ONLY valid JSON:\n{"emoji":"<single emoji>","title":"<short title>","description":"<2-3 sentence scenario>","choices":[{"label":"<action description>","effect":{"cash":<number>,"debt":<number>,"salary":<number>,"happiness":<number>,"credit":<number -50 to 50>,"career":<optional string or null>,"insurance":<optional true/false or null>}}]}\n\nEvent categories to rotate through: CAREER (promotion, job offer, layoff, interview, raise negotiation, networking opportunity, career pivot, sabbatical), FINANCIAL (tax refund, bank error, stock tip, loan offer, credit card fraud, inheritance, gambling opportunity, unexpected bill), HOUSING (lease renewal, repair needed, roommate issue, property tax, home improvement, neighbor dispute), HEALTH (medical bill, gym membership, insurance claim, dental work, mental health day), EDUCATION (online course, certification, student loan, scholarship, mentorship), SOCIAL (wedding, baby shower, charity request, family emergency, holiday spending, friend opening business), MARKET (inflation spike, stock crash, crypto opportunity, interest rate change). Tailor to player age bracket and career stage. Make effects realistic. Cash effects should be -5000 to +10000 range. Salary changes should be -5000 to +15000 range. Happiness -20 to +20. Credit -50 to +50.\n\nIMPORTANT: Include a "lesson" field in your JSON with a 1-2 sentence financial literacy lesson explaining the real-world economics behind this event (e.g., compound interest, opportunity cost, inflation, risk vs. reward, emergency funds, diversification). Format: {"emoji":"...","title":"...","description":"...","lesson":"<financial literacy concept>","choices":[...]}';

                  callGemini(prompt, true).then(function (result) {

                    try {

                      var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                      var start = cleaned.indexOf('{');

                      if (start > 0) cleaned = cleaned.substring(start);

                      var end = cleaned.lastIndexOf('}');

                      if (end > 0) cleaned = cleaned.substring(0, end + 1);

                      var parsed = JSON.parse(cleaned);

                      upd('lifeEvent', parsed);

                      upd('pfLoading', false);

                    } catch (e) {

                      console.warn('[EconLab] Parse error:', e);

                      upd('pfLoading', false);

                      if (addToast) addToast('Failed to generate event. Try again!', 'error');

                    }

                  }).catch(function (e) { upd('pfLoading', false); if (addToast) addToast('AI error: ' + e.message, 'error'); });

                },

                disabled: d.pfLoading,

                className: 'w-full py-4 rounded-2xl text-sm font-bold shadow-lg transition-all ' + (d.pfLoading ? 'bg-slate-300 text-slate-600' : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 hover:shadow-xl hover:scale-[1.02]')

              }, d.pfLoading ? '\u23F3 Generating life event...' : '\u2728 Next Year (Age ' + ((d.pfAge || 22) + 1) + ')'),

              // Housing decision

              React.createElement('div', { className: 'bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200 mt-3 mb-1' },

                React.createElement('h4', { className: 'text-[11px] font-bold text-orange-700 mb-2' }, t('stem.economicslab.housing_strategy', '\uD83C\uDFE0 Housing Strategy')),

                React.createElement('div', { className: 'flex gap-2' },

                  [

                    { id: 'renting', label: t('stem.economicslab.rent', '\uD83C\uDFE2 Rent'), desc: t('stem.economicslab.lower_monthly_cost_flexibility', 'Lower monthly cost, flexibility'), cost: '-$1,000/mo' },

                    { id: 'owning', label: t('stem.economicslab.own', '\uD83C\uDFE0 Own'), desc: t('stem.economicslab.build_equity_but_mortgage_maintenance', 'Build equity, but mortgage + maintenance'), cost: '-$1,800/mo' },

                    { id: 'frugal', label: t('stem.economicslab.roommate', '\uD83D\uDECB\uFE0F Roommate'), desc: t('stem.economicslab.cheapest_option_save_more', 'Cheapest option, save more'), cost: '-$500/mo' }

                  ].map(function (h) {

                    return React.createElement('button', {

                      key: h.id,

                      onClick: function () { upd('pfHousing', h.id); },

                      className: 'flex-1 p-2 rounded-lg text-center transition-all border-2 ' +

                        ((d.pfHousing || 'renting') === h.id ? 'border-orange-400 bg-orange-100' : 'border-slate-200 bg-white hover:border-orange-600')

                    },

                      React.createElement('div', { className: 'text-[11px] font-bold text-slate-700' }, h.label),

                      React.createElement('div', { className: 'text-[11px] text-slate-600' }, h.desc),

                      React.createElement('div', { className: 'text-[11px] font-bold text-orange-600 mt-1' }, h.cost)

                    );

                  })

                ),

                React.createElement('div', { className: 'text-[11px] text-orange-600 mt-2 bg-white rounded-lg p-2 border border-orange-100' },

                  (d.pfHousing || 'renting') === 'renting' && '\uD83D\uDCDA Renting means paying a landlord monthly. Pros: flexibility to move, no maintenance costs, lower upfront cost. Cons: no equity buildup, rent may increase annually, no tax deductions.',

                  (d.pfHousing || 'renting') === 'owning' && '\uD83D\uDCDA Homeownership builds equity (ownership stake). Your mortgage payment partly goes to principal (equity) and partly to interest (bank profit). Pros: equity buildup, tax deductions, stable payments. Cons: maintenance, property tax, less flexibility.',

                  (d.pfHousing || 'renting') === 'frugal' && '\uD83D\uDCDA Sharing housing dramatically cuts your largest expense. The "Pay Yourself First" principle: living below your means lets you invest the difference. Many millionaires built wealth by keeping housing costs under 25% of income.'

                )

              ),

              // Investment allocation

              React.createElement('div', { className: 'bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200 mt-3 mb-3' },

                React.createElement('h4', { className: 'text-[11px] font-bold text-green-700 mb-2' }, t('stem.economicslab.investment_allocation_of_annual_salary', '\uD83D\uDCCA Investment Allocation (% of annual salary invested)')),

                React.createElement('div', { className: 'flex items-center gap-3' },

                  React.createElement('input', {

                    type: 'range', 'aria-valuetext': (d.pfInvestPct || 0) + '% of salary', 'aria-label': t('stem.economicslab.investment_percent_of_salary', 'Investment percent of salary'), min: 0, max: 50, value: d.pfInvestPct || 0,

                    onChange: function (e) { upd('pfInvestPct', parseInt(e.target.value)); },

                    className: 'flex-1 accent-green-500'

                  }),

                  React.createElement('span', { className: 'text-xs font-bold text-green-700 w-12 text-right' }, (d.pfInvestPct || 0) + '%'),

                  React.createElement('span', { className: 'text-[11px] text-slate-600' }, '$' + Math.round((d.pfSalary || 35000) * (d.pfInvestPct || 0) / 100).toLocaleString() + '/yr')

                ),

                React.createElement('div', { className: 'flex gap-1 mt-2' },

                  ['Conservative (Bonds)', 'Balanced (60/40)', 'Aggressive (Stocks)', 'Speculative (Crypto)'].map(function (type) {

                    var short = type.split(' ')[0];

                    return React.createElement('button', {

                      key: type,

                      onClick: function () { upd('pfInvestType', short); },

                      className: 'flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ' +

                        ((d.pfInvestType || '') === short ? 'bg-green-700 text-white shadow-sm' : 'bg-white text-slate-600 border border-green-200 hover:border-green-400')

                    }, type);

                  })

                ),

                (d.pfInvestPct || 0) > 0 && (d.pfInvestType) && React.createElement('div', { className: 'mt-2 text-[11px] text-green-600 bg-white rounded-lg p-2 border border-green-100' },

                  d.pfInvestType === 'Conservative' && '\uD83D\uDCDA Bonds are low-risk, low-return (~3-5% annual). Best for capital preservation and stable income. Less volatile but won\'t beat inflation long-term.',

                  d.pfInvestType === 'Balanced' && '\uD83D\uDCDA A 60/40 stock/bond portfolio balances growth with stability (~7-8% avg). This is the classic "set and forget" strategy recommended by most financial advisors.',

                  d.pfInvestType === 'Aggressive' && '\uD83D\uDCDA All-stock portfolios historically return ~10%/yr but with HIGH volatility. You could lose 30%+ in a bad year. Best when you\'re young and have time to recover.',

                  d.pfInvestType === 'Speculative' && '\uD83D\uDCDA Crypto/speculative assets can return 100%+ OR lose 80%+. Extremely volatile. Most advisors recommend <5% of portfolio. High risk, high potential reward.'

                )

              ),

              // History log

              (d.pfHistory || []).length > 0 && React.createElement('div', { className: 'mt-4 bg-white rounded-xl border border-slate-400 p-3 max-h-40 overflow-y-auto' },

                React.createElement('h4', { className: 'text-xs font-bold text-slate-600 mb-2' }, t('stem.economicslab.life_history', '\uD83D\uDCDC Life History')),

                (d.pfHistory || []).slice().reverse().map(function (h, hi) {

                  return React.createElement('div', { key: hi, className: 'flex justify-between text-[11px] py-1 border-b border-slate-50' },

                    React.createElement('span', { className: 'text-slate-600' }, 'Age ' + h.age),

                    React.createElement('span', { className: 'text-slate-600 flex-1 px-2 truncate' }, h.event + ' \u2192 ' + h.choice),

                    React.createElement('span', { className: h.cash >= (d.pfHistory[Math.max(0, d.pfHistory.length - hi - 2)] || {}).cash ? 'text-green-600 font-bold' : 'text-red-500 font-bold' }, '$' + (h.cash || 0).toLocaleString())

                  );

                })

              ),

              // Reset button

              React.createElement('button', {

                onClick: function () { upd('pfAge', 22); upd('pfCash', 2000); upd('pfDebt', 0); upd('pfSalary', 35000); upd('pfHappiness', 70); upd('pfCredit', 650); upd('pfCareer', null); upd('pfInsurance', false); upd('pfHistory', []); upd('lifeEvent', null); upd('pfEquity', 0); upd('pfInvested', 0); upd('pfHousing', 'renting'); upd('pfInvestPct', 0); upd('pfInvestType', null); upd('pfLastYear', null); if (addToast) addToast('\u267B Starting over at age 22!', 'info'); },

                className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-400'

              }, t('stem.economicslab.new_life', '\u267B New Life'))

            ),



            econTab === 'stockMarket' && React.createElement('div', { className: 'mt-4' },

              // AI Market Setup (if no companies yet)

              (!smCompanies || smCompanies.length === 0) ? React.createElement('div', { className: 'text-center py-8' },

                React.createElement('div', { className: 'text-5xl mb-4' }, '\uD83D\uDCC8'),

                React.createElement('h3', { className: 'text-lg font-bold text-slate-800 mb-2' }, t('stem.economicslab.create_your_market', 'Create Your Market')),

                React.createElement('p', { className: 'text-xs text-slate-600 mb-4 max-w-sm mx-auto' }, t('stem.economicslab.describe_what_kind_of_market_you_want_', 'Describe what kind of market you want to trade in. AI will generate 5 fictional companies with realistic financials.')),

                React.createElement('input', {

                  type: 'text',

                  value: d.smInput || '',

                  onChange: function (e) { upd('smInput', e.target.value); },

                  placeholder: t('stem.economicslab.e_g_renewable_energy_startups_gaming_c', 'e.g. "renewable energy startups", "gaming companies", "space industry", or leave blank for mixed...'),

                  className: 'w-full max-w-md px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none transition-all mb-3'

                }),

                React.createElement('button', {

                  onClick: function () {

                    upd('smLoading', true);

                    var theme = (d.smInput || '').trim() || 'diverse mix of tech, energy, healthcare, food, and finance';

                    var prompt = 'You are a stock market simulator for students. Generate 5 fictional publicly traded companies for a market themed around: "' + theme + '".\n\nReturn ONLY valid JSON:\n{"companies":[{"name":"<company name>","ticker":"<3-4 letter ticker>","price":<number 10-200>,"sector":"<sector>","description":"<1 sentence>"}]}\n\nMake company names creative and realistic. Prices should vary. Include diverse sectors within the theme.';

                    callGemini(prompt, true).then(function (result) {

                      try {

                        var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                        var s = cleaned.indexOf('{'); if (s > 0) cleaned = cleaned.substring(s);

                        var e = cleaned.lastIndexOf('}'); if (e > 0) cleaned = cleaned.substring(0, e + 1);

                        var parsed = JSON.parse(cleaned);

                        var colors = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6'];

                        var companies = (parsed.companies || []).slice(0, 5).map(function (c, ci) {

                          return { name: c.name, ticker: c.ticker, price: c.price || 50, history: [c.price * 0.95, c.price * 0.97, c.price * 0.99, c.price], sector: c.sector, color: colors[ci % 5], description: c.description };

                        });

                        upd('smCompanies', companies);

                        // Day-0 prices, kept forever so the buy-and-hold index
                        // benchmark survives the history arrays' 30-entry cap.

                        var basePrices = {};

                        companies.forEach(function (c) { basePrices[c.ticker] = c.price; });

                        upd('smBaseline', basePrices);

                        upd('smCash', 10000);

                        upd('smPortfolio', {});

                        upd('smDay', 0);

                        upd('smLoading', false);

                        if (addToast) addToast('\uD83D\uDCC8 Market open! 5 companies generated. Start trading!', 'success');
                        if (announceToSR) announceToSR('Stock market simulation open. 5 companies generated.');

                      } catch (err) { upd('smLoading', false); if (addToast) addToast('Failed to generate market. Try again!', 'error'); console.warn('[StockSim]', err); }

                    }).catch(function (err) { upd('smLoading', false); if (addToast) addToast('AI error', 'error'); });

                  },

                  disabled: d.smLoading,

                  className: 'w-full max-w-md py-3 rounded-xl text-sm font-bold shadow-lg transition-all ' + (d.smLoading ? 'bg-slate-300 text-slate-600' : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-xl')

                }, d.smLoading ? '\u23F3 AI generating companies...' : '\uD83D\uDE80 Open Market')

              ) :

                // Company selector (only when companies exist)

                smCompanies && smCompanies.length > 0 && React.createElement('div', null,

                  React.createElement('div', { className: 'flex gap-2 mb-3' },

                    smCompanies.map(function (c, ci) {

                      return React.createElement('button', {

                        key: ci,

                        onClick: function () { upd('smSelected', ci); },

                        className: 'flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all border-2 ' +

                          (smSelected === ci ? 'text-white shadow-md' : 'bg-slate-50 text-slate-600 border-slate-200'),

                        style: smSelected === ci ? { background: c.color, borderColor: c.color } : {}

                      }, c.ticker + ' $' + c.price.toFixed(0) + (c.history && c.history.length > 1 ? ' ' + (c.price >= c.history[c.history.length - 2] ? '\u25B2' : '\u25BC') : ''));

                    })

                  ),

                  // Selected company detail

                  smCompanies[smSelected] && React.createElement('div', { className: 'bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-3 border border-slate-400 mb-3' },

                    React.createElement('div', { className: 'flex justify-between items-center' },

                      React.createElement('div', null,

                        React.createElement('h4', { className: 'text-sm font-bold text-slate-800' }, smCompanies[smSelected].name + ' (' + smCompanies[smSelected].ticker + ')'),

                        React.createElement('span', { className: 'text-[11px] text-slate-600' }, smCompanies[smSelected].sector + (smCompanies[smSelected].description ? ' \u2014 ' + smCompanies[smSelected].description : ''))

                      ),

                      React.createElement('div', { className: 'text-right' },

                        React.createElement('div', { className: 'text-lg font-bold', style: { color: smCompanies[smSelected].color } }, '$' + smCompanies[smSelected].price.toFixed(2)),

                        smCompanies[smSelected].history && smCompanies[smSelected].history.length > 1 && React.createElement('div', {

                          className: 'text-[11px] font-bold ' + (smCompanies[smSelected].price >= smCompanies[smSelected].history[smCompanies[smSelected].history.length - 2] ? 'text-green-600' : 'text-red-500')

                        }, (smCompanies[smSelected].price >= smCompanies[smSelected].history[smCompanies[smSelected].history.length - 2] ? '\u25B2 +' : '\u25BC ') +

                        ((smCompanies[smSelected].price / smCompanies[smSelected].history[smCompanies[smSelected].history.length - 2] - 1) * 100).toFixed(1) + '%'),

                        React.createElement('div', { className: 'text-[11px] text-slate-600' }, 'Held: ' + (smPortfolio[smCompanies[smSelected].ticker] || 0) + ' shares ($' + ((smPortfolio[smCompanies[smSelected].ticker] || 0) * smCompanies[smSelected].price).toFixed(0) + ')')

                      )

                    )

                  ),

                  // AI News Event display

                  d.smNewsEvent ? React.createElement('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200 mb-3' },

                    React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, '\uD83D\uDCF0 ' + (d.smNewsEvent.headline || 'Breaking News')),

                    React.createElement('p', { className: 'text-xs text-amber-700 mt-1' }, d.smNewsEvent.analysis || ''),

                    React.createElement('div', { className: 'text-[11px] text-amber-600 mt-2 font-bold' }, 'Impact: ' + (d.smNewsEvent.impact > 0 ? '\u25B2 +' : '\u25BC ') + (d.smNewsEvent.impact * 100).toFixed(1) + '%'),

                    d.smNewsEvent.lesson && React.createElement('div', { className: 'mt-2 bg-amber-100 rounded-lg px-3 py-2 text-[11px] text-amber-800 border border-amber-200' },

                      React.createElement('span', { className: 'font-bold' }, t('stem.economicslab.investing_concept', '\uD83D\uDCDA Investing Concept: ')),

                      d.smNewsEvent.lesson

                    )

                  ) : null,

                  // Buy/Sell + Next Day

                  React.createElement('div', { className: 'flex gap-3 mb-3' },

                    React.createElement('button', {

                      onClick: function () {

                        var co2 = smCompanies[smSelected];

                        if (smCash >= co2.price) {

                          upd('smCash', smCash - co2.price);

                          var newPort = Object.assign({}, smPortfolio);

                          newPort[co2.ticker] = (newPort[co2.ticker] || 0) + 1;

                          upd('smPortfolio', newPort);

                          if (addToast) addToast('Bought 1 ' + co2.ticker + ' @ $' + co2.price.toFixed(2), 'success');

                          if (typeof addXP === 'function') addXP(5, 'Stock Market: Executed trade');

                        } else { if (addToast) addToast('Not enough cash!', 'error'); }

                      },

                      className: 'flex-1 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-500 text-white'

                    }, '\u25B2 Buy 1 ($' + (smCompanies[smSelected] ? smCompanies[smSelected].price.toFixed(2) : '0') + ')'),

                    React.createElement('button', {

                      onClick: function () {

                        var co5 = smCompanies[smSelected];

                        var cost10 = co5.price * 10;

                        if (smCash >= cost10) {

                          upd('smCash', smCash - cost10);

                          var newPort3 = Object.assign({}, smPortfolio);

                          newPort3[co5.ticker] = (newPort3[co5.ticker] || 0) + 10;

                          upd('smPortfolio', newPort3);

                          if (addToast) addToast('Bought 10 ' + co5.ticker + ' @ $' + co5.price.toFixed(2) + ' = $' + cost10.toFixed(2), 'success');

                        } else { if (addToast) addToast('Need $' + cost10.toFixed(2) + ' (have $' + smCash.toFixed(2) + ')', 'error'); }

                      },

                      className: 'py-3 px-2 rounded-xl text-[11px] font-bold bg-gradient-to-r from-green-600 to-emerald-600 text-white'

                    }, t('stem.economicslab.buy_10', '\u25B2\u25B2 Buy 10')),

                    React.createElement('button', {

                      onClick: function () {

                        var co3 = smCompanies[smSelected];

                        if ((smPortfolio[co3.ticker] || 0) > 0) {

                          upd('smCash', smCash + co3.price);

                          var newPort2 = Object.assign({}, smPortfolio);

                          newPort2[co3.ticker] = newPort2[co3.ticker] - 1;

                          if (newPort2[co3.ticker] <= 0) delete newPort2[co3.ticker];

                          upd('smPortfolio', newPort2);

                          if (addToast) addToast('Sold 1 ' + co3.ticker + ' @ $' + co3.price.toFixed(2), 'info');

                        } else { if (addToast) addToast('No shares to sell!', 'error'); }

                      },

                      className: 'flex-1 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-red-500 to-rose-500 text-white'

                    }, t('stem.economicslab.sell_1', '\u25BC Sell 1')),

                    React.createElement('button', {

                      onClick: function () {

                        var co6 = smCompanies[smSelected];

                        var held = smPortfolio[co6.ticker] || 0;

                        if (held > 0) {

                          var sellAmt = Math.min(held, 10);

                          upd('smCash', smCash + co6.price * sellAmt);

                          var newPort4 = Object.assign({}, smPortfolio);

                          newPort4[co6.ticker] = held - sellAmt;

                          if (newPort4[co6.ticker] <= 0) delete newPort4[co6.ticker];

                          upd('smPortfolio', newPort4);

                          if (addToast) addToast('Sold ' + sellAmt + ' ' + co6.ticker + ' @ $' + co6.price.toFixed(2), 'info');

                        }

                      },

                      className: 'py-3 px-2 rounded-xl text-[11px] font-bold bg-gradient-to-r from-red-600 to-rose-600 text-white'

                    }, '\u25BC\u25BC Sell ' + Math.min(smPortfolio[smCompanies[smSelected] ? smCompanies[smSelected].ticker : ''] || 0, 10)),

                    React.createElement('button', {

                      onClick: function () {

                        upd('smLoading', true);

                        var co4 = smCompanies[smSelected];

                        var prompt = 'You are a financial news AI (difficulty: ' + (d.econDifficulty || 'medium') + ') for an educational stock market simulator. Generate a market news event. Currently tracking: ' + smCompanies.map(function (c) { return c.ticker + ' (' + c.name + ', ' + c.sector + ') @ $' + c.price.toFixed(2); }).join(', ') + '.\n\nReturn ONLY valid JSON:\n{"headline":"<breaking news headline>","analysis":"<1-2 sentence market analysis>","impacts":[{"ticker":"<TICKER>","change":<decimal between -0.15 and 0.15>}]}\n\nGenerate realistic business news. Impact 1-3 companies.\n\nIMPORTANT: Include a "lesson" field with a 1-2 sentence investing/market concept explanation (e.g., diversification, P/E ratios, market sentiment, bull vs bear markets, risk tolerance, dollar-cost averaging, index funds, short selling, market capitalization, dividends).\n\nFormat: {"headline":"...","analysis":"...","lesson":"<investing concept>","impacts":[{"ticker":"...","change":<decimal>}]}';

                        callGemini(prompt, true).then(function (result) {

                          try {

                            var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                            var start = cleaned.indexOf('{'); if (start > 0) cleaned = cleaned.substring(start);

                            var end = cleaned.lastIndexOf('}'); if (end > 0) cleaned = cleaned.substring(0, end + 1);

                            var parsed = JSON.parse(cleaned);

                            var maxImpact = 0;

                            var newCos = smCompanies.map(function (c) {

                              var impact = 0;

                              (parsed.impacts || []).forEach(function (imp) { if (imp.ticker === c.ticker) impact = imp.change; });

                              var rnd = (Math.random() - 0.48) * 0.03;

                              var newPrice = Math.max(1, c.price * (1 + impact + rnd));

                              newPrice = Math.round(newPrice * 100) / 100;

                              if (Math.abs(impact) > Math.abs(maxImpact)) maxImpact = impact;

                              var newHist = c.history.slice(-29); newHist.push(newPrice);

                              return Object.assign({}, c, { price: newPrice, history: newHist });

                            });

                            upd('smCompanies', newCos);

                            upd('smDay', smDay + 1);

                            upd('smNewsEvent', { headline: parsed.headline, analysis: parsed.analysis, impact: maxImpact, lesson: parsed.lesson });

                            if (parsed.lesson) {

                              var gl2 = (d.econGlossary || []).slice();

                              var exists2 = gl2.some(function (g) { return g.concept === parsed.headline; });

                              if (!exists2) { gl2.push({ tab: 'Stock Market', concept: parsed.headline, explanation: parsed.lesson }); upd('econGlossary', gl2); }

                            }

                            upd('smLoading', false);

                          } catch (e) {

                            console.warn('[StockSim] Parse error:', e);

                            var fallbackCos = smCompanies.map(function (c) {

                              var rnd = (Math.random() - 0.48) * 0.06;

                              var np = Math.max(1, Math.round(c.price * (1 + rnd) * 100) / 100);

                              var nh = c.history.slice(-29); nh.push(np);

                              return Object.assign({}, c, { price: np, history: nh });

                            });

                            upd('smCompanies', fallbackCos); upd('smDay', smDay + 1);

                            upd('smLoading', false);

                            if (addToast) addToast('Market moved (AI unavailable)', 'warning');

                          }

                        }).catch(function (e) { upd('smLoading', false); if (addToast) addToast('AI error', 'error'); });

                      },

                      disabled: d.smLoading,

                      className: 'py-3 px-6 rounded-xl text-xs font-bold transition-all ' + (d.smLoading ? 'bg-slate-300 text-slate-600' : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white')

                    }, d.smLoading ? '\u23F3...' : '\u23ED Day ' + (smDay + 1))

                  ),

                  // Portfolio summary

                  React.createElement('div', { className: 'bg-white rounded-xl border border-slate-400 p-3 text-xs' },

                    React.createElement('div', { className: 'flex justify-between mb-2' },

                      React.createElement('span', { className: 'font-bold text-slate-700' }, '\uD83D\uDCBC Cash: $' + smCash.toFixed(2)),

                      React.createElement('span', { className: 'font-bold text-amber-600' }, 'Day ' + smDay),

                      React.createElement('span', { className: 'font-bold text-green-600' }, 'Total: $' + (smCash + smCompanies.reduce(function (s, c) { return s + (smPortfolio[c.ticker] || 0) * c.price; }, 0)).toFixed(2))

                    ),

                    Object.keys(smPortfolio).length > 0 && React.createElement('div', { className: 'flex gap-2 flex-wrap' },

                      Object.keys(smPortfolio).map(function (ticker) {

                        var c = smCompanies.find(function (x) { return x.ticker === ticker; });

                        return smPortfolio[ticker] > 0 ? React.createElement('span', { key: ticker, className: 'bg-slate-100 px-2 py-1 rounded text-[11px] font-bold' }, ticker + ': ' + smPortfolio[ticker] + ' ($' + (smPortfolio[ticker] * c.price).toFixed(0) + ')') : null;

                      })

                    ),

                    // Portfolio Analytics

                    smDay > 0 && (function () {

                      // Buy-and-hold benchmark: equal-weight index of every ticker
                      // from its day-0 price. "Did your trading beat just holding?"
                      // is the core index-fund lesson this sim can teach.

                      var idxRatios = smCompanies.map(function (c) {
                        var base = (d.smBaseline || {})[c.ticker] || (c.history && c.history[0]) || c.price;
                        return base > 0 ? c.price / base : 1;
                      });

                      var idxReturn = idxRatios.length ? (idxRatios.reduce(function (s, r) { return s + r; }, 0) / idxRatios.length - 1) * 100 : 0;

                      var myReturn = (smTotalVal / 10000 - 1) * 100;

                      var stockVal = smCompanies.reduce(function (s, c) { return s + (smPortfolio[c.ticker] || 0) * c.price; }, 0);

                      var topShare = 0;

                      smCompanies.forEach(function (c) { var v = (smPortfolio[c.ticker] || 0) * c.price; if (stockVal > 0 && v / stockVal > topShare) topShare = v / stockVal; });

                      return React.createElement('div', { className: 'mt-3 bg-slate-50 rounded-xl p-3 border border-slate-400' },

                        React.createElement('h4', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2' }, t('stem.economicslab.portfolio_analytics', '\uD83D\uDCC8 Portfolio Analytics')),

                        React.createElement('div', { className: 'grid grid-cols-4 gap-2 text-center' },

                          React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-100' },

                            React.createElement('div', { className: 'text-[11px] text-slate-600' }, t('stem.economicslab.total_p_l', 'Total P&L')),

                            React.createElement('div', { className: 'text-sm font-bold ' + (smTotalVal - 10000 >= 0 ? 'text-green-600' : 'text-red-500') },

                              (smTotalVal - 10000 >= 0 ? '+' : '') + '$' + (smTotalVal - 10000).toFixed(0))

                          ),

                          React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-100' },

                            React.createElement('div', { className: 'text-[11px] text-slate-600' }, t('stem.economicslab.return', 'Return %')),

                            React.createElement('div', { className: 'text-sm font-bold ' + (smTotalVal >= 10000 ? 'text-green-600' : 'text-red-500') },

                              (smTotalVal >= 10000 ? '+' : '') + myReturn.toFixed(1) + '%')

                          ),

                          React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-100' },

                            React.createElement('div', { className: 'text-[11px] text-slate-600' }, t('stem.economicslab.index_hold', 'Index (hold)')),

                            React.createElement('div', { className: 'text-sm font-bold ' + (idxReturn >= 0 ? 'text-green-600' : 'text-red-500') },

                              (idxReturn >= 0 ? '+' : '') + idxReturn.toFixed(1) + '%')

                          ),

                          React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-100' },

                            React.createElement('div', { className: 'text-[11px] text-slate-600' }, t('stem.economicslab.holdings', 'Holdings')),

                            React.createElement('div', { className: 'text-sm font-bold text-slate-700' },

                              Object.keys(smPortfolio).filter(function (t) { return smPortfolio[t] > 0; }).length + ' stocks')

                          )

                        ),

                        myReturn < idxReturn - 0.5 && React.createElement('div', { className: 'mt-2 text-[11px] text-indigo-700 bg-indigo-50 rounded-lg p-2 border border-indigo-100' },

                          t('stem.economicslab.index_lesson', '\uD83D\uDCDA The buy-and-hold index is beating your trading. Most active traders underperform simply holding everything \u2014 this is why index funds are the default advice.')),

                        topShare > 0.7 && stockVal > 0 && React.createElement('div', { className: 'mt-2 text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-100' },

                          t('stem.economicslab.concentration_warning', '\u26A0\uFE0F Over 70% of your stock value is in one company. Diversification cushions single-company shocks \u2014 spread your bets.'))

                      );

                    })(),

                    // Reset Market button

                    React.createElement('button', {

                      onClick: function () { upd('smCompanies', null); upd('smPortfolio', {}); upd('smCash', 10000); upd('smDay', 0); upd('smInput', ''); upd('smNewsEvent', null); upd('smBaseline', null); if (addToast) addToast('\u267B Market reset! Create a new one.', 'info'); },

                      className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-400'

                    }, t('stem.economicslab.reset_market_generate_new_companies', '\u267B Reset Market & Generate New Companies'))

                  )

                )

            ),



            econTab === 'entrepreneur' && React.createElement('div', { className: 'mt-4' },

              // Business setup (if no business yet)

              !d.enBusiness ? React.createElement('div', { className: 'text-center py-8' },

                React.createElement('div', { className: 'text-5xl mb-4' }, '\uD83D\uDE80'),

                React.createElement('h3', { className: 'text-lg font-bold text-slate-800 mb-2' }, t('stem.economicslab.start_your_business', 'Start Your Business')),

                React.createElement('p', { className: 'text-xs text-slate-600 mb-4 max-w-sm mx-auto' }, t('stem.economicslab.type_any_business_idea_and_ai_will_gen', 'Type any business idea and AI will generate your startup costs, daily expenses, and pricing. Then run it day by day!')),

                React.createElement('input', {

                  type: 'text',

                  value: d.enInput || '',

                  onChange: function (e) { upd('enInput', e.target.value); },

                  placeholder: t('stem.economicslab.e_g_food_truck_dog_walking_tutoring_ba', 'e.g. food truck, dog walking, tutoring, bakery, app development...'),

                  className: 'w-full max-w-md px-4 py-3 border-2 border-slate-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all mb-3',

                  onKeyDown: function (e) { if (e.key === 'Enter' && (d.enInput || '').trim()) { document.getElementById('econ-start-biz').click(); } }

                }),

                React.createElement('button', {

                  id: 'econ-start-biz',

                  onClick: function () {

                    if (!(d.enInput || '').trim()) return;

                    upd('enLoading', true);

                    var prompt = 'You are a business simulation game engine for students. The player wants to start a "' + d.enInput.trim() + '" business.\n\nGenerate realistic startup details. Return ONLY valid JSON:\n{"businessName":"<creative name>","emoji":"<single emoji>","startupCost":<number 500-50000>,"dailyFixedCosts":<number 10-500>,"unitCost":<number, cost per unit/customer served>,"unitName":"<what 1 unit is, e.g. meal, walk, lesson, item>","suggestedPrice":<number>,"maxDailyCustomers":<number 5-200>,"description":"<1 sentence pitch>","riskFactors":["<risk 1>","<risk 2>","<risk 3>"]}\n\nMake the numbers realistic for a small business startup.';

                    callGemini(prompt, true).then(function (result) {

                      try {

                        var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                        var s2 = cleaned.indexOf('{'); if (s2 > 0) cleaned = cleaned.substring(s2);

                        var e2 = cleaned.lastIndexOf('}'); if (e2 > 0) cleaned = cleaned.substring(0, e2 + 1);

                        var biz = JSON.parse(cleaned);

                        upd('enBusiness', biz);

                        upd('enBizCash', 10000 - (biz.startupCost || 5000));

                        upd('enBizDay', 1);

                        upd('enBizRep', 50);

                        upd('enBizPrice', biz.suggestedPrice || 10);

                        upd('enBizHistory', []);

                        upd('enBizEvent', null);

                        upd('enLoading', false);

                        if (addToast) addToast('\uD83C\uDF89 ' + biz.businessName + ' is open! Starting capital: $' + (10000 - biz.startupCost).toLocaleString(), 'success');

                      } catch (e3) { upd('enLoading', false); if (addToast) addToast('Failed to create business. Try again!', 'error'); console.warn('[BizSim]', e3); }

                    }).catch(function (e4) { upd('enLoading', false); if (addToast) addToast('AI error', 'error'); });

                  },

                  disabled: d.enLoading || !(d.enInput || '').trim(),

                  className: 'w-full max-w-md py-3 rounded-xl text-sm font-bold shadow-lg transition-all ' + (d.enLoading ? 'bg-slate-300 text-slate-600' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-xl')

                }, d.enLoading ? '\u23F3 AI is building your business...' : '\uD83D\uDE80 Launch Business')

              ) :

                // Active business view

                React.createElement('div', null,

                  // Business header

                  React.createElement('div', { className: 'flex items-center gap-3 mb-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200' },

                    React.createElement('span', { className: 'text-3xl' }, d.enBusiness.emoji || '\uD83C\uDFEA'),

                    React.createElement('div', { className: 'flex-1' },

                      React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, d.enBusiness.businessName),

                      React.createElement('p', { className: 'text-[11px] text-amber-600' }, d.enBusiness.description)

                    ),

                    React.createElement('div', { className: 'text-right' },

                      React.createElement('div', { className: 'text-lg font-bold ' + ((d.enBizCash || 0) >= 0 ? 'text-green-600' : 'text-red-500') }, '$' + (d.enBizCash || 0).toLocaleString()),

                      React.createElement('div', { className: 'text-[11px] text-slate-600' }, 'Day ' + (d.enBizDay || 1) + ' | Rep: ' + (d.enBizRep || 50) + '/100 | Staff: ' + (d.enBizEmployees || 0))

                    )

                  ),

                  d.enBusiness && (d.enBizCash || 0) < 0 && React.createElement('div', { className: 'text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3', role: 'alert' },
                t('stem.economicslab.biz_cash_warning', '⚠️ Your business is losing money — cash is negative. Check your unit economics: does price cover unit cost AND your share of fixed costs? Raising price, cutting costs, or building reputation are your levers.')),

              // Price adjustment + stats

                  React.createElement('div', { className: 'grid grid-cols-3 gap-2 mb-3' },

                    React.createElement('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },

                      React.createElement('label', { className: 'block text-[11px] font-bold text-amber-700 mb-1' }, '\uD83D\uDCB2 Price per ' + (d.enBusiness.unitName || 'unit') + ': $' + (d.enBizPrice || d.enBusiness.suggestedPrice || 10).toFixed(2)),

                      React.createElement('input', {

                        type: 'range', 'aria-valuetext': '$' + (d.enBizPrice || (d.enBusiness && d.enBusiness.suggestedPrice) || 10) + ' per unit', 'aria-label': t('stem.economicslab.price_per_unit', 'Price per unit, dollars'), min: 1, max: (d.enBusiness.suggestedPrice || 10) * 3, step: 0.5,

                        value: d.enBizPrice || d.enBusiness.suggestedPrice || 10,

                        onChange: function (e) { upd('enBizPrice', parseFloat(e.target.value)); },

                        className: 'w-full accent-amber-500'

                      }),

                      React.createElement('div', { className: 'text-[11px] text-amber-600 mt-0.5' }, 'Suggested: $' + (d.enBusiness.suggestedPrice || 10)),

                      (d.enBizPrice || d.enBusiness.suggestedPrice || 10) < (d.enBusiness.unitCost || 0) && React.createElement('div', { className: 'text-[11px] text-red-700 font-bold mt-1', role: 'alert' }, t('stem.economicslab.below_cost_warning', '⚠️ Price is below unit cost — you lose money on EVERY sale.')),

                      (d.enBizPrice || 0) > (d.enBusiness.suggestedPrice || 10) * 2 && React.createElement('div', { className: 'text-[11px] text-amber-700 mt-1' }, t('stem.economicslab.high_price_hint', '📚 Price is far above suggested — expect demand to fall (price elasticity).'))

                    ),

                    React.createElement('div', { className: 'bg-blue-50 rounded-xl p-3 border border-blue-200 text-center' },

                      React.createElement('div', { className: 'text-[11px] text-blue-500 font-bold' }, t('stem.economicslab.profit_margin', 'Profit Margin')),

                      React.createElement('div', { className: 'text-lg font-bold ' + (((d.enBizPrice || d.enBusiness.suggestedPrice || 10) - (d.enBusiness.unitCost || 5)) / (d.enBizPrice || d.enBusiness.suggestedPrice || 10) * 100 > 30 ? 'text-green-600' : 'text-amber-600') },

                        (((d.enBizPrice || d.enBusiness.suggestedPrice || 10) - (d.enBusiness.unitCost || 5)) / (d.enBizPrice || d.enBusiness.suggestedPrice || 10) * 100).toFixed(0) + '%'),

                      React.createElement('div', { className: 'text-[11px] text-blue-400' }, 'Cost: $' + (d.enBusiness.unitCost || 5))

                    ),

                    React.createElement('div', { className: 'bg-purple-50 rounded-xl p-3 border border-purple-200 text-center' },

                      React.createElement('div', { className: 'text-[11px] text-purple-500 font-bold' }, 'Break-Even'),

                      React.createElement('div', { className: 'text-lg font-bold text-purple-700' },

                        Math.ceil((d.enBusiness.dailyFixedCosts || 50) / Math.max(0.01, (d.enBizPrice || d.enBusiness.suggestedPrice || 10) - (d.enBusiness.unitCost || 5)))),

                      React.createElement('div', { className: 'text-[11px] text-purple-400' }, d.enBusiness.unitName + 's/day')

                    )

                  )

                ),

              // AI Event display

              d.enBizEvent ? React.createElement('div', { className: 'bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200 mb-3' },

                React.createElement('div', { className: 'flex items-start gap-2 mb-3' },

                  React.createElement('span', { className: 'text-2xl' }, d.enBizEvent.emoji || '\u26A1'),

                  React.createElement('div', null,

                    React.createElement('h4', { className: 'text-sm font-bold text-purple-800' }, d.enBizEvent.title),

                    React.createElement('p', { className: 'text-xs text-purple-600 mt-1' }, d.enBizEvent.description),

                    d.enBizEvent.lesson && React.createElement('div', { className: 'mt-2 bg-purple-100 rounded-lg px-3 py-2 text-[11px] text-purple-800 border border-purple-200' },

                      React.createElement('span', { className: 'font-bold' }, t('stem.economicslab.business_concept', '\uD83D\uDCDA Business Concept: ')),

                      d.enBizEvent.lesson

                    )

                  )

                ),

                React.createElement('div', { className: 'grid gap-2' },

                  (d.enBizEvent.choices || []).map(function (ch, chi) {

                    return React.createElement('button', {

                      key: chi,

                      onClick: function () {

                        var ef = ch.effect || {};

                        upd('enBizCash', (d.enBizCash || 0) + (ef.cash || 0));

                        upd('enBizRep', Math.min(100, Math.max(0, (d.enBizRep || 50) + (ef.reputation || 0))));

                        if (ef.employees) upd('enBizEmployees', Math.max(0, (d.enBizEmployees || 0) + ef.employees));

                        upd('enBizEvent', null);

                        if (addToast) addToast(ch.label + ' \u2192 ' + (ef.cash >= 0 ? '+$' : '-$') + Math.abs(ef.cash || 0), ef.cash >= 0 ? 'success' : 'warning');

                      },

                      className: 'w-full text-left p-3 rounded-xl border-2 border-purple-100 hover:border-purple-400 bg-white hover:bg-purple-50 transition-all text-xs'

                    },

                      React.createElement('div', { className: 'font-bold text-slate-700' }, ch.label),

                      React.createElement('div', { className: 'text-slate-500 mt-0.5 flex gap-3' },

                        ch.effect && ch.effect.cash ? React.createElement('span', { className: ch.effect.cash >= 0 ? 'text-green-500' : 'text-red-500' }, (ch.effect.cash >= 0 ? '+' : '') + '$' + ch.effect.cash) : null,

                        ch.effect && ch.effect.reputation ? React.createElement('span', { className: 'text-purple-500' }, (ch.effect.reputation > 0 ? '+' : '') + ch.effect.reputation + ' rep') : null,

                        ch.effect && ch.effect.employees ? React.createElement('span', { className: 'text-sky-500' }, (ch.effect.employees > 0 ? '+' : '') + ch.effect.employees + ' staff') : null

                      )

                    );

                  })

                )

              ) : null,

              // Run Day button

              !d.enBizEvent && React.createElement('button', {

                onClick: function () {

                  upd('enBizLoading', true);

                  var biz = d.enBusiness;

                  var prompt = 'You are a business simulation game engine (difficulty: ' + (d.econDifficulty || 'medium') + '). The player runs "' + biz.businessName + '" (a ' + (d.enInput || 'business') + '). Day ' + (d.enBizDay || 1) + ', cash: $' + (d.enBizCash || 0) + ', reputation: ' + (d.enBizRep || 50) + '/100. They sell ' + biz.unitName + ' at $' + (d.enBizPrice || biz.suggestedPrice) + ' each. Daily fixed costs: $' + biz.dailyFixedCosts + ', unit cost: $' + biz.unitCost + '. They have ' + (d.enBizLocations || 1) + ' location(s) and ' + (d.enBizEmployees || 0) + ' employees (each costs $80/day but increases max customers by 20%).\n\nSimulate today and generate an event. Return ONLY valid JSON:\n{"customersToday":<number>,"revenue":<number>,"costs":<number>,"emoji":"<emoji>","title":"<event title>","description":"<what happened today + the event>","choices":[{"label":"<option>","effect":{"cash":<number>,"reputation":<number>,"employees":<number or 0>}}]}\n\nMake daily customers based on reputation (higher rep = more customers, max ' + biz.maxDailyCustomers + '). Include a realistic challenge with 2-3 choices.\n\nIMPORTANT: Include a "lesson" field with a 1-2 sentence business/entrepreneurship concept (e.g., break-even analysis, profit margins, customer acquisition cost, cash flow management, competitive advantage, economies of scale, marketing ROI, supply chain, pivot strategy, unit economics, customer retention vs acquisition).';

                  callGemini(prompt, true).then(function (result) {

                    try {

                      var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                      var s3 = cleaned.indexOf('{'); if (s3 > 0) cleaned = cleaned.substring(s3);

                      var e3 = cleaned.lastIndexOf('}'); if (e3 > 0) cleaned = cleaned.substring(0, e3 + 1);

                      var dayResult = JSON.parse(cleaned);

                      var dailyProfit = (dayResult.revenue || 0) - (dayResult.costs || 0);

                      upd('enBizCash', (d.enBizCash || 0) + dailyProfit);

                      upd('enBizDay', (d.enBizDay || 1) + 1);

                      if (typeof addXP === 'function') addXP(10, 'Business Sim: Completed a day');

                      var h2 = (d.enBizHistory || []).slice(-29);

                      h2.push({ day: d.enBizDay || 1, revenue: dayResult.revenue, costs: dayResult.costs, profit: dailyProfit, customers: dayResult.customersToday });

                      upd('enBizHistory', h2);

                      upd('enBizEvent', dayResult);

                      if (dayResult.lesson) {

                        var gl3 = (d.econGlossary || []).slice();

                        var exists3 = gl3.some(function (g) { return g.concept === dayResult.title; });

                        if (!exists3) { gl3.push({ tab: 'Business', concept: dayResult.title, explanation: dayResult.lesson }); upd('econGlossary', gl3); }

                      }

                      upd('enBizLoading', false);

                    } catch (e4) { upd('enBizLoading', false); if (addToast) addToast('Day sim failed. Try again!', 'error'); console.warn('[BizSim]', e4); }

                  }).catch(function (e5) { upd('enBizLoading', false); if (addToast) addToast('AI error', 'error'); });

                },

                disabled: d.enBizLoading,

                className: 'w-full py-4 rounded-2xl text-sm font-bold shadow-lg mb-3 transition-all ' + (d.enBizLoading ? 'bg-slate-300 text-slate-600' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-xl hover:scale-[1.02]')

              }, d.enBizLoading ? '\u23F3 Simulating day...' : '\u2600\uFE0F Open for Business! (Day ' + (d.enBizDay || 1) + ')'),

              // Stats + History

              (d.enBizHistory || []).length > 0 && React.createElement('div', { className: 'bg-white rounded-xl border border-slate-400 p-3' },

                React.createElement('h4', { className: 'text-xs font-bold text-slate-600 mb-2' }, t('stem.economicslab.business_history', '\uD83D\uDCC8 Business History')),

                (d.enBizHistory || []).slice(-7).reverse().map(function (dh, dhi) {

                  return React.createElement('div', { key: dhi, className: 'flex justify-between text-[11px] py-1 border-b border-slate-50' },

                    React.createElement('span', { className: 'text-slate-600' }, 'Day ' + dh.day),

                    React.createElement('span', { className: 'text-slate-600' }, dh.customers + ' customers'),

                    React.createElement('span', { className: 'text-blue-500' }, 'Rev $' + (dh.revenue || 0).toFixed(0)),

                    React.createElement('span', { className: dh.profit >= 0 ? 'text-green-600 font-bold' : 'text-red-500 font-bold' }, (dh.profit >= 0 ? '+' : '') + '$' + (dh.profit || 0).toFixed(0))

                  );

                })

              ),

              // Close business

              React.createElement('button', {

                onClick: function () { upd('enBusiness', null); upd('enInput', ''); if (addToast) addToast('Business closed. Start a new one!', 'info'); },

                className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-400'

              }, t('stem.economicslab.close_business_start_new', '\u267B Close Business & Start New'))

            ),

            // \u2550\u2550 NATIONAL ECONOMY controls \u2550\u2550
            // The macro canvas told students to "Click Next Year" but no such
            // control ever existed \u2014 the whole simulator was unreachable (and
            // with it the Policy Veteran / Economic Boom / Full Employment
            // achievements and the macro ticker). This panel runs a LOCAL toy
            // model (no AI call) so it works offline: textbook-Keynesian
            // demand impulse, expectations-weighted inflation, Okun's-law
            // unemployment, plus a small random shock table. Same epistemic
            // framing as the Policy Inquiry widget: heuristic, contested.
            econTab === 'macro' && (function () {
              var mClamp = function (v, lo, hi) { return Math.min(hi, Math.max(lo, v)); };
              var mRate = d.macroInterest !== undefined ? d.macroInterest : 5.25;
              var mSpend = d.macroSpend || 0;
              var mTax = d.macroTax || 0;
              var mNeutral = 3;
              var mRealRate = mRate - macroInflation;
              // Predict-then-check: pick a goal BEFORE advancing the year; the
              // year report grades the outcome against it.
              var mGoal = d.macroGoal || null;
              var MACRO_GOALS = [
                { id: 'cool_inflation', label: t('stem.economicslab.goal_cool_inflation', '❄️ Cool inflation') },
                { id: 'boost_growth', label: t('stem.economicslab.goal_boost_growth', '📈 Boost growth') },
                { id: 'cut_unemployment', label: t('stem.economicslab.goal_cut_unemployment', '💼 Cut unemployment') }
              ];
              var MACRO_SHOCKS = [
                { name: t('stem.economicslab.shock_oil', 'Oil price shock'), icon: '\u26FD', gdp: -1.2, inf: 2.0, unemp: 0.6, trade: -0.5, lesson: t('stem.economicslab.shock_oil_lesson', 'Supply shocks raise prices AND cut output at the same time \u2014 stagflation pressure, like the 1973 OPEC embargo.') },
                { name: t('stem.economicslab.shock_tech', 'Tech productivity boom'), icon: '\uD83D\uDCBB', gdp: 1.5, inf: -0.5, unemp: -0.4, trade: 0.3, lesson: t('stem.economicslab.shock_tech_lesson', 'Productivity growth is the rare free lunch: more output per worker lifts GDP without stoking inflation.') },
                { name: t('stem.economicslab.shock_financial', 'Financial crisis'), icon: '\uD83C\uDFE6', gdp: -2.5, inf: -1.0, unemp: 1.8, trade: 0.2, lesson: t('stem.economicslab.shock_financial_lesson', 'Credit crunches destroy demand: GDP, prices, and employment all fall together, like 2008.') },
                { name: t('stem.economicslab.shock_trade_war', 'Trade war escalation'), icon: '\uD83D\uDEA2', gdp: -0.6, inf: 0.7, unemp: 0.3, trade: -0.8, lesson: t('stem.economicslab.shock_trade_war_lesson', 'Tariffs raise import prices at home and invite retaliation against your exporters abroad.') },
                { name: t('stem.economicslab.shock_consumer_boom', 'Consumer confidence surge'), icon: '\uD83D\uDECD\uFE0F', gdp: 0.9, inf: 0.5, unemp: -0.3, trade: -0.3, lesson: t('stem.economicslab.shock_consumer_boom_lesson', 'Expectations move economies: when households feel secure they spend, and spending is someone else\'s income.') }
              ];
              var advanceYear = function () {
                var demandImpulse = mSpend * 0.8 - mTax * 0.5 - (mRate - mNeutral) * 0.4;
                var shock = Math.random() < 0.4 ? MACRO_SHOCKS[Math.floor(Math.random() * MACRO_SHOCKS.length)] : null;
                var gdpNew = mClamp(0.55 * macroGDP + 1.0 + demandImpulse + (shock ? shock.gdp : 0) + (Math.random() - 0.5) * 0.6, -8, 10);
                var infNew = mClamp(0.65 * macroInflation + 0.8 + 0.3 * demandImpulse - 0.25 * (mRate - mNeutral) + (shock ? shock.inf : 0) + (Math.random() - 0.5) * 0.4, -2, 15);
                var unempNew = mClamp(macroUnemployment - 0.35 * (gdpNew - 2) + (shock ? shock.unemp : 0), 2, 15);
                var tradeNew = mClamp(macroTrade + (shock ? shock.trade : 0) - 0.05 * demandImpulse + (Math.random() - 0.5) * 0.4, -5, 5);
                gdpNew = Math.round(gdpNew * 10) / 10; infNew = Math.round(infNew * 10) / 10;
                unempNew = Math.round(unempNew * 10) / 10; tradeNew = Math.round(tradeNew * 10) / 10;
                var lines = [];
                if (mSpend > 0) lines.push(t('stem.economicslab.report_spend_up', '\uD83C\uDFDB\uFE0F Government spending ') + '+' + mSpend + t('stem.economicslab.report_spend_up_2', '% of GDP added demand (Keynesian multiplier) \u2014 but deficits must eventually be financed.'));
                if (mSpend < 0) lines.push(t('stem.economicslab.report_spend_down', '\uD83C\uDFDB\uFE0F Austerity: spending cut ') + mSpend + t('stem.economicslab.report_spend_down_2', '% of GDP removed demand from the economy.'));
                if (mTax > 0) lines.push(t('stem.economicslab.report_tax_up', '\uD83D\uDCB8 Tax increase of ') + mTax + t('stem.economicslab.report_tax_up_2', '% left households less to spend, cooling demand.'));
                if (mTax < 0) lines.push(t('stem.economicslab.report_tax_down', '\uD83D\uDCB8 Tax cut of ') + Math.abs(mTax) + t('stem.economicslab.report_tax_down_2', '% left households more to spend, boosting demand.'));
                if (mRate - mNeutral > 0.5) lines.push(t('stem.economicslab.report_rate_high', '\uD83C\uDFE6 Interest rates above the ~3% neutral rate made borrowing expensive \u2014 investment and hiring slowed (monetary brake).'));
                if (mRate - mNeutral < -0.5) lines.push(t('stem.economicslab.report_rate_low', '\uD83C\uDFE6 Interest rates below neutral made borrowing cheap \u2014 credit-fueled demand rose (monetary gas pedal).'));
                lines.push(t('stem.economicslab.report_okun', '\uD83D\uDCCA Okun\'s law: growth of ') + gdpNew.toFixed(1) + t('stem.economicslab.report_okun_2', '% vs the ~2% trend moved unemployment to ') + unempNew.toFixed(1) + '%.');
                if (mGoal === 'cool_inflation') lines.push((infNew < macroInflation ? '\uD83C\uDFAF ' : '\u26A0\uFE0F ') + t('stem.economicslab.goal_check_inflation', 'Goal check \u2014 inflation: ') + macroInflation.toFixed(1) + '% \u2192 ' + infNew.toFixed(1) + '%' + (infNew < macroInflation ? ' \u2713' : ' ' + t('stem.economicslab.goal_missed_inflation', '(moved the wrong way \u2014 which lever raises the cost of borrowing?)')));
                if (mGoal === 'boost_growth') lines.push((gdpNew > macroGDP ? '\uD83C\uDFAF ' : '\u26A0\uFE0F ') + t('stem.economicslab.goal_check_growth', 'Goal check \u2014 GDP growth: ') + macroGDP.toFixed(1) + '% \u2192 ' + gdpNew.toFixed(1) + '%' + (gdpNew > macroGDP ? ' \u2713' : ' ' + t('stem.economicslab.goal_missed_growth', '(what adds demand \u2014 spending, tax cuts, or cheaper credit?)')));
                if (mGoal === 'cut_unemployment') lines.push((unempNew < macroUnemployment ? '\uD83C\uDFAF ' : '\u26A0\uFE0F ') + t('stem.economicslab.goal_check_unemployment', 'Goal check \u2014 unemployment: ') + macroUnemployment.toFixed(1) + '% \u2192 ' + unempNew.toFixed(1) + '%' + (unempNew < macroUnemployment ? ' \u2713' : ' ' + t('stem.economicslab.goal_missed_unemployment', "(Okun's law: unemployment falls when growth beats the ~2% trend)")));
                var hist = (d.macroHistory || []).slice(-29);
                hist.push({ year: macroYear, gdp: gdpNew, inflation: infNew, unemployment: unempNew, interest: mRate });
                upd('macroGDP', gdpNew); upd('macroInflation', infNew);
                upd('macroUnemployment', unempNew); upd('macroTrade', tradeNew);
                upd('macroYear', macroYear + 1); upd('macroHistory', hist);
                upd('macroReport', { year: macroYear, shock: shock, lines: lines });
                if (shock && shock.lesson) {
                  var glM = (d.econGlossary || []).slice();
                  if (!glM.some(function (g) { return g.concept === shock.name; })) { glM.push({ tab: 'Macro', concept: shock.name, explanation: shock.lesson }); upd('econGlossary', glM); }
                }
                if (typeof addXP === 'function') addXP(15, 'Macro: simulated a policy year');
                if (addToast) addToast('\uD83C\uDFDB\uFE0F Year ' + macroYear + (shock ? ': ' + shock.icon + ' ' + shock.name : ' complete'), shock && shock.gdp < 0 ? 'warning' : 'success');
                if (announceToSR) announceToSR('Year ' + macroYear + ' simulated. GDP growth ' + gdpNew.toFixed(1) + ' percent, inflation ' + infNew.toFixed(1) + ' percent, unemployment ' + unempNew.toFixed(1) + ' percent.' + (shock ? ' Shock: ' + shock.name + '.' : ''));
              };
              return React.createElement('div', { className: 'mt-4', 'data-economicslab-macro-controls': 'true' },
                React.createElement('div', { className: 'flex items-center gap-2 mb-3 flex-wrap' },
                  React.createElement('span', { className: 'text-[11px] font-bold text-slate-600' }, t('stem.economicslab.policy_goal_label', '🎯 Policy goal (pick one, predict, then advance):')),
                  MACRO_GOALS.map(function (g) {
                    var isOn = mGoal === g.id;
                    return React.createElement('button', {
                      key: g.id, type: 'button', 'aria-pressed': isOn ? 'true' : 'false',
                      onClick: function () { upd('macroGoal', isOn ? null : g.id); },
                      className: 'text-[11px] px-2 py-1 rounded-full border font-bold ' + (isOn ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-300 hover:border-red-400')
                    }, g.label);
                  })
                ),
                React.createElement('div', { className: 'grid grid-cols-2 gap-4 mb-3' },
                  React.createElement('div', { className: 'space-y-2 bg-blue-50 rounded-xl p-4 border border-blue-200' },
                    React.createElement('h4', { className: 'text-sm font-bold text-blue-700' }, t('stem.economicslab.central_bank', '\uD83C\uDFE6 Central Bank (Monetary Policy)')),
                    React.createElement('label', { className: 'block text-xs text-blue-600' }, t('stem.economicslab.policy_interest_rate', 'Policy Interest Rate: ') + mRate.toFixed(2) + '%'),
                    React.createElement('input', {
                      type: 'range', min: 0, max: 12, step: 0.25, value: mRate,
                      'aria-label': t('stem.economicslab.policy_interest_rate_2', 'Policy interest rate, percent'),
                      'aria-valuetext': mRate.toFixed(2) + '%',
                      onChange: function (e) { upd('macroInterest', parseFloat(e.target.value)); },
                      className: 'w-full accent-blue-500'
                    }),
                    React.createElement('div', { className: 'text-[11px] text-slate-600 bg-white rounded-lg p-2 border border-blue-100' },
                      t('stem.economicslab.real_rate_note', '\uD83D\uDCDA Real rate = nominal \u2212 inflation = ') + mRealRate.toFixed(1) + '%. ' +
                      (mRealRate < 0
                        ? t('stem.economicslab.real_rate_negative', 'Negative real rates mean borrowers win and savers lose \u2014 very stimulative.')
                        : t('stem.economicslab.real_rate_positive', 'Positive real rates reward saving and slow borrowing \u2014 restrictive.')))
                  ),
                  React.createElement('div', { className: 'space-y-2 bg-amber-50 rounded-xl p-4 border border-amber-200' },
                    React.createElement('h4', { className: 'text-sm font-bold text-amber-700' }, t('stem.economicslab.congress_fiscal', '\uD83C\uDFDB\uFE0F Congress (Fiscal Policy)')),
                    React.createElement('label', { className: 'block text-xs text-amber-700' }, t('stem.economicslab.spending_change', 'Spending change: ') + (mSpend > 0 ? '+' : '') + mSpend + t('stem.economicslab.pct_of_gdp', '% of GDP')),
                    React.createElement('input', {
                      type: 'range', min: -3, max: 3, step: 0.5, value: mSpend,
                      'aria-label': t('stem.economicslab.spending_change_2', 'Government spending change, percent of GDP'),
                      'aria-valuetext': (mSpend > 0 ? 'plus ' : '') + mSpend + ' percent of GDP',
                      onChange: function (e) { upd('macroSpend', parseFloat(e.target.value)); },
                      className: 'w-full accent-amber-500'
                    }),
                    React.createElement('label', { className: 'block text-xs text-amber-700' }, t('stem.economicslab.tax_change', 'Tax change: ') + (mTax > 0 ? '+' : '') + mTax + '%'),
                    React.createElement('input', {
                      type: 'range', min: -3, max: 3, step: 0.5, value: mTax,
                      'aria-label': t('stem.economicslab.tax_change_2', 'Tax change, percent'),
                      'aria-valuetext': (mTax > 0 ? 'plus ' : '') + mTax + ' percent',
                      onChange: function (e) { upd('macroTax', parseFloat(e.target.value)); },
                      className: 'w-full accent-amber-500'
                    }),
                    (mSpend > 0 || mTax < 0) && React.createElement('div', { className: 'text-[11px] text-slate-600 bg-white rounded-lg p-2 border border-amber-100' },
                      t('stem.economicslab.deficit_note', '\uD83D\uDCDA Spending more while taxing less = deficit spending. It stimulates now, but the debt is a claim on future taxpayers.'))
                  )
                ),
                React.createElement('button', {
                  onClick: advanceYear,
                  className: 'w-full py-4 rounded-2xl text-sm font-bold shadow-lg mb-3 transition-all bg-gradient-to-r from-red-600 to-rose-600 text-white hover:shadow-xl hover:scale-[1.02]'
                }, t('stem.economicslab.advance_year', '\uD83D\uDCC5 Advance One Year (') + macroYear + ' \u2192 ' + (macroYear + 1) + ')'),
                d.macroReport && React.createElement('div', { className: 'bg-gradient-to-br from-slate-50 to-zinc-50 rounded-xl p-4 border border-slate-400 mb-3' },
                  React.createElement('h4', { className: 'text-sm font-bold text-slate-800 mb-2' }, t('stem.economicslab.year_report', '\uD83D\uDCCB Year ') + d.macroReport.year + t('stem.economicslab.year_report_2', ' in Review')),
                  d.macroReport.shock && React.createElement('div', { className: 'flex items-center gap-2 mb-2 bg-amber-50 border border-amber-200 rounded-lg p-2' },
                    React.createElement('span', { className: 'text-xl', 'aria-hidden': 'true' }, d.macroReport.shock.icon),
                    React.createElement('div', null,
                      React.createElement('div', { className: 'text-[11px] font-bold text-amber-800' }, t('stem.economicslab.shock_label', 'Shock: ') + d.macroReport.shock.name),
                      React.createElement('div', { className: 'text-[11px] text-amber-700' }, d.macroReport.shock.lesson))),
                  React.createElement('div', { className: 'space-y-1' },
                    (d.macroReport.lines || []).map(function (ln, li2) {
                      return React.createElement('p', { key: li2, className: 'text-[11px] text-slate-600 leading-relaxed m-0' }, ln);
                    }))
                ),
                React.createElement('button', {
                  onClick: function () { upd('macroGDP', 2.1); upd('macroInflation', 3.2); upd('macroInterest', 5.25); upd('macroUnemployment', 3.8); upd('macroTrade', -0.5); upd('macroYear', 2025); upd('macroHistory', []); upd('macroReport', null); upd('macroSpend', 0); upd('macroTax', 0); if (addToast) addToast(t('stem.economicslab.economy_reset', '\u267B Economy reset to 2025 baseline'), 'info'); },
                  className: 'w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-400 mb-2'
                }, t('stem.economicslab.reset_economy', '\u267B Reset Economy')),
                React.createElement('p', { className: 'm-0 text-[10px] italic text-slate-500' }, t('stem.economicslab.macro_model_disclaimer', 'Toy model with textbook-Keynesian signs plus Okun\'s-law unemployment \u2014 NOT a forecast. Real economies depend on expectations, credibility, and global conditions, and economists genuinely disagree about these coefficients (see Schools of Thought in the reference shelf).'))
              );
            })(),

            // \u2550\u2550 POLICY INQUIRY widget (H7b'') \u2550\u2550
            econTab === 'inquiry' && (function() {
              var iq = d.policyIQ || { taxCut: 0, govSpend: 0, rateChange: 0, tariff: 0, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
              function setIQ(patch) { upd('policyIQ', Object.assign({}, iq, patch)); }
              function setKey(k, v) { var p = {}; p[k] = v; setIQ(p); }
              // Toy model (textbook KEYNESIAN signs): demand-side multipliers, expectations-anchored
              // inflation, Phillips-curve unemployment. New-classical / supply-side / monetarist /
              // MMT / neo-Fisherian schools would flip several of these coefficients; the footer
              // disclaimer and the open questions invite the student to ask which signs would
              // change under each school.
              var dGDP = iq.taxCut * 0.5 + iq.govSpend * 0.8 - iq.rateChange * 0.6 - iq.tariff * 0.3;
              var dInflation = iq.taxCut * 0.2 + iq.govSpend * 0.4 - iq.rateChange * 0.7 + iq.tariff * 0.5;
              var dUnemployment = -iq.taxCut * 0.1 - iq.govSpend * 0.3 + iq.rateChange * 0.4 + iq.tariff * 0.2;
              var stagflation = dInflation > 1.5 && dGDP < -0.5;
              var recession = dGDP < -1.5;
              var overheat = dInflation > 2 && dGDP > 1;
              var state = recession ? 'recession' : stagflation ? 'stagflation' : overheat ? 'overheat' : dGDP > 0.5 && dInflation < 1.5 ? 'expansion' : 'mild';
              var sm = ({
                recession: { label: t('stem.economicslab.recession', 'Recession'), color: '#f87171', bg: '#2a0a0a', border: '#dc2626', desc: t('stem.economicslab.gdp_contracting_unemployment_climbing_', 'GDP contracting. Unemployment climbing. Aggregate demand insufficient.') },
                stagflation: { label: t('stem.economicslab.stagflation', 'Stagflation'), color: '#fb923c', bg: '#2a1a0a', border: '#ea580c', desc: t('stem.economicslab.rare_and_ugly_high_inflation_low_growt', 'Rare and ugly: high inflation + low growth. 1970s OPEC shock pattern. Hard to fix.') },
                overheat: { label: t('stem.economicslab.overheating', 'Overheating'), color: '#facc15', bg: '#2a2410', border: '#eab308', desc: t('stem.economicslab.growth_strong_but_inflation_spiking_ce', 'Growth strong but inflation spiking. Central bank likely to brake hard.') },
                expansion: { label: t('stem.economicslab.healthy_expansion', 'Healthy expansion'), color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: t('stem.economicslab.gdp_up_inflation_contained_goldilocks_', 'GDP up, inflation contained. Goldilocks zone \u2014 sustainable for now.') },
                mild: { label: t('stem.economicslab.mild_mixed', 'Mild / mixed'), color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: t('stem.economicslab.small_net_effect_policy_levers_roughly', 'Small net effect. Policy levers roughly cancel out.') }
              })[state];
              return React.createElement('div', { className: 'mt-4 p-3 rounded-xl', style: { background: sm.bg, border: '1px solid ' + sm.border, color: '#e8f0f5' } },
                React.createElement('h4', { className: 'text-xs font-black uppercase tracking-wider mb-1', style: { color: sm.color } }, t('stem.economicslab.policy_inquiry_predict_the_macro_outco', '\uD83D\uDD2C Policy Inquiry \u2014 Predict the Macro Outcome')),
                React.createElement('p', { className: 'text-[10px] opacity-85 mb-2 leading-snug' }, t('stem.economicslab.move_four_policy_levers_tax_govt_spend', 'Move four policy levers (tax, govt spending, interest rate, tariffs). Predict the macro state before reading it. No score, no reveal.')),
                React.createElement('div', { className: 'inline-block px-2 py-1 rounded-full text-[10px] font-bold mb-2', style: { background: sm.color, color: '#000' } }, sm.label),
                React.createElement('p', { className: 'text-[10px] opacity-80 mb-2' }, sm.desc),
                React.createElement('div', { className: 'grid grid-cols-3 gap-2 mb-2' },
                  [
                    { label: '\u0394GDP', val: (dGDP > 0 ? '+' : '') + dGDP.toFixed(2) + '%' },
                    { label: '\u0394Inflation', val: (dInflation > 0 ? '+' : '') + dInflation.toFixed(2) + 'pp' },
                    { label: '\u0394Unemploy', val: (dUnemployment > 0 ? '+' : '') + dUnemployment.toFixed(2) + 'pp' }
                  ].map(function(m) {
                    return React.createElement('div', { key: m.label, className: 'p-2 rounded text-center', style: { background: '#0a0a1a', border: '1px solid ' + sm.border } },
                      React.createElement('div', { className: 'text-[9px] opacity-60' }, m.label),
                      React.createElement('div', { className: 'text-[12px] font-bold font-mono', style: { color: sm.color } }, m.val)
                    );
                  })
                ),
                React.createElement('svg', { width: '100%', height: 120, viewBox: '0 0 320 120', style: { background: '#0a0a1a', borderRadius: 6, marginBottom: 8 } },
                  React.createElement('line', { x1: 30, y1: 60, x2: 310, y2: 60, stroke: '#475569', strokeWidth: 1 }),
                  React.createElement('text', { x: 30, y: 110, fill: '#94a3b8', fontSize: 9 }, '\u0394GDP'),
                  React.createElement('text', { x: 130, y: 110, fill: '#94a3b8', fontSize: 9 }, '\u0394Inflation'),
                  React.createElement('text', { x: 230, y: 110, fill: '#94a3b8', fontSize: 9 }, '\u0394Unemploy'),
                  (function() {
                    // viewBox is 0 0 320 120 with a horizontal baseline at y=60.
                    // Clamp bar heights to 50 (the room available above/below the
                    // baseline) so policy extremes (e.g. tariff=25 driving dInflation
                    // past 12.5pp ⇒ untouched height = 12.5*15 = 187px) can't overflow.
                    function bar(key, x, val, posFill, negFill) {
                      var h = Math.min(50, Math.abs(val) * 15);
                      var y = val > 0 ? 60 - h : 60;
                      return React.createElement('rect', { key: 'policy-bar-' + key, x: x, y: y, width: 40, height: h, fill: val > 0 ? posFill : negFill });
                    }
                    return [
                      bar('gdp', 50, dGDP, '#4ade80', '#f87171'),
                      bar('inflation', 150, dInflation, '#facc15', '#22d3ee'),
                      bar('unemployment', 250, dUnemployment, '#f87171', '#4ade80')
                    ];
                  })(),
                  React.createElement('text', { x: 4, y: 8, fill: '#475569', fontSize: 8 }, 'up'),
                  React.createElement('text', { x: 4, y: 118, fill: '#475569', fontSize: 8 }, 'down')
                ),
                React.createElement('div', { className: 'grid grid-cols-2 gap-2 mb-2' },
                  React.createElement('label', { className: 'text-[10px]' },
                    React.createElement('div', { className: 'flex justify-between mb-0.5' }, React.createElement('span', null, t('stem.economicslab.tax_cut', 'Tax cut (%)')), React.createElement('span', { className: 'font-mono font-bold', style: { color: sm.color } }, iq.taxCut.toFixed(1))),
                    React.createElement('input', { type: 'range', 'aria-label': t('stem.economicslab.tax_cut_lever', 'Tax cut, percent'), 'aria-valuetext': iq.taxCut.toFixed(1) + '%', min: -5, max: 5, step: 0.5, value: iq.taxCut, onChange: function(e) { setKey('taxCut', parseFloat(e.target.value)); }, className: 'w-full' })
                  ),
                  React.createElement('label', { className: 'text-[10px]' },
                    React.createElement('div', { className: 'flex justify-between mb-0.5' }, React.createElement('span', null, t('stem.economicslab.govt_spending', 'Govt spending (%)')), React.createElement('span', { className: 'font-mono font-bold', style: { color: sm.color } }, iq.govSpend.toFixed(1))),
                    React.createElement('input', { type: 'range', 'aria-label': t('stem.economicslab.govt_spending_lever', 'Government spending, percent'), 'aria-valuetext': iq.govSpend.toFixed(1) + '%', min: -5, max: 5, step: 0.5, value: iq.govSpend, onChange: function(e) { setKey('govSpend', parseFloat(e.target.value)); }, className: 'w-full' })
                  ),
                  React.createElement('label', { className: 'text-[10px]' },
                    React.createElement('div', { className: 'flex justify-between mb-0.5' }, React.createElement('span', null, t('stem.economicslab.interest_rate_2', 'Interest rate \u0394')), React.createElement('span', { className: 'font-mono font-bold', style: { color: sm.color } }, iq.rateChange.toFixed(1) + 'pp')),
                    React.createElement('input', { type: 'range', 'aria-label': t('stem.economicslab.interest_rate_lever', 'Interest rate change'), 'aria-valuetext': iq.rateChange.toFixed(2) + ' percentage points', min: -3, max: 3, step: 0.25, value: iq.rateChange, onChange: function(e) { setKey('rateChange', parseFloat(e.target.value)); }, className: 'w-full' })
                  ),
                  React.createElement('label', { className: 'text-[10px]' },
                    React.createElement('div', { className: 'flex justify-between mb-0.5' }, React.createElement('span', null, t('stem.economicslab.tariff', 'Tariff (%)')), React.createElement('span', { className: 'font-mono font-bold', style: { color: sm.color } }, iq.tariff.toFixed(1))),
                    React.createElement('input', { type: 'range', 'aria-label': t('stem.economicslab.tariff_lever', 'Tariff, percent'), 'aria-valuetext': iq.tariff.toFixed(1) + '%', min: 0, max: 25, step: 1, value: iq.tariff, onChange: function(e) { setKey('tariff', parseFloat(e.target.value)); }, className: 'w-full' })
                  )
                ),
                React.createElement('div', { className: 'flex gap-2 mb-2' },
                  React.createElement('button', { onClick: function() {
                    var t = new Date().toISOString().slice(11, 19);
                    setIQ({ log: iq.log.concat([{ t: t, tx: iq.taxCut, sp: iq.govSpend, r: iq.rateChange, tr: iq.tariff, gdp: dGDP.toFixed(2), inf: dInflation.toFixed(2), state: sm.label }]) });
                  }, className: 'flex-1 px-2 py-1 rounded text-[10px] font-bold', style: { background: sm.bg, color: sm.color, border: '1px solid ' + sm.border, cursor: 'pointer' } }, t('stem.economicslab.log_this_policy_mix', '\uD83D\uDCCB Log this policy mix')),
                  React.createElement('button', { onClick: function() { setIQ({ taxCut: 0, govSpend: 0, rateChange: 0, tariff: 0 }); }, className: 'px-2 py-1 rounded text-[10px]', style: { background: '#0a0a1a', color: '#94a3b8', border: '1px solid #1e293b', cursor: 'pointer' } }, t('stem.economicslab.reset', 'Reset'))
                ),
                iq.log.length > 0 && React.createElement('div', { className: 'p-1.5 rounded text-[9px] font-mono mb-2', style: { background: '#0a0a1a', maxHeight: 70, overflow: 'auto', border: '1px solid #1e293b' } },
                  iq.log.slice(-5).map(function(e, i) { return React.createElement('div', { key: i }, e.t + '  ' + e.state + ' \u00B7 tx' + e.tx + ' sp' + e.sp + ' r' + e.r + ' tar' + e.tr + ' \u2192 gdp' + e.gdp + ' inf' + e.inf); })
                ),
                React.createElement('label', { className: 'block text-[10px] font-bold opacity-85 mb-1' }, t('stem.economicslab.your_hypothesis_which_lever_has_the_mo', 'Your hypothesis (which lever has the most disagreement among economists in real life? Why?)')),
                React.createElement('textarea', { value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: t('stem.economicslab.e_g_tariffs_hit_prices_fast_but_the_gd', 'e.g., tariffs hit prices fast but the GDP effect depends on retaliation...'), className: 'w-full p-1.5 rounded text-[10px] mb-2', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
                !iq.stuckRevealed && React.createElement('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded text-[10px] font-bold mb-2', style: { background: '#0a0a1a', color: sm.color, border: '1px solid #1e293b', cursor: 'pointer' } }, t('stem.economicslab.i_m_stuck_show_open_questions', "\uD83E\uDD14 I'm stuck \u2014 show open questions")),
                iq.stuckRevealed && React.createElement('div', { className: 'p-2 rounded text-[10px] mb-2', style: { background: '#0a0a1a', border: '1px dashed ' + sm.border, lineHeight: 1.5 } },
                  React.createElement('div', { className: 'font-bold mb-1', style: { color: sm.color } }, t('stem.economicslab.open_questions_no_answer_key', 'Open questions (no answer key)')),
                  React.createElement('ul', { className: 'pl-4 m-0' },
                    React.createElement('li', null, t('stem.economicslab.what_combination_produces_stagflation_', 'What combination produces "stagflation"? Why was it so politically painful in the 1970s?')),
                    React.createElement('li', null, t('stem.economicslab.tax_cuts_and_govt_spending_both_stimul', 'Tax cuts and govt spending both stimulate GDP. Which generates more inflation per dollar of stimulus? Why?')),
                    React.createElement('li', null, t('stem.economicslab.when_would_a_central_bank_deliberately', 'When would a central bank deliberately CAUSE a recession? (Volcker 1979\u201382.)')),
                    React.createElement('li', null, t('stem.economicslab.do_tariffs_help_domestic_workers_in_th', 'Do tariffs help domestic workers in the long run, or do they raise prices for everyone? Both? Trade-off where?')),
                    React.createElement('li', null, t('stem.economicslab.this_widget_hard_codes_textbook_keynes', 'This widget hard-codes textbook Keynesian signs. Which signs would FLIP under supply-side economics? Under MMT? Under new-classical (rational expectations)? Where does the Keynesian model give the wrong sign in real-world data?'))
                  )
                ),
                React.createElement('label', { className: 'flex items-center gap-2 text-[10px] font-bold cursor-pointer mb-1' },
                  React.createElement('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
                  React.createElement('span', null, t('stem.economicslab.i_can_explain_why_this_policy_mix_yiel', 'I can explain why this policy mix yields this macroeconomic state.'))
                ),
                iq.understood && React.createElement('textarea', { value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: t('stem.economicslab.explain_in_your_own_words', 'Explain in your own words...'), className: 'w-full p-1.5 rounded text-[10px] mb-1', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
                React.createElement('p', { className: 'm-0 text-[9px] italic opacity-60' }, t('stem.economicslab.inquiry_widget_no_score_no_reveal_no_a', 'Inquiry widget \u2014 no score, no reveal, no answer dump. Coefficients are pedagogical heuristics, NOT a real macro model; real responses depend on monetary regime, slack, expectations, foreign trade. Macro is contested \u2014 economists disagree on signs and magnitudes.'))
              );
            })()

          );
      })();
    }
  });


})();

} // end dedup guard
