// ═══════════════════════════════════════════════════════
// stem_tool_lifeskills.js — Life Skills Lab  v5.23
// Enhanced STEM Lab tool — 33 sub-tools
// Start Here · Paycheck · Data Literacy · Decisions · Contracts
// Records · Transportation · Job Readiness · Resume Builder · Proof Locker · Interview Studio · Communication · Time Management · Insurance · Applied Science · Car Care · Home Repair
// Home Systems · Budget · Credit · Cooking · Laundry Lab
// Dental Care · Challenge · Battle · Learn
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
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-lifeskills')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-lifeskills';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();


  // ── Audio (auto-injected) ──
  var _lifeskAC = null;
  function getLifeskAC() { if (!_lifeskAC) { try { _lifeskAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_lifeskAC && _lifeskAC.state === "suspended") { try { _lifeskAC.resume(); } catch(e) {} } return _lifeskAC; }
  function lifeskTone(f,d,tp,v) { var ac = getLifeskAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxLifeskClick() { lifeskTone(600, 0.03, "sine", 0.04); }


  // ═══════════════════════════════════════════════════════
  // IIFE-Scope Static Data
  // ═══════════════════════════════════════════════════════

  var SUBTOOLS = [
    { id: 'overview',   icon: '\uD83E\uDDED', label: 'Start Here' },
    { id: 'paycheck',   icon: '\uD83E\uDDFE', label: 'Paycheck' },
    { id: 'data',       icon: '\uD83D\uDCCA', label: 'Data Literacy' },
    { id: 'decision',   icon: '\uD83E\uDDE0', label: 'Decisions' },
    { id: 'contract',   icon: '\uD83D\uDCDD', label: 'Contracts' },
    { id: 'records',    icon: '\uD83D\uDCC1', label: 'Records' },
    { id: 'transport',  icon: '\uD83D\uDE8C', label: 'Transportation' },
    { id: 'workreadiness', icon: '\uD83D\uDCBC', label: 'Job Readiness' },
    { id: 'resumebuilder', icon: '\uD83D\uDCC4', label: 'Resume Builder' },
    { id: 'prooflocker', icon: '\uD83D\uDDC2\uFE0F', label: 'Proof Locker' },
    { id: 'interviewstudio', icon: '\uD83C\uDFA4', label: 'Interview Studio' },
    { id: 'communication', icon: '\uD83D\uDCAC', label: 'Communication' },
    { id: 'timemanagement', icon: '\u23F3', label: 'Time Management' },
    { id: 'insurance',  icon: '\uD83C\uDFE5', label: 'Insurance' },
    { id: 'dental',     icon: '\uD83E\uDDB7', label: 'Dental Care' },
    { id: 'bodycare',   icon: '\uD83E\uDDCD', label: 'Body Care' },
    { id: 'sleep',      icon: '\uD83C\uDF19', label: 'Sleep & Energy' },
    { id: 'meds',       icon: '\uD83D\uDC8A', label: 'Meds & Labels' },
    { id: 'appointments', icon: '\uD83D\uDCC5', label: 'Appointments' },
    { id: 'homesafety', icon: '\uD83D\uDEE1\uFE0F', label: 'Home Safety' },
    { id: 'digitalsafety', icon: '\uD83D\uDD10', label: 'Digital Safety' },
    { id: 'science',    icon: '\uD83D\uDD2C', label: 'Applied Science' },
    { id: 'carcare',    icon: '\uD83D\uDE97', label: 'Car Care' },
    { id: 'homerepair', icon: '\uD83D\uDD27', label: 'Home Repair' },
    { id: 'homesys',    icon: '\uD83C\uDFE0', label: 'Home Systems' },
    { id: 'budget',     icon: '\uD83D\uDCB0', label: 'Budget' },
    { id: 'credit',     icon: '\uD83D\uDCB3', label: 'Credit' },
    { id: 'foodconfidence', icon: '\uD83E\uDD57', label: 'Food Confidence' },
    { id: 'cooking',    icon: '\uD83C\uDF73', label: 'Cooking' },
    { id: 'laundry',    icon: '\uD83E\uDDFA', label: 'Laundry Lab' },
    { id: 'challenge',  icon: '\uD83C\uDFAF', label: 'Challenge' },
    { id: 'battle',     icon: '\u2694\uFE0F', label: 'Battle' },
    { id: 'learn',      icon: '\uD83D\uDCDA', label: 'Learn' }
  ];

  var LIFE_SKILL_PATHS = [
    { id: 'money', icon: '\uD83D\uDCB0', title: 'Money basics', desc: 'Take-home pay, job readiness, resume building, proof organization, interview practice, budgets, credit, insurance, and smart borrowing.', start: 'paycheck', accent: '#059669', steps: ['Paycheck', 'Job Readiness', 'Resume Builder', 'Proof Locker', 'Interview Studio', 'Budget', 'Credit', 'Insurance'] },
    { id: 'choices', icon: '\uD83E\uDDE0', title: 'Better decisions', desc: 'Use evidence, spot misleading data, compare options, read fine print, organize records, plan transportation, prepare for work, build resumes, gather proof, practice interviews, manage time, communicate clearly, and stay safer online.', start: 'data', accent: '#2563eb', steps: ['Data', 'Decisions', 'Contracts', 'Records', 'Transportation', 'Job Readiness', 'Resume Builder', 'Proof Locker', 'Interview Studio', 'Time Management', 'Communication', 'Digital Safety'] },
    { id: 'care', icon: '\uD83E\uDDCD', title: 'Health routines', desc: 'Practice body care, appointments, time planning, communication, transportation, sleep, medication labels, home safety, dental care, food confidence, and everyday prevention habits.', start: 'bodycare', accent: '#0f766e', steps: ['Body Care', 'Appointments', 'Time Management', 'Communication', 'Transportation', 'Sleep', 'Meds', 'Home Safety', 'Dental', 'Food Confidence', 'Cooking', 'Insurance'] },
    { id: 'home', icon: '\uD83C\uDFE0', title: 'Home confidence', desc: 'Understand repairs, home systems, car care, laundry, and applied science.', start: 'homerepair', accent: '#d97706', steps: ['Home Repair', 'Home Systems', 'Car Care', 'Laundry'] },
    { id: 'practice', icon: '\uD83C\uDFAF', title: 'Practice mode', desc: 'Build fluency with challenge questions and the Adulting Defense battle.', start: 'challenge', accent: '#7c3aed', steps: ['Challenge', 'Battle', 'Learn'] }
  ];

  // ── Badges ──
  var LS_BADGES = [
    { id: 'firstPay',    icon: '\uD83E\uDDFE', name: 'First Paycheck', desc: 'Calculate your first paycheck' },
    { id: 'dataDetect',  icon: '\uD83D\uDCCA', name: 'Data Detective', desc: 'Spot 3 misleading data tricks' },
    { id: 'decisionPro', icon: '\uD83E\uDDE0', name: 'Decision Pro', desc: 'Build a decision matrix' },
    { id: 'trapFinder',  icon: '\uD83D\uDCDD', name: 'Trap Finder', desc: 'Find all traps in a contract' },
    { id: 'recordsReady', icon: '\uD83D\uDCC1', name: 'Records Ready', desc: 'Build a safe records checklist' },
    { id: 'formNavigator', icon: '\uD83D\uDCCB', name: 'Form Navigator', desc: 'Practice 3 paperwork decisions' },
    { id: 'tripReady', icon: '\uD83D\uDE8C', name: 'Trip Ready', desc: 'Build a transportation checklist' },
    { id: 'routeNavigator', icon: '\uD83E\uDDED', name: 'Route Navigator', desc: 'Practice 3 transportation decisions' },
    { id: 'jobReady', icon: '\uD83D\uDCBC', name: 'Job Ready', desc: 'Build a work readiness checklist' },
    { id: 'workplaceNavigator', icon: '\uD83D\uDDE3\uFE0F', name: 'Workplace Navigator', desc: 'Practice 3 work or interview decisions' },
    { id: 'resumeReady', icon: '\uD83D\uDCC4', name: 'Resume Ready', desc: 'Build a resume readiness checklist' },
    { id: 'bulletBuilder', icon: '\uD83C\uDFAF', name: 'Evidence Bullet Builder', desc: 'Practice 3 resume decisions or save an evidence bullet' },
    { id: 'proofLockerReady', icon: '\uD83D\uDDC2\uFE0F', name: 'Proof Locker Ready', desc: 'Build a portfolio proof checklist' },
    { id: 'portfolioCurator', icon: '\uD83D\uDDBC\uFE0F', name: 'Portfolio Curator', desc: 'Practice 3 proof or sharing decisions' },
    { id: 'interviewReady', icon: '\uD83C\uDFA4', name: 'Interview Ready', desc: 'Build an interview preparation checklist' },
    { id: 'mockInterviewPro', icon: '\uD83E\uDD1D', name: 'Mock Interview Pro', desc: 'Practice 3 interview decisions or save a STAR answer' },
    { id: 'interviewPracticePlan', icon: '\uD83D\uDCC5', name: 'Practice Planner', desc: 'Save an interview practice plan' },
    { id: 'interviewPacketBuilder', icon: '\uD83D\uDCE6', name: 'Interview Packet', desc: 'Build an interview prep packet' },
    { id: 'interviewRehearsalReady', icon: '\u23F1\uFE0F', name: 'Rehearsal Ready', desc: 'Save a calm interview rehearsal note' },
    { id: 'interviewEvidenceMatcher', icon: '\uD83D\uDCCD', name: 'Evidence Matcher', desc: 'Save a question-to-proof interview cue' },
    { id: 'interviewDayReady', icon: '\uD83D\uDDD3\uFE0F', name: 'Interview Day Ready', desc: 'Save an interview day run sheet' },
    { id: 'communicationReady', icon: '\uD83D\uDCAC', name: 'Communication Ready', desc: 'Build a clear communication checklist' },
    { id: 'conflictNavigator', icon: '\uD83E\uDD1D', name: 'Conflict Navigator', desc: 'Practice 3 communication or conflict decisions' },
    { id: 'timePlanner', icon: '\u23F3', name: 'Time Planner', desc: 'Build a realistic time-management checklist' },
    { id: 'taskNavigator', icon: '\uD83D\uDCCB', name: 'Task Navigator', desc: 'Practice 3 planning or deadline decisions' },
    { id: 'insured',     icon: '\uD83C\uDFE5', name: 'Plan Analyst', desc: 'Compare health insurance plans' },
    { id: 'dentalReady', icon: '\uD83E\uDDB7', name: 'Dental Ready', desc: 'Build a daily oral-care plan' },
    { id: 'toothTriage', icon: '\uD83E\uDDB7', name: 'Tooth Trouble Solver', desc: 'Practice 3 dental care decisions' },
    { id: 'bodyCareReady', icon: '\uD83E\uDDCD', name: 'Body Care Ready', desc: 'Build an ergonomic comfort routine' },
    { id: 'ergoSolver', icon: '\uD83E\uDE91', name: 'Ergonomics Solver', desc: 'Practice 3 body-care decisions' },
    { id: 'sleepPlanner', icon: '\uD83C\uDF19', name: 'Sleep Planner', desc: 'Build a wind-down and wake-time plan' },
    { id: 'energyCoach', icon: '\u26A1', name: 'Energy Coach', desc: 'Practice 3 sleep and energy decisions' },
    { id: 'medLabelReader', icon: '\uD83D\uDC8A', name: 'Label Reader', desc: 'Read the key parts of a medication label' },
    { id: 'doseSafety', icon: '\uD83D\uDEE1\uFE0F', name: 'Dose Safety Solver', desc: 'Practice 3 medication label decisions' },
    { id: 'appointmentReady', icon: '\uD83D\uDCC5', name: 'Appointment Ready', desc: 'Build an appointment prep plan' },
    { id: 'selfAdvocate', icon: '\uD83D\uDDE3\uFE0F', name: 'Self Advocate', desc: 'Practice 3 appointment decisions' },
    { id: 'homeSafetyReady', icon: '\uD83D\uDEE1\uFE0F', name: 'Home Safety Ready', desc: 'Build a home safety checklist' },
    { id: 'safetyResponder', icon: '\uD83D\uDEA8', name: 'Safety Responder', desc: 'Practice 3 home safety decisions' },
    { id: 'digitalReady', icon: '\uD83D\uDD10', name: 'Digital Ready', desc: 'Build a digital safety checklist' },
    { id: 'scamSpotter', icon: '\uD83D\uDD0E', name: 'Scam Spotter', desc: 'Practice 3 digital safety decisions' },
    { id: 'foodPlanner', icon: '\uD83E\uDD57', name: 'Food Planner', desc: 'Build a budget-friendly meal plan' },
    { id: 'leftoverSafe', icon: '\uD83E\uDD61', name: 'Leftover Safety Solver', desc: 'Practice 3 food storage decisions' },
    { id: 'planMaker',   icon: '\uD83E\uDDED', name: 'Plan Maker', desc: 'Save a personal Life Skills action step' },
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
    { id: 'laundryPro', icon: '\uD83E\uDDFA', name: 'Laundry Scientist', desc: 'Build a clean, safe laundry load' },
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
    { tier: 1, q: 'How many minutes should a careful toothbrushing session usually last?', a: '2', h: 'Think of the common two-minute timer.' },
    { tier: 1, q: 'What body part should stay relaxed instead of raised while typing?', a: 'shoulders', h: 'Check whether they are creeping up toward your ears.' },
    { tier: 1, q: 'What is a good name for the quiet routine before bedtime?', a: 'wind down', h: 'It helps your body shift from busy to restful.' },
    { tier: 1, q: 'What part of a medicine label names the ingredient that treats symptoms?', a: 'active ingredient', h: 'Look near the top of many drug facts labels.' },
    { tier: 1, q: 'What should you bring to an appointment to remember your questions?', a: 'list', h: 'A written list helps when people feel nervous or rushed.' },
    { tier: 1, q: 'What alarm should every home test for fire warning?', a: 'smoke alarm', h: 'It warns people to get out when there is smoke.' },
    { tier: 1, q: 'What kind of password is safer: short and reused, or long and unique?', a: 'long and unique', h: 'Reuse spreads risk across accounts.' },
    { tier: 1, q: 'Where should most leftovers go soon after a meal: counter, fridge, or warm oven?', a: 'fridge', h: 'Cold storage slows germ growth.' },
    { tier: 1, q: 'What should you keep for a return, warranty, or proof you paid?', a: 'receipt', h: 'It records what you bought and when.' },
    { tier: 1, q: 'What extra time do you add to a trip in case walking, traffic, or transit takes longer?', a: 'buffer', h: 'It gives your plan breathing room.' },
    { tier: 1, q: 'What short document lists your skills, experience, and contact information for a job?', a: 'resume', h: 'It helps employers understand what you can do.' },
    { tier: 1, q: 'What short document summarizes skills, experience, and education for a job?', a: 'resume', h: 'It is usually shared with applications or interviews.' },
    { tier: 1, q: 'What do you collect to support a resume claim: proof or guesses?', a: 'proof', h: 'Examples make claims easier to trust.' },
    { tier: 1, q: 'What practice conversation helps you prepare for job questions?', a: 'mock interview', h: 'It is a rehearsal before the real interview.' },
    { tier: 1, q: 'What should you do before replying when a message makes you upset?', a: 'pause', h: 'A short pause can prevent a bigger conflict.' },
    { tier: 1, q: 'What do you call extra time added before a deadline or appointment?', a: 'buffer', h: 'It helps when something takes longer than expected.' },
    { tier: 1, q: 'Why should you empty pockets before washing clothes?', a: 'damage', h: 'Pens, coins, and tissues can damage clothing or the washer.' },
    { tier: 1, q: 'What is a credit score used for?', a: 'borrowing', h: 'Lenders check this before giving you a loan.' },
    { tier: 2, q: 'What is the #1 factor in your FICO credit score?', a: 'payment history', h: 'It accounts for 35% of your score.' },
    { tier: 2, q: 'What do plaque bacteria use from sugary foods to make acids?', a: 'sugar', h: 'The same ingredient that makes candy sweet.' },
    { tier: 2, q: 'What is the word for designing a setup to fit the person and task?', a: 'ergonomics', h: 'It is about fit, comfort, access, and safer work habits.' },
    { tier: 2, q: 'What sleep habit means waking up at about the same time most days?', a: 'consistent', h: 'Your body clock likes patterns.' },
    { tier: 2, q: 'Who can answer questions about a medicine label at a pharmacy?', a: 'pharmacist', h: 'They are trained to explain medicines and safety questions.' },
    { tier: 2, q: 'What word means speaking up for your needs, questions, or accommodations?', a: 'self-advocacy', h: 'It can be respectful, clear, and prepared.' },
    { tier: 2, q: 'What gas is dangerous because you cannot see or smell it and need a detector?', a: 'carbon monoxide', h: 'CO alarms help warn people.' },
    { tier: 2, q: 'What is a message trying to trick you into sharing passwords or codes often called?', a: 'phishing', h: 'It may pretend to be a trusted person or company.' },
    { tier: 2, q: 'What should you do with food from a bulging, leaking, or badly dented can?', a: 'throw it out', h: 'Damaged cans can signal unsafe food.' },
    { tier: 2, q: 'If a form question is confusing or asks for private information, what should you do?', a: 'ask', h: 'Pause and ask a trusted helper or official source.' },
    { tier: 2, q: 'Before a bus, train, ride, walk, or drive, what should you check: route, time, fare, or all?', a: 'all', h: 'A trip plan needs more than one detail.' },
    { tier: 2, q: 'If a work schedule is unclear, what should you do before assuming?', a: 'clarify', h: 'Ask a supervisor, manager, or trusted work contact.' },
    { tier: 2, q: 'What should a resume bullet usually connect: action, skill, and what?', a: 'result', h: 'Show what happened because of the action.' },
    { tier: 2, q: 'Before sharing a portfolio item with someone else in it, what should you check?', a: 'permission', h: 'Consent and privacy matter.' },
    { tier: 2, q: 'In interview answers, STAR stands for situation, task, action, and what?', a: 'result', h: 'End with what happened or what you learned.' },
    { tier: 2, q: 'What kind of statement starts with your own feeling or need instead of blaming?', a: 'i statement', h: 'Example: I feel confused when...' },
    { tier: 2, q: 'What planning method sorts tasks into do now, schedule, delegate or ask help, and drop?', a: 'priority matrix', h: 'It separates urgency and importance.' },
    { tier: 2, q: 'A recipe makes 24 cookies. You want 36. What is the scaling factor?', a: '1.5', h: '36 / 24 = ?' },
    { tier: 2, q: 'What kind of detergent molecules help lift oil away from fabric?', a: 'surfactant', h: 'They have one water-loving end and one oil-loving end.' },
    { tier: 2, q: 'Credit utilization should be below what percentage for best scores?', a: '30', h: 'Below 10% is even better.' },
    { tier: 3, q: '$1,000 at 7% annual interest compounded yearly for 10 years equals?', a: '1967', h: 'FV = PV \u00D7 (1+r)^n.' },
    { tier: 3, q: 'If you replace a toothbrush every 3 months, how many toothbrushes do you need per year?', a: '4', h: '12 months / 3 months each.' },
    { tier: 3, q: 'If 50 minutes of desk work is followed by a 5-minute reset, what percent of the 55-minute block is reset time? Round to the nearest whole percent.', a: '9', h: '5 divided by 55 is about 0.09.' },
    { tier: 3, q: 'You need 8 hours of sleep and wake at 6:30 AM. What bedtime gives 8 hours?', a: '10:30', h: 'Count backward 8 hours from 6:30 AM.' },
    { tier: 3, q: 'Should you combine two medicines with the same active ingredient without checking the label or asking a professional?', a: 'no', h: 'Duplicate ingredients can be unsafe.' },
    { tier: 3, q: 'What are the three useful details when describing a symptom: when it started, how it feels, and what makes it better or what?', a: 'worse', h: 'Better/worse patterns help the listener understand the situation.' },
    { tier: 3, q: 'Should bleach be mixed with ammonia or other cleaners?', a: 'no', h: 'Some mixtures create dangerous fumes.' },
    { tier: 3, q: 'What extra login protection asks for a second code or approval after a password?', a: 'two-factor authentication', h: 'Also called 2FA or multi-factor authentication.' },
    { tier: 3, q: 'A simple budget meal often combines a base, a protein, a vegetable, and what extra part for taste?', a: 'flavor', h: 'Sauce, spices, herbs, or acid can make simple food satisfying.' },
    { tier: 3, q: 'What word on a form means you agree or give permission?', a: 'consent', h: 'Consent should be understood before signing.' },
    { tier: 3, q: 'A bus leaves at 8:10. Walking to the stop takes 7 minutes and you want a 5-minute buffer. How many minutes before 8:10 should you leave?', a: '12', h: 'Walk time plus buffer time.' },
    { tier: 3, q: 'What interview method describes a situation, task, action, and result?', a: 'star', h: 'It helps answer behavior questions clearly.' },
    { tier: 3, q: 'What public occupational database can help identify job tasks and skills?', a: 'o*net', h: 'It is run by the U.S. Department of Labor.' },
    { tier: 3, q: 'What is the safest portfolio share setting for private documents: public or limited?', a: 'limited', h: 'Share only what the audience needs.' },
    { tier: 3, q: 'At the end of an interview, should you usually have at least one prepared question for the interviewer?', a: 'yes', h: 'Questions can show interest and help you understand the role.' },
    { tier: 3, q: 'What repair step means recognizing your part and saying what you will do differently?', a: 'apology', h: 'A useful apology includes responsibility and a next step.' },
    { tier: 3, q: 'If a task takes 25 minutes and you add a 10-minute buffer, how many minutes should you block?', a: '35', h: 'Task time plus buffer time.' },
    { tier: 3, q: 'Why can too much laundry detergent make clothes feel stiff or itchy?', a: 'residue', h: 'Extra detergent can stay in fabric when the rinse cannot remove it all.' },
    { tier: 3, q: 'Paying minimum ($25) on $5,000 at 24.99% APR \u2014 roughly how many years to pay off?', a: '30', h: 'Minimum payments are designed to maximize interest.' }
  ];

  // ── Battle Questions ──
  var BATTLE_QS = [
    { q: 'What percentage is FICA tax (Social Security + Medicare)?', a: '7.65', h: '6.2% + 1.45%.' },
    { q: 'What does "correlation does not equal causation" mean?', a: 'two things happening together does not mean one causes the other', h: 'Ice cream and drowning both rise in summer.' },
    { q: 'What is an early termination fee?', a: 'penalty for canceling a contract early', h: 'Common in phone plans and leases.' },
    { q: 'What should you keep after paying a bill or buying something important?', a: 'receipt', h: 'It can help with returns, warranties, and proof of payment.' },
    { q: 'What document usually proves your identity?', a: 'id', h: 'Examples include a school ID, state ID, passport, or license.' },
    { q: 'What extra time in a trip plan helps with delays?', a: 'buffer', h: 'Leave a little earlier than the perfect-case plan.' },
    { q: 'What should you make before traveling if your first route is delayed?', a: 'backup plan', h: 'A second route or trusted contact can reduce stress.' },
    { q: 'What job document summarizes skills and experience?', a: 'resume', h: 'Often used with job applications.' },
    { q: 'What does ATS often stand for in hiring software?', a: 'applicant tracking system', h: 'Some employers use this software to organize applications.' },
    { q: 'What should resume claims be based on: proof or made-up keywords?', a: 'proof', h: 'Truthful evidence is stronger and safer than keyword stuffing.' },
    { q: 'What collection can hold projects, certificates, work samples, and links?', a: 'portfolio', h: 'It supports resume and interview claims.' },
    { q: 'Should private IDs or personal records go in a public portfolio?', a: 'no', h: 'Keep private documents protected.' },
    { q: 'What interview answer structure means situation, task, action, result?', a: 'star', h: 'It helps turn proof into a clear story.' },
    { q: 'What should you do if an interview question is confusing?', a: 'clarify', h: 'A short clarifying question is professional.' },
    { q: 'What should you do if workplace instructions are unclear?', a: 'ask', h: 'Clarifying early prevents mistakes.' },
    { q: 'What should you do before sending an angry reply?', a: 'pause', h: 'A pause helps you choose the next words.' },
    { q: 'What kind of statement says your own feeling or need clearly?', a: 'i statement', h: 'It avoids starting with blame.' },
    { q: 'What extra time helps a plan survive delays?', a: 'buffer', h: 'Perfect-case timing is fragile.' },
    { q: 'What should you do with a big task to make it easier to start?', a: 'break it down', h: 'Use smaller next steps.' },
    { q: 'What is the name for the amount you pay before insurance kicks in?', a: 'deductible', h: 'Your first out-of-pocket cost.' },
    { q: 'What gas law relates tire pressure and temperature?', a: 'gay-lussac', h: 'P1/T1 = P2/T2 at constant volume.' },
    { q: 'What is the rubber seal at the bottom of a toilet tank called?', a: 'flapper', h: 'Lifts when you flush.' },
    { q: 'What type of breaker is required near water (bathroom, kitchen)?', a: 'gfci', h: 'Ground-fault circuit interrupter.' },
    { q: 'How often should smoke detectors be replaced?', a: '10 years', h: 'Sensors degrade over time.' },
    { q: 'What tool cleans between teeth where a toothbrush cannot reach?', a: 'floss', h: 'String, picks, or water flossers all target between-teeth spaces.' },
    { q: 'A knocked-out adult tooth needs what kind of dental help?', a: 'urgent', h: 'This is a same-day professional-care situation.' },
    { q: 'What is the name for designing a workspace to fit the person and task?', a: 'ergonomics', h: 'It includes reach, height, lighting, breaks, and access needs.' },
    { q: 'Should numbness, weakness, or worsening pain during an activity be ignored?', a: 'no', h: 'Stop, tell a trusted adult if needed, and get appropriate support.' },
    { q: 'What do we call a calm routine before bedtime?', a: 'wind down', h: 'It is a transition from busy time to rest time.' },
    { q: 'Is a consistent wake time helpful for sleep routines?', a: 'yes', h: 'Regular timing supports the body clock.' },
    { q: 'What medicine label section names the ingredient doing the main job?', a: 'active ingredient', h: 'It helps avoid accidental duplicate ingredients.' },
    { q: 'Is sharing prescription medicine with someone else safe?', a: 'no', h: 'Prescriptions are chosen for one person by a professional.' },
    { q: 'What do we call speaking up clearly for needs, questions, or accommodations?', a: 'self-advocacy', h: 'It is a life skill for appointments, school, work, and services.' },
    { q: 'What should you write before an appointment so you do not forget what to ask?', a: 'questions', h: 'A short list can help when time feels rushed.' },
    { q: 'What alarm warns people about fire or smoke?', a: 'smoke alarm', h: 'It should be tested and taken seriously.' },
    { q: 'Should cleaning products be mixed together to make them stronger?', a: 'no', h: 'Use one product as directed and ventilate.' },
    { q: 'What is a scam message that tries to steal passwords or codes called?', a: 'phishing', h: 'Pause before clicking links or sharing codes.' },
    { q: 'Should you reuse the same password for every important account?', a: 'no', h: 'One leak could unlock many accounts.' },
    { q: 'When food safety is uncertain, what phrase means choose safety over risk?', a: 'when in doubt throw it out', h: 'Food poisoning risk is not worth a guess.' },
    { q: 'What cold appliance keeps leftovers safer for the next meal?', a: 'fridge', h: 'Store leftovers promptly and reheat safely.' },
    { q: 'What does R-value measure?', a: 'insulation', h: 'Higher R = better insulating.' },
    { q: 'A heat pump with COP of 3 produces how many units of heat per unit of electricity?', a: '3', h: 'COP = output/input.' },
    { q: 'What temperature is the food danger zone lower bound (\u00B0F)?', a: '40', h: 'Bacteria grow fast between 40\u00B0F and 140\u00B0F.' },
    { q: 'Does using more detergent always make laundry cleaner?', a: 'no', h: 'Too much detergent can leave residue and trap soil.' },
    { q: 'What should you clean before using a dryer to reduce fire risk?', a: 'lint trap', h: 'Lint blocks airflow and can overheat.' },
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
    { title: 'Records & Paperwork', icon: '\uD83D\uDCC1', tryIt: 'records', content: {
      'K-2': 'Important papers help people prove who they are, where they live, what they paid for, or what someone agreed to. A safe folder and a trusted grown-up can make paperwork less confusing.',
      '3-5': 'Records skills include keeping IDs, school papers, medical or insurance cards, receipts, and emergency contacts in places you can find. Forms are easier when you read one field at a time and ask before sharing private information.',
      '6-8': 'Paperwork literacy means sorting documents by purpose, protecting private information, tracking deadlines, saving proof of payment, and knowing when a signature means agreement or consent. The goal is to reduce stress before appointments, returns, applications, and emergencies.',
      '9-12': 'Records literacy includes identity documents, tax and income records, insurance cards, leases, warranties, receipts, forms, consent language, deadlines, secure storage, backups, and document-retention judgment. Good systems make adult tasks easier and help prevent scams, missed deadlines, and lost proof.'
    }},
    { title: 'Transportation & Navigation', icon: '\uD83D\uDE8C', tryIt: 'transport', content: {
      'K-2': 'Transportation means getting from one place to another safely. A good plan includes where you are going, who is helping, and what to do if something changes.',
      '3-5': 'Trip planning means checking the route, travel time, pickup or stop location, fare or ticket, and a trusted helper. Leaving a little early gives you a buffer if walking, traffic, or waiting takes longer.',
      '6-8': 'Transportation literacy includes route comparison, transfers, schedules, fare systems, accessibility needs, safe waiting places, backup plans, and asking for help from trusted or official sources when a trip changes.',
      '9-12': 'Navigation skills combine time management, risk awareness, wayfinding, cost planning, accessibility, situational awareness, and contingency planning. Strong travelers check route, timing, fare, alerts, backup options, and communication before stress hits.'
    }},
    { title: 'Job Readiness & Workplace Basics', icon: '\uD83D\uDCBC', tryIt: 'workreadiness', content: {
      'K-2': 'Work skills start with being responsible, kind, safe, and ready to ask questions. People use these skills in classrooms, teams, chores, volunteering, and jobs.',
      '3-5': 'Job readiness means practicing dependable habits: arriving prepared, following directions, asking for help, taking turns, staying safe, and noticing what a task needs before starting.',
      '6-8': 'Workplace basics include resumes, applications, schedules, interviews, communication, task lists, safety rules, and respectful help-seeking. A strong worker asks clarifying questions, tracks time, and knows when a situation needs adult or supervisor support.',
      '9-12': 'Job readiness includes application materials, interview practice, availability, transportation, workplace norms, wage and schedule records, reasonable accommodations, feedback, professionalism, and escalation when something feels unsafe, discriminatory, or unclear.'
    }},
    { title: 'Resume Builder & Evidence Review', icon: '\uD83D\uDCC4', tryIt: 'resumebuilder', content: {
      'K-2': 'A resume is a short document that tells helpers what you can do. Young learners can start by naming strengths, chores, class jobs, projects, and ways they help.',
      '3-5': 'Resume practice means collecting truthful examples: skills, school projects, volunteer tasks, activities, and times you were dependable or helpful. Good examples say what you did and why it mattered.',
      '6-8': 'Resume literacy connects job words to real evidence. A strong bullet uses an action, context, skill, and result. It stays truthful, easy to scan, and matched to the role without copying claims you cannot support.',
      '9-12': 'Resume building combines career readiness evidence, occupational vocabulary, accessible formatting, review, and fairness awareness. Students should use sources like NACE competencies and O*NET tasks to translate real experience, while treating AI or ATS feedback as imperfect support rather than final judgment.'
    }},
    { title: 'Portfolio & Proof Locker', icon: '\uD83D\uDDC2\uFE0F', tryIt: 'prooflocker', content: {
      'K-2': 'A proof locker is a safe place to remember projects, helper notes, pictures of work, and things you learned. It helps you tell true stories about what you can do.',
      '3-5': 'Portfolio practice means saving examples you are allowed to share: a project, certificate, thank-you note, photo of work, or short reflection. Good proof says what happened, what skill it shows, and who can see it.',
      '6-8': 'Proof literacy connects resume claims to artifacts. Learners choose relevant samples, describe the skill shown, check permission and privacy, and decide whether an item is public, limited, or private.',
      '9-12': 'Portfolio curation turns scattered evidence into a share-ready packet for resumes, interviews, scholarships, internships, jobs, and accommodations. Strong proof is truthful, current, relevant, accessible, permission-aware, and organized by audience.'
    }},
    { title: 'Interview Practice Studio', icon: '\uD83C\uDFA4', tryIt: 'interviewstudio', content: {
      'K-2': 'Interview practice is a safe rehearsal. Learners can practice saying their name, naming a strength, listening to a question, and asking for help when they do not understand.',
      '3-5': 'Interview skills include greeting, listening, answering with examples, asking one question, and saying thank you. A practice interview can feel easier when learners use sentence starters and kind feedback.',
      '6-8': 'Interview literacy connects resume bullets and proof items to spoken answers. Students can use STAR stories, clarifying questions, prepared questions for the interviewer, and a short practice plan for nerves.',
      '9-12': 'Interview practice includes role targeting, accessible preparation, response mode choice, read-aloud support, mock interviewer turns, calm rehearsal, question-to-proof matching, interview day planning, bite-size practice plans, evidence-backed STAR answers, prep packets, follow-up questions, reflection, and respectful accommodation or support scripts when needed.'
    }},
    { title: 'Communication & Conflict Basics', icon: '\uD83D\uDCAC', tryIt: 'communication', content: {
      'K-2': 'Communication means sharing ideas, listening, asking for help, and using words or tools that make needs clear. It is okay to pause and ask a trusted grown-up when a problem feels too big.',
      '3-5': 'Good communication uses clear words, listening, turn-taking, kind repair, and asking questions when something is confusing. Boundaries help people say what is okay and what is not okay.',
      '6-8': 'Communication skills include I-statements, active listening, tone-checking messages, setting boundaries, apologizing with a next step, and knowing when conflict needs a trusted adult, mediator, counselor, or other support.',
      '9-12': 'Communication literacy includes consent, boundaries, conflict de-escalation, digital tone, repair attempts, advocacy, documentation, emotional regulation, and support-seeking when there are threats, harassment, coercion, discrimination, or safety concerns.'
    }},
    { title: 'Time Management & Planning', icon: '\u23F3', tryIt: 'timemanagement', content: {
      'K-2': 'Time planning means knowing what comes next, using reminders, and asking for help when a task feels too big. A small first step can make starting easier.',
      '3-5': 'Time management skills include checking what is due, estimating how long tasks take, adding a little extra time, using reminders, and breaking big jobs into smaller steps.',
      '6-8': 'Planning literacy includes priorities, deadlines, buffers, task chunking, routines, calendars, timers, and recovery plans when something takes longer than expected. The goal is not perfect productivity; it is realistic next steps.',
      '9-12': 'Time management combines executive function, priority triage, time blocking, habit design, workload estimation, transition planning, deadline tracking, and self-advocacy when support, accommodations, or renegotiated timelines are needed.'
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
    }},
    { title: 'Oral Health & Dental Care', icon: '\uD83E\uDDB7', tryIt: 'dental', content: {
      'K-2': 'Teeth help you bite, chew, smile, and talk. A simple care routine is brushing, cleaning between teeth with help when needed, drinking water, and telling a grown-up if a tooth hurts.',
      '3-5': 'Dental care is a daily life skill. Brush carefully for about 2 minutes, clean between teeth, choose water often, and visit a dentist for checkups. If a tooth is hurt, swollen, or very painful, ask a trusted adult for dental help.',
      '6-8': 'Oral health connects biology, chemistry, and habits. Plaque bacteria use sugars to make acids that can weaken enamel. Fluoride can help enamel resist acid, cleaning between teeth removes plaque in tight spaces, and urgent symptoms like swelling, trauma, or severe pain need professional dental care.',
      '9-12': 'Dental literacy includes prevention, decision-making, and cost navigation. Compare preventive care, deductibles, coinsurance, annual maximums, in-network providers, and urgent-care signals. This tool is educational, not a diagnosis: ongoing pain, swelling, trauma, fever, or a knocked-out permanent tooth should be handled with professional dental guidance.'
    }},
    { title: 'Body Care & Ergonomics', icon: '\uD83E\uDDCD', tryIt: 'bodycare', content: {
      'K-2': 'Your body likes to move, rest, and feel supported. Body care means noticing comfort, relaxing tight shoulders, using both feet or supports when you can, and telling a grown-up if something hurts or feels strange.',
      '3-5': 'Body care is a daily life skill. There is no single perfect posture. A better goal is a setup that fits you, regular movement breaks, relaxed shoulders, screen and book positions that do not strain your neck, and asking for help when pain, numbness, or weakness shows up.',
      '6-8': 'Ergonomics means designing a task, tool, or workspace to fit the person. Good setups reduce awkward reach, glare, neck bend, wrist strain, and long periods without movement. Comfort checks and small resets help people learn what their bodies need while respecting disability, mobility, and sensory differences.',
      '9-12': 'Ergonomic literacy blends biomechanics, accessibility, habit design, and self-advocacy. Instead of chasing one rigid posture, compare task demands: reach distance, monitor height, input devices, load weight, lighting, recovery breaks, and support options. Persistent, severe, or neurological symptoms need appropriate adult or clinical guidance.'
    }},
    { title: 'Sleep & Energy Routines', icon: '\uD83C\uDF19', tryIt: 'sleep', content: {
      'K-2': 'Sleep helps your brain and body recharge. A calm bedtime routine, a cozy sleep space, and telling a grown-up when sleep feels hard are everyday life skills.',
      '3-5': 'Sleep and energy routines are about patterns. A steady wake time, wind-down routine, less bright screen time before bed, and a morning light-and-movement plan can make the day feel easier. Ask for help if sleep problems keep happening.',
      '6-8': 'Sleep literacy includes body clocks, routines, light, caffeine timing, stress, and recovery. The goal is not perfection; it is noticing what helps attention, mood, learning, and safety. Persistent insomnia, snoring, extreme sleepiness, or sleep worries deserve trusted adult or clinical support.',
      '9-12': 'Sleep and energy planning combines circadian rhythm, habit design, executive function, and self-advocacy. Compare fixed wake time, target sleep opportunity, wind-down length, caffeine cutoff, device boundaries, naps, and morning activation. Educational practice only: ongoing sleep disruption or unsafe sleepiness should be discussed with a professional.'
    }},
    { title: 'Medication & Health Labels', icon: '\uD83D\uDC8A', tryIt: 'meds', content: {
      'K-2': 'Medicine labels have important directions. A safe habit is to ask a trusted grown-up before taking medicine and tell them if something feels wrong.',
      '3-5': 'Medication safety starts with reading and asking. Check the name, active ingredient, directions, warnings, storage, and expiration date. Never share prescription medicine, and ask a trusted adult or pharmacist when a label is confusing.',
      '6-8': 'Medication literacy means reading labels carefully, spotting duplicate active ingredients, understanding timing words, checking warnings, and knowing when to ask a pharmacist, prescriber, nurse, or trusted adult. This tool uses sample labels for practice only.',
      '9-12': 'Medication-label literacy includes active ingredients, dose timing, maximum-use warnings, contraindications, interactions, storage, expiration, refills, and informed questions. This tool is educational: real medication decisions should follow the label and professional guidance.'
    }},
    { title: 'Appointments & Self-Advocacy', icon: '\uD83D\uDCC5', tryIt: 'appointments', content: {
      'K-2': 'Appointments are times when you meet someone who can help, like a doctor, dentist, counselor, teacher, or helper. You can practice saying what you need and asking a trusted grown-up questions.',
      '3-5': 'Appointment skills include knowing where you are going, bringing what you need, describing what happened, and asking questions. A short list can help you remember important things even if you feel nervous.',
      '6-8': 'Self-advocacy means respectfully speaking up for your needs, questions, symptoms, goals, and accommodations. Good prep includes a timeline, examples, current medicines or supports, insurance or school forms, and a follow-up plan.',
      '9-12': 'Appointment literacy includes scheduling, triage, privacy, consent, documentation, symptom descriptions, accommodations, follow-up instructions, referrals, and portal messages. The goal is not to memorize scripts; it is to communicate clearly and leave knowing the next step.'
    }},
    { title: 'Home Safety Basics', icon: '\uD83D\uDEE1\uFE0F', tryIt: 'homesafety', content: {
      'K-2': 'Home safety means knowing how to get help, where to go if an alarm sounds, and telling a grown-up about smoke, fire, strange smells, or unsafe things.',
      '3-5': 'Home safety skills include smoke alarms, carbon monoxide alarms, exit plans, safe cleaning products, first-aid basics, and knowing when to call for help. Practice plans before an emergency happens.',
      '6-8': 'Home safety is prevention plus response. Check alarms, know two ways out, keep exits clear, store chemicals safely, never mix cleaners, use first-aid decision rules, and ask an adult or emergency service when danger is immediate.',
      '9-12': 'Home safety literacy includes risk spotting, fire escape planning, CO awareness, basic first-aid triage, safe chemical handling, utility shutoff awareness, emergency communication, and post-incident follow-up. The goal is calm, practiced decision-making.'
    }},
    { title: 'Digital Safety & Privacy', icon: '\uD83D\uDD10', tryIt: 'digitalsafety', content: {
      'K-2': 'Digital safety means asking a trusted grown-up before sharing personal information, clicking strange links, or talking to someone who makes you uncomfortable.',
      '3-5': 'Digital safety skills include strong passwords, private information rules, kind communication, pausing before clicking links, and telling a trusted adult when something online feels wrong.',
      '6-8': 'Digital literacy includes phishing clues, privacy settings, password managers, two-factor authentication, screenshots, reporting tools, respectful communication, and knowing when to stop, block, tell, or save evidence.',
      '9-12': 'Digital safety includes threat modeling for everyday life: account security, social engineering, data privacy, consent, reputation, scams, harassment response, platform reporting, and recovery steps after a compromise.'
    }},
    { title: 'Food Confidence', icon: '\uD83E\uDD57', tryIt: 'foodconfidence', content: {
      'K-2': 'Food confidence means knowing when to ask for help, washing hands, keeping hot foods hot and cold foods cold, and putting leftovers away safely.',
      '3-5': 'Food confidence is everyday food decision-making: store leftovers, read simple labels, notice unsafe food signs, build balanced snacks, and make easy meals from basics.',
      '6-8': 'Food confidence combines food safety, label literacy, budgeting, storage, and meal planning. A simple meal can start with a base, protein, vegetable or fruit, and flavor. When food safety is uncertain, choose safety.',
      '9-12': 'Food confidence includes safe storage, leftovers, date-label judgment, pantry planning, budget meals, nutrition-label tradeoffs, batch cooking, and waste reduction. It is practical independence, not perfection.'
    }},
    { title: 'Laundry Science', icon: '\uD83E\uDDFA', tryIt: 'laundry', content: {
      'K-2': 'Laundry keeps clothes clean and safe to wear. You sort clothes, add a small amount of soap, choose a wash setting, dry them safely, and clean the lint trap.',
      '3-5': 'Laundry uses science: water, detergent, motion, and time work together. Sorting helps colors and fabrics stay safe. Too much detergent can leave soap behind, and the dryer lint trap must be cleaned so air can move.',
      '6-8': 'Laundry is applied chemistry and materials science. Surfactants loosen oily soil, enzymes help break down protein or starch stains, agitation moves soil out of fibers, and water temperature changes cleaning power and fabric risk. The best setting depends on fabric, soil, color, and care labels.',
      '9-12': 'Advanced laundry science balances soil chemistry, fiber structure, mechanical action, thermal energy, and rinse efficiency. Cold water can clean many everyday loads with modern detergents, but sanitation, heavy oil, protein stains, dyes, wool, elastane, and dryer heat all require different decisions. Misconceptions like "more detergent is always cleaner" usually fail because residue and redeposition increase.'
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

  var LAUNDRY_ITEMS = [
    { name: 'White towels', icon: '\uD83E\uDDFC', color: 'light', fabric: 'cotton terry', weight: 'heavy', soil: 'normal', care: 'Warm or hot if label allows; avoid fabric softener.', dry: 'Medium heat', note: 'Fabric softener can make towels less absorbent.' },
    { name: 'Dark jeans', icon: '\uD83D\uDC56', color: 'dark', fabric: 'denim', weight: 'heavy', soil: 'normal', care: 'Cold water, inside out, wash with darks.', dry: 'Low heat or air dry', note: 'Dye can fade or transfer, especially when new.' },
    { name: 'Red cotton shirt', icon: '\uD83D\uDC55', color: 'red', fabric: 'cotton knit', weight: 'medium', soil: 'normal', care: 'Cold water with colors.', dry: 'Low or medium heat', note: 'Bright dyes can bleed into lights.' },
    { name: 'Wool sweater', icon: '\uD83E\uDDE5', color: 'dark', fabric: 'wool', weight: 'delicate', soil: 'light', care: 'Cold delicate cycle or hand wash; do not tumble dry.', dry: 'Lay flat to dry', note: 'Heat and agitation can shrink and felt wool fibers.' },
    { name: 'Athletic leggings', icon: '\uD83E\uDE73', color: 'dark', fabric: 'synthetic stretch', weight: 'delicate', soil: 'sweaty', care: 'Cold water; skip fabric softener.', dry: 'Air dry or low heat', note: 'Softener can coat performance fibers and trap odor.' },
    { name: 'Greasy apron', icon: '\uD83E\uDDE6', color: 'light', fabric: 'cotton blend', weight: 'medium', soil: 'heavy', care: 'Pretreat oil; warm water if label allows.', dry: 'Check stain before dryer', note: 'Dryer heat can set oily stains.' },
    { name: 'New dark hoodie', icon: '\uD83E\uDDE5', color: 'dark', fabric: 'fleece', weight: 'heavy', soil: 'normal', care: 'Wash separately first time in cold water.', dry: 'Low heat', note: 'New dark dyes are high bleed-risk.' },
    { name: 'Silk blouse', icon: '\uD83D\uDC57', color: 'light', fabric: 'silk', weight: 'delicate', soil: 'light', care: 'Check label; hand wash or dry clean if required.', dry: 'Air dry away from heat', note: 'Protein fibers can weaken with heat, alkali, and rough agitation.' }
  ];

  var LAUNDRY_STEPS = [
    { id: 'sort', icon: '\uD83D\uDD0E', title: 'Sort and read labels', action: 'Separate lights, darks, towels, delicates, and high-soil items.', why: 'Color, fiber, weight, and care labels tell you how much heat, water, and friction the fabric can handle.' },
    { id: 'prep', icon: '\uD83E\uDDF7', title: 'Prep pockets and closures', action: 'Empty pockets, zip zippers, close hooks, and turn dark graphics inside out.', why: 'This prevents dye rub, snags, ink leaks, torn seams, and washer damage.' },
    { id: 'stain', icon: '\uD83E\uDDEA', title: 'Treat stains first', action: 'Choose a treatment based on oil, protein, tannin, dye, or mud.', why: 'Different stain molecules bind differently; dryer heat can lock many stains into fibers.' },
    { id: 'dose', icon: '\uD83E\uDDFC', title: 'Measure detergent', action: 'Use the cap lines or washer guide; adjust for load size and soil.', why: 'Too little leaves soil behind; too much creates residue, extra rinsing, odor, and wasted money.' },
    { id: 'settings', icon: '\u2699\uFE0F', title: 'Choose settings', action: 'Match water temperature, cycle, and spin to fabric and soil.', why: 'Cleaning comes from chemistry, time, temperature, and mechanical action; more of one is not always safer.' },
    { id: 'dry', icon: '\uD83C\uDF00', title: 'Dry safely', action: 'Clean the lint trap, avoid overheating delicates, and air-dry stretch or wool.', why: 'Dryer airflow removes moisture; lint blocks airflow and heat can shrink, melt, or set stains.' }
  ];

  var LAUNDRY_STAINS = [
    { stain: 'Pizza grease on a hoodie', icon: '\uD83C\uDF55', type: 'Oil/fat', answer: 0, choices: ['Blot, pretreat with liquid detergent, then wash warm if the label allows', 'Rinse only with cold water and dry on high heat', 'Rub hard with a dry towel', 'Add extra fabric softener'], science: 'Surfactants have oil-loving and water-loving parts, so they can surround grease and help rinse it away.' },
    { stain: 'Grass on socks', icon: '\uD83C\uDF31', type: 'Pigment + protein', answer: 1, choices: ['Use chlorine bleach on every fabric', 'Pretreat with enzyme detergent and wait before washing', 'Dry first so the stain is easier to see', 'Only use fabric softener'], science: 'Enzymes can help break down proteins and starches; waiting gives the chemistry time to work.' },
    { stain: 'Coffee on a white shirt', icon: '\u2615', type: 'Tannin', answer: 2, choices: ['Use dryer heat immediately', 'Scrub with bar soap before rinsing', 'Flush with cool water and pretreat before washing', 'Wash with new dark jeans'], science: 'Tannin stains spread through water-soluble compounds; early rinsing moves them out before they bind deeper.' },
    { stain: 'Muddy knees on pants', icon: '\uD83E\uDD4C', type: 'Clay/soil', answer: 3, choices: ['Put straight into the dryer', 'Use lots of detergent without rinsing', 'Wash with delicates', 'Let mud dry, brush off solids, then wash'], science: 'Removing loose particles first keeps mineral soil from grinding into the fibers.' },
    { stain: 'Sweat odor in athletic gear', icon: '\uD83C\uDFC3', type: 'Body oil + bacteria', answer: 0, choices: ['Wash soon with detergent and skip fabric softener', 'Seal wet gear in a bag for a week', 'Use dryer sheets only', 'Always use hot water on stretch fabric'], science: 'Odor often comes from body oils and microbes trapped in synthetic fibers. Softener coatings can make odor harder to remove.' },
    { stain: 'Ink mark on a pocket', icon: '\uD83D\uDD8A\uFE0F', type: 'Dye/ink', answer: 2, choices: ['Wash with white towels', 'Put in the dryer to dry the ink', 'Isolate, test a safe remover on a hidden spot, then rinse and wash', 'Add extra detergent and hope'], science: 'Ink is a dye mixture. Isolating and testing first prevents spreading color or damaging the fabric.' }
  ];

  var LAUNDRY_MYTHS = [
    { statement: 'More detergent always makes clothes cleaner.', answer: false, truth: 'Measured detergent cleans better.', why: 'Extra detergent can leave residue that traps soil, irritates skin, and makes machines work harder.' },
    { statement: 'Hot water is the best choice for every load.', answer: false, truth: 'Water temperature depends on fabric, color, soil, and care labels.', why: 'Hot water can shrink, fade, or set some stains. Cold water works for many everyday loads with modern detergent.' },
    { statement: 'Fabric softener is good for every fabric.', answer: false, truth: 'Some fabrics should skip softener.', why: 'Softener can coat towels, flame-resistant clothes, and performance fabrics, reducing absorbency or odor control.' },
    { statement: 'A stuffed washer saves time and cleans just as well.', answer: false, truth: 'Clothes need room to move.', why: 'Agitation and rinsing only work when water and detergent can circulate through the load.' },
    { statement: 'The lint trap is only about drying speed.', answer: false, truth: 'The lint trap is a safety step.', why: 'Lint restricts airflow; blocked airflow can overheat a dryer and raises fire risk.' },
    { statement: 'Mixing bleach with ammonia makes a stronger cleaner.', answer: false, truth: 'Never mix cleaning products.', why: 'Some mixtures can create dangerous fumes. Use one product as directed and rinse surfaces/fabrics safely.' },
    { statement: 'Dryer heat is fine if a stain is still visible.', answer: false, truth: 'Check stains before drying.', why: 'Heat can make oil, dye, and protein stains harder to remove later.' }
  ];

  var LAUNDRY_SCIENCE = [
    { title: 'Surfactants lift oil', icon: '\uD83E\uDDFC', explain: 'One end of the molecule likes water and the other likes oil. That lets detergent surround oily soil so it can rinse away.' },
    { title: 'Enzymes target stains', icon: '\uD83E\uDDEA', explain: 'Protease, amylase, and lipase enzymes can break protein, starch, and fat stains into smaller pieces.' },
    { title: 'Agitation moves soil', icon: '\uD83C\uDF00', explain: 'The washer flexes fabric and pushes water through fibers. Overloading blocks that motion.' },
    { title: 'Temperature is a tradeoff', icon: '\uD83C\uDF21\uFE0F', explain: 'Warmer water can speed chemistry, but it can also fade colors, shrink fibers, or set some stains.' },
    { title: 'Rinsing removes residue', icon: '\uD83D\uDCA7', explain: 'The rinse stage carries away loosened soil and detergent. Too much detergent is harder to rinse out.' },
    { title: 'Drying is airflow + heat', icon: '\uD83C\uDF2C\uFE0F', explain: 'A dryer removes water by evaporation and moving air. Lint blocks airflow, so cleaning the trap matters.' }
  ];

  var LAUNDRY_CARE_LABELS = [
    { cue: 'Wash 30C', icon: '\uD83E\uDDF4', title: 'Machine wash cool', plain: 'Use a cool or cold wash setting.', why: 'Lower temperature protects color and reduces shrink risk.', mistake: 'Using hot water because "hot means cleaner."', action: 'Choose cold/cool, normal or gentle depending on fabric.' },
    { cue: 'Wash 40C', icon: '\uD83C\uDF21\uFE0F', title: 'Machine wash warm', plain: 'Warm water is allowed if the fabric needs it.', why: 'Warm water can help with body oils and heavy soil while staying gentler than hot.', mistake: 'Using warm for delicate or dye-heavy items without checking the full label.', action: 'Use warm for sturdy items when soil level justifies it.' },
    { cue: 'Hand', icon: '\u270B', title: 'Hand wash', plain: 'Wash gently by hand or use a true hand-wash cycle if available.', why: 'Delicate fibers can stretch, felt, or snag in normal agitation.', mistake: 'Putting it in a heavy-duty load with towels.', action: 'Use cool water, gentle detergent, and avoid wringing.' },
    { cue: 'No wash', icon: '\uD83D\uDEAB', title: 'Do not wash', plain: 'Do not put this item in water unless the full label says it is safe.', why: 'Some dyes, finishes, linings, or fibers can be damaged by water.', mistake: 'Trying to "just rinse it quickly."', action: 'Spot clean cautiously or use the recommended professional care.' },
    { cue: 'No bleach', icon: '\u25B3', title: 'Do not bleach', plain: 'Skip chlorine and oxygen bleach unless the label allows it.', why: 'Bleach can weaken fibers, change color, or damage finishes.', mistake: 'Bleaching every white item automatically.', action: 'Use detergent and stain pretreatment first.' },
    { cue: 'Tumble low', icon: '\u25EF', title: 'Tumble dry low', plain: 'Dry with low heat.', why: 'Low heat reduces shrink, elastic damage, and fabric stress.', mistake: 'Using high heat to finish faster.', action: 'Use low heat or remove while slightly damp.' },
    { cue: 'No tumble', icon: '\u25A1', title: 'Do not tumble dry', plain: 'Keep this item out of the dryer.', why: 'Heat and tumbling can shrink wool, damage elastic, or distort shape.', mistake: 'Drying it for "just ten minutes."', action: 'Air dry flat or hang as the label recommends.' },
    { cue: 'Iron low', icon: '\uD83D\uDD25', title: 'Iron low', plain: 'Use a low iron temperature.', why: 'Synthetics, silk, and finishes can scorch, shine, or melt.', mistake: 'Pressing directly on prints or stretch fabric.', action: 'Use low heat, a pressing cloth, and test a hidden spot.' }
  ];

  var LAUNDRY_STAIN_FAMILIES = [
    { name: 'Oil and grease', icon: '\uD83E\uDDC8', first: 'Blot, then pretreat with liquid detergent.', avoid: 'Do not use dryer heat while a greasy mark remains.', science: 'Surfactants surround oily molecules so water can carry them away.', examples: 'Pizza, butter, salad dressing, bike chain grease' },
    { name: 'Protein', icon: '\uD83E\uDD5A', first: 'Use cool water first and an enzyme detergent if the fabric allows.', avoid: 'Avoid hot water at the start; heat can set protein.', science: 'Protease enzymes break large protein molecules into smaller pieces.', examples: 'Blood, egg, dairy, some sweat marks' },
    { name: 'Tannin', icon: '\u2615', first: 'Flush with cool water and pretreat before washing.', avoid: 'Avoid bar soap before rinsing; it can make some tannins harder to remove.', science: 'Tannins are plant compounds that can bind deeper as they dry.', examples: 'Coffee, tea, berries, juice' },
    { name: 'Dye and ink', icon: '\uD83C\uDFA8', first: 'Isolate the item and test any remover on a hidden spot.', avoid: 'Do not wash with other clothes until the dye is controlled.', science: 'Dyes are designed to color fibers, so spreading is the main risk.', examples: 'Pen ink, marker, dye bleed' },
    { name: 'Mud and clay', icon: '\uD83E\uDDF1', first: 'Let mud dry, brush off solids, then wash.', avoid: 'Do not grind wet mud into fibers.', science: 'Clay particles are tiny minerals; removing loose solids first reduces abrasion.', examples: 'Mud, garden soil, playground dirt' },
    { name: 'Odor and sweat', icon: '\uD83C\uDFC3', first: 'Wash promptly and skip fabric softener on performance fabrics.', avoid: 'Do not seal damp gear in a bag.', science: 'Body oils and microbes cling to synthetic fibers and can be trapped by coatings.', examples: 'Gym clothes, socks, uniforms' }
  ];

  // ── Dental Care Data ──
  var DENTAL_ROUTINE_STEPS = [
    { id: 'brush_am', icon: '\u2600\uFE0F', title: 'Morning brush', action: 'Brush all tooth surfaces for about 2 minutes.', why: 'Brushing disrupts plaque before it sits on enamel all day.' },
    { id: 'between', icon: '\uD83E\uDDF5', title: 'Clean between teeth', action: 'Use floss, picks, or another between-teeth tool that works for your needs.', why: 'A toothbrush misses the tight spaces where plaque and food can collect.' },
    { id: 'water', icon: '\uD83D\uDCA7', title: 'Choose water often', action: 'Drink water after snacks or sweet/acidic drinks when brushing is not practical.', why: 'Water helps rinse sugars and acids away from teeth.' },
    { id: 'brush_pm', icon: '\uD83C\uDF19', title: 'Night brush', action: 'Brush before sleep and avoid going to bed with sugary drinks.', why: 'Less saliva flows during sleep, so nighttime plaque has more time to act.' },
    { id: 'checkups', icon: '\uD83D\uDCC5', title: 'Plan checkups', action: 'Keep dental appointments and ask questions about pain, braces, sealants, or sensitivity.', why: 'Dentists and hygienists can catch small problems before they become bigger.' }
  ];

  var DENTAL_ACTIONS = [
    { id: 'home', label: 'Home care + watch', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'schedule', label: 'Schedule a dentist visit', tone: 'bg-teal-50 text-teal-800 border-teal-200' },
    { id: 'urgent', label: 'Urgent dental help', tone: 'bg-red-50 text-red-800 border-red-200' }
  ];

  var DENTAL_SCENARIOS = [
    { prompt: 'Your gums bleed a little when you start flossing after a long break, but there is no swelling or severe pain.', best: 'schedule', explain: 'Gentle daily cleaning may help, but bleeding gums are worth mentioning at a dental visit. Ask a dentist or hygienist if it continues.' },
    { prompt: 'A permanent tooth is knocked out during sports.', best: 'urgent', explain: 'A knocked-out adult tooth needs same-day urgent dental help. Tell an adult immediately and follow professional instructions.' },
    { prompt: 'You feel brief cold sensitivity in one tooth for several days.', best: 'schedule', explain: 'Sensitivity can have several causes. A dentist can check for enamel wear, cavities, cracks, or gum changes.' },
    { prompt: 'You have face swelling, fever, or severe tooth pain.', best: 'urgent', explain: 'Swelling, fever, or severe pain can signal a serious problem. Get urgent professional care.' },
    { prompt: 'You had a sweet drink and cannot brush for a while.', best: 'home', explain: 'Rinsing or drinking water is a helpful short-term step. Brush later when you can.' }
  ];

  var DENTAL_SNACKS = [
    { name: 'Water', icon: '\uD83D\uDCA7', risk: 'Low', score: 1, why: 'Water does not feed plaque bacteria and can help rinse the mouth.', better: 'Great default drink.' },
    { name: 'Cheese or yogurt', icon: '\uD83E\uDDC0', risk: 'Low', score: 2, why: 'Unsweetened dairy is less sugary and can be part of a balanced snack.', better: 'Choose low-sugar versions.' },
    { name: 'Apple slices', icon: '\uD83C\uDF4E', risk: 'Medium', score: 3, why: 'Fruit has natural sugar and acid, but it is usually less sticky than candy.', better: 'Pair with water and eat with a meal.' },
    { name: 'Sports drink', icon: '\uD83E\uDD64', risk: 'High', score: 4, why: 'Many sports drinks combine sugar and acid, especially risky when sipped slowly.', better: 'Use water for everyday hydration.' },
    { name: 'Sticky candy', icon: '\uD83C\uDF6C', risk: 'High', score: 5, why: 'Sticky sweets can cling to teeth and keep sugar available longer.', better: 'Keep sweets occasional, rinse with water, and brush later.' }
  ];

  // ── Helper Functions ──
  // Body Care & Ergonomics Data
  var BODYCARE_CHECKS = [
    { id: 'neck', icon: '\uD83E\uDD37', title: 'Neck and shoulders', action: 'Let shoulders drop, bring work closer, and avoid holding the neck bent for a long stretch.', why: 'Small changes in reach and height can reduce strain during reading, typing, or drawing.' },
    { id: 'back', icon: '\uD83E\uDE91', title: 'Back and hips', action: 'Use a chair, cushion, foot support, or position that feels stable and lets you change positions.', why: 'Support plus movement usually works better than trying to freeze in one perfect pose.' },
    { id: 'wrists', icon: '\u270B', title: 'Wrists and hands', action: 'Keep tools close, relax grip pressure, and take short pauses from repeated tapping or writing.', why: 'Repeated small movements add up when hands, wrists, or fingers stay tense.' },
    { id: 'eyes', icon: '\uD83D\uDC40', title: 'Eyes and light', action: 'Reduce glare, look away from screens regularly, and make text large enough to read without leaning in.', why: 'Eyes work harder when light, distance, or text size fights the task.' },
    { id: 'feet', icon: '\uD83E\uDDB6', title: 'Feet or base of support', action: 'Rest feet, wheels, or supports in a stable position and keep needed items within easy reach.', why: 'A stable base makes the rest of the body work less to stay balanced.' },
    { id: 'reset', icon: '\u23F1\uFE0F', title: 'Reset rhythm', action: 'Plan a short movement, stretch, breathing, or position-change break before discomfort gets loud.', why: 'Brief resets support attention, circulation, and comfort during long tasks.' }
  ];

  var BODYCARE_ACTIONS = [
    { id: 'adjust', label: 'Adjust setup', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'reset', label: 'Take a reset break', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'support', label: 'Ask for support', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
    { id: 'help', label: 'Get medical help', tone: 'bg-red-50 text-red-800 border-red-200' }
  ];

  var BODYCARE_SCENARIOS = [
    { prompt: 'You notice your shoulders are up near your ears while typing, but there is no pain or numbness.', best: 'adjust', explain: 'Relax the shoulders, bring the keyboard or work closer, and check whether the chair and desk height fit the task.' },
    { prompt: 'You have been drawing for 45 minutes and your hand feels tired from gripping the pencil tightly.', best: 'reset', explain: 'A short reset, looser grip, and changing hand position can help before fatigue turns into discomfort.' },
    { prompt: 'A screen is low, so you keep bending your neck to read it during a long assignment.', best: 'adjust', explain: 'Raise the screen or book if possible, enlarge text, or change the work surface so the task fits you better.' },
    { prompt: 'A backpack, instrument case, or supply bin feels too heavy or awkward to carry safely.', best: 'support', explain: 'Ask for help, split the load, use wheels, or make another plan. Carrying strain is a setup problem, not a character test.' },
    { prompt: 'You feel numbness, weakness, severe pain, trouble breathing, or pain after an injury.', best: 'help', explain: 'Stop the activity and get appropriate adult or medical support. This tool is practice, not a diagnosis.' },
    { prompt: 'A wheelchair tray, desk, or table blocks comfortable reach to materials you need often.', best: 'support', explain: 'Self-advocacy is part of ergonomics. Ask to adjust placement, height, tools, or access so the environment fits the learner.' }
  ];

  var BODYCARE_RESETS = [
    { id: 'micro', label: '30 seconds', title: 'Micro reset', goodFor: 'Between short tasks', steps: ['Look far away for a few breaths.', 'Let shoulders drop and unclench hands.', 'Change one position: feet, chair, screen, or tool.'] },
    { id: 'two', label: '2 minutes', title: 'Desk reset', goodFor: 'After focused screen or writing work', steps: ['Stand, sit tall, or shift position in a way that works for your body.', 'Roll shoulders gently or reach arms forward and back.', 'Check screen height, light, and whether tools are close enough.'] },
    { id: 'five', label: '5 minutes', title: 'Full comfort check', goodFor: 'Before starting another long block', steps: ['Walk, wheel, stretch, breathe, or change scenery.', 'Refill water and rest eyes from close work.', 'Fix the biggest setup issue before returning.'] },
    { id: 'seated', label: 'Seated option', title: 'Seated reset', goodFor: 'Low-mobility or classroom-friendly moments', steps: ['Press feet, wheels, or supports into a stable position.', 'Slowly open and close hands, then relax grip.', 'Turn head only within a comfortable range or look side to side with the eyes.'] }
  ];

  var SLEEP_ROUTINE_STEPS = [
    { id: 'wake', icon: '\u23F0', title: 'Steady wake time', action: 'Pick a wake time you can use on most days.', why: 'A regular morning anchor helps the body clock learn the pattern.' },
    { id: 'light', icon: '\u2600\uFE0F', title: 'Morning light and movement', action: 'Get light, stretch, walk, wheel, or move in a way that fits your body.', why: 'Morning signals tell the brain it is daytime and can help alertness.' },
    { id: 'caffeine', icon: '\u2615', title: 'Caffeine cutoff', action: 'Choose a latest time for caffeine or energy drinks, especially on school nights.', why: 'Caffeine can stay active for hours and make sleep feel harder later.' },
    { id: 'screen', icon: '\uD83D\uDCF1', title: 'Screen wind-down', action: 'Plan a softer screen setting, device parking spot, or non-screen option near bedtime.', why: 'Bright, exciting, or endless content can keep the brain switched on.' },
    { id: 'routine', icon: '\uD83D\uDCDD', title: 'Wind-down routine', action: 'Choose 2-4 repeatable steps: wash up, clothes ready, read, music, breathing, or quiet hobby.', why: 'A repeated sequence lowers the decision load when you are tired.' },
    { id: 'support', icon: '\uD83E\uDD1D', title: 'Ask for support', action: 'Tell a trusted adult if sleep trouble, nightmares, snoring, or daytime sleepiness keeps happening.', why: 'Some sleep problems need help beyond a better routine.' }
  ];

  var SLEEP_ACTIONS = [
    { id: 'routine', label: 'Build a routine', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'adjust', label: 'Adjust timing or light', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'support', label: 'Ask for support', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
    { id: 'help', label: 'Get medical help', tone: 'bg-red-50 text-red-800 border-red-200' }
  ];

  var SLEEP_SCENARIOS = [
    { prompt: 'You want to wake at 6:30 AM and need about 8 hours of sleep, but you keep starting homework at 10 PM.', best: 'adjust', explain: 'Work backward from wake time, then move homework or wind-down earlier so the plan has enough room.' },
    { prompt: 'You scroll short videos in bed and suddenly it is much later than planned.', best: 'routine', explain: 'A device parking spot, timer, grayscale, or non-screen wind-down option can make the next choice easier.' },
    { prompt: 'You drink an energy drink late afternoon and then feel wide awake at bedtime.', best: 'adjust', explain: 'Try a caffeine cutoff earlier in the day and use food, water, light, or movement for later energy.' },
    { prompt: 'You feel sleepy during class every day even after trying a better routine for two weeks.', best: 'support', explain: 'Persistent daytime sleepiness deserves help from a trusted adult, school support person, or clinician.' },
    { prompt: 'Someone has trouble breathing during sleep, loud frequent snoring, or falls asleep during unsafe moments.', best: 'help', explain: 'Breathing problems or unsafe sleepiness need professional guidance. This tool is practice, not a diagnosis.' },
    { prompt: 'Stress thoughts keep looping at night before a big test.', best: 'routine', explain: 'A worry list, next-step note, breathing routine, or trusted-adult check-in can help the brain stop trying to solve everything in bed.' }
  ];

  var SLEEP_ENERGY_TOOLS = [
    { id: 'water', icon: '\uD83D\uDCA7', title: 'Water + snack check', use: 'Low energy can be worse when you are thirsty or have not eaten enough.' },
    { id: 'light', icon: '\u2600\uFE0F', title: 'Light reset', use: 'Bright morning light or a brighter room can help wakefulness.' },
    { id: 'move', icon: '\uD83D\uDEB6', title: 'Movement reset', use: 'A short walk, stretch, wheel, or body-friendly movement can restart attention.' },
    { id: 'chunk', icon: '\uD83E\uDDF1', title: 'Task chunking', use: 'Smaller steps reduce the energy cost of starting.' },
    { id: 'quiet', icon: '\uD83C\uDFA7', title: 'Quiet break', use: 'A short sensory break can help when the problem is overload, not laziness.' },
    { id: 'ask', icon: '\uD83E\uDD1D', title: 'Ask for help', use: 'Support matters when tiredness, stress, or sleep trouble keeps repeating.' }
  ];

  var MED_LABEL_PARTS = [
    { id: 'name', icon: '\uD83C\uDFF7\uFE0F', title: 'Medicine name', action: 'Confirm the exact medicine and strength.', why: 'Similar names or strengths can be easy to mix up.' },
    { id: 'active', icon: '\uD83E\uDDEA', title: 'Active ingredient', action: 'Find the ingredient doing the main job.', why: 'Duplicate active ingredients across products can be unsafe.' },
    { id: 'directions', icon: '\uD83D\uDCDD', title: 'Directions', action: 'Read how much, how often, and any maximum-use rules.', why: 'Timing words like every 6 hours or once daily matter.' },
    { id: 'warnings', icon: '\u26A0\uFE0F', title: 'Warnings', action: 'Check who should ask first and what side effects or interactions matter.', why: 'Warnings point to situations where professional guidance is important.' },
    { id: 'storage', icon: '\uD83C\uDF21\uFE0F', title: 'Storage', action: 'Check room temperature, refrigeration, light, moisture, and child-safe storage.', why: 'Storage can affect safety, potency, and accidental exposure.' },
    { id: 'expiration', icon: '\uD83D\uDCC5', title: 'Expiration and disposal', action: 'Check the date and ask how to dispose of old or unused medicine safely.', why: 'Old medicine or unsafe disposal can create avoidable risk.' }
  ];

  var MED_SAMPLE_LABELS = [
    { name: 'Mock Allergy Relief', active: 'loratadine sample ingredient', use: 'Practice label for allergy symptom relief.', directions: 'Sample only: follow a real package or professional instructions.', warnings: 'Ask before combining with other products or if unsure.', storage: 'Store dry and out of reach.', question: 'What section tells you the ingredient doing the main job?', answer: 'active ingredient' },
    { name: 'Mock Fever Reducer', active: 'acetaminophen sample ingredient', use: 'Practice label for fever or pain language.', directions: 'Sample only: check timing and maximum-use rules on a real label.', warnings: 'Watch for duplicate active ingredients in other products.', storage: 'Store as directed on the actual label.', question: 'What risk appears when two products share the same active ingredient?', answer: 'duplicate' },
    { name: 'Mock Antibiotic Rx', active: 'prescription-only sample ingredient', use: 'Practice prescription label reading.', directions: 'Sample only: take exactly as prescribed on a real label.', warnings: 'Do not share prescriptions. Ask if side effects or missed doses happen.', storage: 'Some medicines need special storage; read the label.', question: 'Who should you ask about missed doses or side effects?', answer: 'pharmacist' }
  ];

  var MED_ACTIONS = [
    { id: 'read', label: 'Read the label first', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'ask', label: 'Ask a pharmacist or trusted adult', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
    { id: 'avoid', label: 'Do not take or combine yet', tone: 'bg-orange-50 text-orange-800 border-orange-200' },
    { id: 'urgent', label: 'Get urgent help', tone: 'bg-red-50 text-red-800 border-red-200' }
  ];

  var MED_SCENARIOS = [
    { prompt: 'Two cold products both list the same active ingredient, and you are not sure whether they can be taken together.', best: 'avoid', explain: 'Do not combine yet. Duplicate active ingredients can be unsafe. Ask a pharmacist, prescriber, nurse, or trusted adult.' },
    { prompt: 'A label says every 6 hours, but only 3 hours have passed and symptoms are still annoying.', best: 'read', explain: 'Follow the timing and maximum-use directions on the real label. More often is not automatically safer.' },
    { prompt: 'Someone develops trouble breathing, face swelling, fainting, or a severe reaction after taking medicine.', best: 'urgent', explain: 'Those can be emergency warning signs. Get urgent help immediately.' },
    { prompt: 'A prescription was given to one person, and a friend has similar symptoms and asks to try it.', best: 'avoid', explain: 'Do not share prescriptions. A medicine chosen for one person may be unsafe for someone else.' },
    { prompt: 'The directions are hard to understand or the label has tiny text.', best: 'ask', explain: 'Asking for help is a safety skill. Pharmacists can explain labels and may offer large-print or translated information.' },
    { prompt: 'A medicine is expired or was stored in a hot, wet place, and you are unsure whether it is okay.', best: 'ask', explain: 'Ask a pharmacist or trusted adult what to do and how to dispose of it safely.' }
  ];

  var MED_QUESTION_PROMPTS = [
    'What should I do if I miss a dose?',
    'Can this be taken with my other medicines or supplements?',
    'What side effects should I watch for?',
    'Should this be taken with food, water, or at a certain time?',
    'How should I store it and dispose of leftovers?'
  ];

  var APPOINTMENT_PREP_STEPS = [
    { id: 'reason', icon: '\uD83D\uDCDD', title: 'Reason for visit', action: 'Write the main reason in one sentence.', why: 'A clear opening helps the appointment start in the right place.' },
    { id: 'timeline', icon: '\u23F1\uFE0F', title: 'Timeline', action: 'Note when it started, how often it happens, and what changed.', why: 'Timing helps the listener understand patterns and urgency.' },
    { id: 'details', icon: '\uD83D\uDD0E', title: 'Details and examples', action: 'Describe what it feels like, where it happens, and what makes it better or worse.', why: 'Specific examples are easier to act on than vague memory under pressure.' },
    { id: 'bring', icon: '\uD83C\uDF92', title: 'What to bring', action: 'Bring ID/forms if needed, insurance or school paperwork, medicine list, glasses/hearing aids, and notes.', why: 'Missing information can slow down help or make the next step unclear.' },
    { id: 'questions', icon: '\u2753', title: 'Questions', action: 'Write 2-3 questions before you go.', why: 'Prepared questions protect your priorities when time feels short.' },
    { id: 'followup', icon: '\u2705', title: 'Follow-up plan', action: 'Ask what to do next, when to return, and who to contact if things change.', why: 'Leaving with a next step turns the visit into action.' }
  ];

  var APPOINTMENT_TYPES = [
    { id: 'health', icon: '\uD83C\uDFE5', title: 'Health visit', bring: 'Insurance/card, medicine list, symptoms timeline, questions.', question: 'What should I watch for, and when should I follow up?' },
    { id: 'dental', icon: '\uD83E\uDDB7', title: 'Dental visit', bring: 'Pain/sensitivity notes, oral-care questions, insurance info if needed.', question: 'What can I do at home, and when should I come back?' },
    { id: 'school', icon: '\uD83C\uDFEB', title: 'School support meeting', bring: 'Work samples, examples, accommodations that help, questions.', question: 'What support can we try first, and how will we know it works?' },
    { id: 'work', icon: '\uD83D\uDCBC', title: 'Work or service appointment', bring: 'Forms, schedule, ID if needed, goal for the meeting.', question: 'What is the next step, and when should I expect a response?' }
  ];

  var APPOINTMENT_ACTIONS = [
    { id: 'prepare', label: 'Prepare notes first', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'ask', label: 'Ask for clarification', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'support', label: 'Bring or contact support', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
    { id: 'urgent', label: 'Get urgent help', tone: 'bg-red-50 text-red-800 border-red-200' }
  ];

  var APPOINTMENT_SCENARIOS = [
    { prompt: 'You have a visit tomorrow and know the issue, but you are worried you will forget what to say.', best: 'prepare', explain: 'Write a short reason, timeline, examples, and questions. Notes are allowed.' },
    { prompt: 'The person helping you uses a word you do not understand and moves on quickly.', best: 'ask', explain: 'Ask them to explain it another way or write it down. Clear understanding is part of the appointment.' },
    { prompt: 'You need help explaining a concern or remembering instructions.', best: 'support', explain: 'Ask a trusted person to come with you, help you prepare, or review the follow-up plan.' },
    { prompt: 'You have chest pain, trouble breathing, severe injury, or sudden weakness.', best: 'urgent', explain: 'Those are urgent warning signs. Get emergency help instead of waiting for a routine appointment.' },
    { prompt: 'After the appointment, you cannot remember when to start the next step.', best: 'ask', explain: 'Contact the office, portal, school support person, or trusted adult. Follow-up questions are normal.' },
    { prompt: 'You need an accommodation like larger print, an interpreter, sensory support, or extra processing time.', best: 'support', explain: 'Asking ahead of time or at the start is self-advocacy. The environment should help you communicate.' }
  ];

  var APPOINTMENT_SCRIPT_PROMPTS = [
    'The main reason I am here is...',
    'This started around...',
    'It feels or affects me like...',
    'One thing that makes it better or worse is...',
    'My top question is...',
    'Before I leave, I need to know...'
  ];

  var HOME_SAFETY_CHECKS = [
    { id: 'smoke', icon: '\uD83D\uDEA8', title: 'Smoke alarms', action: 'Know where alarms are and test them with a grown-up or responsible adult.', why: 'Early warning gives people time to leave.' },
    { id: 'co', icon: '\u26A0\uFE0F', title: 'Carbon monoxide alarm', action: 'Use a CO alarm near sleeping areas if the home has fuel-burning appliances or an attached garage.', why: 'Carbon monoxide cannot be seen or smelled.' },
    { id: 'exits', icon: '\uD83D\uDEAA', title: 'Two ways out', action: 'Know two ways out of rooms when possible and keep exits clear.', why: 'A blocked exit should not trap someone.' },
    { id: 'meet', icon: '\uD83D\uDCCD', title: 'Meeting place', action: 'Pick a safe outside meeting place for emergencies.', why: 'People need a simple plan to know everyone got out.' },
    { id: 'chemicals', icon: '\uD83E\uDDFC', title: 'Cleaning product safety', action: 'Use one product as directed, ventilate, and never mix cleaners.', why: 'Some mixtures can release dangerous fumes.' },
    { id: 'numbers', icon: '\u260E\uFE0F', title: 'Emergency contacts', action: 'Know how to call emergency services and who else to contact.', why: 'In a real emergency, looking up numbers wastes time.' }
  ];

  var HOME_SAFETY_ACTIONS = [
    { id: 'prevent', label: 'Prevent and fix risk', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'leave', label: 'Leave and meet outside', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'ask', label: 'Ask an adult or expert', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
    { id: 'urgent', label: 'Call emergency help', tone: 'bg-red-50 text-red-800 border-red-200' }
  ];

  var HOME_SAFETY_SCENARIOS = [
    { prompt: 'A smoke alarm sounds and you see smoke in the hallway.', best: 'leave', explain: 'Leave quickly, stay low if there is smoke, go to the meeting place, and call emergency help from outside.' },
    { prompt: 'A carbon monoxide alarm sounds, but nobody sees smoke.', best: 'leave', explain: 'Treat CO alarms seriously. Leave for fresh air and call for help from outside.' },
    { prompt: 'You are about to clean a bathroom and think mixing products might work faster.', best: 'prevent', explain: 'Use one product as directed and ventilate. Mixing cleaners can create dangerous fumes.' },
    { prompt: 'A small cut is bleeding a little after washing hands.', best: 'ask', explain: 'Use basic first aid with adult support if needed. If bleeding is severe or will not stop, get urgent help.' },
    { prompt: 'Someone is unconscious, having trouble breathing, or has a serious injury.', best: 'urgent', explain: 'That is an emergency. Call emergency services and follow dispatcher instructions.' },
    { prompt: 'A hallway exit is blocked by boxes and shoes.', best: 'prevent', explain: 'Clear exits before an emergency. Good safety is mostly preparation.' }
  ];

  var FIRST_AID_CARDS = [
    { id: 'cut', icon: '\uD83E\uDE79', title: 'Minor cut', first: 'Wash hands, rinse the cut, apply gentle pressure, cover if needed.', urgent: 'Get help if bleeding is heavy, deep, dirty, animal-related, or will not stop.' },
    { id: 'burn', icon: '\uD83D\uDD25', title: 'Small burn', first: 'Cool under running water and tell an adult. Do not put butter or random products on it.', urgent: 'Get urgent help for large, severe, chemical, electrical, face/hand/genital, or blistering burns.' },
    { id: 'choke', icon: '\uD83D\uDEAE', title: 'Choking', first: 'If someone cannot breathe, cough, or speak, get emergency help and a trained person.', urgent: 'Call emergency services immediately if choking is severe.' },
    { id: 'fall', icon: '\uD83E\uDD15', title: 'Fall or injury', first: 'Pause, check pain, swelling, movement, and safety before moving.', urgent: 'Get urgent help for head injury, severe pain, deformity, weakness, or loss of consciousness.' }
  ];

  var HOME_SAFETY_PLAN_PROMPTS = [
    'Our outside meeting place is...',
    'Two exits I know are...',
    'The emergency contact plan is...',
    'A safety item to check this week is...',
    'A cleaning product rule I will remember is...'
  ];

  var DIGITAL_SAFETY_CHECKS = [
    { id: 'passwords', icon: '\uD83D\uDD11', title: 'Long unique passwords', action: 'Use long, unique passwords or a password manager for important accounts.', why: 'Reused passwords turn one leak into many account risks.' },
    { id: 'mfa', icon: '\uD83D\uDCF2', title: 'Two-factor login', action: 'Turn on two-factor authentication where it is available.', why: 'A second approval can stop someone who only has the password.' },
    { id: 'phishing', icon: '\uD83D\uDD0E', title: 'Pause before links', action: 'Check sender, link destination, urgency, spelling, and requests for codes or money.', why: 'Scams often rush people into clicking or sharing.' },
    { id: 'privacy', icon: '\uD83D\uDD12', title: 'Privacy settings', action: 'Review what is public, who can contact you, and what location or profile info is shared.', why: 'Small settings can reveal more than intended.' },
    { id: 'respect', icon: '\uD83D\uDCAC', title: 'Respectful communication', action: 'Pause before posting, ask consent before sharing others, and avoid pile-ons.', why: 'Digital choices affect real people and reputations.' },
    { id: 'report', icon: '\uD83D\uDEA9', title: 'Block, report, save evidence', action: 'Know how to block/report and when to save screenshots or tell a trusted adult.', why: 'A plan helps when online behavior becomes unsafe or harassing.' }
  ];

  var DIGITAL_ACTIONS = [
    { id: 'pause', label: 'Pause and verify', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'secure', label: 'Secure the account', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'tell', label: 'Tell or ask support', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
    { id: 'report', label: 'Block/report/save evidence', tone: 'bg-red-50 text-red-800 border-red-200' }
  ];

  var DIGITAL_SCENARIOS = [
    { prompt: 'A text says your bank account will close unless you click a link and enter your password right now.', best: 'pause', explain: 'Urgency plus a password request is a scam clue. Do not use the link; verify through the official app, site, or phone number.' },
    { prompt: 'A friend sends a code and asks you to read back a login code that arrived on your phone.', best: 'pause', explain: 'Never share login codes. The friend account might be compromised or someone may be trying to take over yours.' },
    { prompt: 'You learn a site you use had a data breach and you reused that password elsewhere.', best: 'secure', explain: 'Change reused passwords, turn on two-factor authentication, and watch important accounts.' },
    { prompt: 'Someone online keeps sending unwanted messages after you asked them to stop.', best: 'report', explain: 'Block/report, save evidence if needed, and tell a trusted person, especially if there are threats or pressure.' },
    { prompt: 'You want to post a photo with another person in it.', best: 'tell', explain: 'Ask permission before sharing. Consent matters online too.' },
    { prompt: 'An offer says you won a prize, but asks for a fee, gift card, or personal information first.', best: 'pause', explain: 'Prize scams often ask for money or information up front. Verify before responding.' }
  ];

  var DIGITAL_SCAM_SIGNS = [
    { id: 'urgent', icon: '\u23F0', title: 'Urgency', clue: 'Act now or lose access.' },
    { id: 'secret', icon: '\uD83E\uDD2B', title: 'Secrecy', clue: 'Do not tell anyone.' },
    { id: 'money', icon: '\uD83D\uDCB8', title: 'Unusual payment', clue: 'Gift cards, wire transfers, crypto, fees for prizes.' },
    { id: 'codes', icon: '\uD83D\uDD22', title: 'Codes/passwords', clue: 'Asks for login codes, passwords, or recovery links.' },
    { id: 'impersonation', icon: '\uD83C\uDFAD', title: 'Impersonation', clue: 'Pretends to be a friend, boss, company, school, or agency.' },
    { id: 'tooGood', icon: '\u2728', title: 'Too good', clue: 'Huge reward for almost no effort.' }
  ];

  var DIGITAL_PLAN_PROMPTS = [
    'One account I should protect first is...',
    'A password habit I can improve is...',
    'A privacy setting I should check is...',
    'If a message pressures me, I will...',
    'If someone online makes me unsafe, I can...'
  ];

  var FOOD_CONFIDENCE_CHECKS = [
    { id: 'hands', icon: '\uD83E\uDDFC', title: 'Wash and separate', action: 'Wash hands and keep raw meat, ready-to-eat foods, and clean tools separate.', why: 'Cross-contamination can move germs to food that will not be cooked again.' },
    { id: 'cold', icon: '\u2744\uFE0F', title: 'Cold storage', action: 'Put leftovers and perishable foods in the fridge or freezer promptly.', why: 'Cold storage slows germ growth.' },
    { id: 'label', icon: '\uD83C\uDFF7\uFE0F', title: 'Label leftovers', action: 'Add a date or note so future-you knows what it is and when it was stored.', why: 'Clear labels reduce mystery containers and waste.' },
    { id: 'reheat', icon: '\uD83C\uDF72', title: 'Reheat safely', action: 'Reheat leftovers thoroughly and stir/check cold spots when using a microwave.', why: 'Uneven heating can leave parts of food cooler than expected.' },
    { id: 'pantry', icon: '\uD83E\uDD6B', title: 'Pantry backup', action: 'Keep a few shelf-stable basics for quick meals.', why: 'Pantry staples make food decisions easier on busy or low-energy days.' },
    { id: 'doubt', icon: '\u2753', title: 'When in doubt', action: 'Throw out food that smells wrong, looks unsafe, was stored unsafely, or is a mystery.', why: 'Food safety is not worth guessing.' }
  ];

  var FOOD_CONFIDENCE_ACTIONS = [
    { id: 'store', label: 'Store and label it', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'eat', label: 'Use or reheat safely', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'toss', label: 'Throw it out', tone: 'bg-red-50 text-red-800 border-red-200' },
    { id: 'ask', label: 'Ask or check guidance', tone: 'bg-amber-50 text-amber-800 border-amber-200' }
  ];

  var FOOD_CONFIDENCE_SCENARIOS = [
    { prompt: 'Cooked rice sat on the counter all afternoon and nobody remembers when it was put out.', best: 'toss', explain: 'Time at room temperature matters. If storage time is unknown or unsafe, choose safety.' },
    { prompt: 'You made soup, it is still fresh, and you want lunch tomorrow.', best: 'store', explain: 'Cool, cover, label, and refrigerate promptly so future-you knows what it is.' },
    { prompt: 'A can is bulging, leaking, or sprays when opened.', best: 'toss', explain: 'Damaged or bulging cans can be dangerous. Do not taste-test.' },
    { prompt: 'A label says "best if used by" yesterday, but the sealed food looks and smells normal.', best: 'ask', explain: 'Date labels can mean quality rather than immediate danger. Ask, check reliable guidance, and inspect carefully.' },
    { prompt: 'Leftovers are cold from the fridge and you want to eat them hot.', best: 'eat', explain: 'Reheat thoroughly and stir/check cold spots, especially with microwaves.' },
    { prompt: 'You need a cheap meal and have rice, beans, frozen vegetables, and salsa.', best: 'eat', explain: 'That is a solid budget meal pattern: base, protein, vegetable, and flavor.' }
  ];

  var FOOD_STORAGE_CARDS = [
    { id: 'leftovers', icon: '\uD83E\uDD61', title: 'Leftovers', keep: 'Fridge promptly, covered and labeled.', watch: 'Mystery age, odd smell, mold, or unsafe time at room temperature.', tip: 'Plan a leftover day before cooking another big meal.' },
    { id: 'frozen', icon: '\u2744\uFE0F', title: 'Freezer backup', keep: 'Freeze portions flat or in small containers.', watch: 'Freezer burn affects quality, not always safety, but labels help.', tip: 'Frozen vegetables can rescue quick meals.' },
    { id: 'cans', icon: '\uD83E\uDD6B', title: 'Canned food', keep: 'Store cool and dry; rotate older cans forward.', watch: 'Bulging, leaking, rusted, or badly dented cans.', tip: 'Beans, tomatoes, tuna, and soups can anchor fast meals.' },
    { id: 'produce', icon: '\uD83E\uDD66', title: 'Produce', keep: 'Wash when ready to use and store based on the food.', watch: 'Slimy texture, mold, or strong off smells.', tip: 'Use fading vegetables in soup, stir-fry, or eggs before they spoil.' },
    { id: 'dry', icon: '\uD83C\uDF5A', title: 'Dry staples', keep: 'Seal rice, pasta, oats, and flour away from moisture.', watch: 'Pests, musty smells, or moisture.', tip: 'Dry staples stretch leftovers and lower meal cost.' }
  ];

  var FOOD_MEAL_BASES = [
    { name: 'Rice', cost: 0.35, note: 'Cheap, filling base' },
    { name: 'Pasta', cost: 0.45, note: 'Fast and flexible' },
    { name: 'Tortilla', cost: 0.40, note: 'Wraps leftovers easily' },
    { name: 'Oats', cost: 0.30, note: 'Breakfast or savory bowl' }
  ];

  var FOOD_MEAL_PROTEINS = [
    { name: 'Beans', cost: 0.55, note: 'Budget-friendly fiber and protein' },
    { name: 'Eggs', cost: 0.70, note: 'Quick protein when available' },
    { name: 'Yogurt', cost: 0.85, note: 'No-cook option' },
    { name: 'Chicken leftovers', cost: 1.25, note: 'Use safely stored leftovers' }
  ];

  var FOOD_MEAL_PRODUCE = [
    { name: 'Frozen vegetables', cost: 0.60, note: 'Low-waste backup' },
    { name: 'Cabbage', cost: 0.35, note: 'Keeps well and adds crunch' },
    { name: 'Apple', cost: 0.55, note: 'Easy side' },
    { name: 'Salsa', cost: 0.40, note: 'Flavor plus vegetables' }
  ];

  var FOOD_MEAL_FLAVORS = [
    { name: 'Salsa', cost: 0.20, note: 'Bright flavor' },
    { name: 'Soy sauce', cost: 0.10, note: 'Savory boost' },
    { name: 'Peanut sauce', cost: 0.35, note: 'Rich and filling' },
    { name: 'Lemon + herbs', cost: 0.25, note: 'Fresh finish' }
  ];

  var FOOD_LABEL_SAMPLES = [
    { name: 'Granola bar', calories: 190, protein: 4, fiber: 2, addedSugar: 9, sodium: 90, question: 'Which number helps you compare added sweetness?', answer: 'added sugar' },
    { name: 'Soup cup', calories: 240, protein: 8, fiber: 5, addedSugar: 2, sodium: 760, question: 'Which number might matter if someone is watching salt?', answer: 'sodium' },
    { name: 'Yogurt bowl', calories: 160, protein: 12, fiber: 0, addedSugar: 6, sodium: 80, question: 'Which number helps compare how filling the protein may be?', answer: 'protein' }
  ];

  var RECORDS_CHECKS = [
    { id: 'id', icon: '\uD83E\uDEAA', title: 'Identity basics', action: 'Know where an ID, school/work ID, or other identity document is kept.', why: 'Many forms, appointments, travel, jobs, and services ask for proof of identity.' },
    { id: 'contacts', icon: '\u260E\uFE0F', title: 'Emergency contacts', action: 'Keep a current list of trusted contacts and important phone numbers.', why: 'A written backup helps when a phone is lost, dead, or unavailable.' },
    { id: 'health', icon: '\uD83C\uDFE5', title: 'Health and insurance cards', action: 'Keep medical, dental, pharmacy, or insurance cards where they can be found for appointments.', why: 'Appointments go smoother when key information is ready.' },
    { id: 'receipts', icon: '\uD83E\uDDFE', title: 'Receipts and proof', action: 'Save receipts, confirmation numbers, and proof of payment for important purchases or bills.', why: 'Proof helps with returns, warranties, disputes, and budgeting.' },
    { id: 'forms', icon: '\uD83D\uDCCB', title: 'Forms one field at a time', action: 'Read the instructions, required fields, signature lines, and privacy notes before writing.', why: 'Forms are easier when they are decoded in small parts.' },
    { id: 'storage', icon: '\uD83D\uDD12', title: 'Private storage', action: 'Store sensitive papers safely and avoid sharing private numbers unless the request is legitimate.', why: 'Identity and account information can be misused.' }
  ];

  var RECORD_ACTIONS = [
    { id: 'store', label: 'Store or back it up', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'ask', label: 'Ask before sharing/signing', tone: 'bg-amber-50 text-amber-900 border-amber-200' },
    { id: 'update', label: 'Update the record', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'protect', label: 'Protect private info', tone: 'bg-red-50 text-red-800 border-red-200' }
  ];

  var RECORD_SCENARIOS = [
    { prompt: 'A school, clinic, or job form asks for a current emergency contact, but the phone number is old.', best: 'update', explain: 'Update the record before turning it in so helpers can reach the right person.' },
    { prompt: 'A message says you must send a photo of an ID and Social Security number through an unknown link.', best: 'protect', explain: 'Private documents should only be shared through trusted, verified routes.' },
    { prompt: 'You bought headphones with a one-year warranty and the box says to keep proof of purchase.', best: 'store', explain: 'Save the receipt or confirmation number where you can find it later.' },
    { prompt: 'A permission form uses words you do not understand and has a signature line.', best: 'ask', explain: 'A signature can mean agreement or consent. Ask before signing confusing paperwork.' },
    { prompt: 'You moved and your school, workplace, or clinic still has your old address.', best: 'update', explain: 'Current contact information prevents missed notices and delays.' },
    { prompt: 'You need documents for an appointment tomorrow morning.', best: 'store', explain: 'Put ID, cards, forms, questions, and directions in one ready place the night before.' }
  ];

  var RECORD_TYPE_CARDS = [
    { id: 'identity', icon: '\uD83E\uDEAA', title: 'Identity documents', keep: 'School ID, state ID, passport, birth certificate, or other proof of identity.', use: 'Appointments, applications, travel, jobs, and official forms.', protect: 'Keep originals secure; share copies only through trusted routes.' },
    { id: 'health', icon: '\uD83C\uDFE5', title: 'Health records', keep: 'Insurance cards, medication lists, appointment notes, immunization records, and care instructions.', use: 'Appointments, pharmacy questions, school forms, and follow-up plans.', protect: 'Health information is private. Share it only with appropriate helpers or services.' },
    { id: 'money', icon: '\uD83E\uDDFE', title: 'Money proof', keep: 'Receipts, confirmation numbers, pay stubs, bank letters, invoices, and bill records.', use: 'Returns, warranties, taxes, disputes, budgeting, and proof of payment.', protect: 'Cover account numbers when sharing and avoid posting financial records.' },
    { id: 'housing', icon: '\uD83C\uDFE0', title: 'Home and housing', keep: 'Lease, utility account info, repair requests, renter insurance, and move-in notes.', use: 'Repairs, deposits, renewals, moving, and understanding responsibilities.', protect: 'Read before signing and keep copies of agreements.' },
    { id: 'schoolwork', icon: '\uD83C\uDF93', title: 'School or work', keep: 'Schedules, permission slips, accommodations, applications, offer letters, and policy forms.', use: 'Deadlines, meetings, interviews, and knowing what is expected.', protect: 'Ask about unclear rules, consent, or required private information.' }
  ];

  var FORM_FIELD_CARDS = [
    { id: 'required', icon: '\u2733\uFE0F', title: 'Required field', means: 'The form needs this answer before it can be submitted.', move: 'Answer only if the form is legitimate and you understand what is being requested.', watch: 'Required does not mean you should ignore privacy or safety concerns.' },
    { id: 'optional', icon: '\u25CB', title: 'Optional field', means: 'You may be allowed to leave it blank.', move: 'Skip optional private details when they are not needed.', watch: 'Some optional fields are for marketing, not the main service.' },
    { id: 'signature', icon: '\u270D\uFE0F', title: 'Signature', means: 'A signature may show agreement, permission, or confirmation.', move: 'Read the section above the signature and ask before signing unclear forms.', watch: 'Do not sign blank forms.' },
    { id: 'consent', icon: '\uD83E\uDD1D', title: 'Consent', means: 'Consent means permission for something specific.', move: 'Check what you are agreeing to, who gets information, and whether you can say no.', watch: 'Consent should be informed, specific, and not hidden in confusing language.' },
    { id: 'deadline', icon: '\u23F3', title: 'Deadline', means: 'The form or task is due by a certain date or time.', move: 'Add the deadline to a calendar or reminder and plan a first step.', watch: 'Waiting until the last minute can make missing documents harder to fix.' }
  ];

  var RECORD_PLAN_PROMPTS = [
    'One document I should know how to find is...',
    'A receipt or confirmation number I should save is...',
    'A private number or document I should protect is...',
    'A deadline or renewal I should track is...',
    'A person I can ask about confusing paperwork is...'
  ];

  var TRANSPORT_CHECKS = [
    { id: 'destination', icon: '\uD83D\uDCCD', title: 'Destination details', action: 'Check the full address, entrance, pickup spot, or stop name before leaving.', why: 'Small location details prevent last-minute confusion.' },
    { id: 'route', icon: '\uD83E\uDDED', title: 'Route and stops', action: 'Know the route, stop, platform, transfer, or turn-by-turn path.', why: 'A clear route makes changes easier to notice.' },
    { id: 'time', icon: '\u23F1\uFE0F', title: 'Time buffer', action: 'Add extra minutes for walking, waiting, traffic, elevators, weather, or delays.', why: 'A buffer lowers stress and protects appointments.' },
    { id: 'fare', icon: '\uD83C\uDFAB', title: 'Fare or payment', action: 'Check fare card, ticket, cash, pass, gas, parking, or ride cost.', why: 'Payment surprises can stop a trip.' },
    { id: 'access', icon: '\u267F', title: 'Access needs', action: 'Check elevators, curb cuts, seating, sensory needs, daylight, or safer waiting areas.', why: 'Accessible routes are part of a real route plan.' },
    { id: 'backup', icon: '\uD83D\uDD01', title: 'Backup plan', action: 'Pick a second route, trusted contact, or what-to-do-if-late step.', why: 'Plans change; backups reduce panic.' }
  ];

  var TRANSPORT_ACTIONS = [
    { id: 'plan', label: 'Check the plan first', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'reroute', label: 'Use a backup route', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'ask', label: 'Ask trusted or official help', tone: 'bg-amber-50 text-amber-900 border-amber-200' },
    { id: 'wait', label: 'Wait in a safer place', tone: 'bg-red-50 text-red-800 border-red-200' }
  ];

  var TRANSPORT_SCENARIOS = [
    { prompt: 'Your bus is delayed and you may miss an appointment.', best: 'reroute', explain: 'Check another route or call ahead. A backup plan protects the appointment and lowers stress.' },
    { prompt: 'You are not sure which platform or stop is correct at a station.', best: 'ask', explain: 'Ask official staff, signage, or a trusted helper instead of guessing.' },
    { prompt: 'A stranger offers a ride after you missed a stop.', best: 'ask', explain: 'Move to a safer public place and contact a trusted person or official help.' },
    { prompt: 'Your fare card is low and the trip starts soon.', best: 'plan', explain: 'Check fare or payment before leaving so the trip does not stall.' },
    { prompt: 'The pickup spot is dark, isolated, and uncomfortable.', best: 'wait', explain: 'Choose a more visible public spot when possible and tell a trusted person where you are.' },
    { prompt: 'A route has one transfer and another is longer but direct.', best: 'plan', explain: 'Compare time, transfers, accessibility, weather, and comfort before choosing.' }
  ];

  var TRANSPORT_MODE_CARDS = [
    { id: 'walkroll', icon: '\uD83D\uDEB6', title: 'Walk or roll', best: 'Short, familiar trips with safe crossings and accessible paths.', check: 'Sidewalks, curb cuts, lighting, weather, traffic, and rest spots.', backup: 'A ride, bus, safer route, or trusted contact if conditions change.' },
    { id: 'bike', icon: '\uD83D\uDEB2', title: 'Bike or scooter', best: 'Medium trips with safe lanes, helmet, lights, and secure parking.', check: 'Traffic stress, weather, battery/locks, visibility, and local rules.', backup: 'Transit, walking, pickup, or a safe place to lock up.' },
    { id: 'transit', icon: '\uD83D\uDE8C', title: 'Bus or train', best: 'Regular routes, school/work trips, and avoiding parking costs.', check: 'Schedule, stop direction, transfer, fare, accessibility, and alerts.', backup: 'Later trip, alternate route, rideshare, pickup, or calling ahead.' },
    { id: 'car', icon: '\uD83D\uDE97', title: 'Car or ride', best: 'Trips with heavy items, low transit access, or tight timing.', check: 'Driver, route, fuel/charge, parking, seat belts, and pickup details.', backup: 'Alternate driver, public transit, waiting safely, or rescheduling.' },
    { id: 'rideshare', icon: '\uD83D\uDCF1', title: 'App-based ride', best: 'When cost, pickup safety, and trusted account settings are understood.', check: 'Plate, driver name, pickup spot, fare estimate, and sharing trip status.', backup: 'Cancel unsafe pickups, wait in public, or ask trusted support.' }
  ];

  var TRANSPORT_SYMBOL_CARDS = [
    { id: 'transfer', icon: '\uD83D\uDD04', title: 'Transfer', means: 'You switch from one route, vehicle, or line to another.', move: 'Check the next stop, direction, platform, and wait time before leaving the first vehicle.' },
    { id: 'accessible', icon: '\u267F', title: 'Accessible route', means: 'A route includes elevators, ramps, curb cuts, or other access supports.', move: 'Check alerts because elevators, sidewalks, or entrances can change.' },
    { id: 'fare', icon: '\uD83C\uDFAB', title: 'Fare gate or ticket', means: 'You need payment, pass, card, or ticket proof.', move: 'Prepare payment before the line and keep proof until the trip is done.' },
    { id: 'alert', icon: '\u26A0\uFE0F', title: 'Service alert', means: 'Something about the route changed.', move: 'Read the alert, then compare delay, detour, or backup options.' },
    { id: 'exit', icon: '\uD83D\uDEAA', title: 'Exit or pickup', means: 'This points to where you leave, meet a ride, or enter a building.', move: 'Confirm the exact exit or pickup side so helpers can find you.' }
  ];

  var TRANSPORT_PLAN_PROMPTS = [
    'My destination and entrance are...',
    'My route, stop, or pickup spot is...',
    'My time buffer will be...',
    'My fare, ticket, or payment plan is...',
    'If the route changes, my backup plan is...'
  ];

  var WORK_CHECKS = [
    { id: 'contact', icon: '\u260E\uFE0F', title: 'Contact basics', action: 'Know the phone, email, or message method an employer or supervisor should use.', why: 'Clear contact details prevent missed interviews, shifts, and updates.' },
    { id: 'resume', icon: '\uD83D\uDCC4', title: 'Resume or skills list', action: 'Keep a simple list of skills, experiences, references, and activities you can share.', why: 'Applications and interviews are easier when details are already gathered.' },
    { id: 'availability', icon: '\uD83D\uDCC5', title: 'Availability', action: 'Know which days, times, transportation limits, and school or care responsibilities affect work.', why: 'Good scheduling starts with honest availability.' },
    { id: 'interview', icon: '\uD83E\uDD1D', title: 'Interview prep', action: 'Practice introducing yourself, giving examples, and asking one question about the role.', why: 'Practice lowers pressure and helps answers sound clearer.' },
    { id: 'firstday', icon: '\uD83C\uDFC1', title: 'First-day plan', action: 'Plan clothes, route, arrival time, required papers, and who to ask when you arrive.', why: 'A first-day checklist turns unknowns into steps.' },
    { id: 'support', icon: '\uD83D\uDEE1\uFE0F', title: 'Support and safety', action: 'Know who to ask about unclear tasks, unsafe conditions, harassment, pay, or accommodations.', why: 'Work should include clear instructions, respect, and safety.' }
  ];

  var WORK_ACTIONS = [
    { id: 'prepare', label: 'Prepare before the task', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'clarify', label: 'Ask a clarifying question', tone: 'bg-amber-50 text-amber-900 border-amber-200' },
    { id: 'communicate', label: 'Communicate early', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'support', label: 'Get support or escalate', tone: 'bg-red-50 text-red-800 border-red-200' }
  ];

  var WORK_SCENARIOS = [
    { prompt: 'An interview is tomorrow and you are not sure what to bring or where to enter.', best: 'prepare', explain: 'Check the location, contact, time, outfit, route, and any documents before the day starts.' },
    { prompt: 'A supervisor gives a task, but one step is unclear and mistakes could matter.', best: 'clarify', explain: 'Clarifying early is professional. Repeat what you understood and ask about the uncertain step.' },
    { prompt: 'You realize you may be late for a shift because your ride or bus is delayed.', best: 'communicate', explain: 'Tell the right person as early as possible and share the realistic arrival update.' },
    { prompt: 'Someone at work pressures you to do something unsafe or against the rules.', best: 'support', explain: 'Safety matters. Pause and ask a supervisor, trusted adult, HR, or another appropriate support.' },
    { prompt: 'An application asks for availability and you have school, appointments, and transportation limits.', best: 'prepare', explain: 'Write honest availability so the schedule is realistic.' },
    { prompt: 'You receive feedback on a task and are not sure what to improve next time.', best: 'clarify', explain: 'Ask for one specific next step or example. Feedback is easier to use when it is concrete.' }
  ];

  var WORKPLACE_CARDS = [
    { id: 'schedule', icon: '\uD83D\uDCC5', title: 'Schedule basics', doThis: 'Check start/end times, breaks, location, and who to notify about changes.', watch: 'Assuming a schedule without confirming it.', phrase: 'Can you confirm my next shift and where I should report?' },
    { id: 'tasks', icon: '\u2705', title: 'Task clarity', doThis: 'Write down the task, deadline, priority, and quality standard.', watch: 'Guessing when instructions are unclear.', phrase: 'I want to make sure I understand. Is the first step...?' },
    { id: 'feedback', icon: '\uD83D\uDDE3\uFE0F', title: 'Feedback', doThis: 'Listen for the next action, ask for an example, and thank the person for clarifying.', watch: 'Taking every correction as failure.', phrase: 'What is one thing I should do differently next time?' },
    { id: 'safety', icon: '\uD83D\uDEE1\uFE0F', title: 'Safety and respect', doThis: 'Follow safety rules and ask support for unsafe, discriminatory, or harassing behavior.', watch: 'Keeping serious concerns secret because work feels new.', phrase: 'I need help with a safety or respect concern.' },
    { id: 'pay', icon: '\uD83E\uDDFE', title: 'Pay and records', doThis: 'Track hours, pay stubs, tips, reimbursements, and schedule changes.', watch: 'Not saving proof when something looks wrong.', phrase: 'Can you help me understand this pay or schedule record?' }
  ];

  var INTERVIEW_CARDS = [
    { id: 'intro', icon: '\uD83D\uDC4B', title: 'Introduce yourself', prompt: 'Share your name, interest, and one strength.', example: 'Hi, I am interested in this role because I like helping people and I am dependable with routines.' },
    { id: 'star', icon: '\u2B50', title: 'STAR answer', prompt: 'Situation, Task, Action, Result keeps examples clear.', example: 'At school, our group had a deadline. I organized the checklist, reminded teammates, and we finished on time.' },
    { id: 'availability', icon: '\uD83D\uDCC5', title: 'Availability', prompt: 'Be honest about school, transportation, care duties, and limits.', example: 'I am available after 4 PM on weekdays and most Saturdays with advance notice.' },
    { id: 'question', icon: '\u2753', title: 'Ask a question', prompt: 'Prepare one respectful question about training, expectations, or schedule.', example: 'What does training usually look like for someone new in this role?' },
    { id: 'followup', icon: '\uD83D\uDCE8', title: 'Follow up', prompt: 'A short thank-you can confirm interest and keep communication clear.', example: 'Thank you for meeting with me. I appreciated learning more about the role.' }
  ];

  var WORK_PLAN_PROMPTS = [
    'One skill or experience I can list is...',
    'My honest availability is...',
    'One interview answer I can practice is...',
    'My first-day route and arrival buffer are...',
    'If I am confused or unsafe at work, I can ask...'
  ];

  var RESUME_CHECKS = [
    { id: 'target', icon: '\uD83C\uDFAF', title: 'Target role', action: 'Name the job, volunteer role, internship, program, or opportunity the resume is for.', why: 'A target helps choose which skills and examples belong near the top.' },
    { id: 'contact', icon: '\u260E\uFE0F', title: 'Contact basics', action: 'Use a reachable phone, email, city/state if useful, and a professional display name.', why: 'Employers need a clear way to contact you without extra private information.' },
    { id: 'sections', icon: '\uD83D\uDCCB', title: 'Clear sections', action: 'Use simple headings such as Summary, Experience, Projects, Skills, Education, and Certifications.', why: 'Human reviewers and hiring systems both scan predictable headings more easily.' },
    { id: 'evidence', icon: '\u2705', title: 'Evidence bullets', action: 'Turn tasks into action plus context plus skill plus result.', why: 'Evidence shows what you actually did instead of just naming traits.' },
    { id: 'match', icon: '\uD83D\uDD0D', title: 'Skills match', action: 'Compare real skills and experiences to the role description or O*NET task language.', why: 'Matching vocabulary helps readers see relevance without inventing claims.' },
    { id: 'review', icon: '\uD83D\uDEE1\uFE0F', title: 'Review and accessibility', action: 'Proofread, remove private details, keep formatting simple, and ask a trusted reviewer when possible.', why: 'A clean, truthful, readable resume is easier to use and safer to share.' }
  ];

  var RESUME_ACTIONS = [
    { id: 'tailor', label: 'Tailor to the role', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'evidence', label: 'Add evidence', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'truth', label: 'Keep it truthful', tone: 'bg-amber-50 text-amber-900 border-amber-200' },
    { id: 'support', label: 'Ask for review or support', tone: 'bg-red-50 text-red-800 border-red-200' }
  ];

  var RESUME_SCENARIOS = [
    { prompt: 'A job post asks for customer service and punctuality. You have volunteer check-in experience and a steady after-school schedule.', best: 'tailor', explain: 'Choose examples that match the role: greeting people, tracking check-ins, arriving reliably, and asking questions when needed.' },
    { prompt: 'A bullet says, "Helped a lot at the food pantry," but it does not show what you did.', best: 'evidence', explain: 'Add action, context, and result, such as sorting items, labeling shelves, helping visitors, or reducing wait time.' },
    { prompt: 'You do not have paid work experience yet, but you have class projects, chores, activities, and volunteering.', best: 'evidence', explain: 'Real experience can come from school, home, clubs, volunteering, caregiving, and projects. Label it honestly.' },
    { prompt: 'An AI tool suggests adding a skill you do not have because it matches the job keywords.', best: 'truth', explain: 'Do not claim unsupported skills. Use the tool to find wording for real evidence, then edit carefully.' },
    { prompt: 'A resume draft includes your Social Security number, full birth date, and private health details.', best: 'support', explain: 'Remove private information and ask a trusted adult, counselor, teacher, or workforce helper before sharing.' },
    { prompt: 'A website says your resume needs more keywords for an applicant tracking system.', best: 'truth', explain: 'Use clean headings and role language only when it connects to real experience. Keyword stuffing can make the resume less trustworthy.' }
  ];

  var RESUME_SECTION_CARDS = [
    { id: 'header', icon: '\u260E\uFE0F', title: 'Header/contact', include: 'Name, reachable email or phone, city/state if helpful, and portfolio link only if appropriate.', avoid: 'Social Security number, full birth date, private IDs, or accounts that are not ready for employers.', prompt: 'Can someone contact me safely and clearly?' },
    { id: 'summary', icon: '\uD83D\uDCDD', title: 'Summary/objective', include: 'One or two short lines naming the role, strengths, and work habit you can support with examples.', avoid: 'Generic claims like hard worker with no evidence.', prompt: 'What role am I aiming for and what evidence supports it?' },
    { id: 'experience', icon: '\uD83D\uDCBC', title: 'Experience/projects', include: 'Paid work, volunteering, class projects, home responsibilities, clubs, activities, and caregiving tasks when relevant.', avoid: 'Pretending unpaid experience was paid or copying job-post language without proof.', prompt: 'What did I do, for whom, and what changed?' },
    { id: 'skills', icon: '\uD83D\uDEE0\uFE0F', title: 'Skills', include: 'Tools, languages, certifications, communication, teamwork, safety, scheduling, customer service, or technical skills you can explain.', avoid: 'Long lists of skills you cannot demonstrate or define.', prompt: 'Could I give an example of each skill if asked?' },
    { id: 'education', icon: '\uD83C\uDF93', title: 'Education/training', include: 'School, program, coursework, credentials, licenses, workshops, and relevant training.', avoid: 'Grades, personal details, or unfinished credentials unless the context asks for them.', prompt: 'Which learning or credential helps this opportunity?' }
  ];

  var RESUME_BULLET_EXAMPLES = [
    { weak: 'Worked at food bank.', strong: 'Sorted and labeled 120+ pantry items per shift so visitors could find staples faster.', why: 'Action plus context plus measurable result.' },
    { weak: 'Good with people.', strong: 'Greeted guests, answered routine questions, and asked a supervisor for help when a request was unclear.', why: 'Shows communication, judgment, and support-seeking.' },
    { weak: 'Did a group project.', strong: 'Organized a shared checklist for a 4-person class project and helped the team finish before the deadline.', why: 'Connects teamwork, planning, and result.' },
    { weak: 'Used computer stuff.', strong: 'Created a simple spreadsheet to track supplies, totals, and missing items for a school event.', why: 'Names the tool use and the purpose.' }
  ];

  var RESUME_RESEARCH_CARDS = [
    { id: 'nace', source: 'NACE Career Readiness Competencies', title: 'Employers look for evidence of career-ready skills.', finding: 'NACE defines career readiness through competencies such as communication, critical thinking, professionalism, teamwork, technology, leadership, equity/inclusion, and career self-development. Resume bullets should show evidence of those skills in real situations.', apply: 'Translate experiences into examples: action, skill, context, and result.', url: 'https://www.naceweb.org/career-readiness/competencies/career-readiness-defined/' },
    { id: 'onet', source: 'O*NET OnLine', title: 'Occupational vocabulary can make resumes more precise.', finding: 'O*NET organizes occupations by tasks, skills, knowledge, work activities, and context. It can help learners compare a role with their real experiences and choose accurate words.', apply: 'Use role language only when it matches something the learner can honestly explain.', url: 'https://www.onetonline.org/help/online/' },
    { id: 'validity', source: 'LLM resume-screening validity research', title: 'Automated screening is imperfect.', finding: 'Recent studies of large language model resume screening report inconsistency, abstention problems, and validity concerns. A resume should still be clear for humans and not optimized only for an automated score.', apply: 'Treat AI feedback as a draft helper. Keep claims truthful, readable, and reviewable.', url: 'https://arxiv.org/abs/2602.18550' },
    { id: 'bias', source: 'Bias in resume screening research', title: 'Fairness and bias matter.', finding: 'Research on language-model retrieval for resume screening has found gender, race, and intersectional bias signals in simulated screening. Resume education should include privacy, evidence, and human review rather than blind trust in automation.', apply: 'Avoid irrelevant personal details, save proof of experience, and ask for support if a process feels unfair.', url: 'https://arxiv.org/abs/2407.20371' }
  ];

  var RESUME_PLAN_PROMPTS = [
    'The role or opportunity I am targeting is...',
    'One real experience I can turn into evidence is...',
    'One skill from the role that I can honestly show is...',
    'One private or distracting detail I should remove is...',
    'One trusted reviewer or support person I can ask is...'
  ];

  var PROOF_CHECKS = [
    { id: 'gather', icon: '\uD83D\uDCC1', title: 'Gather examples', action: 'List projects, certificates, volunteer logs, work samples, awards, reflections, or links that show real experience.', why: 'Proof makes a resume bullet easier to explain in an interview.' },
    { id: 'label', icon: '\uD83C\uDFF7\uFE0F', title: 'Label the skill', action: 'Name the skill each item shows, such as teamwork, planning, communication, safety, design, caregiving, or technology.', why: 'Labels help connect evidence to the role or opportunity.' },
    { id: 'context', icon: '\uD83D\uDCDD', title: 'Add context', action: 'Write one sentence about what the item is, what you did, and what changed.', why: 'Context turns a random file or memory into usable proof.' },
    { id: 'permission', icon: '\uD83E\uDD1D', title: 'Check permission', action: 'Ask before sharing photos, names, group work, client information, school records, or anything involving another person.', why: 'Portfolios should respect privacy, consent, and safety.' },
    { id: 'organize', icon: '\uD83E\uDDF9', title: 'Organize by audience', action: 'Sort items for jobs, school, volunteering, scholarships, programs, or personal records.', why: 'Different audiences need different evidence.' },
    { id: 'share', icon: '\uD83D\uDD12', title: 'Choose share level', action: 'Mark each item public, limited, private, or ask-before-sharing.', why: 'Not every good proof item belongs in a public portfolio.' }
  ];

  var PROOF_ACTIONS = [
    { id: 'save', label: 'Save useful proof', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'describe', label: 'Describe the skill', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'protect', label: 'Protect privacy', tone: 'bg-amber-50 text-amber-900 border-amber-200' },
    { id: 'review', label: 'Ask for review', tone: 'bg-red-50 text-red-800 border-red-200' }
  ];

  var PROOF_SCENARIOS = [
    { prompt: 'You finished a class project that shows planning and teamwork, but it is not mentioned on your resume yet.', best: 'save', explain: 'Save the project title, your role, a short description, and the skill it supports.' },
    { prompt: 'A photo of volunteer work includes other people and a sign-in sheet in the background.', best: 'protect', explain: 'Crop or blur private details, ask permission, or describe the work without sharing the photo.' },
    { prompt: 'A certificate looks useful, but you are not sure which job skill it supports.', best: 'describe', explain: 'Add a plain-language note that connects the certificate to a skill or requirement.' },
    { prompt: 'A portfolio link has old jokes, private posts, and unfinished work mixed with strong examples.', best: 'review', explain: 'Ask a trusted reviewer and separate professional examples from personal material before sharing.' },
    { prompt: 'A resume bullet says you organized supplies, and you have a spreadsheet that proves the system.', best: 'save', explain: 'That spreadsheet can support the bullet if it has no private information and is okay to share.' },
    { prompt: 'A recommendation note uses your full address and another person\u2019s phone number.', best: 'protect', explain: 'Keep the original private and create a share-safe version that removes unnecessary personal details.' }
  ];

  var PROOF_TYPE_CARDS = [
    { id: 'project', icon: '\uD83D\uDEE0\uFE0F', title: 'Project sample', examples: 'Class project, build, design, presentation, spreadsheet, code, recipe, repair log, or art piece.', shows: 'Planning, creativity, technical skills, persistence, and problem solving.', share: 'Share a clean version, screenshot, link, or short summary.' },
    { id: 'certificate', icon: '\uD83C\uDF93', title: 'Certificate or training', examples: 'CPR, food safety, first aid, software badge, course completion, license, or workshop.', shows: 'Preparation, safety, knowledge, and follow-through.', share: 'Check expiration dates and avoid exposing private ID numbers.' },
    { id: 'service', icon: '\uD83E\uDD1D', title: 'Volunteer or service proof', examples: 'Hour log, thank-you note, event role, reflection, supervisor note, or photo with permission.', shows: 'Reliability, communication, teamwork, and community care.', share: 'Remove names, contact info, and photos of others unless permission is clear.' },
    { id: 'work', icon: '\uD83D\uDCBC', title: 'Work sample', examples: 'Schedule record, task checklist, inventory sheet, customer script, safety checklist, or process note.', shows: 'Dependability, organization, customer service, accuracy, and workplace judgment.', share: 'Never share confidential employer, client, student, patient, or customer information.' },
    { id: 'reference', icon: '\uD83D\uDDE3\uFE0F', title: 'Reference note', examples: 'Teacher, coach, supervisor, counselor, mentor, or helper note.', shows: 'How another person has seen your strengths in action.', share: 'Ask before listing someone as a reference or sharing their contact details.' }
  ];

  var PROOF_QUALITY_CARDS = [
    { id: 'truthful', icon: '\u2705', title: 'Truthful', check: 'Could I explain exactly what I did?', fix: 'Rewrite vague claims as action plus context plus result.' },
    { id: 'relevant', icon: '\uD83C\uDFAF', title: 'Relevant', check: 'Does this proof support the role, program, or interview question?', fix: 'Move less relevant items to a private archive.' },
    { id: 'current', icon: '\u23F1\uFE0F', title: 'Current', check: 'Is this recent enough, or does it still show a real skill?', fix: 'Add a date, update the description, or pair it with newer proof.' },
    { id: 'readable', icon: '\uD83D\uDC41\uFE0F', title: 'Readable', check: 'Can someone scan it quickly and understand what it shows?', fix: 'Add a short caption, clean title, alt text, or plain-language summary.' },
    { id: 'shareSafe', icon: '\uD83D\uDD12', title: 'Share-safe', check: 'Does it remove private details and respect permission?', fix: 'Use limited sharing, redaction, cropping, or a private note instead.' }
  ];

  var PROOF_SHARE_LEVELS = [
    { id: 'public', icon: '\uD83C\uDF10', title: 'Public', use: 'For polished work samples meant for anyone with the link.', guard: 'No private records, private addresses, student/client data, or unapproved photos.' },
    { id: 'limited', icon: '\uD83D\uDD17', title: 'Limited link', use: 'For applications, interviews, scholarships, or a specific reviewer.', guard: 'Share only the items needed for that audience and review permissions first.' },
    { id: 'private', icon: '\uD83D\uDD12', title: 'Private archive', use: 'For proof you may reference but should not show publicly.', guard: 'Keep originals safe, especially IDs, records, pay stubs, health, school, or employer documents.' },
    { id: 'ask', icon: '\u2753', title: 'Ask first', use: 'For group work, photos with people, reference notes, or anything involving another person.', guard: 'Ask a trusted reviewer or the person involved before sharing.' }
  ];

  var PROOF_PLAN_PROMPTS = [
    'One proof item I can collect is...',
    'The skill this proof shows is...',
    'The safe share level for this item is...',
    'One private detail I should remove or protect is...',
    'One person who can review my portfolio is...'
  ];

  var INTERVIEW_CHECKS = [
    { id: 'role', icon: '\uD83C\uDFAF', title: 'Know the role', action: 'Name the job, program, internship, volunteer role, or opportunity you are practicing for.', why: 'A target role helps answers stay relevant.' },
    { id: 'evidence', icon: '\uD83D\uDCC4', title: 'Bring evidence', action: 'Pick 2-3 resume bullets or proof locker items that show real skills.', why: 'Strong answers are easier when examples are ready.' },
    { id: 'star', icon: '\u2B50', title: 'Practice STAR', action: 'Prepare one story with situation, task, action, and result.', why: 'STAR keeps answers organized without memorizing a script.' },
    { id: 'access', icon: '\u267F', title: 'Plan access needs', action: 'Decide whether you need notes, extra processing time, captions, an interpreter, a support person, or another accommodation.', why: 'Access supports can make interviews more fair and less stressful.' },
    { id: 'questions', icon: '\u2753', title: 'Prepare questions', action: 'Write at least one question about training, schedule, expectations, support, or next steps.', why: 'Questions help you decide if the opportunity fits you too.' },
    { id: 'followup', icon: '\uD83D\uDCE8', title: 'Follow up', action: 'Plan a short thank-you or check-in message after the interview.', why: 'Follow-up keeps communication clear and professional.' }
  ];

  var INTERVIEW_ACTIONS = [
    { id: 'clarify', label: 'Ask to clarify', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'evidence', label: 'Use a real example', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'pause', label: 'Pause and organize', tone: 'bg-amber-50 text-amber-900 border-amber-200' },
    { id: 'support', label: 'Name support or accommodation', tone: 'bg-red-50 text-red-800 border-red-200' }
  ];

  var INTERVIEW_SCENARIOS = [
    { prompt: 'The interviewer asks a long question and you lose track of the last part.', best: 'clarify', explain: 'It is okay to ask them to repeat or break the question into parts before answering.' },
    { prompt: 'They ask about teamwork and you have a group project in your proof locker.', best: 'evidence', explain: 'Use the project as proof: explain the situation, your role, what you did, and the result.' },
    { prompt: 'You feel nervous and start talking too fast.', best: 'pause', explain: 'Take one breath, use your notes if allowed, and answer one part at a time.' },
    { prompt: 'You need captions, written instructions, or time to process questions during an interview.', best: 'support', explain: 'A respectful accommodation request can focus on what helps you communicate your skills.' },
    { prompt: 'They ask, "What is a weakness?" and you want to say something harsh about yourself.', best: 'pause', explain: 'Choose a real growth area plus a strategy you are using to improve.' },
    { prompt: 'They ask why you want the role, but you only remember the company name.', best: 'evidence', explain: 'Connect the role to one real interest, skill, proof item, or learning goal.' }
  ];

  var INTERVIEW_ROLES = [
    { id: 'firstjob', icon: '\uD83D\uDED2', title: 'First job', interviewer: 'Hiring manager', tone: 'warm, direct, and practical', focus: 'availability, reliability, customer service, learning routines, and asking for help', opening: 'Thanks for meeting with me. To start, tell me about yourself and one strength you would bring to this role.' },
    { id: 'internship', icon: '\uD83D\uDCBB', title: 'Internship or program', interviewer: 'Program interviewer', tone: 'curious, structured, and encouraging', focus: 'projects, learning goals, teamwork, problem solving, and growth mindset', opening: 'I would like to learn how your experiences connect to this opportunity. What project or proof item are you proud of?' },
    { id: 'volunteer', icon: '\uD83E\uDD1D', title: 'Volunteer role', interviewer: 'Volunteer coordinator', tone: 'friendly, mission-focused, and supportive', focus: 'dependability, communication, safety, helping others, and boundaries', opening: 'We appreciate volunteers who are reliable and kind. What kind of helping task have you done before?' },
    { id: 'school', icon: '\uD83C\uDF93', title: 'School, scholarship, or club', interviewer: 'Selection committee member', tone: 'thoughtful, reflective, and student-centered', focus: 'goals, strengths, challenges, participation, and evidence of effort', opening: 'Tell me about a goal you are working toward and one example that shows your effort.' },
    { id: 'access', icon: '\u267F', title: 'Accessible interview practice', interviewer: 'Accessible hiring partner', tone: 'clear, patient, and accommodation-aware', focus: 'communication preferences, supports, strengths, examples, and fair ways to show skills', opening: 'We want this interview to work for you. What helps you communicate clearly, and what strength would you like us to notice?' }
  ];

  var INTERVIEW_QUESTIONS = [
    { id: 'tellme', type: 'Opening', q: 'Tell me about yourself.', purpose: 'A short, role-focused introduction.', frame: 'I am interested in this role because... One strength I bring is... For example...', proof: 'Use one resume bullet or proof item as a quick example.' },
    { id: 'whyrole', type: 'Motivation', q: 'Why do you want this role or program?', purpose: 'Connect interest to the opportunity.', frame: 'I am interested because... This connects to my experience with... I hope to learn or contribute...', proof: 'Point to a project, class, volunteer task, or responsibility.' },
    { id: 'strength', type: 'Strength', q: 'What is one strength you would bring?', purpose: 'Name a skill and show evidence.', frame: 'One strength is... I showed this when... The result was...', proof: 'Choose a proof locker item that clearly shows the skill.' },
    { id: 'problem', type: 'STAR', q: 'Tell me about a time you solved a problem.', purpose: 'Show problem solving with a clear story.', frame: 'Situation... Task... Action... Result...', proof: 'Use a real challenge from school, work, volunteering, home, or a project.' },
    { id: 'teamwork', type: 'Collaboration', q: 'Tell me about a time you worked with others.', purpose: 'Show communication and shared responsibility.', frame: 'Our goal was... My role was... I helped by... We finished by...', proof: 'Use a group project, team, event, shift, or family responsibility.' },
    { id: 'weakness', type: 'Growth', q: 'What is an area you are working to improve?', purpose: 'Show self-awareness without oversharing.', frame: 'I am working on... A strategy I use is... I am improving by...', proof: 'Use a safe, role-appropriate growth example.' },
    { id: 'availability', type: 'Logistics', q: 'What is your availability or schedule like?', purpose: 'Set honest expectations.', frame: 'I am available... I have commitments... I can communicate changes by...', proof: 'Use your schedule, transportation, or first-day plan.' },
    { id: 'questions', type: 'Your question', q: 'What question do you have for us?', purpose: 'Show interest and gather information.', frame: 'Could you tell me about training, expectations, schedule, support, or next steps?', proof: 'Pick one question that helps you decide if the role fits.' }
  ];

  var INTERVIEW_SUGGESTIONS = [
    'Could you repeat or rephrase the question?',
    'One example from my resume is...',
    'A proof item I can connect to this is...',
    'I would like a moment to think before I answer.',
    'One question I have is about training and expectations.',
    'A support that helps me communicate clearly is...'
  ];

  var INTERVIEW_RUBRIC_CARDS = [
    { id: 'star', icon: '\u2B50', title: 'STAR structure', check: 'Does the answer include situation, task, action, and result?', coach: 'Add the missing part instead of making the answer longer.' },
    { id: 'evidence', icon: '\uD83D\uDCC4', title: 'Evidence match', check: 'Does the answer connect to a resume bullet or proof item?', coach: 'Name the real example and what skill it shows.' },
    { id: 'clear', icon: '\uD83D\uDCAC', title: 'Clear communication', check: 'Can someone understand the main point in one listen?', coach: 'Use shorter sentences and signpost the example.' },
    { id: 'access', icon: '\u267F', title: 'Access and self-advocacy', check: 'Does the learner know how to ask for a support if needed?', coach: 'Practice one respectful script for notes, captions, processing time, or written instructions.' },
    { id: 'question', icon: '\u2753', title: 'Question for interviewer', check: 'Does the learner have one question ready?', coach: 'Ask about training, first week expectations, schedule, supports, or next steps.' }
  ];

  var INTERVIEW_REFLECTION_PROMPTS = [
    'One answer that felt strong was...',
    'One answer I want to improve is...',
    'One proof item I should mention next time is...',
    'One support or accommodation I may ask for is...',
    'One follow-up question or thank-you message I can send is...'
  ];

  var INTERVIEW_PLAN_TEMPLATES = [
    { id: 'starter', title: 'Starter confidence plan', minutes: 5, focus: 'Answer one opening question out loud, then save one next step.', goal: 'This week I will practice a short "tell me about yourself" answer three times.' },
    { id: 'star', title: 'STAR story plan', minutes: 8, focus: 'Build one situation, task, action, result story and use it in chat.', goal: 'This week I will prepare one STAR story connected to a resume bullet or proof item.' },
    { id: 'rolefit', title: 'Role-fit plan', minutes: 10, focus: 'Connect one strength, one proof item, and one question for the interviewer.', goal: 'This week I will explain why this role fits my interests and skills.' },
    { id: 'access', title: 'Access support plan', minutes: 7, focus: 'Practice a respectful script for notes, captions, processing time, or written instructions.', goal: 'This week I will prepare one access support request that helps me communicate clearly.' },
    { id: 'followup', title: 'Follow-up plan', minutes: 6, focus: 'Draft one thank-you or check-in message after practice.', goal: 'This week I will prepare a follow-up message and one question about next steps.' }
  ];

  var INTERVIEW_PLAN_STEPS = [
    { id: 'warmup', label: 'Warm up', detail: 'Read the current interview question and take one slow breath before answering.' },
    { id: 'answer', label: 'Practice one answer', detail: 'Say or write one answer using a suggested stem, STAR story, or proof item.' },
    { id: 'coach', label: 'Use feedback', detail: 'Pick one coach move from the feedback, rubric, or reflection prompt.' },
    { id: 'repeat', label: 'Repeat once', detail: 'Try the answer again with one clearer detail or result.' },
    { id: 'next', label: 'Save next step', detail: 'Save one goal for tomorrow, this week, or the next interview practice.' }
  ];

  var INTERVIEW_REHEARSAL_TARGETS = [
    { id: '30', label: '30 seconds', cue: 'One clear point plus one example.' },
    { id: '60', label: '60 seconds', cue: 'A short STAR answer with one result.' },
    { id: '90', label: '90 seconds', cue: 'A fuller answer with context, action, result, and fit.' }
  ];

  var INTERVIEW_REHEARSAL_SCRIPTS = [
    { id: 'pause', title: 'Pause script', script: 'I would like a moment to think so I can answer clearly.' },
    { id: 'clarify', title: 'Clarify script', script: 'Could you repeat or rephrase the question?' },
    { id: 'notes', title: 'Notes script', script: 'I use brief notes to stay organized. Is it okay if I refer to them?' },
    { id: 'access', title: 'Access support script', script: 'Written instructions, captions, or a little processing time help me communicate my skills clearly.' },
    { id: 'repair', title: 'Repair script', script: 'I want to answer that more clearly. The main point I want to share is...' }
  ];

  var INTERVIEW_PROOF_MATCHERS = [
    { id: 'teamwork', title: 'Teamwork', question: 'Tell me about a time you worked with others.', skill: 'collaboration and communication', proofPrompt: 'A group project, team activity, shift, event, or helping role.', answerStem: 'One teamwork example I can share is...', safeShare: 'Name your role and the outcome without sharing private details about other people.' },
    { id: 'problem', title: 'Problem solving', question: 'Tell me about a time you solved a problem.', skill: 'problem solving and follow-through', proofPrompt: 'A class task, home responsibility, repair, schedule problem, or project challenge.', answerStem: 'A problem I helped solve was...', safeShare: 'Keep the story truthful and focus on what you did, not blaming someone else.' },
    { id: 'dependable', title: 'Dependability', question: 'How do you show reliability?', skill: 'responsibility and consistency', proofPrompt: 'Attendance, chores, caregiving, volunteering, deadlines, transportation planning, or routines.', answerStem: 'One way I show reliability is...', safeShare: 'Use a specific routine or responsibility that is okay to talk about.' },
    { id: 'learning', title: 'Learning quickly', question: 'Tell me about a time you learned something new.', skill: 'learning mindset and asking for help', proofPrompt: 'A new tool, class skill, job task, recipe, route, app, or workplace routine.', answerStem: 'A time I learned something new was...', safeShare: 'It is okay to mention support or practice without oversharing personal information.' },
    { id: 'service', title: 'Customer or community care', question: 'How would you help someone who needs support?', skill: 'kind communication and service', proofPrompt: 'Helping a classmate, family member, customer, neighbor, visitor, or teammate.', answerStem: 'When someone needs support, I try to...', safeShare: 'Use respectful language and protect the other person\'s privacy.' },
    { id: 'access', title: 'Self-advocacy', question: 'What helps you do your best work?', skill: 'self-advocacy and clear communication', proofPrompt: 'Notes, written instructions, captions, a checklist, extra processing time, or a quiet reset.', answerStem: 'A support that helps me do my best work is...', safeShare: 'Focus on the support and how it helps performance, not private medical details.' }
  ];

  var INTERVIEW_DAY_CHECKS = [
    { id: 'time', phase: 'Before', title: 'Confirm time and place', detail: 'Know the date, start time, location, meeting link, room, or check-in instructions.' },
    { id: 'travel', phase: 'Before', title: 'Plan travel or tech', detail: 'Set a route, ride, parking, device charge, internet check, and arrival buffer.' },
    { id: 'materials', phase: 'Before', title: 'Gather materials', detail: 'Bring resume, proof items, notes, ID if needed, water, charger, and contact information.' },
    { id: 'access', phase: 'Before', title: 'Prepare access supports', detail: 'Have notes, captions, written instructions, processing-time script, interpreter plan, or support person details if needed.' },
    { id: 'during', phase: 'During', title: 'Use a reset strategy', detail: 'Pause, breathe, ask to clarify, or use a support script when a question feels confusing.' },
    { id: 'after', phase: 'After', title: 'Send follow-up', detail: 'Send a thank-you, note next steps, save what went well, and record one improvement.' }
  ];

  var COMMUNICATION_CHECKS = [
    { id: 'pause', icon: '\u23F8\uFE0F', title: 'Pause before reacting', action: 'Take a breath, wait, or draft first when emotions are high.', why: 'A pause makes it easier to choose words instead of escalating.' },
    { id: 'listen', icon: '\uD83D\uDC42', title: 'Listen and reflect', action: 'Repeat the main idea you heard before responding when the topic matters.', why: 'Reflection reduces misunderstandings and shows the other person was heard.' },
    { id: 'ask', icon: '\u2753', title: 'Ask clarifying questions', action: 'Ask what, when, where, or what-do-you-mean before guessing.', why: 'Many conflicts start from assumptions.' },
    { id: 'istatement', icon: '\uD83D\uDCAC', title: 'Use I-statements', action: 'Say your feeling, need, or request without starting with blame.', why: 'Clear ownership makes hard conversations safer to hear.' },
    { id: 'boundary', icon: '\uD83D\uDEE1\uFE0F', title: 'Name boundaries', action: 'Say what is okay, what is not okay, and what you will do next.', why: 'Boundaries protect time, safety, privacy, and respect.' },
    { id: 'support', icon: '\uD83E\uDD1D', title: 'Know when to get support', action: 'Ask trusted help for threats, harassment, coercion, discrimination, or unsafe conflict.', why: 'Some situations should not be handled alone.' }
  ];

  var COMMUNICATION_ACTIONS = [
    { id: 'pause', label: 'Pause and cool down', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'clarify', label: 'Ask or reflect back', tone: 'bg-amber-50 text-amber-900 border-amber-200' },
    { id: 'repair', label: 'Repair or apologize', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'support', label: 'Get trusted support', tone: 'bg-red-50 text-red-800 border-red-200' }
  ];

  var COMMUNICATION_SCENARIOS = [
    { prompt: 'A message makes you angry and you want to reply immediately in all caps.', best: 'pause', explain: 'Pause, draft, or wait. You can still respond clearly after the first wave of emotion passes.' },
    { prompt: 'A friend says "you never listen," but you are not sure what they mean.', best: 'clarify', explain: 'Reflect and ask for a specific example before defending yourself.' },
    { prompt: 'You snapped at someone and later realize your words were unfair.', best: 'repair', explain: 'A useful repair names what happened, takes responsibility, and says what you will try next.' },
    { prompt: 'Someone keeps pressuring you after you said no.', best: 'support', explain: 'Repeated pressure is a boundary and safety issue. Get trusted support instead of handling it alone.' },
    { prompt: 'A group chat misunderstanding is spreading quickly.', best: 'pause', explain: 'Slow the conversation down, avoid piling on, and choose a calmer channel if needed.' },
    { prompt: 'A teacher, helper, or coworker gives instructions that sound different from what you heard earlier.', best: 'clarify', explain: 'Ask a short clarifying question so everyone has the same expectation.' }
  ];

  var MESSAGE_TONE_CARDS = [
    { id: 'direct', icon: '\uD83C\uDFAF', title: 'Direct', before: 'You did this wrong.', after: 'Can we check this step together? I think something changed.', why: 'Direct can still be respectful and specific.' },
    { id: 'urgent', icon: '\u23F0', title: 'Urgent', before: 'Answer me now!!!', after: 'This is time-sensitive. Can you reply by 4 PM?', why: 'A clear deadline works better than pressure.' },
    { id: 'boundary', icon: '\uD83D\uDEE1\uFE0F', title: 'Boundary', before: 'Leave me alone forever.', after: 'I need space tonight. I can talk tomorrow after school.', why: 'Boundaries are clearer when they say what happens next.' },
    { id: 'repair', icon: '\uD83E\uDE79', title: 'Repair', before: 'Sorry if you were offended.', after: 'I am sorry I interrupted. Next time I will wait before jumping in.', why: 'A repair owns the action and names a next step.' },
    { id: 'ask', icon: '\u2753', title: 'Ask', before: 'This makes no sense.', after: 'Can you explain the first step again?', why: 'Specific questions are easier to answer.' }
  ];

  var BOUNDARY_REPAIR_CARDS = [
    { id: 'time', icon: '\u23F3', title: 'Time boundary', script: 'I cannot talk right now. I can check in at...', support: 'Use when you need space, rest, or focus time.' },
    { id: 'privacy', icon: '\uD83D\uDD12', title: 'Privacy boundary', script: 'I am not comfortable sharing that information.', support: 'Use when a question asks for private details.' },
    { id: 'no', icon: '\u270B', title: 'Saying no', script: 'No, that does not work for me.', support: 'A no does not need a long debate.' },
    { id: 'repair', icon: '\uD83E\uDD1D', title: 'Repair attempt', script: 'I am sorry I... Next time I will...', support: 'Use when you want to take responsibility and rebuild trust.' },
    { id: 'support', icon: '\uD83D\uDEA9', title: 'Trusted support', script: 'I need help with a situation that feels unsafe or too big.', support: 'Use for threats, pressure, harassment, discrimination, or fear.' }
  ];

  var COMMUNICATION_PLAN_PROMPTS = [
    'A conversation I want to prepare for is...',
    'One I-statement I can try is...',
    'A boundary I may need to say is...',
    'If I need to repair harm, I can say...',
    'If the conflict feels unsafe, I can ask...'
  ];

  var TIME_CHECKS = [
    { id: 'capture', icon: '\uD83D\uDCDD', title: 'Capture tasks', action: 'Write down tasks, deadlines, appointments, and reminders in one trusted place.', why: 'A visible list reduces the load of trying to remember everything.' },
    { id: 'estimate', icon: '\u23F1\uFE0F', title: 'Estimate time', action: 'Guess how long the task will take, then add a buffer.', why: 'Most plans fail because they only use best-case timing.' },
    { id: 'chunk', icon: '\uD83E\uDDF1', title: 'Break it down', action: 'Turn a big task into the next small visible step.', why: 'Small starts are easier than vague goals.' },
    { id: 'priority', icon: '\uD83C\uDFAF', title: 'Choose priority', action: 'Separate urgent, important, helpful, and optional tasks.', why: 'Not every task deserves the same energy today.' },
    { id: 'reminder', icon: '\u23F0', title: 'Use reminders', action: 'Set an alarm, calendar note, checklist, or visual cue before the task is due.', why: 'Reminders help future-you at the right time.' },
    { id: 'recovery', icon: '\uD83D\uDD01', title: 'Recovery plan', action: 'Plan what to do if you miss a step, run late, or need more help.', why: 'A plan can bend without breaking.' }
  ];

  var TIME_ACTIONS = [
    { id: 'capture', label: 'Write it down', tone: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'chunk', label: 'Break into next step', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'prioritize', label: 'Choose the priority', tone: 'bg-amber-50 text-amber-900 border-amber-200' },
    { id: 'ask', label: 'Ask or renegotiate', tone: 'bg-red-50 text-red-800 border-red-200' }
  ];

  var TIME_SCENARIOS = [
    { prompt: 'You have three homework tasks, one appointment, and a chore floating around in your head.', best: 'capture', explain: 'Get the tasks out of memory and into one list or calendar before choosing what comes first.' },
    { prompt: 'A project feels too big, so you keep avoiding it.', best: 'chunk', explain: 'Name the next tiny step: open the file, gather materials, write the title, or ask one question.' },
    { prompt: 'Two tasks are due today, but one affects safety or an appointment and the other is optional.', best: 'prioritize', explain: 'Do the urgent and important task first, then schedule or shrink the optional one.' },
    { prompt: 'You realize a deadline cannot be met even with focused work.', best: 'ask', explain: 'Ask early for help, a new timeline, or the minimum useful version instead of disappearing.' },
    { prompt: 'You are always late because you leave exactly when the map says travel begins.', best: 'prioritize', explain: 'Build in transition and buffer time. Perfect-case timing is not a real plan.' },
    { prompt: 'You finish a task but forget to submit or bring it.', best: 'capture', explain: 'Add a final reminder for the handoff step, not just the work step.' }
  ];

  var PRIORITY_CARDS = [
    { id: 'now', icon: '\uD83D\uDEA8', title: 'Do now', clue: 'Urgent and important', move: 'Start or ask for immediate help.', example: 'Medication label question before taking medicine, leaving for an appointment, deadline today.' },
    { id: 'schedule', icon: '\uD83D\uDCC5', title: 'Schedule', clue: 'Important but not immediate', move: 'Choose a time block and reminder.', example: 'Study plan, laundry before needed, meal prep, application draft.' },
    { id: 'support', icon: '\uD83E\uDD1D', title: 'Ask support', clue: 'Needs another person, permission, or clarification', move: 'Send the question early.', example: 'Confusing form, unclear assignment, ride plan, work schedule question.' },
    { id: 'shrink', icon: '\u2702\uFE0F', title: 'Shrink or drop', clue: 'Optional, too large, or low value today', move: 'Pick the smallest useful version or remove it.', example: 'Clean one surface instead of the whole room, draft instead of perfect final.' }
  ];

  var TIME_TOOL_CARDS = [
    { id: 'timer', icon: '\u23F2\uFE0F', title: 'Focus timer', use: 'Try 10, 15, or 25 minutes of focus followed by a short reset.', goodFor: 'Starting, reducing overwhelm, and noticing how long tasks actually take.' },
    { id: 'calendar', icon: '\uD83D\uDCC6', title: 'Calendar block', use: 'Put appointments, deadlines, travel, and reminders on a calendar.', goodFor: 'Seeing the week and catching conflicts early.' },
    { id: 'checklist', icon: '\u2705', title: 'Checklist', use: 'List steps in the order they need to happen.', goodFor: 'Routines, packing, forms, chores, and first-day plans.' },
    { id: 'launchpad', icon: '\uD83C\uDFC1', title: 'Launchpad', use: 'Put keys, forms, bag, clothes, or supplies in one ready place.', goodFor: 'Leaving on time and reducing morning search stress.' },
    { id: 'bodydouble', icon: '\uD83D\uDC65', title: 'Body double', use: 'Work near someone else or check in at the start and finish.', goodFor: 'Getting started when attention, motivation, or anxiety makes tasks sticky.' }
  ];

  var TIME_PLAN_PROMPTS = [
    'One task I need to capture is...',
    'The next tiny step is...',
    'A realistic time estimate plus buffer is...',
    'A reminder or visual cue I can use is...',
    'If the plan slips, my recovery step is...'
  ];

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

  function fmtClockMinutes(totalMinutes) {
    var mins = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
    var hour = Math.floor(mins / 60);
    var minute = mins % 60;
    var suffix = hour >= 12 ? 'PM' : 'AM';
    var hour12 = hour % 12 || 12;
    return hour12 + ':' + (minute < 10 ? '0' : '') + minute + ' ' + suffix;
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
    description: 'Essential knowledge for adulting \u2014 taxes, data literacy, contracts, records, transportation, job readiness, resume building, portfolio proof organization, interview practice, communication, time management, dental care, body care, sleep routines, medication labels, appointments, home safety, digital safety, food confidence, car care, laundry science, home systems, and critical thinking.',
    category: 'Life Skills',
    gradeRange: 'K-12',
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
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
      function stemBeep(correct) { if (typeof window.stemBeep === 'function') { window.stemBeep(correct); return; } if (correct) { lifeskTone(660, 0.09, 'sine', 0.05); setTimeout(function() { lifeskTone(880, 0.12, 'sine', 0.05); }, 90); } else { lifeskTone(196, 0.2, 'triangle', 0.05); } }
      function announceToSR(msg) { upd('srMsg', msg); }

      // ── Defaults ──
      var tab = d.tab || 'overview';
      var glassCard = 'bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg p-4';
      var overviewFocus = d.overviewFocus || 'money';
      var overviewConfidence = d.overviewConfidence != null ? d.overviewConfidence : 3;
      var overviewNextStep = d.overviewNextStep || '';
      var overviewPath = LIFE_SKILL_PATHS.find(function(path) { return path.id === overviewFocus; }) || LIFE_SKILL_PATHS[0];

      function saveOverviewPlan() {
        if (!overviewNextStep.trim()) {
          upd('overviewPlanMsg', 'Write one small next step first.');
          return;
        }
        updMulti({ overviewPlanSaved: Date.now(), overviewPlanMsg: 'Plan saved: ' + overviewNextStep.trim() });
        checkBadge('planMaker');
        announceToSR('Life Skills plan saved');
      }

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
      var dmCriteria = d.dmCriteria || [{ name: __alloT('stem.lifeskills.cost', 'Cost'), weight: 3 }, { name: __alloT('stem.lifeskills.quality', 'Quality'), weight: 4 }, { name: __alloT('stem.lifeskills.time', 'Time'), weight: 2 }];
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
      // LAUNDRY LAB STATE
      // ══════════════════════════════════════════
      var laundryMode = d.laundryMode || 'load';
      var laundryLoadItems = Array.isArray(d.laundryLoadItems) ? d.laundryLoadItems : ['White towels', 'Dark jeans', 'Red cotton shirt'];
      var laundryWater = d.laundryWater || 'cold';
      var laundryCycle = d.laundryCycle || 'normal';
      var laundryDetergent = d.laundryDetergent != null ? d.laundryDetergent : 1;
      var laundryLoadFill = d.laundryLoadFill != null ? d.laundryLoadFill : 70;
      var laundryChecklist = d.laundryChecklist || {};
      var laundryStainIdx = d.laundryStainIdx || 0;
      var laundryStainChoice = d.laundryStainChoice;
      var laundryStainFb = d.laundryStainFb || '';
      var laundryStainScore = d.laundryStainScore || 0;
      var laundryMythIdx = d.laundryMythIdx || 0;
      var laundryMythAnswer = d.laundryMythAnswer;
      var laundryMythFb = d.laundryMythFb || '';
      var laundryMythScore = d.laundryMythScore || 0;
      var laundryCareIdx = d.laundryCareIdx || 0;
      var laundryStainFamilyIdx = d.laundryStainFamilyIdx || 0;
      var laundryLoadsWeek = d.laundryLoadsWeek != null ? d.laundryLoadsWeek : 3;
      var laundryColdShare = d.laundryColdShare != null ? d.laundryColdShare : 70;
      var laundryDryerShare = d.laundryDryerShare != null ? d.laundryDryerShare : 75;
      var laundryCurrentStain = LAUNDRY_STAINS[laundryStainIdx % LAUNDRY_STAINS.length];
      var laundryCurrentMyth = LAUNDRY_MYTHS[laundryMythIdx % LAUNDRY_MYTHS.length];
      var laundryCurrentCare = LAUNDRY_CARE_LABELS[laundryCareIdx % LAUNDRY_CARE_LABELS.length];
      var laundryCurrentFamily = LAUNDRY_STAIN_FAMILIES[laundryStainFamilyIdx % LAUNDRY_STAIN_FAMILIES.length];
      var laundrySelectedItems = LAUNDRY_ITEMS.filter(function(item) { return laundryLoadItems.indexOf(item.name) >= 0; });
      var laundryFlags = { light: false, dark: false, red: false, delicate: false, heavy: false, heavySoil: false, newDark: false, sweaty: false };
      laundrySelectedItems.forEach(function(item) {
        if (item.color === 'light') laundryFlags.light = true;
        if (item.color === 'dark') laundryFlags.dark = true;
        if (item.color === 'red') laundryFlags.red = true;
        if (item.weight === 'delicate') laundryFlags.delicate = true;
        if (item.weight === 'heavy') laundryFlags.heavy = true;
        if (item.soil === 'heavy') laundryFlags.heavySoil = true;
        if (item.name.indexOf('New dark') >= 0) laundryFlags.newDark = true;
        if (item.soil === 'sweaty') laundryFlags.sweaty = true;
      });
      var laundryIssues = [];
      if (laundryFlags.light && (laundryFlags.red || laundryFlags.newDark || laundryFlags.dark)) laundryIssues.push('Color risk: lights can pick up dye from reds, darks, or new fleece.');
      if (laundryFlags.delicate && laundryFlags.heavy) laundryIssues.push('Fabric risk: delicates can stretch, snag, or shrink with towels, jeans, or hoodies.');
      if (laundryFlags.heavySoil && laundrySelectedItems.length > 3) laundryIssues.push('Soil risk: greasy items clean better when pretreated and washed with similar soil levels.');
      if (laundryLoadFill > 85) laundryIssues.push('Overload risk: clothes need room to tumble so water and detergent can circulate.');
      if (laundryDetergent > 1.3) laundryIssues.push('Residue risk: extra detergent can stay in fabric and trap odor.');
      if (laundryDetergent < 0.65) laundryIssues.push('Cleaning risk: too little detergent leaves soil behind.');
      var laundrySuggestedWater = (laundryFlags.delicate || laundryFlags.dark || laundryFlags.red || laundryFlags.newDark) ? 'cold' : (laundryFlags.heavySoil ? 'warm' : 'warm');
      var laundrySuggestedCycle = laundryFlags.delicate ? 'delicate' : (laundryFlags.heavy || laundryFlags.heavySoil ? 'normal' : 'normal');
      var laundryDoseStatus = laundryDetergent < 0.65 ? 'Too little' : laundryDetergent > 1.3 ? 'Too much' : 'Measured';
      var laundryDoseColor = laundryDetergent < 0.65 ? '#f59e0b' : laundryDetergent > 1.3 ? '#ef4444' : '#059669';
      var laundryReadiness = Math.max(0, 100 - laundryIssues.length * 16 - (laundryLoadItems.length === 0 ? 35 : 0));
      var laundryMonthlyLoads = laundryLoadsWeek * 4.33;
      var laundryColdLoads = laundryMonthlyLoads * laundryColdShare / 100;
      var laundryDryerLoads = laundryMonthlyLoads * laundryDryerShare / 100;
      var laundryBaselineCost = laundryMonthlyLoads * (0.25 + 0.12 + 0.55);
      var laundryEstimatedCost = laundryMonthlyLoads * 0.25 + (laundryMonthlyLoads - laundryColdLoads) * 0.12 + laundryDryerLoads * 0.55;
      var laundryEstimatedSavings = Math.max(0, laundryBaselineCost - laundryEstimatedCost);

      function toggleLaundryItem(name) {
        var next = laundryLoadItems.slice();
        var idx = next.indexOf(name);
        if (idx >= 0) next.splice(idx, 1);
        else next.push(name);
        upd('laundryLoadItems', next);
        if (next.length >= 4) checkBadge('laundryPro');
      }

      function setLaundryChecklist(id, checked) {
        var next = Object.assign({}, laundryChecklist);
        next[id] = checked;
        upd('laundryChecklist', next);
        if (LAUNDRY_STEPS.every(function(s) { return next[s.id]; })) checkBadge('laundryPro');
      }

      function selectLaundryCare(idx) {
        upd('laundryCareIdx', idx);
        if (idx >= 3) checkBadge('laundryPro');
      }

      function checkLaundryStain(choice) {
        var correct = choice === laundryCurrentStain.answer;
        stemBeep(correct);
        updMulti({
          laundryStainChoice: choice,
          laundryStainFb: correct ? '\u2705 Best choice. ' + laundryCurrentStain.science : '\u274C Try again. Best: ' + laundryCurrentStain.choices[laundryCurrentStain.answer] + '. ' + laundryCurrentStain.science,
          laundryStainScore: laundryStainScore + (correct ? 1 : 0)
        });
        if (correct && laundryStainScore + 1 >= 3) checkBadge('laundryPro');
      }

      function answerLaundryMyth(answer) {
        var correct = answer === laundryCurrentMyth.answer;
        stemBeep(correct);
        updMulti({
          laundryMythAnswer: answer,
          laundryMythFb: correct ? '\u2705 Correct: ' + laundryCurrentMyth.truth + ' ' + laundryCurrentMyth.why : '\u274C Not quite: ' + laundryCurrentMyth.truth + ' ' + laundryCurrentMyth.why,
          laundryMythScore: laundryMythScore + (correct ? 1 : 0)
        });
        if (correct && laundryMythScore + 1 >= 3) checkBadge('laundryPro');
      }

      // ══════════════════════════════════════════
      // CHALLENGE STATE
      // ══════════════════════════════════════════
      // DENTAL CARE STATE
      var dentalRoutine = d.dentalRoutine || {};
      var dentalRoutineDone = DENTAL_ROUTINE_STEPS.filter(function(step) { return !!dentalRoutine[step.id]; }).length;
      var dentalScenarioIdx = d.dentalScenarioIdx || 0;
      var dentalScenarioChoice = d.dentalScenarioChoice || '';
      var dentalScenarioFb = d.dentalScenarioFb || '';
      var dentalScenarioScore = d.dentalScenarioScore || 0;
      var dentalCurrentScenario = DENTAL_SCENARIOS[dentalScenarioIdx % DENTAL_SCENARIOS.length];
      var dentalVisitCost = d.dentalVisitCost != null ? d.dentalVisitCost : 180;
      var dentalDeductible = d.dentalDeductible != null ? d.dentalDeductible : 50;
      var dentalCoinsurance = d.dentalCoinsurance != null ? d.dentalCoinsurance : 20;
      var dentalAnnualMax = d.dentalAnnualMax != null ? d.dentalAnnualMax : 1500;
      var dentalAfterDeductible = Math.max(0, dentalVisitCost - dentalDeductible);
      var dentalPlanPayBeforeMax = dentalAfterDeductible * (1 - dentalCoinsurance / 100);
      var dentalPlanPay = Math.min(dentalPlanPayBeforeMax, dentalAnnualMax);
      var dentalYouPay = Math.max(0, dentalVisitCost - dentalPlanPay);
      var dentalSnackIdx = d.dentalSnackIdx || 0;
      var dentalSnack = DENTAL_SNACKS[dentalSnackIdx % DENTAL_SNACKS.length];
      var dentalSnackColor = dentalSnack.score <= 2 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : dentalSnack.score <= 3 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-700 bg-red-50 border-red-200';

      function setDentalRoutine(id, checked) {
        var next = Object.assign({}, dentalRoutine);
        next[id] = checked;
        upd('dentalRoutine', next);
        if (DENTAL_ROUTINE_STEPS.every(function(step) { return !!next[step.id]; })) checkBadge('dentalReady');
      }

      function answerDentalScenario(choice) {
        var correct = choice === dentalCurrentScenario.best;
        var action = DENTAL_ACTIONS.find(function(a) { return a.id === dentalCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          dentalScenarioChoice: choice,
          dentalScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : dentalCurrentScenario.best) + '. ') + dentalCurrentScenario.explain,
          dentalScenarioScore: dentalScenarioScore + (correct ? 1 : 0)
        });
        if (correct && dentalScenarioScore + 1 >= 3) checkBadge('toothTriage');
      }

      // BODY CARE STATE
      var bodyCareChecklist = d.bodyCareChecklist || {};
      var bodyCareDone = BODYCARE_CHECKS.filter(function(step) { return !!bodyCareChecklist[step.id]; }).length;
      var bodyScreenHeight = d.bodyScreenHeight != null ? d.bodyScreenHeight : 3;
      var bodyReach = d.bodyReach != null ? d.bodyReach : 3;
      var bodyLighting = d.bodyLighting != null ? d.bodyLighting : 3;
      var bodyBreaks = d.bodyBreaks != null ? d.bodyBreaks : 2;
      var bodyResetIdx = d.bodyResetIdx || 0;
      var bodyReset = BODYCARE_RESETS[bodyResetIdx % BODYCARE_RESETS.length];
      var bodyScenarioIdx = d.bodyScenarioIdx || 0;
      var bodyScenarioChoice = d.bodyScenarioChoice || '';
      var bodyScenarioFb = d.bodyScenarioFb || '';
      var bodyScenarioScore = d.bodyScenarioScore || 0;
      var bodyCurrentScenario = BODYCARE_SCENARIOS[bodyScenarioIdx % BODYCARE_SCENARIOS.length];
      var bodySetupTips = [];
      if (bodyScreenHeight < 3) bodySetupTips.push('Raise the screen, book, or work surface so the neck does less bending.');
      if (bodyScreenHeight > 4) bodySetupTips.push('Lower the screen or task if you have to tilt the head up.');
      if (bodyReach < 3) bodySetupTips.push('Move tools a little closer so shoulders and elbows can relax.');
      if (bodyReach > 4) bodySetupTips.push('Give hands and wrists more room so they are not cramped.');
      if (bodyLighting < 3) bodySetupTips.push('Add light, reduce glare, or enlarge text so eyes do not have to strain.');
      if (bodyBreaks < 2) bodySetupTips.push('Plan more short resets during long work blocks.');
      var bodyReadiness = Math.max(0, Math.min(100, 45 + bodyCareDone * 7 + Math.min(bodyBreaks, 4) * 5 - bodySetupTips.length * 8));

      function setBodyCareCheck(id, checked) {
        var next = Object.assign({}, bodyCareChecklist);
        next[id] = checked;
        upd('bodyCareChecklist', next);
        if (BODYCARE_CHECKS.every(function(step) { return !!next[step.id]; })) checkBadge('bodyCareReady');
      }

      function answerBodyCareScenario(choice) {
        var correct = choice === bodyCurrentScenario.best;
        var action = BODYCARE_ACTIONS.find(function(a) { return a.id === bodyCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          bodyScenarioChoice: choice,
          bodyScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : bodyCurrentScenario.best) + '. ') + bodyCurrentScenario.explain,
          bodyScenarioScore: bodyScenarioScore + (correct ? 1 : 0)
        });
        if (correct && bodyScenarioScore + 1 >= 3) checkBadge('ergoSolver');
      }

      // SLEEP & ENERGY STATE
      var sleepRoutine = d.sleepRoutine || {};
      var sleepRoutineDone = SLEEP_ROUTINE_STEPS.filter(function(step) { return !!sleepRoutine[step.id]; }).length;
      var sleepWakeMinutes = d.sleepWakeMinutes != null ? d.sleepWakeMinutes : 390;
      var sleepNeedHours = d.sleepNeedHours != null ? d.sleepNeedHours : 8;
      var sleepWindDown = d.sleepWindDown != null ? d.sleepWindDown : 30;
      var sleepCaffeineCutoff = d.sleepCaffeineCutoff != null ? d.sleepCaffeineCutoff : 14;
      var sleepScreenMinutes = d.sleepScreenMinutes != null ? d.sleepScreenMinutes : 45;
      var sleepScenarioIdx = d.sleepScenarioIdx || 0;
      var sleepScenarioChoice = d.sleepScenarioChoice || '';
      var sleepScenarioFb = d.sleepScenarioFb || '';
      var sleepScenarioScore = d.sleepScenarioScore || 0;
      var sleepCurrentScenario = SLEEP_SCENARIOS[sleepScenarioIdx % SLEEP_SCENARIOS.length];
      var sleepEnergyTools = d.sleepEnergyTools || {};
      var sleepBedMinutes = sleepWakeMinutes - sleepNeedHours * 60;
      var sleepWindDownStart = sleepBedMinutes - sleepWindDown;
      var sleepPlanScore = Math.max(0, Math.min(100, 35 + sleepRoutineDone * 8 + Math.min(sleepNeedHours, 9) * 3 + Math.max(0, 90 - sleepScreenMinutes) / 3 + (sleepCaffeineCutoff <= 15 ? 8 : 0)));

      function setSleepRoutine(id, checked) {
        var next = Object.assign({}, sleepRoutine);
        next[id] = checked;
        upd('sleepRoutine', next);
        if (SLEEP_ROUTINE_STEPS.every(function(step) { return !!next[step.id]; })) checkBadge('sleepPlanner');
      }

      function toggleSleepEnergyTool(id) {
        var next = Object.assign({}, sleepEnergyTools);
        next[id] = !next[id];
        upd('sleepEnergyTools', next);
        if (Object.keys(next).filter(function(k) { return !!next[k]; }).length >= 3) checkBadge('energyCoach');
      }

      function answerSleepScenario(choice) {
        var correct = choice === sleepCurrentScenario.best;
        var action = SLEEP_ACTIONS.find(function(a) { return a.id === sleepCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          sleepScenarioChoice: choice,
          sleepScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : sleepCurrentScenario.best) + '. ') + sleepCurrentScenario.explain,
          sleepScenarioScore: sleepScenarioScore + (correct ? 1 : 0)
        });
        if (correct && sleepScenarioScore + 1 >= 3) checkBadge('energyCoach');
      }

      // MEDICATION & LABELS STATE
      var medChecklist = d.medChecklist || {};
      var medChecklistDone = MED_LABEL_PARTS.filter(function(part) { return !!medChecklist[part.id]; }).length;
      var medLabelIdx = d.medLabelIdx || 0;
      var medLabel = MED_SAMPLE_LABELS[medLabelIdx % MED_SAMPLE_LABELS.length];
      var medLabelAnswer = d.medLabelAnswer || '';
      var medLabelFb = d.medLabelFb || '';
      var medScenarioIdx = d.medScenarioIdx || 0;
      var medScenarioChoice = d.medScenarioChoice || '';
      var medScenarioFb = d.medScenarioFb || '';
      var medScenarioScore = d.medScenarioScore || 0;
      var medCurrentScenario = MED_SCENARIOS[medScenarioIdx % MED_SCENARIOS.length];
      var medQuestionIdx = d.medQuestionIdx || 0;
      var medQuestionNote = d.medQuestionNote || '';
      var medQuestionMsg = d.medQuestionMsg || '';
      var medQuestionPrompt = MED_QUESTION_PROMPTS[medQuestionIdx % MED_QUESTION_PROMPTS.length];

      function setMedChecklist(id, checked) {
        var next = Object.assign({}, medChecklist);
        next[id] = checked;
        upd('medChecklist', next);
        if (MED_LABEL_PARTS.every(function(part) { return !!next[part.id]; })) checkBadge('medLabelReader');
      }

      function checkMedLabelAnswer() {
        if (!medLabelAnswer.trim()) return;
        var correct = medLabelAnswer.trim().toLowerCase().replace(/[^a-z0-9]/g, '').indexOf(medLabel.answer.toLowerCase().replace(/[^a-z0-9]/g, '')) >= 0;
        stemBeep(correct);
        updMulti({
          medLabelFb: correct ? '\u2705 Correct. This mock label is for reading practice only.' : '\uD83D\uDD0E Look for: ' + medLabel.answer + '. This mock label is for reading practice only.',
          medLabelAnswer: ''
        });
        if (correct) checkBadge('medLabelReader');
      }

      function answerMedScenario(choice) {
        var correct = choice === medCurrentScenario.best;
        var action = MED_ACTIONS.find(function(a) { return a.id === medCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          medScenarioChoice: choice,
          medScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : medCurrentScenario.best) + '. ') + medCurrentScenario.explain,
          medScenarioScore: medScenarioScore + (correct ? 1 : 0)
        });
        if (correct && medScenarioScore + 1 >= 3) checkBadge('doseSafety');
      }

      // APPOINTMENTS & SELF-ADVOCACY STATE
      var appointmentPrep = d.appointmentPrep || {};
      var appointmentPrepDone = APPOINTMENT_PREP_STEPS.filter(function(step) { return !!appointmentPrep[step.id]; }).length;
      var appointmentTypeIdx = d.appointmentTypeIdx || 0;
      var appointmentType = APPOINTMENT_TYPES[appointmentTypeIdx % APPOINTMENT_TYPES.length];
      var appointmentScenarioIdx = d.appointmentScenarioIdx || 0;
      var appointmentScenarioChoice = d.appointmentScenarioChoice || '';
      var appointmentScenarioFb = d.appointmentScenarioFb || '';
      var appointmentScenarioScore = d.appointmentScenarioScore || 0;
      var appointmentCurrentScenario = APPOINTMENT_SCENARIOS[appointmentScenarioIdx % APPOINTMENT_SCENARIOS.length];
      var appointmentScriptIdx = d.appointmentScriptIdx || 0;
      var appointmentScriptPrompt = APPOINTMENT_SCRIPT_PROMPTS[appointmentScriptIdx % APPOINTMENT_SCRIPT_PROMPTS.length];
      var appointmentScriptNote = d.appointmentScriptNote || '';
      var appointmentScriptMsg = d.appointmentScriptMsg || '';

      function setAppointmentPrep(id, checked) {
        var next = Object.assign({}, appointmentPrep);
        next[id] = checked;
        upd('appointmentPrep', next);
        if (APPOINTMENT_PREP_STEPS.every(function(step) { return !!next[step.id]; })) checkBadge('appointmentReady');
      }

      function answerAppointmentScenario(choice) {
        var correct = choice === appointmentCurrentScenario.best;
        var action = APPOINTMENT_ACTIONS.find(function(a) { return a.id === appointmentCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          appointmentScenarioChoice: choice,
          appointmentScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : appointmentCurrentScenario.best) + '. ') + appointmentCurrentScenario.explain,
          appointmentScenarioScore: appointmentScenarioScore + (correct ? 1 : 0)
        });
        if (correct && appointmentScenarioScore + 1 >= 3) checkBadge('selfAdvocate');
      }

      // HOME SAFETY STATE
      var homeSafetyChecklist = d.homeSafetyChecklist || {};
      var homeSafetyDone = HOME_SAFETY_CHECKS.filter(function(step) { return !!homeSafetyChecklist[step.id]; }).length;
      var homeSafetyScenarioIdx = d.homeSafetyScenarioIdx || 0;
      var homeSafetyScenarioChoice = d.homeSafetyScenarioChoice || '';
      var homeSafetyScenarioFb = d.homeSafetyScenarioFb || '';
      var homeSafetyScenarioScore = d.homeSafetyScenarioScore || 0;
      var homeSafetyCurrentScenario = HOME_SAFETY_SCENARIOS[homeSafetyScenarioIdx % HOME_SAFETY_SCENARIOS.length];
      var firstAidIdx = d.firstAidIdx || 0;
      var firstAidCard = FIRST_AID_CARDS[firstAidIdx % FIRST_AID_CARDS.length];
      var homePlanIdx = d.homePlanIdx || 0;
      var homePlanPrompt = HOME_SAFETY_PLAN_PROMPTS[homePlanIdx % HOME_SAFETY_PLAN_PROMPTS.length];
      var homePlanNote = d.homePlanNote || '';
      var homePlanMsg = d.homePlanMsg || '';

      function setHomeSafetyCheck(id, checked) {
        var next = Object.assign({}, homeSafetyChecklist);
        next[id] = checked;
        upd('homeSafetyChecklist', next);
        if (HOME_SAFETY_CHECKS.every(function(step) { return !!next[step.id]; })) checkBadge('homeSafetyReady');
      }

      function answerHomeSafetyScenario(choice) {
        var correct = choice === homeSafetyCurrentScenario.best;
        var action = HOME_SAFETY_ACTIONS.find(function(a) { return a.id === homeSafetyCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          homeSafetyScenarioChoice: choice,
          homeSafetyScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : homeSafetyCurrentScenario.best) + '. ') + homeSafetyCurrentScenario.explain,
          homeSafetyScenarioScore: homeSafetyScenarioScore + (correct ? 1 : 0)
        });
        if (correct && homeSafetyScenarioScore + 1 >= 3) checkBadge('safetyResponder');
      }

      // DIGITAL SAFETY STATE
      var digitalChecklist = d.digitalChecklist || {};
      var digitalChecklistDone = DIGITAL_SAFETY_CHECKS.filter(function(step) { return !!digitalChecklist[step.id]; }).length;
      var digitalScenarioIdx = d.digitalScenarioIdx || 0;
      var digitalScenarioChoice = d.digitalScenarioChoice || '';
      var digitalScenarioFb = d.digitalScenarioFb || '';
      var digitalScenarioScore = d.digitalScenarioScore || 0;
      var digitalCurrentScenario = DIGITAL_SCENARIOS[digitalScenarioIdx % DIGITAL_SCENARIOS.length];
      var digitalScamIdx = d.digitalScamIdx || 0;
      var digitalScam = DIGITAL_SCAM_SIGNS[digitalScamIdx % DIGITAL_SCAM_SIGNS.length];
      var digitalPlanIdx = d.digitalPlanIdx || 0;
      var digitalPlanPrompt = DIGITAL_PLAN_PROMPTS[digitalPlanIdx % DIGITAL_PLAN_PROMPTS.length];
      var digitalPlanNote = d.digitalPlanNote || '';
      var digitalPlanMsg = d.digitalPlanMsg || '';

      function setDigitalChecklist(id, checked) {
        var next = Object.assign({}, digitalChecklist);
        next[id] = checked;
        upd('digitalChecklist', next);
        if (DIGITAL_SAFETY_CHECKS.every(function(step) { return !!next[step.id]; })) checkBadge('digitalReady');
      }

      function answerDigitalScenario(choice) {
        var correct = choice === digitalCurrentScenario.best;
        var action = DIGITAL_ACTIONS.find(function(a) { return a.id === digitalCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          digitalScenarioChoice: choice,
          digitalScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : digitalCurrentScenario.best) + '. ') + digitalCurrentScenario.explain,
          digitalScenarioScore: digitalScenarioScore + (correct ? 1 : 0)
        });
        if (correct && digitalScenarioScore + 1 >= 3) checkBadge('scamSpotter');
      }

      // RECORDS & PAPERWORK STATE
      var recordsChecklist = d.recordsChecklist || {};
      var recordsDone = RECORDS_CHECKS.filter(function(step) { return !!recordsChecklist[step.id]; }).length;
      var recordScenarioIdx = d.recordScenarioIdx || 0;
      var recordScenarioChoice = d.recordScenarioChoice || '';
      var recordScenarioFb = d.recordScenarioFb || '';
      var recordScenarioScore = d.recordScenarioScore || 0;
      var recordCurrentScenario = RECORD_SCENARIOS[recordScenarioIdx % RECORD_SCENARIOS.length];
      var recordTypeIdx = d.recordTypeIdx || 0;
      var recordTypeCard = RECORD_TYPE_CARDS[recordTypeIdx % RECORD_TYPE_CARDS.length];
      var formFieldIdx = d.formFieldIdx || 0;
      var formFieldCard = FORM_FIELD_CARDS[formFieldIdx % FORM_FIELD_CARDS.length];
      var recordPlanIdx = d.recordPlanIdx || 0;
      var recordPlanPrompt = RECORD_PLAN_PROMPTS[recordPlanIdx % RECORD_PLAN_PROMPTS.length];
      var recordPlanNote = d.recordPlanNote || '';
      var recordPlanMsg = d.recordPlanMsg || '';

      function setRecordsCheck(id, checked) {
        var next = Object.assign({}, recordsChecklist);
        next[id] = checked;
        upd('recordsChecklist', next);
        if (RECORDS_CHECKS.every(function(step) { return !!next[step.id]; })) checkBadge('recordsReady');
      }

      function answerRecordScenario(choice) {
        var correct = choice === recordCurrentScenario.best;
        var action = RECORD_ACTIONS.find(function(a) { return a.id === recordCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          recordScenarioChoice: choice,
          recordScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : recordCurrentScenario.best) + '. ') + recordCurrentScenario.explain,
          recordScenarioScore: recordScenarioScore + (correct ? 1 : 0)
        });
        if (correct && recordScenarioScore + 1 >= 3) checkBadge('formNavigator');
      }

      // TRANSPORTATION & NAVIGATION STATE
      var transportChecklist = d.transportChecklist || {};
      var transportDone = TRANSPORT_CHECKS.filter(function(step) { return !!transportChecklist[step.id]; }).length;
      var transportScenarioIdx = d.transportScenarioIdx || 0;
      var transportScenarioChoice = d.transportScenarioChoice || '';
      var transportScenarioFb = d.transportScenarioFb || '';
      var transportScenarioScore = d.transportScenarioScore || 0;
      var transportCurrentScenario = TRANSPORT_SCENARIOS[transportScenarioIdx % TRANSPORT_SCENARIOS.length];
      var transportModeIdx = d.transportModeIdx || 0;
      var transportModeCard = TRANSPORT_MODE_CARDS[transportModeIdx % TRANSPORT_MODE_CARDS.length];
      var transportSymbolIdx = d.transportSymbolIdx || 0;
      var transportSymbolCard = TRANSPORT_SYMBOL_CARDS[transportSymbolIdx % TRANSPORT_SYMBOL_CARDS.length];
      var transportPlanIdx = d.transportPlanIdx || 0;
      var transportPlanPrompt = TRANSPORT_PLAN_PROMPTS[transportPlanIdx % TRANSPORT_PLAN_PROMPTS.length];
      var transportPlanNote = d.transportPlanNote || '';
      var transportPlanMsg = d.transportPlanMsg || '';

      function setTransportCheck(id, checked) {
        var next = Object.assign({}, transportChecklist);
        next[id] = checked;
        upd('transportChecklist', next);
        if (TRANSPORT_CHECKS.every(function(step) { return !!next[step.id]; })) checkBadge('tripReady');
      }

      function answerTransportScenario(choice) {
        var correct = choice === transportCurrentScenario.best;
        var action = TRANSPORT_ACTIONS.find(function(a) { return a.id === transportCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          transportScenarioChoice: choice,
          transportScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : transportCurrentScenario.best) + '. ') + transportCurrentScenario.explain,
          transportScenarioScore: transportScenarioScore + (correct ? 1 : 0)
        });
        if (correct && transportScenarioScore + 1 >= 3) checkBadge('routeNavigator');
      }

      // JOB READINESS & WORKPLACE STATE
      var workChecklist = d.workChecklist || {};
      var workDone = WORK_CHECKS.filter(function(step) { return !!workChecklist[step.id]; }).length;
      var workScenarioIdx = d.workScenarioIdx || 0;
      var workScenarioChoice = d.workScenarioChoice || '';
      var workScenarioFb = d.workScenarioFb || '';
      var workScenarioScore = d.workScenarioScore || 0;
      var workCurrentScenario = WORK_SCENARIOS[workScenarioIdx % WORK_SCENARIOS.length];
      var workplaceCardIdx = d.workplaceCardIdx || 0;
      var workplaceCard = WORKPLACE_CARDS[workplaceCardIdx % WORKPLACE_CARDS.length];
      var interviewCardIdx = d.interviewCardIdx || 0;
      var interviewCard = INTERVIEW_CARDS[interviewCardIdx % INTERVIEW_CARDS.length];
      var workPlanIdx = d.workPlanIdx || 0;
      var workPlanPrompt = WORK_PLAN_PROMPTS[workPlanIdx % WORK_PLAN_PROMPTS.length];
      var workPlanNote = d.workPlanNote || '';
      var workPlanMsg = d.workPlanMsg || '';

      function setWorkCheck(id, checked) {
        var next = Object.assign({}, workChecklist);
        next[id] = checked;
        upd('workChecklist', next);
        if (WORK_CHECKS.every(function(step) { return !!next[step.id]; })) checkBadge('jobReady');
      }

      function answerWorkScenario(choice) {
        var correct = choice === workCurrentScenario.best;
        var action = WORK_ACTIONS.find(function(a) { return a.id === workCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          workScenarioChoice: choice,
          workScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : workCurrentScenario.best) + '. ') + workCurrentScenario.explain,
          workScenarioScore: workScenarioScore + (correct ? 1 : 0)
        });
        if (correct && workScenarioScore + 1 >= 3) checkBadge('workplaceNavigator');
      }

      // RESUME BUILDER & EVIDENCE REVIEW STATE
      var resumeChecklist = d.resumeChecklist || {};
      var resumeDone = RESUME_CHECKS.filter(function(step) { return !!resumeChecklist[step.id]; }).length;
      var resumeScenarioIdx = d.resumeScenarioIdx || 0;
      var resumeScenarioChoice = d.resumeScenarioChoice || '';
      var resumeScenarioFb = d.resumeScenarioFb || '';
      var resumeScenarioScore = d.resumeScenarioScore || 0;
      var resumeCurrentScenario = RESUME_SCENARIOS[resumeScenarioIdx % RESUME_SCENARIOS.length];
      var resumeSectionIdx = d.resumeSectionIdx || 0;
      var resumeSectionCard = RESUME_SECTION_CARDS[resumeSectionIdx % RESUME_SECTION_CARDS.length];
      var resumeBulletIdx = d.resumeBulletIdx || 0;
      var resumeBulletCard = RESUME_BULLET_EXAMPLES[resumeBulletIdx % RESUME_BULLET_EXAMPLES.length];
      var resumeResearchIdx = d.resumeResearchIdx || 0;
      var resumeResearchCard = RESUME_RESEARCH_CARDS[resumeResearchIdx % RESUME_RESEARCH_CARDS.length];
      var resumePlanIdx = d.resumePlanIdx || 0;
      var resumePlanPrompt = RESUME_PLAN_PROMPTS[resumePlanIdx % RESUME_PLAN_PROMPTS.length];
      var resumePlanNote = d.resumePlanNote || '';
      var resumePlanMsg = d.resumePlanMsg || '';
      var resumeRole = d.resumeRole || 'entry-level job, volunteer role, internship, or program';
      var resumeAction = d.resumeAction || '';
      var resumeContext = d.resumeContext || '';
      var resumeSkill = d.resumeSkill || '';
      var resumeResult = d.resumeResult || '';
      var resumeBulletPreview = (resumeAction.trim() || 'Supported') + ' ' + (resumeContext.trim() || 'a real task') + (resumeSkill.trim() ? ' using ' + resumeSkill.trim() : '') + (resumeResult.trim() ? ' to ' + resumeResult.trim() : '') + '.';
      var resumeBulletMsg = d.resumeBulletMsg || '';

      function setResumeCheck(id, checked) {
        var next = Object.assign({}, resumeChecklist);
        next[id] = checked;
        upd('resumeChecklist', next);
        if (RESUME_CHECKS.every(function(step) { return !!next[step.id]; })) checkBadge('resumeReady');
      }

      function answerResumeScenario(choice) {
        var correct = choice === resumeCurrentScenario.best;
        var action = RESUME_ACTIONS.find(function(a) { return a.id === resumeCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          resumeScenarioChoice: choice,
          resumeScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : resumeCurrentScenario.best) + '. ') + resumeCurrentScenario.explain,
          resumeScenarioScore: resumeScenarioScore + (correct ? 1 : 0)
        });
        if (correct && resumeScenarioScore + 1 >= 3) checkBadge('bulletBuilder');
      }

      // PORTFOLIO & PROOF LOCKER STATE
      var proofChecklist = d.proofChecklist || {};
      var proofDone = PROOF_CHECKS.filter(function(step) { return !!proofChecklist[step.id]; }).length;
      var proofScenarioIdx = d.proofScenarioIdx || 0;
      var proofScenarioChoice = d.proofScenarioChoice || '';
      var proofScenarioFb = d.proofScenarioFb || '';
      var proofScenarioScore = d.proofScenarioScore || 0;
      var proofCurrentScenario = PROOF_SCENARIOS[proofScenarioIdx % PROOF_SCENARIOS.length];
      var proofTypeIdx = d.proofTypeIdx || 0;
      var proofTypeCard = PROOF_TYPE_CARDS[proofTypeIdx % PROOF_TYPE_CARDS.length];
      var proofQualityIdx = d.proofQualityIdx || 0;
      var proofQualityCard = PROOF_QUALITY_CARDS[proofQualityIdx % PROOF_QUALITY_CARDS.length];
      var proofShareIdx = d.proofShareIdx || 0;
      var proofShareCard = PROOF_SHARE_LEVELS[proofShareIdx % PROOF_SHARE_LEVELS.length];
      var proofPlanIdx = d.proofPlanIdx || 0;
      var proofPlanPrompt = PROOF_PLAN_PROMPTS[proofPlanIdx % PROOF_PLAN_PROMPTS.length];
      var proofPlanNote = d.proofPlanNote || '';
      var proofPlanMsg = d.proofPlanMsg || '';
      var proofItemType = d.proofItemType || 'project sample';
      var proofItemTitle = d.proofItemTitle || '';
      var proofItemSkill = d.proofItemSkill || '';
      var proofItemEvidence = d.proofItemEvidence || '';
      var proofItemShare = d.proofItemShare || 'limited link';
      var proofItemPreview = (proofItemTitle.trim() || 'Untitled proof item') + ' - ' + (proofItemType.trim() || 'proof') + ' showing ' + (proofItemSkill.trim() || 'a real skill') + '. Share level: ' + (proofItemShare.trim() || 'limited') + '.';
      var proofItemMsg = d.proofItemMsg || '';

      function setProofCheck(id, checked) {
        var next = Object.assign({}, proofChecklist);
        next[id] = checked;
        upd('proofChecklist', next);
        if (PROOF_CHECKS.every(function(step) { return !!next[step.id]; })) checkBadge('proofLockerReady');
      }

      function answerProofScenario(choice) {
        var correct = choice === proofCurrentScenario.best;
        var action = PROOF_ACTIONS.find(function(a) { return a.id === proofCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          proofScenarioChoice: choice,
          proofScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : proofCurrentScenario.best) + '. ') + proofCurrentScenario.explain,
          proofScenarioScore: proofScenarioScore + (correct ? 1 : 0)
        });
        if (correct && proofScenarioScore + 1 >= 3) checkBadge('portfolioCurator');
      }

      // INTERVIEW PRACTICE STUDIO STATE
      var interviewChecklist = d.interviewChecklist || {};
      var interviewDone = INTERVIEW_CHECKS.filter(function(step) { return !!interviewChecklist[step.id]; }).length;
      var interviewScenarioIdx = d.interviewScenarioIdx || 0;
      var interviewScenarioChoice = d.interviewScenarioChoice || '';
      var interviewScenarioFb = d.interviewScenarioFb || '';
      var interviewScenarioScore = d.interviewScenarioScore || 0;
      var interviewCurrentScenario = INTERVIEW_SCENARIOS[interviewScenarioIdx % INTERVIEW_SCENARIOS.length];
      var interviewRoleIdx = d.interviewRoleIdx || 0;
      var interviewRole = INTERVIEW_ROLES[interviewRoleIdx % INTERVIEW_ROLES.length];
      var interviewQuestionIdx = d.interviewQuestionIdx || 0;
      var interviewQuestion = INTERVIEW_QUESTIONS[interviewQuestionIdx % INTERVIEW_QUESTIONS.length];
      var interviewRubricIdx = d.interviewRubricIdx || 0;
      var interviewRubricCard = INTERVIEW_RUBRIC_CARDS[interviewRubricIdx % INTERVIEW_RUBRIC_CARDS.length];
      var interviewReflectionIdx = d.interviewReflectionIdx || 0;
      var interviewReflectionPrompt = INTERVIEW_REFLECTION_PROMPTS[interviewReflectionIdx % INTERVIEW_REFLECTION_PROMPTS.length];
      var interviewReflectionNote = d.interviewReflectionNote || '';
      var interviewReflectionMsg = d.interviewReflectionMsg || '';
      var interviewMode = d.interviewMode || 'guided';
      var interviewHintsOn = d.interviewHintsOn !== false;
      var interviewAutoRead = !!d.interviewAutoRead;
      var interviewInput = d.interviewInput || '';
      var interviewChatHistory = Array.isArray(d.interviewChatHistory) ? d.interviewChatHistory : [];
      var interviewDisplayHistory = interviewChatHistory.length ? interviewChatHistory : [{ role: 'interviewer', speaker: interviewRole.interviewer, text: interviewRole.opening }];
      var interviewSuggestions = Array.isArray(d.interviewSuggestions) && d.interviewSuggestions.length ? d.interviewSuggestions : INTERVIEW_SUGGESTIONS.slice(0, 4);
      var interviewLoading = !!d.interviewLoading;
      var interviewFeedback = d.interviewFeedback || '';
      var interviewScore = d.interviewScore || 0;
      var interviewSparkMsg = d.interviewSparkMsg || '';
      var interviewTranscriptMsg = d.interviewTranscriptMsg || '';
      var interviewStarSituation = d.interviewStarSituation || '';
      var interviewStarTask = d.interviewStarTask || '';
      var interviewStarAction = d.interviewStarAction || '';
      var interviewStarResult = d.interviewStarResult || '';
      var interviewStarMsg = d.interviewStarMsg || '';
      var interviewStarPreview = 'Situation: ' + (interviewStarSituation.trim() || 'the context') + ' Task: ' + (interviewStarTask.trim() || 'what needed to happen') + ' Action: ' + (interviewStarAction.trim() || 'what I did') + ' Result: ' + (interviewStarResult.trim() || 'what changed or what I learned') + '.';
      var interviewPlanIdx = d.interviewPlanIdx || 0;
      var interviewPracticePlan = INTERVIEW_PLAN_TEMPLATES[interviewPlanIdx % INTERVIEW_PLAN_TEMPLATES.length];
      var interviewPlanMinutes = Number(d.interviewPlanMinutes || interviewPracticePlan.minutes || 5);
      var interviewPlanGoal = d.interviewPlanGoal || interviewPracticePlan.goal;
      var interviewPlanChecklist = d.interviewPlanChecklist || {};
      var interviewPlanDone = INTERVIEW_PLAN_STEPS.filter(function(step) { return !!interviewPlanChecklist[step.id]; }).length;
      var interviewPlanNote = d.interviewPlanNote || '';
      var interviewPlanMsg = d.interviewPlanMsg || '';
      var interviewPlanSavedAt = d.interviewPlanSavedAt || 0;
      var interviewPlanLog = Array.isArray(d.interviewPlanLog) ? d.interviewPlanLog : [];
      var interviewPlanProgress = Math.round(interviewPlanDone / INTERVIEW_PLAN_STEPS.length * 100);
      var interviewSavedTranscript = d.interviewSavedTranscript || '';
      var interviewSavedStarAnswer = d.interviewSavedStarAnswer || '';
      var interviewFollowUpMessage = d.interviewFollowUpMessage || 'Thank you for meeting with me. I appreciated learning about the role. I am especially interested in... Please let me know if you need anything else from me.';
      var interviewPacketMsg = d.interviewPacketMsg || '';
      var interviewPacketSavedAt = d.interviewPacketSavedAt || 0;
      var interviewRehearsalConfidence = Number(d.interviewRehearsalConfidence || 3);
      var interviewRehearsalTargetId = d.interviewRehearsalTargetId || '60';
      var interviewRehearsalTarget = INTERVIEW_REHEARSAL_TARGETS.find(function(target) { return target.id === interviewRehearsalTargetId; }) || INTERVIEW_REHEARSAL_TARGETS[1];
      var interviewRehearsalScriptIdx = d.interviewRehearsalScriptIdx || 0;
      var interviewRehearsalScript = INTERVIEW_REHEARSAL_SCRIPTS[interviewRehearsalScriptIdx % INTERVIEW_REHEARSAL_SCRIPTS.length];
      var interviewRehearsalNote = d.interviewRehearsalNote || '';
      var interviewRehearsalMsg = d.interviewRehearsalMsg || '';
      var interviewRehearsalSavedAt = d.interviewRehearsalSavedAt || 0;
      var interviewProofMatcherIdx = d.interviewProofMatcherIdx || 0;
      var interviewProofMatcher = INTERVIEW_PROOF_MATCHERS[interviewProofMatcherIdx % INTERVIEW_PROOF_MATCHERS.length];
      var interviewProofNote = d.interviewProofNote || '';
      var interviewSavedProofCue = d.interviewSavedProofCue || '';
      var interviewProofCueMsg = d.interviewProofCueMsg || '';
      var interviewProofCueSavedAt = d.interviewProofCueSavedAt || 0;
      var interviewProofCuePreview = interviewProofMatcher.answerStem + ' Proof I can use: ' + (interviewProofNote.trim() || interviewProofMatcher.proofPrompt);
      var interviewDayChecklist = d.interviewDayChecklist || {};
      var interviewDayDone = INTERVIEW_DAY_CHECKS.filter(function(step) { return !!interviewDayChecklist[step.id]; }).length;
      var interviewArrivalPlan = d.interviewArrivalPlan || '';
      var interviewMaterialsNote = d.interviewMaterialsNote || '';
      var interviewBackupPlan = d.interviewBackupPlan || '';
      var interviewDayMsg = d.interviewDayMsg || '';
      var interviewDaySavedAt = d.interviewDaySavedAt || 0;
      var interviewPacketPreview = buildInterviewPrepPacket();

      function setInterviewCheck(id, checked) {
        var next = Object.assign({}, interviewChecklist);
        next[id] = checked;
        upd('interviewChecklist', next);
        if (INTERVIEW_CHECKS.every(function(step) { return !!next[step.id]; })) checkBadge('interviewReady');
      }

      function answerInterviewScenario(choice) {
        var correct = choice === interviewCurrentScenario.best;
        var action = INTERVIEW_ACTIONS.find(function(a) { return a.id === interviewCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          interviewScenarioChoice: choice,
          interviewScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : interviewCurrentScenario.best) + '. ') + interviewCurrentScenario.explain,
          interviewScenarioScore: interviewScenarioScore + (correct ? 1 : 0)
        });
        if (correct && interviewScenarioScore + 1 >= 3) checkBadge('mockInterviewPro');
      }

      function speakInterviewText(text) {
        if (!text) return;
        announceToSR('Reading interview text');
        if (callTTS && typeof callTTS === 'function') {
          try { callTTS(text, { voice: 'Kore', source: 'lifeSkillsInterviewStudio' }); return; } catch(e) {}
        }
        try {
          if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
            window.speechSynthesis.cancel();
            var utter = new SpeechSynthesisUtterance(text);
            utter.rate = 0.95;
            utter.volume = 0.85;
            window.speechSynthesis.speak(utter);
          }
        } catch(e2) {}
      }

      function localInterviewCoachReply(studentText) {
        var trimmed = (studentText || '').trim();
        var mentionsEvidence = /example|project|proof|resume|volunteer|worked|helped|organized|created|learned|result/i.test(trimmed);
        var reply = mentionsEvidence
          ? 'Thank you. I heard a real example in that answer. Can you add one result or lesson learned so I understand the impact?'
          : 'Thank you. Can you connect that answer to one resume bullet or proof locker item so I can see the evidence behind it?';
        var feedback = mentionsEvidence
          ? 'Good start: you used evidence. Next step: add the result, number, outcome, or learning.'
          : 'Try adding one concrete example. A STAR answer is easier to follow when it includes action and result.';
        return { reply: reply, feedback: feedback, score: mentionsEvidence ? 3 : 2, suggestions: ['The result was...', 'One example is...', 'I learned that...'] };
      }

      function parseInterviewAIResponse(res, fallback) {
        var raw = typeof res === 'object' && res && res.text ? res.text : String(res || '');
        raw = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        try { return Object.assign({}, fallback, JSON.parse(raw)); } catch(e) {}
        var start = raw.indexOf('{');
        var end = raw.lastIndexOf('}');
        if (start >= 0 && end > start) {
          try { return Object.assign({}, fallback, JSON.parse(raw.slice(start, end + 1))); } catch(e2) {}
        }
        return Object.assign({}, fallback, { reply: raw || fallback.reply });
      }

      function sendInterviewMessage(overrideText) {
        var textToSend = (overrideText || interviewInput || '').trim();
        if (!textToSend || interviewLoading) return;
        var studentMsg = { role: 'student', speaker: 'You', text: textToSend };
        var nextHistory = interviewChatHistory.concat([studentMsg]);
        var fallback = localInterviewCoachReply(textToSend);
        updMulti({
          interviewChatHistory: nextHistory,
          interviewInput: '',
          interviewLoading: !!callGemini,
          interviewFeedback: '',
          interviewSparkMsg: ''
        });
        if (!callGemini) {
          var localMsg = { role: 'interviewer', speaker: interviewRole.interviewer, text: fallback.reply, feedback: fallback.feedback };
          updMulti({
            interviewChatHistory: nextHistory.concat([localMsg]),
            interviewFeedback: fallback.feedback,
            interviewScore: Math.max(interviewScore, fallback.score || 0),
            interviewSuggestions: fallback.suggestions,
            interviewLoading: false
          });
          if (interviewAutoRead) speakInterviewText(fallback.reply);
          if (nextHistory.length >= 5) checkBadge('mockInterviewPro');
          return;
        }
        var historyStr = nextHistory.slice(-8).map(function(m) { return (m.role === 'student' ? 'Student' : interviewRole.interviewer) + ': ' + m.text; }).join('\n');
        var prompt = [
          'You are a supportive mock job interviewer modeled after the app persona interview pattern.',
          'Interview role: ' + interviewRole.title + '. Interviewer: ' + interviewRole.interviewer + '. Tone: ' + interviewRole.tone + '.',
          'Focus areas: ' + interviewRole.focus + '.',
          'Current interview question: ' + interviewQuestion.q,
          'Recent transcript:',
          historyStr,
          'Respond as the interviewer with one concise follow-up question or comment, then give coaching feedback.',
          'Be accessible: allow pauses, clarifying questions, notes, and accommodation scripts. Do not shame the student.',
          'Return JSON only: {"reply":"interviewer response","feedback":"one praise plus one next step","score":0-4,"suggestions":["short response stem 1","short response stem 2","short response stem 3"]}.'
        ].join('\n');
        callGemini(prompt).then(function(res) {
          var parsed = parseInterviewAIResponse(res, fallback);
          var replyText = String(parsed.reply || fallback.reply);
          var feedbackText = String(parsed.feedback || fallback.feedback);
          var suggestionList = Array.isArray(parsed.suggestions) && parsed.suggestions.length ? parsed.suggestions.slice(0, 4) : fallback.suggestions;
          var interviewerMsg = { role: 'interviewer', speaker: interviewRole.interviewer, text: replyText, feedback: feedbackText };
          updMulti({
            interviewChatHistory: nextHistory.concat([interviewerMsg]),
            interviewFeedback: feedbackText,
            interviewScore: Math.max(interviewScore, Number(parsed.score) || fallback.score || 0),
            interviewSuggestions: suggestionList,
            interviewLoading: false
          });
          if (interviewAutoRead) speakInterviewText(replyText);
          if (nextHistory.length >= 5) checkBadge('mockInterviewPro');
        }).catch(function() {
          var fallbackMsg = { role: 'interviewer', speaker: interviewRole.interviewer, text: fallback.reply, feedback: fallback.feedback };
          updMulti({
            interviewChatHistory: nextHistory.concat([fallbackMsg]),
            interviewFeedback: fallback.feedback,
            interviewSuggestions: fallback.suggestions,
            interviewLoading: false
          });
        });
      }

      function sparkInterviewTopic() {
        var spark = 'Try answering "' + interviewQuestion.q + '" with this frame: ' + interviewQuestion.frame;
        upd('interviewSparkMsg', spark);
        announceToSR('Interview coaching spark ready');
      }

      function saveInterviewTranscript() {
        var lines = interviewDisplayHistory.map(function(m) { return (m.role === 'student' ? 'Student' : (m.speaker || interviewRole.interviewer)) + ': ' + m.text; });
        updMulti({ interviewTranscriptMsg: 'Transcript saved with ' + lines.length + ' turns.', interviewSavedTranscript: lines.join('\n\n'), interviewTranscriptSaved: Date.now() });
        checkBadge('interviewReady');
        announceToSR('Interview transcript saved');
      }

      function resetInterviewChat() {
        updMulti({ interviewChatHistory: [], interviewInput: '', interviewFeedback: '', interviewSparkMsg: '', interviewTranscriptMsg: '', interviewSuggestions: INTERVIEW_SUGGESTIONS.slice(0, 4), interviewLoading: false });
        announceToSR('Interview chat reset');
      }

      function saveInterviewStarAnswer() {
        if (!interviewStarAction.trim() || !interviewStarResult.trim()) {
          upd('interviewStarMsg', 'Add at least an action and result before saving the STAR answer.');
          return;
        }
        updMulti({ interviewStarMsg: 'STAR answer saved: ' + interviewStarPreview, interviewSavedStarAnswer: interviewStarPreview, interviewStarSaved: Date.now() });
        checkBadge('mockInterviewPro');
        announceToSR('STAR answer saved');
      }

      function selectInterviewPracticePlan(idx) {
        var plan = INTERVIEW_PLAN_TEMPLATES[idx % INTERVIEW_PLAN_TEMPLATES.length];
        updMulti({
          interviewPlanIdx: idx,
          interviewPlanMinutes: plan.minutes,
          interviewPlanGoal: plan.goal,
          interviewPlanMsg: '',
          interviewPlanNote: ''
        });
        announceToSR('Interview practice plan selected');
      }

      function setInterviewPlanStep(id, checked) {
        var next = Object.assign({}, interviewPlanChecklist);
        next[id] = checked;
        upd('interviewPlanChecklist', next);
        if (INTERVIEW_PLAN_STEPS.every(function(step) { return !!next[step.id]; })) checkBadge('interviewPracticePlan');
      }

      function buildInterviewPlanFromFeedback() {
        var goal = interviewFeedback || interviewRubricCard.coach || interviewReflectionPrompt || interviewPracticePlan.goal;
        updMulti({
          interviewPlanGoal: 'This week I will practice: ' + goal.replace(/^Coach feedback:\s*/i, ''),
          interviewPlanNote: 'Use one saved transcript, STAR answer, or proof item during the next practice.',
          interviewPlanMsg: 'Practice plan updated from the current coaching feedback.'
        });
        announceToSR('Interview practice plan updated from coaching feedback');
      }

      function saveInterviewPracticePlan() {
        var goal = (interviewPlanGoal || '').trim();
        if (!goal) {
          upd('interviewPlanMsg', 'Write one practice goal before saving the plan.');
          return;
        }
        var entry = {
          at: Date.now(),
          title: interviewPracticePlan.title,
          minutes: interviewPlanMinutes,
          goal: goal,
          done: interviewPlanDone,
          total: INTERVIEW_PLAN_STEPS.length
        };
        updMulti({
          interviewPlanMsg: 'Practice plan saved: ' + interviewPracticePlan.title + ' for ' + interviewPlanMinutes + ' minutes.',
          interviewPlanSavedAt: entry.at,
          interviewPlanLog: [entry].concat(interviewPlanLog).slice(0, 5)
        });
        checkBadge('interviewPracticePlan');
        announceToSR('Interview practice plan saved');
      }

      function resetInterviewPracticePlan() {
        updMulti({
          interviewPlanChecklist: {},
          interviewPlanNote: '',
          interviewPlanMsg: 'Practice progress reset. The saved goal is still available.'
        });
        announceToSR('Interview practice plan progress reset');
      }

      function saveInterviewRehearsalNote() {
        if (!interviewRehearsalNote.trim()) {
          upd('interviewRehearsalMsg', 'Write one rehearsal note, reset idea, or support reminder first.');
          return;
        }
        updMulti({ interviewRehearsalMsg: 'Rehearsal note saved: ' + interviewRehearsalNote.trim(), interviewRehearsalSavedAt: Date.now() });
        checkBadge('interviewRehearsalReady');
        announceToSR('Interview rehearsal note saved');
      }

      function useInterviewRehearsalScript() {
        upd('interviewInput', interviewRehearsalScript.script);
        announceToSR('Interview rehearsal script added to chat answer');
      }

      function buildInterviewProofCueText() {
        return [
          interviewProofMatcher.title + ' proof cue',
          'Question: ' + interviewProofMatcher.question,
          'Skill: ' + interviewProofMatcher.skill,
          'Proof: ' + (interviewProofNote.trim() || interviewProofMatcher.proofPrompt),
          'Answer stem: ' + interviewProofMatcher.answerStem,
          'Safe share reminder: ' + interviewProofMatcher.safeShare
        ].join('\n');
      }

      function saveInterviewProofCue() {
        if (!interviewProofNote.trim()) {
          upd('interviewProofCueMsg', 'Write one real proof item or example first.');
          return;
        }
        var cue = buildInterviewProofCueText();
        updMulti({ interviewSavedProofCue: cue, interviewProofCueMsg: 'Proof cue saved for ' + interviewProofMatcher.title + '.', interviewProofCueSavedAt: Date.now() });
        checkBadge('interviewEvidenceMatcher');
        announceToSR('Interview proof cue saved');
      }

      function useInterviewProofCueInChat() {
        upd('interviewInput', interviewProofCuePreview);
        announceToSR('Interview proof cue added to chat answer');
      }

      function setInterviewDayCheck(id, checked) {
        var next = Object.assign({}, interviewDayChecklist);
        next[id] = checked;
        upd('interviewDayChecklist', next);
        if (INTERVIEW_DAY_CHECKS.every(function(step) { return !!next[step.id]; })) checkBadge('interviewDayReady');
      }

      function saveInterviewDayRunSheet() {
        if (!interviewArrivalPlan.trim() && !interviewMaterialsNote.trim() && !interviewBackupPlan.trim()) {
          upd('interviewDayMsg', 'Add one arrival, materials, or backup detail before saving the run sheet.');
          return;
        }
        updMulti({ interviewDayMsg: 'Interview day run sheet saved.', interviewDaySavedAt: Date.now() });
        checkBadge('interviewDayReady');
        announceToSR('Interview day run sheet saved');
      }

      function escapeInterviewPacketHtml(text) {
        return String(text || '').replace(/[&<>"']/g, function(ch) {
          return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
      }

      function buildInterviewPrepPacket() {
        var checkedPrep = INTERVIEW_CHECKS.filter(function(step) { return !!interviewChecklist[step.id]; }).map(function(step) { return '- ' + step.title + ': ' + step.action; });
        var checkedPractice = INTERVIEW_PLAN_STEPS.filter(function(step) { return !!interviewPlanChecklist[step.id]; }).map(function(step) { return '- ' + step.label + ': ' + step.detail; });
        var checkedDay = INTERVIEW_DAY_CHECKS.filter(function(step) { return !!interviewDayChecklist[step.id]; }).map(function(step) { return '- ' + step.phase + ': ' + step.title + ' - ' + step.detail; });
        var latestPlan = interviewPlanLog.length ? interviewPlanLog[0] : null;
        var planTitle = latestPlan ? latestPlan.title : interviewPracticePlan.title;
        var planGoal = latestPlan ? latestPlan.goal : interviewPlanGoal;
        var planMinutes = latestPlan ? latestPlan.minutes : interviewPlanMinutes;
        var starAnswer = (interviewSavedStarAnswer || ((interviewStarAction.trim() || interviewStarResult.trim()) ? interviewStarPreview : '')).trim();
        var transcript = (interviewSavedTranscript || interviewDisplayHistory.map(function(m) { return (m.role === 'student' ? 'Student' : (m.speaker || interviewRole.interviewer)) + ': ' + m.text; }).join('\n\n')).trim();
        var reflection = (interviewReflectionNote || interviewReflectionPrompt || '').trim();
        var followUp = (interviewFollowUpMessage || '').trim();
        return [
          'Interview Prep Packet',
          '',
          'Role target',
          'Role: ' + interviewRole.title,
          'Interviewer style: ' + interviewRole.interviewer + ' - ' + interviewRole.tone,
          'Current practice question: ' + interviewQuestion.q,
          'Proof cue: ' + interviewQuestion.proof,
          '',
          'Weekly practice plan',
          'Plan: ' + planTitle,
          'Minutes: ' + planMinutes,
          'Goal: ' + (planGoal || 'Choose one small interview practice goal.'),
          'Note: ' + (interviewPlanNote || 'No extra note yet.'),
          '',
          'Checked prep habits',
          checkedPrep.length ? checkedPrep.join('\n') : '- No prep habits checked yet.',
          '',
          'Daily practice steps completed',
          checkedPractice.length ? checkedPractice.join('\n') : '- No daily practice steps checked yet.',
          '',
          'Question-to-proof cue',
          interviewSavedProofCue || (interviewProofNote.trim() ? buildInterviewProofCueText() : 'No proof cue saved yet.'),
          '',
          'Interview day run sheet',
          checkedDay.length ? checkedDay.join('\n') : '- No interview day checklist items checked yet.',
          'Arrival/tech plan: ' + (interviewArrivalPlan || 'No arrival or tech plan saved yet.'),
          'Materials note: ' + (interviewMaterialsNote || 'No materials note saved yet.'),
          'Backup/access plan: ' + (interviewBackupPlan || 'No backup or access plan saved yet.'),
          '',
          'Calm rehearsal plan',
          'Confidence: ' + interviewRehearsalConfidence + '/5',
          'Answer target: ' + interviewRehearsalTarget.label + ' - ' + interviewRehearsalTarget.cue,
          'Support script: ' + interviewRehearsalScript.title + ': ' + interviewRehearsalScript.script,
          'Rehearsal note: ' + (interviewRehearsalNote || 'No rehearsal note saved yet.'),
          '',
          'STAR answer',
          starAnswer || 'No STAR answer saved yet. Add at least an action and result in the STAR builder.',
          '',
          'Coach feedback',
          interviewFeedback || interviewRubricCard.coach || 'Use the rubric cards to choose one next improvement.',
          '',
          'Reflection',
          reflection || 'No reflection saved yet.',
          '',
          'Follow-up message',
          followUp || 'Write one thank-you or check-in message.',
          '',
          'Transcript',
          transcript || 'No transcript saved yet.',
          '',
          'Practice note',
          'This packet is for rehearsal and self-advocacy. Bring truthful examples, ask clarifying questions when needed, and use appropriate access supports.'
        ].join('\n');
      }

      function saveInterviewPrepPacket() {
        var packet = buildInterviewPrepPacket();
        updMulti({ interviewSavedPacket: packet, interviewPacketMsg: 'Interview prep packet saved.', interviewPacketSavedAt: Date.now() });
        checkBadge('interviewPacketBuilder');
        announceToSR('Interview prep packet saved');
      }

      function copyInterviewPrepPacket() {
        var packet = buildInterviewPrepPacket();
        updMulti({ interviewSavedPacket: packet, interviewPacketMsg: 'Interview prep packet ready to copy.', interviewPacketSavedAt: Date.now() });
        checkBadge('interviewPacketBuilder');
        try {
          if (window.navigator && window.navigator.clipboard && window.navigator.clipboard.writeText) {
            window.navigator.clipboard.writeText(packet).then(function() {
              updMulti({ interviewSavedPacket: packet, interviewPacketMsg: 'Interview prep packet copied to clipboard.', interviewPacketSavedAt: Date.now() });
              announceToSR('Interview prep packet copied');
            }).catch(function() {
              updMulti({ interviewSavedPacket: packet, interviewPacketMsg: 'Clipboard was blocked. Select the packet preview text to copy it.', interviewPacketSavedAt: Date.now() });
              announceToSR('Clipboard blocked');
            });
            return;
          }
        } catch(e) {}
        updMulti({ interviewSavedPacket: packet, interviewPacketMsg: 'Clipboard unavailable. Select the packet preview text to copy it.', interviewPacketSavedAt: Date.now() });
        announceToSR('Clipboard unavailable');
      }

      function downloadInterviewPrepPacket() {
        var packet = buildInterviewPrepPacket();
        try {
          var blob = new Blob([packet], { type: 'text/plain;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'interview-prep-packet.txt';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(function() { URL.revokeObjectURL(url); }, 500);
          updMulti({ interviewSavedPacket: packet, interviewPacketMsg: 'Interview prep packet downloaded as a text file.', interviewPacketSavedAt: Date.now() });
          checkBadge('interviewPacketBuilder');
          announceToSR('Interview prep packet downloaded');
        } catch(e) {
          updMulti({ interviewSavedPacket: packet, interviewPacketMsg: 'Download was blocked. Use Copy packet or the preview text instead.', interviewPacketSavedAt: Date.now() });
          announceToSR('Download blocked');
        }
      }

      function openInterviewPacketPrintView() {
        var packet = buildInterviewPrepPacket();
        try {
          var printWin = window.open('', '_blank');
          if (!printWin || !printWin.document) throw new Error('print window blocked');
          printWin.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Interview Prep Packet</title><style>body{font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;margin:32px;}pre{white-space:pre-wrap;font:14px/1.5 Arial,sans-serif;}button{padding:10px 14px;border:1px solid #334155;border-radius:8px;background:#0f172a;color:white;font-weight:700;}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print packet</button><pre>' + escapeInterviewPacketHtml(packet) + '</pre></body></html>');
          printWin.document.close();
          updMulti({ interviewSavedPacket: packet, interviewPacketMsg: 'Print-friendly packet opened.', interviewPacketSavedAt: Date.now() });
          checkBadge('interviewPacketBuilder');
          announceToSR('Print-friendly interview packet opened');
        } catch(e) {
          updMulti({ interviewSavedPacket: packet, interviewPacketMsg: 'Print view was blocked. Download or copy the packet instead.', interviewPacketSavedAt: Date.now() });
          announceToSR('Print view blocked');
        }
      }

      // COMMUNICATION & CONFLICT STATE
      var communicationChecklist = d.communicationChecklist || {};
      var communicationDone = COMMUNICATION_CHECKS.filter(function(step) { return !!communicationChecklist[step.id]; }).length;
      var communicationScenarioIdx = d.communicationScenarioIdx || 0;
      var communicationScenarioChoice = d.communicationScenarioChoice || '';
      var communicationScenarioFb = d.communicationScenarioFb || '';
      var communicationScenarioScore = d.communicationScenarioScore || 0;
      var communicationCurrentScenario = COMMUNICATION_SCENARIOS[communicationScenarioIdx % COMMUNICATION_SCENARIOS.length];
      var messageToneIdx = d.messageToneIdx || 0;
      var messageToneCard = MESSAGE_TONE_CARDS[messageToneIdx % MESSAGE_TONE_CARDS.length];
      var boundaryRepairIdx = d.boundaryRepairIdx || 0;
      var boundaryRepairCard = BOUNDARY_REPAIR_CARDS[boundaryRepairIdx % BOUNDARY_REPAIR_CARDS.length];
      var communicationPlanIdx = d.communicationPlanIdx || 0;
      var communicationPlanPrompt = COMMUNICATION_PLAN_PROMPTS[communicationPlanIdx % COMMUNICATION_PLAN_PROMPTS.length];
      var communicationPlanNote = d.communicationPlanNote || '';
      var communicationPlanMsg = d.communicationPlanMsg || '';

      function setCommunicationCheck(id, checked) {
        var next = Object.assign({}, communicationChecklist);
        next[id] = checked;
        upd('communicationChecklist', next);
        if (COMMUNICATION_CHECKS.every(function(step) { return !!next[step.id]; })) checkBadge('communicationReady');
      }

      function answerCommunicationScenario(choice) {
        var correct = choice === communicationCurrentScenario.best;
        var action = COMMUNICATION_ACTIONS.find(function(a) { return a.id === communicationCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          communicationScenarioChoice: choice,
          communicationScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : communicationCurrentScenario.best) + '. ') + communicationCurrentScenario.explain,
          communicationScenarioScore: communicationScenarioScore + (correct ? 1 : 0)
        });
        if (correct && communicationScenarioScore + 1 >= 3) checkBadge('conflictNavigator');
      }

      // TIME MANAGEMENT & PLANNING STATE
      var timeChecklist = d.timeChecklist || {};
      var timeDone = TIME_CHECKS.filter(function(step) { return !!timeChecklist[step.id]; }).length;
      var timeScenarioIdx = d.timeScenarioIdx || 0;
      var timeScenarioChoice = d.timeScenarioChoice || '';
      var timeScenarioFb = d.timeScenarioFb || '';
      var timeScenarioScore = d.timeScenarioScore || 0;
      var timeCurrentScenario = TIME_SCENARIOS[timeScenarioIdx % TIME_SCENARIOS.length];
      var priorityCardIdx = d.priorityCardIdx || 0;
      var priorityCard = PRIORITY_CARDS[priorityCardIdx % PRIORITY_CARDS.length];
      var timeToolIdx = d.timeToolIdx || 0;
      var timeToolCard = TIME_TOOL_CARDS[timeToolIdx % TIME_TOOL_CARDS.length];
      var timePlanIdx = d.timePlanIdx || 0;
      var timePlanPrompt = TIME_PLAN_PROMPTS[timePlanIdx % TIME_PLAN_PROMPTS.length];
      var timePlanNote = d.timePlanNote || '';
      var timePlanMsg = d.timePlanMsg || '';

      function setTimeCheck(id, checked) {
        var next = Object.assign({}, timeChecklist);
        next[id] = checked;
        upd('timeChecklist', next);
        if (TIME_CHECKS.every(function(step) { return !!next[step.id]; })) checkBadge('timePlanner');
      }

      function answerTimeScenario(choice) {
        var correct = choice === timeCurrentScenario.best;
        var action = TIME_ACTIONS.find(function(a) { return a.id === timeCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          timeScenarioChoice: choice,
          timeScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : timeCurrentScenario.best) + '. ') + timeCurrentScenario.explain,
          timeScenarioScore: timeScenarioScore + (correct ? 1 : 0)
        });
        if (correct && timeScenarioScore + 1 >= 3) checkBadge('taskNavigator');
      }

      // FOOD CONFIDENCE STATE
      var foodConfidenceChecklist = d.foodConfidenceChecklist || {};
      var foodConfidenceDone = FOOD_CONFIDENCE_CHECKS.filter(function(step) { return !!foodConfidenceChecklist[step.id]; }).length;
      var foodConfidenceScenarioIdx = d.foodConfidenceScenarioIdx || 0;
      var foodConfidenceScenarioChoice = d.foodConfidenceScenarioChoice || '';
      var foodConfidenceScenarioFb = d.foodConfidenceScenarioFb || '';
      var foodConfidenceScenarioScore = d.foodConfidenceScenarioScore || 0;
      var foodConfidenceCurrentScenario = FOOD_CONFIDENCE_SCENARIOS[foodConfidenceScenarioIdx % FOOD_CONFIDENCE_SCENARIOS.length];
      var foodStorageIdx = d.foodStorageIdx || 0;
      var foodStorageCard = FOOD_STORAGE_CARDS[foodStorageIdx % FOOD_STORAGE_CARDS.length];
      var foodBaseIdx = d.foodBaseIdx || 0;
      var foodProteinIdx = d.foodProteinIdx || 0;
      var foodProduceIdx = d.foodProduceIdx || 0;
      var foodFlavorIdx = d.foodFlavorIdx || 0;
      var foodBase = FOOD_MEAL_BASES[foodBaseIdx % FOOD_MEAL_BASES.length];
      var foodProtein = FOOD_MEAL_PROTEINS[foodProteinIdx % FOOD_MEAL_PROTEINS.length];
      var foodProduce = FOOD_MEAL_PRODUCE[foodProduceIdx % FOOD_MEAL_PRODUCE.length];
      var foodFlavor = FOOD_MEAL_FLAVORS[foodFlavorIdx % FOOD_MEAL_FLAVORS.length];
      var foodMealCost = foodBase.cost + foodProtein.cost + foodProduce.cost + foodFlavor.cost;
      var foodLabelIdx = d.foodLabelIdx || 0;
      var foodLabel = FOOD_LABEL_SAMPLES[foodLabelIdx % FOOD_LABEL_SAMPLES.length];
      var foodLabelAnswer = d.foodLabelAnswer || '';
      var foodLabelFb = d.foodLabelFb || '';

      function setFoodConfidenceCheck(id, checked) {
        var next = Object.assign({}, foodConfidenceChecklist);
        next[id] = checked;
        upd('foodConfidenceChecklist', next);
        if (FOOD_CONFIDENCE_CHECKS.every(function(step) { return !!next[step.id]; })) checkBadge('foodPlanner');
      }

      function answerFoodConfidenceScenario(choice) {
        var correct = choice === foodConfidenceCurrentScenario.best;
        var action = FOOD_CONFIDENCE_ACTIONS.find(function(a) { return a.id === foodConfidenceCurrentScenario.best; });
        stemBeep(correct);
        updMulti({
          foodConfidenceScenarioChoice: choice,
          foodConfidenceScenarioFb: (correct ? '\u2705 Good call: ' : '\uD83D\uDD0E Best next step: ' + (action ? action.label : foodConfidenceCurrentScenario.best) + '. ') + foodConfidenceCurrentScenario.explain,
          foodConfidenceScenarioScore: foodConfidenceScenarioScore + (correct ? 1 : 0)
        });
        if (correct && foodConfidenceScenarioScore + 1 >= 3) checkBadge('leftoverSafe');
      }

      function checkFoodLabelAnswer() {
        if (!foodLabelAnswer.trim()) return;
        var correct = foodLabelAnswer.trim().toLowerCase().replace(/[^a-z0-9]/g, '').indexOf(foodLabel.answer.toLowerCase().replace(/[^a-z0-9]/g, '')) >= 0;
        stemBeep(correct);
        updMulti({
          foodLabelFb: correct ? '\u2705 Correct. Labels help compare foods, but the whole meal matters too.' : '\uD83D\uDD0E Look for: ' + foodLabel.answer + '. Labels are comparison tools, not grades.',
          foodLabelAnswer: ''
        });
        if (correct) checkBadge('foodPlanner');
      }

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
          callGemini('Generate one life skills question for a ' + gradeBand + ' student about taxes, insurance, records and paperwork, transportation and navigation, job readiness and workplace basics, resume building and evidence bullets, portfolio proof organization and privacy, interview practice and STAR answers, communication and conflict, time management and planning, dental care, body care and ergonomics, sleep and energy routines, medication labels, appointments and self-advocacy, home safety, digital safety, food confidence, home repair, car maintenance, laundry science, or data literacy. Return JSON: {"q":"question","a":"short answer","h":"hint"}').then(function(res) {
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
          h('input', { type: 'range', min: min, max: max, step: step, value: value, onChange: function(e) { upd(key, parseFloat(e.target.value)); }, className: 'w-full h-1.5 rounded-full appearance-none cursor-pointer', style: { accentColor: '#0d9488' }, 'aria-valuetext': (fmt ? fmt(value) : String(value)), 'aria-label': label })
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
              h('h3', { className: 'text-base font-bold flex items-center gap-2' }, __alloT('stem.lifeskills.life_skills_lab', '\uD83E\uDDED Life Skills Lab')),
              h('p', { className: 'text-[11px] opacity-90' }, gradeText(gradeBand,
                'Learn about money, safety, and how things work!',
                'Essential knowledge: taxes, data analysis, home science',
                'Applied STEM: financial literacy, data analysis, engineering principles',
                'Adulting essentials: progressive taxation, actuarial science, thermodynamics, electrical engineering'))
            ),
            h('div', { className: 'flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg' },
              h('span', { className: 'text-xs' }, '\uD83C\uDFC6'),
              h('span', { className: 'text-xs font-bold' }, Object.keys(d.badges || {}).length + '/' + LS_BADGES.length)
            )
          )
        ),

        // Sub-tool tabs
        h('div', { className: 'flex flex-wrap gap-1.5', role: 'tablist', },
          SUBTOOLS.map(function(st) {
            var active = tab === st.id;
            return h('button', { key: st.id, onClick: function() { updMulti({ tab: st.id }); announceToSR('Switched to ' + st.label); },
              className: 'px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' + (active ? 'bg-teal-700 text-white shadow-md' : 'bg-white/70 text-slate-600 hover:bg-teal-50 border border-slate-400'),
              role: 'tab', 'aria-selected': active
            }, st.icon + ' ' + st.label);
          })
        ),

        // ═══ Topic-accent hero band per sub-tool ═══
        (function() {
          var TAB_META = {
            overview:   { accent: '#0f766e', soft: 'rgba(15,118,110,0.10)',  icon: '\uD83E\uDDED', title: __alloT('stem.lifeskills.start_here', 'Start Here'),              hint: __alloT('stem.lifeskills.choose_a_path', 'Choose a practical path, then jump into the first activity. This keeps Life Skills approachable while still letting students explore freely.') },
            paycheck:   { accent: '#0d9488', soft: 'rgba(13,148,136,0.10)', icon: '\uD83E\uDDFE', title: __alloT('stem.lifeskills.paycheck_tax_math', 'Paycheck + tax math'),     hint: __alloT('stem.lifeskills.federal_marginal_brackets_fica_cap_6_2', 'Federal marginal brackets, FICA cap (6.2% Social Security up to $168,600), state withholding. Effective rate \u2260 marginal rate \u2014 most students conflate them.') },
            data:       { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '\uD83D\uDCCA', title: __alloT('stem.lifeskills.data_literacy', 'Data literacy'),           hint: __alloT('stem.lifeskills.spot_check_claims_with_order_of_magnit', 'Spot-check claims with order-of-magnitude reasoning. Per-capita vs total. Mean vs median. Sample size and selection bias \u2014 the four most-misrepresented quantities in everyday news.') },
            decision:   { accent: '#a855f7', soft: 'rgba(168,85,247,0.10)', icon: '\uD83E\uDDE0', title: __alloT('stem.lifeskills.decision_frameworks', 'Decision frameworks'),     hint: __alloT('stem.lifeskills.pros_cons_opportunity_cost_reversibili', 'Pros/cons + opportunity cost + reversibility. Annie Duke\'s decision-quality model: "good decision" \u2260 "good outcome." Decide on process, not outcome.') },
            contract:   { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '\uD83D\uDCDD', title: __alloT('stem.lifeskills.contracts_agreements', 'Contracts + agreements'),  hint: __alloT('stem.lifeskills.read_the_whole_thing_before_signing_wa', 'Read the whole thing before signing. Watch for arbitration clauses, auto-renewal, early-termination fees, and limit-of-liability caps. "Click to agree" is a contract.') },
            records:    { accent: '#334155', soft: 'rgba(51,65,85,0.10)', icon: '\uD83D\uDCC1', title: __alloT('stem.lifeskills.records_paperwork', 'Records + paperwork'), hint: __alloT('stem.lifeskills.records_paperwork_hint', 'IDs, forms, receipts, health cards, deadlines, proof of payment, safe storage, and knowing when to ask before sharing or signing.') },
            transport:  { accent: '#0369a1', soft: 'rgba(3,105,161,0.10)', icon: '\uD83D\uDE8C', title: __alloT('stem.lifeskills.transportation_navigation', 'Transportation + navigation'), hint: __alloT('stem.lifeskills.transportation_navigation_hint', 'Route choices, stops, transfers, time buffers, fare/payment, accessibility, safer waiting, backup plans, and asking official or trusted help when a trip changes.') },
            workreadiness: { accent: '#4338ca', soft: 'rgba(67,56,202,0.10)', icon: '\uD83D\uDCBC', title: __alloT('stem.lifeskills.job_readiness', 'Job readiness + workplace basics'), hint: __alloT('stem.lifeskills.job_readiness_hint', 'Applications, resumes, availability, interviews, first-day plans, workplace communication, feedback, pay records, safety, respect, and asking clear questions.') },
            resumebuilder: { accent: '#0f766e', soft: 'rgba(15,118,110,0.10)', icon: '\uD83D\uDCC4', title: __alloT('stem.lifeskills.resume_builder', 'Resume builder + evidence review'), hint: __alloT('stem.lifeskills.resume_builder_hint', 'Role matching, truthful evidence bullets, clean sections, O*NET vocabulary, NACE career-readiness skills, privacy checks, and cautious AI/ATS review.') },
            prooflocker: { accent: '#0e7490', soft: 'rgba(14,116,144,0.10)', icon: '\uD83D\uDDC2\uFE0F', title: __alloT('stem.lifeskills.proof_locker', 'Portfolio + proof locker'), hint: __alloT('stem.lifeskills.proof_locker_hint', 'Collect projects, certificates, work samples, volunteer proof, references, links, privacy checks, captions, and share-ready packets that support resume and interview claims.') },
            interviewstudio: { accent: '#6d28d9', soft: 'rgba(109,40,217,0.10)', icon: '\uD83C\uDFA4', title: __alloT('stem.lifeskills.interview_studio', 'Interview practice studio'), hint: __alloT('stem.lifeskills.interview_studio_hint', 'Persona-style mock interview chat with guided/free response, suggested stems, read-aloud, calm rehearsal, question-to-proof matching, interview day run sheet, topic spark coaching, bite-size practice plans, STAR answers, prep packets, transcript save, reflection, and accessibility scripts.') },
            communication: { accent: '#7c2d12', soft: 'rgba(124,45,18,0.10)', icon: '\uD83D\uDCAC', title: __alloT('stem.lifeskills.communication_conflict', 'Communication + conflict'), hint: __alloT('stem.lifeskills.communication_conflict_hint', 'Pausing, listening, clarifying, I-statements, boundaries, message tone, repair attempts, apologies, and getting trusted support when conflict is unsafe or too big.') },
            timemanagement: { accent: '#854d0e', soft: 'rgba(133,77,14,0.10)', icon: '\u23F3', title: __alloT('stem.lifeskills.time_management', 'Time management + planning'), hint: __alloT('stem.lifeskills.time_management_hint', 'Task capture, priorities, realistic estimates, buffers, reminders, calendars, checklists, focus tools, and recovery plans when the day changes.') },
            insurance:  { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\uD83C\uDFE5', title: __alloT('stem.lifeskills.insurance_basics', 'Insurance basics'),        hint: __alloT('stem.lifeskills.premium_deductible_out_of_pocket_max_n', 'Premium / deductible / out-of-pocket max / network. Insurance protects against catastrophic loss \u2014 not against everyday cost. High-deductible plans + HSA can beat low-deductible for healthy people.') },
            dental:     { accent: '#0f766e', soft: 'rgba(15,118,110,0.10)',  icon: '\uD83E\uDDB7', title: __alloT('stem.lifeskills.dental_care', 'Dental care'),              hint: __alloT('stem.lifeskills.daily_oral_health_habits', 'Daily prevention, brushing and between-teeth cleaning, snack choices, dental plan math, and knowing when symptoms need a dentist. Educational practice only - not a diagnosis.') },
            bodycare:   { accent: '#0f766e', soft: 'rgba(15,118,110,0.10)',  icon: '\uD83E\uDDCD', title: __alloT('stem.lifeskills.body_care_ergonomics', 'Body care + ergonomics'), hint: __alloT('stem.lifeskills.body_care_fit_task', 'Comfort checks, workspace fit, movement resets, accessibility options, and knowing when to ask for support. The goal is flexible comfort, not one perfect posture.') },
            sleep:      { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',   icon: '\uD83C\uDF19', title: __alloT('stem.lifeskills.sleep_energy', 'Sleep + energy'),            hint: __alloT('stem.lifeskills.sleep_energy_routines', 'Wind-down routines, wake-time math, caffeine timing, screen boundaries, and energy supports. Educational practice only - persistent sleep problems deserve real support.') },
            meds:       { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)',  icon: '\uD83D\uDC8A', title: __alloT('stem.lifeskills.meds_labels', 'Medication + labels'),       hint: __alloT('stem.lifeskills.medication_label_safety', 'Mock label reading, active ingredients, directions, warnings, storage, expiration, and questions to ask. Practice only - real medication choices need label and professional guidance.') },
            appointments: { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)', icon: '\uD83D\uDCC5', title: __alloT('stem.lifeskills.appointments_self_advocacy', 'Appointments + self-advocacy'), hint: __alloT('stem.lifeskills.appointment_prep', 'Prepare what to bring, describe concerns clearly, ask questions, request support, and leave with a follow-up plan. Useful for health, school, work, and service meetings.') },
            homesafety: { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',   icon: '\uD83D\uDEE1\uFE0F', title: __alloT('stem.lifeskills.home_safety', 'Home safety'),            hint: __alloT('stem.lifeskills.home_safety_prep', 'Smoke and carbon monoxide alarms, exit plans, cleaning product safety, first-aid decision rules, emergency contacts, and calm response practice.') },
            digitalsafety: { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)', icon: '\uD83D\uDD10', title: __alloT('stem.lifeskills.digital_safety', 'Digital safety'),        hint: __alloT('stem.lifeskills.digital_safety_prep', 'Phishing clues, passwords, two-factor login, privacy settings, respectful communication, and block/report/save-evidence plans.') },
            science:    { accent: '#16a34a', soft: 'rgba(22,163,74,0.10)',  icon: '\uD83D\uDD2C', title: __alloT('stem.lifeskills.applied_science_at_home', 'Applied science at home'), hint: __alloT('stem.lifeskills.pressure_cookers_microwaves_refrigerat', 'Pressure cookers, microwaves, refrigeration, thermostats, water heaters \u2014 the physics is in your kitchen. Knowing the principle saves you from googling "why is my fridge warm" at 2 AM.') },
            carcare:    { accent: '#1f2937', soft: 'rgba(31,41,55,0.10)',   icon: '\uD83D\uDE97', title: __alloT('stem.lifeskills.car_care_basics', 'Car care basics'),         hint: __alloT('stem.lifeskills.oil_tire_pressure_battery_brakes_fluid', 'Oil + tire pressure + battery + brakes + fluids. Maintenance prevents 80% of breakdowns. Pairs with the Auto Repair Shop tool for deeper dives.') },
            homerepair: { accent: '#f59e0b', soft: 'rgba(245,158,11,0.10)', icon: '\uD83D\uDD27', title: __alloT('stem.lifeskills.home_repair_basics', 'Home repair basics'),      hint: __alloT('stem.lifeskills.toilet_flapper_faucet_washers_drywall_', 'Toilet flapper, faucet washers, drywall patches, GFCI resets, breaker tripping. Five repairs a homeowner does themselves vs five they call a pro for.') },
            homesys:    { accent: '#06b6d4', soft: 'rgba(6,182,212,0.10)',  icon: '\uD83C\uDFE0', title: __alloT('stem.lifeskills.home_systems', 'Home systems'),            hint: __alloT('stem.lifeskills.where_the_water_main_is_where_the_brea', 'Where the water main is. Where the breaker panel is. How HVAC + electrical + plumbing actually work. The five things every renter and homeowner should know on day one.') },
            budget:     { accent: '#22c55e', soft: 'rgba(34,197,94,0.10)',  icon: '\uD83D\uDCB0', title: __alloT('stem.lifeskills.budgeting', 'Budgeting'),               hint: __alloT('stem.lifeskills.50_30_20_rule_needs_wants_save_debt_fi', '50/30/20 rule (needs/wants/save+debt). Fixed vs variable. Sinking funds for predictable irregulars (car insurance, holiday gifts). Cash-flow timing > total spend.') },
            credit:     { accent: '#8b5cf6', soft: 'rgba(139,92,246,0.10)', icon: '\uD83D\uDCB3', title: __alloT('stem.lifeskills.credit_debt', 'Credit + debt'),           hint: __alloT('stem.lifeskills.fico_factors_payment_history_35_utiliz', 'FICO factors: payment history (35%), utilization (30%), age (15%), mix (10%), inquiries (10%). Pay statement balance in full each cycle = no interest. Minimum payment = decades of debt.') },
            foodconfidence: { accent: '#15803d', soft: 'rgba(21,128,61,0.10)', icon: '\uD83E\uDD57', title: __alloT('stem.lifeskills.food_confidence', 'Food confidence'), hint: __alloT('stem.lifeskills.food_confidence_hint', 'Leftovers, storage, date-label judgment, budget meals, pantry backups, simple nutrition labels, and choosing safety when food is uncertain.') },
            cooking:    { accent: '#f97316', soft: 'rgba(249,115,22,0.10)', icon: '\uD83C\uDF73', title: __alloT('stem.lifeskills.cooking_fundamentals', 'Cooking fundamentals'),    hint: __alloT('stem.lifeskills.heat_control_knife_skills_salt_timing_', 'Heat control, knife skills, salt timing, food safety (40\u2013140\u00B0F danger zone, 165\u00B0F poultry-safe). Five techniques cover 80% of home recipes \u2014 sear, simmer, roast, steam, saut\u00e9.') },
            laundry:    { accent: '#0f766e', soft: 'rgba(15,118,110,0.10)', icon: '\uD83E\uDDFA', title: __alloT('stem.lifeskills.laundry_science', 'Laundry science'),       hint: __alloT('stem.lifeskills.surfactants_enzymes_agitation_tempera', 'Surfactants, enzymes, agitation, temperature, rinse efficiency, and fabric chemistry. The point is not just "do laundry" \u2014 it is knowing why each step prevents residue, dye transfer, shrinkage, odor, and dryer risk.') },
            challenge:  { accent: '#fbbf24', soft: 'rgba(251,191,36,0.10)', icon: '\uD83C\uDFAF', title: __alloT('stem.lifeskills.daily_challenge', 'Daily challenge'),         hint: __alloT('stem.lifeskills.a_new_life_skills_puzzle_every_session', 'A new life-skills puzzle every session \u2014 calculate a tip, decode a credit-card APR, debug a leaking faucet. Streak counter tracks daily wins.') },
            battle:     { accent: '#dc2626', soft: 'rgba(220,38,38,0.10)',  icon: '\u2694\uFE0F',  title: __alloT('stem.lifeskills.speed_battle', 'Speed battle'),            hint: __alloT('stem.lifeskills.time_pressure_quiz_across_multiple_sub', 'Time-pressure quiz across multiple sub-tools. Tests whether the math + frameworks are automatic, not just recognized.') },
            learn:      { accent: '#64748b', soft: 'rgba(100,116,139,0.10)', icon: '\uD83D\uDCDA', title: __alloT('stem.lifeskills.reference_glossary', 'Reference + glossary'),    hint: __alloT('stem.lifeskills.tax_brackets_fico_factor_weights_food_', 'Tax brackets, FICO factor weights, food-safe temp table, electrical breaker color-codes \u2014 the reference card you keep coming back to.') }
          };
          var meta = TAB_META[tab] || TAB_META.paycheck;
          return h('div', {
            style: {
              padding: '12px 14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(255,255,255,0) 100%)',
              border: '1px solid ' + meta.accent + '55',
              borderLeft: '4px solid ' + meta.accent,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }
          },
            h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
              h('p', { style: { margin: '3px 0 0', color: 'var(--allo-stem-text-soft, #475569)', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })(),

        // ═══ PAYCHECK TAB ═══
        tab === 'overview' && h('div', { className: 'space-y-4', 'data-lifeskills-overview': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Choose a path'),
                h('h4', { className: 'text-base font-black text-slate-800' }, 'What do you want to practice today?')
              ),
              h('div', { className: 'flex items-center gap-2 text-[11px] font-bold text-slate-600' },
                h('span', { className: 'px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200' }, Object.keys(d.badges || {}).length + '/' + LS_BADGES.length + ' badges'),
                h('span', { className: 'px-2 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200' }, Object.keys(learnRead || {}).length + '/' + LEARN_TOPICS.length + ' topics')
              )
            ),
            h('div', { className: 'grid sm:grid-cols-2 xl:grid-cols-5 gap-3' },
              LIFE_SKILL_PATHS.map(function(path) {
                return h('button', { key: path.id, onClick: function() { updMulti({ tab: path.start }); announceToSR('Opened ' + path.title); }, className: 'text-left rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-teal-700' },
                  h('div', { className: 'flex items-center gap-2 mb-2' },
                    h('span', { className: 'text-xl', 'aria-hidden': 'true' }, path.icon),
                    h('span', { className: 'text-sm font-black', style: { color: path.accent } }, path.title)
                  ),
                  h('p', { className: 'text-[11px] text-slate-600 leading-relaxed min-h-[44px]' }, path.desc),
                  h('div', { className: 'flex flex-wrap gap-1 mt-3' },
                    path.steps.map(function(step) {
                      return h('span', { key: step, className: 'px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold' }, step);
                    })
                  )
                );
              })
            )
          ),
          h('div', { className: 'grid sm:grid-cols-2 xl:grid-cols-5 gap-3' },
            [
              { title: '10-minute money check', icon: '\uD83E\uDDFE', body: 'Estimate take-home pay, then jump to budget if there is time.', tab: 'paycheck' },
              { title: 'Digital safety scan', icon: '\uD83D\uDD10', body: 'Spot scams, strengthen passwords, review privacy, and report harm.', tab: 'digitalsafety' },
              { title: 'Paperwork quick sort', icon: '\uD83D\uDCC1', body: 'Find IDs, forms, receipts, deadlines, and private records before they are needed.', tab: 'records' },
              { title: 'Trip plan check', icon: '\uD83D\uDE8C', body: 'Check route, stop, time buffer, fare, access needs, and backup plan.', tab: 'transport' },
              { title: 'Job readiness check', icon: '\uD83D\uDCBC', body: 'Practice applications, interviews, schedules, first-day plans, and workplace questions.', tab: 'workreadiness' },
              { title: 'Resume builder check', icon: '\uD83D\uDCC4', body: 'Turn real experiences into truthful, role-matched evidence bullets.', tab: 'resumebuilder' },
              { title: 'Proof locker check', icon: '\uD83D\uDDC2\uFE0F', body: 'Collect projects, certificates, work samples, and safe share notes behind resume claims.', tab: 'prooflocker' },
              { title: 'Interview practice check', icon: '\uD83C\uDFA4', body: 'Practice persona-style interview answers with STAR stories, read-aloud, and reflection.', tab: 'interviewstudio' },
              { title: 'Communication reset', icon: '\uD83D\uDCAC', body: 'Practice pausing, clarifying, boundaries, repair, and trusted support.', tab: 'communication' },
              { title: 'Time plan reset', icon: '\u23F3', body: 'Capture tasks, choose priorities, add buffers, reminders, and recovery steps.', tab: 'timemanagement' },
              { title: 'Body comfort reset', icon: '\uD83E\uDDCD', body: 'Check posture, setup, movement breaks, and access needs.', tab: 'bodycare' },
              { title: 'Food confidence check', icon: '\uD83E\uDD57', body: 'Plan leftovers, storage, labels, pantry meals, and safer choices.', tab: 'foodconfidence' },
              { title: 'Appointment prep', icon: '\uD83D\uDCC5', body: 'Prepare notes, questions, support needs, and follow-up steps.', tab: 'appointments' },
              { title: 'Home safety check', icon: '\uD83D\uDEE1\uFE0F', body: 'Practice alarms, exits, cleaners, first aid, and emergency contacts.', tab: 'homesafety' },
              { title: 'Sleep wind-down', icon: '\uD83C\uDF19', body: 'Plan bedtime, wake time, screens, caffeine, and energy supports.', tab: 'sleep' },
              { title: 'Medication label check', icon: '\uD83D\uDC8A', body: 'Practice active ingredients, warnings, storage, and questions to ask.', tab: 'meds' },
              { title: 'Daily care reset', icon: '\uD83E\uDDB7', body: 'Build an oral-care routine and compare snack choices.', tab: 'dental' },
              { title: 'Fast practice', icon: '\uD83C\uDFAF', body: 'Answer a few challenge questions and grow a streak.', tab: 'challenge' }
            ].map(function(card) {
              return h('button', { key: card.title, onClick: function() { updMulti({ tab: card.tab }); announceToSR('Opened ' + card.title); }, className: 'text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-teal-300 hover:shadow-md transition-all' },
                h('div', { className: 'flex items-center gap-2 mb-2' }, h('span', { className: 'text-xl', 'aria-hidden': 'true' }, card.icon), h('span', { className: 'text-sm font-black text-slate-800' }, card.title)),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed' }, card.body)
              );
            })
          ),
          h('div', { className: glassCard + ' space-y-3', 'data-lifeskills-action-plan': 'true' },
            h('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'My Life Skills Plan'),
                h('h4', { className: 'text-sm font-black text-slate-800' }, 'Pick one focus and one next step')
              ),
              h('span', { className: 'px-2 py-1 rounded-full text-[11px] font-bold border', style: { color: overviewPath.accent, borderColor: overviewPath.accent + '55', background: overviewPath.accent + '12' } }, overviewPath.icon + ' ' + overviewPath.title)
            ),
            h('div', { className: 'grid md:grid-cols-[1fr_1fr] gap-3' },
              h('div', { className: 'space-y-2' },
                h('label', { className: 'block text-[11px] font-bold text-slate-600 uppercase' }, 'Focus area'),
                h('select', { value: overviewFocus, onChange: function(e) { upd('overviewFocus', e.target.value); }, className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold bg-white text-slate-800' },
                  LIFE_SKILL_PATHS.map(function(path) { return h('option', { key: path.id, value: path.id }, path.title); })
                )
              ),
              h('div', { className: 'space-y-2' },
                h('div', { className: 'flex items-center justify-between' },
                  h('label', { className: 'text-[11px] font-bold text-slate-600 uppercase' }, 'Confidence right now'),
                  h('span', { className: 'text-xs font-black text-slate-800' }, overviewConfidence + '/5')
                ),
                h('input', { type: 'range', min: 1, max: 5, step: 1, value: overviewConfidence, onChange: function(e) { upd('overviewConfidence', parseInt(e.target.value, 10) || 1); }, className: 'w-full', style: { accentColor: overviewPath.accent }, 'aria-label': 'Confidence right now', 'aria-valuetext': overviewConfidence + ' out of 5' })
              )
            ),
            h('div', { className: 'space-y-2' },
              h('label', { className: 'block text-[11px] font-bold text-slate-600 uppercase' }, 'One small next step'),
              h('textarea', { value: overviewNextStep, onChange: function(e) { upd('overviewNextStep', e.target.value); }, rows: 3, placeholder: 'Example: Compare two phone plans before I choose one.', className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'One small next step' })
            ),
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, 'Suggested first activity: ' + overviewPath.steps[0] + '. Confidence can change after practice.'),
              h('div', { className: 'flex gap-2' },
                h('button', { onClick: saveOverviewPlan, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-teal-700 text-white hover:bg-teal-800' }, 'Save plan'),
                h('button', { onClick: function() { updMulti({ tab: overviewPath.start }); announceToSR('Opened ' + overviewPath.title); }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800' }, 'Start this path')
              )
            ),
            d.overviewPlanMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.overviewPlanSaved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200') }, d.overviewPlanMsg)
          ),
          h('div', { className: glassCard + ' grid sm:grid-cols-3 gap-3' },
            h('div', { className: 'rounded-xl bg-teal-50 border border-teal-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-teal-800' }, 'Most practical first'), h('p', { className: 'text-sm font-black text-teal-900' }, 'Paycheck + Budget'), h('p', { className: 'text-[11px] text-teal-800 leading-relaxed' }, 'Start with what money comes in, then decide where it goes.')),
            h('div', { className: 'rounded-xl bg-indigo-50 border border-indigo-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-indigo-800' }, 'Best for confidence'), h('p', { className: 'text-sm font-black text-indigo-900' }, 'Home + Car + Laundry'), h('p', { className: 'text-[11px] text-indigo-800 leading-relaxed' }, 'Use everyday systems as low-stakes STEM practice.')),
            h('div', { className: 'rounded-xl bg-amber-50 border border-amber-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-amber-800' }, 'Best for review'), h('p', { className: 'text-sm font-black text-amber-900' }, 'Challenge + Learn'), h('p', { className: 'text-[11px] text-amber-800 leading-relaxed' }, 'Use quick questions, then read the matching concept card.'))
          )
        ),

        tab === 'paycheck' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard + ' space-y-3' },
            h('h4', { className: 'text-sm font-bold text-slate-700' }, __alloT('stem.lifeskills.paycheck_tax_calculator', '\uD83E\uDDFE Paycheck & Tax Calculator')),
            h('p', { className: 'text-xs text-slate-600' }, gradeText(gradeBand, 'See how much money you get to keep!', 'See what happens between gross pay and your bank account.', 'Calculate federal marginal tax, FICA, and state withholding.', 'Progressive marginal taxation with bracket visualization, FICA cap analysis, and effective rate computation.')),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-5 gap-2' },
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.hourly_rate', 'Hourly Rate')), h('input', { type: 'number', step: '0.5', value: payRate, onChange: function(e) { upd('payRate', Math.max(0, parseFloat(e.target.value) || 0)); checkBadge('firstPay'); }, className: 'w-full px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold mt-1', 'aria-label': __alloT('stem.lifeskills.hourly_rate_dollars', 'Hourly rate in dollars') })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Hours/Week'), h('input', { type: 'number', value: payHours, onChange: function(e) { upd('payHours', Math.max(0, parseFloat(e.target.value) || 0)); }, className: 'w-full px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold mt-1', 'aria-label': __alloT('stem.lifeskills.hours_worked_per_week', 'Hours worked per week') })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.pay_period', 'Pay Period')), h('select', { value: payFreq, onChange: function(e) { upd('payFreq', e.target.value); }, className: 'w-full px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold mt-1' }, h('option', { value: 'weekly' }, __alloT('stem.lifeskills.weekly', 'Weekly')), h('option', { value: 'biweekly' }, 'Bi-weekly'), h('option', { value: 'monthly' }, __alloT('stem.lifeskills.monthly', 'Monthly')))),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.state', 'State')), h('select', { value: payState, onChange: function(e) { upd('payState', e.target.value); }, className: 'w-full px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold mt-1' }, h('option', { value: 'none' }, __alloT('stem.lifeskills.no_state_tax', 'No State Tax')), h('option', { value: 'CA' }, __alloT('stem.lifeskills.california', 'California')), h('option', { value: 'NY' }, __alloT('stem.lifeskills.new_york', 'New York')), h('option', { value: 'TX' }, __alloT('stem.lifeskills.texas_0', 'Texas (0%)')), h('option', { value: 'FL' }, __alloT('stem.lifeskills.florida_0', 'Florida (0%)')), h('option', { value: 'IL' }, __alloT('stem.lifeskills.illinois', 'Illinois')), h('option', { value: 'PA' }, __alloT('stem.lifeskills.pennsylvania', 'Pennsylvania')), h('option', { value: 'MA' }, __alloT('stem.lifeskills.massachusetts', 'Massachusetts')), h('option', { value: 'OH' }, __alloT('stem.lifeskills.ohio', 'Ohio')))),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.filing', 'Filing')), h('select', { value: payFiling, onChange: function(e) { upd('payFiling', e.target.value); }, className: 'w-full px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold mt-1' }, h('option', { value: 'single' }, __alloT('stem.lifeskills.single', 'Single')), h('option', { value: 'married' }, __alloT('stem.lifeskills.married', 'Married'))))
            )
          ),
          // Results
          h('div', { className: 'grid grid-cols-3 gap-2' },
            h('div', { className: glassCard + ' text-center' }, h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase' }, 'Gross (' + payFreq + ')'), h('p', { className: 'text-xl font-bold text-emerald-600' }, fmtMoney(grossPer))),
            h('div', { className: glassCard + ' text-center' }, h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase' }, __alloT('stem.lifeskills.taxes_taken', 'Taxes Taken')), h('p', { className: 'text-xl font-bold text-red-500' }, '-' + fmtMoney(totalTax / freqMult)), h('p', { className: 'text-[11px] text-red-400' }, Math.round(effectiveRate) + '% effective rate')),
            h('div', { className: glassCard + ' text-center border-2 border-emerald-300' }, h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase' }, __alloT('stem.lifeskills.take_home', 'Take Home')), h('p', { className: 'text-xl font-bold text-emerald-600' }, fmtMoney(netPer)), h('p', { className: 'text-[11px] text-emerald-500' }, fmtMoney(netAnnual) + '/year'))
          ),
          // Breakdown bar
          grossAnnual > 0 && h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 mb-1' }, __alloT('stem.lifeskills.where_every_dollar_goes', 'Where every dollar goes:')),
            h('div', { className: 'h-6 rounded-full overflow-hidden flex' },
              h('div', { style: { width: Math.round(netAnnual / grossAnnual * 100) + '%', background: 'linear-gradient(90deg, #10b981, #059669)' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, __alloT('stem.lifeskills.take_home_2', 'Take Home')),
              h('div', { style: { width: Math.round(fedResult.tax / grossAnnual * 100) + '%', background: '#ef4444' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, 'Fed'),
              h('div', { style: { width: Math.round(ficaTotal / grossAnnual * 100) + '%', background: '#f97316' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, 'FICA'),
              stateTax > 0 && h('div', { style: { width: Math.round(stateTax / grossAnnual * 100) + '%', background: '#a855f7' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, __alloT('stem.lifeskills.state_2', 'State'))
            )
          ),
          // Bracket table
          (gradeBand === '6-8' || gradeBand === '9-12') && h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 mb-1' }, __alloT('stem.lifeskills.federal_tax_brackets', '\uD83D\uDCCA Federal Tax Brackets:')),
            h('table', { className: 'w-full text-[11px]' },
              h('caption', { className: 'sr-only' }, __alloT('stem.lifeskills.lifeskills_data_table', 'lifeskills data table')), h('thead', null, h('tr', { className: 'border-b border-slate-200' }, h('th', { scope: 'col', className: 'px-2 py-1 text-left' }, __alloT('stem.lifeskills.rate', 'Rate')), h('th', { className: 'px-2 py-1 text-right' }, __alloT('stem.lifeskills.taxable', 'Taxable')), h('th', { className: 'px-2 py-1 text-right text-red-500' }, 'Tax'))),
              h('tbody', null,
                fedResult.breakdown.map(function(b, i) {
                  return h('tr', { key: i, className: i % 2 === 0 ? '' : 'bg-slate-50' }, h('td', { className: 'px-2 py-1 font-bold' }, b.rate + '%'), h('td', { className: 'px-2 py-1 text-right' }, fmtMoney(b.amount)), h('td', { className: 'px-2 py-1 text-right font-bold text-red-500' }, fmtMoney(b.tax)));
                }),
                h('tr', { className: 'bg-orange-50 border-t' }, h('td', { className: 'px-2 py-1 font-bold text-orange-600', colSpan: 2 }, __alloT('stem.lifeskills.fica_ss_6_2_medicare_1_45', 'FICA (SS 6.2% + Medicare 1.45%)')), h('td', { className: 'px-2 py-1 text-right font-bold text-orange-500' }, fmtMoney(ficaTotal)))
              )
            )
          )
        ),

        // ═══ DATA LITERACY TAB ═══
        tab === 'data' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, __alloT('stem.lifeskills.data_literacy_media_analysis', '\uD83D\uDCCA Data Literacy & Media Analysis')),
            h('p', { className: 'text-xs text-slate-600' }, 'Can you spot the deception? Score: ' + dlScore + '/' + DL_SCENARIOS.length)
          ),
          h('div', { className: glassCard },
            h('span', { className: 'px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-lg text-[11px] font-bold' }, 'Scenario ' + (dlScenario + 1) + '/' + DL_SCENARIOS.length + ': ' + dlCurrent.title),
            h('p', { className: 'text-xs text-slate-700 mt-2 leading-relaxed' }, dlCurrent.desc),
            // FLAGSHIP: SHOW the chart trick (same data, two framings, side by
            // side) instead of only describing it — the core visual a data-
            // literacy tab was missing. Chart-based scenarios only; the reasoning
            // fallacies (ice cream, percentage, survivor CEOs) stay text.
            (function() {
              var INK = '#334155', MUT = '#64748b';
              if (dlScenario === 0) { // Truncated Y-axis: "crime rate" 970 vs 990
                var mkBars = function(y0, y1) {
                  var W = 120, H = 96, padL = 28, padB = 16, vals = [970, 990], cols = ['#6366f1', '#ef4444'];
                  var sy = function(v) { return 8 + (H - padB - 8) * (1 - (v - y0) / (y1 - y0)); };
                  return h('svg', { width: '100%', viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: 150 }, 'aria-hidden': 'true' },
                    h('line', { x1: padL, y1: 8, x2: padL, y2: H - padB, stroke: MUT, strokeWidth: 1 }),
                    h('line', { x1: padL, y1: H - padB, x2: W - 4, y2: H - padB, stroke: MUT, strokeWidth: 1 }),
                    h('text', { x: padL - 3, y: H - padB, fontSize: 7, fill: MUT, textAnchor: 'end' }, '' + y0),
                    h('text', { x: padL - 3, y: 12, fontSize: 7, fill: MUT, textAnchor: 'end' }, '' + y1),
                    vals.map(function(v, i) { return h('rect', { key: i, x: padL + 10 + i * 44, y: sy(v), width: 30, height: (H - padB) - sy(v), fill: cols[i], rx: 2 }); }),
                    h('text', { x: padL + 25, y: H - 4, fontSize: 7, fill: INK, textAnchor: 'middle' }, '2023'),
                    h('text', { x: padL + 69, y: H - 4, fontSize: 7, fill: INK, textAnchor: 'middle' }, '2024'));
                };
                return h('div', { className: 'grid grid-cols-2 gap-3 my-3' },
                  h('div', null, h('div', { className: 'text-[10px] font-bold text-red-600 mb-1' }, __alloT('stem.lifeskills.y_axis_starts_at_950', '😱 Y-axis starts at 950')), mkBars(950, 1000), h('div', { className: 'text-[9px] text-slate-500 text-center mt-0.5' }, __alloT('stem.lifeskills.looks_like_a_huge_jump', 'Looks like a HUGE jump'))),
                  h('div', null, h('div', { className: 'text-[10px] font-bold text-emerald-600 mb-1' }, __alloT('stem.lifeskills.y_axis_starts_at_0', '✅ Y-axis starts at 0')), mkBars(0, 1000), h('div', { className: 'text-[9px] text-slate-500 text-center mt-0.5' }, __alloT('stem.lifeskills.same_data_barely_2', 'Same data — barely +2%'))));
              }
              if (dlScenario === 2) { // Vanishing baseline: $3M(2022) -> $1M(2023) -> $2M(2024)
                var mkLine = function(pts) {
                  var W = 130, H = 96, padL = 22, padB = 16, maxV = 3.5, n = pts.length;
                  var px = function(i) { return padL + (W - padL - 6) * (n === 1 ? 0.5 : i / (n - 1)); };
                  var py = function(v) { return 8 + (H - padB - 8) * (1 - v / maxV); };
                  return h('svg', { width: '100%', viewBox: '0 0 ' + W + ' ' + H, style: { maxWidth: 160 }, 'aria-hidden': 'true' },
                    h('line', { x1: padL, y1: 8, x2: padL, y2: H - padB, stroke: MUT, strokeWidth: 1 }),
                    h('line', { x1: padL, y1: H - padB, x2: W - 4, y2: H - padB, stroke: MUT, strokeWidth: 1 }),
                    h('polyline', { points: pts.map(function(p, i) { return px(i) + ',' + py(p[1]); }).join(' '), fill: 'none', stroke: '#6366f1', strokeWidth: 2 }),
                    pts.map(function(p, i) { return h('circle', { key: i, cx: px(i), cy: py(p[1]), r: 2.5, fill: '#4338ca' }); }),
                    pts.map(function(p, i) { return h('text', { key: 't' + i, x: px(i), y: H - 4, fontSize: 7, fill: INK, textAnchor: 'middle' }, p[0]); }));
                };
                return h('div', { className: 'grid grid-cols-2 gap-3 my-3' },
                  h('div', null, h('div', { className: 'text-[10px] font-bold text-red-600 mb-1' }, __alloT('stem.lifeskills.cherry_picked_window', '😱 Cherry-picked window')), mkLine([['2023', 1], ['2024', 2]]), h('div', { className: 'text-[9px] text-slate-500 text-center mt-0.5' }, __alloT('stem.lifeskills.revenue_doubled', '"Revenue DOUBLED!"'))),
                  h('div', null, h('div', { className: 'text-[10px] font-bold text-emerald-600 mb-1' }, __alloT('stem.lifeskills.full_history', '✅ Full history')), mkLine([['2022', 3], ['2023', 1], ['2024', 2]]), h('div', { className: 'text-[9px] text-slate-500 text-center mt-0.5' }, __alloT('stem.lifeskills.down_from_3m_not_doubled', 'Down from $3M — not "doubled"'))));
              }
              if (dlScenario === 5) { // 3D pie distortion: same data, but a 3D tilt makes the front 30% slice look bigger than the back 35% ones
                var slices = [{ v: 30, c: '#6366f1' }, { v: 35, c: '#10b981' }, { v: 35, c: '#f59e0b' }];
                var pie = function() {
                  var cx = 50, cy = 50, r = 44, ang = Math.PI * 0.2, paths = []; // start so the 30% slice sits at the bottom (front under tilt)
                  slices.forEach(function(s, i) {
                    var a1 = ang + (s.v / 100) * Math.PI * 2;
                    var x0 = cx + r * Math.cos(ang), y0 = cy + r * Math.sin(ang);
                    var x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
                    var large = (a1 - ang) > Math.PI ? 1 : 0;
                    paths.push(h('path', { key: i, d: 'M' + cx + ',' + cy + ' L' + x0.toFixed(1) + ',' + y0.toFixed(1) + ' A' + r + ',' + r + ' 0 ' + large + ' 1 ' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' Z', fill: s.c, stroke: '#fff', strokeWidth: 1.5 }));
                    ang = a1;
                  });
                  return h('svg', { width: 92, height: 92, viewBox: '0 0 100 100', 'aria-hidden': 'true', style: { display: 'block' } }, paths);
                };
                return h('div', { className: 'grid grid-cols-2 gap-3 my-3 items-end' },
                  h('div', { className: 'text-center' },
                    h('div', { className: 'text-[10px] font-bold text-red-600 mb-2' }, __alloT('stem.lifeskills.same_pie_3d_tilted', '😱 Same pie, 3D-tilted')),
                    h('div', { style: { perspective: '240px', display: 'flex', justifyContent: 'center', height: 80 } },
                      h('div', { style: { transform: 'rotateX(58deg)', transformOrigin: 'center bottom' } }, pie())),
                    h('div', { className: 'text-[9px] text-slate-500 mt-1' }, __alloT('stem.lifeskills.front_30_slice_looks_the_biggest', 'front 30% slice looks the biggest'))),
                  h('div', { className: 'text-center' },
                    h('div', { className: 'text-[10px] font-bold text-emerald-600 mb-2' }, __alloT('stem.lifeskills.flat_2d', '✅ Flat 2D')),
                    h('div', { style: { display: 'flex', justifyContent: 'center' } }, pie()),
                    h('div', { className: 'text-[9px] text-slate-500 mt-1' }, __alloT('stem.lifeskills.the_two_35_slices_are_actually_biggest', 'the two 35% slices are actually biggest'))));
              }
              return null;
            })(),
            h('p', { className: 'text-xs font-bold text-slate-600 mt-3 mb-2' }, dlCurrent.question),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              dlCurrent.options.map(function(opt, oi) {
                var isCorrect = oi === dlCurrent.correct;
                var isSelected = dlAnswer === oi;
                var revealed = dlRevealed;
                return h('button', { key: oi, onClick: function() {
                  if (!dlRevealed) {
                    updMulti({ dlAnswer: oi, dlRevealed: true, dlScore: dlScore + (oi === dlCurrent.correct ? 1 : 0) });
                    stemBeep(oi === dlCurrent.correct);
                    if (dlScore + (oi === dlCurrent.correct ? 1 : 0) >= 3) checkBadge('dataDetect');
                  }
                }, className: 'p-2 rounded-xl text-xs font-bold text-left transition-all border-2 ' + (revealed ? (isCorrect ? 'border-emerald-400 bg-emerald-50' : isSelected ? 'border-red-400 bg-red-50' : 'border-slate-200') : isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-600') }, opt);
              })
            ),
            dlRevealed && h('div', { className: 'mt-3 p-3 rounded-xl ' + (dlAnswer === dlCurrent.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200') },
              h('p', { className: 'text-xs font-bold ' + (dlAnswer === dlCurrent.correct ? 'text-emerald-700' : 'text-red-700') }, dlAnswer === dlCurrent.correct ? '\u2705 Correct!' : '\u274C Incorrect'),
              h('p', { className: 'text-xs text-slate-600 mt-1' }, dlCurrent.explain)
            ),
            dlRevealed && h('button', { 'aria-label': __alloT('stem.lifeskills.next_scenario', 'Next Scenario'), onClick: function() { updMulti({ dlScenario: dlScenario + 1, dlAnswer: null, dlRevealed: false }); }, className: 'mt-2 px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl' }, __alloT('stem.lifeskills.next_scenario_2', 'Next Scenario \u27A1'))
          )
        ),

        // ═══ DECISIONS TAB ═══
        tab === 'decision' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, __alloT('stem.lifeskills.decision_matrix', '\uD83E\uDDE0 Decision Matrix')),
            h('p', { className: 'text-xs text-slate-600' }, __alloT('stem.lifeskills.rate_each_option_on_each_criterion_1_5', 'Rate each option on each criterion (1-5). Weights determine importance.'))
          ),
          h('div', { className: glassCard },
            h('table', { className: 'w-full text-[11px]' },
              h('caption', { className: 'sr-only' }, __alloT('stem.lifeskills.decision_matrix_2', '\uD83E\uDDE0 Decision Matrix')), h('thead', null, h('tr', { className: 'border-b border-slate-200' },
                h('th', { scope: 'col', className: 'px-2 py-1 text-left' }, __alloT('stem.lifeskills.criteria_weight', 'Criteria (weight)')),
                dmOptions.map(function(opt, oi) { return h('th', { scope: 'col', key: oi, className: 'px-2 py-1 text-center' }, opt); })
              )),
              h('tbody', null,
                dmCriteria.map(function(c, ci) {
                  return h('tr', { key: ci, className: ci % 2 === 0 ? '' : 'bg-slate-50' },
                    h('td', { className: 'px-2 py-1 font-bold' }, c.name + ' (w:' + c.weight + ')'),
                    dmOptions.map(function(opt, oi) {
                      var key = oi + '-' + ci;
                      return h('td', { key: oi, className: 'px-2 py-1 text-center' },
                        h('input', { type: 'range', 'aria-label': __alloT('stem.lifeskills.dm_scores', 'dm scores'), 'aria-valuetext': (dmScores[key] || 3) + ' of 5', min: 1, max: 5, value: dmScores[key] || 3, onChange: function(e) {
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
                return h('div', { key: t.index, className: 'text-center p-2 rounded-xl ' + (i === 0 ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-slate-50 border border-slate-400') },
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
        tab === 'contract' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, __alloT('stem.lifeskills.contract_trap_finder', '\uD83D\uDCDD Contract Trap Finder')),
            h('p', { className: 'text-xs text-slate-600' }, 'Read the fine print. Find all ' + crCurrent.traps.length + ' hidden traps!')
          ),
          h('div', { className: 'flex gap-1.5 mb-2' },
            CONTRACTS.map(function(c, i) {
              return h('button', { key: i, onClick: function() { updMulti({ crLevel: i, crFound: [] }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold ' + (crLevel % CONTRACTS.length === i ? 'bg-teal-700 text-white' : 'bg-white border border-slate-400 text-slate-600') }, c.title);
            })
          ),
          h('div', { className: glassCard },
            h('p', { className: 'text-xs text-slate-700 leading-relaxed whitespace-pre-line' }, crCurrent.text),
            h('p', { className: 'text-[11px] font-bold text-amber-600 mt-3 mb-2' }, '\uD83D\uDD0D Traps found: ' + crFound.length + '/' + crCurrent.traps.length),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              crCurrent.traps.map(function(trap) {
                var found = crFound.indexOf(trap.id) >= 0;
                return h('button', { key: trap.id, onClick: function() {
                  if (!found) {
                    var list = crFound.concat([trap.id]);
                    upd('crFound', list);
                    stemBeep(true);
                    if (list.length >= crCurrent.traps.length) checkBadge('trapFinder');
                    awardXP(10, 'Found trap: ' + trap.hint);
                  }
                }, className: 'p-2 rounded-xl text-left text-[11px] transition-all border ' + (found ? 'bg-red-50 border-red-600' : 'bg-white border-slate-200 hover:border-amber-600') },
                  found ? h('div', null, h('p', { className: 'font-bold text-red-700' }, '\u26A0\uFE0F ' + trap.hint), h('p', { className: 'text-red-600 mt-0.5' }, trap.explain)) :
                  h('p', { className: 'text-slate-600 italic' }, '\uD83D\uDD0D Click to investigate: ' + trap.hint)
                );
              })
            )
          )
        ),

        tab === 'records' && h('div', { className: 'space-y-4', 'data-lifeskills-records-paperwork': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.records_lab', '\uD83D\uDCC1 Records & Paperwork Lab')),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed max-w-2xl' }, gradeText(gradeBand,
                  'Practice keeping important papers safe and asking before sharing or signing.',
                  'Build a simple system for IDs, forms, receipts, deadlines, and private information.',
                  'Decode paperwork by purpose: identity, proof, consent, deadlines, storage, and privacy.',
                  'Model paperwork literacy as document triage, consent awareness, privacy protection, proof-of-payment tracking, and deadline planning.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-slate-100 border border-slate-300 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-slate-700' }, 'Records readiness'),
                h('p', { className: 'text-2xl font-black text-slate-900 leading-none' }, Math.round(recordsDone / RECORDS_CHECKS.length * 100) + '%')
              )
            ),
            h('p', { className: 'text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-2 leading-relaxed' }, 'Practice only. Do not share private IDs, account numbers, health details, or signatures through unknown links. Ask before sharing or signing when a request feels confusing, rushed, or unnecessary.')
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Records checklist'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, recordsDone + '/' + RECORDS_CHECKS.length + ' record habits checked')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-300' }, 'Find it before stress')
              ),
              RECORDS_CHECKS.map(function(step) {
                var checked = !!recordsChecklist[step.id];
                return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-slate-400') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setRecordsCheck(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                    h('span', { className: 'block text-[11px] text-slate-700 leading-relaxed' }, step.action),
                    h('span', { className: 'block text-[11px] text-slate-700 mt-1 font-medium' }, 'Why: ' + step.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Paperwork decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the best next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200' }, 'Score ' + recordScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, recordCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                RECORD_ACTIONS.map(function(action) {
                  var chosen = recordScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerRecordScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-slate-700 ' + (chosen ? action.tone + ' ring-2 ring-offset-1 ring-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:border-slate-500') }, action.label);
                })
              ),
              recordScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (recordScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, recordScenarioFb),
              h('button', { onClick: function() { updMulti({ recordScenarioIdx: recordScenarioIdx + 1, recordScenarioChoice: '', recordScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-800 text-white hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Next scenario')
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Document type cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, recordTypeCard.icon + ' ' + recordTypeCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200' }, 'Keep, use, protect')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                RECORD_TYPE_CARDS.map(function(card, i) {
                  var active = i === recordTypeIdx % RECORD_TYPE_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('recordTypeIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-slate-700 ' + (active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:border-slate-500') }, card.icon + ' ' + card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Keep'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, recordTypeCard.keep),
                h('p', { className: 'text-xs font-black text-blue-800 pt-2 border-t border-slate-100' }, 'Use for'),
                h('p', { className: 'text-[11px] text-blue-800 leading-relaxed' }, recordTypeCard.use),
                h('p', { className: 'text-xs font-black text-red-800 pt-2 border-t border-slate-100' }, 'Protect'),
                h('p', { className: 'text-[11px] text-red-800 font-medium leading-relaxed' }, recordTypeCard.protect)
              )
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Form field decoder'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, formFieldCard.icon + ' ' + formFieldCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-200' }, 'Read before signing')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                FORM_FIELD_CARDS.map(function(card, i) {
                  var active = i === formFieldIdx % FORM_FIELD_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('formFieldIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-slate-700 ' + (active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:border-slate-500') }, card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Means'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, formFieldCard.means),
                h('p', { className: 'text-xs font-black text-emerald-800 pt-2 border-t border-slate-100' }, 'Try this'),
                h('p', { className: 'text-[11px] text-emerald-800 leading-relaxed' }, formFieldCard.move),
                h('p', { className: 'text-xs font-black text-red-800 pt-2 border-t border-slate-100' }, 'Watch for'),
                h('p', { className: 'text-[11px] text-red-800 font-medium leading-relaxed' }, formFieldCard.watch)
              )
            )
          ),
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Paperwork plan builder'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, recordPlanPrompt)
              ),
              h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-300' }, 'One next step')
            ),
            h('div', { className: 'flex flex-wrap gap-2' },
              RECORD_PLAN_PROMPTS.map(function(prompt, i) {
                var active = i === recordPlanIdx % RECORD_PLAN_PROMPTS.length;
                return h('button', { key: prompt, onClick: function() { updMulti({ recordPlanIdx: i, recordPlanNote: prompt, recordPlanMsg: '' }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold border ' + (active ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500') }, 'Plan ' + (i + 1));
              })
            ),
            h('textarea', { value: recordPlanNote, onChange: function(e) { upd('recordPlanNote', e.target.value); }, rows: 4, placeholder: 'Write one record, form, or deadline action.', className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Paperwork plan note' }),
            h('button', { onClick: function() {
              if (!recordPlanNote.trim()) { upd('recordPlanMsg', 'Write one paperwork step first.'); return; }
              updMulti({ recordPlanMsg: 'Plan saved: ' + recordPlanNote.trim(), recordPlanSaved: Date.now() });
              checkBadge('recordsReady');
              announceToSR('Paperwork plan saved');
            }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save paperwork plan'),
            recordPlanMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.recordPlanSaved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, recordPlanMsg)
          )
        ),

        tab === 'transport' && h('div', { className: 'space-y-4', 'data-lifeskills-transportation': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.transportation_lab', '\uD83D\uDE8C Transportation & Navigation Lab')),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed max-w-2xl' }, gradeText(gradeBand,
                  'Practice getting from one place to another with a trusted plan and a backup.',
                  'Plan trips by checking destination, route, time, fare, safety, and what to do if plans change.',
                  'Compare routes, transfers, access needs, payment, alerts, safer waiting places, and backup options.',
                  'Model transportation literacy as time management, wayfinding, accessibility, cost planning, situational awareness, and contingency planning.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-sky-800' }, 'Trip readiness'),
                h('p', { className: 'text-2xl font-black text-sky-900 leading-none' }, Math.round(transportDone / TRANSPORT_CHECKS.length * 100) + '%')
              )
            ),
            h('p', { className: 'text-[11px] text-slate-700 bg-sky-50 border border-sky-200 rounded-xl p-2 leading-relaxed' }, 'Practice only. For real travel, follow local rules and trusted guidance. If a place, ride, message, or pickup feels unsafe, move to a public safer place when possible and contact a trusted person or official help.')
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Trip readiness checklist'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, transportDone + '/' + TRANSPORT_CHECKS.length + ' trip habits checked')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-sky-50 text-sky-800 text-[11px] font-bold border border-sky-200' }, 'Plan before leaving')
              ),
              TRANSPORT_CHECKS.map(function(step) {
                var checked = !!transportChecklist[step.id];
                return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-sky-300') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setTransportCheck(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                    h('span', { className: 'block text-[11px] text-slate-700 leading-relaxed' }, step.action),
                    h('span', { className: 'block text-[11px] text-sky-800 mt-1 font-medium' }, 'Why: ' + step.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Route and delay decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the best next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200' }, 'Score ' + transportScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, transportCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                TRANSPORT_ACTIONS.map(function(action) {
                  var chosen = transportScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerTransportScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-sky-700 ' + (chosen ? action.tone + ' ring-2 ring-offset-1 ring-sky-700' : 'bg-white border-slate-300 text-slate-700 hover:border-sky-300') }, action.label);
                })
              ),
              transportScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (transportScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, transportScenarioFb),
              h('button', { onClick: function() { updMulti({ transportScenarioIdx: transportScenarioIdx + 1, transportScenarioChoice: '', transportScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-sky-700 text-white hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-700' }, 'Next scenario')
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Transportation mode cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, transportModeCard.icon + ' ' + transportModeCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200' }, 'Best, check, backup')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                TRANSPORT_MODE_CARDS.map(function(card, i) {
                  var active = i === transportModeIdx % TRANSPORT_MODE_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('transportModeIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-sky-700 ' + (active ? 'bg-sky-700 text-white border-sky-700' : 'bg-white border-slate-300 text-slate-700 hover:border-sky-300') }, card.icon + ' ' + card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Best for'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, transportModeCard.best),
                h('p', { className: 'text-xs font-black text-blue-800 pt-2 border-t border-slate-100' }, 'Check'),
                h('p', { className: 'text-[11px] text-blue-800 leading-relaxed' }, transportModeCard.check),
                h('p', { className: 'text-xs font-black text-emerald-800 pt-2 border-t border-slate-100' }, 'Backup'),
                h('p', { className: 'text-[11px] text-emerald-800 leading-relaxed' }, transportModeCard.backup)
              )
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Map and sign decoder'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, transportSymbolCard.icon + ' ' + transportSymbolCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-200' }, 'Decode before moving')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                TRANSPORT_SYMBOL_CARDS.map(function(card, i) {
                  var active = i === transportSymbolIdx % TRANSPORT_SYMBOL_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('transportSymbolIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-sky-700 ' + (active ? 'bg-sky-700 text-white border-sky-700' : 'bg-white border-slate-300 text-slate-700 hover:border-sky-300') }, card.icon + ' ' + card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Means'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, transportSymbolCard.means),
                h('p', { className: 'text-xs font-black text-sky-800 pt-2 border-t border-slate-100' }, 'Move'),
                h('p', { className: 'text-[11px] text-sky-800 leading-relaxed' }, transportSymbolCard.move)
              )
            )
          ),
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Trip plan builder'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, transportPlanPrompt)
              ),
              h('span', { className: 'px-2 py-1 rounded-full bg-sky-50 text-sky-800 text-[11px] font-bold border border-sky-200' }, 'Route plus backup plan')
            ),
            h('div', { className: 'flex flex-wrap gap-2' },
              TRANSPORT_PLAN_PROMPTS.map(function(prompt, i) {
                var active = i === transportPlanIdx % TRANSPORT_PLAN_PROMPTS.length;
                return h('button', { key: prompt, onClick: function() { updMulti({ transportPlanIdx: i, transportPlanNote: prompt, transportPlanMsg: '' }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold border ' + (active ? 'bg-sky-700 text-white border-sky-700' : 'bg-white text-sky-800 border-sky-200 hover:border-sky-400') }, 'Plan ' + (i + 1));
              })
            ),
            h('textarea', { value: transportPlanNote, onChange: function(e) { upd('transportPlanNote', e.target.value); }, rows: 4, placeholder: 'Write one route, buffer, fare, or backup step.', className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Trip plan note' }),
            h('button', { onClick: function() {
              if (!transportPlanNote.trim()) { upd('transportPlanMsg', 'Write one trip plan step first.'); return; }
              updMulti({ transportPlanMsg: 'Plan saved: ' + transportPlanNote.trim(), transportPlanSaved: Date.now() });
              checkBadge('tripReady');
              announceToSR('Trip plan saved');
            }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save trip plan'),
            transportPlanMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.transportPlanSaved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, transportPlanMsg)
          )
        ),

        tab === 'workreadiness' && h('div', { className: 'space-y-4', 'data-lifeskills-job-readiness': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.job_readiness_lab', '\uD83D\uDCBC Job Readiness & Workplace Basics Lab')),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed max-w-2xl' }, gradeText(gradeBand,
                  'Practice work habits: being ready, asking questions, staying safe, and helping with a task.',
                  'Build job-readiness habits for applications, interviews, schedules, tasks, and respectful communication.',
                  'Practice resumes, availability, interview answers, first-day planning, feedback, safety, and workplace questions.',
                  'Model job readiness as application prep, schedule literacy, professional communication, feedback use, pay-record awareness, accommodations, and escalation when work is unsafe or unclear.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-indigo-800' }, 'Work readiness'),
                h('p', { className: 'text-2xl font-black text-indigo-900 leading-none' }, Math.round(workDone / WORK_CHECKS.length * 100) + '%')
              )
            ),
            h('p', { className: 'text-[11px] text-slate-700 bg-indigo-50 border border-indigo-200 rounded-xl p-2 leading-relaxed' }, 'Practice only. Real jobs have local rules and different policies. If work feels unsafe, discriminatory, harassing, unpaid, confusing, or beyond your training, ask a trusted adult, supervisor, counselor, HR, or other appropriate support.')
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Job readiness checklist'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, workDone + '/' + WORK_CHECKS.length + ' work habits checked')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-indigo-50 text-indigo-800 text-[11px] font-bold border border-indigo-200' }, 'Prepare and ask clearly')
              ),
              WORK_CHECKS.map(function(step) {
                var checked = !!workChecklist[step.id];
                return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-indigo-300') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setWorkCheck(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                    h('span', { className: 'block text-[11px] text-slate-700 leading-relaxed' }, step.action),
                    h('span', { className: 'block text-[11px] text-indigo-800 mt-1 font-medium' }, 'Why: ' + step.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Workplace decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the best next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200' }, 'Score ' + workScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, workCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                WORK_ACTIONS.map(function(action) {
                  var chosen = workScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerWorkScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-700 ' + (chosen ? action.tone + ' ring-2 ring-offset-1 ring-indigo-700' : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-300') }, action.label);
                })
              ),
              workScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (workScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, workScenarioFb),
              h('button', { onClick: function() { updMulti({ workScenarioIdx: workScenarioIdx + 1, workScenarioChoice: '', workScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-700 text-white hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-700' }, 'Next scenario')
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Workplace basics cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, workplaceCard.icon + ' ' + workplaceCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200' }, 'Do, watch, say')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                WORKPLACE_CARDS.map(function(card, i) {
                  var active = i === workplaceCardIdx % WORKPLACE_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('workplaceCardIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-indigo-700 ' + (active ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-300') }, card.icon + ' ' + card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Do this'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, workplaceCard.doThis),
                h('p', { className: 'text-xs font-black text-red-800 pt-2 border-t border-slate-100' }, 'Watch for'),
                h('p', { className: 'text-[11px] text-red-800 font-medium leading-relaxed' }, workplaceCard.watch),
                h('p', { className: 'text-xs font-black text-indigo-800 pt-2 border-t border-slate-100' }, 'Try saying'),
                h('p', { className: 'text-[11px] text-indigo-800 leading-relaxed' }, workplaceCard.phrase)
              )
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Interview practice cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, interviewCard.icon + ' ' + interviewCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-200' }, 'Practice out loud')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                INTERVIEW_CARDS.map(function(card, i) {
                  var active = i === interviewCardIdx % INTERVIEW_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('interviewCardIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-indigo-700 ' + (active ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-300') }, card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Prompt'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, interviewCard.prompt),
                h('p', { className: 'text-xs font-black text-emerald-800 pt-2 border-t border-slate-100' }, 'Example'),
                h('p', { className: 'text-[11px] text-emerald-800 leading-relaxed' }, interviewCard.example)
              )
            )
          ),
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Work readiness plan builder'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, workPlanPrompt)
              ),
              h('span', { className: 'px-2 py-1 rounded-full bg-indigo-50 text-indigo-800 text-[11px] font-bold border border-indigo-200' }, 'One practical next step')
            ),
            h('div', { className: 'flex flex-wrap gap-2' },
              WORK_PLAN_PROMPTS.map(function(prompt, i) {
                var active = i === workPlanIdx % WORK_PLAN_PROMPTS.length;
                return h('button', { key: prompt, onClick: function() { updMulti({ workPlanIdx: i, workPlanNote: prompt, workPlanMsg: '' }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold border ' + (active ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white text-indigo-800 border-indigo-200 hover:border-indigo-400') }, 'Plan ' + (i + 1));
              })
            ),
            h('textarea', { value: workPlanNote, onChange: function(e) { upd('workPlanNote', e.target.value); }, rows: 4, placeholder: 'Write one job, interview, schedule, or workplace question step.', className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Work readiness plan note' }),
            h('button', { onClick: function() {
              if (!workPlanNote.trim()) { upd('workPlanMsg', 'Write one work readiness step first.'); return; }
              updMulti({ workPlanMsg: 'Plan saved: ' + workPlanNote.trim(), workPlanSaved: Date.now() });
              checkBadge('jobReady');
              announceToSR('Work readiness plan saved');
            }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save work plan'),
            workPlanMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.workPlanSaved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, workPlanMsg)
          )
        ),

        tab === 'resumebuilder' && h('div', { className: 'space-y-4', 'data-lifeskills-resume-builder': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.resume_builder_lab', '\uD83D\uDCC4 Resume Builder & Evidence Review Lab')),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed max-w-2xl' }, gradeText(gradeBand,
                  'Practice naming strengths, helpful tasks, school projects, and ways you can show responsibility.',
                  'Build a simple resume habit: collect real examples, name skills, and ask a trusted helper to review.',
                  'Practice role matching, clean sections, action-result bullets, privacy checks, and truthful job vocabulary.',
                  'Model resume building as evidence translation, career-readiness alignment, O*NET vocabulary use, accessible formatting, human review, and cautious AI/ATS literacy.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-teal-50 border border-teal-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-teal-800' }, 'Resume readiness'),
                h('p', { className: 'text-2xl font-black text-teal-900 leading-none' }, Math.round(resumeDone / RESUME_CHECKS.length * 100) + '%')
              )
            ),
            h('p', { className: 'text-[11px] text-slate-700 bg-teal-50 border border-teal-200 rounded-xl p-2 leading-relaxed' }, 'Practice only. A resume should be truthful, readable, and safe to share. Applicant tracking system tools may scan resumes, but human-readable evidence still matters. Remove private information, keep evidence you can explain, and ask a counselor, teacher, workforce helper, trusted adult, or accessibility support person for review when possible.')
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Resume readiness checklist'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, resumeDone + '/' + RESUME_CHECKS.length + ' resume habits checked')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200' }, 'Target, evidence, review')
              ),
              RESUME_CHECKS.map(function(step) {
                var checked = !!resumeChecklist[step.id];
                return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-teal-300') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setResumeCheck(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                    h('span', { className: 'block text-[11px] text-slate-700 leading-relaxed' }, step.action),
                    h('span', { className: 'block text-[11px] text-teal-800 mt-1 font-medium' }, 'Why: ' + step.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Resume decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the best next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200' }, 'Score ' + resumeScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, resumeCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                RESUME_ACTIONS.map(function(action) {
                  var chosen = resumeScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerResumeScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-teal-700 ' + (chosen ? action.tone + ' ring-2 ring-offset-1 ring-teal-700' : 'bg-white border-slate-300 text-slate-700 hover:border-teal-300') }, action.label);
                })
              ),
              resumeScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (resumeScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, resumeScenarioFb),
              h('button', { onClick: function() { updMulti({ resumeScenarioIdx: resumeScenarioIdx + 1, resumeScenarioChoice: '', resumeScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-teal-700 text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700' }, 'Next scenario')
            )
          ),
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Evidence bullet builder'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, 'Action + context + skill + result')
              ),
              h('span', { className: 'px-2 py-1 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200' }, 'Truthful and specific')
            ),
            h('div', { className: 'grid md:grid-cols-2 xl:grid-cols-5 gap-3' },
              h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Target role',
                h('input', { type: 'text', value: resumeRole, onChange: function(e) { upd('resumeRole', e.target.value); }, className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'Target role or opportunity' })
              ),
              h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Action verb',
                h('input', { type: 'text', value: resumeAction, onChange: function(e) { upd('resumeAction', e.target.value); }, placeholder: 'Organized, greeted, tracked...', className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'Resume action verb' })
              ),
              h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Context',
                h('input', { type: 'text', value: resumeContext, onChange: function(e) { upd('resumeContext', e.target.value); }, placeholder: 'a project, shift, event...', className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'Resume bullet context' })
              ),
              h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Skill',
                h('input', { type: 'text', value: resumeSkill, onChange: function(e) { upd('resumeSkill', e.target.value); }, placeholder: 'communication, Excel...', className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'Resume bullet skill' })
              ),
              h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Result',
                h('input', { type: 'text', value: resumeResult, onChange: function(e) { upd('resumeResult', e.target.value); }, placeholder: 'finish faster, reduce errors...', className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'Resume bullet result' })
              )
            ),
            h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
              h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Draft for ' + resumeRole),
              h('p', { className: 'text-sm font-black text-slate-800 leading-relaxed' }, resumeBulletPreview),
              h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, 'Tip: If the result is hard to measure, use a clear outcome such as helped visitors find items, reduced confusion, finished before the deadline, or kept records accurate.')
            ),
            h('button', { onClick: function() {
              if (!resumeAction.trim() || !resumeContext.trim()) { upd('resumeBulletMsg', 'Add at least an action and context before saving the bullet.'); return; }
              updMulti({ resumeBulletMsg: 'Bullet saved: ' + resumeBulletPreview, resumeBulletSaved: Date.now() });
              checkBadge('bulletBuilder');
              announceToSR('Resume bullet saved');
            }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save evidence bullet'),
            resumeBulletMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.resumeBulletSaved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, resumeBulletMsg)
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Resume section cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, resumeSectionCard.icon + ' ' + resumeSectionCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200' }, 'Include and avoid')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                RESUME_SECTION_CARDS.map(function(card, i) {
                  var active = i === resumeSectionIdx % RESUME_SECTION_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('resumeSectionIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-teal-700 ' + (active ? 'bg-teal-700 text-white border-teal-700' : 'bg-white border-slate-300 text-slate-700 hover:border-teal-300') }, card.icon + ' ' + card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Include'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, resumeSectionCard.include),
                h('p', { className: 'text-xs font-black text-red-800 pt-2 border-t border-slate-100' }, 'Avoid'),
                h('p', { className: 'text-[11px] text-red-800 font-medium leading-relaxed' }, resumeSectionCard.avoid),
                h('p', { className: 'text-xs font-black text-teal-800 pt-2 border-t border-slate-100' }, 'Ask'),
                h('p', { className: 'text-[11px] text-teal-800 leading-relaxed' }, resumeSectionCard.prompt)
              )
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Bullet examples'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'Weak to stronger')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-200' }, 'Evidence upgrade')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                RESUME_BULLET_EXAMPLES.map(function(card, i) {
                  var active = i === resumeBulletIdx % RESUME_BULLET_EXAMPLES.length;
                  return h('button', { key: card.weak, onClick: function() { upd('resumeBulletIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-teal-700 ' + (active ? 'bg-teal-700 text-white border-teal-700' : 'bg-white border-slate-300 text-slate-700 hover:border-teal-300') }, 'Example ' + (i + 1));
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-red-800' }, 'Before'),
                h('p', { className: 'text-[11px] text-red-800 font-medium leading-relaxed' }, resumeBulletCard.weak),
                h('p', { className: 'text-xs font-black text-emerald-800 pt-2 border-t border-slate-100' }, 'Try instead'),
                h('p', { className: 'text-[11px] text-emerald-800 leading-relaxed' }, resumeBulletCard.strong),
                h('p', { className: 'text-xs font-black text-slate-800 pt-2 border-t border-slate-100' }, 'Why it works'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, resumeBulletCard.why)
              )
            )
          ),
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Literature review cards'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, resumeResearchCard.title)
              ),
              h('a', { href: resumeResearchCard.url, target: '_blank', rel: 'noreferrer', className: 'px-2 py-1 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200 hover:bg-teal-100' }, resumeResearchCard.source)
            ),
            h('div', { className: 'flex flex-wrap gap-2' },
              RESUME_RESEARCH_CARDS.map(function(card, i) {
                var active = i === resumeResearchIdx % RESUME_RESEARCH_CARDS.length;
                return h('button', { key: card.id, onClick: function() { upd('resumeResearchIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-teal-700 ' + (active ? 'bg-teal-700 text-white border-teal-700' : 'bg-white border-slate-300 text-slate-700 hover:border-teal-300') }, card.source);
              })
            ),
            h('div', { className: 'grid md:grid-cols-2 gap-3' },
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Finding'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, resumeResearchCard.finding)
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-teal-800' }, 'Use this in the resume tool'),
                h('p', { className: 'text-[11px] text-teal-800 leading-relaxed' }, resumeResearchCard.apply)
              )
            )
          ),
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Resume plan builder'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, resumePlanPrompt)
              ),
              h('span', { className: 'px-2 py-1 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200' }, 'One review-ready next step')
            ),
            h('div', { className: 'flex flex-wrap gap-2' },
              RESUME_PLAN_PROMPTS.map(function(prompt, i) {
                var active = i === resumePlanIdx % RESUME_PLAN_PROMPTS.length;
                return h('button', { key: prompt, onClick: function() { updMulti({ resumePlanIdx: i, resumePlanNote: prompt, resumePlanMsg: '' }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold border ' + (active ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-teal-800 border-teal-200 hover:border-teal-400') }, 'Plan ' + (i + 1));
              })
            ),
            h('textarea', { value: resumePlanNote, onChange: function(e) { upd('resumePlanNote', e.target.value); }, rows: 4, placeholder: 'Write one resume target, evidence bullet, privacy check, or review step.', className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Resume plan note' }),
            h('button', { onClick: function() {
              if (!resumePlanNote.trim()) { upd('resumePlanMsg', 'Write one resume step first.'); return; }
              updMulti({ resumePlanMsg: 'Plan saved: ' + resumePlanNote.trim(), resumePlanSaved: Date.now() });
              checkBadge('resumeReady');
              announceToSR('Resume plan saved');
            }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save resume plan'),
            resumePlanMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.resumePlanSaved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, resumePlanMsg)
          )
        ),

        tab === 'prooflocker' && h('div', { className: 'space-y-4', 'data-lifeskills-proof-locker': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.proof_locker_lab', '\uD83D\uDDC2\uFE0F Portfolio & Proof Locker Lab')),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed max-w-2xl' }, gradeText(gradeBand,
                  'Practice saving examples of things you made, learned, helped with, or practiced safely.',
                  'Collect projects, certificates, notes, and examples that show real skills while checking who can see them.',
                  'Build proof habits for resumes and interviews: label skills, add context, protect privacy, and sort by audience.',
                  'Model portfolio curation as evidence gathering, skill labeling, caption writing, permission checks, share-level decisions, and review-ready packets for jobs, programs, scholarships, and interviews.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-cyan-50 border border-cyan-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-cyan-800' }, 'Proof readiness'),
                h('p', { className: 'text-2xl font-black text-cyan-900 leading-none' }, Math.round(proofDone / PROOF_CHECKS.length * 100) + '%')
              )
            ),
            h('p', { className: 'text-[11px] text-slate-700 bg-cyan-50 border border-cyan-200 rounded-xl p-2 leading-relaxed' }, 'Practice only. The Proof Locker stores descriptions and planning notes, not uploaded files. Keep private IDs, health records, school records, employer information, and other people\u2019s details out of public portfolios unless a trusted reviewer says it is appropriate.')
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Proof locker checklist'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, proofDone + '/' + PROOF_CHECKS.length + ' proof habits checked')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-cyan-50 text-cyan-800 text-[11px] font-bold border border-cyan-200' }, 'Collect, label, protect')
              ),
              PROOF_CHECKS.map(function(step) {
                var checked = !!proofChecklist[step.id];
                return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-cyan-300') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setProofCheck(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                    h('span', { className: 'block text-[11px] text-slate-700 leading-relaxed' }, step.action),
                    h('span', { className: 'block text-[11px] text-cyan-800 mt-1 font-medium' }, 'Why: ' + step.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Proof decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the best next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200' }, 'Score ' + proofScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, proofCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                PROOF_ACTIONS.map(function(action) {
                  var chosen = proofScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerProofScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-700 ' + (chosen ? action.tone + ' ring-2 ring-offset-1 ring-cyan-700' : 'bg-white border-slate-300 text-slate-700 hover:border-cyan-300') }, action.label);
                })
              ),
              proofScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (proofScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, proofScenarioFb),
              h('button', { onClick: function() { updMulti({ proofScenarioIdx: proofScenarioIdx + 1, proofScenarioChoice: '', proofScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-cyan-700 text-white hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-700' }, 'Next scenario')
            )
          ),
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Proof item builder'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, 'Item + skill + evidence + share level')
              ),
              h('span', { className: 'px-2 py-1 rounded-full bg-cyan-50 text-cyan-800 text-[11px] font-bold border border-cyan-200' }, 'No file upload needed')
            ),
            h('div', { className: 'grid md:grid-cols-2 xl:grid-cols-5 gap-3' },
              h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Item type',
                h('input', { type: 'text', value: proofItemType, onChange: function(e) { upd('proofItemType', e.target.value); }, className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'Proof item type' })
              ),
              h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Title',
                h('input', { type: 'text', value: proofItemTitle, onChange: function(e) { upd('proofItemTitle', e.target.value); }, placeholder: 'Food drive spreadsheet...', className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'Proof item title' })
              ),
              h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Skill shown',
                h('input', { type: 'text', value: proofItemSkill, onChange: function(e) { upd('proofItemSkill', e.target.value); }, placeholder: 'teamwork, planning...', className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'Proof item skill' })
              ),
              h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Evidence note',
                h('input', { type: 'text', value: proofItemEvidence, onChange: function(e) { upd('proofItemEvidence', e.target.value); }, placeholder: 'what it proves...', className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'Proof item evidence note' })
              ),
              h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Share level',
                h('input', { type: 'text', value: proofItemShare, onChange: function(e) { upd('proofItemShare', e.target.value); }, placeholder: 'public, limited, private...', className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'Proof item share level' })
              )
            ),
            h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
              h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Locker preview'),
              h('p', { className: 'text-sm font-black text-slate-800 leading-relaxed' }, proofItemPreview),
              h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, 'Evidence note: ' + (proofItemEvidence.trim() || 'Add a short note about what this item proves and whether it is safe to share.'))
            ),
            h('button', { onClick: function() {
              if (!proofItemTitle.trim() || !proofItemSkill.trim()) { upd('proofItemMsg', 'Add at least a title and skill before saving the proof item.'); return; }
              updMulti({ proofItemMsg: 'Proof item saved: ' + proofItemPreview, proofItemSaved: Date.now() });
              checkBadge('proofLockerReady');
              announceToSR('Proof item saved');
            }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save proof item'),
            proofItemMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.proofItemSaved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, proofItemMsg)
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Proof type cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, proofTypeCard.icon + ' ' + proofTypeCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200' }, 'Examples and sharing')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                PROOF_TYPE_CARDS.map(function(card, i) {
                  var active = i === proofTypeIdx % PROOF_TYPE_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('proofTypeIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-cyan-700 ' + (active ? 'bg-cyan-700 text-white border-cyan-700' : 'bg-white border-slate-300 text-slate-700 hover:border-cyan-300') }, card.icon + ' ' + card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Examples'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, proofTypeCard.examples),
                h('p', { className: 'text-xs font-black text-cyan-800 pt-2 border-t border-slate-100' }, 'Shows'),
                h('p', { className: 'text-[11px] text-cyan-800 leading-relaxed' }, proofTypeCard.shows),
                h('p', { className: 'text-xs font-black text-red-800 pt-2 border-t border-slate-100' }, 'Share note'),
                h('p', { className: 'text-[11px] text-red-800 font-medium leading-relaxed' }, proofTypeCard.share)
              )
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Proof quality cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, proofQualityCard.icon + ' ' + proofQualityCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-200' }, 'Before sharing')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                PROOF_QUALITY_CARDS.map(function(card, i) {
                  var active = i === proofQualityIdx % PROOF_QUALITY_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('proofQualityIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-cyan-700 ' + (active ? 'bg-cyan-700 text-white border-cyan-700' : 'bg-white border-slate-300 text-slate-700 hover:border-cyan-300') }, card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Check'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, proofQualityCard.check),
                h('p', { className: 'text-xs font-black text-emerald-800 pt-2 border-t border-slate-100' }, 'Fix'),
                h('p', { className: 'text-[11px] text-emerald-800 leading-relaxed' }, proofQualityCard.fix)
              )
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Share-level cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, proofShareCard.icon + ' ' + proofShareCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-red-50 text-red-800 text-[11px] font-bold border border-red-200' }, 'Privacy first')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                PROOF_SHARE_LEVELS.map(function(card, i) {
                  var active = i === proofShareIdx % PROOF_SHARE_LEVELS.length;
                  return h('button', { key: card.id, onClick: function() { upd('proofShareIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-cyan-700 ' + (active ? 'bg-cyan-700 text-white border-cyan-700' : 'bg-white border-slate-300 text-slate-700 hover:border-cyan-300') }, card.icon + ' ' + card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Use for'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, proofShareCard.use),
                h('p', { className: 'text-xs font-black text-red-800 pt-2 border-t border-slate-100' }, 'Guardrail'),
                h('p', { className: 'text-[11px] text-red-800 font-medium leading-relaxed' }, proofShareCard.guard)
              )
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Portfolio share packet'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, proofPlanPrompt)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-cyan-50 text-cyan-800 text-[11px] font-bold border border-cyan-200' }, 'Audience-ready')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                PROOF_PLAN_PROMPTS.map(function(prompt, i) {
                  var active = i === proofPlanIdx % PROOF_PLAN_PROMPTS.length;
                  return h('button', { key: prompt, onClick: function() { updMulti({ proofPlanIdx: i, proofPlanNote: prompt, proofPlanMsg: '' }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold border ' + (active ? 'bg-cyan-700 text-white border-cyan-700' : 'bg-white text-cyan-800 border-cyan-200 hover:border-cyan-400') }, 'Plan ' + (i + 1));
                })
              ),
              h('textarea', { value: proofPlanNote, onChange: function(e) { upd('proofPlanNote', e.target.value); }, rows: 4, placeholder: 'Write one proof item, skill label, privacy check, or review step.', className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Proof locker plan note' }),
              h('button', { onClick: function() {
                if (!proofPlanNote.trim()) { upd('proofPlanMsg', 'Write one proof locker step first.'); return; }
                updMulti({ proofPlanMsg: 'Plan saved: ' + proofPlanNote.trim(), proofPlanSaved: Date.now() });
                checkBadge('portfolioCurator');
                announceToSR('Proof locker plan saved');
              }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save proof plan'),
              proofPlanMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.proofPlanSaved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, proofPlanMsg)
            )
          )
        ),

        tab === 'interviewstudio' && h('div', { className: 'space-y-4', 'data-lifeskills-interview-studio': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.interview_studio_lab', '\uD83C\uDFA4 Interview Practice Studio')),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed max-w-2xl' }, gradeText(gradeBand,
                  'Practice listening, answering one question, and asking for help when a question is confusing.',
                  'Rehearse common interview questions with sentence starters, kind coaching, and a simple reflection.',
                  'Practice guided or free-response interview answers using resume bullets, proof locker items, STAR structure, and prepared questions.',
                  'Use a persona-style mock interview chat with read-aloud, suggested stems, topic spark coaching, transcript save, STAR answer building, reflection, and accommodation-aware scripts.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-violet-50 border border-violet-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-violet-800' }, 'Interview readiness'),
                h('p', { className: 'text-2xl font-black text-violet-900 leading-none' }, Math.round(interviewDone / INTERVIEW_CHECKS.length * 100) + '%')
              )
            ),
            h('p', { className: 'text-[11px] text-slate-700 bg-violet-50 border border-violet-200 rounded-xl p-2 leading-relaxed' }, 'Practice only. This studio reuses the persona interview pattern for career practice: conversation history, guided/free response, read-aloud support, coaching sparks, transcript save, and reflection. Real interviews vary, and learners can ask for appropriate access supports.')
          ),
          h('div', { className: glassCard + ' space-y-3', 'data-lifeskills-interview-practice-plan': 'true' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Interview practice plan'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, '5-10 minute routine: ' + interviewPracticePlan.title),
                h('p', { className: 'text-xs text-slate-700 leading-relaxed max-w-2xl' }, interviewPracticePlan.focus)
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-emerald-800' }, 'Practice plan progress'),
                h('p', { className: 'text-2xl font-black text-emerald-900 leading-none' }, interviewPlanProgress + '%')
              )
            ),
            h('div', { className: 'grid sm:grid-cols-2 lg:grid-cols-5 gap-2' },
              INTERVIEW_PLAN_TEMPLATES.map(function(plan, i) {
                var active = i === interviewPlanIdx % INTERVIEW_PLAN_TEMPLATES.length;
                return h('button', { key: plan.id, onClick: function() { selectInterviewPracticePlan(i); }, className: 'text-left px-3 py-2 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-violet-700 ' + (active ? 'bg-violet-700 text-white border-violet-700' : 'bg-white text-slate-700 border-slate-300 hover:border-violet-300') },
                  h('span', { className: 'block' }, plan.title),
                  h('span', { className: 'block text-[10px] font-black ' + (active ? 'text-violet-100' : 'text-violet-800') }, plan.minutes + ' min')
                );
              })
            ),
            h('div', { className: 'grid lg:grid-cols-[1fr_0.9fr] gap-3' },
              h('div', { className: 'space-y-3' },
                h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'This week I will...',
                  h('textarea', { value: interviewPlanGoal, onChange: function(e) { upd('interviewPlanGoal', e.target.value); }, rows: 3, placeholder: 'Write one interview practice goal for this week.', className: 'mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Interview weekly practice goal' })
                ),
                h('label', { className: 'block text-[11px] font-bold text-slate-700' }, 'Practice minutes: ' + interviewPlanMinutes,
                  h('input', { type: 'range', min: 5, max: 15, step: 1, value: interviewPlanMinutes, onChange: function(e) { upd('interviewPlanMinutes', Number(e.target.value)); }, className: 'mt-2 w-full accent-violet-700', 'aria-label': 'Interview practice minutes' })
                ),
                h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Plan note',
                  h('input', { type: 'text', value: interviewPlanNote, onChange: function(e) { upd('interviewPlanNote', e.target.value); }, placeholder: 'Optional note, support, proof item, or reminder.', className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'Interview practice plan note' })
                ),
                h('div', { className: 'flex flex-wrap gap-2' },
                  h('button', { onClick: buildInterviewPlanFromFeedback, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-700' }, 'Use coaching feedback'),
                  h('button', { onClick: saveInterviewPracticePlan, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save practice plan'),
                  h('button', { onClick: resetInterviewPracticePlan, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Reset progress')
                ),
                interviewPlanMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (interviewPlanSavedAt ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'), role: 'status' }, interviewPlanMsg)
              ),
              h('div', { className: 'space-y-2' },
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Daily practice steps'),
                INTERVIEW_PLAN_STEPS.map(function(step) {
                  var checked = !!interviewPlanChecklist[step.id];
                  return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-violet-300') },
                    h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setInterviewPlanStep(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.label }),
                    h('span', { className: 'min-w-0' },
                      h('span', { className: 'block text-xs font-black text-slate-800' }, step.label),
                      h('span', { className: 'block text-[11px] text-slate-700 leading-relaxed' }, step.detail)
                    )
                  );
                })
              )
            ),
            h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2', role: 'log', 'aria-live': 'polite', 'aria-label': 'Interview practice plan progress' },
              h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Saved practice plans'),
              interviewPlanLog.length
                ? interviewPlanLog.map(function(entry, i) {
                    return h('div', { key: entry.at || i, className: 'rounded-lg bg-emerald-50 border border-emerald-200 p-2' },
                      h('p', { className: 'text-xs font-black text-emerald-900' }, entry.title + ' - ' + entry.minutes + ' minutes'),
                      h('p', { className: 'text-[11px] text-emerald-800 leading-relaxed' }, entry.goal),
                      h('p', { className: 'text-[10px] font-bold text-emerald-800 mt-1' }, (entry.done || 0) + '/' + (entry.total || INTERVIEW_PLAN_STEPS.length) + ' steps checked')
                    );
                  })
                : h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, 'No saved practice plans yet. Save one after choosing a goal and checking any practice steps.')
            )
          ),
          h('div', { className: glassCard + ' space-y-3', 'data-lifeskills-interview-rehearsal': 'true' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Calm rehearsal coach'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, 'Practice pace, confidence, and support scripts'),
                h('p', { className: 'text-xs text-slate-700 leading-relaxed max-w-2xl' }, 'Choose an answer length, name a confidence level, and keep one pause or access script ready before practice.')
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-blue-800' }, 'Confidence check'),
                h('p', { className: 'text-2xl font-black text-blue-900 leading-none' }, interviewRehearsalConfidence + '/5')
              )
            ),
            h('div', { className: 'grid lg:grid-cols-[0.8fr_1.2fr] gap-3' },
              h('div', { className: 'space-y-3' },
                h('label', { className: 'block text-[11px] font-bold text-slate-700' }, 'Confidence before practice: ' + interviewRehearsalConfidence,
                  h('input', { type: 'range', min: 1, max: 5, step: 1, value: interviewRehearsalConfidence, onChange: function(e) { upd('interviewRehearsalConfidence', Number(e.target.value)); }, className: 'mt-2 w-full accent-blue-700', 'aria-label': 'Interview rehearsal confidence' })
                ),
                h('div', { className: 'space-y-2' },
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Answer length target'),
                  h('div', { className: 'flex flex-wrap gap-2' },
                    INTERVIEW_REHEARSAL_TARGETS.map(function(target) {
                      var active = target.id === interviewRehearsalTargetId;
                      return h('button', { key: target.id, onClick: function() { upd('interviewRehearsalTargetId', target.id); }, className: 'px-3 py-2 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-blue-700 ' + (active ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-300 hover:border-blue-300') }, target.label);
                    })
                  ),
                  h('p', { className: 'text-[11px] text-blue-800 bg-blue-50 border border-blue-200 rounded-xl p-2 leading-relaxed' }, interviewRehearsalTarget.cue)
                )
              ),
              h('div', { className: 'space-y-3' },
                h('div', { className: 'flex flex-wrap gap-2' },
                  INTERVIEW_REHEARSAL_SCRIPTS.map(function(script, i) {
                    var active = i === interviewRehearsalScriptIdx % INTERVIEW_REHEARSAL_SCRIPTS.length;
                    return h('button', { key: script.id, onClick: function() { upd('interviewRehearsalScriptIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-violet-700 ' + (active ? 'bg-violet-700 text-white border-violet-700' : 'bg-white text-violet-800 border-violet-200 hover:border-violet-400') }, script.title);
                  })
                ),
                h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Support script'),
                  h('p', { className: 'text-xs text-slate-800 leading-relaxed font-medium' }, interviewRehearsalScript.script)
                ),
                h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Rehearsal note',
                  h('textarea', { value: interviewRehearsalNote, onChange: function(e) { upd('interviewRehearsalNote', e.target.value); }, rows: 3, placeholder: 'One reset idea, confidence cue, or support reminder...', className: 'mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Interview rehearsal note' })
                ),
                h('div', { className: 'flex flex-wrap gap-2' },
                  h('button', { onClick: saveInterviewRehearsalNote, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save rehearsal note'),
                  h('button', { onClick: useInterviewRehearsalScript, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-violet-50 text-violet-800 border border-violet-200 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-700' }, 'Use script in chat')
                ),
                interviewRehearsalMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (interviewRehearsalSavedAt ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'), role: 'status' }, interviewRehearsalMsg)
              )
            )
          ),
          h('div', { className: glassCard + ' space-y-3', 'data-lifeskills-interview-proof-matcher': 'true' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Question-to-proof matcher'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, 'Pick the evidence before answering'),
                h('p', { className: 'text-xs text-slate-700 leading-relaxed max-w-2xl' }, 'Match a common interview question to a truthful proof item, then save the cue, use it in chat, or include it in the prep packet.')
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-amber-900' }, 'Current skill'),
                h('p', { className: 'text-xs font-black text-amber-950 leading-tight' }, interviewProofMatcher.title)
              )
            ),
            h('div', { className: 'grid lg:grid-cols-[0.8fr_1.2fr] gap-3' },
              h('div', { className: 'space-y-2' },
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Question types'),
                h('div', { className: 'flex flex-wrap gap-2' },
                  INTERVIEW_PROOF_MATCHERS.map(function(match, i) {
                    var active = i === interviewProofMatcherIdx % INTERVIEW_PROOF_MATCHERS.length;
                    return h('button', { key: match.id, onClick: function() { updMulti({ interviewProofMatcherIdx: i, interviewProofCueMsg: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-amber-700 ' + (active ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-white text-slate-700 border-slate-300 hover:border-amber-300') }, match.title);
                  })
                ),
                h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                  h('p', { className: 'text-xs font-black text-slate-800' }, interviewProofMatcher.question),
                  h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, 'Skill: ' + interviewProofMatcher.skill),
                  h('p', { className: 'text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed' }, interviewProofMatcher.safeShare)
                )
              ),
              h('div', { className: 'space-y-3' },
                h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Proof item or real example',
                  h('textarea', { value: interviewProofNote, onChange: function(e) { upd('interviewProofNote', e.target.value); }, rows: 3, placeholder: interviewProofMatcher.proofPrompt, className: 'mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Interview proof item or example' })
                ),
                h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Answer cue'),
                  h('p', { className: 'text-xs text-slate-800 leading-relaxed font-medium' }, interviewProofCuePreview)
                ),
                h('div', { className: 'flex flex-wrap gap-2' },
                  h('button', { onClick: saveInterviewProofCue, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save proof cue'),
                  h('button', { onClick: useInterviewProofCueInChat, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-700' }, 'Use cue in chat')
                ),
                interviewProofCueMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (interviewProofCueSavedAt ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'), role: 'status' }, interviewProofCueMsg)
              )
            )
          ),
          h('div', { className: glassCard + ' space-y-3', 'data-lifeskills-interview-day-sheet': 'true' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Interview day run sheet'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, 'Before, during, after checklist'),
                h('p', { className: 'text-xs text-slate-700 leading-relaxed max-w-2xl' }, 'Plan the practical details that make interview day calmer: travel or tech, materials, access supports, reset strategy, and follow-up.')
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-cyan-50 border border-cyan-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-cyan-800' }, 'Run sheet'),
                h('p', { className: 'text-2xl font-black text-cyan-900 leading-none' }, interviewDayDone + '/' + INTERVIEW_DAY_CHECKS.length)
              )
            ),
            h('div', { className: 'grid lg:grid-cols-[1fr_0.9fr] gap-3' },
              h('div', { className: 'space-y-2' },
                INTERVIEW_DAY_CHECKS.map(function(step) {
                  var checked = !!interviewDayChecklist[step.id];
                  return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-cyan-300') },
                    h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setInterviewDayCheck(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                    h('span', { className: 'min-w-0' },
                      h('span', { className: 'block text-[10px] uppercase font-black text-cyan-800' }, step.phase),
                      h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                      h('span', { className: 'block text-[11px] text-slate-700 leading-relaxed' }, step.detail)
                    )
                  );
                })
              ),
              h('div', { className: 'space-y-3' },
                h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Arrival/tech plan',
                  h('textarea', { value: interviewArrivalPlan, onChange: function(e) { upd('interviewArrivalPlan', e.target.value); }, rows: 3, placeholder: 'Route, meeting link, device check, arrival buffer...', className: 'mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Interview arrival or tech plan' })
                ),
                h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Materials note',
                  h('input', { type: 'text', value: interviewMaterialsNote, onChange: function(e) { upd('interviewMaterialsNote', e.target.value); }, placeholder: 'Resume, proof item, notes, charger, ID if needed...', className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'Interview materials note' })
                ),
                h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Backup/access plan',
                  h('textarea', { value: interviewBackupPlan, onChange: function(e) { upd('interviewBackupPlan', e.target.value); }, rows: 3, placeholder: 'Who to contact, access support, reset script, backup route...', className: 'mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Interview backup or access plan' })
                ),
                h('button', { onClick: saveInterviewDayRunSheet, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save run sheet'),
                interviewDayMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (interviewDaySavedAt ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'), role: 'status' }, interviewDayMsg)
              )
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Interview prep checklist'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, interviewDone + '/' + INTERVIEW_CHECKS.length + ' prep habits checked')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-violet-50 text-violet-800 text-[11px] font-bold border border-violet-200' }, 'Role, proof, STAR')
              ),
              INTERVIEW_CHECKS.map(function(step) {
                var checked = !!interviewChecklist[step.id];
                return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-violet-300') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setInterviewCheck(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                    h('span', { className: 'block text-[11px] text-slate-700 leading-relaxed' }, step.action),
                    h('span', { className: 'block text-[11px] text-violet-800 mt-1 font-medium' }, 'Why: ' + step.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Interview decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the best next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200' }, 'Score ' + interviewScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, interviewCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                INTERVIEW_ACTIONS.map(function(action) {
                  var chosen = interviewScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerInterviewScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-violet-700 ' + (chosen ? action.tone + ' ring-2 ring-offset-1 ring-violet-700' : 'bg-white border-slate-300 text-slate-700 hover:border-violet-300') }, action.label);
                })
              ),
              interviewScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (interviewScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, interviewScenarioFb),
              h('button', { onClick: function() { updMulti({ interviewScenarioIdx: interviewScenarioIdx + 1, interviewScenarioChoice: '', interviewScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-violet-700 text-white hover:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-700' }, 'Next scenario')
            )
          ),
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Persona-style practice chat'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, interviewRole.icon + ' ' + interviewRole.title + ' with ' + interviewRole.interviewer)
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                h('button', { onClick: function() { upd('interviewAutoRead', !interviewAutoRead); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-violet-700 ' + (interviewAutoRead ? 'bg-yellow-400 text-slate-900 border-yellow-500' : 'bg-white text-slate-700 border-slate-300') }, interviewAutoRead ? 'Auto-read on' : 'Auto-read off'),
                h('button', { onClick: function() { upd('interviewMode', interviewMode === 'guided' ? 'free' : 'guided'); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-violet-700 ' + (interviewMode === 'guided' ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-white text-slate-700 border-slate-300') }, interviewMode === 'guided' ? 'Guided mode' : 'Free response'),
                h('button', { onClick: function() { upd('interviewHintsOn', !interviewHintsOn); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-violet-700 ' + (interviewHintsOn ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-white text-slate-700 border-slate-300') }, interviewHintsOn ? 'Hints on' : 'Hints off')
              )
            ),
            h('div', { className: 'flex flex-wrap gap-2' },
              INTERVIEW_ROLES.map(function(role, i) {
                var active = i === interviewRoleIdx % INTERVIEW_ROLES.length;
                return h('button', { key: role.id, onClick: function() { updMulti({ interviewRoleIdx: i, interviewChatHistory: [], interviewFeedback: '', interviewSparkMsg: '', interviewSuggestions: INTERVIEW_SUGGESTIONS.slice(0, 4) }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-violet-700 ' + (active ? 'bg-violet-700 text-white border-violet-700' : 'bg-white border-slate-300 text-slate-700 hover:border-violet-300') }, role.icon + ' ' + role.title);
              })
            ),
            h('div', { className: 'rounded-2xl bg-slate-50 border border-slate-200 p-3 max-h-80 overflow-y-auto space-y-3', role: 'log', 'aria-live': 'polite', 'aria-atomic': 'false', 'aria-label': 'Mock interview conversation' },
              interviewDisplayHistory.map(function(msg, idx) {
                var isStudent = msg.role === 'student';
                return h('div', { key: idx, className: 'flex ' + (isStudent ? 'justify-end' : 'justify-start') },
                  h('div', { className: 'max-w-[88%] rounded-2xl border p-3 shadow-sm ' + (isStudent ? 'bg-violet-100 text-violet-950 border-violet-200 rounded-br-sm' : 'bg-white text-slate-800 border-slate-200 rounded-bl-sm') },
                    h('div', { className: 'flex items-center justify-between gap-2 mb-1' },
                      h('span', { className: 'text-[10px] uppercase font-black ' + (isStudent ? 'text-violet-800' : 'text-slate-600') }, isStudent ? 'You' : (msg.speaker || interviewRole.interviewer)),
                      !isStudent && h('button', { onClick: function() { speakInterviewText(msg.text); }, className: 'px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-700', 'aria-label': 'Read interviewer message aloud' }, 'Read')
                    ),
                    h('p', { className: 'text-xs leading-relaxed whitespace-pre-wrap' }, msg.text),
                    msg.feedback && h('p', { className: 'mt-2 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2 font-medium' }, msg.feedback)
                  )
                );
              }),
              interviewLoading && h('p', { className: 'text-xs font-bold text-violet-800 bg-violet-50 border border-violet-200 rounded-xl p-2' }, 'Interviewer is thinking...')
            ),
            h('div', { className: 'grid lg:grid-cols-[1fr_0.85fr] gap-3' },
              h('div', { className: 'space-y-2' },
                h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Your answer',
                  h('textarea', { value: interviewInput, onChange: function(e) { upd('interviewInput', e.target.value); }, rows: 4, placeholder: interviewMode === 'guided' ? 'Use a suggested response or write your own STAR answer...' : 'Write your answer freely...', className: 'mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Interview answer input' })
                ),
                h('div', { className: 'flex flex-wrap gap-2' },
                  h('button', { onClick: function() { sendInterviewMessage(); }, disabled: !interviewInput.trim() || interviewLoading, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-violet-700 text-white hover:bg-violet-800 disabled:bg-slate-200 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-700', 'aria-busy': interviewLoading ? 'true' : 'false' }, interviewLoading ? 'Sending...' : 'Send answer'),
                  h('button', { onClick: sparkInterviewTopic, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-700' }, 'Topic spark'),
                  h('button', { onClick: saveInterviewTranscript, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-700' }, 'Save transcript'),
                  h('button', { onClick: resetInterviewChat, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Reset chat')
                ),
                interviewFeedback && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200' }, 'Coach feedback: ' + interviewFeedback),
                interviewSparkMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg bg-amber-50 text-amber-900 border border-amber-200' }, interviewSparkMsg),
                interviewTranscriptMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200' }, interviewTranscriptMsg)
              ),
              h('div', { className: 'space-y-2' },
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Suggested responses'),
                interviewHintsOn && h('p', { className: 'text-[11px] text-slate-700 bg-white border border-slate-200 rounded-xl p-2 leading-relaxed' }, interviewQuestion.frame),
                h('div', { className: 'grid gap-2' },
                  interviewSuggestions.map(function(suggestion) {
                    return h('button', { key: suggestion, onClick: function() { upd('interviewInput', suggestion); }, className: 'text-left px-3 py-2 rounded-xl text-[11px] font-bold bg-white text-violet-800 border border-violet-200 hover:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-700' }, suggestion);
                  })
                ),
                h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3' },
                  h('p', { className: 'text-[10px] uppercase font-black text-slate-600' }, 'Score guide'),
                  h('p', { className: 'text-xs font-black text-violet-900' }, interviewScore + '/4 current coaching score'),
                  h('p', { className: 'text-[11px] text-slate-700 leading-relaxed mt-1' }, 'A strong answer is truthful, specific, connected to the role, and supported by a resume bullet or proof locker item.')
                )
              )
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Interview question bank'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, interviewQuestion.type + ': ' + interviewQuestion.q)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-violet-50 text-violet-800 text-[11px] font-bold border border-violet-200' }, 'Resume to proof to answer')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                INTERVIEW_QUESTIONS.map(function(q, i) {
                  var active = i === interviewQuestionIdx % INTERVIEW_QUESTIONS.length;
                  return h('button', { key: q.id, onClick: function() { updMulti({ interviewQuestionIdx: i, interviewInput: q.frame, interviewSparkMsg: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-violet-700 ' + (active ? 'bg-violet-700 text-white border-violet-700' : 'bg-white border-slate-300 text-slate-700 hover:border-violet-300') }, q.type);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Purpose'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, interviewQuestion.purpose),
                h('p', { className: 'text-xs font-black text-violet-800 pt-2 border-t border-slate-100' }, 'Answer frame'),
                h('p', { className: 'text-[11px] text-violet-800 leading-relaxed' }, interviewQuestion.frame),
                h('p', { className: 'text-xs font-black text-emerald-800 pt-2 border-t border-slate-100' }, 'Proof cue'),
                h('p', { className: 'text-[11px] text-emerald-800 leading-relaxed' }, interviewQuestion.proof)
              )
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Interview rubric cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, interviewRubricCard.icon + ' ' + interviewRubricCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200' }, 'Coach yourself')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                INTERVIEW_RUBRIC_CARDS.map(function(card, i) {
                  var active = i === interviewRubricIdx % INTERVIEW_RUBRIC_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('interviewRubricIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-violet-700 ' + (active ? 'bg-violet-700 text-white border-violet-700' : 'bg-white border-slate-300 text-slate-700 hover:border-violet-300') }, card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Check'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, interviewRubricCard.check),
                h('p', { className: 'text-xs font-black text-emerald-800 pt-2 border-t border-slate-100' }, 'Coach move'),
                h('p', { className: 'text-[11px] text-emerald-800 leading-relaxed' }, interviewRubricCard.coach)
              )
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'STAR answer builder'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'Turn proof into a spoken answer')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-200' }, 'Situation, task, action, result')
              ),
              h('div', { className: 'grid sm:grid-cols-2 gap-3' },
                h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Situation',
                  h('input', { type: 'text', value: interviewStarSituation, onChange: function(e) { upd('interviewStarSituation', e.target.value); }, placeholder: 'At a volunteer event...', className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'STAR situation' })
                ),
                h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Task',
                  h('input', { type: 'text', value: interviewStarTask, onChange: function(e) { upd('interviewStarTask', e.target.value); }, placeholder: 'We needed to...', className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'STAR task' })
                ),
                h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Action',
                  h('input', { type: 'text', value: interviewStarAction, onChange: function(e) { upd('interviewStarAction', e.target.value); }, placeholder: 'I organized, asked, built...', className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'STAR action' })
                ),
                h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Result',
                  h('input', { type: 'text', value: interviewStarResult, onChange: function(e) { upd('interviewStarResult', e.target.value); }, placeholder: 'The result was...', className: 'mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm text-slate-800', 'aria-label': 'STAR result' })
                )
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Practice answer'),
                h('p', { className: 'text-xs text-slate-800 leading-relaxed font-medium' }, interviewStarPreview)
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                h('button', { onClick: saveInterviewStarAnswer, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save STAR answer'),
                h('button', { onClick: function() { upd('interviewInput', interviewStarPreview); }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-violet-50 text-violet-800 border border-violet-200 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-700' }, 'Use in chat')
              ),
              interviewStarMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.interviewStarSaved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, interviewStarMsg)
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Interview reflection'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, interviewReflectionPrompt)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-violet-50 text-violet-800 text-[11px] font-bold border border-violet-200' }, 'Conclude and improve')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                INTERVIEW_REFLECTION_PROMPTS.map(function(prompt, i) {
                  var active = i === interviewReflectionIdx % INTERVIEW_REFLECTION_PROMPTS.length;
                  return h('button', { key: prompt, onClick: function() { updMulti({ interviewReflectionIdx: i, interviewReflectionNote: prompt, interviewReflectionMsg: '' }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold border ' + (active ? 'bg-violet-700 text-white border-violet-700' : 'bg-white text-violet-800 border-violet-200 hover:border-violet-400') }, 'Reflect ' + (i + 1));
                })
              ),
              h('textarea', { value: interviewReflectionNote, onChange: function(e) { upd('interviewReflectionNote', e.target.value); }, rows: 4, placeholder: 'Write one interview reflection, follow-up question, or support plan.', className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Interview reflection note' }),
              h('button', { onClick: function() {
                if (!interviewReflectionNote.trim()) { upd('interviewReflectionMsg', 'Write one reflection step first.'); return; }
                updMulti({ interviewReflectionMsg: 'Reflection saved: ' + interviewReflectionNote.trim(), interviewReflectionSaved: Date.now() });
                checkBadge('interviewReady');
                announceToSR('Interview reflection saved');
              }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save reflection'),
              interviewReflectionMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.interviewReflectionSaved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, interviewReflectionMsg),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Follow-up message frame'),
                h('textarea', { value: interviewFollowUpMessage, onChange: function(e) { upd('interviewFollowUpMessage', e.target.value); }, rows: 3, className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 bg-white resize-y', 'aria-label': 'Interview follow-up message' })
              )
            )
          ),
          h('div', { className: glassCard + ' space-y-3', 'data-lifeskills-interview-prep-packet': 'true' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Interview prep packet'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, 'Printable/exportable interview sheet'),
                h('p', { className: 'text-xs text-slate-700 leading-relaxed max-w-2xl' }, 'Role target, practice plan, STAR answer, transcript, reflection, and follow-up message in one plain-language packet.')
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-sky-50 border border-sky-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-sky-800' }, 'Packet sections'),
                h('p', { className: 'text-2xl font-black text-sky-900 leading-none' }, '8')
              )
            ),
            h('div', { className: 'grid lg:grid-cols-[0.8fr_1.2fr] gap-3' },
              h('div', { className: 'space-y-3' },
                h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Packet includes'),
                  ['Role target', 'Weekly practice plan', 'Checked prep habits', 'Daily practice steps', 'STAR answer', 'Coach feedback', 'Reflection', 'Follow-up and transcript'].map(function(item) {
                    return h('p', { key: item, className: 'text-[11px] text-slate-700 leading-relaxed' }, '\u2713 ' + item);
                  })
                ),
                h('div', { className: 'flex flex-wrap gap-2' },
                  h('button', { onClick: saveInterviewPrepPacket, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save packet'),
                  h('button', { onClick: copyInterviewPrepPacket, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-700' }, 'Copy packet'),
                  h('button', { onClick: downloadInterviewPrepPacket, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-700' }, 'Download .txt'),
                  h('button', { onClick: openInterviewPacketPrintView, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-violet-50 text-violet-800 border border-violet-200 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-700' }, 'Open print view')
                ),
                interviewPacketMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (interviewPacketSavedAt ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'), role: 'status' }, interviewPacketMsg)
              ),
              h('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Packet preview',
                h('textarea', { readOnly: true, value: interviewPacketPreview, rows: 16, className: 'mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 bg-white resize-y font-mono leading-relaxed', 'aria-label': 'Interview prep packet preview' })
              )
            )
          )
        ),

        tab === 'communication' && h('div', { className: 'space-y-4', 'data-lifeskills-communication': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.communication_lab', '\uD83D\uDCAC Communication & Conflict Basics Lab')),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed max-w-2xl' }, gradeText(gradeBand,
                  'Practice pausing, listening, asking for help, and using clear words.',
                  'Build communication habits for listening, asking questions, saying no, and fixing misunderstandings.',
                  'Practice I-statements, boundaries, tone-checking, repair attempts, and knowing when to get trusted support.',
                  'Model communication literacy as emotional regulation, consent, boundaries, conflict de-escalation, digital tone, repair, advocacy, and support-seeking.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-orange-50 border border-orange-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-orange-800' }, 'Communication readiness'),
                h('p', { className: 'text-2xl font-black text-orange-900 leading-none' }, Math.round(communicationDone / COMMUNICATION_CHECKS.length * 100) + '%')
              )
            ),
            h('p', { className: 'text-[11px] text-slate-700 bg-orange-50 border border-orange-200 rounded-xl p-2 leading-relaxed' }, 'Practice only. If conflict includes threats, harassment, pressure, discrimination, stalking, coercion, or fear for safety, pause and get trusted support. You do not have to handle unsafe conflict alone.')
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Communication checklist'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, communicationDone + '/' + COMMUNICATION_CHECKS.length + ' habits checked')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-orange-50 text-orange-800 text-[11px] font-bold border border-orange-200' }, 'Pause, listen, ask')
              ),
              COMMUNICATION_CHECKS.map(function(step) {
                var checked = !!communicationChecklist[step.id];
                return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-orange-300') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setCommunicationCheck(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                    h('span', { className: 'block text-[11px] text-slate-700 leading-relaxed' }, step.action),
                    h('span', { className: 'block text-[11px] text-orange-800 mt-1 font-medium' }, 'Why: ' + step.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Conversation decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the best next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200' }, 'Score ' + communicationScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, communicationCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                COMMUNICATION_ACTIONS.map(function(action) {
                  var chosen = communicationScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerCommunicationScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-orange-700 ' + (chosen ? action.tone + ' ring-2 ring-offset-1 ring-orange-700' : 'bg-white border-slate-300 text-slate-700 hover:border-orange-300') }, action.label);
                })
              ),
              communicationScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (communicationScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, communicationScenarioFb),
              h('button', { onClick: function() { updMulti({ communicationScenarioIdx: communicationScenarioIdx + 1, communicationScenarioChoice: '', communicationScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-orange-700 text-white hover:bg-orange-800 focus:outline-none focus:ring-2 focus:ring-orange-700' }, 'Next scenario')
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Message tone cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, messageToneCard.icon + ' ' + messageToneCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200' }, 'Before and after')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                MESSAGE_TONE_CARDS.map(function(card, i) {
                  var active = i === messageToneIdx % MESSAGE_TONE_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('messageToneIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-orange-700 ' + (active ? 'bg-orange-700 text-white border-orange-700' : 'bg-white border-slate-300 text-slate-700 hover:border-orange-300') }, card.icon + ' ' + card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-red-800' }, 'Before'),
                h('p', { className: 'text-[11px] text-red-800 font-medium leading-relaxed' }, messageToneCard.before),
                h('p', { className: 'text-xs font-black text-emerald-800 pt-2 border-t border-slate-100' }, 'Try instead'),
                h('p', { className: 'text-[11px] text-emerald-800 leading-relaxed' }, messageToneCard.after),
                h('p', { className: 'text-xs font-black text-slate-800 pt-2 border-t border-slate-100' }, 'Why'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, messageToneCard.why)
              )
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Boundary and repair cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, boundaryRepairCard.icon + ' ' + boundaryRepairCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-200' }, 'Script practice')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                BOUNDARY_REPAIR_CARDS.map(function(card, i) {
                  var active = i === boundaryRepairIdx % BOUNDARY_REPAIR_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('boundaryRepairIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-orange-700 ' + (active ? 'bg-orange-700 text-white border-orange-700' : 'bg-white border-slate-300 text-slate-700 hover:border-orange-300') }, card.icon + ' ' + card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Script'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, boundaryRepairCard.script),
                h('p', { className: 'text-xs font-black text-orange-800 pt-2 border-t border-slate-100' }, 'Use when'),
                h('p', { className: 'text-[11px] text-orange-800 leading-relaxed' }, boundaryRepairCard.support)
              )
            )
          ),
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Conversation plan builder'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, communicationPlanPrompt)
              ),
              h('span', { className: 'px-2 py-1 rounded-full bg-orange-50 text-orange-800 text-[11px] font-bold border border-orange-200' }, 'Ask, listen, repair')
            ),
            h('div', { className: 'flex flex-wrap gap-2' },
              COMMUNICATION_PLAN_PROMPTS.map(function(prompt, i) {
                var active = i === communicationPlanIdx % COMMUNICATION_PLAN_PROMPTS.length;
                return h('button', { key: prompt, onClick: function() { updMulti({ communicationPlanIdx: i, communicationPlanNote: prompt, communicationPlanMsg: '' }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold border ' + (active ? 'bg-orange-700 text-white border-orange-700' : 'bg-white text-orange-800 border-orange-200 hover:border-orange-400') }, 'Plan ' + (i + 1));
              })
            ),
            h('textarea', { value: communicationPlanNote, onChange: function(e) { upd('communicationPlanNote', e.target.value); }, rows: 4, placeholder: 'Write one conversation, boundary, repair, or support step.', className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Conversation plan note' }),
            h('button', { onClick: function() {
              if (!communicationPlanNote.trim()) { upd('communicationPlanMsg', 'Write one communication step first.'); return; }
              updMulti({ communicationPlanMsg: 'Plan saved: ' + communicationPlanNote.trim(), communicationPlanSaved: Date.now() });
              checkBadge('communicationReady');
              announceToSR('Communication plan saved');
            }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save communication plan'),
            communicationPlanMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.communicationPlanSaved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, communicationPlanMsg)
          )
        ),

        tab === 'timemanagement' && h('div', { className: 'space-y-4', 'data-lifeskills-time-management': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.time_management_lab', '\u23F3 Time Management & Planning Lab')),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed max-w-2xl' }, gradeText(gradeBand,
                  'Practice knowing what comes next, using reminders, and starting with one small step.',
                  'Build planning habits for tasks, time estimates, reminders, priorities, and backup plans.',
                  'Practice priorities, deadlines, buffers, focus tools, checklists, calendars, and recovery plans.',
                  'Model time management as task capture, priority triage, time blocking, transition planning, realistic estimation, reminders, and self-advocacy when timelines need support.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-yellow-50 border border-yellow-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-yellow-800' }, 'Planning readiness'),
                h('p', { className: 'text-2xl font-black text-yellow-900 leading-none' }, Math.round(timeDone / TIME_CHECKS.length * 100) + '%')
              )
            ),
            h('p', { className: 'text-[11px] text-slate-700 bg-yellow-50 border border-yellow-200 rounded-xl p-2 leading-relaxed' }, 'Practice only. Time tools are supports, not character tests. If deadlines, attention, stress, sleep, disability, or workload make planning hard, ask for support, accommodations, or a smaller next step.')
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Time management checklist'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, timeDone + '/' + TIME_CHECKS.length + ' planning habits checked')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-yellow-50 text-yellow-800 text-[11px] font-bold border border-yellow-200' }, 'Capture, choose, recover')
              ),
              TIME_CHECKS.map(function(step) {
                var checked = !!timeChecklist[step.id];
                return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-yellow-300') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setTimeCheck(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                    h('span', { className: 'block text-[11px] text-slate-700 leading-relaxed' }, step.action),
                    h('span', { className: 'block text-[11px] text-yellow-800 mt-1 font-medium' }, 'Why: ' + step.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Planning and deadline decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the best next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200' }, 'Score ' + timeScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, timeCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                TIME_ACTIONS.map(function(action) {
                  var chosen = timeScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerTimeScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-yellow-700 ' + (chosen ? action.tone + ' ring-2 ring-offset-1 ring-yellow-700' : 'bg-white border-slate-300 text-slate-700 hover:border-yellow-300') }, action.label);
                })
              ),
              timeScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (timeScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, timeScenarioFb),
              h('button', { onClick: function() { updMulti({ timeScenarioIdx: timeScenarioIdx + 1, timeScenarioChoice: '', timeScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-yellow-700 text-white hover:bg-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-700' }, 'Next scenario')
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Priority cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, priorityCard.icon + ' ' + priorityCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200' }, 'Sort the task')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                PRIORITY_CARDS.map(function(card, i) {
                  var active = i === priorityCardIdx % PRIORITY_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('priorityCardIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-yellow-700 ' + (active ? 'bg-yellow-700 text-white border-yellow-700' : 'bg-white border-slate-300 text-slate-700 hover:border-yellow-300') }, card.icon + ' ' + card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Clue'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, priorityCard.clue),
                h('p', { className: 'text-xs font-black text-yellow-800 pt-2 border-t border-slate-100' }, 'Move'),
                h('p', { className: 'text-[11px] text-yellow-800 leading-relaxed' }, priorityCard.move),
                h('p', { className: 'text-xs font-black text-slate-800 pt-2 border-t border-slate-100' }, 'Example'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, priorityCard.example)
              )
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Planning tool cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, timeToolCard.icon + ' ' + timeToolCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-200' }, 'Pick a support')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                TIME_TOOL_CARDS.map(function(card, i) {
                  var active = i === timeToolIdx % TIME_TOOL_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('timeToolIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-yellow-700 ' + (active ? 'bg-yellow-700 text-white border-yellow-700' : 'bg-white border-slate-300 text-slate-700 hover:border-yellow-300') }, card.icon + ' ' + card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Use it'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, timeToolCard.use),
                h('p', { className: 'text-xs font-black text-emerald-800 pt-2 border-t border-slate-100' }, 'Good for'),
                h('p', { className: 'text-[11px] text-emerald-800 leading-relaxed' }, timeToolCard.goodFor)
              )
            )
          ),
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Time plan builder'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, timePlanPrompt)
              ),
              h('span', { className: 'px-2 py-1 rounded-full bg-yellow-50 text-yellow-800 text-[11px] font-bold border border-yellow-200' }, 'Next step plus recovery')
            ),
            h('div', { className: 'flex flex-wrap gap-2' },
              TIME_PLAN_PROMPTS.map(function(prompt, i) {
                var active = i === timePlanIdx % TIME_PLAN_PROMPTS.length;
                return h('button', { key: prompt, onClick: function() { updMulti({ timePlanIdx: i, timePlanNote: prompt, timePlanMsg: '' }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold border ' + (active ? 'bg-yellow-700 text-white border-yellow-700' : 'bg-white text-yellow-800 border-yellow-200 hover:border-yellow-400') }, 'Plan ' + (i + 1));
              })
            ),
            h('textarea', { value: timePlanNote, onChange: function(e) { upd('timePlanNote', e.target.value); }, rows: 4, placeholder: 'Write one task, estimate, reminder, or recovery step.', className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Time plan note' }),
            h('button', { onClick: function() {
              if (!timePlanNote.trim()) { upd('timePlanMsg', 'Write one time-management step first.'); return; }
              updMulti({ timePlanMsg: 'Plan saved: ' + timePlanNote.trim(), timePlanSaved: Date.now() });
              checkBadge('timePlanner');
              announceToSR('Time plan saved');
            }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Save time plan'),
            timePlanMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.timePlanSaved ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, timePlanMsg)
          )
        ),

        // ═══ INSURANCE TAB ═══
        tab === 'insurance' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, __alloT('stem.lifeskills.health_insurance_comparison', '\uD83C\uDFE5 Health Insurance Comparison')),
            h('p', { className: 'text-xs text-slate-600' }, __alloT('stem.lifeskills.compare_two_plans_at_different_usage_l', 'Compare two plans at different usage levels.'))
          ),
          h('div', { className: glassCard + ' space-y-2' },
            h('div', { className: 'flex gap-2' },
              ['low', 'medium', 'high'].map(function(u) {
                return h('button', { key: u, onClick: function() { upd('hiUsage', u); checkBadge('insured'); }, className: 'px-3 py-1.5 rounded-xl text-xs font-bold ' + (hiUsage === u ? 'bg-teal-700 text-white' : 'bg-white border border-slate-400') }, u.charAt(0).toUpperCase() + u.slice(1) + ' Usage');
              })
            ),
            h('p', { className: 'text-[11px] text-slate-600' }, 'Scenario: ' + hiScene.visits + ' doctor visits + ' + fmtMoney(hiScene.bills) + ' in medical bills')
          ),
          h('div', { className: 'grid grid-cols-2 gap-3' },
            [{ label: __alloT('stem.lifeskills.plan_a', 'Plan A'), cost: hiCostA, plan: hiPlanA, color: '#3b82f6' }, { label: __alloT('stem.lifeskills.plan_b', 'Plan B'), cost: hiCostB, plan: hiPlanB, color: '#8b5cf6' }].map(function(p) {
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
        tab === 'dental' && h('div', { className: 'space-y-4', 'data-lifeskills-dental-care': 'true' },
          h('div', { className: glassCard + ' space-y-2' },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.dental_care_lab', '\uD83E\uDDB7 Dental Care Lab')),
            h('p', { className: 'text-xs text-slate-600 leading-relaxed' }, gradeText(gradeBand,
              'Practice tooth-care habits and learn when to ask a grown-up for help.',
              'Build a daily oral-care routine, spot tooth trouble, and compare snack choices.',
              'Connect enamel, plaque, acids, prevention, and dental plan math to everyday decisions.',
              'Explore prevention habits, symptom decision-making, dental benefit math, and oral-health risk tradeoffs.')),
            h('p', { className: 'text-[11px] text-slate-600 bg-teal-50 border border-teal-200 rounded-xl p-2' }, 'Educational practice only. Ongoing pain, swelling, injury, fever, or a knocked-out permanent tooth should be handled with professional dental guidance.')
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Daily routine builder'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, dentalRoutineDone + '/' + DENTAL_ROUTINE_STEPS.length + ' habits planned')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200' }, Math.round(dentalRoutineDone / DENTAL_ROUTINE_STEPS.length * 100) + '% ready')
              ),
              DENTAL_ROUTINE_STEPS.map(function(step) {
                var checked = !!dentalRoutine[step.id];
                return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-teal-200') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setDentalRoutine(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                    h('span', { className: 'block text-[11px] text-slate-600 leading-relaxed' }, step.action),
                    h('span', { className: 'block text-[11px] text-teal-700 mt-1 font-medium' }, 'Why: ' + step.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Tooth trouble decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the best next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold' }, 'Score ' + dentalScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, dentalCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                DENTAL_ACTIONS.map(function(action) {
                  var chosen = dentalScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerDentalScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all ' + (chosen ? action.tone + ' ring-2 ring-offset-1' : 'bg-white border-slate-300 text-slate-700 hover:border-teal-300') }, action.label);
                })
              ),
              dentalScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (dentalScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800') }, dentalScenarioFb),
              h('button', { onClick: function() { updMulti({ dentalScenarioIdx: dentalScenarioIdx + 1, dentalScenarioChoice: '', dentalScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-teal-700 text-white' }, 'Next scenario')
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Dental plan math'),
              h('p', { className: 'text-xs text-slate-600 leading-relaxed' }, 'Estimate a simplified dental bill. Real plans vary by network, procedure type, waiting periods, and annual maximum rules.'),
              slider('Procedure cost', dentalVisitCost, 50, 2500, 25, 'dentalVisitCost', fmtMoney),
              slider('Deductible left', dentalDeductible, 0, 500, 25, 'dentalDeductible', fmtMoney),
              slider('Your coinsurance', dentalCoinsurance, 0, 60, 5, 'dentalCoinsurance', function(v) { return v + '%'; }),
              slider('Annual max left', dentalAnnualMax, 100, 3000, 100, 'dentalAnnualMax', fmtMoney),
              h('div', { className: 'grid grid-cols-3 gap-2' },
                h('div', { className: 'text-center p-2 rounded-xl bg-blue-50 border border-blue-100' }, h('p', { className: 'text-[10px] uppercase font-bold text-blue-700' }, 'Plan pays'), h('p', { className: 'text-lg font-black text-blue-700' }, fmtMoney(dentalPlanPay))),
                h('div', { className: 'text-center p-2 rounded-xl bg-emerald-50 border border-emerald-100' }, h('p', { className: 'text-[10px] uppercase font-bold text-emerald-700' }, 'You pay'), h('p', { className: 'text-lg font-black text-emerald-700' }, fmtMoney(dentalYouPay))),
                h('div', { className: 'text-center p-2 rounded-xl bg-slate-50 border border-slate-200' }, h('p', { className: 'text-[10px] uppercase font-bold text-slate-700' }, 'Bill'), h('p', { className: 'text-lg font-black text-slate-700' }, fmtMoney(dentalVisitCost)))
              ),
              h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, 'Formula: deductible first, then plan pays the remaining covered amount after your coinsurance, up to the annual max left.')
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Snack and drink risk check'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, dentalSnack.icon + ' ' + dentalSnack.name)
                ),
                h('span', { className: 'px-2 py-1 rounded-full text-[11px] font-bold border ' + dentalSnackColor }, dentalSnack.risk + ' risk')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                DENTAL_SNACKS.map(function(snack, i) {
                  var active = i === dentalSnackIdx % DENTAL_SNACKS.length;
                  return h('button', { key: snack.name, onClick: function() { upd('dentalSnackIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border ' + (active ? 'bg-teal-700 text-white border-teal-700' : 'bg-white border-slate-300 text-slate-700 hover:border-teal-300') }, snack.icon + ' ' + snack.name);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-bold text-slate-800' }, dentalSnack.why),
                h('p', { className: 'text-[11px] text-teal-700 font-medium' }, 'Try this: ' + dentalSnack.better)
              ),
              h('div', { className: 'rounded-2xl bg-slate-900 text-white p-3 space-y-2' },
                h('p', { className: 'text-[11px] uppercase font-bold text-cyan-200' }, 'Signals to ask for help'),
                h('ul', { className: 'space-y-1 text-[11px] text-slate-100 leading-relaxed' },
                  h('li', null, 'Pain that does not go away or wakes you up.'),
                  h('li', null, 'Swelling, fever, pus, or trouble swallowing.'),
                  h('li', null, 'A broken, loose, or knocked-out permanent tooth.'),
                  h('li', null, 'Bleeding or sores that keep returning.')
                )
              )
            )
          )
        ),

        tab === 'bodycare' && h('div', { className: 'space-y-4', 'data-lifeskills-body-care': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.body_care_lab', '\uD83E\uDDCD Body Care & Ergonomics Lab')),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed max-w-2xl' }, gradeText(gradeBand,
                  'Notice comfort, move gently, and ask a grown-up when something hurts.',
                  'Practice a comfortable setup, small movement breaks, and asking for help when your body sends a warning sign.',
                  'Use ergonomics to fit the task to the person: reach, light, screen height, support, breaks, and accessibility needs.',
                  'Model body care as applied ergonomics: task demands, biomechanics, accessibility, recovery breaks, and self-advocacy.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-teal-50 border border-teal-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-teal-700' }, 'Comfort readiness'),
                h('p', { className: 'text-2xl font-black text-teal-800 leading-none' }, bodyReadiness + '%')
              )
            ),
            h('p', { className: 'text-[11px] text-slate-600 bg-teal-50 border border-teal-200 rounded-xl p-2' }, 'Educational practice only. Pain that is severe, worsening, injury-related, or paired with numbness, weakness, trouble breathing, or other concerning symptoms should be shared with a trusted adult or health professional.')
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Comfort check'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, bodyCareDone + '/' + BODYCARE_CHECKS.length + ' areas checked')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200' }, Math.round(bodyCareDone / BODYCARE_CHECKS.length * 100) + '% complete')
              ),
              BODYCARE_CHECKS.map(function(step) {
                var checked = !!bodyCareChecklist[step.id];
                return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-teal-200') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setBodyCareCheck(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                    h('span', { className: 'block text-[11px] text-slate-600 leading-relaxed' }, step.action),
                    h('span', { className: 'block text-[11px] text-teal-700 mt-1 font-medium' }, 'Why: ' + step.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Setup builder'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, bodySetupTips.length ? bodySetupTips.length + ' adjustment ideas' : 'Setup looks balanced')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold' }, 'Fit the task to you')
              ),
              slider('Screen or book height', bodyScreenHeight, 1, 5, 1, 'bodyScreenHeight', function(v) { return ['Very low', 'Low', 'Comfortable', 'High', 'Very high'][v - 1] || v; }),
              slider('Reach distance', bodyReach, 1, 5, 1, 'bodyReach', function(v) { return ['Cramped', 'Close', 'Relaxed', 'Reaching', 'Far'][v - 1] || v; }),
              slider('Light and glare', bodyLighting, 1, 5, 1, 'bodyLighting', function(v) { return ['Hard to see', 'Dim', 'Readable', 'Bright', 'Glare risk'][v - 1] || v; }),
              slider('Resets per hour', bodyBreaks, 0, 6, 1, 'bodyBreaks', function(v) { return v + ' reset' + (v === 1 ? '' : 's'); }),
              h('div', { className: 'space-y-1.5' },
                bodySetupTips.length ? bodySetupTips.map(function(tip, i) {
                  return h('p', { key: i, className: 'text-[11px] rounded-lg bg-amber-50 border border-amber-200 text-amber-800 p-2 font-medium' }, '\uD83D\uDCA1 ' + tip);
                }) : h('p', { className: 'text-[11px] rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 p-2 font-bold' }, '\u2705 Nice: the setup is flexible, readable, reachable, and includes breaks.')
              )
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Body-care decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the best next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold' }, 'Score ' + bodyScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, bodyCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                BODYCARE_ACTIONS.map(function(action) {
                  var chosen = bodyScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerBodyCareScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all ' + (chosen ? action.tone + ' ring-2 ring-offset-1' : 'bg-white border-slate-300 text-slate-700 hover:border-teal-300') }, action.label);
                })
              ),
              bodyScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (bodyScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800') }, bodyScenarioFb),
              h('button', { onClick: function() { updMulti({ bodyScenarioIdx: bodyScenarioIdx + 1, bodyScenarioChoice: '', bodyScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-teal-700 text-white' }, 'Next scenario')
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Reset routine cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, bodyReset.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-teal-50 text-teal-800 text-[11px] font-bold border border-teal-200' }, bodyReset.label)
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                BODYCARE_RESETS.map(function(reset, i) {
                  var active = i === bodyResetIdx % BODYCARE_RESETS.length;
                  return h('button', { key: reset.id, onClick: function() { upd('bodyResetIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border ' + (active ? 'bg-teal-700 text-white border-teal-700' : 'bg-white border-slate-300 text-slate-700 hover:border-teal-300') }, reset.label);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-bold text-slate-800' }, 'Good for: ' + bodyReset.goodFor),
                h('ol', { className: 'space-y-1 text-[11px] text-slate-700 leading-relaxed list-decimal pl-4' },
                  bodyReset.steps.map(function(step) { return h('li', { key: step }, step); })
                )
              ),
              h('button', { onClick: function() { checkBadge('bodyCareReady'); awardXP(10, 'Body care reset practiced'); announceToSR('Body care reset practiced'); }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800' }, 'Mark reset practiced')
            )
          ),
          h('div', { className: glassCard + ' grid sm:grid-cols-3 gap-3' },
            h('div', { className: 'rounded-xl bg-blue-50 border border-blue-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-blue-800' }, 'Flexible posture'), h('p', { className: 'text-sm font-black text-blue-900' }, 'Change beats freeze'), h('p', { className: 'text-[11px] text-blue-800 leading-relaxed' }, 'The best position is one you can comfortably change.')),
            h('div', { className: 'rounded-xl bg-emerald-50 border border-emerald-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-emerald-800' }, 'Accessibility'), h('p', { className: 'text-sm font-black text-emerald-900' }, 'Fit the environment'), h('p', { className: 'text-[11px] text-emerald-800 leading-relaxed' }, 'Seated, standing, wheeled, sensory, and assistive-tool needs all count.')),
            h('div', { className: 'rounded-xl bg-red-50 border border-red-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-red-800' }, 'Ask for help'), h('p', { className: 'text-sm font-black text-red-900' }, 'Do not ignore red flags'), h('p', { className: 'text-[11px] text-red-800 leading-relaxed' }, 'Numbness, weakness, severe pain, injury, or symptoms that do not improve need support.'))
          )
        ),

        tab === 'sleep' && h('div', { className: 'space-y-4', 'data-lifeskills-sleep-energy': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.sleep_energy_lab', '\uD83C\uDF19 Sleep & Energy Lab')),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed max-w-2xl' }, gradeText(gradeBand,
                  'Practice bedtime routines, wake-up routines, and asking for help when sleep feels hard.',
                  'Plan a wind-down routine, wake time, screen choices, and daytime energy supports.',
                  'Connect sleep routines to attention, mood, learning, light, caffeine timing, and recovery.',
                  'Model sleep as a practical planning system: circadian anchors, sleep opportunity, stimulation, stress loops, and support pathways.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-blue-700' }, 'Plan readiness'),
                h('p', { className: 'text-2xl font-black text-blue-800 leading-none' }, Math.round(sleepPlanScore) + '%')
              )
            ),
            h('p', { className: 'text-[11px] text-slate-600 bg-blue-50 border border-blue-200 rounded-xl p-2' }, 'Educational practice only. Ongoing insomnia, nightmares, loud frequent snoring, trouble breathing during sleep, or unsafe daytime sleepiness should be discussed with a trusted adult or health professional.')
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Wind-down routine builder'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, sleepRoutineDone + '/' + SLEEP_ROUTINE_STEPS.length + ' habits planned')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200' }, Math.round(sleepRoutineDone / SLEEP_ROUTINE_STEPS.length * 100) + '% ready')
              ),
              SLEEP_ROUTINE_STEPS.map(function(step) {
                var checked = !!sleepRoutine[step.id];
                return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-blue-200') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setSleepRoutine(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                    h('span', { className: 'block text-[11px] text-slate-600 leading-relaxed' }, step.action),
                    h('span', { className: 'block text-[11px] text-blue-700 mt-1 font-medium' }, 'Why: ' + step.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Bedtime calculator'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, fmtClockMinutes(sleepWindDownStart) + ' wind-down')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold' }, fmtClockMinutes(sleepBedMinutes) + ' bedtime')
              ),
              slider('Wake time', sleepWakeMinutes, 300, 660, 15, 'sleepWakeMinutes', fmtClockMinutes),
              slider('Sleep target', sleepNeedHours, 6, 10.5, 0.5, 'sleepNeedHours', function(v) { return v + ' hours'; }),
              slider('Wind-down length', sleepWindDown, 10, 90, 5, 'sleepWindDown', function(v) { return v + ' minutes'; }),
              slider('Latest caffeine time', sleepCaffeineCutoff, 10, 19, 1, 'sleepCaffeineCutoff', function(v) { return fmtClockMinutes(v * 60); }),
              slider('Exciting screen time near bed', sleepScreenMinutes, 0, 120, 5, 'sleepScreenMinutes', function(v) { return v + ' minutes'; }),
              h('div', { className: 'grid grid-cols-3 gap-2' },
                h('div', { className: 'text-center p-2 rounded-xl bg-indigo-50 border border-indigo-100' }, h('p', { className: 'text-[10px] uppercase font-bold text-indigo-700' }, 'Wind down'), h('p', { className: 'text-sm font-black text-indigo-700' }, fmtClockMinutes(sleepWindDownStart))),
                h('div', { className: 'text-center p-2 rounded-xl bg-blue-50 border border-blue-100' }, h('p', { className: 'text-[10px] uppercase font-bold text-blue-700' }, 'Bedtime'), h('p', { className: 'text-sm font-black text-blue-700' }, fmtClockMinutes(sleepBedMinutes))),
                h('div', { className: 'text-center p-2 rounded-xl bg-emerald-50 border border-emerald-100' }, h('p', { className: 'text-[10px] uppercase font-bold text-emerald-700' }, 'Wake'), h('p', { className: 'text-sm font-black text-emerald-700' }, fmtClockMinutes(sleepWakeMinutes)))
              ),
              h('button', { onClick: function() { checkBadge('sleepPlanner'); awardXP(10, 'Sleep plan saved'); announceToSR('Sleep plan saved'); }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-blue-700 text-white hover:bg-blue-800' }, 'Save sleep plan')
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Sleep and energy decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the best next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold' }, 'Score ' + sleepScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, sleepCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                SLEEP_ACTIONS.map(function(action) {
                  var chosen = sleepScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerSleepScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all ' + (chosen ? action.tone + ' ring-2 ring-offset-1' : 'bg-white border-slate-300 text-slate-700 hover:border-blue-300') }, action.label);
                })
              ),
              sleepScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (sleepScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800') }, sleepScenarioFb),
              h('button', { onClick: function() { updMulti({ sleepScenarioIdx: sleepScenarioIdx + 1, sleepScenarioChoice: '', sleepScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-blue-700 text-white' }, 'Next scenario')
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Daytime energy supports'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, Object.keys(sleepEnergyTools).filter(function(k) { return !!sleepEnergyTools[k]; }).length + ' selected')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200' }, 'Pick useful supports')
              ),
              h('div', { className: 'grid sm:grid-cols-2 gap-2' },
                SLEEP_ENERGY_TOOLS.map(function(tool) {
                  var active = !!sleepEnergyTools[tool.id];
                  return h('button', { key: tool.id, type: 'button', 'aria-pressed': active, onClick: function() { toggleSleepEnergyTool(tool.id); }, className: 'text-left p-3 rounded-xl border transition-all ' + (active ? 'bg-blue-50 border-blue-400 shadow-sm' : 'bg-white border-slate-300 hover:border-blue-300') },
                    h('div', { className: 'flex items-start gap-2' },
                      h('span', { className: 'text-xl', 'aria-hidden': 'true' }, tool.icon),
                      h('span', { className: 'min-w-0' },
                        h('span', { className: 'block text-xs font-black text-slate-800' }, tool.title),
                        h('span', { className: 'block text-[11px] text-slate-600 leading-relaxed' }, tool.use)
                      )
                    )
                  );
                })
              ),
              h('p', { className: 'text-[11px] text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-2' }, 'Energy planning is not about forcing through exhaustion. It is about matching the support to the reason: sleep debt, hunger, dehydration, overload, stress, boredom, or task size.')
            )
          ),
          h('div', { className: glassCard + ' grid sm:grid-cols-3 gap-3' },
            h('div', { className: 'rounded-xl bg-indigo-50 border border-indigo-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-indigo-800' }, 'Anchor'), h('p', { className: 'text-sm font-black text-indigo-900' }, 'Wake time first'), h('p', { className: 'text-[11px] text-indigo-800 leading-relaxed' }, 'A steady wake time makes bedtime math easier.')),
            h('div', { className: 'rounded-xl bg-blue-50 border border-blue-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-blue-800' }, 'Transition'), h('p', { className: 'text-sm font-black text-blue-900' }, 'Wind down before bed'), h('p', { className: 'text-[11px] text-blue-800 leading-relaxed' }, 'The routine starts before the pillow.')),
            h('div', { className: 'rounded-xl bg-red-50 border border-red-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-red-800' }, 'Support'), h('p', { className: 'text-sm font-black text-red-900' }, 'Ask when it repeats'), h('p', { className: 'text-[11px] text-red-800 leading-relaxed' }, 'Ongoing sleep trouble or unsafe sleepiness is a support signal.'))
          )
        ),

        tab === 'meds' && h('div', { className: 'space-y-4', 'data-lifeskills-medication-labels': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.medication_labels_lab', '\uD83D\uDC8A Medication & Labels Lab')),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed max-w-2xl' }, gradeText(gradeBand,
                  'Practice asking a grown-up and reading important label words.',
                  'Read sample labels, spot active ingredients, and practice asking for help when directions are confusing.',
                  'Build medication-label literacy: directions, warnings, storage, expiration, duplicate ingredients, and pharmacist questions.',
                  'Practice medication-label analysis using mock labels: active ingredients, timing, warnings, interactions, storage, expiration, and support pathways.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-violet-50 border border-violet-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-violet-700' }, 'Label readiness'),
                h('p', { className: 'text-2xl font-black text-violet-800 leading-none' }, Math.round(medChecklistDone / MED_LABEL_PARTS.length * 100) + '%')
              )
            ),
            h('p', { className: 'text-[11px] text-slate-600 bg-violet-50 border border-violet-200 rounded-xl p-2' }, 'Educational practice only. These are mock labels, not dosing instructions. Real medication decisions should follow the actual label and guidance from a pharmacist, prescriber, nurse, or trusted adult.')
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Label safety checklist'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, medChecklistDone + '/' + MED_LABEL_PARTS.length + ' parts checked')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-violet-50 text-violet-800 text-[11px] font-bold border border-violet-200' }, 'Read before deciding')
              ),
              MED_LABEL_PARTS.map(function(part) {
                var checked = !!medChecklist[part.id];
                return h('label', { key: part.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-violet-200') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setMedChecklist(part.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': part.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, part.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, part.title),
                    h('span', { className: 'block text-[11px] text-slate-600 leading-relaxed' }, part.action),
                    h('span', { className: 'block text-[11px] text-violet-700 mt-1 font-medium' }, 'Why: ' + part.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Mock label decoder'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, medLabel.name)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold' }, 'Sample only')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                MED_SAMPLE_LABELS.map(function(label, i) {
                  var active = i === medLabelIdx % MED_SAMPLE_LABELS.length;
                  return h('button', { key: label.name, onClick: function() { updMulti({ medLabelIdx: i, medLabelAnswer: '', medLabelFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border ' + (active ? 'bg-violet-700 text-white border-violet-700' : 'bg-white border-slate-300 text-slate-700 hover:border-violet-300') }, label.name);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2 text-[11px]' },
                h('p', { className: 'font-black text-slate-800 text-xs' }, medLabel.name),
                h('p', null, h('span', { className: 'font-bold text-violet-700' }, 'Active ingredient: '), medLabel.active),
                h('p', null, h('span', { className: 'font-bold text-violet-700' }, 'Use: '), medLabel.use),
                h('p', null, h('span', { className: 'font-bold text-violet-700' }, 'Directions: '), medLabel.directions),
                h('p', null, h('span', { className: 'font-bold text-violet-700' }, 'Warnings: '), medLabel.warnings),
                h('p', null, h('span', { className: 'font-bold text-violet-700' }, 'Storage: '), medLabel.storage)
              ),
              h('p', { className: 'text-xs font-bold text-slate-700' }, medLabel.question),
              h('div', { className: 'flex gap-2' },
                h('input', { type: 'text', value: medLabelAnswer, onChange: function(e) { upd('medLabelAnswer', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') checkMedLabelAnswer(); }, placeholder: 'Type your answer...', className: 'flex-1 px-3 py-2 border border-slate-400 rounded-xl text-sm', 'aria-label': 'Mock label answer' }),
                h('button', { onClick: checkMedLabelAnswer, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-violet-700 text-white hover:bg-violet-800' }, 'Check')
              ),
              medLabelFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (medLabelFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800') }, medLabelFb)
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Medication label decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the safest next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold' }, 'Score ' + medScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, medCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                MED_ACTIONS.map(function(action) {
                  var chosen = medScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerMedScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all ' + (chosen ? action.tone + ' ring-2 ring-offset-1' : 'bg-white border-slate-300 text-slate-700 hover:border-violet-300') }, action.label);
                })
              ),
              medScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (medScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800') }, medScenarioFb),
              h('button', { onClick: function() { updMulti({ medScenarioIdx: medScenarioIdx + 1, medScenarioChoice: '', medScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-violet-700 text-white' }, 'Next scenario')
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Questions to ask'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, medQuestionPrompt)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-violet-50 text-violet-800 text-[11px] font-bold border border-violet-200' }, 'Self-advocacy')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                MED_QUESTION_PROMPTS.map(function(prompt, i) {
                  var active = i === medQuestionIdx % MED_QUESTION_PROMPTS.length;
                  return h('button', { key: prompt, onClick: function() { updMulti({ medQuestionIdx: i, medQuestionNote: prompt, medQuestionMsg: '' }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold border ' + (active ? 'bg-violet-700 text-white border-violet-700' : 'bg-white text-violet-700 border-violet-200') }, 'Q' + (i + 1));
                })
              ),
              h('textarea', { value: medQuestionNote, onChange: function(e) { upd('medQuestionNote', e.target.value); }, rows: 4, placeholder: 'Write a question you would ask a pharmacist, prescriber, nurse, or trusted adult.', className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Medication question note' }),
              h('button', { onClick: function() {
                if (!medQuestionNote.trim()) { upd('medQuestionMsg', 'Write one question first.'); return; }
                updMulti({ medQuestionMsg: 'Question saved: ' + medQuestionNote.trim(), medQuestionSaved: Date.now() });
                checkBadge('medLabelReader');
                announceToSR('Medication question saved');
              }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800' }, 'Save question'),
              medQuestionMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.medQuestionSaved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200') }, medQuestionMsg)
            )
          ),
          h('div', { className: glassCard + ' grid sm:grid-cols-3 gap-3' },
            h('div', { className: 'rounded-xl bg-blue-50 border border-blue-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-blue-800' }, 'Duplicate check'), h('p', { className: 'text-sm font-black text-blue-900' }, 'Active ingredients'), h('p', { className: 'text-[11px] text-blue-800 leading-relaxed' }, 'Two products can share the same ingredient even if their front labels look different.')),
            h('div', { className: 'rounded-xl bg-amber-50 border border-amber-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-amber-800' }, 'Ask early'), h('p', { className: 'text-sm font-black text-amber-900' }, 'Confusing label?'), h('p', { className: 'text-[11px] text-amber-800 leading-relaxed' }, 'A pharmacist or trusted adult can explain directions, warnings, and storage.')),
            h('div', { className: 'rounded-xl bg-red-50 border border-red-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-red-800' }, 'Urgent signs'), h('p', { className: 'text-sm font-black text-red-900' }, 'Get help now'), h('p', { className: 'text-[11px] text-red-800 leading-relaxed' }, 'Trouble breathing, swelling, fainting, or severe reactions need urgent help.'))
          )
        ),

        tab === 'appointments' && h('div', { className: 'space-y-4', 'data-lifeskills-appointments': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.appointments_lab', '\uD83D\uDCC5 Appointments & Self-Advocacy Lab')),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed max-w-2xl' }, gradeText(gradeBand,
                  'Practice telling a helper what you need and asking questions.',
                  'Prepare what to bring, what to say, and what to ask at appointments or support meetings.',
                  'Build self-advocacy with timelines, examples, questions, accommodations, and follow-up plans.',
                  'Practice appointment literacy: scheduling, documentation, support people, consent/privacy questions, accommodations, and next-step planning.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-cyan-50 border border-cyan-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-cyan-700' }, 'Prep readiness'),
                h('p', { className: 'text-2xl font-black text-cyan-800 leading-none' }, Math.round(appointmentPrepDone / APPOINTMENT_PREP_STEPS.length * 100) + '%')
              )
            ),
            h('p', { className: 'text-[11px] text-slate-600 bg-cyan-50 border border-cyan-200 rounded-xl p-2' }, 'Practice for health, dental, school, work, and service meetings. Urgent symptoms or safety concerns should use urgent help instead of waiting for a routine appointment.')
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Appointment prep checklist'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, appointmentPrepDone + '/' + APPOINTMENT_PREP_STEPS.length + ' steps planned')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-cyan-50 text-cyan-800 text-[11px] font-bold border border-cyan-200' }, 'Bring notes')
              ),
              APPOINTMENT_PREP_STEPS.map(function(step) {
                var checked = !!appointmentPrep[step.id];
                return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-cyan-200') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setAppointmentPrep(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                    h('span', { className: 'block text-[11px] text-slate-600 leading-relaxed' }, step.action),
                    h('span', { className: 'block text-[11px] text-cyan-700 mt-1 font-medium' }, 'Why: ' + step.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Appointment type planner'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, appointmentType.icon + ' ' + appointmentType.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold' }, 'What to bring')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                APPOINTMENT_TYPES.map(function(type, i) {
                  var active = i === appointmentTypeIdx % APPOINTMENT_TYPES.length;
                  return h('button', { key: type.id, onClick: function() { upd('appointmentTypeIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border ' + (active ? 'bg-cyan-700 text-white border-cyan-700' : 'bg-white border-slate-300 text-slate-700 hover:border-cyan-300') }, type.icon + ' ' + type.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Bring or prepare'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, appointmentType.bring),
                h('p', { className: 'text-xs font-black text-slate-800 pt-2 border-t border-slate-100' }, 'Useful question'),
                h('p', { className: 'text-[11px] text-cyan-700 font-medium leading-relaxed' }, appointmentType.question)
              ),
              h('button', { onClick: function() { checkBadge('appointmentReady'); awardXP(10, 'Appointment prep practiced'); announceToSR('Appointment prep practiced'); }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-cyan-700 text-white hover:bg-cyan-800' }, 'Mark prep practiced')
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Appointment decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the best next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold' }, 'Score ' + appointmentScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, appointmentCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                APPOINTMENT_ACTIONS.map(function(action) {
                  var chosen = appointmentScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerAppointmentScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all ' + (chosen ? action.tone + ' ring-2 ring-offset-1' : 'bg-white border-slate-300 text-slate-700 hover:border-cyan-300') }, action.label);
                })
              ),
              appointmentScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (appointmentScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800') }, appointmentScenarioFb),
              h('button', { onClick: function() { updMulti({ appointmentScenarioIdx: appointmentScenarioIdx + 1, appointmentScenarioChoice: '', appointmentScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-cyan-700 text-white' }, 'Next scenario')
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Self-advocacy script builder'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, appointmentScriptPrompt)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-cyan-50 text-cyan-800 text-[11px] font-bold border border-cyan-200' }, 'Practice words')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                APPOINTMENT_SCRIPT_PROMPTS.map(function(prompt, i) {
                  var active = i === appointmentScriptIdx % APPOINTMENT_SCRIPT_PROMPTS.length;
                  return h('button', { key: prompt, onClick: function() { updMulti({ appointmentScriptIdx: i, appointmentScriptNote: prompt, appointmentScriptMsg: '' }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold border ' + (active ? 'bg-cyan-700 text-white border-cyan-700' : 'bg-white text-cyan-700 border-cyan-200') }, 'Line ' + (i + 1));
                })
              ),
              h('textarea', { value: appointmentScriptNote, onChange: function(e) { upd('appointmentScriptNote', e.target.value); }, rows: 4, placeholder: 'Write a sentence you could say or show during the appointment.', className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Appointment script note' }),
              h('button', { onClick: function() {
                if (!appointmentScriptNote.trim()) { upd('appointmentScriptMsg', 'Write one sentence first.'); return; }
                updMulti({ appointmentScriptMsg: 'Script saved: ' + appointmentScriptNote.trim(), appointmentScriptSaved: Date.now() });
                checkBadge('selfAdvocate');
                announceToSR('Appointment script saved');
              }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800' }, 'Save script'),
              appointmentScriptMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.appointmentScriptSaved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200') }, appointmentScriptMsg)
            )
          ),
          h('div', { className: glassCard + ' grid sm:grid-cols-3 gap-3' },
            h('div', { className: 'rounded-xl bg-blue-50 border border-blue-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-blue-800' }, 'Say the reason'), h('p', { className: 'text-sm font-black text-blue-900' }, 'One clear sentence'), h('p', { className: 'text-[11px] text-blue-800 leading-relaxed' }, 'Start with the main goal so the helper knows where to focus.')),
            h('div', { className: 'rounded-xl bg-emerald-50 border border-emerald-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-emerald-800' }, 'Ask clearly'), h('p', { className: 'text-sm font-black text-emerald-900' }, 'Repeat or write down'), h('p', { className: 'text-[11px] text-emerald-800 leading-relaxed' }, 'It is okay to ask for simpler words, notes, or more time.')),
            h('div', { className: 'rounded-xl bg-red-50 border border-red-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-red-800' }, 'Urgent signs'), h('p', { className: 'text-sm font-black text-red-900' }, 'Do not wait'), h('p', { className: 'text-[11px] text-red-800 leading-relaxed' }, 'Severe, sudden, or unsafe symptoms need urgent help.'))
          )
        ),

        tab === 'homesafety' && h('div', { className: 'space-y-4', 'data-lifeskills-home-safety': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.home_safety_lab', '\uD83D\uDEE1\uFE0F Home Safety Lab')),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed max-w-2xl' }, gradeText(gradeBand,
                  'Practice safe choices at home: alarms, exits, helpers, and asking for emergency help.',
                  'Build a home safety plan for alarms, exits, cleaning products, first aid, and emergency contacts.',
                  'Use prevention plus response: check risks early, know when to leave, and choose the right kind of help.',
                  'Model home safety as risk reduction, emergency communication, first-aid triage, chemical safety, and practiced response routines.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-red-700' }, 'Safety readiness'),
                h('p', { className: 'text-2xl font-black text-red-800 leading-none' }, Math.round(homeSafetyDone / HOME_SAFETY_CHECKS.length * 100) + '%')
              )
            ),
            h('p', { className: 'text-[11px] text-slate-600 bg-red-50 border border-red-200 rounded-xl p-2' }, 'Practice only. If there is immediate danger, smoke/fire, carbon monoxide alarm, serious injury, trouble breathing, or an unconscious person, leave if needed and call emergency help.')
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Home safety checklist'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, homeSafetyDone + '/' + HOME_SAFETY_CHECKS.length + ' safety checks')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-red-50 text-red-800 text-[11px] font-bold border border-red-200' }, 'Prepare before danger')
              ),
              HOME_SAFETY_CHECKS.map(function(step) {
                var checked = !!homeSafetyChecklist[step.id];
                return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-red-200') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setHomeSafetyCheck(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                    h('span', { className: 'block text-[11px] text-slate-600 leading-relaxed' }, step.action),
                    h('span', { className: 'block text-[11px] text-red-700 mt-1 font-medium' }, 'Why: ' + step.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Home safety decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the safest next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold' }, 'Score ' + homeSafetyScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, homeSafetyCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                HOME_SAFETY_ACTIONS.map(function(action) {
                  var chosen = homeSafetyScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerHomeSafetyScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all ' + (chosen ? action.tone + ' ring-2 ring-offset-1' : 'bg-white border-slate-300 text-slate-700 hover:border-red-300') }, action.label);
                })
              ),
              homeSafetyScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (homeSafetyScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800') }, homeSafetyScenarioFb),
              h('button', { onClick: function() { updMulti({ homeSafetyScenarioIdx: homeSafetyScenarioIdx + 1, homeSafetyScenarioChoice: '', homeSafetyScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-red-700 text-white' }, 'Next scenario')
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'First-aid decision cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, firstAidCard.icon + ' ' + firstAidCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-red-50 text-red-800 text-[11px] font-bold border border-red-200' }, 'Know when to escalate')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                FIRST_AID_CARDS.map(function(card, i) {
                  var active = i === firstAidIdx % FIRST_AID_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('firstAidIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border ' + (active ? 'bg-red-700 text-white border-red-700' : 'bg-white border-slate-300 text-slate-700 hover:border-red-300') }, card.icon + ' ' + card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'First step'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, firstAidCard.first),
                h('p', { className: 'text-xs font-black text-red-700 pt-2 border-t border-slate-100' }, 'Get urgent help when'),
                h('p', { className: 'text-[11px] text-red-700 font-medium leading-relaxed' }, firstAidCard.urgent)
              )
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Emergency plan builder'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, homePlanPrompt)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-red-50 text-red-800 text-[11px] font-bold border border-red-200' }, 'Write it down')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                HOME_SAFETY_PLAN_PROMPTS.map(function(prompt, i) {
                  var active = i === homePlanIdx % HOME_SAFETY_PLAN_PROMPTS.length;
                  return h('button', { key: prompt, onClick: function() { updMulti({ homePlanIdx: i, homePlanNote: prompt, homePlanMsg: '' }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold border ' + (active ? 'bg-red-700 text-white border-red-700' : 'bg-white text-red-700 border-red-200') }, 'Plan ' + (i + 1));
                })
              ),
              h('textarea', { value: homePlanNote, onChange: function(e) { upd('homePlanNote', e.target.value); }, rows: 4, placeholder: 'Write one part of your emergency plan.', className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Home safety plan note' }),
              h('button', { onClick: function() {
                if (!homePlanNote.trim()) { upd('homePlanMsg', 'Write one plan note first.'); return; }
                updMulti({ homePlanMsg: 'Plan saved: ' + homePlanNote.trim(), homePlanSaved: Date.now() });
                checkBadge('homeSafetyReady');
                announceToSR('Home safety plan saved');
              }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800' }, 'Save plan note'),
              homePlanMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.homePlanSaved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200') }, homePlanMsg)
            )
          ),
          h('div', { className: glassCard + ' grid sm:grid-cols-3 gap-3' },
            h('div', { className: 'rounded-xl bg-blue-50 border border-blue-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-blue-800' }, 'Alarms'), h('p', { className: 'text-sm font-black text-blue-900' }, 'Test and respond'), h('p', { className: 'text-[11px] text-blue-800 leading-relaxed' }, 'Smoke and CO alarms are warnings to act, not background noise.')),
            h('div', { className: 'rounded-xl bg-amber-50 border border-amber-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-amber-800' }, 'Cleaners'), h('p', { className: 'text-sm font-black text-amber-900' }, 'Never mix'), h('p', { className: 'text-[11px] text-amber-800 leading-relaxed' }, 'Use one product as directed and keep air moving.')),
            h('div', { className: 'rounded-xl bg-red-50 border border-red-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-red-800' }, 'Emergency'), h('p', { className: 'text-sm font-black text-red-900' }, 'Leave, call, meet'), h('p', { className: 'text-[11px] text-red-800 leading-relaxed' }, 'Get out when needed, call from safety, and meet at the plan spot.'))
          )
        ),

        tab === 'digitalsafety' && h('div', { className: 'space-y-4', 'data-lifeskills-digital-safety': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.digital_safety_lab', '\uD83D\uDD10 Digital Safety Lab')),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed max-w-2xl' }, gradeText(gradeBand,
                  'Practice asking before sharing, clicking, or talking to someone unsafe online.',
                  'Build safer habits for passwords, privacy, links, messages, and asking for help online.',
                  'Spot phishing, secure accounts, review privacy, and practice block/report/save-evidence decisions.',
                  'Model digital safety as account security, privacy, social engineering defense, consent, reporting, and recovery planning.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-blue-700' }, 'Digital readiness'),
                h('p', { className: 'text-2xl font-black text-blue-800 leading-none' }, Math.round(digitalChecklistDone / DIGITAL_SAFETY_CHECKS.length * 100) + '%')
              )
            ),
            h('p', { className: 'text-[11px] text-slate-600 bg-blue-50 border border-blue-200 rounded-xl p-2' }, 'Practice only. If someone threatens you, pressures you, shares private images, asks for secrets, or makes you feel unsafe, stop engaging, save evidence if safe, block/report, and tell a trusted person.')
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Digital safety checklist'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, digitalChecklistDone + '/' + DIGITAL_SAFETY_CHECKS.length + ' habits checked')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200' }, 'Protect accounts')
              ),
              DIGITAL_SAFETY_CHECKS.map(function(step) {
                var checked = !!digitalChecklist[step.id];
                return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-blue-200') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setDigitalChecklist(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                    h('span', { className: 'block text-[11px] text-slate-600 leading-relaxed' }, step.action),
                    h('span', { className: 'block text-[11px] text-blue-700 mt-1 font-medium' }, 'Why: ' + step.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Digital safety decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the safest next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold' }, 'Score ' + digitalScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, digitalCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                DIGITAL_ACTIONS.map(function(action) {
                  var chosen = digitalScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerDigitalScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all ' + (chosen ? action.tone + ' ring-2 ring-offset-1' : 'bg-white border-slate-300 text-slate-700 hover:border-blue-300') }, action.label);
                })
              ),
              digitalScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (digitalScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800') }, digitalScenarioFb),
              h('button', { onClick: function() { updMulti({ digitalScenarioIdx: digitalScenarioIdx + 1, digitalScenarioChoice: '', digitalScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-blue-700 text-white' }, 'Next scenario')
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Scam signal cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, digitalScam.icon + ' ' + digitalScam.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200' }, 'Look for patterns')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                DIGITAL_SCAM_SIGNS.map(function(sign, i) {
                  var active = i === digitalScamIdx % DIGITAL_SCAM_SIGNS.length;
                  return h('button', { key: sign.id, onClick: function() { upd('digitalScamIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border ' + (active ? 'bg-blue-700 text-white border-blue-700' : 'bg-white border-slate-300 text-slate-700 hover:border-blue-300') }, sign.icon + ' ' + sign.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Clue'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, digitalScam.clue),
                h('p', { className: 'text-[11px] text-blue-700 font-medium leading-relaxed' }, 'Move: pause, verify through a separate trusted route, and do not share passwords or codes.')
              )
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Privacy and recovery plan'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, digitalPlanPrompt)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200' }, 'One small step')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                DIGITAL_PLAN_PROMPTS.map(function(prompt, i) {
                  var active = i === digitalPlanIdx % DIGITAL_PLAN_PROMPTS.length;
                  return h('button', { key: prompt, onClick: function() { updMulti({ digitalPlanIdx: i, digitalPlanNote: prompt, digitalPlanMsg: '' }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold border ' + (active ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-blue-700 border-blue-200') }, 'Plan ' + (i + 1));
                })
              ),
              h('textarea', { value: digitalPlanNote, onChange: function(e) { upd('digitalPlanNote', e.target.value); }, rows: 4, placeholder: 'Write one digital safety action you can take.', className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white resize-y', 'aria-label': 'Digital safety plan note' }),
              h('button', { onClick: function() {
                if (!digitalPlanNote.trim()) { upd('digitalPlanMsg', 'Write one digital safety step first.'); return; }
                updMulti({ digitalPlanMsg: 'Plan saved: ' + digitalPlanNote.trim(), digitalPlanSaved: Date.now() });
                checkBadge('digitalReady');
                announceToSR('Digital safety plan saved');
              }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800' }, 'Save digital plan'),
              digitalPlanMsg && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (d.digitalPlanSaved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200') }, digitalPlanMsg)
            )
          ),
          h('div', { className: glassCard + ' grid sm:grid-cols-3 gap-3' },
            h('div', { className: 'rounded-xl bg-blue-50 border border-blue-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-blue-800' }, 'Accounts'), h('p', { className: 'text-sm font-black text-blue-900' }, 'Long, unique, 2FA'), h('p', { className: 'text-[11px] text-blue-800 leading-relaxed' }, 'Strong login habits reduce account-takeover risk.')),
            h('div', { className: 'rounded-xl bg-amber-50 border border-amber-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-amber-800' }, 'Scams'), h('p', { className: 'text-sm font-black text-amber-900' }, 'Pause under pressure'), h('p', { className: 'text-[11px] text-amber-800 leading-relaxed' }, 'Urgency, secrecy, and codes are common warning signs.')),
            h('div', { className: 'rounded-xl bg-red-50 border border-red-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-red-800' }, 'Harm'), h('p', { className: 'text-sm font-black text-red-900' }, 'Block, report, tell'), h('p', { className: 'text-[11px] text-red-800 leading-relaxed' }, 'Pressure, threats, harassment, or image abuse deserve support.'))
          )
        ),

        tab === 'science' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, __alloT('stem.lifeskills.applied_science', '\uD83D\uDD2C Applied Science')),
            h('p', { className: 'text-xs text-slate-600' }, __alloT('stem.lifeskills.science_you_use_every_day_cooking_tire', 'Science you use every day \u2014 cooking, tires, circuits'))
          ),
          // Cooking Chemistry
          h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, __alloT('stem.lifeskills.cooking_chemistry', '\uD83C\uDF73 Cooking Chemistry')),
            slider('Oven Temperature (\u00B0F)', asCookTemp, 100, 500, 10, 'asCookTemp', function(v) { return v + '\u00B0F'; }),
            h('div', { className: 'mt-2 space-y-1' },
              COOK_REACTIONS.map(function(r) {
                var active = asCookTemp >= r.tempF;
                return h('div', { key: r.name, className: 'flex items-center gap-2 p-1.5 rounded-lg ' + (active ? 'bg-amber-50' : 'opacity-40') },
                  h('span', null, r.icon),
                  h('div', null, h('p', { className: 'text-[11px] font-bold ' + (active ? 'text-amber-700' : 'text-slate-600') }, r.name + ' (' + r.tempF + '\u00B0F)'), active && h('p', { className: 'text-[11px] text-slate-600' }, r.desc))
                );
              })
            )
          ),
          // Circuit Breaker
          h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, __alloT('stem.lifeskills.circuit_load_calculator', '\u26A1 Circuit Load Calculator')),
            h('p', { className: 'text-xs text-slate-600 mb-2' }, 'Circuit: ' + asVolts + 'V \u00D7 ' + asAmps + 'A = ' + asWatts + 'W max'),
            h('div', { className: 'flex flex-wrap gap-1.5' },
              COMMON_DEVICES.map(function(dev) {
                var on = asRunning.indexOf(dev.name) >= 0;
                return h('button', { key: dev.name, onClick: function() {
                  var list = asRunning.slice();
                  var idx = list.indexOf(dev.name);
                  if (idx >= 0) list.splice(idx, 1); else list.push(dev.name);
                  upd('asRunning', list);
                  checkBadge('appliedSci');
                }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold ' + (on ? 'bg-yellow-100 border-yellow-400 border' : 'bg-white border border-slate-400') }, dev.name + ' (' + dev.watts + 'W)');
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
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, __alloT('stem.lifeskills.tire_pressure_gay_lussac_s_law', '\uD83D\uDE97 Tire Pressure & Gay-Lussac\'s Law')),
            slider('Fill Pressure (PSI)', asTireP1, 28, 44, 1, 'asTireP1'),
            slider('Fill Temperature (\u00B0F)', asTireT1, 0, 120, 5, 'asTireT1'),
            slider('Current Temperature (\u00B0F)', asTireT2, -20, 120, 5, 'asTireT2'),
            h('div', { className: 'mt-2 grid grid-cols-2 gap-2' },
              h('div', { className: 'text-center p-2 bg-blue-50 rounded-xl' }, h('p', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.current_psi', 'Current PSI')), h('p', { className: 'text-lg font-bold text-blue-600' }, asTireP2.toFixed(1))),
              h('div', { className: 'text-center p-2 bg-amber-50 rounded-xl' }, h('p', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.psi_change', 'PSI Change')), h('p', { className: 'text-lg font-bold ' + (asTireP2 < asTireP1 ? 'text-red-600' : 'text-emerald-600') }, (asTireP2 - asTireP1 > 0 ? '+' : '') + (asTireP2 - asTireP1).toFixed(1)))
            ),
            (gradeBand === '6-8' || gradeBand === '9-12') && h('p', { className: 'text-[11px] text-slate-600 mt-1 font-mono' }, 'P\u2081/T\u2081 = P\u2082/T\u2082 | ' + asTireP1 + '/' + t1K.toFixed(1) + 'K = ' + asTireP2.toFixed(1) + '/' + t2K.toFixed(1) + 'K')
          )
        ),

        // ═══ CAR CARE TAB ═══
        tab === 'carcare' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, __alloT('stem.lifeskills.car_care_science', '\uD83D\uDE97 Car Care Science')),
            h('p', { className: 'text-xs text-slate-600' }, __alloT('stem.lifeskills.oil_tires_battery_maintenance_and_dash', 'Oil, tires, battery, maintenance, and dashboard lights'))
          ),
          // Oil Viscosity
          h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, __alloT('stem.lifeskills.oil_viscosity_guide', '\uD83D\uDEE2\uFE0F Oil Viscosity Guide')),
            slider('Climate Temperature (\u00B0F)', ccOilTemp, -40, 120, 5, 'ccOilTemp'),
            h('div', { className: 'space-y-1 mt-2' },
              OIL_GRADES.map(function(g) {
                var inRange = ccOilTemp >= g.minF && ccOilTemp <= g.maxF;
                return h('div', { key: g.grade, className: 'flex items-center gap-2 p-1.5 rounded-lg ' + (inRange ? 'bg-emerald-50 border border-emerald-200' : 'opacity-40') },
                  h('span', { className: 'text-xs font-bold w-16 ' + (inRange ? 'text-emerald-700' : 'text-slate-600') }, g.grade),
                  h('span', { className: 'text-[11px] text-slate-600 flex-1' }, g.desc),
                  inRange && h('span', { className: 'text-[11px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded' }, __alloT('stem.lifeskills.recommended', '\u2705 RECOMMENDED'))
                );
              })
            )
          ),
          // Tire Tread
          h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, __alloT('stem.lifeskills.tire_tread_depth', '\uD83D\uDEB2 Tire Tread Depth')),
            slider('Tread Depth (32nds inch)', ccTread, 0, 10, 1, 'ccTread'),
            h('div', { className: 'flex items-center gap-3 mt-2' },
              h('div', { className: 'flex-1 h-4 bg-slate-200 rounded-full overflow-hidden' },
                h('div', { className: 'h-full rounded-full transition-all', style: { width: (ccTread / 10 * 100) + '%', background: treadColor } })
              ),
              h('span', { className: 'text-xs font-bold', style: { color: treadColor } }, treadStatus + ' (' + ccTread + '/32")')
            ),
            ccTread <= 2 && h('p', { className: 'text-[11px] font-bold text-red-600 mt-1' }, __alloT('stem.lifeskills.unsafe_below_legal_minimum_2_32_replac', '\u26A0\uFE0F UNSAFE: Below legal minimum (2/32"). Replace immediately!'))
          ),
          // Dashboard Lights Quiz
          h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, __alloT('stem.lifeskills.dashboard_light_quiz', '\uD83D\uDEA8 Dashboard Light Quiz')),
            h('div', { className: 'text-center mb-3' }, h('span', { className: 'text-4xl' }, ccCurrentDash.icon), h('p', { className: 'text-xs font-bold text-slate-700 mt-1' }, __alloT('stem.lifeskills.what_does_this_warning_light_mean', 'What does this warning light mean?'))),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              ccCurrentDash.choices.map(function(c, i) {
                return h('button', { key: i, onClick: function() {
                  var correct = c === ccCurrentDash.name;
                  stemBeep(correct);
                  updMulti({ ccDashFb: correct ? '\u2705 Correct! ' + ccCurrentDash.desc : '\u274C Wrong! It\'s ' + ccCurrentDash.name + '. ' + ccCurrentDash.desc });
                  if (correct) { awardXP(10, 'Dashboard quiz'); checkBadge('mechanic'); }
                }, className: 'p-2 rounded-xl text-xs font-bold border border-slate-400 hover:border-teal-600' }, c);
              })
            ),
            d.ccDashFb && h('p', { className: 'text-[11px] font-bold mt-2 p-2 rounded-lg ' + (d.ccDashFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700') }, d.ccDashFb),
            h('button', { 'aria-label': __alloT('stem.lifeskills.next_light', 'Next Light'), onClick: function() { updMulti({ ccDashQ: ccDashQ + 1, ccDashFb: null }); }, className: 'mt-2 px-3 py-1.5 text-[11px] font-bold bg-teal-700 text-white rounded-xl' }, __alloT('stem.lifeskills.next_light_2', 'Next Light \u27A1'))
          ),
          // Maintenance Schedule
          h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, __alloT('stem.lifeskills.maintenance_schedule', '\uD83D\uDD27 Maintenance Schedule')),
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
        tab === 'homerepair' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, __alloT('stem.lifeskills.home_repair', '\uD83D\uDD27 Home Repair')),
            h('p', { className: 'text-xs text-slate-600' }, __alloT('stem.lifeskills.plumbing_paint_calculator_and_diy_diag', 'Plumbing, paint calculator, and DIY diagnostics'))
          ),
          // Toilet Diagnosis
          h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, __alloT('stem.lifeskills.toilet_diagnosis', '\uD83D\uDEBD Toilet Diagnosis')),
            h('p', { className: 'text-xs text-slate-700 mb-2' }, '\uD83D\uDD0D Symptom: "' + plumbCurrent.symptom + '"'),
            h('div', { className: 'grid grid-cols-3 gap-1.5' },
              TOILET_PARTS.map(function(part) {
                return h('button', { key: part.name, onClick: function() {
                  var correct = part.name === plumbCurrent.answer;
                  stemBeep(correct);
                  updMulti({ plumbFb: correct ? '\u2705 Correct! ' + plumbCurrent.explain : '\u274C Not ' + part.name + '. Try again!' });
                  if (correct) { checkBadge('handyman'); awardXP(15, 'Plumbing diagnosis'); }
                }, className: 'p-2 rounded-xl text-center text-[11px] font-bold border border-slate-400 hover:border-teal-600' },
                  h('span', { className: 'text-lg block' }, part.icon), part.name
                );
              })
            ),
            d.plumbFb && h('p', { className: 'text-[11px] font-bold mt-2 p-2 rounded-lg ' + (d.plumbFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700') }, d.plumbFb),
            h('button', { 'aria-label': __alloT('stem.lifeskills.next_problem', 'Next Problem'), onClick: function() { updMulti({ plumbQ: plumbQ + 1, plumbFb: null }); }, className: 'mt-2 px-3 py-1.5 text-[11px] font-bold bg-teal-700 text-white rounded-xl' }, __alloT('stem.lifeskills.next_problem_2', 'Next Problem \u27A1'))
          ),
          // Paint Calculator
          h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, __alloT('stem.lifeskills.paint_calculator', '\uD83C\uDFA8 Paint Calculator')),
            h('div', { className: 'grid grid-cols-3 gap-2' },
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.length_ft', 'Length (ft)')), h('input', { type: 'number', value: paintL, onChange: function(e) { upd('paintL', parseInt(e.target.value) || 0); }, className: 'w-full px-2 py-1 border border-slate-400 rounded-lg text-sm mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.width_ft', 'Width (ft)')), h('input', { type: 'number', value: paintW, onChange: function(e) { upd('paintW', parseInt(e.target.value) || 0); }, className: 'w-full px-2 py-1 border border-slate-400 rounded-lg text-sm mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.height_ft', 'Height (ft)')), h('input', { type: 'number', value: paintH, onChange: function(e) { upd('paintH', parseInt(e.target.value) || 0); }, className: 'w-full px-2 py-1 border border-slate-400 rounded-lg text-sm mt-1' }))
            ),
            slider('Coats', paintCoats, 1, 3, 1, 'paintCoats'),
            slider('Windows', paintWindows, 0, 6, 1, 'paintWindows'),
            slider('Doors', paintDoors, 0, 4, 1, 'paintDoors'),
            h('div', { className: 'mt-2 grid grid-cols-3 gap-2 text-center' },
              h('div', { className: 'bg-slate-50 rounded-xl p-2' }, h('p', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.net_area', 'Net Area')), h('p', { className: 'text-sm font-bold' }, paintNetArea + ' sqft')),
              h('div', { className: 'bg-slate-50 rounded-xl p-2' }, h('p', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.gallons_needed', 'Gallons Needed')), h('p', { className: 'text-sm font-bold text-teal-600' }, paintGallons)),
              h('div', { className: 'bg-slate-50 rounded-xl p-2' }, h('p', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.est_cost', 'Est. Cost')), h('p', { className: 'text-sm font-bold' }, fmtMoney(paintGallons * 30) + '-' + fmtMoney(paintGallons * 55)))
            )
          )
        ),

        // ═══ HOME SYSTEMS TAB ═══
        tab === 'homesys' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, __alloT('stem.lifeskills.home_systems_2', '\uD83C\uDFE0 Home Systems')),
            h('p', { className: 'text-xs text-slate-600' }, __alloT('stem.lifeskills.hvac_electrical_fire_safety_and_energy', 'HVAC, electrical, fire safety, and energy'))
          ),
          // Quick links to AI analysis
          callGemini && h('div', { className: glassCard },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-2' }, __alloT('stem.lifeskills.ai_home_advisor', '\uD83E\uDDE0 AI Home Advisor')),
            h('p', { className: 'text-xs text-slate-600 mb-2' }, __alloT('stem.lifeskills.ask_ai_about_any_home_system_question', 'Ask AI about any home system question:')),
            h('div', { className: 'flex gap-2' },
              h('input', { type: 'text', value: d.homeQ || '', onChange: function(e) { upd('homeQ', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter' && d.homeQ) {
                upd('homeALoading', true);
                callGemini('Answer this home maintenance question for a ' + gradeBand + ' student in 2-3 sentences: ' + d.homeQ).then(function(r) { updMulti({ homeA: r, homeALoading: false }); }).catch(function() { upd('homeALoading', false); });
              }}, placeholder: __alloT('stem.lifeskills.e_g_why_does_my_furnace_make_a_clickin', 'e.g. "Why does my furnace make a clicking sound?"'), className: 'flex-1 px-3 py-2 border border-slate-400 rounded-xl text-xs' }),
              h('button', { onClick: function() {
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
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, __alloT('stem.lifeskills.hvac_tips', '\uD83D\uDD25 HVAC Tips')),
              h('ul', { className: 'text-[11px] text-slate-600 space-y-1' },
                h('li', null, __alloT('stem.lifeskills.change_air_filter_every_90_days', '\u2022 Change air filter every 90 days')),
                h('li', null, __alloT('stem.lifeskills.merv_8_11_is_best_for_most_homes', '\u2022 MERV 8-11 is best for most homes')),
                h('li', null, __alloT('stem.lifeskills.set_thermostat_to_68_f_winter_78_f_sum', '\u2022 Set thermostat to 68\u00B0F winter / 78\u00B0F summer')),
                h('li', null, __alloT('stem.lifeskills.annual_tune_up_saves_5_15_on_energy', '\u2022 Annual tune-up saves 5-15% on energy'))
              )
            ),
            h('div', { className: glassCard },
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, __alloT('stem.lifeskills.electrical_safety', '\u26A1 Electrical Safety')),
              h('ul', { className: 'text-[11px] text-slate-600 space-y-1' },
                h('li', null, __alloT('stem.lifeskills.gfci_required_in_wet_areas_bathroom_ki', '\u2022 GFCI required in wet areas (bathroom, kitchen)')),
                h('li', null, __alloT('stem.lifeskills.afci_required_in_bedrooms_since_2002', '\u2022 AFCI required in bedrooms (since 2002)')),
                h('li', null, __alloT('stem.lifeskills.never_exceed_circuit_capacity_p_v_i', '\u2022 Never exceed circuit capacity (P=V\u00D7I)')),
                h('li', null, __alloT('stem.lifeskills.know_your_main_breaker_location', '\u2022 Know your main breaker location'))
              )
            ),
            h('div', { className: glassCard },
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, __alloT('stem.lifeskills.fire_safety', '\uD83D\uDD25 Fire Safety')),
              h('ul', { className: 'text-[11px] text-slate-600 space-y-1' },
                h('li', null, __alloT('stem.lifeskills.smoke_detector_in_every_bedroom_hallwa', '\u2022 Smoke detector in every bedroom + hallway')),
                h('li', null, __alloT('stem.lifeskills.co_detector_on_every_floor', '\u2022 CO detector on every floor')),
                h('li', null, __alloT('stem.lifeskills.replace_detectors_every_10_years', '\u2022 Replace detectors every 10 years')),
                h('li', null, __alloT('stem.lifeskills.test_monthly_change_batteries_yearly', '\u2022 Test monthly, change batteries yearly'))
              )
            ),
            h('div', { className: glassCard },
              h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, __alloT('stem.lifeskills.energy_savings', '\u2600\uFE0F Energy Savings')),
              h('ul', { className: 'text-[11px] text-slate-600 space-y-1' },
                h('li', null, __alloT('stem.lifeskills.led_bulbs_save_75_vs_incandescent', '\u2022 LED bulbs save 75% vs incandescent')),
                h('li', null, __alloT('stem.lifeskills.heat_pumps_are_300_efficient_cop_3_0', '\u2022 Heat pumps are 300% efficient (COP 3.0)')),
                h('li', null, __alloT('stem.lifeskills.insulation_r_value_higher_better', '\u2022 Insulation R-value: higher = better')),
                h('li', null, __alloT('stem.lifeskills.30_federal_solar_tax_credit_itc', '\u2022 30% federal solar tax credit (ITC)'))
              )
            )
          )
        ),

        // ═══ BUDGET TAB ═══
        tab === 'budget' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, __alloT('stem.lifeskills.monthly_budget_builder', '\uD83D\uDCB0 Monthly Budget Builder')),
            h('p', { className: 'text-xs text-slate-600' }, gradeText(gradeBand, 'Plan how to spend your money!', 'Build a budget using the 50/30/20 rule.', 'Create a zero-based monthly budget with needs, wants, and savings.', 'Zero-based budgeting: every dollar gets a job. Analyze your spending against the 50/30/20 framework.'))
          ),
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-center gap-3 mb-2' },
              h('label', { className: 'text-[11px] font-bold text-slate-600 uppercase' }, __alloT('stem.lifeskills.monthly_income', 'Monthly Income')),
              h('input', { type: 'number', step: '100', value: budgetIncome, onChange: function(e) { upd('budgetIncome', Math.max(0, parseInt(e.target.value) || 0)); checkBadge('budgeteer'); }, className: 'w-32 px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold' }),
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
                    h('input', { type: 'range', min: 0, max: Math.max(Math.round(budgetIncome * 0.5), 1), step: 10, value: amt, 'aria-valuetext': fmtMoney(amt), 'aria-label': cat.name + ' budget: ' + fmtMoney(amt), onChange: function(e) {
                      var exp = Object.assign({}, budgetExp); exp[cat.name] = parseInt(e.target.value); upd('budgetExp', exp);
                    }, className: 'w-full h-1 rounded-full appearance-none cursor-pointer', style: { accentColor: cat.type === 'need' ? '#3b82f6' : cat.type === 'want' ? '#8b5cf6' : '#059669' } })
                  )
                );
              })
            ),
            // Summary
            h('div', { className: 'grid grid-cols-3 gap-2 mt-3' },
              h('div', { className: 'text-center p-2 rounded-xl bg-blue-50' }, h('p', { className: 'text-[11px] font-bold text-blue-500 uppercase' }, __alloT('stem.lifeskills.needs', 'Needs')), h('p', { className: 'text-sm font-bold text-blue-700' }, fmtMoney(needsTotal)), h('p', { className: 'text-[11px] ' + (budgetNeedsPct <= 50 ? 'text-emerald-500' : 'text-red-500') }, budgetNeedsPct + '% of income')),
              h('div', { className: 'text-center p-2 rounded-xl bg-purple-50' }, h('p', { className: 'text-[11px] font-bold text-purple-500 uppercase' }, __alloT('stem.lifeskills.wants', 'Wants')), h('p', { className: 'text-sm font-bold text-purple-700' }, fmtMoney(wantsTotal)), h('p', { className: 'text-[11px] ' + (budgetWantsPct <= 30 ? 'text-emerald-500' : 'text-red-500') }, budgetWantsPct + '% of income')),
              h('div', { className: 'text-center p-2 rounded-xl bg-emerald-50' }, h('p', { className: 'text-[11px] font-bold text-emerald-500 uppercase' }, __alloT('stem.lifeskills.savings', 'Savings')), h('p', { className: 'text-sm font-bold text-emerald-700' }, fmtMoney(savesTotal)), h('p', { className: 'text-[11px] ' + (budgetSavesPct >= 20 ? 'text-emerald-500' : 'text-amber-500') }, budgetSavesPct + '% of income'))
            ),
            budgetRemaining !== 0 && h('div', { className: 'text-center p-2 rounded-xl mt-2 ' + (budgetRemaining > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200') },
              h('p', { className: 'text-xs font-bold ' + (budgetRemaining > 0 ? 'text-emerald-700' : 'text-red-700') }, budgetRemaining > 0 ? fmtMoney(budgetRemaining) + ' unassigned \u2014 add to savings!' : fmtMoney(Math.abs(budgetRemaining)) + ' OVER BUDGET!')
            )
          ),
          // Savings Goal Calculator
          h('div', { className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, __alloT('stem.lifeskills.savings_goal_calculator', '\uD83C\uDFE6 Savings Goal Calculator')),
            h('div', { className: 'grid grid-cols-3 gap-2' },
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.goal_amount', 'Goal Amount')), h('input', { type: 'number', step: '1000', value: savingsGoal, onChange: function(e) { upd('savingsGoal', Math.max(0, parseInt(e.target.value) || 0)); checkBadge('saver'); }, className: 'w-full px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.monthly_savings', 'Monthly Savings')), h('input', { type: 'number', step: '25', value: savingsMonthly, onChange: function(e) { upd('savingsMonthly', Math.max(0, parseInt(e.target.value) || 0)); }, className: 'w-full px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.interest_rate', 'Interest Rate (%)')), h('input', { type: 'number', step: '0.5', value: savingsRate, onChange: function(e) { upd('savingsRate', Math.max(0, parseFloat(e.target.value) || 0)); }, className: 'w-full px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold mt-1' }))
            ),
            monthsToGoal > 0 && monthsToGoal < 600 && h('div', { className: 'text-center p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl' },
              h('p', { className: 'text-lg font-bold text-emerald-700' }, Math.floor(monthsToGoal / 12) + ' years, ' + (monthsToGoal % 12) + ' months'),
              h('p', { className: 'text-[11px] text-slate-600' }, 'to reach ' + fmtMoney(savingsGoal) + ' saving ' + fmtMoney(savingsMonthly) + '/month at ' + savingsRate + '% interest')
            ),
            h('p', { className: 'text-[11px] text-slate-600 mt-1' }, '\uD83D\uDCC8 10-year projection: ' + fmtMoney(savingsResult.balance) + ' (' + fmtMoney(savingsResult.contributed) + ' contributed + ' + fmtMoney(savingsResult.interest) + ' interest)')
          ),
          (function() {
            var iq = d._budgetHunt || { income: 4000, needsPct: 50, wantsPct: 30, savesPct: 20, monthlySave: 500, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
            function setIQ(patch) { upd('_budgetHunt', Object.assign({}, iq, patch)); }
            var total = iq.needsPct + iq.wantsPct + iq.savesPct;
            var state;
            if (total > 110) state = 'overspending';
            else if (total < 90) state = 'underAllocated';
            else if (iq.savesPct < 10) state = 'noSavings';
            else if (iq.needsPct > 60) state = 'stretched';
            else state = 'balanced';
            var sm = {
              balanced:       { label: __alloT('stem.lifeskills.balanced_budget', '\uD83D\uDFE2 Balanced budget'), color: '#059669', bg: '#ecfdf5', border: '#86efac', desc: __alloT('stem.lifeskills.50_30_20_sustainable', '50/30/20 sustainable.') },
              stretched:      { label: __alloT('stem.lifeskills.stretched_needs_60', '\uD83D\uDFE1 Stretched (needs >60%)'), color: '#d97706', bg: '#fffbeb', border: '#fcd34d', desc: __alloT('stem.lifeskills.high_fixed_costs', 'High fixed costs.') },
              noSavings:      { label: __alloT('stem.lifeskills.no_savings_10', '\u26A0\uFE0F No savings (<10%)'), color: '#ea580c', bg: '#fff7ed', border: '#fdba74', desc: __alloT('stem.lifeskills.paycheck_to_paycheck_risk', 'Paycheck-to-paycheck risk.') },
              overspending:   { label: __alloT('stem.lifeskills.over_allocated_110', '\uD83D\uDEA8 Over-allocated (>110%)'), color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', desc: 'Debt-financed.' },
              underAllocated: { label: __alloT('stem.lifeskills.under_allocated_90', '\uD83E\uDD14 Under-allocated (<90%)'), color: '#0891b2', bg: '#ecfeff', border: '#67e8f9', desc: __alloT('stem.lifeskills.surplus_uncategorized', 'Surplus uncategorized.') }
            }[state];
            return h('div', { className: glassCard + ' mt-3 space-y-3' },
              h('h4', { className: 'text-sm font-bold text-emerald-700' }, __alloT('stem.lifeskills.budget_allocation_discovery', '\uD83C\uDFAF Budget allocation discovery')),
              h('p', { className: 'text-[11px] text-slate-600' }, __alloT('stem.lifeskills.5_sliders_svg_stacked_bar_5_state_clas', '5 sliders + SVG stacked bar. 5-state classification. No score, no reveal.')),
              h('div', { className: 'p-3 rounded-lg text-center', style: { background: sm.bg, border: '2px solid ' + sm.border } },
                h('div', { className: 'text-base font-black', style: { color: sm.color } }, sm.label),
                h('div', { className: 'text-[11px] text-slate-700 mt-1' }, sm.desc),
                h('div', { className: 'text-[10px] text-slate-600 font-mono mt-1' }, 'Total ' + total + '% allocated')
              ),
              h('div', { className: 'p-2 bg-slate-50 rounded border border-slate-200' },
                h('svg', { viewBox: '0 0 320 60', className: 'w-full h-16' },
                  h('rect', { x: 10, y: 20, width: 300, height: 25, fill: '#e2e8f0' }),
                  h('rect', { x: 10, y: 20, width: Math.min(300, iq.needsPct * 3), height: 25, fill: '#dc2626' }),
                  h('rect', { x: 10 + Math.min(300, iq.needsPct * 3), y: 20, width: Math.max(0, Math.min(300 - iq.needsPct * 3, iq.wantsPct * 3)), height: 25, fill: '#f59e0b' }),
                  h('rect', { x: 10 + Math.min(300, (iq.needsPct + iq.wantsPct) * 3), y: 20, width: Math.max(0, Math.min(300 - (iq.needsPct + iq.wantsPct) * 3, iq.savesPct * 3)), height: 25, fill: '#059669' }),
                  h('line', { x1: 160, y1: 15, x2: 160, y2: 50, stroke: '#475569', strokeWidth: 1, strokeDasharray: '3 3' }),
                  h('text', { x: 160, y: 60, fontSize: 9, fill: '#475569', textAnchor: 'middle' }, __alloT('stem.lifeskills.50_reference', '50% reference'))
                )
              ),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
                [{ k: 'income', l: 'Income $', mn: 1000, mx: 15000, st: 100 },
                 { k: 'needsPct', l: 'Needs %', mn: 0, mx: 100, st: 5 },
                 { k: 'wantsPct', l: 'Wants %', mn: 0, mx: 100, st: 5 },
                 { k: 'savesPct', l: 'Saves %', mn: 0, mx: 100, st: 5 },
                 { k: 'monthlySave', l: 'Auto-save $', mn: 0, mx: 3000, st: 50 }].map(function(s) {
                  return h('div', { key: s.k },
                    h('label', { htmlFor: 'bd-' + s.k, className: 'block text-[11px] font-bold text-slate-700' }, s.l + ': ', h('span', { className: 'font-mono text-emerald-700' }, iq[s.k])),
                    h('input', { id: 'bd-' + s.k, type: 'range', 'aria-valuetext': (iq[s.k] + ' ' + ((String(s.l).match(/\(([^)]+)\)/) || ['', ''])[1])), min: s.mn, max: s.mx, step: s.st, value: iq[s.k],
                      onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                      className: 'w-full', 'aria-label': s.l }));
                })
              ),
              h('div', { className: 'flex gap-2 items-center flex-wrap' },
                h('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ i: iq.income, n: iq.needsPct, w: iq.wantsPct, s: iq.savesPct, t: total, st: state }]).slice(-8) }); }, className: 'px-2 py-1 rounded bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-300' }, __alloT('stem.lifeskills.log', '\uD83D\uDCCB Log')),
                h('button', { onClick: function() { setIQ({ income: 4000, needsPct: 50, wantsPct: 30, savesPct: 20, monthlySave: 500, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-white text-[11px] font-semibold text-slate-600 border border-slate-300' }, __alloT('stem.lifeskills.reset', '\u21BA Reset'))
              ),
              h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.lifeskills.hypothesis_at_what_income_does_50_30_2', 'Hypothesis: At what income does 50/30/20 become hard?'),
                className: 'w-full text-[12px] border border-slate-300 rounded p-2 font-mono leading-snug', rows: 3 }),
              !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-50 text-[11px] font-bold text-amber-800 border border-amber-300' }, __alloT('stem.lifeskills.stuck_show_open_prompts', '\uD83E\uDD14 Stuck \u2014 show open prompts')),
              iq.stuckRevealed && h('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-slate-700' },
                h('ul', { className: 'list-disc pl-5 space-y-1' },
                  h('li', null, __alloT('stem.lifeskills.are_there_other_budget_heuristics_besi', 'Are there other budget heuristics besides 50/30/20?')),
                  h('li', null, __alloT('stem.lifeskills.what_if_needs_70_is_the_50_30_20_rule_', 'What if needs > 70% \u2014 is the 50/30/20 rule applicable?')))),
              h('label', { className: 'flex items-center gap-2 text-[12px] font-bold text-emerald-800 cursor-pointer' },
                h('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                __alloT('stem.lifeskills.i_understand_explain', 'I understand \u2014 explain')),
              iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.lifeskills.explain_how_income_level_affects_budge', 'Explain how income level affects budget feasibility.'),
                className: 'w-full text-[12px] border border-emerald-300 rounded p-2 font-mono leading-snug mt-2', rows: 4 }),
              h('div', { className: 'text-[10px] italic text-slate-500' }, __alloT('stem.lifeskills.design_note_discrete_5_state_budget_ma', 'Design note: discrete 5-state budget marker; SVG stacked bar; no allocation score \u2014 by design.'))
            );
          })()
        ),

        // ═══ CREDIT TAB ═══
        tab === 'credit' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, __alloT('stem.lifeskills.credit_loans', '\uD83D\uDCB3 Credit & Loans')),
            h('p', { className: 'text-xs text-slate-600' }, gradeText(gradeBand, 'Borrowing money costs extra \u2014 that\'s called interest!', 'Learn what makes a good credit score and how loans work.', 'Explore FICO score factors, compound interest, and loan amortization.', 'Credit optimization, compound interest modeling, amortization schedules, and debt cost analysis.'))
          ),
          // FICO Score Builder
          h('div', { className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, __alloT('stem.lifeskills.fico_score_builder', '\uD83D\uDCCA FICO Score Builder')),
            h('p', { className: 'text-xs text-slate-600 mb-2' }, __alloT('stem.lifeskills.rate_each_factor_1_5_to_see_how_your_s', 'Rate each factor 1-5 to see how your score changes:')),
            CREDIT_FACTORS.map(function(f) {
              var rating = creditRatings[f.name] || 3;
              var labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
              return h('div', { key: f.name, className: 'p-2 rounded-lg bg-white/50 space-y-1' },
                h('div', { className: 'flex justify-between items-center' },
                  h('span', { className: 'text-[11px] font-bold text-slate-700' }, f.icon + ' ' + f.name + ' (' + f.weight + '%)'),
                  h('span', { className: 'text-[11px] font-bold px-1.5 py-0.5 rounded ' + (rating >= 4 ? 'bg-emerald-100 text-emerald-700' : rating >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700') }, labels[rating - 1])
                ),
                h('input', { type: 'range', min: 1, max: 5, value: rating, 'aria-valuetext': (labels[rating - 1] || ('rating ' + rating)), 'aria-label': f.name + ' credit rating: ' + labels[rating - 1], onChange: function(e) {
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
              // FICO radial gauge (300-850) — the iconic credit-score dial,
              // arc segmented into the real FICO bands (Poor/Fair/Good/Very
              // Good/Excellent) with a needle at the estimated score.
              (function() {
                var GA_cx = 100, GA_cy = 92, GA_r = 76;
                var arcPt = function(score, rad) { var tt = (Math.max(300, Math.min(850, score)) - 300) / 550; var a = Math.PI * (1 - tt); return { x: GA_cx + rad * Math.cos(a), y: GA_cy - rad * Math.sin(a) }; };
                var np = arcPt(estimatedScore, GA_r - 15);
                return h('svg', { width: '100%', viewBox: '0 0 200 106', style: { maxWidth: 240, display: 'block', margin: '8px auto 0' }, role: 'img', 'aria-label': 'FICO score gauge: ' + estimatedScore + ' of 850, ' + scoreRange.label + '.' },
                  [[300, 580, '#ef4444'], [580, 670, '#f59e0b'], [670, 740, '#eab308'], [740, 800, '#84cc16'], [800, 850, '#22c55e']].map(function(b) {
                    var p0 = arcPt(b[0], GA_r), p1 = arcPt(b[1], GA_r);
                    return h('path', { key: b[0], d: 'M' + p0.x.toFixed(1) + ' ' + p0.y.toFixed(1) + ' A' + GA_r + ' ' + GA_r + ' 0 0 1 ' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1), stroke: b[2], strokeWidth: 12, fill: 'none' });
                  }),
                  h('line', { x1: GA_cx, y1: GA_cy, x2: np.x.toFixed(1), y2: np.y.toFixed(1), stroke: '#1e293b', strokeWidth: 3, strokeLinecap: 'round' }),
                  h('circle', { cx: GA_cx, cy: GA_cy, r: 5, fill: '#1e293b' }),
                  h('text', { x: 18, y: GA_cy + 13, textAnchor: 'middle', fontSize: 8, fontWeight: 700, fill: '#64748b' }, '300'),
                  h('text', { x: 182, y: GA_cy + 13, textAnchor: 'middle', fontSize: 8, fontWeight: 700, fill: '#64748b' }, '850')
                );
              })()
            )
          ),
          // Compound Interest Calculator
          h('div', { className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, __alloT('stem.lifeskills.compound_interest_the_8th_wonder_of_th', '\uD83D\uDCC8 Compound Interest \u2014 "The 8th Wonder of the World"')),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.starting', 'Starting $')), h('input', { type: 'number', step: '500', value: ciPrincipal, onChange: function(e) { upd('ciPrincipal', Math.max(0, parseInt(e.target.value) || 0)); }, className: 'w-full px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.monthly_add', 'Monthly Add')), h('input', { type: 'number', step: '25', value: ciMonthly, onChange: function(e) { upd('ciMonthly', Math.max(0, parseInt(e.target.value) || 0)); }, className: 'w-full px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.rate_2', 'Rate (%)')), h('input', { type: 'number', step: '0.5', value: ciRate, onChange: function(e) { upd('ciRate', Math.max(0, parseFloat(e.target.value) || 0)); }, className: 'w-full px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.years', 'Years')), h('input', { type: 'number', step: '1', value: ciYears, onChange: function(e) { upd('ciYears', Math.max(1, Math.min(50, parseInt(e.target.value) || 1))); }, className: 'w-full px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold mt-1' }))
            ),
            h('div', { className: 'grid grid-cols-3 gap-2 mt-2' },
              h('div', { className: 'text-center p-2 rounded-xl bg-blue-50' }, h('p', { className: 'text-[11px] font-bold text-blue-500 uppercase' }, __alloT('stem.lifeskills.you_put_in', 'You Put In')), h('p', { className: 'text-sm font-bold text-blue-700' }, fmtMoney(ciResult.contributed))),
              h('div', { className: 'text-center p-2 rounded-xl bg-emerald-50' }, h('p', { className: 'text-[11px] font-bold text-emerald-500 uppercase' }, __alloT('stem.lifeskills.interest_earned', 'Interest Earned')), h('p', { className: 'text-sm font-bold text-emerald-700' }, fmtMoney(ciResult.interest))),
              h('div', { className: 'text-center p-2 rounded-xl bg-gradient-to-r from-blue-50 to-emerald-50 border-2 border-emerald-300' }, h('p', { className: 'text-[11px] font-bold text-teal-600 uppercase' }, __alloT('stem.lifeskills.total_value', 'Total Value')), h('p', { className: 'text-lg font-bold text-teal-700' }, fmtMoney(ciResult.balance)))
            ),
            // Visual bar
            ciResult.balance > 0 && h('div', { className: 'h-5 rounded-full overflow-hidden flex mt-2' },
              h('div', { style: { width: Math.round(ciResult.contributed / ciResult.balance * 100) + '%', background: '#3b82f6' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, __alloT('stem.lifeskills.contributed', 'Contributed')),
              h('div', { style: { width: Math.round(ciResult.interest / ciResult.balance * 100) + '%', background: '#059669' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, __alloT('stem.lifeskills.interest', 'Interest'))
            )
          ),
          // Loan Calculator
          h('div', { className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, __alloT('stem.lifeskills.loan_payment_calculator', '\uD83C\uDFE0 Loan Payment Calculator')),
            h('div', { className: 'grid grid-cols-3 gap-2' },
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.loan_amount', 'Loan Amount')), h('input', { type: 'number', step: '1000', value: loanPrincipal, onChange: function(e) { upd('loanPrincipal', Math.max(0, parseInt(e.target.value) || 0)); checkBadge('loanCalc'); }, className: 'w-full px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.apr', 'APR (%)')), h('input', { type: 'number', step: '0.25', value: loanRate, onChange: function(e) { upd('loanRate', Math.max(0, parseFloat(e.target.value) || 0)); }, className: 'w-full px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold mt-1' })),
              h('div', null, h('label', { className: 'text-[11px] font-bold text-slate-600' }, __alloT('stem.lifeskills.years_2', 'Years')), h('select', { value: loanTerm, onChange: function(e) { upd('loanTerm', parseInt(e.target.value)); }, className: 'w-full px-2 py-1.5 border border-slate-400 rounded-lg text-sm font-bold mt-1' },
                [1, 2, 3, 5, 7, 10, 15, 20, 30].map(function(y) { return h('option', { key: y, value: y }, y + ' years'); })
              ))
            ),
            h('div', { className: 'grid grid-cols-3 gap-2 mt-2' },
              h('div', { className: 'text-center p-2 rounded-xl bg-blue-50' }, h('p', { className: 'text-[11px] font-bold text-blue-500 uppercase' }, __alloT('stem.lifeskills.monthly_payment', 'Monthly Payment')), h('p', { className: 'text-lg font-bold text-blue-700' }, fmtMoney(loanResult.monthly))),
              h('div', { className: 'text-center p-2 rounded-xl bg-red-50' }, h('p', { className: 'text-[11px] font-bold text-red-500 uppercase' }, __alloT('stem.lifeskills.total_interest', 'Total Interest')), h('p', { className: 'text-lg font-bold text-red-600' }, fmtMoney(loanResult.totalInterest))),
              h('div', { className: 'text-center p-2 rounded-xl bg-slate-100' }, h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase' }, __alloT('stem.lifeskills.total_paid', 'Total Paid')), h('p', { className: 'text-sm font-bold text-slate-700' }, fmtMoney(loanResult.totalPaid)))
            ),
            loanResult.totalInterest > 0 && h('div', { className: 'h-4 rounded-full overflow-hidden flex mt-2' },
              h('div', { style: { width: Math.round(loanPrincipal / loanResult.totalPaid * 100) + '%', background: '#3b82f6' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, __alloT('stem.lifeskills.principal', 'Principal')),
              h('div', { style: { width: Math.round(loanResult.totalInterest / loanResult.totalPaid * 100) + '%', background: '#ef4444' }, className: 'h-full flex items-center justify-center text-[11px] text-white font-bold' }, __alloT('stem.lifeskills.interest_2', 'Interest'))
            ),
            (gradeBand === '6-8' || gradeBand === '9-12') && h('p', { className: 'text-[11px] text-slate-600 mt-1' }, '\uD83D\uDCA1 That ' + loanRate + '% rate costs you ' + fmtMoney(loanResult.totalInterest) + ' extra \u2014 a ' + (loanPrincipal > 0 ? Math.round(loanResult.totalInterest / loanPrincipal * 100) : 0) + '% markup on the loan.')
          )
        ),

        // ═══ COOKING TAB ═══
        tab === 'foodconfidence' && h('div', { className: 'space-y-4', 'data-lifeskills-food-confidence': 'true' },
          h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.food_confidence_lab', '\uD83E\uDD57 Food Confidence Lab')),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed max-w-2xl' }, gradeText(gradeBand,
                  'Practice simple food choices: wash, store, label, ask, and throw food out when it seems unsafe.',
                  'Build confidence with leftovers, storage, pantry meals, date labels, and safer food decisions.',
                  'Use food-safety judgment, meal planning, budget ingredients, and nutrition-label comparison tools.',
                  'Model food confidence as risk reduction, storage decisions, resource planning, label literacy, and low-waste meal strategy.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-emerald-800' }, 'Food readiness'),
                h('p', { className: 'text-2xl font-black text-emerald-900 leading-none' }, Math.round(foodConfidenceDone / FOOD_CONFIDENCE_CHECKS.length * 100) + '%')
              )
            ),
            h('p', { className: 'text-[11px] text-slate-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2 leading-relaxed' }, 'Practice only. For allergies, medical diets, recalls, spoiled food, damaged cans, unsafe storage time, or uncertainty, ask a trusted adult or reliable food-safety source. When in doubt, throw it out.')
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Food confidence checklist'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, foodConfidenceDone + '/' + FOOD_CONFIDENCE_CHECKS.length + ' habits checked')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200' }, 'Build the routine')
              ),
              FOOD_CONFIDENCE_CHECKS.map(function(step) {
                var checked = !!foodConfidenceChecklist[step.id];
                return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-emerald-300') },
                  h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setFoodConfidenceCheck(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4', 'aria-label': step.title }),
                  h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                  h('span', { className: 'min-w-0' },
                    h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                    h('span', { className: 'block text-[11px] text-slate-700 leading-relaxed' }, step.action),
                    h('span', { className: 'block text-[11px] text-emerald-800 mt-1 font-medium' }, 'Why: ' + step.why)
                  )
                );
              })
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Leftover and storage decisions'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, 'What is the safest next step?')
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200' }, 'Score ' + foodConfidenceScenarioScore)
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-xl p-3' }, foodConfidenceCurrentScenario.prompt),
              h('div', { className: 'grid gap-2' },
                FOOD_CONFIDENCE_ACTIONS.map(function(action) {
                  var chosen = foodConfidenceScenarioChoice === action.id;
                  return h('button', { key: action.id, onClick: function() { answerFoodConfidenceScenario(action.id); }, className: 'text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-700 ' + (chosen ? action.tone + ' ring-2 ring-offset-1 ring-emerald-700' : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-300') }, action.label);
                })
              ),
              foodConfidenceScenarioFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (foodConfidenceScenarioFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, foodConfidenceScenarioFb),
              h('button', { onClick: function() { updMulti({ foodConfidenceScenarioIdx: foodConfidenceScenarioIdx + 1, foodConfidenceScenarioChoice: '', foodConfidenceScenarioFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-700 text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-700' }, 'Next scenario')
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Storage confidence cards'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, foodStorageCard.icon + ' ' + foodStorageCard.title)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200' }, 'Keep, watch, use')
              ),
              h('div', { className: 'flex flex-wrap gap-2' },
                FOOD_STORAGE_CARDS.map(function(card, i) {
                  var active = i === foodStorageIdx % FOOD_STORAGE_CARDS.length;
                  return h('button', { key: card.id, onClick: function() { upd('foodStorageIdx', i); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold border focus:outline-none focus:ring-2 focus:ring-emerald-700 ' + (active ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-300') }, card.icon + ' ' + card.title);
                })
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3 space-y-2' },
                h('p', { className: 'text-xs font-black text-slate-800' }, 'Keep'),
                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed' }, foodStorageCard.keep),
                h('p', { className: 'text-xs font-black text-red-800 pt-2 border-t border-slate-100' }, 'Watch for'),
                h('p', { className: 'text-[11px] text-red-800 font-medium leading-relaxed' }, foodStorageCard.watch),
                h('p', { className: 'text-xs font-black text-emerald-800 pt-2 border-t border-slate-100' }, 'Low-waste tip'),
                h('p', { className: 'text-[11px] text-emerald-800 leading-relaxed' }, foodStorageCard.tip)
              )
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Budget meal builder'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, foodBase.name + ' + ' + foodProtein.name + ' + ' + foodProduce.name)
                ),
                h('span', { className: 'px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200' }, '$' + foodMealCost.toFixed(2) + ' estimate')
              ),
              [
                { label: 'Base', value: foodBaseIdx, key: 'foodBaseIdx', items: FOOD_MEAL_BASES },
                { label: 'Protein', value: foodProteinIdx, key: 'foodProteinIdx', items: FOOD_MEAL_PROTEINS },
                { label: 'Produce', value: foodProduceIdx, key: 'foodProduceIdx', items: FOOD_MEAL_PRODUCE },
                { label: 'Flavor', value: foodFlavorIdx, key: 'foodFlavorIdx', items: FOOD_MEAL_FLAVORS }
              ].map(function(group) {
                var current = group.items[group.value % group.items.length];
                return h('div', { key: group.key, className: 'grid sm:grid-cols-[110px_1fr] gap-2 items-start' },
                  h('label', { className: 'text-[11px] font-bold text-slate-600 uppercase pt-2', htmlFor: group.key }, group.label),
                  h('div', null,
                    h('select', { id: group.key, value: group.value, onChange: function(e) { upd(group.key, parseInt(e.target.value, 10) || 0); }, className: 'w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold bg-white text-slate-800' },
                      group.items.map(function(item, i) { return h('option', { key: item.name, value: i }, item.name + ' - $' + item.cost.toFixed(2)); })
                    ),
                    h('p', { className: 'text-[11px] text-slate-700 mt-1' }, current.note)
                  )
                );
              }),
              h('div', { className: 'rounded-xl bg-emerald-50 border border-emerald-200 p-3' },
                h('p', { className: 'text-[10px] uppercase font-bold text-emerald-800' }, 'Pattern'),
                h('p', { className: 'text-sm font-black text-emerald-900' }, 'Base + protein + produce + flavor'),
                h('p', { className: 'text-[11px] text-emerald-800 leading-relaxed' }, 'This pattern turns pantry basics and leftovers into a meal without needing a perfect recipe.')
              )
            )
          ),
          h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Simple nutrition label practice'),
                  h('h5', { className: 'text-sm font-black text-slate-800' }, foodLabel.name)
                ),
                h('button', { onClick: function() { updMulti({ foodLabelIdx: foodLabelIdx + 1, foodLabelAnswer: '', foodLabelFb: '' }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold bg-white border border-slate-300 text-slate-700 hover:border-emerald-300' }, 'New label')
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-300 p-3' },
                h('p', { className: 'text-base font-black text-slate-900 border-b border-slate-300 pb-1 mb-2' }, 'Nutrition Facts'),
                [
                  ['Calories', foodLabel.calories],
                  ['Protein', foodLabel.protein + 'g'],
                  ['Fiber', foodLabel.fiber + 'g'],
                  ['Added sugar', foodLabel.addedSugar + 'g'],
                  ['Sodium', foodLabel.sodium + 'mg']
                ].map(function(row) {
                  return h('div', { key: row[0], className: 'flex justify-between gap-3 py-1 border-b border-slate-100 text-xs' },
                    h('span', { className: 'font-bold text-slate-700' }, row[0]),
                    h('span', { className: 'font-black text-slate-900' }, row[1])
                  );
                })
              ),
              h('label', { className: 'block text-xs font-bold text-slate-700' },
                foodLabel.question,
                h('input', { value: foodLabelAnswer, onChange: function(e) { upd('foodLabelAnswer', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') checkFoodLabelAnswer(); }, placeholder: 'Type the label clue here', className: 'mt-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white', 'aria-label': 'Nutrition label answer' })
              ),
              h('button', { onClick: checkFoodLabelAnswer, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700' }, 'Check label'),
              foodLabelFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (foodLabelFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200') }, foodLabelFb)
            ),
            h('div', { className: glassCard + ' grid sm:grid-cols-3 gap-3' },
              h('div', { className: 'rounded-xl bg-blue-50 border border-blue-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-blue-800' }, 'Leftovers'), h('p', { className: 'text-sm font-black text-blue-900' }, 'Cool, cover, label'), h('p', { className: 'text-[11px] text-blue-800 leading-relaxed' }, 'A label turns a mystery container into a plan.')),
              h('div', { className: 'rounded-xl bg-amber-50 border border-amber-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-amber-800' }, 'Date labels'), h('p', { className: 'text-sm font-black text-amber-900' }, 'Quality vs safety'), h('p', { className: 'text-[11px] text-amber-800 leading-relaxed' }, 'Best-by dates are clues, not the only safety signal.')),
              h('div', { className: 'rounded-xl bg-red-50 border border-red-200 p-3' }, h('p', { className: 'text-[10px] uppercase font-bold text-red-800' }, 'When in doubt'), h('p', { className: 'text-sm font-black text-red-900' }, 'Throw it out'), h('p', { className: 'text-[11px] text-red-800 leading-relaxed' }, 'Do not taste-test food that might be unsafe.'))
            )
          )
        ),

        tab === 'cooking' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, __alloT('stem.lifeskills.cooking_food_safety', '\uD83C\uDF73 Cooking & Food Safety')),
            h('p', { className: 'text-xs text-slate-600' }, gradeText(gradeBand, 'Cooking is science you can eat!', 'Learn food safety temps, scale recipes, and read nutrition labels.', 'Kitchen STEM: food safety microbiology, recipe ratios, and nutrition label analysis.', 'Food science: safe internal temps, danger zone microbiology, recipe scaling algebra, and FDA nutrition label literacy.'))
          ),
          // Recipe Scaler
          h('div', { className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, __alloT('stem.lifeskills.recipe_scaler', '\uD83D\uDCCF Recipe Scaler')),
            h('div', { className: 'flex gap-2 mb-2' },
              RECIPES.map(function(r, i) {
                return h('button', { 'aria-label': 'Select recipe: ' + r.name, key: i, onClick: function() { updMulti({ cookRecipeIdx: i, cookScale: 1 }); }, className: 'px-2 py-1 rounded-lg text-[11px] font-bold ' + (cookRecipeIdx % RECIPES.length === i ? 'bg-teal-700 text-white' : 'bg-white border border-slate-400') }, r.icon + ' ' + r.name);
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
                h('caption', { className: 'sr-only' }, __alloT('stem.lifeskills.servings', 'Servings')), h('thead', null, h('tr', { className: 'border-b border-slate-200' }, h('th', { scope: 'col', className: 'px-2 py-1 text-left' }, __alloT('stem.lifeskills.ingredient', 'Ingredient')), h('th', { className: 'px-2 py-1 text-right' }, __alloT('stem.lifeskills.original', 'Original')), h('th', { className: 'px-2 py-1 text-right text-teal-600 font-bold' }, __alloT('stem.lifeskills.scaled', 'Scaled')))),
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
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, __alloT('stem.lifeskills.nutrition_label_quiz', '\uD83C\uDF4E Nutrition Label Quiz')),
            h('p', { className: 'text-xs text-slate-600' }, 'Score: ' + nutritionScore + '/' + NUTRITION_LABELS.length),
            h('div', { className: 'bg-white rounded-xl p-3 border border-slate-400 font-mono text-[11px] space-y-0.5' },
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
              }, placeholder: __alloT('stem.lifeskills.your_answer', 'Your answer...'), className: 'flex-1 px-3 py-2 border border-slate-400 rounded-xl text-sm font-mono' }),
              h('button', { 'aria-label': __alloT('stem.lifeskills.check', 'Check'), onClick: function() {
                if (!nutritionAnswer.trim()) return;
                var correct = nutritionAnswer.trim().replace(/[^0-9.]/g, '') === nutritionCurrent.answer;
                stemBeep(correct);
                updMulti({ nutritionFb: correct ? '\u2705 Correct! ' + nutritionCurrent.explain : '\u274C Answer: ' + nutritionCurrent.answer + '. ' + nutritionCurrent.explain, nutritionScore: nutritionScore + (correct ? 1 : 0) });
              }, className: 'px-4 py-2 text-xs font-bold bg-teal-700 text-white rounded-xl' }, __alloT('stem.lifeskills.check_2', 'Check'))
            ),
            nutritionFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (nutritionFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700') }, nutritionFb),
            h('button', { 'aria-label': __alloT('stem.lifeskills.next_label', 'Next Label'), onClick: function() { updMulti({ nutritionIdx: nutritionIdx + 1, nutritionAnswer: '', nutritionFb: '' }); }, className: 'px-3 py-1.5 text-[11px] font-bold bg-slate-100 text-slate-600 rounded-xl' }, __alloT('stem.lifeskills.next_label_2', 'Next Label \u27A1'))
          ),
          // Food Safety Temps
          h('div', { className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[11px] font-bold text-slate-600 uppercase mb-1' }, __alloT('stem.lifeskills.safe_internal_temperatures', '\uD83C\uDF21\uFE0F Safe Internal Temperatures')),
            h('p', { className: 'text-xs text-slate-600' }, 'Food safety score: ' + foodSafetyScore),
            h('div', { className: 'space-y-1' },
              FOOD_SAFETY.map(function(f) {
                var isDanger = f.food.indexOf('DANGER') >= 0;
                return h('div', { key: f.food, className: 'flex items-center gap-2 p-1.5 rounded-lg ' + (isDanger ? 'bg-red-50 border border-red-200' : 'bg-amber-50') },
                  h('span', { className: 'text-sm' }, f.icon),
                  h('div', { className: 'flex-1' },
                    h('p', { className: 'text-[11px] font-bold ' + (isDanger ? 'text-red-700' : 'text-slate-700') }, f.food),
                    h('p', { className: 'text-[11px] text-slate-600' }, f.danger)
                  ),
                  !isDanger && h('span', { className: 'text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full' }, f.tempF + '\u00B0F')
                );
              })
            ),
            // Quick quiz
            h('div', { className: 'mt-3 p-3 rounded-xl bg-white border border-slate-400' },
              h('p', { className: 'text-xs font-bold text-slate-700 mb-2' }, '\uD83E\uDDE0 Quick Quiz: What is the safe temp for ' + foodSafetyCurrent.food + '?'),
              h('div', { className: 'flex flex-wrap gap-1.5' },
                [125, 145, 155, 160, 165, 180].map(function(temp) {
                  return h('button', { key: temp, onClick: function() {
                    var correct = temp === foodSafetyCurrent.tempF;
                    stemBeep(correct);
                    updMulti({ foodSafetyFb: correct ? '\u2705 Correct! ' + foodSafetyCurrent.tempF + '\u00B0F for ' + foodSafetyCurrent.food : '\u274C It\'s ' + foodSafetyCurrent.tempF + '\u00B0F. ' + foodSafetyCurrent.danger, foodSafetyScore: foodSafetyScore + (correct ? 1 : 0) });
                    if (correct && foodSafetyScore + 1 >= 5) checkBadge('chefSafe');
                  }, className: 'px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-400 hover:border-amber-600' }, temp + '\u00B0F');
                })
              ),
              d.foodSafetyFb && h('p', { className: 'text-[11px] font-bold mt-2 p-2 rounded-lg ' + (d.foodSafetyFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700') }, d.foodSafetyFb),
              h('button', { 'aria-label': __alloT('stem.lifeskills.next_food', 'Next Food'), onClick: function() { updMulti({ foodSafetyQ: foodSafetyQ + 1, foodSafetyFb: null }); }, className: 'mt-2 px-3 py-1.5 text-[11px] font-bold bg-amber-100 text-amber-700 rounded-xl' }, __alloT('stem.lifeskills.next_food_2', 'Next Food \u27A1'))
            )
          )
        ),

        // ═══ LAUNDRY TAB ═══
        tab === 'laundry' && h('div', { className: 'space-y-4', 'data-lifeskills-laundry-lab': 'true' },
          h('div', { className: glassCard + ' space-y-3 overflow-hidden' },
            h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
              h('div', null,
                h('h4', { className: 'text-sm font-bold text-slate-700 mb-1' }, __alloT('stem.lifeskills.laundry_lab_title', '\uD83E\uDDFA Laundry Lab')),
                h('p', { className: 'text-xs text-slate-600 max-w-2xl' }, gradeText(gradeBand,
                  'Learn the steps for clean, safe clothes.',
                  'Practice sorting, choosing settings, and spotting laundry myths.',
                  'Explore detergent chemistry, stain science, water temperature, and fabric care.',
                  'Model laundry as applied chemistry: surfactants, enzymes, mechanical action, heat transfer, fiber structure, and residue control.'))
              ),
              h('div', { className: 'px-3 py-2 rounded-xl bg-teal-50 border border-teal-200 text-right' },
                h('p', { className: 'text-[10px] uppercase font-bold text-teal-600' }, 'Load readiness'),
                h('p', { className: 'text-2xl font-black text-teal-700 leading-none' }, laundryReadiness + '%')
              )
            ),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
              h('div', { className: 'p-2 rounded-xl bg-white border border-slate-200' }, h('p', { className: 'text-[10px] uppercase font-bold text-slate-500' }, 'Items'), h('p', { className: 'text-sm font-black text-slate-800' }, laundrySelectedItems.length + '/' + LAUNDRY_ITEMS.length)),
              h('div', { className: 'p-2 rounded-xl bg-white border border-slate-200' }, h('p', { className: 'text-[10px] uppercase font-bold text-slate-500' }, 'Detergent'), h('p', { className: 'text-sm font-black', style: { color: laundryDoseColor } }, laundryDoseStatus)),
              h('div', { className: 'p-2 rounded-xl bg-white border border-slate-200' }, h('p', { className: 'text-[10px] uppercase font-bold text-slate-500' }, 'Suggested temp'), h('p', { className: 'text-sm font-black text-slate-800 capitalize' }, laundrySuggestedWater)),
              h('div', { className: 'p-2 rounded-xl bg-white border border-slate-200' }, h('p', { className: 'text-[10px] uppercase font-bold text-slate-500' }, 'Issues'), h('p', { className: 'text-sm font-black ' + (laundryIssues.length ? 'text-red-600' : 'text-emerald-600') }, laundryIssues.length ? laundryIssues.length + ' to fix' : 'Clear'))
            ),
            h('div', { className: 'rounded-2xl border border-teal-100 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-3 grid sm:grid-cols-[160px_1fr] gap-3 items-center' },
              h('div', { className: 'relative mx-auto w-36 h-36 rounded-[2rem] bg-slate-800 shadow-inner border-4 border-slate-700' },
                h('div', { className: 'absolute left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-100 border-4 border-slate-500 overflow-hidden' },
                  h('div', { className: 'absolute bottom-0 left-0 right-0 bg-cyan-300/80 transition-all', style: { height: Math.max(18, Math.min(86, laundryLoadFill)) + '%' } }),
                  h('div', { className: 'absolute inset-2 rounded-full border border-white/70' }),
                  h('div', { className: 'absolute left-6 top-9 w-3 h-3 rounded-full bg-white/90' }),
                  h('div', { className: 'absolute right-7 top-12 w-2 h-2 rounded-full bg-white/90' })
                ),
                h('div', { className: 'absolute top-3 right-4 w-4 h-4 rounded-full bg-emerald-400 border border-emerald-200' })
              ),
              h('div', { className: 'space-y-2' },
                h('p', { className: 'text-xs font-bold text-slate-700' }, 'Why the setup matters'),
                h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, 'A good laundry decision balances detergent chemistry, fabric type, color transfer, load movement, rinse efficiency, and dryer heat. The washer is not magic; it is a controlled chemistry-and-motion system.'),
                h('div', { className: 'flex flex-wrap gap-1.5' },
                  ['surfactants', 'enzymes', 'agitation', 'temperature', 'rinsing', 'airflow'].map(function(tag) {
                    return h('span', { key: tag, className: 'px-2 py-1 rounded-full bg-white border border-teal-100 text-[10px] font-bold text-teal-700' }, tag);
                  })
                )
              )
            )
          ),
          h('div', { className: 'flex flex-wrap gap-2', role: 'tablist', 'aria-label': 'Laundry lab sections' },
            [
              { id: 'load', label: 'Do a Load', icon: '\u2699\uFE0F' },
              { id: 'labels', label: 'Care Labels', icon: '\uD83C\uDFF7\uFE0F' },
              { id: 'stains', label: 'Stain Rescue', icon: '\uD83E\uDDEA' },
              { id: 'myths', label: 'Myths', icon: '\uD83D\uDCA1' },
              { id: 'cost', label: 'Cost + Safety', icon: '\uD83D\uDCB8' },
              { id: 'science', label: 'Why It Works', icon: '\uD83D\uDD2C' },
              { id: 'checklist', label: 'Checklist', icon: '\u2705' }
            ].map(function(mode) {
              var active = laundryMode === mode.id;
              return h('button', { key: mode.id, role: 'tab', 'aria-selected': active, onClick: function() { upd('laundryMode', mode.id); }, className: 'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ' + (active ? 'bg-teal-700 text-white border-teal-700 shadow-sm' : 'bg-white text-slate-600 border-slate-300 hover:border-teal-400') }, mode.icon + ' ' + mode.label);
            })
          ),
          laundryMode === 'load' && h('div', { className: 'grid lg:grid-cols-2 gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2' },
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Load builder'),
                h('button', { onClick: function() { upd('laundryLoadItems', []); }, className: 'px-2 py-1 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600' }, 'Clear')
              ),
              h('div', { className: 'grid sm:grid-cols-2 gap-2' },
                LAUNDRY_ITEMS.map(function(item) {
                  var active = laundryLoadItems.indexOf(item.name) >= 0;
                  return h('button', { key: item.name, type: 'button', 'aria-pressed': active, onClick: function() { toggleLaundryItem(item.name); }, className: 'text-left p-3 rounded-xl border transition-all ' + (active ? 'bg-teal-50 border-teal-400 shadow-sm' : 'bg-white border-slate-300 hover:border-teal-300') },
                    h('div', { className: 'flex items-start gap-2' },
                      h('span', { className: 'text-xl', 'aria-hidden': 'true' }, item.icon),
                      h('div', { className: 'min-w-0' },
                        h('p', { className: 'text-xs font-black text-slate-800' }, item.name),
                        h('p', { className: 'text-[11px] text-slate-600' }, item.fabric + ' / ' + item.color + ' / ' + item.soil),
                        active && h('p', { className: 'text-[11px] text-teal-700 mt-1 font-medium' }, item.note)
                      )
                    )
                  );
                })
              )
            ),
            h('div', { className: 'space-y-4' },
              h('div', { className: glassCard + ' space-y-3' },
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Washer settings'),
                h('div', { className: 'grid grid-cols-2 gap-2' },
                  h('div', null,
                    h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Water temperature'),
                    h('select', { value: laundryWater, onChange: function(e) { upd('laundryWater', e.target.value); }, className: 'w-full mt-1 px-2 py-2 rounded-xl border border-slate-300 text-sm font-bold bg-white' },
                      h('option', { value: 'cold' }, 'Cold'),
                      h('option', { value: 'warm' }, 'Warm'),
                      h('option', { value: 'hot' }, 'Hot')
                    )
                  ),
                  h('div', null,
                    h('label', { className: 'text-[11px] font-bold text-slate-600' }, 'Cycle'),
                    h('select', { value: laundryCycle, onChange: function(e) { upd('laundryCycle', e.target.value); }, className: 'w-full mt-1 px-2 py-2 rounded-xl border border-slate-300 text-sm font-bold bg-white' },
                      h('option', { value: 'delicate' }, 'Delicate'),
                      h('option', { value: 'normal' }, 'Normal'),
                      h('option', { value: 'heavy' }, 'Heavy duty')
                    )
                  )
                ),
                slider('Detergent dose', laundryDetergent, 0.25, 2, 0.05, 'laundryDetergent', function(v) { return v.toFixed(2) + 'x'; }),
                slider('Washer fill', laundryLoadFill, 35, 100, 5, 'laundryLoadFill', function(v) { return v + '% full'; }),
                h('div', { className: 'grid grid-cols-2 gap-2 text-[11px]' },
                  h('div', { className: 'rounded-xl bg-slate-50 border border-slate-200 p-2' }, h('p', { className: 'font-bold text-slate-700' }, 'Suggested'), h('p', { className: 'text-slate-600 capitalize' }, laundrySuggestedWater + ' water / ' + laundrySuggestedCycle + ' cycle')),
                  h('div', { className: 'rounded-xl bg-slate-50 border border-slate-200 p-2' }, h('p', { className: 'font-bold text-slate-700' }, 'Chosen'), h('p', { className: 'text-slate-600 capitalize' }, laundryWater + ' water / ' + laundryCycle + ' cycle'))
                )
              ),
              h('div', { className: glassCard + ' space-y-2' },
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Load diagnosis'),
                laundryIssues.length ? h('div', { className: 'space-y-1.5' },
                  laundryIssues.map(function(issue, i) {
                    return h('p', { key: i, className: 'text-[11px] rounded-lg bg-red-50 border border-red-100 text-red-700 p-2' }, '\u26A0\uFE0F ' + issue);
                  })
                ) : h('p', { className: 'text-[11px] rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 p-2 font-bold' }, '\u2705 This load is balanced. Detergent, room to move, and fabric mix look reasonable.'),
                h('button', { disabled: laundryIssues.length > 0 || laundrySelectedItems.length === 0, onClick: function() { checkBadge('laundryPro'); awardXP(10, 'Laundry load ready'); }, className: 'mt-2 px-3 py-2 rounded-xl text-xs font-bold ' + (laundryIssues.length > 0 || laundrySelectedItems.length === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-teal-700 text-white hover:bg-teal-800') }, 'Mark load ready')
              )
            )
          ),
          laundryMode === 'labels' && h('div', { className: 'grid lg:grid-cols-[1fr_1.1fr] gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2' },
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Care label decoder'),
                h('span', { className: 'text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-1 rounded-full' }, 'Tap a symbol cue')
              ),
              h('div', { className: 'grid sm:grid-cols-2 gap-2' },
                LAUNDRY_CARE_LABELS.map(function(label, i) {
                  var active = laundryCareIdx % LAUNDRY_CARE_LABELS.length === i;
                  return h('button', { key: label.title, onClick: function() { selectLaundryCare(i); }, className: 'text-left p-3 rounded-xl border transition-all ' + (active ? 'bg-cyan-50 border-cyan-400 shadow-sm' : 'bg-white border-slate-300 hover:border-cyan-300') },
                    h('div', { className: 'flex items-center gap-2' },
                      h('span', { className: 'text-xl', 'aria-hidden': 'true' }, label.icon),
                      h('div', { className: 'min-w-0' },
                        h('p', { className: 'text-[11px] font-black text-slate-800' }, label.cue),
                        h('p', { className: 'text-[11px] text-slate-600' }, label.title)
                      )
                    )
                  );
                })
              )
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white p-4' },
                h('p', { className: 'text-[10px] uppercase font-bold text-cyan-200' }, 'Selected label'),
                h('div', { className: 'flex items-center gap-3 mt-2' },
                  h('div', { className: 'w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl' }, laundryCurrentCare.icon),
                  h('div', null,
                    h('h5', { className: 'text-base font-black' }, laundryCurrentCare.title),
                    h('p', { className: 'text-xs text-cyan-100' }, laundryCurrentCare.plain)
                  )
                )
              ),
              h('div', { className: 'grid sm:grid-cols-3 gap-2' },
                h('div', { className: 'p-3 rounded-xl bg-emerald-50 border border-emerald-100' }, h('p', { className: 'text-[10px] uppercase font-bold text-emerald-700' }, 'Why'), h('p', { className: 'text-[11px] text-emerald-800' }, laundryCurrentCare.why)),
                h('div', { className: 'p-3 rounded-xl bg-red-50 border border-red-100' }, h('p', { className: 'text-[10px] uppercase font-bold text-red-700' }, 'Avoid'), h('p', { className: 'text-[11px] text-red-800' }, laundryCurrentCare.mistake)),
                h('div', { className: 'p-3 rounded-xl bg-blue-50 border border-blue-100' }, h('p', { className: 'text-[10px] uppercase font-bold text-blue-700' }, 'Do'), h('p', { className: 'text-[11px] text-blue-800' }, laundryCurrentCare.action))
              ),
              h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, 'Care labels are decision shortcuts. They do not replace judgment, but they warn you when heat, water, bleach, agitation, or tumbling could damage the item.')
            )
          ),
          laundryMode === 'stains' && h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'rounded-2xl bg-violet-50 border border-violet-100 p-3 space-y-3' },
              h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
                h('p', { className: 'text-[11px] uppercase font-bold text-violet-700' }, 'Stain family guide'),
                h('span', { className: 'text-[11px] font-bold text-violet-700' }, laundryCurrentFamily.examples)
              ),
              h('div', { className: 'flex flex-wrap gap-1.5' },
                LAUNDRY_STAIN_FAMILIES.map(function(family, i) {
                  var active = laundryStainFamilyIdx % LAUNDRY_STAIN_FAMILIES.length === i;
                  return h('button', { key: family.name, onClick: function() { upd('laundryStainFamilyIdx', i); }, className: 'px-2 py-1 rounded-full text-[11px] font-bold border ' + (active ? 'bg-violet-700 text-white border-violet-700' : 'bg-white text-violet-700 border-violet-200') }, family.icon + ' ' + family.name);
                })
              ),
              h('div', { className: 'grid sm:grid-cols-3 gap-2' },
                h('div', { className: 'rounded-xl bg-white p-2 border border-violet-100' }, h('p', { className: 'text-[10px] uppercase font-bold text-violet-600' }, 'First move'), h('p', { className: 'text-[11px] text-slate-700' }, laundryCurrentFamily.first)),
                h('div', { className: 'rounded-xl bg-white p-2 border border-violet-100' }, h('p', { className: 'text-[10px] uppercase font-bold text-red-600' }, 'Avoid'), h('p', { className: 'text-[11px] text-slate-700' }, laundryCurrentFamily.avoid)),
                h('div', { className: 'rounded-xl bg-white p-2 border border-violet-100' }, h('p', { className: 'text-[10px] uppercase font-bold text-teal-600' }, 'Science'), h('p', { className: 'text-[11px] text-slate-700' }, laundryCurrentFamily.science))
              )
            ),
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('div', null,
                h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Stain rescue'),
                h('h5', { className: 'text-sm font-black text-slate-800' }, laundryCurrentStain.icon + ' ' + laundryCurrentStain.stain)
              ),
              h('span', { className: 'px-2 py-1 rounded-full bg-violet-50 text-violet-700 text-[11px] font-bold' }, laundryCurrentStain.type)
            ),
            h('p', { className: 'text-xs text-slate-600' }, 'Choose the best first move before the garment goes into the dryer. Stain order matters because heat can set some stains.'),
            h('div', { className: 'grid sm:grid-cols-2 gap-2' },
              laundryCurrentStain.choices.map(function(choice, i) {
                var chosen = laundryStainChoice === i;
                return h('button', { key: choice, onClick: function() { checkLaundryStain(i); }, className: 'text-left p-3 rounded-xl border text-xs font-bold transition-all ' + (chosen ? 'bg-violet-50 border-violet-400 text-violet-800' : 'bg-white border-slate-300 text-slate-700 hover:border-violet-300') }, choice);
              })
            ),
            laundryStainFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (laundryStainFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700') }, laundryStainFb),
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('span', { className: 'text-xs font-bold text-slate-600' }, 'Stain score: ' + laundryStainScore),
              h('button', { onClick: function() { updMulti({ laundryStainIdx: laundryStainIdx + 1, laundryStainChoice: null, laundryStainFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-violet-100 text-violet-700' }, 'Next stain')
            )
          ),
          laundryMode === 'myths' && h('div', { className: glassCard + ' space-y-3' },
            h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
              h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Misconception check'),
              h('span', { className: 'text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full' }, 'Score ' + laundryMythScore)
            ),
            h('p', { className: 'text-base font-black text-slate-800' }, '\u201C' + laundryCurrentMyth.statement + '\u201D'),
            h('div', { className: 'flex flex-wrap gap-2' },
              [true, false].map(function(val) {
                var chosen = laundryMythAnswer === val;
                return h('button', { key: String(val), onClick: function() { answerLaundryMyth(val); }, className: 'px-4 py-2 rounded-xl text-xs font-bold border ' + (chosen ? 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-slate-300 text-slate-700 hover:border-amber-300') }, val ? 'True' : 'False');
              })
            ),
            laundryMythFb && h('p', { className: 'text-[11px] font-bold p-2 rounded-lg ' + (laundryMythFb[0] === '\u2705' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700') }, laundryMythFb),
            h('button', { onClick: function() { updMulti({ laundryMythIdx: laundryMythIdx + 1, laundryMythAnswer: null, laundryMythFb: '' }); }, className: 'px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-100 text-amber-700' }, 'Next myth')
          ),
          laundryMode === 'cost' && h('div', { className: 'grid lg:grid-cols-[1fr_1fr] gap-4' },
            h('div', { className: glassCard + ' space-y-3' },
              h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Cost + sustainability model'),
              slider('Loads per week', laundryLoadsWeek, 1, 8, 1, 'laundryLoadsWeek', function(v) { return v + ' loads'; }),
              slider('Cold-water loads', laundryColdShare, 0, 100, 5, 'laundryColdShare', function(v) { return v + '%'; }),
              slider('Loads using dryer', laundryDryerShare, 0, 100, 5, 'laundryDryerShare', function(v) { return v + '%'; }),
              h('p', { className: 'text-[11px] text-slate-500 leading-relaxed' }, 'Estimates use simple classroom assumptions: detergent cost, warm-water energy, and dryer energy. Actual utility or laundromat costs vary.')
            ),
            h('div', { className: glassCard + ' space-y-3' },
              h('div', { className: 'grid grid-cols-3 gap-2' },
                h('div', { className: 'text-center rounded-xl bg-emerald-50 border border-emerald-100 p-2' }, h('p', { className: 'text-[10px] uppercase font-bold text-emerald-700' }, 'Monthly'), h('p', { className: 'text-lg font-black text-emerald-700' }, fmtMoney(laundryEstimatedCost))),
                h('div', { className: 'text-center rounded-xl bg-blue-50 border border-blue-100 p-2' }, h('p', { className: 'text-[10px] uppercase font-bold text-blue-700' }, 'Loads'), h('p', { className: 'text-lg font-black text-blue-700' }, Math.round(laundryMonthlyLoads))),
                h('div', { className: 'text-center rounded-xl bg-amber-50 border border-amber-100 p-2' }, h('p', { className: 'text-[10px] uppercase font-bold text-amber-700' }, 'Saved'), h('p', { className: 'text-lg font-black text-amber-700' }, fmtMoney(laundryEstimatedSavings)))
              ),
              h('div', { className: 'rounded-2xl bg-slate-900 text-white p-3 space-y-2' },
                h('p', { className: 'text-[11px] uppercase font-bold text-cyan-200' }, 'Safety habits with the biggest payoff'),
                h('ul', { className: 'space-y-1 text-[11px] text-slate-100 leading-relaxed' },
                  h('li', null, 'Clean the lint trap before every dryer run and keep airflow clear.'),
                  h('li', null, 'Never mix bleach with ammonia, vinegar, or other cleaners.'),
                  h('li', null, 'Keep pods/detergents sealed and away from younger children or pets.'),
                  h('li', null, 'Stop and check labels before using bleach, high heat, or a stain remover.')
                )
              ),
              h('div', { className: 'rounded-xl bg-white border border-slate-200 p-3' },
                h('p', { className: 'text-xs font-bold text-slate-700' }, 'Smart routine'),
                h('p', { className: 'text-[11px] text-slate-600 leading-relaxed' }, 'Full-but-not-stuffed loads, measured detergent, cold water for everyday items, and air drying delicate/stretch fabrics usually reduce cost while protecting clothing life.')
              )
            )
          ),
          laundryMode === 'science' && h('div', { className: 'grid sm:grid-cols-2 lg:grid-cols-3 gap-3' },
            LAUNDRY_SCIENCE.map(function(concept) {
              return h('div', { key: concept.title, className: glassCard + ' space-y-2' },
                h('div', { className: 'flex items-center gap-2' }, h('span', { className: 'text-xl', 'aria-hidden': 'true' }, concept.icon), h('h5', { className: 'text-sm font-black text-slate-800' }, concept.title)),
                h('p', { className: 'text-xs text-slate-600 leading-relaxed' }, concept.explain)
              );
            })
          ),
          laundryMode === 'checklist' && h('div', { className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[11px] uppercase font-bold text-slate-600' }, 'Do laundry and know why'),
            LAUNDRY_STEPS.map(function(step) {
              var checked = !!laundryChecklist[step.id];
              return h('label', { key: step.id, className: 'flex gap-3 p-3 rounded-xl border cursor-pointer ' + (checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-emerald-200') },
                h('input', { type: 'checkbox', checked: checked, onChange: function(e) { setLaundryChecklist(step.id, e.target.checked); }, className: 'mt-1 w-4 h-4' }),
                h('span', { className: 'text-lg', 'aria-hidden': 'true' }, step.icon),
                h('span', { className: 'min-w-0' },
                  h('span', { className: 'block text-xs font-black text-slate-800' }, step.title),
                  h('span', { className: 'block text-[11px] text-slate-600 leading-relaxed' }, step.action),
                  h('span', { className: 'block text-[11px] text-teal-700 mt-1 font-medium' }, 'Why: ' + step.why)
                )
              );
            })
          )
        ),

        // ═══ CHALLENGE TAB ═══
        tab === 'challenge' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, __alloT('stem.lifeskills.life_skills_challenge', '\uD83C\uDFAF Life Skills Challenge')),
            h('div', { className: 'flex gap-2 mb-3' },
              [1, 2, 3].map(function(t) {
                var labels = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
                var colors = { 1: 'bg-emerald-100 text-emerald-700', 2: 'bg-amber-100 text-amber-700', 3: 'bg-red-100 text-red-700' };
                return h('button', { key: t, onClick: function() { updMulti({ chalTier: t, chalIdx: 0, chalFeedback: '', chalAnswer: '' }); },
                  className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold ' + (chalTier === t ? colors[t] + ' ring-2 ring-offset-1' : 'bg-white text-slate-600 border border-slate-400') }, labels[t]);
              })
            ),
            h('div', { className: 'flex gap-3 text-xs' },
              h('span', { className: 'font-bold text-teal-600' }, '\uD83C\uDFC6 ' + chalScore + ' pts'),
              h('span', { className: 'font-bold text-amber-600' }, '\uD83D\uDD25 ' + chalStreak + ' streak')
            )
          ),
          h('div', { className: glassCard + ' space-y-3' },
            chalQ && h('p', { className: 'text-sm font-medium text-slate-700' }, chalQ.q),
            h('input', { type: 'text', value: chalAnswer, onChange: function(e) { upd('chalAnswer', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') chalCheck(); }, placeholder: __alloT('stem.lifeskills.type_your_answer', 'Type your answer...'), className: 'w-full px-4 py-2 border border-slate-400 rounded-xl text-sm focus:border-teal-400', 'aria-label': __alloT('stem.lifeskills.answer', 'Answer') }),
            h('div', { className: 'flex gap-2' },
              h('button', { onClick: chalCheck, className: 'px-4 py-2 text-sm font-bold bg-teal-700 hover:bg-teal-800 active:scale-95 transition-all text-white rounded-xl' }, __alloT('stem.lifeskills.check_3', 'Check')),
              h('button', { onClick: function() { upd('chalFeedback', '\uD83D\uDCA1 ' + (chalQ.h || 'No hint')); }, className: 'px-3 py-2 text-sm font-bold bg-amber-50 text-amber-600 rounded-xl' }, __alloT('stem.lifeskills.hint', '\uD83D\uDCA1 Hint')),
              h('button', { onClick: function() { updMulti({ chalIdx: chalIdx + 1, chalFeedback: '', chalAnswer: '' }); }, className: 'px-3 py-2 text-sm font-bold bg-slate-100 text-slate-600 rounded-xl' }, __alloT('stem.lifeskills.skip', 'Skip \u27A1')),
              callGemini && h('button', { onClick: function() {
                upd('chalAILoading', true);
                var tierLabel = chalTier === 1 ? 'easy' : chalTier === 2 ? 'medium' : 'hard';
                callGemini('Generate one ' + tierLabel + ' life skills question for a ' + gradeBand + ' student about taxes, insurance, records and paperwork, transportation and navigation, job readiness and workplace basics, resume building and evidence bullets, portfolio proof organization and privacy, interview practice and STAR answers, communication and conflict, time management and planning, dental care, body care and ergonomics, sleep and energy routines, medication labels, appointments and self-advocacy, home safety, digital safety, food confidence, home repair, car care, laundry science, or data literacy. Return JSON: {"q":"question","a":"short answer","h":"hint"}').then(function(res) {
                  try { var p = JSON.parse(res.replace(/```json?\n?/g, '').replace(/```/g, '').trim()); updMulti({ chalAILoading: false, chalFeedback: '', chalAnswer: '', chalAIQ: p }); } catch(e) { updMulti({ chalAILoading: false }); }
                }).catch(function() { upd('chalAILoading', false); });
              }, disabled: d.chalAILoading, className: 'px-3 py-2 text-sm font-bold bg-purple-100 text-purple-600 rounded-xl disabled:opacity-50' }, d.chalAILoading ? '\uD83E\uDDE0...' : '\u2728 AI Next')
            ),
            chalFeedback && h('p', { className: 'text-sm font-bold p-2 rounded-lg ' + (chalFeedback[0] === '\u2705' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700') }, chalFeedback)
          )
        ),

        // ═══ BATTLE TAB ═══
        tab === 'battle' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, __alloT('stem.lifeskills.adulting_defense', '\u2694\uFE0F Adulting Defense')),
            h('p', { className: 'text-xs text-slate-600' }, __alloT('stem.lifeskills.fight_ignorance_with_knowledge_answer_', 'Fight ignorance with knowledge! Answer life skills questions to defeat the Adulting Boss.'))
          ),
          !battleActive ? h('div', { className: glassCard + ' text-center space-y-3' },
            h('div', { className: 'text-5xl mb-2' }, '\uD83E\uDDED'),
            h('p', { className: 'text-sm font-bold text-slate-700' }, __alloT('stem.lifeskills.the_adulting_boss_challenges_you', 'The Adulting Boss challenges you!')),
            h('div', { className: 'flex gap-2 justify-center' },
              h('button', { onClick: function() { startBattle(false); }, className: 'px-4 py-2 text-sm font-bold bg-teal-700 hover:bg-teal-800 active:scale-95 transition-all text-white rounded-xl' }, __alloT('stem.lifeskills.start_battle', '\u2694\uFE0F Start Battle')),
              callGemini && h('button', { 'aria-label': __alloT('stem.lifeskills.ai_battle', 'AI Battle'), onClick: function() { startBattle(true); }, className: 'px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-xl' }, __alloT('stem.lifeskills.ai_battle_2', '\uD83E\uDDE0 AI Battle'))
            )
          ) : h('div', { className: glassCard },
            h('div', { className: 'space-y-2 mb-4' },
              h('div', { className: 'flex items-center gap-2' }, h('span', { className: 'text-xs font-bold text-emerald-600 w-16' }, __alloT('stem.lifeskills.you', '\uD83D\uDEE1\uFE0F You')), h('div', { className: 'flex-1 h-4 bg-slate-200 rounded-full overflow-hidden' }, h('div', { className: 'h-full rounded-full transition-all', style: { width: battlePlayerHP + '%', background: battlePlayerHP > 50 ? '#22c55e' : '#f59e0b' } })), h('span', { className: 'text-xs font-mono font-bold w-10 text-right' }, battlePlayerHP + '%')),
              h('div', { className: 'flex items-center gap-2' }, h('span', { className: 'text-xs font-bold text-red-600 w-16' }, __alloT('stem.lifeskills.boss', '\uD83D\uDC7E Boss')), h('div', { className: 'flex-1 h-4 bg-slate-200 rounded-full overflow-hidden' }, h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', className: 'h-full bg-red-500 rounded-full transition-all', style: { width: battleEnemyHP + '%' } })), h('span', { className: 'text-xs font-mono font-bold w-10 text-right' }, battleEnemyHP + '%'))
            ),
            battleOver ? h('div', { className: 'text-center py-4 space-y-2' },
              h('div', { className: 'text-4xl' }, battleWon ? '\uD83C\uDFC6' : '\uD83D\uDC7E'),
              h('p', { className: 'text-lg font-bold ' + (battleWon ? 'text-emerald-700' : 'text-red-700') }, battleWon ? 'You adulted successfully!' : 'The boss wins this round!'),
              battleFeedback && h('p', { className: 'text-xs ' + (battleFeedback[0] === '\u2705' ? 'text-emerald-600' : 'text-red-600') }, battleFeedback),
              h('div', { className: 'flex gap-2 justify-center mt-2' },
                h('button', { onClick: function() { startBattle(false); }, className: 'px-4 py-2 text-sm font-bold bg-teal-700 hover:bg-teal-800 active:scale-95 transition-all text-white rounded-xl' }, __alloT('stem.lifeskills.again', '\u21BA Again')),
                callGemini && h('button', { 'aria-label': __alloT('stem.lifeskills.ai_rematch', 'AI Rematch'), onClick: function() { startBattle(true); }, className: 'px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-xl' }, __alloT('stem.lifeskills.ai_rematch_2', '\u2728 AI Rematch'))
              )
            ) : h('div', { className: 'space-y-3' },
              (function() {
                if (battleUseAI && d.battleAILoading) return h('div', { className: 'text-center py-4' }, h('div', { className: 'text-2xl animate-pulse' }, '\uD83E\uDDE0'), h('p', { className: 'text-xs text-purple-600 font-bold' }, __alloT('stem.lifeskills.ai_generating', 'AI generating...')));
                var q = getCurrentBattleQ();
                if (!q) return null;
                return h('div', { className: 'space-y-3' },
                  battleUseAI && h('span', { className: 'px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[11px] font-bold rounded-full' }, __alloT('stem.lifeskills.ai', '\uD83E\uDDE0 AI')),
                  h('p', { className: 'text-sm font-medium text-slate-700' }, q.q),
                  h('input', { type: 'text', value: battleAnswer, onChange: function(e) { upd('battleAnswer', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') battleAttack(); }, placeholder: 'Answer...', className: 'w-full px-4 py-2 border border-slate-400 rounded-xl text-sm font-mono focus:border-red-400' }),
                  h('div', { className: 'flex gap-2' },
                    h('button', { onClick: battleAttack, className: 'px-4 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 active:scale-95 transition-all text-white rounded-xl' }, __alloT('stem.lifeskills.attack', '\u2694\uFE0F Attack!')),
                    h('button', { 'aria-label': __alloT('stem.lifeskills.hint_2', 'Hint'), onClick: function() { upd('battleFeedback', '\uD83D\uDCA1 ' + (q.h || 'No hint')); }, className: 'px-3 py-2 text-sm font-bold bg-amber-50 text-amber-600 rounded-xl' }, __alloT('stem.lifeskills.hint_3', '\uD83D\uDCA1 Hint'))
                  ),
                  battleFeedback && h('p', { className: 'text-sm font-bold p-2 rounded-lg ' + (battleFeedback[0] === '\u2705' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700') }, battleFeedback)
                );
              })()
            )
          )
        ),

        // ═══ LEARN TAB ═══
        tab === 'learn' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-3' }, __alloT('stem.lifeskills.learn_life_skills_concepts', '\uD83D\uDCDA Learn \u2014 Life Skills Concepts')),
            h('p', { className: 'text-xs text-slate-600 mb-4' }, 'Explore key topics adapted to your grade level (' + gradeBand + ').')
          ),
          LEARN_TOPICS.map(function(topic) {
            var content = topic.content[gradeBand] || topic.content['3-5'];
            return h('div', { key: topic.title, className: glassCard + ' space-y-3' },
              h('div', { className: 'flex items-center gap-2' }, h('span', { className: 'text-lg' }, topic.icon), h('h5', { className: 'text-sm font-bold text-slate-700' }, topic.title)),
              h('p', { className: 'text-xs text-slate-600 leading-relaxed' }, content),
              h('div', { className: 'flex gap-2 pt-2 border-t border-slate-100' },
                h('button', { 'aria-label': __alloT('stem.lifeskills.try_it', 'Try It'), onClick: function() { markLearnRead(topic.title); updMulti({ tab: topic.tryIt }); }, className: 'px-3 py-1.5 text-[11px] font-bold bg-violet-50 text-violet-600 rounded-lg' }, __alloT('stem.lifeskills.try_it_2', '\uD83D\uDD2C Try It')),
                callTTS && h('button', { 'aria-label': __alloT('stem.lifeskills.read_aloud', 'Read Aloud'), onClick: function() { markLearnRead(topic.title); callTTS(content); }, className: 'px-3 py-1.5 text-[11px] font-bold bg-blue-50 text-blue-600 rounded-lg' }, __alloT('stem.lifeskills.read_aloud_2', '\uD83D\uDD0A Read Aloud'))
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
              return h('div', { key: b.id, className: 'flex items-center gap-2 p-2 rounded-lg ' + (earned ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-400 opacity-50') },
                h('span', { className: 'text-lg' + (earned ? '' : ' grayscale') }, b.icon),
                h('div', null, h('p', { className: 'text-[11px] font-bold ' + (earned ? 'text-amber-700' : 'text-slate-600') }, b.name), h('p', { className: 'text-[11px] text-slate-600' }, __alloT('stem.lifeskills.' + (b.id) + '_desc', b.desc)))
              );
            })
          )
        ),

        // SR
        h('div', { className: 'sr-only', role: 'status', 'aria-live': 'polite' }, 'Life Skills Lab: ' + tab + ' view'),

        // Footer
        h('div', { className: 'text-center' },
          h('p', { className: 'text-[11px] text-slate-600' }, __alloT('stem.lifeskills.tax_calculations_are_simplified_estima', 'Tax calculations are simplified estimates for educational purposes.'))
        )
      );
    }
  });

  console.log('[StemLab] stem_tool_lifeskills.js v5.23 loaded');
})();
