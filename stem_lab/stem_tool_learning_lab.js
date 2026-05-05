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
  // SECTION 12.1: LESSON PLAN BUILDER data — Bloom's-aligned activities + assessments
  // For each Bloom's level, suggested activity types + assessment formats
  // matched to that cognitive level.
  // ─────────────────────────────────────────────────────────
  var BLOOMS_ACTIVITIES = {
    remember: {
      activities: ['Flashcard practice', 'Quizlet sets', 'Memorization games (Kahoot)', 'Labeling diagrams', 'Matching exercises', 'Fill-in-the-blank notes'],
      assessments: ['Multiple-choice test', 'Fill-in-the-blank quiz', 'True/false quiz', 'Matching test', 'Recall checklist'],
      assessmentVerbs: ['list', 'identify', 'name', 'recall', 'recognize', 'state']
    },
    understand: {
      activities: ['Summarize a chapter in 3 sentences', 'Paraphrase a passage', 'Draw a concept map', 'Explain to a partner (think-pair-share)', 'Create a Venn diagram', 'Translate technical text into plain language'],
      assessments: ['Short-answer questions', 'Concept map evaluation', 'One-paragraph summary', 'Oral explanation', 'Picture/word matching with explanation'],
      assessmentVerbs: ['explain', 'describe', 'summarize', 'paraphrase', 'classify', 'compare']
    },
    apply: {
      activities: ['Solve novel problems using learned formulas', 'Use a procedure on a new dataset', 'Demonstrate a technique', 'Role-play a scenario', 'Apply a model to current events', 'Conduct a case study'],
      assessments: ['Word problems', 'Performance task', 'Lab report (procedure execution)', 'Real-world scenario response', 'Skill demonstration with rubric'],
      assessmentVerbs: ['solve', 'demonstrate', 'execute', 'implement', 'use', 'interpret']
    },
    analyze: {
      activities: ['Compare/contrast essay', 'Source analysis', 'Identifying logical fallacies in a text', 'Breaking down an argument', 'Distinguishing fact from opinion', 'Examining an artwork for techniques'],
      assessments: ['Compare/contrast essay', 'Source critique', 'Argument map', 'Annotated bibliography', 'Pro/con analysis with evidence'],
      assessmentVerbs: ['differentiate', 'organize', 'compare', 'contrast', 'examine', 'distinguish']
    },
    evaluate: {
      activities: ['Defend a position in a debate', 'Critique a peer\'s work using a rubric', 'Judge competing solutions', 'Evaluate sources for credibility', 'Argue from multiple perspectives', 'Make + justify recommendations'],
      assessments: ['Persuasive essay with sources', 'Peer-review with rubric', 'Decision matrix with justification', 'Debate (judged by rubric)', 'Position paper'],
      assessmentVerbs: ['argue', 'defend', 'judge', 'critique', 'support', 'appraise']
    },
    create: {
      activities: ['Design an experiment', 'Compose original work (poem, song, story)', 'Build a working model', 'Develop a business plan', 'Author a research proposal', 'Invent a solution to a real problem'],
      assessments: ['Original product (creative work)', 'Design portfolio with documentation', 'Innovation showcase', 'Capstone project', 'Original research paper or experiment'],
      assessmentVerbs: ['design', 'compose', 'construct', 'develop', 'invent', 'author']
    }
  };

  var GRADE_BAND_GUIDANCE = {
    elementary: 'K-5: Heavy on Remember + Understand. Begin Apply + simple Analyze (compare 2 things). Avoid abstract Evaluate + Create until cognitive maturity supports it.',
    middle: '6-8: Apply + Analyze are the wheelhouse. Begin Evaluate. Create through scaffolded projects.',
    highSchool: '9-12: Full range. Strong Evaluate + Create work. Push for self-directed analysis + argumentation.',
    college: 'Full range with emphasis on Evaluate + Create. Synthesize across sources + frameworks.'
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 12.2: STRATEGY PICKER data — input-driven recommendations
  // Given subject, time available, assessment type, and prior knowledge,
  // recommend the matching evidence-backed strategies.
  // ─────────────────────────────────────────────────────────
  var STRATEGY_RECS = {
    // High-utility strategies are recommended in nearly all cases
    base: ['practice-testing', 'distributed-practice'],
    // Conditional add-ons
    byAssessment: {
      'multiple-choice': ['practice-testing', 'self-quizzing'],
      'short-answer': ['practice-testing', 'free-recall', 'self-explanation'],
      'essay': ['outlining', 'self-explanation', 'elaborative-interrogation', 'peer-review'],
      'performance-task': ['deliberate-practice', 'feedback-cycles', 'modeling-then-practice'],
      'project': ['interleaving', 'spaced-checkpoints', 'self-explanation', 'iterative-feedback']
    },
    bySubject: {
      'math': ['interleaving', 'worked-examples', 'self-explanation'],
      'language-arts': ['active-reading-SQ3R', 'free-recall', 'elaborative-interrogation'],
      'science': ['concept-mapping', 'practice-testing', 'self-explanation'],
      'social-studies': ['active-reading-SQ3R', 'practice-testing', 'cause-effect-mapping'],
      'foreign-language': ['spaced-repetition-flashcards', 'output-practice', 'comprehensible-input'],
      'arts': ['deliberate-practice', 'feedback-cycles', 'critique-then-revise'],
      'standardized-test': ['practice-testing', 'distributed-practice', 'mixed-problem-sets']
    },
    byTime: {
      'cramming-tonight': ['practice-testing-only', 'CAVEAT-cramming-hurts-retention'],
      'few-days': ['distributed-2-3-sessions', 'practice-testing', 'sleep-between-sessions'],
      '1-2-weeks': ['distributed-5-7-sessions', 'spaced-retrieval', 'interleaving'],
      'month-plus': ['spaced-repetition-app', 'interleaving', 'periodic-cumulative-review']
    },
    byPriorKnowledge: {
      'novice': ['worked-examples-first', 'gradual-release', 'low-stakes-practice'],
      'some-familiarity': ['retrieval-practice', 'self-explanation', 'concept-mapping'],
      'strong': ['interleaving', 'elaborative-interrogation', 'creating-novel-problems']
    }
  };

  var STRATEGY_DETAILS = {
    'practice-testing': { name: 'Practice testing', what: 'Self-test with practice questions, flashcards, or free recall.' },
    'distributed-practice': { name: 'Distributed practice (spacing)', what: 'Spread study sessions over multiple days.' },
    'self-quizzing': { name: 'Self-quizzing', what: 'Cover answers + try to recall before checking.' },
    'free-recall': { name: 'Free recall', what: 'Close the book + write everything you remember.' },
    'self-explanation': { name: 'Self-explanation (Feynman)', what: 'Explain it aloud or in writing as if teaching.' },
    'outlining': { name: 'Outlining', what: 'Hierarchical notes that show structure of an argument.' },
    'elaborative-interrogation': { name: 'Elaborative interrogation', what: 'Ask "why?" about facts you\'re learning.' },
    'peer-review': { name: 'Peer review with rubric', what: 'Trade work with a classmate; give specific feedback.' },
    'deliberate-practice': { name: 'Deliberate practice', what: 'Focused, effortful practice on weak spots with feedback.' },
    'feedback-cycles': { name: 'Feedback cycles', what: 'Practice → feedback → revise → repeat.' },
    'modeling-then-practice': { name: 'Modeling then practice', what: 'Watch an expert; then attempt with their approach.' },
    'interleaving': { name: 'Interleaving', what: 'Mix problem types instead of blocking them.' },
    'spaced-checkpoints': { name: 'Spaced checkpoints', what: 'Small deadlines spread across project timeline.' },
    'iterative-feedback': { name: 'Iterative feedback', what: 'Multiple draft cycles with input.' },
    'worked-examples': { name: 'Worked examples first', what: 'Study completed solutions before attempting yours.' },
    'active-reading-SQ3R': { name: 'SQ3R reading method', what: 'Survey, Question, Read, Recite, Review.' },
    'concept-mapping': { name: 'Concept mapping (post-study, from memory)', what: 'Draw concept relationships from memory; check after.' },
    'cause-effect-mapping': { name: 'Cause-effect mapping', what: 'Diagram how events flow into other events.' },
    'spaced-repetition-flashcards': { name: 'Anki/Quizlet spaced flashcards', what: 'Software-scheduled review of cards.' },
    'output-practice': { name: 'Output practice', what: 'Speak/write the language, don\'t just consume input.' },
    'comprehensible-input': { name: 'Comprehensible input', what: 'Read/listen to material 10-20% above your level.' },
    'critique-then-revise': { name: 'Critique then revise', what: 'Get feedback on a draft; revise; resubmit.' },
    'mixed-problem-sets': { name: 'Mixed problem sets', what: 'Practice tests with mixed problem types (interleaved).' },
    'practice-testing-only': { name: 'Practice testing (cram-mode)', what: 'Do as much retrieval practice as possible.' },
    'CAVEAT-cramming-hurts-retention': { name: '⚠️ CAVEAT', what: 'Cramming may help next-day performance but cripples long-term retention. Only use as last resort. Schedule properly next time.' },
    'distributed-2-3-sessions': { name: 'Distribute across 2-3 sessions', what: 'Even 3 days vs 1 night doubles retention.' },
    'sleep-between-sessions': { name: 'Sleep between study sessions', what: 'Sleep consolidates memory. Spaced practice works better with sleep gaps.' },
    'distributed-5-7-sessions': { name: 'Distribute across 5-7 sessions', what: 'A session every other day or daily for shorter periods.' },
    'spaced-retrieval': { name: 'Spaced retrieval', what: 'Self-test at increasing intervals (1 day → 3 days → 1 week → 2 weeks).' },
    'spaced-repetition-app': { name: 'Anki / Quizlet spaced-rep mode', what: 'Software handles the spacing schedule automatically.' },
    'periodic-cumulative-review': { name: 'Periodic cumulative review', what: 'Every week or two, mix in older content.' },
    'gradual-release': { name: 'I do / We do / You do', what: 'Watch model → guided practice → independent.' },
    'low-stakes-practice': { name: 'Low-stakes practice', what: 'Practice without grade pressure to avoid anxiety load.' },
    'creating-novel-problems': { name: 'Create your own novel problems', what: 'When you can write the problems, you understand it. Highest-level demonstration.' }
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 12.3: RECOMMENDED LEARNING PATH — 4-week curated walkthrough
  // ─────────────────────────────────────────────────────────
  var LEARNING_PATH = [
    { week: 1, title: 'Week 1 — Foundation vocabulary', icon: '🧠',
      theme: 'Build the mental models. The vocabulary you\'ll use in every later module.',
      modules: [
        { id: 'bloom', why: 'The most-referenced framework in education. You\'ll see Bloom\'s verbs in every textbook + curriculum guide. Get fluent here.' },
        { id: 'cogload', why: 'Working memory limits explain why some lessons feel impossible. Understanding the 3 load types is half the battle for designing good learning.' },
        { id: 'metacog', why: 'The single biggest predictor of academic outcomes beyond raw IQ. Get fluent in plan/monitor/evaluate.' },
        { id: 'zpd', why: 'Vygotsky\'s ZPD + scaffolding fades — the architecture under most good teaching.' }
      ],
      outcome: 'You can describe a learning task in terms of Bloom\'s level + cognitive load demands + scaffolding needs. You\'ve self-rated your own metacognition.' },
    { week: 2, title: 'Week 2 — UDL + the strategies that work', icon: '🎯',
      theme: 'The framework + the practical kit. Most-evidence-backed practices.',
      modules: [
        { id: 'udlPrinciples', why: 'AlloFlow itself is built on UDL. Knowing the framework lets you use the platform deliberately + advocate for its principles in your own classes.' },
        { id: 'spaced', why: 'The most underused practice in student life. 30 minutes here changes how you study forever.' },
        { id: 'study', why: 'The Dunlosky 2013 ratings. Replace your low-utility habits (highlighting, rereading) with high-utility ones (practice testing, spacing).' },
        { id: 'memory', why: 'Specific techniques (Feynman, mnemonic devices, dual coding, interleaving in detail). Pick 1-2 to try this week.' }
      ],
      outcome: 'You\'ve picked one strategy from Dunlosky\'s HIGH-utility list + tried it on real schoolwork this week. You\'ve identified 1 UDL guideline you want a teacher (or yourself) to use more.' },
    { week: 3, title: 'Week 3 — Critical thinking + myth-busting', icon: '🚫',
      theme: 'Distinguish what works from what feels right. Especially valuable for future teachers.',
      modules: [
        { id: 'myths', why: '8 myths every educator should reject. Quote-able rebuttals for when you encounter them.' },
        { id: 'mindset', why: 'Quick visit. Honest about replication issues. Cross-link to the deep dive (sel_tool_growthmindset.js).' }
      ],
      outcome: 'You can rebut "but I\'m a visual learner" with the Pashler 2008 evidence. You can explain why Lumosity isn\'t making people smarter.' },
    { week: 4, title: 'Week 4 — Apply it: lesson planning + strategy picking + careers', icon: '🎯',
      theme: 'Active practice with the tools. + Career exploration.',
      modules: [
        { id: 'lessonPlan', why: 'Turn Bloom\'s vocabulary into actual learning objectives. Practice with a topic from your own life.' },
        { id: 'strategyPicker', why: 'Input-driven: get evidence-backed strategy recommendations for a real assignment you have this week.' },
        { id: 'careers-list', why: 'Education careers from teacher to school psych (Aaron\'s path) to instructional designer.' },
        { id: 'maine-progs', why: 'Maine-specific degree pathways. USM, UMaine, UMF, etc.' }
      ],
      outcome: 'You\'ve drafted at least one Bloom\'s-aligned learning objective. You\'ve gotten strategy recommendations for a real assignment. You\'ve identified 1-2 careers worth more research. You\'re ready for the 50-question quiz.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 12.4: GLOSSARY — pedagogy + cognitive science terms
  // ─────────────────────────────────────────────────────────
  var GLOSSARY = [
    // Bloom's + curriculum design
    { term: 'Bloom\'s Taxonomy', tag: 'curriculum', def: '6-level hierarchy of cognitive demand (Remember → Understand → Apply → Analyze → Evaluate → Create). Revised 2001 by Anderson + Krathwohl.' },
    { term: 'Learning objective', tag: 'curriculum', def: 'Measurable statement of what a student will be able to do. Uses a specific verb at the target Bloom\'s level.' },
    { term: 'Backward design', tag: 'curriculum', def: 'Wiggins + McTighe. Design starting from the desired result + assessment, then plan instruction. Inverts traditional "cover the textbook" planning.' },
    { term: 'Scope and sequence', tag: 'curriculum', def: 'A document showing what content is taught + in what order, across a unit, course, or grade.' },
    // Cognitive science
    { term: 'Cognitive load', tag: 'cogsci', def: 'Mental effort required by a task. Three types: intrinsic (task itself), extraneous (poor design), germane (schema-building).' },
    { term: 'Working memory', tag: 'cogsci', def: 'Short-term mental workspace. Holds ~4 ± 1 novel chunks (Cowan 2001). Hard limit on how much info we can manipulate at once.' },
    { term: 'Schema', tag: 'cogsci', def: 'A mental framework that organizes related knowledge. Experts have rich schemas; novices have fragmented ones.' },
    { term: 'Chunking', tag: 'cogsci', def: 'Grouping individual pieces into a single meaningful unit. Expertise = better chunking. "1776" is one chunk for a US history student, four for a beginner.' },
    { term: 'Long-term memory', tag: 'cogsci', def: 'Durable storage. Effectively unlimited capacity. Built through retrieval + spaced practice.' },
    { term: 'Encoding', tag: 'cogsci', def: 'The process of converting incoming info into a memory trace. Active processing (self-explanation) encodes deeper than passive (rereading).' },
    { term: 'Retrieval', tag: 'cogsci', def: 'Pulling info OUT of long-term memory. Each successful retrieval strengthens the path back to that memory.' },
    { term: 'Forgetting curve (Ebbinghaus 1885)', tag: 'cogsci', def: 'Exponential decay of memory without practice. ~70% of new info forgotten within 24 hours. Spaced retrievals flatten the curve.' },
    // Metacognition
    { term: 'Metacognition', tag: 'metacog', def: 'Thinking about thinking. Self-monitoring + self-regulating + self-evaluating one\'s own learning processes.' },
    { term: 'Calibration', tag: 'metacog', def: 'Match between predicted + actual performance. Well-calibrated learners know what they don\'t know.' },
    { term: 'Self-efficacy', tag: 'metacog', def: 'Bandura. Belief that you can succeed at a specific task. Different from self-esteem.' },
    { term: 'Illusion of fluency', tag: 'metacog', def: 'When familiarity from rereading or watching feels like understanding, but you can\'t actually use the knowledge.' },
    // UDL
    { term: 'UDL (Universal Design for Learning)', tag: 'udl', def: 'CAST framework. 3 principles (Engagement, Representation, Action+Expression) + 9 guidelines that anticipate learner variability up front.' },
    { term: 'Multiple means of engagement', tag: 'udl', def: 'UDL principle. The WHY of learning. Choice, relevance, identity, sustaining effort.' },
    { term: 'Multiple means of representation', tag: 'udl', def: 'UDL principle. The WHAT of learning. Multimodal info presentation, vocabulary support, comprehension scaffolds.' },
    { term: 'Multiple means of action + expression', tag: 'udl', def: 'UDL principle. The HOW of learning. Multiple ways to interact + demonstrate learning.' },
    // Vygotsky
    { term: 'ZPD (Zone of Proximal Development)', tag: 'vygotsky', def: 'Vygotsky. Tasks the learner can do WITH HELP that they can\'t do alone. The sweet spot for instruction.' },
    { term: 'Scaffolding', tag: 'vygotsky', def: 'Temporary support a more-capable peer or teacher provides; faded as learner gains competence.' },
    { term: 'Gradual release of responsibility', tag: 'vygotsky', def: 'Pearson + Gallagher 1983. I do (model) → We do (joint) → You do (independent). Standard scaffolding sequence.' },
    { term: 'More Knowledgeable Other (MKO)', tag: 'vygotsky', def: 'Vygotsky\'s term for the person providing scaffolding — could be a teacher, peer, parent, or even a tool.' },
    // Strategies
    { term: 'Practice testing (testing effect)', tag: 'strategy', def: 'Self-testing during study. HIGH utility per Dunlosky 2013. Strengthens retrieval paths.' },
    { term: 'Distributed practice (spacing)', tag: 'strategy', def: 'Spreading study across multiple sessions over time vs. cramming. HIGH utility.' },
    { term: 'Interleaving', tag: 'strategy', def: 'Mixing problem types in practice (vs. blocking). Forces discrimination, improves transfer.' },
    { term: 'Elaborative interrogation', tag: 'strategy', def: 'Asking "why?" about facts you\'re learning. MODERATE utility.' },
    { term: 'Self-explanation', tag: 'strategy', def: 'Explaining concepts aloud or in writing as if teaching someone. The Feynman technique.' },
    { term: 'Free recall', tag: 'strategy', def: 'Closing the book + writing everything you remember. Pure retrieval practice.' },
    { term: 'Cornell notes', tag: 'strategy', def: '3-section page (cues / notes / summary). Builds in retrieval practice via the post-class summary step.' },
    { term: 'SQ3R', tag: 'strategy', def: 'Survey, Question, Read, Recite, Review. The Recite + Review steps are the empirically-supported parts.' },
    { term: 'Mnemonic', tag: 'strategy', def: 'Memory aid using vivid imagery, acronyms, or songs. Useful for arbitrary lists; less useful for conceptual understanding.' },
    { term: 'Method of loci', tag: 'strategy', def: 'Memory technique using a familiar physical space; place items along the route + walk through to recall.' },
    { term: 'Dual coding', tag: 'strategy', def: 'Paivio. Combining verbal + visual representations of the same content strengthens memory.' },
    // Mindset + motivation
    { term: 'Growth mindset', tag: 'motivation', def: 'Dweck. Belief that ability develops with effort + good strategies. Modest evidence base; useful principles even if oversold by popular books.' },
    { term: 'Fixed mindset', tag: 'motivation', def: 'Dweck. Belief that ability is innate + static.' },
    { term: 'Self-determination theory', tag: 'motivation', def: 'Deci + Ryan. 3 needs: autonomy, competence, relatedness. When met, intrinsic motivation thrives.' },
    { term: 'Intrinsic motivation', tag: 'motivation', def: 'Drive that comes from within (interest, curiosity). More durable than extrinsic.' },
    { term: 'Extrinsic motivation', tag: 'motivation', def: 'Drive from external rewards/punishments (grades, praise, money). Useful in moderation; can crowd out intrinsic if overused.' },
    { term: 'Stereotype threat', tag: 'motivation', def: 'Steele + Aronson. When awareness of a negative group stereotype reduces performance for members of that group on that task.' },
    // Assessment
    { term: 'Formative assessment', tag: 'assessment', def: 'Assessment FOR learning. Quick checks during instruction to adjust teaching. Exit tickets, mini-quizzes, drafts with feedback.' },
    { term: 'Summative assessment', tag: 'assessment', def: 'Assessment OF learning. Measures attainment AT THE END. Final exam, end-of-unit project, standardized test.' },
    { term: 'Validity', tag: 'assessment', def: 'Does the assessment measure what it claims to measure? A math test full of word problems may be measuring reading.' },
    { term: 'Reliability', tag: 'assessment', def: 'Does the assessment give consistent results across raters + occasions? Inter-rater reliability for essays; test-retest for quizzes.' },
    { term: 'Rubric', tag: 'assessment', def: 'Scoring guide with explicit criteria + performance levels. Improves reliability + makes expectations transparent.' },
    // Accommodations + identity
    { term: 'IEP (Individualized Education Program)', tag: 'sped', def: 'Legally-binding plan under IDEA for K-12 students with disabilities. Specifies services + accommodations + goals.' },
    { term: '504 Plan', tag: 'sped', def: 'Section 504 of Rehabilitation Act. Provides accommodations (e.g., extended time) for students with disabilities; broader scope than IEP.' },
    { term: 'Accommodation', tag: 'sped', def: 'A change in HOW a student accesses or demonstrates learning, without changing the standard. (E.g., extended time, audio version of text.)' },
    { term: 'Modification', tag: 'sped', def: 'A change in WHAT a student is expected to learn or demonstrate. (E.g., learning a subset of grade-level standards.)' },
    // EL Education
    { term: 'EL Education / Expeditionary Learning', tag: 'el', def: 'Whole-school + curriculum model. Crew (advisory) + HOWLs (Habits of Work and Learning) + Expeditions (long-term projects).' },
    { term: 'Crew', tag: 'el', def: 'EL Education advisory + character education time. "We are crew, not passengers" — community + accountability.' },
    { term: 'HOWLs (Habits of Work and Learning)', tag: 'el', def: 'EL Education non-academic skills tracked alongside academics. Things like preparedness, perseverance, contribution.' },
    { term: 'Expedition', tag: 'el', def: 'EL Education long-term (6-12 week) project-based learning unit centered on a compelling case study + culminating product.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 12.5: MEMORY + ACTIVE LEARNING TECHNIQUES
  // Specific techniques beyond the Dunlosky overview. Concrete + actionable.
  // ─────────────────────────────────────────────────────────
  var MEMORY_TECHNIQUES = [
    { id: 'feynman', icon: '🗣️', name: 'The Feynman Technique',
      what: 'Explain a concept aloud, in plain language, as if teaching a 12-year-old. When you stumble, you\'ve found a knowledge gap.',
      how: '(1) Pick a concept. (2) Explain it aloud + write it out without jargon. (3) Notice where you struggle or use vague words. (4) Go back to the source + fill those gaps. (5) Re-explain, simpler.',
      when: 'After studying a topic; before a test; whenever you want to verify understanding.',
      research: 'Self-explanation is in Dunlosky 2013 as moderate-utility. Named after Richard Feynman, Nobel-winning physicist who taught by simplification.',
      example: 'Topic: photosynthesis. Try to explain WITHOUT using "chlorophyll" or "ATP" — just plain English. The places where the explanation breaks are exactly the places to study more.' },
    { id: 'method-of-loci', icon: '🏛️', name: 'Method of loci (memory palace)',
      what: 'Mentally walk a familiar route (your home, school, route to work). Place vivid images of items to remember at each location. Recall by mentally walking the route.',
      how: '(1) Pick a route you know cold (10 stops). (2) Make each item to remember into a vivid, weird image. (3) Place each image at a specific location on the route. (4) To recall, walk the route mentally + look at each location.',
      when: 'Memorizing arbitrary lists (presidents, periodic table, vocabulary). Less useful for conceptual understanding.',
      research: 'Ancient technique (Romans, "Ad Herennium" 80 BCE). Modern study: Maguire et al. 2003 showed memory athletes use this technique + show specific brain activation patterns.',
      example: 'Memorizing first 5 elements of periodic table: HYDROGEN bomb at your front door; HELIUM balloons in the hallway; LITHIUM batteries on the kitchen counter; etc.' },
    { id: 'mnemonic-devices', icon: '🎵', name: 'Mnemonic devices',
      what: 'Acronyms, rhymes, songs, or imagery that encode arbitrary information.',
      how: 'Acronym: FANBOYS = coordinating conjunctions (For, And, Nor, But, Or, Yet, So). Rhyme: "30 days hath September..." Song: alphabet song. Imagery: Vivid mental pictures linking concepts.',
      when: 'Lists where order or specific recall matters. Foreign vocabulary. Ordered procedures.',
      research: 'Dunlosky 2013: "keyword mnemonic" rated LOW utility for general learning, but acronyms + rhymes work well for the specific task of remembering ordered lists.',
      example: 'PEMDAS for order of operations (Parentheses, Exponents, Multiplication, Division, Addition, Subtraction). Or "Please Excuse My Dear Aunt Sally."' },
    { id: 'dual-coding', icon: '🎨', name: 'Dual coding',
      what: 'Combine verbal + visual representations of the same content. Words PLUS image strengthens both.',
      how: 'When studying, draw or sketch concepts (don\'t copy textbook diagrams — make your own). Match words with images. Use diagrams + flowcharts. NOT just decorative pictures — functional visuals that show structure.',
      when: 'Conceptual material with structure (cycles, processes, hierarchies, comparisons). Less useful for arbitrary lists.',
      research: 'Paivio (1971). Dual coding theory: verbal + visual processing in parallel + integrated paths increase recall vs verbal-only.',
      example: 'Studying photosynthesis: don\'t just read about it. Draw the chloroplast + arrows showing inputs (CO₂, water, sunlight) + outputs (glucose, O₂). The drawing is itself an act of encoding.' },
    { id: 'interleaving-deep', icon: '🔀', name: 'Interleaved practice (deep dive)',
      what: 'Mix problem types in practice instead of blocking. After learning quadratic + linear + exponential equations separately, practice with all three mixed.',
      how: 'Take your textbook. Make a problem set with the LAST 3 chapters mixed together, problems shuffled. Solve each by first identifying which type, then applying the method.',
      when: 'After initial blocked practice (when learning a method). Powerful for math, science, languages.',
      research: 'Rohrer + Taylor (2007). Interleaving doubled long-term retention vs blocked practice. Birnbaum et al. (2013) replicated for category learning.',
      example: 'Math: don\'t do 20 quadratic problems then 20 trig problems then 20 calc problems. Mix them. Yes, it FEELS harder. Yes, it WORKS better.',
      caveat: 'Interleaving feels harder + you\'ll perform WORSE during practice (you\'re not in flow). Performance during practice ≠ learning. The harder practice produces durable memory.' },
    { id: 'spacing-deep', icon: '⏰', name: 'Spaced repetition (deep dive)',
      what: 'Review material at increasing intervals: 1 day, 3 days, 1 week, 2 weeks, 1 month, etc. Each successful retrieval extends the next interval.',
      how: 'Use Anki or Quizlet (spaced-rep mode) — they handle the schedule automatically. Or paper flashcards with 5 boxes (Leitner system): cards you got right move to a box reviewed less often.',
      when: 'Vocabulary, anatomy, dates, formulas, any cumulative content. Especially for foreign languages + medical school + bar/MCAT prep.',
      research: 'Cepeda et al. (2008). Optimal spacing depends on retention interval — generally, the longer you need to remember, the longer the optimal gap.',
      example: 'Foreign-language vocabulary: 500 cards in Anki. Each day, software shows you the cards "due" that day. Hard cards repeat sooner; easy cards stretch out. Compounds beautifully over months.' },
    { id: 'free-recall-deep', icon: '✍️', name: 'Free recall (brain dump)',
      what: 'Close the book + write everything you remember about a topic. Then check what you missed.',
      how: '(1) Spend 15-20 minutes studying or reviewing notes. (2) Close everything. (3) Set a timer for 10 minutes. (4) Write everything you can recall on a blank page. (5) Open notes + check. Re-study what you missed. Repeat.',
      when: 'Within 24 hours of first learning + at increasing intervals after.',
      research: 'Karpicke + Roediger (2008). Free recall is one of the strongest forms of retrieval practice.',
      example: 'After reading a chapter on the French Revolution, close the book. On a blank page, write a timeline + the 5 most important figures + 3 causes + 3 consequences — from memory only.' },
    { id: 'concept-mapping-from-memory', icon: '🗺️', name: 'Concept mapping (from memory)',
      what: 'Draw a map showing how concepts relate to each other — but FROM MEMORY, not while looking at notes.',
      how: '(1) Pick a topic. (2) Without notes, draw a node for the central concept. (3) Branch out to related concepts; connect with labeled lines (cause, type-of, requires, etc.). (4) After drawing, open notes + correct + add what you missed.',
      when: 'After reading a unit. Especially useful for biology, history, literature — anywhere relationships matter.',
      research: 'Karpicke + Blunt (2011). Concept mapping FROM MEMORY beats concept mapping WHILE LOOKING AT NOTES. The retrieval is the active ingredient.',
      example: 'Biology unit on cell respiration: blank page, central node = "cell respiration." Branch to glycolysis, Krebs, electron transport. Add inputs/outputs of each. Connect to ATP. THEN check your notes.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 12.6: TEST ANXIETY + PERFORMANCE STRATEGIES
  // Anxiety isn't always bad (Yerkes-Dodson optimal arousal). But high
  // anxiety crowds working memory + crashes performance. This module:
  // recognize the 4 components, pre-test routine, during-test strategies,
  // physiological calming, cognitive reframes, when to seek formal help.
  // ─────────────────────────────────────────────────────────
  var TEST_ANXIETY_OVERVIEW = {
    yerkesDodson: 'Yerkes + Dodson (1908). Performance follows an inverted U with arousal — too LOW = bored + unfocused; OPTIMAL = alert + engaged; too HIGH = panic + working memory crashes. Goal: stay in the optimal middle.',
    fourComponents: [
      { id: 'cognitive', icon: '💭', name: 'Cognitive (the thoughts)',
        what: 'Catastrophic thinking ("I\'m going to fail"), mind-blanking, intrusive worries about consequences.',
        cost: 'Working memory (Cowan\'s 4±1) gets eaten by worry. Less capacity left for the actual task.' },
      { id: 'affective', icon: '😟', name: 'Affective (the feelings)',
        what: 'Dread, helplessness, shame, fear. Often disproportionate to actual stakes.',
        cost: 'Emotional load adds to cognitive load. Both eat working memory. Compounds with the cognitive component.' },
      { id: 'physiological', icon: '💓', name: 'Physiological (the body)',
        what: 'Racing heart, shallow breathing, sweating, stomach upset, trembling, dry mouth.',
        cost: 'Body interprets test = threat. Activates fight-or-flight. Brain can\'t allocate full resources to thinking.' },
      { id: 'behavioral', icon: '🏃', name: 'Behavioral (the actions)',
        what: 'Procrastination, avoidance, "studying" without retaining, leaving the test early, freezing on questions.',
        cost: 'Avoidance temporarily relieves anxiety but increases it long-term (anxiety grows when you don\'t prove to yourself you can handle it).' }
    ]
  };

  var PRE_TEST_ROUTINE = [
    { n: 1, what: 'Sleep 7-9 hours night before',
      why: 'Sleep consolidates memory. Cramming during sleep hours wastes the benefit. One night of bad sleep impairs working memory ~10-15%.',
      tip: 'No new material after 9pm. Light review only. Lights out at usual time.' },
    { n: 2, what: 'Eat protein + complex carbs 60-90 min before',
      why: 'Brain needs glucose. Sugar crash from a candy bar at minute 30 of a 2-hour test is real.',
      tip: 'Eggs, oatmeal, yogurt + fruit. Avoid heavy/greasy foods that pull blood to digestion.' },
    { n: 3, what: 'Hydrate (but not too much)',
      why: 'Mild dehydration impairs cognition. Bathroom emergency mid-test impairs more.',
      tip: 'Water 1-2 hours before. Empty bladder right before walking in.' },
    { n: 4, what: 'Caffeine: usual amount only',
      why: 'Test day is NOT the day to try a new dose. Doubling caffeine = jitters + faster heart rate = mistaken for anxiety.',
      tip: 'If you usually have one cup, have one cup. If you don\'t do caffeine, today is not the day to start.' },
    { n: 5, what: 'Arrive early but not too early',
      why: '15-20 minutes is the sweet spot. Earlier = sitting around getting more anxious. Later = rushed + flustered.',
      tip: 'Know the route + parking + bathroom location BEFORE the day so the morning has no surprises.' },
    { n: 6, what: 'Skip the panicked review at the door',
      why: 'Last-minute "I forgot everything!" cramming creates more anxiety + competes with already-encoded memory.',
      tip: 'Bring a calm activity (favorite book, music, breathing) for the 15 min before. Don\'t talk to anxious classmates.' },
    { n: 7, what: 'One deep-breath ritual at the desk',
      why: 'Deliberate slowing of breath signals safety to nervous system. Breaks the panic loop before it escalates.',
      tip: '4-7-8 breathing: inhale 4 sec, hold 7 sec, exhale 8 sec. Once or twice. Then begin.' }
  ];

  var DURING_TEST_STRATEGIES = [
    { n: 1, what: 'Read directions TWICE',
      why: 'Anxiety makes you skim. Skimming = missed instructions = wrong answers on questions you knew.',
      tip: 'Even if you "know" the format. Five seconds saves fifteen-point questions.' },
    { n: 2, what: 'Survey the test before answering',
      why: 'Knowing the time budget per question (total time / questions) prevents the "ran out of time on essays" disaster.',
      tip: '90 min / 60 questions = 1.5 min average. Note the high-point questions; allocate more time there.' },
    { n: 3, what: 'Easy questions first',
      why: 'Builds momentum + confidence. Wins on easy questions calm the cognitive component of anxiety.',
      tip: 'On a multiple-choice section, do all the easy ones first. Mark hard ones; come back. Don\'t get stuck.' },
    { n: 4, what: 'Time budget + hard limits',
      why: 'A tough question can eat 15 min. Then you panic over time + perform worse on remaining.',
      tip: 'Set personal limits: "max 3 min on a 1-min question." If over, mark + move on. Come back at the end.' },
    { n: 5, what: 'Pause-and-breathe at midpoint',
      why: 'Mid-test mini-resets prevent compounding fatigue + anxiety.',
      tip: 'At halfway: close eyes 10 seconds. 1 deep breath. Stretch shoulders. Resume.' },
    { n: 6, what: 'When stuck: physically refocus',
      why: 'Mental loops self-amplify. Breaking the loop physically resets attention.',
      tip: 'Look up + away for 5 seconds. Roll shoulders. Drink water. Then re-read the question.' },
    { n: 7, what: 'For mind-blanks: write what you DO know',
      why: 'Often the "blank" is just the FIRST thing not coming. Adjacent knowledge unlocks the target.',
      tip: 'Write related vocabulary, formulas, partial answers. Almost always triggers the locked memory.' },
    { n: 8, what: 'Use ALL the time',
      why: 'Leaving early ≠ being a star. Reviewing answers catches careless mistakes (wrong-bubble, sign errors, etc.).',
      tip: 'Final 5-10 minutes: revisit marked questions, check arithmetic, verify you bubbled correctly.' }
  ];

  var CALMING_TECHNIQUES = [
    { id: 'breathing-478', icon: '🌬️', name: '4-7-8 breathing',
      how: 'Inhale through nose 4 seconds. Hold breath 7 seconds. Exhale through mouth 8 seconds. Repeat 3-4 cycles.',
      whyWorks: 'Long exhales activate parasympathetic nervous system (the "rest" branch). Heart rate slows. Body downshifts from fight-or-flight.',
      whenToUse: 'Right before walking into the test room. At a desk if anxiety spikes mid-test (silently — no one will notice).',
      research: 'Slow breathing reduces stress markers + improves heart-rate variability (Zaccaro et al. 2018).' },
    { id: 'grounding-54321', icon: '🌍', name: '5-4-3-2-1 grounding',
      how: 'Name (silently): 5 things you see, 4 things you can touch, 3 things you hear, 2 things you smell, 1 thing you taste.',
      whyWorks: 'Forces attention OUT of internal threat-loop and INTO the immediate environment. Grounds you in safe present-moment reality.',
      whenToUse: 'When intrusive thoughts spike. When you feel disconnected or floaty.',
      research: 'Mindfulness-based grounding reduces anxiety in test-anxious students (Beauchemin et al. 2008).' },
    { id: 'pmr', icon: '💪', name: 'Progressive muscle relaxation (PMR)',
      how: 'Starting at toes, tense each muscle group 5 sec, then release 10 sec. Work up: feet → calves → thighs → glutes → abs → fists → arms → shoulders → face. Notice the contrast.',
      whyWorks: 'Anxiety lives in muscles (clenched jaw, shoulders, stomach). Deliberately releasing them signals safety to the brain.',
      whenToUse: 'Night before, in bed (helps with sleep too). Or 10 min before the test in a quiet space.',
      research: 'Jacobson 1938 + 80+ years of clinical use. Strong evidence for anxiety + sleep.' },
    { id: 'box-breathing', icon: '⬜', name: 'Box breathing (Navy SEAL technique)',
      how: 'Inhale 4 sec → hold 4 sec → exhale 4 sec → hold 4 sec. Repeat. (Equal-side "box".) Easier to remember than 4-7-8 in stress.',
      whyWorks: 'Equal phases regulate breathing rhythm + reduce sympathetic activation. Rhythmic + simple = works under stress.',
      whenToUse: 'Anywhere, anytime. Especially when you can\'t remember 4-7-8.',
      research: 'Used in Special Forces tactical breathing protocols + clinical anxiety care.' },
    { id: 'cold-water', icon: '💧', name: 'Cold water on face / wrists',
      how: 'Splash cold water on face. Or hold cold-water-soaked paper towel against wrists or back of neck for 30 seconds.',
      whyWorks: 'Activates the diving reflex — slows heart rate, reduces blood pressure. Fast physiological reset.',
      whenToUse: 'Bathroom break before or during test. Especially helpful when you feel a panic spike coming on.',
      research: 'Diving reflex is well-documented (Kinoshita et al. 2006). Used in DBT crisis-survival skills.' },
    { id: 'reframe', icon: '🔄', name: 'Cognitive reframe: challenge ≠ threat',
      how: 'Notice the anxious thought: "I\'m going to fail." Reframe: "I\'m feeling activated because I CARE. My body is preparing me to perform." Same physiology; different story.',
      whyWorks: 'Jamieson et al. (2010) — students taught to reframe arousal as helpful did better on the GRE than control. SAME bodily state; meaning makes the difference.',
      whenToUse: 'Whenever you notice anxiety appraisal forming. Before, during, after.',
      research: 'Jamieson, J. P., et al. (2010). Turning the knots in your stomach into bows: Reappraising arousal improves performance on the GRE. JESP, 46(1).' }
  ];

  var WHEN_TO_SEEK_HELP = {
    selfHelp: [
      'Strategies above + pre/during/after-test routines worked: continue self-managing.',
      'Anxiety is uncomfortable but doesn\'t prevent you from preparing or performing.',
      'You can sometimes name + reframe the cognitive component yourself.'
    ],
    seekHelp: [
      'Anxiety prevents you from preparing (you avoid studying or freeze).',
      'Anxiety crashes performance to a level FAR below your knowledge.',
      'Physical symptoms include panic attacks (sudden intense surges with chest pain, hyperventilation, sense of doom).',
      'Avoidance is escalating: skipping tests, dropping classes, avoiding school.',
      'Sleep, eating, or daily life is impacted.'
    ],
    who: [
      { who: 'School counselor', what: 'First stop. Often available walk-in. Strategies + advocacy + referral if needed.' },
      { who: 'School psychologist', what: 'Assessment for accommodations (extended time, quiet room, frequent breaks under 504 or IEP). Specialized strategies.' },
      { who: 'Pediatrician / family doctor', what: 'Rules out physical contributors (thyroid, anemia, sleep disorder). Can refer to mental-health care.' },
      { who: 'Therapist (CBT-trained)', what: 'Cognitive Behavioral Therapy is the most-evidence-backed treatment for anxiety. 8-16 sessions for many people.' },
      { who: 'In a crisis', what: '988 Suicide and Crisis Lifeline. Maine Crisis Line. Or 911 if immediate danger.' }
    ],
    accommodations: 'Documented test anxiety often qualifies for accommodations: extended time (1.5x or 2x), quiet testing room, breaks. These are accessed via 504 Plan or IEP through the school. Process: request evaluation through counselor or school psych. Bring documentation of impact + clinician\'s recommendation.'
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 12.7: SELF-DETERMINATION THEORY (Deci + Ryan)
  // The most-rigorously-supported motivation theory in education research.
  // 3 basic psychological needs. When met, intrinsic motivation thrives.
  // When thwarted, motivation decays through controlled → amotivated.
  // ─────────────────────────────────────────────────────────
  var SDT_OVERVIEW = {
    bigIdea: 'Edward Deci + Richard Ryan (1985, expanded ongoing). Humans have 3 basic psychological needs that, when met, support intrinsic motivation, well-being, and durable engagement. When thwarted, motivation degrades through controlled motivation (doing it for grades/punishment) into amotivation (not doing it at all).',
    why: 'SDT predicts academic outcomes, sport performance, work engagement, mental health, even physical health. Across 50+ countries. One of the most rigorously-tested motivation frameworks in psychology.',
    research: 'Deci, E. L., & Ryan, R. M. (1985). Intrinsic motivation and self-determination in human behavior. Plenum. Subsequent literature: 1000+ studies; meta-analyses confirm cross-cultural validity (Ryan + Deci 2017).'
  };

  var SDT_NEEDS = [
    { id: 'autonomy', icon: '🎯', name: 'Autonomy',
      def: 'Sense that one\'s actions are self-chosen + endorsed. NOT the same as "independence" — you can have autonomy while collaborating.',
      met: 'Student feels choice, agency, voice. Understands the reason behind tasks. Can express preferences. The activity feels personally meaningful.',
      thwarted: 'Pressure, control, surveillance, micromanagement, "because I said so." Student feels coerced or manipulated.',
      teacherSupport: [
        'Offer meaningful choices (topic, format, pacing) even within constraints.',
        'Explain the rationale for required tasks ("here\'s WHY this matters").',
        'Acknowledge student perspective + feelings.',
        'Use language that supports rather than controls ("you can" instead of "you must").',
        'Minimize unnecessary surveillance + reward/punishment frameworks.'
      ],
      studentApply: 'Recognize when an activity feels coerced — and look for the small autonomy-supports inside the constraint (Which problems do I tackle first? What perspective do I bring? What\'s my "why" for doing this even though it\'s assigned?).' },
    { id: 'competence', icon: '💪', name: 'Competence',
      def: 'Sense of being effective + producing valued outcomes. Feeling that your effort connects to growth + capability.',
      met: 'Tasks are appropriately challenging (in ZPD), feedback is informative, progress is visible, mistakes are framed as learning.',
      thwarted: 'Tasks too easy (boredom + skill atrophy) or too hard (frustration + helplessness). Feedback is evaluative without informative ("B-, work harder"). Progress is invisible.',
      teacherSupport: [
        'Calibrate task difficulty to ZPD — challenging but achievable with effort.',
        'Provide informational feedback ("you\'re tracking the argument well; the evidence section needs more sources" beats "B+").',
        'Make progress visible (rubrics, growth tracking, portfolios).',
        'Frame mistakes as data, not failure.',
        'Avoid grade-only feedback that strips learning info.'
      ],
      studentApply: 'Seek out tasks that are HARD but doable. Track your own progress (Service Log style — across this tool there\'s a pattern of self-recording). Ask for specific feedback, not just grades.' },
    { id: 'relatedness', icon: '🤝', name: 'Relatedness',
      def: 'Sense of belonging + connection to others. Feeling cared for + caring about a group.',
      met: 'Trusted relationships with teachers + peers. Sense that you matter to the community. Genuine community + collaboration in learning.',
      thwarted: 'Anonymous classrooms, hostile peer dynamics, distant teachers, exclusion or marginalization. The "I\'m a number, not a person" feeling.',
      teacherSupport: [
        'Learn + use student names quickly. Notice individuals.',
        'Make time for non-academic connection (Crew, advisory, lunch chats).',
        'Build collaborative learning structures (think-pair-share, group inquiry).',
        'Address peer harm (bullying, exclusion) explicitly + reliably.',
        'Show genuine care for student lives outside school.'
      ],
      studentApply: 'Connect with at least one teacher + a few classmates beyond surface level. Seek out one collaborative study partner. Recognize that learning is fundamentally social.' }
  ];

  var SDT_CONTINUUM = [
    { id: 'amotivation', n: 0, name: 'Amotivation', desc: 'No engagement. "I don\'t do this; this is pointless." Disengaged from the activity entirely.' },
    { id: 'external', n: 1, name: 'External regulation', desc: 'Doing it for external reward/punishment only. "I do this because I\'ll get a bad grade if I don\'t."' },
    { id: 'introjected', n: 2, name: 'Introjected regulation', desc: 'Internalized pressure. "I do this because I\'ll feel guilty/anxious if I don\'t."' },
    { id: 'identified', n: 3, name: 'Identified regulation', desc: 'You see the personal value. "I do this because it matters for what I want to become."' },
    { id: 'integrated', n: 4, name: 'Integrated regulation', desc: 'The activity aligns with your sense of self. "I do this because it\'s who I am."' },
    { id: 'intrinsic', n: 5, name: 'Intrinsic motivation', desc: 'You do it because it\'s inherently interesting + enjoyable. "I do this because I love it."' }
  ];

  var SDT_MAINE_NOTE = 'EL Education\'s Crew structure is essentially a Relatedness intervention — small, stable advisory groups create the belonging that makes the rest of school work. The HOWLs (Habits of Work and Learning) explicitly value process + growth, supporting Competence. Expedition-based learning gives student-driven inquiry, supporting Autonomy. EL was SDT-aligned before SDT was named.';

  // ─────────────────────────────────────────────────────────
  // SECTION 12.8: EDUCATIONAL RESEARCH LITERACY
  // Most education debates are evidence-light. Future teachers + curious
  // students benefit hugely from being able to read a peer-reviewed study,
  // distinguish strong from weak evidence, and recognize edu-fadgets.
  // ─────────────────────────────────────────────────────────
  var RESEARCH_HIERARCHY = [
    { n: 1, name: 'Anecdote / "I tried it"', strength: 'weakest', icon: '🤷',
      desc: 'A single person\'s story. Useful for hypothesis generation; useless as evidence of effectiveness.',
      example: '"I had a great class do this activity, so it must work" — N of 1 with no comparison group.' },
    { n: 2, name: 'Case study', strength: 'weak', icon: '📓',
      desc: 'Detailed observation of one or a few cases. Documents what happened; can\'t establish cause.',
      example: 'A school adopts a new program + grades go up. Could be the program. Could be many other things (new principal, demographic change, regression to mean).' },
    { n: 3, name: 'Correlational study', strength: 'medium', icon: '📊',
      desc: 'Measures association between variables. Can\'t establish causation.',
      example: 'Students who use Anki score higher. But maybe motivated students choose Anki AND study harder in general. Correlation ≠ causation.' },
    { n: 4, name: 'Quasi-experimental study', strength: 'medium-strong', icon: '⚗️',
      desc: 'Compares groups but participants weren\'t randomly assigned. Stronger than correlation but vulnerable to selection effects.',
      example: 'Two existing 4th-grade classes — one gets new method, one doesn\'t. Differences in classes (teacher, student mix) confound results.' },
    { n: 5, name: 'Randomized Controlled Trial (RCT)', strength: 'strong', icon: '🎲',
      desc: 'Random assignment to treatment vs control. Gold standard for establishing causation. Hard to do in education (consent, ethics, school logistics).',
      example: 'Within a school, 20 sections randomly assigned to "use spaced repetition app" vs "study as usual." Compare standardized post-test.' },
    { n: 6, name: 'Systematic review / meta-analysis', strength: 'strongest', icon: '🏆',
      desc: 'Synthesizes ALL high-quality studies on a question. Tells you the consistent finding across the field, accounting for variation.',
      example: 'Dunlosky et al. 2013 reviewed 100+ studies on study techniques. Pashler et al. 2008 reviewed all rigorous learning-styles studies. Results compound across studies.' }
  ];

  var STATS_TERMS = [
    { term: 'p-value',
      def: 'The probability of seeing this result (or more extreme) IF there were no real effect. Smaller p = less likely to be due to chance.',
      conventionalCutoff: 'p < .05 = "statistically significant" (but this is just convention; not magic).',
      caution: 'A small p-value tells you the effect is unlikely to be PURE NOISE — it does NOT tell you the effect is large or important. With huge sample sizes, tiny effects become "significant."' },
    { term: 'Effect size',
      def: 'How LARGE the difference is, independent of sample size. Cohen\'s d is the most common: (mean₁ - mean₂) / pooled standard deviation.',
      conventionalCutoff: 'Cohen\'s d: 0.2 = small, 0.5 = medium, 0.8 = large. In education, d=0.4 is roughly "one extra year of typical learning."',
      caution: 'Always read the EFFECT SIZE, not just whether something was statistically significant. A d=0.05 effect over a million students gets p<.001 but is practically meaningless.' },
    { term: 'Confidence interval',
      def: 'Range within which the true effect probably lies. "Effect size = 0.4, 95% CI [0.2, 0.6]" means we\'re 95% confident the real effect is between 0.2 and 0.6.',
      conventionalCutoff: 'Wider CI = less precise. CIs that include 0 = could plausibly be NO effect.',
      caution: 'Always look at the CI, not just the point estimate. A study reporting "d = 0.4" that actually has CI [-0.1, 0.9] hasn\'t established much.' },
    { term: 'Sample size (N)',
      def: 'Number of participants in the study. Larger N = more statistical power.',
      conventionalCutoff: 'In education research, N < 50 per group is small; N = 100-500/group is decent; N > 1000/group with random assignment is strong.',
      caution: 'Tiny studies (N<30) can show big effects through noise alone. Always check N before getting excited about results.' },
    { term: 'Replication',
      def: 'Doing the same study again to see if you get the same result. The cornerstone of science.',
      conventionalCutoff: 'A finding that has replicated in 5+ independent labs is much more trustworthy than a single study.',
      caution: 'Many famous psychology + education findings have failed to replicate (the "replication crisis"). Always ask: has this been replicated?' },
    { term: 'Pre-registration',
      def: 'Researchers publicly state their hypothesis + analysis plan BEFORE collecting data, so they can\'t cherry-pick favorable analyses afterward.',
      conventionalCutoff: 'A pre-registered study is much more credible than an exploratory one. Look for "Registered Report" or pre-registration on Open Science Framework.',
      caution: 'Pre-registration is becoming standard but isn\'t universal. Studies without pre-reg + with surprisingly clean results may have been "p-hacked."' }
  ];

  var RESEARCH_RED_FLAGS = [
    { flag: 'Single-study claim with no replication',
      example: '"New study shows 30% improvement in reading!" Until replicated, treat as preliminary.',
      whatToDo: 'Search for replications: Google Scholar, "did X replicate?", look for meta-analyses.' },
    { flag: 'Funded by company selling the product',
      example: 'Lumosity-funded research showing Lumosity works. Coca-Cola-funded research showing soda doesn\'t cause weight gain.',
      whatToDo: 'Look at the "Conflicts of interest" or "Funding" section. Studies funded by independent sources (NSF, NIH, foundations) are more credible.' },
    { flag: 'Tiny sample size (N < 30 per group)',
      example: 'Pilot study with 12 kids in 1 school. Even genuine effects can\'t be detected reliably.',
      whatToDo: 'Read the Methods section. Look for the N. Be skeptical of small studies until replicated with larger ones.' },
    { flag: 'No control group',
      example: '"After our program, students improved 15%." Compared to what? Maybe they would have improved 15% anyway.',
      whatToDo: 'Look for "control group" or "comparison group" in Methods. If it\'s missing or just historical comparison, weight evidence accordingly.' },
    { flag: 'Cherry-picked outcomes',
      example: 'Study measured 20 outcomes; only the 2 significant ones are highlighted. By chance, 1 in 20 will be significant at p<.05.',
      whatToDo: 'Look for pre-registration. Look at ALL the outcome measures, not just the headlines.' },
    { flag: '"Researcher says" without source',
      example: '"Studies show that people only use 10% of their brain." (No actual study cited.)',
      whatToDo: 'Demand citations. If you can\'t find the original study, the claim is hearsay.' },
    { flag: 'Selling something',
      example: 'Brain-training games, miracle apps, "this one weird trick" study skills.',
      whatToDo: 'Independent meta-analyses are your friend. Cochrane Collaboration. What Works Clearinghouse (WWC) for education.' },
    { flag: 'Claims of dramatic effects',
      example: '"Students improved 200%!" Education effects of d > 1.0 are extraordinary; expect them to fail to replicate.',
      whatToDo: 'Be MORE skeptical of bigger effects, not less. The most-replicated education findings have d ~ 0.3-0.5.' }
  ];

  var WHERE_TO_FIND_RESEARCH = [
    { name: 'ERIC (Education Resources Information Center)', desc: 'Free US Department of Education database. Best for education research.', url: 'https://eric.ed.gov/' },
    { name: 'Google Scholar', desc: 'Free. Searches across most academic literature. Most papers have free PDFs (look for the right-side links). Can save searches + alert on new results.', url: 'https://scholar.google.com/' },
    { name: 'What Works Clearinghouse (WWC)', desc: 'US Dept of Ed. Reviews education research using strict standards. Tells you which interventions have strong evidence + which don\'t.', url: 'https://ies.ed.gov/ncee/wwc/' },
    { name: 'Cochrane Collaboration', desc: 'Health-focused but includes school-based interventions. Gold-standard systematic reviews.', url: 'https://www.cochrane.org/' },
    { name: 'JSTOR', desc: 'Major journal archive. Often free via your school + public library.', url: 'https://www.jstor.org/' },
    { name: 'Open Science Framework', desc: 'Pre-registered studies + replication projects. Look for "Registered Report" or pre-registration.', url: 'https://osf.io/' },
    { name: 'PubMed', desc: 'Health + medical research. Includes many cognitive-science + neuroscience papers relevant to education.', url: 'https://pubmed.ncbi.nlm.nih.gov/' },
    { name: 'Maine Public Library Consortium', desc: 'Many Maine libraries offer free patron access to academic databases. Ask your local library.', url: null }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 12.9: LAB SIMULATOR — graded "advise a struggling student" cases
  // Mirrors Auto Repair Lab pattern. Customer-style scenario, decision
  // points, scored choices, letter grade + per-step feedback. Trains
  // diagnostic + intervention thinking using all the prior modules.
  // ─────────────────────────────────────────────────────────
  var LAB_SCENARIOS = [
    {
      id: 'lab-quiet-underperformer', name: 'The quiet underperformer', icon: '😐', difficulty: 2,
      intro: 'A 7th-grade social studies teacher consults you. "Maya is a quiet, polite student. She participates when called on + her in-class work is solid. But she\'s failing tests — getting 50-60% on multiple-choice tests over material she clearly engaged with."',
      student: { grade: '7', subject: 'Social studies', mileage: '4 months into school year', history: 'Honor roll in 6th grade. No prior IEP/504. No reported anxiety.' },
      observations: ['Engaged in class', 'Participates when called on', 'In-class work is strong', 'Test scores are 50-60%', 'Says "I studied" but can\'t describe HOW'],
      steps: [
        { id: 's1', prompt: 'First diagnostic move?',
          choices: [
            { id: 'a', label: 'Recommend the family pay for tutoring', score: -5,
              fb: 'PREMATURE. You haven\'t diagnosed yet. Tutoring helps for content gaps; this looks like a strategy gap.' },
            { id: 'b', label: 'Ask Maya HOW she studies — specific behaviors, time, materials', score: 10,
              fb: 'CORRECT. The performance gap (engaged in class, fails tests) suggests a metacognitive / study-strategy issue. Diagnose before treating.' },
            { id: 'c', label: 'Refer to school psych for evaluation', score: 0,
              fb: 'POSSIBLE later but not first. One semester of underperformance with engaged in-class behavior doesn\'t warrant evaluation yet. Try strategy intervention first.' }
          ] },
        { id: 's2', prompt: 'Maya says: "I read the chapter twice + highlight the important parts. The night before the test I reread my highlights." What does this tell you?',
          choices: [
            { id: 'a', label: 'She\'s studying enough; the tests must be unfair', score: -10,
              fb: 'WRONG diagnosis. Teacher trust + working backwards from "she studied so the tests are wrong" doesn\'t explain her in-class engagement that suggests she IS learning.' },
            { id: 'b', label: 'She\'s using LOW-utility strategies (rereading + highlighting per Dunlosky 2013) — the illusion of fluency. Familiarity feels like understanding.', score: 10,
              fb: 'CORRECT. Maya is doing what most students do — and what doesn\'t work. Familiarity from rereading creates the FEELING of knowing without actual retrieval-strengthened memory.' },
            { id: 'c', label: 'She has a learning disability', score: -5,
              fb: 'JUMPING. The pattern is consistent with ineffective strategies, not LD. Try the obvious fix first.' }
          ] },
        { id: 's3', prompt: 'What strategies do you teach her?',
          choices: [
            { id: 'a', label: 'Add a 3rd reread before the test', score: -10,
              fb: 'WORSE. Rereading is the LOW-utility strategy. More of it = more illusion of fluency. The intervention should REPLACE rereading, not amplify it.' },
            { id: 'b', label: 'Practice testing (free recall + flashcards) + distributed practice (3 sessions across the week, not 1 the night before)', score: 10,
              fb: 'CORRECT. The two HIGH-utility strategies from Dunlosky 2013. Replace cram-night with spaced retrieval. Replace rereading with self-testing.' },
            { id: 'c', label: 'Make her quit social studies', score: -10,
              fb: 'WAT.' }
          ] },
        { id: 's4', prompt: 'Maya says she "tried flashcards once but they didn\'t help." What might be going on?',
          choices: [
            { id: 'a', label: 'Flashcards just don\'t work for her — try something else', score: -5,
              fb: 'PREMATURE. Practice testing is so well-supported across populations that "doesn\'t work for her" is unlikely to be true after one try.' },
            { id: 'b', label: 'She likely flipped cards passively without trying to recall first ("desirable difficulty" missed). Coach the active-recall + spacing protocol explicitly.', score: 10,
              fb: 'CORRECT. The retrieval EFFORT is the active ingredient. Flipping cards = passive reading. The discipline is: TRY to recall first, then check.' },
            { id: 'c', label: 'Tell her flashcards are obsolete, use AI instead', score: -5,
              fb: 'NO. Mechanism matters more than format. Active retrieval works whether the question is on a card, in software, or in your head.' }
          ] }
      ],
      truth: 'Maya was running the modal student pattern: engaged in class (because the teacher does the cognitive work), then "studying" with low-utility strategies (rereading + highlighting) that produce illusion of fluency without retrieval-strengthened memory. Coached protocol: distributed practice (3 sessions over the week before each test) + active recall (close the book + write what you remember + check) + flashcards with TRY-first-then-flip discipline. Result by end of year: 78% test average, up from 55%.'
    },
    {
      id: 'lab-test-anxious', name: 'Knows it in class, blanks on tests', icon: '😰', difficulty: 2,
      intro: 'A 10th-grade math teacher: "Jacob does great in class. Volunteers answers, helps peers, gets A\'s on homework. But on tests his scores plummet — sometimes Cs, sometimes Ds. He says he just blanks."',
      student: { grade: '10', subject: 'Algebra II', mileage: 'Years of pattern', history: 'Strong middle school math. Both parents in pressured careers; talk often about college admissions.' },
      observations: ['Strong in class + on homework', 'Test scores 30-40% below class performance', 'Self-reports "blanking"', 'Visible physical tension during tests', 'No identified disability or 504/IEP'],
      steps: [
        { id: 's1', prompt: 'Most likely primary diagnosis?',
          choices: [
            { id: 'a', label: 'Knowledge gap', score: -10,
              fb: 'WRONG. The class performance + homework refutes this. He KNOWS the math.' },
            { id: 'b', label: 'Test anxiety with strong physiological component', score: 10,
              fb: 'CORRECT. The classic test-anxiety pattern: knowledge intact in low-stakes contexts, working memory crashes under high-stakes arousal. Yerkes-Dodson at the high end.' },
            { id: 'c', label: 'He\'s lying about studying', score: -10,
              fb: 'STOP. Don\'t pathologize a struggling student. The pattern is well-documented test anxiety.' }
          ] },
        { id: 's2', prompt: 'First intervention?',
          choices: [
            { id: 'a', label: 'Tell him to "just relax" + study more', score: -10,
              fb: 'COUNTERPRODUCTIVE. "Just relax" doesn\'t work + adds shame. Studying more reinforces that the issue is knowledge — which it isn\'t.' },
            { id: 'b', label: 'Teach a calming technique (4-7-8 breathing or box breathing) + practice it WHEN HE\'S NOT IN A TEST so it\'s available when he is', score: 10,
              fb: 'CORRECT. Skill must be practiced before it\'s needed. Tactical breathing builds the autopilot.' },
            { id: 'c', label: 'Refer to therapist immediately', score: 5,
              fb: 'OK escalation but not first move. Try in-school strategies first; refer if those don\'t move the needle.' }
          ] },
        { id: 's3', prompt: 'Mid-intervention, you\'re also coaching cognitive reframes. Which is the MOST evidence-backed?',
          choices: [
            { id: 'a', label: '"You\'re smart, you\'ll be fine"', score: -5,
              fb: 'FIXED-MINDSET praise. Doesn\'t address the mechanism. May add pressure.' },
            { id: 'b', label: '"Your racing heart is your body preparing you to perform — same physiology as athletes before a game" (Jamieson 2010 reappraisal)', score: 10,
              fb: 'CORRECT. Jamieson et al. 2010 (GRE study): students taught to reframe arousal as helpful outperformed control. SAME body state, different meaning, different outcome.' },
            { id: 'c', label: '"Don\'t think about the test"', score: -5,
              fb: 'IRONIC PROCESS. Telling someone not to think of X makes them think of X.' }
          ] },
        { id: 's4', prompt: 'Should you also pursue a 504 Plan for testing accommodations?',
          choices: [
            { id: 'a', label: 'No, accommodations are crutches', score: -10,
              fb: 'WRONG (and harmful). Accommodations are legal protections that level the playing field. Documented test anxiety often qualifies.' },
            { id: 'b', label: 'Yes, in parallel with the strategy work. Extended time + quiet room may be appropriate. School psych + counselor handle the eval.', score: 10,
              fb: 'CORRECT. Pursue both: skills (breathing, reframes, study habits) AND accommodations. Belt + suspenders. Many test-anxious students have both.' },
            { id: 'c', label: 'Skip school + try homeschool', score: -10,
              fb: 'NO.' }
          ] }
      ],
      truth: 'Jacob\'s pattern was severe test anxiety with strong physiological arousal. Multi-pronged plan: (1) 4-7-8 breathing taught + practiced 2x daily for a month before next test; (2) Jamieson-style cognitive reframe coached weekly; (3) School psych eval led to 504 with extended time + separate quiet room; (4) Continued in-class confidence-building. Within one quarter: test scores within 10 points of class performance. Within a year: test scores matched class.'
    },
    {
      id: 'lab-math-phobic-elementary', name: 'Math-phobic 5th grader', icon: '🔢', difficulty: 3,
      intro: 'A 5th-grade teacher consults you: "Aiyana flat-out says \'I\'m bad at math.\' She refuses to attempt new problems. She freezes at the board. But in her notebook, when she tries on her own at home, she gets a lot right."',
      student: { grade: '5', subject: 'Math', mileage: 'Pattern getting worse since 4th grade', history: 'Older sister got into a magnet school for math; family talks often about \'Aiyana isn\'t a math person.\'' },
      observations: ['Refuses to attempt at the board', 'Freezes when called on', 'Self-identifies as "not a math person"', 'Solitary practice produces correct work', 'Family-narrative reinforces "not a math person"'],
      steps: [
        { id: 's1', prompt: 'Primary diagnosis?',
          choices: [
            { id: 'a', label: 'Math learning disability', score: -5,
              fb: 'NOT YET. Her solo work shows she CAN do the math. The blockage is contextual (board, called on) — points to anxiety + self-concept, not LD.' },
            { id: 'b', label: 'Performance anxiety + fixed-mindset self-concept ("I\'m not a math person") combined with stereotype-threat-style family narrative', score: 10,
              fb: 'CORRECT. Multiple factors: identity ("I\'m not a math person") + public-performance anxiety (board, called on) + family narrative reinforcing the identity. The math itself is intact.' },
            { id: 'c', label: 'Defiant behavior', score: -10,
              fb: 'WRONG framing. Pathologizing a 5th-grader\'s avoidance as defiance misses the protective function of avoidance for someone who\'s anxious + ashamed.' }
          ] },
        { id: 's2', prompt: 'Conversation with her family. What do you suggest?',
          choices: [
            { id: 'a', label: '"Stop telling Aiyana her sister is the math one"', score: 5,
              fb: 'PARTIALLY RIGHT but blunt. Family won\'t hear it as helpful. Reframe the request positively.' },
            { id: 'b', label: 'Coach the family to (a) praise Aiyana\'s SPECIFIC effort + strategy when they see it, (b) avoid comparison language, (c) frame ability as developable ("you\'re learning this YET")', score: 10,
              fb: 'CORRECT. Dweck-style growth-mindset framing for the family — but practical + specific. Process praise + remove comparative narratives + the "yet" framing.' },
            { id: 'c', label: 'Tell the family it\'s their fault', score: -10,
              fb: 'BLAMING. The narrative is real but not evil-intentioned. Bring family in as partners.' }
          ] },
        { id: 's3', prompt: 'In-class strategy?',
          choices: [
            { id: 'a', label: 'Force her to come to the board until she gets used to it', score: -10,
              fb: 'EXPOSURE WITHOUT SCAFFOLDING. Forcing high-anxiety performance reinforces the threat. Will increase avoidance long-term.' },
            { id: 'b', label: 'Build a graduated exposure: low-stakes pair-share (1 partner) → small group → optional volunteer → cold-call only after she\'s succeeded several times', score: 10,
              fb: 'CORRECT. Graduated exposure with success at each step. Builds competence (SDT need) before raising stakes. Pairs with growth-mindset framing.' },
            { id: 'c', label: 'Skip her on cold-calls forever', score: 0,
              fb: 'AVOIDANCE-ENABLING. Doesn\'t address the underlying issue + may communicate that you\'ve given up on her.' }
          ] },
        { id: 's4', prompt: 'How do you measure progress?',
          choices: [
            { id: 'a', label: 'Test scores only', score: -5,
              fb: 'TOO NARROW. Test scores might lag the underlying mindset shift by months. Multiple indicators give richer picture.' },
            { id: 'b', label: 'Multiple indicators: (1) attempts (not just successes), (2) self-identity statements, (3) classroom participation, (4) work completion rate, (5) test scores last', score: 10,
              fb: 'CORRECT. The early indicators of recovery are behavioral (attempts, willingness, engagement) + identity (self-talk). Test scores follow once those shift.' },
            { id: 'c', label: 'Just trust your gut', score: 0,
              fb: 'OK as one input, not as the only one.' }
          ] }
      ],
      truth: 'Aiyana\'s case combined performance anxiety + fixed-mindset identity + family narrative. 12-week plan: (1) graduated exposure starting at 1-partner pair-share, (2) explicit growth-mindset coaching with the "yet" frame, (3) family meeting reframing process praise + removing comparison language, (4) celebrating ATTEMPTS not just successes. By end of year: voluntary participation + self-statement shift from "I\'m not a math person" to "I\'m getting better at math."'
    },
    {
      id: 'lab-burnout-senior', name: 'High-achiever burning out', icon: '🔥', difficulty: 3,
      intro: 'A 12th grader, valedictorian-track. "I just can\'t do it anymore. I haven\'t slept more than 5 hours in months. My grades are slipping. I cried in the library yesterday. But if I take a break I\'ll lose my GPA + my college apps."',
      student: { grade: '12', subject: 'AP everything', mileage: '4 years of escalating pressure', history: 'Perfectionist family. Older sibling at Ivy League. Self-described as "the smart one." 4 AP classes + leadership in 3 clubs + varsity sport.' },
      observations: ['Sleep < 5 hours nightly', 'Visible physical exhaustion', 'Crying in public spaces', 'Grades declining', 'Unable to relax even when given time', 'Self-identity tied to academic performance'],
      steps: [
        { id: 's1', prompt: 'Primary concern?',
          choices: [
            { id: 'a', label: 'She just needs to push through senior year', score: -10,
              fb: 'DANGEROUS. The signs (chronic sleep deprivation, public crying, declining performance) are red flags for burnout AND possibly clinical anxiety/depression. "Push through" risks crisis.' },
            { id: 'b', label: 'Burnout with significant mental-health concern. Sleep deprivation alone is a medical issue + psychological risk factor. Crying + helplessness add concern.', score: 10,
              fb: 'CORRECT. The pattern is concerning. Recovery requires both immediate relief (sleep, decompression) + structural change (load reduction).' },
            { id: 'c', label: 'She\'s making excuses to slack', score: -10,
              fb: 'BLAMING. Don\'t pathologize a kid who\'s asking for help.' }
          ] },
        { id: 's2', prompt: 'First action?',
          choices: [
            { id: 'a', label: 'Tell her to drop everything except academics', score: -5,
              fb: 'INCOMPLETE. Academics are likely PART of the load. Need a holistic look + ALSO mental-health check.' },
            { id: 'b', label: 'Refer to school counselor + school psych (concurrent) for assessment + connect with family for medical referral. Sleep loss + crying jags warrant clinical attention. Triage immediate safety.', score: 10,
              fb: 'CORRECT. Don\'t handle this alone. Burnout in a high-achiever can mask depression, anxiety, or risk. Multi-disciplinary safety net first; structural changes follow.' },
            { id: 'c', label: 'Buy her coffee + tell her to keep going', score: -10,
              fb: 'WRONG. Caffeine + chronic sleep loss = compound problem.' }
          ] },
        { id: 's3', prompt: 'Once she\'s safety-checked, what about the academic load?',
          choices: [
            { id: 'a', label: 'Don\'t change anything; she\'ll feel like she failed', score: -5,
              fb: 'PROTECTING IDENTITY at the cost of her health. Reframe: dropping a class isn\'t failure, it\'s sustainability.' },
            { id: 'b', label: 'Have a no-blame conversation about reducing 1-2 commitments. Frame as long-game (college admissions favor sustained excellence over crashed-and-burned), not as defeat.', score: 10,
              fb: 'CORRECT. Reduce load enough to allow sleep + recovery. Frame strategically: a B- in 4 APs after burnout is worse than an A in 3 APs at a sustainable pace.' },
            { id: 'c', label: 'Add another AP to make up for it', score: -10,
              fb: 'NO.' }
          ] },
        { id: 's4', prompt: 'Long-term: what skill should she build during recovery?',
          choices: [
            { id: 'a', label: 'Time management techniques', score: 5,
              fb: 'PARTIAL. Time management is a tool, but the issue is identity + boundaries, not minutes.' },
            { id: 'b', label: 'Self-determination work: identifying her own values + interests (autonomy) vs externally-driven achievement; recovery from "I am only my GPA" identity', score: 10,
              fb: 'CORRECT. SDT-aligned: she\'s been operating in introjected/external regulation ("I\'ll feel like a failure if not perfect"). Building autonomy + intrinsic motivation around fewer, deeper interests is the real growth work.' },
            { id: 'c', label: 'Just learn to grind harder', score: -10,
              fb: 'NO.' }
          ] }
      ],
      truth: 'Classic high-achiever burnout with risk markers. 6-month plan: (1) Counselor + school psych concurrent, (2) Pediatrician referral led to evaluation for major depression + anxiety; pharm + therapy began, (3) Dropped 1 AP + 1 leadership role with college-counselor coaching on framing for college essays, (4) Sleep coaching: hard 11pm lights-out commitment, (5) SDT work on autonomy + identity beyond GPA. By spring: mental health stabilized; college apps included a powerful essay about learning to balance ambition with sustainability.'
    },
    {
      id: 'lab-adhd-procrastinator', name: 'ADHD student facing project deadline', icon: '📅', difficulty: 2,
      intro: 'A 9th grader with diagnosed ADHD has a 3-week research project due in 2 days. He\'s done nothing on it. Says he wants to do it but every time he sits down he ends up on his phone. His mom is panicking.',
      student: { grade: '9', subject: 'English', mileage: '3 weeks given, 0 done', history: 'ADHD diagnosis since 3rd grade. Has 504 with extended time + chunked assignments. Stimulant medication. Parents engaged but exhausted.' },
      observations: ['Wants to do the project (motivation present)', 'Cannot initiate (executive function deficit)', 'Phone is the most common avoidance behavior', 'Past pattern of late-night last-minute completion', '504 in place but project-management not specifically scaffolded'],
      steps: [
        { id: 's1', prompt: 'How should the immediate next 48 hours be structured?',
          choices: [
            { id: 'a', label: 'Tell him to power through; this is how he learns consequences', score: -10,
              fb: 'CRUEL + WRONG. ADHD task initiation isn\'t about willpower. He\'s already failed once at "powering through." Repeating that lesson confirms helplessness.' },
            { id: 'b', label: 'Triage: scope down the project to a minimum viable submission. Use Pomodoro 25/5 + body doubling (working in same room as parent) + phone in another room. Generous use of his 504 extended-time accommodation.', score: 10,
              fb: 'CORRECT. ADHD intervention: (1) reduce overwhelm (scope down), (2) external structure (Pomodoro), (3) co-regulation (body doubling), (4) remove distraction (phone elsewhere), (5) leverage his accommodation.' },
            { id: 'c', label: 'Tell him to skip the assignment', score: -10,
              fb: 'NO. Submission is achievable + practice in completing under pressure has value. Just needs scaffolding.' }
          ] },
        { id: 's2', prompt: 'After the immediate crisis, what STRUCTURAL change for the next project?',
          choices: [
            { id: 'a', label: 'Hope he learned his lesson', score: -10,
              fb: 'WON\'T HAPPEN. ADHD doesn\'t respond to "lessons learned" the way neurotypical brains do. Build the structure.' },
            { id: 'b', label: 'Update his 504 to include explicit project-management scaffolding: weekly check-ins with the teacher, broken-down sub-deadlines, and parent + teacher alignment on chunking the next project.', score: 10,
              fb: 'CORRECT. ADHD students need EXTERNAL executive function until internal develops. Sub-deadlines + check-ins are evidence-backed accommodations. The 504 is the legal vehicle.' },
            { id: 'c', label: 'Just give him medication', score: -5,
              fb: 'INCOMPLETE. Medication helps but doesn\'t replace skills + structure. Pair pharm with environmental + behavioral supports.' }
          ] },
        { id: 's3', prompt: 'Long-term goal for this student?',
          choices: [
            { id: 'a', label: 'Cure the ADHD', score: -10,
              fb: 'WRONG framework. ADHD is neurodevelopmental + lifelong. Goal is competence + accommodation, not cure.' },
            { id: 'b', label: 'Build a personal scaffolding toolkit: external timers, body-doubling habits, broken-down task lists, calendar reminders, environmental controls. By college he should be his own EF coach.', score: 10,
              fb: 'CORRECT. SDT-aligned competence-building. ADHD adults function well when they\'ve built personalized external systems. Ages 9-18 is the time to develop those habits.' },
            { id: 'c', label: 'Hope he grows out of it', score: -5,
              fb: 'PARTIAL — ADHD presentation does shift in adulthood, but executive-function challenges persist. Build skills.' }
          ] }
      ],
      truth: 'Classic ADHD task-initiation failure. 48-hr plan: scoped project to minimum viable + 4 Pomodoro sessions with mom in the room + phone in the kitchen. Submitted on time at 70% quality (passed). Structural change: 504 updated with weekly project check-ins. Built habit of: (1) immediate task-decomposition into sub-deadlines, (2) external timer use, (3) body-doubling for hard initiation moments. By end of 9th grade: 80% project-completion rate vs 30% prior. By 11th: managing his own systems.'
    },
    {
      id: 'lab-el-content-vocab', name: 'EL learner vs content vocabulary', icon: '🌐', difficulty: 3,
      intro: 'A 6th-grade science teacher: "Carlos has been in the US for 18 months. His conversational English is improving. But on science assessments he scores well below his ability — he can do the science when I show him pictures or demonstrate, but the written tests destroy him."',
      student: { grade: '6', subject: 'Science', mileage: '18 months in US', history: 'EL (English Learner) status. Native Spanish speaker. Strong academic record in Mexico in 4th-5th grade. Receives 30 min/day of pull-out ESL.' },
      observations: ['Conversational English improving', 'Visual + demo science = strong understanding', 'Written assessments tank scores', 'Vocabulary gap on academic + content terms', 'Cognitive ability is high'],
      steps: [
        { id: 's1', prompt: 'Primary diagnosis?',
          choices: [
            { id: 'a', label: 'Carlos is bad at science', score: -10,
              fb: 'WRONG. The hands-on + visual evidence shows he UNDERSTANDS the science. The gap is language access to demonstrate it.' },
            { id: 'b', label: 'Language gap masking content competence — he knows the science but can\'t access OR express it through English-only academic-vocabulary tests', score: 10,
              fb: 'CORRECT. Cummins\' BICS vs CALP distinction: conversational fluency (BICS, ~2 yrs) develops faster than cognitive academic language proficiency (CALP, ~5-7 yrs). Carlos has BICS but is still building CALP.' },
            { id: 'c', label: 'He needs to be in a lower grade', score: -10,
              fb: 'NO. His cognitive ability is grade-appropriate. The issue is language scaffolding, not cognitive level.' }
          ] },
        { id: 's2', prompt: 'Most evidence-aligned classroom intervention?',
          choices: [
            { id: 'a', label: 'Just teach him English faster', score: -5,
              fb: 'CALP develops on a 5-7 year timeline. Don\'t make him wait that long to access science.' },
            { id: 'b', label: 'Allow alternative demonstrations (lab, demo, oral, draw + label) + explicit content-vocabulary frontloading + bilingual glossary access + dual-coded representations (UDL: multiple means of representation + expression)', score: 10,
              fb: 'CORRECT. UDL in action. Multiple means of representation (visual + dual-coded text + native-language scaffolds) + multiple means of expression (alternatives to written assessment). Lets him show what he knows while building English.' },
            { id: 'c', label: 'Don\'t grade him on tests until he\'s fluent', score: 0,
              fb: 'EXTREME. Better: change HOW he\'s assessed, don\'t exempt him from showing his learning.' }
          ] },
        { id: 's3', prompt: 'What about home-language support?',
          choices: [
            { id: 'a', label: '"He needs English-only at home to catch up faster"', score: -10,
              fb: 'HARMFUL ADVICE — and false. Strong native-language literacy SUPPORTS English literacy (cross-linguistic transfer). Maintaining + developing Spanish helps English learning, not the reverse.' },
            { id: 'b', label: 'Encourage continued reading + writing in Spanish at home + Spanish-content tools where available. Cross-linguistic transfer + identity + family connection all benefit.', score: 10,
              fb: 'CORRECT. Cummins\' interdependence hypothesis. Strong L1 (native language) supports L2 (English) acquisition. Plus identity + family + heritage benefits. "Lose Spanish to gain English" is a false trade.' },
            { id: 'c', label: 'Tell parents to switch to English-only at home', score: -10,
              fb: 'WRONG (and identity-eroding). See above.' }
          ] },
        { id: 's4', prompt: 'How do you measure progress?',
          choices: [
            { id: 'a', label: 'Standardized test scores in English only', score: -5,
              fb: 'INCOMPLETE — these will lag his actual learning by years. Use multiple indicators.' },
            { id: 'b', label: 'Multiple indicators: science-content mastery (via varied formats), academic-vocabulary growth, English production complexity, and standardized scores LAST. WIDA ACCESS scores for EL progress.', score: 10,
              fb: 'CORRECT. Use the right tool for each thing you\'re measuring. Content mastery via demonstration. Vocabulary via writing samples. EL progress via WIDA. Don\'t conflate language with content.' },
            { id: 'c', label: 'Wait until he\'s fully bilingual', score: -10,
              fb: 'TOO LONG. Iterate while he\'s learning.' }
          ] }
      ],
      truth: 'Classic EL CALP-gap with strong cognitive ability. UDL-aligned plan: (1) science assessments offered in alternative formats (lab demo, oral, drawing+label, written) — Carlos picked, (2) content-vocab frontloading with Spanish glossary + visuals dual-coded, (3) home Spanish literacy encouraged, (4) family connected to bilingual community resources. By end of year: science content mastery at grade level (verified via demos) while English continued to develop. By 8th grade: testing in English with full content access; bilingual literacy as an asset.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 12.10: NOTE-TAKING DEEP DIVE — 5 systems
  // The most popular study skill, often badly executed. 5 systems with
  // structure + when-to-use + research backing.
  // ─────────────────────────────────────────────────────────
  var NOTE_SYSTEMS = [
    { id: 'cornell', icon: '📓', name: 'Cornell notes',
      structure: '3 sections on every page: cues column (left, ~30%), main notes (right, ~70%), summary (bottom, full width). Take notes during class in the right column. AFTER class, fill in cue column with questions/keywords + write a 2-3 sentence summary at the bottom.',
      goodFor: 'Lecture-heavy classes (history, biology, social studies). Especially valuable for STUDENTS who commit to the post-lecture review step.',
      badFor: 'Math (the structure doesn\'t fit step-by-step problem solving). Improvisational discussion. Highly visual content.',
      research: 'Pauk 2007. Less rigorous research base than retrieval-practice itself, but the cue-column + summary steps are essentially built-in retrieval practice — the empirically-supported parts.',
      pitfall: 'Most students skip the post-class processing (cues + summary). Without it, Cornell is just "notes with extra columns." The processing IS the technique.' },
    { id: 'mind-map', icon: '🌳', name: 'Mind mapping (radial)',
      structure: 'Central concept in middle of page. Branches radiate out to related ideas. Each branch sub-branches. Use color, images, single keywords (not full sentences). Hierarchy emerges visually.',
      goodFor: 'Brainstorming. Capturing relationships among ideas. Pre-writing for essays. Concept review where structure matters more than chronology.',
      badFor: 'Sequential / chronological content. Step-by-step procedures. Linear arguments. Heavy detail or quotes.',
      research: 'Buzan popularized; mixed evidence base. Strongest support: mind-mapping as a REVIEW or PRE-WRITING tool, less as primary in-lecture note-taking.',
      pitfall: 'Looks cool but can be slow. Don\'t mind-map during a fast lecture; use it for review/synthesis afterward.' },
    { id: 'outline', icon: '📋', name: 'Outline / hierarchical',
      structure: 'Indented hierarchy: I. Main topic. A. Subtopic. 1. Detail. a. Sub-detail. Roman numerals → letters → numbers → letters. Each level represents a step deeper.',
      goodFor: 'Already-structured content (textbooks, well-organized lectures). Pre-writing essays. Test review. STEM problem sets where logical structure matters.',
      badFor: 'Loosely-organized discussion. Visual content. Improvisational classes. Capturing relationships across topics.',
      research: 'Foundational structure underlying many other systems. Strong as a thinking tool; weaker as a SOLE note-taking format.',
      pitfall: 'Can become a transcription exercise (copying text) rather than processing. Add your own commentary in the margins or as separate sub-points.' },
    { id: 'sketchnote', icon: '🎨', name: 'Sketchnoting (visual notes)',
      structure: 'Combine handwriting + drawings + arrows + boxes + visual hierarchy. Mike Rohde\'s framework: type, image, and structure. Aesthetics matter less than clarity.',
      goodFor: 'Conferences. Single-session presentations. Concepts that benefit from dual coding (verbal + visual). Students who are visual processors.',
      badFor: 'Dense factual content. Math. Anything where every detail matters.',
      research: 'Dual coding (Paivio 1971) supports the verbal+visual encoding. Sketchnoting popularized by Rohde 2013. Less rigorous research, but the dual-coding mechanism is solid.',
      pitfall: 'Imposter\'s blocker: "I can\'t draw." Stick figures + simple symbols are fine — function over art. The visual processing is the active ingredient, not artistic quality.' },
    { id: 'two-column', icon: '📊', name: 'Two-column / charting',
      structure: 'Two (or more) columns side-by-side. Top of each column = a category. Fill in details in each column for direct comparison. Variations: T-chart, comparison matrix, before/after, cause/effect.',
      goodFor: 'Compare/contrast content. Multiple perspectives on one issue. Cause-effect analysis. Data with parallel structure.',
      badFor: 'Single-thread narrative. Procedural content. Lectures that meander.',
      research: 'Charting + comparing forces analytical thinking (Bloom\'s level 4). Useful for transforming information from passive to active.',
      pitfall: 'Can become cramped if you don\'t leave space. Use full-page columns. Use a fresh page per comparison.' }
  ];

  var NOTE_TAKING_PRINCIPLES = [
    { rule: 'Hand > laptop for retention',
      detail: 'Mueller + Oppenheimer (2014). Students taking notes by hand outperform laptop-takers on conceptual questions. Proposed mechanism: handwriting forces summarization (you can\'t keep up with the speaker verbatim) which forces processing.',
      caveat: 'The Mueller study has had replication concerns; the effect is smaller in some replications. Hand still likely wins for conceptual material; laptops may be fine for fact-recall.' },
    { rule: 'Process matters more than format',
      detail: 'Any of the 5 systems above CAN be effective. The active ingredient is processing the information (translating into your own structure) — not the system itself.',
      caveat: 'Picking a system is meaningless without commitment to active processing.' },
    { rule: 'Review notes within 24 hours',
      detail: 'Ebbinghaus forgetting curve: ~70% of new info forgotten within 24 hours. A 10-min review the same day cuts forgetting dramatically.',
      caveat: 'Most students never review their notes again before the test. The notes had value; the lack of review wasted it.' },
    { rule: 'Summary at the end',
      detail: 'Whatever system: end every note-taking session with a 2-3 sentence summary IN YOUR OWN WORDS. This is retrieval practice + self-explanation in one move.',
      caveat: 'Skip this and you\'ve created a record without the learning benefit.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 12.11: SLEEP + LEARNING
  // Sleep consolidates memory. Sleep deprivation tanks working memory +
  // mood + immune system. This is the single most under-discussed factor
  // in academic underperformance.
  // ─────────────────────────────────────────────────────────
  var SLEEP_FACTS = {
    consolidation: 'During sleep — especially Stage 2 (spindles) + REM — the brain replays + transfers info from hippocampus to cortex. This is when learning becomes durable. Sleep AFTER learning is essentially a free 30-50% boost to retention (Stickgold 2005).',
    deprivation: 'Even one night of bad sleep (4-5 hours) impairs working memory by 10-15%, attention by 20-30%, and mood significantly. Chronic sleep deprivation (< 7 hrs nightly for weeks) approaches the cognitive impairment of legal alcohol intoxication (Williamson + Feyer 2000).',
    teenagers: 'Adolescent circadian shift (Carskadon et al.): puberty pushes bedtime later (around 11pm) + sleep need stays at 8-10 hours. Most US schools start before adolescent biology is ready. AAP recommends school start no earlier than 8:30am.',
    adults: 'Adults need 7-9 hours. The "I do fine on 5" claim is almost always wrong — most short sleepers are operating below their capacity without realizing it (the "well-rested" experience has been gone too long to compare).',
    naps: 'Two flavors: power nap (15-30 min, no deep sleep, immediate alertness boost) vs full cycle nap (90 min, includes one full sleep cycle, supports memory consolidation). Avoid the 45-75 min middle-zone — wakes you mid-deep-sleep with grogginess.',
    caffeine: 'Caffeine half-life ~5-6 hours. Coffee at 3pm = caffeine still in your system at 11pm. Even when you can fall asleep, sleep architecture (especially deep sleep) is degraded. Cut off ~8 hrs before bed.'
  };

  var SLEEP_FOR_LEARNING = [
    { id: 'sleep-before', icon: '🌙', name: 'Sleep BEFORE big learning',
      what: 'A well-rested brain encodes new information much better than a sleep-deprived one.',
      practical: 'Don\'t pull all-nighters before exams or big learning events. The cost in encoding far exceeds the gain from extra study hours.',
      research: 'Walker 2017. Working memory + attention + encoding all degrade with sleep loss.' },
    { id: 'sleep-after', icon: '💤', name: 'Sleep AFTER big learning',
      what: 'Memory consolidation happens in sleep. Sleeping after studying is when the brain transfers info to long-term storage.',
      practical: 'Study in the early evening, sleep at usual time. The night\'s sleep does the consolidation work for free.',
      research: 'Stickgold 2005, Diekelmann + Born 2010. Multiple studies show post-learning sleep produces 30-50% better recall vs equivalent waking time.' },
    { id: 'all-nighters', icon: '🚫', name: 'All-nighters: false economy',
      what: 'Pulling all-nighters can create the FEELING of preparedness through familiarity, but tanks both retention + next-day cognition.',
      practical: 'A 5-hour study session + 8 hours of sleep beats a 13-hour study session + 0 hours of sleep, every time.',
      research: 'Pilcher + Walters 1997. All-nighter students performed worse + thought they performed better than well-rested controls.' },
    { id: 'consistency', icon: '⏰', name: 'Consistency > Duration',
      what: 'Going to bed at the same time every night (even on weekends) supports better sleep architecture than 8 hrs Mon-Fri + 12 hrs Sat-Sun.',
      practical: 'Pick a bedtime + wake time. Hold them within ~1 hour even on weekends. "Social jet lag" from weekend over-sleeping degrades Mon-Wed performance.',
      research: 'Wittmann et al. 2006. Social jet lag correlates with academic underperformance + worse mood.' },
    { id: 'naps', icon: '😴', name: 'Naps: power vs full cycle',
      what: 'Two effective formats: 20-minute power nap (alertness boost without grogginess) OR 90-minute full-cycle nap (memory + mood). Avoid 45-75 min.',
      practical: 'Power nap before a test or hard study session. Full-cycle nap if you\'ve been sleep-deprived AND have 90 min before resuming serious cognitive work.',
      research: 'Mednick et al. 2003. Naps consolidate memory similarly to a full night of sleep for narrowly-targeted material.' },
    { id: 'screens', icon: '📱', name: 'Screens before bed',
      what: 'Bright light (especially blue) suppresses melatonin. Phones + laptops + TV before bed delay sleep onset.',
      practical: 'Hard cutoff 30-60 min before bed. Screens in another room, on a charger, NOT in the bedroom.',
      research: 'Gradisar et al. 2013. Screen use within 1 hour of bedtime delays sleep onset by 20-30+ minutes.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 12.12: GOAL SETTING + PROCRASTINATION MASTERY
  // SMART, OKRs, implementation intentions, Pomodoro deep dive, the 2-min
  // rule. Plus the modern reframe: procrastination is emotion-regulation,
  // not time-management (Pychyl).
  // ─────────────────────────────────────────────────────────
  var GOAL_FRAMEWORKS = [
    { id: 'smart', icon: '🎯', name: 'SMART goals',
      what: 'Specific, Measurable, Achievable, Relevant, Time-bound. Created by Doran 1981 for management; widely adopted in education.',
      goodFor: 'Discrete, well-defined targets. Test-prep goals. Skill-building benchmarks. Habit installation.',
      badFor: 'Open-ended exploration. Creative work. Things where the goal evolves as you learn.',
      example: 'Bad: "Get better at math." SMART: "Score at least 85% on the next 3 algebra unit tests by end of semester, by completing 30 min of spaced practice 4x/week."',
      pitfall: 'SMART can promote conservative goals (you set what you\'re sure to hit, missing the stretch growth).' },
    { id: 'okrs', icon: '🚀', name: 'OKRs (Objectives + Key Results)',
      what: 'Andy Grove at Intel; popularized by Google. Set 1 ambitious Objective + 3-5 measurable Key Results. Score 0.0-1.0 at end. 0.7 is "good" — 1.0 means you set the goal too low.',
      goodFor: 'Stretch goals. Quarter or semester planning. Personal projects + work-style goals. When you want growth + measurement.',
      badFor: 'Day-to-day execution (use a to-do list for that). Goals where measurement is fuzzy.',
      example: 'Objective: "Become a strong public speaker by end of semester." KR1: Give 3 voluntary presentations. KR2: Reduce filler words from 20/min to <5/min. KR3: Get peer-rated 4+ out of 5 on confidence on final speech.',
      pitfall: 'Get the Os + KRs ambitious but the KRs MEASURABLE. Vague KRs = vague accountability.' },
    { id: 'implementation-intentions', icon: '📍', name: 'Implementation intentions',
      what: 'Gollwitzer 1999. "If [situation X], then I will do [behavior Y]." Pre-decides the response so the moment doesn\'t require willpower.',
      goodFor: 'Habits. Resisting temptations. Following through on goals you keep dropping.',
      badFor: 'One-off complex projects (use OKRs or project plans). Truly novel situations.',
      example: '"If it\'s 4pm on Tuesday, then I will start my Spanish flashcards." "If I\'m tempted to scroll instead of starting homework, then I will set a 25-min Pomodoro timer + start the easiest task." "If I see my phone during study time, then I will put it face-down in another room."',
      pitfall: 'Vague intentions ("I\'ll study more") don\'t work. Specific situational triggers do.' },
    { id: 'two-minute', icon: '⏱️', name: 'The 2-minute rule',
      what: 'David Allen (GTD). If something takes <2 minutes, do it now instead of adding it to your list. Variant from James Clear: when starting a habit, scale it down to "2 minutes" so it\'s impossible to skip.',
      goodFor: 'Reducing overwhelm. Building habits. Clearing inbox-style backlogs.',
      badFor: 'Deep work. Anything requiring sustained focus.',
      example: 'Atomic Habits version: "I\'ll study for 30 minutes" becomes "I\'ll open my notebook + read one paragraph." Once started, momentum often carries you further.',
      pitfall: 'Don\'t use it as procrastination disguised as productivity (clearing tiny tasks while avoiding the big one).' }
  ];

  var POMODORO_DEEP = {
    name: 'Pomodoro Technique',
    creator: 'Francesco Cirillo, late 1980s. Named after his tomato-shaped kitchen timer.',
    structure: '25 min focused work → 5 min break → 25 min work → 5 min → 25 min work → 5 min → 25 min work → 15-30 min long break. Repeat.',
    why: 'Forces single-tasking with a clear endpoint (just 25 min — manageable). Breaks prevent decision fatigue + working-memory exhaustion. The structure itself is a commitment device.',
    rules: [
      'During the 25 min: ONE task. Phone in another room.',
      'If you finish early: review or extend the work, don\'t skip ahead.',
      'If interrupted: the Pomodoro is "broken" — restart it.',
      'Track completed Pomodoros — visual progress is motivating.',
      'Don\'t skip breaks even if you "feel like" continuing. Rest is when consolidation happens.'
    ],
    modifications: [
      'For ADHD: try shorter (15 min) Pomodoros to lower initiation barrier.',
      'For deep work: longer (50 min / 10 min) — Newport-style.',
      'For low-motivation: start with 1 single Pomodoro. Done. The win matters more than completing 4.'
    ],
    research: 'Less rigorous than retrieval-practice, but the underlying principles (single-tasking, time-boxing, scheduled breaks) are well-supported. Popular for ADHD + executive-function support.'
  };

  var PROCRASTINATION_REFRAMES = [
    { reframe: 'Procrastination is emotion-regulation, not time-management',
      detail: 'Pychyl (2013, "Solving the Procrastination Puzzle"). Procrastination is avoiding the NEGATIVE EMOTION the task evokes (boredom, anxiety, frustration, doubt). The brain says "I\'ll do it later when it feels less bad" — but it never does feel less bad.',
      action: 'Name the emotion the task evokes. ("This essay makes me anxious because I\'m worried it won\'t be good enough.") Tolerate the emotion + start anyway. Tip: just start for 5 minutes — the dread usually fades within minutes of beginning.' },
    { reframe: 'Get IN to the task, not READY for it',
      detail: 'Many people procrastinate by getting "ready" — clearing desk, finding the right music, making coffee. These rituals can be infinite. Start the task in the messiest possible state.',
      action: 'Lower the bar to "open the document" or "read the first sentence of the assignment." Stop preparing; start producing.' },
    { reframe: 'You don\'t need motivation, you need a system',
      detail: 'Waiting to "feel motivated" before doing the thing is backwards — motivation usually comes AFTER you start, not before. Action precedes motivation.',
      action: 'Use implementation intentions ("If 4pm, then start homework"). Use Pomodoros. Use body doubling. Build the system; let motivation be a bonus when it shows up.' },
    { reframe: 'Most procrastination is fear of doing it badly',
      detail: 'Perfectionism + procrastination are related. Both are about avoiding evidence that you\'re not as good as you want to be. The remedy is permission to do it badly first.',
      action: '"Shitty first draft" rule (Anne Lamott). Just produce SOMETHING. You can revise; you can\'t revise nothing.' },
    { reframe: 'Self-compassion beats self-criticism',
      detail: 'Sirois + Pychyl 2013. People who beat themselves up for procrastinating procrastinate MORE on subsequent tasks. Self-compassion reduces the rumination + frees executive function.',
      action: 'When you notice you\'ve been procrastinating: "OK. That happened. Many people struggle with this — it\'s not a character flaw. What\'s the smallest next step?" Then take it.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 12.13: MULTITASKING MYTH + ATTENTION RESIDUE
  // The myth that we can do two things at once is one of the most
  // expensive cognitive illusions for students. Brain doesn't multitask —
  // it task-switches. Each switch carries a cost.
  // ─────────────────────────────────────────────────────────
  var MULTITASKING_FACTS = {
    coreReality: 'The brain does NOT process two attention-demanding tasks in parallel. What we call "multitasking" is actually rapid task-switching — each switch leaks attention residue + costs cognitive resources.',
    attentionResidue: 'Sophie Leroy 2009. When you switch from Task A to Task B, part of your attention REMAINS on Task A for many minutes. You think you\'re working on B but you\'re working on B with a fraction of your capacity.',
    reorientationCost: 'Gloria Mark research (UC Irvine): after a single email interruption, knowledge workers take ~23 minutes on average to fully refocus. A "quick check" of email is rarely quick.',
    accuracyCost: 'Ophir, Nass + Wagner 2009. Heavy media multitaskers performed WORSE on tests of attention-switching, working memory, and filtering distractions — opposite of what they thought their multitasking practice was doing for them.',
    ironicAwareness: 'The people most confident in their multitasking ability score WORST on objective tests of multitasking performance. Multitasking confidence is anti-correlated with multitasking competence.'
  };

  var MULTITASKING_COSTS = [
    { source: '📧 Email / message check during study',
      cost: 'Each check = ~23 min reorientation cost (Gloria Mark). Even a 30-second check creates a 23-minute productivity tax.',
      fix: 'Phone in another room or in a drawer. Email closed. Notifications off. Check at deliberate breaks (Pomodoro pattern).' },
    { source: '💬 Texting while reading or watching lectures',
      cost: 'Comprehension drops 20-50% (Bowman et al. 2010). You THINK you got it; you didn\'t.',
      fix: 'Single-task during learning. Texts can wait the 25-50 min of the study session.' },
    { source: '📺 TV/podcast while studying',
      cost: 'Background TV (especially with dialogue) impairs reading comprehension. Music WITHOUT lyrics is the borderline case — instrumental is OK; lyrics compete with verbal processing.',
      fix: 'Silence > instrumental music > music with lyrics > podcast > TV, in order of preferred. Pick what works for the specific task.' },
    { source: '🌐 Multiple browser tabs',
      cost: 'Each open tab is a "future task" your working memory tracks. 30 open tabs = 30 background drains on cognitive resources.',
      fix: 'Bookmark + close. Tab-management extensions (OneTab, Workona). Aim for <10 open at a time during focus work.' },
    { source: '📱 Phone visible (even silenced)',
      cost: 'Ward et al. 2017. Even a face-down silent phone visible on the desk reduces working-memory + fluid intelligence test scores. Mere presence drains attention.',
      fix: 'Phone in another room. Or in a drawer. Out of sight, not just face-down.' },
    { source: '🎵 Music with lyrics during reading',
      cost: 'Verbal lyrics compete with verbal processing required to read. Reading speed + comprehension drop.',
      fix: 'Silence or instrumental during reading. Lyrics are fine for repetitive math problems or chores — different cognitive demands.' }
  ];

  var SINGLE_TASKING_TIPS = [
    { tip: 'Time-box your tasks',
      detail: 'Single-task for a defined window (Pomodoro 25 min, deep-work 50-90 min). Knowing the end is near makes single-tasking feel possible.' },
    { tip: 'Batch similar tasks',
      detail: 'Group emails + check at 11am, 3pm, 6pm. Group small admin tasks into one block. Switching costs aggregate; batching reduces total switches.' },
    { tip: 'Set up your environment FOR single-tasking',
      detail: 'Phone away. Notifications off. One tab. One document. One task. Visible distractions compete for attention even when you\'re "ignoring" them.' },
    { tip: 'Schedule transitions',
      detail: 'Between tasks, take a deliberate 2-3 minute reset (water, stretch, deep breath). Lets attention residue dissipate before starting the next task.' },
    { tip: 'Single-task IS the skill',
      detail: 'Like meditation. You\'ll fail. You\'ll notice you\'re distracted. You bring attention back. The bringing-back is the practice. Don\'t expect perfection.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 12.14: READING + LITERACY SCIENCE
  // The "reading wars" + structured literacy + Orton-Gillingham. Critical
  // for elementary teachers + parents + anyone working with struggling
  // readers. Aaron's school-psych work touches this directly.
  // ─────────────────────────────────────────────────────────
  var SIMPLE_VIEW_OF_READING = {
    formula: 'Reading Comprehension = Decoding × Language Comprehension (Gough + Tunmer 1986)',
    explanation: 'Reading is the product (NOT sum) of two skills. Either at zero = comprehension at zero. A reader needs BOTH to read well.',
    decoding: 'The ability to translate written letters/words into spoken sounds. Phonics + phonemic awareness + fluency live here.',
    languageComp: 'Understanding spoken language. Vocabulary + syntax + background knowledge + inference live here.',
    implications: [
      'A child with strong oral language but weak decoding (a "dyslexic profile") = good comprehension when text is read aloud, poor when reading independently. Treatment: structured literacy / phonics-based intervention.',
      'A child with strong decoding but weak language comprehension (a "hyperlexic profile" or English Learner) = can read aloud fluently but doesn\'t understand. Treatment: vocabulary + background-knowledge building.',
      'A child weak in BOTH = the most common pattern in struggling readers. Both interventions needed.'
    ]
  };

  var READING_FIVE_PILLARS = [
    { id: 'phonemic-awareness', icon: '🔊', name: 'Phonemic awareness',
      what: 'The ability to HEAR + manipulate the individual sounds (phonemes) in spoken words. NOT about letters yet — purely auditory.',
      example: 'Hearing that "cat" has 3 sounds: /k/ /a/ /t/. Knowing that "cat" without /k/ becomes "at." Identifying that "cat" + "bat" rhyme.',
      whenTaught: 'PreK-K, before phonics. Kids who lack phonemic awareness struggle with phonics + reading.',
      research: 'NRP (National Reading Panel) 2000: phonemic awareness is one of the strongest predictors of later reading success.' },
    { id: 'phonics', icon: '🔤', name: 'Phonics',
      what: 'The connection between letters/spellings + sounds. The systematic, sequential teaching of those connections.',
      example: '"The letter B says /b/." "When two vowels go walking, the first does the talking" (e.g., "boat" — /oh/ not /o-uh/). Decoding "phlegm" requires knowing "ph" = /f/, "gm" silent g.',
      whenTaught: 'K-2 primarily. Continues through elementary as patterns get more complex. Should be EXPLICIT + SYSTEMATIC.',
      research: 'NRP 2000 + Castles, Rastle + Nation 2018: explicit systematic phonics produces better outcomes than incidental phonics or whole-language approaches.' },
    { id: 'fluency', icon: '🏃', name: 'Fluency',
      what: 'Reading with appropriate speed + accuracy + expression. Frees cognitive resources for comprehension.',
      example: 'A fluent reader reads aloud at conversational pace with proper phrasing + intonation. A non-fluent reader sounds like a robot, breaking words letter-by-letter.',
      whenTaught: 'Grade 1-3 builds fluency. Repeated reading + Reader\'s Theater + audiobooks paired with text are evidence-based interventions.',
      research: 'NRP 2000. Fluency is the bridge between decoding + comprehension. Slow decoding eats working memory needed for comprehension.' },
    { id: 'vocabulary', icon: '📖', name: 'Vocabulary',
      what: 'Knowledge of word meanings. Both width (number of words known) + depth (how richly each word is known).',
      example: 'Knowing "happy" is one level. Knowing "happy / glad / joyful / elated / euphoric" with their connotations + appropriate contexts is depth.',
      whenTaught: 'Continuously through all grades. Read-alouds + explicit vocabulary instruction + wide reading + word study.',
      research: 'Hart + Risley 1995 (with debate over methodology) + Nagy + Townsend 2012. Vocabulary explains a huge proportion of reading-comprehension variance, especially after grade 3.' },
    { id: 'comprehension', icon: '🧩', name: 'Comprehension',
      what: 'Constructing meaning from text. Active process: predicting, inferring, monitoring, summarizing, questioning.',
      example: 'Reading a paragraph + summarizing the main idea. Inferring why a character did what they did. Connecting new info to background knowledge.',
      whenTaught: 'Continuously. Explicit teaching of comprehension strategies (visualizing, summarizing, questioning, inferring).',
      research: 'NRP 2000. Comprehension strategies, taught explicitly, transfer to better reading. But: strategies only work if decoding + vocabulary + background knowledge are sufficient.' }
  ];

  var STRUCTURED_VS_BALANCED = [
    { approach: 'Structured Literacy', stance: 'evidence-aligned',
      what: 'Explicit, systematic, sequential teaching of phonemic awareness + phonics + fluency. Decodable texts (texts where the words match the phonics taught). Cumulative review.',
      origin: 'Rooted in Orton-Gillingham (1930s) + reading-science research. Adopted in many states\' early-literacy mandates (post-2018 reading-science movement).',
      good: 'Strong evidence base. Especially effective for struggling readers + students with dyslexia. Equity benefit: doesn\'t assume kids will pick it up by osmosis.',
      caveat: 'Can feel mechanical to teachers used to "joyful reading." Best results when paired with rich read-alouds + vocabulary + comprehension strategies.' },
    { approach: 'Balanced Literacy', stance: 'mixed evidence',
      what: 'Mix of phonics + whole-language approaches. Often emphasizes "leveled readers" (texts at the child\'s level), guided reading groups, "three-cueing" (using meaning + structure + visual cues including pictures + first letter to guess words).',
      origin: 'Calkins, Fountas + Pinnell, Lucy Calkins + Reading Recovery. Dominant in US elementary schools 2000-2020.',
      good: 'Joyful, choice-rich classrooms. Wide reading habits.',
      caveat: 'Three-cueing is the controversial part — research shows skilled readers use letter-by-letter decoding, NOT context-guessing. Asking struggling readers to "guess from the picture or first letter" trains BAD habits + leaves dyslexic students behind. The "Sold a Story" podcast (Emily Hanford 2022) brought this critique to wide audiences.' },
    { approach: 'Whole Language (mostly historical)', stance: 'evidence-rejected',
      what: 'Reading is "natural" like spoken language; minimize phonics; immerse in real books.',
      origin: 'Goodman + Smith 1970s-80s.',
      good: 'Genuine love of reading. Authentic texts.',
      caveat: 'Empirically rejected — children DON\'T pick up reading naturally; explicit instruction matters. Whole-language stripped of phonics produces predictable reading failures, especially for kids with dyslexia.' }
  ];

  var ORTON_GILLINGHAM = {
    what: 'A multisensory, structured-literacy approach originally developed for students with dyslexia. Letters/sounds taught explicitly + cumulatively + with multiple modalities (see + hear + write + tap).',
    history: 'Samuel Orton (neuropsychiatrist) + Anna Gillingham (educator), 1930s-40s. Pre-empts modern reading science by decades.',
    coreFeatures: [
      'Multisensory (visual + auditory + kinesthetic-tactile)',
      'Direct + explicit instruction (no guessing)',
      'Systematic + cumulative (each lesson builds on prior; review baked in)',
      'Sequential (simple → complex; easy → hard)',
      'Diagnostic (teacher continuously assesses + adjusts)',
      'Synthetic phonics (letter-sound → blend into words)'
    ],
    evidence: 'Strong evidence base for dyslexia intervention. Adapted programs (Wilson Reading System, Barton, LiPS, SPIRE) all draw from O-G principles + share evidence base.',
    accessibility: 'Has historically been expensive (private tutoring at $80-150/hr). Increasingly available in schools as structured literacy mandates spread.'
  };

  var READING_WARS_SUMMARY = 'The "reading wars" is the multi-decade fight between phonics-first + whole-language camps. Reading science (cognitive psychology, neuroscience) has converged on phonics+structured literacy as evidence-aligned, especially for struggling readers + dyslexia. Many US states have passed early-literacy laws (post-2018) requiring structured literacy. Teachers trained in balanced-literacy approaches need professional development to update practice. Resources: Emily Hanford\'s "Sold a Story" podcast (2022). Reading Reform Foundation. International Dyslexia Association.';

  // ─────────────────────────────────────────────────────────
  // SECTION 12.15: TRAUMA-INFORMED TEACHING
  // ACEs framework + window of tolerance + co-regulation. Aaron\'s clinical
  // territory. Critical for ALL teachers — many students carry trauma that
  // shapes their classroom presentation; all teachers will encounter it.
  // ─────────────────────────────────────────────────────────
  var TRAUMA_FOUNDATIONS = {
    aces: 'Adverse Childhood Experiences (ACEs) study, Felitti + Anda 1998. Higher ACEs scores correlate with worse adult mental + physical health outcomes. ~67% of US adults have at least 1 ACE; ~13% have 4+ ACEs.',
    behaviorAsCommunication: 'Trauma-informed reframe: behavior is not "willful misbehavior" — it\'s communication of an unmet need or dysregulated state. "What happened to you?" replaces "What\'s wrong with you?"',
    coRegBeforeSelfReg: 'Bruce Perry. Children develop self-regulation only AFTER experiencing reliable co-regulation with a calm, predictable adult. You can\'t demand a dysregulated child "calm down" — you have to provide the regulated nervous system that helps theirs come back online.',
    windowOfTolerance: 'Daniel Siegel. The optimal zone of arousal where a person can think + learn + connect. Outside the window: hyperaroused (fight/flight) or hypoaroused (freeze/dissociate). Trauma narrows this window; trauma-informed practice widens it.',
    notATherapist: 'Teachers are NOT therapists. The goal isn\'t to treat trauma — it\'s to create classrooms that don\'t exacerbate it + that make learning possible for trauma-affected students. Refer clinical concerns to school psych + counselor + outside therapy.'
  };

  var TRAUMA_INFORMED_PRACTICES = [
    { id: 'safety', icon: '🛡️', name: 'Build safety + predictability',
      what: 'Trauma teaches the body that the world is unpredictable + unsafe. Healing starts with predictability.',
      classroom: 'Consistent routines + visible schedules + predictable transitions + reliable adult responses (never sarcasm or shame). When you HAVE to change something, give advance warning + acknowledge the disruption.',
      avoid: 'Sudden surprises ("pop quiz!"), public shaming, unpredictable consequences, raised voices.' },
    { id: 'connection', icon: '🤝', name: 'Connection before correction',
      what: 'When a student is dysregulated, NO learning or behavior change is possible. Co-regulate first. Address content/behavior after.',
      classroom: 'Notice the dysregulation. Use a calm voice + body language. Move closer (if welcome) or give space. Validate ("this is hard right now"). Wait for the nervous system to come back online before any teaching.',
      avoid: 'Trying to "reason with" a dysregulated student. Public correction. Power struggles. Demanding immediate verbal response.' },
    { id: 'choice', icon: '🎯', name: 'Build in choice + autonomy',
      what: 'Trauma is fundamentally about loss of agency. Every choice you build into instruction restores some.',
      classroom: 'Choice of seat. Choice of project topic. Choice of reading from a curated list. Two ways to demonstrate learning. Even small choices reduce the survival-system activation that big-no-choice tasks trigger.',
      avoid: 'Forcing students into corner-seats, mandatory partner assignments, rigid prescribed pathways.' },
    { id: 'regulation', icon: '🌬️', name: 'Teach regulation skills explicitly',
      what: 'Self-regulation isn\'t innate; it\'s learned through co-regulation + practice. Teach the skills explicitly + non-shaming.',
      classroom: 'Brief breathing exercises at start of class. Calm corner / sensory tools available without permission. Pre-taught language for emotions + needs ("I need a break", "I\'m feeling overwhelmed"). Modeling: name your own emotions.',
      avoid: 'Shaming kids for needing the calm corner. Treating self-regulation skills as "for kids with problems."' },
    { id: 'culture', icon: '🌍', name: 'Cultural humility + systemic awareness',
      what: 'Many students carry historical + systemic trauma (racism, poverty, displacement, intergenerational trauma) — often in addition to individual experiences. Trauma-informed teaching includes this lens.',
      classroom: 'Diverse texts + perspectives. Validate experiences without prying. Don\'t assume all trauma looks the same. Recognize that some "traumas" are ongoing (systemic racism doesn\'t end at the schoolhouse door).',
      avoid: 'Color-blind framing ("I don\'t see race"). Cultural insensitivity. Treating trauma as exclusively individual.' },
    { id: 'self-care', icon: '💚', name: 'Adult self-regulation',
      what: 'You cannot co-regulate from a dysregulated state. Teachers working with trauma-affected students need their own regulation tools + support — secondary trauma is real.',
      classroom: 'Brief regulation breaks for yourself. Peer consultation. Therapy if needed. Recognizing your own activation BEFORE you respond.',
      avoid: 'Stoic suffering. Burnout cycle. "I\'m fine" denial.' }
  ];

  var TRAUMA_REFERRAL_GUIDE = [
    { sign: 'Sudden behavior change (withdrawal, aggression, dissociation)',
      action: 'Document. Talk privately + non-pressuring. Refer to school counselor.' },
    { sign: 'Disclosure of abuse / neglect / harm',
      action: 'You are a MANDATED REPORTER. Report to your designated child-protection authority within the timeline your state requires. Don\'t investigate — report.' },
    { sign: 'Disclosure of suicidal thoughts or self-harm',
      action: 'Stay with the student. Don\'t leave them alone. Contact school counselor / school psych immediately. Don\'t promise confidentiality.' },
    { sign: 'Pattern of dysregulation that doesn\'t respond to classroom strategies',
      action: 'Refer to school psych for assessment. May be PTSD, anxiety disorder, ADHD, or other clinical concern needing specialized intervention.' },
    { sign: 'Suspected substance use, eating disorder, or other clinical concern',
      action: 'Refer. Don\'t try to handle it as a teacher. School counselor + outside referral.' },
    { sign: 'Acute crisis (in danger now)',
      action: '911 or 988 Suicide and Crisis Lifeline. Don\'t hesitate. School protocols exist for exactly this.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 12.16: MTSS / RTI + UNIVERSAL SCREENING
  // The framework that organizes most of school-psych work in 2026.
  // Tier 1 / 2 / 3 model + universal screening + decision-making.
  // ─────────────────────────────────────────────────────────
  var MTSS_FOUNDATIONS = {
    what: 'MTSS = Multi-Tiered System of Supports. An umbrella framework that combines academic (RTI = Response to Intervention) and behavioral (PBIS = Positive Behavioral Interventions and Supports) tiered supports into one system. Replaced the old "wait to fail" model where students had to fail before getting help.',
    purpose: 'Catch struggling students EARLY using universal screening, deliver increasingly intensive evidence-based interventions, monitor response to those interventions, and use that data to make decisions — including special-education eligibility decisions.',
    tier1: 'TIER 1 — UNIVERSAL (~80% of students). High-quality core instruction + universal screening 3x/year (fall/winter/spring). All students get this. If MORE than ~20% of students are below benchmark in Tier 1, the issue is core instruction, NOT the students.',
    tier2: 'TIER 2 — TARGETED (~15-20% of students). Small-group evidence-based intervention IN ADDITION TO Tier 1. Typically 20-30 min, 3-5x/week, 6-12 weeks. Progress monitoring 1-2x/month using brief curriculum-based measures.',
    tier3: 'TIER 3 — INTENSIVE (~3-5% of students). Individualized or very small-group intervention with significantly more time + intensity. Weekly progress monitoring. Often a step toward special-education evaluation if response is inadequate.',
    schoolPsychRole: 'School psych in MTSS: leads/co-leads data team meetings, runs/interprets universal screening + diagnostic assessment, consults on Tier 2 + 3 interventions, conducts comprehensive evaluations for SpEd eligibility when warranted, helps the team make data-based decisions for tier movement.'
  };

  var MTSS_SCREENING_TOOLS = [
    { id: 'dibels', domain: 'Early literacy K-6', name: 'DIBELS 8th Edition (mclasshome.com)',
      what: 'Dynamic Indicators of Basic Early Literacy Skills. 1-min fluency probes for letter naming, phonemic awareness, decoding, oral reading fluency, retell.',
      use: 'Universal screening 3x/year + progress monitoring weekly/biweekly for Tier 2 + 3.', cost: 'Free benchmark version; mClass paid version' },
    { id: 'aimsweb', domain: 'Reading + math K-12', name: 'aimswebPlus (Pearson)',
      what: 'Brief (1-3 min) curriculum-based measures across reading + math domains.',
      use: 'Universal screening + frequent progress monitoring.', cost: 'Paid subscription' },
    { id: 'mclass', domain: 'Early literacy K-3', name: 'mClass with DIBELS 8',
      what: 'iPad-based assessment platform combining DIBELS with structured-literacy diagnostics.',
      use: 'Districts moving to structured-literacy approach (post-Reading Wars).', cost: 'Paid' },
    { id: 'star', domain: 'Reading + math K-12', name: 'STAR (Renaissance)',
      what: 'Computer-adaptive screening + progress monitoring across reading + math.',
      use: 'Universal screening 2-3x/year. Generates growth + percentile data.', cost: 'Paid' },
    { id: 'nwea', domain: 'Reading + math + science K-12', name: 'NWEA MAP Growth',
      what: 'Computer-adaptive achievement assessment. RIT scale enables growth tracking across years.',
      use: 'Universal screening 2-3x/year. Strong national norms.', cost: 'Paid' },
    { id: 'saebrs', domain: 'Behavioral + SEL K-12', name: 'SAEBRS (FastBridge / Illuminate)',
      what: 'Social, Academic, Emotional Behavior Risk Screener. Brief (1-3 min per student) teacher-rating screener.',
      use: 'Behavioral universal screening — the SAME way you screen academics. Most schools STILL skip this even though it\'s the missing piece.', cost: 'Paid bundle' },
    { id: 'bimas', domain: 'Behavioral + SEL K-12', name: 'BIMAS-2 (Pearson / Edumetrisis)',
      what: 'Behavior Intervention Monitoring Assessment System. Multi-rater behavioral screening.',
      use: 'Behavioral universal screening + progress monitoring.', cost: 'Paid' },
    { id: 'pls', domain: 'Phonics screening 6+', name: 'Phonics Screening Inventory',
      what: 'Diagnostic screen for older students with decoding gaps. Identifies specific phonics holes.',
      use: 'When MS/HS students fail reading-comprehension screening — confirms whether decoding is the underlying gap.', cost: 'Free options exist' }
  ];

  var MTSS_DECISION_FRAMEWORK = [
    { id: 'tier1-class', icon: '👥', when: '>20% of class is below benchmark on universal screener',
      what: 'The issue is CORE INSTRUCTION, not individual students. Tier-2 interventions won\'t fix this.',
      action: 'Coach the teacher / strengthen Tier 1 first. Audit the curriculum. Add scaffolds. Then re-screen.' },
    { id: 'tier1-school', icon: '🏫', when: '>20% of GRADE LEVEL or SCHOOL is below benchmark',
      what: 'It\'s a Tier-1 systems problem — curriculum, training, or implementation. Pulling kids into Tier 2 in this case overwhelms intervention capacity.',
      action: 'School-wide instructional intervention. Curriculum review. PD. Then re-screen. THIS is where psych + admin lead, not just classroom teachers.' },
    { id: 'move-to-2', icon: '⬆️', when: 'Student below benchmark on screener AND classroom data confirms struggle',
      what: 'Move to Tier 2 with a specific evidence-based intervention matched to the diagnostic profile.',
      action: 'Set a goal (e.g., 50 WCPM growth in 8 weeks). Progress monitor 1-2x/month. Plan to review at 6-8 weeks.' },
    { id: 'tier2-stay', icon: '🔁', when: 'Tier-2 progress monitoring shows growth toward goal',
      what: 'Intervention is working. Continue.',
      action: 'Stay in Tier 2 until benchmark is reached, then fade with continued monitoring.' },
    { id: 'tier2-fail', icon: '⚠️', when: 'Tier-2 progress monitoring shows inadequate response after 6-8 weeks of FIDELITY-CHECKED intervention',
      what: 'First check: is the intervention being delivered as designed (fidelity)? If yes — escalate.',
      action: 'Move to Tier 3 OR refer for comprehensive evaluation, depending on profile + state rules.' },
    { id: 'eval', icon: '📋', when: 'Tier 3 inadequate response, OR clear severity warranting bypass of staged tiers',
      what: 'Comprehensive evaluation for special-education eligibility. School psych leads.',
      action: 'Multi-source assessment (cognitive + achievement + behavioral + adaptive as appropriate). IEP team determines eligibility.' }
  ];

  var MTSS_PITFALLS = [
    'Skipping behavioral screening. Most schools screen reading + math but not behavior, even though behavioral risk predicts academic risk.',
    'Treating MTSS as a "pre-referral hurdle" rather than ongoing prevention. MTSS is NOT just a delay tactic before SpEd evaluation.',
    'Failing to check intervention fidelity. If the intervention wasn\'t actually delivered as designed, the "no response" data is meaningless.',
    'Tiering up before tackling Tier 1. If 40% of a class is below benchmark, no Tier-2 plan can serve them all.',
    'Equity blind spots. Disproportionate Tier 2 + 3 placement for students of color or EL students often signals biased screening or underserving Tier 1, not actual need.',
    'No progress monitoring. "We did the intervention" is not data. WEEKLY data points across an intervention period are.'
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 12.17: WRITING PROCESS PEDAGOGY
  // Bereiter + Scardamalia knowledge-telling vs knowledge-transforming.
  // The 5 pillars + writing-as-thinking-tool. Where most teaching breaks.
  // ─────────────────────────────────────────────────────────
  var WRITING_FOUNDATIONS = {
    bigIdea: 'Writing is a thinking tool, not just a product. Emig 1977 + Klein 1999. The act of generating + revising text forces conceptual reorganization that talking + reading don\'t. This is why "write to think" works.',
    knowledgeTelling: 'Knowledge-telling (novice mode, Bereiter + Scardamalia 1987): write down what you already know on the topic. Brain-dump pattern. The text doesn\'t change your thinking — it just records it.',
    knowledgeTransforming: 'Knowledge-transforming (expert mode): writing IS thinking. The writer alternates between content problems ("what do I think about X?") and rhetorical problems ("how do I say this clearly?"), and EACH revision changes the underlying thinking. This is what we want students to do.',
    productVsProcess: 'Common failure: teachers grade only the final product. Students get a B+ with comments like "good ideas." But the teacher never saw the process — never knew if the student knowledge-told or knowledge-transformed. Teaching the process is teaching the thinking.',
    cognitiveLoad: 'Writing is one of the most cognitively demanding tasks humans do. It requires simultaneously: generating ideas, organizing them, choosing words, building sentences, monitoring conventions, and self-evaluating. Novices crash. Scaffolded process explicitly distributes this load across stages.',
    research: 'Hillocks 1986 meta-analysis: traditional grammar instruction has near-zero or NEGATIVE effect on writing quality. The most effective approach: explicit teaching of process + structure + sentence-combining + inquiry. Graham + Perin 2007 (Writing Next): same conclusion + adds peer assistance + writing for diverse purposes.'
  };

  var WRITING_PILLARS = [
    { id: 'planning', icon: '🧠', name: 'Planning (pre-writing)',
      what: 'Generating + organizing ideas BEFORE drafting. Brainstorming, outlining, concept mapping, talking it through.',
      classroom: '5-15 min minimum. Multiple strategies — list, web, freewrite, talk-with-partner. Honor different planners (some need lots of pre-writing; some need to draft to discover). Make planning visible so students can SEE what good planners do.',
      avoid: 'Skipping planning. Forcing one planning style. Grading the plan as if it were a draft.' },
    { id: 'drafting', icon: '✍️', name: 'Drafting',
      what: 'Getting ideas onto the page in rough form. Speed + flow over correctness. Discovery happens here.',
      classroom: 'Reduce surface-level concerns: "spelling doesn\'t count YET." Allow imperfect first drafts. Conferences during drafting catch derailment before it solidifies.',
      avoid: 'Demanding polished prose on the first attempt. Grading drafts on conventions.' },
    { id: 'revising', icon: '🔄', name: 'Revising (re-seeing)',
      what: 'Changing the IDEAS + STRUCTURE + ARGUMENT. NOT spelling/grammar (that\'s editing). The hardest + most powerful stage.',
      classroom: 'Teach revision moves explicitly: cut, expand, reorder, add evidence, sharpen claim, develop counterargument. Model with your own draft. Use peer feedback structured around content, not "looks good."',
      avoid: 'Conflating revising with editing. Treating revision as optional. Skipping straight to proofreading.' },
    { id: 'editing', icon: '✏️', name: 'Editing',
      what: 'Surface-level corrections — grammar, spelling, punctuation, sentence boundaries.',
      classroom: 'Teach editing AS A SKILL using mentor texts. Editing checklists keyed to that grade\'s targets. Sentence-combining instruction (proven effective).',
      avoid: 'Treating editing as the only kind of teacher feedback. Bleeding red ink across drafts that haven\'t been revised yet.' },
    { id: 'publishing', icon: '🌟', name: 'Publishing (sharing)',
      what: 'Audience exists. Real readers — classmates, families, school community, online. The writing GOES somewhere.',
      classroom: 'Class anthology, blog, podcast, presentation, gallery walk, school newspaper. Real audience drives effort + revision. The motivation + identity work is huge.',
      avoid: 'Writing only for the teacher\'s gradebook. Never sharing student writing publicly.' }
  ];

  var WRITING_FRAMEWORKS = [
    { id: '6plus1', icon: '📊', name: '6+1 Traits of Writing',
      what: 'Education Northwest framework. The 6 traits: ideas, organization, voice, word choice, sentence fluency, conventions. The "+1" is presentation.',
      use: 'Common rubric language across grade bands. Helps move feedback BEYOND "good job" toward specific, actionable trait-level guidance.' },
    { id: 'srsd', icon: '🎯', name: 'Self-Regulated Strategy Development (SRSD)',
      what: 'Graham + Harris. Strongest-evidence writing intervention for struggling writers + students with LD. Explicit instruction in genre-specific strategies + self-regulation skills (goal-setting, self-monitoring).',
      use: 'Tier 2/3 writing intervention. POW + TREE for opinion writing; STOP + DARE for persuasive; etc.' },
    { id: 'mentortexts', icon: '📚', name: 'Mentor texts',
      what: 'Lucy Calkins / Katie Wood Ray tradition. Read like writers — analyze how published authors do specific moves, then try them.',
      use: 'Survives the Reading Wars critique because the move-by-move analysis is not whole-language guessing — it\'s explicit study of craft.' },
    { id: 'peerreview', icon: '🤝', name: 'Structured peer review',
      what: 'Peer feedback works when the structure is explicit. Templates that ask specific questions ("Where did the writer\'s argument confuse me?") not vague reactions ("nice job!").',
      use: 'Frees teacher to confer with priority students while peers do trait-level feedback for everyone else.' }
  ];

  var WRITING_FAILURES = [
    'Grading only the final product → never see the process. Add brief process portfolios or writing journals.',
    'Treating grammar drills as writing instruction (Hillocks: near-zero effect). Replace with sentence-combining + revision in real drafts.',
    'No real audience beyond the teacher. Add publishing — class blog, school newspaper, gallery walk, family night.',
    'Same prompt for every student → kills voice + agency. Include genuine choice in topic, format, or audience.',
    'Praise without specificity ("good job"). Replace with trait-level feedback ("your second paragraph turned the argument — what made you decide to put it there?").',
    'Bleeding red ink across drafts that haven\'t been revised yet. Editing belongs LATE, not early.'
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 12.18: GROUP WORK + COLLABORATIVE LEARNING
  // Slavin + Aronson + Kagan. Why most "group work" fails + how to design it well.
  // ─────────────────────────────────────────────────────────
  var GROUP_FOUNDATIONS = {
    bigIdea: 'Collaborative learning works only when two non-negotiables are present: positive interdependence (group success requires every member) AND individual accountability (each person\'s contribution is assessed). Slavin\'s decades of meta-analyses confirm this.',
    posInterdep: 'Positive interdependence: the group can\'t succeed without every member. Built through shared goals, divided resources, complementary roles, joint products. Without it, groups split into "doers and watchers."',
    indivAccount: 'Individual accountability: every member is assessed on their individual contribution + understanding. Built through individual quizzes after group work, randomized "report-out" picks, jigsaw structures. Without it, free-riding takes over.',
    cooperation: 'Why cooperation works (when designed well): pre-teaches social skills + offloads cognitive load by distributing thinking across members + creates motivation through belonging + develops perspective-taking. Vygotskian: the more capable peer scaffolds the learner.',
    failures: 'Why most "group work" fails: teacher assigns 4 kids + a poster + walks away. No interdependence (one kid does it all). No accountability (one grade for all). No structure (chaos). Result: stronger students resent it, weaker students disengage, teacher learns to avoid it.'
  };

  var GROUP_STRUCTURES = [
    { id: 'jigsaw', icon: '🧩', name: 'Jigsaw method (Aronson 1971)',
      what: 'Each student becomes "expert" in one piece of the content (e.g., one of 4 sources on the Civil War). They meet in expert groups to deepen understanding, then return to home groups + teach their piece.',
      strengths: 'Strongest interdependence: home group LITERALLY cannot complete the assignment without each member. Forces individual accountability (you must understand your piece well enough to teach it). Reduces inter-group conflict (Aronson designed it during desegregation in Texas schools).',
      weaknesses: 'Requires content that breaks cleanly into roughly equal pieces. Extra setup time. Doesn\'t work well for procedural skills.' },
    { id: 'numheads', icon: '🔢', name: 'Numbered Heads Together (Kagan)',
      what: 'Students count off 1-4 in their group. Teacher poses a question. Group discusses + makes sure ALL members can answer. Teacher calls a number → that person answers for the group.',
      strengths: 'Built-in individual accountability. Forces stronger students to teach the weaker ones (they don\'t know who will be called). Quick — fits any lesson.',
      weaknesses: 'Stronger students sometimes still dominate the discussion; weaker students may memorize without understanding.' },
    { id: 'thinkpair', icon: '🤝', name: 'Think-Pair-Share',
      what: 'Individual think (1-2 min) → pair discuss (2-3 min) → share with class. The simplest cooperative structure.',
      strengths: 'Almost zero setup. Activates every student (vs. "raise your hand"). Pair discussion lowers fear-of-wrong-answer.',
      weaknesses: 'Light interdependence. Best as a tool, not the main course.' },
    { id: 'reciprocal', icon: '📖', name: 'Reciprocal teaching (Palincsar + Brown)',
      what: 'Small group reads a text together. Members rotate through 4 roles: predict, question, clarify, summarize. Teacher models heavily at first, then fades.',
      strengths: 'Strong evidence base for reading comprehension. Explicit metacognitive scaffold. Roles distribute cognitive load.',
      weaknesses: 'Requires modeling time. Roles can become rote without ongoing teacher coaching.' },
    { id: 'productive', icon: '⚖️', name: 'Productive struggle in groups (Hiebert + Grouws)',
      what: 'Group works on a task at the edge of difficulty. Teacher hovers but doesn\'t rescue. Group must wrestle with the math/science problem.',
      strengths: 'Builds genuine reasoning + persistence. Mirrors how scientists + mathematicians actually work.',
      weaknesses: 'Hard to implement well — teachers default to rescuing too quickly. Requires norm-setting that "stuck is OK + expected."' },
    { id: 'roles', icon: '🎭', name: 'Structured roles',
      what: 'Each member has an explicit role: facilitator, recorder, materials manager, time-keeper, presenter. Roles rotate across tasks.',
      strengths: 'Reduces dominance + free-riding. Builds specific social/academic skills.',
      weaknesses: 'Needs explicit teaching of each role. Can feel rigid for shorter tasks.' }
  ];

  var GROUP_FAILURES = [
    { mode: 'Free riders', why: 'No individual accountability. One student does all work, others coast.',
      fix: 'Individual quiz after group work. Randomized report-out (any member can be called). Individual artifact required IN ADDITION TO group product.' },
    { mode: 'Dominators', why: 'No structured turn-taking. Strong/loud student takes over.',
      fix: 'Numbered Heads Together. Talk-tokens. Roles. Explicit norm: "everyone explains the answer before we move on."' },
    { mode: 'Fake collaboration', why: 'Group submits one product but each kid worked alone. No interdependence built into the task.',
      fix: 'Tasks that genuinely REQUIRE interdependence (Jigsaw, divided resources, complementary roles).' },
    { mode: 'Off-task chaos', why: 'No clear roles, no time pressure, no accountability moment.',
      fix: 'Tight time limits. Visible product expected. Teacher circulates with check-ins. Norms taught + reinforced.' },
    { mode: 'Inequitable participation', why: 'Status differences (gender, race, perceived ability) silence some voices.',
      fix: 'Status interventions (Cohen + Lotan): assign each member a real intellectual contribution. Praise specific intellectual moves publicly. Multi-ability tasks where everyone has something to offer.' }
  ];

  var GROUP_WHEN_NOT = [
    'When the task is genuinely individual (silent reading, individual writing draft, individual practice for fluency).',
    'When the cost of setup exceeds the benefit (5-min review questions don\'t need 4-person groups).',
    'When norms haven\'t been built. Throwing students into groups before teaching cooperative norms guarantees failure.',
    'When stakes are very high (some testing contexts, some portfolio assessments) and individual accountability matters more than collaborative learning.',
    'When the goal is automaticity / drill (math facts, spelling) — there are better structures (e.g., paired flashcard practice) than open-ended groups.'
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 12.19: MATH ANXIETY + MATH PEDAGOGY
  // Ramirez + Boaler + Hiebert + Grouws. Distinct from test anxiety.
  // Cultural transmission problem: teachers pass their own math anxiety on.
  // ─────────────────────────────────────────────────────────
  var MATH_FOUNDATIONS = {
    distinct: 'Math anxiety is DISTINCT from general test anxiety (Ramirez et al. 2018). Specific physiological + cognitive response to math content. Working-memory hijack: anxiety occupies the same WM resources needed for math, so the student literally has fewer resources to compute with. This is why "calm down + try harder" doesn\'t work.',
    transmission: 'Cultural transmission problem (Beilock et al. 2010): teachers + parents with math anxiety transmit it to students — especially same-gender adults to children. "I was never a math person either" is one of the most damaging things an adult can say to a struggling child.',
    identity: 'The "I\'m not a math person" identity is uniquely sticky in US culture. Mathematics is the only subject where intelligent adults publicly declare their incompetence + treat it as identity, not gap. Compare: no one says "I\'m not a reading person" with pride.',
    mindset: 'Boaler\'s mathematical mindset work: math ability is built, not born. Mistakes literally grow neural connections. Speed is NOT a marker of mathematical talent — depth of reasoning is.',
    research: 'Productive struggle (Hiebert + Grouws 2007): the right amount of difficulty produces the strongest math learning. Too easy = no learning. Too hard = collapse. The sweet spot requires teacher judgment + relationship.'
  };

  var MATH_CONCEPT_VS_PROC = {
    procedural: 'Procedural fluency: knowing HOW to execute steps (the algorithm). Long division. The quadratic formula. Both essential AND necessary.',
    conceptual: 'Conceptual understanding: knowing WHY the procedure works. Why does the long-division algorithm produce the right answer? Why does the quadratic formula come from completing the square?',
    bothMatter: 'Hiebert + Lefevre 1986: BOTH matter. Strong students have both, integrated. Weak students often have procedural fluency without conceptual grounding (works until they encounter a non-routine problem) OR conceptual ideas without procedural fluency (can\'t reliably get to an answer).',
    danger: 'The danger is treating these as either-or. "Concept-only" instruction leaves students unable to compute. "Procedure-only" instruction leaves students unable to reason. The integration is the goal — and that takes intentional design.',
    nctm: 'NCTM Principles to Actions (2014): defines 5 mathematical practices teachers should aim for: make sense of problems + reason quantitatively + construct viable arguments + use appropriate tools + attend to precision.'
  };

  var MATH_PEDAGOGY_MOVES = [
    { id: 'numbertalks', icon: '🗣️', name: 'Number talks (Parrish; Boaler)',
      what: '5-15 min daily routine. Teacher poses a problem. Students compute MENTALLY (no paper). Teacher collects + records 2-4 different strategies. Class discusses how they\'re related.',
      why: 'Builds flexible number sense + multiple strategies + verbal reasoning + mathematical identity. Slows speed-as-marker-of-talent norm. Validates multiple ways to think.',
      example: '"What\'s 18 × 5?" Strategies surface: (10×5)+(8×5); 18×10/2; 20×5−2×5. All correct. Math becomes about reasoning, not racing.' },
    { id: 'lowfloorhighceiling', icon: '🚪', name: 'Low-floor / high-ceiling tasks',
      what: 'Tasks that everyone can enter (low floor) AND that have meaningful complexity for advanced students (high ceiling). Example: "Find as many ways as you can to make 12."',
      why: 'Differentiates without segregating. Honors mixed readiness. Boaler\'s research: low-floor/high-ceiling tasks produce stronger learning + more equitable achievement than tracked instruction.',
      example: '"How many rectangles can you find on a 5×5 grid?" Beginner: count 1×1 squares. Advanced: derive the formula.' },
    { id: 'productiveStruggle', icon: '⚖️', name: 'Productive struggle',
      what: 'Set tasks just BEYOND current automatic competence. Watch carefully. Coach without rescuing. Norm-build that struggle = learning, not failure.',
      why: 'The right amount of difficulty produces the strongest learning (Hiebert + Grouws). Rescuing too quickly costs the learning + signals "I don\'t think you can do this."',
      example: 'Pose a problem. Wait 3 min before any teacher input. Then ask "what have you tried? What\'s confusing?" before giving hints — and even hints should be questions, not answers.' },
    { id: 'mistakes', icon: '🌱', name: 'Mistakes-grow-the-brain norm',
      what: 'Explicitly teach Boaler\'s research finding: mistakes literally grow neural connections. Display mistakes publicly + analyze them. Praise the THINKING in a wrong answer when the reasoning was reasonable.',
      why: 'Disrupts the "fast + correct = smart" cultural script. Builds risk-tolerance which is a prerequisite for productive struggle.',
      example: '"My favorite mistake" board. "Why is this wrong AND interesting?" debriefs.' },
    { id: 'multipleRep', icon: '🔄', name: 'Multiple representations',
      what: 'Same concept shown 3+ ways: visual, numeric, algebraic, verbal, manipulative. Students translate between representations.',
      why: 'Conceptual understanding lives in the connections between representations. UDL principle. Reduces "I get it one way, can\'t do the other."',
      example: 'Linear equation: graph + table + equation + verbal description. Students start in their stronger representation, then build bridges.' },
    { id: 'discourse', icon: '💬', name: 'Mathematical discourse',
      what: 'Students explain their reasoning out loud + critique each other\'s reasoning. Teacher facilitates without resolving. "Why?" questions over "what?" questions.',
      why: 'Verbalization forces conceptual reorganization (writing-as-thinking, applied to math). Builds argument + reasoning. Aligns with NCTM Standards for Mathematical Practice.',
      example: '"Convince me." "Convince a friend." "Convince a skeptic." Three increasing levels of mathematical argumentation.' }
  ];

  var MATH_ANXIETY_INTERVENTIONS = [
    { id: 'expressive', name: 'Expressive writing pre-test',
      what: '7-10 min writing about test-related fears IMMEDIATELY before a math test (Ramirez + Beilock 2011).',
      why: 'Frees up working memory occupied by anxiety. Studies showed equity-closing effects.', evidence: 'Ramirez + Beilock 2011 (Science).' },
    { id: 'untimed', name: 'Reduce timed-pressure norms',
      what: 'Replace timed math drills with conceptual problems where reasoning matters more than speed.',
      why: 'Speed-as-talent culture is one of the strongest drivers of math anxiety (Boaler).', evidence: 'Boaler 2014; multiple meta-analyses on testing speed + anxiety.' },
    { id: 'errorAnalysis', name: 'Error analysis routines',
      what: 'Make mistakes routine + analyzed publicly. Mistake-of-the-day. "What was the thinking that led to this answer?"',
      why: 'Disarms shame. Reframes mistakes as data, not character.', evidence: 'Convergent — Boaler, growth mindset literature, RTI literature.' },
    { id: 'identity', name: 'Disrupt "I\'m not a math person"',
      what: 'Catch the phrase + replace it. "You\'re a math-person-in-progress." Show real mathematicians from diverse backgrounds. Talk about your OWN math struggles.',
      why: 'Identity is malleable in adolescence. Targeted intervention shifts identity + achievement together.', evidence: 'Boaler 2016; Stanford youcubed materials; identity-belief intervention research.' },
    { id: 'adultSelfCheck', name: 'Adult self-check (parents + teachers)',
      what: 'Adults: stop saying "I was never a math person" to kids. Replace with "this is hard for me too — let\'s work it out."',
      why: 'Beilock et al. 2010 — math-anxious adults transmit anxiety to children, especially same-gender. The cultural script is changeable.', evidence: 'Beilock 2010 (PNAS); Maloney et al. 2015.' }
  ];

  var MATH_PITFALLS = [
    'Treating speed as a marker of mathematical talent. Real mathematicians work slowly + carefully — speed is mostly about practiced procedural fluency, not depth.',
    'Procedure-only instruction. Students master "the steps" without understanding why — and crash on novel problems.',
    'Concept-only instruction. Students "understand" but can\'t reliably compute — and crash on standardized assessments.',
    '"Answer-getting" culture (Phil Daro). Students + teachers agree the goal is to get the answer fast. Reasoning becomes irrelevant.',
    'Adults transmitting their own math anxiety to children. The "I was never a math person" comment is one of the most damaging things to say.',
    'Tracking too early. Locking 4th-graders into "math levels" creates self-fulfilling prophecies (Boaler\'s research).'
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 13: KNOWLEDGE QUIZ — 65 questions across all modules
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
      correct: 1, why: 'The tool is a curriculum scaffold. The actual gains come from doing. Try retrieval practice ONCE this week on real content from a current class. Notice the difference vs your usual approach. That\'s the proof.' },
    { id: 'q41', icon: '✏️',
      stem: 'A teacher writes the objective: "Students will DEFEND a position on whether AI should be regulated, citing 3 sources." Which Bloom\'s level is this targeting?',
      choices: ['Remember', 'Understand', 'Apply', 'Evaluate'],
      correct: 3, why: '"Defend" + "citing sources" + "position" = Evaluate (level 5). Argument with explicit criteria + evidence is the hallmark of Evaluate-level work.' },
    { id: 'q42', icon: '🗣️',
      stem: 'The Feynman Technique:',
      choices: ['Solving physics problems', 'Explaining a concept aloud, in plain language, as if teaching a 12-year-old. Stumbles reveal knowledge gaps.', 'Reading slowly', 'Memorizing equations'],
      correct: 1, why: 'Named after Richard Feynman, who taught by simplification. The places where your plain-language explanation breaks are exactly where you don\'t actually understand. Then study those gaps.' },
    { id: 'q43', icon: '🏛️',
      stem: 'You need to memorize the first 10 elements of the periodic table for tomorrow. Best technique?',
      choices: ['Reread the table 10 times', 'Method of loci — place vivid images of each element along a familiar mental route', 'Highlight the textbook', 'Hope for the best'],
      correct: 1, why: 'Method of loci is excellent for arbitrary ordered lists. Walking a familiar route mentally + placing vivid images at each location creates strong, durable memory.' },
    { id: 'q44', icon: '🔀',
      stem: 'A math student is told: "instead of 20 quadratic problems then 20 trig problems then 20 calc, do them all mixed together." This is interleaving. What should the student EXPECT to feel?',
      choices: ['It will feel easier', 'Practice will feel HARDER + their error rate during practice will be HIGHER — but long-term retention + transfer will be significantly BETTER (Rohrer + Taylor 2007 doubled it)', 'No difference', 'They\'ll forget more'],
      correct: 1, why: 'Performance during practice ≠ learning. Interleaving feels worse in the moment because you have to figure out which method to use, but that discrimination is exactly what produces durable + transferable knowledge.' },
    { id: 'q45', icon: '🛤️',
      stem: 'You\'re NEW to thinking about pedagogy. What\'s the smart way to work through Learning Lab\'s modules?',
      choices: ['Take the quiz first', 'Use the Recommended Learning Path — 4-week curated walkthrough: Foundation vocabulary (Bloom\'s + cog load + metacog + ZPD) → UDL + strategies → critical thinking + myths → applying it (lesson plan, strategy picker, careers)', 'Random order', 'Skip everything'],
      correct: 1, why: 'The Learning Path orders modules pedagogically: vocabulary first (week 1), UDL + practical strategies (week 2), critical-thinking + myth-busting (week 3), applied practice + career exploration (week 4). Each week has goals + outcomes you can verify.' },
    { id: 'q46', icon: '😰',
      stem: 'Yerkes-Dodson law (1908) describes the relationship between arousal/anxiety and performance as:',
      choices: ['Linear (more anxiety = worse performance)', 'An inverted U — too LOW = bored/unfocused, OPTIMAL middle = alert/engaged, too HIGH = panic + working memory crashes', 'No relationship', 'More anxiety always helps'],
      correct: 1, why: 'Inverted-U: optimal arousal sits in the middle. Mild anxiety can sharpen focus (helpful). Severe anxiety eats working memory + crashes performance. Goal isn\'t zero anxiety — it\'s staying in the optimal middle.' },
    { id: 'q47', icon: '🌬️',
      stem: '4-7-8 breathing (inhale 4 sec, hold 7 sec, exhale 8 sec) reduces test anxiety because:',
      choices: ['Magic', 'Long exhales activate the parasympathetic nervous system (the "rest" branch), slowing heart rate + downshifting from fight-or-flight', 'It distracts you', 'It uses oxygen'],
      correct: 1, why: 'Slow breathing (especially long exhales) activates parasympathetic response. Heart rate slows, blood pressure drops, brain interprets the body as "safe" and downshifts from fight-or-flight. Works in seconds.' },
    { id: 'q48', icon: '🎯',
      stem: 'Self-Determination Theory (Deci + Ryan) proposes that 3 basic psychological needs support intrinsic motivation. They are:',
      choices: ['Money, fame, power', 'Autonomy, competence, relatedness', 'Speed, accuracy, memorization', 'Reading, writing, math'],
      correct: 1, why: 'Deci + Ryan 1985. AUTONOMY (self-chosen actions) + COMPETENCE (effective + growing) + RELATEDNESS (connected + belonging). When all 3 are met, intrinsic motivation thrives across cultures, ages, domains.' },
    { id: 'q49', icon: '📊',
      stem: 'You read: "New study shows program improved scores; p < .001!" What\'s the smart next question?',
      choices: ['Buy the program', 'What was the EFFECT SIZE (Cohen\'s d) and the SAMPLE SIZE? p<.001 just says it\'s unlikely to be pure noise — it doesn\'t tell you the effect is large or important. With huge N, tiny effects become "significant."', 'What\'s p?', 'Believe it'],
      correct: 1, why: 'p-value = "is this likely just noise?" Effect size = "is this big enough to matter?" Always read the effect size. Cohen\'s d=0.4 ≈ "one extra year of typical learning"; d=0.05 with N=100,000 gets p<.001 but is practically meaningless.' },
    { id: 'q50', icon: '🏆',
      stem: 'In the hierarchy of educational research evidence, which is STRONGEST?',
      choices: ['Anecdote ("I tried it and it worked")', 'Single case study', 'Single randomized controlled trial', 'Systematic review / meta-analysis of multiple high-quality studies'],
      correct: 3, why: 'A systematic review (e.g., Dunlosky 2013, Pashler 2008) synthesizes ALL high-quality studies on a question. Far stronger than any single study because it accounts for variation + replication. Always trust meta-analyses over single eye-catching studies.' },
    { id: 'q51', icon: '🎓',
      stem: 'A 7th grader does great in class + on homework but bombs tests. Most likely diagnosis BEFORE jumping to evaluation?',
      choices: ['She has a learning disability', 'Strategy gap — likely using low-utility study techniques (rereading + highlighting). Diagnose by asking HOW she studies; treat by coaching practice testing + distributed practice.', 'Tests are unfair', 'She\'s lying about studying'],
      correct: 1, why: 'Engaged in class + strong homework + failed tests is the modal pattern of "studied with low-utility strategies + experienced illusion of fluency." Diagnose strategy first; refer for evaluation only if strategy intervention fails.' },
    { id: 'q52', icon: '😴',
      stem: 'Why is sleep AFTER studying so important?',
      choices: ['It\'s not', 'During sleep (especially Stage 2 + REM), the brain consolidates + transfers new info from hippocampus to long-term cortical storage. Sleep is essentially a free 30-50% retention boost (Stickgold 2005).', 'Sleep prevents you from over-thinking', 'It\'s superstition'],
      correct: 1, why: 'Memory consolidation is sleep-dependent. Studying then sleeping produces dramatically better retention than studying then staying awake. All-nighters defeat both encoding (sleep-deprived brain) AND consolidation (no sleep).' },
    { id: 'q53', icon: '📓',
      stem: 'A student is using Cornell notes but says "they\'re not helping me retain anything." Most likely problem?',
      choices: ['Cornell is just a bad system', 'She\'s skipping the post-class processing — filling in cue questions + writing the bottom summary. Without that step, Cornell is just "notes with extra columns." The processing IS the technique.', 'Wrong color pen', 'Wrong notebook'],
      correct: 1, why: 'The active ingredient in Cornell isn\'t the column structure — it\'s the post-class summary + cue-column processing (which is essentially built-in retrieval practice). Skip those + you\'ve created a record without the learning.' },
    { id: 'q54', icon: '🌐',
      stem: 'A 6th-grade EL learner has been in the US 18 months. Strong in hands-on + visual science but bombs written tests. Best UDL-aligned intervention?',
      choices: ['Move him to a lower grade', '"English-only at home"', 'Multiple means of expression (allow lab/oral/drawing assessments) + content-vocabulary frontloading + bilingual glossary access + maintain home-language literacy (cross-linguistic transfer supports English).', 'Wait for him to "catch up"'],
      correct: 2, why: 'Cummins\' BICS vs CALP: conversational fluency develops in ~2 yrs but academic language proficiency takes 5-7. Don\'t wait + don\'t demote. UDL multiple means of expression lets him show what he knows while building English. Home-language literacy SUPPORTS English (Cummins\' interdependence hypothesis).' },
    { id: 'q55', icon: '🧪',
      stem: 'You\'re running a Lab Simulator scenario. The student\'s teacher reports failing tests + says "she just doesn\'t care." Highest-scoring response?',
      choices: ['Tell the teacher she\'s right', 'Reframe: "Doesn\'t care" usually masks a different issue (anxiety, strategy gap, executive dysfunction, life stressor, identity threat). Diagnose carefully before accepting the label.', 'Punish the student', 'Drop her from the class'],
      correct: 1, why: 'Pathologizing student behavior as character flaw ("doesn\'t care," "lazy," "defiant") closes the door on real diagnosis. Almost every "doesn\'t care" pattern reveals an underlying barrier when investigated with care.' },
    { id: 'q56', icon: '⏱️',
      stem: 'Pychyl + others reframe procrastination as primarily an issue of:',
      choices: ['Time management', 'Emotion regulation — avoiding the negative emotion the task evokes (anxiety, boredom, doubt). The brain says "I\'ll do it when it feels less bad" but it doesn\'t.', 'Laziness', 'Bad genetics'],
      correct: 1, why: 'Procrastination is the avoidance of UNPLEASANT FEELINGS, not the management of TIME. Recognizing this changes the intervention: tolerate the emotion + start anyway (often dread fades within minutes of beginning).' },
    { id: 'q57', icon: '🎯',
      stem: 'Implementation intentions (Gollwitzer 1999) take the form:',
      choices: ['"I will try harder"', '"If [situation X], then I will do [behavior Y]" — pre-deciding the response so the moment doesn\'t require willpower', '"Maybe later"', '"I should..."'],
      correct: 1, why: '"If 4pm, then start Spanish flashcards." "If I\'m tempted to scroll, then I\'ll set a 25-min timer + start the easiest task." Specific situational triggers + pre-decided responses dramatically increase follow-through.' },
    { id: 'q58', icon: '📵',
      stem: 'You\'re studying with your phone face-down on the desk (silent). What does Ward et al. 2017 research show?',
      choices: ['Phone presence has no effect when silenced', 'Even a silent face-down phone visible on the desk reduces working-memory + fluid-intelligence test scores. Mere presence drains attention.', 'Phone helps focus', 'Only matters if it buzzes'],
      correct: 1, why: 'Ward et al. 2017 in JACR. The phone\'s mere PRESENCE — even silent + face-down + ignored — costs cognitive resources. Solution: phone in another room, not just face-down.' },
    { id: 'q59', icon: '📖',
      stem: 'The "Simple View of Reading" (Gough + Tunmer 1986) says reading comprehension equals:',
      choices: ['Decoding alone', 'Decoding × Language Comprehension. Either at zero = comprehension at zero. Both must be developed.', 'Vocabulary alone', 'Memorization'],
      correct: 1, why: 'Reading is the PRODUCT (not sum) of decoding + language comprehension. A "dyslexic profile" = strong oral language but weak decoding. A "hyperlexic" or EL profile = strong decoding but weak comprehension. Both must be addressed for the matching profile.' },
    { id: 'q60', icon: '💚',
      stem: 'A trauma-informed teacher\'s key reframe is "behavior is communication." What does this mean in practice?',
      choices: ['Behavior is meaningless', 'Disruptive behavior often signals an unmet need or dysregulated state. "What happened to you?" replaces "What\'s wrong with you?" Co-regulate before correcting.', 'Behavior should be ignored', 'Punishment works'],
      correct: 1, why: 'Trauma-informed reframe (Perry, van der Kolk, others). When a student is dysregulated, no learning or behavior change is possible until the nervous system is regulated. Calm presence + connection BEFORE correction. NOT therapy — just classroom realism.' },
    { id: 'q61', icon: '🏗️',
      stem: 'In an MTSS framework, a teacher reports that 45% of her 4th-grade class is below benchmark on the fall reading screener. What\'s the right next move?',
      choices: ['Move all 45% to Tier 2', 'Audit + strengthen Tier 1 instruction first — when MORE than ~20% are below benchmark, the issue is core instruction, not individual students. Tier-2 capacity can\'t absorb 45% of a class.', 'Refer all 45% for SpEd evaluation', 'Wait until winter screening'],
      correct: 1, why: 'A foundational MTSS rule: if more than ~20% of students are below benchmark in Tier 1, the issue is the core instruction, NOT the kids. Tier 2 should serve ~15-20%, not half the class. The fix is curriculum/coaching/scaffolding at Tier 1.' },
    { id: 'q62', icon: '✍️',
      stem: 'Bereiter + Scardamalia distinguish "knowledge-telling" from "knowledge-transforming" writing. Why does this matter?',
      choices: ['They\'re the same thing', 'Knowledge-telling is the novice "brain dump" pattern; knowledge-transforming uses the writing process to reorganize thinking. The pedagogical goal is to teach students to transform, not just tell — by teaching the writing PROCESS, not just grading the product.', 'Only fiction matters', 'Grammar is the issue'],
      correct: 1, why: 'Bereiter + Scardamalia 1987. Knowledge-telling: write what you already know — text records but doesn\'t change thinking. Knowledge-transforming: writing IS thinking — revision changes the underlying conceptual structure. Teachers who grade only the final product never see which mode the student is in.' },
    { id: 'q63', icon: '🤝',
      stem: 'Slavin\'s research on collaborative learning identifies which TWO non-negotiables for group work to actually work?',
      choices: ['Same-ability grouping + competition', 'Positive interdependence (group can\'t succeed without every member) AND individual accountability (each person is assessed individually)', 'Long meetings + lectures', 'Quiet + uniformity'],
      correct: 1, why: 'Slavin\'s decades of meta-analyses converge: without BOTH positive interdependence + individual accountability, groups devolve into free-riding (no accountability) or fake collaboration (no interdependence). Structures like Jigsaw build both in by design.' },
    { id: 'q64', icon: '🔢',
      stem: 'A 4th-grade teacher tells her class "I was never a math person either." What does the research say about this comment?',
      choices: ['It\'s harmless honesty', 'Beilock et al. 2010 — math-anxious adults transmit math anxiety to children, especially same-gender. The "I was never a math person" comment is one of the most damaging cultural scripts adults can model. Replace with "this is hard for me too — let\'s figure it out together."', 'It builds rapport', 'It improves math scores'],
      correct: 1, why: 'Math anxiety is culturally transmitted (Beilock 2010 PNAS; Maloney 2015). The "I\'m not a math person" identity is uniquely sticky in US culture — and adults with that identity pass it on. Adults: stop saying it. Replace with "let\'s work it out" — modeling productive struggle.' },
    { id: 'q65', icon: '⚖️',
      stem: 'Hiebert + Lefevre 1986 distinguish conceptual understanding from procedural fluency in mathematics. What\'s the right relationship between them?',
      choices: ['Procedural only — concepts are fluff', 'Conceptual only — procedures are rote', 'BOTH matter, integrated. Procedure-only students crash on novel problems; concept-only students can\'t reliably compute. Strong students have integrated both.', 'Neither matters'],
      correct: 2, why: 'Hiebert + Lefevre 1986. The integration is the goal. Procedure-only instruction (the old "drill + kill" model) leaves students unable to reason. Concept-only instruction leaves students unable to compute. The goal is BOTH, integrated — and that takes intentional design.' }
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
        accent: '#9333ea',    // purple-600 — WCAG 1.4.3 pass: 5.39:1 with white text (purple-500 fails 4.08:1)
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
              { id: 'zpd', icon: '🤝', label: 'ZPD + scaffolding', desc: 'Vygotsky. Gradual release. 6 scaffolding strategies.' },
              { id: 'sdt', icon: '🎯', label: 'Self-Determination Theory', desc: 'Deci + Ryan: autonomy, competence, relatedness. The most-supported motivation theory.' }
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
              { id: 'memory', icon: '🧠', label: 'Memory + active learning techniques', desc: 'Feynman, loci, mnemonic, dual coding, interleaving deep dive. 8 concrete techniques.' },
              { id: 'noteTaking', icon: '📓', label: 'Note-taking systems', desc: 'Cornell, mind-mapping, outline, sketchnoting, two-column. When to use each + universal principles.' },
              { id: 'sleep', icon: '😴', label: 'Sleep + learning', desc: 'Memory consolidation, all-nighter myth, naps, caffeine, screens. The single most under-discussed factor.' },
              { id: 'goals', icon: '🎯', label: 'Goals + procrastination', desc: 'SMART, OKRs, implementation intentions, Pomodoro deep dive, 5 procrastination reframes (emotion-regulation, not time-management).' },
              { id: 'multitask', icon: '📵', label: 'Multitasking myth + attention', desc: 'Sophie Leroy attention residue, 23-min reorientation cost, 6 hidden costs, 5 single-tasking tips.' },
              { id: 'testAnxiety', icon: '😰', label: 'Test anxiety + performance', desc: 'Yerkes-Dodson, pre/during/after-test routines, 6 calming techniques, when to seek help.' },
              { id: 'mindset', icon: '🌱', label: 'Growth mindset (brief)', desc: 'Dweck. Honest about replication. Links to Growth Mindset SEL tool.' },
              { id: 'myths', icon: '🚫', label: 'Neuromyth debunker', desc: '8 popular beliefs that research rejects.' },
              { id: 'researchLit', icon: '🔬', label: 'Research literacy', desc: 'Hierarchy of evidence, p-values, effect sizes, replication, red flags, where to find good research.' },
              { id: 'writing', icon: '✍️', label: 'Writing process pedagogy', desc: 'Bereiter+Scardamalia knowledge-telling vs knowledge-transforming, the 5 pillars, mentor texts, SRSD, 6+1 Traits.' },
              { id: 'groupWork', icon: '🤝', label: 'Group work that works', desc: 'Slavin\'s 2 non-negotiables, Jigsaw (Aronson), Numbered Heads, productive struggle in groups, when NOT to.' }
            ]
          },
          { id: 'careers', icon: '🏅', name: 'Pedagogy careers + Maine',
            desc: 'How to do this for a living.',
            modules: [
              { id: 'careers-list', icon: '🍎', label: 'Education + ed-adjacent careers', desc: '10 career paths from teacher to ed researcher.' },
              { id: 'maine-progs', icon: '🌲', label: 'Maine education programs', desc: 'USM, UMaine, UMF, UNE + cert pathway + EL Education.' }
            ]
          },
          { id: 'apply', icon: '🎯', name: 'Apply it',
            desc: 'Active practice. Use Bloom\'s + the strategies on YOUR work.',
            modules: [
              { id: 'lessonPlan', icon: '🎯', label: 'Lesson plan builder', desc: 'Topic + Bloom\'s level + grade band → matched verbs, activities, assessments.' },
              { id: 'strategyPicker', icon: '💡', label: 'Strategy picker', desc: 'Subject + time + assessment + prior knowledge → evidence-backed strategy recommendations.' },
              { id: 'lab', icon: '🧪', label: 'Hands-on lab simulator', desc: '6 graded "advise a struggling student" cases. Letter grade + per-step feedback.' }
            ]
          },
          { id: 'specialized', icon: '👩‍🏫', name: 'Specialized teaching',
            desc: 'Topics most teachers + school psychs need but rarely get formal training in.',
            modules: [
              { id: 'reading', icon: '📖', label: 'Reading + literacy science', desc: 'Simple View of Reading, 5 pillars, structured vs balanced literacy, Orton-Gillingham, the reading wars.' },
              { id: 'trauma', icon: '💚', label: 'Trauma-informed teaching', desc: 'ACEs, behavior as communication, co-regulation, window of tolerance, 6 practices, when to refer.' },
              { id: 'mtss', icon: '🏗️', label: 'MTSS / RTI + universal screening', desc: 'Tier 1/2/3 framework, 8 screening tools (DIBELS, AIMSweb, NWEA, SAEBRS), decision rules, school-psych role.' },
              { id: 'mathPed', icon: '🔢', label: 'Math anxiety + math pedagogy', desc: 'Distinct from test anxiety, conceptual vs procedural, productive struggle, number talks, Boaler mindset, identity disruption.' }
            ]
          },
          { id: 'progress', icon: '📊', name: 'Progress + reference',
            desc: 'Self-test, learning path, achievements, glossary, citations.',
            modules: [
              { id: 'path', icon: '🛤️', label: 'Recommended learning path', desc: 'New here? 4-week curated walkthrough through the modules.' },
              { id: 'glossary', icon: '📖', label: 'Glossary', desc: '50+ pedagogy + cog-sci terms with category filter.' },
              { id: 'quiz', icon: '🧪', label: 'Knowledge quiz', desc: '65 questions across the full curriculum.' },
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
          var tier = score === QUIZ.length ? 'mastery'
                     : pct >= 90 ? 'strong'
                     : pct >= 80 ? 'solid'
                     : pct >= 60 ? 'building'
                     : 'review';
          var tierColor = tier === 'mastery' ? '#fbbf24'
                          : tier === 'strong' ? T.good
                          : tier === 'solid' ? '#16a34a'
                          : tier === 'building' ? T.warn
                          : T.bad;
          var tierIcon = tier === 'mastery' ? '🏆' : tier === 'strong' ? '🎓' : tier === 'solid' ? '📘' : tier === 'building' ? '🚧' : '📚';
          var tierTitle = tier === 'mastery' ? 'Pedagogy mastery'
                          : tier === 'strong' ? 'Strong understanding'
                          : tier === 'solid' ? 'Solid baseline'
                          : tier === 'building' ? 'Building understanding'
                          : 'Worth another pass';
          var tierMsg = tier === 'mastery'
                        ? 'You can teach this content yourself. Use this confidence to design your next lesson — start with a desired difficulty + retrieval prompt.'
                        : tier === 'strong'
                          ? 'You hit the high bar. The handful you missed are usually neuromyth-related (learning styles, left/right brain) — worth a quick re-skim.'
                          : tier === 'solid'
                            ? 'Solid baseline. Re-review the modules where you missed — especially the spacing-effect or interleaving sections if those tripped you up.'
                            : tier === 'building'
                              ? 'Building real understanding. Re-read Bloom\'s, Cognitive Load, and the neuromyths sections — those carry the most miss-prone questions.'
                              : 'Worth another pass through the modules — especially Bloom\'s + Cognitive Load + the neuromyths. Practice testing yourself before retaking.';
          var rad = 38, circ = 2 * Math.PI * rad;
          var dashOff = circ - (pct / 100) * circ;
          // Per-question correctness array
          var perQ = QUIZ.map(function(q) {
            return { id: q.id, icon: q.icon, correct: answers[q.id] === q.correct, answered: answers[q.id] != null };
          });
          return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
            backBar('🧪 Quiz complete'),
            h('div', { style: { borderRadius: 14, overflow: 'hidden', border: '2px solid ' + tierColor + 'aa', background: T.card } },
              h('div', { style: { padding: 18, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', background: 'linear-gradient(135deg, ' + tierColor + '22, transparent)' } },
                // Score donut
                h('div', { style: { position: 'relative', width: 100, height: 100, flexShrink: 0 } },
                  h('svg', { viewBox: '0 0 100 100', width: 100, height: 100,
                    'aria-label': 'Score: ' + score + ' out of ' + QUIZ.length
                  },
                    h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: 'rgba(148,163,184,0.25)', strokeWidth: 9 }),
                    h('circle', { cx: 50, cy: 50, r: rad, fill: 'none', stroke: tierColor, strokeWidth: 9, strokeLinecap: 'round',
                      strokeDasharray: circ, strokeDashoffset: dashOff, transform: 'rotate(-90 50 50)' })
                  ),
                  h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                    h('div', { style: { fontSize: 22, fontWeight: 900, color: tierColor, lineHeight: 1 } }, pct + '%'),
                    h('div', { style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.muted } }, score + ' / ' + QUIZ.length)
                  )
                ),
                h('div', { style: { flex: 1, minWidth: 220 } },
                  h('div', { style: { fontSize: 30, marginBottom: 4 }, 'aria-hidden': 'true' }, tierIcon),
                  h('h3', { style: { margin: '0 0 6px', fontSize: 18, color: tierColor, fontWeight: 900, lineHeight: 1.15 } }, tierTitle),
                  h('p', { style: { margin: 0, color: T.text, fontSize: 13, lineHeight: 1.55 } }, tierMsg)
                )
              ),
              // Per-question result strip
              h('div', { style: { padding: '0 18px 8px' } },
                h('div', { style: { fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.muted, marginBottom: 4 } }, 'Your answers'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
                  perQ.map(function(q, qi) {
                    return h('div', { key: qi,
                      title: 'Q' + (qi + 1) + (q.correct ? ' correct ✓' : q.answered ? ' incorrect ✗' : ' skipped'),
                      style: {
                        width: 14, height: 14, borderRadius: 3,
                        background: q.correct ? T.good : T.bad,
                        border: '1.5px solid ' + (q.correct ? '#15803d' : '#7f1d1d'),
                        boxShadow: '0 1px 1px rgba(0,0,0,0.3)'
                      },
                      'aria-label': 'Q' + (qi + 1) + (q.correct ? ' correct' : ' incorrect')
                    });
                  })
                )
              ),
              pct >= 80 && h('div', { style: { padding: '8px 18px', fontSize: 13, color: T.good, fontWeight: 700, borderTop: '1px solid ' + T.border } }, '🏅 Badge earned: Quiz Passed'),
              h('div', { style: { padding: '12px 18px', borderTop: '1px solid ' + T.border } },
                h('button', { 'data-ll-focusable': true,
                  onClick: function() { upd('quizIdx', 0); upd('quizAnswers', {}); },
                  style: btnPrimary() }, '🔄 Retake quiz')
              )
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
            { id: 'zpd-scaffolder', icon: '🤝', name: 'ZPD Scaffolder', how: 'Tap any scaffolding strategy.' },
            { id: 'sdt-explorer', icon: '🎯', name: 'SDT Explorer', how: 'Tap any of the 3 basic psychological needs.' }
          ] },
          { group: '🎯 UDL', items: [
            { id: 'udl-explorer', icon: '🎯', name: 'UDL Explorer', how: 'Tap any UDL principle.' }
          ] },
          { group: '📚 Strategies', items: [
            { id: 'spaced-rep-aware', icon: '⏰', name: 'Spaced Rep Aware', how: 'Mark the spaced-repetition module complete.' },
            { id: 'study-strategist', icon: '📝', name: 'Study Strategist', how: 'Tap any study strategy in the Dunlosky table.' },
            { id: 'memory-explorer', icon: '🧠', name: 'Memory Explorer', how: 'Tap any technique in the Memory + Active Learning module.' },
            { id: 'note-explorer', icon: '📓', name: 'Note-Taking Explorer', how: 'Tap any note-taking system.' },
            { id: 'sleep-aware', icon: '😴', name: 'Sleep Aware', how: 'Tap any sleep-for-learning principle.' },
            { id: 'goal-frameworks', icon: '🎯', name: 'Goal Framework Explorer', how: 'Tap any of the 4 goal-setting frameworks.' },
            { id: 'mt-aware', icon: '📵', name: 'Multitasking Aware', how: 'Tap any multitasking cost source.' },
            { id: 'anxiety-toolkit', icon: '😰', name: 'Anxiety Toolkit', how: 'Tap any calming technique in the Test Anxiety module.' },
            { id: 'myth-buster', icon: '🚫', name: 'Myth Buster', how: 'Tap any neuromyth in the debunker.' },
            { id: 'research-literate', icon: '🔬', name: 'Research Literate', how: 'Tap any stats term in Research Literacy.' },
            { id: 'writing-explorer', icon: '✍️', name: 'Writing Process Explorer', how: 'Tap any of the 5 writing-process pillars.' },
            { id: 'group-strategist', icon: '🤝', name: 'Group Work Strategist', how: 'Tap any of the 6 cooperative-learning structures.' }
          ] },
          { group: '👩‍🏫 Specialized teaching', items: [
            { id: 'reading-explorer', icon: '📖', name: 'Reading Science Explorer', how: 'Tap any of the 5 Pillars of Reading.' },
            { id: 'trauma-informed', icon: '💚', name: 'Trauma-Informed Aware', how: 'Tap any of the 6 trauma-informed practices.' },
            { id: 'mtss-explorer', icon: '🏗️', name: 'MTSS Explorer', how: 'Tap any of the 8 universal-screening tools in the MTSS module.' },
            { id: 'math-pedagogy', icon: '🔢', name: 'Math Pedagogy Explorer', how: 'Tap any of the 6 math pedagogy moves (number talks, productive struggle, etc.).' }
          ] },
          { group: '🏅 Career', items: [
            { id: 'career-explorer', icon: '🍎', name: 'Career Explorer', how: 'Tap any education career path.' }
          ] },
          { group: '🎯 Apply it', items: [
            { id: 'lesson-builder', icon: '🎯', name: 'Lesson Builder', how: 'Pick a Bloom\'s level in the Lesson Plan Builder.' },
            { id: 'strategy-picked', icon: '💡', name: 'Strategy Picker User', how: 'Fill in all 4 fields in the Strategy Picker.' },
            { id: 'lab-master', icon: '🏆', name: 'Lab Master', how: 'Complete all 6 lab simulator cases with 70%+ scores.' }
          ] },
          { group: '🧪 Self-test + path', items: [
            { id: 'quiz-passed', icon: '🧪', name: 'Quiz Passed', how: 'Score 80%+ on the 65-question knowledge quiz.' },
            { id: 'path-graduate', icon: '🛤️', name: 'Learning Path Graduate', how: 'Mark all 14 Recommended Learning Path modules as visited.' },
            { id: 'glossary-user', icon: '📖', name: 'Glossary User', how: 'Search the glossary at least once.' }
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
      // LESSON PLAN BUILDER view
      // ─────────────────────────────────────────
      function renderLessonPlan() {
        var topic = d.lpTopic || '';
        var grade = d.lpGrade || 'middle';
        var pickedLevel = d.lpLevel || null;
        var levelData = pickedLevel ? BLOOMS_LEVELS.find(function(l) { return l.id === pickedLevel; }) : null;
        var activityData = pickedLevel ? BLOOMS_ACTIVITIES[pickedLevel] : null;

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🎯 Lesson plan builder'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🎯 Bloom\'s-aligned lesson plan builder'),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'Enter your topic + pick a Bloom\'s level + grade band. Get matched verbs, activity ideas, and assessment formats. Use the output as a draft of a learning objective + activity plan.'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: T.text } },
                h('span', { style: { fontWeight: 700 } }, '📚 Topic / content'),
                h('input', { type: 'text', 'data-ll-focusable': true,
                  'aria-label': 'Topic or content for the lesson',
                  placeholder: 'e.g. photosynthesis, fractions, the French Revolution',
                  value: topic,
                  onChange: function(e) { upd('lpTopic', e.target.value); },
                  style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } })
              ),
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: T.text } },
                h('span', { style: { fontWeight: 700 } }, '🎓 Grade band'),
                h('select', { 'data-ll-focusable': true,
                  'aria-label': 'Grade band for the lesson',
                  value: grade,
                  onChange: function(e) { upd('lpGrade', e.target.value); },
                  style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } },
                  h('option', { value: 'elementary' }, 'Elementary (K-5)'),
                  h('option', { value: 'middle' }, 'Middle (6-8)'),
                  h('option', { value: 'highSchool' }, 'High School (9-12)'),
                  h('option', { value: 'college' }, 'College / Adult')
                )
              )
            )
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '📊 Pick your target Bloom\'s level'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6 } },
              BLOOMS_LEVELS.map(function(l) {
                var sel = pickedLevel === l.id;
                return h('button', { key: l.id, 'data-ll-focusable': true,
                  'aria-label': 'Target ' + l.name,
                  'aria-pressed': sel ? 'true' : 'false',
                  onClick: function() { upd('lpLevel', sel ? null : l.id); awardBadge('lesson-builder', 'Lesson Builder'); },
                  style: Object.assign({}, btnSecondary(), {
                    background: sel ? T.accent : T.cardAlt,
                    color: sel ? '#fff' : T.text,
                    fontWeight: sel ? 800 : 600,
                    display: 'flex', flexDirection: 'column', gap: 2,
                    padding: 8, alignItems: 'center'
                  }) },
                  h('div', { style: { fontSize: 18 } }, l.icon),
                  h('div', { style: { fontSize: 10, opacity: 0.85 } }, 'L' + l.n),
                  h('strong', { style: { fontSize: 11 } }, l.name)
                );
              })
            )
          ),
          pickedLevel && levelData && activityData && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent } },
            h('h4', { style: { margin: '0 0 10px', fontSize: 16, color: T.accentHi } },
              levelData.icon + ' Lesson plan draft for: ',
              h('em', null, topic || '[your topic]')),
            h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 10, fontSize: 13, color: T.text, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '📝 Suggested learning objective: '),
              'Students will ',
              h('strong', { style: { color: T.accent } }, levelData.verbs[0].toUpperCase()),
              ' ' + (topic ? topic : '[topic]') + (pickedLevel === 'apply' || pickedLevel === 'analyze' || pickedLevel === 'evaluate' ? ' using [criteria/method].' : '.')),
            h('h5', { style: { margin: '8px 0 4px', fontSize: 12, color: T.accentHi } }, '✏️ Verbs you can use'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              levelData.verbs.map(function(v) {
                return h('span', { key: v, style: { padding: '3px 8px', borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 11, color: T.text, fontFamily: 'monospace' } }, v);
              })
            ),
            h('h5', { style: { margin: '8px 0 4px', fontSize: 12, color: T.accentHi } }, '🎬 Activity ideas at this level'),
            h('ul', { style: { margin: '0 0 10px', paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.7 } },
              activityData.activities.map(function(a, i) { return h('li', { key: i }, a); })
            ),
            h('h5', { style: { margin: '8px 0 4px', fontSize: 12, color: T.accentHi } }, '📋 Assessment formats that match'),
            h('ul', { style: { margin: '0 0 10px', paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.7 } },
              activityData.assessments.map(function(a, i) { return h('li', { key: i }, a); })
            ),
            h('h5', { style: { margin: '8px 0 4px', fontSize: 12, color: T.accentHi } }, '🎯 Assessment verbs (the verb in the test prompt should match the objective verb)'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              activityData.assessmentVerbs.map(function(v) {
                return h('span', { key: v, style: { padding: '3px 8px', borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.good, fontSize: 11, color: T.good, fontFamily: 'monospace' } }, v);
              })
            ),
            h('div', { style: { padding: 10, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + T.warn, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.warn } }, '🎓 Grade-band note: '), GRADE_BAND_GUIDANCE[grade])
          ),
          !pickedLevel && h('div', { style: { padding: 16, textAlign: 'center', color: T.dim, fontSize: 13 } },
            'Pick a Bloom\'s level above to generate a lesson-plan draft.'),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // STRATEGY PICKER view
      // ─────────────────────────────────────────
      function renderStrategyPicker() {
        var subj = d.spSubject || '';
        var time = d.spTime || '';
        var assessType = d.spAssess || '';
        var prior = d.spPrior || '';
        var hasInputs = subj && time && assessType && prior;

        function recommend() {
          if (!hasInputs) return null;
          var strategies = STRATEGY_RECS.base.slice();
          if (STRATEGY_RECS.byAssessment[assessType]) {
            STRATEGY_RECS.byAssessment[assessType].forEach(function(s) { if (strategies.indexOf(s) === -1) strategies.push(s); });
          }
          if (STRATEGY_RECS.bySubject[subj]) {
            STRATEGY_RECS.bySubject[subj].forEach(function(s) { if (strategies.indexOf(s) === -1) strategies.push(s); });
          }
          if (STRATEGY_RECS.byTime[time]) {
            STRATEGY_RECS.byTime[time].forEach(function(s) { if (strategies.indexOf(s) === -1) strategies.push(s); });
          }
          if (STRATEGY_RECS.byPriorKnowledge[prior]) {
            STRATEGY_RECS.byPriorKnowledge[prior].forEach(function(s) { if (strategies.indexOf(s) === -1) strategies.push(s); });
          }
          return strategies;
        }
        var recs = recommend();
        if (recs) awardBadge('strategy-picked', 'Strategy Picker User');

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('💡 Strategy picker'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '💡 Get evidence-backed strategy recommendations'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'Tell the picker about a real assignment or test you have coming up. It will return strategies matched to your situation, drawn from Dunlosky 2013 + supporting research.')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 10px', fontSize: 14, color: T.accentHi } }, '📋 Tell us about your assignment'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: T.text } },
                h('span', { style: { fontWeight: 700 } }, '📚 Subject'),
                h('select', { 'data-ll-focusable': true, 'aria-label': 'Subject', value: subj,
                  onChange: function(e) { upd('spSubject', e.target.value); },
                  style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } },
                  h('option', { value: '' }, '— pick one —'),
                  h('option', { value: 'math' }, 'Math'),
                  h('option', { value: 'language-arts' }, 'Language arts / English'),
                  h('option', { value: 'science' }, 'Science'),
                  h('option', { value: 'social-studies' }, 'Social studies / history'),
                  h('option', { value: 'foreign-language' }, 'Foreign language'),
                  h('option', { value: 'arts' }, 'Arts'),
                  h('option', { value: 'standardized-test' }, 'Standardized test (SAT, ACT, AP)')
                )
              ),
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: T.text } },
                h('span', { style: { fontWeight: 700 } }, '⏰ Time available'),
                h('select', { 'data-ll-focusable': true, 'aria-label': 'Time available', value: time,
                  onChange: function(e) { upd('spTime', e.target.value); },
                  style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } },
                  h('option', { value: '' }, '— pick one —'),
                  h('option', { value: 'cramming-tonight' }, 'Test is tomorrow (cramming-tonight)'),
                  h('option', { value: 'few-days' }, 'A few days'),
                  h('option', { value: '1-2-weeks' }, '1-2 weeks'),
                  h('option', { value: 'month-plus' }, 'A month or more')
                )
              ),
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: T.text } },
                h('span', { style: { fontWeight: 700 } }, '📋 Assessment type'),
                h('select', { 'data-ll-focusable': true, 'aria-label': 'Assessment type', value: assessType,
                  onChange: function(e) { upd('spAssess', e.target.value); },
                  style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } },
                  h('option', { value: '' }, '— pick one —'),
                  h('option', { value: 'multiple-choice' }, 'Multiple choice'),
                  h('option', { value: 'short-answer' }, 'Short answer'),
                  h('option', { value: 'essay' }, 'Essay'),
                  h('option', { value: 'performance-task' }, 'Performance task / demonstration'),
                  h('option', { value: 'project' }, 'Project / paper')
                )
              ),
              h('label', { style: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: T.text } },
                h('span', { style: { fontWeight: 700 } }, '🧠 Prior knowledge'),
                h('select', { 'data-ll-focusable': true, 'aria-label': 'Prior knowledge of topic', value: prior,
                  onChange: function(e) { upd('spPrior', e.target.value); },
                  style: { padding: 8, borderRadius: 6, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13 } },
                  h('option', { value: '' }, '— pick one —'),
                  h('option', { value: 'novice' }, 'Novice (just starting)'),
                  h('option', { value: 'some-familiarity' }, 'Some familiarity'),
                  h('option', { value: 'strong' }, 'Strong (review/refine)')
                )
              )
            )
          ),
          recs && (function() {
            // Group strategies by Dunlosky 2013 utility tier (high/moderate/low),
            // with caveats split out for visual prominence.
            var tierIndex = {};
            STUDY_STRATEGIES.forEach(function(s) { tierIndex[s.id] = s.utility; });
            var groups = { high: [], moderate: [], other: [], caveat: [] };
            recs.forEach(function(sId) {
              if (sId.indexOf('CAVEAT') >= 0) { groups.caveat.push(sId); return; }
              var t = tierIndex[sId];
              if (t === 'high')          groups.high.push(sId);
              else if (t === 'moderate') groups.moderate.push(sId);
              else                       groups.other.push(sId);
            });
            var groupMeta = [
              { key: 'high',     icon: '🟢', title: 'HIGH UTILITY', desc: 'Strongest evidence (Dunlosky 2013) — prioritize these', color: T.good },
              { key: 'moderate', icon: '🟡', title: 'MODERATE UTILITY', desc: 'Useful with caveats — works in specific conditions', color: T.warn },
              { key: 'other',    icon: '🟦', title: 'STRUCTURE / SUPPORTING', desc: 'Scaffolding patterns that pair with the high-utility ones', color: T.accent }
            ];
            // Time-blocked plan keyed off the student's `time` input
            var planByTime = {
              'cramming-tonight': [
                { mins: 30, label: 'Free recall (closed-book; write what you remember)', strategy: 'free-recall' },
                { mins: 15, label: 'Compare against notes; identify gaps', strategy: 'self-explanation' },
                { mins: 15, label: 'Practice quiz on weak spots', strategy: 'practice-testing' },
                { mins: 0,  label: 'Sleep — consolidates the retrieval you just did', strategy: 'sleep-between-sessions' }
              ],
              'few-days': [
                { mins: 25, label: 'Day 1: read + summarize from memory', strategy: 'free-recall' },
                { mins: 25, label: 'Day 2: retrieval-practice quiz', strategy: 'practice-testing' },
                { mins: 20, label: 'Day 3: mixed problem set (interleaved)', strategy: 'interleaving' },
                { mins: 15, label: 'Day 4: explain to a friend', strategy: 'self-explanation' }
              ],
              '1-2-weeks': [
                { mins: 30, label: 'Week 1, day 1: SQ3R initial pass', strategy: 'active-reading-SQ3R' },
                { mins: 25, label: 'Week 1, day 3: free recall + quiz', strategy: 'practice-testing' },
                { mins: 25, label: 'Week 1, day 6: interleaved problems', strategy: 'interleaving' },
                { mins: 25, label: 'Week 2, day 2: spaced retrieval', strategy: 'spaced-retrieval' },
                { mins: 20, label: 'Week 2, day 5: mock test under conditions', strategy: 'mixed-problem-sets' }
              ],
              'month-plus': [
                { mins: 20, label: 'Set up Anki/Quizlet deck (one-time)', strategy: 'spaced-repetition-app' },
                { mins: 15, label: 'Daily — 5-15 min spaced flashcards', strategy: 'spaced-repetition-flashcards' },
                { mins: 30, label: 'Weekly — free recall + cumulative review', strategy: 'periodic-cumulative-review' },
                { mins: 30, label: 'Bi-weekly — mock test under conditions', strategy: 'mixed-problem-sets' },
                { mins: 20, label: 'Final week — deliberate practice on weak spots', strategy: 'deliberate-practice' }
              ]
            };
            var plan = planByTime[time] || planByTime['few-days'];
            var totalMins = plan.reduce(function(a, b) { return a + b.mins; }, 0);
            return h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent } },
              h('h4', { style: { margin: '0 0 10px', fontSize: 15, color: T.accentHi } }, '🎯 Recommended strategies for your situation'),
              groupMeta.map(function(g) {
                var ids = groups[g.key];
                if (!ids.length) return null;
                return h('div', { key: g.key, style: { marginBottom: 12 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 11 } }, g.icon),
                    h('span', { style: { fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: g.color } }, g.title),
                    h('span', { style: { fontSize: 10, color: T.muted, fontStyle: 'italic' } }, '· ' + g.desc)
                  ),
                  h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                    ids.map(function(sId) {
                      var detail = STRATEGY_DETAILS[sId];
                      if (!detail) return null;
                      var stratFull = STUDY_STRATEGIES.find(function(s) { return s.id === sId; });
                      return h('div', { key: sId, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + g.color + '88' } },
                        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4, flexWrap: 'wrap' } },
                          h('strong', { style: { fontSize: 13, color: T.accentHi } }, '→ ' + detail.name),
                          stratFull && stratFull.research && h('span', { style: { fontSize: 10, color: T.dim, fontStyle: 'italic' } }, '· ' + stratFull.research)
                        ),
                        h('div', { style: { fontSize: 12, color: T.text, lineHeight: 1.55 } }, detail.what),
                        stratFull && stratFull.whyWorks && h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5, marginTop: 4, paddingLeft: 8, borderLeft: '2px solid ' + g.color + '55' } },
                          h('strong', null, 'Why it works: '), stratFull.whyWorks)
                      );
                    })
                  )
                );
              }),
              groups.caveat.length > 0 && h('div', { style: { marginBottom: 12 } },
                h('div', { style: { fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: T.warn, marginBottom: 6 } }, '⚠️ WATCH OUT'),
                groups.caveat.map(function(sId) {
                  var detail = STRATEGY_DETAILS[sId];
                  if (!detail) return null;
                  return h('div', { key: sId, style: { padding: 10, borderRadius: 8, background: '#7c2d12', border: '1px solid ' + T.warn } },
                    h('strong', { style: { fontSize: 13, color: '#fed7aa', display: 'block', marginBottom: 4 } }, '⚠️ ' + detail.name),
                    h('div', { style: { fontSize: 12, color: '#fed7aa', lineHeight: 1.55 } }, detail.what)
                  );
                })
              ),
              h('div', { style: { marginTop: 14, padding: 12, borderRadius: 8, background: 'linear-gradient(135deg, ' + T.accent + '22, ' + T.cardAlt + ')', border: '2px solid ' + T.accent } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, '🗓️'),
                  h('strong', { style: { fontSize: 14, color: T.accentHi } }, 'Your time-blocked study session'),
                  h('span', { style: { fontSize: 11, color: T.muted, fontStyle: 'italic' } }, '· ' + totalMins + ' min total, scoped to your time available')
                ),
                h('ol', { style: { margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 } },
                  plan.map(function(step, i) {
                    var stratDetail = STRATEGY_DETAILS[step.strategy];
                    return h('li', { key: i, style: { padding: 8, borderRadius: 6, background: T.bg, border: '1px solid ' + T.border, display: 'flex', alignItems: 'flex-start', gap: 10 } },
                      h('span', { 'aria-hidden': 'true', style: { flexShrink: 0, width: 26, height: 26, borderRadius: '50%', background: T.accent, color: T.bg, fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, String(i + 1)),
                      h('div', { style: { flex: 1, minWidth: 0 } },
                        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' } },
                          h('strong', { style: { fontSize: 12, color: T.text } }, step.label),
                          step.mins > 0 && h('span', { style: { fontSize: 10, fontFamily: 'monospace', color: T.accentHi, fontWeight: 800 } }, step.mins + 'min')
                        ),
                        stratDetail && h('div', { style: { fontSize: 10, color: T.muted, marginTop: 2, fontStyle: 'italic' } }, '→ ' + stratDetail.name)
                      )
                    );
                  })
                )
              ),
              h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, '🎯 Action: '),
                'Use the time-blocked plan above on THIS assignment THIS WEEK. The first time always feels awkward — push through. Notice the difference vs your default approach. That\'s the proof.')
            );
          })(),
          !recs && h('div', { style: { padding: 16, textAlign: 'center', color: T.dim, fontSize: 13 } },
            'Fill in all 4 fields above to get strategy recommendations.'),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // LEARNING PATH view
      // ─────────────────────────────────────────
      function renderPath() {
        var done = d.pathDone || {};
        var totalMods = LEARNING_PATH.reduce(function(acc, w) { return acc + w.modules.length; }, 0);
        var doneCount = Object.keys(done).filter(function(k) { return done[k]; }).length;
        var pct = totalMods > 0 ? Math.round((doneCount / totalMods) * 100) : 0;
        if (doneCount === totalMods && totalMods > 0) awardBadge('path-graduate', 'Learning Path Graduate');

        var MOD_LABELS = {
          bloom: 'Bloom\'s Taxonomy', cogload: 'Cognitive Load', metacog: 'Metacognition', zpd: 'ZPD + scaffolding',
          udlPrinciples: 'UDL framework', spaced: 'Spaced repetition + retrieval', study: 'Study strategies',
          memory: 'Memory + active learning', mindset: 'Growth mindset', myths: 'Neuromyth debunker',
          lessonPlan: 'Lesson plan builder', strategyPicker: 'Strategy picker',
          'careers-list': 'Education careers', 'maine-progs': 'Maine programs'
        };

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🛤️ Recommended learning path'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🛤️ A 4-week curated walkthrough'),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'New here? This is the most valuable 4 weeks you can spend in this tool. Each week: theme + 2-6 target modules + measurable outcome. ',
              h('strong', { style: { color: T.accentHi } }, 'Progress: '), doneCount + ' / ' + totalMods + ' (' + pct + '%)')
          ),
          LEARNING_PATH.map(function(w) {
            var weekDoneCount = w.modules.filter(function(m) { return done['w' + w.week + '-' + m.id]; }).length;
            return h('div', { key: w.week, style: { marginBottom: 14, padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + (weekDoneCount === w.modules.length ? T.good : T.accent) } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                h('span', { style: { fontSize: 28 } }, w.icon),
                h('div', { style: { flex: 1 } },
                  h('h4', { style: { margin: 0, fontSize: 16, color: T.accentHi } }, w.title),
                  h('div', { style: { fontSize: 11, color: T.muted, marginTop: 2 } }, weekDoneCount + ' / ' + w.modules.length + ' modules touched')
                ),
                weekDoneCount === w.modules.length && h('span', { style: { fontSize: 22, color: T.good } }, '✓')
              ),
              h('p', { style: { margin: '0 0 10px', fontSize: 13, color: T.text, lineHeight: 1.55, fontStyle: 'italic' } }, w.theme),
              h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 } },
                w.modules.map(function(m, i) {
                  var key = 'w' + w.week + '-' + m.id;
                  var isDone = !!done[key];
                  var label = MOD_LABELS[m.id] || m.id;
                  return h('button', { key: key, role: 'listitem', 'data-ll-focusable': true,
                    'aria-label': label + (isDone ? ' (done)' : ''),
                    onClick: function() {
                      var nv = Object.assign({}, done); nv[key] = !nv[key];
                      upd('pathDone', nv);
                    },
                    style: { textAlign: 'left', padding: 10, borderRadius: 8, background: isDone ? '#064e3b' : T.cardAlt, border: '1px solid ' + (isDone ? T.good : T.border), color: T.text, cursor: 'pointer' } },
                    h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 } },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 14, color: isDone ? T.good : T.dim, marginTop: 2 } }, isDone ? '☑' : '☐'),
                      h('strong', { style: { fontSize: 13, color: isDone ? '#d1fae5' : T.accentHi, flex: 1 } }, '→ ' + label)
                    ),
                    h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5, marginLeft: 22 } },
                      h('strong', { style: { color: T.dim } }, 'Why: '), m.why),
                    h('div', { style: { marginTop: 6, marginLeft: 22 } },
                      h('a', { href: '#', onClick: function(e) { e.preventDefault(); e.stopPropagation(); setView(m.id); },
                        style: { fontSize: 11, color: T.link, textDecoration: 'underline' } },
                        '🔗 Open ' + label + ' →'))
                  );
                })
              ),
              h('div', { style: { padding: 10, borderRadius: 6, background: T.cardAlt, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, '🎯 Outcome by end of week ' + w.week + ': '), w.outcome)
            );
          }),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // GLOSSARY view
      // ─────────────────────────────────────────
      function renderGlossary() {
        var query = (d.glQuery || '').toLowerCase();
        var tagFilter = d.glTag || 'all';
        var tags = ['all', 'curriculum', 'cogsci', 'metacog', 'udl', 'vygotsky', 'strategy', 'motivation', 'assessment', 'sped', 'el'];
        var filtered = GLOSSARY.filter(function(g) {
          if (tagFilter !== 'all' && g.tag !== tagFilter) return false;
          if (!query) return true;
          return g.term.toLowerCase().indexOf(query) >= 0 || g.def.toLowerCase().indexOf(query) >= 0;
        });
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📖 Glossary'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '📖 50+ pedagogy + cognitive-science terms'),
            h('p', { style: { margin: '0 0 10px', color: T.muted, fontSize: 12, lineHeight: 1.5 } },
              'Reference glossary for the vocabulary used across this tool + most education + cognitive-science writing. Filter by category or search.'),
            h('input', { type: 'search', 'data-ll-focusable': true,
              'aria-label': 'Search glossary terms',
              placeholder: 'Search terms or definitions...',
              value: query,
              onChange: function(e) { upd('glQuery', e.target.value); awardBadge('glossary-user', 'Glossary User'); },
              style: { width: '100%', padding: 10, borderRadius: 8, background: T.bg, color: T.text, border: '1px solid ' + T.border, fontSize: 13, marginBottom: 10, boxSizing: 'border-box' } }),
            h('div', { role: 'tablist', 'aria-label': 'Filter by category', style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              tags.map(function(t) {
                var active = tagFilter === t;
                return h('button', { key: t, 'data-ll-focusable': true, role: 'tab',
                  'aria-selected': active ? 'true' : 'false',
                  onClick: function() { upd('glTag', t); },
                  style: Object.assign({}, btnGhost(), { background: active ? T.accent : 'transparent', color: active ? '#fff' : T.muted, fontWeight: active ? 800 : 600 }) },
                  t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)
                );
              })
            )
          ),
          h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 10 } }, filtered.length + ' of ' + GLOSSARY.length + ' terms'),
          h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            filtered.map(function(g) {
              return h('div', { key: g.term, role: 'listitem',
                style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
                  h('strong', { style: { fontSize: 14, color: T.accentHi } }, g.term),
                  h('span', { style: { fontSize: 10, color: T.dim, padding: '2px 6px', borderRadius: 4, background: T.bg, border: '1px solid ' + T.border, textTransform: 'uppercase' } }, g.tag)
                ),
                h('div', { style: { fontSize: 13, color: T.text, lineHeight: 1.5 } }, g.def)
              );
            }),
            filtered.length === 0 && h('div', { style: { padding: 14, textAlign: 'center', color: T.dim, fontSize: 13 } },
              'No terms match. Try clearing the search or picking "All".')
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MEMORY + ACTIVE LEARNING view
      // ─────────────────────────────────────────
      function renderMemory() {
        var picked = d.memPicked || null;
        var pickedTech = picked ? MEMORY_TECHNIQUES.find(function(t) { return t.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🧠 Memory + active learning techniques'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🧠 8 specific techniques'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'Concrete + actionable. Pick one to try this week — you don\'t need all 8. Each: what it is, how to do it, when to use, research backing, example.')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 14 } },
            MEMORY_TECHNIQUES.map(function(t) {
              var sel = picked === t.id;
              return h('button', { key: t.id, 'data-ll-focusable': true,
                'aria-label': t.name,
                'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('memPicked', sel ? null : t.id); awardBadge('memory-explorer', 'Memory Explorer'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left',
                  fontWeight: sel ? 800 : 600,
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }) },
                h('span', { style: { fontSize: 22 } }, t.icon),
                h('span', null, t.name)
              );
            })
          ),
          pickedTech && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedTech.icon + ' ' + pickedTech.name),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🔍 What it is: '), pickedTech.what),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '📋 How to do it: '), pickedTech.how),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.good } }, '🕐 When to use: '), pickedTech.when),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.text } }, '📋 Example: '), pickedTech.example),
            pickedTech.caveat && h('div', { style: { padding: 8, borderRadius: 6, background: '#7c2d12', border: '1px solid ' + T.warn, fontSize: 11, color: '#fed7aa', lineHeight: 1.55, marginBottom: 8 } },
              h('strong', null, '⚠️ Caveat: '), pickedTech.caveat),
            h('p', { style: { margin: 0, fontSize: 11, color: T.dim, fontStyle: 'italic' } },
              h('strong', null, '📚 Research: '), pickedTech.research)
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // TEST ANXIETY view
      // ─────────────────────────────────────────
      function renderTestAnxiety() {
        var taView = d.taView || 'overview';
        function tabBtn(id, label) {
          var active = taView === id;
          return h('button', { 'data-ll-focusable': true, role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            onClick: function() { upd('taView', id); },
            style: Object.assign({}, btnSecondary(), { background: active ? T.accent : T.cardAlt, color: active ? '#fff' : T.text, fontWeight: active ? 800 : 600 }) }, label);
        }

        function overview() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '😰 Yerkes-Dodson — anxiety isn\'t always bad'),
              h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55, fontWeight: 700 } }, TEST_ANXIETY_OVERVIEW.yerkesDodson),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.55, fontStyle: 'italic' } },
                'Goal: not "zero anxiety" but the optimal middle. Mild activation sharpens focus. The strategies in this module help bring HIGH anxiety down toward optimal, not eliminate all activation.')
            ),
            h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🔍 The 4 components — recognize each'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              TEST_ANXIETY_OVERVIEW.fourComponents.map(function(c) {
                return h('div', { key: c.id, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                    h('span', { style: { fontSize: 22 } }, c.icon),
                    h('strong', { style: { fontSize: 13, color: T.accentHi } }, c.name)
                  ),
                  h('p', { style: { margin: '0 0 4px', fontSize: 12, color: T.text, lineHeight: 1.55 } },
                    h('strong', null, 'What it looks like: '), c.what),
                  h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                    h('strong', { style: { color: T.warn } }, 'Cost: '), c.cost));
              })
            )
          );
        }

        function preTab() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🌅 Pre-test routine'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'The 24 hours before the test do more than the 30 minutes during. Set yourself up.')
            ),
            h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              PRE_TEST_ROUTINE.map(function(s) {
                return h('div', { key: s.n, role: 'listitem', style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4 } },
                    h('span', { 'aria-hidden': 'true', style: { background: T.accent, color: '#fff', borderRadius: 999, width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 } }, s.n),
                    h('strong', { style: { fontSize: 13, color: T.text, flex: 1 } }, s.what)
                  ),
                  h('p', { style: { margin: '0 0 4px', fontSize: 11, color: T.muted, lineHeight: 1.55, marginLeft: 36 } },
                    h('strong', { style: { color: T.dim } }, 'Why: '), s.why),
                  h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.5, marginLeft: 36 } },
                    h('strong', { style: { color: T.accentHi } }, '💡 Tip: '), s.tip));
              })
            )
          );
        }

        function duringTab() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '📝 During-test strategies'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Every minute you spend on these structural moves frees working memory for the actual test content.')
            ),
            h('div', { role: 'list', style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              DURING_TEST_STRATEGIES.map(function(s) {
                return h('div', { key: s.n, role: 'listitem', style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4 } },
                    h('span', { 'aria-hidden': 'true', style: { background: T.accent, color: '#fff', borderRadius: 999, width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 } }, s.n),
                    h('strong', { style: { fontSize: 13, color: T.text, flex: 1 } }, s.what)
                  ),
                  h('p', { style: { margin: '0 0 4px', fontSize: 11, color: T.muted, lineHeight: 1.55, marginLeft: 36 } },
                    h('strong', { style: { color: T.dim } }, 'Why: '), s.why),
                  h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.5, marginLeft: 36 } },
                    h('strong', { style: { color: T.accentHi } }, '💡 Tip: '), s.tip));
              })
            )
          );
        }

        function calmTab() {
          var picked = d.calmPicked || null;
          var pickedC = picked ? CALMING_TECHNIQUES.find(function(c) { return c.id === picked; }) : null;
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🌬️ 6 calming techniques'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Pick 1-2 to actually practice when you\'re NOT in a test, so they\'re available when you ARE in a test. Practice = autopilot when you need it.')
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 14 } },
              CALMING_TECHNIQUES.map(function(c) {
                var sel = picked === c.id;
                return h('button', { key: c.id, 'data-ll-focusable': true,
                  'aria-label': c.name, 'aria-pressed': sel ? 'true' : 'false',
                  onClick: function() { upd('calmPicked', sel ? null : c.id); awardBadge('anxiety-toolkit', 'Anxiety Toolkit'); },
                  style: Object.assign({}, btnSecondary(), {
                    background: sel ? T.accent : T.cardAlt,
                    color: sel ? '#fff' : T.text,
                    textAlign: 'left', fontWeight: sel ? 800 : 600,
                    display: 'flex', alignItems: 'flex-start', gap: 8
                  }) },
                  h('span', { style: { fontSize: 22 } }, c.icon),
                  h('span', null, c.name));
              })
            ),
            pickedC && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedC.icon + ' ' + pickedC.name),
              h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, '📋 How: '), pickedC.how),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, '🧠 Why it works: '), pickedC.whyWorks),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                h('strong', { style: { color: T.good } }, '🕐 When to use: '), pickedC.whenToUse),
              h('p', { style: { margin: 0, fontSize: 11, color: T.dim, fontStyle: 'italic' } },
                h('strong', null, '📚 Research: '), pickedC.research))
          );
        }

        function helpTab() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.good, marginBottom: 14 } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.good } }, '✅ When self-help is enough'),
              h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.7 } },
                WHEN_TO_SEEK_HELP.selfHelp.map(function(s, i) { return h('li', { key: i }, s); }))
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.warn, marginBottom: 14 } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.warn } }, '⚠️ When to reach out for support'),
              h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.7 } },
                WHEN_TO_SEEK_HELP.seekHelp.map(function(s, i) { return h('li', { key: i }, s); }))
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🤝 Who can help'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                WHEN_TO_SEEK_HELP.who.map(function(w, i) {
                  return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + T.border } },
                    h('strong', { style: { fontSize: 12, color: T.text, display: 'block', marginBottom: 2 } }, w.who),
                    h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5 } }, w.what));
                })
              )
            ),
            h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '📋 Accommodations: '), WHEN_TO_SEEK_HELP.accommodations)
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('😰 Test anxiety + performance'),
          h('div', { role: 'tablist', 'aria-label': 'Test anxiety sections',
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('overview', 'Overview'),
            tabBtn('pre', '🌅 Before'),
            tabBtn('during', '📝 During'),
            tabBtn('calm', '🌬️ Calming'),
            tabBtn('help', '🤝 Get help')),
          taView === 'overview' && overview(),
          taView === 'pre' && preTab(),
          taView === 'during' && duringTab(),
          taView === 'calm' && calmTab(),
          taView === 'help' && helpTab(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // SELF-DETERMINATION THEORY view
      // ─────────────────────────────────────────
      function renderSDT() {
        var picked = d.sdtPicked || null;
        var pickedNeed = picked ? SDT_NEEDS.find(function(n) { return n.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🎯 Self-Determination Theory'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🎯 Deci + Ryan\'s SDT'),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } }, SDT_OVERVIEW.bigIdea),
            h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🔬 Why it matters: '), SDT_OVERVIEW.why),
            h('p', { style: { margin: 0, color: T.dim, fontSize: 11, fontStyle: 'italic' } },
              h('strong', null, '📚 Source: '), SDT_OVERVIEW.research)
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🧩 The 3 basic psychological needs'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 14 } },
            SDT_NEEDS.map(function(n) {
              var sel = picked === n.id;
              return h('button', { key: n.id, 'data-ll-focusable': true,
                'aria-label': n.name, 'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('sdtPicked', sel ? null : n.id); awardBadge('sdt-explorer', 'SDT Explorer'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left', fontWeight: sel ? 800 : 600,
                  display: 'flex', flexDirection: 'column', gap: 4
                }) },
                h('div', { style: { fontSize: 26, marginBottom: 2 } }, n.icon),
                h('strong', null, n.name),
                h('div', { style: { fontSize: 11, opacity: 0.85, fontStyle: 'italic' } }, n.def.split('.')[0])
              );
            })
          ),
          pickedNeed && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 16, color: T.accentHi } }, pickedNeed.icon + ' ' + pickedNeed.name),
            h('p', { style: { margin: '0 0 10px', color: T.text, fontSize: 13, lineHeight: 1.55 } }, pickedNeed.def),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 } },
              h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.good } },
                h('strong', { style: { color: T.good, fontSize: 12 } }, '✅ When met:'),
                h('p', { style: { margin: '4px 0 0', fontSize: 11, color: T.text, lineHeight: 1.5 } }, pickedNeed.met)),
              h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.bad } },
                h('strong', { style: { color: T.bad, fontSize: 12 } }, '❌ When thwarted:'),
                h('p', { style: { margin: '4px 0 0', fontSize: 11, color: T.text, lineHeight: 1.5 } }, pickedNeed.thwarted))
            ),
            h('h5', { style: { margin: '8px 0 4px', fontSize: 12, color: T.accentHi } }, '👩‍🏫 Teacher applications'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.7 } },
              pickedNeed.teacherSupport.map(function(s, i) { return h('li', { key: i }, s); })),
            h('div', { style: { marginTop: 10, padding: 10, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + T.warn } },
              h('strong', { style: { color: T.warn, fontSize: 12 } }, '👨‍🎓 Student application: '),
              h('span', { style: { fontSize: 12, color: T.text, lineHeight: 1.5 } }, pickedNeed.studentApply))
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '📈 The motivation continuum'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
            'Motivation isn\'t binary. It runs on a continuum from amotivation → controlled → autonomous → intrinsic. The 3 needs being met pushes motivation up the continuum.'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 } },
            SDT_CONTINUUM.map(function(s) {
              var hue = s.n === 0 ? T.bad : s.n <= 2 ? T.warn : s.n <= 3 ? T.accentHi : T.good;
              return h('div', { key: s.id, style: { padding: 8, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + hue, display: 'flex', gap: 10, alignItems: 'flex-start' } },
                h('span', { 'aria-hidden': 'true', style: { background: hue, color: s.n === 0 ? '#fff' : '#000', borderRadius: 999, width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 } }, s.n),
                h('div', null,
                  h('strong', { style: { fontSize: 12, color: hue } }, s.name),
                  h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5 } }, s.desc)));
            })
          ),
          h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.accent, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.accentHi } }, '🌲 EL Education + Maine note: '), SDT_MAINE_NOTE),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // RESEARCH LITERACY view
      // ─────────────────────────────────────────
      function renderResearchLit() {
        var rView = d.rView || 'hierarchy';
        function tabBtn(id, label) {
          var active = rView === id;
          return h('button', { 'data-ll-focusable': true, role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            onClick: function() { upd('rView', id); },
            style: Object.assign({}, btnSecondary(), { background: active ? T.accent : T.cardAlt, color: active ? '#fff' : T.text, fontWeight: active ? 800 : 600 }) }, label);
        }

        function hierarchy() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🏆 Hierarchy of evidence'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Not all evidence is equal. Lowest = anecdote ("I tried it"). Highest = systematic review of multiple high-quality studies. Always weight findings by strength of evidence.')
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              RESEARCH_HIERARCHY.map(function(r) {
                var hue = r.n <= 2 ? T.bad : r.n <= 4 ? T.warn : T.good;
                return h('div', { key: r.n, style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + hue } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 } },
                    h('span', { style: { fontSize: 22 } }, r.icon),
                    h('span', { 'aria-hidden': 'true', style: { background: hue, color: '#000', borderRadius: 999, width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 } }, r.n),
                    h('strong', { style: { fontSize: 13, color: T.accentHi, flex: 1 } }, r.name),
                    h('span', { style: { fontSize: 10, color: hue, padding: '2px 6px', borderRadius: 4, background: T.bg, border: '1px solid ' + hue, textTransform: 'uppercase', fontWeight: 700 } }, r.strength)),
                  h('p', { style: { margin: '0 0 4px', fontSize: 12, color: T.text, lineHeight: 1.55 } }, r.desc),
                  h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.5, fontStyle: 'italic' } },
                    h('strong', null, 'Example: '), r.example));
              })
            )
          );
        }

        function statsTerms() {
          var picked = d.statsPicked || null;
          var pickedT = picked != null ? STATS_TERMS[picked] : null;
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '📊 Stats terms you need'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'You don\'t need to do statistics — but you do need to read them. Tap each term for definition + cutoff + caution.')
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 14 } },
              STATS_TERMS.map(function(t, i) {
                var sel = picked === i;
                return h('button', { key: i, 'data-ll-focusable': true,
                  'aria-label': t.term, 'aria-pressed': sel ? 'true' : 'false',
                  onClick: function() { upd('statsPicked', sel ? null : i); awardBadge('research-literate', 'Research Literate'); },
                  style: Object.assign({}, btnSecondary(), {
                    background: sel ? T.accent : T.cardAlt,
                    color: sel ? '#fff' : T.text,
                    textAlign: 'left', fontWeight: sel ? 800 : 600
                  }) }, t.term);
              })
            ),
            pickedT && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedT.term),
              h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, '🔍 Definition: '), pickedT.def),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, '📏 Conventional cutoff: '), pickedT.conventionalCutoff),
              h('p', { style: { margin: 0, padding: 8, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + T.warn, color: T.text, fontSize: 12, lineHeight: 1.5 } },
                h('strong', { style: { color: T.warn } }, '⚠️ Caution: '), pickedT.caution))
          );
        }

        function redFlags() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🚩 8 red flags in education research'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Critical reading skills. Most "studies show" claims circulating online have one or more of these issues.')
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              RESEARCH_RED_FLAGS.map(function(f, i) {
                return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.bad } },
                  h('strong', { style: { fontSize: 13, color: T.bad, display: 'block', marginBottom: 4 } }, '🚩 ' + f.flag),
                  h('p', { style: { margin: '0 0 4px', fontSize: 12, color: T.text, lineHeight: 1.55 } },
                    h('strong', { style: { color: T.dim } }, 'Example: '), f.example),
                  h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                    h('strong', { style: { color: T.good } }, '🎯 What to do: '), f.whatToDo));
              })
            )
          );
        }

        function findResearch() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🔍 Where to find good research'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'Free + paid databases. Most have free patron access via your school + public library.')
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              WHERE_TO_FIND_RESEARCH.map(function(r, i) {
                return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('strong', { style: { fontSize: 13, color: T.accentHi, display: 'block', marginBottom: 2 } }, r.name),
                  h('p', { style: { margin: '0 0 4px', fontSize: 11, color: T.muted, lineHeight: 1.5 } }, r.desc),
                  r.url && h('a', { href: r.url, target: '_blank', rel: 'noopener',
                    style: { fontSize: 11, color: T.link, textDecoration: 'underline' } }, '🔗 ' + r.url.replace(/^https?:\/\//, '')));
              })
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🔬 Research literacy'),
          h('div', { role: 'tablist', 'aria-label': 'Research literacy sections',
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('hierarchy', '🏆 Hierarchy of evidence'),
            tabBtn('stats', '📊 Stats terms'),
            tabBtn('flags', '🚩 Red flags'),
            tabBtn('find', '🔍 Find research')),
          rView === 'hierarchy' && hierarchy(),
          rView === 'stats' && statsTerms(),
          rView === 'flags' && redFlags(),
          rView === 'find' && findResearch(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // LAB SIMULATOR view — graded "advise a struggling student" scenarios
      // ─────────────────────────────────────────
      function renderLab() {
        var labId = d.labId || null;
        var lab = labId ? LAB_SCENARIOS.find(function(s) { return s.id === labId; }) : null;
        var stepIdx = d.labStep || 0;
        var answers = d.labAnswers || {};

        function pickLab(id) {
          updMulti({ labId: id, labStep: 0, labAnswers: {} });
          llAnnounce('Starting case: ' + LAB_SCENARIOS.find(function(s) { return s.id === id; }).name);
        }
        function reset() {
          updMulti({ labId: null, labStep: 0, labAnswers: {} });
        }
        function selectChoice(stepId, choice) {
          var nv = Object.assign({}, answers); nv[stepId] = choice.id;
          var newStep = stepIdx + 1;
          updMulti({ labAnswers: nv, labStep: newStep });
        }
        var diffStars = function(d2) { return '★'.repeat(d2) + '☆'.repeat(4 - d2); };

        if (!lab) {
          var labsCompleted = (d.labsCompleted || []).length;
          return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
            backBar('🧪 Hands-on lab simulator'),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🧪 Diagnostic + intervention thinking, scored'),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                'A teacher consults you about a struggling student. You walk through diagnostic + intervention decisions. Each choice is scored: ',
                h('strong', { style: { color: T.good } }, '+10 = best'), ', ',
                h('strong', { style: { color: T.accentHi } }, '+5 = OK'), ', ',
                h('strong', { style: { color: T.bad } }, '−5 to −10 = harmful or pathologizing'), '. Final letter grade + per-step feedback.'),
              h('div', { style: { fontSize: 12, color: T.muted } },
                h('strong', { style: { color: T.accentHi } }, 'Cases completed: '), labsCompleted + ' / ' + LAB_SCENARIOS.length)
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
              LAB_SCENARIOS.map(function(s) {
                var done = (d.labsCompleted || []).indexOf(s.id) >= 0;
                return h('button', { key: s.id, 'data-ll-focusable': true,
                  'aria-label': 'Start case: ' + s.name + (done ? ' (completed)' : ''),
                  onClick: function() { pickLab(s.id); },
                  style: { textAlign: 'left', padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + (done ? T.good : T.border), color: T.text, cursor: 'pointer' } },
                  h('div', { style: { fontSize: 28, marginBottom: 4 } }, s.icon),
                  h('div', { style: { fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 4 } }, s.name, done && ' ✓'),
                  h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 6, fontFamily: 'monospace' } }, diffStars(s.difficulty), ' · ', s.steps.length, ' decision points'),
                  h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.5 } }, s.intro.substring(0, 140) + '...')
                );
              })
            ),
            disclaimerFooter()
          );
        }

        var totalSteps = lab.steps.length;
        if (stepIdx >= totalSteps) {
          var totalScore = 0; var maxScore = 0;
          lab.steps.forEach(function(step) {
            var picked = answers[step.id];
            var maxStep = Math.max.apply(Math, step.choices.map(function(c) { return c.score; }));
            maxScore += maxStep;
            if (picked) {
              var pickedChoice = step.choices.find(function(c) { return c.id === picked; });
              if (pickedChoice) totalScore += pickedChoice.score;
            }
          });
          var pct = Math.round((totalScore / maxScore) * 100);
          var grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
          var gradeColor = pct >= 80 ? T.good : pct >= 60 ? T.warn : T.bad;
          var completed = d.labsCompleted || [];
          if (completed.indexOf(lab.id) === -1 && pct >= 70) {
            upd('labsCompleted', completed.concat([lab.id]));
            awardBadge('lab-' + lab.id, 'Solved: ' + lab.name);
            if (completed.length + 1 === LAB_SCENARIOS.length) awardBadge('lab-master', 'Lab Master (all cases)');
          }
          return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid ' + T.border } },
              h('button', { 'data-ll-focusable': true, onClick: reset, style: btnGhost() }, '← Cases'),
              h('span', { style: { fontSize: 24 } }, lab.icon),
              h('h2', { style: { margin: 0, fontSize: 17, color: T.text } }, lab.name + ' — Results')),
            h('div', { style: { padding: 18, borderRadius: 10, background: T.card, border: '2px solid ' + gradeColor, marginBottom: 14, textAlign: 'center' } },
              h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 6 } }, 'Final score'),
              h('div', { style: { fontSize: 56, fontWeight: 900, color: gradeColor, lineHeight: 1, marginBottom: 6 } }, grade),
              h('div', { style: { fontSize: 18, color: T.text, fontWeight: 700 } }, totalScore + ' / ' + maxScore + ' (' + pct + '%)'),
              h('p', { style: { margin: '10px 0 0', fontSize: 13, color: T.muted, lineHeight: 1.55 } },
                pct >= 90 ? '🏆 Master diagnostician. Diagnose first, intervention-match, dignify the student.' :
                pct >= 80 ? '🎓 Strong educator thinking. Minor optimizations.' :
                pct >= 70 ? '🚧 Apprentice level. Re-read the per-choice feedback below.' :
                pct >= 60 ? '🛠️ Hands need work. Review the foundation modules + retake.' :
                '📚 The traps are pathologizing language + jumping to intervention before diagnosis. Walk through the framework modules.')
            ),
            h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.accentHi } }, '🔍 Step-by-step feedback'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 } },
              lab.steps.map(function(step, i) {
                var picked = answers[step.id];
                var pickedChoice = step.choices.find(function(c) { return c.id === picked; });
                var bestChoice = step.choices.reduce(function(best, c) { return c.score > best.score ? c : best; }, step.choices[0]);
                var scoreColor = pickedChoice ? (pickedChoice.score >= 10 ? T.good : pickedChoice.score >= 5 ? T.accentHi : T.bad) : T.muted;
                return h('div', { key: step.id, style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + scoreColor } },
                  h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 4 } }, 'Step ' + (i + 1)),
                  h('div', { style: { fontSize: 13, color: T.text, fontWeight: 700, marginBottom: 8 } }, step.prompt),
                  pickedChoice && h('div', { style: { padding: 8, borderRadius: 6, background: T.bg, marginBottom: 6 } },
                    h('div', { style: { fontSize: 11, color: scoreColor, fontWeight: 700, marginBottom: 4 } },
                      'Your choice (' + (pickedChoice.score >= 0 ? '+' : '') + pickedChoice.score + ' pts):'),
                    h('div', { style: { fontSize: 12, color: T.text, marginBottom: 4 } }, pickedChoice.label),
                    h('div', { style: { fontSize: 11, color: T.muted, fontStyle: 'italic', lineHeight: 1.5 } }, pickedChoice.fb)),
                  pickedChoice && pickedChoice.id !== bestChoice.id && h('div', { style: { padding: 8, borderRadius: 6, background: T.bg, border: '1px solid ' + T.good } },
                    h('div', { style: { fontSize: 11, color: T.good, fontWeight: 700, marginBottom: 4 } }, 'Best choice (+' + bestChoice.score + ' pts):'),
                    h('div', { style: { fontSize: 12, color: T.text } }, bestChoice.label)));
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
              h('strong', { style: { color: T.accentHi } }, '✅ What was actually going on (with the evidence-aligned plan): '),
              h('span', { style: { color: T.text, fontSize: 13, lineHeight: 1.55 } }, lab.truth)),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('button', { 'data-ll-focusable': true, onClick: function() { pickLab(lab.id); }, style: btnSecondary() }, '🔁 Retry'),
              h('button', { 'data-ll-focusable': true, onClick: reset, style: btnPrimary() }, '🧪 Pick another')),
            disclaimerFooter()
          );
        }

        var step = lab.steps[stepIdx];
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid ' + T.border, flexWrap: 'wrap' } },
            h('button', { 'data-ll-focusable': true, onClick: reset, style: btnGhost() }, '← Quit case'),
            h('span', { style: { fontSize: 24 } }, lab.icon),
            h('h2', { style: { margin: 0, fontSize: 17, color: T.text, flex: 1 } }, lab.name),
            h('span', { style: { fontSize: 11, color: T.muted, fontFamily: 'monospace' } }, 'Step ' + (stepIdx + 1) + ' / ' + totalSteps)),
          stepIdx === 0 && h('div', { style: { padding: 12, borderRadius: 8, background: T.card, border: '1px solid ' + T.accent, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '👤 Student case'),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55, fontStyle: 'italic' } }, lab.intro),
            h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.6 } },
              h('div', null, h('strong', { style: { color: T.text } }, 'Grade: '), lab.student.grade + ' · ' + lab.student.subject),
              h('div', null, h('strong', { style: { color: T.text } }, 'Context: '), lab.student.history),
              h('div', { style: { marginTop: 6 } }, h('strong', { style: { color: T.text } }, 'Observations: ')),
              h('ul', { style: { margin: 0, paddingLeft: 18 } },
                lab.observations.map(function(o, i) { return h('li', { key: i, style: { color: T.text } }, o); })))),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 12px', fontSize: 15, color: T.text } }, step.prompt)),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            step.choices.map(function(c) {
              return h('button', { key: c.id, 'data-ll-focusable': true,
                'aria-label': c.label,
                onClick: function() { selectChoice(step.id, c); },
                style: { textAlign: 'left', padding: 12, borderRadius: 8, background: T.cardAlt, color: T.text, border: '1px solid ' + T.border, cursor: 'pointer', fontSize: 13, lineHeight: 1.5 } },
                c.label);
            })),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // NOTE-TAKING DEEP DIVE view
      // ─────────────────────────────────────────
      function renderNoteTaking() {
        var picked = d.notePicked || null;
        var pickedSys = picked ? NOTE_SYSTEMS.find(function(s) { return s.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📓 Note-taking systems'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '📓 5 note-taking systems + 4 universal principles'),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
              'The most popular study skill, often badly executed. Each system has a structure + ideal use case + research backing + the pitfall most students fall into. ',
              h('strong', { style: { color: T.accentHi } }, 'Picking a system is meaningless without commitment to active processing.'))
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🎨 5 systems'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 14 } },
            NOTE_SYSTEMS.map(function(s) {
              var sel = picked === s.id;
              return h('button', { key: s.id, 'data-ll-focusable': true,
                'aria-label': s.name, 'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('notePicked', sel ? null : s.id); awardBadge('note-explorer', 'Note-Taking Explorer'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left', fontWeight: sel ? 800 : 600,
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }) },
                h('span', { style: { fontSize: 22 } }, s.icon),
                h('span', null, s.name));
            })
          ),
          pickedSys && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedSys.icon + ' ' + pickedSys.name),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '📐 Structure: '), pickedSys.structure),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.good } }, '✅ Good for: '), pickedSys.goodFor),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.bad } }, '❌ Bad for: '), pickedSys.badFor),
            h('p', { style: { margin: '0 0 8px', color: T.dim, fontSize: 11, fontStyle: 'italic' } },
              h('strong', { style: { color: T.text } }, '📚 Research: '), pickedSys.research),
            h('div', { style: { padding: 10, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + T.warn, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
              h('strong', { style: { color: T.warn } }, '⚠️ Common pitfall: '), pickedSys.pitfall)
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🎯 4 universal principles'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            NOTE_TAKING_PRINCIPLES.map(function(p, i) {
              return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('strong', { style: { fontSize: 13, color: T.accentHi, display: 'block', marginBottom: 4 } }, '→ ' + p.rule),
                h('p', { style: { margin: '0 0 4px', fontSize: 12, color: T.text, lineHeight: 1.55 } }, p.detail),
                h('p', { style: { margin: 0, fontSize: 11, color: T.dim, lineHeight: 1.5, fontStyle: 'italic' } },
                  h('strong', null, 'Caveat: '), p.caveat));
            })
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // SLEEP + LEARNING view
      // ─────────────────────────────────────────
      function renderSleep() {
        var picked = d.sleepPicked || null;
        var pickedItem = picked ? SLEEP_FOR_LEARNING.find(function(s) { return s.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('😴 Sleep + learning'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '😴 The single most under-discussed factor in academic performance'),
            h('p', { style: { margin: 0, color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, 'Memory consolidation happens in sleep. '),
              'During Stage 2 (sleep spindles) + REM, the brain replays + transfers info from hippocampus to cortex — that\'s when learning becomes durable. Sleep AFTER learning produces 30-50% better retention vs equivalent waking time (Stickgold 2005).')
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.warn, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.warn } }, '⚠️ Sleep deprivation costs'),
            h('p', { style: { margin: '0 0 6px', color: T.text, fontSize: 13, lineHeight: 1.55 } }, SLEEP_FACTS.deprivation),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.55, fontStyle: 'italic' } },
              h('strong', { style: { color: T.text } }, 'Adolescent note: '), SLEEP_FACTS.teenagers)
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🎯 6 sleep-for-learning principles'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 14 } },
            SLEEP_FOR_LEARNING.map(function(s) {
              var sel = picked === s.id;
              return h('button', { key: s.id, 'data-ll-focusable': true,
                'aria-label': s.name, 'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('sleepPicked', sel ? null : s.id); awardBadge('sleep-aware', 'Sleep Aware'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left', fontWeight: sel ? 800 : 600,
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }) },
                h('span', { style: { fontSize: 22 } }, s.icon),
                h('span', null, s.name));
            })
          ),
          pickedItem && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedItem.icon + ' ' + pickedItem.name),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🔍 What: '), pickedItem.what),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.good } }, '🎯 Practical: '), pickedItem.practical),
            h('p', { style: { margin: 0, fontSize: 11, color: T.dim, fontStyle: 'italic' } },
              h('strong', null, '📚 Research: '), pickedItem.research)
          ),
          h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('h5', { style: { margin: '0 0 6px', fontSize: 13, color: T.accentHi } }, '🛏️ Sleep facts at a glance'),
            h('div', { style: { marginBottom: 6 } }, h('strong', { style: { color: T.text } }, 'Consolidation: '), SLEEP_FACTS.consolidation),
            h('div', { style: { marginBottom: 6 } }, h('strong', { style: { color: T.text } }, 'Adult need: '), SLEEP_FACTS.adults),
            h('div', { style: { marginBottom: 6 } }, h('strong', { style: { color: T.text } }, 'Naps: '), SLEEP_FACTS.naps),
            h('div', null, h('strong', { style: { color: T.text } }, 'Caffeine: '), SLEEP_FACTS.caffeine)
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // GOAL SETTING + PROCRASTINATION view
      // ─────────────────────────────────────────
      function renderGoals() {
        var gView = d.gView || 'frameworks';
        function tabBtn(id, label) {
          var active = gView === id;
          return h('button', { 'data-ll-focusable': true, role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            onClick: function() { upd('gView', id); },
            style: Object.assign({}, btnSecondary(), { background: active ? T.accent : T.cardAlt, color: active ? '#fff' : T.text, fontWeight: active ? 800 : 600 }) }, label);
        }

        function frameworksTab() {
          var picked = d.gFwPicked || null;
          var pickedFw = picked ? GOAL_FRAMEWORKS.find(function(f) { return f.id === picked; }) : null;
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🎯 4 goal-setting frameworks'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                'No single framework is best. Match to the situation: SMART for discrete targets, OKRs for stretch quarters, implementation intentions for habits, 2-min rule for momentum.')
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 14 } },
              GOAL_FRAMEWORKS.map(function(f) {
                var sel = picked === f.id;
                return h('button', { key: f.id, 'data-ll-focusable': true,
                  'aria-label': f.name, 'aria-pressed': sel ? 'true' : 'false',
                  onClick: function() { upd('gFwPicked', sel ? null : f.id); awardBadge('goal-frameworks', 'Goal Framework Explorer'); },
                  style: Object.assign({}, btnSecondary(), {
                    background: sel ? T.accent : T.cardAlt,
                    color: sel ? '#fff' : T.text,
                    textAlign: 'left', fontWeight: sel ? 800 : 600,
                    display: 'flex', alignItems: 'flex-start', gap: 8
                  }) },
                  h('span', { style: { fontSize: 22 } }, f.icon),
                  h('span', null, f.name));
              })
            ),
            pickedFw && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedFw.icon + ' ' + pickedFw.name),
              h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, '🔍 What it is: '), pickedFw.what),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                h('strong', { style: { color: T.good } }, '✅ Good for: '), pickedFw.goodFor),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                h('strong', { style: { color: T.bad } }, '❌ Bad for: '), pickedFw.badFor),
              h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 12, lineHeight: 1.55, padding: 8, borderRadius: 6, background: T.cardAlt } },
                h('strong', { style: { color: T.accentHi } }, '📋 Example: '), pickedFw.example),
              h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                h('strong', { style: { color: T.warn } }, '⚠️ Pitfall: '), pickedFw.pitfall))
          );
        }

        function pomodoroTab() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🍅 Pomodoro deep dive'),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55, fontStyle: 'italic' } },
                h('strong', { style: { color: T.text } }, 'Origin: '), POMODORO_DEEP.creator),
              h('p', { style: { margin: 0, color: T.text, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, '⏱️ Structure: '), POMODORO_DEEP.structure)
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.accent, marginBottom: 14 } },
              h('h4', { style: { margin: '0 0 6px', fontSize: 14, color: T.accentHi } }, '🧠 Why it works'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.55 } }, POMODORO_DEEP.why)
            ),
            h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '📋 Rules'),
            h('ul', { style: { margin: '0 0 14px', paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.7 } },
              POMODORO_DEEP.rules.map(function(r, i) { return h('li', { key: i }, r); })),
            h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🔧 Modifications'),
            h('ul', { style: { margin: '0 0 14px', paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.7 } },
              POMODORO_DEEP.modifications.map(function(m, i) { return h('li', { key: i }, m); })),
            h('p', { style: { margin: 0, padding: 10, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 11, color: T.dim, fontStyle: 'italic' } },
              h('strong', null, '📚 Research: '), POMODORO_DEEP.research)
          );
        }

        function reframesTab() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🔄 5 procrastination reframes'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
                'The modern reframe: procrastination is emotion-regulation, not time-management. Each reframe + an action.')
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              PROCRASTINATION_REFRAMES.map(function(r, i) {
                return h('div', { key: i, style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('strong', { style: { fontSize: 13, color: T.accentHi, display: 'block', marginBottom: 4 } }, '→ ' + r.reframe),
                  h('p', { style: { margin: '0 0 6px', fontSize: 12, color: T.text, lineHeight: 1.55 } }, r.detail),
                  h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.5, padding: 8, borderRadius: 6, background: T.bg } },
                    h('strong', { style: { color: T.good } }, '🎯 Action: '), r.action));
              })
            )
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🎯 Goals + procrastination'),
          h('div', { role: 'tablist', 'aria-label': 'Goals + procrastination sections',
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('frameworks', '🎯 4 frameworks'),
            tabBtn('pomodoro', '🍅 Pomodoro'),
            tabBtn('reframes', '🔄 Reframes')),
          gView === 'frameworks' && frameworksTab(),
          gView === 'pomodoro' && pomodoroTab(),
          gView === 'reframes' && reframesTab(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MULTITASKING MYTH view
      // ─────────────────────────────────────────
      function renderMultitasking() {
        var picked = d.mtPicked || null;
        var pickedM = picked != null ? MULTITASKING_COSTS[picked] : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📵 Multitasking myth + attention'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '📵 The brain doesn\'t multitask — it task-switches'),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } }, MULTITASKING_FACTS.coreReality),
            h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.warn, marginBottom: 8 } },
              h('strong', { style: { color: T.warn, fontSize: 12 } }, '⏳ Attention residue (Sophie Leroy 2009): '),
              h('span', { style: { color: T.text, fontSize: 12, lineHeight: 1.55 } }, MULTITASKING_FACTS.attentionResidue)),
            h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.warn, marginBottom: 8 } },
              h('strong', { style: { color: T.warn, fontSize: 12 } }, '🕐 Reorientation cost (Gloria Mark UCI): '),
              h('span', { style: { color: T.text, fontSize: 12, lineHeight: 1.55 } }, MULTITASKING_FACTS.reorientationCost)),
            h('div', { style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.bad } },
              h('strong', { style: { color: T.bad, fontSize: 12 } }, '🪞 The Dunning-Kruger of multitasking: '),
              h('span', { style: { color: T.text, fontSize: 12, lineHeight: 1.55 } }, MULTITASKING_FACTS.ironicAwareness))
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '💸 6 hidden costs'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 14 } },
            MULTITASKING_COSTS.map(function(c, i) {
              var sel = picked === i;
              return h('button', { key: i, 'data-ll-focusable': true,
                'aria-label': c.source, 'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('mtPicked', sel ? null : i); awardBadge('mt-aware', 'Multitasking Aware'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left', fontWeight: sel ? 800 : 600
                }) }, c.source);
            })
          ),
          pickedM && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedM.source),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.bad } }, '💸 Cost: '), pickedM.cost),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.good } }, '🔧 Fix: '), pickedM.fix)
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🎯 5 single-tasking tips'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            SINGLE_TASKING_TIPS.map(function(t, i) {
              return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('strong', { style: { fontSize: 13, color: T.accentHi, display: 'block', marginBottom: 4 } }, '→ ' + t.tip),
                h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } }, t.detail));
            })
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // READING + LITERACY SCIENCE view
      // ─────────────────────────────────────────
      function renderReading() {
        var rView = d.readView || 'simple';
        function tabBtn(id, label) {
          var active = rView === id;
          return h('button', { 'data-ll-focusable': true, role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            onClick: function() { upd('readView', id); },
            style: Object.assign({}, btnSecondary(), { background: active ? T.accent : T.cardAlt, color: active ? '#fff' : T.text, fontWeight: active ? 800 : 600 }) }, label);
        }

        function simpleTab() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '📐 The Simple View of Reading'),
              h('div', { style: { padding: 12, borderRadius: 6, background: T.bg, border: '1px solid ' + T.accent, marginBottom: 8, textAlign: 'center', fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: T.accentHi } },
                SIMPLE_VIEW_OF_READING.formula),
              h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } }, SIMPLE_VIEW_OF_READING.explanation),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 } },
                h('div', { style: { padding: 10, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('strong', { style: { color: T.accentHi, fontSize: 12 } }, '🔤 Decoding'),
                  h('p', { style: { margin: '4px 0 0', fontSize: 11, color: T.muted, lineHeight: 1.5 } }, SIMPLE_VIEW_OF_READING.decoding)),
                h('div', { style: { padding: 10, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('strong', { style: { color: T.accentHi, fontSize: 12 } }, '💬 Language Comp'),
                  h('p', { style: { margin: '4px 0 0', fontSize: 11, color: T.muted, lineHeight: 1.5 } }, SIMPLE_VIEW_OF_READING.languageComp)))
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🎯 Implications for diagnosis + intervention'),
              h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.7 } },
                SIMPLE_VIEW_OF_READING.implications.map(function(imp, i) { return h('li', { key: i }, imp); }))
            )
          );
        }

        function pillarsTab() {
          var picked = d.pillarPicked || null;
          var pickedP = picked ? READING_FIVE_PILLARS.find(function(p) { return p.id === picked; }) : null;
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🏛️ The 5 Pillars (NRP 2000)'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5 } },
                'The National Reading Panel\'s 2000 meta-review identified these 5 areas as essential. Tap any for what + when + research.')
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 14 } },
              READING_FIVE_PILLARS.map(function(p) {
                var sel = picked === p.id;
                return h('button', { key: p.id, 'data-ll-focusable': true,
                  'aria-label': p.name, 'aria-pressed': sel ? 'true' : 'false',
                  onClick: function() { upd('pillarPicked', sel ? null : p.id); awardBadge('reading-explorer', 'Reading Science Explorer'); },
                  style: Object.assign({}, btnSecondary(), {
                    background: sel ? T.accent : T.cardAlt,
                    color: sel ? '#fff' : T.text,
                    textAlign: 'left', fontWeight: sel ? 800 : 600,
                    display: 'flex', alignItems: 'flex-start', gap: 8
                  }) },
                  h('span', { style: { fontSize: 22 } }, p.icon),
                  h('span', null, p.name));
              })
            ),
            pickedP && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent } },
              h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedP.icon + ' ' + pickedP.name),
              h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, '🔍 What: '), pickedP.what),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, '📋 Example: '), pickedP.example),
              h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
                h('strong', { style: { color: T.good } }, '🕐 When taught: '), pickedP.whenTaught),
              h('p', { style: { margin: 0, fontSize: 11, color: T.dim, fontStyle: 'italic' } },
                h('strong', null, '📚 Research: '), pickedP.research))
          );
        }

        function approachesTab() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '⚔️ The reading wars'),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } }, READING_WARS_SUMMARY)
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 } },
              STRUCTURED_VS_BALANCED.map(function(a, i) {
                var stanceColor = a.stance === 'evidence-aligned' ? T.good : a.stance === 'mixed evidence' ? T.warn : T.bad;
                return h('div', { key: i, style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + stanceColor } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                    h('strong', { style: { fontSize: 14, color: T.accentHi, flex: 1 } }, a.approach),
                    h('span', { style: { fontSize: 10, color: stanceColor, padding: '2px 8px', borderRadius: 12, background: T.bg, border: '1px solid ' + stanceColor, textTransform: 'uppercase', fontWeight: 700 } }, a.stance)),
                  h('p', { style: { margin: '0 0 6px', fontSize: 12, color: T.text, lineHeight: 1.55 } },
                    h('strong', null, 'What: '), a.what),
                  h('p', { style: { margin: '0 0 6px', fontSize: 11, color: T.muted, lineHeight: 1.5, fontStyle: 'italic' } },
                    h('strong', null, 'Origin: '), a.origin),
                  h('p', { style: { margin: '0 0 6px', fontSize: 11, color: T.good, lineHeight: 1.5 } },
                    h('strong', null, '✅ Good: '), a.good),
                  h('p', { style: { margin: 0, fontSize: 11, color: T.warn, lineHeight: 1.5 } },
                    h('strong', null, '⚠️ Caveat: '), a.caveat));
              })
            )
          );
        }

        function ogTab() {
          return h('div', null,
            h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
              h('h3', { style: { margin: '0 0 6px', fontSize: 15, color: T.text } }, '🏛️ Orton-Gillingham approach'),
              h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } }, ORTON_GILLINGHAM.what),
              h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.5, fontStyle: 'italic' } },
                h('strong', { style: { color: T.text } }, 'History: '), ORTON_GILLINGHAM.history)
            ),
            h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🧩 Core features'),
            h('ul', { style: { margin: '0 0 14px', paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.7 } },
              ORTON_GILLINGHAM.coreFeatures.map(function(f, i) { return h('li', { key: i }, f); })),
            h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.good, marginBottom: 8 } },
              h('strong', { style: { color: T.good, fontSize: 12 } }, '📚 Evidence: '),
              h('span', { style: { color: T.text, fontSize: 12, lineHeight: 1.55 } }, ORTON_GILLINGHAM.evidence)),
            h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.warn } },
              h('strong', { style: { color: T.warn, fontSize: 12 } }, '⚠️ Accessibility: '),
              h('span', { style: { color: T.text, fontSize: 12, lineHeight: 1.55 } }, ORTON_GILLINGHAM.accessibility))
          );
        }

        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('📖 Reading + literacy science'),
          h('div', { role: 'tablist', 'aria-label': 'Reading sections',
            style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            tabBtn('simple', '📐 Simple View'),
            tabBtn('pillars', '🏛️ 5 Pillars'),
            tabBtn('approaches', '⚔️ Reading wars'),
            tabBtn('og', '🎓 Orton-Gillingham')),
          rView === 'simple' && simpleTab(),
          rView === 'pillars' && pillarsTab(),
          rView === 'approaches' && approachesTab(),
          rView === 'og' && ogTab(),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // TRAUMA-INFORMED TEACHING view
      // ─────────────────────────────────────────
      function renderTrauma() {
        var picked = d.tiPicked || null;
        var pickedP = picked ? TRAUMA_INFORMED_PRACTICES.find(function(p) { return p.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('💚 Trauma-informed teaching'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '💚 Trauma-informed foundations'),
            [
              { label: '📊 ACEs', val: TRAUMA_FOUNDATIONS.aces },
              { label: '🗣️ Behavior is communication', val: TRAUMA_FOUNDATIONS.behaviorAsCommunication },
              { label: '🤝 Co-regulation before self-regulation', val: TRAUMA_FOUNDATIONS.coRegBeforeSelfReg },
              { label: '🪟 Window of tolerance', val: TRAUMA_FOUNDATIONS.windowOfTolerance },
              { label: '⚠️ You\'re NOT a therapist', val: TRAUMA_FOUNDATIONS.notATherapist }
            ].map(function(r, i) {
              return h('p', { key: i, style: { margin: '0 0 8px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, r.label + ': '), r.val);
            })
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🎯 6 trauma-informed practices'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 14 } },
            TRAUMA_INFORMED_PRACTICES.map(function(p) {
              var sel = picked === p.id;
              return h('button', { key: p.id, 'data-ll-focusable': true,
                'aria-label': p.name, 'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('tiPicked', sel ? null : p.id); awardBadge('trauma-informed', 'Trauma-Informed Aware'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left', fontWeight: sel ? 800 : 600,
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }) },
                h('span', { style: { fontSize: 22 } }, p.icon),
                h('span', null, p.name));
            })
          ),
          pickedP && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedP.icon + ' ' + pickedP.name),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🔍 What: '), pickedP.what),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.good } }, '🏫 In the classroom: '), pickedP.classroom),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.bad } }, '🚫 Avoid: '), pickedP.avoid)
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.warn } },
            h('h4', { style: { margin: '0 0 10px', fontSize: 14, color: T.warn } }, '⚠️ When to refer (you\'re NOT a therapist)'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              TRAUMA_REFERRAL_GUIDE.map(function(g, i) {
                return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: T.cardAlt, border: '1px solid ' + T.border } },
                  h('strong', { style: { fontSize: 12, color: T.text, display: 'block', marginBottom: 2 } }, '🚩 ' + g.sign),
                  h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                    h('strong', { style: { color: T.accentHi } }, '→ '), g.action));
              })
            )
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MTSS / RTI view
      // ─────────────────────────────────────────
      function renderMTSS() {
        var picked = d.mtssPicked || null;
        var pickedTool = picked ? MTSS_SCREENING_TOOLS.find(function(t) { return t.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 900, margin: '0 auto', color: T.text } },
          backBar('🏗️ MTSS / RTI + universal screening'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🏗️ The framework'),
            [
              { label: '🔍 What it is', val: MTSS_FOUNDATIONS.what },
              { label: '🎯 Purpose', val: MTSS_FOUNDATIONS.purpose },
              { label: '🟢 Tier 1', val: MTSS_FOUNDATIONS.tier1 },
              { label: '🟡 Tier 2', val: MTSS_FOUNDATIONS.tier2 },
              { label: '🔴 Tier 3', val: MTSS_FOUNDATIONS.tier3 },
              { label: '🧠 School-psych role', val: MTSS_FOUNDATIONS.schoolPsychRole }
            ].map(function(r, i) {
              return h('p', { key: i, style: { margin: '0 0 8px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, r.label + ': '), r.val);
            })
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🛠️ Universal screening tools (8)'),
          h('p', { style: { margin: '0 0 8px', fontSize: 11, color: T.dim, lineHeight: 1.5 } }, 'Tap any tool for details. Most schools screen reading + math but skip behavioral screening — that\'s a gap to close.'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 14 } },
            MTSS_SCREENING_TOOLS.map(function(t) {
              var sel = picked === t.id;
              return h('button', { key: t.id, 'data-ll-focusable': true,
                'aria-label': t.name + ' — ' + t.domain, 'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('mtssPicked', sel ? null : t.id); awardBadge('mtss-explorer', 'MTSS Explorer'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left', fontWeight: sel ? 800 : 600,
                  display: 'flex', flexDirection: 'column', gap: 2
                }) },
                h('span', { style: { fontSize: 12, fontWeight: 800 } }, t.domain),
                h('span', { style: { fontSize: 11, fontWeight: 600 } }, t.name));
            })
          ),
          pickedTool && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedTool.name),
            h('p', { style: { margin: '0 0 6px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🔍 What: '), pickedTool.what),
            h('p', { style: { margin: '0 0 6px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.good } }, '🎯 Use: '), pickedTool.use),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.warn } }, '💰 Cost: '), pickedTool.cost)
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '⚖️ Decision-making framework'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 } },
            MTSS_DECISION_FRAMEWORK.map(function(g) {
              return h('div', { key: g.id, style: { padding: 10, borderRadius: 8, background: T.card, border: '1px solid ' + T.border } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, g.icon),
                  h('strong', { style: { fontSize: 12, color: T.text } }, g.when)),
                h('p', { style: { margin: '0 0 4px', fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                  h('strong', { style: { color: T.accentHi } }, '🔍 What it means: '), g.what),
                h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                  h('strong', { style: { color: T.good } }, '→ Action: '), g.action));
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.warn, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 13, color: T.warn } }, '⚠️ Common pitfalls'),
            MTSS_PITFALLS.map(function(p, i) {
              return h('p', { key: i, style: { margin: '0 0 6px', fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                h('strong', { style: { color: T.warn } }, '• '), p);
            })
          ),
          h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 11, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.accentHi } }, '🔗 Cross-link: '),
            'For deeper coverage of assessment validity + reliability + bias-in-testing, see the Assessment Literacy Lab tool. MTSS uses screening tools whose validity drives every tier-movement decision — bad screening = bad decisions.'),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // WRITING PROCESS view
      // ─────────────────────────────────────────
      function renderWriting() {
        var picked = d.writingPicked || null;
        var pickedP = picked ? WRITING_PILLARS.find(function(p) { return p.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('✍️ Writing process pedagogy'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '✍️ Writing-as-thinking foundations'),
            [
              { label: '💡 Big idea', val: WRITING_FOUNDATIONS.bigIdea },
              { label: '📝 Knowledge-telling (novice)', val: WRITING_FOUNDATIONS.knowledgeTelling },
              { label: '🔄 Knowledge-transforming (expert)', val: WRITING_FOUNDATIONS.knowledgeTransforming },
              { label: '⚠️ Product-vs-process trap', val: WRITING_FOUNDATIONS.productVsProcess },
              { label: '🧠 Cognitive load', val: WRITING_FOUNDATIONS.cognitiveLoad },
              { label: '🔬 Research', val: WRITING_FOUNDATIONS.research }
            ].map(function(r, i) {
              return h('p', { key: i, style: { margin: '0 0 8px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, r.label + ': '), r.val);
            })
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🏗️ The 5 pillars of the writing process'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 14 } },
            WRITING_PILLARS.map(function(p) {
              var sel = picked === p.id;
              return h('button', { key: p.id, 'data-ll-focusable': true,
                'aria-label': p.name, 'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('writingPicked', sel ? null : p.id); awardBadge('writing-explorer', 'Writing Process Explorer'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left', fontWeight: sel ? 800 : 600,
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }) },
                h('span', { style: { fontSize: 22 } }, p.icon),
                h('span', null, p.name));
            })
          ),
          pickedP && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedP.icon + ' ' + pickedP.name),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🔍 What: '), pickedP.what),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.good } }, '🏫 In the classroom: '), pickedP.classroom),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.bad } }, '🚫 Avoid: '), pickedP.avoid)
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🧰 Frameworks worth knowing'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 } },
            WRITING_FRAMEWORKS.map(function(f) {
              return h('div', { key: f.id, style: { padding: 10, borderRadius: 8, background: T.card, border: '1px solid ' + T.border } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, f.icon),
                  h('strong', { style: { fontSize: 13, color: T.text } }, f.name)),
                h('p', { style: { margin: '0 0 4px', fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                  h('strong', { style: { color: T.accentHi } }, '🔍 What: '), f.what),
                h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                  h('strong', { style: { color: T.good } }, '🎯 Use: '), f.use));
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.warn } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 13, color: T.warn } }, '⚠️ Common failure modes (with fixes)'),
            WRITING_FAILURES.map(function(f, i) {
              return h('p', { key: i, style: { margin: '0 0 6px', fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                h('strong', { style: { color: T.warn } }, '• '), f);
            })
          ),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // GROUP WORK view
      // ─────────────────────────────────────────
      function renderGroupWork() {
        var picked = d.groupPicked || null;
        var pickedS = picked ? GROUP_STRUCTURES.find(function(s) { return s.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
          backBar('🤝 Group work + collaborative learning'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🤝 The 2 non-negotiables'),
            [
              { label: '💡 Big idea', val: GROUP_FOUNDATIONS.bigIdea },
              { label: '🔗 Positive interdependence', val: GROUP_FOUNDATIONS.posInterdep },
              { label: '👤 Individual accountability', val: GROUP_FOUNDATIONS.indivAccount },
              { label: '🧠 Why cooperation works', val: GROUP_FOUNDATIONS.cooperation },
              { label: '⚠️ Why most "group work" fails', val: GROUP_FOUNDATIONS.failures }
            ].map(function(r, i) {
              return h('p', { key: i, style: { margin: '0 0 8px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, r.label + ': '), r.val);
            })
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🏗️ 6 cooperative structures that work'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 14 } },
            GROUP_STRUCTURES.map(function(s) {
              var sel = picked === s.id;
              return h('button', { key: s.id, 'data-ll-focusable': true,
                'aria-label': s.name, 'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('groupPicked', sel ? null : s.id); awardBadge('group-strategist', 'Group Work Strategist'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left', fontWeight: sel ? 800 : 600,
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }) },
                h('span', { style: { fontSize: 22 } }, s.icon),
                h('span', null, s.name));
            })
          ),
          pickedS && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedS.icon + ' ' + pickedS.name),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🔍 What: '), pickedS.what),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.good } }, '✅ Strengths: '), pickedS.strengths),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.warn } }, '⚠️ Weaknesses: '), pickedS.weaknesses)
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🛠️ 5 failure modes + fixes'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 } },
            GROUP_FAILURES.map(function(f, i) {
              return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.card, border: '1px solid ' + T.border } },
                h('strong', { style: { fontSize: 12, color: T.text, display: 'block', marginBottom: 4 } }, '🚫 ' + f.mode),
                h('p', { style: { margin: '0 0 4px', fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                  h('strong', { style: { color: T.warn } }, 'Why: '), f.why),
                h('p', { style: { margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                  h('strong', { style: { color: T.good } }, 'Fix: '), f.fix));
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.warn, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 13, color: T.warn } }, '⛔ When NOT to use group work'),
            GROUP_WHEN_NOT.map(function(p, i) {
              return h('p', { key: i, style: { margin: '0 0 6px', fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                h('strong', { style: { color: T.warn } }, '• '), p);
            })
          ),
          h('div', { style: { padding: 12, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, fontSize: 11, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.accentHi } }, '🌲 EL Education context: '),
            'EL\'s Crew structure naturally implements collaborative-learning principles — daily 20-min Crew with consistent membership builds the relational trust + norms that turn "groups" into "communities of practice." That\'s why Crew + Expedition design at King Middle is more than scheduling — it\'s the load-bearing architecture for collaborative learning.'),
          disclaimerFooter()
        );
      }

      // ─────────────────────────────────────────
      // MATH PEDAGOGY view
      // ─────────────────────────────────────────
      function renderMathPedagogy() {
        var picked = d.mathPicked || null;
        var pickedM = picked ? MATH_PEDAGOGY_MOVES.find(function(m) { return m.id === picked; }) : null;
        return h('div', { style: { padding: 20, maxWidth: 900, margin: '0 auto', color: T.text } },
          backBar('🔢 Math anxiety + math pedagogy'),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '😰 Math anxiety foundations'),
            [
              { label: '🧪 Distinct from test anxiety', val: MATH_FOUNDATIONS.distinct },
              { label: '👨‍👩‍👧 Cultural transmission', val: MATH_FOUNDATIONS.transmission },
              { label: '🪪 Identity problem', val: MATH_FOUNDATIONS.identity },
              { label: '🌱 Mathematical mindset', val: MATH_FOUNDATIONS.mindset },
              { label: '⚖️ Productive struggle', val: MATH_FOUNDATIONS.research }
            ].map(function(r, i) {
              return h('p', { key: i, style: { margin: '0 0 8px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, r.label + ': '), r.val);
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '⚙️ Conceptual vs procedural understanding'),
            [
              { label: '📐 Procedural fluency', val: MATH_CONCEPT_VS_PROC.procedural },
              { label: '💡 Conceptual understanding', val: MATH_CONCEPT_VS_PROC.conceptual },
              { label: '🤝 Both matter', val: MATH_CONCEPT_VS_PROC.bothMatter },
              { label: '⚠️ The danger', val: MATH_CONCEPT_VS_PROC.danger },
              { label: '📚 NCTM 5 practices', val: MATH_CONCEPT_VS_PROC.nctm }
            ].map(function(r, i) {
              return h('p', { key: i, style: { margin: '0 0 8px', fontSize: 12, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.accentHi } }, r.label + ': '), r.val);
            })
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '🎯 6 high-leverage math pedagogy moves'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 14 } },
            MATH_PEDAGOGY_MOVES.map(function(m) {
              var sel = picked === m.id;
              return h('button', { key: m.id, 'data-ll-focusable': true,
                'aria-label': m.name, 'aria-pressed': sel ? 'true' : 'false',
                onClick: function() { upd('mathPicked', sel ? null : m.id); awardBadge('math-pedagogy', 'Math Pedagogy Explorer'); },
                style: Object.assign({}, btnSecondary(), {
                  background: sel ? T.accent : T.cardAlt,
                  color: sel ? '#fff' : T.text,
                  textAlign: 'left', fontWeight: sel ? 800 : 600,
                  display: 'flex', alignItems: 'flex-start', gap: 8
                }) },
                h('span', { style: { fontSize: 22 } }, m.icon),
                h('span', null, m.name));
            })
          ),
          pickedM && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '2px solid ' + T.accent, marginBottom: 14 } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, pickedM.icon + ' ' + pickedM.name),
            h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '🔍 What: '), pickedM.what),
            h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.good } }, '🎯 Why: '), pickedM.why),
            h('p', { style: { margin: 0, color: T.muted, fontSize: 12, lineHeight: 1.55 } },
              h('strong', { style: { color: T.accentHi } }, '📋 Example: '), pickedM.example)
          ),
          h('h4', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, '💚 Math anxiety interventions'),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 } },
            MATH_ANXIETY_INTERVENTIONS.map(function(intv) {
              return h('div', { key: intv.id, style: { padding: 10, borderRadius: 8, background: T.card, border: '1px solid ' + T.border } },
                h('strong', { style: { fontSize: 12, color: T.text, display: 'block', marginBottom: 4 } }, intv.name),
                h('p', { style: { margin: '0 0 4px', fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                  h('strong', { style: { color: T.accentHi } }, '🔍 What: '), intv.what),
                h('p', { style: { margin: '0 0 4px', fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                  h('strong', { style: { color: T.good } }, '🎯 Why: '), intv.why),
                h('p', { style: { margin: 0, fontSize: 11, color: T.dim, lineHeight: 1.5 } },
                  h('strong', { style: { color: T.dim } }, '📚 Evidence: '), intv.evidence));
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.warn } },
            h('h4', { style: { margin: '0 0 8px', fontSize: 13, color: T.warn } }, '⚠️ Common math-pedagogy pitfalls'),
            MATH_PITFALLS.map(function(p, i) {
              return h('p', { key: i, style: { margin: '0 0 6px', fontSize: 11, color: T.muted, lineHeight: 1.5 } },
                h('strong', { style: { color: T.warn } }, '• '), p);
            })
          ),
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
        case 'lessonPlan':    return renderLessonPlan();
        case 'strategyPicker':return renderStrategyPicker();
        case 'path':          return renderPath();
        case 'glossary':      return renderGlossary();
        case 'memory':        return renderMemory();
        case 'testAnxiety':   return renderTestAnxiety();
        case 'sdt':           return renderSDT();
        case 'researchLit':   return renderResearchLit();
        case 'lab':           return renderLab();
        case 'noteTaking':    return renderNoteTaking();
        case 'sleep':         return renderSleep();
        case 'goals':         return renderGoals();
        case 'multitask':     return renderMultitasking();
        case 'reading':       return renderReading();
        case 'trauma':        return renderTrauma();
        case 'mtss':          return renderMTSS();
        case 'mathPed':       return renderMathPedagogy();
        case 'writing':       return renderWriting();
        case 'groupWork':     return renderGroupWork();
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
