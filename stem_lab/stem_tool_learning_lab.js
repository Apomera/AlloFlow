// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════
// stem_tool_learning_lab.js — Learning Lab
// The science of pedagogy made student- + teacher-facing. Bloom's, UDL,
// metacognition, cognitive load, spaced repetition + retrieval practice,
// growth mindset (cross-references sel_tool_growthmindset.js), neuromyth
// debunking, study strategies, and education-career pathways.
//
// Differentiator vs generic study-skills content: cited primary sources
// (Dunlosky 2013, Pashler 2008, Sweller 1988, Karpicke + Roediger 2006,
// CAST UDL Guidelines 3.0). Honest about contested claims (Multiple
// Intelligences = weakly empirical; growth mindset has had replication
// issues at scale; brain-training games don't transfer).
//
// Maine + EL Education context: USM, UMaine, UMF programs; teacher cert
// pathway; HOWLs / Crew (King Middle reference).
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('learningLab'))) {

(function() {
  'use strict';

  // ── Accessibility live region (WCAG 4.1.3) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-live-learninglab')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-learninglab';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // ── Focus-visible outline (WCAG 2.4.7) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-ll-focus-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-ll-focus-css';
    st.textContent = '[data-ll-focusable]:focus-visible{outline:3px solid #fbbf24!important;outline-offset:2px!important;border-radius:6px}';
    if (document.head) document.head.appendChild(st);
  })();

  var _llPoliteTimer = null;
  function llAnnounce(text) {
    if (typeof document === 'undefined') return;
    var lr = document.getElementById('allo-live-learninglab');
    if (!lr) return;
    if (_llPoliteTimer) clearTimeout(_llPoliteTimer);
    lr.textContent = '';
    _llPoliteTimer = setTimeout(function() { lr.textContent = String(text || ''); _llPoliteTimer = null; }, 25);
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 1: BLOOM'S TAXONOMY (revised 2001, Anderson + Krathwohl)
  // 6 cognitive levels from low to high demand. Verb lists per level
  // help educators write learning objectives that match the level.
  // ─────────────────────────────────────────────────────────
  var BLOOMS_LEVELS = [
    { id: 'remember', n: 1, name: 'Remember', icon: '🧠',
      def: 'Recall facts, terms, basic concepts.',
      cognitive: 'Lowest-demand: recognition + recall. The foundation. Without this, higher levels fail.',
      verbs: ['define', 'duplicate', 'list', 'memorize', 'recall', 'repeat', 'reproduce', 'state', 'identify', 'name'],
      examples: [
        'List the 8 parts of speech.',
        'Recall the year the US Constitution was signed.',
        'Name the four chambers of the heart.',
        'State Newton\'s three laws.'
      ],
      pitfall: 'Many classes stop here. "Remember" alone doesn\'t produce a thinker — it produces a fact-recaller. Move to higher levels.' },
    { id: 'understand', n: 2, name: 'Understand', icon: '💡',
      def: 'Explain ideas or concepts in your own words.',
      cognitive: 'Translation + interpretation. You can paraphrase, summarize, give examples.',
      verbs: ['classify', 'describe', 'discuss', 'explain', 'identify', 'locate', 'recognize', 'report', 'select', 'translate', 'paraphrase', 'summarize'],
      examples: [
        'Explain in your own words why the moon has phases.',
        'Summarize the plot of "Catcher in the Rye" in 3 sentences.',
        'Describe how a bill becomes a law.',
        'Give an example of a metaphor in everyday speech.'
      ],
      pitfall: 'A student who can summarize a textbook chapter but can\'t apply the ideas is stuck at level 2.' },
    { id: 'apply', n: 3, name: 'Apply', icon: '🔧',
      def: 'Use information in new situations.',
      cognitive: 'Transfer learned procedures + concepts to fresh problems.',
      verbs: ['execute', 'implement', 'solve', 'use', 'demonstrate', 'interpret', 'operate', 'schedule', 'sketch'],
      examples: [
        'Solve a quadratic equation you haven\'t seen before, using the formula.',
        'Apply Boyle\'s Law to predict gas behavior in a new scenario.',
        'Use the writing process to draft a personal narrative on a new topic.',
        'Demonstrate how to safely change a tire (cross-references Auto Repair Shop).'
      ],
      pitfall: 'If a student can only solve textbook problems but stalls on real-world applications, they\'re at "Understand" but not yet "Apply."' },
    { id: 'analyze', n: 4, name: 'Analyze', icon: '🔬',
      def: 'Draw connections among ideas; break content into parts.',
      cognitive: 'Differentiating, organizing, attributing. Seeing structure + bias + assumptions.',
      verbs: ['differentiate', 'organize', 'relate', 'compare', 'contrast', 'distinguish', 'examine', 'experiment', 'question', 'test', 'attribute'],
      examples: [
        'Compare the causes of WWI and WWII — what\'s structurally similar, what\'s different?',
        'Break a research paper into its argument, evidence, and assumptions.',
        'Distinguish between correlation and causation in a news article.',
        'Examine a marketing ad: what techniques is it using to persuade?'
      ],
      pitfall: 'Analysis is where critical thinking starts. Many students conflate "I disagree" with analysis — analysis requires SHOWING the parts + their relationships, not just opining.' },
    { id: 'evaluate', n: 5, name: 'Evaluate', icon: '⚖️',
      def: 'Justify a stand or decision; make judgments based on criteria.',
      cognitive: 'Checking + critiquing. Defending choices with explicit standards.',
      verbs: ['appraise', 'argue', 'defend', 'judge', 'select', 'support', 'value', 'critique', 'weigh'],
      examples: [
        'Defend a position on whether social media should be regulated, citing evidence.',
        'Critique a peer\'s essay using a rubric.',
        'Judge which renewable-energy strategy is most effective for Maine.',
        'Argue for one of three solutions to a community problem.'
      ],
      pitfall: 'Strong evaluation requires clear criteria. "I don\'t like it" isn\'t evaluation — "It fails because of X, Y, Z" is.' },
    { id: 'create', n: 6, name: 'Create', icon: '🎨',
      def: 'Produce new or original work.',
      cognitive: 'Highest-demand: synthesizing into something new.',
      verbs: ['design', 'assemble', 'construct', 'conjecture', 'develop', 'formulate', 'author', 'investigate', 'compose', 'invent'],
      examples: [
        'Design a science experiment that tests whether plants grow toward light.',
        'Compose an original poem in a new form.',
        'Develop a business plan for a youth-run service in your town.',
        'Construct a working model of a simple machine that solves a real problem.'
      ],
      pitfall: 'Creation without the lower levels = mush. A student "creating" without remember + understand + apply is just guessing in a more elaborate way.' }
  ];

  var BLOOMS_USAGE_NOTES = [
    'Bloom\'s is NOT strictly hierarchical in practice — students may operate at higher levels in domains they care about while struggling at lower levels in others.',
    'When writing learning objectives, use a verb from the level you\'re targeting. "Students will UNDERSTAND photosynthesis" is vague; "Students will EXPLAIN photosynthesis" is measurable.',
    'A complete unit of instruction should cycle through multiple levels. Start with Remember + Understand, build to Apply + Analyze, finish with Evaluate or Create.',
    'Common mistake: teachers think they\'re teaching at "Apply" but their assessments only test "Remember." Match assessment verbs to instruction verbs.'
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 2: COGNITIVE LOAD THEORY (Sweller 1988)
  // Working memory is severely limited (~4 chunks at once, Cowan 2001).
  // Three types of load: intrinsic, extraneous, germane. Effective
  // instruction minimizes extraneous + manages intrinsic to free
  // capacity for germane (schema-building).
  // ─────────────────────────────────────────────────────────
  var COGNITIVE_LOAD_TYPES = [
    { id: 'intrinsic', icon: '⚖️', name: 'Intrinsic load',
      def: 'The inherent difficulty of the material itself.',
      example: 'Calculus is intrinsically harder than basic arithmetic. There\'s a lower bound — a teacher can\'t make calculus "easy" by changing the lesson, only easier to access by managing the OTHER loads.',
      manage: 'Sequence content from simple to complex. Pre-teach prerequisite skills. Use worked examples before independent practice.',
      research: 'Sweller, J. (1988). Cognitive load during problem solving. Cognitive Science, 12(2).' },
    { id: 'extraneous', icon: '🚫', name: 'Extraneous load',
      def: 'Wasted cognitive effort caused by poor instructional design.',
      example: 'A worksheet with tiny text + busy background graphics + unrelated cartoons spends working memory on processing the page, not on the math problem.',
      manage: 'Remove unnecessary elements. Avoid split-attention (information in 2 places forcing the eye to jump). Avoid redundancy (same info presented in 2 modes simultaneously). Use clear typography. Strip decoration.',
      research: 'Mayer, R. (2009). Multimedia Learning. Cambridge University Press. The "coherence principle": people learn better when extraneous material is excluded.' },
    { id: 'germane', icon: '🌱', name: 'Germane load',
      def: 'Productive effort that builds schemas (mental models). The "good" load.',
      example: 'Working through a worked example + then attempting variations builds a flexible schema. Self-explanation ("why does this step work?") increases germane load.',
      manage: 'Use varied practice. Encourage self-explanation. Interleave related problems. Build connections to prior knowledge.',
      research: 'Paas, F., Renkl, A., & Sweller, J. (2003). Cognitive load theory and instructional design: Recent developments. Educational Psychologist, 38(1).' }
  ];

  var WORKING_MEMORY_FACTS = {
    millers: 'Miller (1956): "magical number seven, plus or minus two" — but this was based on serial recall of unrelated items, not working memory under load.',
    cowans: 'Cowan (2001): more rigorous research suggests true working memory capacity is closer to 4 ± 1 chunks when not allowed rehearsal.',
    practical: 'Designing instruction: assume students can hold ~4 novel items at once. Beyond that, info must be chunked, externalized (notes), or scaffolded over time.',
    chunking: 'Expertise = chunking. A novice sees "1-7-7-6" as 4 separate digits; a US history student sees "1776" as one chunk meaning "Declaration of Independence."'
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 3: METACOGNITION
  // Thinking about thinking. Three phases: planning, monitoring,
  // evaluating. Strong metacognition predicts academic outcomes
  // beyond raw IQ + prior knowledge.
  // ─────────────────────────────────────────────────────────
  var METACOG_PHASES = [
    { id: 'plan', icon: '🗺️', n: 1, name: 'Planning (before)',
      questions: [
        'What is my goal here?',
        'What do I already know about this?',
        'What do I NOT know yet?',
        'What\'s my approach? (read first, take notes, do practice problems, etc.)',
        'How will I know I\'m done?',
        'How long should this take?',
        'What might go wrong, and what\'s my backup plan?'
      ],
      tip: 'The 2-minute planning step saves 20 minutes of confused effort later. Most students skip it.' },
    { id: 'monitor', icon: '🔍', n: 2, name: 'Monitoring (during)',
      questions: [
        'Am I on track toward my goal?',
        'Do I actually understand this, or am I fooling myself?',
        'Could I explain this to someone else right now?',
        'Are my notes capturing the IDEAS or just the words?',
        'Am I getting tired or frustrated? (If yes — break.)',
        'Should I change strategies?'
      ],
      tip: 'The "illusion of fluency" — feeling like you understand when you don\'t — is the #1 metacognitive failure. Test yourself, don\'t just reread.' },
    { id: 'evaluate', icon: '📊', n: 3, name: 'Evaluating (after)',
      questions: [
        'Did I meet my goal?',
        'What do I now know that I didn\'t before?',
        'What\'s still confusing?',
        'What worked well in my approach?',
        'What would I change next time?',
        'What questions does this raise for next time?'
      ],
      tip: 'Most students skip evaluation. Just 3 minutes at the end of a study session reflecting on these questions improves retention dramatically (per testing-effect research).' }
  ];

  var METACOG_SELF_RATE = [
    { item: 'I think about what I already know before I start a new topic.', label: 'Activate prior knowledge' },
    { item: 'I set specific goals before I begin studying.', label: 'Goal setting' },
    { item: 'I notice when I don\'t understand something.', label: 'Comprehension monitoring' },
    { item: 'I change my approach when something isn\'t working.', label: 'Strategic flexibility' },
    { item: 'I test myself to check if I really understand.', label: 'Self-testing' },
    { item: 'I reflect on what I learned after a study session.', label: 'Post-study evaluation' },
    { item: 'I can predict how well I\'ll do on a test.', label: 'Calibration' },
    { item: 'I know which study strategies work best for me.', label: 'Self-knowledge of strategies' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 4: ZPD + SCAFFOLDING (Vygotsky)
  // Zone of Proximal Development = what learner can do WITH HELP that
  // they can't do alone. Scaffolding = the temporary support a more-
  // capable peer / teacher provides. Goal: fade scaffolding over time.
  // ─────────────────────────────────────────────────────────
  var ZPD_ZONES = [
    { id: 'alone', icon: '✅', name: 'I can do this alone',
      desc: 'Tasks the learner can complete independently. The "comfort zone."',
      teaching: 'Don\'t spend instructional time here. Use as confidence-builders or for review only.' },
    { id: 'with-help', icon: '🤝', name: 'I can do this WITH HELP (the ZPD)',
      desc: 'Tasks just beyond the learner\'s independent reach. Scaffolding makes them accessible.',
      teaching: 'THIS is where teaching has the biggest payoff. Identify the ZPD + provide scaffolding + fade it as competence grows.' },
    { id: 'too-far', icon: '🚫', name: 'I can\'t do this yet, even with help',
      desc: 'Tasks too far above the learner\'s current schema.',
      teaching: 'Too-far tasks frustrate + don\'t teach. Step back to ZPD-level work; build prerequisite skills first.' }
  ];

  var SCAFFOLDING_STRATEGIES = [
    { id: 'modeling', icon: '👁️', name: 'Modeling',
      what: 'Teacher demonstrates the task while thinking aloud.',
      example: 'Teacher solves a math problem on the board, narrating: "First I notice this is a quadratic. So I think — can I factor it? Let me try..."',
      fade: 'Move from full demonstration → partial demonstration (start, students finish) → student demonstrates while teacher prompts.' },
    { id: 'think-aloud', icon: '💭', name: 'Think-alouds',
      what: 'Make invisible cognitive processes visible by speaking them.',
      example: 'Reading: "When I hit a hard sentence, I stop. I read it again. I check the word I don\'t know. I keep going."',
      fade: 'Teacher think-aloud → student think-alouds in pairs → silent practice with self-monitoring.' },
    { id: 'graphic-organizers', icon: '📋', name: 'Graphic organizers',
      what: 'Visual templates that scaffold the structure of thinking (Venn diagrams, concept maps, flow charts).',
      example: 'Compare-contrast essay: Venn diagram first → outline from Venn → draft from outline.',
      fade: 'Teacher provides full template → partial template → blank page with student-chosen structure.' },
    { id: 'sentence-starters', icon: '📝', name: 'Sentence starters',
      what: 'Pre-built openings that scaffold academic discourse.',
      example: 'Discussion: "I agree with X because..." / "I see this differently because..." / "Building on what Y said..."',
      fade: 'Provide list of stems → 1-2 stems → students generate their own.' },
    { id: 'i-do-we-do-you-do', icon: '🔄', name: 'Gradual release of responsibility',
      what: 'Pearson + Gallagher (1983). Move from teacher modeling → joint construction → student independent work.',
      example: 'Lesson 1: I do (teacher demo) → Lesson 2: We do (whole class with teacher prompts) → Lesson 3: You do together (pairs) → Lesson 4: You do alone.',
      fade: 'The framework IS the fading. Each step transfers more responsibility to the student.' },
    { id: 'cognitive-apprenticeship', icon: '🎓', name: 'Cognitive apprenticeship',
      what: 'Collins, Brown + Holum (1991). Modeling → coaching → scaffolding → fading → exploration.',
      example: 'Writing: teacher models composing aloud → coaches student through their own composing → scaffolds with prompts → fades the prompts → student explores their own variations.',
      fade: 'Built into the framework as an explicit fading sequence.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 5: UDL FRAMEWORK (CAST UDL Guidelines 3.0, 2024)
  // 3 principles. Each principle has 3 guidelines. Each guideline has
  // multiple "checkpoints" — but for an introductory tool we focus on
  // the principles + guidelines (9 total) + AlloFlow examples.
  // ─────────────────────────────────────────────────────────
  var UDL_PRINCIPLES = [
    { id: 'engagement', n: 1, icon: '🔥', name: 'Multiple means of ENGAGEMENT',
      tagline: 'The WHY of learning.',
      def: 'Stimulate interest + sustain motivation. Different learners are engaged by different things.',
      guidelines: [
        { id: 'recruiting-interest', name: 'Design options for welcoming interests + identities',
          checkpoints: ['Optimize choice + autonomy', 'Optimize relevance + value', 'Honor identity + minimize threat'],
          alloflowExample: 'Tools let students pick a topic (Sports tools — Hot-Hand framing for athletic kids) or pick a path (Auto Repair: pick scenario or pick career). RoadReady lets students pick the difficulty + scenario.' },
        { id: 'sustaining-effort', name: 'Design options for sustaining effort + persistence',
          checkpoints: ['Clarify goals + objectives', 'Optimize challenge + support', 'Foster collaboration + community', 'Increase mastery-oriented feedback'],
          alloflowExample: 'Lab simulator (Auto Repair) gives per-choice feedback + final letter grade. Badge gallery shows progress + unlocks. Quiz feedback explains WHY each answer is right or wrong.' },
        { id: 'self-regulation', name: 'Design options for emotional capacity',
          checkpoints: ['Recognize + honor emotion + body', 'Develop coping + adapting skills', 'Cultivate self-knowledge'],
          alloflowExample: 'SEL Hub (executive function, self-advocacy, growth mindset) directly supports self-regulation. Pre-Drive Walk-Around (Auto Repair) builds the habit before high-stakes driving.' }
      ]
    },
    { id: 'representation', n: 2, icon: '👁️', name: 'Multiple means of REPRESENTATION',
      tagline: 'The WHAT of learning.',
      def: 'Present information in different ways. No single format works for all learners.',
      guidelines: [
        { id: 'perception', name: 'Design options for perception',
          checkpoints: ['Customize the display of info', 'Auditory alternatives', 'Visual alternatives', 'Tactile + other sensory'],
          alloflowExample: 'ImmersiveReader (text-to-speech, font size, line spacing, color overlays). All AlloFlow tools have light/dark themes. Many have icon + text labels (no color-only meaning).' },
        { id: 'language-symbols', name: 'Design options for language + symbols',
          checkpoints: ['Clarify vocabulary', 'Clarify syntax + structure', 'Support decoding', 'Promote understanding across languages', 'Illustrate through multiple media'],
          alloflowExample: 'doc_pipeline visual scaffolds. SymbolStudio for AAC + simplified-text representations. Glossary modules in domain tools (Auto Repair has 50+ terms with category filter).' },
        { id: 'comprehension', name: 'Design options for building knowledge',
          checkpoints: ['Connect prior knowledge', 'Highlight patterns', 'Guide info processing', 'Maximize transfer + generalization'],
          alloflowExample: 'Decision trees (Auto Repair has 6) walk through reasoning instead of just stating answers. Lab simulator scenarios show how concepts apply to varied situations.' }
      ]
    },
    { id: 'action-expression', n: 3, icon: '✏️', name: 'Multiple means of ACTION + EXPRESSION',
      tagline: 'The HOW of learning.',
      def: 'Multiple ways to interact with content + demonstrate learning. No single output channel fits all.',
      guidelines: [
        { id: 'physical-action', name: 'Design options for interaction',
          checkpoints: ['Vary methods for response + navigation', 'Optimize access to tools + assistive tech'],
          alloflowExample: 'Every interactive control has keyboard access (focus-visible CSS). data-X-focusable patterns. ARIA roles + labels throughout. WCAG 2.1 AA contrast across 31+ tools.' },
        { id: 'expression', name: 'Design options for expression + communication',
          checkpoints: ['Use multiple media', 'Use multiple tools for construction', 'Build fluencies with graduated support'],
          alloflowExample: 'Students can express in writing, drawing, audio, or symbol-based representations. StoryForge + PoetTree + LitLab for written; ArtStudio for visual; ImmersiveReader output options.' },
        { id: 'executive-functions', name: 'Design options for strategy development',
          checkpoints: ['Set goals', 'Plan + strategize', 'Manage info + resources', 'Monitor progress'],
          alloflowExample: 'Executive Function Workshop (sel_tool_execfunction). Service Log + Maintenance Schedule (Auto Repair) for resource management. Learning Path (Auto Repair) for goal setting.' }
      ]
    }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 6: SPACED REPETITION + RETRIEVAL PRACTICE
  // Two of the most-evidence-backed strategies in cognitive science.
  // Counterintuitively, NOT what most students think they should do.
  // ─────────────────────────────────────────────────────────
  var FORGETTING_CURVE = {
    title: 'Ebbinghaus forgetting curve (1885)',
    summary: 'Without practice, memory fades exponentially. ~50% of new info forgotten within 1 hour; ~70% within 24 hours; ~80% within 1 week.',
    bigIdea: 'Each time you successfully retrieve info, the curve flattens. Spaced retrievals dramatically slow forgetting.',
    schedule: [
      { gap: 'Within 24 hours', action: 'First retrieval. Ideally close to the original learning.' },
      { gap: '2-3 days later', action: 'Second retrieval. Some forgetting has happened — retrieval is harder = better.' },
      { gap: '1 week later', action: 'Third retrieval.' },
      { gap: '2-3 weeks later', action: 'Fourth retrieval.' },
      { gap: '1-2 months later', action: 'Fifth retrieval. By now, info is in long-term memory.' }
    ],
    tools: 'Anki, Quizlet (spaced rep mode), SuperMemo all implement this algorithm. They schedule cards based on how easily you remembered last time.'
  };

  var TESTING_EFFECT = {
    title: 'The testing effect (Roediger + Karpicke 2006)',
    bigIdea: 'Practicing RECALL beats re-reading. Even when total study time is the same, students who self-test outperform students who repeatedly read by ~50% on delayed tests.',
    why: 'Retrieval changes memory. Pulling info OUT of memory strengthens the path back to it. Putting info IN (rereading) does much less.',
    research: 'Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: taking memory tests improves long-term retention. Psychological Science, 17(3).',
    practical: [
      'Read a chapter, then close the book. Write everything you remember.',
      'Use flashcards — but always TRY to recall before flipping.',
      'Practice tests with feedback (the feedback is essential).',
      'Self-explain: close the book, explain the concept aloud as if teaching it.',
      'Friend-quiz: have a friend ask questions; answer without notes.'
    ]
  };

  var ILLUSION_OF_FLUENCY = {
    title: 'Why rereading + highlighting feel productive but aren\'t',
    explanation: 'Rereading + highlighting create a feeling of familiarity. The brain interprets familiarity as "I know this." But familiarity ≠ knowledge.',
    test: 'After reading a chapter twice, close the book. Try to summarize the main argument in 3 sentences. If you can\'t — you experienced fluency without learning.',
    fix: 'Replace 50% of your "rereading" time with retrieval practice. After every chapter section, close the book + answer: What were the main 3 points? What\'s the key example? What questions do I still have?',
    research: 'Karpicke, J. D., & Blunt, J. R. (2011). Retrieval practice produces more learning than elaborative studying with concept mapping. Science, 331(6018).'
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 7: STUDY STRATEGIES (Dunlosky 2013 ratings)
  // The classic meta-analysis: which study techniques actually work?
  // High-utility (always works), moderate-utility (works in some cases),
  // low-utility (popular but ineffective).
  // ─────────────────────────────────────────────────────────
  var STUDY_STRATEGIES = [
    { id: 'practice-testing', icon: '📝', name: 'Practice testing',
      utility: 'high', utilityLabel: '🟢 HIGH UTILITY',
      what: 'Self-test with practice questions. Flashcards, quizzes, free recall.',
      whyWorks: 'Direct application of the testing effect. Retrieval strengthens memory paths.',
      whenToUse: 'Always. The single highest-utility technique across ages, materials, and assessment types.',
      research: 'Dunlosky et al. 2013 — rated HIGH utility based on 100+ studies.' },
    { id: 'distributed-practice', icon: '📅', name: 'Distributed practice (spaced practice)',
      utility: 'high', utilityLabel: '🟢 HIGH UTILITY',
      what: 'Spread study sessions across multiple days instead of cramming.',
      whyWorks: 'Aligns with how memory consolidates over time. Forgetting + re-retrieving builds durable memory.',
      whenToUse: 'For anything you need to remember beyond the test. Cramming may help next-day performance but kills retention.',
      research: 'Dunlosky et al. 2013 — rated HIGH utility. Works across all age groups.' },
    { id: 'elaborative-interrogation', icon: '❓', name: 'Elaborative interrogation',
      utility: 'moderate', utilityLabel: '🟡 MODERATE UTILITY',
      what: 'Ask "why?" about facts you\'re learning. "Why is the sky blue? Why does this enzyme work?"',
      whyWorks: 'Forces connection to prior knowledge. Builds schema.',
      whenToUse: 'When you have prior knowledge to connect to. Less effective for completely new domains.',
      research: 'Dunlosky 2013 — moderate. More effective for high-prior-knowledge learners.' },
    { id: 'self-explanation', icon: '🗣️', name: 'Self-explanation',
      utility: 'moderate', utilityLabel: '🟡 MODERATE UTILITY',
      what: 'Explain concepts aloud or in writing as if teaching someone else (the "Feynman technique").',
      whyWorks: 'Forces gap-finding — you discover what you don\'t actually understand.',
      whenToUse: 'During study, especially after a worked example. Pause after each step + explain WHY.',
      research: 'Chi et al. (1989) showed strong effects for self-explanation while studying physics.' },
    { id: 'interleaved-practice', icon: '🔀', name: 'Interleaved practice',
      utility: 'moderate', utilityLabel: '🟡 MODERATE UTILITY',
      what: 'Mix problem types instead of doing all of one type then all of another.',
      whyWorks: 'Forces discrimination — you have to figure out WHICH approach to use, not just apply a known approach.',
      whenToUse: 'After initial blocked practice (solving 10 of one type) — interleave for transfer.',
      research: 'Rohrer + Taylor (2007). Interleaving math problems doubled long-term retention.' },
    { id: 'highlighting', icon: '🖍️', name: 'Highlighting / underlining',
      utility: 'low', utilityLabel: '🔴 LOW UTILITY',
      what: 'Marking text with highlighter or underlines while reading.',
      whyWorks: 'Creates illusion of engagement. Most students highlight too much. The act of marking doesn\'t encode info.',
      whenToUse: 'Sparingly, and only when paired with active recall later. Better: highlight LESS + write notes about what you highlighted.',
      research: 'Dunlosky 2013 — rated LOW utility. Particularly weak for younger students.' },
    { id: 'rereading', icon: '📖', name: 'Rereading',
      utility: 'low', utilityLabel: '🔴 LOW UTILITY',
      what: 'Reading the same material multiple times.',
      whyWorks: 'Creates fluency illusion (familiarity ≠ understanding). Diminishing returns after the first read.',
      whenToUse: 'Once is fine. Twice for very dense material. Beyond that = wasted time.',
      research: 'Dunlosky 2013 — rated LOW. Replace with practice testing for big gains.' },
    { id: 'summarization', icon: '📋', name: 'Summarization',
      utility: 'low', utilityLabel: '🔴 LOW UTILITY (with caveat)',
      what: 'Writing brief summaries of what you read.',
      whyWorks: 'Can be effective IF done well — but most students don\'t do it well without training.',
      whenToUse: 'After reading, write a summary FROM MEMORY (not while looking at text). This converts it to retrieval practice.',
      research: 'Dunlosky 2013 — low for typical use. Higher utility when paired with explicit summarization training.' },
    { id: 'cornell-notes', icon: '📓', name: 'Cornell note-taking',
      utility: 'moderate', utilityLabel: '🟡 STRUCTURE TECHNIQUE',
      what: '3-section page: cues (left column), notes (right column), summary (bottom). Notes during; cues + summary after.',
      whyWorks: 'Forces post-class processing (writing the summary + cue questions). The cue column becomes a built-in self-test.',
      whenToUse: 'Lecture-heavy classes. Especially valuable when you commit to the post-lecture review step.',
      research: 'Pauk, Walter (2007). How to Study in College. Less rigorous research base than testing/spacing, but the structure forces good practices.' },
    { id: 'sq3r', icon: '🔍', name: 'SQ3R reading method',
      utility: 'moderate', utilityLabel: '🟡 STRUCTURE TECHNIQUE',
      what: 'Survey, Question, Read, Recite, Review. A 5-step structured reading approach.',
      whyWorks: 'Pre-questioning activates prior knowledge. Recite + Review embed retrieval practice.',
      whenToUse: 'Textbook reading. The "Recite" step (close book, explain section) is where the retrieval-practice benefit comes in.',
      research: 'Robinson (1946). Older technique; the Recite + Review steps are the empirically-supported parts.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 8: GROWTH MINDSET (brief; deep dive in sel_tool_growthmindset.js)
  // ─────────────────────────────────────────────────────────
  var GROWTH_MINDSET_BRIEF = {
    coreIdea: 'Carol Dweck (Stanford). "Fixed mindset" = belief that intelligence + ability are static. "Growth mindset" = belief that ability develops with effort + learning + good strategies.',
    practical: [
      'Praise process not ability: "You worked through that hard problem" beats "You\'re so smart."',
      'Use "yet" framing: "I don\'t understand THIS YET" instead of "I don\'t understand."',
      'Frame failures as data: "What did this mistake teach me?"',
      'Notice fixed-mindset self-talk in yourself + others: "I\'m bad at math" → "I haven\'t learned math fluently yet."'
    ],
    honestCaveat: 'Growth mindset has had replication issues at scale. The original effect sizes were larger than what holds up in large pre-registered studies. The PRINCIPLES (effort matters, struggle is normal, ability develops) remain useful — but it\'s not the silver bullet some popular books suggest.',
    research: [
      'Dweck, C. S. (2006). Mindset: The New Psychology of Success.',
      'Sisk et al. (2018). Two systematic reviews + meta-analyses showing modest, variable effect sizes — particularly weak for older students + general populations.'
    ],
    seeAlso: 'sel_tool_growthmindset.js — full module with reflection prompts + AI growth coach. This brief module is a pointer; the deep work is there.'
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 9: NEUROMYTHS — beliefs that feel right but research rejects.
  // Critical for pre-service teachers + anyone designing instruction.
  // ─────────────────────────────────────────────────────────
  var NEUROMYTHS = [
    { id: 'learning-styles', icon: '🚫', name: 'Learning styles (visual/auditory/kinesthetic)',
      myth: 'Each person has a preferred "learning style"; teaching to that style improves learning.',
      truth: 'After 40+ years of research, NO RIGOROUS STUDY has shown that matching instruction to a learner\'s preferred style improves outcomes. Pashler et al. (2008) reviewed the literature for the journal Psychological Science in the Public Interest and concluded the evidence does not support the practice.',
      whyPersists: 'Intuitive (people DO have preferences). Marketed by educational products. "Learning style" inventories feel personal. But preference ≠ optimized learning.',
      whatToDoInstead: 'Use multiple modalities (UDL "multiple means of representation") for ALL students. Different content suits different formats — abstract concepts often need diagrams; procedures often need worked examples; etc. Match modality to content, not to the learner.',
      research: 'Pashler, H., McDaniel, M., Rohrer, D., & Bjork, R. (2008). Learning styles: Concepts and evidence. Psychological Science in the Public Interest, 9(3).' },
    { id: 'left-right-brain', icon: '🚫', name: 'Left-brain vs right-brain learners',
      myth: '"Left-brained" people are logical, analytical, math-oriented; "right-brained" people are creative, artistic, intuitive.',
      truth: 'The two hemispheres are highly interconnected. Almost every cognitive task uses both. Damage to one hemisphere shows specialization (e.g., language tends to lateralize to the left in most right-handers), but normal cognition is whole-brain.',
      whyPersists: 'Pop-psychology, marketing, simplicity. "Are you a left-brain or right-brain person?" is a fun quiz — it just doesn\'t describe how the brain works.',
      whatToDoInstead: 'Don\'t categorize learners by hemisphere. Acknowledge that humans have varied cognitive strengths + interests, and design instruction to engage multiple brain regions (which happens naturally with rich, multimodal content).',
      research: 'Nielsen et al. (2013). An evaluation of the left-brain vs. right-brain hypothesis with resting state functional connectivity MRI. PLoS ONE — found no evidence of left-dominant or right-dominant network usage.' },
    { id: '10-percent', icon: '🚫', name: 'We only use 10% of our brain',
      myth: 'Humans only use 10% of their brain; "unlocking" the rest enables superpowers.',
      truth: 'Functional brain imaging shows that virtually ALL of the brain is active over the course of a day. Different regions activate for different tasks, but no major region is silent. Damage to ANY 10% of brain tissue causes detectable deficits.',
      whyPersists: 'Plot device for movies (Limitless, Lucy). Self-help marketing. The phrase "We only use a small part of our potential" gets misremembered as "10% of our brain."',
      whatToDoInstead: 'Reject the premise. The path to better cognition is well-known: sleep, exercise, nutrition, distributed practice, retrieval, social interaction, intellectual challenge.',
      research: 'Boyd, R. (2008, Feb). Do people only use 10 percent of their brains? Scientific American — comprehensive debunking.' },
    { id: 'mozart-effect', icon: '🚫', name: 'Mozart effect makes you smarter',
      myth: 'Listening to Mozart makes you smarter; playing Mozart for babies improves cognitive development.',
      truth: 'The original 1993 Rauscher study found a SHORT-TERM (10-15 minute) modest improvement in spatial-reasoning tasks immediately after listening to Mozart vs silence. It did not show long-term IQ gains, did not test infants, and the effect didn\'t replicate consistently.',
      whyPersists: 'Single newspaper article in 1993 spawned a parenting industry. Georgia governor in 1998 distributed Mozart CDs to newborns. Simple, marketable.',
      whatToDoInstead: 'Music education has REAL benefits (motor skills, working memory, social development) — but those come from PLAYING music, not passively listening. The Mozart Effect specifically is overstated.',
      research: 'Rauscher, F., Shaw, G., & Ky, K. (1993). Music and spatial task performance. Nature, 365 — original study. Pietschnig et al. (2010) meta-analysis found near-zero effect.' },
    { id: 'multiple-intelligences', icon: '⚠️', name: 'Multiple intelligences (Gardner 1983)',
      myth: 'Howard Gardner\'s theory: 8 distinct "intelligences" (linguistic, logical, spatial, musical, bodily-kinesthetic, interpersonal, intrapersonal, naturalistic).',
      truth: 'Popular but weakly empirical. Gardner himself acknowledges these are theoretical + based on case-study evidence, not factor-analytic data. Standard intelligence research finds a strong general factor (g) underlying most cognitive abilities — not 8 independent ones. The "intelligences" are better described as INTERESTS or DOMAIN-SPECIFIC SKILLS.',
      whyPersists: 'Validates students who don\'t fit the IQ-test mold. Aligns with educators\' belief that all students have strengths. The framing is humane + popular.',
      whatToDoInstead: 'Continue celebrating diverse student strengths — but don\'t classify them as separate intelligences. Use the language of interests, talents, and domain expertise instead.',
      research: 'Waterhouse, L. (2006). Multiple intelligences, the Mozart effect, and emotional intelligence: A critical review. Educational Psychologist, 41(4).' },
    { id: 'brain-training', icon: '🚫', name: 'Brain-training games (Lumosity, BrainHQ) make you smarter',
      myth: 'Games like Lumosity transfer to general intelligence + everyday cognitive function.',
      truth: 'Brain-training games make you BETTER at the games themselves. Transfer to other tasks (working memory in real life, school performance) is minimal. The FTC fined Lumosity $2 million in 2016 for deceptive advertising about cognitive benefits.',
      whyPersists: 'Lucrative business. The improvement-on-the-game-itself feels real (and it is — for that game). Marketing implies broad transfer.',
      whatToDoInstead: 'Practice the actual skill you want to improve. To improve at math, do math. To improve memory in general, use practice testing + spaced repetition with REAL content.',
      research: 'Stanford Center on Longevity (2014). Consensus statement on brain-training. Simons et al. (2016). Do "brain-training" programs work? Psychological Science in the Public Interest, 17(3).' },
    { id: 'gendered-learning', icon: '⚠️', name: 'Boys + girls learn differently',
      myth: 'Boys and girls have fundamentally different brains + learn differently; classrooms should be sex-segregated to optimize for each.',
      truth: 'Average sex differences in cognitive abilities are SMALL relative to within-sex variation. There\'s far more variation among boys and among girls than between average boy + average girl. Single-sex education has not been shown to consistently outperform coed.',
      whyPersists: 'Books like "The Female Brain" + "Boys Adrift" sell well. Easy mental shortcut. Genuine differences in interests + behavior get over-interpreted as cognitive differences.',
      whatToDoInstead: 'Teach to individual differences, not group averages. Provide multiple paths into content (UDL). Watch for stereotype threat (when reminding kids of stereotypes hurts performance).',
      research: 'Halpern, D. F. et al. (2011). The pseudoscience of single-sex schooling. Science, 333(6050).' },
    { id: 'critical-periods', icon: '⚠️', name: 'Critical periods after which you can\'t learn',
      myth: 'After certain ages (e.g., 3 for language, 12 for music), the brain "closes" and you can\'t learn that thing well.',
      truth: 'Some cognitive functions DO have sensitive periods (e.g., native-accent acquisition; binocular vision). But adult brains remain plastic; adults can learn new languages, instruments, skills — typically slower than children but not impossibly. Most "critical periods" claims are overstated.',
      whyPersists: 'Some narrow critical periods are real (binocular vision must develop in early childhood or it doesn\'t form). The principle gets generalized too broadly.',
      whatToDoInstead: 'Don\'t tell adult learners they\'ve "missed their window." Most learning is age-flexible. Adults bring metacognition, vocabulary, and motivation that children lack.',
      research: 'Birdsong, D. (2018). Plasticity, variability and age in second language acquisition. Frontiers in Psychology, 9.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 10: EDUCATION CAREERS (Aaron's domain)
  // ─────────────────────────────────────────────────────────
  var ED_CAREERS = [
    { id: 'k12-teacher', icon: '🍎', name: 'K-12 Teacher',
      what: 'Lead classroom instruction, assess students, communicate with families, collaborate with colleagues.',
      degree: 'Bachelor\'s in Education OR bachelor\'s + teacher-prep program. State certification required.',
      pay: 'Maine: $42K starting; $55-75K mid-career; $80K+ at top of district scale + advanced degree. National avg ~$66K.',
      mainePath: 'USM, UMaine, UMF (University of Maine at Farmington — strong teacher prep), UNE all have ed programs. Maine teacher cert via DOE.',
      good: 'Direct daily impact. Stable schedule (summers + breaks). Pension. Master\'s pay bump.',
      hard: 'Workload is real (lesson plans, grading, parent comms, IEPs). Pay is modest vs other professional fields. Burnout is a risk.' },
    { id: 'special-ed-teacher', icon: '♿', name: 'Special Education Teacher',
      what: 'Teach students with disabilities; write + manage IEPs; collaborate with general-ed teachers, parents, related-service providers.',
      degree: 'Bachelor\'s + Special Ed certification. Many programs offer dual general/special-ed cert.',
      pay: 'Similar to K-12 ($42-80K Maine). High demand often = signing bonuses or loan-forgiveness programs.',
      mainePath: 'Same Maine programs as K-12 + special-ed concentration. UMaine has a strong Special Education program.',
      good: 'Smaller caseloads (typically 8-15 students). Deep relationships. Federal demand = strong job security.',
      hard: 'Paperwork burden (IEPs are legally-binding documents). Emotional load. Co-teaching coordination.' },
    { id: 'school-psychologist', icon: '🧠', name: 'School Psychologist',
      what: 'Cognitive + academic + social-emotional assessment. IEP eligibility decisions. Crisis response. Consultation with teachers + families. (Aaron\'s path.)',
      degree: 'Specialist degree (Ed.S., 60+ credits beyond bachelor\'s) OR doctorate (Ph.D., Psy.D., Ed.D.). NCSP credential.',
      pay: 'Maine: $60-90K specialist-level; $80-120K doctoral. Some districts pay more for shortage roles.',
      mainePath: 'UMaine has a school psychology specialist + doctoral program. Out-of-state options for Psy.D. (William James College, etc.).',
      good: 'Deep clinical work. Direct impact on students who need it most. Less classroom management burden.',
      hard: 'Heavy assessment caseload in many districts (40+ evals/year). Travel between schools common. Emotional weight of crisis cases.' },
    { id: 'school-counselor', icon: '🤝', name: 'School Counselor',
      what: 'Academic planning + advising. Social-emotional support. College + career counseling. Crisis response.',
      degree: 'Master\'s in School Counseling. State certification required.',
      pay: 'Maine: $55-85K. Often follows teacher salary scale.',
      mainePath: 'USM + UMaine offer school counseling master\'s programs.',
      good: 'Lower paperwork than school psych. Broad student-relationship building.',
      hard: 'Often understaffed (one counselor for 400+ students). Caseload + crisis response burden.' },
    { id: 'slp', icon: '🗣️', name: 'Speech-Language Pathologist (SLP)',
      what: 'Diagnose + treat communication disorders. Articulation, language, fluency, voice, swallowing.',
      degree: 'Master\'s in Speech-Language Pathology. CCC-SLP credential. Praxis exam. Clinical fellowship year.',
      pay: 'Maine: $65-95K school setting; $75-110K medical setting. Some travel-SLP roles 6-figures.',
      mainePath: 'UMaine has a strong CSD (Communication Sciences and Disorders) undergraduate. Master\'s often out-of-state (Boston, Northeastern, etc.).',
      good: 'High demand nationally. Flexible settings (school, clinic, hospital, telehealth). Specialized work.',
      hard: 'Master\'s degree + clinical fellowship is 2-3 years post-bachelor\'s. Caseloads can be heavy.' },
    { id: 'ot', icon: '✋', name: 'Occupational Therapist (OT)',
      what: 'Help students access curriculum + daily living through fine-motor, sensory, executive function support.',
      degree: 'Master\'s OR doctorate (OTD) in Occupational Therapy. NBCOT certification.',
      pay: 'Maine: $65-95K school setting. Higher in hospital + clinic settings.',
      mainePath: 'UNE has an OT doctoral program. Husson University also.',
      good: 'Hands-on work. Variety of settings. Strong job market.',
      hard: 'Long degree path (master\'s or doctoral). Documentation burden in school setting.' },
    { id: 'bcba', icon: '📊', name: 'BCBA (Board Certified Behavior Analyst)',
      what: 'Apply principles of applied behavior analysis (ABA) to support students, especially with autism spectrum or behavioral challenges. Functional behavior assessments + behavior plans.',
      degree: 'Master\'s + BCBA-required coursework + 1500-2000 supervised hours + national exam.',
      pay: 'Maine: $65-100K school setting; up to $130K private/clinic. High demand.',
      mainePath: 'Less common in Maine schools but growing. ABA certification programs available online + at out-of-state universities.',
      good: 'Strong demand. Direct measurable impact. Specialized expertise.',
      hard: 'Long credential path. ABA can be intense + politically contested in disability community (some autistic self-advocates have concerns).' },
    { id: 'instructional-designer', icon: '🎨', name: 'Instructional Designer',
      what: 'Design learning experiences for K-12, higher ed, corporate, or military training. Often UDL-aligned. May or may not be classroom-based.',
      degree: 'Master\'s in Instructional Design / Educational Technology / Learning Sciences. Some bachelor\'s-level roles in corporate.',
      pay: 'K-12: $50-75K. Higher ed: $55-80K. Corporate/tech: $75-150K+.',
      mainePath: 'UMaine has educational technology programs. Many corporate jobs are remote.',
      good: 'High demand in corporate L&D. Creative work. Often remote.',
      hard: 'Path is less standardized than teaching. Job titles vary widely.' },
    { id: 'curriculum-designer', icon: '📚', name: 'Curriculum Designer',
      what: 'Develop curriculum, scope-and-sequence documents, lesson units. Often paired with publishers (textbook companies) or districts.',
      degree: 'Master\'s + classroom teaching experience typical. Sometimes content-area expertise (math, science, ELA).',
      pay: 'District role: $65-95K. Publisher: $70-110K.',
      mainePath: 'Through teaching first, then advanced degree (curriculum + instruction master\'s).',
      good: 'Use teaching expertise without daily classroom management. Scale impact across many classrooms.',
      hard: 'Often requires significant prior teaching experience to be credible.' },
    { id: 'ed-researcher', icon: '🔬', name: 'Educational Researcher',
      what: 'Conduct research on teaching + learning. University, think tank, government (Department of Education, IES), or non-profit.',
      degree: 'Doctorate (Ph.D. or Ed.D.) typical. Some research-associate roles for master\'s holders.',
      pay: 'Postdoc: $50-65K. Tenure-track faculty: $70-120K. Senior research scientist: $100-160K.',
      mainePath: 'UMaine + USM have doctoral programs in education + educational research. Out-of-state options (Harvard GSE, BC, BU, Brown, etc.) common.',
      good: 'Influence policy + practice. Intellectual freedom.',
      hard: 'Long training (5-7 years post-bachelor\'s). Tenure-track jobs scarce. "Publish or perish."' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 11: MAINE EDUCATION PROGRAMS — degree pathways
  // ─────────────────────────────────────────────────────────
  var MAINE_ED_PROGRAMS = [
    { name: 'University of Maine (UMaine, Orono)', loc: 'Orono',
      programs: 'College of Education + Human Development. Bachelor\'s + master\'s + doctoral in education, school psychology (specialist + doctoral), special education, kinesiology, counselor education, communication sciences + disorders.',
      strength: 'Largest research university in Maine. School psychology specialist program is the main in-state option.',
      url: 'https://umaine.edu/edhd/' },
    { name: 'University of Southern Maine (USM)', loc: 'Portland / Gorham / Lewiston',
      programs: 'College of Education and Human Development. Teacher prep (elementary, secondary, special ed). Master\'s in counseling, literacy, instructional leadership.',
      strength: 'Closest urban-area teacher-prep pipeline. Strong fieldwork placements in greater Portland schools.',
      url: 'https://usm.maine.edu/cehd/' },
    { name: 'University of Maine at Farmington (UMF)', loc: 'Farmington',
      programs: 'Founded 1864 as Maine\'s first teacher-prep school. Strong elementary + early childhood + secondary teacher prep. Special education concentration.',
      strength: 'Maine\'s oldest dedicated teacher-prep institution. Smaller, focused.',
      url: 'https://www.umf.maine.edu/academics/programs/' },
    { name: 'University of New England (UNE)', loc: 'Biddeford / Portland',
      programs: 'Occupational Therapy (OTD), social work, applied behavior analysis, nursing. Less education focus than other programs.',
      strength: 'Allied health programs (OT, PT, SW) that work in schools.',
      url: 'https://www.une.edu/' },
    { name: 'Husson University', loc: 'Bangor',
      programs: 'Occupational therapy. Counseling + psychology programs.',
      strength: 'OT + counseling alternatives in eastern Maine.',
      url: 'https://www.husson.edu/' },
    { name: 'Maine Department of Education — Teacher Certification', loc: 'Statewide',
      programs: 'Maine Educator Certification process. Conditional certification + Educator Effectiveness System.',
      strength: 'Official cert pathway. Conditional cert available for content-area experts entering teaching mid-career.',
      url: 'https://www.maine.gov/doe/cert' },
    { name: 'Maine Education Association (MEA)', loc: 'Statewide',
      programs: 'Professional organization. Advocacy, collective bargaining, professional development.',
      strength: 'Major teacher union + professional resource in Maine.',
      url: 'https://maineea.org/' },
    { name: 'EL Education (Expeditionary Learning)', loc: 'King Middle School Portland + 150 schools',
      programs: 'Whole-school + curriculum model centered on Crew (advisory + character education) + HOWLs (Habits of Work and Learning) + Expeditions (long-term project-based learning units).',
      strength: 'Strong tradition in Maine schools. King Middle is a flagship EL school. Pairs naturally with UDL — many of the moves are convergent.',
      url: 'https://eleducation.org/' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 12: RESOURCES — primary sources + free + paid
  // ─────────────────────────────────────────────────────────
  var RESOURCES = {
    udl: [
      { name: 'CAST UDL Guidelines (3.0, 2024)', contact: 'udlguidelines.cast.org', desc: 'Authoritative source for UDL framework. Free.', url: 'https://udlguidelines.cast.org/' },
      { name: 'CAST.org', contact: 'cast.org', desc: 'Center for Applied Special Technology — UDL pioneers. Research, resources, workshops.', url: 'https://www.cast.org/' }
    ],
    research: [
      { name: 'Dunlosky et al. 2013 — Improving students\' learning with effective learning techniques', contact: 'PSPI 14(1)', desc: 'Meta-review of 10 study techniques. THE go-to source on what works. Free PDF online.', url: 'https://www.psychologicalscience.org/journals/pspi/PSPI_14_1.pdf' },
      { name: 'Pashler et al. 2008 — Learning styles: concepts and evidence', contact: 'PSPI 9(3)', desc: 'The classic learning-styles debunking. Free PDF.', url: 'https://www.psychologicalscience.org/journals/pspi/PSPI_9_3.pdf' },
      { name: 'Roediger + Karpicke 2006 — Test-enhanced learning', contact: 'Psychological Science 17(3)', desc: 'Foundational testing-effect study. Available via DOI.', url: null },
      { name: 'Sweller 1988 — Cognitive load during problem solving', contact: 'Cognitive Science 12(2)', desc: 'Original cognitive-load theory paper. Library access typical.', url: null }
    ],
    practical: [
      { name: 'Anki', contact: 'apps.ankiweb.net', desc: 'Free + open-source spaced-repetition flashcards. Steep learning curve but powerful.', url: 'https://apps.ankiweb.net/' },
      { name: 'Quizlet', contact: 'quizlet.com', desc: 'User-friendly flashcards with spaced-repetition mode. Free tier + paid.', url: 'https://quizlet.com/' },
      { name: 'Learning Scientists Blog', contact: 'learningscientists.org', desc: 'Six learning strategies posters + podcasts + free resources from cognitive psychologists.', url: 'https://www.learningscientists.org/' },
      { name: 'Make It Stick (Brown, Roediger, McDaniel 2014)', contact: 'book', desc: 'Accessible introduction to retrieval practice + spaced repetition for general audience.', url: null }
    ],
    careers: [
      { name: 'NASP — National Association of School Psychologists', contact: 'nasponline.org', desc: 'Professional org. NCSP credential info. Career resources.', url: 'https://www.nasponline.org/' },
      { name: 'ASHA — American Speech-Language-Hearing Association', contact: 'asha.org', desc: 'SLP professional org. CCC-SLP credential info.', url: 'https://www.asha.org/' },
      { name: 'AOTA — American Occupational Therapy Association', contact: 'aota.org', desc: 'OT professional org.', url: 'https://www.aota.org/' },
      { name: 'BACB — Behavior Analyst Certification Board', contact: 'bacb.com', desc: 'BCBA credential standards + exam info.', url: 'https://www.bacb.com/' }
    ],
    maine: [
      { name: 'Maine Department of Education', contact: 'maine.gov/doe', desc: 'Official Maine education info, certification, accountability data.', url: 'https://www.maine.gov/doe/' },
      { name: 'Maine Education Association', contact: 'maineea.org', desc: 'Maine teachers union. Career, salary, advocacy resources.', url: 'https://maineea.org/' },
      { name: 'Maine Association of School Psychologists', contact: 'maineschoolpsychs.org', desc: 'In-state professional org for school psychologists.', url: null }
    ]
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 13: KNOWLEDGE QUIZ — 40 questions across all modules
  // ─────────────────────────────────────────────────────────
  var QUIZ = [
    { id: 'q1', icon: '🧠',
      stem: 'In Bloom\'s Taxonomy (revised 2001), which level represents the LOWEST cognitive demand?',
      choices: ['Apply', 'Remember', 'Analyze', 'Create'],
      correct: 1, why: 'Remember (level 1) = recall facts + basic recognition. The lowest demand. Foundation for higher levels but insufficient on its own.' },
    { id: 'q2', icon: '💡',
      stem: 'A teacher writes the objective: "Students will UNDERSTAND photosynthesis." What\'s the problem?',
      choices: ['Photosynthesis is too hard', '"Understand" is vague + hard to measure. Use a measurable verb at the target Bloom\'s level (e.g., "Explain photosynthesis in their own words" or "Compare photosynthesis with cellular respiration").', 'It\'s too easy', 'Should be lowercase'],
      correct: 1, why: 'Bloom\'s verbs are designed to be measurable. "Understand" is the level-2 category but not a measurable verb. Use specific verbs like "explain," "describe," "summarize."' },
    { id: 'q3', icon: '🎨',
      stem: 'A student writes a sonnet using a fresh metaphor about a topic the teacher never raised. Which Bloom\'s level?',
      choices: ['Remember', 'Apply', 'Analyze', 'Create'],
      correct: 3, why: 'Producing original work that synthesizes prior learning into something new = Create (level 6). Highest demand.' },
    { id: 'q4', icon: '⚖️',
      stem: 'Cognitive Load Theory says working memory holds approximately how many novel chunks at once?',
      choices: ['1-2', '4 ± 1 (Cowan 2001)', '15-20', '50+'],
      correct: 1, why: 'Cowan (2001) refined Miller\'s "7 ± 2." Under load with novel material, working memory holds about 4 chunks. Beyond that, info must be chunked or externalized.' },
    { id: 'q5', icon: '🚫',
      stem: 'A worksheet has tiny text + busy decorative graphics + cartoons unrelated to the topic. What kind of cognitive load is this creating?',
      choices: ['Intrinsic load (the math itself is hard)', 'Extraneous load (poor design wastes working memory)', 'Germane load (productive)', 'No effect'],
      correct: 1, why: 'Extraneous load = wasted cognitive effort caused by poor design. Strip decoration; remove split-attention; use clean typography to free working memory for the actual task.' },
    { id: 'q6', icon: '🔍',
      stem: 'You\'re studying for a test. After every chapter section, you close the book + try to summarize the main points from memory. This is...',
      choices: ['Rereading (low utility)', 'Highlighting (low utility)', 'Retrieval practice + self-explanation (HIGH utility)', 'Cramming'],
      correct: 2, why: 'Closed-book recall = retrieval practice. Combined with putting the ideas in your own words = self-explanation. Two of the highest-utility strategies in the Dunlosky 2013 review.' },
    { id: 'q7', icon: '📅',
      stem: 'You have a final exam in 2 weeks + 10 hours of total study time. What\'s the most evidence-backed plan?',
      choices: ['Cram all 10 hours the night before', 'Distribute the 10 hours across 5-7 sessions over 2 weeks (spaced practice + interleaving)', 'Just reread the textbook 3 times', 'Highlight the textbook'],
      correct: 1, why: 'Distributed practice (spacing) is one of two HIGH-utility techniques in Dunlosky 2013. Spreading study sessions creates spaced retrieval, which dramatically improves long-term retention.' },
    { id: 'q8', icon: '🗺️',
      stem: 'The 3 phases of metacognition are:',
      choices: ['Read, write, repeat', 'Planning, monitoring, evaluating', 'Quiz, study, sleep', 'Talk, think, listen'],
      correct: 1, why: 'Metacognition = planning (before: what\'s my goal + plan?), monitoring (during: am I on track?), evaluating (after: what worked + what would I change?).' },
    { id: 'q9', icon: '🤝',
      stem: 'A student can solve a math problem WITH a teacher\'s scaffolded prompts but not yet alone. According to Vygotsky, this task is in the student\'s...',
      choices: ['Comfort zone', 'Zone of Proximal Development (ZPD)', 'Frustration zone', 'Learning style'],
      correct: 1, why: 'ZPD = what a learner can do with help that they can\'t yet do alone. The "sweet spot" for instruction. Tasks the student can already do alone = wasted instructional time. Tasks too far above = frustration without learning.' },
    { id: 'q10', icon: '🚫',
      stem: 'A teacher administers a "VAK learning styles" inventory to her class + groups visual learners together. What does the research say?',
      choices: ['Excellent practice', 'There\'s NO RIGOROUS EVIDENCE that matching instruction to a learner\'s preferred style improves outcomes (Pashler et al. 2008). Use multimodal instruction for ALL students.', 'Highly effective', 'Worth trying'],
      correct: 1, why: 'Pashler et al. (2008) reviewed 40+ years of literature for the journal Psychological Science in the Public Interest + concluded the meshing hypothesis is not supported. Use multiple modalities (UDL) for everyone.' },
    { id: 'q11', icon: '⚖️',
      stem: 'CAST UDL Guidelines 3.0 are organized around 3 principles. They are:',
      choices: ['Reading, Writing, Math', 'Engagement, Representation, Action+Expression', 'Theory, Practice, Application', 'Visual, Auditory, Kinesthetic'],
      correct: 1, why: 'UDL: Multiple means of ENGAGEMENT (the WHY of learning), REPRESENTATION (the WHAT), and ACTION+EXPRESSION (the HOW). Each principle has 3 guidelines = 9 total.' },
    { id: 'q12', icon: '🔥',
      stem: 'A student says "I\'m not a math person." This is a fixed-mindset utterance. A growth-mindset reframe is:',
      choices: ['You should give up', '"I haven\'t learned this YET" — the "yet" framing reasserts that ability develops with effort + good strategies.', 'Math is silly', 'Switch to art'],
      correct: 1, why: 'Dweck\'s "yet" framing converts a fixed-mindset claim ("I\'m bad at X") into a growth-mindset claim ("I haven\'t learned X yet"). Reasserts that ability is developable.' },
    { id: 'q13', icon: '⚠️',
      stem: 'Honest about growth mindset research:',
      choices: ['It\'s a perfect silver bullet', 'It has had replication issues at scale; effect sizes in large pre-registered studies are smaller than original; the principles remain useful but it\'s not magic', 'Doesn\'t work at all', 'Only works in California'],
      correct: 1, why: 'Sisk et al. (2018) meta-analyses showed modest, variable effects. The principles (effort matters, struggle is normal) remain useful but the original claims were oversold by popular books.' },
    { id: 'q14', icon: '🚫',
      stem: 'Brain-training games like Lumosity claim to improve general intelligence. Research finding?',
      choices: ['They make you smarter overall', 'They make you better at the games themselves; transfer to other tasks is minimal. The FTC fined Lumosity $2M for deceptive advertising.', 'They cure forgetfulness', 'They\'re scientifically proven'],
      correct: 1, why: 'Stanford Center on Longevity 2014 + Simons et al. 2016 reviewed the evidence: minimal far-transfer. Lumosity settled an FTC complaint for $2M in 2016.' },
    { id: 'q15', icon: '⚠️',
      stem: 'Howard Gardner\'s "Multiple Intelligences" (linguistic, logical, spatial, musical, etc.) is best characterized as:',
      choices: ['Rigorously evidence-based', 'Popular + intuitive but weakly empirical. Standard intelligence research finds a strong general factor (g), not 8 independent intelligences.', 'Required by law', 'Always wrong'],
      correct: 1, why: 'Multiple Intelligences is theoretically interesting + humane (celebrates diverse strengths) but does not hold up to factor-analytic validation. Better to use language of "interests" or "domain-specific skills."' },
    { id: 'q16', icon: '📝',
      stem: 'Of these 4 study techniques, which has the HIGHEST evidence-backed utility (per Dunlosky 2013)?',
      choices: ['Highlighting', 'Rereading', 'Practice testing (self-quizzing, flashcards)', 'Summarization'],
      correct: 2, why: 'Practice testing was rated HIGH utility — works across age groups, materials, + assessment types. Highlighting + rereading + summarization were rated LOW.' },
    { id: 'q17', icon: '📓',
      stem: 'Cornell note-taking has 3 sections. They are:',
      choices: ['Title, body, footer', 'Cues column (left) | Notes (right) | Summary (bottom)', 'Author, date, page', 'Random arrangement'],
      correct: 1, why: 'Cornell: cues + questions on the left, detailed notes on the right (during class), summary at the bottom (after class). The cues column becomes a built-in self-test.' },
    { id: 'q18', icon: '🔀',
      stem: 'Solving 10 algebra problems in a row, then 10 geometry problems = blocked practice. Mixing them up = interleaved practice. What does interleaving do?',
      choices: ['Hurts learning', 'Forces discrimination — you have to figure out WHICH approach to use, not just apply a known one. Improves long-term retention + transfer.', 'Has no effect', 'Tires the student'],
      correct: 1, why: 'Rohrer + Taylor 2007 doubled long-term retention by interleaving math problem types. Forces students to recognize the problem type before applying a method — a real-world skill.' },
    { id: 'q19', icon: '🧠',
      stem: 'What\'s the "illusion of fluency" + why does it matter?',
      choices: ['A magic trick', 'When familiarity from rereading feels like understanding — but you can\'t actually use the knowledge. Why retrieval practice beats rereading.', 'Reading too fast', 'Not real'],
      correct: 1, why: 'Rereading creates familiarity, which the brain interprets as "I know this." Familiarity ≠ knowledge. Solution: replace 50% of "rereading" time with retrieval practice.' },
    { id: 'q20', icon: '🎓',
      stem: 'Aaron is a school psychologist. His career path requires which degree minimum?',
      choices: ['Bachelor\'s', 'Specialist degree (Ed.S., 60+ credits beyond bachelor\'s) OR doctorate. Plus NCSP credential + state certification.', 'High school', 'Master\'s in any field'],
      correct: 1, why: 'School psych in most states (including Maine) requires a Specialist degree minimum (Ed.S.) — about 60 credits beyond bachelor\'s, including a year-long internship. Many also pursue doctorate (Psy.D., Ph.D., Ed.D.).' },
    { id: 'q21', icon: '🌲',
      stem: 'Which Maine institution is the largest research university with a school psychology specialist + doctoral program?',
      choices: ['UMF', 'UMaine (Orono)', 'UNE', 'Husson'],
      correct: 1, why: 'UMaine in Orono has the College of Education and Human Development, including school psychology specialist + doctoral programs. UMF has strong teacher-prep but no doctoral school-psych program.' },
    { id: 'q22', icon: '🏫',
      stem: 'EL Education is a curriculum + school model with strong tradition in Maine. What does it center?',
      choices: ['Standardized testing', 'Crew (advisory + character) + HOWLs (Habits of Work and Learning) + Expeditions (long-term project-based learning)', 'Lecture-only instruction', 'Online learning'],
      correct: 1, why: 'EL Education = Crew + HOWLs + Expeditions. King Middle School in Portland is a flagship EL school. Pairs naturally with UDL — many moves converge (multimodal expression, choice, character development).' },
    { id: 'q23', icon: '📊',
      stem: 'A teacher gives every Friday quiz returning the next Monday with feedback. Why is this effective?',
      choices: ['Punishment', 'Combines retrieval practice + feedback + spaced repetition. Three of the most-evidence-backed practices working together.', 'Wastes class time', 'Stressful only'],
      correct: 1, why: 'Frequent low-stakes quizzes implement: retrieval practice (testing), spaced repetition (cumulative content), and feedback. This combination produces some of the largest gains in education research.' },
    { id: 'q24', icon: '🔬',
      stem: 'What\'s the difference between FORMATIVE and SUMMATIVE assessment?',
      choices: ['No difference', 'Formative = checks understanding DURING learning to adjust instruction. Summative = measures learning AT THE END for grades.', 'Same thing', 'Random labels'],
      correct: 1, why: 'Formative assessment = "for learning" (exit tickets, quick checks, drafts with feedback). Summative = "of learning" (final exam, end-of-unit project). Both have a place; effective teachers use much more formative than summative.' },
    { id: 'q25', icon: '💡',
      stem: 'A teacher uses Pearson + Gallagher\'s "I do / We do / You do" framework. This is an example of:',
      choices: ['Random pairing', 'Gradual release of responsibility — a scaffolding sequence that transfers cognitive load from teacher to student over time.', 'Lecture', 'Group work'],
      correct: 1, why: 'I do (teacher modeling) → We do (joint practice) → You do (independent). Pearson + Gallagher (1983). Standard scaffolding sequence that fades support as competence grows.' },
    { id: 'q26', icon: '🚫',
      stem: 'The "Mozart effect" claims listening to Mozart makes you smarter. What does the research show?',
      choices: ['Massive IQ gains', 'Original 1993 study found a brief (10-15 min) modest improvement on spatial-reasoning tasks vs silence. Did NOT show long-term IQ gains. Subsequent meta-analyses show near-zero effect.', 'Mozart is anti-learning', 'It only works on Tuesdays'],
      correct: 1, why: 'The original effect was small + transient. Pietschnig et al. 2010 meta-analysis found near-zero effect. The PARENTING industry that grew from this is largely overhyped. Music education benefits come from PLAYING, not passive listening.' },
    { id: 'q27', icon: '🚫',
      stem: '"We only use 10% of our brain" — what does brain imaging actually show?',
      choices: ['It\'s exactly correct', 'Functional imaging shows essentially ALL brain regions activate over the course of a day. No major region is silent. Damage to ANY 10% of brain tissue causes deficits.', 'We use 5%', 'Plot of a movie, not science'],
      correct: 1, why: 'fMRI + PET scans show brain activity throughout. The "10%" myth is plot device for movies (Limitless, Lucy) + self-help marketing. Reject the premise. Path to better cognition: sleep + exercise + practice testing + spaced repetition.' },
    { id: 'q28', icon: '⚖️',
      stem: 'A teacher wants to design a lesson that respects working-memory limits. Best practice?',
      choices: ['Pack as much info as possible into one session', 'Sequence simple → complex; pre-teach prerequisites; use worked examples before independent practice; remove decorative clutter; chunk info into 4-or-fewer pieces at a time.', 'Use big text only', 'Ignore'],
      correct: 1, why: 'Cognitive Load Theory in practice: manage intrinsic load (sequencing + prereqs); minimize extraneous load (clean design, no clutter); maximize germane load (varied practice, self-explanation).' },
    { id: 'q29', icon: '🗣️',
      stem: 'The "Feynman technique" for studying is:',
      choices: ['Reading the textbook many times', 'Explaining the concept aloud as if teaching it to someone else, in plain language. When you stumble, you\'ve found a knowledge gap.', 'Watching videos', 'Highlighting'],
      correct: 1, why: 'Feynman technique = self-explanation in plain language. Forces you to confront what you don\'t actually understand. Connects to retrieval practice + elaborative interrogation.' },
    { id: 'q30', icon: '⚠️',
      stem: 'A school decides to separate boys and girls into single-sex classrooms claiming "boys and girls learn differently." Research basis?',
      choices: ['Strong evidence', 'Average sex differences in cognitive abilities are SMALL relative to within-sex variation. Single-sex education hasn\'t consistently outperformed coed. Halpern et al. (2011) called single-sex schooling claims "pseudoscience."', 'Always works', 'Required by law'],
      correct: 1, why: 'Halpern et al. (2011) in Science directly addressed this: claims of sex-based brain differences justifying single-sex schooling are not supported by rigorous research. There\'s far more variation within each sex than between average boy + average girl.' },
    { id: 'q31', icon: '🎯',
      stem: 'A UDL-aligned lesson on photosynthesis offers students 3 ways to demonstrate learning: (a) write an essay, (b) record a video explanation, (c) draw a diagram with annotations. Which UDL principle is this?',
      choices: ['Engagement', 'Representation', 'Action + Expression', 'Self-regulation'],
      correct: 2, why: 'Multiple means of ACTION + EXPRESSION = multiple ways to show what you\'ve learned. Different output channels accommodate different students\' strengths + access needs.' },
    { id: 'q32', icon: '🎯',
      stem: 'A teacher provides a topic but lets students choose which sub-question to investigate. Which UDL principle is this?',
      choices: ['Engagement (recruiting interest, optimizing choice + autonomy)', 'Representation', 'Action + Expression', 'Random'],
      correct: 0, why: 'Choice + autonomy is in UDL guideline 7.1 (Recruiting interest), under the ENGAGEMENT principle (the WHY of learning). Choice increases motivation + ownership.' },
    { id: 'q33', icon: '🎯',
      stem: 'A platform offers text-to-speech, font sizing, line spacing, and color overlays for the same content. Which UDL principle is this?',
      choices: ['Engagement', 'Representation (perception)', 'Action + Expression', 'None'],
      correct: 1, why: 'Multiple means of REPRESENTATION = presenting info in different ways. Perception (1.1 in UDL guidelines) covers customization of display, auditory + visual alternatives. ImmersiveReader is exactly this.' },
    { id: 'q34', icon: '🍎',
      stem: 'Maine teacher salary range (mid-career, master\'s degree, 2025):',
      choices: ['$25-35K', '$55-75K (advancing to $80K+ at top of district scale + advanced degree)', '$200K+', '$5K'],
      correct: 1, why: 'Maine teachers: ~$42K starting; $55-75K mid-career; $80K+ at top of district scale + master\'s + experience. Modest pay vs other professional fields, but pension + summers + master\'s pay bump.' },
    { id: 'q35', icon: '🤝',
      stem: 'You\'re an SLP candidate in Maine. What\'s a typical credential path?',
      choices: ['Online certificate only', 'Bachelor\'s in Communication Sciences + Disorders → Master\'s in SLP → Praxis exam → Clinical Fellowship Year → CCC-SLP credential', 'No degree needed', 'Random courses'],
      correct: 1, why: 'CCC-SLP requires master\'s degree + clinical fellowship year + national exam (Praxis) + ASHA certification. UMaine has a strong CSD undergraduate program; master\'s often out-of-state.' },
    { id: 'q36', icon: '📚',
      stem: 'You read a chapter, close the book, and write down everything you remember. This is:',
      choices: ['Free recall (a strong retrieval-practice technique)', 'Cheating', 'Daydreaming', 'Highlighting'],
      correct: 0, why: 'Free recall = retrieval practice in its purest form. Open the book afterward to identify what you missed. Strengthens memory paths to that info.' },
    { id: 'q37', icon: '⏰',
      stem: 'The Ebbinghaus forgetting curve shows:',
      choices: ['Memory is permanent', 'Without practice, ~50% of new info is forgotten within 1 hour, ~70% within 24 hours, ~80% within 1 week. Each successful retrieval flattens the curve.', 'Older = better at remembering', 'Memory only forms during sleep'],
      correct: 1, why: 'Ebbinghaus 1885. Memory decays exponentially without practice. Spaced retrieval flattens the curve, making info increasingly stable.' },
    { id: 'q38', icon: '🌳',
      stem: 'You\'re NEW to thinking about how learning works. Where should you start?',
      choices: ['Random tabs', 'The 4 Foundation modules first: Bloom\'s, Cognitive Load, Metacognition, ZPD. Then UDL framework. Then study strategies. Then careers.', 'Just take the quiz', 'Skip everything'],
      correct: 1, why: 'The Foundation modules give you the vocabulary + mental models to make sense of UDL + study strategies. Most people benefit from starting with Bloom\'s (the most common pedagogical framework educators reference).' },
    { id: 'q39', icon: '🎯',
      stem: 'The single MOST IMPORTANT idea from this tool, in 1 sentence:',
      choices: ['Memorize everything', 'Your brain has specific limits + tendencies, and effective learning strategies match those tendencies — but most popular study techniques (rereading, highlighting) feel productive without actually building durable knowledge.', 'IQ is fixed', 'School is bad'],
      correct: 1, why: 'The meta-takeaway. Working memory has limits (cognitive load). Memory needs retrieval to consolidate (testing effect, spaced repetition). Your intuitions about studying are often wrong. Pick evidence-backed techniques.' },
    { id: 'q40', icon: '🛠️',
      stem: 'What\'s the SINGLE MOST ACTIONABLE next step in real life?',
      choices: ['Buy more books', 'Pick ONE technique (most beginners: practice testing on a current class topic) + use it once this week. Notice the difference. Hands-on > theory.', 'Quit school', 'Wait until college'],
      correct: 1, why: 'The tool is a curriculum scaffold. The actual gains come from doing. Try retrieval practice ONCE this week on real content from a current class. Notice the difference vs your usual approach. That\'s the proof.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 14: TOOL REGISTRATION + RENDER
  // ─────────────────────────────────────────────────────────
  window.StemLab.registerTool('learningLab', {
    name: 'Learning Lab',
    icon: '🧠',
    category: 'life-skills',
    description: 'The science of how learning works. Bloom\'s Taxonomy, UDL framework, metacognition, cognitive load, spaced repetition + retrieval practice, study strategies that actually work, neuromyth debunking, education-career pathways. Cited primary sources (Dunlosky 2013, Pashler 2008, Sweller 1988, CAST UDL 3.0). Honest about contested claims. Maine education programs + EL Education context.',
    tags: ['pedagogy', 'learning-science', 'metacognition', 'UDL', 'study-skills', 'education-career', 'maine', 'teachers', 'school-psych'],

    render: function(ctx) {
      try {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useEffect = React.useEffect;

      var d = (ctx.toolData && ctx.toolData['learningLab']) || {};
      var upd = function(key, val) { ctx.update('learningLab', key, val); };
      var updMulti = function(obj) {
        if (ctx.updateMulti) ctx.updateMulti('learningLab', obj);
        else Object.keys(obj).forEach(function(k) { upd(k, obj[k]); });
      };
      var addToast = ctx.addToast || function(msg) { console.log('[LearningLab]', msg); };

      // ── Theme palette (mirrors Auto Repair AA-tuned palette) ──
      // border = slate-500 → 3.69:1 vs bg (passes WCAG 1.4.11 ≥3:1)
      // text on bg = ~17:1; muted on bg = ~13:1; focus = amber-400 outline
      var T = {
        bg: '#0f172a',        // slate-900
        panel: '#1e293b',     // slate-800
        card: '#1e293b',      // slate-800
        cardAlt: '#172033',
        text: '#f1f5f9',      // slate-100
        muted: '#cbd5e1',     // slate-300
        dim: '#94a3b8',       // slate-400
        border: '#64748b',    // slate-500 — WCAG 1.4.11 pass
        borderSoft: '#334155',// slate-700 — for decorative dividers only
        accent: '#a855f7',    // purple-500 (Learning Lab — distinct from Auto Repair amber)
        accentHi: '#c084fc',  // purple-400
        link: '#c084fc',
        good: '#10b981',
        warn: '#f59e0b',
        bad: '#ef4444'
      };

      var view = d.view || 'menu';
      var setView = function(v) { upd('view', v); llAnnounce('Now showing: ' + v); };

      var badges = d.badges || {};
      var awardBadge = function(id, label) {
        if (badges[id]) return;
        var newBadges = Object.assign({}, badges, {});
        newBadges[id] = { label: label, when: Date.now() };
        upd('badges', newBadges);
        addToast('🏅 ' + label);
        llAnnounce('Badge earned: ' + label);
      };

      // ── Reusable styled buttons ──
      function btnPrimary(extra) {
        return Object.assign({
          padding: '10px 16px', borderRadius: 8,
          background: T.accent, color: '#fff',
          border: '1px solid ' + T.accent,
          cursor: 'pointer', fontWeight: 700, fontSize: 14
        }, extra || {});
      }
      function btnSecondary(extra) {
        return Object.assign({
          padding: '8px 14px', borderRadius: 8,
          background: T.cardAlt, color: T.text,
          border: '1px solid ' + T.border,
          cursor: 'pointer', fontWeight: 600, fontSize: 13
        }, extra || {});
      }
      function btnGhost(extra) {
        return Object.assign({
          padding: '6px 12px', borderRadius: 8,
          background: 'transparent', color: T.muted,
          border: '1px solid ' + T.border,
          cursor: 'pointer', fontSize: 12
        }, extra || {});
      }

      function backBar(title) {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid ' + T.border } },
          h('button', { 'data-ll-focusable': true, 'aria-label': 'Back to Learning Lab menu',
            onClick: function() { setView('menu'); }, style: btnGhost() }, '← Menu'),
          h('h2', { style: { margin: 0, fontSize: 18, color: T.text } }, title)
        );
      }

      function disclaimerFooter() {
        return h('div', { role: 'note', 'aria-label': 'Educational notes',
          style: { marginTop: 18, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.5 } },
          'Educational tool. Cites primary research sources where possible (Dunlosky 2013, Pashler 2008, Sweller 1988, CAST UDL 3.0). Honest about contested findings. For academic research, consult the cited papers + your school\'s education library.'
        );
      }

      // ─────────────────────────────────────────
      // MENU view — categorical, collapsible
      // ─────────────────────────────────────────
      function renderMenu() {
        var categories = [
          { id: 'foundation', icon: '🧠', name: 'How learning works (foundation)',
            desc: 'The core cognitive science. Start here.',
            modules: [
              { id: 'bloom', icon: '📊', label: 'Bloom\'s Taxonomy', desc: '6 cognitive levels with verb lists + examples.' },
              { id: 'cogload', icon: '⚖️', label: 'Cognitive Load Theory', desc: 'Working memory limits + 3 types of load (Sweller).' },
              { id: 'metacog', icon: '🗺️', label: 'Metacognition', desc: 'Plan / Monitor / Evaluate. Self-rating prompts.' },
              { id: 'zpd', icon: '🤝', label: 'ZPD + scaffolding', desc: 'Vygotsky. Gradual release. 6 scaffolding strategies.' }
            ]
          },
          { id: 'udl', icon: '🎯', name: 'UDL framework',
            desc: 'The lens this whole platform is built on.',
            modules: [
              { id: 'udlPrinciples', icon: '🎯', label: 'UDL principles + 9 guidelines', desc: 'CAST 3.0. Engagement / Representation / Action+Expression. With AlloFlow tool examples.' }
            ]
          },
          { id: 'strategies', icon: '📚', name: 'Strategies that work',
            desc: 'What the research actually supports.',
            modules: [
              { id: 'spaced', icon: '⏰', label: 'Spaced repetition + retrieval', desc: 'Ebbinghaus, testing effect, illusion of fluency.' },
              { id: 'study', icon: '📝', label: 'Study strategies', desc: 'Dunlosky 2013 ratings: high vs low utility.' },
              { id: 'mindset', icon: '🌱', label: 'Growth mindset (brief)', desc: 'Dweck. Honest about replication. Links to Growth Mindset SEL tool.' },
              { id: 'myths', icon: '🚫', label: 'Neuromyth debunker', desc: '8 popular beliefs that research rejects.' }
            ]
          },
          { id: 'careers', icon: '🏅', name: 'Pedagogy careers + Maine',
            desc: 'How to do this for a living.',
            modules: [
              { id: 'careers-list', icon: '🍎', label: 'Education + ed-adjacent careers', desc: '10 career paths from teacher to ed researcher.' },
              { id: 'maine-progs', icon: '🌲', label: 'Maine education programs', desc: 'USM, UMaine, UMF, UNE + cert pathway + EL Education.' }
            ]
          },
          { id: 'progress', icon: '📊', name: 'Progress + reference',
            desc: 'Self-test, achievements, citations.',
            modules: [
              { id: 'quiz', icon: '🧪', label: 'Knowledge quiz', desc: '40 questions across the full curriculum.' },
              { id: 'badges', icon: '🏆', label: 'Badge gallery', desc: 'All earned + unlockable badges.' },
              { id: 'resources', icon: '📚', label: 'Resources', desc: 'Cited papers + free + paid tools.' }
            ]
          }
        ];
        var badgeCount = Object.keys(badges).length;
        var collapsedCats = d.collapsedCats || {};

        return h('div', { role: 'main', 'aria-label': 'Learning Lab main menu', style: { padding: 20, maxWidth: 1000, margin: '0 auto', color: T.text } },
          h('a', { href: '#ll-menu-categories', 'data-ll-focusable': true,
            style: { position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' },
            onFocus: function(e) { Object.assign(e.target.style, { position: 'static', left: 'auto', width: 'auto', height: 'auto', display: 'inline-block', padding: '6px 12px', background: T.accent, color: '#fff', textDecoration: 'none', fontWeight: 700, borderRadius: 6, marginBottom: 10 }); },
            onBlur: function(e) { Object.assign(e.target.style, { position: 'absolute', left: '-9999px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }); }
          }, 'Skip to module categories'),
          h('div', { style: { marginBottom: 16, padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
            h('h1', { style: { margin: '0 0 6px', fontSize: 24, color: T.text } },
              h('span', { 'aria-hidden': 'true' }, '🧠 '), 'Learning Lab'),
            h('p', { style: { margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.5 } },
              'The science of how learning works — for students, teachers, and future educators. Bloom\'s, UDL, metacognition, cognitive load, spaced repetition, study strategies that actually work, neuromyth debunking, education careers. Cited primary sources; honest about contested claims.')
          ),
          badgeCount > 0 && h('button', { 'data-ll-focusable': true,
            'aria-label': 'View badge gallery — ' + badgeCount + ' badges earned',
            onClick: function() { setView('badges'); },
            style: { width: '100%', marginBottom: 14, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.accent, fontSize: 12, color: T.muted, cursor: 'pointer', textAlign: 'left' } },
            h('span', { 'aria-hidden': 'true' }, '🏅 '),
            h('strong', { style: { color: T.accentHi } }, 'Badges earned: '), String(badgeCount), ' — tap to view gallery →'
          ),
          h('div', { id: 'll-menu-categories', tabIndex: -1 }),
          categories.map(function(cat) {
            var collapsed = !!collapsedCats[cat.id];
            return h('div', { key: cat.id, style: { marginBottom: 14 } },
              h('button', { 'data-ll-focusable': true,
                'aria-label': (collapsed ? 'Expand' : 'Collapse') + ' ' + cat.name,
                'aria-expanded': collapsed ? 'false' : 'true',
                onClick: function() {
                  var nv = Object.assign({}, collapsedCats); nv[cat.id] = !nv[cat.id];
                  upd('collapsedCats', nv);
                },
                style: { width: '100%', padding: 12, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent, color: T.text, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 } },
                h('span', { style: { fontSize: 26 } }, cat.icon),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { fontWeight: 800, fontSize: 16, color: T.accentHi } }, cat.name),
                  h('div', { style: { fontSize: 11, color: T.muted, marginTop: 2 } }, cat.desc + ' · ' + cat.modules.length + ' modules')
                ),
                h('span', { style: { fontSize: 14, color: T.dim } }, collapsed ? '▶' : '▼')
              ),
              !collapsed && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 8 } },
                cat.modules.map(function(m) {
                  return h('button', { 'data-ll-focusable': true, key: m.id,
                    'aria-label': 'Open ' + m.label + ' module',
                    onClick: function() { setView(m.id); },
                    style: { textAlign: 'left', padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, color: T.text, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      h('span', { style: { fontSize: 22 } }, m.icon),
                      h('strong', { style: { fontWeight: 700, fontSize: 14, color: T.text } }, m.label)
                    ),
                    h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.45 } }, m.desc)
                  );
                })
              )
            );
          }),
          h('div', { style: { marginTop: 16, padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.accentHi } }, '🌲 Maine + EL Education context: '),
            'King Middle School (Portland) is a flagship EL Education school. Crew + HOWLs + Expeditions naturally implement UDL principles. AlloFlow built with these traditions in mind — the platform itself exemplifies "multiple means of representation + expression."'),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // BLOOM'S TAXONOMY view
      // ─────────────────────────────────────────
      function renderBloom() {
        var picked = d.bloomPicked || null;
        var pickedLevel = picked ? BLOOMS_LEVELS.find(function(l) { return l.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📊 Bloom\'s Taxonomy'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '📊 Bloom\'s Taxonomy (revised 2001)'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              '6 cognitive levels from low to high demand. Each level has its own verbs — use them when writing learning objectives so the objective + assessment match the cognitive level you\'re targeting.'),
            h('p', { style: { margin: 0, color: T.dim, fontSize: 11, lineHeight: 1.5, fontStyle: 'italic' } },
              'Source: Anderson + Krathwohl (2001) revised Bloom\'s. Tap any level for verbs, examples, and the common pitfall.')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 14 } },
            BLOOMS_LEVELS.map(function(l) {
              var sel = picked === l.id;
              return h('button', { key: l.id, 'data-ll-focusable': true,
                'aria-label': 'Level ' + l.n + ': ' + l.name,
                'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('bloomPicked', sel ? null : l.id); awardBadge('bloom-explorer', 'Bloom\'s Explorer'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left',
                  fontWeight: sel ? 800 : 600,
                  display: 'flex', flexDirection: 'column', gap: 2
                }) },
                h('div', { style: { fontSize: 22 } }, l.icon),
                h('div', { style: { fontSize: 11, opacity: 0.85 } }, 'Level ' + l.n),
                h('strong', null, l.name)
              );
            })
          ),
          pickedLevel && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 16, color: T.accentHi } },
              h('span', { 'aria-hidden': 'true' }, pickedLevel.icon + ' '),
              'Level ' + pickedLevel.n + ': ' + pickedLevel.name),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 14, fontWeight: 700 } }, pickedLevel.def),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55, fontStyle: 'italic' } }, pickedLevel.cognitive),
            h('h5', { style: { margin: '8px 0 4px', fontSize: 13, color: T.accentHi } }, '📝 Verbs you can use'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              pickedLevel.verbs.map(function(v) {
                return h('span', { key: v, style: { padding: '3px 8px', borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 11, color: T.text, fontFamily: 'monospace' } }, v);
              })
            ),
            h('h5', { style: { margin: '8px 0 4px', fontSize: 13, color: T.accentHi } }, '✏️ Example tasks at this level'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.7 } },
              pickedLevel.examples.map(function(e, i) { return h('li', { key: i }, e); })
            ),
            h('div', { style: { marginTop: 10, padding: 8, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + T.warn, fontSize: 12, color: T.muted } },
              h('strong', { style: { color: T.warn } }, '⚠️ Common pitfall: '), pickedLevel.pitfall)
          ),
          h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
            h('h5', { style: { margin: '0 0 6px', fontSize: 13, color: T.accentHi } }, '💡 Usage notes'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.7 } },
              BLOOMS_USAGE_NOTES.map(function(n, i) { return h('li', { key: i }, n); })
            )
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // COGNITIVE LOAD view
      // ─────────────────────────────────────────
      function renderCogLoad() {
        var picked = d.clPicked || null;
        var pickedLoad = picked ? COGNITIVE_LOAD_TYPES.find(function(c) { return c.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('⚖️ Cognitive Load Theory'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '⚖️ Sweller\'s Cognitive Load Theory'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'Working memory is severely limited. Effective instruction minimizes wasted cognitive effort + maximizes effort that builds mental models.'),
            h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.accent, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🧠 Working memory limits: '),
              WORKING_MEMORY_FACTS.cowans, ' ', WORKING_MEMORY_FACTS.practical)
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 14 } },
            COGNITIVE_LOAD_TYPES.map(function(c) {
              var sel = picked === c.id;
              return h('button', { key: c.id, 'data-ll-focusable': true,
                'aria-label': c.name,
                'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('clPicked', sel ? null : c.id); awardBadge('cogload-aware', 'Cognitive Load Aware'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left',
                  fontWeight: sel ? 800 : 600,
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }) },
                h('span', { style: { fontSize: 22 } }, c.icon),
                h('span', null, c.name)
              );
            })
          ),
          pickedLoad && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedLoad.icon + ' ' + pickedLoad.name),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 14, fontWeight: 700, lineHeight: 1.5 } }, pickedLoad.def),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '📋 Example: '), pickedLoad.example),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.good } }, '🎯 How to manage: '), pickedLoad.manage),
            h('p', { style: { margin: 0, color: T.dim, fontSize: 11, lineHeight: 1.5, fontStyle: 'italic' } },
              h('strong', null, '📚 Source: '), pickedLoad.research)
          ),
          h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('h5', { style: { margin: '0 0 6px', fontSize: 13, color: T.accentHi } }, '🧠 Working memory: Miller vs Cowan'),
            h('p', { style: { margin: '0 0 4px' } }, h('strong', { style: { color: T.text } }, 'Miller (1956): '), WORKING_MEMORY_FACTS.millers),
            h('p', { style: { margin: '0 0 4px' } }, h('strong', { style: { color: T.text } }, 'Cowan (2001): '), WORKING_MEMORY_FACTS.cowans),
            h('p', { style: { margin: 0 } }, h('strong', { style: { color: T.text } }, 'Chunking: '), WORKING_MEMORY_FACTS.chunking)
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // METACOGNITION view
      // ─────────────────────────────────────────
      function renderMetacog() {
        var picked = d.metaPhase || null;
        var pickedPhase = picked ? METACOG_PHASES.find(function(p) { return p.id === picked; }) : null;
        var ratings = d.metaRatings || {};
        var ratedCount = Object.keys(ratings).length;
        var avgRating = ratedCount > 0 ? (Object.keys(ratings).reduce(function(a, k) { return a + ratings[k]; }, 0) / ratedCount).toFixed(1) : null;

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🗺️ Metacognition'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🗺️ Thinking about thinking'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'Metacognition = monitoring + regulating your own thinking. Strong metacognition predicts academic outcomes BEYOND raw IQ + prior knowledge. The 3 phases below are the loop.')
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '⏱️ The 3 phases'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 14 } },
            METACOG_PHASES.map(function(p) {
              var sel = picked === p.id;
              return h('button', { key: p.id, 'data-ll-focusable': true,
                'aria-label': p.name,
                'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('metaPhase', sel ? null : p.id); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left',
                  fontWeight: sel ? 800 : 600,
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }) },
                h('span', { style: { fontSize: 22 } }, p.icon),
                h('span', null, 'Phase ' + p.n + ': ' + p.name)
              );
            })
          ),
          pickedPhase && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedPhase.icon + ' Phase ' + pickedPhase.n + ': ' + pickedPhase.name),
            h('h5', { style: { margin: '8px 0 6px', fontSize: 13, color: T.text } }, '🔍 Questions to ask yourself'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, color: T.muted, lineHeight: 1.7 } },
              pickedPhase.questions.map(function(q, i) { return h('li', { key: i }, q); })
            ),
            h('div', { style: { marginTop: 10, padding: 8, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + T.warn, fontSize: 12, color: T.muted } },
              h('strong', { style: { color: T.warn } }, '💡 Tip: '), pickedPhase.tip)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '📋 Self-rate your metacognition'),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              'For each statement, rate from 1 (rarely) to 5 (always). No "correct" answer — this is for your own awareness.',
              ratedCount > 0 && h('span', null, ' ',
                h('strong', { style: { color: T.accentHi } }, 'Your average so far: '), avgRating)),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              METACOG_SELF_RATE.map(function(item, i) {
                var rated = ratings[i];
                return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 } },
                    h('span', { style: { fontSize: 11, color: T.dim, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: T.bg, border: '1px solid ' + T.border, minWidth: 60, textAlign: 'center' } }, item.label),
                    h('span', { style: { fontSize: 12, color: T.text, lineHeight: 1.5, flex: 1 } }, item.item)
                  ),
                  h('div', { role: 'group', 'aria-label': 'Rate ' + item.label, style: { display: 'flex', gap: 4, marginLeft: 68 } },
                    [1,2,3,4,5].map(function(n) {
                      var isRated = rated === n;
                      return h('button', { key: n, 'data-ll-focusable': true,
                        'aria-label': 'Rate ' + n,
                        'aria-pressed': isRated ? 'true' : 'false',
                        onClick: function() {
                          var nr = Object.assign({}, ratings); nr[i] = n;
                          upd('metaRatings', nr);
                          if (Object.keys(nr).length === METACOG_SELF_RATE.length) awardBadge('meta-self-rated', 'Metacognition Self-Rated');
                        },
                        style: { width: 32, height: 32, borderRadius: 6, background: isRated ? T.accent : T.bg, color: isRated ? '#fff' : T.text, border: '1px solid ' + (isRated ? T.accent : T.border), cursor: 'pointer', fontWeight: 700, fontSize: 13 } },
                        n);
                    })
                  )
                );
              })
            )
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // ZPD view
      // ─────────────────────────────────────────
      function renderZpd() {
        var picked = d.scaffPicked || null;
        var pickedScaff = picked ? SCAFFOLDING_STRATEGIES.find(function(s) { return s.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🤝 ZPD + scaffolding'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🤝 Vygotsky\'s Zone of Proximal Development'),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'The ZPD = the gap between what a learner can do alone and what they can do with help. The "sweet spot" for instruction. Scaffolding = the temporary support that makes ZPD work accessible; faded as competence grows.')
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '📍 The 3 zones'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 } },
            ZPD_ZONES.map(function(z) {
              return h('div', { key: z.id, style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                  h('span', { style: { fontSize: 22 } }, z.icon),
                  h('strong', { style: { fontSize: 13, color: T.accentHi } }, z.name)
                ),
                h('p', { style: { margin: '0 0 4px', fontSize: 12, color: T.text, lineHeight: 1.55 } }, z.desc),
                h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                  h('strong', { style: { color: T.warn } }, '🎯 Teaching implication: '), z.teaching)
              );
            })
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🪜 6 scaffolding strategies'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 14 } },
            SCAFFOLDING_STRATEGIES.map(function(s) {
              var sel = picked === s.id;
              return h('button', { key: s.id, 'data-ll-focusable': true,
                'aria-label': s.name,
                'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('scaffPicked', sel ? null : s.id); awardBadge('zpd-scaffolder', 'ZPD Scaffolder'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left',
                  fontWeight: sel ? 800 : 600,
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }) },
                h('span', { style: { fontSize: 22 } }, s.icon),
                h('span', null, s.name)
              );
            })
          ),
          pickedScaff && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedScaff.icon + ' ' + pickedScaff.name),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🔍 What it is: '), pickedScaff.what),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, '📋 Example: '), pickedScaff.example),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.good } }, '↓ How to fade: '), pickedScaff.fade)
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // UDL view
      // ─────────────────────────────────────────
      function renderUDL() {
        var picked = d.udlPicked || null;
        var pickedPrin = picked ? UDL_PRINCIPLES.find(function(p) { return p.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🎯 UDL Framework'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🎯 Universal Design for Learning (CAST UDL Guidelines 3.0)'),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'UDL is the framework AlloFlow itself is built on. 3 principles + 9 guidelines. Each guideline has multiple checkpoints. Tap any principle for the guidelines + AlloFlow tool examples.'),
            h('p', { style: { margin: 0, color: T.dim, fontSize: 11, fontStyle: 'italic' } },
              'Source: CAST.org UDL Guidelines 3.0 (2024 update). Free + open framework.')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 14 } },
            UDL_PRINCIPLES.map(function(p) {
              var sel = picked === p.id;
              return h('button', { key: p.id, 'data-ll-focusable': true,
                'aria-label': p.name,
                'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('udlPicked', sel ? null : p.id); awardBadge('udl-explorer', 'UDL Explorer'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left',
                  fontWeight: sel ? 800 : 600,
                  display: 'flex', flexDirection: 'column', gap: 2
                }) },
                h('div', { style: { fontSize: 22 } }, p.icon),
                h('div', { style: { fontSize: 11, opacity: 0.85 } }, 'Principle ' + p.n),
                h('strong', null, p.name),
                h('div', { style: { fontSize: 10, opacity: 0.85, fontStyle: 'italic' } }, p.tagline)
              );
            })
          ),
          pickedPrin && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent } },
            h('h4', { style: { margin: '0 0 4px', fontSize: 16, color: T.accentHi } }, pickedPrin.icon + ' ' + pickedPrin.name),
            h('p', { style: { margin: '0 0 4px', fontSize: 13, color: T.text, fontStyle: 'italic' } }, pickedPrin.tagline),
            h('p', { style: { margin: '0 0 12px', fontSize: 13, color: T.muted, lineHeight: 1.55 } }, pickedPrin.def),
            h('h5', { style: { margin: '8px 0 8px', fontSize: 13, color: T.accentHi } }, '📋 Guidelines for this principle'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              pickedPrin.guidelines.map(function(g, i) {
                return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('strong', { style: { fontSize: 13, color: T.text, display: 'block', marginBottom: 4 } }, '→ ' + g.name),
                  h('div', { style: { fontSize: 11, color: T.muted, marginBottom: 6 } },
                    h('strong', { style: { color: T.dim } }, 'Checkpoints: '),
                    g.checkpoints.join(' • ')),
                  h('div', { style: { fontSize: 12, color: T.text, lineHeight: 1.55, padding: 8, borderRadius: 6, background: T.bg, border: '1px solid ' + T.borderSoft } },
                    h('strong', { style: { color: T.accentHi } }, '🔧 AlloFlow example: '), g.alloflowExample)
                );
              })
            )
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // SPACED REPETITION + RETRIEVAL view
      // ─────────────────────────────────────────
      function renderSpaced() {
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('⏰ Spaced repetition + retrieval'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '⏰ ' + FORGETTING_CURVE.title),
            h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 13, lineHeight: 1.55, fontWeight: 700 } }, FORGETTING_CURVE.summary),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.55 } }, FORGETTING_CURVE.bigIdea),
            h('h5', { style: { margin: '8px 0 6px', fontSize: 13, color: T.accentHi } }, '📅 An evidence-backed spacing schedule'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              FORGETTING_CURVE.schedule.map(function(s, i) {
                return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('strong', { style: { fontSize: 12, color: T.accentHi } }, s.gap), ': ',
                  h('span', { style: { fontSize: 12, color: T.muted } }, s.action));
              })
            ),
            h('p', { style: { marginTop: 10, marginBottom: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🛠️ Tools: '), FORGETTING_CURVE.tools)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.accentHi } }, '🎯 ' + TESTING_EFFECT.title),
            h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 13, lineHeight: 1.55, fontWeight: 700 } }, TESTING_EFFECT.bigIdea),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🧠 Why: '), TESTING_EFFECT.why),
            h('h5', { style: { margin: '8px 0 6px', fontSize: 13, color: T.accentHi } }, '✏️ Practical applications'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.7 } },
              TESTING_EFFECT.practical.map(function(p, i) { return h('li', { key: i }, p); })
            ),
            h('p', { style: { marginTop: 10, marginBottom: 0, fontSize: 11, color: T.dim, fontStyle: 'italic' } },
              h('strong', null, '📚 Source: '), TESTING_EFFECT.research)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.warn } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.warn } }, '⚠️ ' + ILLUSION_OF_FLUENCY.title),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } }, ILLUSION_OF_FLUENCY.explanation),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🧪 Test: '), ILLUSION_OF_FLUENCY.test),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.good } }, '🔧 Fix: '), ILLUSION_OF_FLUENCY.fix),
            h('p', { style: { margin: 0, fontSize: 11, color: T.dim, fontStyle: 'italic' } },
              h('strong', null, '📚 Source: '), ILLUSION_OF_FLUENCY.research),
            h('button', { 'data-ll-focusable': true,
              'aria-label': 'Mark spaced-repetition module complete',
              onClick: function() { awardBadge('spaced-rep-aware', 'Spaced Rep Aware'); },
              style: Object.assign({}, btnPrimary(), { marginTop: 10 }) }, '✓ I get it')
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // STUDY STRATEGIES view
      // ─────────────────────────────────────────
      function renderStudy() {
        var picked = d.studyPicked || null;
        var pickedStr = picked ? STUDY_STRATEGIES.find(function(s) { return s.id === picked; }) : null;
        var utilColor = function(u) {
          if (u === 'high') return T.good;
          if (u === 'moderate') return T.accentHi;
          if (u === 'low') return T.bad;
          return T.muted;
        };
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📝 Study strategies'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '📝 What works (per Dunlosky 2013)'),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'Dunlosky et al.\'s 2013 meta-review of 100+ studies. The takeaway: practice testing + distributed practice are HIGH utility; highlighting + rereading are LOW. Most students intuitively gravitate toward the LOW-utility ones.'),
            h('div', { style: { display: 'flex', gap: 8, fontSize: 11, flexWrap: 'wrap' } },
              h('span', { style: { padding: '4px 10px', borderRadius: 12, background: T.cardAlt, color: T.good, border: '1px solid ' + T.good, fontWeight: 700 } }, '🟢 HIGH'),
              h('span', { style: { padding: '4px 10px', borderRadius: 12, background: T.cardAlt, color: T.accentHi, border: '1px solid ' + T.accentHi, fontWeight: 700 } }, '🟡 MODERATE / STRUCTURE'),
              h('span', { style: { padding: '4px 10px', borderRadius: 12, background: T.cardAlt, color: T.bad, border: '1px solid ' + T.bad, fontWeight: 700 } }, '🔴 LOW')
            )
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 14 } },
            STUDY_STRATEGIES.map(function(s) {
              var sel = picked === s.id;
              return h('button', { key: s.id, 'data-ll-focusable': true,
                'aria-label': s.name + ', ' + s.utilityLabel,
                'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('studyPicked', sel ? null : s.id); awardBadge('study-strategist', 'Study Strategist'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left',
                  fontWeight: sel ? 800 : 600,
                  display: 'flex', flexDirection: 'column', gap: 2,
                  borderColor: sel ? T.accent : utilColor(s.utility)
                }) },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { style: { fontSize: 18 } }, s.icon),
                  h('span', { style: { fontSize: 12 } }, s.name)
                ),
                h('span', { style: { fontSize: 10, opacity: 0.85, color: sel ? '#fff' : utilColor(s.utility), fontWeight: 700 } }, s.utilityLabel)
              );
            })
          ),
          pickedStr && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + utilColor(pickedStr.utility) } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              h('span', { style: { fontSize: 24 } }, pickedStr.icon),
              h('h4', { style: { margin: 0, fontSize: 16, color: T.text, flex: 1 } }, pickedStr.name),
              h('span', { style: { padding: '4px 10px', borderRadius: 12, background: utilColor(pickedStr.utility), color: '#000', fontSize: 11, fontWeight: 800 } },
                pickedStr.utilityLabel)
            ),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🔍 What: '), pickedStr.what),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, '🧠 Why it works (or doesn\'t): '), pickedStr.whyWorks),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.good } }, '🕐 When to use: '), pickedStr.whenToUse),
            h('p', { style: { margin: 0, fontSize: 11, color: T.dim, fontStyle: 'italic' } },
              h('strong', null, '📚 Research: '), pickedStr.research)
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // GROWTH MINDSET (brief) view
      // ─────────────────────────────────────────
      function renderMindset() {
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🌱 Growth mindset (brief)'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🌱 Growth mindset — the core idea'),
            h('p', { style: { margin: 0, color: T.text, fontSize: 13, lineHeight: 1.55 } }, GROWTH_MINDSET_BRIEF.coreIdea)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🛠️ Practical applications'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, color: T.muted, lineHeight: 1.7 } },
              GROWTH_MINDSET_BRIEF.practical.map(function(p, i) { return h('li', { key: i }, p); })
            )
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.warn, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.warn } }, '⚠️ Honest caveat'),
            h('p', { style: { margin: 0, color: T.text, fontSize: 13, lineHeight: 1.55 } }, GROWTH_MINDSET_BRIEF.honestCaveat)
          ),
          h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('h5', { style: { margin: '0 0 6px', fontSize: 13, color: T.accentHi } }, '📚 Research'),
            h('ul', { style: { margin: 0, paddingLeft: 18 } },
              GROWTH_MINDSET_BRIEF.research.map(function(r, i) { return h('li', { key: i }, r); })
            ),
            h('p', { style: { marginTop: 10, marginBottom: 0, fontSize: 12, color: T.text } },
              h('strong', { style: { color: T.accentHi } }, '🔗 See also: '), GROWTH_MINDSET_BRIEF.seeAlso)
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // NEUROMYTH DEBUNKER view
      // ─────────────────────────────────────────
      function renderMyths() {
        var picked = d.mythPicked || null;
        var pickedMyth = picked ? NEUROMYTHS.find(function(m) { return m.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🚫 Neuromyth debunker'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🚫 8 popular beliefs that research rejects'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'These myths persist because they\'re intuitive, marketed, or fit common stories. Critical for pre-service teachers — many education programs still teach some of these.')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 14 } },
            NEUROMYTHS.map(function(m) {
              var sel = picked === m.id;
              return h('button', { key: m.id, 'data-ll-focusable': true,
                'aria-label': m.name,
                'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('mythPicked', sel ? null : m.id); awardBadge('myth-buster', 'Myth Buster'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left',
                  fontWeight: sel ? 800 : 600,
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }) },
                h('span', { style: { fontSize: 22 } }, m.icon),
                h('span', null, m.name)
              );
            })
          ),
          pickedMyth && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.bad } },
            h('h4', { style: { margin: '0 0 10px', fontSize: 15, color: T.bad } }, pickedMyth.icon + ' ' + pickedMyth.name),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#7f1d1d', border: '1px solid ' + T.bad, color: '#fee2e2', marginBottom: 10, fontSize: 12, lineHeight: 1.55 } },
              h('strong', null, '❌ The myth: '), pickedMyth.myth),
            h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.good } }, '✅ The truth: '), pickedMyth.truth),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
              h('strong', { style: { color: T.warn } }, '🤔 Why it persists: '), pickedMyth.whyPersists),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🎯 What to do instead: '), pickedMyth.whatToDoInstead),
            h('p', { style: { margin: 0, fontSize: 11, color: T.dim, fontStyle: 'italic' } },
              h('strong', null, '📚 Research: '), pickedMyth.research)
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // CAREERS view
      // ─────────────────────────────────────────
      function renderCareers() {
        var picked = d.careerPicked || null;
        var pickedCar = picked ? ED_CAREERS.find(function(c) { return c.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🍎 Education + ed-adjacent careers'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🍎 10 career paths'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'From classroom teacher to school psychologist (Aaron\'s path) to instructional designer + ed researcher. Each: degree, pay, what\'s good, what\'s hard.')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 14 } },
            ED_CAREERS.map(function(c) {
              var sel = picked === c.id;
              return h('button', { key: c.id, 'data-ll-focusable': true,
                'aria-label': c.name,
                'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('careerPicked', sel ? null : c.id); awardBadge('career-explorer', 'Career Explorer'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left',
                  fontWeight: sel ? 800 : 600,
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }) },
                h('span', { style: { fontSize: 22 } }, c.icon),
                h('span', null, c.name)
              );
            })
          ),
          pickedCar && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedCar.icon + ' ' + pickedCar.name),
            [
              { label: '🎯 What they do', val: pickedCar.what },
              { label: '🎓 Degree path', val: pickedCar.degree },
              { label: '💵 Pay', val: pickedCar.pay },
              { label: '🌲 Maine path', val: pickedCar.mainePath },
              { label: '✅ Good', val: pickedCar.good },
              { label: '⚠️ Hard parts', val: pickedCar.hard }
            ].map(function(r, i) {
              return h('p', { key: i, style: { margin: '0 0 6px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, r.label + ': '), r.val);
            })
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MAINE PROGRAMS view
      // ─────────────────────────────────────────
      function renderMaineProgs() {
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🌲 Maine education programs'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🌲 Maine ed-degree pathways'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'In-state options for teacher prep, school psych, OT, counseling, + EL Education context.')
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            MAINE_ED_PROGRAMS.map(function(p, i) {
              return h('div', { key: i, style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
                  h('strong', { style: { fontSize: 14, color: T.accentHi } }, p.name),
                  h('span', { style: { fontSize: 11, color: T.dim } }, '📍 ' + p.loc)
                ),
                h('p', { style: { margin: '0 0 4px', fontSize: 12, color: T.text, lineHeight: 1.55 } },
                  h('strong', null, 'Programs: '), p.programs),
                h('p', { style: { margin: '0 0 6px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                  h('strong', { style: { color: T.accentHi } }, 'Strength: '), p.strength),
                p.url && h('a', { href: p.url, target: '_blank', rel: 'noopener',
                  style: { fontSize: 11, color: T.link, textDecoration: 'underline' } }, '🔗 ' + p.url.replace(/^https?:\/\//, ''))
              );
            })
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // QUIZ view
      // ─────────────────────────────────────────
      function renderQuiz() {
        var qIdx = d.quizIdx || 0;
        var question = QUIZ[qIdx];
        var answers = d.quizAnswers || {};
        var picked = answers[question && question.id];
        var submitted = picked != null;
        var score = Object.keys(answers).reduce(function(acc, k) {
          var q = QUIZ.find(function(x) { return x.id === k; });
          if (q && answers[k] === q.correct) acc++;
          return acc;
        }, 0);

        if (!question) {
          var pct = Math.round((score / QUIZ.length) * 100);
          if (pct >= 80) awardBadge('quiz-passed', 'Quiz Passed');
          return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
            backBar('🧪 Quiz complete'),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 16, color: T.accentHi } }, '🎉 Quiz complete: ' + score + ' / ' + QUIZ.length + ' (' + pct + '%)'),
              h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.5 } },
                pct >= 90 ? '🏆 Pedagogy mastery. You can teach this content yourself.' :
                pct >= 80 ? '🎓 Strong understanding. A few details to refine.' :
                pct >= 60 ? '🚧 Good baseline. Re-review the modules where you missed.' :
                '📚 Worth another pass through the modules — especially Bloom\'s + Cognitive Load + the neuromyths.'),
              h('button', { 'data-ll-focusable': true,
                onClick: function() { upd('quizIdx', 0); upd('quizAnswers', {}); },
                style: btnPrimary() }, '🔄 Retake quiz')
            ),
            disclaimerFooter()
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🧪 Knowledge quiz'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
              h('span', { style: { fontSize: 24 }, 'aria-hidden': 'true' }, question.icon),
              h('span', { style: { fontSize: 11, color: T.dim } }, 'Question ' + (qIdx + 1) + ' of ' + QUIZ.length, ' · Score: ', score)
            ),
            h('h3', { style: { margin: '0 0 12px', fontSize: 14, color: T.text, lineHeight: 1.5 } }, question.stem),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              question.choices.map(function(c, i) {
                var isPicked = picked === i;
                var isCorrect = i === question.correct;
                var bg, border, color;
                if (submitted) {
                  if (isCorrect) { bg = '#064e3b'; border = T.good; color = '#d1fae5'; }
                  else if (isPicked) { bg = '#7f1d1d'; border = T.bad; color = '#fee2e2'; }
                  else { bg = T.cardAlt; border = T.border; color = T.muted; }
                } else if (isPicked) {
                  bg = T.accent; border = T.accent; color = '#fff';
                } else {
                  bg = T.cardAlt; border = T.border; color = T.text;
                }
                return h('button', { key: i, 'data-ll-focusable': true,
                  'aria-label': c, 'aria-pressed': isPicked ? 'true' : 'false',
                  disabled: submitted,
                  onClick: function() {
                    var nv = Object.assign({}, answers); nv[question.id] = i;
                    upd('quizAnswers', nv);
                  },
                  style: { padding: 10, borderRadius: 8, background: bg, color: color, border: '1px solid ' + border, cursor: submitted ? 'default' : 'pointer', textAlign: 'left', fontSize: 13, lineHeight: 1.5 } },
                  String.fromCharCode(65 + i) + '. ' + c
                );
              })
            ),
            submitted && h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.accent } },
              h('strong', { style: { color: picked === question.correct ? T.good : T.warn } },
                picked === question.correct ? '✅ Correct. ' : '❌ Not quite. '),
              h('span', { style: { color: T.text, fontSize: 12, lineHeight: 1.5 } }, question.why),
              h('div', { style: { marginTop: 10 } },
                h('button', { 'data-ll-focusable': true, onClick: function() { upd('quizIdx', qIdx + 1); }, style: btnPrimary() },
                  qIdx + 1 < QUIZ.length ? '→ Next question' : '🎉 Finish quiz')
              )
            )
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // BADGE GALLERY view
      // ─────────────────────────────────────────
      function renderBadges() {
        var BADGE_CATALOG = [
          { group: '🧠 Foundation', items: [
            { id: 'bloom-explorer', icon: '📊', name: 'Bloom\'s Explorer', how: 'Tap any Bloom\'s level.' },
            { id: 'cogload-aware', icon: '⚖️', name: 'Cognitive Load Aware', how: 'Tap any cognitive-load type.' },
            { id: 'meta-self-rated', icon: '🗺️', name: 'Metacognition Self-Rated', how: 'Rate all 8 metacognition self-statements.' },
            { id: 'zpd-scaffolder', icon: '🤝', name: 'ZPD Scaffolder', how: 'Tap any scaffolding strategy.' }
          ] },
          { group: '🎯 UDL', items: [
            { id: 'udl-explorer', icon: '🎯', name: 'UDL Explorer', how: 'Tap any UDL principle.' }
          ] },
          { group: '📚 Strategies', items: [
            { id: 'spaced-rep-aware', icon: '⏰', name: 'Spaced Rep Aware', how: 'Mark the spaced-repetition module complete.' },
            { id: 'study-strategist', icon: '📝', name: 'Study Strategist', how: 'Tap any study strategy in the Dunlosky table.' },
            { id: 'myth-buster', icon: '🚫', name: 'Myth Buster', how: 'Tap any neuromyth in the debunker.' }
          ] },
          { group: '🏅 Career', items: [
            { id: 'career-explorer', icon: '🍎', name: 'Career Explorer', how: 'Tap any education career path.' }
          ] },
          { group: '🧪 Self-test', items: [
            { id: 'quiz-passed', icon: '🧪', name: 'Quiz Passed', how: 'Score 80%+ on the 40-question knowledge quiz.' }
          ] }
        ];

        var totalBadges = 0;
        var earnedBadges = 0;
        BADGE_CATALOG.forEach(function(g) {
          totalBadges += g.items.length;
          g.items.forEach(function(b) {
            if (badges[b.id]) earnedBadges++;
          });
        });
        var pct = totalBadges > 0 ? Math.round((earnedBadges / totalBadges) * 100) : 0;
        var pctColor = pct >= 80 ? T.good : pct >= 50 ? T.accentHi : pct >= 25 ? T.warn : T.dim;

        return h('div', { style: { padding: 20, maxWidth: 1000, margin: '0 auto', color: T.text } },
          backBar('🏆 Badge gallery'),
          h('div', { style: { padding: 18, borderRadius: 10, background: T.card, border: '2px solid ' + pctColor, marginBottom: 14, textAlign: 'center' } },
            h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 6 } }, 'Curriculum mastery'),
            h('div', { style: { fontSize: 36, fontWeight: 900, color: pctColor, lineHeight: 1, marginBottom: 6 } }, earnedBadges + ' / ' + totalBadges),
            h('div', { style: { fontSize: 14, color: T.text, fontWeight: 700 } }, pct + '% complete')
          ),
          BADGE_CATALOG.map(function(g) {
            var groupEarned = g.items.filter(function(b) { return badges[b.id]; }).length;
            return h('div', { key: g.group, style: { marginBottom: 14, padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 } },
                h('h4', { style: { margin: 0, fontSize: 14, color: T.accentHi } }, g.group),
                h('span', { style: { fontSize: 11, color: T.muted, fontFamily: 'monospace' } }, groupEarned + ' / ' + g.items.length)
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 } },
                g.items.map(function(b) {
                  var earned = !!badges[b.id];
                  return h('div', { key: b.id,
                    style: { padding: 10, borderRadius: 8, background: earned ? '#064e3b' : T.cardAlt, border: '1px solid ' + (earned ? T.good : T.border), opacity: earned ? 1 : 0.65 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                      h('span', { style: { fontSize: 22, filter: earned ? 'none' : 'grayscale(100%)' } }, b.icon),
                      h('strong', { style: { fontSize: 13, color: earned ? '#d1fae5' : T.dim, flex: 1 } }, b.name),
                      earned ? h('span', { style: { fontSize: 16, color: T.good } }, '✓') : h('span', { style: { fontSize: 14, color: T.dim } }, '🔒')
                    ),
                    h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                      h('strong', { style: { color: earned ? '#a7f3d0' : T.dim } }, earned ? '🏅 Earned: ' : '🔒 To earn: '), b.how)
                  );
                })
              )
            );
          }),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // RESOURCES view
      // ─────────────────────────────────────────
      function renderResources() {
        function section(title, items) {
          return h('div', { style: { marginBottom: 16, padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, title),
            items.map(function(r, i) {
              return h('div', { key: i, style: { padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid ' + T.border : 'none' } },
                h('strong', { style: { fontSize: 13, color: T.text, display: 'block', marginBottom: 2 } }, r.name),
                h('div', { style: { fontSize: 13, color: T.accentHi, fontWeight: 600, marginBottom: 2 } },
                  r.url
                    ? h('a', { href: r.url, target: '_blank', rel: 'noopener', style: { color: T.accentHi, textDecoration: 'underline' }, 'aria-label': r.name + ' — opens in new tab' }, r.contact)
                    : r.contact),
                h('div', { style: { fontSize: 11, color: T.dim, lineHeight: 1.5 } }, r.desc)
              );
            })
          );
        }
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📚 Resources'),
          h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Primary research sources + free tools + Maine career orgs.'),
          section('🎯 UDL framework', RESOURCES.udl),
          section('🔬 Foundational research papers', RESOURCES.research),
          section('🛠️ Practical learning tools', RESOURCES.practical),
          section('🏅 Career credentialing orgs', RESOURCES.careers),
          section('🌲 Maine + EL Education', RESOURCES.maine),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // VIEW ROUTER
      // ─────────────────────────────────────────
      switch (view) {
        case 'bloom':         return renderBloom();
        case 'cogload':       return renderCogLoad();
        case 'metacog':       return renderMetacog();
        case 'zpd':           return renderZpd();
        case 'udlPrinciples': return renderUDL();
        case 'spaced':        return renderSpaced();
        case 'study':         return renderStudy();
        case 'mindset':       return renderMindset();
        case 'myths':         return renderMyths();
        case 'careers-list':  return renderCareers();
        case 'maine-progs':   return renderMaineProgs();
        case 'quiz':          return renderQuiz();
        case 'badges':        return renderBadges();
        case 'resources':     return renderResources();
        case 'menu':
        default:              return renderMenu();
      }
      } catch(e) {
        console.error('[LearningLab] render error', e);
        return ctx.React.createElement('div', { style: { padding: 16, color: '#fde2e2', background: '#7f1d1d', borderRadius: 8 } },
          'Learning Lab failed to render. ' + (e && e.message ? e.message : ''));
      }
    }
  });

})();

}
