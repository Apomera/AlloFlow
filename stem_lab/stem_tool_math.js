// ═══════════════════════════════════════════
// stem_tool_math.js — STEM Lab Math Tools
// 13 registered tools
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

  // ═══ 🔬 base10 (base10) ═══
  /* base10 tool extracted to standalone file */
  window.StemLab.registerTool('moneyMath', {
    icon: '🔬',
    label: 'moneyMath',
    desc: '',
    color: 'slate',
    category: 'math',
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

      // ── Tool body (moneyMath) ──
      return (function() {
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

            var activeRecipe = d.activeRecipe || null;

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

                { name: '\uD83AB Garlic', price: 0.75, cat: 'Produce', pricePer: 'each' },

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



            var genCashierRound = function () {

              // Items per wave: wave 1 = 2-3, wave 2 = 3-4, wave 3+ = 4-6

              var minItems = crWave <= 1 ? 2 : crWave <= 2 ? 3 : 4;

              var maxItems = crWave <= 1 ? 3 : crWave <= 2 ? 4 : 6;

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

                  weight = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3][Math.floor(Math.random() * 8)];

                  qty = 1;

                  items.push({ name: si.name, price: si.price, qty: 1, weight: weight, pricePer: 'lb' });

                } else {

                  qty = Math.floor(Math.random() * 3) + 1;

                  items.push({ name: si.name, price: si.price, qty: qty, weight: null, pricePer: 'each' });

                }

              }

              // Tax for middle/high waves 2+

              var includeTax = grade !== 'elementary' && crWave >= 2;

              // Coupon for wave 3+ (high school only)

              var coupon = null;

              if (grade === 'high' && crWave >= 3 && Math.random() > 0.4) {

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

              { name: '\u2764\uFE0F Other', pct: 5, color: '#6b7280' }

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

                      className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-sm outline-none cursor-pointer"

                    }, Object.entries(GRADE_CONFIG).map(function (entry) {

                      return React.createElement("option", { key: entry[0], value: entry[0], style: { color: '#1e293b' } }, entry[1].label);

                    })),

                    // Currency selector

                    React.createElement("select", { value: currency, onChange: function (e) { upd('currency', e.target.value); upd('placed', []); upd('storeItems', null); upd('cart', []); },

                      className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-white/20 text-white border border-white/30 backdrop-blur-sm outline-none cursor-pointer"

                    }, Object.keys(CURRENCIES).map(function (code) {

                      return React.createElement("option", { key: code, value: code, style: { color: '#1e293b' } }, CURRENCIES[code].flag + ' ' + code + ' (' + CURRENCIES[code].symbol + ')');

                    }))

                  )

                )

              ),



              // ── TAB BAR ──

              React.createElement("div", { className: "flex gap-1 bg-slate-100 rounded-xl p-1" },

                tabs.map(function (t) {

                  return React.createElement("button", { key: t.id, onClick: function () { upd('tab', t.id); },

                    className: "flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all " + (tab === t.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50')

                  }, t.label);

                })

              ),



              // ═══ COINS & BILLS TAB ═══

              tab === 'coins' && React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },

                // Coin palette

                React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200" },

                  React.createElement("h3", { className: "text-sm font-bold text-amber-800 mb-3" }, "\uD83E\uDE99 " + cur.flag + " " + cur.name + " Coins"),

                  React.createElement("p", { className: "text-[10px] text-amber-600 mb-3" }, "Click coins to add them to your counting board."),

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

                        React.createElement("span", { className: "text-[9px] font-bold text-amber-700" }, coin.name)

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

                React.createElement("div", { className: "bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200" },

                  React.createElement("div", { className: "flex items-center justify-between mb-3" },

                    React.createElement("h3", { className: "text-sm font-bold text-slate-700" }, "\uD83E\uDDEE Counting Board"),

                    React.createElement("div", { className: "flex items-center gap-2" },

                      challengeMode

                        ? React.createElement("span", { className: "text-lg font-black text-amber-500" }, '\uD83C\uDFAF ?')

                        : React.createElement("span", { className: "text-lg font-black text-emerald-600" }, fmt(boardTotal)),

                      placed.length > 0 && React.createElement("button", { onClick: function () { upd('placed', []); upd('coinGuess', null); upd('coinGuessFb', null); },

                        className: "text-[10px] text-red-400 hover:text-red-600 font-bold"

                      }, "\u2715 Clear")

                    )

                  ),

                  placed.length === 0

                    ? React.createElement("div", { className: "text-center py-8 text-slate-300" },

                        React.createElement("div", { className: "text-4xl mb-2" }, "\uD83E\uDE99"),

                        React.createElement("p", { className: "text-xs" }, challengeMode ? 'Add coins/bills, then guess the total!' : 'Click coins or bills to add them here')

                      )

                    : React.createElement("div", { className: "flex flex-wrap gap-1.5 min-h-[100px]" },

                        placed.map(function (p, pi) {

                          var isBill = p.value >= (isJPY ? 1000 : 1) && !p.name.toLowerCase().includes('coin') && !p.name.toLowerCase().includes('penny') && !p.name.toLowerCase().includes('cent') && !p.name.toLowerCase().includes('dime') && !p.name.toLowerCase().includes('nickel') && !p.name.toLowerCase().includes('quarter') && !p.name.toLowerCase().includes('loonie') && !p.name.toLowerCase().includes('toonie');

                          return React.createElement("button", { key: p.id || pi, onClick: function () {

                              upd('placed', placed.filter(function (_, idx) { return idx !== pi; }));

                              upd('coinGuess', null); upd('coinGuessFb', null);

                            }, title: 'Remove ' + p.name,

                            className: "transition-all hover:scale-110 hover:opacity-70 cursor-pointer"

                          },

                            isBill

                              ? React.createElement("div", { style: { width: '56px', height: '24px', borderRadius: '3px', background: '#85bb65', border: '1px solid rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold', color: '#fff' } }, challengeMode ? p.name : fmt(p.value))

                              : React.createElement("div", { style: { width: '28px', height: '28px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #C0C0C0, #999)', border: '1px solid rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 'bold', color: '#333' } }, challengeMode ? p.name.substring(0, 3) : fmt(p.value))

                          );

                        })

                      ),

                  // Challenge Mode: guess the total

                  challengeMode && placed.length > 0 && React.createElement("div", { className: "mt-3 pt-3 border-t border-amber-200 bg-amber-50 rounded-lg p-3" },

                    React.createElement("p", { className: "text-xs font-bold text-amber-700 mb-2" }, '\uD83C\uDFAF What\'s the total? Add up all the coins and bills!'),

                    React.createElement("div", { className: "flex items-center gap-2" },

                      React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', value: d.coinGuess != null ? d.coinGuess : '', onChange: function (e) { upd('coinGuess', e.target.value === '' ? null : parseFloat(e.target.value)); }, className: "px-3 py-2 border border-amber-300 rounded-lg text-sm font-bold w-32 focus:ring-2 focus:ring-amber-400 outline-none" }),

                      React.createElement("button", { onClick: function () {

                        var guess = d.coinGuess; var actual = boardTotal;

                        var isRight = typeof guess === 'number' && Math.abs(guess - actual) < (isJPY ? 0.5 : 0.005);

                        upd('coinGuessFb', isRight ? { ok: true, msg: '\u2705 Correct! Total is ' + fmt(actual) + '!' } : { ok: false, msg: '\u274C Not quite. The total is ' + fmt(actual) + '. You guessed ' + fmt(guess || 0) + '.' });

                        if (isRight && typeof awardStemXP === 'function') awardStemXP('moneyMath', 10, 'coin counting challenge');

                      }, disabled: d.coinGuess == null, className: "px-4 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-all text-xs disabled:opacity-40" }, '\u2714 Check')

                    ),

                    d.coinGuessFb && React.createElement("p", { className: "text-xs font-bold mt-2 " + (d.coinGuessFb.ok ? 'text-green-600' : 'text-red-500') }, d.coinGuessFb.msg)

                  ),

                  // Normal mode: show total

                  !challengeMode && placed.length > 0 && React.createElement("div", { className: "mt-3 pt-3 border-t border-slate-200" },

                    React.createElement("div", { className: "flex justify-between text-xs" },

                      React.createElement("span", { className: "text-slate-500" }, placed.length + " items on board"),

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

                      React.createElement("p", { className: "text-slate-500 text-sm mb-4" }, "Generate a problem to practice making change with " + cur.flag + " " + cur.name),

                      React.createElement("button", { onClick: genChangeProblem,

                        className: "px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg text-sm"

                      }, "\u2728 Generate Problem")

                    )

                  : React.createElement("div", { className: "space-y-4" },

                      React.createElement("div", { className: "bg-white rounded-xl p-4 shadow-sm border border-blue-100" },

                        React.createElement("div", { className: "grid grid-cols-3 gap-4 text-center" },

                          React.createElement("div", null,

                            React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Price"),

                            React.createElement("p", { className: "text-2xl font-black text-red-500" }, fmt(changePrice))

                          ),

                          React.createElement("div", null,

                            React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Customer Pays"),

                            React.createElement("p", { className: "text-2xl font-black text-blue-500" }, fmt(changePaid))

                          ),

                          React.createElement("div", null,

                            React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Change Due"),

                            React.createElement("p", { className: "text-2xl font-black text-emerald-600" }, "?")

                          )

                        )

                      ),

                      React.createElement("div", { className: "flex items-center gap-3" },

                        React.createElement("label", { className: "text-sm font-bold text-slate-600" }, "Your answer:"),

                        React.createElement("input", { type: "number", step: isJPY ? "1" : "0.01", placeholder: cur.symbol + "...",

                          value: changeAnswer !== null ? changeAnswer : '',

                          onChange: function (e) { upd('changeAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); },

                          className: "px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold w-32 focus:ring-2 focus:ring-blue-400 outline-none"

                        }),

                        React.createElement("button", { onClick: function () {

                            var correct = Math.round((changePaid - changePrice) * 100) / 100;

                            var userAns = Math.round((changeAnswer || 0) * 100) / 100;

                            var isRight = Math.abs(userAns - correct) < 0.005;

                            upd('changeFeedback', isRight ? { ok: true, msg: '\u2705 Correct! ' + fmt(changePaid) + ' \u2212 ' + fmt(changePrice) + ' = ' + fmt(correct) } : { ok: false, msg: '\u274C Not quite. ' + fmt(changePaid) + ' \u2212 ' + fmt(changePrice) + ' = ' + fmt(correct) });

                            if (isRight && typeof addXP === 'function') addXP(15, 'Money Math: Making change');

                            if (isRight && typeof awardStemXP === 'function') awardStemXP('moneyMath', 5, 'making change');

                          },

                          className: "px-5 py-2 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all text-sm"

                        }, "\u2714 Check")

                      ),

                      changeFeedback && React.createElement("p", { className: "text-sm font-bold " + (changeFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, changeFeedback.msg),

                      React.createElement("button", { onClick: genChangeProblem,

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

                      React.createElement("p", { className: "text-[10px] text-zinc-400 font-bold" }, "Registers are down! Calculate by hand!")

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

                    grade !== 'elementary' ? React.createElement("div", { className: "mb-6 inline-block bg-zinc-800 rounded-lg px-4 py-2 border border-zinc-700 text-left" },

                      React.createElement("p", { className: "text-xs text-zinc-400 mb-1" }, "\u26A0\uFE0F Management notes:"),

                      React.createElement("ul", { className: "text-xs text-zinc-300 list-disc list-inside space-y-1" },

                        React.createElement("li", null, "Watch out for per-lb items"),

                        React.createElement("li", null, "Waves 2+: Add " + (taxRate*100) + "% Sales Tax"),

                        grade === 'high' ? React.createElement("li", null, "Waves 3+: Apply customer coupons FIRST, before tax") : null

                      )

                    ) : null,

                    React.createElement("div", { className: "text-center" }, 

                      React.createElement("button", { onClick: function() { upd('crIntro', false); genCashierRound(); },

                        className: "px-8 py-3 bg-amber-500 text-zinc-900 font-black text-lg rounded-xl hover:bg-amber-400 hover:scale-105 transition-all shadow-[0_0_15px_rgba(251,191,36,0.5)]"

                      }, "I'm Ready \u2192")

                    )

                  ) : null,



                  !crIntro && !crGameOver && crCustomer ? React.createElement("div", { className: "relative z-10 space-y-4" },

                    // Top stats row

                    React.createElement("div", { className: "flex justify-between items-end" },

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-amber-500 font-black text-xs uppercase tracking-widest" }, "Wave " + crWave),

                        React.createElement("p", { className: "text-zinc-400 text-[10px] font-bold" }, crServed + " Customers Served")

                      ),

                      React.createElement("div", { className: "text-right" },

                        React.createElement("p", { className: "text-[10px] text-zinc-400 font-bold uppercase" }, "Session Score"),

                        React.createElement("p", { className: "text-amber-400 font-black text-xl leading-none" }, crScore),

                        crBest > 0 && React.createElement("p", { className: "text-[9px] text-emerald-400 font-bold" }, "Best Round: " + crBest)

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

                        React.createElement("div", null,

                          React.createElement("p", { className: "text-zinc-200 font-bold text-sm" }, crCustomer.name),

                          React.createElement("p", { className: "text-zinc-500 text-[10px] font-bold" }, "Waiting for total...")

                        )

                      ),

                      

                      // Receipt / Basket

                      React.createElement("div", { className: "bg-[#fffbc8] text-zinc-800 p-4 rounded-sm shadow-inner font-mono text-sm relative z-0" },

                        // jagged top

                        React.createElement("div", { className: "absolute top-0 left-0 w-full h-2 bg-zinc-800", style: { maskImage: 'radial-gradient(circle at 4px 0px, transparent 4px, black 4.5px)', maskSize: '8px 8px', maskRepeat: 'repeat-x' } }),

                        React.createElement("div", { className: "text-center pb-2 border-b-2 border-dashed border-zinc-400 mb-2 mt-1 opacity-80" },

                          React.createElement("p", { className: "font-bold text-xs flex justify-center items-center gap-1" }, React.createElement("span", null, "\u26A1"), React.createElement("span", null, "ALLOFOOD MKT"), React.createElement("span", null, "\u26A1")),

                          React.createElement("p", { className: "text-[9px]" }, "SYSTEM OFFLINE")

                        ),

                        

                        crCustomer.items.map(function(it, i) {

                          return React.createElement("div", { key: i, className: "flex justify-between mb-1 text-xs" },

                            React.createElement("div", { className: "flex-1" },

                              React.createElement("span", { className: "font-bold" }, it.name),

                              React.createElement("div", { className: "text-[10px] text-zinc-600 pl-1" }, 

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

                        React.createElement("div", { className: "text-center bg-zinc-800 rounded-lg px-2 py-2 border border-zinc-700 shadow-inner w-20" }, React.createElement("p", { className: "text-zinc-500 text-[9px] uppercase font-bold" }, "Accuracy"), React.createElement("p", { className: "text-emerald-400 font-black text-lg leading-tight" }, "+" + crFb.accuracy)),

                        React.createElement("div", { className: "text-center bg-zinc-800 rounded-lg px-2 py-2 border border-zinc-700 shadow-inner w-20" }, React.createElement("p", { className: "text-zinc-500 text-[9px] uppercase font-bold" }, "Speed"), React.createElement("p", { className: "text-sky-400 font-black text-lg leading-tight" }, "+" + crFb.speed)),

                        React.createElement("div", { className: "text-center bg-zinc-800 rounded-lg px-2 py-2 border border-amber-900/50 shadow-inner w-20" }, React.createElement("p", { className: "text-amber-500/70 text-[9px] uppercase font-bold" }, "Total"), React.createElement("p", { className: "text-amber-400 font-black text-lg leading-tight" }, "+" + crFb.score))

                      ),

                      React.createElement("button", { onClick: genCashierRound, className: "w-full py-4 bg-amber-500 text-zinc-900 font-black rounded-xl hover:bg-amber-400 hover:scale-105 transition-all text-sm shadow-[0_0_15px_rgba(251,191,36,0.3)] mt-2" }, "Next Customer \u2192")

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

                          className: "w-full pl-8 pr-4 py-4 bg-zinc-800 border-2 border-zinc-600 rounded-xl text-zinc-100 font-mono text-xl font-bold focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner"

                        })

                      ),

                      React.createElement("button", { onClick: submitCashierAnswer, disabled: !crAnswer,

                        className: "px-6 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md text-lg active:scale-95"

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

                      React.createElement("p", { className: "text-[10px] text-zinc-400 font-bold uppercase mb-1 tracking-widest gap-2" }, "Final Score"),

                      React.createElement("p", { className: "text-5xl font-black text-amber-500 drop-shadow-md" }, crScore),

                      crBest > 0 && crScore >= crBest && crScore > 0 ? React.createElement("p", { className: "text-xs text-emerald-400 font-bold mt-2 animate-pulse" }, "\uD83C\uDFC6 NEW HIGH SCORE!") : null

                    ),

                    React.createElement("div", { className: "flex flex-col items-center space-y-3 w-full" }, 

                      React.createElement("button", { onClick: startCashierRush, className: "px-8 py-3 bg-amber-500 text-zinc-900 font-black text-lg rounded-xl hover:bg-amber-400 transition-all shadow-[0_0_15px_rgba(251,191,36,0.5)] w-full max-w-[280px]" }, "Play Again \u21BB"),

                      React.createElement("button", { onClick: function() { upd('crActive', false); }, className: "px-8 py-3 bg-transparent text-zinc-400 font-black text-sm rounded-xl hover:text-white hover:bg-zinc-800 transition-all w-full max-w-[280px] border border-zinc-700" }, "Exit Emergency")

                    )

                  ) : null



                ) : React.createElement(React.Fragment, null,

                  // ── Header row: Recipe Mode toggle (middle+) ──

                grade !== 'elementary' && React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-2" },

                  React.createElement("button", { onClick: function () { upd('recipeMode', !recipeMode); upd('activeRecipe', null); },

                    className: "px-3 py-1.5 rounded-lg text-xs font-black transition-all " + (recipeMode ? 'bg-purple-500 text-white ring-2 ring-purple-300 shadow-lg' : 'bg-white text-purple-600 border border-purple-300 hover:bg-purple-50')

                  }, recipeMode ? '\uD83D\uDCCB Recipe Mode ON' : '\uD83D\uDCCB Recipe Mode')

                ),



                // ── Recipe Panel (when active) ──

                recipeMode && React.createElement("div", { className: "bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl p-4 border border-purple-200" },

                  React.createElement("h4", { className: "text-sm font-bold text-purple-800 mb-3" }, "\uD83D\uDCCB Select a Recipe"),

                  // Recipe selector

                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3" },

                    RECIPES.map(function (r, ri) {

                      return React.createElement("button", { key: ri, onClick: function () { upd('activeRecipe', activeRecipe === ri ? null : ri); upd('recipeFb', null); },

                        className: "p-2 rounded-xl text-center transition-all border-2 " + (activeRecipe === ri ? 'border-purple-500 bg-purple-100 shadow-md' : 'border-slate-200 bg-white hover:border-purple-300')

                      },

                        React.createElement("span", { className: "text-2xl" }, r.icon),

                        React.createElement("p", { className: "text-[10px] font-bold text-slate-700 mt-0.5" }, r.name.replace(/^[^\s]+\s/, ''))

                      );

                    })

                  ),

                  // Servings slider + Ingredient list

                  selectedRecipe && React.createElement("div", { className: "space-y-3" },

                    React.createElement("div", { className: "flex items-center gap-3 bg-white rounded-lg p-3 border border-purple-100" },

                      React.createElement("label", { className: "text-xs font-bold text-purple-700" }, "\uD83C\uDF7D Servings:"),

                      React.createElement("input", { type: "range", min: 1, max: 12, value: recipeServings, onChange: function (e) { upd('recipeServings', parseInt(e.target.value)); },

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

                      React.createElement("button", { onClick: function () {

                        var result = checkRecipeCart();

                        if (!result) return;

                        if (result.complete) {

                          upd('recipeFb', { ok: true, msg: '\u2705 All ' + result.total + ' ingredients found! Total: ' + fmt(cartGrand) + ' \u2014 +25 XP!' });

                          if (typeof addXP === 'function') addXP(25, 'Money Math: Recipe shopping complete');

                          if (typeof awardStemXP === 'function') awardStemXP('moneyMath', 25, 'recipe shopping');

                        } else {

                          upd('recipeFb', { ok: false, msg: '\u274C Missing ' + result.missing.length + ' item(s): ' + result.missing.join(', ') });

                        }

                      }, className: "flex-1 px-4 py-2 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-all text-sm shadow-md" }, "\u2714 Check Recipe Cart"),

                      React.createElement("button", { onClick: function () { upd('cart', []); upd('recipeFb', null); }, className: "px-3 py-2 text-xs text-red-400 hover:text-red-600 font-bold" }, "Clear")

                    ),

                    d.recipeFb && React.createElement("p", { className: "text-xs font-bold " + (d.recipeFb.ok ? 'text-green-600' : 'text-red-500') }, d.recipeFb.msg)

                  )

                ),



                // ── Category filter pills ──

                React.createElement("div", { className: "flex flex-wrap gap-1" },

                  storeCats.map(function (cat) {

                    var catIcons = { All: '\uD83C\uDFEA', Produce: '\uD83E\uDD6C', Meat: '\uD83E\uDD69', Dairy: '\uD83E\uDDC0', Bakery: '\uD83C\uDF5E', Pantry: '\uD83E\uDD6B', Frozen: '\uD83E\uDDCA', Drinks: '\uD83E\uDD64', Snacks: '\uD83C\uDF6B' };

                    return React.createElement("button", { key: cat, onClick: function () { upd('storeCat', cat); },

                      className: "px-2 py-1 rounded-full text-[10px] font-bold transition-all " + (storeCat === cat ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50')

                    }, (catIcons[cat] || '\uD83C\uDFEA') + ' ' + cat);

                  })

                ),



                React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" },

                  // Store shelves

                  React.createElement("div", { className: "md:col-span-2 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200" },

                    React.createElement("div", { className: "flex items-center justify-between mb-3" },

                      React.createElement("h3", { className: "text-sm font-bold text-orange-800" }, "\uD83D\uDED2 " + cur.flag + " Store Shelves"),

                      React.createElement("span", { className: "text-[10px] text-slate-400 font-bold" }, filteredStoreItems.length + " items")

                    ),

                    React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[480px] overflow-y-auto pr-1" },

                      filteredStoreItems.map(function (item, ii) {

                        var isWeighed = item.pricePer && item.pricePer !== 'each';

                        var isAdding = d.weightItemIdx === ii && isWeighed;

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

                                  upd('cart', [].concat(cart, [{ name: item.name, price: item.price, qty: 1, pricePer: 'each' }]));

                                }

                                if (typeof addToast === 'function') addToast('Added ' + item.name + ' to cart!', 'success');

                              }

                            },

                            className: "w-full p-3 bg-white rounded-xl border text-left group transition-all " + (isAdding ? 'border-orange-400 ring-2 ring-orange-200 shadow-md' : 'border-orange-100 hover:border-orange-300 hover:shadow-md')

                          },

                            React.createElement("div", { className: "text-2xl mb-1" }, item.name.split(' ')[0]),

                            React.createElement("p", { className: "text-xs font-bold text-slate-700 truncate" }, item.name.substring(item.name.indexOf(' ') + 1)),

                            React.createElement("div", { className: "flex items-baseline gap-1" },

                              React.createElement("span", { className: "text-sm font-black text-emerald-600" }, fmt(item.price)),

                              isWeighed && React.createElement("span", { className: "text-[9px] text-orange-500 font-bold" }, "/" + item.pricePer)

                            ),

                            React.createElement("span", { className: "text-[9px] font-bold " + (isWeighed ? 'text-orange-500' : 'text-orange-400 group-hover:text-orange-600') }, isWeighed ? '\u2696 Enter weight' : '+ Add to cart')

                          ),

                          // Weight entry popup for per-lb items

                          isAdding && React.createElement("div", { className: "absolute z-20 left-0 right-0 -bottom-2 translate-y-full bg-white rounded-xl p-3 shadow-xl border-2 border-orange-300 space-y-2" },

                            React.createElement("p", { className: "text-[10px] font-bold text-orange-700 text-center" }, "How many " + item.pricePer + "s?"),

                            React.createElement("div", { className: "flex items-center gap-1.5" },

                              React.createElement("button", { onClick: function () { upd('weightInput', Math.max(0.25, (d.weightInput || 1) - 0.25)); }, className: "px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200" }, "\u2212"),

                              React.createElement("input", { type: "number", step: "0.25", min: "0.25", value: d.weightInput || 1, onChange: function (e) { upd('weightInput', parseFloat(e.target.value) || 0.25); }, className: "w-14 text-center px-1 py-1 border border-orange-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-orange-400 outline-none" }),

                              React.createElement("button", { onClick: function () { upd('weightInput', (d.weightInput || 1) + 0.25); }, className: "px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200" }, "+"),

                              React.createElement("span", { className: "text-[10px] text-slate-500 font-bold" }, item.pricePer)

                            ),

                            React.createElement("p", { className: "text-xs font-bold text-center text-emerald-600" }, "= " + fmt(item.price * (d.weightInput || 1))),

                            React.createElement("button", { onClick: function () {

                              var w = d.weightInput || 1;

                              upd('cart', [].concat(cart, [{ name: item.name, price: item.price, weight: w, pricePer: item.pricePer, qty: 1 }]));

                              upd('weightItemIdx', null);

                              if (typeof addToast === 'function') addToast('Added ' + w + ' ' + item.pricePer + ' ' + item.name + '!', 'success');

                            }, className: "w-full px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition-all" }, "\uD83D\uDED2 Add to Cart")

                          )

                        );

                      })

                    )

                  ),

                  // Cart

                  React.createElement("div", { className: "bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200" },

                    React.createElement("h3", { className: "text-sm font-bold text-emerald-800 mb-2" }, "\uD83D\uDED2 Your Cart (" + cart.length + ")"),

                    cart.length === 0

                      ? React.createElement("p", { className: "text-xs text-slate-400 text-center py-4" }, recipeMode && selectedRecipe ? "Shop for the recipe ingredients!" : "Cart is empty. Click items to add!")

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

                                isWeighted && React.createElement("p", { className: "text-[10px] text-slate-400" }, qtyLabel)

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

                          React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', value: d.cartGuessSubtotal != null ? d.cartGuessSubtotal : '', onChange: function (e) { upd('cartGuessSubtotal', e.target.value === '' ? null : parseFloat(e.target.value)); upd('cartCheckoutFb', null); }, className: "px-2 py-1.5 border border-amber-300 rounded-lg text-xs font-bold w-28 focus:ring-2 focus:ring-amber-400 outline-none" })

                        ),

                        gc.includeTax && React.createElement("div", { className: "flex items-center gap-2" },

                          React.createElement("label", { className: "text-xs text-slate-600 w-20" }, "Tax (8%):"),

                          React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', value: d.cartGuessTax != null ? d.cartGuessTax : '', onChange: function (e) { upd('cartGuessTax', e.target.value === '' ? null : parseFloat(e.target.value)); upd('cartCheckoutFb', null); }, className: "px-2 py-1.5 border border-amber-300 rounded-lg text-xs font-bold w-28 focus:ring-2 focus:ring-amber-400 outline-none" })

                        ),

                        React.createElement("div", { className: "flex items-center gap-2" },

                          React.createElement("label", { className: "text-xs font-bold text-slate-700 w-20" }, "Grand Total:"),

                          React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', value: d.cartGuessTotal != null ? d.cartGuessTotal : '', onChange: function (e) { upd('cartGuessTotal', e.target.value === '' ? null : parseFloat(e.target.value)); upd('cartCheckoutFb', null); }, className: "px-2 py-1.5 border border-amber-300 rounded-lg text-xs font-bold w-28 focus:ring-2 focus:ring-amber-400 outline-none" })

                        )

                      ),

                      React.createElement("button", { onClick: function () {

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

                      }, disabled: d.cartGuessTotal == null, className: "w-full px-4 py-2 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-sm shadow-md disabled:opacity-40" }, '\uD83E\uDDE0 Check My Math'),

                      d.cartCheckoutFb && React.createElement("p", { className: "text-xs font-bold " + (d.cartCheckoutFb.ok ? 'text-green-600' : 'text-red-500') }, d.cartCheckoutFb.msg),

                      React.createElement("button", { onClick: function () { upd('cart', []); upd('cartGuessSubtotal', null); upd('cartGuessTax', null); upd('cartGuessTotal', null); upd('cartCheckoutFb', null); }, className: "w-full px-3 py-1.5 text-xs text-red-400 hover:text-red-600 font-bold" }, "Clear Cart")

                    ),

                    // ── Normal Mode: Show totals ──

                    !challengeMode && cart.length > 0 && React.createElement("div", { className: "mt-3 pt-3 border-t border-emerald-200 space-y-1" },

                      React.createElement("div", { className: "flex justify-between text-xs" },

                        React.createElement("span", { className: "text-slate-500" }, "Subtotal"),

                        React.createElement("span", { className: "font-bold" }, fmt(cartTotal))

                      ),

                      gc.includeTax && React.createElement("div", { className: "flex justify-between text-xs" },

                        React.createElement("span", { className: "text-slate-500" }, "Tax (8%)"),

                        React.createElement("span", { className: "font-bold text-orange-500" }, fmt(cartTax))

                      ),

                      React.createElement("div", { className: "flex justify-between text-sm font-black" },

                        React.createElement("span", { className: "text-slate-700" }, "Total"),

                        React.createElement("span", { className: "text-emerald-600" }, fmt(cartGrand))

                      ),

                      React.createElement("button", { onClick: function () {

                        if (typeof addXP === 'function') addXP(20, 'Money Math: Completed a grocery purchase');

                        if (typeof addToast === 'function') addToast('\uD83C\uDF89 Purchase complete! Total: ' + fmt(cartGrand), 'success');

                        upd('cart', []);

                      }, className: "w-full mt-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all text-sm shadow-md" }, "\uD83D\uDCB3 Checkout"),

                      React.createElement("button", { onClick: function () { upd('cart', []); }, className: "w-full px-3 py-1.5 text-xs text-red-400 hover:text-red-600 font-bold" }, "Clear Cart")

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

                      React.createElement("button", { onClick: genWordProblem,

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

                          d.wpProblem.category && React.createElement("span", { className: "inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-100 text-violet-600 mb-2" }, d.wpProblem.category.toUpperCase()),

                          React.createElement("p", { className: "text-sm text-slate-700 leading-relaxed" }, d.wpProblem.problem)

                        ),

                        d.wpProblem.hint && React.createElement("button", { onClick: function () { upd('wpShowHint', !d.wpShowHint); },

                          className: "text-xs font-bold text-amber-500 hover:text-amber-700"

                        }, d.wpShowHint ? '\uD83D\uDCA1 Hide Hint' : '\uD83D\uDCA1 Show Hint'),

                        d.wpShowHint && React.createElement("p", { className: "text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200" }, d.wpProblem.hint),

                        React.createElement("div", { className: "flex items-center gap-3" },

                          React.createElement("input", { type: "number", step: isJPY ? "1" : "0.01", placeholder: "Your answer...",

                            value: d.wpAnswer !== null && d.wpAnswer !== undefined ? d.wpAnswer : '',

                            onChange: function (e) { upd('wpAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); },

                            className: "px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold w-36 focus:ring-2 focus:ring-violet-400 outline-none"

                          }),

                          React.createElement("button", { onClick: function () {

                              var correct = d.wpProblem.answer;

                              var userAns = d.wpAnswer;

                              var isRight = typeof correct === 'number' && typeof userAns === 'number' && Math.abs(userAns - correct) < (correct * 0.02 + 0.01);

                              upd('wpFeedback', isRight ? { ok: true, msg: '\u2705 ' + t('stem.dissection.correct') } : { ok: false, msg: '\u274C The answer is ' + (typeof correct === 'number' ? fmt(correct) : correct) });

                              if (isRight && typeof addXP === 'function') addXP(25, 'Money Math: Word problem solved');

                            },

                            className: "px-5 py-2 bg-violet-500 text-white font-bold rounded-xl hover:bg-violet-600 transition-all text-sm"

                          }, "\u2714 Check")

                        ),

                        d.wpFeedback && React.createElement("p", { className: "text-sm font-bold " + (d.wpFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.wpFeedback.msg),

                        d.wpFeedback && !d.wpFeedback.ok && d.wpProblem.explanation && React.createElement("div", { className: "bg-slate-50 rounded-xl p-3 border border-slate-200" },

                          React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase mb-1" }, "Solution"),

                          React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed whitespace-pre-line" }, d.wpProblem.explanation)

                        ),

                        React.createElement("button", { onClick: genWordProblem,

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

                  React.createElement("p", { className: "text-[10px] font-bold text-sky-400 uppercase mb-2" }, "Reference Rates (vs 1 USD)"),

                  React.createElement("div", { className: "flex flex-wrap gap-2" },

                    Object.entries(CURRENCIES).map(function (entry) {

                      return React.createElement("span", { key: entry[0], className: "text-[10px] font-bold px-2 py-1 rounded-full " + (entry[0] === currency ? 'bg-sky-200 text-sky-800' : 'bg-slate-100 text-slate-600') },

                        entry[1].flag + ' ' + entry[0] + ' = ' + RATES[entry[0]].toFixed(entry[0] === 'JPY' || entry[0] === 'INR' ? 1 : 2)

                      );

                    })

                  )

                ),

                // Problem area

                !d.exchFrom

                  ? React.createElement("div", { className: "text-center py-6" },

                      React.createElement("button", { onClick: genExchangeProblem,

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

                          React.createElement("span", { className: "text-xl text-slate-400 font-bold" }, "\u2192"),

                          React.createElement("div", { className: "bg-emerald-100 rounded-xl px-4 py-2" },

                            React.createElement("p", { className: "text-2xl font-black text-emerald-700" }, CURRENCIES[d.exchTo].symbol + '?'),

                            React.createElement("p", { className: "text-xs text-emerald-500" }, CURRENCIES[d.exchTo].flag + ' ' + d.exchTo)

                          )

                        )

                      ),

                      React.createElement("div", { className: "flex items-center gap-3" },

                        React.createElement("input", { type: "number", step: "0.01", placeholder: CURRENCIES[d.exchTo].symbol + "...",

                          value: d.exchAnswer !== null && d.exchAnswer !== undefined ? d.exchAnswer : '',

                          onChange: function (e) { upd('exchAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); },

                          className: "px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold w-40 focus:ring-2 focus:ring-sky-400 outline-none"

                        }),

                        React.createElement("button", { onClick: function () {

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

                      React.createElement("button", { onClick: genExchangeProblem,

                        className: "px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs"

                      }, "\u21BB Next Problem")

                    )

              ),



              // ═══ TIPS & DISCOUNTS TAB ═══

              tab === 'tips' && React.createElement("div", { className: "space-y-4" },

                React.createElement("div", { className: "bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-5 border border-pink-200" },

                  React.createElement("h3", { className: "text-base font-bold text-pink-800 mb-3" }, "\uD83D\uDCB3 Tips & Discounts"),

                  React.createElement("div", { className: "flex gap-2 mb-4" },

                    React.createElement("button", { onClick: genTipProblem, className: "flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all " + ((d.tipMode || 'tip') === 'tip' ? 'bg-pink-600 text-white shadow-md' : 'bg-white text-pink-600 border border-pink-200 hover:bg-pink-50') }, "\uD83C\uDF7D Tip Calculator"),

                    React.createElement("button", { onClick: genDiscountProblem, className: "flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all " + (d.tipMode === 'discount' ? 'bg-pink-600 text-white shadow-md' : 'bg-white text-pink-600 border border-pink-200 hover:bg-pink-50') }, "\uD83C\uDFF7\uFE0F Discount Shopping")

                  ),

                  // Tip mode

                  (d.tipMode || 'tip') === 'tip' && (!d.tipBill

                    ? React.createElement("div", { className: "text-center py-6" },

                        React.createElement("p", { className: "text-sm text-slate-500 mb-3" }, "Practice calculating restaurant tips and splitting bills"),

                        React.createElement("button", { onClick: genTipProblem, className: "px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg text-sm" }, "\u2728 Generate Tip Problem")

                      )

                    : React.createElement("div", { className: "space-y-4" },

                        React.createElement("div", { className: "bg-white rounded-xl p-4 shadow-sm border border-pink-100" },

                          React.createElement("div", { className: "grid grid-cols-3 gap-3 text-center" },

                            React.createElement("div", null, React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Bill Total"), React.createElement("p", { className: "text-xl font-black text-pink-600" }, fmt(d.tipBill))),

                            React.createElement("div", null, React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Tip %"), React.createElement("p", { className: "text-xl font-black text-amber-500" }, d.tipPct + '%')),

                            React.createElement("div", null, React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Diners"), React.createElement("p", { className: "text-xl font-black text-blue-500" }, d.tipDiners))

                          ),

                          React.createElement("p", { className: "text-xs text-center text-slate-500 mt-3" }, "How much does each person pay (bill + tip, split " + d.tipDiners + " ways)?")

                        ),

                        React.createElement("div", { className: "flex items-center gap-3" },

                          React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: 'Per person...',

                            value: d.tipAnswer != null ? d.tipAnswer : '', onChange: function (e) { upd('tipAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); },

                            className: "px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold w-36 focus:ring-2 focus:ring-pink-400 outline-none"

                          }),

                          React.createElement("button", { onClick: function () {

                              var tipAmt = d.tipBill * (d.tipPct / 100);

                              var totalWithTip = d.tipBill + tipAmt;

                              var perPerson = Math.round(totalWithTip / d.tipDiners * 100) / 100;

                              var isRight = typeof d.tipAnswer === 'number' && Math.abs(d.tipAnswer - perPerson) < 0.02;

                              upd('tipFeedback', isRight

                                ? { ok: true, msg: '\u2705 Correct! Tip: ' + fmt(tipAmt) + ' \u2192 Total: ' + fmt(totalWithTip) + ' \u00F7 ' + d.tipDiners + ' = ' + fmt(perPerson) + '/person' }

                                : { ok: false, msg: '\u274C Tip: ' + fmt(tipAmt) + ' \u2192 Total: ' + fmt(totalWithTip) + ' \u00F7 ' + d.tipDiners + ' = ' + fmt(perPerson) + '/person' }

                              );

                              if (isRight && typeof addXP === 'function') addXP(15, 'Money Math: Tip calculation');

                            }, className: "px-5 py-2 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition-all text-sm"

                          }, "\u2714 Check")

                        ),

                        d.tipFeedback && React.createElement("p", { className: "text-sm font-bold " + (d.tipFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.tipFeedback.msg),

                        React.createElement("button", { onClick: genTipProblem, className: "px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs" }, "\u21BB Next Problem")

                      )

                  ),

                  // Discount mode

                  d.tipMode === 'discount' && (!d.discOriginal

                    ? React.createElement("div", { className: "text-center py-6" },

                        React.createElement("p", { className: "text-sm text-slate-500 mb-3" }, "Calculate sale prices with percentage discounts" + (gc.includePercent ? ' and coupons' : '')),

                        React.createElement("button", { onClick: genDiscountProblem, className: "px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg text-sm" }, "\u2728 Generate Discount Problem")

                      )

                    : React.createElement("div", { className: "space-y-4" },

                        React.createElement("div", { className: "bg-white rounded-xl p-4 shadow-sm border border-pink-100" },

                          React.createElement("div", { className: "text-center" },

                            React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Original Price"),

                            React.createElement("p", { className: "text-2xl font-black text-slate-400 line-through" }, fmt(d.discOriginal)),

                            React.createElement("div", { className: "flex items-center justify-center gap-2 mt-2" },

                              React.createElement("span", { className: "px-3 py-1 bg-red-100 text-red-600 text-sm font-black rounded-full" }, d.discPercent + '% OFF'),

                              d.discCoupon > 0 && React.createElement("span", { className: "px-3 py-1 bg-amber-100 text-amber-600 text-sm font-black rounded-full" }, '+ ' + fmt(d.discCoupon) + ' coupon')

                            ),

                            React.createElement("p", { className: "text-xs text-slate-500 mt-2" }, "What is the final price" + (d.discCoupon > 0 ? ' after discount AND coupon' : '') + '?')

                          )

                        ),

                        React.createElement("div", { className: "flex items-center gap-3" },

                          React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: 'Sale price...',

                            value: d.discAnswer != null ? d.discAnswer : '', onChange: function (e) { upd('discAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); },

                            className: "px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold w-36 focus:ring-2 focus:ring-pink-400 outline-none"

                          }),

                          React.createElement("button", { onClick: function () {

                              var discounted = d.discOriginal * (1 - d.discPercent / 100);

                              var final_ = Math.round((discounted - (d.discCoupon || 0)) * 100) / 100;

                              if (final_ < 0) final_ = 0;

                              var isRight = typeof d.discAnswer === 'number' && Math.abs(d.discAnswer - final_) < 0.02;

                              upd('discFeedback', isRight

                                ? { ok: true, msg: '\u2705 Correct! ' + fmt(d.discOriginal) + ' \u2212 ' + d.discPercent + '% = ' + fmt(discounted) + (d.discCoupon > 0 ? ' \u2212 ' + fmt(d.discCoupon) + ' coupon' : '') + ' = ' + fmt(final_) }

                                : { ok: false, msg: '\u274C The sale price is ' + fmt(final_) + '. (' + fmt(d.discOriginal) + ' \u00D7 ' + (100 - d.discPercent) + '%)' + (d.discCoupon > 0 ? ' \u2212 ' + fmt(d.discCoupon) : '') }

                              );

                              if (isRight && typeof addXP === 'function') addXP(15, 'Money Math: Discount calculation');

                            }, className: "px-5 py-2 bg-pink-500 text-white font-bold rounded-xl hover:bg-pink-600 transition-all text-sm"

                          }, "\u2714 Check")

                        ),

                        d.discFeedback && React.createElement("p", { className: "text-sm font-bold " + (d.discFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.discFeedback.msg),

                        React.createElement("button", { onClick: genDiscountProblem, className: "px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs" }, "\u21BB Next Problem")

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

                    onChange: function (e) { upd('budgetIncome', parseFloat(e.target.value) || 0); },

                    className: "px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold w-40 focus:ring-2 focus:ring-indigo-400 outline-none"

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

                          React.createElement("span", { className: "text-xs font-bold text-slate-500" }, fmt(amount))

                        )

                      ),

                      React.createElement("input", { type: "range", min: 0, max: 50, value: cat.pct,

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

                  React.createElement("p", { className: "text-xs font-bold text-slate-500 uppercase mb-2" }, "Budget Summary"),

                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2" },

                    budgetCats.map(function (cat, ci) {

                      return React.createElement("div", { key: ci, className: "text-center p-2 rounded-lg", style: { background: cat.color + '15' } },

                        React.createElement("p", { className: "text-lg" }, cat.name.split(' ')[0]),

                        React.createElement("p", { className: "text-xs font-black", style: { color: cat.color } }, fmt(budgetIncome * cat.pct / 100)),

                        React.createElement("p", { className: "text-[9px] text-slate-400" }, cat.pct + '%')

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

                    React.createElement("button", { onClick: genFewestCoinsChallenge, className: "px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all" }, !d.fcTarget ? '\u2728 Start' : '\u21BB New')

                  ),

                  d.fcTarget && React.createElement("div", { className: "space-y-3" },

                    React.createElement("div", { className: "bg-white rounded-xl p-4 text-center border border-amber-100" },

                      React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Make this amount with the FEWEST coins & bills"),

                      React.createElement("p", { className: "text-3xl font-black text-amber-600" }, fmt(d.fcTarget)),

                      React.createElement("p", { className: "text-[10px] text-slate-400 mt-1" }, "Optimal solution uses " + d.fcOptimal + " pieces")

                    ),

                    // Quick denomination buttons

                    React.createElement("div", { className: "flex flex-wrap gap-1 justify-center" },

                      cur.bills.slice().reverse().concat(cur.coins.slice().reverse()).map(function (item, idx) {

                        return React.createElement("button", { key: idx, onClick: function () {

                          upd('fcPlaced', [].concat(d.fcPlaced || [], [item.value]));

                        }, className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-white border border-amber-200 hover:bg-amber-50 transition-all" }, (item.name || fmt(item.value)));

                      })

                    ),

                    // Placed items

                    (d.fcPlaced || []).length > 0 && React.createElement("div", { className: "bg-white rounded-lg p-3 border border-slate-200" },

                      React.createElement("div", { className: "flex items-center justify-between mb-2" },

                        React.createElement("span", { className: "text-xs font-bold text-slate-600" }, "Your selection: " + (d.fcPlaced || []).length + " pieces"),

                        React.createElement("span", { className: "text-sm font-black text-emerald-600" }, fmt((d.fcPlaced || []).reduce(function (s, v) { return s + v; }, 0)))

                      ),

                      React.createElement("div", { className: "flex flex-wrap gap-1 mb-2" },

                        (d.fcPlaced || []).map(function (v, pi) {

                          return React.createElement("button", { key: pi, onClick: function () {

                            upd('fcPlaced', (d.fcPlaced || []).filter(function (_, idx) { return idx !== pi; }));

                          }, className: "px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold hover:bg-red-100 hover:text-red-600 transition-all" }, fmt(v) + ' \u2715');

                        })

                      ),

                      React.createElement("div", { className: "flex gap-2" },

                        React.createElement("button", { onClick: function () {

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

                        }, className: "flex-1 px-4 py-2 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-xs" }, "\u2714 Check"),

                        React.createElement("button", { onClick: function () { upd('fcPlaced', []); }, className: "px-4 py-2 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all text-xs" }, "\u21BA Reset")

                      ),

                      d.fcFeedback && React.createElement("p", { className: "text-xs font-bold mt-2 " + (d.fcFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.fcFeedback.msg)

                    )

                  )

                ),



                // Unit Pricing challenge

                React.createElement("div", { className: "bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-200" },

                  React.createElement("div", { className: "flex items-center justify-between mb-3" },

                    React.createElement("h4", { className: "text-sm font-bold text-teal-800" }, "\uD83D\uDED2 Best Deal: Unit Pricing"),

                    React.createElement("button", { onClick: genUnitPriceProblem, className: "px-3 py-1.5 bg-teal-500 text-white text-xs font-bold rounded-lg hover:bg-teal-600 transition-all" }, !d.upItem ? '\u2728 Start' : '\u21BB New')

                  ),

                  d.upItem && d.upA && d.upB && React.createElement("div", { className: "space-y-3" },

                    React.createElement("p", { className: "text-xs text-slate-500 text-center" }, "Which is the better deal for " + d.upItem.name + "?"),

                    React.createElement("div", { className: "grid grid-cols-2 gap-3" },

                      React.createElement("button", { onClick: function () { upd('upAnswer', 'A'); },

                        className: "p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02] " + (d.upAnswer === 'A' ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-slate-200 bg-white hover:border-teal-300')

                      },

                        React.createElement("p", { className: "text-2xl mb-1" }, d.upItem.name.split(' ')[0]),

                        React.createElement("p", { className: "text-lg font-black text-teal-700" }, fmt(d.upA.price)),

                        React.createElement("p", { className: "text-xs text-slate-500" }, d.upA.qty + ' ' + d.upItem.unit + (d.upA.qty > 1 ? 's' : '')),

                        React.createElement("p", { className: "text-[10px] text-slate-400 mt-1" }, 'Option A')

                      ),

                      React.createElement("button", { onClick: function () { upd('upAnswer', 'B'); },

                        className: "p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02] " + (d.upAnswer === 'B' ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-slate-200 bg-white hover:border-teal-300')

                      },

                        React.createElement("p", { className: "text-2xl mb-1" }, d.upItem.name.split(' ')[0]),

                        React.createElement("p", { className: "text-lg font-black text-teal-700" }, fmt(d.upB.price)),

                        React.createElement("p", { className: "text-xs text-slate-500" }, d.upB.qty + ' ' + d.upItem.unit + (d.upB.qty > 1 ? 's' : '')),

                        React.createElement("p", { className: "text-[10px] text-slate-400 mt-1" }, 'Option B')

                      )

                    ),

                    d.upAnswer && React.createElement("button", { onClick: function () {

                      var unitA = d.upA.price / d.upA.qty;

                      var unitB = d.upB.price / d.upB.qty;

                      var correct = unitA <= unitB ? 'A' : 'B';

                      var isRight = d.upAnswer === correct;

                      upd('upFeedback', isRight

                        ? { ok: true, msg: '\u2705 Correct! Option A: ' + fmt(unitA) + '/' + d.upItem.unit + ' vs Option B: ' + fmt(unitB) + '/' + d.upItem.unit }

                        : { ok: false, msg: '\u274C Option ' + correct + ' is cheaper. A: ' + fmt(unitA) + '/' + d.upItem.unit + ' vs B: ' + fmt(unitB) + '/' + d.upItem.unit }

                      );

                      if (isRight && typeof addXP === 'function') addXP(15, 'Money Math: Unit pricing');

                    }, className: "w-full px-4 py-2 bg-teal-500 text-white font-bold rounded-xl hover:bg-teal-600 transition-all text-sm" }, "\u2714 Check My Answer"),

                    d.upFeedback && React.createElement("p", { className: "text-xs font-bold " + (d.upFeedback.ok ? 'text-emerald-600' : 'text-red-500') }, d.upFeedback.msg)

                  )

                ),



                // ── Estimate the Total ──

                React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200" },

                  React.createElement("div", { className: "flex items-center justify-between mb-3" },

                    React.createElement("h4", { className: "text-sm font-bold text-indigo-800" }, "\uD83E\uDDFE Estimate the Total"),

                    React.createElement("button", { onClick: genEstimateTotal, className: "px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 transition-all" }, !d.estItems ? '\u2728 Start' : '\u21BB New')

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

                      React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', value: d.estAnswer != null ? d.estAnswer : '', onChange: function (e) { upd('estAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); upd('estFb', null); }, className: "flex-1 px-3 py-2 border border-indigo-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-indigo-400 outline-none" }),

                      React.createElement("button", { onClick: function () {

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

                    React.createElement("button", { onClick: genChangeCheck, className: "px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 transition-all" }, d.ccPrice == null ? '\u2728 Start' : '\u21BB New')

                  ),

                  d.ccPrice != null && React.createElement("div", { className: "space-y-3" },

                    React.createElement("div", { className: "bg-white rounded-lg border border-rose-100 p-4 text-center space-y-1" },

                      React.createElement("p", { className: "text-xs text-slate-500" }, "Item costs: " + React.createElement("span", { className: "font-black text-slate-700" }, fmt(d.ccPrice)) + " | Paid: " + React.createElement("span", { className: "font-black text-slate-700" }, fmt(d.ccPaid))),

                      React.createElement("p", { className: "text-xs text-slate-500" }, "Item costs:"),

                      React.createElement("p", { className: "text-lg font-black text-rose-700" }, fmt(d.ccPrice)),

                      React.createElement("p", { className: "text-xs text-slate-500 mt-1" }, "Paid with:"),

                      React.createElement("p", { className: "text-lg font-black text-slate-700" }, fmt(d.ccPaid)),

                      React.createElement("p", { className: "text-xs text-slate-500 mt-2" }, "Cashier gives you:"),

                      React.createElement("p", { className: "text-2xl font-black text-amber-600" }, fmt(d.ccProposed)),

                      React.createElement("p", { className: "text-xs font-bold text-rose-600 mt-2" }, "Is this the right change? \uD83E\uDD14")

                    ),

                    React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                      React.createElement("button", { onClick: function () { upd('ccAnswer', true); upd('ccFb', null); }, className: "py-2 rounded-xl font-bold text-sm transition-all " + (d.ccAnswer === true ? 'bg-green-500 text-white shadow-md' : 'bg-white border border-green-300 text-green-600 hover:bg-green-50') }, "\u2705 Correct!"),

                      React.createElement("button", { onClick: function () { upd('ccAnswer', false); upd('ccFb', null); }, className: "py-2 rounded-xl font-bold text-sm transition-all " + (d.ccAnswer === false ? 'bg-red-500 text-white shadow-md' : 'bg-white border border-red-300 text-red-600 hover:bg-red-50') }, "\u274C Wrong!")

                    ),

                    d.ccAnswer != null && React.createElement("button", { onClick: function () {

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

                    }, className: "w-full px-4 py-2 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all text-sm" }, "\u2714 Submit"),

                    d.ccFb && React.createElement("p", { className: "text-xs font-bold " + (d.ccFb.ok ? 'text-green-600' : 'text-red-500') }, d.ccFb.msg)

                  )

                ),



                // ── Coupon Stack ──

                React.createElement("div", { className: "bg-gradient-to-br from-fuchsia-50 to-purple-50 rounded-xl p-4 border border-fuchsia-200" },

                  React.createElement("div", { className: "flex items-center justify-between mb-3" },

                    React.createElement("h4", { className: "text-sm font-bold text-fuchsia-800" }, "\uD83C\uDFF7 Coupon Stack"),

                    React.createElement("button", { onClick: genCouponStack, className: "px-3 py-1.5 bg-fuchsia-500 text-white text-xs font-bold rounded-lg hover:bg-fuchsia-600 transition-all" }, d.csOriginal == null ? '\u2728 Start' : '\u21BB New')

                  ),

                  d.csOriginal != null && React.createElement("div", { className: "space-y-3" },

                    React.createElement("div", { className: "bg-white rounded-lg border border-fuchsia-100 p-4 space-y-2" },

                      React.createElement("p", { className: "text-xs text-slate-500 text-center" }, "Original price:"),

                      React.createElement("p", { className: "text-2xl font-black text-fuchsia-700 text-center" }, fmt(d.csOriginal)),

                      React.createElement("p", { className: "text-xs text-slate-500 text-center mt-2" }, "Apply these discounts in order:"),

                      d.csDiscounts.map(function (disc, i) {

                        return React.createElement("div", { key: i, className: "flex items-center justify-center gap-2 text-sm" },

                          React.createElement("span", { className: "text-lg" }, ['\uD83C\uDFF7\uFE0F', '\u2702\uFE0F', '\uD83C\uDF81'][i] || '\uD83C\uDFF7\uFE0F'),

                          React.createElement("span", { className: "font-bold text-fuchsia-600" }, disc.type === 'pct' ? disc.val + '% off' : fmt(disc.val) + ' off')

                        );

                      })

                    ),

                    React.createElement("div", { className: "flex items-center gap-2" },

                      React.createElement("label", { className: "text-xs font-bold text-slate-600" }, "Final price:"),

                      React.createElement("input", { type: "number", step: isJPY ? '1' : '0.01', placeholder: cur.symbol + '...', value: d.csAnswer != null ? d.csAnswer : '', onChange: function (e) { upd('csAnswer', e.target.value === '' ? null : parseFloat(e.target.value)); upd('csFb', null); }, className: "flex-1 px-3 py-2 border border-fuchsia-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-fuchsia-400 outline-none" }),

                      React.createElement("button", { onClick: function () {

                        if (d.csAnswer == null) return;

                        var tol = isJPY ? 0.5 : 0.02;

                        var ok = Math.abs(d.csAnswer - d.csFinal) < tol + d.csFinal * 0.01;

                        upd('csFb', ok ? { ok: true, msg: '\u2705 Perfect! Final price: ' + fmt(d.csFinal) + ' \u2014 +15 XP!' } : { ok: false, msg: '\u274C Not quite. Final price is ' + fmt(d.csFinal) + '. Discounts apply sequentially!' });

                        if (ok) {

                          if (typeof awardStemXP === 'function') awardStemXP('moneyMath', 15, 'coupon stack');

                          if (typeof addXP === 'function') addXP(15, 'Money Math: Coupon stacking');

                        }

                      }, className: "px-4 py-2 bg-fuchsia-500 text-white font-bold rounded-lg hover:bg-fuchsia-600 transition-all text-sm" }, "\u2714")

                    ),

                    d.csFb && React.createElement("p", { className: "text-xs font-bold " + (d.csFb.ok ? 'text-green-600' : 'text-red-500') }, d.csFb.msg)

                  )

                ),



                // ── Structured Word Problems ──

                React.createElement("div", { className: "bg-gradient-to-br from-cyan-50 to-sky-50 rounded-xl p-4 border border-cyan-200" },

                  React.createElement("div", { className: "flex items-center justify-between mb-3" },

                    React.createElement("h4", { className: "text-sm font-bold text-cyan-800" }, "\uD83D\uDCDD Word Problems"),

                    React.createElement("button", { onClick: genStructuredProblem, className: "px-3 py-1.5 bg-cyan-500 text-white text-xs font-bold rounded-lg hover:bg-cyan-600 transition-all" }, !d.spText ? '\u2728 Start' : '\u21BB New')

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

                          }, className: "flex-1 px-3 py-2 border border-cyan-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-cyan-400 outline-none" })

                        );

                      })

                    ),

                    React.createElement("button", { onClick: function () {

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

                    }, className: "w-full px-4 py-2 bg-cyan-500 text-white font-bold rounded-xl hover:bg-cyan-600 transition-all text-sm" }, "\u2714 Check My Answers"),

                    d.spFb && React.createElement("p", { className: "text-xs font-bold " + (d.spFb.ok ? 'text-green-600' : 'text-red-500') }, d.spFb.msg)

                  )

                ),



                // ── 🪙 Coin Drop Minigame ──

                React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200" },

                  React.createElement("div", { className: "flex items-center justify-between mb-3" },

                    React.createElement("h4", { className: "text-sm font-bold text-amber-800" }, "\uD83E\uDE99 Coin Drop"),

                    React.createElement("div", { className: "flex items-center gap-2" },

                      cdStreak > 0 && React.createElement("span", { className: "px-2 py-0.5 bg-amber-100 rounded-full text-[10px] font-black text-amber-700" }, '\uD83D\uDD25 ' + cdStreak + ' streak'),

                      React.createElement("button", { onClick: genCoinDrop, className: "px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all shadow-sm" }, cdTarget === 0 ? '\u2728 Start' : '\u21BB New')

                    )

                  ),

                  cdTarget > 0 && React.createElement("div", { className: "space-y-3" },

                    // Target display

                    React.createElement("div", { className: "bg-white rounded-xl p-4 border border-amber-100 text-center" },

                      React.createElement("p", { className: "text-[10px] text-slate-500 font-bold uppercase tracking-wider" }, "\uD83C\uDFAF Target Amount"),

                      React.createElement("p", { className: "text-3xl font-black text-amber-600 mt-1" }, fmt(cdTarget)),

                      challengeMode && cdStartTime && React.createElement("p", { className: "text-[10px] text-slate-400 mt-1" }, '\u23F1 Timer running...')

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

                            className: "inline-flex items-center justify-center rounded-full font-black text-white text-[9px] shadow-md" + (isNew ? ' animate-bounce' : ''),

                            style: { width: coin.size * 0.7 + 'px', height: coin.size * 0.7 + 'px', backgroundColor: coin.color, fontSize: '9px', lineHeight: '1' }

                          }, coin.label);

                        })

                      ),

                      cdDropped.length === 0 && React.createElement("p", { className: "text-center text-xs text-amber-400 font-bold py-6 relative z-10" }, '\uD83D\uDC37 Drop coins here!')

                    ),

                    // Running total

                    React.createElement("div", { className: "flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100" },

                      React.createElement("span", { className: "text-xs font-bold text-slate-600" }, "Your total:"),

                      React.createElement("span", { className: "text-lg font-black " + (cdRound === cdTarget ? 'text-green-600' : cdRound > cdTarget ? 'text-red-500' : 'text-amber-600') }, fmt(cdRound)),

                      React.createElement("span", { className: "text-xs text-slate-400" }, (cdTarget - cdRound > 0 ? fmt(cdTarget - cdRound) + ' to go' : cdRound === cdTarget ? '\u2705 Perfect!' : '\u274C Over!'))

                    ),

                    // Clickable coin/bill tokens

                    React.createElement("div", { className: "flex flex-wrap gap-1.5 justify-center" },

                      COIN_DENOMS.map(function (coin) {

                        var wouldOvershoot = cdRound + coin.val > cdTarget + 0.001;

                        return React.createElement("button", { key: coin.label, onClick: function () {

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

                          className: "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all border-2 " + (wouldOvershoot && !cdFb ? 'border-red-200 bg-red-50 opacity-60' : 'border-amber-200 bg-white hover:border-amber-400 hover:shadow-md hover:scale-105') + (cdFb ? ' opacity-50 cursor-not-allowed' : '')

                        },

                          React.createElement("div", {

                            className: "flex items-center justify-center rounded-full font-black text-white text-[10px]",

                            style: { width: coin.size + 'px', height: coin.size + 'px', backgroundColor: coin.color }

                          }, coin.label),

                          React.createElement("span", { className: "text-[9px] font-bold text-slate-500" }, fmt(coin.val))

                        );

                      })

                    ),

                    // Undo button

                    cdDropped.length > 0 && !cdFb && React.createElement("button", { onClick: function () {

                      var newDropped = cdDropped.slice(0, -1);

                      upd('cdDropped', newDropped);

                    }, className: "w-full px-3 py-1 text-xs text-slate-400 hover:text-slate-600 font-bold text-center" }, '\u21A9 Undo last coin'),

                    // Feedback

                    cdFb && React.createElement("div", { className: "space-y-2" },

                      React.createElement("p", { className: "text-xs font-bold text-center " + (cdFb.ok ? 'text-green-600' : 'text-red-500') }, cdFb.msg),

                      React.createElement("button", { onClick: genCoinDrop, className: "w-full px-4 py-2 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-sm shadow-md" }, '\u27A1 Next Round')

                    )

                  )

                ),



                // Score tracker

                React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-3 border border-violet-200 text-center" },

                  React.createElement("p", { className: "text-[10px] font-bold text-violet-500" }, "\uD83C\uDFC6 Complete challenges across all tabs to earn XP and build real-world money skills!")

                )

              ),



              // ═══ PERSONAL FINANCE TAB ═══

              tab === 'finance' && React.createElement("div", { className: "space-y-4" },

                // Sub-tab navigation

                React.createElement("div", { className: "flex flex-wrap gap-2 mb-2" },

                  [{ id: 'compound', label: '\uD83D\uDCC8 Compound Interest' }, { id: 'retire', label: '\uD83C\uDFD6\uFE0F Retirement' }, { id: 'loans', label: '\uD83C\uDFE6 Loans & Debt' }, { id: 'goals', label: '\uD83C\uDFAF Savings Goals' }, { id: 'quiz', label: '\uD83E\uDDE0 Fin. Quiz' }].map(function (s) {

                    return React.createElement("button", { key: s.id, onClick: function () { upd('finSub', s.id); },

                      className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " + (finSub === s.id ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 border border-slate-200 hover:bg-blue-50')

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

                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Principal"),

                      React.createElement("input", { type: "number", value: ciPrincipal, onChange: function (e) { upd('ciPrincipal', Math.max(0, parseFloat(e.target.value) || 0)); },

                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-400 outline-none mt-1" })

                    ),

                    React.createElement("div", null,

                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Annual Rate %"),

                      React.createElement("input", { type: "number", step: "0.5", value: ciRate, onChange: function (e) { upd('ciRate', Math.max(0, parseFloat(e.target.value) || 0)); },

                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-400 outline-none mt-1" })

                    ),

                    React.createElement("div", null,

                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Years"),

                      React.createElement("input", { type: "number", value: ciYears, onChange: function (e) { upd('ciYears', Math.min(50, Math.max(1, parseInt(e.target.value) || 1))); },

                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-400 outline-none mt-1" })

                    ),

                    React.createElement("div", null,

                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Compounding"),

                      React.createElement("select", { value: ciFreq, onChange: function (e) { upd('ciFreq', e.target.value); },

                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-400 outline-none mt-1" },

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

                      React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Compound Interest"),

                      React.createElement("p", { className: "text-2xl font-black text-blue-600" }, cur.symbol + Math.round(ciCompound).toLocaleString()),

                      React.createElement("p", { className: "text-xs text-emerald-500 font-bold" }, "+" + cur.symbol + Math.round(ciCompoundInterest).toLocaleString() + " earned")

                    ),

                    React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-100 text-center" },

                      React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Simple Interest"),

                      React.createElement("p", { className: "text-2xl font-black text-slate-500" }, cur.symbol + Math.round(ciSimple).toLocaleString()),

                      React.createElement("p", { className: "text-xs text-slate-400 font-bold" }, "+" + cur.symbol + Math.round(ciSimpleInterest).toLocaleString() + " earned")

                    )

                  ),

                  React.createElement("p", { className: "text-xs font-bold text-center " + (ciCompoundInterest > ciSimpleInterest * 1.1 ? 'text-emerald-600' : 'text-slate-500'), style: { marginBottom: 8 } },

                    "\uD83D\uDCA1 Compound earns " + cur.symbol + Math.round(ciCompoundInterest - ciSimpleInterest).toLocaleString() + " MORE than simple interest!"

                  ),

                  // Growth table

                  React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 overflow-hidden" },

                    React.createElement("table", { className: "w-full text-xs" },

                      React.createElement("thead", null,

                        React.createElement("tr", { className: "bg-slate-50" },

                          React.createElement("th", { className: "px-3 py-2 text-left font-bold text-slate-500" }, "Year"),

                          React.createElement("th", { className: "px-3 py-2 text-right font-bold text-blue-600" }, "Compound"),

                          React.createElement("th", { className: "px-3 py-2 text-right font-bold text-slate-400" }, "Simple"),

                          React.createElement("th", { className: "px-3 py-2 text-right font-bold text-emerald-500" }, "Advantage")

                        )

                      ),

                      React.createElement("tbody", null,

                        ciTable.filter(function (r) { return r.year === 0 || r.year === 1 || r.year % Math.max(1, Math.floor(ciYears / 8)) === 0 || r.year === ciYears; }).map(function (r, ri) {

                          return React.createElement("tr", { key: ri, className: ri % 2 === 0 ? 'bg-white' : 'bg-slate-50' },

                            React.createElement("td", { className: "px-3 py-1.5 font-bold text-slate-600" }, r.year),

                            React.createElement("td", { className: "px-3 py-1.5 text-right font-bold text-blue-600" }, cur.symbol + Math.round(r.compound).toLocaleString()),

                            React.createElement("td", { className: "px-3 py-1.5 text-right text-slate-400" }, cur.symbol + Math.round(r.simple).toLocaleString()),

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

                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Start Age"),

                      React.createElement("input", { type: "range", min: 18, max: 55, value: retAge, onChange: function (e) { upd('retAge', parseInt(e.target.value)); },

                        className: "w-full mt-1", style: { accentColor: '#7c3aed' } }),

                      React.createElement("p", { className: "text-xs font-bold text-center text-violet-600" }, retAge + " years old")

                    ),

                    React.createElement("div", null,

                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Monthly Contribution"),

                      React.createElement("input", { type: "number", value: retMonthly, onChange: function (e) { upd('retMonthly', Math.max(0, parseFloat(e.target.value) || 0)); },

                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-violet-400 outline-none mt-1" })

                    ),

                    React.createElement("div", null,

                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Employer Match %"),

                      React.createElement("input", { type: "number", value: retMatch, onChange: function (e) { upd('retMatch', Math.max(0, parseFloat(e.target.value) || 0)); },

                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-violet-400 outline-none mt-1" })

                    )

                  ),

                  // Two-scenario comparison

                  React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-4" },

                    React.createElement("div", { className: "bg-white rounded-xl p-4 border-2 border-violet-300 text-center" },

                      React.createElement("p", { className: "text-[10px] font-bold text-violet-400 uppercase" }, "Start at " + retAge),

                      React.createElement("p", { className: "text-2xl font-black text-violet-600" }, cur.symbol + Math.round(retResult.total).toLocaleString()),

                      React.createElement("p", { className: "text-[10px] text-slate-500" }, "Contributed: " + cur.symbol + Math.round(retResult.contributed).toLocaleString()),

                      React.createElement("p", { className: "text-[10px] font-bold text-emerald-500" }, "Growth: " + cur.symbol + Math.round(retResult.growth).toLocaleString())

                    ),

                    React.createElement("div", { className: "bg-white rounded-xl p-4 border border-slate-200 text-center opacity-75" },

                      React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Start at " + (retAge + 10)),

                      React.createElement("p", { className: "text-2xl font-black text-slate-500" }, cur.symbol + Math.round(retLateResult.total).toLocaleString()),

                      React.createElement("p", { className: "text-[10px] text-slate-500" }, "Contributed: " + cur.symbol + Math.round(retLateResult.contributed).toLocaleString()),

                      React.createElement("p", { className: "text-[10px] font-bold text-slate-400" }, "Growth: " + cur.symbol + Math.round(retLateResult.growth).toLocaleString())

                    )

                  ),

                  retResult.total > retLateResult.total && React.createElement("div", { className: "bg-violet-100 rounded-xl p-3 text-center border border-violet-200" },

                    React.createElement("p", { className: "text-xs font-bold text-violet-700" },

                      "\uD83D\uDCA1 Starting 10 years earlier = " + cur.symbol + Math.round(retResult.total - retLateResult.total).toLocaleString() + " MORE at retirement!"),

                    React.createElement("p", { className: "text-[10px] text-violet-500 mt-1" }, "That's " + Math.round((retResult.total / Math.max(1, retLateResult.total) - 1) * 100) + "% more money \u2014 and you only contributed " + cur.symbol + Math.round(retResult.contributed - retLateResult.contributed).toLocaleString() + " extra.")

                  ),

                  // Milestone table

                  React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 overflow-hidden mt-4" },

                    React.createElement("table", { className: "w-full text-xs" },

                      React.createElement("thead", null,

                        React.createElement("tr", { className: "bg-slate-50" },

                          React.createElement("th", { className: "px-3 py-2 text-left font-bold text-slate-500" }, "Age"),

                          React.createElement("th", { className: "px-3 py-2 text-right font-bold text-violet-600" }, "Early Start"),

                          React.createElement("th", { className: "px-3 py-2 text-right font-bold text-slate-400" }, "Late Start")

                        )

                      ),

                      React.createElement("tbody", null,

                        retResult.yearly.filter(function (r) { return r.age === retAge || r.age % 5 === 0 || r.age === retRetireAge; }).map(function (r, ri) {

                          var late = retLateResult.yearly.find(function (l) { return l.age === r.age; });

                          return React.createElement("tr", { key: ri, className: ri % 2 === 0 ? 'bg-white' : 'bg-slate-50' },

                            React.createElement("td", { className: "px-3 py-1.5 font-bold text-slate-600" }, r.age),

                            React.createElement("td", { className: "px-3 py-1.5 text-right font-bold text-violet-600" }, cur.symbol + Math.round(r.balance).toLocaleString()),

                            React.createElement("td", { className: "px-3 py-1.5 text-right text-slate-400" }, late ? cur.symbol + Math.round(late.balance).toLocaleString() : '\u2014')

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

                      return React.createElement("button", { key: k, onClick: function () {

                        upd('loanType', k); upd('loanAmt', loanPresets[k].amt); upd('loanRate', loanPresets[k].rate); upd('loanTerm', loanPresets[k].term);

                      }, className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " + (loanType === k ? 'bg-rose-500 text-white shadow-md' : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50') }, loanPresets[k].label);

                    })

                  ),

                  // Controls

                  React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-4" },

                    React.createElement("div", null,

                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Loan Amount"),

                      React.createElement("input", { type: "number", value: loanAmt, onChange: function (e) { upd('loanAmt', Math.max(0, parseFloat(e.target.value) || 0)); },

                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none mt-1" })

                    ),

                    React.createElement("div", null,

                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Interest Rate %"),

                      React.createElement("input", { type: "number", step: "0.25", value: loanRate, onChange: function (e) { upd('loanRate', Math.max(0, parseFloat(e.target.value) || 0)); },

                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none mt-1" })

                    ),

                    React.createElement("div", null,

                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Term (months)"),

                      React.createElement("input", { type: "number", value: loanTerm, onChange: function (e) { upd('loanTerm', Math.max(1, parseInt(e.target.value) || 1)); },

                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-rose-400 outline-none mt-1" })

                    )

                  ),

                  // Results

                  React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-4" },

                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border border-rose-100" },

                      React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Monthly Payment"),

                      React.createElement("p", { className: "text-xl font-black text-rose-600" }, cur.symbol + Math.round(loanMonthly).toLocaleString())

                    ),

                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border border-red-200" },

                      React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Total Interest"),

                      React.createElement("p", { className: "text-xl font-black text-red-500" }, cur.symbol + Math.round(loanTotalInterest).toLocaleString()),

                      React.createElement("p", { className: "text-[9px] text-red-400" }, "That's " + Math.round(loanTotalInterest / loanAmt * 100) + "% of the loan!")

                    ),

                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border border-slate-100" },

                      React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Total Paid"),

                      React.createElement("p", { className: "text-xl font-black text-slate-600" }, cur.symbol + Math.round(loanTotalPaid).toLocaleString())

                    )

                  ),

                  // Visual bar

                  React.createElement("div", { className: "mb-4" },

                    React.createElement("p", { className: "text-[10px] font-bold text-slate-500 mb-1" }, "What you're really paying:"),

                    React.createElement("div", { className: "h-6 rounded-full overflow-hidden flex" },

                      React.createElement("div", { style: { width: Math.round(loanAmt / loanTotalPaid * 100) + '%', background: 'linear-gradient(90deg, #3b82f6, #6366f1)' }, className: "h-full flex items-center justify-center text-[9px] text-white font-bold" }, "Principal"),

                      React.createElement("div", { style: { width: Math.round(loanTotalInterest / loanTotalPaid * 100) + '%', background: 'linear-gradient(90deg, #ef4444, #dc2626)' }, className: "h-full flex items-center justify-center text-[9px] text-white font-bold" }, "Interest")

                    )

                  ),

                  // Amortization highlights

                  React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 overflow-hidden" },

                    React.createElement("table", { className: "w-full text-xs" },

                      React.createElement("thead", null,

                        React.createElement("tr", { className: "bg-slate-50" },

                          React.createElement("th", { className: "px-2 py-2 text-left font-bold text-slate-500" }, "Month"),

                          React.createElement("th", { className: "px-2 py-2 text-right font-bold text-slate-500" }, "Payment"),

                          React.createElement("th", { className: "px-2 py-2 text-right font-bold text-blue-500" }, "Principal"),

                          React.createElement("th", { className: "px-2 py-2 text-right font-bold text-red-500" }, "Interest"),

                          React.createElement("th", { className: "px-2 py-2 text-right font-bold text-slate-500" }, "Balance")

                        )

                      ),

                      React.createElement("tbody", null,

                        loanAmort.map(function (r, ri) {

                          return React.createElement("tr", { key: ri, className: ri % 2 === 0 ? 'bg-white' : 'bg-slate-50' },

                            React.createElement("td", { className: "px-2 py-1.5 font-bold text-slate-600" }, r.month),

                            React.createElement("td", { className: "px-2 py-1.5 text-right text-slate-600" }, cur.symbol + Math.round(r.payment).toLocaleString()),

                            React.createElement("td", { className: "px-2 py-1.5 text-right text-blue-600 font-bold" }, cur.symbol + Math.round(r.principal).toLocaleString()),

                            React.createElement("td", { className: "px-2 py-1.5 text-right text-red-500" }, cur.symbol + Math.round(r.interest).toLocaleString()),

                            React.createElement("td", { className: "px-2 py-1.5 text-right text-slate-500" }, cur.symbol + Math.round(r.balance).toLocaleString())

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

                      return React.createElement("button", { key: k, onClick: function () {

                        upd('sgGoal', k); upd('sgTarget', sgGoals[k].target); upd('sgHave', 0);

                      }, className: "px-3 py-1.5 rounded-xl text-xs font-bold transition-all " + (sgGoal === k ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50') }, sgGoals[k].label);

                    })

                  ),

                  // Controls

                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4" },

                    React.createElement("div", null,

                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Target Amount"),

                      React.createElement("input", { type: "number", value: sgTarget, onChange: function (e) { upd('sgTarget', Math.max(0, parseFloat(e.target.value) || 0)); },

                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-400 outline-none mt-1" })

                    ),

                    React.createElement("div", null,

                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Already Saved"),

                      React.createElement("input", { type: "number", value: sgHave, onChange: function (e) { upd('sgHave', Math.max(0, parseFloat(e.target.value) || 0)); },

                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-400 outline-none mt-1" })

                    ),

                    React.createElement("div", null,

                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Timeline (months)"),

                      React.createElement("input", { type: "number", value: sgMonths, onChange: function (e) { upd('sgMonths', Math.max(1, parseInt(e.target.value) || 1)); },

                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-400 outline-none mt-1" })

                    ),

                    React.createElement("div", null,

                      React.createElement("label", { className: "text-[10px] font-bold text-slate-500 uppercase" }, "Savings Rate %"),

                      React.createElement("input", { type: "number", step: "0.5", value: sgRate, onChange: function (e) { upd('sgRate', Math.max(0, parseFloat(e.target.value) || 0)); },

                        className: "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-emerald-400 outline-none mt-1" })

                    )

                  ),

                  // Progress bar

                  React.createElement("div", { className: "mb-4" },

                    React.createElement("div", { className: "flex items-center justify-between mb-1" },

                      React.createElement("span", { className: "text-[10px] font-bold text-slate-500" }, "Progress"),

                      React.createElement("span", { className: "text-[10px] font-bold text-emerald-600" }, Math.min(100, Math.round(sgHave / sgTarget * 100)) + "%")

                    ),

                    React.createElement("div", { className: "h-4 bg-slate-100 rounded-full overflow-hidden" },

                      React.createElement("div", { style: { width: Math.min(100, sgHave / sgTarget * 100) + '%', transition: 'width 0.3s' }, className: "h-full bg-gradient-to-r from-emerald-400 to-green-500 rounded-full" })

                    )

                  ),

                  // Results

                  React.createElement("div", { className: "grid grid-cols-3 gap-3 mb-4" },

                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border border-emerald-100" },

                      React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Per Day"),

                      React.createElement("p", { className: "text-lg font-black text-emerald-600" }, cur.symbol + (Math.round(sgDailyNeeded * 100) / 100).toFixed(2)),

                      React.createElement("p", { className: "text-[9px] text-slate-400" }, "\u2248 skip a coffee")

                    ),

                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border-2 border-emerald-300" },

                      React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Per Week"),

                      React.createElement("p", { className: "text-lg font-black text-emerald-600" }, cur.symbol + Math.round(sgWeeklyNeeded).toLocaleString())

                    ),

                    React.createElement("div", { className: "bg-white rounded-xl p-3 text-center border border-emerald-100" },

                      React.createElement("p", { className: "text-[10px] font-bold text-slate-400 uppercase" }, "Per Month"),

                      React.createElement("p", { className: "text-lg font-black text-emerald-600" }, cur.symbol + Math.round(sgMonthlyNeeded).toLocaleString())

                    )

                  ),

                  // "What if" scenarios

                  React.createElement("div", { className: "bg-white rounded-xl p-4 border border-emerald-100" },

                    React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase mb-2" }, "\uD83D\uDCA1 What If Scenarios"),

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

                    React.createElement("button", { onClick: genFinQuiz, className: "px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-all" }, d.fqIdx == null ? '\u2728 Start Quiz' : '\u21BB Next Question')

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

                            ? (isCorrect ? 'border-green-500 bg-green-50 text-green-700' : (selected ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-400'))

                            : (selected ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50');

                          return React.createElement("button", { key: ci, disabled: revealed, onClick: function () { upd('fqAnswer', ci); upd('fqFb', null); },

                            className: "p-3 rounded-xl border-2 text-sm font-bold text-left transition-all " + btnClass

                          }, String.fromCharCode(65 + ci) + '. ' + ch);

                        })

                      ),

                      d.fqAnswer != null && !d.fqFb && React.createElement("button", { onClick: function () {

                        var ok = d.fqAnswer === fq.correct;

                        upd('fqFb', ok ? { ok: true, msg: '\u2705 Correct! ' + fq.explanation } : { ok: false, msg: '\u274C Not quite. ' + fq.explanation });

                        if (ok) {

                          if (typeof awardStemXP === 'function') awardStemXP('moneyMath', 20, 'finance quiz');

                          if (typeof addXP === 'function') addXP(20, 'Money Math: Financial literacy quiz');

                        }

                      }, className: "w-full px-4 py-2 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-sm" }, "\u2714 Submit Answer"),

                      d.fqFb && React.createElement("div", { className: "rounded-lg p-3 text-xs font-medium leading-relaxed " + (d.fqFb.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700') }, d.fqFb.msg),

                      d.fqFb && React.createElement("button", { onClick: genFinQuiz, className: "w-full px-4 py-2 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all text-sm" }, "\u27A1\uFE0F Next Question")

                    );

                  })()

                )

              ),



              // ── Educational Footer ──

              React.createElement("div", { className: "bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 border border-emerald-200 text-center" },

                React.createElement("p", { className: "text-[10px] text-emerald-600" }, "\uD83C\uDF1F ", React.createElement("strong", null, "Financial literacy"), " is one of the most important life skills. Practice with real-world scenarios to build confidence with money!"),

                React.createElement("p", { className: "text-[9px] text-slate-400 mt-1" }, "Exchange rates are approximate and for educational purposes only.")

              )

            );
      })();
    }
  });

  // ═══ 🔬 coordinate (coordinate) ═══
  window.StemLab.registerTool('coordinate', {
    icon: '🔬',
    label: 'coordinate',
    desc: '',
    color: 'slate',
    category: 'math',
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

      // ── Tool body (coordinate) ──
      return (function() {
            if (!labToolData || !labToolData.coordinate) {
              if (typeof setLabToolData === 'function') {
                setLabToolData(prev => ({ ...prev, coordinate: { gridRange: {min: -10, max: 10}, gridPoints: [], gridChallenge: null, gridFeedback: null, exploreScore: {correct: 0, total: 0} }}));
              }
              return React.createElement('div', { className: 'p-8 text-center text-slate-400' }, 'Loading Coordinate Grid...');
            }
            const d = labToolData.coordinate;
            function upd(k, v) { setLabToolData(prev => ({ ...prev, coordinate: { ...prev.coordinate, [k]: typeof v === 'function' ? v(prev.coordinate[k]) : v } })); }
            
            const gridRange = d.gridRange;
            const gridPoints = d.gridPoints || [];
            const setGridPoints = (v) => upd('gridPoints', v);
            const gridChallenge = d.gridChallenge;
            const setGridChallenge = (v) => upd('gridChallenge', v);
            const gridFeedback = d.gridFeedback;
            const setGridFeedback = (v) => upd('gridFeedback', typeof v === 'function' ? v(d.gridFeedback) : v);
            const exploreScore = d.exploreScore || {correct: 0, total: 0};
            const setExploreScore = (v) => upd('exploreScore', typeof v === 'function' ? v(d.exploreScore) : v);

const gridW = 400,

              gridH = 400;

            const range = gridRange.max - gridRange.min;

            const step = gridW / range;

            const toSvg = (v, axis) => axis === 'x' ? (v - gridRange.min) * step : gridH - (v - gridRange.min) * step;

            const fromSvg = (px, axis) => axis === 'x' ? Math.round(px / step + gridRange.min) : Math.round((gridH - px) / step + gridRange.min);

            // Connect mode & slope state (stored in gridFeedback object)

            const connectMode = gridFeedback && gridFeedback.connectMode;

            const gridLines = (gridFeedback && gridFeedback.lines) || [];

            const connectFirst = gridFeedback && gridFeedback.connectFirst;

            const slopeChallenge = gridChallenge && gridChallenge.type === 'slope';

            const slopeAnswer = gridFeedback && gridFeedback.slopeAnswer;

            const calcSlope = (p1, p2) => {

              const dy = p2.y - p1.y;

              const dx = p2.x - p1.x;

              if (dx === 0) return { rise: dy, run: 0, value: 'undefined', display: 'undefined' };

              const gcdFn = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % t; a = t; } return a || 1; };

              const g = gcdFn(dy, dx);

              const num = dy / g; const den = dx / g;

              const frac = den < 0 ? (-num) + '/' + (-den) : den === 1 ? '' + num : num + '/' + den;

              return { rise: dy, run: dx, value: dy / dx, display: frac };

            };

            const handleGridClick = e => {

              const rect = e.currentTarget.getBoundingClientRect();

              const x = fromSvg(e.clientX - rect.left, 'x');

              const y = fromSvg(e.clientY - rect.top, 'y');

              if (x < gridRange.min || x > gridRange.max || y < gridRange.min || y > gridRange.max) return;

              if (connectMode) {

                const clickedIdx = gridPoints.findIndex(p => p.x === x && p.y === y);

                if (clickedIdx < 0) {

                  setGridPoints(prev => [...prev, { x, y }]);

                  const newIdx = gridPoints.length;

                  if (connectFirst === null || connectFirst === undefined) {

                    setGridFeedback(prev => Object.assign({}, prev, { connectFirst: newIdx }));

                  } else {

                    const from = gridPoints[connectFirst];

                    const to = { x, y };

                    const slope = calcSlope(from, to);

                    setGridFeedback(prev => Object.assign({}, prev, { lines: (prev.lines || []).concat([{ from, to, slope }]), connectFirst: null }));

                  }

                  return;

                }

                if (connectFirst === null || connectFirst === undefined) {

                  setGridFeedback(prev => Object.assign({}, prev, { connectFirst: clickedIdx }));

                } else if (clickedIdx !== connectFirst) {

                  const from = gridPoints[connectFirst];

                  const to = gridPoints[clickedIdx];

                  const slope = calcSlope(from, to);

                  setGridFeedback(prev => Object.assign({}, prev, { lines: (prev.lines || []).concat([{ from, to, slope }]), connectFirst: null }));

                }

                return;

              }

              const existing = gridPoints.findIndex(p => p.x === x && p.y === y);

              if (existing >= 0) {

                setGridPoints(prev => prev.filter((_, i) => i !== existing));

              } else {

                setGridPoints(prev => [...prev, { x, y }]);

              }

              setGridFeedback(null);

            };

            const checkGrid = () => {

              if (!gridChallenge) return;

              if (gridChallenge.type === 'plot') {

                const ok = gridPoints.some(p => p.x === gridChallenge.target.x && p.y === gridChallenge.target.y);

                announceToSR(ok ? 'Correct!' : 'Incorrect, try again');

                setGridFeedback(ok ? {

                  correct: true,

                  msg: '\u2705 Correct! Point (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ') plotted!'

                } : {

                  correct: false,

                  msg: '\u274C Point (' + gridChallenge.target.x + ', ' + gridChallenge.target.y + ') not found on your grid.'

                });

                setExploreScore(prev => ({

                  correct: prev.correct + (ok ? 1 : 0),

                  total: prev.total + 1

                }));

                if (ok && typeof awardStemXP === 'function') awardStemXP('coordinate', 5, 'plot point');

              } else if (gridChallenge.type === 'slope') {

                const cs = gridChallenge.slopeData;

                const riseAns = parseInt((gridFeedback && gridFeedback.riseAnswer) || '');

                const runAns = parseInt((gridFeedback && gridFeedback.runAnswer) || '');

                const slopeAns = ((gridFeedback && gridFeedback.slopeAnswer) || '').trim();

                const riseOk = riseAns === cs.rise;

                const runOk = runAns === cs.run;

                const slopeOk = slopeAns === cs.display || slopeAns === '' + cs.value || (cs.run !== 0 && Math.abs(parseFloat(slopeAns) - cs.value) < 0.01);

                const hinted = gridFeedback && gridFeedback.hinted;

                const allCorrect = riseOk && runOk && slopeOk;

                let msg;

                if (allCorrect && !hinted) {

                  msg = '\u2705 Perfect! rise=' + cs.rise + ', run=' + cs.run + ', slope = ' + cs.display;

                } else if (allCorrect && hinted) {

                  msg = '\u2705 Correct (hint used). slope = ' + cs.display;

                } else {

                  const parts = [];

                  if (!riseOk) parts.push('rise should be ' + cs.rise);

                  if (!runOk) parts.push('run should be ' + cs.run);

                  if (!slopeOk) parts.push('slope should be ' + cs.display);

                  msg = '\u274C ' + parts.join(', ');

                }

                setGridFeedback(prev => Object.assign({}, prev, {

                  correct: allCorrect,

                  msg: msg

                }));

                setExploreScore(prev => ({ correct: prev.correct + (allCorrect ? 1 : 0), total: prev.total + 1 }));

                if (allCorrect && typeof awardStemXP === 'function') awardStemXP('coordinate', 5, 'slope calc');

              }

            };

            return /*#__PURE__*/React.createElement("div", {

              className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200"

            }, /*#__PURE__*/React.createElement("div", {

              className: "flex items-center gap-3 mb-2"

            }, /*#__PURE__*/React.createElement("button", {

              onClick: () => setStemLabTool(null),

              className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors",

              'aria-label': 'Back to tools'

            }, /*#__PURE__*/React.createElement(ArrowLeft, {

              size: 18,

              className: "text-slate-500"

            })), /*#__PURE__*/React.createElement("h3", {

              className: "text-lg font-bold text-cyan-800"

            }, "\uD83D\uDCCD Coordinate Grid"), /*#__PURE__*/React.createElement("div", {

              className: "flex items-center gap-2 ml-2"

            }, /*#__PURE__*/React.createElement("div", {

              className: "text-xs font-bold text-emerald-600"

            }, exploreScore.correct, "/", exploreScore.total), /*#__PURE__*/React.createElement("button", {

              onClick: () => {

                const snap = {

                  id: 'snap-' + Date.now(),

                  tool: 'coordinate',

                  label: 'Grid: ' + gridPoints.length + ' points',

                  data: {

                    points: [...gridPoints]

                  },

                  timestamp: Date.now()

                };

                setToolSnapshots(prev => [...prev, snap]);

                addToast('\uD83D\uDCF8 Snapshot saved!', 'success');

              },

              className: "text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all"

            }, "\uD83D\uDCF8 Snapshot"))), /*#__PURE__*/React.createElement("div", {

              className: "bg-white rounded-xl border-2 border-cyan-200 p-4 flex justify-center"

            }, /*#__PURE__*/React.createElement("svg", {

              width: gridW,

              height: gridH,

              onClick: handleGridClick,

              className: "cursor-crosshair",

              style: {

                background: '#f8fafc'

              }

            }, Array.from({

              length: range + 1

            }).map((_, i) => {

              const v = gridRange.min + i;

              const px = toSvg(v, 'x');

              const py = toSvg(v, 'y');

              return React.createElement(React.Fragment, {

                key: i

              }, React.createElement('line', {

                x1: px,

                y1: 0,

                x2: px,

                y2: gridH,

                stroke: v === 0 ? '#334155' : '#e2e8f0',

                strokeWidth: v === 0 ? 2 : 0.5

              }), React.createElement('line', {

                x1: 0,

                y1: py,

                x2: gridW,

                y2: py,

                stroke: v === 0 ? '#334155' : '#e2e8f0',

                strokeWidth: v === 0 ? 2 : 0.5

              }), v !== 0 && v % 2 === 0 ? React.createElement('text', {

                x: toSvg(v, 'x'),

                y: toSvg(0, 'y') + 14,

                textAnchor: 'middle',

                className: 'text-[9px] fill-slate-400'

              }, v) : null, v !== 0 && v % 2 === 0 ? React.createElement('text', {

                x: toSvg(0, 'x') - 8,

                y: toSvg(v, 'y') + 3,

                textAnchor: 'end',

                className: 'text-[9px] fill-slate-400'

              }, v) : null);

            }),

              // ── Connected lines with slope badges ──

              gridLines.map((ln, li) => React.createElement(React.Fragment, { key: 'ln' + li },

                React.createElement('line', { x1: toSvg(ln.from.x, 'x'), y1: toSvg(ln.from.y, 'y'), x2: toSvg(ln.to.x, 'x'), y2: toSvg(ln.to.y, 'y'), stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '6,3', opacity: 0.8 }),

                React.createElement('line', { x1: toSvg(ln.to.x, 'x'), y1: toSvg(ln.from.y, 'y'), x2: toSvg(ln.to.x, 'x'), y2: toSvg(ln.to.y, 'y'), stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '3,2', opacity: 0.5 }),

                React.createElement('line', { x1: toSvg(ln.from.x, 'x'), y1: toSvg(ln.from.y, 'y'), x2: toSvg(ln.to.x, 'x'), y2: toSvg(ln.from.y, 'y'), stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '3,2', opacity: 0.5 }),

                React.createElement('rect', { x: (toSvg(ln.from.x, 'x') + toSvg(ln.to.x, 'x')) / 2 - 24, y: (toSvg(ln.from.y, 'y') + toSvg(ln.to.y, 'y')) / 2 - 10, width: 48, height: 18, rx: 5, fill: '#6366f1', opacity: 0.9 }),

                React.createElement('text', { x: (toSvg(ln.from.x, 'x') + toSvg(ln.to.x, 'x')) / 2, y: (toSvg(ln.from.y, 'y') + toSvg(ln.to.y, 'y')) / 2 + 3, textAnchor: 'middle', fill: '#fff', style: { fontSize: '9px', fontWeight: 'bold' } }, 'm=' + ln.slope.display)

              )),

              // Slope challenge line

              slopeChallenge && gridChallenge.p1 && React.createElement(React.Fragment, null,

                React.createElement('line', { x1: toSvg(gridChallenge.p1.x, 'x'), y1: toSvg(gridChallenge.p1.y, 'y'), x2: toSvg(gridChallenge.p2.x, 'x'), y2: toSvg(gridChallenge.p2.y, 'y'), stroke: '#f59e0b', strokeWidth: 2.5 }),

                React.createElement('circle', { cx: toSvg(gridChallenge.p1.x, 'x'), cy: toSvg(gridChallenge.p1.y, 'y'), r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }),

                React.createElement('circle', { cx: toSvg(gridChallenge.p2.x, 'x'), cy: toSvg(gridChallenge.p2.y, 'y'), r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 })

              ),

              // Points

              gridPoints.map((p, i) => React.createElement('circle', {

                key: i, cx: toSvg(p.x, 'x'), cy: toSvg(p.y, 'y'), r: 5,

                fill: connectFirst === i ? '#6366f1' : '#0891b2', stroke: '#fff', strokeWidth: 2, className: 'cursor-pointer'

              })), gridPoints.map((p, i) => React.createElement('text', {

                key: 't' + i, x: toSvg(p.x, 'x') + 8, y: toSvg(p.y, 'y') - 8, className: 'text-[10px] fill-cyan-700 font-bold'

              }, '(' + p.x + ',' + p.y + ')')))), /*#__PURE__*/React.createElement("div", {

                className: "flex gap-2 flex-wrap"

              }, /*#__PURE__*/React.createElement("button", {

                onClick: () => {

                  const tx = -8 + Math.floor(Math.random() * 17);

                  const ty = -8 + Math.floor(Math.random() * 17);

                  setGridChallenge({

                    type: 'plot',

                    target: {

                      x: tx,

                      y: ty

                    }

                  });

                  setGridPoints([]);

                  setGridFeedback(null);

                },

                className: "flex-1 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-lg text-sm hover:from-cyan-600 hover:to-teal-600 transition-all shadow-md"

              }, "\uD83D\uDCCD Plot a Point"),

          // Find Slope button

          /*#__PURE__*/React.createElement("button", {

                onClick: () => {

                  const x1 = -6 + Math.floor(Math.random() * 13); const y1 = -6 + Math.floor(Math.random() * 13);

                  let x2 = x1, y2 = y1;

                  while (x2 === x1 && y2 === y1) { x2 = -6 + Math.floor(Math.random() * 13); y2 = -6 + Math.floor(Math.random() * 13); }

                  const p1 = { x: x1, y: y1 }; const p2 = { x: x2, y: y2 };

                  setGridChallenge({ type: 'slope', p1, p2, slopeData: calcSlope(p1, p2) });

                  setGridPoints([p1, p2]); setGridFeedback({ slopeAnswer: '' });

                },

                className: "flex-1 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md"

              }, "\uD83D\uDCCF Find Slope"),

          // Connect Mode toggle

          /*#__PURE__*/React.createElement("button", {

                onClick: () => { if (connectMode) { setGridFeedback(null); } else { setGridFeedback({ connectMode: true, lines: gridLines, connectFirst: null }); } setGridChallenge(null); },

                className: "flex-1 py-2 font-bold rounded-lg text-sm transition-all shadow-md " + (connectMode ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200')

              }, connectMode ? "\u2714 Connect ON" : "\uD83D\uDD17 Connect"),

          /*#__PURE__*/React.createElement("button", {

                onClick: () => { setGridPoints([]); setGridChallenge(null); setGridFeedback(null); },

                className: "px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all"

              }, "\u21BA Clear")),

              // ── Slope challenge UI ──

              slopeChallenge && /*#__PURE__*/React.createElement("div", { className: "bg-amber-50 rounded-lg p-3 border border-amber-200" },

                React.createElement("p", { className: "text-sm font-bold text-amber-800 mb-2" }, "\uD83D\uDCCF Find the slope: (", gridChallenge.p1.x, ",", gridChallenge.p1.y, ") \u2192 (", gridChallenge.p2.x, ",", gridChallenge.p2.y, ")"),

                React.createElement("p", { className: "text-[10px] text-amber-600 mb-2 italic" }, "Show your work: fill in rise (\u0394y), run (\u0394x), then slope (m = rise/run)"),

                React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-2" },

                  React.createElement("div", { className: "flex flex-col gap-1" },

                    React.createElement("label", { className: "text-[10px] font-bold text-red-600 uppercase" }, "Rise (\u0394y)"),

                    React.createElement("input", { type: "number", placeholder: "?", value: (gridFeedback && gridFeedback.riseAnswer) || '', onChange: e => setGridFeedback(prev => Object.assign({}, prev, { riseAnswer: e.target.value })), disabled: gridFeedback && gridFeedback.hinted, className: "px-2 py-1.5 border-2 border-red-200 rounded-lg text-sm font-bold text-center focus:border-red-400 focus:outline-none" + ((gridFeedback && gridFeedback.hinted) ? ' bg-red-50 text-red-400' : '') })

                  ),

                  React.createElement("div", { className: "flex flex-col gap-1" },

                    React.createElement("label", { className: "text-[10px] font-bold text-blue-600 uppercase" }, "Run (\u0394x)"),

                    React.createElement("input", { type: "number", placeholder: "?", value: (gridFeedback && gridFeedback.runAnswer) || '', onChange: e => setGridFeedback(prev => Object.assign({}, prev, { runAnswer: e.target.value })), disabled: gridFeedback && gridFeedback.hinted, className: "px-2 py-1.5 border-2 border-blue-200 rounded-lg text-sm font-bold text-center focus:border-blue-400 focus:outline-none" + ((gridFeedback && gridFeedback.hinted) ? ' bg-blue-50 text-blue-400' : '') })

                  ),

                  React.createElement("div", { className: "flex flex-col gap-1" },

                    React.createElement("label", { className: "text-[10px] font-bold text-amber-700 uppercase" }, "Slope (m)"),

                    React.createElement("input", { type: "text", placeholder: "e.g. 2/3", value: (gridFeedback && gridFeedback.slopeAnswer) || '', onChange: e => setGridFeedback(prev => Object.assign({}, prev, { slopeAnswer: e.target.value })), onKeyDown: e => { if (e.key === 'Enter') checkGrid(); }, className: "px-2 py-1.5 border-2 border-amber-300 rounded-lg text-sm font-bold text-center focus:border-amber-500 focus:outline-none" })

                  )

                ),

                React.createElement("div", { className: "flex gap-2 items-center" },

                  !(gridFeedback && gridFeedback.hinted) && React.createElement("button", { onClick: () => { setGridFeedback(prev => Object.assign({}, prev, { hinted: true, riseAnswer: String(gridChallenge.slopeData.rise), runAnswer: String(gridChallenge.slopeData.run) })); }, className: "px-3 py-1.5 bg-amber-100 text-amber-700 font-bold rounded-lg text-[11px] hover:bg-amber-200 transition-all border border-amber-300" }, "\uD83D\uDCA1 Hint (\u00BD credit)"),

                  (gridFeedback && gridFeedback.hinted) && React.createElement("span", { className: "text-[10px] text-amber-500 italic" }, "\uD83D\uDCA1 Hint used \u2014 rise & run filled in"),

                  React.createElement("button", { onClick: checkGrid, className: "ml-auto px-4 py-1.5 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600" }, "\u2714 Check")

                ),

                gridFeedback && gridFeedback.msg && React.createElement("p", { className: 'text-sm font-bold mt-2 ' + (gridFeedback.correct ? 'text-green-600' : 'text-red-600') }, gridFeedback.msg)

              ),

              // ── Plot challenge UI ──

              gridChallenge && gridChallenge.type === 'plot' && /*#__PURE__*/React.createElement("div", { className: "bg-cyan-50 rounded-lg p-3 border border-cyan-200" },

                React.createElement("p", { className: "text-sm font-bold text-cyan-800 mb-2" }, "\uD83D\uDCCD Plot (", gridChallenge.target.x, ", ", gridChallenge.target.y, ")"),

                React.createElement("div", { className: "flex gap-2 items-center" },

                  React.createElement("span", { className: "text-xs text-cyan-600" }, "Points: ", React.createElement("span", { className: "font-bold" }, gridPoints.length)),

                  React.createElement("button", { onClick: checkGrid, className: "ml-auto px-4 py-1.5 bg-cyan-500 text-white font-bold rounded-lg text-sm hover:bg-cyan-600" }, "\u2714 Check")

                ),

                gridFeedback && gridFeedback.msg && React.createElement("p", { className: 'text-sm font-bold mt-2 ' + (gridFeedback.correct ? 'text-green-600' : 'text-red-600') }, gridFeedback.msg)

              ),

              // ── Connect mode info ──

              connectMode && /*#__PURE__*/React.createElement("div", { className: "bg-indigo-50 rounded-lg p-3 border border-indigo-200" },

                React.createElement("p", { className: "text-sm font-bold text-indigo-700 mb-1" }, "\uD83D\uDD17 Connect Mode"),

                React.createElement("p", { className: "text-xs text-indigo-600" }, connectFirst != null ? 'Click a second point to draw a line.' : 'Click a point to start.'),

                gridLines.length > 0 && React.createElement("div", { className: "mt-2 space-y-1" },

                  gridLines.map((ln, li) => React.createElement("div", { key: li, className: "flex items-center gap-2 text-[10px] bg-white rounded px-2 py-1 border" },

                    React.createElement("span", { className: "font-bold text-indigo-600" }, '(' + ln.from.x + ',' + ln.from.y + ') \u2192 (' + ln.to.x + ',' + ln.to.y + ')'),

                    React.createElement("span", { className: "ml-auto font-bold text-indigo-800" }, 'm=' + ln.slope.display)

                  ))

                ),

                React.createElement("button", { onClick: () => setGridFeedback(prev => Object.assign({}, prev, { lines: [], connectFirst: null })), className: "mt-2 px-3 py-1 text-[10px] font-bold bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200" }, "\uD83D\uDDD1 Clear Lines")

              ),

          // Stats

          /*#__PURE__*/React.createElement("div", { className: "grid grid-cols-2 gap-3" },

                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-cyan-100 text-center" },

                  React.createElement("div", { className: "text-xs font-bold text-cyan-600 uppercase mb-1" }, "Points"),

                  React.createElement("div", { className: "text-2xl font-bold text-cyan-800" }, gridPoints.length)

                ),

                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-cyan-100 text-center" },

                  React.createElement("div", { className: "text-xs font-bold text-cyan-600 uppercase mb-1" }, "Lines"),

                  React.createElement("div", { className: "text-2xl font-bold text-cyan-800" }, gridLines.length)

                )

              ));
      })();
    }
  });

  // ═══ 🔬 protractor (protractor) ═══
  window.StemLab.registerTool('protractor', {
    icon: '🔬',
    label: 'protractor',
    desc: '',
    color: 'slate',
    category: 'math',
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

      // ── Tool body (protractor) ──
      return (function() {
const classifyAngle = a => a === 0 ? 'Zero' : a < 90 ? 'Acute' : a === 90 ? t('stem.calculus.right') : a < 180 ? 'Obtuse' : a === 180 ? 'Straight' : a < 360 ? 'Reflex' : 'Full';

            const angleClass = classifyAngle(angleValue);

            const rad = angleValue * Math.PI / 180;

            const cx = 200,

              cy = 200,

              r = 160,

              rayLen = 170;

            const rayEndX = cx + rayLen * Math.cos(-rad);

            const rayEndY = cy + rayLen * Math.sin(-rad);

            const arcR = 60;

            const arcEndX = cx + arcR * Math.cos(-rad);

            const arcEndY = cy + arcR * Math.sin(-rad);

            const largeArc = angleValue > 180 ? 1 : 0;

            const handleAngleDrag = e => {

              const rect = e.currentTarget.closest('svg').getBoundingClientRect();

              const dx = e.clientX - rect.left - cx;

              const dy = -(e.clientY - rect.top - cy);

              let deg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);

              if (deg < 0) deg += 360;

              setAngleValue(deg);

              setAngleFeedback(null);

            };

            const checkAngle = () => {

              if (!angleChallenge) return;

              if (angleChallenge.type === 'create') {

                const diff = Math.abs(angleValue - angleChallenge.target);

                const ok = diff <= 3;

                announceToSR(ok ? 'Correct!' : 'Incorrect, try again');

                setAngleFeedback(ok ? {

                  correct: true,

                  msg: '✅ Correct! ' + angleValue + '° is a ' + classifyAngle(angleValue) + ' angle!'

                } : {

                  correct: false,

                  msg: '❌ You made ' + angleValue + '°. Target is ' + angleChallenge.target + '°. (within 3°)'

                });

                setExploreScore(prev => ({

                  correct: prev.correct + (ok ? 1 : 0),

                  total: prev.total + 1

                }));

                if (ok && typeof awardStemXP === 'function') awardStemXP('protractor', 5, 'create angle');

              } else if (angleChallenge.type === 'classify') {

                const correctClass = classifyAngle(angleChallenge.target);

                const ok = classifyAngle(angleValue) === correctClass;

                announceToSR(ok ? 'Correct!' : 'Incorrect, try again');

                setAngleFeedback(ok ? {

                  correct: true,

                  msg: '✅ Correct! ' + angleChallenge.target + '° is ' + correctClass + '.'

                } : {

                  correct: false,

                  msg: '❌ ' + angleChallenge.target + '° is ' + correctClass + ', not ' + classifyAngle(angleValue) + '.'

                });

                setExploreScore(prev => ({

                  correct: prev.correct + (ok ? 1 : 0),

                  total: prev.total + 1

                }));

                if (ok && typeof awardStemXP === 'function') awardStemXP('protractor', 5, 'classify angle');

              }

            };

            return /*#__PURE__*/React.createElement("div", {

              className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200"

            }, /*#__PURE__*/React.createElement("div", {

              className: "flex items-center gap-3 mb-2"

            }, /*#__PURE__*/React.createElement("button", {

              onClick: () => setStemLabTool(null),

              className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors",

              'aria-label': 'Back to tools'

            }, /*#__PURE__*/React.createElement(ArrowLeft, {

              size: 18,

              className: "text-slate-500"

            })), /*#__PURE__*/React.createElement("h3", {

              className: "text-lg font-bold text-purple-800"

            }, "\uD83D\uDCD0 Angle Explorer"), /*#__PURE__*/React.createElement("div", {

              className: "flex items-center gap-2 ml-2"

            }, /*#__PURE__*/React.createElement("div", {

              className: "text-xs font-bold text-emerald-600"

            }, exploreScore.correct, "/", exploreScore.total), /*#__PURE__*/React.createElement("button", {

              onClick: () => {

                const snap = {

                  id: 'snap-' + Date.now(),

                  tool: 'protractor',

                  label: 'Angle: ' + angleValue + '\u00b0',

                  data: {

                    angle: angleValue

                  },

                  timestamp: Date.now()

                };

                setToolSnapshots(prev => [...prev, snap]);

                addToast('\uD83D\uDCF8 Snapshot saved!', 'success');

              },

              className: "text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all"

            }, "\uD83D\uDCF8 Snapshot"))), /*#__PURE__*/React.createElement("div", {

              className: "bg-white rounded-xl border-2 border-purple-200 p-4 flex justify-center"

            }, /*#__PURE__*/React.createElement("svg", {

              width: 400,

              height: 420,

              className: "select-none"

            }, /*#__PURE__*/React.createElement("circle", {

              cx: cx,

              cy: cy,

              r: r,

              fill: "none",

              stroke: "#e9d5ff",

              strokeWidth: 1

            }), [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330].map(a => {

              const ar = a * Math.PI / 180;

              return React.createElement('g', {

                key: a

              }, React.createElement('line', {

                x1: cx + (r - 8) * Math.cos(-ar),

                y1: cy + (r - 8) * Math.sin(-ar),

                x2: cx + (r + 2) * Math.cos(-ar),

                y2: cy + (r + 2) * Math.sin(-ar),

                stroke: '#a78bfa',

                strokeWidth: a % 90 === 0 ? 2 : 1

              }), a % 30 === 0 ? React.createElement('text', {

                x: cx + (r + 14) * Math.cos(-ar),

                y: cy + (r + 14) * Math.sin(-ar) + 3,

                textAnchor: 'middle',

                className: 'text-[9px] fill-purple-400 font-mono'

              }, a + '°') : null);

            }), /*#__PURE__*/React.createElement("line", {

              x1: cx,

              y1: cy,

              x2: cx + rayLen,

              y2: cy,

              stroke: "#6b7280",

              strokeWidth: 2

            }), /*#__PURE__*/React.createElement("line", {

              x1: cx,

              y1: cy,

              x2: rayEndX,

              y2: rayEndY,

              stroke: "#7c3aed",

              strokeWidth: 3,

              strokeLinecap: "round"

            }), angleValue > 0 && angleValue < 360 && /*#__PURE__*/React.createElement("path", {

              d: `M ${cx + arcR} ${cy} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEndX} ${arcEndY}`,

              fill: "hsla(270,80%,60%,0.15)",

              stroke: "#7c3aed",

              strokeWidth: 1.5

            }), /*#__PURE__*/React.createElement("circle", {

              cx: rayEndX,

              cy: rayEndY,

              r: 10,

              fill: "#7c3aed",

              fillOpacity: 0.2,

              stroke: "#7c3aed",

              strokeWidth: 2,

              className: "cursor-grab",

              onMouseDown: e => {

                const onMove = me => {

                  const rect = e.target.closest('svg').getBoundingClientRect();

                  const dx = me.clientX - rect.left - cx;

                  const dy = -(me.clientY - rect.top - cy);

                  let deg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);

                  if (deg < 0) deg += 360;

                  setAngleValue(deg);

                  setAngleFeedback(null);

                };

                const onUp = () => {

                  window.removeEventListener('mousemove', onMove);

                  window.removeEventListener('mouseup', onUp);

                };

                window.addEventListener('mousemove', onMove);

                window.addEventListener('mouseup', onUp);

              }

            }), /*#__PURE__*/React.createElement("circle", {

              cx: cx,

              cy: cy,

              r: 3,

              fill: "#334155"

            }))), /*#__PURE__*/React.createElement("div", {

              className: "grid grid-cols-3 gap-3"

            }, /*#__PURE__*/React.createElement("div", {

              className: "bg-white rounded-xl p-3 border border-purple-100 text-center"

            }, /*#__PURE__*/React.createElement("div", {

              className: "text-xs font-bold text-purple-600 uppercase mb-1"

            }, "Angle"), /*#__PURE__*/React.createElement("div", {

              className: "text-2xl font-bold text-purple-800"

            }, (angleChallenge && angleChallenge.type === 'create' && !angleFeedback) ? "\u2753" : (angleValue + "\xB0"))), /*#__PURE__*/React.createElement("div", {

              className: "bg-white rounded-xl p-3 border border-purple-100 text-center"

            }, /*#__PURE__*/React.createElement("div", {

              className: "text-xs font-bold text-purple-600 uppercase mb-1"

            }, "Type"), /*#__PURE__*/React.createElement("div", {

              className: `text-lg font-bold ${angleClass === t('stem.calculus.right') ? 'text-green-600' : angleClass === 'Acute' ? 'text-blue-600' : angleClass === 'Obtuse' ? 'text-orange-600' : 'text-red-600'}`

            }, (angleChallenge && !angleFeedback) ? "\u2753" : angleClass)), /*#__PURE__*/React.createElement("div", {

              className: "bg-white rounded-xl p-3 border border-purple-100 text-center"

            }, /*#__PURE__*/React.createElement("div", {

              className: "text-xs font-bold text-purple-600 uppercase mb-1"

            }, "Slider"), /*#__PURE__*/React.createElement("input", {

              type: "range",

              min: 0,

              max: 360,

              value: angleValue,

              onChange: e => {

                setAngleValue(parseInt(e.target.value));

                setAngleFeedback(null);

              },

              className: "w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"

            }))), /*#__PURE__*/React.createElement("div", {

              className: "flex gap-2 flex-wrap"

            }, /*#__PURE__*/React.createElement("button", {

              onClick: () => {

                const ta = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 210, 240, 270, 300, 330][Math.floor(Math.random() * 17)];

                setAngleChallenge({

                  type: 'create',

                  target: ta

                });

                setAngleValue(0);

                setAngleFeedback(null);

              },

              className: "flex-1 py-2 bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold rounded-lg text-sm hover:from-purple-600 hover:to-violet-600 transition-all shadow-md"

            }, "\uD83C\uDFAF Create Angle"), /*#__PURE__*/React.createElement("button", {

              onClick: () => {

                setAngleValue(45);

                setAngleChallenge(null);

                setAngleFeedback(null);

              },

              className: "px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all"

            }, "\u21BA Reset")), angleChallenge && /*#__PURE__*/React.createElement("div", {

              className: "bg-purple-50 rounded-lg p-3 border border-purple-200"

            }, /*#__PURE__*/React.createElement("p", {

              className: "text-sm font-bold text-purple-800 mb-2"

            }, "\uD83C\uDFAF Create a ", angleChallenge.target, "\xB0 angle (within 3\xB0)"), /*#__PURE__*/React.createElement("div", {

              className: "flex gap-2 items-center"

            }, /*#__PURE__*/React.createElement("span", {

              className: "text-xs text-purple-600"

            }, "Your angle: ", /*#__PURE__*/React.createElement("span", {

              className: "font-bold text-purple-900"

            }, angleFeedback ? (angleValue + "\xB0") : "\u2753")), /*#__PURE__*/React.createElement("button", {

              onClick: checkAngle,

              className: "ml-auto px-4 py-1.5 bg-purple-500 text-white font-bold rounded-lg text-sm hover:bg-purple-600 transition-all"

            }, "\u2714 Check")), angleFeedback && /*#__PURE__*/React.createElement("p", {

              className: 'text-sm font-bold mt-2 ' + (angleFeedback.correct ? 'text-green-600' : 'text-red-600')

            }, angleFeedback.msg)));
      })();
    }
  });

  // ═══ 🔬 geometryProver (geometryProver) ═══
  window.StemLab.registerTool('geometryProver', {
    icon: '🔬',
    label: 'geometryProver',
    desc: '',
    color: 'slate',
    category: 'math',
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

      // ── Tool body (geometryProver) ──
      return (function() {
// ── Geometry Prover state via labToolData ──

            const gp = (labToolData && labToolData.geometryProver) || {};

            const gpUpd = (key, val) => setLabToolData(prev => ({ ...prev, geometryProver: { ...(prev.geometryProver || {}), [key]: val } }));

            const gpMode = gp.mode || 'freeform'; // freeform | triangle | parallel | bisector

            const gpPoints = gp.points || [];

            const gpSegments = gp.segments || [];

            const gpDragging = gp.dragging; // index of point being dragged

            const gpConnecting = gp.connecting; // index of first point in segment draw

            const gpChallenge = gp.challenge || null;

            const gpFeedback = gp.feedback || null;

            const gpShowLabels = gp.showLabels !== false;

            const gpHoverIdx = gp.hoverIdx != null ? gp.hoverIdx : -1;



            // ── Math helpers ──

            const dist = (a, b) => Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);

            const angleBetween = (p1, vertex, p2) => {

              const a1 = Math.atan2(p1.y - vertex.y, p1.x - vertex.x);

              const a2 = Math.atan2(p2.y - vertex.y, p2.x - vertex.x);

              let deg = (a1 - a2) * 180 / Math.PI;

              if (deg < 0) deg += 360;

              if (deg > 180) deg = 360 - deg;

              return Math.round(deg * 10) / 10;

            };

            const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

            const labelFor = i => String.fromCharCode(65 + (i % 26));



            // ── SVG constants ──

            const W = 500, H = 420;

            const gridStep = 25;



            // ── Find all angles at each vertex ──

            const findAnglesAtVertex = (vIdx) => {

              const v = gpPoints[vIdx];

              if (!v) return [];

              const connected = gpSegments

                .filter(s => s.from === vIdx || s.to === vIdx)

                .map(s => s.from === vIdx ? s.to : s.from)

                .filter((idx, i, arr) => arr.indexOf(idx) === i);

              if (connected.length < 2) return [];

              const angles = [];

              for (let i = 0; i < connected.length; i++) {

                for (let j = i + 1; j < connected.length; j++) {

                  const a = angleBetween(gpPoints[connected[i]], v, gpPoints[connected[j]]);

                  angles.push({ p1: connected[i], vertex: vIdx, p2: connected[j], angle: a });

                }

              }

              return angles;

            };



            // ── Collect all angles ──

            const allAngles = [];

            for (let vi = 0; vi < gpPoints.length; vi++) {

              findAnglesAtVertex(vi).forEach(a => allAngles.push(a));

            }



            // ── Detect theorems ──

            const theorems = [];

            // Triangle angle sum

            if (gpPoints.length >= 3 && gpSegments.length >= 3) {

              // Find 3-cycles (triangles)

              for (let i = 0; i < gpPoints.length; i++) {

                for (let j = i + 1; j < gpPoints.length; j++) {

                  for (let k = j + 1; k < gpPoints.length; k++) {

                    const hasIJ = gpSegments.some(s => (s.from === i && s.to === j) || (s.from === j && s.to === i));

                    const hasJK = gpSegments.some(s => (s.from === j && s.to === k) || (s.from === k && s.to === j));

                    const hasIK = gpSegments.some(s => (s.from === i && s.to === k) || (s.from === k && s.to === i));

                    if (hasIJ && hasJK && hasIK) {

                      const a1 = angleBetween(gpPoints[j], gpPoints[i], gpPoints[k]);

                      const a2 = angleBetween(gpPoints[i], gpPoints[j], gpPoints[k]);

                      const a3 = angleBetween(gpPoints[i], gpPoints[k], gpPoints[j]);

                      const sum = a1 + a2 + a3;

                      theorems.push({

                        type: 'triangle_sum',

                        label: '\u25B3 Triangle Angle Sum',

                        desc: '\u2220' + labelFor(i) + ' + \u2220' + labelFor(j) + ' + \u2220' + labelFor(k) + ' = ' + sum.toFixed(1) + '\u00B0',

                        valid: Math.abs(sum - 180) < 2,

                        icon: '\u25B3',

                        detail: a1.toFixed(1) + '\u00B0 + ' + a2.toFixed(1) + '\u00B0 + ' + a3.toFixed(1) + '\u00B0 = ' + sum.toFixed(1) + '\u00B0'

                      });

                      // Isosceles check

                      const d1 = dist(gpPoints[i], gpPoints[j]);

                      const d2 = dist(gpPoints[j], gpPoints[k]);

                      const d3 = dist(gpPoints[i], gpPoints[k]);

                      const tol = 5;

                      if (Math.abs(d1 - d2) < tol || Math.abs(d2 - d3) < tol || Math.abs(d1 - d3) < tol) {

                        let eqSides = '', eqAngles = '';

                        if (Math.abs(d1 - d2) < tol) { eqSides = labelFor(i)+labelFor(j) + ' \u2248 ' + labelFor(j)+labelFor(k); eqAngles = '\u2220' + labelFor(k) + ' \u2248 \u2220' + labelFor(i); }

                        else if (Math.abs(d2 - d3) < tol) { eqSides = labelFor(j)+labelFor(k) + ' \u2248 ' + labelFor(i)+labelFor(k); eqAngles = '\u2220' + labelFor(i) + ' \u2248 \u2220' + labelFor(j); }

                        else { eqSides = labelFor(i)+labelFor(j) + ' \u2248 ' + labelFor(i)+labelFor(k); eqAngles = '\u2220' + labelFor(j) + ' \u2248 \u2220' + labelFor(k); }

                        theorems.push({

                          type: 'isosceles',

                          label: '\u25B3 Isosceles Triangle',

                          desc: eqSides + ' \u2192 ' + eqAngles,

                          valid: true,

                          icon: '\u25B2',

                          detail: 'If two sides are equal, their opposite angles are equal.'

                        });

                      }

                    }

                  }

                }

              }

            }

            // Supplementary angles (two angles sharing vertex on a line summing to ~180)

            allAngles.forEach(a => {

              if (Math.abs(a.angle - 180) < 3) {

                theorems.push({

                  type: 'straight',

                  label: '\u2500 Straight Angle',

                  desc: '\u2220' + labelFor(a.p1) + labelFor(a.vertex) + labelFor(a.p2) + ' = ' + a.angle.toFixed(1) + '\u00B0',

                  valid: true,

                  icon: '\u2500',

                  detail: 'Points are collinear \u2014 angle = 180\u00B0'

                });

              }

            });

            // Vertical angles

            if (gpSegments.length >= 2) {

              for (let si = 0; si < gpSegments.length; si++) {

                for (let sj = si + 1; sj < gpSegments.length; sj++) {

                  const s1 = gpSegments[si], s2 = gpSegments[sj];

                  // Check if they share a vertex

                  let shared = -1;

                  if (s1.from === s2.from || s1.from === s2.to) shared = s1.from;

                  else if (s1.to === s2.from || s1.to === s2.to) shared = s1.to;

                  if (shared >= 0) {

                    const ends1 = s1.from === shared ? s1.to : s1.from;

                    const ends2 = s2.from === shared ? s2.to : s2.from;

                    const ang = angleBetween(gpPoints[ends1], gpPoints[shared], gpPoints[ends2]);

                    const suppAng = 180 - ang;

                    if (ang > 5 && ang < 175) {

                      theorems.push({

                        type: 'vertical',

                        label: '\u2716 Vertical Angles',

                        desc: '\u2220' + labelFor(ends1) + labelFor(shared) + labelFor(ends2) + ' = ' + ang.toFixed(1) + '\u00B0, supplement = ' + suppAng.toFixed(1) + '\u00B0',

                        valid: true,

                        icon: '\u2716',

                        detail: 'Vertical angles are congruent; adjacent angles are supplementary.'

                      });

                    }

                  }

                }

              }

            }



            // ── Mode presets ──

            const loadTriangle = () => {

              const pts = [

                { x: 150, y: 340 },

                { x: 350, y: 340 },

                { x: 250, y: 120 }

              ];

              const segs = [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 }];

              gpUpd('points', pts);

              gpUpd('segments', segs);

              gpUpd('mode', 'triangle');

              gpUpd('connecting', null);

              gpUpd('feedback', null);

              gpUpd('challenge', null);

            };



            const loadParallel = () => {

              // Two horizontal parallel lines with a transversal

              const pts = [

                { x: 80, y: 140 },   // A - top-left

                { x: 420, y: 140 },   // B - top-right

                { x: 80, y: 320 },    // C - bottom-left

                { x: 420, y: 320 },   // D - bottom-right

                { x: 190, y: 50 },    // E - transversal top

                { x: 310, y: 410 }    // F - transversal bottom

              ];

              const segs = [

                { from: 0, to: 1 }, // top parallel

                { from: 2, to: 3 }, // bottom parallel

                { from: 4, to: 5 }  // transversal

              ];

              gpUpd('points', pts);

              gpUpd('segments', segs);

              gpUpd('mode', 'parallel');

              gpUpd('connecting', null);

              gpUpd('feedback', null);

              gpUpd('challenge', null);

            };



            const loadBisector = () => {

              const pts = [

                { x: 250, y: 350 },  // vertex

                { x: 400, y: 200 },  // ray 1

                { x: 100, y: 200 },  // ray 2

                { x: 250, y: 120 }   // bisector point

              ];

              const segs = [

                { from: 0, to: 1 },

                { from: 0, to: 2 },

                { from: 0, to: 3 }

              ];

              gpUpd('points', pts);

              gpUpd('segments', segs);

              gpUpd('mode', 'bisector');

              gpUpd('connecting', null);

              gpUpd('feedback', null);

              gpUpd('challenge', null);

            };



            // ── Challenge system ──

            const generateChallenge = () => {

              const types = ['triangle_sum', 'vertical', 'missing_angle'];

              const type = types[Math.floor(Math.random() * types.length)];

              if (type === 'triangle_sum') {

                loadTriangle();

                gpUpd('challenge', { type: 'triangle_sum', question: 'What do the three angles of this triangle sum to?', answer: '180' });

              } else if (type === 'vertical') {

                const a1 = 30 + Math.floor(Math.random() * 120);

                gpUpd('points', [

                  { x: 250, y: 210 },

                  { x: 250 + 150 * Math.cos(a1 * Math.PI / 180), y: 210 - 150 * Math.sin(a1 * Math.PI / 180) },

                  { x: 250 - 150 * Math.cos(a1 * Math.PI / 180), y: 210 + 150 * Math.sin(a1 * Math.PI / 180) },

                  { x: 400, y: 210 },

                  { x: 100, y: 210 }

                ]);

                gpUpd('segments', [{ from: 1, to: 2 }, { from: 3, to: 4 }]);

                gpUpd('mode', 'freeform');

                gpUpd('challenge', { type: 'vertical', question: 'If one angle is ' + a1 + '\u00B0, what is the vertical angle?', answer: String(a1) });

              } else {

                const a1 = 30 + Math.floor(Math.random() * 50);

                const a2 = 40 + Math.floor(Math.random() * 60);

                const a3 = 180 - a1 - a2;

                loadTriangle();

                gpUpd('challenge', { type: 'missing_angle', question: 'If two angles are ' + a1 + '\u00B0 and ' + a2 + '\u00B0, what is the third?', answer: String(a3), a1: a1, a2: a2 });

              }

              gpUpd('feedback', null);

            };



            const checkChallenge = () => {

              if (!gpChallenge) return;

              const userAns = (gp.challengeAnswer || '').trim();

              const ok = userAns === gpChallenge.answer || Math.abs(parseFloat(userAns) - parseFloat(gpChallenge.answer)) < 1;

              gpUpd('feedback', {

                correct: ok,

                msg: ok ? '\u2705 Correct! ' + gpChallenge.answer + '\u00B0' : '\u274C The answer is ' + gpChallenge.answer + '\u00B0'

              });

              setExploreScore(prev => ({ correct: prev.correct + (ok ? 1 : 0), total: prev.total + 1 }));

              if (ok && typeof awardStemXP === 'function') awardStemXP('geometryProver', 5, gpChallenge.type + ' proof');

            };



            // ── Mouse handlers ──

            const handleCanvasMouseDown = (e) => {

              const rect = e.currentTarget.getBoundingClientRect();

              const mx = e.clientX - rect.left;

              const my = e.clientY - rect.top;



              // Check if clicking on an existing point

              for (let i = 0; i < gpPoints.length; i++) {

                if (dist({ x: mx, y: my }, gpPoints[i]) < 12) {

                  if (gpConnecting !== null && gpConnecting !== undefined && gpConnecting !== i) {

                    // Complete segment

                    const newSegs = [...gpSegments, { from: gpConnecting, to: i }];

                    gpUpd('segments', newSegs);

                    gpUpd('connecting', null);

                    return;

                  }

                  // Start drag

                  gpUpd('dragging', i);

                  return;

                }

              }

              // Place new point

              const newPt = { x: Math.round(mx / gridStep) * gridStep, y: Math.round(my / gridStep) * gridStep };

              const newPts = [...gpPoints, newPt];

              gpUpd('points', newPts);

              // If connecting, complete segment to new point

              if (gpConnecting !== null && gpConnecting !== undefined) {

                const newSegs = [...gpSegments, { from: gpConnecting, to: newPts.length - 1 }];

                gpUpd('segments', newSegs);

                gpUpd('connecting', null);

              }

            };



            const handleCanvasMouseMove = (e) => {

              if (gpDragging === null || gpDragging === undefined) return;

              const rect = e.currentTarget.getBoundingClientRect();

              const mx = Math.max(10, Math.min(W - 10, e.clientX - rect.left));

              const my = Math.max(10, Math.min(H - 10, e.clientY - rect.top));

              const updated = gpPoints.map((p, i) => i === gpDragging ? { x: mx, y: my } : p);

              gpUpd('points', updated);

            };



            const handleCanvasMouseUp = () => {

              if (gpDragging !== null && gpDragging !== undefined) {

                gpUpd('dragging', null);

              }

            };



            // ── Contextual helper text ──

            const helperText = gpPoints.length === 0

              ? '\uD83D\uDC46 Click on the canvas to place your first point'

              : gpConnecting !== null && gpConnecting !== undefined

                ? '\u2197\uFE0F Click a point or the canvas to complete the segment from ' + labelFor(gpConnecting)

                : gpDragging !== null && gpDragging !== undefined

                  ? '\u270B Dragging point ' + labelFor(gpDragging) + ' — release to drop'

                  : gpPoints.length === 1

                    ? 'Place another point, then use \"Draw Segment\" to connect them'

                    : gpSegments.length === 0

                      ? 'Click \"Draw Segment\" or \"Connect Last Two\" to link points'

                      : theorems.length > 0

                        ? '\uD83D\uDD0D ' + theorems.length + ' theorem' + (theorems.length > 1 ? 's' : '') + ' detected — drag points to explore!'

                        : 'Drag points to explore angles \u2022 Add more points and segments to discover theorems';



            // ── Render ──

            return React.createElement("div", { className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200" },

              // ── Header ──

              React.createElement("div", { className: "flex items-center gap-3 mb-2" },

                React.createElement("button", {

                  onClick: () => setStemLabTool(null),

                  className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors",

                  'aria-label': 'Back to tools'

                }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

                React.createElement("h3", { className: "text-lg font-bold text-violet-800" }, "\uD83D\uDCD0 Geometry Prover"),

                React.createElement("div", { className: "flex items-center gap-2 ml-2" },

                  React.createElement("div", { className: "text-xs font-bold text-emerald-600" }, exploreScore.correct, "/", exploreScore.total),

                  React.createElement("button", {

                    onClick: () => {

                      const snap = { id: 'snap-' + Date.now(), tool: 'geometryProver', label: 'Proof: ' + gpPoints.length + ' pts', data: { points: [...gpPoints], segments: [...gpSegments], theorems: theorems.map(t => t.label) }, timestamp: Date.now() };

                      setToolSnapshots(prev => [...prev, snap]);

                      addToast('\uD83D\uDCF8 Snapshot saved!', 'success');

                    },

                    className: "text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full px-2 py-0.5 transition-all"

                  }, "\uD83D\uDCF8 Snapshot")

                )

              ),



              // ── Contextual Helper Bar ──

              React.createElement("div", {

                className: "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",

                style: { background: 'linear-gradient(90deg, #f5f3ff 0%, #ede9fe 100%)', borderColor: '#c4b5fd' }

              },

                React.createElement("span", { className: "text-xs" }, '\uD83E\uDDED'),

                React.createElement("span", { className: "text-xs font-semibold text-violet-700 flex-1" }, helperText),

                React.createElement("span", {

                  className: "text-[10px] font-bold text-violet-500 bg-violet-100 px-2 py-0.5 rounded-full"

                }, gpMode.charAt(0).toUpperCase() + gpMode.slice(1) + ' mode')

              ),



              // ── Construction mode selector ──

              React.createElement("div", { className: "flex gap-1.5 flex-wrap" },

                [

                  { id: 'freeform', label: '\u270F\uFE0F Freeform', color: 'violet' },

                  { id: 'triangle', label: '\u25B3 Triangle', color: 'blue' },

                  { id: 'parallel', label: '\u2225 Parallel Lines', color: 'teal' },

                  { id: 'bisector', label: '\u2221 Bisector', color: 'amber' }

                ].map(m => React.createElement("button", {

                  key: m.id,

                  onClick: () => {

                    if (m.id === 'triangle') loadTriangle();

                    else if (m.id === 'parallel') loadParallel();

                    else if (m.id === 'bisector') loadBisector();

                    else { gpUpd('mode', 'freeform'); gpUpd('points', []); gpUpd('segments', []); gpUpd('connecting', null); gpUpd('feedback', null); gpUpd('challenge', null); }

                  },

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (gpMode === m.id ? 'bg-' + m.color + '-600 text-white shadow-md' : 'bg-' + m.color + '-50 text-' + m.color + '-700 hover:bg-' + m.color + '-100 border border-' + m.color + '-200')

                }, m.label))

              ),



              // ── SVG Canvas ──

              React.createElement("div", { className: "bg-white rounded-xl border-2 border-violet-200 p-2 flex justify-center" },

                React.createElement("svg", {

                  width: W, height: H,

                  className: "cursor-crosshair select-none",

                  style: { background: '#faf5ff' },

                  role: 'img',

                  'aria-label': 'Geometry construction canvas — click to place points and draw segments',

                  onMouseDown: handleCanvasMouseDown,

                  onMouseMove: handleCanvasMouseMove,

                  onMouseUp: handleCanvasMouseUp,

                  onMouseLeave: function () { handleCanvasMouseUp(); gpUpd('hoverIdx', -1); }

                },

                  React.createElement('title', null, 'Geometry Prover Canvas'),

                  // Grid

                  Array.from({ length: Math.floor(W / gridStep) + 1 }).map((_, i) =>

                    React.createElement('line', { key: 'gv' + i, x1: i * gridStep, y1: 0, x2: i * gridStep, y2: H, stroke: '#ede9fe', strokeWidth: 0.5 })

                  ),

                  Array.from({ length: Math.floor(H / gridStep) + 1 }).map((_, i) =>

                    React.createElement('line', { key: 'gh' + i, x1: 0, y1: i * gridStep, x2: W, y2: i * gridStep, stroke: '#ede9fe', strokeWidth: 0.5 })

                  ),



                  // Segments

                  gpSegments.map((seg, si) => {

                    const p1 = gpPoints[seg.from], p2 = gpPoints[seg.to];

                    if (!p1 || !p2) return null;

                    const d = dist(p1, p2);

                    const mid = midpoint(p1, p2);

                    return React.createElement(React.Fragment, { key: 'seg' + si },

                      React.createElement('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: '#6d28d9', strokeWidth: 2.5, strokeLinecap: 'round' }),

                      gpShowLabels && React.createElement('rect', { x: mid.x - 18, y: mid.y - 9, width: 36, height: 16, rx: 4, fill: '#f5f3ff', stroke: '#c4b5fd', strokeWidth: 0.5 }),

                      gpShowLabels && React.createElement('text', { x: mid.x, y: mid.y + 4, textAnchor: 'middle', style: { fontSize: '9px', fontWeight: 'bold', fill: '#6d28d9' } }, d.toFixed(0) + 'px')

                    );

                  }),



                  // Angle arcs

                  allAngles.filter(a => a.angle > 2 && a.angle < 178).map((a, ai) => {

                    const v = gpPoints[a.vertex];

                    const p1 = gpPoints[a.p1];

                    const p2 = gpPoints[a.p2];

                    if (!v || !p1 || !p2) return null;

                    const arcR = 28;

                    const a1 = Math.atan2(p1.y - v.y, p1.x - v.x);

                    const a2 = Math.atan2(p2.y - v.y, p2.x - v.x);

                    // Determine sweep direction

                    let startAngle = a1, endAngle = a2;

                    let diff = endAngle - startAngle;

                    if (diff < 0) diff += 2 * Math.PI;

                    if (diff > Math.PI) { startAngle = a2; endAngle = a1; diff = 2 * Math.PI - diff; }

                    const sx = v.x + arcR * Math.cos(startAngle);

                    const sy = v.y + arcR * Math.sin(startAngle);

                    const ex = v.x + arcR * Math.cos(endAngle);

                    const ey = v.y + arcR * Math.sin(endAngle);

                    const largeArc = diff > Math.PI ? 1 : 0;

                    const midAngle = startAngle + diff / 2;

                    const labelR = arcR + 14;

                    const lx = v.x + labelR * Math.cos(midAngle);

                    const ly = v.y + labelR * Math.sin(midAngle);

                    const isRight = Math.abs(a.angle - 90) < 2;

                    return React.createElement(React.Fragment, { key: 'arc' + ai },

                      isRight ? React.createElement('rect', {

                        x: v.x + 6 * Math.cos(midAngle) - 6, y: v.y + 6 * Math.sin(midAngle) - 6,

                        width: 12, height: 12, fill: 'none', stroke: '#7c3aed', strokeWidth: 1.5,

                        transform: 'rotate(' + (midAngle * 180 / Math.PI) + ' ' + (v.x + 6 * Math.cos(midAngle)) + ' ' + (v.y + 6 * Math.sin(midAngle)) + ')'

                      }) : React.createElement('path', {

                        d: 'M ' + sx + ' ' + sy + ' A ' + arcR + ' ' + arcR + ' 0 ' + largeArc + ' 1 ' + ex + ' ' + ey,

                        fill: 'hsla(270,80%,60%,0.12)', stroke: '#8b5cf6', strokeWidth: 1.5

                      }),

                      gpShowLabels && React.createElement('text', {

                        x: lx, y: ly + 3, textAnchor: 'middle',

                        style: { fontSize: '10px', fontWeight: 'bold', fill: isRight ? '#059669' : '#7c3aed' }

                      }, a.angle.toFixed(1) + '\u00B0')

                    );

                  }),



                  // Points (with hover highlighting)

                  gpPoints.map((p, i) => {

                    const isHover = gpHoverIdx === i;

                    const isDrag = gpDragging === i;

                    const isConn = gpConnecting === i;

                    const ptRadius = isDrag ? 10 : isHover ? 9 : 7;

                    const ptFill = isConn ? '#6366f1' : isDrag ? '#a78bfa' : isHover ? '#8b5cf6' : '#7c3aed';

                    return React.createElement(React.Fragment, { key: 'pt' + i },

                      // Hover glow ring

                      isHover && !isDrag && React.createElement('circle', {

                        cx: p.x, cy: p.y, r: 14,

                        fill: 'none', stroke: '#a78bfa', strokeWidth: 1.5, opacity: 0.5,

                        style: { transition: 'opacity 0.2s ease' }

                      }),

                      React.createElement('circle', {

                        cx: p.x, cy: p.y, r: ptRadius,

                        fill: ptFill,

                        stroke: '#fff', strokeWidth: 2.5,

                        className: 'cursor-grab',

                        style: { transition: 'r 0.15s ease, fill 0.15s ease' },

                        onMouseEnter: function () { gpUpd('hoverIdx', i); },

                        onMouseLeave: function () { gpUpd('hoverIdx', -1); }

                      }),

                      React.createElement('text', {

                        x: p.x + 12, y: p.y - 10,

                        style: { fontSize: isHover ? '14px' : '13px', fontWeight: 'bold', fill: '#4c1d95', transition: 'font-size 0.15s ease' }

                      }, labelFor(i))

                    );

                  }),



                  // Connecting helper line

                  gpConnecting !== null && gpConnecting !== undefined && gpPoints[gpConnecting] &&

                    React.createElement('line', {

                      x1: gpPoints[gpConnecting].x, y1: gpPoints[gpConnecting].y,

                      x2: gpPoints[gpConnecting].x + 1, y2: gpPoints[gpConnecting].y + 1,

                      stroke: '#a78bfa', strokeWidth: 1.5, strokeDasharray: '4,3', opacity: 0.6

                    }),



                  // Empty state instruction

                  gpPoints.length === 0 && React.createElement('text', {

                    x: W / 2, y: H / 2, textAnchor: 'middle',

                    style: { fontSize: '14px', fill: '#a78bfa', fontWeight: '600' }

                  }, 'Click to place points \u2022 Use "Draw Segment" to connect')

                )

              ),



              // ── Action buttons ──

              React.createElement("div", { className: "flex gap-2 flex-wrap" },

                React.createElement("button", {

                  onClick: () => {

                    if (gpPoints.length >= 2) {

                      const lastIdx = gpPoints.length - 1;

                      // Connect last two points if no segment exists

                      if (!gpSegments.some(s => (s.from === lastIdx - 1 && s.to === lastIdx) || (s.from === lastIdx && s.to === lastIdx - 1))) {

                        gpUpd('segments', [...gpSegments, { from: lastIdx - 1, to: lastIdx }]);

                      }

                    }

                  },

                  disabled: gpPoints.length < 2,

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-100 text-violet-700 hover:bg-violet-200 border border-violet-200 transition-all disabled:opacity-40"

                }, "\uD83D\uDD17 Connect Last Two"),

                React.createElement("button", {

                  onClick: () => {

                    if (gpConnecting !== null && gpConnecting !== undefined) {

                      gpUpd('connecting', null);

                    } else if (gpPoints.length > 0) {

                      gpUpd('connecting', gpPoints.length - 1);

                    }

                  },

                  disabled: gpPoints.length < 1,

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (gpConnecting !== null && gpConnecting !== undefined ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200') + " disabled:opacity-40"

                }, gpConnecting !== null && gpConnecting !== undefined ? "\u2714 Connecting from " + labelFor(gpConnecting) : "\u2197\uFE0F Draw Segment"),

                React.createElement("button", {

                  onClick: () => gpUpd('showLabels', !gpShowLabels),

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg transition-all " + (gpShowLabels ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200')

                }, gpShowLabels ? "\uD83D\uDCCF Labels ON" : "\uD83D\uDCCF Labels"),

                React.createElement("button", {

                  onClick: () => {

                    if (gpPoints.length > 0) {

                      const newPts = gpPoints.slice(0, -1);

                      const removed = gpPoints.length - 1;

                      const newSegs = gpSegments.filter(s => s.from !== removed && s.to !== removed);

                      gpUpd('points', newPts);

                      gpUpd('segments', newSegs);

                      gpUpd('connecting', null);

                    }

                  },

                  disabled: gpPoints.length < 1,

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all disabled:opacity-40"

                }, "\u232B Undo Point"),

                React.createElement("button", {

                  onClick: () => { gpUpd('points', []); gpUpd('segments', []); gpUpd('connecting', null); gpUpd('feedback', null); gpUpd('challenge', null); gpUpd('challengeAnswer', ''); },

                  className: "px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all"

                }, "\u21BA Clear All")

              ),



              // ── Theorem Detection Panel ──

              theorems.length > 0 && React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-3 border border-violet-200" },

                React.createElement("p", { className: "text-xs font-bold text-violet-700 uppercase mb-2" }, "\uD83D\uDD0D Detected Theorems"),

                React.createElement("div", { className: "space-y-2" },

                  theorems.map((th, ti) => React.createElement("div", {

                    key: ti,

                    className: "flex items-start gap-2 bg-white rounded-lg p-2.5 border " + (th.valid ? 'border-emerald-200' : 'border-amber-200')

                  },

                    React.createElement("span", { className: "text-lg" }, th.icon),

                    React.createElement("div", { className: "flex-1" },

                      React.createElement("p", { className: "text-xs font-bold " + (th.valid ? 'text-emerald-700' : 'text-amber-700') }, th.label),

                      React.createElement("p", { className: "text-[11px] text-slate-600 font-mono" }, th.desc),

                      React.createElement("p", { className: "text-[10px] text-slate-400 mt-0.5 italic" }, th.detail)

                    ),

                    React.createElement("span", { className: "text-xs font-bold " + (th.valid ? 'text-emerald-500' : 'text-amber-500') }, th.valid ? '\u2713 Verified' : '\u2248 Approx')

                  ))

                )

              ),



              // ── Live Measurements Stats ──

              gpPoints.length >= 2 && React.createElement("div", { className: "grid grid-cols-3 gap-3" },

                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-violet-100 text-center" },

                  React.createElement("div", { className: "text-xs font-bold text-violet-600 uppercase mb-1" }, "Points"),

                  React.createElement("div", { className: "text-2xl font-bold text-violet-800" }, gpPoints.length)

                ),

                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-violet-100 text-center" },

                  React.createElement("div", { className: "text-xs font-bold text-violet-600 uppercase mb-1" }, "Segments"),

                  React.createElement("div", { className: "text-2xl font-bold text-violet-800" }, gpSegments.length)

                ),

                React.createElement("div", { className: "bg-white rounded-xl p-3 border border-violet-100 text-center" },

                  React.createElement("div", { className: "text-xs font-bold text-violet-600 uppercase mb-1" }, "Theorems"),

                  React.createElement("div", { className: "text-2xl font-bold text-violet-800" }, theorems.length)

                )

              ),



              // ── Challenge Section ──

              React.createElement("div", { className: "flex gap-2" },

                React.createElement("button", {

                  onClick: generateChallenge,

                  className: "flex-1 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold rounded-lg text-sm hover:from-violet-600 hover:to-purple-600 transition-all shadow-md"

                }, "\uD83C\uDFAF Proof Challenge"),

                React.createElement("button", {

                  onClick: () => { gpUpd('challenge', null); gpUpd('feedback', null); gpUpd('challengeAnswer', ''); },

                  disabled: !gpChallenge,

                  className: "px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all disabled:opacity-40"

                }, "\u21BA Reset")

              ),



              // Challenge UI

              gpChallenge && React.createElement("div", { className: "bg-violet-50 rounded-lg p-3 border border-violet-200" },

                React.createElement("p", { className: "text-sm font-bold text-violet-800 mb-2" }, "\uD83C\uDFAF ", gpChallenge.question),

                React.createElement("div", { className: "flex gap-2 items-center" },

                  React.createElement("input", {

                    type: "text",

                    value: gp.challengeAnswer || '',

                    onChange: e => gpUpd('challengeAnswer', e.target.value),

                    onKeyDown: e => { if (e.key === 'Enter') checkChallenge(); },

                    placeholder: "Your answer (\u00B0)",

                    className: "flex-1 px-3 py-2 border-2 border-violet-300 rounded-lg text-sm font-bold text-center focus:border-violet-500 outline-none"

                  }),

                  React.createElement("button", {

                    onClick: checkChallenge,

                    className: "px-4 py-2 bg-violet-500 text-white font-bold rounded-lg text-sm hover:bg-violet-600 transition-all"

                  }, "\u2714 Check")

                ),

                gpFeedback && React.createElement("p", { className: 'text-sm font-bold mt-2 ' + (gpFeedback.correct ? 'text-green-600' : 'text-red-600') }, gpFeedback.msg)

              ),



              // ── Educational footer ──

              React.createElement("div", { className: "bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl p-3 border border-violet-200 text-center" },

                React.createElement("p", { className: "text-[10px] text-violet-600" }, "\uD83E\uDDED ", React.createElement("strong", null, "Euclidean Geometry"), " \u2014 drag points to explore how angles and lengths change. Watch the theorem panel to discover geometric relationships!"),

                React.createElement("p", { className: "text-[9px] text-slate-400 mt-1" }, "Place points \u2022 Draw segments \u2022 Drag to explore \u2022 Discover theorems")

              )

            );
      })();
    }
  });

  // ═══ 🔬 multtable (multtable) ═══
  window.StemLab.registerTool('multtable', {
    icon: '🔬',
    label: 'multtable',
    desc: '',
    color: 'slate',
    category: 'math',
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

      // ── Tool body (multtable) ──
      return (function() {
const maxNum = 12;

            // Speed Run timer state (stored in labToolData to avoid stale closures)

            var _mt = labToolData._multTimer || { active: false, endTime: 0, score: 0, total: 0, timeLeft: 120 };

            var _mtUpd = function (obj) { setLabToolData(function (prev) { return Object.assign({}, prev, { _multTimer: Object.assign({}, prev._multTimer || _mt, obj) }); }); };

            // Timer tick effect — runs via ref-based interval

            if (_mt.active && !labToolData._multTimerInterval) {

              var _ivl = setInterval(function () {

                setLabToolData(function (prev) {

                  var t = prev._multTimer || _mt;

                  if (!t.active) { clearInterval(_ivl); return Object.assign({}, prev, { _multTimerInterval: null }); }

                  var left = Math.max(0, Math.round((t.endTime - Date.now()) / 1000));

                  if (left <= 0) {

                    clearInterval(_ivl);

                    addToast('⏱️ Time\'s up! You got ' + t.score + '/' + t.total + ' correct!', 'info');

                    return Object.assign({}, prev, { _multTimer: Object.assign({}, t, { active: false, timeLeft: 0 }), _multTimerInterval: null });

                  }

                  return Object.assign({}, prev, { _multTimer: Object.assign({}, t, { timeLeft: left }) });

                });

              }, 500);

              labToolData._multTimerInterval = _ivl;

            }

            const checkMult = () => {

              if (!multTableChallenge) return;

              const correct = multTableChallenge.a * multTableChallenge.b;

              const ok = parseInt(multTableAnswer) === correct;

              announceToSR(ok ? 'Correct!' : 'Incorrect, try again');

              setMultTableFeedback(ok ? {

                correct: true,

                msg: '✅ Correct! ' + multTableChallenge.a + ' × ' + multTableChallenge.b + ' = ' + correct

              } : {

                correct: false,

                msg: '❌ Not quite. ' + multTableChallenge.a + ' × ' + multTableChallenge.b + ' = ' + correct

              });

              setExploreScore(prev => ({

                correct: prev.correct + (ok ? 1 : 0),

                total: prev.total + 1

              }));

              if (ok && typeof awardStemXP === 'function') awardStemXP('multtable', 5, 'multiplication');

              // Update Speed Run score if active

              if (_mt.active) {

                _mtUpd({ score: _mt.score + (ok ? 1 : 0), total: _mt.total + 1 });

              }

              // Auto-advance: generate next problem after 1.2s on correct answer

              if (ok) {

                setTimeout(function () {

                  var na = 2 + Math.floor(Math.random() * 11);

                  var nb = 2 + Math.floor(Math.random() * 11);

                  setMultTableChallenge({ a: na, b: nb });

                  setMultTableAnswer('');

                  setMultTableFeedback(null);

                }, 1200);

              }

            };

            return /*#__PURE__*/React.createElement("div", {

              className: "space-y-4 max-w-3xl mx-auto animate-in fade-in duration-200"

            }, /*#__PURE__*/React.createElement("div", {

              className: "flex items-center gap-3 mb-2"

            }, /*#__PURE__*/React.createElement("button", {

              onClick: () => { setStemLabTool(null); if (_mt.active) { _mtUpd({ active: false }); if (labToolData._multTimerInterval) clearInterval(labToolData._multTimerInterval); } },

              className: "p-1.5 hover:bg-slate-100 rounded-lg transition-colors",

              'aria-label': 'Back to tools'

            }, /*#__PURE__*/React.createElement(ArrowLeft, {

              size: 18,

              className: "text-slate-500"

            })), /*#__PURE__*/React.createElement("h3", {

              className: "text-lg font-bold text-pink-800"

            }, "\uD83D\uDD22 Multiplication Table"), /*#__PURE__*/React.createElement("div", {

              className: "flex items-center gap-2 ml-2"

            }, /*#__PURE__*/React.createElement("button", {

              onClick: () => {

                setMultTableHidden(!multTableHidden);

                setMultTableRevealed(new Set());

              },

              className: 'text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all ' + (multTableHidden ? 'bg-pink-500 text-white border-pink-500 shadow-sm' : 'text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200')

            }, multTableHidden ? '🙈 Hidden' : '👁 Visible'), /*#__PURE__*/React.createElement("div", {

              className: "text-xs font-bold text-emerald-600"

            }, exploreScore.correct, "/", exploreScore.total))),

              // Speed Run timer banner

              _mt.active && React.createElement("div", { className: "bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border-2 border-amber-300 flex items-center gap-3 animate-pulse" },

                React.createElement("span", { className: "text-2xl" }, "⏱️"),

                React.createElement("div", { className: "flex-1" },

                  React.createElement("div", { className: "flex items-center justify-between" },

                    React.createElement("span", { className: "text-sm font-bold text-amber-800" }, "Speed Run — " + Math.floor(_mt.timeLeft / 60) + ":" + String(_mt.timeLeft % 60).padStart(2, '0')),

                    React.createElement("span", { className: "text-xs font-bold text-emerald-600" }, "✅ " + _mt.score + "/" + _mt.total)

                  ),

                  React.createElement("div", { className: "w-full h-2 bg-amber-200 rounded-full mt-1 overflow-hidden" },

                    React.createElement("div", { className: "h-full rounded-full transition-all duration-500", style: { width: Math.round((_mt.timeLeft / 120) * 100) + '%', background: _mt.timeLeft > 30 ? 'linear-gradient(90deg, #f59e0b, #fb923c)' : 'linear-gradient(90deg, #ef4444, #f87171)' } })

                  )

                ),

                React.createElement("button", { onClick: function () { _mtUpd({ active: false }); if (labToolData._multTimerInterval) clearInterval(labToolData._multTimerInterval); addToast('⏱️ Speed Run ended! ' + _mt.score + '/' + _mt.total + ' correct', 'info'); }, className: "px-3 py-1.5 bg-red-500 text-white font-bold rounded-lg text-xs hover:bg-red-600 transition-all" }, "Stop")

              ),

              // Speed Run results banner (when just ended)

              !_mt.active && _mt.total > 0 && _mt.timeLeft === 0 && React.createElement("div", { className: "bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border-2 border-emerald-300 text-center" },

                React.createElement("p", { className: "text-lg font-bold text-emerald-800" }, "🏆 Speed Run Complete!"),

                React.createElement("p", { className: "text-2xl font-bold text-emerald-600 mt-1" }, _mt.score + " / " + _mt.total),

                React.createElement("p", { className: "text-xs text-emerald-500 mt-1" }, _mt.total > 0 ? Math.round((_mt.score / _mt.total) * 100) + "% accuracy" : ""),

                React.createElement("button", { onClick: function () { _mtUpd({ score: 0, total: 0, timeLeft: 120 }); }, className: "mt-2 px-4 py-1.5 bg-emerald-500 text-white font-bold rounded-lg text-xs hover:bg-emerald-600 transition-all" }, "🔄 Try Again")

              ),

            /*#__PURE__*/React.createElement("div", {

                className: "bg-white rounded-xl border-2 border-pink-200 p-3 overflow-x-auto"

              }, /*#__PURE__*/React.createElement("table", {

                className: "border-collapse w-full text-center"

              }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {

                className: "w-8 h-8 text-[10px] font-bold text-pink-400"

              }, "\u00D7"), Array.from({

                length: maxNum

              }).map((_, c) => /*#__PURE__*/React.createElement("th", {

                key: c,

                className: 'w-8 h-8 text-xs font-bold ' + (multTableHover && multTableHover.c === c + 1 ? 'text-pink-700 bg-pink-100' : 'text-pink-500')

              }, c + 1)))), /*#__PURE__*/React.createElement("tbody", null, Array.from({

                length: maxNum

              }).map((_, r) => /*#__PURE__*/React.createElement("tr", {

                key: r

              }, /*#__PURE__*/React.createElement("td", {

                className: 'w-8 h-8 text-xs font-bold ' + (multTableHover && multTableHover.r === r + 1 ? 'text-pink-700 bg-pink-100' : 'text-pink-500')

              }, r + 1), Array.from({

                length: maxNum

              }).map((_, c) => {

                const val = (r + 1) * (c + 1);

                const isHovered = multTableHover && (multTableHover.r === r + 1 || multTableHover.c === c + 1);

                const isExact = multTableHover && multTableHover.r === r + 1 && multTableHover.c === c + 1;

                const isPerfectSquare = r === c;

                return /*#__PURE__*/React.createElement("td", {

                  key: c,

                  onMouseEnter: () => setMultTableHover({

                    r: r + 1,

                    c: c + 1

                  }),

                  onMouseLeave: () => setMultTableHover(null),

                  onClick: () => {

                    setMultTableChallenge({

                      a: r + 1,

                      b: c + 1

                    });

                    setMultTableAnswer('');

                    setMultTableFeedback(null);

                  },

                  className: 'w-8 h-8 text-[11px] font-mono cursor-pointer transition-all border border-slate-100 ' + (isExact ? 'bg-pink-500 text-white font-bold scale-110 shadow-lg rounded' : isHovered ? 'bg-pink-50 text-pink-800 font-semibold' : isPerfectSquare ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50')

                }, multTableHidden && !isExact && !multTableRevealed.has(r + '-' + c) ? '?' : val);

              })))))), /*#__PURE__*/React.createElement("div", {

                className: "flex gap-2 flex-wrap"

              }, /*#__PURE__*/React.createElement("button", {

                onClick: () => {

                  const a = 2 + Math.floor(Math.random() * 11);

                  const b = 2 + Math.floor(Math.random() * 11);

                  setMultTableChallenge({

                    a,

                    b

                  });

                  setMultTableAnswer('');

                  setMultTableFeedback(null);

                },

                className: "flex-1 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-lg text-sm hover:from-pink-600 hover:to-rose-600 transition-all shadow-md"

              }, "\uD83C\uDFAF Quick Quiz"),

                // Speed Run button

                React.createElement("button", {

                  onClick: function () {

                    var na = 2 + Math.floor(Math.random() * 11);

                    var nb = 2 + Math.floor(Math.random() * 11);

                    setMultTableChallenge({ a: na, b: nb });

                    setMultTableAnswer('');

                    setMultTableFeedback(null);

                    _mtUpd({ active: true, endTime: Date.now() + 120000, score: 0, total: 0, timeLeft: 120 });

                    // Force a new interval by removing the old one

                    if (labToolData._multTimerInterval) clearInterval(labToolData._multTimerInterval);

                    labToolData._multTimerInterval = null;

                    addToast('⏱️ Speed Run started! 2 minutes on the clock!', 'success');

                  },

                  className: "flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-lg text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-md"

                }, "⏱️ Speed Run (2min)"),

            /*#__PURE__*/React.createElement("button", {

                  onClick: () => {

                    setMultTableChallenge(null);

                    setMultTableAnswer('');

                    setMultTableFeedback(null);

                    setMultTableHover(null);

                    setMultTableRevealed(new Set());

                    if (_mt.active) { _mtUpd({ active: false }); if (labToolData._multTimerInterval) clearInterval(labToolData._multTimerInterval); }

                  },

                  className: "px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-300 transition-all"

                }, "\u21BA Reset")), multTableChallenge && /*#__PURE__*/React.createElement("div", {

                  className: "bg-pink-50 rounded-lg p-3 border border-pink-200"

                }, /*#__PURE__*/React.createElement("p", {

                  className: "text-lg font-bold text-pink-800 mb-2 text-center"

                }, multTableChallenge.a, " \u00D7 ", multTableChallenge.b, " = ?"), /*#__PURE__*/React.createElement("div", {

                  className: "flex gap-2 items-center justify-center"

                }, /*#__PURE__*/React.createElement("input", {

                  type: "number",

                  value: multTableAnswer,

                  onChange: e => setMultTableAnswer(e.target.value),

                  onKeyDown: e => {

                    if (e.key === 'Enter') checkMult();

                  },

                  className: "w-20 px-3 py-2 text-center text-lg font-bold border-2 border-pink-300 rounded-lg focus:border-pink-500 outline-none",

                  placeholder: "?",

                  autoFocus: true

                }), /*#__PURE__*/React.createElement("button", {

                  onClick: checkMult,

                  disabled: !multTableAnswer,

                  className: "px-4 py-2 bg-pink-500 text-white font-bold rounded-lg hover:bg-pink-600 transition-all disabled:opacity-40"

                }, "\u2714 Check")), multTableFeedback && /*#__PURE__*/React.createElement("p", {

                  className: 'text-sm font-bold mt-2 text-center ' + (multTableFeedback.correct ? 'text-green-600' : 'text-red-600')

                }, multTableFeedback.msg)), /*#__PURE__*/React.createElement("div", {

                  className: "text-[10px] text-slate-400 text-center"

                }, /*#__PURE__*/React.createElement("span", {

                  className: "inline-block w-3 h-3 bg-indigo-50 border border-indigo-200 rounded mr-1"

                }), " Perfect squares", /*#__PURE__*/React.createElement("span", {

                  className: "ml-3 inline-block w-3 h-3 bg-pink-50 border border-pink-200 rounded mr-1"

                }), " Hover cross", /*#__PURE__*/React.createElement("span", {

                  className: "ml-3 inline-block w-3 h-3 bg-pink-500 rounded mr-1"

                }), " Selected"));
      })();
    }
  });

  // ═══ 🔬 calculus (calculus) ═══
  window.StemLab.registerTool('calculus', {
    icon: '🔬',
    label: 'calculus',
    desc: '',
    color: 'slate',
    category: 'math',
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

      // ── Tool body (calculus) ──
      return (function() {
const d = labToolData.calculus;

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, calculus: { ...prev.calculus, [key]: val } }));

          const W = 440, H = 300, pad = 40;

          const evalF = x => d.a * x * x + d.b * x + d.c;

          const xR = { min: -2, max: Math.max(d.xMax + 1, 6) };

          const yMax = Math.max(...Array.from({ length: 50 }, (_, i) => Math.abs(evalF(xR.min + i / 49 * (xR.max - xR.min)))), 1);

          const yR = { min: -yMax * 0.2, max: yMax * 1.2 };

          const toSX = x => pad + ((x - xR.min) / (xR.max - xR.min)) * (W - 2 * pad);

          const toSY = y => (H - pad) - ((y - yR.min) / (yR.max - yR.min)) * (H - 2 * pad);

          const mode = d.mode || 'left';

          const dx = (d.xMax - d.xMin) / d.n;



          // Build approximation shapes

          var rects = [];

          var area = 0;

          if (mode === 'trapezoid') {

            for (var ti = 0; ti < d.n; ti++) {

              var txi = d.xMin + ti * dx;

              var tyL = evalF(txi), tyR2 = evalF(txi + dx);

              area += (tyL + tyR2) / 2 * dx;

              rects.push({ x: txi, w: dx, hL: tyL, hR: tyR2, type: 'trap' });

            }

          } else if (mode === 'simpson' && d.n >= 2 && d.n % 2 === 0) {

            var sdx = (d.xMax - d.xMin) / d.n;

            for (var si = 0; si < d.n; si += 2) {

              var sx0 = d.xMin + si * sdx;

              var sy0 = evalF(sx0), sy1 = evalF(sx0 + sdx), sy2 = evalF(sx0 + 2 * sdx);

              area += (sy0 + 4 * sy1 + sy2) * sdx / 3;

              rects.push({ x: sx0, w: sdx * 2, hL: sy0, hM: sy1, hR: sy2, type: 'simp' });

            }

          } else {

            for (var ri = 0; ri < d.n; ri++) {

              var xi = d.xMin + ri * dx;

              var yi = mode === 'left' ? evalF(xi) : mode === 'right' ? evalF(xi + dx) : evalF(xi + dx / 2);

              area += yi * dx;

              rects.push({ x: xi, w: dx, h: yi, type: 'rect' });

            }

          }



          // Curve polyline

          var curvePts = [];

          for (var cpx = 0; cpx <= W - 2 * pad; cpx += 2) {

            var cx = xR.min + (cpx / (W - 2 * pad)) * (xR.max - xR.min);

            curvePts.push(toSX(cx) + ',' + toSY(evalF(cx)));

          }



          // Exact integral

          var exact = (d.a / 3) * (Math.pow(d.xMax, 3) - Math.pow(d.xMin, 3)) + (d.b / 2) * (Math.pow(d.xMax, 2) - Math.pow(d.xMin, 2)) + d.c * (d.xMax - d.xMin);

          var err = Math.abs(area - exact);



          // Convergence data (error vs n for mini chart) — memoized

          var CW = 160, Cpad = 15;

          var _convCacheKey = [d.a, d.b, d.c, d.xMin, d.xMax, mode].join(',');

          if (!window._calcConvCache || window._calcConvCache.key !== _convCacheKey) {

            var _cd = [];

            for (var cn = 2; cn <= 50; cn += 2) {

              var cdx2 = (d.xMax - d.xMin) / cn;

              var carea = 0;

              if (mode === 'trapezoid') {

                for (var cti = 0; cti < cn; cti++) { var cxti = d.xMin + cti * cdx2; carea += (evalF(cxti) + evalF(cxti + cdx2)) / 2 * cdx2; }

              } else if (mode === 'simpson' && cn % 2 === 0) {

                for (var csi = 0; csi < cn; csi += 2) { var csx0 = d.xMin + csi * cdx2; carea += (evalF(csx0) + 4 * evalF(csx0 + cdx2) + evalF(csx0 + 2 * cdx2)) * cdx2 / 3; }

              } else {

                for (var cri = 0; cri < cn; cri++) { var cxi = d.xMin + cri * cdx2; carea += evalF(mode === 'left' ? cxi : mode === 'right' ? cxi + cdx2 : cxi + cdx2 / 2) * cdx2; }

              }

              _cd.push({ n: cn, err: Math.abs(carea - exact) });

            }

            window._calcConvCache = { key: _convCacheKey, data: _cd };

          }

          var convData = window._calcConvCache.data;

          var convMaxErr = Math.max(...convData.map(c => c.err), 0.001);

          var convToX = function (n) { return Cpad + ((n - 2) / 48) * (CW - 2 * Cpad); };

          var convToY = function (e) { return 55 - (e / convMaxErr) * 40; };



          // Mode options

          var MODES = [

            { id: 'left', label: t('stem.calculus.left') },

            { id: 'midpoint', label: t('stem.calculus.midpoint') },

            { id: 'right', label: t('stem.calculus.right') },

            { id: 'trapezoid', label: t('stem.calculus.trapezoid') },

            { id: 'simpson', label: "Simpson's" }

          ];



          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200", style: { position: 'relative' } },

            null, // tutorial overlay removed (hub-scope dependency)

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\u222B Calculus Visualizer"),

              React.createElement("span", { className: "px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full" }, "INTERACTIVE")

            ),

            // Mode buttons

            React.createElement("div", { className: "flex gap-1 mb-3" },

              MODES.map(function (m) {

                return React.createElement("button", { key: m.id, onClick: function () { upd("mode", m.id); if (m.id === 'simpson' && d.n % 2 !== 0) upd('n', d.n + 1); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (mode === m.id ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-red-50') }, m.label);

              })

            ),

            // SVG Graph

            React.createElement("svg", { viewBox: "0 0 " + W + " " + H, className: "w-full bg-white rounded-xl border-2 border-red-200 shadow-sm", style: { maxHeight: "320px" } },

              // Grid

              (function () {

                var gels = [];

                for (var gx = Math.ceil(xR.min); gx <= xR.max; gx++) {

                  var gsx = toSX(gx);

                  if (gsx > pad && gsx < W - pad) {

                    gels.push(React.createElement("line", { key: 'gx' + gx, x1: gsx, y1: pad, x2: gsx, y2: H - pad, stroke: "#f1f5f9", strokeWidth: 0.5 }));

                  }

                }

                return gels;

              })(),

              // Axes

              React.createElement("line", { x1: pad, y1: toSY(0), x2: W - pad, y2: toSY(0), stroke: "#94a3b8", strokeWidth: 1.5 }),

              React.createElement("line", { x1: toSX(0), y1: pad, x2: toSX(0), y2: H - pad, stroke: "#94a3b8", strokeWidth: 1.5 }),

              // Integration bounds

              React.createElement("rect", { x: toSX(d.xMin), y: pad, width: Math.abs(toSX(d.xMax) - toSX(d.xMin)), height: H - 2 * pad, fill: "none", stroke: "#ef4444", strokeWidth: 1, strokeDasharray: "4 2" }),

              // Approximation shapes

              rects.map(function (r, i) {

                if (r.type === 'trap') {

                  var pts = toSX(r.x) + ',' + toSY(0) + ' ' + toSX(r.x) + ',' + toSY(r.hL) + ' ' + toSX(r.x + r.w) + ',' + toSY(r.hR) + ' ' + toSX(r.x + r.w) + ',' + toSY(0);

                  return React.createElement("polygon", { key: i, points: pts, fill: "rgba(239,68,68,0.15)", stroke: "#ef4444", strokeWidth: 0.8 });

                }

                if (r.type === 'simp') {

                  // Approximate with quadratic through 3 points as polygon segments

                  var simpPts = [toSX(r.x) + ',' + toSY(0)];

                  for (var sp = 0; sp <= 10; sp++) {

                    var st = sp / 10;

                    var spx = r.x + st * r.w;

                    var spy = r.hL * (1 - st) * (1 - 2 * st) + 4 * r.hM * st * (1 - st) + r.hR * st * (2 * st - 1);

                    simpPts.push(toSX(spx) + ',' + toSY(spy));

                  }

                  simpPts.push(toSX(r.x + r.w) + ',' + toSY(0));

                  return React.createElement("polygon", { key: i, points: simpPts.join(' '), fill: "rgba(168,85,247,0.15)", stroke: "#a855f7", strokeWidth: 0.8 });

                }

                return React.createElement("rect", { key: i, x: toSX(r.x), y: r.h >= 0 ? toSY(r.h) : toSY(0), width: Math.abs(toSX(r.x + r.w) - toSX(r.x)), height: Math.abs(toSY(r.h) - toSY(0)), fill: "rgba(239,68,68,0.15)", stroke: "#ef4444", strokeWidth: 0.8 });

              }),

              // Curve

              curvePts.length > 1 && React.createElement("polyline", { points: curvePts.join(" "), fill: "none", stroke: "#1e293b", strokeWidth: 2.5 }),

              // Equation label

              React.createElement("text", { x: W / 2, y: H - 8, textAnchor: "middle", fill: "#64748b", style: { fontSize: '9px', fontWeight: 'bold' } }, "f(x) = " + d.a + "x\u00B2 + " + d.b + "x + " + d.c + "  |  \u222B \u2248 " + area.toFixed(4) + "  (n=" + d.n + ", " + mode + ")")

            ),

            // Controls

            React.createElement("div", { className: "grid grid-cols-2 gap-3 mt-3" },

              [{ k: 'xMin', label: 'a (lower)', min: -2, max: 8, step: 0.5 }, { k: 'xMax', label: 'b (upper)', min: 1, max: 10, step: 0.5 }, { k: 'n', label: t('stem.calculus.rectangles_n'), min: 2, max: 50, step: mode === 'simpson' ? 2 : 1 }, { k: 'a', label: t('stem.calculus.coeff_a'), min: -3, max: 3, step: 0.1 }].map(function (s) {

                return React.createElement("div", { key: s.k, className: "text-center bg-slate-50 rounded-lg p-2 border" },

                  React.createElement("label", { className: "text-xs font-bold text-red-600" }, s.label + ": " + d[s.k]),

                  React.createElement("input", { type: "range", min: s.min, max: s.max, step: s.step, value: d[s.k], onChange: function (e) { upd(s.k, parseFloat(e.target.value)); }, className: "w-full accent-red-600" })

                );

              })

            ),

            // Analysis + Convergence side by side

            React.createElement("div", { className: "mt-3 grid grid-cols-5 gap-3" },

              // Analysis (3 cols)

              React.createElement("div", { className: "col-span-3 bg-red-50 rounded-xl border border-red-200 p-3" },

                React.createElement("p", { className: "text-[10px] font-bold text-red-700 uppercase tracking-wider mb-2" }, "\uD83D\uDCCA Analysis"),

                React.createElement("div", { className: "grid grid-cols-3 gap-2 text-center" },

                  React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                    React.createElement("p", { className: "text-[9px] font-bold text-red-500" }, mode === 'trapezoid' ? 'Trapezoidal' : mode === 'simpson' ? "Simpson's" : "Riemann (" + mode + ")"),

                    React.createElement("p", { className: "text-sm font-bold text-red-800" }, area.toFixed(4))

                  ),

                  React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                    React.createElement("p", { className: "text-[9px] font-bold text-red-500" }, "Exact (\u222B)"),

                    React.createElement("p", { className: "text-sm font-bold text-red-800" }, exact.toFixed(4))

                  ),

                  React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                    React.createElement("p", { className: "text-[9px] font-bold text-red-500" }, "Error"),

                    React.createElement("p", { className: "text-sm font-bold " + (err < 0.01 ? 'text-emerald-600' : err < 0.1 ? 'text-yellow-600' : 'text-red-600') }, err.toFixed(6))

                  )

                ),

                React.createElement("p", { className: "mt-2 text-xs text-red-500 italic" },

                  mode === 'simpson' ? '\uD83D\uDCA1 Simpson\'s rule uses parabolic arcs \u2014 incredibly accurate for polynomials!'

                    : mode === 'trapezoid' ? '\uD83D\uDCA1 Trapezoidal rule uses linear segments. Error \u221D 1/n\u00B2 \u2014 better than rectangles!'

                      : d.n <= 5 ? '\uD83D\uDCA1 Very few rectangles! The approximation is rough. Try increasing n.'

                        : d.n <= 15 ? '\uD83D\uDCA1 Getting closer! More rectangles = better approximation.'

                          : '\uD83D\uDCA1 At n=' + d.n + ', the sum closely matches the integral. The limit as n\u2192\u221E gives the true area.'

                )

              ),

              // Convergence mini-chart (2 cols)

              React.createElement("div", { className: "col-span-2 bg-slate-50 rounded-xl border p-2" },

                React.createElement("p", { className: "text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1" }, "\uD83D\uDCC9 Error vs n"),

                React.createElement("svg", { viewBox: "0 0 " + CW + " 60", className: "w-full" },

                  React.createElement("line", { x1: Cpad, y1: 55, x2: CW - Cpad, y2: 55, stroke: "#e2e8f0", strokeWidth: 0.5 }),

                  React.createElement("polyline", {

                    points: convData.map(function (cd) { return convToX(cd.n) + ',' + convToY(cd.err); }).join(' '),

                    fill: "none", stroke: "#ef4444", strokeWidth: 1.5

                  }),

                  // Current n marker

                  React.createElement("circle", { cx: convToX(d.n), cy: convToY(err), r: 3, fill: "#ef4444", stroke: "white", strokeWidth: 1 }),

                  React.createElement("text", { x: Cpad, y: 8, fill: "#94a3b8", style: { fontSize: '6px' } }, convMaxErr.toFixed(2)),

                  React.createElement("text", { x: CW - Cpad, y: 8, fill: "#94a3b8", style: { fontSize: '6px', textAnchor: 'end' } }, "n=" + d.n),

                  React.createElement("text", { x: CW / 2, y: 8, textAnchor: "middle", fill: "#94a3b8", style: { fontSize: '6px' } }, "error \u2192 0")

                )

              )

            ),

            // Presets

            React.createElement("div", { className: "mt-3 flex flex-wrap gap-1.5" },

              React.createElement("span", { className: "text-[10px] font-bold text-slate-400 self-center" }, "Presets:"),

              [

                { label: '\u222B x\u00B2 [0,1]', a: 1, b: 0, c: 0, xMin: 0, xMax: 1, n: 20, tip: 'Exact: 1/3 \u2248 0.333' },

                { label: '\u222B x\u00B2 [0,3]', a: 1, b: 0, c: 0, xMin: 0, xMax: 3, n: 20, tip: 'Exact: 9' },

                { label: '\u222B (x\u00B2+2x+1) [0,2]', a: 1, b: 2, c: 1, xMin: 0, xMax: 2, n: 20, tip: 'Try increasing n to see convergence!' },

                { label: '\u222B 2x [0,5]', a: 0, b: 2, c: 0, xMin: 0, xMax: 5, n: 10, tip: 'Linear \u2014 exact even with few rects' },

                { label: '\u222B -x\u00B2+4 [0,2]', a: -1, b: 0, c: 4, xMin: 0, xMax: 2, n: 25, tip: 'Downward parabola \u2014 find the area under the arch' },

                { label: '\u222B 3 [1,4] (constant)', a: 0, b: 0, c: 3, xMin: 1, xMax: 4, n: 5, tip: 'Constant function: area = 3\u00D73 = 9' },

              ].map(function (p) {

                return React.createElement("button", {

                  key: p.label, onClick: function () {

                    upd('a', p.a); upd('b', p.b); upd('c', p.c); upd('xMin', p.xMin); upd('xMax', p.xMax); upd('n', p.n);

                    addToast(p.tip, 'success');

                  }, className: "px-2 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all"

                }, p.label);

              })

            ),

            // ══════════════════════════════════════════════════

            // ── Calculus Challenge Engine (4 modes + XP) ──

            // ══════════════════════════════════════════════════

            (() => {

              var cq = d.calcQuiz || null;

              var cScore = d.calcScore || 0;

              var cStreak = d.calcStreak || 0;

              var cMode = d.calcChallengeMode || 'estimate';

              var cHint = d.calcHint || '';



              var CALC_CHALLENGES = [

                { id: 'estimate', label: '\uD83C\uDFAF Estimate \u222B', color: 'red' },

                { id: 'method',  label: '\u26A1 Best Method', color: 'amber' },

                { id: 'minN',    label: '\uD83D\uDD22 Min n', color: 'blue' },

                { id: 'exact',   label: '\u270F\uFE0F Exact \u222B', color: 'emerald' }

              ];



              // ── Generator: Estimate the Integral ──

              function makeEstimateQuiz() {

                var qa = [1, -1, 2, -2, 0][Math.floor(Math.random() * 5)];

                var qb = [0, 1, 2, -1, -2, 3][Math.floor(Math.random() * 6)];

                var qc = [0, 1, 2, 3, -1][Math.floor(Math.random() * 5)];

                var qxMin = 0;

                var qxMax = [1, 2, 3][Math.floor(Math.random() * 3)];

                var qExact = (qa / 3) * (Math.pow(qxMax, 3) - Math.pow(qxMin, 3)) + (qb / 2) * (Math.pow(qxMax, 2) - Math.pow(qxMin, 2)) + qc * (qxMax - qxMin);

                qExact = Math.round(qExact * 100) / 100;

                var opts = [qExact];

                while (opts.length < 4) {

                  var off = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? 1 : -1);

                  var wrong = Math.round((qExact + off) * 100) / 100;

                  if (opts.indexOf(wrong) < 0 && wrong !== qExact) opts.push(wrong);

                }

                opts.sort(function (a, b) { return a - b; });

                var eqStr = (qa !== 0 ? qa + 'x\u00B2' : '') + (qb !== 0 ? (qb > 0 && qa !== 0 ? '+' : '') + qb + 'x' : '') + (qc !== 0 ? (qc > 0 && (qa !== 0 || qb !== 0) ? '+' : '') + qc : '');

                if (!eqStr) eqStr = '0';

                return { mode: 'estimate', a: qa, b: qb, c: qc, xMin: qxMin, xMax: qxMax, answer: qExact, opts: opts, answered: false, question: '\u222B\u2080' + '\u207B'.repeat(0) + qxMax + ' (' + eqStr + ') dx = ?' };

              }



              // ── Generator: Which Method Is Best? ──

              function makeMethodQuiz() {

                var qa = [1, -1, 2][Math.floor(Math.random() * 3)];

                var qb = [0, 1, -1][Math.floor(Math.random() * 3)];

                var qc = [0, 1, 2][Math.floor(Math.random() * 3)];

                var qxMin = 0, qxMax = [2, 3][Math.floor(Math.random() * 2)];

                var qn = [4, 6, 8][Math.floor(Math.random() * 3)];

                var qExact = (qa / 3) * (Math.pow(qxMax, 3) - Math.pow(qxMin, 3)) + (qb / 2) * (Math.pow(qxMax, 2) - Math.pow(qxMin, 2)) + qc * (qxMax - qxMin);

                var methods = ['left', 'right', 'midpoint', 'trapezoid', 'simpson'];

                var errors = {};

                methods.forEach(function (m) {

                  var qdx = (qxMax - qxMin) / qn;

                  var qarea = 0;

                  if (m === 'trapezoid') {

                    for (var i = 0; i < qn; i++) { var xi = qxMin + i * qdx; qarea += (qa * xi * xi + qb * xi + qc + qa * (xi + qdx) * (xi + qdx) + qb * (xi + qdx) + qc) / 2 * qdx; }

                  } else if (m === 'simpson' && qn % 2 === 0) {

                    for (var i = 0; i < qn; i += 2) { var xi = qxMin + i * qdx; var f0 = qa * xi * xi + qb * xi + qc; var f1 = qa * (xi + qdx) * (xi + qdx) + qb * (xi + qdx) + qc; var f2 = qa * (xi + 2 * qdx) * (xi + 2 * qdx) + qb * (xi + 2 * qdx) + qc; qarea += (f0 + 4 * f1 + f2) * qdx / 3; }

                  } else {

                    for (var i = 0; i < qn; i++) { var xi = qxMin + i * qdx; var xSample = m === 'left' ? xi : m === 'right' ? xi + qdx : xi + qdx / 2; qarea += (qa * xSample * xSample + qb * xSample + qc) * qdx; }

                  }

                  errors[m] = Math.abs(qarea - qExact);

                });

                var best = methods.reduce(function (a, b) { return errors[a] < errors[b] ? a : b; });

                var labels = { left: 'Left Riemann', right: 'Right Riemann', midpoint: 'Midpoint', trapezoid: 'Trapezoidal', simpson: "Simpson's" };

                return { mode: 'method', a: qa, b: qb, c: qc, xMin: qxMin, xMax: qxMax, n: qn, answer: best, answerLabel: labels[best], opts: methods.map(function (m) { return { id: m, label: labels[m] }; }), errors: errors, answered: false, question: 'At n=' + qn + ', which method gives the smallest error?' };

              }



              // ── Generator: Minimum n ──

              function makeMinNQuiz() {

                var qa = [1, -1, 2][Math.floor(Math.random() * 3)];

                var qb = [0, 1, 2][Math.floor(Math.random() * 3)];

                var qc = [0, 1][Math.floor(Math.random() * 2)];

                var qxMin = 0, qxMax = [2, 3][Math.floor(Math.random() * 2)];

                var threshold = [0.5, 0.1, 0.05][Math.floor(Math.random() * 3)];

                var qExact = (qa / 3) * (Math.pow(qxMax, 3) - Math.pow(qxMin, 3)) + (qb / 2) * (Math.pow(qxMax, 2) - Math.pow(qxMin, 2)) + qc * (qxMax - qxMin);

                // Find the actual minimum n for left Riemann

                var minN = 2;

                for (var tn = 2; tn <= 100; tn++) {

                  var tdx = (qxMax - qxMin) / tn; var tarea = 0;

                  for (var ti = 0; ti < tn; ti++) { var txi = qxMin + ti * tdx; tarea += (qa * txi * txi + qb * txi + qc) * tdx; }

                  if (Math.abs(tarea - qExact) < threshold) { minN = tn; break; }

                }

                if (minN > 50) { minN = 50; threshold = 0.5; } // safety cap

                var opts = [minN];

                var candidates = [minN - 4, minN - 2, minN + 2, minN + 4, minN + 6, minN * 2].filter(function (v) { return v >= 2 && v <= 100 && v !== minN; });

                while (opts.length < 4 && candidates.length > 0) { var ci = Math.floor(Math.random() * candidates.length); opts.push(candidates.splice(ci, 1)[0]); }

                opts.sort(function (a, b) { return a - b; });

                return { mode: 'minN', a: qa, b: qb, c: qc, xMin: qxMin, xMax: qxMax, answer: minN, threshold: threshold, opts: opts, answered: false, question: 'Using Left Riemann sums, what is the smallest n where error < ' + threshold + '?' };

              }



              // ── Generator: Exact Integral (free-form typed) ──

              function makeExactQuiz() {

                var qa = [0, 1, -1, 2][Math.floor(Math.random() * 4)];

                var qb = [0, 1, 2, 3, -1][Math.floor(Math.random() * 5)];

                var qc = [0, 1, 2, -1][Math.floor(Math.random() * 4)];

                var qxMin = 0;

                var qxMax = [1, 2, 3][Math.floor(Math.random() * 3)];

                var qExact = (qa / 3) * (Math.pow(qxMax, 3) - Math.pow(qxMin, 3)) + (qb / 2) * (Math.pow(qxMax, 2) - Math.pow(qxMin, 2)) + qc * (qxMax - qxMin);

                qExact = Math.round(qExact * 1000) / 1000;

                var eqStr = (qa !== 0 ? qa + 'x\u00B2' : '') + (qb !== 0 ? (qb > 0 && qa !== 0 ? '+' : '') + qb + 'x' : '') + (qc !== 0 ? (qc > 0 && (qa !== 0 || qb !== 0) ? '+' : '') + qc : '');

                if (!eqStr) eqStr = '0';

                var hintParts = [];

                if (qa !== 0) hintParts.push(qa + 'x\u00B3/3');

                if (qb !== 0) hintParts.push(qb + 'x\u00B2/2');

                if (qc !== 0) hintParts.push(qc + 'x');

                var antiDerivStr = hintParts.join(' + ') || '0';

                return { mode: 'exact', a: qa, b: qb, c: qc, xMin: qxMin, xMax: qxMax, answer: qExact, answered: false, question: 'Using the power rule, compute \u222B\u2080' + qxMax + ' (' + eqStr + ') dx exactly.', hint: 'Anti-derivative: F(x) = ' + antiDerivStr + '. Evaluate F(' + qxMax + ') \u2212 F(' + qxMin + ').' };

              }



              function startCalcChallenge() {

                var q;

                if (cMode === 'method') q = makeMethodQuiz();

                else if (cMode === 'minN') q = makeMinNQuiz();

                else if (cMode === 'exact') q = makeExactQuiz();

                else q = makeEstimateQuiz();

                upd('calcQuiz', q); upd('calcHint', '');

                // Load the function into the visualizer so students can see it

                upd('a', q.a); upd('b', q.b); upd('c', q.c);

                if (q.xMin !== undefined) upd('xMin', q.xMin);

                if (q.xMax !== undefined) upd('xMax', q.xMax);

                if (q.n !== undefined) upd('n', q.n);

              }



              function checkCalcAnswer(chosen) {

                var correct = false;

                if (cMode === 'method') { correct = chosen === cq.answer; }

                else if (cMode === 'minN') { correct = chosen <= cq.answer + 2 && chosen >= cq.answer; } // accept close

                else if (cMode === 'exact') { correct = Math.abs(parseFloat(chosen) - cq.answer) < 0.05; }

                else { correct = chosen === cq.answer; }

                upd('calcQuiz', Object.assign({}, cq, { answered: true, chosen: chosen, correct: correct }));

                upd('calcScore', cScore + (correct ? 1 : 0));

                var newStreak = correct ? cStreak + 1 : 0;

                upd('calcStreak', newStreak);

                if (correct) {

                  if (typeof awardStemXP === 'function') awardStemXP('calculus', 5, cMode + ' challenge');

                  announceToSR('Correct! Earned 5 XP');

                  addToast('\u2705 Correct! +5 XP', 'success');

                  if (newStreak >= 3) { if (typeof stemCelebrate === 'function') stemCelebrate(); if (typeof awardStemXP === 'function') awardStemXP('calculus', 5, '3-streak bonus'); addToast('\uD83D\uDD25 ' + newStreak + '-streak! +5 bonus XP', 'success'); }

                  setTimeout(function () { startCalcChallenge(); }, 2000);

                } else {

                  announceToSR('Incorrect. The answer was ' + cq.answer);

                  // Show hint

                  if (cq.hint) { upd('calcHint', cq.hint); }

                  else if (cMode === 'method') { upd('calcHint', 'The best method was ' + cq.answerLabel + '. Simpson\u2019s rule is often most accurate for polynomials!'); }

                  else if (cMode === 'minN') { upd('calcHint', 'The minimum n was ' + cq.answer + '. More subdivisions = smaller error.'); }

                  else { upd('calcHint', 'The answer was ' + cq.answer + '. Try computing the anti-derivative using the power rule!'); }

                  // AI hint if available

                  if (typeof stemAIHint === 'function') {

                    stemAIHint('calculus', cq.question, String(chosen), String(cq.answer), function (aiResp) { upd('calcHint', aiResp); });

                  }

                  addToast('\u274C Not quite \u2014 see the hint below', 'error');

                }

              }



              return React.createElement("div", { className: "border-t-2 border-red-200 pt-4 mt-4" },

                React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                  React.createElement("span", { style: { fontSize: '18px' } }, "\uD83C\uDFAF"),

                  React.createElement("h4", { className: "text-sm font-black text-red-800" }, "Calculus Challenges"),

                  cScore > 0 && React.createElement("span", { className: "ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200" }, '\u2B50 ' + cScore + ' | \uD83D\uDD25 ' + cStreak)

                ),

                // Mode selector

                React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },

                  CALC_CHALLENGES.map(function (cm) {

                    var isActive = cMode === cm.id;

                    return React.createElement("button", {

                      key: cm.id,

                      onClick: function () { upd('calcChallengeMode', cm.id); upd('calcQuiz', null); upd('calcHint', ''); },

                      className: "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all " + (isActive ? 'bg-' + cm.color + '-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'),

                      'aria-label': cm.label + ' challenge mode'

                    }, cm.label);

                  })

                ),

                // Start button

                React.createElement("button", {

                  onClick: startCalcChallenge,

                  className: "px-4 py-2 rounded-lg text-xs font-bold mb-3 transition-all " + (cq ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-red-600 text-white hover:bg-red-700 shadow-md'),

                  'aria-label': cq ? 'Generate new challenge' : 'Start challenge'

                }, cq ? '\uD83D\uDD04 New Challenge' : '\uD83D\uDE80 Start Challenge'),



                // Question card (multiple choice modes: estimate, method, minN)

                cq && !cq.answered && cMode !== 'exact' && React.createElement("div", { className: "bg-red-50 rounded-xl p-4 border border-red-200 animate-in fade-in" },

                  React.createElement("p", { className: "text-sm font-bold text-red-800 mb-3" }, cq.question),

                  React.createElement("div", { className: "grid grid-cols-2 gap-2" },

                    (cMode === 'method' ? cq.opts : cq.opts).map(function (opt) {

                      var optVal = cMode === 'method' ? opt.id : opt;

                      var optLabel = cMode === 'method' ? opt.label : (cMode === 'minN' ? 'n = ' + opt : String(opt));

                      return React.createElement("button", {

                        key: String(optVal),

                        onClick: function () { checkCalcAnswer(optVal); },

                        className: "px-3 py-2 rounded-lg text-xs font-bold border-2 bg-white text-slate-700 border-slate-200 hover:border-red-400 hover:bg-red-50 transition-all",

                        'aria-label': 'Answer: ' + optLabel

                      }, optLabel);

                    })

                  )

                ),



                // Question card (free-form: exact mode)

                cq && !cq.answered && cMode === 'exact' && React.createElement("div", { className: "bg-emerald-50 rounded-xl p-4 border border-emerald-200 animate-in fade-in" },

                  React.createElement("p", { className: "text-sm font-bold text-emerald-800 mb-1" }, cq.question),

                  React.createElement("p", { className: "text-[10px] text-emerald-600 mb-3 italic" }, "Use the power rule: \u222B x\u207F dx = x\u207F\u207A\u00B9/(n+1) + C"),

                  React.createElement("div", { className: "flex items-center gap-2" },

                    React.createElement("input", {

                      type: "number", step: "any",

                      value: d._calcExactInput || '',

                      onChange: function (e) { upd('_calcExactInput', e.target.value); },

                      onKeyDown: function (e) { if (e.key === 'Enter' && d._calcExactInput) checkCalcAnswer(d._calcExactInput); },

                      placeholder: "Type your answer\u2026",

                      className: "flex-1 px-3 py-2 rounded-lg border-2 border-emerald-300 text-sm font-bold text-emerald-800 bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none",

                      'aria-label': 'Type your answer for the exact integral'

                    }),

                    React.createElement("button", {

                      onClick: function () { if (d._calcExactInput) checkCalcAnswer(d._calcExactInput); },

                      className: "px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-md",

                      'aria-label': 'Submit answer'

                    }, "Check \u2192")

                  )

                ),



                // Result card

                cq && cq.answered && React.createElement("div", { className: "p-3 rounded-xl text-sm font-bold mb-2 " + (cq.correct ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200') },

                  cq.correct ? '\u2705 Correct! The answer is ' + cq.answer : '\u274C The correct answer was ' + cq.answer,

                  cq.correct && cStreak >= 3 && React.createElement("span", { className: "ml-2 text-amber-600" }, '\uD83D\uDD25 ' + cStreak + '-streak!')

                ),



                // Hint card (shown on wrong answer)

                cHint && React.createElement("div", { className: "bg-amber-50 rounded-xl p-3 border border-amber-200 mt-2 text-xs text-amber-800" },

                  React.createElement("span", { className: "font-bold" }, "\uD83D\uDCA1 Hint: "),

                  cHint

                ),



                // Method comparison table (shown after method quiz answered)

                cq && cq.answered && cMode === 'method' && cq.errors && React.createElement("div", { className: "mt-2 bg-slate-50 rounded-lg p-2 border" },

                  React.createElement("p", { className: "text-[9px] font-bold text-slate-500 uppercase mb-1" }, "Error Comparison (n=" + cq.n + ")"),

                  React.createElement("div", { className: "grid grid-cols-5 gap-1 text-center" },

                    ['left', 'right', 'midpoint', 'trapezoid', 'simpson'].map(function (m) {

                      var isBest = m === cq.answer;

                      return React.createElement("div", { key: m, className: "px-1 py-1 rounded text-[9px] font-bold " + (isBest ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-white text-slate-500 border') },

                        React.createElement("div", null, m === 'simpson' ? "Simp" : m.charAt(0).toUpperCase() + m.slice(1, 4)),

                        React.createElement("div", { className: "text-[8px]" }, cq.errors[m].toFixed(4))

                      );

                    })

                  )

                )

              );

            })(),

            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'calc-' + Date.now(), tool: 'calculus', label: '\u222B[' + d.xMin + ',' + d.xMax + '] n=' + d.n, data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

          )
      })();
    }
  });


  // ═══ 🔬 fractions (fractions) ═══
  /* fractions tool extracted to standalone file */
  window.StemLab.registerTool('unitConvert', {
    icon: '🔬',
    label: 'unitConvert',
    desc: '',
    color: 'slate',
    category: 'math',
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

      // ── Tool body (unitConvert) ──
      return (function() {
const d = labToolData.unitConvert;

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, unitConvert: { ...prev.unitConvert, [key]: val } }));

          const CATEGORIES = {

            length: { label: '\uD83D\uDCCF Length', units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.34 } },

            weight: { label: '\u2696 Weight', units: { mg: 0.001, g: 1, kg: 1000, oz: 28.3495, lb: 453.592, ton: 907185 } },

            temperature: { label: '\uD83C\uDF21 Temperature', units: { '\u00B0C': 'C', '\u00B0F': 'F', 'K': 'K' } },

            speed: { label: '\uD83D\uDE80 Speed', units: { 'm/s': 1, 'km/h': 0.27778, 'mph': 0.44704, 'knots': 0.51444 } },

            volume: { label: '\uD83E\uDDEA Volume', units: { mL: 0.001, L: 1, gal: 3.78541, qt: 0.946353, cup: 0.236588, 'fl oz': 0.0295735 } },

            time: { label: '\u23F0 Time', units: { sec: 1, min: 60, hr: 3600, day: 86400, week: 604800, year: 31536000 } },

          };

          const cat = CATEGORIES[d.category] || CATEGORIES.length;

          const convert = function () {

            if (d.category === 'temperature') {

              var v = d.value;

              if (d.fromUnit === d.toUnit) return v;

              if (d.fromUnit === '\u00B0C' && d.toUnit === '\u00B0F') return v * 9 / 5 + 32;

              if (d.fromUnit === '\u00B0F' && d.toUnit === '\u00B0C') return (v - 32) * 5 / 9;

              if (d.fromUnit === '\u00B0C' && d.toUnit === 'K') return v + 273.15;

              if (d.fromUnit === 'K' && d.toUnit === '\u00B0C') return v - 273.15;

              if (d.fromUnit === '\u00B0F' && d.toUnit === 'K') return (v - 32) * 5 / 9 + 273.15;

              if (d.fromUnit === 'K' && d.toUnit === '\u00B0F') return (v - 273.15) * 9 / 5 + 32;

              return v;

            }

            return d.value * (cat.units[d.fromUnit] || 1) / (cat.units[d.toUnit] || 1);

          };

          var result = convert();

          var fmtResult = typeof result === 'number' ? (Math.abs(result) < 0.01 && result !== 0 ? result.toExponential(4) : result.toFixed(4).replace(/\.?0+$/, '')) : result;



          // Visual comparison bars

          var fromBase = d.category === 'temperature' ? 1 : (cat.units[d.fromUnit] || 1);

          var toBase = d.category === 'temperature' ? 1 : (cat.units[d.toUnit] || 1);

          var ratio = d.category === 'temperature' ? (result !== 0 ? Math.abs(d.value / result) : 1) : fromBase / toBase;

          var barFrom = 100;

          var barTo = d.category !== 'temperature' ? Math.min(Math.max(barFrom * (1 / ratio), 5), 300) : barFrom;



          // Real-world references

          var REFERENCES = {

            length: function (meters) {

              if (meters < 0.01) return '\uD83D\uDC1C About ' + (meters * 1000).toFixed(0) + ' ant lengths';

              if (meters < 1) return '\uD83D\uDCCF About ' + (meters * 100).toFixed(0) + ' cm \u2014 a ruler is 30cm';

              if (meters < 10) return '\uD83D\uDEB6 About ' + (meters / 0.75).toFixed(0) + ' walking steps';

              if (meters < 100) return '\uD83C\uDFCA A pool is 50m \u2014 that\u2019s ' + (meters / 50).toFixed(1) + ' pools';

              if (meters < 1000) return '\u26BD A soccer field is 100m \u2014 that\u2019s ' + (meters / 100).toFixed(1) + ' fields';

              return '\uD83D\uDE97 ' + (meters / 1609.34).toFixed(1) + ' miles \u2014 about ' + (meters / 400).toFixed(0) + ' laps around a track';

            },

            weight: function (grams) {

              if (grams < 1) return '\uD83D\uDC1D A bee weighs ~0.1g \u2014 that\u2019s ' + (grams / 0.1).toFixed(0) + ' bees';

              if (grams < 100) return '\uD83E\uDD55 A carrot weighs ~60g \u2014 that\u2019s ' + (grams / 60).toFixed(1) + ' carrots';

              if (grams < 1000) return '\uD83C\uDF4E An apple weighs ~180g \u2014 that\u2019s ' + (grams / 180).toFixed(1) + ' apples';

              if (grams < 10000) return '\uD83D\uDCDA A textbook weighs ~1kg \u2014 that\u2019s ' + (grams / 1000).toFixed(1) + ' textbooks';

              return '\uD83D\uDC18 An adult elephant weighs ~5000kg \u2014 that\u2019s ' + (grams / 5000000).toFixed(4) + ' elephants';

            },

            speed: function (ms) {

              if (ms < 2) return '\uD83D\uDEB6 Walking speed is ~1.4 m/s';

              if (ms < 12) return '\uD83C\uDFC3 Usain Bolt peaks at ~12 m/s \u2014 you\u2019re at ' + (ms / 12 * 100).toFixed(0) + '%';

              if (ms < 100) return '\uD83D\uDE97 Highway speed is ~30 m/s \u2014 you\u2019re at ' + (ms / 30 * 100).toFixed(0) + '%';

              return '\u2708 A jet is ~250 m/s \u2014 you\u2019re at ' + (ms / 250 * 100).toFixed(0) + '%';

            },

            volume: function (liters) {

              if (liters < 0.5) return '\u2615 A teacup holds ~0.24L \u2014 that\u2019s ' + (liters / 0.24).toFixed(1) + ' cups';

              if (liters < 5) return '\uD83E\uDD5B A water bottle is 1L \u2014 that\u2019s ' + liters.toFixed(1) + ' bottles';

              return '\uD83D\uDEC1 A bathtub holds ~300L \u2014 that\u2019s ' + (liters / 300).toFixed(2) + ' tubs';

            },

            time: function (secs) {

              if (secs < 60) return '\uD83D\uDCA8 A sneeze lasts ~0.5s \u2014 that\u2019s ' + (secs / 0.5).toFixed(0) + ' sneezes';

              if (secs < 3600) return '\u23F0 One class period is ~50 min \u2014 that\u2019s ' + (secs / 3000).toFixed(1) + ' classes';

              if (secs < 86400) return '\uD83C\uDF1E A day has 24 hrs \u2014 that\u2019s ' + (secs / 86400).toFixed(2) + ' days';

              return '\uD83D\uDCC5 A year has 365 days \u2014 that\u2019s ' + (secs / 31536000).toFixed(3) + ' years';

            },

          };

          var baseValue = d.category === 'temperature' ? d.value : d.value * (cat.units[d.fromUnit] || 1);

          var refFn = REFERENCES[d.category];

          var refText = refFn ? refFn(baseValue) : null;



          // Conversion history

          var history = d.history || [];



          // Quiz

          var QUIZ_QS = [

            { q: 'How many centimeters in 1 meter?', a: 100, unit: 'cm' },

            { q: 'How many grams in 1 kilogram?', a: 1000, unit: 'g' },

            { q: 'How many inches in 1 foot?', a: 12, unit: 'in' },

            { q: 'How many seconds in 1 hour?', a: 3600, unit: 'sec' },

            { q: 'How many mL in 1 liter?', a: 1000, unit: 'mL' },

            { q: 'How many ounces in 1 pound?', a: 16, unit: 'oz' },

          ];



          return React.createElement("div", { className: "max-w-2xl mx-auto animate-in fade-in duration-200" },

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 hover:bg-slate-100 rounded-lg", 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-500" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800" }, "\uD83D\uDCCF Unit Converter"),

              React.createElement("span", { className: "px-2 py-0.5 bg-cyan-100 text-cyan-700 text-[10px] font-bold rounded-full" }, "INTERACTIVE")

            ),

            // Category tabs

            React.createElement("div", { className: "flex gap-2 mb-4" },

              Object.entries(CATEGORIES).map(function (entry) {

                var k = entry[0], v = entry[1];

                return React.createElement("button", { key: k, onClick: function () { upd('category', k); var units = Object.keys(v.units); upd('fromUnit', units[0]); upd('toUnit', units[1] || units[0]); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.category === k ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-cyan-50') }, v.label);

              })

            ),

            // Main converter card

            React.createElement("div", { className: "bg-white rounded-xl border-2 border-cyan-200 p-6 shadow-sm" },

              React.createElement("div", { className: "flex items-center gap-4 justify-center" },

                React.createElement("div", { className: "text-center" },

                  React.createElement("input", { type: "number", value: d.value, onChange: function (e) { upd('value', parseFloat(e.target.value) || 0); }, className: "w-32 text-center text-2xl font-bold border-b-2 border-cyan-300 outline-none py-1", step: "0.01" }),

                  React.createElement("select", { 'aria-label': 'Convert from unit', value: d.fromUnit, onChange: function (e) { upd('fromUnit', e.target.value); }, className: "block w-full mt-2 text-center text-sm font-bold text-cyan-700 border border-cyan-200 rounded-lg py-1" },

                    Object.keys(cat.units).map(function (u) { return React.createElement("option", { key: u, value: u }, u); })

                  )

                ),

                React.createElement("span", { className: "text-2xl text-cyan-400 font-bold" }, "\u2192"),

                React.createElement("div", { className: "text-center" },

                  React.createElement("p", { className: "text-2xl font-black text-cyan-700 py-1" }, fmtResult),

                  React.createElement("select", { 'aria-label': 'Convert to unit', value: d.toUnit, onChange: function (e) { upd('toUnit', e.target.value); }, className: "block w-full mt-2 text-center text-sm font-bold text-cyan-700 border border-cyan-200 rounded-lg py-1" },

                    Object.keys(cat.units).map(function (u) { return React.createElement("option", { key: u, value: u }, u); })

                  )

                )

              ),

              // Swap + Save buttons

              React.createElement("div", { className: "flex justify-center gap-2 mt-3" },

                React.createElement("button", { onClick: function () { setLabToolData(function (prev) { return Object.assign({}, prev, { unitConvert: Object.assign({}, prev.unitConvert, { fromUnit: d.toUnit, toUnit: d.fromUnit }) }); }); }, className: "px-4 py-1 bg-cyan-50 text-cyan-600 rounded-full text-xs font-bold hover:bg-cyan-100 transition-all" }, "\u21C4 Swap"),

                React.createElement("button", {

                  onClick: function () {

                    var entry = { from: d.value + ' ' + d.fromUnit, to: fmtResult + ' ' + d.toUnit, ts: Date.now() };

                    var newHist = [entry].concat((history || []).slice(0, 4));

                    upd('history', newHist);

                    addToast(t('stem.converter.u2705_saved_to_history'), 'success');

                  }, className: "px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-100 transition-all"

                }, "\uD83D\uDCBE Save")

              )

            ),

            // Visual comparison bars

            d.category !== 'temperature' && React.createElement("div", { className: "mt-3 bg-slate-50 rounded-xl border p-3" },

              React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2" }, "\uD83D\uDCCA Visual Comparison"),

              React.createElement("div", { className: "space-y-2" },

                React.createElement("div", null,

                  React.createElement("p", { className: "text-[10px] font-bold text-cyan-600 mb-1" }, d.value + ' ' + d.fromUnit),

                  React.createElement("div", { className: "h-5 rounded-full overflow-hidden bg-slate-200" },

                    React.createElement("div", { className: "h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full transition-all duration-500", style: { width: Math.min(barFrom, 100) + '%' } })

                  )

                ),

                React.createElement("div", null,

                  React.createElement("p", { className: "text-[10px] font-bold text-indigo-600 mb-1" }, fmtResult + ' ' + d.toUnit),

                  React.createElement("div", { className: "h-5 rounded-full overflow-hidden bg-slate-200" },

                    React.createElement("div", { className: "h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-500", style: { width: Math.min(barTo, 100) + '%' } })

                  )

                )

              )

            ),

            // Real-world reference

            refText && React.createElement("div", { className: "mt-3 bg-amber-50 rounded-xl border border-amber-200 p-3 text-center" },

              React.createElement("p", { className: "text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1" }, "\uD83C\uDF0D Real-World Reference"),

              React.createElement("p", { className: "text-sm font-bold text-amber-800" }, refText)

            ),

            // History

            history && history.length > 0 && React.createElement("div", { className: "mt-3 bg-slate-50 rounded-xl border p-3" },

              React.createElement("div", { className: "flex items-center justify-between mb-2" },

                React.createElement("p", { className: "text-[10px] font-bold text-slate-500 uppercase tracking-wider" }, "\uD83D\uDCDD Conversion History"),

                React.createElement("button", { onClick: function () { upd('history', []); }, className: "text-[10px] text-red-400 hover:text-red-600 font-bold" }, "Clear")

              ),

              React.createElement("div", { className: "space-y-1" },

                history.map(function (h, i) {

                  return React.createElement("div", { key: i, className: "flex items-center gap-2 text-xs bg-white rounded-lg px-2 py-1.5 border" },

                    React.createElement("span", { className: "text-cyan-600 font-bold" }, h.from),

                    React.createElement("span", { className: "text-slate-300" }, "\u2192"),

                    React.createElement("span", { className: "text-indigo-600 font-bold" }, h.to)

                  );

                })

              )

            ),

            // Quiz Mode

            React.createElement("div", { className: "mt-3 border-t border-slate-200 pt-3" },

              React.createElement("button", {

                onClick: function () {

                  var q = QUIZ_QS[Math.floor(Math.random() * QUIZ_QS.length)];

                  upd('quiz', { q: q.q, a: q.a, unit: q.unit, answered: false, score: (d.quiz && d.quiz.score) || 0 });

                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.quiz ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-600 text-white')

              }, d.quiz ? "\uD83D\uDD04 New Question" : "\uD83E\uDDE0 Quiz Mode"),

              d.quiz && d.quiz.score > 0 && React.createElement("span", { className: "ml-2 text-xs font-bold text-emerald-600" }, "\u2B50 " + d.quiz.score + " correct"),

              d.quiz && React.createElement("div", { className: "mt-2 bg-cyan-50 rounded-lg p-3 border border-cyan-200" },

                React.createElement("p", { className: "text-sm font-bold text-cyan-800 mb-2" }, d.quiz.q),

                !d.quiz.answered

                  ? React.createElement("div", { className: "flex gap-2 items-center" },

                    React.createElement("input", {

                      type: "number", placeholder: t('stem.converter.your_answer'), className: "px-3 py-2 border border-cyan-200 rounded-lg font-mono text-sm w-32", onKeyDown: function (e) {

                        if (e.key === 'Enter') {

                          var ans = parseFloat(e.target.value);

                          var correct = Math.abs(ans - d.quiz.a) < 0.01;

                          upd('quiz', Object.assign({}, d.quiz, { answered: true, userAns: ans, correct: correct, score: d.quiz.score + (correct ? 1 : 0) }));

                          addToast(correct ? '\u2705 Correct!' : '\u274C Answer: ' + d.quiz.a + ' ' + d.quiz.unit, correct ? 'success' : 'error');

                        }

                      }

                    }),

                    React.createElement("span", { className: "text-xs text-slate-400" }, d.quiz.unit + " \u2014 press Enter")

                  )

                  : React.createElement("p", { className: "text-sm font-bold " + (d.quiz.correct ? 'text-emerald-600' : 'text-red-600') },

                    d.quiz.correct ? '\u2705 Correct!' : '\u274C Answer was: ' + d.quiz.a + ' ' + d.quiz.unit

                  )

              )

            ),

            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'uc-' + Date.now(), tool: 'unitConvert', label: d.value + ' ' + d.fromUnit + ' to ' + d.toUnit, data: Object.assign({}, d), timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

          );
      })();
    }
  });

  // ═══ 🔬 probability (probability) ═══
  window.StemLab.registerTool('probability', {
    icon: '🔬',
    label: 'probability',
    desc: '',
    color: 'slate',
    category: 'math',
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

      // ── Tool body (probability) ──
      return (function() {
const d = labToolData.probability;

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, probability: { ...prev.probability, [key]: val } }));



          // ── Sports Scenarios ──

          var SPORTS = [

            { id: 'freethrow', label: '\uD83C\uDFC0 Free Throws', icon: '\uD83C\uDFC0', desc: 'NBA average free throw percentage is ~77%', outcomes: ['Make', 'Miss'], probs: [0.77, 0.23], colors: ['#22c55e', '#ef4444'], emoji: ['\uD83C\uDFC0', '\u274C'] },

            { id: 'threepoint', label: '\uD83C\uDFC0 3-Pointers', icon: '\uD83C\uDFC0', desc: 'NBA average 3-point percentage is ~36%', outcomes: ['Swish', 'Miss'], probs: [0.36, 0.64], colors: ['#3b82f6', '#ef4444'], emoji: ['\uD83D\uDCAB', '\u274C'] },

            { id: 'penalty', label: '\u26BD Penalty Kicks', icon: '\u26BD', desc: 'Soccer penalty kick conversion rate is ~76%', outcomes: ['Goal', 'Save'], probs: [0.76, 0.24], colors: ['#22c55e', '#f59e0b'], emoji: ['\u26BD', '\uD83E\uDDE4'] },

            { id: 'batting', label: '\u26BE Batting Average', icon: '\u26BE', desc: 'MLB average batting average is ~.250 (hit 1 in 4)', outcomes: ['Hit', 'Out'], probs: [0.250, 0.750], colors: ['#8b5cf6', '#94a3b8'], emoji: ['\uD83D\uDCA5', '\u2796'] },

            { id: 'fieldgoal', label: '\uD83C\uDFC8 Field Goals', icon: '\uD83C\uDFC8', desc: 'NFL field goal success rate is ~84%', outcomes: ['Good', 'No Good'], probs: [0.84, 0.16], colors: ['#22c55e', '#ef4444'], emoji: ['\uD83C\uDFC8', '\u274C'] },

            { id: 'tennis', label: '\uD83C\uDFBE First Serves', icon: '\uD83C\uDFBE', desc: 'Pro tennis first serve success rate is ~62%', outcomes: ['In', 'Fault'], probs: [0.62, 0.38], colors: ['#06b6d4', '#f97316'], emoji: ['\uD83C\uDFBE', '\u2716'] },

            { id: 'hockey', label: '\uD83C\uDFD2 Shots on Goal', icon: '\uD83C\uDFD2', desc: 'NHL average shooting percentage is ~10%', outcomes: ['Goal', 'Save'], probs: [0.10, 0.90], colors: ['#ef4444', '#64748b'], emoji: ['\uD83D\uDEA8', '\uD83E\uDDE4'] }

          ];

          var activeSport = SPORTS.find(function (s) { return s.id === (d.sportType || 'freethrow'); }) || SPORTS[0];



          // ── Custom mode outcomes ──

          var customOutcomes = d.customOutcomes || [{ label: 'Red', prob: 0.5, color: '#ef4444', numerator: 1, denominator: 2, count: 5 }, { label: 'Blue', prob: 0.5, color: '#3b82f6', numerator: 1, denominator: 2, count: 5 }];

          var customSubMode = d.customSubMode || 'fraction';

          if (d.mode === 'custom') {

            if (customSubMode === 'fraction') { customOutcomes = customOutcomes.map(function (o) { var den = o.denominator || 20; return Object.assign({}, o, { prob: den > 0 ? (o.numerator != null ? o.numerator : 1) / den : 0 }); }); }

            else if (customSubMode === 'marbleBag') { var _totalM = customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0); if (_totalM > 0) { customOutcomes = customOutcomes.map(function (o) { return Object.assign({}, o, { prob: (o.count || 1) / _totalM }); }); } }

          }

          // ── Marble bag mode: compute probs from counts ──

          if (d.mode === 'marbleBag') {

            var _mbTotal = customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0);

            if (_mbTotal > 0) { customOutcomes = customOutcomes.map(function (o) { return Object.assign({}, o, { prob: (o.count || 1) / _mbTotal }); }); }

          }



          // ── Run trials ──

          const runTrial = (n) => {

            const results = [...d.results];

            for (let i = 0; i < n; i++) {

              if (d.mode === 'coin') results.push(Math.random() < 0.5 ? 'H' : 'T');

              else if (d.mode === 'dice') results.push(Math.floor(Math.random() * 6) + 1);

              else if (d.mode === 'spinner') results.push(['Red', 'Blue', 'Green', 'Yellow'][Math.floor(Math.random() * 4)]);

              else if (d.mode === 'sports') {

                var r = Math.random(), cumulative = 0;

                for (var si = 0; si < activeSport.outcomes.length; si++) {

                  cumulative += activeSport.probs[si];

                  if (r < cumulative) { results.push(activeSport.outcomes[si]); break; }

                }

                if (results.length === d.results.length + i) results.push(activeSport.outcomes[activeSport.outcomes.length - 1]);

              }

              else if (d.mode === 'custom') {

                var cr = Math.random(), ccum = 0;

                for (var ci = 0; ci < customOutcomes.length; ci++) {

                  ccum += customOutcomes[ci].prob;

                  if (cr < ccum) { results.push(customOutcomes[ci].label); break; }

                }

                if (results.length === d.results.length + i) results.push(customOutcomes[customOutcomes.length - 1].label);

              }

              else if (d.mode === 'marbleBag') {

                var mbWithoutRepl = d.mbWithoutReplacement || false;

                if (mbWithoutRepl) {

                  // Without replacement: use remaining pool

                  var mbRemaining = d._mbRemaining || null;

                  if (!mbRemaining || mbRemaining.length === 0) {

                    // Rebuild pool from marble counts

                    mbRemaining = [];

                    customOutcomes.forEach(function (o) { for (var _mi = 0; _mi < (o.count || 1); _mi++) mbRemaining.push(o.label); });

                  }

                  if (mbRemaining.length > 0) {

                    var mbIdx = Math.floor(Math.random() * mbRemaining.length);

                    results.push(mbRemaining[mbIdx]);

                    mbRemaining = mbRemaining.slice(0, mbIdx).concat(mbRemaining.slice(mbIdx + 1));

                    upd('_mbRemaining', mbRemaining);

                  } else {

                    results.push(customOutcomes[0].label);

                  }

                } else {

                  // With replacement — same as custom

                  var mbr = Math.random(), mbcum = 0;

                  for (var mbi = 0; mbi < customOutcomes.length; mbi++) {

                    mbcum += customOutcomes[mbi].prob;

                    if (mbr < mbcum) { results.push(customOutcomes[mbi].label); break; }

                  }

                  if (results.length === d.results.length + i) results.push(customOutcomes[customOutcomes.length - 1].label);

                }

              }

            }

            upd('results', results);

            upd('trials', results.length);

            var hist = d.convergenceHistory || [];

            var total = results.length;

            if (total > 0) {

              var firstKey = d.mode === 'coin' ? 'H' : d.mode === 'dice' ? 1 : d.mode === 'spinner' ? 'Red' : d.mode === 'sports' ? activeSport.outcomes[0] : customOutcomes[0] ? customOutcomes[0].label : 'Red';

              var cnt = results.filter(function (r) { return r === firstKey; }).length;

              hist = hist.concat([{ t: total, pct: cnt / total * 100 }]);

              if (hist.length > 50) hist = hist.slice(-50);

              upd('convergenceHistory', hist);

            }

            upd('lastResult', results[results.length - 1]);

            upd('animTick', (d.animTick || 0) + 1);

            if (d.mode === 'marbleBag') { upd('_mbShaking', true); setTimeout(function () { upd('_mbShaking', false); }, 600); }

          };



          // ── Compute expected & counts ──

          const counts = {};

          d.results.forEach(r => { counts[r] = (counts[r] || 0) + 1; });

          var expected;

          if (d.mode === 'coin') expected = { H: 0.5, T: 0.5 };

          else if (d.mode === 'dice') expected = { 1: 1 / 6, 2: 1 / 6, 3: 1 / 6, 4: 1 / 6, 5: 1 / 6, 6: 1 / 6 };

          else if (d.mode === 'spinner') expected = { Red: 0.25, Blue: 0.25, Green: 0.25, Yellow: 0.25 };

          else if (d.mode === 'sports') {

            expected = {};

            activeSport.outcomes.forEach(function (o, i) { expected[o] = activeSport.probs[i]; });

          } else if (d.mode === 'marbleBag') {

            expected = {};

            customOutcomes.forEach(function (o) { expected[o.label] = o.prob; });

          } else {

            expected = {};

            customOutcomes.forEach(function (o) { expected[o.label] = o.prob; });

          }

          const maxCount = Math.max(...Object.values(counts), 1);

          var barColors = { H: '#3b82f6', T: '#ef4444', 1: '#ef4444', 2: '#f97316', 3: '#eab308', 4: '#22c55e', 5: '#3b82f6', 6: '#8b5cf6', Red: '#ef4444', Blue: '#3b82f6', Green: '#22c55e', Yellow: '#eab308' };

          if (d.mode === 'sports') { activeSport.outcomes.forEach(function (o, i) { barColors[o] = activeSport.colors[i]; }); }

          if (d.mode === 'custom') { customOutcomes.forEach(function (o) { barColors[o.label] = o.color; }); }

          if (d.mode === 'marbleBag') { customOutcomes.forEach(function (o) { barColors[o.label] = o.color; }); }



          // Chi-squared

          var chiSq = 0;

          if (d.trials > 0) {

            Object.keys(expected).forEach(function (k) {

              var obs = counts[k] || 0;

              var exp = expected[k] * d.trials;

              if (exp > 0) chiSq += Math.pow(obs - exp, 2) / exp;

            });

          }

          var df = Object.keys(expected).length - 1;

          var chiCritical = df === 1 ? 3.84 : df === 3 ? 7.81 : df === 5 ? 11.07 : df === 2 ? 5.99 : df === 6 ? 12.59 : 11.07;

          var chiPass = chiSq < chiCritical;



          var convHist = d.convergenceHistory || [];

          var convExpected = d.mode === 'coin' ? 50 : d.mode === 'dice' ? 16.67 : d.mode === 'spinner' ? 25 : d.mode === 'sports' ? activeSport.probs[0] * 100 : customOutcomes[0] ? customOutcomes[0].prob * 100 : 50;



          // Dice face SVG

          var diceFace = function (val, size) {

            var s = size || 60;

            var dotPositions = {

              1: [[s / 2, s / 2]],

              2: [[s * 0.3, s * 0.3], [s * 0.7, s * 0.7]],

              3: [[s * 0.3, s * 0.3], [s / 2, s / 2], [s * 0.7, s * 0.7]],

              4: [[s * 0.3, s * 0.3], [s * 0.7, s * 0.3], [s * 0.3, s * 0.7], [s * 0.7, s * 0.7]],

              5: [[s * 0.3, s * 0.3], [s * 0.7, s * 0.3], [s / 2, s / 2], [s * 0.3, s * 0.7], [s * 0.7, s * 0.7]],

              6: [[s * 0.3, s * 0.25], [s * 0.7, s * 0.25], [s * 0.3, s / 2], [s * 0.7, s / 2], [s * 0.3, s * 0.75], [s * 0.7, s * 0.75]]

            };

            var dots = dotPositions[val] || [];

            return React.createElement("svg", { viewBox: "0 0 " + s + " " + s, width: s, height: s },

              React.createElement("rect", { x: 2, y: 2, width: s - 4, height: s - 4, rx: 8, fill: "white", stroke: "#94a3b8", strokeWidth: 2 }),

              dots.map(function (pos, i) {

                return React.createElement("circle", { key: i, cx: pos[0], cy: pos[1], r: s * 0.08, fill: "#1e293b" });

              })

            );

          };



          // Spinner SVG

          var spinnerSvg = function (result, tick) {

            var colors = { Red: '#ef4444', Blue: '#3b82f6', Green: '#22c55e', Yellow: '#eab308' };

            var keys = ['Red', 'Blue', 'Green', 'Yellow'];

            var size = 100; var r = 42;

            var arrowAngle = result ? (keys.indexOf(result) * 90 + 45) : 0;

            return React.createElement("svg", { viewBox: "0 0 " + size + " " + size, width: size, height: size },

              keys.map(function (k, i) {

                var startA = (i * 90 - 90) * Math.PI / 180;

                var endA = ((i + 1) * 90 - 90) * Math.PI / 180;

                var x1 = 50 + r * Math.cos(startA), y1 = 50 + r * Math.sin(startA);

                var x2 = 50 + r * Math.cos(endA), y2 = 50 + r * Math.sin(endA);

                return React.createElement("path", { key: k, d: "M 50 50 L " + x1 + " " + y1 + " A " + r + " " + r + " 0 0 1 " + x2 + " " + y2 + " Z", fill: colors[k], stroke: 'white', strokeWidth: 1.5, opacity: result === k ? 1 : 0.6 });

              }),

              React.createElement("g", { transform: "rotate(" + arrowAngle + ", 50, 50)" },

                React.createElement("polygon", { points: "50,12 47,50 53,50", fill: "#1e293b", stroke: "white", strokeWidth: 1 })

              ),

              React.createElement("circle", { cx: 50, cy: 50, r: 6, fill: "#1e293b", stroke: "white", strokeWidth: 1.5 })

            );

          };



          // Coin SVG

          var coinSvg = function (result) {

            var isH = result === 'H';

            return React.createElement("svg", { viewBox: "0 0 80 80", width: 80, height: 80 },

              React.createElement("circle", { cx: 40, cy: 40, r: 36, fill: isH ? '#fbbf24' : '#94a3b8', stroke: isH ? '#92400e' : '#64748b', strokeWidth: 3 }),

              React.createElement("text", { x: 40, y: 46, textAnchor: "middle", style: { fontSize: '22px', fontWeight: 'bold' }, fill: isH ? '#92400e' : '#f8fafc' }, isH ? 'H' : 'T'),

              isH && React.createElement("text", { x: 40, y: 26, textAnchor: "middle", style: { fontSize: '10px' }, fill: '#92400e' }, '\uD83E\uDE99')

            );

          };



          // Sports result visual

          var sportVisual = function (result) {

            var idx = activeSport.outcomes.indexOf(result);

            var emoji = idx >= 0 ? activeSport.emoji[idx] : '\u2753';

            var color = idx >= 0 ? activeSport.colors[idx] : '#94a3b8';

            return React.createElement("div", { className: "flex flex-col items-center gap-1" },

              React.createElement("span", { style: { fontSize: '48px', filter: idx === 0 ? 'none' : 'grayscale(50%)' } }, emoji),

              React.createElement("span", { className: "text-xs font-bold", style: { color: color } }, result || '?')

            );

          };



          // ── Dark mode / high-contrast theme variables ──

          var _bg = isDark || isContrast ? '#1e1b4b' : '#fff';

          var _text = isDark || isContrast ? '#e0e7ff' : '#1e293b';

          var _card = isDark || isContrast ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.04)';

          var _border = isDark || isContrast ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.15)';

          var _accent = isDark || isContrast ? '#c4b5fd' : '#7c3aed';

          var _muted = isDark || isContrast ? '#94a3b8' : '#64748b';

          var _btnBg = isDark || isContrast ? '#7c3aed' : '#8b5cf6';

          var _btnText = '#fff';

          var _cardBg = isDark || isContrast ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,1)';

          var _statBg = isDark || isContrast ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.04)';



          return React.createElement("div", { className: "max-w-3xl mx-auto animate-in fade-in duration-200", style: { color: _text } },

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { onClick: () => setStemLabTool(null), className: "p-1.5 rounded-lg transition-colors", style: { color: _muted }, 'aria-label': 'Back to tools' }, React.createElement(ArrowLeft, { size: 18 })),

              React.createElement("h3", { className: "text-lg font-bold", style: { color: _text } }, "\uD83C\uDFB2 Probability Lab"),

              d.trials > 0 && React.createElement("span", { className: "ml-2 px-2 py-0.5 text-xs font-bold rounded-full", style: { background: isDark || isContrast ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)', color: _accent } }, d.trials + " trials")

            ),

            React.createElement("p", { className: "text-xs italic -mt-1 mb-3", style: { color: _muted } }, "Explore probability through experiments. Run trials and watch observed frequencies converge to expected values."),

            // Mode selector

            React.createElement("div", { className: "flex flex-wrap gap-2 mb-3" },

              [['coin', '\uD83E\uDE99 Coin'], ['dice', '\uD83C\uDFB2 Dice'], ['spinner', '\uD83C\uDFA1 Spinner'], ['sports', '\uD83C\uDFC6 Sports'], ['marbleBag', '\uD83C\uDFB1 Marble Bag'], ['custom', '\u2699\uFE0F Custom']].map(([m, label]) =>

                React.createElement("button", { key: m, onClick: () => { upd('mode', m); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('lastResult', null); upd('_mbRemaining', null); }, className: "px-4 py-2 rounded-lg text-sm font-bold transition-all", style: { background: d.mode === m ? _btnBg : (isDark || isContrast ? 'rgba(139,92,246,0.1)' : '#f1f5f9'), color: d.mode === m ? _btnText : (isDark || isContrast ? '#c4b5fd' : '#475569'), boxShadow: d.mode === m ? '0 4px 6px -1px rgba(139,92,246,0.3)' : 'none' } }, label)

              )

            ),



            // ── Marble Bag mode config ──

            d.mode === 'marbleBag' && React.createElement("div", { className: "mb-4 rounded-xl p-4", style: { background: isDark || isContrast ? 'rgba(139,92,246,0.08)' : 'linear-gradient(135deg, #fdf4ff, #faf5ff, #f5f3ff)', border: '2px solid ' + (isDark || isContrast ? 'rgba(168,85,247,0.3)' : '#c4b5fd') } },

              React.createElement("div", { className: "flex items-center justify-between mb-3" },

                React.createElement("p", { className: "text-sm font-black", style: { color: isDark || isContrast ? '#c4b5fd' : '#7c3aed' } }, "\uD83C\uDFB1 Marble Bag Setup"),

                // Without-replacement toggle

                React.createElement("label", { className: "flex items-center gap-2 cursor-pointer select-none" },

                  React.createElement("span", { className: "text-[10px] font-bold", style: { color: isDark || isContrast ? '#a5b4fc' : '#6d28d9' } }, d.mbWithoutReplacement ? '\uD83D\uDD04 Without Replacement' : '\u267B\uFE0F With Replacement'),

                  React.createElement("div", {

                    onClick: function () { upd('mbWithoutReplacement', !d.mbWithoutReplacement); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('lastResult', null); upd('_mbRemaining', null); },

                    className: "relative w-10 h-5 rounded-full transition-colors cursor-pointer",

                    style: { background: d.mbWithoutReplacement ? '#7c3aed' : '#cbd5e1' }

                  },

                    React.createElement("div", { className: "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform", style: { left: d.mbWithoutReplacement ? '22px' : '2px' } })

                  )

                )

              ),

              d.mbWithoutReplacement && React.createElement("div", { className: "mb-3 px-3 py-2 rounded-lg text-[10px] font-bold", style: { background: 'rgba(139,92,246,0.1)', color: isDark || isContrast ? '#c4b5fd' : '#6d28d9', border: '1px dashed rgba(139,92,246,0.3)' } },

                "\uD83D\uDCA1 Without replacement: Each marble drawn is removed from the bag. Probabilities change after each draw! Bag refills when empty.",

                (d._mbRemaining && d._mbRemaining.length >= 0) ? ' \u2014 ' + d._mbRemaining.length + ' marbles remaining' : ''

              ),

              // Marble color rows

              React.createElement("div", { className: "space-y-2 mb-3" },

                customOutcomes.map(function (o, i) {

                  var count = o.count || 1;

                  return React.createElement("div", { key: i, className: "flex items-center gap-2 rounded-lg p-2", style: { background: isDark || isContrast ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)', border: '1px solid ' + (isDark || isContrast ? 'rgba(139,92,246,0.15)' : '#e9d5ff') } },

                    React.createElement("input", { type: "color", value: o.color, onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { color: e.target.value }); upd('customOutcomes', co); }, className: "w-7 h-7 rounded-full border-0 cursor-pointer flex-shrink-0", style: { borderRadius: '50%' } }),

                    React.createElement("input", { type: "text", value: o.label, placeholder: "Color " + (i + 1), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { label: e.target.value }); upd('customOutcomes', co); }, className: "w-20 px-2 py-1 rounded-lg text-sm font-bold flex-shrink-0", style: { border: '1px solid ' + (isDark || isContrast ? 'rgba(139,92,246,0.2)' : '#ddd6fe'), background: isDark || isContrast ? 'rgba(255,255,255,0.05)' : '#fff', color: _text } }),

                    React.createElement("button", { onClick: function () { if (count <= 1) return; var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { count: count - 1 }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('_mbRemaining', null); }, className: "w-7 h-7 rounded-full font-bold text-sm flex-shrink-0 flex items-center justify-center transition-all hover:scale-110", style: { background: '#fecaca', color: '#dc2626' } }, "\u2212"),

                    React.createElement("span", { className: "w-8 text-center text-sm font-black", style: { color: _text } }, count),

                    React.createElement("button", { onClick: function () { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { count: count + 1 }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('_mbRemaining', null); }, className: "w-7 h-7 rounded-full font-bold text-sm flex-shrink-0 flex items-center justify-center transition-all hover:scale-110", style: { background: '#bbf7d0', color: '#16a34a' } }, "+"),

                    React.createElement("span", { className: "ml-auto text-[10px] font-mono", style: { color: isDark || isContrast ? '#a5b4fc' : '#7c3aed' } }, count + '/' + customOutcomes.reduce(function (s, c) { return s + (c.count || 1); }, 0) + ' = ' + ((o.prob || 0) * 100).toFixed(1) + '%'),

                    customOutcomes.length > 2 && React.createElement("button", { onClick: function () { var co = (d.customOutcomes || customOutcomes).filter(function (_, j) { return j !== i; }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('_mbRemaining', null); }, className: "text-sm font-bold px-1 flex-shrink-0 transition-colors", style: { color: '#f87171' } }, "\u2715")

                  );

                })

              ),

              customOutcomes.length < 8 && React.createElement("button", { onClick: function () { var co = (d.customOutcomes || customOutcomes).concat([{ label: ['Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Teal'][Math.min(customOutcomes.length - 2, 5)] || String.fromCharCode(65 + customOutcomes.length), numerator: 1, denominator: 20, prob: 0, count: 3, color: ['#22c55e', '#eab308', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e'][customOutcomes.length % 8] }]); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('_mbRemaining', null); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105", style: { background: isDark || isContrast ? 'rgba(139,92,246,0.2)' : '#ede9fe', color: isDark || isContrast ? '#c4b5fd' : '#7c3aed' } }, "+ Add Color"),

              // ── SVG Bag Visualization ──

              React.createElement("div", { className: "mt-4 flex justify-center" },

                React.createElement("div", { style: { position: 'relative', display: 'inline-block', animation: d._mbShaking ? 'mbShake 0.5s ease-in-out' : 'none' } },

                  React.createElement("svg", { viewBox: "0 0 180 200", width: 180, height: 200, style: { filter: 'drop-shadow(0 4px 12px rgba(139,92,246,0.2))' } },

                    // Bag body

                    React.createElement("path", { d: "M30 60 Q20 60 15 80 L10 170 Q10 195 40 195 L140 195 Q170 195 170 170 L165 80 Q160 60 150 60", fill: isDark || isContrast ? '#2d1b69' : '#ddd6fe', stroke: isDark || isContrast ? '#7c3aed' : '#a78bfa', strokeWidth: 2.5 }),

                    // Bag opening / drawstring

                    React.createElement("path", { d: "M30 60 Q55 45 90 45 Q125 45 150 60", fill: "none", stroke: isDark || isContrast ? '#a78bfa' : '#7c3aed', strokeWidth: 2, strokeDasharray: "4 3" }),

                    // Drawstring knot

                    React.createElement("ellipse", { cx: 90, cy: 48, rx: 8, ry: 5, fill: isDark || isContrast ? '#a78bfa' : '#7c3aed' }),

                    // Bag label

                    React.createElement("text", { x: 90, y: 32, textAnchor: "middle", style: { fontSize: '10px', fontWeight: 'bold', fill: isDark || isContrast ? '#c4b5fd' : '#6d28d9' } }, customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0) + ' marbles'),

                    // Marbles inside bag

                    (function () {

                      var allMarbles = []; customOutcomes.forEach(function (o) { for (var _mj = 0; _mj < Math.min(o.count || 1, 15); _mj++) allMarbles.push(o.color); });

                      // Deterministic positioning for marbles

                      var positions = [];

                      var cols = Math.ceil(Math.sqrt(allMarbles.length));

                      for (var _mk = 0; _mk < Math.min(allMarbles.length, 50); _mk++) {

                        var row = Math.floor(_mk / cols), col = _mk % cols;

                        var px = 40 + col * 20 + (row % 2 ? 10 : 0) + (Math.sin(_mk * 7.3) * 4);

                        var py = 90 + row * 20 + (Math.cos(_mk * 5.1) * 3);

                        if (px > 150) px = 40 + (px % 110); if (py > 185) py = 90 + (py % 95);

                        positions.push({ x: px, y: py, color: allMarbles[_mk] });

                      }

                      return positions.map(function (p, idx) {

                        return React.createElement("g", { key: idx },

                          React.createElement("circle", { cx: p.x, cy: p.y, r: 8, fill: p.color, stroke: 'rgba(0,0,0,0.15)', strokeWidth: 0.5 }),

                          React.createElement("circle", { cx: p.x - 2, cy: p.y - 2, r: 3, fill: 'rgba(255,255,255,0.4)' })

                        );

                      });

                    })()

                  ),

                  // CSS animation style

                  React.createElement("style", null, '@keyframes mbShake { 0%,100% { transform: rotate(0deg); } 15% { transform: rotate(-8deg); } 30% { transform: rotate(8deg); } 45% { transform: rotate(-5deg); } 60% { transform: rotate(5deg); } 75% { transform: rotate(-2deg); } }')

                )

              )

            ),



            // ── Sports scenario selector ──

            d.mode === 'sports' && React.createElement("div", { className: "mb-4 rounded-xl p-3", style: { background: isDark || isContrast ? 'rgba(34,197,94,0.06)' : 'linear-gradient(to right, #ecfdf5, #f0f9ff)', border: '1px solid ' + (isDark || isContrast ? 'rgba(34,197,94,0.2)' : '#a7f3d0') } },

              React.createElement("p", { className: "text-xs font-bold text-emerald-700 mb-2" }, "\uD83C\uDFC6 Choose a Sport"),

              React.createElement("div", { className: "flex flex-wrap gap-2" },

                SPORTS.map(function (s) {

                  return React.createElement("button", {

                    key: s.id,

                    onClick: function () { upd('sportType', s.id); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('lastResult', null); },

                    className: "px-3 py-2 rounded-lg text-xs font-bold transition-all " + ((d.sportType || 'freethrow') === s.id ? 'bg-white shadow-md border-2 border-emerald-400 text-emerald-700' : 'bg-white/50 text-slate-600 hover:bg-white border border-slate-200')

                  }, s.icon + ' ' + s.label.replace(/^.*? /, ''));

                })

              ),

              React.createElement("p", { className: "text-xs text-slate-500 mt-2 italic" }, activeSport.desc + ' \u2014 P(' + activeSport.outcomes[0] + ') = ' + (activeSport.probs[0] * 100).toFixed(0) + '%')

            ),



            // ── Custom mode config ── (3 sub-modes: Fraction, Marble Bag, Slider)

            d.mode === 'custom' && React.createElement("div", { className: "mb-4 rounded-xl p-3", style: { background: isDark || isContrast ? 'rgba(245,158,11,0.06)' : 'linear-gradient(to right, #fffbeb, #fff7ed)', border: '1px solid ' + (isDark || isContrast ? 'rgba(245,158,11,0.2)' : '#fcd34d') } },

              React.createElement("div", { className: "flex gap-1 mb-3 bg-amber-100/50 rounded-lg p-1" },

                [['fraction', '\uD83C\uDFAF Fraction'], ['marbleBag', '\uD83C\uDFB1 Marble Bag'], ['slider', '\uD83C\uDFA8 Slider']].map(function (pair) { var sm = pair[0], label = pair[1]; return React.createElement("button", { key: sm, onClick: function () { upd('customSubMode', sm); }, className: "flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all " + (customSubMode === sm ? 'bg-white text-amber-700 shadow-sm' : 'text-amber-600/60 hover:text-amber-700') }, label); })

              ),



              // ── FRACTION SUB-MODE ──

              customSubMode === 'fraction' && React.createElement("div", null,

                React.createElement("p", { className: "text-xs text-amber-600 mb-2 italic" }, "\uD83C\uDFAF Define each event as a fraction \u2014 e.g., \"1 out of 20 times\""),

                React.createElement("div", { className: "space-y-2" },

                  customOutcomes.map(function (o, i) {

                    return React.createElement("div", { key: i, className: "flex items-center gap-2 bg-white/60 rounded-lg p-2" },

                      React.createElement("input", { type: "color", value: o.color, onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { color: e.target.value }); upd('customOutcomes', co); }, className: "w-7 h-7 rounded border-0 cursor-pointer flex-shrink-0" }),

                      React.createElement("input", { type: "text", value: o.label, placeholder: "Event " + (i + 1), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { label: e.target.value }); upd('customOutcomes', co); }, className: "w-20 px-2 py-1 rounded-lg border border-amber-200 text-sm font-bold flex-shrink-0" }),

                      React.createElement("input", { type: "number", min: 0, max: 999, value: o.numerator != null ? o.numerator : 1, onChange: function (e) { var num = Math.max(0, parseInt(e.target.value) || 0); var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { numerator: num, prob: (o.denominator || 20) > 0 ? num / (o.denominator || 20) : 0 }); upd('customOutcomes', co); }, className: "w-14 px-1 py-1 rounded-lg border border-amber-200 text-sm text-center font-mono" }),

                      React.createElement("span", { className: "text-xs font-bold text-amber-600 flex-shrink-0" }, "out of"),

                      React.createElement("input", { type: "number", min: 1, max: 10000, value: o.denominator != null ? o.denominator : 20, onChange: function (e) { var den = Math.max(1, parseInt(e.target.value) || 1); var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { denominator: den, prob: den > 0 ? (o.numerator != null ? o.numerator : 1) / den : 0 }); upd('customOutcomes', co); }, className: "w-14 px-1 py-1 rounded-lg border border-amber-200 text-sm text-center font-mono" }),

                      React.createElement("span", { className: "ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold " + (o.prob <= 0.1 ? 'bg-violet-100 text-violet-700' : o.prob <= 0.5 ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700') }, (o.prob * 100).toFixed(1) + '%'),

                      customOutcomes.length > 2 && React.createElement("button", { onClick: function () { var co = (d.customOutcomes || customOutcomes).filter(function (_, j) { return j !== i; }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "text-red-400 hover:text-red-600 text-sm font-bold px-1 flex-shrink-0" }, "\u2715")

                    );

                  })

                ),

                customOutcomes.length < 8 && React.createElement("button", { onClick: function () { var co = (d.customOutcomes || customOutcomes).concat([{ label: String.fromCharCode(65 + customOutcomes.length), numerator: 1, denominator: 20, prob: 0.05, count: 1, color: ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'][customOutcomes.length % 8] }]); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "mt-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors" }, "+ Add Event"),

                React.createElement("p", { className: "text-[10px] mt-1.5 " + (Math.abs(customOutcomes.reduce(function (s, o) { return s + o.prob; }, 0) - 1) < 0.05 ? 'text-emerald-500' : 'text-red-500') }, "\uD83D\uDCA1 Total: " + (customOutcomes.reduce(function (s, o) { return s + o.prob; }, 0) * 100).toFixed(1) + "%" + (Math.abs(customOutcomes.reduce(function (s, o) { return s + o.prob; }, 0) - 1) > 0.05 ? ' \u2014 fractions should add to 100%' : ' \u2713'))

              ),



              // ── MARBLE BAG SUB-MODE ──

              customSubMode === 'marbleBag' && React.createElement("div", null,

                React.createElement("p", { className: "text-xs text-amber-600 mb-2 italic" }, "\uD83C\uDFB1 Add colored marbles to a bag. Probability = your marble count \u00F7 total marbles."),

                React.createElement("div", { className: "space-y-2" },

                  customOutcomes.map(function (o, i) {

                    var count = o.count || 1;

                    return React.createElement("div", { key: i, className: "flex items-center gap-2 bg-white/60 rounded-lg p-2" },

                      React.createElement("input", { type: "color", value: o.color, onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { color: e.target.value }); upd('customOutcomes', co); }, className: "w-7 h-7 rounded border-0 cursor-pointer flex-shrink-0" }),

                      React.createElement("input", { type: "text", value: o.label, placeholder: "Color " + (i + 1), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { label: e.target.value }); upd('customOutcomes', co); }, className: "w-20 px-2 py-1 rounded-lg border border-amber-200 text-sm font-bold flex-shrink-0" }),

                      React.createElement("button", { onClick: function () { if (count <= 1) return; var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { count: count - 1 }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "w-7 h-7 rounded-full bg-red-100 text-red-600 font-bold text-sm hover:bg-red-200 transition-colors flex-shrink-0 flex items-center justify-center" }, "\u2212"),

                      React.createElement("span", { className: "w-8 text-center text-sm font-black text-slate-700" }, count),

                      React.createElement("button", { onClick: function () { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { count: count + 1 }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 font-bold text-sm hover:bg-emerald-200 transition-colors flex-shrink-0 flex items-center justify-center" }, "+"),

                      React.createElement("span", { className: "ml-1 text-[10px] font-mono text-amber-600" }, count + '/' + customOutcomes.reduce(function (s, c) { return s + (c.count || 1); }, 0) + ' = ' + (o.prob * 100).toFixed(1) + '%'),

                      customOutcomes.length > 2 && React.createElement("button", { onClick: function () { var co = (d.customOutcomes || customOutcomes).filter(function (_, j) { return j !== i; }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "text-red-400 hover:text-red-600 text-sm font-bold px-1 flex-shrink-0" }, "\u2715")

                    );

                  })

                ),

                React.createElement("div", { className: "mt-3 bg-white/80 rounded-xl p-3 border border-amber-200" },

                  React.createElement("div", { className: "flex flex-wrap gap-1 justify-center" },

                    customOutcomes.reduce(function (acc, o) { for (var m = 0; m < Math.min(o.count || 1, 50); m++) acc.push({ color: o.color, label: o.label }); return acc; }, []).slice(0, 100).map(function (marble, idx) {

                      return React.createElement("div", { key: idx, style: { width: 14, height: 14, borderRadius: '50%', background: marble.color, border: '1px solid rgba(0,0,0,0.15)', boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.4)' }, title: marble.label });

                    })

                  ),

                  customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0) > 100 && React.createElement("p", { className: "text-[10px] text-slate-400 text-center mt-1" }, "(showing first 100 of " + customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0) + " marbles)"),

                  React.createElement("p", { className: "text-xs text-center font-bold text-amber-700 mt-2" }, "\uD83C\uDFB1 " + customOutcomes.reduce(function (s, o) { return s + (o.count || 1); }, 0) + " marbles in bag")

                ),

                customOutcomes.length < 8 && React.createElement("button", { onClick: function () { var co = (d.customOutcomes || customOutcomes).concat([{ label: String.fromCharCode(65 + customOutcomes.length), numerator: 1, denominator: 20, prob: 0, count: 1, color: ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'][customOutcomes.length % 8] }]); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "mt-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors" }, "+ Add Color")

              ),



              // ── SLIDER SUB-MODE (original) ──

              customSubMode === 'slider' && React.createElement("div", null,

                React.createElement("p", { className: "text-xs text-amber-600 mb-2 italic" }, "\uD83C\uDFA8 Drag sliders to set exact probability percentages for each outcome."),

                React.createElement("div", { className: "space-y-2" },

                  customOutcomes.map(function (o, i) {

                    return React.createElement("div", { key: i, className: "flex items-center gap-2" },

                      React.createElement("input", { type: "color", value: o.color, onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { color: e.target.value }); upd('customOutcomes', co); }, className: "w-8 h-8 rounded border-0 cursor-pointer" }),

                      React.createElement("input", { type: "text", value: o.label, placeholder: "Outcome " + (i + 1), onChange: function (e) { var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { label: e.target.value }); upd('customOutcomes', co); }, className: "flex-1 px-2 py-1.5 rounded-lg border border-amber-200 text-sm font-bold" }),

                      React.createElement("div", { className: "flex items-center gap-1" },

                        React.createElement("input", { type: "range", min: 1, max: 99, value: Math.round(o.prob * 100), onChange: function (e) { var newProb = parseInt(e.target.value) / 100; var co = (d.customOutcomes || customOutcomes).slice(); co[i] = Object.assign({}, co[i], { prob: newProb }); var remaining = 1 - newProb; var otherTotal = co.reduce(function (s, c, j) { return j === i ? s : s + c.prob; }, 0); if (otherTotal > 0) { co.forEach(function (c, j) { if (j !== i) co[j] = Object.assign({}, c, { prob: c.prob / otherTotal * remaining }); }); } upd('customOutcomes', co); }, className: "w-20 accent-amber-600" }),

                        React.createElement("span", { className: "w-10 text-xs font-mono text-amber-700 text-right" }, Math.round(o.prob * 100) + '%')

                      ),

                      customOutcomes.length > 2 && React.createElement("button", { onClick: function () { var co = (d.customOutcomes || customOutcomes).filter(function (_, j) { return j !== i; }); var total = co.reduce(function (s, c) { return s + c.prob; }, 0); co = co.map(function (c) { return Object.assign({}, c, { prob: c.prob / total }); }); upd('customOutcomes', co); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "text-red-400 hover:text-red-600 text-sm font-bold px-1" }, "\u2715")

                    );

                  })

                ),

                customOutcomes.length < 8 && React.createElement("button", { onClick: function () { var newOuts = (d.customOutcomes || customOutcomes).concat([{ label: String.fromCharCode(65 + customOutcomes.length), prob: 0, count: 1, numerator: 0, denominator: 20, color: ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'][customOutcomes.length % 8] }]); var prob = 1 / newOuts.length; newOuts = newOuts.map(function (o) { return Object.assign({}, o, { prob: prob }); }); upd('customOutcomes', newOuts); upd('results', []); upd('trials', 0); upd('convergenceHistory', []); }, className: "mt-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors" }, "+ Add Outcome"),

                React.createElement("p", { className: "text-[10px] text-amber-500 mt-1" }, "\uD83D\uDCA1 Total: " + Math.round(customOutcomes.reduce(function (s, o) { return s + o.prob; }, 0) * 100) + "% (should be 100%)")

              )

            ),



            // Visual result display

            React.createElement("div", { className: "flex items-center justify-center gap-6 mb-4 py-4 rounded-xl", style: { background: isDark || isContrast ? 'rgba(139,92,246,0.08)' : 'linear-gradient(to bottom, #f5f3ff, #fff)', border: '2px solid ' + (isDark || isContrast ? 'rgba(139,92,246,0.25)' : '#ddd6fe') } },

              d.mode === 'coin' && coinSvg(d.lastResult || 'H'),

              d.mode === 'dice' && diceFace(d.lastResult || 1, 80),

              d.mode === 'spinner' && spinnerSvg(d.lastResult, d.animTick),

              d.mode === 'sports' && sportVisual(d.lastResult),

              d.mode === 'custom' && React.createElement("div", { className: "flex flex-col items-center gap-1" },

                React.createElement("div", { style: { width: 48, height: 48, borderRadius: '50%', background: barColors[d.lastResult] || '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' } },

                  React.createElement("span", { style: { fontSize: '20px', fontWeight: 'bold', color: '#fff' } }, d.lastResult ? d.lastResult[0] : '?')

                ),

                React.createElement("span", { className: "text-xs font-bold text-slate-600" }, d.lastResult || '?')

              ),

              d.mode === 'marbleBag' && React.createElement("div", { className: "flex flex-col items-center gap-2" },

                // Drawn marble with glow animation

                React.createElement("div", { style: { width: 56, height: 56, borderRadius: '50%', background: barColors[d.lastResult] || '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px ' + (barColors[d.lastResult] || '#e2e8f0') + '80, inset 0 -4px 8px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.4)', transition: 'all 0.3s ease', transform: d._mbShaking ? 'scale(1.2)' : 'scale(1)' } },

                  React.createElement("span", { style: { fontSize: '18px', fontWeight: 'bold', color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' } }, d.lastResult || '?')

                ),

                React.createElement("span", { className: "text-xs font-bold", style: { color: barColors[d.lastResult] || _muted } }, d.lastResult ? '\uD83C\uDFB1 Drew: ' + d.lastResult : 'Shake the bag!'),

                d.mbWithoutReplacement && d._mbRemaining && React.createElement("span", { className: "text-[10px] font-bold", style: { color: _accent } }, d._mbRemaining.length + ' left in bag')

              ),

              React.createElement("div", { className: "text-center" },

                React.createElement("p", { className: "text-3xl font-black text-violet-700 mb-1" }, d.lastResult != null ? String(d.lastResult) : '?'),

                React.createElement("p", { className: "text-xs text-slate-400" }, d.lastResult != null ? 'Last result' : 'Click to start!')

              )

            ),

            // Trial buttons

            React.createElement("div", { className: "flex gap-2 mb-4 justify-center flex-wrap" },

              [1, 10, 50, 100, 500].map(n => React.createElement("button", { key: n, onClick: () => runTrial(n), className: "px-4 py-2 bg-violet-100 text-violet-700 font-bold rounded-lg hover:bg-violet-200 transition-colors text-sm" }, "+" + n)),

              React.createElement("button", { onClick: () => { upd('results', []); upd('trials', 0); upd('convergenceHistory', []); upd('lastResult', null); }, className: "px-4 py-2 bg-red-50 text-red-500 font-bold rounded-lg hover:bg-red-100 text-sm" }, "\uD83D\uDD04 Reset")

            ),

            // Frequency bars

            d.trials > 0 && React.createElement("div", { className: "rounded-xl p-4 mb-3", style: { background: _cardBg, border: '1px solid ' + _border } },

              React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-wider mb-2", style: { color: _accent } }, "\uD83D\uDCCA Observed vs Expected Frequencies"),

              React.createElement("div", { className: "space-y-2" },

                Object.keys(expected).map(k => {

                  const count = counts[k] || 0;

                  const pct = d.trials > 0 ? (count / d.trials * 100) : 0;

                  const expPct = expected[k] * 100;

                  return React.createElement("div", { key: k, className: "flex items-center gap-2" },

                    React.createElement("span", { className: "w-14 text-right text-sm font-bold", style: { color: barColors[k] || '#6366f1' } },

                      d.mode === 'coin' ? (k === 'H' ? '\uD83E\uDE99 H' : '\uD83E\uDE99 T') :

                        d.mode === 'dice' ? '\u2680 ' + k :

                          d.mode === 'sports' ? (activeSport.emoji[activeSport.outcomes.indexOf(k)] || '') + ' ' + k :

                            '\u25CF ' + k

                    ),

                    React.createElement("div", { className: "flex-1 bg-slate-100 rounded-full h-7 overflow-hidden relative" },

                      React.createElement("div", { style: { width: (count / maxCount * 100) + '%', backgroundColor: barColors[k] || '#6366f1', height: '100%', borderRadius: '9999px', transition: 'width 0.3s' } }),

                      React.createElement("div", { style: { position: 'absolute', left: Math.min(expPct / (expected[k] > 0 ? expected[k] : 0.01) / Object.keys(expected).length, 100) + '%', top: 0, bottom: 0, width: '2px', backgroundColor: '#1e293b80' }, title: 'Expected: ' + expPct.toFixed(1) + '%' })

                    ),

                    React.createElement("span", { className: "w-24 text-xs font-mono text-slate-600 text-right" }, count + " (" + pct.toFixed(1) + "%)"),

                    React.createElement("span", { className: "w-16 text-[10px] font-bold " + (Math.abs(pct - expPct) < 3 ? 'text-emerald-500' : Math.abs(pct - expPct) < 8 ? 'text-amber-500' : 'text-red-500') }, (pct > expPct ? '+' : '') + (pct - expPct).toFixed(1) + '%')

                  );

                })

              )

            ),

            // Convergence chart

            convHist.length > 1 && React.createElement("div", { className: "rounded-xl p-3 mb-3", style: { background: _cardBg, border: '1px solid ' + _border } },

              React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-wider mb-2", style: { color: _accent } },

                "\uD83D\uDCC8 Convergence to Expected (" + (d.mode === 'coin' ? 'P(H)=50%' : d.mode === 'dice' ? 'P(1)=16.7%' : d.mode === 'sports' ? 'P(' + activeSport.outcomes[0] + ')=' + (activeSport.probs[0] * 100).toFixed(0) + '%' : (d.mode === 'custom' || d.mode === 'marbleBag') && customOutcomes[0] ? 'P(' + customOutcomes[0].label + ')=' + (customOutcomes[0].prob * 100).toFixed(0) + '%' : 'P(Red)=25%') + ")"

              ),

              React.createElement("svg", { viewBox: "0 0 400 100", className: "w-full", style: { maxHeight: '120px' } },

                React.createElement("line", { x1: 0, y1: 100 - convExpected, x2: 400, y2: 100 - convExpected, stroke: "#22c55e", strokeWidth: 1, strokeDasharray: "4 2" }),

                React.createElement("text", { x: 2, y: 100 - convExpected - 3, fill: "#22c55e", style: { fontSize: '7px', fontWeight: 'bold' } }, convExpected.toFixed(0) + '% expected'),

                React.createElement("polyline", {

                  fill: "none", stroke: "#8b5cf6", strokeWidth: 2,

                  points: convHist.map(function (h, i) {

                    var x = (i / Math.max(convHist.length - 1, 1)) * 400;

                    var y = 100 - Math.min(h.pct, 100);

                    return x + ',' + y;

                  }).join(' ')

                }),

                convHist.slice(-5).map(function (h, i) {

                  var idx = convHist.length - 5 + i;

                  if (idx < 0) return null;

                  var x = (idx / Math.max(convHist.length - 1, 1)) * 400;

                  var y = 100 - Math.min(h.pct, 100);

                  return React.createElement("circle", { key: i, cx: x, cy: y, r: 2.5, fill: "#8b5cf6" });

                }),

                React.createElement("line", { x1: 0, y1: 100, x2: 400, y2: 100, stroke: "#e2e8f0", strokeWidth: 1 }),

                React.createElement("text", { x: 380, y: 97, fill: "#94a3b8", style: { fontSize: '7px' }, textAnchor: "end" }, d.trials + ' trials')

              )

            ),

            // Statistical analysis

            d.trials >= 10 && React.createElement("div", { className: "rounded-xl p-3 mb-3", style: { background: _statBg, border: '1px solid ' + _border } },

              React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-wider mb-2", style: { color: _accent } }, "\uD83D\uDCCA Statistical Analysis"),

              React.createElement("div", { className: "grid grid-cols-4 gap-2 text-center" },

                React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                  React.createElement("p", { className: "text-[9px] font-bold text-violet-500" }, "Total Trials"),

                  React.createElement("p", { className: "text-lg font-black text-violet-800" }, d.trials)

                ),

                React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                  React.createElement("p", { className: "text-[9px] font-bold text-violet-500" }, "Max Deviation"),

                  React.createElement("p", { className: "text-lg font-black text-violet-800" }, (function () {

                    var maxDev = 0;

                    Object.keys(expected).forEach(function (k) {

                      var observed = (counts[k] || 0) / d.trials;

                      var dev = Math.abs(observed - expected[k]);

                      if (dev > maxDev) maxDev = dev;

                    });

                    return (maxDev * 100).toFixed(1) + '%';

                  })())

                ),

                React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                  React.createElement("p", { className: "text-[9px] font-bold text-violet-500" }, "\u03C7\u00B2 Statistic"),

                  React.createElement("p", { className: "text-lg font-black " + (chiPass ? 'text-emerald-600' : 'text-red-600') }, chiSq.toFixed(2))

                ),

                React.createElement("div", { className: "p-1.5 bg-white rounded-lg border" },

                  React.createElement("p", { className: "text-[9px] font-bold text-violet-500" }, "Fairness (\u03B1=0.05)"),

                  React.createElement("p", { className: "text-lg font-black " + (chiPass ? 'text-emerald-600' : 'text-red-600') }, chiPass ? '\u2705 Fair' : '\u274C Biased')

                )

              ),

              React.createElement("p", { className: "mt-2 text-xs italic", style: { color: isDark || isContrast ? '#a5b4fc' : '#6d28d9' } },

                d.trials < 30 ? '\uD83D\uDCA1 Need more trials! With only ' + d.trials + ' trials, randomness dominates. Try 100+ for reliable patterns.'

                  : d.trials < 100 ? '\uD83D\uDCA1 Getting better! At ' + d.trials + ' trials, patterns are emerging. Watch the convergence chart.'

                    : '\uD83D\uDCA1 Great sample size! At ' + d.trials + ' trials, the Law of Large Numbers is clearly visible. \u03C7\u00B2(' + df + ')=' + chiSq.toFixed(2) + ' vs critical ' + chiCritical.toFixed(2) + ' \u2192 ' + (chiPass ? 'fail to reject H\u2080 (fair)' : 'reject H\u2080 (potentially biased)')

              )

            ),

            // ── Did You Know? — Pedagogical Insights ──

            d.trials >= 10 && React.createElement("div", { className: "rounded-xl p-3 mb-3", style: { background: isDark || isContrast ? 'rgba(251,191,36,0.06)' : '#fffbeb', border: '1px solid ' + (isDark || isContrast ? 'rgba(251,191,36,0.2)' : '#fde68a') } },

              React.createElement("p", { className: "text-xs font-bold mb-1", style: { color: isDark || isContrast ? '#fbbf24' : '#b45309' } }, "\uD83D\uDCA1 Did You Know?"),

              React.createElement("p", { className: "text-xs leading-relaxed", style: { color: isDark || isContrast ? '#fde68a' : '#92400e' } },

                d.trials < 30 ? 'The Law of Large Numbers says observed frequencies get closer to expected probabilities as you run more trials. Try 100+ to see it in action!'

                  : d.trials < 100 ? 'Jakob Bernoulli proved the Law of Large Numbers in 1713. He showed that with enough coin flips, the proportion of heads will always converge to 50%. You\'re seeing this happen right now!'

                    : d.trials < 200 ? 'The Gambler\'s Fallacy is the mistaken belief that past results affect future outcomes. Each ' + (d.mode === 'coin' ? 'coin flip' : d.mode === 'dice' ? 'dice roll' : 'trial') + ' is independent \u2014 the coin has no memory! Just because you got 5 heads in a row doesn\'t make tails more likely next.'

                      : d.trials < 500 ? 'At ' + d.trials + ' trials, you\'re witnessing the Central Limit Theorem in action! The sampling distribution of the mean approaches a normal (bell) curve shape, regardless of the underlying distribution. This is why statisticians love large samples.'

                        : 'With ' + d.trials + '+ trials, you can calculate confidence intervals! The 95% confidence interval for the true probability is approximately observed% \u00B1 ' + (1.96 * Math.sqrt(0.25 / d.trials) * 100).toFixed(1) + '%. This is how pollsters predict elections and scientists validate hypotheses.'

              )

            ),

            // ── Marble Bag: Theoretical vs Observed Comparison Histogram ──

            d.mode === 'marbleBag' && d.trials >= 5 && React.createElement("div", { className: "rounded-xl p-4 mb-3", style: { background: _cardBg, border: '1px solid ' + _border } },

              React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-wider mb-3", style: { color: _accent } }, "\uD83D\uDCCA Theoretical vs Observed Comparison"),

              React.createElement("div", { className: "flex gap-3" },

                // Theoretical column

                React.createElement("div", { className: "flex-1" },

                  React.createElement("p", { className: "text-[9px] font-bold text-center mb-2", style: { color: isDark || isContrast ? '#a5b4fc' : '#6d28d9' } }, "\uD83C\uDFAF Theoretical"),

                  React.createElement("div", { className: "space-y-1.5" },

                    Object.keys(expected).map(function (k) {

                      var expPct = expected[k] * 100;

                      return React.createElement("div", { key: 'theo-' + k, className: "flex items-center gap-1" },

                        React.createElement("div", { style: { width: 10, height: 10, borderRadius: '50%', background: barColors[k] || '#8b5cf6', flexShrink: 0 } }),

                        React.createElement("span", { className: "text-[9px] font-bold w-12 truncate", style: { color: _text } }, k),

                        React.createElement("div", { className: "flex-1 rounded-full overflow-hidden", style: { height: '10px', background: isDark || isContrast ? 'rgba(255,255,255,0.08)' : '#f1f5f9' } },

                          React.createElement("div", { style: { width: expPct + '%', height: '100%', background: (barColors[k] || '#8b5cf6') + '60', borderRadius: '9999px' } })

                        ),

                        React.createElement("span", { className: "text-[9px] font-mono w-10 text-right", style: { color: _muted } }, expPct.toFixed(1) + '%')

                      );

                    })

                  )

                ),

                // Divider

                React.createElement("div", { style: { width: '1px', background: isDark || isContrast ? 'rgba(139,92,246,0.2)' : '#e2e8f0', margin: '0 4px' } }),

                // Observed column

                React.createElement("div", { className: "flex-1" },

                  React.createElement("p", { className: "text-[9px] font-bold text-center mb-2", style: { color: isDark || isContrast ? '#86efac' : '#16a34a' } }, "\uD83D\uDD2C Observed (" + d.trials + " draws)"),

                  React.createElement("div", { className: "space-y-1.5" },

                    Object.keys(expected).map(function (k) {

                      var obsPct = d.trials > 0 ? ((counts[k] || 0) / d.trials * 100) : 0;

                      var expPct2 = expected[k] * 100;

                      var diff = obsPct - expPct2;

                      return React.createElement("div", { key: 'obs-' + k, className: "flex items-center gap-1" },

                        React.createElement("div", { style: { width: 10, height: 10, borderRadius: '50%', background: barColors[k] || '#8b5cf6', flexShrink: 0 } }),

                        React.createElement("span", { className: "text-[9px] font-bold w-12 truncate", style: { color: _text } }, k),

                        React.createElement("div", { className: "flex-1 rounded-full overflow-hidden", style: { height: '10px', background: isDark || isContrast ? 'rgba(255,255,255,0.08)' : '#f1f5f9' } },

                          React.createElement("div", { style: { width: Math.min(obsPct, 100) + '%', height: '100%', background: barColors[k] || '#8b5cf6', borderRadius: '9999px', transition: 'width 0.3s' } })

                        ),

                        React.createElement("span", { className: "text-[9px] font-mono w-10 text-right font-bold", style: { color: Math.abs(diff) < 3 ? (isDark || isContrast ? '#86efac' : '#16a34a') : Math.abs(diff) < 8 ? '#f59e0b' : '#ef4444' } }, obsPct.toFixed(1) + '%')

                      );

                    })

                  )

                )

              ),

              d.trials >= 20 && React.createElement("p", { className: "text-[10px] mt-2 italic text-center", style: { color: _muted } },

                '\uD83D\uDCA1 As you run more trials, the observed bars should get closer to the theoretical bars \u2014 that\'s the Law of Large Numbers in action!'

              )

            ),

            // Last 10 results

            d.trials > 0 && React.createElement("div", { className: "text-center" },

              d.mode === 'marbleBag' && React.createElement("div", { className: "mb-3 bg-white rounded-lg p-3 border shadow-sm mx-auto", style: { maxWidth: 500 } },

                React.createElement("p", { className: "text-[10px] font-bold uppercase tracking-wider mb-2", style: { color: _accent } }, "\uD83C\uDFB1 Draw History Breakdown"),

                React.createElement("div", { className: "flex flex-wrap gap-2 justify-center" },

                  Object.keys(expected).map(function (k) {

                    var count = counts[k] || 0;

                    var pct = d.trials > 0 ? (count / d.trials * 100) : 0;

                    return React.createElement("div", { key: k, className: "flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md border" },

                      React.createElement("div", { style: { width: 8, height: 8, borderRadius: '50%', background: barColors[k] || '#8b5cf6' } }),

                      React.createElement("span", { className: "text-[10px] font-bold text-slate-700" }, k + ":"),

                      React.createElement("span", { className: "text-[10px] font-mono text-slate-900" }, count),

                      React.createElement("span", { className: "text-[9px] text-slate-500" }, "(" + pct.toFixed(1) + "%)")

                    );

                  })

                )

              ),

              React.createElement("p", { className: "text-xs text-slate-400" }, "Last 10: " + d.results.slice(-10).map(function (r) {

                if (d.mode === 'coin') return r === 'H' ? '\uD83E\uDE99' : '\u25CB';

                if (d.mode === 'dice') return ['\u2680', '\u2681', '\u2682', '\u2683', '\u2684', '\u2685'][r - 1] || r;

                if (d.mode === 'sports') { var sidx = activeSport.outcomes.indexOf(r); return sidx >= 0 ? activeSport.emoji[sidx] : r; }

                return '\u25CF';

              }).join(' '))

            ),

            React.createElement("button", { onClick: () => { setToolSnapshots(prev => [...prev, { id: 'pr-' + Date.now(), tool: 'probability', label: d.mode + ' ' + d.trials + ' trials', data: Object.assign({}, d), timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 Snapshot")

          );
      })();
    }
  });

  // ═══ 🔬 logicLab (logicLab) ═══
  window.StemLab.registerTool('logicLab', {
    icon: '🔬',
    label: 'logicLab',
    desc: '',
    color: 'slate',
    category: 'math',
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

      // ── Tool body (logicLab) ──
      return (function() {
// ── state ──

          var d = labToolData.logicLab || {};

          var mode = d.mode || 'truth';

          var expr = d.expression || 'P → Q';

          var proofSteps = d.proofSteps || [];

          var currentChallenge = d.currentChallenge || 0;

          var challengeMode = d.challengeMode || 'fallacy';

          var challengeIdx = d.challengeIdx || 0;

          var challengeAnswer = d.challengeAnswer || null;

          var showEnglish = d.showEnglish || false;

          var proofComplete = d.proofComplete || false;

          var showEdu = d.showEdu || false;

          var userTopic = d.userTopic || '';

          var aiLoading = d.aiLoading || false;

          var aiFallacy = d.aiFallacy || null;

          var aiProof = d.aiProof || null;

          var aiDetective = d.aiDetective || null;

          var aiExplain = d.aiExplain || '';



          var upd = function(patch) {

            setLabToolData(function(prev) {

              return Object.assign({}, prev, { logicLab: Object.assign({}, prev.logicLab || {}, patch) });

            });

          };



          // ── AI generation helper ──

          var aiGenerate = function(prompt, field) {

            upd({ aiLoading: true });

            callGemini(prompt, true).then(function(result) {

              try {

                var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                var gs = cleaned.indexOf('{');

                if (gs > 0) cleaned = cleaned.substring(gs);

                var ge = cleaned.lastIndexOf('}');

                if (ge > 0) cleaned = cleaned.substring(0, ge + 1);

                var parsed = JSON.parse(cleaned);

                var patch = { aiLoading: false };

                patch[field] = parsed;

                upd(patch);

              } catch(e) {

                if (addToast) addToast('AI response parsing failed. Try again!', 'warning');

                upd({ aiLoading: false });

              }

            }).catch(function() {

              if (addToast) addToast('AI unavailable. Using static challenges.', 'info');

              upd({ aiLoading: false });

            });

          };



          var aiExplainCall = function(prompt) {

            upd({ aiLoading: true });

            callGemini(prompt, true).then(function(result) {

              upd({ aiExplain: result, aiLoading: false });

            }).catch(function() {

              upd({ aiLoading: false });

            });

          };



          var topicClause = function() { return userTopic ? ' about ' + userTopic : ''; };



          // ── connective definitions ──

          var CONN = {

            '∧': { sym: '∧', eng: 'AND', fn: function(a,b){return a&&b;}, prec: 3 },

            '∨': { sym: '∨', eng: 'OR',  fn: function(a,b){return a||b;}, prec: 2 },

            '¬': { sym: '¬', eng: 'NOT', fn: function(a){return !a;}, prec: 5, unary: true },

            '→': { sym: '→', eng: 'IF...THEN', fn: function(a,b){return !a||b;}, prec: 1 },

            '↔': { sym: '↔', eng: 'IF AND ONLY IF', fn: function(a,b){return a===b;}, prec: 0 },

            '⊕': { sym: '⊕', eng: 'XOR', fn: function(a,b){return a!==b;}, prec: 2 }

          };



          // ── expression parser & evaluator ──

          var tokenize = function(s) {

            var tokens = []; var i = 0;

            while (i < s.length) {

              var ch = s[i];

              if (ch === ' ') { i++; continue; }

              if (ch === '(' || ch === ')') { tokens.push(ch); i++; continue; }

              if ('∧∨¬→↔⊕'.indexOf(ch) !== -1) { tokens.push(ch); i++; continue; }

              if (/[A-Z]/.test(ch)) { tokens.push(ch); i++; continue; }

              i++;

            }

            return tokens;

          };



          var parseExpr = function(tokens, pos) {

            var left = parseUnary(tokens, pos);

            while (left.pos < tokens.length) {

              var tok = tokens[left.pos];

              if (!tok || !CONN[tok] || CONN[tok].unary) break;

              var op = tok;

              var right = parseUnary(tokens, left.pos + 1);

              left = { node: { type: 'bin', op: op, left: left.node, right: right.node }, pos: right.pos };

            }

            return left;

          };



          var parseUnary = function(tokens, pos) {

            if (tokens[pos] === '¬') {

              var inner = parseUnary(tokens, pos + 1);

              return { node: { type: 'not', child: inner.node }, pos: inner.pos };

            }

            if (tokens[pos] === '(') {

              var inner2 = parseExpr(tokens, pos + 1);

              var closePos = inner2.pos; // skip ')'

              return { node: inner2.node, pos: closePos + 1 };

            }

            return { node: { type: 'var', name: tokens[pos] || 'P' }, pos: pos + 1 };

          };



          var evalNode = function(node, env) {

            if (node.type === 'var') return !!env[node.name];

            if (node.type === 'not') return !evalNode(node.child, env);

            if (node.type === 'bin') {

              var a = evalNode(node.left, env);

              var b = evalNode(node.right, env);

              return CONN[node.op].fn(a, b);

            }

            return false;

          };



          var getVars = function(node) {

            if (node.type === 'var') return [node.name];

            if (node.type === 'not') return getVars(node.child);

            if (node.type === 'bin') return getVars(node.left).concat(getVars(node.right));

            return [];

          };



          var uniqueVars = function(arr) {

            var seen = {}; var out = [];

            for (var i = 0; i < arr.length; i++) { if (!seen[arr[i]]) { seen[arr[i]] = true; out.push(arr[i]); } }

            return out.sort();

          };



          // ── generate truth table ──

          var genTable = function(exprStr) {

            try {

              var tokens = tokenize(exprStr);

              if (tokens.length === 0) return null;

              var parsed = parseExpr(tokens, 0);

              var vars = uniqueVars(getVars(parsed.node));

              var rows = [];

              var n = Math.pow(2, vars.length);

              for (var i = 0; i < n; i++) {

                var env = {};

                for (var v = 0; v < vars.length; v++) {

                  env[vars[v]] = !!(i & (1 << (vars.length - 1 - v)));

                }

                rows.push({ env: env, result: evalNode(parsed.node, env) });

              }

              var allTrue = rows.every(function(r){return r.result;});

              var allFalse = rows.every(function(r){return !r.result;});

              return { vars: vars, rows: rows, type: allTrue ? 'tautology' : allFalse ? 'contradiction' : 'contingency' };

            } catch(e) { return null; }

          };



          // ── English translations ──

          var engMap = {

            'P': "It's sunny", 'Q': "It's warm", 'R': "We go outside", 'S': "We're happy"

          };

          var nodeToEng = function(node) {

            if (node.type === 'var') return engMap[node.name] || node.name;

            if (node.type === 'not') return "it's NOT the case that " + nodeToEng(node.child);

            if (node.type === 'bin') {

              var l = nodeToEng(node.left); var r = nodeToEng(node.right);

              if (node.op === '→') return 'If ' + l + ', then ' + r;

              if (node.op === '↔') return l + ' if and only if ' + r;

              if (node.op === '∧') return l + ' AND ' + r;

              if (node.op === '∨') return l + ' OR ' + r;

              if (node.op === '⊕') return 'Either ' + l + ' or ' + r + ' (but not both)';

            }

            return '';

          };



          // ── presets ──

          var PRESETS = [

            { label: 'Implication', expr: 'P → Q' },

            { label: "De Morgan's 1", expr: '¬ (P ∧ Q)' },

            { label: "De Morgan's 2", expr: '(¬ P) ∨ (¬ Q)' },

            { label: 'Contrapositive', expr: '(¬ Q) → (¬ P)' },

            { label: 'XOR', expr: 'P ⊕ Q' },

            { label: 'Tautology', expr: 'P ∨ (¬ P)' },

            { label: 'Contradiction', expr: 'P ∧ (¬ P)' },

            { label: 'Biconditional', expr: 'P ↔ Q' },

            { label: 'Distributive', expr: 'P ∧ (Q ∨ R)' },

            { label: 'Modus Ponens form', expr: '(P ∧ (P → Q)) → Q' }

          ];





          // ── Inference Rules ──

          var RULES = [

            { id: 'mp', name: 'Modus Ponens', form: 'P→Q, P ∴ Q', eng: 'If you study, you pass. You studied. ∴ You pass.', needs: 2,

              check: function(premises, sel) {

                for (var i = 0; i < sel.length; i++) for (var j = 0; j < sel.length; j++) {

                  if (i === j) continue;

                  var m = sel[i].match(/^(.+)\s*→\s*(.+)$/);

                  if (m && m[1].trim() === sel[j].trim()) return m[2].trim();

                }

                return null;

              }

            },

            { id: 'mt', name: 'Modus Tollens', form: 'P→Q, ¬Q ∴ ¬P', eng: "If it rains, ground is wet. Ground isn't wet. ∴ It didn't rain.", needs: 2,

              check: function(premises, sel) {

                for (var i = 0; i < sel.length; i++) for (var j = 0; j < sel.length; j++) {

                  if (i === j) continue;

                  var m = sel[i].match(/^(.+)\s*→\s*(.+)$/);

                  if (m && sel[j].trim() === '¬' + m[2].trim()) return '¬' + m[1].trim();

                  if (m && sel[j].trim() === '¬(' + m[2].trim() + ')') return '¬' + m[1].trim();

                }

                return null;

              }

            },

            { id: 'hs', name: 'Hypothetical Syllogism', form: 'P→Q, Q→R ∴ P→R', eng: 'If A then B, if B then C. ∴ If A then C.', needs: 2,

              check: function(premises, sel) {

                for (var i = 0; i < sel.length; i++) for (var j = 0; j < sel.length; j++) {

                  if (i === j) continue;

                  var m1 = sel[i].match(/^(.+)\s*→\s*(.+)$/);

                  var m2 = sel[j].match(/^(.+)\s*→\s*(.+)$/);

                  if (m1 && m2 && m1[2].trim() === m2[1].trim()) return m1[1].trim() + ' → ' + m2[2].trim();

                }

                return null;

              }

            },

            { id: 'ds', name: 'Disjunctive Syllogism', form: 'P∨Q, ¬P ∴ Q', eng: "It's red or blue. It's not red. ∴ It's blue.", needs: 2,

              check: function(premises, sel) {

                for (var i = 0; i < sel.length; i++) for (var j = 0; j < sel.length; j++) {

                  if (i === j) continue;

                  var m = sel[i].match(/^(.+)\s*∨\s*(.+)$/);

                  if (m && sel[j].trim() === '¬' + m[1].trim()) return m[2].trim();

                  if (m && sel[j].trim() === '¬' + m[2].trim()) return m[1].trim();

                }

                return null;

              }

            },

            { id: 'conj', name: 'Conjunction', form: 'P, Q ∴ P∧Q', eng: 'Combine two truths into one.', needs: 2,

              check: function(premises, sel) {

                if (sel.length === 2) return sel[0].trim() + ' ∧ ' + sel[1].trim();

                return null;

              }

            },

            { id: 'simp', name: 'Simplification', form: 'P∧Q ∴ P', eng: 'Extract one truth from a pair.', needs: 1,

              check: function(premises, sel) {

                var m = sel[0].match(/^(.+)\s*∧\s*(.+)$/);

                if (m) return m[1].trim();

                return null;

              }

            },

            { id: 'add', name: 'Addition', form: 'P ∴ P∨Q', eng: 'Add any alternative to a truth.', needs: 1,

              check: function(premises, sel) {

                return sel[0].trim() + ' ∨ Q';

              }

            },

            { id: 'dn', name: 'Double Negation', form: '¬¬P ≡ P', eng: '"Not not raining" = "Raining."', needs: 1,

              check: function(premises, sel) {

                var s = sel[0].trim();

                if (s.indexOf('¬¬') === 0) return s.substring(2);

                return '¬¬' + s;

              }

            },

            { id: 'contra', name: 'Contrapositive', form: 'P→Q ≡ ¬Q→¬P', eng: 'Reverse and negate.', needs: 1,

              check: function(premises, sel) {

                var m = sel[0].match(/^(.+)\s*→\s*(.+)$/);

                if (m) return '¬' + m[2].trim() + ' → ¬' + m[1].trim();

                return null;

              }

            },

            { id: 'demorgan', name: "De Morgan's", form: '¬(P∧Q) ≡ ¬P∨¬Q', eng: '"Not both" = "at least one isn\'t."', needs: 1,

              check: function(premises, sel) {

                var m = sel[0].match(/^¬\((.+)\s*∧\s*(.+)\)$/);

                if (m) return '¬' + m[1].trim() + ' ∨ ¬' + m[2].trim();

                var m2 = sel[0].match(/^¬\((.+)\s*∨\s*(.+)\)$/);

                if (m2) return '¬' + m2[1].trim() + ' ∧ ¬' + m2[2].trim();

                return null;

              }

            }

          ];



          // ── Proof Challenges ──

          var PROOF_CHALLENGES = [

            { level: 1, title: 'Simple Deduction', premises: ['P → Q', 'P'], conclusion: 'Q', hint: 'Use Modus Ponens' },

            { level: 2, title: 'Denial', premises: ['P → Q', '¬Q'], conclusion: '¬P', hint: 'Use Modus Tollens' },

            { level: 3, title: 'Chain Reaction', premises: ['P → Q', 'Q → R', 'P'], conclusion: 'R', hint: 'Chain implications, then apply MP' },

            { level: 4, title: 'Process of Elimination', premises: ['P ∨ Q', 'P → R', '¬P'], conclusion: 'R', hint: 'Eliminate with DS, then apply MP... wait, think again!' },

            { level: 5, title: 'Combine & Conclude', premises: ['(P ∧ Q) → R', 'P', 'Q'], conclusion: 'R', hint: 'First combine P and Q, then apply MP' }

          ];



          // ── Fallacy challenges ──

          var FALLACIES = [

            { arg: 'If it rains, the ground is wet. The ground is wet. Therefore, it rained.', valid: false, name: 'Affirming the Consequent', formal: 'P→Q, Q ∴ P ✗', explain: 'The ground could be wet for other reasons (sprinkler, spill).' },

            { arg: 'If you study, you\'ll pass. You didn\'t study. Therefore, you won\'t pass.', valid: false, name: 'Denying the Antecedent', formal: 'P→Q, ¬P ∴ ¬Q ✗', explain: 'You might pass anyway (natural talent, lucky guesses).' },

            { arg: 'All dogs are mammals. Fido is a dog. Therefore, Fido is a mammal.', valid: true, name: 'Valid Syllogism', formal: '∀x(Dog(x)→Mammal(x)), Dog(Fido) ∴ Mammal(Fido) ✓', explain: 'Classic valid deductive reasoning.' },

            { arg: 'If you\'re a cat, you have four legs. Spot has four legs. Therefore, Spot is a cat.', valid: false, name: 'Affirming the Consequent', formal: 'P→Q, Q ∴ P ✗', explain: 'Spot could be a dog, a horse, or any four-legged animal!' },

            { arg: 'Either we go to the park or we go to the movies. We\'re not going to the park. Therefore, we go to the movies.', valid: true, name: 'Disjunctive Syllogism', formal: 'P∨Q, ¬P ∴ Q ✓', explain: 'With only two options, eliminating one leaves the other.' },

            { arg: 'If it snows, school is cancelled. School is not cancelled. Therefore, it did not snow.', valid: true, name: 'Modus Tollens', formal: 'P→Q, ¬Q ∴ ¬P ✓', explain: 'Denying the consequent validly denies the antecedent.' },

            { arg: 'Everyone who exercises is healthy. Maria is healthy. Therefore, Maria exercises.', valid: false, name: 'Affirming the Consequent', formal: 'P→Q, Q ∴ P ✗', explain: 'Maria might be healthy for other reasons (genetics, diet).' },

            { arg: 'If a shape is a square, it has four sides. This shape has four sides. Therefore, it\'s a square.', valid: false, name: 'Affirming the Consequent', formal: 'P→Q, Q ∴ P ✗', explain: 'Rectangles, rhombuses, and trapezoids also have four sides!' }

          ];



          // ── Quick-fire truth table challenges ──

          var TT_CHALLENGES = [

            { expr: 'P ∧ Q', desc: 'AND gate' },

            { expr: 'P ∨ Q', desc: 'OR gate' },

            { expr: 'P → Q', desc: 'Implication' },

            { expr: '¬ P', desc: 'Negation' },

            { expr: 'P ⊕ Q', desc: 'Exclusive OR' },

            { expr: '(P → Q) ∧ (Q → P)', desc: 'Biconditional equivalence' }

          ];



          var activeCh = aiProof || PROOF_CHALLENGES[currentChallenge] || PROOF_CHALLENGES[0];





          // ── gradient map ──

          var _gViolet = 'linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa)';

          var _gCard = 'linear-gradient(135deg, #f5f3ff, #ede9fe, #f5f3ff)';



          // ── render ──

          return React.createElement("div", { className: "max-w-4xl mx-auto" },

            // Header

            React.createElement("div", { className: "mb-6 text-center" },

              React.createElement("div", { className: "inline-flex items-center gap-3 px-6 py-3 rounded-2xl mb-3", style: { background: _gViolet, boxShadow: '0 8px 32px rgba(124,58,237,0.3)' } },

                React.createElement("span", { style: { fontSize: '32px' } }, "\uD83E\uDDE0"),

                React.createElement("h2", { className: "text-2xl font-black text-white tracking-tight" }, "Logic Lab"),

                React.createElement("span", { className: "text-violet-200 text-sm font-bold ml-2" }, "Propositional Logic & Reasoning")

              ),

              // Mode tabs

              React.createElement("div", { className: "flex justify-center gap-2 mt-4" },

                [['truth', '\uD83D\uDCCA', 'Truth Tables'], ['proof', '\uD83E\uDDE9', 'Proof Builder'], ['challenges', '\u26A1', 'Challenges']].map(function(m) {

                  var active = mode === m[0];

                  return React.createElement("button", {

                    key: m[0],

                    onClick: function() { upd({ mode: m[0] }); },

                    className: "px-5 py-2.5 rounded-xl text-sm font-bold transition-all " + (active ? "text-white shadow-lg scale-105" : "text-violet-600 bg-violet-50 hover:bg-violet-100"),

                    style: active ? { background: _gViolet, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' } : {}

                  }, m[1] + " " + m[2]);

                })

              )

            ),



            // ═══ MODE 1: TRUTH TABLES ═══

            mode === 'truth' && React.createElement("div", { className: "space-y-4" },

              // Expression builder

              React.createElement("div", { className: "p-5 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                React.createElement("div", { className: "flex items-center gap-2 mb-3" },

                  React.createElement("span", { style: { fontSize: '18px' } }, "\u270F\uFE0F"),

                  React.createElement("h3", { className: "font-black text-violet-900 text-sm" }, "Build Your Expression")

                ),

                // Current expression display

                React.createElement("div", { className: "flex items-center gap-3 mb-4 p-3 bg-white rounded-xl border border-violet-200" },

                  React.createElement("code", { className: "text-lg font-mono font-bold text-violet-800 flex-1" }, expr),

                  React.createElement("button", {

                    onClick: function() { upd({ showEnglish: !showEnglish }); },

                    className: "text-xs font-bold px-3 py-1.5 rounded-full transition-all " + (showEnglish ? "bg-violet-600 text-white" : "bg-violet-100 text-violet-600 hover:bg-violet-200")

                  }, showEnglish ? "\uD83D\uDCDD English" : "\u2234 Formal")

                ),

                showEnglish && (function() {

                  try {

                    var toks = tokenize(expr);

                    if (toks.length > 0) {

                      var parsed = parseExpr(toks, 0);

                      return React.createElement("div", { className: "mb-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-800 italic" },

                        "\"\u200A" + nodeToEng(parsed.node) + "\u200A\""

                      );

                    }

                  } catch(e) {}

                  return null;

                })(),

                // Connective buttons

                React.createElement("div", { className: "flex flex-wrap gap-2 mb-3" },

                  Object.keys(CONN).map(function(sym) {

                    return React.createElement("button", {

                      key: sym,

                      onClick: function() { upd({ expression: expr + ' ' + sym + ' ' }); },

                      className: "px-3 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 font-bold rounded-lg transition-all text-sm",

                      title: CONN[sym].eng

                    }, sym + " " + CONN[sym].eng);

                  })

                ),

                // Variable buttons

                React.createElement("div", { className: "flex flex-wrap gap-2 mb-3" },

                  ['P','Q','R','S','(',')'].map(function(v) {

                    return React.createElement("button", {

                      key: v,

                      onClick: function() { upd({ expression: expr + v }); },

                      className: "px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold rounded-lg transition-all text-sm"

                    }, v);

                  }),

                  React.createElement("button", {

                    onClick: function() { upd({ expression: expr.length > 0 ? expr.slice(0, -1) : '' }); },

                    className: "px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded-lg transition-all text-sm"

                  }, "\u232B"),

                  React.createElement("button", {

                    onClick: function() { upd({ expression: '' }); },

                    className: "px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-all text-sm"

                  }, "Clear")

                ),

                // Presets

                React.createElement("div", { className: "flex flex-wrap gap-1.5" },

                  React.createElement("span", { className: "text-xs font-bold text-violet-500 mr-1 self-center" }, "Presets:"),

                  PRESETS.map(function(p) {

                    return React.createElement("button", {

                      key: p.label,

                      onClick: function() { upd({ expression: p.expr }); if (typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Truth table explored'); },

                      className: "px-2.5 py-1 bg-white border border-violet-200 hover:border-violet-400 text-violet-600 text-xs font-bold rounded-full transition-all hover:shadow-sm"

                    }, p.label);

                  })

                )

              ),



              // Truth table output

              (function() {

                var table = genTable(expr);

                if (!table) return React.createElement("div", { className: "p-8 text-center text-slate-400 text-sm" }, "Enter an expression above to generate a truth table");

                var typeBadge = table.type === 'tautology' ? { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', label: '\u2705 Tautology (always true)', glow: '0 0 20px rgba(16,185,129,0.3)' }

                  : table.type === 'contradiction' ? { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: '\u274C Contradiction (always false)', glow: '0 0 20px rgba(239,68,68,0.3)' }

                  : { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: '\u26A0\uFE0F Contingency (sometimes true)', glow: 'none' };



                return React.createElement("div", { className: "rounded-2xl border-2 border-violet-200 overflow-hidden", style: { background: _gCard } },

                  // Badge

                  React.createElement("div", { className: "px-5 py-3 flex items-center justify-between" },

                    React.createElement("h3", { className: "font-black text-violet-900 text-sm" }, "\uD83D\uDCCA Truth Table"),

                    React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-black border " + typeBadge.bg + " " + typeBadge.text + " " + typeBadge.border, style: { boxShadow: typeBadge.glow } }, typeBadge.label),

                    React.createElement("button", {

                      onClick: function() {

                        if (aiExplain) { upd({ aiExplain: '' }); return; }

                        aiExplainCall('Explain the propositional logic expression: ' + expr + '. It is a ' + table.type + '. Include: (1) what it means in plain English, (2) why it is a ' + table.type + ', (3) a real-world analogy' + (userTopic ? ' using ' + userTopic : '') + '. Keep it under 4 sentences. Use simple language suitable for a student.');

                      },

                      className: "px-3 py-1 rounded-full text-xs font-bold border transition-all " + (aiExplain ? "bg-purple-100 text-purple-700 border-purple-300" : "bg-violet-50 text-violet-600 border-violet-200 hover:bg-violet-100"),

                      disabled: aiLoading

                    }, aiExplain ? "\u25B2 Hide" : "\uD83E\uDDE0 Explain")

                  ),

                  aiExplain && React.createElement("div", { className: "mx-4 mb-2 p-3 bg-purple-50 rounded-xl border border-purple-200 text-sm text-purple-800 leading-relaxed" },

                    React.createElement("span", { className: "font-bold" }, "\uD83E\uDD16 AI Explanation: "),

                    aiExplain

                  ),

                  // Table

                  React.createElement("div", { className: "overflow-x-auto px-4 pb-4" },

                    React.createElement("table", { className: "w-full text-sm", style: { borderCollapse: 'separate', borderSpacing: '0 2px' } },

                      React.createElement("thead", null,

                        React.createElement("tr", null,

                          table.vars.map(function(v) {

                            return React.createElement("th", { key: v, className: "px-4 py-2 text-violet-600 font-black text-center bg-violet-100 first:rounded-l-lg last:rounded-r-lg" }, v);

                          }),

                          React.createElement("th", { className: "px-4 py-2 text-white font-black text-center rounded-lg", style: { background: _gViolet } }, expr)

                        )

                      ),

                      React.createElement("tbody", null,

                        table.rows.map(function(row, ri) {

                          return React.createElement("tr", { key: ri, className: "group" },

                            table.vars.map(function(v) {

                              return React.createElement("td", { key: v, className: "px-4 py-2 text-center font-bold bg-white group-hover:bg-violet-50 transition-colors " + (row.env[v] ? "text-emerald-600" : "text-slate-400") },

                                row.env[v] ? "T" : "F"

                              );

                            }),

                            React.createElement("td", { key: "result", className: "px-4 py-2 text-center font-black transition-colors " + (row.result ? "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100" : "bg-red-50 text-red-600 group-hover:bg-red-100") },

                              row.result ? "\u2705 T" : "\u274C F"

                            )

                          );

                        })

                      )

                    )

                  )

                );

              })()

            ),





            // ═══ MODE 2: PROOF BUILDER ═══

            mode === 'proof' && React.createElement("div", { className: "space-y-4" },

              // Challenge selector

              React.createElement("div", { className: "p-5 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                React.createElement("div", { className: "flex items-center gap-2 mb-3" },

                  React.createElement("span", { style: { fontSize: '18px' } }, "\uD83C\uDFAF"),

                  React.createElement("h3", { className: "font-black text-violet-900 text-sm" }, "Proof Challenges"),

                  proofComplete && React.createElement("span", { className: "ml-auto px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-black rounded-full border border-emerald-300" }, "\uD83C\uDF89 Complete!")

                ),

                React.createElement("div", { className: "grid grid-cols-5 gap-2" },

                  PROOF_CHALLENGES.map(function(ch, ci) {

                    var isActive = ci === currentChallenge;

                    var isCompleted = ci < currentChallenge || (ci === currentChallenge && proofComplete);

                    return React.createElement("button", {

                      key: ci,

                      onClick: function() { upd({ currentChallenge: ci, proofSteps: [], proofComplete: false, aiProof: null }); },

                      className: "p-3 rounded-xl text-center transition-all " + (isActive ? "ring-2 ring-violet-500 shadow-lg" : "hover:shadow-md"),

                      style: { background: isCompleted ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)' : isActive ? 'white' : '#f5f3ff', border: isCompleted ? '2px solid #6ee7b7' : '2px solid #e9d5ff' }

                    },

                      React.createElement("div", { className: "text-lg font-black " + (isCompleted ? "text-emerald-600" : "text-violet-700") }, isCompleted ? "\u2714" : "L" + ch.level),

                      React.createElement("div", { className: "text-[10px] font-bold text-slate-500 mt-0.5" }, ch.title)

                    );

                  })

                ),

                // AI Proof Generator

                React.createElement("div", { className: "mt-3 flex items-center gap-2" },

                  React.createElement("button", {

                    onClick: function() {

                      var diff = (currentChallenge || 0) + 1;

                      aiGenerate('Generate a propositional logic proof challenge' + topicClause() + '. Use ONLY variables P, Q, R, S. Use ONLY connectives: \u2192 (implies), \u2227 (and), \u2228 (or), \u00AC (not). Difficulty level: ' + diff + ' out of 5. The premises should be solvable using standard inference rules (Modus Ponens, Modus Tollens, Hypothetical Syllogism, Disjunctive Syllogism, Conjunction, Simplification). Return ONLY valid JSON: {"level":' + diff + ',"title":"<creative title>","premises":["<prop1>","<prop2>"],"conclusion":"<target>","hint":"<which rules to use>","context":"<1 sentence real-world framing>"}', 'aiProof');

                      upd({ proofSteps: [], proofComplete: false, selectedSteps: [] });

                    },

                    className: "px-4 py-2 text-xs font-bold rounded-xl transition-all",

                    style: { background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' },

                    disabled: aiLoading

                  }, "\uD83E\uDD16 AI-Generate Proof Challenge"),

                  aiLoading && React.createElement("span", { className: "text-xs text-violet-500 font-bold" }, "Generating..."),

                  aiProof && React.createElement("button", {

                    onClick: function() { upd({ aiProof: null, proofSteps: [], proofComplete: false }); },

                    className: "text-xs text-red-400 hover:text-red-600 font-bold"

                  }, "\u2715 Clear AI")

                )

              ),



              // Active proof workspace

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-4" },

                // Left: Premises + Proof

                React.createElement("div", { className: "lg:col-span-2 space-y-3" },

                  // Premises

                  React.createElement("div", { className: "p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50" },

                    React.createElement("h4", { className: "text-xs font-black text-indigo-600 uppercase tracking-wider mb-2" }, "\uD83D\uDCCB Premises (Given)"),

                    activeCh.premises.map(function(p, pi) {

                      var isSelected = (d.selectedSteps || []).indexOf('P' + pi) !== -1;

                      return React.createElement("button", {

                        key: pi,

                        onClick: function() {

                          var sel = (d.selectedSteps || []).slice();

                          var idx = sel.indexOf('P' + pi);

                          if (idx !== -1) sel.splice(idx, 1); else sel.push('P' + pi);

                          upd({ selectedSteps: sel });

                        },

                        className: "flex items-center gap-3 w-full p-3 mb-1.5 rounded-xl text-left transition-all " + (isSelected ? "bg-indigo-200 ring-2 ring-indigo-500 shadow-md" : "bg-white hover:bg-indigo-100 border border-indigo-200")

                      },

                        React.createElement("span", { className: "text-xs font-black text-indigo-400 w-6" }, "P" + (pi + 1)),

                        React.createElement("code", { className: "font-mono font-bold text-indigo-800 flex-1" }, p),

                        isSelected && React.createElement("span", { className: "text-indigo-600 text-xs font-black" }, "\u2714")

                      );

                    }),

                    React.createElement("div", { className: "mt-2 pt-2 border-t border-indigo-200 flex items-center gap-2" },

                      React.createElement("span", { className: "text-xs font-bold text-indigo-400" }, "Goal:"),

                      React.createElement("code", { className: "font-mono font-bold text-violet-700 bg-violet-100 px-3 py-1 rounded-lg" }, activeCh.conclusion)

                    ),

                    activeCh.context && React.createElement("div", { className: "mt-2 p-2 bg-purple-50 rounded-lg border border-purple-200 text-[10px] text-purple-700 italic flex items-center gap-1" },

                      React.createElement("span", null, "\uD83E\uDD16"),

                      activeCh.context

                    )

                  ),



                  // Proof Steps

                  proofSteps.length > 0 && React.createElement("div", { className: "p-4 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                    React.createElement("h4", { className: "text-xs font-black text-violet-600 uppercase tracking-wider mb-2" }, "\uD83D\uDD17 Derivation"),

                    proofSteps.map(function(step, si) {

                      var isSelected = (d.selectedSteps || []).indexOf('S' + si) !== -1;

                      return React.createElement("button", {

                        key: si,

                        onClick: function() {

                          var sel = (d.selectedSteps || []).slice();

                          var idx = sel.indexOf('S' + si);

                          if (idx !== -1) sel.splice(idx, 1); else sel.push('S' + si);

                          upd({ selectedSteps: sel });

                        },

                        className: "flex items-center gap-3 w-full p-3 mb-1.5 rounded-xl text-left transition-all " + (isSelected ? "bg-violet-200 ring-2 ring-violet-500 shadow-md" : "bg-white hover:bg-violet-50 border border-violet-200")

                      },

                        React.createElement("span", { className: "text-xs font-black text-violet-400 w-6" }, (si + 1) + "."),

                        React.createElement("code", { className: "font-mono font-bold text-violet-800 flex-1" }, step.result),

                        React.createElement("span", { className: "text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded" }, step.rule),

                        step.result === activeCh.conclusion && React.createElement("span", { className: "text-emerald-500 font-black text-sm" }, "\uD83C\uDF89")

                      );

                    }),

                    React.createElement("div", { className: "flex gap-2 mt-2" },

                      React.createElement("button", {

                        onClick: function() {

                          var newSteps = proofSteps.slice(0, -1);

                          upd({ proofSteps: newSteps, proofComplete: false });

                        },

                        className: "px-3 py-1.5 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all",

                        disabled: proofSteps.length === 0

                      }, "\u21A9 Undo"),

                      React.createElement("button", {

                        onClick: function() { upd({ proofSteps: [], proofComplete: false, selectedSteps: [] }); },

                        className: "px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all"

                      }, "\uD83D\uDD04 Reset")

                    )

                  ),



                  // Hint

                  React.createElement("button", {

                    onClick: function() { upd({ showHint: !d.showHint }); },

                    className: "text-xs font-bold text-amber-600 hover:text-amber-800 transition-colors"

                  }, d.showHint ? "\uD83D\uDCA1 " + activeCh.hint : "\uD83D\uDCA1 Show Hint")

                ),



                // Right: Rules panel

                React.createElement("div", { className: "space-y-2" },

                  React.createElement("h4", { className: "text-xs font-black text-violet-600 uppercase tracking-wider mb-1" }, "\uD83D\uDCDA Inference Rules"),

                  RULES.map(function(rule) {

                    return React.createElement("button", {

                      key: rule.id,

                      onClick: function() {

                        if (proofComplete) return;

                        var sel = d.selectedSteps || [];

                        if (sel.length < rule.needs) {

                          if (addToast) addToast('Select ' + rule.needs + ' statement(s) first, then click the rule.', 'info');

                          return;

                        }

                        // Gather selected statement texts

                        var selTexts = sel.map(function(s) {

                          if (s[0] === 'P') return activeCh.premises[parseInt(s.substring(1))];

                          if (s[0] === 'S') return proofSteps[parseInt(s.substring(1))].result;

                          return '';

                        });

                        var result = rule.check([], selTexts);

                        if (result) {

                          var newSteps = proofSteps.concat([{ result: result, rule: rule.name, from: sel.slice() }]);

                          var done = result === activeCh.conclusion;

                          upd({ proofSteps: newSteps, selectedSteps: [], proofComplete: done });

                          if (done) {

                            if (addToast) addToast('\uD83C\uDF89 Proof complete! Well done!', 'success');

                            if (typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'Proof completed');

                          }

                        } else {

                          if (addToast) addToast('\u274C That rule doesn\'t apply to the selected statements.', 'warning');

                        }

                      },

                      className: "w-full p-3 rounded-xl text-left transition-all bg-white hover:bg-violet-50 border border-violet-200 hover:border-violet-400 hover:shadow-sm"

                    },

                      React.createElement("div", { className: "font-bold text-violet-800 text-xs" }, rule.name),

                      React.createElement("div", { className: "text-[10px] font-mono text-slate-500 mt-0.5" }, rule.form),

                      React.createElement("div", { className: "text-[10px] text-slate-400 mt-0.5 italic" }, rule.eng)

                    );

                  })

                )

              )

            ),





            // ═══ MODE 3: CHALLENGES ═══

            mode === 'challenges' && React.createElement("div", { className: "space-y-4" },

              // Challenge type tabs

              React.createElement("div", { className: "flex gap-2 justify-center" },

                [['fallacy', '\uD83D\uDD0D', 'Fallacy Spotter'], ['quickfire', '\u23F1\uFE0F', 'Quick-Fire Tables'], ['detective', '\uD83D\uDD75\uFE0F', 'Reasoning']].map(function(ct) {

                  var active = challengeMode === ct[0];

                  return React.createElement("button", {

                    key: ct[0],

                    onClick: function() { upd({ challengeMode: ct[0], challengeIdx: 0, challengeAnswer: null }); },

                    className: "px-4 py-2 rounded-xl text-xs font-bold transition-all " + (active ? "bg-violet-600 text-white shadow-lg" : "bg-violet-50 text-violet-600 hover:bg-violet-100")

                  }, ct[1] + " " + ct[2]);

                })

              ),

              // ── Topic personalization input ──

              React.createElement("div", { className: "flex items-center gap-2 p-3 rounded-xl border border-violet-200 bg-violet-50/50" },

                React.createElement("span", { className: "text-base" }, "\uD83C\uDFAF"),

                React.createElement("input", {

                  type: "text",

                  value: userTopic,

                  onChange: function(e) { upd({ userTopic: e.target.value }); },

                  placeholder: "Your interests (basketball, cooking, video games...)",

                  className: "flex-1 px-3 py-1.5 rounded-lg border border-violet-200 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none"

                }),

                userTopic && React.createElement("span", { className: "text-[10px] font-bold text-violet-500" }, "AI will personalize \u2728")

              ),

              // AI loading indicator

              aiLoading && React.createElement("div", { className: "flex items-center justify-center gap-2 p-3 bg-violet-100 rounded-xl border border-violet-200" },

                React.createElement("div", { className: "animate-spin w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full" }),

                React.createElement("span", { className: "text-xs font-bold text-violet-600" }, "Generating with AI...")

              ),



              // Fallacy Spotter

              challengeMode === 'fallacy' && (function() {

                var f = FALLACIES[challengeIdx % FALLACIES.length];

                return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                  React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                    React.createElement("span", { className: "text-2xl" }, "\uD83D\uDD0D"),

                    React.createElement("h3", { className: "font-black text-violet-900" }, "Is this argument valid?"),

                    React.createElement("span", { className: "ml-auto text-xs font-bold text-violet-400" }, (challengeIdx + 1) + " / " + FALLACIES.length)

                  ),

                  React.createElement("div", { className: "p-4 bg-white rounded-xl border border-violet-200 mb-4 text-sm leading-relaxed text-slate-700 italic" },

                    '"' + f.arg + '"'

                  ),

                  // Answer buttons

                  challengeAnswer === null && React.createElement("div", { className: "flex gap-3 justify-center" },

                    React.createElement("button", {

                      onClick: function() {

                        var correct = f.valid === true;

                        upd({ challengeAnswer: correct ? 'correct' : 'wrong' });

                        if (correct && typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Fallacy detected');

                      },

                      className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-300 transition-all hover:shadow-md text-sm"

                    }, "\u2705 Valid"),

                    React.createElement("button", {

                      onClick: function() {

                        var correct = f.valid === false;

                        upd({ challengeAnswer: correct ? 'correct' : 'wrong' });

                        if (correct && typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Fallacy detected');

                      },

                      className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-300 transition-all hover:shadow-md text-sm"

                    }, "\u274C Invalid (Fallacy)")

                  ),

                  // Feedback

                  challengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") },

                      challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite!"

                    ),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, f.name + " — " + f.formal),

                    React.createElement("div", { className: "text-xs text-slate-500" }, f.explain),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", {

                        onClick: function() { upd({ challengeIdx: challengeIdx + 1, challengeAnswer: null, aiFallacy: null }); },

                        className: "px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all"

                      }, "Next \u2192"),

                      React.createElement("button", {

                        onClick: function() {

                          aiGenerate('Generate a logical argument' + topicClause() + ' for a student to evaluate as valid or invalid. Use everyday, relatable language. Return ONLY valid JSON: {"arg":"<natural language argument, 2-3 sentences>","valid":<true or false>,"name":"<fallacy name or Valid Syllogism or Valid Modus Tollens etc.>","formal":"<formal notation like P\u2192Q, Q \u2234 P \u2717 or P\u2192Q, P \u2234 Q \u2713>","explain":"<1-2 sentence explanation of WHY it is valid or invalid>"}. Mix valid and invalid arguments roughly 50/50. Make the argument sound plausible so the student has to think carefully.', 'aiFallacy');

                          upd({ challengeAnswer: null });

                        },

                        className: "px-4 py-2 text-xs font-bold rounded-lg transition-all",

                        style: { background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' },

                        disabled: aiLoading

                      }, "\uD83E\uDD16 AI Generate")

                    )

                  )

                );

              })(),

              // ── AI-generated fallacy card ──

              challengeMode === 'fallacy' && aiFallacy && !aiLoading && (function() {

                var af = aiFallacy;

                return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-purple-300", style: { background: 'linear-gradient(135deg, #faf5ff, #f3e8ff, #faf5ff)' } },

                  React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                    React.createElement("span", { className: "text-2xl" }, "\uD83E\uDD16"),

                    React.createElement("h3", { className: "font-black text-purple-900" }, "AI-Generated: Is this argument valid?"),

                    React.createElement("span", { className: "ml-auto px-2 py-0.5 bg-purple-100 text-purple-600 text-[10px] font-bold rounded-full border border-purple-200" }, "\u2728 AI")

                  ),

                  React.createElement("div", { className: "p-4 bg-white rounded-xl border border-purple-200 mb-4 text-sm leading-relaxed text-slate-700 italic" },

                    '"' + af.arg + '"'

                  ),

                  challengeAnswer === null && React.createElement("div", { className: "flex gap-3 justify-center" },

                    React.createElement("button", {

                      onClick: function() { var c = af.valid === true ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI fallacy detected'); },

                      className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-300 transition-all text-sm"

                    }, "\u2705 Valid"),

                    React.createElement("button", {

                      onClick: function() { var c = af.valid === false ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI fallacy detected'); },

                      className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-300 transition-all text-sm"

                    }, "\u274C Invalid (Fallacy)")

                  ),

                  challengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") },

                      challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite!"

                    ),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, af.name + " \u2014 " + af.formal),

                    React.createElement("div", { className: "text-xs text-slate-500" }, af.explain),

                    React.createElement("button", {

                      onClick: function() {

                        aiGenerate('Generate a logical argument' + topicClause() + ' for a student to evaluate as valid or invalid. Use everyday, relatable language. Return ONLY valid JSON: {"arg":"<natural language argument, 2-3 sentences>","valid":<true or false>,"name":"<fallacy name or Valid Syllogism or Valid Modus Tollens etc.>","formal":"<formal notation like P\u2192Q, Q \u2234 P \u2717 or P\u2192Q, P \u2234 Q \u2713>","explain":"<1-2 sentence explanation of WHY it is valid or invalid>"}. Mix valid and invalid arguments roughly 50/50. Make the argument sound plausible so the student has to think carefully.', 'aiFallacy');

                        upd({ challengeAnswer: null });

                      },

                      className: "mt-3 px-4 py-2 text-xs font-bold rounded-lg transition-all",

                      style: { background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white' },

                      disabled: aiLoading

                    }, "\uD83E\uDD16 Generate Another")

                  )

                );

              })(),



              // Quick-fire Truth Tables

              challengeMode === 'quickfire' && (function() {

                var ch = TT_CHALLENGES[challengeIdx % TT_CHALLENGES.length];

                var table = genTable(ch.expr);

                if (!table) return null;

                var userAnswers = d.qfAnswers || {};

                var allFilled = table.rows.every(function(r, ri) { return userAnswers[ri] !== undefined; });

                var allCorrect = allFilled && table.rows.every(function(r, ri) { return userAnswers[ri] === r.result; });



                return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                  React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                    React.createElement("span", { className: "text-2xl" }, "\u23F1\uFE0F"),

                    React.createElement("h3", { className: "font-black text-violet-900" }, "Fill the Result Column"),

                    React.createElement("span", { className: "ml-auto text-xs font-bold text-violet-400" }, ch.desc)

                  ),

                  React.createElement("code", { className: "block text-center text-lg font-mono font-bold text-violet-800 mb-4 p-2 bg-white rounded-lg" }, ch.expr),

                  React.createElement("table", { className: "w-full text-sm", style: { borderCollapse: 'separate', borderSpacing: '0 2px' } },

                    React.createElement("thead", null,

                      React.createElement("tr", null,

                        table.vars.map(function(v) { return React.createElement("th", { key: v, className: "px-4 py-2 text-violet-600 font-black text-center bg-violet-100" }, v); }),

                        React.createElement("th", { className: "px-4 py-2 text-white font-black text-center", style: { background: _gViolet } }, "Result?")

                      )

                    ),

                    React.createElement("tbody", null,

                      table.rows.map(function(row, ri) {

                        var ua = userAnswers[ri];

                        var showResult = ua !== undefined;

                        var isCorrect = ua === row.result;

                        return React.createElement("tr", { key: ri },

                          table.vars.map(function(v) { return React.createElement("td", { key: v, className: "px-4 py-2 text-center font-bold bg-white " + (row.env[v] ? "text-emerald-600" : "text-slate-400") }, row.env[v] ? "T" : "F"); }),

                          React.createElement("td", { className: "px-4 py-2 text-center" },

                            showResult

                              ? React.createElement("span", { className: "font-black " + (isCorrect ? "text-emerald-600" : "text-red-500") }, (isCorrect ? "\u2705 " : "\u274C ") + (ua ? "T" : "F"))

                              : React.createElement("div", { className: "flex gap-1 justify-center" },

                                  React.createElement("button", {

                                    onClick: function() { var a = Object.assign({}, userAnswers); a[ri] = true; upd({ qfAnswers: a }); },

                                    className: "px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded text-xs"

                                  }, "T"),

                                  React.createElement("button", {

                                    onClick: function() { var a = Object.assign({}, userAnswers); a[ri] = false; upd({ qfAnswers: a }); },

                                    className: "px-2 py-1 bg-red-100 hover:bg-red-200 text-red-600 font-bold rounded text-xs"

                                  }, "F")

                                )

                          )

                        );

                      })

                    )

                  ),

                  allFilled && React.createElement("div", { className: "mt-4 text-center" },

                    React.createElement("div", { className: "font-black text-sm mb-2 " + (allCorrect ? "text-emerald-600" : "text-amber-600") },

                      allCorrect ? "\uD83C\uDF89 Perfect! All correct!" : "\uD83E\uDD14 Some answers are incorrect. Check the red cells."

                    ),

                    allCorrect && (function() { if (typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Quick-fire completed'); return null; })(),

                    React.createElement("button", {

                      onClick: function() { upd({ challengeIdx: challengeIdx + 1, qfAnswers: {} }); },

                      className: "px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all"

                    }, "Next Challenge \u2192")

                  )

                );

              })(),



              // Detective / Real-world reasoning

              challengeMode === 'detective' && (function() {

                var DETECTIVE = [

                  { scenario: 'Detective Jones has three clues:\n1. If the butler did it, the window is broken.\n2. If the maid did it, there are footprints in the garden.\n3. The window is NOT broken.', question: 'Can we conclude the butler is innocent?', answer: true, rule: 'Modus Tollens', explain: 'Clue 1: Butler \u2192 Broken window. Clue 3: \u00ACBroken window. By Modus Tollens: \u00ACButler.' },

                  { scenario: 'At the science fair:\n1. If the volcano project wins, it gets a trophy.\n2. If it gets a trophy, it goes in the display case.\n3. The volcano project wins!', question: 'Will it go in the display case?', answer: true, rule: 'Hypothetical Syllogism + MP', explain: 'Chain: Wins \u2192 Trophy \u2192 Display case. Wins is true. By HS: Wins \u2192 Display case. By MP: Display case.' },

                  { scenario: 'Lunch options:\n1. We\u2019re having pizza OR pasta.\n2. The pizza oven is broken (so no pizza).', question: 'Are we having pasta?', answer: true, rule: 'Disjunctive Syllogism', explain: 'Pizza \u2228 Pasta, \u00ACPizza. By DS: Pasta.' }

                ];

                var det = DETECTIVE[challengeIdx % DETECTIVE.length];

                return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-violet-200", style: { background: _gCard } },

                  React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                    React.createElement("span", { className: "text-2xl" }, "\uD83D\uDD75\uFE0F"),

                    React.createElement("h3", { className: "font-black text-violet-900" }, "Real-World Reasoning")

                  ),

                  React.createElement("pre", { className: "p-4 bg-white rounded-xl border border-violet-200 mb-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-sans" }, det.scenario),

                  React.createElement("div", { className: "p-3 bg-amber-50 rounded-xl border border-amber-200 mb-4 text-sm font-bold text-amber-800" }, "\uD83E\uDD14 " + det.question),

                  challengeAnswer === null && React.createElement("div", { className: "flex gap-3 justify-center" },

                    React.createElement("button", { onClick: function() { var c = det.answer === true ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Detective reasoning'); }, className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-300 transition-all text-sm" }, "\u2705 Yes"),

                    React.createElement("button", { onClick: function() { var c = det.answer === false ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 3, 'Detective reasoning'); }, className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-300 transition-all text-sm" }, "\u274C No"),

                    React.createElement("button", { onClick: function() { var c = 'wrong'; upd({ challengeAnswer: c }); }, className: "px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl border-2 border-slate-300 transition-all text-sm" }, "\u2753 Can't tell")

                  ),

                  challengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") }, challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite."),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, "Rule: " + det.rule),

                    React.createElement("div", { className: "text-xs text-slate-500" }, det.explain),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function() { upd({ challengeIdx: challengeIdx + 1, challengeAnswer: null, aiDetective: null }); }, className: "px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all" }, "Next \u2192"),

                      React.createElement("button", {

                        onClick: function() {

                          aiGenerate('Generate a logic detective scenario' + topicClause() + ' for a student. Present 2-4 numbered clues as conditional statements that can be resolved using one of: Modus Ponens, Modus Tollens, Hypothetical Syllogism, or Disjunctive Syllogism. Return ONLY valid JSON: {"scenario":"<multi-line scenario with numbered clues>","question":"<yes/no question>","answer":<true or false>,"rule":"<which inference rule solves it>","explain":"<step-by-step logical derivation using symbols>"}', 'aiDetective');

                          upd({ challengeAnswer: null });

                        },

                        className: "px-4 py-2 text-xs font-bold rounded-lg transition-all",

                        style: { background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.3)' },

                        disabled: aiLoading

                      }, "\uD83D\uDD75\uFE0F AI Mystery")

                    )

                  )

                );

              })(),

              // ── AI-generated detective scenario ──

              challengeMode === 'detective' && aiDetective && !aiLoading && (function() {

                var ad = aiDetective;

                return React.createElement("div", { className: "p-6 rounded-2xl border-2 border-purple-300", style: { background: 'linear-gradient(135deg, #faf5ff, #f3e8ff, #faf5ff)' } },

                  React.createElement("div", { className: "flex items-center gap-2 mb-4" },

                    React.createElement("span", { className: "text-2xl" }, "\uD83D\uDD75\uFE0F"),

                    React.createElement("h3", { className: "font-black text-purple-900" }, "AI Mystery"),

                    React.createElement("span", { className: "ml-auto px-2 py-0.5 bg-purple-100 text-purple-600 text-[10px] font-bold rounded-full border border-purple-200" }, "\u2728 AI")

                  ),

                  React.createElement("pre", { className: "p-4 bg-white rounded-xl border border-purple-200 mb-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap font-sans" }, ad.scenario),

                  React.createElement("div", { className: "p-3 bg-amber-50 rounded-xl border border-amber-200 mb-4 text-sm font-bold text-amber-800" }, "\uD83E\uDD14 " + ad.question),

                  challengeAnswer === null && React.createElement("div", { className: "flex gap-3 justify-center" },

                    React.createElement("button", { onClick: function() { var c = ad.answer === true ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI detective reasoning'); }, className: "px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl border-2 border-emerald-300 transition-all text-sm" }, "\u2705 Yes"),

                    React.createElement("button", { onClick: function() { var c = ad.answer === false ? 'correct' : 'wrong'; upd({ challengeAnswer: c }); if (c === 'correct' && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'AI detective reasoning'); }, className: "px-6 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl border-2 border-red-300 transition-all text-sm" }, "\u274C No"),

                    React.createElement("button", { onClick: function() { upd({ challengeAnswer: 'wrong' }); }, className: "px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl border-2 border-slate-300 transition-all text-sm" }, "\u2753 Can't tell")

                  ),

                  challengeAnswer && React.createElement("div", { className: "mt-4 p-4 rounded-xl border-2 " + (challengeAnswer === 'correct' ? "bg-emerald-50 border-emerald-300" : "bg-red-50 border-red-300") },

                    React.createElement("div", { className: "font-black text-sm mb-1 " + (challengeAnswer === 'correct' ? "text-emerald-700" : "text-red-700") }, challengeAnswer === 'correct' ? "\uD83C\uDF89 Correct!" : "\u274C Not quite."),

                    React.createElement("div", { className: "text-xs font-bold text-slate-600 mb-1" }, "Rule: " + ad.rule),

                    React.createElement("div", { className: "text-xs text-slate-500" }, ad.explain),

                    React.createElement("button", {

                      onClick: function() {

                        aiGenerate('Generate a logic detective scenario' + topicClause() + ' for a student. Present 2-4 numbered clues as conditional statements that can be resolved using one of: Modus Ponens, Modus Tollens, Hypothetical Syllogism, or Disjunctive Syllogism. Return ONLY valid JSON: {"scenario":"<multi-line scenario with numbered clues>","question":"<yes/no question>","answer":<true or false>,"rule":"<which inference rule solves it>","explain":"<step-by-step logical derivation using symbols>"}', 'aiDetective');

                        upd({ challengeAnswer: null });

                      },

                      className: "mt-3 px-4 py-2 text-xs font-bold rounded-lg transition-all",

                      style: { background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white' },

                      disabled: aiLoading

                    }, "\uD83D\uDD75\uFE0F Generate Another")

                  )

                );

              })()

            ),



            // ═══ EDUCATIONAL PANEL ═══

            React.createElement("div", { className: "mt-6" },

              React.createElement("button", {

                onClick: function() { upd({ showEdu: !showEdu }); if (!showEdu && typeof awardStemXP === 'function') awardStemXP('logicLab', 5, 'First logic session'); },

                className: "w-full p-4 rounded-2xl border-2 border-violet-200 text-left transition-all hover:shadow-md flex items-center gap-3",

                style: { background: showEdu ? 'linear-gradient(135deg, #f5f3ff, #ede9fe)' : 'white' }

              },

                React.createElement("span", { className: "text-xl" }, "\uD83D\uDCD6"),

                React.createElement("span", { className: "font-black text-violet-900 text-sm flex-1" }, "Learn: What is Propositional Logic?"),

                React.createElement("span", { className: "text-violet-400 font-bold text-xs" }, showEdu ? "\u25B2 Hide" : "\u25BC Show")

              ),

              showEdu && React.createElement("div", { className: "mt-2 p-5 rounded-2xl border border-violet-200 space-y-4 text-sm text-slate-700 leading-relaxed", style: { background: _gCard } },

                React.createElement("div", null,

                  React.createElement("h4", { className: "font-black text-violet-800 mb-1" }, "What is Propositional Logic?"),

                  React.createElement("p", null, "Propositional logic studies how the truth of complex statements depends on simpler ones. A ", React.createElement("strong", null, "proposition"), " is any statement that is either true or false \u2014 like \"It is raining\" or \"2 + 2 = 4\".")

                ),

                React.createElement("div", null,

                  React.createElement("h4", { className: "font-black text-violet-800 mb-1" }, "Connective Symbols"),

                  React.createElement("table", { className: "w-full text-xs" },

                    React.createElement("tbody", null,

                      [['∧','AND','Both must be true'],['∨','OR','At least one true'],['¬','NOT','Flips truth value'],['→','IF...THEN','False only when P true, Q false'],['↔','IFF','True when both same'],['⊕','XOR','True when exactly one true']].map(function(r) {

                        return React.createElement("tr", { key: r[0], className: "border-b border-violet-100" },

                          React.createElement("td", { className: "py-1.5 font-mono font-bold text-violet-700 w-10 text-center" }, r[0]),

                          React.createElement("td", { className: "py-1.5 font-bold text-violet-600 w-24" }, r[1]),

                          React.createElement("td", { className: "py-1.5 text-slate-500" }, r[2])

                        );

                      })

                    )

                  )

                ),

                React.createElement("div", null,

                  React.createElement("h4", { className: "font-black text-violet-800 mb-1" }, "Valid vs Invalid Arguments"),

                  React.createElement("p", null, "A ", React.createElement("strong", null, "valid"), " argument guarantees the conclusion IF the premises are true. An ", React.createElement("strong", null, "invalid"), " argument (fallacy) has a logical gap \u2014 even if the premises are true, the conclusion doesn't necessarily follow."),

                  React.createElement("p", { className: "mt-1 text-violet-600 font-bold" }, "Common fallacies: Affirming the Consequent (P\u2192Q, Q \u2234 P\u2717), Denying the Antecedent (P\u2192Q, \u00ACP \u2234 \u00ACQ\u2717)")

                )

              )

            ),



            // ═══ BACK BUTTON ═══

            React.createElement("div", { className: "mt-6 text-center" },

              React.createElement("button", {

                onClick: function() { setStemLabTool(null); },

                className: "px-6 py-2.5 text-sm font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition-all"

              }, "\u2190 Back to Tools")

            )

          );
      })();
    }
  });


  console.log('[StemLab] stem_tool_math.js loaded — 13 tools');
})();
