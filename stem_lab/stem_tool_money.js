// ═══════════════════════════════════════════
// stem_tool_money.js — Money Math Plugin
// Coins, bills, making change, grocery store,
// currency exchange, tips, budget, challenges,
// personal finance (compound interest, retirement)
// Extracted from stem_lab_module.js L3916-6224
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


  // ── Audio (auto-injected) ──
  var _moneyAC = null;
  function getMoneyAC() { if (!_moneyAC) { try { _moneyAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_moneyAC && _moneyAC.state === "suspended") { try { _moneyAC.resume(); } catch(e) {} } return _moneyAC; }
  function moneyTone(f,d,tp,v) { var ac = getMoneyAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxMoneyClick() { moneyTone(600, 0.03, "sine", 0.04); }

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-money')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-money';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  
  window.StemLab.registerTool('moneyMath', {
    icon: '\uD83D\uDCB5', label: 'Money Math',
    desc: 'Coins, bills, making change, grocery store sim, currency exchange, tips, budget, and personal finance.',
    color: 'emerald', category: 'math',
    questHooks: [
      { id: 'place_5_coins', label: 'Place 5 coins on the counting mat', icon: '\uD83E\uDE99', check: function(d) { return (d.placed || []).length >= 5; }, progress: function(d) { return (d.placed || []).length + '/5 coins'; } },
      { id: 'make_change', label: 'Successfully make change for a purchase', icon: '\uD83D\uDCB0', check: function(d) { return d.changeFeedback === 'correct'; }, progress: function(d) { return d.changeFeedback === 'correct' ? 'Done!' : 'Try making change'; } },
      { id: 'shop_3_items', label: 'Add 3 items to shopping cart', icon: '\uD83D\uDED2', check: function(d) { return (d.cart || []).length >= 3; }, progress: function(d) { return (d.cart || []).length + '/3 items'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var setExploreScore = ctx.setExploreScore || function(){};
      var exploreScore = ctx.exploreScore || { correct: 0, total: 0 };
      var submitExploreScore = ctx.submitExploreScore || function(){};
      var exploreDifficulty = ctx.exploreDifficulty || 'medium';
      var setExploreDifficulty = ctx.setExploreDifficulty || function(){};
      var StemAIHintButton = ctx.StemAIHintButton || null;
      var generateStemAI = ctx.generateStemAI || function(){};
      var t = ctx.t || function(s) { return s; };
      // ctx.t is the app-wide single-arg translator (t(key) -> translation or undefined);
      // it ignores a fallback arg. Wrap it so __alloT(key, fallback) actually falls back to
      // the English string for any key not (yet) in the loaded pack — otherwise missing keys
      // render as literal "undefined" (the moneyMath cash/cart/grade/currency labels bug).
      var __alloT = function (k, fb) {
        var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; }
        return (v == null || v === '' || v === k) ? (fb != null ? fb : k) : v;
      };
      
      // State bridge: map labToolData/setLabToolData to ctx.toolData/setToolData
      var labToolData = { moneyMath: (ctx.toolData && ctx.toolData._moneyMath) || {} };
      var setLabToolData = function(fn) {
        if (typeof ctx.setToolData === 'function') {
          ctx.setToolData(function(prev) {
            var oldMoneyMath = (prev && prev._moneyMath) || {};
            var fakeLD = { moneyMath: oldMoneyMath };
            var newLD = typeof fn === 'function' ? fn(fakeLD) : fn;
            return Object.assign({}, prev, { _moneyMath: newLD.moneyMath || oldMoneyMath });
          });
        }
      };
      
      // ── Inline body follows (adapted from hub) ──

            // ══════════════════════════════════════════════════════
            // MONEY MATH — Financial Literacy Manipulatives
            // ══════════════════════════════════════════════════════
            const d = labToolData.moneyMath || {};
            const upd = (key, val) => setLabToolData(prev => ({ ...prev, moneyMath: { ...prev.moneyMath, [key]: val } }));

            const tab = d.tab || 'coins';
            const grade = d.grade || 'elementary';
            const currency = d.currency || 'USD';
            const challengeMode = !!d.challengeMode;
            const showDollarLab = !!d.showDollarLab;
            const dollarSide = d.dollarSide === 'back' ? 'back' : 'front';
            const dollarFrontFeatures = [
              { color: '#fbbf24', label: __alloT('stem.money.raised_printing', 'Raised printing'), detail: __alloT('stem.money.raised_printing_detail', 'Intaglio printing gives a genuine note its distinctive texture.') },
              { color: '#a7f3d0', label: __alloT('stem.money.cotton_linen_paper', 'Cotton-linen paper'), detail: __alloT('stem.money.cotton_linen_paper_detail', 'Federal Reserve note paper is 75% cotton and 25% linen.') },
              { color: '#fb7185', label: __alloT('stem.money.embedded_fibers', 'Red + blue fibers'), detail: __alloT('stem.money.embedded_fibers_detail', 'Tiny red and blue security fibers are embedded throughout the paper.') },
              { color: '#67e8f9', label: __alloT('stem.money.serial_numbers', 'Two serial numbers'), detail: __alloT('stem.money.serial_numbers_detail', 'The same identifying serial number appears twice on the front.') },
              { color: '#d1d5db', label: __alloT('stem.money.federal_reserve_bank_seal', 'Federal Reserve seal'), detail: __alloT('stem.money.federal_reserve_bank_seal_detail', 'The black seal identifies the distributing Federal Reserve Bank.') },
              { color: '#4ade80', label: __alloT('stem.money.treasury_seal', 'Treasury seal'), detail: __alloT('stem.money.treasury_seal_detail', 'The green seal represents the U.S. Department of the Treasury.') }
            ];
            const dollarBackFeatures = [
              { color: '#fbbf24', label: __alloT('stem.money.unfinished_pyramid', 'Unfinished pyramid'), detail: __alloT('stem.money.unfinished_pyramid_detail', 'Thirteen levels symbolize the original states; the pyramid signifies strength and duration.') },
              { color: '#a7f3d0', label: __alloT('stem.money.eye_of_providence', 'Eye of Providence'), detail: __alloT('stem.money.eye_of_providence_detail', 'The eye above the pyramid appears on the reverse side of the Great Seal.') },
              { color: '#fb7185', label: __alloT('stem.money.roman_numeral_1776', 'MDCCLXXVI = 1776'), detail: __alloT('stem.money.roman_numeral_1776_detail', 'The Roman numerals at the pyramid base mark the year of American independence.') },
              { color: '#67e8f9', label: __alloT('stem.money.eagle_and_shield', 'Eagle + shield'), detail: __alloT('stem.money.eagle_and_shield_detail', 'The bald eagle bearing a shield is the obverse side of the Great Seal.') },
              { color: '#d1d5db', label: __alloT('stem.money.olive_branch_and_arrows', 'Olive branch + arrows'), detail: __alloT('stem.money.olive_branch_and_arrows_detail', 'The eagle holds symbols of peace and readiness to defend the nation.') },
              { color: '#4ade80', label: __alloT('stem.money.e_pluribus_unum', 'E Pluribus Unum'), detail: __alloT('stem.money.e_pluribus_unum_detail', 'The Latin motto on the eagle scroll means Out of Many, One.') }
            ];
            const dollarFeatureGuide = dollarSide === 'back' ? dollarBackFeatures : dollarFrontFeatures;
            const dollarFeatureIndex = Math.max(0, Math.min(dollarFeatureGuide.length - 1, Number.isFinite(Number(d.dollarFeatureIndex)) ? Number(d.dollarFeatureIndex) : 0));
            const dollarReducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const dollarAutoPlayRequested = d.dollarAutoPlay !== false;
            const dollarAutoPlay = dollarAutoPlayRequested && !dollarReducedMotion;

            // ── Currency definitions ──
            const CURRENCIES = {
              USD: { symbol: '$', name: __alloT('stem.money.us_dollar', 'US Dollar'), code: 'USD', flag: '\uD83C\uDDFA\uD83C\uDDF8',
                coins: [
                  { name: __alloT('stem.money.penny', 'Penny'), value: 0.01, color: '#b87333', size: 28, label: '1\u00A2' },
                  { name: __alloT('stem.money.nickel', 'Nickel'), value: 0.05, color: '#C0C0C0', size: 32, label: '5\u00A2' },
                  { name: __alloT('stem.money.dime', 'Dime'), value: 0.10, color: '#C0C0C0', size: 26, label: '10\u00A2' },
                  { name: __alloT('stem.money.quarter', 'Quarter'), value: 0.25, color: '#C0C0C0', size: 36, label: '25\u00A2' },
                  { name: __alloT('stem.money.half_dollar', 'Half Dollar'), value: 0.50, color: '#C0C0C0', size: 40, label: '50\u00A2' },
                  { name: __alloT('stem.money.dollar_coin', 'Dollar Coin'), value: 1.00, color: '#FFD700', size: 38, label: '$1' }
                ],
                bills: [
                  { name: __alloT('stem.money.1_bill', '$1 Bill'), value: 1, color: '#85bb65' },
                  { name: __alloT('stem.money.5_bill', '$5 Bill'), value: 5, color: '#85bb65' },
                  { name: __alloT('stem.money.10_bill', '$10 Bill'), value: 10, color: '#85bb65' },
                  { name: __alloT('stem.money.20_bill', '$20 Bill'), value: 20, color: '#85bb65' },
                  { name: __alloT('stem.money.50_bill', '$50 Bill'), value: 50, color: '#85bb65' },
                  { name: __alloT('stem.money.100_bill', '$100 Bill'), value: 100, color: '#85bb65' }
                ]
              },
              EUR: { symbol: '\u20AC', name: __alloT('stem.money.euro', 'Euro'), code: 'EUR', flag: '\uD83C\uDDEA\uD83C\uDDFA',
                coins: [
                  { name: __alloT('stem.money.1_cent', '1 Cent'), value: 0.01, color: '#b87333', size: 24, label: '1c' },
                  { name: __alloT('stem.money.2_cent', '2 Cent'), value: 0.02, color: '#b87333', size: 26, label: '2c' },
                  { name: __alloT('stem.money.5_cent', '5 Cent'), value: 0.05, color: '#b87333', size: 28, label: '5c' },
                  { name: __alloT('stem.money.10_cent', '10 Cent'), value: 0.10, color: '#FFD700', size: 28, label: '10c' },
                  { name: __alloT('stem.money.20_cent', '20 Cent'), value: 0.20, color: '#FFD700', size: 30, label: '20c' },
                  { name: __alloT('stem.money.50_cent', '50 Cent'), value: 0.50, color: '#FFD700', size: 32, label: '50c' },
                  { name: '\u20AC1', value: 1.00, color: '#C0C0C0', size: 34, label: '\u20AC1' },
                  { name: '\u20AC2', value: 2.00, color: '#C0C0C0', size: 36, label: '\u20AC2' }
                ],
                bills: [
                  { name: '\u20AC5', value: 5, color: '#808080' }, { name: '\u20AC10', value: 10, color: '#D2691E' },
                  { name: '\u20AC20', value: 20, color: '#4169E1' }, { name: '\u20AC50', value: 50, color: '#FF8C00' },
                  { name: '\u20AC100', value: 100, color: '#228B22' }, { name: '\u20AC200', value: 200, color: '#DAA520' }
                ]
              },
              GBP: { symbol: '\u00A3', name: __alloT('stem.money.british_pound', 'British Pound'), code: 'GBP', flag: '\uD83C\uDDEC\uD83C\uDDE7',
                coins: [
                  { name: '1p', value: 0.01, color: '#b87333', size: 26, label: '1p' },
                  { name: '2p', value: 0.02, color: '#b87333', size: 30, label: '2p' },
                  { name: '5p', value: 0.05, color: '#C0C0C0', size: 24, label: '5p' },
                  { name: '10p', value: 0.10, color: '#C0C0C0', size: 28, label: '10p' },
                  { name: '20p', value: 0.20, color: '#C0C0C0', size: 28, label: '20p' },
                  { name: '50p', value: 0.50, color: '#C0C0C0', size: 32, label: '50p' },
                  { name: '\u00A31', value: 1.00, color: '#FFD700', size: 30, label: '\u00A31' },
                  { name: '\u00A32', value: 2.00, color: '#C0C0C0', size: 34, label: '\u00A32' }
                ],
                bills: [
                  { name: '\u00A35', value: 5, color: '#4BB5C1' }, { name: '\u00A310', value: 10, color: '#D2691E' },
                  { name: '\u00A320', value: 20, color: '#8B008B' }, { name: '\u00A350', value: 50, color: '#DC143C' }
                ]
              },
              CAD: { symbol: 'C$', name: __alloT('stem.money.canadian_dollar', 'Canadian Dollar'), code: 'CAD', flag: '\uD83C\uDDE8\uD83C\uDDE6',
                coins: [
                  { name: '1\u00A2', value: 0.01, color: '#b87333', size: 26, label: '1\u00A2' },
                  { name: '5\u00A2', value: 0.05, color: '#C0C0C0', size: 28, label: '5\u00A2' },
                  { name: '10\u00A2', value: 0.10, color: '#C0C0C0', size: 26, label: '10\u00A2' },
                  { name: '25\u00A2', value: 0.25, color: '#C0C0C0', size: 30, label: '25\u00A2' },
                  { name: __alloT('stem.money.loonie', 'Loonie'), value: 1.00, color: '#FFD700', size: 34, label: '$1' },
                  { name: __alloT('stem.money.toonie', 'Toonie'), value: 2.00, color: '#C0C0C0', size: 36, label: '$2' }
                ],
                bills: [
                  { name: 'C$5', value: 5, color: '#4169E1' }, { name: 'C$10', value: 10, color: '#8B008B' },
                  { name: 'C$20', value: 20, color: '#228B22' }, { name: 'C$50', value: 50, color: '#DC143C' },
                  { name: 'C$100', value: 100, color: '#DAA520' }
                ]
              },
              JPY: { symbol: '\u00A5', name: __alloT('stem.money.japanese_yen', 'Japanese Yen'), code: 'JPY', flag: '\uD83C\uDDEF\uD83C\uDDF5',
                coins: [
                  { name: '1\u5186', value: 1, color: '#C0C0C0', size: 26, label: '\u00A51' },
                  { name: '5\u5186', value: 5, color: '#DAA520', size: 28, label: '\u00A55' },
                  { name: '10\u5186', value: 10, color: '#b87333', size: 30, label: '\u00A510' },
                  { name: '50\u5186', value: 50, color: '#C0C0C0', size: 28, label: '\u00A550' },
                  { name: '100\u5186', value: 100, color: '#C0C0C0', size: 30, label: '\u00A5100' },
                  { name: '500\u5186', value: 500, color: '#FFD700', size: 34, label: '\u00A5500' }
                ],
                bills: [
                  { name: '\u00A51,000', value: 1000, color: '#4169E1' },
                  { name: '\u00A55,000', value: 5000, color: '#8B008B' },
                  { name: '\u00A510,000', value: 10000, color: '#DAA520' }
                ]
              },
              MXN: { symbol: 'MX$', name: __alloT('stem.money.mexican_peso', 'Mexican Peso'), code: 'MXN', flag: '\uD83C\uDDF2\uD83C\uDDFD',
                coins: [
                  { name: '10\u00A2', value: 0.10, color: '#C0C0C0', size: 22, label: '10c' },
                  { name: '20\u00A2', value: 0.20, color: '#C0C0C0', size: 24, label: '20c' },
                  { name: '50\u00A2', value: 0.50, color: '#C0C0C0', size: 26, label: '50c' },
                  { name: '$1', value: 1, color: '#C0C0C0', size: 28, label: '$1' },
                  { name: '$2', value: 2, color: '#C0C0C0', size: 28, label: '$2' },
                  { name: '$5', value: 5, color: '#C0C0C0', size: 30, label: '$5' },
                  { name: '$10', value: 10, color: '#C0C0C0', size: 34, label: '$10' },
                  { name: '$20', value: 20, color: '#C0C0C0', size: 36, label: '$20' }
                ],
                bills: [
                  { name: 'MX$20', value: 20, color: '#4169E1' }, { name: 'MX$50', value: 50, color: '#DC143C' },
                  { name: 'MX$100', value: 100, color: '#228B22' }, { name: 'MX$200', value: 200, color: '#DAA520' },
                  { name: 'MX$500', value: 500, color: '#8B008B' }, { name: 'MX$1000', value: 1000, color: '#808080' }
                ]
              },
              AUD: { symbol: 'A$', name: __alloT('stem.money.australian_dollar', 'Australian Dollar'), code: 'AUD', flag: '\uD83C\uDDE6\uD83C\uDDFA',
                coins: [
                  { name: '5\u00A2', value: 0.05, color: '#C0C0C0', size: 26, label: '5c' },
                  { name: '10\u00A2', value: 0.10, color: '#C0C0C0', size: 28, label: '10c' },
                  { name: '20\u00A2', value: 0.20, color: '#C0C0C0', size: 32, label: '20c' },
                  { name: '50\u00A2', value: 0.50, color: '#C0C0C0', size: 38, label: '50c' },
                  { name: 'A$1', value: 1.00, color: '#FFD700', size: 32, label: '$1' },
                  { name: 'A$2', value: 2.00, color: '#FFD700', size: 28, label: '$2' }
                ],
                bills: [
                  { name: 'A$5', value: 5, color: '#aa76c5' }, { name: 'A$10', value: 10, color: '#4169E1' },
                  { name: 'A$20', value: 20, color: '#DC143C' }, { name: 'A$50', value: 50, color: '#DAA520' },
                  { name: 'A$100', value: 100, color: '#228B22' }
                ]
              },
              INR: { symbol: '\u20B9', name: __alloT('stem.money.indian_rupee', 'Indian Rupee'), code: 'INR', flag: '\uD83C\uDDEE\uD83C\uDDF3',
                coins: [
                  { name: '\u20B91', value: 1, color: '#C0C0C0', size: 28, label: '\u20B91' },
                  { name: '\u20B92', value: 2, color: '#C0C0C0', size: 30, label: '\u20B92' },
                  { name: '\u20B95', value: 5, color: '#C0C0C0', size: 30, label: '\u20B95' },
                  { name: '\u20B910', value: 10, color: '#C0C0C0', size: 34, label: '\u20B910' },
                  { name: '\u20B920', value: 20, color: '#FFD700', size: 34, label: '\u20B920' }
                ],
                bills: [
                  { name: '\u20B910', value: 10, color: '#D2691E' }, { name: '\u20B920', value: 20, color: '#228B22' },
                  { name: '\u20B950', value: 50, color: '#3CB371' }, { name: '\u20B9100', value: 100, color: '#4169E1' },
                  { name: '\u20B9200', value: 200, color: '#FF8C00' }, { name: '\u20B9500', value: 500, color: '#808080' },
                  { name: '\u20B92000', value: 2000, color: '#DC143C' }
                ]
              }
            };

            const cur = CURRENCIES[currency] || CURRENCIES.USD;
            const isJPY = currency === 'JPY';
            const fmt = (v) => isJPY ? (cur.symbol + Math.round(v).toLocaleString()) : (cur.symbol + v.toFixed(2));
            const USD_BILL_VISUALS = {
              1:   { portrait: __alloT('stem.money.george_washington', 'Washington'), tint: '#dfe9d8', accent: '#2f6b4f' },
              5:   { portrait: __alloT('stem.money.abraham_lincoln', 'Lincoln'), tint: '#e8e0ec', accent: '#665071' },
              10:  { portrait: __alloT('stem.money.alexander_hamilton', 'Hamilton'), tint: '#f4dfba', accent: '#b35b19' },
              20:  { portrait: __alloT('stem.money.andrew_jackson', 'Jackson'), tint: '#e2e7d2', accent: '#557c3e' },
              50:  { portrait: __alloT('stem.money.ulysses_grant', 'Grant'), tint: '#dce8ef', accent: '#934a56' },
              100: { portrait: __alloT('stem.money.benjamin_franklin', 'Franklin'), tint: '#d7e9ed', accent: '#16718a' }
            };
            const renderBillVisual = function (bill, compact) {
              var width = compact ? 64 : 96;
              var height = Math.round(width / 2.35);
              if (currency !== 'USD' || !USD_BILL_VISUALS[bill.value]) {
                return React.createElement('div', { 'aria-hidden': true, style: {
                  width: width + 'px', height: height + 'px', borderRadius: compact ? 3 : 5,
                  background: 'linear-gradient(135deg, ' + bill.color + ', ' + bill.color + 'aa)',
                  border: '1px solid rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: compact ? 9 : 11, fontWeight: 900, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                  boxShadow: '0 2px 5px rgba(15,23,42,0.18)', position: 'relative', overflow: 'hidden'
                } }, bill.name);
              }
              var metaBill = USD_BILL_VISUALS[bill.value];
              var numeral = String(bill.value);
              return React.createElement('div', { 'aria-hidden': true, style: {
                width: width + 'px', height: height + 'px', borderRadius: compact ? 3 : 5, position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(110deg, ' + metaBill.tint + ' 0%, #f7f8ef 48%, ' + metaBill.tint + ' 100%)',
                border: '1.5px solid ' + metaBill.accent, boxShadow: '0 2px 6px rgba(15,23,42,0.18), inset 0 0 0 2px rgba(255,255,255,0.55)',
                color: '#173f34', fontFamily: 'Georgia, serif'
              } },
                React.createElement('div', { style: { position: 'absolute', inset: compact ? 2 : 3, border: '1px solid ' + metaBill.accent + '88', borderRadius: 2 } }),
                React.createElement('span', { style: { position: 'absolute', left: compact ? 4 : 6, top: compact ? 2 : 3, color: metaBill.accent, fontSize: compact ? 10 : 14, lineHeight: 1, fontWeight: 900 } }, numeral),
                React.createElement('span', { style: { position: 'absolute', right: compact ? 4 : 6, bottom: compact ? 2 : 3, color: metaBill.accent, fontSize: compact ? 10 : 14, lineHeight: 1, fontWeight: 900 } }, numeral),
                React.createElement('div', { style: { position: 'absolute', left: '50%', top: '48%', transform: 'translate(-50%,-50%)', width: compact ? 17 : 25, height: compact ? 20 : 29, borderRadius: '50%', border: '1px solid ' + metaBill.accent, background: 'rgba(255,255,255,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: metaBill.accent, fontSize: compact ? 8 : 11, fontWeight: 900 } }, metaBill.portrait.charAt(0)),
                React.createElement('span', { style: { position: 'absolute', left: '50%', bottom: compact ? 2 : 3, transform: 'translateX(-50%)', color: metaBill.accent, fontSize: compact ? 5 : 7, fontWeight: 900, whiteSpace: 'nowrap', letterSpacing: '.02em' } }, metaBill.portrait),
                React.createElement('div', { style: { position: 'absolute', right: compact ? 15 : 23, top: compact ? 6 : 9, width: compact ? 7 : 10, height: compact ? 7 : 10, borderRadius: '50%', border: '1px solid ' + metaBill.accent, opacity: .75 } }),
                bill.value === 100 && React.createElement('div', { style: { position: 'absolute', left: '57%', top: 1, bottom: 1, width: compact ? 2 : 3, background: '#1d9bb6aa', transform: 'rotate(-2deg)' } })
              );
            };

            const USD_COIN_VISUALS = {
              '0.01': { diameter: 19.05, face: '1¢', metal: '#b8734f', rim: '#7c4028', edge: __alloT('stem.money.plain_edge', 'Plain edge'), edgeType: 'plain' },
              '0.05': { diameter: 21.21, face: '5¢', metal: '#bec5c8', rim: '#737b80', edge: __alloT('stem.money.plain_edge', 'Plain edge'), edgeType: 'plain' },
              '0.1':  { diameter: 17.91, face: '10¢', metal: '#d8dde0', rim: '#69737a', edge: __alloT('stem.money.reeded_edge', 'Reeded edge'), edgeType: 'reeded' },
              '0.25': { diameter: 24.26, face: '25¢', metal: '#d4d9dc', rim: '#657078', edge: __alloT('stem.money.reeded_edge', 'Reeded edge'), edgeType: 'reeded' },
              '0.5':  { diameter: 30.61, face: '50¢', metal: '#d2d7da', rim: '#626c73', edge: __alloT('stem.money.reeded_edge', 'Reeded edge'), edgeType: 'reeded' },
              '1':    { diameter: 26.49, face: '$1', metal: '#d5b85f', rim: '#8d7228', edge: __alloT('stem.money.lettered_edge', 'Lettered edge'), edgeType: 'lettered' }
            };
            const renderCoinVisual = function (coin, compact) {
              var metaCoin = currency === 'USD' ? USD_COIN_VISUALS[String(coin.value)] : null;
              var size = metaCoin ? Math.round(metaCoin.diameter * (compact ? 1.35 : 1.75)) : Math.round(coin.size * (compact ? .9 : 1.15));
              var metal = metaCoin ? metaCoin.metal : coin.color;
              var rim = metaCoin ? metaCoin.rim : 'rgba(0,0,0,.28)';
              var edgeBackground = metaCoin && metaCoin.edgeType === 'reeded' ? 'repeating-conic-gradient(' + rim + ' 0deg 3deg, #eef1f2 3deg 6deg)' : 'linear-gradient(135deg, rgba(255,255,255,.65), ' + rim + ')';
              return React.createElement('div', { 'aria-hidden': true, style: {
                width: size + 'px', height: size + 'px', borderRadius: '50%', padding: compact ? 2 : 3, boxSizing: 'border-box',
                background: edgeBackground, border: metaCoin && metaCoin.edgeType === 'lettered' ? '2px dashed ' + rim : '1px solid ' + rim,
                boxShadow: '0 3px 7px rgba(15,23,42,.24), inset 0 1px 1px rgba(255,255,255,.65)', position: 'relative', flexShrink: 0
              } },
                React.createElement('div', { style: { width: '100%', height: '100%', borderRadius: '50%', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'radial-gradient(circle at 30% 24%, rgba(255,255,255,.85) 0%, rgba(255,255,255,.18) 28%, transparent 30%), radial-gradient(circle at 52% 55%, ' + metal + ', ' + rim + ')',
                  border: '1px solid rgba(255,255,255,.45)', color: metaCoin && coin.value === .01 ? '#4b2518' : '#263238', textShadow: '0 1px 0 rgba(255,255,255,.55)'
                } },
                  React.createElement('div', { style: { position: 'absolute', inset: compact ? 3 : 4, borderRadius: '50%', border: '1px solid rgba(40,50,55,.32)' } }),
                  React.createElement('span', { style: { fontSize: compact ? Math.max(8, size * .27) : Math.max(10, size * .25), lineHeight: 1, fontWeight: 900, zIndex: 1 } }, metaCoin ? metaCoin.face : coin.label),
                  !compact && React.createElement('span', { style: { position: 'absolute', left: '50%', bottom: Math.max(3, size * .10), transform: 'translateX(-50%)', fontSize: Math.max(7, size * .12), fontWeight: 900, letterSpacing: '.05em', whiteSpace: 'nowrap', opacity: .76 } }, metaCoin ? (metaCoin.edgeType === 'reeded' ? 'REEDS' : metaCoin.edgeType === 'lettered' ? 'EDGE' : 'PLAIN') : '')
                )
              );
            };

            // ── Approximate exchange rates (for educational use) ──
            const RATES = { USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, JPY: 149.5, MXN: 17.1, AUD: 1.54, INR: 83.1 };
            const convert = (amount, from, to) => amount / RATES[from] * RATES[to];

            // ── Grade-specific config ──
            const GRADE_CONFIG = {
              elementary: { label: __alloT('stem.money.elementary_k_5', '\uD83C\uDFEB Elementary (K\u20135)'), maxPrice: 10, coinsOnly: false, includePercent: false, includeTax: false, maxItems: 4, wordProblemLevel: 'simple' },
              middle: { label: __alloT('stem.money.middle_6_8', '\uD83C\uDFEB Middle (6\u20138)'), maxPrice: 50, coinsOnly: false, includePercent: true, includeTax: false, maxItems: 6, wordProblemLevel: 'moderate' },
              high: { label: __alloT('stem.money.high_school_9_12', '\uD83C\uDFEB High School (9\u201312)'), maxPrice: 200, coinsOnly: false, includePercent: true, includeTax: true, maxItems: 8, wordProblemLevel: 'advanced' },
              college: { label: __alloT('stem.money.college', '\uD83C\uDFEB College'), maxPrice: 1000, coinsOnly: false, includePercent: true, includeTax: true, maxItems: 10, wordProblemLevel: 'expert' }
            };
            const gc = GRADE_CONFIG[grade] || GRADE_CONFIG.elementary;

            // ── Board state for coin counting ──
            var placed = d.placed || [];
            var boardTotal = placed.reduce(function (s, p) { return s + p.value; }, 0);
            var isPlacedBill = function (item) {
              if (item && item.id != null && String(item.id).indexOf('-b') >= 0) return true;
              return !!(item && cur.bills.some(function (bill) { return bill.name === item.name; }));
            };
            var cashGroups = placed.reduce(function (groups, item) {
              var billItem = isPlacedBill(item);
              var key = (billItem ? 'bill|' : 'coin|') + item.name + '|' + item.value;
              var existing = groups.find(function (group) { return group.key === key; });
              if (existing) existing.count += 1;
              else groups.push({ key: key, name: item.name, value: item.value, count: 1, isBill: billItem });
              return groups;
            }, []).sort(function (a, b) { return b.value - a.value || (a.isBill === b.isBill ? 0 : a.isBill ? -1 : 1); });
            var cashBillSubtotal = cashGroups.reduce(function (sum, group) { return sum + (group.isBill ? group.value * group.count : 0); }, 0);
            var cashCoinSubtotal = cashGroups.reduce(function (sum, group) { return sum + (!group.isBill ? group.value * group.count : 0); }, 0);

            // ── Making Change state ──
            var changePrice = typeof d.changePrice === 'number' ? d.changePrice : 0;
            var changePaid = typeof d.changePaid === 'number' ? d.changePaid : 0;
            var changeAnswer = typeof d.changeAnswer === 'number' ? d.changeAnswer : null;
            var changeFeedback = d.changeFeedback || null;
            var changeScale = isJPY ? 1 : 100;
            var changeDue = Math.max(0, Math.round((changePaid - changePrice) * changeScale) / changeScale);
            var changeDenominations = cur.bills.map(function (item) {
              return { name: item.name, value: item.value, units: Math.round(item.value * changeScale), isBill: true, definition: item };
            }).concat(cur.coins.map(function (item) {
              return { name: item.name, value: item.value, units: Math.round(item.value * changeScale), isBill: false, definition: item };
            })).filter(function (item) { return item.units > 0; }).sort(function (a, b) {
              return b.units - a.units || (a.isBill === b.isBill ? 0 : a.isBill ? -1 : 1);
            }).filter(function (item, index, list) {
              return index === list.findIndex(function (candidate) { return candidate.units === item.units; });
            });
            var changeRemainderUnits = Math.round(changeDue * changeScale);
            var changePieces = changeDenominations.reduce(function (pieces, denomination) {
              var count = Math.floor(changeRemainderUnits / denomination.units);
              if (count > 0) {
                pieces.push(Object.assign({}, denomination, { count: count, subtotal: count * denomination.value }));
                changeRemainderUnits -= count * denomination.units;
              }
              return pieces;
            }, []);
            var changeRunningUnits = Math.round(changePrice * changeScale);
            var changeCountSteps = changePieces.slice().reverse().map(function (piece) {
              changeRunningUnits += piece.count * piece.units;
              return Object.assign({}, piece, { reaches: changeRunningUnits / changeScale });
            });

            // ── Store state ──
            var cart = d.cart || [];
            var cartLineDetails = cart.map(function (item) {
              var weighted = item.pricePer && item.pricePer !== 'each';
              var quantity = weighted ? (item.weight || 1) : (item.qty || 1);
              var lineTotal = item.price * quantity;
              var math = weighted
                ? quantity + ' ' + item.pricePer + ' \u00D7 ' + fmt(item.price) + '/' + item.pricePer
                : quantity + ' \u00D7 ' + fmt(item.price);
              return { name: item.name, weighted: weighted, quantity: quantity, math: math, lineTotal: lineTotal, lineTotalLabel: fmt(lineTotal) };
            });
            var cartTotal = cartLineDetails.reduce(function (sum, line) { return sum + line.lineTotal; }, 0);
            var cartItemCount = cartLineDetails.reduce(function (sum, line) { return sum + (line.weighted ? 1 : line.quantity); }, 0);
            var taxRate = gc.includeTax ? 0.08 : 0;
            var cartTax = cartTotal * taxRate;
            var cartGrand = cartTotal + cartTax;
            var lastReceipt = d.lastReceipt || null;
            var checkoutActive = !!d.checkoutActive;
            var checkoutStep = d.checkoutStep || 'estimate';
            var checkoutEstimate = d.checkoutEstimate != null ? d.checkoutEstimate : '';
            var checkoutEstimateFb = d.checkoutEstimateFb || null;
            var checkoutPayment = d.checkoutPayment || null;
            var checkoutTender = typeof d.checkoutTender === 'number' ? d.checkoutTender : null;
            var checkoutReturned = Array.isArray(d.checkoutReturned) ? d.checkoutReturned : [];
            var checkoutChangeFb = d.checkoutChangeFb || null;
            var checkoutSmallestCashUnits = changeDenominations.length ? Math.min.apply(null, changeDenominations.map(function (item) { return item.units; })) : 1;
            var checkoutCashTotal = Math.round(Math.round(cartGrand * changeScale) / checkoutSmallestCashUnits) * checkoutSmallestCashUnits / changeScale;
            var checkoutCashAdjustment = Math.round((checkoutCashTotal - cartGrand) * changeScale) / changeScale;
            var checkoutRoundSteps = isJPY ? [100, 500, 1000, 5000, 10000] : [1, 5, 10, 20, 50, 100];
            var checkoutTenderOptions = [checkoutCashTotal].concat(checkoutRoundSteps.map(function (step) {
              return Math.ceil((checkoutCashTotal * changeScale) / (step * changeScale)) * step;
            })).map(function (amount) {
              return Math.round(amount * changeScale) / changeScale;
            }).filter(function (amount, index, list) {
              return amount >= checkoutCashTotal && list.indexOf(amount) === index;
            }).slice(0, 4);
            var checkoutChangeDue = checkoutTender == null ? 0 : Math.max(0, Math.round((checkoutTender - checkoutCashTotal) * changeScale) / changeScale);
            var checkoutReturnedTotal = Math.round(checkoutReturned.reduce(function (sum, value) { return sum + (Number(value) || 0); }, 0) * changeScale) / changeScale;
            var checkoutReturnGroups = checkoutReturned.reduce(function (groups, value) {
              var denomination = changeDenominations.find(function (item) { return item.units === Math.round(Number(value) * changeScale); });
              var label = denomination ? denomination.name : fmt(Number(value) || 0);
              var existing = groups.find(function (group) { return group.value === Number(value); });
              if (existing) existing.count += 1;
              else groups.push({ value: Number(value), label: label, count: 1, isBill: denomination ? denomination.isBill : false });
              return groups;
            }, []).sort(function (a, b) { return b.value - a.value; });
            var checkoutReturnDenominations = changeDenominations.filter(function (item) {
              return item.value <= checkoutChangeDue + (1 / changeScale);
            });
            var checkoutEstimateDifference = checkoutEstimate === '' ? null : Math.round(Math.abs((Number(checkoutEstimate) || 0) - cartGrand) * changeScale) / changeScale;
            var cartReceiptSnapshot = {
              currencyCode: cur.code,
              currencyFlag: cur.flag,
              itemCount: cartItemCount,
              items: cartLineDetails.map(function (line) { return { name: line.name, math: line.math, lineTotalLabel: line.lineTotalLabel }; }),
              subtotalLabel: fmt(cartTotal),
              taxRateLabel: Math.round(taxRate * 100) + '%',
              taxLabel: fmt(cartTax),
              totalLabel: fmt(cartGrand),
              hasTax: taxRate > 0
            };
            var resetGroceryCheckout = function () {
              upd('checkoutActive', false); upd('checkoutStep', 'estimate'); upd('checkoutEstimate', '');
              upd('checkoutEstimateFb', null); upd('checkoutPayment', null); upd('checkoutTender', null);
              upd('checkoutReturned', []); upd('checkoutChangeFb', null);
            };
            var finishGroceryCheckout = function (method) {
              var paymentMethod = method || checkoutPayment || 'cash';
              var paymentLabels = { cash: __alloT('stem.money.cash', 'Cash'), debit: __alloT('stem.money.debit_card', 'Debit card'), credit: __alloT('stem.money.credit_card', 'Credit card') };
              var receipt = Object.assign({}, cartReceiptSnapshot, {
                paymentMethod: paymentMethod,
                paymentLabel: paymentLabels[paymentMethod] || paymentMethod,
                estimateLabel: checkoutEstimate === '' ? null : fmt(Number(checkoutEstimate) || 0),
                estimateDifferenceLabel: checkoutEstimateDifference == null ? null : fmt(checkoutEstimateDifference),
                tenderLabel: paymentMethod === 'cash' && checkoutTender != null ? fmt(checkoutTender) : null,
                changeLabel: paymentMethod === 'cash' ? fmt(checkoutChangeDue) : null,
                cashTotalLabel: paymentMethod === 'cash' ? fmt(checkoutCashTotal) : null,
                cashAdjustmentLabel: paymentMethod === 'cash' && checkoutCashAdjustment !== 0 ? (checkoutCashAdjustment > 0 ? '+' : '') + fmt(checkoutCashAdjustment) : null,
                returnedPieces: paymentMethod === 'cash' ? checkoutReturnGroups.map(function (group) { return { label: group.label, count: group.count }; }) : []
              });
              if (typeof addXP === 'function') addXP(25, 'Money Math: Complete grocery checkout journey');
              if (typeof awardStemXP === 'function') awardStemXP('moneyMath', 20, 'complete grocery checkout');
              if (typeof addToast === 'function') addToast('\uD83C\uDF89 Checkout complete! Total: ' + fmt(cartGrand), 'success');
              upd('lastReceipt', receipt);
              upd('cart', []);
              resetGroceryCheckout();
            };
            var storeCat = d.storeCat || 'All';
            var recipeMode = d.recipeMode || false;
            var activeRecipe = d.activeRecipe != null ? d.activeRecipe : null;
            var recipeServings = d.recipeServings || 4;

            // ── Generate store items based on grade ──
            var storeItems = d.storeItems;
            if (!storeItems) {
              var baseItems = [
                // 🥬 Produce — per-pound
                { name: __alloT('stem.money.apples', '\uD83C\uDF4E Apples'), price: 1.49, cat: 'Produce', pricePer: 'lb' },
                { name: __alloT('stem.money.bananas', '\uD83C\uDF4C Bananas'), price: 0.59, cat: 'Produce', pricePer: 'lb' },
                { name: __alloT('stem.money.grapes', '\uD83C\uDF47 Grapes'), price: 2.49, cat: 'Produce', pricePer: 'lb' },
                { name: __alloT('stem.money.lettuce', '\uD83E\uDD6C Lettuce'), price: 1.99, cat: 'Produce', pricePer: 'each' },
                { name: __alloT('stem.money.tomatoes', '\uD83C\uDF45 Tomatoes'), price: 1.79, cat: 'Produce', pricePer: 'lb' },
                { name: __alloT('stem.money.onions', '\uD83E\uDDC5 Onions'), price: 1.29, cat: 'Produce', pricePer: 'lb' },
                { name: __alloT('stem.money.potatoes', '\uD83E\uDD54 Potatoes'), price: 0.99, cat: 'Produce', pricePer: 'lb' },
                { name: __alloT('stem.money.avocados', '\uD83E\uDD51 Avocados'), price: 1.25, cat: 'Produce', pricePer: 'each' },
                { name: __alloT('stem.money.broccoli', '\uD83E\uDD66 Broccoli'), price: 1.99, cat: 'Produce', pricePer: 'lb' },
                { name: __alloT('stem.money.carrots', '\uD83E\uDD55 Carrots'), price: 1.29, cat: 'Produce', pricePer: 'lb' },
                { name: __alloT('stem.money.lemons', '\uD83C\uDF4B Lemons'), price: 0.69, cat: 'Produce', pricePer: 'each' },
                { name: __alloT('stem.money.garlic', '🧄 Garlic'), price: 0.75, cat: 'Produce', pricePer: 'each' },
                // 🥩 Meat & Fish — per-pound
                { name: __alloT('stem.money.chicken_breast', '\uD83C\uDF57 Chicken Breast'), price: 3.99, cat: 'Meat', pricePer: 'lb' },
                { name: __alloT('stem.money.ground_beef', '\uD83E\uDD69 Ground Beef'), price: 5.49, cat: 'Meat', pricePer: 'lb' },
                { name: __alloT('stem.money.salmon_fillet', '\uD83D\uDC1F Salmon Fillet'), price: 9.99, cat: 'Meat', pricePer: 'lb' },
                { name: __alloT('stem.money.bacon_1_lb', '\uD83E\uDD53 Bacon (1 lb)'), price: 6.49, cat: 'Meat', pricePer: 'each' },
                { name: __alloT('stem.money.pork_chops', '\uD83C\uDF56 Pork Chops'), price: 4.49, cat: 'Meat', pricePer: 'lb' },
                // 🧀 Dairy
                { name: __alloT('stem.money.milk_gal', '\uD83E\uDD5B Milk (gal)'), price: 3.49, cat: 'Dairy', pricePer: 'each' },
                { name: __alloT('stem.money.cheddar_cheese', '\uD83E\uDDC0 Cheddar Cheese'), price: 4.99, cat: 'Dairy', pricePer: 'each' },
                { name: __alloT('stem.money.butter', '\uD83E\uDDC8 Butter'), price: 3.99, cat: 'Dairy', pricePer: 'each' },
                { name: __alloT('stem.money.yogurt', '\uD83E\uDD5B Yogurt'), price: 1.25, cat: 'Dairy', pricePer: 'each' },
                { name: __alloT('stem.money.eggs_dozen', '\uD83E\uDD5A Eggs (dozen)'), price: 3.29, cat: 'Dairy', pricePer: 'each' },
                { name: __alloT('stem.money.heavy_cream', '\uD83E\uDD5B Heavy Cream'), price: 4.29, cat: 'Dairy', pricePer: 'each' },
                // 🍞 Bakery
                { name: __alloT('stem.money.bread', '\uD83C\uDF5E Bread'), price: 2.99, cat: 'Bakery', pricePer: 'each' },
                { name: __alloT('stem.money.bagels_6pk', '\uD83E\uDD6F Bagels (6pk)'), price: 3.49, cat: 'Bakery', pricePer: 'each' },
                { name: __alloT('stem.money.tortillas_10pk', '\uD83C\uDF2F Tortillas (10pk)'), price: 2.79, cat: 'Bakery', pricePer: 'each' },
                // 🥫 Pantry
                { name: __alloT('stem.money.rice_2_lb', '\uD83C\uDF5A Rice (2 lb)'), price: 2.99, cat: 'Pantry', pricePer: 'each' },
                { name: __alloT('stem.money.pasta_1_lb', '\uD83C\uDF5D Pasta (1 lb)'), price: 1.49, cat: 'Pantry', pricePer: 'each' },
                { name: __alloT('stem.money.canned_beans', '\uD83E\uDD6B Canned Beans'), price: 1.09, cat: 'Pantry', pricePer: 'each' },
                { name: __alloT('stem.money.sugar_4_lb', '\uD83C\uDF6F Sugar (4 lb)'), price: 3.49, cat: 'Pantry', pricePer: 'each' },
                { name: __alloT('stem.money.flour_5_lb', '\uD83C\uDF3E Flour (5 lb)'), price: 3.99, cat: 'Pantry', pricePer: 'each' },
                { name: __alloT('stem.money.olive_oil', '\uD83E\uDED2 Olive Oil'), price: 6.99, cat: 'Pantry', pricePer: 'each' },
                { name: __alloT('stem.money.peanut_butter', '\uD83E\uDD5C Peanut Butter'), price: 3.75, cat: 'Pantry', pricePer: 'each' },
                { name: __alloT('stem.money.pasta_sauce', '\uD83C\uDF45 Pasta Sauce'), price: 2.49, cat: 'Pantry', pricePer: 'each' },
                // 🧊 Frozen
                { name: __alloT('stem.money.frozen_pizza', '\uD83C\uDF55 Frozen Pizza'), price: 5.49, cat: 'Frozen', pricePer: 'each' },
                { name: __alloT('stem.money.ice_cream', '\uD83C\uDF66 Ice Cream'), price: 4.99, cat: 'Frozen', pricePer: 'each' },
                { name: __alloT('stem.money.frozen_veggies', '\uD83E\uDD66 Frozen Veggies'), price: 2.49, cat: 'Frozen', pricePer: 'each' },
                // 🥤 Drinks
                { name: __alloT('stem.money.orange_juice', '\uD83E\uDDC3 Orange Juice'), price: 3.99, cat: 'Drinks', pricePer: 'each' },
                { name: __alloT('stem.money.soda_2l', '\uD83E\uDD64 Soda (2L)'), price: 1.99, cat: 'Drinks', pricePer: 'each' },
                { name: __alloT('stem.money.water_24pk', '\uD83D\uDCA7 Water (24pk)'), price: 4.99, cat: 'Drinks', pricePer: 'each' },
                { name: __alloT('stem.money.coffee_12oz', '\u2615 Coffee (12oz)'), price: 7.99, cat: 'Drinks', pricePer: 'each' },
                // 🍫 Snacks
                { name: __alloT('stem.money.chocolate_bar', '\uD83C\uDF6B Chocolate Bar'), price: 1.25, cat: 'Snacks', pricePer: 'each' },
                { name: __alloT('stem.money.chips', '\uD83C\uDF5F Chips'), price: 3.49, cat: 'Snacks', pricePer: 'each' },
                { name: __alloT('stem.money.granola_bars', '\uD83E\uDD5C Granola Bars'), price: 4.29, cat: 'Snacks', pricePer: 'each' },
                { name: __alloT('stem.money.popcorn', '\uD83C\uDF7F Popcorn'), price: 2.99, cat: 'Snacks', pricePer: 'each' }
              ];
              storeItems = baseItems.filter(function (item) { return item.price <= gc.maxPrice; });
              upd('storeItems', storeItems);
            }
            var storeCats = ['All'];
            storeItems.forEach(function (it) { if (storeCats.indexOf(it.cat) === -1) storeCats.push(it.cat); });
            var filteredStoreItems = storeCat === 'All' ? storeItems : storeItems.filter(function (it) { return it.cat === storeCat; });

            // ── Recipe data (middle+ grades) ──
            var RECIPES = [
              { name: __alloT('stem.money.spaghetti_bolognese', '\uD83C\uDF5D Spaghetti Bolognese'), icon: '\uD83C\uDF5D', serves: 4, ingredients: [
                { item: 'Pasta (1 lb)', qty: 1, unit: 'box' }, { item: 'Ground Beef', qty: 1.5, unit: 'lb' },
                { item: 'Pasta Sauce', qty: 1, unit: 'jar' }, { item: 'Onions', qty: 0.5, unit: 'lb' },
                { item: 'Garlic', qty: 2, unit: 'cloves' }, { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' }
              ]},
              { name: __alloT('stem.money.tacos', '\uD83C\uDF2E Tacos'), icon: '\uD83C\uDF2E', serves: 4, ingredients: [
                { item: 'Ground Beef', qty: 1, unit: 'lb' }, { item: 'Tortillas (10pk)', qty: 1, unit: 'pkg' },
                { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' }, { item: 'Lettuce', qty: 1, unit: 'head' },
                { item: 'Tomatoes', qty: 0.5, unit: 'lb' }, { item: 'Onions', qty: 0.25, unit: 'lb' }
              ]},
              { name: __alloT('stem.money.pancakes', '\uD83C\uDF73 Pancakes'), icon: '\uD83C\uDF73', serves: 4, ingredients: [
                { item: 'Flour (5 lb)', qty: 1, unit: 'bag' }, { item: 'Eggs (dozen)', qty: 1, unit: 'dozen' },
                { item: 'Milk (gal)', qty: 1, unit: 'gal' }, { item: 'Butter', qty: 1, unit: 'stick' },
                { item: 'Sugar (4 lb)', qty: 1, unit: 'bag' }
              ]},
              { name: __alloT('stem.money.caesar_salad', '\uD83E\uDD57 Caesar Salad'), icon: '\uD83E\uDD57', serves: 4, ingredients: [
                { item: 'Lettuce', qty: 2, unit: 'heads' }, { item: 'Chicken Breast', qty: 1.5, unit: 'lb' },
                { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' }, { item: 'Bread', qty: 1, unit: 'loaf' },
                { item: 'Lemons', qty: 2, unit: 'each' }, { item: 'Olive Oil', qty: 1, unit: 'bottle' }
              ]},
              { name: __alloT('stem.money.chicken_stir_fry', '\uD83C\uDF5C Chicken Stir-Fry'), icon: '\uD83C\uDF5C', serves: 4, ingredients: [
                { item: 'Chicken Breast', qty: 2, unit: 'lb' }, { item: 'Broccoli', qty: 1, unit: 'lb' },
                { item: 'Carrots', qty: 0.5, unit: 'lb' }, { item: 'Rice (2 lb)', qty: 1, unit: 'bag' },
                { item: 'Onions', qty: 0.5, unit: 'lb' }, { item: 'Garlic', qty: 2, unit: 'cloves' },
                { item: 'Olive Oil', qty: 1, unit: 'bottle' }
              ]},
              { name: __alloT('stem.money.grilled_cheese', '\uD83E\uDD6A Grilled Cheese'), icon: '\uD83E\uDD6A', serves: 4, ingredients: [
                { item: 'Bread', qty: 1, unit: 'loaf' }, { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' },
                { item: 'Butter', qty: 1, unit: 'stick' }, { item: 'Tomatoes', qty: 0.5, unit: 'lb' }
              ]},
              // \u2500\u2500 More recipes (v3 additions) \u2500\u2500
              { name: __alloT('stem.money.mac_cheese', '\uD83E\uDDC0 Mac & Cheese'), icon: '\uD83E\uDDC0', serves: 4, ingredients: [
                { item: 'Pasta (1 lb)', qty: 1, unit: 'box' }, { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' },
                { item: 'Milk (gal)', qty: 1, unit: 'gal' }, { item: 'Butter', qty: 1, unit: 'stick' },
                { item: 'Flour (5 lb)', qty: 1, unit: 'bag' }
              ]},
              { name: __alloT('stem.money.chocolate_chip_cookies', '\uD83C\uDF6A Chocolate Chip Cookies'), icon: '\uD83C\uDF6A', serves: 4, ingredients: [
                { item: 'Flour (5 lb)', qty: 1, unit: 'bag' }, { item: 'Sugar (4 lb)', qty: 1, unit: 'bag' },
                { item: 'Butter', qty: 1, unit: 'stick' }, { item: 'Eggs (dozen)', qty: 1, unit: 'dozen' },
                { item: 'Chocolate Bar', qty: 2, unit: 'bars' }
              ]},
              { name: __alloT('stem.money.banana_bread', '\uD83C\uDF4C Banana Bread'), icon: '\uD83C\uDF4C', serves: 4, ingredients: [
                { item: 'Bananas', qty: 1, unit: 'lb' }, { item: 'Flour (5 lb)', qty: 1, unit: 'bag' },
                { item: 'Sugar (4 lb)', qty: 1, unit: 'bag' }, { item: 'Eggs (dozen)', qty: 1, unit: 'dozen' },
                { item: 'Butter', qty: 1, unit: 'stick' }
              ]},
              { name: __alloT('stem.money.veggie_soup', '\uD83C\uDF72 Veggie Soup'), icon: '\uD83C\uDF72', serves: 4, ingredients: [
                { item: 'Carrots', qty: 0.5, unit: 'lb' }, { item: 'Onions', qty: 0.5, unit: 'lb' },
                { item: 'Potatoes', qty: 1, unit: 'lb' }, { item: 'Broccoli', qty: 0.5, unit: 'lb' },
                { item: 'Canned Beans', qty: 1, unit: 'can' }
              ]},
              { name: __alloT('stem.money.beef_stew', '\uD83C\uDF73 Beef Stew'), icon: '\uD83C\uDF73', serves: 4, ingredients: [
                { item: 'Ground Beef', qty: 1, unit: 'lb' }, { item: 'Carrots', qty: 0.5, unit: 'lb' },
                { item: 'Potatoes', qty: 1, unit: 'lb' }, { item: 'Onions', qty: 0.5, unit: 'lb' },
                { item: 'Tomatoes', qty: 0.5, unit: 'lb' }
              ]},
              { name: __alloT('stem.money.burritos', '\uD83C\uDF2F Burritos'), icon: '\uD83C\uDF2F', serves: 4, ingredients: [
                { item: 'Ground Beef', qty: 1, unit: 'lb' }, { item: 'Tortillas (10pk)', qty: 1, unit: 'pkg' },
                { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' }, { item: 'Canned Beans', qty: 1, unit: 'can' },
                { item: 'Tomatoes', qty: 0.25, unit: 'lb' }
              ]},
              { name: __alloT('stem.money.smoothie_bowl', '\uD83C\uDF53 Smoothie Bowl'), icon: '\uD83C\uDF53', serves: 4, ingredients: [
                { item: 'Bananas', qty: 1, unit: 'lb' }, { item: 'Yogurt', qty: 1, unit: 'tub' },
                { item: 'Apples', qty: 1, unit: 'lb' }, { item: 'Granola Bars', qty: 1, unit: 'box' }
              ]},
              { name: __alloT('stem.money.french_toast', '\uD83C\uDF5E French Toast'), icon: '\uD83C\uDF5E', serves: 4, ingredients: [
                { item: 'Bread', qty: 1, unit: 'loaf' }, { item: 'Eggs (dozen)', qty: 1, unit: 'dozen' },
                { item: 'Milk (gal)', qty: 1, unit: 'gal' }, { item: 'Butter', qty: 1, unit: 'stick' },
                { item: 'Sugar (4 lb)', qty: 1, unit: 'bag' }
              ]},
              { name: __alloT('stem.money.mashed_potatoes', '\uD83E\uDD54 Mashed Potatoes'), icon: '\uD83E\uDD54', serves: 4, ingredients: [
                { item: 'Potatoes', qty: 2, unit: 'lb' }, { item: 'Butter', qty: 1, unit: 'stick' },
                { item: 'Milk (gal)', qty: 1, unit: 'gal' }, { item: 'Garlic', qty: 2, unit: 'cloves' }
              ]},
              { name: __alloT('stem.money.roast_chicken_dinner', '\uD83C\uDF57 Roast Chicken Dinner'), icon: '\uD83C\uDF57', serves: 4, ingredients: [
                { item: 'Chicken Breast', qty: 2, unit: 'lb' }, { item: 'Potatoes', qty: 1.5, unit: 'lb' },
                { item: 'Carrots', qty: 1, unit: 'lb' }, { item: 'Olive Oil', qty: 1, unit: 'bottle' },
                { item: 'Garlic', qty: 3, unit: 'cloves' }
              ]},
              { name: __alloT('stem.money.quesadillas', '\uD83E\uDED3 Quesadillas'), icon: '\uD83E\uDED3', serves: 4, ingredients: [
                { item: 'Tortillas (10pk)', qty: 1, unit: 'pkg' }, { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' },
                { item: 'Chicken Breast', qty: 1, unit: 'lb' }, { item: 'Tomatoes', qty: 0.25, unit: 'lb' }
              ]},
              { name: __alloT('stem.money.pesto_pasta', '\uD83C\uDF5D Pesto Pasta'), icon: '\uD83C\uDF5D', serves: 4, ingredients: [
                { item: 'Pasta (1 lb)', qty: 1, unit: 'box' }, { item: 'Olive Oil', qty: 1, unit: 'bottle' },
                { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' }, { item: 'Garlic', qty: 3, unit: 'cloves' },
                { item: 'Lemons', qty: 1, unit: 'each' }
              ]},
              { name: __alloT('stem.money.apple_pie', '\uD83E\uDD67 Apple Pie'), icon: '\uD83E\uDD67', serves: 4, ingredients: [
                { item: 'Apples', qty: 2, unit: 'lb' }, { item: 'Flour (5 lb)', qty: 1, unit: 'bag' },
                { item: 'Sugar (4 lb)', qty: 1, unit: 'bag' }, { item: 'Butter', qty: 1, unit: 'stick' },
                { item: 'Lemons', qty: 1, unit: 'each' }
              ]},
              { name: __alloT('stem.money.chili', '\uD83C\uDF36 Chili'), icon: '\uD83C\uDF36', serves: 4, ingredients: [
                { item: 'Ground Beef', qty: 1, unit: 'lb' }, { item: 'Canned Beans', qty: 2, unit: 'cans' },
                { item: 'Tomatoes', qty: 0.5, unit: 'lb' }, { item: 'Onions', qty: 0.5, unit: 'lb' },
                { item: 'Garlic', qty: 2, unit: 'cloves' }
              ]},
              { name: __alloT('stem.money.salmon_dinner', '\uD83D\uDC1F Salmon Dinner'), icon: '\uD83D\uDC1F', serves: 4, ingredients: [
                { item: 'Salmon Fillet', qty: 1.5, unit: 'lb' }, { item: 'Lemons', qty: 2, unit: 'each' },
                { item: 'Olive Oil', qty: 1, unit: 'bottle' }, { item: 'Broccoli', qty: 1, unit: 'lb' },
                { item: 'Potatoes', qty: 1, unit: 'lb' }
              ]},
              { name: __alloT('stem.money.egg_salad_sandwich', '\uD83E\uDD5A Egg Salad Sandwich'), icon: '\uD83E\uDD5A', serves: 4, ingredients: [
                { item: 'Eggs (dozen)', qty: 1, unit: 'dozen' }, { item: 'Bread', qty: 1, unit: 'loaf' },
                { item: 'Lettuce', qty: 1, unit: 'head' }, { item: 'Tomatoes', qty: 0.25, unit: 'lb' }
              ]},
              { name: __alloT('stem.money.yogurt_parfait', '\uD83C\uDF6F Yogurt Parfait'), icon: '\uD83C\uDF6F', serves: 4, ingredients: [
                { item: 'Yogurt', qty: 2, unit: 'tubs' }, { item: 'Bananas', qty: 0.5, unit: 'lb' },
                { item: 'Granola Bars', qty: 1, unit: 'box' }, { item: 'Apples', qty: 0.5, unit: 'lb' }
              ]},
              { name: __alloT('stem.money.tomato_soup', '\uD83C\uDF45 Tomato Soup'), icon: '\uD83C\uDF45', serves: 4, ingredients: [
                { item: 'Tomatoes', qty: 2, unit: 'lb' }, { item: 'Onions', qty: 0.5, unit: 'lb' },
                { item: 'Garlic', qty: 2, unit: 'cloves' }, { item: 'Butter', qty: 1, unit: 'stick' },
                { item: 'Bread', qty: 1, unit: 'loaf' }
              ]},
              { name: __alloT('stem.money.pizza_night', '\uD83C\uDF55 Pizza Night'), icon: '\uD83C\uDF55', serves: 4, ingredients: [
                { item: 'Frozen Pizza', qty: 2, unit: 'pizzas' }, { item: 'Soda (2L)', qty: 1, unit: 'bottle' },
                { item: 'Ice Cream', qty: 1, unit: 'tub' }
              ]},
              { name: __alloT('stem.money.breakfast_sandwich', '\uD83E\uDD6F Breakfast Sandwich'), icon: '\uD83E\uDD6F', serves: 4, ingredients: [
                { item: 'Bagels (6pk)', qty: 1, unit: 'pkg' }, { item: 'Eggs (dozen)', qty: 1, unit: 'dozen' },
                { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' }, { item: 'Bacon (1 lb)', qty: 1, unit: 'lb' }
              ]}
            ];
            var selectedRecipe = activeRecipe != null ? RECIPES[activeRecipe] : null;
            // Scale recipe ingredients by servings
            var recipeScale = selectedRecipe ? recipeServings / selectedRecipe.serves : 1;
            var scaledIngredients = selectedRecipe ? selectedRecipe.ingredients.map(function (ing) {
              return { item: ing.item, qty: Math.round(ing.qty * recipeScale * 100) / 100, unit: ing.unit };
            }) : [];
            // Check if cart satisfies recipe
            var checkRecipeCart = function () {
              if (!selectedRecipe) return null;
              var missing = []; var matched = 0;
              scaledIngredients.forEach(function (ing) {
                var inCart = cart.find(function (c) {
                  return c.name.indexOf(ing.item) >= 0 || ing.item.indexOf(c.name.replace(/^[^\s]+\s/, '')) >= 0;
                });
                if (inCart) { matched++; } else { missing.push(ing.item); }
              });
              return { matched: matched, total: scaledIngredients.length, missing: missing, complete: matched >= scaledIngredients.length };
            };

            // ── ⚡ Power Outage Cashier Rush ──
            var crActive = d.crActive || false;
            var crCustomer = d.crCustomer || null;
            var crAnswer = d.crAnswer != null ? d.crAnswer : '';
            var crFb = d.crFb || null;
            var crWave = d.crWave || 1;
            var crScore = d.crScore || 0;
            var crServed = d.crServed || 0;
            var crStartTime = d.crStartTime || null;
            var crHistory = d.crHistory || [];
            var crBest = d.crBest || 0;
            var crRecentHistory = crHistory.slice(-6);
            var crHistoryCount = crHistory.length;
            var crAverageScore = crHistoryCount ? Math.round(crHistory.reduce(function (sum, round) { return sum + (Number(round.score) || 0); }, 0) / crHistoryCount) : 0;
            var crAverageAccuracyPct = crHistoryCount ? Math.round(Math.min(100, crHistory.reduce(function (sum, round) { return sum + (Number(round.accuracy) || 0); }, 0) / crHistoryCount / 70 * 100)) : 0;
            var crAverageSpeedPct = crHistoryCount ? Math.round(Math.min(100, crHistory.reduce(function (sum, round) { return sum + (Number(round.speed) || 0); }, 0) / crHistoryCount / 30 * 100)) : 0;
            var crPerfectRounds = crHistory.filter(function (round) { return round.perfect || Number(round.score) >= 100; }).length;
            var crRecentHistoryLabel = crRecentHistory.map(function (round, roundIndex) {
              return 'Round ' + (crHistoryCount - crRecentHistory.length + roundIndex + 1) + ': ' + (Number(round.score) || 0) + ' points';
            }).join(', ');
            var crPatiencePct = d.crPatiencePct != null ? d.crPatiencePct : 100;
            var crIntro = d.crIntro != null ? d.crIntro : true;
            var crGameOver = d.crGameOver || false;
            var crPatienceTimer = d.crPatienceTimer || null;

            // ── v3 additions (Cashier Rush canvas + AlloBot Coach + Easy difficulty) ──
            var crCanvasOn    = d.crCanvasOn    !== false;            // canvas scene vs legacy text receipt (default ON)
            var crBotCoachOn  = d.crBotCoachOn  !== false;            // AlloBot guidance panel (default ON)
            var crBotTtsOn    = d.crBotTtsOn    || false;             // speak the bot's lines via TTS (default OFF — shared rooms)
            var crBotMood     = d.crBotMood     || 'happy';           // 'happy' | 'concerned' | 'cheering'
            var crBotMessage  = d.crBotMessage  || null;              // { text, kind, ts } — last bot utterance
            var crSeenIntro   = d.crSeenIntro   || false;             // suppress repeat greetings
            var crDifficulty  = d.crDifficulty  || 'easy';            // 'easy' | 'standard' | 'challenge'
            var crWrongInWave = d.crWrongInWave || 0;                 // streak tracker for AlloBot hint triggers
            var crStreak      = d.crStreak      || 0;                 // consecutive correct (for "nice flow" trigger)
            // Grocery Store: matching difficulty selector
            var storeDifficulty = d.storeDifficulty || 'easy';

            var CR_CUSTOMERS = [
              { name: __alloT('stem.money.mrs_johnson', 'Mrs. Johnson'), emoji: '\uD83D\uDC69\u200D\uD83C\uDFEB' },
              { name: __alloT('stem.money.coach_miller', 'Coach Miller'), emoji: '\uD83E\uDDD1\u200D\uD83C\uDFEB' },
              { name: __alloT('stem.money.grandma_rose', 'Grandma Rose'), emoji: '\uD83D\uDC75' },
              { name: __alloT('stem.money.officer_davis', 'Officer Davis'), emoji: '\uD83D\uDC6E' },
              { name: __alloT('stem.money.dr_patel', 'Dr. Patel'), emoji: '\uD83D\uDC69\u200D\u2695\uFE0F' },
              { name: __alloT('stem.money.mr_garcia', 'Mr. Garcia'), emoji: '\uD83D\uDC68\u200D\uD83C\uDF73' },
              { name: __alloT('stem.money.nurse_kim', 'Nurse Kim'), emoji: '\uD83D\uDC69\u200D\u2695\uFE0F' },
              { name: __alloT('stem.money.farmer_jim', 'Farmer Jim'), emoji: '\uD83E\uDDD1\u200D\uD83C\uDF3E' },
              { name: __alloT('stem.money.teen_tyler', 'Teen Tyler'), emoji: '\uD83E\uDDD2' },
              { name: __alloT('stem.money.chef_anna', 'Chef Anna'), emoji: '\uD83D\uDC69\u200D\uD83C\uDF73' },
              { name: __alloT('stem.money.pastor_brown', 'Pastor Brown'), emoji: '\uD83E\uDDD1' },
              { name: __alloT('stem.money.ms_rivera', 'Ms. Rivera'), emoji: '\uD83D\uDC69\u200D\uD83D\uDCBC' },
              { name: __alloT('stem.money.old_man_pete', 'Old Man Pete'), emoji: '\uD83D\uDC74' },
              { name: __alloT('stem.money.firefighter_sam', 'Firefighter Sam'), emoji: '\uD83E\uDDD1\u200D\uD83D\uDE92' },
              { name: __alloT('stem.money.little_timmy', 'Little Timmy'), emoji: '\uD83D\uDC66' },
              { name: __alloT('stem.money.librarian_wells', 'Librarian Wells'), emoji: '\uD83E\uDDD1\u200D\uD83D\uDCBB' }
            ];

            // ── v3: Get the price to display/use for grocery store, based on storeDifficulty ──
            // Cashier Rush has its own genCashierRound rounding tied to crDifficulty;
            // this helper is for Grocery Store display and cart-add.
            var getStorePrice = function (rawPrice) {
              if (storeDifficulty === 'easy') {
                if (isJPY) return Math.max(100, Math.round(rawPrice / 100) * 100);
                var r = Math.round(rawPrice * 2) / 2;
                return r < 0.5 ? 0.5 : r;
              }
              return rawPrice;
            };

            // ══════════════════════════════════════════════════════════
            // ── v3: Cashier Rush canvas scene ──
            // Draws the checkout counter, the customer's items lined up on the
            // counter, the cash register with running total, and the candle (whose
            // glow radius tracks patience). One static draw per React render — the
            // candle flicker is handled by a CSS overlay so we don't need an rAF
            // loop. Item rendering helpers map customer item NAMES (which start
            // with an emoji) to simple shape compositions on canvas.
            // ══════════════════════════════════════════════════════════
            var drawMilkCarton = function (c, x, y, w, h) {
              c.fillStyle = '#f8fafc'; c.fillRect(x, y, w, h);
              // Roof peak
              c.beginPath(); c.moveTo(x, y); c.lineTo(x + w/2, y - h*0.25); c.lineTo(x + w, y); c.closePath();
              c.fillStyle = '#e2e8f0'; c.fill();
              c.strokeStyle = '#475569'; c.lineWidth = 1.2; c.stroke();
              c.strokeRect(x, y, w, h);
              // Label
              c.fillStyle = '#1e40af'; c.fillRect(x + 3, y + h*0.4, w - 6, h*0.18);
              c.fillStyle = '#fff'; c.font = 'bold ' + Math.max(8, w*0.22) + 'px sans-serif';
              c.textAlign = 'center'; c.textBaseline = 'middle';
              c.fillText('MILK', x + w/2, y + h*0.49);
            };
            var drawBread = function (c, x, y, w, h) {
              c.fillStyle = '#c2914b';
              c.beginPath(); c.ellipse(x + w/2, y + h*0.6, w/2, h*0.45, 0, 0, Math.PI*2); c.fill();
              c.strokeStyle = '#7c5e2e'; c.lineWidth = 1.2; c.stroke();
              // Crust lines
              c.strokeStyle = '#a07840'; c.lineWidth = 0.8;
              for (var bi = 0; bi < 3; bi++) {
                c.beginPath();
                c.moveTo(x + w*0.2 + bi*w*0.18, y + h*0.4);
                c.lineTo(x + w*0.3 + bi*w*0.18, y + h*0.75);
                c.stroke();
              }
            };
            var drawApple = function (c, x, y, w, h) {
              c.fillStyle = '#dc2626';
              c.beginPath(); c.arc(x + w/2, y + h*0.55, Math.min(w, h)*0.42, 0, Math.PI*2); c.fill();
              c.strokeStyle = '#7f1d1d'; c.lineWidth = 1; c.stroke();
              // Stem
              c.strokeStyle = '#451a03'; c.lineWidth = 1.5;
              c.beginPath(); c.moveTo(x + w/2, y + h*0.13); c.lineTo(x + w/2 + 2, y + h*0.05); c.stroke();
              // Leaf
              c.fillStyle = '#16a34a';
              c.beginPath(); c.ellipse(x + w/2 + 5, y + h*0.13, 4, 2, -0.5, 0, Math.PI*2); c.fill();
            };
            var drawCereal = function (c, x, y, w, h) {
              c.fillStyle = '#ea580c'; c.fillRect(x, y, w, h);
              c.strokeStyle = '#7c2d12'; c.lineWidth = 1.2; c.strokeRect(x, y, w, h);
              c.fillStyle = '#fbbf24'; c.fillRect(x + 2, y + h*0.3, w - 4, h*0.22);
              c.fillStyle = '#fff'; c.font = 'bold ' + Math.max(7, w*0.18) + 'px sans-serif';
              c.textAlign = 'center'; c.textBaseline = 'middle';
              c.fillText('CEREAL', x + w/2, y + h*0.41);
              c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(x + 2, y + 2, w - 4, h*0.12);
            };
            var drawEggs = function (c, x, y, w, h) {
              c.fillStyle = '#fef3c7'; c.fillRect(x, y, w, h*0.7);
              c.strokeStyle = '#92400e'; c.lineWidth = 1.2; c.strokeRect(x, y, w, h*0.7);
              // Egg cups (2x3 grid)
              c.fillStyle = '#fef9e7';
              for (var er = 0; er < 2; er++) for (var ec = 0; ec < 3; ec++) {
                c.beginPath(); c.ellipse(x + w*(0.2 + ec*0.3), y + h*(0.18 + er*0.32), w*0.1, h*0.1, 0, 0, Math.PI*2); c.fill(); c.stroke();
              }
            };
            var drawJuice = function (c, x, y, w, h) {
              c.fillStyle = '#fdba74'; c.fillRect(x, y + h*0.1, w, h*0.9);
              c.strokeStyle = '#7c2d12'; c.lineWidth = 1.2; c.strokeRect(x, y + h*0.1, w, h*0.9);
              c.fillStyle = '#fff'; c.fillRect(x, y, w, h*0.15);
              c.strokeRect(x, y, w, h*0.15);
              c.fillStyle = '#dc2626'; c.fillRect(x + w*0.3, y + h*0.4, w*0.4, h*0.18);
              c.fillStyle = '#fff'; c.font = 'bold ' + Math.max(7, w*0.18) + 'px sans-serif';
              c.textAlign = 'center'; c.textBaseline = 'middle';
              c.fillText('OJ', x + w/2, y + h*0.5);
            };
            var drawChips = function (c, x, y, w, h) {
              c.fillStyle = '#0891b2';
              c.beginPath();
              c.moveTo(x, y + h*0.1); c.lineTo(x + w, y + h*0.1);
              c.lineTo(x + w*0.95, y + h); c.lineTo(x + w*0.05, y + h); c.closePath();
              c.fill();
              c.strokeStyle = '#164e63'; c.lineWidth = 1.2; c.stroke();
              c.fillStyle = '#fef3c7'; c.font = 'bold ' + Math.max(8, w*0.22) + 'px sans-serif';
              c.textAlign = 'center'; c.textBaseline = 'middle';
              c.fillText('CHIPS', x + w/2, y + h*0.55);
            };
            var drawBanana = function (c, x, y, w, h) {
              c.fillStyle = '#fbbf24';
              c.beginPath();
              c.moveTo(x + w*0.2, y + h*0.3);
              c.quadraticCurveTo(x + w*0.5, y + h*0.05, x + w*0.85, y + h*0.4);
              c.quadraticCurveTo(x + w*0.95, y + h*0.6, x + w*0.7, y + h*0.85);
              c.quadraticCurveTo(x + w*0.35, y + h*0.95, x + w*0.15, y + h*0.6);
              c.quadraticCurveTo(x + w*0.05, y + h*0.45, x + w*0.2, y + h*0.3);
              c.closePath();
              c.fill();
              c.strokeStyle = '#92400e'; c.lineWidth = 1; c.stroke();
            };
            var drawLeafyProduce = function (c, x, y, w, h, label) {
              var n = (label || '').toLowerCase();
              var leafColor = n.indexOf('grape') >= 0 ? '#7e22ce' : n.indexOf('lettuce') >= 0 ? '#65a30d' : '#15803d';
              c.fillStyle = leafColor;
              var leafPoints = [[.28,.55],[.48,.38],[.68,.55],[.4,.7],[.62,.72]];
              leafPoints.forEach(function (point, index) {
                c.beginPath(); c.arc(x + w * point[0], y + h * point[1], Math.max(4, Math.min(w, h) * (index === 1 ? .20 : .17)), 0, Math.PI * 2); c.fill();
              });
              c.strokeStyle = '#166534'; c.lineWidth = 1;
              c.beginPath(); c.moveTo(x + w * .5, y + h * .28); c.lineTo(x + w * .5, y + h * .92); c.stroke();
            };
            var drawRootProduce = function (c, x, y, w, h, label) {
              var n = (label || '').toLowerCase();
              if (n.indexOf('carrot') >= 0) {
                c.fillStyle = '#f97316';
                c.beginPath(); c.moveTo(x + w * .28, y + h * .26); c.lineTo(x + w * .76, y + h * .30); c.lineTo(x + w * .46, y + h * .92); c.closePath(); c.fill();
                c.strokeStyle = '#166534'; c.lineWidth = 2;
                for (var carrotLeaf = 0; carrotLeaf < 3; carrotLeaf++) {
                  c.beginPath(); c.moveTo(x + w * .5, y + h * .28); c.lineTo(x + w * (.34 + carrotLeaf * .16), y + h * .08); c.stroke();
                }
                return;
              }
              var rootColor = n.indexOf('onion') >= 0 ? '#c084fc' : n.indexOf('avocado') >= 0 ? '#65a30d' : n.indexOf('garlic') >= 0 ? '#f5f5dc' : '#a16207';
              c.fillStyle = rootColor;
              c.beginPath(); c.ellipse(x + w * .5, y + h * .58, w * .32, h * .34, 0, 0, Math.PI * 2); c.fill();
              c.strokeStyle = '#713f12'; c.lineWidth = 1; c.stroke();
              c.strokeStyle = '#166534'; c.lineWidth = 2;
              c.beginPath(); c.moveTo(x + w * .5, y + h * .26); c.lineTo(x + w * .57, y + h * .08); c.stroke();
              if (n.indexOf('avocado') >= 0) {
                c.fillStyle = '#713f12'; c.beginPath(); c.arc(x + w * .5, y + h * .62, Math.max(3, w * .11), 0, Math.PI * 2); c.fill();
              }
            };
            var drawMeatTray = function (c, x, y, w, h, label) {
              var n = (label || '').toLowerCase();
              c.fillStyle = '#f8fafc'; c.fillRect(x, y + h * .18, w, h * .68);
              c.strokeStyle = '#94a3b8'; c.lineWidth = 1.5; c.strokeRect(x, y + h * .18, w, h * .68);
              c.fillStyle = n.indexOf('chicken') >= 0 ? '#f1c7a5' : n.indexOf('bacon') >= 0 ? '#ef4444' : '#b91c1c';
              c.beginPath(); c.ellipse(x + w * .5, y + h * .52, w * .34, h * .22, -.12, 0, Math.PI * 2); c.fill();
              c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2;
              c.beginPath(); c.moveTo(x + w * .26, y + h * .48); c.lineTo(x + w * .72, y + h * .58); c.stroke();
              c.strokeStyle = '#fbbf24'; c.lineWidth = 1; c.strokeRect(x + 2, y + h * .2 + 2, w - 4, h * .68 - 4);
            };
            var drawFish = function (c, x, y, w, h) {
              c.fillStyle = '#fb7185';
              c.beginPath(); c.ellipse(x + w * .48, y + h * .55, w * .30, h * .20, 0, 0, Math.PI * 2); c.fill();
              c.beginPath(); c.moveTo(x + w * .18, y + h * .55); c.lineTo(x, y + h * .34); c.lineTo(x, y + h * .76); c.closePath(); c.fill();
              c.fillStyle = '#f8fafc'; c.beginPath(); c.arc(x + w * .64, y + h * .49, 2, 0, Math.PI * 2); c.fill();
              c.strokeStyle = '#be123c'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + w * .35, y + h * .4); c.lineTo(x + w * .35, y + h * .7); c.stroke();
            };
            var drawCheese = function (c, x, y, w, h) {
              c.fillStyle = '#facc15';
              c.beginPath(); c.moveTo(x + w * .08, y + h * .78); c.lineTo(x + w * .82, y + h * .28); c.lineTo(x + w * .9, y + h * .78); c.closePath(); c.fill();
              c.strokeStyle = '#a16207'; c.lineWidth = 1.2; c.stroke();
              c.fillStyle = '#ca8a04';
              [[.48,.58],[.68,.52],[.7,.7]].forEach(function(point){ c.beginPath(); c.arc(x + w * point[0], y + h * point[1], Math.max(2, w * .06), 0, Math.PI * 2); c.fill(); });
            };
            var drawCanJar = function (c, x, y, w, h, label) {
              var n = (label || '').toLowerCase();
              var bodyColor = n.indexOf('peanut') >= 0 ? '#c08457' : n.indexOf('sauce') >= 0 ? '#dc2626' : n.indexOf('yogurt') >= 0 ? '#f8fafc' : '#cbd5e1';
              c.fillStyle = bodyColor; c.fillRect(x + w * .12, y + h * .18, w * .76, h * .70);
              c.strokeStyle = '#475569'; c.lineWidth = 1.2; c.strokeRect(x + w * .12, y + h * .18, w * .76, h * .70);
              c.fillStyle = '#64748b'; c.fillRect(x + w * .08, y + h * .12, w * .84, h * .10);
              c.fillStyle = n.indexOf('sauce') >= 0 ? '#fef2f2' : '#fef3c7'; c.fillRect(x + w * .18, y + h * .42, w * .64, h * .22);
              c.fillStyle = '#334155'; c.font = 'bold ' + Math.max(6, w * .14) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
              c.fillText(n.indexOf('bean') >= 0 ? 'BEANS' : n.indexOf('sauce') >= 0 ? 'SAUCE' : n.indexOf('yogurt') >= 0 ? 'YOGURT' : 'JAR', x + w * .5, y + h * .53, w * .56);
            };
            var drawBottle = function (c, x, y, w, h, label) {
              var n = (label || '').toLowerCase();
              var liquidColor = n.indexOf('oil') >= 0 ? '#a3a321' : n.indexOf('water') >= 0 ? '#7dd3fc' : n.indexOf('coffee') >= 0 ? '#78350f' : '#7c3aed';
              c.fillStyle = '#e2e8f0'; c.fillRect(x + w * .36, y + h * .05, w * .28, h * .16);
              c.fillStyle = liquidColor; c.fillRect(x + w * .20, y + h * .20, w * .60, h * .70);
              c.strokeStyle = '#334155'; c.lineWidth = 1.2; c.strokeRect(x + w * .20, y + h * .20, w * .60, h * .70);
              c.fillStyle = '#f8fafc'; c.fillRect(x + w * .26, y + h * .43, w * .48, h * .18);
              c.fillStyle = '#334155'; c.font = 'bold ' + Math.max(6, w * .14) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
              c.fillText(n.indexOf('oil') >= 0 ? 'OIL' : n.indexOf('water') >= 0 ? 'WATER' : n.indexOf('coffee') >= 0 ? 'COFFEE' : 'DRINK', x + w * .5, y + h * .52, w * .42);
            };
            var drawFrozenBox = function (c, x, y, w, h, label) {
              var n = (label || '').toLowerCase();
              c.fillStyle = '#bae6fd'; c.fillRect(x, y + h * .1, w, h * .8);
              c.strokeStyle = '#0369a1'; c.lineWidth = 1.2; c.strokeRect(x, y + h * .1, w, h * .8);
              c.fillStyle = '#0ea5e9'; c.font = 'bold ' + Math.max(10, w * .26) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
              c.fillText('✦', x + w * .5, y + h * .38);
              c.fillStyle = '#0c4a6e'; c.font = 'bold ' + Math.max(6, w * .13) + 'px sans-serif';
              c.fillText(n.indexOf('pizza') >= 0 ? 'PIZZA' : n.indexOf('cream') >= 0 ? 'ICE CREAM' : 'FROZEN', x + w * .5, y + h * .68, w * .86);
            };
            var drawGeneric = function (c, x, y, w, h, label) {
              c.fillStyle = '#94a3b8'; c.fillRect(x, y, w, h);
              c.strokeStyle = '#475569'; c.lineWidth = 1; c.strokeRect(x, y, w, h);
              c.fillStyle = '#fff'; c.font = 'bold ' + Math.max(7, w*0.18) + 'px sans-serif';
              c.textAlign = 'center'; c.textBaseline = 'middle';
              c.fillText(label || '?', x + w/2, y + h/2);
            };

            // Pick a drawer based on the item name (which starts with an emoji)
            var pickItemDrawer = function (itemName) {
              var n = (itemName || '').toLowerCase();
              if (n.indexOf('bean') >= 0 || n.indexOf('peanut') >= 0 || n.indexOf('sauce') >= 0 || n.indexOf('yogurt') >= 0 || n.indexOf('butter') >= 0) return drawCanJar;
              if (n.indexOf('oil') >= 0 || n.indexOf('water') >= 0 || n.indexOf('soda') >= 0 || n.indexOf('coffee') >= 0) return drawBottle;
              if (n.indexOf('salmon') >= 0 || n.indexOf('fish') >= 0) return drawFish;
              if (n.indexOf('chicken') >= 0 || n.indexOf('beef') >= 0 || n.indexOf('pork') >= 0 || n.indexOf('bacon') >= 0) return drawMeatTray;
              if (n.indexOf('cheese') >= 0) return drawCheese;
              if (n.indexOf('frozen') >= 0 || n.indexOf('pizza') >= 0 || n.indexOf('ice cream') >= 0) return drawFrozenBox;
              if (n.indexOf('grape') >= 0 || n.indexOf('lettuce') >= 0 || n.indexOf('broccoli') >= 0) return drawLeafyProduce;
              if (n.indexOf('onion') >= 0 || n.indexOf('potato') >= 0 || n.indexOf('avocado') >= 0 || n.indexOf('carrot') >= 0 || n.indexOf('garlic') >= 0) return drawRootProduce;
              if (n.indexOf('milk') >= 0 || n.indexOf('cream') >= 0) return drawMilkCarton;
              if (n.indexOf('bread') >= 0 || n.indexOf('bagel') >= 0 || n.indexOf('tortilla') >= 0) return drawBread;
              if (n.indexOf('apple') >= 0 || n.indexOf('tomato') >= 0) return drawApple;
              if (n.indexOf('cereal') >= 0 || n.indexOf('granola') >= 0 || n.indexOf('rice') >= 0 || n.indexOf('pasta') >= 0 || n.indexOf('sugar') >= 0 || n.indexOf('flour') >= 0) return drawCereal;
              if (n.indexOf('egg') >= 0) return drawEggs;
              if (n.indexOf('juice') >= 0 || n.indexOf('orange') >= 0) return drawJuice;
              if (n.indexOf('chip') >= 0 || n.indexOf('popcorn') >= 0) return drawChips;
              if (n.indexOf('banana') >= 0 || n.indexOf('lemon') >= 0) return drawBanana;
              return drawGeneric;
            };

            // Draw the entire cashier scene onto a canvas. Called once per React render.
            var drawCashierScene = function (canvas) {
              if (!canvas) return;
              var W = canvas.offsetWidth || 600;
              var H = 280;
              canvas.width = W * 2;
              canvas.height = H * 2;
              var c = canvas.getContext('2d');
              if (!c) return;
              c.scale(2, 2);
              c.clearRect(0, 0, W, H); // 2x backing store — the scene was rendering blurry at 1x

              // Power-outage backdrop — dark blue-gray with vignette
              var bgGrad = c.createLinearGradient(0, 0, 0, H);
              bgGrad.addColorStop(0, '#0f172a');
              bgGrad.addColorStop(1, '#1e293b');
              c.fillStyle = bgGrad;
              c.fillRect(0, 0, W, H);

              // Dim grocery shelves establish the checkout setting without competing with the items.
              for (var shelfRow = 0; shelfRow < 2; shelfRow++) {
                var shelfY = 48 + shelfRow * 46;
                c.fillStyle = 'rgba(51,65,85,0.72)';
                c.fillRect(12, shelfY, W * 0.48, 30);
                c.strokeStyle = 'rgba(148,163,184,0.28)'; c.lineWidth = 1;
                c.strokeRect(12, shelfY, W * 0.48, 30);
                for (var shelfItem = 0; shelfItem < 9; shelfItem++) {
                  var shelfX = 18 + shelfItem * ((W * 0.46) / 9);
                  var shelfColors = ['#7c2d12', '#164e63', '#365314', '#713f12'];
                  c.fillStyle = shelfColors[(shelfItem + shelfRow) % shelfColors.length];
                  c.fillRect(shelfX, shelfY + 7 + (shelfItem % 2) * 3, Math.max(10, W * 0.026), 20 - (shelfItem % 2) * 3);
                }
              }

              // Hanging lane marker remains readable in the power-outage scene.
              var laneSignX = Math.min(W - 122, Math.max(W * 0.5, 160));
              c.fillStyle = '#fbbf24';
              c.fillRect(laneSignX, 8, 112, 34);
              c.fillStyle = '#111827';
              c.font = 'bold 12px sans-serif';
              c.textAlign = 'center'; c.textBaseline = 'middle';
              c.fillText('CHECKOUT 3', laneSignX + 56, 20);
              c.font = 'bold 8px sans-serif';
              c.fillText('MANUAL TOTALS', laneSignX + 56, 33);

              // Candle glow centered on the register (right side). Patience drives the radius.
              var registerX = W < 420 ? W * 0.68 : W * 0.78, registerY = H * 0.55;
              var glowRadius = (40 + (crPatiencePct / 100) * 120);
              var glow = c.createRadialGradient(registerX, registerY, 0, registerX, registerY, glowRadius);
              glow.addColorStop(0, 'rgba(252, 211, 77, 0.55)');
              glow.addColorStop(0.5, 'rgba(252, 211, 77, 0.18)');
              glow.addColorStop(1, 'rgba(252, 211, 77, 0)');
              c.fillStyle = glow;
              c.fillRect(0, 0, W, H);

              // Counter (wood grain strip at bottom)
              var counterGrad = c.createLinearGradient(0, H - 50, 0, H);
              counterGrad.addColorStop(0, '#78350f');
              counterGrad.addColorStop(1, '#451a03');
              c.fillStyle = counterGrad;
              c.fillRect(0, H - 50, W, 50);
              // Wood grain lines
              c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 0.5;
              for (var wg = 0; wg < 5; wg++) {
                c.beginPath();
                c.moveTo(0, H - 45 + wg * 8);
                c.lineTo(W, H - 45 + wg * 8 + (wg % 2 === 0 ? 2 : -2));
                c.stroke();
              }

              // Conveyor belt, rollers, and direction chevrons create a readable scan path.
              var beltX = 10, beltY = H - 76, beltRight = registerX - 62, beltH = 28;
              var beltGrad = c.createLinearGradient(0, beltY, 0, beltY + beltH);
              beltGrad.addColorStop(0, '#64748b');
              beltGrad.addColorStop(0.48, '#334155');
              beltGrad.addColorStop(1, '#1e293b');
              c.fillStyle = beltGrad;
              c.fillRect(beltX, beltY, beltRight - beltX, beltH);
              c.strokeStyle = '#94a3b8'; c.lineWidth = 1.5;
              c.strokeRect(beltX, beltY, beltRight - beltX, beltH);
              c.fillStyle = 'rgba(148,163,184,0.45)';
              for (var rollerX = beltX + 14; rollerX < beltRight - 6; rollerX += 28) {
                c.beginPath(); c.arc(rollerX, beltY + beltH / 2, 5, 0, Math.PI * 2); c.fill();
              }
              c.strokeStyle = 'rgba(251,191,36,0.6)'; c.lineWidth = 2;
              for (var chevronX = beltX + 24; chevronX < beltRight - 16; chevronX += 54) {
                c.beginPath();
                c.moveTo(chevronX, beltY + 7); c.lineTo(chevronX + 10, beltY + 14); c.lineTo(chevronX, beltY + 21);
                c.stroke();
              }

              // Items on counter — line them up left-of-register
              var items = (crCustomer && crCustomer.items) || [];
              var itemSlotW = 54;
              var itemSpacing = Math.min(itemSlotW, (beltRight - 28) / Math.max(1, items.length));
              var startX = 18;
              items.forEach(function (it, idx) {
                var ix = startX + idx * itemSpacing;
                var iy = H - 50 - 56;
                var drawer = pickItemDrawer(it.name);
                drawer(c, ix, iy, Math.max(18, Math.min(itemSlotW * 0.82, itemSpacing - 4)), 56, it.name);

                // Numbered scan-order badge stays visible even when item shapes are similar.
                c.fillStyle = '#fbbf24';
                c.beginPath(); c.arc(ix + 5, iy + 5, 8, 0, Math.PI * 2); c.fill();
                c.fillStyle = '#111827';
                c.font = 'bold 9px sans-serif';
                c.textAlign = 'center'; c.textBaseline = 'middle';
                c.fillText(String(idx + 1), ix + 5, iy + 5);

                // A compact price ticket exposes the multiplication students must perform.
                var priceTag = it.weight
                  ? it.weight + 'lb \u00D7 ' + fmt(it.price)
                  : (it.qty || 1) + ' \u00D7 ' + fmt(it.price);
                var priceTicketW = Math.max(18, itemSpacing - 4);
                c.fillStyle = '#fefce8';
                c.fillRect(ix, H - 45, priceTicketW, 16);
                c.strokeStyle = '#ca8a04'; c.lineWidth = 1;
                c.strokeRect(ix, H - 45, priceTicketW, 16);
                c.fillStyle = '#713f12';
                c.font = 'bold 8px monospace';
                c.textAlign = 'center'; c.textBaseline = 'middle';
                c.fillText(priceTag, ix + priceTicketW / 2, H - 37, priceTicketW - 4);
              });

              // Scanner glass and red scan beam mark the handoff into the register.
              var scannerX = registerX - 98, scannerY = H - 68;
              c.fillStyle = '#111827'; c.fillRect(scannerX, scannerY, 38, 20);
              c.fillStyle = '#1e3a5f'; c.fillRect(scannerX + 4, scannerY + 4, 30, 12);
              c.strokeStyle = '#60a5fa'; c.lineWidth = 1; c.strokeRect(scannerX + 4, scannerY + 4, 30, 12);
              c.strokeStyle = crFb && crFb.ok ? '#4ade80' : '#ef4444'; c.lineWidth = 2;
              c.beginPath(); c.moveTo(scannerX + 8, scannerY + 10); c.lineTo(scannerX + 30, scannerY + 10); c.stroke();

              // Cash register
              var rW = 100, rH = 80;
              var rx = registerX - rW/2, ry = registerY - rH/2;
              // Body
              c.fillStyle = '#374151'; c.fillRect(rx, ry, rW, rH);
              // Metallic top-light sheen on the register body (candlelit depth)
              var regSheen = c.createLinearGradient(0, ry, 0, ry + rH);
              regSheen.addColorStop(0, 'rgba(255,255,255,0.10)');
              regSheen.addColorStop(0.4, 'rgba(255,255,255,0)');
              c.fillStyle = regSheen;
              c.fillRect(rx, ry, rW, rH);
              c.strokeStyle = '#1f2937'; c.lineWidth = 2; c.strokeRect(rx, ry, rW, rH);
              // LCD screen (dim — power outage)
              c.fillStyle = '#1e1b4b'; c.fillRect(rx + 8, ry + 8, rW - 16, 24);
              c.strokeStyle = '#3730a3'; c.lineWidth = 1; c.strokeRect(rx + 8, ry + 8, rW - 16, 24);
              // LCD text — show "OFFLINE" since the power is out
              c.save();
              c.shadowColor = 'rgba(252, 211, 77, 0.9)'; c.shadowBlur = 8;
              c.fillStyle = 'rgba(252, 211, 77, 0.65)';
              c.font = 'bold 12px monospace';
              c.textAlign = 'center'; c.textBaseline = 'middle';
              c.fillText('OFFLINE', rx + rW/2, ry + 20);
              c.restore();
              // Keypad pattern
              c.fillStyle = '#4b5563';
              for (var kr = 0; kr < 3; kr++) for (var kc = 0; kc < 3; kc++) {
                c.fillRect(rx + 12 + kc * 26, ry + 40 + kr * 12, 22, 8);
              }
              // Candle on top of register
              c.fillStyle = '#fef3c7';
              c.fillRect(rx + rW/2 - 4, ry - 16, 8, 14);
              c.strokeStyle = '#92400e'; c.strokeRect(rx + rW/2 - 4, ry - 16, 8, 14);
              // Flame (animated by CSS overlay below; this is the static base)
              c.fillStyle = '#fbbf24';
              c.beginPath();
              c.moveTo(rx + rW/2, ry - 16);
              c.quadraticCurveTo(rx + rW/2 + 4, ry - 22, rx + rW/2, ry - 28);
              c.quadraticCurveTo(rx + rW/2 - 4, ry - 22, rx + rW/2, ry - 16);
              c.fill();
              if (crPatiencePct > 0) {
                c.fillStyle = 'rgba(254, 243, 199, 0.7)';
                c.beginPath();
                c.moveTo(rx + rW/2, ry - 18);
                c.quadraticCurveTo(rx + rW/2 + 2, ry - 22, rx + rW/2, ry - 25);
                c.quadraticCurveTo(rx + rW/2 - 2, ry - 22, rx + rW/2, ry - 18);
                c.fill();
              }

              // Customer, speech bubble, and basket make the transaction feel active.
              if (crCustomer) {
                var cuX = W - 48, cuY = H - 60;

                // Speech bubble
                var bubbleX = Math.min(W - 132, Math.max(registerX + 8, W - 150)), bubbleY = 54;
                c.fillStyle = 'rgba(248,250,252,0.94)';
                c.fillRect(bubbleX, bubbleY, 124, 34);
                c.beginPath();
                c.moveTo(bubbleX + 94, bubbleY + 34); c.lineTo(bubbleX + 106, bubbleY + 44); c.lineTo(bubbleX + 108, bubbleY + 34); c.closePath(); c.fill();
                c.fillStyle = '#334155';
                c.font = 'bold 9px sans-serif';
                c.textAlign = 'center'; c.textBaseline = 'middle';
                c.fillText(crFb ? __alloT('stem.money.thank_you', 'Thank you!') : __alloT('stem.money.total_please', 'Total, please!'), bubbleX + 62, bubbleY + 17, 116);

                // Customer silhouette
                c.fillStyle = '#64748b';
                c.beginPath();
                c.arc(cuX, cuY - 30, 12, 0, Math.PI * 2);
                c.fill();
                c.fillStyle = '#475569';
                c.fillRect(cuX - 17, cuY - 18, 34, 38);
                c.fillStyle = 'rgba(255,255,255,0.88)';
                c.font = '16px sans-serif';
                c.textAlign = 'center'; c.textBaseline = 'bottom';
                c.fillText(crCustomer.emoji || '🙂', cuX, cuY - 44);

                // Small wire basket at the customer's feet
                var basketX = W - 125, basketY = H - 42;
                c.strokeStyle = '#94a3b8'; c.lineWidth = 1.5;
                c.strokeRect(basketX, basketY, 42, 22);
                c.beginPath(); c.arc(basketX + 10, basketY + 24, 3, 0, Math.PI * 2); c.arc(basketX + 34, basketY + 24, 3, 0, Math.PI * 2); c.stroke();
                for (var basketLine = 1; basketLine < 4; basketLine++) {
                  c.beginPath(); c.moveTo(basketX + basketLine * 10, basketY + 2); c.lineTo(basketX + basketLine * 10, basketY + 20); c.stroke();
                }
              }

              // "Code Black" overlay text top-left
              c.fillStyle = 'rgba(239, 68, 68, 0.8)';
              c.font = 'bold 11px sans-serif';
              c.textAlign = 'left'; c.textBaseline = 'top';
              c.fillText('⚡ CODE BLACK — POWER OUT', 10, 8);
              c.fillStyle = 'rgba(252, 211, 77, 0.6)';
              c.font = '10px sans-serif';
              c.fillText('Wave ' + crWave + ' · ' + items.length + ' items on counter', 10, 24);

              // Scan flash overlay (drawn on top of items when feedback is fresh + correct)
              if (crFb && crFb.ok) {
                c.fillStyle = 'rgba(34, 197, 94, 0.18)';
                c.fillRect(0, 0, W, H);
              } else if (crFb && !crFb.ok) {
                c.fillStyle = 'rgba(239, 68, 68, 0.12)';
                c.fillRect(0, 0, W, H);
              }
            };

            // AlloBot avatar (inline, no external dep). Mood drives expression.
            var drawAlloBotAvatar = function (canvas, mood) {
              if (!canvas) return;
              var W = canvas.width = 80;
              var H = canvas.height = 80;
              var c = canvas.getContext('2d');
              if (!c) return;
              c.clearRect(0, 0, W, H);
              // Head (rounded square)
              c.fillStyle = '#6366f1';
              c.beginPath();
              if (typeof c.roundRect === 'function') {
                c.roundRect(10, 14, 60, 50, 12);
                c.fill();
              } else {
                c.fillRect(10, 14, 60, 50);
              }
              // Antenna
              c.strokeStyle = '#a5b4fc'; c.lineWidth = 2;
              c.beginPath(); c.moveTo(40, 14); c.lineTo(40, 6); c.stroke();
              c.fillStyle = '#fbbf24';
              c.beginPath(); c.arc(40, 4, 3, 0, Math.PI * 2); c.fill();
              // Visor
              c.fillStyle = '#1e1b4b';
              if (typeof c.roundRect === 'function') {
                c.beginPath(); c.roundRect(16, 26, 48, 20, 8); c.fill();
              } else {
                c.fillRect(16, 26, 48, 20);
              }
              // Eyes — shape by mood
              c.fillStyle = mood === 'concerned' ? '#fca5a5' : (mood === 'cheering' ? '#fde68a' : '#67e8f9');
              if (mood === 'cheering') {
                // Star eyes
                c.beginPath(); c.arc(28, 36, 4, 0, Math.PI * 2); c.fill();
                c.beginPath(); c.arc(52, 36, 4, 0, Math.PI * 2); c.fill();
                c.fillStyle = '#fff';
                c.beginPath(); c.arc(28, 36, 1.5, 0, Math.PI * 2); c.fill();
                c.beginPath(); c.arc(52, 36, 1.5, 0, Math.PI * 2); c.fill();
              } else if (mood === 'concerned') {
                // Narrow horizontal eyes
                c.fillRect(24, 35, 9, 2);
                c.fillRect(47, 35, 9, 2);
              } else {
                // Round happy eyes
                c.beginPath(); c.arc(28, 36, 3, 0, Math.PI * 2); c.fill();
                c.beginPath(); c.arc(52, 36, 3, 0, Math.PI * 2); c.fill();
              }
              // Mouth
              c.strokeStyle = '#fff'; c.lineWidth = 2; c.lineCap = 'round';
              c.beginPath();
              if (mood === 'cheering') {
                c.arc(40, 52, 8, 0.1, Math.PI - 0.1);
              } else if (mood === 'concerned') {
                c.moveTo(34, 55); c.lineTo(46, 55);
              } else {
                c.arc(40, 54, 6, 0.2, Math.PI - 0.2);
              }
              c.stroke();
              // Sparkle for cheering
              if (mood === 'cheering') {
                c.fillStyle = '#fbbf24';
                c.font = 'bold 14px sans-serif';
                c.textAlign = 'center'; c.textBaseline = 'middle';
                c.fillText('✨', 14, 18);
                c.fillText('✨', 66, 16);
              }
            };

            // ── v3: Price-rounding helper for Easy difficulty ──
            // Rounds an arbitrary price up to the nearest $0.50 increment, with a
            // floor of $0.50 and a sensible cap. Used when crDifficulty/storeDifficulty
            // is 'easy' — gives elementary students round prices to practice clean
            // addition before graduating to real-world cents-precision math.
            // For JPY (yen, no cents), rounds to nearest 100¥.
            var roundEasyPrice = function (rawPrice) {
              if (isJPY) return Math.max(100, Math.round(rawPrice / 100) * 100);
              var rounded = Math.round(rawPrice * 2) / 2;  // nearest 0.50
              if (rounded < 0.50) rounded = 0.50;
              return rounded;
            };

            var genCashierRound = function () {
              // v3: in 'easy' mode, fewer items per wave too — keeps cognitive load down
              var isEasy = crDifficulty === 'easy';
              var isChallenge = crDifficulty === 'challenge';
              // Items per wave: easy mode caps at 3, standard/challenge use original progression
              var minItems = isEasy ? 2 : (crWave <= 1 ? 2 : crWave <= 2 ? 3 : 4);
              var maxItems = isEasy ? (crWave <= 1 ? 2 : 3) : (crWave <= 1 ? 3 : crWave <= 2 ? 4 : 6);
              var numItems = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
              var items = [];
              var usedIndices = [];
              for (var ci = 0; ci < numItems; ci++) {
                var idx;
                do { idx = Math.floor(Math.random() * storeItems.length); } while (usedIndices.indexOf(idx) >= 0);
                usedIndices.push(idx);
                var si = storeItems[idx];
                var qty, weight;
                if (si.pricePer === 'lb') {
                  // Easy mode: integer pounds only, otherwise the existing fractional weight list
                  weight = isEasy
                    ? [1, 2, 3][Math.floor(Math.random() * 3)]
                    : [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3][Math.floor(Math.random() * 8)];
                  qty = 1;
                  // Apply easy-mode price quantization (round up to nearest $0.50)
                  var displayPrice = isEasy ? roundEasyPrice(si.price) : si.price;
                  items.push({ name: si.name, price: displayPrice, qty: 1, weight: weight, pricePer: 'lb' });
                } else {
                  // Easy mode: qty 1-2 only (3 things × $2.50 = mental math limit for many elementary)
                  qty = isEasy ? (Math.random() < 0.6 ? 1 : 2) : (Math.floor(Math.random() * 3) + 1);
                  var displayPrice2 = isEasy ? roundEasyPrice(si.price) : si.price;
                  items.push({ name: si.name, price: displayPrice2, qty: qty, weight: null, pricePer: 'each' });
                }
              }
              // Tax: skipped entirely in easy mode. Standard: middle/high grade waves 2+. Challenge: always.
              var includeTax = isEasy ? false : (isChallenge || (grade !== 'elementary' && crWave >= 2));
              // Coupon: skipped in easy. Standard: high grade waves 3+ at 60% chance. Challenge: any wave 2+ at 50% chance.
              var coupon = null;
              var couponChance = isEasy ? -1 : (isChallenge && crWave >= 2 ? 0.5 : (grade === 'high' && crWave >= 3 ? 0.6 : -1));
              if (couponChance > 0 && Math.random() < couponChance) {
                var couponTypes = [
                  { type: 'pct', val: [10, 15, 20][Math.floor(Math.random() * 3)], label: '' },
                  { type: 'flat', val: [1, 2, 3, 5][Math.floor(Math.random() * 4)], label: '' }
                ];
                coupon = couponTypes[Math.floor(Math.random() * 2)];
                coupon.label = coupon.type === 'pct' ? (coupon.val + '% off') : (fmt(coupon.val) + ' off');
              }
              // Calculate correct total
              var subtotal = 0;
              items.forEach(function (it) {
                if (it.weight) subtotal += Math.round(it.price * it.weight * 100) / 100;
                else subtotal += it.price * it.qty;
              });
              subtotal = Math.round(subtotal * 100) / 100;
              var afterCoupon = subtotal;
              if (coupon) {
                if (coupon.type === 'pct') afterCoupon = Math.round(subtotal * (1 - coupon.val / 100) * 100) / 100;
                else afterCoupon = Math.round(Math.max(0, subtotal - coupon.val) * 100) / 100;
              }
              var tax = includeTax ? Math.round(afterCoupon * taxRate * 100) / 100 : 0;
              var total = Math.round((afterCoupon + tax) * 100) / 100;
              // Pick customer
              var cust = CR_CUSTOMERS[Math.floor(Math.random() * CR_CUSTOMERS.length)];
              upd('crCustomer', { name: cust.name, emoji: cust.emoji, items: items, hasTax: includeTax, coupon: coupon, subtotal: subtotal, correctTotal: total, taxAmt: tax, afterCoupon: afterCoupon });
              upd('crAnswer', ''); upd('crFb', null);
              upd('crStartTime', Date.now());
              upd('crPatiencePct', 100); upd('crGameOver', false);
            };

            var startCashierRush = function () {
              upd('crActive', true); upd('crIntro', true);
              upd('crWave', 1); upd('crScore', 0); upd('crServed', 0);
              upd('crHistory', []); upd('crFb', null); upd('crCustomer', null);
              upd('crPatiencePct', 100); upd('crGameOver', false);
              // v3: reset bot trackers + greet on session start
              upd('crStreak', 0); upd('crWrongInWave', 0); upd('crBotMood', 'happy');
              if (!crSeenIntro && crBotCoachOn) {
                var greetMsg = crDifficulty === 'easy'
                  ? { text: __alloT('stem.money.power_s_out_cash_register_is_dead_cust', 'Power\'s out. Cash register is dead. Customers need you to add the prices up — they\'re all rounded to nice numbers so you can practice clean.'), kind: 'intro', ts: Date.now() }
                  : { text: __alloT('stem.money.power_s_out_cash_register_is_dead_cust_2', 'Power\'s out. Cash register is dead. Customers need you to add it up in your head.'), kind: 'intro', ts: Date.now() };
                upd('crBotMessage', greetMsg);
                upd('crSeenIntro', true);
                if (crBotTtsOn && typeof ctx.callTTS === 'function') {
                  try { ctx.callTTS(greetMsg.text); } catch (e) {}
                }
              }
            };

            var submitCashierAnswer = function () {
              if (!crCustomer || crFb) return;
              var playerVal = parseFloat(crAnswer);
              if (isNaN(playerVal)) return;
              var correct = crCustomer.correctTotal;
              var error = Math.abs(playerVal - correct);
              var accuracyScore = Math.max(0, Math.round(70 * (1 - error / Math.max(correct, 0.01))));
              var elapsed = crStartTime ? Math.round((Date.now() - crStartTime) / 1000) : 99;
              var maxTime = Math.max(15, 45 - (crWave - 1) * 5);
              var speedScore = Math.max(0, Math.round(30 * (1 - elapsed / maxTime)));
              var roundScore = accuracyScore + speedScore;
              var perfect = error < 0.02;
              var newServed = crServed + 1;
              var newScore = crScore + roundScore;
              var newHistory = crHistory.concat([{ score: roundScore, time: elapsed, accuracy: accuracyScore, speed: speedScore, perfect: perfect }]);
              var newBest = Math.max(crBest, roundScore);
              // Advance wave every 3 customers
              var newWave = crWave;
              if (newServed % 3 === 0) newWave = crWave + 1;

              // v3: AlloBot trigger state machine
              var newStreak = perfect ? (crStreak + 1) : 0;
              var newWrong = perfect ? 0 : (crWrongInWave + 1);
              var newMood = 'happy';
              var botMsg = null;
              if (!perfect && newWrong === 1) {
                botMsg = { text: __alloT('stem.money.try_this_ignore_the_cents_round_each_p', 'Try this: ignore the cents. Round each price up. Then estimate.'), kind: 'hint', ts: Date.now() };
                newMood = 'concerned';
              } else if (!perfect && newWrong >= 2) {
                // Step-by-step breakdown using the actual items
                var stepText = 'Step by step: ';
                var running = 0;
                crCustomer.items.forEach(function (it, ii) {
                  var price = it.weight ? Math.round(it.price * it.weight * 100) / 100 : (it.price * it.qty);
                  running += price;
                  stepText += (ii > 0 ? ' + ' : '') + fmt(price);
                });
                stepText += ' = ' + fmt(Math.round(running * 100) / 100);
                if (crCustomer.hasTax) stepText += '. Then add ' + (taxRate * 100) + '% tax.';
                botMsg = { text: stepText, kind: 'breakdown', ts: Date.now() };
                newMood = 'concerned';
              } else if (perfect && newStreak === 3) {
                botMsg = { text: __alloT('stem.money.nice_flow_you_re_getting_fast', 'Nice flow. You\'re getting fast.'), kind: 'praise', ts: Date.now() };
                newMood = 'happy';
              } else if (perfect && newStreak >= 5 && newStreak % 5 === 0) {
                botMsg = { text: newStreak + ' in a row! You\'re running this counter.', kind: 'praise', ts: Date.now() };
                newMood = 'cheering';
              }
              // Wave-complete override (highest priority)
              if (perfect && newServed % 3 === 0) {
                botMsg = { text: 'Wave ' + crWave + ' done. The next one has more items.', kind: 'wave', ts: Date.now() };
                newMood = 'cheering';
                newWrong = 0;  // reset wave-wrong counter on wave advance
              }
              upd('crStreak', newStreak); upd('crWrongInWave', newWrong);
              upd('crBotMood', newMood);
              if (botMsg) {
                upd('crBotMessage', botMsg);
                // TTS pass-through if enabled
                if (crBotTtsOn && typeof ctx.callTTS === 'function') {
                  try { ctx.callTTS(botMsg.text); } catch (e) {}
                }
              }

              upd('crServed', newServed); upd('crScore', newScore);
              upd('crHistory', newHistory); upd('crBest', newBest);
              upd('crWave', newWave);
              // XP
              var xpEarned = Math.round(roundScore / 10);
              if (xpEarned > 0) {
                if (typeof awardStemXP === 'function') awardStemXP('moneyMath', xpEarned, 'cashier rush');
                if (typeof addXP === 'function') addXP(xpEarned, 'Money Math: Cashier Rush');
              }
              var fbMsg = perfect
                ? '\u2705 Perfect! ' + fmt(correct) + ' \u2014 ' + roundScore + '/100 (' + elapsed + 's) +' + xpEarned + ' XP!'
                : error < correct * 0.05
                ? '\uD83D\uDFE1 Close! Answer: ' + fmt(correct) + ', you said ' + fmt(playerVal) + ' \u2014 ' + roundScore + '/100 +' + xpEarned + ' XP'
                : '\u274C Off! The total was ' + fmt(correct) + ', you said ' + fmt(playerVal) + ' \u2014 ' + roundScore + '/100';
              upd('crFb', { ok: perfect, close: error < correct * 0.05, msg: fbMsg, score: roundScore, accuracy: accuracyScore, speed: speedScore, elapsed: elapsed, correct: correct });
            };

            // ── Generate change problem ──
            var genChangeProblem = function () {
              var maxVal = gc.maxPrice;
              var price = isJPY ? (Math.floor(Math.random() * (maxVal * 0.8)) + 10) : (Math.floor(Math.random() * maxVal * 100) / 100 + 0.25);
              var smallestCashUnit = Math.min.apply(null, cur.coins.map(function (coin) { return coin.value; }));
              price = Math.max(smallestCashUnit, Math.round(price / smallestCashUnit) * smallestCashUnit);
              price = isJPY ? Math.round(price) : Math.round(price * 100) / 100;
              var paymentValues = cur.coins.concat(cur.bills).map(function (item) { return item.value; }).filter(function (value, index, list) {
                return list.indexOf(value) === index;
              }).sort(function (a, b) { return a - b; });
              var paid = paymentValues.find(function (value) { return value > price; });
              if (!paid) {
                var largestPayment = paymentValues[paymentValues.length - 1] || 1;
                paid = Math.ceil((price + smallestCashUnit) / largestPayment) * largestPayment;
              }
              upd('changePrice', price);
              upd('changePaid', paid);
              upd('changeAnswer', null);
              upd('changeFeedback', null);
            };

            // ── Exchange rate problem generator ──
            var genExchangeProblem = function () {
              var codes = Object.keys(CURRENCIES);
              var from = codes[Math.floor(Math.random() * codes.length)];
              var to = codes[Math.floor(Math.random() * codes.length)];
              while (to === from) to = codes[Math.floor(Math.random() * codes.length)];
              var amount = grade === 'elementary' ? (Math.floor(Math.random() * 9) + 1) * 10 :
                           grade === 'middle' ? Math.floor(Math.random() * 450) + 50 :
                           Math.floor(Math.random() * 4500) + 500;
              var correctAnswer = Math.round(convert(amount, from, to) * 100) / 100;
              upd('exchFrom', from); upd('exchTo', to); upd('exchAmount', amount);
              upd('exchCorrect', correctAnswer); upd('exchAnswer', null); upd('exchFeedback', null);
            };

            // ── Word problem via AI ──
            var genWordProblem = function () {
              upd('wpLoading', true); upd('wpProblem', null); upd('wpAnswer', null); upd('wpFeedback', null);
              var levelText = gc.wordProblemLevel;
              var taxNote = gc.includeTax ? ' Include sales tax problems (8% rate).' : '';
              var percentNote = gc.includePercent ? ' Include percentage, discount, and tip calculations.' : '';
              var currNote = 'Use ' + cur.name + ' (' + cur.symbol + ').';
              var convNote = Object.keys(CURRENCIES).length > 1 ? ' Occasionally include currency conversion between two currencies from: USD, EUR, GBP, CAD, JPY, MXN, AUD, INR. Use approximate exchange rates.' : '';
              var prompt = 'Generate ONE money math word problem for a ' + levelText + ' level student. ' + currNote + taxNote + percentNote + convNote +
                '\n\nReturn ONLY valid JSON with NO markdown:\n{"problem":"...","hint":"...","answer":number,"explanation":"step-by-step solution","category":"one of: counting|change|shopping|percent|tax|tip|conversion|budgeting"}';
              if (typeof callGemini === 'function') {
                callGemini(prompt, { temperature: 0.9, maxTokens: 500 }).then(function (resp) {
                  try {
                    var cleaned = (resp || '').replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
                    var parsed = JSON.parse(cleaned);
                    upd('wpProblem', parsed); upd('wpLoading', false);
                  } catch (e) { upd('wpLoading', false); if (typeof addToast === 'function') addToast('Could not parse word problem. Try again!', 'warning'); }
                }).catch(function () { upd('wpLoading', false); if (typeof addToast === 'function') addToast('AI unavailable \u2014 try again later.', 'error'); });
              } else { upd('wpLoading', false); }
            };

            // ── Tip & Discount problem generator ──
            var genTipProblem = function () {
              var bill = isJPY ? (Math.floor(Math.random() * 80 + 10) * 100) : (Math.floor(Math.random() * (gc.maxPrice * 0.8) * 100) / 100 + 5);
              bill = isJPY ? bill : Math.round(bill * 100) / 100;
              var tipPcts = [10, 15, 18, 20, 25];
              var tipPct = tipPcts[Math.floor(Math.random() * tipPcts.length)];
              var diners = Math.floor(Math.random() * 5) + 2;
              upd('tipBill', bill); upd('tipPct', tipPct); upd('tipDiners', diners);
              upd('tipAnswer', null); upd('tipFeedback', null); upd('tipMode', 'tip');
            };
            var genDiscountProblem = function () {
              var original = isJPY ? (Math.floor(Math.random() * 90 + 10) * 100) : (Math.round((Math.random() * gc.maxPrice * 0.9 + 5) * 100) / 100);
              var discounts = [10, 15, 20, 25, 30, 40, 50, 75];
              var disc = discounts[Math.floor(Math.random() * discounts.length)];
              var hasCoupon = Math.random() > 0.5 && gc.includePercent;
              var couponAmt = hasCoupon ? (isJPY ? [100, 200, 500][Math.floor(Math.random() * 3)] : [0.50, 1, 2, 5][Math.floor(Math.random() * 4)]) : 0;
              upd('discOriginal', original); upd('discPercent', disc); upd('discCoupon', couponAmt);
              upd('discAnswer', null); upd('discFeedback', null); upd('tipMode', 'discount');
            };

            // ── Budget planner state ──
            var budgetIncome = typeof d.budgetIncome === 'number' ? d.budgetIncome : (isJPY ? 300000 : (grade === 'elementary' ? 100 : grade === 'middle' ? 500 : grade === 'high' ? 1500 : 4000));
            var budgetCats = d.budgetCats || [
              { name: __alloT('stem.money.housing', '\uD83C\uDFE0 Housing'), pct: 30, color: '#3b82f6' },
              { name: __alloT('stem.money.food', '\uD83C\uDF5E Food'), pct: 20, color: '#10b981' },
              { name: __alloT('stem.money.transport', '\uD83D\uDE97 Transport'), pct: 15, color: '#f59e0b' },
              { name: __alloT('stem.money.education', '\uD83D\uDCDA Education'), pct: 10, color: '#8b5cf6' },
              { name: __alloT('stem.money.entertainment', '\uD83C\uDFAE Entertainment'), pct: 10, color: '#ec4899' },
              { name: __alloT('stem.money.savings', '\uD83D\uDCB0 Savings'), pct: 10, color: '#06b6d4' },
              { name: __alloT('stem.money.other', '\u2764\uFE0F Other'), pct: 5, color: 'var(--allo-stem-text-soft, #94a3b8)' }
            ];
            var budgetUsed = budgetCats.reduce(function (s, c) { return s + c.pct; }, 0);
            var budgetAllocatedAmount = budgetIncome * budgetUsed / 100;
            var budgetSavingsPct = budgetCats[5] ? budgetCats[5].pct : 0;
            var budgetFlexiblePct = (budgetCats[4] ? budgetCats[4].pct : 0) + (budgetCats[6] ? budgetCats[6].pct : 0);
            var budgetSavingsAmount = budgetIncome * budgetSavingsPct / 100;
            var budgetFlexibleAmount = budgetIncome * budgetFlexiblePct / 100;
            var budgetEssentialAmount = Math.max(0, budgetAllocatedAmount - budgetSavingsAmount - budgetFlexibleAmount);
            var budgetUnallocatedAmount = budgetIncome - budgetAllocatedAmount;
            var budgetReadiness = budgetSavingsPct >= 15
              ? { label: __alloT('stem.money.strong_buffer', 'Strong buffer'), color: 'emerald', icon: '\uD83D\uDEE1\uFE0F' }
              : budgetSavingsPct >= 10
                ? { label: __alloT('stem.money.building_buffer', 'Building buffer'), color: 'amber', icon: '\uD83C\uDF31' }
                : { label: __alloT('stem.money.thin_buffer', 'Thin buffer'), color: 'rose', icon: '\u26A0\uFE0F' };
            var budgetEventDefinitions = [
              { id: 'repair', icon: grade === 'elementary' ? '\uD83D\uDEB2' : '\uD83D\uDE97', label: grade === 'elementary' ? __alloT('stem.money.bike_repair', 'Bike repair') : __alloT('stem.money.car_repair', 'Car repair'), detail: __alloT('stem.money.repair_event_detail', 'Transportation needs an unexpected repair.'), pct: 0.08 },
              { id: 'health', icon: '\uD83E\uDE79', label: __alloT('stem.money.health_expense', 'Health expense'), detail: __alloT('stem.money.health_event_detail', 'A surprise health cost arrives this month.'), pct: 0.06 },
              { id: 'utility', icon: '\uD83D\uDCA1', label: __alloT('stem.money.utility_spike', 'Utility bill spike'), detail: __alloT('stem.money.utility_event_detail', 'The monthly utility bill is higher than planned.'), pct: 0.05 },
              { id: 'school', icon: '\uD83C\uDF92', label: __alloT('stem.money.school_supplies_event', 'School supplies'), detail: __alloT('stem.money.school_event_detail', 'Required supplies were not in the original plan.'), pct: 0.04 },
              { id: 'phone', icon: '\uD83D\uDCF1', label: __alloT('stem.money.broken_phone', 'Broken phone'), detail: __alloT('stem.money.phone_event_detail', 'A necessary phone repair cannot wait.'), pct: 0.07 }
            ];
            var budgetEventId = d.budgetEventId || null;
            var budgetEvent = budgetEventDefinitions.find(function (event) { return event.id === budgetEventId; }) || null;
            var budgetEventChoice = d.budgetEventChoice || null;
            var budgetEventFb = d.budgetEventFb || null;
            var budgetEventResolved = !!d.budgetEventResolved;
            var budgetEventScore = Number(d.budgetEventScore) || 0;
            var budgetEventHistory = Array.isArray(d.budgetEventHistory) ? d.budgetEventHistory : [];
            var budgetEventCost = budgetEvent ? Math.round(budgetIncome * budgetEvent.pct * changeScale) / changeScale : 0;
            var budgetBorrowCost = Math.round(budgetEventCost * 1.15 * changeScale) / changeScale;
            var generateBudgetEvent = function () {
              var choices = budgetEventDefinitions.filter(function (event) { return event.id !== budgetEventId; });
              var nextEvent = choices[Math.floor(Math.random() * choices.length)] || budgetEventDefinitions[0];
              upd('budgetEventId', nextEvent.id); upd('budgetEventChoice', null); upd('budgetEventFb', null); upd('budgetEventResolved', false);
            };
            var chooseBudgetEventResponse = function (choice) {
              if (!budgetEvent || budgetEventResolved) return;
              var canCover = true;
              var points = 0;
              var message = '';
              var impact = '';
              if (choice === 'savings') {
                canCover = budgetSavingsAmount >= budgetEventCost;
                points = canCover ? 3 : 0;
                message = canCover
                  ? __alloT('stem.money.savings_cover_event', '\u2705 Your emergency savings covers the expense without debt.')
                  : __alloT('stem.money.savings_short_event', '\u26A0\uFE0F Savings alone cannot cover this expense yet.');
                impact = canCover
                  ? fmt(budgetSavingsAmount) + ' \u2212 ' + fmt(budgetEventCost) + ' = ' + fmt(budgetSavingsAmount - budgetEventCost)
                  : __alloT('stem.money.short_by', 'Short by') + ' ' + fmt(budgetEventCost - budgetSavingsAmount);
              } else if (choice === 'flexible') {
                canCover = budgetFlexibleAmount >= budgetEventCost;
                points = canCover ? 2 : 0;
                message = canCover
                  ? __alloT('stem.money.flexible_cover_event', '\u2705 Cutting flexible spending covers the expense this month.')
                  : __alloT('stem.money.flexible_short_event', '\u26A0\uFE0F Flexible spending is not large enough to cover this expense.');
                impact = canCover
                  ? fmt(budgetFlexibleAmount) + ' \u2212 ' + fmt(budgetEventCost) + ' = ' + fmt(budgetFlexibleAmount - budgetEventCost)
                  : __alloT('stem.money.short_by', 'Short by') + ' ' + fmt(budgetEventCost - budgetFlexibleAmount);
              } else {
                points = 1;
                message = __alloT('stem.money.borrow_event', '\uD83C\uDFE6 Borrowing solves today\'s problem, but repayment costs more next month.');
                impact = fmt(budgetEventCost) + ' \u00D7 1.15 = ' + fmt(budgetBorrowCost);
              }
              var resolved = choice === 'borrow' || canCover;
              upd('budgetEventChoice', choice);
              upd('budgetEventFb', { ok: resolved, message: message, impact: impact, points: points });
              if (resolved) {
                upd('budgetEventResolved', true);
                upd('budgetEventScore', budgetEventScore + points);
                upd('budgetEventHistory', budgetEventHistory.concat([{ id: budgetEvent.id, icon: budgetEvent.icon, label: budgetEvent.label, choice: choice, points: points }]).slice(-5));
                if (typeof addXP === 'function') addXP(points * 3, 'Money Math: Budget surprise decision');
                if (typeof awardStemXP === 'function') awardStemXP('moneyMath', points * 2, 'budget surprise decision');
              }
            };

            // â”€â”€ Fewest coins challenge â”€â”€
            var genFewestCoinsChallenge = function () {
              var maxC = isJPY ? 5000 : gc.maxPrice;
              var target = isJPY ? (Math.floor(Math.random() * 49 + 1) * 100 + Math.floor(Math.random() * 10) * 10) : (Math.round((Math.random() * maxC + 0.10) * 100) / 100);
              // Greedy algorithm for fewest coins+bills
              var allDenoms = cur.bills.map(function (b) { return b.value; }).concat(cur.coins.map(function (c) { return c.value; })).sort(function (a, b) { return b - a; });
              var remaining = Math.round(target * 100);
              var count = 0;
              allDenoms.forEach(function (dv) {
                var dCents = Math.round(dv * 100);
                while (remaining >= dCents) { remaining -= dCents; count++; }
              });
              upd('fcTarget', target); upd('fcOptimal', count); upd('fcAnswer', null); upd('fcFeedback', null);
              upd('fcPlaced', []);
            };

            // ── Unit pricing problem ──
            var genUnitPriceProblem = function () {
              var items = [
                { name: __alloT('stem.money.apples_2', '\uD83C\uDF4E Apples'), unit: 'lb' }, { name: __alloT('stem.money.bananas_2', '\uD83C\uDF4C Bananas'), unit: 'lb' },
                { name: __alloT('stem.money.milk', '\uD83E\uDD5B Milk'), unit: 'gallon' }, { name: __alloT('stem.money.juice', '\uD83E\uDDC3 Juice'), unit: 'oz' },
                { name: __alloT('stem.money.bread_2', '\uD83C\uDF5E Bread'), unit: 'loaf' }, { name: __alloT('stem.money.cereal', '\uD83C\uDF6B Cereal'), unit: 'oz' },
                { name: __alloT('stem.money.paper_towels', '\uD83E\uDDFB Paper Towels'), unit: 'roll' }, { name: __alloT('stem.money.coffee', '\u2615 Coffee'), unit: 'oz' }
              ];
              var item = items[Math.floor(Math.random() * items.length)];
              var qtyA = Math.floor(Math.random() * 5) + 1;
              var priceA = Math.round((Math.random() * 8 + 1) * 100) / 100;
              var qtyB = qtyA + Math.floor(Math.random() * 5) + 1;
              var betterDeal = Math.random() > 0.5;
              var unitPriceA = priceA / qtyA;
              var priceB = betterDeal ? Math.round(unitPriceA * qtyB * (0.7 + Math.random() * 0.25) * 100) / 100 : Math.round(unitPriceA * qtyB * (1.05 + Math.random() * 0.3) * 100) / 100;
              upd('upItem', item); upd('upA', { qty: qtyA, price: priceA }); upd('upB', { qty: qtyB, price: priceB });
              upd('upAnswer', null); upd('upFeedback', null);
            };

            // ── Estimation Challenge generators ──
            var genEstimateTotal = function () {
              var n = Math.floor(Math.random() * 4) + 3; // 3-6 items
              var items = [];
              var possibleNames = ['\uD83C\uDF4E Apple', '\uD83C\uDF4C Banana', '\uD83E\uDD5B Milk', '\uD83C\uDF5E Bread', '\uD83E\uDDC0 Cheese', '\uD83C\uDF6B Chocolate', '\uD83C\uDF7C Juice', '\uD83E\uDD5C PB', '\uD83C\uDF55 Pizza', '\uD83E\uDD66 Broccoli', '\u2615 Coffee', '\uD83C\uDF6A Cookies'];
              var used = {};
              for (var i = 0; i < n; i++) {
                var idx; do { idx = Math.floor(Math.random() * possibleNames.length); } while (used[idx]);
                used[idx] = true;
                var price = Math.round((Math.random() * gc.maxPrice * 0.3 + 0.5) * 100) / 100;
                var qty = Math.floor(Math.random() * 3) + 1;
                items.push({ name: possibleNames[idx], price: price, qty: qty });
              }
              var total = items.reduce(function (s, it) { return s + it.price * it.qty; }, 0);
              upd('estItems', items); upd('estTotal', Math.round(total * 100) / 100);
              upd('estAnswer', null); upd('estFb', null);
            };

            var genChangeCheck = function () {
              var price = isJPY ? (Math.floor(Math.random() * 40 + 5) * 100) : (Math.round((Math.random() * gc.maxPrice * 0.7 + 1) * 100) / 100);
              var overpay = isJPY ? [1000, 5000, 10000] : [5, 10, 20, 50, 100];
              var paid = overpay.find(function (v) { return v >= price; }) || overpay[overpay.length - 1];
              var correctChange = Math.round((paid - price) * 100) / 100;
              var isWrong = Math.random() > 0.5;
              var proposedChange = isWrong ? Math.round((correctChange + (Math.random() > 0.5 ? 1 : -1) * (isJPY ? [10, 50, 100][Math.floor(Math.random() * 3)] : [0.25, 0.50, 1][Math.floor(Math.random() * 3)])) * 100) / 100 : correctChange;
              if (proposedChange < 0) proposedChange = correctChange;
              upd('ccPrice', price); upd('ccPaid', paid); upd('ccProposed', proposedChange);
              upd('ccCorrectAmt', correctChange); upd('ccIsWrong', proposedChange !== correctChange);
              upd('ccAnswer', null); upd('ccFb', null);
            };

            var genCouponStack = function () {
              var original = isJPY ? (Math.floor(Math.random() * 90 + 10) * 100) : (Math.round((Math.random() * gc.maxPrice * 0.8 + 5) * 100) / 100);
              var discounts = [];
              var numDisc = Math.floor(Math.random() * 2) + 2; // 2-3 discounts
              var pctOptions = [10, 15, 20, 25, 30];
              var flatOptions = isJPY ? [100, 200, 500] : [0.50, 1, 2, 3, 5];
              for (var j = 0; j < numDisc; j++) {
                if (Math.random() > 0.4) { discounts.push({ type: 'pct', val: pctOptions[Math.floor(Math.random() * pctOptions.length)] }); }
                else { discounts.push({ type: 'flat', val: flatOptions[Math.floor(Math.random() * flatOptions.length)] }); }
              }
              // Apply discounts sequentially
              var finalPrice = original;
              discounts.forEach(function (disc) {
                if (disc.type === 'pct') finalPrice = finalPrice * (1 - disc.val / 100);
                else finalPrice = Math.max(0, finalPrice - disc.val);
              });
              finalPrice = Math.round(finalPrice * 100) / 100;
              upd('csOriginal', original); upd('csDiscounts', discounts); upd('csFinal', finalPrice);
              upd('csAnswer', null); upd('csFb', null);
            };

            // ── Structured word problem generator (offline) ──
            var STRUCT_PROBLEMS = [
              { template: 'You buy {q1} {item1} at {p1} each and {q2} {item2} at {p2} each. What is the total cost?', fields: ['total'], compute: function (v) { return [{ val: v.q1 * v.p1 + v.q2 * v.p2, label: __alloT('stem.money.total', 'Total') }]; }, gen: function () { var q1 = Math.floor(Math.random() * 5) + 1; var q2 = Math.floor(Math.random() * 4) + 1; var p1 = Math.round((Math.random() * 4 + 0.5) * 100) / 100; var p2 = Math.round((Math.random() * 3 + 0.25) * 100) / 100; return { q1: q1, q2: q2, p1: p1, p2: p2, item1: ['\uD83C\uDF4E apples', '\uD83C\uDF4C bananas', '\uD83E\uDD5A eggs'][Math.floor(Math.random() * 3)], item2: ['\uD83C\uDF5E loaves of bread', '\uD83E\uDD5B cartons of milk', '\uD83C\uDF6B candy bars'][Math.floor(Math.random() * 3)] }; } },
              { template: 'A shirt costs {original}. It\'s on sale for {pct}% off. What do you pay?', fields: ['salePrice'], compute: function (v) { return [{ val: Math.round(v.original * (1 - v.pct / 100) * 100) / 100, label: __alloT('stem.money.sale_price', 'Sale Price') }]; }, gen: function () { return { original: Math.round((Math.random() * 40 + 10) * 100) / 100, pct: [10, 15, 20, 25, 30, 40, 50][Math.floor(Math.random() * 7)] }; } },
              { template: 'You have {have}. You want to buy something that costs {want}. How much more do you need?', fields: ['need'], compute: function (v) { return [{ val: Math.round(Math.max(0, v.want - v.have) * 100) / 100, label: __alloT('stem.money.amount_needed', 'Amount Needed') }]; }, gen: function () { var want = Math.round((Math.random() * 20 + 5) * 100) / 100; return { have: Math.round((Math.random() * want * 0.8) * 100) / 100, want: want }; } },
              { template: 'Dinner costs {bill}. You want to leave a {tipPct}% tip. What is the tip amount? What is the total with tip?', fields: ['tip', 'total'], compute: function (v) { var tip = Math.round(v.bill * v.tipPct / 100 * 100) / 100; return [{ val: tip, label: 'Tip' }, { val: Math.round((v.bill + tip) * 100) / 100, label: __alloT('stem.money.total_2', 'Total') }]; }, gen: function () { return { bill: Math.round((Math.random() * 60 + 10) * 100) / 100, tipPct: [10, 15, 18, 20, 25][Math.floor(Math.random() * 5)] }; } },
              { template: 'You earn {hourly}/hour and work {hours} hours. After {taxPct}% tax, what is your take-home pay?', fields: ['gross', 'takeHome'], compute: function (v) { var gross = Math.round(v.hourly * v.hours * 100) / 100; return [{ val: gross, label: __alloT('stem.money.gross_pay', 'Gross Pay') }, { val: Math.round(gross * (1 - v.taxPct / 100) * 100) / 100, label: 'Take-Home' }]; }, gen: function () { return { hourly: [8, 10, 12, 15, 20][Math.floor(Math.random() * 5)], hours: Math.floor(Math.random() * 30) + 10, taxPct: [10, 15, 20, 22, 25][Math.floor(Math.random() * 5)] }; } },
              { template: '{friends} friends split a {bill} bill equally. How much does each person pay?', fields: ['each'], compute: function (v) { return [{ val: Math.round(v.bill / v.friends * 100) / 100, label: __alloT('stem.money.each_pays', 'Each Pays') }]; }, gen: function () { var friends = Math.floor(Math.random() * 5) + 2; return { friends: friends, bill: Math.round(friends * (Math.random() * 15 + 5) * 100) / 100 }; } }
            ];
            var genStructuredProblem = function () {
              var prob = STRUCT_PROBLEMS[Math.floor(Math.random() * STRUCT_PROBLEMS.length)];
              var vals = prob.gen();
              var text = prob.template;
              Object.keys(vals).forEach(function (k) {
                var display = typeof vals[k] === 'number' ? fmt(vals[k]) : vals[k];
                text = text.replace('{' + k + '}', display);
              });
              var answers = prob.compute(vals);
              upd('spText', text); upd('spAnswers', answers);
              upd('spUserAnswers', answers.map(function () { return null; }));
              upd('spFb', null);
            };

            // ── Coin Drop minigame state & generator ──
            var cdTarget = typeof d.cdTarget === 'number' ? d.cdTarget : 0;
            var cdDropped = d.cdDropped || [];
            var cdTotal = cdDropped.reduce(function (s, c) { return s + c; }, 0);
            var cdRound = Math.round(cdTotal * 100) / 100;
            var cdStreak = d.cdStreak || 0;
            var cdFb = d.cdFb || null;
            var cdTimer = d.cdTimer || null;
            var cdStartTime = d.cdStartTime || null;
            var COIN_DENOMS = grade === 'elementary'
              ? [{ val: 0.01, label: '1¢', emoji: '🟤', color: '#CD7F32', size: 28 }, { val: 0.05, label: '5¢', emoji: '⚪', color: '#A8A9AD', size: 30 }, { val: 0.10, label: '10¢', emoji: '⚪', color: '#C0C0C0', size: 29 }, { val: 0.25, label: '25¢', emoji: '🪙', color: '#FFD700', size: 32 }, { val: 1.00, label: '$1', emoji: '💵', color: '#4CAF50', size: 38 }]
              : grade === 'middle'
              ? [{ val: 0.05, label: '5¢', emoji: '⚪', color: '#A8A9AD', size: 28 }, { val: 0.10, label: '10¢', emoji: '⚪', color: '#C0C0C0', size: 29 }, { val: 0.25, label: '25¢', emoji: '🪙', color: '#FFD700', size: 30 }, { val: 1.00, label: '$1', emoji: '💵', color: '#4CAF50', size: 36 }, { val: 5.00, label: '$5', emoji: '💵', color: '#2196F3', size: 38 }, { val: 10.00, label: '$10', emoji: '💵', color: '#FF9800', size: 40 }, { val: 20.00, label: '$20', emoji: '💵', color: '#9C27B0', size: 42 }]
              : [{ val: 0.10, label: '10¢', emoji: '⚪', color: '#C0C0C0', size: 28 }, { val: 0.25, label: '25¢', emoji: '🪙', color: '#FFD700', size: 30 }, { val: 1.00, label: '$1', emoji: '💵', color: '#4CAF50', size: 34 }, { val: 5.00, label: '$5', emoji: '💵', color: '#2196F3', size: 36 }, { val: 10.00, label: '$10', emoji: '💵', color: '#FF9800', size: 38 }, { val: 20.00, label: '$20', emoji: '💵', color: '#9C27B0', size: 40 }, { val: 50.00, label: '$50', emoji: '💵', color: '#00BCD4', size: 42 }, { val: 100.00, label: '$100', emoji: '💵', color: '#F44336', size: 44 }];
            var genCoinDrop = function () {
              var minT, maxT;
              if (grade === 'elementary') { minT = 0.25; maxT = 5.00; }
              else if (grade === 'middle') { minT = 1.00; maxT = 25.00; }
              else { minT = 5.00; maxT = 100.00; }
              var target = Math.round((Math.random() * (maxT - minT) + minT) * 100) / 100;
              // Round to nearest .05 for cleaner values
              target = Math.round(target * 20) / 20;
              upd('cdTarget', target); upd('cdDropped', []); upd('cdFb', null);
              upd('cdAnimDrop', null);
              if (challengeMode) upd('cdStartTime', Date.now());
            };

            // ── Personal Finance quiz generator ──
            var FIN_QUIZZES = [
              { q: 'If you invest $1,000 at 7% annual compound interest for 10 years, approximately how much will you have?', choices: ['$1,700', '$1,967', '$2,500', '$3,000'], correct: 1, explanation: __alloT('stem.money.1_000_1_07_1_967_compound_interest_gro', '$1,000 \u00D7 (1.07)\u00B9\u2070 \u2248 $1,967. Compound interest grows exponentially over time.') },
              { q: 'Which costs more total: a $20,000 loan at 5% for 5 years, or at 3% for 10 years?', choices: ['5% for 5 years', '3% for 10 years', 'They cost the same', 'Can\'t determine'], correct: 1, explanation: __alloT('stem.money.at_5_5yr_2_645_interest_at_3_10yr_3_17', 'At 5%/5yr: ~$2,645 interest. At 3%/10yr: ~$3,174 interest. Lower rate but longer term costs more in total interest.') },
              { q: 'Starting to invest $200/month at age 25 vs. age 35 (retire at 65, 7% return). How much more does the early starter have?', choices: ['About $50,000 more', 'About $130,000 more', 'About $260,000 more', 'More than $300,000 more'], correct: 2, explanation: __alloT('stem.money.age_25_262k_age_35_122k_that_s_140k_di', 'Age 25: ~$262K. Age 35: ~$122K. That\'s ~$140K difference! Time is the most powerful factor in investing.') },
              { q: 'You have $500 in credit card debt at 22% APR. Paying $25/month, roughly how long to pay off?', choices: ['About 1 year', 'About 2 years', 'About 5 years', 'Never (minimum too low)'], correct: 1, explanation: __alloT('stem.money.at_25_month_and_22_apr_it_takes_about_', 'At $25/month and 22% APR, it takes about 24 months and you pay ~$95 in interest. High-interest debt is expensive!') },
              { q: 'The "Rule of 72" estimates how long to double your money. At 6% interest, roughly how many years?', choices: ['6 years', '8 years', '10 years', '12 years'], correct: 3, explanation: __alloT('stem.money.72_6_12_years_the_rule_of_72_divide_72', '72 \u00F7 6 = 12 years. The Rule of 72: divide 72 by your interest rate to estimate doubling time.') },
              { q: 'An emergency fund should ideally cover how many months of expenses?', choices: ['1-2 months', '3-6 months', '12 months', '24 months'], correct: 1, explanation: __alloT('stem.money.financial_advisors_recommend_3_6_month', 'Financial advisors recommend 3-6 months of expenses. This covers most unexpected events like job loss or medical emergencies.') }
            ];
            var genFinQuiz = function () {
              var idx = Math.floor(Math.random() * FIN_QUIZZES.length);
              upd('fqIdx', idx); upd('fqAnswer', null); upd('fqFb', null);
            };
            var finSub = d.finSub || 'compound';
            // Compound interest defaults
            var ciPrincipal = typeof d.ciPrincipal === 'number' ? d.ciPrincipal : 1000;
            var ciRate = typeof d.ciRate === 'number' ? d.ciRate : 7;
            var ciYears = typeof d.ciYears === 'number' ? d.ciYears : 10;
            var ciFreq = d.ciFreq || 'yearly';
            var freqMap = { daily: 365, monthly: 12, quarterly: 4, yearly: 1 };
            var ciN = freqMap[ciFreq] || 1;
            // Compound interest calculation
            var ciCompound = ciPrincipal * Math.pow(1 + (ciRate / 100) / ciN, ciN * ciYears);
            var ciSimple = ciPrincipal * (1 + (ciRate / 100) * ciYears);
            var ciCompoundInterest = ciCompound - ciPrincipal;
            var ciSimpleInterest = ciSimple - ciPrincipal;
            // Growth table (year-by-year)
            var ciTable = [];
            for (var yr = 0; yr <= Math.min(ciYears, 50); yr++) {
              ciTable.push({ year: yr, compound: ciPrincipal * Math.pow(1 + (ciRate / 100) / ciN, ciN * yr), simple: ciPrincipal * (1 + (ciRate / 100) * yr) });
            }

            // Retirement defaults
            var retAge = typeof d.retAge === 'number' ? d.retAge : 22;
            var retRetireAge = typeof d.retRetireAge === 'number' ? d.retRetireAge : 65;
            var retMonthly = typeof d.retMonthly === 'number' ? d.retMonthly : 200;
            var retMatch = typeof d.retMatch === 'number' ? d.retMatch : 50;
            var retMatchCap = typeof d.retMatchCap === 'number' ? d.retMatchCap : 6;
            var retReturn = typeof d.retReturn === 'number' ? d.retReturn : 7;
            // Retirement calculation
            var calcRetirement = function (startAge, monthly, matchPct, matchCap, annualReturn) {
              var years = retRetireAge - startAge;
              if (years <= 0) return { total: 0, contributed: 0, growth: 0, yearly: [] };
              var r = annualReturn / 100 / 12;
              var totalContrib = 0;
              var balance = 0;
              var yearly = [{ age: startAge, balance: 0 }];
              for (var m = 0; m < years * 12; m++) {
                var employeeContrib = monthly;
                var salaryGuess = monthly * 12 / (matchCap / 100 || 1);
                var employerContrib = Math.min(monthly, salaryGuess * matchCap / 100) * (matchPct / 100);
                var contrib = employeeContrib + employerContrib;
                totalContrib += contrib;
                balance = (balance + contrib) * (1 + r);
                if ((m + 1) % 12 === 0) yearly.push({ age: startAge + Math.floor((m + 1) / 12), balance: balance });
              }
              return { total: balance, contributed: totalContrib, growth: balance - totalContrib, yearly: yearly };
            };
            var retResult = calcRetirement(retAge, retMonthly, retMatch, retMatchCap, retReturn);
            var retLateResult = calcRetirement(retAge + 10, retMonthly, retMatch, retMatchCap, retReturn);

            // Loan calculator defaults
            var loanAmt = typeof d.loanAmt === 'number' ? d.loanAmt : 25000;
            var loanRate = typeof d.loanRate === 'number' ? d.loanRate : 5;
            var loanTerm = typeof d.loanTerm === 'number' ? d.loanTerm : 60;
            var loanType = d.loanType || 'auto';
            var loanPresets = {
              auto: { label: __alloT('stem.money.auto_loan', '\uD83D\uDE97 Auto Loan'), amt: 25000, rate: 5, term: 60 },
              student: { label: __alloT('stem.money.student_loan', '\uD83C\uDF93 Student Loan'), amt: 35000, rate: 5.5, term: 120 },
              mortgage: { label: __alloT('stem.money.mortgage', '\uD83C\uDFE0 Mortgage'), amt: 250000, rate: 6.5, term: 360 },
              credit: { label: __alloT('stem.money.credit_card', '\uD83D\uDCB3 Credit Card'), amt: 5000, rate: 22, term: 60 }
            };
            // Monthly payment = P * [r(1+r)^n] / [(1+r)^n - 1]
            var loanR = loanRate / 100 / 12;
            var loanMonthly = loanR > 0 ? loanAmt * (loanR * Math.pow(1 + loanR, loanTerm)) / (Math.pow(1 + loanR, loanTerm) - 1) : loanAmt / loanTerm;
            var loanTotalPaid = loanMonthly * loanTerm;
            var loanTotalInterest = loanTotalPaid - loanAmt;
            // Amortization highlights
            var loanAmort = [];
            var loanBal = loanAmt;
            for (var mo = 1; mo <= loanTerm; mo++) {
              var intPmt = loanBal * loanR;
              var prinPmt = loanMonthly - intPmt;
              loanBal = Math.max(0, loanBal - prinPmt);
              if (mo === 1 || mo === Math.floor(loanTerm / 4) || mo === Math.floor(loanTerm / 2) || mo === Math.floor(loanTerm * 3 / 4) || mo === loanTerm) {
                loanAmort.push({ month: mo, payment: loanMonthly, interest: intPmt, principal: prinPmt, balance: loanBal });
              }
            }

            // Savings goal defaults
            var sgGoal = d.sgGoal || 'car';
            var sgGoals = {
              car: { label: __alloT('stem.money.car', '\uD83D\uDE97 Car'), target: 15000, emoji: '\uD83D\uDE97' },
              college: { label: __alloT('stem.money.college_fund', '\uD83C\uDF93 College Fund'), target: 50000, emoji: '\uD83C\uDF93' },
              house: { label: __alloT('stem.money.house_down_payment', '\uD83C\uDFE0 House Down Payment'), target: 60000, emoji: '\uD83C\uDFE0' },
              emergency: { label: __alloT('stem.money.emergency_fund', '\uD83D\uDEE1\uFE0F Emergency Fund'), target: 10000, emoji: '\uD83D\uDEE1\uFE0F' },
              vacation: { label: __alloT('stem.money.vacation', '\u2708\uFE0F Vacation'), target: 3000, emoji: '\u2708\uFE0F' },
              custom: { label: __alloT('stem.money.custom_goal', '\u2B50 Custom Goal'), target: 5000, emoji: '\u2B50' }
            };
            var sgTarget = typeof d.sgTarget === 'number' ? d.sgTarget : sgGoals[sgGoal].target;
            var sgMonths = typeof d.sgMonths === 'number' ? d.sgMonths : 24;
            var sgHave = typeof d.sgHave === 'number' ? d.sgHave : 0;
            var sgRate = typeof d.sgRate === 'number' ? d.sgRate : 2;
            var sgRemaining = Math.max(0, sgTarget - sgHave);
            // With interest: FV = PMT * [((1+r)^n - 1) / r], solve for PMT
            var sgR = sgRate / 100 / 12;
            var sgMonthlyNeeded = sgR > 0 ? sgRemaining / ((Math.pow(1 + sgR, sgMonths) - 1) / sgR) : sgRemaining / sgMonths;
            var sgWeeklyNeeded = sgMonthlyNeeded * 12 / 52;
            var sgDailyNeeded = sgMonthlyNeeded * 12 / 365;

            // ── TABS ──
            var tabs = [
              { id: 'coins', label: __alloT('stem.money.coins_bills', '\uD83E\uDE99 Coins & Bills'), icon: '\uD83E\uDE99' },
              { id: 'change', label: __alloT('stem.money.making_change', '\uD83D\uDCB5 Making Change'), icon: '\uD83D\uDCB5' },
              { id: 'tips', label: __alloT('stem.money.tips_discounts', '\uD83D\uDCB3 Tips & Discounts'), icon: '\uD83D\uDCB3' },
              { id: 'store', label: __alloT('stem.money.grocery_store', '\uD83D\uDED2 Grocery Store'), icon: '\uD83D\uDED2' },
              { id: 'budget', label: __alloT('stem.money.budget', '\uD83D\uDCCA Budget'), icon: '\uD83D\uDCCA' },
              { id: 'cents', label: __alloT('stem.money.common_cents', '\uD83E\uDE99 Common Cents'), icon: '\uD83E\uDE99' },
              { id: 'word', label: __alloT('stem.money.word_problems', '\uD83D\uDCDD Word Problems'), icon: '\uD83D\uDCDD' },
              { id: 'exchange', label: __alloT('stem.money.currency_exchange', '\uD83C\uDF0D Currency Exchange'), icon: '\uD83C\uDF0D' },
              { id: 'finance', label: __alloT('stem.money.personal_finance', '\uD83D\uDCB0 Personal Finance'), icon: '\uD83D\uDCB0' },
              { id: 'inquiry', label: __alloT('stem.money.compound_inquiry', '\uD83D\uDD2C Compound Inquiry'), icon: '\uD83D\uDD2C' }
            ];

            var renderMoneyStudioFocus = function () {
              var activeTab = tabs.filter(function (entry) { return entry.id === tab; })[0] || tabs[0];
              var gradeLabel = (GRADE_CONFIG[grade] && GRADE_CONFIG[grade].label) || grade;
              var savingsProgress = sgTarget > 0 ? Math.min(100, Math.round((sgHave / sgTarget) * 100)) : 0;
              var routeCards = [
                {
                  id: 'coins',
                  title: __alloT('stem.money.focus_count_cash', 'Count cash'),
                  metric: fmt(boardTotal),
                  body: __alloT('stem.money.focus_count_cash_body', 'Build totals from coins and bills.'),
                  tone: 'border-amber-400 bg-amber-50 text-amber-900'
                },
                {
                  id: 'store',
                  title: __alloT('stem.money.focus_shop', 'Shop'),
                  metric: cart.length + ' items',
                  body: __alloT('stem.money.focus_shop_body', 'Compare prices, cart totals, and tax.'),
                  tone: 'border-purple-400 bg-purple-50 text-purple-900'
                },
                {
                  id: 'change',
                  title: __alloT('stem.money.focus_change', 'Make change'),
                  metric: changePaid ? fmt(changePaid - changePrice) : 'Ready',
                  body: __alloT('stem.money.focus_change_body', 'Count up from price to payment.'),
                  tone: 'border-emerald-500 bg-emerald-50 text-emerald-900'
                },
                {
                  id: 'tips',
                  title: __alloT('stem.money.focus_deals', 'Deals'),
                  metric: gc.includePercent ? '%' : 'basic',
                  body: __alloT('stem.money.focus_deals_body', 'Practice tips, discounts, and sale checks.'),
                  tone: 'border-rose-400 bg-rose-50 text-rose-900'
                },
                {
                  id: 'finance',
                  title: __alloT('stem.money.focus_future', 'Future money'),
                  metric: fmt(ciCompound),
                  body: __alloT('stem.money.focus_future_body', 'Model interest, loans, and savings goals.'),
                  tone: 'border-blue-500 bg-blue-50 text-blue-900'
                }
              ];

              return React.createElement('section', {
                className: 'rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden',
                'data-moneymath-focus': 'true',
                role: 'region',
                'aria-label': __alloT('stem.money.money_studio', 'Money Math studio')
              },
                React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4 p-4' },
                  React.createElement('div', { className: 'space-y-3' },
                    React.createElement('div', { className: 'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3' },
                      React.createElement('div', null,
                        React.createElement('p', { className: 'text-xs font-bold uppercase tracking-wide text-emerald-700' }, __alloT('stem.money.money_studio_label', 'Money Studio')),
                        React.createElement('h2', { className: 'text-xl font-black text-slate-900 leading-tight' }, activeTab.label),
                        React.createElement('p', { className: 'text-sm text-slate-600 mt-1 leading-relaxed' },
                          __alloT('stem.money.money_studio_summary', 'Move between hands-on cash, store math, percentage checks, and long-term finance without losing the current setup.')
                        )
                      ),
                      React.createElement('div', { className: 'grid grid-cols-3 gap-2 text-center sm:min-w-[230px]' },
                        React.createElement('div', { className: 'rounded-xl bg-slate-50 border border-slate-200 px-2 py-2' },
                          React.createElement('p', { className: 'text-xs text-slate-500 font-bold' }, __alloT('stem.money.currency_2', 'Currency')),
                          React.createElement('p', { className: 'text-sm font-black text-slate-900' }, cur.code)
                        ),
                        React.createElement('div', { className: 'rounded-xl bg-slate-50 border border-slate-200 px-2 py-2' },
                          React.createElement('p', { className: 'text-xs text-slate-500 font-bold' }, __alloT('stem.money.cart', 'Cart')),
                          React.createElement('p', { className: 'text-sm font-black text-slate-900' }, fmt(cartGrand))
                        ),
                        React.createElement('div', { className: 'rounded-xl bg-slate-50 border border-slate-200 px-2 py-2' },
                          React.createElement('p', { className: 'text-xs text-slate-500 font-bold' }, __alloT('stem.money.savings_2', 'Savings')),
                          React.createElement('p', { className: 'text-sm font-black text-slate-900' }, savingsProgress + '%')
                        )
                      )
                    ),
                    React.createElement('div', { className: 'rounded-2xl border border-emerald-200 bg-emerald-950 p-3' },
                      React.createElement('svg', {
                        width: '100%',
                        height: 170,
                        viewBox: '0 0 680 170',
                        role: 'img',
                        'aria-label': 'Money studio overview for ' + cur.code + ' showing cash, receipt, and savings progress'
                      },
                        React.createElement('defs', null,
                          React.createElement('linearGradient', { id: 'moneyStudioBillGrad', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
                            React.createElement('stop', { offset: '0%', stopColor: '#bbf7d0' }),
                            React.createElement('stop', { offset: '100%', stopColor: '#34d399' })
                          )
                        ),
                        React.createElement('rect', { x: 0, y: 0, width: 680, height: 170, rx: 22, fill: '#022c22' }),
                        React.createElement('rect', { x: 38, y: 30, width: 230, height: 110, rx: 14, fill: '#064e3b', stroke: '#34d399', strokeWidth: 2 }),
                        React.createElement('text', { x: 58, y: 57, fill: '#a7f3d0', fontSize: 15, fontWeight: '800' }, __alloT('stem.money.cash_mat', 'Cash mat')),
                        [0, 1, 2].map(function (idx) {
                          return React.createElement('g', { key: 'focus-bill-' + idx, transform: 'translate(' + (58 + idx * 42) + ' 76)' },
                            React.createElement('rect', { x: 0, y: 0, width: 76, height: 34, rx: 5, fill: 'url(#moneyStudioBillGrad)', stroke: '#dcfce7', strokeWidth: 1.5 }),
                            React.createElement('circle', { cx: 38, cy: 17, r: 9, fill: '#047857', opacity: 0.45 }),
                            React.createElement('text', { x: 38, y: 22, textAnchor: 'middle', fill: '#052e16', fontSize: 13, fontWeight: '900' }, cur.symbol)
                          );
                        }),
                        cur.coins.slice(0, 4).map(function (coin, idx) {
                          return React.createElement('g', { key: 'focus-coin-' + idx },
                            React.createElement('circle', { cx: 78 + idx * 42, cy: 126, r: 15, fill: coin.color, stroke: '#fef3c7', strokeWidth: 2 }),
                            React.createElement('text', { x: 78 + idx * 42, y: 131, textAnchor: 'middle', fill: '#1f2937', fontSize: 9, fontWeight: '900' }, coin.label)
                          );
                        }),
                        React.createElement('rect', { x: 305, y: 30, width: 160, height: 110, rx: 12, fill: '#fefce8', stroke: '#facc15', strokeWidth: 2 }),
                        React.createElement('text', { x: 325, y: 56, fill: '#713f12', fontSize: 15, fontWeight: '900' }, __alloT('stem.money.receipt', 'Receipt')),
                        React.createElement('line', { x1: 325, y1: 70, x2: 445, y2: 70, stroke: '#ca8a04', strokeWidth: 1.5, strokeDasharray: '5 4' }),
                        React.createElement('text', { x: 325, y: 94, fill: '#713f12', fontSize: 13, fontWeight: '800' }, __alloT('stem.money.cash_total', 'Cash') + ': ' + fmt(boardTotal)),
                        React.createElement('text', { x: 325, y: 116, fill: '#713f12', fontSize: 13, fontWeight: '800' }, __alloT('stem.money.cart_total', 'Cart') + ': ' + fmt(cartGrand)),
                        React.createElement('rect', { x: 505, y: 30, width: 128, height: 110, rx: 14, fill: '#0f172a', stroke: '#38bdf8', strokeWidth: 2 }),
                        React.createElement('text', { x: 569, y: 58, textAnchor: 'middle', fill: '#bae6fd', fontSize: 14, fontWeight: '900' }, __alloT('stem.money.goal', 'Goal')),
                        React.createElement('rect', { x: 527, y: 78, width: 84, height: 14, rx: 7, fill: '#1e293b', stroke: '#64748b', strokeWidth: 1 }),
                        React.createElement('rect', { x: 527, y: 78, width: Math.max(4, 84 * savingsProgress / 100), height: 14, rx: 7, fill: '#38bdf8' }),
                        React.createElement('text', { x: 569, y: 116, textAnchor: 'middle', fill: '#e0f2fe', fontSize: 16, fontWeight: '900' }, savingsProgress + '%')
                      )
                    )
                  ),
                  React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                    routeCards.map(function (card) {
                      var isActive = tab === card.id;
                      return React.createElement('button', {
                        key: card.id,
                        type: 'button',
                        onClick: function () { sfxMoneyClick(); upd('tab', card.id); },
                        'aria-pressed': isActive,
                        className: 'rounded-xl border p-3 text-left transition-all hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ' +
                          (isActive ? card.tone : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'),
                        style: { minHeight: 94 }
                      },
                        React.createElement('div', { className: 'flex items-center justify-between gap-2' },
                          React.createElement('span', { className: 'text-sm font-black' }, card.title),
                          React.createElement('span', { className: 'text-sm font-black font-mono' }, card.metric)
                        ),
                        React.createElement('p', { className: 'text-xs leading-snug mt-1 opacity-80' }, card.body)
                      );
                    })
                  )
                ),
                React.createElement('div', { className: 'px-4 pb-4' },
                  React.createElement('div', { className: 'rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 font-bold flex flex-wrap gap-2 justify-between' },
                    React.createElement('span', null, __alloT('stem.money.grade', 'Grade') + ': ' + gradeLabel.replace(/^[^\w]+/, '')),
                    React.createElement('span', null, __alloT('stem.money.currency_3', 'Currency') + ': ' + cur.name),
                    React.createElement('span', null, challengeMode ? __alloT('stem.money.challenge_on', 'Challenge on') : __alloT('stem.money.practice_mode', 'Practice mode'))
                  )
                )
              );
            };

            return React.createElement("div", { className: "space-y-4 max-w-4xl mx-auto animate-in fade-in duration-200" },
              // ── HEADER ──
              React.createElement("div", { className: "bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 rounded-2xl p-5 text-white shadow-xl" },
                React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-3" },
                  React.createElement("div", null,
                    React.createElement("h2", { className: "text-xl font-black flex items-center gap-2" }, __alloT('stem.money.money_math', "\uD83D\uDCB5 Money Math")),
                    React.createElement("p", { className: "text-emerald-100 text-xs mt-1" }, __alloT('stem.money.master_coins_bills_change_budgeting_cu', "Master coins, bills, change, budgeting & currency exchange"))
                  ),
                  React.createElement("div", { className: "flex gap-2 flex-wrap items-center" },
                    // Challenge Mode toggle
                    React.createElement("button", { onClick: function () { upd('challengeMode', !d.challengeMode); upd('coinGuess', null); upd('coinGuessFb', null); upd('cartGuessSubtotal', null); upd('cartGuessTax', null); upd('cartGuessTotal', null); upd('cartCheckoutFb', null); },
                      className: "px-3 py-1.5 rounded-lg text-xs font-black transition-all " + (d.challengeMode ? 'bg-amber-400 text-amber-900 ring-2 ring-amber-200 shadow-lg' : 'bg-white/20 text-white border border-white/30 hover:bg-white/30')
                    }, d.challengeMode ? '\uD83C\uDFAF Challenge ON' : '\uD83C\uDFAF Challenge Mode'),
                    // Grade selector
                    React.createElement("select", { value: grade, onChange: function (e) { upd('grade', e.target.value); upd('storeItems', null); upd('cart', []); resetGroceryCheckout(); },
                      'aria-label': __alloT('stem.money.grade_level', 'Grade level'),
                      className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 cursor-pointer"
                    }, Object.entries(GRADE_CONFIG).map(function (entry) {
                      return React.createElement("option", { key: entry[0], value: entry[0], style: { color: '#1e293b' } }, entry[1].label);
                    })),
                    // Currency selector
                    React.createElement("select", { value: currency, onChange: function (e) { upd('currency', e.target.value); upd('placed', []); upd('storeItems', null); upd('cart', []); resetGroceryCheckout(); },
                      'aria-label': __alloT('stem.money.currency', 'Currency'),
                      className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 cursor-pointer"
                    }, Object.keys(CURRENCIES).map(function (code) {
                      return React.createElement("option", { key: code, value: code, style: { color: '#1e293b' } }, CURRENCIES[code].flag + ' ' + code + ' (' + CURRENCIES[code].symbol + ')');
                    }))
                  )
                )
              ),

              // ── TAB BAR ──
              renderMoneyStudioFocus(),

              React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 bg-slate-100 rounded-xl p-1", role: 'tablist', 'aria-label': __alloT('stem.money.money_tool_sections', 'Money Tool sections') },
                tabs.map(function (t) {
                  return React.createElement("button", { key: t.id, onClick: function () { upd('tab', t.id); }, role: 'tab', 'aria-selected': tab === t.id,
                    className: "min-h-[42px] px-2 py-2 rounded-lg text-xs font-bold transition-all " + (tab === t.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-700 hover:text-emerald-700 hover:bg-white/60')
                  }, t.label);
                })
              ),

              // ── Topic-accent hero band per tab ──
              (function() {
                var TAB_META = {
                  coins:    { accent: '#d97706', soft: 'rgba(217,119,6,0.10)', icon: '\uD83E\uDE99', title: __alloT('stem.money.coins_bills_2', 'Coins & bills'),          hint: __alloT('stem.money.build_a_counting_board_coin_face_value', 'Build a counting board. Coin face values are arbitrary \u2014 a quarter is worth 25\u00a2 because we agree it is, not because of the metal.') },
                  change:   { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)', icon: '\uD83D\uDCB5', title: __alloT('stem.money.making_change_2', 'Making change'),          hint: __alloT('stem.money.count_up_from_the_price_to_the_amount_', 'Count UP from the price to the amount paid \u2014 the way cashiers actually do it. Faster + more accurate than subtraction by hand.') },
                  tips:     { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '\uD83D\uDCB3', title: __alloT('stem.money.tips_discounts_2', 'Tips & discounts'),       hint: __alloT('stem.money.15_tip_10_move_decimal_half_of_that_20', '15% tip = 10% (move decimal) + half of that. 20% off = take the price, divide by 5, subtract. Mental-math shortcuts beat the calculator for sanity-checking.') },
                  store:    { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', icon: '\uD83D\uDED2', title: __alloT('stem.money.grocery_store_2', 'Grocery store'),          hint: __alloT('stem.money.unit_price_cost_per_ounce_or_item_is_t', 'Unit price (cost per ounce or item) is the only honest comparison \u2014 package sizes are designed to defeat eyeball math.') },
                  budget:   { accent: '#22c55e', soft: 'rgba(34,197,94,0.10)',  icon: '\uD83D\uDCCA', title: __alloT('stem.money.budget_2', 'Budget'),                 hint: __alloT('stem.money.50_30_20_needs_wants_save_debt_most_pe', '50/30/20: needs / wants / save+debt. Most people misclassify recurring subscriptions as needs \u2014 if it auto-renews, it is a want until you opt back in.') },
                  cents:    { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', icon: '\uD83E\uDE99', title: __alloT('stem.money.common_cents_2', 'Common cents'),           hint: __alloT('stem.money.quick_mental_shortcuts_25_4_1_10_5_1_1', 'Quick mental shortcuts: 25\u00a2 \u00d7 4 = $1, 10\u00a2 + 5\u00a2 + 1\u00a2 = 16\u00a2. Arithmetic with money is faster than the same arithmetic with abstract numbers because the unit is concrete.') },
                  word:     { accent: '#3b82f6', soft: 'rgba(59,130,246,0.10)', icon: '\uD83D\uDCDD', title: __alloT('stem.money.word_problems_2', 'Word problems'),          hint: __alloT('stem.money.translate_the_sentence_to_an_equation_', 'Translate the sentence to an equation BEFORE computing. "How much" = an unknown variable. "Total" = sum. "Each" or "per" = multiplication.') },
                  exchange: { accent: '#8b5cf6', soft: 'rgba(139,92,246,0.10)', icon: '\uD83C\uDF0D', title: __alloT('stem.money.currency_exchange_2', 'Currency exchange'),      hint: __alloT('stem.money.exchange_rates_change_daily_cards_usua', 'Exchange rates change daily. Cards usually beat cash for travel \u2014 cash exchange shops mark up 5\u201310% over interbank rates.') },
                  finance:  { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83D\uDCB0', title: __alloT('stem.money.personal_finance_2', 'Personal finance'),       hint: __alloT('stem.money.compound_interest_100_at_7_30_yrs_760_', 'Compound interest: $100 at 7% \u00d7 30 yrs = $760. Pay credit-card statement balance in full each cycle = no interest. Carry a balance = APR roughly doubles your debt every 5 yrs.') },
                  inquiry:  { accent: '#06b6d4', soft: 'rgba(6,182,212,0.10)',  icon: '\uD83D\uDD2C', title: __alloT('stem.money.compound_interest_inquiry', 'Compound Interest Inquiry'), hint: __alloT('stem.money.vary_the_principal_rate_and_time_and_w', 'Vary the principal, rate, and time and watch how compound growth pulls ahead of the contributions alone. An open exploration \u2014 no score, no single right answer.') }
                };
                var meta = TAB_META[tab] || TAB_META.coins;
                return React.createElement('div', {
                  style: {
                    margin: '12px 0 0',
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
                    border: '1px solid ' + meta.accent + '55',
                    borderLeft: '4px solid ' + meta.accent,
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
                  }
                },
                  React.createElement('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
                  React.createElement('div', { style: { flex: 1, minWidth: 220 } },
                    React.createElement('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
                    React.createElement('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                  )
                );
              })(),

              // ═══ COINS & BILLS TAB ═══
              tab === 'coins' && React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
                // Coin palette
                React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200" },
                  React.createElement("h3", { className: "text-sm font-bold text-amber-800 mb-3" }, "\uD83E\uDE99 " + cur.flag + " " + cur.name + " Coins"),
                  React.createElement("p", { className: "text-[11px] text-amber-700 mb-3" }, __alloT('stem.money.click_coins_to_add_them_to_your_counti', "Click coins to add them to your counting board.")),
                  React.createElement("div", { className: "flex flex-wrap gap-3 justify-center" },
                    cur.coins.map(function (coin, ci) {
                      return React.createElement("button", { key: ci, onClick: function () {
                          upd('placed', [].concat(placed, [{ name: coin.name, value: coin.value, id: Date.now() + '-' + ci }]));
                        },
                        'aria-label': __alloT('stem.money.add_coin', 'Add coin') + ': ' + coin.name + ' (' + fmt(coin.value) + ')',
                        className: "flex flex-col items-center gap-1 group transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-full",
                        title: coin.name + ' = ' + fmt(coin.value)
                      },
                        renderCoinVisual(coin, false),
                        React.createElement("span", { className: "text-[11px] font-bold text-amber-700" }, coin.name),
                        currency === 'USD' && USD_COIN_VISUALS[String(coin.value)] && React.createElement('span', { className: 'text-[10px] leading-tight text-amber-800/80 -mt-1' }, USD_COIN_VISUALS[String(coin.value)].edge)
                      );
                    })
                  ),
                  currency === 'USD' && React.createElement('p', { className: 'mt-2 text-[10px] leading-relaxed text-amber-800 text-center' }, __alloT('stem.money.coin_visual_notice', 'Relative diameters and edge types follow U.S. Mint specifications. Surface artwork is simplified for counting practice.')),
                  // Bill palette
                  React.createElement("h3", { className: "text-sm font-bold text-green-800 mt-4 mb-3" }, "\uD83D\uDCB5 " + cur.name + " Bills"),
                  React.createElement("div", { className: "flex flex-wrap gap-2 justify-center" },
                    cur.bills.map(function (bill, bi) {
                      return React.createElement("button", { key: bi, onClick: function () {
                          upd('placed', [].concat(placed, [{ name: bill.name, value: bill.value, id: Date.now() + '-b' + bi }]));
                        },
                        'aria-label': __alloT('stem.money.add_bill', 'Add bill') + ': ' + bill.name + ' (' + fmt(bill.value) + ')',
                        title: bill.name + ' = ' + fmt(bill.value),
                        className: "group transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-md"
                      },
                        renderBillVisual(bill, false)

                      );
                    })
                  ),
                  currency === 'USD' && React.createElement('p', { className: 'mt-2 text-[10px] leading-relaxed text-emerald-800 text-center' }, __alloT('stem.money.bill_visual_notice', 'Portrait initials and color families help distinguish denominations. Simplified educational illustrations - not reproductions.'))
                ),
                // Counting board
                React.createElement("div", { className: "bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-400" },
                  React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h3", { className: "text-sm font-bold text-slate-700" }, __alloT('stem.money.counting_board', "\uD83E\uDDEE Counting Board")),
                    React.createElement("div", { className: "flex items-center gap-2" },
                      challengeMode
                        ? React.createElement("span", { className: "text-lg font-black text-amber-500" }, __alloT('stem.money.str', '\uD83C\uDFAF ?'))
                        : React.createElement("span", { className: "text-lg font-black text-emerald-600" }, fmt(boardTotal)),
                      placed.length > 1 && React.createElement('button', { type: 'button', onClick: function () {
                        upd('placed', placed.slice().sort(function (a, b) { return b.value - a.value || (isPlacedBill(a) === isPlacedBill(b) ? 0 : isPlacedBill(a) ? -1 : 1); }));
                      }, 'aria-label': __alloT('stem.money.organize_cash_aria', 'Organize cash from highest to lowest denomination'), className: 'px-2 py-1 rounded-md text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-300 hover:bg-slate-200 transition-colors' }, __alloT('stem.money.organize_cash', '↕ Organize')),
                      placed.length > 0 && React.createElement("button", { "aria-label": __alloT('stem.money.clear', "Clear"), onClick: function () { upd('placed', []); upd('coinGuess', null); upd('coinGuessFb', null); },
                        className: "transition-colors text-[11px] text-red-400 hover:text-red-600 font-bold"
                      }, __alloT('stem.money.clear_2', "\u2715 Clear"))
                    )
                  ),
                  placed.length === 0
                    ? React.createElement("div", { className: "text-center py-8 text-slate-600" },
                        React.createElement("div", { className: "text-4xl mb-2" }, "\uD83E\uDE99"),
                        React.createElement("p", { className: "text-xs" }, challengeMode ? 'Add coins/bills, then guess the total!' : 'Click coins or bills to add them here')
                      )
                    : React.createElement("div", { className: "flex flex-wrap gap-1.5 min-h-[100px]" },
                        placed.map(function (p, pi) {
                          var isBill = isPlacedBill(p);
                          return React.createElement("button", { "aria-label": "Remove " + p.name, key: p.id || pi, onClick: function () {
                              upd('placed', placed.filter(function (_, idx) { return idx !== pi; }));
                              upd('coinGuess', null); upd('coinGuessFb', null);
                            }, title: 'Remove ' + p.name,
                            className: "transition-all hover:scale-110 hover:opacity-70 cursor-pointer animate-in zoom-in fade-in duration-300"
                          },
                            isBill
                              ? (function () { var bd = cur.bills.find(function (k) { return k.name === p.name; }) || { name: p.name, value: p.value, color: '#85bb65' }; return renderBillVisual(bd, true); })()
                              : (function () { var cd = cur.coins.find(function (k) { return k.name === p.name; }) || { name: p.name, value: p.value, color: '#C0C0C0', size: 28, label: fmt(p.value) }; return renderCoinVisual(cd, true); })()
                          );
                        })
                      ),
                  // Challenge Mode: guess the total
                  challengeMode && placed.length > 0 && React.createElement("div", { className: "mt-3 pt-3 border-t border-amber-200 bg-amber-50 rounded-lg p-3" },
                    React.createElement("p", { className: "text-xs font-bold text-amber-700 mb-2" }, __alloT('stem.money.what_s_the_total_add_up_all_the_coins_', '\uD83C\uDFAF What\'s the total? Add up all the coins and bills!')),
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', "aria-label": "Your guess of the total in " + cur.code, value: d.coinGuess != null ? d.coinGuess : '', onChange: function (e) { upd('coinGuess', e.target.value === '' ? null : parseFloat(e.target.value)); }, className: "px-3 py-2 border border-amber-600 rounded-lg text-sm font-bold w-32 focus:ring-2 focus:ring-amber-400 outline-none" }),
                      React.createElement("button", { "aria-label": __alloT('stem.money.check', "Check"), onClick: function () {
                        var guess = d.coinGuess; var actual = boardTotal;
                        var isRight = typeof guess === 'number' && Math.abs(guess - actual) < (isJPY ? 0.5 : 0.005);
                        upd('coinGuessFb', isRight ? { ok: true, msg: '\u2705 Correct! Total is ' + fmt(actual) + '!' } : { ok: false, msg: '\u274C Not quite. The total is ' + fmt(actual) + '. You guessed ' + fmt(guess || 0) + '.' });
                        if (isRight && typeof awardStemXP === 'function') awardStemXP('moneyMath', 10, 'coin counting challenge');
                      }, disabled: d.coinGuess == null, className: "px-4 py-2 bg-amber-700 text-white font-bold rounded-lg hover:bg-amber-600 transition-all text-xs disabled:opacity-40" }, __alloT('stem.money.check_2', '\u2714 Check'))
                    ),
                    d.coinGuessFb && React.createElement("p", { className: "text-xs font-bold mt-2 " + (d.coinGuessFb.ok ? 'text-green-600' : 'text-red-500') }, d.coinGuessFb.msg)
                  ),
                  // Normal mode: grouped denomination breakdown and equation.
                  !challengeMode && placed.length > 0 && React.createElement('div', { className: 'mt-3 pt-3 border-t border-slate-200' },
                    React.createElement('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-2' },
                      React.createElement('div', null,
                        React.createElement('p', { className: 'text-xs font-black text-slate-700' }, __alloT('stem.money.cash_breakdown', 'Cash breakdown')),
                        React.createElement('p', { className: 'text-[10px] text-slate-600' }, placed.length + ' ' + __alloT('stem.money.pieces_grouped', 'pieces grouped by denomination'))
                      ),
                      React.createElement('span', { className: 'text-lg font-black text-emerald-700' }, fmt(boardTotal))
                    ),
                    React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2' },
                      cashGroups.map(function (group) {
                        var definition = group.isBill ? (cur.bills.find(function (bill) { return bill.name === group.name; }) || { name: group.name, value: group.value, color: '#85bb65' }) : (cur.coins.find(function (coin) { return coin.name === group.name; }) || { name: group.name, value: group.value, color: '#C0C0C0', size: 28, label: fmt(group.value) });
                        return React.createElement('div', { key: group.key, role: 'group', 'aria-label': group.count + ' times ' + group.name + ' equals ' + fmt(group.count * group.value), className: 'relative flex items-center gap-2 min-w-0 rounded-lg border border-slate-200 bg-white p-2 shadow-sm' },
                          React.createElement('div', { className: 'relative flex-shrink-0' },
                            group.isBill ? renderBillVisual(definition, true) : renderCoinVisual(definition, true),
                            React.createElement('span', { className: 'absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-slate-800 text-white text-[10px] font-black flex items-center justify-center shadow-sm' }, '×' + group.count)
                          ),
                          React.createElement('div', { className: 'min-w-0' },
                            React.createElement('p', { className: 'text-[10px] font-bold text-slate-600 truncate' }, group.name),
                            React.createElement('p', { className: 'text-xs font-black text-emerald-700' }, fmt(group.value * group.count))
                          )
                        );
                      })
                    ),
                    React.createElement('div', { className: 'grid grid-cols-3 gap-2 mt-2' },
                      React.createElement('div', { className: 'rounded-lg bg-amber-50 border border-amber-200 p-2 text-center' }, React.createElement('p', { className: 'text-[10px] text-amber-800 font-bold' }, __alloT('stem.money.coins_subtotal', 'Coins')), React.createElement('p', { className: 'text-xs font-black text-amber-700' }, fmt(cashCoinSubtotal))),
                      React.createElement('div', { className: 'rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-center' }, React.createElement('p', { className: 'text-[10px] text-emerald-800 font-bold' }, __alloT('stem.money.bills_subtotal', 'Bills')), React.createElement('p', { className: 'text-xs font-black text-emerald-700' }, fmt(cashBillSubtotal))),
                      React.createElement('div', { className: 'rounded-lg bg-sky-50 border border-sky-200 p-2 text-center' }, React.createElement('p', { className: 'text-[10px] text-sky-800 font-bold' }, __alloT('stem.money.total_3', 'Total')), React.createElement('p', { className: 'text-xs font-black text-sky-700' }, fmt(boardTotal)))
                    ),
                    React.createElement('div', { className: 'mt-2 rounded-lg bg-slate-900 px-3 py-2 text-center overflow-x-auto' },
                      React.createElement('p', { className: 'text-[10px] uppercase tracking-wide font-bold text-slate-300 mb-1' }, __alloT('stem.money.grouped_equation', 'Grouped equation')),
                      React.createElement('p', { className: 'text-xs font-mono font-bold text-emerald-300 whitespace-nowrap' }, cashGroups.map(function (group) { return group.count + ' × ' + fmt(group.value); }).join(' + ') + ' = ' + fmt(boardTotal))
                    )
                  )
                )
              ),

              // ═══ MAKING CHANGE TAB ═══
              tab === 'change' && React.createElement("div", { className: "bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200" },
                React.createElement("h3", { className: "text-base font-bold text-blue-800 mb-4" }, __alloT('stem.money.making_change_practice', "\uD83D\uDCB5 Making Change Practice")),
                !changePrice
                  ? React.createElement("div", { className: "text-center py-8" },
                      React.createElement("p", { className: "text-slate-600 text-sm mb-4" }, "Generate a problem to practice making change with " + cur.flag + " " + cur.name),
                      React.createElement("button", { "aria-label": __alloT('stem.money.generate_problem', "Generate Problem"), onClick: genChangeProblem,
                        className: "px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg text-sm"
                      }, __alloT('stem.money.generate_problem_2', "\u2728 Generate Problem"))
                    )
                  : React.createElement("div", { className: "space-y-4" },
                      React.createElement("div", { className: "bg-white rounded-xl p-4 shadow-sm border border-blue-100" },
                        React.createElement("div", { className: "grid grid-cols-3 gap-4 text-center" },
                          React.createElement("div", null,
                            React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.price', "Price")),
                            React.createElement("p", { className: "text-2xl font-black text-red-500" }, fmt(changePrice))
                          ),
                          React.createElement("div", null,
                            React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.customer_pays', "Customer Pays")),
                            React.createElement("p", { className: "text-2xl font-black text-blue-500" }, fmt(changePaid))
                          ),
                          React.createElement("div", null,
                            React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.change_due', "Change Due")),
                            React.createElement("p", { className: "text-2xl font-black text-emerald-600" },
                              changeFeedback ? fmt(Math.round((changePaid - changePrice) * 100) / 100) : "?")
                          )
                        )
                      ),
                      React.createElement("div", { className: "flex flex-wrap items-center gap-3" },
                        React.createElement("label", { htmlFor: "money-change-answer", className: "text-sm font-bold text-slate-600" }, __alloT('stem.money.your_answer', "Your answer:")),
                        React.createElement("input", { id: "money-change-answer", type: "number", inputMode: "decimal", step: isJPY ? "1" : "0.01", placeholder: cur.symbol + "...",
                          'aria-label': __alloT('stem.money.change_answer_aria', 'Enter the amount of change due'),
                          value: changeAnswer !== null ? changeAnswer : '',
                          onChange: function (e) { upd('changeAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); },
                          className: "px-4 py-2 border border-slate-400 rounded-xl text-sm font-bold w-32 focus:ring-2 focus:ring-blue-400 outline-none"
                        }),
                        React.createElement("button", { "aria-label": __alloT('stem.money.check_3', "Check"), onClick: function () {
                            var correct = Math.round((changePaid - changePrice) * 100) / 100;
                            var userAns = Math.round((changeAnswer || 0) * 100) / 100;
                            var isRight = Math.abs(userAns - correct) < 0.005;
                            upd('changeFeedback', isRight ? { ok: true, msg: '\u2705 Correct! ' + fmt(changePaid) + ' \u2212 ' + fmt(changePrice) + ' = ' + fmt(correct) } : { ok: false, msg: '\u274C Not quite. ' + fmt(changePaid) + ' \u2212 ' + fmt(changePrice) + ' = ' + fmt(correct) });
                            if (isRight && typeof addXP === 'function') addXP(15, 'Money Math: Making change');
                            if (isRight && typeof awardStemXP === 'function') awardStemXP('moneyMath', 5, 'making change');
                          },
                          className: "px-5 py-2 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-600 transition-all text-sm"
                        }, __alloT('stem.money.check_4', "\u2714 Check"))
                      ),
                      changeFeedback && React.createElement("p", { role: "status", 'aria-live': "polite", className: "text-sm font-bold " + (changeFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, changeFeedback.msg),
                      changeFeedback && React.createElement('section', { 'aria-label': __alloT('stem.money.count_up_change_aria', 'Count up from the price to the amount paid'), className: 'bg-white border-2 border-emerald-200 rounded-xl p-3' },
                        React.createElement('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-3' },
                          React.createElement('div', null,
                            React.createElement('h4', { className: 'text-sm font-black text-emerald-800' }, __alloT('stem.money.count_up_change', 'Count up the change')),
                            React.createElement('p', { className: 'text-[10px] text-slate-600' }, __alloT('stem.money.smallest_to_largest', 'Start with the smallest useful coins, then move to larger money.'))
                          ),
                          React.createElement('span', { className: 'px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black' }, __alloT('stem.money.give_back', 'Give back') + ' ' + fmt(changeDue))
                        ),
                        React.createElement('div', { role: 'list', 'aria-label': __alloT('stem.money.counting_up_steps', 'Counting-up steps'), className: 'flex flex-wrap items-stretch gap-2 mb-3' },
                          React.createElement('div', { role: 'listitem', className: 'min-w-[92px] rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-center' },
                            React.createElement('p', { className: 'text-[10px] font-bold uppercase text-red-600' }, __alloT('stem.money.start_at_price', 'Start at price')),
                            React.createElement('p', { className: 'text-sm font-black text-red-700' }, fmt(changePrice))
                          ),
                          changeCountSteps.map(function (piece) {
                            return React.createElement('div', { key: 'count-' + piece.name + '-' + piece.value, role: 'listitem', 'aria-label': 'Add ' + piece.count + ' times ' + fmt(piece.value) + ' to reach ' + fmt(piece.reaches), className: 'flex items-center gap-2' },
                              React.createElement('span', { 'aria-hidden': true, className: 'text-emerald-500 text-lg font-black' }, '\u2192'),
                              React.createElement('div', { className: 'min-w-[100px] rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-center' },
                                React.createElement('p', { className: 'text-[10px] font-bold text-emerald-700' }, '+' + piece.count + ' \u00D7 ' + fmt(piece.value)),
                                React.createElement('p', { className: 'text-xs font-black text-slate-700' }, __alloT('stem.money.reach', 'Reach') + ' ' + fmt(piece.reaches))
                              )
                            );
                          })
                        ),
                        React.createElement('div', { className: 'rounded-lg bg-slate-50 border border-slate-200 p-3' },
                          React.createElement('p', { className: 'text-[10px] font-bold uppercase tracking-wide text-slate-600 mb-2' }, __alloT('stem.money.cash_to_return', 'Cash to return')),
                          React.createElement('div', { role: 'list', className: 'grid grid-cols-2 sm:grid-cols-3 gap-2' },
                            changePieces.map(function (piece) {
                              return React.createElement('div', { key: 'return-' + piece.name + '-' + piece.value, role: 'listitem', 'aria-label': piece.count + ' times ' + piece.name + ', subtotal ' + fmt(piece.subtotal), className: 'relative flex items-center gap-2 rounded-lg bg-white border border-slate-200 p-2 min-w-0' },
                                React.createElement('div', { className: 'relative flex-shrink-0' },
                                  piece.isBill ? renderBillVisual(piece.definition, true) : renderCoinVisual(piece.definition, true),
                                  React.createElement('span', { className: 'absolute -right-1 -top-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shadow' }, '\u00D7' + piece.count)
                                ),
                                React.createElement('div', { className: 'min-w-0' },
                                  React.createElement('p', { className: 'text-[10px] font-bold text-slate-700 truncate' }, piece.name),
                                  React.createElement('p', { className: 'text-xs font-black text-emerald-700' }, fmt(piece.subtotal))
                                )
                              );
                            })
                          )
                        )
                      ),
                      // \u2500\u2500 Column subtraction worked-example shown after answer is checked \u2500\u2500
                      // Makes the "paid \u2212 price = change" step visible the way it's done on paper.
                      changeFeedback && (function() {
                        var correctChange = Math.round((changePaid - changePrice) * 100) / 100;
                        return React.createElement("div", { className: "bg-white border-2 border-blue-200 rounded-xl p-3 mt-1" },
                          React.createElement("p", { className: "text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2 text-center" }, __alloT('stem.money.subtraction_step', "\uD83D\uDCD0 Subtraction step")),
                          React.createElement("div", { className: "flex justify-center font-mono text-base font-bold leading-relaxed" },
                            React.createElement("div", { className: "text-right" },
                              React.createElement("div", { className: "text-blue-700" }, "  " + fmt(changePaid)),
                              React.createElement("div", { className: "text-red-500" }, "\u2212 " + fmt(changePrice)),
                              React.createElement("div", { className: "border-t-2 border-slate-700 mt-0.5 pt-0.5 text-emerald-700" }, "  " + fmt(correctChange))
                            )
                          )
                        );
                      })(),
                      React.createElement("button", { "aria-label": __alloT('stem.money.next_problem', "Next Problem"), onClick: genChangeProblem,
                        className: "px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs"
                      }, __alloT('stem.money.next_problem_2', "\u21BB Next Problem"))
                    )
              ),

              // ═══ GROCERY STORE TAB ═══
              tab === 'store' && React.createElement("div", { className: "space-y-4" },
                
                // ── ⚡ Cashier Rush Header ──
                React.createElement("div", { className: "flex items-center justify-between bg-zinc-900 text-white rounded-xl p-3 shadow-md border border-zinc-700 mx-1 mt-1" },
                  React.createElement("div", { className: "flex items-center gap-2" },
                    React.createElement("span", { className: "text-2xl" }, "\u26A1"),
                    React.createElement("div", null,
                      React.createElement("h3", { className: "text-sm font-black text-amber-500 leading-tight" }, __alloT('stem.money.power_outage_cashier_rush', "Power Outage Cashier Rush")),
                      React.createElement("p", { className: "text-[11px] text-zinc-400 font-bold" }, __alloT('stem.money.registers_are_down_calculate_by_hand', "Registers are down! Calculate by hand!"))
                    )
                  ),
                  React.createElement("button", { onClick: function() { if (crActive) { upd('crActive', false); } else { startCashierRush(); } },
                    className: "px-4 py-2 rounded-lg text-xs font-black transition-all shadow-sm " + (crActive ? "bg-zinc-800 hover:bg-zinc-700 text-red-400 border border-red-900" : "bg-amber-500 hover:bg-amber-400 text-zinc-900")
                  }, crActive ? "Close" : "Start Shift")
                ),

                crActive ? React.createElement("div", { className: "bg-zinc-900 rounded-2xl p-4 border border-zinc-700 shadow-2xl relative overflow-hidden" },
                  // Background grid effect
                  React.createElement("div", { className: "absolute inset-0 opacity-10 pointer-events-none" },
                    React.createElement("div", { className: "w-full h-full", style: { backgroundImage: 'radial-gradient(#fbbf24 1px, transparent 1px)', backgroundSize: '16px 16px' } })
                  ),
                  
                  crIntro ? React.createElement("div", { className: "relative z-10 text-center py-6" },
                    React.createElement("div", { className: "text-5xl mb-4 animate-pulse origin-bottom" }, "\uD83D\uDD26"),
                    React.createElement("h2", { className: "text-xl font-black text-amber-400 mb-2 uppercase tracking-wide" }, __alloT('stem.money.code_black_power_outage', "Code Black: Power Outage!")),
                    React.createElement("p", { className: "text-sm text-zinc-300 mb-6 max-w-sm mx-auto" },
                      __alloT('stem.money.the_registers_are_completely_dead_food', "The registers are completely dead. Food is starting to spoil. We need you to manually calculate customer totals as fast as you can. "),
                      React.createElement("span", { className: "text-amber-400 font-bold" }, __alloT('stem.money.speed_and_accuracy', "Speed and accuracy")), __alloT('stem.money.are_everything_right_now', " are everything right now.")
                    ),

                    // v3: Difficulty selector \u2014 Easy / Standard / Challenge
                    React.createElement("div", { className: "mb-5 inline-block bg-zinc-800/80 rounded-xl px-4 py-3 border border-zinc-700" },
                      React.createElement("p", { className: "text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider" }, __alloT('stem.money.difficulty', "Difficulty")),
                      React.createElement("div", { className: "flex gap-2 justify-center" },
                        [
                          { id: 'easy',      label: __alloT('stem.money.easy', '\uD83D\uDFE2 Easy'),      sub: 'Round prices, no tax' },
                          { id: 'standard',  label: __alloT('stem.money.standard', '\uD83D\uDFE1 Standard'),  sub: 'Real prices, tax W2+' },
                          { id: 'challenge', label: __alloT('stem.money.challenge', '\uD83D\uDD34 Challenge'), sub: 'Coupons + tax' }
                        ].map(function(dm) {
                          var active = crDifficulty === dm.id;
                          return React.createElement("button", {
                            key: 'crd-' + dm.id,
                            onClick: function() { upd('crDifficulty', dm.id); },
                            'aria-pressed': active,
                            'aria-label': dm.label + ': ' + dm.sub,
                            className: 'px-3 py-2 rounded-lg text-xs font-bold transition-all border-2 ' +
                              (active
                                ? (dm.id === 'easy' ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                                  : dm.id === 'standard' ? 'bg-amber-600 text-zinc-900 border-amber-400 shadow-md'
                                  : 'bg-red-700 text-white border-red-500 shadow-md')
                                : 'transition-colors bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500')
                          },
                            React.createElement('div', null, dm.label),
                            React.createElement('div', { className: 'text-[10px] font-normal opacity-80 mt-0.5' }, dm.sub)
                          );
                        })
                      )
                    ),

                    React.createElement("div", { className: "mb-6" }, null),

                    grade !== 'elementary' && crDifficulty !== 'easy' ? React.createElement("div", { className: "mb-6 inline-block bg-zinc-800 rounded-lg px-4 py-2 border border-zinc-700 text-left" },
                      React.createElement("p", { className: "text-xs text-zinc-400 mb-1" }, __alloT('stem.money.management_notes', "\u26A0\uFE0F Management notes:")),
                      React.createElement("ul", { className: "text-xs text-zinc-300 list-disc list-inside space-y-1" },
                        React.createElement("li", null, __alloT('stem.money.watch_out_for_per_lb_items', "Watch out for per-lb items")),
                        React.createElement("li", null, "Waves 2+: Add " + (taxRate*100) + "% Sales Tax"),
                        (grade === 'high' || crDifficulty === 'challenge') ? React.createElement("li", null, __alloT('stem.money.waves_3_apply_customer_coupons_first_b', "Waves 3+: Apply customer coupons FIRST, before tax")) : null
                      )
                    ) : null,
                    crDifficulty === 'easy' ? React.createElement("div", { className: "mb-6 inline-block bg-emerald-900/30 rounded-lg px-4 py-2 border border-emerald-700/50 text-left" },
                      React.createElement("p", { className: "text-xs text-emerald-300 mb-1" }, __alloT('stem.money.easy_mode', "\uD83D\uDFE2 Easy mode:")),
                      React.createElement("ul", { className: "text-xs text-emerald-200 list-disc list-inside space-y-1" },
                        React.createElement("li", null, __alloT('stem.money.all_prices_in_0_50_increments', "All prices in $0.50 increments")),
                        React.createElement("li", null, __alloT('stem.money.no_tax_no_coupons', "No tax, no coupons")),
                        React.createElement("li", null, __alloT('stem.money.2_3_items_per_customer', "2-3 items per customer")),
                        React.createElement("li", null, __alloT('stem.money.practice_clean_addition_first', "Practice clean addition first"))
                      )
                    ) : null,
                    React.createElement("div", { className: "text-center" },
                      React.createElement("button", { "aria-label": __alloT('stem.money.i_m_ready', "I'm Ready"), onClick: function() { upd('crIntro', false); genCashierRound(); },
                        className: "px-8 py-3 bg-amber-500 text-zinc-900 font-black text-lg rounded-xl hover:bg-amber-400 hover:scale-105 transition-all shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                      }, __alloT('stem.money.i_m_ready_2', "I'm Ready \u2192"))
                    )
                  ) : null,

                  !crIntro && !crGameOver && crCustomer ? React.createElement("div", { className: "relative z-10 space-y-4" },
                    // Top stats row
                    React.createElement("div", { className: "flex justify-between items-end" },
                      React.createElement("div", null,
                        React.createElement("p", { className: "text-amber-500 font-black text-xs uppercase tracking-widest" }, "Wave " + crWave),
                        React.createElement("p", { className: "text-zinc-400 text-[11px] font-bold" }, crServed + " Customers Served")
                      ),
                      React.createElement("div", { className: "text-right" },
                        React.createElement("p", { className: "text-[11px] text-zinc-400 font-bold uppercase" }, __alloT('stem.money.session_score', "Session Score")),
                        React.createElement("p", { className: "text-amber-400 font-black text-xl leading-none" }, crScore),
                        crBest > 0 && React.createElement("p", { className: "text-[11px] text-emerald-400 font-bold" }, "Best Round: " + crBest)
                      )
                    ),

                    // Three-customer wave queue makes progress visible at a glance.
                    React.createElement('div', { className: 'flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-800/70 px-3 py-2' },
                      React.createElement('div', null,
                        React.createElement('p', { className: 'text-[10px] uppercase tracking-wide font-black text-zinc-400' }, __alloT('stem.money.wave_queue', 'Wave queue')),
                        React.createElement('p', { className: 'text-xs font-bold text-zinc-200' }, (crServed % 3) + ' / 3 ' + __alloT('stem.money.customers_complete', 'customers complete'))
                      ),
                      React.createElement('div', { role: 'img', 'aria-label': (crServed % 3) + ' of 3 customers completed in this wave', className: 'flex items-center gap-2' },
                        [0, 1, 2].map(function (queueIndex) {
                          var queueDone = queueIndex < (crServed % 3);
                          var queueCurrent = queueIndex === (crServed % 3);
                          return React.createElement('div', { key: 'queue-customer-' + queueIndex, className: 'w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border-2 transition-colors ' + (queueDone ? 'bg-emerald-700 border-emerald-400 text-white' : queueCurrent ? 'bg-amber-400 border-amber-200 text-zinc-900' : 'bg-zinc-900 border-zinc-600 text-zinc-500') }, queueDone ? '\u2713' : queueCurrent ? (crCustomer.emoji || '\uD83D\uDE42') : '\u2022');
                        })
                      )
                    ),

                    crRecentHistory.length ? React.createElement('div', {
                      role: 'img',
                      'aria-label': __alloT('stem.money.recent_round_scores', 'Recent round scores') + ': ' + crRecentHistoryLabel,
                      className: 'rounded-xl border border-zinc-700 bg-gradient-to-br from-zinc-800 to-zinc-900 px-3 pt-3 pb-2 shadow-inner'
                    },
                      React.createElement('div', { className: 'flex items-center justify-between gap-3 mb-2' },
                        React.createElement('div', { className: 'flex items-center gap-2' },
                          React.createElement('span', { 'aria-hidden': true, className: 'text-lg' }, '\uD83D\uDCCA'),
                          React.createElement('div', null,
                            React.createElement('p', { className: 'text-[10px] uppercase tracking-widest font-black text-zinc-400' }, __alloT('stem.money.recent_rounds', 'Recent rounds')),
                            React.createElement('p', { className: 'text-xs font-bold text-zinc-200' }, __alloT('stem.money.performance_trend', 'Performance trend'))
                          )
                        ),
                        React.createElement('span', { className: 'rounded-full bg-zinc-950 px-2 py-1 text-[10px] font-black text-zinc-400 border border-zinc-700' }, crRecentHistory.length + ' / 6')
                      ),
                      React.createElement('div', { 'aria-hidden': true, className: 'flex h-20 items-end gap-1.5 border-b border-zinc-700 px-1' },
                        crRecentHistory.map(function (round, roundIndex) {
                          var roundScore = Math.max(0, Math.min(100, Number(round.score) || 0));
                          var roundNumber = crHistoryCount - crRecentHistory.length + roundIndex + 1;
                          var roundColor = roundScore >= 100 ? 'bg-emerald-400' : roundScore >= 70 ? 'bg-amber-400' : 'bg-rose-500';
                          return React.createElement('div', { key: 'recent-round-' + roundNumber, className: 'flex min-w-0 flex-1 flex-col items-center justify-end' },
                            React.createElement('span', { className: 'mb-1 text-[10px] font-black ' + (roundScore >= 100 ? 'text-emerald-300' : 'text-zinc-300') }, roundScore >= 100 ? '\u2605 ' + roundScore : roundScore),
                            React.createElement('div', { className: 'w-full max-w-8 rounded-t-sm ' + roundColor, style: { height: Math.max(6, Math.round(roundScore * 0.48)) + 'px' } }),
                            React.createElement('span', { className: 'mt-1 text-[10px] font-bold text-zinc-500' }, '#' + roundNumber)
                          );
                        })
                      )
                    ) : null,
                    
                    // Customer Card
                    React.createElement("div", { className: "bg-zinc-800 rounded-xl p-4 shadow-lg border border-zinc-700 relative overflow-hidden" },
                      crFb ? React.createElement("div", { className: "absolute inset-0 bg-black/60 z-10 flex items-center justify-center animate-in fade-in" },
                        React.createElement("div", { className: "text-center" },
                          React.createElement("div", { className: "text-5xl mb-2" }, crFb.ok ? "\uD83C\uDF89" : crFb.close ? "\uD83D\uDFE1" : "\u274C"),
                          React.createElement("p", { className: "text-zinc-200 font-bold text-center mb-1 text-base bg-zinc-900/80 px-4 py-2 rounded-lg" }, crFb.msg)
                        )
                      ) : null,

                      // Patience Bar
                      React.createElement("div", { className: "h-1 w-full bg-zinc-700 mb-4 rounded-full overflow-hidden" },
                        React.createElement("div", { className: "h-full transition-all duration-100", style: { width: crPatiencePct + '%', backgroundColor: crPatiencePct > 50 ? '#34d399' : crPatiencePct > 20 ? '#fbbf24' : '#ef4444' } })
                      ),
                      React.createElement("div", { className: "flex items-center gap-3 mb-4 relative z-0" },
                        React.createElement("div", { className: "w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-3xl shadow-inner border border-zinc-600" }, crCustomer.emoji),
                        React.createElement("div", { className: "flex-1" },
                          React.createElement("p", { className: "text-zinc-200 font-bold text-sm" }, crCustomer.name),
                          React.createElement("p", { className: "text-zinc-400 text-[11px] font-bold" }, __alloT('stem.money.waiting_for_total', "Waiting for total..."))
                        ),
                        // v3: in-game toggles (canvas + bot) — compact
                        React.createElement("div", { className: "flex items-center gap-1" },
                          React.createElement("button", {
                            onClick: function() { upd('crCanvasOn', !crCanvasOn); },
                            'aria-pressed': crCanvasOn,
                            title: crCanvasOn ? 'Hide canvas scene' : 'Show canvas scene',
                            className: 'text-[10px] font-bold px-2 py-1 rounded ' + (crCanvasOn ? 'bg-amber-500 text-zinc-900' : 'bg-zinc-700 text-zinc-400')
                          }, '🎨'),
                          React.createElement("button", {
                            onClick: function() { upd('crBotCoachOn', !crBotCoachOn); },
                            'aria-pressed': crBotCoachOn,
                            title: crBotCoachOn ? 'Hide AlloBot coach' : 'Show AlloBot coach',
                            className: 'text-[10px] font-bold px-2 py-1 rounded ' + (crBotCoachOn ? 'bg-indigo-500 text-white' : 'bg-zinc-700 text-zinc-400')
                          }, '🤖')
                        )
                      ),

                      // v3: Canvas scene — checkout counter with items + register + candle
                      crCanvasOn && React.createElement("div", {
                        className: "mb-3 rounded-lg overflow-hidden border border-zinc-700 relative z-0",
                        style: { background: 'var(--allo-stem-canvas, #0f172a)' }
                      },
                        React.createElement("canvas", {
                          ref: function (el) { drawCashierScene(el); },
                          'role': 'img',
                          tabIndex: 0,
                          'aria-label': 'Power outage checkout for ' + crCustomer.name + '. ' + crCustomer.items.length + ' items on the conveyor: ' +
                            crCustomer.items.map(function(it) { return it.name + ', ' + (it.weight ? it.weight + ' pounds at ' + fmt(it.price) + ' per pound' : (it.qty || 1) + ' at ' + fmt(it.price)); }).join('; ') + '. ' +
                            (crCustomer.coupon ? 'Coupon ' + crCustomer.coupon.label + '. ' : 'No coupon. ') +
                            (crCustomer.hasTax ? Math.round(taxRate * 100) + ' percent tax applies. ' : 'No tax. ') + 'Enter the transaction total.',
                          style: { width: '100%', display: 'block', height: 280 }
                        })
                      ),

                      // Transaction flow keeps item, coupon, tax, and total order visible.
                      React.createElement('div', { role: 'list', 'aria-label': __alloT('stem.money.transaction_steps', 'Transaction steps'), className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 relative z-0' },
                        [
                          { icon: '\uD83D\uDED2', label: __alloT('stem.money.scan_items', 'Scan items'), detail: crCustomer.items.length + ' ' + __alloT('stem.money.items', 'items'), tone: 'border-sky-700/60 bg-sky-950/35 text-sky-200' },
                          { icon: '\uD83C\uDFF7\uFE0F', label: __alloT('stem.money.apply_coupon', 'Apply coupon'), detail: crCustomer.coupon ? crCustomer.coupon.label : __alloT('stem.money.none', 'None'), tone: 'border-violet-700/60 bg-violet-950/35 text-violet-200' },
                          { icon: '\uD83E\uDDFE', label: __alloT('stem.money.add_tax', 'Add tax'), detail: crCustomer.hasTax ? Math.round(taxRate * 100) + '% ' + __alloT('stem.money.after_coupon', 'after coupon') : __alloT('stem.money.none', 'None'), tone: 'border-orange-700/60 bg-orange-950/35 text-orange-200' },
                          { icon: '\u2328\uFE0F', label: __alloT('stem.money.enter_total', 'Enter total'), detail: crFb ? fmt(crCustomer.correctTotal) : crAnswer ? cur.symbol + crAnswer : __alloT('stem.money.your_answer_2', 'Your answer'), tone: crFb ? (crFb.ok ? 'border-emerald-600 bg-emerald-950/40 text-emerald-200' : 'border-red-600 bg-red-950/40 text-red-200') : 'border-amber-600/70 bg-amber-950/35 text-amber-200' }
                        ].map(function (step, stepIndex) {
                          return React.createElement('div', { key: 'transaction-step-' + stepIndex, role: 'listitem', className: 'rounded-lg border p-2 min-w-0 ' + step.tone },
                            React.createElement('div', { className: 'flex items-center gap-1.5' },
                              React.createElement('span', { 'aria-hidden': true, className: 'text-base' }, step.icon),
                              React.createElement('span', { className: 'text-[10px] font-black uppercase tracking-wide truncate' }, (stepIndex + 1) + '. ' + step.label)
                            ),
                            React.createElement('p', { className: 'text-[10px] font-bold mt-1 truncate' }, step.detail)
                          );
                        })
                      ),

                      // v3: AlloBot Coach panel — avatar + speech bubble with latest hint/praise
                      crBotCoachOn && crBotMessage && React.createElement("div", {
                        role: 'region', 'aria-label': __alloT('stem.money.allobot_coach', 'AlloBot coach'),
                        className: 'mb-4 flex items-start gap-3 bg-indigo-950/40 rounded-lg p-3 border border-indigo-700/50 relative z-0'
                      },
                        React.createElement("canvas", {
                          ref: function (el) { drawAlloBotAvatar(el, crBotMood); },
                          'aria-hidden': 'true',
                          style: { width: 64, height: 64, flexShrink: 0 }
                        }),
                        React.createElement("div", { className: 'flex-1' },
                          React.createElement("p", { className: 'text-[11px] font-bold text-indigo-300 mb-0.5 uppercase tracking-wider' },
                            crBotMessage.kind === 'intro' ? 'AlloBot' :
                            crBotMessage.kind === 'hint' ? 'AlloBot · Hint' :
                            crBotMessage.kind === 'breakdown' ? 'AlloBot · Step by step' :
                            crBotMessage.kind === 'praise' ? 'AlloBot · Nice' :
                            crBotMessage.kind === 'wave' ? 'AlloBot · Wave done' : 'AlloBot'
                          ),
                          React.createElement("p", { className: 'text-sm text-zinc-100 leading-snug', 'aria-live': 'polite' }, crBotMessage.text),
                          React.createElement("div", { className: 'flex gap-2 mt-2' },
                            React.createElement("button", {
                              onClick: function () { upd('crBotTtsOn', !crBotTtsOn); },
                              'aria-pressed': crBotTtsOn,
                              title: crBotTtsOn ? 'Stop reading aloud' : 'Read aloud',
                              className: 'text-[10px] font-bold px-2 py-0.5 rounded ' + (crBotTtsOn ? 'bg-indigo-500 text-white' : 'transition-colors bg-zinc-800 text-zinc-400 hover:bg-zinc-700')
                            }, crBotTtsOn ? '🔊 Voice on' : '🔈 Voice off'),
                            React.createElement("button", {
                              onClick: function () { upd('crBotMessage', null); },
                              title: __alloT('stem.money.dismiss', 'Dismiss'),
                              className: 'transition-colors text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }, __alloT('stem.money.dismiss_2', 'Dismiss'))
                          )
                        )
                      ),

                      // Receipt / Basket
                      React.createElement("div", { className: "bg-[#fffbc8] text-zinc-800 p-4 rounded-sm shadow-inner font-mono text-sm relative z-0" },
                        // jagged top
                        React.createElement("div", { className: "absolute top-0 left-0 w-full h-2 bg-zinc-800", style: { maskImage: 'radial-gradient(circle at 4px 0px, transparent 4px, black 4.5px)', maskSize: '8px 8px', maskRepeat: 'repeat-x' } }),
                        React.createElement("div", { className: "text-center pb-2 border-b-2 border-dashed border-zinc-400 mb-2 mt-1 opacity-80" },
                          React.createElement("p", { className: "font-bold text-xs flex justify-center items-center gap-1" }, React.createElement("span", null, "\u26A1"), React.createElement("span", null, __alloT('stem.money.allofood_mkt', "ALLOFOOD MKT")), React.createElement("span", null, "\u26A1")),
                          React.createElement("p", { className: "text-[11px]" }, __alloT('stem.money.system_offline', "SYSTEM OFFLINE"))
                        ),
                        
                        crCustomer.items.map(function(it, i) {
                          return React.createElement("div", { key: i, className: "flex justify-between mb-1 text-xs" },
                            React.createElement("div", { className: "flex-1" },
                              React.createElement("span", { className: "font-bold" }, it.name),
                              React.createElement("div", { className: "text-[11px] text-zinc-600 pl-1" }, 
                                it.weight ? (it.weight + " lb @ " + fmt(it.price) + "/lb") :
                                it.qty > 1 ? (it.qty + " @ " + fmt(it.price) + " ea") : ""
                              )
                            ),
                            React.createElement("span", { className: "font-bold" }, fmt(it.weight ? it.price * it.weight : it.price * it.qty))
                          );
                        }),
                        
                        grade !== 'elementary' ? React.createElement("div", { className: "mt-2 pt-2 border-t border-dashed border-zinc-400 text-xs flex justify-between text-zinc-600" },
                          React.createElement("span", null, __alloT('stem.money.subtotal', "Subtotal")), React.createElement("span", null, fmt(crCustomer.subtotal))
                        ) : null,
                        
                        crCustomer.coupon ? React.createElement("div", { className: "flex justify-between text-red-600 font-bold text-xs mt-1" },
                          React.createElement("span", null, "COUPON: " + crCustomer.coupon.label),
                          React.createElement("span", null, "-" + fmt(crCustomer.subtotal - crCustomer.afterCoupon))
                        ) : null,
                        
                        crCustomer.hasTax ? React.createElement("div", { className: "flex justify-between text-zinc-600 text-xs mt-1" },
                          React.createElement("span", null, "Tax (" + (taxRate*100) + "%)"), React.createElement("span", null, crFb ? fmt(crCustomer.taxAmt) : "???")
                        ) : null
                      )
                    ),

                    // Input / Feedback Area
                    crFb ? React.createElement("div", { className: "animate-in slide-in-from-bottom flex flex-col items-center mt-2" },
                      React.createElement('div', { role: 'region', 'aria-label': __alloT('stem.money.round_transaction_math', 'Round transaction math'), className: 'w-full rounded-xl border border-zinc-700 bg-zinc-800/90 p-3 mb-2' },
                        React.createElement('div', { className: 'flex items-center justify-between gap-2 mb-2' },
                          React.createElement('p', { className: 'text-xs font-black text-zinc-100' }, __alloT('stem.money.transaction_breakdown', 'Transaction breakdown')),
                          React.createElement('span', { className: 'text-[10px] font-bold text-zinc-400' }, __alloT('stem.money.receipt_reveal', 'Receipt reveal'))
                        ),
                        React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
                          React.createElement('div', { className: 'rounded-lg border border-sky-800 bg-sky-950/35 p-2 text-center' },
                            React.createElement('p', { className: 'text-[10px] font-bold text-sky-300' }, __alloT('stem.money.items_subtotal', 'Items subtotal')),
                            React.createElement('p', { className: 'text-sm font-black text-sky-100' }, fmt(crCustomer.subtotal))
                          ),
                          crCustomer.coupon && React.createElement('div', { className: 'rounded-lg border border-violet-800 bg-violet-950/35 p-2 text-center' },
                            React.createElement('p', { className: 'text-[10px] font-bold text-violet-300' }, __alloT('stem.money.coupon_deduction', 'Coupon deduction')),
                            React.createElement('p', { className: 'text-sm font-black text-violet-100' }, '-' + fmt(crCustomer.subtotal - crCustomer.afterCoupon))
                          ),
                          crCustomer.hasTax && React.createElement('div', { className: 'rounded-lg border border-orange-800 bg-orange-950/35 p-2 text-center' },
                            React.createElement('p', { className: 'text-[10px] font-bold text-orange-300' }, Math.round(taxRate * 100) + '% ' + __alloT('stem.money.tax', 'tax')),
                            React.createElement('p', { className: 'text-sm font-black text-orange-100' }, '+' + fmt(crCustomer.taxAmt))
                          ),
                          React.createElement('div', { className: 'rounded-lg border border-emerald-700 bg-emerald-950/40 p-2 text-center' },
                            React.createElement('p', { className: 'text-[10px] font-bold text-emerald-300' }, __alloT('stem.money.correct_total', 'Correct total')),
                            React.createElement('p', { className: 'text-sm font-black text-emerald-100' }, fmt(crCustomer.correctTotal))
                          )
                        ),
                        React.createElement('p', { className: 'mt-2 rounded-lg bg-zinc-950 px-2 py-1.5 text-center text-[10px] font-mono font-bold text-amber-300 overflow-x-auto whitespace-nowrap' },
                          fmt(crCustomer.subtotal) + (crCustomer.coupon ? ' - ' + fmt(crCustomer.subtotal - crCustomer.afterCoupon) : '') + (crCustomer.hasTax ? ' + ' + fmt(crCustomer.taxAmt) : '') + ' = ' + fmt(crCustomer.correctTotal)
                        )
                      ),
                      React.createElement("div", { className: "flex gap-2 my-2 text-xs w-full justify-center" },
                        React.createElement("div", { className: "text-center bg-zinc-800 rounded-lg px-2 py-2 border border-zinc-700 shadow-inner w-20" }, React.createElement("p", { className: "text-zinc-500 text-[11px] uppercase font-bold" }, __alloT('stem.money.accuracy', "Accuracy")), React.createElement("p", { className: "text-emerald-400 font-black text-lg leading-tight" }, "+" + crFb.accuracy)),
                        React.createElement("div", { className: "text-center bg-zinc-800 rounded-lg px-2 py-2 border border-zinc-700 shadow-inner w-20" }, React.createElement("p", { className: "text-zinc-500 text-[11px] uppercase font-bold" }, __alloT('stem.money.speed', "Speed")), React.createElement("p", { className: "text-sky-400 font-black text-lg leading-tight" }, "+" + crFb.speed)),
                        React.createElement("div", { className: "text-center bg-zinc-800 rounded-lg px-2 py-2 border border-amber-900/50 shadow-inner w-20" }, React.createElement("p", { className: "text-amber-500/70 text-[11px] uppercase font-bold" }, __alloT('stem.money.total_3', "Total")), React.createElement("p", { className: "text-amber-400 font-black text-lg leading-tight" }, "+" + crFb.score))
                      ),
                      React.createElement("button", { "aria-label": __alloT('stem.money.next_customer', "Next Customer"), onClick: genCashierRound, className: "w-full py-4 bg-amber-500 text-zinc-900 font-black rounded-xl hover:bg-amber-400 hover:scale-105 transition-all text-sm shadow-[0_0_15px_rgba(251,191,36,0.3)] mt-2" }, __alloT('stem.money.next_customer_2', "Next Customer \u2192"))
                    ) :
                    React.createElement("div", { className: "flex gap-2 relative z-20 mt-2" },
                      React.createElement("div", { className: "relative flex-1" },
                        React.createElement("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-black text-base" }, cur.symbol),
                        React.createElement("input", {
                          type: "number", step: isJPY ? "1" : "0.01",
                          value: crAnswer,
                          onChange: function(e) { upd('crAnswer', e.target.value); },
                          onKeyDown: function(e) { if(e.key === 'Enter') submitCashierAnswer(); },
                          placeholder: "Total...", autoFocus: true,
                          'aria-label': __alloT('stem.money.cashier_register_answer', 'Cashier register answer'),
                          className: "w-full pl-12 pr-4 py-4 bg-zinc-800 border-2 border-zinc-600 rounded-xl text-zinc-100 font-mono text-xl font-bold focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner"
                        })
                      ),
                      React.createElement("button", { "aria-label": "ENTER", onClick: submitCashierAnswer, disabled: !crAnswer,
                        className: "px-6 bg-emerald-700 text-white font-black rounded-xl hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md text-lg active:scale-95"
                      }, "ENTER")
                    )
                  ) : null,

                  crGameOver ? React.createElement("div", { className: "relative z-10 text-center py-6" },
                    React.createElement("div", { className: "text-5xl mb-3", 'aria-hidden': true }, "\uD83D\uDD14"),
                    React.createElement("h2", { className: "text-2xl font-black text-red-500 mb-2 uppercase tracking-wide drop-shadow-md" }, __alloT('stem.money.shift_over', "Shift Over!")),
                    React.createElement("p", { className: "text-sm text-zinc-300 mb-5 max-w-sm mx-auto" },
                      __alloT('stem.money.you_ran_out_of_time_still_you_served', "You ran out of time! Still, you served "), React.createElement("span", { className: "text-amber-400 font-bold" }, crServed), crServed === 1 ? " customer." : " customers."
                    ),
                    React.createElement("div", { className: "w-full max-w-lg mx-auto" },
                      React.createElement("div", { className: "bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-2xl p-5 border border-amber-500/40 mb-3 shadow-xl shadow-black/50" },
                        React.createElement("p", { className: "text-[11px] text-zinc-400 font-bold uppercase mb-1 tracking-widest" }, __alloT('stem.money.final_score', "Final Score")),
                        React.createElement("p", { className: "text-5xl font-black text-amber-500 drop-shadow-md" }, crScore),
                        React.createElement("p", { className: "text-xs text-zinc-400 font-bold mt-2" }, __alloT('stem.money.top_round', "Top round"), ": ", React.createElement("span", { className: "text-emerald-400" }, crBest + "/100"))
                      ),
                      React.createElement("div", { 'aria-label': __alloT('stem.money.shift_summary', 'Shift summary'), className: "grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3" },
                        React.createElement("div", { className: "rounded-xl border border-amber-500/30 bg-zinc-800 p-3" },
                          React.createElement("p", { className: "text-[10px] uppercase tracking-wide font-black text-zinc-500" }, __alloT('stem.money.average_round', "Average round")),
                          React.createElement("p", { className: "mt-1 text-xl font-black text-amber-400" }, crAverageScore, React.createElement("span", { className: "text-xs text-zinc-500" }, "/100"))
                        ),
                        React.createElement("div", { className: "rounded-xl border border-emerald-500/30 bg-zinc-800 p-3" },
                          React.createElement("p", { className: "text-[10px] uppercase tracking-wide font-black text-zinc-500" }, __alloT('stem.money.accuracy', "Accuracy")),
                          React.createElement("p", { className: "mt-1 text-xl font-black text-emerald-400" }, crAverageAccuracyPct + "%")
                        ),
                        React.createElement("div", { className: "rounded-xl border border-sky-500/30 bg-zinc-800 p-3" },
                          React.createElement("p", { className: "text-[10px] uppercase tracking-wide font-black text-zinc-500" }, __alloT('stem.money.speed', "Speed")),
                          React.createElement("p", { className: "mt-1 text-xl font-black text-sky-400" }, crAverageSpeedPct + "%")
                        ),
                        React.createElement("div", { className: "rounded-xl border border-violet-500/30 bg-zinc-800 p-3" },
                          React.createElement("p", { className: "text-[10px] uppercase tracking-wide font-black text-zinc-500" }, __alloT('stem.money.perfect_rounds', "Perfect rounds")),
                          React.createElement("p", { className: "mt-1 text-xl font-black text-violet-300" }, crPerfectRounds)
                        )
                      ),
                      crRecentHistory.length ? React.createElement("div", {
                        role: "img",
                        'aria-label': __alloT('stem.money.recent_round_scores', 'Recent round scores') + ': ' + crRecentHistoryLabel,
                        className: "rounded-2xl border border-zinc-700 bg-zinc-900/90 px-4 pt-4 pb-3 mb-6 text-left"
                      },
                        React.createElement("div", { className: "flex items-center justify-between gap-2 mb-2" },
                          React.createElement("div", null,
                            React.createElement("p", { className: "text-[10px] uppercase tracking-widest font-black text-zinc-500" }, __alloT('stem.money.performance_trend', "Performance trend")),
                            React.createElement("p", { className: "text-sm font-black text-zinc-200" }, __alloT('stem.money.last_rounds', "Last rounds"))
                          ),
                          React.createElement("div", { 'aria-hidden': true, className: "flex items-center gap-2 text-[10px] font-bold text-zinc-500" },
                            React.createElement("span", null, React.createElement("i", { className: "inline-block w-2 h-2 rounded-sm bg-emerald-400 mr-1" }), "100"),
                            React.createElement("span", null, React.createElement("i", { className: "inline-block w-2 h-2 rounded-sm bg-amber-400 mr-1" }), "70+"),
                            React.createElement("span", null, React.createElement("i", { className: "inline-block w-2 h-2 rounded-sm bg-rose-500 mr-1" }), "<70")
                          )
                        ),
                        React.createElement("div", { 'aria-hidden': true, className: "flex h-24 items-end gap-2 border-b border-zinc-700 px-1" },
                          crRecentHistory.map(function (round, roundIndex) {
                            var roundScore = Math.max(0, Math.min(100, Number(round.score) || 0));
                            var roundNumber = crHistoryCount - crRecentHistory.length + roundIndex + 1;
                            var roundColor = roundScore >= 100 ? 'bg-emerald-400' : roundScore >= 70 ? 'bg-amber-400' : 'bg-rose-500';
                            return React.createElement("div", { key: "summary-round-" + roundNumber, className: "flex min-w-0 flex-1 flex-col items-center justify-end" },
                              React.createElement("span", { className: "mb-1 text-[10px] font-black " + (roundScore >= 100 ? "text-emerald-300" : "text-zinc-300") }, roundScore >= 100 ? "\u2605 " + roundScore : roundScore),
                              React.createElement("div", { className: "w-full max-w-10 rounded-t " + roundColor, style: { height: Math.max(7, Math.round(roundScore * 0.62)) + "px" } }),
                              React.createElement("span", { className: "mt-1 text-[10px] font-bold text-zinc-500" }, "#" + roundNumber)
                            );
                          })
                        )
                      ) : null,
                      React.createElement("div", { className: "flex flex-col items-center space-y-3 w-full" },
                        React.createElement("button", { onClick: startCashierRush, className: "px-8 py-3 bg-amber-500 text-zinc-900 font-black text-lg rounded-xl hover:bg-amber-400 transition-all shadow-[0_0_15px_rgba(251,191,36,0.5)] w-full max-w-[280px]" }, __alloT('stem.money.play_again', "Play Again \u21BB")),
                        React.createElement("button", { "aria-label": __alloT('stem.money.exit_emergency', "Exit Emergency"), onClick: function() { upd('crActive', false); }, className: "px-8 py-3 bg-transparent text-zinc-400 font-black text-sm rounded-xl hover:text-white hover:bg-zinc-800 transition-all w-full max-w-[280px] border border-zinc-700" }, __alloT('stem.money.exit_emergency_2', "Exit Emergency"))
                      )
                    )
                  ) : null
                ) : React.createElement(React.Fragment, null,
                  // ── Header row: Recipe Mode toggle (middle+) ──
                grade !== 'elementary' && React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-2" },
                  React.createElement("button", { "aria-label": __alloT('stem.money.select_a_recipe', "Select a Recipe"), onClick: function () { upd('recipeMode', !recipeMode); upd('activeRecipe', null); },
                    className: "px-3 py-1.5 rounded-lg text-xs font-black transition-all " + (recipeMode ? 'bg-purple-700 text-white ring-2 ring-purple-300 shadow-lg' : 'bg-white text-purple-600 border border-purple-600 hover:bg-purple-50')
                  }, recipeMode ? '\uD83D\uDCCB Recipe Mode ON' : '\uD83D\uDCCB Recipe Mode')
                ),

                // ── Recipe Panel (when active) ──
                recipeMode && React.createElement("div", { className: "bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl p-4 border border-purple-200" },
                  React.createElement("h4", { className: "text-sm font-bold text-purple-800 mb-3" }, __alloT('stem.money.select_a_recipe_2', "\uD83D\uDCCB Select a Recipe")),
                  // Recipe selector
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3" },
                    RECIPES.map(function (r, ri) {
                      return React.createElement("button", { key: ri, onClick: function () { upd('activeRecipe', activeRecipe === ri ? null : ri); upd('recipeFb', null); },
                        className: "p-2 rounded-xl text-center transition-all border-2 " + (activeRecipe === ri ? 'border-purple-500 bg-purple-100 shadow-md' : 'border-slate-200 bg-white hover:border-purple-600')
                      },
                        React.createElement("span", { className: "text-2xl" }, r.icon),
                        React.createElement("p", { className: "text-[11px] font-bold text-slate-700 mt-0.5" }, r.name.replace(/^[^\s]+\s/, ''))
                      );
                    })
                  ),
                  // Servings slider + Ingredient list
                  selectedRecipe && React.createElement("div", { className: "space-y-3" },
                    React.createElement("div", { className: "flex items-center gap-3 bg-white rounded-lg p-3 border border-purple-100" },
                      React.createElement("label", { className: "text-xs font-bold text-purple-700" }, __alloT('stem.money.servings', "\uD83C\uDF7D Servings:")),
                      React.createElement("input", { type: "range", min: 1, max: 12, value: recipeServings, 'aria-label': __alloT('stem.money.number_of_servings', 'Number of servings'), onChange: function (e) { upd('recipeServings', parseInt(e.target.value)); },
                        className: "flex-1 accent-purple-500" }),
                      React.createElement("span", { className: "text-sm font-black text-purple-600 min-w-[2rem] text-center" }, recipeServings)
                    ),
                    React.createElement("div", { className: "bg-white rounded-lg p-3 border border-purple-100 space-y-1.5" },
                      React.createElement("p", { className: "text-xs font-bold text-purple-700 mb-1" }, "\uD83D\uDCDD Shopping List for " + recipeServings + " servings:"),
                      scaledIngredients.map(function (ing, ii) {
                        var inCart = cart.find(function (c) { return c.name.indexOf(ing.item) >= 0 || ing.item.indexOf(c.name.replace(/^[^\s]+\s/, '')) >= 0; });
                        return React.createElement("div", { key: ii, className: "flex items-center gap-2 text-xs" },
                          React.createElement("span", { className: "text-base" }, inCart ? '\u2705' : '\u2B1C'),
                          React.createElement("span", { className: inCart ? 'text-green-700 font-bold line-through' : 'text-slate-700 font-medium' },
                            ing.qty + ' ' + ing.unit + ' ' + ing.item
                          )
                        );
                      })
                    ),
                    React.createElement("div", { className: "flex gap-2" },
                      React.createElement("button", { "aria-label": __alloT('stem.money.check_recipe_cart', "Check Recipe Cart"), onClick: function () {
                        var result = checkRecipeCart();
                        if (!result) return;
                        if (result.complete) {
                          upd('recipeFb', { ok: true, msg: '\u2705 All ' + result.total + ' ingredients found! Total: ' + fmt(cartGrand) + ' \u2014 +25 XP!' });
                          if (typeof addXP === 'function') addXP(25, 'Money Math: Recipe shopping complete');
                          if (typeof awardStemXP === 'function') awardStemXP('moneyMath', 25, 'recipe shopping');
                        } else {
                          upd('recipeFb', { ok: false, msg: '\u274C Missing ' + result.missing.length + ' item(s): ' + result.missing.join(', ') });
                        }
                      }, className: "flex-1 px-4 py-2 bg-purple-700 text-white font-bold rounded-xl hover:bg-purple-600 transition-all text-sm shadow-md" }, __alloT('stem.money.check_recipe_cart_2', "\u2714 Check Recipe Cart")),
                      React.createElement("button", { "aria-label": __alloT('stem.money.clear_3', "Clear"), onClick: function () { upd('cart', []); upd('recipeFb', null); resetGroceryCheckout(); }, className: "transition-colors px-3 py-2 text-xs text-red-400 hover:text-red-600 font-bold" }, __alloT('stem.money.clear_4', "Clear"))
                    ),
                    d.recipeFb && React.createElement("p", { className: "text-xs font-bold " + (d.recipeFb.ok ? 'text-green-600' : 'text-red-500') }, d.recipeFb.msg)
                  )
                ),

                // ── Category filter pills ──
                React.createElement("div", { className: "flex flex-wrap gap-1" },
                  storeCats.map(function (cat) {
                    var catIcons = { All: '\uD83C\uDFEA', Produce: '\uD83E\uDD6C', Meat: '\uD83E\uDD69', Dairy: '\uD83E\uDDC0', Bakery: '\uD83C\uDF5E', Pantry: '\uD83E\uDD6B', Frozen: '\uD83E\uDDCA', Drinks: '\uD83E\uDD64', Snacks: '\uD83C\uDF6B' };
                    return React.createElement("button", { key: cat, onClick: function () { upd('storeCat', cat); },
                      className: "px-2 py-1 rounded-full text-[11px] font-bold transition-all " + (storeCat === cat ? 'bg-orange-700 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-400 hover:bg-orange-50')
                    }, (catIcons[cat] || '\uD83C\uDFEA') + ' ' + cat);
                  })
                ),

                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" },
                  // Store shelves
                  React.createElement("div", { className: "md:col-span-2 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200" },
                    React.createElement("div", { className: "flex items-center justify-between mb-3 flex-wrap gap-2" },
                      React.createElement("h3", { className: "text-sm font-bold text-orange-800" }, "\uD83D\uDED2 " + cur.flag + " Store Shelves"),
                      // v3: Difficulty selector (compact, inline next to header)
                      React.createElement("div", { className: "flex gap-1 items-center bg-white/70 rounded-lg px-2 py-1 border border-orange-200" },
                        React.createElement("span", { className: "text-[10px] font-bold text-orange-700 mr-1" }, "Prices:"),
                        [
                          { id: 'easy',      label: __alloT('stem.money.round', '\uD83D\uDFE2 Round'),  title: __alloT('stem.money.round_prices_in_0_50_increments', 'Round prices in $0.50 increments') },
                          { id: 'standard',  label: __alloT('stem.money.real', '\uD83D\uDFE1 Real'),   title: __alloT('stem.money.real_world_cents_precision_prices', 'Real-world cents-precision prices') },
                          { id: 'challenge', label: __alloT('stem.money.hard', '\uD83D\uDD34 Hard'),   title: __alloT('stem.money.real_prices_harder_mental_math', 'Real prices + harder mental math') }
                        ].map(function(sd) {
                          var active = storeDifficulty === sd.id;
                          return React.createElement("button", {
                            key: 'sd-' + sd.id,
                            onClick: function() {
                              upd('storeDifficulty', sd.id);
                              // Clear cart on difficulty switch so cart prices match new tier
                              upd('cart', []);
                              resetGroceryCheckout();
                            },
                            'aria-pressed': active,
                            title: sd.title,
                            className: 'px-2 py-0.5 rounded text-[10px] font-bold transition-all ' +
                              (active ? 'bg-orange-700 text-white shadow-sm' : 'text-orange-600 hover:bg-orange-100')
                          }, sd.label);
                        })
                      ),
                      React.createElement("span", { className: "text-[11px] text-slate-600 font-bold" }, filteredStoreItems.length + " items")
                    ),
                    React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[480px] overflow-y-auto pr-1" },
                      filteredStoreItems.map(function (item, ii) {
                        var isWeighed = item.pricePer && item.pricePer !== 'each';
                        var isAdding = d.weightItemIdx === ii && isWeighed;
                        // v3: apply storeDifficulty-based price rounding for display + cart-add
                        var displayPrice = getStorePrice(item.price);
                        return React.createElement("div", { key: ii, className: "relative" },
                          React.createElement("button", { onClick: function () {
                              if (isWeighed) {
                                upd('weightItemIdx', isAdding ? null : ii);
                                upd('weightInput', 1);
                              } else {
                                var existing = cart.findIndex(function (c) { return c.name === item.name; });
                                if (existing >= 0) {
                                  var newCart = cart.map(function (c, idx) { return idx === existing ? Object.assign({}, c, { qty: (c.qty || 1) + 1 }) : c; });
                                  upd('cart', newCart);
                                } else {
                                  upd('cart', [].concat(cart, [{ name: item.name, price: displayPrice, qty: 1, pricePer: 'each' }]));
                                }
                                upd('lastReceipt', null);
                                if (typeof addToast === 'function') addToast('Added ' + item.name + ' to cart!', 'success');
                              }
                            },
                            disabled: checkoutActive,
                            className: "w-full p-3 bg-white rounded-xl border text-left group transition-all " + (checkoutActive ? 'border-orange-100 opacity-45 cursor-not-allowed' : isAdding ? 'border-orange-400 ring-2 ring-orange-200 shadow-md' : 'border-orange-100 hover:border-orange-600 hover:shadow-md')
                          },
                            React.createElement("div", { className: "text-2xl mb-1" }, item.name.split(' ')[0]),
                            React.createElement("p", { className: "text-xs font-bold text-slate-700 truncate" }, item.name.substring(item.name.indexOf(' ') + 1)),
                            React.createElement("div", { className: "flex items-baseline gap-1" },
                              React.createElement("span", { className: "text-sm font-black text-emerald-600" }, fmt(displayPrice)),
                              isWeighed && React.createElement("span", { className: "text-[11px] text-orange-700 font-bold" }, "/" + item.pricePer)
                            ),
                            React.createElement("span", { className: "text-[11px] font-bold " + (isWeighed ? 'text-orange-500' : 'transition-colors text-orange-400 group-hover:text-orange-600') }, isWeighed ? '\u2696 Enter weight' : '+ Add to cart')
                          ),
                          // Weight entry popup for per-lb items
                          isAdding && React.createElement("div", { className: "absolute z-20 left-0 right-0 -bottom-2 translate-y-full bg-white rounded-xl p-3 shadow-xl border-2 border-orange-300 space-y-2" },
                            React.createElement("p", { className: "text-[11px] font-bold text-orange-700 text-center" }, "How many " + item.pricePer + "s?"),
                            React.createElement("div", { className: "flex items-center gap-1.5" },
                              React.createElement("button", { "aria-label": __alloT('stem.money.decrease_item_weight', "Decrease item weight"), onClick: function () { upd('weightInput', Math.max(0.25, (d.weightInput || 1) - 0.25)); }, className: "transition-colors px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200" }, "\u2212"),
                              React.createElement("input", { type: "number", step: "0.25", min: "0.25", value: d.weightInput || 1, 'aria-label': __alloT('stem.money.item_weight_in_pounds', 'Item weight in pounds'), onChange: function (e) { upd('weightInput', parseFloat(e.target.value) || 0.25); }, className: "w-14 text-center px-1 py-1 border border-orange-600 rounded-lg text-xs font-bold focus:ring-2 focus:ring-orange-400 outline-none" }),
                              React.createElement("button", { "aria-label": __alloT('stem.money.add_to_cart', "Add to Cart"), onClick: function () { upd('weightInput', (d.weightInput || 1) + 0.25); }, className: "transition-colors px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200" }, "+"),
                              React.createElement("span", { className: "text-[11px] text-slate-600 font-bold" }, item.pricePer)
                            ),
                            React.createElement("p", { className: "text-xs font-bold text-center text-emerald-600" }, "= " + fmt(displayPrice * (d.weightInput || 1))),
                            React.createElement("button", { "aria-label": __alloT('stem.money.add_to_cart_2', "Add to Cart"), onClick: function () {
                              var w = d.weightInput || 1;
                              upd('cart', [].concat(cart, [{ name: item.name, price: displayPrice, weight: w, pricePer: item.pricePer, qty: 1 }]));
                              upd('lastReceipt', null);
                              upd('weightItemIdx', null);
                              if (typeof addToast === 'function') addToast('Added ' + w + ' ' + item.pricePer + ' ' + item.name + '!', 'success');
                            }, className: "w-full px-3 py-1.5 bg-orange-700 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-all" }, __alloT('stem.money.add_to_cart_3', "\uD83D\uDED2 Add to Cart"))
                          )
                        );
                      })
                    )
                  ),
                  // Cart
                  React.createElement("div", { className: "bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200" },
                    React.createElement("h3", { className: "text-sm font-bold text-emerald-800 mb-2" }, cart.length === 0 && lastReceipt ? "\u2705 Purchase Complete" : "\uD83D\uDED2 Your Cart (" + cartItemCount + ")"),
                    cart.length === 0
                      ? (lastReceipt
                        ? React.createElement('div', { role: 'region', 'aria-label': __alloT('stem.money.completed_receipt_aria', 'Completed grocery receipt'), className: 'bg-white rounded-xl border-2 border-dashed border-emerald-300 p-3 shadow-sm' },
                            React.createElement('div', { className: 'flex items-start justify-between gap-2 pb-2 border-b border-dashed border-slate-300' },
                              React.createElement('div', null,
                                React.createElement('p', { className: 'text-sm font-black text-slate-800' }, __alloT('stem.money.grocery_receipt', 'Grocery receipt')),
                                React.createElement('p', { className: 'text-[10px] text-slate-600' }, (lastReceipt.currencyFlag || '') + ' ' + (lastReceipt.currencyCode || '') + ' \u2022 ' + (lastReceipt.itemCount || 0) + ' ' + __alloT('stem.money.items_purchased', 'items purchased'))
                              ),
                              React.createElement('span', { 'aria-hidden': true, className: 'text-2xl' }, '\u2705')
                            ),
                            React.createElement('div', { className: 'divide-y divide-dashed divide-slate-200 max-h-[230px] overflow-y-auto pr-1' },
                              (lastReceipt.items || []).map(function (line, receiptIndex) {
                                return React.createElement('div', { key: 'receipt-line-' + receiptIndex, className: 'flex items-center justify-between gap-3 py-2' },
                                  React.createElement('div', { className: 'min-w-0' },
                                    React.createElement('p', { className: 'text-xs font-bold text-slate-700 truncate' }, line.name),
                                    React.createElement('p', { className: 'text-[10px] font-mono text-slate-600' }, line.math)
                                  ),
                                  React.createElement('span', { className: 'text-xs font-black text-slate-800 whitespace-nowrap' }, line.lineTotalLabel)
                                );
                              })
                            ),
                            React.createElement('div', { className: 'pt-2 border-t-2 border-dashed border-slate-300 space-y-1' },
                              React.createElement('div', { className: 'flex justify-between text-xs text-slate-600' }, React.createElement('span', null, __alloT('stem.money.subtotal_3', 'Subtotal')), React.createElement('span', { className: 'font-bold text-slate-800' }, lastReceipt.subtotalLabel)),
                              lastReceipt.hasTax && React.createElement('div', { className: 'flex justify-between text-xs text-slate-600' }, React.createElement('span', null, lastReceipt.taxRateLabel + ' ' + __alloT('stem.money.sales_tax', 'sales tax')), React.createElement('span', { className: 'font-bold text-slate-800' }, lastReceipt.taxLabel)),
                              React.createElement('div', { className: 'flex justify-between text-base font-black text-emerald-700 pt-1' }, React.createElement('span', null, __alloT('stem.money.total_paid', 'Total paid')), React.createElement('span', null, lastReceipt.cashTotalLabel || lastReceipt.totalLabel)),
                              lastReceipt.cashAdjustmentLabel && React.createElement('div', { className: 'flex justify-between text-[10px] text-slate-600' }, React.createElement('span', null, __alloT('stem.money.cash_rounding', 'Cash rounding')), React.createElement('span', { className: 'font-bold text-slate-700' }, lastReceipt.totalLabel + ' \u2192 ' + lastReceipt.cashTotalLabel)),
                              lastReceipt.paymentLabel && React.createElement('div', { className: 'flex justify-between text-xs text-slate-600 pt-1 border-t border-dashed border-slate-200' }, React.createElement('span', null, __alloT('stem.money.payment_method', 'Payment method')), React.createElement('span', { className: 'font-bold text-slate-800' }, lastReceipt.paymentLabel)),
                              lastReceipt.tenderLabel && React.createElement('div', { className: 'flex justify-between text-xs text-slate-600' }, React.createElement('span', null, __alloT('stem.money.cash_received', 'Cash received')), React.createElement('span', { className: 'font-bold text-slate-800' }, lastReceipt.tenderLabel)),
                              lastReceipt.changeLabel && React.createElement('div', { className: 'flex justify-between text-xs text-slate-600' }, React.createElement('span', null, __alloT('stem.money.change_returned', 'Change returned')), React.createElement('span', { className: 'font-bold text-amber-700' }, lastReceipt.changeLabel)),
                              lastReceipt.estimateLabel && React.createElement('div', { className: 'flex justify-between text-xs text-slate-600' }, React.createElement('span', null, __alloT('stem.money.your_estimate', 'Your estimate')), React.createElement('span', { className: 'font-bold text-sky-700' }, lastReceipt.estimateLabel + ' (\u0394 ' + lastReceipt.estimateDifferenceLabel + ')')),
                              lastReceipt.returnedPieces && lastReceipt.returnedPieces.length ? React.createElement('p', { className: 'text-[10px] text-slate-600' }, __alloT('stem.money.cash_drawer_returned', 'Cash drawer returned') + ': ' + lastReceipt.returnedPieces.map(function (piece) { return piece.count + '\u00D7 ' + piece.label; }).join(', ')) : null,
                              React.createElement('p', { className: 'rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1.5 text-center text-[10px] font-mono font-bold text-emerald-800' }, lastReceipt.hasTax ? lastReceipt.subtotalLabel + ' + ' + lastReceipt.taxLabel + ' = ' + lastReceipt.totalLabel : lastReceipt.subtotalLabel + ' = ' + lastReceipt.totalLabel)
                            ),
                            React.createElement('button', { type: 'button', onClick: function () { upd('lastReceipt', null); }, className: 'w-full mt-3 px-3 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-600 transition-colors' }, __alloT('stem.money.shop_again', 'Shop again'))
                          )
                        : React.createElement("p", { className: "text-xs text-slate-600 text-center py-4" }, recipeMode && selectedRecipe ? "Shop for the recipe ingredients!" : "Cart is empty. Click items to add!"))
                      : React.createElement("div", { className: "space-y-1.5 max-h-[320px] overflow-y-auto" },
                          cart.map(function (item, ci) {
                            var isWeighted = item.pricePer && item.pricePer !== 'each';
                            var lineTotal = isWeighted ? item.price * (item.weight || 1) : item.price * (item.qty || 1);
                            var lineMath = isWeighted
                              ? (item.weight || 1) + ' ' + item.pricePer + ' \u00D7 ' + fmt(item.price) + '/' + item.pricePer
                              : (item.qty || 1) + ' \u00D7 ' + fmt(item.price);
                            return React.createElement("div", { key: ci, className: "flex items-center justify-between bg-white rounded-lg px-2 py-1.5 border border-emerald-100" },
                              React.createElement("div", { className: "flex-1 min-w-0" },
                                React.createElement("p", { className: "text-xs font-medium text-slate-700 truncate" }, item.name),
                                React.createElement("p", { className: "text-[10px] font-mono text-slate-600" }, lineMath)
                              ),
                              challengeMode
                                ? React.createElement("span", { className: "text-xs font-bold text-amber-500 ml-2 whitespace-nowrap" }, isWeighted ? fmt(item.price) + '/' + item.pricePer : fmt(item.price) + '/ea')
                                : React.createElement("span", { className: "text-xs font-bold text-emerald-600 ml-2 whitespace-nowrap" }, fmt(lineTotal)),
                              React.createElement("button", { type: "button", disabled: checkoutActive, "aria-label": (isWeighted || (item.qty || 1) <= 1 ? "Remove " : "Decrease quantity of ") + item.name, onClick: function () {
                                  if (!isWeighted && item.qty > 1) { upd('cart', cart.map(function (c, idx) { return idx === ci ? Object.assign({}, c, { qty: c.qty - 1 }) : c; })); }
                                  else { upd('cart', cart.filter(function (_, idx) { return idx !== ci; })); }
                                  upd('cartCheckoutFb', null); upd('recipeFb', null);
                                }, className: "transition-colors ml-1 text-red-300 hover:text-red-500 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                              }, "\u2715")
                            );
                          })
                        ),
                    // ── Challenge Mode: Mental Math Checkout ──
                    challengeMode && cart.length > 0 && !checkoutActive && React.createElement("div", { className: "mt-3 pt-3 border-t border-amber-200 space-y-2" },
                      React.createElement("p", { className: "text-xs font-bold text-amber-700" }, '\uD83C\uDFAF Add up the items yourself! ' + (gc.includeTax ? 'Don\u2019t forget 8% tax!' : '')),
                      React.createElement("div", { className: "space-y-1.5" },
                        React.createElement("div", { className: "flex items-center gap-2" },
                          React.createElement("label", { className: "text-xs text-slate-600 w-20" }, "Subtotal:"),
                          React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', 'aria-label': __alloT('stem.money.guess_subtotal', 'Guess subtotal'), value: d.cartGuessSubtotal != null ? d.cartGuessSubtotal : '', onChange: function (e) { upd('cartGuessSubtotal', e.target.value === '' ? null : parseFloat(e.target.value)); upd('cartCheckoutFb', null); }, className: "px-2 py-1.5 border border-amber-600 rounded-lg text-xs font-bold w-28 focus:ring-2 focus:ring-amber-400 outline-none" })
                        ),
                        gc.includeTax && React.createElement("div", { className: "flex items-center gap-2" },
                          React.createElement("label", { className: "text-xs text-slate-600 w-20" }, __alloT('stem.money.tax_8', "Tax (8%):")),
                          React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', 'aria-label': __alloT('stem.money.guess_tax_amount', 'Guess tax amount'), value: d.cartGuessTax != null ? d.cartGuessTax : '', onChange: function (e) { upd('cartGuessTax', e.target.value === '' ? null : parseFloat(e.target.value)); upd('cartCheckoutFb', null); }, className: "px-2 py-1.5 border border-amber-600 rounded-lg text-xs font-bold w-28 focus:ring-2 focus:ring-amber-400 outline-none" })
                        ),
                        React.createElement("div", { className: "flex items-center gap-2" },
                          React.createElement("label", { className: "text-xs font-bold text-slate-700 w-20" }, __alloT('stem.money.grand_total', "Grand Total:")),
                          React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', value: d.cartGuessTotal != null ? d.cartGuessTotal : '', onChange: function (e) { upd('cartGuessTotal', e.target.value === '' ? null : parseFloat(e.target.value)); upd('cartCheckoutFb', null); }, className: "px-2 py-1.5 border border-amber-600 rounded-lg text-xs font-bold w-28 focus:ring-2 focus:ring-amber-400 outline-none" })
                        )
                      ),
                      React.createElement("button", { "aria-label": __alloT('stem.money.check_my_math', "Check My Math"), onClick: function () {
                        var subGuess = d.cartGuessTotal;
                        if (subGuess == null) return;
                        var tol = isJPY ? 0.5 : 0.015;
                        var subOk = d.cartGuessSubtotal != null && Math.abs(d.cartGuessSubtotal - cartTotal) < tol + cartTotal * 0.005;
                        var taxOk = !gc.includeTax || (d.cartGuessTax != null && Math.abs(d.cartGuessTax - cartTax) < tol + cartTax * 0.01);
                        var totalOk = Math.abs(subGuess - cartGrand) < tol + cartGrand * 0.005;
                        var allOk = subOk && taxOk && totalOk;
                        var msg = allOk
                          ? '\u2705 Perfect! Subtotal: ' + fmt(cartTotal) + (gc.includeTax ? ', Tax: ' + fmt(cartTax) : '') + ', Total: ' + fmt(cartGrand) + ' \u2014 +15 XP!'
                          : '\u274C Not quite. Subtotal: ' + fmt(cartTotal) + (gc.includeTax ? ', Tax: ' + fmt(cartTax) : '') + ', Grand Total: ' + fmt(cartGrand);
                        upd('cartCheckoutFb', { ok: allOk, msg: msg });
                        if (allOk) {
                          if (typeof awardStemXP === 'function') awardStemXP('moneyMath', 15, 'grocery mental math');
                          if (typeof addXP === 'function') addXP(25, 'Money Math: Mental math grocery checkout');
                        }
                      }, disabled: d.cartGuessTotal == null, className: "w-full px-4 py-2 bg-amber-700 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-sm shadow-md disabled:opacity-40" }, __alloT('stem.money.check_my_math_2', '\uD83E\uDDE0 Check My Math')),
                      d.cartCheckoutFb && React.createElement("p", { role: 'status', 'aria-live': 'polite', className: "text-xs font-bold " + (d.cartCheckoutFb.ok ? 'text-green-600' : 'text-red-500') }, d.cartCheckoutFb.msg),
                      d.cartCheckoutFb && d.cartCheckoutFb.ok && React.createElement("button", { type: 'button', onClick: function () {
                        upd('checkoutActive', true); upd('checkoutStep', 'payment'); upd('checkoutEstimate', d.cartGuessTotal); upd('weightItemIdx', null);
                        upd('checkoutEstimateFb', { ok: true, msg: __alloT('stem.money.mental_math_verified', 'Mental math verified. Choose how to pay.') });
                        upd('checkoutPayment', null); upd('checkoutTender', null); upd('checkoutReturned', []); upd('checkoutChangeFb', null);
                      }, className: "w-full px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all text-sm shadow-md" }, __alloT('stem.money.continue_to_payment', '\uD83D\uDCB3 Continue to Payment')),
                      React.createElement("button", { "aria-label": __alloT('stem.money.clear_cart', "Clear Cart"), onClick: function () { upd('cart', []); upd('cartGuessSubtotal', null); upd('cartGuessTax', null); upd('cartGuessTotal', null); upd('cartCheckoutFb', null); resetGroceryCheckout(); }, className: "transition-colors w-full px-3 py-1.5 text-xs text-red-400 hover:text-red-600 font-bold" }, __alloT('stem.money.clear_cart_2', "Clear Cart"))
                    ),
                    // Complete Checkout Journey: estimate, choose payment, and make change.
                    (!challengeMode || checkoutActive) && cart.length > 0 && React.createElement("div", { className: "mt-3 pt-3 border-t border-emerald-200 space-y-2" },
                      !checkoutActive ? React.createElement(React.Fragment, null,
                        React.createElement('div', { role: 'region', 'aria-label': __alloT('stem.money.receipt_math_preview_aria', 'Receipt math preview'), className: 'bg-white rounded-xl border-2 border-dashed border-emerald-300 p-3 shadow-sm' },
                          React.createElement('div', { className: 'flex items-center justify-between gap-2 pb-2 mb-2 border-b border-dashed border-slate-300' },
                            React.createElement('div', null,
                              React.createElement('p', { className: 'text-xs font-black text-slate-800' }, __alloT('stem.money.receipt_math', 'Receipt math')),
                              React.createElement('p', { className: 'text-[10px] text-slate-600' }, cartItemCount + ' ' + __alloT('stem.money.items_in_transaction', 'items in this transaction'))
                            ),
                            React.createElement('span', { className: 'px-2 py-1 rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800' }, __alloT('stem.money.preview', 'Preview'))
                          ),
                          React.createElement("div", { className: "flex justify-between text-xs py-1" },
                            React.createElement("span", { className: "text-slate-600" }, __alloT('stem.money.subtotal_2', "Subtotal")),
                            React.createElement("span", { className: "font-bold text-slate-800" }, fmt(cartTotal))
                          ),
                          gc.includeTax && React.createElement("div", { className: "flex justify-between gap-3 text-xs py-1" },
                            React.createElement("span", { className: "text-slate-600" }, '8% \u00D7 ' + fmt(cartTotal) + ' ' + __alloT('stem.money.sales_tax', 'sales tax')),
                            React.createElement("span", { className: "font-bold text-orange-600 whitespace-nowrap" }, fmt(cartTax))
                          ),
                          React.createElement("div", { className: "flex justify-between text-base font-black pt-2 mt-1 border-t-2 border-dashed border-slate-300" },
                            React.createElement("span", { className: "text-slate-700" }, __alloT('stem.money.total_4', "Total")),
                            React.createElement("span", { className: "text-emerald-700" }, fmt(cartGrand))
                          ),
                          React.createElement('p', { className: 'mt-2 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1.5 text-center text-[10px] font-mono font-bold text-emerald-800' }, gc.includeTax ? fmt(cartTotal) + ' + ' + fmt(cartTax) + ' = ' + fmt(cartGrand) : fmt(cartTotal) + ' = ' + fmt(cartGrand))
                        ),
                        React.createElement("button", { type: 'button', onClick: function () {
                          upd('checkoutActive', true); upd('checkoutStep', 'estimate'); upd('checkoutEstimate', ''); upd('weightItemIdx', null);
                          upd('checkoutEstimateFb', null); upd('checkoutPayment', null); upd('checkoutTender', null);
                          upd('checkoutReturned', []); upd('checkoutChangeFb', null);
                        }, className: "w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all text-sm shadow-md" }, __alloT('stem.money.start_complete_checkout', '\uD83D\uDED2 Start Complete Checkout')),
                        React.createElement("button", { "aria-label": __alloT('stem.money.clear_cart_3', "Clear Cart"), onClick: function () { upd('cart', []); resetGroceryCheckout(); }, className: "transition-colors w-full px-3 py-1.5 text-xs text-red-400 hover:text-red-600 font-bold" }, __alloT('stem.money.clear_cart_4', "Clear Cart"))
                      ) : React.createElement('div', { className: 'rounded-2xl border-2 border-teal-300 bg-white p-3 shadow-lg space-y-3' },
                        React.createElement('div', { className: 'flex items-center justify-between gap-2' },
                          React.createElement('div', null,
                            React.createElement('p', { className: 'text-sm font-black text-teal-800' }, __alloT('stem.money.complete_checkout', '\uD83E\uDDFE Complete Checkout')),
                            React.createElement('p', { className: 'text-[10px] text-slate-600' }, __alloT('stem.money.checkout_journey_hint', 'Estimate, pay, and return the correct change.'))
                          ),
                          React.createElement('span', { className: 'rounded-full bg-teal-100 px-2 py-1 text-[10px] font-black text-teal-800' }, cur.flag + ' ' + cur.code)
                        ),
                        React.createElement('div', { role: 'list', 'aria-label': __alloT('stem.money.checkout_steps', 'Checkout steps'), className: 'grid grid-cols-3 gap-1' },
                          [
                            { id: 'estimate', n: 1, label: __alloT('stem.money.estimate', 'Estimate') },
                            { id: 'payment', n: 2, label: __alloT('stem.money.payment', 'Payment') },
                            { id: 'change', n: 3, label: __alloT('stem.money.change', 'Change') }
                          ].map(function (step) {
                            var stepOrder = ['estimate', 'payment', 'change'];
                            var currentIndex = stepOrder.indexOf(checkoutStep);
                            var stepIndex = stepOrder.indexOf(step.id);
                            var isDone = stepIndex < currentIndex;
                            var isCurrent = step.id === checkoutStep;
                            return React.createElement('div', { key: step.id, role: 'listitem', 'aria-current': isCurrent ? 'step' : undefined, className: 'rounded-lg border px-1 py-2 text-center ' + (isCurrent ? 'border-teal-500 bg-teal-50' : isDone ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50') },
                              React.createElement('span', { className: 'mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ' + (isCurrent ? 'bg-teal-600 text-white' : isDone ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600') }, isDone ? '\u2713' : step.n),
                              React.createElement('p', { className: 'mt-1 text-[10px] font-bold ' + (isCurrent ? 'text-teal-800' : 'text-slate-600') }, step.label)
                            );
                          })
                        ),
                        checkoutStep === 'estimate' ? React.createElement('div', { className: 'space-y-3' },
                          React.createElement('div', { className: 'rounded-xl bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-200 p-3 text-center' },
                            React.createElement('p', { className: 'text-[10px] font-black uppercase tracking-wide text-sky-700' }, __alloT('stem.money.estimate_before_reveal', 'Estimate before the register reveals the total')),
                            React.createElement('p', { className: 'mt-1 text-xs text-slate-600' }, cartItemCount + ' ' + __alloT('stem.money.items_in_cart', 'items in cart'))
                          ),
                          React.createElement('label', { className: 'block text-xs font-bold text-slate-700' },
                            __alloT('stem.money.about_how_much', 'About how much will the purchase cost?'),
                            React.createElement('div', { className: 'relative mt-1' },
                              React.createElement('span', { className: 'absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-black' }, cur.symbol),
                              React.createElement('input', { type: 'number', step: isJPY ? '1' : '0.01', value: checkoutEstimate, onChange: function (e) { upd('checkoutEstimate', e.target.value); upd('checkoutEstimateFb', null); }, 'aria-label': __alloT('stem.money.checkout_estimate', 'Estimated checkout total'), className: 'w-full rounded-xl border-2 border-sky-300 py-3 pl-9 pr-3 text-lg font-black text-sky-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200' })
                            )
                          ),
                          checkoutEstimateFb ? React.createElement('div', { role: 'status', 'aria-live': 'polite', className: 'rounded-xl border p-3 ' + (checkoutEstimateFb.ok ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50') },
                            React.createElement('p', { className: 'text-xs font-bold ' + (checkoutEstimateFb.ok ? 'text-emerald-800' : 'text-amber-800') }, checkoutEstimateFb.msg),
                            React.createElement('div', { className: 'mt-2 flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs' },
                              React.createElement('span', { className: 'text-slate-600' }, __alloT('stem.money.exact_register_total', 'Exact register total')),
                              React.createElement('span', { className: 'font-black text-emerald-700' }, fmt(cartGrand))
                            )
                          ) : null,
                          !checkoutEstimateFb ? React.createElement('button', { type: 'button', disabled: checkoutEstimate === '', onClick: function () {
                            var closeEstimate = checkoutEstimateDifference <= Math.max(isJPY ? 100 : 1, cartGrand * 0.1);
                            upd('checkoutEstimateFb', { ok: closeEstimate, msg: closeEstimate
                              ? __alloT('stem.money.estimate_close', '\u2705 Good estimate! You were within 10% of the total.')
                              : __alloT('stem.money.estimate_learning', '\uD83D\uDCA1 Compare your estimate with the exact total before paying.') });
                          }, className: 'w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-40' }, __alloT('stem.money.check_estimate', 'Check Estimate')) :
                          React.createElement('button', { type: 'button', onClick: function () { upd('checkoutStep', 'payment'); }, className: 'w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-black text-white hover:bg-teal-700' }, __alloT('stem.money.continue_to_payment', '\uD83D\uDCB3 Continue to Payment'))
                        ) : null,
                        checkoutStep === 'payment' ? React.createElement('div', { className: 'space-y-3' },
                          React.createElement('div', { className: 'flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2' },
                            React.createElement('span', { className: 'text-xs font-bold text-slate-600' }, __alloT('stem.money.amount_due', 'Amount due')),
                            React.createElement('span', { className: 'text-xl font-black text-emerald-700' }, fmt(cartGrand))
                          ),
                          React.createElement('div', { className: 'grid grid-cols-3 gap-2' },
                            [
                              { id: 'cash', icon: '\uD83D\uDCB5', label: __alloT('stem.money.cash', 'Cash') },
                              { id: 'debit', icon: '\uD83D\uDCB3', label: __alloT('stem.money.debit', 'Debit') },
                              { id: 'credit', icon: '\uD83C\uDFE6', label: __alloT('stem.money.credit', 'Credit') }
                            ].map(function (method) {
                              return React.createElement('button', { key: method.id, type: 'button', 'aria-pressed': checkoutPayment === method.id, onClick: function () { upd('checkoutPayment', method.id); upd('checkoutTender', null); upd('checkoutReturned', []); upd('checkoutChangeFb', null); }, className: 'rounded-xl border-2 px-2 py-3 text-center transition-all ' + (checkoutPayment === method.id ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-slate-200 bg-white hover:border-teal-300') },
                                React.createElement('span', { 'aria-hidden': true, className: 'text-2xl' }, method.icon),
                                React.createElement('p', { className: 'mt-1 text-[10px] font-black text-slate-700' }, method.label)
                              );
                            })
                          ),
                          checkoutPayment === 'cash' ? React.createElement('div', { className: 'rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2' },
                            React.createElement('p', { className: 'text-xs font-black text-amber-800' }, __alloT('stem.money.choose_cash_received', 'Choose the cash received from the customer')),
                            checkoutCashAdjustment !== 0 && React.createElement('p', { className: 'rounded-lg bg-white px-2 py-1.5 text-[10px] font-bold text-slate-600' }, __alloT('stem.money.cash_rounding_note', 'Cash total rounds to the smallest available denomination') + ': ' + fmt(cartGrand) + ' \u2192 ' + fmt(checkoutCashTotal)),
                            React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
                              checkoutTenderOptions.map(function (amount, amountIndex) {
                                return React.createElement('button', { key: 'tender-' + amountIndex, type: 'button', 'aria-pressed': checkoutTender === amount, onClick: function () { upd('checkoutTender', amount); upd('checkoutReturned', []); upd('checkoutChangeFb', null); }, className: 'rounded-lg border-2 px-2 py-2 text-xs font-black ' + (checkoutTender === amount ? 'border-amber-500 bg-amber-100 text-amber-900' : 'border-amber-200 bg-white text-slate-700 hover:border-amber-400') }, amountIndex === 0 ? __alloT('stem.money.exact_cash', 'Exact cash') + ' ' + fmt(amount) : fmt(amount));
                              })
                            )
                          ) : checkoutPayment ? React.createElement('p', { className: 'rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800' }, checkoutPayment === 'debit'
                            ? __alloT('stem.money.debit_note', 'Debit uses money already in a bank account. No cash change is returned.')
                            : __alloT('stem.money.credit_note', 'Credit borrows money. Paying the full statement balance avoids interest.')) : null,
                          React.createElement('button', { type: 'button', disabled: !checkoutPayment || (checkoutPayment === 'cash' && checkoutTender == null), onClick: function () {
                            if (checkoutPayment === 'cash') upd('checkoutStep', 'change');
                            else finishGroceryCheckout(checkoutPayment);
                          }, className: 'w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-black text-white hover:bg-teal-700 disabled:opacity-40' }, checkoutPayment === 'cash' ? __alloT('stem.money.continue_to_change', '\uD83D\uDCB5 Continue to Make Change') : __alloT('stem.money.pay_and_print', 'Pay & Print Receipt'))
                        ) : null,
                        checkoutStep === 'change' ? React.createElement('div', { className: 'space-y-3' },
                          React.createElement('div', { className: 'grid grid-cols-3 gap-2 text-center' },
                            React.createElement('div', { className: 'rounded-lg bg-slate-100 p-2' }, React.createElement('p', { className: 'text-[10px] font-bold text-slate-600' }, __alloT('stem.money.cash_total', 'Cash total')), React.createElement('p', { className: 'text-sm font-black text-slate-800' }, fmt(checkoutCashTotal))),
                            React.createElement('div', { className: 'rounded-lg bg-amber-50 p-2' }, React.createElement('p', { className: 'text-[10px] font-bold text-amber-700' }, __alloT('stem.money.cash_received', 'Cash received')), React.createElement('p', { className: 'text-sm font-black text-amber-800' }, fmt(checkoutTender || 0))),
                            React.createElement('div', { className: 'rounded-lg bg-emerald-50 p-2' }, React.createElement('p', { className: 'text-[10px] font-bold text-emerald-700' }, __alloT('stem.money.change_due', 'Change due')), React.createElement('p', { className: 'text-sm font-black text-emerald-800' }, fmt(checkoutChangeDue)))
                          ),
                          React.createElement('p', { className: 'rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 py-1.5 text-center text-[10px] font-mono font-bold text-slate-700' }, fmt(checkoutCashTotal) + ' + ' + fmt(checkoutChangeDue) + ' = ' + fmt(checkoutTender || 0)),
                          checkoutChangeDue > 0 ? React.createElement(React.Fragment, null,
                            React.createElement('div', { role: 'region', 'aria-label': __alloT('stem.money.cash_return_tray', 'Cash return tray'), className: 'rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-3' },
                              React.createElement('div', { className: 'flex items-center justify-between gap-2' },
                                React.createElement('p', { className: 'text-xs font-black text-amber-800' }, __alloT('stem.money.your_return_tray', '\uD83D\uDCB0 Your return tray')),
                                React.createElement('span', { className: 'text-sm font-black ' + (checkoutReturnedTotal === checkoutChangeDue ? 'text-emerald-700' : checkoutReturnedTotal > checkoutChangeDue ? 'text-red-600' : 'text-amber-800') }, fmt(checkoutReturnedTotal) + ' / ' + fmt(checkoutChangeDue))
                              ),
                              React.createElement('div', { className: 'mt-2 flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg bg-white p-2' },
                                checkoutReturnGroups.length ? checkoutReturnGroups.map(function (group) {
                                  return React.createElement('span', { key: 'return-' + group.value, className: 'rounded-full border px-2 py-1 text-[10px] font-black ' + (group.isBill ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-amber-300 bg-amber-100 text-amber-900') }, group.count + '\u00D7 ' + group.label);
                                }) : React.createElement('span', { className: 'w-full text-center text-[10px] font-bold text-slate-500' }, __alloT('stem.money.select_change_below', 'Select bills and coins below.'))
                              ),
                              checkoutReturned.length ? React.createElement('button', { type: 'button', onClick: function () { upd('checkoutReturned', checkoutReturned.slice(0, -1)); upd('checkoutChangeFb', null); }, className: 'mt-2 w-full text-[10px] font-bold text-slate-600 hover:text-slate-800' }, __alloT('stem.money.undo_last_piece', '\u21A9 Undo last piece')) : null
                            ),
                            React.createElement('div', { className: 'flex flex-wrap justify-center gap-1.5' },
                              checkoutReturnDenominations.map(function (denomination, denominationIndex) {
                                var wouldOvershoot = checkoutReturnedTotal + denomination.value > checkoutChangeDue + (1 / changeScale / 2);
                                return React.createElement('button', { key: 'checkout-denom-' + denominationIndex, type: 'button', disabled: wouldOvershoot || (checkoutChangeFb && checkoutChangeFb.ok), onClick: function () { upd('checkoutReturned', checkoutReturned.concat([denomination.value])); upd('checkoutChangeFb', null); }, className: 'min-w-14 rounded-lg border-2 px-2 py-2 text-[10px] font-black transition-all disabled:opacity-35 ' + (denomination.isBill ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-500' : 'border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-500') }, denomination.name + ' (' + fmt(denomination.value) + ')');
                              })
                            ),
                            checkoutChangeFb ? React.createElement('p', { role: 'status', 'aria-live': 'polite', className: 'rounded-lg px-3 py-2 text-xs font-bold ' + (checkoutChangeFb.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700') }, checkoutChangeFb.msg) : null,
                            !(checkoutChangeFb && checkoutChangeFb.ok) ? React.createElement('button', { type: 'button', disabled: !checkoutReturned.length, onClick: function () {
                              var correctReturn = Math.round(checkoutReturnedTotal * changeScale) === Math.round(checkoutChangeDue * changeScale);
                              upd('checkoutChangeFb', correctReturn
                                ? { ok: true, msg: __alloT('stem.money.change_correct', '\u2705 Correct change! The drawer balances.') }
                                : { ok: false, msg: __alloT('stem.money.change_try_again', '\u274C The return tray does not match the change due yet.') });
                            }, className: 'w-full rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white hover:bg-amber-700 disabled:opacity-40' }, __alloT('stem.money.check_returned_change', 'Check Returned Change')) :
                            React.createElement('button', { type: 'button', onClick: function () { finishGroceryCheckout('cash'); }, className: 'w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700' }, __alloT('stem.money.complete_and_print', '\u2705 Complete & Print Receipt'))
                          ) : React.createElement('div', { className: 'rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-center' },
                            React.createElement('p', { className: 'text-sm font-black text-emerald-800' }, __alloT('stem.money.exact_cash_no_change', '\u2705 Exact cash — no change is due.')),
                            React.createElement('button', { type: 'button', onClick: function () { finishGroceryCheckout('cash'); }, className: 'mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700' }, __alloT('stem.money.complete_and_print', '\u2705 Complete & Print Receipt'))
                          )
                        ) : null,
                        React.createElement('button', { type: 'button', onClick: resetGroceryCheckout, className: 'w-full rounded-lg px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700' }, __alloT('stem.money.cancel_checkout', 'Cancel checkout and keep cart'))
                      )
                    )
                  )
                )
              ),

              // ═══ WORD PROBLEMS TAB ═══
              tab === 'word' && React.createElement("div", { className: "bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-5 border border-violet-200" },
                React.createElement("h3", { className: "text-base font-bold text-violet-800 mb-2" }, __alloT('stem.money.money_word_problems', "\uD83D\uDCDD Money Word Problems")),
                React.createElement("p", { className: "text-xs text-violet-500 mb-4" }, "AI-generated problems at " + gc.label + " level using " + cur.flag + " " + cur.name),
                !d.wpProblem && !d.wpLoading
                  ? React.createElement("div", { className: "text-center py-8" },
                      React.createElement("button", { "aria-label": __alloT('stem.money.generate_word_problem', "Generate Word Problem"), onClick: genWordProblem,
                        className: "px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-xl hover:from-violet-600 hover:to-purple-600 transition-all shadow-lg text-sm"
                      }, __alloT('stem.money.generate_word_problem_2', "\u2728 Generate Word Problem"))
                    )
                  : d.wpLoading
                    ? React.createElement("div", { className: "text-center py-8" },
                        React.createElement("div", { className: "animate-spin text-3xl mb-2" }, "\u2699\uFE0F"),
                        React.createElement("p", { className: "text-xs text-violet-500 font-bold" }, __alloT('stem.money.generating_problem', "Generating problem..."))
                      )
                    : React.createElement("div", { className: "space-y-4" },
                        React.createElement("div", { className: "bg-white rounded-xl p-4 shadow-sm border border-violet-100" },
                          d.wpProblem.category && React.createElement("span", { className: "inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-600 mb-2" }, d.wpProblem.category.toUpperCase()),
                          React.createElement("p", { className: "text-sm text-slate-700 leading-relaxed" }, d.wpProblem.problem)
                        ),
                        d.wpProblem.hint && React.createElement("button", { onClick: function () { upd('wpShowHint', !d.wpShowHint); },
                          className: "transition-colors text-xs font-bold text-amber-500 hover:text-amber-700"
                        }, d.wpShowHint ? '\uD83D\uDCA1 Hide Hint' : '\uD83D\uDCA1 Show Hint'),
                        d.wpShowHint && React.createElement("p", { className: "text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200" }, d.wpProblem.hint),
                        React.createElement("div", { className: "flex items-center gap-3" },
                          React.createElement("input", { type: "number", step: isJPY ? "1" : "0.01", placeholder: __alloT('stem.money.your_answer_2', "Your answer..."),
                            'aria-label': __alloT('stem.money.word_problem_answer', 'Word problem answer'),
                            value: d.wpAnswer !== null && d.wpAnswer !== undefined ? d.wpAnswer : '',
                            onChange: function (e) { upd('wpAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); },
                            className: "px-4 py-2 border border-slate-400 rounded-xl text-sm font-bold w-36 focus:ring-2 focus:ring-violet-400 outline-none"
                          }),
                          React.createElement("button", { "aria-label": __alloT('stem.money.check_5', "Check"), onClick: function () {
                              var correct = d.wpProblem.answer;
                              var userAns = d.wpAnswer;
                              var isRight = typeof correct === 'number' && typeof userAns === 'number' && Math.abs(userAns - correct) < (correct * 0.02 + 0.01);
                              upd('wpFeedback', isRight ? { ok: true, msg: '\u2705 ' + t('stem.dissection.correct') } : { ok: false, msg: '\u274C The answer is ' + (typeof correct === 'number' ? fmt(correct) : correct) });
                              if (isRight && typeof addXP === 'function') addXP(25, 'Money Math: Word problem solved');
                            },
                            className: "px-5 py-2 bg-violet-700 text-white font-bold rounded-xl hover:bg-violet-600 transition-all text-sm"
                          }, __alloT('stem.money.check_6', "\u2714 Check"))
                        ),
                        d.wpFeedback && React.createElement("p", { className: "text-sm font-bold " + (d.wpFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.wpFeedback.msg),
                        d.wpFeedback && !d.wpFeedback.ok && d.wpProblem.explanation && React.createElement("div", { className: "bg-slate-50 rounded-xl p-3 border border-slate-400" },
                          React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1" }, __alloT('stem.money.solution', "Solution")),
                          React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed whitespace-pre-line" }, d.wpProblem.explanation)
                        ),
                        React.createElement("button", { "aria-label": __alloT('stem.money.new_problem', "New Problem"), onClick: genWordProblem,
                          className: "px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs"
                        }, __alloT('stem.money.new_problem_2', "\u21BB New Problem"))
                      )
                  )
              ),

              // ═══ CURRENCY EXCHANGE TAB ═══
              tab === 'exchange' && React.createElement("div", { className: "bg-gradient-to-br from-sky-50 to-cyan-50 rounded-xl p-5 border border-sky-200" },
                React.createElement("h3", { className: "text-base font-bold text-sky-800 mb-2" }, __alloT('stem.money.currency_exchange_3', "\uD83C\uDF0D Currency Exchange")),
                React.createElement("p", { className: "text-xs text-sky-500 mb-4" }, __alloT('stem.money.practice_converting_between_world_curr', "Practice converting between world currencies (approximate rates)")),
                // Exchange rate reference
                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-sky-100 mb-4" },
                  React.createElement("p", { className: "text-[11px] font-bold text-sky-400 uppercase mb-2" }, __alloT('stem.money.reference_rates_vs_1_usd', "Reference Rates (vs 1 USD)")),
                  React.createElement("div", { className: "flex flex-wrap gap-2" },
                    Object.entries(CURRENCIES).map(function (entry) {
                      return React.createElement("span", { key: entry[0], className: "text-[11px] font-bold px-2 py-1 rounded-full " + (entry[0] === currency ? 'bg-sky-200 text-sky-800' : 'bg-slate-100 text-slate-600') },
                        entry[1].flag + ' ' + entry[0] + ' = ' + RATES[entry[0]].toFixed(entry[0] === 'JPY' || entry[0] === 'INR' ? 1 : 2)
                      );
                    })
                  )
                ),
                // Problem area
                !d.exchFrom
                  ? React.createElement("div", { className: "text-center py-6" },
                      React.createElement("button", { "aria-label": __alloT('stem.money.generate_conversion_problem', "Generate Conversion Problem"), onClick: genExchangeProblem,
                        className: "px-6 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold rounded-xl hover:from-sky-600 hover:to-cyan-600 transition-all shadow-lg text-sm"
                      }, __alloT('stem.money.generate_conversion_problem_2', "\u2728 Generate Conversion Problem"))
                    )
                  : React.createElement("div", { className: "space-y-4" },
                      React.createElement("div", { className: "bg-white rounded-xl p-4 shadow-sm border border-sky-100 text-center" },
                        React.createElement("p", { className: "text-sm text-slate-600 mb-2" }, "Convert:"),
                        React.createElement("div", { className: "flex items-center justify-center gap-3 flex-wrap" },
                          React.createElement("div", { className: "bg-sky-100 rounded-xl px-4 py-2" },
                            React.createElement("p", { className: "text-2xl font-black text-sky-700" }, CURRENCIES[d.exchFrom].symbol + (d.exchAmount || 0).toLocaleString()),
                            React.createElement("p", { className: "text-xs text-sky-500" }, CURRENCIES[d.exchFrom].flag + ' ' + d.exchFrom)
                          ),
                          React.createElement("span", { className: "text-xl text-slate-600 font-bold" }, "\u2192"),
                          React.createElement("div", { className: "bg-emerald-100 rounded-xl px-4 py-2" },
                            React.createElement("p", { className: "text-2xl font-black text-emerald-700" }, CURRENCIES[d.exchTo].symbol + '?'),
                            React.createElement("p", { className: "text-xs text-emerald-500" }, CURRENCIES[d.exchTo].flag + ' ' + d.exchTo)
                          )
                        )
                      ),
                      React.createElement("div", { className: "flex items-center gap-3" },
                        React.createElement("input", { type: "number", step: "0.01", placeholder: CURRENCIES[d.exchTo].symbol + "...",
                          'aria-label': __alloT('stem.money.currency_exchange_answer', 'Currency exchange answer'),
                          value: d.exchAnswer !== null && d.exchAnswer !== undefined ? d.exchAnswer : '',
                          onChange: function (e) { upd('exchAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); },
                          className: "px-4 py-2 border border-slate-400 rounded-xl text-sm font-bold w-40 focus:ring-2 focus:ring-sky-400 outline-none"
                        }),
                        React.createElement("button", { "aria-label": __alloT('stem.money.check_7', "Check"), onClick: function () {
                            var correct = d.exchCorrect;
                            var userAns = d.exchAnswer;
                            var tolerance = Math.abs(correct) * 0.05 + 0.01;
                            var isRight = typeof userAns === 'number' && Math.abs(userAns - correct) < tolerance;
                            upd('exchFeedback', isRight
                              ? { ok: true, msg: '\u2705 Correct! ' + CURRENCIES[d.exchFrom].symbol + (d.exchAmount).toLocaleString() + ' ' + d.exchFrom + ' \u2248 ' + CURRENCIES[d.exchTo].symbol + correct.toLocaleString(undefined, {maximumFractionDigits: 2}) + ' ' + d.exchTo }
                              : { ok: false, msg: '\u274C The answer is approximately ' + CURRENCIES[d.exchTo].symbol + correct.toLocaleString(undefined, {maximumFractionDigits: 2}) + ' ' + d.exchTo }
                            );
                            if (isRight && typeof addXP === 'function') addXP(20, 'Money Math: Currency conversion');
                            if (isRight && typeof awardStemXP === 'function') awardStemXP('moneyMath', 5, 'currency conversion');
                          },
                          className: "px-5 py-2 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition-all text-sm"
                        }, __alloT('stem.money.check_8', "\u2714 Check"))
                      ),
                      d.exchFeedback && React.createElement("p", { className: "text-sm font-bold " + (d.exchFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.exchFeedback.msg),
                      React.createElement("button", { "aria-label": __alloT('stem.money.next_problem_3', "Next Problem"), onClick: genExchangeProblem,
                        className: "px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs"
                      }, __alloT('stem.money.next_problem_4', "\u21BB Next Problem"))
                    )
              ),

              // ═══ TIPS & DISCOUNTS TAB ═══
              tab === 'tips' && React.createElement("div", { className: "space-y-4" },
                React.createElement("div", { className: "bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-5 border border-pink-200" },
                  React.createElement("h3", { className: "text-base font-bold text-pink-800 mb-3" }, __alloT('stem.money.tips_discounts_3', "\uD83D\uDCB3 Tips & Discounts")),
                  React.createElement("div", { className: "flex gap-2 mb-4" },
                    React.createElement("button", { onClick: genTipProblem, className: "flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all " + ((d.tipMode || 'tip') === 'tip' ? 'bg-pink-600 text-white shadow-md' : 'bg-white text-pink-600 border border-pink-600 hover:bg-pink-50') }, __alloT('stem.money.tip_calculator', "\uD83C\uDF7D Tip Calculator")),
                    React.createElement("button", { "aria-label": __alloT('stem.money.discount_shopping', "Discount Shopping"), onClick: genDiscountProblem, className: "flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all " + (d.tipMode === 'discount' ? 'bg-pink-600 text-white shadow-md' : 'bg-white text-pink-600 border border-pink-600 hover:bg-pink-50') }, __alloT('stem.money.discount_shopping_2', "\uD83C\uDFF7\uFE0F Discount Shopping"))
                  ),
                  // Tip mode
                  (d.tipMode || 'tip') === 'tip' && (!d.tipBill
                    ? React.createElement("div", { className: "text-center py-6" },
                        React.createElement("p", { className: "text-sm text-slate-600 mb-3" }, __alloT('stem.money.practice_calculating_restaurant_tips_a', "Practice calculating restaurant tips and splitting bills")),
                        React.createElement("button", { "aria-label": __alloT('stem.money.generate_tip_problem', "Generate Tip Problem"), onClick: genTipProblem, className: "px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg text-sm" }, __alloT('stem.money.generate_tip_problem_2', "\u2728 Generate Tip Problem"))
                      )
                    : React.createElement("div", { className: "space-y-4" },
                        React.createElement("div", { className: "bg-white rounded-xl p-4 shadow-sm border border-pink-100" },
                          React.createElement("div", { className: "grid grid-cols-3 gap-3 text-center" },
                            React.createElement("div", null, React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.bill_total', "Bill Total")), React.createElement("p", { className: "text-xl font-black text-pink-600" }, fmt(d.tipBill))),
                            React.createElement("div", null, React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.tip', "Tip %")), React.createElement("p", { className: "text-xl font-black text-amber-500" }, d.tipPct + '%')),
                            React.createElement("div", null, React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.diners', "Diners")), React.createElement("p", { className: "text-xl font-black text-blue-500" }, d.tipDiners))
                          ),
                          React.createElement("p", { className: "text-xs text-center text-slate-600 mt-3" }, "How much does each person pay (bill + tip, split " + d.tipDiners + " ways)?")
                        ),
                        React.createElement("div", { className: "flex items-center gap-3" },
                          React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: __alloT('stem.money.per_person', 'Per person...'),
                            'aria-label': __alloT('stem.money.tip_per_person_answer', 'Tip per person answer'),
                            value: d.tipAnswer != null ? d.tipAnswer : '', onChange: function (e) { upd('tipAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); },
                            className: "px-4 py-2 border border-slate-400 rounded-xl text-sm font-bold w-36 focus:ring-2 focus:ring-pink-400 outline-none"
                          }),
                          React.createElement("button", { "aria-label": __alloT('stem.money.check_9', "Check"), onClick: function () {
                              var tipAmt = d.tipBill * (d.tipPct / 100);
                              var totalWithTip = d.tipBill + tipAmt;
                              var perPerson = Math.round(totalWithTip / d.tipDiners * 100) / 100;
                              var isRight = typeof d.tipAnswer === 'number' && Math.abs(d.tipAnswer - perPerson) < 0.02;
                              upd('tipFeedback', isRight
                                ? { ok: true, msg: '\u2705 Correct! Tip: ' + fmt(tipAmt) + ' \u2192 Total: ' + fmt(totalWithTip) + ' \u00F7 ' + d.tipDiners + ' = ' + fmt(perPerson) + '/person' }
                                : { ok: false, msg: '\u274C Tip: ' + fmt(tipAmt) + ' \u2192 Total: ' + fmt(totalWithTip) + ' \u00F7 ' + d.tipDiners + ' = ' + fmt(perPerson) + '/person' }
                              );
                              if (isRight && typeof addXP === 'function') addXP(15, 'Money Math: Tip calculation');
                            }, className: "px-5 py-2 bg-pink-700 text-white font-bold rounded-xl hover:bg-pink-600 transition-all text-sm"
                          }, __alloT('stem.money.check_10', "\u2714 Check"))
                        ),
                        d.tipFeedback && React.createElement("p", { className: "text-sm font-bold " + (d.tipFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.tipFeedback.msg),
                        React.createElement("button", { "aria-label": __alloT('stem.money.next_problem_5', "Next Problem"), onClick: genTipProblem, className: "px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs" }, __alloT('stem.money.next_problem_6', "\u21BB Next Problem"))
                      )
                  ),
                  // Discount mode
                  d.tipMode === 'discount' && (!d.discOriginal
                    ? React.createElement("div", { className: "text-center py-6" },
                        React.createElement("p", { className: "text-sm text-slate-600 mb-3" }, "Calculate sale prices with percentage discounts" + (gc.includePercent ? ' and coupons' : '')),
                        React.createElement("button", { "aria-label": __alloT('stem.money.generate_discount_problem', "Generate Discount Problem"), onClick: genDiscountProblem, className: "px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg text-sm" }, __alloT('stem.money.generate_discount_problem_2', "\u2728 Generate Discount Problem"))
                      )
                    : React.createElement("div", { className: "space-y-4" },
                        React.createElement("div", { className: "bg-white rounded-xl p-4 shadow-sm border border-pink-100" },
                          React.createElement("div", { className: "text-center" },
                            React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.original_price', "Original Price")),
                            React.createElement("p", { className: "text-2xl font-black text-slate-600 line-through" }, fmt(d.discOriginal)),
                            React.createElement("div", { className: "flex items-center justify-center gap-2 mt-2" },
                              React.createElement("span", { className: "px-3 py-1 bg-red-100 text-red-600 text-sm font-black rounded-full" }, d.discPercent + '% OFF'),
                              d.discCoupon > 0 && React.createElement("span", { className: "px-3 py-1 bg-amber-100 text-amber-800 text-sm font-black rounded-full" }, '+ ' + fmt(d.discCoupon) + ' coupon')
                            ),
                            React.createElement("p", { className: "text-xs text-slate-600 mt-2" }, "What is the final price" + (d.discCoupon > 0 ? ' after discount AND coupon' : '') + '?')
                          )
                        ),
                        React.createElement("div", { className: "flex items-center gap-3" },
                          React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: __alloT('stem.money.sale_price_2', 'Sale price...'),
                            'aria-label': __alloT('stem.money.sale_price_answer', 'Sale price answer'),
                            value: d.discAnswer != null ? d.discAnswer : '', onChange: function (e) { upd('discAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); },
                            className: "px-4 py-2 border border-slate-400 rounded-xl text-sm font-bold w-36 focus:ring-2 focus:ring-pink-400 outline-none"
                          }),
                          React.createElement("button", { "aria-label": __alloT('stem.money.check_11', "Check"), onClick: function () {
                              var discounted = d.discOriginal * (1 - d.discPercent / 100);
                              var final_ = Math.round((discounted - (d.discCoupon || 0)) * 100) / 100;
                              if (final_ < 0) final_ = 0;
                              var isRight = typeof d.discAnswer === 'number' && Math.abs(d.discAnswer - final_) < 0.02;
                              upd('discFeedback', isRight
                                ? { ok: true, msg: '\u2705 Correct! ' + fmt(d.discOriginal) + ' \u2212 ' + d.discPercent + '% = ' + fmt(discounted) + (d.discCoupon > 0 ? ' \u2212 ' + fmt(d.discCoupon) + ' coupon' : '') + ' = ' + fmt(final_) }
                                : { ok: false, msg: '\u274C The sale price is ' + fmt(final_) + '. (' + fmt(d.discOriginal) + ' \u00D7 ' + (100 - d.discPercent) + '%)' + (d.discCoupon > 0 ? ' \u2212 ' + fmt(d.discCoupon) : '') }
                              );
                              if (isRight && typeof addXP === 'function') addXP(15, 'Money Math: Discount calculation');
                            }, className: "px-5 py-2 bg-pink-700 text-white font-bold rounded-xl hover:bg-pink-600 transition-all text-sm"
                          }, __alloT('stem.money.check_12', "\u2714 Check"))
                        ),
                        d.discFeedback && React.createElement("p", { className: "text-sm font-bold " + (d.discFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.discFeedback.msg),
                        React.createElement("button", { "aria-label": __alloT('stem.money.next_problem_7', "Next Problem"), onClick: genDiscountProblem, className: "px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs" }, __alloT('stem.money.next_problem_8', "\u21BB Next Problem"))
                      )
                  )
                )
              ),

              // ═══ BUDGET PLANNER TAB ═══
              tab === 'budget' && React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-200" },
                React.createElement("h3", { className: "text-base font-bold text-indigo-800 mb-2" }, __alloT('stem.money.budget_planner', "\uD83D\uDCCA Budget Planner")),
                React.createElement("p", { className: "text-xs text-indigo-500 mb-4" }, __alloT('stem.money.allocate_your_monthly_income_across_sp', "Allocate your monthly income across spending categories")),
                // Income input
                React.createElement("div", { className: "flex items-center gap-3 mb-4" },
                  React.createElement("label", { className: "text-sm font-bold text-slate-600" }, __alloT('stem.money.monthly_income', "Monthly Income:")),
                  React.createElement("input", { type: "number", value: budgetIncome,
                    'aria-label': __alloT('stem.money.monthly_income_2', 'Monthly income'),
                    onChange: function (e) { upd('budgetIncome', parseFloat(e.target.value) || 0); upd('budgetEventChoice', null); upd('budgetEventFb', null); upd('budgetEventResolved', false); },
                    className: "px-4 py-2 border border-slate-400 rounded-xl text-sm font-bold w-40 focus:ring-2 focus:ring-indigo-400 outline-none"
                  }),
                  React.createElement("span", { className: "text-xs font-bold " + (budgetUsed === 100 ? 'text-emerald-600' : budgetUsed > 100 ? 'text-red-500' : 'text-amber-500') }, budgetUsed + '% allocated' + (budgetUsed !== 100 ? ' (' + (100 - budgetUsed) + '% remaining)' : ' \u2714'))
                ),
                // Category sliders
                React.createElement("div", { className: "space-y-2 mb-4" },
                  budgetCats.map(function (cat, ci) {
                    var amount = budgetIncome * (cat.pct / 100);
                    return React.createElement("div", { key: ci, className: "bg-white rounded-lg p-3 border border-slate-100" },
                      React.createElement("div", { className: "flex items-center justify-between mb-1" },
                        React.createElement("span", { className: "text-xs font-bold text-slate-700" }, cat.name),
                        React.createElement("div", { className: "flex items-center gap-2" },
                          React.createElement("span", { className: "text-xs font-black", style: { color: cat.color } }, cat.pct + '%'),
                          React.createElement("span", { className: "text-xs font-bold text-slate-600" }, fmt(amount))
                        )
                      ),
                      React.createElement("input", { type: "range", min: 0, max: 50, value: cat.pct,
                        'aria-label': cat.name + ' budget percentage',
                        onChange: function (e) {
                          var newCats = budgetCats.map(function (c, idx) { return idx === ci ? Object.assign({}, c, { pct: parseInt(e.target.value) }) : c; });
                          upd('budgetCats', newCats); upd('budgetEventChoice', null); upd('budgetEventFb', null); upd('budgetEventResolved', false);
                        },
                        className: "w-full h-2 rounded-full appearance-none cursor-pointer",
                        style: { accentColor: cat.color }
                      }),
                      React.createElement("div", { className: "h-2 rounded-full mt-1 overflow-hidden bg-slate-100" },
                        React.createElement("div", { style: { width: cat.pct + '%', height: '100%', background: cat.color, borderRadius: '9999px', transition: 'width 0.2s' } })
                      )
                    );
                  })
                ),
                // Budget summary
                React.createElement("div", { className: "bg-white rounded-xl p-4 border border-indigo-100" },
                  React.createElement("p", { className: "text-xs font-bold text-slate-600 uppercase mb-2" }, __alloT('stem.money.budget_summary', "Budget Summary")),
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2" },
                    budgetCats.map(function (cat, ci) {
                      return React.createElement("div", { key: ci, className: "text-center p-2 rounded-lg", style: { background: cat.color + '15' } },
                        React.createElement("p", { className: "text-lg" }, cat.name.split(' ')[0]),
                        React.createElement("p", { className: "text-xs font-black", style: { color: cat.color } }, fmt(budgetIncome * cat.pct / 100)),
                        React.createElement("p", { className: "text-[11px] text-slate-600" }, cat.pct + '%')
                      );
                    })
                  ),
                  budgetUsed > 100 && React.createElement("p", { className: "text-xs font-bold text-red-500 text-center mt-3" }, "\u26A0\uFE0F Over budget by " + (budgetUsed - 100) + '%! Reduce some categories.'),
                  budgetUsed === 100 && React.createElement("p", { className: "text-xs font-bold text-emerald-500 text-center mt-3" }, __alloT('stem.money.perfectly_balanced_budget', "\u2705 Perfectly balanced budget!"))
                ),

                // Visual monthly snapshot
                React.createElement('div', { className: 'mt-4 rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm' },
                  React.createElement('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-3' },
                    React.createElement('div', null,
                      React.createElement('p', { className: 'text-[10px] font-black uppercase tracking-widest text-indigo-500' }, __alloT('stem.money.monthly_snapshot', 'Monthly snapshot')),
                      React.createElement('p', { className: 'text-sm font-black text-slate-800' }, __alloT('stem.money.where_income_goes', 'Where your income goes'))
                    ),
                    React.createElement('span', { className: 'rounded-full border px-2.5 py-1 text-[10px] font-black ' + (budgetReadiness.color === 'emerald' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : budgetReadiness.color === 'amber' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-rose-300 bg-rose-50 text-rose-800') }, budgetReadiness.icon + ' ' + budgetReadiness.label)
                  ),
                  React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3' },
                    [
                      { label: __alloT('stem.money.income', 'Income'), value: budgetIncome, tone: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
                      { label: __alloT('stem.money.essentials', 'Essentials'), value: budgetEssentialAmount, tone: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                      { label: __alloT('stem.money.flexible', 'Flexible'), value: budgetFlexibleAmount, tone: 'text-pink-700', bg: 'bg-pink-50 border-pink-200' },
                      { label: __alloT('stem.money.savings_buffer', 'Savings buffer'), value: budgetSavingsAmount, tone: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' }
                    ].map(function (metric) {
                      return React.createElement('div', { key: metric.label, className: 'rounded-xl border p-2 text-center ' + metric.bg },
                        React.createElement('p', { className: 'text-[10px] font-bold text-slate-600' }, metric.label),
                        React.createElement('p', { className: 'text-sm font-black ' + metric.tone }, fmt(metric.value))
                      );
                    })
                  ),
                  React.createElement('div', { role: 'img', 'aria-label': __alloT('stem.money.budget_allocation_chart', 'Budget allocation chart') + ': ' + budgetCats.map(function (cat) { return cat.name + ' ' + cat.pct + '%'; }).join(', '), className: 'overflow-hidden rounded-full bg-slate-100 h-5 flex border border-slate-200' },
                    budgetCats.map(function (cat, catIndex) {
                      return React.createElement('div', { key: 'budget-segment-' + catIndex, title: cat.name + ' ' + cat.pct + '%', style: { width: (cat.pct / Math.max(100, budgetUsed) * 100) + '%', backgroundColor: cat.color }, className: 'h-full border-r border-white/50 last:border-r-0' });
                    })
                  ),
                  React.createElement('div', { className: 'mt-2 flex flex-wrap gap-x-3 gap-y-1' },
                    budgetCats.map(function (cat, catIndex) {
                      return React.createElement('span', { key: 'budget-key-' + catIndex, className: 'inline-flex items-center gap-1 text-[10px] font-bold text-slate-600' },
                        React.createElement('i', { 'aria-hidden': true, className: 'h-2 w-2 rounded-full', style: { backgroundColor: cat.color } }), cat.name.replace(/^[^\s]+\s/, '') + ' ' + cat.pct + '%'
                      );
                    })
                  ),
                  budgetUnallocatedAmount !== 0 && React.createElement('p', { className: 'mt-3 rounded-lg px-3 py-2 text-xs font-bold ' + (budgetUnallocatedAmount > 0 ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700') }, budgetUnallocatedAmount > 0
                    ? __alloT('stem.money.unallocated_income', 'Still unallocated') + ': ' + fmt(budgetUnallocatedAmount)
                    : __alloT('stem.money.over_budget_amount', 'Over budget by') + ': ' + fmt(Math.abs(budgetUnallocatedAmount)))
                ),

                // Unexpected expense decision simulator
                React.createElement('div', { className: 'mt-4 rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 shadow-sm' },
                  React.createElement('div', { className: 'flex flex-wrap items-start justify-between gap-2 mb-3' },
                    React.createElement('div', null,
                      React.createElement('p', { className: 'text-[10px] font-black uppercase tracking-widest text-violet-500' }, __alloT('stem.money.real_life_budget_lab', 'Real-life budget lab')),
                      React.createElement('h4', { className: 'text-sm font-black text-violet-900' }, __alloT('stem.money.unexpected_expense', '\u26A1 Unexpected Expense')),
                      React.createElement('p', { className: 'text-xs text-violet-700' }, __alloT('stem.money.choose_tradeoff', 'Choose a response and see the tradeoff.'))
                    ),
                    React.createElement('div', { className: 'rounded-xl border border-violet-200 bg-white px-3 py-2 text-center' },
                      React.createElement('p', { className: 'text-[10px] font-bold text-violet-500' }, __alloT('stem.money.resilience_score', 'Resilience score')),
                      React.createElement('p', { className: 'text-lg font-black text-violet-800' }, budgetEventScore, React.createElement('span', { className: 'text-xs text-violet-400' }, ' pts'))
                    )
                  ),
                  !budgetEvent ? React.createElement('div', { className: 'rounded-xl border border-dashed border-violet-300 bg-white/80 p-5 text-center' },
                    React.createElement('div', { 'aria-hidden': true, className: 'text-4xl mb-2' }, '\uD83C\uDFB2'),
                    React.createElement('p', { className: 'text-sm font-black text-slate-800' }, __alloT('stem.money.test_your_budget', 'Test your monthly budget')),
                    React.createElement('p', { className: 'mx-auto mt-1 max-w-md text-xs text-slate-600' }, budgetUsed === 100
                      ? __alloT('stem.money.event_ready', 'Draw a surprise expense, then decide how to handle it.')
                      : __alloT('stem.money.balance_first', 'Allocate exactly 100% of income before drawing an expense.')),
                    React.createElement('button', { type: 'button', disabled: budgetUsed !== 100 || budgetIncome <= 0, onClick: generateBudgetEvent, className: 'mt-3 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-black text-white shadow-md hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40' }, __alloT('stem.money.draw_expense', '\u26A1 Draw an Expense'))
                  ) : React.createElement('div', { className: 'space-y-3' },
                    React.createElement('div', { className: 'relative overflow-hidden rounded-2xl border border-violet-200 bg-white p-4 shadow-sm' },
                      React.createElement('div', { 'aria-hidden': true, className: 'absolute -right-3 -top-4 text-7xl opacity-10' }, budgetEvent.icon),
                      React.createElement('div', { className: 'relative flex items-center gap-3' },
                        React.createElement('div', { 'aria-hidden': true, className: 'flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-3xl' }, budgetEvent.icon),
                        React.createElement('div', { className: 'min-w-0 flex-1' },
                          React.createElement('p', { className: 'text-sm font-black text-slate-800' }, budgetEvent.label),
                          React.createElement('p', { className: 'text-xs text-slate-600' }, budgetEvent.detail),
                          React.createElement('p', { className: 'mt-1 text-2xl font-black text-violet-800' }, fmt(budgetEventCost))
                        )
                      )
                    ),
                    budgetUsed !== 100 && React.createElement('p', { className: 'rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700' }, __alloT('stem.money.rebalance_before_decision', 'Rebalance the plan to exactly 100% before choosing.')),
                    React.createElement('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-2' },
                      [
                        { id: 'savings', icon: '\uD83D\uDEE1\uFE0F', label: __alloT('stem.money.use_savings', 'Use savings'), amount: budgetSavingsAmount, note: __alloT('stem.money.available', 'available') },
                        { id: 'flexible', icon: '\u2702\uFE0F', label: __alloT('stem.money.cut_flexible', 'Cut flexible spending'), amount: budgetFlexibleAmount, note: __alloT('stem.money.available', 'available') },
                        { id: 'borrow', icon: '\uD83C\uDFE6', label: __alloT('stem.money.borrow', 'Borrow'), amount: budgetBorrowCost, note: __alloT('stem.money.repay_next_month', 'repay next month') }
                      ].map(function (option) {
                        var selected = budgetEventChoice === option.id;
                        return React.createElement('button', { key: option.id, type: 'button', disabled: budgetEventResolved || budgetUsed !== 100, 'aria-pressed': selected, onClick: function () { chooseBudgetEventResponse(option.id); }, className: 'rounded-xl border-2 p-3 text-left transition-all disabled:cursor-not-allowed ' + (selected ? 'border-violet-500 bg-violet-100 shadow-md' : 'border-violet-100 bg-white hover:border-violet-300') + (budgetEventResolved && !selected ? ' opacity-45' : '') },
                          React.createElement('span', { 'aria-hidden': true, className: 'text-2xl' }, option.icon),
                          React.createElement('p', { className: 'mt-1 text-xs font-black text-slate-800' }, option.label),
                          React.createElement('p', { className: 'text-sm font-black ' + (option.id === 'borrow' ? 'text-rose-700' : 'text-violet-700') }, fmt(option.amount)),
                          React.createElement('p', { className: 'text-[10px] font-bold text-slate-600' }, option.note)
                        );
                      })
                    ),
                    budgetEventFb && React.createElement('div', { role: 'status', 'aria-live': 'polite', className: 'rounded-xl border p-3 ' + (budgetEventFb.ok ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50') },
                      React.createElement('div', { className: 'flex items-start justify-between gap-2' },
                        React.createElement('p', { className: 'text-xs font-bold ' + (budgetEventFb.ok ? 'text-emerald-800' : 'text-rose-700') }, budgetEventFb.message),
                        budgetEventFb.ok && React.createElement('span', { className: 'shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-violet-700' }, '+' + budgetEventFb.points + ' pts')
                      ),
                      React.createElement('p', { className: 'mt-2 rounded-lg bg-white px-2 py-1.5 text-center text-xs font-mono font-black text-slate-700' }, budgetEventFb.impact)
                    ),
                    budgetEventResolved ? React.createElement('button', { type: 'button', onClick: generateBudgetEvent, className: 'w-full rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-black text-white hover:bg-violet-600' }, __alloT('stem.money.next_expense', '\u27A1 Next Expense')) : budgetEventFb && !budgetEventFb.ok ? React.createElement('p', { className: 'text-center text-xs font-bold text-rose-700' }, __alloT('stem.money.try_another_response', 'Try another response that the current budget can cover.')) : null
                  ),
                  budgetEventHistory.length ? React.createElement('div', { className: 'mt-3 border-t border-violet-200 pt-3' },
                    React.createElement('div', { className: 'flex items-center justify-between gap-2 mb-2' },
                      React.createElement('p', { className: 'text-[10px] font-black uppercase tracking-wide text-violet-600' }, __alloT('stem.money.recent_decisions', 'Recent decisions')),
                      React.createElement('span', { className: 'text-[10px] font-bold text-violet-500' }, budgetEventHistory.length + ' / 5')
                    ),
                    React.createElement('div', { role: 'list', className: 'flex flex-wrap gap-2' },
                      budgetEventHistory.map(function (entry, historyIndex) {
                        return React.createElement('div', { key: 'budget-history-' + historyIndex, role: 'listitem', title: entry.label, className: 'flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-2 py-1' },
                          React.createElement('span', { 'aria-hidden': true }, entry.icon),
                          React.createElement('span', { className: 'text-[10px] font-black text-violet-800' }, '+' + entry.points)
                        );
                      })
                    )
                  ) : null
                )
              ),

              // ═══ CHALLENGES TAB ═══
              tab === 'cents' && React.createElement("div", { className: "space-y-4" },
                React.createElement("h3", { className: "text-base font-bold text-amber-800 mb-2" }, __alloT('stem.money.common_cents_3', "\uD83E\uDE99 Common Cents")),
                // Fewest Coins challenge
                React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200" },
                  React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h4", { className: "text-sm font-bold text-amber-800" }, __alloT('stem.money.fewest_coins_bills_challenge', "\uD83E\uDE99 Fewest Coins & Bills Challenge")),
                    React.createElement("button", { "aria-label": __alloT('stem.money.make_this_amount_with_the_fewest_coins', "Make this amount with the FEWEST coins & bills"), onClick: genFewestCoinsChallenge, className: "px-3 py-1.5 bg-amber-700 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all" }, !d.fcTarget ? '\u2728 Start' : '\u21BB New')
                  ),
                  d.fcTarget && React.createElement("div", { className: "space-y-3" },
                    React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border border-amber-100" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.make_this_amount_with_the_fewest_coins_2', "Make this amount with the FEWEST coins & bills")),
                      React.createElement("p", { className: "text-3xl font-black text-amber-600" }, fmt(d.fcTarget)),
                      React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, "Optimal solution uses " + d.fcOptimal + " pieces")
                    ),
                    // Quick denomination buttons
                    React.createElement("div", { className: "flex flex-wrap gap-1 justify-center" },
                      cur.bills.slice().reverse().concat(cur.coins.slice().reverse()).map(function (item, idx) {
                        return React.createElement("button", { key: idx, onClick: function () {
                          upd('fcPlaced', [].concat(d.fcPlaced || [], [item.value]));
                        }, className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-white border border-amber-600 hover:bg-amber-50 transition-all" }, (item.name || fmt(item.value)));
                      })
                    ),
                    // Placed items
                    (d.fcPlaced || []).length > 0 && React.createElement("div", { className: "bg-white rounded-lg p-3 border border-slate-400" },
                      React.createElement("div", { className: "flex items-center justify-between mb-2" },
                        React.createElement("span", { className: "text-xs font-bold text-slate-600" }, "Your selection: " + (d.fcPlaced || []).length + " pieces"),
                        React.createElement("span", { className: "text-sm font-black text-emerald-600" }, fmt((d.fcPlaced || []).reduce(function (s, v) { return s + v; }, 0)))
                      ),
                      React.createElement("div", { className: "flex flex-wrap gap-1 mb-2" },
                        (d.fcPlaced || []).map(function (v, pi) {
                          return React.createElement("button", { key: pi, onClick: function () {
                            upd('fcPlaced', (d.fcPlaced || []).filter(function (_, idx) { return idx !== pi; }));
                          }, className: "px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[11px] font-bold hover:bg-red-100 hover:text-red-600 transition-all" }, fmt(v) + ' \u2715');
                        })
                      ),
                      React.createElement("div", { className: "flex gap-2" },
                        React.createElement("button", { "aria-label": __alloT('stem.money.check_13', "Check"), onClick: function () {
                          var total = (d.fcPlaced || []).reduce(function (s, v) { return s + v; }, 0);
                          var totalRound = Math.round(total * 100);
                          var targetRound = Math.round(d.fcTarget * 100);
                          var pieces = (d.fcPlaced || []).length;
                          if (totalRound !== targetRound) { upd('fcFeedback', { ok: false, msg: '\u274C Total is ' + fmt(total) + ' but target is ' + fmt(d.fcTarget) }); }
                          else if (pieces <= d.fcOptimal) {
                            upd('fcFeedback', { ok: true, msg: '\u2705 Perfect! ' + pieces + ' pieces \u2014 optimal solution!' });
                            if (typeof addXP === 'function') addXP(25, 'Money Math: Fewest coins challenge (optimal!)');
                          } else {
                            upd('fcFeedback', { ok: false, msg: '\u2705 Right amount, but ' + pieces + ' pieces. Can you do it in ' + d.fcOptimal + '?' });
                            if (typeof addXP === 'function') addXP(10, 'Money Math: Fewest coins challenge');
                          }
                        }, className: "flex-1 px-4 py-2 bg-amber-700 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-xs" }, __alloT('stem.money.check_14', "\u2714 Check")),
                        React.createElement("button", { "aria-label": __alloT('stem.money.reset_coin_selection', "Reset coin selection"), onClick: function () { upd('fcPlaced', []); }, className: "px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs" }, __alloT('stem.money.reset', "\u21BA Reset"))
                      ),
                      d.fcFeedback && React.createElement("p", { className: "text-xs font-bold mt-2 " + (d.fcFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.fcFeedback.msg)
                    )
                  )
                ),

                // Unit Pricing challenge
                React.createElement("div", { className: "bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-200" },
                  React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h4", { className: "text-sm font-bold text-teal-800" }, __alloT('stem.money.best_deal_unit_pricing', "\uD83D\uDED2 Best Deal: Unit Pricing")),
                    React.createElement("button", { "aria-label": __alloT('stem.money.gen_unit_price_problem', "Gen Unit Price Problem"), onClick: genUnitPriceProblem, className: "px-3 py-1.5 bg-teal-700 text-white text-xs font-bold rounded-lg hover:bg-teal-600 transition-all" }, !d.upItem ? '\u2728 Start' : '\u21BB New')
                  ),
                  d.upItem && d.upA && d.upB && React.createElement("div", { className: "space-y-3" },
                    React.createElement("p", { className: "text-xs text-slate-600 text-center" }, "Which is the better deal for " + d.upItem.name + "?"),
                    React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                      React.createElement("button", { "aria-label": __alloT('stem.money.option_a', "Option A"), onClick: function () { upd('upAnswer', 'A'); },
                        className: "p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02] " + (d.upAnswer === 'A' ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-slate-200 bg-white hover:border-teal-600')
                      },
                        React.createElement("p", { className: "text-2xl mb-1" }, d.upItem.name.split(' ')[0]),
                        React.createElement("p", { className: "text-lg font-black text-teal-700" }, fmt(d.upA.price)),
                        React.createElement("p", { className: "text-xs text-slate-600" }, d.upA.qty + ' ' + d.upItem.unit + (d.upA.qty > 1 ? 's' : '')),
                        React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, __alloT('stem.money.option_a_2', 'Option A'))
                      ),
                      React.createElement("button", { "aria-label": __alloT('stem.money.option_b', "Option B"), onClick: function () { upd('upAnswer', 'B'); },
                        className: "p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02] " + (d.upAnswer === 'B' ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-slate-200 bg-white hover:border-teal-600')
                      },
                        React.createElement("p", { className: "text-2xl mb-1" }, d.upItem.name.split(' ')[0]),
                        React.createElement("p", { className: "text-lg font-black text-teal-700" }, fmt(d.upB.price)),
                        React.createElement("p", { className: "text-xs text-slate-600" }, d.upB.qty + ' ' + d.upItem.unit + (d.upB.qty > 1 ? 's' : '')),
                        React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, __alloT('stem.money.option_b_2', 'Option B'))
                      )
                    ),
                    d.upAnswer && React.createElement("button", { "aria-label": __alloT('stem.money.check_my_answer', "Check My Answer"), onClick: function () {
                      var unitA = d.upA.price / d.upA.qty;
                      var unitB = d.upB.price / d.upB.qty;
                      var correct = unitA <= unitB ? 'A' : 'B';
                      var isRight = d.upAnswer === correct;
                      upd('upFeedback', isRight
                        ? { ok: true, msg: '\u2705 Correct! Option A: ' + fmt(unitA) + '/' + d.upItem.unit + ' vs Option B: ' + fmt(unitB) + '/' + d.upItem.unit }
                        : { ok: false, msg: '\u274C Option ' + correct + ' is cheaper. A: ' + fmt(unitA) + '/' + d.upItem.unit + ' vs B: ' + fmt(unitB) + '/' + d.upItem.unit }
                      );
                      if (isRight && typeof addXP === 'function') addXP(15, 'Money Math: Unit pricing');
                    }, className: "w-full px-4 py-2 bg-teal-700 text-white font-bold rounded-xl hover:bg-teal-600 transition-all text-sm" }, __alloT('stem.money.check_my_answer_2', "\u2714 Check My Answer")),
                    d.upFeedback && React.createElement("p", { className: "text-xs font-bold " + (d.upFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.upFeedback.msg)
                  )
                ),

                // ── Estimate the Total ──
                React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200" },
                  React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h4", { className: "text-sm font-bold text-indigo-800" }, __alloT('stem.money.estimate_the_total', "\uD83E\uDDFE Estimate the Total")),
                    React.createElement("button", { "aria-label": __alloT('stem.money.gen_estimate_total', "Gen Estimate Total"), onClick: genEstimateTotal, className: "px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 transition-all" }, !d.estItems ? '\u2728 Start' : '\u21BB New')
                  ),
                  d.estItems && React.createElement("div", { className: "space-y-2" },
                    React.createElement("div", { className: "bg-white rounded-lg border border-indigo-100 p-3 space-y-1" },
                      d.estItems.map(function (it, i) {
                        return React.createElement("div", { key: i, className: "flex justify-between text-xs" },
                          React.createElement("span", null, it.name + (it.qty > 1 ? ' x' + it.qty : '')),
                          React.createElement("span", { className: "font-bold" }, fmt(it.price) + '/ea')
                        );
                      }),
                      React.createElement("div", { className: "border-t border-dashed border-indigo-200 pt-1 mt-1" },
                        React.createElement("p", { className: "text-xs text-indigo-600 font-bold text-center" }, __alloT('stem.money.what_is_the_total', "What is the total?"))
                      )
                    ),
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', value: d.estAnswer != null ? d.estAnswer : '', onChange: function (e) { upd('estAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); upd('estFb', null); }, className: "flex-1 px-3 py-2 border border-indigo-600 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none" }),
                      React.createElement("button", { "aria-label": __alloT('stem.money.gen_change_check', "Gen Change Check"), onClick: function () {
                        if (d.estAnswer == null) return;
                        var tol = isJPY ? 0.5 : 0.015;
                        var ok = Math.abs(d.estAnswer - d.estTotal) < tol + d.estTotal * 0.005;
                        upd('estFb', ok ? { ok: true, msg: '\u2705 Correct! Total is ' + fmt(d.estTotal) + ' \u2014 +10 XP!' } : { ok: false, msg: '\u274C Not quite. The total is ' + fmt(d.estTotal) });
                        if (ok) {
                          if (typeof awardStemXP === 'function') awardStemXP('moneyMath', 10, 'estimate total');
                          if (typeof addXP === 'function') addXP(10, 'Money Math: Receipt estimation');
                        }
                      }, className: "px-4 py-2 bg-indigo-500 text-white font-bold rounded-lg hover:bg-indigo-600 transition-all text-sm" }, "\u2714")
                    ),
                    d.estFb && React.createElement("p", { className: "text-xs font-bold " + (d.estFb.ok ? 'text-green-600' : 'text-red-500') }, d.estFb.msg)
                  )
                ),

                // ── Change Check ──
                React.createElement("div", { className: "bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200" },
                  React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h4", { className: "text-sm font-bold text-rose-800" }, __alloT('stem.money.check_the_change', "\uD83E\uDDD0 Check the Change")),
                    React.createElement("button", { "aria-label": __alloT('stem.money.item_costs', "Item costs:"), onClick: genChangeCheck, className: "px-3 py-1.5 bg-rose-700 text-white text-xs font-bold rounded-lg hover:bg-rose-600 transition-all" }, d.ccPrice == null ? '\u2728 Start' : '\u21BB New')
                  ),
                  d.ccPrice != null && React.createElement("div", { className: "space-y-3" },
                    React.createElement("div", { className: "bg-white rounded-lg border border-rose-100 p-4 text-center space-y-1" },

                      React.createElement("p", { className: "text-xs text-slate-600" }, __alloT('stem.money.item_costs_2', "Item costs:")),
                      React.createElement("p", { className: "text-lg font-black text-rose-700" }, fmt(d.ccPrice)),
                      React.createElement("p", { className: "text-xs text-slate-600 mt-1" }, __alloT('stem.money.paid_with', "Paid with:")),
                      React.createElement("p", { className: "text-lg font-black text-slate-700" }, fmt(d.ccPaid)),
                      React.createElement("p", { className: "text-xs text-slate-600 mt-2" }, __alloT('stem.money.cashier_gives_you', "Cashier gives you:")),
                      React.createElement("p", { className: "text-2xl font-black text-amber-600" }, fmt(d.ccProposed)),
                      React.createElement("p", { className: "text-xs font-bold text-rose-600 mt-2" }, __alloT('stem.money.is_this_the_right_change', "Is this the right change? \uD83E\uDD14"))
                    ),
                    React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                      React.createElement("button", { onClick: function () { upd('ccAnswer', true); upd('ccFb', null); }, className: "py-2 rounded-xl font-bold text-sm transition-all " + (d.ccAnswer === true ? 'bg-green-700 text-white shadow-md' : 'bg-white border border-green-600 text-green-600 hover:bg-green-50') }, __alloT('stem.money.correct', "\u2705 Correct!")),
                      React.createElement("button", { onClick: function () { upd('ccAnswer', false); upd('ccFb', null); }, className: "py-2 rounded-xl font-bold text-sm transition-all " + (d.ccAnswer === false ? 'bg-red-700 text-white shadow-md' : 'bg-white border border-red-600 text-red-600 hover:bg-red-50') }, __alloT('stem.money.wrong', "\u274C Wrong!"))
                    ),
                    d.ccAnswer != null && React.createElement("button", { "aria-label": __alloT('stem.money.submit', "Submit"), onClick: function () {
                      var userSaysCorrect = d.ccAnswer;
                      var actuallyCorrect = !d.ccIsWrong;
                      var correct = userSaysCorrect === actuallyCorrect;
                      upd('ccFb', correct
                        ? { ok: true, msg: '\u2705 Right! Change should be ' + fmt(d.ccCorrectAmt) + '. ' + (d.ccIsWrong ? 'The cashier was off!' : 'The cashier was correct.') + ' +12 XP!' }
                        : { ok: false, msg: '\u274C Nope. Correct change is ' + fmt(d.ccCorrectAmt) + '. The cashier gave ' + fmt(d.ccProposed) + '.' }
                      );
                      if (correct) {
                        if (typeof awardStemXP === 'function') awardStemXP('moneyMath', 12, 'change check');
                        if (typeof addXP === 'function') addXP(12, 'Money Math: Change verification');
                      }
                    }, className: "w-full px-4 py-2 bg-rose-700 text-white font-bold rounded-xl hover:bg-rose-600 transition-all text-sm" }, __alloT('stem.money.submit_2', "\u2714 Submit")),
                    d.ccFb && React.createElement("p", { className: "text-xs font-bold " + (d.ccFb.ok ? 'text-green-600' : 'text-red-500') }, d.ccFb.msg)
                  )
                ),

                // ── Coupon Stack ──
                React.createElement("div", { className: "bg-gradient-to-br from-fuchsia-50 to-purple-50 rounded-xl p-4 border border-fuchsia-200" },
                  React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h4", { className: "text-sm font-bold text-fuchsia-800" }, __alloT('stem.money.coupon_stack', "\uD83C\uDFF7 Coupon Stack")),
                    React.createElement("button", { "aria-label": __alloT('stem.money.original_price_2', "Original price:"), onClick: genCouponStack, className: "px-3 py-1.5 bg-fuchsia-700 text-white text-xs font-bold rounded-lg hover:bg-fuchsia-600 transition-all" }, d.csOriginal == null ? '\u2728 Start' : '\u21BB New')
                  ),
                  d.csOriginal != null && React.createElement("div", { className: "space-y-3" },
                    React.createElement("div", { className: "bg-white rounded-lg border border-fuchsia-100 p-4 space-y-2" },
                      React.createElement("p", { className: "text-xs text-slate-600 text-center" }, __alloT('stem.money.original_price_3', "Original price:")),
                      React.createElement("p", { className: "text-2xl font-black text-fuchsia-700 text-center" }, fmt(d.csOriginal)),
                      React.createElement("p", { className: "text-xs text-slate-600 text-center mt-2" }, __alloT('stem.money.apply_these_discounts_in_order', "Apply these discounts in order:")),
                      d.csDiscounts.map(function (disc, i) {
                        return React.createElement("div", { key: i, className: "flex items-center justify-center gap-2 text-sm" },
                          React.createElement("span", { className: "text-lg" }, ['\uD83C\uDFF7\uFE0F', '\u2702\uFE0F', '\uD83C\uDF81'][i] || '\uD83C\uDFF7\uFE0F'),
                          React.createElement("span", { className: "font-bold text-fuchsia-600" }, disc.type === 'pct' ? disc.val + '% off' : fmt(disc.val) + ' off')
                        );
                      })
                    ),
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("label", { className: "text-xs font-bold text-slate-600" }, __alloT('stem.money.final_price', "Final price:")),
                      React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', value: d.csAnswer != null ? d.csAnswer : '', onChange: function (e) { upd('csAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); upd('csFb', null); }, className: "flex-1 px-3 py-2 border border-fuchsia-600 rounded-lg text-sm font-bold focus:ring-2 focus:ring-fuchsia-400 outline-none" }),
                      React.createElement("button", { "aria-label": __alloT('stem.money.gen_structured_problem', "Gen Structured Problem"), onClick: function () {
                        if (d.csAnswer == null) return;
                        var tol = isJPY ? 0.5 : 0.02;
                        var ok = Math.abs(d.csAnswer - d.csFinal) < tol + d.csFinal * 0.01;
                        upd('csFb', ok ? { ok: true, msg: '\u2705 Perfect! Final price: ' + fmt(d.csFinal) + ' \u2014 +15 XP!' } : { ok: false, msg: '\u274C Not quite. Final price is ' + fmt(d.csFinal) + '. Discounts apply sequentially!' });
                        if (ok) {
                          if (typeof awardStemXP === 'function') awardStemXP('moneyMath', 15, 'coupon stack');
                          if (typeof addXP === 'function') addXP(15, 'Money Math: Coupon stacking');
                        }
                      }, className: "px-4 py-2 bg-fuchsia-700 text-white font-bold rounded-lg hover:bg-fuchsia-600 transition-all text-sm" }, "\u2714")
                    ),
                    d.csFb && React.createElement("p", { className: "text-xs font-bold " + (d.csFb.ok ? 'text-green-600' : 'text-red-500') }, d.csFb.msg)
                  )
                ),

                // ── Structured Word Problems ──
                React.createElement("div", { className: "bg-gradient-to-br from-cyan-50 to-sky-50 rounded-xl p-4 border border-cyan-200" },
                  React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h4", { className: "text-sm font-bold text-cyan-800" }, __alloT('stem.money.word_problems_3', "\uD83D\uDCDD Word Problems")),
                    React.createElement("button", { "aria-label": __alloT('stem.money.gen_structured_problem_2', "Gen Structured Problem"), onClick: genStructuredProblem, className: "px-3 py-1.5 bg-cyan-700 text-white text-xs font-bold rounded-lg hover:bg-cyan-600 transition-all" }, !d.spText ? '\u2728 Start' : '\u21BB New')
                  ),
                  d.spText && d.spAnswers && React.createElement("div", { className: "space-y-3" },
                    React.createElement("div", { className: "bg-white rounded-lg border border-cyan-100 p-4" },
                      React.createElement("p", { className: "text-sm text-slate-700 leading-relaxed" }, d.spText)
                    ),
                    React.createElement("div", { className: "space-y-2" },
                      d.spAnswers.map(function (ans, i) {
                        return React.createElement("div", { key: i, className: "flex items-center gap-2" },
                          React.createElement("label", { className: "text-xs font-bold text-cyan-700 w-24" }, ans.label + ':'),
                          React.createElement("input", { type: "number", step: '0.01', placeholder: '$...', value: d.spUserAnswers && d.spUserAnswers[i] != null ? d.spUserAnswers[i] : '', onChange: function (e) {
                            var arr = (d.spUserAnswers || []).slice();
                            arr[i] = e.target.value === '' ? null : parseFloat(e.target.value);
                            upd('spUserAnswers', arr); upd('spFb', null);
                          }, className: "flex-1 px-3 py-2 border border-cyan-600 rounded-lg text-sm font-bold focus:ring-2 focus:ring-cyan-400 outline-none" })
                        );
                      })
                    ),
                    React.createElement("button", { "aria-label": __alloT('stem.money.check_my_answers', "Check My Answers"), onClick: function () {
                      var ua = d.spUserAnswers || [];
                      var allOk = true;
                      d.spAnswers.forEach(function (ans, i) {
                        if (ua[i] == null || Math.abs(ua[i] - ans.val) > 0.02 + ans.val * 0.005) allOk = false;
                      });
                      var detail = d.spAnswers.map(function (a) { return a.label + ': ' + fmt(a.val); }).join(', ');
                      upd('spFb', allOk
                        ? { ok: true, msg: '\u2705 Correct! ' + detail + ' \u2014 +15 XP!' }
                        : { ok: false, msg: '\u274C Not quite. ' + detail }
                      );
                      if (allOk) {
                        if (typeof awardStemXP === 'function') awardStemXP('moneyMath', 15, 'word problem');
                        if (typeof addXP === 'function') addXP(15, 'Money Math: Word problem');
                      }
                    }, className: "w-full px-4 py-2 bg-cyan-700 text-white font-bold rounded-xl hover:bg-cyan-600 transition-all text-sm" }, __alloT('stem.money.check_my_answers_2', "\u2714 Check My Answers")),
                    d.spFb && React.createElement("p", { className: "text-xs font-bold " + (d.spFb.ok ? 'text-green-600' : 'text-red-500') }, d.spFb.msg)
                  )
                ),

                // ── 🪙 Coin Drop Minigame ──
                React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200" },
                  React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h4", { className: "text-sm font-bold text-amber-800" }, __alloT('stem.money.coin_drop', "\uD83E\uDE99 Coin Drop")),
                    React.createElement("div", { className: "flex items-center gap-2" },
                      cdStreak > 0 && React.createElement("span", { className: "px-2 py-0.5 bg-amber-100 rounded-full text-[11px] font-black text-amber-700" }, '\uD83D\uDD25 ' + cdStreak + ' streak'),
                      React.createElement("button", { "aria-label": __alloT('stem.money.timer_running', "Timer running..."), onClick: genCoinDrop, className: "px-3 py-1.5 bg-amber-700 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all shadow-sm" }, cdTarget === 0 ? '\u2728 Start' : '\u21BB New')
                    )
                  ),
                  cdTarget > 0 && React.createElement("div", { className: "space-y-3" },
                    // Target display
                    React.createElement("div", { className: "bg-white rounded-xl p-4 border border-amber-100 text-center" },
                      React.createElement("p", { className: "text-[11px] text-slate-600 font-bold uppercase tracking-wider" }, __alloT('stem.money.target_amount', "\uD83C\uDFAF Target Amount")),
                      React.createElement("p", { className: "text-3xl font-black text-amber-600 mt-1" }, fmt(cdTarget)),
                      challengeMode && cdStartTime && React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, __alloT('stem.money.timer_running_2', '\u23F1 Timer running...'))
                    ),
                    // Piggy bank visual area
                    React.createElement("div", { className: "relative bg-gradient-to-b from-amber-100 to-amber-200 rounded-xl p-3 min-h-[120px] overflow-hidden border border-amber-300" },
                      // Fill level indicator
                      React.createElement("div", { style: { position: 'absolute', bottom: 0, left: 0, right: 0, height: Math.min(100, (cdRound / cdTarget) * 100) + '%', background: 'linear-gradient(to top, #f59e0b33, #fbbf2433)', transition: 'height 0.3s ease', borderRadius: '0 0 12px 12px' } }),
                      // Dropped coins display
                      React.createElement("div", { className: "relative z-10 flex flex-wrap gap-1 justify-center items-end min-h-[80px]" },
                        cdDropped.map(function (val, di) {
                          var coin = COIN_DENOMS.find(function (c) { return c.val === val; }) || COIN_DENOMS[0];
                          var isNew = di === cdDropped.length - 1 && d.cdAnimDrop;
                          return React.createElement("div", { key: di,
                            className: "inline-flex items-center justify-center rounded-full font-black text-white text-[11px] shadow-md" + (isNew ? ' animate-bounce' : ''),
                            style: { width: coin.size * 0.7 + 'px', height: coin.size * 0.7 + 'px', backgroundColor: coin.color, fontSize: '11px', lineHeight: '1' }
                          }, coin.label);
                        })
                      ),
                      cdDropped.length === 0 && React.createElement("p", { className: "text-center text-xs text-amber-800 font-bold py-6 relative z-10" }, __alloT('stem.money.drop_coins_here', '\uD83D\uDC37 Drop coins here!'))
                    ),
                    // Running total
                    React.createElement("div", { className: "flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100" },
                      React.createElement("span", { className: "text-xs font-bold text-slate-600" }, __alloT('stem.money.your_total', "Your total:")),
                      React.createElement("span", { className: "text-lg font-black " + (cdRound === cdTarget ? 'text-green-600' : cdRound > cdTarget ? 'text-red-500' : 'text-amber-600') }, fmt(cdRound)),
                      React.createElement("span", { className: "text-xs text-slate-600" }, (cdTarget - cdRound > 0 ? fmt(cdTarget - cdRound) + ' to go' : cdRound === cdTarget ? '\u2705 Perfect!' : '\u274C Over!'))
                    ),
                    // Clickable coin/bill tokens
                    React.createElement("div", { className: "flex flex-wrap gap-1.5 justify-center" },
                      COIN_DENOMS.map(function (coin) {
                        var wouldOvershoot = cdRound + coin.val > cdTarget + 0.001;
                        return React.createElement("button", { "aria-label": "Drop " + coin.label + " coin", key: coin.label, onClick: function () {
                            if (cdFb) return; // Already solved
                            var newDropped = cdDropped.concat([coin.val]);
                            var newTotal = Math.round((cdRound + coin.val) * 100) / 100;
                            upd('cdDropped', newDropped);
                            upd('cdAnimDrop', true);
                            setTimeout(function () { upd('cdAnimDrop', false); }, 400);
                            if (newTotal === cdTarget) {
                              var timeMsg = '';
                              if (challengeMode && cdStartTime) {
                                var elapsed = Math.round((Date.now() - cdStartTime) / 1000);
                                timeMsg = ' in ' + elapsed + 's';
                              }
                              upd('cdStreak', cdStreak + 1);
                              var bonusXP = 10 + Math.min(cdStreak * 2, 10);
                              upd('cdFb', { ok: true, msg: '\uD83C\uDF89 Perfect! ' + fmt(cdTarget) + ' in ' + newDropped.length + ' coins' + timeMsg + '! +' + bonusXP + ' XP' });
                              if (typeof awardStemXP === 'function') awardStemXP('moneyMath', bonusXP, 'coin drop');
                              if (typeof addXP === 'function') addXP(bonusXP, 'Money Math: Coin Drop');
                            } else if (newTotal > cdTarget) {
                              upd('cdStreak', 0);
                              upd('cdFb', { ok: false, msg: '\u274C Too much! You put in ' + fmt(newTotal) + ' but needed ' + fmt(cdTarget) + '. Try again!' });
                            }
                          },
                          disabled: !!cdFb,
                          className: "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all border-2 " + (wouldOvershoot && !cdFb ? 'border-red-600 bg-red-50 opacity-60' : 'border-amber-600 bg-white hover:border-amber-400 hover:shadow-md hover:scale-105') + (cdFb ? ' opacity-50 cursor-not-allowed' : '')
                        },
                          React.createElement("div", {
                            className: "flex items-center justify-center rounded-full font-black text-white text-[11px]",
                            style: { width: coin.size + 'px', height: coin.size + 'px', backgroundColor: coin.color }
                          }, coin.label),
                          React.createElement("span", { className: "text-[11px] font-bold text-slate-600" }, fmt(coin.val))
                        );
                      })
                    ),
                    // Undo button
                    cdDropped.length > 0 && !cdFb && React.createElement("button", { "aria-label": __alloT('stem.money.undo_last_coin', "Undo last coin"), onClick: function () {
                      var newDropped = cdDropped.slice(0, -1);
                      upd('cdDropped', newDropped);
                    }, className: "transition-colors w-full px-3 py-1 text-xs text-slate-600 hover:text-slate-600 font-bold text-center" }, __alloT('stem.money.undo_last_coin_2', '\u21A9 Undo last coin')),
                    // Feedback
                    cdFb && React.createElement("div", { className: "space-y-2" },
                      React.createElement("p", { className: "text-xs font-bold text-center " + (cdFb.ok ? 'text-green-600' : 'text-red-500') }, cdFb.msg),
                      React.createElement("button", { "aria-label": __alloT('stem.money.next_round', "Next Round"), onClick: genCoinDrop, className: "w-full px-4 py-2 bg-amber-700 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-sm shadow-md" }, __alloT('stem.money.next_round_2', '\u27A1 Next Round'))
                    )
                  )
                ),

                // Score tracker
                React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-3 border border-violet-200 text-center" },
                  React.createElement("p", { className: "text-[11px] font-bold text-violet-500" }, __alloT('stem.money.complete_challenges_across_all_tabs_to', "\uD83C\uDFC6 Complete challenges across all tabs to earn XP and build real-world money skills!"))
                )
              ),

              // ═══ PERSONAL FINANCE TAB ═══
              tab === 'finance' && React.createElement("div", { className: "space-y-4" },
                // Sub-tab navigation
                React.createElement("div", { className: "flex flex-wrap gap-2 mb-2" },
                  [{ id: 'compound', label: __alloT('stem.money.compound_interest', '\uD83D\uDCC8 Compound Interest') }, { id: 'retire', label: __alloT('stem.money.retirement', '\uD83C\uDFD6\uFE0F Retirement') }, { id: 'loans', label: __alloT('stem.money.loans_debt', '\uD83C\uDFE6 Loans & Debt') }, { id: 'goals', label: __alloT('stem.money.savings_goals', '\uD83C\uDFAF Savings Goals') }, { id: 'quiz', label: __alloT('stem.money.fin_quiz', '\uD83E\uDDE0 Fin. Quiz') }].map(function (s) {
                    return React.createElement("button", { "aria-label": s.label.replace(/^[^\s]+\s/, ''), key: s.id, onClick: function () { upd('finSub', s.id); },
                      className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " + (finSub === s.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-400 hover:bg-blue-50')
                    }, s.label);
                  })
                ),

                // ── Compound Interest ──
                finSub === 'compound' && React.createElement("div", { className: "bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200" },
                  React.createElement("h3", { className: "text-base font-bold text-blue-800 mb-1" }, __alloT('stem.money.compound_interest_visualizer_2', "\uD83D\uDCC8 Compound Interest Visualizer")),
                  React.createElement("p", { className: "text-xs text-blue-500 mb-4" }, __alloT('stem.money.see_how_your_money_grows_simple_vs_com', "See how your money grows \u2014 simple vs compound interest")),
                  // Controls
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4" },
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.principal', "Principal")),
                      React.createElement("input", { type: "number", value: ciPrincipal, 'aria-label': __alloT('stem.money.principal_amount', 'Principal amount'), onChange: function (e) { upd('ciPrincipal', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.annual_rate', "Annual Rate %")),
                      React.createElement("input", { type: "number", step: "0.5", value: ciRate, 'aria-label': __alloT('stem.money.annual_interest_rate', 'Annual interest rate'), onChange: function (e) { upd('ciRate', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.years', "Years")),
                      React.createElement("input", { type: "number", value: ciYears, 'aria-label': __alloT('stem.money.number_of_years', 'Number of years'), onChange: function (e) { upd('ciYears', Math.min(50, Math.max(1, parseInt(e.target.value) || 1))); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.compounding', "Compounding")),
                      React.createElement("select", { value: ciFreq, 'aria-label': __alloT('stem.money.compounding_frequency', 'Compounding frequency'), onChange: function (e) { upd('ciFreq', e.target.value); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-400 outline-none mt-1" },
                        React.createElement("option", { value: "yearly" }, __alloT('stem.money.yearly', "Yearly")),
                        React.createElement("option", { value: "quarterly" }, __alloT('stem.money.quarterly', "Quarterly")),
                        React.createElement("option", { value: "monthly" }, __alloT('stem.money.monthly', "Monthly")),
                        React.createElement("option", { value: "daily" }, __alloT('stem.money.daily', "Daily"))
                      )
                    )
                  ),
                  // Results summary
                  React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-4" },
                    React.createElement("div", { className: "bg-white rounded-xl p-4 border border-blue-100 text-center" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.compound_interest_2', "Compound Interest")),
                      React.createElement("p", { className: "text-2xl font-black text-blue-600" }, cur.symbol + Math.round(ciCompound).toLocaleString()),
                      React.createElement("p", { className: "text-xs text-emerald-500 font-bold" }, "+" + cur.symbol + Math.round(ciCompoundInterest).toLocaleString() + " earned")
                    ),
                    React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-100 text-center" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.simple_interest', "Simple Interest")),
                      React.createElement("p", { className: "text-2xl font-black text-slate-600" }, cur.symbol + Math.round(ciSimple).toLocaleString()),
                      React.createElement("p", { className: "text-xs text-slate-600 font-bold" }, "+" + cur.symbol + Math.round(ciSimpleInterest).toLocaleString() + " earned")
                    )
                  ),
                  React.createElement("p", { className: "text-xs font-bold text-center " + (ciCompoundInterest > ciSimpleInterest * 1.1 ? 'text-emerald-600' : 'text-slate-600'), style: { marginBottom: 8 } },
                    "\uD83D\uDCA1 Compound earns " + cur.symbol + Math.round(ciCompoundInterest - ciSimpleInterest).toLocaleString() + " MORE than simple interest!"
                  ),
                  // Growth table
                  React.createElement("div", { className: "bg-white rounded-xl border border-slate-400 overflow-hidden" },
                    React.createElement("table", { className: "w-full text-xs" },
                      React.createElement("caption", { className: "sr-only" }, __alloT('stem.money.money_data_table', "money data table")), React.createElement("thead", null,
                        React.createElement("tr", { className: "bg-slate-50" },
                          React.createElement("th", { scope: "col", className: "px-3 py-2 text-left font-bold text-slate-600" }, __alloT('stem.money.year', "Year")),
                          React.createElement("th", { scope: "col", className: "px-3 py-2 text-right font-bold text-blue-600" }, __alloT('stem.money.compound', "Compound")),
                          React.createElement("th", { scope: "col", className: "px-3 py-2 text-right font-bold text-slate-600" }, __alloT('stem.money.simple', "Simple")),
                          React.createElement("th", { scope: "col", className: "px-3 py-2 text-right font-bold text-emerald-500" }, __alloT('stem.money.advantage', "Advantage"))
                        )
                      ),
                      React.createElement("tbody", null,
                        ciTable.filter(function (r) { return r.year === 0 || r.year === 1 || r.year % Math.max(1, Math.floor(ciYears / 8)) === 0 || r.year === ciYears; }).map(function (r, ri) {
                          return React.createElement("tr", { key: ri, className: ri % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                            React.createElement("td", { className: "px-3 py-1.5 font-bold text-slate-600" }, r.year),
                            React.createElement("td", { className: "px-3 py-1.5 text-right font-bold text-blue-600" }, cur.symbol + Math.round(r.compound).toLocaleString()),
                            React.createElement("td", { className: "px-3 py-1.5 text-right text-slate-600" }, cur.symbol + Math.round(r.simple).toLocaleString()),
                            React.createElement("td", { className: "px-3 py-1.5 text-right font-bold text-emerald-500" }, "+" + cur.symbol + Math.round(r.compound - r.simple).toLocaleString())
                          );
                        })
                      )
                    )
                  )
                ),

                // ── Retirement Planner ──
                finSub === 'retire' && React.createElement("div", { className: "bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-5 border border-violet-200" },
                  React.createElement("h3", { className: "text-base font-bold text-violet-800 mb-1" }, __alloT('stem.money.retirement_savings_planner', "\uD83C\uDFD6\uFE0F Retirement Savings Planner")),
                  React.createElement("p", { className: "text-xs text-violet-500 mb-4" }, __alloT('stem.money.see_why_starting_early_makes_a_massive', "See why starting early makes a massive difference")),
                  // Controls
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4" },
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.start_age', "Start Age")),
                      React.createElement("input", { type: "range", min: 18, max: 55, value: retAge, 'aria-label': __alloT('stem.money.retirement_start_age', 'Retirement start age'), onChange: function (e) { upd('retAge', parseInt(e.target.value)); },
                        className: "w-full mt-1", style: { accentColor: '#7c3aed' } }),
                      React.createElement("p", { className: "text-xs font-bold text-center text-violet-600" }, retAge + " years old")
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.monthly_contribution', "Monthly Contribution")),
                      React.createElement("input", { type: "number", value: retMonthly, 'aria-label': __alloT('stem.money.monthly_contribution_2', 'Monthly contribution'), onChange: function (e) { upd('retMonthly', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-violet-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.employer_match', "Employer Match %")),
                      React.createElement("input", { type: "number", value: retMatch, 'aria-label': __alloT('stem.money.employer_match_percentage', 'Employer match percentage'), onChange: function (e) { upd('retMatch', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-violet-400 outline-none mt-1" })
                    )
                  ),
                  // Two-scenario comparison
                  React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-4" },
                    React.createElement("div", { className: "bg-white rounded-xl p-4 border-2 border-violet-300 text-center" },
                      React.createElement("p", { className: "text-[11px] font-bold text-violet-400 uppercase" }, "Start at " + retAge),
                      React.createElement("p", { className: "text-2xl font-black text-violet-600" }, cur.symbol + Math.round(retResult.total).toLocaleString()),
                      React.createElement("p", { className: "text-[11px] text-slate-600" }, "Contributed: " + cur.symbol + Math.round(retResult.contributed).toLocaleString()),
                      React.createElement("p", { className: "text-[11px] font-bold text-emerald-500" }, "Growth: " + cur.symbol + Math.round(retResult.growth).toLocaleString())
                    ),
                    React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-400 text-center opacity-75" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Start at " + (retAge + 10)),
                      React.createElement("p", { className: "text-2xl font-black text-slate-600" }, cur.symbol + Math.round(retLateResult.total).toLocaleString()),
                      React.createElement("p", { className: "text-[11px] text-slate-600" }, "Contributed: " + cur.symbol + Math.round(retLateResult.contributed).toLocaleString()),
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600" }, "Growth: " + cur.symbol + Math.round(retLateResult.growth).toLocaleString())
                    )
                  ),
                  retResult.total > retLateResult.total && React.createElement("div", { className: "bg-violet-100 rounded-xl p-3 text-center border border-violet-200" },
                    React.createElement("p", { className: "text-xs font-bold text-violet-700" },
                      "\uD83D\uDCA1 Starting 10 years earlier = " + cur.symbol + Math.round(retResult.total - retLateResult.total).toLocaleString() + " MORE at retirement!"),
                    React.createElement("p", { className: "text-[11px] text-violet-500 mt-1" }, "That's " + Math.round((retResult.total / Math.max(1, retLateResult.total) - 1) * 100) + "% more money \u2014 and you only contributed " + cur.symbol + Math.round(retResult.contributed - retLateResult.contributed).toLocaleString() + " extra.")
                  ),
                  // Milestone table
                  React.createElement("div", { className: "bg-white rounded-xl border border-slate-400 overflow-hidden mt-4" },
                    React.createElement("table", { className: "w-full text-xs" },
                      React.createElement("caption", { className: "sr-only" }, __alloT('stem.money.money_data_table_2', "money data table")), React.createElement("thead", null,
                        React.createElement("tr", { className: "bg-slate-50" },
                          React.createElement("th", { scope: "col", className: "px-3 py-2 text-left font-bold text-slate-600" }, "Age"),
                          React.createElement("th", { scope: "col", className: "px-3 py-2 text-right font-bold text-violet-600" }, __alloT('stem.money.early_start', "Early Start")),
                          React.createElement("th", { scope: "col", className: "px-3 py-2 text-right font-bold text-slate-600" }, __alloT('stem.money.late_start', "Late Start"))
                        )
                      ),
                      React.createElement("tbody", null,
                        retResult.yearly.filter(function (r) { return r.age === retAge || r.age % 5 === 0 || r.age === retRetireAge; }).map(function (r, ri) {
                          var late = retLateResult.yearly.find(function (l) { return l.age === r.age; });
                          return React.createElement("tr", { key: ri, className: ri % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                            React.createElement("td", { className: "px-3 py-1.5 font-bold text-slate-600" }, r.age),
                            React.createElement("td", { className: "px-3 py-1.5 text-right font-bold text-violet-600" }, cur.symbol + Math.round(r.balance).toLocaleString()),
                            React.createElement("td", { className: "px-3 py-1.5 text-right text-slate-600" }, late ? cur.symbol + Math.round(late.balance).toLocaleString() : '\u2014')
                          );
                        })
                      )
                    )
                  )
                ),

                // ── Loan & Debt Calculator ──
                finSub === 'loans' && React.createElement("div", { className: "bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-5 border border-rose-200" },
                  React.createElement("h3", { className: "text-base font-bold text-rose-800 mb-1" }, __alloT('stem.money.loan_debt_calculator', "\uD83C\uDFE6 Loan & Debt Calculator")),
                  React.createElement("p", { className: "text-xs text-rose-500 mb-4" }, __alloT('stem.money.understand_what_loans_really_cost_the_', "Understand what loans really cost \u2014 the total interest is eye-opening")),
                  // Loan type presets
                  React.createElement("div", { className: "flex flex-wrap gap-2 mb-4" },
                    Object.keys(loanPresets).map(function (k) {
                      return React.createElement("button", { "aria-label": __alloT('stem.money.loan_amount', "Loan Amount"), key: k, onClick: function () {
                        upd('loanType', k); upd('loanAmt', loanPresets[k].amt); upd('loanRate', loanPresets[k].rate); upd('loanTerm', loanPresets[k].term);
                      }, className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " + (loanType === k ? 'bg-rose-700 text-white shadow-md' : 'bg-white text-rose-600 border border-rose-600 hover:bg-rose-50') }, loanPresets[k].label);
                    })
                  ),
                  // Controls
                  React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-4" },
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.loan_amount_2', "Loan Amount")),
                      React.createElement("input", { type: "number", value: loanAmt, 'aria-label': __alloT('stem.money.loan_amount_3', 'Loan amount'), onChange: function (e) { upd('loanAmt', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.interest_rate', "Interest Rate %")),
                      React.createElement("input", { type: "number", step: "0.25", value: loanRate, 'aria-label': __alloT('stem.money.loan_interest_rate', 'Loan interest rate'), onChange: function (e) { upd('loanRate', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.term_months', "Term (months)")),
                      React.createElement("input", { type: "number", value: loanTerm, 'aria-label': __alloT('stem.money.loan_term_in_months', 'Loan term in months'), onChange: function (e) { upd('loanTerm', Math.max(1, parseInt(e.target.value) || 1)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none mt-1" })
                    )
                  ),
                  // Results
                  React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-4" },
                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border border-rose-100" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.monthly_payment', "Monthly Payment")),
                      React.createElement("p", { className: "text-xl font-black text-rose-600" }, cur.symbol + Math.round(loanMonthly).toLocaleString())
                    ),
                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border border-red-200" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.total_interest', "Total Interest")),
                      React.createElement("p", { className: "text-xl font-black text-red-500" }, cur.symbol + Math.round(loanTotalInterest).toLocaleString()),
                      React.createElement("p", { className: "text-[11px] text-red-600" }, "That's " + Math.round(loanTotalInterest / loanAmt * 100) + "% of the loan!")
                    ),
                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border border-slate-100" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.total_paid', "Total Paid")),
                      React.createElement("p", { className: "text-xl font-black text-slate-600" }, cur.symbol + Math.round(loanTotalPaid).toLocaleString())
                    )
                  ),
                  // Visual bar
                  React.createElement("div", { className: "mb-4" },
                    React.createElement("p", { className: "text-[11px] font-bold text-slate-600 mb-1" }, __alloT('stem.money.what_you_re_really_paying', "What you're really paying:")),
                    React.createElement("div", { className: "h-6 rounded-full overflow-hidden flex" },
                      React.createElement("div", { style: { width: Math.round(loanAmt / loanTotalPaid * 100) + '%', background: 'linear-gradient(90deg, #3b82f6, #6366f1)' }, className: "h-full flex items-center justify-center text-[11px] text-white font-bold" }, __alloT('stem.money.principal_2', "Principal")),
                      React.createElement("div", { style: { width: Math.round(loanTotalInterest / loanTotalPaid * 100) + '%', background: 'linear-gradient(90deg, #ef4444, #dc2626)' }, className: "h-full flex items-center justify-center text-[11px] text-white font-bold" }, __alloT('stem.money.interest', "Interest"))
                    )
                  ),
                  // Amortization highlights
                  React.createElement("div", { className: "bg-white rounded-xl border border-slate-400 overflow-hidden" },
                    React.createElement("table", { className: "w-full text-xs" },
                      React.createElement("caption", { className: "sr-only" }, __alloT('stem.money.money_data_table_3', "money data table")), React.createElement("thead", null,
                        React.createElement("tr", { className: "bg-slate-50" },
                          React.createElement("th", { scope: "col", className: "px-2 py-2 text-left font-bold text-slate-600" }, __alloT('stem.money.month', "Month")),
                          React.createElement("th", { scope: "col", className: "px-2 py-2 text-right font-bold text-slate-600" }, __alloT('stem.money.payment', "Payment")),
                          React.createElement("th", { scope: "col", className: "px-2 py-2 text-right font-bold text-blue-500" }, __alloT('stem.money.principal_3', "Principal")),
                          React.createElement("th", { scope: "col", className: "px-2 py-2 text-right font-bold text-red-500" }, __alloT('stem.money.interest_2', "Interest")),
                          React.createElement("th", { scope: "col", className: "px-2 py-2 text-right font-bold text-slate-600" }, __alloT('stem.money.balance', "Balance"))
                        )
                      ),
                      React.createElement("tbody", null,
                        loanAmort.map(function (r, ri) {
                          return React.createElement("tr", { key: ri, className: ri % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                            React.createElement("td", { className: "px-2 py-1.5 font-bold text-slate-600" }, r.month),
                            React.createElement("td", { className: "px-2 py-1.5 text-right text-slate-600" }, cur.symbol + Math.round(r.payment).toLocaleString()),
                            React.createElement("td", { className: "px-2 py-1.5 text-right text-blue-600 font-bold" }, cur.symbol + Math.round(r.principal).toLocaleString()),
                            React.createElement("td", { className: "px-2 py-1.5 text-right text-red-500" }, cur.symbol + Math.round(r.interest).toLocaleString()),
                            React.createElement("td", { className: "px-2 py-1.5 text-right text-slate-600" }, cur.symbol + Math.round(r.balance).toLocaleString())
                          );
                        })
                      )
                    )
                  )
                ),

                // ── Savings Goals ──
                finSub === 'goals' && React.createElement("div", { className: "bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-200" },
                  React.createElement("h3", { className: "text-base font-bold text-emerald-800 mb-1" }, __alloT('stem.money.savings_goal_planner', "\uD83C\uDFAF Savings Goal Planner")),
                  React.createElement("p", { className: "text-xs text-emerald-500 mb-4" }, __alloT('stem.money.pick_a_goal_and_see_exactly_how_much_t', "Pick a goal and see exactly how much to save each day, week, or month")),
                  // Goal picker
                  React.createElement("div", { className: "flex flex-wrap gap-2 mb-4" },
                    Object.keys(sgGoals).map(function (k) {
                      return React.createElement("button", { "aria-label": __alloT('stem.money.target_amount_2', "Target Amount"), key: k, onClick: function () {
                        upd('sgGoal', k); upd('sgTarget', sgGoals[k].target); upd('sgHave', 0);
                      }, className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " + (sgGoal === k ? 'bg-emerald-700 text-white shadow-md' : 'bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-50') }, sgGoals[k].label);
                    })
                  ),
                  // Controls
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4" },
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.target_amount_3', "Target Amount")),
                      React.createElement("input", { type: "number", value: sgTarget, 'aria-label': __alloT('stem.money.savings_target_amount', 'Savings target amount'), onChange: function (e) { upd('sgTarget', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.already_saved', "Already Saved")),
                      React.createElement("input", { type: "number", value: sgHave, 'aria-label': __alloT('stem.money.amount_already_saved', 'Amount already saved'), onChange: function (e) { upd('sgHave', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.timeline_months', "Timeline (months)")),
                      React.createElement("input", { type: "number", value: sgMonths, 'aria-label': __alloT('stem.money.savings_timeline_in_months', 'Savings timeline in months'), onChange: function (e) { upd('sgMonths', Math.max(1, parseInt(e.target.value) || 1)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.savings_rate', "Savings Rate %")),
                      React.createElement("input", { type: "number", step: "0.5", value: sgRate, 'aria-label': __alloT('stem.money.savings_interest_rate', 'Savings interest rate'), onChange: function (e) { upd('sgRate', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-400 outline-none mt-1" })
                    )
                  ),
                  // Progress bar
                  React.createElement("div", { className: "mb-4" },
                    React.createElement("div", { className: "flex items-center justify-between mb-1" },
                      React.createElement("span", { className: "text-[11px] font-bold text-slate-600" }, "Progress" + (sgRemaining > 0 ? " · " + cur.symbol + Math.round(sgRemaining).toLocaleString() + " to go" : "")),
                      React.createElement("span", { className: "text-[11px] font-bold " + (sgHave >= sgTarget ? "text-amber-500" : "text-emerald-600") }, (sgHave >= sgTarget ? "🎉 " : "") + Math.min(100, Math.round(sgHave / Math.max(1, sgTarget) * 100)) + "%")
                    ),
                    React.createElement("div", { className: "relative h-4 bg-slate-100 rounded-full overflow-hidden" },
                      React.createElement("div", { style: { width: Math.min(100, sgHave / Math.max(1, sgTarget) * 100) + '%', transition: 'width 0.3s' }, className: "h-full rounded-full " + (sgHave >= sgTarget ? "bg-gradient-to-r from-amber-300 to-yellow-400" : "bg-gradient-to-r from-emerald-400 to-green-500") }),
                      [25, 50, 75].map(function (_m) { return React.createElement("div", { key: 'mk' + _m, className: "absolute top-0 h-full w-px bg-white/70", style: { left: _m + '%' } }); })
                    )
                  ),
                  // Results
                  React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-4" },
                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border border-emerald-100" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.per_day', "Per Day")),
                      React.createElement("p", { className: "text-lg font-black text-emerald-600" }, cur.symbol + (Math.round(sgDailyNeeded * 100) / 100).toFixed(2)),
                      React.createElement("p", { className: "text-[11px] text-slate-600" }, __alloT('stem.money.skip_a_coffee', "\u2248 skip a coffee"))
                    ),
                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border-2 border-emerald-300" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.per_week', "Per Week")),
                      React.createElement("p", { className: "text-lg font-black text-emerald-600" }, cur.symbol + Math.round(sgWeeklyNeeded).toLocaleString())
                    ),
                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border border-emerald-100" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.money.per_month', "Per Month")),
                      React.createElement("p", { className: "text-lg font-black text-emerald-600" }, cur.symbol + Math.round(sgMonthlyNeeded).toLocaleString())
                    )
                  ),
                  // "What if" scenarios
                  React.createElement("div", { className: "bg-white rounded-xl p-4 border border-emerald-100" },
                    React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase mb-2" }, __alloT('stem.money.what_if_scenarios', "\uD83D\uDCA1 What If Scenarios")),
                    React.createElement("div", { className: "space-y-2" },
                      React.createElement("p", { className: "text-xs text-slate-600" }, "\u2022 Save " + cur.symbol + "5 more/week? Reach goal in ", React.createElement("strong", { className: "text-emerald-600" }, Math.max(1, Math.round(sgRemaining / ((sgWeeklyNeeded + 5) * 52 / 12))) + " months"), " instead of " + sgMonths),
                      React.createElement("p", { className: "text-xs text-slate-600" }, "\u2022 Save " + cur.symbol + "10 more/week? Reach goal in ", React.createElement("strong", { className: "text-emerald-600" }, Math.max(1, Math.round(sgRemaining / ((sgWeeklyNeeded + 10) * 52 / 12))) + " months")),
                      React.createElement("p", { className: "text-xs text-slate-600" }, __alloT('stem.money.double_your_savings_reach_goal_in', "\u2022 Double your savings? Reach goal in "), React.createElement("strong", { className: "text-emerald-600" }, Math.max(1, Math.round(sgMonths / 2)) + " months"))
                    )
                  )
                ),

                // ── Financial Literacy Quiz ──
                finSub === 'quiz' && React.createElement("div", { className: "bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-5 border border-yellow-200 space-y-4" },
                  React.createElement("div", { className: "flex items-center justify-between" },
                    React.createElement("h3", { className: "text-base font-bold text-amber-800" }, __alloT('stem.money.financial_literacy_quiz', "\uD83E\uDDE0 Financial Literacy Quiz")),
                    React.createElement("button", { "aria-label": __alloT('stem.money.gen_fin_quiz', "Gen Fin Quiz"), onClick: genFinQuiz, className: "px-3 py-1.5 bg-amber-700 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all" }, d.fqIdx == null ? '\u2728 Start Quiz' : '\u21BB Next Question')
                  ),
                  d.fqIdx != null && (function () {
                    var fq = FIN_QUIZZES[d.fqIdx];
                    return React.createElement("div", { className: "space-y-3" },
                      React.createElement("div", { className: "bg-white rounded-lg border border-amber-100 p-4" },
                        React.createElement("p", { className: "text-sm text-slate-700 font-medium leading-relaxed" }, fq.q)
                      ),
                      React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" },
                        fq.choices.map(function (ch, ci) {
                          var selected = d.fqAnswer === ci;
                          var revealed = d.fqFb != null;
                          var isCorrect = ci === fq.correct;
                          var btnClass = revealed
                            ? (isCorrect ? 'border-green-500 bg-green-50 text-green-700' : (selected ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-600'))
                            : (selected ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md' : 'transition-colors border-slate-200 bg-white text-slate-600 hover:border-amber-600 hover:bg-amber-50');
                          return React.createElement("button", { key: ci, disabled: revealed, onClick: function () { upd('fqAnswer', ci); upd('fqFb', null); },
                            className: "p-3 rounded-xl border-2 text-sm font-bold text-left transition-all " + btnClass
                          }, String.fromCharCode(65 + ci) + '. ' + ch);
                        })
                      ),
                      d.fqAnswer != null && !d.fqFb && React.createElement("button", { "aria-label": __alloT('stem.money.submit_answer', "Submit Answer"), onClick: function () {
                        var ok = d.fqAnswer === fq.correct;
                        upd('fqFb', ok ? { ok: true, msg: '\u2705 Correct! ' + fq.explanation } : { ok: false, msg: '\u274C Not quite. ' + fq.explanation });
                        if (ok) {
                          if (typeof awardStemXP === 'function') awardStemXP('moneyMath', 20, 'finance quiz');
                          if (typeof addXP === 'function') addXP(20, 'Money Math: Financial literacy quiz');
                        }
                      }, className: "w-full px-4 py-2 bg-amber-700 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-sm" }, __alloT('stem.money.submit_answer_2', "\u2714 Submit Answer")),
                      d.fqFb && React.createElement("div", { className: "rounded-lg p-3 text-xs font-medium leading-relaxed " + (d.fqFb.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700') }, d.fqFb.msg),
                      d.fqFb && React.createElement("button", { "aria-label": __alloT('stem.money.next_question', "Next Question"), onClick: genFinQuiz, className: "w-full px-4 py-2 bg-amber-700 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-sm" }, __alloT('stem.money.next_question_2', "\u27A1\uFE0F Next Question"))
                    );
                  })()
                )
              ),

              // ══ COMPOUND INQUIRY widget (H7b'') ══
              tab === 'inquiry' && (function() {
                var iq = d.compInquiry || { principal: 1000, ratePct: 7, years: 30, contribMonthly: 100, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
                function setIQ(patch) { upd('compInquiry', Object.assign({}, iq, patch)); }
                function setKey(k, v) { var p = {}; p[k] = v; setIQ(p); }
                var r = iq.ratePct / 100;
                var n = iq.years;
                var monthly = r / 12;
                var months = n * 12;
                // FV principal: P*(1+r)^n
                var fvPrincipal = iq.principal * Math.pow(1 + monthly, months);
                // FV monthly contribution: PMT * [((1+i)^n - 1) / i]
                var fvContrib = monthly > 0 ? iq.contribMonthly * (Math.pow(1 + monthly, months) - 1) / monthly : iq.contribMonthly * months;
                var fv = fvPrincipal + fvContrib;
                var totalContrib = iq.principal + iq.contribMonthly * months;
                var interest = fv - totalContrib;
                var growthRatio = fv / Math.max(1, totalContrib);
                var state = growthRatio < 1.1 ? 'flat' : growthRatio < 1.5 ? 'modest' : growthRatio < 3 ? 'compounding' : growthRatio < 8 ? 'exponential' : 'astronomic';
                var sm = ({
                  flat: { label: __alloT('stem.money.flat', 'Flat'), color: '#94a3b8', bg: '#1e293b', border: '#475569', desc: __alloT('stem.money.almost_no_growth_either_zero_rate_or_v', 'Almost no growth. Either zero rate or very short horizon.') },
                  modest: { label: __alloT('stem.money.modest', 'Modest'), color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: __alloT('stem.money.money_grows_by_50_comparable_to_a_bond', 'Money grows by ~50%. Comparable to a bond fund or savings ladder.') },
                  compounding: { label: __alloT('stem.money.compounding_2', 'Compounding'), color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: __alloT('stem.money.money_doubles_or_triples_the_textbook_', 'Money doubles or triples. The textbook "magic of compound interest" zone.') },
                  exponential: { label: __alloT('stem.money.exponential', 'Exponential'), color: '#facc15', bg: '#2a2410', border: '#eab308', desc: __alloT('stem.money.money_grows_3_8x_long_horizon_good_rat', 'Money grows 3-8x. Long horizon + good rate. This is what 401(k) advice optimizes for.') },
                  astronomic: { label: __alloT('stem.money.astronomic', 'Astronomic'), color: '#fb923c', bg: '#2a1a0a', border: '#ea580c', desc: __alloT('stem.money.money_grows_8x_long_horizons_40_years_', 'Money grows 8x+. Long horizons (40+ years) at 8-10% start producing fortune-class outcomes.') }
                })[state];
                // SVG: growth curve
                var pts = [];
                for (var yr = 0; yr <= n; yr++) {
                  var m = yr * 12;
                  var v = iq.principal * Math.pow(1 + monthly, m) + (monthly > 0 ? iq.contribMonthly * (Math.pow(1 + monthly, m) - 1) / monthly : iq.contribMonthly * m);
                  pts.push({ x: yr, y: v });
                }
                // Guard against the all-zero slider case (principal=0, ratePct=0,
                // contribMonthly=0 → final balance=0 → /0 yields NaN, polyline silently
                // breaks). Matches the defensive pattern in skatelab + statslab.
                var maxY = Math.max(1, pts[pts.length - 1].y);
                var svgPts = pts.map(function(p) { return (30 + (p.x / n) * 280) + ',' + (130 - (p.y / maxY) * 110); }).join(' ');
                // Contribution-only line
                var contribPts = [];
                for (var yr2 = 0; yr2 <= n; yr2++) {
                  var c = iq.principal + iq.contribMonthly * 12 * yr2;
                  contribPts.push((30 + (yr2 / n) * 280) + ',' + (130 - (c / maxY) * 110));
                }
                return React.createElement("div", { className: "p-3 rounded-xl", style: { background: sm.bg, border: '1px solid ' + sm.border, color: '#e8f0f5' } },
                  React.createElement("h4", { className: "text-xs font-black uppercase tracking-wider mb-1", style: { color: sm.color } }, __alloT('stem.money.compound_interest_inquiry_2', '🔬 Compound Interest Inquiry')),
                  React.createElement("p", { className: "text-[10px] opacity-85 mb-2 leading-snug" }, __alloT('stem.money.set_starting_balance_rate_time_horizon', 'Set starting balance, rate, time horizon, and monthly contribution. Predict the growth ratio before reading it. No score, no reveal.')),
                  React.createElement("div", { className: "inline-block px-2 py-1 rounded-full text-[10px] font-bold mb-2", style: { background: sm.color, color: '#000' } }, sm.label + ' · FV $' + fv.toFixed(0) + ' (' + growthRatio.toFixed(2) + 'x contributions)'),
                  React.createElement("p", { className: "text-[10px] opacity-80 mb-2" }, sm.desc),
                  React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-2" },
                    [
                      { label: __alloT('stem.money.future_value', 'Future value'), val: '$' + fv.toFixed(0) },
                      { label: __alloT('stem.money.total_contributed', 'Total contributed'), val: '$' + totalContrib.toFixed(0) },
                      { label: __alloT('stem.money.interest_earned', 'Interest earned'), val: '$' + interest.toFixed(0) }
                    ].map(function(m) {
                      return React.createElement("div", { key: m.label, className: "p-1 rounded text-center", style: { background: '#0a0a1a', border: '1px solid ' + sm.border } },
                        React.createElement("div", { className: "text-[9px] opacity-60" }, m.label),
                        React.createElement("div", { className: "text-[11px] font-bold font-mono", style: { color: sm.color } }, m.val)
                      );
                    })
                  ),
                  React.createElement("svg", { width: '100%', height: 160, viewBox: '0 0 320 160', style: { background: '#0a0a1a', borderRadius: 6, marginBottom: 8 } },
                    React.createElement("line", { x1: 30, y1: 130, x2: 310, y2: 130, stroke: '#1e293b' }),
                    React.createElement("line", { x1: 30, y1: 18, x2: 30, y2: 130, stroke: '#1e293b' }),
                    React.createElement("polyline", { points: contribPts.join(' '), fill: 'none', stroke: '#94a3b8', strokeWidth: 1.5, strokeDasharray: '4 3' }),
                    React.createElement("polyline", { points: svgPts, fill: 'none', stroke: sm.color, strokeWidth: 2.5 }),
                    React.createElement("text", { x: 30, y: 14, fill: '#94a3b8', fontSize: 9 }, '$' + maxY.toFixed(0)),
                    React.createElement("text", { x: 160, y: 154, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, n + ' years · dashed = contributions only · solid = with compound interest')
                  ),
                  React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-2" },
                    React.createElement("label", { className: "text-[10px]" },
                      React.createElement("div", { className: "flex justify-between mb-0.5" }, React.createElement("span", null, __alloT('stem.money.starting_balance', 'Starting balance ($)')), React.createElement("span", { className: "font-mono font-bold", style: { color: sm.color } }, iq.principal)),
                      React.createElement("input", { type: 'range', min: 0, max: 50000, step: 100, value: iq.principal, onChange: function(e) { setKey('principal', parseInt(e.target.value, 10)); }, className: "w-full" })
                    ),
                    React.createElement("label", { className: "text-[10px]" },
                      React.createElement("div", { className: "flex justify-between mb-0.5" }, React.createElement("span", null, __alloT('stem.money.annual_rate_2', 'Annual rate (%)')), React.createElement("span", { className: "font-mono font-bold", style: { color: sm.color } }, iq.ratePct.toFixed(1))),
                      React.createElement("input", { type: 'range', min: 0, max: 15, step: 0.1, value: iq.ratePct, onChange: function(e) { setKey('ratePct', parseFloat(e.target.value)); }, className: "w-full" })
                    ),
                    React.createElement("label", { className: "text-[10px]" },
                      React.createElement("div", { className: "flex justify-between mb-0.5" }, React.createElement("span", null, __alloT('stem.money.years_2', 'Years')), React.createElement("span", { className: "font-mono font-bold", style: { color: sm.color } }, iq.years)),
                      React.createElement("input", { type: 'range', min: 1, max: 50, step: 1, value: iq.years, onChange: function(e) { setKey('years', parseInt(e.target.value, 10)); }, className: "w-full" })
                    ),
                    React.createElement("label", { className: "text-[10px]" },
                      React.createElement("div", { className: "flex justify-between mb-0.5" }, React.createElement("span", null, __alloT('stem.money.monthly_add', 'Monthly add ($)')), React.createElement("span", { className: "font-mono font-bold", style: { color: sm.color } }, iq.contribMonthly)),
                      React.createElement("input", { type: 'range', min: 0, max: 2000, step: 25, value: iq.contribMonthly, onChange: function(e) { setKey('contribMonthly', parseInt(e.target.value, 10)); }, className: "w-full" })
                    )
                  ),
                  React.createElement("div", { className: "flex gap-2 mb-2" },
                    React.createElement("button", { onClick: function() {
                      var t = new Date().toISOString().slice(11, 19);
                      setIQ({ log: iq.log.concat([{ t: t, P: iq.principal, r: iq.ratePct, n: iq.years, m: iq.contribMonthly, fv: fv.toFixed(0), state: sm.label }]) });
                    }, className: "flex-1 px-2 py-1 rounded text-[10px] font-bold", style: { background: sm.bg, color: sm.color, border: '1px solid ' + sm.border, cursor: 'pointer' } }, __alloT('stem.money.log_this_scenario', '📋 Log this scenario')),
                    React.createElement("button", { onClick: function() { setIQ({ principal: 1000, ratePct: 7, years: 30, contribMonthly: 100 }); }, className: "px-2 py-1 rounded text-[10px]", style: { background: '#0a0a1a', color: '#94a3b8', border: '1px solid #1e293b', cursor: 'pointer' } }, __alloT('stem.money.reset_2', 'Reset'))
                  ),
                  iq.log.length > 0 && React.createElement("div", { className: "p-1.5 rounded text-[9px] font-mono mb-2", style: { background: '#0a0a1a', maxHeight: 70, overflow: 'auto', border: '1px solid #1e293b' } },
                    iq.log.slice(-5).map(function(e, i) { return React.createElement("div", { key: i }, e.t + '  ' + e.state + ' · P$' + e.P + ' r' + e.r + '% n' + e.n + 'y +$' + e.m + '/mo → $' + e.fv); })
                  ),
                  React.createElement("label", { className: "block text-[10px] font-bold opacity-85 mb-1" }, __alloT('stem.money.your_hypothesis_which_lever_rate_time_', 'Your hypothesis (which lever — rate, time, or contribution — has the most asymmetric power?)')),
                  React.createElement("textarea", { value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: __alloT('stem.money.e_g_starting_10_years_earlier_with_0_s', 'e.g., starting 10 years earlier with $0 still beats waiting 10 years and starting with $20k...'), className: "w-full p-1.5 rounded text-[10px] mb-2", style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
                  !iq.stuckRevealed && React.createElement("button", { onClick: function() { setIQ({ stuckRevealed: true }); }, className: "px-2 py-1 rounded text-[10px] font-bold mb-2", style: { background: '#0a0a1a', color: sm.color, border: '1px solid #1e293b', cursor: 'pointer' } }, __alloT('stem.money.i_m_stuck_show_open_questions', "🤔 I'm stuck - show open questions")),
                  iq.stuckRevealed && React.createElement("div", { className: "p-2 rounded text-[10px] mb-2", style: { background: '#0a0a1a', border: '1px dashed ' + sm.border, lineHeight: 1.5 } },
                    React.createElement("div", { className: "font-bold mb-1", style: { color: sm.color } }, __alloT('stem.money.open_questions_no_answer_key', 'Open questions (no answer key)')),
                    React.createElement("ul", { className: "pl-4 m-0" },
                      React.createElement("li", null, __alloT('stem.money.rule_of_72_years_to_double_72_rate_che', 'Rule of 72: years to double = 72/rate. Check it at r=6% (should be 12 yrs).')),
                      React.createElement("li", null, __alloT('stem.money.starting_at_25_with_200_mo_vs_45_with_', 'Starting at 25 with $200/mo vs 45 with $400/mo at age 65 — which gives more? Why?')),
                      React.createElement("li", null, __alloT('stem.money.when_does_inflation_eat_your_gains_rea', 'When does inflation eat your gains? (Real rate = nominal rate - inflation.)')),
                      React.createElement("li", null, __alloT('stem.money.why_is_the_gap_between_dashed_and_soli', 'Why is the gap between dashed and solid line so much bigger in the last 10 years than the first 10?'))
                    )
                  ),
                  React.createElement("label", { className: "flex items-center gap-2 text-[10px] font-bold cursor-pointer mb-1" },
                    React.createElement("input", { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
                    React.createElement("span", null, __alloT('stem.money.i_can_explain_why_this_principal_rate_', 'I can explain why this principal/rate/time/contribution combination produces this growth state.'))
                  ),
                  iq.understood && React.createElement("textarea", { value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: __alloT('stem.money.explain_in_your_own_words', 'Explain in your own words...'), className: "w-full p-1.5 rounded text-[10px] mb-1", style: { background: '#0a0a1a', border: '1px solid ' + sm.border, color: '#e8f0f5', resize: 'vertical' } }),
                  React.createElement("p", { className: "m-0 text-[9px] italic opacity-60" }, __alloT('stem.money.inquiry_widget_no_score_no_reveal_no_a', 'Inquiry widget - no score, no reveal, no answer dump. Compound interest assumes constant rate, no taxes, no inflation. Real-world returns are volatile (sequence-of-returns risk) and net of taxes + inflation.'))
                );
              })(),

              // ── Educational Footer ──
              React.createElement("div", { className: "bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-200 text-center" },
                React.createElement("p", { className: "text-[11px] text-emerald-600" }, "\uD83C\uDF1F ", React.createElement("strong", null, __alloT('stem.money.financial_literacy', "Financial literacy")), __alloT('stem.money.is_one_of_the_most_important_life_skil', " is one of the most important life skills. Practice with real-world scenarios to build confidence with money!")),
                React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, __alloT('stem.money.exchange_rates_are_approximate_and_for', "Exchange rates are approximate and for educational purposes only."))
              ),

              // ═══ DOLLAR ANATOMY ═══
              React.createElement('div', { className: 'mt-5 rounded-2xl border border-emerald-300 bg-white p-3 shadow-sm' },
                React.createElement('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
                  React.createElement('div', null,
                    React.createElement('h4', { className: 'text-sm font-bold text-emerald-700' }, __alloT('stem.money.one_dollar_feature_map', 'U.S. $1 Note - Accurate feature map')),
                    React.createElement('p', { className: 'text-xs text-slate-600 mt-1' }, __alloT('stem.money.dollar_lab_summary_front_back', 'Flip between both sides to explore the current $1 note, its identifiers, materials, symbols, and genuine security features.'))
                  ),
                  React.createElement('button', {
                    type: 'button',
                    onClick: function () { sfxMoneyClick(); upd('showDollarLab', !showDollarLab); },
                    'aria-expanded': showDollarLab,
                    className: 'px-3 py-2 rounded-lg text-xs font-bold border border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }, showDollarLab ? __alloT('stem.money.hide_dollar_lab', 'Hide mini lab') : __alloT('stem.money.open_dollar_lab', 'Open mini lab'))
                ),
                showDollarLab && React.createElement('div', { className: 'mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2' },
                  React.createElement('div', { role: 'group', 'aria-label': __alloT('stem.money.choose_note_side', 'Choose which side of the one-dollar note to explore'), className: 'inline-flex rounded-lg border border-emerald-300 bg-emerald-50 p-1 self-start' },
                    React.createElement('button', { type: 'button', 'aria-pressed': dollarSide === 'front', onClick: function () { sfxMoneyClick(); upd('dollarSide', 'front'); upd('dollarFeatureIndex', 0); }, className: 'px-3 py-1.5 rounded-md text-xs font-bold transition-colors ' + (dollarSide === 'front' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-800 hover:bg-emerald-100') }, __alloT('stem.money.front_obverse', 'Front (obverse)')),
                    React.createElement('button', { type: 'button', 'aria-pressed': dollarSide === 'back', onClick: function () { sfxMoneyClick(); upd('dollarSide', 'back'); upd('dollarFeatureIndex', 0); }, className: 'px-3 py-1.5 rounded-md text-xs font-bold transition-colors ' + (dollarSide === 'back' ? 'bg-emerald-700 text-white shadow-sm' : 'text-emerald-800 hover:bg-emerald-100') }, __alloT('stem.money.back_reverse', 'Back (reverse)'))
                  ),
                  React.createElement('p', { className: 'text-[11px] text-slate-600' }, dollarSide === 'back' ? __alloT('stem.money.back_side_hint', 'Explore both sides of the Great Seal and their symbols.') : __alloT('stem.money.front_side_hint', 'Explore portrait, identifiers, seals, paper, and printing.'))
                ),
                showDollarLab && React.createElement('div', { className: 'mt-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5' },
                  React.createElement('div', { className: 'flex flex-wrap items-center justify-between gap-2 mb-2' },
                    React.createElement('p', { className: 'text-[11px] font-bold uppercase tracking-wide text-emerald-800' }, __alloT('stem.money.feature_callouts', 'Feature callouts')),
                    React.createElement('button', { type: 'button', disabled: dollarReducedMotion, onClick: function () { sfxMoneyClick(); upd('dollarAutoPlay', !dollarAutoPlayRequested); }, 'aria-pressed': dollarAutoPlay, className: 'px-2.5 py-1 rounded-md border text-[11px] font-bold transition-colors ' + (dollarReducedMotion ? 'border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed' : dollarAutoPlay ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-emerald-400 bg-white text-emerald-800 hover:bg-emerald-100') }, dollarReducedMotion ? __alloT('stem.money.auto_tour_reduced_motion', 'Auto tour off - reduced motion') : dollarAutoPlay ? __alloT('stem.money.stop_auto_tour', 'Pause auto tour') : __alloT('stem.money.start_auto_tour', 'Start auto tour'))
                  ),
                  React.createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5' },
                    dollarFeatureGuide.map(function (feature, fi) {
                      var isSelected = !dollarAutoPlay && dollarFeatureIndex === fi;
                      return React.createElement('button', { key: dollarSide + '-feature-' + fi, type: 'button', 'aria-pressed': isSelected, onClick: function () { sfxMoneyClick(); upd('dollarFeatureIndex', fi); upd('dollarAutoPlay', false); }, className: 'min-h-[38px] px-2 py-1.5 rounded-md border text-[10px] font-bold leading-tight text-left transition-colors ' + (isSelected ? 'border-emerald-600 bg-emerald-700 text-white shadow-sm' : 'border-emerald-200 bg-white text-emerald-900 hover:border-emerald-400 hover:bg-emerald-100') },
                        React.createElement('span', { className: 'inline-flex items-center justify-center w-4 h-4 rounded-full mr-1 text-[9px]', style: { background: feature.color, color: '#052e2b' } }, fi + 1),
                        feature.label
                      );
                    })
                  ),
                  React.createElement('p', { 'aria-live': 'polite', className: 'mt-2 text-[11px] leading-relaxed text-slate-700' }, dollarAutoPlay ? __alloT('stem.money.auto_tour_status', 'Auto tour is cycling through the callouts. Choose any feature to pause and inspect it.') : React.createElement(React.Fragment, null, React.createElement('strong', { className: 'text-emerald-800' }, dollarFeatureGuide[dollarFeatureIndex].label + ': '), dollarFeatureGuide[dollarFeatureIndex].detail))
                ),
                showDollarLab && React.createElement('div', { className: 'mt-2 rounded-xl overflow-hidden border border-emerald-200', style: { background: '#022c22', height: 'clamp(380px, 70vw, 430px)' } },
                  React.createElement('canvas', {
                    'role': 'img',
                    tabIndex: 0,
                    'aria-label': dollarSide === 'back' ? __alloT('stem.money.detailed_back_of_one_dollar_note', 'Detailed educational diagram of the back of a U.S. one-dollar note. Callouts identify the unfinished pyramid, Eye of Providence, Roman numeral 1776, bald eagle and shield, olive branch and arrows, and E Pluribus Unum motto.') : __alloT('stem.money.detailed_view_of_a_us_one_dollar_note', 'Detailed educational diagram of the front of a U.S. one-dollar note. Callouts identify raised printing, cotton-linen paper, embedded red and blue fibers, two serial numbers, the Federal Reserve Bank seal, and the Treasury seal. The one-dollar note does not have a watermark, security thread, or color-shifting ink.'),
                    ref: function(cvEl) {
                      if (!cvEl) return;
                      cvEl._dbSide = dollarSide;
                      cvEl._dbFeatures = dollarFeatureGuide;
                      cvEl._dbFeatureIndex = dollarFeatureIndex;
                      cvEl._dbAutoPlay = dollarAutoPlay;
                      if (cvEl._dbAnim) { cvEl._dbForcePaint = true; return; }
                      var c2 = cvEl.getContext('2d');
                      var W = cvEl.offsetWidth || 600;
                      var H = cvEl.offsetHeight || 180;
                      cvEl.width = W * 2; cvEl.height = H * 2;
                      c2.scale(2, 2);
                      var start = performance.now();
                      var lastBlink = -1;
                      var lastSide = '';
                      function drawDb() {
                        if (!cvEl.isConnected) { cancelAnimationFrame(cvEl._dbAnim); if (cvEl._dbRO) cvEl._dbRO.disconnect(); return; }
                        var t = (performance.now() - start) / 1000;
                        var side = cvEl._dbSide || 'front';
                        var features = cvEl._dbFeatures || [];
                        var manualFeature = Math.max(0, Math.min(features.length - 1, Number(cvEl._dbFeatureIndex) || 0));
                        var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                        var blink = cvEl._dbAutoPlay && !reduceMotion ? Math.floor((t * 0.42) % features.length) : manualFeature;
                        // Repaint when the highlighted feature or selected side changes.
                        if (side !== lastSide) { lastSide = side; lastBlink = -1; }
                        if (blink === lastBlink && !cvEl._dbForcePaint) { cvEl._dbAnim = requestAnimationFrame(drawDb); return; }
                        cvEl._dbForcePaint = false;
                        lastBlink = blink;
                        var compact = W < 620;
                        var bx = compact ? W * 0.08 : W * 0.045;
                        var bw = compact ? W * 0.84 : W * 0.62;
                        var bh = bw / 2.35; // A U.S. note is about 6.14 x 2.61 inches.
                        var by = compact ? 28 : Math.max(48, (H - bh) * 0.34);
                        var ink = '#173f34';
                        var fineInk = 'rgba(23,63,52,0.62)';
                        var paper = c2.createLinearGradient(bx, by, bx + bw, by + bh);
                        paper.addColorStop(0, '#edf2e7'); paper.addColorStop(0.5, '#dfe8d8'); paper.addColorStop(1, '#eef3e9');
                        function fitText(text, x, y, maxWidth, size, weight, align) {
                          var fitted = size;
                          c2.textAlign = align || 'left';
                          do { c2.font = (weight ? weight + ' ' : '') + fitted + 'px sans-serif'; fitted -= 0.5; }
                          while (c2.measureText(text).width > maxWidth && fitted > 6);
                          c2.fillText(text, x, y);
                        }
                        function drawSeal(x, y, radius, fill, top, center, bottom) {
                          c2.fillStyle = fill; c2.beginPath(); c2.arc(x, y, radius, 0, Math.PI * 2); c2.fill();
                          c2.strokeStyle = '#eef3e9'; c2.lineWidth = 1; c2.beginPath(); c2.arc(x, y, radius - 3, 0, Math.PI * 2); c2.stroke();
                          c2.fillStyle = '#eef3e9'; c2.textAlign = 'center'; c2.font = 'bold ' + Math.max(5, radius * 0.27) + 'px serif'; c2.fillText(top, x, y - radius * 0.28);
                          c2.font = 'bold ' + (radius * 0.58) + 'px serif'; c2.fillText(center, x, y + radius * 0.2);
                          c2.font = 'bold ' + Math.max(4, radius * 0.22) + 'px serif'; c2.fillText(bottom, x, y + radius * 0.55);
                        }

                        c2.fillStyle = '#022c22'; c2.fillRect(0, 0, W, H);
                        c2.fillStyle = '#a7f3d0'; fitText(side === 'back' ? __alloT('stem.money.back_educational_illustration', 'BACK - EDUCATIONAL ILLUSTRATION') : __alloT('stem.money.front_educational_illustration', 'FRONT - EDUCATIONAL ILLUSTRATION'), bx, 17, bw, compact ? 10 : 12, 'bold');
                        c2.fillStyle = paper; c2.fillRect(bx, by, bw, bh);
                        c2.strokeStyle = ink; c2.lineWidth = 2; c2.strokeRect(bx, by, bw, bh);
                        c2.strokeStyle = fineInk; c2.lineWidth = 0.8; c2.strokeRect(bx + 5, by + 5, bw - 10, bh - 10); c2.strokeRect(bx + 10, by + 10, bw - 20, bh - 20);

                        // Fine-line guilloche border and embedded security fibers.
                        for (var i = 0; i < 22; i++) {
                          var gx = bx + 12 + i * ((bw - 24) / 21);
                          c2.beginPath(); c2.moveTo(gx, by + 7); c2.quadraticCurveTo(gx + 5, by + 14, gx + 10, by + 7); c2.stroke();
                          c2.beginPath(); c2.moveTo(gx, by + bh - 7); c2.quadraticCurveTo(gx + 5, by + bh - 14, gx + 10, by + bh - 7); c2.stroke();
                        }
                        [[.08,.28,'#dc2626'],[.17,.73,'#2563eb'],[.29,.19,'#dc2626'],[.38,.82,'#2563eb'],[.52,.25,'#2563eb'],[.61,.70,'#dc2626'],[.74,.17,'#2563eb'],[.83,.61,'#dc2626'],[.91,.34,'#2563eb']].forEach(function(fp) {
                          c2.strokeStyle = fp[2]; c2.lineWidth = 1.1; c2.beginPath(); c2.moveTo(bx + bw * fp[0], by + bh * fp[1]); c2.lineTo(bx + bw * fp[0] + 4, by + bh * fp[1] + 2); c2.stroke();
                        });

                        // Note typography, identifiers, seals, and a stylized portrait vignette.
                        if (side === 'back') {
                          // Reverse: both sides of the Great Seal and their major symbols.
                          var backFs = Math.max(6, Math.min(11, bw / 54));
                          c2.fillStyle = ink; c2.textAlign = 'center'; c2.font = 'bold ' + (backFs * 1.15) + 'px serif'; c2.fillText('THE UNITED STATES OF AMERICA', bx + bw / 2, by + 22);
                          c2.font = 'bold ' + Math.max(22, bh * 0.22) + 'px serif'; c2.fillStyle = 'rgba(23,63,52,.16)'; c2.fillText('ONE', bx + bw / 2, by + bh * 0.63);
                          c2.fillStyle = ink; c2.font = 'bold ' + (backFs * 0.9) + 'px serif'; c2.fillText('IN GOD WE TRUST', bx + bw / 2, by + 39);
                          var leftX = bx + bw * 0.27, rightX = bx + bw * 0.73, sealY = by + bh * 0.54, sealR = Math.min(bw * 0.16, bh * 0.34);
                          c2.strokeStyle = ink; c2.lineWidth = 1.4; c2.beginPath(); c2.arc(leftX, sealY, sealR, 0, Math.PI * 2); c2.stroke(); c2.beginPath(); c2.arc(rightX, sealY, sealR, 0, Math.PI * 2); c2.stroke();

                          // Reverse of the Great Seal: Eye of Providence and 13-level unfinished pyramid.
                          var pyramidTop = sealY - sealR * 0.34, pyramidBase = sealY + sealR * 0.54;
                          c2.strokeStyle = ink; c2.lineWidth = 1;
                          for (var si = 0; si < 13; si++) {
                            var sy = pyramidTop + si * ((pyramidBase - pyramidTop) / 12);
                            var half = sealR * (0.10 + si * 0.047);
                            c2.beginPath(); c2.moveTo(leftX - half, sy); c2.lineTo(leftX + half, sy); c2.stroke();
                          }
                          c2.beginPath(); c2.moveTo(leftX - sealR * .67, pyramidBase); c2.lineTo(leftX, pyramidTop); c2.lineTo(leftX + sealR * .67, pyramidBase); c2.stroke();
                          c2.beginPath(); c2.ellipse(leftX, sealY - sealR * .62, sealR * .24, sealR * .12, 0, 0, Math.PI * 2); c2.stroke();
                          c2.fillStyle = ink; c2.beginPath(); c2.arc(leftX, sealY - sealR * .62, 1.8, 0, Math.PI * 2); c2.fill();
                          c2.font = 'bold ' + (backFs * .62) + 'px serif'; c2.fillText('ANNUIT COEPTIS', leftX, sealY - sealR * .82); c2.fillText('NOVUS ORDO SECLORUM', leftX, sealY + sealR * .78);
                          c2.font = 'bold ' + (backFs * .68) + 'px serif'; c2.fillText('MDCCLXXVI', leftX, pyramidBase + backFs);

                          // Obverse of the Great Seal: eagle, shield, olive branch, arrows, and scroll.
                          c2.fillStyle = '#b8c9b2'; c2.strokeStyle = ink; c2.lineWidth = 1.1;
                          c2.beginPath(); c2.moveTo(rightX, sealY - sealR * .12); c2.bezierCurveTo(rightX - sealR * .25, sealY - sealR * .62, rightX - sealR * .78, sealY - sealR * .58, rightX - sealR * .72, sealY - sealR * .05); c2.bezierCurveTo(rightX - sealR * .42, sealY - sealR * .28, rightX - sealR * .25, sealY + sealR * .05, rightX, sealY + sealR * .24); c2.fill(); c2.stroke();
                          c2.beginPath(); c2.moveTo(rightX, sealY - sealR * .12); c2.bezierCurveTo(rightX + sealR * .25, sealY - sealR * .62, rightX + sealR * .78, sealY - sealR * .58, rightX + sealR * .72, sealY - sealR * .05); c2.bezierCurveTo(rightX + sealR * .42, sealY - sealR * .28, rightX + sealR * .25, sealY + sealR * .05, rightX, sealY + sealR * .24); c2.fill(); c2.stroke();
                          c2.beginPath(); c2.ellipse(rightX, sealY, sealR * .23, sealR * .39, 0, 0, Math.PI * 2); c2.fill(); c2.stroke();
                          c2.beginPath(); c2.arc(rightX + sealR * .12, sealY - sealR * .36, sealR * .13, 0, Math.PI * 2); c2.fill(); c2.stroke();
                          c2.fillStyle = '#dfe8d8'; c2.fillRect(rightX - sealR * .21, sealY - sealR * .05, sealR * .42, sealR * .43); c2.strokeRect(rightX - sealR * .21, sealY - sealR * .05, sealR * .42, sealR * .43);
                          for (var stripe = 1; stripe < 7; stripe++) { c2.beginPath(); c2.moveTo(rightX - sealR * .21 + stripe * sealR * .06, sealY + sealR * .10); c2.lineTo(rightX - sealR * .21 + stripe * sealR * .06, sealY + sealR * .38); c2.stroke(); }
                          c2.beginPath(); c2.moveTo(rightX - sealR * .62, sealY + sealR * .47); c2.lineTo(rightX - sealR * .18, sealY + sealR * .31); c2.stroke();
                          for (var leaf = 0; leaf < 4; leaf++) { c2.beginPath(); c2.ellipse(rightX - sealR * (.55 - leaf * .11), sealY + sealR * (.42 - leaf * .04), sealR * .07, sealR * .035, -.45, 0, Math.PI * 2); c2.stroke(); }
                          for (var arrow = 0; arrow < 3; arrow++) { var ay = sealY + sealR * (.37 + arrow * .055); c2.beginPath(); c2.moveTo(rightX + sealR * .20, ay); c2.lineTo(rightX + sealR * .63, ay + sealR * .10); c2.stroke(); }
                          c2.fillStyle = '#eef3e9'; c2.beginPath(); c2.ellipse(rightX, sealY - sealR * .54, sealR * .51, sealR * .12, 0, 0, Math.PI * 2); c2.fill(); c2.stroke();
                          c2.fillStyle = ink; c2.font = 'bold ' + (backFs * .62) + 'px serif'; c2.fillText('E PLURIBUS UNUM', rightX, sealY - sealR * .51);
                          c2.font = 'bold ' + (backFs * .55) + 'px serif'; c2.fillText('THE GREAT SEAL', leftX, by + bh - 19); c2.fillText('OF THE UNITED STATES', rightX, by + bh - 19);
                          c2.font = 'bold ' + (backFs * 1.15) + 'px serif'; c2.fillText('ONE DOLLAR', bx + bw / 2, by + bh - 6);
                          c2.font = 'bold ' + Math.max(18, bh * .20) + 'px serif'; c2.fillText('1', bx + 19, by + 29); c2.fillText('1', bx + bw - 19, by + 29); c2.fillText('1', bx + 19, by + bh - 10); c2.fillText('1', bx + bw - 19, by + bh - 10);
                        } else {
                          var fs = Math.max(6, Math.min(11, bw / 54));
                          c2.fillStyle = ink; c2.textAlign = 'center'; c2.font = 'bold ' + fs + 'px serif'; c2.fillText('FEDERAL RESERVE NOTE', bx + bw / 2, by + 18);
                          c2.font = 'bold ' + (fs * 1.12) + 'px serif'; c2.fillText('THE UNITED STATES OF AMERICA', bx + bw / 2, by + 33);
                          fitText('THIS NOTE IS LEGAL TENDER FOR ALL DEBTS, PUBLIC AND PRIVATE', bx + bw / 2, by + 44, bw * 0.62, fs * 0.72, '', 'center');
                          var px = bx + bw * 0.5, py = by + bh * 0.54, prx = bw * 0.115, pry = bh * 0.34;
                          c2.strokeStyle = ink; c2.lineWidth = 1.4; c2.beginPath(); c2.ellipse(px, py, prx, pry, 0, 0, Math.PI * 2); c2.stroke();
                          c2.fillStyle = '#b8c9b2'; c2.beginPath(); c2.arc(px, py - pry * 0.22, pry * 0.25, 0, Math.PI * 2); c2.fill();
                          c2.beginPath(); c2.ellipse(px, py + pry * 0.34, prx * 0.55, pry * 0.38, 0, Math.PI, Math.PI * 2); c2.fill();
                          c2.fillStyle = ink; c2.font = 'bold ' + (fs * 0.72) + 'px serif'; c2.fillText('WASHINGTON', px, by + bh - 17);
                          drawSeal(bx + bw * 0.26, by + bh * 0.55, Math.max(14, bh * 0.18), '#202923', 'FEDERAL', 'B', 'RESERVE');
                          drawSeal(bx + bw * 0.74, by + bh * 0.55, Math.max(14, bh * 0.18), '#207149', 'TREASURY', '1789', 'SEAL');
                          c2.fillStyle = '#207149'; c2.textAlign = 'left'; c2.font = 'bold ' + (fs * 1.1) + 'px monospace'; c2.fillText('B 12345678 G', bx + bw * 0.13, by + bh * 0.30); c2.fillText('B 12345678 G', bx + bw * 0.64, by + bh * 0.82);
                          c2.fillStyle = ink; c2.font = (fs * 0.68) + 'px serif'; c2.fillText('SERIES 2021', bx + bw * 0.67, by + bh * 0.68);
                          c2.textAlign = 'center'; c2.font = 'bold ' + (fs * 1.15) + 'px serif'; c2.fillText('ONE DOLLAR', bx + bw / 2, by + bh - 6);
                          c2.font = 'bold ' + Math.max(18, bh * 0.20) + 'px serif'; c2.fillText('1', bx + 19, by + 29); c2.fillText('1', bx + bw - 19, by + 29); c2.fillText('1', bx + 19, by + bh - 10); c2.fillText('1', bx + bw - 19, by + bh - 10);
                        }

                        var anchors = side === 'back' ? [[bx + bw * .27, by + bh * .61],[bx + bw * .27, by + bh * .33],[bx + bw * .27, by + bh * .77],[bx + bw * .73, by + bh * .53],[bx + bw * .73, by + bh * .72],[bx + bw * .73, by + bh * .35]] : [[bx + bw * .5, by + 18],[bx + bw * .4, by + bh * .88],[bx + bw * .17, by + bh * .73],[bx + bw * .2, by + bh * .3],[bx + bw * .26, by + bh * .55],[bx + bw * .74, by + bh * .55]];
                        anchors.forEach(function(a, ai) {
                          var selected = ai === blink;
                          c2.fillStyle = features[ai].color; c2.strokeStyle = selected ? '#fff' : '#064e3b'; c2.lineWidth = selected ? 2.5 : 1;
                          c2.beginPath(); c2.arc(a[0], a[1], selected ? 8 : 6, 0, Math.PI * 2); c2.fill(); c2.stroke();
                          c2.fillStyle = '#052e2b'; c2.font = 'bold 8px sans-serif'; c2.textAlign = 'center'; c2.fillText(String(ai + 1), a[0], a[1] + 3);
                        });

                        var panelX = compact ? 10 : W * 0.70;
                        var labelTop = compact ? by + bh + 20 : 38;
                        var colW = compact ? W / 2 : W * 0.285;
                        var rowH = compact ? 32 : Math.max(35, (H - 104) / features.length);
                        features.forEach(function(f, fi) {
                          var selected = fi === blink;
                          var lx = compact ? panelX + (fi % 2) * colW : panelX;
                          var ly = compact ? labelTop + Math.floor(fi / 2) * rowH : labelTop + fi * rowH;
                          c2.fillStyle = selected ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.04)'; c2.fillRect(lx, ly - 14, colW - 8, 24);
                          c2.fillStyle = f.color; c2.beginPath(); c2.arc(lx + 10, ly - 2, 8, 0, Math.PI * 2); c2.fill();
                          c2.fillStyle = '#052e2b'; c2.font = 'bold 8px sans-serif'; c2.textAlign = 'center'; c2.fillText(String(fi + 1), lx + 10, ly + 1);
                          c2.fillStyle = selected ? f.color : '#d1fae5'; fitText(f.label, lx + 23, ly + 2, colW - 34, compact ? 9 : 11, selected ? 'bold' : '');
                        });
                        c2.fillStyle = 'rgba(0,0,0,.76)'; c2.fillRect(8, H - 50, W - 16, 42);
                        c2.fillStyle = features[blink].color; fitText(features[blink].label + ': ' + features[blink].detail, W / 2, H - 31, W - 30, compact ? 9 : 11, 'bold', 'center');
                        c2.fillStyle = '#a7f3d0'; fitText(side === 'back' ? __alloT('stem.money.great_seal_1935_fact', 'Both sides of the Great Seal first appeared together on $1 paper money in 1935.') : __alloT('stem.money.one_dollar_no_modern_features', 'Important: the $1 note has no watermark, security thread, or color-shifting ink.'), W / 2, H - 15, W - 30, compact ? 8 : 10, '', 'center');
                        cvEl._dbAnim = requestAnimationFrame(drawDb);
                      }
                      drawDb();
                      var ro = new ResizeObserver(function() {
                        W = cvEl.offsetWidth; H = cvEl.offsetHeight;
                        cvEl.width = W * 2; cvEl.height = H * 2;
                        c2.setTransform(1, 0, 0, 1, 0, 0); c2.scale(2, 2); // reset first — scale() is cumulative, repeated resizes blew up the transform
                        lastBlink = -1; // force a repaint at the new size
                      });
                      cvEl._dbRO = ro; // stored so the rAF teardown can disconnect it (was leaking on unmount)
                      ro.observe(cvEl);
                    },
                    style: { width: '100%', height: '100%', display: 'block' }
                  })
                )
              )
            );

    }
  });
})();
