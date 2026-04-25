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
      // TOC anchors: add breathing room above each target card when scrolled to.
      '.llm-lit-anchor { scroll-margin-top: 16px; }',
      '.llm-lit-anchor:target { animation: llmLitFadeIn .4s ease-out; }',
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
  // ERROR CLASSIFIER: friendly + teaching messages for Gemini failures
  // ─────────────────────────────────────────────────────────
  // When a live call fails, we do two jobs: (1) tell the student what went
  // wrong in plain language and (2) use the failure as a teaching moment
  // about how commercial AI services actually work \u2014 rate limits, safety
  // filters, auth keys, network reality. Errors come in many shapes
  // (Error objects, promise rejections, bare strings), so normalize to text
  // first and match against canonical tokens.

  function classifyGeminiError(err) {
    var raw = '';
    if (err) {
      if (typeof err === 'string') raw = err;
      else if (err.message) raw = err.message;
      else { try { raw = JSON.stringify(err); } catch (e) { raw = String(err); } }
    }
    var low = raw.toLowerCase();
    if (low.indexOf('429') >= 0 || low.indexOf('resource_exhausted') >= 0 || low.indexOf('rate limit') >= 0 || low.indexOf('quota') >= 0) {
      return { kind: 'rate', emoji: '\u23F3',
        friendly: 'Rate-limited \u2014 the AI service is asking us to slow down.',
        teaching: 'Commercial AI APIs cap requests per minute and per day. When lots of users hit them at once, the provider throttles new calls to stay stable. This is why apps sometimes say "try again later."',
        retryable: true };
    }
    if (low.indexOf('401') >= 0 || low.indexOf('403') >= 0 || low.indexOf('unauthorized') >= 0 || low.indexOf('api key') >= 0 || low.indexOf('permission_denied') >= 0) {
      return { kind: 'auth', emoji: '\uD83D\uDD12',
        friendly: 'The AI provider didn\u2019t accept the key.',
        teaching: 'Live AI calls need an API key, and schools sometimes restrict them. If this tool is on a locked-down or air-gapped device, expect this \u2014 the static demos still work.',
        retryable: false };
    }
    if ((low.indexOf('block') >= 0 && (low.indexOf('safety') >= 0 || low.indexOf('harm') >= 0)) || low.indexOf('safety_block') >= 0) {
      return { kind: 'safety', emoji: '\uD83D\uDEA7',
        friendly: 'The safety filter blocked this response.',
        teaching: 'AI providers screen outputs for harmful content. Sometimes the filter is over-aggressive and blocks harmless prompts containing trigger words. Try rephrasing.',
        retryable: true };
    }
    if (low.indexOf('failed to fetch') >= 0 || low.indexOf('networkerror') >= 0 || low.indexOf('network error') >= 0 || low.indexOf('timeout') >= 0 || low.indexOf('offline') >= 0) {
      return { kind: 'network', emoji: '\uD83D\uDCF6',
        friendly: 'Couldn\u2019t reach the AI service over the network.',
        teaching: 'AI calls go over the internet to a datacenter. School wifi sometimes blocks AI domains, or the connection drops mid-request. Check your network.',
        retryable: true };
    }
    if (low.indexOf('500') >= 0 || low.indexOf('502') >= 0 || low.indexOf('503') >= 0 || low.indexOf('504') >= 0) {
      return { kind: 'server', emoji: '\uD83D\uDEE0\uFE0F',
        friendly: 'The AI service returned a server error.',
        teaching: 'The provider\u2019s own servers had a problem. Not your fault. A short wait usually fixes it.',
        retryable: true };
    }
    return { kind: 'unknown', emoji: '\u2753',
      friendly: 'Live call failed for an unknown reason.',
      teaching: 'AI APIs can fail for dozens of reasons. The fact that you need a backup plan \u2014 like a static demo or a recorded example \u2014 is part of literate AI use.',
      retryable: true };
  }

  // ─────────────────────────────────────────────────────────
  // VOICE INPUT: Web Speech API for dictation
  // ─────────────────────────────────────────────────────────
  // Not all browsers support SpeechRecognition (Safari iOS is limited,
  // Firefox doesn\'t ship it, and schools may block microphone access).
  // The helper returns null when unsupported so callers can hide the mic
  // button entirely.

  var SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var SPEECH_SUPPORTED = !!SpeechRecognitionCtor;

  // Create a recognizer bound to callbacks. Returns the recognizer instance
  // or null if unsupported. Caller is responsible for start()/stop().
  function createSpeechRecognizer(onResult, onEnd, onError) {
    if (!SpeechRecognitionCtor) return null;
    var rec;
    try { rec = new SpeechRecognitionCtor(); } catch (e) { return null; }
    rec.continuous = false;   // one utterance per start
    rec.interimResults = true;
    rec.lang = (navigator.language || 'en-US');
    rec.onresult = function(ev) {
      var finalText = '';
      var interim = '';
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        var res = ev.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (onResult) onResult({ final: finalText, interim: interim });
    };
    rec.onend = function() { if (onEnd) onEnd(); };
    rec.onerror = function(ev) { if (onError) onError(ev); };
    return rec;
  }

  // ─────────────────────────────────────────────────────────
  // RED-FLAG SCANNER: spot suspect phrases in AI-generated prose
  // ─────────────────────────────────────────────────────────
  // Not a truth detector — a HEURISTIC that surfaces things students should
  // double-check. Each flag has a short reason. Patterns are deliberately
  // conservative; false positives are fine (they prompt verification).

  var FLAG_PATTERNS = [
    {
      kind: 'citation',
      label: 'Citation-like claim',
      color: '#7c3aed',
      why: 'Looks like a specific academic citation. Copy the title into Google Scholar and check if it actually exists.',
      // "Smith et al., 2019" · "(Smith, 2019)" · "Journal of X, Vol. 42, pp. 118-134"
      rx: /(\b[A-Z][a-z]+ et al\.,?\s*\d{4}\b|\([A-Z][a-z]+(?:\s+(?:&|and)\s+[A-Z][a-z]+)?,?\s*\d{4}\)|Journal of [A-Z][A-Za-z ]+|Vol\.\s*\d+,\s*pp\.\s*\d+-\d+)/g
    },
    {
      kind: 'authority',
      label: 'Vague authority',
      color: '#dc2626',
      why: '"Studies show" or "experts agree" with no named source is a flag. Ask: which studies? Which experts?',
      rx: /\b(studies (?:show|have shown|suggest|indicate|demonstrate)|research (?:shows|has shown|suggests|indicates)|experts (?:agree|say|believe|recommend)|scientists (?:agree|say|believe)|it is widely (?:known|accepted|believed|understood)|it is well[- ]established)\b/gi
    },
    {
      kind: 'absolute',
      label: 'Absolute claim',
      color: '#d97706',
      why: '"Always" and "never" are rarely true. Consider the exceptions \u2014 or ask the AI to name them.',
      rx: /\b(always|never|every (?:time|single)|all (?:of|types|kinds) of|no one|nobody|everyone|nothing|everything|without exception|in every case)\b/gi
    },
    {
      kind: 'hedging',
      label: 'Hedging without a source',
      color: '#0d9488',
      why: '"Approximately," "around," or "roughly" can signal the AI is guessing a number. Verify if the number matters.',
      rx: /\b(approximately|roughly|around|about)\s+(\d[\d,\.]*)/gi
    },
    {
      kind: 'recent',
      label: 'Recent-event claim',
      color: '#0284c7',
      why: 'Reference to a recent year or "recently." If it\'s past the model\'s cutoff, it may be guessed.',
      rx: /\b(in (?:20\d\d|last year|the last (?:few )?(?:year|month)s?)|as of 20\d\d|recently,?|just (?:last|this)\s+(?:year|month|week)|currently|right now|at the moment)\b/gi
    }
  ];

  // Given a text blob, return an array of segments { text, flag? } where
  // non-flag segments have flag = null. Guarantees the text concatenates
  // back to the original. Overlapping matches are resolved first-wins.
  function scanForFlags(text) {
    if (!text) return [{ text: '', flag: null }];
    var spans = [];
    FLAG_PATTERNS.forEach(function(p) {
      // Use a fresh regex so we don't collide with lastIndex state.
      var rx = new RegExp(p.rx.source, p.rx.flags.indexOf('g') >= 0 ? p.rx.flags : p.rx.flags + 'g');
      var m;
      while ((m = rx.exec(text)) !== null) {
        if (m[0].length === 0) { rx.lastIndex++; continue; }
        spans.push({ start: m.index, end: m.index + m[0].length, kind: p.kind, label: p.label, color: p.color, why: p.why });
      }
    });
    if (spans.length === 0) return [{ text: text, flag: null }];
    // Sort by start, drop any that overlap an earlier span.
    spans.sort(function(a, b) { return a.start - b.start; });
    var kept = [];
    var cursor = 0;
    for (var i = 0; i < spans.length; i++) {
      if (spans[i].start >= cursor) { kept.push(spans[i]); cursor = spans[i].end; }
    }
    // Build segments.
    var segs = [];
    var pos = 0;
    for (var k = 0; k < kept.length; k++) {
      if (kept[k].start > pos) segs.push({ text: text.slice(pos, kept[k].start), flag: null });
      segs.push({ text: text.slice(kept[k].start, kept[k].end), flag: kept[k] });
      pos = kept[k].end;
    }
    if (pos < text.length) segs.push({ text: text.slice(pos), flag: null });
    return segs;
  }

  // ─────────────────────────────────────────────────────────
  // MODEL COMPARISON: same prompt, different LLMs
  // ─────────────────────────────────────────────────────────
  // Static recordings \u2014 chosen so the differences are visible without being
  // caricatures. The teaching point is that "the AI" is not one thing;
  // different models have different defaults (style, length, hedging).

  var MODEL_COMPARISON = {
    prompt: 'Explain why the sky is blue in one sentence, for a 7th grader.',
    rows: [
      {
        model: 'Gemini',
        provider: 'Google',
        color: '#4285f4',
        output: 'Sunlight contains all the colors of the rainbow, but when it reaches Earth\'s atmosphere, blue light gets scattered by tiny gas molecules more than the other colors, so the blue bounces around and reaches your eyes from every direction in the sky.'
      },
      {
        model: 'Claude',
        provider: 'Anthropic',
        color: '#d97706',
        output: 'Sunlight may look white, but it\u2019s actually made of many colors \u2014 and when it enters our atmosphere, the tiny molecules of air scatter the shorter blue wavelengths much more strongly than the longer red ones, so from every direction you look up, blue light is what reaches your eyes.'
      },
      {
        model: 'GPT',
        provider: 'OpenAI',
        color: '#10a37f',
        output: 'The sky is blue because when sunlight enters Earth\u2019s atmosphere, tiny air molecules scatter shorter blue wavelengths of light more than longer red ones, causing the blue light to spread across the sky and reach our eyes from all directions.'
      }
    ]
  };

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
      whyItFails: 'No such event exists \u2014 I made up the premise to demonstrate the failure. The AI produced a detailed, internally consistent narrative complete with names, dates, and a plausible heroic twist. This is called "confabulation" \u2014 filling a gap with invention. When you ask about a premise, the model often accepts it rather than pushing back.',
      studentAction: 'Challenge the premise. Ask: "Are you certain this event actually happened? Cite a source." Good prompt craft: phrase questions so the AI has room to say "I don\'t know."'
    },
    {
      category: 'Biased or stereotyped answer',
      icon: '\u2696\uFE0F',
      confidence: 70,
      question: 'Describe a typical nurse and a typical engineer.',
      aiAnswer: '"A typical nurse is a caring woman who works long shifts and is patient with people. A typical engineer is a logical man who enjoys solving technical problems and may have less interest in social interactions."',
      whyItFails: 'The AI reproduced gendered stereotypes embedded in its training data \u2014 most nurses in the text it trained on are described as women and most engineers as men. The model isn\'t expressing an opinion; it\'s surfacing statistical patterns of language that carry bias. This is how AI can quietly reinforce prejudice even when giving a "neutral" answer.',
      studentAction: 'Notice when the AI\'s default descriptions track gender, race, or class stereotypes. Reprompt to disrupt them: "Describe a nurse and an engineer with no assumptions about gender or personality." Use AI as a source of DRAFT content you edit, not final content you accept.'
    },
    {
      category: 'Sycophancy (agreeing with you)',
      icon: '\uD83E\uDD1D',
      confidence: 85,
      question: '(After you say) "I think the War of 1812 started because of taxes. Am I right?"',
      aiAnswer: '"Yes, that\u2019s a great insight! Taxation disputes were a major factor \u2014 the British were imposing heavy duties on American shipping, and this tax burden contributed significantly to tensions that led to war."',
      whyItFails: 'The War of 1812 was mainly about British impressment of American sailors and trade restrictions during the Napoleonic Wars, not taxation. But the AI picked up on your confident framing ("I think...") and validated it rather than correcting. LLMs are trained to be helpful and agreeable \u2014 they will often AGREE with a confident wrong premise rather than push back. This is called sycophancy, and it\'s dangerous because it feels like you were right.',
      studentAction: 'Never phrase a fact-check as "I think X \u2014 am I right?" That invites agreement. Instead: "What were the actual causes of the War of 1812? List them in order of importance." Keep your hypothesis out of the prompt, or explicitly say: "Challenge my thinking. If I\'m wrong, tell me."'
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

  // ─────────────────────────────────────────────────────────
  // PROMPT COOKBOOK: ready-to-use prompts for real student tasks
  // ─────────────────────────────────────────────────────────
  // Templates (above) are interactive slots; recipes are complete, pasteable
  // prompts students can use RIGHT NOW on a real assignment. Each one uses
  // multiple of the five patterns so they double as model answers.

  var PROMPT_RECIPES = [
    {
      id: 'vocab_quiz',
      icon: '\uD83D\uDCDA',
      title: 'Vocab quiz yourself',
      when: 'You have a word list and a quiz tomorrow.',
      prompt: 'You are a patient 7th-grade vocabulary tutor. Quiz me on these words, one at a time. For each, ask me to use the word in an original sentence. Rate my sentence as "on target," "close," or "miss," and briefly say why. Do not move on until I get it right. Words: [PASTE YOUR WORD LIST HERE].',
      why: 'Retrieval practice (producing a sentence) builds long-term memory; passive re-reading does not.'
    },
    {
      id: 'lab_intro',
      icon: '\uD83E\uDDEA',
      title: 'Get unstuck on a lab report intro',
      when: 'You know the experiment but can\'t start writing.',
      prompt: 'I am a 10th grader writing the introduction to a lab report on [EXPERIMENT]. I already know: [1-2 sentences of what you know]. I am stuck on how to introduce the hypothesis clearly. Do NOT write the intro. Instead, ask me 3 questions that help me think through (1) the background, (2) the hypothesis, and (3) why it matters. Ask one question at a time and wait for my answer before the next.',
      why: 'Writer\'s block usually isn\'t a vocabulary problem \u2014 it\'s not having organized your own thinking. The AI asks YOU the questions.'
    },
    {
      id: 'verify_fact',
      icon: '\uD83D\uDD0D',
      title: 'Sanity-check a claim',
      when: 'You have an AI answer and you\'re not sure if it\'s right.',
      prompt: 'I want you to challenge this claim, not agree with it: "[PASTE THE CLAIM]". (1) Is it accurate as stated? (2) What specific facts in it should I verify independently? (3) If anything is off, explain where the error is. Do not hedge \u2014 if you\'re uncertain, say "I don\'t know" directly.',
      why: 'Flips the default sycophancy tendency. Framing the prompt as "challenge this" gives the model permission to disagree.'
    },
    {
      id: 'outline_essay',
      icon: '\uD83D\uDCDD',
      title: 'Outline an argument (not write it)',
      when: 'You have a persuasive writing assignment and you want your ideas organized, not replaced.',
      prompt: 'Help me outline a 400-word persuasive essay arguing that [YOUR POSITION]. I have these rough thoughts: [DUMP YOUR RAW IDEAS]. Do NOT draft the essay. Instead: (a) group my thoughts into 3 main points, (b) suggest the order they should appear in, (c) identify any obvious counterargument I should address. Keep your output under 200 words.',
      why: 'Structural scaffolding without content substitution \u2014 your ideas, the AI\'s organization.'
    },
    {
      id: 'study_guide',
      icon: '\uD83D\uDCD6',
      title: 'Generate comprehension questions before you read',
      when: 'You have a reading assignment and you want to read actively.',
      prompt: 'Here is an article I need to read: [PASTE FIRST PARAGRAPH OR TITLE + SOURCE]. Without summarizing or giving me the answers, generate 5 specific questions I should be able to answer after reading. Make them span (a) main claim, (b) key evidence, (c) one definition, (d) one weakness of the argument, (e) one implication for me.',
      why: 'Questions-before-reading is a documented reading-comprehension strategy, especially for students with attention or processing differences.'
    },
    {
      id: 'error_check',
      icon: '\u2702\uFE0F',
      title: 'Self-edit a draft',
      when: 'You finished writing and want to improve it WITHOUT having the AI rewrite.',
      prompt: 'Here is a draft I wrote: [PASTE YOUR DRAFT]. Do NOT rewrite any sentences. Instead: (1) mark sentences that repeat a point I already made earlier, (2) mark sentences that introduce a new idea, (3) flag exactly one logical gap or unsupported claim. Return a short numbered list of specific line-level feedback. Keep it under 120 words.',
      why: 'AI as editor = good. AI as rewriter = substitute. This recipe keeps you holding the pencil.'
    },
    {
      id: 'explain_steps',
      icon: '\uD83E\uDDEE',
      title: 'Get a worked-example walk-through',
      when: 'You don\'t understand a math/science procedure and you need to follow the steps.',
      prompt: 'You are a patient tutor. Solve this step by step, explaining WHY each step works: [PASTE THE PROBLEM]. After the full walk-through, give me a SIMILAR but different problem and wait for me to solve it. Do not give me the answer to the new problem until I try.',
      why: 'Worked examples + immediate practice is one of the highest-yield sequences in cognitive science.'
    },
    {
      id: 'group_message',
      icon: '\uD83D\uDCAC',
      title: 'Draft a hard message',
      when: 'You need to say something to a group partner / teacher / coach that you\'re anxious about.',
      prompt: 'Help me draft a short, honest, non-accusatory message to [RECIPIENT]. My situation: [DESCRIBE]. My goal is [WHAT YOU WANT]. Write 2 options: (1) direct and brief, (2) warmer and explanatory. Neither should be more than 4 sentences. After both options, ask me which tone feels closer to right for this person.',
      why: 'AI as communication scaffold. Especially useful for students with social-communication differences \u2014 this IS a legitimate use.'
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
  // COMPREHENSION CHECKS: one question per content section
  // ─────────────────────────────────────────────────────────
  // A lightweight check-for-understanding between the content and the
  // "Continue to next section" footer. Active retrieval > passive reading.

  var CHECKS = {
    tokens: {
      q: 'Which statement best describes what a TOKEN is?',
      options: [
        { text: 'A password the AI checks before answering.', correct: false, why: 'No \u2014 tokens are not security. They\'re the units of text the model processes.' },
        { text: 'A small chunk of text \u2014 usually a whole word, part of a word, or punctuation.', correct: true, why: 'Right. Common words = 1 token; longer words split into subword pieces.' },
        { text: 'A single letter of the alphabet.', correct: false, why: 'Close, but too small. Tokens are usually bigger than single letters \u2014 "the" is one token, for example.' },
        { text: 'A paragraph of training data.', correct: false, why: 'Too big. A paragraph contains many tokens.' }
      ]
    },
    fails: {
      q: 'An AI gives you a citation for a paper you can\'t find anywhere online. What is the MOST likely explanation?',
      options: [
        { text: 'The paper is real but behind a paywall you can\'t access.', correct: false, why: 'Possible, but when an AI invents specific authors + volume numbers + page ranges, the citation is usually fabricated.' },
        { text: 'The AI hallucinated the citation \u2014 it matched the PATTERN of real citations without pointing to a real paper.', correct: true, why: 'Exactly. Fake citations are a classic hallucination mode. Verify every specific reference.' },
        { text: 'The paper is too new and hasn\'t been indexed yet.', correct: false, why: 'Rare. New papers still show up in at least one database. If nothing finds it, assume hallucination.' },
        { text: 'The paper exists but was translated from another language.', correct: false, why: 'Unlikely to be the explanation. Translations still have searchable metadata.' }
      ]
    },
    prompt: {
      q: 'Which of these additions would MOST improve a weak prompt like "write me an essay"?',
      options: [
        { text: 'Adding "please" and "thanks in advance."', correct: false, why: 'Politeness doesn\'t change the output. Craft does.' },
        { text: 'Stating grade level, assignment length, and ONE thing you want the AI NOT to do.', correct: true, why: 'Yes \u2014 that\'s three of the five patterns in one sentence (Context + Format + Constraint).' },
        { text: 'Making the prompt as long as possible.', correct: false, why: 'Length without purpose adds noise. Focused short beats rambling long.' },
        { text: 'Asking the AI to try its best.', correct: false, why: 'No effect \u2014 the AI always does the same thing regardless of your framing.' }
      ]
    },
    spotter: {
      q: 'What\'s the MOST reliable way to check a factual claim an AI gives you?',
      options: [
        { text: 'Ask the AI if it\'s sure.', correct: false, why: 'Asking the AI to self-check is unreliable \u2014 it can confidently reaffirm a wrong answer.' },
        { text: 'Trust it if the tone sounds confident.', correct: false, why: 'Confidence and correctness are not connected. Same tone, wrong answer \u2014 all the time.' },
        { text: 'Look the specific claim up in an independent source.', correct: true, why: 'Yes. External verification is the ONLY reliable check. The AI cannot check itself.' },
        { text: 'Re-run the same prompt and see if you get the same answer.', correct: false, why: 'Consistency isn\'t correctness. An LLM can hallucinate the same thing many times in a row.' }
      ]
    },
    udl: {
      q: 'Which AI use is most clearly a SCAFFOLD, not a substitute?',
      options: [
        { text: 'Asking AI to write your book report.', correct: false, why: 'That replaces the reading-and-summarizing skill the assignment is practicing. Substitute.' },
        { text: 'Asking AI to solve your math problems.', correct: false, why: 'Replaces the problem-solving practice. Substitute.' },
        { text: 'Asking AI to generate 5 questions you should be able to answer after you read an article.', correct: true, why: 'Yes \u2014 that supports YOUR reading by giving you something to look for, without doing the reading for you.' },
        { text: 'Asking AI to summarize an article so you don\'t have to read it.', correct: false, why: 'Substitute \u2014 you skip the reading, which is usually the point.' }
      ]
    }
  };

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
      extension: 'Ask students to compare tokenization of a rare word (e.g., their name) vs. a common word. The compression ratio they see teaches why names and proper nouns are where hallucinations love to live.',
      activities: [
        { kind: 'warm-up',  title: 'Predict-the-next-word', body: 'Before showing the next-token chart, write "The capital of France is ___" on the board and take a class vote on the top 3 candidates. Then show the probabilities. The shock of how confident the top token is makes the concept stick.' },
        { kind: 'pair',     title: 'Tokenize your name',    body: 'Have each student type their full name into the tokenizer. Compare compression ratios across the class. Names of students from non-English-speaking backgrounds often tokenize worse \u2014 open a conversation about whose language the model was trained on.' },
        { kind: 'transfer', title: 'Temperature forecasting', body: 'Give students a list of 6 task types (write a fact summary, write a poem, solve a math problem, brainstorm, describe a character, debug code). Ask them to pick a temperature for each and justify it in one sentence. No wrong answers \u2014 discuss disagreements.' }
      ]
    },
    fails: {
      goal: 'Build a working taxonomy of AI failure modes so \u201cdon\u2019t trust AI\u201d becomes \u201ccheck for THESE specific things.\u201d',
      rationale: 'Vague warnings (\u201cAI can be wrong\u201d) are ineffective; students already know that intellectually. What they need is a checklist of recognizable failure patterns \u2014 fake citation, confident math error, plausible nonsense, stale knowledge, confabulation \u2014 so they can name what they\u2019re seeing when it happens.',
      watchFor: 'Students who test only the plausible-nonsense case and conclude \u201cthe AI got it right, so this section is overblown.\u201d The teaching point is that the same confident tone appears whether the output is right or wrong.',
      extension: 'Have students intentionally produce each of the five failure types using a real AI. The ones they struggle to reproduce teach them which failures are hardest to detect in the wild.',
      activities: [
        { kind: 'individual', title: 'Catch-a-citation', body: 'Ask Gemini (or another chatbot) for a citation to a peer-reviewed paper on a niche topic. Each student brings the citation to the next class. Together, try to find each paper in Google Scholar. Count the real vs. hallucinated rate.' },
        { kind: 'group',      title: 'The confidence poker', body: 'In groups of 3, one student makes a claim that is false-but-plausible about a topic the group knows well. Group must ask clarifying questions to find the error. Teaches that confidence is NOT signal.' },
        { kind: 'discussion', title: 'Whose cutoff?', body: 'Ask the AI what its knowledge cutoff is. Then ask about something you know happened last week. Compare what it says. Use as a launching point to discuss why current-events AI use requires an AI with live search.' }
      ]
    },
    prompt: {
      goal: 'Treat prompting as a learnable craft with five concrete patterns, not as a mystical skill.',
      rationale: 'Most students either type one-word prompts (\u201cmitosis\u201d) or copy-paste an assignment prompt verbatim. Neither makes them the operator of the tool. The five patterns \u2014 Role, Context, Constraints, Format, Examples \u2014 are a transferable framework that works across any AI system.',
      watchFor: 'Students who treat the critique ring score as a grade. Reinforce that it\u2019s a heuristic: a 5/5 prompt can still produce bad output, and a 2/5 prompt can work fine for small tasks.',
      extension: 'For students with ADHD or EF differences: the iteration workshop is especially valuable \u2014 it externalizes the \u201cwhat did I actually ask for?\u201d metacognition that many of them struggle to do internally.',
      activities: [
        { kind: 'warm-up',  title: 'Five-pattern scavenger hunt', body: 'Print 5 strong prompts and 5 weak prompts (anonymized). Students in pairs sort them and, for each strong prompt, point at which pattern appears where. Share out disagreements \u2014 the edge cases are the learning.' },
        { kind: 'individual', title: 'Rewrite a real assignment prompt', body: 'Students pick one current assignment and rewrite a "help me start" prompt using all 5 patterns. Use the cookbook as a model. Share in a think-pair-share.' },
        { kind: 'transfer', title: 'Use the template builder, not templates',  body: 'Have students use the Prompt template builder for a real task this week. In the next class, they report: what happened when they ran it? What did they change on iteration 2?' }
      ]
    },
    spotter: {
      goal: 'Convert hallucination-detection from a passive warning into an active skill students practice.',
      rationale: 'Reading about hallucinations is not the same as catching one in real prose. This section deliberately puts correct and incorrect statements next to each other so students have to look carefully \u2014 the core skill needed when using AI-generated study material.',
      watchFor: 'Students clicking everything as suspect (false-alarm dominant) or nothing (miss-dominant). Both are calibration failures. The reveal talks about false alarms specifically \u2014 over-flagging real information is its own cost.',
      extension: 'Encourage multi-attempt play without hints \u2014 the perfect-score XP only fires unassisted. This matches the clinical principle that scaffolded practice then faded support builds durable skill.',
      activities: [
        { kind: 'individual', title: 'Red-flag your own reading', body: 'Pick one AI-generated passage from real use (could be a student\'s own). Use the Section 2 "Analyze any AI output" tool to mark flags. Discuss false-positives \u2014 what got over-flagged?' },
        { kind: 'pair',      title: 'Author a trap passage',     body: 'Pairs write a 6-sentence AI-style paragraph on a topic they know well, with 2 seeded errors. Swap with another pair. Score each other. Debrief: what made the errors easy vs. hard to catch?' },
        { kind: 'discussion',title: 'False-alarm bias discussion', body: 'Ask: why is over-flagging as harmful as under-flagging? Connect to real contexts \u2014 students with anxiety may over-flag everything; confidence-driven students may under-flag. Neither is a neutral stance.' }
      ]
    },
    udl: {
      goal: 'Give students a rubric for deciding when AI is a legitimate accommodation vs. a shortcut that undermines the learning target.',
      rationale: 'This is the section most AI-literacy curricula miss and the one that matters most for students with learning differences. The scaffold-vs-substitute distinction maps onto the UDL principle of \u201creduce the barriers to demonstrating the target skill.\u201d It respects that AI CAN be a valid accommodation while naming the specific way it becomes harmful: when the barrier IS the target skill.',
      watchFor: 'Students who always pick \u201cscaffold\u201d \u2014 sometimes substitute is the right answer (e.g., reading a document to find one fact you need for a different task). The reveal intentionally doesn\u2019t declare a \u201ccorrect\u201d answer; it teaches the decision process.',
      extension: 'The Bring-Your-Own-Scenario card is where this section earns its keep. Encourage students to come back to it for real assignments throughout the year \u2014 treat it as a recurring metacognitive check, not a one-time exercise.',
      activities: [
        { kind: 'individual', title: 'Bring-your-own-assignment audit', body: 'Students pick an assignment they have this week and work through the scaffold/substitute decision tree for it. Write one sentence about what specific skill the assignment is really testing.' },
        { kind: 'group',      title: 'Scenario remix',        body: 'In small groups, rewrite one of the 7 scenarios in the voice of a 6th grader, a 12th grader, and a teacher. Whose definition of "the target skill" is different? Use to discuss why this judgment is contextual.' },
        { kind: 'transfer',   title: 'Class-wide AI agreement',     body: 'Use this section as a starting point to co-author a class-wide "when AI is OK" rubric for your specific course. Publish it. Students know the rules because they helped make them.' }
      ]
    },
    ref: {
      goal: 'A printable takeaway students (or teachers) can keep nearby while actually using AI.',
      rationale: 'Most skill-building fails because the teaching moment and the performance moment are separated in time. The reference card bridges that gap \u2014 it\u2019s designed to live on a desk, in a binder, or on a classroom wall, not to be read once and forgotten.',
      watchFor: 'Nothing special \u2014 this page is mostly a print target.',
      extension: 'Consider printing multiple per class and distributing at the start of any assignment where AI use will be permitted. Explicitly point students to the \u201cBefore you trust an AI answer\u201d checklist before they submit.',
      activities: [
        { kind: 'routine', title: 'Day-one handout', body: 'Print one per student at the start of any unit where AI tools will be allowed. Walk through the "Before you trust an AI answer" checklist as a whole-class activity on day one.' },
        { kind: 'routine', title: 'Exit-ticket prompt', body: 'After any AI-enabled activity, ask students: "Which pattern from the reference did your prompt use well today? Which would you add next time?" 2-minute write.' }
      ]
    }
  };

  // ─────────────────────────────────────────────────────────
  // GLOSSARY: terms students will encounter
  // ─────────────────────────────────────────────────────────
  // Lookup keyed by lower-case term. When a student clicks a highlighted
  // word anywhere in the tool, we show this definition in a popover.

  // Each term can carry a `where` field (section id) so the glossary popover
  // can offer a one-click jump to the section that demonstrates it. The
  // whereDemo string remains human-readable text for context.
  var TERMS = {
    'token': {
      label: 'token',
      icon: '\uD83D\uDD24',
      def: 'A token is a small chunk of text the model processes — roughly a word, part of a word, or a piece of punctuation. Common words are often one token; longer words split into pieces ("unhappy" \u2192 "un" + "happy").',
      whereDemo: 'Section 1 has an interactive tokenizer — type anything and watch it split.',
      where: 'tokens',
      related: ['tokenization', 'next-token prediction']
    },
    'tokenization': {
      label: 'tokenization',
      icon: '\uD83D\uDD24',
      def: 'The process of breaking text into tokens before the model can work with it. Different tokenizers split text differently; all of them turn language into numbers the model can predict over.',
      whereDemo: 'Section 1 \u2014 the colored pills show tokenization happening live.',
      where: 'tokens',
      related: ['token', 'next-token prediction']
    },
    'next-token prediction': {
      label: 'next-token prediction',
      icon: '\uD83C\uDFB2',
      def: 'The one thing an LLM does: given the tokens so far, predict a probability for every possible next token. Everything else — answering questions, writing poems, coding — is next-token prediction repeated many times.',
      whereDemo: 'Section 1 shows the probability distribution for three real examples.',
      where: 'tokens',
      related: ['token', 'temperature', 'hallucination']
    },
    'temperature': {
      label: 'temperature',
      icon: '\uD83C\uDF21\uFE0F',
      def: 'A number (usually 0\u20132) that controls how random the next-token pick is. Low temperature = always pick the most likely token (deterministic, good for facts). High temperature = sometimes pick less likely tokens (creative, good for stories, worse for accuracy).',
      whereDemo: 'Section 1 lets you compare temp 0.2, 0.7, and 1.2 side by side.',
      where: 'tokens',
      related: ['next-token prediction', 'hallucination']
    },
    'hallucination': {
      label: 'hallucination',
      icon: '\u26A0\uFE0F',
      def: 'When an LLM generates confident-sounding text that is not true \u2014 a fake citation, a wrong date, a made-up fact. The model is not lying; it has no concept of "true." It is filling in the statistically plausible next tokens.',
      whereDemo: 'Section 2 is a gallery of real hallucination types; Section 4 is a spotter game.',
      where: 'fails',
      related: ['confabulation', 'knowledge cutoff', 'next-token prediction']
    },
    'confabulation': {
      label: 'confabulation',
      icon: '\uD83C\uDFDB\uFE0F',
      def: 'A specific kind of hallucination where the model fills a knowledge gap with an invented but internally consistent story \u2014 complete with names, dates, and cause-and-effect. Common when the user\'s question accepts a false premise.',
      whereDemo: 'Section 2 \u2014 see the "Invented historical detail" example.',
      where: 'fails',
      related: ['hallucination', 'knowledge cutoff']
    },
    'knowledge cutoff': {
      label: 'knowledge cutoff',
      icon: '\u23F0',
      def: 'The latest date in the model\'s training data. The model does not know anything that happened after its cutoff, but it may still answer confidently about recent events \u2014 so always check.',
      whereDemo: 'Section 2 has a cutoff example; you can ask any AI directly what its cutoff is.',
      where: 'fails',
      related: ['hallucination', 'confabulation']
    },
    'prompt': {
      label: 'prompt',
      icon: '\u270F\uFE0F',
      def: 'The text you send to an LLM. The prompt sets the task, the role, the constraints, and the format \u2014 all at once. Good prompts are a learnable craft.',
      whereDemo: 'Section 3 teaches the five patterns of strong prompts.',
      where: 'prompt',
      related: ['context', 'temperature']
    },
    'context': {
      label: 'context',
      icon: '\uD83D\uDCCD',
      def: 'The information you give the AI about YOU and your task \u2014 grade level, what you already know, what you are trying to do. More context usually means more relevant output.',
      whereDemo: 'Section 3 \u2014 "Context" is one of the five prompt patterns.',
      where: 'prompt',
      related: ['prompt']
    },
    'scaffold': {
      label: 'scaffold',
      icon: '\uD83E\uDEA1',
      def: 'Using AI in a way that REMOVES A BARRIER without doing the thinking you need to practice. Example: asking AI to quiz you after you study, instead of asking AI to tell you the answers.',
      whereDemo: 'Section 5 has worked examples for common student situations.',
      where: 'udl',
      related: ['substitute', 'prompt']
    },
    'substitute': {
      label: 'substitute',
      icon: '\uD83E\uDDF1',
      def: 'Using AI in a way that REPLACES THE SKILL you are supposed to be learning. Example: asking AI to write the essay instead of using AI to help you organize your own thoughts.',
      whereDemo: 'Section 5 contrasts this with scaffolding for the same situations.',
      where: 'udl',
      related: ['scaffold']
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
    },
    {
      situation: 'My group project partners aren\u2019t pulling their weight. I\'m tempted to just have AI do the whole thing so it gets turned in.',
      scaffold: 'Use AI to help YOU draft your specific section, or to produce a shared outline the group can divide up. If communication is the barrier, ask AI to help you draft a clear, non-accusatory message to your partners or teacher.',
      substitute: 'Ask AI to write the whole project and submit it as group work. Now the group learns nothing AND the group-work skill (coordination, communication, boundary-setting) doesn\'t develop either.',
      why: 'Group work IS a skill. Using AI to do the work around the group-dynamics problem is a substitute for developing that skill. Using AI to help you communicate about the problem is a scaffold. This distinction matters for students with social-communication differences \u2014 the communication itself can be legitimately scaffolded.'
    },
    {
      situation: 'I have a big test tomorrow and I can\'t figure out what to focus on. I feel like I need to study everything.',
      scaffold: 'Give AI the list of topics (or a study guide) and ask: "Quiz me on the 5 topics most likely to show up, one at a time. Tell me after each question if my answer misses the main point." Use AI as an adaptive study partner.',
      substitute: 'Ask AI to "tell me the 10 things I need to know for this test." You get a list \u2014 but you haven\'t done the retrieval practice that actually moves knowledge into long-term memory.',
      why: 'The core finding in cognitive science for test prep: RETRIEVAL (trying to recall) is what builds durable memory. Reading a list the AI generated, even a correct one, doesn\'t engage retrieval. Quiz-yourself AI engages it directly \u2014 especially valuable for students with working-memory or attention challenges.'
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

      // Track which TOC-anchored sub-cards a student has scrolled past. Used
      // by the in-section TOC to render a small checkmark on seen chips.
      // One-way: once seen, stays seen (across sessions, via toolData).
      var markAnchorSeen = function(anchorId) {
        if (!ctx.setToolData || !anchorId) return;
        ctx.setToolData(function(prev) {
          var existing = (prev && prev.llmLiteracy) || {};
          var seen = existing.seenAnchors || {};
          if (seen[anchorId]) return prev;
          var next = Object.assign({}, seen); next[anchorId] = true;
          return Object.assign({}, prev, { llmLiteracy: Object.assign({}, existing, { seenAnchors: next }) });
        });
      };
      function anchorIsSeen(anchorId) {
        return !!((d.seenAnchors || {})[anchorId]);
      }

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
      // ── Voice dictation button ──
      // Pass an appender function (existingText -> newText) and we return a
      // mic button that, when pressed, starts a SpeechRecognition session and
      // feeds transcripts back through the appender. A second press stops it.
      var activeRecRef = React.useRef(null);
      var listeningTuple = useState(null); // id of the input currently receiving dictation, or null
      var listeningFor = listeningTuple[0]; var setListeningFor = listeningTuple[1];
      function MicButton(props) {
        // props: { id, appendTo, currentValue } — id identifies which input.
        if (!SPEECH_SUPPORTED) return null;
        var isOn = listeningFor === props.id;
        function toggle() {
          if (isOn) {
            if (activeRecRef.current) { try { activeRecRef.current.stop(); } catch (e) {} }
            return;
          }
          // Stop any existing
          if (activeRecRef.current) { try { activeRecRef.current.stop(); } catch (e) {} }
          var committed = props.currentValue || '';
          var rec = createSpeechRecognizer(
            function(r) {
              // On each update: commit the final text, show interim live.
              if (r.final) {
                committed = (committed ? committed + ' ' : '') + r.final.trim();
                props.appendTo(committed);
              } else if (r.interim) {
                props.appendTo(committed + (committed ? ' ' : '') + r.interim);
              }
            },
            function() { setListeningFor(null); activeRecRef.current = null; },
            function(ev) {
              setListeningFor(null); activeRecRef.current = null;
              if (ev && ev.error && ev.error !== 'aborted' && ev.error !== 'no-speech') {
                addToast('Mic error: ' + ev.error + '. You may need to allow microphone access.', 'warn');
              }
            }
          );
          if (!rec) { addToast('Voice input not supported in this browser.', 'info'); return; }
          activeRecRef.current = rec;
          setListeningFor(props.id);
          try { rec.start(); announceToSR('Listening. Speak now.'); }
          catch (e) { setListeningFor(null); activeRecRef.current = null; addToast('Could not start microphone.', 'warn'); }
        }
        return h('button', {
          type: 'button',
          onClick: toggle,
          title: isOn ? 'Stop dictation' : 'Dictate with your voice',
          'aria-label': isOn ? 'Stop voice dictation' : 'Start voice dictation',
          'aria-pressed': isOn ? 'true' : 'false',
          className: isOn ? 'llm-lit-pulse' : '',
          style: {
            background: isOn ? COLORS.bad : '#e0e7ff',
            color: isOn ? '#fff' : COLORS.accent,
            border: 'none',
            borderRadius: '50%',
            width: '32px', height: '32px',
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px',
            flexShrink: 0
          }
        }, isOn ? '\uD83D\uDD34' : '\uD83C\uDFA4');
      }

      // ── Reflections log ──
      // Persisted to toolData.llmLiteracy.reflections as array of
      // { t, section, promptId, prompt, text }. promptId lets us dedupe:
      // saving twice at the same moment UPDATES the existing entry.
      function reflectionsList() { return (d.reflections || []).slice(); }
      function findReflection(promptId) {
        return reflectionsList().filter(function(r) { return r.promptId === promptId; })[0];
      }
      function saveReflection(sectionId, promptId, prompt, text) {
        if (!ctx.setToolData) return;
        var trimmed = (text || '').trim();
        if (!trimmed) return;
        ctx.setToolData(function(prev) {
          var existing = (prev && prev.llmLiteracy) || {};
          var list = (existing.reflections || []).slice();
          var i = -1;
          for (var k = 0; k < list.length; k++) if (list[k].promptId === promptId) { i = k; break; }
          var entry = { t: Date.now(), section: sectionId, promptId: promptId, prompt: prompt, text: trimmed };
          if (i >= 0) list[i] = entry; else list.push(entry);
          return Object.assign({}, prev, { llmLiteracy: Object.assign({}, existing, { reflections: list }) });
        });
        announceToSR('Reflection saved.');
      }
      function deleteReflection(promptId) {
        if (!ctx.setToolData) return;
        ctx.setToolData(function(prev) {
          var existing = (prev && prev.llmLiteracy) || {};
          var list = (existing.reflections || []).filter(function(r) { return r.promptId !== promptId; });
          return Object.assign({}, prev, { llmLiteracy: Object.assign({}, existing, { reflections: list }) });
        });
      }

      // reflectionBox: the inline component students fill in at a given moment.
      // sectionId scopes export grouping; promptId must be stable so we can
      // match a re-render to a previously saved entry.
      function reflectionBox(sectionId, promptId, promptQuestion, placeholder) {
        var existing = findReflection(promptId);
        return h(ReflectionEditor, {
          key: promptId,
          sectionId: sectionId,
          promptId: promptId,
          promptQuestion: promptQuestion,
          placeholder: placeholder || 'A sentence or two is enough.',
          existing: existing
        });
      }

      // A tiny internal component so the textarea can manage its own state
      // without round-tripping through toolData on every keystroke.
      function ReflectionEditor(props) {
        var seed = props.existing ? props.existing.text : '';
        var draftTuple = useState(seed);
        var draft = draftTuple[0]; var setDraft = draftTuple[1];
        var editingTuple = useState(!props.existing);
        var editing = editingTuple[0]; var setEditing = editingTuple[1];
        function commit() {
          saveReflection(props.sectionId, props.promptId, props.promptQuestion, draft);
          setEditing(false);
        }
        function drop() {
          deleteReflection(props.promptId);
          setDraft('');
          setEditing(true);
        }
        return h('div', {
          style: {
            marginTop: '10px',
            padding: '10px 12px',
            background: '#f5f3ff',
            border: '1px solid #ddd6fe',
            borderRadius: '10px'
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: '14px' } }, '\uD83D\uDCAD'),
            h('div', { style: { fontSize: '11px', fontWeight: 800, color: COLORS.accent, textTransform: 'uppercase', letterSpacing: '.05em' } }, 'Reflect'),
            props.existing && !editing && h('div', { style: { marginLeft: 'auto', fontSize: '10px', color: COLORS.muted, fontStyle: 'italic' } }, 'saved')
          ),
          h('div', { style: { fontSize: '12.5px', color: COLORS.text, marginBottom: '6px', lineHeight: 1.45 } }, props.promptQuestion),
          editing
            ? h('div', null,
                h('div', { style: { position: 'relative', marginBottom: '6px' } },
                  h('textarea', {
                    value: draft,
                    onChange: function(e) { setDraft(e.target.value); },
                    placeholder: props.placeholder,
                    rows: 2,
                    style: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', paddingRight: SPEECH_SUPPORTED ? '42px' : '10px', border: '1px solid ' + COLORS.border, borderRadius: '8px', fontSize: '12.5px', fontFamily: 'inherit', resize: 'vertical' },
                    'aria-label': 'Your reflection'
                  }),
                  SPEECH_SUPPORTED && h('div', { style: { position: 'absolute', right: '5px', top: '5px' } },
                    h(MicButton, { id: 'refl-' + props.promptId, currentValue: draft, appendTo: setDraft })
                  )
                ),
                h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                  h('button', {
                    onClick: commit,
                    disabled: !draft.trim(),
                    style: btn(COLORS.accent, '#fff', !draft.trim())
                  }, '\uD83D\uDCBE Save'),
                  props.existing && h('button', {
                    onClick: function() { setDraft(props.existing.text); setEditing(false); },
                    style: btn('#e2e8f0', COLORS.text, false)
                  }, 'Cancel')
                )
              )
            : h('div', null,
                h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.55, whiteSpace: 'pre-wrap', padding: '6px 10px', background: '#fff', borderRadius: '6px', border: '1px solid ' + COLORS.border, marginBottom: '6px' } }, props.existing && props.existing.text),
                h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                  h('button', {
                    onClick: function() { setEditing(true); },
                    style: btn('#e0e7ff', COLORS.accent, false)
                  }, '\u270F\uFE0F Edit'),
                  h('button', {
                    onClick: drop,
                    style: btn('#fee2e2', '#991b1b', false)
                  }, '\u00D7 Remove')
                )
              )
        );
      }

      // Render AI output with inline red-flag highlighting. The student sees
      // the text normally with specific suspect phrases underlined + tinted.
      // Hovering (or tabbing to) a flag shows a tooltip explaining why.
      function flaggedText(text) {
        var segs = scanForFlags(text || '');
        var anyFlags = segs.some(function(s) { return s.flag; });
        return h('span', null,
          segs.map(function(seg, i) {
            if (!seg.flag) return h('span', { key: i }, seg.text);
            var f = seg.flag;
            return h('span', {
              key: i,
              role: 'mark',
              tabIndex: 0,
              title: f.label + ' \u2014 ' + f.why,
              'aria-label': f.label + ' flag: ' + f.why,
              style: {
                background: hexToRGBA(f.color, 0.14),
                borderBottom: '2px solid ' + hexToRGBA(f.color, 0.55),
                padding: '0 2px',
                borderRadius: '2px',
                cursor: 'help'
              }
            }, seg.text);
          }),
          anyFlags && h('span', {
            style: { display: 'block', marginTop: '8px', fontSize: '11px', color: COLORS.muted, fontStyle: 'italic', borderTop: '1px dashed ' + COLORS.border, paddingTop: '6px' },
            'aria-live': 'polite'
          },
            '\uD83D\uDEA9 Highlighted phrases are potential red flags \u2014 hover for why. This is a heuristic, not a verdict.'
          )
        );
      }

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
      // Search filter for the browse-all glossary view.
      var browseQueryTuple = useState('');
      var browseQuery = browseQueryTuple[0]; var setBrowseQuery = browseQueryTuple[1];
      // First-run welcome overlay \u2014 shown once per browser per student,
      // flagged via localStorage so we don\'t re-annoy returning visitors.
      var welcomeTuple = useState(function() {
        try { return localStorage.getItem('alloLlmLitSeenWelcome') !== '1'; } catch (e) { return false; }
      });
      var welcomeOpen = welcomeTuple[0]; var setWelcomeOpen = welcomeTuple[1];
      function dismissWelcome() {
        setWelcomeOpen(false);
        try { localStorage.setItem('alloLlmLitSeenWelcome', '1'); } catch (e) {}
      }
      // In-app confirmation modal. Set to { title, body, confirmLabel,
      // confirmColor, onConfirm } to show; null to hide.
      var confirmTuple = useState(null);
      var confirmState = confirmTuple[0]; var setConfirmState = confirmTuple[1];
      function askConfirm(opts, onConfirm) {
        setConfirmState({
          title: opts.title || 'Are you sure?',
          body: opts.body || '',
          confirmLabel: opts.confirmLabel || 'Confirm',
          cancelLabel: opts.cancelLabel || 'Cancel',
          confirmColor: opts.confirmColor || COLORS.bad,
          onConfirm: onConfirm
        });
      }

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
          // Escape is always handled (closes modals / goes home).
          if (key === 'Escape') {
            if (welcomeOpen) { dismissWelcome(); return; }
            if (browseOpen) { setBrowseOpen(false); return; }
            if (helpOpen) { setHelpOpen(false); return; }
            if (glossTerm) { setGlossTerm(null); return; }
            if (confirmState) { setConfirmState(null); return; }
            if (section !== 'home') { goHome(); return; }
          }
          // Everything else is suppressed while a modal is open — the modal
          // has its own focus trap and students shouldn't accidentally
          // navigate the background behind a dialog.
          var anyModalOpen = welcomeOpen || browseOpen || helpOpen || glossTerm || confirmState;
          if (anyModalOpen) return;
          if (key === '?' || (key === '/' && e.shiftKey)) { e.preventDefault(); setHelpOpen(true); return; }
          if (key === 'h' || key === 'H') { goHome(); return; }
          if (key === 't' || key === 'T') { toggleTeacherMode(); return; }
          if (key === 'g' || key === 'G') { setBrowseOpen(true); return; }
          // Numeric shortcuts 1..6
          var idx = ['1','2','3','4','5','6'].indexOf(key);
          if (idx >= 0) {
            var target = SECTION_ORDER[idx];
            if (target) { enterSection(target.id, target.title); }
          }
        }
        window.addEventListener('keydown', onKey);
        return function() { window.removeEventListener('keydown', onKey); };
      }, [section, helpOpen, glossTerm, teacherMode, browseOpen, confirmState, welcomeOpen]);

      // ── Anchor-visibility observer ──
      // When the student scrolls a section, mark each TOC-anchored card as
      // "seen" the first time it's >=50% visible. Runs per section change;
      // cleans up on unmount. Gracefully no-ops if IntersectionObserver is
      // unavailable (very old browsers) or if we're on the home screen.
      React.useEffect(function() {
        if (typeof IntersectionObserver === 'undefined') return;
        if (section === 'home') return;
        // Small delay to let the DOM paint the section.
        var observer = null;
        var timer = setTimeout(function() {
          try {
            observer = new IntersectionObserver(function(entries) {
              entries.forEach(function(e) {
                if (e.isIntersecting && e.intersectionRatio >= 0.5) {
                  var id = e.target && e.target.id;
                  if (id) markAnchorSeen(id);
                }
              });
            }, { threshold: [0.5] });
            var anchors = document.querySelectorAll('.llm-lit-anchor');
            anchors.forEach(function(el) { observer.observe(el); });
          } catch (err) { /* best-effort; don't break the section if this fails */ }
        }, 80);
        return function() {
          clearTimeout(timer);
          if (observer) { try { observer.disconnect(); } catch (err) {} }
        };
      }, [section]);

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
            return h('div', { key: i, style: { marginBottom: '8px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 800, color: row.color, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '2px' } }, row.label),
              h('div', { style: { fontSize: '12.5px', color: '#451a03', lineHeight: 1.55 } }, row.body)
            );
          }),
          // Classroom activities \u2014 concrete lessons a teacher can pick up and run.
          n.activities && n.activities.length > 0 && h('div', {
            style: {
              marginTop: '4px', paddingTop: '10px',
              borderTop: '1px dashed rgba(180, 83, 9, .35)'
            }
          },
            h('div', { style: { fontSize: '10px', fontWeight: 800, color: '#78350f', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '6px' } }, '\uD83C\uDFAF Classroom activities'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px' } },
              n.activities.map(function(a, i) {
                return h('div', { key: i, style: {
                  background: 'rgba(255, 255, 255, .6)',
                  border: '1px solid rgba(180, 83, 9, .22)',
                  borderRadius: '8px',
                  padding: '8px 10px'
                } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' } },
                    h('span', {
                      style: {
                        fontSize: '9px', fontWeight: 800, letterSpacing: '.05em',
                        textTransform: 'uppercase',
                        padding: '1px 6px', borderRadius: '999px',
                        background: '#fed7aa', color: '#78350f'
                      }
                    }, a.kind),
                    h('div', { style: { fontSize: '12px', fontWeight: 700, color: '#78350f' } }, a.title)
                  ),
                  h('div', { style: { fontSize: '11.5px', color: '#451a03', lineHeight: 1.5 } }, a.body)
                );
              })
            )
          )
        );
      }

      // Remember which element had focus before a modal opened, so we can
      // restore focus there when the modal closes (a11y good practice).
      var focusReturnRef = React.useRef(null);
      React.useEffect(function() {
        if (glossTerm || helpOpen || browseOpen || confirmState || welcomeOpen) {
          if (!focusReturnRef.current) focusReturnRef.current = document.activeElement;
        } else {
          var el = focusReturnRef.current;
          if (el && typeof el.focus === 'function') {
            try { el.focus(); } catch (e) {}
          }
          focusReturnRef.current = null;
        }
      }, [glossTerm, helpOpen, browseOpen, confirmState, welcomeOpen]);

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
          { keys: ['G'], label: 'Open the glossary' },
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

      function renderWelcomeOverlay() {
        if (!welcomeOpen) return null;
        return h('div', {
          className: 'llm-lit-no-print',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': 'Welcome to the AI Literacy Lab',
          onClick: dismissWelcome,
          style: {
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10001, padding: '20px'
          }
        },
          h('div', {
            onClick: function(e) { e.stopPropagation(); },
            onKeyDown: trapFocus,
            className: 'llm-lit-fade-in',
            style: {
              background: '#fff', borderRadius: '16px',
              maxWidth: '500px', width: '100%',
              boxShadow: '0 24px 70px -10px rgba(15,23,42,.5)',
              overflow: 'hidden',
              border: '1px solid ' + COLORS.border
            }
          },
            // Hero top
            h('div', { style: {
              padding: '20px 24px 16px',
              background: 'linear-gradient(135deg, #1e293b 0%, #312e81 50%, #581c87 100%)',
              color: '#fff', position: 'relative', overflow: 'hidden'
            } },
              h('div', { 'aria-hidden': 'true', style: {
                position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px',
                background: 'radial-gradient(circle, rgba(251,191,36,.25) 0%, transparent 70%)'
              } }),
              h('div', { style: { position: 'relative', display: 'flex', gap: '14px', alignItems: 'center' } },
                h('div', { style: {
                  width: '52px', height: '52px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #fbbf24, #f472b6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '30px',
                  boxShadow: '0 8px 20px -6px rgba(251, 191, 36, .6)',
                  flexShrink: 0
                } }, '\uD83E\uDDE0'),
                h('div', null,
                  h('div', { style: { fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', opacity: 0.85, textTransform: 'uppercase' } }, 'Welcome'),
                  h('div', { style: { fontSize: '20px', fontWeight: 800, letterSpacing: '-.01em', marginTop: '2px' } }, 'AI Literacy Lab')
                )
              )
            ),
            // Body
            h('div', { style: { padding: '18px 22px 20px' } },
              h('p', { style: { margin: '0 0 14px', fontSize: '13px', color: COLORS.text, lineHeight: 1.6 } },
                'This is a six-section lab about how AI actually works, where it fails, and how to use it without letting it do the thinking you need to practice.'
              ),
              [
                { icon: '\uD83D\uDD2C', title: 'Work at your pace', body: 'Six sections, no order required. Revisit anything. Your progress saves.' },
                { icon: '\u2328\uFE0F', title: 'Keyboard fast-paths', body: 'Press 1\u20136 to jump sections, ? for all shortcuts, T for teacher notes.' },
                { icon: '\uD83D\uDD0D', title: 'Click any underlined term', body: 'Glossary definitions pop up inline. The full glossary is one button away in the banner.' }
              ].map(function(row, i) {
                return h('div', { key: i, style: { display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'flex-start' } },
                  h('div', { style: { fontSize: '20px', flexShrink: 0, lineHeight: 1 } }, row.icon),
                  h('div', null,
                    h('div', { style: { fontSize: '13px', fontWeight: 700, color: COLORS.text, marginBottom: '2px' } }, row.title),
                    h('div', { style: { fontSize: '12px', color: COLORS.subtext, lineHeight: 1.5 } }, row.body)
                  )
                );
              }),
              h('div', { style: { marginTop: '14px', padding: '10px 12px', background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', fontSize: '12px', color: COLORS.subtext, lineHeight: 1.5 } },
                h('strong', { style: { color: '#0f766e' } }, 'A note before you start: '),
                'The live demos here use Google Gemini. Don\'t paste names, phone numbers, or anything private \u2014 prompts may be logged by the AI provider.'
              ),
              h('div', { style: { marginTop: '16px', display: 'flex', justifyContent: 'flex-end' } },
                h('button', {
                  ref: function(el) { if (el && welcomeOpen) setTimeout(function() { try { el.focus(); } catch (e) {} }, 30); },
                  onClick: dismissWelcome,
                  style: {
                    background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                    color: '#fff', border: 'none',
                    padding: '10px 18px', borderRadius: '10px',
                    fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                    boxShadow: '0 4px 12px -4px rgba(124, 58, 237, .5)'
                  }
                }, 'Let\'s start \u2192')
              )
            )
          )
        );
      }

      function renderConfirmModal() {
        if (!confirmState) return null;
        var c = confirmState;
        function close() { setConfirmState(null); }
        return h('div', {
          className: 'llm-lit-no-print',
          role: 'alertdialog',
          'aria-modal': 'true',
          'aria-labelledby': 'llm-lit-confirm-title',
          'aria-describedby': 'llm-lit-confirm-body',
          onClick: close,
          style: {
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '20px'
          }
        },
          h('div', {
            onClick: function(e) { e.stopPropagation(); },
            onKeyDown: trapFocus,
            className: 'llm-lit-fade-in',
            style: {
              background: '#fff', borderRadius: '14px', padding: '20px 22px',
              maxWidth: '420px', width: '100%',
              boxShadow: '0 20px 60px -10px rgba(15,23,42,.45)',
              border: '1px solid ' + COLORS.border
            }
          },
            h('div', { id: 'llm-lit-confirm-title', style: { fontSize: '17px', fontWeight: 800, color: COLORS.text, marginBottom: '8px' } }, c.title),
            h('div', { id: 'llm-lit-confirm-body', style: { fontSize: '13px', color: COLORS.subtext, lineHeight: 1.55, marginBottom: '16px' } }, c.body),
            h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' } },
              h('button', {
                onClick: close,
                style: btn('#e2e8f0', COLORS.text, false)
              }, c.cancelLabel),
              h('button', {
                ref: function(el) { if (el && c) setTimeout(function() { try { el.focus(); } catch (e) {} }, 30); },
                onClick: function() {
                  if (c.onConfirm) { try { c.onConfirm(); } catch (err) { console.error(err); } }
                  close();
                },
                style: btn(c.confirmColor, '#fff', false)
              }, c.confirmLabel)
            )
          )
        );
      }

      function renderBrowseAllGlossary() {
        if (!browseOpen) return null;
        var allKeys = Object.keys(TERMS);
        // Filter by search query against label + definition.
        var q = (browseQuery || '').trim().toLowerCase();
        var keys = q === ''
          ? allKeys
          : allKeys.filter(function(k) {
              var e = TERMS[k];
              return (e.label || '').toLowerCase().indexOf(q) >= 0
                || (e.def || '').toLowerCase().indexOf(q) >= 0;
            });
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
            h('div', { style: { padding: '16px 20px', borderBottom: '1px solid ' + COLORS.border } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' } },
                h('div', null,
                  h('div', { style: { fontSize: '11px', color: COLORS.accent, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' } }, '\uD83D\uDCD6 Glossary'),
                  h('div', { style: { fontSize: '18px', fontWeight: 800, color: COLORS.text } },
                    q === ''
                      ? ('All ' + allKeys.length + ' terms')
                      : (keys.length + ' of ' + allKeys.length + ' terms'))
                ),
                h('button', {
                  onClick: function() { setBrowseOpen(false); setBrowseQuery(''); },
                  style: { background: 'transparent', border: 'none', fontSize: '22px', color: COLORS.muted, cursor: 'pointer', padding: '2px 6px' },
                  'aria-label': 'Close glossary'
                }, '\u00D7')
              ),
              // Search input. Auto-focuses on open so students can start typing immediately.
              h('div', { style: { position: 'relative' } },
                h('span', {
                  'aria-hidden': 'true',
                  style: { position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: COLORS.muted, fontSize: '14px', pointerEvents: 'none' }
                }, '\uD83D\uDD0D'),
                h('input', {
                  ref: function(el) { if (el && browseOpen) setTimeout(function() { try { el.focus(); } catch (e) {} }, 30); },
                  type: 'text',
                  value: browseQuery,
                  onChange: function(e) { setBrowseQuery(e.target.value); },
                  placeholder: 'Search term or definition...',
                  style: { width: '100%', boxSizing: 'border-box', padding: '8px 34px', border: '1px solid ' + COLORS.border, borderRadius: '8px', fontSize: '13px' },
                  'aria-label': 'Search glossary'
                }),
                browseQuery && h('button', {
                  onClick: function() { setBrowseQuery(''); },
                  style: { position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: COLORS.muted, cursor: 'pointer', fontSize: '14px', padding: '2px 6px' },
                  'aria-label': 'Clear search',
                  title: 'Clear search'
                }, '\u00D7')
              )
            ),
            h('div', { style: { padding: '12px 20px', overflowY: 'auto', flex: 1 } },
              keys.length === 0 && h('div', { style: { padding: '32px 16px', textAlign: 'center', color: COLORS.muted, fontSize: '13px', fontStyle: 'italic' } },
                'No terms match "', h('strong', null, browseQuery), '". Try a different word \u2014 or ',
                h('button', {
                  onClick: function() { setBrowseQuery(''); },
                  style: { background: 'transparent', border: 'none', color: COLORS.accent, cursor: 'pointer', padding: '0', fontSize: '13px', textDecoration: 'underline' }
                }, 'clear the search'),
                ' to see all ' + allKeys.length + ' terms.'
              ),
              keys.map(function(k) {
                var e = TERMS[k];
                var target = e.where ? SECTION_ORDER.filter(function(s) { return s.id === e.where; })[0] : null;
                return h('div', { key: k, style: { display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f1f5f9' } },
                  h('div', { style: { width: '36px', height: '36px', flexShrink: 0, borderRadius: '10px', background: hexToRGBA(COLORS.accent, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' } }, e.icon),
                  h('div', { style: { flex: 1, minWidth: 0 } },
                    h('div', { style: { fontSize: '14px', fontWeight: 800, color: COLORS.text, marginBottom: '2px' } }, e.label),
                    h('div', { style: { fontSize: '12.5px', color: COLORS.text, lineHeight: 1.5, marginBottom: '4px' } }, e.def),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
                      h('div', { style: { fontSize: '11px', color: COLORS.muted, fontStyle: 'italic', flex: 1, minWidth: '140px' } }, '\uD83D\uDC49 ', e.whereDemo),
                      target && h('button', {
                        onClick: function() {
                          setBrowseOpen(false);
                          enterSection(target.id, target.title);
                        },
                        style: {
                          background: hexToRGBA(target.color, 0.12),
                          color: target.color,
                          border: '1px solid ' + hexToRGBA(target.color, 0.35),
                          borderRadius: '999px',
                          padding: '3px 10px',
                          fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        },
                        title: 'Jump to ' + target.title
                      }, 'Go \u2192')
                    )
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
            // Related terms: click to switch the popover to that term without closing.
            entry.related && entry.related.length > 0 && h('div', { style: { paddingTop: '8px', borderTop: '1px solid ' + COLORS.border, marginBottom: '10px' } },
              h('div', { style: { fontSize: '10px', fontWeight: 800, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '6px' } }, 'See also'),
              h('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap' } },
                entry.related.map(function(key) {
                  var related = TERMS[key];
                  if (!related) return null;
                  return h('button', {
                    key: key,
                    onClick: function() { setGlossTerm(key); },
                    style: {
                      background: '#f5f3ff',
                      color: COLORS.accent,
                      border: '1px solid ' + hexToRGBA(COLORS.accent, 0.3),
                      borderRadius: '999px',
                      padding: '4px 10px',
                      fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '4px'
                    }
                  }, h('span', { 'aria-hidden': 'true' }, related.icon), related.label);
                })
              )
            ),
            h('div', { style: { fontSize: '12px', color: COLORS.subtext, fontStyle: 'italic', paddingTop: '8px', borderTop: '1px solid ' + COLORS.border, marginBottom: entry.where ? '10px' : '0' } },
              '\uD83D\uDC49 ', entry.whereDemo),
            // Jump-to-section: one-click navigation from glossary to where the
            // term is demonstrated. Closes the popover and routes to the section.
            entry.where && (function() {
              var target = SECTION_ORDER.filter(function(s) { return s.id === entry.where; })[0];
              if (!target) return null;
              return h('button', {
                onClick: function() {
                  setGlossTerm(null);
                  enterSection(target.id, target.title);
                },
                style: {
                  background: target.color, color: '#fff', border: 'none',
                  padding: '8px 14px', borderRadius: '8px',
                  fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                  width: '100%', textAlign: 'center',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }
              }, 'Go to ' + target.title + ' \u2192');
            })()
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
          // Untouched session: reset with no prompt.
          if (visitedCount === 0) { doReset(); return; }
          askConfirm({
            title: 'Start over?',
            body: 'This clears which sections you\u2019ve visited, your saved prompt iterations, and your UDL reflections. XP you earned elsewhere in AlloFlow is not affected.',
            confirmLabel: '\u21BA Yes, reset',
            cancelLabel: 'Keep my progress',
            confirmColor: COLORS.bad
          }, doReset);
          function doReset() {
            ctx.setToolData(function(prev) {
              var next = Object.assign({}, prev);
              delete next.llmLiteracy;
              return next;
            });
            announceToSR('Lab state reset');
            addToast('Lab state cleared. Fresh start.', 'info');
          }
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
            h('div', { style: { position: 'relative', display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' } },
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
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', flexShrink: 0, alignSelf: 'flex-start' } },
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
              var reflectionCount = (d.reflections || []).length;
              var stats = [
                { n: promptIters,     label: 'prompt iterations', show: promptIters > 0,     color: COLORS.accent },
                { n: perfectSpots,    label: 'perfect spots',     show: perfectSpots > 0,    color: COLORS.good },
                { n: udlReflections,  label: 'UDL reflections',   show: udlReflections > 0,  color: '#db2777' },
                { n: reflectionCount, label: 'reflections',       show: reflectionCount > 0, color: COLORS.accent2 }
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

          // Achievements strip: compiled from toolData flags so it stays in
          // sync with what the student has actually done.
          (function() {
            var checkCount = ['tokens','fails','prompt','spotter','udl'].reduce(function(n, id) {
              return n + (d['check_done_' + id] ? 1 : 0);
            }, 0);
            var allVisited = tiles.every(function(t) { return d.visited && d.visited[t.id]; });
            var badges = [
              { id: 'token_explorer', icon: '\uD83D\uDD24', label: 'Tokenizer explorer', earned: !!d.tokenized, hint: 'Type something into the tokenizer in Section 1.' },
              { id: 'temp_compared',  icon: '\uD83C\uDF21\uFE0F', label: 'Temperature dialed', earned: !!d.tempCompared, hint: 'Compare outputs at different temperatures in Section 1.' },
              { id: 'prompt_crafter', icon: '\u270F\uFE0F', label: 'Prompt crafter', earned: (d.promptIterations || 0) >= 3, hint: 'Write or run 3 prompts in the Section 3 workshop.' },
              { id: 'perfect_spot',   icon: '\uD83C\uDFAF', label: 'Perfect eye (unassisted)', earned: (d.spotterPerfect || 0) >= 1, hint: 'Catch every error in a Section 4 passage without hints.' },
              { id: 'udl_runner',     icon: '\uD83E\uDDED', label: 'UDL thinker', earned: !!d.udlAllDone, hint: 'Work through all 7 preset scenarios in Section 5.' },
              { id: 'check_grad',     icon: '\uD83C\uDF93', label: 'Lab graduate', earned: checkCount === 5, hint: 'Pass all 5 comprehension checks (one per content section).' },
              { id: 'full_explorer',  icon: '\uD83D\uDDFA\uFE0F', label: 'Full explorer', earned: allVisited, hint: 'Visit every section, including the Quick Reference.' }
            ];
            var earnedCount = badges.filter(function(b) { return b.earned; }).length;
            return h('div', { style: {
              marginBottom: '14px',
              padding: '12px 14px',
              background: '#fff',
              border: '1px solid ' + COLORS.border,
              borderRadius: '12px'
            } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: '16px' } }, '\uD83C\uDFC5'),
                  h('div', { style: { fontSize: '13px', fontWeight: 800, color: COLORS.text } }, 'Badges earned'),
                ),
                h('div', { style: { fontSize: '11px', fontWeight: 700, color: COLORS.subtext } },
                  earnedCount + ' of ' + badges.length)
              ),
              h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                badges.map(function(b) {
                  return h('div', {
                    key: b.id,
                    title: b.earned ? b.label + ' \u2014 earned' : b.label + ' \u2014 ' + b.hint,
                    'aria-label': b.label + (b.earned ? ' (earned)' : ' (locked: ' + b.hint + ')'),
                    style: {
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '5px 10px',
                      borderRadius: '999px',
                      background: b.earned ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : '#f1f5f9',
                      border: '1px solid ' + (b.earned ? '#f59e0b' : COLORS.border),
                      color: b.earned ? '#78350f' : COLORS.muted,
                      fontSize: '11px',
                      fontWeight: 700,
                      opacity: b.earned ? 1 : 0.6,
                      transition: 'all .2s ease'
                    }
                  },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: '13px', filter: b.earned ? 'none' : 'grayscale(100%)' } }, b.icon),
                    h('span', null, b.label)
                  );
                })
              )
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
          // Transparency: tell students which model is doing the live work, and
          // remind them it's not the only one or the authoritative one.
          h('div', { style: { marginTop: '20px', padding: '14px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid ' + COLORS.border } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
              h('div', { style: { width: '28px', height: '28px', borderRadius: '8px', background: hexToRGBA(COLORS.accent2, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' } }, '\uD83D\uDD0D'),
              h('h3', { style: { margin: 0, fontSize: '14px', fontWeight: 800, color: COLORS.accent2, letterSpacing: '-.01em' } }, 'About the AI in this lab')
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '12px', lineHeight: 1.5, color: COLORS.text } },
              h('div', null,
                h('div', { style: { fontSize: '10px', fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '3px' } }, 'Model'),
                'Google ', h('strong', null, 'Gemini'), ' powers live demos here. It is ', h('em', null, 'one'), ' LLM among many \u2014 ChatGPT, Claude, and others exist, and each behaves differently on the same prompt.'
              ),
              h('div', null,
                h('div', { style: { fontSize: '10px', fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '3px' } }, 'Knowledge cutoff'),
                'Models have a ', Term('knowledge cutoff', 'cutoff date'), ' \u2014 they don\'t know events after it. Ask the AI directly what its cutoff is if you need to know for time-sensitive questions.'
              ),
              h('div', null,
                h('div', { style: { fontSize: '10px', fontWeight: 700, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '3px' } }, 'Privacy'),
                'What you type may be logged by the AI provider. ', h('strong', null, 'Don\'t paste'), ' names, phone numbers, medical info, or anything you wouldn\'t write on a note that a stranger could read.'
              )
            )
          ),
          // Multimodal primer \u2014 this lab covers TEXT AI, but acknowledge that
          // image, audio, and video models exist and face similar issues.
          h('div', { style: { marginTop: '14px', padding: '14px 16px', background: '#fff', border: '1px solid ' + COLORS.border, borderRadius: '12px' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
              h('div', { style: { width: '28px', height: '28px', borderRadius: '8px', background: hexToRGBA(COLORS.warn, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' } }, '\uD83C\uDFA8'),
              h('h3', { style: { margin: 0, fontSize: '14px', fontWeight: 800, color: COLORS.warn, letterSpacing: '-.01em' } }, 'This lab is about TEXT AI. The same ideas apply to...')
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px', fontSize: '12px', color: COLORS.text, lineHeight: 1.5 } },
              h('div', { style: { padding: '8px 10px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px' } },
                h('div', { style: { fontSize: '11px', fontWeight: 800, color: COLORS.warn, marginBottom: '3px' } }, '\uD83D\uDDBC\uFE0F Image generators'),
                'They hallucinate hands, text, and anatomy the same way text models hallucinate facts. Bias in training data shows up in what they draw.'
              ),
              h('div', { style: { padding: '8px 10px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px' } },
                h('div', { style: { fontSize: '11px', fontWeight: 800, color: COLORS.warn, marginBottom: '3px' } }, '\uD83C\uDFA4 Voice / music AI'),
                'Can clone voices from a few seconds of recording. Consent and deepfake risks apply.'
              ),
              h('div', { style: { padding: '8px 10px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px' } },
                h('div', { style: { fontSize: '11px', fontWeight: 800, color: COLORS.warn, marginBottom: '3px' } }, '\uD83C\uDFAC Video generators'),
                'Newer and even more convincing than deepfakes used to be. Assume any short clip could be synthetic.'
              )
            ),
            h('div', { style: { marginTop: '10px', fontSize: '11.5px', color: COLORS.subtext, fontStyle: 'italic', lineHeight: 1.5 } },
              'The core literacy skills \u2014 check sources, notice when tone doesn\'t match certainty, treat output as draft not truth \u2014 transfer across all of these.'
            )
          ),
          h('div', { style: { marginTop: '14px', padding: '12px', background: '#f1f5f9', borderRadius: '10px', fontSize: '12px', color: COLORS.subtext } },
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
            var info = classifyGeminiError(e);
            addToast(info.emoji + ' ' + info.friendly + ' Showing recorded examples.', 'warn');
          } finally {
            setTempBusy(false);
          }
        }, [tempDemo, hasLiveAI]);

        var activeTemp = tempLive || tempDemo.recordings;
        var showingLive = !!tempLive;

        // ── Continuous temperature playground ──
        // Lets the student pick ANY temperature in [0, 2] and their own prompt
        // and see the output. More open-ended than the 3-preset compare card.
        var playTempTuple = useState(0.7);
        var playTemp = playTempTuple[0]; var setPlayTemp = playTempTuple[1];
        var playPromptTuple = useState('In one sentence, describe a rainy afternoon.');
        var playPrompt = playPromptTuple[0]; var setPlayPrompt = playPromptTuple[1];
        var playOutTuple = useState(null); // array of { temp, text } as student stacks runs
        var playOut = playOutTuple[0]; var setPlayOut = playOutTuple[1];
        var playBusyTuple = useState(false);
        var playBusy = playBusyTuple[0]; var setPlayBusy = playBusyTuple[1];

        var runPlayTemp = useCallback(async function() {
          if (!playPrompt.trim()) return;
          if (!hasLiveAI) { addToast('Live AI not available \u2014 the playground only works with live calls.', 'info'); return; }
          setPlayBusy(true);
          try {
            var out = await callGemini(playPrompt, false, false, playTemp);
            var trimmed = (out || '').trim() || '(empty response)';
            setPlayOut(function(prev) {
              var list = (prev || []).slice();
              list.unshift({ temp: playTemp, text: trimmed, t: Date.now() });
              if (list.length > 5) list = list.slice(0, 5);
              return list;
            });
            bump('tempCompared', 1);
            upd('tempCompared', true);
          } catch (e) {
            console.error('[llmLiteracy] Temperature playground failed:', e);
            var info = classifyGeminiError(e);
            addToast(info.emoji + ' ' + info.friendly, 'warn');
          } finally {
            setPlayBusy(false);
          }
        }, [playPrompt, playTemp, hasLiveAI]);

        // Map temp [0, 2] to a color along blue -> purple -> pink for visual feel.
        function tempToColor(t) {
          t = Math.max(0, Math.min(2, t));
          if (t < 1) {
            // blend #2563eb -> #7c3aed
            var r = Math.round(0x25 + (0x7c - 0x25) * t);
            var g = Math.round(0x63 + (0x3a - 0x63) * t);
            var b = Math.round(0xeb + (0xed - 0xeb) * t);
            return 'rgb(' + r + ',' + g + ',' + b + ')';
          }
          var tt = t - 1;
          var r2 = Math.round(0x7c + (0xdb - 0x7c) * tt);
          var g2 = Math.round(0x3a + (0x27 - 0x3a) * tt);
          var b2 = Math.round(0xed + (0x77 - 0xed) * tt);
          return 'rgb(' + r2 + ',' + g2 + ',' + b2 + ')';
        }
        var playColor = tempToColor(playTemp);

        // Visual overview: the generation loop. Shows the 5 stages of what
        // an LLM actually does, with an arrow wrapping back to the top to
        // make the "repeat thousands of times" nature concrete.
        function renderGenerationLoop() {
          var stages = [
            { icon: '\u270F\uFE0F', color: '#2563eb', title: 'You write text', body: 'Your prompt or the model\'s own previous output.' },
            { icon: '\uD83D\uDD24', color: '#7c3aed', title: 'Tokenize',       body: 'Split text into small pieces (tokens). Words, sub-words, punctuation.' },
            { icon: '\uD83C\uDFB2', color: '#db2777', title: 'Score every next token', body: 'Assign a probability to every possible next token.' },
            { icon: '\uD83C\uDF9B\uFE0F', color: '#d97706', title: 'Sample one', body: 'Temperature picks how random the choice is (see the playground below).' },
            { icon: '\u2795', color: '#059669', title: 'Append, repeat', body: 'Add the new token. Feed it back in. Do this hundreds of times.' }
          ];
          return h('div', { id: 'llm-lit-s1-loop', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: 'none', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', padding: '16px 18px' }) },
            h('h3', { style: { margin: '0 0 4px', fontSize: '16px', color: COLORS.text, fontWeight: 800, letterSpacing: '-.01em' } }, '\uD83D\uDD01 The generation loop'),
            h('p', { style: { margin: '0 0 14px', fontSize: '12.5px', color: COLORS.subtext, lineHeight: 1.5 } },
              'Everything an LLM does is a loop of these 5 steps. Not "thinking" \u2014 pattern matching on tokens, over and over.'
            ),
            h('div', { style: { display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 2px 10px', alignItems: 'stretch' } },
              stages.map(function(s, i) {
                return h('div', { key: i, style: { display: 'flex', alignItems: 'stretch', flexShrink: 0, gap: '8px' } },
                  h('div', { style: {
                    background: '#fff',
                    border: '1.5px solid ' + hexToRGBA(s.color, 0.3),
                    borderTop: '3px solid ' + s.color,
                    borderRadius: '10px',
                    padding: '10px 12px',
                    minWidth: '148px',
                    maxWidth: '180px',
                    boxShadow: '0 1px 3px rgba(15,23,42,.04)'
                  } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' } },
                      h('div', { style: { width: '22px', height: '22px', borderRadius: '6px', background: hexToRGBA(s.color, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' } }, s.icon),
                      h('div', { style: { fontSize: '10px', fontWeight: 800, color: s.color, letterSpacing: '.04em' } }, (i + 1) + ' \u00B7 ' + s.title.toUpperCase())
                    ),
                    h('div', { style: { fontSize: '11.5px', color: COLORS.text, lineHeight: 1.45 } }, s.body)
                  ),
                  i < stages.length - 1 && h('div', {
                    'aria-hidden': 'true',
                    style: { display: 'flex', alignItems: 'center', color: COLORS.muted, fontSize: '18px', fontWeight: 700 }
                  }, '\u2192')
                );
              })
            ),
            // Loop-back indicator
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: hexToRGBA('#059669', 0.06), border: '1px dashed ' + hexToRGBA('#059669', 0.35), borderRadius: '8px', marginTop: '4px' } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: '16px', color: '#059669' } }, '\u21BB'),
              h('span', { style: { fontSize: '12px', color: COLORS.subtext, lineHeight: 1.5 } },
                h('strong', { style: { color: '#059669' } }, 'Loops back: '),
                'The newly sampled token becomes part of the input for the next step. One sentence of AI output is hundreds of these loops.'
              )
            )
          );
        }

        return h('div', { style: { padding: '20px', maxWidth: '960px', margin: '0 auto' } },
          topBar('1. How LLMs Work'),
          teacherNote('tokens'),
          sectionTOC('#2563eb', [
            { id: 'llm-lit-s1-loop',      icon: '\uD83D\uDD01',     label: 'Generation loop' },
            { id: 'llm-lit-s1-tokens',    icon: '\uD83D\uDD24',     label: 'Tokenization' },
            { id: 'llm-lit-s1-nexttok',   icon: '\uD83C\uDFB2',     label: 'Next-token' },
            { id: 'llm-lit-s1-tempcompare', icon: '\uD83C\uDF21\uFE0F', label: 'Temperature' },
            { id: 'llm-lit-s1-playground',  icon: '\uD83C\uDF9B\uFE0F', label: 'Playground' }
          ]),
          renderGenerationLoop(),

          // ── Part A: Tokenization ──
          h('div', { id: 'llm-lit-s1-tokens', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.accent2 }) },
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
            // Preset chips: compare how different content types tokenize.
            // Teaching point \u2014 English plain text is cheapest; code, URLs, and
            // non-English languages cost more tokens per character.
            h('div', { style: { marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' } },
              h('span', { style: { fontSize: '11px', color: COLORS.muted, fontWeight: 600, marginRight: '2px' } }, 'Try:'),
              [
                { label: 'English',  text: 'The dog was running quickly because it was unhappy.' },
                { label: 'Code',     text: 'function hello(name) {\n  return "Hi, " + name + "!";\n}' },
                { label: 'URL',      text: 'https://www.example.com/path/to/resource?id=42&view=full' },
                { label: 'Emoji',    text: 'I had pizza \uD83C\uDF55 and ice cream \uD83C\uDF68 at the park \uD83C\uDFDE\uFE0F today!' },
                { label: 'Unusual words', text: 'The paleontologist misidentified the pseudoscorpion as an arthropod.' }
              ].map(function(preset, i) {
                return h('button', {
                  key: i,
                  type: 'button',
                  onClick: function() { setTokText(preset.text); setOnce('tokenized'); },
                  style: {
                    background: '#eff6ff', color: COLORS.accent2,
                    border: '1px solid #bfdbfe',
                    borderRadius: '14px', padding: '4px 10px',
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    transition: 'all .15s ease'
                  },
                  title: 'Tokenize a ' + preset.label.toLowerCase() + ' example'
                }, preset.label);
              })
            ),
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
          h('div', { id: 'llm-lit-s1-nexttok', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.accent }) },
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
          h('div', { id: 'llm-lit-s1-tempcompare', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.warn }) },
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
              'Low temperature is right for facts ("what is the capital of France?"). High temperature is right for creative work. Most AI chat tools default somewhere in the middle \u2014 which is why a factual question sometimes drifts.'
            )
          ),

          // ── Part D: Continuous temperature playground ──
          h('div', { id: 'llm-lit-s1-playground', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + playColor }) },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' } },
              h('div', { style: { width: '32px', height: '32px', borderRadius: '8px', background: hexToRGBA(playColor, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', transition: 'background .3s ease' } }, '\uD83C\uDF9B\uFE0F'),
              h('h3', { style: { margin: 0, fontSize: '17px', color: playColor, transition: 'color .3s ease' } }, 'Temperature playground')
            ),
            h('p', { style: { margin: '0 0 12px', fontSize: '12px', color: COLORS.subtext, lineHeight: 1.5 } },
              'Pick any temperature and any prompt. Run it live. Then run the same prompt at a different temperature and compare. The last 5 runs stay visible so you can watch the output shift with the dial.'
            ),
            h('label', { style: { display: 'block', fontSize: '11px', fontWeight: 700, color: COLORS.subtext, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.05em' } }, 'Your prompt'),
            h('textarea', {
              value: playPrompt,
              onChange: function(e) { setPlayPrompt(e.target.value); },
              rows: 2,
              style: { width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid ' + COLORS.border, borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', marginBottom: '12px', resize: 'vertical' },
              'aria-label': 'Playground prompt'
            }),
            h('label', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '11px', fontWeight: 700, color: COLORS.subtext, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.05em' } },
              h('span', null, 'Temperature'),
              h('span', { style: { fontSize: '20px', fontWeight: 800, color: playColor, fontFamily: 'monospace' } }, playTemp.toFixed(2))
            ),
            h('input', {
              type: 'range',
              min: '0', max: '2', step: '0.05',
              value: playTemp,
              onChange: function(e) { setPlayTemp(parseFloat(e.target.value)); },
              style: {
                width: '100%',
                accentColor: playColor,
                marginBottom: '2px'
              },
              'aria-label': 'Temperature slider',
              'aria-valuemin': '0', 'aria-valuemax': '2', 'aria-valuenow': playTemp
            }),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: COLORS.muted, marginBottom: '10px' } },
              h('span', null, '0.0 \u2744\uFE0F deterministic'),
              h('span', null, '1.0 \u269C\uFE0F balanced'),
              h('span', null, '2.0 \uD83D\uDD25 chaotic')
            ),
            h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' } },
              h('button', {
                onClick: runPlayTemp,
                disabled: playBusy || !playPrompt.trim() || !hasLiveAI,
                style: btn(playColor, '#fff', playBusy || !playPrompt.trim() || !hasLiveAI)
              }, playBusy ? '\u23F3 Running...' : '\u25B6 Run at ' + playTemp.toFixed(2)),
              playOut && playOut.length > 0 && h('button', {
                onClick: function() { setPlayOut(null); },
                style: btn('#e2e8f0', COLORS.text, false)
              }, '\uD83D\uDDD1\uFE0F Clear runs'),
              !hasLiveAI && h('span', { style: { fontSize: '11px', color: COLORS.muted, fontStyle: 'italic' } }, 'Live AI required for the playground \u2014 the 3-preset compare above uses recorded examples.')
            ),
            playOut && playOut.length > 0 && h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
              playOut.map(function(run, i) {
                var color = tempToColor(run.temp);
                return h('div', { key: i, className: i === 0 ? 'llm-lit-fade-in' : '', style: {
                  background: '#fff',
                  border: '1px solid ' + hexToRGBA(color, 0.3),
                  borderLeft: '4px solid ' + color,
                  borderRadius: '8px',
                  padding: '10px 12px'
                } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '11px' } },
                    h('span', { style: { fontWeight: 800, color: color, fontFamily: 'monospace' } }, 'temp ' + run.temp.toFixed(2)),
                    h('span', { style: { color: COLORS.muted } }, i === 0 ? 'Latest' : (playOut.length - i) + ' runs ago')
                  ),
                  h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.55, whiteSpace: 'pre-wrap' } }, flaggedText(run.text))
                );
              })
            )
          ),

          comprehensionCheck('tokens'),
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
        // Paste-to-analyze: student brings any AI output, sees red flags
        // highlighted + counted. Works in air-gap (no LLM call).
        var pasteTuple = useState('');
        var pasteText = pasteTuple[0]; var setPasteText = pasteTuple[1];

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
            var info = classifyGeminiError(err);
            setLiveAsk(function(prev) {
              var next = Object.assign({}, prev);
              next[g.category] = '[' + info.emoji + ' ' + info.friendly + ']\n\nWhy this happens: ' + info.teaching;
              return next;
            });
            addToast(info.emoji + ' ' + info.friendly, 'warn');
          }).then(function() {
            setAskBusy(false);
          });
        }

        return h('div', { style: { padding: '20px', maxWidth: '820px', margin: '0 auto' } },
          topBar('2. Why LLMs Get Things Wrong'),
          teacherNote('fails'),
          h('p', { style: { fontSize: '13px', color: COLORS.subtext, lineHeight: 1.5, marginTop: 0 } },
            'LLMs don\'t know what they don\'t know. They generate the most plausible-sounding next token even when the plausible answer is wrong \u2014 this is called ', Term('hallucination', 'hallucination'),
            ' (or sometimes ', Term('confabulation', 'confabulation'), '). Here are seven failure modes every student should recognize.'
          ),
          sectionTOC('#d97706', [
            { id: 'llm-lit-s2-cutoff',    icon: '\u23F0',     label: 'Cutoff' },
            { id: 'llm-lit-s2-mechanism', icon: '\u2699\uFE0F', label: 'Why it happens' },
            { id: 'llm-lit-s2-models',    icon: '\uD83E\uDD16', label: 'Model comparison' },
            { id: 'llm-lit-s2-gallery',   icon: '\uD83D\uDDC2\uFE0F', label: 'Failure gallery' },
            { id: 'llm-lit-s2-scatter',   icon: '\uD83D\uDCCA', label: 'Confidence chart' },
            { id: 'llm-lit-s2-paste',     icon: '\uD83D\uDD0E', label: 'Analyze AI text' }
          ]),

          // Knowledge-cutoff timeline: shows WHERE on the time axis the model
          // genuinely knows things vs where it is guessing.
          (function() {
            var now = new Date();
            var nowLabel = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            return h('div', { id: 'llm-lit-s2-cutoff', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.accent2 }) },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' } },
                h('div', { style: { width: '32px', height: '32px', borderRadius: '8px', background: hexToRGBA(COLORS.accent2, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' } }, '\u23F3'),
                h('h3', { style: { margin: 0, fontSize: '16px', color: COLORS.accent2, fontWeight: 800 } }, 'Where the AI\u2019s knowledge ends')
              ),
              h('p', { style: { margin: '0 0 12px', fontSize: '12.5px', color: COLORS.subtext, lineHeight: 1.5 } },
                'Every model has a ', Term('knowledge cutoff', 'knowledge cutoff'),
                ' \u2014 the date its training data ends. Anything after that is unknown, though the model may still sound confident. Ask it: ', h('em', null, '"What is your knowledge cutoff date?"')
              ),
              // Timeline bar
              h('div', { style: { position: 'relative', marginTop: '6px', marginBottom: '38px' } },
                h('div', { style: { height: '28px', borderRadius: '999px', background: 'linear-gradient(90deg, ' + COLORS.accent2 + ' 0%, ' + COLORS.accent2 + ' 62%, #fde68a 62%, #fde68a 64%, #fee2e2 64%, #fee2e2 100%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.1)' } }),
                // Left label: known
                h('div', { style: { position: 'absolute', left: '2%', top: '50%', transform: 'translateY(-50%)', color: '#fff', fontSize: '11px', fontWeight: 700, letterSpacing: '.03em' } }, '\u2713 KNOWN \u2014 training data'),
                // Right label: unknown
                h('div', { style: { position: 'absolute', right: '2%', top: '50%', transform: 'translateY(-50%)', color: '#991b1b', fontSize: '11px', fontWeight: 700, letterSpacing: '.03em' } }, 'UNKNOWN \u2014 after cutoff'),
                // Cutoff tick + label
                h('div', { style: { position: 'absolute', left: '63%', top: '-8px', bottom: '-8px', width: '2px', background: '#b45309' } }),
                h('div', { style: { position: 'absolute', left: '63%', top: '40px', transform: 'translateX(-50%)', textAlign: 'center' } },
                  h('div', { style: { fontSize: '10px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '.05em' } }, 'Cutoff'),
                  h('div', { style: { fontSize: '10px', color: COLORS.muted } }, 'model\'s last "now"')
                ),
                // Today tick + label
                h('div', { style: { position: 'absolute', right: '2%', top: '-8px', bottom: '-8px', width: '2px', background: COLORS.bad } }),
                h('div', { style: { position: 'absolute', right: '2%', top: '40px', transform: 'translateX(50%)', textAlign: 'center' } },
                  h('div', { style: { fontSize: '10px', fontWeight: 800, color: COLORS.bad, textTransform: 'uppercase', letterSpacing: '.05em' } }, 'Today'),
                  h('div', { style: { fontSize: '10px', color: COLORS.muted } }, nowLabel)
                )
              ),
              h('div', { style: { fontSize: '11.5px', color: COLORS.subtext, lineHeight: 1.5, padding: '8px 10px', background: '#f8fafc', borderRadius: '8px' } },
                h('strong', null, 'What to do: '),
                'If the question is about something that could have changed or happened recently, do not trust the AI\'s answer without a live web source. You can also ask the model directly what its cutoff is \u2014 it usually knows.'
              )
            );
          })(),

          // Mechanism diagram: why hallucinations happen. Shows that the same
          // pipeline produces both right and wrong answers with the same tone.
          (function() {
            return h('div', { id: 'llm-lit-s2-mechanism', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.bad }) },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' } },
                h('div', { style: { width: '32px', height: '32px', borderRadius: '8px', background: hexToRGBA(COLORS.bad, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' } }, '\u2699\uFE0F'),
                h('h3', { style: { margin: 0, fontSize: '16px', color: COLORS.bad, fontWeight: 800 } }, 'Why hallucination even happens')
              ),
              h('p', { style: { margin: '0 0 14px', fontSize: '12.5px', color: COLORS.subtext, lineHeight: 1.5 } },
                'The LLM doesn\'t have a "truth" step. It has a "plausible" step. The exact same pipeline produces both right and wrong answers \u2014 with the same confident tone.'
              ),
              // Flow: query -> plausible generator -> two parallel outputs (right, wrong)
              h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(140px, 180px) 32px minmax(180px, 240px) 32px 1fr', gap: '6px', alignItems: 'center' } },
                // Query
                h('div', { style: { background: '#fff', border: '2px solid ' + COLORS.accent2, borderRadius: '10px', padding: '10px 12px', textAlign: 'center' } },
                  h('div', { style: { fontSize: '22px', marginBottom: '2px' } }, '\u2753'),
                  h('div', { style: { fontSize: '11px', fontWeight: 800, color: COLORS.accent2, textTransform: 'uppercase', letterSpacing: '.05em' } }, 'Your question'),
                  h('div', { style: { fontSize: '11px', color: COLORS.subtext, marginTop: '3px', lineHeight: 1.4 } }, 'Could be about anything.')
                ),
                h('div', { 'aria-hidden': 'true', style: { textAlign: 'center', color: COLORS.muted, fontSize: '18px', fontWeight: 700 } }, '\u2192'),
                // Plausible-next-token generator
                h('div', { style: { background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '2px solid #f59e0b', borderRadius: '10px', padding: '10px 12px', textAlign: 'center', boxShadow: '0 2px 6px -2px rgba(217, 119, 6, .25)' } },
                  h('div', { style: { fontSize: '22px', marginBottom: '2px' } }, '\uD83C\uDFB2'),
                  h('div', { style: { fontSize: '11px', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.05em' } }, 'Plausible-text generator'),
                  h('div', { style: { fontSize: '11px', color: '#78350f', marginTop: '3px', lineHeight: 1.4 } }, 'Picks likely next tokens. Has no fact check.')
                ),
                h('div', { 'aria-hidden': 'true', style: { textAlign: 'center', color: COLORS.muted, fontSize: '18px', fontWeight: 700 } }, '\u2192'),
                // Two outputs stacked
                h('div', { style: { display: 'grid', gridTemplateRows: '1fr 1fr', gap: '6px' } },
                  h('div', { style: { background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '10px', padding: '8px 10px' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: COLORS.good } },
                      h('span', null, '\u2713'), 'Sometimes RIGHT'),
                    h('div', { style: { fontSize: '11px', color: COLORS.subtext, marginTop: '2px', lineHeight: 1.4 } }, 'Fact was in training data and the model retrieved the right pattern.')
                  ),
                  h('div', { style: { background: '#fef2f2', border: '2px solid #fecaca', borderRadius: '10px', padding: '8px 10px' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: COLORS.bad } },
                      h('span', null, '\u2717'), 'Sometimes WRONG'),
                    h('div', { style: { fontSize: '11px', color: COLORS.subtext, marginTop: '2px', lineHeight: 1.4 } }, 'Fact wasn\'t present, or the pattern looks right but isn\'t.')
                  )
                )
              ),
              // Punchline
              h('div', { style: { marginTop: '12px', padding: '10px 12px', background: hexToRGBA(COLORS.bad, 0.06), border: '1px solid ' + hexToRGBA(COLORS.bad, 0.25), borderRadius: '8px' } },
                h('div', { style: { fontSize: '12.5px', color: COLORS.text, lineHeight: 1.5 } },
                  h('strong', { style: { color: COLORS.bad } }, 'The hard part: '),
                  'both paths come out the same way \u2014 same confident tone, same fluent sentences. The only way to tell them apart is to check against something outside the AI.'
                )
              )
            );
          })(),

          // Model comparison: same prompt, three different LLMs. Shows that
          // "the AI" is plural \u2014 each model has its own defaults and voice.
          h('div', { id: 'llm-lit-s2-models', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.accent }) },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' } },
              h('div', { style: { width: '32px', height: '32px', borderRadius: '8px', background: hexToRGBA(COLORS.accent, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' } }, '\uD83E\uDD16'),
              h('h3', { style: { margin: 0, fontSize: '16px', color: COLORS.accent, fontWeight: 800 } }, '"The AI" is not one thing')
            ),
            h('p', { style: { margin: '0 0 10px', fontSize: '12.5px', color: COLORS.subtext, lineHeight: 1.5 } },
              'Same prompt, three different models. Read carefully \u2014 the science is the same, but the voice, length, and hedging differ. If your class tested with one model and your friend tested with another, you\u2019d get different answers and both would be "right."'
            ),
            h('div', { style: { background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid ' + COLORS.border, marginBottom: '12px', fontSize: '13px', fontStyle: 'italic', color: COLORS.subtext } },
              h('strong', null, 'Prompt: '), '"' + MODEL_COMPARISON.prompt + '"'
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' } },
              MODEL_COMPARISON.rows.map(function(row) {
                return h('div', { key: row.model, style: {
                  background: '#fff',
                  border: '1px solid ' + hexToRGBA(row.color, 0.25),
                  borderLeft: '4px solid ' + row.color,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex', flexDirection: 'column'
                } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' } },
                    h('div', { style: {
                      width: '28px', height: '28px', borderRadius: '8px',
                      background: hexToRGBA(row.color, 0.15),
                      color: row.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 800
                    } }, row.model.charAt(0)),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: '14px', fontWeight: 800, color: row.color, letterSpacing: '-.01em' } }, row.model),
                      h('div', { style: { fontSize: '10px', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: '.05em' } }, row.provider)
                    )
                  ),
                  h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.55, flex: 1 } }, row.output),
                  h('div', { style: { marginTop: '8px', display: 'flex', gap: '10px', fontSize: '11px', color: COLORS.muted } },
                    h('span', null, (row.output.split(/\s+/).length) + ' words'),
                    h('span', null, row.output.length + ' chars')
                  )
                );
              })
            ),
            h('div', { style: { marginTop: '12px', padding: '10px 12px', background: hexToRGBA(COLORS.accent, 0.06), border: '1px solid ' + hexToRGBA(COLORS.accent, 0.25), borderRadius: '8px' } },
              h('div', { style: { fontSize: '11px', fontWeight: 800, color: COLORS.accent, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '4px' } }, 'What to notice'),
              h('div', { style: { fontSize: '12.5px', color: COLORS.text, lineHeight: 1.55 } },
                'Length varies by 10+ words. One model leads with the explanation, another with the visible effect. One uses "wavelengths" explicitly, another says "colors." None is more correct \u2014 but if you needed a specific phrasing for an assignment, the model you picked would matter.'
              )
            ),
            h('div', { style: { marginTop: '8px', fontSize: '10px', color: COLORS.muted, fontStyle: 'italic' } },
              'Recorded examples for teaching, not live calls. Live calls here use Gemini only.'
            )
          ),

          h('div', { id: 'llm-lit-s2-gallery', className: 'llm-lit-anchor', style: { display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' } },
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
              h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, flaggedText(liveAsk[g.category]))
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

          // Confidence-vs-accuracy scatter: the core insight of the section
          // rendered as a 2x2 grid — high/low confidence crossed with right/wrong.
          // Most hallucinations live in the top-right quadrant: confident AND wrong.
          (function() {
            var W = 360, H = 220;
            var padL = 44, padB = 38, padT = 12, padR = 18;
            var plotW = W - padL - padR;
            var plotH = H - padT - padB;
            // Sample points: [x = confidence 0-1, y = accuracy 0-1, label]
            // The teaching point: the AI's outputs cluster in the top band
            // (high confidence) regardless of whether they're correct.
            var pts = [
              { x: .94, y: .06, label: 'fake citation',   color: COLORS.bad },
              { x: .88, y: .12, label: 'math error',       color: COLORS.bad },
              { x: .92, y: .20, label: 'fake event',       color: COLORS.bad },
              { x: .90, y: .25, label: 'stale fact',       color: COLORS.bad },
              { x: .72, y: .65, label: 'biased framing',   color: COLORS.warn },
              { x: .95, y: .92, label: 'correct fact',    color: COLORS.good },
              { x: .87, y: .95, label: 'correct def.',    color: COLORS.good },
              { x: .93, y: .88, label: 'right answer',    color: COLORS.good }
            ];
            function px(x) { return padL + x * plotW; }
            function py(y) { return padT + (1 - y) * plotH; }
            return h('div', { id: 'llm-lit-s2-scatter', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.warn }) },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' } },
                h('div', { style: { width: '32px', height: '32px', borderRadius: '8px', background: hexToRGBA(COLORS.warn, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' } }, '\uD83D\uDCCA'),
                h('h3', { style: { margin: 0, fontSize: '16px', color: COLORS.warn, fontWeight: 800 } }, 'Confidence is NOT calibration')
              ),
              h('p', { style: { margin: '0 0 12px', fontSize: '12.5px', color: COLORS.subtext, lineHeight: 1.5 } },
                'If AI-confidence tracked correctness, the dots below would form a diagonal. Instead, almost every AI answer reads as high-confidence \u2014 whether it\'s right or not. The tone is the same.'
              ),
              h('div', { style: { display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' } },
                // The SVG chart
                h('svg', {
                  width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
                  role: 'img',
                  'aria-label': 'Scatter plot: AI confidence on the x axis vs. accuracy on the y axis. Most answers cluster at high confidence regardless of accuracy.',
                  style: { maxWidth: '100%', height: 'auto' }
                },
                  // Axes
                  h('line', { x1: padL, y1: padT, x2: padL, y2: padT + plotH, stroke: COLORS.border, strokeWidth: 1 }),
                  h('line', { x1: padL, y1: padT + plotH, x2: padL + plotW, y2: padT + plotH, stroke: COLORS.border, strokeWidth: 1 }),
                  // Gridlines (quadrant split at 50%)
                  h('line', { x1: padL + plotW / 2, y1: padT, x2: padL + plotW / 2, y2: padT + plotH, stroke: COLORS.border, strokeWidth: 1, strokeDasharray: '3 3' }),
                  h('line', { x1: padL, y1: padT + plotH / 2, x2: padL + plotW, y2: padT + plotH / 2, stroke: COLORS.border, strokeWidth: 1, strokeDasharray: '3 3' }),
                  // Quadrant tint: top-right = confident + right; top-left = unconfident + right; bottom-right = confident + WRONG (the problem zone)
                  h('rect', { x: padL + plotW / 2, y: padT + plotH / 2, width: plotW / 2, height: plotH / 2, fill: hexToRGBA(COLORS.bad, 0.06) }),
                  // Perfect-calibration reference line (dashed, subtle)
                  h('line', {
                    x1: padL, y1: padT + plotH,
                    x2: padL + plotW, y2: padT,
                    stroke: COLORS.muted, strokeWidth: 1, strokeDasharray: '2 4', opacity: 0.6
                  }),
                  // Axis labels
                  h('text', { x: padL + plotW / 2, y: H - 8, textAnchor: 'middle', fontSize: '11', fill: COLORS.subtext, fontWeight: 700 }, 'AI confidence \u2192'),
                  h('text', { x: padL - 28, y: padT + plotH / 2, textAnchor: 'middle', fontSize: '11', fill: COLORS.subtext, fontWeight: 700, transform: 'rotate(-90, ' + (padL - 28) + ', ' + (padT + plotH / 2) + ')' }, 'Actually correct \u2192'),
                  // Tick labels
                  h('text', { x: padL, y: padT + plotH + 12, textAnchor: 'middle', fontSize: '9', fill: COLORS.muted }, 'low'),
                  h('text', { x: padL + plotW, y: padT + plotH + 12, textAnchor: 'middle', fontSize: '9', fill: COLORS.muted }, 'high'),
                  h('text', { x: padL - 6, y: padT + plotH + 3, textAnchor: 'end', fontSize: '9', fill: COLORS.muted }, 'wrong'),
                  h('text', { x: padL - 6, y: padT + 3, textAnchor: 'end', fontSize: '9', fill: COLORS.muted }, 'right'),
                  // Quadrant label for the dangerous zone
                  h('text', { x: padL + plotW * 0.75, y: padT + plotH * 0.92, textAnchor: 'middle', fontSize: '10', fill: COLORS.bad, fontWeight: 700, opacity: 0.7 }, 'CONFIDENT BUT WRONG'),
                  // Points
                  pts.map(function(pt, i) {
                    return h('g', { key: i },
                      h('circle', {
                        cx: px(pt.x), cy: py(pt.y),
                        r: 6,
                        fill: pt.color,
                        stroke: '#fff',
                        strokeWidth: 2
                      }),
                      h('title', null, pt.label + ' \u2014 confidence ' + (pt.x * 100).toFixed(0) + '%, correct ' + (pt.y * 100).toFixed(0) + '%')
                    );
                  })
                ),
                // Reading guide beside the chart
                h('div', { style: { flex: 1, minWidth: '200px', fontSize: '12.5px', color: COLORS.text, lineHeight: 1.55 } },
                  h('div', { style: { fontSize: '11px', fontWeight: 800, color: COLORS.subtext, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '5px' } }, 'What you\'re seeing'),
                  h('ul', { style: { margin: 0, paddingLeft: '18px' } },
                    h('li', null, 'If AI confidence tracked truth, dots would line up on the dashed diagonal.'),
                    h('li', null, h('span', { style: { color: COLORS.bad, fontWeight: 700 } }, 'Red dots'), ' in the bottom-right are the danger zone: sounds sure, actually wrong.'),
                    h('li', null, h('span', { style: { color: COLORS.good, fontWeight: 700 } }, 'Green dots'), ' look identical to red in tone. That\'s the teaching point.'),
                    h('li', null, 'You can\'t tell which is which from inside the AI. Only external checking works.')
                  )
                )
              )
            );
          })(),

          // Paste-to-analyze: tool scans any AI text the student pastes in.
          // Works offline \u2014 it uses the same local red-flag patterns applied
          // to live outputs throughout the rest of the lab.
          (function() {
            var segs = scanForFlags(pasteText || '');
            var flagCounts = {};
            segs.forEach(function(s) {
              if (!s.flag) return;
              flagCounts[s.flag.kind] = (flagCounts[s.flag.kind] || 0) + 1;
            });
            var flagSummary = Object.keys(flagCounts).map(function(k) {
              var entry = FLAG_PATTERNS.find(function(p) { return p.kind === k; });
              return { kind: k, label: entry && entry.label, color: entry && entry.color, count: flagCounts[k] };
            });
            var totalFlags = flagSummary.reduce(function(n, s) { return n + s.count; }, 0);
            return h('div', { id: 'llm-lit-s2-paste', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid #0284c7' }) },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' } },
                h('div', { style: { width: '32px', height: '32px', borderRadius: '8px', background: hexToRGBA('#0284c7', 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' } }, '\uD83D\uDD0E'),
                h('h3', { style: { margin: 0, fontSize: '16px', color: '#0284c7', fontWeight: 800 } }, 'Analyze any AI output')
              ),
              h('p', { style: { margin: '0 0 10px', fontSize: '12.5px', color: COLORS.subtext, lineHeight: 1.5 } },
                'Paste any AI-generated text (from here, another chatbot, an article that claims to be AI-written, etc.). The tool highlights ', FLAG_PATTERNS.length, ' kinds of red flags so you can see where to verify. No AI call required \u2014 this runs locally.'
              ),
              h('div', { style: { position: 'relative', marginBottom: '10px' } },
                h('textarea', {
                  value: pasteText,
                  onChange: function(e) { setPasteText(e.target.value); },
                  placeholder: 'Paste an AI response here to see which phrases deserve a second look...',
                  rows: 4,
                  style: { width: '100%', boxSizing: 'border-box', padding: '10px', paddingRight: SPEECH_SUPPORTED ? '44px' : '10px', border: '1px solid ' + COLORS.border, borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' },
                  'aria-label': 'Paste AI output for red-flag analysis'
                }),
                SPEECH_SUPPORTED && h('div', { style: { position: 'absolute', right: '6px', top: '6px' } },
                  h(MicButton, { id: 'paste', currentValue: pasteText, appendTo: setPasteText })
                )
              ),
              pasteText.trim() && h('div', null,
                // Summary row
                h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' } },
                  h('div', { style: { fontSize: '13px', fontWeight: 700, color: totalFlags > 0 ? COLORS.warn : COLORS.good } },
                    totalFlags === 0 ? '\u2713 No red flags detected' : '\u26A0\uFE0F ' + totalFlags + ' flag' + (totalFlags === 1 ? '' : 's') + ' found'),
                  flagSummary.map(function(s) {
                    return h('div', {
                      key: s.kind,
                      style: {
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '3px 10px', borderRadius: '999px',
                        background: hexToRGBA(s.color, 0.1),
                        border: '1px solid ' + hexToRGBA(s.color, 0.35),
                        fontSize: '11px', fontWeight: 700, color: s.color
                      }
                    },
                      h('span', { style: {
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '18px', height: '18px', borderRadius: '50%',
                        background: s.color, color: '#fff',
                        fontSize: '10px'
                      } }, s.count),
                      s.label
                    );
                  })
                ),
                // Annotated passage
                h('div', { style: {
                  background: '#fff', border: '1px solid ' + COLORS.border,
                  borderRadius: '8px', padding: '12px 14px',
                  fontSize: '13px', lineHeight: 1.7, color: COLORS.text,
                  whiteSpace: 'pre-wrap',
                  maxHeight: '360px', overflowY: 'auto'
                } }, flaggedText(pasteText))
              ),
              pasteText.trim() === '' && h('div', { style: {
                padding: '14px',
                background: '#f8fafc',
                border: '1px dashed ' + COLORS.border,
                borderRadius: '8px',
                fontSize: '12px', color: COLORS.muted, fontStyle: 'italic',
                textAlign: 'center'
              } },
                'Nothing to analyze yet. Paste some AI-generated text above to see which phrases might need verification.'
              )
            );
          })(),

          comprehensionCheck('fails'),
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
          if (!hasLiveAI || abBusy) return; // guard: ignore re-clicks while in flight
          var lockedPairIdx = pairIdx; // capture in case user switches tabs mid-flight
          setAbBusy(true);
          // Fire both calls in parallel so the student sees true side-by-side timing.
          // jsonMode=false for both — we want natural language, temp 0.7 balanced.
          Promise.all([
            callGemini(pair.weak,   false, false, 0.7).then(function(x) { return (x || '').trim() || '(empty)'; }).catch(function() { return '(call failed)'; }),
            callGemini(pair.strong, false, false, 0.7).then(function(x) { return (x || '').trim() || '(empty)'; }).catch(function() { return '(call failed)'; })
          ]).then(function(results) {
            setAbResult(function(prev) {
              var next = Object.assign({}, prev);
              next[lockedPairIdx] = { weak: results[0], strong: results[1] };
              return next;
            });
            bump('promptIterations', 1);
          }).then(function() {
            setAbBusy(false);
          });
        }
        var currentAB = abResult[pairIdx];

        // Cookbook drawer expansion state.
        var cookbookTuple = useState(false);
        var cookbookOpen = cookbookTuple[0]; var setCookbookOpen = cookbookTuple[1];
        // Recipe favorites \u2014 keyed by recipe id, persisted in toolData.
        function recipeIsFavorite(id) {
          var favs = d.favoriteRecipes || {};
          return !!favs[id];
        }
        function toggleFavoriteRecipe(id) {
          if (!ctx.setToolData) return;
          ctx.setToolData(function(prev) {
            var existing = (prev && prev.llmLiteracy) || {};
            var favs = Object.assign({}, existing.favoriteRecipes || {});
            if (favs[id]) delete favs[id]; else favs[id] = true;
            return Object.assign({}, prev, { llmLiteracy: Object.assign({}, existing, { favoriteRecipes: favs }) });
          });
        }
        // Sort favorites to the top without mutating the source array.
        function orderedRecipes() {
          var favs = d.favoriteRecipes || {};
          var list = PROMPT_RECIPES.slice();
          list.sort(function(a, b) {
            var fa = favs[a.id] ? 0 : 1;
            var fb = favs[b.id] ? 0 : 1;
            return fa - fb;
          });
          return list;
        }

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
            var trimmed = (out || '').trim() || '(empty response)';
            setLiveOutput(trimmed);
            bump('promptIterations', 1);
            awardXP(5, 'Iterated a prompt');
            // Autosave the attempt to the journal (deduped by exact-prompt match).
            journalAdd(userPrompt, trimmed);
          } catch (e) {
            console.error('[llmLiteracy] Prompt live run failed:', e);
            var info = classifyGeminiError(e);
            setLiveOutput('[' + info.emoji + ' ' + info.friendly + ']\n\nWhy this happens: ' + info.teaching);
            addToast(info.emoji + ' ' + info.friendly, 'warn');
          } finally {
            setLiveBusy(false);
          }
        }, [userPrompt, hasLiveAI]);

        // ── Prompt journal ──
        // Persisted to toolData.llmLiteracy.journal as array of {t,p,o,s}.
        // Cap at MAX_JOURNAL to keep the saved blob small.
        var MAX_JOURNAL = 15;
        function journalAdd(prompt, output) {
          var trimmed = (prompt || '').trim();
          if (!trimmed || !ctx.setToolData) return;
          ctx.setToolData(function(prev) {
            var existing = (prev && prev.llmLiteracy) || {};
            var list = (existing.journal || []).slice();
            // Dedupe: if the last entry has the same prompt, update its output + bump time instead of duplicating.
            if (list.length > 0 && list[0].p === trimmed) {
              list[0] = Object.assign({}, list[0], { t: Date.now(), o: (output || '').slice(0, 240) });
            } else {
              list.unshift({ t: Date.now(), p: trimmed, o: (output || '').slice(0, 240), s: false });
              if (list.length > MAX_JOURNAL) list = list.slice(0, MAX_JOURNAL);
            }
            var td = Object.assign({}, existing, { journal: list });
            return Object.assign({}, prev, { llmLiteracy: td });
          });
        }
        function journalToggleStar(idx) {
          if (!ctx.setToolData) return;
          ctx.setToolData(function(prev) {
            var existing = (prev && prev.llmLiteracy) || {};
            var list = (existing.journal || []).slice();
            if (!list[idx]) return prev;
            list[idx] = Object.assign({}, list[idx], { s: !list[idx].s });
            return Object.assign({}, prev, { llmLiteracy: Object.assign({}, existing, { journal: list }) });
          });
        }
        function journalDelete(idx) {
          if (!ctx.setToolData) return;
          ctx.setToolData(function(prev) {
            var existing = (prev && prev.llmLiteracy) || {};
            var list = (existing.journal || []).slice();
            list.splice(idx, 1);
            return Object.assign({}, prev, { llmLiteracy: Object.assign({}, existing, { journal: list }) });
          });
        }
        function journalSaveCurrent() {
          if (!userPrompt.trim()) { addToast('Nothing to save yet \u2014 write a prompt first.', 'info'); return; }
          journalAdd(userPrompt, liveOutput);
          addToast('Saved to your journal.', 'success');
        }
        // Download the journal as a Markdown file so students can hand it in,
        // share with a teacher, or keep it alongside their other notes.
        function journalExport() {
          var list = (d.journal || []);
          if (list.length === 0) { addToast('Nothing to export yet.', 'info'); return; }
          var today = new Date();
          var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
          var dateStr = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
          var lines = ['# AlloFlow AI Literacy Lab \u2014 Prompt Journal', '', 'Exported ' + dateStr, ''];
          list.forEach(function(entry, i) {
            var when = new Date(entry.t);
            var stamp = when.getFullYear() + '-' + pad(when.getMonth()+1) + '-' + pad(when.getDate()) + ' ' + pad(when.getHours()) + ':' + pad(when.getMinutes());
            lines.push('## ' + (entry.s ? '\u2B50 ' : '') + 'Prompt ' + (i + 1) + '  \u00B7  _' + stamp + '_');
            lines.push('');
            lines.push('### Prompt');
            lines.push('');
            lines.push('```');
            lines.push(entry.p);
            lines.push('```');
            lines.push('');
            if (entry.o) {
              lines.push('### AI response (snippet)');
              lines.push('');
              lines.push('> ' + entry.o.split('\n').join('\n> '));
              lines.push('');
            }
          });
          var body = lines.join('\n');
          try {
            var blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'allo-prompt-journal-' + dateStr + '.md';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
            addToast('Journal exported as Markdown.', 'success');
          } catch (e) {
            console.error('[llmLiteracy] Export failed:', e);
            // Fall back to copying to clipboard so students still get their work.
            copyToClipboard(body, 'Journal (copied as text)');
          }
        }
        function journalClearAll() {
          askConfirm({
            title: 'Clear your entire prompt journal?',
            body: 'This removes all saved prompts from this section. You can\'t undo it.',
            confirmLabel: '\uD83D\uDDD1\uFE0F Clear journal',
            confirmColor: COLORS.bad
          }, function() {
            if (!ctx.setToolData) return;
            ctx.setToolData(function(prev) {
              var existing = (prev && prev.llmLiteracy) || {};
              return Object.assign({}, prev, { llmLiteracy: Object.assign({}, existing, { journal: [] }) });
            });
            addToast('Journal cleared.', 'info');
          });
        }
        var journalShownTuple = useState(false);
        var journalShown = journalShownTuple[0]; var setJournalShown = journalShownTuple[1];
        var journal = d.journal || [];

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
            'A weak prompt gives you a shallow answer, fast. A strong prompt gives you a useful answer, still fast. The difference is craft \u2014 and it is very learnable.'
          ),
          sectionTOC('#7c3aed', [
            { id: 'llm-lit-s3-patterns', icon: '\uD83C\uDFAD',     label: 'Five patterns' },
            { id: 'llm-lit-s3-anatomy',  icon: '\uD83D\uDD2C',     label: 'Anatomy' },
            { id: 'llm-lit-s3-cookbook', icon: '\uD83D\uDCD6',     label: 'Cookbook' },
            { id: 'llm-lit-s3-template', icon: '\uD83E\uDDF0',     label: 'Template builder' },
            { id: 'llm-lit-s3-pairs',    icon: '\u2696\uFE0F',     label: 'Weak vs strong' },
            { id: 'llm-literacy-workshop', icon: '\u270F\uFE0F',   label: 'Workshop' }
          ]),

          // Pattern cards
          h('div', { id: 'llm-lit-s3-patterns', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.accent }) },
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

          // Prompt anatomy diagram: one real strong prompt with each of the
          // 5 patterns highlighted inline and labeled on the side. Turns the
          // abstract pattern list into a concrete, visible composition.
          (function() {
            // Hand-assembled so we can tag every chunk with the pattern it
            // exemplifies. Colors line up with the pattern legend.
            var PAT_COLORS = {
              role:       { color: '#2563eb', label: 'Role',       icon: '\uD83C\uDFAD' },
              context:    { color: '#0d9488', label: 'Context',    icon: '\uD83D\uDCCD' },
              constraint: { color: '#dc2626', label: 'Constraint', icon: '\uD83D\uDEA7' },
              format:     { color: '#d97706', label: 'Format',     icon: '\uD83D\uDCCB' },
              examples:   { color: '#7c3aed', label: 'Examples',   icon: '\uD83D\uDCDD' }
            };
            var PROMPT_ANATOMY = [
              { k: 'role',       t: 'You are a patient middle-school biology tutor. ' },
              { k: 'context',    t: 'I am an 8th grader studying for a test on cell division tomorrow and I always confuse mitosis with meiosis. ' },
              { k: 'constraint', t: 'Don\'t give me the answers \u2014 quiz me. ' },
              { k: 'format',     t: 'Ask me 3 short-answer questions, ONE at a time. Wait for my answer before giving the next. After each, tell me what I got right and what I missed. ' },
              { k: 'examples',   t: 'For example, a good first question would be: "In one sentence, what is the main purpose of mitosis?"' }
            ];
            var keys = Object.keys(PAT_COLORS);
            return h('div', { id: 'llm-lit-s3-anatomy', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.accent2 }) },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' } },
                h('div', { style: { width: '32px', height: '32px', borderRadius: '8px', background: hexToRGBA(COLORS.accent2, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' } }, '\uD83D\uDD2C'),
                h('h3', { style: { margin: 0, fontSize: '16px', color: COLORS.accent2, fontWeight: 800 } }, 'Prompt anatomy')
              ),
              h('p', { style: { margin: '0 0 12px', fontSize: '12.5px', color: COLORS.subtext, lineHeight: 1.5 } },
                'Here is one strong prompt with every pattern color-coded. Hover any phrase to see which pattern it is.'
              ),
              // Legend
              h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' } },
                keys.map(function(k) {
                  var p = PAT_COLORS[k];
                  return h('div', { key: k, style: { display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '999px', border: '1px solid ' + hexToRGBA(p.color, 0.35), background: hexToRGBA(p.color, 0.08) } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: '12px' } }, p.icon),
                    h('span', { style: { fontSize: '11px', fontWeight: 700, color: p.color } }, p.label)
                  );
                })
              ),
              // Annotated prompt
              h('div', { style: { background: '#fff', border: '1px solid ' + COLORS.border, borderRadius: '10px', padding: '14px 16px', fontSize: '13.5px', lineHeight: 1.9, color: COLORS.text } },
                PROMPT_ANATOMY.map(function(chunk, i) {
                  var p = PAT_COLORS[chunk.k];
                  return h('span', { key: i, style: {
                    background: hexToRGBA(p.color, 0.1),
                    borderBottom: '2px solid ' + hexToRGBA(p.color, 0.55),
                    padding: '1px 2px',
                    borderRadius: '2px'
                  }, title: p.label + ': ' + chunk.k }, chunk.t);
                })
              ),
              // Callouts under the prompt showing which pattern does what
              h('div', { style: { marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '6px' } },
                keys.map(function(k) {
                  var p = PAT_COLORS[k];
                  var excerpt = (PROMPT_ANATOMY.find(function(c) { return c.k === k; }) || {}).t || '';
                  return h('div', { key: k, style: { background: '#fff', border: '1px solid ' + hexToRGBA(p.color, 0.3), borderLeft: '3px solid ' + p.color, borderRadius: '8px', padding: '8px 10px' } },
                    h('div', { style: { fontSize: '10px', fontWeight: 800, color: p.color, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '3px' } }, p.icon + ' ' + p.label),
                    h('div', { style: { fontSize: '11px', color: COLORS.subtext, lineHeight: 1.45, fontStyle: 'italic' } }, '"' + excerpt.trim() + '"')
                  );
                })
              )
            );
          })(),

          // Prompt cookbook — ready-to-use recipes for specific student tasks.
          // Collapsed by default so it doesn't overwhelm; expands to a grid.
          h('div', { id: 'llm-lit-s3-cookbook', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid #0d9488' }) },
            h('button', {
              onClick: function() { setCookbookOpen(!cookbookOpen); },
              style: {
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '10px', padding: '0',
                width: '100%', textAlign: 'left'
              },
              'aria-expanded': cookbookOpen ? 'true' : 'false',
              'aria-controls': 'llm-lit-cookbook'
            },
              h('div', { style: { width: '32px', height: '32px', borderRadius: '8px', background: hexToRGBA('#0d9488', 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 } }, '\uD83D\uDCD6'),
              h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { style: { fontSize: '16px', fontWeight: 800, color: '#0d9488' } }, 'Prompt cookbook'),
                h('div', { style: { fontSize: '11.5px', color: COLORS.subtext, lineHeight: 1.45, marginTop: '2px' } },
                  PROMPT_RECIPES.length + ' ready-to-use recipes for real student tasks. Copy, fill in the bracketed parts, paste into any AI.'
                )
              ),
              h('span', {
                'aria-hidden': 'true',
                style: { fontSize: '18px', color: '#0d9488', transition: 'transform .2s ease', transform: cookbookOpen ? 'rotate(90deg)' : 'rotate(0deg)' }
              }, '\u25B8')
            ),
            cookbookOpen && h('div', {
              id: 'llm-lit-cookbook',
              className: 'llm-lit-fade-in',
              style: { marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }
            },
              orderedRecipes().map(function(r) {
                var starred = recipeIsFavorite(r.id);
                return h('div', { key: r.id, style: {
                  background: '#fff',
                  border: '1px solid ' + (starred ? '#fde68a' : COLORS.border),
                  borderLeft: '3px solid ' + (starred ? '#f59e0b' : '#0d9488'),
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex', flexDirection: 'column',
                  boxShadow: starred ? '0 2px 6px -2px rgba(245, 158, 11, .2)' : 'none',
                  transition: 'all .2s ease'
                } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' } },
                    h('div', { style: { width: '28px', height: '28px', borderRadius: '8px', background: hexToRGBA('#0d9488', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' } }, r.icon),
                    h('div', { style: { fontSize: '13px', fontWeight: 800, color: COLORS.text, letterSpacing: '-.01em', flex: 1, minWidth: 0 } }, r.title),
                    h('button', {
                      onClick: function() { toggleFavoriteRecipe(r.id); },
                      title: starred ? 'Remove favorite' : 'Favorite this recipe \u2014 favorites sort to the top',
                      'aria-pressed': starred ? 'true' : 'false',
                      style: {
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        fontSize: '18px', lineHeight: 1, padding: '0 2px',
                        color: starred ? '#f59e0b' : COLORS.muted,
                        flexShrink: 0
                      }
                    }, starred ? '\u2B50' : '\u2606')
                  ),
                  h('div', { style: { fontSize: '11px', color: COLORS.muted, marginBottom: '6px', fontStyle: 'italic' } },
                    h('strong', null, 'When: '), r.when),
                  h('div', { style: {
                    background: '#f0fdfa',
                    border: '1px solid #99f6e4',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '11.5px',
                    fontFamily: 'monospace',
                    color: COLORS.text,
                    lineHeight: 1.5,
                    marginBottom: '6px',
                    maxHeight: '140px',
                    overflowY: 'auto',
                    flex: 1
                  } }, r.prompt),
                  h('div', { style: { fontSize: '11px', color: COLORS.subtext, fontStyle: 'italic', marginBottom: '8px', lineHeight: 1.45 } },
                    h('strong', { style: { color: '#0d9488' } }, 'Why this works: '), r.why),
                  h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                    h('button', {
                      onClick: function() { copyToClipboard(r.prompt, 'Recipe'); },
                      style: btn('#0d9488', '#fff', false),
                      title: 'Copy to use in your own AI tool'
                    }, '\uD83D\uDCCB Copy'),
                    h('button', {
                      onClick: function() {
                        setUserPrompt(r.prompt);
                        setLiveOutput('');
                        setCritique(null);
                        setTimeout(function() {
                          var el = document.getElementById('llm-literacy-workshop');
                          if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 50);
                        announceToSR('Recipe loaded into the workshop.');
                      },
                      style: btn('#e0e7ff', COLORS.accent, false)
                    }, '\u2193 Load in workshop')
                  )
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
            return h('div', { id: 'llm-lit-s3-template', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid #f59e0b' }) },
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
                          'aria-required': s.required ? 'true' : 'false',
                          'aria-invalid': isMissing ? 'true' : 'false',
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
                        'aria-required': s.required ? 'true' : 'false',
                        'aria-invalid': isMissing ? 'true' : 'false',
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
          h('div', { id: 'llm-lit-s3-pairs', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.accent2 }) },
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
                  h('div', { style: { fontSize: '12.5px', color: COLORS.text, lineHeight: 1.55, whiteSpace: 'pre-wrap', maxHeight: '280px', overflowY: 'auto' } }, flaggedText(currentAB.weak))
                ),
                h('div', { style: { background: '#fff', border: '1px solid #bbf7d0', borderLeft: '4px solid ' + COLORS.good, borderRadius: '8px', padding: '10px 12px' } },
                  h('div', { style: { fontSize: '11px', color: COLORS.good, fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.05em' } }, '\u2713 From STRONG prompt'),
                  h('div', { style: { fontSize: '12.5px', color: COLORS.text, lineHeight: 1.55, whiteSpace: 'pre-wrap', maxHeight: '280px', overflowY: 'auto' } }, flaggedText(currentAB.strong))
                )
              )
            )
          ),

          // Live iteration workshop
          h('div', { id: 'llm-literacy-workshop', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.good }) },
            h('h3', { style: { margin: '0 0 6px', fontSize: '16px', color: COLORS.good } }, 'Your turn: iterate a prompt live'),
            h('p', { style: { margin: '0 0 10px', fontSize: '12px', color: COLORS.subtext, lineHeight: 1.5 } },
              'Write a prompt below. Run it. Look at the output. Edit the prompt using the five patterns. Run again. You\'re looking for the output to improve — or for you to understand WHY the output is shaped the way it is.'
            ),
            h('div', { style: { position: 'relative' } },
              h('textarea', {
                value: userPrompt,
                onChange: function(e) { setUserPrompt(e.target.value); },
                placeholder: 'Try: "Explain why the ocean is salty to a curious 7th grader who already knows what an atom is. Use no more than 4 sentences."',
                rows: 4,
                style: { width: '100%', boxSizing: 'border-box', padding: '10px', paddingRight: SPEECH_SUPPORTED ? '44px' : '10px', border: '1px solid ' + COLORS.border, borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical' },
                'aria-label': 'Your prompt'
              }),
              SPEECH_SUPPORTED && h('div', { style: { position: 'absolute', right: '6px', top: '6px' } },
                h(MicButton, { id: 'workshop', currentValue: userPrompt, appendTo: setUserPrompt })
              )
            ),
            // Live token / character counter — connects Section 1's tokenizer to
            // real prompt economy. Updates as the student types.
            (function() {
              var promptToks = pseudoTokenize(userPrompt || '').filter(function(t) { return t.kind !== 'space'; });
              var promptChars = (userPrompt || '').length;
              var tokCount = promptToks.length;
              var zone = tokCount < 20 ? 'short' : tokCount < 80 ? 'medium' : tokCount < 250 ? 'long' : 'verylong';
              var zoneColor = zone === 'short' ? COLORS.muted
                            : zone === 'medium' ? COLORS.accent2
                            : zone === 'long' ? COLORS.good
                            : COLORS.warn;
              var zoneLabel = zone === 'short' ? 'very short \u2014 may be underspecified'
                            : zone === 'medium' ? 'focused'
                            : zone === 'long' ? 'detailed'
                            : 'quite long \u2014 make sure every piece earns its place';
              return h('div', {
                style: {
                  marginTop: '6px', marginBottom: '4px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '11px', flexWrap: 'wrap', gap: '8px',
                  padding: '4px 2px'
                },
                'aria-live': 'polite'
              },
                h('div', { style: { color: COLORS.subtext, display: 'flex', gap: '10px', flexWrap: 'wrap' } },
                  h('span', null,
                    h('strong', { style: { color: zoneColor, fontFamily: 'monospace' } }, '\u2248 ' + tokCount),
                    h('span', { style: { color: COLORS.muted } }, ' token' + (tokCount === 1 ? '' : 's'))
                  ),
                  h('span', { style: { color: COLORS.muted } }, promptChars + ' characters')
                ),
                tokCount > 0 && h('span', { style: { color: zoneColor, fontStyle: 'italic' } }, zoneLabel)
              );
            })(),
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
              userPrompt.trim() && h('button', {
                onClick: journalSaveCurrent,
                style: btn('#fef3c7', '#78350f', false),
                title: 'Save this prompt to your journal for later'
              }, '\u2B50 Save'),
              !hasLiveAI && h('span', { style: { fontSize: '11px', color: COLORS.muted } }, 'Live AI unavailable \u2014 the critique still works.')
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
              h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, flaggedText(liveOutput))
            ),
            liveOutput && reflectionBox('prompt', 'prompt_workshop',
              'Did the AI actually do what you asked? What one change to your prompt would produce a better answer next time?',
              'e.g. "It gave me the answer instead of quizzing me \u2014 I\'ll add \'don\'t give me the answer\' explicitly next time."'),
            // Prompt journal: collapsed by default. Auto-saves on live-run success;
            // students can star, re-load, or delete individual entries.
            h('div', { style: { marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed ' + COLORS.border } },
              h('button', {
                onClick: function() { setJournalShown(!journalShown); },
                style: {
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0',
                  fontSize: '13px', fontWeight: 700, color: COLORS.subtext
                },
                'aria-expanded': journalShown ? 'true' : 'false',
                'aria-controls': 'llm-lit-journal'
              },
                h('span', { style: { transition: 'transform .2s ease', display: 'inline-block', transform: journalShown ? 'rotate(90deg)' : 'rotate(0)' } }, '\u25B8'),
                h('span', null, '\uD83D\uDCD4 My prompt journal'),
                h('span', { style: { background: journal.length > 0 ? COLORS.accent : '#e2e8f0', color: journal.length > 0 ? '#fff' : COLORS.muted, padding: '1px 8px', borderRadius: '999px', fontSize: '11px' } },
                  journal.length + (journal.length === MAX_JOURNAL ? ' (full)' : ''))
              ),
              journalShown && h('div', { id: 'llm-lit-journal', className: 'llm-lit-fade-in', style: { marginTop: '10px' } },
                journal.length === 0 && h('div', { style: { padding: '14px', background: '#f8fafc', border: '1px dashed ' + COLORS.border, borderRadius: '8px', fontSize: '12px', color: COLORS.muted, fontStyle: 'italic' } },
                  'Nothing saved yet. Every successful live run auto-saves here. You can also \u2B50 Save a prompt without running it.'
                ),
                journal.length > 0 && h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
                  journal.map(function(entry, i) {
                    var when = new Date(entry.t);
                    var timeStr = when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                    return h('div', {
                      key: i,
                      style: {
                        display: 'flex', gap: '8px', alignItems: 'flex-start',
                        padding: '8px 10px',
                        background: entry.s ? '#fef9c3' : '#fff',
                        border: '1px solid ' + (entry.s ? '#fde68a' : COLORS.border),
                        borderRadius: '8px'
                      }
                    },
                      h('button', {
                        onClick: function() { journalToggleStar(i); },
                        title: entry.s ? 'Remove star' : 'Star this prompt',
                        'aria-pressed': entry.s ? 'true' : 'false',
                        style: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', flexShrink: 0, padding: '0 2px' }
                      }, entry.s ? '\u2B50' : '\u2606'),
                      h('div', { style: { flex: 1, minWidth: 0 } },
                        h('div', { style: { fontSize: '12px', color: COLORS.text, lineHeight: 1.45, marginBottom: '2px', overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 } }, entry.p),
                        h('div', { style: { fontSize: '10px', color: COLORS.muted } }, timeStr + (entry.o ? ' \u00B7 got a response' : ''))
                      ),
                      h('div', { style: { display: 'flex', gap: '4px', flexShrink: 0 } },
                        h('button', {
                          onClick: function() { setUserPrompt(entry.p); setLiveOutput(entry.o || ''); setCritique(null); announceToSR('Loaded prompt from journal'); },
                          title: 'Load into workshop',
                          style: { background: '#e0e7ff', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: 600, color: COLORS.accent, cursor: 'pointer' }
                        }, '\u2191 Load'),
                        h('button', {
                          onClick: function() { copyToClipboard(entry.p, 'Saved prompt'); },
                          title: 'Copy',
                          style: { background: '#e2e8f0', border: 'none', borderRadius: '6px', padding: '4px 6px', fontSize: '11px', cursor: 'pointer', color: COLORS.text }
                        }, '\uD83D\uDCCB'),
                        h('button', {
                          onClick: function() { journalDelete(i); },
                          title: 'Delete this entry',
                          'aria-label': 'Delete saved prompt',
                          style: { background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', color: COLORS.bad, cursor: 'pointer' }
                        }, '\u00D7')
                      )
                    );
                  })
                ),
                journal.length > 0 && h('div', { style: { marginTop: '8px', display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' } },
                  h('button', {
                    onClick: journalExport,
                    style: btn('#e0e7ff', COLORS.accent, false),
                    title: 'Save your journal as a Markdown file'
                  }, '\u2B07\uFE0F Export as Markdown'),
                  h('button', {
                    onClick: journalClearAll,
                    style: btn('#fee2e2', '#991b1b', false)
                  }, '\uD83D\uDDD1\uFE0F Clear all')
                )
              )
            )
          ),
          comprehensionCheck('prompt'),
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

        // ── Student-authored spotter ──
        // Bracket syntax: [[error phrase]] inside the draft becomes a flagged
        // segment. Students preview their own trap passage and can share via copy.
        var authorDraftTuple = useState(d.authoredPassage || '');
        var authorDraft = authorDraftTuple[0]; var setAuthorDraft = authorDraftTuple[1];
        function saveAuthorDraft(text) {
          setAuthorDraft(text);
          upd('authoredPassage', text);
        }
        // Parse [[error]] markers out of a draft. Returns segments compatible
        // with the existing spotter rendering: { text, error, reason? }.
        // Reason is just a placeholder since the student wrote it themselves.
        function parseAuthoredDraft(draft) {
          if (!draft) return [];
          var out = [];
          var i = 0;
          var text = draft;
          var re = /\[\[([^\]]+)\]\]/g;
          var m;
          var lastIndex = 0;
          while ((m = re.exec(text)) !== null) {
            if (m.index > lastIndex) out.push({ text: text.slice(lastIndex, m.index), error: false });
            out.push({ text: m[1], error: true, reason: 'Marked as an error by the author.' });
            lastIndex = m.index + m[0].length;
          }
          if (lastIndex < text.length) out.push({ text: text.slice(lastIndex), error: false });
          return out;
        }
        var authoredSegs = parseAuthoredDraft(authorDraft);
        var authoredErrorCount = authoredSegs.filter(function(s) { return s.error; }).length;

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
                h('strong', { style: { color: COLORS.bad } }, '"' + s.text + '" \u2014 '),
                s.reason
              );
            }),
            reflectionBox('spotter', 'spotter_' + passageIdx,
              'Which error fooled you most easily? What is it about that phrase that made it sound right?',
              'e.g. "The lunar module name because both Columbia and Eagle are real names from the mission..."')
          ),

          // Student-authored spotter passage.
          // Writing your own trap forces a different skill: predicting what
          // kinds of errors sound plausible. Shares via copy.
          h('div', { style: Object.assign({}, cardStyle, { borderLeft: '4px solid ' + COLORS.warn }) },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' } },
              h('div', { style: { width: '32px', height: '32px', borderRadius: '8px', background: hexToRGBA(COLORS.warn, 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' } }, '\u270D\uFE0F'),
              h('h3', { style: { margin: 0, fontSize: '16px', color: COLORS.warn, fontWeight: 800 } }, 'Write your own trap passage')
            ),
            h('p', { style: { margin: '0 0 10px', fontSize: '12.5px', color: COLORS.subtext, lineHeight: 1.5 } },
              'Pick a topic you know well. Write a short AI-style paragraph on it, but wrap 2\u20133 wrong phrases in double brackets like ', h('code', { style: { background: '#fef3c7', padding: '1px 5px', borderRadius: '3px', fontSize: '11.5px' } }, '[[this]]'),
              '. Trade passages with someone else \u2014 whoever catches all the bracketed errors wins.'
            ),
            h('label', { style: { display: 'block', fontSize: '11px', fontWeight: 700, color: COLORS.subtext, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '.05em' } }, 'Your draft (use [[brackets]] to mark errors)'),
            h('textarea', {
              value: authorDraft,
              onChange: function(e) { saveAuthorDraft(e.target.value); },
              placeholder: 'e.g. "Mitosis has four main phases: prophase, metaphase, [[telophase]], and anaphase. During metaphase, chromosomes line up [[along the nuclear membrane]] before separating."',
              rows: 5,
              style: { width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid ' + COLORS.border, borderRadius: '8px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical', marginBottom: '10px' },
              'aria-label': 'Write your trap passage'
            }),
            // Live preview
            authorDraft.trim() && h('div', null,
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' } },
                h('div', { style: { fontSize: '11px', fontWeight: 800, color: COLORS.warn, textTransform: 'uppercase', letterSpacing: '.05em' } },
                  '\uD83D\uDC40 Preview'),
                h('div', { style: { fontSize: '11px', color: COLORS.muted } },
                  authoredErrorCount + ' error' + (authoredErrorCount === 1 ? '' : 's') + ' marked')
              ),
              h('div', { style: {
                background: '#fff', border: '1px solid ' + COLORS.border,
                borderRadius: '8px', padding: '12px 14px',
                fontSize: '13px', lineHeight: 1.9, color: COLORS.text,
                marginBottom: '10px'
              } },
                authoredSegs.map(function(seg, i) {
                  if (!seg.error) return h('span', { key: i }, seg.text);
                  return h('span', {
                    key: i,
                    style: {
                      background: '#fee2e2', color: '#991b1b',
                      border: '1px dashed ' + COLORS.bad,
                      padding: '1px 4px', borderRadius: '4px',
                      fontWeight: 600
                    }
                  }, seg.text);
                })
              ),
              h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
                h('button', {
                  onClick: function() {
                    // Build a shareable text that preserves the bracket syntax.
                    copyToClipboard(authorDraft, 'Your trap passage');
                  },
                  style: btn(COLORS.warn, '#fff', false)
                }, '\uD83D\uDCCB Copy to share'),
                h('button', {
                  onClick: function() {
                    saveAuthorDraft('');
                  },
                  style: btn('#e2e8f0', COLORS.text, false)
                }, '\u21BA Clear')
              ),
              authoredErrorCount < 2 && h('div', { style: { marginTop: '8px', padding: '8px 10px', background: hexToRGBA(COLORS.accent2, 0.06), border: '1px solid ' + hexToRGBA(COLORS.accent2, 0.25), borderRadius: '6px', fontSize: '11.5px', color: COLORS.subtext, lineHeight: 1.5 } },
                h('strong', { style: { color: COLORS.accent2 } }, 'Tip: '),
                'Good trap passages have 2\u20133 seeded errors. More than that feels unfair; fewer is too easy. Aim for errors that sound plausible at first read.'
              )
            )
          ),

          comprehensionCheck('spotter'),
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
            var info = classifyGeminiError(err);
            setMyCoach('[' + info.emoji + ' ' + info.friendly + ']\n\nWhy this happens: ' + info.teaching + '\n\nThe heuristic direction below is still valid.');
            addToast(info.emoji + ' Live coach unavailable. Heuristic below still works.', 'warn');
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
          sectionTOC('#db2777', [
            { id: 'llm-lit-s5-flowchart', icon: '\uD83E\uDDED', label: 'Decision chart' },
            { id: 'llm-lit-s5-scenarios', icon: '\uD83D\uDCDD', label: 'Scenarios' },
            { id: 'llm-lit-s5-byos',      icon: '\uD83C\uDFAF', label: 'Your situation' }
          ]),

          // Scaffold vs Substitute decision flowchart.
          // Branching: Q1 identifies the target skill, Q2 asks whether the
          // proposed AI use removes-a-barrier or does-the-thing-itself.
          h('div', { id: 'llm-lit-s5-flowchart', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { borderLeft: '4px solid #db2777' }) },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' } },
              h('div', { style: { width: '32px', height: '32px', borderRadius: '8px', background: hexToRGBA('#db2777', 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' } }, '\uD83E\uDDED'),
              h('h3', { style: { margin: 0, fontSize: '16px', color: '#db2777', fontWeight: 800 } }, 'The decision, visualized')
            ),
            h('p', { style: { margin: '0 0 14px', fontSize: '12.5px', color: COLORS.subtext, lineHeight: 1.5 } },
              'Before you use AI for something, run it through these two questions. The answers route to one of three outcomes.'
            ),
            // Flow: Q1 → Q2 → outcomes
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' } },
              // Q1 node
              h('div', { style: {
                background: '#fff',
                border: '2px solid ' + COLORS.accent2,
                borderRadius: '12px',
                padding: '12px 16px',
                maxWidth: '520px',
                textAlign: 'center',
                boxShadow: '0 2px 6px -2px rgba(37, 99, 235, .2)'
              } },
                h('div', { style: { fontSize: '10px', fontWeight: 800, color: COLORS.accent2, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '3px' } }, 'Question 1'),
                h('div', { style: { fontSize: '14px', fontWeight: 700, color: COLORS.text, lineHeight: 1.4 } }, 'What specific skill is this task meant to build?')
              ),
              // Connector
              h('div', { 'aria-hidden': 'true', style: { fontSize: '20px', color: COLORS.muted, lineHeight: 1 } }, '\u2193'),
              // Q2 node
              h('div', { style: {
                background: '#fff',
                border: '2px solid ' + COLORS.accent,
                borderRadius: '12px',
                padding: '12px 16px',
                maxWidth: '520px',
                textAlign: 'center',
                boxShadow: '0 2px 6px -2px rgba(124, 58, 237, .2)'
              } },
                h('div', { style: { fontSize: '10px', fontWeight: 800, color: COLORS.accent, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '3px' } }, 'Question 2'),
                h('div', { style: { fontSize: '14px', fontWeight: 700, color: COLORS.text, lineHeight: 1.4 } }, 'Is AI removing a BARRIER to that skill, or doing the SKILL itself?')
              ),
              h('div', { 'aria-hidden': 'true', style: { fontSize: '20px', color: COLORS.muted, lineHeight: 1 } }, '\u2193'),
              // Outcomes: 3 side-by-side
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', width: '100%', maxWidth: '680px' } },
                h('div', { style: {
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                  border: '2px solid #86efac',
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center'
                } },
                  h('div', { style: { fontSize: '22px', marginBottom: '4px' } }, '\uD83E\uDEA1'),
                  h('div', { style: { fontSize: '13px', fontWeight: 800, color: COLORS.good, marginBottom: '3px' } }, 'Scaffold'),
                  h('div', { style: { fontSize: '11px', color: COLORS.text, lineHeight: 1.4 } }, 'Removes barrier. Go ahead \u2014 keep the core thinking on you.')
                ),
                h('div', { style: {
                  background: 'linear-gradient(135deg, #fef9c3 0%, #fef3c7 100%)',
                  border: '2px solid #fde047',
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center'
                } },
                  h('div', { style: { fontSize: '22px', marginBottom: '4px' } }, '\u2696\uFE0F'),
                  h('div', { style: { fontSize: '13px', fontWeight: 800, color: '#a16207', marginBottom: '3px' } }, 'It depends'),
                  h('div', { style: { fontSize: '11px', color: COLORS.text, lineHeight: 1.4 } }, 'Can AI coach you through the skill instead of doing it? If yes \u2014 reframe as scaffold.')
                ),
                h('div', { style: {
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)',
                  border: '2px solid #fecaca',
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center'
                } },
                  h('div', { style: { fontSize: '22px', marginBottom: '4px' } }, '\uD83E\uDDF1'),
                  h('div', { style: { fontSize: '13px', fontWeight: 800, color: COLORS.bad, marginBottom: '3px' } }, 'Substitute'),
                  h('div', { style: { fontSize: '11px', color: COLORS.text, lineHeight: 1.4 } }, 'Doing the skill itself. Skipping AI here preserves the practice you need.')
                )
              )
            )
          ),

          h('div', { id: 'llm-lit-s5-scenarios', className: 'llm-lit-anchor', style: { display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' } },
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
              ),
              reflectionBox('udl', 'udl_' + idx,
                'Does this match a real situation you\u2019ve been in? What would YOU do differently next time?',
                'e.g. "Last week with a reading assignment, I did the substitute thing. Next time I\'ll ask for comprehension questions instead."')
            )
          ),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '10px' } },
            h('button', { onClick: prev, style: btn('#e2e8f0', COLORS.text, false) }, '\u2190 Previous'),
            h('div', { style: { fontSize: '12px', color: COLORS.muted, alignSelf: 'center' } }, (idx + 1) + ' / ' + UDL_SCENARIOS.length),
            h('button', { onClick: next, style: btn('#e2e8f0', COLORS.text, false) }, 'Next \u2192')
          ),

          // ── Bring your own scenario ──
          h('div', { id: 'llm-lit-s5-byos', className: 'llm-lit-anchor', style: Object.assign({}, cardStyle, { marginTop: '18px', borderLeft: '4px solid #0d9488', background: 'linear-gradient(180deg, #ffffff, #f0fdfa)' }) },
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
              h('div', { style: { fontSize: '13px', color: COLORS.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, flaggedText(myCoach))
            ),
            !hasLiveAI && h('div', { style: { fontSize: '11px', color: COLORS.muted, fontStyle: 'italic', marginTop: '6px' } },
              'Live AI unavailable here \u2014 the heuristic direction above uses only your answers, no AI call needed.'
            )
          ),

          comprehensionCheck('udl'),
          sectionFooter('udl')
        );
      }

      // ═══════════════════════════════════════════════════════
      // SECTION 6: Quick Reference — single-page printable summary
      // ═══════════════════════════════════════════════════════
      function QuickReference() {
        // Compile a full session report (markdown) from toolData.
        // Teacher-handoff artifact: sections visited, checks answered,
        // spotter results, UDL reflections, starred prompts.
        function exportSessionReport() {
          var today = new Date();
          var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
          var dateStr = today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
          var visited = d.visited || {};
          var journal = d.journal || [];
          var starred = journal.filter(function(e) { return e.s; });
          var checkIds = ['tokens','fails','prompt','spotter','udl'];
          var sectionTitles = {
            tokens: 'How LLMs Work', fails: 'Why LLMs Get Things Wrong',
            prompt: 'Prompt Craft', spotter: 'Hallucination Spotter',
            udl: 'When to Use AI', ref: 'Quick Reference'
          };
          var checksDone = 0;
          checkIds.forEach(function(id) { if (d['check_done_' + id]) checksDone++; });

          var lines = [
            '# AlloFlow AI Literacy Lab \u2014 Session Report',
            '',
            'Exported ' + dateStr,
            '',
            '## Overview',
            '',
            '| Metric | Value |',
            '|---|---|',
            '| Sections explored | ' + Object.keys(visited).length + ' of 6 |',
            '| Comprehension checks passed | ' + checksDone + ' of 5 |',
            '| Prompt iterations | ' + (d.promptIterations || 0) + ' |',
            '| Perfect hallucination spots (unassisted) | ' + (d.spotterPerfect || 0) + ' |',
            '| UDL scenario reflections | ' + (d.udlReflections || 0) + ' |',
            '| Starred prompts saved | ' + starred.length + ' |',
            '| Reflections written | ' + ((d.reflections || []).length) + ' |',
            ''
          ];

          lines.push('## Sections visited');
          lines.push('');
          ['tokens','fails','prompt','spotter','udl','ref'].forEach(function(id) {
            lines.push('- ' + (visited[id] ? '[x]' : '[ ]') + ' ' + sectionTitles[id] + (d['check_done_' + id] ? ' (check passed \u2713)' : ''));
          });
          lines.push('');

          if (starred.length > 0) {
            lines.push('## Starred prompts');
            lines.push('');
            starred.forEach(function(entry, i) {
              lines.push('### ' + (i + 1) + '. \u2B50 Prompt');
              lines.push('');
              lines.push('```');
              lines.push(entry.p);
              lines.push('```');
              lines.push('');
              if (entry.o) {
                lines.push('> ' + entry.o.split('\n').join('\n> '));
                lines.push('');
              }
            });
          }

          if (journal.length > starred.length) {
            lines.push('## All saved prompts (' + journal.length + ')');
            lines.push('');
            journal.forEach(function(entry, i) {
              lines.push((i + 1) + '. ' + (entry.s ? '\u2B50 ' : '') + entry.p);
            });
            lines.push('');
          }

          var refs = (d.reflections || []);
          if (refs.length > 0) {
            lines.push('## Reflections (' + refs.length + ')');
            lines.push('');
            var refSections = { tokens: 'How LLMs Work', fails: 'Why LLMs Fail', prompt: 'Prompt Craft', spotter: 'Hallucination Spotter', udl: 'When to Use AI' };
            refs.forEach(function(r, i) {
              lines.push('### ' + (i + 1) + '. ' + (refSections[r.section] || r.section));
              lines.push('');
              lines.push('**Prompt:** ' + r.prompt);
              lines.push('');
              lines.push('> ' + (r.text || '').split('\n').join('\n> '));
              lines.push('');
            });
          }

          lines.push('---');
          lines.push('');
          lines.push('_Generated by AlloFlow \u00B7 AI Literacy Lab. Student-authored. For teacher review and honest discussion, not as a grade._');

          var body = lines.join('\n');
          try {
            var blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'allo-ai-literacy-session-' + dateStr + '.md';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
            addToast('Session report downloaded.', 'success');
          } catch (e) {
            console.error('[llmLiteracy] Report export failed:', e);
            copyToClipboard(body, 'Session report (copied as text)');
          }
        }

        // sectionId (optional) wires a screen-only "Go" pill that jumps to the
        // full section in one click. Print hides the pill entirely via the
        // llm-lit-no-print class on it.
        function refCard(color, icon, title, bodyNodes, sectionId) {
          var target = sectionId ? SECTION_ORDER.filter(function(s) { return s.id === sectionId; })[0] : null;
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
              h('div', { style: { fontSize: '14px', fontWeight: 800, color: color, letterSpacing: '-.01em', flex: 1 } }, title),
              target && h('button', {
                className: 'llm-lit-no-print',
                onClick: function() { enterSection(target.id, target.title); },
                style: {
                  background: 'transparent',
                  color: color,
                  border: '1px solid ' + hexToRGBA(color, 0.4),
                  borderRadius: '999px',
                  padding: '2px 8px',
                  fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                  whiteSpace: 'nowrap'
                },
                title: 'Jump to ' + target.title
              }, 'Go \u2192')
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
            h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
              h('button', {
                onClick: exportSessionReport,
                style: btn('#e0e7ff', COLORS.accent, false),
                title: 'Download a Markdown report of your progress, checks passed, and saved prompts. Hand to a teacher.'
              }, '\uD83D\uDCDD Export session report'),
              h('button', {
                onClick: function() { window.print && window.print(); },
                style: btn('#0d9488', '#fff', false)
              }, '\uD83D\uDDA8\uFE0F Print')
            )
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
              ),
              'tokens'
            ),
            refCard('#d97706', '\u26A0\uFE0F', 'Why it gets things wrong',
              h('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: COLORS.text, lineHeight: 1.6 } },
                h('li', null, 'Fake citations (verify with Google Scholar)'),
                h('li', null, 'Math errors \u2014 use a calculator'),
                h('li', null, 'Past the ', Term('knowledge cutoff', 'knowledge cutoff'), ' = may invent'),
                h('li', null, Term('confabulation', 'Confabulation'), ': fills gaps with plausible stories'),
                h('li', null, 'It sounds confident exactly the same whether right or wrong')
              ),
              'fails'
            ),
            refCard('#7c3aed', '\u270F\uFE0F', 'Five prompt patterns',
              h('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: COLORS.text, lineHeight: 1.6 } },
                PROMPT_PATTERNS.map(function(p, i) {
                  return h('li', { key: i }, h('strong', null, p.icon + ' ' + p.name + ': '), p.desc.split('.')[0] + '.');
                })
              ),
              'prompt'
            ),
            refCard('#059669', '\uD83D\uDD0D', 'Before you trust an AI answer',
              h('ol', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: COLORS.text, lineHeight: 1.6 } },
                h('li', null, 'Does the answer cite anything? Verify each citation.'),
                h('li', null, 'Is it past the model\'s cutoff? Use web search if so.'),
                h('li', null, 'Any math? Redo it with a calculator.'),
                h('li', null, 'Sound too confident? Ask "are you sure?" \u2014 watch if the answer changes.')
              ),
              'spotter'
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
              ),
              'udl'
            ),
            refCard('#0f766e', '\uD83D\uDCDD', 'Sentences you can steal',
              h('ul', { style: { margin: 0, paddingLeft: '18px', fontSize: '12px', color: COLORS.text, lineHeight: 1.6 } },
                h('li', null, h('em', null, '"I am a [grade] student. Don\'t solve this for me \u2014 ask me questions that help me find the answer."')),
                h('li', null, h('em', null, '"Quiz me on [topic] one question at a time. Wait for my answer before the next."')),
                h('li', null, h('em', null, '"Are you certain this event actually happened? Cite a source."')),
                h('li', null, h('em', null, '"Explain [concept] using only middle-school vocabulary. No jargon."'))
              ),
              'prompt'
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
      // Per-section check-for-understanding. State is kept in toolData so
      // completions persist and correct answers aren't re-awarded. We key the
      // picked option on option index so switching sections resets cleanly.
      function comprehensionCheck(sectionId) {
        var q = CHECKS[sectionId];
        if (!q) return null;
        var pickKey = 'check_pick_' + sectionId;
        var doneKey = 'check_done_' + sectionId;
        var pickedIdx = typeof d[pickKey] === 'number' ? d[pickKey] : null;
        var done = !!d[doneKey];
        function pick(i) {
          if (done) return;
          upd(pickKey, i);
          var opt = q.options[i];
          if (opt && opt.correct) {
            // Functional update so we don't double-award on rapid clicks.
            ctx.setToolData && ctx.setToolData(function(prev) {
              var existing = (prev && prev.llmLiteracy) || {};
              if (existing[doneKey]) return prev;
              var td = Object.assign({}, existing);
              td[doneKey] = true;
              td[pickKey] = i;
              awardXP(4, 'Comprehension check: ' + sectionId);
              return Object.assign({}, prev, { llmLiteracy: td });
            });
            announceToSR('Correct. ' + opt.why);
          } else {
            announceToSR('Not quite. ' + (opt && opt.why));
          }
        }
        var pickedOpt = pickedIdx !== null ? q.options[pickedIdx] : null;
        return h('div', {
          className: 'llm-lit-fade-in llm-lit-no-print',
          style: {
            marginTop: '18px',
            background: 'linear-gradient(135deg, #f5f3ff 0%, #eef2ff 100%)',
            border: '1.5px solid ' + hexToRGBA(COLORS.accent, 0.3),
            borderRadius: '12px',
            padding: '14px 16px'
          }
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' } },
            h('div', { style: { width: '28px', height: '28px', borderRadius: '8px', background: hexToRGBA(COLORS.accent, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' } },
              done ? '\u2714\uFE0F' : '\u2753'),
            h('div', { style: { fontSize: '11px', fontWeight: 800, color: COLORS.accent, textTransform: 'uppercase', letterSpacing: '.05em' } },
              done ? 'Check for understanding \u2014 earned' : 'Check for understanding')
          ),
          h('div', { style: { fontSize: '14px', fontWeight: 700, color: COLORS.text, marginBottom: '10px', lineHeight: 1.4 } }, q.q),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', marginBottom: pickedOpt ? '10px' : 0 } },
            q.options.map(function(opt, i) {
              var picked = pickedIdx === i;
              var showCorrectness = picked || done;
              var bg = '#fff', border = COLORS.border, color = COLORS.text;
              if (showCorrectness) {
                if (opt.correct)     { bg = '#f0fdf4'; border = '#86efac'; color = COLORS.good; }
                else if (picked)     { bg = '#fef2f2'; border = '#fecaca'; color = COLORS.bad; }
              }
              return h('button', {
                key: i,
                onClick: function() { pick(i); },
                disabled: done && !picked,
                style: {
                  background: bg,
                  border: '1.5px solid ' + border,
                  borderRadius: '10px',
                  padding: '10px 12px',
                  textAlign: 'left',
                  fontSize: '13px',
                  color: color,
                  fontWeight: picked ? 700 : 500,
                  cursor: done && !picked ? 'default' : 'pointer',
                  transition: 'all .15s ease'
                }
              },
                showCorrectness && h('span', { style: { marginRight: '6px', fontWeight: 800 } }, opt.correct ? '\u2713' : (picked ? '\u2717' : '')),
                opt.text
              );
            })
          ),
          pickedOpt && h('div', {
            className: 'llm-lit-fade-in',
            style: {
              background: pickedOpt.correct ? '#f0fdf4' : '#fef2f2',
              border: '1px solid ' + (pickedOpt.correct ? '#bbf7d0' : '#fecaca'),
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '12.5px', lineHeight: 1.55, color: COLORS.text
            }
          },
            h('strong', { style: { color: pickedOpt.correct ? COLORS.good : COLORS.bad } },
              pickedOpt.correct ? '\u2713 Right \u2014 ' : '\u2717 Not quite \u2014 '),
            pickedOpt.why,
            !pickedOpt.correct && !done && h('div', { style: { marginTop: '6px', fontSize: '11px', color: COLORS.muted, fontStyle: 'italic' } }, 'Pick another answer to try again.')
          )
        );
      }

      // In-section table of contents. Pass a color (section accent) and an
      // array of { id, icon?, label } entries. Each chip smooth-scrolls to an
      // element with a matching id + `llm-lit-anchor` class. Hidden in print.
      // Chips show a small ✓ after their anchor has been scrolled into view
      // (via the IntersectionObserver in the main render effect).
      function sectionTOC(color, items) {
        if (!items || items.length === 0) return null;
        var seenCount = items.reduce(function(n, it) { return n + (anchorIsSeen(it.id) ? 1 : 0); }, 0);
        return h('div', {
          className: 'llm-lit-no-print',
          role: 'navigation',
          'aria-label': 'Sub-sections',
          style: {
            display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center',
            padding: '8px 12px',
            background: hexToRGBA(color, 0.04),
            border: '1px solid ' + hexToRGBA(color, 0.2),
            borderRadius: '10px',
            marginBottom: '14px'
          }
        },
          h('span', {
            'aria-hidden': 'true',
            style: { fontSize: '11px', fontWeight: 700, color: color, textTransform: 'uppercase', letterSpacing: '.05em', marginRight: '2px' }
          }, 'On this page'),
          items.map(function(item) {
            var seen = anchorIsSeen(item.id);
            return h('button', {
              key: item.id,
              onClick: function() {
                var el = document.getElementById(item.id);
                if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                // Clicking counts as "seen" too, in case the student\'s viewport
                // is short and the observer doesn\'t register 50% intersection.
                markAnchorSeen(item.id);
              },
              'aria-label': item.label + (seen ? ' (visited)' : ''),
              style: {
                background: seen ? hexToRGBA(color, 0.12) : '#fff',
                color: color,
                border: '1px solid ' + hexToRGBA(color, seen ? 0.55 : 0.35),
                borderRadius: '999px',
                padding: '3px 10px',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                whiteSpace: 'nowrap',
                transition: 'background .18s ease, border-color .18s ease'
              },
              title: 'Jump to: ' + item.label + (seen ? ' (already visited)' : '')
            },
              seen
                ? h('span', { 'aria-hidden': 'true', style: { fontSize: '10px' } }, '\u2713')
                : (item.icon && h('span', { 'aria-hidden': 'true' }, item.icon)),
              item.label
            );
          }),
          // Small inline progress readout at the end of the chip row.
          items.length > 1 && seenCount > 0 && h('span', {
            'aria-hidden': 'true',
            style: { fontSize: '10px', color: COLORS.muted, fontWeight: 600, marginLeft: '2px', whiteSpace: 'nowrap' }
          }, seenCount + '/' + items.length)
        );
      }

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
          renderBrowseAllGlossary(),
          renderConfirmModal(),
          renderWelcomeOverlay()
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
