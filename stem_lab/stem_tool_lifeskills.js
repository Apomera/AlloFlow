// ═══════════════════════════════════════════════════════
// stem_tool_lifeskills.js — Life Skills Lab  v5.0
// Enhanced STEM Lab tool — 15 sub-tools
// Paycheck · Data Literacy · Decisions · Contracts
// Insurance · Applied Science · Car Care · Home Repair
// Home Systems · Budget · Credit · Cooking
// Challenge · Battle · Learn
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

  // ── Audio (auto-injected) ──
  var _lifeskAC = null;
  function getLifeskAC() { if (!_lifeskAC) { try { _lifeskAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_lifeskAC && _lifeskAC.state === "suspended") { try { _lifeskAC.resume(); } catch(e) {} } return _lifeskAC; }
  function lifeskTone(f,d,tp,v) { var ac = getLifeskAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxLifeskClick() { lifeskTone(600, 0.03, "sine", 0.04); }


  // ═══════════════════════════════════════════════════════
  // IIFE-Scope Static Data
  // ═══════════════════════════════════════════════════════

  var SUBTOOLS = [
    { id: 'paycheck',   icon: '\uD83E\uDDFE', label: 'Paycheck' },
    { id: 'data',       icon: '\uD83D\uDCCA', label: 'Data Literacy' },
    { id: 'decision',   icon: '\uD83E\uDDE0', label: 'Decisions' },
    { id: 'contract',   icon: '\uD83D\uDCDD', label: 'Contracts' },
    { id: 'insurance',  icon: '\uD83C\uDFE5', label: 'Insurance' },
    { id: 'science',    icon: '\uD83D\uDD2C', label: 'Applied Science' },
    { id: 'carcare',    icon: '\uD83D\uDE97', label: 'Car Care' },
    { id: 'homerepair', icon: '\uD83D\uDD27', label: 'Home Repair' },
    { id: 'homesys',    icon: '\uD83C\uDFE0', label: 'Home Systems' },
    { id: 'budget',     icon: '\uD83D\uDCB0', label: 'Budget' },
    { id: 'credit',     icon: '\uD83D\uDCB3', label: 'Credit' },
    { id: 'cooking',    icon: '\uD83C\uDF73', label: 'Cooking' },
    { id: 'challenge',  icon: '\uD83C\uDFAF', label: 'Challenge' },
    { id: 'battle',     icon: '\u2694\uFE0F', label: 'Battle' },
    { id: 'learn',      icon: '\uD83D\uDCDA', label: 'Learn' }
  ];

  // ── Badges ──
  var LS_BADGES = [
    { id: 'firstPay',    icon: '\uD83E\uDDFE', name: 'First Paycheck', desc: 'Calculate your first paycheck' },
    { id: 'dataDetect',  icon: '\uD83D\uDCCA', name: 'Data Detective', desc: 'Spot 3 misleading data tricks' },
    { id: 'decisionPro', icon: '\uD83E\uDDE0', name: 'Decision Pro', desc: 'Build a decision matrix' },
    { id: 'trapFinder',  icon: '\uD83D\uDCDD', name: 'Trap Finder', desc: 'Find all traps in a contract' },
    { id: 'insured',     icon: '\uD83C\uDFE5', name: 'Plan Analyst', desc: 'Compare health insurance plans' },
    { id: 'appliedSci',  icon: '\uD83D\uDD2C', name: 'Applied Scientist', desc: 'Use 3 applied science tools' },
    { id: 'mechanic',    icon: '\uD83D\uDE97', name: 'Shade Tree Mechanic', desc: 'Complete 3 car care exercises' },
    { id: 'handyman',    icon: '\uD83D\uDD27', name: 'Handy Person', desc: 'Diagnose a plumbing problem' },
    { id: 'homeExpert',  icon: '\uD83C\uDFE0', name: 'Home Expert', desc: 'Complete 3 home systems quizzes' },
    { id: 'quizStreak3', icon: '\uD83D\uDD25', name: 'Streak x3', desc: 'Get 3 correct in a row' },
    { id: 'quizStreak5', icon: '\uD83D\uDD25', name: 'Streak x5', desc: 'Get 5 correct in a row' },
    { id: 'battleWin',   icon: '\u2694\uFE0F', name: 'Adulting Champion', desc: 'Win a Life Skills battle' },
    { id: 'aiBattle',    icon: '\uD83E\uDDE0', name: 'AI Combatant', desc: 'Win an AI-powered battle' },
    { id: 'budgeteer',  icon: '\uD83D\uDCB0', name: 'Budget Builder', desc: 'Create a monthly budget' },
    { id: 'saver',      icon: '\uD83C\uDFE6', name: 'Savings Planner', desc: 'Calculate a savings goal' },
    { id: 'creditWise', icon: '\uD83D\uDCB3', name: 'Credit Wise', desc: 'Learn all 5 FICO factors' },
    { id: 'loanCalc',   icon: '\uD83C\uDFE0', name: 'Loan Calculator', desc: 'Calculate a loan amortization' },
    { id: 'chefSafe',   icon: '\uD83C\uDF73', name: 'Food Safety Pro', desc: 'Master food safety temperatures' },
    { id: 'recipeScale', icon: '\uD83D\uDCCF', name: 'Recipe Scaler', desc: 'Scale a recipe successfully' },
    { id: 'scholar',     icon: '\uD83C\uDF93', name: 'Life Skills Scholar', desc: 'Read all Learn topics' }
  ];

  // ── Data Literacy Scenarios ──
  var DL_SCENARIOS = [
    { title: 'The Misleading Y-Axis', desc: 'A news site shows a bar chart of crime rates. The Y-axis starts at 950 instead of 0, making a 2% increase look like a 50% jump.', question: 'What technique makes this graph misleading?', options: ['Truncated Y-axis', 'Cherry-picked data', 'Correlation not causation', '3D distortion'], correct: 0, explain: 'Starting the Y-axis at a non-zero value (truncation) exaggerates small differences. Always check where the axis starts!' },
    { title: 'Ice Cream & Drowning', desc: 'A study shows ice cream sales and drowning deaths both increase in summer. Someone concludes: "Ice cream causes drowning!"', question: 'What logical fallacy is this?', options: ['Cherry-picked data', 'Survivorship bias', 'Correlation \u2260 causation', 'Appeal to authority'], correct: 2, explain: 'Both are caused by a third variable: hot weather. Correlation does not mean causation.' },
    { title: 'The Vanishing Baseline', desc: 'A company shows revenue "doubled" from $1M to $2M in 2023-2024. They omit that revenue was $3M in 2022 and crashed.', question: 'What technique is being used?', options: ['Truncated axis', 'Cherry-picked time range', 'Misleading percentage', 'Survivorship bias'], correct: 1, explain: 'By choosing a specific start date (after a crash), they hide the bigger picture.' },
    { title: 'The Percentage Trick', desc: '"Our supplement reduced colds by 50%!" Actual data: 4/100 got colds in placebo vs 2/100 in supplement group.', question: 'Why is "50% reduction" misleading?', options: ['Small sample', 'Relative vs absolute risk', 'P-hacking', 'Publication bias'], correct: 1, explain: 'Relative reduction is 50% (4\u21922), but absolute reduction is only 2 percentage points.' },
    { title: 'Survivor CEOs', desc: 'An article profiles 10 billionaire CEOs who dropped out of college and concludes: "College is unnecessary for success!"', question: 'What bias is at play?', options: ['Confirmation bias', 'Survivorship bias', 'Anchoring', 'False dichotomy'], correct: 1, explain: 'We only hear about rare successes \u2014 not the millions who dropped out and didn\'t become billionaires.' },
    { title: '3D Pie Distortion', desc: 'A 3D pie chart shows market share. The front slice (30%) appears larger than the back slice (35%) due to perspective.', question: 'What makes this misleading?', options: ['Wrong data', '3D perspective distortion', 'Missing labels', 'Wrong chart type'], correct: 1, explain: '3D effects distort perceived size. Flat 2D charts are always more accurate.' }
  ];

  // ── Contract Traps ──
  var CONTRACTS = [
    { title: '\uD83D\uDCF1 Phone Plan Agreement', text: 'Monthly service: $45/month for unlimited talk & text with 5GB data. After 5GB, speeds reduced to 128kbps. Contract: 24 months. Early termination: $200/remaining month. Device: $0 down, $35/month for 24 months ($799 retail). Activation: $35. Taxes: ~$7-12/month.', traps: [
      { id: 'term', hint: 'Early termination fee', explain: '$200 PER REMAINING MONTH. Cancel after 6 months = $200\u00D718 = $3,600!' },
      { id: 'data', hint: 'Data throttling', explain: '"Unlimited" but 128kbps after 5GB is basically unusable.' },
      { id: 'device', hint: 'Device total cost', explain: '$35/mo\u00D724 = $840 for a $799 phone. Hidden $41 interest.' },
      { id: 'fees', hint: 'Hidden monthly fees', explain: '"$45/month" actually costs $87-92/month with device + taxes + fees.' }
    ]},
    { title: '\uD83C\uDFE0 Apartment Lease', text: 'Rent: $1,200/mo. Security deposit: $1,200 (non-refundable $250 cleaning fee on move-out). Lease: 12 months, auto-renews at market rate. Late fee: $50 + $10/day after 5th. Tenant pays repairs under $100. Pet deposit: $300 + $50/month pet rent.', traps: [
      { id: 'deposit', hint: 'Non-refundable portion', explain: '$250 cleaning fee auto-deducted \u2014 you\'ll never get full deposit back.' },
      { id: 'renew', hint: 'Auto-renewal clause', explain: 'Auto-renews at "market rate" with no cap \u2014 could be a huge increase.' },
      { id: 'late', hint: 'Escalating late fee', explain: '$50 + $10/day means 15 days late = $150 penalty.' },
      { id: 'repairs', hint: 'Repair responsibility', explain: 'Under-$100 repairs on you means clogged drains, broken blinds from your pocket.' }
    ]},
    { title: '\uD83C\uDFCB\uFE0F Gym Membership', text: 'Monthly: $29.99. Annual maintenance: $49.99 (Feb). Enrollment: $0 (limited time!). Cancel: 30-day written notice by certified mail. Personal training: first free, then auto-enrolled $60/session 2x/week. Collections after 60 days overdue. Freeze: $10/month.', traps: [
      { id: 'annual', hint: 'Hidden annual fee', explain: '$49.99 "maintenance" on top of monthly = real cost $34.16/month.' },
      { id: 'cancel', hint: 'Cancellation difficulty', explain: 'CERTIFIED MAIL only? Intentionally difficult to cancel.' },
      { id: 'training', hint: 'Auto-enrollment', explain: 'After one "free" session, auto-enrolled at $120/WEEK ($480/month!).' },
      { id: 'freeze', hint: 'Freeze costs money', explain: 'Even "pausing" costs $10/month for nothing.' }
    ]},
    { title: '\uD83D\uDCB3 Credit Card Agreement', text: 'APR: 24.99% variable. Minimum payment: greater of $25 or 1% of balance + interest. Balance transfer: 3% fee, 0% intro APR for 12 months then 26.99%. Cash advance: 29.99% APR, no grace period, 5% fee ($10 min). Late payment: $40 fee + penalty APR 29.99% for 6 months. Annual fee: $0 first year, $95 after.', traps: [
      { id: 'apr', hint: 'Variable APR', explain: '24.99% VARIABLE means it rises with market rates. Could become 30%+.' },
      { id: 'minimum', hint: 'Minimum payment trap', explain: 'Paying minimum on $5,000 at 24.99% takes 30+ YEARS and costs $12,000+ in interest!' },
      { id: 'transfer', hint: 'Balance transfer bait', explain: '0% intro rate expires after 12 months, then jumps to 26.99%. Plus 3% fee upfront.' },
      { id: 'annual', hint: 'Hidden annual fee', explain: '$0 first year hooks you in, then $95/year forever. They bet you won\'t cancel.' }
    ]},
    { title: '\uD83C\uDF93 Student Loan Promissory Note', text: 'Principal: $27,000. Interest rate: 5.5% fixed (accrues during school). Repayment begins 6 months after graduation. Standard plan: $292/month for 10 years. Income-driven repayment: 10-15% of discretionary income for 20-25 years (remaining balance forgiven, but taxable). Deferment available but interest capitalizes. Total repayment (standard): $35,040.', traps: [
      { id: 'accrual', hint: 'Interest during school', explain: 'Interest accrues while studying. $27K at 5.5% for 4 years adds $6,000+ before you make a single payment!' },
      { id: 'capitalize', hint: 'Interest capitalization', explain: 'Unpaid interest gets added to principal during deferment. You pay interest ON interest.' },
      { id: 'idr', hint: 'Income-driven illusion', explain: 'Lower monthly payments but 20-25 YEAR term. Could pay $50,000+ total. Forgiven amount is taxable income!' },
      { id: 'total', hint: 'True cost of borrowing', explain: '$27K borrowed but $35K+ repaid. That\'s $8K+ in interest \u2014 a 30% markup on your education.' }
    ]}
  ];

  // ── Challenge Questions (3 tiers × 8 = 24+) ──
  var CHALLENGE_QS = [
    { tier: 1, q: 'What does FICA stand for?', a: 'federal insurance contributions act', h: 'Social Security and Medicare taxes.' },
    { tier: 1, q: 'If you earn $15/hour and work 40 hours, what is your gross weekly pay?', a: '600', h: 'Multiply hourly rate by hours.' },
    { tier: 1, q: 'What does a truncated Y-axis do to a graph?', a: 'exaggerates differences', h: 'Starting above zero makes changes look bigger.' },
    { tier: 1, q: 'What is a deductible in health insurance?', a: 'amount you pay before insurance', h: 'What you pay out of pocket first.' },
    { tier: 1, q: 'What does PSI measure in tires?', a: 'pressure', h: 'Pounds per square inch.' },
    { tier: 1, q: 'What is the #1 cause of a running toilet?', a: 'flapper', h: 'A rubber seal at the tank bottom.' },
    { tier: 1, q: 'What does GFCI protect against?', a: 'shock', h: 'Ground-fault circuit interrupter detects current leaks.' },
    { tier: 1, q: 'What type of graph is always more accurate than 3D versions?', a: '2d', h: '3D effects distort perception.' },

    { tier: 2, q: 'If your effective tax rate is 22%, what do you pay on $50,000 gross?', a: '11000', h: '22% \u00D7 $50,000.' },
    { tier: 2, q: 'What is survivorship bias?', a: 'only seeing successes', h: 'We hear about winners but not the millions who failed.' },
    { tier: 2, q: 'Premium is $250/mo with $6000 OOP max. Premium $450/mo with $3000 OOP max. Which is cheaper for heavy usage?', a: 'plan b', h: 'Calculate total: premiums + max out-of-pocket.' },
    { tier: 2, q: 'At what temperature (F) does the Maillard reaction begin?', a: '280', h: 'Amino acids + sugars brown at this temp.' },
    { tier: 2, q: 'What oil grade is most common for modern cars?', a: '5w-30', h: 'Wide temperature range, most popular.' },
    { tier: 2, q: 'What is the minimum legal tire tread depth in 32nds of an inch?', a: '2', h: 'Below this is unsafe and illegal.' },
    { tier: 2, q: 'What MERV rating is "hospital grade"?', a: '13', h: 'Catches bacteria and sneeze droplets.' },
    { tier: 2, q: 'What does CCA stand for on a car battery?', a: 'cold cranking amps', h: 'Battery power at cold temperatures.' },

    { tier: 3, q: 'If tax brackets are 10% on first $11,600 and 12% on next $35,550, what is tax on $40,000?', a: '4564', h: '$11,600\u00D70.10 + $28,400\u00D70.12.' },
    { tier: 3, q: 'A phone plan says $45/mo but actual cost with device, taxes, fees is $90/mo. What is the true 24-month cost?', a: '2160', h: '$90 \u00D7 24 months.' },
    { tier: 3, q: 'Gay-Lussac\'s Law: P1/T1 = P2/T2. If tire at 35 PSI/70\u00B0F, what PSI at 20\u00B0F? (convert to Kelvin)', a: '32', h: 'Convert F to K: (F-32)\u00D75/9+273.15, then solve.' },
    { tier: 3, q: 'Heat loss Q = Area \u00D7 \u0394T / R. If 200sqft wall, 50\u00B0F difference, R-13, what is Q in BTU/hr?', a: '769', h: '200 \u00D7 50 / 13.' },
    { tier: 3, q: 'A 120V/15A circuit has max watts of what?', a: '1800', h: 'P = V \u00D7 I.' },
    { tier: 3, q: 'Herd immunity threshold for R\u2080=4 is what percent?', a: '75', h: '1 - 1/R\u2080.' },
    { tier: 3, q: 'Solar panels: 20 panels \u00D7 400W \u00D7 5 sun-hours \u00D7 85% efficiency = how many kWh/day?', a: '34', h: 'System kW \u00D7 hours \u00D7 efficiency.' },
    { tier: 3, q: 'If a 96% AFUE gas furnace costs $750/yr in fuel, what is the actual heat delivered value?', a: '720', h: '$750 \u00D7 0.96 efficiency.' },

    { tier: 1, q: 'What is the 50/30/20 budgeting rule?', a: 'needs wants savings', h: '50% needs, 30% wants, 20% savings.' },
    { tier: 1, q: 'What is the minimum safe temperature for cooked chicken (\u00B0F)?', a: '165', h: 'Poultry must reach this temperature.' },
    { tier: 1, q: 'What is a credit score used for?', a: 'borrowing', h: 'Lenders check this before giving you a loan.' },
    { tier: 2, q: 'What is the #1 factor in your FICO credit score?', a: 'payment history', h: 'It accounts for 35% of your score.' },
    { tier: 2, q: 'A recipe makes 24 cookies. You want 36. What is the scaling factor?', a: '1.5', h: '36 / 24 = ?' },
    { tier: 2, q: 'Credit utilization should be below what percentage for best scores?', a: '30', h: 'Below 10% is even better.' },
    { tier: 3, q: '$1,000 at 7% annual interest compounded yearly for 10 years equals?', a: '1967', h: 'FV = PV \u00D7 (1+r)^n.' },
    { tier: 3, q: 'Paying minimum ($25) on $5,000 at 24.99% APR \u2014 roughly how many years to pay off?', a: '30', h: 'Minimum payments are designed to maximize interest.' }
  ];

  // ── Battle Questions ──
  var BATTLE_QS = [
    { q: 'What percentage is FICA tax (Social Security + Medicare)?', a: '7.65', h: '6.2% + 1.45%.' },
    { q: 'What does "correlation does not equal causation" mean?', a: 'two things happening together does not mean one causes the other', h: 'Ice cream and drowning both rise in summer.' },
    { q: 'What is an early termination fee?', a: 'penalty for canceling a contract early', h: 'Common in phone plans and leases.' },
    { q: 'What is the name for the amount you pay before insurance kicks in?', a: 'deductible', h: 'Your first out-of-pocket cost.' },
    { q: 'What gas law relates tire pressure and temperature?', a: 'gay-lussac', h: 'P1/T1 = P2/T2 at constant volume.' },
    { q: 'What is the rubber seal at the bottom of a toilet tank called?', a: 'flapper', h: 'Lifts when you flush.' },
    { q: 'What type of breaker is required near water (bathroom, kitchen)?', a: 'gfci', h: 'Ground-fault circuit interrupter.' },
    { q: 'How often should smoke detectors be replaced?', a: '10 years', h: 'Sensors degrade over time.' },
    { q: 'What does R-value measure?', a: 'insulation', h: 'Higher R = better insulating.' },
    { q: 'A heat pump with COP of 3 produces how many units of heat per unit of electricity?', a: '3', h: 'COP = output/input.' },
    { q: 'What temperature is the food danger zone lower bound (\u00B0F)?', a: '40', h: 'Bacteria grow fast between 40\u00B0F and 140\u00B0F.' },
    { q: 'In the 50/30/20 budget rule, what percentage goes to savings?', a: '20', h: 'Emergency fund and retirement.' },
    { q: 'What percentage of your FICO score is payment history?', a: '35', h: 'The biggest single factor.' },
    { q: 'If a recipe for 8 calls for 1.5 cups flour, how much for 12 servings?', a: '2.25', h: 'Scale factor: 12/8 = 1.5.' },
    { q: 'What does APR stand for?', a: 'annual percentage rate', h: 'The yearly cost of borrowing money.' }
  ];

  // ── Learn Topics ──
  var LEARN_TOPICS = [
    { title: 'Understanding Taxes', icon: '\uD83E\uDDFE', tryIt: 'paycheck', content: {
      'K-2': 'When grown-ups earn money at their jobs, they share a little bit with the government. This money helps pay for schools, roads, and firefighters!',
      '3-5': 'When you earn money, the government takes some as taxes. Federal taxes pay for the military and national parks. State taxes pay for schools and roads. The more you earn, the higher percentage you pay \u2014 this is called "progressive" taxation.',
      '6-8': 'The US uses a marginal tax bracket system. Only income in each bracket is taxed at that rate. Earning $50,000 doesn\'t mean ALL of it is taxed at 22% \u2014 only the portion above $47,150. FICA taxes (6.2% SS + 1.45% Medicare) are flat. Your "effective" tax rate is always lower than your "marginal" rate.',
      '9-12': 'Progressive taxation: marginal rates from 10\u201337%. Understanding tax-advantaged accounts (401k, IRA, HSA) reduces taxable income. Standard deduction ($14,600 single, 2024) vs. itemizing. FICA cap ($168,600 for SS). Additional Medicare tax (0.9%) above $200K. State taxes vary: 0% (TX, FL, WA) to ~13% (CA top rate).'
    }},
    { title: 'Critical Thinking with Data', icon: '\uD83D\uDCCA', tryIt: 'data', content: {
      'K-2': 'Not everything you see in a picture or chart is true! Sometimes people make graphs that trick your eyes. Always ask: "Does this look right?"',
      '3-5': 'People can use graphs and numbers to trick you. Watch out for: axes that don\'t start at zero, cherry-picked date ranges, 3D charts that distort sizes, and confusing percentages. Always ask: what does the FULL picture look like?',
      '6-8': 'Key data literacy concepts: Correlation \u2260 causation (confounding variables), survivorship bias (only seeing winners), relative vs. absolute risk (50% reduction sounds huge, but 4%\u21922% is tiny), truncated axes, selection bias, and p-hacking. A data-literate person asks: who collected this, how, and why?',
      '9-12': 'Advanced data literacy: Simpson\'s paradox (aggregate trends reverse in subgroups), base rate neglect, Berkson\'s paradox, ecological fallacy, regression to the mean, multiple comparisons problem, and the replication crisis. Understanding confidence intervals, p-values, and effect sizes is essential for evaluating research claims.'
    }},
    { title: 'Home Science & Maintenance', icon: '\uD83C\uDFE0', tryIt: 'homerepair', content: {
      'K-2': 'Your house is like a big machine! It has pipes for water, wires for electricity, and special systems to keep you warm or cool. Learning how they work helps keep everyone safe!',
      '3-5': 'Every home has systems: plumbing (water), electrical (power), HVAC (heating and cooling). Knowing basics like how a toilet works, what a circuit breaker does, or why insulation matters saves money and keeps you safe. These are real-world science applications!',
      '6-8': 'Home maintenance applies physics and chemistry: R-value (thermal resistance = thickness/conductivity), Ohm\'s law (V=IR for circuits), Gay-Lussac\'s law (tire pressure), water pressure (PSI), and heat transfer (conduction through walls). Understanding these concepts helps you make informed decisions about repairs and upgrades.',
      '9-12': 'Home systems engineering: HVAC efficiency (SEER/AFUE ratings), heat pump COP (coefficient of performance \u2014 300-400% efficient!), solar PV economics (LCOE, payback period, ITC credits), electrical load calculations (NEC code), and water chemistry (hardness, pH, TDS). Cost-benefit analysis of upgrades requires understanding time value of money and energy economics.'
    }},
    { title: 'Financial Literacy', icon: '\uD83D\uDCB0', tryIt: 'insurance', content: {
      'K-2': 'Money is something people use to buy things they need. It\'s important to save some money and not spend it all at once!',
      '3-5': 'Financial literacy means understanding how money works. Insurance spreads risk \u2014 many people pay a little so nobody has to pay a lot when something bad happens. Reading contracts carefully protects you from hidden fees and traps.',
      '6-8': 'Key financial concepts: compound interest (exponential growth of savings), insurance mechanics (premiums, deductibles, copays, out-of-pocket max), contract law basics (binding agreements, termination clauses), and the decision matrix (weighted multi-criteria analysis). These tools help you make rational financial decisions.',
      '9-12': 'Advanced financial literacy: time value of money (PV = FV/(1+r)^n), amortization schedules, tax-loss harvesting, insurance actuarial principles, behavioral economics (anchoring, loss aversion, sunk cost fallacy), and game theory in negotiations. Understanding these concepts is essential for major life decisions: housing, education, insurance, and retirement planning.'
    }},
    { title: 'Budgeting & Saving', icon: '\uD83D\uDCB0', tryIt: 'budget', content: {
      'K-2': 'A budget is a plan for your money! Imagine you have 10 tokens \u2014 you need some for food, some for fun, and you should save some for later.',
      '3-5': 'The 50/30/20 rule: spend 50% on things you NEED (food, housing), 30% on things you WANT (games, movies), and save 20%. Even kids can practice \u2014 if you get $10 allowance, save $2!',
      '6-8': 'Budgeting fundamentals: tracking income vs. expenses, the 50/30/20 framework (needs/wants/savings), emergency funds (3-6 months of expenses), compound interest (why starting early matters), and the difference between fixed costs (rent) and variable costs (groceries).',
      '9-12': 'Advanced budgeting: zero-based budgeting (every dollar assigned), sinking funds (saving for planned expenses), the psychology of spending (hedonic adaptation, lifestyle inflation), opportunity cost, and automating savings. Understanding compound growth: $200/month at 7% from age 18 = $1.1M by 65; starting at 28 = only $500K.'
    }},
    { title: 'Credit & Borrowing', icon: '\uD83D\uDCB3', tryIt: 'credit', content: {
      'K-2': 'Sometimes people borrow money and promise to pay it back later, plus a little extra. That extra is called interest \u2014 it\'s the cost of borrowing!',
      '3-5': 'Credit means borrowing money with a promise to repay. Your credit score (300-850) tells lenders how trustworthy you are. Paying bills on time = higher score. Higher score = lower interest rates, saving you thousands!',
      '6-8': 'FICO scores (300-850) are based on 5 factors: payment history (35%), credit utilization (30%), length of history (15%), credit mix (10%), and new credit (10%). A 100-point score difference can mean 2%+ higher interest rate on a mortgage \u2014 costing $40,000+ over 30 years.',
      '9-12': 'Credit optimization: secured vs unsecured debt, revolving vs installment credit, authorized user strategy, credit freeze vs lock, dispute process for errors (Fair Credit Reporting Act). Loan math: amortization (early payments are mostly interest), APR vs APY, points vs rate on mortgages, and why minimum payments are designed to maximize bank profit.'
    }},
    { title: 'Cooking & Food Safety', icon: '\uD83C\uDF73', tryIt: 'cooking', content: {
      'K-2': 'Cooking is like a science experiment! Heat changes food \u2014 it makes eggs go from runny to solid, and bread go from dough to delicious toast.',
      '3-5': 'Food safety is super important! Keep hot food hot (above 140\u00B0F) and cold food cold (below 40\u00B0F). Always wash hands before cooking. Use a thermometer to check meat is fully cooked. And reading nutrition labels helps you make healthy choices!',
      '6-8': 'Kitchen science: Maillard reaction (browning at 280\u00B0F), caramelization (320\u00B0F), protein denaturation (160\u00B0F). Food safety: the Danger Zone (40-140\u00B0F where bacteria double every 20 min), the 2-hour rule (discard food left out >2 hrs), and cross-contamination prevention. Recipe math: scaling ratios, unit conversions, and nutrition label literacy.',
      '9-12': 'Advanced food science: pH and food preservation (acids inhibit bacteria), water activity and shelf stability, smoke points of different oils, emulsification (mayo = oil + water + lecithin), and leavening chemistry (baking soda = base, baking powder = base + acid). FDA nutrition labeling: Daily Values (%DV), added sugars vs natural, and why "serving size" is the food industry\'s greatest marketing trick.'
    }}
  ];

  // ── Applied Science Data ──
  var COOK_REACTIONS = [
    { name: 'Water evaporates', tempF: 212, desc: 'H\u2082O molecules gain enough kinetic energy to escape liquid phase.', icon: '\uD83D\uDCA7' },
    { name: 'Sugar caramelizes', tempF: 320, desc: 'Sucrose breaks down into hundreds of new compounds, creating brown color.', icon: '\uD83C\uDF6F' },
    { name: 'Maillard reaction', tempF: 280, desc: 'Amino acids + reducing sugars \u2192 melanoidins (brown crust). Requires proteins!', icon: '\uD83E\uDD69' },
    { name: 'Gluten forms', tempF: 75, desc: 'Glutenin + gliadin proteins cross-link when hydrated, forming elastic networks.', icon: '\uD83C\uDF5E' },
    { name: 'Yeast dies', tempF: 140, desc: 'Above 140\u00B0F, yeast proteins denature. No more CO\u2082 = no more rising.', icon: '\u2620\uFE0F' },
    { name: 'Protein denatures', tempF: 160, desc: 'Heat unfolds protein structure. Collagen \u2192 gelatin, albumin coagulates.', icon: '\uD83E\uDD5A' },
    { name: 'Acrylamide forms', tempF: 400, desc: 'Asparagine + sugars at high heat \u2192 acrylamide. Don\'t burn toast!', icon: '\u26A0\uFE0F' }
  ];

  var COMMON_DEVICES = [
    { name: 'LED bulb', watts: 10 }, { name: 'Laptop', watts: 65 }, { name: 'TV (55")', watts: 100 },
    { name: 'Microwave', watts: 1100 }, { name: 'Hair dryer', watts: 1500 }, { name: 'Space heater', watts: 1500 },
    { name: 'Oven', watts: 2500 }, { name: 'Clothes dryer', watts: 5000 }
  ];

  var OIL_GRADES = [
    { grade: '0W-20', minF: -40, maxF: 68, desc: 'Ultra-thin. Great fuel economy. Required by most modern engines.', use: 'Newer cars (2010+), hybrids' },
    { grade: '5W-20', minF: -31, maxF: 68, desc: 'Thin oil for modern engines. Good cold-start protection.', use: 'Most modern sedans & SUVs' },
    { grade: '5W-30', minF: -31, maxF: 95, desc: 'Most popular grade. Wide temperature range.', use: 'All-purpose, most common' },
    { grade: '10W-30', minF: -13, maxF: 95, desc: 'Slightly thicker. Good for moderate climates.', use: 'Trucks, older engines' },
    { grade: '10W-40', minF: -13, maxF: 104, desc: 'Higher hot viscosity. Resists thinning.', use: 'Heavy-duty, hot climates' },
    { grade: '15W-40', minF: 5, maxF: 122, desc: 'Thick oil for max protection. Poor cold flow.', use: 'Diesel trucks, commercial' }
  ];

  var TOILET_PARTS = [
    { name: 'Fill Valve', desc: 'Refills the tank after flushing. Hissing = needs replacement.', icon: '\uD83D\uDEB0' },
    { name: 'Flapper', desc: 'Rubber seal at tank bottom. #1 cause of running toilets.', icon: '\uD83D\uDD34' },
    { name: 'Overflow Tube', desc: 'Safety drain. Water level should be 1" below its top.', icon: '\uD83D\uDCCF' },
    { name: 'Handle & Chain', desc: 'Too much slack = weak flush. Too tight = running.', icon: '\uD83D\uDD17' },
    { name: 'Wax Ring', desc: 'Seals base to drain. Water on floor = replace this.', icon: '\uD83D\uDFE1' },
    { name: 'Shut-off Valve', desc: 'Behind toilet. Turn clockwise to stop water. KNOW WHERE THIS IS.', icon: '\uD83D\uDEBF' }
  ];

  var TOILET_PROBLEMS = [
    { symptom: 'Toilet runs constantly with hissing sound', answer: 'Fill Valve', explain: 'Fill valve isn\'t shutting off. Cost to fix: $10-20 DIY.' },
    { symptom: 'Toilet runs intermittently ("phantom flush")', answer: 'Flapper', explain: 'Flapper leaking slowly. Replace for $5.' },
    { symptom: 'Weak flush \u2014 water swirls but doesn\'t clear', answer: 'Handle & Chain', explain: 'Chain has too much slack. Adjust to 1/2" slack.' },
    { symptom: 'Water leaking around the base on the floor', answer: 'Wax Ring', explain: 'Wax ring seal failed. $5-15 for the ring.' },
    { symptom: 'Water overflowing from tank into bowl', answer: 'Overflow Tube', explain: 'Water level too high. Adjust float downward.' }
  ];

  var DASH_LIGHTS = [
    { icon: '\uD83D\uDEE2\uFE0F', name: 'Check Engine', urgency: 'high', desc: 'Engine or emissions issue. Get scanned ASAP.', choices: ['Check Engine', 'Low Oil', 'Battery', 'Transmission'] },
    { icon: '\uD83C\uDF21\uFE0F', name: 'Temperature Warning', urgency: 'critical', desc: 'Engine overheating! PULL OVER IMMEDIATELY.', choices: ['A/C Problem', 'Temperature Warning', 'Oil Pressure', 'Coolant Level'] },
    { icon: '\uD83D\uDD0B', name: 'Battery/Charging', urgency: 'high', desc: 'Alternator not charging. Car will die soon.', choices: ['Hybrid System', 'Battery/Charging', 'Electrical Short', 'Starter Motor'] },
    { icon: '\u26A0\uFE0F', name: 'ABS Warning', urgency: 'medium', desc: 'Anti-lock braking disabled. Normal brakes still work.', choices: ['Traction Control', 'Transmission', 'ABS Warning', 'Cruise Control'] },
    { icon: '\uD83D\uDCA7', name: 'Low Oil Pressure', urgency: 'critical', desc: 'Engine can seize in minutes. STOP DRIVING.', choices: ['Washer Fluid', 'Low Oil Pressure', 'Coolant', 'Fuel Filter'] },
    { icon: '\uD83D\uDED1', name: 'Brake System', urgency: 'high', desc: 'Brake fluid low or system malfunction.', choices: ['Brake System', 'Tire Pressure', 'Stability Control', 'Power Steering'] }
  ];

  var MAINT_SCHEDULE = [
    { miles: 5000, service: 'Oil change', cost: 45, icon: '\uD83D\uDEE2\uFE0F' },
    { miles: 7500, service: 'Tire rotation', cost: 25, icon: '\uD83D\uDD04' },
    { miles: 15000, service: 'Cabin air filter', cost: 30, icon: '\uD83C\uDF2C\uFE0F' },
    { miles: 30000, service: 'Brake inspection', cost: 50, icon: '\uD83D\uDED1' },
    { miles: 50000, service: 'Spark plugs', cost: 150, icon: '\u26A1' },
    { miles: 60000, service: 'Brake pads', cost: 250, icon: '\uD83D\uDED1' },
    { miles: 75000, service: 'Timing belt', cost: 500, icon: '\u23F1\uFE0F' },
    { miles: 100000, service: 'Battery', cost: 180, icon: '\uD83D\uDD0B' }
  ];

  // ── Budget Categories ──
  var BUDGET_CATEGORIES = [
    { name: 'Housing', icon: '\uD83C\uDFE0', type: 'need', typical: 30 },
    { name: 'Groceries', icon: '\uD83D\uDED2', type: 'need', typical: 12 },
    { name: 'Transportation', icon: '\uD83D\uDE97', type: 'need', typical: 10 },
    { name: 'Utilities', icon: '\uD83D\uDCA1', type: 'need', typical: 5 },
    { name: 'Insurance', icon: '\uD83C\uDFE5', type: 'need', typical: 5 },
    { name: 'Dining Out', icon: '\uD83C\uDF54', type: 'want', typical: 5 },
    { name: 'Entertainment', icon: '\uD83C\uDFAC', type: 'want', typical: 5 },
    { name: 'Shopping', icon: '\uD83D\uDECD\uFE0F', type: 'want', typical: 5 },
    { name: 'Subscriptions', icon: '\uD83D\uDCF1', type: 'want', typical: 3 },
    { name: 'Emergency Fund', icon: '\uD83C\uDD98', type: 'save', typical: 10 },
    { name: 'Retirement/Savings', icon: '\uD83D\uDCB0', type: 'save', typical: 10 }
  ];

  // ── Credit Score Factors ──
  var CREDIT_FACTORS = [
    { name: 'Payment History', weight: 35, icon: '\uD83D\uDCC5', desc: 'On-time payments are the #1 factor.', tips: 'Never miss a payment. Set up autopay for at least the minimum.' },
    { name: 'Credit Utilization', weight: 30, icon: '\uD83D\uDCCA', desc: 'Percentage of available credit you use.', tips: 'Keep below 30%. Below 10% is ideal for highest scores.' },
    { name: 'Length of History', weight: 15, icon: '\uD83D\uDCCF', desc: 'Average age of all your credit accounts.', tips: 'Keep old accounts open even if unused. Time is your friend.' },
    { name: 'Credit Mix', weight: 10, icon: '\uD83C\uDFAF', desc: 'Variety: credit cards, auto loan, mortgage.', tips: 'Don\'t open accounts just for mix \u2014 it develops naturally over time.' },
    { name: 'New Credit', weight: 10, icon: '\uD83C\uDD95', desc: 'Recent applications (hard inquiries).', tips: 'Each hard inquiry drops score 5-10 pts for ~1 year. Shop rates within 14-day window.' }
  ];

  // ── Credit Score Ranges ──
  var CREDIT_RANGES = [
    { min: 800, max: 850, label: 'Exceptional', color: '#059669', desc: 'Best rates on everything. Top 20% of consumers.' },
    { min: 740, max: 799, label: 'Very Good', color: '#22c55e', desc: 'Better-than-average rates. Approved for most products.' },
    { min: 670, max: 739, label: 'Good', color: '#84cc16', desc: 'Near or slightly above average. Acceptable to most lenders.' },
    { min: 580, max: 669, label: 'Fair', color: '#f59e0b', desc: 'Below average. Higher rates, may need larger deposits.' },
    { min: 300, max: 579, label: 'Poor', color: '#ef4444', desc: 'Well below average. May be denied or require secured cards.' }
  ];

  // ── Food Safety Temperatures ──
  var FOOD_SAFETY = [
    { food: 'Poultry (chicken, turkey)', tempF: 165, icon: '\uD83C\uDF57', danger: 'Salmonella, Campylobacter' },
    { food: 'Ground meat (beef, pork)', tempF: 160, icon: '\uD83C\uDF54', danger: 'E. coli O157:H7' },
    { food: 'Beef steaks & roasts', tempF: 145, icon: '\uD83E\uDD69', danger: 'Rest 3 min after cooking' },
    { food: 'Pork chops & roasts', tempF: 145, icon: '\uD83E\uDD69', danger: 'Trichinella (rare but serious)' },
    { food: 'Fish & shellfish', tempF: 145, icon: '\uD83D\uDC1F', danger: 'Parasites, Vibrio, Listeria' },
    { food: 'Eggs (dishes)', tempF: 160, icon: '\uD83E\uDD5A', danger: 'Salmonella in raw eggs' },
    { food: 'Leftovers & casseroles', tempF: 165, icon: '\uD83C\uDF72', danger: 'Kill regrown bacteria' },
    { food: 'DANGER ZONE (40\u00B0-140\u00B0F)', tempF: 40, icon: '\u26A0\uFE0F', danger: 'Bacteria double every 20 minutes!' }
  ];

  // ── Nutrition Labels ──
  var NUTRITION_LABELS = [
    { title: 'Cereal Box', servingSize: '1 cup (40g)', servings: 10, calories: 150, fat: 2, sodium: 210, carbs: 33, sugar: 12, protein: 3, question: 'If you eat 2 cups, how many calories?', answer: '300', explain: '150 cal \u00D7 2 servings = 300. Always check serving size!' },
    { title: 'Juice Bottle', servingSize: '8 fl oz', servings: 2.5, calories: 120, fat: 0, sodium: 10, carbs: 29, sugar: 28, protein: 0, question: 'How many grams of sugar in the whole bottle?', answer: '70', explain: '28g \u00D7 2.5 servings = 70g. That\'s ~17 teaspoons of sugar!' },
    { title: 'Frozen Pizza', servingSize: '1/4 pizza', servings: 4, calories: 320, fat: 14, sodium: 680, carbs: 36, sugar: 5, protein: 14, question: 'Total sodium in the whole pizza (mg)?', answer: '2720', explain: '680mg \u00D7 4 = 2,720mg. Daily limit is 2,300mg \u2014 one pizza exceeds it!' },
    { title: 'Granola Bar', servingSize: '1 bar (40g)', servings: 1, calories: 190, fat: 7, sodium: 150, carbs: 29, sugar: 11, protein: 4, question: 'What % of calories come from fat? (fat=9 cal/g)', answer: '33', explain: '7g \u00D7 9 cal/g = 63 cal. 63/190 = 33%. Over 30% is high-fat.' }
  ];

  // ── Recipes for Scaling ──
  var RECIPES = [
    { name: 'Chocolate Chip Cookies', servings: 24, icon: '\uD83C\uDF6A', ingredients: [
      { amount: 2.25, unit: 'cups', item: 'flour' }, { amount: 1, unit: 'tsp', item: 'baking soda' },
      { amount: 1, unit: 'tsp', item: 'salt' }, { amount: 1, unit: 'cup', item: 'butter (softened)' },
      { amount: 0.75, unit: 'cup', item: 'sugar' }, { amount: 0.75, unit: 'cup', item: 'brown sugar' },
      { amount: 2, unit: '', item: 'eggs' }, { amount: 2, unit: 'cups', item: 'chocolate chips' }
    ]},
    { name: 'Pancakes', servings: 8, icon: '\uD83E\uDD5E', ingredients: [
      { amount: 1.5, unit: 'cups', item: 'flour' }, { amount: 3.5, unit: 'tsp', item: 'baking powder' },
      { amount: 1, unit: 'tbsp', item: 'sugar' }, { amount: 0.25, unit: 'tsp', item: 'salt' },
      { amount: 1.25, unit: 'cups', item: 'milk' }, { amount: 1, unit: '', item: 'egg' },
      { amount: 3, unit: 'tbsp', item: 'melted butter' }
    ]},
    { name: 'Mac and Cheese', servings: 6, icon: '\uD83E\uDDC0', ingredients: [
      { amount: 16, unit: 'oz', item: 'elbow macaroni' }, { amount: 4, unit: 'tbsp', item: 'butter' },
      { amount: 0.25, unit: 'cup', item: 'flour' }, { amount: 3, unit: 'cups', item: 'milk' },
      { amount: 3, unit: 'cups', item: 'shredded cheddar' }, { amount: 0.5, unit: 'tsp', item: 'salt' }
    ]}
  ];

  // ── Helper Functions ──
  function getGradeBand(ctx) {
    var g = parseInt(ctx.gradeLevel) || 5;
    if (g <= 2) return 'K-2';
    if (g <= 5) return '3-5';
    if (g <= 8) return '6-8';
    return '9-12';
  }

  function gradeText(band, k2, g35, g68, g912) {
    if (band === 'K-2') return k2;
    if (band === '3-5') return g35;
    if (band === '6-8') return g68;
    return g912;
  }

  function fmtMoney(n) {
    return '$' + Math.round(n).toLocaleString();
  }

  // ── Federal Tax Calculator ──
  function calcFedTax(grossAnnual, filing) {
    var brackets = filing === 'single' ?
      [{ limit: 11600, rate: 0.10 }, { limit: 47150, rate: 0.12 }, { limit: 100525, rate: 0.22 }, { limit: 191950, rate: 0.24 }, { limit: 243725, rate: 0.32 }, { limit: 609350, rate: 0.35 }, { limit: Infinity, rate: 0.37 }] :
      [{ limit: 23200, rate: 0.10 }, { limit: 94300, rate: 0.12 }, { limit: 201050, rate: 0.22 }, { limit: 383900, rate: 0.24 }, { limit: 487450, rate: 0.32 }, { limit: 731200, rate: 0.35 }, { limit: Infinity, rate: 0.37 }];
    var tax = 0, remaining = grossAnnual, prev = 0, breakdown = [];
    for (var i = 0; i < brackets.length && remaining > 0; i++) {
      var taxable = Math.min(remaining, brackets[i].limit - prev);
      var t = taxable * brackets[i].rate;
      tax += t;
      if (taxable > 0) breakdown.push({ rate: Math.round(brackets[i].rate * 100), amount: taxable, tax: t });
      remaining -= taxable;
      prev = brackets[i].limit;
    }
    return { tax: tax, breakdown: breakdown };
  }

  // ── Compound Interest Calculator ──
  function calcCompoundInterest(principal, rate, years, monthlyAdd) {
    var balance = principal;
    var monthlyRate = rate / 100 / 12;
    var totalContributed = principal;
    for (var m = 0; m < years * 12; m++) {
      balance = balance * (1 + monthlyRate) + (monthlyAdd || 0);
      totalContributed += (monthlyAdd || 0);
    }
    return { balance: Math.round(balance), contributed: Math.round(totalContributed), interest: Math.round(balance - totalContributed) };
  }

  // ── Loan Payment Calculator ──
  function calcLoanPayment(principal, annualRate, years) {
    var r = annualRate / 100 / 12;
    var n = years * 12;
    if (r === 0) return { monthly: Math.round(principal / n), totalPaid: principal, totalInterest: 0 };
    var monthly = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    var totalPaid = monthly * n;
    return { monthly: Math.round(monthly), totalPaid: Math.round(totalPaid), totalInterest: Math.round(totalPaid - principal) };
  }

  // ── Insurance Calculator ──
  function calcPlanCost(plan, scene) {
    var annualPremium = plan.premium * 12;
    var totalBills = scene.bills + scene.visits * 150;
    var afterDeductible = Math.max(0, totalBills - plan.deductible);
    var yourCoinsurance = afterDeductible * (plan.coinsurance / 100);
    var copays = scene.visits * plan.copay;
    var outOfPocket = Math.min(plan.oop, plan.deductible + yourCoinsurance + copays);
    return { annualPremium: annualPremium, outOfPocket: outOfPocket, total: annualPremium + outOfPocket };
  }

  // ═══════════════════════════════════════════════════════
  // Tool Registration
  // ═══════════════════════════════════════════════════════

  window.StemLab.registerTool('lifeSkills', {
    title: 'Life Skills Lab',
    icon: '\uD83E\uDDED',
    description: 'Essential knowledge for adulting \u2014 taxes, data literacy, contracts, car care, home systems, and critical thinking.',
    category: 'Life Skills',
    gradeRange: 'K-12',
    render: function(ctx) {
      var h = React.createElement;
      var d = (ctx.toolData && ctx.toolData.lifeSkills) || {};
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var a11yClick = ctx.a11yClick;
      var gradeBand = getGradeBand(ctx);

      // ── State helpers ──
      function upd(k, v) {
        ctx.setToolData(function(prev) {
          var copy = Object.assign({}, prev);
          var td = Object.assign({}, copy.lifeSkills || {});
          td[k] = v;
          copy.lifeSkills = td;
          return copy;
        });
      }
      function updMulti(obj) {
        ctx.setToolData(function(prev) {
          var copy = Object.assign({}, prev);
          var td = Object.assign({}, copy.lifeSkills || {});
          Object.keys(obj).forEach(function(k) { td[k] = obj[k]; });
          copy.lifeSkills = td;
          return copy;
        });
      }

      function awardXP(amount, reason) {
        if (typeof window.awardStemXP === 'function') window.awardStemXP('lifeSkills', amount, reason);
      }
      function checkBadge(id) {
        if (d.badges && d.badges[id]) return;
        var badges = Object.assign({}, d.badges || {});
        badges[id] = Date.now();
        upd('badges', badges);
        awardXP(15, 'Badge: ' + id);
        var b = LS_BADGES.find(function(x) { return x.id === id; });
        if (b) upd('badgeToast', b.icon + ' ' + b.name);
        setTimeout(function() { upd('badgeToast', null); }, 3000);
      }
      function stemBeep(correct) { if (typeof window.stemBeep === 'function') window.stemBeep(correct); }
      function announceToSR(msg) { upd('srMsg', msg); }

      // ── Defaults ──
      var tab = d.tab || 'paycheck';
      var glassCard = 'bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg p-4';

      // ══════════════════════════════════════════
      // PAYCHECK STATE
      // ══════════════════════════════════════════
      var payRate = d.payRate != null ? d.payRate : 15;
      var payHours = d.payHours != null ? d.payHours : 30;
      var payFreq = d.payFreq || 'biweekly';
      var payState = d.payState || 'none';
      var payFiling = d.payFiling || 'single';
      var freqMult = { weekly: 52, biweekly: 26, monthly: 12 }[payFreq] || 26;
      var grossPer = payRate * payHours * (payFreq === 'biweekly' ? 2 : payFreq === 'monthly' ? (52 / 12) : 1);
      var grossAnnual = payRate * payHours * 52;
      var fedResult = calcFedTax(grossAnnual, payFiling);
      var ssTax = Math.min(grossAnnual, 168600) * 0.062;
      var medicareTax = grossAnnual * 0.0145;
      var ficaTotal = ssTax + medicareTax;
      var stateTaxRates = { none: 0, CA: 0.055, NY: 0.055, TX: 0, FL: 0, WA: 0, IL: 0.0495, PA: 0.0307, OH: 0.035, MA: 0.05, NJ: 0.04 };
      var stateTax = grossAnnual * (stateTaxRates[payState] || 0);
      var totalTax = fedResult.tax + ficaTotal + stateTax;
      var netAnnual = grossAnnual - totalTax;
      var netPer = netAnnual / freqMult;
      var effectiveRate = grossAnnual > 0 ? (totalTax / grossAnnual * 100) : 0;

      // ══════════════════════════════════════════
      // DATA LITERACY STATE
      // ══════════════════════════════════════════
      var dlScenario = d.dlScenario || 0;
      var dlAnswer = d.dlAnswer;
      var dlRevealed = d.dlRevealed || false;
      var dlScore = d.dlScore || 0;
      var dlCurrent = DL_SCENARIOS[dlScenario % DL_SCENARIOS.length];

      // ══════════════════════════════════════════
      // DECISION MATRIX STATE
      // ══════════════════════════════════════════
      var dmOptions = d.dmOptions || ['Option A', 'Option B', 'Option C'];
      var dmCriteria = d.dmCriteria || [{ name: 'Cost', weight: 3 }, { name: 'Quality', weight: 4 }, { name: 'Time', weight: 2 }];
      var dmScores = d.dmScores || {};
      var dmTotals = dmOptions.map(function(opt, oi) {
        var total = 0;
        dmCriteria.forEach(function(c, ci) { total += (dmScores[oi + '-' + ci] || 3) * c.weight; });
        return { option: opt, total: total, index: oi };
      });
      var dmMaxTotal = Math.max.apply(null, dmTotals.map(function(x) { return x.total; }));

      // ══════════════════════════════════════════
      // CONTRACT STATE
      // ══════════════════════════════════════════
      var crLevel = d.crLevel || 0;
      var crFound = d.crFound || [];
      var crCurrent = CONTRACTS[crLevel % CONTRACTS.length];

      // ══════════════════════════════════════════
      // INSURANCE STATE
      // ══════════════════════════════════════════
      var hiPlanA = d.hiPlanA || { premium: 250, deductible: 1500, copay: 30, coinsurance: 20, oop: 6000 };
      var hiPlanB = d.hiPlanB || { premium: 450, deductible: 500, copay: 15, coinsurance: 10, oop: 3000 };
      var hiUsage = d.hiUsage || 'low';
      var usageScenarios = { low: { visits: 2, bills: 500 }, medium: { visits: 6, bills: 3000 }, high: { visits: 12, bills: 15000 } };
      var hiScene = usageScenarios[hiUsage];
      var hiCostA = calcPlanCost(hiPlanA, hiScene);
      var hiCostB = calcPlanCost(hiPlanB, hiScene);

      // ══════════════════════════════════════════
      // APPLIED SCIENCE STATE
      // ══════════════════════════════════════════
      var asCookTemp = d.asCookTemp != null ? d.asCookTemp : 350;
      var activeReactions = COOK_REACTIONS.filter(function(r) { return asCookTemp >= r.tempF; });
      var asVolts = d.asVolts != null ? d.asVolts : 120;
      var asAmps = d.asAmps != null ? d.asAmps : 15;
      var asWatts = asVolts * asAmps;
      var asRunning = d.asRunning || ['Microwave'];
      var totalLoad = 0;
      asRunning.forEach(function(name) { var dev = COMMON_DEVICES.find(function(x) { return x.name === name; }); if (dev) totalLoad += dev.watts; });
      var circuitUsage = totalLoad / asWatts * 100;
      var asTireP1 = d.asTireP1 != null ? d.asTireP1 : 35;
      var asTireT1 = d.asTireT1 != null ? d.asTireT1 : 70;
      var asTireT2 = d.asTireT2 != null ? d.asTireT2 : 20;
      var t1K = (asTireT1 - 32) * 5 / 9 + 273.15;
      var t2K = (asTireT2 - 32) * 5 / 9 + 273.15;
      var asTireP2 = asTireP1 * t2K / t1K;

      // ══════════════════════════════════════════
      // CAR CARE STATE
      // ══════════════════════════════════════════
      var ccOilTemp = d.ccOilTemp != null ? d.ccOilTemp : 70;
      var ccTread = d.ccTread != null ? d.ccTread : 6;
      var ccMileage = d.ccMileage || 30000;
      var ccDashQ = d.ccDashQ != null ? d.ccDashQ : 0;
      var ccRecommended = OIL_GRADES.filter(function(g) { return ccOilTemp >= g.minF && ccOilTemp <= g.maxF; });
      var treadStatus = ccTread <= 2 ? 'REPLACE NOW' : ccTread <= 4 ? 'Replace Soon' : ccTread <= 6 ? 'Fair' : 'Good';
      var treadColor = ccTread <= 2 ? '#ef4444' : ccTread <= 4 ? '#f59e0b' : ccTread <= 6 ? '#eab308' : '#22c55e';
      var ccCurrentDash = DASH_LIGHTS[ccDashQ % DASH_LIGHTS.length];
      var upcomingMaint = MAINT_SCHEDULE.filter(function(m) {
        var nextDue = Math.ceil(ccMileage / m.miles) * m.miles;
        return nextDue - ccMileage <= 10000;
      }).map(function(m) {
        var nextDue = Math.ceil(ccMileage / m.miles) * m.miles;
        return { service: m.service, cost: m.cost, icon: m.icon, dueAt: nextDue, milesUntil: nextDue - ccMileage };
      }).sort(function(a, b) { return a.milesUntil - b.milesUntil; });

      // ══════════════════════════════════════════
      // HOME REPAIR STATE
      // ══════════════════════════════════════════
      var plumbQ = d.plumbQ != null ? d.plumbQ : 0;
      var plumbCurrent = TOILET_PROBLEMS[plumbQ % TOILET_PROBLEMS.length];
      var paintL = d.paintL || 12, paintW = d.paintW || 10, paintH = d.paintH || 8;
      var paintCoats = d.paintCoats || 2, paintWindows = d.paintWindows || 2, paintDoors = d.paintDoors || 1;
      var paintWallArea = 2 * (paintL + paintW) * paintH;
      var paintNetArea = Math.max(0, paintWallArea - paintWindows * 15 - paintDoors * 21);
      var paintGallons = Math.ceil(paintNetArea * paintCoats / 350);

      // ══════════════════════════════════════════
      // BUDGET STATE
      // ══════════════════════════════════════════
      var budgetIncome = d.budgetIncome != null ? d.budgetIncome : 3000;
      var budgetExp = d.budgetExp || {};
      var needsTotal = 0, wantsTotal = 0, savesTotal = 0;
      BUDGET_CATEGORIES.forEach(function(cat) {
        var amt = budgetExp[cat.name] != null ? budgetExp[cat.name] : Math.round(budgetIncome * cat.typical / 100);
        if (cat.type === 'need') needsTotal += amt;
        else if (cat.type === 'want') wantsTotal += amt;
        else savesTotal += amt;
      });
      var budgetTotalSpent = needsTotal + wantsTotal + savesTotal;
      var budgetRemaining = budgetIncome - budgetTotalSpent;
      var budgetNeedsPct = budgetIncome > 0 ? Math.round(needsTotal / budgetIncome * 100) : 0;
      var budgetWantsPct = budgetIncome > 0 ? Math.round(wantsTotal / budgetIncome * 100) : 0;
      var budgetSavesPct = budgetIncome > 0 ? Math.round(savesTotal / budgetIncome * 100) : 0;

      // Savings goal calculator
      var savingsGoal = d.savingsGoal || 10000;
      var savingsMonthly = d.savingsMonthly || 200;
      var savingsRate = d.savingsRate != null ? d.savingsRate : 5;
      var savingsResult = calcCompoundInterest(0, savingsRate, 10, savingsMonthly);
      var monthsToGoal = 0;
      if (savingsMonthly > 0) {
        var bal = 0, mr = savingsRate / 100 / 12;
        while (bal < savingsGoal && monthsToGoal < 600) { bal = bal * (1 + mr) + savingsMonthly; monthsToGoal++; }
      }

      // ══════════════════════════════════════════
      // CREDIT STATE
      // ══════════════════════════════════════════
      var creditRatings = d.creditRatings || {};
      var creditExplored = d.creditExplored || 0;
      var estimatedScore = 300;
      CREDIT_FACTORS.forEach(function(f) {
        var rating = creditRatings[f.name] || 3;
        estimatedScore += Math.round(rating / 5 * f.weight * (550 / 100));
      });
      estimatedScore = Math.min(850, Math.max(300, estimatedScore));
      var scoreRange = CREDIT_RANGES.find(function(r) { return estimatedScore >= r.min && estimatedScore <= r.max; }) || CREDIT_RANGES[4];

      // Loan calculator
      var loanPrincipal = d.loanPrincipal || 25000;
      var loanRate = d.loanRate != null ? d.loanRate : 6.5;
      var loanTerm = d.loanTerm || 5;
      var loanResult = calcLoanPayment(loanPrincipal, loanRate, loanTerm);

      // Compound interest demo
      var ciPrincipal = d.ciPrincipal || 1000;
      var ciRate = d.ciRate != null ? d.ciRate : 7;
      var ciYears = d.ciYears || 20;
      var ciMonthly = d.ciMonthly || 100;
      var ciResult = calcCompoundInterest(ciPrincipal, ciRate, ciYears, ciMonthly);

      // ══════════════════════════════════════════
      // COOKING STATE
      // ══════════════════════════════════════════
      var cookRecipeIdx = d.cookRecipeIdx || 0;
      var cookScale = d.cookScale != null ? d.cookScale : 1;
      var cookRecipe = RECIPES[cookRecipeIdx % RECIPES.length];
      var cookDesiredServings = Math.round(cookRecipe.servings * cookScale);

      var nutritionIdx = d.nutritionIdx || 0;
      var nutritionAnswer = d.nutritionAnswer || '';
      var nutritionFb = d.nutritionFb || '';
      var nutritionScore = d.nutritionScore || 0;
      var nutritionCurrent = NUTRITION_LABELS[nutritionIdx % NUTRITION_LABELS.length];

      var foodSafetyQ = d.foodSafetyQ || 0;
      var foodSafetyCurrent = FOOD_SAFETY[foodSafetyQ % FOOD_SAFETY.length];
      var foodSafetyScore = d.foodSafetyScore || 0;

      // ══════════════════════════════════════════
      // CHALLENGE STATE
      // ══════════════════════════════════════════
      var chalTier = d.chalTier || 1;
      var chalIdx = d.chalIdx != null ? d.chalIdx : 0;
      var chalAnswer = d.chalAnswer || '';
      var chalFeedback = d.chalFeedback || '';
      var chalStreak = d.chalStreak || 0;
      var chalScore = d.chalScore || 0;
      var tierQs = CHALLENGE_QS.filter(function(q) { return q.tier === chalTier; });
      var chalQ = tierQs[chalIdx % tierQs.length];

      function chalCheck() {
        if (!chalAnswer.trim()) return;
        var correct = chalAnswer.trim().toLowerCase().replace(/[^a-z0-9%\/\.\-]/g, '').indexOf(chalQ.a.toLowerCase().replace(/[^a-z0-9%\/\.\-]/g, '')) >= 0;
        var newStreak = correct ? chalStreak + 1 : 0;
        var bonus = correct ? (newStreak >= 5 ? 3 : newStreak >= 3 ? 2 : 1) : 0;
        stemBeep(correct);
        updMulti({
          chalFeedback: correct ? ('\u2705 Correct!' + (bonus > 1 ? ' x' + bonus + ' streak!' : '')) : ('\u274C Answer: ' + chalQ.a),
          chalStreak: newStreak, chalScore: chalScore + (correct ? 10 * bonus : 0), chalAnswer: ''
        });
        if (correct) awardXP(10 * bonus, 'Challenge correct');
        if (newStreak >= 3) checkBadge('quizStreak3');
        if (newStreak >= 5) checkBadge('quizStreak5');
      }

      // ══════════════════════════════════════════
      // BATTLE STATE
      // ══════════════════════════════════════════
      var battleActive = d.battleActive || false;
      var battleRound = d.battleRound || 0;
      var battlePlayerHP = d.battlePlayerHP != null ? d.battlePlayerHP : 100;
      var battleEnemyHP = d.battleEnemyHP != null ? d.battleEnemyHP : 100;
      var battleAnswer = d.battleAnswer || '';
      var battleFeedback = d.battleFeedback || '';
      var battleOver = d.battleOver || false;
      var battleWon = d.battleWon || false;
      var battleUseAI = d.battleUseAI || false;
      var battleOrder = d.battleOrder || [];

      function startBattle(useAI) {
        var order = [];
        for (var j = 0; j < BATTLE_QS.length; j++) order.push(j);
        for (var k = order.length - 1; k > 0; k--) { var sw = Math.floor(Math.random() * (k + 1)); var tmp = order[k]; order[k] = order[sw]; order[sw] = tmp; }
        updMulti({ battleActive: true, battleRound: 0, battlePlayerHP: 100, battleEnemyHP: 100, battleAnswer: '', battleFeedback: '', battleOver: false, battleWon: false, battleUseAI: !!useAI, battleOrder: order, battleAIQ: null, battleAILoading: false });
        if (useAI && callGemini) {
          upd('battleAILoading', true);
          callGemini('Generate one life skills question for a ' + gradeBand + ' student about taxes, insurance, home repair, car maintenance, or data literacy. Return JSON: {"q":"question","a":"short answer","h":"hint"}').then(function(res) {
            try { var p = JSON.parse(res.replace(/```json?\n?/g, '').replace(/```/g, '').trim()); updMulti({ battleAIQ: { q: p.q, a: p.a, h: p.h || 'Think practically!' }, battleAILoading: false }); } catch(e) { upd('battleAILoading', false); }
          }).catch(function() { upd('battleAILoading', false); });
        }
      }

      function getCurrentBattleQ() {
        if (battleUseAI && d.battleAIQ) return d.battleAIQ;
        if (battleOrder.length === 0) return BATTLE_QS[0];
        return BATTLE_QS[battleOrder[battleRound % battleOrder.length]];
      }

      function battleAttack() {
        var q = getCurrentBattleQ();
        if (!q || !battleAnswer.trim()) return;
        var correct = battleAnswer.trim().toLowerCase().replace(/[^a-z0-9%\/\.\-]/g, '').indexOf(q.a.toLowerCase().replace(/[^a-z0-9%\/\.\-]/g, '')) >= 0;
        var dmg = correct ? 20 + Math.floor(Math.random() * 10) : 0;
        var enemyDmg = correct ? 0 : 15 + Math.floor(Math.random() * 10);
        var newEHP = Math.max(0, battleEnemyHP - dmg);
        var newPHP = Math.max(0, battlePlayerHP - enemyDmg);
        var over = newEHP <= 0 || newPHP <= 0;
        var won = newEHP <= 0;
        stemBeep(correct);
        updMulti({ battleEnemyHP: newEHP, battlePlayerHP: newPHP, battleFeedback: correct ? '\u2705 Hit! -' + dmg + ' damage!' : '\u274C Wrong! -' + enemyDmg + ' HP! Answer: ' + q.a, battleAnswer: '', battleOver: over, battleWon: won, battleRound: battleRound + 1, battleAIQ: null });
        if (correct) awardXP(10, 'Battle hit');
        if (over && won) { checkBadge('battleWin'); if (battleUseAI) checkBadge('aiBattle'); awardXP(25, 'Battle won'); }
        if (!over && battleUseAI && callGemini) {
          upd('battleAILoading', true);
          callGemini('Generate one life skills question for a ' + gradeBand + ' student. Return JSON: {"q":"question","a":"short answer","h":"hint"}').then(function(res) {
            try { var p = JSON.parse(res.replace(/```json?\n?/g, '').replace(/```/g, '').trim()); updMulti({ battleAIQ: { q: p.q, a: p.a, h: p.h || 'Think!' }, battleAILoading: false }); } catch(e) { upd('battleAILoading', false); }
          }).catch(function() { upd('battleAILoading', false); });
        }
      }

      // ── Learn read tracking ──
      var learnRead = d.learnRead || {};
      function markLearnRead(title) {
        var lr = Object.assign({}, learnRead); lr[title] = true; upd('learnRead', lr);
        if (Object.keys(lr).length >= LEARN_TOPICS.length) checkBadge('scholar');
      }

      // ── Slider helper ──
      function slider(label, value, min, max, step, key, fmt) {
        return h('div', { className: 'space-y-1' },
          h('div', { className: 'flex justify-between items-center' },
            h('span', { className: 'text-[11px] font-bold text-slate-600 uppercase tracking-wide' }, label),
            h('span', { className: 'text-xs font-mono font-bold text-slate-700' }, fmt ? fmt(value) : value)
          ),
          h('input', { type: 'range', min: min, max: max, step: step, value: value, onChange: function(e) { upd(key, parseFloat(e.target.value)); }, className: 'w-full h-1.5 rounded-full appearance-none cursor-pointer', style: { accentColor: '#0d9488' }, 'aria-label': label })
        );
      }

      // ═══════════════════════════════════════════════════════
      // RENDER
      // ═══════════════════════════════════════════════════════

      return h('div', { className: 'space-y-4' },

        // Badge toast
        d.badgeToast && h('div', { className: 'fixed top-4 right-4 z-50 bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-bold animate-bounce' }, '\uD83C\uDFC6 Badge: ' + d.badgeToast),

        // Header
        h('div', { className: 'bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 rounded-2xl p-5 text-white shadow-lg' },
          h('div', { className: 'flex items-center justify-between flex-wrap gap-2' },
            h('div', null,
              h('h3', { className: 'text-base font-bold flex items-center gap-2' }, '\uD83E\uDDED Life Skills Lab'),
              h('p', { className: 'text-[11px] opacity-90' }, gradeText(gradeBand,
                'Learn about money, safety, and how things work!',
                'Essential knowledge: taxes, data analysis, home science',
                'Applied STEM: financial literacy, data analysis, engineering principles',
                'Adulting essentials: progressive taxation, actuarial science, thermodynamics, electrical engineering'))
            ),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg' },
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs' }, '\uD83C\uDFC6'),
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold' }, Object.keys(d.badges || {}).length + '/' + LS_BADGES.length)
            )
          )
        ),

        // Sub-tool tabs
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1.5', role: 'tablist', 'aria-label': 'Life Skills sections' },
          SUBTOOLS.map(function(st) {
            var active = tab === st.id;
            return h('button', { 'aria-label': 'Change pay rate', key: st.id, onClick: function() { updMulti({ tab: st.id }); announceToSR('Switched to ' + st.label); },
              className: 'px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' + (active ? 'bg-teal-700 text-white shadow-md' : 'bg-white/70 text-slate-600 hover:bg-teal-50 border border-slate-200'),
              role: 'tab', 'aria-selected': active
            }, st.icon + ' ' + st.label);
          })
        ),

        // ═══ PAYCHECK TAB ═══
        tab === 'paycheck' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard + ' space-y-3' },
            h('h4', { className: 'text-sm font-bold text-slate-700' }, '\uD83E\uDDFE Paycheck & Tax Calculator'),
            h('p', { className: 'text-xs text-slate-600' }, gradeText(gradeBand, 'See how much money you get to keep!', 'See what happens between gross pay and your bank account.', 'Calculate federal marginal tax, FICA, and state withholding.', 'Progressive marginal taxation with bracket visualization, FICA cap analysis, and effective rate computation.')),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-5 gap-2' },
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Hourly Rate'), h('input', { type: 'number', step: '0.5', value: payRate, onChange: function(e) { upd('payRate', Math.max(0, parseFloat(e.target.value) || 0)); checkBadge('firstPay'); }, className: 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Hours/Week'), h('input', { type: 'number', value: payHours, onChange: function(e) { upd('payHours', Math.max(0, parseFloat(e.target.value) || 0)); }, className: 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Pay Period'), h('select', { value: payFreq, onChange: function(e) { upd('payFreq', e.target.value); }, className: 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mt-1' }, h('option', { value: 'weekly' }, 'Weekly'), h('option', { value: 'biweekly' }, 'Bi-weekly'), h('option', { value: 'monthly' }, 'Monthly'))),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'State'), h('select', { value: payState, onChange: function(e) { upd('payState', e.target.value); }, className: 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mt-1' }, h('option', { value: 'none' }, 'No State Tax'), h('option', { value: 'CA' }, 'California'), h('option', { value: 'NY' }, 'New York'), h('option', { value: 'TX' }, 'Texas (0%)'), h('option', { value: 'FL' }, 'Florida (0%)'), h('option', { value: 'IL' }, 'Illinois'), h('option', { value: 'PA' }, 'Pennsylvania'), h('option', { value: 'MA' }, 'Massachusetts'), h('option', { value: 'OH' }, 'Ohio'))),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Filing'), h('select', { value: payFiling, onChange: function(e) { upd('payFiling', e.target.value); }, className: 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mt-1' }, h('option', { value: 'single' }, 'Single'), h('option', { value: 'married' }, 'Married')))
            )
          ),
          // Results
          h('div', { className: 'grid grid-cols-3 gap-2' },
            h('div', { className: glassCard + ' text-center' }, h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase' }, 'Gross (' + payFreq + ')'), h('p', { className: 'text-xl font-bold text-emerald-600' }, fmtMoney(grossPer))),
            h('div', { className: glassCard + ' text-center' }, h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase' }, 'Taxes Taken'), h('p', { className: 'text-xl font-bold text-red-500' }, '-' + fmtMoney(totalTax / freqMult)), h('p', { className: 'text-[11px] text-red-400' }, Math.round(effectiveRate) + '% effective rate')),
            h('div', { className: glassCard + ' text-center border-2 border-emerald-300' }, h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase' }, 'Take Home'), h('p', { className: 'text-xl font-bold text-emerald-600' }, fmtMoney(netPer)), h('p', { className: 'text-[11px] text-emerald-500' }, fmtMoney(netAnnual) + '/year'))
          ),
          // Breakdown bar
          grossAnnual > 0 && h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 mb-1' }, 'Where every dollar goes:'),
            h('div', { className: 'h-6 rounded-full overflow-hidden flex' },
              h('div', { style: { width: Math.round(netAnnual / grossAnnual * 100) + '%', background: 'linear-gradient(90deg, #10b981, #059669)' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, 'Take Home'),
              h('div', { style: { width: Math.round(fedResult.tax / grossAnnual * 100) + '%', background: '#ef4444' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, 'Fed'),
              h('div', { style: { width: Math.round(ficaTotal / grossAnnual * 100) + '%', background: '#f97316' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, 'FICA'),
              stateTax > 0 && h('div', { style: { width: Math.round(stateTax / grossAnnual * 100) + '%', background: '#a855f7' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, 'State')
            )
          ),
          // Bracket table
          (gradeBand === '6-8' || gradeBand === '9-12') && h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 mb-1' }, '\uD83D\uDCCA Federal Tax Brackets:'),
            h('table', { className: 'w-full text-[11px]' },
              h('caption', { className: 'sr-only' }, 'lifeskills data table'), h('thead', null, h('tr', { className: 'border-b border-slate-200' }, h('th', { scope: 'col', className: 'px-2 py-1 text-left' }, 'Rate'), h('th', { className: 'px-2 py-1 text-right' }, 'Taxable'), h('th', { className: 'px-2 py-1 text-right text-red-500' }, 'Tax'))),
              h('tbody', null,
                fedResult.breakdown.map(function(b, i) {
                  return h('tr', { key: i, className: i % 2 === 0 ? '' : 'bg-slate-50' }, h('td', { className: 'px-2 py-1 font-bold' }, b.rate + '%'), h('td', { className: 'px-2 py-1 text-right' }, fmtMoney(b.amount)), h('td', { className: 'px-2 py-1 text-right font-bold text-red-500' }, fmtMoney(b.tax)));
                }),
                h('tr', { className: 'bg-orange-50 border-t' }, h('td', { className: 'px-2 py-1 font-bold text-orange-600', colSpan: 2 }, 'FICA (SS 6.2% + Medicare 1.45%)'), h('td', { className: 'px-2 py-1 text-right font-bold text-orange-500' }, fmtMoney(ficaTotal)))
              )
            )
          )
        ),

        // ═══ DATA LITERACY TAB ═══
        tab === 'data' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDCCA Data Literacy & Media Analysis'),
            h('p', { className: 'text-xs text-slate-600' }, 'Can you spot the deception? Score: ' + dlScore + '/' + DL_SCENARIOS.length)
          ),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-lg text-[11px] font-bold' }, 'Scenario ' + (dlScenario + 1) + '/' + DL_SCENARIOS.length + ': ' + dlCurrent.title),
            h('p', { className: 'text-xs text-slate-700 mt-2 leading-relaxed' }, dlCurrent.desc),
            h('p', { className: 'text-xs font-bold text-slate-600 mt-3 mb-2' }, dlCurrent.question),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'grid grid-cols-2 gap-2' },
              dlCurrent.options.map(function(opt, oi) {
                var isCorrect = oi === dlCurrent.correct;
                var isSelected = dlAnswer === oi;
                var revealed = dlRevealed;
                return h('button', { 'aria-label': 'Select option', key: oi, onClick: function() {
                  if (!dlRevealed) {
                    updMulti({ dlAnswer: oi, dlRevealed: true, dlScore: dlScore + (oi === dlCurrent.correct ? 1 : 0) });
                    stemBeep(oi === dlCurrent.correct);
                    if (dlScore + (oi === dlCurrent.correct ? 1 : 0) >= 3) checkBadge('dataDetect');
                  }
                }, className: 'p-2 rounded-xl text-xs font-bold text-left transition-all border-2 ' + (revealed ? (isCorrect ? 'border-emerald-400 bg-emerald-50' : isSelected ? 'border-red-400 bg-red-50' : 'border-slate-200') : isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300') }, opt);
              })
            ),
            dlRevealed && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-3 p-3 rounded-xl ' + (dlAnswer === dlCurrent.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200') },
              h('p', { className: 'text-xs font-bold ' + (dlAnswer === dlCurrent.correct ? 'text-emerald-700' : 'text-red-700') }, dlAnswer === dlCurrent.correct ? '\u2705 Correct!' : '\u274C Incorrect'),
              h('p', { className: 'text-xs text-slate-600 mt-1' }, dlCurrent.explain)
            ),
            dlRevealed && h('button', { 'aria-label': 'Next Scenario', onClick: function() { updMulti({ dlScenario: dlScenario + 1, dlAnswer: null, dlRevealed: false }); }, className: 'mt-2 px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl' }, 'Next Scenario \u27A1')
          )
        ),

        // ═══ DECISIONS TAB ═══
        tab === 'decision' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83E\uDDE0 Decision Matrix'),
            h('p', { className: 'text-xs text-slate-600' }, 'Rate each option on each criterion (1-5). Weights determine importance.')
          ),
          h('div', { className: glassCard },
            h('table', { className: 'w-full text-[11px]' },
              h('caption', { className: 'sr-only' }, '\uD83E\uDDE0 Decision Matrix'), h('thead', null, h('tr', { className: 'border-b border-slate-200' },
                h('th', { scope: 'col', className: 'px-2 py-1 text-left' }, 'Criteria (weight)'),
                dmOptions.map(function(opt, oi) { return h('th', { scope: 'col', key: oi, className: 'px-2 py-1 text-center' }, opt); })
              )),
              h('tbody', null,
                dmCriteria.map(function(c, ci) {
                  return h('tr', { key: ci, className: ci % 2 === 0 ? '' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold' }, c.name + ' (w:' + c.weight + ')'),
                    dmOptions.map(function(opt, oi) {
                      var key = oi + '-' + ci;
                      return h('td', { key: oi, className: 'px-2 py-1 text-center' },
                        h('input', { type: 'range', 'aria-label': 'dm scores', min: 1, max: 5, value: dmScores[key] || 3, onChange: function(e) {
                          var s = Object.assign({}, dmScores); s[key] = parseInt(e.target.value); upd('dmScores', s); checkBadge('decisionPro');
                        }, className: 'w-full', 'aria-label': opt + ' ' + c.name }),
                        h('span', { className: 'text-[11px] font-mono' }, dmScores[key] || 3)
                      );
                    })
                  );
                })
              )
            ),
            // Results
            h('div', { className: 'grid grid-cols-3 gap-2 mt-3' },
              dmTotals.sort(function(a, b) { return b.total - a.total; }).map(function(t, i) {
                return h('div', { key: t.index, className: 'text-center p-2 rounded-xl ' + (i === 0 ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-slate-50 border border-slate-200') },
                  h('p', { className: 'text-[11px] font-bold ' + (i === 0 ? 'text-emerald-700' : 'text-slate-600') }, (i === 0 ? '\uD83C\uDFC6 ' : '') + t.option),
                  h('p', { className: 'text-lg font-bold ' + (i === 0 ? 'text-emerald-600' : 'text-slate-600') }, t.total),
                  h('div', { className: 'h-2 bg-slate-200 rounded-full mt-1 overflow-hidden' },
                    h('div', { className: 'h-full rounded-full', style: { width: (dmMaxTotal > 0 ? t.total / dmMaxTotal * 100 : 0) + '%', background: i === 0 ? '#10b981' : '#94a3b8' } })
                  )
                );
              })
            )
          )
        ),

        // ═══ CONTRACTS TAB ═══
        tab === 'contract' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDCDD Contract Trap Finder'),
            h('p', { className: 'text-xs text-slate-600' }, 'Read the fine print. Find all ' + crCurrent.traps.length + ' hidden traps!')
          ),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-1.5 mb-2' },
            CONTRACTS.map(function(c, i) {
              return h('button', { 'aria-label': 'Change cr found', key: i, onClick: function() { updMulti({ crLevel: i, crFound: [] }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold ' + (crLevel % CONTRACTS.length === i ? 'bg-teal-700 text-white' : 'bg-white border border-slate-200 text-slate-600') }, c.title);
            })
          ),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('p', { className: 'text-xs text-slate-700 leading-relaxed whitespace-pre-line' }, crCurrent.text),
            h('p', { className: 'text-[11px] font-bold text-amber-600 mt-3 mb-2' }, '\uD83D\uDD0D Traps found: ' + crFound.length + '/' + crCurrent.traps.length),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'grid grid-cols-2 gap-2' },
              crCurrent.traps.map(function(trap) {
                var found = crFound.indexOf(trap.id) >= 0;
                return h('button', { 'aria-label': 'Lifeskills action', key: trap.id, onClick: function() {
                  if (!found) {
                    var list = crFound.concat([trap.id]);
                    upd('crFound', list);
                    stemBeep(true);
                    if (list.length >= crCurrent.traps.length) checkBadge('trapFinder');
                    awardXP(10, 'Found trap: ' + trap.hint);
                  }
                }, className: 'p-2 rounded-xl text-left text-[11px] transition-all border ' + (found ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200 hover:border-amber-300') },
                  found ? h('div', null, h('p', { className: 'font-bold text-red-700' }, '\u26A0\uFE0F ' + trap.hint), h('p', { className: 'text-red-600 mt-0.5' }, trap.explain)) :
                  h('p', { className: 'text-slate-600 italic' }, '\uD83D\uDD0D Click to investigate: ' + trap.hint)
                );
              })
            )
          )
        ),

        // ═══ INSURANCE TAB ═══
        tab === 'insurance' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83C\uDFE5 Health Insurance Comparison'),
            h('p', { className: 'text-xs text-slate-600' }, 'Compare two plans at different usage levels.')
          ),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard + ' space-y-2' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2' },
              ['low', 'medium', 'high'].map(function(u) {
                return h('button', { 'aria-label': 'Select option', key: u, onClick: function() { upd('hiUsage', u); checkBadge('insured'); }, className: 'px-3 py-1.5 rounded-xl text-xs font-bold ' + (hiUsage === u ? 'bg-teal-700 text-white' : 'bg-white border border-slate-200') }, u.charAt(0).toUpperCase() + u.slice(1) + ' Usage');
              })
            ),
            h('p', { className: 'text-[11px] text-slate-600' }, 'Scenario: ' + hiScene.visits + ' doctor visits + ' + fmtMoney(hiScene.bills) + ' in medical bills')
          ),
          h('div', { className: 'grid grid-cols-2 gap-3' },
            [{ label: 'Plan A', cost: hiCostA, plan: hiPlanA, color: '#3b82f6' }, { label: 'Plan B', cost: hiCostB, plan: hiPlanB, color: '#8b5cf6' }].map(function(p) {
              var isBetter = (p.label === 'Plan A' ? hiCostA.total <= hiCostB.total : hiCostB.total < hiCostA.total);
              return h('div', { key: p.label, className: glassCard + (isBetter ? ' ring-2 ring-emerald-300' : '') },
                h('p', { className: 'text-xs font-bold text-slate-700 mb-2' }, p.label + (isBetter ? ' \u2705 Better' : '')),
                h('div', { className: 'space-y-1 text-[11px]' },
                  h('p', null, 'Premium: ' + fmtMoney(p.plan.premium) + '/mo'),
                  h('p', null, 'Deductible: ' + fmtMoney(p.plan.deductible)),
                  h('p', null, 'Copay: ' + fmtMoney(p.plan.copay)),
                  h('p', null, 'Coinsurance: ' + p.plan.coinsurance + '%'),
                  h('p', null, 'OOP Max: ' + fmtMoney(p.plan.oop)),
                  h('hr'),
                  h('p', { className: 'font-bold' }, 'Annual Premiums: ' + fmtMoney(p.cost.annualPremium)),
                  h('p', { className: 'font-bold' }, 'Out-of-Pocket: ' + fmtMoney(p.cost.outOfPocket)),
                  h('p', { className: 'text-sm font-bold', style: { color: isBetter ? '#059669' : '#ef4444' } }, 'TOTAL: ' + fmtMoney(p.cost.total))
                )
              );
            })
          )
        ),

        // ═══ APPLIED SCIENCE TAB ═══
        tab === 'science' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDD2C Applied Science'),
            h('p', { className: 'text-xs text-slate-600' }, 'Science you use every day \u2014 cooking, tires, circuits')
          ),
          // Cooking Chemistry
          h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, '\uD83C\uDF73 Cooking Chemistry'),
            slider('Oven Temperature (\u00B0F)', asCookTemp, 100, 500, 10, 'asCookTemp', function(v) { return v + '\u00B0F'; }),
            h('div', { className: 'mt-2 space-y-1' },
              COOK_REACTIONS.map(function(r) {
                var active = asCookTemp >= r.tempF;
                return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: r.name, className: 'flex items-center gap-2 p-1.5 rounded-lg ' + (active ? 'bg-amber-50' : 'opacity-40') },
                  h('span', null, r.icon),
                  h('div', null, h('p', { className: 'text-[11px] font-bold ' + (active ? 'text-amber-700' : 'text-slate-600') }, r.name + ' (' + r.tempF + '\u00B0F)'), active && h('p', { className: 'text-[11px] text-slate-600' }, r.desc))
                );
              })
            )
          ),
          // Circuit Breaker
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, '\u26A1 Circuit Load Calculator'),
            h('p', { className: 'text-xs text-slate-600 mb-2' }, 'Circuit: ' + asVolts + 'V \u00D7 ' + asAmps + 'A = ' + asWatts + 'W max'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1.5' },
              COMMON_DEVICES.map(function(dev) {
                var on = asRunning.indexOf(dev.name) >= 0;
                return h('button', { 'aria-label': 'Lifeskills action', key: dev.name, onClick: function() {
                  var list = asRunning.slice();
                  var idx = list.indexOf(dev.name);
                  if (idx >= 0) list.splice(idx, 1); else list.push(dev.name);
                  upd('asRunning', list);
                  checkBadge('appliedSci');
                }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold ' + (on ? 'bg-yellow-100 border-yellow-400 border' : 'bg-white border border-slate-200') }, dev.name + ' (' + dev.watts + 'W)');
              })
            ),
            h('div', { className: 'mt-2' },
              h('div', { className: 'relative h-5 bg-slate-200 rounded-full overflow-hidden' },
                h('div', { className: 'absolute inset-y-0 left-0 rounded-full transition-all', style: { width: Math.min(100, circuitUsage) + '%', background: circuitUsage > 100 ? '#ef4444' : circuitUsage > 80 ? '#f59e0b' : '#22c55e' } })
              ),
              h('p', { className: 'text-[11px] font-bold mt-1 ' + (circuitUsage > 100 ? 'text-red-600' : 'text-slate-600') },
                totalLoad + 'W / ' + asWatts + 'W (' + Math.round(circuitUsage) + '%)' + (circuitUsage > 100 ? ' \u26A0\uFE0F BREAKER WILL TRIP!' : ''))
            )
          ),
          // Tire Pressure
          h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, '\uD83D\uDE97 Tire Pressure & Gay-Lussac\'s Law'),
            slider('Fill Pressure (PSI)', asTireP1, 28, 44, 1, 'asTireP1'),
            slider('Fill Temperature (\u00B0F)', asTireT1, 0, 120, 5, 'asTireT1'),
            slider('Current Temperature (\u00B0F)', asTireT2, -20, 120, 5, 'asTireT2'),
            h('div', { className: 'mt-2 grid grid-cols-2 gap-2' },
              h('div', { className: 'text-center p-2 bg-blue-50 rounded-xl' }, h('p', { className: 'text-[11px] font-bold text-slate-600' }, 'Current PSI'), h('p', { className: 'text-lg font-bold text-blue-600' }, asTireP2.toFixed(1))),
              h('div', { className: 'text-center p-2 bg-amber-50 rounded-xl' }, h('p', { className: 'text-[11px] font-bold text-slate-600' }, 'PSI Change'), h('p', { className: 'text-lg font-bold ' + (asTireP2 < asTireP1 ? 'text-red-600' : 'text-emerald-600') }, (asTireP2 - asTireP1 > 0 ? '+' : '') + (asTireP2 - asTireP1).toFixed(1)))
            ),
            (gradeBand === '6-8' || gradeBand === '9-12') && h('p', { className: 'text-[11px] text-slate-600 mt-1 font-mono' }, 'P\u2081/T\u2081 = P\u2082/T\u2082 | ' + asTireP1 + '/' + t1K.toFixed(1) + 'K = ' + asTireP2.toFixed(1) + '/' + t2K.toFixed(1) + 'K')
          )
        ),

        // ═══ CAR CARE TAB ═══
        tab === 'carcare' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDE97 Car Care Science'),
            h('p', { className: 'text-xs text-slate-600' }, 'Oil, tires, battery, maintenance, and dashboard lights')
          ),
          // Oil Viscosity
          h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, '\uD83D\uDEE2\uFE0F Oil Viscosity Guide'),
            slider('Climate Temperature (\u00B0F)', ccOilTemp, -40, 120, 5, 'ccOilTemp'),
            h('div', { className: 'space-y-1 mt-2' },
              OIL_GRADES.map(function(g) {
                var inRange = ccOilTemp >= g.minF && ccOilTemp <= g.maxF;
                return h('div', { key: g.grade, className: 'flex items-center gap-2 p-1.5 rounded-lg ' + (inRange ? 'bg-emerald-50 border border-emerald-200' : 'opacity-40') },
                  h('span', { className: 'text-xs font-bold w-16 ' + (inRange ? 'text-emerald-700' : 'text-slate-600') }, g.grade),
                  h('span', { className: 'text-[11px] text-slate-600 flex-1' }, g.desc),
                  inRange && h('span', { className: 'text-[11px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded' }, '\u2705 RECOMMENDED')
                );
              })
            )
          ),
          // Tire Tread
          h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, '\uD83D\uDEB2 Tire Tread Depth'),
            slider('Tread Depth (32nds inch)', ccTread, 0, 10, 1, 'ccTread'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-3 mt-2' },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex-1 h-4 bg-slate-200 rounded-full overflow-hidden' },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'h-full rounded-full transition-all', style: { width: (ccTread / 10 * 100) + '%', background: treadColor } })
              ),
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold', style: { color: treadColor } }, treadStatus + ' (' + ccTread + '/32")')
            ),
            ccTread <= 2 && h('p', { className: 'text-[11px] font-bold text-red-600 mt-1' }, '\u26A0\uFE0F UNSAFE: Below legal minimum (2/32"). Replace immediately!')
          ),
          // Dashboard Lights Quiz
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, '\uD83D\uDEA8 Dashboard Light Quiz'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-center mb-3' }, h('span', { className: 'text-4xl' }, ccCurrentDash.icon), h('p', { className: 'text-xs font-bold text-slate-700 mt-1' }, 'What does this warning light mean?')),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'grid grid-cols-2 gap-2' },
              ccCurrentDash.choices.map(function(c, i) {
                return h('button', { 'aria-label': 'Next Light', key: i, onClick: function() {
                  var correct = c === ccCurrentDash.name;
                  stemBeep(correct);
                  updMulti({ ccDashFb: correct ? '\u2705 Correct! ' + ccCurrentDash.desc : '\u274C Wrong! It\'s ' + ccCurrentDash.name + '. ' + ccCurrentDash.desc });
                  if (correct) { awardXP(10, 'Dashboard quiz'); checkBadge('mechanic'); }
                }, className: 'p-2 rounded-xl text-xs font-bold border border-slate-200 hover:border-teal-300' }, c);
              })
            ),
            d.ccDashFb && h('p', { className: 'text-[11px] font-bold mt-2 p-2 rounded-lg ' + (d.ccDashFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700') }, d.ccDashFb),
            h('button', { 'aria-label': 'Next Light', onClick: function() { updMulti({ ccDashQ: ccDashQ + 1, ccDashFb: null }); }, className: 'mt-2 px-3 py-1.5 text-[11px] font-bold bg-teal-700 text-white rounded-xl' }, 'Next Light \u27A1')
          ),
          // Maintenance Schedule
          h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, '\uD83D\uDD27 Maintenance Schedule'),
            slider('Current Mileage', ccMileage, 0, 150000, 5000, 'ccMileage', function(v) { return v.toLocaleString() + ' mi'; }),
            h('div', { className: 'space-y-1 mt-2' },
              upcomingMaint.slice(0, 5).map(function(m) {
                return h('div', { key: m.service, className: 'flex items-center gap-2 p-1.5 rounded-lg bg-amber-50' },
                  h('span', null, m.icon),
                  h('span', { className: 'text-[11px] font-bold flex-1' }, m.service),
                  h('span', { className: 'text-[11px] text-amber-600' }, 'in ' + m.milesUntil.toLocaleString() + ' mi'),
                  h('span', { className: 'text-[11px] font-bold text-slate-600' }, '~' + fmtMoney(m.cost))
                );
              })
            )
          )
        ),

        // ═══ HOME REPAIR TAB ═══
        tab === 'homerepair' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDD27 Home Repair'),
            h('p', { className: 'text-xs text-slate-600' }, 'Plumbing, paint calculator, and DIY diagnostics')
          ),
          // Toilet Diagnosis
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, '\uD83D\uDEBD Toilet Diagnosis'),
            h('p', { className: 'text-xs text-slate-700 mb-2' }, '\uD83D\uDD0D Symptom: "' + plumbCurrent.symptom + '"'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'grid grid-cols-3 gap-1.5' },
              TOILET_PARTS.map(function(part) {
                return h('button', { 'aria-label': 'Change paint l', key: part.name, onClick: function() {
                  var correct = part.name === plumbCurrent.answer;
                  stemBeep(correct);
                  updMulti({ plumbFb: correct ? '\u2705 Correct! ' + plumbCurrent.explain : '\u274C Not ' + part.name + '. Try again!' });
                  if (correct) { checkBadge('handyman'); awardXP(15, 'Plumbing diagnosis'); }
                }, className: 'p-2 rounded-xl text-center text-[11px] font-bold border border-slate-200 hover:border-teal-300' },
                  h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-lg block' }, part.icon), part.name
                );
              })
            ),
            d.plumbFb && h('p', { className: 'text-[11px] font-bold mt-2 p-2 rounded-lg ' + (d.plumbFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700') }, d.plumbFb),
            h('button', { 'aria-label': 'Next Problem', onClick: function() { updMulti({ plumbQ: plumbQ + 1, plumbFb: null }); }, className: 'mt-2 px-3 py-1.5 text-[11px] font-bold bg-teal-700 text-white rounded-xl' }, 'Next Problem \u27A1')
          ),
          // Paint Calculator
          h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, '\uD83C\uDFA8 Paint Calculator'),
            h('div', { className: 'grid grid-cols-3 gap-2' },
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Length (ft)'), h('input', { type: 'number', value: paintL, onChange: function(e) { upd('paintL', parseInt(e.target.value) || 0); }, className: 'w-full px-2 py-1 border border-slate-200 rounded-lg text-sm mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Width (ft)'), h('input', { type: 'number', value: paintW, onChange: function(e) { upd('paintW', parseInt(e.target.value) || 0); }, className: 'w-full px-2 py-1 border border-slate-200 rounded-lg text-sm mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Height (ft)'), h('input', { type: 'number', value: paintH, onChange: function(e) { upd('paintH', parseInt(e.target.value) || 0); }, className: 'w-full px-2 py-1 border border-slate-200 rounded-lg text-sm mt-1' }))
            ),
            slider('Coats', paintCoats, 1, 3, 1, 'paintCoats'),
            slider('Windows', paintWindows, 0, 6, 1, 'paintWindows'),
            slider('Doors', paintDoors, 0, 4, 1, 'paintDoors'),
            h('div', { className: 'mt-2 grid grid-cols-3 gap-2 text-center' },
              h('div', { className: 'bg-slate-50 rounded-xl p-2' }, h('p', { className: 'text-[11px] font-bold text-slate-600' }, 'Net Area'), h('p', { className: 'text-sm font-bold' }, paintNetArea + ' sqft')),
              h('div', { className: 'bg-slate-50 rounded-xl p-2' }, h('p', { className: 'text-[11px] font-bold text-slate-600' }, 'Gallons Needed'), h('p', { className: 'text-sm font-bold text-teal-600' }, paintGallons)),
              h('div', { className: 'bg-slate-50 rounded-xl p-2' }, h('p', { className: 'text-[11px] font-bold text-slate-600' }, 'Est. Cost'), h('p', { className: 'text-sm font-bold' }, fmtMoney(paintGallons * 30) + '-' + fmtMoney(paintGallons * 55)))
            )
          )
        ),

        // ═══ HOME SYSTEMS TAB ═══
        tab === 'homesys' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83C\uDFE0 Home Systems'),
            h('p', { className: 'text-xs text-slate-600' }, 'HVAC, electrical, fire safety, and energy')
          ),
          // Quick links to AI analysis
          callGemini && h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, '\uD83E\uDDE0 AI Home Advisor'),
            h('p', { className: 'text-xs text-slate-600 mb-2' }, 'Ask AI about any home system question:'),
            h('div', { className: 'flex gap-2' },
              h('input', { type: 'text', value: d.homeQ || '', onChange: function(e) { upd('homeQ', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter' && d.homeQ) {
                upd('homeALoading', true);
                callGemini('Answer this home maintenance question for a ' + gradeBand + ' student in 2-3 sentences: ' + d.homeQ).then(function(r) { updMulti({ homeA: r, homeALoading: false }); }).catch(function() { upd('homeALoading', false); });
              }}, placeholder: 'e.g. "Why does my furnace make a clicking sound?"', className: 'flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs' }),
              h('button', { 'aria-label': 'Lifeskills action', onClick: function() {
                if (!d.homeQ) return;
                upd('homeALoading', true);
                callGemini('Answer this home maintenance question for a ' + gradeBand + ' student in 2-3 sentences: ' + d.homeQ).then(function(r) { updMulti({ homeA: r, homeALoading: false }); checkBadge('homeExpert'); }).catch(function() { upd('homeALoading', false); });
              }, disabled: d.homeALoading, className: 'px-4 py-2 text-xs font-bold bg-purple-600 text-white rounded-xl disabled:opacity-50' }, d.homeALoading ? '\uD83E\uDDE0...' : '\uD83E\uDDE0 Ask')
            ),
            d.homeA && h('div', { className: 'mt-2 p-3 bg-purple-50 rounded-xl text-xs text-slate-700 whitespace-pre-line' }, d.homeA)
          ),
          // Quick info cards
          h('div', { className: 'grid grid-cols-2 gap-3' },
            h('div', { className: glassCard },
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, '\uD83D\uDD25 HVAC Tips'),
              h('ul', { className: 'text-[11px] text-slate-600 space-y-1' },
                h('li', null, '\u2022 Change air filter every 90 days'),
                h('li', null, '\u2022 MERV 8-11 is best for most homes'),
                h('li', null, '\u2022 Set thermostat to 68\u00B0F winter / 78\u00B0F summer'),
                h('li', null, '\u2022 Annual tune-up saves 5-15% on energy')
              )
            ),
            h('div', { className: glassCard },
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, '\u26A1 Electrical Safety'),
              h('ul', { className: 'text-[11px] text-slate-600 space-y-1' },
                h('li', null, '\u2022 GFCI required in wet areas (bathroom, kitchen)'),
                h('li', null, '\u2022 AFCI required in bedrooms (since 2002)'),
                h('li', null, '\u2022 Never exceed circuit capacity (P=V\u00D7I)'),
                h('li', null, '\u2022 Know your main breaker location')
              )
            ),
            h('div', { className: glassCard },
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, '\uD83D\uDD25 Fire Safety'),
              h('ul', { className: 'text-[11px] text-slate-600 space-y-1' },
                h('li', null, '\u2022 Smoke detector in every bedroom + hallway'),
                h('li', null, '\u2022 CO detector on every floor'),
                h('li', null, '\u2022 Replace detectors every 10 years'),
                h('li', null, '\u2022 Test monthly, change batteries yearly')
              )
            ),
            h('div', { className: glassCard },
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, '\u2600\uFE0F Energy Savings'),
              h('ul', { className: 'text-[11px] text-slate-600 space-y-1' },
                h('li', null, '\u2022 LED bulbs save 75% vs incandescent'),
                h('li', null, '\u2022 Heat pumps are 300% efficient (COP 3.0)'),
                h('li', null, '\u2022 Insulation R-value: higher = better'),
                h('li', null, '\u2022 30% federal solar tax credit (ITC)')
              )
            )
          )
        ),

        // ═══ BUDGET TAB ═══
        tab === 'budget' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDCB0 Monthly Budget Builder'),
            h('p', { className: 'text-xs text-slate-600' }, gradeText(gradeBand, 'Plan how to spend your money!', 'Build a budget using the 50/30/20 rule.', 'Create a zero-based monthly budget with needs, wants, and savings.', 'Zero-based budgeting: every dollar gets a job. Analyze your spending against the 50/30/20 framework.'))
          ),
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-center gap-3 mb-2' },
              h('label', { className: 'text-[11px] font-bold text-slate-600 uppercase' }, 'Monthly Income'),
              h('input', { type: 'number', step: '100', value: budgetIncome, onChange: function(e) { upd('budgetIncome', Math.max(0, parseInt(e.target.value) || 0)); checkBadge('budgeteer'); }, className: 'w-32 px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold' }),
              h('span', { className: 'text-xs font-bold text-slate-600' }, fmtMoney(budgetIncome) + '/month')
            ),
            // 50/30/20 bar
            h('div', { className: 'space-y-1' },
              h('div', { className: 'flex justify-between text-[11px] font-bold' },
                h('span', { className: 'text-blue-600' }, 'Needs ' + budgetNeedsPct + '% (goal: 50%)'),
                h('span', { className: 'text-purple-600' }, 'Wants ' + budgetWantsPct + '% (goal: 30%)'),
                h('span', { className: 'text-emerald-600' }, 'Savings ' + budgetSavesPct + '% (goal: 20%)')
              ),
              h('div', { className: 'h-5 rounded-full overflow-hidden flex bg-slate-200' },
                needsTotal > 0 && h('div', { style: { width: budgetNeedsPct + '%', background: '#3b82f6' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, fmtMoney(needsTotal)),
                wantsTotal > 0 && h('div', { style: { width: budgetWantsPct + '%', background: '#8b5cf6' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, fmtMoney(wantsTotal)),
                savesTotal > 0 && h('div', { style: { width: budgetSavesPct + '%', background: '#059669' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, fmtMoney(savesTotal))
              )
            ),
            // Category sliders
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3' },
              BUDGET_CATEGORIES.map(function(cat) {
                var amt = budgetExp[cat.name] != null ? budgetExp[cat.name] : Math.round(budgetIncome * cat.typical / 100);
                var typeColor = cat.type === 'need' ? 'text-blue-600' : cat.type === 'want' ? 'text-purple-600' : 'text-emerald-600';
                return h('div', { key: cat.name, className: 'flex items-center gap-2 p-1.5 rounded-lg bg-white/50' },
                  h('span', { className: 'text-sm' }, cat.icon),
                  h('div', { className: 'flex-1' },
                    h('div', { className: 'flex justify-between text-[11px] font-bold' },
                      h('span', { className: typeColor }, cat.name),
                      h('span', { className: 'font-mono text-slate-600' }, fmtMoney(amt))
                    ),
                    h('input', { type: 'range', min: 0, max: Math.max(Math.round(budgetIncome * 0.5), 1), step: 10, value: amt, 'aria-label': cat.name + ' budget: ' + fmtMoney(amt), onChange: function(e) {
                      var exp = Object.assign({}, budgetExp); exp[cat.name] = parseInt(e.target.value); upd('budgetExp', exp);
                    }, className: 'w-full h-1 rounded-full appearance-none cursor-pointer', style: { accentColor: cat.type === 'need' ? '#3b82f6' : cat.type === 'want' ? '#8b5cf6' : '#059669' } })
                  )
                );
              })
            ),
            // Summary
            h('div', { className: 'grid grid-cols-3 gap-2 mt-3' },
              h('div', { className: 'text-center p-2 rounded-xl bg-blue-50' }, h('p', { className: 'text-[11px] font-bold text-blue-500 uppercase' }, 'Needs'), h('p', { className: 'text-sm font-bold text-blue-700' }, fmtMoney(needsTotal)), h('p', { className: 'text-[11px] ' + (budgetNeedsPct <= 50 ? 'text-emerald-500' : 'text-red-500') }, budgetNeedsPct + '% of income')),
              h('div', { className: 'text-center p-2 rounded-xl bg-purple-50' }, h('p', { className: 'text-[11px] font-bold text-purple-500 uppercase' }, 'Wants'), h('p', { className: 'text-sm font-bold text-purple-700' }, fmtMoney(wantsTotal)), h('p', { className: 'text-[11px] ' + (budgetWantsPct <= 30 ? 'text-emerald-500' : 'text-red-500') }, budgetWantsPct + '% of income')),
              h('div', { className: 'text-center p-2 rounded-xl bg-emerald-50' }, h('p', { className: 'text-[11px] font-bold text-emerald-500 uppercase' }, 'Savings'), h('p', { className: 'text-sm font-bold text-emerald-700' }, fmtMoney(savesTotal)), h('p', { className: 'text-[11px] ' + (budgetSavesPct >= 20 ? 'text-emerald-500' : 'text-amber-500') }, budgetSavesPct + '% of income'))
            ),
            budgetRemaining !== 0 && h('div', { className: 'text-center p-2 rounded-xl mt-2 ' + (budgetRemaining > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200') },
              h('p', { className: 'text-xs font-bold ' + (budgetRemaining > 0 ? 'text-emerald-700' : 'text-red-700') }, budgetRemaining > 0 ? fmtMoney(budgetRemaining) + ' unassigned \u2014 add to savings!' : fmtMoney(Math.abs(budgetRemaining)) + ' OVER BUDGET!')
            )
          ),
          // Savings Goal Calculator
          h('div', { className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, '\uD83C\uDFE6 Savings Goal Calculator'),
            h('div', { className: 'grid grid-cols-3 gap-2' },
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Goal Amount'), h('input', { type: 'number', step: '1000', value: savingsGoal, onChange: function(e) { upd('savingsGoal', Math.max(0, parseInt(e.target.value) || 0)); checkBadge('saver'); }, className: 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Monthly Savings'), h('input', { type: 'number', step: '25', value: savingsMonthly, onChange: function(e) { upd('savingsMonthly', Math.max(0, parseInt(e.target.value) || 0)); }, className: 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Interest Rate (%)'), h('input', { type: 'number', step: '0.5', value: savingsRate, onChange: function(e) { upd('savingsRate', Math.max(0, parseFloat(e.target.value) || 0)); }, className: 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mt-1' }))
            ),
            monthsToGoal > 0 && monthsToGoal < 600 && h('div', { className: 'text-center p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl' },
              h('p', { className: 'text-lg font-bold text-emerald-700' }, Math.floor(monthsToGoal / 12) + ' years, ' + (monthsToGoal % 12) + ' months'),
              h('p', { className: 'text-[11px] text-slate-600' }, 'to reach ' + fmtMoney(savingsGoal) + ' saving ' + fmtMoney(savingsMonthly) + '/month at ' + savingsRate + '% interest')
            ),
            h('p', { className: 'text-[11px] text-slate-600 mt-1' }, '\uD83D\uDCC8 10-year projection: ' + fmtMoney(savingsResult.balance) + ' (' + fmtMoney(savingsResult.contributed) + ' contributed + ' + fmtMoney(savingsResult.interest) + ' interest)')
          )
        ),

        // ═══ CREDIT TAB ═══
        tab === 'credit' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDCB3 Credit & Loans'),
            h('p', { className: 'text-xs text-slate-600' }, gradeText(gradeBand, 'Borrowing money costs extra \u2014 that\'s called interest!', 'Learn what makes a good credit score and how loans work.', 'Explore FICO score factors, compound interest, and loan amortization.', 'Credit optimization, compound interest modeling, amortization schedules, and debt cost analysis.'))
          ),
          // FICO Score Builder
          h('div', { className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, '\uD83D\uDCCA FICO Score Builder'),
            h('p', { className: 'text-xs text-slate-600 mb-2' }, 'Rate each factor 1-5 to see how your score changes:'),
            CREDIT_FACTORS.map(function(f) {
              var rating = creditRatings[f.name] || 3;
              var labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
              return h('div', { key: f.name, className: 'p-2 rounded-lg bg-white/50 space-y-1' },
                h('div', { className: 'flex justify-between items-center' },
                  h('span', { className: 'text-[11px] font-bold text-slate-700' }, f.icon + ' ' + f.name + ' (' + f.weight + '%)'),
                  h('span', { className: 'text-[11px] font-bold px-1.5 py-0.5 rounded ' + (rating >= 4 ? 'bg-emerald-100 text-emerald-700' : rating >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700') }, labels[rating - 1])
                ),
                h('input', { type: 'range', min: 1, max: 5, value: rating, 'aria-label': f.name + ' credit rating: ' + labels[rating - 1], onChange: function(e) {
                  var r = Object.assign({}, creditRatings); r[f.name] = parseInt(e.target.value); upd('creditRatings', r);
                  var explored = Object.keys(r).length;
                  upd('creditExplored', explored);
                  if (explored >= 5) checkBadge('creditWise');
                }, className: 'w-full h-1.5 rounded-full appearance-none cursor-pointer', style: { accentColor: '#0d9488' } }),
                h('p', { className: 'text-[11px] text-slate-600' }, f.tips)
              );
            }),
            // Score display
            h('div', { className: 'text-center p-4 rounded-xl mt-2', style: { background: 'linear-gradient(135deg, ' + scoreRange.color + '15, ' + scoreRange.color + '30)' } },
              h('p', { className: 'text-3xl font-bold', style: { color: scoreRange.color } }, estimatedScore),
              h('p', { className: 'text-xs font-bold', style: { color: scoreRange.color } }, scoreRange.label),
              h('p', { className: 'text-[11px] text-slate-600 mt-1' }, scoreRange.desc),
              // Score bar
              h('div', { className: 'relative h-3 bg-slate-200 rounded-full mt-3 overflow-hidden' },
                h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', className: 'absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 rounded-full', style: { width: '100%' } }),
                h('div', { className: 'absolute top-0 w-0.5 h-full bg-white shadow-md', style: { left: ((estimatedScore - 300) / 550 * 100) + '%' } })
              ),
              h('div', { className: 'flex justify-between text-[11px] text-slate-600 mt-1' }, h('span', null, '300'), h('span', null, '850'))
            )
          ),
          // Compound Interest Calculator
          h('div', { className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, '\uD83D\uDCC8 Compound Interest \u2014 "The 8th Wonder of the World"'),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Starting $'), h('input', { type: 'number', step: '500', value: ciPrincipal, onChange: function(e) { upd('ciPrincipal', Math.max(0, parseInt(e.target.value) || 0)); }, className: 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Monthly Add'), h('input', { type: 'number', step: '25', value: ciMonthly, onChange: function(e) { upd('ciMonthly', Math.max(0, parseInt(e.target.value) || 0)); }, className: 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Rate (%)'), h('input', { type: 'number', step: '0.5', value: ciRate, onChange: function(e) { upd('ciRate', Math.max(0, parseFloat(e.target.value) || 0)); }, className: 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Years'), h('input', { type: 'number', step: '1', value: ciYears, onChange: function(e) { upd('ciYears', Math.max(1, Math.min(50, parseInt(e.target.value) || 1))); }, className: 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mt-1' }))
            ),
            h('div', { className: 'grid grid-cols-3 gap-2 mt-2' },
              h('div', { className: 'text-center p-2 rounded-xl bg-blue-50' }, h('p', { className: 'text-[11px] font-bold text-blue-500 uppercase' }, 'You Put In'), h('p', { className: 'text-sm font-bold text-blue-700' }, fmtMoney(ciResult.contributed))),
              h('div', { className: 'text-center p-2 rounded-xl bg-emerald-50' }, h('p', { className: 'text-[11px] font-bold text-emerald-500 uppercase' }, 'Interest Earned'), h('p', { className: 'text-sm font-bold text-emerald-700' }, fmtMoney(ciResult.interest))),
              h('div', { className: 'text-center p-2 rounded-xl bg-gradient-to-r from-blue-50 to-emerald-50 border-2 border-emerald-300' }, h('p', { className: 'text-[11px] font-bold text-teal-600 uppercase' }, 'Total Value'), h('p', { className: 'text-lg font-bold text-teal-700' }, fmtMoney(ciResult.balance)))
            ),
            // Visual bar
            ciResult.balance > 0 && h('div', { className: 'h-5 rounded-full overflow-hidden flex mt-2' },
              h('div', { style: { width: Math.round(ciResult.contributed / ciResult.balance * 100) + '%', background: '#3b82f6' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, 'Contributed'),
              h('div', { style: { width: Math.round(ciResult.interest / ciResult.balance * 100) + '%', background: '#059669' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, 'Interest')
            )
          ),
          // Loan Calculator
          h('div', { className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, '\uD83C\uDFE0 Loan Payment Calculator'),
            h('div', { className: 'grid grid-cols-3 gap-2' },
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Loan Amount'), h('input', { type: 'number', step: '1000', value: loanPrincipal, onChange: function(e) { upd('loanPrincipal', Math.max(0, parseInt(e.target.value) || 0)); checkBadge('loanCalc'); }, className: 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'APR (%)'), h('input', { type: 'number', step: '0.25', value: loanRate, onChange: function(e) { upd('loanRate', Math.max(0, parseFloat(e.target.value) || 0)); }, className: 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Years'), h('select', { value: loanTerm, onChange: function(e) { upd('loanTerm', parseInt(e.target.value)); }, className: 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold mt-1' },
                [1, 2, 3, 5, 7, 10, 15, 20, 30].map(function(y) { return h('option', { key: y, value: y }, y + ' years'); })
              ))
            ),
            h('div', { className: 'grid grid-cols-3 gap-2 mt-2' },
              h('div', { className: 'text-center p-2 rounded-xl bg-blue-50' }, h('p', { className: 'text-[11px] font-bold text-blue-500 uppercase' }, 'Monthly Payment'), h('p', { className: 'text-lg font-bold text-blue-700' }, fmtMoney(loanResult.monthly))),
              h('div', { className: 'text-center p-2 rounded-xl bg-red-50' }, h('p', { className: 'text-[11px] font-bold text-red-500 uppercase' }, 'Total Interest'), h('p', { className: 'text-lg font-bold text-red-600' }, fmtMoney(loanResult.totalInterest))),
              h('div', { className: 'text-center p-2 rounded-xl bg-slate-100' }, h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase' }, 'Total Paid'), h('p', { className: 'text-sm font-bold text-slate-700' }, fmtMoney(loanResult.totalPaid)))
            ),
            loanResult.totalInterest > 0 && h('div', { className: 'h-4 rounded-full overflow-hidden flex mt-2' },
              h('div', { style: { width: Math.round(loanPrincipal / loanResult.totalPaid * 100) + '%', background: '#3b82f6' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, 'Principal'),
              h('div', { style: { width: Math.round(loanResult.totalInterest / loanResult.totalPaid * 100) + '%', background: '#ef4444' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, 'Interest')
            ),
            (gradeBand === '6-8' || gradeBand === '9-12') && h('p', { className: 'text-[11px] text-slate-600 mt-1' }, '\uD83D\uDCA1 That ' + loanRate + '% rate costs you ' + fmtMoney(loanResult.totalInterest) + ' extra \u2014 a ' + (loanPrincipal > 0 ? Math.round(loanResult.totalInterest / loanPrincipal * 100) : 0) + '% markup on the loan.')
          )
        ),

        // ═══ COOKING TAB ═══
        tab === 'cooking' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83C\uDF73 Cooking & Food Safety'),
            h('p', { className: 'text-xs text-slate-600' }, gradeText(gradeBand, 'Cooking is science you can eat!', 'Learn food safety temps, scale recipes, and read nutrition labels.', 'Kitchen STEM: food safety microbiology, recipe ratios, and nutrition label analysis.', 'Food science: safe internal temps, danger zone microbiology, recipe scaling algebra, and FDA nutrition label literacy.'))
          ),
          // Recipe Scaler
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, '\uD83D\uDCCF Recipe Scaler'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 mb-2' },
              RECIPES.map(function(r, i) {
                return h('button', { 'aria-label': 'Select cooking recipe', key: i, onClick: function() { updMulti({ cookRecipeIdx: i, cookScale: 1 }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold ' + (cookRecipeIdx % RECIPES.length === i ? 'bg-teal-700 text-white' : 'bg-white border border-slate-200') }, r.icon + ' ' + r.name);
              })
            ),
            h('div', { className: 'flex items-center gap-3 mb-2' },
              h('span', { className: 'text-[11px] font-bold text-slate-600' }, 'Original: ' + cookRecipe.servings + ' servings'),
              h('span', { className: 'text-slate-600' }, '\u2192'),
              h('span', { className: 'text-[11px] font-bold text-teal-600' }, 'Desired: ' + cookDesiredServings + ' servings'),
              h('span', { className: 'text-[11px] text-slate-600 ml-auto' }, 'Scale: ' + cookScale.toFixed(2) + 'x')
            ),
            slider('Servings', cookScale, 0.25, 4, 0.25, 'cookScale', function(v) { return Math.round(cookRecipe.servings * v) + ' servings (' + v + 'x)'; }),
            h('div', { className: 'mt-2' },
              h('table', { className: 'w-full text-[11px]' },
                h('caption', { className: 'sr-only' }, 'Servings'), h('thead', null, h('tr', { className: 'border-b border-slate-200' }, h('th', { scope: 'col', className: 'px-2 py-1 text-left' }, 'Ingredient'), h('th', { className: 'px-2 py-1 text-right' }, 'Original'), h('th', { className: 'px-2 py-1 text-right text-teal-600 font-bold' }, 'Scaled'))),
                h('tbody', null,
                  cookRecipe.ingredients.map(function(ing, i) {
                    var scaled = ing.amount * cookScale;
                    var display = scaled % 1 === 0 ? scaled.toString() : scaled < 1 ? scaled.toFixed(2) : scaled.toFixed(1);
                    return h('tr', { key: i, className: i % 2 === 0 ? '' : 'bg-slate-50' },
                      h('td', { className: 'px-2 py-1' }, ing.item),
                      h('td', { className: 'px-2 py-1 text-right text-slate-600' }, ing.amount + ' ' + ing.unit),
                      h('td', { className: 'px-2 py-1 text-right font-bold text-teal-700' }, display + ' ' + ing.unit)
                    );
                  })
                )
              )
            ),
            cookScale !== 1 && h('div', null, (function() { checkBadge('recipeScale'); return null; })())
          ),
          // Nutrition Label Quiz
          h('div', { className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, '\uD83C\uDF4E Nutrition Label Quiz'),
            h('p', { className: 'text-xs text-slate-600' }, 'Score: ' + nutritionScore + '/' + NUTRITION_LABELS.length),
            h('div', { className: 'bg-white rounded-xl p-3 border border-slate-300 font-mono text-[11px] space-y-0.5' },
              h('p', { className: 'text-xs font-bold text-center border-b border-slate-300 pb-1' }, '\uD83C\uDF4F ' + nutritionCurrent.title),
              h('p', null, 'Serving Size: ' + nutritionCurrent.servingSize),
              h('p', null, 'Servings Per Container: ' + nutritionCurrent.servings),
              h('p', { className: 'font-bold border-t border-slate-200 pt-0.5' }, 'Calories: ' + nutritionCurrent.calories),
              h('p', null, 'Total Fat: ' + nutritionCurrent.fat + 'g'),
              h('p', null, 'Sodium: ' + nutritionCurrent.sodium + 'mg'),
              h('p', null, 'Total Carbs: ' + nutritionCurrent.carbs + 'g'),
              h('p', null, '  Sugars: ' + nutritionCurrent.sugar + 'g'),
              h('p', null, 'Protein: ' + nutritionCurrent.protein + 'g')
            ),
            h('p', { className: 'text-xs font-bold text-slate-700' }, nutritionCurrent.question),
            h('div', { className: 'flex gap-2' },
              h('input', { type: 'text', value: nutritionAnswer, onChange: function(e) { upd('nutritionAnswer', e.target.value); }, onKeyDown: function(e) {
                if (e.key === 'Enter' && nutritionAnswer.trim()) {
                  var correct = nutritionAnswer.trim().replace(/[^0-9.]/g, '') === nutritionCurrent.answer;
                  stemBeep(correct);
                  updMulti({ nutritionFb: correct ? '\u2705 Correct! ' + nutritionCurrent.explain : '\u274C Answer: ' + nutritionCurrent.answer + '. ' + nutritionCurrent.explain, nutritionScore: nutritionScore + (correct ? 1 : 0) });
                }
              }, placeholder: 'Your answer...', className: 'flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono' }),
              h('button', { 'aria-label': 'Check', onClick: function() {
                if (!nutritionAnswer.trim()) return;
                var correct = nutritionAnswer.trim().replace(/[^0-9.]/g, '') === nutritionCurrent.answer;
                stemBeep(correct);
                updMulti({ nutritionFb: correct ? '\u2705 Correct! ' + nutritionCurrent.explain : '\u274C Answer: ' + nutritionCurrent.answer + '. ' + nutritionCurrent.explain, nutritionScore: nutritionScore + (correct ? 1 : 0) });
              }, className: 'px-4 py-2 text-xs font-bold bg-teal-700 text-white rounded-xl' }, 'Check')
            ),
            nutritionFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (nutritionFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700') }, nutritionFb),
            h('button', { 'aria-label': 'Next Label', onClick: function() { updMulti({ nutritionIdx: nutritionIdx + 1, nutritionAnswer: '', nutritionFb: '' }); }, className: 'px-3 py-1.5 text-[11px] font-bold bg-slate-100 text-slate-600 rounded-xl' }, 'Next Label \u27A1')
          ),
          // Food Safety Temps
          h('div', { className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, '\uD83C\uDF21\uFE0F Safe Internal Temperatures'),
            h('p', { className: 'text-xs text-slate-600' }, 'Food safety score: ' + foodSafetyScore),
            h('div', { className: 'space-y-1' },
              FOOD_SAFETY.map(function(f) {
                var isDanger = f.food.indexOf('DANGER') >= 0;
                return h('div', { key: f.food, className: 'flex items-center gap-2 p-1.5 rounded-lg ' + (isDanger ? 'bg-red-50 border border-red-200' : 'bg-amber-50') },
                  h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-sm' }, f.icon),
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex-1' },
                    h('p', { className: 'text-[11px] font-bold ' + (isDanger ? 'text-red-700' : 'text-slate-700') }, f.food),
                    h('p', { className: 'text-[11px] text-slate-600' }, f.danger)
                  ),
                  !isDanger && h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full' }, f.tempF + '\u00B0F')
                );
              })
            ),
            // Quick quiz
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-3 p-3 rounded-xl bg-white border border-slate-200' },
              h('p', { className: 'text-xs font-bold text-slate-700 mb-2' }, '\uD83E\uDDE0 Quick Quiz: What is the safe temp for ' + foodSafetyCurrent.food + '?'),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1.5' },
                [125, 145, 155, 160, 165, 180].map(function(temp) {
                  return h('button', { 'aria-label': 'Next Food', key: temp, onClick: function() {
                    var correct = temp === foodSafetyCurrent.tempF;
                    stemBeep(correct);
                    updMulti({ foodSafetyFb: correct ? '\u2705 Correct! ' + foodSafetyCurrent.tempF + '\u00B0F for ' + foodSafetyCurrent.food : '\u274C It\'s ' + foodSafetyCurrent.tempF + '\u00B0F. ' + foodSafetyCurrent.danger, foodSafetyScore: foodSafetyScore + (correct ? 1 : 0) });
                    if (correct && foodSafetyScore + 1 >= 5) checkBadge('chefSafe');
                  }, className: 'px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 hover:border-amber-300' }, temp + '\u00B0F');
                })
              ),
              d.foodSafetyFb && h('p', { className: 'text-[11px] font-bold mt-2 p-2 rounded-lg ' + (d.foodSafetyFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700') }, d.foodSafetyFb),
              h('button', { 'aria-label': 'Next Food', onClick: function() { updMulti({ foodSafetyQ: foodSafetyQ + 1, foodSafetyFb: null }); }, className: 'mt-2 px-3 py-1.5 text-[11px] font-bold bg-amber-100 text-amber-700 rounded-xl' }, 'Next Food \u27A1')
            )
          )
        ),

        // ═══ CHALLENGE TAB ═══
        tab === 'challenge' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83C\uDFAF Life Skills Challenge'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 mb-3' },
              [1, 2, 3].map(function(t) {
                var labels = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
                var colors = { 1: 'bg-emerald-100 text-emerald-700', 2: 'bg-amber-100 text-amber-700', 3: 'bg-red-100 text-red-700' };
                return h('button', { 'aria-label': 'Change chal answer', key: t, onClick: function() { updMulti({ chalTier: t, chalIdx: 0, chalFeedback: '', chalAnswer: '' }); },
                  className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold ' + (chalTier === t ? colors[t] + ' ring-2 ring-offset-1' : 'bg-white text-slate-600 border border-slate-200') }, labels[t]);
              })
            ),
            h('div', { className: 'flex gap-3 text-xs' },
              h('span', { className: 'font-bold text-teal-600' }, '\uD83C\uDFC6 ' + chalScore + ' pts'),
              h('span', { className: 'font-bold text-amber-600' }, '\uD83D\uDD25 ' + chalStreak + ' streak')
            )
          ),
          h('div', { className: glassCard + ' space-y-3' },
            chalQ && h('p', { className: 'text-sm font-medium text-slate-700' }, chalQ.q),
            h('input', { type: 'text', value: chalAnswer, onChange: function(e) { upd('chalAnswer', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') chalCheck(); }, placeholder: 'Type your answer...', className: 'w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-teal-400 outline-none', 'aria-label': 'Answer' }),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2' },
              h('button', { 'aria-label': 'Check', onClick: chalCheck, className: 'px-4 py-2 text-sm font-bold bg-teal-700 text-white rounded-xl' }, 'Check'),
              h('button', { 'aria-label': 'Hint', onClick: function() { upd('chalFeedback', '\uD83D\uDCA1 ' + (chalQ.h || 'No hint')); }, className: 'px-3 py-2 text-sm font-bold bg-amber-50 text-amber-600 rounded-xl' }, '\uD83D\uDCA1 Hint'),
              h('button', { 'aria-label': 'Skip', onClick: function() { updMulti({ chalIdx: chalIdx + 1, chalFeedback: '', chalAnswer: '' }); }, className: 'px-3 py-2 text-sm font-bold bg-slate-100 text-slate-600 rounded-xl' }, 'Skip \u27A1'),
              callGemini && h('button', { 'aria-label': 'Change chal a i loading', onClick: function() {
                upd('chalAILoading', true);
                var tierLabel = chalTier === 1 ? 'easy' : chalTier === 2 ? 'medium' : 'hard';
                callGemini('Generate one ' + tierLabel + ' life skills question for a ' + gradeBand + ' student about taxes, insurance, home repair, car care, or data literacy. Return JSON: {"q":"question","a":"short answer","h":"hint"}').then(function(res) {
                  try { var p = JSON.parse(res.replace(/```json?\n?/g, '').replace(/```/g, '').trim()); updMulti({ chalAILoading: false, chalFeedback: '', chalAnswer: '', chalAIQ: p }); } catch(e) { updMulti({ chalAILoading: false }); }
                }).catch(function() { upd('chalAILoading', false); });
              }, disabled: d.chalAILoading, className: 'px-3 py-2 text-sm font-bold bg-purple-100 text-purple-600 rounded-xl disabled:opacity-50' }, d.chalAILoading ? '\uD83E\uDDE0...' : '\u2728 AI Next')
            ),
            chalFeedback && h('p', { className: 'text-sm font-bold p-2 rounded-lg ' + (chalFeedback[0] === '\u2705' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700') }, chalFeedback)
          )
        ),

        // ═══ BATTLE TAB ═══
        tab === 'battle' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\u2694\uFE0F Adulting Defense'),
            h('p', { className: 'text-xs text-slate-600' }, 'Fight ignorance with knowledge! Answer life skills questions to defeat the Adulting Boss.')
          ),
          !battleActive ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard + ' text-center space-y-3' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-5xl mb-2' }, '\uD83E\uDDED'),
            h('p', { className: 'text-sm font-bold text-slate-700' }, 'The Adulting Boss challenges you!'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 justify-center' },
              h('button', { 'aria-label': 'Start Battle', onClick: function() { startBattle(false); }, className: 'px-4 py-2 text-sm font-bold bg-teal-700 text-white rounded-xl' }, '\u2694\uFE0F Start Battle'),
              callGemini && h('button', { 'aria-label': 'AI Battle', onClick: function() { startBattle(true); }, className: 'px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-xl' }, '\uD83E\uDDE0 AI Battle')
            )
          ) : h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-2 mb-4' },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2' }, h('span', { className: 'text-xs font-bold text-emerald-600 w-16' }, '\uD83D\uDEE1\uFE0F You'), h('div', { className: 'flex-1 h-4 bg-slate-200 rounded-full overflow-hidden' }, h('div', { className: 'h-full rounded-full transition-all', style: { width: battlePlayerHP + '%', background: battlePlayerHP > 50 ? '#22c55e' : '#f59e0b' } })), h('span', { className: 'text-xs font-mono font-bold w-10 text-right' }, battlePlayerHP + '%')),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2' }, h('span', { className: 'text-xs font-bold text-red-600 w-16' }, '\uD83D\uDC7E Boss'), h('div', { className: 'flex-1 h-4 bg-slate-200 rounded-full overflow-hidden' }, h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', className: 'h-full bg-red-500 rounded-full transition-all', style: { width: battleEnemyHP + '%' } })), h('span', { className: 'text-xs font-mono font-bold w-10 text-right' }, battleEnemyHP + '%'))
            ),
            battleOver ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-center py-4 space-y-2' },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-4xl' }, battleWon ? '\uD83C\uDFC6' : '\uD83D\uDC7E'),
              h('p', { className: 'text-lg font-bold ' + (battleWon ? 'text-emerald-700' : 'text-red-700') }, battleWon ? 'You adulted successfully!' : 'The boss wins this round!'),
              battleFeedback && h('p', { className: 'text-xs ' + (battleFeedback[0] === '\u2705' ? 'text-emerald-600' : 'text-red-600') }, battleFeedback),
              h('div', { className: 'flex gap-2 justify-center mt-2' },
                h('button', { 'aria-label': 'Again', onClick: function() { startBattle(false); }, className: 'px-4 py-2 text-sm font-bold bg-teal-700 text-white rounded-xl' }, '\u21BA Again'),
                callGemini && h('button', { 'aria-label': 'AI Rematch', onClick: function() { startBattle(true); }, className: 'px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-xl' }, '\u2728 AI Rematch')
              )
            ) : h('div', { className: 'space-y-3' },
              (function() {
                if (battleUseAI && d.battleAILoading) return h('div', { className: 'text-center py-4' }, h('div', { className: 'text-2xl animate-pulse' }, '\uD83E\uDDE0'), h('p', { className: 'text-xs text-purple-600 font-bold' }, 'AI generating...'));
                var q = getCurrentBattleQ();
                if (!q) return null;
                return h('div', { className: 'space-y-3' },
                  battleUseAI && h('span', { className: 'px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[11px] font-bold rounded-full' }, '\uD83E\uDDE0 AI'),
                  h('p', { className: 'text-sm font-medium text-slate-700' }, q.q),
                  h('input', { type: 'text', value: battleAnswer, onChange: function(e) { upd('battleAnswer', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') battleAttack(); }, placeholder: 'Answer...', className: 'w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:border-red-400 outline-none' }),
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2' },
                    h('button', { 'aria-label': 'Attack!', onClick: battleAttack, className: 'px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-xl' }, '\u2694\uFE0F Attack!'),
                    h('button', { 'aria-label': 'Hint', onClick: function() { upd('battleFeedback', '\uD83D\uDCA1 ' + (q.h || 'No hint')); }, className: 'px-3 py-2 text-sm font-bold bg-amber-50 text-amber-600 rounded-xl' }, '\uD83D\uDCA1 Hint')
                  ),
                  battleFeedback && h('p', { className: 'text-sm font-bold p-2 rounded-lg ' + (battleFeedback[0] === '\u2705' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700') }, battleFeedback)
                );
              })()
            )
          )
        ),

        // ═══ LEARN TAB ═══
        tab === 'learn' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-3' }, '\uD83D\uDCDA Learn \u2014 Life Skills Concepts'),
            h('p', { className: 'text-xs text-slate-600 mb-4' }, 'Explore key topics adapted to your grade level (' + gradeBand + ').')
          ),
          LEARN_TOPICS.map(function(topic) {
            var content = topic.content[gradeBand] || topic.content['3-5'];
            return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: topic.title, className: glassCard + ' space-y-3' },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2' }, h('span', { className: 'text-lg' }, topic.icon), h('h5', { className: 'text-sm font-bold text-slate-700' }, topic.title)),
              h('p', { className: 'text-xs text-slate-600 leading-relaxed' }, content),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 pt-2 border-t border-slate-100' },
                h('button', { 'aria-label': 'Try It', onClick: function() { markLearnRead(topic.title); updMulti({ tab: topic.tryIt }); }, className: 'px-3 py-1.5 text-[11px] font-bold bg-violet-50 text-violet-600 rounded-lg' }, '\uD83D\uDD2C Try It'),
                callTTS && h('button', { 'aria-label': 'Read Aloud', onClick: function() { markLearnRead(topic.title); callTTS(content); }, className: 'px-3 py-1.5 text-[11px] font-bold bg-blue-50 text-blue-600 rounded-lg' }, '\uD83D\uDD0A Read Aloud')
              )
            );
          })
        ),

        // Badges panel
        h('details', { className: glassCard },
          h('summary', { className: 'text-xs font-bold text-slate-600 cursor-pointer' }, '\uD83C\uDFC6 Badges (' + Object.keys(d.badges || {}).length + '/' + LS_BADGES.length + ')'),
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3' },
            LS_BADGES.map(function(b) {
              var earned = d.badges && d.badges[b.id];
              return h('div', { key: b.id, className: 'flex items-center gap-2 p-2 rounded-lg ' + (earned ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200 opacity-50') },
                h('span', { className: 'text-lg' + (earned ? '' : ' grayscale') }, b.icon),
                h('div', null, h('p', { className: 'text-[11px] font-bold ' + (earned ? 'text-amber-700' : 'text-slate-600') }, b.name), h('p', { className: 'text-[11px] text-slate-600' }, b.desc))
              );
            })
          )
        ),

        // SR
        h('div', { className: 'sr-only', role: 'status', 'aria-live': 'polite' }, 'Life Skills Lab: ' + tab + ' view'),

        // Footer
        h('div', { className: 'text-center' },
          h('p', { className: 'text-[11px] text-slate-600' }, 'Tax calculations are simplified estimates for educational purposes.')
        )
      );
    }
  });

  console.log('[StemLab] stem_tool_lifeskills.js v5.0 loaded');
})();
