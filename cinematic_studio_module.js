// cinematic_studio_module.js
// Cinematic Studio (Wave 1: "Cinematic Director" prompt helper) for AlloFlow
// Loaded from GitHub CDN via loadModule('CinematicStudio', ...)
// Purpose: NotebookLM "Cinematic Video Overview" has NO native editor and NO API.
//   You set a steering prompt, then regenerate from scratch (Ultra-only, ~20/day).
//   This tool helps teachers craft a strong steering prompt, diagnose a bad output,
//   and re-prompt tightly so they spend those regenerations wisely. Pure React + callGemini.
//   Heavy post-production (captions, trim, re-voice) is a later wave; see
//   docs/notebooklm_video_editor_design.md.
// Version: 1.0.0 (Jun 2026)
(function () {
  // WCAG 4.1.3: status live region for dynamic announcements
  (function () {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-live-cinematic-studio')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-cinematic-studio';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // WCAG 2.1 AA: accessibility CSS (reduced motion + visible focus)
  if (typeof document !== 'undefined' && !document.getElementById('cs-a11y-css')) {
    var csA11yStyle = document.createElement('style');
    csA11yStyle.id = 'cs-a11y-css';
    csA11yStyle.textContent = [
      '@media (prefers-reduced-motion: reduce) { .cs-root *, .cs-root *::before, .cs-root *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }',
      '.cs-root button:focus-visible, .cs-root input:focus-visible, .cs-root select:focus-visible, .cs-root textarea:focus-visible, .cs-root [tabindex]:focus-visible { outline: 2px solid #6366f1 !important; outline-offset: 2px !important; border-radius: 6px; }',
      '.cs-root :focus:not(:focus-visible) { outline: none !important; }'
    ].join('\n');
    document.head.appendChild(csA11yStyle);
  }

  if (window.AlloModules && window.AlloModules.CinematicStudio) {
    console.log('[CDN] CinematicStudio already loaded, skipping duplicate');
    return;
  }

  var h = React.createElement;
  var _R = React;
  var useState = _R.useState, useEffect = _R.useEffect, useRef = _R.useRef, useMemo = _R.useMemo;

  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };

  // Tiny translation helper: use t() when present, else the English fallback.
  function makeT(t) {
    return function (key, fallback) {
      if (typeof t === 'function') {
        try { var v = t(key); if (v && v !== key) return v; } catch (_) {}
      }
      return fallback;
    };
  }

  function announce(msg) {
    if (typeof document === 'undefined') return;
    var el = document.getElementById('allo-live-cinematic-studio');
    if (el) el.textContent = msg;
  }

  // ─── Domain data ──────────────────────────────────────────────────────────

  var GRADE_BANDS = [
    { id: 'k2', label: 'Grades K-2 (ages 5-8)' },
    { id: '35', label: 'Grades 3-5 (ages 8-11)' },
    { id: '68', label: 'Grades 6-8 (ages 11-14)' },
    { id: '912', label: 'Grades 9-12 (ages 14-18)' },
    { id: 'adult', label: 'Adult / professional learners' }
  ];

  var LENGTHS = [
    { id: 'short', label: 'Very short (under ~2 min)', clause: 'Keep the video very short, under about 2 minutes. Cover only the single most important idea.' },
    { id: 'std', label: 'Standard (~2-3 min)', clause: 'Aim for about 2 to 3 minutes. Be focused; cut tangents.' },
    { id: 'full', label: 'Fuller (~3-5 min)', clause: 'Up to about 5 minutes is fine, but stay tightly on topic and avoid filler.' }
  ];

  var READING_LEVELS = [
    { id: 'simplest', label: 'Simplest (short sentences, common words)' },
    { id: 'plain', label: 'Plain language (clear, everyday vocabulary)' },
    { id: 'gradelevel', label: 'On grade level' },
    { id: 'rich', label: 'Rich (introduce and define academic terms)' }
  ];

  var TONES = [
    { id: 'warm', label: 'Warm and encouraging' },
    { id: 'neutral', label: 'Calm and neutral' },
    { id: 'curious', label: 'Curious and wondering' },
    { id: 'energetic', label: 'Upbeat and energetic' }
  ];

  // Lesson-type presets. Each seeds the builder and adds type-specific guidance.
  var LESSON_TYPES = [
    {
      id: 'explainer', icon: '💡', label: 'Concept Explainer',
      blurb: 'Introduce or unpack one concept clearly.',
      seed: { length: 'std', reading: 'plain', tone: 'curious' },
      mustInclude: 'A plain-language definition, one concrete everyday example, and a quick check-your-understanding question at the end.',
      clauses: ['Build understanding step by step from a concrete example to the general idea.', 'Do not assume prior knowledge; define every key term the first time it appears.']
    },
    {
      id: 'vocab', icon: '📖', label: 'Vocabulary Preview',
      blurb: 'Front-load key terms before a unit or reading.',
      seed: { length: 'short', reading: 'simplest', tone: 'warm' },
      mustInclude: 'Each target term, a kid-friendly definition, and one sentence using it in context.',
      clauses: ['Introduce no more than 5 to 7 terms so it stays memorable.', 'Pair each term with a visual or example that makes the meaning concrete.']
    },
    {
      id: 'labsafety', icon: '🧪', label: 'Lab Safety Briefing',
      blurb: 'Safety expectations before a hands-on activity.',
      seed: { length: 'std', reading: 'plain', tone: 'neutral' },
      mustInclude: 'The specific hazards of this activity, the required protective equipment, and what to do if something goes wrong.',
      clauses: ['Be accurate and specific to the actual procedure; do not invent generic hazards that do not apply.', 'State each rule as a clear, positive action ("do this") rather than only warnings.']
    },
    {
      id: 'sel', icon: '💛', label: 'SEL Scenario',
      blurb: 'A social-emotional situation to think through.',
      seed: { length: 'std', reading: 'plain', tone: 'warm' },
      mustInclude: 'A relatable everyday situation, the feelings involved, and a couple of healthy ways to respond. End with an open reflection question.',
      clauses: ['Keep it non-judgmental and validating; present choices, not a single "correct" feeling.', 'Avoid clinical labels; describe behavior and feelings in plain, human terms.']
    },
    {
      id: 'phonics', icon: '🔤', label: 'Phonics / Decoding',
      blurb: 'A target sound or spelling pattern.',
      seed: { length: 'short', reading: 'simplest', tone: 'warm' },
      mustInclude: 'The target sound or pattern, several clear example words, and a chance for the learner to say the sound.',
      clauses: ['Pronounce the target sound clearly and slowly; model blending sound by sound.', 'Use accurate, decodable example words; avoid exceptions that contradict the pattern.']
    },
    {
      id: 'mathworked', icon: '🔢', label: 'Math Worked-Example',
      blurb: 'Walk through solving one problem.',
      seed: { length: 'std', reading: 'gradelevel', tone: 'curious' },
      mustInclude: 'One clearly stated problem, each solution step with the reason for it, and a final check of the answer.',
      clauses: ['Show every step; do not skip the algebra or arithmetic the learner needs to see.', 'State the reasoning out loud for each step, not just the result. Verify the final answer.']
    },
    {
      id: 'narrative', icon: '📚', label: 'Story / Narrative',
      blurb: 'Teach through a short story.',
      seed: { length: 'std', reading: 'plain', tone: 'curious' },
      mustInclude: 'A clear beginning, middle, and end, and the lesson or takeaway tied back to the topic.',
      clauses: ['Keep the cast and setting simple so the idea stays in focus.', 'Make the takeaway explicit at the end so it is not just entertainment.']
    },
    {
      id: 'review', icon: '🔁', label: 'Unit Review',
      blurb: 'Recap the big ideas before an assessment.',
      seed: { length: 'std', reading: 'gradelevel', tone: 'energetic' },
      mustInclude: 'The 3 to 5 most important ideas from the unit and one quick self-check for each.',
      clauses: ['Prioritize ruthlessly; review only the highest-leverage ideas, not everything.', 'Connect the ideas to each other so it is a map, not a list.']
    }
  ];

  // Diagnosis: a checked symptom maps to a corrective clause appended to the re-prompt.
  var SYMPTOMS = [
    { id: 'toolong', label: 'Too long / dragged on', fix: 'The previous version was too long. Cut it down hard: keep only the essential idea and remove every tangent, repeat, and filler sentence.' },
    { id: 'halluc', label: 'Showed a wrong or made-up visual', fix: 'The previous version showed inaccurate or invented visuals. Depict only things that are scientifically and factually accurate and supported by the source. Do not invent objects, labels, or scenes that are not in the source material.' },
    { id: 'tooadvanced', label: 'Too advanced for my students', fix: 'The previous version was too advanced. Lower the vocabulary and sentence complexity, slow the pacing, and define every term in plain language.' },
    { id: 'offtopic', label: 'Drifted off the main point', fix: 'The previous version drifted off topic. Stay tightly on the stated focus and do not introduce side topics.' },
    { id: 'ostext', label: 'On-screen text problems', fix: 'The previous version had distracting or wrong-language on-screen text. Minimize on-screen text; any text that appears must be correct, brief, and in the requested language.' },
    { id: 'toofast', label: 'Narration too fast', fix: 'The previous version narrated too quickly. Slow the narration and add brief pauses so learners can follow.' },
    { id: 'missing', label: 'Left out something important', fix: 'The previous version left out key content. Be sure to include the must-have points listed below.' },
    { id: 'tone', label: 'Tone was off', fix: 'The previous version had the wrong tone. Match the requested tone consistently throughout.' }
  ];

  // ─── Prompt assembly (fully deterministic; works with zero AI) ─────────────

  function gradeLabel(id) {
    for (var i = 0; i < GRADE_BANDS.length; i++) if (GRADE_BANDS[i].id === id) return GRADE_BANDS[i].label;
    return id;
  }
  function findById(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }

  function buildSteeringPrompt(f, preset) {
    var lines = [];
    var typeLabel = preset ? preset.label.toLowerCase() : 'short educational';
    lines.push('Create a ' + typeLabel + ' video overview' + (f.topic ? ' about: ' + f.topic.trim() : '') + '.');
    lines.push('Audience: ' + gradeLabel(f.gradeBand) + '.');

    var rl = findById(READING_LEVELS, f.reading);
    if (rl) {
      if (f.reading === 'simplest') lines.push('Use the simplest possible language: short sentences and common, everyday words.');
      else if (f.reading === 'plain') lines.push('Use plain, clear language and everyday vocabulary.');
      else if (f.reading === 'gradelevel') lines.push('Use language appropriate for this grade level.');
      else if (f.reading === 'rich') lines.push('Introduce academic vocabulary, but define each term the first time it is used.');
    }

    var len = findById(LENGTHS, f.length);
    if (len) lines.push(len.clause);

    var tone = findById(TONES, f.tone);
    if (tone) lines.push('Tone: ' + tone.label.toLowerCase() + '.');

    if (preset && preset.clauses) { for (var i = 0; i < preset.clauses.length; i++) lines.push(preset.clauses[i]); }

    if (f.mustInclude && f.mustInclude.trim()) lines.push('Be sure to include: ' + f.mustInclude.trim());
    if (f.mustAvoid && f.mustAvoid.trim()) lines.push('Avoid: ' + f.mustAvoid.trim());

    if (f.onScreenText === 'none') lines.push('Minimize on-screen text; rely on narration and visuals instead of words on screen.');
    else if (f.onScreenText && f.onScreenText !== 'default') lines.push('Any on-screen text must be brief and written in ' + f.onScreenText + '.');

    if (f.visualAccuracy) lines.push('Visual accuracy is critical: depict only accurate, source-supported images. Do not invent or substitute objects, and do not show anything that could mislead about the facts.');

    if (f.udl) lines.push('Accessibility: narrate at a steady pace with clear enunciation, define key terms, and make sure the visuals reinforce (not distract from) the spoken explanation.');

    return lines.join('\n');
  }

  function buildRePrompt(base, checkedIds, notes, f) {
    var lines = [];
    lines.push('Revise the video with these corrections:');
    for (var i = 0; i < SYMPTOMS.length; i++) {
      if (checkedIds.indexOf(SYMPTOMS[i].id) !== -1) lines.push('- ' + SYMPTOMS[i].fix);
    }
    if (notes && notes.trim()) lines.push('- ' + notes.trim());
    lines.push('');
    lines.push('Keep everything that already worked. Here is the intended brief:');
    lines.push(base);
    if (f && checkedIds.indexOf('missing') !== -1 && f.mustInclude && f.mustInclude.trim()) {
      lines.push('');
      lines.push('Must-have points: ' + f.mustInclude.trim());
    }
    return lines.join('\n');
  }

  // ─── Component ────────────────────────────────────────────────────────────

  function CinematicStudio(props) {
    var onClose = props.onClose, callGemini = props.callGemini, addToast = props.addToast;
    var T = makeT(props.t);

    var _tab = useState('build'); var tab = _tab[0], setTab = _tab[1];
    var _preset = useState('explainer'); var presetId = _preset[0], setPresetId = _preset[1];

    var initialFields = {
      topic: props.sourceTopic || '',
      gradeBand: '35',
      reading: 'plain',
      length: 'std',
      tone: 'curious',
      mustInclude: '',
      mustAvoid: '',
      onScreenText: 'default',
      visualAccuracy: true,
      udl: true
    };
    var _fields = useState(initialFields); var fields = _fields[0], setFields = _fields[1];
    function setField(k, v) { setFields(function (prev) { var n = {}; for (var kk in prev) n[kk] = prev[kk]; n[k] = v; return n; }); }

    var _ai = useState(''); var aiResult = _ai[0], setAiResult = _ai[1];
    var _busy = useState(false); var busy = _busy[0], setBusy = _busy[1];

    var _sym = useState([]); var checked = _sym[0], setChecked = _sym[1];
    var _notes = useState(''); var notes = _notes[0], setNotes = _notes[1];
    var _re = useState(''); var rePrompt = _re[0], setRePrompt = _re[1];
    var _reBusy = useState(false); var reBusy = _reBusy[0], setReBusy = _reBusy[1];

    var headingRef = useRef(null);
    useEffect(function () { if (headingRef.current) { try { headingRef.current.focus(); } catch (_) {} } }, []);
    useEffect(function () {
      function onKey(e) { if (e.key === 'Escape' && onClose) onClose(); }
      if (typeof document !== 'undefined') document.addEventListener('keydown', onKey);
      return function () { if (typeof document !== 'undefined') document.removeEventListener('keydown', onKey); };
    }, [onClose]);

    var preset = useMemo(function () { return findById(LESSON_TYPES, presetId); }, [presetId]);
    var assembled = useMemo(function () { return buildSteeringPrompt(fields, preset); }, [fields, preset]);

    function applyPreset(id) {
      var p = findById(LESSON_TYPES, id);
      setPresetId(id);
      if (p && p.seed) {
        setFields(function (prev) {
          var n = {}; for (var kk in prev) n[kk] = prev[kk];
          if (p.seed.length) n.length = p.seed.length;
          if (p.seed.reading) n.reading = p.seed.reading;
          if (p.seed.tone) n.tone = p.seed.tone;
          if (!prev.mustInclude && p.mustInclude) n.mustInclude = p.mustInclude;
          return n;
        });
      }
      setAiResult('');
      announce(T('cs_preset_applied', 'Template applied: ' + (p ? p.label : id)));
    }

    function copy(text, what) {
      if (!text) return;
      var done = function () { if (addToast) addToast((what || 'Prompt') + ' copied', 'success'); announce((what || 'Prompt') + ' copied to clipboard'); };
      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); }); }
        else fallbackCopy(text, done);
      } catch (_) { fallbackCopy(text, done); }
    }
    function fallbackCopy(text, done) {
      try {
        var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); done();
      } catch (e) { if (addToast) addToast('Copy failed; select the text and copy manually', 'error'); }
    }

    function improvePrompt() {
      if (!callGemini) { if (addToast) addToast('AI is not available here; the prompt above already works', 'info'); return; }
      setBusy(true); setAiResult(''); announce('Refining your prompt');
      var meta = 'You are an expert instructional designer helping a teacher write a STEERING PROMPT for a NotebookLM "Cinematic Video Overview" (a 2-5 minute narrated animated video generated from sources). '
        + 'There is no editing after generation, so the prompt must be precise. Improve the steering prompt below: keep it concise, concrete, and faithful to the teacher\'s intent; strengthen any vague guidance; keep all accuracy and accessibility constraints; do not add new topics the teacher did not ask for. '
        + 'Return ONLY the improved steering prompt as plain text, with no preamble, no headings, and no commentary.\n\n--- STEERING PROMPT ---\n' + assembled;
      Promise.resolve()
        .then(function () { return callGemini(meta, false, true); })
        .then(function (res) {
          var text = '';
          if (typeof res === 'string') text = res;
          else if (res && typeof res.text === 'string') text = res.text;
          text = (text || '').trim();
          if (text) { setAiResult(text); announce('Refined prompt ready'); }
          else { if (addToast) addToast('The AI did not return text. Your prompt above still works as-is.', 'info'); announce('No refinement returned'); }
        })
        .catch(function () { if (addToast) addToast('Refine failed. Your prompt above still works as-is.', 'error'); })
        .then(function () { setBusy(false); });
    }

    function toggleSymptom(id) {
      setChecked(function (prev) { var idx = prev.indexOf(id); if (idx === -1) return prev.concat([id]); var c = prev.slice(); c.splice(idx, 1); return c; });
    }

    function makeRePrompt() {
      var base = buildRePrompt(assembled, checked, notes, fields);
      setRePrompt(base);
      announce('Re-prompt drafted');
      if (!callGemini) return;
      setReBusy(true);
      var meta = 'A teacher regenerated a NotebookLM cinematic video and it had problems. Tighten the REVISION PROMPT below so the next regeneration fixes those problems while keeping what worked. Return ONLY the improved revision prompt as plain text, no preamble or commentary.\n\n--- REVISION PROMPT ---\n' + base;
      Promise.resolve()
        .then(function () { return callGemini(meta, false, true); })
        .then(function (res) {
          var text = (typeof res === 'string') ? res : (res && res.text) ? res.text : '';
          text = (text || '').trim();
          if (text) { setRePrompt(text); announce('Polished re-prompt ready'); }
        })
        .catch(function () {})
        .then(function () { setReBusy(false); });
    }

    // ── small render helpers ──
    function label(text, htmlFor) { return h('label', { className: 'block text-sm font-semibold text-slate-200 mb-1', htmlFor: htmlFor }, text); }
    function selectEl(id, value, onChange, options) {
      return h('select', {
        id: id, value: value, onChange: function (e) { onChange(e.target.value); },
        className: 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm'
      }, options.map(function (o) { return h('option', { key: o.id, value: o.id }, o.label); }));
    }

    var btn = function (active) {
      return 'px-4 py-2 rounded-lg text-sm font-semibold transition-colors ' + (active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700');
    };

    // ── header ──
    var header = h('div', { className: 'flex items-start justify-between gap-4 mb-3' }, [
      h('div', { key: 'ttl' }, [
        h('h2', { key: 'h', ref: headingRef, tabIndex: -1, className: 'text-xl font-bold text-white flex items-center gap-2' }, [
          h('span', { key: 'i', 'aria-hidden': 'true' }, '🎬'),
          T('cs_title', 'Cinematic Studio')
        ]),
        h('p', { key: 's', className: 'text-sm text-slate-400 mt-1' },
          T('cs_subtitle', 'Craft a strong steering prompt for a NotebookLM Cinematic Video Overview, then diagnose and re-prompt a weak result.'))
      ]),
      h('button', { key: 'x', onClick: onClose, 'aria-label': T('cs_close', 'Close Cinematic Studio'),
        className: 'text-slate-400 hover:text-white text-2xl leading-none px-2' }, '×')
    ]);

    // ── honesty banner ──
    var banner = h('div', { className: 'mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200' },
      T('cs_banner', 'NotebookLM has no editor and no undo: you set a prompt, then regenerate the whole video (Ultra-only, about 20 per day). This tool helps you get the prompt right so you do not waste regenerations. It does not generate the video itself.'));

    // ── tabs ──
    var tabs = h('div', { role: 'tablist', 'aria-label': 'Cinematic Studio sections', className: 'flex flex-wrap gap-2 mb-4' }, [
      h('button', { key: 'b', role: 'tab', 'aria-selected': tab === 'build', className: btn(tab === 'build'), onClick: function () { setTab('build'); } }, T('cs_tab_build', '1. Build a prompt')),
      h('button', { key: 'd', role: 'tab', 'aria-selected': tab === 'diagnose', className: btn(tab === 'diagnose'), onClick: function () { setTab('diagnose'); } }, T('cs_tab_diagnose', '2. Diagnose & re-prompt')),
      h('button', { key: 'g', role: 'tab', 'aria-selected': tab === 'guide', className: btn(tab === 'guide'), onClick: function () { setTab('guide'); } }, T('cs_tab_guide', 'Tips'))
    ]);

    // ── BUILD tab ──
    var presetGrid = h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4' }, LESSON_TYPES.map(function (p) {
      var active = p.id === presetId;
      return h('button', {
        key: p.id, onClick: function () { applyPreset(p.id); }, 'aria-pressed': active, title: p.blurb,
        className: 'text-left rounded-lg border px-3 py-2 transition-colors ' + (active ? 'border-indigo-400 bg-indigo-600/20' : 'border-slate-700 bg-slate-800/60 hover:bg-slate-700/60')
      }, [
        h('div', { key: 'i', className: 'text-lg', 'aria-hidden': 'true' }, p.icon),
        h('div', { key: 'l', className: 'text-xs font-semibold text-slate-100' }, p.label)
      ]);
    }));

    var builder = h('div', { className: 'grid sm:grid-cols-2 gap-3' }, [
      h('div', { key: 'topic', className: 'sm:col-span-2' }, [label(T('cs_f_topic', 'Topic / focus'), 'cs-topic'),
        h('input', { id: 'cs-topic', type: 'text', value: fields.topic, onChange: function (e) { setField('topic', e.target.value); },
          placeholder: 'e.g. how the water cycle moves energy', className: 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm' })]),
      h('div', { key: 'grade' }, [label(T('cs_f_grade', 'Grade band'), 'cs-grade'), selectEl('cs-grade', fields.gradeBand, function (v) { setField('gradeBand', v); }, GRADE_BANDS)]),
      h('div', { key: 'read' }, [label(T('cs_f_read', 'Language level'), 'cs-read'), selectEl('cs-read', fields.reading, function (v) { setField('reading', v); }, READING_LEVELS)]),
      h('div', { key: 'len' }, [label(T('cs_f_len', 'Length'), 'cs-len'), selectEl('cs-len', fields.length, function (v) { setField('length', v); }, LENGTHS)]),
      h('div', { key: 'tone' }, [label(T('cs_f_tone', 'Tone'), 'cs-tone'), selectEl('cs-tone', fields.tone, function (v) { setField('tone', v); }, TONES)]),
      h('div', { key: 'ost', className: 'sm:col-span-2' }, [label(T('cs_f_ost', 'On-screen text'), 'cs-ost'),
        selectEl('cs-ost', fields.onScreenText, function (v) { setField('onScreenText', v); }, [
          { id: 'default', label: 'No preference' },
          { id: 'none', label: 'Minimize on-screen text (best for non-readers / EL)' },
          { id: 'English', label: 'On-screen text in English' },
          { id: 'Spanish', label: 'On-screen text in Spanish' },
          { id: 'the student home language', label: 'On-screen text in the student home language' }
        ])]),
      h('div', { key: 'inc', className: 'sm:col-span-2' }, [label(T('cs_f_inc', 'Must include'), 'cs-inc'),
        h('textarea', { id: 'cs-inc', rows: 2, value: fields.mustInclude, onChange: function (e) { setField('mustInclude', e.target.value); },
          className: 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm' })]),
      h('div', { key: 'avo', className: 'sm:col-span-2' }, [label(T('cs_f_avo', 'Must avoid'), 'cs-avo'),
        h('textarea', { id: 'cs-avo', rows: 2, value: fields.mustAvoid, onChange: function (e) { setField('mustAvoid', e.target.value); },
          className: 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm' })]),
      h('label', { key: 'va', className: 'flex items-center gap-2 text-sm text-slate-200', htmlFor: 'cs-va' }, [
        h('input', { key: 'c', id: 'cs-va', type: 'checkbox', checked: fields.visualAccuracy, onChange: function (e) { setField('visualAccuracy', e.target.checked); } }),
        T('cs_f_va', 'Add a visual-accuracy guardrail (recommended)')]),
      h('label', { key: 'udl', className: 'flex items-center gap-2 text-sm text-slate-200', htmlFor: 'cs-udl' }, [
        h('input', { key: 'c', id: 'cs-udl', type: 'checkbox', checked: fields.udl, onChange: function (e) { setField('udl', e.target.checked); } }),
        T('cs_f_udl', 'Add an accessibility / UDL clause (recommended)')])
    ]);

    var preview = h('div', { className: 'mt-4' }, [
      h('div', { key: 'lab', className: 'flex items-center justify-between mb-1' }, [
        h('span', { key: 't', className: 'text-sm font-semibold text-slate-200' }, T('cs_preview', 'Your steering prompt')),
        h('div', { key: 'btns', className: 'flex gap-2' }, [
          h('button', { key: 'c', onClick: function () { copy(assembled, 'Steering prompt'); }, className: 'text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-100' }, T('cs_copy', 'Copy')),
          h('button', { key: 'a', onClick: improvePrompt, disabled: busy, className: 'text-xs px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50' }, busy ? T('cs_refining', 'Refining...') : T('cs_improve', 'Improve with AI'))
        ])
      ]),
      h('pre', { key: 'pre', className: 'whitespace-pre-wrap text-xs text-slate-200 bg-slate-900/70 border border-slate-700 rounded-lg p-3 max-h-48 overflow-auto' }, assembled),
      aiResult ? h('div', { key: 'ai', className: 'mt-3' }, [
        h('div', { key: 'l', className: 'flex items-center justify-between mb-1' }, [
          h('span', { key: 't', className: 'text-sm font-semibold text-emerald-300' }, T('cs_ai_label', 'AI-refined draft (review before use)')),
          h('button', { key: 'c', onClick: function () { copy(aiResult, 'Refined prompt'); }, className: 'text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-100' }, T('cs_copy', 'Copy'))
        ]),
        h('pre', { key: 'p', className: 'whitespace-pre-wrap text-xs text-slate-100 bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-3 max-h-48 overflow-auto' }, aiResult)
      ]) : null
    ]);

    var buildTab = h('div', { role: 'tabpanel' }, [presetGrid, builder, preview]);

    // ── DIAGNOSE tab ──
    var symGrid = h('div', { className: 'grid sm:grid-cols-2 gap-2 mb-3' }, SYMPTOMS.map(function (s) {
      var on = checked.indexOf(s.id) !== -1;
      return h('label', { key: s.id, htmlFor: 'cs-sym-' + s.id, className: 'flex items-start gap-2 text-sm text-slate-200 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 cursor-pointer' }, [
        h('input', { key: 'c', id: 'cs-sym-' + s.id, type: 'checkbox', checked: on, onChange: function () { toggleSymptom(s.id); }, className: 'mt-0.5' }),
        h('span', { key: 'l' }, s.label)
      ]);
    }));
    var diagnoseTab = h('div', { role: 'tabpanel' }, [
      h('p', { key: 'i', className: 'text-sm text-slate-400 mb-3' }, T('cs_diag_intro', 'Got a video back that missed the mark? Check what went wrong and add notes. This builds a tight revision prompt to paste back into NotebookLM before you regenerate.')),
      symGrid,
      h('div', { key: 'n', className: 'mb-3' }, [label(T('cs_diag_notes', 'Anything else that was off?'), 'cs-dnotes'),
        h('textarea', { id: 'cs-dnotes', rows: 2, value: notes, onChange: function (e) { setNotes(e.target.value); }, className: 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm' })]),
      h('button', { key: 'mk', onClick: makeRePrompt, disabled: reBusy, className: 'px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold disabled:opacity-50' }, reBusy ? T('cs_polishing', 'Polishing...') : T('cs_make_reprompt', 'Build revision prompt')),
      rePrompt ? h('div', { key: 'out', className: 'mt-3' }, [
        h('div', { key: 'l', className: 'flex items-center justify-between mb-1' }, [
          h('span', { key: 't', className: 'text-sm font-semibold text-slate-200' }, T('cs_reprompt', 'Revision prompt')),
          h('button', { key: 'c', onClick: function () { copy(rePrompt, 'Revision prompt'); }, className: 'text-xs px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-100' }, T('cs_copy', 'Copy'))
        ]),
        h('pre', { key: 'p', className: 'whitespace-pre-wrap text-xs text-slate-100 bg-slate-900/70 border border-slate-700 rounded-lg p-3 max-h-56 overflow-auto' }, rePrompt)
      ]) : null
    ]);

    // ── GUIDE tab ──
    var guideItem = function (k, title, body) {
      return h('div', { key: k, className: 'rounded-lg border border-slate-700 bg-slate-800/50 p-3' }, [
        h('div', { key: 't', className: 'text-sm font-semibold text-slate-100 mb-1' }, title),
        h('div', { key: 'b', className: 'text-xs text-slate-300' }, body)
      ]);
    };
    var guideTab = h('div', { role: 'tabpanel', className: 'space-y-2' }, [
      guideItem('a', T('cs_g1_t', 'You cannot edit the video'), T('cs_g1_b', 'NotebookLM gives you a finished MP4. To change anything you must rewrite the steering prompt and regenerate the whole thing. That is why the prompt matters so much.')),
      guideItem('b', T('cs_g2_t', 'Regenerations are limited'), T('cs_g2_b', 'Cinematic videos are an AI Ultra feature with roughly 20 generations per day and can take many minutes each. Get the prompt close before you spend one.')),
      guideItem('c', T('cs_g3_t', 'Watch for made-up visuals'), T('cs_g3_b', 'The model can show inaccurate or invented images. Keep the visual-accuracy guardrail on, and if it happens, use the Diagnose tab to push back specifically.')),
      guideItem('d', T('cs_g4_t', 'It narrates in English'), T('cs_g4_b', 'Narration is English-only today. For multilingual classrooms, plan to add translated captions afterward (an AlloFlow accessibility step that is coming) rather than expecting NotebookLM to translate.')),
      guideItem('e', T('cs_g5_t', 'Shorter is usually better'), T('cs_g5_b', 'One clear idea in two focused minutes beats five rambling ones. Use the length setting and trim your must-include list.'))
    ]);

    var body = tab === 'build' ? buildTab : (tab === 'diagnose' ? diagnoseTab : guideTab);

    return h('div', {
      className: 'cs-root fixed inset-0 z-[60] bg-black/50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-auto',
      role: 'dialog', 'aria-modal': 'true', 'aria-label': T('cs_title', 'Cinematic Studio'),
      onMouseDown: function (e) { if (e.target === e.currentTarget && onClose) onClose(); }
    }, h('div', {
      className: 'bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl p-4 sm:p-6 my-4'
    }, [header, banner, tabs, body]));
  }

  // ─── Module registration ───────────────────────────────────────────────────
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.CinematicStudio = CinematicStudio;
  console.log('[CinematicStudioModule] Cinematic Studio registered');
})();
