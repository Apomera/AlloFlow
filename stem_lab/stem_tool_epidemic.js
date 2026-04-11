// ═══════════════════════════════════════════════════════
// stem_tool_epidemic.js — Epidemic Modeling Lab  v4.0
// Enhanced STEM Lab tool — 12 sub-tools
// SIR · SEIR · R₀ Explorer · Vaccination · Interventions
// Outbreak Map · Contact Trace · History · Scenarios
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

  // ── Epidemic Lab Audio System ──
  var _epAC = null;
  function getEpAC() { if (!_epAC) { try { _epAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_epAC && _epAC.state === 'suspended') { try { _epAC.resume(); } catch(e) {} } return _epAC; }
  function epTone(f, d, t, v) { var ac = getEpAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = t||'sine'; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxInfectionSpread() { epTone(200, 0.12, 'sawtooth', 0.05); setTimeout(function() { epTone(250, 0.1, 'sawtooth', 0.04); }, 60); }
  function sfxVaccinate() { epTone(523, 0.06, 'sine', 0.06); setTimeout(function() { epTone(659, 0.06, 'sine', 0.06); }, 50); setTimeout(function() { epTone(784, 0.08, 'sine', 0.07); }, 100); }
  function sfxOutbreakAlert() { epTone(880, 0.08, 'square', 0.06); setTimeout(function() { epTone(660, 0.08, 'square', 0.06); }, 100); setTimeout(function() { epTone(880, 0.08, 'square', 0.06); }, 200); }
  function sfxQuarantineActivate() { epTone(300, 0.15, 'sine', 0.06); setTimeout(function() { epTone(400, 0.12, 'sine', 0.05); }, 80); }
  function sfxEpCorrect() { epTone(523, 0.08, 'sine', 0.08); setTimeout(function() { epTone(659, 0.08, 'sine', 0.08); }, 70); setTimeout(function() { epTone(784, 0.12, 'sine', 0.09); }, 140); }
  function sfxEpWrong() { epTone(220, 0.2, 'sawtooth', 0.06); }
  function sfxEpClick() { epTone(600, 0.03, 'sine', 0.04); }

  // WCAG 2.1 AA: Accessibility CSS
  if (!document.getElementById('ep-a11y-css')) { var _s = document.createElement('style'); _s.id = 'ep-a11y-css'; _s.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-400 { color: #64748b !important; }'; document.head.appendChild(_s); }


  // ═══════════════════════════════════════════════════════
  // IIFE-Scope Static Data (shared across renders)
  // ═══════════════════════════════════════════════════════

  var SUBTOOLS = [
    { id: 'sir',         icon: '\uD83D\uDCC8', label: 'SIR' },
    { id: 'seir',        icon: '\uD83E\uDDA0', label: 'SEIR' },
    { id: 'r0explorer',  icon: '\uD83C\uDF21\uFE0F', label: 'R\u2080 Explorer' },
    { id: 'vaccination', icon: '\uD83D\uDC89', label: 'Vaccination' },
    { id: 'interventions', icon: '\uD83D\uDE37', label: 'Interventions' },
    { id: 'outbreakmap', icon: '\uD83D\uDDFA\uFE0F', label: 'Outbreak Map' },
    { id: 'contacttrace', icon: '\uD83D\uDD17', label: 'Contact Trace' },
    { id: 'history',     icon: '\uD83D\uDCDC', label: 'History' },
    { id: 'scenarios',   icon: '\uD83C\uDFAD', label: 'Scenarios' },
    { id: 'challenge',   icon: '\uD83C\uDFAF', label: 'Challenge' },
    { id: 'battle',      icon: '\u2694\uFE0F', label: 'Battle' },
    { id: 'learn',       icon: '\uD83D\uDCDA', label: 'Learn' }
  ];

  // ── Disease Presets ──
  var PRESETS = [
    { name: 'COVID-19',  r0: 2.5,  period: 10, latent: 5,  mortality: 1.0,  color: '#ef4444', desc: 'SARS-CoV-2 respiratory virus. Moderate R\u2080 with long infectious period.' },
    { name: 'Measles',   r0: 15,   period: 8,  latent: 10, mortality: 0.2,  color: '#f59e0b', desc: 'Highly contagious airborne virus. One of the highest R\u2080 values known.' },
    { name: 'Flu',       r0: 1.3,  period: 5,  latent: 2,  mortality: 0.1,  color: '#3b82f6', desc: 'Seasonal influenza. Low R\u2080 but rapid spread due to short latency.' },
    { name: 'Ebola',     r0: 2.0,  period: 12, latent: 8,  mortality: 50,   color: '#7c3aed', desc: 'High mortality but lower R\u2080 due to contact-only transmission.' },
    { name: 'Smallpox',  r0: 5.0,  period: 14, latent: 12, mortality: 30,   color: '#059669', desc: 'Eradicated in 1980 via global vaccination. Historic pandemic threat.' },
    { name: 'Malaria',   r0: 100,  period: 60, latent: 14, mortality: 0.3,  color: '#d946ef', desc: 'Vector-borne (mosquito). Extremely high R\u2080 in endemic regions.' }
  ];

  // ── Badges ──
  var EPI_BADGES = [
    { id: 'firstSim',      icon: '\uD83D\uDCC8', name: 'First Simulation', desc: 'Run your first SIR simulation' },
    { id: 'seirMaster',    icon: '\uD83E\uDDA0', name: 'SEIR Master', desc: 'Run an SEIR model simulation' },
    { id: 'r0Explorer',    icon: '\uD83C\uDF21\uFE0F', name: 'R\u2080 Explorer', desc: 'Compare R\u2080 for 3+ diseases' },
    { id: 'vaccHero',      icon: '\uD83D\uDC89', name: 'Vaccination Hero', desc: 'Achieve herd immunity with vaccination' },
    { id: 'outbreakMapper',icon: '\uD83D\uDDFA\uFE0F', name: 'Outbreak Mapper', desc: 'Run an outbreak map simulation' },
    { id: 'flatCurve',     icon: '\uD83D\uDCC9', name: 'Flatten the Curve', desc: 'Reduce peak infection below 20%' },
    { id: 'herdImmunity',  icon: '\uD83D\uDEE1\uFE0F', name: 'Herd Immunity', desc: 'Achieve herd immunity threshold' },
    { id: 'presetPro',     icon: '\u2B50', name: 'Preset Pro', desc: 'Try all 6 disease presets' },
    { id: 'particlePro',   icon: '\uD83D\uDD2C', name: 'Particle Pro', desc: 'Run 3 particle simulations' },
    { id: 'quizStreak3',   icon: '\uD83D\uDD25', name: 'Streak x3', desc: 'Get 3 correct answers in a row' },
    { id: 'quizStreak5',   icon: '\uD83D\uDD25', name: 'Streak x5', desc: 'Get 5 correct answers in a row' },
    { id: 'battleWin',     icon: '\u2694\uFE0F', name: 'Outbreak Defender', desc: 'Win an Outbreak Defense battle' },
    { id: 'aiBattle',      icon: '\uD83E\uDDE0', name: 'AI Combatant', desc: 'Win an AI-powered battle' },
    { id: 'scholar',       icon: '\uD83C\uDF93', name: 'Epidemiology Scholar', desc: 'Read all 4 Learn topics' },
    { id: 'npiMaster',     icon: '\uD83D\uDE37', name: 'NPI Strategist', desc: 'Flatten the curve using interventions' },
    { id: 'contactTracer', icon: '\uD83D\uDD17', name: 'Contact Tracer', desc: 'Successfully trace an infection chain' },
    { id: 'historian',     icon: '\uD83D\uDCDC', name: 'Plague Historian', desc: 'Explore all historical pandemics' },
    { id: 'scenarioSolver',icon: '\uD83C\uDFAD', name: 'Scenario Solver', desc: 'Complete an AI-generated outbreak scenario' },
    { id: 'quarantine',    icon: '\uD83D\uDEA7', name: 'Quarantine Chief', desc: 'Use quarantine zones on outbreak map' },
    { id: 'hospitalMgr',   icon: '\uD83C\uDFE5', name: 'Hospital Manager', desc: 'Keep hospital capacity below 100%' }
  ];

  // ── Challenge Questions (3 tiers × 8 = 24) ──
  var CHALLENGE_QS = [
    // Easy tier
    { tier: 1, q: 'What does the "S" stand for in SIR model?', a: 'susceptible', h: 'People who can catch the disease.' },
    { tier: 1, q: 'What does the "I" stand for in SIR model?', a: 'infected', h: 'People who currently have the disease.' },
    { tier: 1, q: 'What does the "R" stand for in SIR model?', a: 'recovered', h: 'People who had the disease and got better.' },
    { tier: 1, q: 'What does R\u2080 measure?', a: 'spread', h: 'How many people one sick person infects.' },
    { tier: 1, q: 'Name one way to slow a pandemic.', a: 'vaccination', h: 'Think about what protects people before they get sick.' },
    { tier: 1, q: 'What insect spreads malaria?', a: 'mosquito', h: 'It bites and buzzes.' },
    { tier: 1, q: 'True or false: Measles has a higher R\u2080 than COVID-19.', a: 'true', h: 'Measles R\u2080 is about 15!' },
    { tier: 1, q: 'What was the first disease eradicated by vaccines?', a: 'smallpox', h: 'Eradicated in 1980.' },

    // Medium tier
    { tier: 2, q: 'If R\u2080 = 4, what fraction must be immune for herd immunity?', a: '75%', h: 'Herd immunity threshold = 1 - 1/R\u2080.' },
    { tier: 2, q: 'In the SEIR model, what does "E" represent?', a: 'exposed', h: 'Infected but not yet infectious.' },
    { tier: 2, q: 'What is the herd immunity threshold formula?', a: '1-1/r0', h: 'Involves the basic reproduction number.' },
    { tier: 2, q: 'If R\u2080 = 2.5 and infectious period = 10 days, what is \u03B3?', a: '0.1', h: '\u03B3 = 1 / infectious period.' },
    { tier: 2, q: 'What does "flattening the curve" mean?', a: 'reducing peak', h: 'Spreading infections over more time to not overwhelm hospitals.' },
    { tier: 2, q: 'Which has higher R\u2080: Flu (1.3) or Ebola (2.0)?', a: 'ebola', h: 'Compare the two numbers.' },
    { tier: 2, q: 'What is the effective reproduction number called?', a: 'rt', h: 'R-subscript-t or R-effective.' },
    { tier: 2, q: 'What does \u03B2 (beta) represent in SIR equations?', a: 'transmission rate', h: 'Rate at which S becomes I.' },

    // Hard tier
    { tier: 3, q: 'Write the SIR equation for dI/dt.', a: 'beta*s*i-gamma*i', h: 'New infections minus recoveries.' },
    { tier: 3, q: 'If R\u2080=15 (measles), what % must be vaccinated for herd immunity?', a: '93%', h: '1 - 1/15 \u2248 0.933...' },
    { tier: 3, q: 'What is the relationship between R\u2080, \u03B2, and \u03B3?', a: 'r0=beta/gamma', h: 'R\u2080 equals transmission rate divided by recovery rate.' },
    { tier: 3, q: 'In SEIR, what parameter governs E\u2192I transition rate?', a: 'sigma', h: '\u03C3 = 1 / latent period.' },
    { tier: 3, q: 'What mathematical method is commonly used to solve SIR numerically?', a: 'euler', h: 'A simple first-order ODE solver.' },
    { tier: 3, q: 'What is R_effective when 60% of population is immune and R\u2080=2.5?', a: '1', h: 'R_eff = R\u2080 \u00D7 (1 - fraction immune).' },
    { tier: 3, q: 'Name the phenomenon where indirect protection arises from high immunity.', a: 'herd immunity', h: 'Even unvaccinated people are protected.' },
    { tier: 3, q: 'What year was smallpox officially declared eradicated?', a: '1980', h: 'The WHO declared it in the early 1980s.' }
  ];

  // ── Battle Questions (10 static + AI) ──
  var BATTLE_QS = [
    { q: 'What does SIR stand for?', a: 'susceptible infected recovered', h: 'Three compartments of the model.' },
    { q: 'If R\u2080 < 1, what happens to the epidemic?', a: 'dies out', h: 'Each person infects fewer than one other.' },
    { q: 'What is the herd immunity threshold for R\u2080 = 3?', a: '67%', h: '1 - 1/3 \u2248 0.667.' },
    { q: 'Name the "E" compartment in SEIR.', a: 'exposed', h: 'Latent period before becoming infectious.' },
    { q: 'Which disease has R\u2080 \u2248 15?', a: 'measles', h: 'One of the most contagious diseases known.' },
    { q: 'What Greek letter represents the recovery rate?', a: 'gamma', h: '\u03B3 = 1/infectious period.' },
    { q: 'Vaccines work by increasing which compartment?', a: 'recovered', h: 'They create immunity without infection.' },
    { q: 'What happens to peak infection if R\u2080 is halved?', a: 'decreases', h: 'Lower transmission = flatter curve.' },
    { q: 'What organization declared smallpox eradicated?', a: 'who', h: 'World Health Organization.' },
    { q: 'What vector transmits malaria?', a: 'mosquito', h: 'Anopheles genus specifically.' }
  ];

  // ── Learn Topics (4 topics × 4 grade bands) ──
  var LEARN_TOPICS = [
    {
      title: 'SIR Model Basics',
      icon: '\uD83D\uDCC8',
      tryIt: 'sir',
      content: {
        'K-2': 'When someone gets sick, they can spread it to healthy people. After they get better, they usually can\'t get sick from the same thing again. Scientists count three groups: healthy people (S), sick people (I), and better people (R).',
        '3-5': 'The SIR model divides a population into Susceptible, Infected, and Recovered. Susceptible people can catch the disease. Infected people are sick and can spread it. Recovered people are immune. Scientists use this to predict how diseases spread.',
        '6-8': 'The SIR model uses differential equations to track disease spread. The rate of new infections depends on how many susceptible and infected people interact (\u03B2\u00D7S\u00D7I). Recovery happens at rate \u03B3. The basic reproduction number R\u2080 = \u03B2/\u03B3 tells us the average number of secondary infections.',
        '9-12': 'The SIR compartmental model: dS/dt = -\u03B2SI, dI/dt = \u03B2SI - \u03B3I, dR/dt = \u03B3I. The epidemic threshold theorem states an outbreak occurs when R\u2080 = \u03B2/\u03B3 > 1. The final size equation relates total infected to R\u2080 via a transcendental equation. Numerical solutions use Euler or Runge-Kutta methods.'
      }
    },
    {
      title: 'Herd Immunity',
      icon: '\uD83D\uDEE1\uFE0F',
      tryIt: 'vaccination',
      content: {
        'K-2': 'When enough people are protected from a disease, even people who aren\'t protected stay safe! It\'s like a shield that covers everyone when most people have it.',
        '3-5': 'Herd immunity happens when enough people are immune (from vaccination or recovery) that the disease can\'t find enough new people to infect. The threshold depends on how contagious the disease is. For measles (very contagious), about 95% must be immune!',
        '6-8': 'The herd immunity threshold (HIT) is calculated as 1 - 1/R\u2080. For COVID-19 (R\u2080\u22482.5), HIT \u2248 60%. For measles (R\u2080\u224815), HIT \u2248 93%. When vaccination coverage exceeds HIT, the effective reproduction number R_eff drops below 1, preventing sustained outbreaks.',
        '9-12': 'Herd immunity threshold: p_c = 1 - 1/R\u2080. This assumes homogeneous mixing; real populations have heterogeneous contact patterns, meaning the effective threshold differs. Network models show that targeted vaccination of high-degree nodes (superspreaders) can achieve herd immunity at lower coverage. Waning immunity complicates the steady state.'
      }
    },
    {
      title: 'Flattening the Curve',
      icon: '\uD83D\uDCC9',
      tryIt: 'sir',
      content: {
        'K-2': 'If too many people get sick at the same time, there aren\'t enough doctors for everyone. Washing hands and staying apart when sick helps make fewer people sick at once!',
        '3-5': 'Flattening the curve means slowing down how fast a disease spreads. Even if the same total number of people get sick, spreading it over more time means hospitals can handle it. Social distancing, masks, and hygiene all help flatten the curve.',
        '6-8': 'Interventions like social distancing reduce the transmission rate \u03B2, which lowers R\u2080. This doesn\'t eliminate the epidemic but reduces peak infection. The area under the curve (total infections) may be similar, but the peak height determines whether healthcare capacity is exceeded. This is the "flatten the curve" strategy.',
        '9-12': 'Non-pharmaceutical interventions (NPIs) modify the force of infection \u03BB = \u03B2\u00D7I/N. Contact reduction by fraction c gives \u03B2_eff = \u03B2(1-c). Time-varying R_eff(t) can be estimated from incidence data. Optimal control theory balances epidemic suppression against economic cost. The epidemic overshoot phenomenon means that even with R_eff < 1, momentum carries infections past the herd immunity threshold.'
      }
    },
    {
      title: 'Real-World Epidemiology',
      icon: '\uD83C\uDF0D',
      tryIt: 'outbreakmap',
      content: {
        'K-2': 'Scientists called epidemiologists are like disease detectives! They figure out where sickness comes from, how it spreads, and how to stop it. They helped stop diseases like smallpox forever!',
        '3-5': 'Epidemiologists study how diseases spread in populations. John Snow (1854) tracked a cholera outbreak to a contaminated water pump in London \u2014 one of the first epidemiological investigations. Today, scientists use computers to model outbreaks and plan responses.',
        '6-8': 'Modern epidemiology uses genomic sequencing to track variant evolution, contact tracing to identify transmission chains, and mathematical models to forecast hospital demand. Key metrics include incidence rate, prevalence, case fatality rate (CFR), and the effective reproduction number R_t.',
        '9-12': 'Stochastic agent-based models capture heterogeneity that ODE models miss: superspreading events (overdispersion parameter k), network topology effects, and spatial clustering. Bayesian inference on phylogenetic trees enables real-time estimation of R_t. Metapopulation models couple local SIR dynamics with mobility data to predict geographic spread.'
      }
    }
  ];

  // ── Outbreak Map Scenarios ──
  var MAP_SCENARIOS = [
    { name: 'Dense City', gridSize: 20, density: 0.85, initialInfected: 3, desc: 'Tightly packed urban population. Disease spreads rapidly.' },
    { name: 'Rural Area', gridSize: 20, density: 0.35, initialInfected: 1, desc: 'Sparse population with natural social distancing.' },
    { name: 'School', gridSize: 15, density: 0.95, initialInfected: 2, desc: 'High density, high contact rate environment.' },
    { name: 'Island Chain', gridSize: 18, density: 0.50, initialInfected: 1, desc: 'Clustered population with limited inter-cluster contact.' }
  ];

  // ── Historical Pandemics ──
  var HISTORICAL_PANDEMICS = [
    {
      name: 'Black Death',
      year: '1347\u20131353',
      pathogen: 'Yersinia pestis (bacterium)',
      deaths: '75\u2013200 million',
      worldPop: '~475 million',
      pctDeath: '~30\u201360%',
      r0Est: '~2\u20133',
      transmission: 'Flea bites (rats), respiratory droplets (pneumonic)',
      icon: '\u2620\uFE0F',
      color: '#1e293b',
      keyFacts: [
        'Killed 30\u201360% of Europe\'s population in just 6 years',
        'Spread along Silk Road trade routes from Central Asia',
        'Led to major social upheaval and the end of feudalism in parts of Europe',
        'Quarantine (40 days isolation) was invented in response \u2014 "quarantina"'
      ],
      gradeSummary: {
        'K-2': 'A long time ago, a very bad sickness called the plague spread across many countries. People didn\'t know about germs yet, so they couldn\'t stop it from spreading.',
        '3-5': 'The Black Death was a devastating plague that swept across Europe in the 1340s. It was caused by bacteria carried by fleas on rats. It killed millions of people because they had no medicine or understanding of how diseases spread.',
        '6-8': 'The Black Death (Yersinia pestis) killed 30\u201360% of Europe\'s population between 1347\u20131353. Spread via the Silk Road, it transmitted through infected flea bites and respiratory droplets. The concept of quarantine originated from this pandemic.',
        '9-12': 'Yersinia pestis caused three clinical forms: bubonic (flea vector, CFR ~60%), septicemic, and pneumonic (airborne, CFR ~95%). The pandemic triggered demographic, economic, and social transformations including labor shortages that accelerated the decline of feudalism. R\u2080 estimates vary by transmission route (2\u20133 for bubonic, higher for pneumonic).'
      }
    },
    {
      name: '1918 Influenza',
      year: '1918\u20131920',
      pathogen: 'H1N1 Influenza A virus',
      deaths: '50\u2013100 million',
      worldPop: '~1.8 billion',
      pctDeath: '~3\u20135%',
      r0Est: '~2\u20133',
      transmission: 'Respiratory droplets, aerosols',
      icon: '\uD83E\uDD27',
      color: '#b45309',
      keyFacts: [
        'Infected ~500 million people (~1/3 of world population)',
        'Unusual W-shaped mortality curve \u2014 killed healthy young adults ages 20\u201340',
        'Came in 3 waves; the second wave (fall 1918) was deadliest',
        'Cities that imposed early social distancing had lower mortality (Philadelphia vs St. Louis)'
      ],
      gradeSummary: {
        'K-2': 'About 100 years ago, a very bad flu made people sick all around the world. Doctors learned that keeping people apart helped slow the spread.',
        '3-5': 'The 1918 flu pandemic infected about 1 in 3 people on Earth. It came in three waves, with the second being the worst. Cities that closed schools and banned gatherings early had fewer deaths.',
        '6-8': 'The 1918 H1N1 pandemic infected ~500 million globally with R\u2080\u22482\u20133. It exhibited a unique W-shaped mortality curve, disproportionately killing healthy 20\u201340 year olds through cytokine storms. Early adoption of NPIs (Philadelphia vs. St. Louis) demonstrated the effectiveness of social distancing.',
        '9-12': 'H1N1 1918 caused an estimated 50\u2013100M deaths (CFR 2\u20133%). The unusual age-mortality profile (W-curve) is attributed to antigenic original sin and cytokine storm in immunologically primed young adults. The pandemic demonstrated that staggered NPI implementation critically affected mortality \u2014 a natural experiment analyzed by Hatchett et al. (2007).'
      }
    },
    {
      name: 'SARS 2003',
      year: '2002\u20132004',
      pathogen: 'SARS-CoV (coronavirus)',
      deaths: '774',
      worldPop: '~6.3 billion',
      pctDeath: '<0.001%',
      r0Est: '~2\u20134',
      transmission: 'Respiratory droplets, close contact',
      icon: '\uD83E\uDDA0',
      color: '#7c3aed',
      keyFacts: [
        'First known SARS coronavirus epidemic \u2014 originated from bat-to-civet-to-human spillover',
        'Contained through aggressive contact tracing and quarantine',
        'Only ~8,098 cases worldwide \u2014 a successful containment story',
        'Demonstrated that coronaviruses could cause severe pandemics'
      ],
      gradeSummary: {
        'K-2': 'SARS was a new type of germ that made some people very sick. Disease detectives tracked down everyone who was near a sick person and asked them to stay home. This stopped it from spreading!',
        '3-5': 'SARS was a new coronavirus that appeared in 2003. Scientists traced it back to bats. Health workers used contact tracing \u2014 finding everyone an infected person was near \u2014 to stop it from spreading to only about 8,000 people total.',
        '6-8': 'SARS-CoV (R\u2080\u22482\u20134) was contained through aggressive contact tracing, quarantine, and hospital infection control after ~8,098 cases and 774 deaths. The outbreak demonstrated both the pandemic potential of coronaviruses and the power of traditional public health measures.',
        '9-12': 'SARS-CoV had an R\u2080 of 2\u20134 with significant overdispersion (many cases from superspreading events, k<1). Containment succeeded because viral shedding peaked after symptom onset, enabling effective symptom-based surveillance. The 9.6% overall CFR and healthcare worker vulnerability foreshadowed challenges of SARS-CoV-2.'
      }
    },
    {
      name: 'COVID-19',
      year: '2019\u2013present',
      pathogen: 'SARS-CoV-2 (coronavirus)',
      deaths: '7+ million (confirmed)',
      worldPop: '~7.8 billion',
      pctDeath: '~0.09%',
      r0Est: '~2.5\u20133 (original), ~10\u201318 (Omicron)',
      transmission: 'Airborne, respiratory droplets, aerosols',
      icon: '\uD83E\uDDA0',
      color: '#ef4444',
      keyFacts: [
        'First coronavirus pandemic \u2014 caused unprecedented global lockdowns',
        'mRNA vaccines developed in record time (~11 months from sequence to authorization)',
        'Demonstrated both success and failure of different public health strategies',
        'Variants (Alpha, Delta, Omicron) showed how viruses evolve under immune pressure'
      ],
      gradeSummary: {
        'K-2': 'COVID-19 is a sickness that spread all around the world. Scientists made vaccines really fast to help protect people. Washing hands and wearing masks helped slow it down.',
        '3-5': 'COVID-19 was caused by a new coronavirus that spread across every country on Earth. Scientists created vaccines in record time using new mRNA technology. The pandemic showed how important it is to be prepared for new diseases.',
        '6-8': 'SARS-CoV-2 (R\u2080\u22482.5\u20133) caused the COVID-19 pandemic. Key features: pre-symptomatic transmission made containment difficult, mRNA vaccines were developed in ~11 months, and variants (Delta R\u2080\u22485\u20138, Omicron R\u2080\u224810\u201318) demonstrated ongoing viral evolution under immune pressure.',
        '9-12': 'SARS-CoV-2 demonstrated critical epidemiological concepts: the challenge of controlling a pathogen with significant pre-symptomatic transmission (serial interval < incubation period), the importance of overdispersion (k\u22480.1\u20130.5) in superspreading dynamics, the race between vaccination and variant emergence, and the real-world complexity of NPI implementation across diverse populations.'
      }
    },
    {
      name: 'HIV/AIDS',
      year: '1981\u2013present',
      pathogen: 'Human Immunodeficiency Virus',
      deaths: '40+ million',
      worldPop: '~4.5\u20138 billion',
      pctDeath: '~0.5%',
      r0Est: '~2\u20135',
      transmission: 'Bodily fluids (blood, sexual contact)',
      icon: '\uD83C\uDF97\uFE0F',
      color: '#dc2626',
      keyFacts: [
        'Long incubation period (years) made early detection extremely difficult',
        'Initially nearly 100% fatal; antiretroviral therapy (ART) transformed it into a manageable condition',
        'Sub-Saharan Africa disproportionately affected (>25 million living with HIV)',
        'Demonstrates how social factors (stigma, access to care) shape epidemic trajectories'
      ],
      gradeSummary: {
        'K-2': 'HIV is a germ that weakens the body\'s ability to fight other germs. Scientists created medicines that help people with HIV live long, healthy lives.',
        '3-5': 'HIV is a virus that attacks the immune system. When it was first discovered, there was no treatment. Now, special medicines called antiretrovirals let people with HIV live normal lives. It taught us how important it is to develop medicines for new diseases.',
        '6-8': 'HIV (R\u2080\u22482\u20135 depending on population) has killed 40+ million people since 1981. Its long asymptomatic incubation period (years) enabled widespread transmission before detection. Antiretroviral therapy (ART) transformed HIV from a death sentence to a chronic condition, demonstrating the power of sustained medical research.',
        '9-12': 'HIV demonstrates unique epidemiological features: extremely long infectious period, R\u2080 highly dependent on behavioral and structural factors, phylodynamic analysis reveals transmission networks, and the epidemic illustrates how social determinants (stigma, healthcare access, poverty) profoundly shape disease burden. UNAIDS 90-90-90 targets showcase the intersection of epidemiology and public health policy.'
      }
    }
  ];

  // ── NPI Intervention Types ──
  var NPI_INTERVENTIONS = [
    { id: 'masks', label: 'Mask Mandate', icon: '\uD83D\uDE37', betaReduction: 0.40, desc: 'Reduces transmission rate by ~40% through filtering respiratory droplets.', cost: 'Low', compliance: 'Moderate' },
    { id: 'distancing', label: 'Social Distancing', icon: '\uD83D\uDEB6', betaReduction: 0.30, desc: 'Reduces close contacts by ~30%. Effective in reducing transmission chains.', cost: 'Medium', compliance: 'Low' },
    { id: 'quarantine', label: 'Quarantine', icon: '\uD83C\uDFE0', betaReduction: 0.50, desc: 'Isolating exposed/infected individuals reduces spread by ~50%.', cost: 'High', compliance: 'Moderate' },
    { id: 'schoolclose', label: 'School Closures', icon: '\uD83C\uDFEB', betaReduction: 0.20, desc: 'Reduces child-to-adult transmission chains by ~20%.', cost: 'High', compliance: 'High' },
    { id: 'travban', label: 'Travel Restrictions', icon: '\u2708\uFE0F', betaReduction: 0.15, desc: 'Delays geographic spread by ~15% but doesn\'t prevent it long-term.', cost: 'Very High', compliance: 'High' },
    { id: 'handwash', label: 'Hand Hygiene', icon: '\uD83E\uDDF4', betaReduction: 0.20, desc: 'Reduces fomite transmission by ~20%. Low cost, easy to implement.', cost: 'Very Low', compliance: 'High' },
    { id: 'ventilation', label: 'Ventilation', icon: '\uD83D\uDCA8', betaReduction: 0.25, desc: 'Improved airflow reduces aerosol concentration by ~25%.', cost: 'Medium', compliance: 'High' },
    { id: 'testing', label: 'Mass Testing', icon: '\uD83E\uDDEA', betaReduction: 0.35, desc: 'Identifies and isolates cases early, reducing onward transmission by ~35%.', cost: 'High', compliance: 'Moderate' }
  ];

  // ═══════════════════════════════════════════════════════
  // Helper Functions
  // ═══════════════════════════════════════════════════════

  function fmtNum(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Math.round(n).toString();
  }

  function r0Color(r0) {
    if (r0 < 1) return '#22c55e';
    if (r0 < 2) return '#84cc16';
    if (r0 < 4) return '#f59e0b';
    if (r0 < 8) return '#ef4444';
    return '#dc2626';
  }

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

  // ── SIR Euler Solver ──
  function solveSIR(params) {
    var r0 = params.r0, vaccRate = params.vaccRate || 0, infectPeriod = params.infectPeriod, popSize = params.popSize;
    var gamma = 1 / infectPeriod;
    var beta = r0 * gamma;
    var dt = 0.5, simDays = 300;
    var initR = vaccRate / 100;
    var S = 1 - initR - 0.001;
    var I = 0.001;
    var R = initR;
    var data = [{ day: 0, S: S * 100, I: I * 100, R: R * 100 }];
    for (var t = dt; t <= simDays; t += dt) {
      var dS = -beta * S * I * dt;
      var dI = (beta * S * I - gamma * I) * dt;
      var dR = gamma * I * dt;
      S = Math.max(0, Math.min(1, S + dS));
      I = Math.max(0, Math.min(1, I + dI));
      R = Math.max(0, Math.min(1, R + dR));
      if (Math.round(t * 2) % 2 === 0) {
        data.push({ day: Math.round(t), S: S * 100, I: I * 100, R: R * 100 });
      }
    }
    return data;
  }

  // ── SEIR Euler Solver ──
  function solveSEIR(params) {
    var r0 = params.r0, vaccRate = params.vaccRate || 0, infectPeriod = params.infectPeriod, latentPeriod = params.latentPeriod || 5, popSize = params.popSize;
    var gamma = 1 / infectPeriod;
    var sigma = 1 / latentPeriod;
    var beta = r0 * gamma;
    var dt = 0.5, simDays = 300;
    var initR = vaccRate / 100;
    var S = 1 - initR - 0.001;
    var E = 0.0005;
    var I = 0.0005;
    var R = initR;
    var data = [{ day: 0, S: S * 100, E: E * 100, I: I * 100, R: R * 100 }];
    for (var t = dt; t <= simDays; t += dt) {
      var dS = -beta * S * I * dt;
      var dE = (beta * S * I - sigma * E) * dt;
      var dI = (sigma * E - gamma * I) * dt;
      var dR = gamma * I * dt;
      S = Math.max(0, Math.min(1, S + dS));
      E = Math.max(0, Math.min(1, E + dE));
      I = Math.max(0, Math.min(1, I + dI));
      R = Math.max(0, Math.min(1, R + dR));
      if (Math.round(t * 2) % 2 === 0) {
        data.push({ day: Math.round(t), S: S * 100, E: E * 100, I: I * 100, R: R * 100 });
      }
    }
    return data;
  }

  // ── Outbreak Map Grid Logic ──
  function createGrid(scenario, vaccPct) {
    var size = scenario.gridSize;
    var grid = [];
    for (var r = 0; r < size; r++) {
      var row = [];
      for (var c = 0; c < size; c++) {
        if (Math.random() < scenario.density) {
          if (Math.random() * 100 < vaccPct) {
            row.push('R'); // vaccinated = recovered/immune
          } else {
            row.push('S');
          }
        } else {
          row.push(null); // empty cell
        }
      }
      grid.push(row);
    }
    // seed initial infected
    var placed = 0;
    var attempts = 0;
    while (placed < scenario.initialInfected && attempts < 500) {
      var ri = Math.floor(Math.random() * size);
      var ci = Math.floor(Math.random() * size);
      if (grid[ri][ci] === 'S') {
        grid[ri][ci] = 'I';
        placed++;
      }
      attempts++;
    }
    return grid;
  }

  function stepGrid(grid, r0, quarantineZones) {
    var size = grid.length;
    var pInfect = Math.min(0.95, r0 * 0.08);
    var pRecover = 0.15;
    var next = grid.map(function(row) { return row.slice(); });
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (grid[r][c] === 'I') {
          // check if in quarantine zone — reduced spread
          var inQZ = false;
          if (quarantineZones) {
            for (var qz = 0; qz < quarantineZones.length; qz++) {
              var z = quarantineZones[qz];
              if (r >= z.r && r < z.r + z.size && c >= z.c && c < z.c + z.size) { inQZ = true; break; }
            }
          }
          var effectiveP = inQZ ? pInfect * 0.2 : pInfect;
          // try to infect neighbors
          var neighbors = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
          for (var n = 0; n < neighbors.length; n++) {
            var nr = r + neighbors[n][0], nc = c + neighbors[n][1];
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === 'S') {
              if (Math.random() < effectiveP) next[nr][nc] = 'I';
            }
          }
          // recover (faster in quarantine due to focused care)
          if (Math.random() < (inQZ ? pRecover * 1.5 : pRecover)) next[r][c] = 'R';
        }
      }
    }
    return next;
  }

  // ── SIR solver with NPI interventions ──
  function solveSIR_NPI(params, activeNPIs) {
    var r0 = params.r0, vaccRate = params.vaccRate || 0, infectPeriod = params.infectPeriod, popSize = params.popSize;
    var gamma = 1 / infectPeriod;
    var beta = r0 * gamma;
    // apply NPI reductions (multiplicative)
    var totalReduction = 0;
    if (activeNPIs) {
      for (var n = 0; n < activeNPIs.length; n++) {
        var npi = NPI_INTERVENTIONS.find(function(x) { return x.id === activeNPIs[n]; });
        if (npi) totalReduction = 1 - (1 - totalReduction) * (1 - npi.betaReduction);
      }
    }
    var betaEff = beta * (1 - Math.min(0.95, totalReduction));
    var dt = 0.5, simDays = 300;
    var initR = vaccRate / 100;
    var S = 1 - initR - 0.001;
    var I = 0.001;
    var R = initR;
    var hospitalCapacity = 0.05; // 5% of pop can be hospitalized
    var data = [{ day: 0, S: S * 100, I: I * 100, R: R * 100, hospitalPct: (I / hospitalCapacity) * 100 }];
    for (var t = dt; t <= simDays; t += dt) {
      var dS = -betaEff * S * I * dt;
      var dI = (betaEff * S * I - gamma * I) * dt;
      var dR = gamma * I * dt;
      S = Math.max(0, Math.min(1, S + dS));
      I = Math.max(0, Math.min(1, I + dI));
      R = Math.max(0, Math.min(1, R + dR));
      if (Math.round(t * 2) % 2 === 0) {
        data.push({ day: Math.round(t), S: S * 100, I: I * 100, R: R * 100, hospitalPct: Math.min(500, (I / hospitalCapacity) * 100) });
      }
    }
    return { data: data, betaEff: betaEff, effR0: betaEff / gamma, totalReduction: totalReduction };
  }

  // ── Contact tracing network generator ──
  function generateContactNetwork(numNodes) {
    var nodes = [];
    var edges = [];
    var cx = 350, cy = 200;
    for (var i = 0; i < numNodes; i++) {
      var angle = (i / numNodes) * Math.PI * 2;
      var radius = 120 + Math.random() * 60;
      nodes.push({
        id: i,
        x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 40,
        y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 40,
        state: 'unknown', // unknown, traced, infected, clear
        name: 'Person ' + String.fromCharCode(65 + i)
      });
    }
    // create contact edges (each person contacts 2-4 others)
    for (var j = 0; j < numNodes; j++) {
      var numContacts = 2 + Math.floor(Math.random() * 3);
      for (var k = 0; k < numContacts; k++) {
        var target = (j + 1 + Math.floor(Math.random() * (numNodes - 2))) % numNodes;
        var exists = edges.some(function(e) { return (e.from === j && e.to === target) || (e.from === target && e.to === j); });
        if (!exists && target !== j) edges.push({ from: j, to: target });
      }
    }
    // pick patient zero and infection chain
    var p0 = Math.floor(Math.random() * numNodes);
    nodes[p0].state = 'infected';
    nodes[p0].isPatientZero = true;
    // spread infection along 3-5 edges
    var infected = [p0];
    var infectionChain = [];
    var maxSpread = 3 + Math.floor(Math.random() * 3);
    for (var s = 0; s < maxSpread && infected.length > 0; s++) {
      var spreader = infected[Math.floor(Math.random() * infected.length)];
      var possibleTargets = edges.filter(function(e) {
        var target = e.from === spreader ? e.to : (e.to === spreader ? e.from : -1);
        return target >= 0 && nodes[target].state !== 'infected';
      });
      if (possibleTargets.length > 0) {
        var edge = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
        var newInfected = edge.from === spreader ? edge.to : edge.from;
        nodes[newInfected].state = 'infected';
        nodes[newInfected].infectedBy = spreader;
        infected.push(newInfected);
        infectionChain.push({ from: spreader, to: newInfected });
      }
    }
    // hide infection state (player must discover)
    var solution = infected.slice();
    for (var h = 0; h < numNodes; h++) {
      if (!nodes[h].isPatientZero) nodes[h].state = 'unknown';
    }
    return { nodes: nodes, edges: edges, solution: solution, chain: infectionChain, patientZero: p0 };
  }

  function countGrid(grid) {
    var s = 0, i = 0, r = 0;
    for (var row = 0; row < grid.length; row++) {
      for (var col = 0; col < grid[row].length; col++) {
        var cell = grid[row][col];
        if (cell === 'S') s++;
        else if (cell === 'I') i++;
        else if (cell === 'R') r++;
      }
    }
    return { S: s, I: i, R: r, total: s + i + r };
  }

  // ═══════════════════════════════════════════════════════
  // Tool Registration
  // ═══════════════════════════════════════════════════════

  window.StemLab.registerTool('epidemicSim', {
    title: 'Epidemic Modeling Lab',
    icon: '\uD83E\uDDA0',
    description: 'Simulate disease spread with SIR/SEIR models, vaccination strategies, and outbreak maps.',
    category: 'Life Science',
    gradeRange: 'K-12',
    questHooks: [
      { id: 'run_sim', label: 'Run an epidemic simulation', icon: '\uD83E\uDDA0', check: function(d) { return d.particleRunning || false; }, progress: function(d) { return d.particleRunning ? 'Running!' : 'Start sim'; } },
      { id: 'challenge_tier_2', label: 'Reach challenge tier 2', icon: '\uD83C\uDFC6', check: function(d) { return (d.chalTier || 1) >= 2; }, progress: function(d) { return 'Tier ' + (d.chalTier || 1) + '/2'; } },
      { id: 'view_3_tabs', label: 'Explore 3 epidemic model views', icon: '\uD83D\uDCCA', check: function(d) { return Object.keys(d.tabsViewed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.tabsViewed || {}).length + '/3 views'; } }
    ],
    render: function(ctx) {
      var h = React.createElement;
      var d = (ctx.toolData && ctx.toolData.epidemicSim) || {};
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var a11yClick = ctx.a11yClick;
      var canvasNarrate = ctx.canvasNarrate;
      var gradeBand = getGradeBand(ctx);

      // ── State helpers ──
      function upd(k, v) {
        ctx.setToolData(function(prev) {
          var copy = Object.assign({}, prev);
          var td = Object.assign({}, copy.epidemicSim || {});
          td[k] = v;
          copy.epidemicSim = td;
          return copy;
        });
      }
      function updMulti(obj) {
        ctx.setToolData(function(prev) {
          var copy = Object.assign({}, prev);
          var td = Object.assign({}, copy.epidemicSim || {});
          Object.keys(obj).forEach(function(k) { td[k] = obj[k]; });
          copy.epidemicSim = td;
          return copy;
        });
      }

      // ── XP + Badge helpers ──
      function awardXP(amount, reason) {
        if (typeof window.awardStemXP === 'function') window.awardStemXP('epidemicSim', amount, reason);
      }
      function checkBadge(id) {
        if (d.badges && d.badges[id]) return;
        var badges = Object.assign({}, d.badges || {});
        badges[id] = Date.now();
        upd('badges', badges);
        awardXP(15, 'Badge: ' + id);
        var b = EPI_BADGES.find(function(x) { return x.id === id; });
        if (b) { upd('badgeToast', b.icon + ' ' + b.name); sfxVaccinate(); }
        setTimeout(function() { upd('badgeToast', null); }, 3000);
      }

      function stemBeep(correct) {
        if (typeof window.stemBeep === 'function') window.stemBeep(correct);
      }

      function announceToSR(msg) {
        upd('srMsg', msg);
      }

      // ── Defaults ──
      var tab = d.tab || 'sir';
      var r0 = d.r0 != null ? d.r0 : 2.5;
      var vaccRate = d.vaccRate != null ? d.vaccRate : 0;
      var infectPeriod = d.infectPeriod != null ? d.infectPeriod : 10;
      var latentPeriod = d.latentPeriod != null ? d.latentPeriod : 5;
      var popSize = d.popSize != null ? d.popSize : 1000000;
      var selectedPreset = d.selectedPreset != null ? d.selectedPreset : 0;

      // ── SIR/SEIR data compute ──
      var sirData = (tab === 'sir' || tab === 'r0explorer' || tab === 'vaccination') ? solveSIR({ r0: r0, vaccRate: vaccRate, infectPeriod: infectPeriod, popSize: popSize }) : [];
      var seirData = tab === 'seir' ? solveSEIR({ r0: r0, vaccRate: vaccRate, infectPeriod: infectPeriod, latentPeriod: latentPeriod, popSize: popSize }) : [];

      // ── Derived stats ──
      var gamma = 1 / infectPeriod;
      var beta = r0 * gamma;
      var effR0 = r0 * (1 - vaccRate / 100);
      var herdThresh = r0 > 1 ? ((1 - 1 / r0) * 100) : 0;
      var peakI = 0, peakDay = 0, totalInf = 0;
      var activeData = tab === 'seir' ? seirData : sirData;
      for (var i = 0; i < activeData.length; i++) {
        if (activeData[i].I > peakI) {
          peakI = activeData[i].I;
          peakDay = activeData[i].day;
        }
      }
      if (activeData.length > 0) {
        totalInf = 100 - activeData[activeData.length - 1].S;
      }

      // ── Particle simulation state ──
      var particleRunning = d.particleRunning || false;

      // ── Particle canvas logic (via callback ref) ──
      function particleRef(canvas) {
        if (!canvas || !particleRunning) return;
        if (window._epiParticles) {
          cancelAnimationFrame(window._epiParticles);
          window._epiParticles = null;
        }
        var cw = 700, ch = 200;
        canvas.width = cw;
        canvas.height = ch;
        var cx = canvas.getContext('2d');
        var numP = Math.min(400, Math.max(80, Math.round(popSize / 5000)));
        var particles = [];
        var infRadius = 12;
        var pInf = Math.min(0.7, r0 * 0.04);
        var recoveryTicks = Math.round(infectPeriod * 8);

        function initParticles() {
          particles = [];
          for (var j = 0; j < numP; j++) {
            var state = 'S';
            if (j < Math.round(numP * vaccRate / 100)) state = 'R';
            else if (j < Math.round(numP * vaccRate / 100) + 3) state = 'I';
            particles.push({
              x: Math.random() * cw,
              y: Math.random() * ch,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              state: state,
              ticks: 0
            });
          }
        }

        function step() {
          for (var a = 0; a < particles.length; a++) {
            var p = particles[a];
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > cw) p.vx *= -1;
            if (p.y < 0 || p.y > ch) p.vy *= -1;
            p.x = Math.max(0, Math.min(cw, p.x));
            p.y = Math.max(0, Math.min(ch, p.y));
            if (p.state === 'I') {
              p.ticks++;
              if (p.ticks > recoveryTicks) p.state = 'R';
              for (var b = 0; b < particles.length; b++) {
                if (particles[b].state === 'S') {
                  var dx = p.x - particles[b].x, dy = p.y - particles[b].y;
                  if (dx * dx + dy * dy < infRadius * infRadius && Math.random() < pInf) {
                    particles[b].state = 'I';
                  }
                }
              }
            }
          }
        }

        function draw() {
          cx.clearRect(0, 0, cw, ch);
          cx.fillStyle = 'rgba(15,23,42,0.85)';
          cx.fillRect(0, 0, cw, ch);
          var colors = { S: '#3b82f6', I: '#ef4444', R: '#22c55e' };
          for (var j = 0; j < particles.length; j++) {
            var p = particles[j];
            cx.beginPath();
            cx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            cx.fillStyle = colors[p.state] || '#94a3b8';
            cx.fill();
          }
          // legend
          cx.font = '10px system-ui';
          cx.fillStyle = '#3b82f6'; cx.fillText('\u25CF Susceptible', 10, ch - 8);
          cx.fillStyle = '#ef4444'; cx.fillText('\u25CF Infected', 110, ch - 8);
          cx.fillStyle = '#22c55e'; cx.fillText('\u25CF Recovered', 190, ch - 8);
        }

        initParticles();
        function animate() {
          step();
          draw();
          window._epiParticles = requestAnimationFrame(animate);
        }
        animate();
        checkBadge('particlePro');
      }

      // ── SVG Chart renderer ──
      function renderSVGChart(data, compartments, width, height) {
        var w = width || 700, ht = height || 280;
        var padL = 45, padR = 15, padT = 20, padB = 30;
        var plotW = w - padL - padR, plotH = ht - padT - padB;
        var maxDay = data.length > 0 ? data[data.length - 1].day : 300;
        var compColors = { S: '#3b82f6', E: '#f59e0b', I: '#ef4444', R: '#22c55e' };
        var compLabels = { S: 'Susceptible', E: 'Exposed', I: 'Infected', R: 'Recovered' };

        function xPos(day) { return padL + (day / maxDay) * plotW; }
        function yPos(pct) { return padT + (1 - pct / 100) * plotH; }

        // grid lines
        var gridChildren = [];
        for (var g = 0; g <= 100; g += 25) {
          gridChildren.push(h('line', { key: 'g' + g, x1: padL, x2: w - padR, y1: yPos(g), y2: yPos(g), stroke: '#e2e8f0', strokeWidth: 0.5 }));
          gridChildren.push(h('text', { key: 'gt' + g, x: padL - 5, y: yPos(g) + 3, textAnchor: 'end', fill: '#94a3b8', fontSize: 9 }, g + '%'));
        }
        // x-axis labels
        for (var dd = 0; dd <= maxDay; dd += 50) {
          gridChildren.push(h('text', { key: 'xt' + dd, x: xPos(dd), y: ht - 5, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, 'd' + dd));
        }

        // herd immunity line
        if (herdThresh > 0 && herdThresh < 100) {
          var herdY = yPos(100 - herdThresh);
          gridChildren.push(h('line', { key: 'herd', x1: padL, x2: w - padR, y1: herdY, y2: herdY, stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '4,3' }));
          gridChildren.push(h('text', { key: 'herdt', x: w - padR - 2, y: herdY - 4, textAnchor: 'end', fill: '#f59e0b', fontSize: 8, fontWeight: 'bold' }, 'Herd Immunity'));
        }

        // area fills + lines
        var curves = [];
        compartments.forEach(function(comp) {
          if (data.length < 2) return;
          var pathD = 'M ' + xPos(data[0].day) + ' ' + yPos(data[0][comp]);
          var areaD = 'M ' + xPos(data[0].day) + ' ' + yPos(0) + ' L ' + xPos(data[0].day) + ' ' + yPos(data[0][comp]);
          for (var j = 1; j < data.length; j++) {
            pathD += ' L ' + xPos(data[j].day) + ' ' + yPos(data[j][comp]);
            areaD += ' L ' + xPos(data[j].day) + ' ' + yPos(data[j][comp]);
          }
          areaD += ' L ' + xPos(data[data.length - 1].day) + ' ' + yPos(0) + ' Z';
          curves.push(h('path', { key: 'a' + comp, d: areaD, fill: compColors[comp], opacity: 0.1 }));
          curves.push(h('path', { key: 'l' + comp, d: pathD, fill: 'none', stroke: compColors[comp], strokeWidth: 2 }));
        });

        // interactive hover overlay
        var hoverDay = d.hoverDay;
        var hoverElements = [];
        if (hoverDay != null && data.length > 0) {
          var closest = data[0];
          for (var hi = 0; hi < data.length; hi++) {
            if (Math.abs(data[hi].day - hoverDay) < Math.abs(closest.day - hoverDay)) closest = data[hi];
          }
          var hx = xPos(closest.day);
          hoverElements.push(h('line', { key: 'hline', x1: hx, x2: hx, y1: padT, y2: padT + plotH, stroke: '#64748b', strokeWidth: 1, strokeDasharray: '3,2' }));
          compartments.forEach(function(comp, ci) {
            var hy = yPos(closest[comp]);
            hoverElements.push(h('circle', { key: 'hc' + comp, cx: hx, cy: hy, r: 4, fill: compColors[comp], stroke: 'white', strokeWidth: 1.5 }));
          });
          // tooltip
          hoverElements.push(h('rect', { key: 'ttbg', x: Math.min(hx + 8, w - 130), y: padT, width: 120, height: 16 + compartments.length * 14, rx: 4, fill: 'rgba(15,23,42,0.9)' }));
          hoverElements.push(h('text', { key: 'ttd', x: Math.min(hx + 14, w - 124), y: padT + 12, fill: 'white', fontSize: 11, fontWeight: 'bold' }, 'Day ' + closest.day));
          compartments.forEach(function(comp, ci) {
            hoverElements.push(h('text', { key: 'tt' + comp, x: Math.min(hx + 14, w - 124), y: padT + 26 + ci * 14, fill: compColors[comp], fontSize: 9 },
              compLabels[comp] + ': ' + closest[comp].toFixed(1) + '%'));
          });
        }

        // legend
        var legendItems = compartments.map(function(comp, idx) {
          return h('g', { key: 'leg' + comp, transform: 'translate(' + (padL + idx * 100) + ',' + (ht - 0) + ')' },
            h('rect', { x: 0, y: -8, width: 10, height: 10, rx: 2, fill: compColors[comp] }),
            h('text', { x: 14, y: 0, fill: '#64748b', fontSize: 9 }, compLabels[comp])
          );
        });

        return h('svg', {
          viewBox: '0 0 ' + w + ' ' + (ht + 15),
          className: 'w-full',
          style: { maxHeight: ht + 15 + 'px' },
          onMouseMove: function(e) {
            var rect = e.currentTarget.getBoundingClientRect();
            var mx = (e.clientX - rect.left) / rect.width * w;
            var day = Math.round(((mx - padL) / plotW) * maxDay);
            if (day >= 0 && day <= maxDay) upd('hoverDay', day);
          },
          onMouseLeave: function() { upd('hoverDay', null); }
        },
          gridChildren,
          curves,
          hoverElements,
          legendItems
        );
      }

      // ── Slider helper ──
      function slider(label, value, min, max, step, key, fmt) {
        return h('div', { className: 'space-y-1' },
          h('div', { className: 'flex justify-between items-center' },
            h('span', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wide' }, label),
            h('span', { className: 'text-xs font-mono font-bold', style: { color: key === 'r0' ? r0Color(value) : '#334155' } }, fmt ? fmt(value) : value)
          ),
          h('input', {
            type: 'range', 'aria-label': 'value', min: min, max: max, step: step, value: value,
            onChange: function(e) { upd(key, parseFloat(e.target.value)); },
            className: 'w-full h-1.5 rounded-full appearance-none cursor-pointer',
            style: { accentColor: key === 'r0' ? r0Color(value) : '#6366f1' },
            'aria-label': label
          })
        );
      }

      // ── Challenge state ──
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
        var correct = chalAnswer.trim().toLowerCase().replace(/[^a-z0-9%\/\-\*\.]/g, '').indexOf(chalQ.a.toLowerCase().replace(/[^a-z0-9%\/\-\*\.]/g, '')) >= 0;
        var newStreak = correct ? chalStreak + 1 : 0;
        var bonus = correct ? (newStreak >= 5 ? 3 : newStreak >= 3 ? 2 : 1) : 0;
        var newScore = chalScore + (correct ? 10 * bonus : 0);
        stemBeep(correct);
        updMulti({
          chalFeedback: correct ? ('\u2705 Correct!' + (bonus > 1 ? ' x' + bonus + ' streak!' : '')) : ('\u274C Answer: ' + chalQ.a),
          chalStreak: newStreak,
          chalScore: newScore,
          chalAnswer: ''
        });
        if (correct) awardXP(10 * bonus, 'Challenge correct');
        if (newStreak >= 3) checkBadge('quizStreak3');
        if (newStreak >= 5) checkBadge('quizStreak5');
      }

      function chalNext() {
        updMulti({ chalIdx: chalIdx + 1, chalFeedback: '', chalAnswer: '' });
      }

      function chalAINext() {
        if (!callGemini) { chalNext(); return; }
        upd('chalAILoading', true);
        var tierLabel = chalTier === 1 ? 'easy' : chalTier === 2 ? 'medium' : 'hard';
        callGemini('Generate one ' + tierLabel + ' epidemiology question for a ' + gradeBand + ' student. Topic: SIR models, R0, herd immunity, or disease spread. Return JSON: {"q":"question","a":"short answer","h":"hint"}').then(function(res) {
          try {
            var parsed = JSON.parse(res.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
            var aiQs = (d.chalAIQs || []).concat([{ tier: chalTier, q: parsed.q, a: parsed.a, h: parsed.h || 'Think carefully!' }]);
            updMulti({ chalAIQs: aiQs, chalAILoading: false, chalFeedback: '', chalAnswer: '', chalUseAI: aiQs.length - 1 });
          } catch(e) {
            updMulti({ chalAILoading: false }); chalNext();
          }
        }).catch(function() { updMulti({ chalAILoading: false }); chalNext(); });
      }

      // resolve current challenge question (static or AI)
      var activeChalQ = chalQ;
      if (d.chalUseAI != null && d.chalAIQs && d.chalAIQs[d.chalUseAI]) {
        activeChalQ = d.chalAIQs[d.chalUseAI];
      }

      // ── Battle state ──
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
        for (var k = order.length - 1; k > 0; k--) {
          var sw = Math.floor(Math.random() * (k + 1));
          var tmp = order[k]; order[k] = order[sw]; order[sw] = tmp;
        }
        updMulti({
          battleActive: true, battleRound: 0, battlePlayerHP: 100, battleEnemyHP: 100,
          battleAnswer: '', battleFeedback: '', battleOver: false, battleWon: false,
          battleUseAI: !!useAI, battleOrder: order, battleAIQ: null, battleAILoading: false
        });
        if (useAI) generateBattleAIQ();
      }

      function getCurrentBattleQ() {
        if (battleUseAI && d.battleAIQ) return d.battleAIQ;
        if (battleOrder.length === 0) return BATTLE_QS[0];
        return BATTLE_QS[battleOrder[battleRound % battleOrder.length]];
      }

      function generateBattleAIQ() {
        if (!callGemini) return;
        upd('battleAILoading', true);
        callGemini('Generate one epidemiology battle question for a ' + gradeBand + ' student about disease modeling, R0, herd immunity, or outbreak control. Return JSON: {"q":"question","a":"short answer","h":"hint"}').then(function(res) {
          try {
            var parsed = JSON.parse(res.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
            updMulti({ battleAIQ: { q: parsed.q, a: parsed.a, h: parsed.h || 'Think about epidemic models.' }, battleAILoading: false });
          } catch(e) {
            updMulti({ battleAILoading: false, battleAIQ: null });
          }
        }).catch(function() { updMulti({ battleAILoading: false, battleAIQ: null }); });
      }

      function battleAttack() {
        var q = getCurrentBattleQ();
        if (!q || !battleAnswer.trim()) return;
        var correct = battleAnswer.trim().toLowerCase().replace(/[^a-z0-9%\/\-\*\.]/g, '').indexOf(q.a.toLowerCase().replace(/[^a-z0-9%\/\-\*\.]/g, '')) >= 0;
        var dmg = correct ? 20 + Math.floor(Math.random() * 10) : 0;
        var enemyDmg = correct ? 0 : 15 + Math.floor(Math.random() * 10);
        var newEHP = Math.max(0, battleEnemyHP - dmg);
        var newPHP = Math.max(0, battlePlayerHP - enemyDmg);
        var over = newEHP <= 0 || newPHP <= 0;
        var won = newEHP <= 0;
        stemBeep(correct);
        updMulti({
          battleEnemyHP: newEHP, battlePlayerHP: newPHP,
          battleFeedback: correct ? '\u2705 Hit! -' + dmg + ' HP to virus!' : '\u274C Wrong! Virus attacks for ' + enemyDmg + ' HP! Answer: ' + q.a,
          battleAnswer: '', battleOver: over, battleWon: won,
          battleRound: battleRound + 1, battleAIQ: null
        });
        if (correct) awardXP(10, 'Battle hit');
        if (over && won) {
          checkBadge('battleWin');
          if (battleUseAI) checkBadge('aiBattle');
          awardXP(25, 'Battle won');
        }
        if (!over && battleUseAI) generateBattleAIQ();
      }

      // ── Outbreak Map state ──
      var mapScenario = d.mapScenario != null ? d.mapScenario : 0;
      var mapVacc = d.mapVacc != null ? d.mapVacc : 0;
      var mapGrid = d.mapGrid || null;
      var mapRunning = d.mapRunning || false;
      var mapStep = d.mapStep || 0;
      var mapHistory = d.mapHistory || [];

      function initMap() {
        var sc = MAP_SCENARIOS[mapScenario];
        var grid = createGrid(sc, mapVacc);
        var counts = countGrid(grid);
        updMulti({ mapGrid: grid, mapStep: 0, mapRunning: false, mapHistory: [counts] });
        checkBadge('outbreakMapper');
      }

      // Map stepping via timer in render body
      if (mapRunning && mapGrid) {
        setTimeout(function() {
          var newGrid = stepGrid(mapGrid, r0, mapQuarantineZones);
          var counts = countGrid(newGrid);
          var hist = (mapHistory || []).concat([counts]);
          var stillInfected = counts.I > 0;
          // hospital capacity check
          var hospPct = counts.total > 0 ? (counts.I / (counts.total * hospitalBeds / 100)) * 100 : 0;
          updMulti({
            mapGrid: newGrid,
            mapStep: mapStep + 1,
            mapHistory: hist,
            mapRunning: stillInfected && mapStep < 200,
            mapHospPct: hospPct
          });
        }, 150);
      }

      // ── R0 Explorer state ──
      var r0Compared = d.r0Compared || [];

      function addR0Comparison() {
        var entry = { r0: r0, vaccRate: vaccRate, infectPeriod: infectPeriod, effR0: effR0, herd: herdThresh, peakI: peakI, peakDay: peakDay, totalInf: totalInf, preset: PRESETS[selectedPreset].name };
        var list = (r0Compared || []).concat([entry]);
        updMulti({ r0Compared: list });
        if (list.length >= 3) checkBadge('r0Explorer');
      }

      // ── Preset tracking for badge ──
      var presetsUsed = d.presetsUsed || {};

      function applyPreset(idx) {
        var p = PRESETS[idx];
        var used = Object.assign({}, presetsUsed);
        used[p.name] = true;
        updMulti({
          selectedPreset: idx, r0: p.r0, infectPeriod: p.period, latentPeriod: p.latent,
          presetsUsed: used, hoverDay: null
        });
        if (Object.keys(used).length >= PRESETS.length) checkBadge('presetPro');
      }

      // ── Run simulation badge checks ──
      function runSim() {
        sfxInfectionSpread();
        upd('hoverDay', null);
        if (tab === 'sir' || tab === 'r0explorer' || tab === 'vaccination') checkBadge('firstSim');
        if (tab === 'seir') checkBadge('seirMaster');
        if (vaccRate >= herdThresh && herdThresh > 0) checkBadge('herdImmunity');
        if (peakI < 20 && peakI > 0) checkBadge('flatCurve');
        if (vaccRate >= herdThresh && herdThresh > 0) checkBadge('vaccHero');
        awardXP(5, 'Ran simulation');
        announceToSR('Simulation complete. Peak infected: ' + peakI.toFixed(1) + '% on day ' + peakDay);
      }

      // ── Learn topics read tracking ──
      var learnRead = d.learnRead || {};
      function markLearnRead(title) {
        var lr = Object.assign({}, learnRead);
        lr[title] = true;
        upd('learnRead', lr);
        if (Object.keys(lr).length >= LEARN_TOPICS.length) checkBadge('scholar');
      }

      // ── Intervention state ──
      var activeNPIs = d.activeNPIs || [];
      var npiResult = (tab === 'interventions') ? solveSIR_NPI({ r0: r0, vaccRate: vaccRate, infectPeriod: infectPeriod, popSize: popSize }, activeNPIs) : null;
      var npiBaseline = (tab === 'interventions') ? solveSIR_NPI({ r0: r0, vaccRate: vaccRate, infectPeriod: infectPeriod, popSize: popSize }, []) : null;

      function toggleNPI(id) {
        var list = activeNPIs.slice();
        var idx = list.indexOf(id);
        if (idx >= 0) list.splice(idx, 1);
        else list.push(id);
        upd('activeNPIs', list);
      }

      function runNPISim() {
        var res = solveSIR_NPI({ r0: r0, vaccRate: vaccRate, infectPeriod: infectPeriod, popSize: popSize }, activeNPIs);
        var npiPeak = 0;
        for (var j = 0; j < res.data.length; j++) { if (res.data[j].I > npiPeak) npiPeak = res.data[j].I; }
        if (npiPeak < 20 && npiPeak > 0 && activeNPIs.length > 0) checkBadge('npiMaster');
        // check hospital capacity badge
        var overCapacity = false;
        for (var k = 0; k < res.data.length; k++) { if (res.data[k].hospitalPct > 100) overCapacity = true; }
        if (!overCapacity && activeNPIs.length > 0) checkBadge('hospitalMgr');
        awardXP(10, 'NPI simulation');
        announceToSR('NPI Simulation: R_eff = ' + res.effR0.toFixed(2) + ', reduction = ' + (res.totalReduction * 100).toFixed(0) + '%');
      }

      // ── Contact tracing state ──
      var ctNetwork = d.ctNetwork || null;
      var ctRevealed = d.ctRevealed || [];
      var ctGuesses = d.ctGuesses || 0;
      var ctScore = d.ctScore || 0;
      var ctComplete = d.ctComplete || false;

      function startContactTrace() {
        var net = generateContactNetwork(12);
        updMulti({ ctNetwork: net, ctRevealed: [net.patientZero], ctGuesses: 0, ctScore: 0, ctComplete: false, ctFeedback: null });
      }

      function traceNode(nodeId) {
        if (!ctNetwork || ctComplete) return;
        var revealed = ctRevealed.slice();
        if (revealed.indexOf(nodeId) >= 0) return;
        revealed.push(nodeId);
        var isInfected = ctNetwork.solution.indexOf(nodeId) >= 0;
        var newGuesses = ctGuesses + 1;
        var newScore = ctScore + (isInfected ? 20 : -5);
        // check if all infected found
        var allFound = ctNetwork.solution.every(function(id) { return revealed.indexOf(id) >= 0; });
        updMulti({
          ctRevealed: revealed,
          ctGuesses: newGuesses,
          ctScore: Math.max(0, newScore),
          ctComplete: allFound,
          ctFeedback: isInfected ? '\u2705 Infected! Contact traced.' : '\u274C Clear \u2014 not in chain.'
        });
        stemBeep(isInfected);
        if (allFound) {
          checkBadge('contactTracer');
          awardXP(25, 'Contact trace complete');
        }
      }

      // ── History state ──
      var historyViewed = d.historyViewed || {};
      function viewPandemic(name) {
        var hv = Object.assign({}, historyViewed);
        hv[name] = true;
        upd('historyViewed', hv);
        if (Object.keys(hv).length >= HISTORICAL_PANDEMICS.length) checkBadge('historian');
      }

      // ── Quarantine zones for outbreak map ──
      var mapQuarantineZones = d.mapQuarantineZones || [];
      function addQuarantineZone(row, col) {
        var zones = mapQuarantineZones.slice();
        zones.push({ r: Math.max(0, row - 2), c: Math.max(0, col - 2), size: 5 });
        upd('mapQuarantineZones', zones);
        checkBadge('quarantine');
      }

      // ── Hospital capacity for outbreak map ──
      var hospitalBeds = d.hospitalBeds != null ? d.hospitalBeds : 5; // % of pop

      // ── AI Scenarios state ──
      var scenarioData = d.scenarioData || null;
      var scenarioChoice = d.scenarioChoice || null;
      var scenarioResult = d.scenarioResult || null;

      function generateScenario() {
        if (!callGemini) return;
        upd('scenarioLoading', true);
        callGemini('Create a realistic fictional epidemic scenario for a ' + gradeBand + ' student. Include: disease name, origin, R0 (1-8), symptoms, transmission mode. Then present 3 response options (A, B, C) with different intervention strategies. For each option, describe the likely outcome. Return JSON: {"name":"disease name","origin":"where","r0":number,"symptoms":"brief","transmission":"how","description":"1-2 sentence scenario setup","options":[{"label":"A","strategy":"description","outcome":"what happens","score":number(0-100)}]}').then(function(res) {
          try {
            var parsed = JSON.parse(res.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
            updMulti({ scenarioData: parsed, scenarioLoading: false, scenarioChoice: null, scenarioResult: null });
          } catch(e) { upd('scenarioLoading', false); }
        }).catch(function() { upd('scenarioLoading', false); });
      }

      function chooseScenario(idx) {
        if (!scenarioData) return;
        var opt = scenarioData.options[idx];
        updMulti({ scenarioChoice: idx, scenarioResult: opt });
        checkBadge('scenarioSolver');
        awardXP(20, 'Scenario completed');
      }

      // ═══════════════════════════════════════════════════════
      // RENDER
      // ═══════════════════════════════════════════════════════

      var glassCard = 'bg-white/70 backdrop-blur-md rounded-2xl border border-white/40 shadow-lg p-4';

      return h('div', { className: 'space-y-4' },

        // ── Badge toast ──
        d.badgeToast && h('div', { className: 'fixed top-4 right-4 z-50 bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-4 py-2 rounded-xl shadow-lg text-sm font-bold animate-bounce' },
          '\uD83C\uDFC6 Badge: ' + d.badgeToast
        ),

        // ── Header ──
        h('div', { className: glassCard },
          h('div', { className: 'flex items-center justify-between flex-wrap gap-2' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-2xl' }, '\uD83E\uDDA0'),
              h('div', null,
                h('h3', { className: 'text-base font-bold text-slate-800' }, 'Epidemic Modeling Lab'),
                h('p', { className: 'text-[10px] text-slate-500' }, gradeText(gradeBand,
                  'Watch how germs spread!',
                  'Model how diseases move through populations',
                  'Simulate SIR/SEIR compartmental models',
                  'Analyze epidemiological dynamics with ODE solvers'))
              )
            ),
            // Badge count
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg border border-amber-200' },
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs' }, '\uD83C\uDFC6'),
              h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold text-amber-700' },
                Object.keys(d.badges || {}).length + '/' + EPI_BADGES.length)
            )
          )
        ),

        // ── Sub-tool tabs ──
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1.5', role: 'tablist', 'aria-label': 'Epidemic Simulator sections' },
          SUBTOOLS.map(function(st) {
            var active = tab === st.id;
            return h('button', { 'aria-label': 'Select intervention strategy',
              key: st.id,
              onClick: function() { updMulti({ tab: st.id, hoverDay: null }); announceToSR('Switched to ' + st.label); },
              className: 'px-3 py-1.5 rounded-xl text-xs font-bold transition-all ' + (active ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/70 text-slate-600 hover:bg-indigo-50 border border-slate-200'),
              role: 'tab', 'aria-selected': active
            }, st.icon + ' ' + st.label);
          })
        ),

        // ── Disease presets (shared across SIR/SEIR/R0/Vaccination) ──
        (tab === 'sir' || tab === 'seir' || tab === 'r0explorer' || tab === 'vaccination' || tab === 'interventions') &&
        h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
          h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2' }, 'Disease Presets'),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1.5' },
            PRESETS.map(function(p, idx) {
              var active = selectedPreset === idx;
              return h('button', { 'aria-label': 'Apply Preset',
                key: p.name,
                onClick: function() { applyPreset(idx); },
                className: 'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ' + (active ? 'text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'),
                style: active ? { backgroundColor: p.color } : {}
              }, p.name);
            })
          ),
          h('p', { className: 'text-[10px] text-slate-500 mt-1 italic' }, PRESETS[selectedPreset].desc)
        ),

        // ═══════════════════════════════════════════
        // SIR TAB
        // ═══════════════════════════════════════════
        tab === 'sir' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          // Sliders
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wide' }, 'Parameters'),
            slider('R\u2080 (Basic Reproduction Number)', r0, 0.5, 12, 0.1, 'r0', function(v) { return v.toFixed(1); }),
            slider('Vaccination Rate (%)', vaccRate, 0, 95, 1, 'vaccRate', function(v) { return v + '%'; }),
            slider('Infectious Period (days)', infectPeriod, 2, 30, 1, 'infectPeriod'),
            slider('Population', popSize, 1000, 10000000, 1000, 'popSize', fmtNum),
            h('button', { 'aria-label': 'Run Simulation', onClick: runSim, className: 'w-full py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md' }, '\u25B6 Run Simulation')
          ),
          // Chart
          h('div', { className: glassCard },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2' }, 'SIR Curves'),
            renderSVGChart(sirData, ['S', 'I', 'R'])
          ),
          // Stats
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
            [
              { label: 'Peak Infected', value: peakI.toFixed(1) + '%', sub: 'Day ' + peakDay, color: '#ef4444' },
              { label: 'Total Infected', value: totalInf.toFixed(1) + '%', sub: fmtNum(Math.round(totalInf / 100 * popSize)) + ' people', color: '#f59e0b' },
              { label: 'Effective R\u2080', value: effR0.toFixed(2), sub: effR0 < 1 ? 'Declining' : 'Spreading', color: r0Color(effR0) },
              { label: 'Herd Threshold', value: herdThresh.toFixed(0) + '%', sub: vaccRate >= herdThresh && herdThresh > 0 ? '\u2705 Achieved' : 'Not yet', color: '#6366f1' }
            ].map(function(s) {
              return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: s.label, className: glassCard + ' text-center' },
                h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, s.label),
                h('p', { className: 'text-lg font-bold', style: { color: s.color } }, s.value),
                h('p', { className: 'text-[10px] text-slate-500' }, s.sub)
              );
            })
          ),
          // Particle sim
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center justify-between mb-2' },
              h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wide' }, 'Particle Simulation'),
              h('button', { 'aria-label': 'Change particle running',
                onClick: function() { upd('particleRunning', !particleRunning); },
                className: 'px-3 py-1 text-[10px] font-bold rounded-lg ' + (particleRunning ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600')
              }, particleRunning ? '\u23F9 Stop' : '\u25B6 Start')
            ),
            h('canvas', { 'aria-label': 'Epidemic visualization', 
              ref: particleRef,
              className: 'w-full rounded-xl border border-slate-200',
              style: { height: '200px', background: 'rgba(15,23,42,0.85)' }
            })
          ),
          // Equations (grade-dependent)
          (gradeBand === '6-8' || gradeBand === '9-12') &&
          h('div', { className: glassCard },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2' }, 'SIR Equations'),
            h('div', { className: 'font-mono text-xs text-slate-700 space-y-1 bg-slate-50 rounded-lg p-3' },
              h('p', null, 'dS/dt = -\u03B2 \u00D7 S \u00D7 I'),
              h('p', null, 'dI/dt = \u03B2 \u00D7 S \u00D7 I - \u03B3 \u00D7 I'),
              h('p', null, 'dR/dt = \u03B3 \u00D7 I'),
              h('p', { className: 'pt-1 border-t border-slate-200 text-[10px] text-slate-500' },
                '\u03B2 = ' + beta.toFixed(4) + ' | \u03B3 = ' + gamma.toFixed(4) + ' | R\u2080 = \u03B2/\u03B3 = ' + r0.toFixed(2))
            )
          )
        ),

        // ═══════════════════════════════════════════
        // SEIR TAB
        // ═══════════════════════════════════════════
        tab === 'seir' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wide' }, 'SEIR Parameters'),
            slider('R\u2080', r0, 0.5, 12, 0.1, 'r0', function(v) { return v.toFixed(1); }),
            slider('Vaccination Rate (%)', vaccRate, 0, 95, 1, 'vaccRate', function(v) { return v + '%'; }),
            slider('Infectious Period (days)', infectPeriod, 2, 30, 1, 'infectPeriod'),
            slider('Latent Period (days)', latentPeriod, 1, 21, 1, 'latentPeriod'),
            slider('Population', popSize, 1000, 10000000, 1000, 'popSize', fmtNum),
            h('button', { 'aria-label': 'Run SEIR Simulation', onClick: runSim, className: 'w-full py-2 text-sm font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-md' }, '\u25B6 Run SEIR Simulation')
          ),
          h('div', { className: glassCard },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2' }, 'SEIR Curves'),
            renderSVGChart(seirData, ['S', 'E', 'I', 'R'])
          ),
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
            [
              { label: 'Peak Infected', value: peakI.toFixed(1) + '%', sub: 'Day ' + peakDay, color: '#ef4444' },
              { label: 'Total Infected', value: totalInf.toFixed(1) + '%', sub: fmtNum(Math.round(totalInf / 100 * popSize)), color: '#f59e0b' },
              { label: 'Latent Period', value: latentPeriod + 'd', sub: '\u03C3 = ' + (1/latentPeriod).toFixed(3), color: '#f59e0b' },
              { label: 'Herd Threshold', value: herdThresh.toFixed(0) + '%', sub: vaccRate >= herdThresh ? '\u2705 Achieved' : 'Not yet', color: '#6366f1' }
            ].map(function(s) {
              return h('div', { key: s.label, className: glassCard + ' text-center' },
                h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, s.label),
                h('p', { className: 'text-lg font-bold', style: { color: s.color } }, s.value),
                h('p', { className: 'text-[10px] text-slate-500' }, s.sub)
              );
            })
          ),
          (gradeBand === '6-8' || gradeBand === '9-12') &&
          h('div', { className: glassCard },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2' }, 'SEIR Equations'),
            h('div', { className: 'font-mono text-xs text-slate-700 space-y-1 bg-slate-50 rounded-lg p-3' },
              h('p', null, 'dS/dt = -\u03B2 \u00D7 S \u00D7 I'),
              h('p', null, 'dE/dt = \u03B2 \u00D7 S \u00D7 I - \u03C3 \u00D7 E'),
              h('p', null, 'dI/dt = \u03C3 \u00D7 E - \u03B3 \u00D7 I'),
              h('p', null, 'dR/dt = \u03B3 \u00D7 I'),
              h('p', { className: 'pt-1 border-t border-slate-200 text-[10px] text-slate-500' },
                '\u03B2=' + beta.toFixed(4) + ' | \u03B3=' + gamma.toFixed(4) + ' | \u03C3=' + (1/latentPeriod).toFixed(4) + ' | R\u2080=' + r0.toFixed(2))
            )
          ),
          h('div', { className: glassCard },
            h('p', { className: 'text-[10px] font-bold text-indigo-600 mb-1' }, '\uD83D\uDCA1 ' + gradeText(gradeBand,
              'The "E" group are people who caught the germ but aren\'t sick yet!',
              'SEIR adds an "Exposed" group \u2014 people infected but not yet contagious. This delay is the latent period.',
              'The SEIR model adds an Exposed compartment between S and I. The parameter \u03C3 = 1/latent period controls the E\u2192I transition rate.',
              'SEIR captures the incubation period: E accumulates at rate \u03B2SI and depletes at rate \u03C3E. The generation time T_g \u2248 1/\u03C3 + 1/\u03B3 affects the epidemic growth rate r = R\u2080^(1/T_g) - 1.'))
          )
        ),

        // ═══════════════════════════════════════════
        // R₀ EXPLORER TAB
        // ═══════════════════════════════════════════
        tab === 'r0explorer' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83C\uDF21\uFE0F R\u2080 Explorer'),
            h('p', { className: 'text-xs text-slate-500 mb-3' }, gradeText(gradeBand,
              'See how contagious different diseases are!',
              'Compare how fast different diseases spread by their R\u2080 number.',
              'Explore how R\u2080 affects epidemic dynamics. Add comparisons to the table below.',
              'Systematically vary R\u2080 and observe effects on peak prevalence, total attack rate, and herd immunity threshold.'))
          ),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard + ' space-y-3' },
            slider('R\u2080', r0, 0.5, 18, 0.1, 'r0', function(v) { return v.toFixed(1); }),
            slider('Vaccination (%)', vaccRate, 0, 95, 1, 'vaccRate', function(v) { return v + '%'; }),
            slider('Infectious Period', infectPeriod, 2, 30, 1, 'infectPeriod'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2' },
              h('button', { 'aria-label': '+ Add to Comparison', onClick: function() { runSim(); addR0Comparison(); }, className: 'flex-1 py-2 text-sm font-bold bg-teal-700 text-white rounded-xl hover:bg-teal-700 transition-all' }, '+ Add to Comparison'),
              h('button', { 'aria-label': 'Clear', onClick: function() { upd('r0Compared', []); }, className: 'px-3 py-2 text-sm font-bold bg-slate-100 text-slate-600 rounded-xl' }, 'Clear')
            )
          ),
          // R0 Visual Scale
          h('div', { className: glassCard },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-2' }, 'R\u2080 Danger Scale'),
            h('div', { className: 'relative h-8 rounded-full overflow-hidden' },
              h('div', { className: 'absolute inset-0', style: { background: 'linear-gradient(to right, #22c55e, #84cc16, #f59e0b, #ef4444, #dc2626)' } }),
              h('div', { className: 'absolute top-0 bottom-0 w-0.5 bg-white', style: { left: Math.min(95, (r0 / 18) * 100) + '%', boxShadow: '0 0 6px rgba(0,0,0,0.5)' } }),
              h('div', { className: 'absolute -top-5 text-[10px] font-bold text-slate-700', style: { left: Math.min(90, (r0 / 18) * 100) + '%' } }, 'R\u2080=' + r0.toFixed(1))
            ),
            h('div', { className: 'flex justify-between text-[8px] text-slate-500 mt-1' },
              h('span', null, 'Dies out (<1)'),
              h('span', null, 'Low (1-2)'),
              h('span', null, 'Moderate (2-4)'),
              h('span', null, 'High (4-8)'),
              h('span', null, 'Extreme (>8)')
            )
          ),
          // Comparison table
          r0Compared.length > 0 && h('div', { className: glassCard },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-2' }, 'Comparison Table'),
            h('div', { className: 'overflow-x-auto' },
              h('table', { className: 'w-full text-[10px]' },
                h('caption', { className: 'sr-only' }, 'Extreme (>8)'), h('thead', null,
                  h('tr', { className: 'border-b border-slate-200' },
                    ['Disease', 'R\u2080', 'R_eff', 'Vacc%', 'Herd%', 'Peak I%', 'Peak Day', 'Total%'].map(function(col) {
                      return h('th', { scope: 'col', key: col, className: 'px-2 py-1 text-left font-bold text-slate-600' }, col);
                    })
                  )
                ),
                h('tbody', null,
                  r0Compared.map(function(entry, idx) {
                    return h('tr', { key: idx, className: 'border-b border-slate-100 hover:bg-indigo-50' },
                      h('td', { className: 'px-2 py-1 font-bold' }, entry.preset),
                      h('td', { className: 'px-2 py-1 font-mono', style: { color: r0Color(entry.r0) } }, entry.r0.toFixed(1)),
                      h('td', { className: 'px-2 py-1 font-mono', style: { color: r0Color(entry.effR0) } }, entry.effR0.toFixed(2)),
                      h('td', { className: 'px-2 py-1' }, entry.vaccRate + '%'),
                      h('td', { className: 'px-2 py-1' }, entry.herd.toFixed(0) + '%'),
                      h('td', { className: 'px-2 py-1 font-mono text-red-600' }, entry.peakI.toFixed(1) + '%'),
                      h('td', { className: 'px-2 py-1' }, 'd' + entry.peakDay),
                      h('td', { className: 'px-2 py-1' }, entry.totalInf.toFixed(1) + '%')
                    );
                  })
                )
              )
            )
          ),
          // Mini chart for current
          h('div', { className: glassCard },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-2' }, 'Current SIR Curve (R\u2080=' + r0.toFixed(1) + ')'),
            renderSVGChart(sirData, ['S', 'I', 'R'], 700, 200)
          )
        ),

        // ═══════════════════════════════════════════
        // VACCINATION TAB
        // ═══════════════════════════════════════════
        tab === 'vaccination' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDC89 Vaccination Strategy'),
            h('p', { className: 'text-xs text-slate-500' }, gradeText(gradeBand,
              'Vaccines protect people from getting sick! Slide the bar to see what happens.',
              'See how vaccinating different percentages of the population changes the epidemic curve.',
              'Explore how vaccination rate affects herd immunity, R_effective, and peak infection.',
              'Analyze the relationship between vaccine coverage, effective reproduction number, and epidemic final size. Find the critical vaccination threshold p_c = 1 - 1/R\u2080.'))
          ),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard + ' space-y-3' },
            slider('R\u2080', r0, 0.5, 12, 0.1, 'r0', function(v) { return v.toFixed(1); }),
            slider('Vaccination Rate', vaccRate, 0, 95, 1, 'vaccRate', function(v) { return v + '%'; }),
            slider('Infectious Period', infectPeriod, 2, 30, 1, 'infectPeriod'),
            h('button', { 'aria-label': 'Simulate Vaccination', onClick: runSim, className: 'w-full py-2 text-sm font-bold bg-teal-700 text-white rounded-xl hover:bg-teal-700 transition-all shadow-md' }, '\uD83D\uDC89 Simulate Vaccination')
          ),
          // Herd immunity visual
          h('div', { className: glassCard },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-2' }, 'Herd Immunity Status'),
            h('div', { className: 'relative h-6 bg-slate-200 rounded-full overflow-hidden' },
              h('div', { className: 'absolute inset-y-0 left-0 rounded-full transition-all', style: { width: Math.min(100, vaccRate) + '%', background: vaccRate >= herdThresh && herdThresh > 0 ? '#22c55e' : '#3b82f6' } }),
              herdThresh > 0 && herdThresh < 100 && h('div', { className: 'absolute top-0 bottom-0 w-0.5 bg-red-500', style: { left: herdThresh + '%' } }),
              herdThresh > 0 && h('div', { className: 'absolute -top-5 text-[8px] font-bold text-red-600', style: { left: Math.min(90, herdThresh) + '%' } }, 'Threshold: ' + herdThresh.toFixed(0) + '%')
            ),
            h('div', { className: 'flex justify-between text-[10px] text-slate-500 mt-1' },
              h('span', null, '0% Vaccinated'),
              h('span', { className: 'font-bold', style: { color: vaccRate >= herdThresh && herdThresh > 0 ? '#22c55e' : '#ef4444' } },
                vaccRate >= herdThresh && herdThresh > 0 ? '\uD83D\uDEE1\uFE0F Herd Immunity Achieved!' : 'Need ' + Math.max(0, herdThresh - vaccRate).toFixed(0) + '% more'),
              h('span', null, '100%')
            )
          ),
          h('div', { className: glassCard },
            renderSVGChart(sirData, ['S', 'I', 'R'])
          ),
          h('div', { className: 'grid grid-cols-2 gap-2' },
            h('div', { className: glassCard + ' text-center' },
              h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'Without Vaccination'),
              h('p', { className: 'text-lg font-bold text-red-600' }, (function() { var d2 = solveSIR({ r0: r0, vaccRate: 0, infectPeriod: infectPeriod, popSize: popSize }); var pk = 0; for (var j = 0; j < d2.length; j++) if (d2[j].I > pk) pk = d2[j].I; return pk.toFixed(1) + '%'; })()),
              h('p', { className: 'text-[10px] text-slate-500' }, 'Peak Infected')
            ),
            h('div', { className: glassCard + ' text-center' },
              h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'With ' + vaccRate + '% Vaccinated'),
              h('p', { className: 'text-lg font-bold text-emerald-600' }, peakI.toFixed(1) + '%'),
              h('p', { className: 'text-[10px] text-slate-500' }, 'Peak Infected')
            )
          )
        ),

        // ═══════════════════════════════════════════
        // INTERVENTIONS TAB (NEW)
        // ═══════════════════════════════════════════
        tab === 'interventions' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDE37 Non-Pharmaceutical Interventions'),
            h('p', { className: 'text-xs text-slate-500' }, gradeText(gradeBand,
              'Pick ways to slow down germs! Masks, handwashing, and staying apart all help!',
              'Choose different interventions to see how they flatten the epidemic curve.',
              'Toggle NPIs to modify the effective transmission rate \u03B2. Observe combined effects on R_eff and peak infection.',
              'Explore multiplicative NPI effects on \u03B2_eff. Each intervention reduces the remaining transmission probability independently: \u03B2_eff = \u03B2 \u00D7 \u220F(1 - r_i).'))
          ),
          // NPI toggles
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard + ' space-y-2' },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2' }, 'Select Interventions'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
              NPI_INTERVENTIONS.map(function(npi) {
                var active = activeNPIs.indexOf(npi.id) >= 0;
                return h('button', { 'aria-label': 'Subtract',
                  key: npi.id,
                  onClick: function() { toggleNPI(npi.id); },
                  className: 'p-2 rounded-xl text-left transition-all border ' + (active ? 'bg-teal-50 border-teal-400 ring-2 ring-teal-200' : 'bg-white border-slate-200 hover:border-teal-300')
                },
                  h('div', { className: 'flex items-center gap-1.5' },
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-lg' }, npi.icon),
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold ' + (active ? 'text-teal-700' : 'text-slate-600') }, npi.label)
                  ),
                  h('p', { className: 'text-[8px] text-slate-500 mt-0.5' }, '-' + (npi.betaReduction * 100) + '% transmission'),
                  h('p', { className: 'text-[8px] text-slate-500' }, 'Cost: ' + npi.cost)
                );
              })
            )
          ),
          // Parameter sliders
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard + ' space-y-3' },
            slider('R\u2080', r0, 0.5, 12, 0.1, 'r0', function(v) { return v.toFixed(1); }),
            slider('Vaccination (%)', vaccRate, 0, 95, 1, 'vaccRate', function(v) { return v + '%'; }),
            slider('Infectious Period', infectPeriod, 2, 30, 1, 'infectPeriod'),
            h('button', { 'aria-label': 'Simulate with NPIs', onClick: runNPISim, className: 'w-full py-2 text-sm font-bold bg-teal-700 text-white rounded-xl hover:bg-teal-700 transition-all shadow-md' }, '\uD83D\uDE37 Simulate with NPIs')
          ),
          // Reduction summary
          npiResult && h('div', { className: glassCard },
            h('div', { className: 'grid grid-cols-3 gap-3 text-center' },
              h('div', null,
                h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, '\u03B2 Reduction'),
                h('p', { className: 'text-lg font-bold text-teal-600' }, (npiResult.totalReduction * 100).toFixed(0) + '%')
              ),
              h('div', null,
                h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'R_effective'),
                h('p', { className: 'text-lg font-bold', style: { color: r0Color(npiResult.effR0) } }, npiResult.effR0.toFixed(2))
              ),
              h('div', null,
                h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'Status'),
                h('p', { className: 'text-lg font-bold ' + (npiResult.effR0 < 1 ? 'text-emerald-600' : 'text-red-600') }, npiResult.effR0 < 1 ? 'Contained!' : 'Spreading')
              )
            )
          ),
          // Side-by-side curves
          npiResult && npiBaseline && h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            h('div', { className: glassCard },
              h('p', { className: 'text-[10px] font-bold text-red-500 uppercase mb-1' }, 'Without Interventions'),
              renderSVGChart(npiBaseline.data, ['S', 'I', 'R'], 350, 200)
            ),
            h('div', { className: glassCard },
              h('p', { className: 'text-[10px] font-bold text-teal-500 uppercase mb-1' }, 'With ' + activeNPIs.length + ' NPIs Active'),
              renderSVGChart(npiResult.data, ['S', 'I', 'R'], 350, 200)
            )
          ),
          // Hospital capacity overlay
          npiResult && h('div', { className: glassCard },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-2' }, '\uD83C\uDFE5 Hospital Capacity'),
            h('div', { className: 'space-y-2' },
              (function() {
                var maxHosp = 0;
                for (var hh = 0; hh < npiResult.data.length; hh++) {
                  if (npiResult.data[hh].hospitalPct > maxHosp) maxHosp = npiResult.data[hh].hospitalPct;
                }
                var exceeded = maxHosp > 100;
                return h('div', null,
                  h('div', { className: 'relative h-6 bg-slate-200 rounded-full overflow-hidden' },
                    h('div', { className: 'absolute inset-y-0 left-0 rounded-full transition-all', style: { width: Math.min(100, maxHosp) + '%', background: exceeded ? '#ef4444' : '#22c55e' } }),
                    h('div', { className: 'absolute top-0 bottom-0 w-0.5 bg-red-800', style: { left: '100%' } })
                  ),
                  h('p', { className: 'text-[10px] font-bold mt-1 ' + (exceeded ? 'text-red-600' : 'text-emerald-600') },
                    exceeded ? '\u26A0\uFE0F Peak hospital use: ' + maxHosp.toFixed(0) + '% of capacity \u2014 OVERWHELMED' : '\u2705 Peak hospital use: ' + maxHosp.toFixed(0) + '% of capacity')
                );
              })()
            )
          ),
          // NPI explanation
          h('div', { className: glassCard },
            h('p', { className: 'text-[10px] font-bold text-indigo-600' }, '\uD83D\uDCA1 ' + gradeText(gradeBand,
              'Each way to stay safe makes germs spread slower. Using more than one is even better!',
              'Each intervention reduces how fast the disease spreads. Using multiple interventions together gives better protection than any single one!',
              'NPIs reduce the effective \u03B2 multiplicatively. With masks (-40%) and distancing (-30%), \u03B2_eff = \u03B2 \u00D7 0.60 \u00D7 0.70 = \u03B2 \u00D7 0.42 (58% reduction). This is why layered strategies work.',
              'The multiplicative NPI model: \u03B2_eff = \u03B2 \u220F_i(1-r_i) where r_i is each intervention\'s reduction. This assumes independence of mechanisms (respiratory vs. fomite vs. contact). In practice, diminishing returns occur when interventions target the same transmission route.'))
          )
        ),

        // ═══════════════════════════════════════════
        // OUTBREAK MAP TAB
        // ═══════════════════════════════════════════
        tab === 'outbreakmap' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDDFA\uFE0F Outbreak Map'),
            h('p', { className: 'text-xs text-slate-500' }, gradeText(gradeBand,
              'Watch germs spread on a map! Blue = healthy, Red = sick, Green = better.',
              'See how diseases spread through different populations on a grid map.',
              'Agent-based grid simulation showing spatial disease transmission.',
              'Stochastic cellular automaton modeling spatial SIR dynamics with 8-neighbor contact topology.'))
          ),
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard + ' space-y-3' },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-1' }, 'Scenario'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex flex-wrap gap-1.5' },
              MAP_SCENARIOS.map(function(sc, idx) {
                var active = mapScenario === idx;
                return h('button', { 'aria-label': 'Change map running',
                  key: sc.name,
                  onClick: function() { updMulti({ mapScenario: idx, mapGrid: null, mapHistory: [] }); },
                  className: 'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ' + (active ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200')
                }, sc.name);
              })
            ),
            h('p', { className: 'text-[10px] text-slate-500 italic' }, MAP_SCENARIOS[mapScenario].desc),
            slider('R\u2080', r0, 0.5, 8, 0.1, 'r0', function(v) { return v.toFixed(1); }),
            slider('Pre-vaccinated (%)', mapVacc, 0, 90, 5, 'mapVacc', function(v) { return v + '%'; }),
            slider('Hospital Beds (% of pop)', hospitalBeds, 1, 15, 1, 'hospitalBeds', function(v) { return v + '%'; }),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2' },
              h('button', { 'aria-label': 'Generate Map', onClick: initMap, className: 'flex-1 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all' }, '\uD83D\uDDFA\uFE0F Generate Map'),
              mapGrid && h('button', { 'aria-label': 'Change map running',
                onClick: function() { upd('mapRunning', !mapRunning); },
                className: 'px-4 py-2 text-sm font-bold rounded-xl ' + (mapRunning ? 'bg-red-600 text-white' : 'bg-emerald-700 text-white')
              }, mapRunning ? '\u23F9 Stop' : '\u25B6 Run')
            )
          ),
          // Grid display
          mapGrid && h('div', { className: glassCard },
            h('div', { className: 'flex items-center justify-between mb-2' },
              h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'Step: ' + mapStep),
              (function() {
                var c = mapGrid ? countGrid(mapGrid) : { S: 0, I: 0, R: 0 };
                return h('div', { className: 'flex gap-3 text-[10px] font-bold' },
                  h('span', { className: 'text-blue-600' }, '\u25CF S:' + c.S),
                  h('span', { className: 'text-red-600' }, '\u25CF I:' + c.I),
                  h('span', { className: 'text-emerald-600' }, '\u25CF R:' + c.R)
                );
              })()
            ),
            h('div', { className: 'inline-grid gap-px bg-slate-800 rounded-lg overflow-hidden p-px', style: { gridTemplateColumns: 'repeat(' + mapGrid[0].length + ', 1fr)' } },
              mapGrid.reduce(function(cells, row, ri) {
                row.forEach(function(cell, ci) {
                  var bg = cell === 'S' ? '#3b82f6' : cell === 'I' ? '#ef4444' : cell === 'R' ? '#22c55e' : '#1e293b';
                  cells.push(h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: ri + '-' + ci, style: { width: '14px', height: '14px', backgroundColor: bg, transition: 'background-color 0.15s' } }));
                });
                return cells;
              }, [])
            )
          ),
          // Quarantine zones + hospital capacity
          mapGrid && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard + ' space-y-3' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center justify-between' },
              h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, '\uD83D\uDEA7 Quarantine Zones (' + mapQuarantineZones.length + ')'),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2' },
                h('button', { 'aria-label': '+ Add Zone',
                  onClick: function() {
                    var sc = MAP_SCENARIOS[mapScenario];
                    addQuarantineZone(Math.floor(Math.random() * sc.gridSize), Math.floor(Math.random() * sc.gridSize));
                  },
                  className: 'px-2 py-1 text-[10px] font-bold bg-amber-100 text-amber-700 rounded-lg'
                }, '+ Add Zone'),
                mapQuarantineZones.length > 0 && h('button', { 'aria-label': 'Clear',
                  onClick: function() { upd('mapQuarantineZones', []); },
                  className: 'px-2 py-1 text-[10px] font-bold bg-slate-100 text-slate-500 rounded-lg'
                }, 'Clear')
              )
            ),
            mapQuarantineZones.length > 0 && h('p', { className: 'text-[8px] text-amber-600 italic' }, 'Quarantine zones reduce transmission by 80% and speed recovery by 50% within the zone.'),
            // Hospital capacity bar
            h('div', null,
              h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-1' }, '\uD83C\uDFE5 Hospital Capacity'),
              (function() {
                var hospPct = d.mapHospPct || 0;
                var exceeded = hospPct > 100;
                return h('div', null,
                  h('div', { className: 'relative h-5 bg-slate-200 rounded-full overflow-hidden' },
                    h('div', { className: 'absolute inset-y-0 left-0 rounded-full transition-all', style: { width: Math.min(100, hospPct) + '%', background: exceeded ? '#ef4444' : hospPct > 70 ? '#f59e0b' : '#22c55e' } }),
                    h('div', { className: 'absolute inset-0 flex items-center justify-center text-[8px] font-bold ' + (hospPct > 50 ? 'text-white' : 'text-slate-600') },
                      hospPct.toFixed(0) + '% used (' + hospitalBeds + '% beds)')
                  ),
                  exceeded && h('p', { className: 'text-[11px] font-bold text-red-600 mt-0.5' }, '\u26A0\uFE0F HOSPITALS OVERWHELMED \u2014 mortality increases!')
                );
              })()
            )
          ),
          // Map history mini chart
          mapHistory && mapHistory.length > 2 && h('div', { className: glassCard },
            h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-2' }, 'Outbreak Timeline'),
            (function() {
              var w2 = 700, ht2 = 150, padL2 = 40, padR2 = 10, padT2 = 10, padB2 = 20;
              var pw = w2 - padL2 - padR2, ph = ht2 - padT2 - padB2;
              var total = mapHistory[0].total || 1;
              var maxSteps = mapHistory.length - 1 || 1;
              function x(step) { return padL2 + (step / maxSteps) * pw; }
              function y(count) { return padT2 + (1 - count / total) * ph; }
              var pathS = 'M ' + x(0) + ' ' + y(mapHistory[0].S);
              var pathI = 'M ' + x(0) + ' ' + y(mapHistory[0].I);
              var pathR = 'M ' + x(0) + ' ' + y(mapHistory[0].R);
              for (var mi = 1; mi < mapHistory.length; mi++) {
                pathS += ' L ' + x(mi) + ' ' + y(mapHistory[mi].S);
                pathI += ' L ' + x(mi) + ' ' + y(mapHistory[mi].I);
                pathR += ' L ' + x(mi) + ' ' + y(mapHistory[mi].R);
              }
              return h('svg', { viewBox: '0 0 ' + w2 + ' ' + ht2, className: 'w-full', style: { maxHeight: ht2 + 'px' } },
                h('path', { d: pathS, fill: 'none', stroke: '#3b82f6', strokeWidth: 2 }),
                h('path', { d: pathI, fill: 'none', stroke: '#ef4444', strokeWidth: 2 }),
                h('path', { d: pathR, fill: 'none', stroke: '#22c55e', strokeWidth: 2 })
              );
            })()
          ),
          // AI Analysis
          callGemini && mapHistory && mapHistory.length > 5 && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            d.mapAnalysis ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs text-slate-700 leading-relaxed whitespace-pre-line' }, d.mapAnalysis) :
            h('button', { 'aria-label': 'Change map analysis loading',
              onClick: function() {
                upd('mapAnalysisLoading', true);
                var lastC = countGrid(mapGrid);
                callGemini('Analyze this outbreak simulation for a ' + gradeBand + ' student. Scenario: ' + MAP_SCENARIOS[mapScenario].name + ', R0=' + r0 + ', vaccination=' + mapVacc + '%, steps=' + mapStep + '. Final counts: S=' + lastC.S + ', I=' + lastC.I + ', R=' + lastC.R + '. Provide 2-3 key observations and one question for the student.').then(function(res) {
                  updMulti({ mapAnalysis: res, mapAnalysisLoading: false });
                }).catch(function() { upd('mapAnalysisLoading', false); });
              },
              disabled: d.mapAnalysisLoading,
              className: 'w-full py-2 text-sm font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50'
            }, d.mapAnalysisLoading ? '\uD83E\uDDE0 Analyzing...' : '\uD83E\uDDE0 AI Analysis')
          )
        ),

        // ═══════════════════════════════════════════
        // CONTACT TRACING TAB (NEW)
        // ═══════════════════════════════════════════
        tab === 'contacttrace' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDD17 Contact Tracing'),
            h('p', { className: 'text-xs text-slate-500' }, gradeText(gradeBand,
              'Be a disease detective! Find all the sick people by following who they talked to!',
              'Trace the chain of infection by clicking on people connected to known cases.',
              'Identify all infected individuals in a contact network. Start from Patient Zero and trace the infection chain.',
              'Perform contact tracing on a stochastic network graph. The infection chain follows edges with probability proportional to contact intensity. Minimize false traces to maximize your score.'))
          ),
          !ctNetwork ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard + ' text-center space-y-3' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-5xl mb-2' }, '\uD83D\uDD0D'),
            h('p', { className: 'text-sm font-bold text-slate-700' }, 'Trace the infection chain!'),
            h('p', { className: 'text-xs text-slate-500' }, 'Click on people connected to known cases to test if they\'re infected.'),
            h('button', { 'aria-label': 'Start Tracing', onClick: startContactTrace, className: 'px-6 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all' }, '\uD83D\uDD17 Start Tracing')
          ) : h('div', { className: 'space-y-3' },
            // Score/status bar
            h('div', { className: glassCard + ' flex items-center justify-between' },
              h('div', { className: 'flex gap-3 text-xs' },
                h('span', { className: 'font-bold text-indigo-600' }, '\uD83C\uDFAF Score: ' + ctScore),
                h('span', { className: 'font-bold text-slate-500' }, 'Traces: ' + ctGuesses),
                h('span', { className: 'font-bold text-red-600' }, 'Infected: ' + ctNetwork.solution.length)
              ),
              ctComplete ? h('span', { className: 'text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg' }, '\u2705 All Found!') :
              h('span', { className: 'text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-lg' },
                ctRevealed.filter(function(id) { return ctNetwork.solution.indexOf(id) >= 0; }).length + '/' + ctNetwork.solution.length + ' found')
            ),
            // Network graph (SVG)
            h('div', { className: glassCard },
              h('svg', { viewBox: '0 0 700 400', className: 'w-full', style: { maxHeight: '400px' } },
                // edges
                ctNetwork.edges.map(function(e, idx) {
                  var n1 = ctNetwork.nodes[e.from], n2 = ctNetwork.nodes[e.to];
                  var bothRevealed = ctRevealed.indexOf(e.from) >= 0 && ctRevealed.indexOf(e.to) >= 0;
                  var isChainEdge = ctComplete && ctNetwork.chain.some(function(ce) {
                    return (ce.from === e.from && ce.to === e.to) || (ce.from === e.to && ce.to === e.from);
                  });
                  return h('line', {
                    key: 'e' + idx,
                    x1: n1.x, y1: n1.y, x2: n2.x, y2: n2.y,
                    stroke: isChainEdge ? '#ef4444' : bothRevealed ? '#94a3b8' : '#e2e8f0',
                    strokeWidth: isChainEdge ? 3 : 1.5,
                    strokeDasharray: bothRevealed ? 'none' : '4,3'
                  });
                }),
                // nodes
                ctNetwork.nodes.map(function(node) {
                  var revealed = ctRevealed.indexOf(node.id) >= 0;
                  var isInfected = revealed && ctNetwork.solution.indexOf(node.id) >= 0;
                  var isClear = revealed && ctNetwork.solution.indexOf(node.id) < 0;
                  var fill = node.isPatientZero ? '#dc2626' : isInfected ? '#ef4444' : isClear ? '#22c55e' : '#e2e8f0';
                  var canClick = !revealed && !ctComplete;
                  // only allow clicking nodes connected to revealed infected
                  var isConnected = !revealed && ctNetwork.edges.some(function(e) {
                    var other = e.from === node.id ? e.to : (e.to === node.id ? e.from : -1);
                    return other >= 0 && ctRevealed.indexOf(other) >= 0 && ctNetwork.solution.indexOf(other) >= 0;
                  });
                  return h('g', { key: 'n' + node.id, onClick: canClick && isConnected ? function() { traceNode(node.id); } : undefined, style: { cursor: canClick && isConnected ? 'pointer' : 'default' } },
                    h('circle', {
                      cx: node.x, cy: node.y, r: node.isPatientZero ? 18 : 14,
                      fill: fill, stroke: isConnected && !revealed ? '#6366f1' : '#94a3b8',
                      strokeWidth: isConnected && !revealed ? 3 : 1.5,
                      opacity: canClick && isConnected ? 1 : (revealed ? 1 : 0.5)
                    }),
                    h('text', { x: node.x, y: node.y + 4, textAnchor: 'middle', fill: revealed ? 'white' : '#64748b', fontSize: 10, fontWeight: 'bold' },
                      node.isPatientZero ? 'P0' : String.fromCharCode(65 + node.id))
                  );
                })
              )
            ),
            // Feedback
            d.ctFeedback && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
              h('p', { className: 'text-sm font-bold ' + (d.ctFeedback[0] === '\u2705' ? 'text-emerald-600' : 'text-red-600') }, d.ctFeedback)
            ),
            // Controls
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2' },
              h('button', { 'aria-label': 'New Network', onClick: startContactTrace, className: 'px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all' }, '\u21BA New Network'),
              ctComplete && callGemini && h('button', { 'aria-label': 'Change ct analysis loading',
                onClick: function() {
                  upd('ctAnalysisLoading', true);
                  callGemini('A ' + gradeBand + ' student completed a contact tracing exercise. Network had ' + ctNetwork.nodes.length + ' people, ' + ctNetwork.solution.length + ' were infected. Student used ' + ctGuesses + ' traces and scored ' + ctScore + '. Give 2 sentences of encouraging feedback and one real-world contact tracing fact.').then(function(res) {
                    updMulti({ ctAnalysis: res, ctAnalysisLoading: false });
                  }).catch(function() { upd('ctAnalysisLoading', false); });
                },
                disabled: d.ctAnalysisLoading,
                className: 'px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50'
              }, d.ctAnalysisLoading ? '\uD83E\uDDE0 Analyzing...' : '\uD83E\uDDE0 AI Feedback')
            ),
            d.ctAnalysis && h('div', { className: glassCard },
              h('p', { className: 'text-xs text-slate-700 leading-relaxed whitespace-pre-line' }, d.ctAnalysis)
            ),
            // Legend
            h('div', { className: 'flex gap-4 text-[10px] text-slate-500 px-2' },
              h('span', null, '\uD83D\uDD34 Patient Zero'),
              h('span', null, '\uD83D\uDD35 Unknown (clickable if connected)'),
              h('span', null, '\uD83D\uDFE2 Tested Clear'),
              h('span', null, '\uD83D\uDD34 Confirmed Infected')
            )
          )
        ),

        // ═══════════════════════════════════════════
        // HISTORY TAB (NEW)
        // ═══════════════════════════════════════════
        tab === 'history' && h('div', { className: 'space-y-4' },
          h('div', { className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83D\uDCDC Historical Pandemics'),
            h('p', { className: 'text-xs text-slate-500' }, gradeText(gradeBand,
              'Learn about big sicknesses from long ago and what people did to stop them!',
              'Explore the major pandemics in human history and what we learned from each one.',
              'Study how historical pandemics shaped public health, society, and our understanding of disease transmission.',
              'Analyze the epidemiological parameters, intervention strategies, and societal impacts of history\'s most significant pandemics. Compare R\u2080 values, CFRs, and containment outcomes.'))
          ),
          // Timeline
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'relative' },
              // Timeline line
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'absolute left-4 top-0 bottom-0 w-0.5 bg-slate-300' }),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4 pl-10' },
                HISTORICAL_PANDEMICS.map(function(p) {
                  var expanded = d.historyExpanded === p.name;
                  var viewed = historyViewed[p.name];
                  return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: p.name, className: 'relative' },
                    // Timeline dot
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'absolute -left-[26px] top-2 w-4 h-4 rounded-full border-2 border-white shadow-sm', style: { backgroundColor: p.color } }),
                    h('button', { 'aria-label': 'View Pandemic',
                      onClick: function() {
                        viewPandemic(p.name);
                        upd('historyExpanded', expanded ? null : p.name);
                      },
                      className: 'w-full text-left p-3 rounded-xl transition-all ' + (expanded ? 'bg-slate-50 ring-2 ring-indigo-200' : 'hover:bg-slate-50')
                    },
                      h('div', { className: 'flex items-center gap-2' },
                        h('span', { className: 'text-lg' }, p.icon),
                        h('div', { className: 'flex-1' },
                          h('p', { className: 'text-sm font-bold text-slate-700' }, p.name + ' (' + p.year + ')'),
                          h('p', { className: 'text-[10px] text-slate-500' }, p.pathogen)
                        ),
                        h('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded-full', style: { backgroundColor: p.color + '20', color: p.color } }, p.deaths + ' deaths'),
                        viewed && h('span', { className: 'text-[10px]' }, '\u2705')
                      )
                    ),
                    // Expanded details
                    expanded && h('div', { className: 'mt-2 p-4 bg-white rounded-xl border border-slate-200 space-y-3' },
                      // Grade-appropriate summary
                      h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, p.gradeSummary[gradeBand] || p.gradeSummary['3-5']),
                      // Stats grid
                      h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
                        [
                          { label: 'Deaths', value: p.deaths, color: '#ef4444' },
                          { label: '% World Pop', value: p.pctDeath, color: '#f59e0b' },
                          { label: 'R\u2080 Estimate', value: p.r0Est, color: r0Color(parseFloat(p.r0Est) || 3) },
                          { label: 'Transmission', value: p.transmission, color: '#6366f1' }
                        ].map(function(s) {
                          return h('div', { key: s.label, className: 'bg-slate-50 rounded-lg p-2 text-center' },
                            h('p', { className: 'text-[8px] font-bold text-slate-500 uppercase' }, s.label),
                            h('p', { className: 'text-[10px] font-bold', style: { color: s.color } }, s.value)
                          );
                        })
                      ),
                      // Key facts
                      h('div', null,
                        h('p', { className: 'text-[10px] font-bold text-slate-600 mb-1' }, 'Key Facts:'),
                        h('ul', { className: 'space-y-1' },
                          p.keyFacts.map(function(fact, fi) {
                            return h('li', { key: fi, className: 'text-[10px] text-slate-600 flex gap-1' },
                              h('span', null, '\u2022'),
                              h('span', null, fact)
                            );
                          })
                        )
                      ),
                      // Actions
                      h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 pt-2 border-t border-slate-100' },
                        callTTS && h('button', { 'aria-label': 'Read Aloud', onClick: function() { callTTS(p.gradeSummary[gradeBand] || p.gradeSummary['3-5']); }, className: 'px-3 py-1.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-lg' }, '\uD83D\uDD0A Read Aloud'),
                        h('button', { 'aria-label': 'Simulate', onClick: function() { applyPreset(PRESETS.findIndex(function(pr) { return pr.name === 'COVID-19'; }) || 0); updMulti({ tab: 'sir' }); }, className: 'px-3 py-1.5 text-[10px] font-bold bg-violet-50 text-violet-600 rounded-lg' }, '\uD83D\uDD2C Simulate')
                      )
                    )
                  );
                })
              )
            )
          ),
          // Progress
          h('div', { className: glassCard + ' text-center' },
            h('p', { className: 'text-[10px] font-bold text-slate-500' },
              'Explored: ' + Object.keys(historyViewed).length + '/' + HISTORICAL_PANDEMICS.length +
              (Object.keys(historyViewed).length >= HISTORICAL_PANDEMICS.length ? ' \uD83C\uDFC6 Historian Badge!' : ''))
          )
        ),

        // ═══════════════════════════════════════════
        // AI SCENARIOS TAB (NEW)
        // ═══════════════════════════════════════════
        tab === 'scenarios' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83C\uDFAD Outbreak Scenarios'),
            h('p', { className: 'text-xs text-slate-500' }, gradeText(gradeBand,
              'A pretend sickness is spreading! Pick the best way to stop it!',
              'AI creates a fictional disease outbreak. Choose the best response strategy!',
              'AI generates a novel outbreak scenario. Analyze the parameters and choose the optimal public health response.',
              'Evaluate AI-generated scenarios requiring you to consider R\u2080, transmission mode, available resources, and intervention trade-offs. Optimal response depends on epidemiological parameters and social constraints.'))
          ),
          !scenarioData && !d.scenarioLoading ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard + ' text-center space-y-3' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-5xl mb-2' }, '\uD83C\uDFAD'),
            h('p', { className: 'text-sm font-bold text-slate-700' }, 'AI Outbreak Scenario Generator'),
            h('p', { className: 'text-xs text-slate-500' }, 'Gemini will create a unique fictional outbreak for you to respond to.'),
            callGemini ? h('button', { 'aria-label': 'Generate Scenario', onClick: generateScenario, className: 'px-6 py-2 text-sm font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all' }, '\uD83E\uDDE0 Generate Scenario') :
            h('p', { className: 'text-xs text-slate-500 italic' }, 'AI not available \u2014 requires Gemini integration.')
          ) : d.scenarioLoading ? h('div', { className: glassCard + ' text-center py-6' },
            h('div', { className: 'text-3xl animate-pulse mb-2' }, '\uD83E\uDDE0'),
            h('p', { className: 'text-sm font-bold text-purple-600' }, 'Generating outbreak scenario...')
          ) : scenarioData && h('div', { className: 'space-y-3' },
            // Scenario briefing
            h('div', { className: glassCard + ' border-l-4 border-red-500' },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('span', { className: 'text-xl' }, '\uD83D\uDEA8'),
                h('h5', { className: 'text-sm font-bold text-red-700' }, 'OUTBREAK ALERT: ' + (scenarioData.name || 'Unknown Pathogen'))
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, scenarioData.description),
              h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3' },
                [
                  { label: 'Origin', value: scenarioData.origin || 'Unknown', color: '#6366f1' },
                  { label: 'R\u2080', value: (scenarioData.r0 || '?').toString(), color: r0Color(scenarioData.r0 || 3) },
                  { label: 'Transmission', value: scenarioData.transmission || 'Unknown', color: '#f59e0b' },
                  { label: 'Symptoms', value: scenarioData.symptoms || 'Varies', color: '#ef4444' }
                ].map(function(s) {
                  return h('div', { key: s.label, className: 'bg-slate-50 rounded-lg p-2 text-center' },
                    h('p', { className: 'text-[8px] font-bold text-slate-500 uppercase' }, s.label),
                    h('p', { className: 'text-[10px] font-bold', style: { color: s.color } }, s.value)
                  );
                })
              )
            ),
            // Response options
            !scenarioChoice && scenarioData.options && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
              h('p', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-3' }, 'Choose Your Response Strategy'),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-2' },
                scenarioData.options.map(function(opt, idx) {
                  var letters = ['A', 'B', 'C'];
                  var colors = ['#3b82f6', '#f59e0b', '#22c55e'];
                  return h('button', { 'aria-label': 'Choose Scenario',
                    key: idx,
                    onClick: function() { chooseScenario(idx); },
                    className: 'w-full p-3 text-left rounded-xl border-2 transition-all hover:shadow-md',
                    style: { borderColor: colors[idx] + '40' }
                  },
                    h('div', { className: 'flex items-start gap-2' },
                      h('span', { className: 'text-sm font-bold px-2 py-0.5 rounded-full text-white', style: { backgroundColor: colors[idx] } }, letters[idx]),
                      h('div', null,
                        h('p', { className: 'text-xs font-bold text-slate-700' }, opt.label || opt.strategy),
                        h('p', { className: 'text-[10px] text-slate-500 mt-0.5' }, opt.strategy)
                      )
                    )
                  );
                })
              )
            ),
            // Result
            scenarioResult && h('div', { className: glassCard + ' border-l-4 ' + (scenarioResult.score >= 70 ? 'border-emerald-500' : scenarioResult.score >= 40 ? 'border-amber-500' : 'border-red-500') },
              h('div', { className: 'flex items-center gap-2 mb-2' },
                h('span', { className: 'text-xl' }, scenarioResult.score >= 70 ? '\uD83C\uDFC6' : scenarioResult.score >= 40 ? '\uD83D\uDCA1' : '\u26A0\uFE0F'),
                h('h5', { className: 'text-sm font-bold ' + (scenarioResult.score >= 70 ? 'text-emerald-700' : scenarioResult.score >= 40 ? 'text-amber-700' : 'text-red-700') },
                  scenarioResult.score >= 70 ? 'Excellent Response!' : scenarioResult.score >= 40 ? 'Adequate Response' : 'Suboptimal Response')
              ),
              h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, scenarioResult.outcome),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'mt-2 flex items-center gap-2' },
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-[10px] font-bold text-slate-500' }, 'Effectiveness:'),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex-1 h-3 bg-slate-200 rounded-full overflow-hidden' },
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'h-full rounded-full transition-all', style: { width: scenarioResult.score + '%', background: scenarioResult.score >= 70 ? '#22c55e' : scenarioResult.score >= 40 ? '#f59e0b' : '#ef4444' } })
                ),
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-bold font-mono' }, scenarioResult.score + '/100')
              )
            ),
            // Play again
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2' },
              h('button', { 'aria-label': 'New Scenario', onClick: function() { updMulti({ scenarioData: null, scenarioChoice: null, scenarioResult: null }); generateScenario(); }, className: 'px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all' }, '\uD83E\uDDE0 New Scenario'),
              scenarioData.r0 && h('button', { 'aria-label': 'Simulate R=', onClick: function() { updMulti({ tab: 'sir', r0: scenarioData.r0 }); }, className: 'px-4 py-2 text-sm font-bold bg-indigo-100 text-indigo-600 rounded-xl' }, '\uD83D\uDD2C Simulate R\u2080=' + scenarioData.r0)
            )
          )
        ),

        // ═══════════════════════════════════════════
        // CHALLENGE TAB
        // ═══════════════════════════════════════════
        tab === 'challenge' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\uD83C\uDFAF Epidemiology Challenge'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 mb-3' },
              [1, 2, 3].map(function(t) {
                var labels = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
                var colors = { 1: 'bg-emerald-100 text-emerald-700', 2: 'bg-amber-100 text-amber-700', 3: 'bg-red-100 text-red-700' };
                return h('button', { 'aria-label': 'Change chal answer',
                  key: t,
                  onClick: function() { updMulti({ chalTier: t, chalIdx: 0, chalFeedback: '', chalAnswer: '', chalUseAI: null }); },
                  className: 'px-3 py-1.5 rounded-lg text-[10px] font-bold ' + (chalTier === t ? colors[t] + ' ring-2 ring-offset-1' : 'bg-white text-slate-500 border border-slate-200')
                }, labels[t]);
              })
            ),
            h('div', { className: 'flex gap-3 text-xs' },
              h('span', { className: 'font-bold text-indigo-600' }, '\uD83C\uDFC6 ' + chalScore + ' pts'),
              h('span', { className: 'font-bold text-amber-600' }, '\uD83D\uDD25 ' + chalStreak + ' streak')
            )
          ),
          h('div', { className: glassCard },
            d.chalAILoading ? h('div', { className: 'text-center py-4' },
              h('div', { className: 'text-2xl animate-pulse mb-2' }, '\uD83E\uDDE0'),
              h('p', { className: 'text-xs text-purple-600 font-bold' }, 'AI generating question...')
            ) : h('div', { className: 'space-y-3' },
              activeChalQ && h('div', null,
                d.chalUseAI != null && h('span', { className: 'px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[8px] font-bold rounded-full mr-2' }, '\uD83E\uDDE0 AI'),
                h('p', { className: 'text-sm font-medium text-slate-700 mt-1' }, activeChalQ.q)
              ),
              h('input', {
                type: 'text', value: chalAnswer,
                onChange: function(e) { upd('chalAnswer', e.target.value); },
                onKeyDown: function(e) { if (e.key === 'Enter') chalCheck(); },
                placeholder: 'Type your answer...',
                className: 'w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-400 outline-none',
                'aria-label': 'Challenge answer'
              }),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2' },
                h('button', { 'aria-label': 'Check', onClick: chalCheck, className: 'px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all' }, 'Check'),
                h('button', { 'aria-label': 'Hint', onClick: function() { upd('chalFeedback', '\uD83D\uDCA1 ' + (activeChalQ.h || 'No hint')); }, className: 'px-3 py-2 text-sm font-bold bg-amber-50 text-amber-600 rounded-xl' }, '\uD83D\uDCA1 Hint'),
                h('button', { 'aria-label': 'Skip', onClick: chalNext, className: 'px-3 py-2 text-sm font-bold bg-slate-100 text-slate-600 rounded-xl' }, 'Skip \u27A1'),
                callGemini && h('button', { 'aria-label': 'AI Next', onClick: chalAINext, className: 'px-3 py-2 text-sm font-bold bg-purple-100 text-purple-600 rounded-xl' }, '\u2728 AI Next')
              ),
              chalFeedback && h('p', { className: 'text-sm font-bold p-2 rounded-lg ' + (chalFeedback[0] === '\u2705' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700') }, chalFeedback)
            )
          )
        ),

        // ═══════════════════════════════════════════
        // BATTLE TAB
        // ═══════════════════════════════════════════
        tab === 'battle' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-2' }, '\u2694\uFE0F Outbreak Defense'),
            h('p', { className: 'text-xs text-slate-500' }, gradeText(gradeBand,
              'Fight the virus by answering questions! Don\'t let it win!',
              'Battle a virus outbreak! Answer epidemiology questions to fight back.',
              'Defeat the virus by answering SIR/SEIR and epidemiology questions. Each correct answer damages the virus.',
              'Combat a simulated outbreak using your epidemiological knowledge. Correct answers deal damage; wrong answers let the virus spread.'))
          ),
          !battleActive ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard + ' text-center space-y-3' },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-5xl mb-2' }, '\uD83E\uDDA0'),
            h('p', { className: 'text-sm font-bold text-red-600' }, 'A virus is threatening the population!'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 justify-center' },
              h('button', { 'aria-label': 'Start Battle', onClick: function() { startBattle(false); }, className: 'px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all' }, '\u2694\uFE0F Start Battle'),
              callGemini && h('button', { 'aria-label': 'AI Battle', onClick: function() { startBattle(true); }, className: 'px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all' }, '\uD83E\uDDE0 AI Battle')
            )
          ) : h('div', { className: glassCard },
            // HP bars
            h('div', { className: 'space-y-2 mb-4' },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-xs font-bold text-emerald-600 w-16' }, '\uD83D\uDEE1\uFE0F You'),
                h('div', { className: 'flex-1 h-4 bg-slate-200 rounded-full overflow-hidden' },
                  h('div', { className: 'h-full rounded-full transition-all', style: { width: battlePlayerHP + '%', background: battlePlayerHP > 50 ? '#22c55e' : battlePlayerHP > 25 ? '#f59e0b' : '#ef4444' } })
                ),
                h('span', { className: 'text-xs font-mono font-bold w-10 text-right' }, battlePlayerHP + '%')
              ),
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-xs font-bold text-red-600 w-16' }, '\uD83E\uDDA0 Virus'),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex-1 h-4 bg-slate-200 rounded-full overflow-hidden' },
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'h-full bg-red-500 rounded-full transition-all', style: { width: battleEnemyHP + '%' } })
                ),
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-xs font-mono font-bold w-10 text-right' }, battleEnemyHP + '%')
              )
            ),
            h('p', { className: 'text-[10px] text-slate-500 mb-2' }, 'Round ' + (battleRound + 1) + (battleUseAI ? ' \uD83E\uDDE0 AI Mode' : '')),
            // Battle content
            battleOver ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-center space-y-2 py-4' },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-4xl mb-2' }, battleWon ? '\uD83C\uDFC6' : '\uD83E\uDDA0'),
              h('p', { className: 'text-lg font-bold ' + (battleWon ? 'text-emerald-700' : 'text-red-700') }, battleWon ? 'Victory! Outbreak Contained!' : 'Defeated! Virus Wins!'),
              h('p', { className: 'text-xs text-slate-500' }, 'Your HP: ' + battlePlayerHP + ' | Virus HP: ' + battleEnemyHP),
              battleFeedback && h('p', { className: 'text-xs font-bold mt-1 ' + (battleFeedback[0] === '\u2705' ? 'text-emerald-600' : 'text-red-600') }, battleFeedback),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 justify-center mt-2' },
                h('button', { 'aria-label': 'Play Again', onClick: function() { startBattle(false); }, className: 'px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all' }, '\u21BA Play Again'),
                callGemini && h('button', { 'aria-label': 'AI Rematch', onClick: function() { startBattle(true); }, className: 'px-4 py-2 text-sm font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all' }, '\u2728 AI Rematch')
              )
            ) : h('div', { className: 'space-y-3' },
              (function() {
                if (battleUseAI && d.battleAILoading) {
                  return h('div', { className: 'text-center py-4' },
                    h('div', { className: 'text-2xl animate-pulse mb-2' }, '\uD83E\uDDE0'),
                    h('p', { className: 'text-xs text-purple-600 font-bold' }, 'AI generating question...')
                  );
                }
                var q = getCurrentBattleQ();
                if (!q) return null;
                return h('div', { className: 'space-y-3' },
                  battleUseAI && h('span', { className: 'px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[8px] font-bold rounded-full' }, '\uD83E\uDDE0 AI-GENERATED'),
                  h('p', { className: 'text-sm font-medium text-slate-700' }, q.q),
                  h('input', { type: 'text', value: battleAnswer, onChange: function(e) { upd('battleAnswer', e.target.value); }, onKeyDown: function(e) { if (e.key === 'Enter') battleAttack(); }, placeholder: 'Type your answer...', className: 'w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:border-red-400 outline-none', 'aria-label': 'Battle answer' }),
                  h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2' },
                    h('button', { 'aria-label': 'Attack!', onClick: battleAttack, className: 'px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all' }, '\u2694\uFE0F Attack!'),
                    h('button', { 'aria-label': 'Hint', onClick: function() { updMulti({ battleFeedback: '\uD83D\uDCA1 ' + (q.h || 'No hint') }); }, className: 'px-3 py-2 text-sm font-bold bg-amber-50 text-amber-600 rounded-xl' }, '\uD83D\uDCA1 Hint')
                  ),
                  battleFeedback && h('p', { className: 'text-sm font-bold p-2 rounded-lg ' + (battleFeedback[0] === '\u2705' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700') }, battleFeedback)
                );
              })()
            )
          )
        ),

        // ═══════════════════════════════════════════
        // LEARN TAB
        // ═══════════════════════════════════════════
        tab === 'learn' && h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'space-y-4' },
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: glassCard },
            h('h4', { className: 'text-sm font-bold text-slate-700 mb-3' }, '\uD83D\uDCDA Learn \u2014 Epidemiology Concepts'),
            h('p', { className: 'text-xs text-slate-500 mb-4' }, 'Explore key topics adapted to your grade level (' + gradeBand + ').')
          ),
          LEARN_TOPICS.map(function(topic) {
            var content = topic.content[gradeBand] || topic.content['3-5'];
            return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: topic.title, className: glassCard + ' space-y-3' },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex items-center gap-2' },
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'text-lg' }, topic.icon),
                h('h5', { className: 'text-sm font-bold text-slate-700' }, topic.title)
              ),
              h('p', { className: 'text-xs text-slate-600 leading-relaxed' }, content),
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, className: 'flex gap-2 pt-2 border-t border-slate-100' },
                h('button', { 'aria-label': 'Try It', onClick: function() { markLearnRead(topic.title); updMulti({ tab: topic.tryIt }); announceToSR('Switched to ' + topic.tryIt); }, className: 'px-3 py-1.5 text-[10px] font-bold bg-violet-50 text-violet-600 rounded-lg hover:bg-violet-100 transition-all' }, '\uD83D\uDD2C Try It'),
                callTTS && h('button', { 'aria-label': 'Read Aloud', onClick: function() { markLearnRead(topic.title); callTTS(content); }, className: 'px-3 py-1.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all' }, '\uD83D\uDD0A Read Aloud')
              )
            );
          })
        ),

        // ── Badges panel (collapsed) ──
        h('details', { className: glassCard },
          h('summary', { className: 'text-xs font-bold text-slate-600 cursor-pointer' }, '\uD83C\uDFC6 Badges (' + Object.keys(d.badges || {}).length + '/' + EPI_BADGES.length + ')'),
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3' },
            EPI_BADGES.map(function(b) {
              var earned = d.badges && d.badges[b.id];
              return h('div', { key: b.id, className: 'flex items-center gap-2 p-2 rounded-lg ' + (earned ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200 opacity-50') },
                h('span', { className: 'text-lg' + (earned ? '' : ' grayscale') }, b.icon),
                h('div', null,
                  h('p', { className: 'text-[10px] font-bold ' + (earned ? 'text-amber-700' : 'text-slate-500') }, b.name),
                  h('p', { className: 'text-[8px] text-slate-500' }, b.desc)
                )
              );
            })
          )
        ),

        // SR status
        h('div', { className: 'sr-only', role: 'status', 'aria-live': 'polite' }, 'Epidemic Lab: ' + tab + ' view')
      );
    }
  });

  console.log('[StemLab] stem_tool_epidemic.js v4.0 loaded');
})();