// ═══════════════════════════════════════════════════════════════
// stem_tool_llm_literacy.js — AI Literacy Lab (v1.0)
// Teaches LLM mechanics (tokenization, next-token prediction,
// temperature, hallucination) and UDL-framed guidance for using
// AI as a scaffold vs a substitute. Clinician-authored.
// Registered tool ID: "llmLiteracy"
// Category: technology · Grade range: 6-12
// ═══════════════════════════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('llmLiteracy'))) {

(function() {
  'use strict';

  // ── Inject CSS keyframes once (idempotent) ──
  // Used for gentle reveals and the thermometer needle — inline React styles
  // can't define keyframes, so we add them globally but scope class prefixes.
  (function injectStyles() {
    if (document.getElementById('llm-literacy-keyframes')) return;
    var s = document.createElement('style');
    s.id = 'llm-literacy-keyframes';
    s.textContent = [
      '@keyframes llmLitFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }',
      '@keyframes llmLitPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.06); opacity: .85; } }',
      '@keyframes llmLitShimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }',
      '.llm-lit-fade-in { animation: llmLitFadeIn .32s ease-out both; }',
      '.llm-lit-pulse { animation: llmLitPulse 1.6s ease-in-out infinite; }',
      '.llm-lit-tile { transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }',
      '.llm-lit-tile:hover { transform: translateY(-3px); box-shadow: 0 8px 20px -8px rgba(15,23,42,.18); }',
      '.llm-lit-span-pick { transition: background-color .15s ease, border-color .15s ease; }',
      '.llm-lit-span-pick:not([aria-disabled=true]):hover { background-color: #f1f5f9; }',
      '.llm-lit-term { border-bottom: 1px dotted currentColor; cursor: help; }',
      '.llm-lit-term:hover, .llm-lit-term:focus { background-color: rgba(124, 58, 237, .08); outline: none; }',
      // Skip-link: visually hidden until focused, then jumps to main content.
      '.llm-lit-skip { position: absolute; top: -40px; left: 8px; background: #7c3aed; color: #fff; padding: 8px 14px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px; z-index: 10000; transition: top .2s ease; }',
      '.llm-lit-skip:focus { top: 8px; outline: 2px solid #fff; outline-offset: 2px; }',
      // Respect user motion preferences — disable transforms and fades entirely.
      '@media (prefers-reduced-motion: reduce) {',
      '  .llm-lit-fade-in, .llm-lit-pulse { animation: none !important; }',
      '  .llm-lit-tile, .llm-lit-tile:hover { transform: none !important; transition: none !important; }',
      '  * { transition-duration: .01ms !important; animation-duration: .01ms !important; }',
      '}',
      // Print: simplify the printed quick-reference card.
      '@media print {',
      '  .llm-lit-no-print { display: none !important; }',
      '  .llm-lit-print-root { background: #fff !important; color: #000 !important; padding: 0 !important; }',
      '  .llm-lit-print-root * { box-shadow: none !important; background-image: none !important; }',
      '  .llm-lit-print-card { break-inside: avoid; page-break-inside: avoid; border: 1px solid #ccc !important; }',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  })();

  // ─────────────────────────────────────────────────────────
  // SECTION DATA: Tokenization examples
  // ─────────────────────────────────────────────────────────
  // Real BPE tokenization is complex; for teaching we use a heuristic
  // that matches the shape students would see in a tokenizer (sub-word
  // chunks for affixes, whole words for short common words).

  var COMMON_WORDS = { 'the':1,'a':1,'an':1,'is':1,'are':1,'was':1,'were':1,'and':1,'or':1,'but':1,'in':1,'on':1,'to':1,'of':1,'for':1,'with':1,'it':1,'that':1,'this':1,'be':1,'as':1,'at':1,'by':1,'from':1,'i':1,'you':1,'we':1,'he':1,'she':1,'they':1,'my':1,'me':1,'if':1,'not':1,'no':1,'yes':1,'do':1,'does':1,'did':1,'have':1,'has':1,'had':1,'can':1,'will':1,'would':1,'should':1,'sky':1,'blue':1,'red':1,'sun':1,'light':1,'day':1,'cat':1,'dog':1 };
  var PREFIXES = ['un','re','pre','dis','over','under','mis','non'];
  var SUFFIXES = ['ing','tion','sion','ment','ness','able','less','ful','ly','ed','er','est','ity','ous','ive'];

  function pseudoTokenize(text) {
    // Produces an array of { tok, kind } entries where kind is
    // 'word' | 'subword' | 'space' | 'punct'.
    // This is a TEACHING tokenization — close enough in shape to real
    // subword tokenizers to make the mechanics visible.
    if (!text) return [];
    var out = [];
    var i = 0;
    while (i < text.length) {
      var ch = text.charAt(i);
      if (ch === ' ' || ch === '\n' || ch === '\t') {
        out.push({ tok: ch === '\n' ? '\u23CE' : '\u2423', kind: 'space' });
        i++; continue;
      }
      if (/[.,!?;:()"'\[\]\/-]/.test(ch)) {
        out.push({ tok: ch, kind: 'punct' });
        i++; continue;
      }
      // Read a word
      var j = i;
      while (j < text.length && /[A-Za-z0-9']/.test(text.charAt(j))) j++;
      var word = text.substring(i, j);
      i = j;
      if (!word) continue;
      var lower = word.toLowerCase();
      if (COMMON_WORDS[lower] || word.length <= 3) {
        out.push({ tok: word, kind: 'word' });
        continue;
      }
      // Try prefix / suffix split
      var handled = false;
      for (var p = 0; p < PREFIXES.length && !handled; p++) {
        var pre = PREFIXES[p];
        if (lower.indexOf(pre) === 0 && word.length > pre.length + 2) {
          out.push({ tok: word.substring(0, pre.length), kind: 'subword' });
          var rest = word.substring(pre.length);
          // Check suffix on remainder
          var sufHit = null;
          for (var s = 0; s < SUFFIXES.length && !sufHit; s++) {
            var suf = SUFFIXES[s];
            if (rest.toLowerCase().endsWith(suf) && rest.length > suf.length + 1) sufHit = suf;
          }
          if (sufHit) {
            out.push({ tok: rest.substring(0, rest.length - sufHit.length), kind: 'subword' });
            out.push({ tok: rest.substring(rest.length - sufHit.length), kind: 'subword' });
          } else {
            out.push({ tok: rest, kind: 'subword' });
          }
          handled = true;
        }
      }
      if (handled) continue;
      // Suffix-only split
      for (var s2 = 0; s2 < SUFFIXES.length; s2++) {
        var suf2 = SUFFIXES[s2];
        if (lower.endsWith(suf2) && word.length > suf2.length + 2) {
          out.push({ tok: word.substring(0, word.length - suf2.length), kind: 'subword' });
          out.push({ tok: word.substring(word.length - suf2.length), kind: 'subword' });
          handled = true;
          break;
        }
      }
      if (!handled) out.push({ tok: word, kind: 'word' });
    }
    return out;
  }

  // ─────────────────────────────────────────────────────────
  // SECTION DATA: Next-token prediction gallery
  // ─────────────────────────────────────────────────────────

  var NEXT_TOKEN_EXAMPLES = [
    {
      context: 'The capital of France is',
      predictions: [
        { tok: ' Paris',    pct: 94 },
        { tok: ' a',        pct: 2 },
        { tok: ' the',      pct: 2 },
        { tok: ' Lyon',     pct: 1 },
        { tok: ' located',  pct: 1 }
      ],
      note: 'Sharp distribution — the model has seen this fact thousands of times. Confidence is extremely high.'
    },
    {
      context: 'My favorite color is',
      predictions: [
        { tok: ' blue',   pct: 28 },
        { tok: ' green',  pct: 18 },
        { tok: ' red',    pct: 14 },
        { tok: ' purple', pct: 9 },
        { tok: ' a',      pct: 6 }
      ],
      note: 'Broad distribution — no factual "correct answer," so probability spreads across all common colors. Temperature will matter here.'
    },
    {
      context: 'In 2019, scientists discovered that',
      predictions: [
        { tok: ' the',         pct: 22 },
        { tok: ' a',           pct: 14 },
        { tok: ' certain',     pct: 6 },
        { tok: ' dark',        pct: 4 },
        { tok: ' human',       pct: 3 }
      ],
      note: 'This is where hallucination starts. The model has no specific 2019 scientific discovery cued up — it will generate a plausible-sounding continuation that may or may not be real.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION DATA: Temperature demo (pre-recorded + live)
  // ─────────────────────────────────────────────────────────

  var TEMP_DEMOS = [
    {
      prompt: 'Write a one-sentence explanation of why the sky is blue, for a 7th grader.',
      recordings: {
        low: 'The sky looks blue because sunlight is made of many colors, and blue light gets scattered by the gases in the air more than the other colors.',
        mid: 'Sunlight is a mix of all the rainbow colors, but when it hits the molecules in our atmosphere, blue light bounces around the most — so when you look up, your eyes catch that scattered blue from every direction.',
        high: 'Imagine sunlight as a stampede of rainbow colors rushing toward Earth; when they crash into the tiny molecules of our air, the blue ones get knocked sideways the hardest, so the whole dome of sky glows with their bounced-around glimmer.'
      }
    },
    {
      prompt: 'Describe a character who has just received unexpected news. One sentence.',
      recordings: {
        low: 'She stood in the doorway, holding the letter, unable to move as she read the unexpected news.',
        mid: 'Marcus blinked twice at his phone, the words refusing to arrange themselves into any shape his brain could accept.',
        high: 'The spoon clattered into her cereal like a punctuation mark she had not asked for, and for three long seconds the kitchen forgot it was a kitchen.'
      }
    },
    {
      prompt: 'Finish this sentence in one line: "The best thing about winter is"',
      recordings: {
        low: 'The best thing about winter is the snow.',
        mid: 'The best thing about winter is the way a cold day makes a warm kitchen feel like a small miracle.',
        high: 'The best thing about winter is that it makes you believe in quiet — the kind of hush a field wears like an old coat it never takes off.'
      }
    }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION DATA: Hallucination gallery
  // ─────────────────────────────────────────────────────────

  var HALLUCINATION_GALLERY = [
    {
      category: 'Fake citation',
      icon: '\uD83D\uDCDA',
      confidence: 95,
      question: 'Cite a peer-reviewed study on the effects of blue light on sleep.',
      aiAnswer: 'A 2017 study by Dr. Samuel Reeves at the University of Cambridge (published in the Journal of Sleep Medicine, Vol. 42, pp. 118-134) found that 2 hours of pre-bedtime blue-light exposure delayed melatonin onset by 90 minutes across 248 participants.',
      whyItFails: 'The specific names, volume numbers, page ranges, and sample sizes are fabricated. Real studies on blue light and melatonin exist — but the model invented this one because the PATTERN of academic citations is in its training data, not any particular citation. Always verify by searching for the actual paper.',
      studentAction: 'Copy the title into Google Scholar. If it does not exist, the AI hallucinated it.'
    },
    {
      category: 'Confident math error',
      icon: '\uD83D\uDD22',
      confidence: 90,
      question: 'What is 347 × 28?',
      aiAnswer: '347 × 28 = 9,726',
      whyItFails: 'The real answer is 9,716. LLMs do not actually calculate — they predict the next token that LOOKS right. For arithmetic beyond very simple cases, they often get close but wrong, and they sound just as confident when wrong as when right.',
      studentAction: 'Always use a calculator for math, or ask the AI to show its work step by step (which forces it to generate more reasoning tokens and often catches errors).'
    },
    {
      category: 'Plausible science nonsense',
      icon: '\u269B\uFE0F',
      confidence: 85,
      question: 'What is the melting point of titanium carbide?',
      aiAnswer: 'Titanium carbide has a melting point of approximately 3,160\u00B0C (5,720\u00B0F), making it one of the highest-melting binary compounds known.',
      whyItFails: 'This one happens to be roughly correct (actual \u2248 3,160\u00B0C). BUT: the model would produce an equally confident, equally specific-sounding answer if you asked about a made-up compound like "zirconium hexafluoride carbide" — it generates plausible-looking chemistry numbers based on patterns, not lookups.',
      studentAction: 'Test this yourself: ask about a real compound and an invented one, compare how confident each answer sounds.'
    },
    {
      category: 'Outdated knowledge',
      icon: '\u23F0',
      confidence: 88,
      question: 'Who won the most recent Super Bowl?',
      aiAnswer: 'The Kansas City Chiefs won Super Bowl LVIII in February 2024, defeating the San Francisco 49ers 25-22 in overtime.',
      whyItFails: 'The model\'s training data has a CUTOFF date. Anything that happened after the cutoff is unknown — the model may still answer confidently with its last-known information, or worse, hallucinate a plausible-sounding update. Always check the current date vs. the model\'s cutoff for time-sensitive questions.',
      studentAction: 'For current events, use a search engine or an AI tool that has live web search. Ask the AI directly: "What is your knowledge cutoff date?"'
    },
    {
      category: 'Invented historical detail',
      icon: '\uD83C\uDFDB\uFE0F',
      confidence: 92,
      question: 'Tell me about the 1897 Portland Lighthouse fire.',
      aiAnswer: 'The 1897 Portland Lighthouse fire destroyed the original keeper\'s cottage on March 14, 1897. Keeper James Howland evacuated his family and prevented the light itself from being extinguished by using buckets of seawater. The cottage was rebuilt later that year.',
      whyItFails: 'No such event exists — I made up the premise to demonstrate the failure. The AI produced a detailed, internally consistent narrative complete with names, dates, and a plausible heroic twist. This is called "confabulation" — filling a gap with invention. When you ask about a premise, the model often accepts it rather than pushing back.',
      studentAction: 'Challenge the premise. Ask: "Are you certain this event actually happened? Cite a source." Good prompt craft: phrase questions so the AI has room to say "I don\'t know."'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION DATA: Prompt craft — weak vs strong pairs
  // ─────────────────────────────────────────────────────────

  var PROMPT_PAIRS = [
    {
      goal: 'Get help studying for a biology quiz on mitosis',
      weak: 'tell me about mitosis',
      strong: 'I am a 9th grader studying for a biology quiz on mitosis tomorrow. Please give me a 5-step summary of the phases of mitosis, then quiz me with 3 short-answer questions one at a time — wait for my answer before giving the next one. After each answer, tell me what I got right and what I missed.',
      changes: [
        'Role + grade: tells the AI what level to pitch to',
        'Goal: "studying for a quiz" — not just curiosity',
        'Structure: asks for summary THEN quiz (two-phase task)',
        'Constraint: "one at a time, wait for my answer" — interactive',
        'Format: short-answer, with feedback after each'
      ]
    },
    {
      goal: 'Get unstuck on a writing assignment',
      weak: 'help me write an essay about climate change',
      strong: 'I have to write a 500-word persuasive essay arguing that my town should plant more trees, for my 10th grade English class. My teacher has told me I rely too much on general statements. Help me brainstorm 3 specific, local reasons (I live in Portland, Maine) — don\'t write the essay for me. After the brainstorm, ask me which reason I want to lead with and why.',
      changes: [
        'Specifies length, form (persuasive), audience (10th grade)',
        'Includes teacher\'s feedback — constraint the AI must respect',
        'Explicit boundary: "don\'t write the essay for me"',
        'Asks AI to coach, not produce — avoids AI-as-substitute',
        'Grounds in specific location — forces concrete thinking'
      ]
    },
    {
      goal: 'Debug code without getting the answer handed to you',
      weak: 'why doesn\'t my code work',
      strong: 'I am learning Python. Here is my code [paste]. It should print the sum of all even numbers from 1 to 10, but it prints 0. Don\'t give me the fix. Instead, ask me 2 diagnostic questions that would help me find the bug myself, then let me try.',
      changes: [
        'Learning context — AI knows you\'re a beginner',
        'Expected behavior vs. actual — AI can isolate the gap',
        'Code included — no guessing needed',
        'Pedagogical constraint: Socratic mode, not answer mode',
        'Preserves the learning opportunity'
      ]
    }
  ];

  // ─────────────────────────────────────────────────────────
  // PROMPT TEMPLATES: task-type scaffolds with fill-in slots
  // ─────────────────────────────────────────────────────────
  // The builder lets students pick a task type and fill in slots. Each slot
  // is either a free-text input or a preset chip group. The composed prompt
  // is assembled by joining `parts` — static strings interleaved with slot
  // values looked up by key. Designed so a middle-schooler can produce a
  // complete, five-pattern prompt in under a minute.

  var PROMPT_TEMPLATES = [
    {
      id: 'study',
      icon: '\uD83D\uDCDA',
      label: 'Study for a quiz',
      color: '#2563eb',
      slots: [
        { key: 'topic',    label: 'Topic', placeholder: 'mitosis', required: true },
        { key: 'grade',    label: 'Grade', placeholder: '9th', required: true },
        { key: 'count',    label: 'How many questions?', kind: 'chips', options: ['3','5','8','10'], default: '5' }
      ],
      parts: [
        'I am a ', { slot: 'grade' }, ' grade student preparing for a quiz on ',
        { slot: 'topic' }, '. First, give me a short 3-sentence summary of ',
        { slot: 'topic' }, '. Then quiz me with ', { slot: 'count' },
        ' short-answer questions, ONE AT A TIME. Wait for my answer before giving the next question. After each answer, tell me what I got right and what I missed. Do not show me all the answers upfront.'
      ]
    },
    {
      id: 'write',
      icon: '\u270F\uFE0F',
      label: 'Get unstuck writing',
      color: '#7c3aed',
      slots: [
        { key: 'assignment', label: 'What you have to write',  placeholder: 'a 400-word persuasive essay arguing for school recycling', required: true },
        { key: 'class',      label: 'Class / context',          placeholder: '10th grade English' },
        { key: 'stuck',      label: 'Where you\u2019re stuck',  placeholder: 'the introduction', required: true }
      ],
      parts: [
        'I have to write ', { slot: 'assignment' },
        { if: 'class', then: [' for ', { slot: 'class' }, '.'] , else: ['.'] },
        ' I am specifically stuck on ', { slot: 'stuck' },
        '. DO NOT write this for me. Instead, ask me 3 questions that would help me think about ',
        { slot: 'stuck' },
        ', one question at a time. Wait for my answer before giving the next question. After my third answer, help me turn my answers into a rough outline \u2014 using my words, not new content.'
      ]
    },
    {
      id: 'explain',
      icon: '\uD83D\uDCA1',
      label: 'Explain a confusing concept',
      color: '#0d9488',
      slots: [
        { key: 'concept',  label: 'Concept', placeholder: 'why the sky is blue', required: true },
        { key: 'grade',    label: 'Grade',   placeholder: '7th', required: true },
        { key: 'known',    label: 'What I already know (optional)', placeholder: 'what atoms are' },
        { key: 'length',   label: 'Length', kind: 'chips', options: ['1 sentence','3 sentences','short paragraph','with analogy'], default: '3 sentences' }
      ],
      parts: [
        'Explain ', { slot: 'concept' }, ' to a ', { slot: 'grade' }, ' grader.',
        { if: 'known', then: [' I already know ', { slot: 'known' }, '.'] , else: [''] },
        ' Keep it to ', { slot: 'length' },
        '. Use everyday language. After your explanation, ask me one question that would check whether I understood \u2014 do not give me the answer until I try.'
      ]
    },
    {
      id: 'debug',
      icon: '\uD83D\uDC1B',
      label: 'Debug code (without a giveaway)',
      color: '#dc2626',
      slots: [
        { key: 'language',  label: 'Language', kind: 'chips', options: ['Python','JavaScript','Java','C++','HTML/CSS','other'], default: 'Python' },
        { key: 'expected',  label: 'What it SHOULD do', placeholder: 'print all even numbers from 1 to 10', required: true },
        { key: 'actual',    label: 'What it DOES',      placeholder: 'prints 0', required: true },
        { key: 'code',      label: 'The code', placeholder: 'paste your code', kind: 'textarea', required: true }
      ],
      parts: [
        'I am learning ', { slot: 'language' }, '. My code should ',
        { slot: 'expected' }, ', but instead it ', { slot: 'actual' }, '.\n\nHere is the code:\n\n',
        { slot: 'code' },
        '\n\nDO NOT give me the fix. Instead, ask me 2 diagnostic questions that would help me find the bug myself. Wait for me to answer before suggesting anything.'
      ]
    },
    {
      id: 'brainstorm',
      icon: '\uD83C\uDF31',
      label: 'Brainstorm without handing over the thinking',
      color: '#d97706',
      slots: [
        { key: 'goal',     label: 'Goal',              placeholder: 'project idea for a science fair on ecosystems', required: true },
        { key: 'count',    label: 'How many ideas?',    kind: 'chips', options: ['3','5','7','10'], default: '5' },
        { key: 'constraint', label: 'One constraint',   placeholder: 'must be doable in 2 weeks with no lab equipment' }
      ],
      parts: [
        'Brainstorm ', { slot: 'count' }, ' options for: ', { slot: 'goal' }, '.',
        { if: 'constraint', then: [' Constraint: ', { slot: 'constraint' }, '.'] , else: [''] },
        ' For each option, give me a ONE-sentence description. Do not recommend one \u2014 I\u2019ll pick. After the list, ask me which two I want to hear more about.'
      ]
    },
    {
      id: 'summarize',
      icon: '\uD83D\uDCD1',
      label: 'Summarize a reading (the right way)',
      color: '#0284c7',
      slots: [
        { key: 'title',    label: 'What you\u2019re reading', placeholder: 'the article "Ocean Acidification" for bio class', required: true },
        { key: 'goal',     label: 'Why you need the summary', placeholder: 'to study for tomorrow\u2019s quiz' },
        { key: 'text',     label: 'Paste the text (or key paragraph)', placeholder: 'paste here', kind: 'textarea' }
      ],
      parts: [
        'I am reading: ', { slot: 'title' }, '. ',
        { if: 'goal', then: ['I need to understand it well enough ', { slot: 'goal' }, '. '] , else: [''] },
        'Here is the text:\n\n', { slot: 'text' },
        '\n\nGive me 3 comprehension QUESTIONS I should be able to answer after reading. Do not give me a summary \u2014 I want to read and answer myself. After I answer, tell me which of my answers miss a key point from the text.'
      ]
    }
  ];

  var PROMPT_PATTERNS = [
    { name: 'Role', icon: '\uD83C\uDFAD', desc: 'Tell the AI who it should be. "You are a patient middle-school science tutor." This shapes tone, vocabulary, and what the AI emphasizes.' },
    { name: 'Context', icon: '\uD83D\uDCCD', desc: 'Tell the AI about YOU. Grade level, assignment, what you already know, what you\'re stuck on. More context = more relevant help.' },
    { name: 'Constraints', icon: '\uD83D\uDEA7', desc: 'Tell the AI what NOT to do. "Don\'t write the whole essay." "Use only middle-school vocabulary." "No more than 3 bullet points." Constraints prevent unhelpful outputs.' },
    { name: 'Format', icon: '\uD83D\uDCCB', desc: 'Tell the AI how to shape the answer. Table? Numbered list? One sentence? Question-then-wait? Format controls how easy the answer is to USE.' },
    { name: 'Examples', icon: '\uD83D\uDCDD', desc: 'Show the AI a sample of the output you want. "Here\'s one I did: [example]. Do the next one in the same style." This is more reliable than describing the style in words.' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION DATA: Hallucination spotter passages
  // ─────────────────────────────────────────────────────────
  // Each passage is AI-written text with seeded factual errors.
  // Students click phrases they think are wrong; tool reveals correct
  // answers and why each error is plausible-sounding.

  var SPOTTER_PASSAGES = [
    {
      topic: 'Photosynthesis',
      intro: 'Below is an AI-generated explanation. Click any phrase you think is WRONG. When you\'re done, press "Check my answers."',
      segments: [
        { text: 'Photosynthesis is the process by which plants use sunlight, water, and ', error: false },
        { text: 'nitrogen dioxide', error: true, reason: 'Plants absorb CARBON DIOXIDE (CO2), not nitrogen dioxide. The AI grabbed a plausible-looking gas from context.' },
        { text: ' to produce sugar and oxygen. The reaction takes place mainly in the ', error: false },
        { text: 'chloroplasts', error: false },
        { text: ', specifically in structures called ', error: false },
        { text: 'mitochondria', error: true, reason: 'The sub-structures in chloroplasts are THYLAKOIDS (stacked into grana). Mitochondria are a different organelle for cellular respiration. This is a classic "right word, wrong location" hallucination.' },
        { text: '. The overall equation is 6CO2 + 6H2O \u2192 C6H12O6 + 6O2.', error: false }
      ]
    },
    {
      topic: 'US History \u2014 The Moon Landing',
      intro: 'Click any phrase you think is WRONG.',
      segments: [
        { text: 'On July 20, 1969, astronauts ', error: false },
        { text: 'Neil Armstrong and Buzz Aldrin', error: false },
        { text: ' became the first humans to walk on the Moon, as part of the ', error: false },
        { text: 'Apollo 11', error: false },
        { text: ' mission. Their lunar module was named ', error: false },
        { text: 'Columbia', error: true, reason: 'The lunar module was named EAGLE. "Columbia" was the command module that stayed in orbit with astronaut Michael Collins. The AI swapped them \u2014 a common confusion because both names are real.' },
        { text: '. Armstrong\'s famous first words were "', error: false },
        { text: 'One small step for man, one giant leap for mankind', error: false },
        { text: '." They remained on the lunar surface for approximately ', error: false },
        { text: '18 hours', error: true, reason: 'They were on the surface for about 21.5 hours total, but outside the lunar module (the actual "moonwalk") for only about 2.5 hours. The AI generated a plausible-sounding number that is not the right measurement for the right thing.' },
        { text: ' before lifting off to rejoin the command module.', error: false }
      ]
    },
    {
      topic: 'Math \u2014 Statistics basics',
      intro: 'This is AI-explained. Click any claim you think is WRONG.',
      segments: [
        { text: 'In statistics, the ', error: false },
        { text: 'mean', error: false },
        { text: ' is the sum of all values divided by the number of values, while the ', error: false },
        { text: 'median', error: false },
        { text: ' is the middle value when the data is sorted. For the data set {2, 4, 4, 6, 10}, the mean is ', error: false },
        { text: '5.2', error: false },
        { text: ' and the median is ', error: false },
        { text: '6', error: true, reason: 'Wrong. Sorted: {2, 4, 4, 6, 10}. The middle (3rd) value is 4, not 6. The AI plausibly picked a value from the set \u2014 the one that would be the median if the count were different. Classic confident-but-wrong.' },
        { text: '. A common confusion: the ', error: false },
        { text: 'mode is always equal to the median', error: true, reason: 'False. The MODE is the most frequent value; the MEDIAN is the middle value when sorted. They CAN match (in {2,4,4,6,10} both are 4), but they are defined differently and usually differ. An AI summary that glosses over this is a plausible-sounding but wrong oversimplification.' },
        { text: '. The ', error: false },
        { text: 'standard deviation', error: false },
        { text: ' measures how spread out the numbers are from the mean. When the standard deviation is high, the data points are ', error: false },
        { text: 'clustered tightly around the mean', error: true, reason: 'Backwards. HIGH standard deviation = SPREAD OUT. LOW standard deviation = clustered tightly. This is the exact kind of "the AI flipped the direction" error that ruins homework \u2014 easy to miss because the sentence reads smoothly either way.' },
        { text: '. For this reason, statisticians often report the standard deviation alongside the mean to give a fuller picture of the data.', error: false }
      ]
    }
  ];

  // ─────────────────────────────────────────────────────────
  // MISCONCEPTIONS: common wrong beliefs about AI with corrections
  // ─────────────────────────────────────────────────────────
  // Students arrive carrying assumptions they picked up from social media,
  // marketing, or casual conversation. This card lists the most common
  // ones and corrects them in one line each. Compact on purpose \u2014 a
  // full lesson belongs in the actual sections.

  var MISCONCEPTIONS = [
    {
      myth: 'The AI is checking what it says against the real world.',
      fact: 'It is not. Unless you explicitly turn on web search, the model generates from patterns in its training data \u2014 no live verification.'
    },
    {
      myth: 'If the AI sounds confident, it\u2019s probably right.',
      fact: 'Confidence and correctness are not connected. The same tone appears whether the answer is true, wrong, or completely made up.'
    },
    {
      myth: 'AI has opinions.',
      fact: 'It does not. It produces statistically likely continuations of text. What can look like opinion is a pattern borrowed from its training data.'
    },
    {
      myth: 'Experts fact-checked the AI\u2019s training data.',
      fact: 'No one fact-checks the training data \u2014 it is too huge. Safety filters exist for dangerous content, not accuracy.'
    },
    {
      myth: 'Using AI for homework is always cheating.',
      fact: 'Depends on what skill the homework is building. AI that removes a barrier (typing speed, working-memory lookup) can be fair; AI that does the thinking for you is not. See Section 5.'
    },
    {
      myth: 'Longer prompts are always better.',
      fact: 'Only if every piece earns its place. A focused, specific short prompt usually beats a rambling long one. See Section 3.'
    },
    {
      myth: 'If AI writes it, it\u2019s plagiarism-proof.',
      fact: 'Schools increasingly detect AI-written text, and submitting AI-generated work as your own is almost always an academic-integrity violation, regardless of detection.'
    },
    {
      myth: 'Newer AI models don\u2019t hallucinate.',
      fact: 'They hallucinate less in some cases and differently in others. Every generation of LLM has its own failure modes \u2014 hallucination has not been solved.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // TEACHER NOTES: clinical rationale per section
  // ─────────────────────────────────────────────────────────
  // Shown when the "For teachers" toggle is on. The goal is to make it
  // easy for a classroom teacher who inherits this tool to understand
  // WHY each section exists, not just what it does. Written from a
  // school-psych lens — executive function, working memory, self-monitoring.

  var TEACHER_NOTES = {
    tokens: {
      goal: 'Make the model\u2019s machinery visible so \u201cAI magic\u201d stops being a category students use.',
      rationale: 'Students who don\u2019t know what an LLM is doing tend to either over-trust it (because it sounds like a knowledgeable adult) or over-distrust it (because they heard it\u2019s \u201cfake intelligence\u201d). Seeing tokenization and next-token prediction converts that into a third, more accurate mental model: pattern-matching text generator.',
      watchFor: 'Students getting stuck on \u201cbut how does it really think?\u201d \u2014 the honest answer is: it doesn\u2019t, and that\u2019s the point. Redirect to the temperature demo to show the probabilistic nature.',
      extension: 'Ask students to compare tokenization of a rare word (e.g., their name) vs. a common word. The compression ratio they see teaches why names and proper nouns are where hallucinations love to live.'
    },
    fails: {
      goal: 'Build a working taxonomy of AI failure modes so \u201cdon\u2019t trust AI\u201d becomes \u201ccheck for THESE specific things.\u201d',
      rationale: 'Vague warnings (\u201cAI can be wrong\u201d) are ineffective; students already know that intellectually. What they need is a checklist of recognizable failure patterns \u2014 fake citation, confident math error, plausible nonsense, stale knowledge, confabulation \u2014 so they can name what they\u2019re seeing when it happens.',
      watchFor: 'Students who test only the plausible-nonsense case and conclude \u201cthe AI got it right, so this section is overblown.\u201d The teaching point is that the same confident tone appears whether the output is right or wrong.',
      extension: 'Have students intentionally produce each of the five failure types using a real AI. The ones they struggle to reproduce teach them which failures are hardest to detect in the wild.'
    },
    prompt: {
      goal: 'Treat prompting as a learnable craft with five concrete patterns, not as a mystical skill.',
      rationale: 'Most students either type one-word prompts (\u201cmitosis\u201d) or copy-paste an assignment prompt verbatim. Neither makes them the operator of the tool. The five patterns \u2014 Role, Context, Constraints, Format, Examples \u2014 are a transferable framework that works across any AI system.',
      watchFor: 'Students who treat the critique ring score as a grade. Reinforce that it\u2019s a heuristic: a 5/5 prompt can still produce bad output, and a 2/5 prompt can work fine for small tasks.',
      extension: 'For students with ADHD or EF differences: the iteration workshop is especially valuable \u2014 it externalizes the \u201cwhat did I actually ask for?\u201d metacognition that many of them struggle to do internally.'
    },
    spotter: {
      goal: 'Convert hallucination-detection from a passive warning into an active skill students practice.',
      rationale: 'Reading about hallucinations is not the same as catching one in real prose. This section deliberately puts correct and incorrect statements next to each other so students have to look carefully \u2014 the core skill needed when using AI-generated study material.',
      watchFor: 'Students clicking everything as suspect (false-alarm dominant) or nothing (miss-dominant). Both are calibration failures. The reveal talks about false alarms specifically \u2014 over-flagging real information is its own cost.',
      extension: 'Encourage multi-attempt play without hints \u2014 the perfect-score XP only fires unassisted. This matches the clinical principle that scaffolded practice then faded support builds durable skill.'
    },
    udl: {
      goal: 'Give students a rubric for deciding when AI is a legitimate accommodation vs. a shortcut that undermines the learning target.',
      rationale: 'This is the section most AI-literacy curricula miss and the one that matters most for students with learning differences. The scaffold-vs-substitute distinction maps onto the UDL principle of \u201creduce the barriers to demonstrating the target skill.\u201d It respects that AI CAN be a valid accommodation while naming the specific way it becomes harmful: when the barrier IS the target skill.',
      watchFor: 'Students who always pick \u201cscaffold\u201d \u2014 sometimes substitute is the right answer (e.g., reading a document to find one fact you need for a different task). The reveal intentionally doesn\u2019t declare a \u201ccorrect\u201d answer; it teaches the decision process.',
      extension: 'The Bring-Your-Own-Scenario card is where this section earns its keep. Encourage students to come back to it for real assignments throughout the year \u2014 treat it as a recurring metacognitive check, not a one-time exercise.'
    },
    ref: {
      goal: 'A printable takeaway students (or teachers) can keep nearby while actually using AI.',
      rationale: 'Most skill-building fails because the teaching moment and the performance moment are separated in time. The reference card bridges that gap \u2014 it\u2019s designed to live on a desk, in a binder, or on a classroom wall, not to be read once and forgotten.',
      watchFor: 'Nothing special \u2014 this page is mostly a print target.',
      extension: 'Consider printing multiple per class and distributing at the start of any assignment where AI use will be permitted. Explicitly point students to the \u201cBefore you trust an AI answer\u201d checklist before they submit.'
    }
  };

  // ─────────────────────────────────────────────────────────
  // GLOSSARY: terms students will encounter
  // ─────────────────────────────────────────────────────────
  // Lookup keyed by lower-case term. When a student clicks a highlighted
  // word anywhere in the tool, we show this definition in a popover.

  var TERMS = {
    'token': {
      label: 'token',
      icon: '\uD83D\uDD24',
      def: 'A token is a small chunk of text the model processes — roughly a word, part of a word, or a piece of punctuation. Common words are often one token; longer words split into pieces ("unhappy" \u2192 "un" + "happy").',
      whereDemo: 'Section 1 has an interactive tokenizer — type anything and watch it split.'
    },
    'tokenization': {
      label: 'tokenization',
      icon: '\uD83D\uDD24',
      def: 'The process of breaking text into tokens before the model can work with it. Different tokenizers split text differently; all of them turn language into numbers the model can predict over.',
      whereDemo: 'Section 1 \u2014 the colored pills show tokenization happening live.'
    },
    'next-token prediction': {
      label: 'next-token prediction',
      icon: '\uD83C\uDFB2',
      def: 'The one thing an LLM does: given the tokens so far, predict a probability for every possible next token. Everything else — answering questions, writing poems, coding — is next-token prediction repeated many times.',
      whereDemo: 'Section 1 shows the probability distribution for three real examples.'
    },
    'temperature': {
      label: 'temperature',
      icon: '\uD83C\uDF21\uFE0F',
      def: 'A number (usually 0\u20132) that controls how random the next-token pick is. Low temperature = always pick the most likely token (deterministic, good for facts). High temperature = sometimes pick less likely tokens (creative, good for stories, worse for accuracy).',
      whereDemo: 'Section 1 lets you compare temp 0.2, 0.7, and 1.2 side by side.'
    },
    'hallucination': {
      label: 'hallucination',
      icon: '\u26A0\uFE0F',
      def: 'When an LLM generates confident-sounding text that is not true \u2014 a fake citation, a wrong date, a made-up fact. The model is not lying; it has no concept of "true." It is filling in the statistically plausible next tokens.',
      whereDemo: 'Section 2 is a gallery of real hallucination types; Section 4 is a spotter game.'
    },
    'confabulation': {
      label: 'confabulation',
      icon: '\uD83C\uDFDB\uFE0F',
      def: 'A specific kind of hallucination where the model fills a knowledge gap with an invented but internally consistent story \u2014 complete with names, dates, and cause-and-effect. Common when the user\'s question accepts a false premise.',
      whereDemo: 'Section 2 \u2014 see the "Invented historical detail" example.'
    },
    'knowledge cutoff': {
      label: 'knowledge cutoff',
      icon: '\u23F0',
      def: 'The latest date in the model\'s training data. The model does not know anything that happened after its cutoff, but it may still answer confidently about recent events \u2014 so always check.',
      whereDemo: 'Section 2 has a cutoff example; you can ask any AI directly what its cutoff is.'
    },
    'prompt': {
      label: 'prompt',
      icon: '\u270F\uFE0F',
      def: 'The text you send to an LLM. The prompt sets the task, the role, the constraints, and the format \u2014 all at once. Good prompts are a learnable craft.',
      whereDemo: 'Section 3 teaches the five patterns of strong prompts.'
    },
    'context': {
      label: 'context',
      icon: '\uD83D\uDCCD',
      def: 'The information you give the AI about YOU and your task \u2014 grade level, what you already know, what you are trying to do. More context usually means more relevant output.',
      whereDemo: 'Section 3 \u2014 "Context" is one of the five prompt patterns.'
    },
    'scaffold': {
      label: 'scaffold',
      icon: '\uD83E\uDEA1',
      def: 'Using AI in a way that REMOVES A BARRIER without doing the thinking you need to practice. Example: asking AI to quiz you after you study, instead of asking AI to tell you the answers.',
      whereDemo: 'Section 5 has worked examples for common student situations.'
    },
    'substitute': {
      label: 'substitute',
      icon: '\uD83E\uDDF1',
      def: 'Using AI in a way that REPLACES THE SKILL you are supposed to be learning. Example: asking AI to write the essay instead of using AI to help you organize your own thoughts.',
      whereDemo: 'Section 5 contrasts this with scaffolding for the same situations.'
    }
  };

  // ─────────────────────────────────────────────────────────
  // SECTION DATA: UDL rubric — scaffold vs substitute
  // ─────────────────────────────────────────────────────────

  var UDL_SCENARIOS = [
    {
      situation: 'I have trouble starting writing assignments. I stare at a blank page for 30 minutes.',
      scaffold: 'Ask AI to ask YOU 3 questions about the topic, then turn your answers into a rough outline. Or: dictate a messy first thought out loud, paste it into the AI, and ask it to organize YOUR ideas (not add new ones).',
      substitute: 'Ask AI to "write a 500-word essay about X." You skip the hardest part of writing — the thinking — and miss the practice your brain needs.',
      why: 'Starting is an executive-function skill. AI that asks YOU questions builds that skill. AI that hands you a draft bypasses it.'
    },
    {
      situation: 'I need to read a 15-page article for class but reading is slow and exhausting for me.',
      scaffold: 'Ask AI to generate 5 comprehension questions BEFORE you read, so you have something to look for. After reading, paste your summary and ask AI to check what you missed.',
      substitute: 'Ask AI to "summarize this article in 3 paragraphs" and only read the summary. You now have someone else\'s interpretation, not your own.',
      why: 'Questions-before-reading is a real reading-comprehension strategy for students with ADHD, dyslexia, or processing differences. It turns reading into a scavenger hunt. Summary-instead-of-reading replaces the work your brain needs to do.'
    },
    {
      situation: 'I can\'t remember the quadratic formula on every homework problem and I\'ve been marked down for it.',
      scaffold: 'SCAFFOLD — absolutely use AI (or a reference card, or a sticky note) to look up the formula. Then apply it yourself. Working memory limits are real — holding formulas in your head is not what you\'re being tested on.',
      substitute: 'Asking AI to solve the whole problem skips the practice of APPLYING the formula, which IS the thing you\'re supposed to learn.',
      why: 'This is the core UDL distinction: lookup tools remove barriers to the skill you\'re practicing. Doing the practice FOR you removes the skill itself. The quadratic formula is a reference; solving with it is the skill.'
    },
    {
      situation: 'I have to give a 5-minute class presentation and I freeze when speaking.',
      scaffold: 'Write your own outline. Then have AI role-play as a teacher and ask you likely follow-up questions, so you practice answering on your feet. Or dictate your talk to AI and ask it to flag only the places where you got stuck.',
      substitute: 'Ask AI to write the whole speech for you to memorize. You have not practiced speaking from your own understanding, so any off-script question will still freeze you.',
      why: 'Public-speaking anxiety comes partly from not trusting you know the material. AI rehearsal builds that trust. AI-written scripts leave the root fear intact.'
    },
    {
      situation: 'I struggle to summarize my own thoughts in a paragraph. I write either too much or too little.',
      scaffold: 'Write the full thing. Then ask AI: "Highlight only the sentences that are repeats of earlier points, and the sentences that introduce a new idea. Don\'t rewrite." Use that map to cut yourself.',
      substitute: 'Ask AI to "make this shorter." You never learn to see the redundancy yourself.',
      why: 'Editing is a learnable skill. AI as a MIRROR (showing you what you wrote) builds it. AI as a REWRITER removes it.'
    }
  ];

  // ─────────────────────────────────────────────────────────
  // Register the tool
  // ─────────────────────────────────────────────────────────

  window.StemLab.registerTool('llmLiteracy', {
    name: 'AI Literacy Lab',
    title: 'AI Literacy Lab',
    icon: '\uD83E\uDDE0',
    description: 'How LLMs actually work, when they fail, how to prompt well, and when to use AI as a scaffold vs. let it substitute for your thinking.',
    category: 'technology',
    gradeRange: '6-12',
    tags: ['ai-literacy', 'digital-literacy', 'metacognition', 'udl'],
    questHooks: [
      { id: 'tok_first',   label: 'Tokenize a sentence',             icon: '\uD83D\uDD24', check: function(d) { return (d.tokenized || 0) >= 1; },    progress: function(d) { return (d.tokenized || 0) >= 1 ? 'Done!' : 'Not yet'; } },
      { id: 'temp_try',    label: 'Compare temperature settings',    icon: '\uD83C\uDF21\uFE0F', check: function(d) { return !!d.tempCompared; }, progress: function(d) { return d.tempCompared ? 'Done!' : 'Not yet'; } },
      { id: 'spot_pass',   label: 'Catch all errors in a passage',   icon: '\uD83D\uDD0D', check: function(d) { return (d.spotterPerfect || 0) >= 1; }, progress: function(d) { return (d.spotterPerfect || 0) + '/2'; } },
      { id: 'prompt_iter', label: 'Iterate a prompt live',           icon: '\u270F\uFE0F', check: function(d) { return (d.promptIterations || 0) >= 2; }, progress: function(d) { return (d.promptIterations || 0) + '/2'; } },
      { id: 'udl_rubric',  label: 'Work through a UDL scenario',     icon: '\uD83E\uDDED', check: function(d) { return (d.udlReflections || 0) >= 3; }, progress: function(d) { return (d.udlReflections || 0) + '/3'; } }
    ],

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var useState = React.useState;
      var useCallback = React.useCallback;
      var useMemo = React.useMemo;
      var callGemini = ctx.callGemini;
      var addToast = ctx.addToast || function(){};
      var awardXP = ctx.awardXP || function(){};
      var announceToSR = ctx.announceToSR || function(){};
      var gradeLevel = ctx.gradeLevel || '7th Grade';

      var d = (ctx.toolData && ctx.toolData.llmLiteracy) || {};
      var upd = function(key, val) {
        if (!ctx.setToolData) return;
        ctx.setToolData(function(prev) {
          var td = Object.assign({}, (prev && prev.llmLiteracy) || {});
          td[key] = val;
          return Object.assign({}, prev, { llmLiteracy: td });
        });
      };
      // Functional update so rapid calls don't overwrite each other.
      var bump = function(key, by) {
        if (!ctx.setToolData) return;
        ctx.setToolData(function(prev) {
          var td = Object.assign({}, (prev && prev.llmLiteracy) || {});
          td[key] = Number(td[key] || 0) + (by || 1);
          return Object.assign({}, prev, { llmLiteracy: td });
        });
      };
      // Mark a one-shot boolean flag only if not already set (no-op re-write otherwise).
      var setOnce = function(key) {
        if (!ctx.setToolData) return;
        ctx.setToolData(function(prev) {
          var existing = (prev && prev.llmLiteracy) || {};
          if (existing[key]) return prev;
          var td = Object.assign({}, existing); td[key] = true;
          return Object.assign({}, prev, { llmLiteracy: td });
        });
      };
      // Mark which sections have been visited (for home-screen progress dots).
      var markVisited = function(sectionId) {
        if (!ctx.setToolData) return;
        ctx.setToolData(function(prev) {
          var existing = (prev && prev.llmLiteracy) || {};
          var visited = Object.assign({}, existing.visited || {});
          if (visited[sectionId]) return prev;
          visited[sectionId] = true;
          var td = Object.assign({}, existing, { visited: visited });
          return Object.assign({}, prev, { llmLiteracy: td });
        });
      };

      var hasLiveAI = typeof callGemini === 'function';

      // ── Shared styles ──
      var COLORS = {
        bg:       '#0f172a',
        panel:    '#ffffff',
        card:     '#f8fafc',
        border:   '#e2e8f0',
        accent:   '#7c3aed',
        accent2:  '#2563eb',
        good:     '#059669',
        bad:      '#dc2626',
        warn:     '#d97706',
        muted:    '#64748b',
        text:     '#0f172a',
        subtext:  '#475569'
      };
      var tokenColors = {
        word:    { bg: '#dbeafe', fg: '#1e40af' },
        subword: { bg: '#fce7f3', fg: '#9d174d' },
        punct:   { bg: '#fef3c7', fg: '#92400e' },
        space:   { bg: '#f1f5f9', fg: '#64748b' }
      };
      function btn(bg, fg, disabled) {
        return {
          background: disabled ? '#e5e7eb' : bg,
          color: disabled ? '#9ca3af' : fg,
          border: 'none',
          padding: '8px 14px',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '13px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'transform .1s ease, filter .1s ease'
        };
      }
      var cardStyle = {
        background: COLORS.card,
        border: '1px solid ' + COLORS.border,
        borderRadius: '12px',
        padding: '14px 16px',
        marginBottom: '12px'
      };
      // Convert #rrggbb hex to an rgba() string with the given alpha.
      // Used for tinted halos / gradient stops built from section colors.
      function hexToRGBA(hex, alpha) {
        var h = (hex || '').replace('#', '');
        if (h.length === 3) h = h.split('').map(function(c) { return c + c; }).join('');
        var r = parseInt(h.substring(0,2), 16) || 0;
        var g = parseInt(h.substring(2,4), 16) || 0;
        var b = parseInt(h.substring(4,6), 16) || 0;
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
      }

      // ── Top-level state: which section is active ──
      var sectTuple = useState('home');
      var section = sectTuple[0]; var setSection = sectTuple[1];
      // Which glossary term, if any, is currently open in the popover.
      var glossTuple = useState(null);
      var glossTerm = glossTuple[0]; var setGlossTerm = glossTuple[1];
      // Teacher-notes toggle (persists across sessions via localStorage).
      var teacherTuple = useState(function() {
        try { return localStorage.getItem('alloLlmLitTeacherNotes') === '1'; } catch (e) { return false; }
      });
      var teacherMode = teacherTuple[0]; var setTeacherMode = teacherTuple[1];
      function toggleTeacherMode() {
        var v = !teacherMode;
        setTeacherMode(v);
        try { localStorage.setItem('alloLlmLitTeacherNotes', v ? '1' : '0'); } catch (e) {}
        announceToSR(v ? 'Teacher notes enabled' : 'Teacher notes hidden');
      }
      // Keyboard shortcut: help overlay visibility.
      var helpTuple = useState(false);
      var helpOpen = helpTuple[0]; var setHelpOpen = helpTuple[1];
      // Glossary browse-all overlay.
      var browseTuple = useState(false);
      var browseOpen = browseTuple[0]; var setBrowseOpen = browseTuple[1];

      // ── Global keyboard shortcuts ──
      // Attached to window so students can navigate without a mouse.
      // We deliberately ignore shortcuts while typing in inputs/textareas.
      React.useEffect(function() {
        function isTyping(el) {
          if (!el) return false;
          var tag = (el.tagName || '').toLowerCase();
          if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
          if (el.isContentEditable) return true;
          return false;
        }
        function onKey(e) {
          if (isTyping(e.target)) return;
          // Modifiers off — respect browser-reserved chords.
          if (e.ctrlKey || e.metaKey || e.altKey) return;
          var key = e.key;
          if (key === 'Escape') {
            if (browseOpen) { setBrowseOpen(false); return; }
            if (helpOpen) { setHelpOpen(false); return; }
            if (glossTerm) { setGlossTerm(null); return; }
            if (section !== 'home') { goHome(); return; }
          }
          if (key === '?' || (key === '/' && e.shiftKey)) { e.preventDefault(); setHelpOpen(true); return; }
          if (key === 'h' || key === 'H') { goHome(); return; }
          if (key === 't' || key === 'T') { toggleTeacherMode(); return; }
          // Numeric shortcuts 1..6
          var idx = ['1','2','3','4','5','6'].indexOf(key);
          if (idx >= 0) {
            var target = SECTION_ORDER[idx];
            if (target) { enterSection(target.id, target.title); }
          }
        }
        window.addEventListener('keydown', onKey);
        return function() { window.removeEventListener('keydown', onKey); };
      }, [section, helpOpen, glossTerm, teacherMode, browseOpen]);

      function goHome() { setSection('home'); announceToSR('Returned to AI Literacy Lab home'); }
      function enterSection(id, title) {
        setSection(id);
        markVisited(id);
        announceToSR('Opened ' + title);
      }

      // Term: renders a word as an inline definable term. Clicking (or
      // pressing Enter/Space on) the term opens the glossary popover.
      function Term(termKey, displayText) {
        var key = (termKey || '').toLowerCase();
        var entry = TERMS[key];
        if (!entry) return h('span', null, displayText || termKey);
        return h('span', {
          className: 'llm-lit-term',
          role: 'button',
          tabIndex: 0,
          onClick: function(e) { e.stopPropagation(); setGlossTerm(key); },
          onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setGlossTerm(key); } },
          title: 'Click for definition: ' + entry.label,
          'aria-label': 'Define ' + entry.label
        }, displayText || termKey);
      }

      // Render the teacher-notes panel at the top of a section body.
      // Only visible when teacherMode is on and the section has notes.
      function teacherNote(sectionId) {
        if (!teacherMode) return null;
        var n = TEACHER_NOTES[sectionId];
        if (!n) return null;
        return h('div', {
          className: 'llm-lit-fade-in llm-lit-no-print',
          style: {
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1px solid #f59e0b',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '16px',
            boxShadow: '0 2px 6px -2px rgba(180, 83, 9, .2)'
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: '18px' } }, '\uD83C\uDF4E'),
            h('div', { style: { fontSize: '12px', fontWeight: 800, color: '#78350f', textTransform: 'uppercase', letterSpacing: '.06em' } }, 'Teacher Notes')
          ),
          [
            { label: 'Goal', body: n.goal, color: '#78350f' },
            { label: 'Clinical rationale', body: n.rationale, color: '#92400e' },
            { label: 'Watch for', body: n.watchFor, color: '#b45309' },
            { label: 'Extension', body: n.extension, color: '#a16207' }
          ].map(function(row, i) {
            return h('div', { key: i, style: { marginBottom: i < 3 ? '8px' : 0 } },
              h('div', { style: { fontSize: '10px', fontWeight: 800, color: row.color, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '2px' } }, row.label),
              h('div', { style: { fontSize: '12.5px', color: '#451a03', lineHeight: 1.55 } }, row.body)
            );
          })
        );
      }

      // Remember which element had focus before a modal opened, so we can
      // restore focus there when the modal closes (a11y good practice).
      var focusReturnRef = React.useRef(null);
      React.useEffect(function() {
        if (glossTerm || helpOpen || browseOpen) {
          if (!focusReturnRef.current) focusReturnRef.current = document.activeElement;
        } else {
          var el = focusReturnRef.current;
          if (el && typeof el.focus === 'function') {
            try { el.focus(); } catch (e) {}
          }
          focusReturnRef.current = null;
        }
      }, [glossTerm, helpOpen, browseOpen]);

      // Keep Tab focus inside the active modal. `listener` attaches to the
      // modal's root div via a ref callback so we clean up on unmount.
      function trapFocus(e) {
        if (e.key !== 'Tab') return;
        var container = e.currentTarget;
        if (!container) return;
        var focusables = container.querySelectorAll('a, button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }

      // Render a help overlay listing keyboard shortcuts.
      function renderHelpOverlay() {
        if (!helpOpen) return null;
        var rows = [
          { keys: ['1','\u20132','\u20133','\u20134','\u20135','6'], label: 'Jump to section 1\u20136' },
          { keys: ['H'], label: 'Back to home' },
          { keys: ['T'], label: 'Toggle teacher notes' },
          { keys: ['?'], label: 'Show this help' },
          { keys: ['Esc'], label: 'Close overlays / back to home' }
        ];
        return h('div', {
          className: 'llm-lit-no-print',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': 'Keyboard shortcuts',
          onClick: function() { setHelpOpen(false); },
          style: {
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9998, padding: '20px'
          }
        },
          h('div', {
            onClick: function(e) { e.stopPropagation(); },
            onKeyDown: trapFocus,
            className: 'llm-lit-fade-in',
            style: {
              background: '#fff', borderRadius: '14px', padding: '18px 22px',
              maxWidth: '420px', width: '100%',
              boxShadow: '0 20px 60px -10px rgba(15,23,42,.45)',
              border: '1px solid ' + COLORS.border
            }
          },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' } },
              h('div', null,
                h('div', { style: { fontSize: '11px', color: COLORS.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' } }, '\u2328\uFE0F Keyboard shortcuts'),
                h('div', { style: { fontSize: '18px', fontWeight: 800, color: COLORS.text } }, 'Quick navigation')
              ),
              h('button', {
                ref: function(el) { if (el && helpOpen) setTimeout(function() { try { el.focus(); } catch (e) {} }, 30); },
                onClick: function() { setHelpOpen(false); },
                style: { background: 'transparent', border: 'none', fontSize: '22px', color: COLORS.muted, cursor: 'pointer' },
                'aria-label': 'Close'
              }, '\u00D7')
            ),
            h('div', null,
              rows.map(function(r, i) {
                return h('div', { key: i, style: { display: 'flex', gap: '10px', alignItems: 'center', padding: '6px 0', borderBottom: i < rows.length - 1 ? '1px solid #f1f5f9' : 'none' } },
                  h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', minWidth: '110px' } },
                    r.keys.map(function(k, ki) {
                      return h('kbd', { key: ki, style: {
                        background: '#f8fafc', border: '1px solid ' + COLORS.border,
                        borderRadius: '6px', padding: '2px 8px',
                        fontFamily: 'monospace', fontSize: '11px', color: COLORS.text,
                        fontWeight: 600
                      } }, k);
                    })
                  ),
                  h('div', { style: { fontSize: '13px', color: COLORS.subtext, flex: 1 } }, r.label)
                );
              })
            )
          )
        );
      }

      function renderBrowseAllGlossary() {
        if (!browseOpen) return null;
        var keys = Object.keys(TERMS);
        return h('div', {
          className: 'llm-lit-no-print',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': 'All glossary terms',
          onClick: function() { setBrowseOpen(false); },
          style: {
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9997, padding: '20px'
          }
        },
          h('div', {
            onClick: function(e) { e.stopPropagation(); },
            onKeyDown: trapFocus,
            className: 'llm-lit-fade-in',
            style: {
              background: '#fff', borderRadius: '14px',
              maxWidth: '600px', width: '100%', maxHeight: '80vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 60px -10px rgba(15,23,42,.45)',
              border: '1px solid ' + COLORS.border
            }
          },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid ' + COLORS.border } },
              h('div', null,
                h('div', { style: { fontSize: '11px', color: COLORS.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' } }, '\uD83D\uDCD6 Glossary'),
                h('div', { style: { fontSize: '18px', fontWeight: 800, color: COLORS.text } }, 'All ' + keys.length + ' terms')
              ),
              h('button', {
                ref: function(el) { if (el && browseOpen) setTimeout(function() { try { el.focus(); } catch (e) {} }, 30); },
                onClick: function() { setBrowseOpen(false); },
                style: { background: 'transparent', border: 'none', fontSize: '22px', color: COLORS.muted, cursor: 'pointer', padding: '2px 6px' },
                'aria-label': 'Close glossary'
              }, '\u00D7')
            ),
            h('div', { style: { padding: '12px 20px', overflowY: 'auto', flex: 1 } },
              keys.map(function(k) {
                var e = TERMS[k];
                return h('div', { key: k, style: { display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f1f5f9' } },
                  h('div', { style: { width: '36px', height: '36px', flexShrink: 0, borderRadius: '10px', background: hexToRGBA(COLORS.accent, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' } }, e.icon),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: '14px', fontWeight: 800, color: COLORS.text, marginBottom: '2px' } }, e.label),
                    h('div', { style: { fontSize: '12.5px', color: COLORS.text, lineHeight: 1.5, marginBottom: '4px' } }, e.def),
                    h('div', { style: { fontSize: '11px', color: COLORS.muted, fontStyle: 'italic' } }, '\uD83D\uDC49 ', e.whereDemo)
                  )
                );
              })
            )
          )
        );
      }

      function renderGlossaryPopover() {
        if (!glossTerm) return null;
        var entry = TERMS[glossTerm];
        if (!entry) return null;
        return h('div', {
          className: 'llm-lit-no-print',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': 'Definition: ' + entry.label,
          onClick: function() { setGlossTerm(null); },
          style: {
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px'
          }
        },
          h('div', {
            onClick: function(e) { e.stopPropagation(); },
            onKeyDown: trapFocus,
            className: 'llm-lit-fade-in',
            style: {
              background: '#fff', borderRadius: '14px', padding: '18px 20px',
              maxWidth: '440px', width: '100%',
              boxShadow: '0 20px 60px -10px rgba(15,23,42,.45)',
              border: '1px solid ' + COLORS.border
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' } },
              h('div', { style: {
                width: '44px', height: '44px', borderRadius: '12px',
                background: hexToRGBA(COLORS.accent, 0.12),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px'
              } }, entry.icon),
              h('div', { style: { flex: 1 } },
                h('div', { style: { fontSize: '11px', color: COLORS.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' } }, 'Glossary'),
                h('div', { style: { fontSize: '18px', fontWeight: 800, color: COLORS.text, letterSpacing: '-.01em' } }, entry.label)
              ),
              h('button', {
                ref: function(el) { if (el && glossTerm) setTimeout(function() { try { el.focus(); } catch (e) {} }, 30); },
                onClick: function() { setGlossTerm(null); },
                style: { background: 'transparent', border: 'none', fontSize: '22px', color: COLORS.muted, cursor: 'pointer', padding: '2px 6px' },
                'aria-label': 'Close definition'
              }, '\u00D7')
            ),
            h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.6, marginBottom: '10px' } }, entry.def),
            h('div', { style: { fontSize: '12px', color: COLORS.subtext, fontStyle: 'italic', paddingTop: '8px', borderTop: '1px solid ' + COLORS.border } },
              '\uD83D\uDC49 ', entry.whereDemo)
          )
        );
      }

      // ═══════════════════════════════════════════════════════
      // HOME / SECTION PICKER
      // ═══════════════════════════════════════════════════════
      function renderHome() {
        var tiles = [
          { id: 'tokens',    icon: '\uD83D\uDD24', title: '1. How LLMs Work',         desc: 'See tokens, next-token prediction, and temperature in action.', color: '#2563eb' },
          { id: 'fails',     icon: '\u26A0\uFE0F', title: '2. Why LLMs Get Things Wrong', desc: 'A gallery of real-feeling AI mistakes, with why each one fools people.', color: '#d97706' },
          { id: 'prompt',    icon: '\u270F\uFE0F', title: '3. Prompt Craft',          desc: 'Weak vs. strong prompts, five patterns, and live iteration.', color: '#7c3aed' },
          { id: 'spotter',   icon: '\uD83D\uDD0D', title: '4. Hallucination Spotter', desc: 'Click the wrong parts of an AI-generated passage.', color: '#059669' },
          { id: 'udl',       icon: '\uD83E\uDDED', title: '5. When to Use AI',        desc: 'Scaffold vs. substitute \u2014 a UDL-framed decision tool. Bring your own situation.', color: '#db2777' },
          { id: 'ref',       icon: '\uD83D\uDCC4', title: '6. Quick Reference',       desc: 'One-page printable summary of the whole lab.', color: '#0f766e' }
        ];
        var visitedCount = tiles.reduce(function(n, t) { return n + (d.visited && d.visited[t.id] ? 1 : 0); }, 0);
        var pct = Math.round((visitedCount / tiles.length) * 100);
        function startOver() {
          if (!ctx.setToolData) return;
          // Confirm unless the session is clearly untouched.
          if (visitedCount > 0 && !window.confirm('Reset your AI Literacy Lab progress? This clears your visited sections and saved state. Your XP earned elsewhere in AlloFlow is not affected.')) return;
          ctx.setToolData(function(prev) {
            var next = Object.assign({}, prev);
            delete next.llmLiteracy;
            return next;
          });
          announceToSR('Lab state reset');
          addToast('Lab state cleared. Fresh start.', 'info');
        }
        return h('div', { style: { padding: '20px', maxWidth: '960px', margin: '0 auto' } },
          // Hero banner
          h('div', { style: {
            position: 'relative',
            padding: '22px 24px',
            marginBottom: '18px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #1e293b 0%, #312e81 45%, #581c87 100%)',
            color: '#fff',
            overflow: 'hidden',
            boxShadow: '0 10px 30px -10px rgba(30, 41, 59, .4)'
          } },
            // Subtle token-stream decoration
            h('div', {
              'aria-hidden': 'true',
              style: {
                position: 'absolute', top: 0, right: 0, bottom: 0, width: '220px',
                background: 'repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 10px, transparent 10px 22px, rgba(255,255,255,.10) 22px 28px, transparent 28px 44px)',
                opacity: 0.6, pointerEvents: 'none'
              }
            }),
            h('div', { style: { position: 'relative', display: 'flex', gap: '16px', alignItems: 'flex-start' } },
              h('div', {
                style: {
                  width: '56px', height: '56px', flexShrink: 0,
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #fbbf24, #f472b6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '32px',
                  boxShadow: '0 8px 20px -6px rgba(251, 191, 36, .5)'
                },
                'aria-hidden': 'true'
              }, '\uD83E\uDDE0'),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('h2', { style: { margin: 0, fontSize: '24px', fontWeight: 800, letterSpacing: '-.01em' } }, 'AI Literacy Lab'),
                h('p', { style: { margin: '6px 0 0', fontSize: '13px', lineHeight: 1.55, color: 'rgba(255,255,255,.82)', maxWidth: '620px' } },
                  'The AI in AlloFlow is not magic \u2014 it is a next-token predictor trained on a huge pile of text. This lab shows what it is really doing, when it fails, and how to use it without letting it do the thinking you need to practice.'
                )
              ),
              // Hero utility buttons — teacher-notes toggle + keyboard help
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 } },
                h('button', {
                  onClick: toggleTeacherMode,
                  style: {
                    background: teacherMode ? 'rgba(251, 191, 36, .95)' : 'rgba(255,255,255,.12)',
                    color: teacherMode ? '#451a03' : '#fff',
                    border: '1px solid ' + (teacherMode ? '#fbbf24' : 'rgba(255,255,255,.22)'),
                    borderRadius: '8px', padding: '6px 10px',
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    whiteSpace: 'nowrap',
                    transition: 'all .15s ease'
                  },
                  title: 'Toggle clinical rationale panels (keyboard: T)',
                  'aria-pressed': teacherMode ? 'true' : 'false'
                }, '\uD83C\uDF4E For teachers'),
                h('button', {
                  onClick: function() { setHelpOpen(true); },
                  style: {
                    background: 'rgba(255,255,255,.12)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,.22)',
                    borderRadius: '8px', padding: '6px 10px',
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    whiteSpace: 'nowrap'
                  },
                  title: 'Show keyboard shortcuts (keyboard: ?)'
                }, '\u2328\uFE0F Shortcuts'),
                h('button', {
                  onClick: function() { setBrowseOpen(true); },
                  style: {
                    background: 'rgba(255,255,255,.12)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,.22)',
                    borderRadius: '8px', padding: '6px 10px',
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    whiteSpace: 'nowrap'
                  },
                  title: 'See all glossary terms in one place'
                }, '\uD83D\uDCD6 Glossary'),
                visitedCount > 0 && h('button', {
                  onClick: startOver,
                  style: {
                    background: 'rgba(255,255,255,.08)',
                    color: 'rgba(255,255,255,.85)',
                    border: '1px solid rgba(255,255,255,.18)',
                    borderRadius: '8px', padding: '6px 10px',
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    whiteSpace: 'nowrap'
                  },
                  title: 'Clear your progress and start fresh'
                }, '\u21BA Start over')
              )
            ),
            // Progress strip
            h('div', { style: { position: 'relative', marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center' } },
              h('div', { style: { flex: 1, height: '8px', background: 'rgba(255,255,255,.12)', borderRadius: '999px', overflow: 'hidden' } },
                h('div', { style: {
                  width: pct + '%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #fbbf24, #f472b6, #a78bfa)',
                  borderRadius: '999px',
                  transition: 'width .4s ease'
                } })
              ),
              h('div', { style: { fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.92)', whiteSpace: 'nowrap' } },
                visitedCount + ' of ' + tiles.length + ' explored')
            )
          ),
          !hasLiveAI && h('div', { style: { marginBottom: '14px', padding: '10px 14px', background: '#fef3c7', borderRadius: '10px', border: '1px solid #fbbf24', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' } },
            h('span', { style: { fontSize: '16px' } }, '\u2139\uFE0F'),
            h('span', null, 'Live AI calls are not available in this environment. Demos will use recorded examples.')
          ),
          // Smart next-step banner: recommends what to do based on current state.
          (function() {
            var firstUnvisited = null;
            for (var j = 0; j < tiles.length; j++) {
              if (!(d.visited && d.visited[tiles[j].id])) { firstUnvisited = tiles[j]; break; }
            }
            // Completion path: all visited. Includes a session summary
            // assembled from actual toolData counters (iterations, spots,
            // reflections) \u2014 makes the completion feel earned.
            if (!firstUnvisited) {
              var promptIters = Number(d.promptIterations || 0);
              var perfectSpots = Number(d.spotterPerfect || 0);
              var udlReflections = Number(d.udlReflections || 0);
              var udlFullRun = !!d.udlAllDone;
              var stats = [
                { n: promptIters,     label: 'prompt iterations', show: promptIters > 0,     color: COLORS.accent },
                { n: perfectSpots,    label: 'perfect spots',     show: perfectSpots > 0,    color: COLORS.good },
                { n: udlReflections,  label: 'UDL reflections',   show: udlReflections > 0,  color: '#db2777' }
              ].filter(function(s) { return s.show; });
              return h('div', {
                className: 'llm-lit-fade-in',
                style: {
                  marginBottom: '14px', padding: '14px 18px',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0fdfa 100%)',
                  border: '1.5px solid #86efac',
                  borderRadius: '14px',
                  boxShadow: '0 4px 14px -6px rgba(5, 150, 105, .2)'
                }
              },
                h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: stats.length > 0 ? '12px' : '0' } },
                  h('div', { style: { fontSize: '36px' } }, '\uD83C\uDFC6'),
                  h('div', { style: { flex: 1, minWidth: '180px' } },
                    h('div', { style: { fontSize: '15px', fontWeight: 800, color: COLORS.good, letterSpacing: '-.01em' } },
                      'You\'ve worked through every section.'),
                    h('div', { style: { fontSize: '12px', color: COLORS.subtext, lineHeight: 1.45, marginTop: '2px' } },
                      udlFullRun
                        ? 'Every UDL scenario covered, too. Print the reference and keep it near where you use AI.'
                        : 'Nice. The Quick Reference is print-ready \u2014 keep it near wherever you use AI.'
                    )
                  ),
                  h('button', {
                    onClick: function() { enterSection('ref', '6. Quick Reference'); },
                    style: btn(COLORS.good, '#fff', false)
                  }, 'Open reference \u2192')
                ),
                // Numeric summary strip
                stats.length > 0 && h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid rgba(5, 150, 105, .15)' } },
                  stats.map(function(s, i) {
                    return h('div', { key: i, style: {
                      background: 'rgba(255,255,255,.7)',
                      border: '1px solid ' + hexToRGBA(s.color, 0.3),
                      borderRadius: '10px',
                      padding: '6px 12px',
                      display: 'flex', alignItems: 'baseline', gap: '6px'
                    } },
                      h('span', { style: { fontSize: '18px', fontWeight: 800, color: s.color, lineHeight: 1 } }, s.n),
                      h('span', { style: { fontSize: '11px', color: COLORS.subtext } }, s.label)
                    );
                  })
                )
              );
            }
            // First-visit nudge vs. resume nudge
            var isFirstRun = visitedCount === 0;
            return h('div', {
              className: 'llm-lit-fade-in',
              style: {
                marginBottom: '14px', padding: '12px 16px',
                background: '#fff',
                border: '1.5px solid ' + firstUnvisited.color,
                borderRadius: '12px',
                display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
                boxShadow: '0 2px 6px -2px ' + hexToRGBA(firstUnvisited.color, 0.2)
              }
            },
              h('div', { style: {
                width: '40px', height: '40px', borderRadius: '10px',
                background: hexToRGBA(firstUnvisited.color, 0.14),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', flexShrink: 0
              } }, firstUnvisited.icon),
              h('div', { style: { flex: 1, minWidth: '180px' } },
                h('div', { style: { fontSize: '11px', fontWeight: 700, color: firstUnvisited.color, textTransform: 'uppercase', letterSpacing: '.05em' } },
                  isFirstRun ? 'Start here' : 'Next up'),
                h('div', { style: { fontSize: '14px', fontWeight: 700, color: COLORS.text, marginTop: '2px' } }, firstUnvisited.title),
                h('div', { style: { fontSize: '12px', color: COLORS.subtext, lineHeight: 1.4 } }, firstUnvisited.desc)
              ),
              h('button', {
                onClick: function() { enterSection(firstUnvisited.id, firstUnvisited.title); },
                style: {
                  background: firstUnvisited.color, color: '#fff', border: 'none',
                  padding: '10px 16px', borderRadius: '10px',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }
              }, (isFirstRun ? 'Begin' : 'Continue') + ' \u2192')
            );
          })(),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' } },
            tiles.map(function(t) {
              var visited = !!(d.visited && d.visited[t.id]);
              return h('button', {
                key: t.id,
                className: 'llm-lit-tile',
                onClick: function() { enterSection(t.id, t.title); },
                style: {
                  background: visited
                    ? 'linear-gradient(180deg, #ffffff 0%, ' + hexToRGBA(t.color, 0.04) + ' 100%)'
                    : COLORS.panel,
                  border: '2px solid ' + (visited ? t.color : COLORS.border),
                  borderRadius: '14px',
                  padding: '18px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: '140px'
                },
                'aria-label': t.title + ': ' + t.desc + (visited ? ' (visited)' : '')
              },
                // Corner glow
                h('div', {
                  'aria-hidden': 'true',
                  style: {
                    position: 'absolute', top: '-30px', right: '-30px',
                    width: '80px', height: '80px', borderRadius: '50%',
                    background: 'radial-gradient(circle, ' + hexToRGBA(t.color, 0.18) + ' 0%, transparent 70%)'
                  }
                }),
                visited && h('div', {
                  style: { position: 'absolute', top: '10px', right: '12px', fontSize: '13px', color: t.color, fontWeight: 800, background: '#fff', padding: '1px 7px', borderRadius: '999px', boxShadow: '0 1px 3px rgba(0,0,0,.08)' },
                  'aria-hidden': 'true'
                }, '\u2713'),
                h('div', {
                  style: {
                    width: '42px', height: '42px',
                    borderRadius: '10px',
                    background: hexToRGBA(t.color, 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px',
                    marginBottom: '10px',
                    position: 'relative'
                  }
                }, t.icon),
                h('div', { style: { fontWeight: 700, fontSize: '15px', color: t.color, marginBottom: '4px' } }, t.title),
                h('div', { style: { fontSize: '12px', color: COLORS.subtext, lineHeight: 1.4 } }, t.desc)
              );
            })
          ),
          // Misconception Busters — compact list of common wrong beliefs
          h('div', { style: { marginTop: '20px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' } },
              h('div', { style: { width: '32px', height: '32px', borderRadius: '8px', background: hexToRGBA('#f59e0b', 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' } }, '\uD83D\uDCA5'),
              h('h3', { style: { margin: 0, fontSize: '16px', fontWeight: 800, color: COLORS.text, letterSpacing: '-.01em' } }, 'Myth busters'),
              h('span', { style: { fontSize: '11px', color: COLORS.muted, marginLeft: '4px' } }, '\u2014 stuff you may have picked up that is not quite right')
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '8px' } },
              MISCONCEPTIONS.map(function(m, i) {
                return h('div', { key: i, style: {
                  background: '#fff',
                  border: '1px solid ' + COLORS.border,
                  borderRadius: '10px',
                  padding: '10px 12px'
                } },
                  h('div', { style: { display: 'flex', gap: '8px', marginBottom: '4px' } },
                    h('span', { style: { color: COLORS.bad, fontWeight: 800, flexShrink: 0, fontSize: '13px' } }, '\u2717'),
                    h('div', { style: { fontSize: '12.5px', color: COLORS.text, fontStyle: 'italic', lineHeight: 1.4 } }, '"' + m.myth + '"')
                  ),
                  h('div', { style: { display: 'flex', gap: '8px' } },
                    h('span', { style: { color: COLORS.good, fontWeight: 800, flexShrink: 0, fontSize: '13px' } }, '\u2713'),
                    h('div', { style: { fontSize: '12px', color: COLORS.subtext, lineHeight: 1.5 } }, m.fact)
                  )
                );
              })
            )
          ),
          h('div', { style: { marginTop: '20px', padding: '12px', background: '#f1f5f9', borderRadius: '10px', fontSize: '12px', color: COLORS.subtext } },
            h('strong', null, 'About this lab: '),
            'Written by a clinician (PsyD) with students who have executive-function, attention, and learning differences in mind. The rubric in Section 5 is the part most AI-literacy curricula miss \u2014 it is also the most important.'
          )
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 1: HOW LLMs WORK (tokens + next-token + temp)
      // ═══════════════════════════════════════════════════════
      function HowLLMsWork() {
        var txTuple = useState('The dog was running quickly because it was unhappy.');
        var tokText = txTuple[0]; var setTokText = txTuple[1];
        var toks = useMemo(function() { return pseudoTokenize(tokText); }, [tokText]);

        var ntExIdxTuple = useState(0);
        var ntExIdx = ntExIdxTuple[0]; var setNtExIdx = ntExIdxTuple[1];
        var ntEx = NEXT_TOKEN_EXAMPLES[ntExIdx];

        var tempPromptIdxTuple = useState(0);
        var tempPromptIdx = tempPromptIdxTuple[0]; var setTempPromptIdx = tempPromptIdxTuple[1];
        var tempDemo = TEMP_DEMOS[tempPromptIdx];

        var tempLiveTuple = useState(null);
        var tempLive = tempLiveTuple[0]; var setTempLive = tempLiveTuple[1];
        var tempBusyTuple = useState(false);
        var tempBusy = tempBusyTuple[0]; var setTempBusy = tempBusyTuple[1];

        var runLiveTemp = useCallback(async function() {
          if (!hasLiveAI) { addToast('Live AI not available — showing recorded example.', 'info'); return; }
          setTempBusy(true);
          setTempLive(null);
          try {
            var results = {};
            var temps = { low: 0.2, mid: 0.7, high: 1.2 };
            var keys = Object.keys(temps);
            for (var i = 0; i < keys.length; i++) {
              var k = keys[i];
              // jsonMode=false intentionally — we want plain text, not JSON.
              var out = await callGemini(tempDemo.prompt, false, false, temps[k]);
              results[k] = (out || '').trim() || '(empty response)';
            }
            setTempLive(results);
            bump('tempCompared', 1);
            upd('tempCompared', true);
            awardXP(10, 'Compared temperatures live');
          } catch (e) {
            console.error('[llmLiteracy] Live temperature run failed:', e);
            addToast('Live call failed — recorded example shown instead.', 'warn');
          } finally {
            setTempBusy(false);
          }
        }, [tempDemo, hasLiveAI]);

        var activeTemp = tempLive || tempDemo.recordings;
        var showingLive = !!tempLive;

        return h('div', { style: { padding: '20px', maxWidth: '960px', margin: '0 auto' } },
          topBar('1. How LLMs Work'),
          teacherNote('tokens'),

          // ── Part A: Tokenization ──
          h('div', { style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.accent2 }) },
            h('h3', { style: { margin: '0 0 6px', fontSize: '17px', color: COLORS.accent2 } }, '\uD83D\uDD24 ', Term('tokenization', 'Tokenization')),
            h('p', { style: { margin: '0 0 10px', fontSize: '13px', color: COLORS.subtext, lineHeight: 1.5 } },
              'An LLM never sees "words" \u2014 it sees ', Term('token', 'tokens'), ', which are pieces of words. Type a sentence and watch it split.'
            ),
            h('textarea', {
              value: tokText,
              onChange: function(e) {
                setTokText(e.target.value);
                if (e.target.value.length > 5) setOnce('tokenized');
              },
              rows: 2,
              style: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid ' + COLORS.border, borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' },
              'aria-label': 'Text to tokenize'
            }),
            h('div', { style: { marginTop: '10px', padding: '10px', background: '#ffffff', border: '1px dashed ' + COLORS.border, borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '3px', lineHeight: 1.8 } },
              toks.length === 0 && h('span', { style: { color: COLORS.muted, fontSize: '12px' } }, '(type something above)'),
              toks.map(function(t, i) {
                var c = tokenColors[t.kind] || tokenColors.word;
                return h('span', {
                  key: i,
                  style: {
                    background: c.bg,
                    color: c.fg,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    border: '1px solid ' + c.bg
                  },
                  title: t.kind
                }, t.tok);
              })
            ),
            (function() {
              var contentToks = toks.filter(function(t) { return t.kind !== 'space'; });
              var chars = tokText.length;
              return h('div', { style: { marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' } },
                h('div', { style: { fontSize: '11px', color: COLORS.muted, display: 'flex', gap: '10px', flexWrap: 'wrap' } },
                  h('span', null, '\uD83D\uDFE6 word'),
                  h('span', null, '\uD83D\uDFEA subword'),
                  h('span', null, '\uD83D\uDFE8 punctuation'),
                  h('span', null, '\u2B1C space')
                ),
                contentToks.length > 0 && h('div', { style: { fontSize: '11px', color: COLORS.subtext, fontWeight: 600 } },
                  h('span', { style: { color: COLORS.accent2 } }, contentToks.length + ' tokens'),
                  h('span', { style: { color: COLORS.muted, fontWeight: 400 } }, ' · ' + chars + ' characters · \u2248 ' + (contentToks.length > 0 ? (chars / contentToks.length).toFixed(1) : '0') + ' chars/token')
                )
              );
            })(),
            h('p', { style: { marginTop: '10px', fontSize: '12px', color: COLORS.subtext, lineHeight: 1.5 } },
              h('strong', null, 'Why this matters: '),
              'The model predicts the next TOKEN, not the next word. Short common words become one token; longer words often split (e.g. "unhappy" \u2192 "un" + "happy"). This is also how billing works — API costs are per token, not per word.'
            )
          ),

          // ── Part B: Next-token prediction ──
          h('div', { style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.accent }) },
            h('h3', { style: { margin: '0 0 6px', fontSize: '17px', color: COLORS.accent } }, '\uD83C\uDFB2 ', Term('next-token prediction', 'Next-Token Prediction')),
            h('p', { style: { margin: '0 0 10px', fontSize: '13px', color: COLORS.subtext, lineHeight: 1.5 } },
              'All the LLM is really doing: guessing what token comes next. Given the same context, it has a PROBABILITY for every possible next token.'
            ),
            h('div', { style: { display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' } },
              NEXT_TOKEN_EXAMPLES.map(function(_, i) {
                var on = i === ntExIdx;
                return h('button', {
                  key: i,
                  onClick: function() { setNtExIdx(i); },
                  style: {
                    background: on ? COLORS.accent : '#e2e8f0',
                    color: on ? '#fff' : COLORS.subtext,
                    border: 'none', padding: '6px 12px', borderRadius: '16px', fontWeight: 600, fontSize: '12px', cursor: 'pointer'
                  }
                }, 'Example ' + (i + 1));
              })
            ),
            h('div', { style: { background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid ' + COLORS.border } },
              h('div', { style: { fontFamily: 'monospace', fontSize: '14px', marginBottom: '10px' } },
                h('span', { style: { color: COLORS.muted } }, 'Context: '),
                h('span', { style: { background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' } }, '"' + ntEx.context),
                h('span', { style: { color: COLORS.accent, fontWeight: 700, marginLeft: '4px' } }, '▮')
              ),
              ntEx.predictions.map(function(p, i) {
                return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' } },
                  h('div', { style: { width: '80px', fontFamily: 'monospace', fontSize: '12px', color: COLORS.text } }, '"' + p.tok + '"'),
                  h('div', { style: { flex: 1, height: '18px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' } },
                    h('div', { style: { width: p.pct + '%', height: '100%', background: 'linear-gradient(90deg, ' + COLORS.accent + ', ' + COLORS.accent2 + ')', transition: 'width .3s ease' } })
                  ),
                  h('div', { style: { width: '40px', fontSize: '12px', fontWeight: 600, color: COLORS.subtext, textAlign: 'right' } }, p.pct + '%')
                );
              }),
              h('p', { style: { marginTop: '10px', marginBottom: 0, fontSize: '12px', color: COLORS.subtext, lineHeight: 1.5, fontStyle: 'italic' } }, ntEx.note)
            )
          ),

          // ── Part C: Temperature ──
          h('div', { style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.warn }) },
            h('h3', { style: { margin: '0 0 6px', fontSize: '17px', color: COLORS.warn } }, '\uD83C\uDF21\uFE0F ', Term('temperature', 'Temperature')),
            h('p', { style: { margin: '0 0 10px', fontSize: '13px', color: COLORS.subtext, lineHeight: 1.5 } },
              Term('temperature', 'Temperature'), ' controls how RANDOM the next-token choice is. Low (0.2) = pick the highest-probability token almost always. High (1.2) = sample from the long tail, including unlikely tokens. Same prompt, three temperatures:'
            ),
            h('div', { style: { display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' } },
              TEMP_DEMOS.map(function(_, i) {
                var on = i === tempPromptIdx;
                return h('button', {
                  key: i,
                  onClick: function() { setTempPromptIdx(i); setTempLive(null); },
                  style: {
                    background: on ? COLORS.warn : '#e2e8f0',
                    color: on ? '#fff' : COLORS.subtext,
                    border: 'none', padding: '6px 12px', borderRadius: '16px', fontWeight: 600, fontSize: '12px', cursor: 'pointer'
                  }
                }, 'Prompt ' + (i + 1));
              })
            ),
            h('div', { style: { background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid ' + COLORS.border, marginBottom: '10px', fontSize: '13px', fontStyle: 'italic', color: COLORS.subtext } }, '"' + tempDemo.prompt + '"'),
            // Thermometer: gradient bar with 3 labeled tick-marks
            h('div', { style: { margin: '0 4px 14px', padding: '10px 6px 4px', position: 'relative' } },
              h('div', { style: {
                height: '10px', borderRadius: '999px',
                background: 'linear-gradient(90deg, #2563eb 0%, #7c3aed 50%, #db2777 100%)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,.15)',
                position: 'relative'
              } },
                // 3 labelled ticks
                [ { at: '5%',  color: '#2563eb', label: '0.2\ncool',  icon: '\u2744\uFE0F' },
                  { at: '50%', color: '#7c3aed', label: '0.7\nbalanced', icon: '\u269C\uFE0F' },
                  { at: '95%', color: '#db2777', label: '1.2\nwild',   icon: '\uD83D\uDD25' }
                ].map(function(tick, ti) {
                  return h('div', {
                    key: ti,
                    style: {
                      position: 'absolute', top: '-4px', left: tick.at, transform: 'translateX(-50%)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center'
                    }
                  },
                    h('div', { style: {
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: '#fff', border: '3px solid ' + tick.color,
                      boxShadow: '0 2px 4px rgba(0,0,0,.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px'
                    } }, tick.icon),
                    h('div', { style: {
                      marginTop: '4px', fontSize: '10px', fontWeight: 700,
                      color: tick.color, whiteSpace: 'pre', textAlign: 'center', lineHeight: 1.15
                    } }, tick.label)
                  );
                })
              ),
              h('div', { style: { height: '32px' } })
            ),
            [
              { key: 'low',  label: 'Temp 0.2 \u2014 conservative', color: '#2563eb', icon: '\u2744\uFE0F' },
              { key: 'mid',  label: 'Temp 0.7 \u2014 balanced',     color: '#7c3aed', icon: '\u269C\uFE0F' },
              { key: 'high', label: 'Temp 1.2 \u2014 wild',         color: '#db2777', icon: '\uD83D\uDD25' }
            ].map(function(row) {
              return h('div', { key: row.key, className: 'llm-lit-fade-in', style: { marginBottom: '10px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
                  h('span', { style: {
                    width: '22px', height: '22px', borderRadius: '6px',
                    background: hexToRGBA(row.color, 0.12),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px'
                  } }, row.icon),
                  h('div', { style: { fontSize: '11px', fontWeight: 700, color: row.color, textTransform: 'uppercase', letterSpacing: '.05em' } }, row.label)
                ),
                h('div', { style: {
                  background: '#fff',
                  border: '1px solid ' + hexToRGBA(row.color, 0.3),
                  borderLeft: '4px solid ' + row.color,
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '13px', lineHeight: 1.55, color: COLORS.text
                } }, activeTemp[row.key])
              );
            }),
            h('div', { style: { display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' } },
              h('button', {
                onClick: runLiveTemp,
                disabled: tempBusy || !hasLiveAI,
                style: btn(COLORS.warn, '#fff', tempBusy || !hasLiveAI)
              }, tempBusy ? '\u23F3 Running live...' : (hasLiveAI ? (showingLive ? '\u26A1 Re-run live' : '\u26A1 Run live with Gemini') : '\uD83D\uDCC0 Live unavailable')),
              showingLive && h('button', {
                onClick: function() { setTempLive(null); announceToSR('Showing recorded examples'); },
                style: btn('#e2e8f0', COLORS.text, false),
                title: 'Show the recorded example outputs again'
              }, '\u21BA Show recorded'),
              showingLive && h('span', { style: { fontSize: '11px', color: COLORS.good, fontWeight: 600 } }, '\u2705 Live results shown above'),
              !showingLive && hasLiveAI && h('span', { style: { fontSize: '11px', color: COLORS.muted } }, 'Showing recorded examples'),
              !hasLiveAI && h('span', { style: { fontSize: '11px', color: COLORS.muted } }, 'Static mode — recorded examples only')
            ),
            h('p', { style: { marginTop: '12px', marginBottom: 0, fontSize: '12px', color: COLORS.subtext, lineHeight: 1.5 } },
              h('strong', null, 'Takeaway: '),
              'Low temperature is right for facts ("what is the capital of France?"). High temperature is right for creative work. Most AI chat tools default somewhere in the middle — which is why a factual question sometimes drifts.'
            )
          ),
          sectionFooter('tokens')
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 2: Why LLMs Get Things Wrong
      // ═══════════════════════════════════════════════════════
      function WhyLLMsFail() {
        var idxTuple = useState(0);
        var idx = idxTuple[0]; var setIdx = idxTuple[1];
        var revealTuple = useState(false);
        var revealed = revealTuple[0]; var setRevealed = revealTuple[1];
        var g = HALLUCINATION_GALLERY[idx];
        // Live re-ask state: when the student clicks "Ask Gemini this yourself,"
        // we store the fresh response so they can compare it to the canned
        // example above. Keyed by category so it clears on tab switch.
        var liveAskTuple = useState({});
        var liveAsk = liveAskTuple[0]; var setLiveAsk = liveAskTuple[1];
        var askBusyTuple = useState(false);
        var askBusy = askBusyTuple[0]; var setAskBusy = askBusyTuple[1];

        function next() { setIdx(function(x) { return (x + 1) % HALLUCINATION_GALLERY.length; }); setRevealed(false); }
        function prev() { setIdx(function(x) { return (x - 1 + HALLUCINATION_GALLERY.length) % HALLUCINATION_GALLERY.length; }); setRevealed(false); }

        function askLive() {
          if (!hasLiveAI) return;
          setAskBusy(true);
          // jsonMode=false \u2014 we want natural language.
          callGemini(g.question, false, false, 0.7).then(function(out) {
            var trimmed = (out || '').trim() || '(empty response)';
            setLiveAsk(function(prev) {
              var next = Object.assign({}, prev);
              next[g.category] = trimmed;
              return next;
            });
          }).catch(function(err) {
            console.error('[llmLiteracy] Live ask failed:', err);
            addToast('Live ask failed \u2014 see console.', 'warn');
          }).then(function() {
            setAskBusy(false);
          });
        }

        return h('div', { style: { padding: '20px', maxWidth: '820px', margin: '0 auto' } },
          topBar('2. Why LLMs Get Things Wrong'),
          teacherNote('fails'),
          h('p', { style: { fontSize: '13px', color: COLORS.subtext, lineHeight: 1.5, marginTop: 0 } },
            'LLMs don\'t know what they don\'t know. They generate the most plausible-sounding next token even when the plausible answer is wrong \u2014 this is called ', Term('hallucination', 'hallucination'),
            ' (or sometimes ', Term('confabulation', 'confabulation'), '). Here are five failure modes every student should recognize.'
          ),
          h('div', { style: { display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' } },
            HALLUCINATION_GALLERY.map(function(item, i) {
              var on = i === idx;
              return h('button', {
                key: i,
                onClick: function() { setIdx(i); setRevealed(false); },
                style: {
                  background: on ? COLORS.bad : '#fff',
                  color: on ? '#fff' : COLORS.subtext,
                  border: '1.5px solid ' + (on ? COLORS.bad : COLORS.border),
                  padding: '6px 12px', borderRadius: '18px', fontWeight: 600, fontSize: '11px',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px',
                  transition: 'all .15s ease'
                }
              },
                h('span', { 'aria-hidden': 'true' }, item.icon),
                item.category
              );
            })
          ),
          h('div', { className: 'llm-lit-fade-in', style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.bad }) },
            // Category header with icon
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' } },
              h('div', { style: {
                width: '40px', height: '40px', borderRadius: '10px',
                background: hexToRGBA(COLORS.bad, 0.12),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px'
              } }, g.icon),
              h('div', null,
                h('div', { style: { fontSize: '11px', color: COLORS.bad, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em' } }, g.category),
                h('div', { style: { fontSize: '13px', color: COLORS.muted } },
                  h('strong', null, 'You asked: '), g.question)
              )
            ),
            // AI-answer "speech bubble" card with a confidence bar
            h('div', { style: {
              background: '#fff', border: '1px solid ' + COLORS.border,
              borderRadius: '12px', padding: '12px 14px',
              fontSize: '13px', lineHeight: 1.6, color: COLORS.text,
              marginBottom: '10px',
              position: 'relative',
              boxShadow: '0 1px 3px rgba(15,23,42,.05)'
            } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
                h('div', { style: { fontSize: '11px', color: COLORS.muted, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' } },
                  h('span', null, '\uD83E\uDD16'), 'AI SAYS'),
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
                  h('div', { style: { width: '60px', height: '5px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' } },
                    h('div', { style: {
                      width: g.confidence + '%', height: '100%',
                      background: 'linear-gradient(90deg, #fbbf24, #dc2626)',
                      transition: 'width .5s ease'
                    } })
                  ),
                  h('span', { style: { fontSize: '10px', color: COLORS.muted, fontWeight: 600 } }, g.confidence + '% "sure"')
                )
              ),
              g.aiAnswer
            ),
            // Live try-it-yourself: ask Gemini the same question NOW.
            // This lets students see whether the failure still happens, or
            // whether the model got better — either answer teaches something.
            hasLiveAI && h('div', { style: { marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
              h('button', {
                onClick: askLive,
                disabled: askBusy,
                style: btn(COLORS.accent2, '#fff', askBusy),
                title: 'Send this exact question to Gemini right now and see what comes back'
              }, askBusy ? '\u23F3 Asking Gemini...' : (liveAsk[g.category] ? '\u21BA Ask again' : '\u2696\uFE0F Ask Gemini this yourself')),
              liveAsk[g.category] && h('span', { style: { fontSize: '11px', color: COLORS.muted, fontStyle: 'italic' } }, 'Compare the live answer to the canned one above.')
            ),
            liveAsk[g.category] && h('div', { className: 'llm-lit-fade-in', style: {
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderLeft: '4px solid ' + COLORS.accent2,
              borderRadius: '10px', padding: '12px 14px', marginBottom: '10px',
              maxHeight: '260px', overflowY: 'auto'
            } },
              h('div', { style: { fontSize: '11px', color: COLORS.accent2, fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.05em' } },
                '\uD83E\uDD16 Live Gemini response'),
              h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, liveAsk[g.category])
            ),
            !revealed && h('button', {
              onClick: function() { setRevealed(true); },
              style: btn(COLORS.bad, '#fff', false)
            }, 'Reveal: what went wrong'),
            revealed && h('div', { className: 'llm-lit-fade-in', style: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 14px' } },
              h('div', { style: { fontSize: '12px', fontWeight: 800, color: COLORS.bad, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' } },
                '\u26A0\uFE0F Why it fails'),
              h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.6, marginBottom: '12px' } }, g.whyItFails),
              h('div', { style: { fontSize: '12px', fontWeight: 800, color: COLORS.good, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' } },
                '\u2713 What you can do'),
              h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.6 } }, g.studentAction)
            )
          ),
          h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'space-between', marginTop: '12px' } },
            h('button', { onClick: prev, style: btn('#e2e8f0', COLORS.text, false) }, '\u2190 Previous'),
            h('div', { style: { fontSize: '12px', color: COLORS.muted, alignSelf: 'center' } }, (idx + 1) + ' / ' + HALLUCINATION_GALLERY.length),
            h('button', { onClick: next, style: btn('#e2e8f0', COLORS.text, false) }, 'Next \u2192')
          ),
          sectionFooter('fails')
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 3: Prompt Craft
      // ═══════════════════════════════════════════════════════
      function PromptCraft() {
        var pairIdxTuple = useState(0);
        var pairIdx = pairIdxTuple[0]; var setPairIdx = pairIdxTuple[1];
        var showStrongTuple = useState(false);
        var showStrong = showStrongTuple[0]; var setShowStrong = showStrongTuple[1];
        var pair = PROMPT_PAIRS[pairIdx];

        // A/B live comparison state: side-by-side Gemini outputs for weak + strong.
        var abBusyTuple = useState(false);
        var abBusy = abBusyTuple[0]; var setAbBusy = abBusyTuple[1];
        var abResultTuple = useState({}); // keyed by pairIdx -> { weak, strong }
        var abResult = abResultTuple[0]; var setAbResult = abResultTuple[1];

        function runAB() {
          if (!hasLiveAI) return;
          setAbBusy(true);
          // Fire both calls in parallel so the student sees true side-by-side timing.
          // jsonMode=false for both — we want natural language, temp 0.7 balanced.
          Promise.all([
            callGemini(pair.weak,   false, false, 0.7).then(function(x) { return (x || '').trim() || '(empty)'; }).catch(function() { return '(call failed)'; }),
            callGemini(pair.strong, false, false, 0.7).then(function(x) { return (x || '').trim() || '(empty)'; }).catch(function() { return '(call failed)'; })
          ]).then(function(results) {
            setAbResult(function(prev) {
              var next = Object.assign({}, prev);
              next[pairIdx] = { weak: results[0], strong: results[1] };
              return next;
            });
            bump('promptIterations', 1);
          }).then(function() {
            setAbBusy(false);
          });
        }
        var currentAB = abResult[pairIdx];

        // Template builder state: which task is picked + values per slot.
        var tplIdxTuple = useState(-1);   // -1 = no template selected yet
        var tplIdx = tplIdxTuple[0]; var setTplIdx = tplIdxTuple[1];
        var tplValsTuple = useState({});  // keyed by slot.key
        var tplVals = tplValsTuple[0]; var setTplVals = tplValsTuple[1];
        function setTplSlot(key, val) {
          setTplVals(function(prev) {
            var next = Object.assign({}, prev); next[key] = val; return next;
          });
        }
        function pickTemplate(idx) {
          setTplIdx(idx);
          // Seed with defaults from chip slots so the preview renders immediately.
          var seed = {};
          var tpl = PROMPT_TEMPLATES[idx];
          if (tpl) {
            tpl.slots.forEach(function(s) { if (s.default) seed[s.key] = s.default; });
          }
          setTplVals(seed);
        }
        // Assemble the composed prompt from the template's `parts` array.
        // Conditionals: { if: 'slotKey', then: [...], else: [...] } keep the
        // prompt natural when optional slots are left blank.
        function assembleTemplate(tpl, vals) {
          if (!tpl) return '';
          var out = '';
          function append(parts) {
            for (var i = 0; i < parts.length; i++) {
              var p = parts[i];
              if (typeof p === 'string') { out += p; continue; }
              if (p && p.slot) {
                var v = (vals[p.slot] || '').trim();
                out += v || ('[' + p.slot + ']');
                continue;
              }
              if (p && p.if) {
                var val = (vals[p.if] || '').trim();
                append(val ? (p.then || []) : (p.else || []));
              }
            }
          }
          append(tpl.parts);
          return out;
        }
        // Flag slots that are required but empty — these block the prompt.
        function missingRequired(tpl, vals) {
          if (!tpl) return [];
          return tpl.slots.filter(function(s) {
            return s.required && !((vals[s.key] || '').trim());
          });
        }

        // Live iteration workshop
        var userPromptTuple = useState('');
        var userPrompt = userPromptTuple[0]; var setUserPrompt = userPromptTuple[1];
        var liveOutputTuple = useState('');
        var liveOutput = liveOutputTuple[0]; var setLiveOutput = liveOutputTuple[1];
        var liveBusyTuple = useState(false);
        var liveBusy = liveBusyTuple[0]; var setLiveBusy = liveBusyTuple[1];
        var critiqueTuple = useState(null);
        var critique = critiqueTuple[0]; var setCritique = critiqueTuple[1];

        var runLive = useCallback(async function() {
          if (!userPrompt.trim()) return;
          if (!hasLiveAI) { addToast('Live AI not available. Try writing the prompt out — the analysis still helps.', 'info'); return; }
          setLiveBusy(true);
          setLiveOutput('');
          try {
            // jsonMode=false — we want natural language.
            var out = await callGemini(userPrompt, false, false, 0.7);
            setLiveOutput((out || '').trim() || '(empty response)');
            bump('promptIterations', 1);
            awardXP(5, 'Iterated a prompt');
          } catch (e) {
            console.error('[llmLiteracy] Prompt live run failed:', e);
            addToast('Live call failed. Check console.', 'warn');
          } finally {
            setLiveBusy(false);
          }
        }, [userPrompt, hasLiveAI]);

        // Local heuristic critique — works offline, teaches the five patterns
        // by pointing at which are present or missing in the current prompt.
        function critiqueLocally(text) {
          var t = (text || '').toLowerCase();
          var checks = [
            { name: 'Role',        hit: /\byou are |act as |pretend you|as a |take the role/.test(t),
              hint: 'Try adding: "You are a patient middle-school tutor..." — tells the AI who to be.' },
            { name: 'Context',     hit: /\bi am |i'm |my (class|teacher|assignment|grade)|for my |7th grade|8th grade|9th grade|10th grade|11th grade|12th grade|middle school|high school/.test(t),
              hint: 'Try adding: "I am a 9th grader studying for..." — tells the AI about YOU.' },
            { name: 'Constraints', hit: /\bdon'?t |do not |no more than |only |exactly |without |avoid |keep it short|maximum|max /.test(t),
              hint: 'Try adding a DON\'T: "Don\'t write the whole essay for me." Constraints prevent unhelpful outputs.' },
            { name: 'Format',     hit: /\blist|bullet|table|step[- ]by[- ]step|numbered|one sentence|\d+ (sentences?|words?|bullets?|paragraphs?)|format/.test(t),
              hint: 'Try adding a format: "Give me a 3-step list" or "One sentence only" — controls how easy the answer is to USE.' },
            { name: 'Examples',    hit: /\bfor example|like this|here'?s one|sample|such as:|e\.g\./.test(t),
              hint: 'Try adding a sample: "Here\'s one I did: [example]. Do the next one in the same style."' }
          ];
          var length = text.trim().length;
          var lengthNote = length < 40 ? 'Your prompt is short. Short prompts almost always get shallow answers — try adding at least 2 of the patterns below.'
                        : (length > 600 ? 'Your prompt is long. That is fine IF every piece earns its place. Re-read and cut anything the AI doesn\'t need.'
                                        : null);
          return { checks: checks, lengthNote: lengthNote };
        }
        function runCritique() {
          if (!userPrompt.trim()) { addToast('Write a prompt first, then click Critique.', 'info'); return; }
          setCritique(critiqueLocally(userPrompt));
          bump('promptIterations', 1);
          announceToSR('Prompt critique updated');
        }

        // Copy a string to the clipboard. Falls back to a textarea hack for
        // environments where navigator.clipboard is blocked (file://, old WebViews).
        function copyToClipboard(text, label) {
          try {
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(function() {
                addToast((label || 'Copied') + ' to clipboard', 'success');
              }, function() { fallbackCopy(text, label); });
            } else {
              fallbackCopy(text, label);
            }
          } catch (e) { fallbackCopy(text, label); }
        }
        function fallbackCopy(text, label) {
          try {
            var ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.top = '-9999px';
            document.body.appendChild(ta); ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            addToast((label || 'Copied') + ' to clipboard', 'success');
          } catch (e) {
            addToast('Copy failed — select and copy manually.', 'warn');
          }
        }

        return h('div', { style: { padding: '20px', maxWidth: '960px', margin: '0 auto' } },
          topBar('3. Prompt Craft'),
          teacherNote('prompt'),
          h('p', { style: { fontSize: '13px', color: COLORS.subtext, lineHeight: 1.5, marginTop: 0 } },
            'A weak prompt gives you a shallow answer, fast. A strong prompt gives you a useful answer, still fast. The difference is craft — and it is very learnable.'
          ),

          // Pattern cards
          h('div', { style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.accent }) },
            h('h3', { style: { margin: '0 0 8px', fontSize: '16px', color: COLORS.accent } }, 'The five patterns'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px' } },
              PROMPT_PATTERNS.map(function(p) {
                return h('div', { key: p.name, style: { background: '#fff', border: '1px solid ' + COLORS.border, borderRadius: '8px', padding: '10px' } },
                  h('div', { style: { fontSize: '18px', marginBottom: '2px' } }, p.icon),
                  h('div', { style: { fontWeight: 700, fontSize: '13px', color: COLORS.accent, marginBottom: '3px' } }, p.name),
                  h('div', { style: { fontSize: '11px', color: COLORS.subtext, lineHeight: 1.4 } }, p.desc)
                );
              })
            )
          ),

          // Prompt template builder — pick a task, fill in slots, get a ready-to-run prompt.
          (function() {
            var tpl = tplIdx >= 0 ? PROMPT_TEMPLATES[tplIdx] : null;
            var composed = assembleTemplate(tpl, tplVals);
            var missing = missingRequired(tpl, tplVals);
            var ready = tpl && missing.length === 0;
            return h('div', { style: Object.assign({}, cardStyle, { borderLeft: '4px solid #f59e0b' }) },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' } },
                h('div', { style: { width: '36px', height: '36px', borderRadius: '10px', background: hexToRGBA('#f59e0b', 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' } }, '\uD83E\uDDF0'),
                h('h3', { style: { margin: 0, fontSize: '16px', color: '#b45309' } }, 'Prompt template builder')
              ),
              h('p', { style: { margin: '0 0 10px', fontSize: '12px', color: COLORS.subtext, lineHeight: 1.5 } },
                'Pick a task. Fill in the blanks. You\u2019ll end up with a prompt that uses all five patterns \u2014 without having to remember them.'
              ),
              // Template picker chips
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', marginBottom: tpl ? '14px' : '0' } },
                PROMPT_TEMPLATES.map(function(t, i) {
                  var on = i === tplIdx;
                  return h('button', {
                    key: t.id,
                    onClick: function() { pickTemplate(i); },
                    className: 'llm-lit-tile',
                    style: {
                      background: on ? hexToRGBA(t.color, 0.1) : '#fff',
                      border: '1.5px solid ' + (on ? t.color : COLORS.border),
                      borderRadius: '10px', padding: '10px 12px', cursor: 'pointer',
                      textAlign: 'left', display: 'flex', gap: '8px', alignItems: 'center'
                    },
                    'aria-pressed': on ? 'true' : 'false'
                  },
                    h('div', { style: { fontSize: '20px', flexShrink: 0 } }, t.icon),
                    h('div', { style: { flex: 1, minWidth: 0 } },
                      h('div', { style: { fontSize: '13px', fontWeight: 700, color: t.color, letterSpacing: '-.01em' } }, t.label)
                    )
                  );
                })
              ),
              // Slot inputs for the selected template
              tpl && h('div', { className: 'llm-lit-fade-in' },
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginBottom: '12px' } },
                  tpl.slots.map(function(s) {
                    var val = tplVals[s.key] || '';
                    var isMissing = s.required && !val.trim();
                    var commonLabel = h('label', {
                      htmlFor: 'tpl-' + s.key,
                      style: { display: 'block', fontSize: '11px', fontWeight: 700, color: isMissing ? COLORS.bad : COLORS.subtext, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '3px' }
                    }, s.label, s.required && h('span', { 'aria-hidden': 'true', style: { color: COLORS.bad } }, ' *'));
                    if (s.kind === 'chips') {
                      return h('div', { key: s.key, style: { gridColumn: 'span 1' } },
                        commonLabel,
                        h('div', { id: 'tpl-' + s.key, style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } },
                          s.options.map(function(opt) {
                            var on = val === opt;
                            return h('button', {
                              key: opt,
                              type: 'button',
                              onClick: function() { setTplSlot(s.key, opt); },
                              style: {
                                background: on ? tpl.color : '#fff',
                                color: on ? '#fff' : COLORS.subtext,
                                border: '1px solid ' + (on ? tpl.color : COLORS.border),
                                padding: '5px 10px', borderRadius: '14px',
                                fontSize: '11px', fontWeight: 600, cursor: 'pointer'
                              }
                            }, opt);
                          })
                        )
                      );
                    }
                    if (s.kind === 'textarea') {
                      return h('div', { key: s.key, style: { gridColumn: '1 / -1' } },
                        commonLabel,
                        h('textarea', {
                          id: 'tpl-' + s.key,
                          value: val,
                          onChange: function(e) { setTplSlot(s.key, e.target.value); },
                          placeholder: s.placeholder,
                          rows: 4,
                          style: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontFamily: 'monospace', fontSize: '12px', border: '1px solid ' + (isMissing ? COLORS.bad : COLORS.border), borderRadius: '8px', resize: 'vertical' }
                        })
                      );
                    }
                    return h('div', { key: s.key },
                      commonLabel,
                      h('input', {
                        id: 'tpl-' + s.key,
                        type: 'text',
                        value: val,
                        onChange: function(e) { setTplSlot(s.key, e.target.value); },
                        placeholder: s.placeholder,
                        style: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: '13px', border: '1px solid ' + (isMissing ? COLORS.bad : COLORS.border), borderRadius: '8px' }
                      })
                    );
                  })
                ),
                // Composed preview
                h('div', { style: { background: '#fff', border: '1px solid ' + COLORS.border, borderLeft: '4px solid ' + tpl.color, borderRadius: '8px', padding: '12px', marginBottom: '10px' } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' } },
                    h('div', { style: { fontSize: '11px', color: tpl.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em' } },
                      '\uD83D\uDCDC Composed prompt'),
                    !ready && h('div', { style: { fontSize: '11px', color: COLORS.bad, fontStyle: 'italic' } },
                      'Fill in ' + missing.length + ' required slot' + (missing.length === 1 ? '' : 's'))
                  ),
                  h('div', { style: { fontFamily: 'monospace', fontSize: '12px', color: COLORS.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' } },
                    composed
                  )
                ),
                h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
                  h('button', {
                    onClick: function() {
                      setUserPrompt(composed);
                      setLiveOutput('');
                      setCritique(null);
                      setTimeout(function() {
                        var el = document.getElementById('llm-literacy-workshop');
                        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 50);
                      announceToSR('Composed prompt loaded into workshop');
                    },
                    disabled: !ready,
                    style: btn(tpl.color, '#fff', !ready),
                    title: 'Load into the workshop below to run it live or keep iterating'
                  }, '\u2193 Load into workshop'),
                  h('button', {
                    onClick: function() { copyToClipboard(composed, 'Prompt'); },
                    disabled: !ready,
                    style: btn('#e2e8f0', COLORS.text, !ready)
                  }, '\uD83D\uDCCB Copy'),
                  h('button', {
                    onClick: function() { setTplIdx(-1); setTplVals({}); },
                    style: btn('#fee2e2', '#991b1b', false)
                  }, '\u21BA Clear template')
                )
              )
            );
          })(),

          // Before / after pairs
          h('div', { style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.accent2 }) },
            h('h3', { style: { margin: '0 0 6px', fontSize: '16px', color: COLORS.accent2 } }, 'Weak vs. strong: three examples'),
            h('div', { style: { display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' } },
              PROMPT_PAIRS.map(function(_, i) {
                var on = i === pairIdx;
                return h('button', {
                  key: i,
                  onClick: function() { setPairIdx(i); setShowStrong(false); },
                  style: {
                    background: on ? COLORS.accent2 : '#e2e8f0',
                    color: on ? '#fff' : COLORS.subtext,
                    border: 'none', padding: '6px 10px', borderRadius: '14px', fontWeight: 600, fontSize: '11px', cursor: 'pointer'
                  }
                }, 'Goal ' + (i + 1));
              })
            ),
            h('div', { style: { fontSize: '12px', color: COLORS.muted, marginBottom: '8px' } },
              h('strong', null, 'Goal: '), pair.goal
            ),
            h('div', { style: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' } },
              h('div', { style: { fontSize: '11px', color: COLORS.bad, fontWeight: 700, marginBottom: '3px' } }, '\u2717 WEAK PROMPT'),
              h('div', { style: { fontFamily: 'monospace', fontSize: '12px', color: COLORS.text } }, pair.weak)
            ),
            !showStrong && h('button', { onClick: function() { setShowStrong(true); bump('promptIterations', 1); }, style: btn(COLORS.accent2, '#fff', false) }, 'Show strong version \u2192'),
            showStrong && h('div', null,
              h('div', { style: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px', position: 'relative' } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px', gap: '6px', flexWrap: 'wrap' } },
                  h('div', { style: { fontSize: '11px', color: COLORS.good, fontWeight: 700 } }, '\u2713 STRONG PROMPT'),
                  h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                    hasLiveAI && h('button', {
                      onClick: function() {
                        setUserPrompt(pair.strong);
                        setLiveOutput('');
                        setCritique(null);
                        // Scroll the workshop into view after the state commits.
                        setTimeout(function() {
                          var el = document.getElementById('llm-literacy-workshop');
                          if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 50);
                        announceToSR('Strong prompt loaded into the workshop. Press Run with Gemini to try it.');
                      },
                      style: { background: COLORS.accent, color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' },
                      title: 'Load this prompt into the workshop below so you can run it with Gemini'
                    }, '\u2193 Load into workshop'),
                    h('button', {
                      onClick: function() { copyToClipboard(pair.strong, 'Prompt'); },
                      style: { background: COLORS.good, color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' },
                      title: 'Copy this prompt to try in your own AI tool'
                    }, '\uD83D\uDCCB Copy')
                  )
                ),
                h('div', { style: { fontFamily: 'monospace', fontSize: '12px', color: COLORS.text, lineHeight: 1.6 } }, pair.strong)
              ),
              h('div', { style: { background: '#fff', border: '1px solid ' + COLORS.border, borderRadius: '8px', padding: '10px 12px', marginBottom: '10px' } },
                h('div', { style: { fontSize: '11px', color: COLORS.subtext, fontWeight: 700, marginBottom: '6px' } }, 'WHAT CHANGED'),
                h('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: COLORS.text, lineHeight: 1.6 } },
                  pair.changes.map(function(c, i) { return h('li', { key: i }, c); })
                )
              ),
              // A/B live comparison — run both prompts simultaneously and see
              // the output gap. This is the "aha" moment of the whole section.
              hasLiveAI && h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' } },
                h('button', {
                  onClick: runAB,
                  disabled: abBusy,
                  style: btn(COLORS.accent2, '#fff', abBusy),
                  title: 'Run both prompts at the same time and compare what Gemini produces'
                }, abBusy ? '\u23F3 Running both...' : (currentAB ? '\u21BA Re-run A/B' : '\uD83C\uDFAF Run A/B: weak vs strong live')),
                currentAB && h('span', { style: { fontSize: '11px', color: COLORS.muted, fontStyle: 'italic' } }, 'Compare the two columns below.')
              ),
              currentAB && h('div', { className: 'llm-lit-fade-in', style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' } },
                h('div', { style: { background: '#fff', border: '1px solid #fecaca', borderLeft: '4px solid ' + COLORS.bad, borderRadius: '8px', padding: '10px 12px' } },
                  h('div', { style: { fontSize: '11px', color: COLORS.bad, fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.05em' } }, '\u2717 From WEAK prompt'),
                  h('div', { style: { fontSize: '12.5px', color: COLORS.text, lineHeight: 1.55, whiteSpace: 'pre-wrap', maxHeight: '280px', overflowY: 'auto' } }, currentAB.weak)
                ),
                h('div', { style: { background: '#fff', border: '1px solid #bbf7d0', borderLeft: '4px solid ' + COLORS.good, borderRadius: '8px', padding: '10px 12px' } },
                  h('div', { style: { fontSize: '11px', color: COLORS.good, fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.05em' } }, '\u2713 From STRONG prompt'),
                  h('div', { style: { fontSize: '12.5px', color: COLORS.text, lineHeight: 1.55, whiteSpace: 'pre-wrap', maxHeight: '280px', overflowY: 'auto' } }, currentAB.strong)
                )
              )
            )
          ),

          // Live iteration workshop
          h('div', { id: 'llm-literacy-workshop', style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.good }) },
            h('h3', { style: { margin: '0 0 6px', fontSize: '16px', color: COLORS.good } }, 'Your turn: iterate a prompt live'),
            h('p', { style: { margin: '0 0 10px', fontSize: '12px', color: COLORS.subtext, lineHeight: 1.5 } },
              'Write a prompt below. Run it. Look at the output. Edit the prompt using the five patterns. Run again. You\'re looking for the output to improve — or for you to understand WHY the output is shaped the way it is.'
            ),
            h('textarea', {
              value: userPrompt,
              onChange: function(e) { setUserPrompt(e.target.value); },
              placeholder: 'Try: "Explain why the ocean is salty to a curious 7th grader who already knows what an atom is. Use no more than 4 sentences."',
              rows: 4,
              style: { width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid ' + COLORS.border, borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' },
              'aria-label': 'Your prompt'
            }),
            h('div', { style: { marginTop: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
              h('button', {
                onClick: runCritique,
                disabled: !userPrompt.trim(),
                style: btn(COLORS.accent, '#fff', !userPrompt.trim()),
                title: 'Check which of the five patterns your prompt uses (no AI call needed)'
              }, '\uD83D\uDD0D Critique my prompt'),
              h('button', {
                onClick: runLive,
                disabled: liveBusy || !userPrompt.trim() || !hasLiveAI,
                style: btn(COLORS.good, '#fff', liveBusy || !userPrompt.trim() || !hasLiveAI)
              }, liveBusy ? '\u23F3 Running...' : '\u25B6 Run with Gemini'),
              userPrompt.trim() && h('button', {
                onClick: function() { copyToClipboard(userPrompt, 'Your prompt'); },
                style: btn('#e2e8f0', COLORS.text, false),
                title: 'Copy your prompt to use elsewhere'
              }, '\uD83D\uDCCB Copy'),
              !hasLiveAI && h('span', { style: { fontSize: '11px', color: COLORS.muted } }, 'Live AI unavailable — the critique still works.')
            ),
            critique && (function() {
              var hits = critique.checks.filter(function(c) { return c.hit; }).length;
              var total = critique.checks.length;
              var pct = hits / total;
              // SVG ring: 44 radius, 276 circumference
              var C = 2 * Math.PI * 44;
              var dashOffset = C * (1 - pct);
              var ringColor = hits >= 4 ? COLORS.good : (hits >= 2 ? COLORS.accent : COLORS.warn);
              var label = hits >= 4 ? 'Strong' : (hits >= 2 ? 'Getting there' : 'Thin');
              return h('div', { className: 'llm-lit-fade-in', style: { marginTop: '12px', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px', padding: '12px 14px' } },
                h('div', { style: { display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' } },
                  // Ring
                  h('div', { style: { position: 'relative', width: '104px', height: '104px', flexShrink: 0 } },
                    h('svg', { width: '104', height: '104', viewBox: '0 0 104 104', style: { transform: 'rotate(-90deg)' }, 'aria-hidden': 'true' },
                      h('circle', { cx: '52', cy: '52', r: '44', fill: 'none', stroke: '#f1f5f9', strokeWidth: '10' }),
                      h('circle', {
                        cx: '52', cy: '52', r: '44', fill: 'none',
                        stroke: ringColor, strokeWidth: '10',
                        strokeLinecap: 'round',
                        strokeDasharray: C.toString(),
                        strokeDashoffset: dashOffset.toString(),
                        style: { transition: 'stroke-dashoffset .5s ease, stroke .3s ease' }
                      })
                    ),
                    h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                      h('div', { style: { fontSize: '26px', fontWeight: 800, color: ringColor, lineHeight: 1 } }, hits + '/' + total),
                      h('div', { style: { fontSize: '10px', color: COLORS.muted, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '.05em' } }, 'patterns')
                    )
                  ),
                  h('div', { style: { flex: 1, minWidth: '180px' } },
                    h('div', { style: { fontSize: '11px', color: COLORS.accent, fontWeight: 700, marginBottom: '4px' } }, '\uD83D\uDD0D CRITIQUE'),
                    h('div', { style: { fontSize: '15px', fontWeight: 700, color: ringColor, marginBottom: '4px' } }, label + ' prompt'),
                    critique.lengthNote && h('div', { style: { fontSize: '12px', color: COLORS.subtext, lineHeight: 1.45 } }, critique.lengthNote)
                  )
                ),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' } },
                  critique.checks.map(function(c) {
                    return h('div', { key: c.name, style: {
                      background: c.hit ? '#f0fdf4' : '#fff',
                      border: '1px solid ' + (c.hit ? '#bbf7d0' : '#fecaca'),
                      borderRadius: '8px',
                      padding: '8px 10px',
                      display: 'flex', flexDirection: 'column', gap: '3px',
                      transition: 'background .2s ease'
                    } },
                      h('div', { style: { fontSize: '12px', fontWeight: 700, color: c.hit ? COLORS.good : COLORS.bad, display: 'flex', alignItems: 'center', gap: '6px' } },
                        h('span', { style: {
                          width: '18px', height: '18px', borderRadius: '50%',
                          background: c.hit ? COLORS.good : COLORS.bad, color: '#fff',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700
                        } }, c.hit ? '\u2713' : '\u2717'),
                        c.name),
                      !c.hit && h('div', { style: { fontSize: '11px', color: COLORS.subtext, lineHeight: 1.4 } }, c.hint)
                    );
                  })
                ),
                h('div', { style: { marginTop: '8px', fontSize: '11px', color: COLORS.muted, fontStyle: 'italic' } },
                  'This critique uses keyword heuristics, not AI. It can miss creative phrasings. Use it as a checklist prompt, not a grade.'
                )
              );
            })(),
            liveOutput && h('div', { style: { marginTop: '10px', background: '#fff', border: '1px solid ' + COLORS.border, borderRadius: '8px', padding: '10px 12px', maxHeight: '260px', overflowY: 'auto' } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } },
                h('div', { style: { fontSize: '11px', color: COLORS.good, fontWeight: 700 } }, '\uD83E\uDD16 OUTPUT'),
                h('button', {
                  onClick: function() { copyToClipboard(liveOutput, 'AI output'); },
                  style: { background: '#e2e8f0', color: COLORS.text, border: 'none', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }
                }, '\uD83D\uDCCB Copy')
              ),
              h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, liveOutput)
            )
          ),
          sectionFooter('prompt')
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 4: Hallucination Spotter
      // ═══════════════════════════════════════════════════════
      function HallucinationSpotter() {
        var passageIdxTuple = useState(0);
        var passageIdx = passageIdxTuple[0]; var setPassageIdx = passageIdxTuple[1];
        var passage = SPOTTER_PASSAGES[passageIdx];

        var picksTuple = useState({});
        var picks = picksTuple[0]; var setPicks = picksTuple[1];
        var checkedTuple = useState(false);
        var checked = checkedTuple[0]; var setChecked = checkedTuple[1];
        var scoreTuple = useState(null);
        var score = scoreTuple[0]; var setScore = scoreTuple[1];
        var hintsTuple = useState(0);
        var hintsUsed = hintsTuple[0]; var setHintsUsed = hintsTuple[1];

        function togglePick(i) {
          if (checked) return;
          var next = Object.assign({}, picks);
          if (next[i]) delete next[i]; else next[i] = true;
          setPicks(next);
        }

        function check() {
          setChecked(true);
          var errors = passage.segments.filter(function(s) { return s.error; }).length;
          var hits = 0, misses = 0, falsePos = 0;
          passage.segments.forEach(function(s, i) {
            if (s.error && picks[i]) hits++;
            else if (s.error && !picks[i]) misses++;
            else if (!s.error && picks[i]) falsePos++;
          });
          var perfect = (hits === errors && falsePos === 0);
          var unassisted = (hintsUsed === 0);
          setScore({ hits: hits, misses: misses, falsePos: falsePos, errors: errors, perfect: perfect, hintsUsed: hintsUsed });
          announceToSR('Checked: ' + hits + ' of ' + errors + ' errors caught, ' + falsePos + ' incorrect flags' + (hintsUsed > 0 ? ', ' + hintsUsed + ' hint(s) used' : ''));
          if (perfect && unassisted) {
            bump('spotterPerfect', 1);
            awardXP(20, 'Perfect hallucination spot (unassisted)');
            addToast('Perfect \u2014 no hints, no misses.', 'success');
          } else if (perfect) {
            awardXP(8, 'Complete spot with hints');
            addToast('All errors caught (with ' + hintsUsed + ' hint' + (hintsUsed === 1 ? '' : 's') + '). Try again unassisted for the perfect bonus.', 'success');
          }
        }

        function reset() {
          setPicks({}); setChecked(false); setScore(null); setHintsUsed(0);
        }

        function switchPassage(i) {
          setPassageIdx(i); setPicks({}); setChecked(false); setScore(null); setHintsUsed(0);
        }

        // Reveal one currently-unrevealed error per click. Using hints forfeits
        // the "perfect" XP bonus (recorded on check()) but helps students who
        // are stuck rather than leaving them guessing.
        function useHint() {
          var errorIdxs = [];
          passage.segments.forEach(function(s, i) { if (s.error) errorIdxs.push(i); });
          var remaining = errorIdxs.filter(function(i) { return !picks[i]; });
          if (remaining.length === 0) { addToast('No more errors to hint.', 'info'); return; }
          var pickIdx = remaining[Math.floor(Math.random() * remaining.length)];
          var nextPicks = Object.assign({}, picks); nextPicks[pickIdx] = true;
          setPicks(nextPicks);
          setHintsUsed(hintsUsed + 1);
          announceToSR('Hint revealed an error.');
        }

        var errorsCount = passage.segments.filter(function(s) { return s.error; }).length;

        return h('div', { style: { padding: '20px', maxWidth: '820px', margin: '0 auto' } },
          topBar('4. Hallucination Spotter'),
          teacherNote('spotter'),
          h('p', { style: { fontSize: '13px', color: COLORS.subtext, lineHeight: 1.5, marginTop: 0 } },
            'This passage is AI-generated, and ' + errorsCount + ' phrases are wrong. Click the phrases you think are hallucinated. When you\'re done, check your answers.'
          ),
          h('div', { style: { display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' } },
            SPOTTER_PASSAGES.map(function(p, i) {
              var on = i === passageIdx;
              return h('button', {
                key: i,
                onClick: function() { switchPassage(i); },
                style: {
                  background: on ? COLORS.good : '#e2e8f0',
                  color: on ? '#fff' : COLORS.subtext,
                  border: 'none', padding: '6px 10px', borderRadius: '14px', fontWeight: 600, fontSize: '11px', cursor: 'pointer'
                }
              }, p.topic);
            })
          ),
          h('div', { style: Object.assign({}, cardStyle, { background: '#fff', lineHeight: 1.9 }) },
            passage.segments.map(function(seg, i) {
              var picked = !!picks[i];
              var isErr = seg.error;
              var bg = 'transparent', color = COLORS.text, border = 'none', cursor = checked ? 'default' : 'pointer';
              if (checked) {
                if (isErr && picked)       { bg = '#d1fae5'; border = '2px solid ' + COLORS.good; }
                else if (isErr && !picked) { bg = '#fee2e2'; border = '2px dashed ' + COLORS.bad; }
                else if (!isErr && picked) { bg = '#fef3c7'; border = '2px dashed ' + COLORS.warn; }
              } else if (picked) {
                bg = '#fef9c3'; border = '2px solid ' + COLORS.warn;
              }
              return h('span', {
                key: i,
                onClick: function() { togglePick(i); },
                onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePick(i); } },
                role: checked ? 'text' : 'button',
                tabIndex: checked ? -1 : 0,
                style: {
                  background: bg, border: border, color: color, cursor: cursor,
                  padding: '1px 3px', borderRadius: '4px', margin: '0 1px'
                },
                'aria-label': picked ? 'Marked as wrong: ' + seg.text : seg.text
              }, seg.text);
            })
          ),
          h('div', { style: { display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' } },
            !checked && h('button', { onClick: check, style: btn(COLORS.good, '#fff', false) }, 'Check my answers'),
            !checked && h('button', {
              onClick: useHint,
              style: btn('#fde68a', '#78350f', false),
              title: 'Reveal one error. Using any hints forfeits the perfect-score bonus \u2014 but helps if you\'re stuck.'
            }, '\uD83D\uDCA1 Hint' + (hintsUsed > 0 ? ' (' + hintsUsed + ' used)' : '')),
            checked && h('button', { onClick: reset, style: btn('#e2e8f0', COLORS.text, false) }, 'Try again'),
            !checked && hintsUsed > 0 && h('span', { style: { fontSize: '11px', color: COLORS.muted, fontStyle: 'italic' } }, 'Hints used \u2014 perfect bonus forfeited on this attempt. Reset and retry without hints to earn it.')
          ),
          checked && score && h('div', { style: { background: score.perfect ? '#f0fdf4' : '#fff7ed', border: '2px solid ' + (score.perfect ? '#bbf7d0' : '#fed7aa'), borderRadius: '10px', padding: '12px', marginBottom: '10px', textAlign: 'center' } },
            h('div', { style: { fontSize: '22px', fontWeight: 800, color: score.perfect ? COLORS.good : COLORS.warn, marginBottom: '4px' } },
              score.perfect ? '\uD83C\uDFAF Perfect' : (score.hits + ' of ' + score.errors + ' caught')),
            h('div', { style: { fontSize: '12px', color: COLORS.subtext } },
              score.falsePos > 0 ? (score.falsePos + ' false alarm' + (score.falsePos === 1 ? '' : 's') + '. False alarms matter — over-flagging real information is its own failure mode.')
                                  : (score.perfect ? 'You caught every seeded error with no false alarms. Keep this calibration — skepticism AND accuracy.' : 'You missed ' + score.misses + '. Scroll down for why each one sounded plausible.'))
          ),
          checked && h('div', { style: { background: '#f8fafc', border: '1px solid ' + COLORS.border, borderRadius: '8px', padding: '12px' } },
            h('div', { style: { fontSize: '12px', fontWeight: 700, color: COLORS.subtext, marginBottom: '6px' } }, 'LEGEND'),
            h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', marginBottom: '10px' } },
              h('span', null, h('span', { style: { background: '#d1fae5', padding: '1px 6px', border: '2px solid ' + COLORS.good, borderRadius: '4px' } }, 'caught'), ' correct'),
              h('span', null, h('span', { style: { background: '#fee2e2', padding: '1px 6px', border: '2px dashed ' + COLORS.bad, borderRadius: '4px' } }, 'missed'), ' error you didn\'t flag'),
              h('span', null, h('span', { style: { background: '#fef3c7', padding: '1px 6px', border: '2px dashed ' + COLORS.warn, borderRadius: '4px' } }, 'flagged but fine'), ' false alarm')
            ),
            h('div', { style: { fontSize: '12px', fontWeight: 700, color: COLORS.subtext, marginBottom: '4px' } }, 'WHY EACH ERROR WAS PLAUSIBLE'),
            passage.segments.map(function(s, i) {
              if (!s.error) return null;
              return h('div', { key: i, style: { marginTop: '6px', padding: '8px', background: '#fff', border: '1px solid ' + COLORS.border, borderRadius: '6px', fontSize: '12px', lineHeight: 1.5 } },
                h('strong', { style: { color: COLORS.bad } }, '"' + s.text + '" — '),
                s.reason
              );
            })
          ),
          sectionFooter('spotter')
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 5: UDL Rubric — scaffold vs substitute
      // ═══════════════════════════════════════════════════════
      function UDLRubric() {
        var idxTuple = useState(0);
        var idx = idxTuple[0]; var setIdx = idxTuple[1];
        var revealTuple = useState(false);
        var revealed = revealTuple[0]; var setRevealed = revealTuple[1];
        var choiceTuple = useState(null);
        var choice = choiceTuple[0]; var setChoice = choiceTuple[1];
        var s = UDL_SCENARIOS[idx];

        // ── Bring-your-own-scenario state ──
        var mySitTuple = useState('');
        var mySit = mySitTuple[0]; var setMySit = mySitTuple[1];
        var mySkillTuple = useState('');
        var mySkill = mySkillTuple[0]; var setMySkill = mySkillTuple[1];
        var myBarrierTuple = useState(null);      // 'mechanical' | 'cognitive' | null
        var myBarrier = myBarrierTuple[0]; var setMyBarrier = myBarrierTuple[1];
        var myCoachTuple = useState(null);        // live AI coach result
        var myCoach = myCoachTuple[0]; var setMyCoach = myCoachTuple[1];
        var myCoachBusyTuple = useState(false);
        var myCoachBusy = myCoachBusyTuple[0]; var setMyCoachBusy = myCoachBusyTuple[1];

        // Heuristic decision: if the barrier is mechanical, AI is likely a scaffold;
        // if cognitive and the skill IS the thing being practiced, AI likely becomes
        // a substitute. This is intentionally coarse — the point is to make the
        // student articulate skill + barrier before acting.
        function heuristicVerdict() {
          if (!mySit.trim() || !mySkill.trim() || !myBarrier) return null;
          var skillLooksCore = /\b(learn|practice|understand|write|solve|analyz|think|reason|compos|explain|remember|recall)\b/i.test(mySkill);
          if (myBarrier === 'mechanical') {
            return {
              verdict: 'scaffold',
              headline: 'This looks like a scaffold case.',
              body: 'The barrier you described sounds mechanical (slow typing, memory retrieval, formatting, organization). Using AI to remove that barrier is not the same as having AI do the skill itself. Go ahead \u2014 but keep the core thinking on you.'
            };
          }
          // cognitive barrier
          if (skillLooksCore) {
            return {
              verdict: 'substitute_risk',
              headline: 'Be careful \u2014 this leans toward substitute.',
              body: 'The barrier is cognitive, and the skill you named is exactly the kind of skill school is trying to build (thinking, composing, reasoning). Letting AI do this means you skip the practice. Consider: can AI COACH you through the skill instead of performing it for you? That flips it back to scaffold.'
            };
          }
          return {
            verdict: 'mixed',
            headline: 'Mixed \u2014 it depends on the skill.',
            body: 'The barrier is cognitive, but the skill you described may not be the one being practiced here. Re-read the assignment: what specific skill is it really testing? Use AI to reduce barriers to that specific skill, not to replace it.'
          };
        }

        function runMyCoach() {
          if (!hasLiveAI) { addToast('Live AI not available \u2014 but the heuristic below still gives you a direction.', 'info'); return; }
          if (!mySit.trim() || !mySkill.trim() || !myBarrier) { addToast('Fill in all three fields first.', 'info'); return; }
          setMyCoachBusy(true);
          setMyCoach(null);
          var meta =
            'You are a school psychologist coaching a student with learning differences on when to use AI. Be direct, concrete, and non-judgmental. Respond in exactly this format, no preamble:\n\n' +
            'VERDICT: (one word: scaffold, substitute, or mixed)\n' +
            'SCAFFOLD PATH: (2-3 concrete AI uses that would REMOVE a barrier without replacing the skill)\n' +
            'SUBSTITUTE TRAP: (1-2 ways the student might accidentally let AI do the skill itself)\n' +
            'NOTE: (one sentence of clinical honesty about what the student actually needs to practice)\n\n' +
            'Student situation: "' + mySit.trim() + '"\n' +
            'Skill they said they need to practice: "' + mySkill.trim() + '"\n' +
            'Barrier they named: ' + myBarrier + '\n';
          callGemini(meta, false, false, 0.4).then(function(out) {
            setMyCoach((out || '').trim() || '(no response)');
          }).catch(function(err) {
            console.error('[llmLiteracy] UDL coach failed:', err);
            addToast('Live coach failed. Heuristic below is still valid.', 'warn');
          }).then(function() {
            setMyCoachBusy(false);
          });
        }

        function resetMyScenario() {
          setMySit(''); setMySkill(''); setMyBarrier(null); setMyCoach(null);
        }

        var heuristic = heuristicVerdict();

        function next() {
          setIdx(function(x) { return (x + 1) % UDL_SCENARIOS.length; });
          setRevealed(false); setChoice(null);
        }
        function prev() {
          setIdx(function(x) { return (x - 1 + UDL_SCENARIOS.length) % UDL_SCENARIOS.length; });
          setRevealed(false); setChoice(null);
        }

        function commit(kind) {
          setChoice(kind);
          setRevealed(true);
          // Functional update + milestone check in one pass, to avoid stale-closure reads.
          if (!ctx.setToolData) { awardXP(3, 'UDL reflection'); return; }
          ctx.setToolData(function(prev) {
            var existing = (prev && prev.llmLiteracy) || {};
            var seen = Object.assign({}, existing.udlSeen || {});
            var firstTime = !seen[idx];
            seen[idx] = true;
            var reflections = Number(existing.udlReflections || 0) + 1;
            var td = Object.assign({}, existing, { udlSeen: seen, udlReflections: reflections });
            // Fire rewards as a side effect of this update.
            if (firstTime) awardXP(3, 'UDL reflection');
            if (firstTime && Object.keys(seen).length === UDL_SCENARIOS.length && !existing.udlAllDone) {
              td.udlAllDone = true;
              awardXP(15, 'Completed the UDL rubric');
              addToast('You worked through every scenario. Nice.', 'success');
            }
            return Object.assign({}, prev, { llmLiteracy: td });
          });
        }

        return h('div', { style: { padding: '20px', maxWidth: '820px', margin: '0 auto' } },
          topBar('5. When to Use AI — UDL rubric'),
          teacherNote('udl'),
          h('p', { style: { fontSize: '13px', color: COLORS.subtext, lineHeight: 1.5, marginTop: 0 } },
            'The question is not "is AI good or bad" \u2014 it\'s "does AI REMOVE a barrier to the skill I\'m practicing, or does it REPLACE the skill itself?" ',
            Term('scaffold', 'Scaffold'), ' = the first. ',
            Term('substitute', 'Substitute'), ' = the second.'
          ),
          h('div', { style: { display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' } },
            UDL_SCENARIOS.map(function(_, i) {
              var on = i === idx;
              return h('button', {
                key: i,
                onClick: function() { setIdx(i); setRevealed(false); setChoice(null); },
                style: {
                  background: on ? '#db2777' : '#e2e8f0',
                  color: on ? '#fff' : COLORS.subtext,
                  border: 'none', width: '28px', height: '28px', borderRadius: '50%', fontWeight: 700, fontSize: '12px', cursor: 'pointer'
                }
              }, (i + 1));
            })
          ),
          h('div', { style: Object.assign({}, cardStyle, { borderLeft: '4px solid #db2777' }) },
            h('div', { style: { fontSize: '11px', color: '#db2777', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '4px' } }, 'Scenario ' + (idx + 1)),
            h('div', { style: { fontSize: '15px', color: COLORS.text, lineHeight: 1.5, marginBottom: '14px', fontStyle: 'italic' } }, '"' + s.situation + '"'),

            !revealed && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' } },
              h('button', {
                onClick: function() { commit('scaffold'); },
                className: 'llm-lit-tile',
                style: {
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                  border: '2px solid #bbf7d0', borderRadius: '12px', padding: '16px', cursor: 'pointer', textAlign: 'left',
                  position: 'relative', overflow: 'hidden'
                }
              },
                h('div', { style: { width: '44px', height: '44px', borderRadius: '10px', background: hexToRGBA(COLORS.good, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '10px' } }, '\uD83E\uDEA1'),
                h('div', { style: { fontSize: '14px', fontWeight: 800, color: COLORS.good, marginBottom: '4px', letterSpacing: '-.01em' } }, 'Scaffold'),
                h('div', { style: { fontSize: '12px', fontWeight: 600, color: COLORS.good, marginBottom: '6px', opacity: 0.8 } }, 'Remove a barrier'),
                h('div', { style: { fontSize: '12px', color: COLORS.text, lineHeight: 1.5 } }, 'Use AI in a way that helps you DO the work yourself.')
              ),
              h('button', {
                onClick: function() { commit('substitute'); },
                className: 'llm-lit-tile',
                style: {
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
                  border: '2px solid #fecaca', borderRadius: '12px', padding: '16px', cursor: 'pointer', textAlign: 'left',
                  position: 'relative', overflow: 'hidden'
                }
              },
                h('div', { style: { width: '44px', height: '44px', borderRadius: '10px', background: hexToRGBA(COLORS.bad, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '10px' } }, '\uD83E\uDDF1'),
                h('div', { style: { fontSize: '14px', fontWeight: 800, color: COLORS.bad, marginBottom: '4px', letterSpacing: '-.01em' } }, 'Substitute'),
                h('div', { style: { fontSize: '12px', fontWeight: 600, color: COLORS.bad, marginBottom: '6px', opacity: 0.8 } }, 'Replace the skill'),
                h('div', { style: { fontSize: '12px', color: COLORS.text, lineHeight: 1.5 } }, 'Use AI to do the work FOR you.')
              )
            ),

            revealed && h('div', { className: 'llm-lit-fade-in' },
              choice && h('div', { style: {
                marginBottom: '10px', padding: '8px 12px',
                background: choice === 'scaffold' ? '#f0fdf4' : '#fef2f2',
                border: '1px solid ' + (choice === 'scaffold' ? '#bbf7d0' : '#fecaca'),
                borderRadius: '8px',
                fontSize: '12px', color: COLORS.subtext
              } },
                'Your instinct: ', h('strong', { style: { color: choice === 'scaffold' ? COLORS.good : COLORS.bad } },
                  (choice === 'scaffold' ? '\uD83E\uDEA1 scaffold' : '\uD83E\uDDF1 substitute')),
                '. Now compare both worked versions \u2014 there\'s no "wrong" pick, only clearer thinking about what the skill actually is.'
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginBottom: '10px' } },
                h('div', { style: {
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  borderLeft: '4px solid ' + COLORS.good,
                  borderRadius: '10px', padding: '12px'
                } },
                  h('div', { style: { fontSize: '11px', fontWeight: 800, color: COLORS.good, marginBottom: '6px', letterSpacing: '.05em' } }, '\uD83E\uDEA1 SCAFFOLD VERSION'),
                  h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.6 } }, s.scaffold)
                ),
                h('div', { style: {
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderLeft: '4px solid ' + COLORS.bad,
                  borderRadius: '10px', padding: '12px'
                } },
                  h('div', { style: { fontSize: '11px', fontWeight: 800, color: COLORS.bad, marginBottom: '6px', letterSpacing: '.05em' } }, '\uD83E\uDDF1 SUBSTITUTE VERSION'),
                  h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.6 } }, s.substitute)
                )
              ),
              h('div', { style: {
                background: '#eff6ff', border: '1px solid #bfdbfe',
                borderLeft: '4px solid ' + COLORS.accent2,
                borderRadius: '10px', padding: '12px'
              } },
                h('div', { style: { fontSize: '11px', fontWeight: 800, color: COLORS.accent2, marginBottom: '6px', letterSpacing: '.05em' } }, '\uD83D\uDD2C WHY THIS ONE MATTERS'),
                h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.6 } }, s.why)
              )
            )
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '10px' } },
            h('button', { onClick: prev, style: btn('#e2e8f0', COLORS.text, false) }, '\u2190 Previous'),
            h('div', { style: { fontSize: '12px', color: COLORS.muted, alignSelf: 'center' } }, (idx + 1) + ' / ' + UDL_SCENARIOS.length),
            h('button', { onClick: next, style: btn('#e2e8f0', COLORS.text, false) }, 'Next \u2192')
          ),

          // ── Bring your own scenario ──
          h('div', { style: Object.assign({}, cardStyle, { marginTop: '18px', borderLeft: '4px solid #0d9488', background: 'linear-gradient(180deg, #ffffff, #f0fdfa)' }) },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' } },
              h('div', { style: { width: '36px', height: '36px', borderRadius: '10px', background: hexToRGBA('#0d9488', 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' } }, '\uD83C\uDFAF'),
              h('h3', { style: { margin: 0, fontSize: '16px', color: '#0d9488' } }, 'Bring your own situation')
            ),
            h('p', { style: { margin: '0 0 10px', fontSize: '12px', color: COLORS.subtext, lineHeight: 1.5 } },
              'The five scenarios above are common, but the real question is ALWAYS about your specific moment. Describe yours, name the skill, and name the barrier. You\'ll get a direction \u2014 not an answer.'
            ),
            h('label', { style: { display: 'block', fontSize: '11px', fontWeight: 700, color: COLORS.subtext, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '.05em' } },
              '1. Your situation'),
            h('textarea', {
              value: mySit,
              onChange: function(e) { setMySit(e.target.value); },
              placeholder: 'e.g. "I have a biology lab report due Friday and I can\u2019t focus long enough to write the intro."',
              rows: 2,
              style: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid ' + COLORS.border, borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', marginBottom: '10px', resize: 'vertical' },
              'aria-label': 'Describe your situation'
            }),
            h('label', { style: { display: 'block', fontSize: '11px', fontWeight: 700, color: COLORS.subtext, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '.05em' } },
              '2. The skill the assignment is practicing'),
            h('input', {
              type: 'text', value: mySkill,
              onChange: function(e) { setMySkill(e.target.value); },
              placeholder: 'e.g. "writing a scientific intro that states the hypothesis"',
              style: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid ' + COLORS.border, borderRadius: '8px', fontSize: '13px', marginBottom: '10px' },
              'aria-label': 'Name the skill this assignment is practicing'
            }),
            h('label', { style: { display: 'block', fontSize: '11px', fontWeight: 700, color: COLORS.subtext, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.05em' } },
              '3. What kind of barrier is in the way?'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '10px' } },
              [
                { key: 'mechanical', label: 'Mechanical',
                  sub: 'Slow typing, memory retrieval, organizing, formatting, re-reading your own handwriting, starting a blank page',
                  color: '#0d9488' },
                { key: 'cognitive',  label: 'Cognitive',
                  sub: 'The actual thinking \u2014 understanding the concept, composing ideas, deciding what to argue, solving the problem',
                  color: '#db2777' }
              ].map(function(opt) {
                var on = myBarrier === opt.key;
                return h('button', {
                  key: opt.key,
                  onClick: function() { setMyBarrier(opt.key); },
                  style: {
                    background: on ? hexToRGBA(opt.color, 0.12) : '#fff',
                    border: '2px solid ' + (on ? opt.color : COLORS.border),
                    borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                    transition: 'all .15s ease'
                  }
                },
                  h('div', { style: { fontSize: '13px', fontWeight: 700, color: opt.color, marginBottom: '3px' } }, opt.label),
                  h('div', { style: { fontSize: '11px', color: COLORS.subtext, lineHeight: 1.4 } }, opt.sub)
                );
              })
            ),
            h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' } },
              hasLiveAI && h('button', {
                onClick: runMyCoach,
                disabled: myCoachBusy || !mySit.trim() || !mySkill.trim() || !myBarrier,
                style: btn('#0d9488', '#fff', myCoachBusy || !mySit.trim() || !mySkill.trim() || !myBarrier)
              }, myCoachBusy ? '\u23F3 Coaching...' : '\uD83E\uDDD1\u200D\uD83C\uDFEB Get AI coaching'),
              (mySit.trim() || mySkill.trim() || myBarrier) && h('button', { onClick: resetMyScenario, style: btn('#e2e8f0', COLORS.text, false) }, '\u21BA Reset')
            ),
            heuristic && h('div', { className: 'llm-lit-fade-in', style: {
              background: heuristic.verdict === 'scaffold' ? '#f0fdf4' : (heuristic.verdict === 'substitute_risk' ? '#fef2f2' : '#fef9c3'),
              border: '1px solid ' + (heuristic.verdict === 'scaffold' ? '#bbf7d0' : (heuristic.verdict === 'substitute_risk' ? '#fecaca' : '#fde68a')),
              borderRadius: '10px', padding: '12px 14px', marginBottom: '8px'
            } },
              h('div', { style: { fontSize: '11px', fontWeight: 800, color: COLORS.subtext, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.05em' } },
                'Heuristic direction (no AI call)'),
              h('div', { style: { fontSize: '14px', fontWeight: 700, color: COLORS.text, marginBottom: '4px' } }, heuristic.headline),
              h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.6 } }, heuristic.body)
            ),
            myCoach && h('div', { className: 'llm-lit-fade-in', style: {
              background: '#fff', border: '1px solid ' + COLORS.border,
              borderLeft: '4px solid #0d9488',
              borderRadius: '10px', padding: '12px 14px'
            } },
              h('div', { style: { fontSize: '11px', fontWeight: 800, color: '#0d9488', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.05em' } },
                '\uD83E\uDDD1\u200D\uD83C\uDFEB AI coaching (live)'),
              h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, myCoach)
            ),
            !hasLiveAI && h('div', { style: { fontSize: '11px', color: COLORS.muted, fontStyle: 'italic', marginTop: '6px' } },
              'Live AI unavailable here \u2014 the heuristic direction above uses only your answers, no AI call needed.'
            )
          ),

          sectionFooter('udl')
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 6: Quick Reference — single-page printable summary
      // ═══════════════════════════════════════════════════════
      function QuickReference() {
        function refCard(color, icon, title, bodyNodes) {
          return h('div', {
            className: 'llm-lit-print-card',
            style: {
              background: '#fff',
              border: '1px solid ' + COLORS.border,
              borderLeft: '4px solid ' + color,
              borderRadius: '10px',
              padding: '12px 14px'
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
              h('div', { style: { width: '30px', height: '30px', borderRadius: '8px', background: hexToRGBA(color, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' } }, icon),
              h('div', { style: { fontSize: '14px', fontWeight: 800, color: color, letterSpacing: '-.01em' } }, title)
            ),
            bodyNodes
          );
        }
        return h('div', { className: 'llm-lit-print-root', style: { padding: '20px', maxWidth: '960px', margin: '0 auto' } },
          h('div', { className: 'llm-lit-no-print' }, topBar('6. Quick Reference')),
          h('div', { className: 'llm-lit-no-print' }, teacherNote('ref')),
          h('div', {
            className: 'llm-lit-no-print',
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', padding: '10px 14px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '10px', flexWrap: 'wrap', gap: '8px' }
          },
            h('div', { style: { fontSize: '12px', color: COLORS.subtext, lineHeight: 1.5 } },
              h('strong', null, 'A one-page summary'), ' \u2014 printable. Use ',
              h('kbd', { style: { background: '#fff', border: '1px solid ' + COLORS.border, borderRadius: '4px', padding: '1px 5px', fontFamily: 'monospace', fontSize: '11px' } }, 'Ctrl+P'),
              ' / ', h('kbd', { style: { background: '#fff', border: '1px solid ' + COLORS.border, borderRadius: '4px', padding: '1px 5px', fontFamily: 'monospace', fontSize: '11px' } }, '\u2318P'),
              ' to print; other UI hides automatically.'
            ),
            h('button', {
              onClick: function() { window.print && window.print(); },
              style: btn('#0d9488', '#fff', false)
            }, '\uD83D\uDDA8\uFE0F Print')
          ),
          // Print-friendly header
          h('div', { style: { marginBottom: '14px' } },
            h('h1', { style: { margin: 0, fontSize: '22px', fontWeight: 800, color: COLORS.text, letterSpacing: '-.01em' } }, 'AI Literacy Lab \u2014 Quick Reference'),
            h('div', { style: { fontSize: '12px', color: COLORS.subtext, marginTop: '2px' } }, 'AlloFlow \u00B7 for students grades 6\u201312 \u00B7 clinician-authored')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px', marginBottom: '12px' } },
            refCard('#2563eb', '\uD83E\uDD16', 'What an LLM is doing',
              h('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: COLORS.text, lineHeight: 1.6 } },
                h('li', null, 'Breaks your text into ', Term('token', 'tokens')),
                h('li', null, 'Predicts the next token by probability'),
                h('li', null, Term('temperature', 'Temperature'), ' controls how random the pick is'),
                h('li', null, 'It has no idea what\'s "true" \u2014 only what\'s plausible')
              )
            ),
            refCard('#d97706', '\u26A0\uFE0F', 'Why it gets things wrong',
              h('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: COLORS.text, lineHeight: 1.6 } },
                h('li', null, 'Fake citations (verify with Google Scholar)'),
                h('li', null, 'Math errors \u2014 use a calculator'),
                h('li', null, 'Past the ', Term('knowledge cutoff', 'knowledge cutoff'), ' = may invent'),
                h('li', null, Term('confabulation', 'Confabulation'), ': fills gaps with plausible stories'),
                h('li', null, 'It sounds confident exactly the same whether right or wrong')
              )
            ),
            refCard('#7c3aed', '\u270F\uFE0F', 'Five prompt patterns',
              h('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: COLORS.text, lineHeight: 1.6 } },
                PROMPT_PATTERNS.map(function(p, i) {
                  return h('li', { key: i }, h('strong', null, p.icon + ' ' + p.name + ': '), p.desc.split('.')[0] + '.');
                })
              )
            ),
            refCard('#059669', '\uD83D\uDD0D', 'Before you trust an AI answer',
              h('ol', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: COLORS.text, lineHeight: 1.6 } },
                h('li', null, 'Does the answer cite anything? Verify each citation.'),
                h('li', null, 'Is it past the model\'s cutoff? Use web search if so.'),
                h('li', null, 'Any math? Redo it with a calculator.'),
                h('li', null, 'Sound too confident? Ask "are you sure?" \u2014 watch if the answer changes.')
              )
            ),
            refCard('#db2777', '\uD83E\uDDED', 'Scaffold vs substitute',
              h('div', null,
                h('div', { style: { fontSize: '12px', color: COLORS.text, lineHeight: 1.6, marginBottom: '6px' } },
                  h('strong', { style: { color: COLORS.good } }, '\uD83E\uDEA1 Scaffold: '),
                  'AI removes a barrier so YOU can do the skill. (Quiz me. Organize my ideas. Ask me questions.)'
                ),
                h('div', { style: { fontSize: '12px', color: COLORS.text, lineHeight: 1.6 } },
                  h('strong', { style: { color: COLORS.bad } }, '\uD83E\uDDF1 Substitute: '),
                  'AI does the skill for you. (Write my essay. Solve my problem. Summarize instead of read.)'
                ),
                h('div', { style: { fontSize: '11px', color: COLORS.muted, marginTop: '6px', fontStyle: 'italic' } },
                  'Ask: "What skill is this assignment really testing?" Then keep that on you.'
                )
              )
            ),
            refCard('#0f766e', '\uD83D\uDCDD', 'Sentences you can steal',
              h('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: COLORS.text, lineHeight: 1.6 } },
                h('li', null, h('em', null, '"I am a [grade] student. Don\'t solve this for me \u2014 ask me questions that help me find the answer."')),
                h('li', null, h('em', null, '"Quiz me on [topic] one question at a time. Wait for my answer before the next."')),
                h('li', null, h('em', null, '"Are you certain this event actually happened? Cite a source."')),
                h('li', null, h('em', null, '"Explain [concept] using only middle-school vocabulary. No jargon."'))
              )
            )
          ),
          h('div', { style: { fontSize: '11px', color: COLORS.muted, fontStyle: 'italic', textAlign: 'center', padding: '8px 0' } },
            'AlloFlow \u00B7 AI Literacy Lab \u00B7 built for students who need AI as a scaffold, not a substitute.'
          ),
          h('div', { className: 'llm-lit-no-print' }, sectionFooter('ref'))
        );
      }

      // ═══════════════════════════════════════════════════════
      // Shared: top bar with back button
      // ═══════════════════════════════════════════════════════
      function topBar(title) {
        return h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' } },
          h('button', {
            onClick: goHome,
            style: {
              background: '#e2e8f0', color: COLORS.text, border: 'none',
              padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600
            },
            'aria-label': 'Back to AI Literacy Lab home'
          }, '\u2190 Back'),
          h('h2', { style: { margin: 0, fontSize: '20px', fontWeight: 700, color: COLORS.text } }, title)
        );
      }

      // ═══════════════════════════════════════════════════════
      // Shared: next-section footer — helps students keep moving
      // ═══════════════════════════════════════════════════════
      var SECTION_ORDER = [
        { id: 'tokens',  title: '1. How LLMs Work',         color: '#2563eb' },
        { id: 'fails',   title: '2. Why LLMs Get Things Wrong', color: '#d97706' },
        { id: 'prompt',  title: '3. Prompt Craft',          color: '#7c3aed' },
        { id: 'spotter', title: '4. Hallucination Spotter', color: '#059669' },
        { id: 'udl',     title: '5. When to Use AI',        color: '#db2777' },
        { id: 'ref',     title: '6. Quick Reference',       color: '#0f766e' }
      ];
      function sectionFooter(currentId) {
        var i = -1;
        for (var k = 0; k < SECTION_ORDER.length; k++) if (SECTION_ORDER[k].id === currentId) { i = k; break; }
        var next = (i >= 0 && i < SECTION_ORDER.length - 1) ? SECTION_ORDER[i + 1] : null;
        return h('div', { style: { marginTop: '24px', paddingTop: '16px', borderTop: '1px solid ' + COLORS.border, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
          h('button', {
            onClick: goHome,
            style: btn('#f1f5f9', COLORS.subtext, false)
          }, '\uD83C\uDFE0 All sections'),
          next
            ? h('button', {
                onClick: function() { enterSection(next.id, next.title); window.scrollTo && window.scrollTo({ top: 0, behavior: 'smooth' }); },
                style: {
                  background: next.color, color: '#fff', border: 'none',
                  padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }
              }, 'Continue: ' + next.title + ' \u2192')
            : h('div', { style: { fontSize: '13px', color: COLORS.subtext, fontWeight: 600 } }, '\uD83C\uDFC1 You\'ve worked through every section.')
        );
      }

      // ═══════════════════════════════════════════════════════
      // Main render
      // ═══════════════════════════════════════════════════════
      function renderSection() {
        if (section === 'tokens')  return HowLLMsWork();
        if (section === 'fails')   return WhyLLMsFail();
        if (section === 'prompt')  return PromptCraft();
        if (section === 'spotter') return HallucinationSpotter();
        if (section === 'udl')     return UDLRubric();
        if (section === 'ref')     return QuickReference();
        return renderHome();
      }
      try {
        return h('div', { style: { position: 'relative' } },
          h('a', {
            className: 'llm-lit-skip llm-lit-no-print',
            href: '#llm-literacy-main',
            onClick: function(e) {
              // Focus the main region programmatically so screen readers land there.
              var el = document.getElementById('llm-literacy-main');
              if (el) { e.preventDefault(); el.setAttribute('tabindex', '-1'); el.focus(); }
            }
          }, 'Skip to main content'),
          h('main', {
            id: 'llm-literacy-main',
            'aria-label': 'AI Literacy Lab main content',
            style: { outline: 'none' }
          }, renderSection()),
          renderGlossaryPopover(),
          renderHelpOverlay(),
          renderBrowseAllGlossary()
        );
      } catch (err) {
        console.error('[llmLiteracy] Render error:', err);
        return h('div', { style: { padding: '20px', color: COLORS.bad } },
          h('p', null, 'Something went wrong rendering this section. Check the console for details.'),
          h('button', { onClick: goHome, style: btn('#e2e8f0', COLORS.text, false) }, '\u2190 Back to home')
        );
      }
    }
  });

  console.log('[StemLab Plugin] Loaded: stem_lab/stem_tool_llm_literacy.js');
})();

} // end dedup guard
