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

            // ── Currency definitions ──
            const CURRENCIES = {
              USD: { symbol: '$', name: 'US Dollar', code: 'USD', flag: '\uD83C\uDDFA\uD83C\uDDF8',
                coins: [
                  { name: 'Penny', value: 0.01, color: '#b87333', size: 28, label: '1\u00A2' },
                  { name: 'Nickel', value: 0.05, color: '#C0C0C0', size: 32, label: '5\u00A2' },
                  { name: 'Dime', value: 0.10, color: '#C0C0C0', size: 26, label: '10\u00A2' },
                  { name: 'Quarter', value: 0.25, color: '#C0C0C0', size: 36, label: '25\u00A2' },
                  { name: 'Half Dollar', value: 0.50, color: '#C0C0C0', size: 40, label: '50\u00A2' },
                  { name: 'Dollar Coin', value: 1.00, color: '#FFD700', size: 38, label: '$1' }
                ],
                bills: [
                  { name: '$1 Bill', value: 1, color: '#85bb65' },
                  { name: '$5 Bill', value: 5, color: '#85bb65' },
                  { name: '$10 Bill', value: 10, color: '#85bb65' },
                  { name: '$20 Bill', value: 20, color: '#85bb65' },
                  { name: '$50 Bill', value: 50, color: '#85bb65' },
                  { name: '$100 Bill', value: 100, color: '#85bb65' }
                ]
              },
              EUR: { symbol: '\u20AC', name: 'Euro', code: 'EUR', flag: '\uD83C\uDDEA\uD83C\uDDFA',
                coins: [
                  { name: '1 Cent', value: 0.01, color: '#b87333', size: 24, label: '1c' },
                  { name: '2 Cent', value: 0.02, color: '#b87333', size: 26, label: '2c' },
                  { name: '5 Cent', value: 0.05, color: '#b87333', size: 28, label: '5c' },
                  { name: '10 Cent', value: 0.10, color: '#FFD700', size: 28, label: '10c' },
                  { name: '20 Cent', value: 0.20, color: '#FFD700', size: 30, label: '20c' },
                  { name: '50 Cent', value: 0.50, color: '#FFD700', size: 32, label: '50c' },
                  { name: '\u20AC1', value: 1.00, color: '#C0C0C0', size: 34, label: '\u20AC1' },
                  { name: '\u20AC2', value: 2.00, color: '#C0C0C0', size: 36, label: '\u20AC2' }
                ],
                bills: [
                  { name: '\u20AC5', value: 5, color: '#808080' }, { name: '\u20AC10', value: 10, color: '#D2691E' },
                  { name: '\u20AC20', value: 20, color: '#4169E1' }, { name: '\u20AC50', value: 50, color: '#FF8C00' },
                  { name: '\u20AC100', value: 100, color: '#228B22' }, { name: '\u20AC200', value: 200, color: '#DAA520' }
                ]
              },
              GBP: { symbol: '\u00A3', name: 'British Pound', code: 'GBP', flag: '\uD83C\uDDEC\uD83C\uDDE7',
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
              CAD: { symbol: 'C$', name: 'Canadian Dollar', code: 'CAD', flag: '\uD83C\uDDE8\uD83C\uDDE6',
                coins: [
                  { name: '1\u00A2', value: 0.01, color: '#b87333', size: 26, label: '1\u00A2' },
                  { name: '5\u00A2', value: 0.05, color: '#C0C0C0', size: 28, label: '5\u00A2' },
                  { name: '10\u00A2', value: 0.10, color: '#C0C0C0', size: 26, label: '10\u00A2' },
                  { name: '25\u00A2', value: 0.25, color: '#C0C0C0', size: 30, label: '25\u00A2' },
                  { name: 'Loonie', value: 1.00, color: '#FFD700', size: 34, label: '$1' },
                  { name: 'Toonie', value: 2.00, color: '#C0C0C0', size: 36, label: '$2' }
                ],
                bills: [
                  { name: 'C$5', value: 5, color: '#4169E1' }, { name: 'C$10', value: 10, color: '#8B008B' },
                  { name: 'C$20', value: 20, color: '#228B22' }, { name: 'C$50', value: 50, color: '#DC143C' },
                  { name: 'C$100', value: 100, color: '#DAA520' }
                ]
              },
              JPY: { symbol: '\u00A5', name: 'Japanese Yen', code: 'JPY', flag: '\uD83C\uDDEF\uD83C\uDDF5',
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
              MXN: { symbol: 'MX$', name: 'Mexican Peso', code: 'MXN', flag: '\uD83C\uDDF2\uD83C\uDDFD',
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
              AUD: { symbol: 'A$', name: 'Australian Dollar', code: 'AUD', flag: '\uD83C\uDDE6\uD83C\uDDFA',
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
              INR: { symbol: '\u20B9', name: 'Indian Rupee', code: 'INR', flag: '\uD83C\uDDEE\uD83C\uDDF3',
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

            // ── Approximate exchange rates (for educational use) ──
            const RATES = { USD: 1, EUR: 0.92, GBP: 0.79, CAD: 1.36, JPY: 149.5, MXN: 17.1, AUD: 1.54, INR: 83.1 };
            const convert = (amount, from, to) => amount / RATES[from] * RATES[to];

            // ── Grade-specific config ──
            const GRADE_CONFIG = {
              elementary: { label: '\uD83C\uDFEB Elementary (K\u20135)', maxPrice: 10, coinsOnly: false, includePercent: false, includeTax: false, maxItems: 4, wordProblemLevel: 'simple' },
              middle: { label: '\uD83C\uDFEB Middle (6\u20138)', maxPrice: 50, coinsOnly: false, includePercent: true, includeTax: false, maxItems: 6, wordProblemLevel: 'moderate' },
              high: { label: '\uD83C\uDFEB High School (9\u201312)', maxPrice: 200, coinsOnly: false, includePercent: true, includeTax: true, maxItems: 8, wordProblemLevel: 'advanced' },
              college: { label: '\uD83C\uDFEB College', maxPrice: 1000, coinsOnly: false, includePercent: true, includeTax: true, maxItems: 10, wordProblemLevel: 'expert' }
            };
            const gc = GRADE_CONFIG[grade] || GRADE_CONFIG.elementary;

            // ── Board state for coin counting ──
            var placed = d.placed || [];
            var boardTotal = placed.reduce(function (s, p) { return s + p.value; }, 0);

            // ── Making Change state ──
            var changePrice = typeof d.changePrice === 'number' ? d.changePrice : 0;
            var changePaid = typeof d.changePaid === 'number' ? d.changePaid : 0;
            var changeAnswer = typeof d.changeAnswer === 'number' ? d.changeAnswer : null;
            var changeFeedback = d.changeFeedback || null;

            // ── Store state ──
            var cart = d.cart || [];
            var cartTotal = cart.reduce(function (s, item) {
              if (item.pricePer && item.pricePer !== 'each') return s + item.price * (item.weight || 1);
              return s + item.price * (item.qty || 1);
            }, 0);
            var taxRate = gc.includeTax ? 0.08 : 0;
            var cartTax = cartTotal * taxRate;
            var cartGrand = cartTotal + cartTax;
            var storeCat = d.storeCat || 'All';
            var recipeMode = d.recipeMode || false;
            var activeRecipe = d.activeRecipe != null ? d.activeRecipe : null;
            var recipeServings = d.recipeServings || 4;

            // ── Generate store items based on grade ──
            var storeItems = d.storeItems;
            if (!storeItems) {
              var baseItems = [
                // 🥬 Produce — per-pound
                { name: '\uD83C\uDF4E Apples', price: 1.49, cat: 'Produce', pricePer: 'lb' },
                { name: '\uD83C\uDF4C Bananas', price: 0.59, cat: 'Produce', pricePer: 'lb' },
                { name: '\uD83C\uDF47 Grapes', price: 2.49, cat: 'Produce', pricePer: 'lb' },
                { name: '\uD83E\uDD6C Lettuce', price: 1.99, cat: 'Produce', pricePer: 'each' },
                { name: '\uD83C\uDF45 Tomatoes', price: 1.79, cat: 'Produce', pricePer: 'lb' },
                { name: '\uD83E\uDDC5 Onions', price: 1.29, cat: 'Produce', pricePer: 'lb' },
                { name: '\uD83E\uDD54 Potatoes', price: 0.99, cat: 'Produce', pricePer: 'lb' },
                { name: '\uD83E\uDD51 Avocados', price: 1.25, cat: 'Produce', pricePer: 'each' },
                { name: '\uD83E\uDD66 Broccoli', price: 1.99, cat: 'Produce', pricePer: 'lb' },
                { name: '\uD83E\uDD55 Carrots', price: 1.29, cat: 'Produce', pricePer: 'lb' },
                { name: '\uD83C\uDF4B Lemons', price: 0.69, cat: 'Produce', pricePer: 'each' },
                { name: '🧄 Garlic', price: 0.75, cat: 'Produce', pricePer: 'each' },
                // 🥩 Meat & Fish — per-pound
                { name: '\uD83C\uDF57 Chicken Breast', price: 3.99, cat: 'Meat', pricePer: 'lb' },
                { name: '\uD83E\uDD69 Ground Beef', price: 5.49, cat: 'Meat', pricePer: 'lb' },
                { name: '\uD83D\uDC1F Salmon Fillet', price: 9.99, cat: 'Meat', pricePer: 'lb' },
                { name: '\uD83E\uDD53 Bacon (1 lb)', price: 6.49, cat: 'Meat', pricePer: 'each' },
                { name: '\uD83C\uDF56 Pork Chops', price: 4.49, cat: 'Meat', pricePer: 'lb' },
                // 🧀 Dairy
                { name: '\uD83E\uDD5B Milk (gal)', price: 3.49, cat: 'Dairy', pricePer: 'each' },
                { name: '\uD83E\uDDC0 Cheddar Cheese', price: 4.99, cat: 'Dairy', pricePer: 'each' },
                { name: '\uD83E\uDDC8 Butter', price: 3.99, cat: 'Dairy', pricePer: 'each' },
                { name: '\uD83E\uDD5B Yogurt', price: 1.25, cat: 'Dairy', pricePer: 'each' },
                { name: '\uD83E\uDD5A Eggs (dozen)', price: 3.29, cat: 'Dairy', pricePer: 'each' },
                { name: '\uD83E\uDD5B Heavy Cream', price: 4.29, cat: 'Dairy', pricePer: 'each' },
                // 🍞 Bakery
                { name: '\uD83C\uDF5E Bread', price: 2.99, cat: 'Bakery', pricePer: 'each' },
                { name: '\uD83E\uDD6F Bagels (6pk)', price: 3.49, cat: 'Bakery', pricePer: 'each' },
                { name: '\uD83C\uDF2F Tortillas (10pk)', price: 2.79, cat: 'Bakery', pricePer: 'each' },
                // 🥫 Pantry
                { name: '\uD83C\uDF5A Rice (2 lb)', price: 2.99, cat: 'Pantry', pricePer: 'each' },
                { name: '\uD83C\uDF5D Pasta (1 lb)', price: 1.49, cat: 'Pantry', pricePer: 'each' },
                { name: '\uD83E\uDD6B Canned Beans', price: 1.09, cat: 'Pantry', pricePer: 'each' },
                { name: '\uD83C\uDF6F Sugar (4 lb)', price: 3.49, cat: 'Pantry', pricePer: 'each' },
                { name: '\uD83C\uDF3E Flour (5 lb)', price: 3.99, cat: 'Pantry', pricePer: 'each' },
                { name: '\uD83E\uDED2 Olive Oil', price: 6.99, cat: 'Pantry', pricePer: 'each' },
                { name: '\uD83E\uDD5C Peanut Butter', price: 3.75, cat: 'Pantry', pricePer: 'each' },
                { name: '\uD83C\uDF45 Pasta Sauce', price: 2.49, cat: 'Pantry', pricePer: 'each' },
                // 🧊 Frozen
                { name: '\uD83C\uDF55 Frozen Pizza', price: 5.49, cat: 'Frozen', pricePer: 'each' },
                { name: '\uD83C\uDF66 Ice Cream', price: 4.99, cat: 'Frozen', pricePer: 'each' },
                { name: '\uD83E\uDD66 Frozen Veggies', price: 2.49, cat: 'Frozen', pricePer: 'each' },
                // 🥤 Drinks
                { name: '\uD83E\uDDC3 Orange Juice', price: 3.99, cat: 'Drinks', pricePer: 'each' },
                { name: '\uD83E\uDD64 Soda (2L)', price: 1.99, cat: 'Drinks', pricePer: 'each' },
                { name: '\uD83D\uDCA7 Water (24pk)', price: 4.99, cat: 'Drinks', pricePer: 'each' },
                { name: '\u2615 Coffee (12oz)', price: 7.99, cat: 'Drinks', pricePer: 'each' },
                // 🍫 Snacks
                { name: '\uD83C\uDF6B Chocolate Bar', price: 1.25, cat: 'Snacks', pricePer: 'each' },
                { name: '\uD83C\uDF5F Chips', price: 3.49, cat: 'Snacks', pricePer: 'each' },
                { name: '\uD83E\uDD5C Granola Bars', price: 4.29, cat: 'Snacks', pricePer: 'each' },
                { name: '\uD83C\uDF7F Popcorn', price: 2.99, cat: 'Snacks', pricePer: 'each' }
              ];
              storeItems = baseItems.filter(function (item) { return item.price <= gc.maxPrice; });
              upd('storeItems', storeItems);
            }
            var storeCats = ['All'];
            storeItems.forEach(function (it) { if (storeCats.indexOf(it.cat) === -1) storeCats.push(it.cat); });
            var filteredStoreItems = storeCat === 'All' ? storeItems : storeItems.filter(function (it) { return it.cat === storeCat; });

            // ── Recipe data (middle+ grades) ──
            var RECIPES = [
              { name: '\uD83C\uDF5D Spaghetti Bolognese', icon: '\uD83C\uDF5D', serves: 4, ingredients: [
                { item: 'Pasta (1 lb)', qty: 1, unit: 'box' }, { item: 'Ground Beef', qty: 1.5, unit: 'lb' },
                { item: 'Pasta Sauce', qty: 1, unit: 'jar' }, { item: 'Onions', qty: 0.5, unit: 'lb' },
                { item: 'Garlic', qty: 2, unit: 'cloves' }, { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' }
              ]},
              { name: '\uD83C\uDF2E Tacos', icon: '\uD83C\uDF2E', serves: 4, ingredients: [
                { item: 'Ground Beef', qty: 1, unit: 'lb' }, { item: 'Tortillas (10pk)', qty: 1, unit: 'pkg' },
                { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' }, { item: 'Lettuce', qty: 1, unit: 'head' },
                { item: 'Tomatoes', qty: 0.5, unit: 'lb' }, { item: 'Onions', qty: 0.25, unit: 'lb' }
              ]},
              { name: '\uD83C\uDF73 Pancakes', icon: '\uD83C\uDF73', serves: 4, ingredients: [
                { item: 'Flour (5 lb)', qty: 1, unit: 'bag' }, { item: 'Eggs (dozen)', qty: 1, unit: 'dozen' },
                { item: 'Milk (gal)', qty: 1, unit: 'gal' }, { item: 'Butter', qty: 1, unit: 'stick' },
                { item: 'Sugar (4 lb)', qty: 1, unit: 'bag' }
              ]},
              { name: '\uD83E\uDD57 Caesar Salad', icon: '\uD83E\uDD57', serves: 4, ingredients: [
                { item: 'Lettuce', qty: 2, unit: 'heads' }, { item: 'Chicken Breast', qty: 1.5, unit: 'lb' },
                { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' }, { item: 'Bread', qty: 1, unit: 'loaf' },
                { item: 'Lemons', qty: 2, unit: 'each' }, { item: 'Olive Oil', qty: 1, unit: 'bottle' }
              ]},
              { name: '\uD83C\uDF5C Chicken Stir-Fry', icon: '\uD83C\uDF5C', serves: 4, ingredients: [
                { item: 'Chicken Breast', qty: 2, unit: 'lb' }, { item: 'Broccoli', qty: 1, unit: 'lb' },
                { item: 'Carrots', qty: 0.5, unit: 'lb' }, { item: 'Rice (2 lb)', qty: 1, unit: 'bag' },
                { item: 'Onions', qty: 0.5, unit: 'lb' }, { item: 'Garlic', qty: 2, unit: 'cloves' },
                { item: 'Olive Oil', qty: 1, unit: 'bottle' }
              ]},
              { name: '\uD83E\uDD6A Grilled Cheese', icon: '\uD83E\uDD6A', serves: 4, ingredients: [
                { item: 'Bread', qty: 1, unit: 'loaf' }, { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' },
                { item: 'Butter', qty: 1, unit: 'stick' }, { item: 'Tomatoes', qty: 0.5, unit: 'lb' }
              ]},
              // \u2500\u2500 More recipes (v3 additions) \u2500\u2500
              { name: '\uD83E\uDDC0 Mac & Cheese', icon: '\uD83E\uDDC0', serves: 4, ingredients: [
                { item: 'Pasta (1 lb)', qty: 1, unit: 'box' }, { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' },
                { item: 'Milk (gal)', qty: 1, unit: 'gal' }, { item: 'Butter', qty: 1, unit: 'stick' },
                { item: 'Flour (5 lb)', qty: 1, unit: 'bag' }
              ]},
              { name: '\uD83C\uDF6A Chocolate Chip Cookies', icon: '\uD83C\uDF6A', serves: 4, ingredients: [
                { item: 'Flour (5 lb)', qty: 1, unit: 'bag' }, { item: 'Sugar (4 lb)', qty: 1, unit: 'bag' },
                { item: 'Butter', qty: 1, unit: 'stick' }, { item: 'Eggs (dozen)', qty: 1, unit: 'dozen' },
                { item: 'Chocolate Bar', qty: 2, unit: 'bars' }
              ]},
              { name: '\uD83C\uDF4C Banana Bread', icon: '\uD83C\uDF4C', serves: 4, ingredients: [
                { item: 'Bananas', qty: 1, unit: 'lb' }, { item: 'Flour (5 lb)', qty: 1, unit: 'bag' },
                { item: 'Sugar (4 lb)', qty: 1, unit: 'bag' }, { item: 'Eggs (dozen)', qty: 1, unit: 'dozen' },
                { item: 'Butter', qty: 1, unit: 'stick' }
              ]},
              { name: '\uD83C\uDF72 Veggie Soup', icon: '\uD83C\uDF72', serves: 4, ingredients: [
                { item: 'Carrots', qty: 0.5, unit: 'lb' }, { item: 'Onions', qty: 0.5, unit: 'lb' },
                { item: 'Potatoes', qty: 1, unit: 'lb' }, { item: 'Broccoli', qty: 0.5, unit: 'lb' },
                { item: 'Canned Beans', qty: 1, unit: 'can' }
              ]},
              { name: '\uD83C\uDF73 Beef Stew', icon: '\uD83C\uDF73', serves: 4, ingredients: [
                { item: 'Ground Beef', qty: 1, unit: 'lb' }, { item: 'Carrots', qty: 0.5, unit: 'lb' },
                { item: 'Potatoes', qty: 1, unit: 'lb' }, { item: 'Onions', qty: 0.5, unit: 'lb' },
                { item: 'Tomatoes', qty: 0.5, unit: 'lb' }
              ]},
              { name: '\uD83C\uDF2F Burritos', icon: '\uD83C\uDF2F', serves: 4, ingredients: [
                { item: 'Ground Beef', qty: 1, unit: 'lb' }, { item: 'Tortillas (10pk)', qty: 1, unit: 'pkg' },
                { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' }, { item: 'Canned Beans', qty: 1, unit: 'can' },
                { item: 'Tomatoes', qty: 0.25, unit: 'lb' }
              ]},
              { name: '\uD83C\uDF53 Smoothie Bowl', icon: '\uD83C\uDF53', serves: 4, ingredients: [
                { item: 'Bananas', qty: 1, unit: 'lb' }, { item: 'Yogurt', qty: 1, unit: 'tub' },
                { item: 'Apples', qty: 1, unit: 'lb' }, { item: 'Granola Bars', qty: 1, unit: 'box' }
              ]},
              { name: '\uD83C\uDF5E French Toast', icon: '\uD83C\uDF5E', serves: 4, ingredients: [
                { item: 'Bread', qty: 1, unit: 'loaf' }, { item: 'Eggs (dozen)', qty: 1, unit: 'dozen' },
                { item: 'Milk (gal)', qty: 1, unit: 'gal' }, { item: 'Butter', qty: 1, unit: 'stick' },
                { item: 'Sugar (4 lb)', qty: 1, unit: 'bag' }
              ]},
              { name: '\uD83E\uDD54 Mashed Potatoes', icon: '\uD83E\uDD54', serves: 4, ingredients: [
                { item: 'Potatoes', qty: 2, unit: 'lb' }, { item: 'Butter', qty: 1, unit: 'stick' },
                { item: 'Milk (gal)', qty: 1, unit: 'gal' }, { item: 'Garlic', qty: 2, unit: 'cloves' }
              ]},
              { name: '\uD83C\uDF57 Roast Chicken Dinner', icon: '\uD83C\uDF57', serves: 4, ingredients: [
                { item: 'Chicken Breast', qty: 2, unit: 'lb' }, { item: 'Potatoes', qty: 1.5, unit: 'lb' },
                { item: 'Carrots', qty: 1, unit: 'lb' }, { item: 'Olive Oil', qty: 1, unit: 'bottle' },
                { item: 'Garlic', qty: 3, unit: 'cloves' }
              ]},
              { name: '\uD83E\uDED3 Quesadillas', icon: '\uD83E\uDED3', serves: 4, ingredients: [
                { item: 'Tortillas (10pk)', qty: 1, unit: 'pkg' }, { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' },
                { item: 'Chicken Breast', qty: 1, unit: 'lb' }, { item: 'Tomatoes', qty: 0.25, unit: 'lb' }
              ]},
              { name: '\uD83C\uDF5D Pesto Pasta', icon: '\uD83C\uDF5D', serves: 4, ingredients: [
                { item: 'Pasta (1 lb)', qty: 1, unit: 'box' }, { item: 'Olive Oil', qty: 1, unit: 'bottle' },
                { item: 'Cheddar Cheese', qty: 1, unit: 'pkg' }, { item: 'Garlic', qty: 3, unit: 'cloves' },
                { item: 'Lemons', qty: 1, unit: 'each' }
              ]},
              { name: '\uD83E\uDD67 Apple Pie', icon: '\uD83E\uDD67', serves: 4, ingredients: [
                { item: 'Apples', qty: 2, unit: 'lb' }, { item: 'Flour (5 lb)', qty: 1, unit: 'bag' },
                { item: 'Sugar (4 lb)', qty: 1, unit: 'bag' }, { item: 'Butter', qty: 1, unit: 'stick' },
                { item: 'Lemons', qty: 1, unit: 'each' }
              ]},
              { name: '\uD83C\uDF36 Chili', icon: '\uD83C\uDF36', serves: 4, ingredients: [
                { item: 'Ground Beef', qty: 1, unit: 'lb' }, { item: 'Canned Beans', qty: 2, unit: 'cans' },
                { item: 'Tomatoes', qty: 0.5, unit: 'lb' }, { item: 'Onions', qty: 0.5, unit: 'lb' },
                { item: 'Garlic', qty: 2, unit: 'cloves' }
              ]},
              { name: '\uD83D\uDC1F Salmon Dinner', icon: '\uD83D\uDC1F', serves: 4, ingredients: [
                { item: 'Salmon Fillet', qty: 1.5, unit: 'lb' }, { item: 'Lemons', qty: 2, unit: 'each' },
                { item: 'Olive Oil', qty: 1, unit: 'bottle' }, { item: 'Broccoli', qty: 1, unit: 'lb' },
                { item: 'Potatoes', qty: 1, unit: 'lb' }
              ]},
              { name: '\uD83E\uDD5A Egg Salad Sandwich', icon: '\uD83E\uDD5A', serves: 4, ingredients: [
                { item: 'Eggs (dozen)', qty: 1, unit: 'dozen' }, { item: 'Bread', qty: 1, unit: 'loaf' },
                { item: 'Lettuce', qty: 1, unit: 'head' }, { item: 'Tomatoes', qty: 0.25, unit: 'lb' }
              ]},
              { name: '\uD83C\uDF6F Yogurt Parfait', icon: '\uD83C\uDF6F', serves: 4, ingredients: [
                { item: 'Yogurt', qty: 2, unit: 'tubs' }, { item: 'Bananas', qty: 0.5, unit: 'lb' },
                { item: 'Granola Bars', qty: 1, unit: 'box' }, { item: 'Apples', qty: 0.5, unit: 'lb' }
              ]},
              { name: '\uD83C\uDF45 Tomato Soup', icon: '\uD83C\uDF45', serves: 4, ingredients: [
                { item: 'Tomatoes', qty: 2, unit: 'lb' }, { item: 'Onions', qty: 0.5, unit: 'lb' },
                { item: 'Garlic', qty: 2, unit: 'cloves' }, { item: 'Butter', qty: 1, unit: 'stick' },
                { item: 'Bread', qty: 1, unit: 'loaf' }
              ]},
              { name: '\uD83C\uDF55 Pizza Night', icon: '\uD83C\uDF55', serves: 4, ingredients: [
                { item: 'Frozen Pizza', qty: 2, unit: 'pizzas' }, { item: 'Soda (2L)', qty: 1, unit: 'bottle' },
                { item: 'Ice Cream', qty: 1, unit: 'tub' }
              ]},
              { name: '\uD83E\uDD6F Breakfast Sandwich', icon: '\uD83E\uDD6F', serves: 4, ingredients: [
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
              { name: 'Mrs. Johnson', emoji: '\uD83D\uDC69\u200D\uD83C\uDFEB' },
              { name: 'Coach Miller', emoji: '\uD83E\uDDD1\u200D\uD83C\uDFEB' },
              { name: 'Grandma Rose', emoji: '\uD83D\uDC75' },
              { name: 'Officer Davis', emoji: '\uD83D\uDC6E' },
              { name: 'Dr. Patel', emoji: '\uD83D\uDC69\u200D\u2695\uFE0F' },
              { name: 'Mr. Garcia', emoji: '\uD83D\uDC68\u200D\uD83C\uDF73' },
              { name: 'Nurse Kim', emoji: '\uD83D\uDC69\u200D\u2695\uFE0F' },
              { name: 'Farmer Jim', emoji: '\uD83E\uDDD1\u200D\uD83C\uDF3E' },
              { name: 'Teen Tyler', emoji: '\uD83E\uDDD2' },
              { name: 'Chef Anna', emoji: '\uD83D\uDC69\u200D\uD83C\uDF73' },
              { name: 'Pastor Brown', emoji: '\uD83E\uDDD1' },
              { name: 'Ms. Rivera', emoji: '\uD83D\uDC69\u200D\uD83D\uDCBC' },
              { name: 'Old Man Pete', emoji: '\uD83D\uDC74' },
              { name: 'Firefighter Sam', emoji: '\uD83E\uDDD1\u200D\uD83D\uDE92' },
              { name: 'Little Timmy', emoji: '\uD83D\uDC66' },
              { name: 'Librarian Wells', emoji: '\uD83E\uDDD1\u200D\uD83D\uDCBB' }
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
              if (n.indexOf('milk') >= 0 || n.indexOf('cream') >= 0) return drawMilkCarton;
              if (n.indexOf('bread') >= 0 || n.indexOf('bagel') >= 0 || n.indexOf('tortilla') >= 0) return drawBread;
              if (n.indexOf('apple') >= 0 || n.indexOf('tomato') >= 0) return drawApple;
              if (n.indexOf('cereal') >= 0 || n.indexOf('granola') >= 0 || n.indexOf('rice') >= 0 || n.indexOf('pasta') >= 0 || n.indexOf('sugar') >= 0 || n.indexOf('flour') >= 0) return drawCereal;
              if (n.indexOf('egg') >= 0) return drawEggs;
              if (n.indexOf('juice') >= 0 || n.indexOf('orange') >= 0 || n.indexOf('water') >= 0 || n.indexOf('soda') >= 0) return drawJuice;
              if (n.indexOf('chip') >= 0 || n.indexOf('popcorn') >= 0) return drawChips;
              if (n.indexOf('banana') >= 0 || n.indexOf('lemon') >= 0) return drawBanana;
              return drawGeneric;
            };

            // Draw the entire cashier scene onto a canvas. Called once per React render.
            var drawCashierScene = function (canvas) {
              if (!canvas) return;
              var W = canvas.width = canvas.offsetWidth || 600;
              var H = canvas.height = 280;
              var c = canvas.getContext('2d');
              if (!c) return;
              c.clearRect(0, 0, W, H);

              // Power-outage backdrop — dark blue-gray with vignette
              var bgGrad = c.createLinearGradient(0, 0, 0, H);
              bgGrad.addColorStop(0, '#0f172a');
              bgGrad.addColorStop(1, '#1e293b');
              c.fillStyle = bgGrad;
              c.fillRect(0, 0, W, H);

              // Candle glow centered on the register (right side). Patience drives the radius.
              var registerX = W * 0.78, registerY = H * 0.55;
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

              // Items on counter — line them up left-of-register
              var items = (crCustomer && crCustomer.items) || [];
              var itemSlotW = 60;
              var itemSpacing = Math.min(itemSlotW, (W * 0.7 - 20) / Math.max(1, items.length));
              var startX = 20;
              items.forEach(function (it, idx) {
                var ix = startX + idx * itemSpacing;
                var iy = H - 50 - 56;
                var drawer = pickItemDrawer(it.name);
                drawer(c, ix, iy, itemSlotW * 0.82, 56, it.name);
                // Quantity / weight badge below
                if (it.qty > 1 || it.weight) {
                  c.fillStyle = '#fbbf24';
                  c.fillRect(ix, H - 50 + 2, itemSlotW * 0.82, 12);
                  c.fillStyle = '#0f172a';
                  c.font = 'bold 10px sans-serif';
                  c.textAlign = 'center'; c.textBaseline = 'middle';
                  c.fillText(it.weight ? (it.weight + ' lb') : ('x' + it.qty), ix + itemSlotW * 0.41, H - 50 + 8);
                }
              });

              // Cash register
              var rW = 100, rH = 80;
              var rx = registerX - rW/2, ry = registerY - rH/2;
              // Body
              c.fillStyle = '#374151'; c.fillRect(rx, ry, rW, rH);
              c.strokeStyle = '#1f2937'; c.lineWidth = 2; c.strokeRect(rx, ry, rW, rH);
              // LCD screen (dim — power outage)
              c.fillStyle = '#1e1b4b'; c.fillRect(rx + 8, ry + 8, rW - 16, 24);
              c.strokeStyle = '#3730a3'; c.lineWidth = 1; c.strokeRect(rx + 8, ry + 8, rW - 16, 24);
              // LCD text — show "OFFLINE" since the power is out
              c.fillStyle = 'rgba(252, 211, 77, 0.65)';
              c.font = 'bold 12px monospace';
              c.textAlign = 'center'; c.textBaseline = 'middle';
              c.fillText('OFFLINE', rx + rW/2, ry + 20);
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

              // Customer silhouette on the far right (beyond register)
              if (crCustomer) {
                var cuX = W - 50, cuY = H - 60;
                c.fillStyle = '#475569';
                c.beginPath();
                c.arc(cuX, cuY - 30, 12, 0, Math.PI * 2);  // head
                c.fill();
                c.fillRect(cuX - 16, cuY - 18, 32, 36);  // shoulders/torso
                // Emoji label above
                c.fillStyle = 'rgba(255,255,255,0.7)';
                c.font = '11px sans-serif';
                c.textAlign = 'center'; c.textBaseline = 'bottom';
                c.fillText(crCustomer.emoji || '🙂', cuX, cuY - 45);
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
                  ? { text: 'Power\'s out. Cash register is dead. Customers need you to add the prices up — they\'re all rounded to nice numbers so you can practice clean.', kind: 'intro', ts: Date.now() }
                  : { text: 'Power\'s out. Cash register is dead. Customers need you to add it up in your head.', kind: 'intro', ts: Date.now() };
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
                botMsg = { text: 'Try this: ignore the cents. Round each price up. Then estimate.', kind: 'hint', ts: Date.now() };
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
                botMsg = { text: 'Nice flow. You\'re getting fast.', kind: 'praise', ts: Date.now() };
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
              price = isJPY ? Math.round(price / 10) * 10 : Math.round(price * 100) / 100;
              var overpay = isJPY ? [100, 500, 1000, 5000, 10000] : [1, 5, 10, 20, 50, 100];
              var paid = overpay.find(function (v) { return v >= price; }) || overpay[overpay.length - 1];
              if (paid < price) paid = Math.ceil(price / 10) * 10;
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
              { name: '\uD83C\uDFE0 Housing', pct: 30, color: '#3b82f6' },
              { name: '\uD83C\uDF5E Food', pct: 20, color: '#10b981' },
              { name: '\uD83D\uDE97 Transport', pct: 15, color: '#f59e0b' },
              { name: '\uD83D\uDCDA Education', pct: 10, color: '#8b5cf6' },
              { name: '\uD83C\uDFAE Entertainment', pct: 10, color: '#ec4899' },
              { name: '\uD83D\uDCB0 Savings', pct: 10, color: '#06b6d4' },
              { name: '\u2764\uFE0F Other', pct: 5, color: '#94a3b8' }
            ];
            var budgetUsed = budgetCats.reduce(function (s, c) { return s + c.pct; }, 0);

            // ── Fewest coins challenge ──
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
                { name: '\uD83C\uDF4E Apples', unit: 'lb' }, { name: '\uD83C\uDF4C Bananas', unit: 'lb' },
                { name: '\uD83E\uDD5B Milk', unit: 'gallon' }, { name: '\uD83E\uDDC3 Juice', unit: 'oz' },
                { name: '\uD83C\uDF5E Bread', unit: 'loaf' }, { name: '\uD83C\uDF6B Cereal', unit: 'oz' },
                { name: '\uD83E\uDDFB Paper Towels', unit: 'roll' }, { name: '\u2615 Coffee', unit: 'oz' }
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
              { template: 'You buy {q1} {item1} at {p1} each and {q2} {item2} at {p2} each. What is the total cost?', fields: ['total'], compute: function (v) { return [{ val: v.q1 * v.p1 + v.q2 * v.p2, label: 'Total' }]; }, gen: function () { var q1 = Math.floor(Math.random() * 5) + 1; var q2 = Math.floor(Math.random() * 4) + 1; var p1 = Math.round((Math.random() * 4 + 0.5) * 100) / 100; var p2 = Math.round((Math.random() * 3 + 0.25) * 100) / 100; return { q1: q1, q2: q2, p1: p1, p2: p2, item1: ['\uD83C\uDF4E apples', '\uD83C\uDF4C bananas', '\uD83E\uDD5A eggs'][Math.floor(Math.random() * 3)], item2: ['\uD83C\uDF5E loaves of bread', '\uD83E\uDD5B cartons of milk', '\uD83C\uDF6B candy bars'][Math.floor(Math.random() * 3)] }; } },
              { template: 'A shirt costs {original}. It\'s on sale for {pct}% off. What do you pay?', fields: ['salePrice'], compute: function (v) { return [{ val: Math.round(v.original * (1 - v.pct / 100) * 100) / 100, label: 'Sale Price' }]; }, gen: function () { return { original: Math.round((Math.random() * 40 + 10) * 100) / 100, pct: [10, 15, 20, 25, 30, 40, 50][Math.floor(Math.random() * 7)] }; } },
              { template: 'You have {have}. You want to buy something that costs {want}. How much more do you need?', fields: ['need'], compute: function (v) { return [{ val: Math.round(Math.max(0, v.want - v.have) * 100) / 100, label: 'Amount Needed' }]; }, gen: function () { var want = Math.round((Math.random() * 20 + 5) * 100) / 100; return { have: Math.round((Math.random() * want * 0.8) * 100) / 100, want: want }; } },
              { template: 'Dinner costs {bill}. You want to leave a {tipPct}% tip. What is the tip amount? What is the total with tip?', fields: ['tip', 'total'], compute: function (v) { var tip = Math.round(v.bill * v.tipPct / 100 * 100) / 100; return [{ val: tip, label: 'Tip' }, { val: Math.round((v.bill + tip) * 100) / 100, label: 'Total' }]; }, gen: function () { return { bill: Math.round((Math.random() * 60 + 10) * 100) / 100, tipPct: [10, 15, 18, 20, 25][Math.floor(Math.random() * 5)] }; } },
              { template: 'You earn {hourly}/hour and work {hours} hours. After {taxPct}% tax, what is your take-home pay?', fields: ['gross', 'takeHome'], compute: function (v) { var gross = Math.round(v.hourly * v.hours * 100) / 100; return [{ val: gross, label: 'Gross Pay' }, { val: Math.round(gross * (1 - v.taxPct / 100) * 100) / 100, label: 'Take-Home' }]; }, gen: function () { return { hourly: [8, 10, 12, 15, 20][Math.floor(Math.random() * 5)], hours: Math.floor(Math.random() * 30) + 10, taxPct: [10, 15, 20, 22, 25][Math.floor(Math.random() * 5)] }; } },
              { template: '{friends} friends split a {bill} bill equally. How much does each person pay?', fields: ['each'], compute: function (v) { return [{ val: Math.round(v.bill / v.friends * 100) / 100, label: 'Each Pays' }]; }, gen: function () { var friends = Math.floor(Math.random() * 5) + 2; return { friends: friends, bill: Math.round(friends * (Math.random() * 15 + 5) * 100) / 100 }; } }
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
              { q: 'If you invest $1,000 at 7% annual compound interest for 10 years, approximately how much will you have?', choices: ['$1,700', '$1,967', '$2,500', '$3,000'], correct: 1, explanation: '$1,000 \u00D7 (1.07)\u00B9\u2070 \u2248 $1,967. Compound interest grows exponentially over time.' },
              { q: 'Which costs more total: a $20,000 loan at 5% for 5 years, or at 3% for 10 years?', choices: ['5% for 5 years', '3% for 10 years', 'They cost the same', 'Can\'t determine'], correct: 1, explanation: 'At 5%/5yr: ~$2,645 interest. At 3%/10yr: ~$3,174 interest. Lower rate but longer term costs more in total interest.' },
              { q: 'Starting to invest $200/month at age 25 vs. age 35 (retire at 65, 7% return). How much more does the early starter have?', choices: ['About $50,000 more', 'About $130,000 more', 'About $260,000 more', 'More than $300,000 more'], correct: 2, explanation: 'Age 25: ~$262K. Age 35: ~$122K. That\'s ~$140K difference! Time is the most powerful factor in investing.' },
              { q: 'You have $500 in credit card debt at 22% APR. Paying $25/month, roughly how long to pay off?', choices: ['About 1 year', 'About 2 years', 'About 5 years', 'Never (minimum too low)'], correct: 1, explanation: 'At $25/month and 22% APR, it takes about 24 months and you pay ~$95 in interest. High-interest debt is expensive!' },
              { q: 'The "Rule of 72" estimates how long to double your money. At 6% interest, roughly how many years?', choices: ['6 years', '8 years', '10 years', '12 years'], correct: 3, explanation: '72 \u00F7 6 = 12 years. The Rule of 72: divide 72 by your interest rate to estimate doubling time.' },
              { q: 'An emergency fund should ideally cover how many months of expenses?', choices: ['1-2 months', '3-6 months', '12 months', '24 months'], correct: 1, explanation: 'Financial advisors recommend 3-6 months of expenses. This covers most unexpected events like job loss or medical emergencies.' }
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
              auto: { label: '\uD83D\uDE97 Auto Loan', amt: 25000, rate: 5, term: 60 },
              student: { label: '\uD83C\uDF93 Student Loan', amt: 35000, rate: 5.5, term: 120 },
              mortgage: { label: '\uD83C\uDFE0 Mortgage', amt: 250000, rate: 6.5, term: 360 },
              credit: { label: '\uD83D\uDCB3 Credit Card', amt: 5000, rate: 22, term: 60 }
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
              car: { label: '\uD83D\uDE97 Car', target: 15000, emoji: '\uD83D\uDE97' },
              college: { label: '\uD83C\uDF93 College Fund', target: 50000, emoji: '\uD83C\uDF93' },
              house: { label: '\uD83C\uDFE0 House Down Payment', target: 60000, emoji: '\uD83C\uDFE0' },
              emergency: { label: '\uD83D\uDEE1\uFE0F Emergency Fund', target: 10000, emoji: '\uD83D\uDEE1\uFE0F' },
              vacation: { label: '\u2708\uFE0F Vacation', target: 3000, emoji: '\u2708\uFE0F' },
              custom: { label: '\u2B50 Custom Goal', target: 5000, emoji: '\u2B50' }
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
              { id: 'coins', label: '\uD83E\uDE99 Coins & Bills', icon: '\uD83E\uDE99' },
              { id: 'change', label: '\uD83D\uDCB5 Making Change', icon: '\uD83D\uDCB5' },
              { id: 'tips', label: '\uD83D\uDCB3 Tips & Discounts', icon: '\uD83D\uDCB3' },
              { id: 'store', label: '\uD83D\uDED2 Grocery Store', icon: '\uD83D\uDED2' },
              { id: 'budget', label: '\uD83D\uDCCA Budget', icon: '\uD83D\uDCCA' },
              { id: 'cents', label: '\uD83E\uDE99 Common Cents', icon: '\uD83E\uDE99' },
              { id: 'word', label: '\uD83D\uDCDD Word Problems', icon: '\uD83D\uDCDD' },
              { id: 'exchange', label: '\uD83C\uDF0D Currency Exchange', icon: '\uD83C\uDF0D' },
              { id: 'finance', label: '\uD83D\uDCB0 Personal Finance', icon: '\uD83D\uDCB0' }
            ];

            return React.createElement("div", { className: "space-y-4 max-w-4xl mx-auto animate-in fade-in duration-200" },
              // ── HEADER ──
              React.createElement("div", { className: "bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 rounded-2xl p-5 text-white shadow-xl" },
                React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-3" },
                  React.createElement("div", null,
                    React.createElement("h2", { className: "text-xl font-black flex items-center gap-2" }, "\uD83D\uDCB5 Money Math"),
                    React.createElement("p", { className: "text-emerald-100 text-xs mt-1" }, "Master coins, bills, change, budgeting & currency exchange")
                  ),
                  React.createElement("div", { className: "flex gap-2 flex-wrap items-center" },
                    // Challenge Mode toggle
                    React.createElement("button", { onClick: function () { upd('challengeMode', !d.challengeMode); upd('coinGuess', null); upd('coinGuessFb', null); upd('cartGuessSubtotal', null); upd('cartGuessTax', null); upd('cartGuessTotal', null); upd('cartCheckoutFb', null); },
                      className: "px-3 py-1.5 rounded-lg text-xs font-black transition-all " + (d.challengeMode ? 'bg-amber-400 text-amber-900 ring-2 ring-amber-200 shadow-lg' : 'bg-white/20 text-white border border-white/30 hover:bg-white/30')
                    }, d.challengeMode ? '\uD83C\uDFAF Challenge ON' : '\uD83C\uDFAF Challenge Mode'),
                    // Grade selector
                    React.createElement("select", { value: grade, onChange: function (e) { upd('grade', e.target.value); upd('storeItems', null); upd('cart', []); },
                      'aria-label': 'Grade level',
                      className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 cursor-pointer"
                    }, Object.entries(GRADE_CONFIG).map(function (entry) {
                      return React.createElement("option", { key: entry[0], value: entry[0], style: { color: '#1e293b' } }, entry[1].label);
                    })),
                    // Currency selector
                    React.createElement("select", { value: currency, onChange: function (e) { upd('currency', e.target.value); upd('placed', []); upd('storeItems', null); upd('cart', []); },
                      'aria-label': 'Currency',
                      className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 cursor-pointer"
                    }, Object.keys(CURRENCIES).map(function (code) {
                      return React.createElement("option", { key: code, value: code, style: { color: '#1e293b' } }, CURRENCIES[code].flag + ' ' + code + ' (' + CURRENCIES[code].symbol + ')');
                    }))
                  )
                )
              ),

              // ── TAB BAR ──
              React.createElement("div", { className: "flex gap-1 bg-slate-100 rounded-xl p-1", role: 'tablist', 'aria-label': 'Money Tool sections' },
                tabs.map(function (t) {
                  return React.createElement("button", { key: t.id, onClick: function () { upd('tab', t.id); }, role: 'tab', 'aria-selected': tab === t.id,
                    className: "flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all " + (tab === t.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-700 hover:bg-white/50')
                  }, t.label);
                })
              ),

              // ── Topic-accent hero band per tab ──
              (function() {
                var TAB_META = {
                  coins:    { accent: '#d97706', soft: 'rgba(217,119,6,0.10)', icon: '\uD83E\uDE99', title: 'Coins & bills',          hint: 'Build a counting board. Coin face values are arbitrary \u2014 a quarter is worth 25\u00a2 because we agree it is, not because of the metal.' },
                  change:   { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)', icon: '\uD83D\uDCB5', title: 'Making change',          hint: 'Count UP from the price to the amount paid \u2014 the way cashiers actually do it. Faster + more accurate than subtraction by hand.' },
                  tips:     { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '\uD83D\uDCB3', title: 'Tips & discounts',       hint: '15% tip = 10% (move decimal) + half of that. 20% off = take the price, divide by 5, subtract. Mental-math shortcuts beat the calculator for sanity-checking.' },
                  store:    { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', icon: '\uD83D\uDED2', title: 'Grocery store',          hint: 'Unit price (cost per ounce or item) is the only honest comparison \u2014 package sizes are designed to defeat eyeball math.' },
                  budget:   { accent: '#22c55e', soft: 'rgba(34,197,94,0.10)',  icon: '\uD83D\uDCCA', title: 'Budget',                 hint: '50/30/20: needs / wants / save+debt. Most people misclassify recurring subscriptions as needs \u2014 if it auto-renews, it is a want until you opt back in.' },
                  cents:    { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', icon: '\uD83E\uDE99', title: 'Common cents',           hint: 'Quick mental shortcuts: 25\u00a2 \u00d7 4 = $1, 10\u00a2 + 5\u00a2 + 1\u00a2 = 16\u00a2. Arithmetic with money is faster than the same arithmetic with abstract numbers because the unit is concrete.' },
                  word:     { accent: '#3b82f6', soft: 'rgba(59,130,246,0.10)', icon: '\uD83D\uDCDD', title: 'Word problems',          hint: 'Translate the sentence to an equation BEFORE computing. "How much" = an unknown variable. "Total" = sum. "Each" or "per" = multiplication.' },
                  exchange: { accent: '#8b5cf6', soft: 'rgba(139,92,246,0.10)', icon: '\uD83C\uDF0D', title: 'Currency exchange',      hint: 'Exchange rates change daily. Cards usually beat cash for travel \u2014 cash exchange shops mark up 5\u201310% over interbank rates.' },
                  finance:  { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83D\uDCB0', title: 'Personal finance',       hint: 'Compound interest: $100 at 7% \u00d7 30 yrs = $760. Pay credit-card statement balance in full each cycle = no interest. Carry a balance = APR roughly doubles your debt every 5 yrs.' }
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
                    React.createElement('p', { style: { margin: '3px 0 0', color: '#475569', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                  )
                );
              })(),

              // ═══ COINS & BILLS TAB ═══
              tab === 'coins' && React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
                // Coin palette
                React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200" },
                  React.createElement("h3", { className: "text-sm font-bold text-amber-800 mb-3" }, "\uD83E\uDE99 " + cur.flag + " " + cur.name + " Coins"),
                  React.createElement("p", { className: "text-[11px] text-amber-600 mb-3" }, "Click coins to add them to your counting board."),
                  React.createElement("div", { className: "flex flex-wrap gap-3 justify-center" },
                    cur.coins.map(function (coin, ci) {
                      return React.createElement("button", { key: ci, onClick: function () {
                          upd('placed', [].concat(placed, [{ name: coin.name, value: coin.value, id: Date.now() + '-' + ci }]));
                        },
                        className: "flex flex-col items-center gap-1 group transition-transform hover:scale-110",
                        title: coin.name + ' = ' + fmt(coin.value)
                      },
                        React.createElement("div", { style: {
                          width: coin.size + 'px', height: coin.size + 'px', borderRadius: '50%',
                          background: 'radial-gradient(circle at 35% 35%, ' + coin.color + ', ' + coin.color + 'cc)',
                          border: '2px solid rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: Math.max(9, coin.size / 3.5) + 'px', fontWeight: 'bold', color: '#333',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.4)',
                          cursor: 'pointer', transition: 'all 0.15s'
                        } }, coin.label),
                        React.createElement("span", { className: "text-[11px] font-bold text-amber-700" }, coin.name)
                      );
                    })
                  ),
                  // Bill palette
                  React.createElement("h3", { className: "text-sm font-bold text-green-800 mt-4 mb-3" }, "\uD83D\uDCB5 " + cur.name + " Bills"),
                  React.createElement("div", { className: "flex flex-wrap gap-2 justify-center" },
                    cur.bills.map(function (bill, bi) {
                      return React.createElement("button", { key: bi, onClick: function () {
                          upd('placed', [].concat(placed, [{ name: bill.name, value: bill.value, id: Date.now() + '-b' + bi }]));
                        },
                        className: "group transition-transform hover:scale-105"
                      },
                        React.createElement("div", { style: {
                          width: '72px', height: '32px', borderRadius: '4px',
                          background: 'linear-gradient(135deg, ' + bill.color + ', ' + bill.color + 'aa)',
                          border: '1px solid rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 'bold', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.15)', cursor: 'pointer'
                        } }, bill.name)
                      );
                    })
                  )
                ),
                // Counting board
                React.createElement("div", { className: "bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-400" },
                  React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h3", { className: "text-sm font-bold text-slate-700" }, "\uD83E\uDDEE Counting Board"),
                    React.createElement("div", { className: "flex items-center gap-2" },
                      challengeMode
                        ? React.createElement("span", { className: "text-lg font-black text-amber-500" }, '\uD83C\uDFAF ?')
                        : React.createElement("span", { className: "text-lg font-black text-emerald-600" }, fmt(boardTotal)),
                      placed.length > 0 && React.createElement("button", { "aria-label": "Clear", onClick: function () { upd('placed', []); upd('coinGuess', null); upd('coinGuessFb', null); },
                        className: "text-[11px] text-red-400 hover:text-red-600 font-bold"
                      }, "\u2715 Clear")
                    )
                  ),
                  placed.length === 0
                    ? React.createElement("div", { className: "text-center py-8 text-slate-600" },
                        React.createElement("div", { className: "text-4xl mb-2" }, "\uD83E\uDE99"),
                        React.createElement("p", { className: "text-xs" }, challengeMode ? 'Add coins/bills, then guess the total!' : 'Click coins or bills to add them here')
                      )
                    : React.createElement("div", { className: "flex flex-wrap gap-1.5 min-h-[100px]" },
                        placed.map(function (p, pi) {
                          var isBill = p.value >= (isJPY ? 1000 : 1) && !p.name.toLowerCase().includes('coin') && !p.name.toLowerCase().includes('penny') && !p.name.toLowerCase().includes('cent') && !p.name.toLowerCase().includes('dime') && !p.name.toLowerCase().includes('nickel') && !p.name.toLowerCase().includes('quarter') && !p.name.toLowerCase().includes('loonie') && !p.name.toLowerCase().includes('toonie');
                          return React.createElement("button", { "aria-label": "Remove " + p.name, key: p.id || pi, onClick: function () {
                              upd('placed', placed.filter(function (_, idx) { return idx !== pi; }));
                              upd('coinGuess', null); upd('coinGuessFb', null);
                            }, title: 'Remove ' + p.name,
                            className: "transition-all hover:scale-110 hover:opacity-70 cursor-pointer"
                          },
                            isBill
                              ? React.createElement("div", { style: { width: '56px', height: '24px', borderRadius: '3px', background: '#85bb65', border: '1px solid rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', color: '#fff' } }, challengeMode ? p.name : fmt(p.value))
                              : React.createElement("div", { style: { width: '28px', height: '28px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #C0C0C0, #999)', border: '1px solid rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 'bold', color: '#333' } }, challengeMode ? p.name.substring(0, 3) : fmt(p.value))
                          );
                        })
                      ),
                  // Challenge Mode: guess the total
                  challengeMode && placed.length > 0 && React.createElement("div", { className: "mt-3 pt-3 border-t border-amber-200 bg-amber-50 rounded-lg p-3" },
                    React.createElement("p", { className: "text-xs font-bold text-amber-700 mb-2" }, '\uD83C\uDFAF What\'s the total? Add up all the coins and bills!'),
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', "aria-label": "Your guess of the total in " + cur.code, value: d.coinGuess != null ? d.coinGuess : '', onChange: function (e) { upd('coinGuess', e.target.value === '' ? null : parseFloat(e.target.value)); }, className: "px-3 py-2 border border-amber-600 rounded-lg text-sm font-bold w-32 focus:ring-2 focus:ring-amber-400 outline-none" }),
                      React.createElement("button", { "aria-label": "Check", onClick: function () {
                        var guess = d.coinGuess; var actual = boardTotal;
                        var isRight = typeof guess === 'number' && Math.abs(guess - actual) < (isJPY ? 0.5 : 0.005);
                        upd('coinGuessFb', isRight ? { ok: true, msg: '\u2705 Correct! Total is ' + fmt(actual) + '!' } : { ok: false, msg: '\u274C Not quite. The total is ' + fmt(actual) + '. You guessed ' + fmt(guess || 0) + '.' });
                        if (isRight && typeof awardStemXP === 'function') awardStemXP('moneyMath', 10, 'coin counting challenge');
                      }, disabled: d.coinGuess == null, className: "px-4 py-2 bg-amber-700 text-white font-bold rounded-lg hover:bg-amber-600 transition-all text-xs disabled:opacity-40" }, '\u2714 Check')
                    ),
                    d.coinGuessFb && React.createElement("p", { className: "text-xs font-bold mt-2 " + (d.coinGuessFb.ok ? 'text-green-600' : 'text-red-500') }, d.coinGuessFb.msg)
                  ),
                  // Normal mode: show total
                  !challengeMode && placed.length > 0 && React.createElement("div", { className: "mt-3 pt-3 border-t border-slate-200" },
                    React.createElement("div", { className: "flex justify-between text-xs" },
                      React.createElement("span", { className: "text-slate-600" }, placed.length + " items on board"),
                      React.createElement("span", { className: "font-bold text-emerald-600" }, "Total: " + fmt(boardTotal))
                    )
                  )
                )
              ),

              // ═══ MAKING CHANGE TAB ═══
              tab === 'change' && React.createElement("div", { className: "bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200" },
                React.createElement("h3", { className: "text-base font-bold text-blue-800 mb-4" }, "\uD83D\uDCB5 Making Change Practice"),
                !changePrice
                  ? React.createElement("div", { className: "text-center py-8" },
                      React.createElement("p", { className: "text-slate-600 text-sm mb-4" }, "Generate a problem to practice making change with " + cur.flag + " " + cur.name),
                      React.createElement("button", { "aria-label": "Generate Problem", onClick: genChangeProblem,
                        className: "px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg text-sm"
                      }, "\u2728 Generate Problem")
                    )
                  : React.createElement("div", { className: "space-y-4" },
                      React.createElement("div", { className: "bg-white rounded-xl p-4 shadow-sm border border-blue-100" },
                        React.createElement("div", { className: "grid grid-cols-3 gap-4 text-center" },
                          React.createElement("div", null,
                            React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Price"),
                            React.createElement("p", { className: "text-2xl font-black text-red-500" }, fmt(changePrice))
                          ),
                          React.createElement("div", null,
                            React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Customer Pays"),
                            React.createElement("p", { className: "text-2xl font-black text-blue-500" }, fmt(changePaid))
                          ),
                          React.createElement("div", null,
                            React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Change Due"),
                            React.createElement("p", { className: "text-2xl font-black text-emerald-600" }, "?")
                          )
                        )
                      ),
                      React.createElement("div", { className: "flex items-center gap-3" },
                        React.createElement("label", { className: "text-sm font-bold text-slate-600" }, "Your answer:"),
                        React.createElement("input", { type: "number", step: isJPY ? "1" : "0.01", placeholder: cur.symbol + "...",
                          value: changeAnswer !== null ? changeAnswer : '',
                          onChange: function (e) { upd('changeAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); },
                          className: "px-4 py-2 border border-slate-400 rounded-xl text-sm font-bold w-32 focus:ring-2 focus:ring-blue-400 outline-none"
                        }),
                        React.createElement("button", { "aria-label": "Check", onClick: function () {
                            var correct = Math.round((changePaid - changePrice) * 100) / 100;
                            var userAns = Math.round((changeAnswer || 0) * 100) / 100;
                            var isRight = Math.abs(userAns - correct) < 0.005;
                            upd('changeFeedback', isRight ? { ok: true, msg: '\u2705 Correct! ' + fmt(changePaid) + ' \u2212 ' + fmt(changePrice) + ' = ' + fmt(correct) } : { ok: false, msg: '\u274C Not quite. ' + fmt(changePaid) + ' \u2212 ' + fmt(changePrice) + ' = ' + fmt(correct) });
                            if (isRight && typeof addXP === 'function') addXP(15, 'Money Math: Making change');
                            if (isRight && typeof awardStemXP === 'function') awardStemXP('moneyMath', 5, 'making change');
                          },
                          className: "px-5 py-2 bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-600 transition-all text-sm"
                        }, "\u2714 Check")
                      ),
                      changeFeedback && React.createElement("p", { className: "text-sm font-bold " + (changeFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, changeFeedback.msg),
                      React.createElement("button", { "aria-label": "Next Problem", onClick: genChangeProblem,
                        className: "px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs"
                      }, "\u21BB Next Problem")
                    )
              ),

              // ═══ GROCERY STORE TAB ═══
              tab === 'store' && React.createElement("div", { className: "space-y-4" },
                
                // ── ⚡ Cashier Rush Header ──
                React.createElement("div", { className: "flex items-center justify-between bg-zinc-900 text-white rounded-xl p-3 shadow-md border border-zinc-700 mx-1 mt-1" },
                  React.createElement("div", { className: "flex items-center gap-2" },
                    React.createElement("span", { className: "text-2xl" }, "\u26A1"),
                    React.createElement("div", null,
                      React.createElement("h3", { className: "text-sm font-black text-amber-500 leading-tight" }, "Power Outage Cashier Rush"),
                      React.createElement("p", { className: "text-[11px] text-zinc-400 font-bold" }, "Registers are down! Calculate by hand!")
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
                    React.createElement("h2", { className: "text-xl font-black text-amber-400 mb-2 uppercase tracking-wide" }, "Code Black: Power Outage!"),
                    React.createElement("p", { className: "text-sm text-zinc-300 mb-6 max-w-sm mx-auto" },
                      "The registers are completely dead. Food is starting to spoil. We need you to manually calculate customer totals as fast as you can. ",
                      React.createElement("span", { className: "text-amber-400 font-bold" }, "Speed and accuracy"), " are everything right now."
                    ),

                    // v3: Difficulty selector \u2014 Easy / Standard / Challenge
                    React.createElement("div", { className: "mb-5 inline-block bg-zinc-800/80 rounded-xl px-4 py-3 border border-zinc-700" },
                      React.createElement("p", { className: "text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider" }, "Difficulty"),
                      React.createElement("div", { className: "flex gap-2 justify-center" },
                        [
                          { id: 'easy',      label: '\uD83D\uDFE2 Easy',      sub: 'Round prices, no tax' },
                          { id: 'standard',  label: '\uD83D\uDFE1 Standard',  sub: 'Real prices, tax W2+' },
                          { id: 'challenge', label: '\uD83D\uDD34 Challenge', sub: 'Coupons + tax' }
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
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500')
                          },
                            React.createElement('div', null, dm.label),
                            React.createElement('div', { className: 'text-[10px] font-normal opacity-80 mt-0.5' }, dm.sub)
                          );
                        })
                      )
                    ),

                    React.createElement("div", { className: "mb-6" }, null),

                    grade !== 'elementary' && crDifficulty !== 'easy' ? React.createElement("div", { className: "mb-6 inline-block bg-zinc-800 rounded-lg px-4 py-2 border border-zinc-700 text-left" },
                      React.createElement("p", { className: "text-xs text-zinc-400 mb-1" }, "\u26A0\uFE0F Management notes:"),
                      React.createElement("ul", { className: "text-xs text-zinc-300 list-disc list-inside space-y-1" },
                        React.createElement("li", null, "Watch out for per-lb items"),
                        React.createElement("li", null, "Waves 2+: Add " + (taxRate*100) + "% Sales Tax"),
                        (grade === 'high' || crDifficulty === 'challenge') ? React.createElement("li", null, "Waves 3+: Apply customer coupons FIRST, before tax") : null
                      )
                    ) : null,
                    crDifficulty === 'easy' ? React.createElement("div", { className: "mb-6 inline-block bg-emerald-900/30 rounded-lg px-4 py-2 border border-emerald-700/50 text-left" },
                      React.createElement("p", { className: "text-xs text-emerald-300 mb-1" }, "\uD83D\uDFE2 Easy mode:"),
                      React.createElement("ul", { className: "text-xs text-emerald-200 list-disc list-inside space-y-1" },
                        React.createElement("li", null, "All prices in $0.50 increments"),
                        React.createElement("li", null, "No tax, no coupons"),
                        React.createElement("li", null, "2-3 items per customer"),
                        React.createElement("li", null, "Practice clean addition first")
                      )
                    ) : null,
                    React.createElement("div", { className: "text-center" },
                      React.createElement("button", { "aria-label": "I'm Ready", onClick: function() { upd('crIntro', false); genCashierRound(); },
                        className: "px-8 py-3 bg-amber-500 text-zinc-900 font-black text-lg rounded-xl hover:bg-amber-400 hover:scale-105 transition-all shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                      }, "I'm Ready \u2192")
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
                        React.createElement("p", { className: "text-[11px] text-zinc-400 font-bold uppercase" }, "Session Score"),
                        React.createElement("p", { className: "text-amber-400 font-black text-xl leading-none" }, crScore),
                        crBest > 0 && React.createElement("p", { className: "text-[11px] text-emerald-400 font-bold" }, "Best Round: " + crBest)
                      )
                    ),
                    
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
                          React.createElement("p", { className: "text-zinc-500 text-[11px] font-bold" }, "Waiting for total...")
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
                        className: "mb-4 rounded-lg overflow-hidden border border-zinc-700 relative z-0",
                        style: { background: '#0f172a' }
                      },
                        React.createElement("canvas", {
                          ref: function (el) { drawCashierScene(el); },
                          'role': 'img',
                          'aria-label': 'Cashier counter with ' + crCustomer.items.length + ' items: ' +
                            crCustomer.items.map(function(it) { return it.name; }).join(', '),
                          style: { width: '100%', display: 'block', height: 280 }
                        })
                      ),

                      // v3: AlloBot Coach panel — avatar + speech bubble with latest hint/praise
                      crBotCoachOn && crBotMessage && React.createElement("div", {
                        role: 'region', 'aria-label': 'AlloBot coach',
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
                              className: 'text-[10px] font-bold px-2 py-0.5 rounded ' + (crBotTtsOn ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700')
                            }, crBotTtsOn ? '🔊 Voice on' : '🔈 Voice off'),
                            React.createElement("button", {
                              onClick: function () { upd('crBotMessage', null); },
                              title: 'Dismiss',
                              className: 'text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }, 'Dismiss')
                          )
                        )
                      ),

                      // Receipt / Basket
                      React.createElement("div", { className: "bg-[#fffbc8] text-zinc-800 p-4 rounded-sm shadow-inner font-mono text-sm relative z-0" },
                        // jagged top
                        React.createElement("div", { className: "absolute top-0 left-0 w-full h-2 bg-zinc-800", style: { maskImage: 'radial-gradient(circle at 4px 0px, transparent 4px, black 4.5px)', maskSize: '8px 8px', maskRepeat: 'repeat-x' } }),
                        React.createElement("div", { className: "text-center pb-2 border-b-2 border-dashed border-zinc-400 mb-2 mt-1 opacity-80" },
                          React.createElement("p", { className: "font-bold text-xs flex justify-center items-center gap-1" }, React.createElement("span", null, "\u26A1"), React.createElement("span", null, "ALLOFOOD MKT"), React.createElement("span", null, "\u26A1")),
                          React.createElement("p", { className: "text-[11px]" }, "SYSTEM OFFLINE")
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
                            React.createElement("span", { className: "font-bold" }, "$" + (it.weight ? (it.price * it.weight).toFixed(2) : (it.price * it.qty).toFixed(2)))
                          );
                        }),
                        
                        grade !== 'elementary' ? React.createElement("div", { className: "mt-2 pt-2 border-t border-dashed border-zinc-400 text-xs flex justify-between text-zinc-600" },
                          React.createElement("span", null, "Subtotal"), React.createElement("span", null, "$" + crCustomer.subtotal.toFixed(2))
                        ) : null,
                        
                        crCustomer.coupon ? React.createElement("div", { className: "flex justify-between text-red-600 font-bold text-xs mt-1" },
                          React.createElement("span", null, "COUPON: " + crCustomer.coupon.label),
                          React.createElement("span", null, "-$" + (crCustomer.subtotal - crCustomer.afterCoupon).toFixed(2))
                        ) : null,
                        
                        crCustomer.hasTax ? React.createElement("div", { className: "flex justify-between text-zinc-600 text-xs mt-1" },
                          React.createElement("span", null, "Tax (" + (taxRate*100) + "%)"), React.createElement("span", null, crFb ? ("$" + crCustomer.taxAmt.toFixed(2)) : "???")
                        ) : null
                      )
                    ),

                    // Input / Feedback Area
                    crFb ? React.createElement("div", { className: "animate-in slide-in-from-bottom flex flex-col items-center mt-2" },
                      React.createElement("div", { className: "flex gap-2 my-2 text-xs w-full justify-center" },
                        React.createElement("div", { className: "text-center bg-zinc-800 rounded-lg px-2 py-2 border border-zinc-700 shadow-inner w-20" }, React.createElement("p", { className: "text-zinc-500 text-[11px] uppercase font-bold" }, "Accuracy"), React.createElement("p", { className: "text-emerald-400 font-black text-lg leading-tight" }, "+" + crFb.accuracy)),
                        React.createElement("div", { className: "text-center bg-zinc-800 rounded-lg px-2 py-2 border border-zinc-700 shadow-inner w-20" }, React.createElement("p", { className: "text-zinc-500 text-[11px] uppercase font-bold" }, "Speed"), React.createElement("p", { className: "text-sky-400 font-black text-lg leading-tight" }, "+" + crFb.speed)),
                        React.createElement("div", { className: "text-center bg-zinc-800 rounded-lg px-2 py-2 border border-amber-900/50 shadow-inner w-20" }, React.createElement("p", { className: "text-amber-500/70 text-[11px] uppercase font-bold" }, "Total"), React.createElement("p", { className: "text-amber-400 font-black text-lg leading-tight" }, "+" + crFb.score))
                      ),
                      React.createElement("button", { "aria-label": "Next Customer", onClick: genCashierRound, className: "w-full py-4 bg-amber-500 text-zinc-900 font-black rounded-xl hover:bg-amber-400 hover:scale-105 transition-all text-sm shadow-[0_0_15px_rgba(251,191,36,0.3)] mt-2" }, "Next Customer \u2192")
                    ) :
                    React.createElement("div", { className: "flex gap-2 relative z-20 mt-2" },
                      React.createElement("div", { className: "relative flex-1" },
                        React.createElement("span", { className: "absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-black text-xl" }, "$"),
                        React.createElement("input", {
                          type: "number", step: "0.01",
                          value: crAnswer,
                          onChange: function(e) { upd('crAnswer', e.target.value); },
                          onKeyDown: function(e) { if(e.key === 'Enter') submitCashierAnswer(); },
                          placeholder: "Total...", autoFocus: true,
                          'aria-label': 'Cashier register answer',
                          className: "w-full pl-8 pr-4 py-4 bg-zinc-800 border-2 border-zinc-600 rounded-xl text-zinc-100 font-mono text-xl font-bold focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner"
                        })
                      ),
                      React.createElement("button", { "aria-label": "ENTER", onClick: submitCashierAnswer, disabled: !crAnswer,
                        className: "px-6 bg-emerald-700 text-white font-black rounded-xl hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md text-lg active:scale-95"
                      }, "ENTER")
                    )
                  ) : null,

                  crGameOver ? React.createElement("div", { className: "relative z-10 text-center py-6" },
                    React.createElement("div", { className: "text-5xl mb-4" }, "\uD83D\uDD14"),
                    React.createElement("h2", { className: "text-2xl font-black text-red-500 mb-2 uppercase tracking-wide drop-shadow-md" }, "Shift Over!"),
                    React.createElement("p", { className: "text-sm text-zinc-300 mb-6 max-w-sm mx-auto" },
                      "You ran out of time! Still, you served ", React.createElement("span", { className: "text-amber-400 font-bold" }, crServed), " customers."
                    ),
                    React.createElement("div", { className: "bg-zinc-800/80 rounded-2xl p-6 border border-zinc-600 mb-8 inline-block shadow-xl shadow-black/50" },
                      React.createElement("p", { className: "text-[11px] text-zinc-400 font-bold uppercase mb-1 tracking-widest gap-2" }, "Final Score"),
                      React.createElement("p", { className: "text-5xl font-black text-amber-500 drop-shadow-md" }, crScore),
                      crBest > 0 && crScore >= crBest && crScore > 0 ? React.createElement("p", { className: "text-xs text-emerald-400 font-bold mt-2 animate-pulse" }, "\uD83C\uDFC6 NEW HIGH SCORE!") : null
                    ),
                    React.createElement("div", { className: "flex flex-col items-center space-y-3 w-full" }, 
                      React.createElement("button", { onClick: startCashierRush, className: "px-8 py-3 bg-amber-500 text-zinc-900 font-black text-lg rounded-xl hover:bg-amber-400 transition-all shadow-[0_0_15px_rgba(251,191,36,0.5)] w-full max-w-[280px]" }, "Play Again \u21BB"),
                      React.createElement("button", { "aria-label": "Exit Emergency", onClick: function() { upd('crActive', false); }, className: "px-8 py-3 bg-transparent text-zinc-400 font-black text-sm rounded-xl hover:text-white hover:bg-zinc-800 transition-all w-full max-w-[280px] border border-zinc-700" }, "Exit Emergency")
                    )
                  ) : null

                ) : React.createElement(React.Fragment, null,
                  // ── Header row: Recipe Mode toggle (middle+) ──
                grade !== 'elementary' && React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-2" },
                  React.createElement("button", { "aria-label": "Select a Recipe", onClick: function () { upd('recipeMode', !recipeMode); upd('activeRecipe', null); },
                    className: "px-3 py-1.5 rounded-lg text-xs font-black transition-all " + (recipeMode ? 'bg-purple-700 text-white ring-2 ring-purple-300 shadow-lg' : 'bg-white text-purple-600 border border-purple-600 hover:bg-purple-50')
                  }, recipeMode ? '\uD83D\uDCCB Recipe Mode ON' : '\uD83D\uDCCB Recipe Mode')
                ),

                // ── Recipe Panel (when active) ──
                recipeMode && React.createElement("div", { className: "bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl p-4 border border-purple-200" },
                  React.createElement("h4", { className: "text-sm font-bold text-purple-800 mb-3" }, "\uD83D\uDCCB Select a Recipe"),
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
                      React.createElement("label", { className: "text-xs font-bold text-purple-700" }, "\uD83C\uDF7D Servings:"),
                      React.createElement("input", { type: "range", min: 1, max: 12, value: recipeServings, 'aria-label': 'Number of servings', onChange: function (e) { upd('recipeServings', parseInt(e.target.value)); },
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
                      React.createElement("button", { "aria-label": "Check Recipe Cart", onClick: function () {
                        var result = checkRecipeCart();
                        if (!result) return;
                        if (result.complete) {
                          upd('recipeFb', { ok: true, msg: '\u2705 All ' + result.total + ' ingredients found! Total: ' + fmt(cartGrand) + ' \u2014 +25 XP!' });
                          if (typeof addXP === 'function') addXP(25, 'Money Math: Recipe shopping complete');
                          if (typeof awardStemXP === 'function') awardStemXP('moneyMath', 25, 'recipe shopping');
                        } else {
                          upd('recipeFb', { ok: false, msg: '\u274C Missing ' + result.missing.length + ' item(s): ' + result.missing.join(', ') });
                        }
                      }, className: "flex-1 px-4 py-2 bg-purple-700 text-white font-bold rounded-xl hover:bg-purple-600 transition-all text-sm shadow-md" }, "\u2714 Check Recipe Cart"),
                      React.createElement("button", { "aria-label": "Clear", onClick: function () { upd('cart', []); upd('recipeFb', null); }, className: "px-3 py-2 text-xs text-red-400 hover:text-red-600 font-bold" }, "Clear")
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
                          { id: 'easy',      label: '\uD83D\uDFE2 Round',  title: 'Round prices in $0.50 increments' },
                          { id: 'standard',  label: '\uD83D\uDFE1 Real',   title: 'Real-world cents-precision prices' },
                          { id: 'challenge', label: '\uD83D\uDD34 Hard',   title: 'Real prices + harder mental math' }
                        ].map(function(sd) {
                          var active = storeDifficulty === sd.id;
                          return React.createElement("button", {
                            key: 'sd-' + sd.id,
                            onClick: function() {
                              upd('storeDifficulty', sd.id);
                              // Clear cart on difficulty switch so cart prices match new tier
                              upd('cart', []);
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
                                if (typeof addToast === 'function') addToast('Added ' + item.name + ' to cart!', 'success');
                              }
                            },
                            className: "w-full p-3 bg-white rounded-xl border text-left group transition-all " + (isAdding ? 'border-orange-400 ring-2 ring-orange-200 shadow-md' : 'border-orange-100 hover:border-orange-600 hover:shadow-md')
                          },
                            React.createElement("div", { className: "text-2xl mb-1" }, item.name.split(' ')[0]),
                            React.createElement("p", { className: "text-xs font-bold text-slate-700 truncate" }, item.name.substring(item.name.indexOf(' ') + 1)),
                            React.createElement("div", { className: "flex items-baseline gap-1" },
                              React.createElement("span", { className: "text-sm font-black text-emerald-600" }, fmt(displayPrice)),
                              isWeighed && React.createElement("span", { className: "text-[11px] text-orange-500 font-bold" }, "/" + item.pricePer)
                            ),
                            React.createElement("span", { className: "text-[11px] font-bold " + (isWeighed ? 'text-orange-500' : 'text-orange-400 group-hover:text-orange-600') }, isWeighed ? '\u2696 Enter weight' : '+ Add to cart')
                          ),
                          // Weight entry popup for per-lb items
                          isAdding && React.createElement("div", { className: "absolute z-20 left-0 right-0 -bottom-2 translate-y-full bg-white rounded-xl p-3 shadow-xl border-2 border-orange-300 space-y-2" },
                            React.createElement("p", { className: "text-[11px] font-bold text-orange-700 text-center" }, "How many " + item.pricePer + "s?"),
                            React.createElement("div", { className: "flex items-center gap-1.5" },
                              React.createElement("button", { "aria-label": "Decrease item weight", onClick: function () { upd('weightInput', Math.max(0.25, (d.weightInput || 1) - 0.25)); }, className: "px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200" }, "\u2212"),
                              React.createElement("input", { type: "number", step: "0.25", min: "0.25", value: d.weightInput || 1, 'aria-label': 'Item weight in pounds', onChange: function (e) { upd('weightInput', parseFloat(e.target.value) || 0.25); }, className: "w-14 text-center px-1 py-1 border border-orange-600 rounded-lg text-xs font-bold focus:ring-2 focus:ring-orange-400 outline-none" }),
                              React.createElement("button", { "aria-label": "Add to Cart", onClick: function () { upd('weightInput', (d.weightInput || 1) + 0.25); }, className: "px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200" }, "+"),
                              React.createElement("span", { className: "text-[11px] text-slate-600 font-bold" }, item.pricePer)
                            ),
                            React.createElement("p", { className: "text-xs font-bold text-center text-emerald-600" }, "= " + fmt(displayPrice * (d.weightInput || 1))),
                            React.createElement("button", { "aria-label": "Add to Cart", onClick: function () {
                              var w = d.weightInput || 1;
                              upd('cart', [].concat(cart, [{ name: item.name, price: displayPrice, weight: w, pricePer: item.pricePer, qty: 1 }]));
                              upd('weightItemIdx', null);
                              if (typeof addToast === 'function') addToast('Added ' + w + ' ' + item.pricePer + ' ' + item.name + '!', 'success');
                            }, className: "w-full px-3 py-1.5 bg-orange-700 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-all" }, "\uD83D\uDED2 Add to Cart")
                          )
                        );
                      })
                    )
                  ),
                  // Cart
                  React.createElement("div", { className: "bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200" },
                    React.createElement("h3", { className: "text-sm font-bold text-emerald-800 mb-2" }, "\uD83D\uDED2 Your Cart (" + cart.length + ")"),
                    cart.length === 0
                      ? React.createElement("p", { className: "text-xs text-slate-600 text-center py-4" }, recipeMode && selectedRecipe ? "Shop for the recipe ingredients!" : "Cart is empty. Click items to add!")
                      : React.createElement("div", { className: "space-y-1.5 max-h-[320px] overflow-y-auto" },
                          cart.map(function (item, ci) {
                            var isWeighted = item.pricePer && item.pricePer !== 'each';
                            var lineTotal = isWeighted ? item.price * (item.weight || 1) : item.price * (item.qty || 1);
                            var qtyLabel = isWeighted
                              ? (item.weight || 1) + ' ' + item.pricePer + ' @ ' + fmt(item.price) + '/' + item.pricePer
                              : (item.qty > 1 ? item.qty + 'x ' : '');
                            return React.createElement("div", { key: ci, className: "flex items-center justify-between bg-white rounded-lg px-2 py-1.5 border border-emerald-100" },
                              React.createElement("div", { className: "flex-1 min-w-0" },
                                React.createElement("p", { className: "text-xs font-medium text-slate-700 truncate" }, (isWeighted ? '' : qtyLabel) + item.name),
                                isWeighted && React.createElement("p", { className: "text-[11px] text-slate-600" }, qtyLabel)
                              ),
                              challengeMode
                                ? React.createElement("span", { className: "text-xs font-bold text-amber-500 ml-2 whitespace-nowrap" }, isWeighted ? fmt(item.price) + '/' + item.pricePer : fmt(item.price) + '/ea')
                                : React.createElement("span", { className: "text-xs font-bold text-emerald-600 ml-2 whitespace-nowrap" }, fmt(lineTotal)),
                              React.createElement("button", { onClick: function () {
                                  if (!isWeighted && item.qty > 1) { upd('cart', cart.map(function (c, idx) { return idx === ci ? Object.assign({}, c, { qty: c.qty - 1 }) : c; })); }
                                  else { upd('cart', cart.filter(function (_, idx) { return idx !== ci; })); }
                                  upd('cartCheckoutFb', null); upd('recipeFb', null);
                                }, className: "ml-1 text-red-300 hover:text-red-500 text-xs font-bold"
                              }, "\u2715")
                            );
                          })
                        ),
                    // ── Challenge Mode: Mental Math Checkout ──
                    challengeMode && cart.length > 0 && React.createElement("div", { className: "mt-3 pt-3 border-t border-amber-200 space-y-2" },
                      React.createElement("p", { className: "text-xs font-bold text-amber-700" }, '\uD83C\uDFAF Add up the items yourself! ' + (gc.includeTax ? 'Don\u2019t forget 8% tax!' : '')),
                      React.createElement("div", { className: "space-y-1.5" },
                        React.createElement("div", { className: "flex items-center gap-2" },
                          React.createElement("label", { className: "text-xs text-slate-600 w-20" }, "Subtotal:"),
                          React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', 'aria-label': 'Guess subtotal', value: d.cartGuessSubtotal != null ? d.cartGuessSubtotal : '', onChange: function (e) { upd('cartGuessSubtotal', e.target.value === '' ? null : parseFloat(e.target.value)); upd('cartCheckoutFb', null); }, className: "px-2 py-1.5 border border-amber-600 rounded-lg text-xs font-bold w-28 focus:ring-2 focus:ring-amber-400 outline-none" })
                        ),
                        gc.includeTax && React.createElement("div", { className: "flex items-center gap-2" },
                          React.createElement("label", { className: "text-xs text-slate-600 w-20" }, "Tax (8%):"),
                          React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', 'aria-label': 'Guess tax amount', value: d.cartGuessTax != null ? d.cartGuessTax : '', onChange: function (e) { upd('cartGuessTax', e.target.value === '' ? null : parseFloat(e.target.value)); upd('cartCheckoutFb', null); }, className: "px-2 py-1.5 border border-amber-600 rounded-lg text-xs font-bold w-28 focus:ring-2 focus:ring-amber-400 outline-none" })
                        ),
                        React.createElement("div", { className: "flex items-center gap-2" },
                          React.createElement("label", { className: "text-xs font-bold text-slate-700 w-20" }, "Grand Total:"),
                          React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', value: d.cartGuessTotal != null ? d.cartGuessTotal : '', onChange: function (e) { upd('cartGuessTotal', e.target.value === '' ? null : parseFloat(e.target.value)); upd('cartCheckoutFb', null); }, className: "px-2 py-1.5 border border-amber-600 rounded-lg text-xs font-bold w-28 focus:ring-2 focus:ring-amber-400 outline-none" })
                        )
                      ),
                      React.createElement("button", { "aria-label": "Check My Math", onClick: function () {
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
                      }, disabled: d.cartGuessTotal == null, className: "w-full px-4 py-2 bg-amber-700 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-sm shadow-md disabled:opacity-40" }, '\uD83E\uDDE0 Check My Math'),
                      d.cartCheckoutFb && React.createElement("p", { className: "text-xs font-bold " + (d.cartCheckoutFb.ok ? 'text-green-600' : 'text-red-500') }, d.cartCheckoutFb.msg),
                      React.createElement("button", { "aria-label": "Clear Cart", onClick: function () { upd('cart', []); upd('cartGuessSubtotal', null); upd('cartGuessTax', null); upd('cartGuessTotal', null); upd('cartCheckoutFb', null); }, className: "w-full px-3 py-1.5 text-xs text-red-400 hover:text-red-600 font-bold" }, "Clear Cart")
                    ),
                    // ── Normal Mode: Show totals ──
                    !challengeMode && cart.length > 0 && React.createElement("div", { className: "mt-3 pt-3 border-t border-emerald-200 space-y-1" },
                      React.createElement("div", { className: "flex justify-between text-xs" },
                        React.createElement("span", { className: "text-slate-600" }, "Subtotal"),
                        React.createElement("span", { className: "font-bold" }, fmt(cartTotal))
                      ),
                      gc.includeTax && React.createElement("div", { className: "flex justify-between text-xs" },
                        React.createElement("span", { className: "text-slate-600" }, "Tax (8%)"),
                        React.createElement("span", { className: "font-bold text-orange-500" }, fmt(cartTax))
                      ),
                      React.createElement("div", { className: "flex justify-between text-sm font-black" },
                        React.createElement("span", { className: "text-slate-700" }, "Total"),
                        React.createElement("span", { className: "text-emerald-600" }, fmt(cartGrand))
                      ),
                      React.createElement("button", { "aria-label": "Checkout", onClick: function () {
                        if (typeof addXP === 'function') addXP(20, 'Money Math: Completed a grocery purchase');
                        if (typeof addToast === 'function') addToast('\uD83C\uDF89 Purchase complete! Total: ' + fmt(cartGrand), 'success');
                        upd('cart', []);
                      }, className: "w-full mt-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all text-sm shadow-md" }, "\uD83D\uDCB3 Checkout"),
                      React.createElement("button", { "aria-label": "Clear Cart", onClick: function () { upd('cart', []); }, className: "w-full px-3 py-1.5 text-xs text-red-400 hover:text-red-600 font-bold" }, "Clear Cart")
                    )
                  )
                )
              ),

              // ═══ WORD PROBLEMS TAB ═══
              tab === 'word' && React.createElement("div", { className: "bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-5 border border-violet-200" },
                React.createElement("h3", { className: "text-base font-bold text-violet-800 mb-2" }, "\uD83D\uDCDD Money Word Problems"),
                React.createElement("p", { className: "text-xs text-violet-500 mb-4" }, "AI-generated problems at " + gc.label + " level using " + cur.flag + " " + cur.name),
                !d.wpProblem && !d.wpLoading
                  ? React.createElement("div", { className: "text-center py-8" },
                      React.createElement("button", { "aria-label": "Generate Word Problem", onClick: genWordProblem,
                        className: "px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-xl hover:from-violet-600 hover:to-purple-600 transition-all shadow-lg text-sm"
                      }, "\u2728 Generate Word Problem")
                    )
                  : d.wpLoading
                    ? React.createElement("div", { className: "text-center py-8" },
                        React.createElement("div", { className: "animate-spin text-3xl mb-2" }, "\u2699\uFE0F"),
                        React.createElement("p", { className: "text-xs text-violet-500 font-bold" }, "Generating problem...")
                      )
                    : React.createElement("div", { className: "space-y-4" },
                        React.createElement("div", { className: "bg-white rounded-xl p-4 shadow-sm border border-violet-100" },
                          d.wpProblem.category && React.createElement("span", { className: "inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-600 mb-2" }, d.wpProblem.category.toUpperCase()),
                          React.createElement("p", { className: "text-sm text-slate-700 leading-relaxed" }, d.wpProblem.problem)
                        ),
                        d.wpProblem.hint && React.createElement("button", { onClick: function () { upd('wpShowHint', !d.wpShowHint); },
                          className: "text-xs font-bold text-amber-500 hover:text-amber-700"
                        }, d.wpShowHint ? '\uD83D\uDCA1 Hide Hint' : '\uD83D\uDCA1 Show Hint'),
                        d.wpShowHint && React.createElement("p", { className: "text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200" }, d.wpProblem.hint),
                        React.createElement("div", { className: "flex items-center gap-3" },
                          React.createElement("input", { type: "number", step: isJPY ? "1" : "0.01", placeholder: "Your answer...",
                            'aria-label': 'Word problem answer',
                            value: d.wpAnswer !== null && d.wpAnswer !== undefined ? d.wpAnswer : '',
                            onChange: function (e) { upd('wpAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); },
                            className: "px-4 py-2 border border-slate-400 rounded-xl text-sm font-bold w-36 focus:ring-2 focus:ring-violet-400 outline-none"
                          }),
                          React.createElement("button", { "aria-label": "Check", onClick: function () {
                              var correct = d.wpProblem.answer;
                              var userAns = d.wpAnswer;
                              var isRight = typeof correct === 'number' && typeof userAns === 'number' && Math.abs(userAns - correct) < (correct * 0.02 + 0.01);
                              upd('wpFeedback', isRight ? { ok: true, msg: '\u2705 ' + t('stem.dissection.correct') } : { ok: false, msg: '\u274C The answer is ' + (typeof correct === 'number' ? fmt(correct) : correct) });
                              if (isRight && typeof addXP === 'function') addXP(25, 'Money Math: Word problem solved');
                            },
                            className: "px-5 py-2 bg-violet-700 text-white font-bold rounded-xl hover:bg-violet-600 transition-all text-sm"
                          }, "\u2714 Check")
                        ),
                        d.wpFeedback && React.createElement("p", { className: "text-sm font-bold " + (d.wpFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.wpFeedback.msg),
                        d.wpFeedback && !d.wpFeedback.ok && d.wpProblem.explanation && React.createElement("div", { className: "bg-slate-50 rounded-xl p-3 border border-slate-400" },
                          React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase mb-1" }, "Solution"),
                          React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed whitespace-pre-line" }, d.wpProblem.explanation)
                        ),
                        React.createElement("button", { "aria-label": "New Problem", onClick: genWordProblem,
                          className: "px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs"
                        }, "\u21BB New Problem")
                      )
                  )
              ),

              // ═══ CURRENCY EXCHANGE TAB ═══
              tab === 'exchange' && React.createElement("div", { className: "bg-gradient-to-br from-sky-50 to-cyan-50 rounded-xl p-5 border border-sky-200" },
                React.createElement("h3", { className: "text-base font-bold text-sky-800 mb-2" }, "\uD83C\uDF0D Currency Exchange"),
                React.createElement("p", { className: "text-xs text-sky-500 mb-4" }, "Practice converting between world currencies (approximate rates)"),
                // Exchange rate reference
                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-sky-100 mb-4" },
                  React.createElement("p", { className: "text-[11px] font-bold text-sky-400 uppercase mb-2" }, "Reference Rates (vs 1 USD)"),
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
                      React.createElement("button", { "aria-label": "Generate Conversion Problem", onClick: genExchangeProblem,
                        className: "px-6 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold rounded-xl hover:from-sky-600 hover:to-cyan-600 transition-all shadow-lg text-sm"
                      }, "\u2728 Generate Conversion Problem")
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
                          'aria-label': 'Currency exchange answer',
                          value: d.exchAnswer !== null && d.exchAnswer !== undefined ? d.exchAnswer : '',
                          onChange: function (e) { upd('exchAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); },
                          className: "px-4 py-2 border border-slate-400 rounded-xl text-sm font-bold w-40 focus:ring-2 focus:ring-sky-400 outline-none"
                        }),
                        React.createElement("button", { "aria-label": "Check", onClick: function () {
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
                        }, "\u2714 Check")
                      ),
                      d.exchFeedback && React.createElement("p", { className: "text-sm font-bold " + (d.exchFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.exchFeedback.msg),
                      React.createElement("button", { "aria-label": "Next Problem", onClick: genExchangeProblem,
                        className: "px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs"
                      }, "\u21BB Next Problem")
                    )
              ),

              // ═══ TIPS & DISCOUNTS TAB ═══
              tab === 'tips' && React.createElement("div", { className: "space-y-4" },
                React.createElement("div", { className: "bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-5 border border-pink-200" },
                  React.createElement("h3", { className: "text-base font-bold text-pink-800 mb-3" }, "\uD83D\uDCB3 Tips & Discounts"),
                  React.createElement("div", { className: "flex gap-2 mb-4" },
                    React.createElement("button", { onClick: genTipProblem, className: "flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all " + ((d.tipMode || 'tip') === 'tip' ? 'bg-pink-600 text-white shadow-md' : 'bg-white text-pink-600 border border-pink-600 hover:bg-pink-50') }, "\uD83C\uDF7D Tip Calculator"),
                    React.createElement("button", { "aria-label": "Discount Shopping", onClick: genDiscountProblem, className: "flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all " + (d.tipMode === 'discount' ? 'bg-pink-600 text-white shadow-md' : 'bg-white text-pink-600 border border-pink-600 hover:bg-pink-50') }, "\uD83C\uDFF7\uFE0F Discount Shopping")
                  ),
                  // Tip mode
                  (d.tipMode || 'tip') === 'tip' && (!d.tipBill
                    ? React.createElement("div", { className: "text-center py-6" },
                        React.createElement("p", { className: "text-sm text-slate-600 mb-3" }, "Practice calculating restaurant tips and splitting bills"),
                        React.createElement("button", { "aria-label": "Generate Tip Problem", onClick: genTipProblem, className: "px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg text-sm" }, "\u2728 Generate Tip Problem")
                      )
                    : React.createElement("div", { className: "space-y-4" },
                        React.createElement("div", { className: "bg-white rounded-xl p-4 shadow-sm border border-pink-100" },
                          React.createElement("div", { className: "grid grid-cols-3 gap-3 text-center" },
                            React.createElement("div", null, React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Bill Total"), React.createElement("p", { className: "text-xl font-black text-pink-600" }, fmt(d.tipBill))),
                            React.createElement("div", null, React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Tip %"), React.createElement("p", { className: "text-xl font-black text-amber-500" }, d.tipPct + '%')),
                            React.createElement("div", null, React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Diners"), React.createElement("p", { className: "text-xl font-black text-blue-500" }, d.tipDiners))
                          ),
                          React.createElement("p", { className: "text-xs text-center text-slate-600 mt-3" }, "How much does each person pay (bill + tip, split " + d.tipDiners + " ways)?")
                        ),
                        React.createElement("div", { className: "flex items-center gap-3" },
                          React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: 'Per person...',
                            'aria-label': 'Tip per person answer',
                            value: d.tipAnswer != null ? d.tipAnswer : '', onChange: function (e) { upd('tipAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); },
                            className: "px-4 py-2 border border-slate-400 rounded-xl text-sm font-bold w-36 focus:ring-2 focus:ring-pink-400 outline-none"
                          }),
                          React.createElement("button", { "aria-label": "Check", onClick: function () {
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
                          }, "\u2714 Check")
                        ),
                        d.tipFeedback && React.createElement("p", { className: "text-sm font-bold " + (d.tipFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.tipFeedback.msg),
                        React.createElement("button", { "aria-label": "Next Problem", onClick: genTipProblem, className: "px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs" }, "\u21BB Next Problem")
                      )
                  ),
                  // Discount mode
                  d.tipMode === 'discount' && (!d.discOriginal
                    ? React.createElement("div", { className: "text-center py-6" },
                        React.createElement("p", { className: "text-sm text-slate-600 mb-3" }, "Calculate sale prices with percentage discounts" + (gc.includePercent ? ' and coupons' : '')),
                        React.createElement("button", { "aria-label": "Generate Discount Problem", onClick: genDiscountProblem, className: "px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg text-sm" }, "\u2728 Generate Discount Problem")
                      )
                    : React.createElement("div", { className: "space-y-4" },
                        React.createElement("div", { className: "bg-white rounded-xl p-4 shadow-sm border border-pink-100" },
                          React.createElement("div", { className: "text-center" },
                            React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Original Price"),
                            React.createElement("p", { className: "text-2xl font-black text-slate-600 line-through" }, fmt(d.discOriginal)),
                            React.createElement("div", { className: "flex items-center justify-center gap-2 mt-2" },
                              React.createElement("span", { className: "px-3 py-1 bg-red-100 text-red-600 text-sm font-black rounded-full" }, d.discPercent + '% OFF'),
                              d.discCoupon > 0 && React.createElement("span", { className: "px-3 py-1 bg-amber-100 text-amber-800 text-sm font-black rounded-full" }, '+ ' + fmt(d.discCoupon) + ' coupon')
                            ),
                            React.createElement("p", { className: "text-xs text-slate-600 mt-2" }, "What is the final price" + (d.discCoupon > 0 ? ' after discount AND coupon' : '') + '?')
                          )
                        ),
                        React.createElement("div", { className: "flex items-center gap-3" },
                          React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: 'Sale price...',
                            'aria-label': 'Sale price answer',
                            value: d.discAnswer != null ? d.discAnswer : '', onChange: function (e) { upd('discAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); },
                            className: "px-4 py-2 border border-slate-400 rounded-xl text-sm font-bold w-36 focus:ring-2 focus:ring-pink-400 outline-none"
                          }),
                          React.createElement("button", { "aria-label": "Check", onClick: function () {
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
                          }, "\u2714 Check")
                        ),
                        d.discFeedback && React.createElement("p", { className: "text-sm font-bold " + (d.discFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.discFeedback.msg),
                        React.createElement("button", { "aria-label": "Next Problem", onClick: genDiscountProblem, className: "px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs" }, "\u21BB Next Problem")
                      )
                  )
                )
              ),

              // ═══ BUDGET PLANNER TAB ═══
              tab === 'budget' && React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-200" },
                React.createElement("h3", { className: "text-base font-bold text-indigo-800 mb-2" }, "\uD83D\uDCCA Budget Planner"),
                React.createElement("p", { className: "text-xs text-indigo-500 mb-4" }, "Allocate your monthly income across spending categories"),
                // Income input
                React.createElement("div", { className: "flex items-center gap-3 mb-4" },
                  React.createElement("label", { className: "text-sm font-bold text-slate-600" }, "Monthly Income:"),
                  React.createElement("input", { type: "number", value: budgetIncome,
                    'aria-label': 'Monthly income',
                    onChange: function (e) { upd('budgetIncome', parseFloat(e.target.value) || 0); },
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
                          upd('budgetCats', newCats);
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
                  React.createElement("p", { className: "text-xs font-bold text-slate-600 uppercase mb-2" }, "Budget Summary"),
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
                  budgetUsed === 100 && React.createElement("p", { className: "text-xs font-bold text-emerald-500 text-center mt-3" }, "\u2705 Perfectly balanced budget!")
                )
              ),

              // ═══ CHALLENGES TAB ═══
              tab === 'cents' && React.createElement("div", { className: "space-y-4" },
                React.createElement("h3", { className: "text-base font-bold text-amber-800 mb-2" }, "\uD83E\uDE99 Common Cents"),
                // Fewest Coins challenge
                React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200" },
                  React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h4", { className: "text-sm font-bold text-amber-800" }, "\uD83E\uDE99 Fewest Coins & Bills Challenge"),
                    React.createElement("button", { "aria-label": "Make this amount with the FEWEST coins & bills", onClick: genFewestCoinsChallenge, className: "px-3 py-1.5 bg-amber-700 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all" }, !d.fcTarget ? '\u2728 Start' : '\u21BB New')
                  ),
                  d.fcTarget && React.createElement("div", { className: "space-y-3" },
                    React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border border-amber-100" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Make this amount with the FEWEST coins & bills"),
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
                        React.createElement("button", { "aria-label": "Check", onClick: function () {
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
                        }, className: "flex-1 px-4 py-2 bg-amber-700 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-xs" }, "\u2714 Check"),
                        React.createElement("button", { "aria-label": "Reset coin selection", onClick: function () { upd('fcPlaced', []); }, className: "px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs" }, "\u21BA Reset")
                      ),
                      d.fcFeedback && React.createElement("p", { className: "text-xs font-bold mt-2 " + (d.fcFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.fcFeedback.msg)
                    )
                  )
                ),

                // Unit Pricing challenge
                React.createElement("div", { className: "bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-200" },
                  React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h4", { className: "text-sm font-bold text-teal-800" }, "\uD83D\uDED2 Best Deal: Unit Pricing"),
                    React.createElement("button", { "aria-label": "Gen Unit Price Problem", onClick: genUnitPriceProblem, className: "px-3 py-1.5 bg-teal-700 text-white text-xs font-bold rounded-lg hover:bg-teal-600 transition-all" }, !d.upItem ? '\u2728 Start' : '\u21BB New')
                  ),
                  d.upItem && d.upA && d.upB && React.createElement("div", { className: "space-y-3" },
                    React.createElement("p", { className: "text-xs text-slate-600 text-center" }, "Which is the better deal for " + d.upItem.name + "?"),
                    React.createElement("div", { className: "grid grid-cols-2 gap-3" },
                      React.createElement("button", { "aria-label": "Option A", onClick: function () { upd('upAnswer', 'A'); },
                        className: "p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02] " + (d.upAnswer === 'A' ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-slate-200 bg-white hover:border-teal-600')
                      },
                        React.createElement("p", { className: "text-2xl mb-1" }, d.upItem.name.split(' ')[0]),
                        React.createElement("p", { className: "text-lg font-black text-teal-700" }, fmt(d.upA.price)),
                        React.createElement("p", { className: "text-xs text-slate-600" }, d.upA.qty + ' ' + d.upItem.unit + (d.upA.qty > 1 ? 's' : '')),
                        React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, 'Option A')
                      ),
                      React.createElement("button", { "aria-label": "Option B", onClick: function () { upd('upAnswer', 'B'); },
                        className: "p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02] " + (d.upAnswer === 'B' ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-slate-200 bg-white hover:border-teal-600')
                      },
                        React.createElement("p", { className: "text-2xl mb-1" }, d.upItem.name.split(' ')[0]),
                        React.createElement("p", { className: "text-lg font-black text-teal-700" }, fmt(d.upB.price)),
                        React.createElement("p", { className: "text-xs text-slate-600" }, d.upB.qty + ' ' + d.upItem.unit + (d.upB.qty > 1 ? 's' : '')),
                        React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, 'Option B')
                      )
                    ),
                    d.upAnswer && React.createElement("button", { "aria-label": "Check My Answer", onClick: function () {
                      var unitA = d.upA.price / d.upA.qty;
                      var unitB = d.upB.price / d.upB.qty;
                      var correct = unitA <= unitB ? 'A' : 'B';
                      var isRight = d.upAnswer === correct;
                      upd('upFeedback', isRight
                        ? { ok: true, msg: '\u2705 Correct! Option A: ' + fmt(unitA) + '/' + d.upItem.unit + ' vs Option B: ' + fmt(unitB) + '/' + d.upItem.unit }
                        : { ok: false, msg: '\u274C Option ' + correct + ' is cheaper. A: ' + fmt(unitA) + '/' + d.upItem.unit + ' vs B: ' + fmt(unitB) + '/' + d.upItem.unit }
                      );
                      if (isRight && typeof addXP === 'function') addXP(15, 'Money Math: Unit pricing');
                    }, className: "w-full px-4 py-2 bg-teal-700 text-white font-bold rounded-xl hover:bg-teal-600 transition-all text-sm" }, "\u2714 Check My Answer"),
                    d.upFeedback && React.createElement("p", { className: "text-xs font-bold " + (d.upFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.upFeedback.msg)
                  )
                ),

                // ── Estimate the Total ──
                React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200" },
                  React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h4", { className: "text-sm font-bold text-indigo-800" }, "\uD83E\uDDFE Estimate the Total"),
                    React.createElement("button", { "aria-label": "Gen Estimate Total", onClick: genEstimateTotal, className: "px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 transition-all" }, !d.estItems ? '\u2728 Start' : '\u21BB New')
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
                        React.createElement("p", { className: "text-xs text-indigo-600 font-bold text-center" }, "What is the total?")
                      )
                    ),
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', value: d.estAnswer != null ? d.estAnswer : '', onChange: function (e) { upd('estAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); upd('estFb', null); }, className: "flex-1 px-3 py-2 border border-indigo-600 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none" }),
                      React.createElement("button", { "aria-label": "Gen Change Check", onClick: function () {
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
                    React.createElement("h4", { className: "text-sm font-bold text-rose-800" }, "\uD83E\uDDD0 Check the Change"),
                    React.createElement("button", { "aria-label": "Item costs:", onClick: genChangeCheck, className: "px-3 py-1.5 bg-rose-700 text-white text-xs font-bold rounded-lg hover:bg-rose-600 transition-all" }, d.ccPrice == null ? '\u2728 Start' : '\u21BB New')
                  ),
                  d.ccPrice != null && React.createElement("div", { className: "space-y-3" },
                    React.createElement("div", { className: "bg-white rounded-lg border border-rose-100 p-4 text-center space-y-1" },
                      React.createElement("p", { className: "text-xs text-slate-600" }, "Item costs: " + React.createElement("span", { className: "font-black text-slate-700" }, fmt(d.ccPrice)) + " | Paid: " + React.createElement("span", { className: "font-black text-slate-700" }, fmt(d.ccPaid))),
                      React.createElement("p", { className: "text-xs text-slate-600" }, "Item costs:"),
                      React.createElement("p", { className: "text-lg font-black text-rose-700" }, fmt(d.ccPrice)),
                      React.createElement("p", { className: "text-xs text-slate-600 mt-1" }, "Paid with:"),
                      React.createElement("p", { className: "text-lg font-black text-slate-700" }, fmt(d.ccPaid)),
                      React.createElement("p", { className: "text-xs text-slate-600 mt-2" }, "Cashier gives you:"),
                      React.createElement("p", { className: "text-2xl font-black text-amber-600" }, fmt(d.ccProposed)),
                      React.createElement("p", { className: "text-xs font-bold text-rose-600 mt-2" }, "Is this the right change? \uD83E\uDD14")
                    ),
                    React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                      React.createElement("button", { onClick: function () { upd('ccAnswer', true); upd('ccFb', null); }, className: "py-2 rounded-xl font-bold text-sm transition-all " + (d.ccAnswer === true ? 'bg-green-700 text-white shadow-md' : 'bg-white border border-green-600 text-green-600 hover:bg-green-50') }, "\u2705 Correct!"),
                      React.createElement("button", { onClick: function () { upd('ccAnswer', false); upd('ccFb', null); }, className: "py-2 rounded-xl font-bold text-sm transition-all " + (d.ccAnswer === false ? 'bg-red-700 text-white shadow-md' : 'bg-white border border-red-600 text-red-600 hover:bg-red-50') }, "\u274C Wrong!")
                    ),
                    d.ccAnswer != null && React.createElement("button", { "aria-label": "Submit", onClick: function () {
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
                    }, className: "w-full px-4 py-2 bg-rose-700 text-white font-bold rounded-xl hover:bg-rose-600 transition-all text-sm" }, "\u2714 Submit"),
                    d.ccFb && React.createElement("p", { className: "text-xs font-bold " + (d.ccFb.ok ? 'text-green-600' : 'text-red-500') }, d.ccFb.msg)
                  )
                ),

                // ── Coupon Stack ──
                React.createElement("div", { className: "bg-gradient-to-br from-fuchsia-50 to-purple-50 rounded-xl p-4 border border-fuchsia-200" },
                  React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h4", { className: "text-sm font-bold text-fuchsia-800" }, "\uD83C\uDFF7 Coupon Stack"),
                    React.createElement("button", { "aria-label": "Original price:", onClick: genCouponStack, className: "px-3 py-1.5 bg-fuchsia-700 text-white text-xs font-bold rounded-lg hover:bg-fuchsia-600 transition-all" }, d.csOriginal == null ? '\u2728 Start' : '\u21BB New')
                  ),
                  d.csOriginal != null && React.createElement("div", { className: "space-y-3" },
                    React.createElement("div", { className: "bg-white rounded-lg border border-fuchsia-100 p-4 space-y-2" },
                      React.createElement("p", { className: "text-xs text-slate-600 text-center" }, "Original price:"),
                      React.createElement("p", { className: "text-2xl font-black text-fuchsia-700 text-center" }, fmt(d.csOriginal)),
                      React.createElement("p", { className: "text-xs text-slate-600 text-center mt-2" }, "Apply these discounts in order:"),
                      d.csDiscounts.map(function (disc, i) {
                        return React.createElement("div", { key: i, className: "flex items-center justify-center gap-2 text-sm" },
                          React.createElement("span", { className: "text-lg" }, ['\uD83C\uDFF7\uFE0F', '\u2702\uFE0F', '\uD83C\uDF81'][i] || '\uD83C\uDFF7\uFE0F'),
                          React.createElement("span", { className: "font-bold text-fuchsia-600" }, disc.type === 'pct' ? disc.val + '% off' : fmt(disc.val) + ' off')
                        );
                      })
                    ),
                    React.createElement("div", { className: "flex items-center gap-2" },
                      React.createElement("label", { className: "text-xs font-bold text-slate-600" }, "Final price:"),
                      React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', value: d.csAnswer != null ? d.csAnswer : '', onChange: function (e) { upd('csAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); upd('csFb', null); }, className: "flex-1 px-3 py-2 border border-fuchsia-600 rounded-lg text-sm font-bold focus:ring-2 focus:ring-fuchsia-400 outline-none" }),
                      React.createElement("button", { "aria-label": "Gen Structured Problem", onClick: function () {
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
                    React.createElement("h4", { className: "text-sm font-bold text-cyan-800" }, "\uD83D\uDCDD Word Problems"),
                    React.createElement("button", { "aria-label": "Gen Structured Problem", onClick: genStructuredProblem, className: "px-3 py-1.5 bg-cyan-700 text-white text-xs font-bold rounded-lg hover:bg-cyan-600 transition-all" }, !d.spText ? '\u2728 Start' : '\u21BB New')
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
                    React.createElement("button", { "aria-label": "Check My Answers", onClick: function () {
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
                    }, className: "w-full px-4 py-2 bg-cyan-700 text-white font-bold rounded-xl hover:bg-cyan-600 transition-all text-sm" }, "\u2714 Check My Answers"),
                    d.spFb && React.createElement("p", { className: "text-xs font-bold " + (d.spFb.ok ? 'text-green-600' : 'text-red-500') }, d.spFb.msg)
                  )
                ),

                // ── 🪙 Coin Drop Minigame ──
                React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200" },
                  React.createElement("div", { className: "flex items-center justify-between mb-3" },
                    React.createElement("h4", { className: "text-sm font-bold text-amber-800" }, "\uD83E\uDE99 Coin Drop"),
                    React.createElement("div", { className: "flex items-center gap-2" },
                      cdStreak > 0 && React.createElement("span", { className: "px-2 py-0.5 bg-amber-100 rounded-full text-[11px] font-black text-amber-700" }, '\uD83D\uDD25 ' + cdStreak + ' streak'),
                      React.createElement("button", { "aria-label": "Timer running...", onClick: genCoinDrop, className: "px-3 py-1.5 bg-amber-700 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all shadow-sm" }, cdTarget === 0 ? '\u2728 Start' : '\u21BB New')
                    )
                  ),
                  cdTarget > 0 && React.createElement("div", { className: "space-y-3" },
                    // Target display
                    React.createElement("div", { className: "bg-white rounded-xl p-4 border border-amber-100 text-center" },
                      React.createElement("p", { className: "text-[11px] text-slate-600 font-bold uppercase tracking-wider" }, "\uD83C\uDFAF Target Amount"),
                      React.createElement("p", { className: "text-3xl font-black text-amber-600 mt-1" }, fmt(cdTarget)),
                      challengeMode && cdStartTime && React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, '\u23F1 Timer running...')
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
                      cdDropped.length === 0 && React.createElement("p", { className: "text-center text-xs text-amber-400 font-bold py-6 relative z-10" }, '\uD83D\uDC37 Drop coins here!')
                    ),
                    // Running total
                    React.createElement("div", { className: "flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100" },
                      React.createElement("span", { className: "text-xs font-bold text-slate-600" }, "Your total:"),
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
                    cdDropped.length > 0 && !cdFb && React.createElement("button", { "aria-label": "Undo last coin", onClick: function () {
                      var newDropped = cdDropped.slice(0, -1);
                      upd('cdDropped', newDropped);
                    }, className: "w-full px-3 py-1 text-xs text-slate-600 hover:text-slate-600 font-bold text-center" }, '\u21A9 Undo last coin'),
                    // Feedback
                    cdFb && React.createElement("div", { className: "space-y-2" },
                      React.createElement("p", { className: "text-xs font-bold text-center " + (cdFb.ok ? 'text-green-600' : 'text-red-500') }, cdFb.msg),
                      React.createElement("button", { "aria-label": "Next Round", onClick: genCoinDrop, className: "w-full px-4 py-2 bg-amber-700 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-sm shadow-md" }, '\u27A1 Next Round')
                    )
                  )
                ),

                // Score tracker
                React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-3 border border-violet-200 text-center" },
                  React.createElement("p", { className: "text-[11px] font-bold text-violet-500" }, "\uD83C\uDFC6 Complete challenges across all tabs to earn XP and build real-world money skills!")
                )
              ),

              // ═══ PERSONAL FINANCE TAB ═══
              tab === 'finance' && React.createElement("div", { className: "space-y-4" },
                // Sub-tab navigation
                React.createElement("div", { className: "flex flex-wrap gap-2 mb-2" },
                  [{ id: 'compound', label: '\uD83D\uDCC8 Compound Interest' }, { id: 'retire', label: '\uD83C\uDFD6\uFE0F Retirement' }, { id: 'loans', label: '\uD83C\uDFE6 Loans & Debt' }, { id: 'goals', label: '\uD83C\uDFAF Savings Goals' }, { id: 'quiz', label: '\uD83E\uDDE0 Fin. Quiz' }].map(function (s) {
                    return React.createElement("button", { "aria-label": "Compound Interest Visualizer", key: s.id, onClick: function () { upd('finSub', s.id); },
                      className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " + (finSub === s.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-400 hover:bg-blue-50')
                    }, s.label);
                  })
                ),

                // ── Compound Interest ──
                finSub === 'compound' && React.createElement("div", { className: "bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200" },
                  React.createElement("h3", { className: "text-base font-bold text-blue-800 mb-1" }, "\uD83D\uDCC8 Compound Interest Visualizer"),
                  React.createElement("p", { className: "text-xs text-blue-500 mb-4" }, "See how your money grows \u2014 simple vs compound interest"),
                  // Controls
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4" },
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Principal"),
                      React.createElement("input", { type: "number", value: ciPrincipal, 'aria-label': 'Principal amount', onChange: function (e) { upd('ciPrincipal', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Annual Rate %"),
                      React.createElement("input", { type: "number", step: "0.5", value: ciRate, 'aria-label': 'Annual interest rate', onChange: function (e) { upd('ciRate', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Years"),
                      React.createElement("input", { type: "number", value: ciYears, 'aria-label': 'Number of years', onChange: function (e) { upd('ciYears', Math.min(50, Math.max(1, parseInt(e.target.value) || 1))); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Compounding"),
                      React.createElement("select", { value: ciFreq, 'aria-label': 'Compounding frequency', onChange: function (e) { upd('ciFreq', e.target.value); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-400 outline-none mt-1" },
                        React.createElement("option", { value: "yearly" }, "Yearly"),
                        React.createElement("option", { value: "quarterly" }, "Quarterly"),
                        React.createElement("option", { value: "monthly" }, "Monthly"),
                        React.createElement("option", { value: "daily" }, "Daily")
                      )
                    )
                  ),
                  // Results summary
                  React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-4" },
                    React.createElement("div", { className: "bg-white rounded-xl p-4 border border-blue-100 text-center" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Compound Interest"),
                      React.createElement("p", { className: "text-2xl font-black text-blue-600" }, cur.symbol + Math.round(ciCompound).toLocaleString()),
                      React.createElement("p", { className: "text-xs text-emerald-500 font-bold" }, "+" + cur.symbol + Math.round(ciCompoundInterest).toLocaleString() + " earned")
                    ),
                    React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-100 text-center" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Simple Interest"),
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
                      React.createElement("caption", { className: "sr-only" }, "money data table"), React.createElement("thead", null,
                        React.createElement("tr", { className: "bg-slate-50" },
                          React.createElement("th", { scope: "col", className: "px-3 py-2 text-left font-bold text-slate-600" }, "Year"),
                          React.createElement("th", { scope: "col", className: "px-3 py-2 text-right font-bold text-blue-600" }, "Compound"),
                          React.createElement("th", { scope: "col", className: "px-3 py-2 text-right font-bold text-slate-600" }, "Simple"),
                          React.createElement("th", { scope: "col", className: "px-3 py-2 text-right font-bold text-emerald-500" }, "Advantage")
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
                  React.createElement("h3", { className: "text-base font-bold text-violet-800 mb-1" }, "\uD83C\uDFD6\uFE0F Retirement Savings Planner"),
                  React.createElement("p", { className: "text-xs text-violet-500 mb-4" }, "See why starting early makes a massive difference"),
                  // Controls
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4" },
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Start Age"),
                      React.createElement("input", { type: "range", min: 18, max: 55, value: retAge, 'aria-label': 'Retirement start age', onChange: function (e) { upd('retAge', parseInt(e.target.value)); },
                        className: "w-full mt-1", style: { accentColor: '#7c3aed' } }),
                      React.createElement("p", { className: "text-xs font-bold text-center text-violet-600" }, retAge + " years old")
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Monthly Contribution"),
                      React.createElement("input", { type: "number", value: retMonthly, 'aria-label': 'Monthly contribution', onChange: function (e) { upd('retMonthly', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-violet-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Employer Match %"),
                      React.createElement("input", { type: "number", value: retMatch, 'aria-label': 'Employer match percentage', onChange: function (e) { upd('retMatch', Math.max(0, parseFloat(e.target.value) || 0)); },
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
                      React.createElement("caption", { className: "sr-only" }, "money data table"), React.createElement("thead", null,
                        React.createElement("tr", { className: "bg-slate-50" },
                          React.createElement("th", { scope: "col", className: "px-3 py-2 text-left font-bold text-slate-600" }, "Age"),
                          React.createElement("th", { scope: "col", className: "px-3 py-2 text-right font-bold text-violet-600" }, "Early Start"),
                          React.createElement("th", { scope: "col", className: "px-3 py-2 text-right font-bold text-slate-600" }, "Late Start")
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
                  React.createElement("h3", { className: "text-base font-bold text-rose-800 mb-1" }, "\uD83C\uDFE6 Loan & Debt Calculator"),
                  React.createElement("p", { className: "text-xs text-rose-500 mb-4" }, "Understand what loans really cost \u2014 the total interest is eye-opening"),
                  // Loan type presets
                  React.createElement("div", { className: "flex flex-wrap gap-2 mb-4" },
                    Object.keys(loanPresets).map(function (k) {
                      return React.createElement("button", { "aria-label": "Loan Amount", key: k, onClick: function () {
                        upd('loanType', k); upd('loanAmt', loanPresets[k].amt); upd('loanRate', loanPresets[k].rate); upd('loanTerm', loanPresets[k].term);
                      }, className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " + (loanType === k ? 'bg-rose-700 text-white shadow-md' : 'bg-white text-rose-600 border border-rose-600 hover:bg-rose-50') }, loanPresets[k].label);
                    })
                  ),
                  // Controls
                  React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-4" },
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Loan Amount"),
                      React.createElement("input", { type: "number", value: loanAmt, 'aria-label': 'Loan amount', onChange: function (e) { upd('loanAmt', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Interest Rate %"),
                      React.createElement("input", { type: "number", step: "0.25", value: loanRate, 'aria-label': 'Loan interest rate', onChange: function (e) { upd('loanRate', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Term (months)"),
                      React.createElement("input", { type: "number", value: loanTerm, 'aria-label': 'Loan term in months', onChange: function (e) { upd('loanTerm', Math.max(1, parseInt(e.target.value) || 1)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none mt-1" })
                    )
                  ),
                  // Results
                  React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-4" },
                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border border-rose-100" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Monthly Payment"),
                      React.createElement("p", { className: "text-xl font-black text-rose-600" }, cur.symbol + Math.round(loanMonthly).toLocaleString())
                    ),
                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border border-red-200" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Total Interest"),
                      React.createElement("p", { className: "text-xl font-black text-red-500" }, cur.symbol + Math.round(loanTotalInterest).toLocaleString()),
                      React.createElement("p", { className: "text-[11px] text-red-400" }, "That's " + Math.round(loanTotalInterest / loanAmt * 100) + "% of the loan!")
                    ),
                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border border-slate-100" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Total Paid"),
                      React.createElement("p", { className: "text-xl font-black text-slate-600" }, cur.symbol + Math.round(loanTotalPaid).toLocaleString())
                    )
                  ),
                  // Visual bar
                  React.createElement("div", { className: "mb-4" },
                    React.createElement("p", { className: "text-[11px] font-bold text-slate-600 mb-1" }, "What you're really paying:"),
                    React.createElement("div", { className: "h-6 rounded-full overflow-hidden flex" },
                      React.createElement("div", { style: { width: Math.round(loanAmt / loanTotalPaid * 100) + '%', background: 'linear-gradient(90deg, #3b82f6, #6366f1)' }, className: "h-full flex items-center justify-center text-[11px] text-white font-bold" }, "Principal"),
                      React.createElement("div", { style: { width: Math.round(loanTotalInterest / loanTotalPaid * 100) + '%', background: 'linear-gradient(90deg, #ef4444, #dc2626)' }, className: "h-full flex items-center justify-center text-[11px] text-white font-bold" }, "Interest")
                    )
                  ),
                  // Amortization highlights
                  React.createElement("div", { className: "bg-white rounded-xl border border-slate-400 overflow-hidden" },
                    React.createElement("table", { className: "w-full text-xs" },
                      React.createElement("caption", { className: "sr-only" }, "money data table"), React.createElement("thead", null,
                        React.createElement("tr", { className: "bg-slate-50" },
                          React.createElement("th", { scope: "col", className: "px-2 py-2 text-left font-bold text-slate-600" }, "Month"),
                          React.createElement("th", { scope: "col", className: "px-2 py-2 text-right font-bold text-slate-600" }, "Payment"),
                          React.createElement("th", { scope: "col", className: "px-2 py-2 text-right font-bold text-blue-500" }, "Principal"),
                          React.createElement("th", { scope: "col", className: "px-2 py-2 text-right font-bold text-red-500" }, "Interest"),
                          React.createElement("th", { scope: "col", className: "px-2 py-2 text-right font-bold text-slate-600" }, "Balance")
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
                  React.createElement("h3", { className: "text-base font-bold text-emerald-800 mb-1" }, "\uD83C\uDFAF Savings Goal Planner"),
                  React.createElement("p", { className: "text-xs text-emerald-500 mb-4" }, "Pick a goal and see exactly how much to save each day, week, or month"),
                  // Goal picker
                  React.createElement("div", { className: "flex flex-wrap gap-2 mb-4" },
                    Object.keys(sgGoals).map(function (k) {
                      return React.createElement("button", { "aria-label": "Target Amount", key: k, onClick: function () {
                        upd('sgGoal', k); upd('sgTarget', sgGoals[k].target); upd('sgHave', 0);
                      }, className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " + (sgGoal === k ? 'bg-emerald-700 text-white shadow-md' : 'bg-white text-emerald-600 border border-emerald-600 hover:bg-emerald-50') }, sgGoals[k].label);
                    })
                  ),
                  // Controls
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4" },
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Target Amount"),
                      React.createElement("input", { type: "number", value: sgTarget, 'aria-label': 'Savings target amount', onChange: function (e) { upd('sgTarget', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Already Saved"),
                      React.createElement("input", { type: "number", value: sgHave, 'aria-label': 'Amount already saved', onChange: function (e) { upd('sgHave', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Timeline (months)"),
                      React.createElement("input", { type: "number", value: sgMonths, 'aria-label': 'Savings timeline in months', onChange: function (e) { upd('sgMonths', Math.max(1, parseInt(e.target.value) || 1)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-400 outline-none mt-1" })
                    ),
                    React.createElement("div", null,
                      React.createElement("label", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Savings Rate %"),
                      React.createElement("input", { type: "number", step: "0.5", value: sgRate, 'aria-label': 'Savings interest rate', onChange: function (e) { upd('sgRate', Math.max(0, parseFloat(e.target.value) || 0)); },
                        className: "w-full px-3 py-2 border border-slate-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-400 outline-none mt-1" })
                    )
                  ),
                  // Progress bar
                  React.createElement("div", { className: "mb-4" },
                    React.createElement("div", { className: "flex items-center justify-between mb-1" },
                      React.createElement("span", { className: "text-[11px] font-bold text-slate-600" }, "Progress"),
                      React.createElement("span", { className: "text-[11px] font-bold text-emerald-600" }, Math.min(100, Math.round(sgHave / sgTarget * 100)) + "%")
                    ),
                    React.createElement("div", { className: "h-4 bg-slate-100 rounded-full overflow-hidden" },
                      React.createElement("div", { style: { width: Math.min(100, sgHave / sgTarget * 100) + '%', transition: 'width 0.3s' }, className: "h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full" })
                    )
                  ),
                  // Results
                  React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-4" },
                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border border-emerald-100" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Per Day"),
                      React.createElement("p", { className: "text-lg font-black text-emerald-600" }, cur.symbol + (Math.round(sgDailyNeeded * 100) / 100).toFixed(2)),
                      React.createElement("p", { className: "text-[11px] text-slate-600" }, "\u2248 skip a coffee")
                    ),
                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border-2 border-emerald-300" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Per Week"),
                      React.createElement("p", { className: "text-lg font-black text-emerald-600" }, cur.symbol + Math.round(sgWeeklyNeeded).toLocaleString())
                    ),
                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border border-emerald-100" },
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, "Per Month"),
                      React.createElement("p", { className: "text-lg font-black text-emerald-600" }, cur.symbol + Math.round(sgMonthlyNeeded).toLocaleString())
                    )
                  ),
                  // "What if" scenarios
                  React.createElement("div", { className: "bg-white rounded-xl p-4 border border-emerald-100" },
                    React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase mb-2" }, "\uD83D\uDCA1 What If Scenarios"),
                    React.createElement("div", { className: "space-y-2" },
                      React.createElement("p", { className: "text-xs text-slate-600" }, "\u2022 Save " + cur.symbol + "5 more/week? Reach goal in ", React.createElement("strong", { className: "text-emerald-600" }, Math.max(1, Math.round(sgRemaining / ((sgWeeklyNeeded + 5) * 52 / 12))) + " months"), " instead of " + sgMonths),
                      React.createElement("p", { className: "text-xs text-slate-600" }, "\u2022 Save " + cur.symbol + "10 more/week? Reach goal in ", React.createElement("strong", { className: "text-emerald-600" }, Math.max(1, Math.round(sgRemaining / ((sgWeeklyNeeded + 10) * 52 / 12))) + " months")),
                      React.createElement("p", { className: "text-xs text-slate-600" }, "\u2022 Double your savings? Reach goal in ", React.createElement("strong", { className: "text-emerald-600" }, Math.max(1, Math.round(sgMonths / 2)) + " months"))
                    )
                  )
                ),

                // ── Financial Literacy Quiz ──
                finSub === 'quiz' && React.createElement("div", { className: "bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-5 border border-yellow-200 space-y-4" },
                  React.createElement("div", { className: "flex items-center justify-between" },
                    React.createElement("h3", { className: "text-base font-bold text-amber-800" }, "\uD83E\uDDE0 Financial Literacy Quiz"),
                    React.createElement("button", { "aria-label": "Gen Fin Quiz", onClick: genFinQuiz, className: "px-3 py-1.5 bg-amber-700 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all" }, d.fqIdx == null ? '\u2728 Start Quiz' : '\u21BB Next Question')
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
                            : (selected ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:border-amber-600 hover:bg-amber-50');
                          return React.createElement("button", { key: ci, disabled: revealed, onClick: function () { upd('fqAnswer', ci); upd('fqFb', null); },
                            className: "p-3 rounded-xl border-2 text-sm font-bold text-left transition-all " + btnClass
                          }, String.fromCharCode(65 + ci) + '. ' + ch);
                        })
                      ),
                      d.fqAnswer != null && !d.fqFb && React.createElement("button", { "aria-label": "Submit Answer", onClick: function () {
                        var ok = d.fqAnswer === fq.correct;
                        upd('fqFb', ok ? { ok: true, msg: '\u2705 Correct! ' + fq.explanation } : { ok: false, msg: '\u274C Not quite. ' + fq.explanation });
                        if (ok) {
                          if (typeof awardStemXP === 'function') awardStemXP('moneyMath', 20, 'finance quiz');
                          if (typeof addXP === 'function') addXP(20, 'Money Math: Financial literacy quiz');
                        }
                      }, className: "w-full px-4 py-2 bg-amber-700 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-sm" }, "\u2714 Submit Answer"),
                      d.fqFb && React.createElement("div", { className: "rounded-lg p-3 text-xs font-medium leading-relaxed " + (d.fqFb.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700') }, d.fqFb.msg),
                      d.fqFb && React.createElement("button", { "aria-label": "Next Question", onClick: genFinQuiz, className: "w-full px-4 py-2 bg-amber-700 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-sm" }, "\u27A1\uFE0F Next Question")
                    );
                  })()
                )
              ),

              // ── Educational Footer ──
              React.createElement("div", { className: "bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-200 text-center" },
                React.createElement("p", { className: "text-[11px] text-emerald-600" }, "\uD83C\uDF1F ", React.createElement("strong", null, "Financial literacy"), " is one of the most important life skills. Practice with real-world scenarios to build confidence with money!"),
                React.createElement("p", { className: "text-[11px] text-slate-600 mt-1" }, "Exchange rates are approximate and for educational purposes only.")
              )
            );
          
    }
  });
})();
