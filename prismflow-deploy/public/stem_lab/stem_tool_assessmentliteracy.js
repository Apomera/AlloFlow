// ═══════════════════════════════════════════
// stem_tool_assessmentliteracy.js — Assessment Literacy Lab
// Teach users how measurement claims are made and evaluated.
// Never claims to measure the user — teaches construct/measurement critique,
// contrasts validated instruments (Big 5, RIASEC, CHC batteries) with
// pseudoscience (MBTI, DISC, Enneagram), and coaches candidates on ethics
// and strategy for employer personality/cognitive tests.
// ═══════════════════════════════════════════

// ── Assessment Literacy keyframes (junk-science mastery celebration) ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('assessmentliteracy-celeb-css')) return;
  var st = document.createElement('style');
  st.id = 'assessmentliteracy-celeb-css';
  st.textContent = [
    '@keyframes assessmentliteracy-celeb-rise {',
    '  0%   { transform: translate(-50%, -120%); opacity: 0; }',
    '  10%  { transform: translate(-50%, 0%);    opacity: 1; }',
    '  88%  { transform: translate(-50%, 0%);    opacity: 1; }',
    '  100% { transform: translate(-50%, -10%);  opacity: 0; }',
    '}'
  ].join('');
  if (document.head) document.head.appendChild(st);
})();

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

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('assessmentLiteracy'))) {

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


  // ─────────────────────────────────────────────
  // A11y scaffolding
  // ─────────────────────────────────────────────
  (function() {
    if (document.getElementById('allo-live-asslit')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-asslit';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();
  function announceSR(msg) {
    var el = document.getElementById('allo-live-asslit');
    if (el) { el.textContent = ''; setTimeout(function() { el.textContent = msg; }, 50); }
  }

  // Print-friendly CSS: suppress .no-print elements, use plain colors for dark-on-light output
  (function() {
    if (document.getElementById('allo-asslit-print-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-asslit-print-css';
    st.textContent = '@media print { .no-print, .no-print * { display: none !important; } body { background: white !important; color: black !important; } .print-dark { color: black !important; background: white !important; } }';
    document.head.appendChild(st);
  })();

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1: DATA CONSTANTS
  // ═══════════════════════════════════════════════════════════════

  // ── CHC broad abilities (Cattell-Horn-Carroll, Schneider & McGrew 2018) ──
  var CHC_BROAD = [
    { code: 'Gf', name: 'Fluid Reasoning', desc: 'Solve novel problems, see patterns, reason with unfamiliar information. The "figure it out from scratch" ability.', example: 'Matrix reasoning — complete the visual pattern.', narrow: ['Induction (I)', 'General sequential reasoning (RG)', 'Quantitative reasoning (RQ)'] },
    { code: 'Gc', name: 'Comprehension-Knowledge (Crystallized)', desc: 'Depth and breadth of culturally acquired knowledge. Vocabulary, general info, language comprehension.', example: 'Vocabulary — define the word "arbitrary."', narrow: ['Language development (LD)', 'Lexical knowledge (VL)', 'General information (K0)'] },
    { code: 'Gs', name: 'Processing Speed', desc: 'Fluently perform simple, repetitive cognitive tasks under time pressure.', example: 'Symbol search — mark every instance of the target symbol in 90 seconds.', narrow: ['Perceptual speed (P)', 'Rate of test taking (R9)', 'Number facility (N)'] },
    { code: 'Glr', name: 'Long-Term Storage and Retrieval', desc: 'Store, consolidate, and retrieve information over minutes to years. Associative memory, ideational fluency.', example: 'Learn 16 word-picture pairs, recall after 20 minutes.', narrow: ['Associative memory (MA)', 'Ideational fluency (FI)', 'Naming facility (NA)'] },
    { code: 'Gsm', name: 'Short-Term / Working Memory', desc: 'Hold and manipulate information in conscious awareness for seconds.', example: 'Digit span backward — hear 7-3-9-4-1, repeat in reverse.', narrow: ['Memory span (MS)', 'Working memory capacity (MW)'] },
    { code: 'Gv', name: 'Visual Processing', desc: 'Perceive, analyze, synthesize, and manipulate visual patterns and mental imagery.', example: 'Block design — replicate a 2D pattern with 3D blocks.', narrow: ['Visualization (VZ)', 'Spatial relations (SR)', 'Closure speed (CS)'] },
    { code: 'Ga', name: 'Auditory Processing', desc: 'Discriminate, analyze, and synthesize patterns among auditory stimuli, especially when sounds are distorted.', example: 'Phonological awareness — blend /k/ /a/ /t/ into "cat."', narrow: ['Phonetic coding (PC)', 'Speech sound discrimination (US)', 'Resistance to auditory stimulus distortion (UR)'] },
    { code: 'Gq', name: 'Quantitative Knowledge', desc: 'Acquired mathematical knowledge — concepts, operations, math achievement.', example: 'Solve: if 3x + 7 = 22, what is x?', narrow: ['Mathematical knowledge (KM)', 'Mathematical achievement (A3)'] },
    { code: 'Grw', name: 'Reading & Writing', desc: 'Reading decoding, comprehension, writing ability, spelling, English usage.', example: 'Read passage, answer inference questions.', narrow: ['Reading decoding (RD)', 'Reading comprehension (RC)', 'Spelling ability (SG)', 'Writing ability (WA)'] }
  ];

  // ── PASS (Planning, Attention, Simultaneous, Successive — Das/Naglieri, Luria-based) ──
  var PASS_COMPONENTS = [
    { code: 'P', name: 'Planning', desc: 'Generate, select, apply, and monitor solutions. Executive function.', example: 'Matching numbers: find and mark identical numbers across a page under self-paced strategy.' },
    { code: 'A', name: 'Attention', desc: 'Selective, sustained focus while inhibiting response to distractors.', example: 'Number Detection: underline target number patterns among distractors.' },
    { code: 'S', name: 'Simultaneous', desc: 'Integrate stimuli into a whole — holistic, spatial, interrelated processing.', example: 'Figure Memory: view a figure, reproduce from memory embedded in a larger design.' },
    { code: 'U', name: 'Successive', desc: 'Process stimuli in specific sequential order — series-based, temporal.', example: 'Word Series: repeat sequences of words in exact order heard.' }
  ];

  // ── Gardner's Multiple Intelligences (popular but weakly empirical) ──
  var GARDNER_MI = [
    { name: 'Linguistic', desc: 'Word-smart — sensitivity to language, meaning, rhythm.' },
    { name: 'Logical-Mathematical', desc: 'Number-smart — reasoning, calculation, logic.' },
    { name: 'Spatial', desc: 'Picture-smart — visual-spatial judgment and manipulation.' },
    { name: 'Bodily-Kinesthetic', desc: 'Body-smart — physical coordination, dexterity.' },
    { name: 'Musical', desc: 'Music-smart — rhythm, pitch, melody sensitivity.' },
    { name: 'Interpersonal', desc: 'People-smart — understanding others\' moods, motivations.' },
    { name: 'Intrapersonal', desc: 'Self-smart — insight into own emotions, values, goals.' },
    { name: 'Naturalistic', desc: 'Nature-smart — recognize flora, fauna, natural patterns.' }
  ];
  var GARDNER_CRITIQUE = 'Gardner\'s MI theory is widely taught but has weak empirical support. Factor analyses of the "intelligences" show heavy overlap — most collapse into Gc, Gv, or unrelated interest/skill dimensions. Gardner himself acknowledged MI is better understood as talents or interests than distinct cognitive abilities. Popular in education because it feels inclusive; problematic because it implies learners have fixed "types" and should be taught accordingly (learning styles myth).';

  // ── Sternberg's Triarchic Theory ──
  var STERNBERG_TRIARCHIC = [
    { name: 'Analytical', desc: 'Academic problem-solving; traditional IQ-style reasoning — evaluate, analyze, compare.' },
    { name: 'Creative', desc: 'Generate novel ideas; adapt to new situations; synthesize across domains.' },
    { name: 'Practical', desc: '"Street smarts" — apply knowledge to everyday contexts; tacit knowledge.' }
  ];

  // ── Luria's Functional Units (neuropsychological) ──
  var LURIA_UNITS = [
    { name: 'Unit 1: Arousal & Regulation', desc: 'Brainstem/reticular — attention, arousal, vigilance.' },
    { name: 'Unit 2: Reception, Analysis, Storage', desc: 'Posterior cortex — processing sensory input (visual, auditory, tactile) into integrated percepts.' },
    { name: 'Unit 3: Programming, Regulation, Verification', desc: 'Frontal lobes — executive function, planning, self-monitoring.' }
  ];

  // ── Real cognitive batteries ──
  var REAL_BATTERIES = [
    { abbr: 'WISC-V', name: 'Wechsler Intelligence Scale for Children — 5th Ed.', ages: '6:0–16:11', theory: 'Loosely CHC-aligned; 5 primary index scores (VCI, VSI, FRI, WMI, PSI) + Full Scale IQ', measures: ['Gc (VCI)', 'Gv (VSI)', 'Gf (FRI)', 'Gsm (WMI)', 'Gs (PSI)'], strengths: 'Gold standard in schools. Broad normative sample. Supplemental indices (Quantitative Reasoning, Auditory Working Memory) extend coverage.', weaknesses: 'Verbal loading disadvantages ELLs. Timed subtests penalize processing speed deficits. Expensive proprietary. FSIQ can obscure scatter.' },
    { abbr: 'WJ-IV COG', name: 'Woodcock-Johnson IV Tests of Cognitive Abilities', ages: '2:0–90+', theory: 'Most explicit CHC operationalization — covers Gf, Gc, Gs, Glr, Gsm, Gv, Ga, Gq, Grw', measures: ['Gf', 'Gc', 'Gs', 'Glr', 'Gsm', 'Gv', 'Ga', 'Gq', 'Grw'], strengths: 'Broadest CHC coverage. Pairs with WJ-IV Achievement for integrated psychoed eval. Strong for SLD identification.', weaknesses: 'Less familiar to some clinicians. Long admin time for full battery. Some subtests have uneven reliability at age extremes.' },
    { abbr: 'KABC-II NU', name: 'Kaufman Assessment Battery for Children — 2nd Ed. Normative Update', ages: '3:0–18:11', theory: 'Dual-model: Luria (Mental Processing Index) OR CHC (Fluid-Crystallized Index)', measures: ['Gv (Simultaneous)', 'Gsm (Sequential)', 'Glr (Learning)', 'Gf (Planning)', 'Gc (Knowledge, CHC model only)'], strengths: 'Designed with cultural fairness in mind. Reduced verbal load. Choice of theoretical model allows lower-verbal or ELL testing.', weaknesses: 'Less widely adopted. Some clinicians find dual-model confusing. Limited adult data.' },
    { abbr: 'DAS-II', name: 'Differential Ability Scales — 2nd Ed.', ages: '2:6–17:11', theory: 'Hierarchical — General Conceptual Ability (GCA) with Verbal, Nonverbal Reasoning, Spatial clusters', measures: ['Gc (Verbal)', 'Gf (Nonverbal)', 'Gv (Spatial)'], strengths: 'Strong for SLD profile analysis. Shorter administration than WISC. Good floor for low-functioning.', weaknesses: 'Less CHC-complete than WJ. Narrower age range.' },
    { abbr: 'RIAS-2', name: 'Reynolds Intellectual Assessment Scales — 2nd Ed.', ages: '3:0–99:11', theory: 'Short screener — Verbal Intelligence + Nonverbal Intelligence → Composite', measures: ['Gc (VIX)', 'Gv/Gf (NIX)'], strengths: 'Under 30 min for core. Good when brief measure needed (triage, re-evaluation).', weaknesses: 'Too brief for diagnostic decisions alone. Limited process-level information.' },
    { abbr: 'SB-5', name: 'Stanford-Binet Intelligence Scales — 5th Ed.', ages: '2:0–85+', theory: 'Historical flagship; CHC-aligned five factors × verbal/nonverbal domains', measures: ['Gf', 'Gc', 'Gq', 'Gv', 'Gsm'], strengths: 'Best-in-class low floor and high ceiling — essential for gifted/intellectual disability cases. Historical continuity with Binet tradition.', weaknesses: 'Older norms in some applications. Less CHC-comprehensive than WJ-IV.' },
    { abbr: 'UNIT-2', name: 'Universal Nonverbal Intelligence Test — 2nd Ed.', ages: '5:0–21:11', theory: 'Entirely nonverbal — gestured/pantomimed administration', measures: ['Gf', 'Gv', 'Gsm (nonverbal)'], strengths: 'Gold standard for deaf/HH, ELLs, or selectively mute clients. Removes verbal confound entirely.', weaknesses: 'Misses Gc entirely — not a full picture of ability. Narrower age range.' }
  ];

  // ── Disability justice in cognitive testing ──
  var COG_JUSTICE = [
    { title: 'Eugenics origins', body: 'Early IQ tests (Goddard\'s Ellis Island translations of Binet, Terman\'s Stanford revisions) were used to justify immigration restriction, forced sterilization (Buck v. Bell 1927), and segregation. Modern tests have disavowed these uses but the historical shadow matters.' },
    { title: 'Larry P. v. Riles (1979, amended 1986)', body: 'California federal court ruled IQ tests could not be used to place Black students in "educable mentally retarded" classes due to disparate impact and cultural bias. Still influences California psychoed practice.' },
    { title: 'Processing speed penalties', body: 'Timed subtests (Coding, Symbol Search) penalize students with ADHD, dyscalculia, slow processing, motor difficulties, and some neurodevelopmental conditions — often exaggerating functional impact.' },
    { title: 'Verbal loading', body: 'Heavy VCI weight disadvantages English Language Learners and students with language disorders. Full-scale scores may underestimate nonverbal reasoning ability.' },
    { title: 'ADA accommodations', body: 'Extended time, breaks, alternate response modes are reasonable accommodations under ADA. Yet standardized administration norms complicate interpretation — clinicians must report but not necessarily invalidate accommodated scores.' },
    { title: 'Atkins v. Virginia (2002)', body: 'Intellectual disability cannot justify execution. Psychometric interpretation (Flynn effect, SEM, standard error of difference) became literally life-or-death.' }
  ];

  // ── Big Five / IPIP items (Goldberg public-domain) ──
  // Each item: { text, trait, reversed }
  var BIG5_ITEMS = [
    // Openness
    { t: 'Have a vivid imagination.', d: 'O', r: false },
    { t: 'Have excellent ideas.', d: 'O', r: false },
    { t: 'Am quick to understand things.', d: 'O', r: false },
    { t: 'Use difficult words.', d: 'O', r: false },
    { t: 'Am not interested in abstract ideas.', d: 'O', r: true },
    { t: 'Do not have a good imagination.', d: 'O', r: true },
    // Conscientiousness
    { t: 'Am always prepared.', d: 'C', r: false },
    { t: 'Pay attention to details.', d: 'C', r: false },
    { t: 'Get chores done right away.', d: 'C', r: false },
    { t: 'Like order.', d: 'C', r: false },
    { t: 'Leave my belongings around.', d: 'C', r: true },
    { t: 'Make a mess of things.', d: 'C', r: true },
    // Extraversion
    { t: 'Am the life of the party.', d: 'E', r: false },
    { t: 'Feel comfortable around people.', d: 'E', r: false },
    { t: 'Start conversations.', d: 'E', r: false },
    { t: 'Talk to a lot of different people at parties.', d: 'E', r: false },
    { t: 'Don\'t like to draw attention to myself.', d: 'E', r: true },
    { t: 'Am quiet around strangers.', d: 'E', r: true },
    // Agreeableness
    { t: 'Am interested in people.', d: 'A', r: false },
    { t: 'Sympathize with others\' feelings.', d: 'A', r: false },
    { t: 'Have a soft heart.', d: 'A', r: false },
    { t: 'Take time out for others.', d: 'A', r: false },
    { t: 'Am not really interested in others.', d: 'A', r: true },
    { t: 'Insult people.', d: 'A', r: true },
    // Neuroticism (scored so high = less stable)
    { t: 'Get stressed out easily.', d: 'N', r: false },
    { t: 'Worry about things.', d: 'N', r: false },
    { t: 'Am easily disturbed.', d: 'N', r: false },
    { t: 'Get upset easily.', d: 'N', r: false },
    { t: 'Am relaxed most of the time.', d: 'N', r: true },
    { t: 'Seldom feel blue.', d: 'N', r: true }
  ];

  var BIG5_TRAITS = {
    O: { name: 'Openness to Experience', high: 'Curious, imaginative, open to novel ideas, aesthetically responsive.', low: 'Practical, conventional, prefers familiar routines, concrete over abstract.', empirical: 'Strongest correlate of creative achievement, liberal political attitudes, and academic interest in arts/humanities.' },
    C: { name: 'Conscientiousness', high: 'Organized, disciplined, goal-directed, reliable.', low: 'Flexible, spontaneous, relaxed about rules and schedules.', empirical: 'Strongest Big 5 predictor of job performance across occupations, academic GPA, and longevity.' },
    E: { name: 'Extraversion', high: 'Energetic, assertive, sociable, positive affect.', low: 'Reserved, independent, prefers solitary or small-group activity.', empirical: 'Predictor of sales/leadership performance, social network size, self-reported happiness.' },
    A: { name: 'Agreeableness', high: 'Cooperative, compassionate, trusting, prosocial.', low: 'Competitive, skeptical, willing to challenge others.', empirical: 'Correlates with teamwork, relationship satisfaction, lower aggression. Slightly negative correlate of salary (sometimes).' },
    N: { name: 'Neuroticism (Emotional Instability)', high: 'Emotionally reactive, worry-prone, vulnerable to stress.', low: 'Calm, resilient, emotionally steady.', empirical: 'Strong correlate of risk for depression/anxiety disorders, lower relationship satisfaction. Sometimes labeled "Emotional Stability" (reversed).' }
  };

  // ── MBTI dichotomies (taught to critique) ──
  var MBTI_DICHOTOMIES = [
    { letters: 'E/I', name: 'Extraversion / Introversion', big5_map: 'Loosely maps to Big 5 Extraversion — but MBTI forces binary split at the mean.' },
    { letters: 'S/N', name: 'Sensing / Intuition', big5_map: 'Loosely maps to Big 5 Openness (reversed on S side) — again, binary-forced.' },
    { letters: 'T/F', name: 'Thinking / Feeling', big5_map: 'Loosely maps to Big 5 Agreeableness (F side higher A) — one of the few gender-confounded dichotomies.' },
    { letters: 'J/P', name: 'Judging / Perceiving', big5_map: 'Loosely maps to Big 5 Conscientiousness (J side higher C).' }
  ];

  var MBTI_CRITIQUES = [
    { title: 'Test-retest reliability problem', body: 'About 50% of people who retake the MBTI 4-5 weeks later receive a different 4-letter type (Pittenger 1993, Boyle 1995). By comparison, Big 5 trait scores have test-retest correlations ~0.70–0.90.' },
    { title: 'Forced binary categories destroy information', body: 'MBTI types split traits at or near the mean. Someone scoring 51% Extraversion is called "E"; someone at 49% is called "I" — but they are nearly identical. Continuous traits (Big 5) preserve this information; typology loses it.' },
    { title: 'No bimodal distributions exist', body: 'If MBTI types were real categories, we\'d see bimodal distributions (two peaks) on each dichotomy. Instead, every measured trait underlying MBTI shows a single peak near the middle — the classic signature of a continuous dimension.' },
    { title: 'Jungian theoretical foundation', body: 'MBTI is based on Carl Jung\'s 1921 typology — developed before factor analysis existed, without empirical item selection, by a mother-daughter pair (Briggs & Myers) without formal psychometric training. Big 5 emerged from decades of factor-analytic research on trait-descriptive language (the "lexical hypothesis").' },
    { title: 'No incremental validity', body: 'When Big 5 is entered in a regression first, MBTI adds essentially zero predictive validity for job performance, academic achievement, or life outcomes. It measures roughly what Big 5 measures — just worse.' },
    { title: 'Popular because it feels kind', body: 'MBTI reports emphasize "no type is better than another" and avoid trait labels like "low Conscientiousness" that might feel judgmental. This is commercially smart but scientifically evasive.' }
  ];

  // ── Holland RIASEC (O*NET-compatible, public-domain short form) ──
  // Each item: { task, type }
  var RIASEC_ITEMS = [
    // Realistic
    { t: 'Build kitchen cabinets.', d: 'R' },
    { t: 'Repair a car engine.', d: 'R' },
    { t: 'Install flooring in a house.', d: 'R' },
    { t: 'Operate a crane at a construction site.', d: 'R' },
    { t: 'Fix a broken faucet.', d: 'R' },
    { t: 'Work on a farm raising crops.', d: 'R' },
    // Investigative
    { t: 'Study the structure of the human body.', d: 'I' },
    { t: 'Study whales and other types of marine life.', d: 'I' },
    { t: 'Develop a new medicine.', d: 'I' },
    { t: 'Do research on plants or animals.', d: 'I' },
    { t: 'Examine blood samples using a microscope.', d: 'I' },
    { t: 'Investigate the cause of a fire.', d: 'I' },
    // Artistic
    { t: 'Write a song.', d: 'A' },
    { t: 'Create special effects for movies.', d: 'A' },
    { t: 'Paint or draw pictures.', d: 'A' },
    { t: 'Design artwork for magazines.', d: 'A' },
    { t: 'Write a novel or play.', d: 'A' },
    { t: 'Perform dance routines on stage.', d: 'A' },
    // Social
    { t: 'Teach children how to read.', d: 'S' },
    { t: 'Help people with personal or emotional problems.', d: 'S' },
    { t: 'Lead a youth group meeting.', d: 'S' },
    { t: 'Give career counseling to students.', d: 'S' },
    { t: 'Help conduct a group therapy session.', d: 'S' },
    { t: 'Care for the elderly in a nursing home.', d: 'S' },
    // Enterprising
    { t: 'Buy and sell stocks and bonds.', d: 'E' },
    { t: 'Manage a retail store.', d: 'E' },
    { t: 'Start your own business.', d: 'E' },
    { t: 'Negotiate business contracts.', d: 'E' },
    { t: 'Sell houses.', d: 'E' },
    { t: 'Represent clients in a court of law.', d: 'E' },
    // Conventional
    { t: 'Keep accounting records for a business.', d: 'C' },
    { t: 'Prepare someone\'s tax return.', d: 'C' },
    { t: 'Maintain employee records.', d: 'C' },
    { t: 'Proofread records or forms.', d: 'C' },
    { t: 'Operate a calculator to do accounting.', d: 'C' },
    { t: 'Enter information into a database.', d: 'C' }
  ];

  var RIASEC_TYPES = {
    R: { name: 'Realistic', desc: 'Prefers hands-on, physical, practical, "doer" work. Values tangible outcomes.', examples: 'Carpenter, mechanic, electrician, farmer, EMT, civil engineer, athletic trainer.' },
    I: { name: 'Investigative', desc: 'Prefers analytical, scientific, research-oriented work. Values knowledge, precision, inquiry.', examples: 'Physician, scientist, engineer, statistician, pharmacist, software developer, actuary.' },
    A: { name: 'Artistic', desc: 'Prefers creative, expressive, unstructured work. Values aesthetic creation.', examples: 'Musician, writer, designer, architect, fine artist, performer, journalist.' },
    S: { name: 'Social', desc: 'Prefers helping, teaching, counseling, cooperative work. Values relationships, service.', examples: 'Teacher, therapist, social worker, nurse, clergy, school psychologist, speech pathologist.' },
    E: { name: 'Enterprising', desc: 'Prefers leading, persuading, selling, managing work. Values influence, status, achievement.', examples: 'Manager, entrepreneur, attorney, sales, politician, executive, real estate agent.' },
    C: { name: 'Conventional', desc: 'Prefers structured, detail-oriented, rule-governed work. Values accuracy, order, stability.', examples: 'Accountant, auditor, paralegal, administrator, financial analyst, librarian, medical records tech.' }
  };

  // ── Employer assessment primers ──
  var EMPLOYER_TESTS = [
    { id: 'disc', name: 'DISC', full: 'Dominance, Influence, Steadiness, Conscientiousness', what: 'Behavioral style inventory classifying respondents into 4 primary styles with 12 sub-blends.', dimensions: ['D: Dominance (assertive, task-focused)', 'I: Influence (sociable, persuasive)', 'S: Steadiness (cooperative, patient)', 'C: Conscientiousness (analytical, precise)'], evidence: 'Weak. Test-retest reliability moderate; predictive validity for job performance low and not consistently replicated. Roots in Marston\'s 1928 pop-psychology book, not empirical psychology.', why_used: 'Cheap, fast, comfortable-feeling to administrators. Often used for team-building, not hiring decisions.', strategy: 'Answer as your "work self." If the role is sales/leadership, moderate emphasis on D or I is appropriate. Avoid extreme endpoints that don\'t match your actual style — forced-choice format (MOST/LEAST) catches inconsistent angel-answers.' },
    { id: 'pi', name: 'Predictive Index (PI Behavioral)', full: 'PI Behavioral Assessment + PI Cognitive Assessment', what: 'Adjective checklist mapping to 4 factors — Dominance (A), Extraversion (B), Patience (C), Formality (D). Cognitive is 50-item timed (12 min) general cognitive ability test.', dimensions: ['Dominance', 'Extraversion', 'Patience', 'Formality', 'Cognitive Ability (separate)'], evidence: 'Behavioral: modest evidence, similar to Big 5 ~60% overlap. Cognitive: equivalent to Wonderlic/general g measures — genuinely predictive of job performance.', why_used: 'HR-friendly dashboard. Used for hiring, succession, team design.', strategy: 'Behavioral: checklist ("Which of these words describe you at work? Which describe others\' expectations of you?"). Select words that genuinely describe your best work self — consistency across the two lists matters. Cognitive: brush up on general reasoning (vocabulary, arithmetic, logical series) beforehand; time pressure is intense.' },
    { id: 'caliper', name: 'Caliper Profile', full: 'Caliper Profile (180 items, ~60 min)', what: 'Hybrid personality + problem-solving battery mapping to job-relevant traits (assertiveness, sociability, abstract reasoning, etc.).', dimensions: ['Leadership', 'Interpersonal dynamics', 'Problem-solving', 'Personal organization'], evidence: 'Commercial validity studies suggest modest predictive validity. Not widely peer-reviewed.', why_used: 'Executive hiring, C-suite selection, succession planning.', strategy: 'Long test — pace yourself. Forced-choice items mean angel-answers are detected. Preview honestly: rank from "most like me at work" to "least" — don\'t invert your real pattern.' },
    { id: 'hogan', name: 'Hogan (HPI + HDS + MVPI)', full: 'Hogan Personality Inventory + Hogan Development Survey + Motives, Values, Preferences Inventory', what: 'HPI: Big-5-aligned "bright side" — 7 primary scales. HDS: "dark side" derailers under stress — 11 scales. MVPI: work motivators.', dimensions: ['HPI: Adjustment, Ambition, Sociability, Interpersonal Sensitivity, Prudence, Inquisitive, Learning Approach', 'HDS: Excitable, Skeptical, Cautious, Reserved, Leisurely, Bold, Mischievous, Colorful, Imaginative, Diligent, Dutiful', 'MVPI: Aesthetics, Affiliation, Altruism, Commerce, Hedonism, Power, Recognition, Science, Security, Tradition'], evidence: 'Strongest empirical validation among major commercial tests. HPI-HDS-MVPI combo used in peer-reviewed research. Genuinely predictive of leadership derailment.', why_used: 'Leadership development, executive coaching, mid-to-senior hiring.', strategy: 'HPI: straightforward Big 5 — answer as best work self. HDS: the "dark side" — this is looking for excess/derailment under stress. Do NOT lie (consistency scales catch it). If you know you run hot when stressed, moderate your intensity — describe it as self-aware rather than catastrophic. MVPI: what motivates you at work — align loosely with role (e.g., "Power" or "Commerce" higher for sales/exec; "Altruism" higher for nonprofit/healthcare).' },
    { id: 'sixteenpf', name: '16PF', full: 'Sixteen Personality Factor Questionnaire', what: 'Cattell\'s 16 primary trait scales (Warmth, Reasoning, Emotional Stability, Dominance, etc.) mapped to "Global Factors" similar to Big 5.', dimensions: 'Warmth, Reasoning, Emotional Stability, Dominance, Liveliness, Rule-Consciousness, Social Boldness, Sensitivity, Vigilance, Abstractedness, Privateness, Apprehension, Openness to Change, Self-Reliance, Perfectionism, Tension', evidence: 'Moderate. Factor structure partially replicates. Older instrument with some contemporary recalibration.', why_used: 'Career counseling, clinical use, industrial selection for stable roles.', strategy: 'Long (185 items). Moderate pacing. Answer honestly — consistency across 16 scales is hard to fake coherently. Big 5 interpretation is the usable output; primary scales are often noisy.' },
    { id: 'gallup', name: 'CliftonStrengths (Gallup)', full: 'CliftonStrengths (formerly StrengthsFinder)', what: '34 "talent themes" ranked by a forced-choice 177-item (now 120) inventory. You receive a report emphasizing your top 5.', dimensions: '34 themes organized into 4 domains: Executing (Achiever, Arranger, Deliberative, etc.), Influencing (Command, Communication, Competition, etc.), Relationship Building (Empathy, Harmony, Includer, etc.), Strategic Thinking (Analytical, Context, Futuristic, etc.)', evidence: 'Weak-to-moderate. Not a trait measure in the Big 5 sense — more like a ranked-preferences instrument. Validity studies come primarily from Gallup itself.', why_used: 'Employee development, team-building, manager-direct report conversations. Rarely used for hiring directly.', strategy: 'Forced-choice between two statements — you must pick one as "more describes me" even if neither fits. Lean toward the work-relevant choice. Top 5 report is the deliverable; don\'t fight it — use it as a vocabulary for self-advocacy, not a fixed identity.' },
    { id: 'wonderlic', name: 'Wonderlic (WPT-Q, WPT-R)', full: 'Wonderlic Personnel Test — Quicktest / Revised', what: '50-item general cognitive ability test, 12-minute time limit. Vocabulary, math, logic, pattern recognition.', dimensions: ['General cognitive ability (g)'], evidence: 'Strong. Wonderlic scores correlate ~0.70+ with broader IQ measures. Strongly predictive of job performance across occupations (meta-analyses by Schmidt & Hunter).', why_used: 'Entry-level hiring, NFL combine (controversially), entrance screening when cognitive load matters.', strategy: 'Brush up before: basic algebra, word definitions, simple logic puzzles, pattern series. Time pressure is the killer — skip hard items, return if time. You are rewarded for volume of correct answers. Practice tests widely available online.' },
    { id: 'ccat', name: 'Criteria Cognitive Aptitude Test (CCAT)', full: 'CCAT by Criteria Corp', what: '50-item, 15-minute cognitive test. Math, verbal reasoning, spatial, logic.', dimensions: ['Numerical reasoning', 'Verbal reasoning', 'Spatial/abstract reasoning'], evidence: 'Strong. Similar to Wonderlic. Genuine general cognitive ability measure.', why_used: 'Tech, finance, consulting hiring — especially for roles claiming "we hire smart people."', strategy: 'Similar to Wonderlic. Most candidates don\'t finish — 10% finish is often the published norm. Focus on accuracy first, then speed. Practice on CCAT-specific prep sites.' }
  ];

  var EMPLOYER_ETHICS = [
    { title: 'Legal landscape — your rights', body: 'Under ADA, employers cannot require pre-offer medical exams. Personality tests that assess mental illness or emotional disorders have been ruled "medical examinations" in some jurisdictions (Karraker v. Rent-A-Center, 7th Cir. 2005, about MMPI use). Post-offer use is more permissible but still regulated. Cognitive tests are generally allowed pre-offer but must be job-related and cannot create disparate impact without validation.' },
    { title: 'Soroka v. Dayton Hudson (CA, 1991)', body: 'California court ruled Target\'s use of a pre-employment personality test (adapted from MMPI and CPI) violated applicants\' privacy rights — asked questions about religious beliefs, sexual behavior, etc. Settled via class action. Established that personality tests can be legally actionable if they invade protected privacy interests.' },
    { title: 'Karraker v. Rent-A-Center (7th Cir. 2005)', body: 'Federal appeals court ruled that use of MMPI for promotion decisions constituted a "medical examination" under ADA since it was designed to detect mental illness — prohibited in pre-offer employment context. Landmark for limiting clinical instrument use in hiring.' },
    { title: 'EEOC guidance on selection procedures (Uniform Guidelines, 1978)', body: 'Selection procedures that cause disparate impact on protected groups (race, sex, national origin) must be shown to be job-related and consistent with business necessity. Many personality tests have not been validated against these standards.' },
    { title: 'Disability & neurodivergence screening', body: 'Many employer personality tests systematically screen out candidates with anxiety (higher Neuroticism), depression, autism (lower Extraversion, different social patterns), ADHD (lower Conscientiousness on paper). This is legally questionable under ADA when tests measure traits associated with protected disabilities. Candidates have the right to request accommodations — extended time on cognitive tests, quiet environment, breaks.' },
    { title: 'The "best self at work" line', body: 'Presenting the professional, work-functional version of yourself is legitimate self-presentation — not deception. You are not obligated to disclose personal-life struggles, mental health history, or identity details the test wasn\'t designed to ask about. Answer as the you that shows up on your best work day.' },
    { title: 'When to escalate', body: 'If an employer test asks about medical history, religious beliefs, sexual orientation, political views, or mental health diagnoses — these may violate employment law. Document the questions. Consider consulting an employment attorney or the EEOC before completing.' }
  ];

  var EMPLOYER_STRATEGY = [
    { rule: 'Answer as your best work self', detail: 'Not your personal-life self, not the idealized self you wish you were. The version of you that shows up on your best work day — consistent, professional, engaged. That self is legitimately yours to present.' },
    { rule: 'Consistency across the test', detail: 'Nearly all quality assessments probe the same trait 2–5 times with reworded items. Answering inconsistently (e.g., "I am always on time" + "I am often late") triggers social-desirability/validity flags. Pick a coherent self-presentation and hold it.' },
    { rule: 'Know which dimensions are measured', detail: 'Most employer tests reduce to Big 5 + integrity/counterproductive work behavior. Conscientiousness and Emotional Stability are the most job-predictive traits — moderate-to-high on these is almost always good. Extraversion matters for sales/leadership; Openness matters for creative/strategic roles; Agreeableness is tricky (high helps teams, low helps negotiators).' },
    { rule: 'Avoid extreme endpoints unless genuine', detail: 'On a 5-point scale, always-answering 1 or 5 is a lie-detector flag. Real self-reports have variation. Using 2-4 for most items, reserving 1/5 for genuine extremes, is both more believable and more accurate.' },
    { rule: 'Role-appropriate emphasis, not role-opposite', detail: 'If you\'re applying for an IC engineering role, over-claiming "dominant leadership style" is a mismatch — you\'ll be screened as wrong-fit. If you\'re applying for sales, understating assertiveness is a mismatch. Read the job description and present the part of your work self that aligns — don\'t invent a different self.' },
    { rule: 'Practice cognitive tests', detail: 'Wonderlic, CCAT, PI Cognitive — these are speeded g-tests. Practice is legitimate preparation, not cheating. Free practice tests exist. Get familiar with the item types (logic series, vocabulary, arithmetic, spatial rotations) before test day.' },
    { rule: 'Request accommodations if qualified', detail: 'Extended time, breaks, screen reader, quiet room — these are ADA-eligible accommodations for qualifying conditions. Request in advance. Employers may not retaliate for requesting accommodations, and disclosure can be limited to "a disability covered under ADA" without specifying the diagnosis.' },
    { rule: 'Treat the whole hiring pipeline as signal', detail: 'A company that screens heavily with DISC or MBTI is signaling how they make people decisions. That\'s information for you. Many candidates self-deselect from cultures they detect as ill-fit during the testing phase — which is fine.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1B: SCHOOL PSYCHOLOGY / IEP CONTENT
  // ═══════════════════════════════════════════════════════════════

  // ── RTI / MTSS tiers ──
  var RTI_TIERS = [
    { tier: 1, pct: '80%', name: 'Universal Core Instruction', who: 'All students in the general ed classroom.', what: 'Evidence-based curriculum, differentiated instruction, universal screening 3x per year (e.g., DIBELS, AIMSweb). Students progressing on grade-level benchmarks stay here.', intensity: '150+ min/week on core instruction.' },
    { tier: 2, pct: '10-15%', name: 'Targeted Group Intervention', who: 'Students below grade-level benchmarks on universal screening; at risk without extra support.', what: 'Small-group (3-6 students), evidence-based intervention matched to the specific skill deficit (e.g., phonics, fluency, number sense). Progress monitored weekly or biweekly.', intensity: '30 min/day, 3-5 days/week, for 8-12 weeks. Response = closing the gap.' },
    { tier: 3, pct: '3-5%', name: 'Intensive Individualized Intervention', who: 'Students not responding to Tier 2, or starting significantly below peers. Often those being considered for special ed referral.', what: 'One-on-one or very small group, highly individualized, evidence-based. Daily progress monitoring. Detailed data collection.', intensity: '45-60 min/day, 5 days/week, often for 12+ weeks. Nonresponse at Tier 3 is strong evidence for special ed referral.' }
  ];

  // ── SLD identification methods ──
  var SLD_METHODS = [
    { name: 'Severe Discrepancy (IQ-Achievement)', era: 'Dominant 1975-2004; allowed but not required under IDEA 2004', how: 'Compare standard scores on cognitive ability (e.g., WISC-V FSIQ) with achievement (WIAT-4 reading, math, writing). A "severe" discrepancy (typically 15-22 points, or 1-1.5 SD, depending on state) signals SLD.', strengths: 'Straightforward. Widely understood by older practitioners. Quick to calculate.', weaknesses: '"Wait-to-fail" problem — a 1st or 2nd grader hasn\'t had time to fall 22 points behind. Ignores intervention response. Misses twice-exceptional (gifted-LD) students whose high ability masks severe skill deficits. Psychometrically — the difference score has large measurement error. IDEA 2004 explicitly allowed states to stop requiring this method.' },
    { name: 'RTI-Based Identification', era: 'Post-2004, rising with MTSS adoption', how: 'Student fails to respond to scientifically-based Tier 3 intervention over 8-12+ weeks despite fidelity, adequate dosage, and appropriately targeted strategy. Nonresponse = candidate for SLD.', strengths: 'Proactive — identifies students early, doesn\'t wait for failure. Aligns with general-ed intervention already happening. Supports prevention.', weaknesses: 'Requires a well-implemented RTI/MTSS system in the school — not all schools have this. "Response" is not operationally consistent across districts. Doesn\'t identify *why* the student isn\'t responding (the cognitive profile question). Can be confounded with poor instruction, English language learner status, attendance.' },
    { name: 'PSW (Pattern of Strengths and Weaknesses)', era: 'Post-2004, currently dominant in many states', how: 'Requires: (a) academic skill deficit (below average in 1+ of the 8 IDEA SLD areas: basic reading, reading fluency, reading comprehension, math calculation, math problem-solving, written expression, listening comprehension, oral expression), (b) a cognitive processing weakness that research links to that academic area (e.g., phonological processing tied to reading decoding; Gsm/working memory tied to math), (c) strengths in other cognitive areas showing the student CAN learn. Commonly operationalized with CHC-aligned batteries (WJ-IV, WISC-V + WIAT-4).', strengths: 'Theoretically rigorous — ties cognitive findings to academic weaknesses via empirically supported research. Captures twice-exceptional students. Identifies specific deficit, informing intervention. Widely accepted by Learning Disability Association of America and NASP.', weaknesses: 'Requires specialized training in CHC theory and cross-battery assessment. Longer eval time. Not all cognitive-academic links have equally strong research. Some critics argue PSW adds little over achievement-only data for intervention planning.' }
  ];

  // ── Psychoed evaluation components ──
  var PSYCHOED_COMPONENTS = [
    { domain: 'Cognitive Ability', why: 'Characterizes the student\'s learning capacity and profile — the foundation for eligibility in most SLD and ID cases.', instruments: 'WISC-V (6:0-16:11), WJ-IV COG (2-90+), KABC-II NU, DAS-II, SB-5, RIAS-2. Choose based on age, language, and theoretical preference (PSW favors WJ-IV).' },
    { domain: 'Academic Achievement', why: 'Documents current skill levels in reading, writing, math, oral language. Required for SLD determination.', instruments: 'WIAT-4, WJ-IV ACH, KTEA-3. Should cover all 8 IDEA SLD areas when SLD is suspected.' },
    { domain: 'Behavioral / Social-Emotional', why: 'Screens for Emotional Disturbance (ED) eligibility; rules out/in ADHD, anxiety, depression, externalizing problems. Parent + teacher + (age-appropriate) student forms.', instruments: 'BASC-3 (preschool-college), CBCL/TRF/YSR (Achenbach), Conners-4 (ADHD-focused), BASC-3 BESS for screening.' },
    { domain: 'Adaptive Functioning', why: 'Required for Intellectual Disability (ID) eligibility — below-average scores in communication, daily living, socialization relative to age. Also informs autism and traumatic brain injury evals.', instruments: 'Vineland-3 (semi-structured interview or rating form), ABAS-3 (rating form). Parent + teacher raters compared.' },
    { domain: 'Executive Function', why: 'Characterizes regulatory/self-management difficulties especially in ADHD, ASD, TBI, OHI. Parent and teacher perspectives matter.', instruments: 'BRIEF-2 (rating scale, behavioral report), D-KEFS (performance-based), NEPSY-II EF subtests.' },
    { domain: 'Reading / Phonological (if reading concerns)', why: 'Identifies specific reading deficits — phonological processing, rapid naming, orthographic processing — that tie cognitive profile to intervention.', instruments: 'CTOPP-2 (phonological awareness, memory, rapid naming), GORT-5 (oral reading), TOWRE-2 (word reading efficiency), Feifer Assessment of Reading (FAR).' },
    { domain: 'Autism-specific (if suspected)', why: 'Structured observation + parent interview for Autism eligibility; gold-standard differential diagnosis.', instruments: 'ADOS-2 (observation), ADI-R (parent interview), CARS-2, SRS-2 (rating scale).' },
    { domain: 'Trauma / Mental Health (if indicated)', why: 'Informs clinical differential; may be referred out rather than eval\'d in school eval. Distinguishes ED from trauma reactions.', instruments: 'TSCC (trauma), UCLA PTSD Reaction Index, MASC-2 (anxiety), CDI-2 (depression). Many school psychs refer these to community mental health.' }
  ];

  // ── 504 vs IEP ──
  var FIVE04_VS_IEP = {
    fiveoFour: {
      name: 'Section 504 Plan',
      law: 'Section 504 of the Rehabilitation Act of 1973 (civil rights law)',
      eligibility: 'Any physical or mental impairment that substantially limits one or more major life activities (learning, concentrating, reading, thinking, communicating, walking, seeing, hearing, etc.). Broader eligibility than IEP.',
      provides: 'Accommodations and modifications in the general education setting. No specialized instruction. No related services as entitlement (though may be included).',
      process: 'Less formal process. Team determines eligibility and plan. No annual IEP meeting requirement (though annual review is best practice). Re-evaluation periodic.',
      examples: 'Extended time on tests, preferential seating, frequent breaks, access to notes, reduced homework load, oral presentation of written instructions, food/bathroom access for medical conditions.',
      when: 'Student has disability that affects learning or school participation but does NOT need specialized instruction. Or: doesn\'t meet one of the 13 IDEA categories. Common for ADHD (if classroom accommodations suffice), diabetes, chronic illnesses, temporary injuries, some mental health conditions.'
    },
    iep: {
      name: 'Individualized Education Program (IEP)',
      law: 'Individuals with Disabilities Education Act (IDEA) (education law, federal funding-tied)',
      eligibility: 'THREE PRONGS: (1) One of 13 IDEA eligibility categories, (2) adverse impact on educational performance, (3) need for specialized instruction. All three required.',
      provides: 'Specialized instruction (designed to meet unique needs arising from disability), related services (speech, OT, PT, counseling as needed), accommodations, sometimes modifications, transition services (by age 16). Free Appropriate Public Education (FAPE) in Least Restrictive Environment (LRE).',
      process: 'Formal process: referral → eval within 60 days → eligibility meeting → IEP development → annual review → 3-year re-eval (or earlier with consent). Procedural safeguards apply. Prior Written Notice required for changes.',
      examples: 'Pull-out reading intervention 30 min/day, speech therapy 2x/week, 1:1 paraprofessional, behavior support plan, assistive technology, accommodations from the 504 list plus more.',
      when: 'Student meets IDEA eligibility and needs specialized instruction to access general curriculum. Always provides MORE than a 504.'
    },
    decisionTree: [
      'Does the student have a disability? → If no: neither.',
      'Does the disability substantially limit a major life activity (including learning)? → If no and not in school-related activity: no 504. If yes: at least 504.',
      'Does the disability meet one of the 13 IDEA eligibility categories? → If no: 504 only.',
      'Does the disability adversely impact educational performance? → If no: 504 only.',
      'Does the student need specialized instruction (not just accommodations)? → If no: 504 only. If yes: IEP.'
    ]
  };

  // ── 13 IDEA categories ──
  var IDEA_CATEGORIES = [
    { code: 'AU', name: 'Autism', def: 'Developmental disability significantly affecting verbal/nonverbal communication and social interaction, generally evident before age 3. Often characterized by engagement in repetitive activities, resistance to environmental change, unusual sensory responses.', typicalEval: 'ADOS-2 + ADI-R + cognitive + adaptive + language' },
    { code: 'DB', name: 'Deaf-Blindness', def: 'Concomitant hearing and visual impairments causing severe communication, developmental, educational needs that cannot be accommodated in programs solely for deaf or blind students.', typicalEval: 'Audiology + vision + communication + adaptive + specialized combined-impairment eval' },
    { code: 'D', name: 'Deafness', def: 'Hearing impairment so severe the child is impaired in processing linguistic information through hearing, with or without amplification.', typicalEval: 'Audiology + nonverbal cognitive (UNIT-2) + language/communication + adaptive' },
    { code: 'ED', name: 'Emotional Disturbance', def: 'Over long period / to marked degree, one or more: (a) inability to learn not explained by other factors, (b) inability to build/maintain relationships, (c) inappropriate behaviors/feelings under normal circumstances, (d) pervasive mood of unhappiness/depression, (e) tendency to develop physical symptoms/fears. Schizophrenia included; social maladjustment alone excluded (controversial).', typicalEval: 'BASC-3 + CBCL + clinical interview + observations + cognitive (rule-out SLD) + mental health referral' },
    { code: 'HI', name: 'Hearing Impairment', def: 'Impairment in hearing (permanent or fluctuating) that adversely affects educational performance but is not included under Deafness.', typicalEval: 'Audiology + language + cognitive + achievement' },
    { code: 'ID', name: 'Intellectual Disability', def: 'Significantly subaverage general intellectual functioning (typically FSIQ ~70 or below, ± SEM) existing concurrently with deficits in adaptive behavior, manifested during the developmental period.', typicalEval: 'Cognitive (FSIQ with CI) + adaptive (Vineland-3 or ABAS-3) + achievement + developmental history' },
    { code: 'MD', name: 'Multiple Disabilities', def: 'Concomitant impairments (e.g., ID+blindness, ID+orthopedic) with severe educational needs that cannot be met in programs solely for one of the impairments. Does not include deaf-blindness.', typicalEval: 'Combination targeted to specific presenting impairments' },
    { code: 'OI', name: 'Orthopedic Impairment', def: 'Severe orthopedic impairment adversely affecting educational performance. Includes impairments caused by congenital anomalies, disease (e.g., cerebral palsy), or other causes.', typicalEval: 'Medical records + PT/OT + cognitive (if needed) + access/accommodation evaluation' },
    { code: 'OHI', name: 'Other Health Impairment', def: 'Limited strength, vitality, or alertness (including heightened alertness to environmental stimuli) resulting in limited alertness to the educational environment, due to chronic/acute health problems (asthma, ADHD, diabetes, epilepsy, heart condition, etc.) that adversely affects educational performance. ADHD is most commonly classified here.', typicalEval: 'Medical documentation + behavioral/attention rating scales + cognitive (if needed) + achievement' },
    { code: 'SLD', name: 'Specific Learning Disability', def: 'Disorder in one or more basic psychological processes involved in understanding or using spoken/written language, manifested in imperfect ability to listen, think, speak, read, write, spell, or do math. Includes conditions like perceptual disabilities, brain injury, minimal brain dysfunction, dyslexia, developmental aphasia. Excludes problems primarily due to visual, hearing, motor disabilities; ID; ED; environmental/cultural/economic disadvantage.', typicalEval: 'Cognitive + comprehensive achievement (all 8 IDEA areas) + observation + PSW or RTI-based identification' },
    { code: 'SLI', name: 'Speech or Language Impairment', def: 'Communication disorder (stuttering, impaired articulation, language impairment, voice impairment) that adversely affects educational performance.', typicalEval: 'SLP comprehensive speech-language evaluation + cognitive (rule-out ID) + classroom impact documentation' },
    { code: 'TBI', name: 'Traumatic Brain Injury', def: 'Acquired injury to the brain caused by external physical force, resulting in total/partial functional disability or psychosocial impairment. Does not include congenital/degenerative injuries.', typicalEval: 'Neuropsych + cognitive + achievement + behavioral + medical records' },
    { code: 'VI', name: 'Visual Impairment (including Blindness)', def: 'Impairment in vision that, even with correction, adversely affects educational performance. Includes both partial sight and blindness.', typicalEval: 'Ophthalmologist/optometrist + functional vision eval + orientation/mobility + academic impact' }
  ];
  var IDEA_DEVDELAY = { code: 'DD', name: 'Developmental Delay', def: 'State-optional category for children ages 3-9 (or a subset). Significant delays in physical, cognitive, communication, social-emotional, or adaptive development. Allows eligibility without committing to a specific category when presentation is unclear at young ages.', typicalEval: 'Developmental battery + adaptive + language + parent interview' };

  // ── Psych report anatomy ──
  var REPORT_ANATOMY = [
    { section: 'Referral Question', purpose: 'Why is this evaluation happening? Specific question(s) from parent, teacher, or team. Everything else in the report should connect back to answering these.', watchFor: 'Vague referral ("concerns about academics") → eval becomes unfocused. Well-written referrals specify concerns AND questions ("Does student have SLD in reading? Rule out ID.").' },
    { section: 'Background Information', purpose: 'Developmental history, medical history, educational history, family context, prior interventions/evaluations. Contextualizes current findings.', watchFor: 'Should include: birth/pregnancy, developmental milestones, medical conditions, prior evaluations, prior interventions and response, family learning history (many LDs are heritable), cultural/linguistic context, attendance.' },
    { section: 'Behavioral Observations', purpose: 'What the evaluator saw during testing — effort, attention, anxiety, fatigue, strategy use. Interprets validity of test results.', watchFor: 'If observations note poor effort or extreme anxiety, scores may underestimate ability. A clean observations section is a prerequisite for trusting the numbers.' },
    { section: 'Tests Administered', purpose: 'Lists every instrument and subtest given. Allows reviewer to check battery adequacy for the referral question.', watchFor: 'For SLD: is achievement covered across ALL relevant IDEA areas? For ID: was adaptive behavior measured? For autism: was ADOS-2 or equivalent given?' },
    { section: 'Results (Scores Table)', purpose: 'Standard scores, percentile ranks, and confidence intervals for each measure administered. The raw evidence.', watchFor: 'Standard scores (mean 100, SD 15) with 95% CIs. Percentile ranks (not percentages!) tell you where the student falls relative to peers. A "standard score of 85" = 16th percentile = 1 SD below mean = low-average range.' },
    { section: 'Interpretation / Integration', purpose: 'Where the clinician weaves results together, addresses the referral question, rules in/out diagnoses and eligibilities. The "thinking" section.', watchFor: 'Good interpretation: data → inference → conclusion, shown transparently. Bad interpretation: leaps from test scores to labels without connection. Red flag if interpretation contradicts observations or ignores scatter.' },
    { section: 'Summary / Eligibility Statement', purpose: 'Concise restatement of findings and eligibility determination per IDEA or 504. Provides the legal/procedural decision.', watchFor: 'Eligibility statement should name the category, cite the evidence for each required element (e.g., for SLD: academic deficit + cognitive processing weakness + strengths + adverse educational impact), and state need for specialized instruction.' },
    { section: 'Recommendations', purpose: 'Concrete, actionable suggestions for instruction, accommodations, environmental adjustments, referrals. The "so what?"', watchFor: 'Generic recs ("consider differentiated instruction") are weak. Strong recs are specific, tied to findings, and doable: "Use research-based phonics program (e.g., Wilson, Orton-Gillingham) for 30 min/day, 5 days/week, with weekly progress monitoring using DIBELS ORF."' }
  ];

  // ── Parent procedural safeguards (IDEA) ──
  var PARENT_RIGHTS = [
    { right: 'Prior Written Notice (PWN)', body: 'School must give you written notice before it proposes OR refuses to initiate/change your child\'s identification, evaluation, placement, or FAPE. Must include: what\'s proposed, why, options considered and why rejected, evaluation data relied upon, other factors. PWN is your documentation trail.' },
    { right: 'Informed Consent', body: 'School must get your written consent before initial evaluation and before initial provision of special ed services. You can revoke consent (though school can use due process to contest).' },
    { right: 'Independent Educational Evaluation (IEE)', body: 'If you disagree with the school\'s evaluation, you have the right to request an IEE at public expense (school pays), OR pay privately. School must either agree to pay or file due process to show their eval was appropriate. If they pay, you choose the evaluator (from their list or another qualified professional).' },
    { right: 'Access to Records', body: 'You have the right to review all educational records related to identification, evaluation, placement, and FAPE. School must respond within 45 days (sometimes sooner per state law). Under FERPA, you also have the right to request corrections.' },
    { right: 'Due Process Complaint', body: 'If you disagree with the school on a special ed issue (eligibility, IEP content, placement, FAPE), you can file a due process complaint. Starts a formal hearing process with specific timelines. Most states offer mediation first (voluntary).' },
    { right: 'Mediation', body: 'Voluntary confidential process with a neutral mediator to resolve disputes. Less adversarial and often faster than due process. Agreements are legally binding.' },
    { right: 'Stay-Put', body: 'During pendency of due process complaint or appeal, the student "stays put" in the current educational placement (unless parent and school agree otherwise). Prevents unilateral changes mid-dispute.' },
    { right: 'Annual Notice of Procedural Safeguards', body: 'School must provide you a copy of procedural safeguards at least annually, and upon initial referral, upon request, upon first due process filing, and upon disciplinary change of placement.' },
    { right: 'Meaningful Participation', body: 'You are an equal member of the IEP team. Meetings should be scheduled at mutually agreed times/places. You have the right to bring people who have knowledge/expertise about your child (advocate, attorney, specialist).' },
    { right: 'Transition to Adulthood', body: 'By age 16 (earlier in some states), the IEP must include transition planning — postsecondary goals, transition services, agency linkages. At age of majority (18 in most states), rights transfer to the student unless guardianship arrangements exist.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1D: HIRING METHODS BEYOND PERSONALITY/COGNITIVE TESTS
  // ═══════════════════════════════════════════════════════════════
  // Meta-analytic validity coefficients primarily from Schmidt & Hunter 1998
  // (and subsequent updates) — predicting supervisor-rated job performance.
  var HIRING_METHODS = [
    {
      name: 'Structured Behavioral Interview',
      r: 0.51,
      how: 'Same questions in same order across candidates, scored against pre-defined rubric. Most use STAR format: Situation → Task → Action → Result. Strong variant: competency-based interview where questions map to named job competencies, scored by trained raters.',
      strategy: 'Prepare 5-7 STAR stories spanning leadership, conflict, failure, ambiguity, initiative, teamwork. Always quantify the Result with a concrete metric ("reduced ticket backlog 30%", "led team of 4 through migration in 6 weeks"). Don\'t rush Situation — 20% of your time setting context lets Action and Result land. If asked a hypothetical ("how would you..."), pivot to a behavioral example ("here\'s a time when I did...") when you have one.',
      ethics: 'Structured > unstructured reduces bias and disparate impact. Same questions means disabled/neurodivergent candidates aren\'t penalized for a social-cue mismatch that wouldn\'t affect job performance.',
      legal: 'Highest-defensibility method if questions are job-related and scoring is documented. Watch out for questions about family status, disability, religion, national origin — illegal regardless of format.'
    },
    {
      name: 'Work Sample Test',
      r: 0.54,
      how: 'Candidate performs a job-relevant task under conditions similar to actual work. Coding test for devs, written case for consultants, teaching demo for teachers, portfolio review for designers, in-basket exercise for managers. Can be timed or take-home.',
      strategy: 'Treat as actual work, not a test. Ask clarifying questions (real work has ambiguity — showing you ask the right ones IS the signal). Show your work and narrate trade-offs: "I considered X and Y, chose X because of Z, the weakness of X is W." Partial-correct with visible reasoning usually beats a complete black-box submission. Time management matters — better to submit 70% done with quality than rush to 100% with bugs.',
      ethics: 'Most directly measures the thing you\'re hiring for. Unpaid long take-homes are increasingly contested — candidates spending 10+ unpaid hours on a work sample is borderline exploitative. If the take-home is reasonable (2-4 hours), fair; beyond that, push back or decline.',
      legal: 'Highest court-defensibility — directly job-related, observable, content-validated by definition.'
    },
    {
      name: 'Situational Judgment Test (SJT)',
      r: 0.34,
      how: 'Text or video scenario depicting a workplace situation; candidate picks the best (and sometimes worst) response from 3-5 options. Usually measures interpersonal judgment, team dynamics, customer service, ethical decision-making. Online, fast, cheap — growing in use.',
      strategy: 'Ask yourself: what does the EMPLOYER want me to do in this role? Not what you\'d personally do. Read carefully — often multiple answers are "not wrong," but only one is "best fit for this organization\'s culture and priorities." If the job description emphasizes customer service, lean toward customer-first answers. If emphasized teamwork, lean toward collaborative.',
      ethics: 'Can encode cultural bias — "best response" may reflect majority-culture workplace norms. Some SJTs ask candidates to identify "problem" behaviors that are actually neurodivergent communication styles.',
      legal: 'Generally defensible if content-validated. Disparate impact analyses should be run during development.'
    },
    {
      name: 'AI-Scored Video Interview (HireVue, Pymetrics, others)',
      r: 'Contested — vendor claims r=0.30-0.45; independent replication limited',
      how: 'Candidate records video responses to standardized prompts on their own device. AI scores facial expression, voice tonality, word choice, speech pace. Output: ranking vs. other candidates or pass/fail threshold. Pre-screens hundreds of applicants before human review.',
      strategy: 'Technical: bright even lighting (face the window), still neutral background, professional attire head-to-toe (stand up for some questions — AI may note it), look at CAMERA not screen, speak clearly at moderate pace. Content: repeat question in your answer (helps transcription), use full time allotted (don\'t end at 30s if given 2 min), smile appropriately but don\'t over-perform. Practice with your phone camera beforehand — the first time you record yourself should not be the real attempt.',
      ethics: 'Major concerns. (1) Facial expression analysis has known bias against autistic candidates (flagged "less engaged"), candidates of color (differential error rates), candidates with facial differences or visible disabilities. (2) Voice analysis disadvantages non-native English speakers, stutterers, deaf candidates with cochlear implants. (3) Algorithmic opacity — candidates often can\'t know why they were rejected. Electronic Privacy Information Center (EPIC) filed an FTC complaint against HireVue in 2019.',
      legal: 'Fast-moving regulation. Illinois AI Video Interview Act (2020): notice + consent + deletion rights. NYC Local Law 144 (2023): bias audits required for automated employment decision tools. Maryland HB 1202 (2020): consent required for facial recognition in hiring. EEOC May 2022 guidance: employer liable for disparate impact of algorithmic tools. If you\'re screened by one of these and rejected, you may have discovery rights depending on jurisdiction.'
    },
    {
      name: 'Reference Checks',
      r: 0.26,
      how: 'Employer contacts listed references (typically 2-3 former managers or colleagues) for behavioral/performance info. Sometimes structured questionnaire, often unstructured conversation. Newer services (Checkster, SkillSurvey) use standardized online rating forms.',
      strategy: 'Pick references who will speak specifically and positively. Prep them in advance: share the job description, remind them of relevant projects/accomplishments, tell them what themes to emphasize. A great reference says "they led X project and delivered Y specific outcome" — not "they\'re great to work with." Three prepped references beats five unprepped. Know your rights under FCRA for formal third-party background checks: notification, consent, copy of report on request, dispute process for inaccuracies.',
      ethics: 'Reference-caller bias is real — same behavior described in racialized or gendered language gets different ratings. Structured online ratings reduce this somewhat.',
      legal: 'FCRA (Fair Credit Reporting Act) governs formal third-party background checks. Informal reference calls from a hiring manager are less regulated but still can\'t ask about protected-class info.'
    },
    {
      name: 'Assessment Center',
      r: 0.37,
      how: 'Multi-method, multi-day evaluation combining in-basket exercises, group discussions, role plays, presentations, interviews — usually for mid-to-senior hires and high-potential development. Candidates scored on dimensions (leadership, strategic thinking, influence) by trained assessors across exercises.',
      strategy: 'Longer engagement means they\'re watching everything, including how you handle downtime, meals, and the waiting room. Treat every interaction as part of the eval. Don\'t try to be a different person for 1-3 days — assessors compare notes and will catch the inconsistency. Work visibly in group exercises: contribute ideas, ask others their view, summarize where the group is. Don\'t dominate; don\'t disappear.',
      ethics: 'Higher-quality method than most single tools but expensive — so tends to be used for roles with higher stakes. When done well, reduces demographic disparate impact vs. single cognitive tests.',
      legal: 'Generally well-defended in court when scoring is documented and dimensions are job-related.'
    },
    {
      name: 'General Cognitive Ability (GCA) Tests',
      r: 0.51,
      how: 'Wonderlic, CCAT, PI Cognitive, CogniFit, Berke — fast timed measures of general reasoning ability. See the employer test primers in the main Test Primers section for specifics.',
      strategy: 'Practice. Cognitive tests are speeded, so familiarity with item types (logical series, vocabulary, arithmetic, spatial, verbal analogies) directly lowers test anxiety and raises score. Free practice versions exist for Wonderlic, CCAT, and PI. Spend 2-3 practice sessions before test day. Request accommodations (extended time) if you have a qualifying disability — legal under ADA with proper documentation.',
      ethics: 'GCA tests are genuinely validity-high for job performance but produce adverse impact against some demographic groups — employers who use them need validation evidence for the specific role. Don\'t use them for roles that don\'t require the cognitive load.',
      legal: 'Well-litigated. Griggs v. Duke Power (1971) established disparate-impact standard. Uniform Guidelines (1978) require validation evidence.'
    }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1E: HEXACO + DARK TRIAD
  // ═══════════════════════════════════════════════════════════════
  var HEXACO_FACTORS = [
    { code: 'H', name: 'Honesty-Humility', desc: 'Sincerity, fairness, avoidance of greed and manipulation. HIGH = honest, modest, fair, loyal. LOW = manipulative, boastful, greedy, willing to cheat/exploit for gain.', facets: 'Sincerity, Fairness, Greed Avoidance, Modesty', empirical: 'The key HEXACO addition not captured by Big 5. Strongest trait correlate of counterproductive work behavior (cheating, theft, workplace deviance) — Big 5 misses this. Negatively correlates with all three Dark Triad traits. Matters for integrity testing, ethical leadership research, fraud prediction.' },
    { code: 'E', name: 'Emotionality', desc: 'Similar to (but not identical to) Big 5 Neuroticism. HIGH = anxiety, fearfulness, sentimental attachment, dependence on others in stress. LOW = emotional detachment, courage under threat, independence.', facets: 'Fearfulness, Anxiety, Dependence, Sentimentality', empirical: 'HEXACO Emotionality is somewhat broader than Big 5 Neuroticism — captures emotional attachment and interdependence, not just negative affect. Lower cross-cultural stability than other HEXACO factors.' },
    { code: 'X', name: 'eXtraversion', desc: 'Sociability, assertiveness, positive affect. HIGH = energetic, sociable, confident in groups. LOW = reserved, independent, prefers low-stimulation environments.', facets: 'Social Self-Esteem, Social Boldness, Sociability, Liveliness', empirical: 'Maps closely to Big 5 Extraversion. Good convergence (r ≈ 0.65-0.75).' },
    { code: 'A', name: 'Agreeableness', desc: 'Patience, gentleness, forgiveness, flexibility. HIGH = patient, easy to forgive, accommodating. LOW = critical, quick-tempered, stubborn, holds grudges.', facets: 'Forgiveness, Gentleness, Flexibility, Patience', empirical: 'HEXACO Agreeableness is SOMEWHAT DIFFERENT from Big 5 Agreeableness. HEXACO splits honesty/humility out separately — so HEXACO A is more about patience/temper/forgiveness than sincerity. Lower cross-loading with trust issues than Big 5 A.' },
    { code: 'C', name: 'Conscientiousness', desc: 'Organization, diligence, perfectionism, prudence. HIGH = organized, careful, thorough, self-disciplined. LOW = disorganized, impulsive, careless.', facets: 'Organization, Diligence, Perfectionism, Prudence', empirical: 'Maps closely to Big 5 C. Strongest trait predictor of job performance across both frameworks.' },
    { code: 'O', name: 'Openness to Experience', desc: 'Intellectual curiosity, aesthetic appreciation, creativity, unconventionality. HIGH = curious, imaginative, artsy, questions tradition. LOW = practical, conventional, preference for familiar.', facets: 'Aesthetic Appreciation, Inquisitiveness, Creativity, Unconventionality', empirical: 'Maps closely to Big 5 O.' }
  ];

  var DARK_TRIAD = [
    { code: 'Mach', name: 'Machiavellianism', desc: 'Strategic, cold manipulation. Uses others instrumentally to achieve goals. Deceptive and calculating when advantageous. Not necessarily impulsive — often the opposite: patient, strategic, long-game.', origin: 'Christie & Geis, Mach IV scale (1970) derived from Machiavelli\'s "The Prince."', instruments: 'Mach IV (original, 20 items), MACH-IV (revised), SD3 Machiavellianism subscale, Dirty Dozen Mach subscale.', correlates: 'Lower in agreeableness, lower in honesty-humility, higher in cynicism. Predicts counterproductive work behavior, unethical decision-making, workplace deception. Less impulsive than psychopathy — distinguishes it.' },
    { code: 'Narc', name: 'Narcissism (subclinical)', desc: 'Grandiosity, sense of entitlement, need for admiration, exploitation when useful. NOT the same as Narcissistic Personality Disorder (clinical). Subclinical trait form common in general population, especially in leadership roles.', origin: 'Raskin & Hall, Narcissistic Personality Inventory (NPI, 1979).', instruments: 'NPI-40 (long), NPI-16 (short), SD3 Narcissism subscale, Dirty Dozen Narc subscale, Hypersensitive Narcissism Scale (vulnerable vs grandiose distinction).', correlates: 'Higher in extraversion and openness (grandiose type). Lower in agreeableness and honesty-humility. Associated with overclaiming expertise, brief performance boost (early charisma) with later derailment, CEO selection bias.' },
    { code: 'Psyc', name: 'Psychopathy (subclinical)', desc: 'Callousness, impulsivity, low empathy, thrill-seeking, remorselessness. Subclinical form — distinct from Psychopathy Checklist Revised (PCL-R) clinical/forensic use. Primary psychopathy (interpersonal-affective) vs secondary (lifestyle-antisocial) distinction matters in research.', origin: 'Cleckley (1941), Levenson Self-Report Psychopathy Scale (1995).', instruments: 'Levenson Self-Report Psychopathy (LSRP), SD3 Psychopathy subscale, Dirty Dozen Psyc subscale, Triarchic Psychopathy Measure (TriPM).', correlates: 'Lowest in agreeableness, lowest in honesty-humility, lower in conscientiousness (especially secondary). Strongest Dark Triad predictor of workplace bullying, aggression, risk-taking. Short-term mating orientation.' }
  ];

  // Dark Tetrad (adds Sadism) — recognized in literature 2013+
  var DARK_TETRAD_NOTE = 'Dark TETRAD adds Everyday Sadism — deriving pleasure from others\' suffering. Short Sadistic Impulse Scale and Comprehensive Assessment of Sadistic Tendencies (CAST) operationalize. Dark Tetrad predicts online trolling behavior and aggressive video game preference better than Dark Triad alone (Buckels, Trapnell, & Paulhus 2014).';

  var DARK_TRIAD_KEY_POINTS = [
    { title: 'All three are inversely related to Honesty-Humility', body: 'HEXACO H correlates r ≈ -0.50 to -0.70 with each Dark Triad trait. Adding HEXACO H to a regression often absorbs most Dark Triad variance — suggesting the "dark" part of Dark Triad largely IS low H (Ashton & Lee 2008).' },
    { title: 'They are not interchangeable — each has unique variance', body: 'Machiavellianism is strategic and patient; psychopathy is impulsive and reactive; narcissism is grandiose and attention-seeking. Research that treats them as one construct ("dark personality score") loses this nuance.' },
    { title: 'They have short- vs long-term trade-offs', body: 'Dark traits can help in short-term outcomes (initial job interviews, first-impression leadership ratings, romantic attraction) but hurt long-term outcomes (relationship stability, reputation, team performance over time, career derailment). The Hogan Development Survey maps to many of these derailment patterns.' },
    { title: 'Subclinical ≠ clinical', body: 'Normal-range Dark Triad traits in general population are distinct from DSM personality disorders (NPD, ASPD) and forensic psychopathy (PCL-R). Don\'t pathologize colleagues; don\'t dismiss real clinical presentations as "just dark triad."' },
    { title: 'Prevalence in leadership', body: 'Subclinical narcissism is over-represented in CEOs and politicians, likely due to self-selection into competitive-visibility roles and initial charismatic appeal. Psychopathic traits also over-represented in executive samples (Babiak & Hare, "Snakes in Suits" 2006). This has real organizational-ethics implications.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1F: TWICE-EXCEPTIONAL (2E) IDENTIFICATION
  // ═══════════════════════════════════════════════════════════════
  var TWOE_PROFILES = [
    { label: 'Gifted + Specific Learning Disability', freq: 'Most common 2E profile', how: 'Student shows high cognitive ability (often Gf, Gc, or both) AND a specific processing weakness causing academic skill deficit — typically dyslexia (Ga phonological processing), dysgraphia (fine motor + expressive language), or dyscalculia (Gq + Gsm).', example: 'WISC-V VCI=130 (Superior) + FRI=128 + WMI=108 + PSI=85; WIAT-4 Word Reading=82, Spelling=78. Average FSIQ around 112 hides both the giftedness and the specific reading disability.' },
    { label: 'Gifted + ADHD', freq: 'Common', how: 'Strong fluid/verbal reasoning combined with executive function impairment. Classic profile: high Gf + Gc, low Gs + Gsm (working memory + processing speed drops). Classroom presentation: "smart but unorganized, brilliant but late."', example: 'Completes complex math in head but loses homework. Wins science fair but fails homework-dependent grading. Gets labeled "not trying" or "underachiever" when the issue is executive function.' },
    { label: 'Gifted + Autism Spectrum', freq: 'Under-identified', how: 'High ability in areas of intense interest ("high-ability autistic" profile), paired with social-communication differences and potential sensory sensitivities. Verbal ability may be extremely high while social reciprocity is impaired. Can co-occur with anxiety.', example: 'Reading at adult level in 1st grade on specific topics (dinosaurs, trains, programming); struggles with unstructured peer play; meltdowns from sensory overwhelm mistaken for behavior problems.' },
    { label: 'Gifted + Anxiety / OCD / Mood', freq: 'Common, especially adolescence', how: 'Internalizing disorders often suppress performance without showing up as "disability" on standardized tests. Perfectionism + anxiety particularly common in gifted students. Can cascade into school refusal, self-harm, or burnout.', example: 'Gifted middle schooler starts failing tests despite understanding material; obsessive rechecking homework to the point of not submitting it; withdrawal from extracurriculars; sleep disruption.' },
    { label: 'Gifted + Sensory / Motor / Chronic Health', freq: 'Under-recognized', how: 'Physical disability (CP, chronic pain, POTS, long COVID, etc.) coexists with high cognitive ability. School can focus on the physical/medical accommodation and miss the need for acceleration/enrichment.', example: 'Student with chronic illness gets homebound tutoring for 7th grade math while bored to tears — real need is advanced math with flexible attendance, not catch-up tutoring.' }
  ];

  var TWOE_ID_CHALLENGES = [
    { title: 'The masking problem (both directions)', body: 'High ability can MASK a disability — teacher says "she can\'t possibly have dyslexia, she\'s the smartest kid in class" (she may be decoding slowly and compensating with context). Conversely, disability can MASK high ability — teacher says "he can\'t be gifted, look at his handwriting" (the motor/writing piece is impaired while reasoning is superior).' },
    { title: 'Averaged composite scores hide scatter', body: 'A student with VCI=140 and PSI=75 gets an FSIQ around 110 (Average). Neither the giftedness (+40 above mean) nor the disability (-25 below mean) is visible in the summary score. This is why PSW and index-level interpretation matter so much for 2E.' },
    { title: 'Gifted programs use rigid cutoffs that screen out 2E', body: 'Many districts require FSIQ ≥ 130 for gifted identification. A 2E student with FSIQ = 118 due to a PSI dip may be denied gifted services despite VCI = 140. Research-based 2E identification uses index scores, extended norms for ceiling effects, and clinical judgment over single cut-offs.' },
    { title: 'Special ed services may not accommodate the gifted piece', body: 'Once a 2E student is identified with SLD or OHI, the IEP typically focuses on the disability. Without advocacy, the acceleration/enrichment piece can disappear. "He\'s in reading resource 30 min/day" doesn\'t address that he\'s reading at 10th grade level in content he cares about.' },
    { title: 'Gender and demographic bias in 2E identification', body: 'Girls, students of color, and students from low-income families are systematically under-identified as 2E. Stereotypes about what giftedness "looks like" (precocious white boys with big vocabularies) cause evaluators to miss 2E profiles in students whose strengths manifest differently.' },
    { title: 'Emotional toll is real', body: '2E students often describe feeling "broken" or "fraudulent" — acutely aware of being capable in some domains while failing in others, often without language to explain the discrepancy to themselves. Internalizing (depression, anxiety) and externalizing (behavior problems) secondary to this confusion is common.' }
  ];

  var TWOE_ASSESSMENT_STRATEGIES = [
    'Prioritize INDEX-LEVEL scores over FSIQ. Report VCI, FRI, VSI, WMI, PSI separately with their individual CIs.',
    'Check for significant scatter across indexes — differences of 1.5 SD (23 points) between highest and lowest are clinically meaningful and may warrant 2E consideration.',
    'Use CHC cross-battery approach to cover Gf, Gc, Gv, Gsm, Ga, Glr fully — a single instrument may miss the specific processing deficit.',
    'Administer achievement across ALL 8 IDEA SLD areas, not just the area of referral concern — 2E students often have hidden weaknesses in areas adults don\'t expect.',
    'Consider extended norms (Flanagan, Kaufman) for students hitting test ceilings. A raw score at the ceiling is NOT the same as the upper bound of ability.',
    'Interview the student about their own experience of learning — 2E students can often articulate their profile ("reading feels like work but math feels like play").',
    'Document strengths EXPLICITLY in the eval report, not just weaknesses. The IEP team needs to see both to plan properly.',
    'Include enrichment/acceleration recommendations in the IEP itself — not just accommodations for the disability. "Access to advanced math curriculum with flexible pacing" can be an IEP goal.',
    'Consider private gifted evaluation to supplement school eval if district scoring practices under-capture ability.',
    'Monitor social-emotional functioning throughout the process — the 2E identification process itself can be destabilizing for students who\'ve been confused about their own ability.'
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1G: FLYNN EFFECT
  // ═══════════════════════════════════════════════════════════════
  // Flynn effect: secular rise in mean IQ scores over 20th century — most
  // tests show ~3 points per decade increase when norms stay fixed.
  // Attenuation / "reverse Flynn" evidence from Scandinavia, UK, Norway,
  // Finland starting ~1990s-2000s.
  var FLYNN_NOTES = [
    { title: 'The observation', body: 'When the Wechsler and Stanford-Binet were re-standardized on fresh samples, average raw-score performance kept rising. A person scoring at the 1950 norm\'s 50th percentile would score substantially below 50th percentile on 1990 norms. James Flynn documented this across 14+ industrialized nations — the phenomenon now bears his name.' },
    { title: 'The magnitude', body: 'About 3 IQ points per decade on full-scale composites, with stronger gains on fluid reasoning and spatial tasks (Gf, Gv) than on crystallized knowledge (Gc). Across the 20th century, means rose roughly 30 points — nearly two standard deviations.' },
    { title: 'Why it happens (debated)', body: 'Leading candidate explanations: (1) nutrition and public health improvements raising developmental baselines; (2) shrinking family size → more per-child cognitive investment; (3) more schooling exposure + more abstract thinking demands in modern work; (4) greater familiarity with test-like formats (IQ items); (5) improved prenatal and early childhood conditions. No single cause explains the full pattern.' },
    { title: 'The renorming necessity', body: 'If tests aren\'t periodically re-standardized, scores inflate relative to current ability. The WISC-V (2014) norms are tighter than WISC-IV (2003) because Flynn gains accumulated. Clinicians comparing a WISC-IV score from 2010 to a WISC-V score in 2026 should apply a Flynn correction (or just re-test).' },
    { title: 'Why it matters for ID eligibility', body: 'A student scoring FSIQ = 72 on WISC-IV in 2010 might score lower on WISC-V — possibly below the 70 cutoff for intellectual disability eligibility. Flynn-correcting across editions is consequential for atypical-boundary cases, including death-penalty mitigation (Atkins v. Virginia follow-on litigation has repeatedly confronted Flynn correction).' },
    { title: 'Reverse Flynn? Attenuation?', body: 'Starting in the 1990s-2000s, Scandinavia, UK, Norway, Finland, France, and others show Flynn gains slowing, plateauing, or reversing. Meta-analyses (Pietschnig & Voracek 2015) suggest the gain rate is roughly halving. Causes equally debated — saturated nutrition, education plateau, different selection pressures, attentional/digital-culture effects. Watch this space.' },
    { title: 'The paradox for heritability estimates', body: 'IQ has ~50-80% heritability within a generation, yet mean IQ rose rapidly within 2-3 generations — faster than evolution could plausibly produce. This is Dickens & Flynn\'s multiplier hypothesis: small genetic differences trigger environmental amplification (e.g., a slightly more verbal child seeks out more language exposure, compounding over time). Means that "heritable" doesn\'t mean "fixed" — environment shapes population means dramatically over even a few decades.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1H: SCHWARTZ VALUES (PORTRAIT VALUES QUESTIONNAIRE STYLE)
  // ═══════════════════════════════════════════════════════════════
  // Items inspired by public-domain Schwartz PVQ and short form descriptions.
  // 30 items, 3 per value. Rating: 1=Not at all like me, 6=Very much like me.
  var SCHWARTZ_ITEMS = [
    // Self-Direction
    { t: 'It\'s important to me to think up new ideas and be creative; to do things my own way.', d: 'SD' },
    { t: 'It\'s important to me to make my own decisions about what I do.', d: 'SD' },
    { t: 'It\'s important to me to be independent and depend on myself.', d: 'SD' },
    // Stimulation
    { t: 'It\'s important to me to have an exciting life, with lots of new experiences.', d: 'ST' },
    { t: 'I look for adventures and like to take risks.', d: 'ST' },
    { t: 'I like surprises and seek out new things to do.', d: 'ST' },
    // Hedonism
    { t: 'Enjoying life\'s pleasures is important to me.', d: 'HE' },
    { t: 'Having a good time is important to me.', d: 'HE' },
    { t: 'I seek every chance I can to have fun.', d: 'HE' },
    // Achievement
    { t: 'It\'s important to me to show my abilities and be admired.', d: 'AC' },
    { t: 'Being very successful is important to me.', d: 'AC' },
    { t: 'I want people to recognize what I accomplish.', d: 'AC' },
    // Power
    { t: 'It\'s important to me to be in charge and tell others what to do.', d: 'PO' },
    { t: 'Being wealthy and having control over what happens matters to me.', d: 'PO' },
    { t: 'Having status and respect from others is important to me.', d: 'PO' },
    // Security
    { t: 'Living in secure, safe surroundings is important to me.', d: 'SE' },
    { t: 'The stability and order of society is important to me.', d: 'SE' },
    { t: 'I try to avoid anything that might endanger my safety.', d: 'SE' },
    // Conformity
    { t: 'I believe people should do what they\'re told and always follow rules.', d: 'CO' },
    { t: 'It\'s important to me to behave properly, avoiding things others would say are wrong.', d: 'CO' },
    { t: 'I avoid drawing attention to myself.', d: 'CO' },
    // Tradition
    { t: 'Tradition is important to me; I follow customs handed down by my family or religion.', d: 'TR' },
    { t: 'It\'s important to me to be humble and modest; not to draw attention.', d: 'TR' },
    { t: 'I think it\'s best to do things in traditional ways.', d: 'TR' },
    // Benevolence
    { t: 'It\'s important to me to help the people close to me and care for their well-being.', d: 'BE' },
    { t: 'I try to be loyal to my friends and family.', d: 'BE' },
    { t: 'Responding to the needs of others is important to me.', d: 'BE' },
    // Universalism
    { t: 'It\'s important to me that every person in the world be treated equally.', d: 'UN' },
    { t: 'It\'s important to me to protect the environment and care for nature.', d: 'UN' },
    { t: 'I want to understand different people and listen even when I disagree with them.', d: 'UN' }
  ];

  var SCHWARTZ_VALUES = {
    SD: { name: 'Self-Direction', desc: 'Independent thought and action — choosing, creating, exploring. Deriving satisfaction from autonomy and novelty of thought.', higherOrder: 'Openness to Change' },
    ST: { name: 'Stimulation', desc: 'Excitement, novelty, and challenge in life. Thrill-seeking, variety, adventure.', higherOrder: 'Openness to Change' },
    HE: { name: 'Hedonism', desc: 'Pleasure and sensuous gratification for oneself. Enjoyment of life; self-indulgence.', higherOrder: 'Openness to Change / Self-Enhancement (borderline)' },
    AC: { name: 'Achievement', desc: 'Personal success through demonstrating competence according to social standards. Ambition, influence, capability.', higherOrder: 'Self-Enhancement' },
    PO: { name: 'Power', desc: 'Social status, prestige, control or dominance over people and resources.', higherOrder: 'Self-Enhancement' },
    SE: { name: 'Security', desc: 'Safety, harmony, stability of society, relationships, and self.', higherOrder: 'Conservation' },
    CO: { name: 'Conformity', desc: 'Restraint of actions, inclinations, and impulses likely to upset or harm others or violate social expectations.', higherOrder: 'Conservation' },
    TR: { name: 'Tradition', desc: 'Respect, commitment, and acceptance of customs and ideas that one\'s culture or religion provides.', higherOrder: 'Conservation' },
    BE: { name: 'Benevolence', desc: 'Preservation and enhancement of the welfare of people with whom one is in frequent personal contact.', higherOrder: 'Self-Transcendence' },
    UN: { name: 'Universalism', desc: 'Understanding, appreciation, tolerance, and protection for the welfare of all people and nature.', higherOrder: 'Self-Transcendence' }
  };

  var SCHWARTZ_ORDER = ['SD', 'ST', 'HE', 'AC', 'PO', 'SE', 'CO', 'TR', 'BE', 'UN'];

  var SCHWARTZ_NOTES = {
    circumplex: 'Schwartz\'s 10 values arrange in a circumplex — adjacent values are compatible, opposite values conflict. The two higher-order dimensions: (1) Openness to Change vs. Conservation, (2) Self-Enhancement vs. Self-Transcendence.',
    evidence: 'The 10-value structure has replicated in 80+ countries and multiple languages — one of the most cross-culturally validated structures in personality/values research. The PVQ-21 and PVQ-40 are the most-cited short forms.',
    versus_interests: 'Values differ from interests: interests (RIASEC) predict what work you\'ll ENJOY; values predict what work you\'ll find MEANINGFUL. Someone high in Benevolence may tolerate low-satisfaction tasks to help others; someone high in Power may grind through boring work for status rewards. Both kinds of information matter for career fit.',
    versus_personality: 'Values correlate with personality but don\'t reduce to it. High Conscientiousness correlates with high Security/Conformity; high Openness with Self-Direction/Universalism. But values are more culturally transmissible, change more across life stages, and predict choices independent of trait level.'
  };

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1I: SOURCES & FURTHER READING
  // ═══════════════════════════════════════════════════════════════
  var SOURCES = {
    cognitive: [
      { cite: 'Schneider, W. J., & McGrew, K. S. (2018). The Cattell-Horn-Carroll theory of cognitive abilities. In D. P. Flanagan & E. M. McDonough (Eds.), Contemporary intellectual assessment: Theories, tests, and issues (4th ed., pp. 73-163). Guilford Press.', note: 'Current authoritative statement of CHC theory.' },
      { cite: 'Flanagan, D. P., Ortiz, S. O., & Alfonso, V. C. (2013). Essentials of cross-battery assessment (3rd ed.). Wiley.', note: 'Practical guide to combining batteries for comprehensive CHC coverage; essential for PSW-based SLD identification.' },
      { cite: 'Kaufman, A. S., Raiford, S. E., & Coalson, D. L. (2016). Intelligent testing with the WISC-V. Wiley.', note: 'Interpretation-focused (not just scoring) approach to the current Wechsler.' },
      { cite: 'Wechsler, D. (2014). Wechsler Intelligence Scale for Children, Fifth Edition (WISC-V) Technical and Interpretive Manual. Pearson.', note: 'Technical manual with reliability, validity, standardization data.' },
      { cite: 'Pietschnig, J., & Voracek, M. (2015). One century of global IQ gains: A formal meta-analysis of the Flynn effect. Perspectives on Psychological Science, 10(3), 282-306.', note: 'Definitive recent Flynn effect review including attenuation evidence.' }
    ],
    personality: [
      { cite: 'Goldberg, L. R. (1999). A broad-bandwidth, public-domain, personality inventory measuring the lower-level facets of several five-factor models. In I. Mervielde et al. (Eds.), Personality psychology in Europe, Vol. 7 (pp. 7-28). Tilburg University Press.', note: 'Foundational IPIP paper; inventory items used in the Big 5 mini-inventory in this tool are IPIP.' },
      { cite: 'John, O. P., Naumann, L. P., & Soto, C. J. (2008). Paradigm shift to the integrative Big Five trait taxonomy. In O. P. John et al. (Eds.), Handbook of personality (3rd ed., pp. 114-158). Guilford Press.', note: 'Accessible overview of the Big Five framework.' },
      { cite: 'Pittenger, D. J. (1993). The utility of the Myers-Briggs Type Indicator. Review of Educational Research, 63(4), 467-488.', note: 'Classic empirical critique of MBTI — the primary source for "50% get a different type on retest."' },
      { cite: 'Boyle, G. J. (1995). Myers-Briggs Type Indicator (MBTI): Some psychometric limitations. Australian Psychologist, 30(1), 71-74.', note: 'Psychometric problems with MBTI factor structure and reliability.' },
      { cite: 'Ashton, M. C., & Lee, K. (2007). Empirical, theoretical, and practical advantages of the HEXACO model of personality structure. Personality and Social Psychology Review, 11(2), 150-166.', note: 'The case for HEXACO over Big 5.' },
      { cite: 'Paulhus, D. L., & Williams, K. M. (2002). The dark triad of personality: Narcissism, Machiavellianism, and psychopathy. Journal of Research in Personality, 36(6), 556-563.', note: 'Original Dark Triad paper.' },
      { cite: 'Jones, D. N., & Paulhus, D. L. (2014). Introducing the Short Dark Triad (SD3). Assessment, 21(1), 28-41.', note: 'SD3 measurement development.' }
    ],
    career: [
      { cite: 'Holland, J. L. (1997). Making vocational choices: A theory of vocational personalities and work environments (3rd ed.). Psychological Assessment Resources.', note: 'Definitive statement of RIASEC theory.' },
      { cite: 'O*NET Resource Center. (n.d.). O*NET Interest Profiler. Retrieved from onetcenter.org/IP.html', note: 'Public-domain, government-validated interest inventory.' },
      { cite: 'Rounds, J., & Tracey, T. J. (1993). Prediger\'s dimensional representation of Holland\'s RIASEC circumplex. Journal of Applied Psychology, 78(6), 875-890.', note: 'Evidence for hexagonal structure of RIASEC.' },
      { cite: 'Schwartz, S. H. (2012). An overview of the Schwartz theory of basic values. Online Readings in Psychology and Culture, 2(1).', note: 'Open-access overview of Schwartz values theory with the 10-value circumplex.' }
    ],
    employer: [
      { cite: 'Schmidt, F. L., & Hunter, J. E. (1998). The validity and utility of selection methods in personnel psychology: Practical and theoretical implications of 85 years of research findings. Psychological Bulletin, 124(2), 262-274.', note: 'The meta-analysis that anchors the hiring-methods validity rankings in this tool.' },
      { cite: 'Barrick, M. R., & Mount, M. K. (1991). The Big Five personality dimensions and job performance: A meta-analysis. Personnel Psychology, 44(1), 1-26.', note: 'Classic meta-analysis showing Conscientiousness as the trait predictor of performance.' },
      { cite: 'Uniform Guidelines on Employee Selection Procedures, 29 C.F.R. § 1607 (1978).', note: 'EEOC regulations on selection validity and disparate impact.' },
      { cite: 'Karraker v. Rent-A-Center, Inc., 411 F.3d 831 (7th Cir. 2005).', note: 'Ruling that MMPI use in employment decisions constituted ADA "medical examination."' },
      { cite: 'Soroka v. Dayton Hudson Corp., 235 Cal. App. 3d 654 (1991).', note: 'California appellate ruling on personality test privacy violations.' },
      { cite: 'Illinois Artificial Intelligence Video Interview Act, 820 ILCS 42 (2020).', note: 'First-in-nation state law regulating AI-scored video interviews.' },
      { cite: 'New York City Local Law 144 of 2021, effective 2023.', note: 'Bias audit requirement for automated employment decision tools.' }
    ],
    schoolpsych: [
      { cite: 'Individuals with Disabilities Education Improvement Act, 20 U.S.C. § 1400 (2004).', note: 'Federal law defining IEP eligibility categories, procedural safeguards, FAPE.' },
      { cite: 'Section 504 of the Rehabilitation Act of 1973, 29 U.S.C. § 794.', note: '504 plan legal basis.' },
      { cite: 'Larry P. v. Riles, 793 F.2d 969 (9th Cir. 1984).', note: 'California federal ruling prohibiting IQ testing for Black students for EMR classification.' },
      { cite: 'Atkins v. Virginia, 536 U.S. 304 (2002).', note: 'Supreme Court ruling on intellectual disability as bar to execution — drove 20+ years of psychometric litigation on ID determination.' },
      { cite: 'National Association of School Psychologists (NASP). Professional Standards (2020).', note: 'Practice standards for school psychologists including assessment.' },
      { cite: 'American Psychological Association. Standards for Educational and Psychological Testing (2014).', note: 'The "Standards" — the authoritative document on test validity/reliability standards.' },
      { cite: 'Wright, P. W. D., & Wright, P. D. Wrightslaw: Special Education Law (2nd ed.). Harbor House Law Press.', note: 'Accessible legal reference; wrightslaw.com is the online companion.' }
    ],
    resources: [
      { cite: 'International Personality Item Pool (IPIP) — ipip.ori.org', note: 'Public-domain personality items used in research and training inventories including the Big 5 mini in this tool.' },
      { cite: 'HEXACO Personality Inventory — hexaco.org', note: 'Public-domain HEXACO scales and scoring keys.' },
      { cite: 'O*NET Online — onetonline.org', note: 'Free occupation database with interest profiles, work values, skills, education requirements.' },
      { cite: 'Council of Parent Attorneys and Advocates (COPAA) — copaa.org', note: 'Directory of special ed advocates and attorneys.' },
      { cite: 'National Association for Gifted Children (NAGC) — nagc.org', note: '2E position paper and resources for families and teachers.' },
      { cite: 'EEOC Guidance on Algorithmic Hiring Tools (May 2022) — eeoc.gov', note: 'Current federal guidance on automated decision tools in employment.' },
      { cite: 'U.S. Department of Education Office for Civil Rights (OCR) — ed.gov/ocr', note: 'Complaint filing and enforcement for disability discrimination in education.' },
      { cite: 'National Center on Intensive Intervention (NCII) — intensiveintervention.org', note: 'Evidence-based Tier 3 intervention resources for MTSS/RTI.' }
    ]
  };

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1J: AI & ALGORITHMS IN ASSESSMENT
  // ═══════════════════════════════════════════════════════════════
  var AI_ASSESSMENT_DOMAINS = [
    {
      id: 'video',
      name: 'AI-Scored Video Interviews',
      examples: 'HireVue, Pymetrics (game-based), Harver, Modern Hire, Sonru',
      what: 'Candidate records responses on own device. AI scores facial expression, voice tone, word choice, speech pace. Outputs ranking or pass/fail before human review.',
      concerns: 'Facial analysis bias against autistic candidates, candidates of color, candidates with facial differences. Voice analysis bias against non-native speakers, stutterers, deaf candidates. Algorithmic opacity — candidates often don\'t know why they were rejected.',
      strategy: 'Know when it\'s being used (ask recruiter). Technical: bright lighting, still background, look at camera. Content: repeat question, use full time, speak clearly. Request human review or alternative format if disability-based concern. See the "Beyond Personality: Hiring Methods" sub-view for full strategy.',
      legal: 'Illinois AI Video Interview Act 2020 (notice + consent + deletion); NYC Local Law 144 (2023) mandatory bias audits; Maryland HB 1202 facial recognition consent; EEOC May 2022 guidance on disparate impact.'
    },
    {
      id: 'ats',
      name: 'AI Resume / ATS Screening',
      examples: 'Workday, Greenhouse, Lever, Taleo, iCIMS — estimated 99% of Fortune 500 use some ATS, many with AI scoring',
      what: 'Applicant Tracking Systems parse resume, extract skills/experience, score against job description, rank candidates. Modern systems use AI (including LLMs) for semantic matching beyond keyword counting. Most widely used AI in hiring by volume.',
      concerns: 'Non-traditional career paths get penalized (career breaks, freelance, military transition). Word-choice bias (resumes of women use more qualifiers that some AIs penalize). Names can signal demographic info even when redacted elsewhere. Overfitting to incumbents — AIs trained on "successful hire" data reproduce existing demographic patterns.',
      strategy: 'ATS-friendly formatting: single column, standard headings (Experience, Education, Skills), no tables or graphics, submit .docx or text-layer PDF not image. Include job-description keywords naturally throughout (not stuffed). Action verbs + quantified results. DO NOT use invisible white text or keyword stuffing — modern AIs flag this. Tailor each application.',
      legal: 'Falls under the same Uniform Guidelines (1978) disparate impact framework as any selection tool, but enforcement is hard because employer claims of "we just rank, humans decide" muddy legal liability. EEOC 2022 guidance: employer remains liable for algorithmic tools\' disparate impact.'
    },
    {
      id: 'essays',
      name: 'AI Essay & Written-Response Grading',
      examples: 'GRE AWA (e-rater), some state K-12 accountability tests, AI admissions essay screeners (some colleges piloting), AI-graded take-home work-sample tests',
      what: 'NLP models score essays on rubric dimensions (organization, language use, evidence, development). Some are human-AI hybrid (AI flags, human confirms); others are AI-only.',
      concerns: 'Bias against non-native English speakers (e-rater has documented effects on Chinese and Arabic first-language writers). Rewards surface features (sentence length variety, vocabulary breadth) over substance — essays with compelling ideas in simpler prose score lower. Vulnerable to "gaming" via formulaic structures.',
      strategy: 'Know the rubric. Use varied sentence structures (not all short, not all complex). Use domain-relevant vocabulary but don\'t force it. Clear paragraph structure (claim, evidence, analysis). Don\'t write creatively — AI scorers like predictable, conventional writing.',
      legal: 'Testing companies publish technical reports (often not peer-reviewed) on AI scorer validity. Advocacy groups (like FairTest) have pushed for disclosure of bias audits.'
    },
    {
      id: 'proctor',
      name: 'AI Proctoring for Online Tests',
      examples: 'ProctorU, Honorlock, Respondus Monitor, Examity, ProctorTrack',
      what: 'Webcam + screen recording + AI monitoring for "suspicious behavior" during online exams: looking away from screen, covering mouth, eye movement patterns, background noise, other faces detected, keystroke anomalies. Flags reviewed by humans, or auto-reported to instructor.',
      concerns: 'Very high false-positive rate. Flags disabled students (stims, tics, motor-atypical movements), students with ADHD (gaze wandering), students with visible religious dress (hijab flagged as "obstruction"), students of color (face-detection failure in darker lighting), students in shared living spaces (background noise/faces). Multiple university lawsuits and student petitions. DOJ has opened inquiries.',
      strategy: 'Request exam accommodations in advance — quiet testing environment, disability-related movement accommodations, alternative format. Document any technical failures with screenshots. If flagged falsely, appeal promptly in writing. Some institutions now allow alternative assessment formats on request.',
      legal: 'ADA Title II/III disability discrimination claims possible. FERPA student record implications. State biometric privacy laws (Illinois BIPA, Texas, Washington) may apply.'
    },
    {
      id: 'gptscore',
      name: 'GPT / LLM Scoring & Report Generation',
      examples: 'Emerging: GPT-graded personality inventories, LLM-assisted psychoeducational report drafting, AI-scored psychological test responses',
      what: 'Large language models used to score open-ended responses, draft evaluation reports, or interpret test protocols. Not yet a mainstream clinical tool, but rapidly-spreading shadow practice in schools, universities, and clinical settings.',
      concerns: 'No peer-reviewed validation for LLM use in high-stakes clinical assessment. Hallucination risk in diagnostic interpretation. Privacy concerns (client data sent to third-party APIs). Deskilling of new clinicians who rely on AI drafting. No NASP/APA/AERA guidance yet on acceptable use.',
      strategy: 'For students: if your psych report is AI-assisted, ask your clinician whether the AI tool was validated, what data was transmitted, and whether human clinical judgment was primary. For clinicians: restrict AI to first-draft tasks on de-identified data; always review outputs; document your decisions rather than the AI\'s.',
      legal: 'HIPAA implications if PHI transmitted to third-party AI. FERPA implications for school evaluations. Professional licensing boards beginning to weigh in (APA Ethics Office exploring).'
    },
    {
      id: 'predict',
      name: 'Predictive Analytics in Admissions & Placement',
      examples: 'Student Success Alert systems (EAB Navigate, Civitas Learning), admissions AI tools, early-warning systems in K-12',
      what: 'Algorithms predict likelihood of academic success, dropout, need for intervention — based on past student data. Used for admissions decisions, advising outreach, placement into remedial tracks.',
      concerns: 'Predicts reproduce historical patterns — if past Black students were over-placed in remedial, model places new Black students there too. "Objective" algorithm outputs can launder discriminatory decisions. Mount Holyoke v. Princeton Review (class action) and several admissions AI cases highlight this.',
      strategy: 'For students and families: know what data the institution uses to make placement decisions. Ask for the specific basis of any placement. Institutions are required to provide information about the basis for decisions that affect educational opportunity.',
      legal: 'Title VI (race) and Title IX (sex) disparate impact applies. OCR investigating algorithmic admissions tools. EU AI Act classifies educational admission/scoring tools as "high risk" requiring transparency.'
    }
  ];

  var AI_ASSESSMENT_PRINCIPLES = [
    { title: 'Know when AI is being used', body: 'You have a right to know. Most automated systems require notice under emerging state laws. If you\'re unsure, ask: "Is any part of this assessment or screening automated or AI-assisted?"' },
    { title: 'Understand what it\'s measuring', body: 'AI claims vary from "measures personality" to "predicts fit" to "screens for keyword match." The vaguer the claim, the more skeptical you should be. "AI personality analysis" without a named underlying construct is typically junk.' },
    { title: 'Know your accommodation rights', body: 'ADA accommodations apply to AI-driven assessments just as they do to human-administered ones. If an AI tool\'s format disadvantages you due to a disability, you can request alternative format. Don\'t let the "computer" framing make you forget your rights are the same.' },
    { title: 'Document when things go wrong', body: 'If an AI tool flags you unfairly, produces a result inconsistent with human assessment of you, or fails in obvious ways — document it. Screenshots, timestamps, written description. This evidence supports appeals and, if needed, legal claims.' },
    { title: 'Ask for human review', body: 'Many AI-driven systems have human-review options buried in fine print. EU AI Act and some US state laws require accessible human review paths for high-stakes decisions. If the system doesn\'t offer one, ask explicitly.' },
    { title: 'Treat the tool as a signal about the organization', body: 'A university or employer\'s choice of AI tools tells you what tradeoffs they accept. An organization using a tool with known disability-access problems is signaling how they weigh efficiency vs fairness. You can let this inform your own decisions about the relationship.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1K: TEACHER / INSTRUCTOR MODE CONTENT
  // ═══════════════════════════════════════════════════════════════
  var COURSE_ALIGNMENT = [
    { course: 'Intro Psychology (PSY 101)', level: 'Undergraduate 100-level', modules: ['Personality (Big 5 vs MBTI)', 'Cognitive (Theories of Intelligence)', 'Junk Science Capstone'], objectives: 'Introduce students to the distinction between empirically validated and pop-psychology frameworks. Most undergrads enter psych believing MBTI is science; this tool corrects that efficiently.' },
    { course: 'Tests & Measurements / Psychometrics (PSY 400)', level: 'Undergraduate upper-division', modules: ['All of Personality', 'Validity & Reliability Primer', 'SEM/CI Simulator', 'Flynn Effect', 'Junk Science Capstone', 'Sources module'], objectives: 'Core psychometric content taught interactively rather than lecture-only. The SEM simulator replaces a textbook chapter; the Junk Science challenge tests application of everything.' },
    { course: 'Abnormal Psych / Personality Theory', level: 'Undergraduate upper-division', modules: ['Big 5', 'HEXACO', 'Dark Triad', 'Validity & Reliability Primer'], objectives: 'Distinguish trait models, teach where MBTI sits relative to validated frameworks, introduce Dark Triad without pathologizing.' },
    { course: 'Career Counseling / Vocational Psych', level: 'Undergraduate/Graduate', modules: ['All of Career', 'MBTI critique (from Personality)', 'Schwartz Values'], objectives: 'RIASEC foundation + critical literacy about clickbait quizzes + values-vs-interests-vs-personality distinction for comprehensive career exploration.' },
    { course: 'Industrial/Organizational Psychology (PSY 350+)', level: 'Undergraduate/Graduate', modules: ['All of Employer', 'Beyond-Personality Hiring Methods', 'AI & Algorithms in Assessment', 'Big 5 + HEXACO'], objectives: 'Selection validity meta-analysis, legal framework, emerging AI-driven selection, ethics of hiring assessments. The hiring-methods sub-view alone replaces several textbook chapters.' },
    { course: 'School Psychology (graduate, PSY 500-700)', level: 'Graduate', modules: ['ALL of School Psych module', 'PSW-based SLD ID', '2E Identification', 'Cognitive Theories', 'Real Batteries', 'SEM Simulator', 'Case Vignettes'], objectives: 'Primary professional training content. Especially valuable: the interactive SEM simulator for eligibility work, 2E identification patterns, and parent rights as training for team meetings.' },
    { course: 'Educational Psychology (EDU 300-400)', level: 'Undergraduate/Graduate', modules: ['RTI/MTSS', '504 vs IEP', 'SLD identification methods', '2E identification', 'Parent Rights', 'How to Read a Psych Report'], objectives: 'Preparing future teachers to participate meaningfully in eligibility meetings and advocate for disabled students in their classrooms.' },
    { course: 'Developmental Psychology', level: 'Undergraduate', modules: ['Flynn Effect', 'Cognitive Theories (CHC, Gardner)', '2E Identification'], objectives: 'Cross-generational cognitive change (Flynn), theories of cognition that undergird developmental tracking, atypical developmental profiles.' },
    { course: 'Neuropsychology / Biological Bases', level: 'Undergraduate/Graduate', modules: ['PASS theory', 'Luria\'s functional units', 'CHC broad abilities', 'Psychoed eval components', 'TBI eligibility'], objectives: 'Connecting brain systems to measurable cognitive functions; understanding how neuropsychological theory maps to standardized assessment.' },
    { course: 'Ethics in Psychology / Research Ethics', level: 'Graduate (or upper undergrad)', modules: ['Disability Justice & History (cognitive)', 'AI in Assessment', 'Employer Ethics (Soroka, Karraker)', 'Eugenics / Atkins history', 'Junk Science capstone'], objectives: 'Case-study-based ethics teaching. Each topic here maps to at least one ethical principle (beneficence, justice, integrity) with real legal and practical consequences.' }
  ];

  var LEARNING_OBJECTIVES = {
    cognitive: [
      'Describe the Cattell-Horn-Carroll (CHC) model and its 9+ broad cognitive abilities.',
      'Compare CHC to competing frameworks (PASS, Gardner\'s MI, Sternberg\'s triarchic).',
      'Select cognitive subtests appropriate to a given referral question using CHC as a theoretical guide.',
      'Identify strengths and weaknesses of major cognitive batteries (WISC-V, WJ-IV, KABC-II, DAS-II, SB-5, UNIT-2, RIAS-2).',
      'Analyze how historical cognitive testing has contributed to and perpetuated disability injustice, including eugenics, Larry P. v. Riles, and ongoing verbal/processing-speed loading concerns.',
      'Explain the Flynn effect and its implications for score interpretation across editions and eligibility determinations.'
    ],
    personality: [
      'Distinguish empirically validated personality frameworks (Big 5, HEXACO) from pseudoscientific typologies (MBTI, Enneagram, DISC) using criteria of reliability, factor structure, and predictive validity.',
      'Interpret Big 5 profiles and explain their research-supported correlates with life outcomes.',
      'Explain why the MBTI has poor test-retest reliability and why binarization of continuous traits destroys information.',
      'Describe the Dark Triad/Tetrad constructs and their relationship to HEXACO Honesty-Humility.',
      'Apply validity and reliability concepts (Cronbach\'s α, test-retest, convergent/discriminant, predictive) to evaluate any psychometric claim.',
      'Compare self-ratings to observer ratings on personality traits and explain what self-other divergence reveals about blind spots and context.'
    ],
    career: [
      'Describe the Holland RIASEC hexagonal model and its empirical support.',
      'Compare interest inventories, values inventories (Schwartz), and personality measures as complementary career-exploration tools.',
      'Identify the common flaws of "what career should you have?" clickbait quizzes.',
      'Interpret a 3-letter Holland code and use it to generate occupation hypotheses for further exploration.',
      'Distinguish between what interest inventories measure (satisfaction potential) and what they don\'t (ability, skill, feasibility).'
    ],
    employer: [
      'Rank-order common selection methods by meta-analytic validity (Schmidt & Hunter 1998 and updates).',
      'Analyze the legal and ethical dimensions of employer personality and cognitive testing (ADA, EEOC Uniform Guidelines, key case law).',
      'Identify the key dimensions measured by major commercial employer assessments (Hogan, PI, Caliper, DISC, Wonderlic, CCAT).',
      'Explain the concerns with AI-driven selection tools (video interviewing, ATS screening, algorithmic proctoring) for disabled and minoritized candidates.',
      'Apply ethical strategies for candidates facing employer assessment batteries.'
    ],
    schoolpsych: [
      'Describe the RTI/MTSS framework and explain its role as pre-referral intervention.',
      'Compare the three IDEA-permitted methods for SLD identification (severe discrepancy, RTI-based, PSW).',
      'Distinguish 504 plan eligibility from IEP eligibility with correct application of the three-prong IDEA test.',
      'Recognize the 13 IDEA eligibility categories and match typical evaluation batteries to each.',
      'Interpret confidence intervals around standard scores and apply SEM reasoning to eligibility borderline cases.',
      'Identify twice-exceptional (2E) profiles and design assessment strategies that surface both giftedness and disability.',
      'Summarize parent procedural safeguards under IDEA and identify steps to take when rights appear to be violated.'
    ]
  };

  var DISCUSSION_PROMPTS = [
    { topic: 'MBTI popularity vs validity', prompt: 'Why is the MBTI so commercially successful despite weak psychometric properties? Consider: who buys it, what needs it meets, and why honest trait descriptions might be less marketable. What does this tell us about the science-public interface in psychology?' },
    { topic: 'Interpreting an IQ score', prompt: 'A neighbor\'s child was evaluated and received a Full Scale IQ of 72. Before drawing any conclusion about intellectual disability, what additional information do you need? Walk through the three-prong IDEA ID eligibility test and the role of SEM/CI in this decision.' },
    { topic: 'Design an ethical hiring assessment', prompt: 'You\'ve been asked to design a pre-employment assessment for customer service representatives. What would you include? What would you avoid? Address validity, legal risk, and disparate impact. Use the hiring methods meta-analysis and the ethics case law from the tool.' },
    { topic: 'Culture-fair assessment', prompt: 'A 4th grade student from a Spanish-speaking home is referred for suspected SLD. They\'ve been in US schools 2 years. What considerations would shape your assessment battery? How does the distinction between language proficiency and underlying ability matter? Which specific tests might reduce cultural load?' },
    { topic: 'Flynn effect ethical implications', prompt: 'Post-Atkins v. Virginia, several death penalty cases have hinged on whether Flynn correction should be applied to old IQ scores used in eligibility determinations. Make the argument for and against. What role should psychometric science play in capital cases?' },
    { topic: 'The 2E gap', prompt: 'A gifted student with dyslexia gets average FSIQ scores. What happens in a district with FSIQ-cutoff gifted programs? What ethical obligations do school psychologists have here beyond strict eligibility math? Does gifted-program access matter as much as special-ed access? Discuss.' },
    { topic: 'AI in hiring', prompt: 'An employer uses AI video interview screening and rejects an autistic candidate whose facial expressions were flagged as "low engagement." What are the candidate\'s legal options? What are the employer\'s defenses? Apply ADA, EEOC 2022 guidance, and relevant state laws.' },
    { topic: 'Personality for hiring vs development', prompt: 'Big 5 is more valid than MBTI for almost every outcome. But many Fortune 500 companies use MBTI for team-building. Is this a defensible use? If so, what framing makes it acceptable? If not, why does it persist?' },
    { topic: 'Assessment report literacy for parents', prompt: 'Draft a 5-minute parent-friendly explanation of what "FSIQ 95 with 90% CI of 90-100" means. Avoid technical language. Check your draft: would a parent walk away knowing (a) what the number represents, (b) what uncertainty exists around it, (c) what it does and doesn\'t predict about their child?' },
    { topic: 'The pseudo-science tax', prompt: 'Society pays real costs when pseudoscientific assessments (DISC, MBTI, graphology, color-personality) are used for consequential decisions. Map three examples where weak-evidence assessments have led to documented harm. What\'s the distinctive role of psych-literate professionals in reducing this?' }
  ];

  var ACTIVITIES = [
    { name: 'Battery Design Challenge', setup: 'Divide class into 4-5 groups. Each group receives a different referral scenario (see Case Vignettes sub-view in School Psych).', runtime: '50-80 min (30 min design + 20-30 min presentation/critique)', task: 'Each group uses the Battery Builder to design an evaluation plan. Generate AI critique within the tool. Present to class: what did you include, what did you rule out, why. Class + instructor critique each plan.', debrief: 'Discuss patterns: what did every group include? What did only some groups include? What was the hardest call? How do you decide between near-equivalent tests for the same ability?' },
    { name: 'MBTI Binarization Demonstration', setup: 'Whole-class exercise. Students take Big 5 and note their scores.', runtime: '25-40 min', task: '(1) Each student takes the Big 5 mini-inventory and notes all 5 continuous scores. (2) Convert to MBTI 4-letter type using the tool. (3) Run the retest simulation with 10-point noise. (4) Share in pairs: how many of your letters flipped in the simulation? Which one? Why that one specifically (look at how close to 50 your continuous score was)?', debrief: 'Surface the point: binarization near the mean is where MBTI unreliability comes from. Tie to Pittenger 1993. Ask: what assessment contexts DEMAND category decisions? What contexts don\'t?' },
    { name: 'Junk Science Speed Round', setup: 'Whole class or groups of 3-4. The Junk Science module with 13 scenarios.', runtime: '30-45 min', task: 'Go through all 13 scenarios with discussion. Students debate their call before revealing the answer. Instructor facilitates discussion on disputed calls (usually the "suspect" tier generates most debate).', debrief: 'Which scenarios were universally flagged? Which were contested? What made the "suspect" cases harder than the clearly junk or clearly legit ones? What would you add to your personal red-flag checklist?' },
    { name: 'SEM / Confidence Interval Drill', setup: 'Pair exercise. Interactive SEM simulator in tool.', runtime: '25-40 min', task: 'Each pair receives a "case": e.g., "WISC-V FSIQ 71 with reliability 0.96, is this child eligible for ID services given SD 15?" Students use the simulator to compute the 95% CI and the probability that true score is below 70 vs above 70. Present to group. Reflect on how the ID/non-ID decision shifts with CI interpretation.', debrief: 'Most "eligibility cutoff" decisions assume the point estimate. SEM reasoning introduces explicit uncertainty. How should that change how professionals communicate with parents? Administrators? Courts?' },
    { name: 'Compare-the-Frameworks Jigsaw', setup: 'Groups of 5, each student takes one framework.', runtime: '45-60 min', task: 'Each student becomes the "expert" on one framework (Big 5, HEXACO, Dark Triad, MBTI, DISC). Spend 15 min reading that framework\'s content in the tool. Regroup and teach the others. Then jointly answer: given a specific outcome (job performance, counterproductive work behavior, relationship satisfaction, leadership derailment), which framework would you use? Why?', debrief: 'Surface tradeoffs: Big 5 has the normative data; HEXACO adds H; Dark Triad is specialized; MBTI/DISC have popularity but weak validity. No single winner — the answer depends on the research question.' },
    { name: 'Self vs Peer Big 5', setup: 'Homework assignment.', runtime: '1 week + 20 min in-class debrief', task: 'Students take the Big 5 self-inventory, then ask 2 people who know them well (ideally from different contexts — one work/school, one personal) to complete the peer-rated version. Students enter the peer ratings and bring the comparison to class.', debrief: 'Which traits showed the highest self-peer agreement? Which showed divergence? Where did the two peers agree with each other but disagree with you? What\'s the psychological meaning of those patterns?' },
    { name: 'Design a Junk Test', setup: 'Group activity (groups of 3-4).', runtime: '60-90 min', task: 'Groups intentionally design a BAD psychometric instrument — incorporate Barnum statements, arbitrary categorical cutoffs, impossible accuracy claims, appeals to authority, proprietary scoring. Present the bad test to the class "in character" (as a sales pitch). Class identifies the flaws.', debrief: 'Discuss: why did your group find this so easy to do? What does that say about the low bar for publishing a commercial personality test? Why is the "market" for pseudoscience so robust?' },
    { name: 'Read a Real Report', setup: 'In-class or homework.', runtime: '45-90 min', task: 'Provide a de-identified sample psychoeducational report (many are available in textbooks; Sattler has examples). Students work through the tool\'s "How to Read a Psych Report" sub-view while annotating the sample. Identify: referral question, observations, scores with CIs, interpretation-data link, eligibility logic, rec-findings alignment.', debrief: 'What did the report do well? What was missing? What would you want to ask the evaluator? This is prep for IEP meetings and for parents-as-advocates.' }
  ];

  var RUBRIC_ITEMS = [
    { area: 'Framework Identification', excellent: 'Correctly identifies all framework claims and places each on the evidence spectrum (empirically validated, moderate evidence, weak/pseudoscientific). Cites specific criteria: reliability, factor structure, predictive validity.', proficient: 'Correctly identifies most framework claims. Evidence classifications mostly accurate with minor errors.', developing: 'Identifies some frameworks but misses distinctions. Confuses popularity with validity.', beginning: 'Misses key frameworks or accepts commercial claims uncritically.' },
    { area: 'Psychometric Reasoning', excellent: 'Applies SEM, CI, reliability coefficient, and factor-analytic concepts accurately to novel cases. Correctly interprets score uncertainty.', proficient: 'Uses most psychometric concepts correctly. Occasional conflation (e.g., alpha vs test-retest).', developing: 'Recognizes concepts but struggles to apply them to cases. Overconfident about point estimates.', beginning: 'Treats test scores as exact values. No engagement with uncertainty.' },
    { area: 'Ethical & Legal Application', excellent: 'Correctly applies ADA, IDEA, Title VII/VI, EEOC guidelines to cases. Recognizes disparate impact even when not obvious. Proposes remediation.', proficient: 'Identifies major ethical/legal issues with minor gaps. Applies frameworks to straightforward cases.', developing: 'Recognizes ethics issues when flagged but misses subtle ones. Limited legal framework knowledge.', beginning: 'Treats ethics as "don\'t be mean." No working legal knowledge.' },
    { area: 'Disability Justice Lens', excellent: 'Consistently centers disability experience and systemic factors in analysis. Recognizes historical harms and ongoing inequities. Proposes structural responses.', proficient: 'Addresses disability as relevant to most cases. Historical context present but sometimes thin.', developing: 'Disability framed primarily as individual deficit. Limited systemic analysis.', beginning: 'Medical-model-only thinking. No engagement with justice dimensions.' },
    { area: 'Communication / Advocacy', excellent: 'Translates technical content into accessible language without oversimplifying. Anticipates parent/teacher/admin questions. Models how to advocate within real constraints.', proficient: 'Clear communication with occasional jargon. Most audiences would follow.', developing: 'Communication is technical or dismissive of non-specialist audiences.', beginning: 'Inaccessible jargon or condescending simplification.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1L: REFERRAL CASE VIGNETTES
  // ═══════════════════════════════════════════════════════════════
  var CASE_VIGNETTES = [
    {
      id: 'elem_sld',
      title: 'Elementary SLD — Reading Decoding',
      student: 'Malia, age 8, 3rd grade',
      referral: 'Parent and teacher both concerned about reading. Malia enjoys listening to books read aloud, can discuss content at or above grade level, and is a strong oral participant in class. But she struggles with reading independently — decodes slowly, substitutes visually similar words, avoids reading aloud. Spelling is especially weak. No developmental, medical, or behavioral concerns reported. Family history: maternal uncle had "reading problems."',
      tier2_3_response: 'Received Tier 2 phonics intervention (Heggerty Phonemic Awareness + Road to the Code) for 12 weeks with only minimal progress monitoring gains. Currently 40% below grade-level benchmark on DIBELS ORF.',
      likely_eligibility: 'SLD (basic reading skills)',
      key_domains: ['Cognitive Ability', 'Academic Achievement (all 8 IDEA SLD areas)', 'Reading / Phonological'],
      evidence_check: 'Must document: academic skill deficit (reading), cognitive processing weakness consistent with the deficit (likely Ga phonological processing), strengths in other cognitive areas, adverse educational impact, need for specialized instruction.'
    },
    {
      id: 'middle_adhd',
      title: 'Middle School ADHD / OHI Workup',
      student: 'Devon, age 12, 7th grade',
      referral: 'Declining grades across all classes in past year despite teachers reporting "very bright." Chronically unorganized — loses homework, forgets materials, can\'t find his locker. Starts projects late, submits incomplete work, but discusses content with apparent deep understanding. Parents report similar pattern at home: brilliant at novel problem-solving but can\'t follow multi-step routines. No behavioral concerns beyond disorganization. Pediatrician has mentioned ADHD as possibility but hasn\'t diagnosed.',
      tier2_3_response: 'Received Tier 2 study skills group for 6 weeks; inconsistent attendance and minimal engagement. No Tier 3 yet.',
      likely_eligibility: 'Other Health Impairment (OHI) for ADHD, or 504 Plan if impact is primarily organizational/environmental',
      key_domains: ['Cognitive Ability', 'Academic Achievement', 'Behavioral / Social-Emotional', 'Executive Function'],
      evidence_check: 'Must document: functional impairment across settings (school + home), persistence over time, presence of clinical-significance symptom cluster. ADHD diagnosis is medical; school can document educational impact under OHI. Consider if IEP (specialized instruction for EF supports) or 504 (accommodations only) is more appropriate.'
    },
    {
      id: 'preschool_asd',
      title: 'Preschool ASD Evaluation',
      student: 'Arjun, age 4, Pre-K',
      referral: 'Parents and early childhood teacher concerned. Minimal spontaneous speech (uses 10-12 words functionally), doesn\'t respond to name consistently, strong preference for routines (distressed by transitions), lines up objects rather than playing with them, unusual sensory responses (covers ears at noisy environments, seeks deep pressure). Eye contact is limited. Attended a developmental screening; clinic recommended full evaluation.',
      tier2_3_response: 'Too young for traditional RTI. Receives speech-language screening/services through Early Intervention (transitioning to school-based).',
      likely_eligibility: 'Autism',
      key_domains: ['Cognitive Ability', 'Adaptive Functioning', 'Autism-specific', 'Reading / Phonological (N/A — too young)'],
      evidence_check: 'Must document: impairment in social communication, restricted/repetitive behaviors or interests, symptoms present in early developmental period, functional impairment. ADOS-2 and ADI-R are the gold-standard combination. Rule out ID as primary (cognitive profile matters — autism can co-occur with ID but doesn\'t require it).'
    },
    {
      id: 'gifted_dyslexia_2e',
      title: 'Twice-Exceptional (Gifted + Suspected SLD)',
      student: 'Priya, age 11, 5th grade',
      referral: 'Identified as gifted in 3rd grade based on teacher nomination + Cognitive Abilities Test (CogAT) Verbal 99th percentile. Now failing English class. Writing assignments are brief, poorly spelled, illegible handwriting. Math and science performance remains excellent. Reading comprehension tests (when administered orally) are above grade level; when administered in written format, near grade level. Anxious around writing tasks, perfectionistic in other work, socially withdrawn recently.',
      tier2_3_response: 'None — no referral pathway for 2E currently in district. Gifted program hasn\'t flagged any concern because Priya "is still doing her gifted work."',
      likely_eligibility: 'SLD (written expression), possibly with anxiety as secondary concern',
      key_domains: ['Cognitive Ability (index-level, not just FSIQ)', 'Academic Achievement (all 8 IDEA SLD areas, especially writing)', 'Reading / Phonological', 'Behavioral / Social-Emotional'],
      evidence_check: 'Must document: academic deficit in writing/spelling despite overall strength; cognitive processing weakness (Ga phonological? Gs processing speed? Gsm working memory?) consistent with the deficit; strengths preserved in Gf, Gc. The 2E piece: IEP goals should address BOTH remediation AND enrichment maintenance. Anxiety referral consideration.'
    },
    {
      id: 'id_eligibility',
      title: 'Intellectual Disability Eligibility — Borderline Case',
      student: 'Jayden, age 14, 8th grade',
      referral: 'New to district this year. Previous school records incomplete. In current school 8 months. Teachers report slow academic pace, limited understanding of grade-level content, difficulty with multi-step tasks and abstract concepts. Parents report similar pattern at home: needs verbal prompting for self-care routines, limited independent problem-solving. Limited work history. No specific disability ever formally diagnosed. No behavioral concerns. Family is recently immigrated; parents speak some English; student speaks fluent English.',
      tier2_3_response: 'Received Tier 2 and Tier 3 reading/math intervention for the current 8 months with modest but unconvincing progress. Classroom teacher requesting formal referral.',
      likely_eligibility: 'Intellectual Disability (ID) OR specific learning disability — requires careful differential',
      key_domains: ['Cognitive Ability', 'Academic Achievement', 'Adaptive Functioning (parent AND teacher)', 'Behavioral / Social-Emotional'],
      evidence_check: 'Must document: FSIQ approximately 2 SD below mean (≤ 70, with CI consideration per SEM discussion); deficits in adaptive functioning (not just one domain); onset before age 18. Use culturally fair instruments (consider UNIT-2 or KABC-II MPI model). Adaptive ratings from BOTH home and school to triangulate. Rule out primary language-based explanation.'
    },
    {
      id: 'ell_sld',
      title: 'English Language Learner with Reading Concerns',
      student: 'Camila, age 10, 4th grade',
      referral: 'Spanish-dominant household. Started US schools in kindergarten. Currently in year 6 of schooling. Designated ELL, receives pull-out ELD services. Reading is at the 15th percentile on English benchmarks; similar in Spanish per parent-reported Spanish reading attempts at home. Math performance at grade level. Social skills and classroom behavior are strong. Family reports difficulty finding a Spanish-speaking reading specialist in the area.',
      tier2_3_response: 'Tier 2 reading intervention in English for 6 months; limited progress. Tier 3 not yet attempted — ELL status has complicated referral decisions.',
      likely_eligibility: 'Possible SLD — requires careful differential vs. language-based underperformance',
      key_domains: ['Cognitive Ability (nonverbal emphasis)', 'Academic Achievement (bilingual if possible)', 'Reading / Phonological (in both languages)', 'Behavioral / Social-Emotional'],
      evidence_check: 'Must document: difficulties are NOT primarily due to second-language acquisition; ideally assess in both languages to confirm reading deficit is present regardless of language. Cultural/linguistic competent evaluation required. UNIT-2 reduces verbal confound for cognitive measurement. Phonological assessment in both languages. If SLD is confirmed, intervention should ideally include the home language.'
    }
  ];

  var CASE_DOMAIN_OPTIONS = [
    { id: 'cog', name: 'Cognitive Ability (WISC-V / WJ-IV COG / KABC-II / UNIT-2)' },
    { id: 'ach', name: 'Academic Achievement (WIAT-4 / WJ-IV ACH / KTEA-3)' },
    { id: 'beh', name: 'Behavioral / Social-Emotional (BASC-3 / CBCL / Conners-4)' },
    { id: 'ad', name: 'Adaptive Functioning (Vineland-3 / ABAS-3)' },
    { id: 'ef', name: 'Executive Function (BRIEF-2 / D-KEFS)' },
    { id: 'read', name: 'Reading / Phonological (CTOPP-2 / GORT-5 / FAR)' },
    { id: 'aut', name: 'Autism-specific (ADOS-2 / ADI-R / SRS-2)' },
    { id: 'tra', name: 'Trauma / Mental Health (TSCC / UCLA PTSD)' }
  ];

  function buildCaseCritiquePrompt(caseId, domains) {
    var caseObj = CASE_VIGNETTES.find(function(c) { return c.id === caseId; });
    if (!caseObj) return '';
    var domainLabels = domains.map(function(d) {
      var opt = CASE_DOMAIN_OPTIONS.find(function(o) { return o.id === d; });
      return opt ? opt.name : d;
    });
    return 'You are a psychoeducational assessment instructor reviewing a graduate student\'s evaluation plan for a referral case.\n\n' +
      'CASE: ' + caseObj.title + '\n' +
      'Student: ' + caseObj.student + '\n' +
      'Referral: ' + caseObj.referral + '\n' +
      'Prior intervention response: ' + caseObj.tier2_3_response + '\n\n' +
      'STUDENT\'S PROPOSED ASSESSMENT PLAN — domains to assess:\n' +
      (domainLabels.length ? domainLabels.map(function(l) { return '- ' + l; }).join('\n') : '(No domains selected.)') + '\n\n' +
      'In 5-7 bullet points (plain text, "• " prefix, ~250-350 words total), provide feedback on this assessment plan:\n' +
      '1. Are the included domains well-matched to the referral question?\n' +
      '2. Are any critical domains missing for this specific case? Name them and explain why they matter here.\n' +
      '3. Are any domains unnecessary or over-included?\n' +
      '4. Given this student\'s profile, are there specific instruments within the chosen domains you would prioritize (e.g., UNIT-2 instead of WISC-V for a low-verbal case)?\n' +
      '5. What eligibility category/categories should the evaluator be prepared to address, and what evidence will be needed for each?\n' +
      '6. Any cultural, linguistic, developmental, or disability-access considerations that should shape administration?\n' +
      '7. One concrete "next step" the evaluator should plan for after the initial eval results.\n\n' +
      'Be specific and pedagogical. Don\'t just validate — push the student toward stronger clinical reasoning. If the plan has significant gaps, say so directly.';
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1M: FUNCTIONAL BEHAVIOR ASSESSMENT (FBA) + BIP
  // ═══════════════════════════════════════════════════════════════
  var FBA_STEPS = [
    { step: 1, name: 'Operationally define the target behavior', body: 'Describe the behavior in observable, measurable terms. NOT: "disrespectful, oppositional." YES: "yells at teacher when redirected, closes laptop, leaves seat." Specificity is foundational. Anyone observing the same event should agree whether the behavior occurred.' },
    { step: 2, name: 'Gather indirect data', body: 'Interview teachers, parents, the student when possible. Review records (attendance, discipline, prior evals, medical). Functional Assessment Interview (FAI), Behavior Rating Inventory (BASC-3 BESS, Conners-4), QABF, MAS.' },
    { step: 3, name: 'Collect direct observation data (ABC)', body: 'Antecedent-Behavior-Consequence recording across multiple settings/times. Minimum: 3-5 observations spanning different contexts. Record: what happened just before, the behavior itself, what happened immediately after. Also track frequency, duration, intensity.' },
    { step: 4, name: 'Identify the FUNCTION', body: 'Based on ABC patterns, hypothesize the function. Four basic functions: (1) ATTENTION (peer or adult), (2) ESCAPE/AVOIDANCE (of task, social demand, sensory input), (3) ACCESS TO TANGIBLE (item, activity, preferred event), (4) SENSORY/AUTOMATIC (internal reinforcement, self-regulation). Behaviors can serve multiple functions across contexts.' },
    { step: 5, name: 'Test the hypothesis (informally or experimentally)', body: 'Modify antecedents or consequences to confirm the function. If you hypothesize "escape from writing tasks," offer breaks during writing and observe if target behavior decreases. Systematic functional analysis (Iwata-style) is more rigorous but rarely available in schools.' },
    { step: 6, name: 'Develop a function-based Behavior Intervention Plan (BIP)', body: 'The BIP should address the same function the behavior serves but with a replacement behavior. If behavior function = escape, teach request-a-break. If function = attention, teach hand-raise or specific social-skill replacement. Also: change antecedents (reduce trigger exposure), teach skills (FERB — Functionally Equivalent Replacement Behavior), change consequences (reinforce FERB, minimize reinforcement of problem behavior).' }
  ];

  var FBA_FUNCTIONS = [
    { name: 'Attention', desc: 'Problem behavior produces attention from adults or peers (positive or negative). Example: student calls out, teacher reprimands, peers laugh. Replacement: teach hand-raise, break card, attention-request signal.', clue: 'Happens most in the presence of specific people; stops when ignored; increases after adults pay attention during the behavior.' },
    { name: 'Escape / Avoidance', desc: 'Problem behavior removes or delays a demand, task, social interaction, or sensory input. Example: student yells, teacher sends them to the office, they skip the assignment. Replacement: break-request card, task-choice menu, scaffolded task to reduce demand intensity.', clue: 'Happens reliably before or during specific tasks; the student is REMOVED from the activity as a consequence; escalates when demands increase.' },
    { name: 'Access to Tangibles', desc: 'Problem behavior results in access to a preferred item or activity. Example: student throws tantrum, gets tablet to calm down. Replacement: request-item signal, first-then schedule, scheduled preferred-item access.', clue: 'Happens when preferred item/activity is visible but unavailable; stops when the student gets the item.' },
    { name: 'Sensory / Automatic', desc: 'Behavior is self-reinforcing through sensory feedback regardless of social consequences. Example: repetitive motor movements, hand-flapping, vocalizations. Replacement: sensory-appropriate alternatives, scheduled sensory input, environmental modifications.', clue: 'Happens consistently regardless of social context; continues when alone; doesn\'t appear sensitive to attention or demand manipulations.' }
  ];

  var BIP_COMPONENTS = [
    { name: 'Operational definition', body: 'Target behavior defined in observable, measurable terms (copied/refined from FBA).' },
    { name: 'Function statement', body: 'Hypothesized function(s) of the behavior based on FBA findings.' },
    { name: 'Antecedent strategies', body: 'Environmental or instructional modifications to prevent the behavior from occurring: reduce trigger exposure, pre-correction, visual schedules, reduced task length, preferred seating, task scaffolding, sensory accommodations.' },
    { name: 'Teaching / skill instruction', body: 'Explicit instruction of Functionally Equivalent Replacement Behaviors (FERBs) plus broader skill deficits (self-regulation, social skills, academic skills tied to escape-motivated behavior).' },
    { name: 'Consequence strategies', body: 'Reinforce FERB and appropriate behavior at higher rate than problem behavior. Strategically minimize reinforcement of problem behavior (extinction, differential reinforcement). Crisis plan for severe episodes.' },
    { name: 'Data collection plan', body: 'What will be measured (frequency, duration, intensity, FERB use), by whom, how often, how data will be reviewed. Should allow team to evaluate plan effectiveness in 4-6 weeks.' },
    { name: 'Responsible parties', body: 'Who implements each element? Who trains staff on procedures? Who collects data? Who monitors fidelity? Who is the team lead?' },
    { name: 'Review / revision schedule', body: 'Plans are revisited on a schedule (typically 4-6 weeks initially, then quarterly). Revision based on data, not opinion.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1N: IEP GOAL WRITING
  // ═══════════════════════════════════════════════════════════════
  var SMART_CRITERIA = [
    { letter: 'S', word: 'Specific', body: 'Target a specific skill, not a vague outcome. NOT: "improve reading." YES: "read grade-level passages aloud."' },
    { letter: 'M', word: 'Measurable', body: 'Named, countable criterion. "80% accuracy," "60 words correct per minute," "3 out of 4 trials."' },
    { letter: 'A', word: 'Achievable / Ambitious', body: 'Stretches the student beyond present levels but is realistically attainable within the IEP year. Based on present-level data + reasonable growth trajectory.' },
    { letter: 'R', word: 'Relevant', body: 'Connected to the student\'s actual disability-related need and to curriculum access or functional outcomes. Not busywork.' },
    { letter: 'T', word: 'Time-bound', body: 'Includes the IEP year timeline ("by annual review date") and often interim benchmarks.' }
  ];

  var GOAL_STRUCTURE = [
    { part: 'GIVEN (conditions)', desc: 'Under what conditions will the student perform? What\'s provided, what\'s withheld, what setting?', example: '"Given a grade-level informational passage and a graphic organizer..."' },
    { part: 'STUDENT', desc: 'Named student or "the student"', example: '"...Priya..."' },
    { part: 'BEHAVIOR (target skill)', desc: 'What will the student do? Observable, measurable verb.', example: '"...will identify the main idea and 2 supporting details..."' },
    { part: 'CRITERION', desc: 'What performance level demonstrates mastery?', example: '"...with 80% accuracy..."' },
    { part: 'MEASUREMENT', desc: 'How/when will it be measured?', example: '"...across 4 of 5 consecutive weekly probes..."' },
    { part: 'TIMELINE', desc: 'When will this goal be achieved?', example: '"...by the end of the IEP year."' }
  ];

  var SAMPLE_GOALS = [
    { domain: 'Reading Fluency', goal: 'Given an end-of-2nd-grade level passage, Malia will read aloud at 60 words correct per minute with 90% accuracy on 4 of 5 consecutive weekly DIBELS ORF probes by the end of the IEP year.', notes: 'Present-level data: 28 wcpm, 65% accuracy. 60 wcpm is DIBELS 2nd-grade winter benchmark. Ambitious but documented-achievable with Tier 3 systematic phonics instruction.' },
    { domain: 'Written Expression', goal: 'Given a graphic organizer and a grade-level writing prompt, Priya will produce a five-paragraph essay with a clear thesis, 3 supporting body paragraphs (topic sentence + 2 pieces of evidence each), and a conclusion, scoring at least 16/20 on the district rubric across 3 of 4 monthly writing samples by the end of the IEP year.', notes: 'Present-level: 9/20 on baseline rubric. Goal structures output with organizer and specific structural elements — makes growth trackable.' },
    { domain: 'Behavior / Self-Regulation', goal: 'When presented with a non-preferred task, Devon will use a break-request card (replacement behavior) rather than leaving the classroom or disrupting peers, in 80% of observed opportunities across 4 of 5 consecutive weeks, as measured by teacher-recorded ABC data.', notes: 'Function-based: escape from tasks. FERB = break request. Ties directly to BIP.' },
    { domain: 'Social Communication', goal: 'In a structured peer interaction of 5-10 minutes, Arjun will initiate a topic-relevant comment or question to a peer at least 3 times per session, across 4 of 5 consecutive weekly speech-language sessions, by the end of the IEP year.', notes: 'Autism IEP — initiation skill is a high-value target. Specific count (3+) and setting (structured 5-10 min peer interaction) makes it measurable.' },
    { domain: 'Executive Function', goal: 'Given a multi-step homework assignment and a daily planner, Devon will record the assignment, materials needed, and due date within 3 minutes of the assignment being given, in 80% of observed opportunities across a 2-week monitoring period, by the end of the IEP year.', notes: 'EF goal written concretely — the behavior (recording assignment) is observable, not "be more organized."' },
    { domain: 'Adaptive — Daily Living', goal: 'Without adult prompting, Jayden will independently complete a 4-step morning hygiene routine (brush teeth, wash face, comb hair, put on deodorant) as evidenced by parent checklist across 4 of 5 consecutive weeks, by the end of the IEP year.', notes: 'Adaptive goal — functional, parent-monitorable, named specific steps.' },
    { domain: 'Transition (age 16+)', goal: 'By the end of 11th grade, [Student] will complete a vocational interest inventory with guidance counselor, identify 3 career options matching their top interest codes, and research entry requirements (education, training, licensing) for each of the 3, as evidenced by a completed career exploration portfolio.', notes: 'Postsecondary goal. Concrete product (portfolio) + specific sub-activities + realistic timeline.' }
  ];

  var GOAL_PITFALLS = [
    { pitfall: 'Unmeasurable verb', bad: 'will improve his attention', better: 'will remain on-task during independent work, defined as eyes on materials and hands on-task, for at least 15 consecutive minutes in 4 of 5 observed sessions' },
    { pitfall: 'Missing criterion', bad: 'will read grade-level passages fluently', better: 'will read grade-level passages at 90+ wcpm with 95% accuracy on 4 of 5 consecutive weekly probes' },
    { pitfall: 'No baseline', bad: 'will grow in math computation', better: 'Given a 2-digit addition worksheet (present-level: 5/10 correct), will solve 9/10 correct on 3 consecutive probes' },
    { pitfall: 'Vague conditions', bad: 'will comply with teacher directions', better: 'When given a 1-step verbal direction by a classroom teacher, will comply within 10 seconds on 80% of opportunities across 2 weeks' },
    { pitfall: 'Disability-unrelated "character" goal', bad: 'will show respect to teachers', better: '(Respect is not an IEP goal. Reframe to measurable behavior: compliance with directions, use of social-skill script, zero observed verbal refusals.)' },
    { pitfall: 'Too easy / too hard', bad: 'Target 60 wcpm when baseline is 57 wcpm (trivial gain) OR target 120 wcpm when baseline is 30 wcpm (unrealistic)', better: 'Calibrate to research-based expected growth rates. DIBELS/AIMSweb have published rate-of-improvement norms. Aim for ambitious but realistic.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1O: ASSESSMENT REPORT WRITING
  // ═══════════════════════════════════════════════════════════════
  var REPORT_WRITING_PRINCIPLES = [
    { title: 'Write for the parent first', body: 'Reports are legal documents, yes. But they are primarily communication with families. Write sections parents will actually read (summary, eligibility statement, recommendations) in jargon-light language. Save technical density for procedural sections.' },
    { title: 'Data before interpretation', body: 'Report the test scores in a clean table. Then narrate what they mean. Readers should see the evidence before your synthesis. No conclusion should appear without its data basis present on the same page.' },
    { title: 'Integrate across sources', body: 'A report that says "cognitive findings...then achievement findings...then behavior findings..." with no synthesis is a data dump, not an evaluation. The "Integration" section weaves findings: "Malia\'s strong VCI combined with weak phonological processing and achievement deficit in word reading is consistent with the SLD (dyslexia) profile..."' },
    { title: 'Name the referral question in the summary', body: 'Close the loop. If the referral asked "does X have SLD?", the summary must answer that question directly — even if the answer is "insufficient evidence at this time." Parents and teams need the bottom line they asked for.' },
    { title: 'Confidence intervals EVERY time', body: 'Report the 95% CI alongside every standard score. Pair scores with percentile ranks AND classification bands. A report that says "FSIQ 105" without "95% CI 100-110 (63rd percentile, Average range)" is psychometrically incomplete.' },
    { title: 'Recommendations specific, actionable, and feasible', body: 'NOT: "consider differentiated instruction." YES: "Use evidence-based systematic phonics program (Wilson, Orton-Gillingham, or similar) 30 min/day, 5 days/week, delivered by trained staff, with weekly progress monitoring using DIBELS ORF." Name the approach, intensity, and measurement.' },
    { title: 'Separate diagnosis from eligibility', body: 'Medical/clinical diagnosis (DSM-5 ADHD, SLD-dyslexia) is different from educational eligibility (OHI, SLD). A report should distinguish. "The student meets IDEA SLD criteria..." vs. "Clinical diagnosis of dyslexia would be appropriate given the profile but requires medical/clinical evaluator."' },
    { title: 'Own your limitations', body: 'Did the student have a bad day? Incomplete testing? Language considerations? Missing records? Note these limits in observations or the integration section. Don\'t pretend certainty you don\'t have.' },
    { title: 'Avoid "normal" as a category label', body: 'Students whose scores fall in the average range are... average. Not "normal." Calling average-range scores "normal" subtly pathologizes students with scores outside average, and frames the eval around illness/deficit rather than neurodiversity of ability.' },
    { title: 'Write like you expect the report to be read in front of the student', body: 'One day, the student will read their own eval. Would you be proud of how you described them? Or would you wish you\'d been kinder? This rule alone improves report quality across the board.' }
  ];

  var REPORT_INTEGRATION_PATTERNS = [
    { name: 'Strengths-first framing', body: 'Start the integration section with strengths. "Malia demonstrates strong verbal comprehension (VCI 118, 88th percentile), well-developed fluid reasoning (FRI 112), and age-appropriate working memory (WMI 105). Against this backdrop of broadly strong cognitive functioning..." THEN introduce weaknesses as deviations from her own pattern, not her core identity.' },
    { name: 'Converging evidence', body: '"Malia\'s difficulties in reading are supported by multiple converging sources: (a) below-average phonological awareness on CTOPP-2 (SS 78), (b) below-average word reading efficiency on TOWRE-2 (SS 80), (c) significant discrepancy from her VCI (118 - 80 = 38-point gap), (d) parent-reported reading avoidance, (e) classroom teacher\'s report that Malia relies on oral discussion to demonstrate comprehension."' },
    { name: 'Rule-out framing', body: '"Alternative explanations for Malia\'s reading difficulties were considered. ESL/language-learning delay is ruled out: Malia is a native English speaker from an English-speaking home with age-appropriate oral language. Vision/hearing screenings were completed in January 2026 and within normal limits. Attendance is strong. Cognitive-intellectual disability is ruled out by broadly average-to-superior cognitive functioning."' },
    { name: 'SLD-specific profile justification', body: '"The profile — average-to-superior general cognitive functioning with specific weakness in phonological processing resulting in below-average basic reading skills — is consistent with Specific Learning Disability in basic reading skills (dyslexia profile). This pattern satisfies the PSW method: academic weakness in basic reading, cognitive processing weakness (Ga phonological processing) consistent with the academic weakness per empirical research, and strengths preserved in other cognitive domains."' },
    { name: 'Decision-tree eligibility statement', body: '"Based on this evaluation: (1) Malia meets the SLD category definition (reading deficit with cognitive processing weakness and preserved cognitive strengths); (2) adverse educational impact is documented by below-benchmark reading probes, teacher-reported classroom struggles, and inability to access grade-level text independently; (3) specialized instruction is needed: Tier 2 and classroom differentiation have not produced adequate response, indicating need for structured, systematic, individualized reading intervention. Accordingly, the team recommends eligibility under IDEA as SLD."' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1P: FORMATIVE / ALTERNATIVE ASSESSMENT
  // ═══════════════════════════════════════════════════════════════
  var FORMATIVE_METHODS = [
    { name: 'Curriculum-Based Measurement (CBM)', type: 'Progress monitoring', desc: 'Brief, repeatable, standardized probes (DIBELS, AIMSweb, easyCBM) administered weekly/biweekly to track skill growth over time. Sensitive to intervention effects within 4-8 weeks. Core of RTI/MTSS data collection.', strengths: 'Fast, low-cost, sensitive to growth, extensively researched, norm-referenced benchmarks.', weaknesses: 'Focuses on narrow skills (ORF, maze, math facts); may miss comprehension, transfer, application; teacher-administered so fidelity varies.' },
    { name: 'Portfolio Assessment', type: 'Authentic performance assessment', desc: 'Collection of student work across time — drafts, revisions, final products, student reflections. Used to evidence skill growth, process, and depth over time rather than single-moment performance.', strengths: 'Authentic, shows process not just product, supports student self-reflection, accommodating of diverse learners.', weaknesses: 'Labor-intensive to develop rubrics and score reliably; less standardized; limited utility for eligibility decisions.' },
    { name: 'Project-Based / Performance Assessment', type: 'Authentic application', desc: 'Students demonstrate skills by completing a complex, meaningful task: design an experiment, build a model, write an argumentative essay, perform a presentation. Rubric-scored across multiple dimensions.', strengths: 'Measures application and transfer, not just recall; engaging for students; aligns with real-world use of skills.', weaknesses: 'Time-intensive; rater reliability requires training; may disadvantage students with test-taking-unrelated challenges (anxiety, motor issues).' },
    { name: 'Dynamic Assessment', type: 'Learning-potential measurement', desc: 'Feuerstein\'s approach: test → teach/mediate → retest. Measures not just current performance but RESPONSIVENESS to instruction (learning potential). Particularly valuable for ELLs, students from atypical backgrounds, and students whose static performance underestimates ability.', strengths: 'Captures what standardized testing misses (teachability, learning process); culturally fairer; directly informs intervention.', weaknesses: 'Time-consuming; less normed; requires specialized training; not always accepted for eligibility.' },
    { name: 'HOWLs / Habits of Work and Learning (EL Education model)', type: 'Formative character/habits assessment', desc: 'Used in EL Education (Expeditionary Learning) schools and some districts. Rubric-based assessment of Habits of Work (responsibility, preparation, engagement) and Habits of Learning (revision, self-reflection, contribution, perseverance). Student + teacher complete periodically.', strengths: 'Measures what matters beyond academics: executive function, social-emotional learning, contribution. Self-assessment builds metacognition. Crew-based model makes it low-stakes and developmental.', weaknesses: 'Not a substitute for content-skill measurement; rubric rigor varies by school; may be seen as "soft" by external evaluators.' },
    { name: 'Standards-Based Grading', type: 'Criterion-referenced summative', desc: 'Students graded against mastery of named standards rather than averaged across weighted tasks. Each standard reported separately (e.g., "Explain evidence from text: Proficient; Determine main idea: Developing"). Multiple opportunities to demonstrate mastery.', strengths: 'Transparent; standards-focused; encourages mastery and revision; accommodates learning-over-time rather than single-shot performance.', weaknesses: 'Transition from traditional grading creates confusion; time-intensive; requires clear standards with observable performance descriptors.' },
    { name: 'Self-Assessment / Peer Assessment', type: 'Metacognitive development', desc: 'Students evaluate their own or peers\' work against rubrics. Builds judgment and ownership. Used in student-led conferences, revision cycles, peer review of writing, group project scoring.', strengths: 'Builds metacognitive skills, student agency, shared responsibility, time-efficient for teacher, aligns with self-determination theory.', weaknesses: 'Requires explicit teaching of rubric interpretation; risk of social dynamics affecting peer ratings; students need practice before reliability is useful.' }
  ];

  var FORMATIVE_PRINCIPLES = [
    { title: 'Formative ≠ summative', body: 'Formative assessment informs WHAT COMES NEXT in instruction. Summative measures mastery at an endpoint. Both are valuable. Both require rigor. Confusing them weakens both.' },
    { title: 'Standardized testing has a role', body: 'Do not read "alternative assessment" as "no standardized assessment." For eligibility decisions, diagnosis, and inter-district comparability, standardized measurement is irreplaceable. The point is that these tools should complement, not dominate.' },
    { title: 'Disability-friendly formative structures', body: 'Formative and performance assessment often serves disabled students better than timed-standardized formats. Portfolio, dynamic assessment, and project-based assessment reduce the processing-speed-and-test-anxiety confound that plagues standardized measurement.' },
    { title: 'What gets measured gets privileged', body: 'Schools and districts signal values through what they measure. A school that measures only standardized test scores optimizes for those. A school that also measures Crew habits, revision cycles, and authentic performance sends a broader signal about what learning means.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1Q: TRAUMA-INFORMED ASSESSMENT
  // ═══════════════════════════════════════════════════════════════
  var TRAUMA_PRESENTATIONS = [
    { age: 'Early childhood (0-5)', signs: 'Regression (loss of language, toileting, attachment behaviors), sleep disruption, new separation distress, somatic complaints without medical cause, repetitive play re-enacting the event, startle responses, loss of joy in previously-enjoyed activities.' },
    { age: 'Elementary (6-10)', signs: 'Somatic complaints (headaches, stomachaches), school avoidance, concentration and memory difficulties (often misattributed to ADHD), withdrawal OR behavioral outbursts, fear of being alone, regression, new learning struggles, difficulty trusting adults.' },
    { age: 'Middle school (11-13)', signs: 'Mood swings, irritability, aggression toward peers or adults, risk-taking onset, academic decline, withdrawal from friends/family, somatic complaints, substance use experimentation, self-harm behaviors, online-seeking behaviors.' },
    { age: 'High school (14-18)', signs: 'Depression, anxiety, dissociation, substance use, risky sexual behavior, suicidality, academic shutdown OR overachievement as coping, relationship instability, self-identity confusion, anger, school refusal or truancy.' }
  ];

  var TRAUMA_DIFFERENTIAL = [
    { mimics: 'ADHD', overlap: 'Attention problems, impulsivity, hyperactivity', differentiator: 'Trauma symptoms often emerge after an identifiable event or period; ADHD typically present from early childhood. Trauma-based attention problems fluctuate with triggers; ADHD is more consistent. Hypervigilance from trauma can look like hyperactivity but is driven by threat-monitoring, not reward-seeking.' },
    { mimics: 'Oppositional Defiant Disorder (ODD)', overlap: 'Argumentativeness, refusal, authority conflicts', differentiator: 'Trauma-based refusal often reflects fear, loss of control, or trust breakdown (protective) — not willful defiance. Trauma-reactive behaviors typically follow a perceived threat; ODD presents across contexts with less identifiable triggers.' },
    { mimics: 'Autism Spectrum Disorder', overlap: 'Social withdrawal, sensory sensitivity, restricted interests (as coping)', differentiator: 'Autism is lifelong and present from early development. Social withdrawal after trauma represents a CHANGE from prior functioning. Sensory sensitivities in trauma are typically tied to specific trigger stimuli; autism sensory features are broader and more consistent.' },
    { mimics: 'Specific Learning Disability', overlap: 'Academic struggles, memory difficulties, slow processing', differentiator: 'Trauma affects working memory and concentration globally — academic struggles span domains not predicted by cognitive profile. SLD shows specific cognitive-processing weakness mapped to specific academic area; trauma disrupts learning more diffusely.' },
    { mimics: 'Depression / Anxiety (clinical)', overlap: 'Sad mood, worry, sleep/appetite changes, withdrawal', differentiator: 'Trauma-based depression/anxiety is typically directly linked to the trauma; treatment must address the trauma itself (TF-CBT, EMDR, CPT) not just the symptom cluster. PTSD symptom presence (re-experiencing, avoidance, hyperarousal) differentiates.' }
  ];

  var TRAUMA_SCREENING_TOOLS = [
    { name: 'ACE (Adverse Childhood Experiences) Questionnaire', age: 'Adult retrospective; adapted forms for teens/parents', what: '10-item screen for childhood exposure to abuse, neglect, household dysfunction.', use: 'Research / population-level screening. Raises flag for further eval. NOT a diagnostic tool. Score ≥ 4 associated with elevated risk across medical and mental health outcomes.' },
    { name: 'TSCC (Trauma Symptom Checklist for Children)', age: '8-16', what: '54-item self-report covering 6 trauma-related symptom clusters (anxiety, depression, anger, PTSD, dissociation, sexual concerns).', use: 'Screening for clinically-significant trauma symptoms. Includes validity scales (hyperresponsiveness, underresponsiveness).' },
    { name: 'TSCYC (Trauma Symptom Checklist for Young Children)', age: '3-12, parent-report', what: 'Parent-report version of TSCC for younger children.', use: 'When the child is too young for self-report or when parent perspective is needed.' },
    { name: 'UCLA PTSD Reaction Index for DSM-5', age: '7-18', what: 'Structured interview or self-report assessing PTSD symptoms per DSM-5 criteria following an identified traumatic event.', use: 'Specific PTSD screening/assessment. Commonly used clinically for diagnostic work.' },
    { name: 'Child PTSD Symptom Scale (CPSS-V)', age: '8-18', what: '27-item self-report aligned with DSM-5 PTSD criteria.', use: 'Brief self-report PTSD screen. Free for research/clinical use (permission required).' },
    { name: 'CBCL / TRF (Achenbach)', age: 'Preschool through young adult', what: 'Broad-band behavioral/emotional functioning with PTSD-relevant subscales.', use: 'Not trauma-specific but captures PTSD-related presentations (anxiety, withdrawal, somatic, thought problems) and triangulates with trauma-specific measures.' }
  ];

  var TRAUMA_PRINCIPLES = [
    { principle: 'Safety first', body: 'Every aspect of the evaluation should prioritize physical and psychological safety: private setting, breaks available, permission to pause or stop, adult of student\'s choosing present if requested.' },
    { principle: 'Trust through predictability', body: 'Preview what will happen: what questions, for how long, why, who will see results. Traumatized students often have had experiences of unpredictable authority. Transparency is protective.' },
    { principle: 'Choice and collaboration', body: 'Offer choices where possible: order of sections, when to break, mode of response. Adolescents especially need to have agency in a process they can\'t opt out of.' },
    { principle: 'Avoid retraumatization', body: 'Don\'t require detailed narrative of traumatic events in screening assessment. Use validated screeners, not open clinical interviews about specifics. If trauma is flagged, refer to trained trauma clinician for therapy-based disclosure process.' },
    { principle: 'Strengths-first framing', body: 'Lead with what the student does well, what they love, what helps them. Everyone, including trauma survivors, is more than their worst experiences. This framing is clinically important AND psychometrically important (reduces threat, increases valid responding).' },
    { principle: 'Cultural humility', body: 'Trauma manifests differently across cultures. What looks like "avoidance" in one culture is "respectful distance" in another. Ask about family meaning-making around difficulty, not just symptom checklist endorsement.' },
    { principle: 'When to refer out', body: 'Schools screen; clinicians treat. If TSCC/UCLA-PTSD scores are clinically elevated, disclosure of ongoing abuse emerges, or the student presents crisis-level symptoms, refer to community mental health. Coordinate with the family; don\'t ghost the referral.' },
    { principle: 'Mandated reporting', body: 'If disclosures of ongoing abuse occur, mandated reporting obligations activate immediately. Know your state\'s specific requirements, know your school\'s reporting chain, document everything. Reporting is protective, even when the relationship feels hard.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1R: TRANSITION PLANNING (AGE 16+)
  // ═══════════════════════════════════════════════════════════════
  var TRANSITION_REQUIREMENTS = [
    { component: 'Measurable postsecondary goals', body: 'Goals in three areas: (1) education/training, (2) employment, (3) independent living (as appropriate). Must be based on age-appropriate transition assessments. Must be updated annually.' },
    { component: 'Transition services', body: 'A coordinated set of activities to help the student reach postsecondary goals. Includes instruction, related services, community experiences, development of employment and other post-school adult living objectives, and (when appropriate) acquisition of daily living skills and functional vocational evaluation.' },
    { component: 'Courses of study', body: 'A multi-year course of study aligned with postsecondary goals. NOT just "will take required classes" — should be strategic (e.g., "electives in culinary arts to prepare for ServSafe certification and restaurant industry employment").' },
    { component: 'Agency linkages (when appropriate)', body: 'Representatives from agencies likely to provide post-school services (Vocational Rehab, Developmental Disability, Mental Health, colleges\' disability services, community colleges, etc.) should be invited to the IEP meeting with family consent.' },
    { component: 'Age of majority notice', body: 'At least one year before the student reaches age of majority (18 in most states), the IEP must include a statement that the student has been informed that rights transfer at majority age (unless guardianship is pursued).' }
  ];

  var TRANSITION_ASSESSMENTS = [
    { domain: 'Interests', tools: 'O*NET Interest Profiler (free, public domain), Holland RIASEC (see Career module), Career Interest Inventory, Strong Interest Inventory, Self-Directed Search.', use: 'Foundation of postsecondary goal setting. What does the student find engaging? What occupations match their interest profile?' },
    { domain: 'Aptitudes', tools: 'ASVAB (military + civilian version), KeyTrain, WorkKeys, CareerScope.', use: 'What are the student\'s cognitive and skill strengths? Often tied to employment/training pathways.' },
    { domain: 'Work preferences / values', tools: 'Schwartz Values (see Career module), McCarron-Dial, Transition Planning Inventory (TPI-3).', use: 'What does the student want from work beyond money? Autonomy, service, creativity, stability? Shapes long-term satisfaction.' },
    { domain: 'Self-determination', tools: 'AIR Self-Determination Scale, Arc\'s Self-Determination Scale (ARC-SDS), ChoiceMaker.', use: 'Can the student identify goals, make choices, advocate for themselves? Strong predictor of post-school outcomes. Intervention-targetable skill.' },
    { domain: 'Functional / adaptive', tools: 'Life Skills Inventory, Transition Planning Inventory (TPI-3), Vineland-3, Enderle-Severson Transition Rating Scales.', use: 'Can the student manage money, time, transportation, cooking, personal care? Essential for independent living goals.' },
    { domain: 'Vocational skills (situational)', tools: 'Situational Assessment (observe performing real work task), Work samples (Valpar, Talent Assessment Program), community-based vocational instruction (CBVI).', use: 'Direct observation of work-related skills in real or simulated settings. Often more predictive than standardized inventories for employment outcomes.' }
  ];

  var TRANSITION_POSTSCHOOL_OPTIONS = [
    { option: '4-year college/university', considerations: 'Disability services office varies widely by school — visit and meet staff BEFORE applying. Accommodations require self-identification and documentation. Self-advocacy skills critical. Consider gap year if not ready. College is NOT an IEP entitlement — accommodations are civil rights (Section 504), not FAPE.' },
    { option: '2-year / community college', considerations: 'Open admissions at most; flexible pacing; often strong disability services; transfer pathways to 4-year. Often a better first step than 4-year for students with disabilities. Affordable. Can pursue credentials AND continue skill development.' },
    { option: 'Trade/vocational school or apprenticeship', considerations: 'Strong pathways to employment in skilled trades (electrical, HVAC, plumbing, nursing assistant, welding, automotive, etc.). Shorter duration + credential + often starts earning quickly. Many trades have good earnings potential. Some unions have apprenticeship programs with income during training.' },
    { option: 'Direct to employment', considerations: 'Vocational Rehabilitation can assist with job readiness, placement, and short-term coaching. Supported employment models (job coach, work adjustment) for students with more significant disabilities. Career counseling connected to interest and skill assessment. Part-time high school employment can be a bridge.' },
    { option: 'Vocational Rehabilitation (VR)', considerations: 'State agency funded by federal law. Provides training, education, job placement, assistive technology, transportation for qualifying adults with disabilities. Application can start in junior year of high school. VR services are an entitlement when eligible.' },
    { option: 'Day programs / Adult day habilitation', considerations: 'For adults with more significant disabilities. Provides structured programming, social opportunities, often some skill-building. Funded through state developmental disability services. Application and waitlist processes vary by state.' },
    { option: 'Supported living / Independent living', considerations: 'Range from fully independent with occasional support, to group homes, to family home with community services. Transition planning should address housing preference and required supports. Housing wait lists in some states are long (years).' }
  ];

  var TRANSITION_BEST_PRACTICES = [
    { title: 'Student-led IEP meetings', body: 'By high school, the student should be leading their own IEP meetings when possible: presenting goals, sharing progress, voicing preferences. Builds self-determination. Adults support rather than speak-for.' },
    { title: 'Map backward from post-school vision', body: 'Start with: "Five years after graduation, where do you want to be?" Then work backward. What has to be true at graduation? What has to happen junior year? This year? This semester? This month?' },
    { title: 'Use real-world experiences', body: 'Job shadowing, internships, volunteer work, community-based instruction, on-campus work. Can\'t know if you like something without experiencing it. Built into IEP as transition service.' },
    { title: 'Connect agencies EARLY', body: 'Vocational Rehabilitation, DD services, colleges\' disability offices — invite representatives to senior-year IEPs if not before. Post-school, these agencies become the "IEP team." Relationships built in high school smooth the transition.' },
    { title: 'Data-informed postsecondary goals', body: 'A student who has never expressed interest in culinary arts shouldn\'t have "attend culinary school" as a goal. Goals should emerge from interest assessments, work experiences, student voice. Revise as data changes.' },
    { title: 'Plan for the cliff', body: 'Age 18 or 21 (depending on state and eligibility): special education services end. Post-school, the student navigates disclosure, accommodations, advocacy independently. Prepare. Teach self-advocacy. Make sure the student has documentation in hand.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1S: EFFECT SIZES & RESEARCH LITERACY
  // ═══════════════════════════════════════════════════════════════
  var EFFECT_SIZE_GUIDE = [
    { measure: 'Cohen\'s d (standardized mean difference)', small: '0.20', medium: '0.50', large: '0.80', context: 'Compares two group means in SD units. d = 0.20 means groups differ by 1/5 of a SD. In education and psych research, d = 0.30-0.50 is typical for "impactful" interventions. d > 1.0 is rare and usually reflects either a very strong intervention or a methodologically problematic study. Meta-analyses often find averaged d around 0.30.' },
    { measure: 'r (correlation coefficient)', small: '0.10', medium: '0.30', large: '0.50', context: 'Strength of linear association between two variables. r = 0.30 means about 9% of variance is shared (r²). In personality research, r = 0.20-0.30 with life outcomes is considered strong (Big 5 Conscientiousness with job performance: r ≈ 0.23). In physics or engineering, r = 0.30 would be disappointing; in psychology, it\'s substantial.' },
    { measure: 'η² / partial η² (eta squared)', small: '0.01', medium: '0.06', large: '0.14', context: 'Proportion of variance in outcome accounted for by a factor (ANOVA). Small effects can still matter if the factor is manipulable or if population-level impact is large.' },
    { measure: 'Odds Ratio (OR) / Relative Risk (RR)', small: '1.2-1.5', medium: '1.5-3.0', large: '3.0+', context: 'Ratio of odds/risk between groups. An OR of 2.0 means one group has 2x the odds of the outcome. Useful in medical and epidemiological research.' },
    { measure: 'NNT (Number Needed to Treat)', small: 'large (20+)', medium: '5-20', large: '<5', context: 'How many patients must receive treatment for one to benefit. Smaller = stronger effect. Connects effect sizes to clinical practice decisions.' }
  ];

  var RESEARCH_RED_FLAGS = [
    { flag: 'Small sample without explanation', body: 'N = 20 personality study, N = 15 neuroimaging study. Small samples inflate noise, reduce power, and systematically overestimate effect sizes when only significant results get published (publication bias + small-study effect).' },
    { flag: 'No pre-registration for confirmatory claims', body: 'Modern gold standard: state your hypothesis and analysis plan BEFORE collecting data, log it publicly (OSF, AsPredicted, ClinicalTrials.gov). Research without pre-registration that claims confirmatory findings is often p-hacked (testing many comparisons, reporting only the ones that "worked").' },
    { flag: 'Effect sizes much larger than field norms', body: 'If a new personality intervention claims d = 1.5 when established interventions average d = 0.3, either it\'s revolutionary (rare) or the study is flawed (common). Extraordinary claims require extraordinary evidence.' },
    { flag: 'Significance without effect size', body: 'Large N can make tiny effects "statistically significant." A correlation of r = 0.05 with N = 10,000 will be p < 0.001 but means almost nothing practically. Always ask: how big is it?' },
    { flag: 'Proprietary or commercial funding without independent replication', body: 'Internal studies from test publishers can be valid, but they\'re one data point. For a claim to stick, it should replicate in peer-reviewed independent samples. If the only studies are from the company that sells the tool, that\'s a yellow flag.' },
    { flag: 'No replication (cross-sample, cross-culture)', body: 'Psychology has a replication crisis. A well-powered single study provides weaker evidence than 3 smaller studies that converge. Look for replication across samples, especially across cultures and decades.' },
    { flag: 'Claims of causation from correlational design', body: '"Students who took this class had higher GPA" — did the class cause the GPA, or did motivated students both take the class AND get higher GPAs? Without experimental design (randomization), causal claims are unsupported.' },
    { flag: 'Cherry-picked outcomes', body: 'A study measuring 20 outcomes and reporting the 2 that reached significance (5% expected by chance alone). Look for pre-specified primary outcomes and full reporting of all measured variables.' }
  ];

  var META_ANALYSIS_PRIMER = [
    { title: 'What it is', body: 'A statistical synthesis of multiple studies on the same question. Instead of reading 50 studies individually, a meta-analysis combines their effect sizes to produce a pooled estimate with a much-reduced confidence interval.' },
    { title: 'Why it matters', body: 'A single study can be an outlier, underpowered, or fraudulent. Averaged across many studies (weighted by sample size and quality), systematic patterns emerge that single studies can\'t reveal. Meta-analyses are typically considered the strongest form of research evidence when done well.' },
    { title: 'Key concepts in meta-analysis', body: 'Heterogeneity (how variable the effect is across studies — I² statistic), publication bias (funnel plot asymmetry, trim-and-fill), moderator analyses (for whom/when does the effect work?), risk of bias assessment (Cochrane tool, Newcastle-Ottawa).' },
    { title: 'When to distrust', body: 'Meta-analyses aggregating flawed studies amplify rather than correct errors ("garbage in, garbage out"). Look at the individual studies included and quality criteria applied. Meta-analyses with high I² (heterogeneity) may be mixing apples and oranges.' },
    { title: 'Where to find them', body: 'Cochrane Library (medical interventions), Campbell Collaboration (education and social policy), PsycINFO with meta-analysis filter, Google Scholar "meta-analysis" search.' }
  ];

  var READING_STUDY_CHECKLIST = [
    'Research question clearly stated? Pre-registered?',
    'Sample size reasonable for the design? Power analysis reported?',
    'Sample represents the population of interest? Demographics reported?',
    'Methods clearly enough described to replicate?',
    'Effect sizes reported (not just p-values)?',
    'Confidence intervals presented?',
    'Outcomes align with pre-specified primary outcomes?',
    'Limitations section substantive (not boilerplate)?',
    'Conflicts of interest and funding disclosed?',
    'Data and materials available (open science)?',
    'Consistent with prior research, OR authors address why not?'
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1T: UNIVERSAL MENTAL HEALTH SCREENING
  // ═══════════════════════════════════════════════════════════════
  var UNIVERSAL_SCREENING_TOOLS = [
    { name: 'BASC-3 BESS (Behavioral and Emotional Screening System)', age: 'Preschool-12', format: 'Teacher (15-25 items), Parent (15-27 items), Self-report gr 3-12 (27-29 items)', time: '5-10 min per form', what: 'Brief screener from the Behavior Assessment System for Children (BASC-3). Yields overall risk level (Normal/Elevated/Extremely Elevated) for behavioral and emotional concerns. Most widely-used universal screener in US schools.', cost: 'Proprietary; per-administration cost.' },
    { name: 'Strengths and Difficulties Questionnaire (SDQ)', age: '3-16', format: 'Teacher, Parent, Self (11+)', time: '~5 min per form', what: '25-item screener covering 5 scales: emotional symptoms, conduct problems, hyperactivity/inattention, peer problems, prosocial behavior. Also has an impact supplement.', cost: 'Free for clinical/educational use (permission via sdqinfo.org).' },
    { name: 'Social, Academic, and Emotional Behavior Risk Screener (SAEBRS)', age: 'K-12', format: 'Teacher (20 items)', time: '1-3 min per student', what: 'Short teacher-rated screener covering social, academic, and emotional risk. Widely-used in MTSS-aligned districts. Designed to be teacher-friendly at scale.', cost: 'Varies; available via FastBridge/Renaissance.' },
    { name: 'Pediatric Symptom Checklist (PSC-17/35)', age: '4-18', format: 'Parent (17- or 35-item versions); adolescent self-report (Y-PSC)', time: '5-10 min', what: 'Broad mental health screener from pediatric primary care, adapted for schools. 3 subscales: internalizing, externalizing, attention.', cost: 'Free (MGH).' },
    { name: 'Patient Health Questionnaire-9 Adolescent (PHQ-A)', age: '11-17', format: 'Self-report (9 items)', time: '~3 min', what: 'Adapted PHQ-9 for adolescents. Screens for depression severity per DSM-5 criteria. Item 9 asks about suicidal ideation (requires protocol).', cost: 'Free.' },
    { name: 'Generalized Anxiety Disorder-7 (GAD-7)', age: '11+', format: 'Self-report (7 items)', time: '~2 min', what: 'Anxiety screener. Used in primary care and increasingly in schools. Paired with PHQ for comprehensive brief screening.', cost: 'Free.' },
    { name: 'Strengths Difficulties and Impact Questionnaire (DESSA)', age: 'K-8 / DESSA-HS (high school)', format: 'Teacher, Parent, Student', time: '10-15 min', what: 'Strength-based social-emotional competence screener. Covers self-awareness, self-management, social awareness, relationship skills, responsible decision making (CASEL framework).', cost: 'Proprietary; per-administration.' },
    { name: 'Panorama Social-Emotional Learning Survey', age: 'Elementary/Middle/High', format: 'Student self-report', time: '10 min', what: 'Commercial SEL survey platform. Measures growth mindset, self-efficacy, self-regulation, grit, social awareness, etc.', cost: 'Per-student licensing.' }
  ];

  var UNIVERSAL_SCREENING_CONSIDERATIONS = [
    { topic: 'Consent model', body: 'Opt-in consent (parents actively agree) is most ethically rigorous but produces low participation and selection bias. Opt-out (parents decline if they object) yields high participation but may miss informed refusal. Most districts use opt-out with strong parent communication. Check state law: some states require opt-in for mental health screeners.' },
    { topic: 'Response protocol before you screen', body: 'Never screen without a pre-established protocol for flagged students. What does "elevated risk" trigger? Who follows up? How quickly? Where does the data go? How are parents notified? Schools that screen without this infrastructure risk harm (identifying students who then get no follow-up) and legal exposure.' },
    { topic: 'Data privacy and FERPA', body: 'Screening data is an educational record under FERPA. Access must be limited, secured, and documented. Consider also: what happens at student\'s transfer? When records are subpoenaed? When student reaches age of majority? State laws may add requirements (e.g., HIPAA if data is transmitted to medical providers).' },
    { topic: 'Cultural and linguistic competence', body: 'Screeners developed in English on US samples may miss or misclassify students from other cultural backgrounds. Translation is necessary but not sufficient (translated items may not have equivalent meaning). Consider cultural consultants, family input, and secondary assessment before high-stakes decisions based on screener data.' },
    { topic: 'False positives and stigma', body: 'Universal screening will flag many students. Some will be false positives (student having a bad week, not a chronic issue; item misinterpretation; culturally normed behavior misread). Intervention based solely on screener flag without follow-up risks stigmatizing students who don\'t need services.' },
    { topic: 'Capacity to serve', body: 'Most districts identify more students than they have capacity to serve. Screening without sufficient Tier 2 and Tier 3 resources becomes a compliance exercise that also creates liability. Screen only when you can follow through.' },
    { topic: 'Mandated reporting interactions', body: 'If a screener item triggers mandated reporting (e.g., suicide ideation, self-harm, abuse disclosure), the reporting obligation is immediate. Screeners must be administered by staff who understand and are prepared to act on reporting requirements.' },
    { topic: 'Family communication', body: 'Be transparent about what screeners measure, how data is used, what happens if flagged, and family rights. Hidden screening generates trust erosion when discovered and can create legal exposure.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1U: CRISIS / SUICIDE RISK ASSESSMENT
  // ═══════════════════════════════════════════════════════════════
  var CRISIS_SCREENERS = [
    { name: 'Columbia Suicide Severity Rating Scale (C-SSRS)', age: 'All ages (child, adolescent, adult versions)', time: '<5 minutes', what: 'Gold-standard structured interview. 6 questions assess ideation intensity, behavior, and intent. Widely used in clinical, school, ED, and research settings. Kid-friendly wording. Determines "Acute" (immediate safety plan needed) vs "Chronic" risk level.', free: 'Yes; public use with registration at cssrs.columbia.edu. Training strongly recommended.' },
    { name: 'Ask Suicide-Screening Questions (ASQ)', age: '10+ (developed for ED settings)', time: '~1 minute', what: '4-item brief suicide screener developed by NIH. A single positive answer triggers C-SSRS follow-up. Highly efficient for front-line settings.', free: 'Yes; public use via NIMH asq.nimh.nih.gov.' },
    { name: 'PHQ-9 Adolescent / PHQ-A (item 9)', age: '11-17', time: 'Part of PHQ-9 admin', what: 'Item 9 of the PHQ-A asks about suicidal ideation. Positive response requires follow-up assessment (C-SSRS or clinical interview). Not a standalone suicide screener but commonly a first flag.', free: 'Yes.' },
    { name: 'Suicide Ideation Questionnaire (SIQ / SIQ-JR)', age: '10-18', time: '10 min', what: 'Self-report 30-item (SIQ) or 15-item (SIQ-JR) scale for frequency of suicidal thoughts. More detailed than screeners; used in research and clinical assessment.', free: 'Proprietary (PAR).' }
  ];

  var CRISIS_WARNING_SIGNS = [
    { tier: 'Imminent risk (urgent action)', signs: 'Threatening suicide or harm to self; looking for means (pills, weapons); written/spoken statements of hopelessness, trapped feeling, burden to others; giving away possessions; saying goodbye; sudden calm after period of depression; access to lethal means.' },
    { tier: 'High risk', signs: 'Active suicidal ideation with plan; prior suicide attempt; detailed plan with means and timeline; non-suicidal self-injury (NSSI) that is increasing in frequency or severity; recent significant loss; substance abuse combined with mood symptoms.' },
    { tier: 'Elevated risk', signs: 'Expressed suicidal thoughts without plan; depression symptoms with hopelessness; social withdrawal; academic decline combined with affective symptoms; perceived persecution or rejection; family history of suicide; LGBTQ+ youth without family support.' },
    { tier: 'Warning signs to monitor', signs: 'Mood swings, irritability, sleep changes, appetite changes, withdrawal from activities, changes in appearance or hygiene, expressions of feeling worthless or hopeless, increased substance use, risk-taking behavior, online search for suicide methods.' }
  ];

  var CRISIS_PROTOCOL = [
    { step: 1, name: 'Assess safety immediately', body: 'Move the student to a private, safe space. Do not leave them alone. Remove access to means (if present). Get help — another trained staff member. Administer C-SSRS if trained to do so.' },
    { step: 2, name: 'Determine acuity level', body: 'Acute risk: student has current ideation with plan/intent/means/timeline, active planning, or psychotic features. Chronic risk: recent ideation without current active planning. Acute → hospital/ED. Chronic → safety plan + follow-up assessment.' },
    { step: 3, name: 'Safety Planning Intervention (Stanley-Brown)', body: 'Evidence-based alternative to "no-suicide contracts" (which have been shown ineffective). A collaborative written plan with the student covering: (1) warning signs, (2) internal coping strategies, (3) social contacts/settings that distract, (4) people who can help, (5) professionals and agencies to contact in crisis, (6) making the environment safe (means restriction). Free template at sprc.org/brown-stanley-safety-plan.' },
    { step: 4, name: 'Notify parent/guardian', body: 'Parent notification is almost always required when suicidal ideation is identified (mandated reporting in many states; ethical standard in all). Handled with care: in-person or phone, not text/email. Provide specific resources. Document the notification.' },
    { step: 5, name: 'Connect to ongoing care', body: 'School-based counseling is a bridge, not treatment for suicidality. Refer to community mental health with a warm handoff. If ED evaluation is needed, coordinate transport. Follow up in 24-48 hours.' },
    { step: 6, name: 'Means restriction counseling', body: 'Most impulsive suicide attempts involve readily available means. Counsel family to restrict access to firearms (especially critical — 85%+ lethality), medications (lock boxes, smaller prescriptions), sharp objects in some cases. Means restriction is one of the most evidence-based prevention interventions.' },
    { step: 7, name: 'Document thoroughly', body: 'Detailed documentation protects the student, the school, and you. What was assessed, what was found, what was communicated, to whom, when. Include copies of safety plan, parent notification record, referrals made.' },
    { step: 8, name: 'Re-entry and monitoring', body: 'Post-crisis re-entry to school is vulnerable period. Develop re-entry plan: check-ins, modified academic load if needed, safe-adult designation, coordination with outside clinician. Monitor for 6-8 weeks post-crisis.' }
  ];

  var CRISIS_ETHICAL_NOTES = [
    { title: 'No-harm contracts are obsolete', body: 'Research consistently shows "no-suicide contracts" (where student signs they won\'t harm themselves) don\'t prevent attempts and can erode the helping relationship. Replaced by Safety Planning Intervention, which is collaborative, strengths-based, and evidence-supported.' },
    { title: 'Confidentiality has limits', body: 'Before assessment, be clear with students: "What you share is confidential UNLESS I become concerned about your safety or someone else\'s. Then I\'m required to get help for you." This informed-consent framing is ethically essential and clinically effective — students disclose more when they understand the limits.' },
    { title: 'LGBTQ+ youth disproportionate risk', body: 'LGBTQ+ youth, especially those without family support, have 3-4x higher suicide risk. Trevor Project hotline (866-488-7386) is a specialized resource. Gender-affirming care is associated with substantial risk reduction — this is settled clinical evidence.' },
    { title: 'Postvention after a death', body: 'When a student dies by suicide, community responds with "cluster" risk — elevated suicidality in surviving peers. Postvention protocols exist (After a Suicide toolkit from AFSP and SPRC). Handled well, postvention can protect. Handled poorly (romanticizing, permanent memorials visible to students, media glorification), postvention creates contagion risk.' },
    { title: 'Your own self-care matters', body: 'Working with suicidal students is clinically demanding and psychologically draining. Supervision, peer consultation, your own therapy if needed. If a student you work with dies by suicide, you WILL be affected; responsible self-care and institutional support are not optional.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1V: IEP TEAM MEETING FACILITATION
  // ═══════════════════════════════════════════════════════════════
  var IEP_MEETING_PREP = [
    { step: 'Schedule thoughtfully', body: 'Meet family where they are. Offer multiple time options (including evenings when needed). Accommodate language needs (interpreter scheduled in advance, materials in family\'s primary language). Check in advance about physical accessibility, childcare needs, and meeting format (in-person, virtual, hybrid).' },
    { step: 'Send agenda and materials ahead', body: 'Provide draft agenda, current IEP, present-level data, and any proposed changes at least 5 business days before the meeting. Families can\'t be "meaningful participants" if they see documents for the first time at the table. Use plain language summary sheets for technical reports.' },
    { step: 'Invite the student', body: 'By middle school, include the student. By high school, the student should often be leading. Pre-meet to help them prepare: what would they like to share? What do they want in the IEP? What are they proud of? What\'s hard? Student voice is specifically required at transition age.' },
    { step: 'Prepare all team members', body: 'Remind teachers of meeting date and request specific progress data. Brief the student\'s aides/paraprofessionals. Preview any contentious items with team members so surprises don\'t derail the meeting. Coordinate with outside clinicians when relevant.' },
    { step: 'Plan for meeting dynamics', body: 'Anticipate the tone: routine annual review vs contested eligibility vs difficult transition meeting. Longer meetings for harder topics. If past meetings have been adversarial, consider meeting facilitation training or bringing a neutral facilitator.' }
  ];

  var IEP_MEETING_STRUCTURE = [
    { phase: '1. Welcome and introductions (3-5 min)', body: 'Everyone states name and role. Explicitly welcome the family and student. Acknowledge extended family or advocates. Check: Do we have everyone the law requires (general ed teacher, special ed teacher, district rep, evaluator for eval reviews, transition-age requires outside agency invitations with consent)?' },
    { phase: '2. Review procedural safeguards (as needed)', body: 'Provide and briefly highlight parent procedural safeguards (required at least annually). Don\'t gloss over — but also don\'t dwell. "Here are your rights as a parent throughout this process. I\'ll leave the full document with you. Any questions at any point, please ask."' },
    { phase: '3. Celebrate / strengths first (5-10 min)', body: 'Start with the student\'s strengths and positive progress. Teachers share, family shares, student (if present) shares. This sets collaborative tone and reminds the team that the student is more than their disability.' },
    { phase: '4. Present current progress and data (15-30 min)', body: 'Current IEP goals — what\'s been achieved? What\'s in progress? What\'s stalled? Share progress-monitoring data and classroom evidence. For eligibility reviews, review evaluation findings in plain language.' },
    { phase: '5. Identify current needs (15-30 min)', body: 'Given present performance, what does the student need? This is the heart of the meeting. Listen to family and student perspectives. Synthesize with school staff observations. Name the needs clearly before jumping to goals or services.' },
    { phase: '6. Develop / revise goals (15-30 min)', body: 'Write or revise annual goals to address identified needs. Apply SMART criteria (see IEP Goal Writing sub-view). Explicitly describe how goals connect to state standards and general curriculum access.' },
    { phase: '7. Determine services, accommodations, placement (15-30 min)', body: 'What services, accommodations, related services, and placement are needed to meet the goals? Least Restrictive Environment (LRE) drives this — start with general ed and only remove as needed. Document frequency, duration, setting, provider.' },
    { phase: '8. Transition services (for students 16+)', body: 'Postsecondary goals, transition services, courses of study, agency linkages (see Transition Planning sub-view). Required at age 16 and annually thereafter.' },
    { phase: '9. Open discussion and questions (10-15 min)', body: 'Always explicit space for family and student questions. "Before we conclude, what questions do you have? What concerns are still on your mind? What did we not address?"' },
    { phase: '10. Next steps and signatures', body: 'Clarify follow-up: when will family receive the written IEP? Who is responsible for what next? Establish check-in dates. Thank everyone.' }
  ];

  var IEP_DIFFICULT_CONVERSATIONS = [
    { situation: 'Eligibility denial', approach: 'Never surprise a family with denial at the eligibility meeting. Communicate findings in advance so they have time to process. At the meeting, explain the specific criteria and how the evidence was weighed. Acknowledge the family\'s experience and concerns. Offer alternatives (504 plan if applicable, school-based supports, outside referrals). Provide written notice with rationale.' },
    { situation: 'Change in placement', approach: 'Changes in placement (more restrictive settings, reduced mainstreaming) require extensive explanation and alternatives considered. Show data justifying the change. Offer family time to process between meetings if significant. Document LRE analysis — why was this placement necessary?' },
    { situation: 'Parent-school disagreement', approach: 'Acknowledge the disagreement explicitly. Separate facts from interpretations. Invite the family to share what they\'re seeing that the school isn\'t. Propose specific next steps: additional data collection, independent evaluation, consultation with outside clinician, mediation. Document the disagreement and next steps.' },
    { situation: 'Transition from school services', approach: 'Graduation with a regular diploma means IEP ends. This can be hard to accept for families. Explain what post-school services exist (VR, community supports), what documentation the student has, and what self-advocacy skills they\'ve built. Plan for age-of-majority rights transfer early (10th-11th grade).' },
    { situation: 'Discipline / manifestation determination', approach: 'When a student with IEP faces suspension 10+ days, the team must determine if the behavior was a manifestation of disability. This is legally consequential. Review FBA/BIP, review IEP implementation fidelity. If the behavior was a manifestation or the IEP wasn\'t being implemented, the student cannot be disciplined as a non-disabled student.' },
    { situation: 'Communicating test scores to parents', approach: 'Not all parents are test-literate. Translate: "The 85 means Kenya scored higher than about 16% of kids her age, or lower than 84%. Given the measurement error — about 5 points in either direction — we can say with confidence she\'s probably in the Low-Average range. What that means for her daily learning is..." Always tie scores to functional implications.' },
    { situation: 'Cultural or linguistic differences', approach: 'Interpreters are a right, not a favor. Work with interpreters (not family members if possible; children should never interpret their own IEP meetings). Allow extra time — translation doubles meeting length. Check understanding frequently: "Can you tell me what you heard us say so we can make sure I explained that well?"' }
  ];

  var IEP_FACILITATION_SKILLS = [
    'Name the tone you want: "This is a collaborative meeting. We\'re here because we all care about your child\'s progress. I want everyone\'s voice at this table."',
    'Use active listening: paraphrase what family members say before moving on. "What I hear you saying is..." Builds trust and catches misunderstandings.',
    'Watch the clock. Long meetings exhaust everyone. Plan 60-90 min for routine annual reviews; 90-120 min for eligibility reviews; 2-3 hours for complex transition or dispute meetings.',
    'Separate facts from interpretations. "The data shows reading at 62 wcpm" (fact) vs. "Kenya is struggling in reading" (interpretation). Teams often conflate these.',
    'Keep the student central. When conversation drifts to adult concerns, gently redirect: "How does this affect what\'s best for Kenya?"',
    'Document decisions in writing at the meeting. "We\'ve agreed that Kenya will receive... Does everyone understand this correctly?"',
    'Be willing to continue the meeting. If major decisions aren\'t ready, schedule a follow-up rather than rushing.',
    'Follow up after the meeting. A brief thank-you call or email the next day communicates respect and professionalism, and can resolve any miscommunication before it festers.'
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1W: INTERVIEW PREPARATION
  // ═══════════════════════════════════════════════════════════════
  var BEHAVIORAL_COMPETENCIES = [
    { id: 'leadership', name: 'Leadership & Influence', desc: 'Taking initiative, guiding teams, making decisions, communicating vision, managing performance.' },
    { id: 'teamwork', name: 'Teamwork & Collaboration', desc: 'Working with others, building relationships, shared accountability, inclusive practice.' },
    { id: 'conflict', name: 'Conflict Resolution', desc: 'Navigating disagreements, difficult conversations, de-escalation, finding common ground.' },
    { id: 'adaptability', name: 'Adaptability & Resilience', desc: 'Handling ambiguity, responding to change, recovering from setbacks, learning from failure.' },
    { id: 'communication', name: 'Communication', desc: 'Written clarity, verbal presence, listening, adjusting to audience, difficult conversations.' },
    { id: 'problemsolving', name: 'Problem-Solving & Analysis', desc: 'Breaking down complex problems, data-driven decisions, systematic approaches, creative solutions.' },
    { id: 'integrity', name: 'Integrity & Ethics', desc: 'Honesty, ethical decision-making, accountability for mistakes, principled behavior under pressure.' },
    { id: 'timemanagement', name: 'Time Management & Prioritization', desc: 'Managing competing demands, planning, meeting deadlines, delegating.' },
    { id: 'initiative', name: 'Initiative & Drive', desc: 'Going beyond requirements, self-motivation, pursuing improvement without being asked.' },
    { id: 'learning', name: 'Learning Agility', desc: 'Acquiring new skills quickly, seeking feedback, applying lessons across contexts.' }
  ];

  var STAR_DETAILED = [
    { letter: 'S', name: 'Situation', guidance: 'Set the scene in 2-3 sentences. What was the context? Who was involved? What was the timeframe? Enough detail that the interviewer can picture it, not so much that you lose them. Aim for 15-20% of your total answer time.' },
    { letter: 'T', name: 'Task', guidance: 'What specifically was YOUR responsibility or challenge? This distinguishes your contribution from team context. "I was responsible for..." or "My goal was..." Makes clear what was asked of you. 10-15% of total answer.' },
    { letter: 'A', name: 'Action', guidance: 'The heart of the answer. What did YOU specifically do? Use "I" statements (not "we"). Detail the specific steps you took, your reasoning, adjustments along the way. Most of your answer should live here. 50-60% of total answer.' },
    { letter: 'R', name: 'Result', guidance: 'Concrete outcome. Quantified where possible ("reduced error rate 40%", "saved 15 staff hours/week"). What happened as a direct result of your actions? Include impact beyond just completion. What did you learn? 15-20% of total answer.' }
  ];

  var INTERVIEW_PITFALLS = [
    { pitfall: 'Going too short', problem: 'A 30-second answer to a behavioral question signals you don\'t have a real story. Interviewer can\'t assess depth of experience.', fix: 'Aim for 2-3 minutes per behavioral answer. Practice with a timer.' },
    { pitfall: 'Going too long', problem: 'A 5+ minute answer loses the interviewer. They lose track of the question.', fix: 'Practice trimming. Cut Situation and Task down. If an answer runs long, wrap with "...and that\'s what led to [Result]."' },
    { pitfall: 'Missing the Task', problem: 'Leaping from Situation to Action loses "what was your responsibility?" The interviewer doesn\'t know what challenge you were facing.', fix: 'Always explicitly state: "My job was to..." or "I was asked to..."' },
    { pitfall: '"We" instead of "I"', problem: 'Team answers are often safer-feeling but hide your individual contribution. Interviewer can\'t assess YOU.', fix: 'For Action step especially, switch to "I." You can say "our team" for Situation, but YOUR actions are yours.' },
    { pitfall: 'No quantified Result', problem: 'Vague outcomes ("it went well", "the team was happy") leave interviewer without evidence of impact.', fix: 'Always try to include a number, percentage, dollar amount, or specific concrete outcome. If you didn\'t measure it at the time, estimate with qualifiers.' },
    { pitfall: 'Stories with no stakes', problem: 'Examples where nothing was really hard or nothing went wrong don\'t showcase skills.', fix: 'Pick stories where you faced real challenges. Failures or difficult decisions often make better behavioral answers than smooth successes.' },
    { pitfall: 'Same story for everything', problem: 'Reusing one strong story for 3+ different questions signals limited experience. Also makes interviewer think you\'re underprepared.', fix: 'Prepare 5-7 distinct STAR stories spanning different competencies. Map which story addresses which typical question type.' },
    { pitfall: 'Memorized script delivery', problem: 'Sounding rehearsed makes you sound either inauthentic or robotic. Interviewers prefer natural conversation.', fix: 'Know your stories well but don\'t memorize word-for-word. Practice telling them varied ways. Aim for "telling a friend" tone.' }
  ];

  var INTERVIEW_FORMATS = [
    { type: 'Structured Behavioral Interview', what: 'Interviewer works through a pre-set list of behavioral questions (STAR-style). Same questions for every candidate. Responses scored against rubric.', prep: 'Prepare 5-7 STAR stories spanning core competencies. Research the company\'s stated values to anticipate emphasis.' },
    { type: 'Situational / Hypothetical', what: '"What would you do if..." rather than "Tell me about a time when..." Tests judgment without requiring prior experience.', prep: 'Think through likely scenarios for the role. Frame responses with reasoning ("I\'d consider X, Y, Z — and choose approach A because...").' },
    { type: 'Case Interview', what: 'Common in consulting. You\'re given a business problem; you structure an analysis aloud. Tests problem-structuring, quantitative reasoning, communication.', prep: 'Practice with case prep books (Case in Point) or partners. Master MECE frameworks. Focus on structured thinking, not getting the "right" answer.' },
    { type: 'Technical Interview', what: 'Software engineering whiteboard problems, data analysis tasks, domain-specific testing. Tests applied skills.', prep: 'Role-specific practice. LeetCode for coding. Industry-specific problem banks.' },
    { type: 'Panel Interview', what: 'Multiple interviewers simultaneously. Each may focus on different dimensions. Sometimes roleplay of scenarios.', prep: 'Make eye contact across panel members as you answer. Address the person who asked, then scan others. Do not favor one panel member.' },
    { type: 'Virtual / Video', what: 'Zoom, Teams, or asynchronous platforms. Live or recorded. AI-scored is its own category (see "AI & Algorithms in Assessment").', prep: 'Lighting from front (window or ring light), neutral background, camera at eye level, test tech in advance, dress fully (not just waist up), look at camera not screen.' },
    { type: 'Group Interview', what: 'Multiple candidates simultaneously. Often includes a group task or discussion. Tests teamwork under observation.', prep: 'Contribute substantively but don\'t dominate. Build on others\' ideas. Ask questions. Don\'t treat as competition with other candidates.' }
  ];

  function buildInterviewQuestionPrompt(competencyId, role) {
    var comp = BEHAVIORAL_COMPETENCIES.find(function(c) { return c.id === competencyId; });
    if (!comp) return '';
    return 'You are an interview coach generating a realistic behavioral interview question for a candidate.\n\n' +
      'TARGET COMPETENCY: ' + comp.name + '\n' +
      'COMPETENCY DESCRIPTION: ' + comp.desc + '\n' +
      'ROLE CONTEXT: ' + (role || 'general professional role') + '\n\n' +
      'Generate ONE behavioral interview question that would elicit a strong STAR-format response for this competency. Format:\n\n' +
      'Question: [the interview question, phrased naturally]\n\n' +
      'Why this question (1-2 sentences): [what specifically the interviewer is listening for in a good answer — which sub-dimensions of the competency, red flags to watch, etc.]\n\n' +
      'What a strong answer includes: [2-3 specific elements a strong candidate would address]\n\n' +
      'Keep the question focused, specific, and realistic. Avoid clichés like "greatest weakness." Total response under 200 words.';
  }

  function buildInterviewCritiquePrompt(competencyId, question, answer) {
    var comp = BEHAVIORAL_COMPETENCIES.find(function(c) { return c.id === competencyId; });
    if (!comp) return '';
    return 'You are an interview coach providing detailed feedback on a candidate\'s behavioral interview response.\n\n' +
      'TARGET COMPETENCY: ' + comp.name + '\n' +
      'QUESTION ASKED: ' + question + '\n\n' +
      'CANDIDATE\'S ANSWER:\n"' + answer + '"\n\n' +
      'Provide structured feedback in plain text (no markdown headers), approximately 300-400 words:\n\n' +
      '1. STAR Structure Assessment: Evaluate each of Situation, Task, Action, Result. Is each present? Balanced? Was Action the longest part?\n\n' +
      '2. Competency Signal: Does the answer demonstrate ' + comp.name + '? What specific elements signal it strongly? What would strengthen the signal?\n\n' +
      '3. Specificity: Are there concrete details, names, numbers, timeframes? Or vague generalities?\n\n' +
      '4. Personal Ownership: Does the candidate use "I" appropriately for their actions? Or hide behind "we"?\n\n' +
      '5. Top 2-3 suggestions to strengthen: Specific, actionable improvements the candidate could make for their next attempt.\n\n' +
      'Be specific and constructive. Do not validate uncritically — but do note what the candidate did well. End with ONE sentence of encouragement tied to a real strength in the answer.';
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1X: GLOSSARY
  // ═══════════════════════════════════════════════════════════════
  var GLOSSARY_TERMS = [
    { term: '504 Plan', def: 'A plan of accommodations for students with disabilities that substantially limit a major life activity, under Section 504 of the Rehabilitation Act. Does not provide specialized instruction; does provide accommodations.', module: 'School Psych' },
    { term: 'Achievement test', def: 'Measures what a student knows or can do in specific academic domains (reading, writing, math). Compared to cognitive tests, which measure underlying ability.', module: 'Cognitive / School Psych' },
    { term: 'Adaptive functioning', def: 'The ability to perform age-expected tasks of daily living — communication, self-care, socialization, motor. Required for Intellectual Disability eligibility. Measured via Vineland-3, ABAS-3.', module: 'School Psych' },
    { term: 'ADOS-2', def: 'Autism Diagnostic Observation Schedule, 2nd Ed. Structured interaction for assessing autism. Gold standard with ADI-R (parent interview).', module: 'School Psych' },
    { term: 'ASD', def: 'Autism Spectrum Disorder. IDEA eligibility category and DSM-5 diagnosis. Characterized by social-communication impairment and restricted/repetitive behaviors.', module: 'School Psych' },
    { term: 'Big 5 / OCEAN', def: 'Five-factor personality model — Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism. Empirically derived, cross-culturally validated, predicts real-world outcomes.', module: 'Personality' },
    { term: 'BIP (Behavior Intervention Plan)', def: 'Function-based plan addressing target behavior. Derived from FBA. Includes antecedent strategies, replacement behavior instruction, consequence strategies.', module: 'School Psych' },
    { term: 'C-SSRS', def: 'Columbia Suicide Severity Rating Scale. Gold-standard structured suicide risk assessment. Short version usable by trained school staff.', module: 'School Psych' },
    { term: 'CHC (Cattell-Horn-Carroll)', def: 'Dominant contemporary theory of cognitive abilities. Hierarchical model with g at top, 9+ broad abilities (Gf, Gc, Gs, Glr, Gsm, Gv, Ga, Gq, Grw), 70+ narrow abilities.', module: 'Cognitive' },
    { term: 'Cohen\'s d', def: 'Standardized mean difference. d=0.2 is small, 0.5 medium, 0.8 large. Converts effect across measurement scales into comparable units.', module: 'Personality (Research Literacy)' },
    { term: 'Confidence Interval (CI)', def: 'Range within which the true score likely falls. 95% CI = the score ± 1.96 SEM. Essential for interpreting test scores as ranges rather than points.', module: 'Cognitive / School Psych' },
    { term: 'Construct validity', def: 'Does the test actually measure the construct it claims to measure? Umbrella concept encompassing convergent, discriminant, factor-analytic, and predictive evidence.', module: 'Personality (Validity Primer)' },
    { term: 'Cronbach\'s alpha (α)', def: 'Measure of internal consistency. How well items within a scale agree. α ≥ 0.70 acceptable, 0.80+ preferred.', module: 'Personality (Validity Primer)' },
    { term: 'Dark Triad', def: 'Subclinical Machiavellianism, Narcissism, and Psychopathy — three personality traits that predict exploitative behavior. Related to HEXACO Honesty-Humility (inverse).', module: 'Personality' },
    { term: 'DISC', def: 'Personality inventory classifying respondents into Dominance, Influence, Steadiness, Conscientiousness. Weak empirical validity; popular in corporate team-building.', module: 'Employer / Personality' },
    { term: 'Disparate impact', def: 'When a selection procedure produces different outcomes for different demographic groups. Creates legal liability unless the procedure is validated as job-related under Uniform Guidelines (1978).', module: 'Employer' },
    { term: 'Dynamic assessment', def: 'Feuerstein\'s approach: test → teach/mediate → retest. Measures not just current performance but responsiveness to instruction. Valuable for ELLs and non-typical populations.', module: 'School Psych (Formative)' },
    { term: 'Eligibility (IDEA)', def: 'A student qualifies for special education services when: (1) they meet one of 13 categories, (2) the disability adversely affects educational performance, (3) they need specialized instruction. All three required.', module: 'School Psych' },
    { term: 'Eligibility (504)', def: 'Broader than IDEA. Any physical or mental impairment substantially limiting a major life activity. Accommodations only (no specialized instruction).', module: 'School Psych' },
    { term: 'Executive Function (EF)', def: 'Self-regulatory cognitive processes: working memory, inhibition, shifting, planning, organization. Measured by BRIEF-2, D-KEFS. Key in ADHD and TBI evaluations.', module: 'School Psych' },
    { term: 'Factor analysis', def: 'Statistical technique identifying underlying dimensions in correlational data. Big 5, HEXACO, and other trait models emerged from factor-analyzing trait adjectives.', module: 'Personality' },
    { term: 'FBA (Functional Behavior Assessment)', def: 'Systematic process to identify the FUNCTION of problem behavior (attention, escape, tangible, sensory). Foundation for building function-based Behavior Intervention Plans.', module: 'School Psych' },
    { term: 'FERPA', def: 'Family Educational Rights and Privacy Act. Federal law governing access to and privacy of educational records. Relevant for screening data, eval reports, test security.', module: 'School Psych' },
    { term: 'Flynn effect', def: 'The secular rise in mean IQ scores, about 3 points per decade over the 20th century. Drives periodic test renorming. Partially attenuating post-2000 in some countries.', module: 'Cognitive' },
    { term: 'FSIQ', def: 'Full Scale IQ. Composite score from cognitive battery (WISC-V, etc.). Summary of broad cognitive functioning but masks profile scatter.', module: 'Cognitive / School Psych' },
    { term: 'Gc / Crystallized', def: 'Depth and breadth of culturally acquired knowledge. Vocabulary, general information, language comprehension. CHC broad ability.', module: 'Cognitive' },
    { term: 'Gf / Fluid Reasoning', def: 'Novel problem-solving, pattern recognition, reasoning with unfamiliar material. Most heavily affected by Flynn effect. CHC broad ability.', module: 'Cognitive' },
    { term: 'Gs / Processing Speed', def: 'Fluency on simple repetitive cognitive tasks under time pressure. Timed subtests measure this. Penalizes students with ADHD, motor or processing-speed deficits.', module: 'Cognitive' },
    { term: 'HEXACO', def: 'Six-factor personality model (Honesty-Humility, Emotionality, eXtraversion, Agreeableness, Conscientiousness, Openness). Adds H factor missing from Big 5.', module: 'Personality' },
    { term: 'Holland RIASEC', def: 'Career interest model with 6 codes: Realistic, Investigative, Artistic, Social, Enterprising, Conventional. Hexagonal structure with adjacent codes more similar.', module: 'Career' },
    { term: 'IDEA', def: 'Individuals with Disabilities Education Act. Federal law entitling qualifying students to special education and related services. Defines the 13 eligibility categories and procedural safeguards.', module: 'School Psych' },
    { term: 'IEP (Individualized Education Program)', def: 'Legally-binding document outlining specialized instruction, services, accommodations, and goals for a student with a disability under IDEA. Annual review required.', module: 'School Psych' },
    { term: 'IEE (Independent Educational Evaluation)', def: 'Parent\'s right under IDEA to request an evaluation by a qualified professional outside the school district. May be at public expense if parents disagree with school\'s eval.', module: 'School Psych' },
    { term: 'Internal consistency', def: 'How well items within a scale agree. Usually measured with Cronbach\'s alpha. High α means items cluster meaningfully.', module: 'Personality (Validity Primer)' },
    { term: 'IPIP', def: 'International Personality Item Pool. Public-domain item bank used for personality research. Big 5 items in this tool are from IPIP.', module: 'Personality' },
    { term: 'Ipsatization', def: 'Centering scores on a person\'s own mean to reveal RELATIVE priorities. Used in values inventories (Schwartz) to reveal which values are relatively more/less important to this individual.', module: 'Career (Schwartz Values)' },
    { term: 'LRE (Least Restrictive Environment)', def: 'Federal requirement under IDEA that students with disabilities be educated with non-disabled peers to the maximum extent appropriate. Drives placement decisions.', module: 'School Psych' },
    { term: 'MBTI (Myers-Briggs Type Indicator)', def: 'Commercial personality assessment with 16 types from 4 dichotomies (E/I, S/N, T/F, J/P). Poor test-retest reliability; widely criticized in academic psychology.', module: 'Personality' },
    { term: 'MTSS / RTI', def: 'Multi-Tiered System of Supports / Response to Intervention. Framework for providing increasingly intensive academic and behavioral support before special ed referral.', module: 'School Psych' },
    { term: 'NNT (Number Needed to Treat)', def: 'How many patients must receive treatment for one additional good outcome. Smaller = stronger effect. Clinical interpretation of effect size.', module: 'Personality (Research Literacy)' },
    { term: 'OHI (Other Health Impairment)', def: 'IDEA eligibility category for chronic health conditions limiting alertness — ADHD most common. Allows IEP when condition adversely affects educational performance.', module: 'School Psych' },
    { term: 'Percentile rank', def: 'Percentage of the norm sample scoring AT OR BELOW this score. Percentile rank of 25 means 25% of peers scored at/below — student is at the 25th percentile. NOT the same as "percent correct."', module: 'School Psych' },
    { term: 'Point-estimate fallacy', def: 'Treating a test score as an exact value rather than a range. Common error: "FSIQ is 72, therefore student has ID." Correct: "FSIQ is 72 with 95% CI 67-77, straddling the ID threshold."', module: 'School Psych (SEM)' },
    { term: 'Predictive validity', def: 'Does the test predict future outcomes it should? Big 5 Conscientiousness predicts job performance ~r=0.23 (modest but meaningful).', module: 'Personality (Validity Primer)' },
    { term: 'Pre-registration', def: 'Publicly logging hypothesis and analysis plan BEFORE collecting data. Modern gold standard to reduce p-hacking and publication bias.', module: 'Personality (Research Literacy)' },
    { term: 'Procedural safeguards', def: 'Parent rights under IDEA including Prior Written Notice, informed consent, IEE, records access, due process, mediation. Provided at least annually.', module: 'School Psych' },
    { term: 'PSW (Pattern of Strengths and Weaknesses)', def: 'SLD identification method requiring: (1) academic skill deficit, (2) cognitive processing weakness tied to that academic area, (3) strengths preserved in other domains. Current dominant method.', module: 'School Psych' },
    { term: 'PTSD', def: 'Post-Traumatic Stress Disorder. DSM-5 diagnosis requiring exposure to qualifying event + re-experiencing + avoidance + hyperarousal + duration. Assessed with UCLA PTSD-RI, CPSS-V.', module: 'School Psych (Trauma)' },
    { term: 'Reliability', def: 'Consistency of measurement. Types: test-retest, internal consistency (α), inter-rater. Higher = less noise. Prerequisite for validity.', module: 'Personality (Validity Primer)' },
    { term: 'Safety Planning Intervention', def: 'Evidence-based collaborative plan with suicidal individuals (Stanley-Brown). 6-step plan: warning signs, coping strategies, social distractions, supports, professionals, means restriction. Replaces obsolete "no-harm contracts."', module: 'School Psych (Crisis)' },
    { term: 'Schwartz Values', def: '10-value cross-culturally validated model: Self-Direction, Stimulation, Hedonism, Achievement, Power, Security, Conformity, Tradition, Benevolence, Universalism. Arranged in circumplex.', module: 'Career' },
    { term: 'SEM (Standard Error of Measurement)', def: 'Score range attributable to measurement error. SEM = SD × √(1 − reliability). WISC-V FSIQ SEM ≈ 3 points. Drives confidence interval calculation.', module: 'School Psych' },
    { term: 'SLD (Specific Learning Disability)', def: 'IDEA eligibility category for disorders in basic psychological processes affecting learning (dyslexia, dysgraphia, dyscalculia). Most common SLD: reading-based.', module: 'School Psych' },
    { term: 'STAR method', def: 'Interview answer framework: Situation, Task, Action, Result. Standard for behavioral interview responses. Covered in Interview Prep sub-view.', module: 'Employer' },
    { term: 'Structured interview', def: 'Interview format where same questions are asked of every candidate in same order with responses scored against rubric. Higher validity than unstructured (r=0.51 vs r=0.19).', module: 'Employer' },
    { term: 'Test-retest reliability', def: 'Correlation between scores when the same person takes the test twice. MBTI retest ~0.50 (poor); Big 5 retest ~0.70-0.90 (good); WISC-V FSIQ ~0.96 (excellent).', module: 'Personality (Validity Primer)' },
    { term: 'Twice-exceptional (2E)', def: 'A student who is both gifted AND has a disability. Commonly G+SLD, G+ADHD, G+ASD. Masking in both directions leads to under-identification.', module: 'School Psych' },
    { term: 'Uniform Guidelines', def: '1978 federal selection guidelines requiring validation of employment selection procedures that produce disparate impact. Cornerstone of hiring assessment law.', module: 'Employer' },
    { term: 'Universal screening', def: 'Brief standardized assessment given to all students (or a cohort) to identify those needing Tier 2 or Tier 3 support. For academics (DIBELS) and mental health (BASC-3 BESS).', module: 'School Psych' },
    { term: 'Validity', def: 'Does the test measure what it claims to measure? Types: content, criterion (concurrent, predictive), construct (convergent, discriminant). See Validity & Reliability Primer for full breakdown.', module: 'Personality (Validity Primer)' },
    { term: 'Vocational Rehabilitation (VR)', def: 'State agency providing training, education, job placement, and supports for qualifying adults with disabilities. Transition-age students may apply in junior year.', module: 'School Psych (Transition)' },
    { term: 'WISC-V', def: 'Wechsler Intelligence Scale for Children, 5th Edition. Ages 6-16. Yields FSIQ plus 5 primary indexes (VCI, VSI, FRI, WMI, PSI). Reliability α=0.96.', module: 'Cognitive' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1Y: CAREER DEVELOPMENT THEORIES
  // ═══════════════════════════════════════════════════════════════
  var CAREER_THEORIES = [
    {
      id: 'super',
      name: 'Super\'s Life-Span, Life-Space Theory',
      author: 'Donald Super (1953-1990s)',
      core: 'Career development is a life-long process integrated with self-concept development. People move through predictable stages (growth, exploration, establishment, maintenance, disengagement) and play multiple life roles simultaneously (child, student, worker, spouse, parent, citizen, leisurite).',
      keyconcepts: 'Life-Career Rainbow (visualizing life roles across lifespan), career maturity (readiness for developmental tasks at each stage), self-concept implementation (career choice as expression of self-concept).',
      implications: 'Career counseling should match intervention to developmental stage. Assess career maturity before pushing decisions. Consider multiple life roles, not just work. Expect "mini-cycles" of exploration within later stages (e.g., adults exploring encore careers at 55).',
      instruments: 'Adult Career Concerns Inventory (ACCI), Career Development Inventory (CDI), Salience Inventory.'
    },
    {
      id: 'holland',
      name: 'Holland\'s Theory of Vocational Personalities',
      author: 'John Holland (1959-1997)',
      core: 'People and work environments can both be characterized on 6 dimensions (RIASEC). Satisfaction and persistence result from person-environment congruence — when a person\'s interests match the environment\'s demands. Covered in depth in the Career module\'s RIASEC sub-view.',
      keyconcepts: 'Hexagonal structure (RIASEC), congruence (person-environment match), consistency (related codes like R-I more coherent than R-S), differentiation (clear profile vs flat profile).',
      implications: 'Assessment of interests AND environments matters. Flat or internally-inconsistent codes suggest career indecision. Highest prediction of tenure and satisfaction comes from congruence.',
      instruments: 'Strong Interest Inventory (SII), Self-Directed Search (SDS), O*NET Interest Profiler (public domain — see Career module).'
    },
    {
      id: 'gottfredson',
      name: 'Gottfredson\'s Circumscription and Compromise',
      author: 'Linda Gottfredson (1981-2002)',
      core: 'Children progressively ELIMINATE career options based on perceived appropriateness (circumscription) and then, faced with real-world constraints, COMPROMISE on their ideal. Elimination typically occurs in age-related order: first by sex-type (ages 6-8), then by prestige (ages 9-13), then by interest fit (ages 14+). Later eliminations are hardest to reverse.',
      keyconcepts: 'Self-concept "zones of acceptable alternatives," circumscription (eliminating options), compromise (choosing among remaining), accessibility (perceived likelihood of attaining).',
      implications: 'Gender-stereotyped career limitations are usually SET by age 8 and are very hard to undo. Career interventions targeting young children may be more efficacious than college-age interventions. Career counselors should help clients recognize eliminations they\'ve made unconsciously.',
      instruments: 'Career exploration inventories adapted for younger students; card-sort tasks; zones-of-acceptable-alternatives assessment.'
    },
    {
      id: 'krumboltz',
      name: 'Krumboltz\'s Planned Happenstance / Happenstance Learning Theory',
      author: 'John Krumboltz (1976-2011)',
      core: 'Unplanned events shape careers far more than traditional matching models acknowledge. Rather than trying to predict and plan, effective career development involves CULTIVATING openness to unplanned events and skill at capitalizing on them when they occur.',
      keyconcepts: 'Planned happenstance skills (curiosity, persistence, flexibility, optimism, risk-taking), unplanned events as opportunities, indecision as reasonable response to future uncertainty.',
      implications: 'Reframes "career indecision" as healthy openness. Career counseling includes teaching students to seek new experiences, pursue serendipity, reframe unplanned setbacks as possibilities. Resonates strongly with today\'s volatile job market and career-change norms.',
      instruments: 'Planned Happenstance Career Inventory, Career Beliefs Inventory.'
    },
    {
      id: 'scct',
      name: 'Social Cognitive Career Theory (SCCT)',
      author: 'Robert Lent, Steven Brown, Gail Hackett (1994+)',
      core: 'Adapts Bandura\'s social cognitive theory to careers. Career choice and persistence are shaped by three cognitive variables: self-efficacy (belief in one\'s ability to succeed at tasks), outcome expectations (beliefs about what happens if you succeed), and goals. These are shaped by learning experiences, personal inputs (gender, race, disability), and environment.',
      keyconcepts: 'Self-efficacy (most central predictor), outcome expectations, contextual supports and barriers, learning experiences. Accounts for why equally interested/talented students choose different paths.',
      implications: 'Strong self-efficacy is teachable through mastery experiences, vicarious learning, verbal persuasion, and physiological cues. Targeted interventions can expand career options for students who have been discouraged from certain fields (STEM for girls, helping professions for boys, higher ed for first-gen students, etc.).',
      instruments: 'Career Decision Self-Efficacy Scale (CDSE), Outcome Expectations scales tied to specific domains (Math OE, Science OE).'
    },
    {
      id: 'cognitive',
      name: 'Cognitive Information Processing (CIP)',
      author: 'Peterson, Sampson, Reardon (1990s+)',
      core: 'Models career decision-making as an information-processing task: the Pyramid of Information Processing Domains has self-knowledge and occupation-knowledge at the base, decision-making (CASVE: Communication, Analysis, Synthesis, Valuing, Execution) in the middle, and executive processing (meta-cognition) at top.',
      keyconcepts: 'Pyramid model, CASVE cycle, dysfunctional career thoughts (pervasive over-generalizations, decision-making confusion, external conflict, commitment anxiety).',
      implications: 'Helps diagnose WHERE in decision-making a client is stuck. Some clients need information; others need decision-making skills; others need to challenge dysfunctional thoughts. Career Thoughts Inventory (CTI) targets the thought-distortion piece.',
      instruments: 'Career Thoughts Inventory (CTI), self-knowledge inventories, occupational knowledge assessments.'
    },
    {
      id: 'nontraditional',
      name: 'Critical & Post-Modern Perspectives',
      author: 'Various (2000s+)',
      core: 'Traditional career theories assume individual choice in a meritocratic market. Critical perspectives foreground: systemic inequities (race, class, gender, disability, immigration status), labor market realities (not everyone has access to matched work), life-work integration beyond paid employment (caregiving, activism, creative work without pay). Frameworks: Psychology of Working (Blustein), Career Construction Theory (Savickas).',
      keyconcepts: 'Work-role salience varies by life circumstances. "Decent work" (ILO framework) as basic psychological need. Narrative construction of career identity. Privilege and barrier analysis.',
      implications: 'Career counseling for students with fewer options looks different — may prioritize financial survival, family responsibility, or caregiving over "passion." Counselor acknowledges the structural constraints clients face without pretending they aren\'t there.',
      instruments: 'Decent Work Scale, Career Construction Interview (Savickas), Psychology of Working Career Counseling approaches.'
    }
  ];

  var CAREER_THEORY_INTEGRATION = [
    { when: 'Early career exploration (K-12, undergrad)', theories: 'Super (developmental stage), Gottfredson (uncovering eliminations), Holland (interest identification), SCCT (self-efficacy building)', approach: 'Broad exploration, experiential learning, challenging stereotyped eliminations, building self-efficacy across domains.' },
    { when: 'Career indecision or stuck clients', theories: 'Krumboltz (reframe indecision), CIP (identify where decision-making breaks down), SCCT (low self-efficacy?)', approach: 'Diagnose WHERE the stuck-ness is. Is it information, skills, self-efficacy, or dysfunctional thoughts? Match intervention to diagnosis.' },
    { when: 'Mid-career or career change', theories: 'Super (life stage, multiple roles), Krumboltz (openness to happenstance), Savickas (narrative reconstruction)', approach: 'Acknowledge multiple life roles and transitions. Help client construct meaningful career narrative. Support openness to unplanned directions.' },
    { when: 'Working with marginalized or high-constraint clients', theories: 'Blustein Psychology of Working, critical perspectives, SCCT (barrier analysis)', approach: 'Foreground systemic constraints. "Decent work" as legitimate goal. Support psychological health separate from career success metrics.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1Z: PARENT HANDOUT GENERATOR
  // ═══════════════════════════════════════════════════════════════
  function buildParentHandoutPrompt(studentName, grade, findings, eligibility, recs, tone) {
    return 'You are a school psychologist creating a plain-language handout for a parent explaining a psychoeducational evaluation. Audience: a caring parent who is NOT a psychologist or educator. The handout must be warm, accessible, and strengths-forward — without hiding real concerns.\n\n' +
      'STUDENT: ' + studentName + ', ' + grade + '\n\n' +
      'KEY FINDINGS (from the full evaluation report):\n' + findings + '\n\n' +
      'ELIGIBILITY DETERMINATION (if any): ' + (eligibility || 'Not yet determined / Not applicable') + '\n\n' +
      'RECOMMENDATIONS (key ones to highlight): ' + (recs || 'To be discussed at team meeting') + '\n\n' +
      'TONE REQUESTED: ' + (tone || 'warm, clear, jargon-light, strengths-first') + '\n\n' +
      'Write a ~400-500 word handout in plain text (no markdown headers; use short paragraphs with clear topic sentences). Structure:\n\n' +
      '1. Opening paragraph acknowledging the family\'s role and care, naming what the evaluation tried to answer.\n\n' +
      '2. "What we learned about [Student\'s] strengths" (1-2 paragraphs): lead with strengths in accessible language. Examples: "She\'s a strong verbal thinker who notices patterns other kids miss."\n\n' +
      '3. "What we learned about where [Student] struggles" (1-2 paragraphs): describe the challenges with specificity and without pathologizing. Connect to what parents might have noticed. No bare test scores.\n\n' +
      '4. "What this means for school" (1 paragraph): translate findings into practical implications for the classroom and home.\n\n' +
      '5. "What happens next" (1 paragraph): clear next steps, including any team meeting, proposed supports, and invitation to ask questions.\n\n' +
      '6. "Questions to ask the team" — 4-5 specific questions the family can bring to the next meeting.\n\n' +
      'Rules:\n- NO technical jargon without immediate plain-language translation.\n- NEVER report bare standard scores or percentiles (parents don\'t know what SS=85 means; instead say "in the Low Average range, which is the 16th percentile, meaning about 16 out of 100 same-age peers would score at or below this level").\n- Use the student\'s first name throughout, not "the student."\n- Use "you" and "your child" to speak directly to the parent.\n- Do NOT use em dashes, en dashes, or bullet points except where explicitly structured above. Use commas, periods, colons, semicolons, parentheses.\n- If the findings include diagnosis or eligibility language, explain what the label means in functional terms (what it says about your child\'s needs) AND what it does NOT mean (common misconceptions to head off).\n\nBegin the handout now.';
  }

  var HANDOUT_TONE_OPTIONS = [
    { id: 'warm', label: 'Warm and reassuring', desc: 'Standard school-psych communication tone. Acknowledges family as partner.' },
    { id: 'concise', label: 'Concise and direct', desc: 'For families who want facts without extra framing.' },
    { id: 'detailed', label: 'Detailed with context', desc: 'For families new to special education process who need more scaffolding.' },
    { id: 'bilingual', label: 'Simple language for translation', desc: 'Simplified sentence structure and vocabulary; easier for accurate translation to another language.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1AA: CLINICAL INTERVIEWING SKILLS
  // ═══════════════════════════════════════════════════════════════
  var INTERVIEW_PURPOSES = [
    { purpose: 'Build rapport', body: 'A successful eval depends on the student showing up as their best self. The first 5-10 minutes of any interview should establish warmth and trust. Ask easy questions first (favorite activities, pets, weekend plans) before harder content. Your body language, pace, and comfort matter.' },
    { purpose: 'Gather developmental and historical information', body: 'Birth history, milestones, medical conditions, prior evaluations, prior interventions, family learning history, environmental factors. This information contextualizes test scores.' },
    { purpose: 'Observe behavior systematically', body: 'Interview IS a behavioral observation. Note: attention span, response to questions, anxiety level, social engagement, language quality, self-report capacity. These observations shape score interpretation.' },
    { purpose: 'Identify the student\'s perspective', body: 'Especially for older students: what do THEY think is going on? What\'s hard? What helps? What do they wish adults understood? Student voice is clinically irreplaceable and often legally required for transition-age cases.' },
    { purpose: 'Generate hypotheses', body: 'Interview data shapes test selection. Parent reports of "can\'t sit still" combined with teacher reports of "can focus when interested" points toward ADHD-vs-other-EF-differential and affects battery choice.' }
  ];

  var INTERVIEW_BY_AGE = [
    { age: 'Preschool (3-5)', approach: 'Primary source is parent/caregiver. Brief child-engagement through play-based observation (doll-play, draw-a-person). Child self-report data is limited; adult observers carry most weight. Very short interview segments with child (5-10 min max).', tips: 'Meet the child at their developmental level. Floor-sitting often works. Have concrete objects. Follow their interests.' },
    { age: 'Early elementary (6-8)', approach: 'Concrete-operational thinking. Child can report on likes/dislikes, school, friends — but abstract reasoning and self-reflection are limited. Parent and teacher remain primary informants for detailed history.', tips: 'Use concrete examples not hypotheticals. "Tell me about a time when..." beats "What do you do when...". Visual supports help (drawings, picture cards).' },
    { age: 'Upper elementary (9-11)', approach: 'Growing self-awareness and metacognition. Child can report on internal states ("I feel nervous when..."), reflect on own performance, compare themselves to peers. Still benefit from adult corroboration.', tips: 'Normalize: "Lots of kids tell me..." Draw out specifics with follow-up questions. Respect growing privacy needs.' },
    { age: 'Middle school (12-14)', approach: 'Developmentally sensitive age. Students may be guarded, defensive, or oppositional. Peer relationships increasingly central. Identity questions (academic, social, family) emerging.', tips: 'Acknowledge their expertise on themselves. "You know you better than anyone." Respect their reluctance as reasonable (not "resistance"). Avoid talking "at" them. Confidentiality is especially important.' },
    { age: 'High school (15-18)', approach: 'Capable of sophisticated self-report and reflection. Often more engaged with the process when they understand the purpose and their role. Transition-age interviews center on student goals, preferences, agency.', tips: 'Treat as adult. Be transparent about evaluation purpose and who sees results. Ask their perspective on proposed supports. Honor their perspective even when it differs from parent or school.' }
  ];

  var INTERVIEW_MI_BASICS = [
    { concept: 'OARS', body: 'The four core MI micro-skills: Open-ended questions, Affirmations (genuine strengths), Reflections (paraphrase what student said to confirm understanding), Summaries (recap of key themes before moving on). Works across clinical and non-clinical contexts.' },
    { concept: 'Autonomy support', body: 'Emphasize the student\'s right to make their own choices and have their own perspective. "You know yourself better than anyone. Tell me what you think." Reduces resistance, increases disclosure.' },
    { concept: 'Roll with resistance', body: 'When a student pushes back, don\'t push harder. Acknowledge their concern ("It makes sense you\'re frustrated with all these meetings"), then redirect gently. Arguing rarely works and often damages rapport.' },
    { concept: 'Elicit-provide-elicit', body: 'Rather than lecturing: first ASK what the student knows or thinks ("What do you understand about why we\'re meeting?"), PROVIDE the missing or corrective information, then ASK again ("What questions does that bring up?"). Maintains engagement and checks understanding.' },
    { concept: 'Change talk', body: 'Listen for and reinforce the student\'s own expressions of wanting change, needing change, or reasons for change. "I want to do better in math" or "I\'m tired of being behind" is change talk — lean into it, don\'t let it pass.' }
  ];

  var INTERVIEW_TRAUMA_SENSITIVE = [
    { rule: 'Predict before you ask', body: '"I\'m going to ask you some questions about what\'s been hard at school. Some may feel personal. You can always say \'I\'d rather not answer\' or \'can we take a break?\' That\'s fine with me." Advance notice reduces threat.' },
    { rule: 'Watch for trauma signals', body: 'Sudden topic shifts, physical withdrawal, sudden fatigue, dissociative behaviors (blank stares, slow response), tears. Notice, do not push, offer a break. "That seemed hard to think about. Let\'s pause."' },
    { rule: 'Avoid detailed trauma narrative', body: 'Standard clinical interview should not elicit detailed trauma descriptions. That\'s therapy territory with a trained clinician. If student volunteers, listen respectfully, validate briefly, and refer to trauma-specialist follow-up.' },
    { rule: 'Mandated reporting framing upfront', body: '"What you share with me is private, UNLESS I hear something that makes me worried about your safety or someone else\'s. Then I have to tell someone who can help. Does that make sense?" Informed consent upfront respects the student and reduces surprise.' },
    { rule: 'End on stability', body: 'After a difficult interview, close with stabilizing content. "Before we finish, tell me one thing that went well this week." Or a brief grounding exercise if needed.' }
  ];

  var INTERVIEW_PITFALLS_CLINICAL = [
    { pitfall: 'Leading the student', problem: 'Asking "Do you have trouble with math?" cues a specific answer. Better: "Which subjects feel easy? Which feel harder?" Open-ended questions yield more diagnostic information.', fix: 'Phrase questions neutrally. Don\'t telegraph the answer you\'re expecting.' },
    { pitfall: 'Rapid-fire questions', problem: 'Firing questions without pauses overwhelms students, especially younger or anxious ones. Conversation turns into interrogation.', fix: 'Build in silence. Use reflections and summaries. Ask one question, wait, listen.' },
    { pitfall: 'Interrupting with reassurance', problem: 'When a student says something uncomfortable and you immediately jump in with "but you\'re doing great at..." you\'ve just signaled that their real experience isn\'t welcome.', fix: 'Sit with the difficult content. Acknowledge it before moving on: "That sounds hard. Thanks for telling me."' },
    { pitfall: 'Note-taking at the expense of presence', problem: 'Writing while the student talks divides attention and sends "I\'m recording this" signal.', fix: 'Use key-word shorthand. Look up frequently. Take fuller notes between questions or after.' },
    { pitfall: 'Running late on rapport', problem: 'Skipping rapport to save time almost always costs more time later (disengaged student, unreliable test performance, needing to redo).', fix: 'Invest 5-10 min in rapport at the start. It pays back through the rest of the eval.' },
    { pitfall: 'Ignoring the silence', problem: 'Students often think BEFORE they answer. Rushing to fill silence denies them processing time.', fix: 'Count to 5 silently after asking a question before repeating or rephrasing.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1AB: NEUROPSYCHOLOGY BASICS
  // ═══════════════════════════════════════════════════════════════
  var NEUROPSYCH_BATTERIES = [
    { name: 'NEPSY-II (A Developmental NEuroPSYchological Assessment)', age: '3-16', domains: 'Attention & executive functioning, Language, Memory & learning, Sensorimotor, Social perception, Visuospatial processing', what: '32 subtests spanning 6 domains; clinician selects relevant subtests based on referral question rather than full battery. Designed for developmental/school-based neuropsych eval.', strengths: 'Broad coverage, developmentally appropriate, flexible selection. Often a primary school-neuropsych instrument.', weaknesses: 'Some subtests have limited normative data at age extremes. Requires specialized training to interpret.' },
    { name: 'D-KEFS (Delis-Kaplan Executive Function System)', age: '8-89', domains: 'Executive function (flexibility, inhibition, planning, fluency, abstraction)', what: '9 subtests targeting executive function: Trail Making, Verbal Fluency, Design Fluency, Color-Word Interference (Stroop), Sorting Test, Twenty Questions, Word Context, Tower Test, Proverb Test.', strengths: 'Gold-standard performance-based EF battery. Richer information than rating scales (BRIEF).', weaknesses: 'Time-intensive to administer. Test-retest variability on some subtests. Correlation with real-world EF is imperfect (practice effect.)' },
    { name: 'WRAML-2 (Wide Range Assessment of Memory and Learning)', age: '5-90', domains: 'Memory (verbal, visual, working memory)', what: '4 core subtests and multiple supplementary subtests for memory assessment. Often used in TBI, learning disability, and memory-complaint evaluations.', strengths: 'Broad memory coverage, well-normed. Sensitive to acquired memory impairment.', weaknesses: 'Some subtests can be affected by attention or motivation. Interpretation requires neuropsych training.' },
    { name: 'CVLT-C / CVLT-3 (California Verbal Learning Test)', age: 'Children 5-16 / Adolescent-Adult 16-90', domains: 'Verbal learning and memory', what: 'Word-list learning paradigm with multiple trials, interference, delayed recall, recognition. Produces rich learning-curve data.', strengths: 'Most widely-used word-list learning test. Sensitive to pattern of impairment (encoding vs consolidation vs retrieval).', weaknesses: 'Strictly verbal memory — doesn\'t cover visual memory. Requires neuropsych interpretation.' },
    { name: 'Luria-Nebraska Neuropsychological Battery-Children\'s Revision (LNNB-C)', age: '8-12', domains: 'Motor, rhythm, tactile, visual, receptive speech, expressive speech, writing, reading, arithmetic, memory, intellectual processes', what: 'Comprehensive fixed battery based on Luria\'s neuropsychological approach. Historically important, less commonly used now than flexible Boston-process approach.', strengths: 'Structured, theory-grounded (Luria). Clear procedural manual.', weaknesses: 'Older norms. Less flexible than NEPSY-II. Less commonly trained in contemporary neuropsych programs.' },
    { name: 'NIH Toolbox Cognition Battery', age: '3-85', domains: 'Executive function, attention, processing speed, working memory, episodic memory, language', what: 'Computerized battery developed by NIH. Free-use for research and healthcare. 7 subtests; administration via iPad or computer.', strengths: 'Standardized across studies, free, quick, digital. Growing research base.', weaknesses: 'Relatively new; norms and clinical validity still developing. Digital format may disadvantage some users.' }
  ];

  var NEUROPSYCH_VS_SCHOOLPSY = [
    { question: 'Credential', neuropsy: 'Board-certified neuropsychologist (ABPP-CN) or licensed psychologist with specialized training in clinical neuropsychology; typically PhD or PsyD plus 2-year postdoc fellowship in neuropsychology.', schoolpsy: 'School psychologist (EdS, MA+CAGS, or PhD/PsyD); NASP-level training includes basic neuropsych literacy but not specialized neuropsych training.' },
    { question: 'Scope', neuropsy: 'Brain-behavior relationships; differential diagnosis of neurocognitive disorders; pre/post-surgical assessment; rehab planning after brain injury; dementia workup; medication response evaluation.', schoolpsy: 'Educational eligibility; academic-intervention planning; school-based behavioral support; IEP team participation.' },
    { question: 'Typical length', neuropsy: '6-8+ hours of testing across 1-2 days. Comprehensive reports (20-40 pages).', schoolpsy: 'Typically 3-6 hours spread across sessions. Reports (8-20 pages) focused on educational questions.' },
    { question: 'When to refer to neuropsych', neuropsy: 'Acquired brain injury, stroke, neurological conditions (epilepsy, brain tumor, MS, cerebral palsy with cognitive questions), atypical or complex profile not explained by standard school eval, medical/legal decisions requiring comprehensive documentation, pre/post intervention monitoring for medical treatments.', schoolpsy: 'Most K-12 eligibility questions (SLD, OHI, ID, SLI, ASD in typical presentations), classroom-focused intervention planning, mental health screening, progress monitoring.' }
  ];

  var NEUROPSYCH_DOMAIN_ASSESSMENT = [
    { domain: 'Attention', subdomains: 'Selective attention, sustained attention, divided attention, working memory', tools: 'NEPSY-II Attention subtests, D-KEFS Trail Making, CPT-3 (Conners Continuous Performance Test), Test of Everyday Attention (TEA-Ch)' },
    { domain: 'Executive Function', subdomains: 'Inhibition, shifting/flexibility, planning, organization, working memory, fluency, self-monitoring', tools: 'D-KEFS (full battery), NEPSY-II EF subtests, BRIEF-2 (rating scale complement)' },
    { domain: 'Memory', subdomains: 'Verbal learning/memory, visual memory, working memory, long-term retention', tools: 'CVLT-C/3, WRAML-2, NEPSY-II Memory & Learning subtests, WMS-IV (adults)' },
    { domain: 'Language', subdomains: 'Receptive language, expressive language, naming, phonological processing, discourse', tools: 'NEPSY-II Language subtests, CELF-5 (language battery), Boston Naming Test, CTOPP-2 (phonological)' },
    { domain: 'Visuospatial', subdomains: 'Visual perception, visuospatial reasoning, construction, visual-motor integration', tools: 'NEPSY-II Visuospatial subtests, Rey Complex Figure, Beery VMI, Judgment of Line Orientation' },
    { domain: 'Sensorimotor', subdomains: 'Fine motor, sensorimotor integration, grip strength, finger tapping', tools: 'NEPSY-II Sensorimotor subtests, Beery VMI, Grooved Pegboard, Finger Tapping' },
    { domain: 'Social Cognition', subdomains: 'Theory of mind, emotion recognition, social judgment', tools: 'NEPSY-II Social Perception subtests, ADOS-2 (for autism), Reading the Mind in the Eyes Test' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1AC: CULTURALLY RESPONSIVE ASSESSMENT
  // ═══════════════════════════════════════════════════════════════
  var CRA_PRINCIPLES = [
    { title: 'Culture is not a deficit', body: 'Cultural difference is not cognitive or behavioral deficiency. A student\'s behaviors (eye-contact, volume, turn-taking, time-orientation, help-seeking) may reflect cultural norms rather than pathology. When assessment assumes majority culture as baseline, non-majority students appear "abnormal" on instruments designed for the majority.' },
    { title: 'Referral bias begins before testing', body: 'Different demographic groups are referred for evaluation at different rates for different concerns. Black boys are over-referred for behavioral concerns and under-referred for giftedness. Asian students are under-referred for LD. Latino boys are over-referred for SLD. Referral patterns shape what gets tested.' },
    { title: 'Examiner effects are real', body: 'Students may perform differently with examiners of their own race/culture vs. other cultures. Stereotype threat (awareness of negative stereotypes about one\'s group) has documented effects on cognitive test performance. Same-race/same-culture examiners often yield different (typically higher) scores for minoritized students.' },
    { title: 'Test translation ≠ cultural equivalence', body: 'A Spanish-translated WISC-V is not equivalent to the English WISC-V. Item difficulty shifts with language. Vocabulary items reference culture-specific content. Translated tests need independent standardization and validity evidence, not just translation.' },
    { title: 'Acculturation matters within groups', body: 'A recently-immigrated Chinese student and a 4th-generation Chinese-American student likely differ on many measures despite sharing ethnic identity. Assessment should gather acculturation information (language dominance at home, years in country, cultural practices) rather than treating ethnic groups as homogeneous.' },
    { title: 'Bilingual is not half of each', body: 'A bilingual student may have strong receptive Spanish and weaker expressive Spanish; strong academic English and weaker social English; and yet have stronger cognition than English-only testing reveals. Assess in both languages when possible. Use conceptual scoring (credit for correct answers in either language).' },
    { title: 'Family is the primary cultural informant', body: 'Culturally competent assessment means asking the family, not assuming. What does the family consider normal developmental milestones? How are academic challenges understood in the culture? What help-seeking behaviors are culturally sanctioned? What are the goals for the child?' },
    { title: 'Use the DSM-5-TR Cultural Formulation Interview', body: 'A 16-item semi-structured interview (2013, revised 2022) designed to elicit client/family understanding of the problem in cultural context. Free, available online via APA. Practical tool for any cross-cultural clinical work.' }
  ];

  var CRA_POPULATIONS = [
    { group: 'Black / African-American students', considerations: 'Historical legacy of IQ testing harm (Larry P. v. Riles). Disproportionate overrepresentation in special ed (EBD, ID), under-representation in gifted. Stereotype threat effects documented on cognitive measures. Dialect differences (AAVE) can be misread as language impairment. Trauma and racism-related stress may contribute to behavioral presentations.', practices: 'Use culturally-fair measures (UNIT-2, KABC-II). Bracket language when dialect may affect oral language scoring. Ask about experiences with racism as context. Involve family as cultural informant.' },
    { group: 'Latino / Hispanic students', considerations: 'Enormous variability across origin countries (Mexico, Central America, Caribbean, South America), generations, language environments. ELL status is common but not universal. Varies dramatically by SES, immigration status, and documentation status. Family centered cultural norms.', practices: 'Assess language proficiency in BOTH English and Spanish before selecting language of testing. Bilingual assessment ideal for partial English proficiency. Involve family thoroughly. Respect familismo (family priority).' },
    { group: 'Asian / Pacific Islander students', considerations: 'Diverse: Chinese, Korean, Japanese, Vietnamese, Filipino, Indian, Pacific Islander — each distinct. Model-minority stereotype leads to under-identification of LD and behavioral concerns. Academic-achievement pressure varies by family. Mental health stigma may suppress help-seeking.', practices: 'Don\'t assume high academic expectations = no concerns. Screen for internalizing issues (often masked). Involve family while respecting cultural reluctance around mental health framing.' },
    { group: 'Indigenous / Native American students', considerations: 'Sovereign nations with distinct cultural traditions. Long-term historical trauma from education (residential schools, cultural suppression). Rural/urban differences enormous. Language preservation and revitalization efforts. Extended-family involvement in child-rearing norms.', practices: 'Work WITH tribal systems where applicable. Use culturally-grounded measures where available. Respect connection to land, ancestral knowledge. Don\'t pathologize traditional practices.' },
    { group: 'Refugee / newcomer students', considerations: 'Trauma exposure common (pre-migration, migration, post-migration). Interrupted formal education typical. Multiple languages often. Family separation common. Acculturative stress ongoing. May present with academic delay that reflects educational gap, not ability.', practices: 'Trauma-informed assessment approach (see Trauma-Informed sub-view). Dynamic assessment of learning potential. Delay SLD determination until educational gap can be addressed. Community partnerships with resettlement agencies.' },
    { group: 'Multiracial / multicultural students', considerations: 'Cultural identity formation complex. May experience not-fitting in multiple communities. Racial/ethnic categorical systems (including IEP demographic data) may not reflect identity. Family cultural transmission varies.', practices: 'Don\'t force single-category identity. Ask the student how they identify. Respect family\'s cultural transmission preferences without stereotyping.' }
  ];

  var CRA_INTERPRETER_PRACTICES = [
    { practice: 'Use qualified interpreters, not family members', body: 'Children should NEVER interpret their own evaluations. Adult family members are also problematic (power dynamics, emotional content, interpretation errors). Use trained school/district interpreters or contracted language services.' },
    { practice: 'Meet with interpreter before the session', body: 'Brief them on the content, terminology, purpose. Share any technical terms in advance. Discuss seating, turn-taking, how to signal questions or confusion.' },
    { practice: 'Speak to the family, not to the interpreter', body: '"What do you think about this?" directly to the family. The interpreter then translates. Maintain eye contact with family member.' },
    { practice: 'Allow extra time', body: 'Sessions with interpreters typically take 1.5-2x as long. Plan accordingly. Don\'t rush.' },
    { practice: 'Use shorter sentences and concepts', body: 'Long complex sentences with embedded clauses are hard to interpret accurately. Break content into shorter units, allow interpreter to catch up.' },
    { practice: 'Check for understanding', body: '"Would you summarize back what you understood?" to family, interpreted back. Catches interpretation errors and confusion. Do this several times during the meeting.' },
    { practice: 'Cultural consultation, not just translation', body: 'When possible, work with interpreters who are also cultural brokers. They can flag when cultural content is being lost or misread, help adapt framing.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1AD: AUTISM SPECTRUM ASSESSMENT
  // ═══════════════════════════════════════════════════════════════
  var AUTISM_INSTRUMENTS = [
    { name: 'ADOS-2 (Autism Diagnostic Observation Schedule, 2nd Ed.)', what: 'Gold-standard structured observational assessment. 4 modules selected by age and language level (Toddler, Module 1 no-words, Module 2 phrase speech, Module 3 fluent kids/young adolescents, Module 4 fluent adolescents/adults). Each involves structured and semi-structured activities coded for social communication and restricted/repetitive behaviors.', age: 'Toddler through adult', time: '40-60 min admin; 60-90 min scoring/interp', requires: 'Research-reliable training required for research use; clinical training recommended for diagnostic use. Used by psychologists, psychiatrists, some speech-language pathologists.' },
    { name: 'ADI-R (Autism Diagnostic Interview — Revised)', what: 'Gold-standard structured parent/caregiver interview. 93 items across 3 domains: reciprocal social interaction, communication, and restricted/repetitive behaviors. Gathers detailed developmental history and current presentation.', age: 'Mental age ~2 years through adult', time: '2-3 hours', requires: 'Specialized training; often done in diagnostic clinics rather than schools due to time.' },
    { name: 'CARS-2 (Childhood Autism Rating Scale, 2nd Ed.)', what: 'Behavioral rating scale completed by clinician after observation. 15 items. Standard form for most children; High-Functioning version for higher-cognitive/verbal individuals.', age: '2+', time: '15-30 min', requires: 'Observation of child; less training-intensive than ADOS-2. Commonly used in schools as screening tool or adjunct.' },
    { name: 'SRS-2 (Social Responsiveness Scale, 2nd Ed.)', what: 'Dimensional rating scale of social communication behaviors. Parent, teacher, self-report (adolescent/adult) forms. 65 items. Measures autistic traits on a continuum rather than categorical diagnosis.', age: '2.5-89', time: '15-20 min', requires: 'Self-administered (forms); clinician interpretation.' },
    { name: 'M-CHAT-R/F (Modified Checklist for Autism in Toddlers, Revised with Follow-up)', what: 'Screening tool for toddlers at well-child visits or early intervention eval. 20 yes/no items. If positive, structured follow-up phone interview.', age: '16-30 months', time: '~5 min + follow-up', requires: 'Non-specialist administration (pediatrician, EI specialist); positive screens should be referred for full eval.' },
    { name: 'SCQ (Social Communication Questionnaire)', what: 'Brief (40 items) parent questionnaire derived from ADI-R. Screens for autism in school-age children who already have language.', age: '4+', time: '~10 min', requires: 'Parent completes; used as screener or to identify cases needing full ADOS-2/ADI-R.' },
    { name: 'ASRS (Autism Spectrum Rating Scales)', what: 'Rating scales for parents and teachers covering social-communication, unusual behaviors, self-regulation. Normed for 2-18.', age: '2-18', time: '~20 min', requires: 'Parent/teacher completion.' },
    { name: 'Autism-Tics, AD/HD, and other Comorbidities inventory (A-TAC)', what: 'Brief screener for autism + commonly co-occurring conditions. Good for triage when multiple concerns are present.', age: '6-17', time: '~15 min', requires: 'Parent completion.' }
  ];

  var AUTISM_DIFFERENTIAL_KEY = [
    { condition: 'ADHD', overlap: 'Attention difficulties, executive function problems, social difficulties', differentiator: 'ADHD: attention improves with interest; social difficulties are due to impulsivity/inattention, not social motivation. Autism: attention is more narrow and pattern-based; social motivation itself is different. Can co-occur (30-50% of autism has ADHD).' },
    { condition: 'Language Disorder (DLD/SLI)', overlap: 'Language delays, social-pragmatic difficulties', differentiator: 'DLD: language is the specific deficit; social-pragmatic issues stem from language. Autism: language may be delayed but restricted interests and unusual sensory responses are present. Social difficulties extend beyond language.' },
    { condition: 'Social-Pragmatic Communication Disorder', overlap: 'Pragmatic language difficulties', differentiator: 'SPCD: social-communication impairment WITHOUT restricted/repetitive behaviors. A DSM-5 category separate from autism. Diagnosis depends on absence of RRBs.' },
    { condition: 'Intellectual Disability', overlap: 'Adaptive functioning deficits, developmental delay', differentiator: 'ID: global cognitive delay; adaptive skills proportional to cognitive ability. Autism: profile scatter; specific social-communication impairment disproportionate to cognitive ability; can co-occur at any cognitive level.' },
    { condition: 'Anxiety disorders / Social anxiety', overlap: 'Social withdrawal, avoidance behaviors', differentiator: 'Anxiety: social interest is present but fear prevents engagement; the person WANTS to connect but can\'t. Autism: social motivation itself is often different; sensory/predictability needs drive avoidance more than social fear.' },
    { condition: 'Trauma / Reactive Attachment', overlap: 'Social disengagement, unusual interactions', differentiator: 'Trauma-based: emerges after identifiable event(s); responds to trauma-informed care. Autism: lifelong developmental pattern present before age 3 (even if identified later).' },
    { condition: 'Tourette\'s / Tic Disorder', overlap: 'Repetitive motor behaviors', differentiator: 'Tics: brief, variable, often suppressible with effort, involuntary. Autism stereotypies: more rhythmic, often self-soothing, not suppressed.' }
  ];

  var AUTISM_CONSIDERATIONS = [
    { theme: 'Gender presentation differences', body: 'Autism is diagnosed ~4x more in boys than girls. Substantial evidence this reflects diagnostic undercounting rather than true prevalence difference. Girls and women often "camouflage" difficulties, have social interests that mask reciprocity problems, and have special interests that align with typical peer interests. Diagnostic instruments were developed on predominantly male samples. Evaluators should specifically probe camouflaging, social exhaustion, masking, internalized distress in girls/women/gender-diverse individuals.' },
    { theme: 'Racial and cultural disparities', body: 'Black and Latino children receive autism diagnoses later than white children on average (often 2+ years later). Black children are more likely to be initially misdiagnosed as having ODD, ADHD, or ID. Culturally-competent assessment and clinician-diversity efforts address these disparities.' },
    { theme: 'Cognitive heterogeneity', body: 'Autism can co-occur with any cognitive profile: ID, average, gifted. "High-functioning" language is problematic because it obscures the fact that cognitive functioning and adaptive/social functioning can be very different. Describe the profile specifically rather than using labels.' },
    { theme: 'Co-occurring conditions are common', body: 'Anxiety disorders: ~40% of autistic individuals. ADHD: 30-50%. Intellectual disability: ~30%. Learning disabilities: substantial but harder to measure. GI conditions, epilepsy, sleep disorders: elevated rates. Eval plan should consider these rather than stopping at the autism determination.' },
    { theme: 'Autistic self-advocacy perspective', body: 'The autistic self-advocacy community emphasizes: nothing about us without us; identity-first language (autistic person) is often preferred over person-first (person with autism) by autistic adults — ask; neurodiversity as variation rather than disorder; focus on accommodations and strengths-based supports rather than "treating" autism. Involve autistic voices in practice and advocacy.' },
    { theme: 'Strengths in the profile', body: 'Autism is not only deficits. Many autistic individuals demonstrate exceptional pattern recognition, attention to detail, sustained focus on interests, honesty, systematic thinking, deep domain knowledge, nonverbal creativity. IEPs should name strengths explicitly and leverage them, not just remediate deficits.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1AE: ADHD ASSESSMENT
  // ═══════════════════════════════════════════════════════════════
  var ADHD_DSM_CRITERIA = [
    { element: 'Symptom presentation', body: 'Two symptom dimensions: (1) Inattention (9 symptoms: careless mistakes, trouble sustaining attention, doesn\'t seem to listen, doesn\'t follow through, difficulty organizing, avoids effortful tasks, loses things, easily distracted, forgetful); (2) Hyperactivity/Impulsivity (9 symptoms: fidgets, leaves seat, runs/climbs inappropriately, can\'t engage in quiet activity, "on the go," talks excessively, blurts answers, interrupts, has difficulty waiting turn). Three presentations: Combined, Predominantly Inattentive, Predominantly Hyperactive-Impulsive.' },
    { element: 'Symptom count', body: 'Children under 17: ≥6 symptoms in at least one dimension for 6+ months. Age 17+: ≥5 symptoms in at least one dimension.' },
    { element: 'Multiple settings', body: 'Symptoms must be present in 2+ settings (home AND school, or school AND community). Single-setting presentation suggests situational cause rather than ADHD.' },
    { element: 'Onset before age 12', body: 'Several symptoms must be present before age 12 (changed from age 7 in DSM-5). May not have been identified until later but early presence is documentable in retrospect.' },
    { element: 'Functional impairment', body: 'Symptoms interfere clearly with academic, social, or occupational functioning. Having "busy" traits without impairment is not ADHD.' },
    { element: 'Differential exclusions', body: 'Symptoms not better explained by another mental disorder (autism, psychosis, mood disorder, anxiety disorder, substance use). Rule-out requires comprehensive assessment.' }
  ];

  var ADHD_INSTRUMENTS = [
    { name: 'Conners-4', what: 'Comprehensive ADHD-focused rating scales: Parent, Teacher, Self-Report (8+). Includes validity scales. Short and long forms. Scales for ADHD inattentive/hyperactive-impulsive, learning problems, executive function, aggression, defiance, emotional dysregulation.', strengths: 'Gold standard for ADHD rating. Well-normed. Validity scales catch inconsistent or inflated responding.' },
    { name: 'BASC-3 (ADHD-relevant scales)', what: 'Broader behavior rating scale with ADHD-relevant subscales (Attention Problems, Hyperactivity). Parent, Teacher, Self-Report. Captures ADHD in context of broader behavioral/emotional functioning.', strengths: 'Useful when differential is needed (ADHD vs anxiety vs mood). Covers multiple dimensions at once.' },
    { name: 'BRIEF-2 (Behavior Rating Inventory of Executive Function, 2nd Ed.)', what: 'Executive function rating scales. Parent, Teacher, Self-Report (11-18). 8 clinical scales: Inhibition, Self-Monitor, Shift, Emotional Control, Initiate, Working Memory, Plan/Organize, Task Monitor, Organization of Materials.', strengths: 'Gold standard for EF rating. Complements cognitive testing (performance-based EF). Widely used.' },
    { name: 'ADHD Rating Scale-5 (ADHD-RS-5)', what: 'DSM-5-aligned rating scale. 18 items matching DSM-5 ADHD symptoms. Parent, Teacher, Self-Report.', strengths: 'Direct mapping to diagnostic criteria. Free for clinical use.' },
    { name: 'T.O.V.A. (Test of Variables of Attention)', what: 'Computer-administered continuous performance test. 21-23 minutes. Measures attention, impulsivity, variability, speed.', strengths: 'Objective performance measure. Useful for pre/post medication monitoring.', limits: 'Sensitive to motivation, practice effects, time of day. Should not be primary diagnostic tool. Cost.' },
    { name: 'CPT-3 (Conners Continuous Performance Test, 3rd Ed.)', what: 'Alternative to T.O.V.A. Computer-administered. 14 minutes. Measures similar constructs.', strengths: 'Well-normed, integrates with other Conners products.', limits: 'Same limits as T.O.V.A. Not specific to ADHD; just measures attention-related performance.' },
    { name: 'Vanderbilt ADHD Diagnostic Rating Scale', what: 'Public-domain rating scale developed for primary care. Parent and teacher versions.', strengths: 'Free, widely used in pediatric primary care. Includes screen for co-occurring anxiety, depression, ODD, conduct.' }
  ];

  var ADHD_DIFFERENTIAL_KEY = [
    { condition: 'Anxiety disorders', overlap: 'Difficulty concentrating, restlessness, excessive worry interfering with tasks', differentiator: 'Anxiety-based attention difficulties improve when the anxiety-inducing situation is removed; they present with worry and avoidance. ADHD attention difficulties are present across contexts, not tied to specific worries.' },
    { condition: 'Depression', overlap: 'Concentration problems, restlessness (agitated depression), reduced goal-directed behavior', differentiator: 'Depressive cognitive changes are recent (onset with mood episode) and accompany anhedonia, sleep changes, appetite changes, hopelessness. ADHD is lifelong.' },
    { condition: 'Learning disability', overlap: 'Academic performance problems, avoidance of effortful tasks', differentiator: 'LD: deficit is specific (reading, math, writing) and persists across contexts; attention may be fine in non-academic settings. ADHD: attention problems across domains, not just academic.' },
    { condition: 'Sleep disorder', overlap: 'Inattention, irritability, restlessness (especially in children with OSA or insufficient sleep)', differentiator: 'Always screen for sleep. If sleep is grossly inadequate or disrupted (obstructive sleep apnea, restless leg, delayed sleep phase), treat sleep before diagnosing ADHD. Many "ADHD" presentations resolve with sleep treatment.' },
    { condition: 'Trauma', overlap: 'Hypervigilance, concentration problems, emotional dysregulation', differentiator: 'Trauma symptoms emerge after an identifiable event or period; hypervigilance is threat-driven. ADHD is present before age 12 and not triggered by specific events.' },
    { condition: 'Thyroid dysfunction', overlap: 'Attention and concentration changes, restlessness (hyperthyroid) or fatigue (hypothyroid)', differentiator: 'Always have pediatric medical workup for new-onset concentration problems, especially in older children or sudden changes. Thyroid abnormalities are treatable and mimic ADHD.' },
    { condition: 'Autism', overlap: 'Attention pattern differences, social difficulties, possible hyperactivity or rigidity', differentiator: 'Autism: attention is narrow and pattern-based, social differences are primary. ADHD: attention is variable with novelty, social difficulties flow from impulsivity/inattention. Can co-occur (30-50% overlap).' },
    { condition: 'Situational / contextual', overlap: 'Distractibility, poor performance', differentiator: 'If "ADHD" symptoms present ONLY at school (not home/community), or only since a major life event, consider environmental explanations: bullying, poor fit, boredom (giftedness), family stress, substance use.' }
  ];

  var ADHD_PRESENTATION_NOTES = [
    { group: 'Girls and women', body: 'Often predominantly inattentive presentation. Less disruptive so less referred. Present with "daydreaming," disorganization, academic underperformance relative to ability, anxiety, self-esteem issues. Diagnosed 2-5 years later than boys on average. Many women diagnosed in adulthood after child diagnosis or life transition.' },
    { group: 'Adolescents', body: 'Hyperactivity often transforms into internal restlessness rather than visible motor activity. Risk-taking behavior. Academic decline as demands increase. Comorbid substance use elevation. Self-report scales increasingly important at this age.' },
    { group: 'Gifted students', body: 'Bored students can look like inattentive ADHD. Can co-occur (2E profile). Distinguish via: is attention normal for engaging content? Does cognitive profile suggest understimulation? See Twice-Exceptional sub-view.' },
    { group: 'Black children, especially boys', body: 'Research suggests Black boys are under-diagnosed with ADHD and over-diagnosed with disruptive behavior disorders. Symptoms get read as defiance rather than as medical/developmental. Cultural competence and examiner-matching matter.' },
    { group: 'Inattentive-only presentation', body: 'Often missed because inattentive kids are quiet. Strong predictor of academic underachievement without the behavioral red flags that trigger referral. Universal academic screening + EF rating scales catch these.' }
  ];

  var ADHD_TREATMENT_FRAMEWORK = [
    { domain: 'Medical (medication)', body: 'Stimulants (methylphenidate, amphetamines) are first-line and highly effective (~70% response rate). Non-stimulants (atomoxetine, guanfacine, clonidine) for specific cases. Medication decisions are medical (pediatrician, psychiatrist); school staff can share data and advocate but do not prescribe.' },
    { domain: 'Educational (school-based)', body: 'Depending on severity: 504 plan accommodations (extended time, preferential seating, breaks, scaffolded prompts), IEP services (direct EF instruction, skill-building, accommodations), classroom environment (visual schedules, task chunking, frequent feedback), assistive technology (timers, reminder apps, noise-canceling headphones).' },
    { domain: 'Behavioral / parent training', body: 'Parent Management Training (PMT), Parent-Child Interaction Therapy (PCIT) for younger children. Focus on predictable structure, immediate reinforcement, clear expectations, reducing parent-child conflict. Evidence-based.' },
    { domain: 'Cognitive-Behavioral (older kids and adolescents)', body: 'CBT adapted for ADHD addresses self-perception, planning skills, emotional regulation. Often useful for comorbid anxiety/depression.' },
    { domain: 'Environmental / lifestyle', body: 'Sleep hygiene, exercise, reducing excessive screen time, nutrition, reducing environmental distractions. Not replacements for medical and educational interventions but important adjuncts.' },
    { domain: 'Self-advocacy and identity development', body: 'Help students understand their own neurocognitive profile, develop self-knowledge about what helps them, build agency. Adolescence is critical for ADHD identity integration.' }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 1C: JUNK SCIENCE CHALLENGE SCENARIOS
  // ═══════════════════════════════════════════════════════════════
  // Each scenario: { claim, verdict: 'legit'|'suspect'|'junk', reasoning }
  var JUNK_SCENARIOS = [
    {
      claim: '"The Wechsler Intelligence Scale for Children — 5th Edition (WISC-V) measures cognitive ability in children 6:0 to 16:11 through 10 primary subtests yielding a Full Scale IQ with internal consistency reliability α=0.96 and a 95% confidence interval of approximately ±5 points. Standardized on a nationally representative sample of N=2,200."',
      verdict: 'legit',
      reasoning: 'This is how a legitimate psychometric claim looks: it reports reliability (α=0.96), acknowledges measurement error (±5 CI), specifies the age range and standardization sample (N=2,200, nationally representative), and names the specific test edition. No outlandish accuracy claims, no appeals to popularity.'
    },
    {
      claim: '"MindMatch Personality reveals your true authentic self in just 10 minutes. 94% of users say it changed their lives. Used by over 1,000 Fortune 500 companies. Unlock your hidden potential today!"',
      verdict: 'junk',
      reasoning: 'Multiple red flags at once: (1) "true authentic self" is pseudoprofound language, not a measurable construct; (2) "94% of users say" is a popularity claim, not a validity claim; (3) "Fortune 500 companies use it" is an appeal to commercial adoption, not evidence of validity; (4) No mention of reliability, factor structure, test-retest, or predictive validity. If those numbers existed and were good, they would be advertised.'
    },
    {
      claim: '"The Big Five Inventory-2 (BFI-2) shows internal consistency α=0.83-0.89 across its 5 facets, 2-month test-retest stability r=0.80-0.88, convergent validity with the NEO-PI-R r=0.73-0.87, and predicts undergraduate GPA (Conscientiousness r=0.26) in a sample of N=2,408 across three universities."',
      verdict: 'legit',
      reasoning: 'Textbook validation evidence: internal consistency across facets, test-retest over meaningful interval, convergent validity with the field-standard instrument, and predictive validity with an effect size that\'s modest but real (r=0.26 for Conscientiousness-GPA is consistent with meta-analytic estimates). A psychologist reading this gets enough to decide whether to use it.'
    },
    {
      claim: '"Our color-personality test reveals which of the 4 colors — Red, Blue, Yellow, or Green — represents your core self. No two people are exactly alike, but your color explains your leadership style, communication preferences, and ideal career. Get your results in 5 minutes!"',
      verdict: 'junk',
      reasoning: 'This is True Colors / similar color-personality frameworks — no published peer-reviewed evidence of reliability or validity. Red flags: reduces personality to 4 categories (same information-destruction problem as MBTI), claims to predict leadership style and career fit without validity studies, trades on Barnum-effect readings ("no two people are exactly alike"). Popular in corporate training because it\'s cheap and memorable, not because it works.'
    },
    {
      claim: '"Our AI-powered video interview reads your facial micro-expressions, voice tonality, and word choice during a 30-second clip and predicts job performance with 92% accuracy, saving hiring managers 80% of their time."',
      verdict: 'junk',
      reasoning: 'HireVue-style claim. Three independent reasons to reject: (1) "92% accuracy" without defining the criterion is meaningless — accuracy at what, compared to what baseline? (2) Facial expression analysis has known bias against neurodivergent candidates (autistic applicants flagged as "less engaged") and candidates of color (differential error rates). EEOC has opened inquiries; some states (Illinois, Maryland) now regulate. (3) Time savings is about employer convenience, not candidate fairness or selection validity. Electronic Privacy Information Center and others have filed FTC complaints.'
    },
    {
      claim: '"The Myers-Briggs Type Indicator classifies individuals into one of 16 types based on 4 dichotomies (E/I, S/N, T/F, J/P). Widely used by approximately 2 million people annually in corporate team-building, career counseling, and personal development contexts."',
      verdict: 'suspect',
      reasoning: 'The description itself is factually accurate. What makes it suspect is framing: "widely used" and "career counseling" imply utility the instrument does not empirically support. Test-retest reliability is ~0.50 (about 50% of takers flip at least one letter on retest). No incremental validity over Big 5. Jungian theoretical origin without empirical item selection. Fine as a conversation starter for self-reflection; not fine as a basis for career or hiring decisions — even though it\'s commonly sold that way.'
    },
    {
      claim: '"Graphology (handwriting analysis) has been used for over 100 years to assess personality traits including introversion, anxiety, and honesty. Several hiring consultancies still offer graphology-based pre-employment screening, particularly in France and for high-stakes financial sector hiring."',
      verdict: 'junk',
      reasoning: 'The factual description (100+ years of use, still used in France) is accurate. The implication that long use = validity is wrong. Meta-analyses (e.g., Dean et al.) and the American Psychological Association have reviewed graphology extensively and found no replicable correlation with personality traits or job performance beyond chance. Widespread use is not evidence of validity — leeches were used for 2,000 years. Continuing use in France reflects cultural inertia and consultancy economics, not evidence.'
    },
    {
      claim: '"Researchers administered the Hogan Personality Inventory, Hogan Development Survey, and supervisor-rated job performance measures to N=425 mid-level managers. HPI Adjustment correlated with supervisor ratings at r=0.24 (p<0.001), and HDS Excitable correlated negatively with peer-rated teamwork at r=-0.19 (p<0.01). Results replicated in a follow-up sample of N=312."',
      verdict: 'legit',
      reasoning: 'Classic validation study report: named instruments, specific sample characteristics, criterion measures (supervisor-rated, peer-rated), actual effect sizes with significance tests, and replication in a second sample. The effect sizes (r=0.24, r=-0.19) are modest but real — consistent with meta-analytic expectations for personality-performance links (Barrick & Mount 1991). This is what honest evidence looks like: not huge effects, but defensible ones.'
    },
    {
      claim: '"This personality test is 100% accurate. Everyone we\'ve tested says the results describe them perfectly. Take it now and discover who you really are!"',
      verdict: 'junk',
      reasoning: 'Two simultaneous tells. (1) "100% accuracy" is psychometrically impossible — even excellent measures (α=0.95, test-retest 0.90) have nonzero error. (2) "Everyone says it describes them perfectly" is the textbook Barnum effect: vague, universally applicable descriptions ("you have a strong desire for others to like you but sometimes feel self-critical") feel specific because humans are wired to find personal relevance. The fact that it "works for everyone" is evidence AGAINST its being a valid differentiator.'
    },
    {
      claim: '"Our pre-employment screening assessment has been used by more than 500 companies over the past 10 years and has not been successfully challenged in court. It identifies candidates with the right cultural fit for your organization."',
      verdict: 'suspect',
      reasoning: 'Commercial longevity and absence of lawsuits are not evidence of validity. Many weak instruments survive commercially because: (a) HR buyers can\'t evaluate psychometric claims, (b) lawsuits are expensive and rarely filed even when warranted, (c) "not successfully challenged" often means "never formally challenged" — survivorship bias. "Cultural fit" in particular is legally risky — often used to rationalize decisions that would otherwise constitute disparate impact (EEOC has explicitly flagged this). Ask for reliability, factor structure, predictive validity evidence — if they can\'t produce it, walk away.'
    },
    {
      claim: '"This test was developed by a team of licensed clinical psychologists with a combined 150+ years of experience. Our methodology is proprietary."',
      verdict: 'junk',
      reasoning: 'Two red flags that ride together. (1) "Licensed clinical psychologists" and "years of experience" are appeals to authority, not evidence. Plenty of licensed clinicians have published weak instruments (or endorsed ones like MBTI). Credential ≠ validity. (2) "Proprietary methodology" is the anti-signal of legitimate psychometrics — real validity evidence is peer-reviewed and replicable precisely because the items, scoring, and norms are transparent. Proprietary scoring in a behavioral science is a structural bar to validation. Run.'
    },
    {
      claim: '"The Gallup CliftonStrengths assessment identifies your top 5 strengths from a list of 34 themes. Meta-analytic evidence from Gallup\'s internal research across 1.9 million employees suggests strengths-based development correlates with workgroup engagement (d=0.35) and profitability."',
      verdict: 'suspect',
      reasoning: 'Legitimate aspects: the sample size is real, the effect sizes are reported, the construct is defined. Suspect aspects: (1) "Gallup\'s internal research" means not independently peer-reviewed — commercial bias is real even when the numbers look good; (2) Strengths-development effects conflate the intervention (spending time talking about strengths, getting manager attention) with the instrument\'s measurement properties; (3) CliftonStrengths has weak-to-moderate construct validity as a trait measure — it\'s more like ranked preferences than a Big-5-like dimensional framework. Fine for team-building vocabulary, not for hiring decisions.'
    },
    {
      claim: '"The Vineland-3 Adaptive Behavior Scales assesses communication, daily living skills, socialization, and motor skills across birth through 90 years via caregiver interview or rating form. Internal consistency α=0.90-0.98 across domains; test-retest r=0.75-0.93 at 2-6 week interval; standardized on N=2,560 matched to 2016 U.S. Census."',
      verdict: 'legit',
      reasoning: 'This is exactly the kind of validation profile you want to see for a clinical instrument used in high-stakes decisions like Intellectual Disability eligibility. Wide age range clearly specified, excellent reliability across domains, test-retest over a reasonable interval, contemporary standardization matched to census demographics. Vineland-3 (like WISC-V, BASC-3) is a field-standard instrument precisely because claims like these are backed up in the manual with primary data.'
    }
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECTION 2: STATE / HELPERS
  // ═══════════════════════════════════════════════════════════════

  function defaultState() {
    return {
      view: 'menu',           // 'menu' | 'cognitive' | 'personality' | 'career' | 'employer' | 'schoolpsych'
      sub: null,              // depends on view
      // school psych
      semScore: 100,
      semReliability: 0.96,
      ideaCategoryFocus: null,
      // junk science challenge
      junkIndex: 0,
      junkAnswers: {},        // index -> 'legit'|'suspect'|'junk'
      junkRevealed: {},       // index -> bool
      junkOrder: null,        // shuffled index order for replay
      // flynn effect
      flynnYear: 1980,
      // schwartz values
      schwartzAnswers: {},    // index -> 1..6
      schwartzResult: null,
      // peer-rated big 5
      peerAnswers: {},        // index -> 1..5 (entered by user on behalf of peer)
      peerResult: null,
      peerName: '',
      // case vignettes
      caseSelected: null,
      caseDomains: [],
      caseCritique: '',
      caseLoading: false,
      // interview prep
      interviewCompetency: null,
      interviewRole: '',
      interviewQuestion: '',
      interviewAnswer: '',
      interviewCritique: '',
      interviewLoading: false,
      interviewCritiqueLoading: false,
      // glossary
      glossaryFilter: '',
      // parent handout generator
      handoutStudent: '',
      handoutGrade: '',
      handoutFindings: '',
      handoutEligibility: '',
      handoutRecs: '',
      handoutTone: 'warm',
      handoutOutput: '',
      handoutLoading: false,
      // cognitive
      cogTheory: null,
      battery: [],            // array of CHC codes selected
      batteryCritique: '',
      batteryLoading: false,
      // personality
      big5Answers: {},        // index -> 1-5
      big5Result: null,
      mbtiRetestNoise: 0,
      // career
      riasecAnswers: {},      // index -> 1-5
      riasecResult: null,
      occupationQuery: '',
      occupationResult: '',
      occupationLoading: false,
      // employer
      employerTest: null,
      practiceItems: [],
      practiceLoading: false,
      practiceAnswers: {},
      practiceFeedback: ''
    };
  }

  // Big 5 scoring — items 1-5 Likert, reversed as flagged, mean across trait items → 0-100
  function scoreBig5(answers) {
    var sums = { O: 0, C: 0, E: 0, A: 0, N: 0 };
    var counts = { O: 0, C: 0, E: 0, A: 0, N: 0 };
    BIG5_ITEMS.forEach(function(item, i) {
      var raw = answers[i];
      if (raw == null) return;
      var v = item.r ? (6 - raw) : raw;
      sums[item.d] += v;
      counts[item.d] += 1;
    });
    var out = {};
    Object.keys(sums).forEach(function(k) {
      if (counts[k] === 0) { out[k] = null; return; }
      var mean = sums[k] / counts[k]; // 1..5
      out[k] = Math.round(((mean - 1) / 4) * 100); // 0..100
    });
    return out;
  }

  // Convert continuous Big 5 to MBTI 4-letter type
  function big5ToMBTI(profile) {
    if (!profile || profile.E == null) return null;
    return (profile.E >= 50 ? 'E' : 'I') +
           (profile.O >= 50 ? 'N' : 'S') +
           (profile.A >= 50 ? 'F' : 'T') +
           (profile.C >= 50 ? 'J' : 'P');
  }

  // Simulate test-retest noise and see how often MBTI letters flip
  function simulateMBTIRetest(profile, noisePct, trials) {
    if (!profile) return null;
    trials = trials || 1000;
    noisePct = noisePct != null ? noisePct : 10; // ±10 points SD
    var original = big5ToMBTI(profile);
    var flips = { E: 0, N: 0, F: 0, J: 0 };
    var totalFlips = 0;
    for (var i = 0; i < trials; i++) {
      var noisy = {};
      Object.keys(profile).forEach(function(k) {
        var n = (Math.random() + Math.random() + Math.random() - 1.5) * 2 * noisePct;
        noisy[k] = Math.max(0, Math.min(100, profile[k] + n));
      });
      var t = big5ToMBTI(noisy);
      var anyFlip = false;
      for (var j = 0; j < 4; j++) {
        if (t[j] !== original[j]) {
          flips[['E', 'N', 'F', 'J'][j]] += 1;
          anyFlip = true;
        }
      }
      if (anyFlip) totalFlips += 1;
    }
    return {
      original: original,
      noisePct: noisePct,
      trials: trials,
      totalFlipPct: Math.round((totalFlips / trials) * 100),
      letterFlipPct: {
        'E/I': Math.round((flips.E / trials) * 100),
        'S/N': Math.round((flips.N / trials) * 100),
        'T/F': Math.round((flips.F / trials) * 100),
        'J/P': Math.round((flips.J / trials) * 100)
      }
    };
  }

  function scoreSchwartz(answers) {
    var sums = {}, counts = {};
    SCHWARTZ_ORDER.forEach(function(k) { sums[k] = 0; counts[k] = 0; });
    SCHWARTZ_ITEMS.forEach(function(item, i) {
      var raw = answers[i];
      if (raw == null) return;
      sums[item.d] += raw;
      counts[item.d] += 1;
    });
    // Schwartz recommends ipsatization — center each person's ratings on their own mean
    // so we're looking at relative priorities, not absolute importance
    var allRaw = 0, allN = 0;
    SCHWARTZ_ORDER.forEach(function(k) { allRaw += sums[k]; allN += counts[k]; });
    var grandMean = allN > 0 ? (allRaw / allN) : 0;
    var centered = {};
    SCHWARTZ_ORDER.forEach(function(k) {
      if (counts[k] === 0) { centered[k] = null; return; }
      var mean = sums[k] / counts[k];
      centered[k] = Math.round((mean - grandMean) * 10) / 10; // relative priority
    });
    var ranked = SCHWARTZ_ORDER.slice().filter(function(k) { return centered[k] != null; })
      .sort(function(a, b) { return centered[b] - centered[a]; });
    return { relative: centered, ranked: ranked };
  }

  function scoreRIASEC(answers) {
    var sums = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    var counts = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    RIASEC_ITEMS.forEach(function(item, i) {
      var raw = answers[i];
      if (raw == null) return;
      sums[item.d] += raw;
      counts[item.d] += 1;
    });
    var out = {};
    Object.keys(sums).forEach(function(k) {
      if (counts[k] === 0) { out[k] = null; return; }
      var mean = sums[k] / counts[k];
      out[k] = Math.round(((mean - 1) / 4) * 100);
    });
    // Top-3 Holland code
    var sorted = Object.keys(out).filter(function(k) { return out[k] != null; }).sort(function(a, b) { return out[b] - out[a]; });
    return { scores: out, code: sorted.slice(0, 3).join('') };
  }

  function buildBatteryCritiquePrompt(battery) {
    var covered = battery.slice();
    var missing = CHC_BROAD.filter(function(b) { return covered.indexOf(b.code) === -1; }).map(function(b) { return b.code + ' (' + b.name + ')'; });
    return 'You are a psychoeducational assessment instructor teaching a student about test battery construction.\n\nA student has assembled a mock cognitive battery covering these CHC broad abilities:\n' +
      covered.map(function(c) { var b = CHC_BROAD.find(function(x) { return x.code === c; }); return '- ' + c + ': ' + (b ? b.name : c); }).join('\n') +
      '\n\nWritten out, these abilities are NOT covered:\n' + (missing.length ? missing.map(function(m) { return '- ' + m; }).join('\n') : '(All CHC broad abilities are represented.)') +
      '\n\nIn 4-6 concise bullet points, critique this battery:\n' +
      '1. What cognitive functions are well-sampled?\n' +
      '2. What important cognitive functions are underweighted or missing?\n' +
      '3. What real-world questions could this battery answer well?\n' +
      '4. What diagnostic or developmental questions would this battery struggle to address?\n' +
      '5. Any disability-access or cultural-fairness concerns about this profile?\n\n' +
      'Format: plain text with "• " bullet prefixes. No markdown headers. Around 200-300 words total. Be specific, not generic.';
  }

  function buildPracticePrompt(testId) {
    var test = EMPLOYER_TESTS.find(function(t) { return t.id === testId; });
    if (!test) return '';
    return 'You are simulating an employer personality/cognitive assessment for educational practice. Do NOT reproduce proprietary items from real tests.\n\n' +
      'The student is preparing for the ' + test.name + ' (' + test.full + ').\n' +
      'What it measures: ' + test.what + '\n' +
      'Dimensions: ' + (Array.isArray(test.dimensions) ? test.dimensions.join('; ') : test.dimensions) + '\n\n' +
      'Generate 6 practice items in the STYLE of this test (not actual items from it). For a personality inventory, use 5-point Likert statements. For a cognitive test (Wonderlic/CCAT/PI Cognitive), use multiple-choice reasoning problems with 4 options each.\n\n' +
      'Format your response as plain text, one item per block:\n\n' +
      'Item 1\n[statement or question]\nOptions: [if MCQ, list A/B/C/D; if Likert, note 1=Strongly Disagree, 5=Strongly Agree]\nDimension probed: [which trait/ability this item is designed to assess]\nStrategy note: [one sentence on what an employer is looking for here, and how to answer authentically]\n\nRepeat for 6 items. Keep each item block under 120 words. Ensure items probe different dimensions.';
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION 3: TOOL REGISTRATION + RENDER
  // ═══════════════════════════════════════════════════════════════

  window.StemLab.registerTool('assessmentLiteracy', {
    icon: '\uD83D\uDCCA',
    label: 'Assessment Literacy Lab',
    desc: 'Learn how cognitive, personality, career, and employer tests actually work — build mock batteries, critique pseudoscience, coach yourself ethically for hiring tests.',
    color: 'indigo',
    category: 'Literacy',
    render: function(ctx) {
      var React = window.React;
      var h = React.createElement;
      var data = ctx.toolData || {};
      var setToolData = ctx.setToolData;
      var addToast = ctx.addToast || function() {};
      var callGemini = ctx.callGemini;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;

      var s = Object.assign({}, defaultState(), data.assessmentLiteracy || {});
      var upd = function(patch) {
        setToolData(function(prev) {
          return Object.assign({}, prev, { assessmentLiteracy: Object.assign({}, prev.assessmentLiteracy || defaultState(), patch) });
        });
      };

      // ── Junk-Science Mastery: Canvas-survival persistence ──
      // The StemLab host's localStorage block does not include
      // assessmentLiteracy, so reloads wipe state by default. Layer our own:
      // window slot → localStorage → host state, plus project-JSON ride-along.
      var _alHydrated = React.useRef(false);
      if (!_alHydrated.current) {
        _alHydrated.current = true;
        try {
          var winSt = (typeof window !== 'undefined' && window.__alloflowAssessmentLiteracy) || null;
          var lsSt = null;
          try { lsSt = JSON.parse(localStorage.getItem('assessmentLiteracy.state.v1') || 'null'); } catch (e) {}
          var seed = winSt || lsSt || null;
          if (seed && typeof seed === 'object' && seed.junkMastery && !s.junkMastery) {
            // Defer one tick so host setToolData reducer doesn't fight current render.
            setTimeout(function () {
              setToolData(function (prev) {
                return Object.assign({}, prev, { assessmentLiteracy: Object.assign({}, prev.assessmentLiteracy || defaultState(), { junkMastery: seed.junkMastery }) });
              });
            }, 0);
          }
        } catch (e) {}
      }
      // First-correct celebration state (auto-clears after 3.5s).
      var _alCeleb = React.useState(null);
      var alCeleb = _alCeleb[0];
      var setAlCeleb = _alCeleb[1];
      // Mirror persistent slice to window slot + localStorage.
      React.useEffect(function () {
        try {
          var snapshot = { junkMastery: s.junkMastery || {}, _ts: Date.now() };
          window.__alloflowAssessmentLiteracy = snapshot;
          try { localStorage.setItem('assessmentLiteracy.state.v1', JSON.stringify(snapshot)); } catch (e) {}
        } catch (e) {}
      }, [s.junkMastery]);
      // Hot-reload from project-JSON load mid-session.
      React.useEffect(function () {
        function onRestore() {
          try {
            var w = window.__alloflowAssessmentLiteracy || {};
            if (w.junkMastery) {
              setToolData(function (prev) {
                return Object.assign({}, prev, { assessmentLiteracy: Object.assign({}, prev.assessmentLiteracy || defaultState(), { junkMastery: w.junkMastery }) });
              });
            }
          } catch (e) {}
        }
        window.addEventListener('alloflow-assessmentliteracy-restored', onRestore);
        return function () { window.removeEventListener('alloflow-assessmentliteracy-restored', onRestore); };
      }, []);

      // Breadcrumb back-button helper
      function backBtn(targetView, targetSub, label) {
        return h('button', {
          onClick: function() { upd({ view: targetView, sub: targetSub }); },
          className: 'inline-flex items-center gap-1 text-xs font-bold text-indigo-300 hover:text-indigo-200 mb-3',
          'aria-label': 'Back to ' + (label || 'previous')
        }, '← ' + (label || 'Back'));
      }

      // ─────────────────────────────────────────
      // MENU (main landing)
      // ─────────────────────────────────────────
      function renderMenu() {
        var modules = [
          { id: 'cognitive', icon: '\uD83E\uDDE0', label: 'Cognitive Assessment Literacy', desc: 'CHC, PASS, Gardner, Sternberg. Build a mock battery from subtest blocks. Browse real batteries (WISC-V, WJ-IV, KABC-II). Disability justice lens.', color: 'from-blue-600 to-cyan-600' },
          { id: 'personality', icon: '\uD83C\uDFAD', label: 'Personality Inventory Literacy', desc: 'Big 5 vs MBTI head-to-head. Take an IPIP mini-inventory, see your continuous profile, watch it convert to MBTI, simulate retest flips.', color: 'from-purple-600 to-pink-600' },
          { id: 'career', icon: '\uD83C\uDFAF', label: 'Career Interest Literacy', desc: 'Holland RIASEC short form from O*NET. Get your 3-letter code, explore real occupation matches, compare with clickbait quizzes.', color: 'from-emerald-600 to-teal-600' },
          { id: 'employer', icon: '\uD83D\uDCBC', label: 'Employer Assessment Coaching', desc: 'Ethics, legal rights, test-specific primers (DISC, Hogan, PI, Caliper, Wonderlic, CCAT). Practice mode with AI-generated mock items.', color: 'from-amber-600 to-orange-600' },
          { id: 'schoolpsych', icon: '\uD83C\uDFEB', label: 'School Psych & IEP Workflow', desc: 'RTI tiers, SLD identification methods, 504 vs IEP, the 13 IDEA categories, how to read a psych report, parent rights, and an interactive SEM / confidence interval simulator.', color: 'from-sky-600 to-blue-700' },
          { id: 'junk', icon: '\uD83D\uDD0D', label: 'Spot the Junk Science — Capstone', desc: 'Read real-world test claims. Rate each: Legit / Suspect / Pseudoscience. Learn the tells that expose Barnum effects, popularity appeals, proprietary black boxes, and commercial inflation. Capstone challenge.', color: 'from-fuchsia-600 to-rose-600' },
          { id: 'sources', icon: '\uD83D\uDCDA', label: 'Sources & Further Reading', desc: 'Primary-source citations organized by module — textbooks, peer-reviewed articles, legal rulings, and online resources. For students heading to grad school or anyone who wants to go deeper.', color: 'from-slate-600 to-slate-800' },
          { id: 'teacher', icon: '\uD83C\uDF93', label: 'Teacher / Instructor Mode', desc: 'Course alignment, module-by-module learning objectives, 10 discussion prompts, 8 in-class activities, 5-dimension assessment rubric. For adopting this tool in a Psych, Ed Psych, or I/O course.', color: 'from-indigo-600 to-violet-700' },
          { id: 'glossary', icon: '\uD83D\uDCD6', label: 'Glossary', desc: '60+ term glossary covering terms across all modules. Filter by keyword. For navigating a tool with lots of jargon.', color: 'from-stone-600 to-zinc-700' }
        ];
        return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6' },
          h('header', { className: 'mb-6' },
            h('h1', { className: 'text-2xl md:text-3xl font-black text-indigo-200 mb-2' }, '\uD83D\uDCCA Assessment Literacy Lab'),
            h('p', { className: 'text-sm text-slate-300 leading-relaxed' },
              'This tool doesn\'t measure you. It teaches you how measurement claims are made — and how to tell a validated instrument from a persuasive-sounding one. Build mock batteries. Critique your own results. Learn to navigate employer tests ethically and strategically.'
            ),
            h('div', { className: 'mt-3 p-3 rounded-lg bg-indigo-900/30 border border-indigo-500/30 text-xs text-indigo-200' },
              h('strong', null, 'Design principle: '), 'Every inventory here is for education and self-reflection, not diagnosis. Real clinical/educational decisions require a qualified professional administering a full validated battery.'
            )
          ),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            modules.map(function(m) {
              return h('button', {
                key: m.id,
                onClick: function() { upd({ view: m.id, sub: null }); announceSR('Entered ' + m.label); },
                className: 'text-left p-4 rounded-xl bg-gradient-to-br ' + m.color + ' hover:brightness-110 focus:ring-2 focus:ring-white focus:outline-none transition shadow-lg'
              },
                h('div', { className: 'text-3xl mb-2' }, m.icon),
                h('div', { className: 'text-base font-black text-white mb-1' }, m.label),
                h('div', { className: 'text-xs text-white/90 leading-snug' }, m.desc)
              );
            })
          )
        );
      }

      // ─────────────────────────────────────────
      // MODULE 1: COGNITIVE
      // ─────────────────────────────────────────
      function renderCognitive() {
        var sub = s.sub;
        if (sub === 'theories') return renderCognitiveTheories();
        if (sub === 'builder') return renderBatteryBuilder();
        if (sub === 'batteries') return renderRealBatteries();
        if (sub === 'justice') return renderCogJustice();
        if (sub === 'flynn') return renderFlynn();
        if (sub === 'neuropsych') return renderNeuropsych();
        if (sub === 'biasSpotter') return renderBiasSpotter();

        // Cognitive submenu
        var subs = [
          { id: 'theories', icon: '\uD83D\uDCDA', label: 'Theories of Intelligence', desc: 'CHC, PASS, Gardner, Sternberg, Luria, Spearman\'s g. What each theory actually claims, and how they compete or nest.' },
          { id: 'builder', icon: '\uD83D\uDD27', label: 'Battery Builder', desc: 'Select CHC broad abilities → AI critiques what your mock battery would and would not capture.' },
          { id: 'batteries', icon: '\uD83D\uDCD6', label: 'Real Cognitive Batteries', desc: 'WISC-V, WJ-IV, KABC-II, DAS-II, RIAS-2, SB-5, UNIT-2 — what each measures, strengths and weaknesses.' },
          { id: 'justice', icon: '\u2696\uFE0F', label: 'Disability Justice & History', desc: 'Eugenics origins, Larry P., Atkins, processing-speed penalties, ADA accommodations.' },
          { id: 'flynn', icon: '\uD83D\uDCC8', label: 'The Flynn Effect', desc: 'Why average IQ rose ~3 points per decade, why renorming matters, why "my IQ is stable" is only half-true, and the recent evidence for attenuation.' },
          { id: 'neuropsych', icon: '\uD83E\uDDE0', label: 'Neuropsychology Basics', desc: '6 batteries (NEPSY-II, D-KEFS, WRAML-2, CVLT-C, Luria-Nebraska, NIH Toolbox), 7 neuropsych domains with targeted assessments, neuropsych vs school-psych scope comparison, when to refer out.' },
          { id: 'biasSpotter', icon: '\uD83D\uDD75\uFE0F', label: 'Spot the Bias — interactive', desc: '12 short vignettes. Identify which of 6 validity issues applies to each (linguistic / cultural / outdated norms / construct under-rep / examiner / ceiling-floor). Builds the "what could go wrong with this assessment" reflex.' }
        ];
        return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6' },
          backBtn('menu', null, 'Main menu'),
          h('h2', { className: 'text-2xl font-black text-cyan-200 mb-4' }, '\uD83E\uDDE0 Cognitive Assessment Literacy'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            subs.map(function(x) {
              return h('button', {
                key: x.id,
                onClick: function() { upd({ sub: x.id }); },
                className: 'text-left p-4 rounded-xl bg-slate-800/60 border border-cyan-500/30 hover:bg-slate-700/60 focus:ring-2 focus:ring-cyan-400 focus:outline-none'
              },
                h('div', { className: 'text-2xl mb-1' }, x.icon),
                h('div', { className: 'text-sm font-bold text-cyan-200 mb-1' }, x.label),
                h('div', { className: 'text-xs text-slate-300 leading-snug' }, x.desc)
              );
            })
          )
        );
      }

      function renderCognitiveTheories() {
        return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6 space-y-5' },
          backBtn('cognitive', null, 'Cognitive menu'),
          h('h2', { className: 'text-2xl font-black text-cyan-200' }, '\uD83D\uDCDA Theories of Intelligence'),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-cyan-500/30' },
            h('h3', { className: 'text-lg font-black text-cyan-300 mb-2' }, 'CHC (Cattell-Horn-Carroll)'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'The dominant contemporary theoretical framework in psychoeducational assessment. Hierarchical — general ability (g) at top, 9+ broad abilities below, 70+ narrow abilities nested further. Most modern batteries are CHC-aligned (WJ-IV is the most explicit operationalization). Schneider & McGrew (2018) is the current model.'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
              CHC_BROAD.map(function(b) {
                return h('div', { key: b.code, className: 'p-3 rounded-lg bg-slate-900/60 border border-cyan-500/20' },
                  h('div', { className: 'text-xs font-black text-cyan-200 mb-1' }, b.code + ' — ' + b.name),
                  h('div', { className: 'text-xs text-slate-300 mb-1' }, b.desc),
                  h('div', { className: 'text-xs text-slate-400 italic' }, 'Example: ' + b.example)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
            h('h3', { className: 'text-lg font-black text-purple-300 mb-2' }, 'PASS (Das & Naglieri, Luria-based)'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Neuropsychologically grounded — derives from Luria\'s work on brain function. Four components. Operationalized in the Cognitive Assessment System (CAS2). Strong for identifying specific cognitive deficits tied to neurological function.'),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              PASS_COMPONENTS.map(function(p) {
                return h('div', { key: p.code, className: 'p-3 rounded-lg bg-slate-900/60 border border-purple-500/20' },
                  h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, p.code + ' — ' + p.name),
                  h('div', { className: 'text-xs text-slate-300 mb-1' }, p.desc),
                  h('div', { className: 'text-xs text-slate-400 italic' }, p.example)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/30' },
            h('h3', { className: 'text-lg font-black text-amber-300 mb-2' }, 'Gardner\'s Multiple Intelligences'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Popular in education; empirically contested. Claims 8 separate "intelligences" (plus some candidate additions).'),
            h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2 mb-3' },
              GARDNER_MI.map(function(g, i) {
                return h('div', { key: i, className: 'p-2 rounded-lg bg-slate-900/60 border border-amber-500/20' },
                  h('div', { className: 'text-xs font-black text-amber-200' }, g.name),
                  h('div', { className: 'text-xs text-slate-300' }, g.desc)
                );
              })
            ),
            h('div', { className: 'p-3 rounded-lg bg-red-900/30 border border-red-500/40' },
              h('div', { className: 'text-xs font-black text-red-300 mb-1' }, '\u26A0 Empirical critique'),
              h('div', { className: 'text-xs text-slate-200' }, GARDNER_CRITIQUE)
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30' },
            h('h3', { className: 'text-lg font-black text-emerald-300 mb-2' }, 'Sternberg\'s Triarchic Theory'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Three complementary aspects of intelligence. Sternberg\'s Triarchic Abilities Test (STAT) operationalized this but has not replaced mainstream batteries. The "practical intelligence" construct resonates but is hard to measure reliably.'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2' },
              STERNBERG_TRIARCHIC.map(function(s, i) {
                return h('div', { key: i, className: 'p-3 rounded-lg bg-slate-900/60 border border-emerald-500/20' },
                  h('div', { className: 'text-xs font-black text-emerald-200 mb-1' }, s.name),
                  h('div', { className: 'text-xs text-slate-300' }, s.desc)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-rose-500/30' },
            h('h3', { className: 'text-lg font-black text-rose-300 mb-2' }, 'Luria\'s Functional Units'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Alexander Luria\'s neuropsychological model — foundation for PASS and KABC-II. Three functional brain systems that must work together for purposeful behavior.'),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2' },
              LURIA_UNITS.map(function(u, i) {
                return h('div', { key: i, className: 'p-3 rounded-lg bg-slate-900/60 border border-rose-500/20' },
                  h('div', { className: 'text-xs font-black text-rose-200 mb-1' }, u.name),
                  h('div', { className: 'text-xs text-slate-300' }, u.desc)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-slate-500/30' },
            h('h3', { className: 'text-lg font-black text-slate-200 mb-2' }, 'Spearman\'s g (1904)'),
            h('p', { className: 'text-xs text-slate-300' }, 'The original finding that sparked the field: scores on any cognitive task correlate positively with scores on any other cognitive task (the "positive manifold"). Spearman called the common factor g — general cognitive ability. Every contemporary theory (CHC, PASS) accepts some version of g at the top of the hierarchy, even if they emphasize specific abilities below it. Arguments are about "how much g vs. how much specific" — not about whether g exists.')
          )
        );
      }

      function renderBatteryBuilder() {
        var battery = s.battery || [];
        var critique = s.batteryCritique || '';
        var loading = s.batteryLoading;
        var toggle = function(code) {
          var next = battery.slice();
          var ix = next.indexOf(code);
          if (ix >= 0) next.splice(ix, 1); else next.push(code);
          upd({ battery: next, batteryCritique: '' });
        };
        var runCritique = function() {
          if (!callGemini) { addToast({ message: 'AI unavailable', type: 'error' }); return; }
          if (battery.length < 2) { addToast({ message: 'Select at least 2 broad abilities first', type: 'warning' }); return; }
          upd({ batteryLoading: true, batteryCritique: '' });
          Promise.resolve(callGemini(buildBatteryCritiquePrompt(battery), false, false, 0.5, null))
            .then(function(resp) {
              var text = (typeof resp === 'string') ? resp : (resp && resp.text ? resp.text : String(resp));
              upd({ batteryLoading: false, batteryCritique: text });
              announceSR('Battery critique generated');
            })
            .catch(function(e) {
              upd({ batteryLoading: false, batteryCritique: 'Error: ' + (e && e.message ? e.message : 'unknown') });
            });
        };

        return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6 space-y-4' },
          backBtn('cognitive', null, 'Cognitive menu'),
          h('h2', { className: 'text-2xl font-black text-cyan-200' }, '\uD83D\uDD27 Battery Builder'),
          h('p', { className: 'text-xs text-slate-300' }, 'Select the CHC broad abilities you\'d include in a mock cognitive battery. Then ask the AI to critique what your battery would and wouldn\'t capture. This simulates the design decisions a psychoed evaluator makes.'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2' },
            CHC_BROAD.map(function(b) {
              var sel = battery.indexOf(b.code) >= 0;
              return h('button', {
                key: b.code,
                onClick: function() { toggle(b.code); },
                'aria-pressed': sel,
                className: 'text-left p-3 rounded-lg border-2 transition focus:ring-2 focus:ring-cyan-400 focus:outline-none ' + (sel ? 'bg-cyan-900/40 border-cyan-400' : 'bg-slate-800/60 border-slate-600 hover:border-cyan-500/50')
              },
                h('div', { className: 'text-xs font-black ' + (sel ? 'text-cyan-100' : 'text-slate-200') }, b.code + ' — ' + b.name),
                h('div', { className: 'text-xs mt-1 ' + (sel ? 'text-cyan-200' : 'text-slate-400') }, b.desc)
              );
            })
          ),
          h('div', { className: 'flex items-center gap-3 pt-2' },
            h('button', {
              onClick: runCritique,
              disabled: loading || battery.length < 2,
              className: 'px-5 py-2 rounded-xl font-bold text-sm ' + (loading || battery.length < 2 ? 'bg-slate-700 text-slate-400' : 'bg-cyan-600 text-white hover:bg-cyan-500')
            }, loading ? 'Thinking…' : '\u2728 Critique my battery'),
            h('span', { className: 'text-xs text-slate-400' }, battery.length + ' / ' + CHC_BROAD.length + ' broad abilities selected')
          ),
          critique && h('section', { className: 'p-4 rounded-xl bg-slate-900/60 border border-cyan-500/30' },
            h('h3', { className: 'text-sm font-black text-cyan-300 mb-2' }, 'Critique'),
            h('pre', { className: 'text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed' }, critique),
            h('div', { className: 'mt-3 no-print' },
              h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-cyan-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print battery + critique / Save as PDF')
            )
          )
        );
      }

      function renderRealBatteries() {
        return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6 space-y-3' },
          backBtn('cognitive', null, 'Cognitive menu'),
          h('h2', { className: 'text-2xl font-black text-cyan-200 mb-2' }, '\uD83D\uDCD6 Real Cognitive Batteries'),
          h('p', { className: 'text-xs text-slate-300 mb-4' }, 'The batteries clinicians actually use. Each makes different theoretical choices — what g to privilege, how to cover CHC, how to accommodate low-verbal or deaf populations. No single "best" — the right battery depends on the referral question.'),
          REAL_BATTERIES.map(function(b) {
            return h('section', { key: b.abbr, className: 'p-4 rounded-xl bg-slate-800/60 border border-cyan-500/30' },
              h('div', { className: 'flex items-baseline gap-3 mb-2' },
                h('span', { className: 'text-lg font-black text-cyan-200' }, b.abbr),
                h('span', { className: 'text-xs text-slate-400' }, '(' + b.ages + ')')
              ),
              h('div', { className: 'text-sm font-bold text-cyan-100 mb-1' }, b.name),
              h('div', { className: 'text-xs text-slate-300 mb-2' }, h('strong', null, 'Theory: '), b.theory),
              h('div', { className: 'text-xs text-slate-300 mb-2' }, h('strong', null, 'Measures: '), b.measures.join(' · ')),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 mt-2' },
                h('div', { className: 'p-2 rounded-lg bg-emerald-900/30 border border-emerald-500/30' },
                  h('div', { className: 'text-xs font-black text-emerald-300 mb-1' }, '\u2713 Strengths'),
                  h('div', { className: 'text-xs text-slate-200' }, b.strengths)
                ),
                h('div', { className: 'p-2 rounded-lg bg-amber-900/30 border border-amber-500/30' },
                  h('div', { className: 'text-xs font-black text-amber-300 mb-1' }, '\u26A0 Weaknesses'),
                  h('div', { className: 'text-xs text-slate-200' }, b.weaknesses)
                )
              )
            );
          })
        );
      }

      function renderNeuropsych() {
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          backBtn('cognitive', null, 'Cognitive menu'),
          h('h2', { className: 'text-2xl font-black text-cyan-200' }, '\uD83E\uDDE0 Neuropsychology Basics'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Neuropsychological assessment extends beyond cognitive ability (g, CHC) into the specific brain-behavior relationships that matter after brain injury, in neurological conditions, or for atypical cognitive profiles standard batteries miss. Most school psychologists aren\'t neuropsychologists, but should recognize when to refer and what a neuropsych eval adds.'),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-cyan-500/30' },
            h('h3', { className: 'text-sm font-black text-cyan-300 mb-3' }, '6 core neuropsych batteries'),
            h('div', { className: 'space-y-2' },
              NEUROPSYCH_BATTERIES.map(function(b, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'flex justify-between items-baseline mb-1' },
                    h('span', { className: 'text-sm font-black text-cyan-200' }, b.name),
                    h('span', { className: 'text-xs text-cyan-400 italic ml-2' }, 'Age ' + b.age)
                  ),
                  h('div', { className: 'text-xs text-slate-300 mb-1' }, h('strong', { className: 'text-cyan-300' }, 'Domains: '), b.domains),
                  h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-cyan-300' }, 'What: '), b.what),
                  h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 mt-2' },
                    h('div', { className: 'p-2 rounded bg-emerald-900/20 border border-emerald-500/30' },
                      h('div', { className: 'text-xs font-black text-emerald-300 mb-1' }, '\u2713 Strengths'),
                      h('div', { className: 'text-xs text-slate-200' }, b.strengths)
                    ),
                    h('div', { className: 'p-2 rounded bg-amber-900/20 border border-amber-500/30' },
                      h('div', { className: 'text-xs font-black text-amber-300 mb-1' }, '\u26A0 Limits'),
                      h('div', { className: 'text-xs text-slate-200' }, b.weaknesses)
                    )
                  )
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
            h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, '7 neuropsych domains and assessment'),
            h('div', { className: 'space-y-2' },
              NEUROPSYCH_DOMAIN_ASSESSMENT.map(function(d, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, d.domain),
                  h('div', { className: 'text-xs text-slate-300 mb-1' }, h('strong', { className: 'text-purple-300' }, 'Subdomains: '), d.subdomains),
                  h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-purple-300' }, 'Common tools: '), d.tools)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-cyan-900/40 to-sky-900/40 border border-cyan-500/30' },
            h('h3', { className: 'text-sm font-black text-cyan-200 mb-3' }, 'Neuropsychology vs. School Psychology'),
            h('div', { className: 'space-y-2' },
              NEUROPSYCH_VS_SCHOOLPSY.map(function(item, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-cyan-200 mb-2' }, item.question),
                  h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                    h('div', { className: 'p-2 rounded bg-cyan-900/20 border border-cyan-500/20' },
                      h('div', { className: 'text-xs font-bold text-cyan-300 mb-1' }, 'Neuropsychology'),
                      h('div', { className: 'text-xs text-slate-200' }, item.neuropsy)
                    ),
                    h('div', { className: 'p-2 rounded bg-sky-900/20 border border-sky-500/20' },
                      h('div', { className: 'text-xs font-bold text-sky-300 mb-1' }, 'School Psychology'),
                      h('div', { className: 'text-xs text-slate-200' }, item.schoolpsy)
                    )
                  )
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
            h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'Practical note for school psychs'),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'Most K-12 cases do NOT require neuropsych referral. Standard psychoed eval handles SLD, OHI (including ADHD), ID, SLI, and typical ASD presentations well. Reserve neuropsych referrals for: acquired brain injury (TBI with cognitive consequences), neurological conditions with cognitive implications (epilepsy, brain tumor, MS, cerebral palsy), complex atypical profiles that don\'t fit standard categories, cases where medical or legal decisions depend on comprehensive cognitive documentation. When referring, provide the neuropsychologist your comprehensive eval so they can build on it rather than duplicate.')
          )
        );
      }

      function renderFlynn() {
        var yr = s.flynnYear != null ? s.flynnYear : 1980;
        var baseYear = 2014; // WISC-V standardization year
        var rate = 3; // points per decade
        var shift = ((baseYear - yr) / 10) * rate;
        var shiftLabel = shift > 0 ? '+' + shift.toFixed(1) : shift.toFixed(1);
        // Attenuation modeling — gains slower post-2000
        var mid = 2000;
        var shiftAttenuated;
        if (yr >= mid) {
          shiftAttenuated = ((baseYear - yr) / 10) * 1.5;
        } else {
          shiftAttenuated = ((mid - yr) / 10) * 3 + ((baseYear - mid) / 10) * 1.5;
        }
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
          backBtn('cognitive', null, 'Cognitive menu'),
          h('h2', { className: 'text-2xl font-black text-cyan-200' }, '\uD83D\uDCC8 The Flynn Effect'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Across the 20th century, mean IQ scores rose about 3 points per decade when norms stayed fixed. James Flynn documented this in 14+ industrialized nations starting in the 1980s. The finding has major implications for how we interpret IQ scores across time — and for eligibility decisions made on old versus new norms.'),

          h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-cyan-900/40 to-sky-900/40 border border-cyan-500/30' },
            h('h3', { className: 'text-sm font-black text-cyan-200 mb-3' }, 'Interactive demonstration'),
            h('p', { className: 'text-xs text-slate-300 mb-3' }, 'A person who scored 100 (mean) on a fresh test given in their birth year would score approximately what on a ' + baseYear + '-normed test today?'),
            h('div', { className: 'mb-3' },
              h('label', { className: 'text-xs font-bold text-cyan-300 mb-1 block' }, 'Norm year of original test: ', h('span', { className: 'text-cyan-100' }, yr)),
              h('input', {
                type: 'range', min: 1950, max: 2020, step: 1, value: yr,
                onChange: function(e) { upd({ flynnYear: parseInt(e.target.value, 10) }); },
                className: 'w-full',
                'aria-label': 'Norm year'
              }),
              h('div', { className: 'flex justify-between text-xs text-slate-300 mt-1' },
                h('span', null, '1950'), h('span', null, '1985'), h('span', null, '2020')
              )
            ),
            h('div', { className: 'grid grid-cols-2 gap-3' },
              h('div', { className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs text-slate-400' }, 'Classic Flynn (3 pts/decade)'),
                h('div', { className: 'text-2xl font-black text-cyan-200' }, (100 - shift).toFixed(1)),
                h('div', { className: 'text-xs text-slate-400' }, 'Expected score today (' + shiftLabel + ' shift)')
              ),
              h('div', { className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs text-slate-400' }, 'Attenuated model (post-2000)'),
                h('div', { className: 'text-2xl font-black text-cyan-200' }, (100 - shiftAttenuated).toFixed(1)),
                h('div', { className: 'text-xs text-slate-400' }, 'Accounts for recent slowdown in gains')
              )
            ),
            h('p', { className: 'text-xs text-slate-300 mt-3 italic' }, 'Translation: a person who performed "average" on a 1960 test would score below average on today\'s norms. Not because they\'re less able — but because the population shifted upward around them, and norms were reset.')
          ),

          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-cyan-500/30' },
            h('h3', { className: 'text-sm font-black text-cyan-300 mb-3' }, 'Key findings and implications'),
            h('div', { className: 'space-y-2' },
              FLYNN_NOTES.map(function(n, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                  h('div', { className: 'text-xs font-black text-cyan-200 mb-1' }, n.title),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, n.body)
                );
              })
            )
          ),

          h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
            h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'Practical consequences'),
            h('ul', { className: 'text-xs text-slate-200 space-y-1 list-disc list-inside' },
              h('li', null, h('strong', null, 'Don\'t compare scores across test editions without correction. '), 'A WISC-III score from 1992 and a WISC-V score from 2024 are not directly comparable.'),
              h('li', null, h('strong', null, 'Use current-edition norms when eligibility depends on cutoffs. '), 'Flynn gains mean old norms over-qualify students for giftedness and under-qualify for ID.'),
              h('li', null, h('strong', null, 'In death-penalty mitigation, Flynn correction is routinely litigated. '), 'Courts are inconsistent — know your jurisdiction\'s rules.'),
              h('li', null, h('strong', null, '"My kid\'s IQ went up" may be test artifact. '), 'If different editions were used, a "gain" may just be switching from outdated norms to current ones.')
            )
          )
        );
      }

      function renderCogJustice() {
        return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6 space-y-3' },
          backBtn('cognitive', null, 'Cognitive menu'),
          h('h2', { className: 'text-2xl font-black text-cyan-200 mb-2' }, '\u2696\uFE0F Disability Justice & History'),
          h('p', { className: 'text-xs text-slate-300 mb-4' }, 'Cognitive testing has been used both to support and to harm disabled, minoritized, and immigrant populations. A literate consumer of assessment — clinical or lay — knows this history and its ongoing implications.'),
          COG_JUSTICE.map(function(j, i) {
            return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border border-rose-500/30' },
              h('h3', { className: 'text-sm font-black text-rose-200 mb-2' }, j.title),
              h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, j.body)
            );
          })
        );
      }

      function renderBiasSpotter() {
        // Six core validity issues. Order matters — used as both labels and answer keys.
        var ISSUES = [
          { id: 'linguistic',   label: 'Linguistic bias',           color: '#0ea5e9', icon: '\uD83D\uDDE3\uFE0F', def: 'Test was administered in a language the examinee is not fully fluent in, or item language is too complex for the examinee\'s reading/comprehension level.' },
          { id: 'cultural',     label: 'Cultural bias',             color: '#a855f7', icon: '\uD83C\uDF0E', def: 'Item content assumes familiarity with cultural references, customs, or environments not shared by the examinee.' },
          { id: 'outdatedNorms', label: 'Outdated norms',           color: '#f59e0b', icon: '\uD83D\uDCC5', def: 'Test norms are too old to validly compare current performance (Flynn effect, demographic shifts).' },
          { id: 'underRep',     label: 'Construct under-representation', color: '#22c55e', icon: '\uD83D\uDCD0', def: 'Test samples too narrow a slice of the construct it claims to measure (e.g., "reading" via decoding only).' },
          { id: 'examiner',     label: 'Examiner / administration effect', color: '#ef4444', icon: '\uD83D\uDC65', def: 'Examiner behavior, rapport, race-of-examiner effects, distractions, or protocol deviations affect the score.' },
          { id: 'ceilingFloor', label: 'Ceiling / floor effect',    color: '#6366f1', icon: '\uD83D\uDCCF', def: 'Test items don\'t span the examinee\'s true ability range \u2014 score is artificially capped at top or bottom.' }
        ];
        // 12 vignettes. `correct` indexes into ISSUES.
        var VIGNETTES = [
          { id: 1, scenario: 'A 9-year-old whose home language is Spanish takes the WISC-V Verbal Comprehension subtests in English. She scores in the "Borderline" range (FSIQ ≈ 73). Her teachers describe her as bright and articulate in Spanish.', correct: 0, primary: 'linguistic', secondary: 'underRep', why: 'The test cannot validly measure her verbal reasoning in a language she does not yet speak fluently. AERA/APA/NCME Standard 3.13 explicitly addresses this. A non-verbal battery (e.g., UNIT-2) or a cognitively-equivalent Spanish instrument would be more valid.' },
          { id: 2, scenario: 'An assessment item shows a place-setting with a knife and fork; the examinee must say what is missing (a spoon). A child raised in a household that primarily eats with chopsticks misses the item.', correct: 1, primary: 'cultural', secondary: null, why: 'The item assumes Western dining-utensil familiarity. The construct (visual reasoning / set completion) gets confounded with cultural exposure. This is a classic example used in cross-cultural assessment training.' },
          { id: 3, scenario: 'A child takes a cognitive assessment normed in 1997. When re-tested with the same publisher\'s newer version (normed 2022), his Full Scale score appears to drop ~7 points despite no change in actual ability.', correct: 2, primary: 'outdatedNorms', secondary: null, why: 'The Flynn effect: average IQ rises ~3 points per decade as norms update. Old norms over-estimate current performance. NASP recommends never using norms older than ~10\u201312 years for high-stakes decisions like SLD eligibility.' },
          { id: 4, scenario: 'A "reading achievement" test consists only of phonics-decoding tasks (read aloud isolated words and nonwords). A skilled reader who comprehends well but reads slowly scores below average.', correct: 3, primary: 'underRep', secondary: null, why: 'Reading is a multidimensional construct: decoding, fluency, vocabulary, comprehension. Sampling only decoding under-represents the construct. The score will systematically understate ability for compensated readers and overstate it for word-callers without comprehension.' },
          { id: 5, scenario: 'A 7-year-old Black child is assessed by a White examiner he has never met. He gives minimal one-word responses. The examiner scores most verbal items as failures and reports a low Verbal Comprehension Index.', correct: 4, primary: 'examiner', secondary: null, why: 'Race-of-examiner effects are documented (Sattler; Fagan & Holland 2007). Without rapport-building and culturally responsive administration, response rate underestimates ability. The score reflects the testing situation, not the construct.' },
          { id: 6, scenario: 'A highly gifted 6-year-old takes a verbal-comprehension subtest where the highest available item is at the 99th percentile for her age. She gets every item correct.', correct: 5, primary: 'ceilingFloor', secondary: null, why: 'Ceiling effect. Her true ability cannot be measured \u2014 the test ran out of items before she ran out of ability. Score is the floor of "at least the 99th percentile," but no upper bound. Refer to an extended-norms assessment (SB-5 EXIQ, WPPSI/WISC extended norms).' },
          { id: 7, scenario: 'A Deaf adolescent takes a verbally-administered IQ test through an ASL interpreter. The test is timed; some items rely on phonological awareness; one subtest requires distinguishing rhymes.', correct: 0, primary: 'linguistic', secondary: 'underRep', why: 'Auditory/phonological items cannot be meaningfully translated into ASL. Time pressure compounds the issue \u2014 the interpreter must finish before the timer. Use a Deaf-normed instrument (e.g., UNIT-2, Leiter-3) administered in the examinee\'s native language (ASL).' },
          { id: 8, scenario: 'Personality inventory item: "I enjoy speaking up at large gatherings." An examinee from a cultural background that values quiet humility marks "strongly disagree" \u2014 not because she lacks confidence, but because the item conflates extraversion with cultural display rules.', correct: 1, primary: 'cultural', secondary: null, why: 'Personality items are particularly vulnerable. Display rules (Matsumoto et al. 2008) shape how traits manifest. The item is operationalizing extraversion through a culturally-loaded behavior. Cross-cultural personality research is a major area of validity work.' },
          { id: 9, scenario: 'A school psychologist uses a cognitive battery normed in 2008 to support a 2024 SLD eligibility determination because the school district has not yet purchased the updated edition.', correct: 2, primary: 'outdatedNorms', secondary: null, why: 'Norms 16+ years old. NASP guidance is clear: outdated norms cannot anchor high-stakes decisions. The school district\'s budget constraint does not transfer to the validity of the score. Best practice: defer the decision or use an alternate instrument with current norms.' },
          { id: 10, scenario: 'During administration, the examiner\'s phone rings repeatedly. She apologizes and silences it after the third interruption, but the child has visibly disengaged. Two subtests fall below average; the rest are average.', correct: 4, primary: 'examiner', secondary: null, why: 'Standard administration was violated; attention/engagement were compromised by examiner-controlled distractions. The two affected subtests are not interpretable as estimates of ability. Document the disruption, re-administer the affected subtests at another session, or note the limitation explicitly in the report.' },
          { id: 11, scenario: 'A "social skills" assessment consists of a single 5-minute structured observation in a clinic testing room. The clinician concludes the child has poor peer interaction skills.', correct: 3, primary: 'underRep', secondary: null, why: 'Social skills are a behavioral construct that varies across settings (clinic vs. school vs. home), partners (peers vs. adults vs. siblings), and tasks. A 5-minute observation in one structured setting cannot represent the construct. Use multi-source/multi-setting assessment (BASC-3 PRS+TRS+SRP, peer rating, observation).' },
          { id: 12, scenario: 'A child with a severe intellectual disability takes a school-age cognitive battery. Her score is at the lowest possible value the test reports. Two months later she is reassessed; her score is again at that floor, even though her caregivers report meaningful skill gains.', correct: 5, primary: 'ceilingFloor', secondary: null, why: 'Floor effect. The test cannot distinguish her from someone with significantly different abilities at the low end. Real changes are masked. Use an instrument designed for the low end of the distribution (e.g., adaptive scales like Vineland-3, Bayley-4 for younger ages, or extended-norms versions).' }
        ];

        // State (default to first vignette in canonical order; randomized by seed for variety).
        var biasSeed = s.alBiasSeed || 1;
        var biasIdx = s.alBiasIdx == null ? -1 : s.alBiasIdx;
        var biasAnswered = !!s.alBiasAnswered;
        var biasPick = s.alBiasPick;
        var biasScore = s.alBiasScore || 0;
        var biasRounds = s.alBiasRounds || 0;
        var biasStreak = s.alBiasStreak || 0;
        var biasBest = s.alBiasBest || 0;
        var biasShown = s.alBiasShown || []; // indices already used in this run

        function nextRound() {
          // Pick a vignette not seen yet; reset shown list when all are used.
          var pool = [];
          for (var i = 0; i < VIGNETTES.length; i++) if (biasShown.indexOf(i) < 0) pool.push(i);
          if (pool.length === 0) { pool = []; for (var j = 0; j < VIGNETTES.length; j++) pool.push(j); biasShown = []; }
          var seedNext = ((biasSeed * 16807 + 11) % 2147483647) || 7;
          var pick = pool[seedNext % pool.length];
          upd({
            alBiasSeed: seedNext,
            alBiasIdx: pick,
            alBiasAnswered: false,
            alBiasPick: null,
            alBiasShown: biasShown.concat([pick])
          });
        }

        function answer(issueIdx) {
          if (biasAnswered) return;
          var v = VIGNETTES[biasIdx];
          var correct = issueIdx === v.correct;
          var newScore = biasScore + (correct ? 1 : 0);
          var newStreak = correct ? (biasStreak + 1) : 0;
          var newBest = Math.max(biasBest, newStreak);
          upd({
            alBiasAnswered: true,
            alBiasPick: issueIdx,
            alBiasScore: newScore,
            alBiasRounds: biasRounds + 1,
            alBiasStreak: newStreak,
            alBiasBest: newBest
          });
          if (addToast) addToast(correct ? '\u2705 Correct \u2014 ' + ISSUES[v.correct].label : '\u274C Not the primary issue \u2014 it was ' + ISSUES[v.correct].label, correct ? 'success' : 'info');
        }

        // Intro state
        if (biasIdx < 0) {
          return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
            backBtn('cognitive', null, 'Cognitive menu'),
            h('h2', { className: 'text-2xl font-black text-cyan-200' }, '\uD83D\uDD75\uFE0F Spot the Bias'),
            h('p', { className: 'text-sm text-slate-200 leading-relaxed' }, 'You will see 12 brief assessment vignettes. For each, identify which of six common validity issues is the *primary* concern. After you pick, you will see a coaching block explaining what is happening and what a school psychologist would do about it.'),
            h('div', { className: 'p-4 rounded-xl bg-slate-800/60 border border-cyan-500/30' },
              h('div', { className: 'text-sm font-bold text-cyan-200 mb-3' }, 'The six validity issues'),
              h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                ISSUES.map(function(iss, ii) {
                  return h('div', { key: ii,
                    style: { background: iss.color + '15', border: '1px solid ' + iss.color + '60', borderRadius: 8, padding: '8px 10px' }
                  },
                    h('div', { className: 'flex items-center gap-2 mb-1' },
                      h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, iss.icon),
                      h('span', { style: { color: iss.color, fontWeight: 800, fontSize: 12 } }, iss.label)
                    ),
                    h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, iss.def)
                  );
                })
              )
            ),
            h('button', {
              onClick: nextRound,
              className: 'w-full py-3 rounded-xl bg-cyan-600 text-white font-bold text-sm hover:bg-cyan-500 focus:outline-none focus:ring-2 ring-cyan-300'
            }, '\uD83D\uDD75\uFE0F Start \u2014 vignette 1 of 12')
          );
        }

        var v = VIGNETTES[biasIdx];
        var isCorrect = biasAnswered && biasPick === v.correct;
        var pct = biasRounds > 0 ? Math.round((biasScore / biasRounds) * 100) : 0;
        var allDone = biasShown.length >= VIGNETTES.length && biasAnswered;
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
          backBtn('cognitive', null, 'Cognitive menu'),
          h('h2', { className: 'text-2xl font-black text-cyan-200' }, '\uD83D\uDD75\uFE0F Spot the Bias'),
          // Score header
          h('div', { className: 'flex flex-wrap gap-3 items-center text-xs' },
            h('span', { className: 'text-slate-300' }, 'Vignette ', h('strong', { className: 'text-white' }, biasShown.length + (biasAnswered ? '' : ''))),
            h('span', { className: 'text-slate-300' }, 'Score ', h('strong', { className: 'text-emerald-300' }, biasScore + ' / ' + biasRounds)),
            biasRounds > 0 && h('span', { className: 'text-slate-300' }, 'Accuracy ', h('strong', { className: 'text-cyan-300' }, pct + '%')),
            h('span', { className: 'text-slate-300' }, 'Streak ', h('strong', { className: 'text-amber-300' }, biasStreak)),
            h('span', { className: 'text-slate-300' }, 'Best ', h('strong', { className: 'text-yellow-300' }, biasBest))
          ),
          // The vignette
          h('section', { className: 'p-5 rounded-xl bg-slate-800/60 border-2 border-cyan-500/40' },
            h('div', { className: 'text-xs font-bold text-cyan-300 uppercase tracking-widest mb-2' }, 'Vignette ' + (biasShown.length) + ' of ' + VIGNETTES.length),
            h('p', { className: 'text-sm text-slate-100 leading-relaxed' }, v.scenario)
          ),
          // 6 issue picker buttons
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2', role: 'radiogroup', 'aria-label': 'Pick the primary validity issue' },
            ISSUES.map(function(iss, ii) {
              var picked = biasAnswered && biasPick === ii;
              var isRight = biasAnswered && ii === v.correct;
              var bg, border, color;
              if (biasAnswered) {
                if (isRight) { bg = 'rgba(34,197,94,0.15)'; border = '#22c55e'; color = '#bbf7d0'; }
                else if (picked) { bg = 'rgba(239,68,68,0.15)'; border = '#ef4444'; color = '#fecaca'; }
                else { bg = 'rgba(30,41,59,0.6)'; border = 'rgba(100,116,139,0.4)'; color = '#94a3b8'; }
              } else {
                bg = iss.color + '12'; border = iss.color + '60'; color = '#e2e8f0';
              }
              return h('button', {
                key: ii, role: 'radio',
                'aria-checked': picked ? 'true' : 'false',
                disabled: biasAnswered,
                onClick: function() { answer(ii); },
                style: { padding: '10px 12px', borderRadius: 10, background: bg, color: color, border: '2px solid ' + border, cursor: biasAnswered ? 'default' : 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12, transition: 'all 0.15s' }
              },
                h('div', { className: 'flex items-center gap-2 mb-1' },
                  h('span', { style: { fontSize: 18 }, 'aria-hidden': 'true' }, iss.icon),
                  h('span', { style: { color: biasAnswered ? color : iss.color, fontSize: 13, fontWeight: 800 } }, iss.label)
                ),
                h('div', { style: { fontSize: 11, fontWeight: 500, color: biasAnswered ? color : '#cbd5e1', lineHeight: 1.45 } }, iss.def)
              );
            })
          ),
          // Feedback after answering
          biasAnswered && h('section', {
            className: 'p-4 rounded-xl',
            style: { background: isCorrect ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.08)', border: '1px solid ' + (isCorrect ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.40)') }
          },
            h('div', { className: 'text-sm font-bold mb-2', style: { color: isCorrect ? '#86efac' : '#fca5a5' } },
              isCorrect ? '\u2705 Correct \u2014 ' + ISSUES[v.correct].label
                        : '\u274C The primary issue is ' + ISSUES[v.correct].label + (biasPick != null ? ' (you picked ' + ISSUES[biasPick].label + ')' : '')
            ),
            h('p', { className: 'text-xs text-slate-100 leading-relaxed mb-2' }, v.why),
            v.secondary && h('div', { className: 'text-xs text-slate-300 italic mb-2' },
              'Secondary issue also at play: ', h('strong', { style: { color: ISSUES.filter(function(x) { return x.id === v.secondary; })[0].color } }, ISSUES.filter(function(x) { return x.id === v.secondary; })[0].label)
            ),
            allDone
              ? h('div', { className: 'p-3 rounded-lg bg-cyan-900/30 border border-cyan-500/40 mt-2' },
                  h('div', { className: 'text-sm font-black text-cyan-200 mb-1' }, '\uD83C\uDFC6 All 12 vignettes complete!'),
                  h('div', { className: 'text-xs text-slate-100 leading-relaxed' },
                    'Final score: ', h('strong', { className: 'text-white' }, biasScore + ' / ' + VIGNETTES.length + ' (' + Math.round((biasScore / VIGNETTES.length) * 100) + '%)'),
                    biasScore === VIGNETTES.length ? ' \u2014 every primary issue spotted. Ready for case-conference work.' :
                    biasScore >= 10 ? ' \u2014 strong validity reasoning. The misses are usually examiner vs. construct under-rep, the two most-overlapping categories.' :
                    biasScore >= 7 ? ' \u2014 solid baseline. Re-read the vignettes you missed; bias categories overlap, so naming the *primary* one takes practice.' :
                    ' \u2014 these distinctions are subtle. Re-read each vignette + coaching block, then retake. Pattern recognition for validity issues comes from many examples.'
                  ),
                  h('button', {
                    onClick: function() { upd({ alBiasIdx: -1, alBiasShown: [], alBiasScore: 0, alBiasRounds: 0, alBiasStreak: 0 }); },
                    className: 'mt-2 px-4 py-1.5 rounded-lg bg-cyan-600 text-white font-bold text-xs hover:bg-cyan-500'
                  }, '\uD83D\uDD04 Restart')
                )
              : h('button', {
                  onClick: nextRound,
                  className: 'mt-1 px-4 py-2 rounded-lg bg-cyan-600 text-white font-bold text-sm hover:bg-cyan-500 focus:outline-none focus:ring-2 ring-cyan-300'
                }, '\u27A1\uFE0F Next vignette')
          )
        );
      }
      // ─────────────────────────────────────────
      // MODULE 2: PERSONALITY  (PLACEHOLDER — expanded below)
      // ─────────────────────────────────────────
      function renderPersonality() {
        return _RENDER_PERSONALITY(h, s, upd, callGemini, addToast, backBtn);
      }

      // ─────────────────────────────────────────
      // MODULE 3: CAREER  (PLACEHOLDER — expanded below)
      // ─────────────────────────────────────────
      function renderCareer() {
        return _RENDER_CAREER(h, s, upd, callGemini, addToast, backBtn);
      }

      // ─────────────────────────────────────────
      // MODULE 4: EMPLOYER  (PLACEHOLDER — expanded below)
      // ─────────────────────────────────────────
      function renderEmployer() {
        return _RENDER_EMPLOYER(h, s, upd, callGemini, addToast, backBtn);
      }

      // ─────────────────────────────────────────
      // MODULE 5: SCHOOL PSYCH (PLACEHOLDER — expanded below)
      // ─────────────────────────────────────────
      function renderSchoolPsych() {
        return _RENDER_SCHOOLPSYCH(h, s, upd, callGemini, addToast, backBtn);
      }

      // ─────────────────────────────────────────
      // MODULE 6: JUNK SCIENCE CAPSTONE (PLACEHOLDER — expanded below)
      // ─────────────────────────────────────────
      function renderJunk() {
        return _RENDER_JUNK(h, s, upd, callGemini, addToast, backBtn, setAlCeleb, alCeleb);
      }

      // ─────────────────────────────────────────
      // MODULE 7: SOURCES & FURTHER READING
      // ─────────────────────────────────────────
      function renderSources() {
        var sections = [
          { key: 'cognitive', label: 'Cognitive Assessment', color: 'cyan' },
          { key: 'personality', label: 'Personality', color: 'purple' },
          { key: 'career', label: 'Career & Values', color: 'emerald' },
          { key: 'employer', label: 'Employer Assessment & Law', color: 'amber' },
          { key: 'schoolpsych', label: 'School Psychology & IEP', color: 'sky' },
          { key: 'resources', label: 'Online Resources & Organizations', color: 'rose' }
        ];
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
          backBtn('menu', null, 'Main menu'),
          h('h2', { className: 'text-2xl font-black text-slate-100' }, '\uD83D\uDCDA Sources & Further Reading'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Primary sources for the claims, frameworks, and numerical estimates used throughout this tool. Organized by module. For claims not cited here, the basis is standard material found in any graduate-level intellectual/psychoeducational assessment text (e.g., Sattler; Flanagan & Harrison; Reynolds et al.).'),
          sections.map(function(sec) {
            var items = SOURCES[sec.key] || [];
            return h('section', { key: sec.key, className: 'p-4 rounded-xl bg-slate-800/60 border border-' + sec.color + '-500/30' },
              h('h3', { className: 'text-base font-black text-' + sec.color + '-200 mb-3' }, sec.label),
              h('ul', { className: 'space-y-3' },
                items.map(function(item, i) {
                  return h('li', { key: i, className: 'p-2 rounded bg-slate-900/60' },
                    h('div', { className: 'text-xs text-slate-100 leading-relaxed' }, item.cite),
                    h('div', { className: 'text-xs text-slate-400 italic mt-1' }, item.note)
                  );
                })
              )
            );
          }),
          h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-slate-500/30' },
            h('h3', { className: 'text-sm font-black text-slate-200 mb-2' }, 'Citation style note'),
            h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Citations are in APA 7th edition format where practical. Legal citations follow Bluebook. Some online resources don\'t have traditional citations; URLs are provided in-text. If you\'re using this tool for a course assignment, consult your instructor\'s preferred style guide.')
          )
        );
      }

      // ─────────────────────────────────────────
      // MODULE 8: TEACHER / INSTRUCTOR MODE
      // ─────────────────────────────────────────
      function renderTeacher() {
        var sub = s.sub;

        if (sub === 'courses') {
          return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
            backBtn('teacher', null, 'Teacher menu'),
            h('h2', { className: 'text-2xl font-black text-violet-200' }, '\uD83D\uDCCB Course Alignment'),
            h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Which modules fit which courses. Use this to plan adoptions — for a 2-week unit in Tests & Measurements you need different modules than for a single lecture in Intro Psych.'),
            COURSE_ALIGNMENT.map(function(c, i) {
              return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border border-violet-500/30' },
                h('div', { className: 'flex items-baseline justify-between mb-1' },
                  h('h3', { className: 'text-base font-black text-violet-200' }, c.course),
                  h('span', { className: 'text-xs text-violet-400 italic ml-2' }, c.level)
                ),
                h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-violet-300' }, 'Recommended modules: '), c.modules.join(', ')),
                h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-violet-300' }, 'Pedagogical goal: '), c.objectives)
              );
            })
          );
        }

        if (sub === 'objectives') {
          var modSections = [
            { key: 'cognitive', label: 'Cognitive Assessment', color: 'cyan' },
            { key: 'personality', label: 'Personality', color: 'purple' },
            { key: 'career', label: 'Career & Values', color: 'emerald' },
            { key: 'employer', label: 'Employer Assessment', color: 'amber' },
            { key: 'schoolpsych', label: 'School Psychology', color: 'sky' }
          ];
          return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
            backBtn('teacher', null, 'Teacher menu'),
            h('h2', { className: 'text-2xl font-black text-violet-200' }, '\uD83C\uDFAF Module-by-Module Learning Objectives'),
            h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Bloom-leveled outcomes suitable for a syllabus. Written to align with APA Undergraduate Learning Outcomes (goals 1, 2, 3) and NASP Professional Standards where relevant.'),
            modSections.map(function(sec) {
              var items = LEARNING_OBJECTIVES[sec.key] || [];
              return h('section', { key: sec.key, className: 'p-4 rounded-xl bg-slate-800/60 border border-' + sec.color + '-500/30' },
                h('h3', { className: 'text-sm font-black text-' + sec.color + '-200 mb-2' }, sec.label),
                h('ul', { className: 'text-xs text-slate-200 space-y-1 list-disc list-inside' },
                  items.map(function(obj, i) { return h('li', { key: i, className: 'leading-relaxed' }, obj); })
                )
              );
            }),
            h('div', { className: 'no-print' },
              h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-violet-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print objectives for syllabus')
            )
          );
        }

        if (sub === 'prompts') {
          return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
            backBtn('teacher', null, 'Teacher menu'),
            h('h2', { className: 'text-2xl font-black text-violet-200' }, '\uD83D\uDCAC Discussion Prompts'),
            h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Seminar-style questions that surface the tool\'s key tensions. Mix of technical, applied, ethical, and meta-level prompts. Good for weekly discussion sections, essay assignments, or in-class debate.'),
            DISCUSSION_PROMPTS.map(function(p, i) {
              return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border border-violet-500/30' },
                h('div', { className: 'text-xs font-black text-violet-300 mb-1' }, (i + 1) + '. ' + p.topic),
                h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, p.prompt)
              );
            })
          );
        }

        if (sub === 'activities') {
          return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
            backBtn('teacher', null, 'Teacher menu'),
            h('h2', { className: 'text-2xl font-black text-violet-200' }, '\uD83D\uDEE0 In-Class Activities'),
            h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Eight classroom activities using the tool interactively. Each includes setup, runtime estimate, task, and debrief prompts. Mix of individual reflection, pair work, small groups, and whole-class.'),
            ACTIVITIES.map(function(a, i) {
              return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border border-violet-500/30' },
                h('h3', { className: 'text-base font-black text-violet-200 mb-1' }, (i + 1) + '. ' + a.name),
                h('div', { className: 'text-xs text-violet-400 italic mb-2' }, 'Runtime: ' + a.runtime),
                h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-violet-300' }, 'Setup: '), a.setup),
                h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-violet-300' }, 'Task: '), a.task),
                h('div', { className: 'text-xs text-slate-200 p-2 rounded bg-emerald-900/20 border border-emerald-500/30' }, h('strong', { className: 'text-emerald-300' }, 'Debrief: '), a.debrief)
              );
            })
          );
        }

        if (sub === 'rubric') {
          return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
            backBtn('teacher', null, 'Teacher menu'),
            h('h2', { className: 'text-2xl font-black text-violet-200' }, '\uD83D\uDCCF Assessment Rubric'),
            h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Five-dimension rubric for grading student work on assignments using this tool. Each dimension scored 1-4 (Beginning, Developing, Proficient, Excellent). Customize by weighting dimensions for your course emphasis.'),
            RUBRIC_ITEMS.map(function(r, i) {
              return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border border-violet-500/30' },
                h('h3', { className: 'text-sm font-black text-violet-200 mb-2' }, r.area),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
                  [
                    { tier: 'Excellent (4)', text: r.excellent, color: 'emerald' },
                    { tier: 'Proficient (3)', text: r.proficient, color: 'sky' },
                    { tier: 'Developing (2)', text: r.developing, color: 'amber' },
                    { tier: 'Beginning (1)', text: r.beginning, color: 'rose' }
                  ].map(function(tier, j) {
                    return h('div', { key: j, className: 'p-2 rounded bg-' + tier.color + '-900/20 border border-' + tier.color + '-500/30' },
                      h('div', { className: 'text-xs font-black text-' + tier.color + '-300 mb-1' }, tier.tier),
                      h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, tier.text)
                    );
                  })
                )
              );
            }),
            h('div', { className: 'no-print' },
              h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-violet-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print rubric')
            )
          );
        }

        // Teacher submenu
        var tsubs = [
          { id: 'courses', icon: '\uD83D\uDCCB', label: 'Course Alignment', desc: '10 course types mapped to recommended modules and pedagogical goals. From Intro Psych to graduate School Psych.' },
          { id: 'objectives', icon: '\uD83C\uDFAF', label: 'Learning Objectives', desc: 'Bloom-leveled learning outcomes per module, syllabus-ready. Aligned with APA Undergrad Learning Outcomes.' },
          { id: 'prompts', icon: '\uD83D\uDCAC', label: 'Discussion Prompts', desc: '10 seminar-style questions spanning technical, applied, ethical, and meta-level territory.' },
          { id: 'activities', icon: '\uD83D\uDEE0', label: 'In-Class Activities', desc: '8 hands-on classroom activities with setup, runtime, task, and debrief. Mix of individual, pair, group, and whole-class.' },
          { id: 'rubric', icon: '\uD83D\uDCCF', label: 'Assessment Rubric', desc: '5-dimension rubric for grading student work. Ready to customize for your course emphasis.' }
        ];
        return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6' },
          backBtn('menu', null, 'Main menu'),
          h('h2', { className: 'text-2xl font-black text-violet-200 mb-2' }, '\uD83C\uDF93 Teacher / Instructor Mode'),
          h('p', { className: 'text-xs text-slate-300 mb-4 leading-relaxed' }, 'Everything you need to adopt this tool in a Psychology, Education, School Psychology, or Industrial/Organizational Psych course. The content is built for undergraduate and graduate teaching; pick what fits your level.'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            tsubs.map(function(x) {
              return h('button', {
                key: x.id,
                onClick: function() { upd({ sub: x.id }); },
                className: 'text-left p-4 rounded-xl bg-slate-800/60 border border-violet-500/30 hover:bg-slate-700/60 focus:ring-2 focus:ring-violet-400 focus:outline-none'
              },
                h('div', { className: 'text-2xl mb-1' }, x.icon),
                h('div', { className: 'text-sm font-bold text-violet-200 mb-1' }, x.label),
                h('div', { className: 'text-xs text-slate-300 leading-snug' }, x.desc)
              );
            })
          )
        );
      }

      // ─────────────────────────────────────────
      // MODULE 9: GLOSSARY
      // ─────────────────────────────────────────
      function renderGlossary() {
        var filter = (s.glossaryFilter || '').toLowerCase().trim();
        var sorted = GLOSSARY_TERMS.slice().sort(function(a, b) { return a.term.localeCompare(b.term); });
        var filtered = filter ? sorted.filter(function(g) {
          return g.term.toLowerCase().indexOf(filter) >= 0 ||
                 g.def.toLowerCase().indexOf(filter) >= 0 ||
                 (g.module && g.module.toLowerCase().indexOf(filter) >= 0);
        }) : sorted;

        // Group by first letter
        var byLetter = {};
        filtered.forEach(function(g) {
          var ch = g.term.charAt(0).toUpperCase();
          if (!byLetter[ch]) byLetter[ch] = [];
          byLetter[ch].push(g);
        });
        var letters = Object.keys(byLetter).sort();

        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          backBtn('menu', null, 'Main menu'),
          h('h2', { className: 'text-2xl font-black text-stone-100' }, '\uD83D\uDCD6 Glossary'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Key terms used throughout the Assessment Literacy Lab. Type in the box to filter by term, definition, or module. Terms link conceptually to the module where they\'re developed most fully.'),
          h('div', { className: 'sticky top-0 z-10 bg-slate-900/90 backdrop-blur py-2 no-print' },
            h('input', {
              type: 'text',
              value: s.glossaryFilter || '',
              onChange: function(e) { upd({ glossaryFilter: e.target.value }); },
              placeholder: 'Filter by term, definition, or module',
              className: 'w-full p-2 rounded bg-slate-800/80 border border-stone-500 text-xs text-slate-100'
            }),
            filter && h('div', { className: 'text-xs text-slate-400 mt-1' }, filtered.length + ' of ' + GLOSSARY_TERMS.length + ' terms matching "' + filter + '"')
          ),
          filtered.length === 0 ? h('div', { className: 'p-6 rounded bg-slate-800/40 text-center text-sm text-slate-400' }, 'No terms match your filter.') :
          letters.map(function(letter) {
            return h('section', { key: letter, className: 'space-y-2' },
              h('h3', { className: 'text-lg font-black text-stone-300 border-b border-stone-500/30 pb-1' }, letter),
              byLetter[letter].map(function(g, i) {
                return h('div', { key: i, className: 'p-3 rounded bg-slate-800/60 border border-stone-500/20' },
                  h('div', { className: 'flex justify-between items-baseline mb-1' },
                    h('span', { className: 'text-sm font-black text-stone-100' }, g.term),
                    g.module && h('span', { className: 'text-xs text-stone-400 italic ml-2' }, g.module)
                  ),
                  h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, g.def)
                );
              })
            );
          }),
          h('div', { className: 'pt-4 no-print' },
            h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-stone-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print glossary')
          )
        );
      }

      // ── Dispatch ──
      if (s.view === 'cognitive') return renderCognitive();
      if (s.view === 'personality') return renderPersonality();
      if (s.view === 'career') return renderCareer();
      if (s.view === 'employer') return renderEmployer();
      if (s.view === 'schoolpsych') return renderSchoolPsych();
      if (s.view === 'junk') return renderJunk();
      if (s.view === 'sources') return renderSources();
      if (s.view === 'teacher') return renderTeacher();
      if (s.view === 'glossary') return renderGlossary();
      return renderMenu();
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // MODULE 2: PERSONALITY IMPLEMENTATION
  // ═══════════════════════════════════════════════════════════════

  function _RENDER_PERSONALITY(h, s, upd, callGemini, addToast, backBtn) {
    var sub = s.sub;

    if (sub === 'inventory') {
      var answers = s.big5Answers || {};
      var answered = Object.keys(answers).length;
      var total = BIG5_ITEMS.length;
      var setAns = function(i, v) {
        var next = Object.assign({}, answers); next[i] = v;
        upd({ big5Answers: next });
      };
      var submit = function() {
        if (answered < total) { addToast({ message: 'Please answer all ' + total + ' items (' + answered + '/' + total + ' done).', type: 'warning' }); return; }
        var profile = scoreBig5(answers);
        upd({ big5Result: profile, sub: 'result' });
        announceSR('Big Five profile calculated');
      };
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('personality', null, 'Personality menu'),
        h('h2', { className: 'text-2xl font-black text-purple-200' }, '\uD83C\uDFAD Big 5 Mini-Inventory (IPIP)'),
        h('p', { className: 'text-xs text-slate-300' }, '30 items from Goldberg\'s public-domain International Personality Item Pool — 6 per Big 5 trait. Rate how accurately each statement describes you at work. Results are educational, not clinical.'),
        h('div', { className: 'sticky top-0 z-10 py-2 bg-slate-900/90 backdrop-blur text-xs font-bold text-slate-300' }, 'Progress: ' + answered + ' / ' + total),
        h('ol', { className: 'space-y-2' },
          BIG5_ITEMS.map(function(item, i) {
            var cur = answers[i];
            return h('li', { key: i, className: 'p-3 rounded-lg bg-slate-800/60 border border-purple-500/20' },
              h('div', { className: 'text-xs text-slate-100 mb-2' }, (i + 1) + '. ' + item.t),
              h('div', { className: 'flex flex-wrap gap-1', role: 'radiogroup', 'aria-label': 'Rate item ' + (i + 1) },
                [1, 2, 3, 4, 5].map(function(v) {
                  var labels = ['Very Inaccurate', 'Moderately Inaccurate', 'Neither', 'Moderately Accurate', 'Very Accurate'];
                  var selected = cur === v;
                  return h('button', {
                    key: v,
                    role: 'radio',
                    'aria-checked': selected,
                    onClick: function() { setAns(i, v); },
                    className: 'px-2 py-1 rounded text-xs font-bold transition ' + (selected ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600')
                  }, v + ' — ' + labels[v - 1]);
                })
              )
            );
          })
        ),
        h('div', { className: 'flex justify-end pt-2' },
          h('button', {
            onClick: submit,
            className: 'px-5 py-2 rounded-xl font-bold text-sm bg-purple-600 text-white hover:bg-purple-500'
          }, 'Calculate profile')
        )
      );
    }

    if (sub === 'result') {
      var profile = s.big5Result;
      if (!profile) { upd({ sub: 'inventory' }); return null; }
      var mbti = big5ToMBTI(profile);
      var noise = s.mbtiRetestNoise != null ? s.mbtiRetestNoise : 10;
      var sim = simulateMBTIRetest(profile, noise, 2000);
      var setNoise = function(v) {
        upd({ mbtiRetestNoise: v });
      };
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
        backBtn('personality', null, 'Personality menu'),
        h('h2', { className: 'text-2xl font-black text-purple-200' }, 'Your Profile'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-base font-black text-purple-300 mb-3' }, 'Big 5 — Continuous Profile'),
          h('div', { className: 'space-y-2' },
            ['O', 'C', 'E', 'A', 'N'].map(function(k) {
              var v = profile[k];
              var t = BIG5_TRAITS[k];
              return h('div', { key: k },
                h('div', { className: 'flex justify-between text-xs font-bold text-slate-200 mb-1' },
                  h('span', null, t.name),
                  h('span', { className: 'text-purple-300' }, v + ' / 100')
                ),
                h('div', { className: 'h-3 rounded-full bg-slate-700 overflow-hidden' },
                  h('div', { className: 'h-full bg-purple-500', style: { width: v + '%' } })
                ),
                h('div', { className: 'text-xs text-slate-400 mt-1' },
                  v >= 60 ? t.high : (v <= 40 ? t.low : 'Mid-range — both patterns may apply.'),
                  ' ',
                  h('span', { className: 'italic' }, t.empirical)
                )
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-pink-900/40 to-purple-900/40 border border-pink-500/30' },
          h('h3', { className: 'text-base font-black text-pink-300 mb-2' }, 'MBTI Conversion (Educational Only)'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Here\'s your Big 5 profile forced into MBTI\'s 4-letter binary format:'),
          h('div', { className: 'text-center py-4' },
            h('div', { className: 'text-5xl font-black text-pink-200 tracking-widest' }, mbti),
            h('div', { className: 'text-xs text-slate-400 mt-2' }, '(E/I from E; S/N from O; T/F from A; J/P from C)')
          ),
          h('p', { className: 'text-xs text-slate-200 mt-3 leading-relaxed' }, 'Notice what just happened: your continuous trait scores (say, 52 on Extraversion) got flattened into a binary letter (E). A person who scored 48 got the opposite letter (I). You two are nearly identical, but MBTI calls you different types. This is what "binarization destroys information" means.')
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-rose-500/30' },
          h('h3', { className: 'text-base font-black text-rose-300 mb-2' }, 'Retest Simulation'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'We add realistic measurement noise to your profile (±' + noise + ' points, typical real-world SD for short inventories), recompute the MBTI letters, and repeat 2,000 times. What percent of "retests" produce a different type?'),
          h('div', { className: 'flex items-center gap-3 mb-3' },
            h('label', { className: 'text-xs font-bold text-slate-300' }, 'Noise level (±points):'),
            [5, 10, 15, 20].map(function(n) {
              return h('button', {
                key: n,
                onClick: function() { setNoise(n); },
                className: 'px-3 py-1 rounded text-xs font-bold ' + (noise === n ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600')
              }, '±' + n);
            })
          ),
          h('div', { className: 'p-3 rounded-lg bg-slate-900/60' },
            h('div', { className: 'text-center mb-3' },
              h('div', { className: 'text-3xl font-black text-rose-300' }, sim.totalFlipPct + '%'),
              h('div', { className: 'text-xs text-slate-300' }, 'of retests yield a different 4-letter type')
            ),
            h('div', { className: 'grid grid-cols-4 gap-2 text-center' },
              Object.keys(sim.letterFlipPct).map(function(k) {
                return h('div', { key: k, className: 'p-2 rounded bg-slate-800/60' },
                  h('div', { className: 'text-xs font-bold text-slate-400' }, k + ' flips'),
                  h('div', { className: 'text-sm font-black text-rose-300' }, sim.letterFlipPct[k] + '%')
                );
              })
            ),
            h('p', { className: 'text-xs text-slate-300 mt-3 leading-relaxed' }, 'Compare to real-world data: Pittenger (1993) found ~50% of MBTI takers receive a different type on retest 5 weeks later. If your profile is near the mean on any dimension, even small noise flips the letter. This is exactly why researchers reject the typology — the categories aren\'t stable features of the person.')
          )
        ),

        h('div', { className: 'flex flex-wrap gap-2 no-print' },
          h('button', { onClick: function() { upd({ sub: 'inventory', big5Answers: {}, big5Result: null }); }, className: 'flex-1 py-2 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-600' }, 'Retake inventory'),
          h('button', { onClick: function() { upd({ sub: 'critique' }); }, className: 'flex-1 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-500' }, 'See MBTI critique →'),
          h('button', { onClick: function() { window.print && window.print(); }, className: 'flex-1 py-2 rounded-lg bg-slate-800 border border-purple-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print / PDF')
        )
      );
    }

    if (sub === 'critique') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('personality', null, 'Personality menu'),
        h('h2', { className: 'text-2xl font-black text-purple-200 mb-2' }, 'Why Researchers Reject MBTI'),
        h('p', { className: 'text-xs text-slate-300 mb-4' }, 'MBTI is one of the most-taken personality assessments in the world — and one of the least respected in academic psychology. Here\'s the gap.'),
        MBTI_CRITIQUES.map(function(c, i) {
          return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border border-rose-500/30' },
            h('h3', { className: 'text-sm font-black text-rose-200 mb-2' }, (i + 1) + '. ' + c.title),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, c.body)
          );
        }),
        h('section', { className: 'p-4 rounded-xl bg-emerald-900/30 border border-emerald-500/40' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-2' }, 'Why Big 5 replaced it in research'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'Big 5 emerged from the lexical hypothesis — if a trait matters enough for humans to talk about, it ends up encoded in language. Decades of factor-analyzing trait-descriptive adjectives across dozens of languages converged on the same five-factor structure. The same factors replicate cross-culturally, across ages, and across measurement methods (self-report, observer-report, behavioral). Big 5 traits correlate with real outcomes: Conscientiousness predicts academic and job performance; Neuroticism predicts risk for mood and anxiety disorders; Extraversion predicts social network size and positive affect. The traits also show consistent moderate heritability (~40-60%) and developmental stability after age 30.')
        ),
        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-2' }, 'What to do when people cite their MBTI type'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'You don\'t have to crusade. MBTI language can be a useful vocabulary for self-reflection, especially for people who\'ve never thought about trait structure. The problem is treating it as diagnostic, fixed, or predictive of fit/success. A gentle translation: "That INTJ description — which of those patterns genuinely match how you function at work, and which are just the ones you wish matched?" moves from type-identity to behavioral specificity.')
        )
      );
    }

    if (sub === 'validity') {
      var concepts = [
        { name: 'Test-Retest Reliability', desc: 'How consistently a test yields the same score when the same person takes it twice (days/weeks apart). Expressed as correlation. For traits (which should be stable), r ≥ 0.70 is acceptable, 0.85+ is excellent. MBTI retest ~0.50 on each dichotomy; Big 5 retest ~0.70-0.90.', example: 'Take Big 5 Monday. Take it again Friday. Correlate the two sets of scores. A good trait measure yields r ≈ 0.8.' },
        { name: 'Internal Consistency (Cronbach\'s α)', desc: 'How well items within a scale agree. Are all the "Extraversion" items measuring the same underlying thing? α ≥ 0.70 is acceptable, 0.80+ preferred.', example: 'Compute α on the 6 Big 5 Conscientiousness items. α = 0.82 means items hang together well.' },
        { name: 'Convergent Validity', desc: 'Correlation between the new measure and an established measure of the same construct. If a new Extraversion scale correlates r = 0.75 with NEO-PI-R Extraversion, it\'s measuring something similar.', example: 'New 10-item Big 5 inventory vs. 240-item NEO-PI-R. Convergent correlations for each trait should be 0.60+.' },
        { name: 'Discriminant Validity', desc: 'Correlation should be LOWER with measures of different constructs. Your Extraversion scale should correlate more with other Extraversion measures than with Conscientiousness measures.', example: 'New Extraversion scale vs. NEO Extraversion r = 0.75 (good convergent). Same scale vs. NEO Conscientiousness r = 0.15 (good discriminant).' },
        { name: 'Predictive Validity', desc: 'Does the test predict future outcomes it should predict? Conscientiousness should predict job performance; Openness should predict creative output.', example: 'Take Big 5 at job hire. Measure job performance 12 months later. Conscientiousness should correlate ~0.20-0.30 with performance ratings (this is a meaningful effect in organizational psychology).' },
        { name: 'Concurrent Validity', desc: 'Does the test correlate with current criterion measures? (Same idea as predictive, but measured at the same time, not in the future.)', example: 'Assess Extraversion and sociometric popularity on the same day — should correlate.' },
        { name: 'Construct Validity (umbrella)', desc: 'The whole package — does the test actually measure the construct it claims to? Built up from all the above plus factor analysis showing the predicted latent structure.', example: 'Run Big 5 items through factor analysis — does it yield 5 correlated-but-distinct factors matching O/C/E/A/N? For Big 5, yes, robustly, across many samples.' },
        { name: 'Ecological Validity', desc: 'Do test performance patterns match real-world functioning? Less technical but important — a lab measure that doesn\'t track life outcomes has limited value.', example: 'Does Big 5 Openness predict who actually reads books and attends museums? (Yes, modestly, it does.)' }
      ];
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('personality', null, 'Personality menu'),
        h('h2', { className: 'text-2xl font-black text-purple-200 mb-2' }, 'Validity & Reliability — The Consumer\'s Primer'),
        h('p', { className: 'text-xs text-slate-300 mb-4' }, 'When someone shows you a test result, the first question should be "how much do I trust the number?" Here are the standards psychologists use to answer that.'),
        concepts.map(function(c, i) {
          return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
            h('h3', { className: 'text-sm font-black text-purple-200 mb-1' }, c.name),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed mb-2' }, c.desc),
            h('div', { className: 'p-2 rounded bg-slate-900/60 text-xs text-slate-300 italic' }, c.example)
          );
        }),
        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'The literacy rule of thumb'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'Any test marketed to you — whether for self-insight, hiring, or entertainment — should be able to answer: (1) What\'s the retest correlation over weeks? (2) Does a factor analysis support the claimed dimensions? (3) What outcomes does it predict, and what effect sizes? If the company can\'t answer, or the answers are much weaker than the confidence in the marketing language, skepticism is warranted.')
        )
      );
    }

    if (sub === 'hexaco') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('personality', null, 'Personality menu'),
        h('h2', { className: 'text-2xl font-black text-purple-200' }, '\uD83D\uDD2E HEXACO — The Six-Factor Alternative'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Ashton & Lee (2000+) ran the same lexical factor analyses Big 5 is built on — but across more languages and with a wider adjective pool. A sixth factor emerged repeatedly: ', h('strong', { className: 'text-purple-200' }, 'Honesty-Humility'), '. HEXACO is the main contemporary rival/complement to Big 5 in academic personality research.'),
        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-2' }, 'Why Honesty-Humility matters'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'Low Honesty-Humility captures the exploitative, manipulative, cheating-for-gain cluster that Big 5 Agreeableness only partially picks up. HEXACO H is the strongest trait predictor of counterproductive work behavior (theft, sabotage, workplace deviance), academic cheating, and unethical decision-making. If you\'re studying integrity — whether in leadership, criminology, or pre-employment integrity testing — this is the factor you need.')
        ),
        HEXACO_FACTORS.map(function(f) {
          return h('section', { key: f.code, className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
            h('h3', { className: 'text-base font-black text-purple-200 mb-1' }, f.code + ' — ' + f.name),
            h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-purple-300' }, 'Description: '), f.desc),
            h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-purple-300' }, 'Facets: '), f.facets),
            h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-purple-300' }, 'Empirical notes: '), f.empirical)
          );
        }),
        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-2' }, 'Public-domain HEXACO inventories'),
          h('ul', { className: 'text-xs text-slate-200 space-y-1 list-disc list-inside' },
            h('li', null, h('strong', null, 'HEXACO-60: '), '60 items, 10 per factor. Quickest option for research or self-exploration.'),
            h('li', null, h('strong', null, 'HEXACO-100: '), '100 items, 4 facets × 6 factors. Good balance of brevity and granularity.'),
            h('li', null, h('strong', null, 'HEXACO-PI-R: '), '200 items, full facet-level measurement. Research gold standard.'),
            h('li', null, 'All public domain — hexaco.org hosts scoring keys and item content.')
          )
        ),
        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'Big 5 vs HEXACO — which to use?'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'Big 5 is still the default in applied settings (hiring, education, clinical research adjuncts) — more normative data, more established. HEXACO is increasingly the academic default for theoretical work, especially where integrity or exploitative behavior is the outcome of interest. For most student/self-exploration uses, Big 5 is fine. For research involving ethics, counterproductive behavior, or dark-side traits, HEXACO is the better tool.')
        )
      );
    }

    if (sub === 'darktriad') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('personality', null, 'Personality menu'),
        h('h2', { className: 'text-2xl font-black text-purple-200' }, '\uD83E\uDD16 The Dark Triad (and Tetrad)'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Three subclinical personality traits that travel together and predict exploitative, self-interested behavior: Machiavellianism, subclinical Narcissism, and subclinical Psychopathy. Paulhus & Williams (2002) introduced the framework; the literature has exploded since. Relevant to leadership selection, organizational ethics, counterproductive work behavior, and popular awareness of manipulation tactics.'),
        DARK_TRIAD.map(function(t) {
          return h('section', { key: t.code, className: 'p-4 rounded-xl bg-slate-800/60 border border-rose-500/30' },
            h('h3', { className: 'text-base font-black text-rose-200 mb-1' }, t.name),
            h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-rose-300' }, 'Description: '), t.desc),
            h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-rose-300' }, 'Historical origin: '), t.origin),
            h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-rose-300' }, 'Common instruments: '), t.instruments),
            h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-rose-300' }, 'Empirical correlates: '), t.correlates)
          );
        }),
        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-rose-500/40' },
          h('h3', { className: 'text-sm font-black text-rose-300 mb-2' }, 'The Dark Tetrad extension'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, DARK_TETRAD_NOTE)
        ),
        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-purple-900/40 to-rose-900/40 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-200 mb-3' }, 'Key research findings'),
          h('div', { className: 'space-y-2' },
            DARK_TRIAD_KEY_POINTS.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, (i + 1) + '. ' + p.title),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
              );
            })
          )
        ),
        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'An important caution'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'Dark Triad content is irresistibly juicy and often gets weaponized — "that coworker is SUCH a narcissist." Use this framework to understand patterns of behavior, not to diagnose or label individuals. Subclinical traits exist on continua in the general population. Real clinical personality disorder is distinct, requires qualified diagnosis, and is not the same thing as scoring moderately high on a 9-item Dirty Dozen scale.')
        )
      );
    }

    if (sub === 'effectsize') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('personality', null, 'Personality menu'),
        h('h2', { className: 'text-2xl font-black text-purple-200' }, '\uD83D\uDCC9 Effect Sizes & Research Literacy'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Reading research is the core skill that separates psychometric literacy from opinion. This sub-view covers the statistical language you need: effect sizes (how big is the finding?), meta-analysis (what does all the research say?), red flags that signal a paper is overclaiming, and a checklist for evaluating any study you encounter.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'Effect size reference table'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Cohen (1988) proposed rough benchmarks for small/medium/large effects in psychology. These are guidelines, not laws — an effect that counts as "small" may be hugely important (e.g., small effects on millions of students add up to massive population impact). But they help you calibrate what you\'re reading.'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'w-full text-xs text-slate-200 border-collapse' },
              h('thead', null,
                h('tr', { className: 'bg-slate-900/60' },
                  h('th', { className: 'p-2 text-left font-black text-purple-200' }, 'Measure'),
                  h('th', { className: 'p-2 text-center font-black text-purple-200' }, 'Small'),
                  h('th', { className: 'p-2 text-center font-black text-purple-200' }, 'Medium'),
                  h('th', { className: 'p-2 text-center font-black text-purple-200' }, 'Large')
                )
              ),
              h('tbody', null,
                EFFECT_SIZE_GUIDE.map(function(e, i) {
                  return h('tr', { key: i, className: 'border-t border-slate-700' },
                    h('td', { className: 'p-2 font-bold text-purple-300', colSpan: 1 }, e.measure),
                    h('td', { className: 'p-2 text-center' }, e.small),
                    h('td', { className: 'p-2 text-center' }, e.medium),
                    h('td', { className: 'p-2 text-center' }, e.large)
                  );
                })
              )
            )
          ),
          h('div', { className: 'space-y-2 mt-3' },
            EFFECT_SIZE_GUIDE.map(function(e, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, e.measure),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, e.context)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-rose-900/30 border border-rose-500/40' },
          h('h3', { className: 'text-sm font-black text-rose-300 mb-3' }, '8 research red flags'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'When you see any one of these, slow down and scrutinize. When you see three or more, the paper is likely unreliable. These are the diagnostic signs of the replication crisis and are standard considerations in contemporary meta-science.'),
          h('div', { className: 'space-y-2' },
            RESEARCH_RED_FLAGS.map(function(f, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-rose-200 mb-1' }, (i + 1) + '. ' + f.flag),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, f.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-3' }, 'Meta-analysis primer'),
          h('div', { className: 'space-y-2' },
            META_ANALYSIS_PRIMER.map(function(m, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-emerald-200 mb-1' }, m.title),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, m.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-purple-900/40 to-sky-900/40 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-200 mb-3' }, 'Checklist: reading a study'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Walk through any empirical paper with these 11 questions. A strong paper answers most with "yes" or provides adequate explanation. A weak paper has multiple "no" answers without explanation.'),
          h('ol', { className: 'text-xs text-slate-200 space-y-1 list-decimal list-inside' },
            READING_STUDY_CHECKLIST.map(function(q, i) {
              return h('li', { key: i, className: 'leading-relaxed' }, q);
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'Putting it together'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'A finding is worth believing when: (1) effect size is meaningful and reported with CI, (2) the study has adequate power, (3) the design matches the claim (experimental for causal, correlational for association), (4) results replicate across independent samples, (5) methods are transparent and pre-registered where possible. When a psychometric tool, employer test, educational intervention, or clinical claim lacks these properties, skepticism is scientifically grounded. Literacy means knowing WHEN to be skeptical, not being contrarian about everything.')
        )
      );
    }

    if (sub === 'peer') {
      if (!s.big5Result) {
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
          backBtn('personality', null, 'Personality menu'),
          h('h2', { className: 'text-2xl font-black text-purple-200' }, '\uD83D\uDC65 Peer-Rated Comparison'),
          h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
            h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'To compare self vs. peer ratings, first take your own Big 5 inventory. Then return here, ask someone who knows you well to rate the same 30 items, and enter their ratings.')
          ),
          h('button', {
            onClick: function() { upd({ sub: 'inventory' }); },
            className: 'px-5 py-2 rounded-xl font-bold text-sm bg-purple-600 text-white hover:bg-purple-500'
          }, 'Take self-rated inventory first →')
        );
      }

      var pAns = s.peerAnswers || {};
      var pAnswered = Object.keys(pAns).length;
      var pTotal = BIG5_ITEMS.length;
      var pName = s.peerName || '';
      var pSetAns = function(i, v) {
        var next = Object.assign({}, pAns); next[i] = v;
        upd({ peerAnswers: next });
      };
      var pSubmit = function() {
        if (pAnswered < pTotal) { addToast({ message: 'Please complete all ' + pTotal + ' peer ratings (' + pAnswered + '/' + pTotal + ').', type: 'warning' }); return; }
        var profile = scoreBig5(pAns);
        upd({ peerResult: profile, sub: 'peerResult' });
        announceSR('Peer profile calculated. Comparison ready.');
      };

      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('personality', null, 'Personality menu'),
        h('h2', { className: 'text-2xl font-black text-purple-200' }, '\uD83D\uDC65 Peer Ratings'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Ask someone who knows you well (roommate, partner, long-time friend, parent, close colleague) to rate the same 30 items based on what they observe about you. You will enter their ratings below. After submission, you\'ll see where their observations agree with your self-rating — and where they diverge.'),
        h('div', { className: 'p-3 rounded-lg bg-slate-800/60 border border-purple-500/30' },
          h('label', { className: 'text-xs font-bold text-purple-300 mb-1 block' }, 'Peer\'s name (optional, for your reference):'),
          h('input', {
            type: 'text', value: pName,
            onChange: function(e) { upd({ peerName: e.target.value }); },
            placeholder: 'Who rated you?',
            className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
          })
        ),
        h('div', { className: 'sticky top-0 z-10 py-2 bg-slate-900/90 backdrop-blur text-xs font-bold text-slate-300' }, 'Peer progress: ' + pAnswered + ' / ' + pTotal),
        h('ol', { className: 'space-y-2' },
          BIG5_ITEMS.map(function(item, i) {
            var cur = pAns[i];
            return h('li', { key: i, className: 'p-3 rounded-lg bg-slate-800/60 border border-purple-500/20' },
              h('div', { className: 'text-xs text-slate-100 mb-2' }, (i + 1) + '. ' + item.t),
              h('div', { className: 'flex flex-wrap gap-1', role: 'radiogroup', 'aria-label': 'Peer rates item ' + (i + 1) },
                [1, 2, 3, 4, 5].map(function(v) {
                  var labels = ['Very Inaccurate', 'Moderately Inaccurate', 'Neither', 'Moderately Accurate', 'Very Accurate'];
                  var selected = cur === v;
                  return h('button', {
                    key: v,
                    role: 'radio',
                    'aria-checked': selected,
                    onClick: function() { pSetAns(i, v); },
                    className: 'px-2 py-1 rounded text-xs font-bold transition ' + (selected ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600')
                  }, v + ' — ' + labels[v - 1]);
                })
              )
            );
          })
        ),
        h('div', { className: 'flex justify-end pt-2' },
          h('button', {
            onClick: pSubmit,
            className: 'px-5 py-2 rounded-xl font-bold text-sm bg-purple-600 text-white hover:bg-purple-500'
          }, 'Compare peer vs. self →')
        )
      );
    }

    if (sub === 'peerResult') {
      var selfProfile = s.big5Result;
      var peerProfile = s.peerResult;
      if (!selfProfile || !peerProfile) { upd({ sub: 'peer' }); return null; }
      var selfMBTI = big5ToMBTI(selfProfile);
      var peerMBTI = big5ToMBTI(peerProfile);
      var traits = ['O', 'C', 'E', 'A', 'N'];
      var divergences = traits.map(function(k) { return { trait: k, diff: (peerProfile[k] || 0) - (selfProfile[k] || 0), selfVal: selfProfile[k], peerVal: peerProfile[k] }; });
      var totalDiv = divergences.reduce(function(acc, d) { return acc + Math.abs(d.diff); }, 0);
      var agreement = 100 - Math.round(totalDiv / traits.length);
      var label = agreement >= 85 ? 'High self-other agreement' : agreement >= 70 ? 'Moderate agreement' : agreement >= 50 ? 'Noticeable blind spots' : 'Substantial divergence';

      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
        backBtn('personality', null, 'Personality menu'),
        h('h2', { className: 'text-2xl font-black text-purple-200' }, 'Self vs. Peer Comparison'),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30' },
          h('div', { className: 'text-center mb-3' },
            h('div', { className: 'text-3xl font-black text-purple-200' }, agreement + '%'),
            h('div', { className: 'text-xs text-slate-400' }, label + ' · (average trait agreement)')
          ),
          h('p', { className: 'text-xs text-slate-300 italic leading-relaxed text-center' }, 'Research on self-other agreement typically finds correlations of r=0.35-0.55 for close observers, with highest agreement on observable traits (Extraversion, Conscientiousness) and lowest on internal ones (Neuroticism, Openness).')
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'Trait-by-trait comparison'),
          h('div', { className: 'space-y-3' },
            divergences.map(function(d) {
              var t = BIG5_TRAITS[d.trait];
              var absDiff = Math.abs(d.diff);
              var direction = d.diff > 0 ? 'higher' : d.diff < 0 ? 'lower' : 'identical';
              var interpretation;
              if (absDiff <= 10) interpretation = 'Agreement — you and your peer see this similarly.';
              else if (absDiff <= 20) interpretation = 'Minor divergence — peer sees you as ' + direction + ' than you see yourself. Within typical self-observer noise.';
              else interpretation = 'Meaningful divergence — peer views you as substantially ' + direction + '. Could be a blind spot, an impression-management gap, or contextual (they see a different side of you).';
              return h('div', { key: d.trait },
                h('div', { className: 'flex justify-between text-xs font-bold text-slate-200 mb-1' },
                  h('span', null, t.name),
                  h('span', { className: 'text-purple-300' }, 'Self: ' + d.selfVal + ' · Peer: ' + d.peerVal + ' · Δ ' + (d.diff > 0 ? '+' : '') + d.diff)
                ),
                h('div', { className: 'relative h-4 rounded bg-slate-700 overflow-hidden' },
                  h('div', { className: 'absolute top-0 bottom-0 w-1 bg-blue-400', style: { left: d.selfVal + '%' }, title: 'Self: ' + d.selfVal }),
                  h('div', { className: 'absolute top-0 bottom-0 w-1 bg-pink-400', style: { left: d.peerVal + '%' }, title: 'Peer: ' + d.peerVal })
                ),
                h('div', { className: 'text-xs text-slate-400 mt-1' }, interpretation)
              );
            })
          ),
          h('div', { className: 'mt-3 flex items-center gap-4 text-xs' },
            h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'w-3 h-3 bg-blue-400 inline-block' }), h('span', { className: 'text-slate-300' }, 'Self-rated')),
            h('span', { className: 'flex items-center gap-1' }, h('span', { className: 'w-3 h-3 bg-pink-400 inline-block' }), h('span', { className: 'text-slate-300' }, 'Peer-rated'))
          )
        ),

        selfMBTI !== peerMBTI && h('section', { className: 'p-4 rounded-xl bg-rose-900/30 border border-rose-500/40' },
          h('h3', { className: 'text-sm font-black text-rose-300 mb-2' }, 'MBTI conversion disagreement'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'Your self-ratings convert to ', h('strong', { className: 'text-rose-200' }, selfMBTI), ', but your peer\'s ratings convert to ', h('strong', { className: 'text-rose-200' }, peerMBTI), '. Two people who know each other well, giving ratings that differ by modest amounts on continuous scales, get assigned completely different 4-letter types. This is exactly the binarization problem — and it\'s why a 4-letter code isn\'t a stable identity, even when the underlying traits are very close.')
        ),

        h('section', { className: 'p-4 rounded-xl bg-emerald-900/30 border border-emerald-500/40' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-2' }, 'Why this matters — self-other agreement as a literacy concept'),
          h('ul', { className: 'text-xs text-slate-200 space-y-1 list-disc list-inside' },
            h('li', null, h('strong', null, 'Self-report has blind spots.'), ' People are worst at self-rating the traits they\'re least aware of (low-Openness people don\'t know they\'re closed to experience; high-Neuroticism people often rate themselves as "normal"). Observer ratings often ADD information.'),
            h('li', null, h('strong', null, 'Different observers see different sides.'), ' Your partner sees you in intimacy; your boss sees you at work; your college roommate saw you when you were 19. Each observer\'s ratings reflect a particular context, not a universal truth.'),
            h('li', null, h('strong', null, 'Big divergences are interesting, not wrong.'), ' When self and peer disagree substantially, it\'s often a door to self-knowledge — why do they see me that way? what part of me shows up to them?'),
            h('li', null, h('strong', null, 'This is why good hiring uses 360° reviews.'), ' Self + manager + peer + direct-report ratings give a more reliable picture than any single source. Single-source personality data (whether self or other) is always incomplete.')
          )
        ),

        h('div', { className: 'flex gap-2' },
          h('button', { onClick: function() { upd({ sub: 'peer', peerAnswers: {}, peerResult: null }); }, className: 'flex-1 py-2 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-600' }, 'Add another peer rater'),
          h('button', { onClick: function() { window.print && window.print(); }, className: 'flex-1 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-500 no-print' }, '\uD83D\uDDA8 Print / Save as PDF')
        )
      );
    }

    // Personality submenu
    var subs = [
      { id: 'inventory', icon: '\uD83D\uDCDD', label: 'Take Big 5 Mini-Inventory', desc: '30 public-domain IPIP items. Get your continuous trait profile.' },
      { id: 'critique', icon: '\u26A1', label: 'Why MBTI Fails (and Big 5 Replicates)', desc: 'Retest reliability, forced binaries, Jungian origins, no incremental validity.' },
      { id: 'validity', icon: '\uD83D\uDD2C', label: 'Validity & Reliability Primer', desc: 'Cronbach\'s α, test-retest, convergent/discriminant, predictive validity — the consumer\'s toolkit.' },
      { id: 'hexaco', icon: '\uD83D\uDD2E', label: 'HEXACO — The 6-Factor Alternative', desc: 'Honesty-Humility, the factor Big 5 misses. Why integrity researchers prefer HEXACO over Big 5.' },
      { id: 'darktriad', icon: '\uD83E\uDD16', label: 'The Dark Triad (and Tetrad)', desc: 'Machiavellianism, subclinical Narcissism, subclinical Psychopathy. Origins, instruments, and the relationship to HEXACO Honesty-Humility.' },
      { id: 'peer', icon: '\uD83D\uDC65', label: 'Peer-Rated Big 5 Comparison', desc: 'Have someone who knows you well rate you on the same 30 items. Compare self vs. observer — see your blind spots, see where observers add information self-report misses.' },
      { id: 'effectsize', icon: '\uD83D\uDCC9', label: 'Effect Sizes & Research Literacy', desc: 'Cohen\'s d, r, eta-squared, odds ratios, NNT. What counts as small/medium/large in psych. Meta-analysis primer, 8 research red flags, 11-item study-reading checklist.' }
    ];
    return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6' },
      backBtn('menu', null, 'Main menu'),
      h('h2', { className: 'text-2xl font-black text-purple-200 mb-4' }, '\uD83C\uDFAD Personality Inventory Literacy'),
      h('p', { className: 'text-xs text-slate-300 mb-4 leading-relaxed' }, 'Take a real inventory, see what the same data looks like under two frameworks, watch MBTI\'s binary system break under realistic measurement noise, and leave with a working vocabulary for evaluating the next personality test someone hands you.'),
      h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
        subs.map(function(x) {
          return h('button', {
            key: x.id,
            onClick: function() { upd({ sub: x.id }); },
            className: 'text-left p-4 rounded-xl bg-slate-800/60 border border-purple-500/30 hover:bg-slate-700/60 focus:ring-2 focus:ring-purple-400 focus:outline-none'
          },
            h('div', { className: 'text-2xl mb-1' }, x.icon),
            h('div', { className: 'text-sm font-bold text-purple-200 mb-1' }, x.label),
            h('div', { className: 'text-xs text-slate-300 leading-snug' }, x.desc)
          );
        })
      ),
      s.big5Result && h('div', { className: 'mt-4 p-3 rounded-lg bg-purple-900/30 border border-purple-500/30 text-xs text-purple-200' },
        'You have a saved Big 5 profile. ',
        h('button', { onClick: function() { upd({ sub: 'result' }); }, className: 'underline font-bold' }, 'View it →')
      )
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 3: CAREER IMPLEMENTATION
  // ═══════════════════════════════════════════════════════════════

  function _RENDER_CAREER(h, s, upd, callGemini, addToast, backBtn) {
    var sub = s.sub;

    if (sub === 'inventory') {
      var ans = s.riasecAnswers || {};
      var answered = Object.keys(ans).length;
      var total = RIASEC_ITEMS.length;
      var setAns = function(i, v) {
        var next = Object.assign({}, ans); next[i] = v;
        upd({ riasecAnswers: next });
      };
      var submit = function() {
        if (answered < total) { addToast({ message: 'Please answer all ' + total + ' items.', type: 'warning' }); return; }
        var result = scoreRIASEC(ans);
        upd({ riasecResult: result, sub: 'result' });
        announceSR('Holland code calculated: ' + result.code);
      };
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('career', null, 'Career menu'),
        h('h2', { className: 'text-2xl font-black text-emerald-200' }, '\uD83C\uDFAF Holland RIASEC — O*NET Short Form'),
        h('p', { className: 'text-xs text-slate-300' }, 'These are activity-preference items adapted from the U.S. Department of Labor\'s O*NET Interest Profiler (public domain, validated). Rate how much each activity appeals to you.'),
        h('div', { className: 'sticky top-0 z-10 py-2 bg-slate-900/90 backdrop-blur text-xs font-bold text-slate-300' }, 'Progress: ' + answered + ' / ' + total),
        h('ol', { className: 'space-y-2' },
          RIASEC_ITEMS.map(function(item, i) {
            var cur = ans[i];
            return h('li', { key: i, className: 'p-3 rounded-lg bg-slate-800/60 border border-emerald-500/20' },
              h('div', { className: 'text-xs text-slate-100 mb-2' }, (i + 1) + '. ' + item.t),
              h('div', { className: 'flex flex-wrap gap-1', role: 'radiogroup', 'aria-label': 'Rate item ' + (i + 1) },
                [1, 2, 3, 4, 5].map(function(v) {
                  var labels = ['Strongly Dislike', 'Dislike', 'Unsure', 'Like', 'Strongly Like'];
                  var selected = cur === v;
                  return h('button', {
                    key: v,
                    role: 'radio',
                    'aria-checked': selected,
                    onClick: function() { setAns(i, v); },
                    className: 'px-2 py-1 rounded text-xs font-bold transition ' + (selected ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600')
                  }, v + ' — ' + labels[v - 1]);
                })
              )
            );
          })
        ),
        h('div', { className: 'flex justify-end pt-2' },
          h('button', {
            onClick: submit,
            className: 'px-5 py-2 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500'
          }, 'Get my Holland code')
        )
      );
    }

    if (sub === 'result') {
      var r = s.riasecResult;
      if (!r) { upd({ sub: 'inventory' }); return null; }
      var scores = r.scores;
      var code = r.code;
      var query = s.occupationQuery || '';
      var result = s.occupationResult || '';
      var loading = s.occupationLoading;
      var explore = function() {
        if (!callGemini) { addToast({ message: 'AI unavailable', type: 'error' }); return; }
        upd({ occupationLoading: true, occupationResult: '' });
        var prompt = 'You are a career counselor teaching a student about the Holland RIASEC model.\n\n' +
          'The student\'s 3-letter Holland code is: ' + code + '\n' +
          'Their scores (0-100): ' + Object.keys(scores).map(function(k) { return k + '=' + scores[k]; }).join(', ') + '\n\n' +
          'Additional question or focus from the student: ' + (query || '(none — just general exploration)') + '\n\n' +
          'In plain text (no markdown headers, ~250-350 words):\n' +
          '1. Name 4-6 occupations that strongly match this code. For each: one sentence on why it fits, and one sentence on a real-world consideration (education required, typical salary range, growth outlook).\n' +
          '2. Name 1-2 occupations that WOULDN\'T fit this code — not to discourage, but to show contrast.\n' +
          '3. Add one short paragraph on the limits of interest-based matching: interests predict satisfaction, not ability or success. Suggest the student cross-check with their skills and life constraints.\n\n' +
          'Use "• " bullets. Plain text only.';
        Promise.resolve(callGemini(prompt, false, false, 0.6, null))
          .then(function(resp) {
            var text = (typeof resp === 'string') ? resp : (resp && resp.text ? resp.text : String(resp));
            upd({ occupationLoading: false, occupationResult: text });
          })
          .catch(function(e) {
            upd({ occupationLoading: false, occupationResult: 'Error: ' + (e && e.message ? e.message : 'unknown') });
          });
      };

      // Tier logic — keys off Holland's 'differentiation' concept (gap between top
      // and bottom of profile). High differentiation = clear interest pattern;
      // flat profile = mixed signals across multiple paths.
      var sortedKeys = Object.keys(scores).filter(function(k) { return scores[k] != null; }).sort(function(a, b) { return scores[b] - scores[a]; });
      var topAvg = sortedKeys.slice(0, 3).reduce(function(a, k) { return a + scores[k]; }, 0) / 3;
      var bottomAvg = sortedKeys.slice(3).reduce(function(a, k) { return a + scores[k]; }, 0) / Math.max(1, sortedKeys.length - 3);
      var differentiation = topAvg - bottomAvg;
      var tier = differentiation >= 25 ? 'sharp'
                 : differentiation >= 12 ? 'mixed'
                 : 'flat';
      var tierColor = tier === 'sharp' ? '#10b981' : tier === 'mixed' ? '#f59e0b' : '#6366f1';
      var tierIcon = tier === 'sharp' ? '🎯' : tier === 'mixed' ? '🪶' : '📚';
      var tierTitle = tier === 'sharp' ? 'Strong differentiation'
                      : tier === 'mixed' ? 'Mixed profile'
                      : 'Flat profile';
      var tierMsg = tier === 'sharp'
                    ? 'Your top types stand out clearly from the rest. Look at occupations clustered around your code — your interest pattern is a real signal.'
                    : tier === 'mixed'
                      ? 'Your top three types fit, but the rest aren\u2019t far behind. Multiple career paths could fit you. Cross-check with skills + values to narrow.'
                      : 'Profile is flat — no strong preference jumped out. Try retaking with stronger Likert range (use the 1\u20135 endpoints), or pair this with a values inventory.';
      // Score-donut maths — donut shows top letter's percentage
      var topScore = scores[sortedKeys[0]] || 0;
      var donutRad = 38, donutCirc = 2 * Math.PI * donutRad;
      var donutOff = donutCirc - (topScore / 100) * donutCirc;
      // Holland hexagon — 6 vertices in canonical RIASEC order (R/I/A/S/E/C clockwise from top)
      var HEX_ORDER = ['R', 'I', 'A', 'S', 'E', 'C'];
      var HEX_LABELS = { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' };
      var hexCx = 70, hexCy = 70, hexR = 50;
      var hexVerts = HEX_ORDER.map(function(k, i) {
        var ang = (-Math.PI / 2) + (i * Math.PI / 3); // start at top, go clockwise
        return { letter: k, x: hexCx + hexR * Math.cos(ang), y: hexCy + hexR * Math.sin(ang) };
      });
      var hexPath = hexVerts.map(function(v, i) { return (i === 0 ? 'M' : 'L') + ' ' + v.x.toFixed(1) + ' ' + v.y.toFixed(1); }).join(' ') + ' Z';
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
        backBtn('career', null, 'Career menu'),
        h('h2', { className: 'text-2xl font-black text-emerald-200' }, 'Your Holland Code'),

        // ── Hero band: donut + hexagon + tier ──
        h('section', {
          className: 'p-4 rounded-xl border-2 overflow-hidden',
          style: { borderColor: tierColor + 'aa', background: 'linear-gradient(135deg, ' + tierColor + '22, rgba(15,23,42,0.85))' }
        },
          h('div', { className: 'flex flex-wrap items-center gap-4 mb-3' },
            // Score donut — top score as %
            h('div', { className: 'relative flex-shrink-0', style: { width: 100, height: 100 } },
              h('svg', { viewBox: '0 0 100 100', width: 100, height: 100,
                'aria-label': 'Top letter ' + sortedKeys[0] + ' at ' + topScore + ' percent'
              },
                h('circle', { cx: 50, cy: 50, r: donutRad, fill: 'none', stroke: 'rgba(148,163,184,0.25)', strokeWidth: 9 }),
                h('circle', { cx: 50, cy: 50, r: donutRad, fill: 'none', stroke: tierColor, strokeWidth: 9, strokeLinecap: 'round',
                  strokeDasharray: donutCirc, strokeDashoffset: donutOff, transform: 'rotate(-90 50 50)' })
              ),
              h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                h('div', { style: { fontSize: 30, fontWeight: 900, color: tierColor, lineHeight: 1, letterSpacing: '0.04em' } }, code),
                h('div', { style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8' } }, topScore + '/100')
              )
            ),
            // Holland hexagon
            h('svg', { viewBox: '0 0 140 140', width: 140, height: 140, role: 'img',
              'aria-label': 'Holland hexagon — your code is ' + code,
              style: { flexShrink: 0 }
            },
              // hexagon outline
              h('path', { d: hexPath, fill: 'rgba(148,163,184,0.08)', stroke: 'rgba(148,163,184,0.35)', strokeWidth: 1 }),
              // adjacency edges (RI, IA, AS, SE, EC, CR — already drawn by the hex outline)
              // vertex circles — colored if letter is in the code, dimmed otherwise
              hexVerts.map(function(v, i) {
                var inCode = code.indexOf(v.letter) >= 0;
                var rank = code.indexOf(v.letter); // 0 = primary, 1 = secondary, 2 = tertiary
                var fill = inCode ? (rank === 0 ? tierColor : (rank === 1 ? tierColor + 'cc' : tierColor + '99')) : 'rgba(148,163,184,0.25)';
                var rOut = inCode ? (rank === 0 ? 14 : (rank === 1 ? 12 : 10)) : 9;
                return h('g', { key: v.letter },
                  h('circle', { cx: v.x, cy: v.y, r: rOut, fill: fill, stroke: inCode ? '#0f172a' : 'rgba(15,23,42,0.6)', strokeWidth: 2 }),
                  h('text', { x: v.x, y: v.y + 4, textAnchor: 'middle', fontSize: 12, fontWeight: 900, fill: inCode ? '#0f172a' : '#94a3b8' }, v.letter)
                );
              })
            ),
            // Tier message
            h('div', { style: { flex: 1, minWidth: 200 } },
              h('div', { style: { fontSize: 28, marginBottom: 2 }, 'aria-hidden': 'true' }, tierIcon),
              h('div', { style: { fontSize: 17, fontWeight: 900, color: tierColor, lineHeight: 1.15 } }, tierTitle),
              h('p', { style: { margin: '4px 0 0', color: '#cbd5e1', fontSize: 12, lineHeight: 1.55 } }, tierMsg)
            )
          ),
          // Six-letter ranking strip
          h('div', { className: 'flex flex-wrap gap-1.5' },
            sortedKeys.map(function(k, i) {
              var inCode = i < 3;
              return h('span', { key: k,
                style: {
                  display: 'inline-flex', alignItems: 'baseline', gap: 4,
                  padding: '3px 10px', borderRadius: 999,
                  background: inCode ? (tierColor + '33') : 'rgba(148,163,184,0.10)',
                  border: '1px solid ' + (inCode ? tierColor + '88' : 'rgba(148,163,184,0.25)'),
                  fontSize: 11, fontWeight: 800,
                  color: inCode ? tierColor : '#94a3b8'
                }
              },
                h('span', { style: { fontFamily: 'monospace', fontSize: 12 } }, '#' + (i + 1)),
                h('span', null, k + ' — ' + (RIASEC_TYPES[k] && RIASEC_TYPES[k].name || k)),
                h('span', { style: { fontFamily: 'monospace', opacity: 0.75 } }, scores[k] + '/100')
              );
            })
          )
        ),

        // ── Existing detail section (kept for granular per-type breakdowns) ──
        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/30' },
          h('div', { className: 'text-center mb-3' },
            h('div', { className: 'text-xs uppercase tracking-widest text-emerald-300 font-bold' }, 'Detailed type breakdown'),
            h('div', { className: 'text-xs text-slate-400 mt-1' }, 'Top 3 interest types, in order \u2014 with what each one prefers')
          ),
          h('div', { className: 'space-y-2' },
            ['R', 'I', 'A', 'S', 'E', 'C'].map(function(k) {
              var v = scores[k];
              var t = RIASEC_TYPES[k];
              var inCode = code.indexOf(k) >= 0;
              return h('div', { key: k, className: inCode ? 'opacity-100' : 'opacity-60' },
                h('div', { className: 'flex justify-between text-xs font-bold text-slate-200 mb-1' },
                  h('span', null, k + ' — ' + t.name),
                  h('span', { className: 'text-emerald-300' }, v + ' / 100')
                ),
                h('div', { className: 'h-3 rounded-full bg-slate-700 overflow-hidden' },
                  h('div', { className: 'h-full bg-emerald-500', style: { width: v + '%' } })
                ),
                h('div', { className: 'text-xs text-slate-400 mt-1' }, t.desc)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-2' }, 'Explore occupations'),
          h('p', { className: 'text-xs text-slate-300 mb-2' }, 'Ask the AI for occupation matches to your code. Optionally narrow with a focus (e.g., "in healthcare", "that don\'t require a 4-year degree", "accessible to someone with a hearing impairment").'),
          h('input', {
            type: 'text',
            value: query,
            onChange: function(e) { upd({ occupationQuery: e.target.value }); },
            placeholder: 'Optional focus — or leave blank',
            className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100 placeholder-slate-500 mb-2'
          }),
          h('button', {
            onClick: explore,
            disabled: loading,
            className: 'px-4 py-2 rounded-lg text-xs font-bold ' + (loading ? 'bg-slate-700 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-500')
          }, loading ? 'Thinking…' : '\u2728 Explore occupations'),
          result && h('pre', { className: 'text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed mt-3 p-3 rounded bg-slate-900/60' }, result)
        ),

        h('div', { className: 'flex flex-wrap gap-2 no-print' },
          h('button', { onClick: function() { upd({ sub: 'inventory', riasecAnswers: {}, riasecResult: null, occupationResult: '' }); }, className: 'flex-1 py-2 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-600' }, 'Retake'),
          h('button', { onClick: function() { upd({ sub: 'critique' }); }, className: 'flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500' }, 'Compare with clickbait →'),
          h('button', { onClick: function() { window.print && window.print(); }, className: 'flex-1 py-2 rounded-lg bg-slate-800 border border-emerald-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print / PDF')
        )
      );
    }

    if (sub === 'critique') {
      var points = [
        { title: 'Why Holland RIASEC is the real thing', body: 'Developed by John Holland (1959+), refined over 60 years, operationalized in the Strong Interest Inventory, Self-Directed Search, and O*NET Interest Profiler. Hexagonal structure (R-I-A-S-E-C with adjacent types more similar than opposite) replicates across cultures. Predicts job satisfaction and tenure (r ~0.3-0.4) — a meaningful effect for a self-report measure of interests.' },
        { title: 'What "What career should you have?" BuzzFeed-style quizzes do wrong', body: 'They use a handful of whimsical items ("Which of these pizzas would you order?"), force you into one of 5-10 pre-written categories, and present a single answer ("You should be a forensic scientist!") with no basis in validated occupational analysis. The quiz is entertainment; treat it as such. The moment a quiz gives you ONE answer instead of a profile, it\'s oversimplified.' },
        { title: 'MBTI career matching', body: 'Despite widespread use, MBTI-based career matching adds no incremental validity over Big 5 + interest measures, and the MBTI itself is unstable (see Personality module). "INFP careers" lists mix occupations with little behavioral commonality. Use Holland or validated interest inventories instead.' },
        { title: 'What interest inventories DON\'T measure', body: 'Ability. Skill. Work conditions tolerance. Life constraints (family obligations, geographic limits, disability accommodations needed). An Investigative-Artistic-Social profile might flag "academic research" as a fit — but whether you can actually spend 8 years in grad school is a different question entirely. Interest = satisfaction, not success.' },
        { title: 'The congruence hypothesis', body: 'Holland\'s core claim: job satisfaction is higher when your interest code matches your occupation\'s code (e.g., Social-code person in Social-code job). Meta-analyses find the effect is real but moderate — r ~0.20-0.30. Translation: interest-occupation match matters, but many other factors (pay, coworkers, flexibility, meaning) matter as much or more. Don\'t over-index on code match.' },
        { title: 'Limits of self-report for career direction', body: 'You can\'t know whether you\'ll like work you\'ve never done. Interest inventories reflect your current exposure — someone raised around lawyers may score Enterprising high; someone never exposed to engineering may under-score Investigative. Use the code as a conversation-starter, not a verdict. Try jobs through internships, shadowing, or part-time work before committing.' }
      ];
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('career', null, 'Career menu'),
        h('h2', { className: 'text-2xl font-black text-emerald-200 mb-2' }, 'Holland vs. Clickbait — A Critique'),
        points.map(function(p, i) {
          return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30' },
            h('h3', { className: 'text-sm font-black text-emerald-200 mb-2' }, (i + 1) + '. ' + p.title),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
          );
        })
      );
    }

    if (sub === 'theories') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('career', null, 'Career menu'),
        h('h2', { className: 'text-2xl font-black text-emerald-200' }, '\uD83D\uDCDA Career Development Theories'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'RIASEC (Holland) tells you what a person\'s interests look like. These theories tell you how career development UNFOLDS, why people get stuck, and how to intervene. A career counselor fluent across frameworks can match intervention to client situation.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30 space-y-2' },
          CAREER_THEORIES.map(function(t, i) {
            return h('div', { key: t.id, className: 'p-3 rounded bg-slate-900/60 border border-emerald-500/20' },
              h('div', { className: 'flex justify-between items-baseline mb-1' },
                h('h3', { className: 'text-sm font-black text-emerald-200' }, (i + 1) + '. ' + t.name),
                h('span', { className: 'text-xs text-emerald-400 italic ml-2' }, t.author)
              ),
              h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-emerald-300' }, 'Core idea: '), t.core),
              h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-emerald-300' }, 'Key concepts: '), t.keyconcepts),
              h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-emerald-300' }, 'Implications: '), t.implications),
              h('div', { className: 'text-xs text-slate-300' }, h('strong', { className: 'text-emerald-300' }, 'Instruments: '), t.instruments)
            );
          })
        ),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/30' },
          h('h3', { className: 'text-sm font-black text-emerald-200 mb-3' }, 'Matching theory to client situation'),
          h('div', { className: 'space-y-2' },
            CAREER_THEORY_INTEGRATION.map(function(item, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-emerald-200 mb-1' }, item.when),
                h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-emerald-300' }, 'Relevant theories: '), item.theories),
                h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-emerald-300' }, 'Approach: '), item.approach)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-slate-500/30' },
          h('h3', { className: 'text-sm font-black text-slate-200 mb-2' }, 'A note for practitioners'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'None of these theories is "right" in isolation. Career development is complex enough that drawing on multiple frameworks makes you more useful to the client in front of you. If you\'re going into career counseling work, the standard textbook references are Brown & Lent (Career Development and Counseling), Sharf (Applying Career Development Theory to Counseling), and the Journal of Career Assessment for contemporary research.')
        )
      );
    }

    if (sub === 'values') {
      var sAns = s.schwartzAnswers || {};
      var sAnswered = Object.keys(sAns).length;
      var sTotal = SCHWARTZ_ITEMS.length;
      var sSetAns = function(i, v) {
        var next = Object.assign({}, sAns); next[i] = v;
        upd({ schwartzAnswers: next });
      };
      var sSubmit = function() {
        if (sAnswered < sTotal) { addToast({ message: 'Please rate all ' + sTotal + ' items.', type: 'warning' }); return; }
        var r = scoreSchwartz(sAns);
        upd({ schwartzResult: r, sub: 'valuesResult' });
        announceSR('Values profile calculated');
      };
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('career', null, 'Career menu'),
        h('h2', { className: 'text-2xl font-black text-emerald-200' }, '\uD83E\uDDED Schwartz Values Inventory'),
        h('p', { className: 'text-xs text-slate-300' }, 'Values differ from interests. Interests (RIASEC) predict what work you\'ll ENJOY; values predict what work you\'ll find MEANINGFUL. Rate how much each statement describes what\'s important to you. Based on Schwartz\'s 10-value model — validated across 80+ countries.'),
        h('div', { className: 'sticky top-0 z-10 py-2 bg-slate-900/90 backdrop-blur text-xs font-bold text-slate-300' }, 'Progress: ' + sAnswered + ' / ' + sTotal),
        h('ol', { className: 'space-y-2' },
          SCHWARTZ_ITEMS.map(function(item, i) {
            var cur = sAns[i];
            return h('li', { key: i, className: 'p-3 rounded-lg bg-slate-800/60 border border-emerald-500/20' },
              h('div', { className: 'text-xs text-slate-100 mb-2' }, (i + 1) + '. ' + item.t),
              h('div', { className: 'flex flex-wrap gap-1', role: 'radiogroup', 'aria-label': 'Rate item ' + (i + 1) },
                [1, 2, 3, 4, 5, 6].map(function(v) {
                  var labels = ['Not at all like me', 'Not like me', 'A little like me', 'Somewhat like me', 'Like me', 'Very much like me'];
                  var selected = cur === v;
                  return h('button', {
                    key: v,
                    role: 'radio',
                    'aria-checked': selected,
                    title: labels[v - 1],
                    onClick: function() { sSetAns(i, v); },
                    className: 'px-2 py-1 rounded text-xs font-bold transition ' + (selected ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600')
                  }, v);
                })
              ),
              h('div', { className: 'text-xs text-slate-300 mt-1' }, '1=Not at all like me → 6=Very much like me')
            );
          })
        ),
        h('div', { className: 'flex justify-end pt-2' },
          h('button', {
            onClick: sSubmit,
            className: 'px-5 py-2 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500'
          }, 'See my values profile')
        )
      );
    }

    if (sub === 'valuesResult') {
      var vr = s.schwartzResult;
      if (!vr) { upd({ sub: 'values' }); return null; }
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
        backBtn('career', null, 'Career menu'),
        h('h2', { className: 'text-2xl font-black text-emerald-200' }, 'Your Values Profile'),
        h('p', { className: 'text-xs text-slate-300' }, 'Scores are centered on your own mean — higher = relatively more important to you, lower = relatively less. This reflects which values you prioritize, not absolute importance (everyone rates "important" items highly). Schwartz recommends this ipsatization to expose value hierarchies.'),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/30' },
          h('h3', { className: 'text-sm font-black text-emerald-200 mb-3' }, 'Ranked priorities'),
          h('ol', { className: 'space-y-2' },
            vr.ranked.map(function(k, i) {
              var val = SCHWARTZ_VALUES[k];
              var score = vr.relative[k];
              var barWidth = Math.min(100, Math.max(5, 50 + score * 20));
              return h('li', { key: k, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'flex justify-between items-baseline mb-1' },
                  h('span', { className: 'text-sm font-black text-emerald-200' }, (i + 1) + '. ' + val.name),
                  h('span', { className: 'text-xs text-slate-400' }, (score > 0 ? '+' : '') + score + ' (' + val.higherOrder + ')')
                ),
                h('div', { className: 'h-2 rounded-full bg-slate-700 overflow-hidden mb-1' },
                  h('div', { className: 'h-full bg-emerald-500', style: { width: barWidth + '%' } })
                ),
                h('div', { className: 'text-xs text-slate-300' }, val.desc)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-2' }, 'About Schwartz\'s value circumplex'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed mb-2' }, SCHWARTZ_NOTES.circumplex),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed mb-2' }, SCHWARTZ_NOTES.evidence),
          h('div', { className: 'mt-3 p-2 rounded bg-slate-900/60 text-xs text-slate-300' }, h('strong', { className: 'text-emerald-300' }, 'Values vs Interests: '), SCHWARTZ_NOTES.versus_interests),
          h('div', { className: 'mt-2 p-2 rounded bg-slate-900/60 text-xs text-slate-300' }, h('strong', { className: 'text-emerald-300' }, 'Values vs Personality: '), SCHWARTZ_NOTES.versus_personality)
        ),

        h('div', { className: 'flex flex-wrap gap-2 no-print' },
          h('button', { onClick: function() { upd({ sub: 'values', schwartzAnswers: {}, schwartzResult: null }); }, className: 'flex-1 py-2 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-600' }, 'Retake'),
          s.riasecResult && h('button', { onClick: function() { upd({ sub: 'result' }); }, className: 'flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500' }, 'Compare with my Holland code →'),
          h('button', { onClick: function() { window.print && window.print(); }, className: 'flex-1 py-2 rounded-lg bg-slate-800 border border-emerald-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print / PDF')
        )
      );
    }

    // Career submenu
    var subs = [
      { id: 'inventory', icon: '\uD83D\uDCDD', label: 'Take O*NET RIASEC Inventory', desc: '36 public-domain O*NET items. Get your 3-letter Holland code and explore occupations.' },
      { id: 'critique', icon: '\uD83D\uDEAB', label: 'Holland vs. Clickbait Quizzes', desc: 'Why RIASEC works, why "what job should you have?" quizzes don\'t, and what career inventories can\'t tell you.' },
      { id: 'values', icon: '\uD83E\uDDED', label: 'Schwartz Values Inventory', desc: '30 items on Schwartz\'s 10-value model. Values predict what work you\'ll find MEANINGFUL — different from interests predicting what you\'ll ENJOY.' },
      { id: 'theories', icon: '\uD83D\uDCDA', label: 'Career Development Theories', desc: '7 theoretical frameworks (Super, Holland, Gottfredson, Krumboltz, SCCT, CIP, critical perspectives) plus integration guide for matching theory to client situation.' }
    ];
    return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6' },
      backBtn('menu', null, 'Main menu'),
      h('h2', { className: 'text-2xl font-black text-emerald-200 mb-4' }, '\uD83C\uDFAF Career Interest Literacy'),
      h('p', { className: 'text-xs text-slate-300 mb-4 leading-relaxed' }, 'The Holland RIASEC model is the foundation of modern career interest assessment — used by O*NET, the Strong Interest Inventory, and most school/college counseling offices. Take the short form, get your code, then see why most popular "career quizzes" fall short.'),
      h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
        subs.map(function(x) {
          return h('button', {
            key: x.id,
            onClick: function() { upd({ sub: x.id }); },
            className: 'text-left p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30 hover:bg-slate-700/60 focus:ring-2 focus:ring-emerald-400 focus:outline-none'
          },
            h('div', { className: 'text-2xl mb-1' }, x.icon),
            h('div', { className: 'text-sm font-bold text-emerald-200 mb-1' }, x.label),
            h('div', { className: 'text-xs text-slate-300 leading-snug' }, x.desc)
          );
        })
      ),
      s.riasecResult && h('div', { className: 'mt-4 p-3 rounded-lg bg-emerald-900/30 border border-emerald-500/30 text-xs text-emerald-200' },
        'You have a saved Holland code: ', h('strong', null, s.riasecResult.code), '. ',
        h('button', { onClick: function() { upd({ sub: 'result' }); }, className: 'underline font-bold' }, 'View →')
      )
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 4: EMPLOYER IMPLEMENTATION
  // ═══════════════════════════════════════════════════════════════

  function _RENDER_EMPLOYER(h, s, upd, callGemini, addToast, backBtn) {
    var sub = s.sub;

    if (sub === 'ethics') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('employer', null, 'Employer menu'),
        h('h2', { className: 'text-2xl font-black text-amber-200 mb-2' }, '\u2696\uFE0F Ethics, Law, & Your Rights'),
        h('p', { className: 'text-xs text-slate-300 mb-4' }, 'Employer personality and cognitive tests operate in a legally complex space. You have more rights than most candidates realize — and the tests themselves have more legal vulnerabilities than most employers publicize.'),
        EMPLOYER_ETHICS.map(function(e, i) {
          return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/30' },
            h('h3', { className: 'text-sm font-black text-amber-200 mb-2' }, e.title),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, e.body)
          );
        }),
        h('section', { className: 'p-4 rounded-xl bg-rose-900/30 border border-rose-500/40' },
          h('h3', { className: 'text-sm font-black text-rose-300 mb-2' }, 'Disclaimer'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'Nothing here is legal advice. Employment law varies by state, federal district, and specific circumstance. If you believe a test has violated your rights (asked protected-class questions, caused disparate impact, functioned as a medical exam pre-offer), document the details and consult an employment attorney or the EEOC.')
        )
      );
    }

    if (sub === 'strategy') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('employer', null, 'Employer menu'),
        h('h2', { className: 'text-2xl font-black text-amber-200 mb-2' }, '\uD83C\uDFAF Strategy — How to "Ace" Ethically'),
        h('p', { className: 'text-xs text-slate-300 mb-4 leading-relaxed' }, 'The line between self-presentation and deception is real but not where most candidates think it is. Presenting your work-functional self honestly is legitimate. Inventing a different person is detectable and counterproductive. Here are the rules that actually work.'),
        EMPLOYER_STRATEGY.map(function(r, i) {
          return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/30' },
            h('h3', { className: 'text-sm font-black text-amber-200 mb-2' }, (i + 1) + '. ' + r.rule),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, r.detail)
          );
        }),
        h('section', { className: 'p-4 rounded-xl bg-emerald-900/30 border border-emerald-500/40' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-2' }, 'The mindset'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'You are not trying to fool the test. You are trying to present your work-relevant self accurately, in the format the test demands. That requires knowing what it measures, answering consistently, and not letting nerves push you toward extreme or inconsistent responses. Most people underperform on these tests not from lying too much, but from inconsistent nervous answering. Calm, deliberate, honest-as-you-are-at-work beats polished.')
        )
      );
    }

    if (sub === 'test' && s.employerTest) {
      var test = EMPLOYER_TESTS.find(function(t) { return t.id === s.employerTest; });
      if (!test) { upd({ sub: null, employerTest: null }); return null; }

      var practice = s.practiceItems || [];
      var practiceLoading = s.practiceLoading;
      var practiceFeedback = s.practiceFeedback || '';

      var loadPractice = function() {
        if (!callGemini) { addToast({ message: 'AI unavailable', type: 'error' }); return; }
        upd({ practiceLoading: true, practiceItems: [], practiceFeedback: '', practiceAnswers: {} });
        Promise.resolve(callGemini(buildPracticePrompt(test.id), false, false, 0.7, null))
          .then(function(resp) {
            var text = (typeof resp === 'string') ? resp : (resp && resp.text ? resp.text : String(resp));
            upd({ practiceLoading: false, practiceItems: [text] });
            announceSR('Practice items generated');
          })
          .catch(function(e) {
            upd({ practiceLoading: false, practiceFeedback: 'Error: ' + (e && e.message ? e.message : 'unknown') });
          });
      };

      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
        h('button', {
          onClick: function() { upd({ sub: 'tests', employerTest: null, practiceItems: [], practiceFeedback: '' }); },
          className: 'inline-flex items-center gap-1 text-xs font-bold text-amber-300 hover:text-amber-200 mb-1'
        }, '← All tests'),
        h('h2', { className: 'text-2xl font-black text-amber-200' }, test.name),
        h('p', { className: 'text-xs text-slate-400 italic' }, test.full),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/30' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'What it measures'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed mb-2' }, test.what),
          h('div', { className: 'text-xs text-slate-300' },
            h('strong', { className: 'text-amber-200' }, 'Dimensions: '),
            Array.isArray(test.dimensions) ?
              h('ul', { className: 'list-disc list-inside mt-1 space-y-1' }, test.dimensions.map(function(d, i) { return h('li', { key: i }, d); }))
              : test.dimensions
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-blue-500/30' },
          h('h3', { className: 'text-sm font-black text-blue-300 mb-2' }, '\uD83D\uDD2C Evidence & empirical quality'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, test.evidence)
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-2' }, '\uD83C\uDFE2 Why employers use it'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, test.why_used)
        ),

        h('section', { className: 'p-4 rounded-xl bg-emerald-900/30 border border-emerald-500/40' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-2' }, '\uD83C\uDFAF Your strategy'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, test.strategy)
        ),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-amber-900/40 to-orange-900/40 border border-amber-500/30' },
          h('h3', { className: 'text-sm font-black text-amber-200 mb-2' }, '\uD83C\uDFAE Practice mode'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Generate AI-written items in the style of this test. Not real items (proprietary) — but items that probe the same dimensions the real test probes. Use them to get familiar with the format and check your consistency before test day.'),
          h('button', {
            onClick: loadPractice,
            disabled: practiceLoading,
            className: 'px-4 py-2 rounded-lg text-xs font-bold ' + (practiceLoading ? 'bg-slate-700 text-slate-400' : 'bg-amber-600 text-white hover:bg-amber-500')
          }, practiceLoading ? 'Generating…' : (practice.length ? '\uD83D\uDD04 Regenerate' : '\u2728 Generate practice items')),
          practiceFeedback && h('div', { className: 'mt-3 p-3 rounded bg-rose-900/30 text-xs text-rose-200' }, practiceFeedback),
          practice.length > 0 && h('pre', { className: 'text-xs text-slate-100 whitespace-pre-wrap font-sans leading-relaxed mt-3 p-3 rounded bg-slate-900/70 max-h-96 overflow-y-auto' }, practice[0])
        )
      );
    }

    if (sub === 'tests') {
      return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('employer', null, 'Employer menu'),
        h('h2', { className: 'text-2xl font-black text-amber-200 mb-2' }, '\uD83D\uDCCB Test-Specific Primers'),
        h('p', { className: 'text-xs text-slate-300 mb-4' }, 'Pick a test you\'re preparing for. You\'ll get the dimensions measured, evidence quality, why employers use it, strategy notes, and the option to generate AI-written practice items in that test\'s style.'),
        h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
          EMPLOYER_TESTS.map(function(t) {
            return h('button', {
              key: t.id,
              onClick: function() { upd({ sub: 'test', employerTest: t.id, practiceItems: [], practiceFeedback: '' }); announceSR('Opened ' + t.name); },
              className: 'text-left p-4 rounded-xl bg-slate-800/60 border border-amber-500/30 hover:bg-slate-700/60 focus:ring-2 focus:ring-amber-400 focus:outline-none'
            },
              h('div', { className: 'text-sm font-black text-amber-200 mb-1' }, t.name),
              h('div', { className: 'text-xs text-slate-400 italic mb-2' }, t.full),
              h('div', { className: 'text-xs text-slate-300 leading-snug' }, t.what)
            );
          })
        )
      );
    }

    if (sub === 'methods') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('employer', null, 'Employer menu'),
        h('h2', { className: 'text-2xl font-black text-amber-200' }, '\uD83D\uDD27 Beyond Personality: The Real Selection Methods'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Meta-analyses (Schmidt & Hunter 1998 and updates) rank selection methods by their validity — how well they predict actual job performance. Surprise: personality tests are middle-of-the-pack. The highest-validity methods are work samples, GCA tests, and structured interviews. Here\'s the full picture of what modern employers use and how to handle each.'),
        h('div', { className: 'p-3 rounded-lg bg-gradient-to-r from-sky-900/30 to-indigo-900/30 border border-sky-500/30 text-xs text-sky-100' },
          h('strong', null, 'Ranked meta-analytic validity (r with supervisor-rated performance): '),
          'Work Sample Test (.54) > Structured Interview (.51) = GCA Test (.51) > Assessment Center (.37) > SJT (.34) > Reference Check (.26) > Personality measure for Conscientiousness (.31) > Unstructured Interview (.19) > Years of experience (.18).'
        ),
        // Validity scale bar — visualizes predictive r across the 7 methods.
        // Lifts the BirdLab Featured Migrators distance-bar pattern.
        (function() {
          var SCALE_MAX = 0.6;
          function parseR(r) {
            if (typeof r === 'number') return r;
            var m = String(r || '').match(/(\d*\.\d+)/);
            return m ? parseFloat(m[1]) : 0;
          }
          function categoryColor(name) {
            if (/Work Sample/i.test(name))            return { fill: '#10b981', border: '#047857' };
            if (/Structured Behavioral/i.test(name))  return { fill: '#10b981', border: '#047857' };
            if (/Cognitive Ability/i.test(name))      return { fill: '#10b981', border: '#047857' };
            if (/Assessment Center/i.test(name))      return { fill: '#0ea5e9', border: '#0369a1' };
            if (/Situational Judgment/i.test(name))   return { fill: '#0ea5e9', border: '#0369a1' };
            if (/Reference/i.test(name))              return { fill: '#f59e0b', border: '#b45309' };
            if (/AI-Scored/i.test(name))              return { fill: '#f43f5e', border: '#be123c' };
            return { fill: '#94a3b8', border: '#475569' };
          }
          return h('div', { className: 'p-4 rounded-xl bg-slate-900/60 border border-amber-500/30' },
            h('div', { className: 'text-[10px] font-bold uppercase tracking-widest text-amber-300 mb-3' }, '📏 Predictive validity at a glance'),
            h('div', { className: 'space-y-2' },
              HIRING_METHODS.map(function(m) {
                var r = parseR(m.r);
                var pct = Math.min(100, (r / SCALE_MAX) * 100);
                var col = categoryColor(m.name);
                var displayR = (typeof m.r === 'number') ? m.r.toFixed(2) : (r ? '~' + r.toFixed(2) + '*' : '?');
                return h('div', { key: m.name, className: 'flex items-center gap-2 text-xs' },
                  h('div', {
                    style: { width: 180, flexShrink: 0, color: '#e2e8f0', fontWeight: 600, paddingRight: 4, textAlign: 'right' }
                  }, m.name),
                  h('div', { className: 'relative flex-1 h-5 rounded border', style: { background: 'rgba(15,23,42,0.7)', borderColor: 'rgba(148,163,184,0.25)', minWidth: 100 } },
                    [0.2, 0.4, 0.6].map(function(t, ti) {
                      return h('div', { key: 'tk' + ti, 'aria-hidden': true,
                        style: { position: 'absolute', top: 0, bottom: 0, left: ((t / SCALE_MAX) * 100) + '%', width: 1, background: 'rgba(148,163,184,0.25)' } });
                    }),
                    h('div', {
                      style: {
                        position: 'absolute', top: 2, bottom: 2, left: 0,
                        width: pct + '%',
                        background: 'linear-gradient(90deg, ' + col.border + ', ' + col.fill + ')',
                        borderRadius: '999px',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)'
                      }
                    }),
                    h('div', { style: { position: 'absolute', top: 0, bottom: 0, left: pct + '%', display: 'flex', alignItems: 'center', paddingLeft: 4, fontSize: 11, fontWeight: 800, fontFamily: 'monospace', color: col.fill } }, displayR)
                  )
                );
              })
            ),
            h('div', { className: 'mt-2 flex justify-between text-[9px] font-mono text-slate-400' },
              h('span', null, '0.0'),
              h('span', null, '0.2 small'),
              h('span', null, '0.4 medium'),
              h('span', null, '0.6 large')
            ),
            h('div', { className: 'mt-1 text-[10px] italic text-slate-400' }, '* AI-Scored video validity is contested — vendor claims 0.30–0.45, independent replication limited. Bar shows midpoint estimate.')
          );
        })(),
        HIRING_METHODS.map(function(m, i) {
          return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/30' },
            h('div', { className: 'flex items-baseline justify-between mb-2' },
              h('h3', { className: 'text-base font-black text-amber-200' }, m.name),
              h('span', { className: 'text-xs font-bold text-sky-300' }, 'r = ' + m.r)
            ),
            h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-amber-300' }, 'How it works: '), m.how),
            h('div', { className: 'text-xs text-slate-200 mb-2 p-2 rounded bg-emerald-900/30 border border-emerald-500/30' }, h('strong', { className: 'text-emerald-300' }, 'Your strategy: '), m.strategy),
            h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-purple-300' }, 'Ethics: '), m.ethics),
            h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-rose-300' }, 'Legal: '), m.legal)
          );
        }),
        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'The meta-takeaway'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'Companies that hire well use a COMBINATION: structured behavioral interview + work sample + GCA test + references. Each adds incremental validity beyond the others. Companies that rely primarily on unstructured interviews, personality quizzes, or "gut feel" are making worse hiring decisions than the research supports — you can treat how a company selects as a signal about how they operate in general. If you get to pick between jobs, the hiring process is information.')
        )
      );
    }

    if (sub === 'interview') {
      var compId = s.interviewCompetency;
      var role = s.interviewRole || '';
      var q = s.interviewQuestion || '';
      var ans = s.interviewAnswer || '';
      var crit = s.interviewCritique || '';
      var qLoading = s.interviewLoading;
      var cLoading = s.interviewCritiqueLoading;

      var genQuestion = function() {
        if (!callGemini) { addToast({ message: 'AI unavailable', type: 'error' }); return; }
        if (!compId) { addToast({ message: 'Select a competency first.', type: 'warning' }); return; }
        upd({ interviewLoading: true, interviewQuestion: '', interviewAnswer: '', interviewCritique: '' });
        Promise.resolve(callGemini(buildInterviewQuestionPrompt(compId, role), false, false, 0.7, null))
          .then(function(resp) {
            var text = (typeof resp === 'string') ? resp : (resp && resp.text ? resp.text : String(resp));
            upd({ interviewLoading: false, interviewQuestion: text });
            announceSR('Interview question generated');
          })
          .catch(function(e) {
            upd({ interviewLoading: false, interviewQuestion: 'Error: ' + (e && e.message ? e.message : 'unknown') });
          });
      };
      var critiqueAnswer = function() {
        if (!callGemini) { addToast({ message: 'AI unavailable', type: 'error' }); return; }
        if (!ans || ans.length < 50) { addToast({ message: 'Please write a more substantial answer first (at least 50 characters).', type: 'warning' }); return; }
        upd({ interviewCritiqueLoading: true, interviewCritique: '' });
        Promise.resolve(callGemini(buildInterviewCritiquePrompt(compId, q, ans), false, false, 0.5, null))
          .then(function(resp) {
            var text = (typeof resp === 'string') ? resp : (resp && resp.text ? resp.text : String(resp));
            upd({ interviewCritiqueLoading: false, interviewCritique: text });
            announceSR('Critique generated');
          })
          .catch(function(e) {
            upd({ interviewCritiqueLoading: false, interviewCritique: 'Error: ' + (e && e.message ? e.message : 'unknown') });
          });
      };

      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('employer', null, 'Employer menu'),
        h('h2', { className: 'text-2xl font-black text-amber-200' }, '\uD83C\uDFA4 Interview Preparation'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Structured behavioral interviews are the most-used and among-the-most-valid selection methods. Nailing them requires practice with the STAR framework and realistic self-critique. This sub-view gives you both: reference content AND an AI interview coach who will generate questions and critique your answers.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/30' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-3' }, 'STAR framework'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-2' },
            STAR_DETAILED.map(function(st, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60 border border-amber-500/20' },
                h('div', { className: 'text-2xl font-black text-amber-300 mb-1' }, st.letter),
                h('div', { className: 'text-xs font-bold text-amber-200 mb-1' }, st.name),
                h('div', { className: 'text-xs text-slate-300 leading-relaxed' }, st.guidance)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-amber-900/40 to-orange-900/40 border border-amber-500/30' },
          h('h3', { className: 'text-sm font-black text-amber-200 mb-3' }, 'Practice mode — AI interview coach'),
          h('div', { className: 'space-y-3' },
            h('div', null,
              h('label', { className: 'text-xs font-bold text-amber-300 mb-2 block' }, 'Step 1: Pick a competency'),
              h('div', { className: 'grid grid-cols-2 md:grid-cols-3 gap-2' },
                BEHAVIORAL_COMPETENCIES.map(function(c) {
                  var sel = compId === c.id;
                  return h('button', {
                    key: c.id,
                    onClick: function() { upd({ interviewCompetency: c.id, interviewQuestion: '', interviewAnswer: '', interviewCritique: '' }); },
                    className: 'text-left p-2 rounded border-2 transition text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none ' + (sel ? 'bg-amber-900/50 border-amber-400 text-amber-100' : 'bg-slate-900/40 border-slate-600 text-slate-200 hover:border-amber-500/50')
                  }, c.name);
                })
              )
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-amber-300 mb-1 block' }, 'Step 2: Role context (optional)'),
              h('input', {
                type: 'text', value: role,
                onChange: function(e) { upd({ interviewRole: e.target.value }); },
                placeholder: 'e.g., "school psychologist", "software engineer", "sales manager"',
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
              })
            ),
            h('button', {
              onClick: genQuestion,
              disabled: qLoading || !compId,
              className: 'px-5 py-2 rounded-xl font-bold text-sm no-print ' + (qLoading || !compId ? 'bg-slate-700 text-slate-400' : 'bg-amber-600 text-white hover:bg-amber-500')
            }, qLoading ? 'Thinking…' : '\u2728 Generate interview question')
          ),
          q && h('div', { className: 'mt-4 p-3 rounded bg-slate-900/70' },
            h('div', { className: 'text-xs font-bold text-amber-300 mb-2' }, 'Interview question:'),
            h('pre', { className: 'text-xs text-slate-100 whitespace-pre-wrap font-sans leading-relaxed' }, q)
          ),
          q && h('div', { className: 'mt-4 space-y-2' },
            h('label', { className: 'text-xs font-bold text-amber-300 mb-1 block' }, 'Step 3: Write your STAR response'),
            h('textarea', {
              value: ans,
              onChange: function(e) { upd({ interviewAnswer: e.target.value, interviewCritique: '' }); },
              placeholder: 'Write your answer here. Aim for 2-3 minutes when spoken aloud (roughly 300-500 words typed). Cover all four STAR elements.',
              rows: 10,
              className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100 font-sans leading-relaxed'
            }),
            h('div', { className: 'flex justify-between items-center text-xs text-slate-400' },
              h('span', null, ans.length + ' characters'),
              h('button', {
                onClick: critiqueAnswer,
                disabled: cLoading || ans.length < 50,
                className: 'px-4 py-2 rounded-lg font-bold no-print ' + (cLoading || ans.length < 50 ? 'bg-slate-700 text-slate-400' : 'bg-amber-600 text-white hover:bg-amber-500')
              }, cLoading ? 'Thinking…' : '\u2728 Critique my answer')
            )
          ),
          crit && h('div', { className: 'mt-4 p-3 rounded bg-slate-900/70 border border-emerald-500/30' },
            h('div', { className: 'text-xs font-bold text-emerald-300 mb-2' }, 'Interview coach critique:'),
            h('pre', { className: 'text-xs text-slate-100 whitespace-pre-wrap font-sans leading-relaxed' }, crit)
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-rose-500/30' },
          h('h3', { className: 'text-sm font-black text-rose-300 mb-3' }, '8 common pitfalls'),
          h('div', { className: 'space-y-2' },
            INTERVIEW_PITFALLS.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-rose-200 mb-1' }, (i + 1) + '. ' + p.pitfall),
                h('div', { className: 'text-xs text-slate-300 mb-1' }, h('strong', { className: 'text-rose-300' }, 'Why it hurts: '), p.problem),
                h('div', { className: 'text-xs text-slate-100' }, h('strong', { className: 'text-emerald-300' }, 'Fix: '), p.fix)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'Interview format primers'),
          h('div', { className: 'space-y-2' },
            INTERVIEW_FORMATS.map(function(f, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, f.type),
                h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-purple-300' }, 'What: '), f.what),
                h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-emerald-300' }, 'Prep: '), f.prep)
              );
            })
          )
        )
      );
    }

    if (sub === 'ai') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('employer', null, 'Employer menu'),
        h('h2', { className: 'text-2xl font-black text-amber-200' }, '\uD83E\uDD16 AI & Algorithms in Assessment'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Algorithmic tools are spreading across hiring, admissions, and testing faster than regulation can keep up. This section covers the six main domains where AI is making high-stakes decisions about people — what each does, how it\'s known to fail, and how to navigate it as the subject of the assessment.'),
        h('div', { className: 'p-3 rounded-lg bg-rose-900/30 border border-rose-500/40 text-xs text-rose-100' },
          h('strong', null, 'Disability-access note: '), 'Nearly every AI assessment domain below has documented bias against disabled, neurodivergent, and racially minoritized users. If you face one of these systems and a disability-related concern, you have rights — the "computer did it" framing doesn\'t override ADA or Title VI.'
        ),
        AI_ASSESSMENT_DOMAINS.map(function(d) {
          return h('section', { key: d.id, className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/30' },
            h('h3', { className: 'text-base font-black text-amber-200 mb-1' }, d.name),
            h('div', { className: 'text-xs text-slate-400 italic mb-2' }, 'Examples: ' + d.examples),
            h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-amber-300' }, 'What it does: '), d.what),
            h('div', { className: 'text-xs text-slate-200 mb-2 p-2 rounded bg-rose-900/20 border border-rose-500/30' }, h('strong', { className: 'text-rose-300' }, 'Known concerns: '), d.concerns),
            h('div', { className: 'text-xs text-slate-200 mb-2 p-2 rounded bg-emerald-900/20 border border-emerald-500/30' }, h('strong', { className: 'text-emerald-300' }, 'Your strategy: '), d.strategy),
            h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-sky-300' }, 'Legal / regulatory: '), d.legal)
          );
        }),
        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-amber-900/40 to-orange-900/40 border border-amber-500/30' },
          h('h3', { className: 'text-sm font-black text-amber-200 mb-3' }, 'Six principles for navigating AI assessments'),
          h('div', { className: 'space-y-2' },
            AI_ASSESSMENT_PRINCIPLES.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-amber-200 mb-1' }, (i + 1) + '. ' + p.title),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
              );
            })
          )
        ),
        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-slate-500/30' },
          h('h3', { className: 'text-sm font-black text-slate-200 mb-2' }, 'Fast-moving regulation — where to follow updates'),
          h('ul', { className: 'text-xs text-slate-200 space-y-1 list-disc list-inside' },
            h('li', null, 'EEOC AI Initiative (eeoc.gov) — federal guidance on algorithmic discrimination.'),
            h('li', null, 'NIST AI Risk Management Framework — voluntary but increasingly cited in contracts and policy.'),
            h('li', null, 'State laws — Illinois AI Video Interview Act (2020), NYC Local Law 144 (2023), Maryland HB 1202 (2020), California (pending), Colorado AI Act (2024).'),
            h('li', null, 'EU AI Act (2024) — classifies educational and employment AI as "high risk" requiring transparency, bias audits, human oversight. Applies to any tool used for EU candidates.'),
            h('li', null, 'Upturn, AI Now Institute, EPIC — advocacy organizations tracking and litigating AI assessment issues.')
          )
        )
      );
    }

    // Employer submenu
    var subs = [
      { id: 'ethics', icon: '\u2696\uFE0F', label: 'Ethics, Law, & Your Rights', desc: 'ADA/EEOC, Soroka v. Dayton Hudson, Karraker v. Rent-A-Center, disability screening, when to escalate.' },
      { id: 'strategy', icon: '\uD83C\uDFAF', label: 'Strategy: How to Ace Ethically', desc: '8 practical rules — best work self, consistency, dimensions, endpoints, role fit, practice, accommodations, company signal.' },
      { id: 'tests', icon: '\uD83D\uDCCB', label: 'Test-Specific Primers', desc: 'DISC, PI, Caliper, Hogan, 16PF, CliftonStrengths, Wonderlic, CCAT — dimensions, evidence, strategy, practice items.' },
      { id: 'methods', icon: '\uD83D\uDD27', label: 'Beyond Personality: Hiring Methods', desc: 'Structured interviews, work samples, SJTs, AI video interviews (HireVue), references, assessment centers — ranked by meta-analytic validity.' },
      { id: 'ai', icon: '\uD83E\uDD16', label: 'AI & Algorithms in Assessment', desc: 'Video interviewing AIs, ATS resume screening, AI essay grading, AI proctoring, GPT-scored reports, predictive analytics. What each does, known failures, your strategy and rights.' },
      { id: 'interview', icon: '\uD83C\uDFA4', label: 'Interview Preparation', desc: 'STAR framework deep-dive, 10 competencies with AI-generated behavioral questions, practice mode with AI critique of your answers, 8 common pitfalls, 7 interview format primers.' }
    ];
    return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6' },
      backBtn('menu', null, 'Main menu'),
      h('h2', { className: 'text-2xl font-black text-amber-200 mb-2' }, '\uD83D\uDCBC Employer Assessment Coaching'),
      h('p', { className: 'text-xs text-slate-300 mb-4 leading-relaxed' }, 'Employer personality and cognitive tests are a real gate to real jobs. They\'re also a legal gray zone where many candidates (especially neurodivergent ones) get filtered out unfairly. Learn the ethics, the strategy, and the specifics for the test you\'re facing.'),
      h('div', { className: 'p-3 rounded-lg bg-amber-900/30 border border-amber-500/40 text-xs text-amber-100 mb-4' },
        h('strong', null, 'Ethical framing: '), 'Your goal is to present the professional, work-functional version of yourself consistently — not to fool the test. Faking is detectable. Self-presentation isn\'t.'
      ),
      h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
        subs.map(function(x) {
          return h('button', {
            key: x.id,
            onClick: function() { upd({ sub: x.id }); },
            className: 'text-left p-4 rounded-xl bg-slate-800/60 border border-amber-500/30 hover:bg-slate-700/60 focus:ring-2 focus:ring-amber-400 focus:outline-none'
          },
            h('div', { className: 'text-2xl mb-1' }, x.icon),
            h('div', { className: 'text-sm font-bold text-amber-200 mb-1' }, x.label),
            h('div', { className: 'text-xs text-slate-300 leading-snug' }, x.desc)
          );
        })
      )
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 5: SCHOOL PSYCH IMPLEMENTATION
  // ═══════════════════════════════════════════════════════════════

  function _RENDER_SCHOOLPSYCH(h, s, upd, callGemini, addToast, backBtn) {
    var sub = s.sub;

    // SEM simulator — standard scores, mean=100, SD=15
    if (sub === 'sem') {
      var score = s.semScore != null ? s.semScore : 100;
      var rel = s.semReliability != null ? s.semReliability : 0.96;
      var sd = 15;
      var sem = sd * Math.sqrt(1 - rel);
      var ci68 = { low: Math.round(score - sem), high: Math.round(score + sem) };
      var ci95 = { low: Math.round(score - 1.96 * sem), high: Math.round(score + 1.96 * sem) };
      var percentile = function(ss) {
        // approximate percentile via normal CDF
        var z = (ss - 100) / 15;
        var t = 1 / (1 + 0.2316419 * Math.abs(z));
        var d = 0.3989423 * Math.exp(-z * z / 2);
        var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        var pct = z >= 0 ? (1 - p) : p;
        return Math.max(0.1, Math.min(99.9, pct * 100));
      };
      var bandLabel = function(ss) {
        if (ss >= 130) return 'Very Superior / Extremely High';
        if (ss >= 120) return 'Superior / Very High';
        if (ss >= 110) return 'High Average';
        if (ss >= 90) return 'Average';
        if (ss >= 80) return 'Low Average';
        if (ss >= 70) return 'Below Average / Borderline';
        return 'Extremely Low';
      };

      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDCCF SEM & Confidence Interval Simulator'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'A test score is never a point. It\'s a range. This is the single most misunderstood concept in psychometric consumption — and it matters for eligibility decisions, IQ-based placements, and parent conversations. Move the sliders to see how measurement error widens with lower reliability.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30 space-y-3' },
          h('div', null,
            h('label', { className: 'text-xs font-bold text-sky-300 mb-1 block' }, 'Obtained Standard Score: ', h('span', { className: 'text-sky-100' }, score), ' (', bandLabel(score), ')'),
            h('input', {
              type: 'range', min: 40, max: 160, step: 1, value: score,
              onChange: function(e) { upd({ semScore: parseInt(e.target.value, 10) }); },
              className: 'w-full',
              'aria-label': 'Standard score'
            }),
            h('div', { className: 'flex justify-between text-xs text-slate-300 mt-1' },
              h('span', null, '40'), h('span', null, '100'), h('span', null, '160')
            )
          ),
          h('div', null,
            h('label', { className: 'text-xs font-bold text-sky-300 mb-1 block' }, 'Test-Retest Reliability: ', h('span', { className: 'text-sky-100' }, rel.toFixed(2))),
            h('input', {
              type: 'range', min: 0.60, max: 0.99, step: 0.01, value: rel,
              onChange: function(e) { upd({ semReliability: parseFloat(e.target.value) }); },
              className: 'w-full',
              'aria-label': 'Reliability coefficient'
            }),
            h('div', { className: 'flex justify-between text-xs text-slate-300 mt-1' },
              h('span', null, '0.60 (weak)'), h('span', null, '0.80'), h('span', null, '0.99 (excellent)')
            ),
            h('div', { className: 'text-xs text-slate-400 mt-1 italic' }, 'Benchmarks: WISC-V FSIQ ≈ 0.96; WJ-IV GIA ≈ 0.97; BASC-3 parent ≈ 0.82; BRIEF-2 teacher ≈ 0.84; MBTI retest ≈ 0.50.')
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-sky-900/40 to-blue-900/40 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-200 mb-3' }, 'Measurement Results'),
          h('div', { className: 'grid grid-cols-2 gap-3' },
            h('div', { className: 'p-3 rounded bg-slate-900/60' },
              h('div', { className: 'text-xs text-slate-400' }, 'Standard Error of Measurement (SEM)'),
              h('div', { className: 'text-2xl font-black text-sky-200' }, '±' + sem.toFixed(2)),
              h('div', { className: 'text-xs text-slate-400 italic' }, 'SEM = SD × √(1 − reliability)')
            ),
            h('div', { className: 'p-3 rounded bg-slate-900/60' },
              h('div', { className: 'text-xs text-slate-400' }, 'Percentile Rank (point estimate)'),
              h('div', { className: 'text-2xl font-black text-sky-200' }, percentile(score).toFixed(1) + '%'),
              h('div', { className: 'text-xs text-slate-400 italic' }, 'Position relative to age peers')
            )
          ),
          h('div', { className: 'mt-4 space-y-3' },
            h('div', null,
              h('div', { className: 'text-xs font-bold text-sky-300 mb-1' }, '68% Confidence Interval (±1 SEM)'),
              h('div', { className: 'text-sm text-slate-100' }, 'The student\'s "true score" has a 68% chance of falling between ', h('strong', { className: 'text-sky-200' }, ci68.low + ' and ' + ci68.high), '.'),
              h('div', { className: 'text-xs text-slate-400' }, 'Percentile range: ' + percentile(ci68.low).toFixed(1) + '% to ' + percentile(ci68.high).toFixed(1) + '%')
            ),
            h('div', null,
              h('div', { className: 'text-xs font-bold text-sky-300 mb-1' }, '95% Confidence Interval (±1.96 SEM) — what psych reports usually report'),
              h('div', { className: 'text-sm text-slate-100' }, 'The student\'s "true score" has a 95% chance of falling between ', h('strong', { className: 'text-sky-200' }, ci95.low + ' and ' + ci95.high), '.'),
              h('div', { className: 'text-xs text-slate-400' }, 'Percentile range: ' + percentile(ci95.low).toFixed(1) + '% to ' + percentile(ci95.high).toFixed(1) + '%')
            )
          ),
          h('div', { className: 'mt-3 h-8 rounded bg-slate-700 relative overflow-hidden' },
            h('div', { className: 'absolute top-0 bottom-0 bg-sky-500/30', style: { left: ((ci95.low - 40) / 120 * 100) + '%', width: ((ci95.high - ci95.low) / 120 * 100) + '%' } }),
            h('div', { className: 'absolute top-0 bottom-0 bg-sky-400/60', style: { left: ((ci68.low - 40) / 120 * 100) + '%', width: ((ci68.high - ci68.low) / 120 * 100) + '%' } }),
            h('div', { className: 'absolute top-0 bottom-0 w-0.5 bg-white', style: { left: ((score - 40) / 120 * 100) + '%' } }),
            h('div', { className: 'relative text-xs text-white font-bold text-center pt-1' }, 'SS ' + score + ' (95% CI ' + ci95.low + '–' + ci95.high + ')')
          ),
          // Bell-curve visualization — score + 95% CI band rendered on the
          // standard-score normal distribution. Brings percentile rank to life.
          (function() {
            var W = 480, H = 200;
            var pad = { l: 28, r: 12, t: 18, b: 32 };
            var xMin = 40, xMax = 160;  // SS range
            var sxFn = function(x) { return pad.l + ((x - xMin) / (xMax - xMin)) * (W - pad.l - pad.r); };
            var pdf = function(ss) {
              var z = (ss - 100) / 15;
              return Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
            };
            // Find max pdf for y-scaling (peak at SS=100)
            var peakY = pdf(100);
            var syFn = function(p) { return pad.t + (1 - p / peakY) * (H - pad.t - pad.b - 4); };
            // Sample points across the curve
            var nSamples = 80;
            var curvePts = [];
            for (var k = 0; k <= nSamples; k++) {
              var ss = xMin + (xMax - xMin) * (k / nSamples);
              curvePts.push([sxFn(ss), syFn(pdf(ss))]);
            }
            // CI95 region — fill under the curve between ci95.low and ci95.high
            var ciFillPts = [];
            ciFillPts.push([sxFn(ci95.low), H - pad.b]);
            for (var k2 = 0; k2 <= nSamples; k2++) {
              var ss2 = ci95.low + (ci95.high - ci95.low) * (k2 / nSamples);
              ciFillPts.push([sxFn(ss2), syFn(pdf(ss2))]);
            }
            ciFillPts.push([sxFn(ci95.high), H - pad.b]);
            // Build SVG path strings
            var curvePath = 'M ' + curvePts.map(function(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L ');
            var ciPath = 'M ' + ciFillPts.map(function(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L ') + ' Z';
            // Standard band labels at -2sd, -1sd, mean, +1sd, +2sd (SS=70,85,100,115,130)
            var bandTicks = [70, 85, 100, 115, 130];
            return h('div', { className: 'mt-4' },
              h('div', { className: 'text-xs font-bold text-sky-300 mb-1' }, 'Where this score lands on the normal distribution'),
              h('svg', {
                width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H,
                role: 'img',
                'aria-label': 'Normal distribution with score ' + score + ' marked. 95% confidence interval shaded from ' + ci95.low + ' to ' + ci95.high + '. Percentile rank ' + percentile(score).toFixed(1) + '%.',
                style: { background: '#0f172a', borderRadius: 8 }
              },
                // 95% CI band fill under the curve
                h('path', { d: ciPath, fill: '#0ea5e9', opacity: 0.40 }),
                // Bell curve outline
                h('path', { d: curvePath, fill: 'none', stroke: '#7dd3fc', strokeWidth: 2 }),
                // Standard-score band gridlines (every 1 SD)
                bandTicks.map(function(t, ti) {
                  return h('g', { key: ti },
                    h('line', { x1: sxFn(t), y1: pad.t, x2: sxFn(t), y2: H - pad.b, stroke: '#475569', strokeWidth: 1, strokeDasharray: '2 3', opacity: 0.45 }),
                    h('text', { x: sxFn(t), y: H - pad.b + 14, textAnchor: 'middle', fontSize: 10, fill: '#94a3b8' }, t)
                  );
                }),
                // Score marker — vertical line + label
                h('line', { x1: sxFn(score), y1: pad.t - 4, x2: sxFn(score), y2: H - pad.b, stroke: '#fef3c7', strokeWidth: 2 }),
                h('text', { x: sxFn(score), y: pad.t - 6, textAnchor: 'middle', fontSize: 12, fontWeight: 800, fill: '#fef3c7' },
                  'SS ' + score
                ),
                // 95% CI bracket above the curve
                h('line', { x1: sxFn(ci95.low), y1: H - pad.b - 4, x2: sxFn(ci95.high), y2: H - pad.b - 4, stroke: '#0ea5e9', strokeWidth: 2 }),
                h('line', { x1: sxFn(ci95.low), y1: H - pad.b - 8, x2: sxFn(ci95.low), y2: H - pad.b, stroke: '#0ea5e9', strokeWidth: 2 }),
                h('line', { x1: sxFn(ci95.high), y1: H - pad.b - 8, x2: sxFn(ci95.high), y2: H - pad.b, stroke: '#0ea5e9', strokeWidth: 2 }),
                // Axis label
                h('text', { x: W / 2, y: H - 4, textAnchor: 'middle', fontSize: 10, fill: '#94a3b8' }, 'Standard Score (mean 100, SD 15) — blue band = 95% CI')
              ),
              h('div', { className: 'mt-2 text-xs text-slate-300 italic' },
                'The 95% CI band reflects the score\'s real uncertainty. A "true score" anywhere in the blue band is consistent with what we observed. Notice how the band widens dramatically when you drag reliability down.'
              )
            );
          })(),
          // Reliability → SEM curve: shows how SEM grows as reliability drops
          (function() {
            var W = 480, H = 140;
            var pad = { l: 36, r: 12, t: 14, b: 28 };
            var rMin = 0.50, rMax = 1.00;
            var sxFn2 = function(r) { return pad.l + ((r - rMin) / (rMax - rMin)) * (W - pad.l - pad.r); };
            var maxSem = 15 * Math.sqrt(1 - rMin);  // ~10.6 at r=0.5
            var syFn2 = function(s) { return pad.t + (1 - s / maxSem) * (H - pad.t - pad.b); };
            var pts = [];
            for (var k = 0; k <= 60; k++) {
              var r = rMin + (rMax - rMin) * (k / 60);
              var sm = 15 * Math.sqrt(1 - r);
              pts.push([sxFn2(r), syFn2(sm)]);
            }
            var path = 'M ' + pts.map(function(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L ');
            return h('div', { className: 'mt-4' },
              h('div', { className: 'text-xs font-bold text-sky-300 mb-1' }, 'Reliability vs SEM — drag the reliability slider to see your point move along this curve'),
              h('svg', {
                width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H,
                role: 'img', 'aria-label': 'Curve showing how the standard error of measurement grows as reliability drops below 1.0.',
                style: { background: '#0f172a', borderRadius: 8 }
              },
                // Axes
                h('line', { x1: pad.l, y1: H - pad.b, x2: W - pad.r, y2: H - pad.b, stroke: '#475569' }),
                h('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: H - pad.b, stroke: '#475569' }),
                // Curve
                h('path', { d: path, fill: 'none', stroke: '#0ea5e9', strokeWidth: 2 }),
                // Current-point marker
                h('circle', { cx: sxFn2(rel), cy: syFn2(sem), r: 5, fill: '#fef3c7', stroke: '#0f172a', strokeWidth: 2 }),
                h('text', { x: sxFn2(rel) + 8, y: syFn2(sem) - 6, fontSize: 10, fill: '#fef3c7', fontWeight: 700 },
                  'r=' + rel.toFixed(2) + '  SEM=±' + sem.toFixed(1)
                ),
                // Tick labels
                [0.60, 0.70, 0.80, 0.90, 0.99].map(function(r0, ti) {
                  return h('g', { key: ti },
                    h('line', { x1: sxFn2(r0), y1: H - pad.b, x2: sxFn2(r0), y2: H - pad.b + 4, stroke: '#475569' }),
                    h('text', { x: sxFn2(r0), y: H - pad.b + 14, textAnchor: 'middle', fontSize: 10, fill: '#94a3b8' }, r0.toFixed(2))
                  );
                }),
                [0, 5, 10].map(function(sm0, ti) {
                  return h('text', { key: ti, x: pad.l - 4, y: syFn2(sm0) + 4, textAnchor: 'end', fontSize: 10, fill: '#94a3b8' }, sm0);
                }),
                h('text', { x: W / 2, y: H - 4, textAnchor: 'middle', fontSize: 10, fill: '#94a3b8' }, 'Reliability →   (lower reliability = larger SEM = wider CIs)'),
                h('text', { x: 6, y: H / 2, textAnchor: 'start', fontSize: 10, fill: '#94a3b8', transform: 'rotate(-90 6 ' + (H / 2) + ')' }, 'SEM')
              )
            );
          })()
        ),

        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'What this means in practice'),
          h('ul', { className: 'text-xs text-slate-200 space-y-2 list-disc list-inside' },
            h('li', null, h('strong', null, 'An FSIQ of 69 does not definitively mean ID eligibility.'), ' With SEM ≈ 3 on WISC-V FSIQ, the 95% CI runs roughly 63-75. Many states explicitly require clinicians to consider the CI, not just the point estimate, for the ~70 cutoff.'),
            h('li', null, h('strong', null, 'Score changes within CI are noise, not change.'), ' "My kid went from 112 to 108" across two evaluations is almost certainly measurement error — the 95% CIs overlap heavily. Do not overinterpret within-CI fluctuation as cognitive decline or improvement.'),
            h('li', null, h('strong', null, 'Discrepancy scores have COMPOUND error.'), ' If you\'re comparing two scores to flag "severe discrepancy," the SEM of the difference is larger than either score\'s SEM alone. A 15-point FSIQ-Achievement gap may or may not be statistically significant depending on the reliabilities involved.'),
            h('li', null, h('strong', null, 'Report writers: always report CIs.'), ' Best practice per APA, NASP, and test publisher guidelines. Parents deserve the range, not the false precision of a point estimate.'),
            h('li', null, h('strong', null, 'Less reliable instruments have much wider CIs.'), ' Drag the reliability slider down to 0.70 and see SEM balloon to ±8. That\'s why screener scores (often reliability ~0.75-0.85) should never drive eligibility decisions — only comprehensive, higher-reliability measures should.')
          )
        ),
        h('div', { className: 'no-print' },
          h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-sky-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print current settings / Save as PDF')
        )
      );
    }

    if (sub === 'reliabilitySleuth') return _renderReliabilitySleuth(h, s, upd, addToast, backBtn);
    if (sub === 'eligibilitySort') {
      // Catalog of categories the game uses (keys back to IDEA_CATEGORIES + DD).
      // Players pick from the SAME 14-button grid no matter the vignette \u2014 forces
      // active discrimination instead of multiple-choice with 4 distractors.
      var ELG_VIGNETTES = [
        { id: 1, scenario: '5-year-old non-speaking child. Parent describes intense fixation on train schedules + memorized bus routes. Toddler-era language regression noted. M-CHAT-R was elevated at 18 months. Resists changes in routine.', correct: 'AU', why: 'Hallmark autism profile: communication impairment + restricted/repetitive interests + early onset. ADOS-2 + ADI-R + cognitive + adaptive + language battery. Note: same kid in a different state might also qualify under DD if under 9 and the team prefers to defer specific-category commitment.' },
        { id: 2, scenario: '9-year-old. FSIQ 95 (average). Reads at 5th percentile despite tier-2 + tier-3 reading interventions. Phonological processing 2nd percentile. Achievement gap is reading-only \u2014 math + writing average.', correct: 'SLD', why: 'Classic specific-reading-disability (dyslexia) profile. Average cognitive ability + dramatic basic-reading deficit + non-responder to tiered intervention = SLD in basic reading skills. NOT ID (FSIQ average) and NOT "primarily due to environmental disadvantage" if interventions were appropriate.' },
        { id: 3, scenario: '8-year-old with clinical ADHD diagnosis on stimulant medication. Teacher reports persistent inattention impacting work completion. Cognitive battery within normal limits. No academic-skill deficits beyond what attention can explain.', correct: 'OHI', why: 'ADHD is most commonly classified under Other Health Impairment in IDEA. The "limited alertness" language captures attention disorders. Eval typically: medical documentation + behavior rating scales (Conners-4, BASC-3, BRIEF-2) + classroom observations + cognitive (rule-out other) + achievement.' },
        { id: 4, scenario: '14-year-old. FSIQ 65 (95% CI 60\u201370). Vineland-3 adaptive composite 62. Deficits emerged in early childhood, evident across academics + adaptive behavior. No sensory or motor disability.', correct: 'ID', why: 'Three-prong ID: significantly subaverage cognition (FSIQ ~70 or below with CI), concurrent adaptive deficits, manifested in developmental period. The CI matters \u2014 ID determination requires the CI to clearly support the cutoff, not a point estimate of 70 exactly.' },
        { id: 5, scenario: '12-year-old. Long-standing inability to build/maintain peer relationships across years and contexts. Pervasive depressed mood per BASC-3 SRP. Two psychiatric hospitalizations in past 12 months. Academic performance has declined.', correct: 'ED', why: 'Long-duration + marked-degree ED criteria: inability to build relationships AND pervasive mood of unhappiness/depression AND adverse educational impact. Note: ED explicitly EXCLUDES social maladjustment alone \u2014 this kid has documented mental-health condition, not just "behavior problems."' },
        { id: 6, scenario: '6-year-old. Cognitive battery WNL (FSIQ 102). SLP eval: expressive language at 3rd percentile, articulation typical for age. Documented classroom impact \u2014 cannot adequately respond to teacher questions or peer conversations.', correct: 'SLI', why: 'Speech-language impairment with adverse educational impact. Average cognition rules out ID. The deficit is specifically in language production, not overall learning. Service is typically SLP push-in/pull-out under SLI eligibility.' },
        { id: 7, scenario: '14-year-old. Was honor-roll student until a motor vehicle accident 6 months ago. Post-injury: documented executive function deficits (BRIEF-2 GEC at 75T) and slowed processing speed. Was previously not eligible for special education.', correct: 'TBI', why: 'Traumatic Brain Injury eligibility. The acquired-from-external-physical-force language is the key. NOT congenital. Eval includes neuropsych + cognitive + achievement + behavioral + medical records. Educational team plans accommodations + specialized instruction targeting the new EF and processing-speed needs.' },
        { id: 8, scenario: '7-year-old. Bilateral mild-to-moderate hearing loss, hearing aids fit and consistently worn. With amplification, child processes speech adequately. Classroom accommodations include FM system + preferential seating. Language acquisition WNL.', correct: 'HI', why: 'Hearing Impairment, NOT Deafness. The IDEA distinction: Deafness = hearing impairment so severe child cannot process linguistic info through hearing even with amplification. This child CAN with hearing aids \u2014 so HI is the right category. Audiology + language + cognitive + achievement battery.' },
        { id: 9, scenario: '7-year-old. Has documented language delay (3rd percentile expressive). NO restricted/repetitive interests. Normal social reciprocity \u2014 makes eye contact, takes conversational turns, develops peer friendships. ADOS-2 negative for ASD.', correct: 'SLI', why: 'Language delay WITHOUT the social-communication and restricted-interest features that define autism. The negative ADOS-2 is the discriminator. This kid is SLI, not AU \u2014 a common misclassification in the other direction. Don\'t over-call autism just because language is delayed.' },
        { id: 10, scenario: '9-year-old. Legally blind in one eye after retinal detachment. Vision in remaining eye corrects to 20/40. Normal cognition. Needs enlarged print for reading; braille not required. Mobility WNL with no orientation training needed.', correct: 'VI', why: 'Visual Impairment (including Blindness). The educational-impact framing matters: vision impairment that, even with correction, adversely affects educational performance. Functional vision eval + ophth records + access/accommodation evaluation. Note: not all visual impairments rise to IDEA-eligible.' },
        { id: 11, scenario: '11-year-old. Spastic cerebral palsy with significant lower-extremity motor impairment. Wheelchair user. Cognition average. Needs PT + OT integrated into school day, accessible seating, modified PE. Academic performance close to peers when access supports are in place.', correct: 'OI', why: 'Orthopedic Impairment \u2014 includes cerebral palsy and other congenital, disease-caused, or other physical impairments adversely affecting educational performance. Eval focus is medical records + PT/OT + access/accommodation evaluation + cognitive only if there is a question (here, average).' },
        { id: 12, scenario: '4-year-old. Congenital hearing loss (severe-profound) plus progressive vision loss from Usher syndrome. Cannot be served adequately under either Deafness or Visual Impairment alone \u2014 the combined impairment requires specialized programming.', correct: 'DB', why: 'Deaf-Blindness is its own category specifically because the combined impairment exceeds what either single-category program can serve. The IDEA carve-out reflects that. Specialized eval: combined audiology + vision + communication + adaptive + dual-impairment specialist consultation.' }
      ];
      // Pick from full IDEA_CATEGORIES (13) + DD = 14 buttons.
      var ELG_OPTIONS = IDEA_CATEGORIES.concat([IDEA_DEVDELAY]);

      // State
      var elgIdx = s.elgIdx == null ? -1 : s.elgIdx;
      var elgSeed = s.elgSeed || 1;
      var elgAnswered = !!s.elgAnswered;
      var elgPick = s.elgPick;
      var elgScore = s.elgScore || 0;
      var elgRounds = s.elgRounds || 0;
      var elgStreak = s.elgStreak || 0;
      var elgBest = s.elgBest || 0;
      var elgShown = s.elgShown || [];

      function nextRound() {
        var pool = [];
        for (var i = 0; i < ELG_VIGNETTES.length; i++) if (elgShown.indexOf(i) < 0) pool.push(i);
        if (pool.length === 0) { pool = []; for (var j = 0; j < ELG_VIGNETTES.length; j++) pool.push(j); elgShown = []; }
        var seedNext = ((elgSeed * 16807 + 11) % 2147483647) || 7;
        var pick = pool[seedNext % pool.length];
        upd({
          elgSeed: seedNext,
          elgIdx: pick,
          elgAnswered: false,
          elgPick: null,
          elgShown: elgShown.concat([pick])
        });
      }

      function answer(catCode) {
        if (elgAnswered) return;
        var v = ELG_VIGNETTES[elgIdx];
        var correct = catCode === v.correct;
        var newScore = elgScore + (correct ? 1 : 0);
        var newStreak = correct ? (elgStreak + 1) : 0;
        var newBest = Math.max(elgBest, newStreak);
        upd({
          elgAnswered: true,
          elgPick: catCode,
          elgScore: newScore,
          elgRounds: elgRounds + 1,
          elgStreak: newStreak,
          elgBest: newBest
        });
        if (addToast) addToast(correct ? '\u2705 Correct \u2014 ' + v.correct : '\u274C Not the right category \u2014 it was ' + v.correct, correct ? 'success' : 'info');
      }

      // Intro state
      if (elgIdx < 0) {
        return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
          backBtn('schoolpsych', null, 'School Psych menu'),
          h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83C\uDFAF Eligibility Sort \u2014 IDEA category match'),
          h('p', { className: 'text-sm text-slate-200 leading-relaxed' }, 'You will see 12 short student-profile vignettes. For each, pick the IDEA eligibility category that fits best from the full 14-button grid. The grid never narrows by elimination \u2014 forces real discrimination, not multiple-choice. After each answer, a coaching block names what is happening and why this kid does not fit the look-alike categories.'),
          h('div', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
            h('div', { className: 'text-sm font-bold text-amber-300 mb-2' }, '\u26A0\uFE0F Three-prong reminder'),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'Real eligibility requires (1) category match + (2) adverse educational impact + (3) need for specialized instruction. This game tests *category match only* \u2014 the easier of the three calls. Real teams must document all three.')
          ),
          h('button', {
            onClick: nextRound,
            className: 'w-full py-3 rounded-xl bg-sky-600 text-white font-bold text-sm hover:bg-sky-500 focus:outline-none focus:ring-2 ring-sky-300'
          }, '\uD83C\uDFAF Start \u2014 vignette 1 of 12')
        );
      }

      var v = ELG_VIGNETTES[elgIdx];
      var pickedCorrect = elgAnswered && elgPick === v.correct;
      var pct = elgRounds > 0 ? Math.round((elgScore / elgRounds) * 100) : 0;
      var allDone = elgShown.length >= ELG_VIGNETTES.length && elgAnswered;
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83C\uDFAF Eligibility Sort'),
        // Score header
        h('div', { className: 'flex flex-wrap gap-3 items-center text-xs' },
          h('span', { className: 'text-slate-300' }, 'Vignette ', h('strong', { className: 'text-white' }, elgShown.length)),
          h('span', { className: 'text-slate-300' }, 'Score ', h('strong', { className: 'text-emerald-300' }, elgScore + ' / ' + elgRounds)),
          elgRounds > 0 && h('span', { className: 'text-slate-300' }, 'Accuracy ', h('strong', { className: 'text-cyan-300' }, pct + '%')),
          h('span', { className: 'text-slate-300' }, 'Streak ', h('strong', { className: 'text-amber-300' }, elgStreak)),
          h('span', { className: 'text-slate-300' }, 'Best ', h('strong', { className: 'text-yellow-300' }, elgBest))
        ),
        // The vignette
        h('section', { className: 'p-5 rounded-xl bg-slate-800/60 border-2 border-sky-500/40' },
          h('div', { className: 'text-xs font-bold text-sky-300 uppercase tracking-widest mb-2' }, 'Vignette ' + (elgShown.length) + ' of ' + ELG_VIGNETTES.length),
          h('p', { className: 'text-sm text-slate-100 leading-relaxed' }, v.scenario)
        ),
        // 14-button category grid
        h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2', role: 'radiogroup', 'aria-label': 'Pick the IDEA eligibility category' },
          ELG_OPTIONS.map(function(opt) {
            var picked = elgAnswered && elgPick === opt.code;
            var isRight = elgAnswered && opt.code === v.correct;
            var bg, border, color;
            if (elgAnswered) {
              if (isRight) { bg = 'rgba(34,197,94,0.18)'; border = '#22c55e'; color = '#bbf7d0'; }
              else if (picked) { bg = 'rgba(239,68,68,0.18)'; border = '#ef4444'; color = '#fecaca'; }
              else { bg = 'rgba(30,41,59,0.6)'; border = 'rgba(100,116,139,0.4)'; color = '#94a3b8'; }
            } else {
              bg = 'rgba(14,165,233,0.10)'; border = 'rgba(14,165,233,0.40)'; color = '#e2e8f0';
            }
            return h('button', {
              key: opt.code, role: 'radio',
              'aria-checked': picked ? 'true' : 'false',
              disabled: elgAnswered,
              onClick: function() { answer(opt.code); },
              style: { padding: '8px 10px', borderRadius: 8, background: bg, color: color, border: '2px solid ' + border, cursor: elgAnswered ? 'default' : 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 11, transition: 'all 0.15s', minHeight: 44 }
            },
              h('div', { style: { fontFamily: 'monospace', fontSize: 12, fontWeight: 800, marginBottom: 2 } }, opt.code),
              h('div', { style: { fontSize: 10, fontWeight: 600, lineHeight: 1.25 } }, opt.name)
            );
          })
        ),
        // Feedback
        elgAnswered && h('section', {
          className: 'p-4 rounded-xl',
          style: { background: pickedCorrect ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.08)', border: '1px solid ' + (pickedCorrect ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.40)') }
        },
          h('div', { className: 'text-sm font-bold mb-2', style: { color: pickedCorrect ? '#86efac' : '#fca5a5' } },
            pickedCorrect
              ? '\u2705 Correct \u2014 ' + v.correct + ' (' + (ELG_OPTIONS.filter(function(x) { return x.code === v.correct; })[0] || {}).name + ')'
              : '\u274C The right category is ' + v.correct + ' (' + (ELG_OPTIONS.filter(function(x) { return x.code === v.correct; })[0] || {}).name + ')' + (elgPick ? ' \u2014 you picked ' + elgPick : '')
          ),
          h('p', { className: 'text-xs text-slate-100 leading-relaxed mb-2' }, v.why),
          allDone
            ? h('div', { className: 'p-3 rounded-lg bg-sky-900/40 border border-sky-500/40 mt-2' },
                h('div', { className: 'text-sm font-black text-sky-200 mb-1' }, '\uD83C\uDFC6 All 12 vignettes complete!'),
                h('div', { className: 'text-xs text-slate-100 leading-relaxed' },
                  'Final score: ', h('strong', { className: 'text-white' }, elgScore + ' / ' + ELG_VIGNETTES.length + ' (' + Math.round((elgScore / ELG_VIGNETTES.length) * 100) + '%)'),
                  elgScore === ELG_VIGNETTES.length ? ' \u2014 all 12 categories matched correctly. Ready for case-conference work.' :
                  elgScore >= 10 ? ' \u2014 strong category-match reasoning. The most-miss-prone pairs are SLD vs ED (when behavior + academic concerns coexist) and OHI vs SLD (when ADHD coexists with reading deficits).' :
                  elgScore >= 7 ? ' \u2014 solid baseline. The most-confused categories are usually AU vs SLI (language delay without the autism social-communication profile) and HI vs D (functional access vs total impairment).' :
                  ' \u2014 these distinctions take real practice. Re-read the IDEA Categories module + the rationale on misses, then retake. Pattern recognition for category matching comes from many cases.'
                ),
                h('button', {
                  onClick: function() { upd({ elgIdx: -1, elgShown: [], elgScore: 0, elgRounds: 0, elgStreak: 0 }); },
                  className: 'mt-2 px-4 py-1.5 rounded-lg bg-sky-600 text-white font-bold text-xs hover:bg-sky-500'
                }, '\uD83D\uDD04 Restart')
              )
            : h('button', {
                onClick: nextRound,
                className: 'mt-1 px-4 py-2 rounded-lg bg-sky-600 text-white font-bold text-sm hover:bg-sky-500 focus:outline-none focus:ring-2 ring-sky-300'
              }, '\u27A1\uFE0F Next vignette')
        )
      );
    }

    if (sub === 'rti') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDCCA RTI / MTSS — The Support Pyramid'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Response to Intervention (now usually called Multi-Tiered System of Supports, MTSS, to cover behavior and social-emotional in addition to academics) is the pre-referral backbone. Before a student is referred for special ed eval — in most modern systems — they should have moved through these tiers with documented data.'),
        RTI_TIERS.map(function(t) {
          return h('section', { key: t.tier, className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
            h('div', { className: 'flex items-baseline justify-between mb-2' },
              h('h3', { className: 'text-base font-black text-sky-200' }, 'Tier ' + t.tier + ' — ' + t.name),
              h('span', { className: 'text-xs font-bold text-sky-400' }, t.pct + ' of students')
            ),
            h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-sky-300' }, 'Who: '), t.who),
            h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-sky-300' }, 'What: '), t.what),
            h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-sky-300' }, 'Intensity: '), t.intensity)
          );
        }),
        h('section', { className: 'p-4 rounded-xl bg-emerald-900/30 border border-emerald-500/40' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-2' }, 'The key data point for referral'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'A student who does NOT respond adequately to Tier 3 intervention — documented with frequent progress monitoring, delivered with fidelity, at appropriate intensity, over sufficient duration (typically 8-12+ weeks) — is a strong candidate for special ed referral. This "nonresponder" evidence is the foundation of RTI-based SLD identification and is useful supporting data for any eligibility determination.')
        ),
        h('section', { className: 'p-4 rounded-xl bg-rose-900/30 border border-rose-500/40' },
          h('h3', { className: 'text-sm font-black text-rose-300 mb-2' }, 'Common implementation failures'),
          h('ul', { className: 'text-xs text-slate-200 space-y-1 list-disc list-inside' },
            h('li', null, h('strong', null, 'RTI as delay tactic: '), 'Schools sometimes use RTI to postpone referrals indefinitely. Parents have the right to request evaluation at ANY time regardless of RTI status.'),
            h('li', null, h('strong', null, 'Fidelity unverified: '), 'Intervention "didn\'t work" when it was never delivered as designed. Document who, what, how often, with what materials, with what accountability.'),
            h('li', null, h('strong', null, 'Wrong intervention: '), 'Tier 2 phonics intervention for a child whose deficit is actually comprehension — intensity-matched but target-mismatched. Match intervention to deficit type, not just grade.'),
            h('li', null, h('strong', null, 'Universal screening missing: '), 'RTI systems require 3x/year universal screening to identify candidates for higher tiers. Skipping screening breaks the system.')
          )
        )
      );
    }

    if (sub === 'sld') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDCDD SLD Identification Methods'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Specific Learning Disability is the most common IDEA eligibility category — and identifying it is the most methodologically contested area of psychoed assessment. IDEA 2004 allowed states to choose among (or combine) three approaches.'),
        SLD_METHODS.map(function(m, i) {
          return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
            h('h3', { className: 'text-base font-black text-sky-200 mb-1' }, m.name),
            h('div', { className: 'text-xs text-sky-400 italic mb-2' }, m.era),
            h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-sky-300' }, 'How it works: '), m.how),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 mt-2' },
              h('div', { className: 'p-2 rounded bg-emerald-900/30 border border-emerald-500/30' },
                h('div', { className: 'text-xs font-black text-emerald-300 mb-1' }, '\u2713 Strengths'),
                h('div', { className: 'text-xs text-slate-200' }, m.strengths)
              ),
              h('div', { className: 'p-2 rounded bg-amber-900/30 border border-amber-500/30' },
                h('div', { className: 'text-xs font-black text-amber-300 mb-1' }, '\u26A0 Weaknesses'),
                h('div', { className: 'text-xs text-slate-200' }, m.weaknesses)
              )
            )
          );
        }),
        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-2' }, 'The 8 IDEA SLD Academic Areas'),
          h('p', { className: 'text-xs text-slate-200 mb-2' }, 'To qualify for SLD, the student must show a deficit in at least one of these:'),
          h('ol', { className: 'text-xs text-slate-200 space-y-1 list-decimal list-inside' },
            h('li', null, 'Basic reading skills (decoding, word recognition)'),
            h('li', null, 'Reading fluency skills'),
            h('li', null, 'Reading comprehension'),
            h('li', null, 'Mathematics calculation'),
            h('li', null, 'Mathematics problem-solving'),
            h('li', null, 'Written expression'),
            h('li', null, 'Listening comprehension'),
            h('li', null, 'Oral expression')
          ),
          h('p', { className: 'text-xs text-slate-300 mt-3 italic' }, 'A comprehensive SLD evaluation should assess across all 8 areas, not just the area of referral concern. Hidden deficits in listening comprehension or written expression often emerge when you look.')
        )
      );
    }

    if (sub === 'psychoed') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDD2C Psychoed Evaluation Components'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'A comprehensive psychoeducational evaluation selects from these domains based on referral question and suspected eligibility. An SLD eval looks different from an ID eval, which looks different from an autism eval. Here\'s the domain menu school psychologists actually work from.'),
        PSYCHOED_COMPONENTS.map(function(c, i) {
          return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
            h('h3', { className: 'text-sm font-black text-sky-200 mb-1' }, c.domain),
            h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-sky-300' }, 'Why: '), c.why),
            h('div', { className: 'text-xs text-slate-300' }, h('strong', { className: 'text-sky-300' }, 'Common instruments: '), c.instruments)
          );
        }),
        h('section', { className: 'p-4 rounded-xl bg-purple-900/30 border border-purple-500/40' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-2' }, 'Matching domains to referral questions'),
          h('ul', { className: 'text-xs text-slate-200 space-y-2 list-disc list-inside' },
            h('li', null, h('strong', null, 'SLD reading: '), 'Cognitive + full achievement + phonological (CTOPP-2) + observation + RTI data.'),
            h('li', null, h('strong', null, 'Intellectual Disability: '), 'Cognitive (with CI) + adaptive (BOTH parent and teacher raters) + achievement + developmental history. Adaptive findings matter as much as IQ.'),
            h('li', null, h('strong', null, 'ADHD (often OHI): '), 'Behavioral rating scales (Conners-4, BRIEF-2, BASC-3) + observation + cognitive (ADHD often shows working memory / processing speed weakness) + interview.'),
            h('li', null, h('strong', null, 'Autism: '), 'ADOS-2 + ADI-R + cognitive + adaptive + language. Medical/developmental history critical.'),
            h('li', null, h('strong', null, 'Emotional Disturbance: '), 'Behavioral (parent + teacher + self), clinical interview, observation across settings, rule-out medical and SLD. Consider community mental health referral in parallel.')
          )
        )
      );
    }

    if (sub === 'iep504') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\u2696\uFE0F 504 Plan vs. IEP — The Decision'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'These are two different legal protections with different eligibility standards and different levels of support. Understanding which one applies — and what each actually provides — is core literacy for families navigating the system.'),
        h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
          [FIVE04_VS_IEP.fiveoFour, FIVE04_VS_IEP.iep].map(function(p, i) {
            return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border ' + (i === 0 ? 'border-emerald-500/40' : 'border-purple-500/40') },
              h('h3', { className: 'text-base font-black mb-2 ' + (i === 0 ? 'text-emerald-200' : 'text-purple-200') }, p.name),
              h('div', { className: 'text-xs text-slate-400 italic mb-3' }, p.law),
              h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: i === 0 ? 'text-emerald-300' : 'text-purple-300' }, 'Eligibility: '), p.eligibility),
              h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: i === 0 ? 'text-emerald-300' : 'text-purple-300' }, 'Provides: '), p.provides),
              h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: i === 0 ? 'text-emerald-300' : 'text-purple-300' }, 'Process: '), p.process),
              h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: i === 0 ? 'text-emerald-300' : 'text-purple-300' }, 'Examples: '), p.examples),
              h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: i === 0 ? 'text-emerald-300' : 'text-purple-300' }, 'When used: '), p.when)
            );
          })
        ),
        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-sky-900/40 to-indigo-900/40 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-200 mb-3' }, 'Decision Tree'),
          h('ol', { className: 'space-y-2' },
            FIVE04_VS_IEP.decisionTree.map(function(step, i) {
              return h('li', { key: i, className: 'p-2 rounded bg-slate-900/60 text-xs text-slate-200' },
                h('span', { className: 'inline-block w-6 h-6 rounded-full bg-sky-600 text-white text-center font-bold mr-2' }, i + 1),
                step
              );
            })
          )
        ),
        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'Common misunderstandings'),
          h('ul', { className: 'text-xs text-slate-200 space-y-1 list-disc list-inside' },
            h('li', null, h('strong', null, '"My child has ADHD, so they need an IEP."'), ' Not necessarily. ADHD with classroom-level impact often works as a 504 (accommodations only). ADHD with academic deficits requiring specialized instruction (e.g., intensive reading intervention for co-occurring SLD) moves to IEP territory.'),
            h('li', null, h('strong', null, '"A 504 is a lesser IEP."'), ' No — they do different things. 504 is broader eligibility, more flexible, but no specialized instruction. IEP is narrower eligibility with more service teeth.'),
            h('li', null, h('strong', null, '"Only IDEA gives legal protection."'), ' Both 504 and IDEA are federal civil rights laws with distinct enforcement. Either can be the basis for compliance complaints and due process.'),
            h('li', null, h('strong', null, 'Transition from IEP to 504: '), 'As students approach graduation or when skills improve, some students move from IEP to 504 (or 504 only) as less-restrictive supports become sufficient. This is a legitimate, positive transition.')
          )
        )
      );
    }

    if (sub === 'categories') {
      var focus = s.ideaCategoryFocus;
      var cat = focus ? IDEA_CATEGORIES.find(function(c) { return c.code === focus; }) : null;
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDCD6 The 13 IDEA Eligibility Categories'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'To receive an IEP, a student must qualify under one of 13 federal categories (plus the optional state-specific Developmental Delay category for young children). Click a category to see its definition and the typical eval battery.'),
        h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-2' },
          IDEA_CATEGORIES.concat([IDEA_DEVDELAY]).map(function(c) {
            var selected = cat && cat.code === c.code;
            return h('button', {
              key: c.code,
              onClick: function() { upd({ ideaCategoryFocus: c.code }); },
              className: 'p-3 rounded-lg text-left transition focus:ring-2 focus:ring-sky-400 focus:outline-none ' + (selected ? 'bg-sky-600 text-white' : 'bg-slate-800/60 border border-sky-500/30 text-slate-200 hover:bg-slate-700/60')
            },
              h('div', { className: 'text-xs font-black' }, c.code),
              h('div', { className: 'text-xs' }, c.name)
            );
          })
        ),
        cat ? h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-base font-black text-sky-200 mb-1' }, cat.code + ' — ' + cat.name),
          h('div', { className: 'text-xs text-slate-200 leading-relaxed mb-3' }, h('strong', { className: 'text-sky-300' }, 'IDEA definition: '), cat.def),
          h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, h('strong', { className: 'text-sky-300' }, 'Typical evaluation battery: '), cat.typicalEval)
        ) : h('div', { className: 'p-4 rounded-xl bg-slate-900/60 text-xs text-slate-400 text-center italic' }, 'Select a category above to view details.'),
        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'Three-prong requirement'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed mb-2' }, 'Meeting a category definition is NOT sufficient for IEP eligibility. All three prongs must be documented:'),
          h('ol', { className: 'text-xs text-slate-200 space-y-1 list-decimal list-inside' },
            h('li', null, h('strong', null, 'Category match '), '— student\'s presentation meets the IDEA definition of one of the 13 categories.'),
            h('li', null, h('strong', null, 'Adverse educational impact '), '— the disability negatively affects educational performance. Must be documented with classroom data, teacher input, observation, achievement scores.'),
            h('li', null, h('strong', null, 'Need for specialized instruction '), '— the student requires instruction specifically designed to meet unique needs arising from the disability. Cannot be met through general education accommodations alone. This is what distinguishes IEP from 504.')
          )
        )
      );
    }

    if (sub === 'report') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDCC4 How to Read a Psych Report'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'A psychoeducational report is a dense legal-clinical document that parents, teachers, and advocates often need to interpret without training. Here\'s the anatomy — what each section should contain and the red flags to watch for.'),
        // Step-flow overview lifts the BirdLab career-pathway pattern.
        h('div', { className: 'p-4 rounded-2xl bg-gradient-to-br from-slate-900/80 to-sky-950/60 border border-sky-500/40' },
          h('div', { className: 'text-[10px] font-bold uppercase tracking-widest text-sky-300 mb-3' }, 'The 8-section flow'),
          h('div', { className: 'flex flex-wrap items-stretch gap-1.5' },
            REPORT_ANATOMY.map(function(r, i) {
              var isLast = i === REPORT_ANATOMY.length - 1;
              var glyph = ['📨', '📚', '👁', '📋', '📊', '🔍', '✅', '🎯'][i] || '📄';
              return h('div', { key: 'flow-' + i, className: 'flex items-center gap-1.5', style: { flex: '0 0 auto' } },
                h('div', {
                  style: {
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '2px solid rgba(56, 189, 248, 0.6)',
                    color: '#bae6fd',
                    padding: '6px 10px 6px 14px',
                    borderRadius: 8,
                    fontSize: 11, fontWeight: 700,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                    position: 'relative',
                    display: 'flex', alignItems: 'center', gap: 6
                  }
                },
                  h('span', {
                    'aria-hidden': 'true',
                    style: {
                      position: 'absolute', top: -8, left: -8,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#0284c7', color: '#ffffff',
                      fontSize: 10, fontWeight: 900,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }
                  }, String(i + 1)),
                  h('span', { 'aria-hidden': 'true' }, glyph),
                  h('span', null, r.section)
                ),
                !isLast && h('span', {
                  'aria-hidden': 'true',
                  style: { color: '#38bdf8', fontSize: 16, fontWeight: 'bold' }
                }, '→')
              );
            })
          )
        ),
        REPORT_ANATOMY.map(function(r, i) {
          var glyph = ['📨', '📚', '👁', '📋', '📊', '🔍', '✅', '🎯'][i] || '📄';
          return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30 relative mt-3' },
            h('div', {
              'aria-hidden': 'true',
              style: {
                position: 'absolute', top: -10, left: 14,
                width: 26, height: 26, borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                color: '#ffffff', fontSize: 12, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #0f172a',
                boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
              }
            }, String(i + 1)),
            h('h3', { className: 'text-sm font-black text-sky-200 mb-1 pl-7' },
              h('span', { 'aria-hidden': 'true', className: 'mr-1.5' }, glyph),
              r.section
            ),
            h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-sky-300' }, 'Purpose: '), r.purpose),
            h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-amber-300' }, 'Watch for: '), r.watchFor)
          );
        }),
        h('section', { className: 'p-4 rounded-xl bg-purple-900/30 border border-purple-500/40' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-2' }, 'Score conversion cheat sheet'),
          h('div', { className: 'text-xs text-slate-200 space-y-2' },
            h('div', null, h('strong', { className: 'text-purple-300' }, 'Standard Score (SS): '), 'Mean = 100, SD = 15. Most cognitive and achievement tests report SS.'),
            h('div', null, h('strong', { className: 'text-purple-300' }, 'Scaled Score: '), 'Mean = 10, SD = 3. Subtest-level scores within WISC-V and similar batteries.'),
            h('div', null, h('strong', { className: 'text-purple-300' }, 'T-Score: '), 'Mean = 50, SD = 10. Common on behavior rating scales (BASC-3, CBCL). Higher T often means more problems (clinical range 65+, borderline 60-65).'),
            h('div', null, h('strong', { className: 'text-purple-300' }, 'Percentile Rank: '), 'Percentage of the norm sample scoring AT OR BELOW this student. NOT a percentage of items correct. A PR of 25 means 25% of peers score at/below this level — student is at the 25th percentile.'),
            h('div', null, h('strong', { className: 'text-purple-300' }, 'Grade Equivalent / Age Equivalent: '), 'Use with caution. A 7th grader with a GE of 4.2 is NOT performing at 4th-grade level — these scores are mathematically noisy at ability extremes. Most guidelines recommend against interpreting GEs in isolation.'),
            h('div', null, h('strong', { className: 'text-purple-300' }, 'Confidence Interval: '), 'The range within which the student\'s true score likely falls (usually 90% or 95% CI). Always report alongside the point estimate. See SEM simulator.')
          ),
          h('div', { className: 'mt-3 p-2 rounded bg-slate-900/60' },
            h('div', { className: 'text-xs font-bold text-purple-200 mb-1' }, 'Classification bands (SS):'),
            h('div', { className: 'text-xs text-slate-300' }, '130+: Very Superior · 120-129: Superior · 110-119: High Average · 90-109: Average · 80-89: Low Average · 70-79: Below Average/Borderline · <70: Extremely Low (ID range with adaptive support)')
          )
        )
      );
    }

    if (sub === 'rights') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDD12 Parent Procedural Safeguards (IDEA)'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Under IDEA, parents have specific legal rights throughout the special education process. Schools must provide a copy of procedural safeguards at least annually. Knowing these rights — and when to invoke them — is essential for families navigating eligibility disputes, placement disagreements, or services that aren\'t being delivered.'),
        PARENT_RIGHTS.map(function(r, i) {
          return h('section', { key: i, className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
            h('h3', { className: 'text-sm font-black text-sky-200 mb-2' }, r.right),
            h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, r.body)
          );
        }),
        h('section', { className: 'p-4 rounded-xl bg-rose-900/30 border border-rose-500/40' },
          h('h3', { className: 'text-sm font-black text-rose-300 mb-2' }, 'When rights get violated (and what to do)'),
          h('ul', { className: 'text-xs text-slate-200 space-y-2 list-disc list-inside' },
            h('li', null, h('strong', null, 'School refuses to evaluate: '), 'You have the right to request evaluation in writing at any time. School must respond with PWN explaining decision. If denied, you can file a state complaint or due process.'),
            h('li', null, h('strong', null, 'Eval completed but eligibility denied: '), 'You can request an IEE at public expense. If school disagrees, they must file due process to defend their eval.'),
            h('li', null, h('strong', null, 'IEP not being implemented: '), 'Document the missed services (dates, durations, staff). File a complaint with the state education agency — these are easier and faster than due process for implementation failures.'),
            h('li', null, h('strong', null, 'Retaliation for advocacy: '), 'Section 504 and IDEA both prohibit retaliation against parents/students for exercising rights. If you experience retaliation, file a complaint with OCR (Office for Civil Rights).')
          )
        ),
        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-slate-500/30' },
          h('h3', { className: 'text-sm font-black text-slate-200 mb-2' }, 'Getting help'),
          h('ul', { className: 'text-xs text-slate-200 space-y-1 list-disc list-inside' },
            h('li', null, 'Parent Training and Information Center (PTI) — federally funded, free, every state has one. Search "[Your State] Parent Training Information Center."'),
            h('li', null, 'Council of Parent Attorneys and Advocates (COPAA) — national org, directory of special ed advocates and attorneys.'),
            h('li', null, 'Wrightslaw (wrightslaw.com) — accessible legal resource library, regularly updated.'),
            h('li', null, 'State Protection & Advocacy agency — free legal support for disability rights issues in each state.'),
            h('li', null, 'U.S. Dept of Education Office for Civil Rights (OCR) — files complaints about discrimination under Section 504 and Title II.')
          )
        )
      );
    }

    if (sub === 'autism') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83E\uDDE9 Autism Spectrum Assessment'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Autism spectrum disorder (ASD) assessment is one of the more specialized evaluations in school psych practice. Gold-standard diagnosis requires ADOS-2 + ADI-R + cognitive + adaptive + language, typically taking 6+ hours. Many school teams triage with screening tools and refer complex cases to community clinics. This sub-view covers the instrument landscape, differential diagnosis, and the considerations that shape culturally-responsive, neurodiversity-informed practice.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-3' }, 'Instruments'),
          h('div', { className: 'space-y-2' },
            AUTISM_INSTRUMENTS.map(function(inst, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'flex justify-between items-baseline mb-1' },
                  h('span', { className: 'text-sm font-black text-sky-200' }, inst.name),
                  h('span', { className: 'text-xs text-sky-400 italic ml-2' }, 'Age ' + inst.age)
                ),
                h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-sky-300' }, 'What: '), inst.what),
                h('div', { className: 'text-xs text-slate-300 mb-1' }, h('strong', { className: 'text-sky-300' }, 'Time: '), inst.time),
                h('div', { className: 'text-xs text-slate-300' }, h('strong', { className: 'text-sky-300' }, 'Who administers: '), inst.requires)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-3' }, 'Differential diagnosis'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Autism shares features with several conditions. Getting the differential right shapes intervention choices and family understanding. Co-occurrence is very common and not mutually exclusive.'),
          h('div', { className: 'space-y-2' },
            AUTISM_DIFFERENTIAL_KEY.map(function(d, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-amber-200 mb-1' }, 'vs. ' + d.condition),
                h('div', { className: 'text-xs text-slate-300 mb-1' }, h('strong', { className: 'text-amber-300' }, 'Overlap: '), d.overlap),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, h('strong', { className: 'text-emerald-300' }, 'Differentiator: '), d.differentiator)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-sky-900/40 to-indigo-900/40 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-200 mb-3' }, 'Considerations that shape practice'),
          h('div', { className: 'space-y-2' },
            AUTISM_CONSIDERATIONS.map(function(c, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-sky-200 mb-1' }, c.theme),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, c.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-slate-500/30' },
          h('h3', { className: 'text-sm font-black text-slate-200 mb-2' }, 'Resources for going deeper'),
          h('ul', { className: 'text-xs text-slate-300 space-y-1 list-disc list-inside' },
            h('li', null, 'Autism Diagnostic Observation Schedule-2 technical manual (WPS).'),
            h('li', null, 'Lord, C., & Jones, R. M. — research on gender and autism diagnosis.'),
            h('li', null, 'Autistic Self Advocacy Network (ASAN) — autisticadvocacy.org. Position statements, resources, language guidance.'),
            h('li', null, 'Autism Society of America — advocacy, resources, family support.'),
            h('li', null, 'Jessica Silvestrini, Devon Price, Temple Grandin — autistic voices writing on autistic experience.')
          )
        )
      );
    }

    if (sub === 'adhd') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\u26A1 ADHD Assessment'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'ADHD is one of the most common childhood neurodevelopmental conditions (5-9% of school-age children). It is also one of the most commonly misunderstood, underdiagnosed (especially in girls, Black students, inattentive-only), and misdiagnosed (when anxiety, trauma, or sleep issues are missed). Good ADHD assessment is multi-source, multi-method, and attends to culture and context.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-3' }, 'DSM-5 diagnostic criteria'),
          h('div', { className: 'space-y-2' },
            ADHD_DSM_CRITERIA.map(function(c, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-sky-200 mb-1' }, c.element),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, c.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'Instruments'),
          h('div', { className: 'space-y-2' },
            ADHD_INSTRUMENTS.map(function(inst, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, inst.name),
                h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-purple-300' }, 'What: '), inst.what),
                h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-emerald-300' }, 'Strengths: '), inst.strengths),
                inst.limits && h('div', { className: 'text-xs text-slate-300' }, h('strong', { className: 'text-amber-300' }, 'Limits: '), inst.limits)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-3' }, 'Differential diagnosis'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Concentration problems are a final common pathway for many conditions. Getting the differential right protects students from misdiagnosis and directs intervention.'),
          h('div', { className: 'space-y-2' },
            ADHD_DIFFERENTIAL_KEY.map(function(d, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-amber-200 mb-1' }, 'vs. ' + d.condition),
                h('div', { className: 'text-xs text-slate-300 mb-1' }, h('strong', { className: 'text-amber-300' }, 'Overlap: '), d.overlap),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, h('strong', { className: 'text-emerald-300' }, 'Differentiator: '), d.differentiator)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-sky-900/40 to-purple-900/40 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-200 mb-3' }, 'Presentation across populations'),
          h('div', { className: 'space-y-2' },
            ADHD_PRESENTATION_NOTES.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-sky-200 mb-1' }, p.group),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-emerald-900/30 border border-emerald-500/40' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-3' }, 'Treatment framework'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'ADHD intervention is multimodal. Best outcomes come from combining approaches. School psychologists do not prescribe medication but should understand the full treatment landscape to advocate effectively for students and families.'),
          h('div', { className: 'space-y-2' },
            ADHD_TREATMENT_FRAMEWORK.map(function(t, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-emerald-200 mb-1' }, t.domain),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, t.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-slate-500/30' },
          h('h3', { className: 'text-sm font-black text-slate-200 mb-2' }, 'Key resources'),
          h('ul', { className: 'text-xs text-slate-300 space-y-1 list-disc list-inside' },
            h('li', null, 'CHADD (Children and Adults with Attention-Deficit/Hyperactivity Disorder) — chadd.org. Family resources, parent training directories, advocacy.'),
            h('li', null, 'American Academy of Pediatrics ADHD Clinical Practice Guideline (2019).'),
            h('li', null, 'Barkley, R. A. — major researcher and clinician. Books on adult ADHD and executive function.'),
            h('li', null, 'Russell Ramsay — CBT for adult ADHD.'),
            h('li', null, 'Smart but Scattered series (Peg Dawson, Richard Guare) — executive function skill building for kids and teens.')
          )
        )
      );
    }

    if (sub === 'interviewing') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDDE3\uFE0F Clinical Interviewing Skills'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'The interview is often the most information-rich part of an evaluation — when done well. It\'s also the hardest to teach. Good interviewing is a skill developed through practice, supervision, and self-reflection. This sub-view covers the frameworks that shape effective interviewing: the purposes, the developmental considerations, the micro-skills, and the most common pitfalls.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-3' }, '5 purposes of the clinical interview'),
          h('div', { className: 'space-y-2' },
            INTERVIEW_PURPOSES.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-sky-200 mb-1' }, (i + 1) + '. ' + p.purpose),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'Interviewing by age'),
          h('div', { className: 'space-y-2' },
            INTERVIEW_BY_AGE.map(function(a, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, a.age),
                h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-purple-300' }, 'Approach: '), a.approach),
                h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-emerald-300' }, 'Tips: '), a.tips)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-sky-900/40 to-indigo-900/40 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-200 mb-3' }, 'Motivational Interviewing micro-skills'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'MI was developed for therapy contexts but the micro-skills travel well to assessment interviews. These five concepts reduce resistance and increase genuine disclosure.'),
          h('div', { className: 'space-y-2' },
            INTERVIEW_MI_BASICS.map(function(m, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-sky-200 mb-1' }, m.concept),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, m.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-rose-900/30 border border-rose-500/40' },
          h('h3', { className: 'text-sm font-black text-rose-300 mb-3' }, 'Trauma-sensitive rules'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Given trauma prevalence (see Trauma-Informed Assessment sub-view), these rules apply to essentially any student interview. They protect the student and the data integrity.'),
          h('div', { className: 'space-y-2' },
            INTERVIEW_TRAUMA_SENSITIVE.map(function(t, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-rose-200 mb-1' }, t.rule),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, t.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-3' }, '6 common pitfalls'),
          h('div', { className: 'space-y-2' },
            INTERVIEW_PITFALLS_CLINICAL.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-amber-200 mb-1' }, (i + 1) + '. ' + p.pitfall),
                h('div', { className: 'text-xs text-slate-300 mb-1' }, h('strong', { className: 'text-amber-300' }, 'Why it hurts: '), p.problem),
                h('div', { className: 'text-xs text-slate-100' }, h('strong', { className: 'text-emerald-300' }, 'Fix: '), p.fix)
              );
            })
          )
        )
      );
    }

    if (sub === 'culturally') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83C\uDF0D Culturally Responsive Assessment'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Every assessment tool was developed on a particular population, usually dominated by English-speaking, middle-class, US-born participants. When applied to students from other backgrounds, those tools can systematically misrepresent student ability, pathologize cultural difference, or miss disability that presents in culturally-specific ways. Cultural responsiveness isn\'t a checkbox or a "accommodation" — it\'s a stance that shapes every part of the assessment process.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-3' }, '8 core principles'),
          h('div', { className: 'space-y-2' },
            CRA_PRINCIPLES.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-sky-200 mb-1' }, (i + 1) + '. ' + p.title),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'Considerations for specific populations'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'These are starting points, not stereotypes. Every student and family is an individual; within-group variability is always larger than between-group variability. Use these notes as hypotheses to check against the specific family in front of you.'),
          h('div', { className: 'space-y-2' },
            CRA_POPULATIONS.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-purple-200 mb-2' }, p.group),
                h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-purple-300' }, 'Considerations: '), p.considerations),
                h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-emerald-300' }, 'Practices: '), p.practices)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-sky-900/40 to-indigo-900/40 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-200 mb-3' }, 'Working with interpreters'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Interpreter-mediated evaluations are legally required when families\' primary language isn\'t English. They are also skill-intensive — done poorly, they introduce error and harm trust. These 7 practices are the standard of care.'),
          h('div', { className: 'space-y-2' },
            CRA_INTERPRETER_PRACTICES.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-sky-200 mb-1' }, (i + 1) + '. ' + p.practice),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-emerald-900/30 border border-emerald-500/40' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-2' }, 'Going deeper'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'Key references: APA Multicultural Guidelines (2017, revised periodically). NASP Position Statement on Racial and Social Justice. Ortiz et al., Essentials of Cross-Battery Assessment (culturally and linguistically informed chapters). Rhodes, Ochoa, and Ortiz, Assessing Culturally and Linguistically Diverse Students. DSM-5-TR Cultural Formulation Interview (free, accessible, practical). The GRASP model (Gomez & Acevedo) for Hispanic/Latino evaluation. Ongoing training through NASP continuing education and specialized workshops.')
        )
      );
    }

    if (sub === 'handout') {
      var hStudent = s.handoutStudent || '';
      var hGrade = s.handoutGrade || '';
      var hFindings = s.handoutFindings || '';
      var hEligibility = s.handoutEligibility || '';
      var hRecs = s.handoutRecs || '';
      var hTone = s.handoutTone || 'warm';
      var hOut = s.handoutOutput || '';
      var hLoading = s.handoutLoading;
      var toneObj = HANDOUT_TONE_OPTIONS.find(function(t) { return t.id === hTone; });
      var toneDesc = toneObj ? (toneObj.label + ' — ' + toneObj.desc) : '';

      var genHandout = function() {
        if (!callGemini) { addToast({ message: 'AI unavailable', type: 'error' }); return; }
        if (!hStudent || !hFindings) { addToast({ message: 'Please provide at least student name and key findings.', type: 'warning' }); return; }
        upd({ handoutLoading: true, handoutOutput: '' });
        Promise.resolve(callGemini(buildParentHandoutPrompt(hStudent, hGrade || 'grade level not specified', hFindings, hEligibility, hRecs, toneDesc), false, false, 0.5, null))
          .then(function(resp) {
            var text = (typeof resp === 'string') ? resp : (resp && resp.text ? resp.text : String(resp));
            upd({ handoutLoading: false, handoutOutput: text });
            announceSR('Parent handout generated');
          })
          .catch(function(e) {
            upd({ handoutLoading: false, handoutOutput: 'Error: ' + (e && e.message ? e.message : 'unknown') });
          });
      };

      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDCDD Parent Handout Generator'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Parents often receive a dense eval report and a 90-minute team meeting. Many walk out unsure what it means for their child. This tool generates a warm, plain-language handout translating the findings into practical information, strengths-first framing, and questions parents can bring back to the team. Output is a draft for you to review and personalize, not an unedited final product.'),

        h('div', { className: 'p-3 rounded bg-amber-900/30 border border-amber-500/40 text-xs text-amber-100' },
          h('strong', null, 'Privacy note: '), 'Do NOT include identifying information (real names, birth dates, exact scores tied to identity) if you\'re concerned about transmission to the AI provider. Use pseudonyms and generalized findings. This is educational draft output, not the final handout you\'d send home.'
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30 space-y-3' },
          h('h3', { className: 'text-sm font-black text-sky-300' }, 'Inputs'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
            h('div', null,
              h('label', { className: 'text-xs font-bold text-sky-300 mb-1 block' }, 'Student first name / pseudonym'),
              h('input', {
                type: 'text', value: hStudent,
                onChange: function(e) { upd({ handoutStudent: e.target.value }); },
                placeholder: 'e.g., Malia or "Student M"',
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
              })
            ),
            h('div', null,
              h('label', { className: 'text-xs font-bold text-sky-300 mb-1 block' }, 'Grade / age'),
              h('input', {
                type: 'text', value: hGrade,
                onChange: function(e) { upd({ handoutGrade: e.target.value }); },
                placeholder: 'e.g., "3rd grade" or "age 8"',
                className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
              })
            )
          ),
          h('div', null,
            h('label', { className: 'text-xs font-bold text-sky-300 mb-1 block' }, 'Key findings (strengths and concerns)'),
            h('textarea', {
              value: hFindings,
              onChange: function(e) { upd({ handoutFindings: e.target.value }); },
              placeholder: 'Summarize the eval findings in professional terms. Examples: "Strong verbal reasoning (VCI 118). Below-average phonological processing (CTOPP-2 SS 78). Age-appropriate math achievement. Teacher reports classroom struggle with reading passages but strong oral participation."',
              rows: 5,
              className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100 font-sans leading-relaxed'
            })
          ),
          h('div', null,
            h('label', { className: 'text-xs font-bold text-sky-300 mb-1 block' }, 'Eligibility determination (if any)'),
            h('input', {
              type: 'text', value: hEligibility,
              onChange: function(e) { upd({ handoutEligibility: e.target.value }); },
              placeholder: 'e.g., "SLD in basic reading skills (dyslexia profile)"',
              className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100'
            })
          ),
          h('div', null,
            h('label', { className: 'text-xs font-bold text-sky-300 mb-1 block' }, 'Key recommendations'),
            h('textarea', {
              value: hRecs,
              onChange: function(e) { upd({ handoutRecs: e.target.value }); },
              placeholder: 'e.g., "Tier 3 systematic phonics intervention 30 min/day 5x/week (Wilson or similar). Extended time on reading tasks. Weekly DIBELS ORF progress monitoring. Consider co-occurring anxiety screening given avoidance behaviors."',
              rows: 3,
              className: 'w-full p-2 rounded bg-slate-900/60 border border-slate-600 text-xs text-slate-100 font-sans leading-relaxed'
            })
          ),
          h('div', null,
            h('label', { className: 'text-xs font-bold text-sky-300 mb-1 block' }, 'Tone'),
            h('div', { className: 'grid grid-cols-2 gap-2' },
              HANDOUT_TONE_OPTIONS.map(function(opt) {
                var sel = hTone === opt.id;
                return h('button', {
                  key: opt.id,
                  onClick: function() { upd({ handoutTone: opt.id }); },
                  className: 'text-left p-2 rounded border-2 transition text-xs focus:ring-2 focus:ring-sky-400 focus:outline-none ' + (sel ? 'bg-sky-900/50 border-sky-400 text-sky-100' : 'bg-slate-900/40 border-slate-600 text-slate-200 hover:border-sky-500/50')
                },
                  h('div', { className: 'text-xs font-bold' }, opt.label),
                  h('div', { className: 'text-xs opacity-80' }, opt.desc)
                );
              })
            )
          ),
          h('button', {
            onClick: genHandout,
            disabled: hLoading || !hStudent || !hFindings,
            className: 'w-full py-2 rounded-xl font-bold text-sm no-print ' + (hLoading || !hStudent || !hFindings ? 'bg-slate-700 text-slate-400' : 'bg-sky-600 text-white hover:bg-sky-500')
          }, hLoading ? 'Generating…' : '\u2728 Generate parent handout')
        ),

        hOut && h('section', { className: 'p-4 rounded-xl bg-slate-900/60 border border-emerald-500/30' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-2' }, 'Draft handout'),
          h('pre', { className: 'text-sm text-slate-100 whitespace-pre-wrap font-sans leading-relaxed p-3 rounded bg-slate-800/60 border border-slate-600' }, hOut),
          h('div', { className: 'mt-3 space-y-2 no-print' },
            h('div', { className: 'text-xs text-slate-300 italic' }, 'Review the draft carefully. Personalize for the specific family. Check for accuracy against your full eval report. Adjust tone as needed.'),
            h('div', { className: 'flex gap-2' },
              h('button', { onClick: genHandout, className: 'flex-1 py-2 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-600' }, '\uD83D\uDD04 Regenerate'),
              h('button', { onClick: function() { window.print && window.print(); }, className: 'flex-1 py-2 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-500' }, '\uD83D\uDDA8 Print / Save as PDF')
            )
          )
        )
      );
    }

    if (sub === 'screening') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDD0D Universal Mental Health Screening'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Universal mental health screening means routinely administering brief validated measures to ALL students (or a grade cohort) to identify those needing Tier 2 or Tier 3 mental health supports before crisis. It is the mental health parallel of academic universal screening in MTSS. Implemented well, it catches students who would otherwise be missed. Implemented poorly, it creates more problems than it solves.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-3' }, '8 screening tools for school settings'),
          h('div', { className: 'space-y-2' },
            UNIVERSAL_SCREENING_TOOLS.map(function(t, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'flex justify-between mb-1' },
                  h('span', { className: 'text-xs font-black text-sky-200' }, t.name),
                  h('span', { className: 'text-xs text-sky-400 italic' }, t.age)
                ),
                h('div', { className: 'text-xs text-slate-300 mb-1' }, h('strong', { className: 'text-sky-300' }, 'Format: '), t.format + ' · ', h('em', null, t.time)),
                h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-sky-300' }, 'What: '), t.what),
                h('div', { className: 'text-xs text-slate-300' }, h('strong', { className: 'text-sky-300' }, 'Cost: '), t.cost)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-3' }, '8 implementation considerations'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Before launching universal screening, the team must answer each of these. Skipping them produces screening programs that generate data the district cannot responsibly act on.'),
          h('div', { className: 'space-y-2' },
            UNIVERSAL_SCREENING_CONSIDERATIONS.map(function(c, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-amber-200 mb-1' }, (i + 1) + '. ' + c.topic),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, c.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-emerald-900/30 border border-emerald-500/40' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-2' }, 'A sustainable model'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'Best-practice districts: screen 2-3 times per year, match screener to Tier of MTSS (universal brief screener at Tier 1, more detailed at Tier 2, comprehensive at Tier 3), embed in regular data meetings, pair with clear response protocols that span school-based services AND community referrals, communicate transparently with families. Several state health departments (Ohio, Washington, Massachusetts) have published implementation toolkits. NASP and SAMHSA maintain updated guidance.')
        )
      );
    }

    if (sub === 'crisis') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDEA8 Crisis / Suicide Risk Assessment'),
        h('div', { className: 'p-3 rounded bg-rose-900/40 border border-rose-500/40 text-xs text-rose-100' },
          h('strong', null, 'Crisis resources: '), 'US: 988 Suicide and Crisis Lifeline (call or text). Trevor Project (LGBTQ+ youth, ages 13-24): 1-866-488-7386 or text START to 678-678. Crisis Text Line: text HOME to 741741. If anyone you know is in imminent danger, call 911 or get them to an emergency department.'
        ),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Suicide is the second leading cause of death among ages 10-14 and ages 15-24 in the US. School staff are often first to notice warning signs and are a critical link in the prevention chain. This sub-view covers evidence-based screening tools, warning sign tiers, and the step-by-step protocol when a student presents with suicidal ideation.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-3' }, 'Evidence-based screeners'),
          h('div', { className: 'space-y-2' },
            CRISIS_SCREENERS.map(function(s, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'flex justify-between mb-1' },
                  h('span', { className: 'text-xs font-black text-sky-200' }, s.name),
                  h('span', { className: 'text-xs text-sky-400 italic' }, s.age)
                ),
                h('div', { className: 'text-xs text-slate-300 mb-1' }, h('strong', { className: 'text-sky-300' }, 'Time: '), s.time),
                h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-sky-300' }, 'What: '), s.what),
                h('div', { className: 'text-xs text-slate-300' }, h('strong', { className: 'text-sky-300' }, 'Free/Open: '), s.free)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-3' }, 'Warning signs by risk tier'),
          h('div', { className: 'space-y-2' },
            CRISIS_WARNING_SIGNS.map(function(w, i) {
              var color = i === 0 ? 'rose' : i === 1 ? 'orange' : i === 2 ? 'amber' : 'yellow';
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60 border-l-4 border-' + color + '-500' },
                h('div', { className: 'text-xs font-black text-' + color + '-200 mb-1' }, w.tier),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, w.signs)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, '8-step crisis response protocol'),
          h('ol', { className: 'space-y-2' },
            CRISIS_PROTOCOL.map(function(p) {
              return h('li', { key: p.step, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, 'Step ' + p.step + '. ' + p.name),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-rose-900/40 to-pink-900/40 border border-rose-500/30' },
          h('h3', { className: 'text-sm font-black text-rose-200 mb-3' }, 'Ethical and practical notes'),
          h('div', { className: 'space-y-2' },
            CRISIS_ETHICAL_NOTES.map(function(n, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-rose-200 mb-1' }, n.title),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, n.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-slate-500/30' },
          h('h3', { className: 'text-sm font-black text-slate-200 mb-2' }, 'Training recommendation'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Reading about suicide risk assessment is not the same as being trained to conduct it. For any school staff who may encounter these situations, formal training is essential: QPR (Question, Persuade, Refer — basic gatekeeper), SafeTALK, ASIST (Applied Suicide Intervention Skills Training), Columbia Protocol training. NASP and AFSP maintain lists of evidence-based trainings. Your district may have training requirements; if not, request them.')
        )
      );
    }

    if (sub === 'iepmeeting') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83E\uDD1D IEP Team Meeting Facilitation'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'An IEP meeting is the most consequential single event in special education — the legal setting where eligibility, goals, services, and placement are decided. Done well, it builds family trust, keeps focus on the student, and produces a plan everyone can execute. Done poorly, it damages relationships for years, creates compliance exposure, and produces IEPs that sit in binders. Facilitation is a learnable skill. Here is the whole arc.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-3' }, 'Before the meeting: 5-step prep'),
          h('div', { className: 'space-y-2' },
            IEP_MEETING_PREP.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-sky-200 mb-1' }, (i + 1) + '. ' + p.step),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'The 10-phase meeting structure'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Typical annual review: 60-90 minutes. Eligibility: 90-120 minutes. Transition or contested: 2-3 hours. Allow time.'),
          h('div', { className: 'space-y-2' },
            IEP_MEETING_STRUCTURE.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, p.phase),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-rose-900/30 border border-rose-500/40' },
          h('h3', { className: 'text-sm font-black text-rose-300 mb-3' }, 'Difficult conversations'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Most IEP meetings are routine. A few are genuinely hard. Here is how to handle the hardest ones.'),
          h('div', { className: 'space-y-2' },
            IEP_DIFFICULT_CONVERSATIONS.map(function(d, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-rose-200 mb-1' }, d.situation),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, d.approach)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-emerald-900/30 border border-emerald-500/40' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-3' }, '8 facilitation skills'),
          h('ul', { className: 'text-xs text-slate-200 space-y-2 list-disc list-inside' },
            IEP_FACILITATION_SKILLS.map(function(s, i) {
              return h('li', { key: i, className: 'leading-relaxed' }, s);
            })
          )
        ),

        h('div', { className: 'no-print' },
          h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-sky-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print IEP meeting facilitation guide')
        )
      );
    }

    if (sub === 'trauma') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDC96 Trauma-Informed Assessment'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Studies estimate 30-45% of school-aged children have experienced at least one adverse childhood event. For many evaluated for other concerns, trauma is a hidden or co-occurring contributor that shapes behavior, attention, memory, learning, and social-emotional functioning. Trauma-informed assessment recognizes this possibility and structures evaluation to surface what matters without causing harm.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-3' }, 'How trauma presents across ages'),
          h('div', { className: 'space-y-2' },
            TRAUMA_PRESENTATIONS.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-sky-200 mb-1' }, p.age),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.signs)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-amber-500/30' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-3' }, 'Differential diagnosis'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Trauma presentations overlap with many common educational-mental-health referral questions. Missing the trauma context leads to treatment mismatches (stimulants for "ADHD" that\'s actually trauma-based hypervigilance; behavior plans for "ODD" that\'s actually a trauma response).'),
          h('div', { className: 'space-y-2' },
            TRAUMA_DIFFERENTIAL.map(function(d, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-amber-200 mb-1' }, 'Trauma mimics: ' + d.mimics),
                h('div', { className: 'text-xs text-slate-300 mb-1' }, h('strong', { className: 'text-amber-300' }, 'Overlap: '), d.overlap),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, h('strong', { className: 'text-emerald-300' }, 'Differentiator: '), d.differentiator)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'Screening tools'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Screening is different from diagnosis. These tools flag potential areas for follow-up. Diagnostic assessment of PTSD and trauma disorders is the province of trained clinicians, typically working in community mental health.'),
          h('div', { className: 'space-y-2' },
            TRAUMA_SCREENING_TOOLS.map(function(t, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'flex justify-between mb-1' },
                  h('span', { className: 'text-xs font-black text-purple-200' }, t.name),
                  h('span', { className: 'text-xs text-purple-400 italic' }, t.age)
                ),
                h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-purple-300' }, 'What: '), t.what),
                h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-purple-300' }, 'Use: '), t.use)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-rose-900/40 to-pink-900/40 border border-rose-500/30' },
          h('h3', { className: 'text-sm font-black text-rose-200 mb-3' }, '8 principles for trauma-informed assessment'),
          h('div', { className: 'space-y-2' },
            TRAUMA_PRINCIPLES.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-rose-200 mb-1' }, (i + 1) + '. ' + p.principle),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-slate-500/30' },
          h('h3', { className: 'text-sm font-black text-slate-200 mb-2' }, 'A note on scope'),
          h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'School psychologists screen; trained trauma clinicians treat. A thoughtful school-based trauma-informed evaluation identifies whether trauma may be contributing to presenting concerns, flags the need for clinical referral, and shapes school-based supports (crisis plans, trauma-informed classroom accommodations, safe-adult designations) without becoming trauma therapy. Many students benefit from BOTH school-based supports and community trauma therapy simultaneously.')
        )
      );
    }

    if (sub === 'transition') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83C\uDF9F\uFE0F Transition Planning (Age 16+)'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'The IEP transforms at age 16 (some states younger). It stops being primarily about academic services during school and starts including planning for what happens after school. This is when IEPs get serious about postsecondary goals, independent living, employment, and linkages to adult services. Done well, transition planning changes lives. Done poorly, it\'s a paperwork compliance exercise that leaves students unprepared.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-3' }, 'IDEA transition requirements'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Required by federal law (IDEA 2004, 20 U.S.C. § 1414(d)(1)(A)(i)(VIII)). Must be in effect by the IEP in effect when the student turns 16 (some states: younger).'),
          h('div', { className: 'space-y-2' },
            TRANSITION_REQUIREMENTS.map(function(r, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-sky-200 mb-1' }, (i + 1) + '. ' + r.component),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, r.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-3' }, 'Transition assessment domains'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Postsecondary goals must be based on "age-appropriate transition assessments." Best practice: assess across all 6 domains over the course of high school, with updates annually.'),
          h('div', { className: 'space-y-2' },
            TRANSITION_ASSESSMENTS.map(function(a, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-emerald-200 mb-1' }, a.domain),
                h('div', { className: 'text-xs text-slate-200 mb-1' }, h('strong', { className: 'text-emerald-300' }, 'Tools: '), a.tools),
                h('div', { className: 'text-xs text-slate-200' }, h('strong', { className: 'text-emerald-300' }, 'Use: '), a.use)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'Postsecondary pathway options'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'A realistic picture of what\'s available after high school. Each comes with distinct service structures, application processes, and supports.'),
          h('div', { className: 'space-y-2' },
            TRANSITION_POSTSCHOOL_OPTIONS.map(function(o, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, o.option),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, o.considerations)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-sky-900/40 to-indigo-900/40 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-200 mb-3' }, '6 best practices'),
          h('div', { className: 'space-y-2' },
            TRANSITION_BEST_PRACTICES.map(function(b, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-sky-200 mb-1' }, (i + 1) + '. ' + b.title),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, b.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'Age of Majority — the rights transfer'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'At age 18 (in most states), educational rights transfer from parents to the student, UNLESS the student is under guardianship or has otherwise legally transferred these rights. This is huge. A parent who has been coordinating services for 12+ years suddenly has no legal authority in IEP decisions. Options: (1) the student continues making own decisions, possibly signing educational power of attorney to involve family; (2) supported decision-making agreements (growing legal alternative to guardianship); (3) guardianship or conservatorship (most restrictive — court-ordered, requires determination that the student cannot make decisions). Counsel families starting in 10th grade so they can decide thoughtfully, not at the last moment.')
        ),

        h('div', { className: 'no-print' },
          h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-sky-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print transition planning guide')
        )
      );
    }

    if (sub === 'fba') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDD0E Functional Behavior Assessment (FBA) + BIP'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'FBA is the evidence-based methodology for understanding WHY a problem behavior occurs so an intervention plan can address the same function the behavior serves. A behavior that "gets attention" needs a replacement behavior that also gets attention — just more appropriately. This is one of the most important and frequently-done assessments in school psychology.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-3' }, 'The 6-step FBA process'),
          h('ol', { className: 'space-y-2' },
            FBA_STEPS.map(function(st) {
              return h('li', { key: st.step, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-sky-200 mb-1' }, 'Step ' + st.step + '. ' + st.name),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, st.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'The 4 functions of behavior'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Any problem behavior serves one or more of these basic functions. Identifying the function(s) is the central insight of FBA — it tells you what the replacement behavior must accomplish.'),
          h('div', { className: 'space-y-2' },
            FBA_FUNCTIONS.map(function(f, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, f.name),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed mb-1' }, f.desc),
                h('div', { className: 'text-xs text-slate-300 italic' }, h('strong', { className: 'text-purple-300 not-italic' }, 'Observable clues: '), f.clue)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-3' }, 'Behavior Intervention Plan (BIP) components'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'A BIP derives from the FBA findings. It should be function-based and data-driven. Here are the 8 required elements of a well-built BIP.'),
          h('ol', { className: 'space-y-2' },
            BIP_COMPONENTS.map(function(c, i) {
              return h('li', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-emerald-200 mb-1' }, (i + 1) + '. ' + c.name),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, c.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'Common FBA/BIP failures'),
          h('ul', { className: 'text-xs text-slate-200 space-y-1 list-disc list-inside' },
            h('li', null, h('strong', null, 'Non-functional BIP: '), '"The student will stop yelling." This is the problem restated, not a function-based plan. What function does the yelling serve? What replacement behavior accomplishes the same function?'),
            h('li', null, h('strong', null, 'Single-setting data: '), 'Observations only in one classroom yield a partial picture. Behavior often serves different functions in different contexts.'),
            h('li', null, h('strong', null, 'Punishment-heavy plans: '), 'Plans that rely primarily on negative consequences without FERB instruction fail to teach the student WHAT to do. The behavior was meeting a need; removing it without a replacement leaves the need unmet.'),
            h('li', null, h('strong', null, 'No fidelity monitoring: '), 'Teams assume staff will implement the plan as written. Without observation and coaching, fidelity drifts quickly. Plan should specify: who observes implementation, how often, what gets coached.'),
            h('li', null, h('strong', null, 'Student voice absent: '), 'Older students especially should be asked: "What\'s hard about this situation? What would help?" Their self-reports often identify antecedents adults miss.')
          )
        )
      );
    }

    if (sub === 'goals') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83C\uDFAF IEP Goal Writing'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'A well-written IEP goal is the difference between a plan that produces growth and a plan that produces paperwork. Parents can advocate with them; teachers can implement them; the team can evaluate progress. Here\'s how to write goals that actually work.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-3' }, 'SMART criteria'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-5 gap-2' },
            SMART_CRITERIA.map(function(c, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60 border border-sky-500/20' },
                h('div', { className: 'text-2xl font-black text-sky-300 mb-1' }, c.letter),
                h('div', { className: 'text-xs font-bold text-sky-200 mb-1' }, c.word),
                h('div', { className: 'text-xs text-slate-300 leading-relaxed' }, c.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'The 6-part goal structure'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Build goals from these 6 parts. The combined example at the end shows how they flow into one sentence.'),
          h('div', { className: 'space-y-2' },
            GOAL_STRUCTURE.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, p.part),
                h('div', { className: 'text-xs text-slate-200 mb-1' }, p.desc),
                h('div', { className: 'text-xs text-slate-400 italic' }, 'Example: ' + p.example)
              );
            })
          ),
          h('div', { className: 'mt-3 p-3 rounded bg-gradient-to-r from-purple-900/40 to-sky-900/40 border border-purple-500/40' },
            h('div', { className: 'text-xs font-black text-purple-200 mb-1' }, 'Complete example:'),
            h('div', { className: 'text-xs text-slate-100 leading-relaxed italic' }, '"Given a grade-level informational passage and a graphic organizer, Priya will identify the main idea and 2 supporting details with 80% accuracy across 4 of 5 consecutive weekly probes by the end of the IEP year."')
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-emerald-500/30' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-3' }, 'Sample goals by domain'),
          h('div', { className: 'space-y-2' },
            SAMPLE_GOALS.map(function(g, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-emerald-200 mb-1' }, g.domain),
                h('div', { className: 'text-xs text-slate-100 leading-relaxed mb-1' }, g.goal),
                h('div', { className: 'text-xs text-slate-400 italic' }, g.notes)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-rose-900/30 border border-rose-500/40' },
          h('h3', { className: 'text-sm font-black text-rose-300 mb-3' }, 'Common pitfalls with fixes'),
          h('div', { className: 'space-y-2' },
            GOAL_PITFALLS.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-rose-200 mb-1' }, (i + 1) + '. ' + p.pitfall),
                h('div', { className: 'text-xs text-slate-300 mb-1' }, h('strong', { className: 'text-rose-300' }, 'Weak: '), h('span', { className: 'italic' }, p.bad)),
                h('div', { className: 'text-xs text-slate-100' }, h('strong', { className: 'text-emerald-300' }, 'Stronger: '), p.better)
              );
            })
          )
        ),

        h('div', { className: 'no-print' },
          h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-sky-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print goal-writing guide')
        )
      );
    }

    if (sub === 'reportwrite') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\u270F\uFE0F Writing the Psych Report'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Reading a report is covered in another sub-view. This one is about writing one. A well-written psychoeducational report is a piece of clinical writing that will be read by parents, teachers, advocates, future evaluators, attorneys, and one day the student themselves. Treat the craft seriously.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-3' }, '10 principles for report writing'),
          h('div', { className: 'space-y-2' },
            REPORT_WRITING_PRINCIPLES.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-sky-200 mb-1' }, (i + 1) + '. ' + p.title),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-purple-500/30' },
          h('h3', { className: 'text-sm font-black text-purple-300 mb-3' }, 'Integration section patterns'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'The "Integration" or "Interpretation" section is where clinical reasoning shows. These five patterns cover most of what you\'ll need for a typical psychoeducational report.'),
          h('div', { className: 'space-y-3' },
            REPORT_INTEGRATION_PATTERNS.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-purple-200 mb-2' }, (i + 1) + '. ' + p.name),
                h('div', { className: 'text-xs text-slate-100 leading-relaxed italic' }, p.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'Language choices that matter'),
          h('ul', { className: 'text-xs text-slate-200 space-y-1 list-disc list-inside' },
            h('li', null, 'Use person-first OR identity-first language per family preference. Ask. Don\'t default.'),
            h('li', null, 'Describe behaviors, not characters. "Yelled at teacher" not "was defiant."'),
            h('li', null, 'Separate observation from inference. "I observed X" vs "X suggests Y."'),
            h('li', null, 'Avoid "parent denies/alleges" (legal framing). Use "parent reported" or "according to parent."'),
            h('li', null, 'Avoid "failed to" (implies moral failure). Use "did not" or "was unable to given [constraint]."'),
            h('li', null, 'When reporting cognitive or achievement data, couple with context ("this score, along with classroom observations, suggests..."). Standalone numbers are easy to misread.')
          )
        ),

        h('div', { className: 'no-print' },
          h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-sky-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print report-writing guide')
        )
      );
    }

    if (sub === 'formative') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDCCA Formative & Alternative Assessment'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Standardized testing has its place. So do other forms of assessment. Progress monitoring, performance assessment, dynamic assessment, and habits-of-learning frameworks capture dimensions of student development that single-point standardized batteries miss. These methods are especially important for disabled students, English language learners, and students whose standardized performance systematically underestimates their abilities.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-3' }, '7 alternative / formative methods'),
          h('div', { className: 'space-y-3' },
            FORMATIVE_METHODS.map(function(m, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'flex items-baseline justify-between mb-1' },
                  h('div', { className: 'text-sm font-black text-sky-200' }, m.name),
                  h('span', { className: 'text-xs text-sky-400 italic ml-2' }, m.type)
                ),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed mb-2' }, m.desc),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2 mt-2' },
                  h('div', { className: 'p-2 rounded bg-emerald-900/20 border border-emerald-500/30' },
                    h('div', { className: 'text-xs font-black text-emerald-300 mb-1' }, '\u2713 Strengths'),
                    h('div', { className: 'text-xs text-slate-200' }, m.strengths)
                  ),
                  h('div', { className: 'p-2 rounded bg-amber-900/20 border border-amber-500/30' },
                    h('div', { className: 'text-xs font-black text-amber-300 mb-1' }, '\u26A0 Limits'),
                    h('div', { className: 'text-xs text-slate-200' }, m.weaknesses)
                  )
                )
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-sky-900/40 to-indigo-900/40 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-200 mb-3' }, 'Key principles'),
          h('div', { className: 'space-y-2' },
            FORMATIVE_PRINCIPLES.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-sky-200 mb-1' }, (i + 1) + '. ' + p.title),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, p.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-emerald-900/30 border border-emerald-500/40' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-2' }, 'For school psychologists'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed' }, 'A comprehensive psychoeducational evaluation is almost always standardized-heavy for a reason: eligibility decisions under IDEA rest on psychometrically defensible evidence. But a good school psych is fluent across the assessment spectrum. Dynamic assessment of a student hitting a WISC-V ceiling adds information the ceiling hides. Portfolio data from a teacher complements a CBM-based RTI record. Knowing HOWL rubrics at an EL Education school lets you interpret student and family descriptions of "what\'s going well" in the vocabulary the school is using. Alternative assessment makes your evaluations richer, your advocacy stronger, and your collaboration with teachers more grounded.')
        )
      );
    }

    if (sub === 'cases') {
      var selId = s.caseSelected;
      var selCase = selId ? CASE_VIGNETTES.find(function(c) { return c.id === selId; }) : null;
      var domains = s.caseDomains || [];
      var critique = s.caseCritique || '';
      var loading = s.caseLoading;

      var selectCase = function(id) {
        upd({ caseSelected: id, caseDomains: [], caseCritique: '' });
      };
      var toggleDomain = function(d) {
        var next = domains.slice();
        var ix = next.indexOf(d);
        if (ix >= 0) next.splice(ix, 1); else next.push(d);
        upd({ caseDomains: next, caseCritique: '' });
      };
      var runCritique = function() {
        if (!callGemini) { addToast({ message: 'AI unavailable', type: 'error' }); return; }
        if (!selCase) return;
        if (domains.length === 0) { addToast({ message: 'Select at least one assessment domain first.', type: 'warning' }); return; }
        upd({ caseLoading: true, caseCritique: '' });
        Promise.resolve(callGemini(buildCaseCritiquePrompt(selCase.id, domains), false, false, 0.5, null))
          .then(function(resp) {
            var text = (typeof resp === 'string') ? resp : (resp && resp.text ? resp.text : String(resp));
            upd({ caseLoading: false, caseCritique: text });
            announceSR('Case critique generated');
          })
          .catch(function(e) {
            upd({ caseLoading: false, caseCritique: 'Error: ' + (e && e.message ? e.message : 'unknown') });
          });
      };

      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDCCB Referral Case Vignettes'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Six realistic referral scenarios covering common eligibility profiles. Select a case, choose the assessment domains you\'d include in your eval plan, and get AI critique of your clinical reasoning. This is the classic training exercise for school psych grad students — now with instant feedback.'),

        h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
          CASE_VIGNETTES.map(function(c) {
            var selected = selId === c.id;
            return h('button', {
              key: c.id,
              onClick: function() { selectCase(c.id); },
              className: 'text-left p-3 rounded-lg border-2 transition focus:ring-2 focus:ring-sky-400 focus:outline-none ' + (selected ? 'bg-sky-900/50 border-sky-400' : 'bg-slate-800/60 border-slate-600 hover:border-sky-500/50')
            },
              h('div', { className: 'text-sm font-bold ' + (selected ? 'text-sky-100' : 'text-sky-200') }, c.title),
              h('div', { className: 'text-xs ' + (selected ? 'text-sky-200' : 'text-slate-400') }, c.student)
            );
          })
        ),

        selCase && h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-200 mb-2' }, 'Referral'),
          h('div', { className: 'text-xs text-slate-400 italic mb-2' }, selCase.student),
          h('p', { className: 'text-xs text-slate-100 leading-relaxed mb-3' }, selCase.referral),
          h('div', { className: 'text-xs text-slate-300 p-2 rounded bg-slate-900/60' }, h('strong', { className: 'text-sky-300' }, 'Prior intervention: '), selCase.tier2_3_response)
        ),

        selCase && h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-2' }, 'Your evaluation plan'),
          h('p', { className: 'text-xs text-slate-300 mb-3' }, 'Select the assessment domains you would include. Then get AI feedback on whether your plan matches the referral question.'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-2' },
            CASE_DOMAIN_OPTIONS.map(function(opt) {
              var sel = domains.indexOf(opt.id) >= 0;
              return h('button', {
                key: opt.id,
                onClick: function() { toggleDomain(opt.id); },
                'aria-pressed': sel,
                className: 'text-left p-2 rounded border-2 transition text-xs focus:ring-2 focus:ring-sky-400 focus:outline-none ' + (sel ? 'bg-sky-900/40 border-sky-400 text-sky-100' : 'bg-slate-900/40 border-slate-600 text-slate-200 hover:border-sky-500/50')
              }, (sel ? '\u2713 ' : '\u2610 ') + opt.name);
            })
          ),
          h('div', { className: 'flex items-center gap-3 mt-3 no-print' },
            h('button', {
              onClick: runCritique,
              disabled: loading || domains.length === 0,
              className: 'px-4 py-2 rounded-lg text-xs font-bold ' + (loading || domains.length === 0 ? 'bg-slate-700 text-slate-400' : 'bg-sky-600 text-white hover:bg-sky-500')
            }, loading ? 'Thinking…' : '\u2728 Get AI critique of my plan'),
            h('span', { className: 'text-xs text-slate-400' }, domains.length + ' / ' + CASE_DOMAIN_OPTIONS.length + ' domains selected')
          )
        ),

        critique && h('section', { className: 'p-4 rounded-xl bg-slate-900/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-2' }, 'AI Critique'),
          h('pre', { className: 'text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed' }, critique),
          h('div', { className: 'mt-3 p-3 rounded bg-slate-800/60 border border-emerald-500/30' },
            h('div', { className: 'text-xs font-black text-emerald-300 mb-1' }, 'Instructor reference — likely eligibility for this case:'),
            h('div', { className: 'text-xs text-slate-200' }, selCase && selCase.likely_eligibility)
          ),
          h('div', { className: 'mt-2 p-3 rounded bg-slate-800/60 border border-purple-500/30' },
            h('div', { className: 'text-xs font-black text-purple-300 mb-1' }, 'Evidence checklist for this case:'),
            h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, selCase && selCase.evidence_check)
          ),
          h('div', { className: 'mt-3 no-print' },
            h('button', { onClick: function() { window.print && window.print(); }, className: 'w-full py-2 rounded-lg bg-slate-800 border border-sky-500/40 text-white text-xs font-bold hover:bg-slate-700' }, '\uD83D\uDDA8 Print case + my plan + critique')
          )
        )
      );
    }

    if (sub === 'twoe') {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-3' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\u2728 Twice-Exceptional (2E) Identification'),
        h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'A twice-exceptional (2E) student is ', h('strong', { className: 'text-sky-200' }, 'both gifted AND has a disability'), '. These students are systematically under-identified because their ability masks their disability, their disability masks their ability, or averaging suppresses both. 2E is where single-score thinking fails most dramatically — and where psychometric literacy matters most for getting kids the support they need.'),

        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-300 mb-3' }, 'Common 2E profiles'),
          h('div', { className: 'space-y-2' },
            TWOE_PROFILES.map(function(p, i) {
              return h('div', { key: i, className: 'p-3 rounded-lg bg-slate-900/60 border border-sky-500/20' },
                h('div', { className: 'flex justify-between items-start mb-1' },
                  h('div', { className: 'text-sm font-black text-sky-200' }, p.label),
                  h('span', { className: 'text-xs text-sky-400 italic ml-2 flex-shrink-0' }, p.freq)
                ),
                h('div', { className: 'text-xs text-slate-200 mb-2' }, h('strong', { className: 'text-sky-300' }, 'How it presents: '), p.how),
                h('div', { className: 'text-xs text-slate-300 italic p-2 rounded bg-slate-800/60 border-l-2 border-sky-500/40' }, h('strong', { className: 'text-sky-300 not-italic' }, 'Example: '), p.example)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-rose-900/30 border border-rose-500/40' },
          h('h3', { className: 'text-sm font-black text-rose-300 mb-3' }, 'Identification challenges'),
          h('div', { className: 'space-y-2' },
            TWOE_ID_CHALLENGES.map(function(c, i) {
              return h('div', { key: i, className: 'p-3 rounded bg-slate-900/60' },
                h('div', { className: 'text-xs font-black text-rose-200 mb-1' }, (i + 1) + '. ' + c.title),
                h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, c.body)
              );
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-emerald-900/30 border border-emerald-500/40' },
          h('h3', { className: 'text-sm font-black text-emerald-300 mb-2' }, 'Assessment strategies for identifying 2E'),
          h('ol', { className: 'text-xs text-slate-200 space-y-2 list-decimal list-inside' },
            TWOE_ASSESSMENT_STRATEGIES.map(function(str, i) {
              return h('li', { key: i, className: 'leading-relaxed' }, str);
            })
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-gradient-to-br from-sky-900/40 to-indigo-900/40 border border-sky-500/30' },
          h('h3', { className: 'text-sm font-black text-sky-200 mb-2' }, 'IEP writing for 2E students — a pattern that works'),
          h('p', { className: 'text-xs text-slate-200 leading-relaxed mb-2' }, 'A well-written 2E IEP addresses BOTH profiles. Sample structure:'),
          h('ul', { className: 'text-xs text-slate-200 space-y-1 list-disc list-inside' },
            h('li', null, h('strong', { className: 'text-sky-300' }, 'Present Levels: '), 'explicitly name both the giftedness (e.g., "superior verbal reasoning and curiosity for complex content") AND the disability (e.g., "slow processing speed and phonological decoding deficits").'),
            h('li', null, h('strong', { className: 'text-sky-300' }, 'Goals: '), 'include BOTH remediation goals (e.g., reading fluency benchmarks) AND enrichment goals (e.g., access to advanced content in areas of strength).'),
            h('li', null, h('strong', { className: 'text-sky-300' }, 'Services: '), 'specialized instruction for the deficit + accommodations + enrichment time or curriculum compacting.'),
            h('li', null, h('strong', { className: 'text-sky-300' }, 'Accommodations: '), 'extended time for decoding-heavy tasks, assistive tech (text-to-speech, speech-to-text), access to above-grade content, flexible pacing.'),
            h('li', null, h('strong', { className: 'text-sky-300' }, 'Social-emotional: '), 'counseling or check-ins to address confusion about the profile, perfectionism, identity as a learner.')
          )
        ),

        h('section', { className: 'p-4 rounded-xl bg-amber-900/30 border border-amber-500/40' },
          h('h3', { className: 'text-sm font-black text-amber-300 mb-2' }, 'Resources'),
          h('ul', { className: 'text-xs text-slate-200 space-y-1 list-disc list-inside' },
            h('li', null, h('strong', null, 'National Association for Gifted Children (NAGC) '), '— position paper on 2E, resources for parents and teachers.'),
            h('li', null, h('strong', null, '2e Newsletter / 2e News '), '— ongoing content on twice-exceptional identification and education.'),
            h('li', null, h('strong', null, 'Council for Exceptional Children Division for Gifted Students '), '— professional community, research.'),
            h('li', null, h('strong', null, 'Flanagan, Ortiz, & Alfonso — Essentials of Cross-Battery Assessment '), '— the standard reference for CHC cross-battery that supports 2E identification.'),
            h('li', null, h('strong', null, 'Kaufman — Intelligent Testing with the WISC-V '), '— interpretation guide emphasizing profile analysis over FSIQ.')
          )
        )
      );
    }

    // School psych submenu
    var subs = [
      { id: 'rti', icon: '\uD83D\uDCCA', label: 'RTI / MTSS — The Support Pyramid', desc: 'Tier 1/2/3 structure, universal screening, Tier 3 nonresponder as referral trigger, common implementation failures.' },
      { id: 'sld', icon: '\uD83D\uDCDD', label: 'SLD Identification Methods', desc: 'Severe discrepancy vs. RTI-based vs. PSW. The 8 IDEA SLD academic areas.' },
      { id: 'psychoed', icon: '\uD83D\uDD2C', label: 'Psychoed Eval Components', desc: 'Cognitive, achievement, behavior, adaptive, EF, reading-specific, autism, trauma — matching domains to referral questions.' },
      { id: 'iep504', icon: '\u2696\uFE0F', label: '504 Plan vs. IEP', desc: 'Eligibility differences, what each provides, decision tree, common misunderstandings.' },
      { id: 'categories', icon: '\uD83D\uDCD6', label: 'The 13 IDEA Categories', desc: 'Click any category to see its federal definition and typical eval battery. Three-prong eligibility requirement explained.' },
      { id: 'eligibilitySort', icon: '\uD83C\uDFAF', label: 'Eligibility Sort \u2014 interactive', desc: '12 student-profile vignettes. Pick the IDEA category from the full 14-button grid (no narrow-by-elimination). Coaching after each answer names common misclassifications (SLD vs ED, OHI vs SLD, AU vs SLI, HI vs D).' },
      { id: 'report', icon: '\uD83D\uDCC4', label: 'How to Read a Psych Report', desc: 'Section-by-section anatomy, score conversion cheat sheet, what to watch for in each section.' },
      { id: 'sem', icon: '\uD83D\uDCCF', label: 'SEM & Confidence Interval Simulator', desc: 'Interactive sliders. See why a test score is a range, not a point. The single most important concept in psychometric consumption.' },
      { id: 'reliabilitySleuth', icon: '\uD83D\uDD75\uFE0F', label: 'Reliability Sleuth \u2014 interactive', desc: '10 vignettes. Each shows a real test, its reliability coefficient, and a use case. Decide \u2014 defensible, borderline, or insufficient. Coaching cites NASP / AERA / APA standards on reliability thresholds for high-stakes vs low-stakes decisions.' },
      { id: 'rights', icon: '\uD83D\uDD12', label: 'Parent Procedural Safeguards', desc: 'PWN, consent, IEE, records access, due process, mediation, stay-put, transition. When rights get violated and what to do.' },
      { id: 'twoe', icon: '\u2728', label: 'Twice-Exceptional (2E) Identification', desc: 'Gifted + disability. Why single-score thinking fails, masking in both directions, profile scatter, IEP writing that addresses both sides.' },
      { id: 'cases', icon: '\uD83D\uDCCB', label: 'Referral Case Vignettes', desc: 'Six realistic referral scenarios (SLD, ADHD/OHI, autism, 2E, ID borderline, ELL). Select the domains you\'d assess; AI critiques your evaluation plan.' },
      { id: 'fba', icon: '\uD83D\uDD0E', label: 'Functional Behavior Assessment (FBA) + BIP', desc: '6-step FBA methodology, 4 functions of behavior (attention/escape/tangible/sensory), 8-element Behavior Intervention Plan structure with FERB framework.' },
      { id: 'goals', icon: '\uD83C\uDFAF', label: 'IEP Goal Writing', desc: 'SMART criteria, 6-part goal structure (given/student/behavior/criterion/measurement/timeline), 7 sample goals across domains, 6 common pitfalls with fixes.' },
      { id: 'reportwrite', icon: '\u270F\uFE0F', label: 'Writing the Psych Report', desc: '10 principles for writing reports parents can actually use, 5 integration-section patterns (strengths-first, converging evidence, rule-out, SLD-profile, decision-tree eligibility).' },
      { id: 'formative', icon: '\uD83D\uDCCA', label: 'Formative & Alternative Assessment', desc: 'CBM, portfolio, project-based, dynamic assessment, HOWLs/Crew (EL Education model), standards-based grading, self/peer assessment. When standardized testing isn\'t enough.' },
      { id: 'trauma', icon: '\uD83D\uDC96', label: 'Trauma-Informed Assessment', desc: 'Trauma presentations across ages, differential diagnosis (ADHD, ODD, ASD, SLD, depression/anxiety), screening tools (ACE, TSCC, UCLA PTSD), 8 principles for trauma-informed practice.' },
      { id: 'transition', icon: '\uD83C\uDF9F\uFE0F', label: 'Transition Planning (Age 16+)', desc: 'IDEA requirements, 6 transition assessment domains, postsecondary options (college, vocational rehab, supported employment, day programs), 6 best practices including student-led IEPs.' },
      { id: 'screening', icon: '\uD83D\uDD0D', label: 'Universal Mental Health Screening', desc: '8 screening tools (BASC-3 BESS, SDQ, SAEBRS, PSC-17, PHQ-A, GAD-7, DESSA, Panorama), 8 implementation considerations (consent, protocol, privacy, cultural competence, false positives, capacity).' },
      { id: 'crisis', icon: '\uD83D\uDEA8', label: 'Crisis / Suicide Risk Assessment', desc: 'C-SSRS, ASQ, PHQ-9 adolescent. Warning signs by tier. 8-step crisis protocol including Safety Planning Intervention. Ethical considerations and LGBTQ+ risk.' },
      { id: 'iepmeeting', icon: '\uD83E\uDD1D', label: 'IEP Team Meeting Facilitation', desc: 'Pre-meeting prep, 10-phase meeting structure, 7 difficult conversations (eligibility denial, placement change, parent disagreement, cultural differences, manifestation determination), 8 facilitation skills.' },
      { id: 'handout', icon: '\uD83D\uDCDD', label: 'Parent Handout Generator', desc: 'AI generates a plain-language handout explaining eval findings to a parent. You supply student details, findings, eligibility, and recommendations; it produces a jargon-light, strengths-first, 400-500 word handout ready for the team meeting.' },
      { id: 'interviewing', icon: '\uD83D\uDDE3\uFE0F', label: 'Clinical Interviewing Skills', desc: '5 interview purposes, developmental approaches by 5 age bands, 5 motivational interviewing micro-skills, 5 trauma-sensitive rules, 6 common pitfalls with fixes.' },
      { id: 'culturally', icon: '\uD83C\uDF0D', label: 'Culturally Responsive Assessment', desc: '8 core principles, practice considerations for 6 populations (Black, Latino, Asian, Indigenous, refugee/newcomer, multiracial), 7 interpreter best practices.' },
      { id: 'autism', icon: '\uD83E\uDDE9', label: 'Autism Spectrum Assessment', desc: '8 instruments (ADOS-2, ADI-R, CARS-2, SRS-2, M-CHAT-R/F, SCQ, ASRS, A-TAC), 7 differential conditions, 6 considerations including gender presentation, racial disparities, and neurodiversity-informed practice.' },
      { id: 'adhd', icon: '\u26A1', label: 'ADHD Assessment', desc: 'DSM-5 criteria breakdown, 7 instruments (Conners-4, BASC-3, BRIEF-2, ADHD-RS-5, T.O.V.A., CPT-3, Vanderbilt), 8 differential conditions, population-specific presentation notes, 6-domain treatment framework.' }
    ];
    return h('div', { className: 'max-w-4xl mx-auto p-4 md:p-6' },
      backBtn('menu', null, 'Main menu'),
      h('h2', { className: 'text-2xl font-black text-sky-200 mb-2' }, '\uD83C\uDFEB School Psych & IEP Workflow'),
      h('p', { className: 'text-xs text-slate-300 mb-4 leading-relaxed' }, 'How psychoeducational evaluation actually works: from pre-referral intervention through eligibility determination, service delivery, and parent rights. This is what happens AFTER the theory — where the cognitive/achievement batteries from Module 1 get applied to real decisions about real kids.'),
      h('div', { className: 'p-3 rounded-lg bg-sky-900/30 border border-sky-500/40 text-xs text-sky-100 mb-4' },
        h('strong', null, 'For whom: '), 'Parents navigating the special ed process, teachers preparing to participate in eligibility meetings, school psych grad students, advocates, and anyone who wants to understand what a "team meeting" is actually deciding and on what evidence.'
      ),
      h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
        subs.map(function(x) {
          return h('button', {
            key: x.id,
            onClick: function() { upd({ sub: x.id, ideaCategoryFocus: null }); },
            className: 'text-left p-4 rounded-xl bg-slate-800/60 border border-sky-500/30 hover:bg-slate-700/60 focus:ring-2 focus:ring-sky-400 focus:outline-none'
          },
            h('div', { className: 'text-2xl mb-1' }, x.icon),
            h('div', { className: 'text-sm font-bold text-sky-200 mb-1' }, x.label),
            h('div', { className: 'text-xs text-slate-300 leading-snug' }, x.desc)
          );
        })
      )
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // MODULE 6: JUNK SCIENCE CAPSTONE IMPLEMENTATION
  // ═══════════════════════════════════════════════════════════════

  function _renderReliabilitySleuth(h, s, upd, addToast, backBtn) {
    var VERDICTS = [
      { id: 'defensible',   label: 'Defensible',           color: '#16a34a', icon: '\u2705', def: 'Reliable enough for this specific use case. Common for r \u2265 0.90 on high-stakes decisions, lower thresholds for screeners.' },
      { id: 'borderline',   label: 'Borderline',           color: '#f59e0b', icon: '\u26A0\uFE0F', def: 'The reliability is acceptable in principle, but something else (single measure, missing component, high-stakes decision) limits the defensibility.' },
      { id: 'insufficient', label: 'Insufficient',         color: '#dc2626', icon: '\u274C', def: 'Reliability too low for the stakes, OR norms are outdated, OR reliability is unreported. Should not anchor the decision.' }
    ];
    var V = [
      { id: 1, scenario: 'WISC-V Full Scale IQ has reliability r = 0.96 (manual). Used for SLD eligibility determination, alongside an achievement battery and observation.', correct: 'defensible',
        why: 'r \u2265 0.95 is the gold standard for high-stakes cognitive measures, and SLD eligibility is high-stakes. The multi-measure context (achievement + observation) further strengthens defensibility. NASP best practice.' },
      { id: 2, scenario: 'MBTI personality inventory has test-retest reliability r = 0.50 over a 5-week interval (Pittenger 2005). Used to inform placement in a special-education setting.', correct: 'insufficient',
        why: 'r = 0.50 means 50% of the score variance is error, not signal. About half of MBTI takers get a different type on a 5-week retest. This level of reliability cannot anchor any educational decision \u2014 and MBTI is not a clinical instrument regardless of use case.' },
      { id: 3, scenario: 'BASC-3 Parent Rating Scales have reliability r = 0.82. Used as ONE of several measures (also: teacher BASC, classroom observation, cognitive battery) to support an OHI eligibility determination.', correct: 'defensible',
        why: 'Behavior rating scales typically have lower reliability than cognitive measures (r 0.80-0.90 range). When used as part of multi-source / multi-method assessment \u2014 BASC parent + teacher + observation \u2014 the cumulative reliability is much higher than any single measure. NASP supports this use.' },
      { id: 4, scenario: 'BRIEF-2 Teacher Form has reliability r = 0.84. Used as the SOLE measure for a 504 plan determination based on executive function concerns.', correct: 'borderline',
        why: 'BRIEF-2 reliability is in the acceptable range for behavioral measures, BUT using ANY single measure as the sole basis for a 504 (or IEP) decision is borderline regardless of reliability. Best practice: pair BRIEF-2 with classroom observation + parent report + cognitive measure (rule out other causes).' },
      { id: 5, scenario: 'A free online "IQ test" with no reported reliability or norms. A parent uses it to decide whether to request a psychoeducational evaluation from school.', correct: 'insufficient',
        why: 'Unreported reliability = treat as zero for any high-stakes decision. The test may be entertaining, but parents using it to gate a referral risk delay or deny a kid who needs a real eval. Schools should not use online IQ-screener results as evidence for or against eligibility \u2014 ever.' },
      { id: 6, scenario: 'WJ-IV General Intellectual Ability has reliability r = 0.97. Used for Intellectual Disability eligibility, with concurrent Vineland-3 adaptive behavior measure (r = 0.91 composite).', correct: 'defensible',
        why: 'Both measures are at the gold-standard reliability threshold (r \u2265 0.95 cognitive, r \u2265 0.90 adaptive), and the three-prong ID requirement (cognitive + adaptive + developmental period) is being met. This is the canonical defensible ID-eligibility battery.' },
      { id: 7, scenario: 'Universal mental health screener with reliability r = 0.78. Used to identify students who should be flagged for tier-2 follow-up (no diagnostic decision; only triggers a closer look).', correct: 'defensible',
        why: 'Low-stakes screening uses can defensibly use lower reliability (r 0.75-0.85 range) because the consequence is just "look more closely," not a placement decision. NASP and AERA both support lower reliability thresholds for screening decisions \u2014 the universal screener is doing what it should: surfacing kids for a closer look.' },
      { id: 8, scenario: 'RIAS-2 Composite Intelligence Index has reliability r = 0.95. Used as the cognitive measure for SLD eligibility \u2014 but the team has NOT collected a comprehensive achievement battery.', correct: 'borderline',
        why: 'RIAS-2 reliability is excellent. The problem is the missing achievement measure: SLD eligibility requires demonstrating a deficit in one of 8 specific academic areas. Cognitive alone cannot establish SLD regardless of how reliable it is. Borderline because the test choice is fine, but the BATTERY is incomplete.' },
      { id: 9, scenario: 'A test normed in 1997 has reliability r = 0.92 in the original standardization sample. Used in 2024 for a high-stakes ID-eligibility determination.', correct: 'insufficient',
        why: 'Outdated norms void otherwise-good reliability. Flynn effect alone shifts mean IQ ~3 points per decade \u2014 a 1997 test in 2024 over-estimates current performance by ~8 points. Reliability is about score consistency; norms are about score interpretation. You need both. NASP guidance: norms older than ~10-12 years should not anchor high-stakes decisions.' },
      { id: 10, scenario: 'Curriculum-based measurement (CBM) reading probes have alternate-form reliability r = 0.85 across administrations. Used to monitor a student\'s response to tier-2 reading intervention over 8 weeks.', correct: 'defensible',
        why: 'r = 0.85 is appropriate for CBM monitoring, where the use case is tracking change rather than making a single high-stakes call. Repeated measurement over time partially compensates for any single-point error. Best practice: 8-12 weekly probes, look at slope, not single-day score. NASP + RTI literature support this.' }
    ];

    var rsIdx = s.rsIdx == null ? -1 : s.rsIdx;
    var rsSeed = s.rsSeed || 1;
    var rsAns = !!s.rsAns;
    var rsPick = s.rsPick;
    var rsScore = s.rsScore || 0;
    var rsRounds = s.rsRounds || 0;
    var rsStreak = s.rsStreak || 0;
    var rsBest = s.rsBest || 0;
    var rsShown = s.rsShown || [];

    function startRs() {
      var pool = [];
      for (var i = 0; i < V.length; i++) if (rsShown.indexOf(i) < 0) pool.push(i);
      if (pool.length === 0) { pool = []; for (var j = 0; j < V.length; j++) pool.push(j); rsShown = []; }
      var seedNext = ((rsSeed * 16807 + 11) % 2147483647) || 7;
      var pick = pool[seedNext % pool.length];
      upd({ rsSeed: seedNext, rsIdx: pick, rsAns: false, rsPick: null, rsShown: rsShown.concat([pick]) });
    }
    function pickRs(verdictId) {
      if (rsAns) return;
      var v = V[rsIdx];
      var correct = verdictId === v.correct;
      var newScore = rsScore + (correct ? 1 : 0);
      var newStreak = correct ? (rsStreak + 1) : 0;
      var newBest = Math.max(rsBest, newStreak);
      upd({ rsAns: true, rsPick: verdictId, rsScore: newScore, rsRounds: rsRounds + 1, rsStreak: newStreak, rsBest: newBest });
    }

    if (rsIdx < 0) {
      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
        backBtn('schoolpsych', null, 'School Psych menu'),
        h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDD75\uFE0F Reliability Sleuth'),
        h('p', { className: 'text-sm text-slate-200 leading-relaxed' },
          '10 short scenarios. Each names a real test, its reliability coefficient, and how it is being used. Decide whether the use is defensible, borderline, or insufficient \u2014 then read the coaching for the rule that should have driven your call.'),
        h('div', { className: 'p-4 rounded-xl bg-slate-800/60 border border-sky-500/30' },
          h('div', { className: 'text-sm font-bold text-sky-200 mb-3' }, 'The three verdicts'),
          h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2' },
            VERDICTS.map(function(v, i) {
              return h('div', { key: i,
                style: { background: v.color + '18', border: '1px solid ' + v.color + '60', borderRadius: 8, padding: '10px 12px' }
              },
                h('div', { className: 'flex items-center gap-2 mb-1' },
                  h('span', { style: { fontSize: 16 }, 'aria-hidden': 'true' }, v.icon),
                  h('span', { style: { color: v.color, fontWeight: 800, fontSize: 13 } }, v.label)
                ),
                h('div', { className: 'text-xs text-slate-100 leading-relaxed' }, v.def)
              );
            })
          )
        ),
        h('div', { className: 'p-3 rounded-lg bg-amber-900/30 border border-amber-500/40 text-xs text-slate-100 leading-relaxed' },
          h('strong', { className: 'text-amber-300' }, 'Reminder \u2014 reliability \u2260 validity. '),
          'A test can be highly reliable (consistent) but measure the wrong construct (low validity). And a test with old norms or unreported reliability voids both. This game tests reliability + use-case fit; validity belongs to a different sleuth.'
        ),
        h('button', {
          onClick: startRs,
          className: 'w-full py-3 rounded-xl bg-sky-600 text-white font-bold text-sm hover:bg-sky-500 focus:outline-none focus:ring-2 ring-sky-300'
        }, '\uD83D\uDD75\uFE0F Start \u2014 vignette 1 of 10')
      );
    }

    var v = V[rsIdx];
    var pickedCorrect = rsAns && rsPick === v.correct;
    var pct = rsRounds > 0 ? Math.round((rsScore / rsRounds) * 100) : 0;
    var allDone = rsShown.length >= V.length && rsAns;
    var correctVerdict = VERDICTS.filter(function(x) { return x.id === v.correct; })[0];
    var pickedVerdict = rsPick ? VERDICTS.filter(function(x) { return x.id === rsPick; })[0] : null;

    return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
      backBtn('schoolpsych', null, 'School Psych menu'),
      h('h2', { className: 'text-2xl font-black text-sky-200' }, '\uD83D\uDD75\uFE0F Reliability Sleuth'),
      // Score header
      h('div', { className: 'flex flex-wrap gap-3 items-center text-xs' },
        h('span', { className: 'text-slate-300' }, 'Vignette ', h('strong', { className: 'text-white' }, rsShown.length)),
        h('span', { className: 'text-slate-300' }, 'Score ', h('strong', { className: 'text-emerald-300' }, rsScore + ' / ' + rsRounds)),
        rsRounds > 0 && h('span', { className: 'text-slate-300' }, 'Accuracy ', h('strong', { className: 'text-cyan-300' }, pct + '%')),
        h('span', { className: 'text-slate-300' }, 'Streak ', h('strong', { className: 'text-amber-300' }, rsStreak)),
        h('span', { className: 'text-slate-300' }, 'Best ', h('strong', { className: 'text-yellow-300' }, rsBest))
      ),
      // Vignette
      h('section', { className: 'p-5 rounded-xl bg-slate-800/60 border-2 border-sky-500/40' },
        h('div', { className: 'text-xs font-bold text-sky-300 uppercase tracking-widest mb-2' }, 'Vignette ' + rsShown.length + ' of ' + V.length),
        h('p', { className: 'text-sm text-slate-100 leading-relaxed' }, v.scenario)
      ),
      // 3 verdict picker buttons
      h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-2', role: 'radiogroup', 'aria-label': 'Pick the verdict' },
        VERDICTS.map(function(vi) {
          var picked = rsAns && rsPick === vi.id;
          var isRight = rsAns && vi.id === v.correct;
          var bg, border, color;
          if (rsAns) {
            if (isRight) { bg = 'rgba(34,197,94,0.18)'; border = '#22c55e'; color = '#bbf7d0'; }
            else if (picked) { bg = 'rgba(239,68,68,0.18)'; border = '#ef4444'; color = '#fecaca'; }
            else { bg = 'rgba(30,41,59,0.6)'; border = 'rgba(100,116,139,0.4)'; color = '#94a3b8'; }
          } else {
            bg = vi.color + '15'; border = vi.color + '60'; color = '#e2e8f0';
          }
          return h('button', {
            key: vi.id, role: 'radio',
            'aria-checked': picked ? 'true' : 'false',
            'aria-label': vi.label,
            disabled: rsAns,
            onClick: function() { pickRs(vi.id); },
            style: { padding: '12px 14px', borderRadius: 10, background: bg, color: color, border: '2px solid ' + border, cursor: rsAns ? 'default' : 'pointer', textAlign: 'left', fontWeight: 700, fontSize: 12, minHeight: 70, transition: 'all 0.15s' }
          },
            h('div', { className: 'flex items-center gap-2 mb-1' },
              h('span', { style: { fontSize: 18 }, 'aria-hidden': 'true' }, vi.icon),
              h('span', { style: { color: rsAns ? color : vi.color, fontSize: 13, fontWeight: 800 } }, vi.label)
            ),
            h('div', { style: { fontSize: 11, fontWeight: 500, lineHeight: 1.4, color: rsAns ? color : '#cbd5e1' } }, vi.def)
          );
        })
      ),
      // Feedback
      rsAns && h('section', {
        className: 'p-4 rounded-xl',
        style: { background: pickedCorrect ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.08)', border: '1px solid ' + (pickedCorrect ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.40)') }
      },
        h('div', { className: 'text-sm font-bold mb-2', style: { color: pickedCorrect ? '#86efac' : '#fca5a5' } },
          pickedCorrect
            ? '\u2705 Correct \u2014 ' + correctVerdict.label
            : '\u274C The right verdict is ' + correctVerdict.label + (pickedVerdict ? ' (you picked ' + pickedVerdict.label + ')' : '')
        ),
        h('p', { className: 'text-xs text-slate-100 leading-relaxed mb-2' }, v.why),
        allDone
          ? h('div', { className: 'p-3 rounded-lg bg-sky-900/40 border border-sky-500/40 mt-2' },
              h('div', { className: 'text-sm font-black text-sky-200 mb-1' }, '\uD83C\uDFC6 All 10 vignettes complete'),
              h('div', { className: 'text-xs text-slate-100 leading-relaxed' },
                'Final: ', h('strong', { className: 'text-white' }, rsScore + ' / ' + V.length + ' (' + Math.round((rsScore / V.length) * 100) + '%)'),
                rsScore === V.length ? ' \u2014 you can defend a battery in a due-process hearing.' :
                rsScore >= 8 ? ' \u2014 strong reliability reasoning. The most-confused pair is usually defensible vs borderline (good test + missing component, or single measure for high-stakes \u2014 both can pass at first glance).' :
                rsScore >= 6 ? ' \u2014 solid baseline. The four reflexes worth building: high-stakes needs r \u2265 0.90, screening can use r \u2265 0.75, old norms void everything, unreported reliability = treat as zero.' :
                ' \u2014 these distinctions matter at IEP team meetings and parent re-eval requests. Re-read the rationales on misses, then retake.'
              ),
              h('button', {
                onClick: function() { upd({ rsIdx: -1, rsShown: [], rsScore: 0, rsRounds: 0, rsStreak: 0 }); },
                className: 'mt-2 px-4 py-1.5 rounded-lg bg-sky-600 text-white font-bold text-xs hover:bg-sky-500'
              }, '\uD83D\uDD04 Restart')
            )
          : h('button', {
              onClick: startRs,
              className: 'mt-1 px-4 py-2 rounded-lg bg-sky-600 text-white font-bold text-sm hover:bg-sky-500 focus:outline-none focus:ring-2 ring-sky-300'
            }, '\u27A1\uFE0F Next vignette')
      )
    );
  }

  function _RENDER_JUNK(h, s, upd, _callGemini, _addToast, backBtn, setAlCeleb, alCeleb) {
    var order = s.junkOrder || JUNK_SCENARIOS.map(function(_, i) { return i; });
    var idx = s.junkIndex || 0;
    var answers = s.junkAnswers || {};
    var revealed = s.junkRevealed || {};
    var total = order.length;
    var done = idx >= total;

    var pick = function(verdict) {
      if (revealed[idx]) return;
      var nextA = Object.assign({}, answers); nextA[idx] = verdict;
      var nextR = Object.assign({}, revealed); nextR[idx] = true;
      // ── Junk-Science Mastery: cross-attempt first-correct log ──
      // Per-attempt answers reset on quiz reset; mastery sticks. First-correct
      // on each scenario fires a celebration overlay.
      var origIdx = order[idx];
      var scenario = JUNK_SCENARIOS[origIdx];
      var isCorrect = scenario && verdict === scenario.verdict;
      var patch = { junkAnswers: nextA, junkRevealed: nextR };
      if (isCorrect && scenario) {
        var prevMastery = (s.junkMastery && typeof s.junkMastery === 'object') ? s.junkMastery : {};
        var existingEntry = prevMastery[origIdx];
        var nowIso = new Date().toISOString();
        var nextMastery = Object.assign({}, prevMastery);
        if (existingEntry) {
          nextMastery[origIdx] = Object.assign({}, existingEntry, {
            lastCorrectAt: nowIso,
            correctCount: (existingEntry.correctCount || 0) + 1
          });
        } else {
          nextMastery[origIdx] = {
            firstCorrectAt: nowIso,
            lastCorrectAt: nowIso,
            correctCount: 1,
            verdict: scenario.verdict
          };
          if (typeof setAlCeleb === 'function') {
            try {
              setAlCeleb({
                scenarioIdx: origIdx,
                claim: scenario.claim || '',
                verdict: scenario.verdict,
                total: Object.keys(nextMastery).length,
                at: Date.now()
              });
              setTimeout(function () { setAlCeleb(null); }, 3500);
            } catch (e) {}
          }
        }
        patch.junkMastery = nextMastery;
      }
      upd(patch);
      announceSR('Your answer: ' + verdict);
    };
    var next = function() {
      upd({ junkIndex: idx + 1 });
    };
    var reset = function() {
      var shuffled = JUNK_SCENARIOS.map(function(_, i) { return i; });
      for (var i = shuffled.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
      }
      upd({ junkOrder: shuffled, junkIndex: 0, junkAnswers: {}, junkRevealed: {} });
    };

    if (done) {
      var correct = 0;
      order.forEach(function(origIdx, qIdx) {
        if (answers[qIdx] === JUNK_SCENARIOS[origIdx].verdict) correct++;
      });
      var pct = Math.round((correct / total) * 100);
      var grade;
      if (pct >= 90) grade = { label: 'Psychometric Sniper', tone: 'emerald', note: 'You can spot junk claims at a glance. Ready to be the skeptic in the room when someone cites an MBTI at work or a DISC in hiring.' };
      else if (pct >= 75) grade = { label: 'Sharp Consumer', tone: 'sky', note: 'You\'re catching most of the tells. Review the ones you missed — probably the "suspect" category, where things look reasonable on the surface but don\'t hold up to a validity question.' };
      else if (pct >= 50) grade = { label: 'Apprentice Skeptic', tone: 'amber', note: 'You\'re seeing the obvious junk. The tricky middle ground — claims that sound legitimate but rest on commercial data, popularity, or authority — is worth a second pass through the other modules.' };
      else grade = { label: 'Still Learning', tone: 'rose', note: 'Replay the challenge. For each scenario you miss, revisit the Personality Validity Primer (Module 2) and the Employer Ethics section (Module 4) — those contain the frameworks you need.' };

      return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
        backBtn('menu', null, 'Main menu'),
        h('h2', { className: 'text-2xl font-black text-fuchsia-200' }, '\uD83C\uDFC6 Challenge Complete'),
        h('section', { className: 'p-5 rounded-xl bg-gradient-to-br from-fuchsia-900/40 to-rose-900/40 border border-fuchsia-500/30 text-center' },
          h('div', { className: 'text-5xl font-black text-fuchsia-200 mb-2' }, correct + ' / ' + total),
          h('div', { className: 'text-sm text-slate-300 mb-3' }, pct + '% correct'),
          h('div', { className: 'text-lg font-black text-' + grade.tone + '-300 mb-2' }, grade.label),
          h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, grade.note)
        ),
        h('section', { className: 'p-4 rounded-xl bg-slate-800/60 border border-slate-500/30' },
          h('h3', { className: 'text-sm font-black text-slate-200 mb-3' }, 'Review'),
          h('div', { className: 'space-y-2' },
            order.map(function(origIdx, qIdx) {
              var sc = JUNK_SCENARIOS[origIdx];
              var yours = answers[qIdx];
              var ok = yours === sc.verdict;
              return h('div', { key: qIdx, className: 'p-3 rounded-lg ' + (ok ? 'bg-emerald-900/20 border border-emerald-500/30' : 'bg-rose-900/20 border border-rose-500/30') },
                h('div', { className: 'flex justify-between items-start mb-1' },
                  h('span', { className: 'text-xs font-bold ' + (ok ? 'text-emerald-300' : 'text-rose-300') }, (ok ? '\u2713' : '\u2717') + ' Item ' + (qIdx + 1)),
                  h('span', { className: 'text-xs text-slate-400' }, 'Your: ' + (yours || '—') + ' · Correct: ' + sc.verdict)
                ),
                h('div', { className: 'text-xs text-slate-200 line-clamp-2' }, sc.claim.substring(0, 140) + (sc.claim.length > 140 ? '…' : ''))
              );
            })
          )
        ),
        h('div', { className: 'flex gap-2' },
          h('button', { onClick: reset, className: 'flex-1 py-2 rounded-lg bg-fuchsia-600 text-white text-sm font-bold hover:bg-fuchsia-500' }, '\uD83D\uDD04 Replay (new order)'),
          h('button', { onClick: function() { upd({ view: 'menu', sub: null }); }, className: 'flex-1 py-2 rounded-lg bg-slate-700 text-white text-sm font-bold hover:bg-slate-600' }, 'Main menu')
        )
      );
    }

    var sc = JUNK_SCENARIOS[order[idx]];
    var reveal = !!revealed[idx];
    var user = answers[idx];
    var correct = reveal && user === sc.verdict;

    var verdictBadge = function(v) {
      var palette = { legit: { bg: 'bg-emerald-600', label: 'Legit' }, suspect: { bg: 'bg-amber-600', label: 'Suspect' }, junk: { bg: 'bg-rose-600', label: 'Pseudoscience' } };
      var p = palette[v] || { bg: 'bg-slate-600', label: v };
      return h('span', { className: 'inline-block px-2 py-0.5 rounded text-xs font-black text-white ' + p.bg }, p.label);
    };

    var _masteredCount = Object.keys(s.junkMastery || {}).length;
    return h('div', { className: 'max-w-3xl mx-auto p-4 md:p-6 space-y-4' },
      // First-correct celebration overlay (fixed-position, top of screen, 3.5s).
      alCeleb && h('div', {
        role: 'status', 'aria-live': 'assertive',
        style: { position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
                 zIndex: 9999, pointerEvents: 'none',
                 animation: 'assessmentliteracy-celeb-rise 3.5s ease-out forwards', maxWidth: 480 }
      },
        h('div', { style: { background: 'linear-gradient(135deg, #c026d3 0%, #db2777 50%, #f97316 100%)',
                            color: '#fff', padding: '14px 22px', borderRadius: 16,
                            boxShadow: '0 10px 30px rgba(0,0,0,0.35)', border: '4px solid #fff',
                            display: 'flex', alignItems: 'center', gap: 12 } },
          h('span', { 'aria-hidden': 'true', style: { fontSize: 28 } }, '\uD83D\uDD0D'),
          h('div', null,
            h('div', { style: { fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.95 } }, 'Junk-science nailed'),
            h('div', { style: { fontSize: 13, fontWeight: 800, lineHeight: 1.3 } }, alCeleb.claim.length > 90 ? (alCeleb.claim.substring(0, 87) + '\u2026') : alCeleb.claim),
            h('div', { style: { fontSize: 11, fontStyle: 'italic', opacity: 0.95, marginTop: 2 } }, alCeleb.total + ' / ' + JUNK_SCENARIOS.length + ' scenarios mastered')
          )
        )
      ),
      backBtn('menu', null, 'Main menu'),
      h('div', { className: 'flex items-center justify-between' },
        h('h2', { className: 'text-2xl font-black text-fuchsia-200' }, '\uD83D\uDD0D Spot the Junk Science'),
        h('span', { className: 'text-xs font-bold text-slate-400' }, 'Item ' + (idx + 1) + ' / ' + total)
      ),
      h('p', { className: 'text-xs text-slate-300 leading-relaxed' }, 'Read the claim. Decide: is this legitimate psychometric evidence, suspect framing, or outright pseudoscience? You get one guess per item. Reasoning is revealed after you answer.'),
      // Cross-attempt mastery summary (only shown when student has \u22651 correct).
      _masteredCount > 0 && h('div', { className: 'p-3 rounded-lg border border-fuchsia-500/40',
        style: { background: 'rgba(192,38,211,0.10)' } },
        h('div', { className: 'flex items-center gap-3' },
          h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, '\uD83C\uDFC5'),
          h('div', { className: 'flex-1' },
            h('div', { className: 'text-xs font-bold text-fuchsia-200' }, 'Junk-Science Mastery: ' + _masteredCount + ' / ' + JUNK_SCENARIOS.length + ' scenarios locked in'),
            h('div', { className: 'text-[10px] text-slate-400 italic mt-1' }, 'Per-attempt scores reset; mastery sticks across every retake.')
          )
        )
      ),

      h('section', { className: 'p-5 rounded-xl bg-slate-800/70 border border-fuchsia-500/30' },
        h('div', { className: 'text-xs font-bold text-fuchsia-300 mb-2' }, 'CLAIM'),
        h('div', { className: 'text-sm text-slate-100 leading-relaxed italic' }, sc.claim)
      ),

      h('div', { className: 'grid grid-cols-3 gap-2' },
        [
          { v: 'legit', label: '\u2713 Legit', desc: 'Legit — valid evidence is present and appropriate', color: 'emerald' },
          { v: 'suspect', label: '\u26A0 Suspect', desc: 'Suspect — claim may be true but framing outruns the evidence', color: 'amber' },
          { v: 'junk', label: '\u2717 Pseudoscience', desc: 'Pseudoscience — no valid evidence, multiple red flags', color: 'rose' }
        ].map(function(opt) {
          var picked = user === opt.v;
          var showCorrect = reveal && opt.v === sc.verdict;
          var showWrong = reveal && picked && opt.v !== sc.verdict;
          return h('button', {
            key: opt.v,
            disabled: reveal,
            onClick: function() { pick(opt.v); },
            className: 'p-3 rounded-lg text-left border-2 transition focus:ring-2 focus:ring-fuchsia-400 focus:outline-none ' +
              (showCorrect ? 'bg-emerald-600 border-emerald-600 text-white' :
               showWrong ? 'bg-rose-600 border-rose-600 text-white' :
               picked ? 'bg-' + opt.color + '-700/50 border-' + opt.color + '-400 text-white' :
               'bg-slate-800/60 border-slate-600 text-slate-100 hover:bg-slate-700/60')
          },
            h('div', { className: 'text-sm font-black mb-1' }, opt.label),
            h('div', { className: 'text-xs opacity-90' }, opt.desc)
          );
        })
      ),

      reveal && h('section', { className: 'p-4 rounded-xl ' + (correct ? 'bg-emerald-900/30 border border-emerald-500/40' : 'bg-rose-900/30 border border-rose-500/40') },
        h('div', { className: 'flex items-center gap-2 mb-2' },
          h('span', { className: 'text-sm font-black ' + (correct ? 'text-emerald-300' : 'text-rose-300') }, correct ? '\u2713 Correct' : '\u2717 Not quite'),
          h('span', { className: 'text-xs text-slate-400' }, 'Correct verdict:'),
          verdictBadge(sc.verdict)
        ),
        h('div', { className: 'text-xs text-slate-200 leading-relaxed' }, sc.reasoning)
      ),

      reveal && h('div', { className: 'flex justify-end' },
        h('button', {
          onClick: next,
          className: 'px-5 py-2 rounded-xl font-bold text-sm bg-fuchsia-600 text-white hover:bg-fuchsia-500'
        }, idx + 1 >= total ? 'See results \u2192' : 'Next item \u2192')
      )
    );
  }

  console.log('[StemLab Plugin] Loaded: stem_lab/stem_tool_assessmentliteracy.js');
})();

} // end dedup guard
