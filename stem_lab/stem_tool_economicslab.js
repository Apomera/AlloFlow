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
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
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
      '.theme-dark .economicslab-tool-shell{background:#0f172a;border-radius:12px;padding:12px;}',
      '.economicslab-tool-shell .text-amber-600{color:#b45309;}',
      '.economicslab-tool-shell .text-emerald-600{color:#047857;}',
      '.economicslab-tool-shell .text-orange-600{color:#c2410c;}',
      '.theme-dark .economicslab-tool-shell .text-blue-800,.theme-dark .economicslab-tool-shell .text-blue-700,.theme-dark .economicslab-tool-shell .text-blue-600,.theme-dark .economicslab-tool-shell .text-sky-800,.theme-dark .economicslab-tool-shell .text-sky-700,.theme-dark .economicslab-tool-shell .text-sky-600,.theme-dark .economicslab-tool-shell .text-cyan-800,.theme-dark .economicslab-tool-shell .text-cyan-700,.theme-dark .economicslab-tool-shell .text-cyan-600{color:#7dd3fc!important;}',
      '.theme-dark .economicslab-tool-shell .text-green-800,.theme-dark .economicslab-tool-shell .text-green-800,.theme-dark .economicslab-tool-shell .text-green-800,.theme-dark .economicslab-tool-shell .text-emerald-800,.theme-dark .economicslab-tool-shell .text-emerald-700,.theme-dark .economicslab-tool-shell .text-emerald-600{color:#86efac!important;}',
      '.theme-dark .economicslab-tool-shell .text-amber-800,.theme-dark .economicslab-tool-shell .text-amber-800,.theme-dark .economicslab-tool-shell .text-amber-600,.theme-dark .economicslab-tool-shell .text-orange-800,.theme-dark .economicslab-tool-shell .text-orange-700,.theme-dark .economicslab-tool-shell .text-orange-600{color:#fcd34d!important;}',
      '.theme-dark .economicslab-tool-shell .text-red-800,.theme-dark .economicslab-tool-shell .text-red-700,.theme-dark .economicslab-tool-shell .text-red-600,.theme-dark .economicslab-tool-shell .text-rose-800,.theme-dark .economicslab-tool-shell .text-rose-700,.theme-dark .economicslab-tool-shell .text-rose-600{color:#fda4af!important;}',
      '.theme-dark .economicslab-tool-shell .text-purple-800,.theme-dark .economicslab-tool-shell .text-purple-700,.theme-dark .economicslab-tool-shell .text-purple-600,.theme-dark .economicslab-tool-shell .text-violet-800,.theme-dark .economicslab-tool-shell .text-violet-700,.theme-dark .economicslab-tool-shell .text-violet-600,.theme-dark .economicslab-tool-shell .text-indigo-800,.theme-dark .economicslab-tool-shell .text-indigo-700,.theme-dark .economicslab-tool-shell .text-indigo-600{color:#c4b5fd!important;}',
      '.theme-contrast .economicslab-tool-shell *{box-shadow:none!important;text-shadow:none!important;}',
      '.theme-contrast .economicslab-tool-shell button:not([aria-pressed="true"]):not([aria-selected="true"]){background:var(--eco-button)!important;color:var(--eco-button-text)!important;border-color:var(--eco-button-border)!important;}',
      '.theme-contrast .economicslab-tool-shell [role="tab"][aria-selected="true"]{outline:2px solid var(--eco-text);outline-offset:-2px;}',
      '.theme-contrast .economicslab-tool-shell .text-blue-800,.theme-contrast .economicslab-tool-shell .text-blue-700,.theme-contrast .economicslab-tool-shell .text-blue-600,.theme-contrast .economicslab-tool-shell .text-sky-800,.theme-contrast .economicslab-tool-shell .text-sky-700,.theme-contrast .economicslab-tool-shell .text-sky-600,.theme-contrast .economicslab-tool-shell .text-cyan-800,.theme-contrast .economicslab-tool-shell .text-cyan-700,.theme-contrast .economicslab-tool-shell .text-cyan-600,.theme-contrast .economicslab-tool-shell .text-green-800,.theme-contrast .economicslab-tool-shell .text-green-800,.theme-contrast .economicslab-tool-shell .text-green-800,.theme-contrast .economicslab-tool-shell .text-emerald-800,.theme-contrast .economicslab-tool-shell .text-emerald-700,.theme-contrast .economicslab-tool-shell .text-emerald-600,.theme-contrast .economicslab-tool-shell .text-amber-800,.theme-contrast .economicslab-tool-shell .text-amber-800,.theme-contrast .economicslab-tool-shell .text-amber-600,.theme-contrast .economicslab-tool-shell .text-red-800,.theme-contrast .economicslab-tool-shell .text-red-700,.theme-contrast .economicslab-tool-shell .text-red-600,.theme-contrast .economicslab-tool-shell .text-rose-800,.theme-contrast .economicslab-tool-shell .text-rose-700,.theme-contrast .economicslab-tool-shell .text-rose-600,.theme-contrast .economicslab-tool-shell .text-purple-800,.theme-contrast .economicslab-tool-shell .text-purple-700,.theme-contrast .economicslab-tool-shell .text-purple-600,.theme-contrast .economicslab-tool-shell .text-violet-800,.theme-contrast .economicslab-tool-shell .text-violet-700,.theme-contrast .economicslab-tool-shell .text-violet-600,.theme-contrast .economicslab-tool-shell .text-indigo-800,.theme-contrast .economicslab-tool-shell .text-indigo-700,.theme-contrast .economicslab-tool-shell .text-indigo-600,.theme-contrast .economicslab-tool-shell .text-pink-800,.theme-contrast .economicslab-tool-shell .text-pink-700,.theme-contrast .economicslab-tool-shell .text-pink-600,.theme-contrast .economicslab-tool-shell .text-fuchsia-800,.theme-contrast .economicslab-tool-shell .text-fuchsia-700{color:var(--eco-text)!important;}',
      '.theme-contrast .economicslab-tool-shell .border-blue-200,.theme-contrast .economicslab-tool-shell .border-indigo-200,.theme-contrast .economicslab-tool-shell .border-emerald-200,.theme-contrast .economicslab-tool-shell .border-green-200,.theme-contrast .economicslab-tool-shell .border-amber-200,.theme-contrast .economicslab-tool-shell .border-red-200,.theme-contrast .economicslab-tool-shell .border-rose-200,.theme-contrast .economicslab-tool-shell .border-violet-200,.theme-contrast .economicslab-tool-shell .border-purple-200,.theme-contrast .economicslab-tool-shell .border-cyan-200,.theme-contrast .economicslab-tool-shell .border-sky-200{border-color:var(--eco-border)!important;}',
      '.theme-dark .economicslab-tool-shell .text-pink-600,.theme-dark .economicslab-tool-shell .text-pink-700,.theme-dark .economicslab-tool-shell .text-pink-800{color:#f9a8d4!important;}',
      '.theme-dark .economicslab-tool-shell .bg-teal-50,.theme-dark .economicslab-tool-shell .bg-fuchsia-50{background:var(--eco-panel)!important;}',
      '.theme-dark .economicslab-tool-shell .bg-teal-100,.theme-dark .economicslab-tool-shell .bg-orange-100,.theme-dark .economicslab-tool-shell .bg-sky-200,.theme-dark .economicslab-tool-shell .bg-slate-200{background:var(--eco-deeper)!important;}',
      '.theme-dark .economicslab-tool-shell .text-amber-900,.theme-dark .economicslab-tool-shell .text-amber-700,.theme-dark .economicslab-tool-shell .text-orange-900{color:#fcd34d!important;}',
      '.theme-dark .economicslab-tool-shell .text-green-900,.theme-dark .economicslab-tool-shell .text-green-700,.theme-dark .economicslab-tool-shell .text-emerald-900,.theme-dark .economicslab-tool-shell .text-lime-900{color:#86efac!important;}',
      '.theme-dark .economicslab-tool-shell .text-teal-950,.theme-dark .economicslab-tool-shell .text-teal-900,.theme-dark .economicslab-tool-shell .text-teal-800,.theme-dark .economicslab-tool-shell .text-teal-700,.theme-dark .economicslab-tool-shell .text-cyan-900{color:#5eead4!important;}',
      '.theme-dark .economicslab-tool-shell .text-sky-900,.theme-dark .economicslab-tool-shell .text-blue-900{color:#93c5fd!important;}',
      '.theme-dark .economicslab-tool-shell .text-indigo-900,.theme-dark .economicslab-tool-shell .text-violet-900,.theme-dark .economicslab-tool-shell .text-purple-900,.theme-dark .economicslab-tool-shell .text-fuchsia-900{color:#c4b5fd!important;}',
      '.theme-dark .economicslab-tool-shell .text-red-900,.theme-dark .economicslab-tool-shell .text-rose-900{color:#fda4af!important;}',
      '.theme-dark .economicslab-tool-shell .text-slate-900,.theme-dark .economicslab-tool-shell .text-slate-950{color:var(--eco-text)!important;}',
    ].join('');
    document.head.appendChild(st);
  })();


  // ── Audio (auto-injected) ──
  var _ecoAC = null;
  function getEcoAC() { if (!_ecoAC) { try { _ecoAC = (window.StemLab && window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()); } catch(e) {} } if (_ecoAC && _ecoAC.state === "suspended") { try { _ecoAC.resume(); } catch(e) {} } return _ecoAC; }
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


  // ── Offline engines + built-in decks ──
  // The Life Sim, Stock Market and Business Sim used to need callGemini for
  // every step. The host passes callGemini: null to QR-joined students, so
  // those tabs dead-ended. Everything below runs locally; the AI is an
  // optional layer on top. Pure functions with an injectable rng, exposed as
  // the tool's _engine so tests can drive the same code the UI runs.
  var ECON_ENGINE = (function () {
    function num(v, def) { return (typeof v === 'number' && isFinite(v)) ? v : def; }
    function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
    function rngOf(rng) { return typeof rng === 'function' ? rng : Math.random; }

    // ── Personal finance ──
    // Illustrative single-filer US taxes (2024): Social Security 6.2% up to its
    // $168,600 wage cap plus Medicare 1.45% on all wages, federal brackets above
    // the $14,600 standard deduction, and a flat ~4% state tax. Brackets are
    // MARGINAL, so a raise can never lower take-home pay.
    var FED_BRACKETS = [[11600, 0.10], [47150, 0.12], [100525, 0.22], [191950, 0.24], [243725, 0.32], [609350, 0.35], [Infinity, 0.37]];
    var STD_DEDUCTION = 14600;
    var SS_WAGE_CAP = 168600;
    function pfTax(salary) {
      var s = Math.max(0, num(salary, 0));
      var taxable = Math.max(0, s - STD_DEDUCTION);
      var fed = 0, lo = 0, marginal = 0;
      for (var i = 0; i < FED_BRACKETS.length; i++) {
        var hi = FED_BRACKETS[i][0], r = FED_BRACKETS[i][1];
        if (taxable > lo) { fed += (Math.min(taxable, hi) - lo) * r; marginal = r; }
        lo = hi;
      }
      var payroll = Math.min(s, SS_WAGE_CAP) * 0.062 + s * 0.0145, state = taxable * 0.04;
      var total = Math.round(payroll + fed + state);
      return { payroll: Math.round(payroll), federal: Math.round(fed), state: Math.round(state), total: total, rate: s > 0 ? total / s : 0, marginal: marginal + (s < SS_WAGE_CAP ? 0.0765 : 0.0145) + (taxable > 0 ? 0.04 : 0) };
    }

    function has(obj, k) { return typeof k === 'string' && Object.prototype.hasOwnProperty.call(obj, k); }

    var PF_HOUSING = {
      renting: { monthly: 1000, equityShare: 0 },
      owning: { monthly: 1800, equityShare: 0.3 },
      frugal: { monthly: 500, equityShare: 0 }
    };
    var PF_DOWN_PAYMENT = 20000;
    var PF_SELL_COST = 0.06;
    var PF_INSURANCE_MONTHLY = 100;
    // Utilities, phone, clothing and personal care: real costs a budget that
    // lists only rent, food and transport quietly leaves out.
    var PF_OTHER_MONTHLY = 300;
    // Two kinds of debt, as in real life: installment loans (car, school,
    // medical payment plans) near 7%, and credit-card balances near 22%.
    var PF_LOAN_APR = 0.07;
    var PF_CARD_APR = 0.22;
    // Yearly returns use the same long-run assumptions as the Investing
    // Deep-Dives (stocks ~10% ± 17%, bonds ~4% ± 6%), drawn uniformly with that
    // spread so a centered roll is the average year. Speculative has fat tails
    // and a LOWER average than plain stocks.
    var PF_ASSETS = {
      Conservative: { mean: 0.04, sd: 0.06, stock: 0 },
      Balanced: { mean: 0.07, sd: 0.11, stock: 0.6 },
      Aggressive: { mean: 0.10, sd: 0.17, stock: 1 },
      Speculative: { mean: 0.03, sd: 0.45, stock: 1.6 }
    };
    function pfYearReturn(type, rng) {
      var u = rng();
      if (type === 'Speculative') {
        if (u < 0.15) return -0.6;
        if (u >= 0.88) return 1.0;
        return -0.2 + 0.4 * (u - 0.15) / 0.73;
      }
      var a = PF_ASSETS[has(PF_ASSETS, type) ? type : 'Balanced'];
      return a.mean + a.sd * Math.sqrt(3) * (2 * u - 1);
    }
    // Yearly minimum payments: a loan pays down ~15% of its balance a year; a
    // card's minimum is about 1% of the balance a month plus the interest.
    function pfMinLoanYr(loan) { return loan > 0 ? Math.min(loan * (1 + PF_LOAN_APR), Math.max(300, loan * 0.15)) : 0; }
    function pfMinCardYr(card) { return card > 0 ? Math.min(card * (1 + PF_CARD_APR), Math.max(300, card * (0.12 + PF_CARD_APR))) : 0; }
    // Extra payments go to the card first: highest interest rate first (the
    // "avalanche" method) saves the most.
    function pfDebtPayments(loan, card, extraYr) {
      var loanDue = loan * (1 + PF_LOAN_APR), cardDue = card * (1 + PF_CARD_APR);
      var minL = pfMinLoanYr(loan), minC = pfMinCardYr(card);
      var extra = (loan > 0 || card > 0) ? Math.max(0, extraYr) : 0;
      var payC = Math.min(cardDue, minC + extra);
      var left = Math.max(0, extra - (payC - minC));
      var payL = Math.min(loanDue, minL + left);
      return { loan: Math.round(payL), card: Math.round(payC) };
    }

    function pfState(s) {
      s = s || {};
      return {
        age: Math.round(clamp(num(s.age, 22), 16, 120)),
        cash: num(s.cash, 2000),
        debt: Math.max(0, num(s.debt, 0)),
        card: Math.max(0, num(s.card, 0)),
        salary: Math.max(0, num(s.salary, 35000)),
        happiness: clamp(num(s.happiness, 70), 0, 100),
        credit: clamp(num(s.credit, 650), 300, 850),
        invested: Math.max(0, num(s.invested, 0)),
        equity: Math.max(0, num(s.equity, 0)),
        carValue: Math.max(0, num(s.carValue, 0)),
        carDep: clamp(num(s.carDep, 0.15), 0, 0.5),
        housing: has(PF_HOUSING, s.housing) ? s.housing : 'renting',
        insurance: s.insurance === true,
        investPct: clamp(num(s.investPct, 0), 0, 50),
        investType: has(PF_ASSETS, s.investType) ? s.investType : null,
        food: clamp(num(s.food, 400), 0, 5000),
        transport: clamp(num(s.transport, 300), 0, 5000),
        fun: clamp(num(s.fun, 150), 0, 5000),
        extraDebtPay: clamp(num(s.extraDebtPay, 0), 0, 10000),
        matchPct: clamp(num(s.matchPct, 0), 0, 10),
        rebound: s.rebound === true
      };
    }

    // One month of money, from the same numbers the yearly step uses.
    function pfBudget(raw) {
      var s = pfState(raw);
      var tx = pfTax(s.salary);
      var gross = s.salary / 12, taxes = tx.total / 12;
      var housing = PF_HOUSING[s.housing].monthly;
      var insurance = s.insurance ? PF_INSURANCE_MONTHLY : 0;
      var invest = s.salary * s.investPct / 100 / 12;
      var pays = pfDebtPayments(s.debt, s.card, s.extraDebtPay * 12);
      var debtPay = (pays.loan + pays.card) / 12;
      var takeHome = gross - taxes;
      var spend = housing + s.food + s.transport + s.fun + PF_OTHER_MONTHLY + insurance + invest + debtPay;
      return { gross: gross, taxes: taxes, taxRate: tx.rate, takeHome: takeHome, housing: housing, food: s.food, transport: s.transport, fun: s.fun, other: PF_OTHER_MONTHLY, insurance: insurance, invest: invest, debtPay: debtPay, spend: spend, leftover: takeHome - spend, essentials: housing + s.food + s.transport + PF_OTHER_MONTHLY + insurance };
    }

    // Moving home. Buying needs a down payment (it becomes your first equity);
    // selling returns your equity minus ~6% in selling costs.
    function pfSwitchHousing(raw, to) {
      var s = pfState(raw);
      if (!has(PF_HOUSING, to) || to === s.housing) return { ok: false, reason: 'same' };
      var cash = s.cash, equity = s.equity, sold = 0;
      if (s.housing === 'owning') { sold = Math.round(equity * (1 - PF_SELL_COST)); cash += sold; equity = 0; }
      if (to === 'owning') {
        if (cash < PF_DOWN_PAYMENT) return { ok: false, reason: 'down', need: PF_DOWN_PAYMENT, have: cash };
        cash -= PF_DOWN_PAYMENT; equity += PF_DOWN_PAYMENT;
      }
      return { ok: true, patch: { housing: to, cash: Math.round(cash), equity: Math.round(equity) }, sold: sold };
    }

    // One simulated year. Event effects land first, then the year's paychecks,
    // bills, debt and investing, all in one pass. A shortfall is not left as
    // negative cash: it goes on the credit card, which is what actually happens
    // when spending outruns income.
    function lifeYear(raw, eff, rng) {
      rng = rngOf(rng);
      eff = (eff && typeof eff === 'object') ? eff : {};
      var s = pfState(raw);
      var startCash = s.cash;
      var salary = s.salary;
      if (typeof eff.salary === 'number' && isFinite(eff.salary)) salary += eff.salary;
      if (typeof eff.salaryPct === 'number' && isFinite(eff.salaryPct)) salary *= 1 + eff.salaryPct / 100;
      salary = Math.max(0, Math.round(salary));
      // Insured players pay the deductible / out-of-pocket max, not the bill.
      var pick = function (key) { var ins = key + 'IfInsured'; return (s.insurance && typeof eff[ins] === 'number' && isFinite(eff[ins])) ? eff[ins] : num(eff[key], 0); };
      // `debt` is the legacy name for an installment loan.
      var loan = Math.max(0, s.debt + pick('loan') + pick('debt'));
      var card = Math.max(0, s.card + pick('card'));
      var invested = s.invested;
      var eventCash = pick('cash');
      var gambleWon = null;
      if (eff.gamble && typeof eff.gamble === 'object') {
        var stake = Math.max(0, num(eff.gamble.stake, 0));
        gambleWon = rng() < clamp(num(eff.gamble.p, 0.5), 0, 1);
        eventCash += -stake + stake * Math.max(0, num(gambleWon ? eff.gamble.win : eff.gamble.lose, 0));
      }
      if (typeof eff.windfallToDebt === 'number' && eff.windfallToDebt > 0) {
        var w = eff.windfallToDebt;
        var toCard = Math.min(card, w); card -= toCard; w -= toCard;
        var toLoan = Math.min(loan, w); loan -= toLoan; w -= toLoan;
        eventCash += w;
      }
      var assetType = has(PF_ASSETS, s.investType) ? s.investType : 'Balanced';
      var stockShare = PF_ASSETS[assetType].stock;
      // A market crash hits in proportion to how much of the portfolio is in
      // stocks, replaces this year's normal return, and is followed next year
      // by a rebound, which only money still invested gets.
      var crashed = eff.marketCrash === true;
      var crashLoss = 0;
      if (crashed) { crashLoss = Math.round(invested * 0.25 * stockShare); invested = Math.max(0, invested - crashLoss); }
      var sold = 0;
      if (eff.sellAll === true) { sold = Math.round(invested); eventCash += sold; invested = 0; }
      if (typeof eff.invested === 'number' && isFinite(eff.invested)) invested = Math.max(0, invested + eff.invested);
      var carValue = s.carValue, carDep = s.carDep;
      if (eff.carBuy && typeof eff.carBuy === 'object') { carValue = Math.max(0, num(eff.carBuy.value, 0)); carDep = clamp(num(eff.carBuy.dep, 0.15), 0, 0.5); }
      if (eff.carSell === true) carValue = 0;
      var housing = has(PF_HOUSING, eff.housing) ? eff.housing : s.housing;
      var insurance = (eff.insurance === true || eff.insurance === false) ? eff.insurance : s.insurance;
      var food = clamp(s.food + num(eff.food, 0), 0, 5000);
      var transport = clamp(s.transport + num(eff.transport, 0), 0, 5000);
      var fun = clamp(s.fun + num(eff.fun, 0), 0, 5000);
      var matchPct = (typeof eff.matchPct === 'number') ? clamp(eff.matchPct, 0, 10) : s.matchPct;
      // Months without pay (e.g. a job search) shrink this year's paychecks.
      var paidShare = 1 - clamp(num(eff.unpaidMonths, 0), 0, 12) / 12;

      var earned = Math.round(salary * paidShare);
      var tx = pfTax(earned);
      var takeHome = earned - tx.total;
      var housingYr = PF_HOUSING[housing].monthly * 12;
      var livingYr = (food + transport + fun) * 12;
      var otherYr = PF_OTHER_MONTHLY * 12;
      var insuranceYr = insurance ? PF_INSURANCE_MONTHLY * 12 : 0;
      var investYr = eff.sellAll === true ? 0 : Math.round(earned * s.investPct / 100);
      var matchYr = Math.round(earned * Math.min(s.investPct, matchPct) / 100);

      var loanInterest = Math.round(loan * PF_LOAN_APR);
      var cardInterest = Math.round(card * PF_CARD_APR);
      var debtInterest = loanInterest + cardInterest;
      var pays = pfDebtPayments(loan, card, s.extraDebtPay * 12);
      var debtPaid = pays.loan + pays.card;

      var rate = crashed ? 0 : (invested > 0 || investYr > 0 ? pfYearReturn(assetType, rng) : 0);
      if (s.rebound && !crashed) rate += 0.12 * stockShare;
      var growth = Math.round(invested * rate);
      invested = Math.max(0, invested + growth + investYr + matchYr);

      var cash = startCash + eventCash + takeHome - housingYr - livingYr - otherYr - insuranceYr - investYr - debtPaid;
      var shortfall = 0;
      if (cash < 0) { shortfall = Math.round(-cash); cash = 0; }
      cash = Math.round(cash);
      var loanAfter = Math.max(0, loan + loanInterest - pays.loan);
      var cardAfter = Math.max(0, card + cardInterest - pays.card + shortfall);
      var equity = s.equity + Math.round(housingYr * PF_HOUSING[housing].equityShare);
      var carDrop = Math.round(carValue * carDep);
      carValue = Math.max(0, carValue - carDrop);

      var funMood = clamp(Math.round((fun - 150) / 100), -2, 3);
      var happiness = clamp(Math.round(s.happiness + num(eff.happiness, 0) + funMood - (shortfall > 0 ? 3 : 0)), 0, 100);
      // Credit: a year of on-time payments helps whether or not you owe
      // anything (carrying a balance is NOT required to build credit); a card
      // balance above ~30% of a typical limit (here 30% of pay) hurts; missed
      // payments (a shortfall) hurt most.
      var utilization = cardAfter / Math.max(1000, 0.3 * salary);
      var utilHit = utilization > 0.3 ? Math.round(10 * Math.min(3, utilization)) : 0;
      var creditMove = num(eff.credit, 0) + (shortfall === 0 ? 6 : 0) - utilHit - (shortfall > 0 ? 25 : 0);
      var credit = Math.round(clamp(s.credit + creditMove, 300, 850));

      var nextSalary = Math.round((salary + Math.max(-1e6, Math.min(1e6, num(eff.salaryNext, 0)))) * 1.02);
      var state = {
        age: s.age + 1, cash: cash, debt: loanAfter, card: cardAfter, salary: Math.max(0, nextSalary), happiness: happiness, credit: credit,
        invested: invested, equity: equity, carValue: carValue, carDep: carDep, housing: housing, insurance: insurance, food: food, transport: transport, fun: fun, matchPct: matchPct,
        rebound: crashed && invested > 0
      };
      if (typeof eff.career === 'string' && eff.career) state.career = eff.career.slice(0, 60);
      var ledger = {
        takeHome: takeHome, taxes: tx.total, taxRate: tx.rate, eventCash: eventCash, housing: housingYr, living: livingYr, other: otherYr,
        insurance: insuranceYr, invested: investYr, match: matchYr, growth: growth, returnRate: rate, crashLoss: crashLoss, sold: sold,
        debtInterest: debtInterest, loanInterest: loanInterest, cardInterest: cardInterest, debtPaid: debtPaid,
        shortfall: shortfall, carDrop: carDrop, unpaid: salary - earned, raise: state.salary - salary, gambleWon: gambleWon, funMood: funMood, creditMove: creditMove, net: cash - startCash
      };
      return { state: state, ledger: ledger };
    }

    // Built-in life events. Effects use the keys lifeYear understands; money
    // figures are rough US ballparks for someone starting out.
    var LIFE_EVENTS = [
      { id: 'car_repair', minAge: 18, maxAge: 80, emoji: '🚗', title: 'Transmission trouble', description: 'Your car’s transmission fails on the way to work. The repair quote is $2,400.', lesson: 'An emergency fund turns a crisis into an inconvenience. Without one, surprise bills become credit-card debt at around 22% interest.', choices: [
        { label: 'Pay the repair from savings', effect: { cash: -2400, happiness: -2 } },
        { label: 'Put it on a credit card', effect: { card: 2400 } },
        { label: 'Sell the car and switch to bus + bike', effect: { cash: 1500, carSell: true, transport: -150, happiness: -6 } }
      ] },
      { id: 'job_offer', minAge: 22, maxAge: 64, emoji: '💼', title: 'A competing job offer', description: 'Another company offers you 12% more pay, but the commute is 40 minutes longer each way.', lesson: 'Every choice has an opportunity cost. Extra pay competes with time, commuting costs and happiness.', choices: [
        { label: 'Take the new job', effect: { salaryPct: 12, transport: 60, happiness: -3, career: 'New employer' } },
        { label: 'Use the offer to negotiate a raise where you are', effect: { salaryPct: 6, happiness: 1 } },
        { label: 'Stay put — you like your team', effect: { happiness: 3 } }
      ] },
      { id: 'broken_wrist', minAge: 16, maxAge: 80, emoji: '🩹', title: 'Broken wrist', description: 'You break your wrist playing soccer. The ER visit and cast cost $3,800. With insurance you would owe only the $750 deductible.', lesson: 'Insurance trades a small, certain cost (the premium) for protection from a large, uncertain one. You still pay the deductible.', choices: [
        { label: 'Pay the bill now', effect: { cash: -3800, cashIfInsured: -750, happiness: -3 } },
        { label: 'Set up a payment plan (a loan)', effect: { loan: 3800, loanIfInsured: 750, happiness: -2 } }
      ] },
      { id: 'surgery', minAge: 18, maxAge: 90, emoji: '🏥', title: 'Emergency surgery', description: 'Appendicitis! Emergency surgery and two nights in the hospital cost $24,000. With insurance, you would pay only the $3,000 out-of-pocket maximum.', lesson: 'On average, people pay about as much in premiums as insurance pays out: insurers have to cover their costs. What insurance buys is protection from rare, ruinous bills like this one.', choices: [
        { label: 'Set up a hospital payment plan', effect: { loan: 24000, loanIfInsured: 3000, happiness: -6 } },
        { label: 'Negotiate the bill down, then use a payment plan', effect: { loan: 18000, loanIfInsured: 3000, happiness: -8 } }
      ] },
      { id: 'open_enrollment', minAge: 22, maxAge: 64, emoji: '🛡️', title: 'Open enrollment', description: 'Your employer’s health plan costs you $100 a month. It caps what a medical emergency can cost you.', lesson: 'Insurance is paying a known small cost to avoid an unknown large one. Most years you "lose" the premium; the year something big happens, it saves you.', choices: [
        { label: 'Enroll ($100/month)', effect: { insurance: true, happiness: 1 } },
        { label: 'Skip it and keep the $100', effect: { insurance: false } }
      ] },
      { id: 'tax_refund', minAge: 18, maxAge: 80, emoji: '🧾', title: 'Tax refund', description: 'You get a $1,200 tax refund. It is money you overpaid during the year, coming back.', lesson: 'A refund is an interest-free loan you gave the government. Putting it to work (saving, investing, paying debt) beats spending on autopilot.', choices: [
        { label: 'Invest it', effect: { invested: 1200 } },
        { label: 'Pay down debt (the rest goes to savings)', effect: { windfallToDebt: 1200 } },
        { label: 'Treat yourself', effect: { happiness: 5 } }
      ] },
      { id: 'certificate', minAge: 20, maxAge: 50, emoji: '🎓', title: 'Evening certificate program', description: 'A one-year certificate costs $4,000. People who finish it in your field earn about $5,000 more per year.', lesson: 'Education is an investment in human capital: a one-time cost that can raise income for decades. The payoff starts after you finish.', choices: [
        { label: 'Enroll and pay cash', effect: { cash: -4000, salaryNext: 5000, happiness: -4 } },
        { label: 'Enroll with a student loan', effect: { loan: 4000, salaryNext: 5000, happiness: -4 } },
        { label: 'Not now', effect: {} }
      ] },
      { id: 'layoff', minAge: 24, maxAge: 62, emoji: '📦', title: 'Laid off', description: 'Your company downsizes and your job is cut. You get $4,000 in severance either way.', lesson: 'Job loss is the most common financial emergency. Savings (and unemployment insurance) buy time to find a good fit instead of taking the first offer.', choices: [
        { label: 'Take the first offer right away (8% less pay)', effect: { cash: 4000, salaryPct: -8, happiness: -3 } },
        { label: 'Search 3 months for a better fit (+4% pay, no paychecks meanwhile)', effect: { cash: 4000, unpaidMonths: 3, salaryPct: 4, happiness: -6 } }
      ] },
      { id: 'wedding', minAge: 22, maxAge: 45, emoji: '💒', title: 'Destination wedding', description: 'Your best friend is getting married abroad. Flights and hotel will run about $1,800.', lesson: 'Big social costs are predictable. Saving a little each month for them (a sinking fund) keeps them off your credit card.', choices: [
        { label: 'Go and pay cash', effect: { cash: -1800, happiness: 7 } },
        { label: 'Go and charge it to your card', effect: { card: 1800, happiness: 7 } },
        { label: 'Send a gift and a video message', effect: { cash: -150, happiness: -3 } }
      ] },
      { id: 'coin_tip', minAge: 18, maxAge: 60, emoji: '🪙', title: 'A hot crypto tip', description: 'A coworker swears a new coin will "10x" and urges you to put in $2,000. You estimate a 1-in-4 chance it triples and a 3-in-4 chance it collapses to almost nothing.', lesson: 'Expected value: 25% × $6,000 + 75% × $200 = $1,650 for a $2,000 bet. Speculation can win, but on average this bet loses money.', choices: [
        { label: 'Put in $2,000', effect: { gamble: { stake: 2000, p: 0.25, win: 3, lose: 0.1 } } },
        { label: 'Pass', effect: {} }
      ] },
      { id: 'phone_smash', minAge: 14, maxAge: 80, emoji: '📱', title: 'Shattered phone', description: 'Your phone screen shatters. A new flagship costs $1,000, a repair costs $220, a good used phone costs $350.', lesson: 'Needs vs wants: the repair solves the need. Financing a want is how small purchases become lasting debt.', choices: [
        { label: 'Buy a new flagship on your card', effect: { card: 1000, happiness: 3 } },
        { label: 'Repair it', effect: { cash: -220 } },
        { label: 'Buy a used phone', effect: { cash: -350, happiness: 1 } }
      ] },
      { id: 'promotion', minAge: 25, maxAge: 62, emoji: '📈', title: 'Promotion offer', description: 'Your manager offers you a team-lead role: 15% more pay, more hours and more responsibility.', lesson: 'Compensation is more than salary: hours, stress and growth matter too. Raises also compound, because future raises build on them.', choices: [
        { label: 'Accept the promotion', effect: { salaryPct: 15, happiness: -2, career: 'Team lead' } },
        { label: 'Decline for now', effect: { happiness: 2 } }
      ] },
      { id: 'inheritance', minAge: 28, maxAge: 80, emoji: '✉️', title: 'An unexpected inheritance', description: 'A great-aunt leaves you $10,000.', lesson: 'Windfalls are easy to spend without noticing (mental accounting). Paying off high-interest debt is a guaranteed return.', choices: [
        { label: 'Invest all of it', effect: { invested: 10000 } },
        { label: 'Pay off debt first, bank the rest', effect: { windfallToDebt: 10000 } },
        { label: 'Spend $8,000 on a big trip and new stuff, bank $2,000', effect: { cash: 2000, happiness: 8 } }
      ] },
      { id: 'match', minAge: 22, maxAge: 55, emoji: '🤝', title: 'Employer retirement match', description: 'Your employer now matches 100% of what you invest, up to 5% of your pay.', lesson: 'An employer match is an instant 100% return. Contributing at least enough to get the full match is one of the best deals in personal finance.', choices: [
        { label: 'Sign up for the match', effect: { matchPct: 5, happiness: 1 } },
        { label: 'Maybe later', effect: {} }
      ] },
      { id: 'store_card', minAge: 18, maxAge: 45, emoji: '💳', title: 'Store credit card offer', description: 'You are buying $300 of things you need. The clerk offers 20% off today if you open the store’s card (29% APR).', lesson: 'APR is the yearly cost of carrying a balance. A card paid in full every month costs nothing; a carried balance erases any discount fast. Opening a new account can dip your score a little at first.', choices: [
        { label: 'Open it, take the $60 off, pay in full', effect: { cash: 60, credit: -5, happiness: 1 } },
        { label: 'Open it and also buy a $1,500 TV on it (20% off: $1,200)', effect: { cash: 60, card: 1200, credit: -10, happiness: 4 } },
        { label: 'No thanks', effect: {} }
      ] },
      { id: 'identity_theft', minAge: 18, maxAge: 80, emoji: '🕵️', title: 'Identity theft', description: 'Someone opened a card in your name and ran up $3,000 in charges.', lesson: 'Credit freezes are free, and you can check your credit reports for free every week. Fraud you report quickly is usually not your debt, but ignoring it lets it damage your credit.', choices: [
        { label: 'Freeze your credit (free) and dispute the charges', effect: { credit: -5, happiness: -4 } },
        { label: 'Ignore the collection letters', effect: { credit: -70, cash: -300, happiness: -3 } }
      ] },
      { id: 'side_hustle', minAge: 16, maxAge: 60, emoji: '🧑‍🏫', title: 'Weekend tutoring gig', description: 'A neighbor wants you to tutor on weekends: about $4,000 a year for 4 hours a week.', lesson: 'More income is one lever; spending less is the other. Extra work trades away free time, a real cost.', choices: [
        { label: 'Take the gig', effect: { salary: 4000, happiness: -3 } },
        { label: 'Protect your weekends', effect: { happiness: 2 } }
      ] },
      { id: 'market_crash', minAge: 20, maxAge: 85, requires: 'invested', emoji: '📉', title: 'Stock market crash', description: 'Stocks fall 25% and the news is full of panic. Your portfolio drops too: more if it holds more stocks.', lesson: 'Selling after a crash locks in the loss and misses the recovery. Historically, investors who held on through crashes came out ahead.', choices: [
        { label: 'Hold and keep investing', effect: { marketCrash: true, happiness: -3 } },
        { label: 'Sell everything to stop the pain', effect: { marketCrash: true, sellAll: true, happiness: 1 } },
        { label: 'Hold and buy $2,000 more while prices are low', effect: { marketCrash: true, cash: -2000, invested: 2000, happiness: -2 } }
      ] },
      { id: 'roof_leak', minAge: 22, maxAge: 85, requires: 'owning', emoji: '🏚️', title: 'The roof leaks', description: 'A storm damages your roof. A proper repair costs $6,000.', lesson: 'Homeowners should budget about 1–2% of the home’s value a year for maintenance. Renters pass that risk to the landlord.', choices: [
        { label: 'Pay for a proper repair', effect: { cash: -6000 } },
        { label: 'Borrow against the house (a loan)', effect: { loan: 6000 } },
        { label: 'Patch it cheaply and hope', effect: { cash: -1200, happiness: -4 } }
      ] },
      { id: 'roommate_leaves', minAge: 18, maxAge: 45, requires: 'frugal', emoji: '🛋️', title: 'Your roommate moves out', description: 'Your roommate is moving across the country. You can find a new one or get your own place.', lesson: 'Housing is usually the biggest line in a budget. Sharing it is one of the fastest ways to raise your savings rate.', choices: [
        { label: 'Find a new roommate', effect: { happiness: -2 } },
        { label: 'Get your own apartment ($1,000/month)', effect: { housing: 'renting', happiness: 4 } }
      ] },
      { id: 'adopt_dog', minAge: 18, maxAge: 75, emoji: '🐕', title: 'Adopt a dog?', description: 'A shelter dog steals your heart. Adoption is $300, then about $100 a month for food and vet care.', lesson: 'The total cost of ownership includes the ongoing costs, not just the price tag.', choices: [
        { label: 'Adopt', effect: { cash: -300, fun: 100, happiness: 9 } },
        { label: 'Volunteer at the shelter instead', effect: { happiness: 3 } }
      ] },
      { id: 'car_purchase', minAge: 18, maxAge: 50, emoji: '🚙', title: 'Your old car is dying', description: 'A new car costs $30,000 with a loan. A reliable 5-year-old car costs $12,000.', lesson: 'New cars lose about 20% of their value in the first year (depreciation). Buying used lets someone else pay for that drop. Watch the car’s value in your net worth.', choices: [
        { label: 'Buy new with a $30,000 loan', effect: { loan: 30000, carBuy: { value: 30000, dep: 0.2 }, happiness: 5 } },
        { label: 'Buy used: $4,000 down, $8,000 loan', effect: { cash: -4000, loan: 8000, carBuy: { value: 12000, dep: 0.1 }, happiness: 2 } },
        { label: 'Keep repairing the old one', effect: { cash: -1500, happiness: -2 } }
      ] },
      { id: 'review', minAge: 23, maxAge: 60, emoji: '🗣️', title: 'Annual review', description: 'Everyone gets the standard 2% raise this year. You learn that people in similar jobs earn about 10% more than you.', lesson: 'Negotiating pay compounds: a raise today raises every future raise and retirement contribution.', choices: [
        { label: 'Negotiate for more, with market data', effect: { salaryPct: 5, happiness: -1 } },
        { label: 'Take the standard raise', effect: {} }
      ] },
      { id: 'food_bank', minAge: 14, maxAge: 90, emoji: '🥫', title: 'The food bank asks for help', description: 'Your local food bank is short this winter and asks for $500 or a few Saturdays of help.', lesson: 'Money is a tool for what you value. Giving time or money is a real choice in a budget, not an afterthought.', choices: [
        { label: 'Donate $500', effect: { cash: -500, happiness: 5 } },
        { label: 'Volunteer your Saturdays', effect: { happiness: 4 } },
        { label: 'Not this year', effect: {} }
      ] },
      { id: 'inflation_spike', minAge: 18, maxAge: 90, emoji: '🛒', title: 'Prices jump', description: 'Inflation hits 7% this year. Your grocery and gas bills climb.', lesson: 'Inflation erodes purchasing power. If your pay rises more slowly than prices, your real income falls.', choices: [
        { label: 'Absorb it', effect: { food: 30, transport: 20 } },
        { label: 'Cut back on fun to make up for it', effect: { food: 30, transport: 20, fun: -50, happiness: -3 } },
        { label: 'Ask for a cost-of-living raise', effect: { food: 30, transport: 20, salaryPct: 4 } }
      ] }
    ];

    function lifeEventEligible(ev, s) {
      if (!ev || s.age < ev.minAge || s.age > ev.maxAge) return false;
      if (ev.requires === 'invested' && !(s.invested > 500)) return false;
      if (ev.requires === 'owning' && s.housing !== 'owning') return false;
      if (ev.requires === 'frugal' && s.housing !== 'frugal') return false;
      return true;
    }
    function pickLifeEvent(raw, recent, rng) {
      rng = rngOf(rng);
      var s = pfState(raw);
      var seen = Array.isArray(recent) ? recent : [];
      var pool = LIFE_EVENTS.filter(function (ev) { return lifeEventEligible(ev, s) && seen.indexOf(ev.id) === -1; });
      if (!pool.length) pool = LIFE_EVENTS.filter(function (ev) { return lifeEventEligible(ev, s); });
      if (!pool.length) pool = LIFE_EVENTS;
      return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
    }

    // AI events are data, not trusted code: clamp every effect to the ranges
    // the prompt asks for, and drop keys the engine does not know. AI "debt"
    // is treated as a credit-card balance, the usual way surprise costs land.
    function sanitizeAiLifeEffect(e) {
      e = (e && typeof e === 'object') ? e : {};
      var out = {};
      if (typeof e.cash === 'number' && isFinite(e.cash)) out.cash = clamp(Math.round(e.cash), -5000, 10000);
      if (typeof e.debt === 'number' && isFinite(e.debt)) out.card = clamp(Math.round(e.debt), -20000, 20000);
      if (typeof e.salary === 'number' && isFinite(e.salary)) out.salary = clamp(Math.round(e.salary), -5000, 15000);
      if (typeof e.happiness === 'number' && isFinite(e.happiness)) out.happiness = clamp(Math.round(e.happiness), -20, 20);
      if (typeof e.credit === 'number' && isFinite(e.credit)) out.credit = clamp(Math.round(e.credit), -50, 50);
      if (e.insurance === true || e.insurance === false) out.insurance = e.insurance;
      if (typeof e.career === 'string' && e.career.trim()) out.career = e.career.trim().slice(0, 60);
      return out;
    }

    // ── Supply & demand ──
    // Linear curves: Pd(q) = ad - md q, Ps(q) = as + ms q. Every S&D readout
    // (shading, scoreboard, summary) comes from this one function.
    function sdOutcome(p) {
      p = p || {};
      var md = clamp(num(p.dSlope, 0.8), 0.05, 10), ms = clamp(num(p.sSlope, 0.8), 0.05, 10);
      // A positive shift is an INCREASE: demand moves up/right, supply down/right.
      var ad = 90 + num(p.dShift, 0) * 5, as = 10 - num(p.sShift, 0) * 5;
      // T > 0 is a per-unit tax, T < 0 a per-unit subsidy.
      var T = clamp(num(p.tax, 0), -60, 60), C = Math.max(0, num(p.ceiling, 0)), F = Math.max(0, num(p.floor, 0));
      // X > 0 is an external COST per unit (pollution) that neither side pays;
      // X < 0 an external BENEFIT (vaccines, education) that neither side gets.
      var X = clamp(num(p.ext, 0), -60, 60);
      var qStar = Math.max(0, (ad - as) / (md + ms));
      var pStar = as + ms * qStar;
      var Qd = function (pr) { return Math.max(0, (ad - pr) / md); };
      var Qs = function (pr) { return Math.max(0, (pr - as) / ms); };
      // A monopolist faces the whole demand curve, so its marginal revenue is
      // ad - 2*md*q; it produces where that meets marginal cost (the supply
      // curve, plus any per-unit tax) and charges what buyers will pay.
      var mono = !!p.monopoly;
      var q = Math.max(0, (ad - as - T) / ((mono ? 2 : 1) * md + ms));
      var pc = ad - md * q, pp = pc - T, regime = T > 0 ? 'tax' : T < 0 ? 'subsidy' : mono ? 'monopoly' : 'free';
      var qPolicy = q;
      if (C > 0 && C < pc) { pc = C; pp = C - T; q = Math.min(Qd(pc), Qs(pp)); regime = 'ceiling'; }
      else if (F > 0 && F > pc) { pc = F; pp = F - T; q = Math.min(Qd(pc), Qs(pp)); regime = 'floor'; }
      var cs = Math.max(0, q * (ad - pc) - md * q * q / 2);
      var ps = Math.max(0, q * (pp - as) - ms * q * q / 2);
      // Tax revenue is positive; a subsidy is a cost to the government (negative).
      var gov = (pc - pp) * q;
      var tsStar = qStar * (ad - as) / 2;
      var dwl = Math.max(0, tsStar - cs - ps - gov);
      // Society counts the external effect too. The socially best quantity is
      // where marginal social benefit meets marginal social cost.
      var qSoc = Math.max(0, (ad - as - X) / (md + ms));
      var socialBest = qSoc * (ad - as - X) / 2;
      var external = -X * q;
      var socialTotal = cs + ps + gov + external;
      var socialDwl = Math.max(0, socialBest - socialTotal);
      // Judge 'fixed' by quantity, not by a dollar tolerance: a $1 externality
      // leaves under $1 of loss with no policy at all.
      var atSocial = Math.abs(q - qSoc) < 0.02;
      return { ad: ad, as: as, md: md, ms: ms, qStar: qStar, pStar: pStar, q: q, pc: pc, pp: pp, cs: cs, ps: ps, gov: gov, dwl: dwl, tsStar: tsStar, regime: regime, qd: Qd(pc), qs: Qs(pp), ext: X, qSoc: qSoc, external: external, socialTotal: socialTotal, socialBest: socialBest, socialDwl: socialDwl, atSocial: atSocial, monopoly: mono, qMono: qPolicy, atCompetitive: Math.abs(q - qStar) < 0.7 || (regime === 'ceiling' && Math.abs(C - pStar) <= 0.5 + 1e-9) };
    }
    // Direction of each curve's shift → what happens to P and Q. With two
    // shifts pulling one variable opposite ways, the honest answer is
    // "can't tell" without knowing the sizes.
    function sdPredict(ds, ss) {
      var d = ds > 0 ? 1 : ds < 0 ? -1 : 0, s = ss > 0 ? 1 : ss < 0 ? -1 : 0;
      var comb = function (a, b) { if (a === 0 && b === 0) return 'same'; if (a === 0) return b > 0 ? 'up' : 'down'; if (b === 0) return a > 0 ? 'up' : 'down'; return a === b ? (a > 0 ? 'up' : 'down') : 'unclear'; };
      return { curve: d && s ? 'both' : d ? 'demand' : s ? 'supply' : 'none', d: d, s: s, p: comb(d, -s), q: comb(d, s) };
    }
    var SD_CASES = [
      { id: 'oat_milk', level: 1, market: 'Oat milk', headline: 'A viral video makes oat-milk lattes the drink of the year.', ds: 3, ss: 0, why: 'Tastes and trends change what buyers want at every price, so DEMAND shifts right. Sellers respond to the higher price by producing more: price and quantity both rise.' },
      { id: 'orange_frost', level: 1, market: 'Orange juice', headline: 'A hard frost destroys a third of Florida’s orange crop.', ds: 0, ss: -3, why: 'Fewer oranges means sellers can offer less juice at every price, so SUPPLY shifts left. Price rises and the quantity sold falls.' },
      { id: 'ebike_robot', level: 1, market: 'E-bikes', headline: 'A new assembly robot cuts the cost of building e-bikes.', ds: 0, ss: 3, why: 'Cheaper production lets sellers offer more at every price, so SUPPLY shifts right. Price falls and more e-bikes are sold.' },
      { id: 'recession_meals', level: 1, market: 'Restaurant meals', headline: 'A recession cuts household incomes.', ds: -3, ss: 0, why: 'Restaurant meals are a normal good: when incomes fall, people buy fewer at every price, so DEMAND shifts left. Price and quantity both fall.' },
      { id: 'tea_substitute', level: 2, market: 'Tea', headline: 'A coffee-bean shortage sends coffee prices soaring.', ds: 2, ss: 0, why: 'Tea is a SUBSTITUTE for coffee. When coffee gets pricier, some drinkers switch, so the demand for tea shifts right: tea’s price and quantity rise.' },
      { id: 'suv_complement', level: 2, market: 'Large SUVs', headline: 'Gasoline prices double.', ds: -3, ss: 0, why: 'Gasoline is a COMPLEMENT to big SUVs (used together). Pricier gas makes owning an SUV costlier, so demand for SUVs shifts left: price and quantity fall.' },
      { id: 'pickers_wage', level: 2, market: 'Strawberries', headline: 'Wages for farm workers who pick strawberries rise sharply.', ds: 0, ss: -2, why: 'Labor is an INPUT. Higher input costs mean growers supply fewer strawberries at every price, so supply shifts left: price rises, quantity falls.' },
      { id: 'hurricane_plywood', level: 2, market: 'Plywood', headline: 'Forecasters warn a hurricane will hit the coast next week.', ds: 3, ss: 0, why: 'EXPECTATIONS matter: people rush to board up windows now, so demand for plywood shifts right. Price and quantity rise.' },
      { id: 'food_trucks', level: 2, market: 'Downtown lunches', headline: 'Twenty new food trucks start parking downtown at lunchtime.', ds: 0, ss: 3, why: 'More SELLERS means more lunches offered at every price, so supply shifts right: price falls and more lunches are sold.' },
      { id: 'ebook_textbooks', level: 2, market: 'Printed textbooks', headline: 'Digital textbooks drop to half their old price.', ds: -2, ss: 0, why: 'E-books are a SUBSTITUTE for printed books. When the substitute gets cheaper, demand for printed textbooks shifts left: price and quantity fall.' },
      { id: 'corn_subsidy', level: 2, market: 'Corn', headline: 'The government starts paying farmers a subsidy for every bushel of corn.', ds: 0, ss: 2, why: 'A per-unit SUBSIDY lowers farmers’ effective cost, so supply shifts right. The market price falls and more corn is sold.' },
      { id: 'energy_drink_study', level: 1, market: 'Energy drinks', headline: 'A major study links a popular energy drink to heart problems.', ds: -3, ss: 0, why: 'New information changes TASTES: buyers want less at every price, so demand shifts left. Price and quantity both fall.' },
      { id: 'concert_seats', level: 3, market: 'Concert tickets', headline: 'A band’s song goes viral AND the arena adds 5,000 seats.', ds: 3, ss: 2, why: 'Demand shifts right (more fans) and supply shifts right (more seats). Both push QUANTITY up. But demand pulls price up while supply pulls it down, so the price change depends on which shift is bigger: you can’t tell from the story alone.' },
      { id: 'avocado', level: 3, market: 'Avocados', headline: 'A drought hits avocado farms AND a new diet craze makes avocados a must-have.', ds: 2, ss: -3, why: 'Supply shifts left and demand shifts right. Both push PRICE up. But the drought cuts quantity while the craze raises it, so the quantity change depends on the sizes: you can’t tell.' },
      { id: 'smartphones', level: 3, market: 'Smartphones', headline: 'Chip prices fall AND a recession squeezes household budgets.', ds: -2, ss: 3, why: 'Supply shifts right (cheaper chips) and demand shifts left (recession). Both push PRICE down. Quantity is pulled both ways, so its change depends on which shift is larger.' },
      { id: 'beef', level: 3, market: 'Beef', headline: 'Health worries cut beef demand AND cattle-feed costs rise.', ds: -3, ss: -2, why: 'Demand shifts left and supply shifts left. Both push QUANTITY down. Demand pulls price down while supply pulls it up, so the price change is unclear without the sizes.' }
    ];

    // Policy scenarios for the "Generate Random Scenario" button: controls and
    // taxes, with curve settings chosen so each makes its point clearly.
    var SD_SCENARIOS = [
      { title: 'Factory smoke', explanation: 'A paper mill’s smoke causes $20 of health and cleanup costs per unit produced, paid by neighbors, not by the mill or its customers.', ext: 20, lesson: 'A negative externality makes the market produce too much. A per-unit tax equal to the external cost (a Pigouvian tax) fixes it: try a $20 tax.' },
      { title: 'Flu shots', explanation: 'Each flu shot also protects the people around you, a benefit worth about $15 per shot that the buyer does not count.', ext: -15, lesson: 'A positive externality makes the market produce too little. A per-unit subsidy equal to the external benefit fixes it: try a $15 subsidy.' },
      { title: 'A town’s only cable company', explanation: 'One company owns the only cable network in town, so it is the only seller of home internet.', monopoly: true, lesson: 'A monopolist produces where marginal revenue equals marginal cost, then charges what buyers will pay. It sells less at a higher price than a competitive market would, and the amber triangle is value nobody gets.' },
      { title: 'Regulators cap the cable price', explanation: 'The utility commission caps the monopoly cable company’s price at $55.', monopoly: true, ceiling: 55, lesson: 'A price cap below the monopoly price can RAISE output: holding back no longer raises the price. Set the cap at the competitive price and the deadweight loss disappears.' },
      { title: 'Rent control', explanation: 'A city caps rents at $35, below the market price. Apartments are hard to add quickly, so supply is steep.', ceiling: 35, sSlope: 1.3, lesson: 'A binding price ceiling creates a shortage: more people want apartments than landlords offer, and some trades that both sides wanted never happen.' },
      { title: 'A price floor for milk', explanation: 'The government guarantees dairy farmers at least $65 per unit.', floor: 65, lesson: 'A binding price floor creates a surplus: farmers want to sell more than buyers will buy at that price.' },
      { title: 'A sugary-drink tax', explanation: 'A city adds a $12 tax on every unit of soda sold.', tax: 12, lesson: 'A tax drives a wedge between what buyers pay and what sellers keep. The purple rectangle is the government’s revenue; the amber triangle is lost trade.' },
      { title: 'A cigarette tax', explanation: 'A state raises its cigarette tax by $15. Many smokers are addicted, so demand is inelastic (steep).', tax: 15, dSlope: 1.4, dShift: 5, lesson: 'When demand is inelastic, buyers bear most of a tax and the quantity sold falls by a smaller percentage than for an elastic good (compare the luxury boat tax).' },
      { title: 'A luxury boat tax', explanation: 'In 1990 the US taxed luxury boats. Buyers had plenty of alternatives, so demand was elastic (flat).', tax: 15, dSlope: 0.35, dShift: -4, lesson: 'When demand is elastic, sellers bear most of the tax and sales fall sharply. The 1990 luxury tax hit boat builders hard and was repealed in 1993.' },
      { title: 'A ticket price cap for a hit show', explanation: 'A wildly popular show caps ticket prices at $30.', ceiling: 30, dShift: 3, lesson: 'With huge demand and a low cap, the shortage is large. That gap is what ticket scalpers profit from.' },
      { title: 'A gas price cap during a supply crunch', explanation: 'A refinery outage cuts supply, and the state caps gas prices at $40.', sShift: -3, ceiling: 40, dSlope: 1.4, lesson: 'A price cap during a supply shock turns higher prices into long lines and empty pumps.' },
      { title: 'A bumper crop meets a price support', explanation: 'Perfect weather brings a record harvest, and the government keeps a $55 price floor.', sShift: 3, floor: 55, lesson: 'When supply rises but a floor stops the price from falling, the surplus grows. Governments often end up buying and storing it.' }
    ];

    // ── Business sim ──
    // Linear demand around the reference price: customers fall by `sens` × the
    // % price increase, and nobody buys past ref × (1 + 1/sens). Revenue is
    // ALWAYS customers × price, so price experiments are real experiments.
    var BIZ_TEMPLATES = [
      { id: 'lemonade', businessName: 'Sunny Squeeze Lemonade', emoji: '🍋', unitName: 'cup', startupCost: 400, dailyFixedCosts: 75, unitCost: 0.55, suggestedPrice: 2, baseDemand: 90, maxDailyCustomers: 140, sens: 1.2, weatherSens: 1, weekendBoost: 1.35, staffWage: 40, staffCapacity: 50, description: 'Fresh lemonade from a cart in the park.', riskFactors: ['Rainy days', 'Summer-only demand', 'Competing cafés'] },
      { id: 'foodtruck', businessName: 'Rolling Tacos', emoji: '🌮', unitName: 'plate', startupCost: 6000, dailyFixedCosts: 280, unitCost: 3.5, suggestedPrice: 11, baseDemand: 70, maxDailyCustomers: 100, sens: 1.4, weatherSens: 0.5, weekendBoost: 1.3, staffWage: 120, staffCapacity: 40, description: 'A taco truck that follows the lunch crowds.', riskFactors: ['Truck breakdowns', 'Permit rules', 'Weather'] },
      { id: 'dogwalk', businessName: 'Happy Paws Walking', emoji: '🐕', unitName: 'walk', startupCost: 500, dailyFixedCosts: 25, unitCost: 2, suggestedPrice: 20, baseDemand: 9, maxDailyCustomers: 12, sens: 1.1, weatherSens: 0.3, weekendBoost: 0.8, staffWage: 90, staffCapacity: 8, description: 'Midday walks for busy pet owners.', riskFactors: ['One person can only walk so many dogs', 'Liability', 'Seasonal demand'] },
      { id: 'tutoring', businessName: 'Bright Minds Tutoring', emoji: '📚', unitName: 'session', startupCost: 300, dailyFixedCosts: 20, unitCost: 1, suggestedPrice: 35, baseDemand: 5, maxDailyCustomers: 7, sens: 1.0, weatherSens: 0, weekendBoost: 1.2, staffWage: 110, staffCapacity: 6, description: 'One-on-one homework help after school.', riskFactors: ['Hours are limited', 'Exam-season spikes', 'Reputation is everything'] },
      { id: 'bakery', businessName: 'Rise & Shine Bakery', emoji: '🥐', unitName: 'pastry', startupCost: 9000, dailyFixedCosts: 450, unitCost: 1.2, suggestedPrice: 3.75, baseDemand: 260, maxDailyCustomers: 350, sens: 1.3, weatherSens: 0.2, weekendBoost: 1.4, staffWage: 120, staffCapacity: 100, description: 'A corner bakery with fresh bread every morning.', riskFactors: ['High rent', 'Ingredient prices', 'Early hours'] },
      { id: 'tshirt', businessName: 'Ink Well Tees', emoji: '👕', unitName: 'shirt', startupCost: 3500, dailyFixedCosts: 90, unitCost: 6, suggestedPrice: 18, baseDemand: 18, maxDailyCustomers: 26, sens: 1.6, weatherSens: 0, weekendBoost: 1.0, staffWage: 80, staffCapacity: 12, description: 'Custom-printed shirts for teams and clubs.', riskFactors: ['Big orders come and go', 'Design competition online'] },
      { id: 'carwash', businessName: 'Sparkle Car Wash', emoji: '🚗', unitName: 'wash', startupCost: 2000, dailyFixedCosts: 120, unitCost: 3, suggestedPrice: 15, baseDemand: 30, maxDailyCustomers: 42, sens: 1.3, weatherSens: 1, weekendBoost: 1.5, staffWage: 100, staffCapacity: 20, description: 'Hand washes in a busy parking lot.', riskFactors: ['Rain wipes out business', 'Water costs'] },
      { id: 'phonefix', businessName: 'QuickFix Phone Repair', emoji: '🔧', unitName: 'repair', startupCost: 5000, dailyFixedCosts: 200, unitCost: 35, suggestedPrice: 90, baseDemand: 9, maxDailyCustomers: 13, sens: 1.1, weatherSens: 0, weekendBoost: 1.2, staffWage: 140, staffCapacity: 8, description: 'Screen and battery repairs at a mall kiosk.', riskFactors: ['Parts prices', 'Big-store competition'] }
    ];
    var BIZ_WEATHER = [
      { id: 'sunny', icon: '☀️', label: 'Sunny', mult: 1.2, p: 0.45 },
      { id: 'cloudy', icon: '⛅', label: 'Cloudy', mult: 1.0, p: 0.35 },
      { id: 'rainy', icon: '🌧️', label: 'Rainy', mult: 0.6, p: 0.2 }
    ];
    var DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Fill in the demand parameters an AI-generated business does not carry,
    // and keep its numbers inside what the sim can run.
    function bizNormalize(b) {
      b = (b && typeof b === 'object') ? b : {};
      var price = clamp(num(b.suggestedPrice, 10), 0.5, 5000);
      var unit = clamp(num(b.unitCost, price * 0.4), 0, 4000);
      if (unit >= price) price = Math.round(unit * 2.5 * 100) / 100;
      var maxC = Math.round(clamp(num(b.maxDailyCustomers, 60), 2, 2000));
      var base = Math.round(clamp(num(b.baseDemand, maxC * 0.6), 1, 2000));
      var fixedDefault = Math.max(10, Math.round(base * (price - unit) * 0.6));
      return {
        id: typeof b.id === 'string' ? b.id : 'custom',
        businessName: (typeof b.businessName === 'string' && b.businessName) ? b.businessName.slice(0, 60) : 'My Business',
        emoji: (typeof b.emoji === 'string' && b.emoji) ? b.emoji.slice(0, 4) : '🏪',
        unitName: (typeof b.unitName === 'string' && b.unitName) ? b.unitName.slice(0, 24) : 'unit',
        startupCost: Math.round(clamp(num(b.startupCost, 3000), 0, 9500)),
        dailyFixedCosts: Math.round(clamp(num(b.dailyFixedCosts, fixedDefault), 0, 20000)),
        unitCost: unit, suggestedPrice: price, baseDemand: base, maxDailyCustomers: maxC,
        sens: clamp(num(b.sens, 1.2), 0.4, 3),
        weatherSens: clamp(num(b.weatherSens, 0.3), 0, 1),
        weekendBoost: clamp(num(b.weekendBoost, 1.2), 0.5, 2),
        staffWage: Math.round(clamp(num(b.staffWage, 90), 10, 1000)),
        staffCapacity: Math.round(clamp(num(b.staffCapacity, Math.max(1, maxC * 0.4)), 1, 2000)),
        description: typeof b.description === 'string' ? b.description.slice(0, 200) : '',
        riskFactors: Array.isArray(b.riskFactors) ? b.riskFactors.filter(function (r) { return typeof r === 'string'; }).slice(0, 4) : []
      };
    }
    function bizDemandAt(b, price) {
      var ref = b.suggestedPrice;
      return Math.max(0, b.baseDemand * (1 - b.sens * (price / ref - 1)));
    }
    function bizMarketingLift(b, spend) {
      var scale = Math.max(5, 0.15 * b.baseDemand * b.suggestedPrice);
      return 1 + 0.4 * (1 - Math.exp(-Math.max(0, spend) / scale));
    }
    // Reputation 50 = baseline demand; 0 halves it, 100 adds half again.
    function bizRepFactor(rep) { return 0.5 + clamp(num(rep, 50), 0, 100) / 100; }
    // Expected results on an AVERAGE day (average weather, weekday mix and
    // luck) at a given price: the curve students unlock in the price lab.
    function bizExpected(rawBiz, lv, st, price) {
      var b = bizNormalize(rawBiz); lv = lv || {}; st = st || {};
      var p = num(price, num(lv.price, b.suggestedPrice));
      var staff = Math.round(clamp(num(lv.staff, 0), 0, 20));
      var mkt = clamp(num(lv.marketing, 0), 0, 100000);
      var unitCost = b.unitCost * clamp(num(st.unitCostAdj, 1), 0.2, 5);
      var fixed = b.dailyFixedCosts * clamp(num(st.fixedAdj, 1), 0.2, 5);
      var avgWeather = BIZ_WEATHER.reduce(function (s, w) { return s + w.p * w.mult; }, 0);
      var demand = bizDemandAt(b, p) * bizRepFactor(st.rep) * bizMarketingLift(b, mkt) * clamp(num(st.demandAdj, 1), 0.2, 3) * (1 + (avgWeather - 1) * b.weatherSens);
      var customers = Math.min(demand, b.maxDailyCustomers + staff * b.staffCapacity);
      return { demand: demand, customers: customers, profit: customers * (p - unitCost) - fixed - staff * b.staffWage - mkt };
    }
    function bizDay(rawBiz, lv, st, rng) {
      rng = rngOf(rng);
      var b = bizNormalize(rawBiz);
      lv = lv || {}; st = st || {};
      var price = clamp(num(lv.price, b.suggestedPrice), 0.01, b.suggestedPrice * 10);
      var staff = Math.round(clamp(num(lv.staff, 0), 0, 20));
      var mkt = clamp(num(lv.marketing, 0), 0, 100000);
      var rep = clamp(num(st.rep, 50), 0, 100);
      var day = Math.max(1, Math.round(num(st.day, 1)));
      var unitCost = b.unitCost * clamp(num(st.unitCostAdj, 1), 0.2, 5);
      var fixed = b.dailyFixedCosts * clamp(num(st.fixedAdj, 1), 0.2, 5);
      var demandAdj = clamp(num(st.demandAdj, 1), 0.2, 3);
      var roll = rng(), acc = 0, weather = BIZ_WEATHER[BIZ_WEATHER.length - 1];
      for (var i = 0; i < BIZ_WEATHER.length; i++) { acc += BIZ_WEATHER[i].p; if (roll < acc) { weather = BIZ_WEATHER[i]; break; } }
      var dow = (day - 1) % 7;
      var weekend = dow >= 5;
      var dowF = weekend ? b.weekendBoost : (7 - 2 * b.weekendBoost) / 5;
      var weatherF = 1 + (weather.mult - 1) * b.weatherSens;
      var repF = bizRepFactor(rep);
      var noise = 0.85 + 0.3 * rng();
      var demand = Math.round(bizDemandAt(b, price) * repF * weatherF * dowF * bizMarketingLift(b, mkt) * demandAdj * noise);
      var capacity = b.maxDailyCustomers + staff * b.staffCapacity;
      var customers = Math.min(demand, capacity);
      var turnedAway = Math.max(0, demand - capacity);
      var revenue = Math.round(customers * price * 100) / 100;
      var variable = Math.round(customers * unitCost * 100) / 100;
      var staffCost = staff * b.staffWage;
      var costs = Math.round((fixed + variable + staffCost + mkt) * 100) / 100;
      var profit = Math.round((revenue - costs) * 100) / 100;
      // Reputation drifts toward what customers actually experience: value for
      // money (price vs the usual price), service (staff, no long lines) and
      // quality. Event shocks fade back toward that target instead of piling up.
      var notes = [];
      var repTarget = clamp(70 + 45 * (1 - price / b.suggestedPrice) + (staff > 0 ? 8 : 0) + clamp(num(st.quality, 0), -30, 30), 5, 98);
      if (turnedAway > Math.max(2, demand * 0.1)) { repTarget = Math.max(5, repTarget - 20); notes.push('long_lines'); }
      if (price > b.suggestedPrice * 1.5) notes.push('overpriced');
      var repDelta = Math.round((repTarget - rep) * 0.1 * 10) / 10;
      return {
        day: day, dayName: DAY_NAMES[dow], weekend: weekend, weather: weather.id, weatherIcon: weather.icon, weatherLabel: weather.label,
        price: price, demand: demand, capacity: capacity, customers: customers, turnedAway: turnedAway,
        revenue: revenue, variable: variable, fixed: Math.round(fixed * 100) / 100, staffCost: staffCost, marketing: mkt, costs: costs, profit: profit,
        repDelta: repDelta, repTarget: repTarget, notes: notes
      };
    }
    function bizBreakEven(rawBiz, lv, st) {
      var b = bizNormalize(rawBiz); lv = lv || {}; st = st || {};
      var price = num(lv.price, b.suggestedPrice);
      var unitCost = b.unitCost * clamp(num(st.unitCostAdj, 1), 0.2, 5);
      var dailyFixed = b.dailyFixedCosts * clamp(num(st.fixedAdj, 1), 0.2, 5) + Math.round(clamp(num(lv.staff, 0), 0, 20)) * b.staffWage + clamp(num(lv.marketing, 0), 0, 100000);
      var margin = price - unitCost;
      return margin > 0 ? Math.ceil(dailyFixed / margin) : Infinity;
    }
    // Effect keys: cash (dollars), cashX (multiples of today's daily fixed
    // costs, so amounts scale with the business), reputation (a shock that
    // fades), quality (a lasting shift in the reputation target), employees,
    // unitCostPct, fixedPct, demandPct (lasting market-share change),
    // risk { p, win, lose } (multiples of daily fixed costs), taxRecent (share
    // of the last 7 days' profit).
    var BIZ_EVENTS = [
      { id: 'supplier_up', emoji: '📦', title: 'Supplier raises prices', description: 'Your main supplier raises prices 20%.', lesson: 'Rising input costs squeeze your margin. You can absorb them, pass them on through prices, or find another supplier.', choices: [
        { label: 'Accept the new price (+20% unit cost)', effect: { unitCostPct: 20 } },
        { label: 'Switch to a cheaper, lower-quality supplier (only +5%)', effect: { unitCostPct: 5, quality: -6 } },
        { label: 'Lock in a bulk deal: pay up front, only +5%', effect: { cashX: -2, unitCostPct: 5 } }
      ] },
      { id: 'influencer', emoji: '🌟', title: 'An influencer loves you', description: 'A local influencer posts a glowing review of your business.', lesson: 'Word of mouth is the cheapest marketing, but buzz fades. Lasting reputation comes from the value and service customers get every day.', choices: [
        { label: 'Thank them with a promo for their followers', effect: { cashX: -0.5, reputation: 10 } },
        { label: 'Enjoy the buzz', effect: { reputation: 5 } }
      ] },
      { id: 'bad_review', emoji: '⭐', title: 'A one-star review', description: 'A customer posts an angry review about slow service.', lesson: 'Keeping customers usually costs less than finding new ones. How you respond to complaints is visible to every future customer.', choices: [
        { label: 'Apologize publicly and fix the problem', effect: { cashX: -0.3, quality: 2 } },
        { label: 'Argue with them online', effect: { reputation: -10, quality: -2 } },
        { label: 'Ignore it', effect: { reputation: -4 } }
      ] },
      { id: 'equipment', emoji: '🛠️', title: 'Equipment breakdown', description: 'A key piece of equipment breaks down.', lesson: 'Businesses keep cash reserves for repairs. A cheap patch saves money today but often fails again, so deferred maintenance tends to cost more.', choices: [
        { label: 'Repair it properly now', effect: { cashX: -3 } },
        { label: 'Patch it cheaply (40% chance it fails again)', effect: { cashX: -1, risk: { p: 0.6, win: 0, lose: -4 } } }
      ] },
      { id: 'inspection', emoji: '📋', title: 'Surprise inspection', description: 'A city inspector drops by and finds a few small problems.', lesson: 'Regulations protect customers and workers. Compliance is a normal fixed cost of doing business.', choices: [
        { label: 'Fix everything right away', effect: { cashX: -1, quality: 2 } },
        { label: 'Pay the small fine and fix it later', effect: { cashX: -0.6, reputation: -3 } }
      ] },
      { id: 'competitor', emoji: '🏪', title: 'A competitor opens nearby', description: 'A rival opens down the street with lower prices.', lesson: 'Competition shifts your demand curve left. You can compete on price, or differentiate on quality and service.', choices: [
        { label: 'Differentiate: better-quality ingredients (+10% unit cost)', effect: { unitCostPct: 10, quality: 8, demandPct: -4 } },
        { label: 'Start a loyalty program', effect: { cashX: -0.8, quality: 3, demandPct: -6 } },
        { label: 'Ignore them', effect: { demandPct: -12 } }
      ] },
      { id: 'big_order', emoji: '📦', title: 'A big order', description: 'A local company wants a large one-time order for an event. You would need to buy extra supplies up front.', lesson: 'Big orders boost revenue, but only if you can fill them. Overpromising damages your reputation.', choices: [
        { label: 'Take it on (70% chance it goes smoothly)', effect: { risk: { p: 0.7, win: 1.5, lose: -0.5 }, reputation: 2 } },
        { label: 'Decline politely', effect: {} }
      ] },
      { id: 'staff_quits', emoji: '👋', title: 'Your best employee quits', requires: 'staff', description: 'Your best employee leaves for a higher-paying job.', lesson: 'Turnover is expensive: hiring and training cost money, and service suffers while you are short-staffed.', choices: [
        { label: 'Hire a replacement right away', effect: { cashX: -0.5 } },
        { label: 'Don’t replace them', effect: { employees: -1, reputation: -3 } }
      ] },
      { id: 'rent_hike', emoji: '🏢', title: 'Rent goes up', description: 'Your landlord raises your rent.', lesson: 'Fixed costs don’t change with sales, so a rent increase raises your break-even point.', choices: [
        { label: 'Sign the new lease (+10% daily fixed costs)', effect: { fixedPct: 10 } },
        { label: 'Move to a cheaper spot', effect: { cashX: -2, fixedPct: -5, demandPct: -3 } }
      ] },
      { id: 'festival', emoji: '🎪', title: 'Street festival', description: 'A street festival is coming. A booth costs money, and sales depend on the weather and the crowd.', lesson: 'Marketing and events only pay off if the extra sales beat the cost. Some bets don’t pay.', choices: [
        { label: 'Rent a booth (60% chance of a good crowd)', effect: { risk: { p: 0.6, win: 2, lose: -1 }, reputation: 2 } },
        { label: 'Skip it', effect: {} }
      ] },
      { id: 'shortage', emoji: '⚠️', title: 'Supply shortage', description: 'A key ingredient or part is scarce this week.', lesson: 'Supply-chain shocks raise costs or cut sales. Keeping a small buffer of inventory is a kind of insurance.', choices: [
        { label: 'Pay rush prices to stay stocked', effect: { cashX: -0.8 } },
        { label: 'Sell out early each day this week (lost sales)', effect: { cashX: -1, reputation: -3 } }
      ] },
      { id: 'taxes_due', emoji: '🧾', title: 'Quarterly taxes due', description: 'Estimated business taxes are due: about 15% of your recent profit.', lesson: 'Businesses pay tax on profit, not on sales. Part of every profitable day belongs to the tax bill, so smart owners set it aside.', choices: [
        { label: 'Pay on time', effect: { taxRecent: 0.15 } },
        { label: 'Pay late with a penalty', effect: { taxRecent: 0.18 } }
      ] }
    ];
    function bizEffectCash(ef, fixedNow, recentProfit, rng) {
      var cash = num(ef.cash, 0) + num(ef.cashX, 0) * fixedNow, riskWon = null;
      if (ef.risk && typeof ef.risk === 'object') { riskWon = rngOf(rng)() < clamp(num(ef.risk.p, 0.5), 0, 1); cash += num(riskWon ? ef.risk.win : ef.risk.lose, 0) * fixedNow; }
      if (typeof ef.taxRecent === 'number') cash -= Math.max(0, num(recentProfit, 0)) * clamp(ef.taxRecent, 0, 1);
      return { cash: Math.round(cash * 100) / 100, riskWon: riskWon };
    }
    function sanitizeAiBizEffect(e) {
      e = (e && typeof e === 'object') ? e : {};
      var out = {};
      if (typeof e.cash === 'number' && isFinite(e.cash)) out.cash = clamp(Math.round(e.cash), -20000, 20000);
      if (typeof e.reputation === 'number' && isFinite(e.reputation)) out.reputation = clamp(Math.round(e.reputation), -20, 20);
      if (typeof e.employees === 'number' && isFinite(e.employees)) out.employees = clamp(Math.round(e.employees), -3, 3);
      return out;
    }

    // ── Stock market ──
    var CLASSIC_MARKET = [
      { name: 'SunRay Energy', ticker: 'SUNR', sector: 'Energy', price: 42, beta: 1.2, vol: 0.014, drift: 0, description: 'Produces natural gas and runs wind and solar farms.' },
      { name: 'ByteForge Software', ticker: 'BYTE', sector: 'Technology', price: 128, beta: 1.4, vol: 0.015, drift: 0, description: 'Makes cloud software for small businesses.' },
      { name: 'MediCore Labs', ticker: 'MDCL', sector: 'Healthcare', price: 76, beta: 0.8, vol: 0.011, drift: 0, description: 'Develops generic medicines and diagnostic tests.' },
      { name: 'FreshCart Grocers', ticker: 'CART', sector: 'Consumer Staples', price: 34, beta: 0.5, vol: 0.007, drift: 0, description: 'Runs a regional chain of grocery stores.' },
      { name: 'Harbor Bank', ticker: 'HRBR', sector: 'Financials', price: 58, beta: 1.1, vol: 0.010, drift: 0, description: 'A community bank that makes home and business loans.' }
    ];
    // {name} → a company picked at random for company-specific news.
    var STOCK_NEWS = [
      { headline: 'The central bank raises interest rates by half a point', analysis: 'Borrowing gets costlier. Banks can earn more on loans; fast-growing tech firms look less attractive.', lesson: 'Higher rates lower the present value of future profits, which hits growth stocks hardest.', market: -0.015, sectors: { Financials: 0.015, Technology: -0.02 } },
      { headline: 'Oil prices jump 15% after a supply cut', analysis: 'Energy producers profit; businesses that ship goods face higher costs.', lesson: 'The same news creates winners and losers across sectors. That is why diversified portfolios are steadier.', market: -0.004, sectors: { Energy: 0.035, 'Consumer Staples': -0.01 } },
      { headline: 'A mild winter cuts energy demand', analysis: 'Less heating means lower sales for energy companies.', lesson: 'Some businesses depend on things no one controls, like the weather. That is part of their risk.', sectors: { Energy: -0.04 } },
      { headline: 'Natural gas prices plunge on oversupply', analysis: 'Too much gas chasing too few buyers means lower revenue for producers.', lesson: 'When supply outruns demand, prices and profits fall: supply and demand work in stock-picking too.', sectors: { Energy: -0.04 } },
      { headline: 'New rules cap what drug makers can charge', analysis: 'Healthcare profits could shrink under the new pricing rules.', lesson: 'Regulation can change a whole industry’s expected profits overnight.', sectors: { Healthcare: -0.04 } },
      { headline: 'Loan defaults rise at regional banks', analysis: 'More borrowers are falling behind on payments.', lesson: 'Banks profit from lending, but they carry the risk that loans are not repaid.', sectors: { Financials: -0.035 } },
      { headline: 'Regulators open an antitrust probe into big tech', analysis: 'Investors worry about fines and forced changes to business models.', lesson: 'Political and legal risk is a real cost that stock prices try to account for.', sectors: { Technology: -0.03 } },
      { headline: 'Shoppers stock up ahead of the holidays', analysis: 'Grocery and household-goods sales beat forecasts.', lesson: 'Steady demand for necessities is why consumer-staples stocks are called defensive.', sectors: { 'Consumer Staples': 0.02 } },
      { headline: 'Food costs ease for grocers', analysis: 'Cheaper wholesale food widens grocery profit margins.', lesson: 'Lower input costs raise profits even when sales stay the same.', sectors: { 'Consumer Staples': 0.02 } },
      { headline: '{name} wins a major contract', analysis: 'The deal adds years of steady revenue.', lesson: 'Stock prices reflect expected FUTURE profits, so news about next year matters today.', company: 0.06 },
      { headline: '{name} hires a respected new CEO', analysis: 'Investors hope new leadership will turn the company around.', lesson: 'Markets price in expectations about management, not just current numbers.', company: 0.03 },
      { headline: 'Consumer confidence hits a two-year high', analysis: 'Households say they plan to spend more.', lesson: 'Consumer spending is about two-thirds of GDP, so confidence moves the whole market.', market: 0.012 },
      { headline: '{name} beats earnings expectations', analysis: 'Profits came in well above what analysts predicted.', lesson: 'Prices move on SURPRISES. Good news that everyone already expected is usually priced in.', company: 0.08 },
      { headline: '{name} recalls a faulty product', analysis: 'The recall will be expensive and dents the brand.', lesson: 'Company-specific risk can hit one stock hard. Owning many companies spreads that risk out.', company: -0.09 },
      { headline: 'Strong jobs report beats forecasts', analysis: 'More people working means more spending ahead.', lesson: 'Economic data moves the whole market, not just one company.', market: 0.012 },
      { headline: 'Recession fears grow', analysis: 'Investors rush toward companies that sell necessities.', lesson: 'Defensive stocks (groceries, utilities) tend to fall less in downturns than cyclical ones.', market: -0.025, sectors: { 'Consumer Staples': 0.015 } },
      { headline: 'New clean-energy tax credit becomes law', analysis: 'Solar and battery companies expect a wave of new customers.', lesson: 'Government policy changes incentives, and markets reprice quickly when it does.', sectors: { Energy: 0.045 } },
      { headline: 'A major drug trial succeeds', analysis: 'A new treatment looks likely to be approved.', lesson: 'Healthcare stocks can jump or drop on trial results: high reward, high uncertainty.', sectors: { Healthcare: 0.04 } },
      { headline: 'Data breach at {name}', analysis: 'Customer data was stolen; lawsuits are likely.', lesson: 'News about one company rarely moves the whole market. Diversification absorbs single-company shocks.', company: -0.07 },
      { headline: 'AI excitement sparks a tech rally', analysis: 'Investors pile into anything connected to artificial intelligence.', lesson: 'Sentiment can push prices above what profits justify. Rallies built on hype can reverse fast.', market: 0.005, sectors: { Technology: 0.04 } },
      { headline: 'Banks pass their annual stress test', analysis: 'Regulators say major banks could survive a severe recession.', lesson: 'Lower perceived risk can raise stock prices even when profits haven’t changed.', sectors: { Financials: 0.02 } },
      { headline: 'Grocery chains start a price war', analysis: 'Shoppers win; grocery profit margins shrink.', lesson: 'Competition lowers prices for customers and profits for companies.', sectors: { 'Consumer Staples': -0.025 } },
      { headline: 'GDP growth beats forecasts', analysis: 'The economy grew faster than expected last quarter.', lesson: 'Stock markets tend to rise when the economy grows faster than people expected.', market: 0.01 },
      { headline: 'Analysts downgrade {name}', analysis: 'A big firm says the stock is overpriced.', lesson: 'Analyst opinions move prices in the short run, but they are often wrong.', company: -0.04 },
      { headline: '{name} announces a 2-for-1 stock split for next month', analysis: 'Each share will become two shares at half the price.', lesson: 'A split doesn’t change what the company is worth, just how many slices it is cut into. Same pizza, more slices.', company: 0.005 },
      { headline: '{name} raises its dividend', analysis: 'The company will pay shareholders more cash each quarter.', lesson: 'Dividends are cash paid to shareholders and are part of a stock’s total return. (This sim tracks price changes only.)', company: 0.02 },
      { headline: 'Inflation comes in cooler than expected', analysis: 'Investors bet interest rates will stop rising.', lesson: 'Markets look ahead: expected future rates matter more than today’s.', market: 0.015, sectors: { Technology: 0.01 } },
      { headline: 'Shipping backlogs at major ports', analysis: 'Stores struggle to keep shelves stocked.', lesson: 'Supply-chain problems raise costs and slow sales across the economy.', market: -0.01, sectors: { 'Consumer Staples': -0.015 } }
    ];
    function gauss(rng) { var u = Math.max(1e-12, rng()), v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    function sectorMove(sectors, sector) {
      if (!sectors || typeof sector !== 'string') return 0;
      var s = sector.toLowerCase(), move = 0;
      Object.keys(sectors).forEach(function (k) {
        var key = k.toLowerCase();
        // Whole words only: 'ai' must not match 'retail', nor 'tech' 'biotech'.
        if (s === key || (key === 'technology' && /\b(tech|technology|software|ai|chips?|semiconductors?|gaming|cloud|internet)\b/.test(s)) || (key === 'energy' && /\b(energy|solar|oil|gas|power|utilities|wind)\b/.test(s)) || (key === 'healthcare' && /\b(health|healthcare|biotech|pharma|pharmaceuticals?|medical|medicine)\b/.test(s)) || (key === 'financials' && /\b(finance|financials?|banks?|banking|insurance|fintech)\b/.test(s)) || (key === 'consumer staples' && /\b(food|grocery|grocers?|staples|beverages?|household)\b/.test(s))) move = sectors[k];
      });
      return move;
    }
    function stockNewsPick(companies, rng) {
      rng = rngOf(rng);
      if (rng() < 0.55) return null;
      var n = STOCK_NEWS[Math.min(STOCK_NEWS.length - 1, Math.floor(rng() * STOCK_NEWS.length))];
      var list = Array.isArray(companies) ? companies : [];
      var target = n.company && list.length ? list[Math.min(list.length - 1, Math.floor(rng() * list.length))] : null;
      return { headline: n.headline.replace('{name}', target ? target.name : 'A company'), analysis: n.analysis, lesson: n.lesson, market: num(n.market, 0), sectors: n.sectors || null, ticker: target ? target.ticker : null, company: num(n.company, 0) };
    }
    function stockDay(companies, news, rng) {
      rng = rngOf(rng);
      var mkt = 0.00025 + 0.007 * gauss(rng) + (news ? num(news.market, 0) : 0);
      var maxImpact = 0;
      var next = (Array.isArray(companies) ? companies : []).map(function (c) {
        var beta = num(c.beta, 1), vol = num(c.vol, 0.018), drift = num(c.drift, 0.0003);
        var impact = news ? sectorMove(news.sectors, c.sector) + (news.ticker && news.ticker === c.ticker ? num(news.company, 0) : 0) : 0;
        if (Math.abs(impact) > Math.abs(maxImpact)) maxImpact = impact;
        var r = clamp(drift + beta * mkt + vol * gauss(rng) + impact, -0.5, 0.5);
        var price = Math.max(1, Math.round(num(c.price, 50) * (1 + r) * 100) / 100);
        var hist = (Array.isArray(c.history) ? c.history : []).filter(function (v) { return typeof v === 'number' && isFinite(v); }).slice(-29);
        hist.push(price);
        return Object.assign({}, c, { price: price, history: hist });
      });
      return { companies: next, maxImpact: maxImpact, marketMove: mkt };
    }
    function classicMarket() {
      return CLASSIC_MARKET.map(function (c, i) {
        var colors = ['#f59e0b', '#8b5cf6', '#22c55e', '#3b82f6', '#ef4444'];
        return Object.assign({}, c, { color: colors[i % colors.length], history: [c.price * 0.97, c.price * 0.99, c.price * 0.98, c.price] });
      });
    }

    // ── National economy missions ──
    // Tuned against the tool's own macro step (tests replay it): doing nothing
    // fails every mission, so does the heavy-handed extreme, and a measured
    // policy path wins. Missions replace random shocks with scripted ones so
    // the outcome reflects the student's policy, not luck.
    var MACRO_MISSIONS = [
      { id: 'volcker', icon: '🦅', start: { gdp: 1.0, inf: 13.0, unemp: 7.0, rate: 11, trade: -0.5, year: 1980 }, years: 3, win: [['inf', '<=', 4]], guard: [['unemp', '<=', 10.5]] },
      { id: 'recovery', icon: '🏗️', start: { gdp: -2.5, inf: 0.5, unemp: 9.5, rate: 0.25, trade: -2.7, year: 2009 }, years: 5, winAtEnd: true, win: [['unemp', '<=', 7.5]], guard: [['inf', '<=', 4]] },
      { id: 'cooldown', icon: '🧊', start: { gdp: 3.0, inf: 7.0, unemp: 3.6, rate: 0.5, trade: -3.5, year: 2022 }, years: 3, win: [['inf', '<=', 4]], guard: [['gdp', '>=', 0]] },
      { id: 'oilshock', icon: '⛽', start: { gdp: 2.5, inf: 3.5, unemp: 4.9, rate: 6, trade: 0, year: 1973 }, years: 5, shocks: { 1: 'oil', 2: 'oil' }, winAtEnd: true, win: [['inf', '<=', 4.5], ['unemp', '<=', 6.5]], guard: [] },
      { id: 'softlanding', icon: '🛬', start: { gdp: 2.1, inf: 3.2, unemp: 3.8, rate: 5.25, trade: -0.5, year: 2025 }, years: 6, streak: 4, win: [['gdp', '>=', 1.5], ['gdp', '<=', 4], ['inf', '>=', 1], ['inf', '<=', 3.5], ['unemp', '<', 5.5]], guard: [] }
    ];
    function missionCmp(v, op, x) { return op === '<=' ? v <= x : op === '>=' ? v >= x : op === '<' ? v < x : v > x; }
    function missionById(id) { for (var i = 0; i < MACRO_MISSIONS.length; i++) if (MACRO_MISSIONS[i].id === id) return MACRO_MISSIONS[i]; return null; }
    // hist: the yearly {gdp, inf, unemp} results since the mission started.
    function evaluateMission(m, hist) {
      if (!m) return { status: 'none' };
      var rows = Array.isArray(hist) ? hist.filter(function (h) { return h && typeof h === 'object'; }) : [];
      var streak = 0;
      for (var y = 0; y < rows.length; y++) {
        var s = { gdp: num(rows[y].gdp, 0), inf: num(rows[y].inf, 0), unemp: num(rows[y].unemp, 0) };
        for (var g = 0; g < m.guard.length; g++) if (!missionCmp(s[m.guard[g][0]], m.guard[g][1], m.guard[g][2])) return { status: 'lost', reason: 'guard', year: y + 1, guard: m.guard[g] };
        var ok = m.win.every(function (w) { return missionCmp(s[w[0]], w[1], w[2]); });
        streak = ok ? streak + 1 : 0;
        if (!m.winAtEnd && ok && streak >= (m.streak || 1)) return { status: 'won', year: y + 1, streak: streak };
        if (m.winAtEnd && y + 1 >= m.years) return ok ? { status: 'won', year: y + 1 } : { status: 'lost', reason: 'end', year: y + 1 };
      }
      if (rows.length >= m.years) return { status: 'lost', reason: 'time', year: rows.length, streak: streak };
      return { status: 'active', yearsLeft: m.years - rows.length, streak: streak };
    }

    // ── Trade Lab: opportunity cost and comparative advantage ──
    // Each producer works `hours` a day and makes x units of good X OR y units
    // of good Y per hour, so the PPF is the straight line X/x + Y/y = hours and
    // the opportunity cost of one X is y/x units of Y.
    var TRADE_SCENARIOS = [
      { id: 'island', level: 1, hours: 8, goods: { x: { name: 'fish', icon: '🐟' }, y: { name: 'coconuts', icon: '🥥' } },
        a: { name: 'Ana', icon: '🎣', x: 6, y: 3 }, b: { name: 'Ben', icon: '🌴', x: 2, y: 4 } },
      // Mei is better at BOTH, and trade still helps both. Full specialization
      // leaves the world short of shirts, so Mei must keep some shirt hours.
      { id: 'better_at_both', level: 2, hours: 8, goods: { x: { name: 'loaves', icon: '🍞' }, y: { name: 'shirts', icon: '👕' } },
        a: { name: 'Mei', icon: '👩‍🍳', x: 6, y: 6 }, b: { name: 'Sol', icon: '🧵', x: 1, y: 3 } },
      { id: 'countries', level: 3, hours: 10, goods: { x: { name: 'tons of wheat', icon: '🌾' }, y: { name: 'bolts of cloth', icon: '🧶' } },
        a: { name: 'Avalon', icon: '🏔️', x: 3, y: 1 }, b: { name: 'Borealis', icon: '🏭', x: 4, y: 2 } }
    ];
    var TRADE_PEOPLE = [['Kofi', '🧑‍🌾'], ['Lena', '👩‍🔧'], ['Ravi', '🧑‍🍳'], ['Zoe', '👩‍🎨'], ['Nia', '🧑‍🏭'], ['Omar', '👨‍💻']];
    var TRADE_GOODS = [
      [{ name: 'fish', icon: '🐟' }, { name: 'coconuts', icon: '🥥' }],
      [{ name: 'baskets', icon: '🧺' }, { name: 'pots', icon: '🏺' }],
      [{ name: 'apps', icon: '📱' }, { name: 'songs', icon: '🎵' }],
      [{ name: 'bikes', icon: '🚲' }, { name: 'boards', icon: '🛹' }]
    ];
    // A reproducible random pair whose opportunity costs differ by at least 1.5x.
    function tradeRandom(seed) {
      // A small seed's first few draws are near 0 (seed x 16807 / 2^31): skip them.
      var r = seeded(seed); r(); r(); r();
      var pick = function (lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); };
      var ax = 1, ay = 1, bx = 1, by = 2;
      for (var k = 0; k < 60; k++) {
        ax = pick(1, 8); ay = pick(1, 8); bx = pick(1, 8); by = pick(1, 8);
        var oa = ay / ax, ob = by / bx;
        if (Math.max(oa, ob) / Math.min(oa, ob) >= 1.5) break;
      }
      var i = pick(0, TRADE_PEOPLE.length - 1), j = (i + 1 + pick(0, TRADE_PEOPLE.length - 2)) % TRADE_PEOPLE.length;
      var g = TRADE_GOODS[pick(0, TRADE_GOODS.length - 1)];
      return { id: 'random', seed: Math.round(num(seed, 1)), level: 2, hours: 8, goods: { x: g[0], y: g[1] },
        a: { name: TRADE_PEOPLE[i][0], icon: TRADE_PEOPLE[i][1], x: ax, y: ay }, b: { name: TRADE_PEOPLE[j][0], icon: TRADE_PEOPLE[j][1], x: bx, y: by } };
    }
    function tradeScenario(id, seed) {
      if (id === 'random') return tradeRandom(seed);
      for (var i = 0; i < TRADE_SCENARIOS.length; i++) if (TRADE_SCENARIOS[i].id === id) return TRADE_SCENARIOS[i];
      return TRADE_SCENARIOS[0];
    }
    // Who gives up less? xMaker has the comparative advantage in X.
    function tradeCompare(sc) {
      var oa = sc.a.y / sc.a.x, ob = sc.b.y / sc.b.x;
      return {
        ocXa: oa, ocXb: ob, ocYa: 1 / oa, ocYb: 1 / ob,
        xMaker: oa < ob ? 'a' : ob < oa ? 'b' : null,
        absX: sc.a.x > sc.b.x ? 'a' : sc.b.x > sc.a.x ? 'b' : null,
        absY: sc.a.y > sc.b.y ? 'a' : sc.b.y > sc.a.y ? 'b' : null,
        lo: Math.min(oa, ob), hi: Math.max(oa, ob)
      };
    }
    // p: hoursA0/hoursB0 = hours on X with no trade; hoursA1/hoursB1 = hours on
    // X in the trading plan; xFrom = who ships X ('a' or 'b'); price = units of
    // Y paid per X; qty = units of X shipped.
    function tradeOutcome(sc, p) {
      p = p || {};
      var H = sc.hours, EPS = 1e-9;
      var hA0 = clamp(num(p.hoursA0, H / 2), 0, H), hB0 = clamp(num(p.hoursB0, H / 2), 0, H);
      var hA1 = clamp(num(p.hoursA1, hA0), 0, H), hB1 = clamp(num(p.hoursB1, hB0), 0, H);
      var make = function (who, h) { return { x: sc[who].x * h, y: sc[who].y * (H - h) }; };
      var A0 = make('a', hA0), B0 = make('b', hB0), A1 = make('a', hA1), B1 = make('b', hB1);
      var price = clamp(num(p.price, 1), 0.05, 20);
      var from = p.xFrom === 'b' ? 'b' : 'a';
      var S = from === 'a' ? A1 : B1, R = from === 'a' ? B1 : A1;
      // Can't ship fish you don't have, or be paid in coconuts they don't have.
      var qty = clamp(num(p.qty, 0), 0, Math.min(S.x, R.y / price));
      var pay = qty * price;
      var Sc = { x: S.x - qty, y: S.y + pay }, Rc = { x: R.x + qty, y: R.y - pay };
      var A2 = from === 'a' ? Sc : Rc, B2 = from === 'a' ? Rc : Sc;
      var better = function (c, z) { return c.x >= z.x - EPS && c.y >= z.y - EPS && (c.x > z.x + EPS || c.y > z.y + EPS); };
      var beyond = function (who, c) { return c.x / sc[who].x + c.y / sc[who].y > H + EPS; };
      var cmp = tradeCompare(sc);
      var gainA = better(A2, A0), gainB = better(B2, B0);
      return {
        cmp: cmp, hours: H, A0: A0, B0: B0, A1: A1, B1: B1, A2: A2, B2: B2, qty: qty, pay: pay, price: price, xFrom: from,
        gainA: gainA, gainB: gainB, bothGain: gainA && gainB,
        priceOk: price > cmp.lo + EPS && price < cmp.hi - EPS,
        beyondA: beyond('a', A2), beyondB: beyond('b', B2),
        worldBefore: { x: A0.x + B0.x, y: A0.y + B0.y }, worldPlan: { x: A1.x + B1.x, y: A1.y + B1.y }
      };
    }

    // ── Credit card payoff: month by month ──
    // Interest is charged on the balance each month (APR / 12). A common
    // minimum-payment formula is that month's interest plus 1% of the
    // balance, at least $25. A fixed payment that does not beat the interest
    // never pays the card off.
    function cardMinPayment(balance, monthlyRate) {
      return Math.min(balance * (1 + monthlyRate), Math.max(25, balance * monthlyRate + balance * 0.01));
    }
    function cardPayoff(p) {
      p = p || {};
      var bal = clamp(num(p.balance, 3000), 0, 1e7), r = clamp(num(p.apr, 22), 0, 99) / 100 / 12;
      var fixed = p.rule === 'fixed', pay = Math.max(0, num(p.payment, 0)), cap = Math.max(1, Math.round(num(p.maxMonths, 600)));
      var months = 0, interest = 0, paid = 0, path = [bal];
      if (fixed && bal > 0 && pay <= bal * r + 1e-9) return { months: Infinity, interest: Infinity, paid: Infinity, never: true, path: path, firstPayment: pay };
      var first = bal > 0 ? (fixed ? Math.min(pay, bal * (1 + r)) : cardMinPayment(bal, r)) : 0;
      while (bal > 0.005 && months < cap) {
        var i = bal * r;
        var due = fixed ? Math.min(pay, bal + i) : cardMinPayment(bal, r);
        bal = Math.max(0, bal + i - due);
        interest += i; paid += due; months++;
        path.push(bal);
      }
      return { months: bal > 0.005 ? Infinity : months, interest: interest, paid: paid, never: bal > 0.005, path: path, firstPayment: first };
    }

    // ── Price war: two shops pick High or Low each day, at the same time ──
    // Profits per day, [you, rival]. Cutting always pays more for ONE day
    // (90 > 60 and 30 > 10), yet both cutting (30 each) is worse than both
    // holding (60 each): a prisoner's dilemma.
    var PRICE_WAR = { days: 10, pay: { HH: [60, 60], HL: [10, 90], LH: [90, 10], LL: [30, 30] } };
    var PW_RIVALS = [
      { id: 'mirror', name: 'Mirror', desc: 'Starts high, then copies your move from the day before (tit-for-tat).' },
      { id: 'grudge', name: 'Grudge', desc: 'Keeps prices high until you cut once, then cuts every day after (grim trigger).' },
      { id: 'cutthroat', name: 'Cutthroat', desc: 'Cuts its price every single day.' },
      { id: 'friendly', name: 'Friendly', desc: 'Keeps its price high every day, whatever you do.' },
      { id: 'coin', name: 'Coin flip', desc: 'Picks high or low at random each day.' }
    ];
    function pwRivalMove(id, history, seed) {
      var h = Array.isArray(history) ? history : [];
      if (id === 'mirror') return h.length ? (h[h.length - 1].you === 'L' ? 'L' : 'H') : 'H';
      if (id === 'grudge') return h.some(function (r) { return r.you === 'L'; }) ? 'L' : 'H';
      if (id === 'cutthroat') return 'L';
      if (id === 'friendly') return 'H';
      // One stream per game, one draw per day. (Consecutive seeds made the
      // coin nearly alternate: this generator's k-th draws from seeds n and
      // n+1 differ by a fixed step.)
      var coin = seeded(num(seed, 1)), v = 0;
      for (var i = 0; i < h.length + 4; i++) v = coin();
      return v < 0.5 ? 'H' : 'L';
    }
    // Play one day: the rival decides from the history BEFORE seeing today's move.
    function pwPlay(game, you) {
      var g = game || {}, h = Array.isArray(g.history) ? g.history.slice() : [];
      var mine = you === 'L' ? 'L' : 'H', theirs = pwRivalMove(g.rival, h, g.seed);
      var pay = PRICE_WAR.pay[mine + theirs];
      h.push({ you: mine, rival: theirs, youEarn: pay[0], rivalEarn: pay[1] });
      return h;
    }
    // Which fixed-rule rivals would have played exactly these moves? If
    // several, the student's moves could not tell them apart.
    function pwConsistent(history) {
      var h = Array.isArray(history) ? history : [];
      return PW_RIVALS.filter(function (r) {
        if (r.id === 'coin') return false;
        for (var i = 0; i < h.length; i++) if (pwRivalMove(r.id, h.slice(0, i), 1) !== h[i].rival) return false;
        return true;
      }).map(function (r) { return r.id; });
    }
    function pwTotals(history) {
      var t = { you: 0, rival: 0 };
      // Recompute from the moves; a saved file's own numbers are not trusted.
      (Array.isArray(history) ? history : []).forEach(function (r) { var p = PRICE_WAR.pay[(r && r.you === 'L' ? 'L' : 'H') + (r && r.rival === 'L' ? 'L' : 'H')]; t.you += p[0]; t.rival += p[1]; });
      return t;
    }

    // ── Seeded RNG for anything that must be reproducible in tests ──
    function seeded(seed) {
      var s = (Math.abs(Math.round(num(seed, 1))) % 2147483646) + 1;
      return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    }

    return {
      num: num, clamp: clamp, seeded: seeded,
      pfTax: pfTax, pfBudget: pfBudget, pfState: pfState, lifeYear: lifeYear, pfMinLoanYr: pfMinLoanYr, pfMinCardYr: pfMinCardYr,
      PF_HOUSING: PF_HOUSING, PF_INSURANCE_MONTHLY: PF_INSURANCE_MONTHLY, PF_OTHER_MONTHLY: PF_OTHER_MONTHLY, PF_LOAN_APR: PF_LOAN_APR, PF_CARD_APR: PF_CARD_APR, PF_ASSETS: PF_ASSETS, PF_DOWN_PAYMENT: PF_DOWN_PAYMENT, pfYearReturn: pfYearReturn, pfSwitchHousing: pfSwitchHousing, pfDebtPayments: pfDebtPayments,
      LIFE_EVENTS: LIFE_EVENTS, pickLifeEvent: pickLifeEvent, lifeEventEligible: lifeEventEligible, sanitizeAiLifeEffect: sanitizeAiLifeEffect,
      sdOutcome: sdOutcome, sdPredict: sdPredict, SD_CASES: SD_CASES, SD_SCENARIOS: SD_SCENARIOS,
      BIZ_TEMPLATES: BIZ_TEMPLATES, BIZ_EVENTS: BIZ_EVENTS, bizEffectCash: bizEffectCash, BIZ_WEATHER: BIZ_WEATHER, bizNormalize: bizNormalize, bizDay: bizDay, bizDemandAt: bizDemandAt, bizBreakEven: bizBreakEven, bizExpected: bizExpected, bizRepFactor: bizRepFactor, bizMarketingLift: bizMarketingLift, sanitizeAiBizEffect: sanitizeAiBizEffect,
      CLASSIC_MARKET: CLASSIC_MARKET, STOCK_NEWS: STOCK_NEWS, stockNewsPick: stockNewsPick, stockDay: stockDay, classicMarket: classicMarket, sectorMove: sectorMove,
      MACRO_MISSIONS: MACRO_MISSIONS, missionById: missionById, evaluateMission: evaluateMission, missionCmp: missionCmp,
      TRADE_SCENARIOS: TRADE_SCENARIOS, tradeScenario: tradeScenario, tradeRandom: tradeRandom, tradeCompare: tradeCompare, tradeOutcome: tradeOutcome,
      cardPayoff: cardPayoff, cardMinPayment: cardMinPayment, PRICE_WAR: PRICE_WAR, PW_RIVALS: PW_RIVALS, pwRivalMove: pwRivalMove, pwPlay: pwPlay, pwTotals: pwTotals, pwConsistent: pwConsistent
    };
  })();

  // ── S&D picture as a pure function of its inputs ──
  // Animation frames call this with in-between curve positions, so it must
  // not read tool state. P: dShift, sShift, dSlope, sSlope, floor, ceiling,
  // tax (negative = subsidy), ext (negative = external benefit), probe, showRev.
  // Annotation labels are placed so they never overlap each other or run off
  // the canvas. The fonts are a fixed size, so on a phone-width canvas the
  // labels used to pile up on one another. A label keeps its spot when that
  // spot is free; otherwise it moves the fewest lines up or down.
  function econLabelPlacer(ctx, W, H) {
    var raw = ctx.fillText, placed = [];
    return {
      on: function () {
        ctx.fillText = function (text, x, y) {
          text = String(text);
          var m = /(\d+(?:\.\d+)?)px/.exec(String(ctx.font || ''));
          var fs = m ? parseFloat(m[1]) : 20;
          var mt = ctx.measureText ? ctx.measureText(text) : null;
          var w = mt && isFinite(mt.width) ? mt.width : text.length * fs * 0.55;
          var al = ctx.textAlign;
          var x0 = al === 'center' ? x - w / 2 : (al === 'right' || al === 'end') ? x - w : x;
          var shift = 0;
          if (x0 + w > W - 4) shift = (W - 4) - (x0 + w);
          if (x0 + shift < 4) shift = 4 - x0;
          var l = x0 + shift, r = l + w, lh = fs + 6;
          var hits = function (dy) {
            var top = y + dy - fs, bot = y + dy + fs * 0.3;
            if (top < 2 || bot > H - 2) return true;
            for (var i = 0; i < placed.length; i++) {
              var b = placed[i];
              if (l < b.r && r > b.l && top < b.b && bot > b.t) return true;
            }
            return false;
          };
          var tries = [0, lh, -lh, 2 * lh, -2 * lh, 3 * lh, -3 * lh], dy = 0;
          for (var k = 0; k < tries.length; k++) { if (!hits(tries[k])) { dy = tries[k]; break; } }
          placed.push({ l: l, r: r, t: y + dy - fs, b: y + dy + fs * 0.3 });
          raw.call(ctx, text, x + shift, y + dy);
        };
      },
      // Keep labels off a marker (a point the eye must still find).
      block: function (x, y, r) { placed.push({ l: x - r, r: x + r, t: y - r, b: y + r }); },
      off: function () {
        try { delete ctx.fillText; } catch (e) { /* not deletable */ }
        if (ctx.fillText !== raw) ctx.fillText = raw;
      }
    };
  }

  // Keyboard focus recovery. When a control the user just activated unmounts
  // or becomes disabled (Next Year, Check, Start...), the browser drops focus
  // to <body> and a keyboard user must tab back from the top. The shell
  // remembers the path to the last focused control; after each render, if
  // focus was lost, it goes back to the button that opened a panel that just
  // closed, or to the nearest control in the same section.
  var ECON_FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
  function econShellRef(node) {
    if (!node) return;
    window._econShell = node;
    if (node.__econFocusWired) return;
    node.__econFocusWired = true;
    node.addEventListener('focusin', function (e) {
      var trail = [];
      for (var n = e.target; n && n !== node.parentNode; n = n.parentNode) trail.push(n);
      node.__econTrail = trail;
      try { var r = e.target.getBoundingClientRect(); node.__econTop = r.top + (window.scrollY || 0); } catch (err) { node.__econTop = null; }
      if (e.target.hasAttribute && e.target.hasAttribute('aria-expanded')) node.__econOpener = e.target;
    });
  }
  function econRestoreFocus() {
    var shell = window._econShell;
    if (!shell || !shell.isConnected || !shell.__econTrail) return;
    var ae = document.activeElement;
    if (ae && ae !== document.body && ae !== document.documentElement) return;
    var last = shell.__econTrail[0];
    if (!last || (last.isConnected && !last.disabled)) return;
    var op = shell.__econOpener;
    if (op && op !== last && op.isConnected && !op.disabled && op.getAttribute('aria-expanded') === 'false') { op.focus(); return; }
    for (var i = 1; i < shell.__econTrail.length; i++) {
      var a = shell.__econTrail[i];
      if (!a.isConnected || !a.querySelectorAll) continue;
      var best = null, bestD = Infinity;
      Array.prototype.forEach.call(a.querySelectorAll(ECON_FOCUSABLE), function (c) {
        if (c.getClientRects && c.getClientRects().length === 0 && typeof c.getClientRects === 'function' && c.offsetParent === null && document.body.getClientRects().length) return;
        var top = 0;
        try { top = c.getBoundingClientRect().top + (window.scrollY || 0); } catch (err) { /* keep 0 */ }
        var dist = shell.__econTop == null ? 0 : Math.abs(top - shell.__econTop);
        if (dist < bestD) { best = c; bestD = dist; }
      });
      if (best) { best.focus(); return; }
    }
  }

  function econDrawSD(ctx, W, H, P) {
    var placer = econLabelPlacer(ctx, W, H);
    try { econDrawSDBody(ctx, W, H, P, placer); } finally { placer.off(); }
  }

  function econDrawSDBody(ctx, W, H, P, placer) {
    var E = ECON_ENGINE, num = E.num;
    var sdDemandShift = num(P.dShift, 0), sdSupplyShift = num(P.sShift, 0), sdDemSlope = num(P.dSlope, 0.8), sdSupSlope = num(P.sSlope, 0.8);
    var sdPriceFloor = num(P.floor, 0), sdPriceCeiling = num(P.ceiling, 0), sdTax = num(P.tax, 0), sdExt = num(P.ext, 0);
    var sdDemInt = 90 + sdDemandShift * 5, sdSupInt = 10 - sdSupplyShift * 5;
    var sdMono = !!P.monopoly;
    var sdOut = E.sdOutcome({ dShift: sdDemandShift, sShift: sdSupplyShift, dSlope: sdDemSlope, sSlope: sdSupSlope, tax: sdTax, ceiling: sdPriceCeiling, floor: sdPriceFloor, ext: sdExt, monopoly: sdMono });
    var sdBase = E.sdOutcome({ dSlope: sdDemSlope, sSlope: sdSupSlope });
    var d = { sdProbe: P.probe };
    var extOn = Math.abs(sdExt) > 0.01;
    // Marginal social cost / benefit: the private curves plus the external effect.
    var smcAt = function (q) { return sdSupInt + sdSupSlope * q + Math.max(0, sdExt); };
    var smbAt = function (q) { return sdDemInt - sdDemSlope * q + Math.max(0, -sdExt); };

    // ── Supply & Demand Graph ──

    // NB: the canvas is a 2x supersample (drawn at offsetWidth*2 / 500,
    // displayed at offsetWidth / 250), so font px here render at HALF
    // size on screen — all text in this draw pass uses ~2x sizes.

    var gx = 76, gy = 44, gw = W - 140, gh = H - 110;

    // Raw (unclamped) mapping for shapes drawn under a plot-area clip;
    // clamped mapping for markers and labels that must stay visible.

    var sdXr = function (q) { return gx + q / 100 * gw; };

    var sdYr = function (p) { return gy + (100 - p) / 100 * gh; };

    var sdX = function (q) { return sdXr(Math.max(0, Math.min(100, q))); };

    var sdY = function (p) { return sdYr(Math.max(0, Math.min(100, p))); };

    var sdPd = function (q) { return sdDemInt - sdDemSlope * q; };

    var sdPs = function (q) { return sdSupInt + sdSupSlope * q; };

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

    ctx.font = '18px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

    for (var li = 0; li <= 10; li++) {

      ctx.fillText((100 - li * 10).toString(), gx - 46, gy + li * gh / 10 + 6);

      ctx.fillText((li * 10).toString(), gx + li * gw / 10 - 10, gy + gh + 24);

    }

    // Everything after the axes is an annotation: place it clear of the others.
    if (placer) placer.on();

    var eqQ = (sdDemInt - sdSupInt) / (sdDemSlope + sdSupSlope);

    var eqP = sdSupInt + eqQ * sdSupSlope;

    var eqInRange = eqQ >= 0 && eqQ <= 100 && eqP >= 0 && eqP <= 100;

    // Welfare regions come from the same outcome the scoreboard reads:
    // consumer surplus (blue), producer surplus (red), tax revenue
    // (purple) and deadweight loss (amber) for whatever policy is on.
    // Linear curves make every region an exact polygon.

    ctx.save();

    ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();

    var wq = sdOut.q;

    if (wq > 0.05 && !P.showRev) {

      ctx.fillStyle = 'rgba(59,130,246,0.22)';

      ctx.beginPath(); ctx.moveTo(sdXr(0), sdYr(sdDemInt)); ctx.lineTo(sdXr(wq), sdYr(sdPd(wq))); ctx.lineTo(sdXr(wq), sdYr(sdOut.pc)); ctx.lineTo(sdXr(0), sdYr(sdOut.pc)); ctx.closePath(); ctx.fill();

      ctx.fillStyle = 'rgba(239,68,68,0.2)';

      ctx.beginPath(); ctx.moveTo(sdXr(0), sdYr(sdSupInt)); ctx.lineTo(sdXr(0), sdYr(sdOut.pp)); ctx.lineTo(sdXr(wq), sdYr(sdOut.pp)); ctx.lineTo(sdXr(wq), sdYr(sdPs(wq))); ctx.closePath(); ctx.fill();

      if (sdOut.pc - sdOut.pp > 0.05) {

        ctx.fillStyle = 'rgba(168,85,247,0.3)';

        ctx.fillRect(sdXr(0), sdYr(sdOut.pc), sdXr(wq) - sdXr(0), sdYr(sdOut.pp) - sdYr(sdOut.pc));

      } else if (sdOut.pp - sdOut.pc > 0.05) {

        // Subsidy: the government pays the gap between what sellers get and
        // what buyers pay on every unit traded.
        ctx.fillStyle = 'rgba(168,85,247,0.3)';
        ctx.fillRect(sdXr(0), sdYr(sdOut.pp), sdXr(wq) - sdXr(0), sdYr(sdOut.pc) - sdYr(sdOut.pp));
        ctx.setLineDash([6, 4]); ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2;
        ctx.strokeRect(sdXr(0), sdYr(sdOut.pp), sdXr(wq) - sdXr(0), sdYr(sdOut.pc) - sdYr(sdOut.pp)); ctx.setLineDash([]);

      }

    }

    if (sdOut.dwl > 0.5 && Math.abs(eqQ - wq) > 0.05 && !extOn && !P.showRev) {

      ctx.fillStyle = 'rgba(251,191,36,0.38)';

      ctx.beginPath(); ctx.moveTo(sdXr(wq), sdYr(sdPd(wq))); ctx.lineTo(sdXr(eqQ), sdYr(eqP)); ctx.lineTo(sdXr(wq), sdYr(sdPs(wq))); ctx.closePath(); ctx.fill();

      ctx.setLineDash([6, 4]); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);

    }

    // Market failure: the social deadweight loss lies between the social
    // benefit and social cost curves, from the market quantity to the
    // socially best one.

    if (extOn && sdOut.socialDwl > 0.5 && Math.abs(sdOut.qSoc - wq) > 0.05) {

      ctx.fillStyle = 'rgba(244,63,94,0.35)';

      ctx.beginPath(); ctx.moveTo(sdXr(sdOut.qSoc), sdYr(smbAt(sdOut.qSoc))); ctx.lineTo(sdXr(wq), sdYr(smbAt(wq))); ctx.lineTo(sdXr(wq), sdYr(smcAt(wq))); ctx.closePath(); ctx.fill();

      ctx.setLineDash([6, 4]); ctx.strokeStyle = '#fb7185'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);

    }

    // Before-shift curves: faint dashed D0/S0 so every shift reads as a
    // comparison, the way textbooks draw comparative statics.

    var sdShifted = sdDemandShift !== 0 || sdSupplyShift !== 0;

    ctx.lineWidth = 2.5; ctx.setLineDash([10, 8]);

    var sdCurve = function (pAt) {

      ctx.beginPath();

      for (var cq = 0; cq <= 100; cq += 1) { if (cq === 0) ctx.moveTo(sdXr(cq), sdYr(pAt(cq))); else ctx.lineTo(sdXr(cq), sdYr(pAt(cq))); }

      ctx.stroke();

    };

    if (sdDemandShift !== 0) { ctx.strokeStyle = 'rgba(147,197,253,0.55)'; sdCurve(function (q) { return 90 - sdDemSlope * q; }); }

    if (sdSupplyShift !== 0) { ctx.strokeStyle = 'rgba(252,165,165,0.55)'; sdCurve(function (q) { return 10 + sdSupSlope * q; }); }

    ctx.setLineDash([]);

    // Demand curve (downward sloping, shifted)

    ctx.save(); ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 8; ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3;

    sdCurve(sdPd);

    ctx.restore();

    // Supply curve (upward sloping, shifted)

    ctx.save(); ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 8; ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3;

    sdCurve(sdPs);

    ctx.restore();

    if (extOn) { ctx.save(); ctx.setLineDash([12, 6]); ctx.lineWidth = 3; ctx.strokeStyle = sdExt > 0 ? '#c084fc' : '#4ade80'; sdCurve(sdExt > 0 ? smcAt : smbAt); ctx.restore(); }

    ctx.restore();

    // Curve labels sit at each curve's VISIBLE right end: steep slopes
    // clip the curve where price leaves the chart mid-way.

    ctx.font = 'bold 24px Inter, system-ui';

    var dExitQ = Math.max(2, Math.min(100, sdDemInt / sdDemSlope));

    ctx.fillStyle = '#3b82f6';

    ctx.fillText('D' + (sdDemandShift !== 0 ? '₁' : ''), Math.max(gx + 8, sdXr(dExitQ) - 34), Math.max(gy + 24, Math.min(gy + gh - 10, sdYr(sdPd(dExitQ)) - 12)));

    var sExitQ = Math.max(2, Math.min(100, (100 - sdSupInt) / sdSupSlope));

    ctx.fillStyle = '#ef4444';

    ctx.fillText((sdMono ? 'MC' : 'S') + (sdSupplyShift !== 0 ? '₁' : ''), Math.max(gx + 8, sdXr(sExitQ) - (sdMono ? 64 : 34)), Math.max(gy + 24, Math.min(gy + gh - 10, sdYr(sdPs(sExitQ)) - 12)));

    if (sdDemandShift !== 0) { ctx.fillStyle = 'rgba(147,197,253,0.8)'; ctx.font = 'bold 20px Inter, system-ui'; ctx.fillText('D₀', sdX(Math.min(96, 90 / sdDemSlope)) - 30, sdY(90 - sdDemSlope * Math.min(96, 90 / sdDemSlope)) - 12); }

    if (sdSupplyShift !== 0) { var s0Q = Math.min(96, 90 / sdSupSlope); ctx.fillStyle = 'rgba(252,165,165,0.8)'; ctx.font = 'bold 20px Inter, system-ui'; ctx.fillText('S₀', sdX(s0Q) - 30, sdY(10 + sdSupSlope * s0Q) - 12); }

    // Old equilibrium and the move to the new one (ΔP on the price
    // axis, ΔQ on the quantity axis).

    if (sdShifted && sdBase.qStar <= 100 && sdBase.pStar <= 100) {

      ctx.strokeStyle = 'rgba(226,232,240,0.7)'; ctx.lineWidth = 2;

      ctx.beginPath(); ctx.arc(sdX(sdBase.qStar), sdY(sdBase.pStar), 7, 0, Math.PI * 2); ctx.stroke();

      ctx.font = 'bold 19px Inter, system-ui'; ctx.fillStyle = 'rgba(226,232,240,0.8)';

      ctx.fillText('E₀', sdX(sdBase.qStar) + 10, sdY(sdBase.pStar) + 24);

      if (eqInRange) {

        var sdArrow = function (x1, y1, x2, y2, col) {

          if (Math.abs(x2 - x1) + Math.abs(y2 - y1) < 6) return;

          ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3;

          ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

          var ang = Math.atan2(y2 - y1, x2 - x1);

          ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 14 * Math.cos(ang - 0.45), y2 - 14 * Math.sin(ang - 0.45)); ctx.lineTo(x2 - 14 * Math.cos(ang + 0.45), y2 - 14 * Math.sin(ang + 0.45)); ctx.closePath(); ctx.fill();

        };

        var dP = eqP - sdBase.pStar, dQ = eqQ - sdBase.qStar;

        sdArrow(gx + 14, sdY(sdBase.pStar), gx + 14, sdY(eqP), '#fbbf24');

        sdArrow(sdX(sdBase.qStar), gy + gh - 14, sdX(eqQ), gy + gh - 14, '#fbbf24');

        ctx.font = 'bold 19px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

        if (Math.abs(dP) >= 0.5) ctx.fillText('ΔP ' + (dP > 0 ? '+' : '−') + '$' + Math.abs(dP).toFixed(1), gx + 26, (sdY(sdBase.pStar) + sdY(eqP)) / 2 + 7);

        if (Math.abs(dQ) >= 0.5) ctx.fillText('ΔQ ' + (dQ > 0 ? '+' : '−') + Math.abs(dQ).toFixed(1), Math.min(gx + gw - 110, Math.min(sdX(sdBase.qStar), sdX(eqQ)) + 6), gy + gh - 26);

      }

    }

    // Clamp the marker/labels to the plot box so extreme slider shifts don't draw them off-canvas

    var eqPx = sdX(eqQ);

    var eqPy = sdY(eqP);

    // Dashed lines to axes

    ctx.setLineDash([5, 5]); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;

    ctx.beginPath(); ctx.moveTo(eqPx, eqPy); ctx.lineTo(gx, eqPy); ctx.stroke();

    ctx.beginPath(); ctx.moveTo(eqPx, eqPy); ctx.lineTo(eqPx, gy + gh); ctx.stroke();

    ctx.setLineDash([]);

    // Equilibrium dot

    ctx.beginPath(); ctx.arc(eqPx, eqPy, 8, 0, Math.PI * 2);
    if (placer) placer.block(eqPx, eqPy, 12);

    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 14; ctx.fillStyle = '#fbbf24'; ctx.fill(); ctx.shadowBlur = 0;

    ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();

    ctx.font = 'bold 22px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

    ctx.fillText((sdShifted ? 'E₁' : 'E') + (sdMono ? ' (if competitive)' : ''), eqPx + 14, eqPy - 10);

    ctx.font = '19px Inter, system-ui';

    ctx.fillText((sdMono ? 'competitive P* = $' : 'P* = $') + eqP.toFixed(0), gx + 8, Math.max(gy + 20, eqPy - 8));

    ctx.fillText('Q* = ' + eqQ.toFixed(0), Math.min(gx + gw - 100, eqPx + 12), gy + gh - 12);

    if (!eqInRange) { ctx.fillStyle = '#fbbf24'; ctx.font = '18px Inter, system-ui'; ctx.fillText('Equilibrium is off the chart — reduce the shift sliders', gx + 10, gy + 24); }

    // Region labels sit inside their own polygons.

    if (wq > 18 && !P.showRev) {

      ctx.font = 'bold 20px Inter, system-ui';

      ctx.fillStyle = 'rgba(191,219,254,0.95)';

      // Centered in each region, clear of the P* label at the left edge.

      var lblQ = wq * 0.5;

      ctx.fillText('CS', sdX(lblQ) - 14, (sdY(sdOut.pc) + sdY(sdPd(lblQ))) / 2 + 7);

      ctx.fillStyle = 'rgba(254,202,202,0.95)';

      if (sdOut.pp - sdPs(lblQ) > 6) ctx.fillText('PS', sdX(lblQ) - 14, (sdY(sdOut.pp) + sdY(sdPs(lblQ))) / 2 + 7);

      if (sdOut.gov > 50) { ctx.fillStyle = 'rgba(233,213,255,0.95)'; ctx.fillText('Tax $', sdX(wq * 0.5) - 26, (sdY(sdOut.pc) + sdY(sdOut.pp)) / 2 + 7); }
      else if (sdOut.gov < -50) { ctx.fillStyle = 'rgba(233,213,255,0.95)'; ctx.fillText('Subsidy cost', sdX(wq * 0.5) - 56, (sdY(sdOut.pc) + sdY(sdOut.pp)) / 2 + 7); }

    }

    if (sdOut.dwl > 40 && Math.abs(eqQ - wq) > 7 && !extOn && !P.showRev) {

      ctx.font = 'bold 19px Inter, system-ui'; ctx.fillStyle = '#fde68a';

      ctx.fillText('DWL', (sdX(wq) * 2 + eqPx) / 3 - 4, (sdY(sdPd(wq)) + sdY(sdPs(wq)) + eqPy) / 3 + 7);

    }

    // Price floor

    if (sdPriceFloor > 0) {

      var pfY = sdY(sdPriceFloor);

      ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.setLineDash([8, 4]);

      ctx.beginPath(); ctx.moveTo(gx, pfY); ctx.lineTo(gx + gw, pfY); ctx.stroke();

      ctx.setLineDash([]); ctx.fillStyle = '#22c55e'; ctx.font = 'bold 19px Inter, system-ui';

      ctx.fillText('Price Floor $' + sdPriceFloor, gx + gw - 240, pfY - 10);

      if (sdOut.regime === 'floor' && sdOut.qs - sdOut.qd > 0.5 && !sdMono) {

        // Mark Qd and Qs where sdOutcome puts them (buyers at the floor,
        // sellers at the floor minus any tax) and quantify the unsold surplus.

        var fQd = Math.max(0, Math.min(100, sdOut.qd));

        var fQs = Math.max(0, Math.min(100, sdOut.qs));

        var fXd = sdX(fQd), fXs = sdX(fQs);

        ctx.fillStyle = '#22c55e';

        ctx.beginPath(); ctx.arc(fXd, pfY, 6, 0, Math.PI * 2); ctx.fill();

        ctx.beginPath(); ctx.arc(fXs, pfY, 6, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;

        ctx.beginPath(); ctx.moveTo(fXd, pfY); ctx.lineTo(fXs, pfY); ctx.stroke();

        ctx.font = 'bold 19px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

        ctx.textAlign = 'center';

        ctx.fillText('⚠ SURPLUS ≈ ' + Math.max(0, fQs - fQd).toFixed(0) + ' units: sellers offer more than buyers take (Qs > Qd)', (fXd + fXs) / 2, Math.max(gy + 22, pfY - 34));

        ctx.textAlign = 'left';

      }

    }

    // Price ceiling

    if (sdPriceCeiling > 0) {

      var pcY = sdY(sdPriceCeiling);

      ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.setLineDash([8, 4]);

      ctx.beginPath(); ctx.moveTo(gx, pcY); ctx.lineTo(gx + gw, pcY); ctx.stroke();

      ctx.setLineDash([]); ctx.fillStyle = '#f97316'; ctx.font = 'bold 19px Inter, system-ui';

      ctx.fillText('Price Ceiling $' + sdPriceCeiling, gx + gw - 260, pcY + 26);

      if (sdOut.regime === 'ceiling' && sdOut.qd - sdOut.qs > 0.5) {

        // Mark Qs and Qd where sdOutcome puts them and quantify the unmet demand.

        var cQd = Math.max(0, Math.min(100, sdOut.qd));

        var cQs = Math.max(0, Math.min(100, sdOut.qs));

        var cXd = sdX(cQd), cXs = sdX(cQs);

        ctx.fillStyle = '#f97316';

        ctx.beginPath(); ctx.arc(cXd, pcY, 6, 0, Math.PI * 2); ctx.fill();

        ctx.beginPath(); ctx.arc(cXs, pcY, 6, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;

        ctx.beginPath(); ctx.moveTo(cXs, pcY); ctx.lineTo(cXd, pcY); ctx.stroke();

        ctx.font = 'bold 19px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

        ctx.textAlign = 'center';

        ctx.fillText('⚠ SHORTAGE ≈ ' + Math.max(0, cQd - cQs).toFixed(0) + ' units unmet (Qd > Qs)', (cXs + cXd) / 2, Math.min(gy + gh - 12, pcY + 52));

        ctx.textAlign = 'left';

      }

    }

    // Tax wedge

    if (sdTax !== 0) {

      // Real tax geometry (linear curves make this exact): trades fall to
      // Qt where the curves are $tax apart; buyers pay Pd(Qt), sellers
      // keep Ps(Qt); the shaded amber triangle from Qt to Q* is the
      // deadweight loss.

      var txQ = sdOut.q;

      var txPd = sdOut.pc;

      var txPs = sdOut.pp;

      var txX = sdX(txQ);

      if (eqInRange && txQ > 0) {

        ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 4;

        ctx.beginPath(); ctx.moveTo(txX, sdY(txPd)); ctx.lineTo(txX, sdY(txPs)); ctx.stroke();

        ctx.fillStyle = '#d8b4fe'; ctx.font = 'bold 19px Inter, system-ui';

        // With a subsidy the price sellers receive sits ABOVE what buyers pay.
        ctx.fillText('Buyers pay $' + txPd.toFixed(0), Math.max(gx + 8, txX - 220), sdY(txPd) + (sdTax > 0 ? -10 : 26));

        ctx.fillText('Sellers get $' + txPs.toFixed(0), Math.max(gx + 8, txX - 220), sdY(txPs) + (sdTax > 0 ? 26 : -10));

        ctx.font = '18px Inter, system-ui';

        ctx.fillText((sdTax > 0 ? 'Tax $' + sdTax + ': trades fall ' : 'Subsidy $' + (-sdTax) + ': trades rise ') + (sdMono ? E.sdOutcome({ dShift: sdDemandShift, sShift: sdSupplyShift, dSlope: sdDemSlope, sSlope: sdSupSlope, monopoly: true }).q : eqQ).toFixed(0) + ' → ' + txQ.toFixed(0), Math.min(txX + 14, gx + gw - 420), gy + 46);

      }

    }

    // Market power: marginal revenue falls twice as fast as demand. The
    // monopolist produces where MR meets MC and prices off the demand curve.
    if (sdMono) {
      var mrAt = function (q) { return sdDemInt - 2 * sdDemSlope * q; };
      var mrEnd = Math.min(100, sdDemInt / (2 * sdDemSlope));
      ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
      ctx.setLineDash([10, 6]); ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(sdXr(0), sdYr(mrAt(0))); ctx.lineTo(sdXr(mrEnd), sdYr(mrAt(mrEnd))); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      ctx.font = 'bold 20px Inter, system-ui'; ctx.fillStyle = '#7dd3fc';
      ctx.fillText('MR', sdX(Math.min(mrEnd, 92)) - 34, sdY(Math.max(2, mrAt(Math.min(mrEnd, 92)))) - 10);
      var mq = sdOut.qMono, mp = sdDemInt - sdDemSlope * mq, mc = sdPs(mq) + sdTax;
      if (sdOut.regime === 'monopoly' || sdOut.regime === 'tax' || sdOut.regime === 'subsidy') {
        ctx.setLineDash([4, 4]); ctx.strokeStyle = '#e9d5ff'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sdX(mq), sdY(mc)); ctx.lineTo(sdX(mq), sdY(mp)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#7dd3fc'; ctx.beginPath(); ctx.arc(sdX(mq), sdY(mc), 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f0abfc'; ctx.beginPath(); ctx.arc(sdX(mq), sdY(mp), 9, 0, Math.PI * 2); ctx.fill();
        if (placer) placer.block(sdX(mq), sdY(mp), 13);
        ctx.font = 'bold 20px Inter, system-ui'; ctx.fillStyle = '#f0abfc';
        ctx.fillText('M: one seller charges $' + mp.toFixed(0), sdX(mq) + 14, sdY(mp) - 12);
        ctx.font = '18px Inter, system-ui'; ctx.fillStyle = '#e9d5ff';
        ctx.fillText((sdTax > 0 ? 'MR = MC + tax at Q ' : sdTax < 0 ? 'MR = MC − subsidy at Q ' : 'MR = MC at Q ') + mq.toFixed(0), sdX(mq) + 12, sdY(mc) + 26);
      }
    }

    // Curve probe: click the canvas (or focus it and use arrow keys)
    // to read marginal value vs marginal cost at any quantity — the
    // "should society produce this unit?" question made tangible.

    if (d.sdProbe !== null && d.sdProbe !== undefined) {

      var prQ = Math.max(0, Math.min(100, num(d.sdProbe, 50)));

      var prPd = sdPd(prQ);

      var prPs = sdPs(prQ);

      var prX = sdX(prQ);

      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);

      ctx.beginPath(); ctx.moveTo(prX, gy); ctx.lineTo(prX, gy + gh); ctx.stroke(); ctx.setLineDash([]);

      ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(prX, sdY(prPd), 7, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(prX, sdY(prPs), 7, 0, Math.PI * 2); ctx.fill();

      ctx.font = 'bold 19px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

      var prVerdict = prPd > prPs ? 'worth producing (value > cost)' : 'NOT worth producing (cost > value)';
      if (extOn) { var prSb = smbAt(prQ), prSc = smcAt(prQ); prVerdict = (sdExt > 0 ? 'cost to society $' + Math.max(0, prSc).toFixed(0) : 'value to society $' + Math.max(0, prSb).toFixed(0)) + ' — ' + (prSb > prSc ? 'worth it for society' : 'NOT worth it for society'); }

      ctx.fillText('Q=' + prQ + ': buyers value $' + Math.max(0, prPd).toFixed(0) + ', producer cost $' + Math.max(0, prPs).toFixed(0) + ' — ' + prVerdict, gx + 10, gy + gh - 44);

    }

    // Market failure labels: the social curve and the social optimum S*.

    if (extOn) {

      var sq = sdOut.qSoc, sp = smbAt(sq);

      var lblQ2 = Math.min(90, Math.max(10, sq + 22));

      ctx.font = 'bold 19px Inter, system-ui'; ctx.fillStyle = sdExt > 0 ? '#d8b4fe' : '#86efac';

      ctx.fillText(sdExt > 0 ? 'MSC = S + external cost' : 'MSB = D + external benefit', Math.min(gx + gw - 250, sdX(lblQ2)), sdY((sdExt > 0 ? smcAt : smbAt)(lblQ2)) - 14);

      if (sq > 0 && sq < 100 && sp > 0 && sp < 100) {

        ctx.strokeStyle = '#fda4af'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sdX(sq), sdY(sp), 9, 0, Math.PI * 2); ctx.stroke();
        if (placer) placer.block(sdX(sq), sdY(sp), 13);

        ctx.fillStyle = '#fda4af'; ctx.fillText('S* best for society', Math.max(gx + 8, sdX(sq) - 205), sdY(sp) - 16);

      }

      if (sdOut.socialDwl > 40) { ctx.fillStyle = '#fecdd3'; ctx.fillText('Social DWL', (sdX(sq) + 2 * sdX(wq)) / 3 - 40, (sdY(smbAt(sq)) + sdY(smbAt(wq)) + sdY(smcAt(wq))) / 3 + 7); }

    }

    // Revenue view: total revenue is the rectangle price × quantity, and
    // the point elasticity of demand there says which way it moves.

    if (P.showRev && sdOut.q > 0.05) {

      var rq = sdOut.q, rp = sdOut.pc;

      ctx.fillStyle = 'rgba(74,222,128,0.16)'; ctx.fillRect(sdX(0), sdY(rp), sdX(rq) - sdX(0), sdY(0) - sdY(rp));

      ctx.setLineDash([8, 5]); ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2; ctx.strokeRect(sdX(0), sdY(rp), sdX(rq) - sdX(0), sdY(0) - sdY(rp)); ctx.setLineDash([]);

      ctx.font = 'bold 20px Inter, system-ui'; ctx.fillStyle = '#bbf7d0';

      ctx.fillText((Math.abs(sdOut.pc - sdOut.pp) > 0.05 ? 'Buyers spend $' : 'Revenue = $') + rp.toFixed(0) + ' × ' + rq.toFixed(0) + ' = $' + Math.round(rp * rq).toLocaleString(), sdX(0) + 12, (sdY(rp) + sdY(0)) / 2 + 30);

      // Elasticity is a property of the demand curve at the price buyers pay
      // (under a binding ceiling the traded quantity is off that curve).
      var elas = (rp / Math.max(0.01, (sdDemInt - rp) / sdDemSlope)) / sdDemSlope;

      ctx.fillText('|Ed| here = ' + elas.toFixed(2) + (elas > 1.05 ? ' (elastic)' : elas < 0.95 ? ' (inelastic)' : ' (unit elastic)'), Math.min(gx + gw - 330, sdX(rq) + 16), Math.max(gy + 60, sdY(rp) - 40));

    }

  }

  // Glide the S&D curves to a new position instead of jumping (skipped when
  // the reader prefers reduced motion, checked every time a glide starts).
  var econSdAnim = { shown: null, to: null, from: null, start: 0, raf: 0, canvas: null };
  var SD_TWEEN_KEYS = ['dShift', 'sShift', 'dSlope', 'sSlope', 'ext'];
  function econReducedMotion() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function econSdPaint(canvas, P) {
    var c2 = canvas.getContext && canvas.getContext('2d');
    if (!c2) return;
    var W = (canvas.offsetWidth || 600) * 2;
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== 500) canvas.height = 500;
    c2.setTransform(1, 0, 0, 1, 0, 0);
    c2.clearRect(0, 0, canvas.width, canvas.height);
    econDrawSD(c2, canvas.width, 500, P);
  }
  function econSdBlend(snap, tween) {
    var P = Object.assign({}, snap);
    SD_TWEEN_KEYS.forEach(function (k) { P[k] = tween[k]; });
    return P;
  }
  function econSdFrame(now) {
    var A = econSdAnim;
    A.raf = 0;
    if (!A.canvas || A.canvas.isConnected === false) return;
    var p = Math.min(1, (now - A.start) / 450), e = 1 - Math.pow(1 - p, 3);
    var P = Object.assign({}, A.to);
    SD_TWEEN_KEYS.forEach(function (k) { P[k] = A.from[k] + (A.to[k] - A.from[k]) * e; });
    econSdPaint(A.canvas, P);
    A.shown = P;
    if (p < 1) A.raf = requestAnimationFrame(econSdFrame);
  }
  function econAnimateSD(canvas, target) {
    var A = econSdAnim;
    var moved = !A.to || SD_TWEEN_KEYS.some(function (k) { return A.to[k] !== target[k]; });
    var canGlide = !!A.shown && A.canvas === canvas && typeof requestAnimationFrame === 'function' && !econReducedMotion();
    if (moved && canGlide) {
      A.from = econSdBlend(target, A.shown);
      A.to = target;
      A.start = (window.performance && performance.now) ? performance.now() : Date.now();
      econSdPaint(canvas, A.from);
      if (!A.raf) A.raf = requestAnimationFrame(econSdFrame);
      return;
    }
    if (!moved && A.raf) { A.to = target; econSdPaint(canvas, econSdBlend(target, A.shown)); return; }
    if (A.raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(A.raf);
    A.raf = 0; A.canvas = canvas; A.to = target; A.shown = target;
    econSdPaint(canvas, target);
  }

  window.StemLab.registerTool('economicsLab', {
    icon: "💹",
    label: "Economics Lab",
    desc: "Explore economics through supply & demand curves, personal finance, stock-market, business, and macro-policy simulations.",
    color: 'slate',
    category: 'science',
    _engine: ECON_ENGINE,
    _drawSD: econDrawSD,
    questHooks: [
      { id: 'explore_supply_demand', label: 'Explore supply and demand curves', icon: '\uD83D\uDCC8', check: function(d) { return (d.sdDemandShift || 0) !== 0 || (d.sdSupplyShift || 0) !== 0; }, progress: function(d) { return (d.sdDemandShift || d.sdSupplyShift) ? 'Exploring!' : 'Shift a curve'; } },
      { id: 'set_price_control', label: 'Set a price floor or ceiling', icon: '\uD83D\uDCB0', check: function(d) { return (d.sdPriceFloor || 0) > 0 || (d.sdPriceCeiling || 0) > 0; }, progress: function(d) { return (d.sdPriceFloor || d.sdPriceCeiling) ? 'Set!' : 'Not yet'; } },
      { id: 'explore_3_tabs', label: 'Explore 3 economics topics', icon: '\uD83C\uDF0D', check: function(d) { return Object.keys(d.tabsViewed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.tabsViewed || {}).length + '/3 topics'; } },
      { id: 'investor_profile', label: 'Discover your investor profile', icon: '\uD83E\uDDED', check: function(d) { return !!d.paQuizDone; }, progress: function(d) { return d.paQuizDone ? 'Profiled!' : 'Take the quiz'; } }
    ],
    render: function(ctx) {
      // Data hues (#3b82f6, #22c55e, ...) are painted as TEXT on theme grounds and
      // as bar grounds under white labels; neither passes AA as-is in either
      // theme. ecoInk() picks the readable partner per theme; ecoBarBg() deepens
      // a bar ground enough for white ink.
      // ★ Contrast counts as dark HERE: ecoInk() picks ink for text on the
      // THEME ground, and that ground is black in the contrast theme, where the
      // light partners ran 2.7-3.0:1. Cards that stay white in every theme go
      // through ecoInkOnWhite() instead, so they are unaffected.
      var ecoDark = !!ctx.isDark || ctx.theme === 'dark' || !!ctx.isContrast;
      var ECO_INK_LIGHT = { '#b45309': '#92400e', '#15803d': '#166534', '#f97316': '#c2410c', '#16a34a': '#166534', '#3b82f6': '#1d4ed8', '#22c55e': '#166534', '#f59e0b': '#92400e', '#ef4444': '#b91c1c', '#8b5cf6': '#6d28d9', '#dc2626': '#b91c1c', '#10b981': '#047857', '#06b6d4': '#0e7490', '#a855f7': '#7e22ce', '#ec4899': '#be185d' };
      var ECO_INK_DARK = { '#b45309': '#fcd34d', '#15803d': '#86efac', '#f97316': '#fdba74', '#16a34a': '#86efac', '#3b82f6': '#93c5fd', '#22c55e': '#86efac', '#f59e0b': '#fcd34d', '#ef4444': '#fca5a5', '#8b5cf6': '#c4b5fd', '#dc2626': '#fca5a5', '#10b981': '#6ee7b7', '#06b6d4': '#67e8f9', '#a855f7': '#c4b5fd', '#ec4899': '#f9a8d4' };
      // Some cards (business cycle, market structures) stay WHITE in dark theme: their
      // inks always take the light partner.
      // ★ 'On white' stops being true in the contrast theme: app_styles_module.js
      // rewrites every inline light background to #000 !important there ('so forced
      // yellow text remains readable'), and these hues are not in its companion
      // forced-yellow list - so the card went black and kept its dark ink, 2.7-3.0:1.
      var ecoInkOnWhite = function (hex) { if (typeof hex !== 'string') return hex; if (ctx.isContrast) return ECO_INK_DARK[hex.toLowerCase()] || hex; return ECO_INK_LIGHT[hex.toLowerCase()] || hex; };
      var ecoInk = function (hex) { if (typeof hex !== 'string') return hex; var k = hex.toLowerCase(); return (ecoDark ? ECO_INK_DARK[k] : ECO_INK_LIGHT[k]) || hex; };
      var ECO_BAR_BG = { '#f97316': '#c2410c', '#3b82f6': '#1d4ed8', '#22c55e': '#15803d', '#f59e0b': '#b45309', '#ef4444': '#b91c1c', '#8b5cf6': '#6d28d9' };
      var ecoBarBg = function (hex) { return (typeof hex === 'string' && ECO_BAR_BG[hex.toLowerCase()]) || hex; };
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

      // ── Tool body (economicsLab) ──
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

          // Several keys in one state write.
          var updMany = function (obj) { setLabToolData(function (p) { return Object.assign({}, p, obj); }); };

          // For AI replies that arrive later: write only if the state they were
          // requested for is still current (the student may have reset or moved on).
          var updIf = function (stillCurrent, obj) { setLabToolData(function (p) { return stillCurrent(p || {}) ? Object.assign({}, p, obj) : p; }); };

          var E = ECON_ENGINE;

          var num = E.num;

          // AI is optional: the host passes callGemini === null to QR-joined
          // students, and every sim below has a built-in path without it.
          var econAI = typeof callGemini === 'function';

          var econAsk = function (prompt) {
            return new Promise(function (resolve, reject) {
              if (typeof callGemini !== 'function') { reject(new Error('AI unavailable')); return; }
              try { Promise.resolve(callGemini(prompt, true)).then(resolve, reject); } catch (err) { reject(err); }
            });
          };

          var econParseJSON = function (result) {
            var cleaned = String(result == null ? '' : result).replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            var s0 = cleaned.indexOf('{'); if (s0 > 0) cleaned = cleaned.substring(s0);
            var e0 = cleaned.lastIndexOf('}'); if (e0 > 0) cleaned = cleaned.substring(0, e0 + 1);
            var parsed = JSON.parse(cleaned);
            if (!parsed || typeof parsed !== 'object') throw new Error('AI reply was not an object');
            return parsed;
          };

          // Loading flags hold a start time. A saved `true`, or a request that
          // never came back, used to disable its button forever, even after a reload.
          var econBusy = function (v) { return typeof v === 'number' && Date.now() - v < 45000; };

          // AI text and saved text are rendered as React children; anything that
          // is not a string or number would throw.
          var econStr = function (v, max) { return (typeof v === 'string' ? v : (typeof v === 'number' && isFinite(v)) ? String(v) : '').slice(0, max || 600); };

          var econFmt = function (v) { var n = Math.round(num(v, 0)); return (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString(); };

          var econTab = d.econTab || 'supplyDemand';

          if (!window._econCanvasRef) window._econCanvasRef = { current: null };

          var canvasRef = window._econCanvasRef;



          // ── Supply & Demand State ──

          var sdDemandShift = E.clamp(num(d.sdDemandShift, 0), -5, 5);

          var sdSupplyShift = E.clamp(num(d.sdSupplyShift, 0), -5, 5);

          var sdPriceFloor = E.clamp(num(d.sdPriceFloor, 0), 0, 90);

          var sdPriceCeiling = E.clamp(num(d.sdPriceCeiling, 0), 0, 90);

          // Positive = per-unit tax, negative = per-unit subsidy.
          var sdTax = E.clamp(num(d.sdTax, 0), -30, 30);

          // External cost per unit (pollution); negative = external benefit.
          var sdExt = E.clamp(num(d.sdExt, 0), -20, 30);

          // Curve slopes = elasticity levers. Flat (0.3) = elastic, steep (1.5)
          // = inelastic. Every S&D formula below (equilibrium, floor/ceiling
          // markers, tax wedge, probe, canvas summary) derives from these two —
          // change them TOGETHER or the graph and its annotations disagree.

          var sdDemSlope = E.clamp(num(d.sdDemSlope, 0.8), 0.3, 1.5);

          var sdSupSlope = E.clamp(num(d.sdSupSlope, 0.8), 0.3, 1.5);

          // Curve intercepts. A POSITIVE shift is an increase: demand moves up
          // and right; supply moves DOWN and right (more offered at every price).
          // The supply sign used to be flipped, so "Supply +3" drew a supply
          // DECREASE while the text beside it said price falls.

          var sdDemInt = 90 + sdDemandShift * 5;

          var sdSupInt = 10 - sdSupplyShift * 5;

          var sdMonopoly = !!d.sdMonopoly;
          var sdOut = E.sdOutcome({ dShift: sdDemandShift, sShift: sdSupplyShift, dSlope: sdDemSlope, sSlope: sdSupSlope, tax: sdTax, ceiling: sdPriceCeiling, floor: sdPriceFloor, ext: sdExt, monopoly: sdMonopoly });

          // The pre-shift market, for before/after comparisons.

          var sdBase = E.sdOutcome({ dSlope: sdDemSlope, sSlope: sdSupSlope });



          // ── Personal Finance Life Sim State ──
          // One normalized state feeds the budget, the pie, the yearly step and
          // the ledger, so they can never disagree about where money goes.

          var pfLifeIn = { age: d.pfAge, cash: d.pfCash, debt: d.pfDebt, salary: d.pfSalary, happiness: d.pfHappiness, credit: d.pfCredit, invested: d.pfInvested, equity: d.pfEquity, housing: d.pfHousing, insurance: d.pfInsurance, investPct: d.pfInvestPct, investType: d.pfInvestType, food: d.pfFood, transport: d.pfTransport, fun: d.pfFun, extraDebtPay: d.pfExtraDebt, matchPct: d.pfMatch, card: d.pfCard, carValue: d.pfCar, carDep: d.pfCarDep, rebound: d.pfRebound };

          var pfLife = E.pfState(pfLifeIn);

          var pfBud = E.pfBudget(pfLifeIn);

          var pfAge = pfLife.age;

          var pfCash = pfLife.cash;

          var pfDebt = pfLife.debt;

          var pfSalary = pfLife.salary;

          var pfHappiness = pfLife.happiness;

          var pfIncome = Math.round(pfSalary / 12);

          // Compound interest calculator state (was missing)
          var pfPrincipal = E.clamp(num(d.pfPrincipal, 1000), 100, 50000);
          var pfRate = E.clamp(num(d.pfRate, 7), 1, 15);
          var pfYears = Math.round(E.clamp(num(d.pfYears, 30), 1, 50));



          // ── Stock Market State ──

          var smCash = num(d.smCash, 10000);

          var smPortfolio = (d.smPortfolio && typeof d.smPortfolio === 'object' && !Array.isArray(d.smPortfolio)) ? d.smPortfolio : {};

          var smCost = (d.smCost && typeof d.smCost === 'object' && !Array.isArray(d.smCost)) ? d.smCost : {};

          var smDay = Math.max(0, Math.round(num(d.smDay, 0)));

          var smCompanies = Array.isArray(d.smCompanies) ? d.smCompanies.filter(function (c) { return c && typeof c === 'object' && typeof c.ticker === 'string' && typeof c.price === 'number' && isFinite(c.price); }) : [];

          var smSelected = Math.round(E.clamp(num(d.smSelected, 0), 0, Math.max(0, smCompanies.length - 1)));

          var smNews = typeof d.smNews === 'string' ? d.smNews : null;



          // ── Entrepreneur State ──

          // Legacy lemonade-stand state (enDay/enCash/enPrice/enCups/enAdBudget/
          // enWeather/enHistory) removed — the live sim is d.enBusiness + enBiz*.

          var enBiz = (d.enBusiness && typeof d.enBusiness === 'object') ? E.bizNormalize(d.enBusiness) : null;

          var enCash = num(d.enBizCash, 0);

          var enRep = E.clamp(num(d.enBizRep, 50), 0, 100);

          var enDay = Math.max(1, Math.round(num(d.enBizDay, 1)));

          var enStaff = Math.round(E.clamp(num(d.enBizEmployees, 0), 0, 20));

          var enMarketing = E.clamp(num(d.enBizMarketing, 0), 0, 100000);

          var enPrice = enBiz ? E.clamp(num(d.enBizPrice, enBiz.suggestedPrice), 0.5, enBiz.suggestedPrice * 3) : 10;

          var enAdj = { unitCostAdj: num(d.enBizUnitCostAdj, 1), fixedAdj: num(d.enBizFixedAdj, 1), demandAdj: num(d.enBizDemandAdj, 1), quality: E.clamp(num(d.enBizQuality, 0), -30, 30) };

          var enHistory = Array.isArray(d.enBizHistory) ? d.enBizHistory.filter(function (h) { return h && typeof h === 'object'; }) : [];



          // ── National Economy (Macro) State ──

          var macroGDP = num(d.macroGDP, 2.1);

          var macroInflation = num(d.macroInflation, 3.2);

          var macroInterest = num(d.macroInterest, 5.25);

          var macroUnemployment = num(d.macroUnemployment, 3.8);

          var macroTrade = num(d.macroTrade, -0.5);

          var macroYear = Math.round(num(d.macroYear, 2025));

          var macroHistory = Array.isArray(d.macroHistory) ? d.macroHistory.filter(function (h) { return h && typeof h === 'object' && typeof h.gdp === 'number' && typeof h.inflation === 'number'; }) : [];



          // ── Achievement Tracking ──

          // Net worth = liquid cash + home equity + investment portfolio − debt.
          // The "Net worth" achievements check this, not raw cash, so investing
          // and homeownership count toward them (they are assets, not losses).
          // Total debt = installment loans + credit-card balance.
          var pfDebtAll = pfDebt + pfLife.card;

          var pfNetWorth = pfCash + pfLife.equity + pfLife.invested + pfLife.carValue - pfDebtAll;

          var smTotalVal = smCash + smCompanies.reduce(function (s, c) { return s + num(smPortfolio[c.ticker], 0) * c.price; }, 0);

          var lastMacroYr = macroHistory[macroHistory.length - 1];

          var econGlossaryList = Array.isArray(d.econGlossary) ? d.econGlossary.filter(function (g) { return g && typeof g === 'object'; }) : [];

          var conceptsLearned = econGlossaryList.length;

          var sdDet = (d.sdDet && typeof d.sdDet === 'object') ? d.sdDet : {};

          // ── Price war state (a saved file may hold anything) ──
          var pwIds = E.PW_RIVALS.map(function (r) { return r.id; });
          var pwGame = (d.pwGame && typeof d.pwGame === 'object' && pwIds.indexOf(d.pwGame.rival) !== -1) ? d.pwGame : null;
          var pwHist = pwGame && Array.isArray(pwGame.history) ? pwGame.history.filter(function (r) { return r && (r.you === 'H' || r.you === 'L') && (r.rival === 'H' || r.rival === 'L'); }).slice(0, E.PRICE_WAR.days) : [];
          var pwStats = (d.pwStats && typeof d.pwStats === 'object') ? d.pwStats : {};

          // ── Trade Lab state ──
          var tradeScenId = ['island', 'better_at_both', 'countries', 'random'].indexOf(d.tradeScenId) !== -1 ? d.tradeScenId : 'island';
          var tradeSeed = Math.abs(Math.round(num(d.tradeSeed, 1))) || 1;
          var tradeSc = E.tradeScenario(tradeScenId, tradeSeed);
          var tradeH = tradeSc.hours;
          var tradeCmp = E.tradeCompare(tradeSc);
          var tradeHA0 = E.clamp(Math.round(num(d.tradeHA0, tradeH / 2)), 0, tradeH), tradeHB0 = E.clamp(Math.round(num(d.tradeHB0, tradeH / 2)), 0, tradeH);
          var tradeHA1 = E.clamp(Math.round(num(d.tradeHA1, tradeHA0)), 0, tradeH), tradeHB1 = E.clamp(Math.round(num(d.tradeHB1, tradeHB0)), 0, tradeH);
          var tradeFrom = d.tradeFrom === 'a' || d.tradeFrom === 'b' ? d.tradeFrom : 'a';
          var tradePriceMax = Math.max(4, Math.ceil(tradeCmp.hi * 1.5));
          var tradePrice = E.clamp(num(d.tradePrice, 1), 0.1, tradePriceMax);
          var tradeOut = E.tradeOutcome(tradeSc, { hoursA0: tradeHA0, hoursB0: tradeHB0, hoursA1: tradeHA1, hoursB1: tradeHB1, xFrom: tradeFrom, price: tradePrice, qty: num(d.tradeQty, 0) });
          var tradeKey = tradeScenId === 'random' ? 'random:' + tradeSeed : tradeScenId;
          var tradeWins = Array.isArray(d.tradeWins) ? d.tradeWins.filter(function (x) { return typeof x === 'string'; }) : [];
          var tradePredStats = (d.tradePredStats && typeof d.tradePredStats === 'object') ? d.tradePredStats : {};
          var tradeFmt = function (v) { var r = Math.round(num(v, 0) * 10) / 10; return Math.abs(r - Math.round(r)) < 1e-9 ? String(Math.round(r)) : r.toFixed(1); };
          var tradeBundle = function (b) { return tradeFmt(b.x) + ' ' + tradeSc.goods.x.icon + ' + ' + tradeFmt(b.y) + ' ' + tradeSc.goods.y.icon; };
          var tradeSummaryText = function () {
            var o = tradeOut, sc = tradeSc;
            var who = function (w) { var P0 = o[w === 'a' ? 'A0' : 'B0'], P2 = o[w === 'a' ? 'A2' : 'B2'], g = w === 'a' ? o.gainA : o.gainB; return sc[w].name + ': ' + t('stem.economicslab.trade_sum_alone', 'alone') + ' ' + tradeBundle(P0) + ', ' + t('stem.economicslab.trade_sum_after', 'after trade') + ' ' + tradeBundle(P2) + (g ? ' (' + t('stem.economicslab.trade_sum_better', 'better off') + ')' : ''); };
            return t('stem.economicslab.canvas_summary_trade', 'Trade Lab: one production possibilities frontier (PPF) for each producer, showing what they make on their own, their plan for trading, and what they end up with after the deal.') + ' ' + who('a') + '. ' + who('b') + '.' + (o.bothGain ? ' ' + t('stem.economicslab.trade_sum_both', 'Both are better off: gains from trade.') : '');
          };

          // One PPF chart per producer, drawn as SVG so the text stays readable at any width.
          var tradeChart = function (w) {
            var el = React.createElement, sc = tradeSc, o = tradeOut, H = sc.hours, r = sc[w];
            var P0 = o[w === 'a' ? 'A0' : 'B0'], P1 = o[w === 'a' ? 'A1' : 'B1'], P2 = o[w === 'a' ? 'A2' : 'B2'];
            var gain = w === 'a' ? o.gainA : o.gainB, beyond = w === 'a' ? o.beyondA : o.beyondB;
            var xInt = r.x * H, yInt = r.y * H;
            var xMax = Math.max(xInt, P0.x, P2.x, 1) * 1.15, yMax = Math.max(yInt, P0.y, P2.y, 1) * 1.15;
            var L = 40, T = 30, Wd = 320 - L - 16, Ht = 240 - T - 42;
            var X = function (v) { return L + v / xMax * Wd; }, Y = function (v) { return T + Ht - v / yMax * Ht; };
            var moved = Math.abs(P1.x - P0.x) > 1e-9 || Math.abs(P1.y - P0.y) > 1e-9, traded = o.qty > 0;
            var dot = function (key, P, shape, fill, label, dx, dy) {
              var cx = X(P.x), cy = Y(P.y);
              var mark = shape === 'square' ? el('rect', { x: cx - 5, y: cy - 5, width: 10, height: 10, fill: fill })
                : shape === 'diamond' ? el('polygon', { points: [cx, cy - 7, cx + 7, cy, cx, cy + 7, cx - 7, cy].join(' '), fill: fill, stroke: '#0f172a', strokeWidth: 1 })
                  : el('circle', { cx: cx, cy: cy, r: 5, fill: fill });
              return el('g', { key: key, 'data-trade-point': w + key, 'data-x': P.x, 'data-y': P.y, 'data-cx': cx.toFixed(2), 'data-cy': cy.toFixed(2) }, mark,
                el('text', { x: Math.min(300, Math.max(L + 4, cx + dx)), y: Math.max(T + 10, Math.min(T + Ht - 4, cy + dy)), fill: fill, fontSize: 11, fontWeight: 700 }, label));
            };
            var aria = r.name + ': ' + t('stem.economicslab.trade_aria_ppf', 'can make up to') + ' ' + tradeFmt(xInt) + ' ' + sc.goods.x.name + ' ' + t('stem.economicslab.trade_or', 'or') + ' ' + tradeFmt(yInt) + ' ' + sc.goods.y.name + ' ' + t('stem.economicslab.trade_a_day', 'a day') + '. ' +
              t('stem.economicslab.trade_sum_alone', 'alone') + ' ' + tradeBundle(P0) + '; ' + t('stem.economicslab.trade_sum_after', 'after trade') + ' ' + tradeBundle(P2) + (gain ? ', ' + t('stem.economicslab.trade_sum_better', 'better off') : '') + (beyond ? ', ' + t('stem.economicslab.trade_beyond_short', 'beyond their own PPF') : '') + '.';
            return el('svg', { key: w, viewBox: '0 0 320 240', role: 'img', 'aria-label': aria, 'data-trade-chart': w, style: { width: '100%', height: 'auto', display: 'block', background: '#0f172a', borderRadius: 10 } },
              el('text', { x: 10, y: 19, fill: '#e2e8f0', fontSize: 13, fontWeight: 700 }, r.icon + ' ' + r.name),
              el('polygon', { points: [X(0), Y(0), X(0), Y(yInt), X(xInt), Y(0)].join(' '), fill: 'rgba(56,189,248,0.13)' }),
              el('line', { x1: L, y1: T + Ht, x2: L + Wd, y2: T + Ht, stroke: '#94a3b8', strokeWidth: 1.5 }),
              el('line', { x1: L, y1: T, x2: L, y2: T + Ht, stroke: '#94a3b8', strokeWidth: 1.5 }),
              el('line', { x1: X(0), y1: Y(yInt), x2: X(xInt), y2: Y(0), stroke: '#38bdf8', strokeWidth: 2.5 }),
              el('text', { x: X(xInt * 0.72) - 34, y: Y(yInt * 0.28) + 22, fill: '#7dd3fc', fontSize: 11, fontWeight: 700 }, 'PPF'),
              el('text', { x: X(xInt) - 6, y: T + Ht + 14, fill: '#cbd5e1', fontSize: 11 }, tradeFmt(xInt)),
              el('text', { x: 6, y: Y(yInt) + 4, fill: '#cbd5e1', fontSize: 11 }, tradeFmt(yInt)),
              el('text', { x: L + Wd / 2 - 40, y: 236, fill: '#e2e8f0', fontSize: 12 }, sc.goods.x.icon + ' ' + sc.goods.x.name),
              el('text', { x: L + 8, y: T + 2, fill: '#e2e8f0', fontSize: 12 }, sc.goods.y.icon + ' ' + sc.goods.y.name),
              traded && el('line', { x1: X(P1.x), y1: Y(P1.y), x2: X(P2.x), y2: Y(P2.y), stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '6 4' }),
              dot('0', P0, 'circle', '#cbd5e1', t('stem.economicslab.trade_pt_alone', 'alone'), 8, -8),
              moved && dot('1', P1, 'square', '#60a5fa', t('stem.economicslab.trade_pt_makes', 'makes'), 8, 14),
              traded && dot('2', P2, 'diamond', gain ? '#4ade80' : '#f87171', gain ? t('stem.economicslab.trade_pt_gets_better', 'gets (better!)') : t('stem.economicslab.trade_pt_gets', 'gets'), 10, -10)
            );
          };

          var tradePanel = function () {
            var el = React.createElement, sc = tradeSc, o = tradeOut, c = tradeCmp, H = sc.hours;
            var gx = sc.goods.x, gy = sc.goods.y;
            var pred = (d.tradePred && typeof d.tradePred === 'object' && d.tradePred.key === tradeKey) ? d.tradePred : { key: tradeKey };
            var checked = !!pred.checked;
            var otherOf = function (w) { return w === 'a' ? 'b' : 'a'; };
            var btn = function (on) { return 'px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold border ' + (on ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-teal-900 border-teal-400'); };
            var slider = function (label, key, val, aria) {
              return el('label', { className: 'block text-[0.6875rem] font-bold text-slate-800 mt-2' }, label + ': ' + val + ' ' + t('stem.economicslab.trade_of_hours', 'of') + ' ' + H + ' ' + t('stem.economicslab.trade_hours_word', 'hours'),
                el('input', { type: 'range', min: 0, max: H, step: 1, value: val, 'aria-label': aria, 'aria-valuetext': val + ' ' + t('stem.economicslab.trade_hours_word', 'hours'), className: 'w-full', onChange: function (e) { var p = {}; p[key] = E.clamp(Math.round(num(parseFloat(e.target.value), 0)), 0, H); updMany(p); } }));
            };
            var pickScenario = function (id) {
              var seed = id === 'random' ? 1 + Math.floor(Math.random() * 999999) : tradeSeed;
              var nsc = E.tradeScenario(id, seed);
              updMany({ tradeScenId: id, tradeSeed: seed, tradeHA0: nsc.hours / 2, tradeHB0: nsc.hours / 2, tradeHA1: null, tradeHB1: null, tradeFrom: null, tradePrice: 1, tradeQty: 0 });
            };
            var SCEN = [['island', t('stem.economicslab.trade_scen_island', '🏝️ Island')], ['better_at_both', t('stem.economicslab.trade_scen_both', '💪 Better at both')], ['countries', t('stem.economicslab.trade_scen_countries', '🌍 Two countries')], ['random', t('stem.economicslab.trade_scen_random', '🎲 New random pair')]];
            var lowX = c.xMaker, lowY = c.xMaker ? otherOf(c.xMaker) : null;
            var ocCell = function (v, low, unit) { return el('td', { className: 'px-2 py-1 text-center ' + (low ? 'font-bold text-green-900 bg-green-100' : 'text-slate-800') }, (Math.round(v * 100) / 100) + ' ' + unit); };
            var qtyMax = (function () { var S = tradeFrom === 'a' ? o.A1 : o.B1, R = tradeFrom === 'a' ? o.B1 : o.A1; return Math.max(0, Math.floor(Math.min(S.x, R.y / o.price) + 1e-9)); })();
            var won = tradeWins.indexOf(tradeKey) !== -1;
            var worldLine = function (k, icon) {
              var b = o.worldBefore[k], a = o.worldPlan[k], dlt = a - b;
              return el('span', { key: k, className: 'mr-3 ' + (dlt > 1e-9 ? 'text-green-800' : dlt < -1e-9 ? 'text-red-800' : 'text-slate-700') }, icon + ' ' + tradeFmt(b) + ' → ' + tradeFmt(a) + (Math.abs(dlt) > 1e-9 ? ' (' + (dlt > 0 ? '+' : '−') + tradeFmt(Math.abs(dlt)) + ')' : ''));
            };
            var person = function (w) {
              var P0 = o[w === 'a' ? 'A0' : 'B0'], P2 = o[w === 'a' ? 'A2' : 'B2'], g = w === 'a' ? o.gainA : o.gainB, bey = w === 'a' ? o.beyondA : o.beyondB;
              return el('div', { key: w, 'data-trade-result': w, className: 'bg-white rounded-lg px-2.5 py-2 border ' + (g ? 'border-green-400' : 'border-slate-300') },
                el('div', { className: 'text-[0.6875rem] font-bold text-slate-900' }, sc[w].icon + ' ' + sc[w].name + ' ' + t('stem.economicslab.trade_ends_with', 'ends up with') + ' ' + tradeBundle(P2)),
                el('div', { className: 'text-[0.6875rem] text-slate-700' }, t('stem.economicslab.trade_alone_had', 'On their own:') + ' ' + tradeBundle(P0)),
                el('div', { className: 'text-[0.6875rem] font-bold ' + (g ? 'text-green-800' : 'text-slate-700') }, g ? '✅ ' + t('stem.economicslab.trade_better', 'Better off: more of one good, no less of the other') : '➖ ' + t('stem.economicslab.trade_not_better', 'Not better off yet')),
                bey && el('div', { className: 'text-[0.6875rem] font-bold text-teal-800' }, '🚀 ' + t('stem.economicslab.trade_beyond', 'Outside their own PPF: impossible without trade'))
              );
            };
            var hint = null;
            if (!o.bothGain && checked) {
              if (o.qty <= 0) hint = t('stem.economicslab.trade_hint_ship', 'Ship some') + ' ' + gx.name + ' ' + t('stem.economicslab.trade_hint_ship_2', 'with the slider to make a deal.');
              else if (c.xMaker && tradeFrom !== c.xMaker) hint = t('stem.economicslab.trade_hint_dir', 'Check who is shipping: the') + ' ' + gx.name + ' ' + t('stem.economicslab.trade_hint_dir_2', 'should come from whoever gives up less to make them.');
              else if (!o.priceOk) hint = t('stem.economicslab.trade_hint_price', 'At this price one side would rather make the goods itself. Try a price between') + ' ' + (Math.round(c.lo * 100) / 100) + ' ' + t('stem.economicslab.trade_and', 'and') + ' ' + (Math.round(c.hi * 100) / 100) + ' ' + gy.icon + ' ' + t('stem.economicslab.trade_per', 'per') + ' ' + gx.icon + '.';
              else if (o.worldPlan.x < o.worldBefore.x - 1e-9 || o.worldPlan.y < o.worldBefore.y - 1e-9) hint = t('stem.economicslab.trade_hint_world', 'The plan makes less of one good than before, so someone must end up with less. Move an hour or two back to the good the world is short of.');
              else hint = t('stem.economicslab.trade_hint_qty', 'Close! Change how much is shipped until neither side ends up with less of anything.');
            }
            return el('div', { className: 'mt-4 space-y-3', 'data-economicslab-trade': 'true' },
              el('div', { className: 'flex flex-wrap gap-2 items-center', role: 'group', 'aria-label': t('stem.economicslab.trade_scenario', 'Trade scenario') },
                SCEN.map(function (sv) { return el('button', { key: sv[0], type: 'button', 'aria-pressed': tradeScenId === sv[0] ? 'true' : 'false', onClick: function () { pickScenario(sv[0]); }, className: btn(tradeScenId === sv[0]) }, sv[1]); })),
              // Step 1: predict
              el('div', { className: 'bg-teal-50 rounded-xl p-3 border border-teal-200', 'data-trade-step': '1' },
                el('h4', { className: 'text-sm font-bold text-teal-900 m-0 mb-1' }, '1 · ' + t('stem.economicslab.trade_step1', 'Predict: who should make the') + ' ' + gx.icon + ' ' + gx.name + '?'),
                el('p', { className: 'text-[0.6875rem] text-slate-800 m-0' }, t('stem.economicslab.trade_each_works', 'Each works') + ' ' + H + ' ' + t('stem.economicslab.trade_hours_a_day', 'hours a day. In one hour:')),
                el('ul', { className: 'text-[0.6875rem] text-slate-800 m-0 mt-1 pl-4' },
                  ['a', 'b'].map(function (w) { return el('li', { key: w }, sc[w].icon + ' ' + sc[w].name + ': ' + sc[w].x + ' ' + gx.icon + ' ' + gx.name + ' ' + t('stem.economicslab.trade_or', 'or') + ' ' + sc[w].y + ' ' + gy.icon + ' ' + gy.name); })),
                el('div', { className: 'flex flex-wrap gap-2 mt-2', role: 'group', 'aria-label': t('stem.economicslab.trade_your_prediction', 'Your prediction') },
                  [['a', sc.a.name], ['b', sc.b.name], ['same', t('stem.economicslab.trade_either', 'It doesn’t matter')]].map(function (op) {
                    return el('button', { key: op[0], type: 'button', 'aria-pressed': pred.pick === op[0] ? 'true' : 'false', disabled: checked, style: checked ? { opacity: 0.7 } : undefined, onClick: function () { upd('tradePred', { key: tradeKey, pick: op[0] }); }, className: btn(pred.pick === op[0]) }, op[1]);
                  }),
                  !checked && el('button', { type: 'button', disabled: !pred.pick, style: pred.pick ? undefined : { opacity: 0.5 }, 'data-trade-check': 'true', className: 'px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-teal-800 text-white',
                    onClick: function () {
                      if (!pred.pick) return;
                      var right = pred.pick === (c.xMaker || 'same');
                      updMany({ tradePred: { key: tradeKey, pick: pred.pick, checked: true, right: right }, tradePredStats: { tried: num(tradePredStats.tried, 0) + 1, right: num(tradePredStats.right, 0) + (right ? 1 : 0) } });
                      if (announceToSR) announceToSR(right ? t('stem.economicslab.trade_right', 'Right!') : t('stem.economicslab.trade_not_quite', 'Not quite.'));
                    } }, t('stem.economicslab.trade_check', 'Check with opportunity cost'))
                ),
                checked && el('div', { className: 'mt-2', 'data-trade-reveal': 'true' },
                  el('p', { className: 'text-[0.6875rem] font-bold m-0 ' + (pred.right ? 'text-green-800' : 'text-rose-800') }, pred.right ? '✅ ' + t('stem.economicslab.trade_right', 'Right!') : '🤔 ' + t('stem.economicslab.trade_not_quite', 'Not quite.')),
                  el('table', { className: 'text-[0.6875rem] mt-1 border-collapse bg-white rounded' },
                    el('thead', null, el('tr', null,
                      el('th', { className: 'px-2 py-1 text-left text-slate-800' }, t('stem.economicslab.trade_to_make_one', 'To make one more…')),
                      el('th', { className: 'px-2 py-1 text-slate-800' }, gx.icon + ' ' + gx.name),
                      el('th', { className: 'px-2 py-1 text-slate-800' }, gy.icon + ' ' + gy.name))),
                    el('tbody', null, ['a', 'b'].map(function (w) {
                      return el('tr', { key: w },
                        el('th', { className: 'px-2 py-1 text-left text-slate-900' }, sc[w].icon + ' ' + sc[w].name + ' ' + t('stem.economicslab.trade_gives_up', 'gives up')),
                        ocCell(w === 'a' ? c.ocXa : c.ocXb, lowX === w, gy.icon),
                        ocCell(w === 'a' ? c.ocYa : c.ocYb, lowY === w, gx.icon));
                    }))),
                  el('p', { className: 'text-[0.6875rem] text-slate-800 m-0 mt-1' },
                    c.xMaker
                      ? sc[c.xMaker].name + ' ' + t('stem.economicslab.trade_explain_1', 'gives up less to make') + ' ' + gx.name + ', ' + t('stem.economicslab.trade_explain_2', 'so they have the comparative advantage there, and') + ' ' + sc[otherOf(c.xMaker)].name + ' ' + t('stem.economicslab.trade_explain_3', 'has it in') + ' ' + gy.name + '.' +
                        (c.absX && c.absX === c.absY ? ' ' + sc[c.absX].name + ' ' + t('stem.economicslab.trade_explain_abs', 'is faster at BOTH (absolute advantage), but what decides who should make what is opportunity cost.') : '')
                      : t('stem.economicslab.trade_explain_equal', 'Their opportunity costs are equal, so there is nothing to gain from specializing.'))
                )
              ),
              // Step 2: no trade
              el('div', { className: 'bg-white rounded-xl p-3 border border-slate-300', 'data-trade-step': '2' },
                el('h4', { className: 'text-sm font-bold text-slate-900 m-0' }, '2 · ' + t('stem.economicslab.trade_step2', 'Life without trade')),
                el('p', { className: 'text-[0.6875rem] text-slate-700 m-0' }, t('stem.economicslab.trade_step2_hint', 'Each makes everything they use. Split their day (the grey dot on each chart).')),
                el('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-x-4' },
                  ['a', 'b'].map(function (w) { return el('div', { key: w }, slider(sc[w].icon + ' ' + sc[w].name + ': ' + t('stem.economicslab.trade_hours_on', 'hours on') + ' ' + gx.name, w === 'a' ? 'tradeHA0' : 'tradeHB0', w === 'a' ? tradeHA0 : tradeHB0, sc[w].name + ' ' + t('stem.economicslab.trade_hours_on', 'hours on') + ' ' + gx.name + ' ' + t('stem.economicslab.trade_without_trade', 'without trade')),
                    el('div', { className: 'text-[0.6875rem] text-slate-800' }, t('stem.economicslab.trade_makes', 'Makes') + ' ' + tradeBundle(o[w === 'a' ? 'A0' : 'B0']))); }))
              ),
              // Step 3: plan
              el('div', { className: 'bg-white rounded-xl p-3 border border-slate-300', 'data-trade-step': '3' },
                el('h4', { className: 'text-sm font-bold text-slate-900 m-0' }, '3 · ' + t('stem.economicslab.trade_step3', 'Specialize: plan production for trading')),
                el('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-x-4' },
                  ['a', 'b'].map(function (w) { return el('div', { key: w }, slider(sc[w].icon + ' ' + sc[w].name + ': ' + t('stem.economicslab.trade_hours_on', 'hours on') + ' ' + gx.name, w === 'a' ? 'tradeHA1' : 'tradeHB1', w === 'a' ? tradeHA1 : tradeHB1, sc[w].name + ' ' + t('stem.economicslab.trade_hours_on', 'hours on') + ' ' + gx.name + ' ' + t('stem.economicslab.trade_when_trading', 'when trading')),
                    el('div', { className: 'text-[0.6875rem] text-slate-800' }, t('stem.economicslab.trade_makes', 'Makes') + ' ' + tradeBundle(o[w === 'a' ? 'A1' : 'B1']))); })),
                el('div', { className: 'flex flex-wrap items-center gap-2 mt-2' },
                  el('button', { type: 'button', disabled: !checked || !c.xMaker, style: checked && c.xMaker ? undefined : { opacity: 0.5 }, 'data-trade-specialize': 'true', className: 'px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-teal-800 text-white',
                    onClick: function () { if (!c.xMaker) return; var p = { tradeFrom: c.xMaker, tradeQty: 0 }; p[c.xMaker === 'a' ? 'tradeHA1' : 'tradeHB1'] = H; p[c.xMaker === 'a' ? 'tradeHB1' : 'tradeHA1'] = 0; updMany(p); } },
                    checked ? t('stem.economicslab.trade_specialize', 'Specialize fully by comparative advantage') : t('stem.economicslab.trade_specialize_locked', 'Specialize (check your prediction first)')),
                  el('span', { className: 'text-[0.6875rem] text-slate-800', 'data-trade-world': 'true' }, t('stem.economicslab.trade_world', 'World output:') + ' ', worldLine('x', gx.icon), worldLine('y', gy.icon))
                )
              ),
              // Step 4: trade
              el('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200', 'data-trade-step': '4' },
                el('h4', { className: 'text-sm font-bold text-amber-900 m-0' }, '4 · ' + t('stem.economicslab.trade_step4', 'Make a deal')),
                el('div', { className: 'flex flex-wrap gap-2 items-center mt-1', role: 'group', 'aria-label': t('stem.economicslab.trade_who_ships', 'Who ships') + ' ' + gx.name },
                  el('span', { className: 'text-[0.6875rem] font-bold text-slate-800' }, t('stem.economicslab.trade_who_ships', 'Who ships') + ' ' + gx.icon + '?'),
                  ['a', 'b'].map(function (w) { return el('button', { key: w, type: 'button', 'aria-pressed': tradeFrom === w ? 'true' : 'false', onClick: function () { updMany({ tradeFrom: w, tradeQty: 0 }); }, className: btn(tradeFrom === w) }, sc[w].name + ' → ' + sc[otherOf(w)].name); })),
                el('label', { className: 'block text-[0.6875rem] font-bold text-slate-800 mt-2' }, t('stem.economicslab.trade_price', 'Price: 1') + ' ' + gx.icon + ' = ' + (Math.round(tradePrice * 100) / 100) + ' ' + gy.icon,
                  el('input', { type: 'range', min: 0.1, max: tradePriceMax, step: 0.05, value: tradePrice, 'aria-label': t('stem.economicslab.trade_price_aria', 'Price of one') + ' ' + gx.name + ' ' + t('stem.economicslab.trade_in', 'in') + ' ' + gy.name, 'aria-valuetext': (Math.round(tradePrice * 100) / 100) + ' ' + gy.name, className: 'w-full', onChange: function (e) { upd('tradePrice', E.clamp(num(parseFloat(e.target.value), 1), 0.1, tradePriceMax)); } })),
                el('label', { className: 'block text-[0.6875rem] font-bold text-slate-800 mt-2' }, gx.icon + ' ' + t('stem.economicslab.trade_shipped', 'shipped') + ': ' + tradeFmt(o.qty) + ' (' + t('stem.economicslab.trade_paid', 'paid') + ' ' + tradeFmt(o.pay) + ' ' + gy.icon + ')',
                  el('input', { type: 'range', min: 0, max: qtyMax, step: 1, value: Math.min(qtyMax, Math.round(o.qty)), 'aria-label': gx.name + ' ' + t('stem.economicslab.trade_shipped', 'shipped'), className: 'w-full', onChange: function (e) { upd('tradeQty', E.clamp(Math.round(num(parseFloat(e.target.value), 0)), 0, qtyMax)); } })),
                el('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2' }, person('a'), person('b')),
                el('p', { className: 'sr-only', 'aria-live': 'polite', 'data-trade-live': 'true' }, sc.a.name + ': ' + (o.gainA ? t('stem.economicslab.trade_sum_better', 'better off') : t('stem.economicslab.trade_not_better_short', 'not better off')) + '. ' + sc.b.name + ': ' + (o.gainB ? t('stem.economicslab.trade_sum_better', 'better off') : t('stem.economicslab.trade_not_better_short', 'not better off')) + '.'),
                o.bothGain
                  ? el('div', { className: 'mt-2 flex flex-wrap items-center gap-2 text-[0.6875rem] font-bold text-green-900 bg-green-100 border border-green-300 rounded-lg px-3 py-2', 'data-trade-both': 'true', role: 'status' },
                      '🎉 ' + t('stem.economicslab.trade_both', 'Both are better off than on their own. That is the gain from trade.'),
                      won ? el('span', { className: 'text-green-900' }, '✓ ' + t('stem.economicslab.trade_recorded', 'Deal recorded'))
                        : el('button', { type: 'button', 'data-trade-seal': 'true', className: 'px-3 py-1 rounded-lg bg-green-800 text-white', onClick: function () {
                            var have = tradeWins.slice(); if (have.indexOf(tradeKey) === -1) have.push(tradeKey);
                            upd('tradeWins', have);
                            if (addToast) addToast('🤝 ' + t('stem.economicslab.trade_sealed', 'Deal sealed: both sides gained!'), 'success');
                            if (announceToSR) announceToSR(t('stem.economicslab.trade_sealed', 'Deal sealed: both sides gained!'));
                          } }, '🤝 ' + t('stem.economicslab.trade_seal', 'Seal the deal')))
                  : hint && el('p', { className: 'text-[0.6875rem] text-amber-900 m-0 mt-2', 'data-trade-hint': 'true' }, '💡 ' + hint),
                el('p', { className: 'text-[0.6875rem] text-slate-700 m-0 mt-2' }, t('stem.economicslab.trade_deals', 'Deals where both sides gained:') + ' ' + tradeWins.length)
              )
            );
          };

          var macroMissionWins = Array.isArray(d.macroMissionWins) ? d.macroMissionWins.filter(function (x) { return typeof x === 'string'; }) : [];

          var enPricesTried = {};

          enHistory.forEach(function (h) { if (typeof h.price === 'number') enPricesTried[h.price.toFixed(2)] = true; });

          if (Array.isArray(d.enBizPrices)) d.enBizPrices.forEach(function (p) { if (typeof p === 'string') enPricesTried[p] = true; });

          // Every achievement, earned or not: the panel shows the locked ones
          // too, so students can see what to aim for.
          var ECON_ACH = [
            { id: 'six_figures', icon: '💰', title: t('stem.economicslab.six_figures', 'Six Figures'), desc: t('stem.economicslab.saved_100k', 'Saved $100K+'), earned: pfCash >= 100000 },
            { id: 'millionaire', icon: '💎', title: t('stem.economicslab.millionaire', 'Millionaire'), desc: t('stem.economicslab.net_worth_1m', 'Net worth $1M+'), earned: pfNetWorth >= 1000000 },
            { id: 'retirement', icon: '🏖️', title: t('stem.economicslab.comfortable_retirement', 'Comfortable Retirement'), desc: t('stem.economicslab.retired_with_500k', 'Retired with $500K+'), earned: pfAge >= 65 && pfNetWorth > 500000 },
            { id: 'credit', icon: '⭐', title: t('stem.economicslab.excellent_credit', 'Excellent Credit'), desc: t('stem.economicslab.credit_score_800', 'Credit score 800+'), earned: pfLife.credit >= 800 },
            { id: 'dream', icon: '🌟', title: t('stem.economicslab.living_the_dream', 'Living the Dream'), desc: t('stem.economicslab.95_happiness', '95%+ happiness'), earned: pfHappiness >= 95 },
            // "Eliminated" means there was debt to eliminate.
            { id: 'debt_free', icon: '✅', title: t('stem.economicslab.debt_free', 'Debt Free'), desc: t('stem.economicslab.eliminated_all_debt', 'Eliminated all debt'), earned: pfDebtAll === 0 && pfAge > 25 && num(d.pfDebtPeak, 0) > 0 },
            { id: 'debt_race', icon: '💳', title: t('stem.economicslab.debt_race', 'Debt Racer'), desc: t('stem.economicslab.debt_race_desc_2', 'Found a payment that clears a $2,000+ card balance in 2 years or less'), earned: d.ccWon === true },
            { id: 'goal', icon: '🎯', title: t('stem.economicslab.goal_getter', 'Goal Getter'), desc: t('stem.economicslab.goal_getter_desc', 'Reached a Life Sim goal'), earned: Array.isArray(d.pfGoalsMet) && d.pfGoalsMet.length > 0 },
            { id: 'market_gains', icon: '📈', title: t('stem.economicslab.market_gains', 'Market Gains'), desc: t('stem.economicslab.portfolio_grew_50', 'Portfolio grew 50%+'), earned: smTotalVal >= 15000 },
            { id: 'wolf', icon: '🚀', title: t('stem.economicslab.wall_street_wolf', 'Wall Street Wolf'), desc: t('stem.economicslab.portfolio_hit_25k', 'Portfolio hit $25K'), earned: smTotalVal >= 25000 },
            { id: 'trader', icon: '📅', title: t('stem.economicslab.seasoned_trader', 'Seasoned Trader'), desc: t('stem.economicslab.30_trading_days', '30+ trading days'), earned: smDay >= 30 },
            { id: 'diversified', icon: '🧺', title: t('stem.economicslab.diversified', 'Diversified'), desc: t('stem.economicslab.diversified_desc', 'Owned every company in the market at once'), earned: smCompanies.length >= 3 && smCompanies.every(function (c) { return num(smPortfolio[c.ticker], 0) > 0; }) },
            { id: 'know_thyself', icon: '🧭', title: t('stem.economicslab.know_thyself', 'Know Thyself'), desc: t('stem.economicslab.completed_investor_profile', 'Completed the investor profile quiz'), earned: !!d.paQuizDone },
            { id: 'stress_tested', icon: '🛡️', title: t('stem.economicslab.stress_tested', 'Stress-Tested'), desc: t('stem.economicslab.ran_retirement_sim', 'Ran a retirement simulation'), earned: !!d.mcRanRetire },
            { id: 'survivor', icon: '🏆', title: t('stem.economicslab.business_survivor', 'Business Survivor'), desc: t('stem.economicslab.20_days_in_business', '20+ days in business'), earned: num(d.enBizDay, 0) >= 20 },
            { id: 'tycoon', icon: '💼', title: t('stem.economicslab.tycoon', 'Tycoon'), desc: t('stem.economicslab.business_cash_50k', 'Business cash $50K+'), earned: enCash >= 50000 },
            { id: 'five_star', icon: '🌟', title: t('stem.economicslab.5_star_business', '5-Star Business'), desc: t('stem.economicslab.reputation_90', 'Reputation 90+'), earned: !!enBiz && enRep >= 90 },
            { id: 'job_creator', icon: '👥', title: t('stem.economicslab.job_creator', 'Job Creator'), desc: t('stem.economicslab.hired_3_staff', 'Employed 3+ staff at once'), earned: enStaff >= 3 },
            { id: 'price_scientist', icon: '🔬', title: t('stem.economicslab.price_scientist', 'Price Scientist'), desc: t('stem.economicslab.price_scientist_desc', 'Ran your business at 4+ different prices'), earned: Object.keys(enPricesTried).length >= 4 },
            { id: 'veteran', icon: '🏛️', title: t('stem.economicslab.policy_veteran', 'Policy Veteran'), desc: t('stem.economicslab.10_years_of_policy_own', '10+ years of your own policy (autopilot years do not count)'), earned: macroHistory.filter(function (h) { return !h.auto; }).length >= 10 },
            { id: 'boom', icon: '📈', title: t('stem.economicslab.economic_boom', 'Economic Boom'), desc: t('stem.economicslab.gdp_growth_5', 'GDP growth 5%+'), earned: macroGDP >= 5 },
            { id: 'full_employment', icon: '💪', title: t('stem.economicslab.full_employment', 'Full Employment'), desc: t('stem.economicslab.full_employment_desc', 'Unemployment at or below the ~4% natural rate with inflation 1–3%'), earned: macroHistory.length >= 1 && !(lastMacroYr && lastMacroYr.auto) && macroUnemployment <= 4 && macroInflation >= 1 && macroInflation <= 3 },
            { id: 'soft_landing', icon: '🛬', title: t('stem.economicslab.soft_landing', 'Soft Landing'), desc: t('stem.economicslab.soft_landing_desc', '3+ years in: growth 2–4%, inflation 1–3%, unemployment <5%'), earned: macroHistory.length >= 3 && !!lastMacroYr && !lastMacroYr.auto && lastMacroYr.gdp >= 2 && lastMacroYr.gdp <= 4 && lastMacroYr.inflation >= 1 && lastMacroYr.inflation <= 3 && num(lastMacroYr.unemployment, 99) < 5 },
            { id: 'mission', icon: '🎖️', title: t('stem.economicslab.mission_accomplished', 'Mission Accomplished'), desc: t('stem.economicslab.mission_accomplished_desc', 'Won a National Economy mission'), earned: macroMissionWins.length >= 1 },
            { id: 'all_missions', icon: '🏅', title: t('stem.economicslab.policy_master', 'Policy Master'), desc: t('stem.economicslab.policy_master_desc', 'Won every National Economy mission'), earned: E.MACRO_MISSIONS.every(function (m) { return macroMissionWins.indexOf(m.id) !== -1; }) },
            { id: 'market_fixer', icon: '🏭', title: t('stem.economicslab.market_fixer', 'Market Fixer'), desc: t('stem.economicslab.market_fixer_desc', 'Erased a social deadweight loss with a Pigouvian tax or subsidy'), earned: !sdMonopoly && sdExt !== 0 && (sdOut.regime === 'tax' || sdOut.regime === 'subsidy') && sdOut.atSocial },
            { id: 'trustbuster', icon: '⚖️', title: t('stem.economicslab.trustbuster', 'Trustbuster'), desc: t('stem.economicslab.trustbuster_desc', 'Made a monopoly produce the competitive amount with a price ceiling'), earned: sdMonopoly && sdOut.regime === 'ceiling' && sdTax === 0 && sdOut.atCompetitive },
            { id: 'strategist', icon: '♟️', title: t('stem.economicslab.strategist', 'Strategist'), desc: t('stem.economicslab.strategist_desc_2', 'Named a price-war rival when your moves ruled out every other rule'), earned: num(pwStats.sharp, 0) >= 1 },
            { id: 'gains_from_trade', icon: '🤝', title: t('stem.economicslab.gains_from_trade', 'Gains from Trade'), desc: t('stem.economicslab.gains_from_trade_desc', 'Sealed a deal that left both traders better off'), earned: tradeWins.length >= 1 },
            { id: 'detective', icon: '🕵️', title: t('stem.economicslab.market_detective_ach', 'Market Detective'), desc: t('stem.economicslab.market_detective_ach_desc', 'Solved 5 Market Detective cases perfectly'), earned: num(sdDet.correct, 0) >= 5 },
            { id: 'researcher', icon: '🔬', title: t('stem.economicslab.macro_researcher', 'Macro Researcher'), desc: t('stem.economicslab.logged_3_policy_mixes', 'Logged 3+ policy mixes in Policy Inquiry'), earned: !!(d.policyIQ && Array.isArray(d.policyIQ.log) && d.policyIQ.log.length >= 3) },
            { id: 'student', icon: '📚', title: t('stem.economicslab.student', 'Student'), desc: t('stem.economicslab.5_concepts_learned', '5+ concepts learned'), earned: conceptsLearned >= 5 },
            { id: 'major', icon: '🎓', title: t('stem.economicslab.economics_major', 'Economics Major'), desc: t('stem.economicslab.15_concepts_learned', '15+ concepts learned'), earned: conceptsLearned >= 15 },
            { id: 'phd', icon: '🧑‍🎓', title: t('stem.economicslab.phd_economist', 'PhD Economist'), desc: t('stem.economicslab.30_concepts_learned', '30+ concepts learned'), earned: conceptsLearned >= 30 }
          ];

          var econAchSaved = Array.isArray(d.econAchEarned) ? d.econAchEarned.filter(function (x) { return typeof x === 'string'; }) : null;

          ECON_ACH.forEach(function (a) { if (!a.earned && econAchSaved && econAchSaved.indexOf(a.id) !== -1) a.earned = true; });

          var econAchNew = ECON_ACH.filter(function (a) { return a.earned && (!econAchSaved || econAchSaved.indexOf(a.id) === -1); });

          if ((econAchNew.length || !econAchSaved) && !window.__econAchPending) {
            // First visit: record what is already earned quietly. After that, celebrate.
            var econAchQuiet = !econAchSaved;
            window.__econAchPending = true;
            setTimeout(function () {
              window.__econAchPending = false;
              setLabToolData(function (p) { var have = Array.isArray(p.econAchEarned) ? p.econAchEarned.slice() : []; econAchNew.forEach(function (a) { if (have.indexOf(a.id) === -1) have.push(a.id); }); return Object.assign({}, p, { econAchEarned: have }); });
              if (econAchQuiet) return;
              econAchNew.forEach(function (a) { if (addToast) addToast('🏆 ' + t('stem.economicslab.ach_unlocked', 'Achievement unlocked:') + ' ' + a.title, 'success'); addXP(10, 'Economics achievement: ' + a.title); });
              if (announceToSR && econAchNew.length) announceToSR(t('stem.economicslab.ach_unlocked', 'Achievement unlocked:') + ' ' + econAchNew.map(function (a) { return a.title; }).join(', '));
            }, 0);
          }

          var econAchievements = ECON_ACH.filter(function (a) { return a.earned; });

          // Economic Literacy Score (0-100)

          var econLiteracyScore = Math.min(100, Math.round(

            conceptsLearned * 2 +

            Math.min(20, (Array.isArray(d.pfHistory) ? d.pfHistory.length : 0) * 1.5) +

            Math.min(15, smDay * 0.5) +

            Math.min(15, num(d.enBizDay, 0) * 0.75) +

            Math.min(15, macroHistory.length * 1.5) +

            Math.min(10, num(d.quizScore, 0) * 2) +

            (econAchievements.length * 0.5)

          ));


          // === Wave 1: ECON_CONCEPTS ===
          var ECON_CONCEPTS = [
            { id: 'scarcity', name: t('stem.economicslab.scarcity', 'Scarcity'), icon: '\u26A0\uFE0F', def: 'Limited resources vs unlimited wants. The fundamental economic problem.', example: 'There are only 24 hours in a day \u2014 you can\'t do everything.', category: 'fundamentals' },
            { id: 'oppCost', name: t('stem.economicslab.opportunity_cost', 'Opportunity Cost'), icon: '\uD83D\uDD04', def: 'The value of the next best alternative you give up when making a choice.', example: 'Going to college costs tuition PLUS the salary you could have earned working.', category: 'fundamentals' },
            { id: 'supplyDemand', name: t('stem.economicslab.supply_demand', 'Supply & Demand'), icon: '\u2696\uFE0F', def: 'Prices are determined by the interaction of buyers (demand) and sellers (supply).', example: 'When a new iPhone launches, high demand + limited supply = high price.', category: 'micro' },
            { id: 'marginal', name: t('stem.economicslab.marginal_analysis', 'Marginal Analysis'), icon: '\uD83D\uDCC8', def: 'Decisions should be made by comparing the additional (marginal) benefit to the additional cost.', example: 'Is one more hour of study worth giving up one more hour of sleep?', category: 'fundamentals' },
            { id: 'incentives', name: t('stem.economicslab.incentives', 'Incentives'), icon: '\uD83C\uDFAF', def: 'People respond to rewards and penalties. Change the incentives, change the behavior.', example: 'Tax credits for electric cars increase EV purchases.', category: 'fundamentals' },
            { id: 'gdp', name: 'GDP', icon: '\uD83C\uDFDB\uFE0F', def: 'Gross Domestic Product: total market value of all FINAL goods and services produced in a country in a year (counting final goods only avoids counting the flour AND the bread).', example: 'US GDP was about $29 trillion in 2024. GDP = C + I + G + (X - M).', category: 'macro' },
            { id: 'inflation', name: t('stem.economicslab.inflation', 'Inflation'), icon: '\uD83D\uDCC8', def: 'A general increase in prices over time, reducing purchasing power.', example: 'If inflation is 3%, something that cost $100 last year costs $103 now.', category: 'macro' },
            { id: 'unemployment', name: t('stem.economicslab.unemployment', 'Unemployment'), icon: '\uD83D\uDCBC', def: 'The percentage of the labor force that is jobless and actively seeking work.', example: 'Frictional (between jobs), structural (skills mismatch), cyclical (recession).', category: 'macro' },
            { id: 'compAdv', name: t('stem.economicslab.comparative_advantage', 'Comparative Advantage'), icon: '\uD83C\uDF0D', def: 'Countries should specialize in producing goods where they have the lowest opportunity cost.', example: 'Even if Country A is better at everything, both benefit by specializing.', category: 'trade' },
            { id: 'elasticity', name: t('stem.economicslab.elasticity', 'Elasticity'), icon: '\uD83C\uDFF9', def: 'How much quantity demanded/supplied changes in response to a price change.', example: 'Gasoline is inelastic (need it regardless), luxury goods are elastic.', category: 'micro' },
            { id: 'externality', name: t('stem.economicslab.externalities', 'Externalities'), icon: '\u2601\uFE0F', def: 'Costs or benefits that affect third parties not involved in the transaction.', example: 'Pollution (negative externality), education (positive externality).', category: 'micro' },
            { id: 'publicGood', name: t('stem.economicslab.public_goods', 'Public Goods'), icon: '\uD83D\uDEE3\uFE0F', def: 'Non-rival and non-excludable goods that markets underprovide.', example: 'National defense, street lights, public parks.', category: 'micro' },
            { id: 'moneySupply', name: t('stem.economicslab.money_supply', 'Money Supply'), icon: '\uD83D\uDCB5', def: 'The total amount of money circulating in the economy, controlled by the central bank.', example: 'M1 = cash + checking + (since May 2020) savings deposits; M2 = M1 + small CDs + retail money-market funds. The Fed influences both, mainly through interest rates, rather than setting them directly.', category: 'macro' },
            { id: 'fiscalPolicy', name: t('stem.economicslab.fiscal_policy', 'Fiscal Policy'), icon: '\uD83C\uDFDB\uFE0F', def: 'Government use of taxation and spending to influence the economy.', example: 'Stimulus checks during COVID = expansionary fiscal policy.', category: 'macro' },
            { id: 'monetaryPolicy', name: t('stem.economicslab.monetary_policy', 'Monetary Policy'), icon: '\uD83C\uDFE6', def: 'Central bank actions (interest rates, money supply) to manage the economy.', example: 'The Fed raising interest rates to fight inflation.', category: 'macro' },
            { id: 'tradeoff', name: 'Trade-offs', icon: '\u2194\uFE0F', def: 'Every choice involves giving something up. There is no free lunch.', example: 'More military spending = less education funding (government budget).', category: 'fundamentals' },
            { id: 'marketFailure', name: t('stem.economicslab.market_failure', 'Market Failure'), icon: '\u274C', def: 'When free markets fail to allocate resources efficiently.', example: 'Monopolies, externalities, public goods, information asymmetry.', category: 'micro' },
            { id: 'compoundInterest', name: t('stem.economicslab.compound_interest', 'Compound Interest'), icon: '\uD83D\uDCCA', def: 'Interest earned on interest. The most powerful force in finance.', example: '$1,000 at 7% for 30 years = $7,612. Time is your greatest asset!', category: 'finance' },
            { id: 'riskReturn', name: t('stem.economicslab.risk_vs_return', 'Risk vs Return'), icon: '\u2696\uFE0F', def: 'Higher potential returns require accepting higher risk.', example: 'Stocks: ~10% return, high risk. Bonds: ~4% return, low risk.', category: 'finance' },
            { id: 'diversification', name: t('stem.economicslab.diversification', 'Diversification'), icon: '\uD83E\uDDE9', def: 'Spreading investments across many assets to reduce risk.', example: '"Don\'t put all your eggs in one basket." Index funds diversify automatically.', category: 'finance' },
            { id: 'assetAllocation', name: t('stem.economicslab.asset_allocation', 'Asset Allocation'), icon: '\uD83E\uDD67', def: 'How you split money across asset types (stocks, bonds, cash). Drives most of a portfolio\'s risk and return.', example: 'A classic balanced mix: 60% stocks, 30% bonds, 10% cash. Try it in the Portfolio Builder.', category: 'finance' },
            { id: 'rebalancing', name: t('stem.economicslab.rebalancing', 'Rebalancing'), icon: '\uD83D\uDD04', def: 'Selling a little of what grew and buying what shrank, to return to your target mix.', example: 'A 60/30/10 mix left alone for years drifts stock-heavy \u2014 riskier than what you chose.', category: 'finance' },
            { id: 'expenseRatio', name: t('stem.economicslab.expense_ratio', 'Expense Ratio'), icon: '\uD83D\uDCB8', def: 'The yearly fee a fund charges, as a percent of your money. It compounds against you.', example: 'Index funds charge ~0.05%; many active funds ~1%. Over decades that gap compounds into a serious share of your ending balance.', category: 'finance' },
            { id: 'sequenceRisk', name: t('stem.economicslab.sequence_risk', 'Sequence-of-Returns Risk'), icon: '\uD83C\uDFA2', def: 'The order of good and bad years matters whenever money is being added or withdrawn.', example: 'Two retirees with the same average return: the one who hits a crash first can run out of money.', category: 'finance' }
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
            { name: t('stem.economicslab.behavioral', 'Behavioral'), era: '1979-present', icon: '\uD83E\uDDE0', color: '#10b981', key: 'People are irrational. Psychology drives economic decisions.', famous: 'Kahneman, Thaler, Ariely', govRole: '"Nudge" better decisions', onRecession: 'Address panic/confidence', onInflation: 'Anchor expectations' },
            { name: t('stem.economicslab.mmt_modern_monetary', 'MMT (Modern Monetary)'), era: '2010s-present', icon: '\uD83D\uDDA8\uFE0F', color: '#ec4899', key: 'A government that issues its own currency cannot run out of it; the real limit on deficits is inflation, not solvency.', famous: 'Stephanie Kelton', govRole: 'Spend to use idle resources, tax to control inflation', onRecession: 'Deficit spending (e.g. a job guarantee)', onInflation: 'Raise taxes or cut spending to cool demand' }
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
              options: ['Invest it in stocks', 'Pay off the card', 'Buy something nice', 'Put it all in savings'], correct: 1,
              explain: 'Pay off the 22% APR credit card first! No investment reliably returns 22%. Paying off high-interest debt is the best guaranteed "return" you can get. After that, build your emergency fund.',
              concept: 'Opportunity Cost & Guaranteed Returns' },
            { id: 2, scenario: 'Gas prices jumped from $3 to $5 per gallon. Your commute is 30 miles each way.', question: t('stem.economicslab.why_doesn_t_gas_demand_drop_as_much_as', 'Why doesn\'t gas demand drop as much as you\'d expect?'),
              options: ['Most commuters switched to buses', 'Gas is price inelastic', 'Supply increased', 'Government subsidies'], correct: 1,
              explain: 'Gasoline has few substitutes for most commuters \u2014 you need it to get to work. This makes it price INELASTIC: even large price changes produce small quantity changes. That\'s why gas taxes raise a lot of revenue.',
              concept: 'Price Elasticity of Demand' },
            { id: 3, scenario: 'The Federal Reserve just raised interest rates by 0.75%. The stock market dropped 3% the same day.', question: t('stem.economicslab.why_does_raising_rates_hurt_stocks', 'Why does raising rates hurt stocks?'),
              options: ['The Fed is selling its stock holdings', 'Borrowing costs more, slowing growth', 'Company tax bills rise right away', 'Markets fall on any news at all'], correct: 1,
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
              options: ['Deflation', 'High inflation', 'Falling home prices', 'A trade surplus'], correct: 1,
              explain: 'Too much money chasing too few goods = INFLATION. Supply chains were disrupted (less supply) while stimulus increased spending power (more demand). Inflation hit 9.1% in June 2022 \u2014 the highest in 40 years.',
              concept: 'Money Supply & Inflation' },
            { id: 8, scenario: 'Two gas stations are across the street from each other. One drops its price by $0.05.', question: t('stem.economicslab.what_will_the_other_station_likely_do', 'What will the other station likely do?'),
              options: ['Raise its price to seem premium', 'Keep the same price', 'Match the cut', 'Close permanently'], correct: 2,
              explain: 'This is oligopoly behavior! With few sellers of an identical product, firms are interdependent. They tend to match competitors\' price cuts (kinked demand curve) but NOT price increases. This is why gas stations cluster and have similar prices.',
              concept: 'Oligopoly & Game Theory' },
            { id: 9, scenario: 'A factory pollutes a river, causing $2 million in damage to downstream fisheries. The factory pays nothing.', question: t('stem.economicslab.what_type_of_market_failure_is_this', 'What type of market failure is this?'),
              options: ['Monopoly', 'A public-goods problem', 'Negative externality', 'Information asymmetry'], correct: 2,
              explain: 'Negative externality! The factory imposes costs on third parties (fisheries) who aren\'t part of the transaction. The market price doesn\'t reflect the true social cost. Solutions: Pigouvian tax, cap-and-trade, regulation, or Coase bargaining.',
              concept: 'Externalities & Market Failure' },
            { id: 10, scenario: 'You\'re 25 years old. Your employer offers a 401(k) match: they\'ll match your contribution up to 6% of your salary.', question: t('stem.economicslab.how_much_should_you_contribute_at_mini', 'How much should you contribute at minimum?'),
              options: ['Nothing \u2014 wait until older', '3% \u2014 save some', '6% \u2014 the full match', '50% \u2014 maximize savings'], correct: 2,
              explain: 'Always get the full employer match \u2014 it\'s a 100% INSTANT return on your money! If you earn $50K and contribute 6% ($3,000), your employer adds $3,000 FREE. Not contributing is literally turning down free money.',
              concept: 'Employer Match & Free Money' }
          ];

          // The authored order rewards position-guessing badly: across the 10
          // scenarios `correct` was 1,1,1,1,1,2,1,2,2,2 — six at B, four at C, and
          // slots A and D NEVER correct. A student who simply never picks the first
          // or last option cannot lose a mark to position, and is choosing between
          // two options rather than four.
          //
          // Rotate each scenario onto a target slot, so the spread is as even as 10
          // questions over 4 slots allows (3/2/3/2) rather than merely decorrelated.
          // Deterministic, not Math.random: ECON_SCENARIOS is rebuilt on every
          // render, so a random shuffle would deal new options under the student
          // mid-question. Grading is by INDEX (`oi === sc.correct`), so `correct`
          // moves with the options; `explain` and `concept` carry no positional
          // wording, so nothing else needs to follow.
          var ECON_ANSWER_SLOTS = [0, 2, 1, 3];
          ECON_SCENARIOS = ECON_SCENARIOS.map(function (sc, i) {
            if (!sc || !Array.isArray(sc.options) || typeof sc.correct !== 'number') return sc;
            var n = sc.options.length;
            if (n < 2 || sc.correct < 0 || sc.correct >= n) return sc;
            var target = ECON_ANSWER_SLOTS[i % ECON_ANSWER_SLOTS.length] % n;
            var shift = (target - sc.correct + n) % n;
            if (shift === 0) return sc;
            var rotated = new Array(n);
            for (var k = 0; k < n; k++) rotated[(k + shift) % n] = sc.options[k];
            var next = Object.assign({}, sc);
            next.options = rotated;
            next.correct = target;
            return next;
          });

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
            { year: 2020, event: 'COVID-19 pandemic causes the sharpest quarterly GDP drop on record', icon: '\uD83E\uDDA0', impact: 'US GDP fell about 8% in Q2 alone (roughly 30% at an annual rate). $5T+ in relief spending. Remote work revolution.', lesson: 'Black swan events can reshape the entire economy overnight.' },
            { year: 2022, event: 'Inflation hits 9.1% \u2014 highest since 1981', icon: '\uD83D\uDCC8', impact: 'Fed raised rates from 0% to 5.5%. Mortgage rates doubled. Crypto crashed 70%.', lesson: 'Printing money has consequences. Rate hikes are painful but necessary.' },
            { year: 2023, event: 'Silicon Valley Bank collapses in 48 hours', icon: '\uD83C\uDFE6', impact: 'At the time the 2nd-largest bank failure in US history (First Republic, weeks later, was larger). The Fed created an emergency lending facility.', lesson: 'Even modern banks can face runs. Interest rate risk affects everyone.' }
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



          // ── Canvas Rendering ── (non-hook: setTimeout to avoid conditional hook)

          setTimeout(function () {

            var canvas = canvasRef.current;

            if (!canvas) return;

            var ctx = canvas.getContext('2d');

            if (!ctx) return;

            var W = canvas.width = canvas.offsetWidth * 2;

            var H = canvas.height = 500;

            ctx.scale(1, 1);

            ctx.clearRect(0, 0, W, H);



            if (econTab === 'supplyDemand') {
              // Drawn by econDrawSD; econAnimateSD glides the curves between states.

              econAnimateSD(canvas, { dShift: sdDemandShift, sShift: sdSupplyShift, dSlope: sdDemSlope, sSlope: sdSupSlope, floor: sdPriceFloor, ceiling: sdPriceCeiling, tax: sdTax, ext: sdExt, probe: d.sdProbe, showRev: !!d.sdShowRevenue, monopoly: !!d.sdMonopoly });

            }



            else if (econTab === 'personalFinance') {

              // ── Life Sim: this month's budget + net worth over the years ──
              // Both halves read pfBud / pfHistory, the same numbers the yearly
              // step uses, so the picture always matches the simulation.

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              var pieX = W * 0.22, pieY = H * 0.47, pieR = Math.min(W * 0.17, H * 0.36);

              var expenses = [

                { name: t('stem.economicslab.pie_taxes', 'Taxes'), val: pfBud.taxes, color: '#94a3b8' },

                { name: t('stem.economicslab.pie_housing', 'Housing'), val: pfBud.housing, color: '#ef4444' },

                { name: t('stem.economicslab.food', 'Food'), val: pfBud.food, color: '#f59e0b' },

                { name: t('stem.economicslab.transport', 'Transport'), val: pfBud.transport, color: '#3b82f6' },

                { name: t('stem.economicslab.pie_fun', 'Fun'), val: pfBud.fun, color: '#8b5cf6' },

                { name: t('stem.economicslab.pie_other', 'Bills'), val: pfBud.other, color: '#ec4899' },

                { name: t('stem.economicslab.pie_insurance', 'Insurance'), val: pfBud.insurance, color: '#06b6d4' },

                { name: t('stem.economicslab.pie_investing', 'Investing'), val: pfBud.invest, color: '#22c55e' },

                { name: t('stem.economicslab.pie_debt', 'Debt pay'), val: pfBud.debtPay, color: '#f97316' }

              ].filter(function (e) { return e.val > 0.5; });

              // Literal color — canvas fillStyle can't resolve CSS var(); a var()
              // string is silently ignored and the slice paints in the previous fill.

              var remaining = Math.max(0, pfBud.leftover);

              if (remaining > 0) expenses.push({ name: t('stem.economicslab.pie_saved', 'Saved'), val: remaining, color: '#475569' });

              var total = expenses.reduce(function (s, e) { return s + e.val; }, 0) || 1;

              var angle = -Math.PI / 2;

              expenses.forEach(function (e) {

                var sliceAngle = (e.val / total) * Math.PI * 2;

                ctx.beginPath(); ctx.moveTo(pieX, pieY);

                ctx.arc(pieX, pieY, pieR, angle, angle + sliceAngle);

                ctx.closePath(); ctx.fillStyle = e.color; ctx.fill();

                ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();

                var midAngle = angle + sliceAngle / 2;

                var lx = pieX + Math.cos(midAngle) * (pieR * 0.66);

                var ly = pieY + Math.sin(midAngle) * (pieR * 0.66);

                if (e.val / total > 0.06) {

                  ctx.font = 'bold 17px Inter, system-ui'; ctx.fillStyle = e.color === '#94a3b8' || e.color === '#f59e0b' ? '#0f172a' : '#fff';

                  ctx.textAlign = 'center';

                  ctx.fillText(Math.round(e.val / total * 100) + '%', lx, ly);

                  ctx.fillText(e.name, lx, ly + 20);

                }

                angle += sliceAngle;

              });

              ctx.textAlign = 'center'; ctx.font = 'bold 20px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('Gross pay $' + Math.round(pfBud.gross).toLocaleString() + '/mo', pieX, pieY + pieR + 34);

              ctx.textAlign = 'left';

              var rx = W * 0.46;

              ctx.font = 'bold 24px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('Take-home: $' + Math.round(pfBud.takeHome).toLocaleString() + '/mo  (after ' + (pfBud.taxRate * 100).toFixed(0) + '% taxes)', rx, 40);

              ctx.font = 'bold 22px Inter, system-ui';

              ctx.fillStyle = pfBud.leftover >= 0 ? '#4ade80' : '#f87171';

              ctx.fillText(pfBud.leftover >= 0 ? ('Left over: +$' + Math.round(pfBud.leftover).toLocaleString() + '/mo ✓') : ('Over budget: −$' + Math.round(-pfBud.leftover).toLocaleString() + '/mo ⚠ (goes on a card)'), rx, 74);

              var hist = Array.isArray(d.pfHistory) ? d.pfHistory.filter(function (hh) { return hh && typeof hh === 'object' && typeof hh.age === 'number'; }) : [];

              var ciX = rx, ciY = 110, ciW = W * 0.5, ciH = H - 170;

              ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;

              ctx.strokeRect(ciX, ciY, ciW, ciH);

              if (hist.length >= 2) {

                // Net worth by age (cash + investments + home equity − debt).

                var nwOf = function (hh) { return typeof hh.netWorth === 'number' ? hh.netWorth : num(hh.cash, 0) - num(hh.debt, 0); };

                var series = [

                  { key: 'nw', color: '#4ade80', dash: [], get: nwOf, label: 'Net worth' },

                  { key: 'cash', color: '#93c5fd', dash: [8, 6], get: function (hh) { return num(hh.cash, 0); }, label: 'Cash' },

                  { key: 'debt', color: '#fca5a5', dash: [3, 5], get: function (hh) { return num(hh.debt, 0); }, label: 'Debt' }

                ];

                var vals = [];

                hist.forEach(function (hh) { series.forEach(function (sr) { vals.push(sr.get(hh)); }); });

                var vMax = Math.max.apply(null, vals.concat([1000])), vMin = Math.min.apply(null, vals.concat([0]));

                var vRange = (vMax - vMin) || 1;

                var hx = function (i) { return ciX + (i / (hist.length - 1)) * ciW; };

                var hy = function (v) { return ciY + ciH - ((v - vMin) / vRange) * ciH; };

                if (vMin < 0) { ctx.strokeStyle = '#64748b'; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(ciX, hy(0)); ctx.lineTo(ciX + ciW, hy(0)); ctx.stroke(); ctx.setLineDash([]); }

                series.forEach(function (sr) {

                  ctx.strokeStyle = sr.color; ctx.lineWidth = sr.key === 'nw' ? 3.5 : 2; ctx.setLineDash(sr.dash); ctx.beginPath();

                  hist.forEach(function (hh, i) { var x = hx(i), y = hy(sr.get(hh)); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });

                  ctx.stroke(); ctx.setLineDash([]);

                });

                ctx.font = 'bold 20px Inter, system-ui';

                series.forEach(function (sr, si) { ctx.fillStyle = sr.color; ctx.fillText((si === 0 ? '— ' : si === 1 ? '- - ' : '··· ') + sr.label, ciX + 12 + si * 170, ciY + 26); });

                var lastNw = nwOf(hist[hist.length - 1]);

                ctx.font = 'bold 22px Inter, system-ui'; ctx.fillStyle = lastNw >= 0 ? '#4ade80' : '#f87171';

                ctx.fillText((lastNw < 0 ? '−$' : '$') + Math.abs(Math.round(lastNw)).toLocaleString(), ciX + ciW - 150, Math.max(ciY + 56, Math.min(ciY + ciH - 10, hy(lastNw) - 10)));

                ctx.font = '18px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                ctx.fillText('Age ' + hist[0].age, ciX, ciY + ciH + 24);

                ctx.fillText('Age ' + hist[hist.length - 1].age, ciX + ciW - 80, ciY + ciH + 24);

                ctx.fillText('Net worth by age', ciX + ciW / 2 - 70, ciY + ciH + 24);

              } else {

                // Before any history: the compound-interest what-if.

                ctx.font = 'bold 22px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

                ctx.fillText('📈 Compound interest what-if', ciX + 12, ciY + 30);

                var maxVal = pfPrincipal * Math.pow(1 + pfRate / 100, pfYears);

                ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2.5; ctx.beginPath();

                for (var yr = 0; yr <= pfYears; yr++) {

                  var val = pfPrincipal * Math.pow(1 + pfRate / 100, yr);

                  var cx2 = ciX + (yr / pfYears) * ciW;

                  var cy2 = ciY + ciH - (val / maxVal) * (ciH - 50);

                  if (yr === 0) ctx.moveTo(cx2, cy2); else ctx.lineTo(cx2, cy2);

                }

                ctx.stroke();

                ctx.lineTo(ciX + ciW, ciY + ciH); ctx.lineTo(ciX, ciY + ciH); ctx.closePath();

                ctx.fillStyle = 'rgba(34,197,94,0.1)'; ctx.fill();

                ctx.font = 'bold 22px Inter, system-ui'; ctx.fillStyle = '#4ade80';

                ctx.fillText('$' + Math.round(maxVal).toLocaleString(), ciX + ciW - 170, ciY + 64);

                ctx.font = '18px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                ctx.fillText('$' + pfPrincipal.toLocaleString() + ' @ ' + pfRate + '% for ' + pfYears + ' years', ciX, ciY + ciH + 24);

                ctx.fillText('Play a year to chart your own net worth here.', ciX, ciY + ciH + 48);

              }

            }



            else if (econTab === 'stockMarket') {

              // ── Stock Market Chart ──

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

              var hist = Array.isArray(co.history) ? co.history.filter(function (v) { return typeof v === 'number' && isFinite(v); }) : [];

              if (hist.length === 0) hist = [co.price];

              if (typeof co.color !== 'string') co = Object.assign({}, co, { color: '#3b82f6' });

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

                // Your average cost: above it the holding is up, below it down.

                var heldSel = num(smPortfolio[co.ticker], 0);

                if (heldSel > 0 && num(smCost[co.ticker], 0) > 0) {

                  var avgCost = smCost[co.ticker] / heldSel;

                  if (avgCost > minP && avgCost < maxP) {

                    var acY = chY + chH - ((avgCost - minP) / priceRange) * chH;

                    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.setLineDash([10, 6]);

                    ctx.beginPath(); ctx.moveTo(chX, acY); ctx.lineTo(chX + chW, acY); ctx.stroke(); ctx.setLineDash([]);

                    ctx.font = 'bold 17px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

                    ctx.fillText('Your avg cost $' + avgCost.toFixed(2), chX + 10, acY - 8);

                  }

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

              // ── National Economy Dashboard ──

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              ctx.font = 'bold 28px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('\uD83C\uDFDB\uFE0F National Economy — Year ' + macroYear, 30, 35);

              // Indicator gauges

              var indicators = [

                { label: t('stem.economicslab.gdp_growth', 'GDP Growth'), val: macroGDP, unit: '%', good: macroGDP > 0, color: macroGDP > 2 ? '#22c55e' : macroGDP > 0 ? '#fbbf24' : '#ef4444' },

                { label: t('stem.economicslab.inflation_2', 'Inflation'), val: macroInflation, unit: '%', good: macroInflation < 3, color: macroInflation > 5 ? '#ef4444' : macroInflation > 3 ? '#fbbf24' : '#22c55e' },

                { label: t('stem.economicslab.interest_rate', 'Interest Rate'), val: macroInterest, unit: '%', good: Math.abs(macroInterest - macroInflation - 1) <= 1, color: Math.abs(macroInterest - macroInflation - 1) > 3 ? '#ef4444' : Math.abs(macroInterest - macroInflation - 1) > 1 ? '#fbbf24' : '#22c55e' },

                { label: t('stem.economicslab.unemployment_3', 'Unemployment'), val: macroUnemployment, unit: '%', good: macroUnemployment >= 3 && macroUnemployment < 5, color: macroUnemployment > 7 ? '#ef4444' : (macroUnemployment >= 5 || macroUnemployment < 3) ? '#fbbf24' : '#22c55e' },

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

              // History chart. All three series share ONE percent axis, so heights
              // and crossings mean something. (They used to be scaled separately,
              // which made every crossing an artifact.) During a mission the start
              // point and the goal/limit lines are drawn too.

              var mhRec = (d.macroMission && typeof d.macroMission === 'object') ? d.macroMission : null;
              var mhMission = mhRec ? E.missionById(mhRec.id) : null;
              var mhPts = macroHistory.map(function (h) { return { label: String(num(h.year, 0)), gdp: num(h.gdp, 0), inf: num(h.inflation, 0), un: num(h.unemployment, NaN) }; });
              var mhFrom = macroHistory[0] && macroHistory[0].from && typeof macroHistory[0].from === 'object' ? macroHistory[0].from : null;
              if (mhMission) mhPts.unshift({ label: 'start', gdp: mhMission.start.gdp, inf: mhMission.start.inf, un: mhMission.start.unemp });
              else if (mhFrom && isFinite(mhFrom.gdp) && isFinite(mhFrom.inf)) mhPts.unshift({ label: 'start', gdp: num(mhFrom.gdp, 0), inf: num(mhFrom.inf, 0), un: num(mhFrom.un, NaN) });
              var mhLines = [];
              if (mhMission) {
                mhMission.win.forEach(function (c) { mhLines.push({ key: c[0], v: c[2], text: 'goal: ' + ({ gdp: 'GDP', inf: 'inflation', unemp: 'unemployment' })[c[0]] + ' ' + (c[1].indexOf('<') === 0 ? '≤ ' : '≥ ') + c[2] + '%', color: '#4ade80' }); });
                mhMission.guard.forEach(function (c) { mhLines.push({ key: c[0], v: c[2], text: 'limit: ' + ({ gdp: 'GDP', inf: 'inflation', unemp: 'unemployment' })[c[0]] + ' ' + (c[1].indexOf('<') === 0 ? '≤ ' : '≥ ') + c[2] + '%', color: '#f87171' }); });
              }
              var mhX = 70, mhY = 140, mhW = W - 110, mhH = H - 200;
              ctx.fillStyle = '#1e293b'; ctx.fillRect(mhX, mhY, mhW, mhH);
              var phillips = d.macroChart === 'phillips';
              if (mhPts.length < 2) {
                ctx.font = '24px Inter, system-ui'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
                ctx.fillText(mhMission ? 'Mission ready: set your policy, then press "Advance One Year"' : 'Set your policy levers below, then press "Advance One Year"', W / 2, mhY + mhH / 2);
                ctx.font = '19px Inter, system-ui'; ctx.fillStyle = '#94a3b8';
                ctx.fillText('Each year plots GDP growth, inflation and unemployment on one shared scale', W / 2, mhY + mhH / 2 + 36);
                ctx.textAlign = 'left';
              } else if (!phillips) {
                var allV = [0];
                mhPts.forEach(function (p) { allV.push(p.gdp, p.inf); if (isFinite(p.un)) allV.push(p.un); });
                mhLines.forEach(function (l) { allV.push(l.v); });
                var vLo = Math.floor(Math.min.apply(null, allV)) - 1, vHi = Math.ceil(Math.max.apply(null, allV)) + 1;
                var yOf = function (v) { return mhY + mhH - (v - vLo) / (vHi - vLo) * (mhH - 38); };
                var xOf = function (k) { return mhX + 16 + k / (mhPts.length - 1) * (mhW - 32); };
                var stepV = (vHi - vLo) > 14 ? 4 : (vHi - vLo) > 7 ? 2 : 1;
                ctx.font = '17px Inter, system-ui';
                for (var gv = Math.ceil(vLo / stepV) * stepV; gv <= vHi; gv += stepV) {
                  ctx.strokeStyle = gv === 0 ? 'rgba(226,232,240,0.55)' : 'rgba(148,163,184,0.16)'; ctx.lineWidth = gv === 0 ? 2 : 1;
                  ctx.beginPath(); ctx.moveTo(mhX, yOf(gv)); ctx.lineTo(mhX + mhW, yOf(gv)); ctx.stroke();
                  ctx.fillStyle = '#94a3b8'; ctx.fillText(gv + '%', 8, yOf(gv) + 6);
                }
                mhLines.forEach(function (l) {
                  ctx.strokeStyle = l.color; ctx.lineWidth = 2; ctx.setLineDash([10, 7]);
                  ctx.beginPath(); ctx.moveTo(mhX, yOf(l.v)); ctx.lineTo(mhX + mhW, yOf(l.v)); ctx.stroke(); ctx.setLineDash([]);
                  ctx.font = 'bold 17px Inter, system-ui'; ctx.fillStyle = l.color; ctx.fillText(l.text, mhX + mhW - 290, yOf(l.v) - 8);
                });
                var series = [
                  { k: 'gdp', color: '#22c55e', dash: [], name: '— GDP growth' },
                  { k: 'inf', color: '#f87171', dash: [9, 5], name: '- - Inflation' },
                  { k: 'un', color: '#fbbf24', dash: [2, 5], name: '··· Unemployment' }
                ];
                series.forEach(function (sr) {
                  if (!mhPts.every(function (p) { return isFinite(p[sr.k]); })) return;
                  ctx.strokeStyle = sr.color; ctx.lineWidth = 3; ctx.setLineDash(sr.dash); ctx.beginPath();
                  mhPts.forEach(function (p, k) { if (k === 0) ctx.moveTo(xOf(k), yOf(p[sr.k])); else ctx.lineTo(xOf(k), yOf(p[sr.k])); });
                  ctx.stroke(); ctx.setLineDash([]);
                  mhPts.forEach(function (p, k) { ctx.fillStyle = sr.color; ctx.beginPath(); ctx.arc(xOf(k), yOf(p[sr.k]), 5, 0, Math.PI * 2); ctx.fill(); });
                });
                ctx.font = 'bold 18px Inter, system-ui';
                series.forEach(function (sr, si) { ctx.fillStyle = sr.color; ctx.fillText(sr.name, mhX + 14 + si * 190, mhY + 26); });
                ctx.font = '17px Inter, system-ui'; ctx.fillStyle = '#94a3b8';
                var every = Math.max(1, Math.ceil(mhPts.length / 10));
                mhPts.forEach(function (p, k) { if (k % every === 0 || k === mhPts.length - 1) ctx.fillText(p.label, xOf(k) - 18, mhY + mhH + 24); });
              } else {
                // Phillips curve view: each year is a dot at (unemployment, inflation).
                var pts = mhPts.filter(function (p) { return isFinite(p.un); });
                var ux = pts.map(function (p) { return p.un; }).concat([2, 8]), iy = pts.map(function (p) { return p.inf; }).concat([0, 6]);
                mhLines.forEach(function (l) { if (l.key === 'inf') iy.push(l.v); if (l.key === 'unemp') ux.push(l.v); });
                var uLo = Math.floor(Math.min.apply(null, ux)) - 1, uHi = Math.ceil(Math.max.apply(null, ux)) + 1;
                var iLo = Math.floor(Math.min.apply(null, iy)) - 1, iHi = Math.ceil(Math.max.apply(null, iy)) + 1;
                var px = function (u) { return mhX + 50 + (u - uLo) / (uHi - uLo) * (mhW - 80); };
                var py = function (v) { return mhY + mhH - 30 - (v - iLo) / (iHi - iLo) * (mhH - 76); };
                ctx.strokeStyle = 'rgba(148,163,184,0.16)'; ctx.lineWidth = 1; ctx.font = '16px Inter, system-ui'; ctx.fillStyle = '#94a3b8';
                for (var gu = Math.ceil(uLo); gu <= uHi; gu += (uHi - uLo > 10 ? 2 : 1)) { ctx.beginPath(); ctx.moveTo(px(gu), mhY + 40); ctx.lineTo(px(gu), mhY + mhH - 30); ctx.stroke(); ctx.fillText(gu + '%', px(gu) - 12, mhY + mhH - 8); }
                for (var gi2 = Math.ceil(iLo); gi2 <= iHi; gi2 += (iHi - iLo > 10 ? 2 : 1)) { ctx.beginPath(); ctx.moveTo(mhX + 50, py(gi2)); ctx.lineTo(mhX + mhW - 30, py(gi2)); ctx.stroke(); ctx.fillText(gi2 + '%', mhX + 4, py(gi2) + 5); }
                mhLines.forEach(function (l) {
                  ctx.strokeStyle = l.color; ctx.lineWidth = 2; ctx.setLineDash([10, 7]); ctx.beginPath();
                  if (l.key === 'inf') { ctx.moveTo(mhX + 50, py(l.v)); ctx.lineTo(mhX + mhW - 30, py(l.v)); }
                  else if (l.key === 'unemp') { ctx.moveTo(px(l.v), mhY + 40); ctx.lineTo(px(l.v), mhY + mhH - 30); }
                  ctx.stroke(); ctx.setLineDash([]);
                  ctx.font = 'bold 16px Inter, system-ui'; ctx.fillStyle = l.color;
                  if (l.key === 'inf') ctx.fillText(l.text, mhX + 60, py(l.v) - 8);
                  else if (l.key === 'unemp') { var nearRight = px(l.v) > mhX + mhW - 300; ctx.textAlign = nearRight ? 'right' : 'left'; ctx.fillText(l.text, px(l.v) + (nearRight ? -8 : 8), mhY + 62); ctx.textAlign = 'left'; }
                });
                ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 2.5; ctx.beginPath();
                pts.forEach(function (p, k) { if (k === 0) ctx.moveTo(px(p.un), py(p.inf)); else ctx.lineTo(px(p.un), py(p.inf)); });
                ctx.stroke();
                pts.forEach(function (p, k) {
                  var last = k === pts.length - 1;
                  ctx.fillStyle = last ? '#fbbf24' : '#c4b5fd'; ctx.beginPath(); ctx.arc(px(p.un), py(p.inf), last ? 8 : 5, 0, Math.PI * 2); ctx.fill();
                  if (k === 0 || last) { ctx.font = 'bold 16px Inter, system-ui'; ctx.fillStyle = '#e2e8f0'; ctx.fillText(p.label, px(p.un) + 10, py(p.inf) - 10); }
                });
                ctx.font = 'bold 18px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';
                ctx.fillText('Phillips curve view: inflation (up) vs unemployment (right), one dot per year', mhX + 12, mhY + 26);
              }

            }



            else if (econTab === 'entrepreneur') {

              // -- Business Sim dashboard: draws the LIVE enBiz* state --
              // Every number here comes from the same local demand model the
              // day runs on (ECON_ENGINE.bizDay), so the dashboard, the report
              // and the price lab can never disagree.

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              var bz = enBiz;

              if (!bz) {

                ctx.textAlign = 'center';

                ctx.font = 'bold 60px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

                ctx.fillText('🚀', W / 2, H / 2 - 50);

                ctx.font = 'bold 26px Inter, system-ui';

                ctx.fillText('No business yet', W / 2, H / 2 + 4);

                ctx.font = '20px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                ctx.fillText('Pick a business below (or describe your own) to see your dashboard here.', W / 2, H / 2 + 42);

                ctx.textAlign = 'left';

              }

              if (bz) {

                var bzLv = { price: enPrice, staff: enStaff, marketing: enMarketing };

                var bzSt = { rep: enRep, unitCostAdj: enAdj.unitCostAdj, fixedAdj: enAdj.fixedAdj, demandAdj: enAdj.demandAdj };

                var bzUnitCost = bz.unitCost * E.clamp(enAdj.unitCostAdj, 0.2, 5);

                var bzFixed = bz.dailyFixedCosts * E.clamp(enAdj.fixedAdj, 0.2, 5);

                ctx.font = 'bold 40px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

                ctx.fillText(bz.emoji, 40, 64);

                ctx.font = 'bold 28px Inter, system-ui';

                ctx.fillText(bz.businessName, 104, 54);

                ctx.font = '20px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                ctx.fillText('Day ' + enDay + '  |  ' + enStaff + ' staff  |  capacity ' + (bz.maxDailyCustomers + enStaff * bz.staffCapacity) + ' ' + bz.unitName + 's/day', 104, 84);

                ctx.font = 'bold 32px Inter, system-ui'; ctx.fillStyle = enCash >= 0 ? '#4ade80' : '#f87171';

                ctx.fillText('💵 ' + econFmt(enCash), 40, 134);

                ctx.font = '20px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                ctx.fillText('Reputation', 40, 176);

                ctx.fillStyle = '#1e293b'; ctx.fillRect(170, 158, 300, 22);

                ctx.fillStyle = enRep >= 70 ? '#22c55e' : enRep >= 40 ? '#fbbf24' : '#ef4444';

                ctx.fillRect(170, 158, 300 * enRep / 100, 22);

                ctx.fillStyle = '#e2e8f0'; ctx.fillText(Math.round(enRep) + '/100', 484, 176);

                ctx.font = '20px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                ctx.fillText('Price $' + enPrice.toFixed(2) + ' / ' + bz.unitName + '   Unit cost $' + bzUnitCost.toFixed(2), 40, 222);

                ctx.fillText('Daily fixed $' + Math.round(bzFixed) + (enStaff ? ' + staff $' + enStaff * bz.staffWage : '') + (enMarketing ? ' + ads $' + Math.round(enMarketing) : ''), 40, 250);

                var bzBreakEven = E.bizBreakEven(bz, bzLv, bzSt);

                ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 22px Inter, system-ui';

                ctx.fillText(isFinite(bzBreakEven) ? ('Break-even: ' + bzBreakEven + ' ' + bz.unitName + 's/day') : 'Break-even: impossible — price is below unit cost', 40, 290);

                var bzLast = enHistory[enHistory.length - 1];

                if (bzLast) {

                  ctx.font = '20px Inter, system-ui'; ctx.fillStyle = '#cbd5e1';

                  ctx.fillText((econStr(bzLast.weatherIcon, 12) || '') + ' Last day: ' + num(bzLast.customers, 0) + ' customers' + (num(bzLast.turnedAway, 0) > 0 ? ', ' + bzLast.turnedAway + ' turned away' : ''), 40, 330);

                  ctx.fillStyle = num(bzLast.profit, 0) >= 0 ? '#4ade80' : '#f87171'; ctx.font = 'bold 22px Inter, system-ui';

                  ctx.fillText('Profit ' + (num(bzLast.profit, 0) >= 0 ? '+' : '') + econFmt(bzLast.profit), 40, 362);

                }

                var phX = W * 0.55, phY = 70, phW = W * 0.41, phH = H - 150;

                ctx.fillStyle = '#1e293b'; ctx.fillRect(phX, phY, phW, phH);

                var priceMode = d.enChart === 'price';

                ctx.font = 'bold 22px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

                ctx.fillText(priceMode ? 'Price lab: daily profit at each price' : 'Daily profit', phX, phY - 14);

                if (enHistory.length === 0) {

                  ctx.font = '20px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                  ctx.fillText('Run your first day to chart it here.', phX + 20, phY + phH / 2);

                } else if (!priceMode) {

                  var maxProfit = Math.max.apply(null, enHistory.map(function (hh) { return Math.abs(num(hh.profit, 0)); })) || 1;

                  var zeroY = phY + phH / 2;

                  ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;

                  ctx.beginPath(); ctx.moveTo(phX, zeroY); ctx.lineTo(phX + phW, zeroY); ctx.stroke();

                  var bx = function (i) { return phX + 12 + (i / Math.max(1, enHistory.length - 1)) * (phW - 24); };

                  var by = function (v) { return zeroY - (num(v, 0) / maxProfit) * (phH / 2 - 16); };

                  ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.beginPath();

                  enHistory.forEach(function (hh, i) { if (i === 0) ctx.moveTo(bx(i), by(hh.profit)); else ctx.lineTo(bx(i), by(hh.profit)); });

                  ctx.stroke();

                  enHistory.forEach(function (hh, i) {

                    ctx.beginPath(); ctx.arc(bx(i), by(hh.profit), 5, 0, Math.PI * 2);

                    ctx.fillStyle = num(hh.profit, 0) >= 0 ? '#22c55e' : '#ef4444'; ctx.fill();

                  });

                  ctx.font = '18px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                  ctx.fillText('$0', phX + 4, zeroY - 6);

                } else {

                  // Price lab: every day is one experiment. Noise from weather,
                  // weekdays and luck is real, so the pattern emerges from many
                  // days. The model's average-day curve unlocks after 4 prices.

                  var ref = bz.suggestedPrice;

                  var prices = enHistory.map(function (hh) { return num(hh.price, ref); });

                  var pLo = Math.min.apply(null, prices.concat([ref * 0.6])), pHi = Math.max.apply(null, prices.concat([ref * 1.6]));

                  var curve = [];

                  var unlocked = Object.keys(enPricesTried).length >= 4;

                  if (unlocked) { for (var ci = 0; ci <= 40; ci++) { var cp = pLo + (pHi - pLo) * ci / 40; curve.push({ p: cp, v: E.bizExpected(bz, bzLv, bzSt, cp).profit }); } }

                  var profs = enHistory.map(function (hh) { return num(hh.profit, 0); }).concat(curve.map(function (c) { return c.v; })).concat([0]);

                  var vHi = Math.max.apply(null, profs), vLo = Math.min.apply(null, profs);

                  var vR = (vHi - vLo) || 1;

                  var sx = function (p) { return phX + 16 + (p - pLo) / ((pHi - pLo) || 1) * (phW - 32); };

                  var sy = function (v) { return phY + phH - 16 - (v - vLo) / vR * (phH - 32); };

                  ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(phX, sy(0)); ctx.lineTo(phX + phW, sy(0)); ctx.stroke();

                  if (unlocked) {

                    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.beginPath();

                    curve.forEach(function (c, i) { if (i === 0) ctx.moveTo(sx(c.p), sy(c.v)); else ctx.lineTo(sx(c.p), sy(c.v)); });

                    ctx.stroke(); ctx.setLineDash([]);

                    ctx.font = '17px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                    ctx.fillText('- - average-day profit (model)', phX + 12, phY + 24);

                  } else {

                    ctx.font = '17px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                    ctx.fillText('Try ' + (4 - Object.keys(enPricesTried).length) + ' more price(s) to unlock the average-day curve', phX + 12, phY + 24);

                  }

                  enHistory.forEach(function (hh) {

                    ctx.beginPath(); ctx.arc(sx(num(hh.price, ref)), sy(num(hh.profit, 0)), 7, 0, Math.PI * 2);

                    ctx.fillStyle = num(hh.profit, 0) >= 0 ? 'rgba(74,222,128,0.85)' : 'rgba(248,113,113,0.85)'; ctx.fill();

                  });

                  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);

                  ctx.beginPath(); ctx.moveTo(sx(enPrice), phY + 30); ctx.lineTo(sx(enPrice), phY + phH); ctx.stroke(); ctx.setLineDash([]);

                  ctx.font = '17px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                  ctx.fillText('$' + pLo.toFixed(2), phX + 6, phY + phH + 22);

                  ctx.fillText('$' + pHi.toFixed(2), phX + phW - 70, phY + phH + 22);

                  ctx.fillText('price →', phX + phW / 2 - 30, phY + phH + 22);

                }

              }

            }
          }, 0);

          function economicsCanvasSummary() {
            if (econTab === 'trade') return tradeSummaryText();
            if (econTab === 'supplyDemand') {
              var eqQ = (sdDemInt - sdSupInt) / (sdDemSlope + sdSupSlope);
              var eqP = sdSupInt + eqQ * sdSupSlope;
              var sdSummary = t('stem.economicslab.canvas_summary_supply_demand', 'Supply and demand graph showing demand, supply, equilibrium price, equilibrium quantity, surplus, shortage, and tax effects.') + ' P* $' + eqP.toFixed(0) + ', Q* ' + eqQ.toFixed(0) + (sdMonopoly ? ' (' + t('stem.economicslab.sum_competitive_benchmark', 'the competitive benchmark; the one seller trades at M') + ')' : '') + '.';
              if (sdDemandShift !== 0 || sdSupplyShift !== 0) {
                sdSummary += ' ' + t('stem.economicslab.canvas_summary_before', 'Before the shift:') + ' P* $' + sdBase.pStar.toFixed(0) + ', Q* ' + sdBase.qStar.toFixed(0) + '.';
              }
              if (sdOut.regime === 'ceiling' && sdOut.qd - sdOut.qs > 0.5) {
                var sumQd = Math.max(0, Math.min(100, sdOut.qd));
                var sumQs = Math.max(0, Math.min(100, sdOut.qs));
                sdSummary += ' ' + t('stem.economicslab.canvas_summary_shortage', 'Binding price ceiling: shortage of about') + ' ' + Math.max(0, sumQd - sumQs).toFixed(0) + ' ' + t('stem.economicslab.units', 'units') + '.';
              }
              if (sdOut.regime === 'floor' && sdOut.qs - sdOut.qd > 0.5 && !sdMonopoly) {
                var sumQd2 = Math.max(0, Math.min(100, sdOut.qd));
                var sumQs2 = Math.max(0, Math.min(100, sdOut.qs));
                sdSummary += ' ' + t('stem.economicslab.canvas_summary_surplus', 'Binding price floor: surplus of about') + ' ' + Math.max(0, sumQs2 - sumQd2).toFixed(0) + ' ' + t('stem.economicslab.units', 'units') + '.';
              }
              if (sdTax > 0) {
                var sumQt = sdOut.q;
                sdSummary += ' ' + t('stem.economicslab.canvas_summary_tax', 'Per-unit tax of') + ' $' + sdTax + ' ' + t('stem.economicslab.canvas_summary_tax_2', 'cuts trades to about') + ' ' + sumQt.toFixed(0) + ' ' + t('stem.economicslab.units', 'units') + ' (' + t('stem.economicslab.deadweight_loss', 'deadweight loss') + ').';
              }
              sdSummary += ' ' + t('stem.economicslab.welfare_cs', 'Consumer surplus') + ' $' + Math.round(sdOut.cs).toLocaleString() + ', ' + t('stem.economicslab.welfare_ps', 'Producer surplus') + ' $' + Math.round(sdOut.ps).toLocaleString() + (sdOut.gov > 0.5 ? ', ' + t('stem.economicslab.welfare_gov', 'Tax revenue') + ' $' + Math.round(sdOut.gov).toLocaleString() : '') + (sdOut.dwl > 0.5 ? ', ' + t('stem.economicslab.welfare_dwl', 'Deadweight loss') + ' $' + Math.round(sdOut.dwl).toLocaleString() : '') + '.';
              if (sdMonopoly) sdSummary += ' ' + t('stem.economicslab.sum_mono', 'One seller: marginal revenue curve drawn; it sells') + ' ' + sdOut.q.toFixed(0) + ' ' + t('stem.economicslab.sum_mono_2', 'units at') + ' $' + sdOut.pc.toFixed(0) + ' (' + t('stem.economicslab.sum_mono_3', 'competitive:') + ' ' + sdOut.qStar.toFixed(0) + ' ' + t('stem.economicslab.sum_mono_2', 'units at') + ' $' + sdOut.pStar.toFixed(0) + ').';
              if (sdExt !== 0) sdSummary += ' ' + (sdExt > 0 ? t('stem.economicslab.sum_ext_cost', 'External cost per unit:') : t('stem.economicslab.sum_ext_benefit', 'External benefit per unit:')) + ' $' + Math.abs(sdExt) + '. ' + t('stem.economicslab.sum_ext_q', 'The market trades') + ' ' + sdOut.q.toFixed(0) + ', ' + t('stem.economicslab.sum_ext_best', 'the best amount for society is') + ' ' + sdOut.qSoc.toFixed(0) + '; ' + t('stem.economicslab.welfare_social_dwl', 'Social deadweight loss') + ' $' + Math.round(sdOut.socialDwl).toLocaleString() + '.';
              if (d.sdShowRevenue && sdOut.q > 0.05) sdSummary += ' ' + (Math.abs(sdOut.pc - sdOut.pp) > 0.05 ? t('stem.economicslab.sum_spend', 'Buyers spend') : t('stem.economicslab.sum_rev', 'Total revenue')) + ' $' + Math.round(sdOut.pc * sdOut.q).toLocaleString() + ', ' + t('stem.economicslab.sum_elas', 'demand elasticity') + ' ' + ((sdOut.pc / Math.max(0.01, sdOut.qd)) / sdDemSlope).toFixed(2) + '.';
              if (d.sdProbe !== null && d.sdProbe !== undefined) {
                var prbQ = Math.max(0, Math.min(100, num(d.sdProbe, 50)));
                var sumPd = sdDemInt - prbQ * sdDemSlope;
                var sumPs = sdSupInt + prbQ * sdSupSlope;
                sdSummary += ' ' + t('stem.economicslab.canvas_summary_probe', 'Probe at quantity') + ' ' + prbQ + ': $' + Math.max(0, sumPd).toFixed(0) + ' / $' + Math.max(0, sumPs).toFixed(0) + '.';
              }
              sdSummary += ' ' + t('stem.economicslab.canvas_probe_hint', 'Click the graph — or focus it and use arrow keys — to probe buyer value vs producer cost at any quantity.');
              return sdSummary;
            }
            if (econTab === 'personalFinance') {
              var pfHistN = Array.isArray(d.pfHistory) ? d.pfHistory.length : 0;
              return t('stem.economicslab.canvas_summary_personal_finance_2', 'Personal finance chart: this month’s budget as a pie, and net worth by age once you have played a year.') + ' ' + t('stem.economicslab.take_home', 'Take-home') + ' $' + Math.round(pfBud.takeHome).toLocaleString() + t('stem.economicslab.per_month', '/month') + ', ' + (pfBud.leftover >= 0 ? t('stem.economicslab.left_over', 'left over') + ' $' + Math.round(pfBud.leftover).toLocaleString() : t('stem.economicslab.over_budget', 'over budget by') + ' $' + Math.round(-pfBud.leftover).toLocaleString()) + '.' + (pfHistN > 0 ? ' ' + t('stem.economicslab.net_worth_label', 'Net worth') + ' ' + econFmt(pfNetWorth) + ', ' + t('stem.economicslab.age_label', 'age') + ' ' + pfAge + '.' : '');
            }
            if (econTab === 'stockMarket') {
              var co = smCompanies[smSelected];
              return co
                ? t('stem.economicslab.canvas_summary_stock_market', 'Stock market chart showing selected company price history, portfolio cash, holdings, and current value.') + ' Selected: ' + co.ticker + ' at $' + co.price.toFixed(2) + '.'
                : t('stem.economicslab.canvas_summary_stock_market_empty', 'Stock market chart area ready for a generated market. Start a market simulation to see price history and holdings.');
            }
            if (econTab === 'entrepreneur') {
              return enBiz
                ? t('stem.economicslab.canvas_summary_business', 'Business dashboard showing cash, reputation, unit economics, break-even point, and daily profit history.') + ' ' + enBiz.businessName + ', ' + t('stem.economicslab.day', 'day') + ' ' + enDay + ', ' + econFmt(enCash) + '.'
                : t('stem.economicslab.canvas_summary_business_empty', 'Business dashboard placeholder. Launch a business below to see cash, reputation, and daily profit here.');
            }
            if (econTab === 'macro') {
              return t('stem.economicslab.canvas_summary_macro', 'National economy dashboard showing GDP growth, inflation, interest rate, unemployment, trade balance, and policy history.') + ' GDP ' + macroGDP.toFixed(1) + '%, inflation ' + macroInflation.toFixed(1) + '%, unemployment ' + macroUnemployment.toFixed(1) + '%.' + (d.macroChart === 'phillips' ? ' ' + t('stem.economicslab.canvas_summary_macro_phillips', 'Showing the Phillips curve view: one dot per year at its unemployment and inflation.') : '');
            }
            return t('stem.economicslab.canvas_summary_inquiry', 'Policy inquiry mode uses four policy levers to model a toy macro outcome. Use the policy bars below to compare GDP, inflation, and unemployment changes.');
          }

          function economicsTeacherPrompt() {
            if (econTab === 'trade') return t('stem.economicslab.teacher_prompt_trade', 'Ask students why the producer who is better at everything still gains from trade, and to justify it with opportunity cost, not speed.');
            if (econTab === 'supplyDemand') return t('stem.economicslab.teacher_prompt_supply_demand', 'Ask students to predict whether price, quantity, surplus, or shortage changes before moving a slider.');
            if (econTab === 'personalFinance') return t('stem.economicslab.teacher_prompt_personal_finance', 'Ask students to name one trade-off in the budget and one reason compound interest rewards starting early.');
            if (econTab === 'stockMarket') return t('stem.economicslab.teacher_prompt_stock_market', 'Ask students to separate price movement, business fundamentals, and portfolio risk in one explanation.');
            if (econTab === 'entrepreneur') return t('stem.economicslab.teacher_prompt_entrepreneur_2', 'Ask students to estimate break-even sales before opening, then predict what a 50% price rise will do to customers and to profit.');
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
            { id: 'trade', label: t('stem.economicslab.trade_lab', '🤝 Trade Lab') },
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



          setTimeout(econRestoreFocus, 0);

          return React.createElement('div', { className: 'economicslab-tool-shell max-w-4xl mx-auto', "data-economicslab-tool": "true", ref: econShellRef },

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

                title: t('stem.economicslab.explored_tooltip', 'How much of the lab you have explored: concepts learned, years played in the sims, quiz answers, and achievements. It measures activity, not mastery.'),

                className: 'text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border ' +

                  (econLiteracyScore >= 80 ? 'text-green-800 bg-green-50 border-green-200' :

                    econLiteracyScore >= 50 ? 'text-blue-700 bg-blue-50 border-blue-200' :

                      econLiteracyScore >= 25 ? 'text-amber-800 bg-amber-50 border-amber-200' :

                        'text-slate-600 bg-slate-50 border-slate-200')

              }, '\uD83E\uDDED ' + t('stem.economicslab.explored_label', 'Explored:') + ' ' + econLiteracyScore + '%', React.createElement('span', { className: 'sr-only' }, ' ' + t('stem.economicslab.explored_sr', '(counts activity, not mastery)'))),

              React.createElement('span', { className: 'text-[0.6875rem] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200', title: econAI ? undefined : t('stem.economicslab.offline_mode_title', 'AI is not available in this session. Every simulator still works with its built-in decks.') }, econAI ? t('stem.economicslab.ai_powered_learning', '\uD83D\uDCDA AI-Powered Learning') : t('stem.economicslab.offline_mode_badge', '\uD83D\uDCDA Built-in decks (AI off)')),

              React.createElement('button', {

                type: 'button',
                'aria-expanded': d.showAchievements ? 'true' : 'false',
                className: 'text-[0.6875rem] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 cursor-pointer',

                onClick: function () { upd('showAchievements', !(d.showAchievements)); }

              }, '\uD83C\uDFC6 ' + econAchievements.length + '/' + ECON_ACH.length + ' ' + t('stem.economicslab.achievements_word', 'achievements')),

              React.createElement('button', {
                type: 'button',
                'aria-expanded': d.showProgress ? 'true' : 'false',
                'data-economicslab-progress-button': 'true',
                className: 'text-[0.6875rem] text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 cursor-pointer font-bold',
                onClick: function () { upd('showProgress', !(d.showProgress)); }
              }, t('stem.economicslab.progress_button', '📋 My progress')),

              React.createElement('button', {

                type: 'button',
                'aria-expanded': d.showGlossary ? 'true' : 'false',
                className: 'text-[0.6875rem] text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200 cursor-pointer',

                onClick: function () { upd('showGlossary', !(d.showGlossary)); }

              }, '\uD83D\uDCD6 Glossary (' + conceptsLearned + ')'),

              React.createElement('button', {

                type: 'button',
                'aria-expanded': d.showQuiz ? 'true' : 'false',
                onClick: function () { upd('showQuiz', !(d.showQuiz)); },

                className: 'text-[0.6875rem] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 cursor-pointer font-bold'

              }, t('stem.economicslab.quiz_me', '\u270D\uFE0F Quiz Me')),

              React.createElement('button', {

                type: 'button',
                'aria-expanded': d.showAdvisor ? 'true' : 'false',
                onClick: function () { upd('showAdvisor', !(d.showAdvisor)); },

                className: 'text-[0.6875rem] text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 cursor-pointer font-bold'

              }, t('stem.economicslab.ask_tutor', '\uD83E\uDDD1\u200D\uD83C\uDFEB Ask Tutor')),

              React.createElement('select', {

                'aria-label': t('stem.economicslab.difficulty', 'Difficulty'),

                value: d.econDifficulty || 'medium',

                onChange: function (e) { upd('econDifficulty', e.target.value); if (addToast) addToast('Difficulty: ' + e.target.value.toUpperCase(), 'info'); },

                className: 'text-[0.6875rem] bg-slate-100 border border-slate-500 rounded-full px-2 py-0.5 text-slate-600 cursor-pointer'

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

            // ── The active tab's panel: everything below the tab bar ──
            React.createElement('div', {
              id: 'economicslab-panel-' + econTab,
              role: 'tabpanel',
              'aria-labelledby': 'economicslab-tab-' + econTab,
              'data-economicslab-tabpanel': 'true'
            },

            // ── Topic-accent hero band per tab ──
            (function() {
              var TAB_META = {
                supplyDemand:    { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)',  icon: '\uD83D\uDCC9', title: t('stem.economicslab.supply_demand_the_price_discovery_engi', 'Supply & Demand \u2014 the price-discovery engine'),     hint: t('stem.economicslab.demand_slopes_down_cheap_buy_more_supp', 'Demand slopes down (cheap = buy more); supply slopes up (expensive = produce more). Equilibrium price + quantity is where they cross. Adam Smith\u2019s 1776 Wealth of Nations is still the foundation.') },
                personalFinance: { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83C\uDFE6', title: t('stem.economicslab.personal_finance_budgeting_saving_cred', 'Personal Finance \u2014 budgeting, saving, credit'),     hint: t('stem.economicslab.pf_hero_hint_2', '50/30/20 of take-home pay: needs / wants / save. Compound interest rewards starting early: 30 years at 7% turns $1 into $7.61. Pay credit cards in full: at ~22% APR, card debt costs more than investments usually earn.') },
                stockMarket:     { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\uD83D\uDCC8', title: t('stem.economicslab.stock_market_ownership_at_fractional_s', 'Stock Market \u2014 ownership at fractional scale'),     hint: t('stem.economicslab.buy_a_share_own_a_slice_of_the_company', 'Buy a share = own a slice of the company. S&P 500 has averaged ~10% annual returns over 100 years. Diversify (don\u2019t bet on one ticker), hold long (time in market beats timing it).') },
                entrepreneur:    { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83C\uDFEA', title: t('stem.economicslab.business_sim_you_re_the_founder', 'Business Sim \u2014 you\u2019re the founder'),           hint: t('stem.economicslab.biz_hero_hint_2', 'Revenue \u2212 costs = profit. Break-even point is when fixed costs are covered. About 1 in 5 new US businesses closes within a year and about half within five; the survivors found product-market fit. Customer acquisition cost (CAC) vs lifetime value (LTV) is the founder\u2019s daily math.') },
                macro:           { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83C\uDFDB', title: t('stem.economicslab.national_economy_gdp_inflation_unemplo', 'National Economy \u2014 GDP, inflation, unemployment'),  hint: t('stem.economicslab.gdp_measures_total_output_cpi_measures', 'GDP measures total output; CPI measures inflation; unemployment U-3 is the headline rate. The Fed sets interest rates to balance growth vs inflation \u2014 the dual mandate Congress gave it in 1977.') }
              };
              // The inquiry tab used to fall back to the Supply & Demand hero.
              TAB_META.trade = { accent: '#0f766e', soft: 'rgba(15,118,110,0.10)', icon: '🤝', title: t('stem.economicslab.trade_hero', 'Trade Lab — why specializing makes both sides richer'), hint: t('stem.economicslab.trade_hero_hint', 'What you give up to make something (its opportunity cost) decides who should make it. Even a producer who is better at everything gains by trading: David Ricardo’s idea of comparative advantage, from 1817.') };
              TAB_META.inquiry = { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)', icon: '🔬', title: t('stem.economicslab.policy_inquiry_hero', 'Policy Inquiry — no answer key'), hint: t('stem.economicslab.policy_inquiry_hero_hint', 'Move the levers, predict the macro state BEFORE reading it, and defend your reasoning. Real economists genuinely disagree about these signs and magnitudes.') };
              // One concrete predict-then-test task per tab.
              var TAB_TRY = {
                supplyDemand: t('stem.economicslab.try_supply_demand', 'Try: set a Price Ceiling of $30 (rent control). Predict first — how many units short will the market run?'),
                personalFinance: t('stem.economicslab.try_personal_finance', 'Try: invest 15% in Balanced and choose the Roommate housing. Watch net worth vs cash over 5 years.'),
                stockMarket: t('stem.economicslab.try_stock_market', 'Try: trade for 5 days, then compare your return to the buy-and-hold Index tile. Who is winning?'),
                entrepreneur: t('stem.economicslab.try_entrepreneur', 'Try: find your break-even before opening, then test a price 50% higher for one day. What happened to profit?'),
                macro: t('stem.economicslab.try_macro', 'Try: pick "Cool inflation" as your goal, raise the interest rate 2 points, and advance one year.'),
                inquiry: t('stem.economicslab.try_inquiry', 'Try: produce stagflation (high inflation + falling GDP) with the fewest lever moves you can.'),
                trade: t('stem.economicslab.try_trade', 'Try: open "Better at both" and predict who should bake the bread before you look at the costs.')
              };
              var meta = TAB_META[econTab] || TAB_META.supplyDemand;
              return React.createElement('div', {
                className: 'economicslab-topic-card',
                'data-economicslab-topic-card': 'true',
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

            // My progress: one place that sums up every simulator, with a
            // copyable plain-text report a student can hand in or paste.
            d.showProgress && (function () {
              var notYet = t('stem.economicslab.progress_not_started', 'not started yet');
              var pfYears = Array.isArray(d.pfHistory) ? d.pfHistory.length : 0;
              var goalsMet = Array.isArray(d.pfGoalsMet) ? d.pfGoalsMet.filter(function (g) { return typeof g === 'string'; }).length : 0;
              var iqLog = (d.policyIQ && Array.isArray(d.policyIQ.log)) ? d.policyIQ.log.length : 0;
              var missionNames = {
                volcker: t('stem.economicslab.mission_volcker', 'Break the Great Inflation (1980)'),
                recovery: t('stem.economicslab.mission_recovery', 'Climb out of the Great Recession (2009)'),
                cooldown: t('stem.economicslab.mission_cooldown', 'Cool an overheating economy (2022)'),
                oilshock: t('stem.economicslab.mission_oilshock', 'Weather an oil shock (1973)'),
                softlanding: t('stem.economicslab.mission_softlanding', 'Stick the soft landing')
              };
              var wonNames = E.MACRO_MISSIONS.filter(function (m) { return macroMissionWins.indexOf(m.id) !== -1; }).map(function (m) { return missionNames[m.id] || m.id; });
              var quizTotal = num(d.quizTotal, 0);
              var rows = [
                { icon: '🕵️', label: t('stem.economicslab.progress_detective', 'Market Detective'), value: num(sdDet.tried, 0) > 0 ? num(sdDet.correct, 0) + ' ' + t('stem.economicslab.progress_cases_solved', 'cases solved perfectly') + ', ' + t('stem.economicslab.progress_best_streak', 'best streak') + ' ' + num(sdDet.best, 0) : notYet },
                { icon: '🎯', label: t('stem.economicslab.progress_scenarios', 'Scenario challenge'), value: econScenarioTotal > 0 ? econScenarioScore + '/' + econScenarioTotal + ' ' + t('stem.economicslab.progress_correct', 'correct') + ', ' + t('stem.economicslab.progress_best_streak', 'best streak') + ' ' + econBestStreak : notYet },
                { icon: '✍️', label: t('stem.economicslab.progress_quiz', 'Quiz'), value: quizTotal > 0 ? num(d.quizScore, 0) + '/' + quizTotal + ' ' + t('stem.economicslab.progress_correct', 'correct') : notYet },
                { icon: '🏭', label: t('stem.economicslab.progress_market_failure', 'Market failure lab'), value: econAchievements.some(function (a) { return a.id === 'market_fixer'; }) ? t('stem.economicslab.progress_fixed_one', 'fixed a market with a Pigouvian tax or subsidy') : notYet },
                { icon: '🤝', label: t('stem.economicslab.progress_trade', 'Trade Lab'), value: (tradeWins.length || num(tradePredStats.tried, 0)) ? tradeWins.length + ' ' + t('stem.economicslab.progress_trade_deals', 'deal(s) where both sides gained') + ', ' + num(tradePredStats.right, 0) + '/' + num(tradePredStats.tried, 0) + ' ' + t('stem.economicslab.progress_trade_preds', 'comparative-advantage predictions right') : notYet },
                { icon: '💵', label: t('stem.economicslab.progress_life', 'Life Sim'), value: pfYears > 0 ? t('stem.economicslab.progress_age', 'age') + ' ' + pfAge + ', ' + t('stem.economicslab.progress_net_worth', 'net worth') + ' ' + econFmt(pfNetWorth) + ', ' + t('stem.economicslab.progress_credit', 'credit score') + ' ' + Math.round(num(pfLife.credit, 0)) + ', ' + goalsMet + ' ' + t('stem.economicslab.progress_goals', 'goal(s) reached') : notYet },
                { icon: '📈', label: t('stem.economicslab.progress_stocks', 'Stock Market'), value: smDay > 0 ? t('stem.economicslab.day', 'day') + ' ' + smDay + ', ' + t('stem.economicslab.progress_portfolio', 'portfolio') + ' ' + econFmt(smTotalVal) + ' ' + t('stem.economicslab.progress_from_10k', '(started with $10,000)') : notYet },
                { icon: '♟️', label: t('stem.economicslab.progress_pricewar', 'Price war'), value: num(pwStats.games, 0) > 0 ? num(pwStats.games, 0) + ' ' + t('stem.economicslab.progress_pw_games', 'game(s), best total') + ' $' + num(pwStats.best, 0) + ', ' + num(pwStats.right, 0) + ' ' + t('stem.economicslab.progress_pw_read', 'rival(s) read correctly') : notYet },
                { icon: '🏪', label: t('stem.economicslab.progress_business', 'Business Sim'), value: enBiz ? econStr(enBiz.businessName, 60) + ', ' + t('stem.economicslab.day', 'day') + ' ' + num(d.enBizDay, 0) + ', ' + t('stem.economicslab.progress_cash', 'cash') + ' ' + econFmt(enCash) + ', ' + t('stem.economicslab.progress_reputation', 'reputation') + ' ' + Math.round(enRep) : notYet },
                { icon: '🏛️', label: t('stem.economicslab.progress_macro', 'National Economy'), value: (macroHistory.length > 0 || wonNames.length > 0) ? macroHistory.length + ' ' + t('stem.economicslab.progress_years', 'year(s) in the current run') + (macroHistory.some(function (h) { return h.auto; }) ? ' (' + macroHistory.filter(function (h) { return h.auto; }).length + ' ' + t('stem.economicslab.progress_on_autopilot', 'on autopilot') + ')' : '') + ', ' + t('stem.economicslab.progress_missions_won', 'missions won') + ' ' + wonNames.length + '/' + E.MACRO_MISSIONS.length + (wonNames.length ? ' (' + wonNames.join('; ') + ')' : '') : notYet },
                { icon: '🔬', label: t('stem.economicslab.progress_inquiry', 'Policy Inquiry'), value: iqLog > 0 ? iqLog + ' ' + t('stem.economicslab.progress_mixes', 'policy mix(es) logged') : notYet },
                { icon: '📖', label: t('stem.economicslab.progress_concepts', 'Concepts learned'), value: String(conceptsLearned) }
              ];
              // Suggest goals from the tab the student is on first, then one
              // per other sim, instead of always the first three in the list.
              var ACH_TAB = { six_figures: 'personalFinance', debt_race: 'personalFinance', millionaire: 'personalFinance', retirement: 'personalFinance', credit: 'personalFinance', dream: 'personalFinance', debt_free: 'personalFinance', goal: 'personalFinance', market_gains: 'stockMarket', wolf: 'stockMarket', trader: 'stockMarket', diversified: 'stockMarket', know_thyself: 'stockMarket', stress_tested: 'stockMarket', survivor: 'entrepreneur', tycoon: 'entrepreneur', five_star: 'entrepreneur', job_creator: 'entrepreneur', price_scientist: 'entrepreneur', strategist: 'entrepreneur', veteran: 'macro', boom: 'macro', full_employment: 'macro', soft_landing: 'macro', mission: 'macro', all_missions: 'macro', market_fixer: 'supplyDemand', trustbuster: 'supplyDemand', detective: 'supplyDemand', researcher: 'inquiry', gains_from_trade: 'trade' };
              var lockedAll = ECON_ACH.filter(function (a) { return !a.earned; });
              var tabsUsed = {};
              var locked = lockedAll.filter(function (a) { return ACH_TAB[a.id] === econTab; }).slice(0, 2);
              lockedAll.forEach(function (a) {
                var tb = ACH_TAB[a.id] || 'any';
                if (locked.length < 3 && locked.indexOf(a) === -1 && tb !== econTab && !tabsUsed[tb]) { tabsUsed[tb] = true; locked.push(a); }
              });
              var note = typeof d.progressNote === 'string' ? d.progressNote.slice(0, 500) : '';
              var report = [
                t('stem.economicslab.progress_report_title', 'Economics Lab progress report') + ' (' + new Date().toLocaleDateString() + ')',
                t('stem.economicslab.progress_explored', 'Lab explored') + ': ' + econLiteracyScore + '%',
                t('stem.economicslab.progress_achievements', 'Achievements') + ': ' + econAchievements.length + '/' + ECON_ACH.length + (econAchievements.length ? ' (' + econAchievements.map(function (a) { return a.title; }).join(', ') + ')' : '')
              ].concat(rows.map(function (r) { return r.label + ': ' + r.value; }))
                .concat(note.trim() ? [t('stem.economicslab.progress_reflection', 'What I learned') + ': ' + note.trim()] : [])
                .join('\n');
              var showText = function () {
                upd('progressShowText', true);
                setTimeout(function () { var el = document.getElementById('econ-progress-text'); if (el) { el.focus(); el.select(); } }, 60);
              };
              var copy = function () {
                var ok = function () { if (addToast) addToast(t('stem.economicslab.progress_copied', '📋 Progress report copied'), 'success'); if (announceToSR) announceToSR(t('stem.economicslab.progress_copied', '📋 Progress report copied')); };
                var fail = function () { showText(); if (addToast) addToast(t('stem.economicslab.progress_copy_manual', 'Copying is blocked here: the report text is selected, so press Ctrl+C (or Cmd+C).'), 'info'); };
                try {
                  (window.StemLab.writeClipboard || function (value) { return navigator.clipboard.writeText(value); })(report).then(ok, fail);
                } catch (e) { fail(); }
              };
              return React.createElement('div', { className: 'bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-200 mb-4', 'data-economicslab-progress': 'true', role: 'region', 'aria-label': t('stem.economicslab.progress_title', 'My progress') },
                React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                  React.createElement('h4', { className: 'text-sm font-bold text-teal-900 m-0' }, t('stem.economicslab.progress_title_full', '📋 My progress across the lab')),
                  React.createElement('button', { type: 'button', 'aria-label': t('stem.economicslab.close_progress', 'Close progress'), onClick: function () { upd('showProgress', false); }, className: 'text-teal-800 hover:text-teal-950 text-xs' }, '✕')
                ),
                React.createElement('p', { className: 'text-[0.6875rem] text-slate-700 m-0 mb-2' },
                  t('stem.economicslab.progress_explored', 'Lab explored') + ': ' + econLiteracyScore + '% (' + t('stem.economicslab.explored_note', 'activity, not mastery') + ') · ' + t('stem.economicslab.progress_achievements', 'Achievements') + ': ' + econAchievements.length + '/' + ECON_ACH.length),
                React.createElement('ul', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-1.5 list-none p-0 m-0 mb-3' },
                  rows.map(function (r, ri) {
                    var started = r.value !== notYet;
                    return React.createElement('li', { key: ri, 'data-progress-row': ri, className: 'bg-white rounded-lg px-2.5 py-1.5 border ' + (started ? 'border-teal-200' : 'border-slate-200') },
                      React.createElement('div', { className: 'text-[0.6875rem] font-bold ' + (started ? 'text-teal-900' : 'text-slate-700') }, React.createElement('span', { 'aria-hidden': 'true' }, r.icon + ' '), r.label),
                      React.createElement('div', { className: 'text-[0.6875rem] ' + (started ? 'text-slate-800' : 'text-slate-600 italic') }, r.value)
                    );
                  })
                ),
                locked.length > 0 && React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 mb-3' },
                  React.createElement('span', { className: 'font-bold text-teal-900' }, t('stem.economicslab.progress_try_next', 'Try next:') + ' '),
                  locked.map(function (a) { return a.icon + ' ' + a.title + ' (' + a.desc + ')'; }).join(' · ')
                ),
                React.createElement('label', { htmlFor: 'econ-progress-note', className: 'block text-[0.6875rem] font-bold text-teal-900 mb-1' }, t('stem.economicslab.progress_reflection_prompt', 'One thing I learned (goes into the report):')),
                React.createElement('textarea', { id: 'econ-progress-note', value: note, maxLength: 500, rows: 2, onChange: function (e) { upd('progressNote', String(e.target.value || '').slice(0, 500)); }, className: 'w-full text-xs rounded-lg border border-slate-500 p-2 mb-2', placeholder: t('stem.economicslab.progress_reflection_placeholder', 'e.g. A tax on pollution can make a market better, not worse.') }),
                React.createElement('div', { className: 'flex flex-wrap gap-2 items-center' },
                  React.createElement('button', { type: 'button', onClick: copy, 'data-economicslab-progress-copy': 'true', className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-700 text-white' }, t('stem.economicslab.progress_copy', '📋 Copy report')),
                  React.createElement('button', { type: 'button', 'aria-expanded': d.progressShowText ? 'true' : 'false', onClick: function () { upd('progressShowText', !d.progressShowText); }, className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-teal-900 border border-teal-300' }, d.progressShowText ? t('stem.economicslab.progress_hide_text', 'Hide report text') : t('stem.economicslab.progress_show_text', 'Show report text'))
                ),
                d.progressShowText && React.createElement('textarea', { id: 'econ-progress-text', readOnly: true, value: report, rows: Math.min(16, rows.length + 5), 'aria-label': t('stem.economicslab.progress_report_title', 'Economics Lab progress report'), className: 'w-full mt-2 text-[0.6875rem] font-mono rounded-lg border border-slate-500 p-2 bg-white text-slate-800' })
              );
            })(),

            // Achievement panel

            d.showAchievements && React.createElement('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200 mb-4' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFC6 Achievements (' + econAchievements.length + '/' + ECON_ACH.length + ')'),

                React.createElement('button', { type: 'button', 'aria-label': t('stem.economicslab.close_achievements', 'Close achievements'), onClick: function () { upd('showAchievements', false); }, className: 'text-amber-700 hover:text-amber-900 text-xs' }, '\u2715')

              ),

              React.createElement('p', { className: 'text-[0.6875rem] text-amber-800 mb-2 m-0' }, t('stem.economicslab.ach_locked_hint', 'Greyed-out badges are still locked. Each one says how to earn it.')),

              React.createElement('div', { className: 'grid grid-cols-4 gap-2' },

                econAchievements.concat(ECON_ACH.filter(function (a) { return !a.earned; })).map(function (a) {

                  return React.createElement('div', { key: a.id, 'data-econ-ach': a.id, 'data-earned': a.earned ? 'true' : 'false', className: 'rounded-lg p-2 text-center border ' + (a.earned ? 'bg-white border-amber-200 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300') },

                    React.createElement('div', { className: 'text-xl', 'aria-hidden': 'true', style: a.earned ? null : { filter: 'grayscale(1)', opacity: 0.45 } }, a.icon),

                    React.createElement('div', { className: 'text-[0.6875rem] font-bold mt-1 ' + (a.earned ? 'text-amber-800' : 'text-slate-600') }, (a.earned ? '' : '\uD83D\uDD12 ') + a.title),

                    React.createElement('div', { className: 'text-[0.6875rem] ' + (a.earned ? 'text-amber-700' : 'text-slate-600') }, a.desc),

                    !a.earned && React.createElement('span', { className: 'sr-only' }, t('stem.economicslab.ach_locked_sr', 'Locked.'))

                  );

                })

              )

            ),

            // Glossary panel

            d.showGlossary && React.createElement('div', { className: 'bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200 mb-4 max-h-60 overflow-y-auto' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-violet-800' }, '\uD83D\uDCD6 Economics Glossary (' + econGlossaryList.length + ' concepts learned)'),

                React.createElement('div', { className: 'flex items-center gap-2' },

                  econGlossaryList.length > 0 && React.createElement('button', {
                    onClick: function () {
                      var glossaryText = econGlossaryList.map(function (g) { return g.concept + ' \u2014 ' + g.explanation; }).join('\n');
                      try { (window.StemLab && window.StemLab.writeClipboard || function (value) { return navigator.clipboard.writeText(value); })(glossaryText); if (addToast) addToast(t('stem.economicslab.glossary_copied', 'Glossary copied \u2014 paste it into your notes'), 'success'); } catch (e) { if (addToast) addToast('Copy failed', 'error'); }
                    },
                    className: 'text-[0.6875rem] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 font-bold'
                  }, t('stem.economicslab.copy_glossary', '\uD83D\uDCCB Copy')),

                  React.createElement('button', { onClick: function () { upd('showGlossary', false); }, className: 'text-violet-400 hover:text-violet-600 text-xs', 'aria-label': t('stem.economicslab.close_glossary', 'Close glossary') }, '\u2715')

                )

              ),

              econGlossaryList.length === 0 ? React.createElement('p', { className: 'text-xs text-violet-700 text-center py-4' }, t('stem.economicslab.play_the_simulations_to_discover_econo', 'Play the simulations to discover economics concepts! Each event teaches a new concept that gets added here.')) :

                React.createElement('div', { className: 'space-y-2' },

                  econGlossaryList.map(function (g, gi) {

                    return React.createElement('div', { key: gi, className: 'bg-white rounded-lg p-2 border border-violet-100' },

                      React.createElement('div', { className: 'flex items-center gap-2' },

                        React.createElement('span', { className: 'text-[0.6875rem] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-bold' }, econStr(g.tab, 40)),

                        React.createElement('span', { className: 'text-[0.6875rem] font-bold text-slate-700' }, econStr(g.concept, 120))

                      ),

                      React.createElement('p', { className: 'text-[0.6875rem] text-slate-600 mt-1' }, econStr(g.explanation, 600))

                    );

                  })

                )

            ),

            // Quiz mode

            d.showQuiz && React.createElement('div', { className: 'bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200 mb-4' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-rose-800' }, t('stem.economicslab.economics_quiz', '\u270D\uFE0F Economics Quiz')),

                React.createElement('button', { type: 'button', 'aria-label': t('stem.economicslab.close_quiz', 'Close quiz'), onClick: function () { updMany({ showQuiz: false, quizQuestion: null }); }, className: 'text-rose-700 hover:text-rose-900 text-xs' }, '\u2715')

              ),

              (function () {
                // AI questions are data: validate the shape before rendering.
                var qq = d.quizQuestion;
                var qOk = qq && typeof qq === 'object' && typeof qq.question === 'string' && Array.isArray(qq.options) && qq.options.length >= 2 && typeof qq.correctIndex === 'number' && qq.correctIndex >= 0 && qq.correctIndex < qq.options.length;
                if (qOk) {
                  var isAnswered = typeof d.quizAnswer === 'number';
                  return React.createElement('div', null,
                    React.createElement('p', { className: 'text-xs text-slate-700 font-bold mb-3' }, econStr(qq.question, 500)),
                    React.createElement('div', { className: 'grid gap-2' },
                      qq.options.map(function (opt, oi) {
                        var isCorrect = oi === qq.correctIndex;
                        var isSelected = d.quizAnswer === oi;
                        return React.createElement('button', {
                          key: oi,
                          type: 'button',
                          disabled: isAnswered,
                          onClick: function () {
                            if (isAnswered) return;
                            updMany({ quizAnswer: oi, quizScore: num(d.quizScore, 0) + (isCorrect ? 1 : 0), quizTotal: num(d.quizTotal, 0) + 1 });
                            if (isCorrect) addXP(20, 'Economics Quiz: Correct answer!');
                            if (announceToSR) announceToSR(isCorrect ? t('stem.economicslab.quiz_sr_correct', 'Correct.') : t('stem.economicslab.quiz_sr_wrong', 'Not quite. Read the explanation.'));
                          },
                          className: 'w-full text-left p-3 rounded-xl border-2 text-xs transition-all ' +
                            (isAnswered && isCorrect ? 'border-green-400 bg-green-50 text-green-800' :
                              isAnswered && isSelected && !isCorrect ? 'border-red-400 bg-red-50 text-red-800' :
                                isAnswered ? 'border-slate-400 bg-white text-slate-600' :
                                  'border-rose-100 bg-white hover:border-rose-400 text-slate-700')
                        }, (isAnswered && isCorrect ? '✅ ' : isAnswered && isSelected ? '❌ ' : '') + econStr(opt, 300));
                      })
                    ),
                    isAnswered && React.createElement('div', { className: 'mt-3 bg-white rounded-lg p-3 border border-rose-100' },
                      React.createElement('p', { className: 'text-xs text-slate-600' },
                        React.createElement('span', { className: 'font-bold text-rose-700' }, t('stem.economicslab.explanation', '📚 Explanation: ')),
                        econStr(qq.explanation, 800)
                      )
                    ),
                    isAnswered && React.createElement('button', {
                      type: 'button',
                      onClick: function () { updMany({ quizQuestion: null, quizAnswer: null }); },
                      className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200'
                    }, t('stem.economicslab.next_question', '➡️ Next Question'))
                  );
                }
                return React.createElement('div', { className: 'text-center' },
                  React.createElement('div', { className: 'text-xs text-slate-600 mb-2' }, 'Score: ' + num(d.quizScore, 0) + '/' + num(d.quizTotal, 0) + (num(d.quizTotal, 0) > 0 ? ' (' + Math.round(num(d.quizScore, 0) / num(d.quizTotal, 1) * 100) + '%)' : '')),
                  !econAI && React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 bg-white border border-rose-200 rounded-lg p-2 mb-2' },
                    t('stem.economicslab.quiz_offline_2', 'AI quiz questions are not available in this session. The Challenge deck has') + ' ' + ECON_SCENARIOS.length + ' ' + t('stem.economicslab.quiz_offline_3', 'scenario questions with explanations, and Market Detective on the Supply & Demand tab has') + ' ' + E.SD_CASES.filter(function (c) { return c.level <= (d.econDifficulty === 'easy' ? 1 : d.econDifficulty === 'hard' ? 3 : 2); }).length + ' ' + t('stem.economicslab.quiz_offline_4', 'more at this difficulty.'),
                    React.createElement('button', { type: 'button', onClick: function () { updMany({ showScenarioChallenge: true, showQuiz: false }); }, className: 'block mx-auto mt-2 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold bg-rose-700 text-white' }, t('stem.economicslab.open_challenge', '🎯 Open the Challenge deck'))),
                  econAI && React.createElement('button', {
                    type: 'button',
                    onClick: function () {
                      upd('quizLoading', Date.now());
                      var topics = econGlossaryList.map(function (g) { return econStr(g.concept, 60); }).filter(Boolean).join(', ') || 'supply and demand, inflation, GDP, interest rates, opportunity cost';
                      var prompt = 'You are an economics teacher creating a quiz (difficulty: ' + (d.econDifficulty || 'medium') + '). The student has studied these topics: ' + topics + '.\n\nGenerate 1 multiple-choice question. Return ONLY valid JSON:\n{"question":"<question text>","options":["<option A>","<option B>","<option C>","<option D>"],"correctIndex":<0-3>,"explanation":"<2-3 sentence explanation of the correct answer and the underlying economic concept>"}\n\nMake questions that test UNDERSTANDING, not just definitions. Include real-world application questions, cause-and-effect reasoning, and scenario-based problems. Vary difficulty. Keep all four options similar in length.';
                      econAsk(prompt).then(function (result) {
                        try {
                          var q = econParseJSON(result);
                          var opts = Array.isArray(q.options) ? q.options.filter(function (o) { return typeof o === 'string' && o.trim(); }).slice(0, 4) : [];
                          var ci = Math.round(num(q.correctIndex, -1));
                          if (typeof q.question !== 'string' || opts.length < 2 || ci < 0 || ci >= opts.length) throw new Error('bad quiz shape');
                          // Language models favor one slot for the right answer;
                          // shuffle once here (not in render) and move the key with it.
                          var order = opts.map(function (_, i) { return i; });
                          for (var k = order.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)); var tmp = order[k]; order[k] = order[j]; order[j] = tmp; }
                          updMany({ quizQuestion: { question: q.question.slice(0, 500), options: order.map(function (i) { return opts[i].slice(0, 300); }), correctIndex: order.indexOf(ci), explanation: econStr(q.explanation, 800) }, quizAnswer: null, quizLoading: false });
                        } catch (err) { upd('quizLoading', false); if (addToast) addToast(t('stem.economicslab.quiz_failed_offline_hint', 'Quiz generation failed — try the Challenge scenarios in the reference shelf (they work offline)'), 'error'); }
                      }).catch(function () { upd('quizLoading', false); if (addToast) addToast(t('stem.economicslab.quiz_failed_offline_hint', 'Quiz generation failed — try the Challenge scenarios in the reference shelf (they work offline)'), 'error'); });
                    },
                    disabled: econBusy(d.quizLoading),
                    className: 'py-3 px-8 rounded-xl text-sm font-bold transition-all ' + (econBusy(d.quizLoading) ? 'bg-slate-300 text-slate-600' : 'bg-rose-700 text-white hover:shadow-lg')
                  }, econBusy(d.quizLoading) ? '⏳ Generating...' : '🎲 Generate Quiz Question')
                );
              })()

            ),

            // AI Economic Advisor

            d.showAdvisor && React.createElement('div', { className: 'bg-gradient-to-r from-sky-50 to-cyan-50 rounded-xl p-4 border border-sky-200 mb-4' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-sky-800' }, t('stem.economicslab.ai_economics_tutor', '\uD83E\uDDD1\u200D\uD83C\uDFEB AI Economics Tutor')),

                React.createElement('button', { type: 'button', 'aria-label': t('stem.economicslab.close_tutor', 'Close tutor'), onClick: function () { upd('showAdvisor', false); }, className: 'text-sky-700 hover:text-sky-900 text-xs' }, '\u2715')

              ),

              econStr(d.advisorAnswer, 6000) && React.createElement('div', { className: 'bg-white rounded-lg p-3 border border-sky-100 mb-3 text-xs text-slate-700 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto' },

                econStr(d.advisorAnswer, 6000)

              ),

              !econAI && React.createElement('p', { className: 'text-[0.6875rem] text-slate-700 bg-white border border-sky-200 rounded-lg p-2 mb-2 m-0' }, t('stem.economicslab.tutor_offline', 'The AI tutor is not available in this session. The Concepts, Quick ref and Indicators cards in the reference shelf cover the core ideas, and every simulator explains its own results.')),

              React.createElement('div', { className: 'flex gap-2' },

                React.createElement('input', {

                  type: 'text',

                  'aria-label': t('stem.economicslab.advisor_question', 'Ask an economics question'),

                  value: econStr(d.advisorInput, 500),

                  disabled: !econAI,

                  onChange: function (e) { upd('advisorInput', e.target.value); },

                  onKeyDown: function (e) { if (e.key === 'Enter' && econStr(d.advisorInput, 500).trim()) { var askBtn = document.getElementById('econ-advisor-ask'); if (askBtn) askBtn.click(); } },

                  placeholder: t('stem.economicslab.ask_any_economics_question', 'Ask any economics question...'),

                  className: 'flex-1 px-3 py-2 border-2 border-sky-200 rounded-xl text-xs focus:border-sky-400'

                }),

                React.createElement('button', {

                  id: 'econ-advisor-ask',

                  type: 'button',

                  onClick: function () {

                    var question = econStr(d.advisorInput, 500).trim();

                    if (!question || econBusy(d.advisorLoading)) return;

                    upd('advisorLoading', Date.now());

                    var context = 'Student is using an economics simulator with: Supply & Demand (equilibrium, shifts, price controls), Personal Finance Life Sim (age ' + pfAge + ', salary $' + Math.round(pfSalary) + ', credit ' + pfLife.credit + '), Stock Market (day ' + smDay + '), Business Sim (day ' + (enBiz ? enDay : 0) + '), and National Economy (GDP ' + macroGDP + '%, inflation ' + macroInflation + '%, interest ' + macroInterest + '%).';

                    var prompt = 'You are a friendly economics tutor for students. ' + context + '\n\nStudent asks: "' + question + '"\n\nProvide a clear, educational answer. Use real-world examples. If relevant, explain how this connects to what the student is experiencing in their simulation. Keep the answer concise but thorough (3-5 paragraphs max). Use simple language appropriate for students.';

                    econAsk(prompt).then(function (result) {

                      var answer = econStr(result, 6000);

                      if (!answer) throw new Error('empty answer');

                      updMany({ advisorAnswer: answer, advisorLoading: false, advisorInput: '' });

                      // Add to glossary

                      var gl = econGlossaryList.slice();

                      var exists = gl.some(function (g) { return g.concept === question.substring(0, 50); });

                      if (!exists && gl.length < 100) { gl.push({ tab: 'Advisor', concept: question.substring(0, 50), explanation: answer.substring(0, 200) + '...' }); upd('econGlossary', gl); }

                      addXP(10, 'Asked an economics question');

                    }).catch(function () { upd('advisorLoading', false); if (addToast) addToast(t('stem.economicslab.tutor_failed', 'The tutor could not answer right now. Try again in a moment.'), 'error'); });

                  },

                  disabled: !econAI || econBusy(d.advisorLoading) || !econStr(d.advisorInput, 500).trim(),

                  className: 'px-4 py-2 rounded-xl text-xs font-bold ' + (econBusy(d.advisorLoading) || !econAI ? 'bg-slate-300 text-slate-600' : 'bg-sky-700 text-white')

                }, econBusy(d.advisorLoading) ? '⏳' : '💬 Ask')

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

                    className: 'text-[0.6875rem] px-2 py-1 rounded-full bg-sky-100 text-sky-800 hover:bg-sky-200'

                  }, q);

                })

              )

            ),

            
            
            
            // === ECONOMICS SCENARIO CHALLENGES ===
            d.showScenarioChallenge && React.createElement('div', { className: 'bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200 mb-4' },
              React.createElement('h4', { className: 'text-sm font-bold text-rose-800 mb-2' }, '\uD83C\uDFAF Economics Scenarios (' + (econScenarioIdx + 1) + '/' + ECON_SCENARIOS.length + ')'),
              // Streak + score
              React.createElement('div', { className: 'flex justify-between items-center mb-2' },
                econStreak > 0 ? React.createElement('span', { className: 'inline-block px-3 py-0.5 rounded-full text-[0.6875rem] font-bold ' + (econStreak >= 5 ? 'bg-amber-700 text-white motion-reduce:animate-none animate-pulse' : econStreak >= 3 ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600') },
                  '\uD83D\uDD25 ' + econStreak + ' streak!' + (econStreak >= 5 ? ' AMAZING!' : econStreak >= 3 ? ' On fire!' : '')) : null,
                React.createElement('span', { className: 'text-[0.6875rem] text-slate-600' }, 'Score: ' + econScenarioScore + '/' + econScenarioTotal + ' | Best: ' + econBestStreak)
              ),
              econScenarioTotal >= ECON_SCENARIOS.length && React.createElement('div', { className: 'text-[0.6875rem] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 mb-2 text-center' },
                t('stem.economicslab.scenario_complete', '🏁 Full deck answered! ') + econScenarioScore + '/' + econScenarioTotal + t('stem.economicslab.scenario_complete_2', ' correct, best streak ') + econBestStreak + t('stem.economicslab.scenario_complete_3', '. Scenarios repeat — can you beat your streak?')),
              (function() {
                var sc = ECON_SCENARIOS[econScenarioIdx];
                if (!sc) return null;
                var answered = econScenarioAnswer >= 0;
                var isCorrect = econScenarioAnswer === sc.correct;
                return React.createElement('div', null,
                  React.createElement('div', { className: 'bg-white rounded-xl p-3 mb-2 border border-rose-100' },
                    React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, sc.scenario)
                  ),
                  React.createElement('div', { className: 'text-[0.6875rem] font-bold text-slate-800 mb-2' }, sc.question),
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
                        React.createElement('span', { className: 'font-bold mr-1 ' + (answered && isRight ? 'text-green-800' : answered && isSelected ? 'text-red-700' : 'text-slate-400') }, (answered && isRight ? '✅ ' : answered && isSelected ? '❌ ' : '') + String.fromCharCode(65 + oi) + '.'),
                        React.createElement('span', { className: answered && isRight ? 'text-green-800' : answered && isSelected && !isRight ? 'text-red-600' : 'text-slate-700' }, ' ' + opt)
                      );
                    })
                  ),
                  answered && React.createElement('div', { className: 'space-y-2' },
                    React.createElement('div', { className: 'rounded-xl p-2.5 text-[0.6875rem] ' + (isCorrect ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700') },
                      (isCorrect ? '\u2705 ' : '\u274C ') + sc.explain
                    ),
                    React.createElement('div', { className: 'rounded-xl p-2 text-[0.6875rem] bg-indigo-50 border border-indigo-200 text-indigo-700' },
                      '\uD83D\uDCDA Concept: ' + sc.concept
                    ),
                    React.createElement('button', {
                      onClick: function() {
                        upd('econScenarioIdx', (econScenarioIdx + 1) % ECON_SCENARIOS.length);
                        upd('econScenarioAnswer', -1);
                      },
                      className: 'w-full py-2 rounded-xl text-xs font-bold bg-rose-700 text-white'
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
                  'aria-expanded': d.showEconTimeline ? 'true' : 'false', 'aria-label': (d.showEconTimeline ? t('stem.economicslab.ref_hide', 'Hide') : t('stem.economicslab.ref_show', 'Show')) + ' ' + t('stem.economicslab.ref_name_timeline', 'the economic timeline'),
                    onClick: function() { upd('showEconTimeline', !(d.showEconTimeline)); },
                  className: 'text-[0.6875rem] text-slate-600 hover:text-slate-700 font-bold'
                }, d.showEconTimeline ? 'Hide' : 'Explore \u2192')
              ),
              d.showEconTimeline && React.createElement('div', { className: 'relative ml-3 max-h-80 overflow-y-auto', tabIndex: 0, role: 'region', 'aria-label': t('stem.economicslab.economic_timeline', 'Economic timeline') },
                React.createElement('div', { className: 'absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-400 via-red-400 to-blue-400' }),
                React.createElement('div', { className: 'space-y-2 pl-5' },
                  ECON_EVENTS.map(function(ev, ei) {
                    var isActive = d.econEventIdx === ei;
                    return React.createElement('div', { key: ei,
                      role: 'button', tabIndex: 0, 'aria-expanded': isActive ? 'true' : 'false',
                      onClick: function() { upd('econEventIdx', isActive ? null : ei); },
                      onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('econEventIdx', isActive ? null : ei); } },
                      className: 'relative cursor-pointer rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400'
                    },
                      React.createElement('div', { className: 'absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-slate-400' }),
                      React.createElement('div', { className: 'rounded-xl p-2.5 border transition-all ' + (isActive ? 'border-slate-400 bg-white shadow-md' : 'border-slate-100 bg-slate-50 hover:bg-white') },
                        React.createElement('div', { className: 'flex items-center gap-1.5' },
                          React.createElement('span', { className: 'text-lg' }, ev.icon),
                          React.createElement('span', { className: 'text-[0.6875rem] font-black text-amber-600 font-mono' }, ev.year),
                          React.createElement('span', { className: 'text-[0.6875rem] text-slate-700 font-bold flex-1' }, ev.event)
                        ),
                        isActive && React.createElement('div', { className: 'mt-2 space-y-1.5 pl-7' },
                          React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' },
                            React.createElement('span', { className: 'font-bold text-red-600' }, t('stem.economicslab.impact', '\uD83D\uDCA5 Impact: ')),
                            ev.impact
                          ),
                          React.createElement('div', { className: 'text-[0.6875rem] text-indigo-600 bg-indigo-50 rounded-lg p-1.5 border border-indigo-100' },
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
                  'aria-expanded': d.showEconQuickRef ? 'true' : 'false', 'aria-label': (d.showEconQuickRef ? t('stem.economicslab.ref_hide', 'Hide') : t('stem.economicslab.ref_show', 'Show')) + ' ' + t('stem.economicslab.ref_name_quickref', 'the quick reference'),
                    onClick: function() { upd('showEconQuickRef', !(d.showEconQuickRef)); },
                  style: { color: ecoInk('#b45309') }, className: 'text-[0.6875rem] text-amber-700 hover:text-amber-800 font-bold'
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
                      React.createElement('span', { className: 'text-[0.6875rem] font-black', style: { color: ecoInk(card.color) } }, card.title)
                    ),
                    React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 leading-relaxed' }, card.content)
                  );
                })
              )
            ),


            // === INFLATION CALCULATOR ===
            d.showInflationCalc && React.createElement('div', { className: 'bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-red-800' }, t('stem.economicslab.inflation_calculator', '\uD83D\uDCB2 Inflation Calculator')),
                React.createElement('button', {
                  'aria-expanded': d.showInflationCalc ? 'true' : 'false', 'aria-label': (d.showInflationCalc ? t('stem.economicslab.ref_hide', 'Hide') : t('stem.economicslab.ref_show', 'Show')) + ' ' + t('stem.economicslab.ref_name_inflation', 'the inflation calculator'),
                    onClick: function() { upd('showInflationCalc', !(d.showInflationCalc)); },
                  className: 'text-[0.6875rem] text-red-700 hover:text-red-700 font-bold'
                }, d.showInflationCalc ? 'Hide' : 'Calculate \u2192')
              ),
              d.showInflationCalc && React.createElement('div', null,
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 italic mb-3' }, t('stem.economicslab.see_how_inflation_erodes_purchasing_po', 'See how inflation erodes purchasing power over time. A dollar today is worth more than a dollar tomorrow!')),
                React.createElement('div', { className: 'grid grid-cols-3 gap-3 mb-3' },
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[0.6875rem] font-bold text-red-600 block mb-0.5' }, t('stem.economicslab.amount', 'Amount ($)')),
                    React.createElement('input', { 'aria-label': t('stem.economicslab.amount', 'Amount ($)'), type: 'number', value: d.inflationAmt || 100,
                      onChange: function(e) { upd('inflationAmt', parseFloat(e.target.value) || 100); },
                      className: 'w-full px-2 py-1.5 border border-red-200 rounded-lg text-xs focus:border-red-400'
                    })
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[0.6875rem] font-bold text-red-600 block mb-0.5' }, t('stem.economicslab.inflation_rate', 'Inflation Rate (%)')),
                    React.createElement('input', { type: 'range', 'aria-valuetext': (d.inflationRate || 3) + '%', 'aria-label': t('stem.economicslab.inflation_rate_percent', 'Inflation rate, percent'), min: 0.5, max: 15, step: 0.5, value: d.inflationRate || 3,
                      onChange: function(e) { upd('inflationRate', parseFloat(e.target.value)); },
                      className: 'w-full accent-red-500'
                    }),
                    React.createElement('div', { className: 'text-[0.6875rem] text-center text-red-600 font-bold' }, (d.inflationRate || 3) + '%')
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[0.6875rem] font-bold text-red-600 block mb-0.5' }, t('stem.economicslab.years', 'Years')),
                    React.createElement('input', { type: 'range', 'aria-valuetext': (d.inflationYears || 20) + ' years', 'aria-label': t('stem.economicslab.years_2', 'Years'), min: 1, max: 50, value: d.inflationYears || 20,
                      onChange: function(e) { upd('inflationYears', parseInt(e.target.value)); },
                      className: 'w-full accent-red-500'
                    }),
                    React.createElement('div', { className: 'text-[0.6875rem] text-center text-red-600 font-bold' }, (d.inflationYears || 20) + ' years')
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
                    React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 mt-0.5' }, 'Your $' + amt + ' will only buy $' + futureValue.toFixed(2) + ' worth of today\'s goods in ' + yrs + ' years'),
                    React.createElement('div', { className: 'text-[0.6875rem] font-bold text-red-700 mt-1' }, '\uD83D\uDCC9 ' + lostPct + '% of purchasing power lost!'),
                    React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 mt-1 italic' }, 'Rule of 72: Money loses half its value in ~' + Math.round(72 / ((d.inflationRate || 3))) + ' years at ' + (d.inflationRate || 3) + '% inflation')
                  );
                })()
              )
            ),

            // === BUSINESS CYCLE DIAGRAM ===
            d.showBizCycle && React.createElement('div', { className: 'bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-green-800' }, t('stem.economicslab.business_cycle', '\uD83D\uDD04 Business Cycle')),
                React.createElement('button', {
                  'aria-expanded': d.showBizCycle ? 'true' : 'false', 'aria-label': (d.showBizCycle ? t('stem.economicslab.ref_hide', 'Hide') : t('stem.economicslab.ref_show', 'Show')) + ' ' + t('stem.economicslab.ref_name_cycle', 'the business cycle'),
                    onClick: function() { upd('showBizCycle', !(d.showBizCycle)); },
                  style: { color: ecoInk('#15803d') }, className: 'text-[0.6875rem] text-green-700 hover:text-green-900 font-bold'
                }, d.showBizCycle ? 'Hide' : 'Explore \u2192')
              ),
              d.showBizCycle && React.createElement('div', null,
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 italic mb-3' }, t('stem.economicslab.the_economy_moves_through_repeating_cy', 'The economy moves through repeating cycles of expansion and contraction. Understanding where we are in the cycle helps predict what comes next.')),
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
                        React.createElement('span', { className: 'text-[0.6875rem] font-black', style: { color: isActive ? ecoInk(phase.color) : ecoInkOnWhite(phase.color) } }, phase.name)
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
                        React.createElement('div', { className: 'text-[0.6875rem] font-black', style: { color: ecoInk(phase.color) } }, phase.name),
                        React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, 'Duration: ' + phase.duration)
                      )
                    ),
                    React.createElement('div', { className: 'text-[0.6875rem] font-bold text-slate-600 mb-1' }, 'Characteristics:'),
                    React.createElement('ul', { className: 'space-y-0.5 ml-3 mb-2' },
                      phase.characteristics.map(function(ch, chi) {
                        return React.createElement('li', { key: chi, className: 'text-[0.6875rem] text-slate-600 list-disc' }, ch);
                      })
                    ),
                    React.createElement('div', { className: 'text-[0.6875rem] text-blue-600 bg-blue-50 rounded-lg p-2 border border-blue-100 mb-1' },
                      React.createElement('span', { className: 'font-bold' }, t('stem.economicslab.policy_response', '\uD83C\uDFDB\uFE0F Policy Response: ')),
                      phase.policy
                    ),
                    React.createElement('div', { className: 'text-[0.6875rem] text-amber-600 italic' }, '\uD83D\uDCCA Indicators: ' + phase.indicators)
                  );
                })()
              )
            ),

            // === COMPOUND INTEREST CALCULATOR CONTROLS ===
            d.showCompoundCalc && React.createElement('div', { className: 'bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-emerald-800' }, t('stem.economicslab.compound_interest_calculator', '\uD83D\uDCCA Compound Interest Calculator')),
                React.createElement('button', {
                  'aria-expanded': d.showCompoundCalc ? 'true' : 'false', 'aria-label': (d.showCompoundCalc ? t('stem.economicslab.ref_hide', 'Hide') : t('stem.economicslab.ref_show', 'Show')) + ' ' + t('stem.economicslab.ref_name_compound', 'the compound interest calculator'),
                    onClick: function() { upd('showCompoundCalc', !(d.showCompoundCalc)); },
                  className: 'text-[0.6875rem] text-emerald-700 hover:text-emerald-700 font-bold'
                }, d.showCompoundCalc ? 'Hide' : 'Calculate \u2192')
              ),
              d.showCompoundCalc && React.createElement('div', null,
                React.createElement('div', { className: 'grid grid-cols-3 gap-3 mb-3' },
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[0.6875rem] font-bold text-emerald-600 block mb-0.5' }, 'Starting Amount: $' + (d.pfPrincipal || 1000).toLocaleString()),
                    React.createElement('input', { type: 'range', 'aria-valuetext': '$' + (d.pfPrincipal || 1000).toLocaleString(), 'aria-label': t('stem.economicslab.starting_amount_in_dollars', 'Starting amount in dollars'), min: 100, max: 50000, step: 100, value: d.pfPrincipal || 1000,
                      onChange: function(e) { upd('pfPrincipal', parseInt(e.target.value)); },
                      className: 'w-full accent-emerald-500'
                    })
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[0.6875rem] font-bold text-emerald-600 block mb-0.5' }, 'Annual Return: ' + (d.pfRate || 7) + '%'),
                    React.createElement('input', { type: 'range', 'aria-valuetext': (d.pfRate || 7) + '%', 'aria-label': t('stem.economicslab.annual_return_percent', 'Annual return, percent'), min: 1, max: 15, step: 0.5, value: d.pfRate || 7,
                      onChange: function(e) { upd('pfRate', parseFloat(e.target.value)); },
                      className: 'w-full accent-emerald-500'
                    })
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[0.6875rem] font-bold text-emerald-600 block mb-0.5' }, 'Years: ' + (d.pfYears || 30)),
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
                    React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 mt-0.5' }, 'From $' + p.toLocaleString() + ' invested at ' + (d.pfRate || 7) + '% for ' + y + ' years'),
                    React.createElement('div', { className: 'text-[0.6875rem] font-bold text-emerald-700 mt-1' }, '\uD83D\uDCC8 $' + Math.round(earned).toLocaleString() + ' earned through compound interest!'),
                    React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 mt-1 italic' }, t('stem.economicslab.compound_interest_is_the_eighth_wonder', '"Compound interest is the eighth wonder of the world." \u2014 Albert Einstein (attributed)'))
                  );
                })()
              )
            ),

            // === BUDGET RULES ===
            d.showBudgetRules && React.createElement('div', { className: 'bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-blue-800' }, t('stem.economicslab.budget_rules', '\uD83D\uDCB0 Budget Rules')),
                React.createElement('button', {
                  'aria-expanded': d.showBudgetRules ? 'true' : 'false', 'aria-label': (d.showBudgetRules ? t('stem.economicslab.ref_hide', 'Hide') : t('stem.economicslab.ref_show', 'Show')) + ' ' + t('stem.economicslab.ref_name_budget', 'the budget rules'),
                    onClick: function() { upd('showBudgetRules', !(d.showBudgetRules)); },
                  className: 'text-[0.6875rem] text-blue-700 hover:text-blue-900 font-bold'
                }, d.showBudgetRules ? 'Hide' : 'Learn \u2192')
              ),
              d.showBudgetRules && React.createElement('div', { className: 'space-y-3' },
                BUDGET_RULES.map(function(rule, ri) {
                  var isActive = (d.budgetRuleIdx || 0) === ri;
                  return React.createElement('div', { key: ri,
                    onClick: function() { upd('budgetRuleIdx', ri); },
                        className: 'cursor-pointer rounded-xl p-3 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 ' + (isActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300')
                  },
                    React.createElement('div', { className: 'flex items-center gap-2 mb-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400', role: 'button', tabIndex: 0, 'aria-expanded': isActive ? 'true' : 'false', onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('budgetRuleIdx', ri); } } },
                      React.createElement('span', { className: 'text-lg' }, rule.icon),
                      React.createElement('span', { className: 'text-[0.6875rem] font-black text-slate-800' }, rule.name),
                      React.createElement('span', { className: 'text-[0.6875rem] text-slate-600' }, rule.desc)
                    ),
                    isActive && React.createElement('div', null,
                      // Visual bar
                      React.createElement('div', { className: 'flex rounded-full overflow-hidden h-6 mb-2' },
                        rule.parts.map(function(part) {
                          return React.createElement('div', { key: part.label,
                            className: 'flex items-center justify-center text-[0.6875rem] font-bold text-white',
                            style: { background: ecoBarBg(part.color), width: part.pct + '%' }
                          }, part.label + ' ' + part.pct + '%');
                        })
                      ),
                      // Applied to take-home pay (these rules are defined on after-tax income)
                      React.createElement('p', { className: 'text-[0.6875rem] text-slate-600 m-0 mb-1' }, t('stem.economicslab.budget_rule_takehome', 'Applied to your take-home pay of') + ' $' + Math.round(pfBud.takeHome).toLocaleString() + '/mo (' + t('stem.economicslab.budget_rule_after_tax', 'salary after taxes') + ')'),
                      React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
                        rule.parts.map(function(part) {
                          var monthlyIncome = Math.round(pfBud.takeHome);
                          var allocated = Math.round(monthlyIncome * part.pct / 100);
                          return React.createElement('div', { key: part.label,
                            className: 'rounded-lg p-2 text-center border',
                            style: { borderColor: part.color + '40' }
                          },
                            React.createElement('div', { className: 'text-[0.6875rem] font-bold', style: { color: ecoInk(part.color) } }, part.label + ' (' + part.pct + '%)'),
                            React.createElement('div', { className: 'text-[0.6875rem] font-black text-slate-800' }, '$' + allocated.toLocaleString() + '/mo'),
                            React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, part.items)
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
                  'aria-expanded': d.showEconSchools ? 'true' : 'false', 'aria-label': (d.showEconSchools ? t('stem.economicslab.ref_hide', 'Hide') : t('stem.economicslab.ref_show', 'Show')) + ' ' + t('stem.economicslab.ref_name_schools', 'the schools of thought'),
                    onClick: function() { upd('showEconSchools', !(d.showEconSchools)); },
                  className: 'text-[0.6875rem] text-purple-700 hover:text-purple-900 font-bold'
                }, d.showEconSchools ? 'Hide' : 'Compare \u2192')
              ),
              d.showEconSchools && React.createElement('div', null,
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 italic mb-3' }, t('stem.economicslab.economists_disagree_different_schools_', 'Economists disagree! Different schools of thought offer different answers to the same questions. Understanding these perspectives helps you think critically about economic policy.')),
                // Comparison table
                React.createElement('div', { className: 'rounded-xl overflow-hidden border border-purple-200' },
                  // Header
                  React.createElement('div', { className: 'grid grid-cols-4 bg-purple-100 text-[0.6875rem] font-bold text-purple-800 uppercase' },
                    React.createElement('div', { className: 'p-1.5' }, t('stem.economicslab.school', 'School')),
                    React.createElement('div', { className: 'p-1.5 border-l border-purple-200' }, t('stem.economicslab.gov_t_role', 'Gov\'t Role')),
                    React.createElement('div', { className: 'p-1.5 border-l border-purple-200' }, t('stem.economicslab.on_recession', 'On Recession')),
                    React.createElement('div', { className: 'p-1.5 border-l border-purple-200' }, t('stem.economicslab.on_inflation', 'On Inflation'))
                  ),
                  ECON_SCHOOLS.map(function(school, si) {
                    var isActive = d.econSchoolIdx === si;
                    return React.createElement('div', { key: si },
                      React.createElement('div', {
                        role: 'button', tabIndex: 0, 'aria-expanded': isActive ? 'true' : 'false',
                        className: 'grid grid-cols-4 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 ' + (isActive ? '' : 'hover:bg-purple-50') + (si % 2 === 0 ? ' bg-white' : ' bg-slate-50'),
                        onClick: function() { upd('econSchoolIdx', isActive ? null : si); },
                        onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('econSchoolIdx', isActive ? null : si); } },
                        style: isActive ? { background: school.color + '10', borderLeft: '3px solid ' + school.color } : {}
                      },
                        React.createElement('div', { className: 'p-1.5 text-[0.6875rem]' },
                          React.createElement('span', { className: 'font-bold', style: { color: ecoInk(school.color) } }, school.icon + ' ' + school.name),
                          React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, school.era)
                        ),
                        React.createElement('div', { className: 'p-1.5 text-[0.6875rem] text-slate-600 border-l border-slate-100' }, school.govRole),
                        React.createElement('div', { className: 'p-1.5 text-[0.6875rem] text-slate-600 border-l border-slate-100' }, school.onRecession),
                        React.createElement('div', { className: 'p-1.5 text-[0.6875rem] text-slate-600 border-l border-slate-100' }, school.onInflation)
                      ),
                      isActive && React.createElement('div', { className: 'px-3 py-2 border-t border-slate-100', style: { background: school.color + '08', borderLeft: '3px solid ' + school.color } },
                        React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 mb-1' },
                          React.createElement('span', { className: 'font-bold', style: { color: ecoInk(school.color) } }, t('stem.economicslab.key_idea', '\uD83D\uDCA1 Key Idea: ')),
                          school.key
                        ),
                        React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' },
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
                  'aria-expanded': d.showConceptLib ? 'true' : 'false', 'aria-label': (d.showConceptLib ? t('stem.economicslab.ref_hide', 'Hide') : t('stem.economicslab.ref_show', 'Show')) + ' ' + t('stem.economicslab.ref_name_concepts', 'the concept library'),
                    onClick: function() { upd('showConceptLib', !(d.showConceptLib)); },
                  className: 'text-[0.6875rem] text-indigo-700 hover:text-indigo-900 font-bold'
                }, d.showConceptLib ? 'Hide' : 'Explore \u2192')
              ),
              d.showConceptLib && React.createElement('div', null,
                // Category filter
                React.createElement('div', { className: 'flex gap-1 mb-3 flex-wrap' },
                  ['all', 'fundamentals', 'micro', 'macro', 'finance', 'trade'].map(function(cat) {
                    return React.createElement('button', { key: cat,
                      onClick: function() { upd('econConceptFilter', cat); },
                      className: 'px-2 py-0.5 rounded-full text-[0.6875rem] font-bold transition-all ' +
                        ((d.econConceptFilter || 'all') === cat ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-100')
                    }, cat.charAt(0).toUpperCase() + cat.slice(1));
                  })
                ),
                React.createElement('div', { className: 'grid grid-cols-2 gap-2 max-h-72 overflow-y-auto' },
                  ECON_CONCEPTS.filter(function(c) { return (d.econConceptFilter || 'all') === 'all' || c.category === d.econConceptFilter; }).map(function(concept, ci) {
                    var isActive = d.econConceptId === concept.id;
                    return React.createElement('div', { key: ci,
                      onClick: function() { upd('econConceptId', isActive ? null : concept.id); },
                          className: 'cursor-pointer rounded-xl p-2.5 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ' + (isActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300')
                    },
                      React.createElement('div', { className: 'flex items-center gap-1.5 mb-1 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400', role: 'button', tabIndex: 0, 'aria-expanded': isActive ? 'true' : 'false', onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('econConceptId', isActive ? null : concept.id); } } },
                        React.createElement('span', { className: 'text-lg' }, concept.icon),
                        React.createElement('span', { className: 'text-[0.6875rem] font-black text-slate-800' }, concept.name),
                        React.createElement('span', { className: 'text-[0.6875rem] px-1 py-0.5 rounded bg-' + (concept.category === 'macro' ? 'blue' : concept.category === 'micro' ? 'green' : concept.category === 'finance' ? 'amber' : concept.category === 'trade' ? 'purple' : 'slate') + '-100 text-' + (concept.category === 'macro' ? 'blue' : concept.category === 'micro' ? 'green' : concept.category === 'finance' ? 'amber' : concept.category === 'trade' ? 'purple' : 'slate') + '-800 font-bold' }, concept.category)
                      ),
                      React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, concept.def),
                      isActive && React.createElement('div', { className: 'mt-1.5 text-[0.6875rem] text-indigo-600 bg-indigo-50 rounded-lg p-1.5 border border-indigo-100' },
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
                  'aria-expanded': d.showMarketStructures ? 'true' : 'false', 'aria-label': (d.showMarketStructures ? t('stem.economicslab.ref_hide', 'Hide') : t('stem.economicslab.ref_show', 'Show')) + ' ' + t('stem.economicslab.ref_name_markets', 'the market structures'),
                    onClick: function() { upd('showMarketStructures', !(d.showMarketStructures)); },
                  className: 'text-[0.6875rem] text-emerald-700 hover:text-emerald-700 font-bold'
                }, d.showMarketStructures ? 'Hide' : 'Compare \u2192')
              ),
              d.showMarketStructures && React.createElement('div', null,
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 italic mb-2' }, t('stem.economicslab.markets_range_from_perfect_competition', 'Markets range from perfect competition (many sellers, identical products) to monopoly (one seller, unique product). Click each to learn more:')),
                // Spectrum bar
                React.createElement('div', { className: 'flex mb-3 rounded-full overflow-hidden h-4' },
                  MARKET_STRUCTURES.map(function(ms) {
                    return React.createElement('div', { key: ms.id,
                      className: 'flex-1 flex items-center justify-center text-[0.6875rem] font-bold text-white',
                      style: { background: ecoBarBg(ms.color) },
                      title: ms.name
                    }, ms.name.split(' ')[0]);
                  })
                ),
                React.createElement('div', { className: 'flex items-center justify-between text-[0.6875rem] text-slate-600 mb-3' },
                  React.createElement('span', null, t('stem.economicslab.more_competition', '\u2190 More Competition')),
                  React.createElement('span', null, t('stem.economicslab.more_market_power', 'More Market Power \u2192'))
                ),
                // Cards
                React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
                  MARKET_STRUCTURES.map(function(ms, mi) {
                    var isActive = d.marketStructIdx === mi;
                    return React.createElement('div', { key: mi,
                      onClick: function() { upd('marketStructIdx', isActive ? null : mi); },
                          className: 'cursor-pointer rounded-xl p-3 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 ' + (isActive ? 'scale-[1.02] shadow-md' : 'hover:scale-[1.01]'),
                      style: { borderColor: isActive ? ms.color : ms.color + '40', background: isActive ? ms.color + '08' : '#fff' }
                    },
                      React.createElement('div', { className: 'flex items-center gap-1 mb-1 rounded focus:outline-none focus:ring-2 focus:ring-slate-400', role: 'button', tabIndex: 0, 'aria-expanded': isActive ? 'true' : 'false', onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('marketStructIdx', isActive ? null : mi); } } },
                        React.createElement('span', { className: 'text-lg' }, ms.icon),
                        React.createElement('div', { className: 'text-[0.6875rem] font-black', style: { color: ecoInkOnWhite(ms.color) } }, ms.name)
                      ),
                      isActive && React.createElement('div', { className: 'space-y-1 mt-1' },
                        React.createElement('div', { className: 'grid grid-cols-2 gap-x-3 gap-y-0.5 text-[0.6875rem]' },
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
                        React.createElement('div', { className: 'text-[0.6875rem] text-amber-600 font-medium mt-1' }, '\uD83D\uDCA1 Examples: ' + ms.examples)
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
                  'aria-expanded': d.showGdpBreakdown ? 'true' : 'false', 'aria-label': (d.showGdpBreakdown ? t('stem.economicslab.ref_hide', 'Hide') : t('stem.economicslab.ref_show', 'Show')) + ' ' + t('stem.economicslab.ref_name_gdp', 'the GDP breakdown'),
                    onClick: function() { upd('showGdpBreakdown', !(d.showGdpBreakdown)); },
                  style: { color: ecoInk('#b45309') }, className: 'text-[0.6875rem] text-amber-700 hover:text-amber-800 font-bold'
                }, d.showGdpBreakdown ? 'Hide' : 'Explore \u2192')
              ),
              d.showGdpBreakdown && React.createElement('div', null,
                React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 italic mb-3' }, t('stem.economicslab.gross_domestic_product_measures_the_to', 'Gross Domestic Product measures the total value of all final goods and services produced within a country\'s borders in a given year. Here\'s how it breaks down for the United States:')),
                // Bar chart visualization
                React.createElement('div', { className: 'flex items-end gap-1 h-24 mb-2 px-4' },
                  GDP_COMPONENTS.map(function(comp) {
                    var barH = Math.max(5, Math.abs(comp.pct) / 68 * 100);
                    return React.createElement('div', { key: comp.id, className: 'flex-1 flex flex-col items-center' },
                      React.createElement('div', { className: 'text-[0.6875rem] font-bold mb-0.5', style: { color: ecoInk(comp.color) } }, (comp.pct > 0 ? '' : '') + comp.pct + '%'),
                      React.createElement('div', {
                        className: 'w-full rounded-t-lg transition-all',
                        style: { background: comp.color, height: barH + '%', minHeight: 8, opacity: 0.8 }
                      }),
                      React.createElement('div', { className: 'text-[0.6875rem] font-bold text-slate-600 mt-1' }, comp.id),
                      React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, comp.name)
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
                        React.createElement('span', { className: 'text-[0.6875rem] font-black', style: { color: ecoInk(comp.color) } }, comp.id + ' \u2014 ' + comp.name),
                        React.createElement('span', { className: 'text-[0.6875rem] font-bold ml-auto', style: { color: ecoInk(comp.color) } }, comp.pct + '%')
                      ),
                      React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, comp.desc),
                      React.createElement('div', { className: 'text-[0.6875rem] text-amber-600 mt-0.5 italic' }, '\uD83D\uDCA1 ' + comp.examples)
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
                  'aria-expanded': d.showEconomists ? 'true' : 'false', 'aria-label': (d.showEconomists ? t('stem.economicslab.ref_hide', 'Hide') : t('stem.economicslab.ref_show', 'Show')) + ' ' + t('stem.economicslab.ref_name_people', 'the famous economists'),
                    onClick: function() { upd('showEconomists', !(d.showEconomists)); },
                  className: 'text-[0.6875rem] text-violet-700 hover:text-violet-900 font-bold'
                }, d.showEconomists ? 'Hide' : 'Meet Them \u2192')
              ),
              d.showEconomists && React.createElement('div', { className: 'space-y-2 max-h-72 overflow-y-auto' },
                FAMOUS_ECONOMISTS.map(function(econ, ei) {
                  var isActive = d.economistIdx === ei;
                  return React.createElement('div', { key: ei,
                    onClick: function() { upd('economistIdx', isActive ? null : ei); },
                        className: 'cursor-pointer rounded-xl p-2.5 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 ' + (isActive ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-300')
                  },
                    React.createElement('div', { className: 'flex items-center gap-2 rounded focus:outline-none focus:ring-2 focus:ring-violet-400', role: 'button', tabIndex: 0, 'aria-expanded': isActive ? 'true' : 'false', onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); upd('economistIdx', isActive ? null : ei); } } },
                      React.createElement('span', { className: 'text-xl' }, econ.icon),
                      React.createElement('div', { className: 'flex-1' },
                        React.createElement('div', { className: 'flex items-center gap-2' },
                          React.createElement('span', { className: 'text-[0.6875rem] font-black text-slate-800' }, econ.name),
                          React.createElement('span', { className: 'text-[0.6875rem] text-slate-600 font-mono' }, econ.years)
                        ),
                        React.createElement('div', { className: 'text-[0.6875rem] text-violet-600 font-bold' }, econ.contribution)
                      ),
                      React.createElement('span', { className: 'text-[0.6875rem] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-bold' }, econ.school)
                    ),
                    isActive && React.createElement('div', { className: 'mt-2 space-y-1 pl-8' },
                      React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' },
                        React.createElement('span', { className: 'font-bold text-violet-700' }, t('stem.economicslab.key_work', '\uD83D\uDCDA Key Work: ')),
                        econ.work
                      ),
                      React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 leading-relaxed' },
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
                  'aria-expanded': d.showIndicators ? 'true' : 'false', 'aria-label': (d.showIndicators ? t('stem.economicslab.ref_hide', 'Hide') : t('stem.economicslab.ref_show', 'Show')) + ' ' + t('stem.economicslab.ref_name_indicators', 'the economic indicators'),
                    onClick: function() { upd('showIndicators', !(d.showIndicators)); },
                  className: 'text-[0.6875rem] text-cyan-700 hover:text-cyan-900 font-bold'
                }, d.showIndicators ? 'Hide' : 'View \u2192')
              ),
              d.showIndicators && React.createElement('div', { className: 'grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto', tabIndex: 0, role: 'region', 'aria-label': t('stem.economicslab.indicator_list', 'Indicator list') },
                ECONOMIC_INDICATORS.map(function(ind, ii) {
                  return React.createElement('div', { key: ii, className: 'rounded-lg p-2 bg-white border border-cyan-100' },
                    React.createElement('div', { className: 'flex items-center gap-1 mb-0.5' },
                      React.createElement('span', null, ind.icon),
                      React.createElement('span', { className: 'text-[0.6875rem] font-bold text-slate-700' }, ind.name)
                    ),
                    React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, ind.desc),
                    React.createElement('div', { className: 'flex gap-2 mt-0.5' },
                      React.createElement('span', { className: 'text-[0.6875rem] text-green-800 font-bold' }, '\u2705 ' + ind.good),
                      React.createElement('span', { className: 'text-[0.6875rem] text-red-700 font-bold' }, '\u26A0 ' + ind.bad)
                    )
                  );
                })
              )
            ),


            // Macro indicators banner (always visible)

            macroHistory.length > 0 && React.createElement('div', { className: 'flex gap-2 mb-2 bg-slate-800 rounded-lg px-3 py-1.5 text-[0.6875rem] font-mono text-slate-300 overflow-x-auto' },

              React.createElement('span', { className: 'text-slate-300' }, t('stem.economicslab.macro', '\uD83C\uDFDB\uFE0F MACRO |')),

              React.createElement('span', { className: macroGDP >= 0 ? 'text-green-400' : 'text-red-400' }, 'GDP ' + (macroGDP >= 0 ? '+' : '') + macroGDP.toFixed(1) + '%'),

              React.createElement('span', { className: macroInflation > 4 ? 'text-red-400' : macroInflation > 2 ? 'text-amber-400' : 'text-green-400' }, 'INF ' + macroInflation.toFixed(1) + '%'),

              React.createElement('span', { className: macroInterest > 6 ? 'text-red-400' : 'text-amber-400' }, 'INT ' + macroInterest.toFixed(2) + '%'),

              React.createElement('span', { className: macroUnemployment > 5 ? 'text-red-400' : 'text-green-400' }, 'UNEMP ' + macroUnemployment.toFixed(1) + '%'),

              React.createElement('span', { className: macroTrade >= 0 ? 'text-green-400' : 'text-amber-400' }, 'TRADE ' + (macroTrade >= 0 ? '+' : '') + macroTrade.toFixed(1) + '%')

            ),

            // Canvas

            React.createElement('div', {
              className: 'economicslab-canvas-shell',
              'data-economicslab-canvas-shell': 'true',
              'data-allo-fs-stage': 'true',
              ref: function (node) { if (node && typeof window.__alloStemFsBind === 'function') window.__alloStemFsBind(node.querySelector('[data-allo-fs-btn]'), node); },
              style: { position: 'relative' }
            },
              econTab !== 'inquiry' && React.createElement('button', {
                type: 'button',
                'data-allo-fs-btn': 'true',
                'aria-pressed': 'false',
                'aria-label': econTab === 'supplyDemand' ? t('stem.economicslab.enter_fullscreen', 'View the supply and demand graph fullscreen') : t('stem.economicslab.enter_fullscreen_chart', 'View this chart fullscreen'),
                'data-fs-out': econTab === 'supplyDemand' ? t('stem.economicslab.enter_fullscreen', 'View the supply and demand graph fullscreen') : t('stem.economicslab.enter_fullscreen_chart', 'View this chart fullscreen'),
                'data-fs-in': econTab === 'supplyDemand' ? t('stem.economicslab.exit_fullscreen', 'Exit fullscreen supply and demand graph (Escape)') : t('stem.economicslab.exit_fullscreen_chart', 'Exit fullscreen chart (Escape)'),
                style: { position: 'absolute', top: 8, right: 8, zIndex: 20, width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(148,163,184,0.55)', color: '#e2e8f0', fontSize: 16, fontWeight: 700, cursor: 'pointer' }
              }, React.createElement('span', { 'aria-hidden': 'true' }, '⛶')),

              // The inquiry tab has its own SVG visualization — don't render a
              // large permanently-empty canvas above it.
              econTab === 'trade' && React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 rounded-xl', style: { background: '#0f172a' }, 'data-economicslab-trade-visual': 'true', role: 'group', 'aria-label': t('stem.economicslab.trade_charts', 'Trade Lab charts'), 'aria-describedby': 'economicslab-canvas-summary' }, tradeChart('a'), tradeChart('b')),

              econTab !== 'inquiry' && econTab !== 'trade' && React.createElement('canvas', {

                ref: canvasRef,

                role: 'img',
                'aria-label': ({ supplyDemand: t('stem.economicslab.canvas_name_sd', 'Supply and demand graph'), personalFinance: t('stem.economicslab.canvas_name_pf', 'Personal finance chart'), stockMarket: t('stem.economicslab.canvas_name_stock', 'Stock market chart'), entrepreneur: t('stem.economicslab.canvas_name_biz', 'Business dashboard'), macro: t('stem.economicslab.canvas_name_macro', 'National economy chart') })[econTab] || t('stem.economicslab.canvas_name_sd', 'Supply and demand graph'),
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
                  var pd0 = sdDemInt - q * sdDemSlope;
                  var ps0 = sdSupInt + q * sdSupSlope;
                  if (announceToSR) announceToSR('Quantity ' + q + ': buyers value $' + Math.max(0, pd0).toFixed(0) + ', producer cost $' + Math.max(0, ps0).toFixed(0) + (pd0 > ps0 ? '. Worth producing.' : '. Not worth producing.'));
                },
                onKeyDown: function (e) {
                  if (econTab !== 'supplyDemand') return;
                  var cur = Math.max(0, Math.min(100, num(d.sdProbe, 50)));
                  var np = null;
                  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') np = Math.min(100, cur + 2);
                  else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') np = Math.max(0, cur - 2);
                  else if (e.key === 'Escape') { e.preventDefault(); upd('sdProbe', null); return; }
                  else return;
                  e.preventDefault();
                  upd('sdProbe', np);
                  var pd1 = sdDemInt - np * sdDemSlope;
                  var ps1 = sdSupInt + np * sdSupSlope;
                  if (announceToSR) announceToSR('Quantity ' + np + ': buyers value $' + Math.max(0, pd1).toFixed(0) + ', producer cost $' + Math.max(0, ps1).toFixed(0) + (pd1 > ps1 ? '. Worth producing.' : '. Not worth producing.'));
                },

                className: 'w-full rounded-xl border border-slate-400',

                style: { height: '250px', background: 'var(--allo-stem-canvas, #0f172a)', cursor: econTab === 'supplyDemand' ? 'crosshair' : 'default' }

              }),

              React.createElement('div', {
                id: 'economicslab-canvas-summary',
                className: 'economicslab-canvas-summary',
                'data-economicslab-canvas-summary': 'true'
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

                React.createElement('div', { className: 'grid grid-cols-2 gap-3 text-[0.6875rem] text-slate-600 leading-relaxed' },

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

                (sdPriceFloor > 0 || sdPriceCeiling > 0 || sdTax !== 0 || sdExt !== 0 || sdMonopoly || sdDemandShift !== 0 || sdSupplyShift !== 0 || sdDemSlope !== 0.8 || sdSupSlope !== 0.8) && React.createElement('div', { className: 'mt-3 bg-white rounded-lg p-3 border border-blue-100' },

                  React.createElement('h5', { className: 'text-[0.6875rem] font-bold text-indigo-700 mb-1' }, t('stem.economicslab.what_s_happening_right_now', '\uD83D\uDCA1 What\'s Happening Right Now:')),

                  React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 space-y-1' },

                    sdDemandShift !== 0 && sdSupplyShift !== 0 && (function () {
                      var pr = E.sdPredict(sdDemandShift, sdSupplyShift);
                      var word = function (v) { return v === 'up' ? t('stem.economicslab.both_rises', 'rises') : v === 'down' ? t('stem.economicslab.both_falls', 'falls') : t('stem.economicslab.both_unclear', 'could go either way'); };
                      return React.createElement('p', null, '▶ ' + t('stem.economicslab.both_shifted', 'Demand and supply both shifted. Quantity') + ' ' + word(pr.q) + ' ' + t('stem.economicslab.both_and_price', 'and price') + ' ' + word(pr.p) + '. ' + t('stem.economicslab.both_depends', 'When the two shifts pull one of them in opposite directions, the answer depends on which shift is bigger. On this graph: P') + ' $' + sdBase.pStar.toFixed(1) + ' → $' + sdOut.pStar.toFixed(1) + ', Q ' + sdBase.qStar.toFixed(1) + ' → ' + sdOut.qStar.toFixed(1) + '.');
                    })(),

                    sdDemandShift > 0 && sdSupplyShift === 0 && React.createElement('p', null, t('stem.economicslab.demand_shifted_right_more_people_want_', '\u25B6 Demand shifted RIGHT \u2014 More people want this product (maybe income rose, or a trend made it popular). This raises both equilibrium price AND quantity.')),

                    sdDemandShift < 0 && sdSupplyShift === 0 && React.createElement('p', null, t('stem.economicslab.demand_shifted_left_fewer_people_want_', '\u25B6 Demand shifted LEFT \u2014 Fewer people want this product (substitute became cheaper, or preferences changed). Both price AND quantity fall.')),

                    sdSupplyShift > 0 && sdDemandShift === 0 && React.createElement('p', null, t('stem.economicslab.supply_shifted_right_producers_can_mak', '\u25B6 Supply shifted RIGHT \u2014 Producers can make more cheaply (new technology, lower input costs). Price falls, but quantity rises.')),

                    sdSupplyShift < 0 && sdDemandShift === 0 && React.createElement('p', null, t('stem.economicslab.supply_shifted_left_production_became_', '\u25B6 Supply shifted LEFT \u2014 Production became harder (natural disaster, regulations). Price rises, but quantity falls.')),

                    sdDemSlope !== 0.8 && React.createElement('p', null, '\u25B6 Demand slope ' + sdDemSlope.toFixed(1) + (sdDemSlope < 0.8 ? t('stem.economicslab.demand_flatter', ' \u2014 flatter, more ELASTIC: buyers respond sharply to price (luxuries, goods with substitutes).') : t('stem.economicslab.demand_steeper', ' \u2014 steeper, more INELASTIC: buyers barely change quantity when price moves (necessities like gasoline or medicine).'))),

                    sdSupSlope !== 0.8 && React.createElement('p', null, '\u25B6 Supply slope ' + sdSupSlope.toFixed(1) + (sdSupSlope < 0.8 ? t('stem.economicslab.supply_flatter', ' \u2014 flatter, more ELASTIC: producers can easily ramp output up or down (manufactured goods).') : t('stem.economicslab.supply_steeper', ' \u2014 steeper, more INELASTIC: output is hard to change quickly (housing, farmland, concert seats).'))),

                    sdPriceFloor > 0 && React.createElement('p', null, '\u25B6 Price Floor at $' + sdPriceFloor + ' \u2014 Government sets a MINIMUM price (e.g., minimum wage). If above equilibrium: creates SURPLUS (quantity supplied > quantity demanded). Workers want jobs, but firms hire fewer.'),

                    sdPriceCeiling > 0 && React.createElement('p', null, '\u25B6 Price Ceiling at $' + sdPriceCeiling + ' \u2014 Government sets a MAXIMUM price (e.g., rent control). If below equilibrium: creates SHORTAGE (quantity demanded > quantity supplied). Everyone wants it, but not enough is produced.'),

                    sdTax < 0 && React.createElement('p', null, '▶ ' + t('stem.economicslab.subsidy_line_1', 'Subsidy of') + ' $' + (-sdTax) + ' ' + (sdMonopoly ? t('stem.economicslab.subsidy_line_mono', 'per unit: buyers pay less and the seller gets more. With one seller that pushes output back UP toward the competitive amount, so a subsidy can SHRINK the monopoly’s deadweight loss, until output passes the competitive amount.') : t('stem.economicslab.subsidy_line_2', 'per unit: the government pays part of each sale, so buyers pay less, sellers get more, and more is traded. Unless the good has an external benefit, those extra trades cost more than they are worth (deadweight loss).'))),

                    sdMonopoly && React.createElement('p', null, '▶ ' + t('stem.economicslab.mono_line', 'One seller (monopoly): the dashed MR curve shows the extra revenue from one more sale. It falls twice as fast as demand, because selling one more means cutting the price on every unit.')),

                    sdExt > 0 && React.createElement('p', null, '▶ ' + t('stem.economicslab.ext_cost_line_1', 'External cost of') + ' $' + sdExt + ' ' + (sdMonopoly
                      ? t('stem.economicslab.ext_cost_line_mono', 'per unit (like pollution). With one seller two problems pull opposite ways: pollution toward making too MUCH, market power toward too LITTLE. Here the market makes') + ' ' + (sdOut.q > sdOut.qSoc + 0.02 ? t('stem.economicslab.ext_more', 'MORE') : sdOut.q < sdOut.qSoc - 0.02 ? t('stem.economicslab.ext_less', 'LESS') : t('stem.economicslab.ext_about_right', 'about the amount')) + ' ' + t('stem.economicslab.ext_than_best', 'than is best for society.')
                      : t('stem.economicslab.ext_cost_line_2', 'per unit (like pollution): neighbors pay a cost that neither buyer nor seller pays, so the market makes MORE than is best for society.'))),

                    sdExt < 0 && React.createElement('p', null, '▶ ' + t('stem.economicslab.ext_benefit_line_1', 'External benefit of') + ' $' + (-sdExt) + ' ' + t('stem.economicslab.ext_benefit_line_2', 'per unit (like vaccines protecting others): society gains more than the buyer does, so the market makes LESS than is best for society.')),

                    sdTax > 0 && (function () {
                      // Tax incidence, read off the model: the share of the tax that
                      // shows up in the price buyers pay. Only meaningful when no
                      // price control is binding on top of the tax.
                      // Measure from the price WITHOUT the tax: the competitive price, or the
                      // monopoly price when there is one seller (its markup is not tax).
                      var untaxedPrice = sdMonopoly ? E.sdOutcome({ dShift: sdDemandShift, sShift: sdSupplyShift, dSlope: sdDemSlope, sSlope: sdSupSlope, monopoly: true }).pc : sdOut.pStar;
                      var buyerShare = Math.max(0, Math.min(100, (sdOut.pc - untaxedPrice) / sdTax * 100));
                      var lead = '▶ ' + t('stem.economicslab.tax_line_1', 'Tax of') + ' $' + sdTax + ': ' + t('stem.economicslab.tax_line_2', 'a "tax wedge" opens between what buyers pay and sellers keep.') + ' ' +
                        (sdExt > 0 && sdMonopoly ? t('stem.economicslab.tax_line_pigou_mono', 'With one seller, a tax equal to the harm overshoots: the monopoly already makes too little. The best tax on a polluting monopolist is smaller than the harm, and can even be a subsidy (Buchanan, 1969).') : sdExt > 0 ? t('stem.economicslab.tax_line_pigou', 'Because this good harms bystanders, the tax can SHRINK the loss to society: it makes the market count the harm (see the scoreboard).') : t('stem.economicslab.tax_line_dwl', 'Some trades both sides wanted stop happening (DEADWEIGHT LOSS).'));
                      if (sdMonopoly && sdOut.regime === 'tax') return React.createElement('p', null, lead + ' ' + t('stem.economicslab.tax_line_split_mono', 'With one seller, buyers bear ~') + buyerShare.toFixed(0) + t('stem.economicslab.tax_line_split_mono_2', '% of it and the seller ~') + (100 - buyerShare).toFixed(0) + t('stem.economicslab.tax_line_split_mono_3', '%: a monopolist absorbs much of a tax rather than lose more sales.'));
                      if (sdOut.regime !== 'tax') return React.createElement('p', null, lead + ' ' + t('stem.economicslab.tax_line_control', 'A price control is also binding, so the usual split of the tax between buyers and sellers does not apply.'));
                      return React.createElement('p', null, lead + ' ' + t('stem.economicslab.tax_line_split', 'Right now buyers bear ~') + buyerShare.toFixed(0) + t('stem.economicslab.tax_incidence_2', '% of it and sellers ~') + (100 - buyerShare).toFixed(0) + t('stem.economicslab.tax_incidence_3', '% \u2014 the more INELASTIC (steeper) side always bears more. Tilt the elasticity sliders and watch the split move.'));
                    })()

                  )

                )

              ),

              // Welfare scoreboard: who gains and who loses from the policy on the
              // graph, as areas under the curves (the same numbers the shading
              // draws), compared with a free market at today's curves.
              (function () {
                var free = E.sdOutcome({ dShift: sdDemandShift, sShift: sdSupplyShift, dSlope: sdDemSlope, sSlope: sdSupSlope, ext: sdExt });
                var policyOn = sdOut.regime !== 'free';
                var extOn = sdExt !== 0;
                var tile = function (key, label, val, freeVal, color) {
                  var diff = val - freeVal;
                  return React.createElement('div', { key: key, 'data-welfare-tile': key, className: 'bg-white rounded-lg p-2 border text-center', style: { borderColor: color + '66' } },
                    React.createElement('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wide', style: { color: ecoInk(color) } }, label),
                    React.createElement('div', { className: 'text-sm font-black text-slate-800' }, (val < -0.5 ? '−$' : '$') + Math.round(Math.abs(val)).toLocaleString()),
                    policyOn && Math.abs(diff) >= 1 && React.createElement('div', { className: 'text-[0.625rem] font-bold ' + (diff >= 0 ? 'text-green-800' : 'text-red-700') }, (diff >= 0 ? '+' : '−') + '$' + Math.round(Math.abs(diff)).toLocaleString() + ' ' + t('stem.economicslab.vs_free_market', 'vs free market')));
                };
                return React.createElement('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-200 mb-4', 'data-economicslab-welfare': 'true', role: 'group', 'aria-label': t('stem.economicslab.welfare_title', 'Who gains, who loses') },
                  React.createElement('h4', { className: 'text-[0.6875rem] font-bold text-amber-900 mb-2 m-0' }, '🧮 ' + t('stem.economicslab.welfare_title', 'Who gains, who loses') + ' — ' + t('stem.economicslab.welfare_sub', 'areas on the graph, in dollars')),
                  React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 8 } },
                    tile('cs', t('stem.economicslab.welfare_cs', 'Consumer surplus'), sdOut.cs, free.cs, '#3b82f6'),
                    tile('ps', t('stem.economicslab.welfare_ps', 'Producer surplus'), sdOut.ps, free.ps, '#ef4444'),
                    tile('gov', sdOut.gov < -0.5 ? t('stem.economicslab.welfare_subsidy', 'Subsidy cost') : t('stem.economicslab.welfare_gov', 'Tax revenue'), sdOut.gov, free.gov, '#a855f7'),
                    extOn ? tile('ext', sdExt > 0 ? t('stem.economicslab.welfare_ext_cost', 'External cost') : t('stem.economicslab.welfare_ext_benefit', 'External benefit'), sdOut.external, free.external, '#dc2626') : tile('dwl', t('stem.economicslab.welfare_dwl', 'Deadweight loss'), sdOut.dwl, free.dwl, '#f59e0b'),
                    extOn && tile('sdwl', t('stem.economicslab.welfare_social_dwl', 'Social deadweight loss'), sdOut.socialDwl, free.socialDwl, '#ef4444'),
                    tile('total', extOn ? t('stem.economicslab.welfare_social_total', 'Total for society') : t('stem.economicslab.welfare_total', 'Total surplus'), extOn ? sdOut.socialTotal : sdOut.cs + sdOut.ps + sdOut.gov, extOn ? free.socialTotal : free.cs + free.ps + free.gov, '#10b981')),
                  React.createElement('p', { className: 'text-[0.6875rem] text-slate-700 mt-2 m-0' },
                    extOn ? (sdOut.atSocial && sdMonopoly ? t('stem.economicslab.welfare_ext_fixed_mono', 'The market now trades the amount that is best for society. With one seller that took a tax SMALLER than the harm, a subsidy, or a price control: the textbook Pigouvian rule (tax = harm) assumes many sellers.') : sdOut.atSocial ? ((sdOut.regime === 'tax' || sdOut.regime === 'subsidy') ? t('stem.economicslab.welfare_ext_fixed', '✅ The market now produces the amount that is best for society: the tax (or subsidy) makes buyers and sellers face the full social cost. Economists call this a Pigouvian tax.') : t('stem.economicslab.welfare_ext_fixed_control', 'The market now trades the amount that is best for society, but a price control got it there, not a Pigouvian tax. The control also moves surplus between buyers and sellers, and would stop working as soon as the curves shift.')) : t('stem.economicslab.welfare_ext', 'The market ignores the external effect, so it produces the wrong amount. The red triangle is the social deadweight loss: value society loses. Can you pick a tax or subsidy that makes it disappear?'))
                    : !policyOn ? t('stem.economicslab.welfare_free', 'Free market: every trade where a buyer values a unit more than it costs to make happens, so total surplus is as large as it can be and deadweight loss is $0. Add a price control or a tax to see who gains and who loses.')
                      : (sdMonopoly && sdOut.regime === 'monopoly') ? t('stem.economicslab.welfare_monopoly', 'One seller: it produces only where marginal revenue equals marginal cost (MR = MC) and charges what buyers will pay. Buyers lose surplus, the seller gains some of it as profit, and the amber triangle is value nobody gets.')
                      : (sdMonopoly && sdOut.regime === 'ceiling' && sdTax === 0) ? (sdOut.atCompetitive ? t('stem.economicslab.welfare_mono_cap_fixed', '✅ The price ceiling makes the monopolist act like a competitive market, so the deadweight loss is (almost) gone. This is why regulators cap the prices of utilities that are natural monopolies.') : t('stem.economicslab.welfare_mono_cap', 'The ceiling changes the monopolist’s math: under the cap, one more sale no longer lowers its price, so between the competitive price and its own price a LOWER cap means MORE output. Below the competitive price the cap causes a shortage instead.'))
                      : (sdMonopoly && sdOut.regime === 'floor' && sdTax === 0) ? t('stem.economicslab.welfare_mono_floor', 'A floor above the monopoly price forces the one seller to charge more than it wants. It sells less, so buyers lose AND the seller earns less than at its own price. A monopolist makes only what it sells, so there is no unsold surplus.')
                      : (sdMonopoly && (sdOut.regime === 'tax' || sdOut.regime === 'subsidy')) ? t('stem.economicslab.welfare_mono_tax', 'One seller plus a per-unit tax or subsidy: the seller still sets MR = MC, with the tax added to (or the subsidy taken off) its cost. A subsidy can offset monopoly power; a tax makes the output gap worse.')
                      : (sdTax !== 0 && (sdOut.regime === 'ceiling' || sdOut.regime === 'floor')) ? t('stem.economicslab.welfare_combo', 'Two policies at once: a price control is binding on top of the tax or subsidy. Read the tiles to see who ends up better or worse off than in a free market; the amber triangle is value lost from trades that no longer happen.')
                      : sdOut.regime === 'ceiling' ? t('stem.economicslab.welfare_ceiling', 'The ceiling moves surplus from sellers to the buyers who still get the good, but fewer units are made. The amber triangle is value that simply disappears: trades both sides wanted that no longer happen.')
                        : sdOut.regime === 'floor' ? t('stem.economicslab.welfare_floor', 'The floor moves surplus from buyers to the sellers who still make sales, but fewer units are bought. The amber triangle is the deadweight loss from trades that no longer happen.')
                          : sdOut.regime === 'subsidy' ? t('stem.economicslab.welfare_subsidy_text', 'The subsidy splits the market the other way: buyers pay less, sellers get more, and the government pays the purple rectangle. More is traded than is worth making (each extra unit costs more to make than buyers value it), so the amber triangle is deadweight loss.')
                          : t('stem.economicslab.welfare_tax', 'The tax splits the market: buyers pay more, sellers keep less, and the government collects the purple rectangle. The amber triangle is the deadweight loss: trades that would have happened without the tax.')));
              })(),

              React.createElement('div', { className: 'grid grid-cols-2 gap-4' },

                React.createElement('div', { className: 'space-y-3 bg-blue-50 rounded-xl p-4 border border-blue-200' },

                  React.createElement('h4', { className: 'text-sm font-bold text-blue-700' }, t('stem.economicslab.curve_shifts', '\uD83D\uDCC9 Curve Shifts')),

                  React.createElement('label', { className: 'block text-xs text-blue-600' }, t('stem.economicslab.demand_shift_label', 'Demand') + ': ' + (sdDemandShift === 0 ? t('stem.economicslab.no_shift', 'no shift') : sdDemandShift > 0 ? '+' + sdDemandShift + ' ' + t('stem.economicslab.shift_increase', '(increase → right)') : sdDemandShift + ' ' + t('stem.economicslab.shift_decrease', '(decrease ← left)'))),

                  React.createElement('input', {

                    type: 'range', 'aria-valuetext': (sdDemandShift === 0 ? 'no shift' : sdDemandShift > 0 ? ('shifted right ' + sdDemandShift) : ('shifted left ' + Math.abs(sdDemandShift))), 'aria-label': t('stem.economicslab.demand_shift_aria', 'Demand shift'), min: -5, max: 5, value: sdDemandShift,

                    onChange: function (e) { upd('sdDemandShift', parseInt(e.target.value)); },

                    className: 'w-full accent-blue-500'

                  }),

                  React.createElement('label', { className: 'block text-xs text-red-600' }, t('stem.economicslab.supply_shift_label', 'Supply') + ': ' + (sdSupplyShift === 0 ? t('stem.economicslab.no_shift', 'no shift') : sdSupplyShift > 0 ? '+' + sdSupplyShift + ' ' + t('stem.economicslab.shift_increase', '(increase → right)') : sdSupplyShift + ' ' + t('stem.economicslab.shift_decrease', '(decrease ← left)'))),

                  React.createElement('input', {

                    type: 'range', 'aria-valuetext': (sdSupplyShift === 0 ? 'no shift' : sdSupplyShift > 0 ? ('shifted right ' + sdSupplyShift) : ('shifted left ' + Math.abs(sdSupplyShift))), 'aria-label': t('stem.economicslab.supply_shift_aria', 'Supply shift'), min: -5, max: 5, value: sdSupplyShift,

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
                      React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 bg-white rounded-lg p-2 border border-blue-100' },
                        t('stem.economicslab.slope_note', '📚 Flat = elastic: people react strongly to price (luxuries, substitutes). Steep = inelastic: they can\'t easily change behavior (gasoline, medicine). Watch who bears a tax as you tilt the curves.'))
                    );
                  })()

                ),

                React.createElement('div', { className: 'space-y-3 bg-emerald-50 rounded-xl p-4 border border-emerald-200' },

                  React.createElement('h4', { className: 'text-sm font-bold text-emerald-700' }, t('stem.economicslab.government_controls', '\u2696\uFE0F Government Controls')),

                  React.createElement('label', { className: 'block text-xs text-emerald-600' }, 'Price Floor: $' + sdPriceFloor),

                  React.createElement('input', {

                    type: 'range', 'aria-valuetext': (sdPriceFloor === 0 ? 'no price floor' : '$' + sdPriceFloor + ' price floor'), 'aria-label': t('stem.economicslab.price_floor_aria', 'Price floor'), min: 0, max: 90, value: sdPriceFloor,

                    onChange: function (e) { upd('sdPriceFloor', parseInt(e.target.value)); },

                    className: 'w-full accent-emerald-500'

                  }),

                  React.createElement('label', { className: 'block text-xs text-orange-600' }, 'Price Ceiling: $' + sdPriceCeiling),

                  React.createElement('input', {

                    type: 'range', 'aria-valuetext': (sdPriceCeiling === 0 ? 'no price ceiling' : '$' + sdPriceCeiling + ' price ceiling'), 'aria-label': t('stem.economicslab.price_ceiling_aria', 'Price ceiling'), min: 0, max: 90, value: sdPriceCeiling,

                    onChange: function (e) { upd('sdPriceCeiling', parseInt(e.target.value)); },

                    className: 'w-full accent-orange-500'

                  }),

                  React.createElement('label', { className: 'block text-xs text-purple-600' }, sdTax >= 0 ? t('stem.economicslab.tax_label', 'Tax') + ': $' + sdTax : t('stem.economicslab.subsidy_label', 'Subsidy') + ': $' + (-sdTax) + ' ' + t('stem.economicslab.subsidy_hint', '(slide left of 0)')),

                  React.createElement('input', {

                    type: 'range', 'aria-valuetext': (sdTax === 0 ? 'no tax or subsidy' : sdTax > 0 ? '$' + sdTax + ' per-unit tax' : '$' + (-sdTax) + ' per-unit subsidy'), 'aria-label': t('stem.economicslab.tax_subsidy_aria', 'Per-unit tax (right) or subsidy (left)'), min: -30, max: 30, value: sdTax,

                    onChange: function (e) { upd('sdTax', parseInt(e.target.value)); },

                    className: 'w-full accent-purple-500'

                  })

                )

              ),

              React.createElement('button', {
                onClick: function () { upd('sdDemandShift', 0); upd('sdSupplyShift', 0); upd('sdPriceFloor', 0); upd('sdPriceCeiling', 0); upd('sdTax', 0); upd('sdProbe', null); upd('sdDemSlope', 0.8); upd('sdSupSlope', 0.8); updMany({ sdExt: 0, sdShowRevenue: false, sdMonopoly: false }); if (announceToSR) announceToSR('Supply and demand graph reset to defaults.'); },
                className: 'mt-3 mb-2 w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-400'
              }, t('stem.economicslab.reset_graph', '♻ Reset Graph')),

              // ── Market failure lab + revenue view ──
              (function () {
                var fixed = !sdMonopoly && sdExt !== 0 && sdOut.atSocial && (sdOut.regime === 'tax' || sdOut.regime === 'subsidy');
                var fixedByControl = !sdMonopoly && sdExt !== 0 && sdOut.atSocial && !fixed;
                // Spending and elasticity are read ON the demand curve at the price
                // buyers pay. Under a binding ceiling sellers, not buyers, limit sales.
                var rq = sdOut.q, rp = sdOut.pc, rev = rp * rq, wedge = Math.abs(sdOut.pc - sdOut.pp) > 0.05;
                var rqd = Math.max(0, (sdDemInt - rp) / sdDemSlope);
                var rp2 = rp + 1, rq2 = Math.max(0, (sdDemInt - rp2) / sdDemSlope), rev2 = rp2 * rq2, revD = rp * rqd;
                var elas = (rp / Math.max(0.01, rqd)) / sdDemSlope;
                var onDemand = Math.abs(sdOut.q - sdOut.qd) < 0.01;
                return React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3' },
                  React.createElement('div', { className: 'bg-rose-50 rounded-xl p-3 border border-rose-200', 'data-economicslab-externality': 'true' },
                    React.createElement('h4', { className: 'text-xs font-bold text-rose-900 mb-1 m-0' }, '🏭 ' + t('stem.economicslab.mf_title', 'Market failure lab')),
                    React.createElement('label', { className: 'block text-[0.6875rem] font-bold text-rose-900' }, sdExt > 0 ? t('stem.economicslab.mf_cost', 'External cost (pollution)') + ': $' + sdExt + '/unit' : sdExt < 0 ? t('stem.economicslab.mf_benefit', 'External benefit (e.g. vaccines)') + ': $' + (-sdExt) + '/unit' : t('stem.economicslab.mf_none', 'No externality'),
                      React.createElement('input', { type: 'range', min: -20, max: 30, step: 1, value: sdExt, 'aria-label': t('stem.economicslab.mf_aria', 'External cost per unit (right) or external benefit (left)'), 'aria-valuetext': sdExt === 0 ? 'none' : sdExt > 0 ? '$' + sdExt + ' external cost per unit' : '$' + (-sdExt) + ' external benefit per unit', onChange: function (e) { upd('sdExt', parseInt(e.target.value, 10)); }, className: 'w-full accent-rose-600' })),
                    sdExt === 0
                      ? React.createElement('p', { className: 'text-[0.6875rem] text-slate-700 m-0' }, t('stem.economicslab.mf_intro', 'Slide right for a good that harms bystanders (pollution), left for one that helps them (vaccines). The dashed curve shows the true social cost or benefit.'))
                      : React.createElement('div', { className: 'text-[0.6875rem] m-0 ' + (fixed ? 'text-green-800 font-bold' : 'text-rose-900') },
                          sdMonopoly ? '🏢 ' + t('stem.economicslab.mf_mono_note', 'The Pigouvian challenge assumes many sellers. With one seller the best tax is smaller than the harm, or even a subsidy. Switch off “one seller” to try the challenge.') : fixed ? '✅ ' + t('stem.economicslab.mf_fixed', 'Fixed! Social deadweight loss is $0.') : fixedByControl ? '🤔 ' + t('stem.economicslab.mf_fixed_control', 'Social deadweight loss is $0, but a price control did it. Can you do it with a tax or subsidy alone?') : '🎯 ' + t('stem.economicslab.mf_challenge', 'Challenge: set the tax (or subsidy) that makes the social deadweight loss $0. Right now it is') + ' $' + Math.round(sdOut.socialDwl).toLocaleString() + '.',
                          !sdMonopoly && !fixed && !fixedByControl && React.createElement('div', { className: 'text-slate-600 mt-1' }, t('stem.economicslab.mf_hint', 'Hint: compare the market quantity with S*, the quantity that is best for society.')))),
                  React.createElement('div', { className: 'bg-green-50 rounded-xl p-3 border border-green-200', 'data-economicslab-revenue': 'true' },
                    React.createElement('div', { className: 'flex items-center justify-between gap-2 mb-1' },
                      React.createElement('h4', { className: 'text-xs font-bold text-green-900 m-0' }, '💰 ' + t('stem.economicslab.rev_title', 'Revenue & elasticity')),
                      React.createElement('button', { type: 'button', 'aria-pressed': d.sdShowRevenue ? 'true' : 'false', onClick: function () { upd('sdShowRevenue', !d.sdShowRevenue); }, className: 'text-[0.6875rem] px-2 py-1 rounded-full border font-bold ' + (d.sdShowRevenue ? 'bg-green-800 text-white border-green-800' : 'bg-white text-green-900 border-green-700') }, d.sdShowRevenue ? t('stem.economicslab.rev_on', 'Showing on graph') : t('stem.economicslab.rev_show', 'Show on graph'))),
                    rq > 0.05 ? React.createElement('p', { className: 'text-[0.6875rem] text-slate-700 m-0' },
                      (wedge
                        ? t('stem.economicslab.rev_spend', 'Buyers spend') + ' $' + rp.toFixed(0) + ' × ' + rq.toFixed(1) + ' = $' + Math.round(rev).toLocaleString() + '; ' + t('stem.economicslab.rev_keep', 'sellers get') + ' $' + sdOut.pp.toFixed(0) + ' × ' + rq.toFixed(1) + ' = $' + Math.round(sdOut.pp * rq).toLocaleString() + (sdOut.pc > sdOut.pp ? ' ' + t('stem.economicslab.rev_keep_tax', '(the rest is tax).') : ' ' + t('stem.economicslab.rev_keep_sub', '(the government pays the difference).')) + ' '
                        : t('stem.economicslab.rev_now', 'Sellers take in') + ' $' + rp.toFixed(0) + ' × ' + rq.toFixed(1) + ' = $' + Math.round(rev).toLocaleString() + '. ') +
                      (onDemand
                        ? t('stem.economicslab.rev_test_1', 'If the price rose $1, buyers would take') + ' ' + rq2.toFixed(1) + ' ' + t('stem.economicslab.rev_test_2', 'and revenue would') + ' ' + (rev2 > revD + 0.5 ? t('stem.economicslab.rev_rise', 'RISE to') : rev2 < revD - 0.5 ? t('stem.economicslab.rev_fall', 'FALL to') : t('stem.economicslab.rev_same', 'stay about')) + ' $' + Math.round(rev2).toLocaleString() + '. '
                        : t('stem.economicslab.rev_ceiling', 'The ceiling is binding, so sellers (not buyers) limit how much is sold; the $1 test along demand does not apply here.') + ' ') +
                      t('stem.economicslab.rev_elas', 'Demand elasticity here is') + ' ' + elas.toFixed(2) + ': ' + (elas > 1.05 ? t('stem.economicslab.rev_elastic', 'ELASTIC, so raising the price loses revenue.') : elas < 0.95 ? t('stem.economicslab.rev_inelastic', 'INELASTIC, so raising the price gains revenue.') : t('stem.economicslab.rev_unit', 'about unit elastic, so revenue barely changes.')))
                      : React.createElement('p', { className: 'text-[0.6875rem] text-slate-700 m-0' }, t('stem.economicslab.rev_none', 'Nothing is traded at these settings.'))),
                  (function () {
                    // The monopoly on today's curves with no policy, for the explanation.
                    var mPure = E.sdOutcome({ dShift: sdDemandShift, sShift: sdSupplyShift, dSlope: sdDemSlope, sSlope: sdSupSlope, monopoly: true });
                    var mMc = sdSupInt + sdSupSlope * mPure.q;
                    var capFixed = sdMonopoly && sdOut.regime === 'ceiling' && sdTax === 0 && sdOut.atCompetitive;
                    return React.createElement('div', { className: 'sm:col-span-2 bg-violet-50 rounded-xl p-3 border border-violet-200', 'data-economicslab-monopoly': 'true' },
                      React.createElement('div', { className: 'flex items-center justify-between gap-2 mb-1' },
                        React.createElement('h4', { className: 'text-xs font-bold text-violet-900 m-0' }, '🏢 ' + t('stem.economicslab.mono_title', 'Market power')),
                        React.createElement('button', { type: 'button', 'aria-pressed': sdMonopoly ? 'true' : 'false', 'data-economicslab-monopoly-toggle': 'true', onClick: function () { upd('sdMonopoly', !sdMonopoly); if (announceToSR) announceToSR(sdMonopoly ? t('stem.economicslab.mono_sr_off', 'Back to a competitive market.') : t('stem.economicslab.mono_sr_on', 'One seller now controls the market. The MR curve is drawn.')); }, className: 'text-[0.6875rem] px-2 py-1 rounded-full border font-bold ' + (sdMonopoly ? 'bg-violet-800 text-white border-violet-800' : 'bg-white text-violet-900 border-violet-700') },
                          sdMonopoly ? t('stem.economicslab.mono_on', 'One seller: on') : t('stem.economicslab.mono_off', 'Make it one seller'))),
                      !sdMonopoly
                        ? React.createElement('p', { className: 'text-[0.6875rem] text-slate-700 m-0' }, t('stem.economicslab.mono_intro', 'What if one company were the only seller, like a town’s only cable provider? Switch it on to see its marginal revenue (MR) curve and the amount it chooses to sell.'))
                        : React.createElement('div', { className: 'text-[0.6875rem] text-slate-800 space-y-1' },
                            React.createElement('p', { className: 'm-0' }, t('stem.economicslab.mono_explain_1', 'A single seller produces where marginal revenue equals marginal cost: Q') + ' ' + mPure.q.toFixed(1) + ' ' + t('stem.economicslab.mono_explain_2', 'at') + ' $' + mPure.pc.toFixed(0) + ', ' + t('stem.economicslab.mono_explain_3', 'versus Q') + ' ' + mPure.qStar.toFixed(1) + ' ' + t('stem.economicslab.mono_explain_2', 'at') + ' $' + mPure.pStar.toFixed(0) + ' ' + t('stem.economicslab.mono_explain_4', 'with competition. Its markup over marginal cost is') + ' $' + (mPure.pc - mMc).toFixed(0) + ', ' + t('stem.economicslab.mono_explain_5', 'and the deadweight loss is') + ' $' + Math.round(mPure.dwl).toLocaleString() + '.'),
                            React.createElement('p', { className: 'm-0 ' + (capFixed ? 'text-green-800 font-bold' : 'text-violet-900') },
                              capFixed ? '✅ ' + t('stem.economicslab.mono_fixed', 'Your price ceiling makes the monopolist sell the competitive amount. Under the cap, one more sale no longer lowers its price, so producing more pays.')
                                : '🎯 ' + t('stem.economicslab.mono_challenge', 'Challenge: set a price ceiling that makes the monopolist sell the competitive amount,') + ' ' + mPure.qStar.toFixed(0) + ' ' + t('stem.economicslab.units', 'units') + '.'))
                    );
                  })());
              })(),

              // ── Market Detective: predict, then check it on the graph ──
              // Each case is a news story. Students name the curve, its
              // direction, and what happens to P and Q BEFORE the graph moves.
              // The answer key comes from ECON_ENGINE.sdPredict, which the tests
              // check against the graph's own equilibrium math.
              (function () {
                var level = d.econDifficulty === 'easy' ? 1 : d.econDifficulty === 'hard' ? 3 : 2;
                var byId = {};
                E.SD_CASES.forEach(function (c) { byId[c.id] = c; });
                var levelIds = E.SD_CASES.filter(function (c) { return c.level <= level; }).map(function (c) { return c.id; });
                var order = Array.isArray(sdDet.order) ? sdDet.order.filter(function (id) { return levelIds.indexOf(id) !== -1; }) : [];
                levelIds.forEach(function (id) { if (order.indexOf(id) === -1) order.push(id); });
                var deck = order.map(function (id) { return byId[id]; });
                var solved = Array.isArray(sdDet.solved) ? sdDet.solved.filter(function (id) { return typeof id === 'string'; }) : [];
                var det = sdDet;
                var idx = Math.abs(Math.round(num(det.idx, 0))) % deck.length;
                var cs = deck[idx];
                var pred = E.sdPredict(cs.ds, cs.ss);
                var curve = det.curve === 'demand' || det.curve === 'supply' || det.curve === 'both' ? det.curve : null;
                var dDir = det.dDir === 1 || det.dDir === -1 ? det.dDir : null;
                var sDir = det.sDir === 1 || det.sDir === -1 ? det.sDir : null;
                var pGuess = ['up', 'down', 'unclear'].indexOf(det.p) !== -1 ? det.p : null;
                var qGuess = ['up', 'down', 'unclear'].indexOf(det.q) !== -1 ? det.q : null;
                var checked = det.checked === true && det.caseId === cs.id;
                var needD = curve === 'demand' || curve === 'both', needS = curve === 'supply' || curve === 'both';
                var ready = !!curve && (!needD || dDir) && (!needS || sDir) && !!pGuess && !!qGuess;
                var setDet = function (patch) { upd('sdDet', Object.assign({}, det, { caseId: cs.id, idx: idx }, patch)); };
                var choice = function (key, label, on, onClick, disabled) {
                  return React.createElement('button', { key: key, type: 'button', 'aria-pressed': on ? 'true' : 'false', disabled: !!disabled, onClick: onClick, className: 'px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold border transition-all ' + (on ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-700 border-slate-300 hover:border-teal-500') }, label);
                };
                var dirRow = function (which, val, setKey) {
                  return React.createElement('div', { className: 'flex items-center gap-1 flex-wrap', role: 'group', 'aria-label': which + ' ' + t('stem.economicslab.det_direction', 'direction') },
                    React.createElement('span', { className: 'text-[0.6875rem] font-bold text-slate-700 w-16' }, which + ':'),
                    choice(setKey + 'l', t('stem.economicslab.det_decrease', '← Decreases'), val === -1, function () { var p = {}; p[setKey] = -1; setDet(p); }, checked),
                    choice(setKey + 'r', t('stem.economicslab.det_increase', 'Increases →'), val === 1, function () { var p = {}; p[setKey] = 1; setDet(p); }, checked));
                };
                var pqWord = function (v) { return v === 'up' ? t('stem.economicslab.det_rises', '↑ Rises') : v === 'down' ? t('stem.economicslab.det_falls', '↓ Falls') : t('stem.economicslab.det_cant_tell', '? Can’t tell'); };
                var pqRow = function (label, val, key) {
                  return React.createElement('div', { className: 'flex items-center gap-1 flex-wrap', role: 'group', 'aria-label': label },
                    React.createElement('span', { className: 'text-[0.6875rem] font-bold text-slate-700 w-16' }, label + ':'),
                    ['up', 'down', 'unclear'].map(function (v) { return choice(key + v, pqWord(v), val === v, function () { var p = {}; p[key] = v; setDet(p); }, checked); }));
                };
                // Grading, once checked.
                var okCurve = curve === pred.curve;
                var okDirs = okCurve && (!needD || dDir === pred.d) && (!needS || sDir === pred.s);
                var okP = pGuess === pred.p, okQ = qGuess === pred.q;
                var allOk = okCurve && okDirs && okP && okQ;
                var shownOut = E.sdOutcome({ dShift: cs.ds, sShift: cs.ss });
                var mark = function (ok) { return ok ? '✅ ' : '❌ '; };
                var curveWord = function (c) { return c === 'demand' ? t('stem.economicslab.det_demand', 'Demand') : c === 'supply' ? t('stem.economicslab.det_supply', 'Supply') : t('stem.economicslab.det_both', 'Both'); };
                var dirWords = function () {
                  var parts = [];
                  if (pred.d) parts.push(t('stem.economicslab.det_demand', 'Demand') + ' ' + (pred.d > 0 ? t('stem.economicslab.det_increases', 'increases') : t('stem.economicslab.det_decreases', 'decreases')));
                  if (pred.s) parts.push(t('stem.economicslab.det_supply', 'Supply') + ' ' + (pred.s > 0 ? t('stem.economicslab.det_increases', 'increases') : t('stem.economicslab.det_decreases', 'decreases')));
                  return parts.join(', ');
                };
                return React.createElement('div', { className: 'bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-200 mb-3', 'data-economicslab-detective': 'true' },
                  React.createElement('div', { className: 'flex items-center justify-between flex-wrap gap-2 mb-2' },
                    React.createElement('h4', { className: 'text-sm font-bold text-teal-900 m-0' }, '🕵️ ' + t('stem.economicslab.det_title', 'Market Detective') + ' — ' + t('stem.economicslab.det_case', 'case') + ' ' + (idx + 1) + '/' + deck.length),
                    React.createElement('span', { className: 'text-[0.6875rem] font-bold text-teal-900' }, '⭐ ' + solved.length + ' ' + t('stem.economicslab.det_solved', 'solved') + ' · 🔥 ' + num(det.streak, 0) + ' ' + t('stem.economicslab.det_streak', 'streak') + (num(det.best, 0) > 0 ? ' · ' + t('stem.economicslab.det_best', 'best') + ' ' + num(det.best, 0) : ''))),
                  React.createElement('div', { className: 'bg-white rounded-lg p-3 border border-teal-100 mb-2' },
                    React.createElement('span', { className: 'inline-block text-[0.625rem] font-bold uppercase tracking-wide text-teal-900 bg-teal-100 rounded px-1.5 py-0.5 mb-1' }, t('stem.economicslab.det_market', 'Market') + ': ' + cs.market),
                    React.createElement('p', { className: 'text-xs font-bold text-slate-800 m-0' }, '📰 ' + cs.headline)),
                  React.createElement('div', { className: 'space-y-2' },
                    React.createElement('div', { className: 'flex items-center gap-1 flex-wrap', role: 'group', 'aria-label': t('stem.economicslab.det_q1', '1. Which curve moves?') },
                      React.createElement('span', { className: 'text-[0.6875rem] font-bold text-slate-800 mr-1' }, t('stem.economicslab.det_q1', '1. Which curve moves?')),
                      ['demand', 'supply', 'both'].map(function (c) { return choice('c' + c, curveWord(c), curve === c, function () { setDet({ curve: c, dDir: null, sDir: null }); }, checked); })),
                    curve && React.createElement('div', { className: 'space-y-1' },
                      React.createElement('div', { className: 'text-[0.6875rem] font-bold text-slate-800' }, t('stem.economicslab.det_q2', '2. Which way?')),
                      needD && dirRow(t('stem.economicslab.det_demand', 'Demand'), dDir, 'dDir'),
                      needS && dirRow(t('stem.economicslab.det_supply', 'Supply'), sDir, 'sDir')),
                    curve && React.createElement('div', { className: 'space-y-1' },
                      React.createElement('div', { className: 'text-[0.6875rem] font-bold text-slate-800' }, t('stem.economicslab.det_q3', '3. Predict the new equilibrium')),
                      pqRow(t('stem.economicslab.det_price', 'Price'), pGuess, 'p'),
                      pqRow(t('stem.economicslab.det_quantity', 'Quantity'), qGuess, 'q'))),
                  !checked && React.createElement('button', {
                    type: 'button', disabled: !ready,
                    onClick: function () {
                      var streak = allOk ? num(det.streak, 0) + 1 : 0;
                      updMany({
                        // Shuffle the rest of the deck once, the first time a case is checked,
                        // so the order cannot be memorized from a classmate's screen.
                        sdDet: Object.assign({}, det, {
                          caseId: cs.id, idx: Array.isArray(det.order) ? idx : 0, checked: true,
                          order: Array.isArray(det.order) ? order : [cs.id].concat(order.filter(function (id) { return id !== cs.id; }).map(function (id) { return [Math.random(), id]; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; })),
                          solved: allOk && solved.indexOf(cs.id) === -1 ? solved.concat([cs.id]) : solved,
                          correct: (allOk && solved.indexOf(cs.id) === -1 ? solved.length + 1 : solved.length), tried: num(det.tried, 0) + 1, streak: streak, best: Math.max(num(det.best, 0), streak),
                          prevGraph: det.checked ? det.prevGraph : { sdDemandShift: sdDemandShift, sdSupplyShift: sdSupplyShift, sdDemSlope: sdDemSlope, sdSupSlope: sdSupSlope, sdPriceFloor: sdPriceFloor, sdPriceCeiling: sdPriceCeiling, sdTax: sdTax, sdExt: sdExt, sdShowRevenue: !!d.sdShowRevenue, sdMonopoly: sdMonopoly }
                        }),
                        sdDemandShift: cs.ds, sdSupplyShift: cs.ss, sdDemSlope: 0.8, sdSupSlope: 0.8, sdPriceFloor: 0, sdPriceCeiling: 0, sdTax: 0, sdExt: 0, sdShowRevenue: false, sdMonopoly: false, sdProbe: null
                      });
                      if (allOk) addXP(15, 'Market Detective: solved a case');
                      if (announceToSR) announceToSR((allOk ? t('stem.economicslab.det_sr_right', 'All correct.') : t('stem.economicslab.det_sr_wrong', 'Not quite.')) + ' ' + dirWords() + '. ' + t('stem.economicslab.det_price', 'Price') + ' ' + pqWord(pred.p) + ', ' + t('stem.economicslab.det_quantity', 'Quantity') + ' ' + pqWord(pred.q) + '. ' + t('stem.economicslab.det_sr_graph', 'The graph now shows the shift.'));
                    },
                    className: 'mt-3 w-full py-2 rounded-xl text-xs font-bold ' + (ready ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600')
                  }, ready ? t('stem.economicslab.det_check', '🔍 Check my prediction & show it on the graph') : t('stem.economicslab.det_answer_all', 'Answer all three to check')),
                  checked && React.createElement('div', { className: 'mt-3 space-y-2', role: 'status' },
                    React.createElement('div', { className: 'rounded-lg p-2 text-[0.6875rem] border ' + (allOk ? 'bg-green-50 border-green-200 text-green-900' : 'bg-amber-50 border-amber-200 text-amber-900') },
                      React.createElement('div', { className: 'font-bold mb-1' }, allOk ? t('stem.economicslab.det_all_right', '🎉 Case closed: every part right!') : t('stem.economicslab.det_some_wrong', 'Case review: compare your prediction with the graph.')),
                      React.createElement('div', null, mark(okCurve) + t('stem.economicslab.det_curve_was', 'Curve') + ': ' + curveWord(pred.curve)),
                      React.createElement('div', null, mark(okDirs) + t('stem.economicslab.det_dir_was', 'Direction') + ': ' + dirWords()),
                      React.createElement('div', null, mark(okP) + t('stem.economicslab.det_price', 'Price') + ': ' + pqWord(pred.p)),
                      React.createElement('div', null, mark(okQ) + t('stem.economicslab.det_quantity', 'Quantity') + ': ' + pqWord(pred.q))),
                    React.createElement('p', { className: 'text-[0.6875rem] text-slate-700 bg-white rounded-lg p-2 border border-teal-100 m-0' }, '📚 ' + cs.why),
                    React.createElement('p', { className: 'text-[0.6875rem] text-teal-900 m-0' }, t('stem.economicslab.det_on_graph', 'On this graph:') + ' P $' + sdBase.pStar.toFixed(1) + ' → $' + shownOut.pStar.toFixed(1) + ', Q ' + sdBase.qStar.toFixed(1) + ' → ' + shownOut.qStar.toFixed(1) + (pred.p === 'unclear' || pred.q === 'unclear' ? ' ' + t('stem.economicslab.det_sizes_note', '(with these particular shift sizes; different sizes could flip the unclear one)') : '')),
                    React.createElement('button', {
                      type: 'button',
                      onClick: function () {
                        var saved = (det.prevGraph && typeof det.prevGraph === 'object') ? det.prevGraph : { sdDemandShift: 0, sdSupplyShift: 0 };
                        // Restore graph settings only; a saved file could carry any key.
                        var back = {};
                        ['sdDemandShift', 'sdSupplyShift', 'sdDemSlope', 'sdSupSlope', 'sdPriceFloor', 'sdPriceCeiling', 'sdTax', 'sdExt', 'sdShowRevenue', 'sdMonopoly'].forEach(function (k) { if (k in saved) back[k] = saved[k]; });
                        updMany(Object.assign({}, back, { sdDet: { order: order, solved: solved, correct: solved.length, tried: num(det.tried, 0), streak: num(det.streak, 0), best: num(det.best, 0), idx: (idx + 1) % deck.length } }));
                      },
                      className: 'w-full py-2 rounded-xl text-xs font-bold bg-teal-100 text-teal-900 border border-teal-300'
                    }, t('stem.economicslab.det_next', 'Next case →'))),
                  React.createElement('p', { className: 'text-[0.625rem] text-slate-600 italic mt-2 m-0' }, t('stem.economicslab.det_level_note', 'Difficulty (top bar) picks the deck: Easy = one clear shift, Medium adds substitutes, complements and expectations, Hard adds two shifts at once.')));
              })(),


              // Elasticity Education

              React.createElement('div', { className: 'col-span-2 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-3 border border-cyan-200 mb-2' },

                React.createElement('h4', { className: 'text-[0.6875rem] font-bold text-cyan-700 mb-1' }, t('stem.economicslab.price_elasticity_of_demand', '\uD83D\uDCCF Price Elasticity of Demand')),

                React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 leading-relaxed' },

                  React.createElement('p', null, '\uD83D\uDCDA ',

                    React.createElement('strong', null, t('stem.economicslab.elasticity_2', 'Elasticity')), t('stem.economicslab.measures_how_much_quantity_demanded_ch', ' measures how much quantity demanded changes when price changes. '),

                    React.createElement('strong', null, t('stem.economicslab.elastic', 'Elastic')), t('stem.economicslab.goods_luxury_items_products_with_subst', ' goods (luxury items, products with substitutes) see big demand drops from small price increases. '),

                    React.createElement('strong', null, t('stem.economicslab.inelastic', 'Inelastic')), t('stem.economicslab.goods_necessities_like_medicine_gasoli', ' goods (necessities like medicine, gasoline) have stable demand regardless of price.')

                  ),

                  React.createElement('div', { className: 'grid grid-cols-3 gap-2 mt-2' },

                    React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center border border-cyan-100' },

                      React.createElement('div', { className: 'text-lg' }, '\uD83D\uDC8E'),

                      React.createElement('div', { className: 'text-[0.6875rem] font-bold text-cyan-700' }, t('stem.economicslab.elastic_1', 'Elastic (>1)')),

                      React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, t('stem.economicslab.luxury_goods_restaurants_vacations', 'Luxury goods, restaurants, vacations'))

                    ),

                    React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center border border-cyan-100' },

                      React.createElement('div', { className: 'text-lg' }, '\u2696\uFE0F'),

                      React.createElement('div', { className: 'text-[0.6875rem] font-bold text-cyan-700' }, t('stem.economicslab.unit_elastic_1', 'Unit Elastic (=1)')),

                      React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, t('stem.economicslab.revenue_unchanged_by_price', 'Revenue unchanged by price'))

                    ),

                    React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center border border-cyan-100' },

                      React.createElement('div', { className: 'text-lg' }, '\uD83D\uDC8A'),

                      React.createElement('div', { className: 'text-[0.6875rem] font-bold text-cyan-700' }, t('stem.economicslab.inelastic_1', 'Inelastic (<1)')),

                      React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, t('stem.economicslab.medicine_gasoline_utilities', 'Medicine, gasoline, utilities'))

                    )

                  )

                )

              ),

              // Scenario generator: AI-written when available, a random built-in
              // case otherwise. AI numbers are clamped to the sliders' own ranges.

              (function () {
                var sc = (d.sdScenario && typeof d.sdScenario === 'object') ? d.sdScenario : null;
                var scD = sc ? Math.round(E.clamp(num(sc.demandShift, 0), -5, 5)) : 0;
                var scS = sc ? Math.round(E.clamp(num(sc.supplyShift, 0), -5, 5)) : 0;
                return React.createElement('div', { className: 'col-span-2 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200' },
                  React.createElement('h4', { className: 'text-sm font-bold text-violet-700 mb-2' }, econAI ? t('stem.economicslab.ai_scenario_generator', '✨ AI Scenario Generator') : t('stem.economicslab.scenario_generator_offline', '🎲 Real-world scenario generator')),
                  sc ? React.createElement('div', null,
                    React.createElement('div', { className: 'bg-white rounded-lg p-3 mb-2 border border-violet-100' },
                      React.createElement('h5', { className: 'text-xs font-bold text-slate-800' }, econStr(sc.title, 160)),
                      React.createElement('p', { className: 'text-[0.6875rem] text-slate-600 mt-1' }, econStr(sc.explanation, 600)),
                      React.createElement('div', { className: 'flex gap-2 mt-2 text-[0.6875rem]' },
                        React.createElement('span', { className: 'text-blue-700 font-bold' }, 'Demand: ' + (scD > 0 ? '+' : '') + scD),
                        React.createElement('span', { className: 'text-red-700 font-bold' }, 'Supply: ' + (scS > 0 ? '+' : '') + scS)),
                      econStr(sc.lesson, 400) && React.createElement('div', { className: 'mt-2 bg-violet-100 rounded-lg px-3 py-2 text-[0.6875rem] text-violet-800 border border-violet-200' },
                        React.createElement('span', { className: 'font-bold' }, t('stem.economicslab.concept', '📚 Concept: ')),
                        econStr(sc.lesson, 400))),
                    React.createElement('button', {
                      type: 'button',
                      onClick: function () {
                        updMany({
                          sdDemandShift: scD, sdSupplyShift: scS,
                          sdPriceFloor: Math.round(E.clamp(num(sc.priceFloor, 0), 0, 90)),
                          sdPriceCeiling: Math.round(E.clamp(num(sc.priceCeiling, 0), 0, 90)),
                          sdTax: Math.round(E.clamp(num(sc.tax, 0), -30, 30)), sdProbe: null, sdExt: Math.round(E.clamp(num(sc.ext, 0), -20, 30)), sdMonopoly: sc.monopoly === true,
                          sdDemSlope: Math.round(E.clamp(num(sc.dSlope, 0.8), 0.3, 1.5) * 10) / 10, sdSupSlope: Math.round(E.clamp(num(sc.sSlope, 0.8), 0.3, 1.5) * 10) / 10
                        });
                        if (addToast) addToast('✅ Scenario applied to graph!', 'success');
                        if (announceToSR) announceToSR('Economic scenario applied. Supply and demand graph updated.');
                        var lesson = econStr(sc.lesson, 400), title = econStr(sc.title, 160);
                        if (lesson && title && !econGlossaryList.some(function (g) { return g.concept === title; })) upd('econGlossary', econGlossaryList.concat([{ tab: 'S&D', concept: title, explanation: lesson }]));
                      },
                      className: 'w-full py-2 rounded-lg text-xs font-bold bg-violet-700 text-white mb-1'
                    }, t('stem.economicslab.apply_scenario_to_graph', '✅ Apply Scenario to Graph')),
                    React.createElement('button', {
                      type: 'button',
                      onClick: function () { upd('sdScenario', null); },
                      className: 'w-full py-1.5 rounded-lg text-[0.6875rem] font-bold bg-slate-100 text-slate-600'
                    }, t('stem.economicslab.dismiss', 'Dismiss'))
                  ) : React.createElement('button', {
                    type: 'button',
                    onClick: function () {
                      var fromDeck = function () {
                        var c = E.SD_SCENARIOS[Math.floor(Math.random() * E.SD_SCENARIOS.length)];
                        updMany({ sdScenario: { title: c.title, explanation: c.explanation, demandShift: c.dShift || 0, supplyShift: c.sShift || 0, priceFloor: c.floor || 0, priceCeiling: c.ceiling || 0, tax: c.tax || 0, ext: c.ext || 0, monopoly: !!c.monopoly, dSlope: c.dSlope, sSlope: c.sSlope, lesson: c.lesson }, sdLoading: false });
                      };
                      if (!econAI) { fromDeck(); return; }
                      upd('sdLoading', Date.now());
                      var prompt = 'You are an economics teacher. Generate a real-world supply and demand scenario for students (difficulty: ' + (d.econDifficulty || 'medium') + ').\n\nReturn ONLY valid JSON:\n{"title":"<short scenario title>","explanation":"<2-3 sentences explaining what happened and why it shifts supply/demand>","demandShift":<integer -5 to 5>,"supplyShift":<integer -5 to 5>,"priceFloor":<0 or number if relevant>,"priceCeiling":<0 or number if relevant>,"tax":<0 or number if relevant>}\n\nSign convention: a positive shift is an INCREASE (the curve moves right), a negative shift is a DECREASE (moves left). Examples: new iPhone launch (demand +3), oil embargo (supply -4), minimum wage law (price floor 40), rent control (price ceiling 30), sugar tax (tax 5). Be creative.\n\nIMPORTANT: Include a "lesson" field with a 1-2 sentence economics concept (e.g., elasticity, substitute goods, complement goods, deadweight loss, consumer surplus, producer surplus, market failure, externalities, public goods).';
                      econAsk(prompt).then(function (result) {
                        try {
                          var sc2 = econParseJSON(result);
                          if (typeof sc2.title !== 'string') throw new Error('no title');
                          updIf(function (p) { return !p.sdScenario; }, { sdScenario: sc2, sdLoading: false });
                          if (announceToSR) announceToSR(t('stem.economicslab.sr_new_scenario', 'New scenario:') + ' ' + econStr(sc2.title, 160));
                        } catch (err2) { fromDeck(); if (addToast) addToast(t('stem.economicslab.scenario_fallback', 'AI scenario failed, so here is one from the built-in deck.'), 'info'); }
                      }).catch(function () { fromDeck(); if (addToast) addToast(t('stem.economicslab.scenario_fallback', 'AI scenario failed, so here is one from the built-in deck.'), 'info'); });
                    },
                    disabled: econBusy(d.sdLoading),
                    className: 'w-full py-3 rounded-xl text-xs font-bold transition-all ' + (econBusy(d.sdLoading) ? 'bg-slate-300 text-slate-600' : 'bg-violet-700 text-white hover:shadow-lg')
                  }, econBusy(d.sdLoading) ? '⏳ Generating...' : '🎲 Generate Random Scenario'));
              })()

            ),



            econTab === 'personalFinance' && (function () {

              // ── Life Sim ──
              // One year = one event + one full year of paychecks and bills,
              // computed by ECON_ENGINE.lifeYear from the same state the budget
              // card and the pie chart show.

              var pfRaw = (d.lifeEvent && typeof d.lifeEvent === 'object') ? d.lifeEvent : null;

              var pfEvent = pfRaw && Array.isArray(pfRaw.choices) ? Object.assign({}, pfRaw, { choices: pfRaw.choices.filter(function (c) { return c && typeof c === 'object' && typeof c.label === 'string'; }).slice(0, 4) }) : null;

              if (pfEvent && pfEvent.choices.length === 0) pfEvent = null;

              var pfSource = econAI && d.pfEventSource === 'ai' ? 'ai' : 'deck';

              var fmtMo = function (v) { return '$' + Math.round(Math.abs(v)).toLocaleString(); };

              var PF_GOALS = [
                { id: 'emergency', label: t('stem.economicslab.goal_emergency', '🛟 Emergency fund: 6 months of essentials in cash'), progress: function () { return pfCash / Math.max(1, 6 * pfBud.essentials); } },
                { id: 'debtfree', label: t('stem.economicslab.goal_debtfree', '✂️ Become debt-free after borrowing'), progress: function () { var peak = num(d.pfDebtPeak, 0); return peak > 0 ? 1 - pfDebtAll / peak : 0; } },
                { id: 'invest50k', label: t('stem.economicslab.goal_invest50k', '📈 $50,000 invested'), progress: function () { return pfLife.invested / 50000; } },
                { id: 'nw100k', label: t('stem.economicslab.goal_nw100k', '💯 Net worth of $100,000'), progress: function () { return pfNetWorth / 100000; } },
                { id: 'home', label: t('stem.economicslab.goal_home', '🏠 Own a home with $50,000 of equity'), progress: function () { return pfLife.housing === 'owning' ? pfLife.equity / 50000 : 0; } }
              ];

              var pfGoalsMet = Array.isArray(d.pfGoalsMet) ? d.pfGoalsMet.filter(function (g) { return typeof g === 'string'; }) : [];

              var pfGoal = PF_GOALS.filter(function (g) { return g.id === d.pfGoal; })[0] || null;

              // Readable chips for what a choice will do, before it is chosen.
              var pfEffectChips = function (eff) {
                eff = (eff && typeof eff === 'object') ? eff : {};
                var chips = [];
                var add = function (text, good) { chips.push({ text: text, cls: good === true ? 'text-green-800' : good === false ? 'text-red-700' : 'text-slate-600' }); };
                if (typeof eff.cash === 'number' && eff.cash) add((eff.cash > 0 ? '+' : '−') + fmtMo(eff.cash) + ' ' + t('stem.economicslab.chip_cash', 'cash'), eff.cash > 0);
                if (typeof eff.cashIfInsured === 'number') add(t('stem.economicslab.chip_if_insured', 'if insured:') + ' −' + fmtMo(eff.cashIfInsured), null);
                if (typeof eff.debt === 'number' && eff.debt) add((eff.debt > 0 ? '+' : '−') + fmtMo(eff.debt) + ' ' + t('stem.economicslab.chip_debt', 'debt'), eff.debt < 0);
                if (typeof eff.card === 'number' && eff.card) add((eff.card > 0 ? '+' : '−') + fmtMo(eff.card) + ' ' + t('stem.economicslab.chip_card', 'on card (22% APR)'), eff.card < 0);
                if (typeof eff.loan === 'number' && eff.loan) add('+' + fmtMo(eff.loan) + ' ' + t('stem.economicslab.chip_loan', 'loan (7% APR)'), false);
                if (typeof eff.loanIfInsured === 'number') add(t('stem.economicslab.chip_if_insured', 'if insured:') + ' +' + fmtMo(eff.loanIfInsured) + ' ' + t('stem.economicslab.chip_loan_short', 'loan'), null);
                if (typeof eff.unpaidMonths === 'number' && eff.unpaidMonths) add(eff.unpaidMonths + ' ' + t('stem.economicslab.chip_unpaid', 'months without pay'), false);
                if (typeof eff.salaryNext === 'number' && eff.salaryNext) add('+' + fmtMo(eff.salaryNext) + t('stem.economicslab.chip_pay_next', '/yr pay from next year'), true);
                if (eff.carBuy && typeof eff.carBuy === 'object') add(t('stem.economicslab.chip_car', 'car worth') + ' ' + fmtMo(num(eff.carBuy.value, 0)) + ' (−' + Math.round(num(eff.carBuy.dep, 0) * 100) + '%/yr)', null);
                if (eff.marketCrash === true) add(t('stem.economicslab.chip_crash', 'portfolio drops (more if stock-heavy)'), false);
                if (typeof eff.salary === 'number' && eff.salary) add((eff.salary > 0 ? '+' : '−') + fmtMo(eff.salary) + t('stem.economicslab.chip_per_year', '/yr pay'), eff.salary > 0);
                if (typeof eff.salaryPct === 'number' && eff.salaryPct) add((eff.salaryPct > 0 ? '+' : '') + eff.salaryPct + '% ' + t('stem.economicslab.chip_pay', 'pay'), eff.salaryPct > 0);
                if (typeof eff.invested === 'number' && eff.invested) add('+' + fmtMo(eff.invested) + ' ' + t('stem.economicslab.chip_invested', 'invested'), true);
                if (typeof eff.investedPct === 'number' && eff.investedPct) add(eff.investedPct + '% ' + t('stem.economicslab.chip_portfolio', 'portfolio'), eff.investedPct > 0);
                if (eff.sellAll === true) add(t('stem.economicslab.chip_sell_all', 'sell all investments'), null);
                if (typeof eff.windfallToDebt === 'number') add('+' + fmtMo(eff.windfallToDebt) + ' ' + t('stem.economicslab.chip_debt_first', 'to debt first, rest to cash'), true);
                if (typeof eff.food === 'number' && eff.food) add((eff.food > 0 ? '+' : '−') + fmtMo(eff.food) + t('stem.economicslab.chip_food', '/mo food'), eff.food < 0);
                if (typeof eff.transport === 'number' && eff.transport) add((eff.transport > 0 ? '+' : '−') + fmtMo(eff.transport) + t('stem.economicslab.chip_transport', '/mo transport'), eff.transport < 0);
                if (typeof eff.fun === 'number' && eff.fun) add((eff.fun > 0 ? '+' : '−') + fmtMo(eff.fun) + t('stem.economicslab.chip_fun', '/mo fun'), null);
                if (eff.housing === 'renting' || eff.housing === 'owning' || eff.housing === 'frugal') add(t('stem.economicslab.chip_housing', 'housing:') + ' ' + eff.housing, null);
                if (eff.insurance === true) add(t('stem.economicslab.chip_insured', 'insured (+$100/mo)'), null);
                if (eff.insurance === false) add(t('stem.economicslab.chip_uninsured', 'no insurance'), null);
                if (typeof eff.matchPct === 'number' && eff.matchPct) add(t('stem.economicslab.chip_match', 'employer match up to') + ' ' + eff.matchPct + '%', true);
                if (eff.gamble && typeof eff.gamble === 'object') add(t('stem.economicslab.chip_gamble', 'bet') + ' ' + fmtMo(num(eff.gamble.stake, 0)) + ': ' + Math.round(num(eff.gamble.p, 0) * 100) + '% ' + t('stem.economicslab.chip_chance', 'chance of') + ' ×' + num(eff.gamble.win, 0), null);
                if (typeof eff.happiness === 'number' && eff.happiness) add((eff.happiness > 0 ? '+' : '') + eff.happiness + ' ' + t('stem.economicslab.chip_happiness', 'happiness'), eff.happiness > 0);
                if (typeof eff.credit === 'number' && eff.credit) add((eff.credit > 0 ? '+' : '') + eff.credit + ' ' + t('stem.economicslab.chip_credit', 'credit'), eff.credit > 0);
                if (!chips.length) add(t('stem.economicslab.chip_nothing', 'no immediate money change'), null);
                return chips;
              };

              var pfChoose = function (choice) {
                // Only built-in deck effects are trusted as-is; AI and legacy saved
                // events are clamped to the ranges their prompt promised.
                var eff = pfEvent.source === 'deck' ? choice.effect : E.sanitizeAiLifeEffect(choice.effect);
                var res = E.lifeYear(pfLifeIn, eff, Math.random);
                var nx = res.state, ly = res.ledger;
                var finalCash = nx.cash;
                var netWorth = nx.cash + nx.invested + nx.equity + nx.carValue - nx.debt - nx.card;
                var evTitle = econStr(pfEvent.title, 80) || 'Life event';
                var hist = (Array.isArray(d.pfHistory) ? d.pfHistory : []).slice(-39).concat([{ age: pfAge, cash: finalCash, debt: nx.debt + nx.card, invested: nx.invested, equity: nx.equity, netWorth: netWorth, event: evTitle, choice: econStr(choice.label, 120) }]);
                var recent = (Array.isArray(d.pfDeckRecent) ? d.pfDeckRecent : []).concat(pfEvent.id ? [pfEvent.id] : []).slice(-8);
                // Goal check against the NEW state.
                var nextMet = pfGoalsMet.slice(), newlyMet = null;
                if (pfGoal && nextMet.indexOf(pfGoal.id) === -1) {
                  var nb = E.pfBudget({ salary: nx.salary, housing: nx.housing, food: nx.food, transport: nx.transport, fun: nx.fun, insurance: nx.insurance });
                  var peak = Math.max(num(d.pfDebtPeak, 0), pfDebtAll, nx.debt + nx.card);
                  var reached = pfGoal.id === 'emergency' ? finalCash >= 6 * nb.essentials
                    : pfGoal.id === 'debtfree' ? (peak > 0 && nx.debt + nx.card === 0)
                      : pfGoal.id === 'invest50k' ? nx.invested >= 50000
                        : pfGoal.id === 'nw100k' ? netWorth >= 100000
                          : nx.equity >= 50000 && nx.housing === 'owning';
                  if (reached) { nextMet.push(pfGoal.id); newlyMet = pfGoal; }
                }
                updMany({
                  pfAge: nx.age, pfCash: finalCash, pfDebt: nx.debt, pfInvested: nx.invested, pfSalary: nx.salary, pfHappiness: nx.happiness, pfCredit: nx.credit, pfEquity: nx.equity,
                  pfHousing: nx.housing, pfInsurance: nx.insurance, pfFood: nx.food, pfTransport: nx.transport, pfFun: nx.fun, pfMatch: nx.matchPct,
                  pfCareer: nx.career || (typeof d.pfCareer === 'string' ? d.pfCareer : null),
                  pfCard: nx.card, pfCar: nx.carValue, pfCarDep: nx.carDep, pfRebound: nx.rebound,
                  pfDebtPeak: Math.max(num(d.pfDebtPeak, 0), pfDebtAll, nx.debt + nx.card),
                  pfHistory: hist, pfDeckRecent: recent, pfGoalsMet: nextMet, lifeEvent: null, pfLoading: false,
                  pfLastYear: Object.assign({ event: evTitle, choice: econStr(choice.label, 120) }, ly)
                });
                addXP(15, 'Life Sim: Made a financial decision');
                if (newlyMet) { addXP(25, 'Life Sim: reached a goal'); if (addToast) addToast('🎯 ' + t('stem.economicslab.goal_reached', 'Goal reached:') + ' ' + newlyMet.label, 'success'); }
                if (addToast) addToast((ly.net >= 0 ? '💰 +$' : '📉 −$') + Math.abs(ly.net).toLocaleString() + ' ' + t('stem.economicslab.net_this_year', 'net cash this year') + ' | ' + econStr(choice.label, 60), ly.net >= 0 ? 'success' : 'warning');
                if (announceToSR) announceToSR(t('stem.economicslab.year_done_sr', 'Year complete. Age') + ' ' + nx.age + '. ' + t('stem.economicslab.cash', 'Cash') + ' ' + econFmt(finalCash) + ', ' + t('stem.economicslab.debt', 'Debt') + ' ' + econFmt(nx.debt) + ', ' + t('stem.economicslab.net_worth_label', 'Net worth') + ' ' + econFmt(netWorth) + '.' + (ly.shortfall > 0 ? ' ' + t('stem.economicslab.shortfall_sr', 'Spending ran past income, so the shortfall went on a credit card.') : ''));
                var lesson = econStr(pfEvent.lesson, 400);
                if (lesson && !econGlossaryList.some(function (g) { return g.concept === evTitle; })) upd('econGlossary', econGlossaryList.concat([{ tab: 'Life Sim', concept: evTitle, explanation: lesson }]));
              };

              var pfNextYear = function () {
                var fromDeck = function (note) {
                  var ev = E.pickLifeEvent(pfLifeIn, d.pfDeckRecent, Math.random);
                  updMany({ lifeEvent: Object.assign({ source: 'deck' }, ev), pfLoading: false });
                  if (announceToSR) announceToSR(t('stem.economicslab.new_event_sr', 'New life event:') + ' ' + ev.title + '. ' + ev.description);
                  if (note && addToast) addToast(note, 'info');
                };
                if (pfSource !== 'ai') { fromDeck(); return; }
                upd('pfLoading', Date.now());
                var prompt = 'You are a life simulation game engine (difficulty: ' + (d.econDifficulty || 'medium') + '). The player is ' + pfAge + ' years old, earns $' + Math.round(pfSalary).toLocaleString() + '/year, has $' + Math.round(pfCash).toLocaleString() + ' in savings, $' + Math.round(pfDebt).toLocaleString() + ' in debt, and ' + pfHappiness + '% happiness.\n\nGenerate a realistic random life event with 3 choices. Return ONLY valid JSON:\n{"emoji":"<single emoji>","title":"<short title>","description":"<2-3 sentence scenario>","lesson":"<1-2 sentence financial literacy lesson>","choices":[{"label":"<action description>","effect":{"cash":<number>,"debt":<number>,"salary":<number>,"happiness":<number>,"credit":<number -50 to 50>,"career":<optional string or null>,"insurance":<optional true/false or null>}}]}\n\nEvent categories to rotate through: CAREER, FINANCIAL, HOUSING, HEALTH, EDUCATION, SOCIAL, MARKET. Tailor to the player\'s age. Salary, rent and living costs are paid automatically each year, so effects are only the EXTRA money this event causes. Cash effects -5000 to +10000, salary changes -5000 to +15000, happiness -20 to +20, credit -50 to +50.';
                econAsk(prompt).then(function (result) {
                  try {
                    var ev = econParseJSON(result);
                    var choices = Array.isArray(ev.choices) ? ev.choices.filter(function (c) { return c && typeof c.label === 'string' && c.label.trim(); }).slice(0, 4).map(function (c) { return { label: c.label.trim().slice(0, 120), effect: E.sanitizeAiLifeEffect(c.effect) }; }) : [];
                    if (typeof ev.title !== 'string' || choices.length < 2) throw new Error('bad event');
                    updIf(function (p) { return !p.lifeEvent && num(p.pfAge, 22) === pfAge; }, { lifeEvent: { source: 'ai', id: null, emoji: econStr(ev.emoji, 12) || '🎲', title: econStr(ev.title, 80), description: econStr(ev.description, 500), lesson: econStr(ev.lesson, 400), choices: choices }, pfLoading: false });
                    if (announceToSR) announceToSR(t('stem.economicslab.sr_new_life_event', 'New life event:') + ' ' + econStr(ev.title, 80));
                  } catch (e) { fromDeck(t('stem.economicslab.ai_event_fallback', 'AI event failed, so this one comes from the built-in deck.')); }
                }).catch(function () { fromDeck(t('stem.economicslab.ai_event_fallback', 'AI event failed, so this one comes from the built-in deck.')); });
              };

              var slider = function (key, label, val, min, max, step, onVal, extra) {
                return React.createElement('label', { key: key, className: 'block text-[0.6875rem] font-bold text-slate-700' }, label + ': $' + Math.round(val).toLocaleString() + t('stem.economicslab.per_month_short', '/mo') + (extra ? ' ' + extra : ''),
                  React.createElement('input', { type: 'range', min: min, max: max, step: step, value: val, 'aria-label': label, 'aria-valuetext': '$' + Math.round(val) + ' ' + t('stem.economicslab.per_month_words', 'per month'), onChange: function (e) { onVal(parseFloat(e.target.value)); }, className: 'w-full accent-blue-600' }));
              };

              var budgetLine = function (key, label, val, sign, strong) {
                return React.createElement('div', { key: key, className: 'flex justify-between text-[0.6875rem] py-0.5 ' + (strong ? 'font-bold border-t border-slate-200 mt-1 pt-1' : '') },
                  React.createElement('span', { className: 'text-slate-700' }, label),
                  React.createElement('span', { className: sign > 0 ? 'text-green-800' : sign < 0 ? 'text-red-700' : 'text-slate-800' }, (sign > 0 ? '+' : sign < 0 ? '−' : '') + fmtMo(val)));
              };

              var tx = E.pfTax(pfSalary);

              return React.createElement('div', { className: 'mt-4' },

                // Life event card
                pfEvent ? React.createElement('div', { className: 'bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-5 border border-indigo-200 mb-4 shadow-sm', 'data-economicslab-life-event': 'true' },
                  React.createElement('div', { className: 'flex items-start gap-3 mb-4' },
                    React.createElement('span', { className: 'text-3xl', 'aria-hidden': 'true' }, econStr(pfEvent.emoji, 12) || '🎲'),
                    React.createElement('div', null,
                      React.createElement('div', { className: 'text-[0.625rem] font-bold uppercase tracking-wide text-indigo-700' }, t('stem.economicslab.age_label', 'age') + ' ' + pfAge + ' · ' + (pfEvent.source === 'ai' ? t('stem.economicslab.src_ai', 'AI-generated event') : t('stem.economicslab.src_deck', 'Built-in event'))),
                      React.createElement('h4', { className: 'text-sm font-bold text-slate-800' }, econStr(pfEvent.title, 80) || 'Life Event'),
                      React.createElement('p', { className: 'text-xs text-slate-600 mt-1 leading-relaxed' }, econStr(pfEvent.description, 500)),
                      econStr(pfEvent.lesson, 400) && React.createElement('div', { className: 'mt-2 bg-indigo-100 rounded-lg px-3 py-2 text-[0.6875rem] text-indigo-800 border border-indigo-200' },
                        React.createElement('span', { className: 'font-bold' }, t('stem.economicslab.economics_concept', '📚 Economics Concept: ')),
                        econStr(pfEvent.lesson, 400)))),
                  React.createElement('div', { className: 'grid gap-2' },
                    pfEvent.choices.map(function (choice, ci) {
                      return React.createElement('button', { key: ci, type: 'button', onClick: function () { pfChoose(choice); }, className: 'w-full text-left p-3 rounded-xl border-2 border-indigo-100 hover:border-indigo-400 bg-white hover:bg-indigo-50 transition-all text-xs group' },
                        React.createElement('div', { className: 'font-bold text-slate-700 group-hover:text-indigo-700' }, econStr(choice.label, 120)),
                        React.createElement('div', { className: 'mt-0.5 flex gap-3 flex-wrap text-[0.6875rem]' },
                          pfEffectChips(pfEvent.source === 'deck' ? choice.effect : E.sanitizeAiLifeEffect(choice.effect)).map(function (c, k) { return React.createElement('span', { key: k, className: c.cls }, c.text); })));
                    })),
                  React.createElement('p', { className: 'text-[0.625rem] text-slate-600 italic mt-2 m-0' }, t('stem.economicslab.event_plus_year', 'Choosing also plays out the rest of the year: paychecks, bills, debt payments and investing.'))
                ) : React.createElement('div', { className: 'mb-4' },

                // Next Year / event source (sits where the event card will appear)

                React.createElement('div', { className: 'flex items-center gap-2 flex-wrap mb-2', role: 'group', 'aria-label': t('stem.economicslab.event_source', 'Where life events come from') },
                  React.createElement('span', { className: 'text-[0.6875rem] font-bold text-slate-700' }, t('stem.economicslab.event_source_label', 'Events:')),
                  [{ id: 'deck', label: t('stem.economicslab.src_deck_btn', '📚 Built-in deck (instant)') }, { id: 'ai', label: t('stem.economicslab.src_ai_btn', '✨ AI-generated') }].map(function (o) {
                    var on = pfSource === o.id, dis = o.id === 'ai' && !econAI;
                    return React.createElement('button', { key: o.id, type: 'button', 'aria-pressed': on ? 'true' : 'false', disabled: dis, title: dis ? t('stem.economicslab.offline_mode_title', 'AI is not available in this session. Every simulator still works with its built-in decks.') : undefined, onClick: function () { upd('pfEventSource', o.id); }, className: 'text-[0.6875rem] px-2 py-1 rounded-full border font-bold ' + (on ? 'bg-indigo-700 text-white border-indigo-700' : dis ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-white text-slate-700 border-slate-300') }, o.label);
                  })),

                React.createElement('button', {
                  type: 'button',
                  onClick: pfNextYear,
                  disabled: econBusy(d.pfLoading),
                  className: 'w-full py-4 rounded-2xl text-sm font-bold shadow-lg transition-all ' + (econBusy(d.pfLoading) ? 'bg-slate-300 text-slate-600' : 'bg-indigo-700 text-white hover:bg-indigo-800 hover:shadow-xl')
                }, econBusy(d.pfLoading) ? '⏳ ' + t('stem.economicslab.generating_event', 'Generating life event...') : '✨ ' + t('stem.economicslab.next_year', 'Next Year') + ' (' + t('stem.economicslab.age_label', 'age') + ' ' + (pfAge + 1) + ')')),

                // Stats bar

                React.createElement('div', { className: 'grid grid-cols-5 gap-2 mb-4' },
                  [
                    { label: 'Age', val: pfAge, icon: '🎂', color: 'indigo' },
                    { label: t('stem.economicslab.cash', 'Cash'), val: econFmt(pfCash), icon: '💵', color: pfCash >= 0 ? 'green' : 'red' },
                    { label: t('stem.economicslab.debt', 'Debt'), val: econFmt(pfDebtAll), icon: '💳', color: pfDebtAll > 0 ? 'red' : 'green' },
                    { label: t('stem.economicslab.happiness', 'Happiness'), val: pfHappiness + '%', icon: '❤️', color: pfHappiness > 50 ? 'pink' : 'slate' },
                    { label: t('stem.economicslab.credit', 'Credit'), val: pfLife.credit, icon: '📊', color: pfLife.credit > 700 ? 'green' : pfLife.credit > 580 ? 'amber' : 'red' }
                  ].map(function (s) {
                    return React.createElement('div', { key: s.label, className: 'bg-white rounded-xl p-3 border border-slate-400 text-center' },
                      React.createElement('div', { className: 'text-lg', 'aria-hidden': 'true' }, s.icon),
                      React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 font-bold uppercase tracking-wide' }, s.label),
                      React.createElement('div', { className: 'text-sm font-bold text-' + s.color + '-800' }, s.val));
                  })),

                React.createElement('div', { className: 'text-xs text-slate-600 text-center mb-2' }, (typeof d.pfCareer === 'string' && d.pfCareer ? '💼 ' + econStr(d.pfCareer, 60) + ' | ' : '') + 'Salary: $' + Math.round(pfSalary).toLocaleString() + '/yr | Net Worth: $' + Math.round(pfNetWorth).toLocaleString() + (pfLife.invested > 0 ? ' | 📈 Invested: $' + Math.round(pfLife.invested).toLocaleString() : '') + (pfLife.equity > 0 ? ' | 🏠 Equity: $' + Math.round(pfLife.equity).toLocaleString() : '') + (pfLife.insurance ? ' | 🛡️ Insured' : ' | ⚠️ No Insurance') + (pfLife.card > 0 ? ' | 💳 Card $' + Math.round(pfLife.card).toLocaleString() + ' at 22% APR' : '') + (pfDebt > 0 ? ' | 🏦 Loans $' + Math.round(pfDebt).toLocaleString() + ' at 7% APR' : '') + (pfLife.carValue > 0 ? ' | 🚙 Car: $' + Math.round(pfLife.carValue).toLocaleString() : '') + (pfLife.matchPct > 0 ? ' | 🤝 ' + pfLife.matchPct + '% match' : '')),

                pfCash < 0 && React.createElement('div', { className: 'text-[0.6875rem] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center mb-2', role: 'alert' },
                  t('stem.economicslab.cash_flow_warning', '⚠️ Your cash is negative — you are spending more than you earn. Try cheaper housing, a lower investment %, or paying down debt before it compounds.')),

                (function () {
                  var runway = Math.max(0, pfCash) / Math.max(1, pfBud.essentials);
                  var runwayCls = runway >= 6 ? 'text-green-800 bg-green-50 border-green-200' : runway >= 3 ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-red-700 bg-red-50 border-red-200';
                  return React.createElement('div', { className: 'text-[0.6875rem] text-center rounded-lg border px-3 py-1.5 mb-2 ' + runwayCls },
                    t('stem.economicslab.emergency_fund', '🛟 Emergency fund: ') + runway.toFixed(1) + ' ' + t('stem.economicslab.months_of_expenses', 'months of expenses in cash') + ' — ' + t('stem.economicslab.emergency_fund_target', 'advisors suggest keeping 3–6 months'));
                })(),

                // Life goal
                React.createElement('div', { className: 'bg-white rounded-xl border border-slate-300 p-3 mb-2', 'data-economicslab-life-goal': 'true' },
                  React.createElement('div', { className: 'flex items-center gap-2 flex-wrap mb-1' },
                    React.createElement('span', { className: 'text-[0.6875rem] font-bold text-slate-800' }, t('stem.economicslab.goal_pick', '🎯 Your life goal:')),
                    React.createElement('select', { value: pfGoal ? pfGoal.id : '', 'aria-label': t('stem.economicslab.goal_pick_aria', 'Choose a life goal'), onChange: function (e) { upd('pfGoal', e.target.value || null); }, className: 'text-[0.6875rem] border border-slate-500 rounded-lg px-2 py-1 bg-white text-slate-800' },
                      React.createElement('option', { value: '' }, t('stem.economicslab.goal_none', 'Pick a goal…')),
                      PF_GOALS.map(function (g) { return React.createElement('option', { key: g.id, value: g.id }, (pfGoalsMet.indexOf(g.id) !== -1 ? '✅ ' : '') + g.label); }))),
                  pfGoal && (function () {
                    var met = pfGoalsMet.indexOf(pfGoal.id) !== -1;
                    var pct = met ? 100 : Math.round(Math.max(0, Math.min(1, pfGoal.progress())) * 100);
                    return React.createElement('div', null,
                      React.createElement('div', { className: 'h-3 rounded-full bg-slate-200 overflow-hidden', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': pfGoal.label },
                        React.createElement('div', { style: { width: pct + '%', height: '100%', background: met ? '#15803d' : '#2563eb' } })),
                      React.createElement('div', { className: 'text-[0.6875rem] mt-1 ' + (met ? 'text-green-800 font-bold' : 'text-slate-600') }, met ? t('stem.economicslab.goal_done', '🎉 Goal reached! Pick another, or keep going.') : pct + '% ' + t('stem.economicslab.goal_of_way', 'of the way there')));
                  })()),

                // Monthly budget: the levers students actually control
                React.createElement('div', { className: 'bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl p-3 border border-sky-200 mb-2', 'data-economicslab-budget': 'true' },
                  React.createElement('h4', { className: 'text-[0.6875rem] font-bold text-sky-900 mb-2 m-0' }, t('stem.economicslab.budget_title', '📋 Your monthly budget')),
                  React.createElement('div', { className: 'grid grid-cols-2 gap-3' },
                    React.createElement('div', { className: 'space-y-2' },
                      slider('food', t('stem.economicslab.food', 'Food'), pfLife.food, 150, 1200, 25, function (v) { upd('pfFood', v); }),
                      slider('transport', t('stem.economicslab.transport', 'Transport'), pfLife.transport, 0, 1000, 25, function (v) { upd('pfTransport', v); }),
                      slider('fun', t('stem.economicslab.pie_fun', 'Fun'), pfLife.fun, 0, 800, 25, function (v) { upd('pfFun', v); }, pfLife.fun >= 250 ? t('stem.economicslab.fun_up', '(happier)') : pfLife.fun < 50 ? t('stem.economicslab.fun_down', '(less happy)') : ''),
                      (pfDebtAll > 0 || pfLife.extraDebtPay > 0) && slider('extra', t('stem.economicslab.extra_debt_2', 'Extra debt payment (card first)'), pfLife.extraDebtPay, 0, 1500, 25, function (v) { upd('pfExtraDebt', v); })),
                    React.createElement('div', null,
                      budgetLine('gross', t('stem.economicslab.bl_gross', 'Gross pay'), pfBud.gross, 1),
                      budgetLine('tax', t('stem.economicslab.bl_taxes', 'Taxes') + ' (' + (pfBud.taxRate * 100).toFixed(0) + '%)', pfBud.taxes, -1),
                      budgetLine('take', t('stem.economicslab.take_home', 'Take-home'), pfBud.takeHome, 0, true),
                      budgetLine('housing', t('stem.economicslab.pie_housing', 'Housing'), pfBud.housing, -1),
                      budgetLine('living', t('stem.economicslab.bl_living', 'Food, transport & fun'), pfBud.food + pfBud.transport + pfBud.fun, -1),
                      budgetLine('other', t('stem.economicslab.bl_other', 'Utilities, phone & clothes'), pfBud.other, -1),
                      pfBud.insurance > 0 && budgetLine('ins', t('stem.economicslab.pie_insurance', 'Insurance'), pfBud.insurance, -1),
                      pfBud.invest > 0 && budgetLine('inv', t('stem.economicslab.pie_investing', 'Investing'), pfBud.invest, -1),
                      pfBud.debtPay > 0 && budgetLine('debt', t('stem.economicslab.bl_debt', 'Debt payments'), pfBud.debtPay, -1),
                      budgetLine('left', pfBud.leftover >= 0 ? t('stem.economicslab.bl_left', 'Left over (to savings)') : t('stem.economicslab.bl_over', 'Over budget (goes on a card)'), pfBud.leftover, pfBud.leftover >= 0 ? 1 : -1, true))),
                  React.createElement('p', { className: 'text-[0.625rem] text-slate-600 mt-2 m-0' }, t('stem.economicslab.tax_note_1', 'Taxes are simplified: 7.65% payroll, 2024 federal brackets for a single filer, and about 4% state. Your next dollar of pay is taxed about') + ' ' + Math.round(tx.marginal * 100) + '%' + t('stem.economicslab.tax_note_2', ', but only the dollars ABOVE each bracket threshold pay the higher rates, so a raise never lowers your take-home pay.'))),

                // Itemized "where did the money go" card for the last simulated year
                d.pfLastYear && typeof d.pfLastYear === 'object' && (function () {
                  var ly = d.pfLastYear;
                  var rows = [];
                  if (typeof ly.takeHome === 'number') rows.push([t('stem.economicslab.flow_take_home', 'Take-home pay (after taxes of') + ' ' + econFmt(ly.taxes) + ')', ly.takeHome, false]);
                  rows.push([econStr(ly.event, 80) + ' → ' + econStr(ly.choice, 120), num(ly.eventCash, 0), false]);
                  rows.push([t('stem.economicslab.flow_housing', 'Housing'), -num(ly.housing, 0), false]);
                  if (num(ly.living, 0) > 0) rows.push([t('stem.economicslab.flow_living', 'Food, transport & fun'), -ly.living, false]);
                  if (num(ly.other, 0) > 0) rows.push([t('stem.economicslab.flow_other', 'Utilities, phone & clothes'), -ly.other, false]);
                  if (num(ly.insurance, 0) > 0) rows.push([t('stem.economicslab.flow_insurance', 'Health insurance'), -ly.insurance, false]);
                  if (num(ly.invested, 0) > 0) rows.push([t('stem.economicslab.flow_invested', 'Moved into investments (still yours!)'), -ly.invested, false]);
                  if (num(ly.debtPaid, 0) > 0) rows.push([t('stem.economicslab.flow_debt_paid', 'Debt payments'), -ly.debtPaid, false]);
                  if (num(ly.shortfall, 0) > 0) rows.push([t('stem.economicslab.flow_shortfall', 'Shortfall put on a credit card'), ly.shortfall, false]);
                  if (num(ly.growth, 0) !== 0) rows.push([t('stem.economicslab.flow_growth', 'Portfolio growth (inside investments)'), ly.growth, true]);
                  if (num(ly.match, 0) > 0) rows.push([t('stem.economicslab.flow_match', 'Employer match (inside investments)'), ly.match, true]);
                  if (num(ly.crashLoss, 0) > 0) rows.push([t('stem.economicslab.flow_crash', 'Market crash loss (inside investments)'), -ly.crashLoss, true]);
                  if (num(ly.carDrop, 0) > 0) rows.push([t('stem.economicslab.flow_car', 'Car lost value (depreciation)'), -ly.carDrop, true]);
                  if (num(ly.debtInterest, 0) > 0) rows.push([t('stem.economicslab.flow_debt_interest_2', 'Debt interest added (card 22%, loans 7%)'), -ly.debtInterest, true]);
                  return React.createElement('div', { className: 'bg-white rounded-xl border border-slate-400 p-3 mb-2' },
                    React.createElement('h4', { className: 'text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wide mb-1' }, t('stem.economicslab.last_year_flow', '🧾 Last year\'s money flow')),
                    rows.map(function (r, ri) {
                      return React.createElement('div', { key: ri, className: 'flex justify-between text-[0.6875rem] py-0.5 border-b border-slate-50' },
                        React.createElement('span', { className: 'text-slate-600 flex-1 pr-2' }, r[0] + (r[2] ? ' *' : '')),
                        React.createElement('span', { className: (r[1] >= 0 ? 'text-green-800' : 'text-red-700') + ' font-bold' }, (r[1] >= 0 ? '+' : '−') + '$' + Math.abs(Math.round(r[1])).toLocaleString()));
                    }),
                    React.createElement('div', { className: 'flex justify-between text-[0.6875rem] pt-1 font-bold' },
                      React.createElement('span', { className: 'text-slate-700' }, t('stem.economicslab.flow_net', 'Net cash change')),
                      React.createElement('span', { className: num(ly.net, 0) >= 0 ? 'text-green-800' : 'text-red-600' }, (num(ly.net, 0) >= 0 ? '+' : '−') + '$' + Math.abs(Math.round(num(ly.net, 0))).toLocaleString())),
                    num(ly.raise, 0) > 0 && React.createElement('p', { className: 'text-[0.625rem] text-slate-600 m-0 mt-1' }, t('stem.economicslab.flow_raise', '📈 Next year your pay rises') + ' ' + econFmt(ly.raise) + ' ' + t('stem.economicslab.flow_raise_2', '(2% for experience).')),
                    React.createElement('p', { className: 'text-[0.625rem] text-slate-500 italic mt-1 m-0' }, t('stem.economicslab.flow_footnote', '* not part of cash — growth compounds inside your portfolio; interest compounds inside your debt.')));
                })(),

                // Retirement check once it is on the horizon
                pfAge >= 55 && (function () {
                  var yearlySpend = (pfBud.essentials + pfBud.fun) * 12;
                  var target = yearlySpend * 25;
                  var have = Math.max(0, pfCash) + pfLife.invested;
                  var pct = Math.round(Math.min(1, have / Math.max(1, target)) * 100);
                  return React.createElement('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2 text-[0.6875rem] text-amber-900' },
                    React.createElement('div', { className: 'font-bold mb-1' }, t('stem.economicslab.retire_title', '🏖️ Retirement check (the 25× rule of thumb)')),
                    t('stem.economicslab.retire_body_1', 'Spending') + ' ' + econFmt(yearlySpend) + t('stem.economicslab.retire_body_2', '/yr means a target of about') + ' ' + econFmt(target) + ' ' + t('stem.economicslab.retire_body_3', 'saved and invested (withdrawing ~4% a year). You have') + ' ' + econFmt(have) + ' — ' + pct + '%.');
                })(),

                // Housing decision

                React.createElement('div', { className: 'bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200 mt-3 mb-1' },
                  React.createElement('h4', { className: 'text-[0.6875rem] font-bold text-orange-700 mb-2' }, t('stem.economicslab.housing_strategy', '🏠 Housing Strategy')),
                  React.createElement('div', { className: 'flex gap-2' },
                    [
                      { id: 'renting', label: t('stem.economicslab.rent', '🏢 Rent'), desc: t('stem.economicslab.lower_monthly_cost_flexibility', 'Lower monthly cost, flexibility'), cost: '-$1,000/mo' },
                      { id: 'owning', label: t('stem.economicslab.own', '🏠 Own'), desc: t('stem.economicslab.build_equity_but_mortgage_maintenance', 'Build equity, but mortgage + maintenance'), cost: '-$1,800/mo · $20K down' },
                      { id: 'frugal', label: t('stem.economicslab.roommate', '🛋️ Roommate'), desc: t('stem.economicslab.cheapest_option_save_more', 'Cheapest option, save more'), cost: '-$500/mo' }
                    ].map(function (hh) {
                      return React.createElement('button', {
                        key: hh.id, type: 'button', 'aria-pressed': pfLife.housing === hh.id ? 'true' : 'false',
                        onClick: function () {
                          // Buying needs a down payment; selling returns equity minus selling costs.
                          var sw = E.pfSwitchHousing(pfLifeIn, hh.id);
                          if (!sw.ok) { if (sw.reason === 'down' && addToast) addToast(t('stem.economicslab.need_down', 'Buying needs a $20,000 down payment in cash. You have') + ' ' + econFmt(sw.have) + '.', 'error'); return; }
                          updMany({ pfHousing: sw.patch.housing, pfCash: sw.patch.cash, pfEquity: sw.patch.equity });
                          if (sw.sold > 0 && addToast) addToast(t('stem.economicslab.sold_home', 'You sold your home: equity after 6% selling costs =') + ' ' + econFmt(sw.sold), 'info');
                        },
                        className: 'flex-1 p-2 rounded-lg text-center transition-all border-2 ' + (pfLife.housing === hh.id ? 'border-orange-400 bg-orange-100' : 'border-slate-200 bg-white hover:border-orange-600')
                      },
                        React.createElement('div', { className: 'text-[0.6875rem] font-bold text-slate-700' }, hh.label),
                        React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, hh.desc),
                        React.createElement('div', { className: 'text-[0.6875rem] font-bold text-orange-700 mt-1' }, hh.cost));
                    })),
                  React.createElement('div', { className: 'text-[0.6875rem] text-orange-700 mt-2 bg-white rounded-lg p-2 border border-orange-100' },
                    pfLife.housing === 'renting' && '📚 Renting means paying a landlord monthly. Pros: flexibility to move, no maintenance costs, lower upfront cost. Cons: no equity buildup, rent may increase annually, no tax deductions.',
                    pfLife.housing === 'owning' && '📚 Homeownership builds equity (ownership stake). Your mortgage payment partly goes to principal (equity) and partly to interest (bank profit). Pros: equity buildup, tax deductions, stable payments. Cons: maintenance, property tax, less flexibility.',
                    pfLife.housing === 'frugal' && '📚 Sharing housing dramatically cuts your largest expense. The "Pay Yourself First" principle: living below your means lets you invest the difference. Many millionaires built wealth by keeping housing costs under 25% of income.')),

                // Investment allocation

                React.createElement('div', { className: 'bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200 mt-3 mb-3' },
                  React.createElement('h4', { className: 'text-[0.6875rem] font-bold text-green-800 mb-2' }, t('stem.economicslab.investment_allocation_of_annual_salary', '📊 Investment Allocation (% of annual salary invested)')),
                  React.createElement('div', { className: 'flex items-center gap-3' },
                    React.createElement('input', {
                      type: 'range', 'aria-valuetext': pfLife.investPct + '% of salary', 'aria-label': t('stem.economicslab.investment_percent_of_salary', 'Investment percent of salary'), min: 0, max: 50, value: pfLife.investPct,
                      onChange: function (e) { upd('pfInvestPct', parseInt(e.target.value, 10)); },
                      className: 'flex-1 accent-green-500'
                    }),
                    React.createElement('span', { className: 'text-xs font-bold text-green-800 w-12 text-right' }, pfLife.investPct + '%'),
                    React.createElement('span', { className: 'text-[0.6875rem] text-slate-600' }, '$' + Math.round(pfSalary * pfLife.investPct / 100).toLocaleString() + '/yr')),
                  React.createElement('div', { className: 'flex gap-1 mt-2' },
                    ['Conservative (Bonds)', 'Balanced (60/40)', 'Aggressive (Stocks)', 'Speculative (Crypto)'].map(function (type) {
                      var short = type.split(' ')[0];
                      return React.createElement('button', {
                        key: type, type: 'button', 'aria-pressed': pfLife.investType === short ? 'true' : 'false',
                        onClick: function () { upd('pfInvestType', short); },
                        className: 'flex-1 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-all ' + (pfLife.investType === short ? 'bg-green-700 text-white shadow-sm' : 'bg-white text-slate-600 border border-green-200 hover:border-green-400')
                      }, type);
                    })),
                  pfLife.investPct > 0 && !pfLife.investType && React.createElement('div', { className: 'mt-2 text-[0.6875rem] text-amber-800' }, t('stem.economicslab.pick_invest_type', 'Pick a mix above. Until you do, new money is invested Balanced (60/40).')),
                  pfLife.matchPct > 0 && pfLife.investPct < pfLife.matchPct && React.createElement('div', { className: 'mt-2 text-[0.6875rem] text-amber-800 font-bold' }, '🤝 ' + t('stem.economicslab.match_unclaimed', 'You are leaving free money on the table: invest at least') + ' ' + pfLife.matchPct + '% ' + t('stem.economicslab.match_unclaimed_2', 'to get the full employer match.')),
                  pfLife.investPct > 0 && pfLife.investType && React.createElement('div', { className: 'mt-2 text-[0.6875rem] text-green-800 bg-white rounded-lg p-2 border border-green-100' },
                    pfLife.investType === 'Conservative' && '📚 Bonds are low-risk, low-return (~3-5% annual). Best for capital preservation and stable income. Much calmer than stocks, but after inflation they grow slowly.',
                    pfLife.investType === 'Balanced' && '📚 A 60/40 stock/bond portfolio balances growth with stability (~7-8% avg). This is the classic "set and forget" strategy recommended by most financial advisors.',
                    pfLife.investType === 'Aggressive' && '📚 All-stock portfolios have averaged ~10%/yr but swing a lot: a bad year here can lose about 19%, and real stocks fell 37% in 2008. Best when you\'re young and have time to recover.',
                    pfLife.investType === 'Speculative' && '📚 Speculative assets have fat tails: here a single year can double your money or wipe out 60% of it, and the AVERAGE is lower than plain stocks. Most advisors recommend under 5% of a portfolio.')),

                // History log

                Array.isArray(d.pfHistory) && d.pfHistory.length > 0 && React.createElement('div', { className: 'mt-4 bg-white rounded-xl border border-slate-400 p-3 max-h-40 overflow-y-auto', tabIndex: 0, role: 'region', 'aria-label': t('stem.economicslab.life_history', '📜 Life History') },
                  React.createElement('h4', { className: 'text-xs font-bold text-slate-600 mb-2' }, t('stem.economicslab.life_history', '📜 Life History')),
                  d.pfHistory.filter(function (hh) { return hh && typeof hh === 'object'; }).slice().reverse().map(function (hh, hi) {
                    var nw = typeof hh.netWorth === 'number' ? hh.netWorth : num(hh.cash, 0) - num(hh.debt, 0);
                    return React.createElement('div', { key: hi, className: 'flex justify-between text-[0.6875rem] py-1 border-b border-slate-50' },
                      React.createElement('span', { className: 'text-slate-600' }, 'Age ' + num(hh.age, 0)),
                      React.createElement('span', { className: 'text-slate-600 flex-1 px-2 truncate' }, econStr(hh.event, 80) + ' → ' + econStr(hh.choice, 120)),
                      React.createElement('span', { className: (nw >= 0 ? 'text-green-800' : 'text-red-700') + ' font-bold' }, econFmt(nw)));
                  })),

                // Reset button

                React.createElement('button', {
                  type: 'button',
                  onClick: function () { updMany({ pfAge: 22, pfCash: 2000, pfDebt: 0, pfSalary: 35000, pfHappiness: 70, pfCredit: 650, pfCareer: null, pfInsurance: false, pfHistory: [], lifeEvent: null, pfEquity: 0, pfInvested: 0, pfHousing: 'renting', pfInvestPct: 0, pfInvestType: null, pfLastYear: null, pfFood: 400, pfTransport: 300, pfFun: 150, pfExtraDebt: 0, pfMatch: 0, pfDebtPeak: 0, pfDeckRecent: [], pfLoading: false, pfCard: 0, pfCar: 0, pfCarDep: 0.15, pfRebound: false }); if (addToast) addToast('♻ Starting over at age 22!', 'info'); },
                  className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-400'
                }, t('stem.economicslab.new_life', '♻ New Life'))

              );

            })(),



            econTab === 'stockMarket' && React.createElement('div', { className: 'mt-4' },

              (function () {

                // ── Trading floor ──
                // The classic market and every "next day" run locally
                // (ECON_ENGINE.stockDay: market moves × beta + company noise +
                // news). AI can theme a market and write the news when present.

                var round2 = function (v) { return Math.round(v * 100) / 100; };

                var smSource = econAI && d.smNewsSource === 'ai' ? 'ai' : 'deck';

                var openMarket = function (companies, mode) {
                  var basePrices = {};
                  companies.forEach(function (c) { basePrices[c.ticker] = c.price; });
                  updMany({ smCompanies: companies, smBaseline: basePrices, smCash: 10000, smPortfolio: {}, smCost: {}, smRealized: 0, smDay: 0, smSelected: 0, smNewsEvent: null, smLoading: false, smMode: mode });
                  if (addToast) addToast('📈 ' + t('stem.economicslab.market_open', 'Market open! Start trading.'), 'success');
                  if (announceToSR) announceToSR(t('stem.economicslab.market_open_sr', 'Stock market simulation open with') + ' ' + companies.length + ' ' + t('stem.economicslab.companies_word', 'companies') + '.');
                };

                if (smCompanies.length === 0) {
                  return React.createElement('div', { className: 'text-center py-6' },
                    React.createElement('div', { className: 'text-5xl mb-3', 'aria-hidden': 'true' }, '📈'),
                    React.createElement('h3', { className: 'text-lg font-bold text-slate-800 mb-2' }, t('stem.economicslab.create_your_market', 'Create Your Market')),
                    React.createElement('p', { className: 'text-xs text-slate-600 mb-3 max-w-md mx-auto' }, t('stem.economicslab.market_intro', 'You start with $10,000. Buy and sell shares of five fictional companies, day by day, and see whether your trading can beat simply holding everything.')),
                    React.createElement('button', {
                      type: 'button',
                      onClick: function () { openMarket(E.classicMarket(), 'classic'); },
                      className: 'w-full max-w-md py-3 rounded-xl text-sm font-bold shadow-lg bg-green-700 text-white hover:bg-green-800 mb-3'
                    }, t('stem.economicslab.open_classic_market', '🏛️ Open the classic market (5 companies, 5 sectors)')),
                    econAI && React.createElement('div', { className: 'max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-3' },
                      React.createElement('p', { className: 'text-[0.6875rem] text-slate-600 mb-2 m-0' }, t('stem.economicslab.describe_what_kind_of_market_you_want_', 'Describe what kind of market you want to trade in. AI will generate 5 fictional companies with realistic financials.')),
                      React.createElement('input', {
                        type: 'text',
                        'aria-label': t('stem.economicslab.market_theme', 'Market theme'),
                        value: econStr(d.smInput, 200),
                        onChange: function (e) { upd('smInput', e.target.value); },
                        placeholder: t('stem.economicslab.e_g_renewable_energy_startups_gaming_c', 'e.g. "renewable energy startups", "gaming companies", "space industry", or leave blank for mixed...'),
                        className: 'w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-xs focus:border-green-400 outline-none mb-2'
                      }),
                      React.createElement('button', {
                        type: 'button',
                        onClick: function () {
                          upd('smLoading', Date.now());
                          var theme = econStr(d.smInput, 200).trim() || 'diverse mix of tech, energy, healthcare, food, and finance';
                          var prompt = 'You are a stock market simulator for students. Generate 5 fictional publicly traded companies for a market themed around: "' + theme + '".\n\nReturn ONLY valid JSON:\n{"companies":[{"name":"<company name>","ticker":"<3-4 letter ticker>","price":<number 10-200>,"sector":"<sector>","description":"<1 sentence>"}]}\n\nMake company names creative and realistic. Prices should vary. Include diverse sectors within the theme.';
                          econAsk(prompt).then(function (result) {
                            try {
                              var parsed = econParseJSON(result);
                              var colors = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6'];
                              var seen = {};
                              var companies = (Array.isArray(parsed.companies) ? parsed.companies : []).filter(function (c) { return c && typeof c.ticker === 'string' && c.ticker.trim(); }).slice(0, 5).map(function (c, ci) {
                                var tk = c.ticker.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) || ('CO' + ci);
                                while (seen[tk]) tk = tk + ci;
                                seen[tk] = true;
                                var pr = Math.round(E.clamp(num(c.price, 50), 5, 500) * 100) / 100;
                                return { name: econStr(c.name, 60) || tk, ticker: tk, price: pr, history: [pr * 0.97, pr * 0.99, pr * 0.98, pr], sector: econStr(c.sector, 40) || 'Mixed', color: colors[ci % 5], description: econStr(c.description, 200), beta: 1, vol: 0.013, drift: 0 };
                              });
                              if (companies.length < 2) throw new Error('too few companies');
                              openMarket(companies, 'ai');
                            } catch (err) { upd('smLoading', false); if (addToast) addToast(t('stem.economicslab.market_ai_failed', 'AI could not build that market. Try again, or open the classic market.'), 'error'); }
                          }).catch(function () { upd('smLoading', false); if (addToast) addToast(t('stem.economicslab.market_ai_failed', 'AI could not build that market. Try again, or open the classic market.'), 'error'); });
                        },
                        disabled: econBusy(d.smLoading),
                        className: 'w-full py-2 rounded-xl text-xs font-bold ' + (econBusy(d.smLoading) ? 'bg-slate-300 text-slate-600' : 'bg-slate-800 text-white')
                      }, econBusy(d.smLoading) ? '⏳ ' + t('stem.economicslab.ai_generating_companies', 'AI generating companies...') : '✨ ' + t('stem.economicslab.ai_theme_market', 'AI: build a themed market'))));
                }

                var co = smCompanies[smSelected] || smCompanies[0];

                var held = num(smPortfolio[co.ticker], 0);

                var basisOf = function (c) { var h = num(smPortfolio[c.ticker], 0); return typeof smCost[c.ticker] === 'number' && isFinite(smCost[c.ticker]) ? smCost[c.ticker] : h * c.price; };

                var prevPrice = function (c) { return Array.isArray(c.history) && c.history.length > 1 ? num(c.history[c.history.length - 2], c.price) : c.price; };

                // Buys add to cost basis; sells remove shares at the AVERAGE cost,
                // so "realized profit" is what the sale actually earned.
                var trade = function (c, qty) {
                  var h = num(smPortfolio[c.ticker], 0);
                  var port = Object.assign({}, smPortfolio), cost = Object.assign({}, smCost);
                  if (qty > 0) {
                    var total = round2(c.price * qty);
                    if (smCash + 1e-9 < total) { if (addToast) addToast(t('stem.economicslab.need_cash', 'Not enough cash: need') + ' $' + total.toFixed(2) + ' (' + t('stem.economicslab.have_cash', 'have') + ' $' + smCash.toFixed(2) + ')', 'error'); return; }
                    cost[c.ticker] = round2(basisOf(c) + total);
                    port[c.ticker] = h + qty;
                    updMany({ smCash: round2(smCash - total), smPortfolio: port, smCost: cost });
                    if (addToast) addToast(t('stem.economicslab.bought', 'Bought') + ' ' + qty + ' ' + c.ticker + ' @ $' + c.price.toFixed(2), 'success');
                  } else {
                    var n = Math.min(h, -qty);
                    if (n <= 0) { if (addToast) addToast(t('stem.economicslab.no_shares', 'No shares to sell!'), 'error'); return; }
                    var avg = h > 0 ? basisOf(c) / h : 0;
                    var gain = round2((c.price - avg) * n);
                    port[c.ticker] = h - n;
                    cost[c.ticker] = round2(avg * port[c.ticker]);
                    if (port[c.ticker] <= 0) { delete port[c.ticker]; delete cost[c.ticker]; }
                    updMany({ smCash: round2(smCash + c.price * n), smPortfolio: port, smCost: cost, smRealized: round2(num(d.smRealized, 0) + gain) });
                    if (addToast) addToast(t('stem.economicslab.sold', 'Sold') + ' ' + n + ' ' + c.ticker + ' @ $' + c.price.toFixed(2) + ' (' + (gain >= 0 ? '+' : '−') + '$' + Math.abs(gain).toFixed(2) + ')', gain >= 0 ? 'success' : 'info');
                  }
                  addXP(5, 'Stock Market: Executed trade');
                };

                var buyIndex = function () {
                  var port = Object.assign({}, smPortfolio), cost = Object.assign({}, smCost), cash = smCash, bought = 0;
                  var each = smCash / smCompanies.length;
                  smCompanies.forEach(function (c) {
                    var n = Math.floor(each / c.price);
                    if (n <= 0) return;
                    var total = round2(n * c.price);
                    cost[c.ticker] = round2(basisOf(c) + total);
                    port[c.ticker] = num(port[c.ticker], 0) + n;
                    cash = round2(cash - total); bought += n;
                  });
                  if (!bought) { if (addToast) addToast(t('stem.economicslab.index_no_cash', 'Not enough cash to buy a share of every company.'), 'error'); return; }
                  updMany({ smCash: cash, smPortfolio: port, smCost: cost });
                  addXP(5, 'Stock Market: bought the index');
                  if (addToast) addToast('🧺 ' + t('stem.economicslab.index_bought', 'Spread your cash evenly across every company.'), 'success');
                };

                // True while the market a request was made for is still the one on screen.
                var sameMarket = function (p) { return num(p.smDay, 0) === smDay && Array.isArray(p.smCompanies) && p.smCompanies.length === smCompanies.length && p.smCompanies.every(function (c, i) { return c && c.ticker === smCompanies[i].ticker; }); };

                var advance = function (days, guarded) {
                  var write = guarded ? function (o) { updIf(sameMarket, o); } : updMany;
                  var cos = smCompanies, lastNews = null, dayN = smDay, gl = econGlossaryList.slice(), newsLog = [];
                  for (var i = 0; i < days; i++) {
                    var news = E.stockNewsPick(cos, Math.random);
                    var step = E.stockDay(cos, news, Math.random);
                    cos = step.companies; dayN += 1;
                    if (news) {
                      lastNews = { headline: news.headline, analysis: news.analysis, lesson: news.lesson, impact: step.maxImpact || news.market, day: dayN };
                      newsLog.push({ day: dayN, headline: news.headline });
                      if (!gl.some(function (g) { return g.concept === news.headline; })) gl.push({ tab: 'Stock Market', concept: news.headline, explanation: news.lesson });
                    }
                  }
                  write({ smCompanies: cos, smDay: dayN, smNewsLog: newsLog.slice(-5), smNewsEvent: lastNews || { headline: t('stem.economicslab.quiet_day', 'A quiet day: no major news'), analysis: t('stem.economicslab.quiet_day_2', 'Prices still wiggled. Most daily moves are noise, not signals.'), lesson: '', impact: 0, day: dayN }, econGlossary: gl, smLoading: false });
                  addXP(2 * days, 'Stock Market: simulated trading days');
                  if (announceToSR) announceToSR(t('stem.economicslab.day_word', 'Day') + ' ' + dayN + '. ' + (lastNews ? lastNews.headline : t('stem.economicslab.quiet_day', 'A quiet day: no major news')));
                };

                var advanceAI = function () {
                  upd('smLoading', Date.now());
                  var prompt = 'You are a financial news AI (difficulty: ' + (d.econDifficulty || 'medium') + ') for an educational stock market simulator. Generate a market news event. Currently tracking: ' + smCompanies.map(function (c) { return c.ticker + ' (' + c.name + ', ' + c.sector + ') @ $' + c.price.toFixed(2); }).join(', ') + '.\n\nReturn ONLY valid JSON:\n{"headline":"<breaking news headline>","analysis":"<1-2 sentence market analysis>","lesson":"<1-2 sentence investing concept>","impacts":[{"ticker":"<TICKER>","change":<decimal between -0.15 and 0.15>}]}\n\nGenerate realistic business news. Impact 1-3 companies.';
                  econAsk(prompt).then(function (result) {
                    try {
                      var parsed = econParseJSON(result);
                      if (typeof parsed.headline !== 'string') throw new Error('no headline');
                      var impacts = {};
                      (Array.isArray(parsed.impacts) ? parsed.impacts : []).forEach(function (im) { if (im && typeof im.ticker === 'string') impacts[im.ticker.trim().toUpperCase()] = E.clamp(num(im.change, 0), -0.15, 0.15); });
                      var step = E.stockDay(smCompanies, null, Math.random);
                      var maxImpact = 0;
                      var cos = step.companies.map(function (c) {
                        var im = num(impacts[c.ticker], 0);
                        if (Math.abs(im) > Math.abs(maxImpact)) maxImpact = im;
                        if (!im) return c;
                        var np = Math.max(1, round2(c.price * (1 + im)));
                        var hh = c.history.slice(0, -1).concat([np]);
                        return Object.assign({}, c, { price: np, history: hh });
                      });
                      var lesson = econStr(parsed.lesson, 400), headline = econStr(parsed.headline, 160);
                      var gl = econGlossaryList.slice();
                      if (lesson && !gl.some(function (g) { return g.concept === headline; })) gl.push({ tab: 'Stock Market', concept: headline, explanation: lesson });
                      updIf(sameMarket, { smCompanies: cos, smDay: smDay + 1, smNewsLog: [], smNewsEvent: { headline: headline, analysis: econStr(parsed.analysis, 400), lesson: lesson, impact: maxImpact, day: smDay + 1 }, econGlossary: gl, smLoading: false });
                      if (announceToSR) announceToSR(t('stem.economicslab.sr_market_news', 'Market news:') + ' ' + headline);
                      addXP(2, 'Stock Market: simulated a trading day');
                    } catch (e) { advance(1, true); if (addToast) addToast(t('stem.economicslab.ai_news_fallback', 'AI news failed, so today used the built-in news deck.'), 'info'); }
                  }).catch(function () { advance(1, true); if (addToast) addToast(t('stem.economicslab.ai_news_fallback', 'AI news failed, so today used the built-in news deck.'), 'info'); });
                };

                var news = (d.smNewsEvent && typeof d.smNewsEvent === 'object') ? d.smNewsEvent : null;

                var chg = co.price / Math.max(0.01, prevPrice(co)) - 1;

                return React.createElement('div', null,

                  React.createElement('div', { className: 'flex gap-2 mb-3 flex-wrap' },
                    smCompanies.map(function (c, ci) {
                      var up = c.price >= prevPrice(c);
                      return React.createElement('button', {
                        key: c.ticker, type: 'button', 'aria-pressed': c === co ? 'true' : 'false',
                        onClick: function () { upd('smSelected', ci); },
                        className: 'flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all border-2 ' + (c === co ? 'text-white shadow-md' : 'bg-slate-50 text-slate-700 border-slate-200'),
                        style: c === co ? { background: ecoBarBg(typeof c.color === 'string' ? c.color : '#3b82f6'), borderColor: ecoBarBg(typeof c.color === 'string' ? c.color : '#3b82f6') } : {}
                      }, c.ticker + ' $' + c.price.toFixed(0) + ' ' + (up ? '▲' : '▼'));
                    })),

                  React.createElement('div', { className: 'bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-3 border border-slate-400 mb-3' },
                    React.createElement('div', { className: 'flex justify-between items-center gap-2' },
                      React.createElement('div', null,
                        React.createElement('h4', { className: 'text-sm font-bold text-slate-800' }, econStr(co.name, 60) + ' (' + co.ticker + ')'),
                        React.createElement('span', { className: 'text-[0.6875rem] text-slate-600' }, econStr(co.sector, 40) + (co.description ? ' — ' + econStr(co.description, 200) : '') + (typeof co.beta === 'number' && d.smMode === 'classic' ? ' · β ' + co.beta.toFixed(1) : ''))),
                      React.createElement('div', { className: 'text-right' },
                        React.createElement('div', { className: 'text-lg font-bold text-slate-800' }, '$' + co.price.toFixed(2)),
                        React.createElement('div', { className: 'text-[0.6875rem] font-bold ' + (chg >= 0 ? 'text-green-800' : 'text-red-700') }, (chg >= 0 ? '▲ +' : '▼ ') + (chg * 100).toFixed(1) + '%'),
                        React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, t('stem.economicslab.held_word', 'Held') + ': ' + held + ' (' + econFmt(held * co.price) + ')' + (held > 0 ? ' · ' + t('stem.economicslab.avg_cost', 'avg cost') + ' $' + (basisOf(co) / held).toFixed(2) : ''))))),

                  news ? React.createElement('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-200 mb-3', role: 'status' },
                    React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, '📰 ' + (econStr(news.headline, 160) || 'Breaking News')),
                    React.createElement('p', { className: 'text-xs text-amber-800 mt-1' }, econStr(news.analysis, 400)),
                    num(news.impact, 0) !== 0 && React.createElement('div', { className: 'text-[0.6875rem] text-amber-800 mt-1 font-bold' }, t('stem.economicslab.biggest_move', 'Biggest news move') + ': ' + (num(news.impact, 0) > 0 ? '▲ +' : '▼ ') + (num(news.impact, 0) * 100).toFixed(1) + '%'),
                    econStr(news.lesson, 400) && React.createElement('div', { className: 'mt-2 bg-amber-100 rounded-lg px-3 py-2 text-[0.6875rem] text-amber-900 border border-amber-200' },
                      React.createElement('span', { className: 'font-bold' }, t('stem.economicslab.investing_concept', '📚 Investing Concept: ')),
                      econStr(news.lesson, 400)),
                    Array.isArray(d.smNewsLog) && d.smNewsLog.length > 1 && React.createElement('div', { className: 'mt-2 text-[0.6875rem] text-amber-900' },
                      React.createElement('div', { className: 'font-bold' }, t('stem.economicslab.news_earlier', 'Earlier in this run:')),
                      d.smNewsLog.slice(0, -1).filter(function (nl) { return nl && typeof nl === 'object'; }).map(function (nl, ni) { return React.createElement('div', { key: ni }, t('stem.economicslab.day_word', 'Day') + ' ' + num(nl.day, 0) + ': ' + econStr(nl.headline, 160)); }))) : null,

                  React.createElement('div', { className: 'flex gap-2 mb-2 flex-wrap' },
                    React.createElement('button', { type: 'button', onClick: function () { trade(co, 1); }, className: 'flex-1 py-3 rounded-xl text-xs font-bold bg-green-700 text-white' }, '▲ Buy 1 ($' + co.price.toFixed(2) + ')'),
                    React.createElement('button', { type: 'button', onClick: function () { trade(co, 10); }, className: 'py-3 px-2 rounded-xl text-[0.6875rem] font-bold bg-green-700 text-white' }, t('stem.economicslab.buy_10', '▲▲ Buy 10')),
                    React.createElement('button', { type: 'button', onClick: function () { trade(co, -1); }, disabled: held <= 0, style: { opacity: held <= 0 ? 0.5 : 1 }, className: 'flex-1 py-3 rounded-xl text-xs font-bold bg-red-700 text-white' }, t('stem.economicslab.sell_1', '▼ Sell 1')),
                    React.createElement('button', { type: 'button', onClick: function () { trade(co, -10); }, disabled: held <= 0, style: { opacity: held <= 0 ? 0.5 : 1 }, className: 'py-3 px-2 rounded-xl text-[0.6875rem] font-bold bg-red-700 text-white' }, '▼▼ Sell ' + Math.min(held, 10))),

                  React.createElement('div', { className: 'flex gap-2 mb-3 flex-wrap' },
                    React.createElement('button', {
                      type: 'button', disabled: econBusy(d.smLoading),
                      onClick: function () { if (smSource === 'ai') advanceAI(); else advance(1); },
                      className: 'flex-1 py-3 px-4 rounded-xl text-xs font-bold ' + (econBusy(d.smLoading) ? 'bg-slate-300 text-slate-600' : 'bg-amber-700 text-white')
                    }, econBusy(d.smLoading) ? '⏳...' : '⏭ Day ' + (smDay + 1)),
                    React.createElement('button', { type: 'button', disabled: econBusy(d.smLoading), onClick: function () { advance(5); }, className: 'py-3 px-3 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300' }, t('stem.economicslab.ff_5', '⏩ 5 days')),
                    React.createElement('button', { type: 'button', onClick: buyIndex, className: 'py-3 px-3 rounded-xl text-xs font-bold bg-indigo-100 text-indigo-900 border border-indigo-300', title: t('stem.economicslab.buy_index_title', 'Split all your cash evenly across every company') }, t('stem.economicslab.buy_index', '🧺 Buy the index'))),

                  econAI && React.createElement('div', { className: 'flex items-center gap-2 flex-wrap mb-3', role: 'group', 'aria-label': t('stem.economicslab.news_source', 'Where market news comes from') },
                    React.createElement('span', { className: 'text-[0.6875rem] font-bold text-slate-700' }, t('stem.economicslab.news_source_label', 'News:')),
                    [{ id: 'deck', label: t('stem.economicslab.src_deck_btn', '📚 Built-in deck (instant)') }, { id: 'ai', label: t('stem.economicslab.src_ai_btn', '✨ AI-generated') }].map(function (o) {
                      return React.createElement('button', { key: o.id, type: 'button', 'aria-pressed': smSource === o.id ? 'true' : 'false', onClick: function () { upd('smNewsSource', o.id); }, className: 'text-[0.6875rem] px-2 py-1 rounded-full border font-bold ' + (smSource === o.id ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-slate-700 border-slate-300') }, o.label);
                    })),

                  // Portfolio summary

                  React.createElement('div', { className: 'bg-white rounded-xl border border-slate-400 p-3 text-xs' },
                    React.createElement('div', { className: 'flex justify-between mb-2' },
                      React.createElement('span', { className: 'font-bold text-slate-700' }, '💼 Cash: $' + smCash.toFixed(2)),
                      React.createElement('span', { className: 'font-bold text-amber-800' }, 'Day ' + smDay),
                      React.createElement('span', { className: 'font-bold text-green-800' }, 'Total: $' + smTotalVal.toFixed(2))),

                    Object.keys(smPortfolio).length > 0 && React.createElement('div', { className: 'flex gap-2 flex-wrap' },
                      smCompanies.filter(function (c) { return num(smPortfolio[c.ticker], 0) > 0; }).map(function (c) {
                        var h = num(smPortfolio[c.ticker], 0), basis = basisOf(c), val = h * c.price;
                        var pl = basis > 0 ? (val / basis - 1) * 100 : 0;
                        return React.createElement('span', { key: c.ticker, className: 'bg-slate-100 px-2 py-1 rounded text-[0.6875rem] font-bold' }, c.ticker + ': ' + h + ' (' + econFmt(val) + ', ', React.createElement('span', { className: pl >= 0 ? 'text-green-800' : 'text-red-700' }, (pl >= 0 ? '+' : '') + pl.toFixed(1) + '%'), ')');
                      })),

                    num(d.smRealized, 0) !== 0 && React.createElement('div', { className: 'mt-2 text-[0.6875rem] text-slate-700' }, t('stem.economicslab.realized', 'Realized profit from sales so far') + ': ', React.createElement('span', { className: 'font-bold ' + (num(d.smRealized, 0) >= 0 ? 'text-green-800' : 'text-red-700') }, econFmt(d.smRealized))),

                    // Portfolio Analytics

                    smDay > 0 && (function () {

                      // Buy-and-hold benchmark: equal-weight index of every ticker
                      // from its day-0 price. "Did your trading beat just holding?"
                      // is the core index-fund lesson this sim can teach.

                      var baseMap = (d.smBaseline && typeof d.smBaseline === 'object') ? d.smBaseline : {};

                      var idxRatios = smCompanies.map(function (c) {
                        var base = num(baseMap[c.ticker], Array.isArray(c.history) && typeof c.history[0] === 'number' ? c.history[0] : c.price);
                        return base > 0 ? c.price / base : 1;
                      });

                      var idxReturn = idxRatios.length ? (idxRatios.reduce(function (s, r) { return s + r; }, 0) / idxRatios.length - 1) * 100 : 0;

                      var myReturn = (smTotalVal / 10000 - 1) * 100;

                      var stockVal = smCompanies.reduce(function (s, c) { return s + num(smPortfolio[c.ticker], 0) * c.price; }, 0);

                      var topShare = 0;

                      smCompanies.forEach(function (c) { var v = num(smPortfolio[c.ticker], 0) * c.price; if (stockVal > 0 && v / stockVal > topShare) topShare = v / stockVal; });

                      var cashShare = smTotalVal > 0 ? smCash / smTotalVal : 1;

                      return React.createElement('div', { className: 'mt-3 bg-slate-50 rounded-xl p-3 border border-slate-400' },
                        React.createElement('h4', { className: 'text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wider mb-2' }, t('stem.economicslab.portfolio_analytics', '📈 Portfolio Analytics')),
                        React.createElement('div', { className: 'grid grid-cols-4 gap-2 text-center' },
                          React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-100' },
                            React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, t('stem.economicslab.total_p_l', 'Total P&L')),
                            React.createElement('div', { className: 'text-sm font-bold ' + (smTotalVal - 10000 >= 0 ? 'text-green-800' : 'text-red-700') }, (smTotalVal - 10000 >= 0 ? '+' : '') + '$' + (smTotalVal - 10000).toFixed(0))),
                          React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-100' },
                            React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, t('stem.economicslab.return', 'Return %')),
                            React.createElement('div', { className: 'text-sm font-bold ' + (smTotalVal >= 10000 ? 'text-green-800' : 'text-red-700') }, (smTotalVal >= 10000 ? '+' : '') + myReturn.toFixed(1) + '%')),
                          React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-100' },
                            React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, t('stem.economicslab.index_hold', 'Index (hold)')),
                            React.createElement('div', { className: 'text-sm font-bold ' + (idxReturn >= 0 ? 'text-green-800' : 'text-red-700') }, (idxReturn >= 0 ? '+' : '') + idxReturn.toFixed(1) + '%')),
                          React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-100' },
                            React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, t('stem.economicslab.holdings', 'Holdings')),
                            React.createElement('div', { className: 'text-sm font-bold text-slate-700' }, Object.keys(smPortfolio).filter(function (tk) { return num(smPortfolio[tk], 0) > 0; }).length + ' stocks'))),
                        // Only once the student has traded; an all-cash account gets the cash-drag note instead.
                        myReturn < idxReturn - 0.5 && (Object.keys(smPortfolio).length > 0 || Object.keys(smCost).length > 0 || num(d.smRealized, 0) !== 0 || smCash !== 10000) && React.createElement('div', { className: 'mt-2 text-[0.6875rem] text-indigo-700 bg-indigo-50 rounded-lg p-2 border border-indigo-100' },
                          t('stem.economicslab.index_lesson', '📚 The buy-and-hold index is beating your trading. Most active traders underperform simply holding everything — this is why index funds are the default advice.')),
                        cashShare > 0.8 && smDay >= 5 && React.createElement('div', { className: 'mt-2 text-[0.6875rem] text-slate-700 bg-white rounded-lg p-2 border border-slate-200' },
                          t('stem.economicslab.cash_drag', '💤 Most of your money is still cash. Cash is safe but earns nothing here, so it trails the market on average. That gap is called cash drag.')),
                        topShare > 0.7 && stockVal > 0 && React.createElement('div', { className: 'mt-2 text-[0.6875rem] text-amber-800 bg-amber-50 rounded-lg p-2 border border-amber-100' },
                          t('stem.economicslab.concentration_warning', '⚠️ Over 70% of your stock value is in one company. Diversification cushions single-company shocks — spread your bets.')));
                    })(),

                    // Reset Market button

                    React.createElement('button', {
                      type: 'button',
                      onClick: function () { updMany({ smCompanies: null, smPortfolio: {}, smCost: {}, smRealized: 0, smCash: 10000, smDay: 0, smInput: '', smNewsEvent: null, smBaseline: null, smLoading: false }); if (addToast) addToast('♻ Market reset! Create a new one.', 'info'); },
                      className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-400'
                    }, t('stem.economicslab.reset_market_generate_new_companies', '♻ Reset Market & Generate New Companies'))));

              })(),

              // ── Investing Deep-Dives ──
              // The three things the trading sim alone can't teach: building a
              // whole portfolio (not picking one ticker), risk as variance (not
              // just red days), and long-horizon ranges of outcomes (not one
              // smooth compound line). All assumptions are illustrative
              // long-run-average teaching numbers and every panel says so.
              (function () {

                var paStocks = (typeof d.paStocks === 'number' && isFinite(d.paStocks)) ? d.paStocks : 60;
                var paBonds = (typeof d.paBonds === 'number' && isFinite(d.paBonds)) ? d.paBonds : 30;
                if (paStocks + paBonds > 100) paBonds = 100 - paStocks;
                var paCash = 100 - paStocks - paBonds;

                var ivAsset = { stocks: { ret: 10, vol: 17 }, bonds: { ret: 4, vol: 6 }, cash: { ret: 1.5, vol: 1 } };
                // Mean/vol for ANY weight pair — the drift demo re-evaluates these at
                // future, drifted weights. Modest stock/bond correlation (0.2); cash ~riskless.
                var ivStatsAt = function (ws, wb) {
                  var wc = Math.max(0, 100 - ws - wb);
                  var m = (ws * ivAsset.stocks.ret + wb * ivAsset.bonds.ret + wc * ivAsset.cash.ret) / 100;
                  var a = ws / 100 * ivAsset.stocks.vol, b = wb / 100 * ivAsset.bonds.vol;
                  return { mean: m, vol: Math.sqrt(a * a + b * b + 2 * 0.2 * a * b) };
                };
                var ivStats = ivStatsAt(paStocks, paBonds);
                var ivMean = ivStats.mean;
                var ivVol = ivStats.vol;

                var ivFmt = function (v) { return '$' + Math.round(v).toLocaleString(); };

                var paAnswers = [d.paQ0, d.paQ1, d.paQ2];
                var paDone = paAnswers.every(function (a) { return a !== undefined && a !== null; });
                var paScore = paDone ? paAnswers.reduce(function (s, a) { return s + a; }, 0) : 0;
                var paProfile = paScore <= 1
                  ? { name: t('stem.economicslab.iv_profile_conservative', 'Conservative'), stocks: 30, bonds: 50 }
                  : paScore <= 4
                    ? { name: t('stem.economicslab.iv_profile_balanced', 'Balanced'), stocks: 60, bonds: 30 }
                    : { name: t('stem.economicslab.iv_profile_aggressive', 'Aggressive'), stocks: 85, bonds: 10 };

                var paQs = [
                  { q: t('stem.economicslab.iv_q_drop', 'The market drops 30% in one year. What do you do?'), opts: [t('stem.economicslab.iv_q_drop_a', 'Sell everything before it gets worse'), t('stem.economicslab.iv_q_drop_b', 'Hold on and wait it out'), t('stem.economicslab.iv_q_drop_c', 'Buy more while prices are low')] },
                  { q: t('stem.economicslab.iv_q_when', 'When will you actually need this money?'), opts: [t('stem.economicslab.iv_q_when_a', 'In under 5 years'), t('stem.economicslab.iv_q_when_b', 'In 5–15 years'), t('stem.economicslab.iv_q_when_c', 'In 15+ years')] },
                  { q: t('stem.economicslab.iv_q_pref', 'Which portfolio sounds better to you?'), opts: [t('stem.economicslab.iv_q_pref_a', 'Small steady gains, few surprises'), t('stem.economicslab.iv_q_pref_b', 'A balance of growth and stability'), t('stem.economicslab.iv_q_pref_c', 'Big swings if it means bigger growth')] }
                ];

                var ivCard = function (openKey, title, content) {
                  return React.createElement('div', { className: 'mt-2 bg-slate-50 rounded-xl border border-slate-400 p-3' },
                    React.createElement('button', {
                      onClick: function () { upd(openKey, !d[openKey]); },
                      'aria-expanded': !!d[openKey],
                      className: 'w-full flex items-center justify-between text-left text-sm font-bold text-slate-800 bg-transparent border-0 p-0'
                    },
                      React.createElement('span', null, title),
                      React.createElement('span', { 'aria-hidden': true, className: 'text-slate-500' }, d[openKey] ? '▾' : '▸')),
                    d[openKey] ? React.createElement('div', { className: 'mt-2' }, content) : null);
                };

                // ── Panel 1: Portfolio Builder (risk quiz + asset allocation) ──
                var paSeg = function (pctVal, color, label) {
                  return pctVal > 0 ? React.createElement('div', {
                    style: { width: pctVal + '%', background: color },
                    className: 'flex items-center justify-center text-white text-[0.625rem] font-bold h-full'
                  }, pctVal >= 12 ? label + ' ' + pctVal + '%' : '') : null;
                };

                var paBadYear = 10000 * (1 + (ivMean - 2 * ivVol) / 100);

                // Deterministic allocation drift: each sleeve compounds at its own
                // expected rate, so the stock share creeps up until rebalanced.
                var paDrift = function (yrs) {
                  var vs = paStocks * Math.pow(1 + ivAsset.stocks.ret / 100, yrs);
                  var vb = paBonds * Math.pow(1 + ivAsset.bonds.ret / 100, yrs);
                  var vc = paCash * Math.pow(1 + ivAsset.cash.ret / 100, yrs);
                  var tot = (vs + vb + vc) || 1;
                  var ds = Math.round(vs / tot * 100), db = Math.round(vb / tot * 100);
                  return { s: ds, b: db, c: Math.max(0, 100 - ds - db) };
                };

                var paPanel = React.createElement('div', null,
                  React.createElement('p', { className: 'text-[0.6875rem] text-slate-600 mb-2 m-0' }, t('stem.economicslab.iv_pa_intro', 'Real investors don’t just pick stocks — they decide how to split money across asset types. Answer 3 questions to find your risk profile, then build your mix.')),
                  paQs.map(function (qq, qi) {
                    return React.createElement('div', { key: 'paq' + qi, className: 'mb-2' },
                      React.createElement('div', { className: 'text-xs font-bold text-slate-700 mb-1' }, (qi + 1) + '. ' + qq.q),
                      React.createElement('div', { className: 'flex gap-1 flex-wrap' },
                        qq.opts.map(function (op, oi) {
                          var sel = d['paQ' + qi] === oi;
                          return React.createElement('button', {
                            key: 'pao' + oi,
                            'aria-pressed': sel,
                            onClick: function () {
                              upd('paQ' + qi, oi);
                              var othersDone = [0, 1, 2].every(function (x) { return x === qi || (d['paQ' + x] !== undefined && d['paQ' + x] !== null); });
                              if (othersDone && !d.paQuizDone) {
                                upd('paQuizDone', true);
                                addXP(10, 'Investor profile quiz');
                                if (addToast) addToast('🧭 ' + t('stem.economicslab.iv_profile_unlocked', 'Investor profile unlocked!'), 'success');
                              }
                            },
                            className: 'px-2 py-1 rounded-lg text-[0.6875rem] font-bold border transition-all ' + (sel ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300')
                          }, op);
                        })));
                  }),
                  paDone && React.createElement('div', { className: 'bg-indigo-50 border border-indigo-200 rounded-lg p-2 mb-2 text-[0.6875rem] text-indigo-800' },
                    React.createElement('span', { className: 'font-bold' }, t('stem.economicslab.iv_pa_suggested', 'Suggested mix') + ': ' + paProfile.name + ' — '),
                    paProfile.stocks + '% ' + t('stem.economicslab.iv_stocks', 'stocks') + ' / ' + paProfile.bonds + '% ' + t('stem.economicslab.iv_bonds', 'bonds') + ' / ' + (100 - paProfile.stocks - paProfile.bonds) + '% ' + t('stem.economicslab.iv_cash', 'cash'),
                    React.createElement('button', {
                      onClick: function () { upd('paStocks', paProfile.stocks); upd('paBonds', paProfile.bonds); },
                      className: 'ml-2 px-2 py-0.5 rounded bg-indigo-600 text-white text-[0.625rem] font-bold border-0'
                    }, t('stem.economicslab.iv_pa_apply', 'Apply'))),
                  React.createElement('div', { className: 'grid grid-cols-2 gap-2 mb-1' },
                    React.createElement('label', { className: 'text-[0.6875rem] text-slate-600 font-bold' }, t('stem.economicslab.iv_stocks_pct', 'Stocks') + ': ' + paStocks + '%',
                      React.createElement('input', { type: 'range', min: 0, max: 100, step: 5, value: paStocks, 'aria-label': t('stem.economicslab.iv_stocks_pct_aria', 'Percent in stocks'), onChange: function (e) { var v = +e.target.value; upd('paStocks', v); if (v + paBonds > 100) upd('paBonds', 100 - v); }, className: 'w-full' })),
                    React.createElement('label', { className: 'text-[0.6875rem] text-slate-600 font-bold' }, t('stem.economicslab.iv_bonds_pct', 'Bonds') + ': ' + paBonds + '%',
                      React.createElement('input', { type: 'range', min: 0, max: 100 - paStocks, step: 5, value: paBonds, 'aria-label': t('stem.economicslab.iv_bonds_pct_aria', 'Percent in bonds'), onChange: function (e) { upd('paBonds', +e.target.value); }, className: 'w-full' }))),
                  React.createElement('div', { className: 'flex h-6 rounded-lg overflow-hidden border border-slate-300 mb-2', role: 'img', 'aria-label': t('stem.economicslab.iv_alloc_bar', 'Allocation bar') + ': ' + paStocks + '% ' + t('stem.economicslab.iv_stocks', 'stocks') + ', ' + paBonds + '% ' + t('stem.economicslab.iv_bonds', 'bonds') + ', ' + paCash + '% ' + t('stem.economicslab.iv_cash', 'cash') },
                    paSeg(paStocks, '#9333ea', t('stem.economicslab.iv_stocks', 'stocks')),
                    paSeg(paBonds, '#2563eb', t('stem.economicslab.iv_bonds', 'bonds')),
                    paSeg(paCash, '#64748b', t('stem.economicslab.iv_cash', 'cash'))),
                  React.createElement('div', { className: 'grid grid-cols-3 gap-2 text-center' },
                    React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-200' },
                      React.createElement('div', { className: 'text-[0.625rem] text-slate-600' }, t('stem.economicslab.iv_expected_return', 'Expected return')),
                      React.createElement('div', { className: 'text-sm font-bold text-green-800' }, '≈' + ivMean.toFixed(1) + '%/yr')),
                    React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-200' },
                      React.createElement('div', { className: 'text-[0.625rem] text-slate-600' }, t('stem.economicslab.iv_typical_year', 'Typical year')),
                      React.createElement('div', { className: 'text-sm font-bold text-slate-700' }, (ivMean - ivVol).toFixed(0) + '% to +' + (ivMean + ivVol).toFixed(0) + '%')),
                    React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-200' },
                      React.createElement('div', { className: 'text-[0.625rem] text-slate-600' }, t('stem.economicslab.iv_bad_year', 'Bad year, on $10K')),
                      React.createElement('div', { className: 'text-sm font-bold text-red-700' }, ivFmt(paBadYear)))),
                  paDone && Math.abs(paStocks - paProfile.stocks) > 15 && React.createElement('div', { className: 'mt-2 text-[0.6875rem] text-amber-800 bg-amber-50 rounded-lg p-2 border border-amber-100' },
                    t('stem.economicslab.iv_pa_mismatch', '🧭 Your mix is quite far from your quiz profile. That’s allowed — but know why: more stocks = more growth and bigger drops; fewer = calmer ride, slower growth.')),
                  paStocks > 0 && paStocks < 95 && (function () {
                    var paD10 = paDrift(10), paD20 = paDrift(20);
                    var paBadNow = ivMean - 2 * ivVol;
                    var paStats20 = ivStatsAt(paD20.s, paD20.b);
                    var paBad20 = paStats20.mean - 2 * paStats20.vol;
                    var paRow = function (lbl, w) {
                      return React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                        React.createElement('span', { className: 'text-[0.625rem] font-bold text-slate-600 w-14 shrink-0' }, lbl),
                        React.createElement('div', { className: 'flex h-4 rounded overflow-hidden border border-slate-300 flex-1', role: 'img', 'aria-label': lbl + ': ' + w.s + '% ' + t('stem.economicslab.iv_stocks', 'stocks') + ', ' + w.b + '% ' + t('stem.economicslab.iv_bonds', 'bonds') + ', ' + w.c + '% ' + t('stem.economicslab.iv_cash', 'cash') },
                          paSeg(w.s, '#9333ea', ''), paSeg(w.b, '#2563eb', ''), paSeg(w.c, '#64748b', '')),
                        React.createElement('span', { className: 'text-[0.625rem] text-slate-600 w-16 shrink-0 text-right' }, w.s + '/' + w.b + '/' + w.c));
                    };
                    return React.createElement('div', { className: 'mt-3 bg-white rounded-lg p-2 border border-slate-200' },
                      React.createElement('h5', { className: 'text-[0.6875rem] font-bold text-slate-700 mb-1 m-0' }, t('stem.economicslab.iv_drift_title', '🔄 If you never rebalance…')),
                      paRow(t('stem.economicslab.iv_drift_now', 'Now'), { s: paStocks, b: paBonds, c: paCash }),
                      paRow(t('stem.economicslab.iv_drift_y10', 'Year 10'), paD10),
                      paRow(t('stem.economicslab.iv_drift_y20', 'Year 20'), paD20),
                      React.createElement('p', { className: 'text-[0.6875rem] text-slate-600 mt-1 m-0' },
                        t('stem.economicslab.iv_drift_lesson1', 'Stocks outgrow the rest, so your mix quietly drifts stock-heavy: a typical bad year worsens from') + ' ' + paBadNow.toFixed(0) + '% ' + t('stem.economicslab.iv_drift_lesson2', 'today to') + ' ' + paBad20.toFixed(0) + '% ' + t('stem.economicslab.iv_drift_lesson3', 'at year 20. Rebalancing — selling a little of what grew, topping up the rest — keeps the risk you actually chose.')));
                  })());

                // ── Panel 2: Risk Visualizer (volatility drag, deterministic) ──
                var rvMk = function (a, b) { var rr = []; for (var ri = 0; ri < 10; ri++) rr.push(ri % 2 === 0 ? a : b); return rr; };
                var rvSwing = (typeof d.rvSwing === 'number' && isFinite(d.rvSwing)) ? d.rvSwing : 0;
                var rvBase = [
                  { name: t('stem.economicslab.iv_rv_steady', 'Steady Eddie'), color: '#059669', rets: rvMk(7, 7) },
                  { name: t('stem.economicslab.iv_rv_wild', 'Wild Ride'), color: '#dc2626', rets: rvMk(32, -18) },
                  { name: t('stem.economicslab.iv_rv_mix', '50/50 mix, rebalanced'), color: '#4f46e5', rets: rvMk(19.5, -5.5) }
                ];
                // Symmetric swing keeps the arithmetic mean pinned at +7% — the point
                // of the whole demo — while the student dials the variance.
                if (rvSwing > 0) rvBase.push({ name: t('stem.economicslab.iv_rv_custom', 'Your ride') + ' (±' + rvSwing + ')', color: '#d97706', rets: rvMk(7 + rvSwing, 7 - rvSwing) });
                var rvSeries = rvBase.map(function (sr) {
                  var v = 10000, peak = 10000, dd = 0, pts = [10000];
                  sr.rets.forEach(function (r) { v *= 1 + r / 100; if (v > peak) peak = v; var drop = (peak - v) / peak; if (drop > dd) dd = drop; pts.push(v); });
                  return { name: sr.name, color: sr.color, pts: pts, end: v, dd: dd };
                });
                var rvMax = rvSeries.reduce(function (m, sr) { return sr.pts.reduce(function (m2, p) { return Math.max(m2, p); }, m); }, 10000);

                var rvPanel = React.createElement('div', null,
                  React.createElement('p', { className: 'text-[0.6875rem] text-slate-600 mb-2 m-0' }, t('stem.economicslab.iv_rv_intro', 'All three investments below average exactly +7% per year. Watch what the ride does to the destination.')),
                  React.createElement('svg', {
                    viewBox: '0 0 320 160', className: 'w-full', role: 'img',
                    'aria-label': t('stem.economicslab.iv_rv_chart_aria', 'Line chart of $10,000 over 10 years: steady +7% ends near $19,700; a wild ride averaging +7% ends near $14,900; a rebalanced 50/50 mix ends near $18,400.')
                  },
                    React.createElement('line', { x1: 20, y1: 145, x2: 310, y2: 145, stroke: '#cbd5e1', strokeWidth: 1 }),
                    React.createElement('text', { x: 20, y: 156, fill: '#94a3b8', fontSize: 8 }, t('stem.economicslab.iv_rv_year0', 'Year 0')),
                    React.createElement('text', { x: 285, y: 156, fill: '#94a3b8', fontSize: 8 }, '10'),
                    rvSeries.map(function (sr) {
                      return React.createElement('polyline', {
                        key: sr.name, fill: 'none', stroke: sr.color, strokeWidth: 2,
                        points: sr.pts.map(function (p, pi) { return (20 + pi * 29) + ',' + (145 - p / rvMax * 130).toFixed(1); }).join(' ')
                      });
                    })),
                  React.createElement('div', { className: 'flex flex-col gap-1 mt-1' },
                    rvSeries.map(function (sr) {
                      return React.createElement('div', { key: 'leg' + sr.name, className: 'flex items-center gap-2 text-[0.6875rem] text-slate-700' },
                        React.createElement('span', { 'aria-hidden': true, className: 'inline-block w-3 h-3 rounded-sm', style: { background: sr.color } }),
                        React.createElement('span', { className: 'font-bold' }, sr.name),
                        React.createElement('span', null, t('stem.economicslab.iv_rv_ends', 'ends') + ' ' + ivFmt(sr.end) + ' · ' + t('stem.economicslab.iv_rv_worst_drop', 'worst drop') + ' −' + (sr.dd * 100).toFixed(0) + '%'));
                    })),
                  React.createElement('label', { className: 'text-[0.6875rem] text-slate-600 font-bold block mt-2' }, t('stem.economicslab.iv_rv_swing', 'Build your own ride — yearly swing') + ': ±' + rvSwing + '%',
                    React.createElement('input', { type: 'range', min: 0, max: 25, step: 1, value: rvSwing, 'aria-label': t('stem.economicslab.iv_rv_swing_aria', 'Yearly swing percent for your custom ride'), onChange: function (e) { upd('rvSwing', +e.target.value); }, className: 'w-full' })),
                  rvSwing > 0 && React.createElement('p', { className: 'text-[0.6875rem] text-amber-800 m-0 mt-1' },
                    t('stem.economicslab.iv_rv_swing_result1', 'Alternating') + ' +' + (7 + rvSwing) + '% / ' + (7 - rvSwing >= 0 ? '+' : '') + (7 - rvSwing) + '% ' + t('stem.economicslab.iv_rv_swing_result2', 'still averages +7% — but the swings cost') + ' ' + ivFmt(rvSeries[0].end - rvSeries[3].end) + ' ' + t('stem.economicslab.iv_rv_swing_result3', 'over 10 years vs the steady line.')),
                  React.createElement('div', { className: 'mt-2 text-[0.6875rem] text-indigo-700 bg-indigo-50 rounded-lg p-2 border border-indigo-100' },
                    t('stem.economicslab.iv_rv_lesson', '📚 Same average, different endings: big losses hurt more than equal-sized gains help (volatility drag). Splitting money between the two and rebalancing every year recovers most of the gap — that’s what diversification buys, and why "risk" means more than "some red days."')));

                // ── Panel 3: Range of Outcomes (Monte Carlo, seeded/deterministic) ──
                var mcYears = d.mcYears || 30;
                var mcMode = d.mcMode || 'grow';
                var mcContrib = (typeof d.mcContrib === 'number' && isFinite(d.mcContrib)) ? d.mcContrib : 1000;
                var mcSpend = (typeof d.mcSpend === 'number' && isFinite(d.mcSpend)) ? d.mcSpend : 20000;
                var mcFee = (typeof d.mcFee === 'number' && isFinite(d.mcFee)) ? d.mcFee : 0.2;
                var mcStart = mcMode === 'retire' ? 500000 : 10000;
                var mcPanel = null;
                if (d.mcOpen) {
                  var mcN = 200;
                  var mcSeedState = (((d.mcSeed || 1) * 7919 + 104729 + paStocks * 31 + paBonds * 7 + (mcMode === 'retire' ? 17 : 0)) % 2147483647) || 1;
                  var mcRnd = function () { mcSeedState = (mcSeedState * 16807) % 2147483647; return mcSeedState / 2147483647; };
                  var mcNorm = function () { var u = mcRnd(), v2 = mcRnd(); if (u < 1e-12) u = 1e-12; return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v2); };
                  // Fee drags the average return; the volatility is untouched.
                  var mcNetMean = ivMean - mcFee;
                  // retire: withdraw at the START of the year, then growth acts on
                  // the remainder — this ordering is what makes bad EARLY years
                  // deadly (the sequence-of-returns mechanism itself).
                  var mcStep = function (val, r) {
                    if (mcMode === 'retire') { val = val - mcSpend; if (val <= 0) return 0; return val * (1 + r); }
                    return val * (1 + r) + mcContrib;
                  };
                  var mcPerYear = [];
                  for (var my = 0; my <= mcYears; my++) mcPerYear.push([]);
                  for (var ms = 0; ms < mcN; ms++) {
                    var mv = mcStart;
                    mcPerYear[0].push(mv);
                    for (var yy = 1; yy <= mcYears; yy++) {
                      var mr = mcNetMean / 100 + ivVol / 100 * mcNorm();
                      if (mr < -0.9) mr = -0.9;
                      mv = mv > 0 ? mcStep(mv, mr) : 0;
                      mcPerYear[yy].push(mv);
                    }
                  }
                  var mcPct = function (arr, q) { var s2 = arr.slice().sort(function (a, b) { return a - b; }); return s2[Math.min(s2.length - 1, Math.floor(q * s2.length))]; };
                  var mcP10 = [], mcP50 = [], mcP90 = [], mcCst = [mcStart];
                  for (var cy = 1; cy <= mcYears; cy++) mcCst.push(mcStep(mcCst[cy - 1], mcNetMean / 100));
                  for (var py = 0; py <= mcYears; py++) {
                    mcP10.push(mcPct(mcPerYear[py], 0.1));
                    mcP50.push(mcPct(mcPerYear[py], 0.5));
                    mcP90.push(mcPct(mcPerYear[py], 0.9));
                  }
                  var mcAlive = mcPerYear[mcYears].filter(function (v) { return v > 0; }).length;
                  var mcMax = mcP90.concat(mcCst).reduce(function (m, v) { return Math.max(m, v); }, 1);
                  // Straight-line endings at the chosen fee vs a cheap 0.05% index —
                  // the "fees compound too" comparison shown in grow mode.
                  var mcCstAt = function (feePct) { var fv = mcStart; for (var fy = 1; fy <= mcYears; fy++) fv = fv * (1 + (ivMean - feePct) / 100) + mcContrib; return fv; };
                  var mcX = function (yi) { return 20 + yi / mcYears * 285; };
                  var mcY = function (v) { return (150 - v / mcMax * 135).toFixed(1); };
                  var mcBand = mcP90.map(function (v, yi) { return mcX(yi).toFixed(1) + ',' + mcY(v); }).join(' ') + ' ' + mcP10.slice().reverse().map(function (v, ri) { var yi = mcYears - ri; return mcX(yi).toFixed(1) + ',' + mcY(v); }).join(' ');
                  mcPanel = React.createElement('div', null,
                    React.createElement('p', { className: 'text-[0.6875rem] text-slate-600 mb-2 m-0' },
                      mcMode === 'retire'
                        ? t('stem.economicslab.iv_mc_intro_retire', '200 simulated retirements: a $500,000 nest egg in your mix') + ' (' + paStocks + '/' + paBonds + '/' + paCash + '), ' + t('stem.economicslab.iv_mc_intro_retire2', 'spending') + ' ' + ivFmt(mcSpend) + t('stem.economicslab.iv_mc_intro_retire3', '/yr. Will it last?')
                        : t('stem.economicslab.iv_mc_intro', 'The Compound Interest calculator draws ONE smooth line. Real markets deliver a range. Here are 200 simulated futures for $10,000 in your mix') + ' (' + paStocks + '/' + paBonds + '/' + paCash + ')' + (mcContrib > 0 ? ' + ' + ivFmt(mcContrib) + t('stem.economicslab.iv_mc_intro_contrib', '/yr added') : '') + '.'),
                    React.createElement('div', { className: 'flex gap-1 mb-2', role: 'group', 'aria-label': t('stem.economicslab.iv_mc_mode_aria', 'Simulation mode') },
                      [{ id: 'grow', label: t('stem.economicslab.iv_mc_mode_grow', '🌱 Growing') }, { id: 'retire', label: t('stem.economicslab.iv_mc_mode_retire', '🏖️ Retiring') }].map(function (mm) {
                        var msel = mcMode === mm.id;
                        return React.createElement('button', {
                          key: mm.id,
                          'aria-pressed': msel,
                          onClick: function () { upd('mcMode', mm.id); if (mm.id === 'retire' && !d.mcRanRetire) { upd('mcRanRetire', true); addXP(5, 'Retirement stress test'); } },
                          className: 'px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold border transition-all ' + (msel ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-300')
                        }, mm.label);
                      })),
                    React.createElement('div', { className: 'grid grid-cols-2 gap-2 mb-2 items-center' },
                      React.createElement('label', { className: 'text-[0.6875rem] text-slate-600 font-bold' }, t('stem.economicslab.iv_mc_years', 'Years') + ': ' + mcYears,
                        React.createElement('input', { type: 'range', min: 10, max: 40, step: 5, value: mcYears, 'aria-label': t('stem.economicslab.iv_mc_years_aria', 'Simulation years'), onChange: function (e) { upd('mcYears', +e.target.value); }, className: 'w-full' })),
                      mcMode === 'retire'
                        ? React.createElement('label', { className: 'text-[0.6875rem] text-slate-600 font-bold' }, t('stem.economicslab.iv_mc_spend', 'Spending/yr') + ': ' + ivFmt(mcSpend) + ' (' + (mcSpend / 5000).toFixed(1) + '%)',
                            React.createElement('input', { type: 'range', min: 10000, max: 40000, step: 2500, value: mcSpend, 'aria-label': t('stem.economicslab.iv_mc_spend_aria', 'Yearly spending in retirement'), onChange: function (e) { upd('mcSpend', +e.target.value); }, className: 'w-full' }))
                        : React.createElement('label', { className: 'text-[0.6875rem] text-slate-600 font-bold' }, t('stem.economicslab.iv_mc_contrib', 'Added/yr') + ': ' + ivFmt(mcContrib),
                            React.createElement('input', { type: 'range', min: 0, max: 5000, step: 250, value: mcContrib, 'aria-label': t('stem.economicslab.iv_mc_contrib_aria', 'Yearly contribution'), onChange: function (e) { upd('mcContrib', +e.target.value); }, className: 'w-full' })),
                      React.createElement('label', { className: 'text-[0.6875rem] text-slate-600 font-bold' }, t('stem.economicslab.iv_mc_fee', 'Fund fee') + ': ' + mcFee.toFixed(2) + '%/yr',
                        React.createElement('input', { type: 'range', min: 0, max: 1.5, step: 0.05, value: mcFee, 'aria-label': t('stem.economicslab.iv_mc_fee_aria', 'Yearly fund fee percent'), onChange: function (e) { upd('mcFee', +e.target.value); }, className: 'w-full' })),
                      React.createElement('button', {
                        onClick: function () { upd('mcSeed', (d.mcSeed || 1) + 1); if (announceToSR) announceToSR(t('stem.economicslab.iv_mc_rerolled', 'New simulation run generated.')); },
                        className: 'px-3 py-2 rounded-xl text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200'
                      }, t('stem.economicslab.iv_mc_reroll', '🎲 Re-roll 200 futures'))),
                    React.createElement('svg', {
                      viewBox: '0 0 320 160', className: 'w-full', role: 'img',
                      'aria-label': t('stem.economicslab.iv_mc_chart_aria', 'Fan chart of simulated outcomes.') + ' ' + t('stem.economicslab.iv_mc_chart_aria2', 'After') + ' ' + mcYears + ' ' + t('stem.economicslab.iv_mc_chart_aria3', 'years, the middle 80% of runs end between') + ' ' + ivFmt(mcP10[mcYears]) + ' ' + t('stem.economicslab.iv_mc_chart_aria4', 'and') + ' ' + ivFmt(mcP90[mcYears]) + '. ' + t('stem.economicslab.iv_mc_chart_aria5', 'Median') + ' ' + ivFmt(mcP50[mcYears]) + '.'
                    },
                      React.createElement('polygon', { points: mcBand, fill: '#c7d2fe', opacity: 0.55 }),
                      React.createElement('polyline', { fill: 'none', stroke: '#4f46e5', strokeWidth: 2, points: mcP50.map(function (v, yi) { return mcX(yi).toFixed(1) + ',' + mcY(v); }).join(' ') }),
                      React.createElement('polyline', { fill: 'none', stroke: '#d97706', strokeWidth: 1.5, strokeDasharray: '4 3', points: mcCst.map(function (v, yi) { return mcX(yi).toFixed(1) + ',' + mcY(v); }).join(' ') }),
                      React.createElement('line', { x1: 20, y1: 150, x2: 310, y2: 150, stroke: '#cbd5e1', strokeWidth: 1 }),
                      React.createElement('text', { x: 20, y: 158, fill: '#94a3b8', fontSize: 8 }, '0'),
                      React.createElement('text', { x: 290, y: 158, fill: '#94a3b8', fontSize: 8 }, mcYears + 'y')),
                    React.createElement('div', { className: 'flex gap-3 text-[0.625rem] text-slate-600 mt-1' },
                      React.createElement('span', null, React.createElement('span', { 'aria-hidden': true, className: 'inline-block w-3 h-2 rounded-sm align-middle mr-1', style: { background: '#c7d2fe' } }), t('stem.economicslab.iv_mc_band', 'middle 80% of runs')),
                      React.createElement('span', null, React.createElement('span', { 'aria-hidden': true, className: 'inline-block w-3 h-0.5 align-middle mr-1', style: { background: '#4f46e5' } }), t('stem.economicslab.iv_mc_median', 'median run')),
                      React.createElement('span', null, React.createElement('span', { 'aria-hidden': true, className: 'inline-block w-3 h-0.5 align-middle mr-1', style: { background: '#d97706' } }), t('stem.economicslab.iv_mc_straight', 'straight-line calc'))),
                    React.createElement('div', { className: 'grid grid-cols-3 gap-2 text-center mt-2' },
                      React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-200' },
                        React.createElement('div', { className: 'text-[0.625rem] text-slate-600' }, t('stem.economicslab.iv_mc_unlucky', 'Unlucky (10th pct)')),
                        React.createElement('div', { className: 'text-sm font-bold text-red-700' }, ivFmt(mcP10[mcYears]))),
                      React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-200' },
                        React.createElement('div', { className: 'text-[0.625rem] text-slate-600' }, t('stem.economicslab.iv_mc_median_end', 'Median')),
                        React.createElement('div', { className: 'text-sm font-bold text-indigo-600' }, ivFmt(mcP50[mcYears]))),
                      React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-200' },
                        React.createElement('div', { className: 'text-[0.625rem] text-slate-600' }, t('stem.economicslab.iv_mc_lucky', 'Lucky (90th pct)')),
                        React.createElement('div', { className: 'text-sm font-bold text-green-800' }, ivFmt(mcP90[mcYears])))),
                    mcMode === 'retire' && React.createElement('div', { className: 'mt-2 text-[0.6875rem] font-bold rounded-lg p-2 border ' + (mcAlive / mcN >= 0.9 ? 'text-green-800 bg-green-50 border-green-200' : mcAlive / mcN >= 0.75 ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-red-700 bg-red-50 border-red-200') },
                      '🛡️ ' + mcAlive + ' ' + t('stem.economicslab.iv_mc_alive1', 'of 200 simulated retirements still had money after') + ' ' + mcYears + ' ' + t('stem.economicslab.iv_mc_alive2', 'years') + ' (' + (mcAlive / mcN * 100).toFixed(0) + '%).'),
                    mcMode === 'grow' && mcFee > 0.1 && React.createElement('div', { className: 'mt-2 text-[0.6875rem] text-rose-700 bg-rose-50 rounded-lg p-2 border border-rose-100' },
                      '💸 ' + t('stem.economicslab.iv_mc_fee_cost1', 'Fees compound too: at') + ' ' + mcFee.toFixed(2) + '% ' + t('stem.economicslab.iv_mc_fee_cost2', 'the straight-line path ends near') + ' ' + ivFmt(mcCstAt(mcFee)) + '; ' + t('stem.economicslab.iv_mc_fee_cost3', 'at 0.05% (a cheap index fund) it ends near') + ' ' + ivFmt(mcCstAt(0.05)) + ' — ' + t('stem.economicslab.iv_mc_fee_cost4', 'a gap of') + ' ' + ivFmt(mcCstAt(0.05) - mcCstAt(mcFee)) + '.'),
                    React.createElement('div', { className: 'mt-2 text-[0.6875rem] text-indigo-700 bg-indigo-50 rounded-lg p-2 border border-indigo-100' },
                      mcMode === 'retire'
                        ? t('stem.economicslab.iv_mc_lesson_retire', '📚 Sequence-of-returns risk, live: every run here has the SAME average return — the runs that went broke just met their bad years FIRST, while withdrawals kept draining the pot. This is why retirees hold more bonds, and why the "4% rule" is a guideline, not a guarantee.')
                        : t('stem.economicslab.iv_mc_lesson', '📚 The dashed line is what a constant-rate calculator promises — the median simulated run usually lands below it, because the average is pulled up by a few lucky runs. And two savers with the same average return can end in very different places: the ORDER of good and bad years matters (sequence-of-returns risk), especially near retirement.')));
                }

                return React.createElement('div', { className: 'mt-4' },
                  React.createElement('h4', { className: 'text-[0.6875rem] font-bold text-slate-600 uppercase tracking-wider mb-1' }, t('stem.economicslab.iv_deep_dives', '🎓 Investing Deep-Dives')),
                  React.createElement('p', { className: 'text-[0.6875rem] text-slate-600 mb-1 m-0' }, t('stem.economicslab.iv_deep_dives_sub', 'Beyond picking stocks: build a whole portfolio, see what risk really means, and explore the range of long-run outcomes.')),
                  ivCard('paOpen', t('stem.economicslab.iv_pa_title', '🧩 Portfolio Builder — risk profile & asset mix'), paPanel),
                  ivCard('rvOpen', t('stem.economicslab.iv_rv_title', '🎢 Risk Visualizer — same average, different ride'), rvPanel),
                  ivCard('mcOpen', t('stem.economicslab.iv_mc_title', '🎲 Range of Outcomes — 200 simulated futures'), mcPanel),
                  React.createElement('p', { className: 'text-[0.625rem] text-slate-500 italic mt-2 m-0' }, t('stem.economicslab.iv_disclaimer', 'Illustrative teaching model: long-run US-style averages (stocks ≈10%/yr, bonds ≈4%, cash ≈1.5%, historical-style volatility), ignoring fees, taxes, and inflation. Not a prediction and not financial advice.')));
              })()

            ),



            econTab === 'entrepreneur' && (function () {

              // ── Business Sim ──
              // Each day runs on ECON_ENGINE.bizDay: a real demand curve (price
              // sensitivity), reputation, weather, weekdays, capacity and
              // marketing. Revenue is always customers × price, so a price
              // experiment is a real experiment. AI can invent a custom
              // business or write events; everything else works offline.

              var round2 = function (v) { return Math.round(v * 100) / 100; };

              var bizEventSource = econAI && d.enEventSource === 'ai' ? 'ai' : 'deck';

              var launch = function (tpl) {
                var b = E.bizNormalize(tpl);
                updMany({ enBusiness: b, enBizCash: 10000 - b.startupCost, enBizDay: 1, enBizRep: 50, enBizPrice: b.suggestedPrice, enBizHistory: [], enBizEvent: null, enBizEmployees: 0, enBizMarketing: 0, enBizUnitCostAdj: 1, enBizFixedAdj: 1, enBizDemandAdj: 1, enBizQuality: 0, enBizPrices: [], enChart: 'profit', enLoading: false });
                if (addToast) addToast('🎉 ' + b.businessName + ' ' + t('stem.economicslab.biz_is_open', 'is open! Starting cash:') + ' ' + econFmt(10000 - b.startupCost), 'success');
                if (announceToSR) announceToSR(b.businessName + ' ' + t('stem.economicslab.biz_is_open', 'is open! Starting cash:') + ' ' + econFmt(10000 - b.startupCost));
              };

              if (!enBiz) {
                return React.createElement('div', { className: 'mt-4 py-4' },
                  React.createElement('div', { className: 'text-center' },
                    React.createElement('div', { className: 'text-5xl mb-3', 'aria-hidden': 'true' }, '🚀'),
                    React.createElement('h3', { className: 'text-lg font-bold text-slate-800 mb-1' }, t('stem.economicslab.start_your_business', 'Start Your Business')),
                    React.createElement('p', { className: 'text-xs text-slate-600 mb-3 max-w-md mx-auto' }, t('stem.economicslab.biz_intro', 'You get a $10,000 seed fund. Pick a business, set your price, and run it day by day. Watch how price, reputation, weather, staff and marketing change your customers and your profit.'))),
                  React.createElement('div', { className: 'grid grid-cols-2 gap-2 mb-3', role: 'group', 'aria-label': t('stem.economicslab.biz_templates', 'Business types') },
                    E.BIZ_TEMPLATES.map(function (tpl) {
                      return React.createElement('button', {
                        key: tpl.id, type: 'button', onClick: function () { launch(tpl); },
                        className: 'text-left p-3 rounded-xl border-2 border-amber-200 bg-white hover:border-amber-500 hover:bg-amber-50 transition-all'
                      },
                        React.createElement('div', { className: 'flex items-center gap-2' },
                          React.createElement('span', { className: 'text-2xl', 'aria-hidden': 'true' }, tpl.emoji),
                          React.createElement('span', { className: 'text-xs font-bold text-slate-800' }, tpl.businessName)),
                        React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 mt-1' }, tpl.description),
                        React.createElement('div', { className: 'text-[0.6875rem] text-amber-900 font-bold mt-1' }, t('stem.economicslab.biz_startup', 'Startup') + ' $' + tpl.startupCost.toLocaleString() + ' · $' + tpl.suggestedPrice.toFixed(2) + ' / ' + tpl.unitName));
                    })),
                  econAI && React.createElement('div', { className: 'bg-white border border-slate-200 rounded-xl p-3 max-w-md mx-auto' },
                    React.createElement('p', { className: 'text-[0.6875rem] text-slate-600 mb-2 m-0' }, t('stem.economicslab.type_any_business_idea_and_ai_will_gen', 'Type any business idea and AI will generate your startup costs, daily expenses, and pricing. Then run it day by day!')),
                    React.createElement('input', {
                      type: 'text',
                      'aria-label': t('stem.economicslab.business_idea', 'Business idea'),
                      value: econStr(d.enInput, 120),
                      onChange: function (e) { upd('enInput', e.target.value); },
                      placeholder: t('stem.economicslab.e_g_food_truck_dog_walking_tutoring_ba', 'e.g. food truck, dog walking, tutoring, bakery, app development...'),
                      className: 'w-full px-3 py-2 border-2 border-slate-200 rounded-xl text-xs focus:border-indigo-400 outline-none mb-2',
                      onKeyDown: function (e) { if (e.key === 'Enter' && econStr(d.enInput, 120).trim()) { var btn = document.getElementById('econ-start-biz'); if (btn) btn.click(); } }
                    }),
                    React.createElement('button', {
                      id: 'econ-start-biz', type: 'button',
                      onClick: function () {
                        var idea = econStr(d.enInput, 120).trim();
                        if (!idea) return;
                        upd('enLoading', Date.now());
                        var prompt = 'You are a business simulation game engine for students. The player wants to start a "' + idea + '" business.\n\nGenerate realistic startup details. Return ONLY valid JSON:\n{"businessName":"<creative name>","emoji":"<single emoji>","startupCost":<number 300-9000>,"dailyFixedCosts":<number 10-500>,"unitCost":<number, cost per unit/customer served>,"unitName":"<what 1 unit is, e.g. meal, walk, lesson, item>","suggestedPrice":<number>,"maxDailyCustomers":<number 5-200>,"description":"<1 sentence pitch>","riskFactors":["<risk 1>","<risk 2>","<risk 3>"]}\n\nMake the numbers realistic for a small business startup that can make a modest profit at the suggested price.';
                        econAsk(prompt).then(function (result) {
                          try {
                            var biz = econParseJSON(result);
                            if (typeof biz.businessName !== 'string') throw new Error('no name');
                            launch(Object.assign({}, biz, { id: 'custom' }));
                          } catch (e3) { upd('enLoading', false); if (addToast) addToast(t('stem.economicslab.biz_ai_failed', 'AI could not build that business. Try again, or pick one above.'), 'error'); }
                        }).catch(function () { upd('enLoading', false); if (addToast) addToast(t('stem.economicslab.biz_ai_failed', 'AI could not build that business. Try again, or pick one above.'), 'error'); });
                      },
                      disabled: econBusy(d.enLoading) || !econStr(d.enInput, 120).trim(),
                      className: 'w-full py-2 rounded-xl text-xs font-bold ' + (econBusy(d.enLoading) ? 'bg-slate-300 text-slate-600' : 'bg-amber-700 text-white')
                    }, econBusy(d.enLoading) ? '⏳ ' + t('stem.economicslab.ai_building_business', 'AI is building your business...') : '✨ ' + t('stem.economicslab.launch_custom', 'Launch my own idea (AI)'))));
              }

              var bizLv = { price: enPrice, staff: enStaff, marketing: enMarketing };

              var bizSt = { rep: enRep, unitCostAdj: enAdj.unitCostAdj, fixedAdj: enAdj.fixedAdj, demandAdj: enAdj.demandAdj, quality: enAdj.quality };

              // Profit of the last 7 days (for the quarterly-tax event).
              var recentProfit = enHistory.slice(-7).reduce(function (sum, h) { return sum + num(h.profit, 0); }, 0);

              var unitCost = enBiz.unitCost * E.clamp(enAdj.unitCostAdj, 0.2, 5);

              var fixedNow = enBiz.dailyFixedCosts * E.clamp(enAdj.fixedAdj, 0.2, 5);

              var breakEven = E.bizBreakEven(enBiz, bizLv, bizSt);

              var capacity = enBiz.maxDailyCustomers + enStaff * enBiz.staffCapacity;

              var ref = enBiz.suggestedPrice;

              var priceStep = ref >= 20 ? 1 : ref >= 5 ? 0.25 : 0.05;

              var lastDay = enHistory[enHistory.length - 1] || null;

              var recent = enHistory.slice(-7);

              var lostRecent = recent.reduce(function (s, h) { return s + num(h.turnedAway, 0); }, 0);

              var ev = (d.enBizEvent && typeof d.enBizEvent === 'object' && Array.isArray(d.enBizEvent.choices)) ? d.enBizEvent : null;

              var evChoices = ev ? ev.choices.filter(function (c) { return c && typeof c === 'object' && typeof c.label === 'string'; }).slice(0, 4) : [];

              if (ev && !evChoices.length) ev = null;

              var effOf = function (c) { return ev && ev.source === 'deck' ? (c.effect || {}) : E.sanitizeAiBizEffect(c.effect); };

              var bizChips = function (ef) {
                var chips = [];
                var cashD = num(ef.cash, 0) + num(ef.cashX, 0) * fixedNow;
                if (cashD) chips.push({ text: (cashD > 0 ? '+' : '−') + '$' + Math.round(Math.abs(cashD)).toLocaleString(), cls: cashD > 0 ? 'text-green-800' : 'text-red-700' });
                if (num(ef.reputation, 0)) chips.push({ text: (ef.reputation > 0 ? '+' : '') + ef.reputation + ' ' + t('stem.economicslab.chip_rep', 'reputation'), cls: ef.reputation > 0 ? 'text-green-800' : 'text-red-700' });
                if (num(ef.employees, 0)) chips.push({ text: (ef.employees > 0 ? '+' : '') + ef.employees + ' ' + t('stem.economicslab.chip_staff', 'staff'), cls: 'text-slate-700' });
                if (num(ef.unitCostPct, 0)) chips.push({ text: (ef.unitCostPct > 0 ? '+' : '') + ef.unitCostPct + '% ' + t('stem.economicslab.chip_unit_cost', 'unit cost'), cls: ef.unitCostPct > 0 ? 'text-red-700' : 'text-green-800' });
                if (num(ef.fixedPct, 0)) chips.push({ text: (ef.fixedPct > 0 ? '+' : '') + ef.fixedPct + '% ' + t('stem.economicslab.chip_fixed', 'daily fixed costs'), cls: ef.fixedPct > 0 ? 'text-red-700' : 'text-green-800' });
                if (num(ef.demandPct, 0)) chips.push({ text: ef.demandPct + '% ' + t('stem.economicslab.chip_demand', 'customers from now on'), cls: ef.demandPct > 0 ? 'text-green-800' : 'text-red-700' });
                if (num(ef.quality, 0)) chips.push({ text: (ef.quality > 0 ? '+' : '') + ef.quality + ' ' + t('stem.economicslab.chip_quality', 'lasting quality (reputation target)'), cls: ef.quality > 0 ? 'text-green-800' : 'text-red-700' });
                if (ef.risk && typeof ef.risk === 'object') chips.push({ text: Math.round(num(ef.risk.p, 0) * 100) + '%: ' + (num(ef.risk.win, 0) >= 0 ? '+' : '−') + '$' + Math.round(Math.abs(num(ef.risk.win, 0)) * fixedNow).toLocaleString() + ' / ' + (100 - Math.round(num(ef.risk.p, 0) * 100)) + '%: ' + (num(ef.risk.lose, 0) >= 0 ? '+' : '−') + '$' + Math.round(Math.abs(num(ef.risk.lose, 0)) * fixedNow).toLocaleString(), cls: 'text-amber-800' });
                if (typeof ef.taxRecent === 'number') chips.push({ text: '−$' + Math.round(Math.max(0, recentProfit) * ef.taxRecent).toLocaleString() + ' (' + Math.round(ef.taxRecent * 100) + '% ' + t('stem.economicslab.chip_tax_recent', 'of last week’s profit') + ')', cls: 'text-red-700' });
                if (!chips.length) chips.push({ text: t('stem.economicslab.chip_nothing', 'no immediate money change'), cls: 'text-slate-600' });
                return chips;
              };

              var chooseEvent = function (c) {
                var ef = effOf(c);
                var paid = E.bizEffectCash(ef, fixedNow, recentProfit, Math.random);
                var patch = { enBizCash: round2(enCash + paid.cash), enBizRep: E.clamp(enRep + num(ef.reputation, 0), 0, 100), enBizEvent: null };
                if (num(ef.quality, 0)) patch.enBizQuality = E.clamp(enAdj.quality + ef.quality, -30, 30);
                if (paid.riskWon !== null && addToast) addToast(paid.riskWon ? t('stem.economicslab.risk_won', '🍀 It worked out!') : t('stem.economicslab.risk_lost', '😬 It didn’t work out this time.'), paid.riskWon ? 'success' : 'warning');
                if (num(ef.employees, 0)) patch.enBizEmployees = Math.round(E.clamp(enStaff + ef.employees, 0, 20));
                if (num(ef.unitCostPct, 0)) patch.enBizUnitCostAdj = E.clamp(enAdj.unitCostAdj * (1 + ef.unitCostPct / 100), 0.2, 5);
                if (num(ef.fixedPct, 0)) patch.enBizFixedAdj = E.clamp(enAdj.fixedAdj * (1 + ef.fixedPct / 100), 0.2, 5);
                if (num(ef.demandPct, 0)) patch.enBizDemandAdj = E.clamp(enAdj.demandAdj * (1 + ef.demandPct / 100), 0.2, 3);
                var title = econStr(ev.title, 80), lesson = econStr(ev.lesson, 400);
                if (lesson && title && !econGlossaryList.some(function (g) { return g.concept === title; })) patch.econGlossary = econGlossaryList.concat([{ tab: 'Business', concept: title, explanation: lesson }]);
                updMany(patch);
                if (addToast) addToast(econStr(c.label, 80), 'info');
              };

              var askAiEvent = function (dayAfter) {
                var prompt = 'You are a business simulation game engine (difficulty: ' + (d.econDifficulty || 'medium') + '). The player runs "' + enBiz.businessName + '", selling ' + enBiz.unitName + 's at $' + enPrice.toFixed(2) + '. Day ' + enDay + ', cash $' + Math.round(enCash) + ', reputation ' + Math.round(enRep) + '/100, ' + enStaff + ' staff.\n\nGenerate ONE realistic business challenge. Return ONLY valid JSON:\n{"emoji":"<emoji>","title":"<event title>","description":"<what happened>","lesson":"<1-2 sentence business concept>","choices":[{"label":"<option>","effect":{"cash":<number>,"reputation":<number -20 to 20>,"employees":<-1, 0 or 1>}}]}\n\nGive 2-3 choices with real trade-offs.';
                econAsk(prompt).then(function (result) {
                  try {
                    var pe = econParseJSON(result);
                    var choices = Array.isArray(pe.choices) ? pe.choices.filter(function (c) { return c && typeof c.label === 'string' && c.label.trim(); }).slice(0, 3).map(function (c) { return { label: c.label.trim().slice(0, 120), effect: E.sanitizeAiBizEffect(c.effect) }; }) : [];
                    if (typeof pe.title !== 'string' || choices.length < 2) throw new Error('bad event');
                    updIf(function (p) { return p.enBizEvent && p.enBizEvent.source === 'deck' && num(p.enBizDay, 1) === dayAfter && p.enBusiness && p.enBusiness.businessName === enBiz.businessName; }, { enBizEvent: { source: 'ai', emoji: econStr(pe.emoji, 12) || '⚡', title: econStr(pe.title, 80), description: econStr(pe.description, 400), lesson: econStr(pe.lesson, 400), choices: choices } });
                    if (announceToSR) announceToSR(t('stem.economicslab.sr_new_biz_event', 'New business event:') + ' ' + econStr(pe.title, 80));
                  } catch (e) { /* the deck event already showing stays */ }
                }).catch(function () { /* the deck event already showing stays */ });
              };

              // Run 1..n days; a business event interrupts a multi-day run.
              var runDays = function (n) {
                var cash = enCash, rep = enRep, day = enDay, hist = enHistory.slice(), hitEvent = null, last = null;
                for (var i = 0; i < n; i++) {
                  var r = E.bizDay(enBiz, bizLv, Object.assign({ rep: rep, day: day }, enAdj), Math.random);
                  cash = round2(cash + r.profit);
                  rep = E.clamp(rep + r.repDelta, 0, 100);
                  hist.push({ day: day, dayName: r.dayName, weather: r.weather, weatherIcon: r.weatherIcon, price: r.price, demand: r.demand, capacity: r.capacity, customers: r.customers, turnedAway: r.turnedAway, revenue: r.revenue, variable: r.variable, fixed: r.fixed, staffCost: r.staffCost, marketing: r.marketing, costs: r.costs, profit: r.profit, notes: r.notes, rep: Math.round(rep), repTarget: Math.round(r.repTarget) });
                  day += 1; last = r;
                  if (day > 2 && Math.random() < 0.3) {
                    var pool = E.BIZ_EVENTS.filter(function (x) { return x.requires !== 'staff' || enStaff > 0; });
                    hitEvent = Object.assign({ source: 'deck' }, pool[Math.floor(Math.random() * pool.length)]);
                    break;
                  }
                }
                var pricesTried = Object.keys(enPricesTried);
                if (pricesTried.indexOf(enPrice.toFixed(2)) === -1) pricesTried.push(enPrice.toFixed(2));
                updMany({ enBizCash: cash, enBizRep: rep, enBizDay: day, enBizHistory: hist.slice(-60), enBizEvent: hitEvent, enBizPrices: pricesTried.slice(-40) });
                addXP(10 * Math.max(1, hist.length - enHistory.length), 'Business Sim: Completed a day');
                if (hitEvent && bizEventSource === 'ai') askAiEvent(day);
                if (announceToSR && last) announceToSR(t('stem.economicslab.day_word', 'Day') + ' ' + last.day + ': ' + last.customers + ' ' + t('stem.economicslab.customers_word', 'customers') + (last.turnedAway ? ', ' + last.turnedAway + ' ' + t('stem.economicslab.turned_away', 'turned away') : '') + ', ' + t('stem.economicslab.profit_word', 'profit') + ' ' + econFmt(last.profit) + '.' + (hitEvent ? ' ' + t('stem.economicslab.event_happened', 'Something happened: choose how to respond.') : ''));
              };

              return React.createElement('div', { className: 'mt-4' },

                React.createElement('div', { className: 'flex items-center gap-3 mb-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200' },
                  React.createElement('span', { className: 'text-3xl', 'aria-hidden': 'true' }, enBiz.emoji),
                  React.createElement('div', { className: 'flex-1' },
                    React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, enBiz.businessName),
                    React.createElement('p', { className: 'text-[0.6875rem] text-amber-800' }, enBiz.description)),
                  React.createElement('div', { className: 'text-right' },
                    React.createElement('div', { className: 'text-lg font-bold ' + (enCash >= 0 ? 'text-green-800' : 'text-red-700') }, econFmt(enCash)),
                    React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, 'Day ' + enDay + ' | Rep: ' + Math.round(enRep) + '/100 | Staff: ' + enStaff))),

                enCash < 0 && React.createElement('div', { className: 'text-[0.6875rem] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3', role: 'alert' },
                  t('stem.economicslab.biz_cash_warning', '⚠️ Your business is losing money — cash is negative. Check your unit economics: does price cover unit cost AND your share of fixed costs? Raising price, cutting costs, or building reputation are your levers.')),

                // Levers
                React.createElement('div', { className: 'grid grid-cols-3 gap-2 mb-3' },
                  React.createElement('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },
                    React.createElement('label', { className: 'block text-[0.6875rem] font-bold text-amber-800 mb-1' }, '💲 Price per ' + enBiz.unitName + ': $' + enPrice.toFixed(2),
                      React.createElement('input', {
                        type: 'range', 'aria-valuetext': '$' + enPrice.toFixed(2) + ' per ' + enBiz.unitName, 'aria-label': t('stem.economicslab.price_per_unit', 'Price per unit, dollars'),
                        min: Math.max(0.05, Math.round(ref * 0.25 / priceStep) * priceStep), max: Math.round(ref * 3 / priceStep) * priceStep, step: priceStep, value: enPrice,
                        onChange: function (e) { upd('enBizPrice', parseFloat(e.target.value)); },
                        className: 'w-full accent-amber-500'
                      })),
                    React.createElement('div', { className: 'text-[0.6875rem] text-amber-800 mt-0.5' }, 'Suggested: $' + ref.toFixed(2)),
                    enPrice < unitCost && React.createElement('div', { className: 'text-[0.6875rem] text-red-700 font-bold mt-1', role: 'alert' }, t('stem.economicslab.below_cost_warning', '⚠️ Price is below unit cost — you lose money on EVERY sale.')),
                    enPrice > ref * 2 && React.createElement('div', { className: 'text-[0.6875rem] text-amber-800 mt-1' }, t('stem.economicslab.high_price_hint', '📚 Price is far above suggested — expect demand to fall (price elasticity).'))),
                  React.createElement('div', { className: 'bg-sky-50 rounded-xl p-3 border border-sky-200' },
                    React.createElement('div', { className: 'text-[0.6875rem] font-bold text-sky-900 mb-1' }, '👥 ' + t('stem.economicslab.staff_label', 'Staff') + ': ' + enStaff),
                    React.createElement('div', { className: 'flex gap-1 mb-1' },
                      React.createElement('button', { type: 'button', 'aria-label': t('stem.economicslab.staff_minus', 'Let one staff member go'), disabled: enStaff <= 0, style: { opacity: enStaff <= 0 ? 0.5 : 1 }, onClick: function () { upd('enBizEmployees', Math.max(0, enStaff - 1)); }, className: 'flex-1 py-1 rounded-lg text-xs font-bold bg-white border border-sky-300 text-sky-900' }, '−'),
                      React.createElement('button', { type: 'button', 'aria-label': t('stem.economicslab.staff_plus', 'Hire one staff member'), disabled: enStaff >= 20, style: { opacity: enStaff >= 20 ? 0.5 : 1 }, onClick: function () { upd('enBizEmployees', Math.min(20, enStaff + 1)); }, className: 'flex-1 py-1 rounded-lg text-xs font-bold bg-white border border-sky-300 text-sky-900' }, '+')),
                    React.createElement('div', { className: 'text-[0.6875rem] text-sky-900' }, t('stem.economicslab.staff_each', 'Each: +') + enBiz.staffCapacity + ' ' + enBiz.unitName + 's/day ' + t('stem.economicslab.staff_capacity_for', 'capacity for') + ' $' + enBiz.staffWage + '/day')),
                  React.createElement('div', { className: 'bg-fuchsia-50 rounded-xl p-3 border border-fuchsia-200' },
                    React.createElement('label', { className: 'block text-[0.6875rem] font-bold text-fuchsia-900 mb-1' }, '📣 ' + t('stem.economicslab.marketing_label', 'Marketing') + ': $' + Math.round(enMarketing) + '/day',
                      React.createElement('input', { type: 'range', min: 0, max: Math.max(20, Math.round(ref * enBiz.baseDemand * 0.6 / 5) * 5), step: 5, value: enMarketing, 'aria-label': t('stem.economicslab.marketing_aria', 'Marketing spend per day, dollars'), onChange: function (e) { upd('enBizMarketing', parseFloat(e.target.value)); }, className: 'w-full accent-fuchsia-600' })),
                    React.createElement('div', { className: 'text-[0.6875rem] text-fuchsia-900' }, t('stem.economicslab.marketing_lift', 'About') + ' +' + Math.round((E.bizMarketingLift(enBiz, enMarketing) - 1) * 100) + '% ' + t('stem.economicslab.marketing_lift_2', 'more customers (diminishing returns)')))),

                // Unit economics
                React.createElement('div', { className: 'grid grid-cols-3 gap-2 mb-3' },
                  React.createElement('div', { className: 'bg-blue-50 rounded-xl p-3 border border-blue-200 text-center' },
                    React.createElement('div', { className: 'text-[0.6875rem] text-blue-800 font-bold' }, t('stem.economicslab.gross_margin', 'Gross margin per sale')),
                    React.createElement('div', { className: 'text-lg font-bold ' + ((enPrice - unitCost) / enPrice * 100 > 30 ? 'text-green-800' : 'text-amber-800') }, ((enPrice - unitCost) / enPrice * 100).toFixed(0) + '%'),
                    React.createElement('div', { className: 'text-[0.6875rem] text-blue-800' }, t('stem.economicslab.per_unit_cost', 'Unit cost') + ': $' + unitCost.toFixed(2))),
                  React.createElement('div', { className: 'bg-purple-50 rounded-xl p-3 border border-purple-200 text-center' },
                    React.createElement('div', { className: 'text-[0.6875rem] text-purple-800 font-bold' }, 'Break-Even'),
                    React.createElement('div', { className: 'text-lg font-bold text-purple-800' }, isFinite(breakEven) ? breakEven : '∞'),
                    React.createElement('div', { className: 'text-[0.6875rem] text-purple-800' }, enBiz.unitName + 's/day ' + t('stem.economicslab.to_cover', 'to cover') + ' $' + Math.round(fixedNow + enStaff * enBiz.staffWage + enMarketing) + '/day')),
                  React.createElement('div', { className: 'bg-teal-50 rounded-xl p-3 border border-teal-200 text-center' },
                    React.createElement('div', { className: 'text-[0.6875rem] text-teal-900 font-bold' }, t('stem.economicslab.capacity_label', 'Capacity')),
                    React.createElement('div', { className: 'text-lg font-bold text-teal-900' }, capacity),
                    React.createElement('div', { className: 'text-[0.6875rem] text-teal-900' }, enBiz.unitName + 's/day'))),

                // Event
                ev ? React.createElement('div', { className: 'bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200 mb-3', role: 'status' },
                  React.createElement('div', { className: 'flex items-start gap-2 mb-3' },
                    React.createElement('span', { className: 'text-2xl', 'aria-hidden': 'true' }, econStr(ev.emoji, 12) || '⚡'),
                    React.createElement('div', null,
                      React.createElement('h4', { className: 'text-sm font-bold text-purple-800' }, econStr(ev.title, 80)),
                      React.createElement('p', { className: 'text-xs text-purple-800 mt-1' }, econStr(ev.description, 400)),
                      econStr(ev.lesson, 400) && React.createElement('div', { className: 'mt-2 bg-purple-100 rounded-lg px-3 py-2 text-[0.6875rem] text-purple-900 border border-purple-200' },
                        React.createElement('span', { className: 'font-bold' }, t('stem.economicslab.business_concept', '📚 Business Concept: ')),
                        econStr(ev.lesson, 400)))),
                  React.createElement('div', { className: 'grid gap-2' },
                    evChoices.map(function (c, ci) {
                      return React.createElement('button', { key: ci, type: 'button', onClick: function () { chooseEvent(c); }, className: 'w-full text-left p-3 rounded-xl border-2 border-purple-100 hover:border-purple-400 bg-white hover:bg-purple-50 transition-all text-xs' },
                        React.createElement('div', { className: 'font-bold text-slate-700' }, econStr(c.label, 120)),
                        React.createElement('div', { className: 'mt-0.5 flex gap-3 flex-wrap text-[0.6875rem]' }, bizChips(effOf(c)).map(function (ch, k) { return React.createElement('span', { key: k, className: ch.cls }, ch.text); })));
                    }))
                ) : React.createElement('div', { className: 'flex gap-2 mb-3' },
                  React.createElement('button', { type: 'button', onClick: function () { runDays(1); }, className: 'flex-1 py-4 rounded-2xl text-sm font-bold shadow-lg transition-all bg-purple-700 text-white hover:bg-purple-800' }, '☀️ ' + t('stem.economicslab.open_for_business', 'Open for Business!') + ' (Day ' + enDay + ')'),
                  React.createElement('button', { type: 'button', onClick: function () { runDays(5); }, className: 'py-4 px-4 rounded-2xl text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300' }, t('stem.economicslab.run_5_days', '⏩ Run 5 days'))),

                econAI && React.createElement('div', { className: 'flex items-center gap-2 flex-wrap mb-3', role: 'group', 'aria-label': t('stem.economicslab.biz_event_source', 'Where business events come from') },
                  React.createElement('span', { className: 'text-[0.6875rem] font-bold text-slate-700' }, t('stem.economicslab.event_source_label', 'Events:')),
                  [{ id: 'deck', label: t('stem.economicslab.src_deck_btn', '📚 Built-in deck (instant)') }, { id: 'ai', label: t('stem.economicslab.src_ai_btn', '✨ AI-generated') }].map(function (o) {
                    return React.createElement('button', { key: o.id, type: 'button', 'aria-pressed': bizEventSource === o.id ? 'true' : 'false', onClick: function () { upd('enEventSource', o.id); }, className: 'text-[0.6875rem] px-2 py-1 rounded-full border font-bold ' + (bizEventSource === o.id ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-slate-700 border-slate-300') }, o.label);
                  })),

                // Last day's report
                lastDay && React.createElement('div', { className: 'bg-white rounded-xl border border-slate-300 p-3 mb-3', 'data-economicslab-day-report': 'true' },
                  React.createElement('h4', { className: 'text-[0.6875rem] font-bold text-slate-700 uppercase tracking-wide mb-1 m-0' }, '🧾 ' + t('stem.economicslab.day_report', 'Day') + ' ' + num(lastDay.day, 0) + ' (' + econStr(lastDay.dayName, 4) + ', ' + econStr(lastDay.weatherIcon, 12) + ' ' + econStr(lastDay.weather, 10) + ')'),
                  React.createElement('div', { className: 'grid grid-cols-2 gap-x-4 text-[0.6875rem]' },
                    React.createElement('div', null,
                      React.createElement('div', { className: 'text-slate-700' }, t('stem.economicslab.wanted_to_buy', 'Wanted to buy') + ': ' + num(lastDay.demand, 0)),
                      React.createElement('div', { className: 'text-slate-700' }, t('stem.economicslab.served', 'Served') + ': ' + num(lastDay.customers, 0) + (num(lastDay.turnedAway, 0) > 0 ? ' (' + lastDay.turnedAway + ' ' + t('stem.economicslab.turned_away', 'turned away') + ')' : '')),
                      React.createElement('div', { className: 'text-green-800 font-bold' }, t('stem.economicslab.revenue_word', 'Revenue') + ': ' + num(lastDay.customers, 0) + ' × $' + num(lastDay.price, ref).toFixed(2) + ' = ' + econFmt(lastDay.revenue))),
                    React.createElement('div', null,
                      React.createElement('div', { className: 'text-red-700' }, t('stem.economicslab.cost_ingredients', 'Unit costs') + ': −' + econFmt(lastDay.variable).replace('−', '')),
                      React.createElement('div', { className: 'text-red-700' }, t('stem.economicslab.cost_fixed', 'Fixed + staff + ads') + ': −' + econFmt(num(lastDay.fixed, 0) + num(lastDay.staffCost, 0) + num(lastDay.marketing, 0)).replace('−', '')),
                      React.createElement('div', { className: 'font-bold ' + (num(lastDay.profit, 0) >= 0 ? 'text-green-800' : 'text-red-700') }, t('stem.economicslab.profit_word_cap', 'Profit') + ': ' + (num(lastDay.profit, 0) >= 0 ? '+' : '') + econFmt(lastDay.profit)))),
                  lostRecent > 0 && React.createElement('p', { className: 'text-[0.6875rem] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2 m-0' }, '💡 ' + t('stem.economicslab.coach_capacity_1', 'You turned away') + ' ' + lostRecent + ' ' + t('stem.economicslab.coach_capacity_2', 'customers in the last') + ' ' + recent.length + ' ' + t('stem.economicslab.coach_capacity_3', 'days. A staff member adds') + ' ' + enBiz.staffCapacity + ' ' + t('stem.economicslab.coach_capacity_4', 'capacity for') + ' $' + enBiz.staffWage + '/day, ' + t('stem.economicslab.coach_capacity_5', 'and each lost sale was worth') + ' $' + (enPrice - unitCost).toFixed(2) + '. ' + t('stem.economicslab.coach_capacity_6', 'Worth it? Or would a higher price earn more from the customers you can serve?')),
                  Array.isArray(lastDay.notes) && lastDay.notes.indexOf('overpriced') !== -1 && React.createElement('p', { className: 'text-[0.6875rem] text-red-700 m-0 mt-1' }, '📉 ' + t('stem.economicslab.coach_overpriced', 'Customers think you are overpriced, so your reputation slipped.')),
                  typeof lastDay.repTarget === 'number' && React.createElement('p', { className: 'text-[0.6875rem] text-slate-700 m-0 mt-1' }, '⭐ ' + t('stem.economicslab.rep_heading', 'Reputation is heading toward about') + ' ' + lastDay.repTarget + '/100 ' + t('stem.economicslab.rep_heading_2', '(set by value for money, service and quality; news and reviews fade).'))),

                // Chart mode
                enHistory.length > 0 && React.createElement('div', { className: 'flex items-center gap-2 mb-2', role: 'group', 'aria-label': t('stem.economicslab.chart_mode', 'Chart above') },
                  React.createElement('span', { className: 'text-[0.6875rem] font-bold text-slate-700' }, t('stem.economicslab.chart_mode', 'Chart above') + ':'),
                  [{ id: 'profit', label: t('stem.economicslab.chart_profit', '📈 Profit over time') }, { id: 'price', label: t('stem.economicslab.chart_price', '🔬 Price lab') }].map(function (o) {
                    var on = (d.enChart === 'price' ? 'price' : 'profit') === o.id;
                    return React.createElement('button', { key: o.id, type: 'button', 'aria-pressed': on ? 'true' : 'false', onClick: function () { upd('enChart', o.id); }, className: 'text-[0.6875rem] px-2 py-1 rounded-full border font-bold ' + (on ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300') }, o.label);
                  }),
                  d.enChart === 'price' && React.createElement('span', { className: 'text-[0.6875rem] text-slate-600' }, t('stem.economicslab.price_lab_prices', 'Prices tried') + ': ' + Object.keys(enPricesTried).length)),

                // Stats + History
                enHistory.length > 0 && React.createElement('div', { className: 'bg-white rounded-xl border border-slate-400 p-3', tabIndex: 0, role: 'region', 'aria-label': t('stem.economicslab.business_history', '📈 Business History') },
                  React.createElement('h4', { className: 'text-xs font-bold text-slate-600 mb-2' }, t('stem.economicslab.business_history', '📈 Business History')),
                  enHistory.slice(-7).reverse().map(function (dh, dhi) {
                    return React.createElement('div', { key: dhi, className: 'flex justify-between gap-2 text-[0.6875rem] py-1 border-b border-slate-50' },
                      React.createElement('span', { className: 'text-slate-600' }, 'Day ' + num(dh.day, 0) + ' ' + econStr(dh.weatherIcon, 12)),
                      React.createElement('span', { className: 'text-slate-600' }, '$' + num(dh.price, ref).toFixed(2)),
                      React.createElement('span', { className: 'text-slate-600' }, num(dh.customers, 0) + ' customers'),
                      React.createElement('span', { className: 'text-blue-800' }, 'Rev $' + num(dh.revenue, 0).toFixed(0)),
                      React.createElement('span', { className: num(dh.profit, 0) >= 0 ? 'text-green-800 font-bold' : 'text-red-700 font-bold' }, (num(dh.profit, 0) >= 0 ? '+' : '') + '$' + num(dh.profit, 0).toFixed(0)));
                  })),

                React.createElement('button', {
                  type: 'button',
                  onClick: function () { updMany({ enBusiness: null, enInput: '', enBizEvent: null, enBizHistory: [], enBizEmployees: 0, enBizMarketing: 0, enLoading: false }); if (addToast) addToast('Business closed. Start a new one!', 'info'); },
                  className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-400'
                }, t('stem.economicslab.close_business_start_new', '♻ Close Business & Start New'))

              );

            })(),

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
              var mRate = (typeof d.macroInterest === 'number' && isFinite(d.macroInterest)) ? d.macroInterest : 5.25;
              var mSpend = E.clamp(num(d.macroSpend, 0), -3, 3);
              var mTax = E.clamp(num(d.macroTax, 0), -3, 3);
              var mNeutral = 3;
              var mRealRate = mRate - macroInflation;
              var mTaylorRaw = 1 + macroInflation + 0.5 * (macroInflation - 2) + 0.5 * 2 * (4 - macroUnemployment);
              var mTaylor = Math.min(20, Math.max(0, Math.round(mTaylorRaw * 4) / 4));
              // Missions: a historical starting point, a goal, a constraint and
              // a deadline. While one is active, random shocks are replaced by
              // the mission's scripted ones so the result reflects policy.
              var mRec = (d.macroMission && typeof d.macroMission === 'object') ? d.macroMission : null;
              var mission = mRec ? E.missionById(mRec.id) : null;
              var mResults = mission && Array.isArray(mRec.results) ? mRec.results.filter(function (r) { return r && typeof r === 'object'; }) : [];
              var mEval = mission ? E.evaluateMission(mission, mResults) : { status: 'none' };
              var mActive = mEval.status === 'active';
              var MISSION_TEXT = {
                volcker: { title: t('stem.economicslab.mission_volcker', 'Break the Great Inflation (1980)'), brief: t('stem.economicslab.mission_volcker_brief_2', 'Inflation is 13%, and the Fed’s rate of about 11% is still below it: real rates are negative, so money is cheap. Get inflation to 4% or below within 3 years without letting unemployment pass 10.5%.'), debrief: t('stem.economicslab.mission_volcker_debrief_2', 'In 1979–81 Fed chair Paul Volcker pushed rates near 20%, far above inflation. Inflation fell from about 14% to under 4% by 1983, at the cost of a deep recession with unemployment near 11%.') },
                recovery: { title: t('stem.economicslab.mission_recovery', 'Climb out of the Great Recession (2009)'), brief: t('stem.economicslab.mission_recovery_brief_3', 'Output is shrinking, unemployment is 9.5%, and rates are already near zero, so the central bank cannot cut much more. At the end of year 5, unemployment must be 7.5% or below, and inflation must stay at or below 4% every year: an all-out boom overheats before then.'), debrief: t('stem.economicslab.mission_recovery_debrief_2', 'After 2008 the Fed cut rates to near zero (the “zero lower bound”) and bought bonds, and Congress passed a stimulus package. Unemployment fell slowly, from 10% in late 2009 to about 7.5% in 2013.') },
                cooldown: { title: t('stem.economicslab.mission_cooldown', 'Cool an overheating economy (2022)'), brief: t('stem.economicslab.mission_cooldown_brief_3', 'Inflation is 7% and rates are still near zero, so real rates are deeply negative. Get inflation to 4% or below within 3 years WITHOUT a recession: growth must stay at 0% or above.'), debrief: t('stem.economicslab.mission_cooldown_debrief_2', 'In 2022–23 the Fed raised rates from near 0% to over 5%. Inflation fell from about 9% toward 3% while unemployment stayed under 4%. Many economists call 2022–24 a rare soft landing.') },
                oilshock: { title: t('stem.economicslab.mission_oilshock', 'Weather an oil shock (1973)'), brief: t('stem.economicslab.mission_oilshock_brief_3', 'An oil embargo is about to hit, two years in a row, and rates are about 6%. Fight the price spike too hard and unemployment soars; ignore it and inflation sticks. At the end of year 5, inflation must be 4.5% or below AND unemployment 6.5% or below.'), debrief: t('stem.economicslab.mission_oilshock_debrief_2', 'The 1973 embargo (and a second shock in 1979) caused stagflation. In this model people still expect inflation to drift back toward 2%, so steady policy near neutral works. In the 1970s those expectations came unanchored: policy that accommodated the shocks let inflation spiral, and stopping it took Volcker’s recession.') },
                softlanding: { title: t('stem.economicslab.mission_softlanding', 'Stick the soft landing'), brief: t('stem.economicslab.mission_softlanding_brief_2', 'Inflation is easing and rates are 5.25%. Keep the economy healthy for 4 years in a row (growth 1.5–4%, inflation 1–3.5%, unemployment under 5.5%) within 6 years.'), debrief: t('stem.economicslab.mission_softlanding_debrief_2', 'A soft landing slows an economy just enough to tame inflation without a recession. The Fed managed it in 1994–95, and many economists say it did again in 2022–24; most tightening cycles have ended in recession.') }
              };
              var MISSION_METRIC = { gdp: t('stem.economicslab.gdp_growth', 'GDP Growth'), inf: t('stem.economicslab.inflation_2', 'Inflation'), unemp: t('stem.economicslab.unemployment_3', 'Unemployment') };
              var mCondText = function (c) { return MISSION_METRIC[c[0]] + ' ' + (c[1] === '<=' ? '≤' : c[1] === '>=' ? '≥' : c[1]) + ' ' + c[2] + '%'; };
              var mNow = { gdp: macroGDP, inf: macroInflation, unemp: macroUnemployment };
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
                // Policy works through the REAL rate (nominal − inflation), set
                // against a ~1% neutral real rate (mNeutral − 2 at the 2% target).
                // A 5% rate with 13% inflation is loose, not tight; neutral policy
                // settles at 2% growth and 2% inflation. Missions pin the noise.
                // Unemployment has a ~4% natural rate: slack below it pushes
                // inflation up (above it, down), the economy drifts back toward it,
                // and growth cannot push unemployment below 2% (capacity). So
                // stimulus buys a temporary boom and lasting inflation, not faster
                // growth forever.
                // Autopilot (free play only) sets the rate by the Taylor rule before the year runs.
                var mAuto = !mActive && d.macroAutopilot === true;
                if (mAuto) { mRate = mTaylor; mRealRate = mRate - macroInflation; }
                var mJitter = mActive ? function () { return 0.5; } : Math.random;
                var demandImpulse = mSpend * 0.8 - mTax * 0.5 - (mRate - macroInflation - (mNeutral - 2)) * 0.4;
                var mShockId = mActive && mission.shocks ? mission.shocks[mResults.length + 1] : null;
                var shock = mActive ? (mShockId === 'oil' ? MACRO_SHOCKS[0] : null) : (Math.random() < 0.4 ? MACRO_SHOCKS[Math.floor(Math.random() * MACRO_SHOCKS.length)] : null);
                var gdpNew = mClamp(Math.min(2 + (macroUnemployment - 2) / 0.35, 0.55 * macroGDP + 0.9 + demandImpulse + 0.1 * (macroUnemployment - 4) + (shock ? shock.gdp : 0) + (mJitter() - 0.5) * 0.6), -8, 10);
                var infNew = mClamp(0.75 * macroInflation + 0.5 + 0.3 * demandImpulse - 0.08 * (mRate - macroInflation - (mNeutral - 2)) + 0.15 * (4 - macroUnemployment) + (shock ? shock.inf : 0) + (mJitter() - 0.5) * 0.4, -2, 15);
                var unempNew = mClamp(macroUnemployment - 0.35 * (gdpNew - 2) + (shock ? shock.unemp : 0), 2, 15);
                var tradeNew = mClamp(macroTrade + (shock ? shock.trade : 0) - 0.05 * demandImpulse + (mJitter() - 0.5) * 0.4, -5, 5);
                gdpNew = Math.round(gdpNew * 10) / 10; infNew = Math.round(infNew * 10) / 10;
                unempNew = Math.round(unempNew * 10) / 10; tradeNew = Math.round(tradeNew * 10) / 10;
                var lines = [];
                if (mSpend > 0) lines.push(t('stem.economicslab.report_spend_up', '\uD83C\uDFDB\uFE0F Government spending ') + '+' + mSpend + t('stem.economicslab.report_spend_up_2', '% of GDP added demand (Keynesian multiplier) \u2014 but deficits must eventually be financed.'));
                if (mSpend < 0) lines.push(t('stem.economicslab.report_spend_down', '\uD83C\uDFDB\uFE0F Austerity: spending cut ') + mSpend + t('stem.economicslab.report_spend_down_2', '% of GDP removed demand from the economy.'));
                if (mTax > 0) lines.push(t('stem.economicslab.report_tax_up', '\uD83D\uDCB8 Tax increase of ') + mTax + t('stem.economicslab.report_tax_up_2', '% left households less to spend, cooling demand.'));
                if (mTax < 0) lines.push(t('stem.economicslab.report_tax_down', '\uD83D\uDCB8 Tax cut of ') + Math.abs(mTax) + t('stem.economicslab.report_tax_down_2', '% left households more to spend, boosting demand.'));
                if (mRealRate - (mNeutral - 2) > 0.5) lines.push(t('stem.economicslab.report_real_high', '\uD83C\uDFE6 The real interest rate (your rate minus inflation) was above its ~1% neutral level, so borrowing was expensive \u2014 investment and hiring slowed (monetary brake).'));
                if (mRealRate - (mNeutral - 2) < -0.5) lines.push(t('stem.economicslab.report_real_low', '\uD83C\uDFE6 The real interest rate (your rate minus inflation) was below its ~1% neutral level, so borrowing was cheap after inflation \u2014 credit-fueled demand rose (monetary gas pedal).'));
                lines.push(t('stem.economicslab.report_okun', '\uD83D\uDCCA Okun\'s law: growth of ') + gdpNew.toFixed(1) + t('stem.economicslab.report_okun_2', '% vs the ~2% trend moved unemployment to ') + unempNew.toFixed(1) + '%.');
                if (mAuto) lines.push('🤖 ' + t('stem.economicslab.report_autopilot', 'Autopilot followed the Taylor rule and set the rate to') + ' ' + mRate.toFixed(2) + '%.');
                else if (!mActive) lines.push('📏 ' + t('stem.economicslab.report_taylor', 'The Taylor rule would have set') + ' ' + mTaylor.toFixed(2) + '%; ' + t('stem.economicslab.report_taylor_you', 'you chose') + ' ' + mRate.toFixed(2) + '%.');
                if (mGoal === 'cool_inflation') lines.push((infNew < macroInflation && demandImpulse < 0 ? '\uD83C\uDFAF ' : '\u26A0\uFE0F ') + t('stem.economicslab.goal_check_inflation', 'Goal check \u2014 inflation: ') + macroInflation.toFixed(1) + '% \u2192 ' + infNew.toFixed(1) + '%' + (infNew < macroInflation ? (demandImpulse < 0 ? ' \u2713' : ' ' + t('stem.economicslab.goal_luck_inflation', '(it fell, but not because of you: your policy ADDED demand, so a tighter stance would have cooled it faster)')) : ' ' + t('stem.economicslab.goal_missed_inflation', '(moved the wrong way \u2014 which lever raises the cost of borrowing?)')));
                if (mGoal === 'boost_growth') lines.push((gdpNew > macroGDP && demandImpulse > 0 ? '\uD83C\uDFAF ' : '\u26A0\uFE0F ') + t('stem.economicslab.goal_check_growth', 'Goal check \u2014 GDP growth: ') + macroGDP.toFixed(1) + '% \u2192 ' + gdpNew.toFixed(1) + '%' + (gdpNew > macroGDP ? (demandImpulse > 0 ? ' \u2713' : ' ' + t('stem.economicslab.goal_luck_growth', '(it rose, but not because of you: your policy took demand OUT)')) : ' ' + t('stem.economicslab.goal_missed_growth', '(what adds demand \u2014 spending, tax cuts, or cheaper credit?)')));
                if (mGoal === 'cut_unemployment') lines.push((unempNew < macroUnemployment && demandImpulse > 0 ? '\uD83C\uDFAF ' : '\u26A0\uFE0F ') + t('stem.economicslab.goal_check_unemployment', 'Goal check \u2014 unemployment: ') + macroUnemployment.toFixed(1) + '% \u2192 ' + unempNew.toFixed(1) + '%' + (unempNew < macroUnemployment ? (demandImpulse > 0 ? ' \u2713' : ' ' + t('stem.economicslab.goal_luck_unemployment', '(it fell, but not because of you: your policy took demand OUT)')) : ' ' + t('stem.economicslab.goal_missed_unemployment', "(Okun's law: unemployment falls when growth beats the ~2% trend)")));
                var hist = macroHistory.slice(-29);
                hist.push({ year: macroYear, gdp: gdpNew, inflation: infNew, unemployment: unempNew, interest: mRate, auto: mAuto || undefined, from: macroHistory.length === 0 ? { gdp: macroGDP, inf: macroInflation, un: macroUnemployment } : undefined });
                var mPatch = {};
                if (mActive) {
                  var mRes = mResults.concat([{ gdp: gdpNew, inf: infNew, unemp: unempNew }]);
                  var mOut = E.evaluateMission(mission, mRes);
                  mPatch.macroMission = Object.assign({}, mRec, { results: mRes });
                  var mTitle = (MISSION_TEXT[mission.id] || {}).title || mission.id;
                  if (mOut.status === 'won') {
                    lines.push('🎖️ ' + t('stem.economicslab.mission_won_line', 'Mission accomplished:') + ' ' + mTitle + '!');
                    if (macroMissionWins.indexOf(mission.id) === -1) mPatch.macroMissionWins = macroMissionWins.concat([mission.id]);
                    addXP(50, 'Macro: mission accomplished');
                    if (stemCelebrate) { try { stemCelebrate(); } catch (e) { /* optional host effect */ } }
                  } else if (mOut.status === 'lost') {
                    lines.push('❌ ' + t('stem.economicslab.mission_lost_line', 'Mission failed:') + ' ' + (mOut.reason === 'guard' ? t('stem.economicslab.mission_lost_guard', 'the constraint broke') + ' (' + mCondText(mOut.guard) + ')' : t('stem.economicslab.mission_lost_time', 'time ran out before the goal was met')) + '.');
                  }
                }
                mPatch.macroGDP = gdpNew; mPatch.macroInflation = infNew;
                if (mAuto) mPatch.macroInterest = mRate;
                mPatch.macroUnemployment = unempNew; mPatch.macroTrade = tradeNew;
                mPatch.macroYear = macroYear + 1; mPatch.macroHistory = hist;
                mPatch.macroReport = { year: macroYear, shock: shock, lines: lines };
                updMany(mPatch);
                if (shock && shock.lesson) {
                  var glM = econGlossaryList.slice();
                  if (!glM.some(function (g) { return g.concept === shock.name; })) { glM.push({ tab: 'Macro', concept: shock.name, explanation: shock.lesson }); upd('econGlossary', glM); }
                }
                if (typeof addXP === 'function' && !mAuto) addXP(15, 'Macro: simulated a policy year');
                if (addToast) addToast('\uD83C\uDFDB\uFE0F Year ' + macroYear + (shock ? ': ' + shock.icon + ' ' + shock.name : ' complete'), shock && shock.gdp < 0 ? 'warning' : 'success');
                if (announceToSR) announceToSR('Year ' + macroYear + ' simulated. GDP growth ' + gdpNew.toFixed(1) + ' percent, inflation ' + infNew.toFixed(1) + ' percent, unemployment ' + unempNew.toFixed(1) + ' percent.' + (shock ? ' Shock: ' + shock.name + '.' : ''));
              };
              return React.createElement('div', { className: 'mt-4', 'data-economicslab-macro-controls': 'true' },
                // Chart view: time series on one shared % axis, or a Phillips curve.
                React.createElement('div', { className: 'flex flex-wrap items-center gap-2 mb-3', role: 'group', 'aria-label': t('stem.economicslab.macro_chart_view', 'Chart view'), 'data-economicslab-macro-chart-toggle': 'true' },
                  React.createElement('span', { className: 'text-[0.6875rem] font-bold text-slate-700' }, t('stem.economicslab.macro_chart_view', 'Chart view') + ':'),
                  [['time', t('stem.economicslab.macro_chart_time', '📈 Over time')], ['phillips', t('stem.economicslab.macro_chart_phillips', '🔀 Phillips curve')]].map(function (opt) {
                    var on = (d.macroChart === 'phillips' ? 'phillips' : 'time') === opt[0];
                    return React.createElement('button', { key: opt[0], type: 'button', 'aria-pressed': on ? 'true' : 'false', onClick: function () { upd('macroChart', opt[0]); }, className: 'px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold border ' + (on ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white text-indigo-800 border-indigo-300') }, opt[1]);
                  }),
                  React.createElement('span', { className: 'text-[0.6875rem] text-slate-600 italic' }, d.macroChart === 'phillips'
                    ? t('stem.economicslab.macro_chart_phillips_hint', 'Each dot is a year. Down-and-right is the classic trade-off; up-and-right is stagflation.')
                    : t('stem.economicslab.macro_chart_time_hint', 'All three lines share one % scale, so you can compare their heights.'))
                ),
                // Missions
                React.createElement('div', { className: 'bg-gradient-to-r from-indigo-50 to-sky-50 rounded-xl p-3 border border-indigo-200 mb-3', 'data-economicslab-missions': 'true' },
                  !mission ? React.createElement('div', null,
                    React.createElement('h4', { className: 'text-sm font-bold text-indigo-900 mb-1 m-0' }, '🎖️ ' + t('stem.economicslab.missions_title', 'Policy missions')),
                    React.createElement('p', { className: 'text-[0.6875rem] text-slate-700 mb-2 m-0' }, t('stem.economicslab.missions_intro', 'Take the chair at a real turning point in history. Each mission has a goal, a constraint and a deadline. Doing nothing fails, and so does overdoing it.')),
                    React.createElement('div', { className: 'grid grid-cols-1 gap-1.5' },
                      E.MACRO_MISSIONS.map(function (m) {
                        var txt = MISSION_TEXT[m.id] || {};
                        var won = macroMissionWins.indexOf(m.id) !== -1;
                        return React.createElement('button', {
                          key: m.id, type: 'button',
                          onClick: function () {
                            var s0 = m.start;
                            updMany({ macroGDP: s0.gdp, macroInflation: s0.inf, macroUnemployment: s0.unemp, macroInterest: s0.rate, macroTrade: s0.trade, macroYear: s0.year, macroHistory: [], macroReport: null, macroSpend: 0, macroTax: 0, macroGoal: null, macroAutopilot: false, macroMission: { id: m.id, results: [] } });
                            if (announceToSR) announceToSR(t('stem.economicslab.mission_started', 'Mission started:') + ' ' + (txt.title || m.id) + '. ' + (txt.brief || ''));
                          },
                          className: 'text-left p-2 rounded-lg border bg-white hover:border-indigo-400 transition-all ' + (won ? 'border-green-300' : 'border-indigo-100')
                        },
                          React.createElement('div', { className: 'text-xs font-bold text-slate-800' }, (won ? '✅ ' : '') + m.icon + ' ' + (txt.title || m.id)),
                          React.createElement('div', { className: 'text-[0.6875rem] text-slate-600' }, txt.brief || ''));
                      }))
                  ) : React.createElement('div', null,
                    React.createElement('div', { className: 'flex items-center justify-between gap-2 flex-wrap mb-1' },
                      React.createElement('h4', { className: 'text-sm font-bold text-indigo-900 m-0' }, mission.icon + ' ' + ((MISSION_TEXT[mission.id] || {}).title || mission.id)),
                      React.createElement('span', { className: 'text-[0.6875rem] font-bold text-indigo-900' }, t('stem.economicslab.mission_year', 'Year') + ' ' + Math.min(mResults.length, mission.years) + '/' + mission.years)),
                    React.createElement('p', { className: 'text-[0.6875rem] text-slate-700 mb-2 m-0' }, (MISSION_TEXT[mission.id] || {}).brief || ''),
                    React.createElement('div', { className: 'grid grid-cols-2 gap-2 text-[0.6875rem] mb-2' },
                      React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-indigo-100' },
                        React.createElement('div', { className: 'font-bold text-indigo-900 mb-0.5' }, '🎯 ' + t('stem.economicslab.mission_goal', 'Goal') + (mission.streak ? ' (' + mission.streak + ' ' + t('stem.economicslab.mission_in_a_row', 'years in a row') + ')' : mission.winAtEnd ? ' (' + t('stem.economicslab.mission_at_end', 'at the end of year') + ' ' + mission.years + ')' : '')),
                        mission.win.map(function (c, ci) { var ok = E.missionCmp(mNow[c[0]], c[1], c[2]); return React.createElement('div', { key: ci, className: ok ? 'text-green-800' : 'text-slate-700' }, (ok ? '✅ ' : '⬜ ') + mCondText(c) + ' · ' + t('stem.economicslab.mission_now', 'now') + ' ' + mNow[c[0]].toFixed(1) + '%'); }),
                        mission.streak ? React.createElement('div', { className: 'text-slate-700 mt-0.5' }, t('stem.economicslab.mission_streak', 'Healthy years in a row') + ': ' + num(mEval.streak, 0) + '/' + mission.streak) : null),
                      React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-indigo-100' },
                        React.createElement('div', { className: 'font-bold text-indigo-900 mb-0.5' }, '🚧 ' + t('stem.economicslab.mission_constraint', 'Constraint')),
                        mission.guard.length ? mission.guard.map(function (c, ci) { var ok = E.missionCmp(mNow[c[0]], c[1], c[2]); return React.createElement('div', { key: ci, className: ok ? 'text-slate-700' : 'text-red-700 font-bold' }, (ok ? '🟢 ' : '🔴 ') + mCondText(c) + ' ' + t('stem.economicslab.mission_every_year', 'every year')); }) : React.createElement('div', { className: 'text-slate-700' }, mission.shocks ? t('stem.economicslab.mission_shock_note', 'Oil shocks hit in years 1 and 2.') : '—'))),
                    mEval.status === 'won' && React.createElement('div', { className: 'bg-green-50 border border-green-300 rounded-lg p-2 text-[0.6875rem] text-green-900 mb-2', role: 'status' },
                      React.createElement('div', { className: 'font-bold' }, '🎖️ ' + t('stem.economicslab.mission_won', 'Mission accomplished in year') + ' ' + mEval.year + '!'),
                      React.createElement('div', null, '📚 ' + ((MISSION_TEXT[mission.id] || {}).debrief || ''))),
                    mEval.status === 'lost' && React.createElement('div', { className: 'bg-red-50 border border-red-300 rounded-lg p-2 text-[0.6875rem] text-red-900 mb-2', role: 'status' },
                      React.createElement('div', { className: 'font-bold' }, '❌ ' + (mEval.reason === 'guard' ? t('stem.economicslab.mission_lost_guard_2', 'Mission failed: the constraint broke in year') + ' ' + mEval.year + ' (' + mCondText(mEval.guard) + ').' : t('stem.economicslab.mission_lost_time_2', 'Mission failed: the goal was not met in time.'))),
                      React.createElement('div', null, t('stem.economicslab.mission_hint', 'Look at the year reports: which lever moved too much, or too little? Then try again.')),
                      React.createElement('div', { className: 'mt-1' }, '📚 ' + ((MISSION_TEXT[mission.id] || {}).debrief || ''))),
                    React.createElement('div', { className: 'flex gap-2' },
                      !mActive && React.createElement('button', { type: 'button', onClick: function () { var s0 = mission.start; updMany({ macroGDP: s0.gdp, macroInflation: s0.inf, macroUnemployment: s0.unemp, macroInterest: s0.rate, macroTrade: s0.trade, macroYear: s0.year, macroHistory: [], macroReport: null, macroSpend: 0, macroTax: 0, macroAutopilot: false, macroMission: { id: mission.id, results: [] } }); }, className: 'flex-1 py-1.5 rounded-lg text-[0.6875rem] font-bold bg-indigo-700 text-white' }, t('stem.economicslab.mission_retry', '↻ Try again')),
                      React.createElement('button', { type: 'button', onClick: function () { upd('macroMission', null); }, className: 'flex-1 py-1.5 rounded-lg text-[0.6875rem] font-bold bg-white text-indigo-900 border border-indigo-300' }, mActive ? t('stem.economicslab.mission_abandon', 'Abandon mission') : t('stem.economicslab.mission_back', 'Back to free play'))))),

                React.createElement('div', { className: 'flex items-center gap-2 mb-3 flex-wrap' },
                  React.createElement('span', { className: 'text-[0.6875rem] font-bold text-slate-600' }, t('stem.economicslab.policy_goal_label', '🎯 Policy goal (pick one, predict, then advance):')),
                  MACRO_GOALS.map(function (g) {
                    var isOn = mGoal === g.id;
                    return React.createElement('button', {
                      key: g.id, type: 'button', 'aria-pressed': isOn ? 'true' : 'false',
                      onClick: function () { upd('macroGoal', isOn ? null : g.id); },
                      className: 'text-[0.6875rem] px-2 py-1 rounded-full border font-bold ' + (isOn ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-300 hover:border-red-400')
                    }, g.label);
                  })
                ),
                React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3' },
                  React.createElement('div', { className: 'space-y-2 bg-blue-50 rounded-xl p-4 border border-blue-200' },
                    React.createElement('h4', { className: 'text-sm font-bold text-blue-700' }, t('stem.economicslab.central_bank', '\uD83C\uDFE6 Central Bank (Monetary Policy)')),
                    React.createElement('label', { className: 'block text-xs text-blue-600' }, t('stem.economicslab.policy_interest_rate', 'Policy Interest Rate: ') + mRate.toFixed(2) + '%'),
                    React.createElement('input', {
                      type: 'range', min: 0, max: 20, step: 0.25, value: Math.min(20, mRate),
                      disabled: !mActive && d.macroAutopilot === true, style: !mActive && d.macroAutopilot === true ? { opacity: 0.5 } : undefined,
                      'aria-label': t('stem.economicslab.policy_interest_rate_2', 'Policy interest rate, percent'),
                      'aria-valuetext': mRate.toFixed(2) + '%',
                      onChange: function (e) { upd('macroInterest', parseFloat(e.target.value)); },
                      className: 'w-full accent-blue-500'
                    }),
                    React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 bg-white rounded-lg p-2 border border-blue-100' },
                      t('stem.economicslab.real_rate_note', '\uD83D\uDCDA Real rate = nominal \u2212 inflation = ') + mRealRate.toFixed(1) + '%. ' +
                      (mRealRate - (mNeutral - 2) < -0.5
                        ? t('stem.economicslab.real_rate_below_neutral', 'That is below the ~1% neutral real rate: borrowers win, savers lose, and policy is stimulating the economy.')
                        : mRealRate - (mNeutral - 2) > 0.5
                          ? t('stem.economicslab.real_rate_above_neutral', 'That is above the ~1% neutral real rate: saving is rewarded, borrowing slows, and policy is braking the economy.')
                          : t('stem.economicslab.real_rate_near_neutral', 'That is close to the ~1% neutral real rate: policy is roughly neither braking nor stimulating.'))),
                    mActive
                      ? React.createElement('div', { className: 'text-[0.6875rem] text-slate-700 bg-white rounded-lg p-2 border border-blue-100', 'data-economicslab-taylor': 'hidden' }, '📏 ' + t('stem.economicslab.taylor_hidden', 'The Taylor-rule helper is off during missions: this one is your call. Try it in free play.'))
                      : React.createElement('div', { className: 'text-[0.6875rem] text-slate-800 bg-white rounded-lg p-2 border border-blue-100 space-y-1', 'data-economicslab-taylor': 'true' },
                          React.createElement('div', { className: 'font-bold text-blue-900' }, '📏 ' + t('stem.economicslab.taylor_title', 'Taylor rule suggests') + ' ' + mTaylor.toFixed(2) + '%'),
                          React.createElement('div', null, t('stem.economicslab.taylor_formula', 'Rate = 1% neutral real rate + inflation + ½ × (inflation − 2%) + ½ × output gap, reading the gap from unemployment as 2 × (4% − unemployment):') + ' 1 + ' + macroInflation.toFixed(1) + ' + ½ × (' + (macroInflation - 2).toFixed(1) + ') + ½ × (' + (2 * (4 - macroUnemployment)).toFixed(1) + ') = ' + mTaylorRaw.toFixed(2) + '%' + (mTaylorRaw < 0 ? ' → 0% (' + t('stem.economicslab.taylor_floor', 'rates cannot go much below zero') + ')' : mTaylorRaw > 20 ? ' → 20% (' + t('stem.economicslab.taylor_cap', 'the top of this slider') + ')' : '') + ', ' + t('stem.economicslab.taylor_rounded', 'rounded to the nearest 0.25%') + '.'),
                          React.createElement('div', { className: 'text-slate-600' }, t('stem.economicslab.taylor_principle', 'Each point of inflation moves the rate 1.5 points, so the REAL rate rises when inflation does. That is the Taylor principle (John Taylor, 1993).')),
                          React.createElement('div', { className: 'flex flex-wrap gap-2 pt-1' },
                            React.createElement('button', { type: 'button', 'data-economicslab-taylor-use': 'true', onClick: function () { upd('macroInterest', mTaylor); if (announceToSR) announceToSR(t('stem.economicslab.taylor_used', 'Rate set to the Taylor rule:') + ' ' + mTaylor.toFixed(2) + '%'); }, className: 'px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold bg-blue-700 text-white' }, t('stem.economicslab.taylor_use', 'Set my rate to the rule')),
                            React.createElement('button', { type: 'button', 'aria-pressed': d.macroAutopilot === true ? 'true' : 'false', 'data-economicslab-autopilot': 'true', onClick: function () { upd('macroAutopilot', d.macroAutopilot !== true); }, className: 'px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold border ' + (d.macroAutopilot === true ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-blue-900 border-blue-700') }, d.macroAutopilot === true ? t('stem.economicslab.autopilot_on', '🤖 Autopilot: on (the rule sets the rate each year)') : t('stem.economicslab.autopilot_off', '🤖 Autopilot'))))
                  ),
                  React.createElement('div', { className: 'space-y-2 bg-amber-50 rounded-xl p-4 border border-amber-200' },
                    React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, t('stem.economicslab.congress_fiscal', '\uD83C\uDFDB\uFE0F Congress (Fiscal Policy)')),
                    React.createElement('label', { className: 'block text-xs text-amber-800' }, t('stem.economicslab.spending_change', 'Spending change: ') + (mSpend > 0 ? '+' : '') + mSpend + t('stem.economicslab.pct_of_gdp', '% of GDP')),
                    React.createElement('input', {
                      type: 'range', min: -3, max: 3, step: 0.5, value: mSpend,
                      'aria-label': t('stem.economicslab.spending_change_2', 'Government spending change, percent of GDP'),
                      'aria-valuetext': (mSpend > 0 ? 'plus ' : '') + mSpend + ' percent of GDP',
                      onChange: function (e) { upd('macroSpend', parseFloat(e.target.value)); },
                      className: 'w-full accent-amber-500'
                    }),
                    React.createElement('label', { className: 'block text-xs text-amber-800' }, t('stem.economicslab.tax_change', 'Tax change: ') + (mTax > 0 ? '+' : '') + mTax + '%'),
                    React.createElement('input', {
                      type: 'range', min: -3, max: 3, step: 0.5, value: mTax,
                      'aria-label': t('stem.economicslab.tax_change_2', 'Tax change, percent'),
                      'aria-valuetext': (mTax > 0 ? 'plus ' : '') + mTax + ' percent',
                      onChange: function (e) { upd('macroTax', parseFloat(e.target.value)); },
                      className: 'w-full accent-amber-500'
                    }),
                    (mSpend > 0 || mTax < 0) && React.createElement('div', { className: 'text-[0.6875rem] text-slate-600 bg-white rounded-lg p-2 border border-amber-100' },
                      t('stem.economicslab.deficit_note', '\uD83D\uDCDA Spending more while taxing less = deficit spending. It stimulates now, but the debt is a claim on future taxpayers.'))
                  )
                ),
                React.createElement('button', {
                  onClick: advanceYear,
                  className: 'w-full py-4 rounded-2xl text-sm font-bold shadow-lg mb-3 transition-all bg-red-700 text-white hover:bg-red-800 hover:shadow-xl'
                }, t('stem.economicslab.advance_year', '\uD83D\uDCC5 Advance One Year (') + macroYear + ' \u2192 ' + (macroYear + 1) + ')'),
                d.macroReport && typeof d.macroReport === 'object' && React.createElement('div', { className: 'bg-gradient-to-br from-slate-50 to-zinc-50 rounded-xl p-4 border border-slate-400 mb-3', role: 'status' },
                  React.createElement('h4', { className: 'text-sm font-bold text-slate-800 mb-2' }, t('stem.economicslab.year_report', '\uD83D\uDCCB Year ') + econStr(d.macroReport.year, 6) + t('stem.economicslab.year_report_2', ' in Review')),
                  d.macroReport.shock && typeof d.macroReport.shock === 'object' && React.createElement('div', { className: 'flex items-center gap-2 mb-2 bg-amber-50 border border-amber-200 rounded-lg p-2' },
                    React.createElement('span', { className: 'text-xl', 'aria-hidden': 'true' }, econStr(d.macroReport.shock.icon, 12)),
                    React.createElement('div', null,
                      React.createElement('div', { className: 'text-[0.6875rem] font-bold text-amber-800' }, t('stem.economicslab.shock_label', 'Shock: ') + econStr(d.macroReport.shock.name, 80)),
                      React.createElement('div', { className: 'text-[0.6875rem] text-amber-800' }, econStr(d.macroReport.shock.lesson, 400)))),
                  React.createElement('div', { className: 'space-y-1' },
                    (Array.isArray(d.macroReport.lines) ? d.macroReport.lines : []).map(function (ln, li2) {
                      return React.createElement('p', { key: li2, className: 'text-[0.6875rem] text-slate-600 leading-relaxed m-0' }, econStr(ln, 400));
                    }))
                ),
                React.createElement('button', {
                  onClick: function () { updMany({ macroGDP: 2.1, macroInflation: 3.2, macroInterest: 5.25, macroUnemployment: 3.8, macroTrade: -0.5, macroYear: 2025, macroHistory: [], macroReport: null, macroSpend: 0, macroTax: 0, macroMission: null }); if (addToast) addToast(t('stem.economicslab.economy_reset', '\u267B Economy reset to 2025 baseline'), 'info'); },
                  className: 'w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-400 mb-2'
                }, t('stem.economicslab.reset_economy', '\u267B Reset Economy')),
                React.createElement('p', { className: 'm-0 text-[0.625rem] italic text-slate-500' }, t('stem.economicslab.macro_model_disclaimer', 'Toy model with textbook-Keynesian signs plus Okun\'s-law unemployment \u2014 NOT a forecast. Real economies depend on expectations, credibility, and global conditions, and economists genuinely disagree about these coefficients (see Schools of Thought in the reference shelf).'))
              );
            })(),

            // \u2550\u2550 POLICY INQUIRY widget (H7b'') \u2550\u2550
            econTab === 'trade' && tradePanel(),

            econTab === 'personalFinance' && (function () {
              var el = React.createElement;
              var startBal = pfLife.card > 100 ? Math.round(pfLife.card / 100) * 100 : 3000;
              var bal = E.clamp(Math.round(num(d.ccBal, startBal) / 100) * 100, 500, 10000);
              var apr = E.clamp(Math.round(num(d.ccApr, 22)), 10, 30);
              var minP = E.cardPayoff({ balance: bal, apr: apr, rule: 'minimum' });
              // A card requires at least its minimum payment, so the fixed plan starts there.
              var payMin = Math.max(25, Math.ceil(minP.firstPayment / 5) * 5);
              var pay = E.clamp(Math.round(num(d.ccPay, 150) / 5) * 5, payMin, 600);
              var fixP = E.cardPayoff({ balance: bal, apr: apr, rule: 'fixed', payment: pay });
              var yrs = function (m) { if (!isFinite(m)) return t('stem.economicslab.cc_never', 'never'); var y = Math.floor(m / 12), mo = m % 12; return (y ? y + ' ' + (y === 1 ? t('stem.economicslab.cc_year', 'year') : t('stem.economicslab.cc_years', 'years')) : '') + (y && mo ? ' ' : '') + (mo || !y ? mo + ' ' + (mo === 1 ? t('stem.economicslab.cc_month', 'month') : t('stem.economicslab.cc_months', 'months')) : ''); };
              var money = function (v) { return isFinite(v) ? '$' + Math.round(v).toLocaleString() : '—'; };
              var guesses = [['a', t('stem.economicslab.cc_g1', 'Under 2 years')], ['b', t('stem.economicslab.cc_g2', '2 to 5 years')], ['c', t('stem.economicslab.cc_g3', '5 to 10 years')], ['d', t('stem.economicslab.cc_g4', 'More than 10 years')]];
              var bandOf = function (m) { return !isFinite(m) || m > 120 ? 'd' : m > 60 ? 'c' : m >= 24 ? 'b' : 'a'; };
              var reveal = typeof d.ccGuess === 'string';
              var guessed = reveal && d.ccGuessFor === bal + '@' + apr ? d.ccGuess : null;
              var bandIx = function (b) { return ['a', 'b', 'c', 'd'].indexOf(b); };
              var verdict = !guessed ? '' : guessed === bandOf(minP.months) ? '✅ ' + t('stem.economicslab.cc_right', 'Right.') : bandIx(guessed) < bandIx(bandOf(minP.months)) ? '😮 ' + t('stem.economicslab.cc_longer', 'Longer than you guessed.') : '🙂 ' + t('stem.economicslab.cc_shorter', 'Shorter than you guessed.');
              var won = isFinite(fixP.months) && fixP.months <= 24;
              var bigEnough = bal >= 2000;
              var setNum = function (key, v) { var o = {}; o[key] = num(parseFloat(v), 0); updMany(o); };
              // Payment that clears the card in exactly 24 months (the annuity formula).
              var r = apr / 100 / 12, need24 = Math.max(payMin, Math.ceil(bal * r / (1 - Math.pow(1 + r, -24))));
              // Chart: balance over time for both plans, as SVG.
              var W = 320, H = 150, L = 42, T = 12, PW = W - L - 10, PH = H - T - 28;
              var span = Math.max(12, Math.max(isFinite(minP.months) ? minP.months : 0, isFinite(fixP.months) ? fixP.months : 0));
              var X = function (m) { return L + m / span * PW; }, Y = function (b) { return T + PH - b / bal * PH; };
              var line = function (path) { return path.slice(0, span + 1).map(function (b, m) { return X(m).toFixed(1) + ',' + Y(b).toFixed(1); }).join(' '); };
              var check = function () {
                upd('ccGuess', d.ccPick); upd('ccGuessFor', bal + '@' + apr);
                var ok = d.ccPick === bandOf(minP.months);
                if (announceToSR) announceToSR((ok ? t('stem.economicslab.cc_right', 'Right.') : t('stem.economicslab.cc_sr_not', 'Not quite.')) + ' ' + t('stem.economicslab.cc_sr_reveal', 'Minimum payments take') + ' ' + yrs(minP.months) + ' ' + t('stem.economicslab.cc_and_cost', 'and cost') + ' ' + money(minP.interest) + ' ' + t('stem.economicslab.cc_in_interest', 'in interest.'));
              };
              return el('div', { className: 'mt-4 bg-rose-50 rounded-xl p-3 border border-rose-200', 'data-economicslab-cardrace': 'true' },
                el('h4', { className: 'text-sm font-bold text-rose-900 m-0 mb-1' }, '💳 ' + t('stem.economicslab.cc_title', 'Credit card payoff race')),
                el('p', { className: 'text-[0.6875rem] text-slate-800 m-0 mb-2' }, t('stem.economicslab.cc_intro', 'Card interest is charged every month on what you still owe. Compare paying the minimum with paying a fixed amount each month.')),
                el('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-x-4' },
                  el('label', { className: 'block text-[0.6875rem] font-bold text-slate-800' }, t('stem.economicslab.cc_balance', 'Balance') + ': $' + bal.toLocaleString(),
                    el('input', { type: 'range', min: 500, max: 10000, step: 100, value: bal, 'aria-label': t('stem.economicslab.cc_balance', 'Balance'), 'aria-valuetext': '$' + bal.toLocaleString(), className: 'w-full', onChange: function (e) { setNum('ccBal', e.target.value); } })),
                  el('label', { className: 'block text-[0.6875rem] font-bold text-slate-800' }, t('stem.economicslab.cc_apr', 'APR') + ': ' + apr + '%',
                    el('input', { type: 'range', min: 10, max: 30, step: 1, value: apr, 'aria-label': t('stem.economicslab.cc_apr_aria', 'Annual interest rate, percent'), 'aria-valuetext': apr + '%', className: 'w-full', onChange: function (e) { setNum('ccApr', e.target.value); } })),
                  el('label', { className: 'block text-[0.6875rem] font-bold text-slate-800' }, t('stem.economicslab.cc_payment', 'Your fixed payment') + ': $' + pay + '/' + t('stem.economicslab.cc_mo', 'mo') + ' (' + t('stem.economicslab.cc_min_is', 'minimum') + ' $' + payMin + ')',
                    el('input', { type: 'range', min: payMin, max: 600, step: 5, value: pay, 'aria-label': t('stem.economicslab.cc_payment_aria', 'Your fixed monthly payment, dollars'), 'aria-valuetext': '$' + pay, className: 'w-full', onChange: function (e) { setNum('ccPay', e.target.value); } }))),
                // Predict first: how long does the minimum take?
                !reveal
                  ? el('div', { className: 'mt-2', 'data-cc-predict': 'true' },
                      el('div', { className: 'text-[0.6875rem] font-bold text-rose-900 mb-1' }, t('stem.economicslab.cc_predict', 'Predict first: paying only the minimum (the month’s interest + 1% of the balance, at least $25), how long until this card is paid off?')),
                      el('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': t('stem.economicslab.cc_predict_aria', 'Your prediction') },
                        guesses.map(function (g) { return el('button', { key: g[0], type: 'button', 'aria-pressed': d.ccPick === g[0] ? 'true' : 'false', onClick: function () { upd('ccPick', g[0]); }, className: 'px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold border ' + (d.ccPick === g[0] ? 'bg-rose-800 text-white border-rose-800' : 'bg-white text-rose-900 border-rose-400') }, g[1]); }),
                        el('button', { type: 'button', 'data-cc-check': 'true', disabled: !d.ccPick, style: d.ccPick ? undefined : { opacity: 0.5 }, onClick: check, className: 'px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-rose-800 text-white' }, t('stem.economicslab.cc_reveal', 'Show me'))))
                  : el('div', { className: 'mt-2 space-y-2', 'data-cc-results': 'true' },
                      el('p', { className: 'sr-only', 'aria-live': 'polite', 'data-cc-live': 'true' }, '$' + pay + ' ' + t('stem.economicslab.cc_per_month', 'a month') + ': ' + yrs(fixP.months) + ', ' + money(fixP.interest) + ' ' + t('stem.economicslab.cc_interest', 'interest') + '. ' + t('stem.economicslab.cc_min_title', 'Minimum payments') + ': ' + yrs(minP.months) + '.'),
                      el('p', { className: 'text-[0.6875rem] font-bold m-0 ' + (!guessed || guessed === bandOf(minP.months) ? 'text-green-800' : 'text-rose-800') }, (verdict ? verdict + ' ' : '') + t('stem.economicslab.cc_min_takes', 'Minimum payments take') + ' ' + yrs(minP.months) + '.'),
                      el('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                        el('div', { className: 'bg-white rounded-lg p-2 border border-red-300', 'data-cc-lane': 'minimum' },
                          el('div', { className: 'text-[0.6875rem] font-bold text-red-800' }, '🐢 ' + t('stem.economicslab.cc_min_title', 'Minimum payments') + ' (' + t('stem.economicslab.cc_first', 'first') + ' ' + money(minP.firstPayment) + ')'),
                          el('div', { className: 'text-[0.6875rem] text-slate-800' }, yrs(minP.months) + ' · ' + money(minP.interest) + ' ' + t('stem.economicslab.cc_interest', 'interest'))),
                        el('div', { className: 'bg-white rounded-lg p-2 border border-green-400', 'data-cc-lane': 'fixed' },
                          el('div', { className: 'text-[0.6875rem] font-bold text-green-800' }, '🚀 $' + pay + ' ' + t('stem.economicslab.cc_every_month', 'every month')),
                          el('div', { className: 'text-[0.6875rem] text-slate-800' }, fixP.never ? t('stem.economicslab.cc_never_long', 'Never paid off: this payment does not even cover the monthly interest of') + ' ' + money(bal * r) + '.' : yrs(fixP.months) + ' · ' + money(fixP.interest) + ' ' + t('stem.economicslab.cc_interest', 'interest')))),
                      !fixP.never && isFinite(minP.interest) && fixP.interest < minP.interest && el('p', { className: 'text-[0.6875rem] text-slate-800 m-0' }, t('stem.economicslab.cc_saves', 'Your plan saves') + ' ' + money(minP.interest - fixP.interest) + ' ' + t('stem.economicslab.cc_and', 'and') + ' ' + yrs(Math.max(0, minP.months - fixP.months)) + '.'),
                      el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': t('stem.economicslab.cc_chart_aria', 'Balance over time: minimum payments') + ' ' + yrs(minP.months) + ', $' + pay + ' ' + t('stem.economicslab.cc_per_month', 'a month') + ' ' + yrs(fixP.months) + '.', style: { width: '100%', maxWidth: 520, height: 'auto', display: 'block', background: '#0f172a', borderRadius: 10 }, 'data-cc-chart': 'true' },
                        el('line', { x1: L, y1: T + PH, x2: L + PW, y2: T + PH, stroke: '#94a3b8' }),
                        el('line', { x1: L, y1: T, x2: L, y2: T + PH, stroke: '#94a3b8' }),
                        el('text', { x: 4, y: T + 8, fill: '#cbd5e1', fontSize: 10 }, '$' + (bal / 1000).toFixed(1) + 'k'),
                        el('text', { x: 4, y: T + PH, fill: '#cbd5e1', fontSize: 10 }, '$0'),
                        el('text', { x: L + PW - 60, y: H - 6, fill: '#cbd5e1', fontSize: 10 }, span >= 24 ? (Math.round(span / 12 * 10) / 10) + ' ' + t('stem.economicslab.cc_years', 'years') : span + ' ' + t('stem.economicslab.cc_months', 'months')),
                        el('polyline', { points: line(minP.path), fill: 'none', stroke: '#f87171', strokeWidth: 2.5, strokeDasharray: '7 4' }),
                        !fixP.never && el('polyline', { points: line(fixP.path), fill: 'none', stroke: '#4ade80', strokeWidth: 2.5 }),
                        el('text', { x: L + PW - 4, y: T + 12, fill: '#f87171', fontSize: 11, fontWeight: 700, textAnchor: 'end' }, '- - ' + t('stem.economicslab.cc_min_title', 'Minimum payments')),
                        !fixP.never && el('text', { x: L + PW - 4, y: T + 26, fill: '#4ade80', fontSize: 11, fontWeight: 700, textAnchor: 'end' }, '— $' + pay + ' ' + t('stem.economicslab.cc_every_month', 'every month'))),
                      el('p', { className: 'text-[0.6875rem] m-0 ' + (won ? 'text-green-800 font-bold' : 'text-rose-900'), 'data-cc-challenge': 'true' }, won
                        ? '✅ ' + t('stem.economicslab.cc_won', 'Debt-free in') + ' ' + yrs(fixP.months) + '. ' + t('stem.economicslab.cc_won_2', 'Paying about') + ' $' + need24 + ' ' + t('stem.economicslab.cc_won_3', 'a month is the least that clears it in 2 years.') + (bigEnough ? '' : ' ' + t('stem.economicslab.cc_small', 'Try it with a balance of $2,000 or more to earn Debt Racer.'))
                        : '🎯 ' + t('stem.economicslab.cc_challenge', 'Challenge: find a monthly payment that makes you debt-free in 2 years or less.')),
                      won && bigEnough && d.ccWon !== true && el('button', { type: 'button', 'data-cc-claim': 'true', onClick: function () { upd('ccWon', true); if (addToast) addToast('💳 ' + t('stem.economicslab.cc_claimed_2', 'Challenge complete: debt-free in') + ' ' + yrs(fixP.months) + '!', 'success'); }, className: 'px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-green-800 text-white' }, t('stem.economicslab.cc_claim_2', 'Claim the challenge')),
                      el('button', { type: 'button', onClick: function () { updMany({ ccGuess: null, ccPick: null }); }, className: 'ml-2 px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-white text-rose-900 border border-rose-400' }, t('stem.economicslab.cc_again', 'Predict again'))));
            })(),

            econTab === 'entrepreneur' && (function () {
              var el = React.createElement, P = E.PRICE_WAR, days = P.days;
              var over = pwGame && pwHist.length >= days;
              var tot = E.pwTotals(pwHist);
              var PW_TEXT = {
                mirror: { name: t('stem.economicslab.pw_rival_mirror', 'Mirror'), desc: t('stem.economicslab.pw_rival_mirror_desc', 'Starts high, then copies your move from the day before (tit-for-tat).') },
                grudge: { name: t('stem.economicslab.pw_rival_grudge', 'Grudge'), desc: t('stem.economicslab.pw_rival_grudge_desc', 'Keeps prices high until you cut once, then cuts every day after (grim trigger).') },
                cutthroat: { name: t('stem.economicslab.pw_rival_cutthroat', 'Cutthroat'), desc: t('stem.economicslab.pw_rival_cutthroat_desc', 'Cuts its price every single day.') },
                friendly: { name: t('stem.economicslab.pw_rival_friendly', 'Friendly'), desc: t('stem.economicslab.pw_rival_friendly_desc', 'Keeps its price high every day, whatever you do.') },
                coin: { name: t('stem.economicslab.pw_rival_coin', 'Coin flip'), desc: t('stem.economicslab.pw_rival_coin_desc', 'Picks high or low at random each day.') }
              };
              var rival = pwGame ? PW_TEXT[pwGame.rival] : null;
              var fits = over ? E.pwConsistent(pwHist) : [];
              var judge = function (id) { return id === pwGame.rival || (id !== 'coin' && fits.indexOf(id) !== -1); };
              var focusSoon = function (sel) { setTimeout(function () { var n = document.querySelector(sel); if (n) n.focus(); }, 60); };
              var word = function (m) { return m === 'L' ? t('stem.economicslab.pw_low', 'cut ($3)') : t('stem.economicslab.pw_high', 'held ($5)'); };
              var start = function () {
                var pick = E.PW_RIVALS[Math.floor(Math.random() * E.PW_RIVALS.length)].id;
                updMany({ pwGame: { rival: pick, seed: 1 + Math.floor(Math.random() * 999999), history: [], guess: null } });
              };
              var play = function (m) {
                if (!pwGame || over) return;
                var h = E.pwPlay({ rival: pwGame.rival, seed: pwGame.seed, history: pwHist }, m);
                var last = h[h.length - 1];
                upd('pwGame', Object.assign({}, pwGame, { history: h }));
                if (h.length >= days) { focusSoon('[data-pw-guess]'); if (announceToSR) announceToSR(t('stem.economicslab.pw_over_sr', 'All 10 days played. Now guess which rival you faced.')); return; }
                if (announceToSR) announceToSR(t('stem.economicslab.pw_day', 'Day') + ' ' + h.length + ': ' + t('stem.economicslab.pw_you', 'you') + ' ' + word(last.you) + ', ' + t('stem.economicslab.pw_rival', 'rival') + ' ' + word(last.rival) + '. ' + t('stem.economicslab.pw_you_earned', 'You earned') + ' $' + last.youEarn + '.');
              };
              var guess = function (id) {
                if (!over || pwGame.guess) return;
                // A guess the evidence cannot rule out counts as right; reading the rival
                // (only one rule fits AND you named it) is what earns Strategist.
                var right = judge(id), sharp = right && fits.length <= 1;
                updMany({ pwGame: Object.assign({}, pwGame, { guess: id }), pwStats: { games: num(pwStats.games, 0) + 1, right: num(pwStats.right, 0) + (right ? 1 : 0), sharp: num(pwStats.sharp, 0) + (sharp ? 1 : 0), best: Math.max(num(pwStats.best, 0), tot.you) } });
                focusSoon('[data-pw-reveal]');
                if (announceToSR) announceToSR((right ? t('stem.economicslab.pw_right', 'Right!') : t('stem.economicslab.pw_wrong', 'Not quite.')) + ' ' + rival.name + ': ' + rival.desc);
              };
              var cell = function (k) { var p = P.pay[k]; return el('td', { className: 'px-2 py-1 text-center border border-amber-200' }, t('stem.economicslab.pw_you_short', 'You') + ' $' + p[0] + ' · ' + t('stem.economicslab.pw_them_short', 'them') + ' $' + p[1]); };
              return el('div', { className: 'mt-4 bg-amber-50 rounded-xl p-3 border border-amber-200', 'data-economicslab-pricewar': 'true' },
                el('h4', { className: 'text-sm font-bold text-amber-900 m-0 mb-1' }, '♟️ ' + t('stem.economicslab.pw_title', 'Price war: the shop across the street')),
                el('p', { className: 'text-[0.6875rem] text-slate-800 m-0 mb-2' }, t('stem.economicslab.pw_intro_tip', 'Tip: rivals that never change look alike until you test them.') + ' ' + t('stem.economicslab.pw_intro', 'Every day you and the rival shop pick a price at the same moment. Cutting steals the other shop’s customers, but if you both cut, you both earn less. Play 10 days, then guess what kind of rival you faced.')),
                el('table', { className: 'text-[0.6875rem] mb-2 bg-white border-collapse' },
                  el('caption', { className: 'sr-only' }, t('stem.economicslab.pw_table_caption', 'Daily profit for each pair of choices')),
                  el('thead', null, el('tr', null, el('th', { className: 'px-2 py-1', scope: 'col' }, el('span', { className: 'sr-only' }, t('stem.economicslab.pw_your_choice', 'Your choice'))), el('th', { className: 'px-2 py-1 text-slate-800', scope: 'col' }, t('stem.economicslab.pw_they_hold', 'Rival holds $5')), el('th', { className: 'px-2 py-1 text-slate-800', scope: 'col' }, t('stem.economicslab.pw_they_cut', 'Rival cuts to $3')))),
                  el('tbody', null,
                    el('tr', null, el('th', { className: 'px-2 py-1 text-left text-slate-800', scope: 'row' }, t('stem.economicslab.pw_you_hold', 'You hold $5')), cell('HH'), cell('HL')),
                    el('tr', null, el('th', { className: 'px-2 py-1 text-left text-slate-800', scope: 'row' }, t('stem.economicslab.pw_you_cut', 'You cut to $3')), cell('LH'), cell('LL')))),
                !pwGame
                  ? el('button', { type: 'button', 'data-pw-start': 'true', onClick: start, className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-700 text-white' }, t('stem.economicslab.pw_start', '▶ Start a 10-day game against a hidden rival'))
                  : el('div', null,
                      el('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
                        el('span', { className: 'text-[0.6875rem] font-bold text-slate-900' }, over ? t('stem.economicslab.pw_done', 'All 10 days played.') : t('stem.economicslab.pw_day', 'Day') + ' ' + (pwHist.length + 1) + ' / ' + days + ':'),
                        !over && el('button', { type: 'button', 'data-pw-move': 'H', onClick: function () { play('H'); }, className: 'px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-white text-amber-900 border border-amber-600' }, t('stem.economicslab.pw_hold_btn', 'Hold at $5')),
                        !over && el('button', { type: 'button', 'data-pw-move': 'L', onClick: function () { play('L'); }, className: 'px-3 py-1 rounded-lg text-[0.6875rem] font-bold bg-amber-700 text-white' }, t('stem.economicslab.pw_cut_btn', 'Cut to $3')),
                        el('span', { className: 'text-[0.6875rem] text-slate-800', 'data-pw-totals': 'true' }, t('stem.economicslab.pw_totals', 'Totals:') + ' ' + t('stem.economicslab.pw_you_short', 'You') + ' $' + tot.you + ' · ' + t('stem.economicslab.pw_them_short', 'them') + ' $' + tot.rival)),
                      pwHist.length > 0 && el('ol', { className: 'text-[0.6875rem] text-slate-800 m-0 mb-2 pl-1 max-h-32 overflow-y-auto list-none', tabIndex: 0, 'aria-label': t('stem.economicslab.pw_log', 'Day by day') },
                        pwHist.map(function (r, i) { return el('li', { key: i }, t('stem.economicslab.pw_day', 'Day') + ' ' + (i + 1) + ': ' + t('stem.economicslab.pw_you', 'you') + ' ' + word(r.you) + ', ' + t('stem.economicslab.pw_rival', 'rival') + ' ' + word(r.rival) + ' → ' + t('stem.economicslab.pw_you_short', 'You') + ' $' + P.pay[r.you + r.rival][0] + ' · ' + t('stem.economicslab.pw_them_short', 'them') + ' $' + P.pay[r.you + r.rival][1]); })),
                      over && !pwGame.guess && el('div', { className: 'mb-2' },
                        el('div', { className: 'text-[0.6875rem] font-bold text-amber-900 mb-1' }, t('stem.economicslab.pw_guess', 'Which rival were you playing? Look at how it reacted to you.')),
                        el('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': t('stem.economicslab.pw_guess_aria', 'Guess the rival') },
                          E.PW_RIVALS.map(function (r) { return el('button', { key: r.id, type: 'button', 'data-pw-guess': r.id, title: PW_TEXT[r.id].desc, onClick: function () { guess(r.id); }, className: 'px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold bg-white text-amber-900 border border-amber-600' }, PW_TEXT[r.id].name); }))),
                      over && pwGame.guess && el('div', { className: 'space-y-1 text-[0.6875rem] text-slate-800', 'data-pw-reveal': 'true', role: 'status', tabIndex: -1 },
                        el('p', { className: 'm-0 font-bold ' + (judge(pwGame.guess) ? 'text-green-800' : 'text-rose-800') }, (judge(pwGame.guess) ? '✅ ' + t('stem.economicslab.pw_right', 'Right!') : '🤔 ' + t('stem.economicslab.pw_wrong', 'Not quite.')) + ' ' + t('stem.economicslab.pw_it_was', 'It was') + ' ' + rival.name + ': ' + rival.desc),
                        fits.length > 1 && el('p', { className: 'm-0 text-amber-900', 'data-pw-lookalikes': 'true' }, t('stem.economicslab.pw_lookalikes', 'Your moves could not tell these apart:') + ' ' + fits.map(function (id) { return PW_TEXT[id].name; }).join(', ') + '. ' + t('stem.economicslab.pw_lookalikes_2', 'Each would have played exactly the same way, so any of them counts. To really read a rival, test it: cut once, then watch how it answers.')),
                        el('p', { className: 'm-0' }, t('stem.economicslab.pw_compare', 'You earned') + ' $' + tot.you + '. ' + t('stem.economicslab.pw_compare_2', 'Both shops holding every day would have earned') + ' $' + (P.pay.HH[0] * days) + ' ' + t('stem.economicslab.pw_compare_3', 'each; both cutting every day,') + ' $' + (P.pay.LL[0] * days) + '.'),
                        el('p', { className: 'm-0' }, t('stem.economicslab.pw_lesson_2', 'For ONE day, cutting always pays more, whatever the rival does ($90 > $60 and $30 > $10). So both cutting is the Nash equilibrium, where each earns only $30. When the game repeats, a rival that remembers (Mirror or Grudge) can make holding pay, though a known last day tempts both shops to cut. Customers see it the other way: two shops holding at $5 cost them $2 on every sale. That is why agreeing on prices (a cartel) is illegal: it harms buyers.')),
                        el('button', { type: 'button', 'data-pw-start': 'true', onClick: start, className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-700 text-white' }, t('stem.economicslab.pw_again', '▶ Play again (new hidden rival)')))
                    ));
            })(),

            econTab === 'inquiry' && (function() {
              // A saved file may hold anything: keep the levers numeric and in range.
              var iq = Object.assign({ taxCut: 0, govSpend: 0, rateChange: 0, tariff: 0, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] }, (d.policyIQ && typeof d.policyIQ === 'object' && !Array.isArray(d.policyIQ)) ? d.policyIQ : {});
              iq.taxCut = E.clamp(num(iq.taxCut, 0), -5, 5); iq.govSpend = E.clamp(num(iq.govSpend, 0), -5, 5);
              iq.rateChange = E.clamp(num(iq.rateChange, 0), -3, 3); iq.tariff = E.clamp(num(iq.tariff, 0), 0, 25);
              iq.log = Array.isArray(iq.log) ? iq.log.filter(function (x) { return x && typeof x === 'object'; }) : [];
              if (typeof iq.hypothesis !== 'string') iq.hypothesis = '';
              if (typeof iq.explanation !== 'string') iq.explanation = '';
              function setIQ(patch) { upd('policyIQ', Object.assign({}, iq, patch)); }
              function setKey(k, v) { var p = {}; p[k] = v; setIQ(p); }
              // Toy model (textbook KEYNESIAN signs): the first-year response of the
              // National Economy tab (spending 0.8, tax cut 0.5, rate -0.4 on GDP;
              // 0.3 of that plus the rate's direct effect on inflation; Okun 0.35).
              // Tariffs: imports are ~14% of US GDP, so even full pass-through adds
              // about 0.14pp to prices per tariff point, and trims output a little.
              // New-classical / supply-side / monetarist / MMT / neo-Fisherian schools
              // would flip several of these signs; the footer and open questions ask
              // which ones.
              var dGDP = iq.taxCut * 0.5 + iq.govSpend * 0.8 - iq.rateChange * 0.4 - iq.tariff * 0.05;
              var dInflation = iq.taxCut * 0.15 + iq.govSpend * 0.24 - iq.rateChange * 0.2 + iq.tariff * 0.14;
              var dUnemployment = -0.35 * dGDP;
              // Stagflation first: rising prices with falling output is its own case,
              // not "just" a recession.
              var stagflation = dInflation > 1 && dGDP < -0.3;
              var recession = dGDP < -1;
              var overheat = dGDP > 2.5 || (dGDP > 0.5 && dInflation >= 1.5);
              var state = stagflation ? 'stagflation' : recession ? 'recession' : overheat ? 'overheat' : dGDP > 0.5 ? 'expansion' : dGDP < -0.3 ? 'slowdown' : 'mild';
              var sm = ({
                recession: { label: t('stem.economicslab.recession', 'Recession'), color: '#f87171', bg: '#2a0a0a', border: '#dc2626', desc: t('stem.economicslab.gdp_contracting_unemployment_climbing_', 'GDP contracting. Unemployment climbing. Aggregate demand insufficient.') },
                stagflation: { label: t('stem.economicslab.stagflation', 'Stagflation'), color: '#fb923c', bg: '#2a1a0a', border: '#ea580c', desc: t('stem.economicslab.rare_and_ugly_high_inflation_low_growt', 'Rare and ugly: high inflation + low growth. 1970s OPEC shock pattern. Hard to fix.') },
                overheat: { label: t('stem.economicslab.overheating', 'Overheating'), color: '#facc15', bg: '#2a2410', border: '#eab308', desc: t('stem.economicslab.growth_strong_but_inflation_spiking_ce', 'Growth strong but inflation spiking. Central bank likely to brake hard.') },
                expansion: { label: t('stem.economicslab.healthy_expansion', 'Healthy expansion'), color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: t('stem.economicslab.gdp_up_inflation_contained_goldilocks_', 'GDP up, inflation contained. Goldilocks zone \u2014 sustainable for now.') },
                slowdown: { label: t('stem.economicslab.slowdown', 'Slowdown'), color: '#93c5fd', bg: '#0a1628', border: '#3b82f6', desc: t('stem.economicslab.slowdown_desc', 'Growth cooling and inflation easing: the brakes are on, but not hard enough for a recession.') },
                mild: { label: t('stem.economicslab.mild_mixed', 'Mild / mixed'), color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: t('stem.economicslab.small_net_effect_policy_levers_roughly', 'Small net effect. Policy levers roughly cancel out.') }
              })[state];
              return React.createElement('div', { className: 'mt-4 p-3 rounded-xl', style: { background: sm.bg, border: '1px solid ' + sm.border, color: '#e8f0f5' } },
                React.createElement('h4', { className: 'text-xs font-black uppercase tracking-wider mb-1', style: { color: ecoInk(sm.color) } }, t('stem.economicslab.policy_inquiry_predict_the_macro_outco', '\uD83D\uDD2C Policy Inquiry \u2014 Explore the Macro Outcome')),
                React.createElement('p', { className: 'text-[0.625rem] opacity-85 mb-2 leading-snug' }, t('stem.economicslab.move_four_policy_levers_tax_govt_spend', 'Move the tax, government-spending, interest-rate, and tariff controls, then observe how the modeled macro state changes. The result updates live; record a hypothesis or pattern you notice.')),
                React.createElement('div', { className: 'inline-block px-2 py-1 rounded-full text-[0.625rem] font-bold mb-2', style: { background: sm.color, color: '#000' }, 'aria-live': 'polite' }, sm.label),
                React.createElement('p', { className: 'text-[0.625rem] opacity-80 mb-2' }, sm.desc),
                React.createElement('div', { className: 'grid grid-cols-3 gap-2 mb-2' },
                  [
                    { label: '\u0394GDP', val: (dGDP > 0 ? '+' : '') + dGDP.toFixed(2) + '%' },
                    { label: '\u0394Inflation', val: (dInflation > 0 ? '+' : '') + dInflation.toFixed(2) + 'pp' },
                    { label: '\u0394Unemploy', val: (dUnemployment > 0 ? '+' : '') + dUnemployment.toFixed(2) + 'pp' }
                  ].map(function(m) {
                    return React.createElement('div', { key: m.label, className: 'p-2 rounded text-center', style: { background: '#0a0a1a', border: '1px solid ' + sm.border } },
                      React.createElement('div', { className: 'text-[0.5625rem] opacity-60' }, m.label),
                      React.createElement('div', { className: 'text-[0.75rem] font-bold font-mono', style: { color: ecoInk(sm.color) } }, m.val)
                    );
                  })
                ),
                React.createElement('svg', { width: '100%', height: 120, viewBox: '0 0 320 120', role: 'img', 'aria-label': t('stem.economicslab.policy_outcomes_chart', 'Policy outcomes chart for GDP, inflation, and unemployment'), style: { background: '#0a0a1a', borderRadius: 6, marginBottom: 8 } },
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
                  React.createElement('label', { className: 'text-[0.625rem]' },
                    React.createElement('div', { className: 'flex justify-between mb-0.5' }, React.createElement('span', null, t('stem.economicslab.tax_cut', 'Tax cut (%)')), React.createElement('span', { className: 'font-mono font-bold', style: { color: ecoInk(sm.color) } }, iq.taxCut.toFixed(1))),
                    React.createElement('input', { type: 'range', 'aria-label': t('stem.economicslab.tax_cut_lever', 'Tax cut, percent'), 'aria-valuetext': iq.taxCut.toFixed(1) + '%', min: -5, max: 5, step: 0.5, value: iq.taxCut, onChange: function(e) { setKey('taxCut', parseFloat(e.target.value)); }, className: 'w-full' })
                  ),
                  React.createElement('label', { className: 'text-[0.625rem]' },
                    React.createElement('div', { className: 'flex justify-between mb-0.5' }, React.createElement('span', null, t('stem.economicslab.govt_spending', 'Govt spending (%)')), React.createElement('span', { className: 'font-mono font-bold', style: { color: ecoInk(sm.color) } }, iq.govSpend.toFixed(1))),
                    React.createElement('input', { type: 'range', 'aria-label': t('stem.economicslab.govt_spending_lever', 'Government spending, percent'), 'aria-valuetext': iq.govSpend.toFixed(1) + '%', min: -5, max: 5, step: 0.5, value: iq.govSpend, onChange: function(e) { setKey('govSpend', parseFloat(e.target.value)); }, className: 'w-full' })
                  ),
                  React.createElement('label', { className: 'text-[0.625rem]' },
                    React.createElement('div', { className: 'flex justify-between mb-0.5' }, React.createElement('span', null, t('stem.economicslab.interest_rate_2', 'Interest rate \u0394')), React.createElement('span', { className: 'font-mono font-bold', style: { color: ecoInk(sm.color) } }, iq.rateChange.toFixed(1) + 'pp')),
                    React.createElement('input', { type: 'range', 'aria-label': t('stem.economicslab.interest_rate_lever', 'Interest rate change'), 'aria-valuetext': iq.rateChange.toFixed(2) + ' percentage points', min: -3, max: 3, step: 0.25, value: iq.rateChange, onChange: function(e) { setKey('rateChange', parseFloat(e.target.value)); }, className: 'w-full' })
                  ),
                  React.createElement('label', { className: 'text-[0.625rem]' },
                    React.createElement('div', { className: 'flex justify-between mb-0.5' }, React.createElement('span', null, t('stem.economicslab.tariff', 'Tariff (%)')), React.createElement('span', { className: 'font-mono font-bold', style: { color: ecoInk(sm.color) } }, iq.tariff.toFixed(1))),
                    React.createElement('input', { type: 'range', 'aria-label': t('stem.economicslab.tariff_lever', 'Tariff, percent'), 'aria-valuetext': iq.tariff.toFixed(1) + '%', min: 0, max: 25, step: 1, value: iq.tariff, onChange: function(e) { setKey('tariff', parseFloat(e.target.value)); }, className: 'w-full' })
                  )
                ),
                React.createElement('div', { className: 'flex gap-2 mb-2' },
                  React.createElement('button', { onClick: function() {
                    var t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    setIQ({ log: iq.log.concat([{ t: t, tx: iq.taxCut, sp: iq.govSpend, r: iq.rateChange, tr: iq.tariff, gdp: dGDP.toFixed(2), inf: dInflation.toFixed(2), state: sm.label }]) });
                  }, className: 'flex-1 px-2 py-1 rounded text-[0.625rem] font-bold', style: { background: sm.bg, color: sm.color, border: '1px solid ' + sm.border, cursor: 'pointer' } }, t('stem.economicslab.log_this_policy_mix', '\uD83D\uDCCB Log this policy mix')),
                  React.createElement('button', { onClick: function() { setIQ({ taxCut: 0, govSpend: 0, rateChange: 0, tariff: 0 }); }, className: 'px-2 py-1 rounded text-[0.625rem]', style: { background: '#0a0a1a', color: '#94a3b8', border: '1px solid #1e293b', cursor: 'pointer' } }, t('stem.economicslab.reset', 'Reset'))
                ),
                iq.log.length > 0 && React.createElement('div', { className: 'p-1.5 rounded text-[0.5625rem] font-mono mb-2', style: { background: '#0a0a1a', maxHeight: 70, overflow: 'auto', border: '1px solid #1e293b' } },
                  iq.log.slice(-5).map(function(e, i) { return React.createElement('div', { key: i }, e.t + '  ' + e.state + ' \u00B7 tx' + e.tx + ' sp' + e.sp + ' r' + e.r + ' tar' + e.tr + ' \u2192 gdp' + e.gdp + ' inf' + e.inf); })
                ),
                React.createElement('label', { htmlFor: 'econ-iq-hypothesis', className: 'block text-[0.625rem] font-bold opacity-85 mb-1' }, t('stem.economicslab.your_hypothesis_which_lever_has_the_mo', 'Your hypothesis (which lever has the most disagreement among economists in real life? Why?)')),
                React.createElement('textarea', { id: 'econ-iq-hypothesis', value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: t('stem.economicslab.e_g_tariffs_hit_prices_fast_but_the_gd', 'e.g., tariffs hit prices fast but the GDP effect depends on retaliation...'), className: 'w-full p-1.5 rounded text-[0.625rem] mb-2', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
                !iq.stuckRevealed && React.createElement('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded text-[0.625rem] font-bold mb-2', style: { background: '#0a0a1a', color: sm.color, border: '1px solid #1e293b', cursor: 'pointer' } }, t('stem.economicslab.i_m_stuck_show_open_questions', "\uD83E\uDD14 I'm stuck \u2014 show open questions")),
                iq.stuckRevealed && React.createElement('div', { className: 'p-2 rounded text-[0.625rem] mb-2', style: { background: '#0a0a1a', border: '1px dashed ' + sm.border, lineHeight: 1.5 } },
                  React.createElement('div', { className: 'font-bold mb-1', style: { color: ecoInk(sm.color) } }, t('stem.economicslab.open_questions_no_answer_key', 'Open questions (no answer key)')),
                  React.createElement('ul', { className: 'pl-4 m-0' },
                    React.createElement('li', null, t('stem.economicslab.what_combination_produces_stagflation_', 'What combination produces "stagflation"? Why was it so politically painful in the 1970s?')),
                    React.createElement('li', null, t('stem.economicslab.tax_cuts_and_govt_spending_both_stimul', 'Tax cuts and govt spending both stimulate GDP. Which generates more inflation per dollar of stimulus? Why?')),
                    React.createElement('li', null, t('stem.economicslab.when_would_a_central_bank_deliberately', 'When would a central bank deliberately CAUSE a recession? (Volcker 1979\u201382.)')),
                    React.createElement('li', null, t('stem.economicslab.do_tariffs_help_domestic_workers_in_th', 'Do tariffs help domestic workers in the long run, or do they raise prices for everyone? Both? Trade-off where?')),
                    React.createElement('li', null, t('stem.economicslab.this_widget_hard_codes_textbook_keynes', 'This widget hard-codes textbook Keynesian signs. Which signs would FLIP under supply-side economics? Under MMT? Under new-classical (rational expectations)? Where does the Keynesian model give the wrong sign in real-world data?'))
                  )
                ),
                React.createElement('label', { className: 'flex items-center gap-2 text-[0.625rem] font-bold cursor-pointer mb-1' },
                  React.createElement('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
                  React.createElement('span', null, t('stem.economicslab.i_can_explain_why_this_policy_mix_yiel', 'I can explain why this policy mix yields this macroeconomic state.'))
                ),
                iq.understood && React.createElement('textarea', { 'aria-label': t('stem.economicslab.policy_explanation', 'Explain your policy prediction'), value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: t('stem.economicslab.explain_in_your_own_words', 'Explain in your own words...'), className: 'w-full p-1.5 rounded text-[0.625rem] mb-1', style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
                React.createElement('p', { className: 'm-0 text-[0.5625rem] italic opacity-60' }, t('stem.economicslab.inquiry_widget_no_score_no_reveal_no_a', 'Inquiry widget \u2014 no score, no reveal, no answer dump. Coefficients are pedagogical heuristics, NOT a real macro model; real responses depend on monetary regime, slack, expectations, foreign trade. Macro is contested \u2014 economists disagree on signs and magnitudes.'))
              );
            })()

            )
          );
      })();
    }
  });


})();

} // end dedup guard
