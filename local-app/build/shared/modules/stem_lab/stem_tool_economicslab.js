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
    icon: '\uD83D\uDCB9',
    label: 'economicsLab',
    desc: '',
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

          var enDay = d.enDay || 1;

          var enCash = d.enCash !== undefined ? d.enCash : 20;

          var enPrice = d.enPrice || 1.00;

          var enCups = d.enCups || 30;

          var enAdBudget = d.enAdBudget || 0;

          var enWeather = d.enWeather || 'sunny';

          var enHistory = d.enHistory || [];



          // â”€â”€ National Economy (Macro) State â”€â”€

          var macroGDP = d.macroGDP || 2.1;

          var macroInflation = d.macroInflation || 3.2;

          var macroInterest = d.macroInterest || 5.25;

          var macroUnemployment = d.macroUnemployment || 3.8;

          var macroTrade = d.macroTrade || -0.5;

          var macroYear = d.macroYear || 2025;

          var macroHistory = d.macroHistory || [];



          // â”€â”€ Achievement Tracking â”€â”€

          var econAchievements = [];

          if ((d.pfCash || 0) >= 100000) econAchievements.push({ icon: '\uD83D\uDCB0', title: 'Six Figures', desc: 'Saved $100K+' });

          if ((d.pfCash || 0) >= 1000000) econAchievements.push({ icon: '\uD83D\uDC8E', title: 'Millionaire', desc: 'Net worth $1M+' });

          if ((d.pfAge || 22) >= 65 && (d.pfCash || 0) > 500000) econAchievements.push({ icon: '\uD83C\uDFD6\uFE0F', title: 'Comfortable Retirement', desc: 'Retired with $500K+' });

          if ((d.pfCredit || 650) >= 800) econAchievements.push({ icon: '\u2B50', title: 'Excellent Credit', desc: 'Credit score 800+' });

          if ((d.pfHappiness || 70) >= 95) econAchievements.push({ icon: '\uD83C\uDF1F', title: 'Living the Dream', desc: '95%+ happiness' });

          if ((d.pfDebt || 0) === 0 && (d.pfAge || 22) > 25) econAchievements.push({ icon: '\u2705', title: 'Debt Free', desc: 'Eliminated all debt' });

          var smTotalVal = (d.smCash || 10000) + (d.smCompanies || []).reduce(function (s, c) { return s + ((d.smPortfolio || {})[c.ticker] || 0) * c.price; }, 0);

          if (smTotalVal >= 15000) econAchievements.push({ icon: '\uD83D\uDCC8', title: 'Market Gains', desc: 'Portfolio grew 50%+' });

          if (smTotalVal >= 25000) econAchievements.push({ icon: '\uD83D\uDE80', title: 'Wall Street Wolf', desc: 'Portfolio hit $25K' });

          if ((d.smDay || 0) >= 30) econAchievements.push({ icon: '\uD83D\uDCC5', title: 'Seasoned Trader', desc: '30+ trading days' });

          if ((d.enBizDay || 0) >= 20) econAchievements.push({ icon: '\uD83C\uDFC6', title: 'Business Survivor', desc: '20+ days in business' });

          if ((d.enBizCash || 0) >= 50000) econAchievements.push({ icon: '\uD83D\uDCBC', title: 'Tycoon', desc: 'Business cash $50K+' });

          if ((d.enBizRep || 0) >= 90) econAchievements.push({ icon: '\uD83C\uDF1F', title: '5-Star Business', desc: 'Reputation 90+' });

          if ((d.enBizEmployees || 0) >= 5) econAchievements.push({ icon: '\uD83D\uDC65', title: 'Job Creator', desc: 'Hired 5+ employees' });

          if ((d.macroHistory || []).length >= 10) econAchievements.push({ icon: '\uD83C\uDFDB\uFE0F', title: 'Policy Veteran', desc: '10+ years of policy' });

          if (macroGDP >= 5) econAchievements.push({ icon: '\uD83D\uDCC8', title: 'Economic Boom', desc: 'GDP growth 5%+' });

          if (macroUnemployment <= 2) econAchievements.push({ icon: '\uD83D\uDCAA', title: 'Full Employment', desc: 'Unemployment <2%' });

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

          if (conceptsLearned >= 5) econAchievements.push({ icon: '\uD83D\uDCDA', title: 'Student', desc: '5+ concepts learned' });

          if (conceptsLearned >= 15) econAchievements.push({ icon: '\uD83C\uDF93', title: 'Economics Major', desc: '15+ concepts learned' });

          if (conceptsLearned >= 30) econAchievements.push({ icon: '\uD83E\uDDD1\u200D\uD83C\uDF93', title: 'PhD Economist', desc: '30+ concepts learned' });

          // === Wave 1: ECON_CONCEPTS ===
          var ECON_CONCEPTS = [
            { id: 'scarcity', name: 'Scarcity', icon: '\u26A0\uFE0F', def: 'Limited resources vs unlimited wants. The fundamental economic problem.', example: 'There are only 24 hours in a day \u2014 you can\'t do everything.', category: 'fundamentals' },
            { id: 'oppCost', name: 'Opportunity Cost', icon: '\uD83D\uDD04', def: 'The value of the next best alternative you give up when making a choice.', example: 'Going to college costs tuition PLUS the salary you could have earned working.', category: 'fundamentals' },
            { id: 'supplyDemand', name: 'Supply & Demand', icon: '\u2696\uFE0F', def: 'Prices are determined by the interaction of buyers (demand) and sellers (supply).', example: 'When a new iPhone launches, high demand + limited supply = high price.', category: 'micro' },
            { id: 'marginal', name: 'Marginal Analysis', icon: '\uD83D\uDCC8', def: 'Decisions should be made by comparing the additional (marginal) benefit to the additional cost.', example: 'Is one more hour of study worth giving up one more hour of sleep?', category: 'fundamentals' },
            { id: 'incentives', name: 'Incentives', icon: '\uD83C\uDFAF', def: 'People respond to rewards and penalties. Change the incentives, change the behavior.', example: 'Tax credits for electric cars increase EV purchases.', category: 'fundamentals' },
            { id: 'gdp', name: 'GDP', icon: '\uD83C\uDFDB\uFE0F', def: 'Gross Domestic Product: total value of all goods and services produced in a country in a year.', example: 'US GDP is ~$27 trillion (2024). GDP = C + I + G + (X - M).', category: 'macro' },
            { id: 'inflation', name: 'Inflation', icon: '\uD83D\uDCC8', def: 'A general increase in prices over time, reducing purchasing power.', example: 'If inflation is 3%, something that cost $100 last year costs $103 now.', category: 'macro' },
            { id: 'unemployment', name: 'Unemployment', icon: '\uD83D\uDCBC', def: 'The percentage of the labor force that is jobless and actively seeking work.', example: 'Frictional (between jobs), structural (skills mismatch), cyclical (recession).', category: 'macro' },
            { id: 'compAdv', name: 'Comparative Advantage', icon: '\uD83C\uDF0D', def: 'Countries should specialize in producing goods where they have the lowest opportunity cost.', example: 'Even if Country A is better at everything, both benefit by specializing.', category: 'trade' },
            { id: 'elasticity', name: 'Elasticity', icon: '\uD83C\uDFF9', def: 'How much quantity demanded/supplied changes in response to a price change.', example: 'Gasoline is inelastic (need it regardless), luxury goods are elastic.', category: 'micro' },
            { id: 'externality', name: 'Externalities', icon: '\u2601\uFE0F', def: 'Costs or benefits that affect third parties not involved in the transaction.', example: 'Pollution (negative externality), education (positive externality).', category: 'micro' },
            { id: 'publicGood', name: 'Public Goods', icon: '\uD83D\uDEE3\uFE0F', def: 'Non-rival and non-excludable goods that markets underprovide.', example: 'National defense, street lights, public parks.', category: 'micro' },
            { id: 'moneySupply', name: 'Money Supply', icon: '\uD83D\uDCB5', def: 'The total amount of money circulating in the economy, controlled by the central bank.', example: 'The Fed controls M1 (cash + checking) and M2 (M1 + savings + CDs).', category: 'macro' },
            { id: 'fiscalPolicy', name: 'Fiscal Policy', icon: '\uD83C\uDFDB\uFE0F', def: 'Government use of taxation and spending to influence the economy.', example: 'Stimulus checks during COVID = expansionary fiscal policy.', category: 'macro' },
            { id: 'monetaryPolicy', name: 'Monetary Policy', icon: '\uD83C\uDFE6', def: 'Central bank actions (interest rates, money supply) to manage the economy.', example: 'The Fed raising interest rates to fight inflation.', category: 'macro' },
            { id: 'tradeoff', name: 'Trade-offs', icon: '\u2194\uFE0F', def: 'Every choice involves giving something up. There is no free lunch.', example: 'More military spending = less education funding (government budget).', category: 'fundamentals' },
            { id: 'marketFailure', name: 'Market Failure', icon: '\u274C', def: 'When free markets fail to allocate resources efficiently.', example: 'Monopolies, externalities, public goods, information asymmetry.', category: 'micro' },
            { id: 'compoundInterest', name: 'Compound Interest', icon: '\uD83D\uDCCA', def: 'Interest earned on interest. The most powerful force in finance.', example: '$1,000 at 7% for 30 years = $7,612. Time is your greatest asset!', category: 'finance' },
            { id: 'riskReturn', name: 'Risk vs Return', icon: '\u2696\uFE0F', def: 'Higher potential returns require accepting higher risk.', example: 'Stocks: ~10% return, high risk. Bonds: ~4% return, low risk.', category: 'finance' },
            { id: 'diversification', name: 'Diversification', icon: '\uD83E\uDDE9', def: 'Spreading investments across many assets to reduce risk.', example: '"Don\'t put all your eggs in one basket." Index funds diversify automatically.', category: 'finance' }
          ];

          // === Wave 1: FAMOUS_ECONOMISTS ===
          var FAMOUS_ECONOMISTS = [
            { name: 'Adam Smith', years: '1723\u20131790', icon: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74\uDB40\uDC7F', contribution: 'Father of Economics', work: 'The Wealth of Nations (1776)', idea: 'The "invisible hand" of the market: individuals pursuing self-interest unintentionally benefit society. Division of labor increases productivity.', school: 'Classical' },
            { name: 'Karl Marx', years: '1818\u20131883', icon: '\uD83C\uDDE9\uD83C\uDDEA', contribution: 'Class Struggle Theory', work: 'Das Kapital (1867)', idea: 'Capitalism exploits workers. Class conflict between bourgeoisie (owners) and proletariat (workers) drives history.', school: 'Marxian' },
            { name: 'John Maynard Keynes', years: '1883\u20131946', icon: '\uD83C\uDDEC\uD83C\uDDE7', contribution: 'Macroeconomics Pioneer', work: 'General Theory (1936)', idea: 'Government spending can stimulate the economy during recessions. "In the long run, we are all dead."', school: 'Keynesian' },
            { name: 'Milton Friedman', years: '1912\u20132006', icon: '\uD83C\uDDFA\uD83C\uDDF8', contribution: 'Monetarism', work: 'Capitalism and Freedom (1962)', idea: 'Inflation is always a monetary phenomenon. Free markets work better than government intervention.', school: 'Chicago/Monetarist' },
            { name: 'Friedrich Hayek', years: '1899\u20131992', icon: '\uD83C\uDDE6\uD83C\uDDF9', contribution: 'Austrian Economics', work: 'The Road to Serfdom (1944)', idea: 'Central planning leads to tyranny. Market prices contain information no planner can replicate.', school: 'Austrian' },
            { name: 'Paul Samuelson', years: '1915\u20132009', icon: '\uD83C\uDDFA\uD83C\uDDF8', contribution: 'Mathematical Economics', work: 'Economics Textbook (1948)', idea: 'Made economics rigorous with math. His textbook taught economics to millions of students worldwide.', school: 'Neo-Keynesian' },
            { name: 'Janet Yellen', years: '1946\u2013', icon: '\uD83C\uDDFA\uD83C\uDDF8', contribution: 'First Female Fed Chair & Treasury Sec', work: 'Labor economics research', idea: 'Focused on unemployment and labor markets. Advocated for data-driven monetary policy.', school: 'New Keynesian' },
            { name: 'Thomas Sowell', years: '1930\u2013', icon: '\uD83C\uDDFA\uD83C\uDDF8', contribution: 'Economics & Social Policy', work: 'Basic Economics (2000)', idea: 'Economics is about trade-offs, not solutions. Price controls create shortages. Incentives matter more than intentions.', school: 'Chicago' },
            { name: 'Elinor Ostrom', years: '1933\u20132012', icon: '\uD83C\uDDFA\uD83C\uDDF8', contribution: 'First Female Economics Nobel', work: 'Governing the Commons (1990)', idea: 'Communities can manage shared resources without government or privatization through self-governance.', school: 'Institutional' },
            { name: 'Daniel Kahneman', years: '1934\u20132024', icon: '\uD83C\uDDEE\uD83C\uDDF1', contribution: 'Behavioral Economics', work: 'Thinking, Fast and Slow (2011)', idea: 'Humans are NOT rational. Cognitive biases (loss aversion, anchoring, framing) affect all economic decisions.', school: 'Behavioral' }
          ];

          // === Wave 1: MARKET_STRUCTURES ===
          var MARKET_STRUCTURES = [
            { id: 'perfect', name: 'Perfect Competition', sellers: 'Many', product: 'Identical', barriers: 'None', pricing: 'Price taker', profit: 'Normal (long run)', examples: 'Farming, commodities', color: '#22c55e', icon: '\uD83C\uDF3E' },
            { id: 'monopolistic', name: 'Monopolistic Competition', sellers: 'Many', product: 'Differentiated', barriers: 'Low', pricing: 'Some power', profit: 'Normal (long run)', examples: 'Restaurants, clothing', color: '#3b82f6', icon: '\uD83D\uDC54' },
            { id: 'oligopoly', name: 'Oligopoly', sellers: 'Few', product: 'Similar/Identical', barriers: 'High', pricing: 'Interdependent', profit: 'Above normal', examples: 'Airlines, cell carriers, cars', color: '#f59e0b', icon: '\u2708\uFE0F' },
            { id: 'monopoly', name: 'Monopoly', sellers: 'One', product: 'Unique', barriers: 'Very high', pricing: 'Price maker', profit: 'Above normal', examples: 'Utilities, patents, De Beers', color: '#ef4444', icon: '\uD83D\uDC51' }
          ];

          // === Wave 1: GDP_COMPONENTS ===
          var GDP_COMPONENTS = [
            { id: 'C', name: 'Consumption', pct: 68, color: '#3b82f6', icon: '\uD83D\uDED2', desc: 'Household spending on goods and services. The largest component of GDP.', examples: 'Food, clothing, healthcare, entertainment, housing' },
            { id: 'I', name: 'Investment', pct: 18, color: '#22c55e', icon: '\uD83C\uDFED', desc: 'Business spending on capital goods, new construction, and inventory changes.', examples: 'Factories, equipment, new homes, software' },
            { id: 'G', name: 'Government', pct: 17, color: '#f59e0b', icon: '\uD83C\uDFDB\uFE0F', desc: 'Government spending on goods and services (excludes transfer payments like Social Security).', examples: 'Military, roads, schools, public employees' },
            { id: 'NX', name: 'Net Exports (X-M)', pct: -3, color: '#ef4444', icon: '\uD83D\uDEA2', desc: 'Exports minus imports. Currently negative for the US (trade deficit).', examples: 'US exports tech/agriculture, imports oil/electronics' }
          ];

          // === Wave 1: ECONOMIC_INDICATORS ===
          var ECONOMIC_INDICATORS = [
            { name: 'GDP Growth Rate', desc: 'Percentage change in real GDP. 2-3% is healthy.', good: '>2%', bad: '<0% (recession)', icon: '\uD83D\uDCC8' },
            { name: 'CPI (Consumer Price Index)', desc: 'Measures average price changes. The main inflation gauge.', good: '2% target', bad: '>5% (high inflation)', icon: '\uD83D\uDCB2' },
            { name: 'Unemployment Rate', desc: 'Percent of labor force without jobs. Natural rate is ~4%.', good: '<5%', bad: '>7%', icon: '\uD83D\uDCBC' },
            { name: 'Federal Funds Rate', desc: 'Interest rate banks charge each other. The Fed\'s main tool.', good: 'Depends on inflation', bad: 'Too high or too low', icon: '\uD83C\uDFE6' },
            { name: 'S&P 500', desc: 'Index of 500 large US companies. Proxy for the stock market.', good: 'Upward trend', bad: '>20% drop (bear market)', icon: '\uD83D\uDCC9' },
            { name: 'Consumer Confidence', desc: 'Survey of how optimistic consumers feel about the economy.', good: 'Rising', bad: 'Sharp decline', icon: '\uD83D\uDE04' },
            { name: 'Housing Starts', desc: 'Number of new residential construction projects begun.', good: 'Steady growth', bad: 'Sharp decline', icon: '\uD83C\uDFE0' },
            { name: 'Trade Balance', desc: 'Exports minus imports. Surplus = positive, deficit = negative.', good: 'Balance/surplus', bad: 'Large persistent deficit', icon: '\uD83D\uDEA2' },
            { name: 'National Debt', desc: 'Total government borrowing. US debt is ~$34 trillion (2024).', good: 'Stable debt-to-GDP', bad: 'Rising faster than GDP', icon: '\uD83D\uDCB3' },
            { name: 'Yield Curve', desc: 'Plots interest rates vs bond maturity. Inverted = recession signal.', good: 'Normal (upward)', bad: 'Inverted (downward)', icon: '\uD83D\uDCC9' },
            { name: 'PMI (Purchasing Managers)', desc: 'Survey of manufacturing activity. >50 = expanding, <50 = contracting.', good: '>50', bad: '<45', icon: '\uD83C\uDFED' },
            { name: 'Gini Coefficient', desc: 'Measures income inequality. 0 = perfect equality, 1 = maximum inequality.', good: '<0.3 (low inequality)', bad: '>0.5 (high inequality)', icon: '\u2696\uFE0F' }
          ];

          // === Wave 2: BUSINESS_CYCLE_PHASES ===
          var BUSINESS_CYCLE_PHASES = [
            { id: 'expansion', name: 'Expansion', icon: '\uD83D\uDCC8', color: '#22c55e', duration: '3-10 years',
              characteristics: ['GDP rising', 'Unemployment falling', 'Business investment increasing', 'Consumer confidence high', 'Stock market rising'],
              policy: 'Central bank may raise interest rates to prevent overheating. Government may reduce stimulus spending.',
              indicators: 'PMI > 50, unemployment < 5%, GDP growth > 2%' },
            { id: 'peak', name: 'Peak', icon: '\u26A0\uFE0F', color: '#f59e0b', duration: 'Brief turning point',
              characteristics: ['GDP at maximum', 'Inflation accelerating', 'Asset bubbles forming', 'Labor shortage', 'Over-optimism'],
              policy: 'Warning signs appear. Wise investors start being cautious. "Be fearful when others are greedy."',
              indicators: 'Inflation > 4%, yield curve flattening, very low unemployment' },
            { id: 'contraction', name: 'Contraction/Recession', icon: '\uD83D\uDCC9', color: '#ef4444', duration: '6-18 months',
              characteristics: ['GDP declining (2+ consecutive quarters)', 'Unemployment rising rapidly', 'Business failures increasing', 'Consumer spending drops', 'Stock market declining'],
              policy: 'Fed cuts interest rates. Government increases spending (stimulus, unemployment benefits). "Buy when there\'s blood in the streets."',
              indicators: 'GDP < 0%, unemployment rising, consumer confidence collapsing' },
            { id: 'trough', name: 'Trough', icon: '\uD83D\uDCA1', color: '#3b82f6', duration: 'Brief turning point',
              characteristics: ['GDP at minimum', 'Unemployment at maximum', 'Bargain prices on assets', 'New opportunities emerge', 'Recovery begins'],
              policy: 'Stimulus spending continues. Interest rates at floor. Smart investors buy undervalued assets.',
              indicators: 'GDP stabilizing, layoffs slowing, leading indicators turning up' }
          ];

          // === Wave 2: ECON_SCHOOLS ===
          var ECON_SCHOOLS = [
            { name: 'Classical', era: '1776-1930s', icon: '\uD83C\uDFDB\uFE0F', color: '#8b5cf6', key: 'Markets self-correct. Government should stay out.', famous: 'Adam Smith, David Ricardo', govRole: 'Minimal', onRecession: 'Wait it out \u2014 markets adjust', onInflation: 'Reduce money supply' },
            { name: 'Keynesian', era: '1936-present', icon: '\uD83D\uDCB5', color: '#3b82f6', key: 'Government spending can fix recessions. Demand drives the economy.', famous: 'John Maynard Keynes', govRole: 'Active fiscal policy', onRecession: 'Government spends MORE', onInflation: 'Government spends LESS' },
            { name: 'Monetarist', era: '1960s-present', icon: '\uD83C\uDFE6', color: '#f59e0b', key: 'Control the money supply. Inflation is always monetary.', famous: 'Milton Friedman', govRole: 'Stable money growth rules', onRecession: 'Expand money supply steadily', onInflation: 'Restrict money supply' },
            { name: 'Austrian', era: '1870s-present', icon: '\u26A1', color: '#ef4444', key: 'Free markets, no central planning. Government causes more problems than it solves.', famous: 'Hayek, Mises, Rothbard', govRole: 'None/minimal', onRecession: 'Let bad businesses fail', onInflation: 'End central banking' },
            { name: 'Behavioral', era: '2000s-present', icon: '\uD83E\uDDE0', color: '#10b981', key: 'People are irrational. Psychology drives economic decisions.', famous: 'Kahneman, Thaler, Ariely', govRole: '"Nudge" better decisions', onRecession: 'Address panic/confidence', onInflation: 'Anchor expectations' },
            { name: 'MMT (Modern Monetary)', era: '2010s-present', icon: '\uD83D\uDDA8\uFE0F', color: '#ec4899', key: 'Governments that print their own currency can\'t go broke. Deficits don\'t matter (much).', famous: 'Stephanie Kelton', govRole: 'Spend freely, tax to control inflation', onRecession: 'Print and spend', onInflation: 'Raise taxes to remove money' }
          ];

          // === Wave 2: BUDGET_RULES ===
          var BUDGET_RULES = [
            { name: '50/30/20 Rule', icon: '\uD83D\uDCB0', desc: 'The most popular simple budgeting framework.',
              parts: [
                { label: 'Needs', pct: 50, color: '#ef4444', items: 'Rent, food, utilities, insurance, minimum debt payments, transportation' },
                { label: 'Wants', pct: 30, color: '#3b82f6', items: 'Dining out, entertainment, hobbies, subscriptions, vacations' },
                { label: 'Savings', pct: 20, color: '#22c55e', items: 'Emergency fund, retirement, investments, extra debt payments' }
              ] },
            { name: 'Pay Yourself First', icon: '\uD83C\uDFE6', desc: 'Save a fixed percentage BEFORE spending on anything else.',
              parts: [
                { label: 'Savings First', pct: 20, color: '#22c55e', items: 'Automatically transfer to savings/investments on payday' },
                { label: 'Bills', pct: 50, color: '#f59e0b', items: 'Fixed expenses after savings are set aside' },
                { label: 'Flexible', pct: 30, color: '#3b82f6', items: 'Whatever remains for discretionary spending' }
              ] },
            { name: 'Zero-Based Budget', icon: '\uD83D\uDCDD', desc: 'Every dollar gets assigned a job. Income minus expenses = exactly zero.',
              parts: [
                { label: 'Essential', pct: 55, color: '#ef4444', items: 'Housing, food, transport, utilities' },
                { label: 'Goals', pct: 25, color: '#22c55e', items: 'Savings, debt payoff, investments' },
                { label: 'Lifestyle', pct: 20, color: '#3b82f6', items: 'Fun, dining, hobbies — every dollar planned' }
              ] }
          ];

          // === Wave 3: ECON_SCENARIOS ===
          var ECON_SCENARIOS = [
            { id: 1, scenario: 'You just got a $5,000 tax refund. You have $3,000 in credit card debt at 22% APR and no emergency fund.', question: 'What should you do FIRST?',
              options: ['Invest in stocks', 'Pay off credit card debt', 'Buy something nice', 'Put it all in savings'], correct: 1,
              explain: 'Pay off the 22% APR credit card first! No investment reliably returns 22%. Paying off high-interest debt is the best guaranteed "return" you can get. After that, build your emergency fund.',
              concept: 'Opportunity Cost & Guaranteed Returns' },
            { id: 2, scenario: 'Gas prices jumped from $3 to $5 per gallon. Your commute is 30 miles each way.', question: 'Why doesn\'t gas demand drop as much as you\'d expect?',
              options: ['People like expensive gas', 'Gas is price inelastic', 'Supply increased', 'Government subsidies'], correct: 1,
              explain: 'Gasoline has few substitutes for most commuters \u2014 you need it to get to work. This makes it price INELASTIC: even large price changes produce small quantity changes. That\'s why gas taxes raise a lot of revenue.',
              concept: 'Price Elasticity of Demand' },
            { id: 3, scenario: 'The Federal Reserve just raised interest rates by 0.75%. The stock market dropped 3% the same day.', question: 'Why does raising rates hurt stocks?',
              options: ['The Fed hates stocks', 'Higher rates make borrowing expensive, slowing growth', 'It\'s random coincidence', 'Taxes went up'], correct: 1,
              explain: 'Higher interest rates increase borrowing costs for businesses (less investment, less growth) and make bonds more attractive relative to stocks. Future corporate profits are also "discounted" at a higher rate, reducing stock valuations.',
              concept: 'Monetary Policy & Interest Rates' },
            { id: 4, scenario: 'Country A can make 100 cars OR 50 computers per year. Country B can make 80 cars OR 80 computers.', question: 'Which country has comparative advantage in computers?',
              options: ['Country A', 'Country B', 'Neither', 'Both'], correct: 1,
              explain: 'Country B! For Country A, 1 computer costs 2 cars (100/50). For Country B, 1 computer costs 1 car (80/80). Country B gives up fewer cars per computer, so it has the LOWER opportunity cost for computers.',
              concept: 'Comparative Advantage & Trade' },
            { id: 5, scenario: 'A city passes a rent control law capping apartment rent at $800/month. Market rate is $1,200.', question: 'What is the most likely long-term effect?',
              options: ['More affordable housing', 'Housing shortage', 'Landlords build more apartments', 'No effect'], correct: 1,
              explain: 'Price ceilings below equilibrium create SHORTAGES. At $800, more people want apartments (high Qd) but landlords supply fewer (low Qs). Long-term: less maintenance, fewer new apartments built, black markets, discrimination in tenant selection.',
              concept: 'Price Ceilings & Shortages' },
            { id: 6, scenario: 'You can earn $50,000/year at your current job, or go to grad school for 2 years (tuition: $30,000/year).', question: 'What is the TRUE cost of grad school?',
              options: ['$60,000 (tuition only)', '$100,000 (tuition + lost wages)', '$160,000 (tuition + lost wages)', '$30,000 (one year tuition)'], correct: 2,
              explain: '$160,000! Tuition: $30K \u00D7 2 = $60K. Plus opportunity cost: $50K salary \u00D7 2 = $100K in wages you gave up. Total: $160K. Opportunity cost is the most important concept in economics!',
              concept: 'Opportunity Cost' },
            { id: 7, scenario: 'During COVID, the government sent $1,200 stimulus checks to most Americans and the Fed printed trillions.', question: 'What economic consequence followed in 2021-2022?',
              options: ['Deflation', 'High inflation', 'Lower unemployment', 'Trade surplus'], correct: 1,
              explain: 'Too much money chasing too few goods = INFLATION. Supply chains were disrupted (less supply) while stimulus increased spending power (more demand). Inflation hit 9.1% in June 2022 \u2014 the highest in 40 years.',
              concept: 'Money Supply & Inflation' },
            { id: 8, scenario: 'Two gas stations are across the street from each other. One drops its price by $0.05.', question: 'What will the other station likely do?',
              options: ['Raise its price', 'Keep the same price', 'Match or beat the price drop', 'Close permanently'], correct: 2,
              explain: 'This is oligopoly behavior! With few sellers of an identical product, firms are interdependent. They tend to match competitors\' price cuts (kinked demand curve) but NOT price increases. This is why gas stations cluster and have similar prices.',
              concept: 'Oligopoly & Game Theory' },
            { id: 9, scenario: 'A factory pollutes a river, causing $2 million in damage to downstream fisheries. The factory pays nothing.', question: 'What type of market failure is this?',
              options: ['Monopoly', 'Public good', 'Negative externality', 'Information asymmetry'], correct: 2,
              explain: 'Negative externality! The factory imposes costs on third parties (fisheries) who aren\'t part of the transaction. The market price doesn\'t reflect the true social cost. Solutions: Pigouvian tax, cap-and-trade, regulation, or Coase bargaining.',
              concept: 'Externalities & Market Failure' },
            { id: 10, scenario: 'You\'re 25 years old. Your employer offers a 401(k) match: they\'ll match your contribution up to 6% of your salary.', question: 'How much should you contribute at minimum?',
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
            { title: 'Supply & Demand', content: 'Price rises \u2192 less demanded, more supplied. Price falls \u2192 more demanded, less supplied. Equilibrium: where S meets D.', icon: '\u2696\uFE0F', color: '#3b82f6' },
            { title: 'GDP Formula', content: 'GDP = C + I + G + (X-M). Consumption + Investment + Government + Net Exports. Measures total economic output.', icon: '\uD83C\uDFDB\uFE0F', color: '#f59e0b' },
            { title: 'Inflation Types', content: 'Demand-pull: too much money chasing goods. Cost-push: rising production costs. Built-in: wage-price spiral expectations.', icon: '\uD83D\uDCC8', color: '#ef4444' },
            { title: 'Fed Tools', content: 'Interest rates (FFR) \u2022 Open market operations (buy/sell bonds) \u2022 Reserve requirements \u2022 Discount window \u2022 Forward guidance', icon: '\uD83C\uDFE6', color: '#8b5cf6' },
            { title: 'Fiscal vs Monetary', content: 'Fiscal = Congress (tax/spend). Monetary = Fed (interest rates/money supply). Both affect the economy differently.', icon: '\uD83D\uDCCA', color: '#22c55e' },
            { title: 'Rule of 72', content: 'Divide 72 by the interest rate to find how many years it takes to double your money. 72 \u00F7 8% = 9 years to double.', icon: '\u2728', color: '#ec4899' },
            { title: 'Elasticity Rules', content: 'Elastic (>1): luxury, has substitutes. Inelastic (<1): necessity, no substitutes. Unit elastic (=1): % change in P = % change in Q.', icon: '\uD83C\uDFF9', color: '#10b981' },
            { title: '4 Market Structures', content: 'Perfect Competition \u2192 Monopolistic Competition \u2192 Oligopoly \u2192 Monopoly. More market power = higher prices, less efficiency.', icon: '\uD83C\uDFEA', color: '#f97316' }
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

              var gx = 60, gy = 30, gw = W - 120, gh = H - 80;

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

              ctx.font = 'bold 14px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('Price ($)', gx - 50, gy + gh / 2);

              ctx.fillText('Quantity', gx + gw / 2 - 25, gy + gh + 35);

              // Labels

              ctx.font = '11px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

              for (var li = 0; li <= 10; li++) {

                ctx.fillText((100 - li * 10).toString(), gx - 30, gy + li * gh / 10 + 4);

                ctx.fillText((li * 10).toString(), gx + li * gw / 10 - 5, gy + gh + 18);

              }



              // Demand curve (downward sloping, shifted)

              ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3; ctx.beginPath();

              for (var dx = 0; dx <= 100; dx++) {

                var dp = 90 - dx * 0.8 + sdDemandShift * 5;

                var px = gx + dx / 100 * gw;

                var py = gy + (100 - dp) / 100 * gh;

                dx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);

              }

              ctx.stroke();

              ctx.fillStyle = '#3b82f6'; ctx.font = 'bold 13px Inter, system-ui';

              ctx.fillText('D' + (sdDemandShift !== 0 ? '\'' : ''), gx + gw - 30, gy + 30 - sdDemandShift * 25);



              // Supply curve (upward sloping, shifted)

              ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.beginPath();

              for (var sx = 0; sx <= 100; sx++) {

                var sp = 10 + sx * 0.8 + sdSupplyShift * 5;

                var spx = gx + sx / 100 * gw;

                var spy = gy + (100 - sp) / 100 * gh;

                sx === 0 ? ctx.moveTo(spx, spy) : ctx.lineTo(spx, spy);

              }

              ctx.stroke();

              ctx.fillStyle = '#ef4444';

              ctx.fillText('S' + (sdSupplyShift !== 0 ? '\'' : ''), gx + gw - 30, gy + gh - 30 - sdSupplyShift * 25);



              // Equilibrium point

              var eqQ = (80 - sdSupplyShift * 5 + sdDemandShift * 5) / 1.6;

              var eqP = 10 + eqQ * 0.8 + sdSupplyShift * 5;

              var eqPx = gx + eqQ / 100 * gw;

              var eqPy = gy + (100 - eqP) / 100 * gh;

              // Dashed lines to axes

              ctx.setLineDash([5, 5]); ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;

              ctx.beginPath(); ctx.moveTo(eqPx, eqPy); ctx.lineTo(gx, eqPy); ctx.stroke();

              ctx.beginPath(); ctx.moveTo(eqPx, eqPy); ctx.lineTo(eqPx, gy + gh); ctx.stroke();

              ctx.setLineDash([]);

              // Equilibrium dot

              ctx.beginPath(); ctx.arc(eqPx, eqPy, 8, 0, Math.PI * 2);

              ctx.fillStyle = '#fbbf24'; ctx.fill();

              ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();

              ctx.font = 'bold 12px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

              ctx.fillText('E', eqPx + 12, eqPy - 8);

              ctx.font = '11px Inter, system-ui';

              ctx.fillText('P* = $' + eqP.toFixed(0), gx + 5, eqPy - 5);

              ctx.fillText('Q* = ' + eqQ.toFixed(0), eqPx - 10, gy + gh + 30);

              // Concept summary

              ctx.font = '10px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

              var csY = gy + gh + 50;

              ctx.fillText('\u2022 Consumer Surplus = area ABOVE equilibrium price, BELOW demand curve', gx, csY);

              ctx.fillText('\u2022 Producer Surplus = area BELOW equilibrium price, ABOVE supply curve', gx, csY + 14);

              ctx.fillText('\u2022 Total Surplus = Consumer + Producer surplus (maximized at equilibrium)', gx, csY + 28);



              // Price floor

              if (sdPriceFloor > 0) {

                var pfY = gy + (100 - sdPriceFloor) / 100 * gh;

                ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.setLineDash([8, 4]);

                ctx.beginPath(); ctx.moveTo(gx, pfY); ctx.lineTo(gx + gw, pfY); ctx.stroke();

                ctx.setLineDash([]); ctx.fillStyle = '#22c55e'; ctx.font = 'bold 11px Inter, system-ui';

                ctx.fillText('Price Floor $' + sdPriceFloor, gx + gw - 120, pfY - 8);

                if (sdPriceFloor > eqP) {

                  ctx.font = '10px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                  ctx.fillText('\u26A0 SURPLUS (above equilibrium)', gx + 10, pfY - 20);

                }

              }

              // Price ceiling

              if (sdPriceCeiling > 0) {

                var pcY = gy + (100 - sdPriceCeiling) / 100 * gh;

                ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2; ctx.setLineDash([8, 4]);

                ctx.beginPath(); ctx.moveTo(gx, pcY); ctx.lineTo(gx + gw, pcY); ctx.stroke();

                ctx.setLineDash([]); ctx.fillStyle = '#f97316'; ctx.font = 'bold 11px Inter, system-ui';

                ctx.fillText('Price Ceiling $' + sdPriceCeiling, gx + gw - 130, pcY + 18);

                if (sdPriceCeiling < eqP) {

                  ctx.font = '10px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                  ctx.fillText('\u26A0 SHORTAGE (below equilibrium)', gx + 10, pcY + 30);

                }

              }

              // Tax wedge

              if (sdTax > 0) {

                ctx.fillStyle = 'rgba(168,85,247,0.15)';

                ctx.fillRect(eqPx - 20, eqPy - sdTax / 100 * gh / 2, 40, sdTax / 100 * gh);

                ctx.font = '10px Inter, system-ui'; ctx.fillStyle = '#a855f7';

                ctx.fillText('Tax: $' + sdTax, eqPx + 25, eqPy);

              }

            }



            else if (econTab === 'personalFinance') {

              // â”€â”€ Life Sim Net Worth Chart â”€â”€

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              var pieX = W * 0.25, pieY = H * 0.45, pieR = Math.min(W * 0.2, H * 0.35);

              var expenses = [

                { name: 'Rent/Housing', val: pfRent, color: '#ef4444' },

                { name: 'Food', val: pfFood, color: '#f59e0b' },

                { name: 'Transport', val: pfTransport, color: '#3b82f6' },

                { name: 'Entertainment', val: pfEntertain, color: '#8b5cf6' },

                { name: 'Savings', val: pfSavings, color: '#22c55e' }

              ];

              var totalExp = expenses.reduce(function (s, e) { return s + e.val; }, 0);

              var remaining = Math.max(0, pfIncome - totalExp);

              if (remaining > 0) expenses.push({ name: 'Remaining', val: remaining, color: '#64748b' });

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

                  ctx.font = 'bold 11px Inter, system-ui'; ctx.fillStyle = '#fff';

                  ctx.textAlign = 'center';

                  ctx.fillText(Math.round(e.val / total * 100) + '%', lx, ly);

                  ctx.fillText(e.name, lx, ly + 14);

                }

                angle += sliceAngle;

              });

              ctx.textAlign = 'left';

              // Income display

              ctx.font = 'bold 16px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('Monthly Income: $' + pfIncome.toLocaleString(), W * 0.55, 40);

              ctx.font = '13px Inter, system-ui'; ctx.fillStyle = totalExp > pfIncome ? '#ef4444' : '#22c55e';

              ctx.fillText('Total Expenses: $' + totalExp.toLocaleString() + (totalExp > pfIncome ? ' \u26A0 OVER BUDGET' : ' \u2713 Within Budget'), W * 0.55, 65);

              ctx.fillStyle = '#94a3b8';

              ctx.fillText('Savings Rate: ' + (pfSavings / pfIncome * 100).toFixed(1) + '%', W * 0.55, 85);



              // Compound Interest Chart (right side)

              ctx.font = 'bold 14px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('\uD83D\uDCC8 Compound Interest Growth', W * 0.55, 130);

              var ciX = W * 0.55, ciY = 150, ciW = W * 0.4, ciH = H - 200;

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

              ctx.font = 'bold 13px Inter, system-ui'; ctx.fillStyle = '#22c55e';

              ctx.fillText('$' + Math.round(maxVal).toLocaleString(), ciX + ciW - 80, ciY + 20);

              ctx.font = '10px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

              ctx.fillText('Year 0', ciX, ciY + ciH + 15);

              ctx.fillText('Year ' + pfYears, ciX + ciW - 40, ciY + ciH + 15);

              ctx.fillText('$' + pfPrincipal.toLocaleString() + ' @ ' + pfRate + '% for ' + pfYears + ' years', ciX, ciY + ciH + 30);

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

                  ctx.font = '9px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                  ctx.fillText('MA(5)', chX + chW - 40, chY + 15);

                }

                // Current price dot

                var lastX = chX + chW;

                var lastY = chY + chH - ((hist[hist.length - 1] - minP) / priceRange) * chH;

                ctx.beginPath(); ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);

                ctx.fillStyle = co.color; ctx.fill();

                // Price labels

                ctx.font = '10px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

                ctx.fillText('$' + maxP.toFixed(0), chX - 35, chY + 12);

                ctx.fillText('$' + minP.toFixed(0), chX - 35, chY + chH);

              }

              // Company header

              ctx.font = 'bold 18px Inter, system-ui'; ctx.fillStyle = co.color;

              ctx.fillText(co.ticker, chX, 30);

              ctx.font = '13px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

              ctx.fillText(co.name + ' | ' + co.sector, chX + 80, 30);

              ctx.font = 'bold 16px Inter, system-ui';

              var priceChange = hist.length > 1 ? hist[hist.length - 1] - hist[hist.length - 2] : 0;

              ctx.fillStyle = priceChange >= 0 ? '#22c55e' : '#ef4444';

              ctx.fillText('$' + co.price.toFixed(2) + ' ' + (priceChange >= 0 ? '\u25B2' : '\u25BC') + Math.abs(priceChange).toFixed(2), chX + chW - 150, 30);



              // Portfolio summary at bottom

              var portY = chY + chH + 30;

              ctx.font = 'bold 14px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('\uD83D\uDCBC Portfolio', chX, portY);

              ctx.font = '12px Inter, system-ui'; ctx.fillStyle = '#22c55e';

              ctx.fillText('Cash: $' + smCash.toFixed(2), chX + 120, portY);

              // Holdings

              var portVal = 0;

              var holdX = chX;

              smCompanies.forEach(function (c, ci) {

                var shares = (smPortfolio[c.ticker] || 0);

                if (shares > 0) {

                  portVal += shares * c.price;

                  ctx.fillStyle = c.color; ctx.font = '11px Inter, system-ui';

                  ctx.fillText(c.ticker + ': ' + shares + ' ($' + (shares * c.price).toFixed(0) + ')', holdX, portY + 25);

                  holdX += 140;

                }

              });

              ctx.font = 'bold 12px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

              ctx.fillText('Total Value: $' + (smCash + portVal).toFixed(2), chX + chW - 180, portY);

              // News banner

              if (smNews) {

                ctx.fillStyle = 'rgba(251,191,36,0.15)';

                ctx.fillRect(chX, portY + 45, chW, 30);

                ctx.font = 'bold 11px Inter, system-ui'; ctx.fillStyle = '#fbbf24';

                ctx.fillText('\uD83D\uDCF0 ' + smNews, chX + 10, portY + 65);

              }

            }



            else if (econTab === 'macro') {

              // â”€â”€ National Economy Dashboard â”€â”€

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              ctx.font = 'bold 18px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('\uD83C\uDFDB\uFE0F National Economy â€” Year ' + macroYear, 30, 35);

              // Indicator gauges

              var indicators = [

                { label: 'GDP Growth', val: macroGDP, unit: '%', good: macroGDP > 0, color: macroGDP > 2 ? '#22c55e' : macroGDP > 0 ? '#fbbf24' : '#ef4444' },

                { label: 'Inflation', val: macroInflation, unit: '%', good: macroInflation < 3, color: macroInflation > 5 ? '#ef4444' : macroInflation > 3 ? '#fbbf24' : '#22c55e' },

                { label: 'Interest Rate', val: macroInterest, unit: '%', good: macroInterest < 5, color: macroInterest > 7 ? '#ef4444' : macroInterest > 4 ? '#fbbf24' : '#22c55e' },

                { label: 'Unemployment', val: macroUnemployment, unit: '%', good: macroUnemployment < 5, color: macroUnemployment > 7 ? '#ef4444' : macroUnemployment > 4 ? '#fbbf24' : '#22c55e' },

                { label: 'Trade Balance', val: macroTrade, unit: '%', good: macroTrade > 0, color: macroTrade > 0 ? '#22c55e' : macroTrade > -2 ? '#fbbf24' : '#ef4444' }

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

                ctx.font = 'bold 11px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

                ctx.fillText(ind.label, gx2 + 5, 80);

                ctx.font = 'bold 16px Inter, system-ui'; ctx.fillStyle = ind.color;

                ctx.fillText((ind.val >= 0 ? '+' : '') + ind.val.toFixed(1) + ind.unit, gx2 + 5, 100);

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

                // Legend

                ctx.font = '10px Inter, system-ui';

                ctx.fillStyle = '#22c55e'; ctx.fillText('\u2014 GDP Growth', mhX + 10, mhY + 15);

                ctx.fillStyle = '#ef4444'; ctx.fillText('--- Inflation', mhX + 110, mhY + 15);

                ctx.fillStyle = '#64748b';

                ctx.fillText('Year ' + (macroHistory[0].year || 2025), mhX, mhY + mhH + 15);

                ctx.fillText('Year ' + (macroHistory[macroHistory.length - 1].year || macroYear), mhX + mhW - 60, mhY + mhH + 15);

              } else {

                ctx.font = '14px Inter, system-ui'; ctx.fillStyle = '#64748b'; ctx.textAlign = 'center';

                ctx.fillText('Click "Next Year" to simulate national economic policy changes', W / 2, H / 2);

                ctx.font = '11px Inter, system-ui'; ctx.fillStyle = '#475569';

                ctx.fillText('AI will generate policy events that cascade to all other simulators', W / 2, H / 2 + 25);

                ctx.textAlign = 'left';

              }

            }



            else if (econTab === 'entrepreneur') {

              // â”€â”€ Lemonade Stand â”€â”€

              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

              // Weather display

              var weatherEmoji = enWeather === 'sunny' ? '\u2600\uFE0F' : enWeather === 'cloudy' ? '\u2601\uFE0F' : enWeather === 'rainy' ? '\uD83C\uDF27\uFE0F' : '\uD83C\uDF24\uFE0F';

              ctx.font = 'bold 40px Inter, system-ui'; ctx.fillText(weatherEmoji, W / 2 - 25, 60);

              ctx.font = 'bold 16px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

              ctx.fillText('Day ' + enDay + ' | ' + enWeather.charAt(0).toUpperCase() + enWeather.slice(1), W / 2 - 60, 90);



              // Lemonade stand illustration

              ctx.fillStyle = '#fbbf24';

              ctx.fillRect(W / 2 - 60, 110, 120, 80);

              ctx.fillStyle = '#f59e0b';

              ctx.beginPath(); ctx.moveTo(W / 2 - 80, 110); ctx.lineTo(W / 2, 85); ctx.lineTo(W / 2 + 80, 110); ctx.closePath(); ctx.fill();

              ctx.font = 'bold 12px Inter, system-ui'; ctx.fillStyle = '#7c2d12';

              ctx.fillText('LEMONADE', W / 2 - 35, 155);

              ctx.fillText('$' + enPrice.toFixed(2), W / 2 - 15, 175);



              // Cash register

              ctx.font = 'bold 20px Inter, system-ui'; ctx.fillStyle = '#22c55e';

              ctx.fillText('\uD83D\uDCB5 $' + enCash.toFixed(2), W / 2 - 50, 230);



              // Daily stats

              ctx.font = '13px Inter, system-ui'; ctx.fillStyle = '#94a3b8';

              ctx.fillText('Price per cup: $' + enPrice.toFixed(2), 40, 270);

              ctx.fillText('Cups prepared: ' + enCups, 40, 290);

              ctx.fillText('Ad budget: $' + enAdBudget.toFixed(2), 40, 310);

              // Cost breakdown

              var cupCost = 0.25; var lemonCost = 0.15; var sugarCost = 0.05;

              var totalCostPerCup = cupCost + lemonCost + sugarCost;

              var dailyFixedCost = enCups * totalCostPerCup + enAdBudget;

              ctx.fillStyle = '#ef4444';

              ctx.fillText('Cost/cup: $' + totalCostPerCup.toFixed(2) + ' (cup $0.25 + lemon $0.15 + sugar $0.05)', 40, 340);

              ctx.fillText('Daily costs: $' + dailyFixedCost.toFixed(2), 40, 360);

              // Break-even

              var breakEven = dailyFixedCost / Math.max(0.01, enPrice - totalCostPerCup);

              ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 12px Inter, system-ui';

              ctx.fillText('Break-even: ' + Math.ceil(breakEven) + ' cups', 40, 390);



              // Profit history chart

              if (enHistory.length > 0) {

                var phX = W * 0.55, phY = 260, phW = W * 0.4, phH = 170;

                ctx.fillStyle = '#1e293b'; ctx.fillRect(phX, phY, phW, phH);

                ctx.font = 'bold 12px Inter, system-ui'; ctx.fillStyle = '#e2e8f0';

                ctx.fillText('Profit History', phX, phY - 8);

                var maxProfit = Math.max.apply(null, enHistory.map(function (h) { return Math.abs(h.profit); })) || 1;

                var zeroY = phY + phH / 2;

                ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;

                ctx.beginPath(); ctx.moveTo(phX, zeroY); ctx.lineTo(phX + phW, zeroY); ctx.stroke();

                ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2; ctx.beginPath();

                enHistory.forEach(function (h, hi) {

                  var hx3 = phX + (hi / (Math.max(1, enHistory.length - 1))) * phW;

                  var hy3 = zeroY - (h.profit / maxProfit) * phH / 2;

                  hi === 0 ? ctx.moveTo(hx3, hy3) : ctx.lineTo(hx3, hy3);

                });

                ctx.stroke();

                // Dots

                enHistory.forEach(function (h, hi) {

                  var hx4 = phX + (hi / (Math.max(1, enHistory.length - 1))) * phW;

                  var hy4 = zeroY - (h.profit / maxProfit) * phH / 2;

                  ctx.beginPath(); ctx.arc(hx4, hy4, 3, 0, Math.PI * 2);

                  ctx.fillStyle = h.profit >= 0 ? '#22c55e' : '#ef4444'; ctx.fill();

                });

              }

            }

          }, 0);



          return React.createElement('div', { className: 'max-w-4xl mx-auto' },

            // Header

            React.createElement('div', { className: 'flex items-center gap-3 mb-4' },

              React.createElement('button', {

                onClick: function () { setStemLabTool(null); },

                className: 'text-slate-400 hover:text-white transition-colors text-lg'

              }, '\u2190'),

              React.createElement('h2', { className: 'text-xl font-bold text-slate-800' }, '\uD83D\uDCB0 Economics Lab'),

              React.createElement('span', { className: 'text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full' }, '5 simulators'),

              React.createElement('span', {

                className: 'text-[11px] font-bold px-2 py-0.5 rounded-full border ' +

                  (econLiteracyScore >= 80 ? 'text-green-700 bg-green-50 border-green-200' :

                    econLiteracyScore >= 50 ? 'text-blue-700 bg-blue-50 border-blue-200' :

                      econLiteracyScore >= 25 ? 'text-amber-700 bg-amber-50 border-amber-200' :

                        'text-slate-500 bg-slate-50 border-slate-200')

              }, '\uD83C\uDF93 Literacy: ' + econLiteracyScore + '%'),

              React.createElement('span', { className: 'text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200' }, '\uD83D\uDCDA AI-Powered Learning'),

              econAchievements.length > 0 && React.createElement('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },

                className: 'text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 cursor-pointer',

                onClick: function () { upd('showAchievements', !(d.showAchievements)); }

              }, '\uD83C\uDFC6 ' + econAchievements.length + ' achievements'),

              React.createElement('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },

                className: 'text-[11px] text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200 cursor-pointer',

                onClick: function () { upd('showGlossary', !(d.showGlossary)); }

              }, '\uD83D\uDCD6 Glossary (' + (d.econGlossary || []).length + ')'),

              React.createElement('button', {

                onClick: function () { upd('showQuiz', !(d.showQuiz)); },

                className: 'text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 cursor-pointer font-bold'

              }, '\u270D\uFE0F Quiz Me'),

              React.createElement('button', {

                onClick: function () { upd('showAdvisor', !(d.showAdvisor)); },

                className: 'text-[11px] text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200 cursor-pointer font-bold'

              }, '\uD83E\uDDD1\u200D\uD83C\uDFEB Ask Tutor'),

              React.createElement('select', {

                value: d.econDifficulty || 'medium',

                onChange: function (e) { upd('econDifficulty', e.target.value); if (addToast) addToast('Difficulty: ' + e.target.value.toUpperCase(), 'info'); },

                className: 'text-[11px] bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5 text-slate-600 outline-none cursor-pointer'

              },

                React.createElement('option', { value: 'easy' }, '\uD83C\uDF31 Easy'),

                React.createElement('option', { value: 'medium' }, '\u2699\uFE0F Medium'),

                React.createElement('option', { value: 'hard' }, '\uD83D\uDD25 Hard')

              )

            ),

            // Tab bar

            React.createElement('div', { className: 'flex gap-1 mb-4 bg-slate-100 rounded-xl p-1' },

              [

                { id: 'supplyDemand', label: '\uD83D\uDCC9 Supply & Demand' },

                { id: 'personalFinance', label: '\uD83C\uDFE6 Personal Finance' },

                { id: 'stockMarket', label: '\uD83D\uDCC8 Stock Market' },

                { id: 'entrepreneur', label: '\uD83C\uDFEA Business Sim' },

                { id: 'macro', label: '\uD83C\uDFDB\uFE0F National Economy' }

              ].map(function (tab) {

                return React.createElement('button', {

                  key: tab.id,

                  onClick: function () { upd('econTab', tab.id); },

                  className: 'flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ' +

                    (econTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700')

                }, tab.label);

              })

            ),

            // Achievement panel

            d.showAchievements && React.createElement('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200 mb-4' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFC6 Achievements (' + econAchievements.length + '/20)'),

                React.createElement('button', { onClick: function () { upd('showAchievements', false); }, className: 'text-amber-400 hover:text-amber-600 text-xs' }, '\u2715')

              ),

              React.createElement('div', { className: 'grid grid-cols-4 gap-2' },

                econAchievements.map(function (a, ai) {

                  return React.createElement('div', { key: ai, className: 'bg-white rounded-lg p-2 text-center border border-amber-100 shadow-sm' },

                    React.createElement('div', { className: 'text-xl' }, a.icon),

                    React.createElement('div', { className: 'text-[11px] font-bold text-amber-800 mt-1' }, a.title),

                    React.createElement('div', { className: 'text-[8px] text-amber-600' }, a.desc)

                  );

                })

              )

            ),

            // Glossary panel

            d.showGlossary && React.createElement('div', { className: 'bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200 mb-4 max-h-60 overflow-y-auto' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-violet-800' }, '\uD83D\uDCD6 Economics Glossary (' + (d.econGlossary || []).length + ' concepts learned)'),

                React.createElement('button', { onClick: function () { upd('showGlossary', false); }, className: 'text-violet-400 hover:text-violet-600 text-xs' }, '\u2715')

              ),

              (d.econGlossary || []).length === 0 ? React.createElement('p', { className: 'text-xs text-violet-500 text-center py-4' }, 'Play the simulations to discover economics concepts! Each event teaches a new concept that gets added here.') :

                React.createElement('div', { className: 'space-y-2' },

                  (d.econGlossary || []).map(function (g, gi) {

                    return React.createElement('div', { key: gi, className: 'bg-white rounded-lg p-2 border border-violet-100' },

                      React.createElement('div', { className: 'flex items-center gap-2' },

                        React.createElement('span', { className: 'text-[11px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-bold' }, g.tab),

                        React.createElement('span', { className: 'text-[10px] font-bold text-slate-700' }, g.concept)

                      ),

                      React.createElement('p', { className: 'text-[11px] text-slate-500 mt-1' }, g.explanation)

                    );

                  })

                )

            ),

            // Quiz mode

            d.showQuiz && React.createElement('div', { className: 'bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200 mb-4' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-rose-800' }, '\u270D\uFE0F Economics Quiz'),

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

                            isAnswered ? 'border-slate-200 bg-white text-slate-500' :

                              'border-rose-100 bg-white hover:border-rose-400 text-slate-700')

                    }, (isAnswered && isCorrect ? '\u2705 ' : isAnswered && isSelected ? '\u274C ' : '') + opt);

                  })

                ),

                d.quizAnswer !== undefined && d.quizAnswer !== null && React.createElement('div', { className: 'mt-3 bg-white rounded-lg p-3 border border-rose-100' },

                  React.createElement('p', { className: 'text-xs text-slate-600' },

                    React.createElement('span', { className: 'font-bold text-rose-700' }, '\uD83D\uDCDA Explanation: '),

                    d.quizQuestion.explanation

                  )

                ),

                d.quizAnswer !== undefined && d.quizAnswer !== null && React.createElement('button', {

                  onClick: function () { upd('quizQuestion', null); upd('quizAnswer', null); },

                  className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200'

                }, '\u27A1\uFE0F Next Question')

              ) :

                React.createElement('div', { className: 'text-center' },

                  React.createElement('div', { className: 'text-xs text-slate-500 mb-2' }, 'Score: ' + (d.quizScore || 0) + '/' + (d.quizTotal || 0) + (d.quizTotal > 0 ? ' (' + Math.round((d.quizScore || 0) / (d.quizTotal || 1) * 100) + '%)' : '')),

                  React.createElement('button', {

                    onClick: function () {

                      upd('quizLoading', true);

                      var topics = (d.econGlossary || []).map(function (g) { return g.concept; }).join(', ') || 'supply and demand, inflation, GDP, interest rates, opportunity cost';

                      var prompt = 'You are an economics teacher creating a quiz. The student has studied these topics: ' + topics + '.\n\nGenerate 1 multiple-choice question. Return ONLY valid JSON:\n{"question":"<question text>","options":["<option A>","<option B>","<option C>","<option D>"],"correctIndex":<0-3>,"explanation":"<2-3 sentence explanation of the correct answer and the underlying economic concept>"}\n\nMake questions that test UNDERSTANDING, not just definitions. Include real-world application questions, cause-and-effect reasoning, and scenario-based problems. Vary difficulty.';

                      callGemini(prompt, true).then(function (result) {

                        try {

                          var cleaned = result.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

                          var s = cleaned.indexOf('{'); if (s > 0) cleaned = cleaned.substring(s);

                          var e = cleaned.lastIndexOf('}'); if (e > 0) cleaned = cleaned.substring(0, e + 1);

                          upd('quizQuestion', JSON.parse(cleaned));

                          upd('quizAnswer', null);

                          upd('quizLoading', false);

                        } catch (err) { upd('quizLoading', false); if (addToast) addToast('Quiz generation failed', 'error'); }

                      }).catch(function () { upd('quizLoading', false); });

                    },

                    disabled: d.quizLoading,

                    className: 'py-3 px-8 rounded-xl text-sm font-bold transition-all ' + (d.quizLoading ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:shadow-lg')

                  }, d.quizLoading ? '\u23F3 Generating...' : '\uD83C\uDFB2 Generate Quiz Question')

                )

            ),

            // AI Economic Advisor

            d.showAdvisor && React.createElement('div', { className: 'bg-gradient-to-r from-sky-50 to-cyan-50 rounded-xl p-4 border border-sky-200 mb-4' },

              React.createElement('div', { className: 'flex justify-between items-center mb-3' },

                React.createElement('h4', { className: 'text-sm font-bold text-sky-800' }, '\uD83E\uDDD1\u200D\uD83C\uDFEB AI Economics Tutor'),

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

                  placeholder: 'Ask any economics question...',

                  className: 'flex-1 px-3 py-2 border-2 border-sky-200 rounded-xl text-xs focus:border-sky-400 outline-none'

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

                  className: 'px-4 py-2 rounded-xl text-xs font-bold ' + (d.advisorLoading ? 'bg-slate-300 text-slate-500' : 'bg-sky-500 text-white')

                }, d.advisorLoading ? '\u23F3' : '\uD83D\uDCAC Ask')

              ),

              // Quick question suggestions

              !d.advisorAnswer && React.createElement('div', { className: 'flex flex-wrap gap-1 mt-2' },

                ['What is inflation?', 'How do interest rates work?', 'What causes a recession?', 'Why diversify investments?', 'What is GDP?', 'How do taxes work?'].map(function (q) {

                  return React.createElement('button', {

                    key: q,

                    onClick: function () { upd('advisorInput', q); },

                    className: 'text-[11px] px-2 py-1 rounded-full bg-sky-100 text-sky-600 hover:bg-sky-200'

                  }, q);

                })

              )

            ),

            
            
            
            // === ECONOMICS SCENARIO CHALLENGES ===
            React.createElement('div', { className: 'bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200 mb-4' },
              React.createElement('h4', { className: 'text-sm font-bold text-rose-800 mb-2' }, '\uD83C\uDFAF Economics Scenarios (' + (econScenarioIdx + 1) + '/' + ECON_SCENARIOS.length + ')'),
              // Streak + score
              React.createElement('div', { className: 'flex justify-between items-center mb-2' },
                econStreak > 0 ? React.createElement('span', { className: 'inline-block px-3 py-0.5 rounded-full text-[11px] font-bold ' + (econStreak >= 5 ? 'bg-amber-700 text-white animate-pulse' : econStreak >= 3 ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600') },
                  '\uD83D\uDD25 ' + econStreak + ' streak!' + (econStreak >= 5 ? ' AMAZING!' : econStreak >= 3 ? ' On fire!' : '')) : null,
                React.createElement('span', { className: 'text-[11px] text-slate-500' }, 'Score: ' + econScenarioScore + '/' + econScenarioTotal + ' | Best: ' + econBestStreak)
              ),
              (function() {
                var sc = ECON_SCENARIOS[econScenarioIdx];
                if (!sc) return null;
                var answered = econScenarioAnswer >= 0;
                var isCorrect = econScenarioAnswer === sc.correct;
                return React.createElement('div', null,
                  React.createElement('div', { className: 'bg-white rounded-xl p-3 mb-2 border border-rose-100' },
                    React.createElement('div', { className: 'text-[10px] text-slate-700 leading-relaxed' }, sc.scenario)
                  ),
                  React.createElement('div', { className: 'text-[10px] font-bold text-slate-800 mb-2' }, sc.question),
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
                        React.createElement('span', { className: 'font-bold mr-1 ' + (answered && isRight ? 'text-green-600' : answered && isSelected ? 'text-red-500' : 'text-slate-500') }, String.fromCharCode(65 + oi) + '.'),
                        React.createElement('span', { className: answered && isRight ? 'text-green-700' : answered && isSelected && !isRight ? 'text-red-600' : 'text-slate-700' }, ' ' + opt)
                      );
                    })
                  ),
                  answered && React.createElement('div', { className: 'space-y-2' },
                    React.createElement('div', { className: 'rounded-xl p-2.5 text-[10px] ' + (isCorrect ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700') },
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
                    }, 'Next Scenario \u2192')
                  )
                );
              })()
            ),

            // === HISTORIC ECONOMIC EVENTS TIMELINE ===
            React.createElement('div', { className: 'bg-gradient-to-r from-slate-50 to-zinc-50 rounded-xl p-4 border border-slate-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-slate-800' }, '\uD83D\uDCC5 Economic History Timeline'),
                React.createElement('button', {
                  onClick: function() { upd('showEconTimeline', !(d.showEconTimeline)); },
                  className: 'text-[10px] text-slate-500 hover:text-slate-700 font-bold'
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
                          React.createElement('span', { className: 'text-[10px] font-black text-amber-600 font-mono' }, ev.year),
                          React.createElement('span', { className: 'text-[10px] text-slate-700 font-bold flex-1' }, ev.event)
                        ),
                        isActive && React.createElement('div', { className: 'mt-2 space-y-1.5 pl-7' },
                          React.createElement('div', { className: 'text-[11px] text-slate-600' },
                            React.createElement('span', { className: 'font-bold text-red-600' }, '\uD83D\uDCA5 Impact: '),
                            ev.impact
                          ),
                          React.createElement('div', { className: 'text-[11px] text-indigo-600 bg-indigo-50 rounded-lg p-1.5 border border-indigo-100' },
                            React.createElement('span', { className: 'font-bold' }, '\uD83D\uDCDA Lesson: '),
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
            React.createElement('div', { className: 'bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, '\uD83D\uDCCB Quick Reference Cards'),
                React.createElement('button', {
                  onClick: function() { upd('showEconQuickRef', !(d.showEconQuickRef)); },
                  className: 'text-[10px] text-amber-500 hover:text-amber-700 font-bold'
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
                      React.createElement('span', { className: 'text-[10px] font-black', style: { color: card.color } }, card.title)
                    ),
                    React.createElement('div', { className: 'text-[11px] text-slate-600 leading-relaxed' }, card.content)
                  );
                })
              )
            ),


            // === INFLATION CALCULATOR ===
            React.createElement('div', { className: 'bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-red-800' }, '\uD83D\uDCB2 Inflation Calculator'),
                React.createElement('button', {
                  onClick: function() { upd('showInflationCalc', !(d.showInflationCalc)); },
                  className: 'text-[10px] text-red-500 hover:text-red-700 font-bold'
                }, d.showInflationCalc ? 'Hide' : 'Calculate \u2192')
              ),
              d.showInflationCalc && React.createElement('div', null,
                React.createElement('div', { className: 'text-[10px] text-slate-500 italic mb-3' }, 'See how inflation erodes purchasing power over time. A dollar today is worth more than a dollar tomorrow!'),
                React.createElement('div', { className: 'grid grid-cols-3 gap-3 mb-3' },
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[11px] font-bold text-red-600 block mb-0.5' }, 'Amount ($)'),
                    React.createElement('input', { type: 'number', value: d.inflationAmt || 100,
                      onChange: function(e) { upd('inflationAmt', parseFloat(e.target.value) || 100); },
                      className: 'w-full px-2 py-1.5 border border-red-200 rounded-lg text-xs focus:border-red-400 outline-none'
                    })
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[11px] font-bold text-red-600 block mb-0.5' }, 'Inflation Rate (%)'),
                    React.createElement('input', { type: 'range', min: 0.5, max: 15, step: 0.5, value: d.inflationRate || 3,
                      onChange: function(e) { upd('inflationRate', parseFloat(e.target.value)); },
                      className: 'w-full accent-red-500'
                    }),
                    React.createElement('div', { className: 'text-[11px] text-center text-red-600 font-bold' }, (d.inflationRate || 3) + '%')
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[11px] font-bold text-red-600 block mb-0.5' }, 'Years'),
                    React.createElement('input', { type: 'range', min: 1, max: 50, value: d.inflationYears || 20,
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
                    React.createElement('div', { className: 'text-[10px] text-slate-500 mt-0.5' }, 'Your $' + amt + ' will only buy $' + futureValue.toFixed(2) + ' worth of today\'s goods in ' + yrs + ' years'),
                    React.createElement('div', { className: 'text-[10px] font-bold text-red-500 mt-1' }, '\uD83D\uDCC9 ' + lostPct + '% of purchasing power lost!'),
                    React.createElement('div', { className: 'text-[11px] text-slate-500 mt-1 italic' }, 'Rule of 72: Money loses half its value in ~' + Math.round(72 / ((d.inflationRate || 3))) + ' years at ' + (d.inflationRate || 3) + '% inflation')
                  );
                })()
              )
            ),

            // === BUSINESS CYCLE DIAGRAM ===
            React.createElement('div', { className: 'bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-green-800' }, '\uD83D\uDD04 Business Cycle'),
                React.createElement('button', {
                  onClick: function() { upd('showBizCycle', !(d.showBizCycle)); },
                  className: 'text-[10px] text-green-500 hover:text-green-700 font-bold'
                }, d.showBizCycle ? 'Hide' : 'Explore \u2192')
              ),
              d.showBizCycle && React.createElement('div', null,
                React.createElement('div', { className: 'text-[10px] text-slate-500 italic mb-3' }, 'The economy moves through repeating cycles of expansion and contraction. Understanding where we are in the cycle helps predict what comes next.'),
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
                      pi < 3 && React.createElement('span', { className: 'text-slate-400 text-lg mx-0.5' }, '\u2192')
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
                        React.createElement('div', { className: 'text-[8px] text-slate-500' }, 'Duration: ' + phase.duration)
                      )
                    ),
                    React.createElement('div', { className: 'text-[11px] font-bold text-slate-600 mb-1' }, 'Characteristics:'),
                    React.createElement('ul', { className: 'space-y-0.5 ml-3 mb-2' },
                      phase.characteristics.map(function(ch, chi) {
                        return React.createElement('li', { key: chi, className: 'text-[11px] text-slate-500 list-disc' }, ch);
                      })
                    ),
                    React.createElement('div', { className: 'text-[11px] text-blue-600 bg-blue-50 rounded-lg p-2 border border-blue-100 mb-1' },
                      React.createElement('span', { className: 'font-bold' }, '\uD83C\uDFDB\uFE0F Policy Response: '),
                      phase.policy
                    ),
                    React.createElement('div', { className: 'text-[8px] text-amber-600 italic' }, '\uD83D\uDCCA Indicators: ' + phase.indicators)
                  );
                })()
              )
            ),

            // === COMPOUND INTEREST CALCULATOR CONTROLS ===
            React.createElement('div', { className: 'bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-emerald-800' }, '\uD83D\uDCCA Compound Interest Calculator'),
                React.createElement('button', {
                  onClick: function() { upd('showCompoundCalc', !(d.showCompoundCalc)); },
                  className: 'text-[10px] text-emerald-500 hover:text-emerald-700 font-bold'
                }, d.showCompoundCalc ? 'Hide' : 'Calculate \u2192')
              ),
              d.showCompoundCalc && React.createElement('div', null,
                React.createElement('div', { className: 'grid grid-cols-3 gap-3 mb-3' },
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[11px] font-bold text-emerald-600 block mb-0.5' }, 'Starting Amount: $' + (d.pfPrincipal || 1000).toLocaleString()),
                    React.createElement('input', { type: 'range', min: 100, max: 50000, step: 100, value: d.pfPrincipal || 1000,
                      onChange: function(e) { upd('pfPrincipal', parseInt(e.target.value)); },
                      className: 'w-full accent-emerald-500'
                    })
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[11px] font-bold text-emerald-600 block mb-0.5' }, 'Annual Return: ' + (d.pfRate || 7) + '%'),
                    React.createElement('input', { type: 'range', min: 1, max: 15, step: 0.5, value: d.pfRate || 7,
                      onChange: function(e) { upd('pfRate', parseFloat(e.target.value)); },
                      className: 'w-full accent-emerald-500'
                    })
                  ),
                  React.createElement('div', null,
                    React.createElement('label', { className: 'text-[11px] font-bold text-emerald-600 block mb-0.5' }, 'Years: ' + (d.pfYears || 30)),
                    React.createElement('input', { type: 'range', min: 1, max: 50, value: d.pfYears || 30,
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
                    React.createElement('div', { className: 'text-[10px] text-slate-500 mt-0.5' }, 'From $' + p.toLocaleString() + ' invested at ' + (d.pfRate || 7) + '% for ' + y + ' years'),
                    React.createElement('div', { className: 'text-[10px] font-bold text-emerald-500 mt-1' }, '\uD83D\uDCC8 $' + Math.round(earned).toLocaleString() + ' earned through compound interest!'),
                    React.createElement('div', { className: 'text-[11px] text-slate-500 mt-1 italic' }, '"Compound interest is the eighth wonder of the world." \u2014 Albert Einstein (attributed)')
                  );
                })()
              )
            ),

            // === BUDGET RULES ===
            React.createElement('div', { className: 'bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-blue-800' }, '\uD83D\uDCB0 Budget Rules'),
                React.createElement('button', {
                  onClick: function() { upd('showBudgetRules', !(d.showBudgetRules)); },
                  className: 'text-[10px] text-blue-500 hover:text-blue-700 font-bold'
                }, d.showBudgetRules ? 'Hide' : 'Learn \u2192')
              ),
              d.showBudgetRules && React.createElement('div', { className: 'space-y-3' },
                BUDGET_RULES.map(function(rule, ri) {
                  var isActive = (d.budgetRuleIdx || 0) === ri;
                  return React.createElement('div', { key: ri,
                    onClick: function() { upd('budgetRuleIdx', ri); },
                    className: 'cursor-pointer rounded-xl p-3 border-2 transition-all ' + (isActive ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300')
                  },
                    React.createElement('div', { className: 'flex items-center gap-2 mb-1' },
                      React.createElement('span', { className: 'text-lg' }, rule.icon),
                      React.createElement('span', { className: 'text-[11px] font-black text-slate-800' }, rule.name),
                      React.createElement('span', { className: 'text-[11px] text-slate-500' }, rule.desc)
                    ),
                    isActive && React.createElement('div', null,
                      // Visual bar
                      React.createElement('div', { className: 'flex rounded-full overflow-hidden h-6 mb-2' },
                        rule.parts.map(function(part) {
                          return React.createElement('div', { key: part.label,
                            className: 'flex items-center justify-center text-[8px] font-bold text-white',
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
                            React.createElement('div', { className: 'text-[10px] font-bold', style: { color: part.color } }, part.label + ' (' + part.pct + '%)'),
                            React.createElement('div', { className: 'text-[11px] font-black text-slate-800' }, '$' + allocated.toLocaleString() + '/mo'),
                            React.createElement('div', { className: 'text-[8px] text-slate-500' }, part.items)
                          );
                        })
                      )
                    )
                  );
                })
              )
            ),

            // === SCHOOLS OF ECONOMIC THOUGHT ===
            React.createElement('div', { className: 'bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl p-4 border border-purple-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-purple-800' }, '\uD83C\uDFDB\uFE0F Schools of Economic Thought'),
                React.createElement('button', {
                  onClick: function() { upd('showEconSchools', !(d.showEconSchools)); },
                  className: 'text-[10px] text-purple-500 hover:text-purple-700 font-bold'
                }, d.showEconSchools ? 'Hide' : 'Compare \u2192')
              ),
              d.showEconSchools && React.createElement('div', null,
                React.createElement('div', { className: 'text-[10px] text-slate-500 italic mb-3' }, 'Economists disagree! Different schools of thought offer different answers to the same questions. Understanding these perspectives helps you think critically about economic policy.'),
                // Comparison table
                React.createElement('div', { className: 'rounded-xl overflow-hidden border border-purple-200' },
                  // Header
                  React.createElement('div', { className: 'grid grid-cols-4 bg-purple-100 text-[8px] font-bold text-purple-800 uppercase' },
                    React.createElement('div', { className: 'p-1.5' }, 'School'),
                    React.createElement('div', { className: 'p-1.5 border-l border-purple-200' }, 'Gov\'t Role'),
                    React.createElement('div', { className: 'p-1.5 border-l border-purple-200' }, 'On Recession'),
                    React.createElement('div', { className: 'p-1.5 border-l border-purple-200' }, 'On Inflation')
                  ),
                  ECON_SCHOOLS.map(function(school, si) {
                    var isActive = d.econSchoolIdx === si;
                    return React.createElement('div', { key: si },
                      React.createElement('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } },
                        className: 'grid grid-cols-4 cursor-pointer transition-all ' + (isActive ? '' : 'hover:bg-purple-50') + (si % 2 === 0 ? ' bg-white' : ' bg-slate-50'),
                        onClick: function() { upd('econSchoolIdx', isActive ? null : si); },
                        style: isActive ? { background: school.color + '10', borderLeft: '3px solid ' + school.color } : {}
                      },
                        React.createElement('div', { className: 'p-1.5 text-[11px]' },
                          React.createElement('span', { className: 'font-bold', style: { color: school.color } }, school.icon + ' ' + school.name),
                          React.createElement('div', { className: 'text-[7px] text-slate-500' }, school.era)
                        ),
                        React.createElement('div', { className: 'p-1.5 text-[11px] text-slate-600 border-l border-slate-100' }, school.govRole),
                        React.createElement('div', { className: 'p-1.5 text-[11px] text-slate-600 border-l border-slate-100' }, school.onRecession),
                        React.createElement('div', { className: 'p-1.5 text-[11px] text-slate-600 border-l border-slate-100' }, school.onInflation)
                      ),
                      isActive && React.createElement('div', { className: 'px-3 py-2 border-t border-slate-100', style: { background: school.color + '08', borderLeft: '3px solid ' + school.color } },
                        React.createElement('div', { className: 'text-[11px] text-slate-600 mb-1' },
                          React.createElement('span', { className: 'font-bold', style: { color: school.color } }, '\uD83D\uDCA1 Key Idea: '),
                          school.key
                        ),
                        React.createElement('div', { className: 'text-[8px] text-slate-500' },
                          React.createElement('span', { className: 'font-bold' }, '\uD83C\uDF93 Famous: '),
                          school.famous
                        )
                      )
                    );
                  })
                )
              )
            ),


            // === ECONOMICS CONCEPT LIBRARY ===
            React.createElement('div', { className: 'bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-indigo-800' }, '\uD83D\uDCDA Economics Concept Library (' + ECON_CONCEPTS.length + ')'),
                React.createElement('button', {
                  onClick: function() { upd('showConceptLib', !(d.showConceptLib)); },
                  className: 'text-[10px] text-indigo-500 hover:text-indigo-700 font-bold'
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
                      onClick: function() { upd('econConceptIdx', isActive ? null : ci); },
                      className: 'cursor-pointer rounded-xl p-2.5 border-2 transition-all ' + (isActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300')
                    },
                      React.createElement('div', { className: 'flex items-center gap-1.5 mb-1' },
                        React.createElement('span', { className: 'text-lg' }, concept.icon),
                        React.createElement('span', { className: 'text-[10px] font-black text-slate-800' }, concept.name),
                        React.createElement('span', { className: 'text-[8px] px-1 py-0.5 rounded bg-' + (concept.category === 'macro' ? 'blue' : concept.category === 'micro' ? 'green' : concept.category === 'finance' ? 'amber' : concept.category === 'trade' ? 'purple' : 'slate') + '-100 text-' + (concept.category === 'macro' ? 'blue' : concept.category === 'micro' ? 'green' : concept.category === 'finance' ? 'amber' : concept.category === 'trade' ? 'purple' : 'slate') + '-700 font-bold' }, concept.category)
                      ),
                      React.createElement('div', { className: 'text-[11px] text-slate-600' }, concept.def),
                      isActive && React.createElement('div', { className: 'mt-1.5 text-[11px] text-indigo-600 bg-indigo-50 rounded-lg p-1.5 border border-indigo-100' },
                        React.createElement('span', { className: 'font-bold' }, '\uD83D\uDCA1 Example: '),
                        concept.example
                      )
                    );
                  })
                )
              )
            ),

            // === MARKET STRUCTURES ===
            React.createElement('div', { className: 'bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-emerald-800' }, '\uD83C\uDFEA Market Structures'),
                React.createElement('button', {
                  onClick: function() { upd('showMarketStructures', !(d.showMarketStructures)); },
                  className: 'text-[10px] text-emerald-500 hover:text-emerald-700 font-bold'
                }, d.showMarketStructures ? 'Hide' : 'Compare \u2192')
              ),
              d.showMarketStructures && React.createElement('div', null,
                React.createElement('div', { className: 'text-[10px] text-slate-500 italic mb-2' }, 'Markets range from perfect competition (many sellers, identical products) to monopoly (one seller, unique product). Click each to learn more:'),
                // Spectrum bar
                React.createElement('div', { className: 'flex mb-3 rounded-full overflow-hidden h-4' },
                  MARKET_STRUCTURES.map(function(ms) {
                    return React.createElement('div', { key: ms.id,
                      className: 'flex-1 flex items-center justify-center text-[7px] font-bold text-white',
                      style: { background: ms.color },
                      title: ms.name
                    }, ms.name.split(' ')[0]);
                  })
                ),
                React.createElement('div', { className: 'flex items-center justify-between text-[8px] text-slate-500 mb-3' },
                  React.createElement('span', null, '\u2190 More Competition'),
                  React.createElement('span', null, 'More Market Power \u2192')
                ),
                // Cards
                React.createElement('div', { className: 'grid grid-cols-2 gap-2' },
                  MARKET_STRUCTURES.map(function(ms, mi) {
                    var isActive = d.marketStructIdx === mi;
                    return React.createElement('div', { key: mi,
                      onClick: function() { upd('marketStructIdx', isActive ? null : mi); },
                      className: 'cursor-pointer rounded-xl p-3 border-2 transition-all ' + (isActive ? 'scale-[1.02] shadow-md' : 'hover:scale-[1.01]'),
                      style: { borderColor: isActive ? ms.color : ms.color + '40', background: isActive ? ms.color + '08' : '#fff' }
                    },
                      React.createElement('div', { className: 'flex items-center gap-1 mb-1' },
                        React.createElement('span', { className: 'text-lg' }, ms.icon),
                        React.createElement('div', { className: 'text-[10px] font-black', style: { color: ms.color } }, ms.name)
                      ),
                      isActive && React.createElement('div', { className: 'space-y-1 mt-1' },
                        React.createElement('div', { className: 'grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]' },
                          React.createElement('span', { className: 'text-slate-500 font-bold' }, 'Sellers:'),
                          React.createElement('span', { className: 'text-slate-700' }, ms.sellers),
                          React.createElement('span', { className: 'text-slate-500 font-bold' }, 'Product:'),
                          React.createElement('span', { className: 'text-slate-700' }, ms.product),
                          React.createElement('span', { className: 'text-slate-500 font-bold' }, 'Barriers:'),
                          React.createElement('span', { className: 'text-slate-700' }, ms.barriers),
                          React.createElement('span', { className: 'text-slate-500 font-bold' }, 'Pricing:'),
                          React.createElement('span', { className: 'text-slate-700' }, ms.pricing),
                          React.createElement('span', { className: 'text-slate-500 font-bold' }, 'Long-run Profit:'),
                          React.createElement('span', { className: 'text-slate-700' }, ms.profit)
                        ),
                        React.createElement('div', { className: 'text-[8px] text-amber-600 font-medium mt-1' }, '\uD83D\uDCA1 Examples: ' + ms.examples)
                      )
                    );
                  })
                )
              )
            ),

            // === GDP COMPONENTS ===
            React.createElement('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, '\uD83C\uDFDB\uFE0F GDP = C + I + G + (X\u2212M)'),
                React.createElement('button', {
                  onClick: function() { upd('showGdpBreakdown', !(d.showGdpBreakdown)); },
                  className: 'text-[10px] text-amber-500 hover:text-amber-700 font-bold'
                }, d.showGdpBreakdown ? 'Hide' : 'Explore \u2192')
              ),
              d.showGdpBreakdown && React.createElement('div', null,
                React.createElement('div', { className: 'text-[10px] text-slate-500 italic mb-3' }, 'Gross Domestic Product measures the total value of all final goods and services produced within a country\'s borders in a given year. Here\'s how it breaks down for the United States:'),
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
                      React.createElement('div', { className: 'text-[7px] text-slate-500' }, comp.name)
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
                        React.createElement('span', { className: 'text-[10px] font-black', style: { color: comp.color } }, comp.id + ' \u2014 ' + comp.name),
                        React.createElement('span', { className: 'text-[11px] font-bold ml-auto', style: { color: comp.color } }, comp.pct + '%')
                      ),
                      React.createElement('div', { className: 'text-[11px] text-slate-600' }, comp.desc),
                      React.createElement('div', { className: 'text-[8px] text-amber-600 mt-0.5 italic' }, '\uD83D\uDCA1 ' + comp.examples)
                    );
                  })
                )
              )
            ),

            // === FAMOUS ECONOMISTS TIMELINE ===
            React.createElement('div', { className: 'bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-violet-800' }, '\uD83C\uDF93 Famous Economists'),
                React.createElement('button', {
                  onClick: function() { upd('showEconomists', !(d.showEconomists)); },
                  className: 'text-[10px] text-violet-500 hover:text-violet-700 font-bold'
                }, d.showEconomists ? 'Hide' : 'Meet Them \u2192')
              ),
              d.showEconomists && React.createElement('div', { className: 'space-y-2 max-h-72 overflow-y-auto' },
                FAMOUS_ECONOMISTS.map(function(econ, ei) {
                  var isActive = d.economistIdx === ei;
                  return React.createElement('div', { key: ei,
                    onClick: function() { upd('economistIdx', isActive ? null : ei); },
                    className: 'cursor-pointer rounded-xl p-2.5 border-2 transition-all ' + (isActive ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-300')
                  },
                    React.createElement('div', { className: 'flex items-center gap-2' },
                      React.createElement('span', { className: 'text-xl' }, econ.icon),
                      React.createElement('div', { className: 'flex-1' },
                        React.createElement('div', { className: 'flex items-center gap-2' },
                          React.createElement('span', { className: 'text-[11px] font-black text-slate-800' }, econ.name),
                          React.createElement('span', { className: 'text-[8px] text-slate-500 font-mono' }, econ.years)
                        ),
                        React.createElement('div', { className: 'text-[11px] text-violet-600 font-bold' }, econ.contribution)
                      ),
                      React.createElement('span', { className: 'text-[8px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-bold' }, econ.school)
                    ),
                    isActive && React.createElement('div', { className: 'mt-2 space-y-1 pl-8' },
                      React.createElement('div', { className: 'text-[11px] text-slate-600' },
                        React.createElement('span', { className: 'font-bold text-violet-700' }, '\uD83D\uDCDA Key Work: '),
                        econ.work
                      ),
                      React.createElement('div', { className: 'text-[11px] text-slate-600 leading-relaxed' },
                        React.createElement('span', { className: 'font-bold text-amber-600' }, '\uD83D\uDCA1 Big Idea: '),
                        econ.idea
                      )
                    )
                  );
                })
              )
            ),

            // === ECONOMIC INDICATORS REFERENCE ===
            React.createElement('div', { className: 'bg-gradient-to-r from-cyan-50 to-sky-50 rounded-xl p-4 border border-cyan-200 mb-4' },
              React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                React.createElement('h4', { className: 'text-sm font-bold text-cyan-800' }, '\uD83D\uDCCA Key Economic Indicators (' + ECONOMIC_INDICATORS.length + ')'),
                React.createElement('button', {
                  onClick: function() { upd('showIndicators', !(d.showIndicators)); },
                  className: 'text-[10px] text-cyan-500 hover:text-cyan-700 font-bold'
                }, d.showIndicators ? 'Hide' : 'View \u2192')
              ),
              d.showIndicators && React.createElement('div', { className: 'grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto' },
                ECONOMIC_INDICATORS.map(function(ind, ii) {
                  return React.createElement('div', { key: ii, className: 'rounded-lg p-2 bg-white border border-cyan-100' },
                    React.createElement('div', { className: 'flex items-center gap-1 mb-0.5' },
                      React.createElement('span', null, ind.icon),
                      React.createElement('span', { className: 'text-[10px] font-bold text-slate-700' }, ind.name)
                    ),
                    React.createElement('div', { className: 'text-[8px] text-slate-500' }, ind.desc),
                    React.createElement('div', { className: 'flex gap-2 mt-0.5' },
                      React.createElement('span', { className: 'text-[8px] text-green-600 font-bold' }, '\u2705 ' + ind.good),
                      React.createElement('span', { className: 'text-[8px] text-red-500 font-bold' }, '\u26A0 ' + ind.bad)
                    )
                  );
                })
              )
            ),


            // Macro indicators banner (always visible)

            (d.macroHistory || []).length > 0 && React.createElement('div', { className: 'flex gap-2 mb-2 bg-slate-800 rounded-lg px-3 py-1.5 text-[11px] font-mono text-slate-300 overflow-x-auto' },

              React.createElement('span', { className: 'text-slate-500' }, '\uD83C\uDFDB\uFE0F MACRO |'),

              React.createElement('span', { className: macroGDP >= 0 ? 'text-green-400' : 'text-red-400' }, 'GDP ' + (macroGDP >= 0 ? '+' : '') + macroGDP.toFixed(1) + '%'),

              React.createElement('span', { className: macroInflation > 4 ? 'text-red-400' : macroInflation > 2 ? 'text-amber-400' : 'text-green-400' }, 'INF ' + macroInflation.toFixed(1) + '%'),

              React.createElement('span', { className: macroInterest > 6 ? 'text-red-400' : 'text-amber-400' }, 'INT ' + macroInterest.toFixed(2) + '%'),

              React.createElement('span', { className: macroUnemployment > 5 ? 'text-red-400' : 'text-green-400' }, 'UNEMP ' + macroUnemployment.toFixed(1) + '%'),

              React.createElement('span', { className: macroTrade >= 0 ? 'text-green-400' : 'text-amber-400' }, 'TRADE ' + (macroTrade >= 0 ? '+' : '') + macroTrade.toFixed(1) + '%')

            ),

            // Canvas

            React.createElement('canvas', {

              ref: canvasRef,

              'aria-label': 'Interactive economics lab supply and demand visualization', tabIndex: 0,

              className: 'w-full rounded-xl border border-slate-200',

              style: { height: '250px', background: '#0f172a' }

            }),

            // Controls (below canvas, based on active tab)

            econTab === 'supplyDemand' && React.createElement('div', { className: 'mt-4' },

              // Educational Concept Panel

              React.createElement('div', { className: 'bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 mb-4' },

                React.createElement('h4', { className: 'text-sm font-bold text-blue-800 mb-2' }, '\uD83D\uDCDA Key Concepts'),

                React.createElement('div', { className: 'grid grid-cols-2 gap-3 text-[10px] text-slate-600 leading-relaxed' },

                  React.createElement('div', null,

                    React.createElement('span', { className: 'font-bold text-blue-700' }, 'Law of Demand: '),

                    'As price \u2191, quantity demanded \u2193. Consumers buy less when prices rise. The demand curve slopes downward.'

                  ),

                  React.createElement('div', null,

                    React.createElement('span', { className: 'font-bold text-red-600' }, 'Law of Supply: '),

                    'As price \u2191, quantity supplied \u2191. Producers make more when prices are high. The supply curve slopes upward.'

                  ),

                  React.createElement('div', null,

                    React.createElement('span', { className: 'font-bold text-amber-600' }, 'Equilibrium: '),

                    'Where supply meets demand. This "E" point sets the market price (P*) and quantity (Q*) automatically.'

                  ),

                  React.createElement('div', null,

                    React.createElement('span', { className: 'font-bold text-emerald-600' }, 'Shifts vs. Movements: '),

                    'Changing the price moves ALONG a curve. External factors (technology, income, preferences) SHIFT the entire curve.'

                  )

                ),

                // Dynamic educational feedback based on current slider values

                (sdPriceFloor > 0 || sdPriceCeiling > 0 || sdTax > 0 || sdDemandShift !== 0 || sdSupplyShift !== 0) && React.createElement('div', { className: 'mt-3 bg-white rounded-lg p-3 border border-blue-100' },

                  React.createElement('h5', { className: 'text-[10px] font-bold text-indigo-700 mb-1' }, '\uD83D\uDCA1 What\'s Happening Right Now:'),

                  React.createElement('div', { className: 'text-[10px] text-slate-600 space-y-1' },

                    sdDemandShift > 0 && React.createElement('p', null, '\u25B6 Demand shifted RIGHT \u2014 More people want this product (maybe income rose, or a trend made it popular). This raises both equilibrium price AND quantity.'),

                    sdDemandShift < 0 && React.createElement('p', null, '\u25B6 Demand shifted LEFT \u2014 Fewer people want this product (substitute became cheaper, or preferences changed). Both price AND quantity fall.'),

                    sdSupplyShift > 0 && React.createElement('p', null, '\u25B6 Supply shifted RIGHT \u2014 Producers can make more cheaply (new technology, lower input costs). Price falls, but quantity rises.'),

                    sdSupplyShift < 0 && React.createElement('p', null, '\u25B6 Supply shifted LEFT \u2014 Production became harder (natural disaster, regulations). Price rises, but quantity falls.'),

                    sdPriceFloor > 0 && React.createElement('p', null, '\u25B6 Price Floor at $' + sdPriceFloor + ' \u2014 Government sets a MINIMUM price (e.g., minimum wage). If above equilibrium: creates SURPLUS (quantity supplied > quantity demanded). Workers want jobs, but firms hire fewer.'),

                    sdPriceCeiling > 0 && React.createElement('p', null, '\u25B6 Price Ceiling at $' + sdPriceCeiling + ' \u2014 Government sets a MAXIMUM price (e.g., rent control). If below equilibrium: creates SHORTAGE (quantity demanded > quantity supplied). Everyone wants it, but not enough is produced.'),

                    sdTax > 0 && React.createElement('p', null, '\u25B6 Tax of $' + sdTax + ' \u2014 Government adds a per-unit tax. This creates a "tax wedge" between what buyers pay and sellers receive. Both sides bear some of the tax burden. This creates DEADWEIGHT LOSS \u2014 transactions that would have benefited both parties no longer happen.')

                  )

                )

              ),

              React.createElement('div', { className: 'grid grid-cols-2 gap-4' },

                React.createElement('div', { className: 'space-y-3 bg-blue-50 rounded-xl p-4 border border-blue-200' },

                  React.createElement('h4', { className: 'text-sm font-bold text-blue-700' }, '\uD83D\uDCC9 Curve Shifts'),

                  React.createElement('label', { className: 'block text-xs text-blue-600' }, 'Demand Shift: ' + sdDemandShift),

                  React.createElement('input', {

                    type: 'range', min: -5, max: 5, value: sdDemandShift,

                    onChange: function (e) { upd('sdDemandShift', parseInt(e.target.value)); },

                    className: 'w-full accent-blue-500'

                  }),

                  React.createElement('label', { className: 'block text-xs text-red-600' }, 'Supply Shift: ' + sdSupplyShift),

                  React.createElement('input', {

                    type: 'range', min: -5, max: 5, value: sdSupplyShift,

                    onChange: function (e) { upd('sdSupplyShift', parseInt(e.target.value)); },

                    className: 'w-full accent-red-500'

                  })

                ),

                React.createElement('div', { className: 'space-y-3 bg-emerald-50 rounded-xl p-4 border border-emerald-200' },

                  React.createElement('h4', { className: 'text-sm font-bold text-emerald-700' }, '\u2696\uFE0F Government Controls'),

                  React.createElement('label', { className: 'block text-xs text-emerald-600' }, 'Price Floor: $' + sdPriceFloor),

                  React.createElement('input', {

                    type: 'range', min: 0, max: 90, value: sdPriceFloor,

                    onChange: function (e) { upd('sdPriceFloor', parseInt(e.target.value)); },

                    className: 'w-full accent-emerald-500'

                  }),

                  React.createElement('label', { className: 'block text-xs text-orange-600' }, 'Price Ceiling: $' + sdPriceCeiling),

                  React.createElement('input', {

                    type: 'range', min: 0, max: 90, value: sdPriceCeiling,

                    onChange: function (e) { upd('sdPriceCeiling', parseInt(e.target.value)); },

                    className: 'w-full accent-orange-500'

                  }),

                  React.createElement('label', { className: 'block text-xs text-purple-600' }, 'Tax: $' + sdTax),

                  React.createElement('input', {

                    type: 'range', min: 0, max: 30, value: sdTax,

                    onChange: function (e) { upd('sdTax', parseInt(e.target.value)); },

                    className: 'w-full accent-purple-500'

                  })

                )

              ),

              // Elasticity Education

              React.createElement('div', { className: 'col-span-2 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-3 border border-cyan-200 mb-2' },

                React.createElement('h4', { className: 'text-[10px] font-bold text-cyan-700 mb-1' }, '\uD83D\uDCCF Price Elasticity of Demand'),

                React.createElement('div', { className: 'text-[11px] text-slate-600 leading-relaxed' },

                  React.createElement('p', null, '\uD83D\uDCDA ',

                    React.createElement('strong', null, 'Elasticity'), ' measures how much quantity demanded changes when price changes. ',

                    React.createElement('strong', null, 'Elastic'), ' goods (luxury items, products with substitutes) see big demand drops from small price increases. ',

                    React.createElement('strong', null, 'Inelastic'), ' goods (necessities like medicine, gasoline) have stable demand regardless of price.'

                  ),

                  React.createElement('div', { className: 'grid grid-cols-3 gap-2 mt-2' },

                    React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center border border-cyan-100' },

                      React.createElement('div', { className: 'text-lg' }, '\uD83D\uDC8E'),

                      React.createElement('div', { className: 'text-[11px] font-bold text-cyan-700' }, 'Elastic (>1)'),

                      React.createElement('div', { className: 'text-[8px] text-slate-500' }, 'Luxury goods, restaurants, vacations')

                    ),

                    React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center border border-cyan-100' },

                      React.createElement('div', { className: 'text-lg' }, '\u2696\uFE0F'),

                      React.createElement('div', { className: 'text-[11px] font-bold text-cyan-700' }, 'Unit Elastic (=1)'),

                      React.createElement('div', { className: 'text-[8px] text-slate-500' }, 'Revenue unchanged by price')

                    ),

                    React.createElement('div', { className: 'bg-white rounded-lg p-2 text-center border border-cyan-100' },

                      React.createElement('div', { className: 'text-lg' }, '\uD83D\uDC8A'),

                      React.createElement('div', { className: 'text-[11px] font-bold text-cyan-700' }, 'Inelastic (<1)'),

                      React.createElement('div', { className: 'text-[8px] text-slate-500' }, 'Medicine, gasoline, utilities')

                    )

                  )

                )

              ),

              // AI Scenario Generator

              React.createElement('div', { className: 'col-span-2 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200' },

                React.createElement('h4', { className: 'text-sm font-bold text-violet-700 mb-2' }, '\u2728 AI Scenario Generator'),

                d.sdScenario ? React.createElement('div', null,

                  React.createElement('div', { className: 'bg-white rounded-lg p-3 mb-2 border border-violet-100' },

                    React.createElement('h5', { className: 'text-xs font-bold text-slate-800' }, d.sdScenario.title),

                    React.createElement('p', { className: 'text-[10px] text-slate-600 mt-1' }, d.sdScenario.explanation),

                    React.createElement('div', { className: 'flex gap-2 mt-2 text-[10px]' },

                      React.createElement('span', { className: 'text-blue-600 font-bold' }, 'Demand: ' + (d.sdScenario.demandShift > 0 ? '+' : '') + d.sdScenario.demandShift),

                      React.createElement('span', { className: 'text-red-600 font-bold' }, 'Supply: ' + (d.sdScenario.supplyShift > 0 ? '+' : '') + d.sdScenario.supplyShift)

                    ),

                    d.sdScenario.lesson && React.createElement('div', { className: 'mt-2 bg-violet-100 rounded-lg px-3 py-2 text-[10px] text-violet-800 border border-violet-200' },

                      React.createElement('span', { className: 'font-bold' }, '\uD83D\uDCDA Concept: '),

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

                  }, '\u2705 Apply Scenario to Graph'),

                  React.createElement('button', {

                    onClick: function () { upd('sdScenario', null); },

                    className: 'w-full py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500'

                  }, 'Dismiss')

                ) : React.createElement('button', {

                  onClick: function () {

                    upd('sdLoading', true);

                    var prompt = 'You are an economics teacher. Generate a real-world supply and demand scenario for students.\n\nReturn ONLY valid JSON:\n{"title":"<short scenario title>","explanation":"<2-3 sentences explaining what happened and why it shifts supply/demand>","demandShift":<integer -5 to 5>,"supplyShift":<integer -5 to 5>,"priceFloor":<0 or number if relevant>,"priceCeiling":<0 or number if relevant>,"tax":<0 or number if relevant>}\n\nExamples: new iPhone launch (demand +3), oil embargo (supply -4), minimum wage law (price floor 40), rent control (price ceiling 30), sugar tax (tax 5). Be creative.\n\nIMPORTANT: Include a "lesson" field with a 1-2 sentence economics concept (e.g., elasticity, substitute goods, complement goods, deadweight loss, consumer surplus, producer surplus, market failure, externalities, public goods).';

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

                  className: 'w-full py-3 rounded-xl text-xs font-bold transition-all ' + (d.sdLoading ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:shadow-lg')

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

                    d.lifeEvent.lesson && React.createElement('div', { className: 'mt-2 bg-indigo-100 rounded-lg px-3 py-2 text-[10px] text-indigo-800 border border-indigo-200' },

                      React.createElement('span', { className: 'font-bold' }, '\uD83D\uDCDA Economics Concept: '),

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

                        upd('pfCash', (d.pfCash || 2000) + (eff.cash || 0));

                        upd('pfDebt', Math.max(0, (d.pfDebt || 0) + (eff.debt || 0)));

                        upd('pfSalary', Math.max(0, (d.pfSalary || 35000) + (eff.salary || 0)));

                        upd('pfHappiness', Math.min(100, Math.max(0, (d.pfHappiness || 70) + (eff.happiness || 0))));

                        upd('pfCredit', Math.min(850, Math.max(300, (d.pfCredit || 650) + (eff.credit || 0))));

                        if (eff.career) upd('pfCareer', eff.career);

                        if (eff.insurance !== undefined && eff.insurance !== null) upd('pfInsurance', eff.insurance);

                        var h = (d.pfHistory || []).slice(-29);

                        h.push({ age: d.pfAge || 22, cash: (d.pfCash || 2000) + (eff.cash || 0), debt: Math.max(0, (d.pfDebt || 0) + (eff.debt || 0)), event: d.lifeEvent.title, choice: choice.label });

                        upd('pfHistory', h);

                        // Apply housing costs

                        var housingCost = { renting: 12000, owning: 21600, frugal: 6000 };

                        var hCost = housingCost[d.pfHousing || 'renting'] || 12000;

                        // If owning, build equity (30% of payment goes to equity)

                        if ((d.pfHousing || 'renting') === 'owning') {

                          upd('pfEquity', (d.pfEquity || 0) + Math.round(hCost * 0.3));

                        }

                        upd('pfCash', (d.pfCash || 2000) + (eff.cash || 0) - hCost);

                        // Apply investment returns

                        if ((d.pfInvestPct || 0) > 0 && d.pfInvestType) {

                          var investAmt = (d.pfSalary || 35000) * (d.pfInvestPct || 0) / 100;

                          var returns = { Conservative: 0.04, Balanced: 0.07, Aggressive: 0.10, Speculative: (Math.random() - 0.3) * 0.5 };

                          var returnRate = returns[d.pfInvestType] || 0;

                          var gain = Math.round(investAmt * returnRate);

                          upd('pfCash', (d.pfCash || 2000) + (eff.cash || 0) + gain - investAmt);

                        }

                        upd('pfAge', (d.pfAge || 22) + 1);

                        upd('lifeEvent', null);

                        upd('pfLoading', false);

                        if (typeof addXP === 'function') addXP(15, 'Life Sim: Made a financial decision');

                        if (addToast) addToast((eff.cash >= 0 ? '\uD83D\uDCB0 +$' : '\uD83D\uDCC9 -$') + Math.abs(eff.cash || 0).toLocaleString() + ' | ' + choice.label, eff.cash >= 0 ? 'success' : 'warning');

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

                      React.createElement('div', { className: 'text-slate-400 mt-0.5 flex gap-3 flex-wrap' },

                        choice.effect && choice.effect.cash ? React.createElement('span', { className: choice.effect.cash >= 0 ? 'text-green-600' : 'text-red-500' }, (choice.effect.cash >= 0 ? '+' : '') + '$' + choice.effect.cash.toLocaleString()) : null,

                        choice.effect && choice.effect.debt ? React.createElement('span', { className: 'text-orange-500' }, 'Debt ' + (choice.effect.debt > 0 ? '+' : '') + '$' + choice.effect.debt.toLocaleString()) : null,

                        choice.effect && choice.effect.salary ? React.createElement('span', { className: 'text-blue-500' }, 'Salary ' + (choice.effect.salary > 0 ? '+' : '') + '$' + choice.effect.salary.toLocaleString()) : null,

                        choice.effect && choice.effect.happiness ? React.createElement('span', { className: choice.effect.happiness >= 0 ? 'text-pink-500' : 'text-slate-500' }, (choice.effect.happiness > 0 ? '+' : '') + choice.effect.happiness + ' happiness') : null,

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

                  { label: 'Cash', val: '$' + (d.pfCash || 2000).toLocaleString(), icon: '\uD83D\uDCB5', color: (d.pfCash || 2000) >= 0 ? 'green' : 'red' },

                  { label: 'Debt', val: '$' + (d.pfDebt || 0).toLocaleString(), icon: '\uD83D\uDCB3', color: (d.pfDebt || 0) > 0 ? 'red' : 'green' },

                  { label: 'Happiness', val: (d.pfHappiness || 70) + '%', icon: '\u2764\uFE0F', color: (d.pfHappiness || 70) > 50 ? 'pink' : 'slate' },

                  { label: 'Credit', val: (d.pfCredit || 650), icon: '\uD83D\uDCB3', color: (d.pfCredit || 650) > 700 ? 'green' : (d.pfCredit || 650) > 580 ? 'amber' : 'red' }

                ].map(function (s) {

                  return React.createElement('div', { key: s.label, className: 'bg-white rounded-xl p-3 border border-slate-200 text-center' },

                    React.createElement('div', { className: 'text-lg' }, s.icon),

                    React.createElement('div', { className: 'text-[10px] text-slate-500 font-bold uppercase tracking-wide' }, s.label),

                    React.createElement('div', { className: 'text-sm font-bold text-' + s.color + '-600' }, s.val)

                  );

                })

              ),

              React.createElement('div', { className: 'text-xs text-slate-500 text-center mb-2' }, (d.pfCareer ? '\uD83D\uDCBC ' + d.pfCareer + ' | ' : '') + 'Salary: $' + (d.pfSalary || 35000).toLocaleString() + '/yr | Net Worth: $' + ((d.pfCash || 2000) - (d.pfDebt || 0)).toLocaleString() + ' | Credit: ' + (d.pfCredit || 650) + (d.pfInsurance ? ' | \uD83D\uDEE1\uFE0F Insured' : ' | \u26A0\uFE0F No Insurance')),

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

                      console.error('[EconLab] Parse error:', e);

                      upd('pfLoading', false);

                      if (addToast) addToast('Failed to generate event. Try again!', 'error');

                    }

                  }).catch(function (e) { upd('pfLoading', false); if (addToast) addToast('AI error: ' + e.message, 'error'); });

                },

                disabled: d.pfLoading,

                className: 'w-full py-4 rounded-2xl text-sm font-bold shadow-lg transition-all ' + (d.pfLoading ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 hover:shadow-xl hover:scale-[1.02]')

              }, d.pfLoading ? '\u23F3 Generating life event...' : '\u2728 Next Year (Age ' + ((d.pfAge || 22) + 1) + ')'),

              // Housing decision

              React.createElement('div', { className: 'bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200 mt-3 mb-1' },

                React.createElement('h4', { className: 'text-[10px] font-bold text-orange-700 mb-2' }, '\uD83C\uDFE0 Housing Strategy'),

                React.createElement('div', { className: 'flex gap-2' },

                  [

                    { id: 'renting', label: '\uD83C\uDFE2 Rent', desc: 'Lower monthly cost, flexibility', cost: '-$1,000/mo' },

                    { id: 'owning', label: '\uD83C\uDFE0 Own', desc: 'Build equity, but mortgage + maintenance', cost: '-$1,800/mo' },

                    { id: 'frugal', label: '\uD83D\uDECB\uFE0F Roommate', desc: 'Cheapest option, save more', cost: '-$500/mo' }

                  ].map(function (h) {

                    return React.createElement('button', {

                      key: h.id,

                      onClick: function () { upd('pfHousing', h.id); },

                      className: 'flex-1 p-2 rounded-lg text-center transition-all border-2 ' +

                        ((d.pfHousing || 'renting') === h.id ? 'border-orange-400 bg-orange-100' : 'border-slate-200 bg-white hover:border-orange-300')

                    },

                      React.createElement('div', { className: 'text-[10px] font-bold text-slate-700' }, h.label),

                      React.createElement('div', { className: 'text-[8px] text-slate-500' }, h.desc),

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

                React.createElement('h4', { className: 'text-[10px] font-bold text-green-700 mb-2' }, '\uD83D\uDCCA Investment Allocation (% of annual salary invested)'),

                React.createElement('div', { className: 'flex items-center gap-3' },

                  React.createElement('input', {

                    type: 'range', min: 0, max: 50, value: d.pfInvestPct || 0,

                    onChange: function (e) { upd('pfInvestPct', parseInt(e.target.value)); },

                    className: 'flex-1 accent-green-500'

                  }),

                  React.createElement('span', { className: 'text-xs font-bold text-green-700 w-12 text-right' }, (d.pfInvestPct || 0) + '%'),

                  React.createElement('span', { className: 'text-[10px] text-slate-500' }, '$' + Math.round((d.pfSalary || 35000) * (d.pfInvestPct || 0) / 100).toLocaleString() + '/yr')

                ),

                React.createElement('div', { className: 'flex gap-1 mt-2' },

                  ['Conservative (Bonds)', 'Balanced (60/40)', 'Aggressive (Stocks)', 'Speculative (Crypto)'].map(function (type) {

                    var short = type.split(' ')[0];

                    return React.createElement('button', {

                      key: type,

                      onClick: function () { upd('pfInvestType', short); },

                      className: 'flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all ' +

                        ((d.pfInvestType || '') === short ? 'bg-green-700 text-white shadow-sm' : 'bg-white text-slate-500 border border-green-200 hover:border-green-400')

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

              (d.pfHistory || []).length > 0 && React.createElement('div', { className: 'mt-4 bg-white rounded-xl border border-slate-200 p-3 max-h-40 overflow-y-auto' },

                React.createElement('h4', { className: 'text-xs font-bold text-slate-500 mb-2' }, '\uD83D\uDCDC Life History'),

                (d.pfHistory || []).slice().reverse().map(function (h, hi) {

                  return React.createElement('div', { key: hi, className: 'flex justify-between text-[10px] py-1 border-b border-slate-50' },

                    React.createElement('span', { className: 'text-slate-500' }, 'Age ' + h.age),

                    React.createElement('span', { className: 'text-slate-600 flex-1 px-2 truncate' }, h.event + ' \u2192 ' + h.choice),

                    React.createElement('span', { className: h.cash >= (d.pfHistory[Math.max(0, d.pfHistory.length - hi - 2)] || {}).cash ? 'text-green-600 font-bold' : 'text-red-500 font-bold' }, '$' + (h.cash || 0).toLocaleString())

                  );

                })

              ),

              // Reset button

              React.createElement('button', {

                onClick: function () { upd('pfAge', 22); upd('pfCash', 2000); upd('pfDebt', 0); upd('pfSalary', 35000); upd('pfHappiness', 70); upd('pfCredit', 650); upd('pfCareer', null); upd('pfInsurance', false); upd('pfHistory', []); upd('lifeEvent', null); if (addToast) addToast('\u267B Starting over at age 22!', 'info'); },

                className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200'

              }, '\u267B New Life')

            ),



            econTab === 'stockMarket' && React.createElement('div', { className: 'mt-4' },

              // AI Market Setup (if no companies yet)

              (!smCompanies || smCompanies.length === 0) ? React.createElement('div', { className: 'text-center py-8' },

                React.createElement('div', { className: 'text-5xl mb-4' }, '\uD83D\uDCC8'),

                React.createElement('h3', { className: 'text-lg font-bold text-slate-800 mb-2' }, 'Create Your Market'),

                React.createElement('p', { className: 'text-xs text-slate-500 mb-4 max-w-sm mx-auto' }, 'Describe what kind of market you want to trade in. AI will generate 5 fictional companies with realistic financials.'),

                React.createElement('input', {

                  type: 'text',

                  value: d.smInput || '',

                  onChange: function (e) { upd('smInput', e.target.value); },

                  placeholder: 'e.g. "renewable energy startups", "gaming companies", "space industry", or leave blank for mixed...',

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

                        upd('smCash', 10000);

                        upd('smPortfolio', {});

                        upd('smDay', 0);

                        upd('smLoading', false);

                        if (addToast) addToast('\uD83D\uDCC8 Market open! 5 companies generated. Start trading!', 'success');
                        if (announceToSR) announceToSR('Stock market simulation open. 5 companies generated.');

                      } catch (err) { upd('smLoading', false); if (addToast) addToast('Failed to generate market. Try again!', 'error'); console.error('[StockSim]', err); }

                    }).catch(function (err) { upd('smLoading', false); if (addToast) addToast('AI error', 'error'); });

                  },

                  disabled: d.smLoading,

                  className: 'w-full max-w-md py-3 rounded-xl text-sm font-bold shadow-lg transition-all ' + (d.smLoading ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-xl')

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

                  smCompanies[smSelected] && React.createElement('div', { className: 'bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-3 border border-slate-200 mb-3' },

                    React.createElement('div', { className: 'flex justify-between items-center' },

                      React.createElement('div', null,

                        React.createElement('h4', { className: 'text-sm font-bold text-slate-800' }, smCompanies[smSelected].name + ' (' + smCompanies[smSelected].ticker + ')'),

                        React.createElement('span', { className: 'text-[10px] text-slate-500' }, smCompanies[smSelected].sector + (smCompanies[smSelected].description ? ' \u2014 ' + smCompanies[smSelected].description : ''))

                      ),

                      React.createElement('div', { className: 'text-right' },

                        React.createElement('div', { className: 'text-lg font-bold', style: { color: smCompanies[smSelected].color } }, '$' + smCompanies[smSelected].price.toFixed(2)),

                        smCompanies[smSelected].history && smCompanies[smSelected].history.length > 1 && React.createElement('div', {

                          className: 'text-[10px] font-bold ' + (smCompanies[smSelected].price >= smCompanies[smSelected].history[smCompanies[smSelected].history.length - 2] ? 'text-green-600' : 'text-red-500')

                        }, (smCompanies[smSelected].price >= smCompanies[smSelected].history[smCompanies[smSelected].history.length - 2] ? '\u25B2 +' : '\u25BC ') +

                        ((smCompanies[smSelected].price / smCompanies[smSelected].history[smCompanies[smSelected].history.length - 2] - 1) * 100).toFixed(1) + '%'),

                        React.createElement('div', { className: 'text-[11px] text-slate-500' }, 'Held: ' + (smPortfolio[smCompanies[smSelected].ticker] || 0) + ' shares ($' + ((smPortfolio[smCompanies[smSelected].ticker] || 0) * smCompanies[smSelected].price).toFixed(0) + ')')

                      )

                    )

                  ),

                  // AI News Event display

                  d.smNewsEvent ? React.createElement('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200 mb-3' },

                    React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, '\uD83D\uDCF0 ' + (d.smNewsEvent.headline || 'Breaking News')),

                    React.createElement('p', { className: 'text-xs text-amber-700 mt-1' }, d.smNewsEvent.analysis || ''),

                    React.createElement('div', { className: 'text-[10px] text-amber-600 mt-2 font-bold' }, 'Impact: ' + (d.smNewsEvent.impact > 0 ? '\u25B2 +' : '\u25BC ') + (d.smNewsEvent.impact * 100).toFixed(1) + '%'),

                    d.smNewsEvent.lesson && React.createElement('div', { className: 'mt-2 bg-amber-100 rounded-lg px-3 py-2 text-[10px] text-amber-800 border border-amber-200' },

                      React.createElement('span', { className: 'font-bold' }, '\uD83D\uDCDA Investing Concept: '),

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

                      className: 'py-3 px-2 rounded-xl text-[10px] font-bold bg-gradient-to-r from-green-600 to-emerald-600 text-white'

                    }, '\u25B2\u25B2 Buy 10'),

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

                    }, '\u25BC Sell 1'),

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

                      className: 'py-3 px-2 rounded-xl text-[10px] font-bold bg-gradient-to-r from-red-600 to-rose-600 text-white'

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

                            console.error('[StockSim] Parse error:', e);

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

                      className: 'py-3 px-6 rounded-xl text-xs font-bold transition-all ' + (d.smLoading ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white')

                    }, d.smLoading ? '\u23F3...' : '\u23ED Day ' + (smDay + 1))

                  ),

                  // Portfolio summary

                  React.createElement('div', { className: 'bg-white rounded-xl border border-slate-200 p-3 text-xs' },

                    React.createElement('div', { className: 'flex justify-between mb-2' },

                      React.createElement('span', { className: 'font-bold text-slate-700' }, '\uD83D\uDCBC Cash: $' + smCash.toFixed(2)),

                      React.createElement('span', { className: 'font-bold text-amber-600' }, 'Day ' + smDay),

                      React.createElement('span', { className: 'font-bold text-green-600' }, 'Total: $' + (smCash + smCompanies.reduce(function (s, c) { return s + (smPortfolio[c.ticker] || 0) * c.price; }, 0)).toFixed(2))

                    ),

                    Object.keys(smPortfolio).length > 0 && React.createElement('div', { className: 'flex gap-2 flex-wrap' },

                      Object.keys(smPortfolio).map(function (ticker) {

                        var c = smCompanies.find(function (x) { return x.ticker === ticker; });

                        return smPortfolio[ticker] > 0 ? React.createElement('span', { key: ticker, className: 'bg-slate-100 px-2 py-1 rounded text-[10px] font-bold' }, ticker + ': ' + smPortfolio[ticker] + ' ($' + (smPortfolio[ticker] * c.price).toFixed(0) + ')') : null;

                      })

                    ),

                    // Portfolio Analytics

                    smDay > 0 && React.createElement('div', { className: 'mt-3 bg-slate-50 rounded-xl p-3 border border-slate-200' },

                      React.createElement('h4', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2' }, '\uD83D\uDCC8 Portfolio Analytics'),

                      React.createElement('div', { className: 'grid grid-cols-3 gap-2 text-center' },

                        React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-100' },

                          React.createElement('div', { className: 'text-[11px] text-slate-500' }, 'Total P&L'),

                          React.createElement('div', { className: 'text-sm font-bold ' + (smTotalVal - 10000 >= 0 ? 'text-green-600' : 'text-red-500') },

                            (smTotalVal - 10000 >= 0 ? '+' : '') + '$' + (smTotalVal - 10000).toFixed(0))

                        ),

                        React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-100' },

                          React.createElement('div', { className: 'text-[11px] text-slate-500' }, 'Return %'),

                          React.createElement('div', { className: 'text-sm font-bold ' + (smTotalVal >= 10000 ? 'text-green-600' : 'text-red-500') },

                            (smTotalVal >= 10000 ? '+' : '') + ((smTotalVal / 10000 - 1) * 100).toFixed(1) + '%')

                        ),

                        React.createElement('div', { className: 'bg-white rounded-lg p-2 border border-slate-100' },

                          React.createElement('div', { className: 'text-[11px] text-slate-500' }, 'Holdings'),

                          React.createElement('div', { className: 'text-sm font-bold text-slate-700' },

                            Object.keys(smPortfolio).filter(function (t) { return smPortfolio[t] > 0; }).length + ' stocks')

                        )

                      )

                    ),

                    // Reset Market button

                    React.createElement('button', {

                      onClick: function () { upd('smCompanies', null); upd('smPortfolio', {}); upd('smCash', 10000); upd('smDay', 0); upd('smInput', ''); upd('smNewsEvent', null); if (addToast) addToast('\u267B Market reset! Create a new one.', 'info'); },

                      className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200'

                    }, '\u267B Reset Market & Generate New Companies')

                  )

                )

            ),



            econTab === 'entrepreneur' && React.createElement('div', { className: 'mt-4' },

              // Business setup (if no business yet)

              !d.enBusiness ? React.createElement('div', { className: 'text-center py-8' },

                React.createElement('div', { className: 'text-5xl mb-4' }, '\uD83D\uDE80'),

                React.createElement('h3', { className: 'text-lg font-bold text-slate-800 mb-2' }, 'Start Your Business'),

                React.createElement('p', { className: 'text-xs text-slate-500 mb-4 max-w-sm mx-auto' }, 'Type any business idea and AI will generate your startup costs, daily expenses, and pricing. Then run it day by day!'),

                React.createElement('input', {

                  type: 'text',

                  value: d.enInput || '',

                  onChange: function (e) { upd('enInput', e.target.value); },

                  placeholder: 'e.g. food truck, dog walking, tutoring, bakery, app development...',

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

                      } catch (e3) { upd('enLoading', false); if (addToast) addToast('Failed to create business. Try again!', 'error'); console.error('[BizSim]', e3); }

                    }).catch(function (e4) { upd('enLoading', false); if (addToast) addToast('AI error', 'error'); });

                  },

                  disabled: d.enLoading || !(d.enInput || '').trim(),

                  className: 'w-full max-w-md py-3 rounded-xl text-sm font-bold shadow-lg transition-all ' + (d.enLoading ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-xl')

                }, d.enLoading ? '\u23F3 AI is building your business...' : '\uD83D\uDE80 Launch Business')

              ) :

                // Active business view

                React.createElement('div', null,

                  // Business header

                  React.createElement('div', { className: 'flex items-center gap-3 mb-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200' },

                    React.createElement('span', { className: 'text-3xl' }, d.enBusiness.emoji || '\uD83C\uDFEA'),

                    React.createElement('div', { className: 'flex-1' },

                      React.createElement('h4', { className: 'text-sm font-bold text-amber-800' }, d.enBusiness.businessName),

                      React.createElement('p', { className: 'text-[10px] text-amber-600' }, d.enBusiness.description)

                    ),

                    React.createElement('div', { className: 'text-right' },

                      React.createElement('div', { className: 'text-lg font-bold ' + ((d.enBizCash || 0) >= 0 ? 'text-green-600' : 'text-red-500') }, '$' + (d.enBizCash || 0).toLocaleString()),

                      React.createElement('div', { className: 'text-[10px] text-slate-500' }, 'Day ' + (d.enBizDay || 1) + ' | Rep: ' + (d.enBizRep || 50) + '/100 | Staff: ' + (d.enBizEmployees || 0))

                    )

                  ),

                  // Price adjustment + stats

                  React.createElement('div', { className: 'grid grid-cols-3 gap-2 mb-3' },

                    React.createElement('div', { className: 'bg-amber-50 rounded-xl p-3 border border-amber-200' },

                      React.createElement('label', { className: 'block text-[10px] font-bold text-amber-700 mb-1' }, '\uD83D\uDCB2 Price per ' + (d.enBusiness.unitName || 'unit') + ': $' + (d.enBizPrice || d.enBusiness.suggestedPrice || 10).toFixed(2)),

                      React.createElement('input', {

                        type: 'range', min: 1, max: (d.enBusiness.suggestedPrice || 10) * 3, step: 0.5,

                        value: d.enBizPrice || d.enBusiness.suggestedPrice || 10,

                        onChange: function (e) { upd('enBizPrice', parseFloat(e.target.value)); },

                        className: 'w-full accent-amber-500'

                      }),

                      React.createElement('div', { className: 'text-[11px] text-amber-600 mt-0.5' }, 'Suggested: $' + (d.enBusiness.suggestedPrice || 10))

                    ),

                    React.createElement('div', { className: 'bg-blue-50 rounded-xl p-3 border border-blue-200 text-center' },

                      React.createElement('div', { className: 'text-[11px] text-blue-500 font-bold' }, 'Profit Margin'),

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

                    d.enBizEvent.lesson && React.createElement('div', { className: 'mt-2 bg-purple-100 rounded-lg px-3 py-2 text-[10px] text-purple-800 border border-purple-200' },

                      React.createElement('span', { className: 'font-bold' }, '\uD83D\uDCDA Business Concept: '),

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

                      React.createElement('div', { className: 'text-slate-400 mt-0.5 flex gap-3' },

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

                    } catch (e4) { upd('enBizLoading', false); if (addToast) addToast('Day sim failed. Try again!', 'error'); console.error('[BizSim]', e4); }

                  }).catch(function (e5) { upd('enBizLoading', false); if (addToast) addToast('AI error', 'error'); });

                },

                disabled: d.enBizLoading,

                className: 'w-full py-4 rounded-2xl text-sm font-bold shadow-lg mb-3 transition-all ' + (d.enBizLoading ? 'bg-slate-300 text-slate-500' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-xl hover:scale-[1.02]')

              }, d.enBizLoading ? '\u23F3 Simulating day...' : '\u2600\uFE0F Open for Business! (Day ' + (d.enBizDay || 1) + ')'),

              // Stats + History

              (d.enBizHistory || []).length > 0 && React.createElement('div', { className: 'bg-white rounded-xl border border-slate-200 p-3' },

                React.createElement('h4', { className: 'text-xs font-bold text-slate-500 mb-2' }, '\uD83D\uDCC8 Business History'),

                (d.enBizHistory || []).slice(-7).reverse().map(function (dh, dhi) {

                  return React.createElement('div', { key: dhi, className: 'flex justify-between text-[10px] py-1 border-b border-slate-50' },

                    React.createElement('span', { className: 'text-slate-500' }, 'Day ' + dh.day),

                    React.createElement('span', { className: 'text-slate-500' }, dh.customers + ' customers'),

                    React.createElement('span', { className: 'text-blue-500' }, 'Rev $' + (dh.revenue || 0).toFixed(0)),

                    React.createElement('span', { className: dh.profit >= 0 ? 'text-green-600 font-bold' : 'text-red-500 font-bold' }, (dh.profit >= 0 ? '+' : '') + '$' + (dh.profit || 0).toFixed(0))

                  );

                })

              ),

              // Close business

              React.createElement('button', {

                onClick: function () { upd('enBusiness', null); upd('enInput', ''); if (addToast) addToast('Business closed. Start a new one!', 'info'); },

                className: 'mt-2 w-full py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200'

              }, '\u267B Close Business & Start New')

            )

          );
      })();
    }
  });


})();

} // end dedup guard