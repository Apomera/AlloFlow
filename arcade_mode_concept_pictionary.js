(function () {
  // ═══════════════════════════════════════════
  // arcade_mode_concept_pictionary.js — AlloHaven Arcade plugin.
  //
  // Solo Concept Pictionary: student draws a concept on a canvas; Gemini
  // vision tries to guess what they drew. The pedagogical move is that
  // drawing the concept clearly enough for the AI to recognize it is the
  // comprehension probe — the student has to externalize their
  // understanding well enough for a non-human to map it back to the
  // correct concept.
  //
  // Three difficulty tiers:
  //   - Easy   →  6 options shown to AI (multiple choice from pool)
  //   - Medium → 10 options shown to AI (default)
  //   - Hard   → 15+ options, AI free-guesses without seeing the pool;
  //              we map AI's free-guess to the nearest pool entry by
  //              substring + fuzzy match.
  //
  // Concept source priority:
  //   1. ctx.glossaryEntries  (current AlloFlow lesson glossary)
  //   2. AI-generated from a topic the student types
  //   3. Built-in fallback pool (general science / language arts)
  //
  // Plays entirely inside the arcade card. Token cost paid on launch via
  // ctx.onLaunch. No Firestore, no peer-to-peer, no FERPA surface —
  // canvas data goes to Gemini Vision and is not retained.
  //
  // Sibling to: arcade_mode_concept_atlas.js, arcade_mode_boss_encounter.js.
  // Distinct from: concept_pictionary_source.jsx (classroom multi-drawer
  // version — different game, different audience).
  // ═══════════════════════════════════════════

  function waitForRegistry(cb) {
    if (window.AlloHavenArcade && typeof window.AlloHavenArcade.registerMode === 'function') {
      cb(); return;
    }
    var attempts = 0;
    var iv = setInterval(function () {
      attempts++;
      if (window.AlloHavenArcade && typeof window.AlloHavenArcade.registerMode === 'function') {
        clearInterval(iv); cb();
      } else if (attempts > 50) {
        clearInterval(iv);
        if (typeof console !== 'undefined') {
          console.warn('[arcade_mode_concept_pictionary] AlloHavenArcade registry not found after 5s — plugin not registered.');
        }
      }
    }, 100);
  }

  waitForRegistry(function () {
    if (window.AlloHavenArcade.isRegistered && window.AlloHavenArcade.isRegistered('concept-pictionary')) {
      return;
    }
    register();
  });

  // ── Built-in fallback concept pool ──
  // Used only when no lesson glossary is loaded and the student doesn't
  // type a topic. Keeps the arcade card playable in a fresh AlloHaven.
  var FALLBACK_CONCEPTS = [
    'photosynthesis', 'mitosis', 'evaporation', 'gravity', 'magnet',
    'volcano', 'tornado', 'rainbow', 'eclipse', 'orbit',
    'food chain', 'cell membrane', 'DNA', 'nucleus', 'chloroplast',
    'circuit', 'lever', 'pulley', 'gear', 'wheel and axle',
    'metaphor', 'simile', 'rhyme', 'plot', 'theme',
    'fraction', 'symmetry', 'triangle', 'cone', 'cube',
    'compass', 'map', 'flag', 'mountain', 'river',
    'echo', 'shadow', 'mirror', 'lens', 'prism',
  ];

  // ── Tiny fuzzy match: lowercased substring score + token overlap ──
  function _fuzzyScore(needle, haystack) {
    if (!needle || !haystack) return 0;
    var n = String(needle).toLowerCase().trim();
    var h = String(haystack).toLowerCase().trim();
    if (h === n) return 100;
    if (h.indexOf(n) !== -1 || n.indexOf(h) !== -1) return 80;
    var nTokens = n.split(/\s+/);
    var hTokens = h.split(/\s+/);
    var overlap = 0;
    nTokens.forEach(function (t) { if (t.length > 2 && hTokens.indexOf(t) !== -1) overlap++; });
    if (overlap === 0) return 0;
    return Math.round((overlap / Math.max(nTokens.length, hTokens.length)) * 60);
  }

  function _findClosest(guess, pool) {
    if (!guess || !pool || !pool.length) return null;
    var best = null;
    var bestScore = 0;
    pool.forEach(function (concept) {
      var label = (typeof concept === 'string') ? concept : (concept.term || concept.label || concept.name || '');
      var s = _fuzzyScore(guess, label);
      if (s > bestScore) { bestScore = s; best = label; }
    });
    return bestScore >= 40 ? { match: best, score: bestScore } : null;
  }

  // ── Pull a numbered list of concepts from raw Gemini text ──
  function _parseConceptList(raw) {
    if (!raw) return [];
    var lines = String(raw).split(/\r?\n/);
    var out = [];
    lines.forEach(function (ln) {
      // Match "1. concept" / "- concept" / "* concept" / "1) concept"
      var m = ln.match(/^\s*(?:[-*•]|\d+[\.\)])\s+(.+?)\s*$/);
      if (m) {
        var cleaned = m[1].replace(/[.;:!?]+$/, '').trim();
        if (cleaned && cleaned.length < 60) out.push(cleaned);
      }
    });
    return out;
  }

  // ── Strip code fences / JSON wrapping from Gemini text ──
  function _stripFences(s) {
    if (typeof s !== 'string') return '';
    return s.replace(/```(?:json|javascript|js)?\s*/gi, '').replace(/```\s*$/g, '').trim();
  }

  function _parseGuessJSON(raw) {
    if (!raw) return null;
    var s = _stripFences(raw);
    // Try whole-string parse first
    try { return JSON.parse(s); } catch (_) {}
    // Try to find the first {...} block
    var open = s.indexOf('{');
    var close = s.lastIndexOf('}');
    if (open >= 0 && close > open) {
      try { return JSON.parse(s.substring(open, close + 1)); } catch (_) {}
    }
    return null;
  }

  // ── Build the list of options the AI sees (or just the answer for hard mode) ──
  function _buildOptionsForAI(concepts, correctIdx, difficulty) {
    var pool = concepts.slice();
    var correct = pool[correctIdx];
    var optionCount = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 10 : 15;
    if (difficulty === 'hard') {
      // AI doesn't see options; we map its free-guess to the pool ourselves.
      return null;
    }
    optionCount = Math.min(optionCount, pool.length);
    // Always include the correct answer; pick the rest at random.
    var others = pool.filter(function (_, i) { return i !== correctIdx; });
    var picked = [correct];
    while (picked.length < optionCount && others.length > 0) {
      var idx = Math.floor(Math.random() * others.length);
      picked.push(others.splice(idx, 1)[0]);
    }
    // Shuffle so correct answer isn't always first
    for (var i = picked.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = picked[i]; picked[i] = picked[j]; picked[j] = tmp;
    }
    return picked;
  }

  function register() {
  window.AlloHavenArcade.registerMode('concept-pictionary', {
    label: 'Concept Pictionary',
    icon: '🎨',
    blurb: 'Draw a concept. AI tries to guess what you drew. Tighter than you think.',
    timeCost: 5,
    partnerRequired: false,
    ready: true,

    render: function (ctx) {
      var React = ctx.React || window.React;
      var h = React.createElement;
      var palette = ctx.palette || {};
      var session = ctx.session;
      var mpt = ctx.minutesPerToken || 5;

      // ── State ──
      var minutesTuple = React.useState(5);
      var minutes = minutesTuple[0];
      var setMinutes = minutesTuple[1];

      var difficultyTuple = React.useState('medium');
      var difficulty = difficultyTuple[0];
      var setDifficulty = difficultyTuple[1];

      // 'idle' (pre-launch UI) | 'loading' (fetching concepts) | 'playing' | 'review' | 'finished'
      var phaseTuple = React.useState('idle');
      var phase = phaseTuple[0];
      var setPhase = phaseTuple[1];

      var conceptsTuple = React.useState([]);
      var concepts = conceptsTuple[0];
      var setConcepts = conceptsTuple[1];

      var roundIdxTuple = React.useState(0);
      var roundIdx = roundIdxTuple[0];
      var setRoundIdx = roundIdxTuple[1];

      var scoreTuple = React.useState(0);
      var score = scoreTuple[0];
      var setScore = scoreTuple[1];

      var roundsPlayedTuple = React.useState(0);
      var roundsPlayed = roundsPlayedTuple[0];
      var setRoundsPlayed = roundsPlayedTuple[1];

      var topicDraftTuple = React.useState('');
      var topicDraft = topicDraftTuple[0];
      var setTopicDraft = topicDraftTuple[1];

      var aiGuessTuple = React.useState(null);
      var aiGuess = aiGuessTuple[0];
      var setAiGuess = aiGuessTuple[1];

      var aiThinkingTuple = React.useState(false);
      var aiThinking = aiThinkingTuple[0];
      var setAiThinking = aiThinkingTuple[1];

      var penColorTuple = React.useState('#1a202c');
      var penColor = penColorTuple[0];
      var setPenColor = penColorTuple[1];

      var penWidthTuple = React.useState(4);
      var penWidth = penWidthTuple[0];
      var setPenWidth = penWidthTuple[1];

      var isEraserTuple = React.useState(false);
      var isEraser = isEraserTuple[0];
      var setIsEraser = isEraserTuple[1];

      var errorTuple = React.useState(null);
      var lastError = errorTuple[0];
      var setLastError = errorTuple[1];

      // Refs for canvas + strokes
      var canvasRef = React.useRef(null);
      var strokesRef = React.useRef([]);          // [{ color, width, points: [[x,y],...] }]
      var redoStackRef = React.useRef([]);
      var lastGuessAtRef = React.useRef(0);

      // ── Derived flags ──
      var tokensCost = Math.ceil(minutes / mpt);
      var canAfford = ctx.tokens >= tokensCost;
      var sessionActiveHere = !!(session && session.modeId === 'concept-pictionary');
      var sessionElsewhere = !!(session && session.modeId !== 'concept-pictionary');
      var launchDisabled = !canAfford || !!session;

      // ── Canvas drawing ──
      function _redraw() {
        var canvas = canvasRef.current;
        if (!canvas) return;
        var c2d = canvas.getContext('2d');
        if (!c2d) return;
        c2d.fillStyle = '#ffffff';
        c2d.fillRect(0, 0, canvas.width, canvas.height);
        strokesRef.current.forEach(function (stroke) {
          c2d.strokeStyle = stroke.color;
          c2d.lineWidth = stroke.width;
          c2d.lineCap = 'round';
          c2d.lineJoin = 'round';
          c2d.beginPath();
          stroke.points.forEach(function (pt, i) {
            if (i === 0) c2d.moveTo(pt[0], pt[1]);
            else c2d.lineTo(pt[0], pt[1]);
          });
          c2d.stroke();
        });
      }

      function _getPos(evt, canvas) {
        var rect = canvas.getBoundingClientRect();
        var x, y;
        if (evt.touches && evt.touches.length > 0) {
          x = evt.touches[0].clientX - rect.left;
          y = evt.touches[0].clientY - rect.top;
        } else {
          x = evt.clientX - rect.left;
          y = evt.clientY - rect.top;
        }
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        return [Math.round(x * scaleX), Math.round(y * scaleY)];
      }

      var drawingRef = React.useRef(false);

      function _onPointerDown(evt) {
        if (phase !== 'playing') return;
        var canvas = canvasRef.current;
        if (!canvas) return;
        evt.preventDefault();
        drawingRef.current = true;
        var pt = _getPos(evt, canvas);
        strokesRef.current.push({
          color: isEraser ? '#ffffff' : penColor,
          width: isEraser ? Math.max(penWidth * 4, 16) : penWidth,
          points: [pt],
        });
        redoStackRef.current = [];
        _redraw();
      }

      function _onPointerMove(evt) {
        if (!drawingRef.current) return;
        var canvas = canvasRef.current;
        if (!canvas) return;
        evt.preventDefault();
        var pt = _getPos(evt, canvas);
        var cur = strokesRef.current[strokesRef.current.length - 1];
        if (cur) {
          cur.points.push(pt);
          _redraw();
        }
      }

      function _onPointerUp() {
        drawingRef.current = false;
      }

      function _clear() {
        strokesRef.current = [];
        redoStackRef.current = [];
        _redraw();
      }
      function _undo() {
        if (strokesRef.current.length === 0) return;
        var popped = strokesRef.current.pop();
        redoStackRef.current.push(popped);
        _redraw();
      }
      function _redoStroke() {
        if (redoStackRef.current.length === 0) return;
        var s = redoStackRef.current.pop();
        strokesRef.current.push(s);
        _redraw();
      }

      // Initialize blank canvas when entering playing phase
      React.useEffect(function () {
        if (phase === 'playing') {
          strokesRef.current = [];
          redoStackRef.current = [];
          setAiGuess(null);
          // Defer to next tick so the canvas ref is attached.
          setTimeout(_redraw, 0);
        }
      }, [phase, roundIdx]);

      // ── Concept loading ──
      // Returns array of concept strings. Drains glossary first; falls back to AI or built-ins.
      function _conceptsFromGlossary() {
        var entries = (ctx.glossaryEntries && ctx.glossaryEntries.length > 0) ? ctx.glossaryEntries : [];
        if (!entries.length) return [];
        return entries
          .map(function (e) { return (e && (e.term || e.label || e.name)) || ''; })
          .filter(function (t) { return t && t.length < 60; });
      }

      async function _aiGenerateConcepts(topic) {
        var callGemini = ctx.callGemini || window.callGemini;
        if (typeof callGemini !== 'function') return [];
        var prompt = 'Generate 18 short, drawable concepts (1-3 words each) related to the topic: "' + topic + '". '
          + 'Each concept should be something a middle-school student could plausibly draw with pen/pencil on paper. '
          + 'Avoid abstract concepts that have no visual form. Return as a numbered list, one concept per line, '
          + 'no explanations.';
        try {
          var raw = await callGemini(prompt, false);
          var list = _parseConceptList(typeof raw === 'string' ? raw : '');
          return list.slice(0, 18);
        } catch (e) {
          if (typeof console !== 'undefined') console.warn('[ConceptPictionary] concept gen failed:', e);
          return [];
        }
      }

      async function _loadConceptsAndStart() {
        setLastError(null);
        setPhase('loading');
        var fromLesson = _conceptsFromGlossary();
        var list = fromLesson;
        if (list.length < 6 && topicDraft.trim()) {
          var generated = await _aiGenerateConcepts(topicDraft.trim());
          list = generated;
        }
        if (list.length < 6) {
          // Fallback pool
          list = FALLBACK_CONCEPTS.slice();
        }
        // Shuffle so each session has a different order.
        for (var i = list.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
        }
        setConcepts(list);
        setRoundIdx(0);
        setScore(0);
        setRoundsPlayed(0);
        setPhase('playing');
      }

      // ── Gemini guess ──
      async function _askAI() {
        if (phase !== 'playing') return;
        if (aiThinking) return;
        if (strokesRef.current.length === 0) {
          setLastError('Draw something first!');
          return;
        }
        var canvas = canvasRef.current;
        if (!canvas) return;

        // Throttle to avoid hammering on rapid clicks.
        var now = Date.now();
        if (now - lastGuessAtRef.current < 800) return;
        lastGuessAtRef.current = now;

        setAiThinking(true);
        setLastError(null);

        try {
          // Capture canvas as base64 JPEG (smaller than PNG)
          var dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          var base64 = dataUrl.split(',')[1];

          var correctConcept = concepts[roundIdx % concepts.length];
          var optionsForAI = _buildOptionsForAI(concepts, roundIdx % concepts.length, difficulty);

          var prompt;
          if (optionsForAI) {
            // Multiple choice: AI picks from the options list.
            prompt = 'You are looking at a hand-drawn sketch made by a student. '
              + 'The student is trying to draw ONE of these concepts:\n'
              + optionsForAI.map(function (c, i) { return (i + 1) + '. ' + c; }).join('\n')
              + '\n\nWhich concept do you think the student drew? Return ONLY a JSON object: '
              + '{"guess": "<the exact concept text>", "confidence": <0-100>, "reasoning": "<one short sentence about what visual cues led you to this guess>"}';
          } else {
            // Hard mode: free guess, no options shown.
            prompt = 'You are looking at a hand-drawn sketch made by a student. '
              + 'In 1-3 words, what concept do you think the student is trying to draw? '
              + 'Return ONLY a JSON object: '
              + '{"guess": "<1-3 word concept>", "confidence": <0-100>, "reasoning": "<one short sentence about what visual cues led you to this guess>"}';
          }

          var vision = ctx.callGeminiVision || window.callGeminiVision;
          if (typeof vision !== 'function') {
            setLastError('AI vision not available — please reload the page.');
            setAiThinking(false);
            return;
          }

          var rawText = await vision(prompt, base64, 'image/jpeg');
          var parsed = _parseGuessJSON(typeof rawText === 'string' ? rawText : '');
          if (!parsed || !parsed.guess) {
            setLastError('AI gave a confusing response — try drawing more, or click Ask AI again.');
            setAiThinking(false);
            return;
          }

          var rawGuess = String(parsed.guess).trim();
          var matched = rawGuess;
          var correctLC = String(correctConcept).toLowerCase().trim();
          var isCorrect = rawGuess.toLowerCase().trim() === correctLC;

          if (!isCorrect && difficulty === 'hard') {
            // Free-guess mode: map AI's guess to the closest concept in the pool.
            var fuzz = _findClosest(rawGuess, concepts);
            if (fuzz) {
              matched = fuzz.match;
              isCorrect = String(matched).toLowerCase().trim() === correctLC;
            }
          }

          setAiGuess({
            raw: rawGuess,
            matched: matched,
            confidence: parsed.confidence,
            reasoning: parsed.reasoning,
            isCorrect: isCorrect,
            correctConcept: correctConcept,
          });
          setAiThinking(false);

          if (isCorrect) {
            setScore(score + 1);
          }
        } catch (e) {
          if (typeof console !== 'undefined') console.warn('[ConceptPictionary] AI guess failed:', e);
          setLastError('AI is unreachable right now. Check your connection and try again.');
          setAiThinking(false);
        }
      }

      function _nextRound() {
        var newRoundsPlayed = roundsPlayed + 1;
        setRoundsPlayed(newRoundsPlayed);
        setAiGuess(null);
        setLastError(null);
        if (newRoundsPlayed >= 5) {
          setPhase('finished');
          return;
        }
        // Advance to the next concept. Wrap if we exhaust the pool.
        setRoundIdx((roundIdx + 1) % Math.max(concepts.length, 1));
      }

      function _giveUp() {
        // Mark this round wrong, advance.
        setAiGuess({
          raw: '—',
          matched: '—',
          confidence: 0,
          reasoning: 'You skipped this round.',
          isCorrect: false,
          correctConcept: concepts[roundIdx % concepts.length],
        });
      }

      function _playAgain() {
        setPhase('idle');
        setScore(0);
        setRoundsPlayed(0);
        setRoundIdx(0);
        setAiGuess(null);
      }

      function _endNow() {
        if (typeof ctx.onEndSession === 'function') ctx.onEndSession('completed');
        _playAgain();
      }

      function handleLaunch() {
        if (launchDisabled) return;
        var ok = ctx.onLaunch(minutes);
        if (!ok) return;
        _loadConceptsAndStart();
      }

      // ═══════════ UI ═══════════

      // Card wrapper (matches sage_launcher's surface treatment)
      var cardStyle = {
        padding: '14px 16px',
        background: palette.surface || '#1e293b',
        border: '1px solid ' + (palette.border || '#334155'),
        borderRadius: '10px',
      };

      // ── Pre-launch / idle phase ──
      if (phase === 'idle') {
        return h('div', { style: cardStyle },
          // Header
          h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: '32px', lineHeight: 1 } }, '🎨'),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { fontSize: '15px', fontWeight: 700, color: palette.text || '#e2e8f0' } },
                'Concept Pictionary'),
              h('div', {
                style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', lineHeight: 1.45, marginTop: '3px' }
              },
                'Draw a concept on the canvas. AI tries to guess what you drew. Tighter than you think.')
            )
          ),

          sessionActiveHere ? h('div', {
            style: {
              padding: '8px 12px',
              background: (palette.bg || '#0f172a') + 'cc',
              border: '1px solid ' + (palette.accent || '#60a5fa'),
              borderRadius: '8px',
              fontSize: '11px',
              color: palette.text || '#e2e8f0',
              marginBottom: '12px',
              lineHeight: 1.4
            }
          }, '⏱ Pictionary session active.') : null,

          // Difficulty picker
          h('div', { style: { marginBottom: '10px' } },
            h('div', {
              style: {
                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                color: palette.textMute || '#a3a3a3', marginBottom: '6px'
              }
            }, 'Difficulty'),
            h('div', { role: 'radiogroup', style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
              [
                { id: 'easy',   label: 'Easy',   help: '6 options shown to AI' },
                { id: 'medium', label: 'Medium', help: '10 options shown to AI' },
                { id: 'hard',   label: 'Hard',   help: 'AI free-guesses (no options)' },
              ].map(function (d) {
                var active = difficulty === d.id;
                return h('button', {
                  key: d.id,
                  onClick: function () { setDifficulty(d.id); },
                  role: 'radio',
                  'aria-checked': active ? 'true' : 'false',
                  'aria-label': d.label + ' difficulty — ' + d.help,
                  style: {
                    padding: '6px 12px',
                    background: active ? (palette.accent || '#60a5fa') : (palette.bg || '#0f172a'),
                    color: active ? (palette.onAccent || '#0f172a') : (palette.text || '#e2e8f0'),
                    border: '1px solid ' + (active ? (palette.accent || '#60a5fa') : (palette.border || '#334155')),
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }
                }, d.label);
              })
            ),
            h('div', {
              style: { fontSize: '10px', color: palette.textMute || '#a3a3a3', marginTop: '4px', lineHeight: 1.4 }
            },
              difficulty === 'easy'   ? '6 options shown to AI. AI picks from list.'
              : difficulty === 'hard' ? 'AI free-guesses what it sees, no options shown. We map AI guess to the closest concept in the pool.'
              :                         '10 options shown to AI. AI picks from list. (Default.)')
          ),

          // Topic / concept source
          h('div', { style: { marginBottom: '10px' } },
            h('label', {
              htmlFor: 'pictionary-topic',
              style: {
                display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.06em', color: palette.textMute || '#a3a3a3', marginBottom: '6px'
              }
            }, 'Topic'),
            h('input', {
              id: 'pictionary-topic',
              type: 'text',
              value: topicDraft,
              onChange: function (e) { setTopicDraft(e.target.value); },
              placeholder: ctx.glossaryEntries && ctx.glossaryEntries.length >= 6
                ? 'Leave blank to use your current lesson glossary'
                : 'e.g., cell biology, the water cycle, geometry',
              'aria-label': 'Topic for concept generation',
              style: {
                width: '100%', padding: '6px 8px',
                background: palette.bg || '#0f172a', color: palette.text || '#e2e8f0',
                border: '1px solid ' + (palette.border || '#334155'),
                borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box'
              }
            }),
            ctx.glossaryEntries && ctx.glossaryEntries.length >= 6
              ? h('div', { style: { fontSize: '10px', color: palette.textMute || '#a3a3a3', marginTop: '4px' } },
                  '✓ Using your current lesson glossary (' + ctx.glossaryEntries.length + ' concepts).')
              : null
          ),

          // Time + launch
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
            h('label', {
              style: {
                fontSize: '11px', color: palette.textMute || '#a3a3a3', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em'
              }
            }, 'Minutes'),
            h('select', {
              value: minutes,
              onChange: function (e) {
                var n = parseInt(e.target.value, 10);
                if (!isNaN(n)) setMinutes(n);
              },
              disabled: launchDisabled,
              'aria-label': 'Minutes to launch',
              style: {
                padding: '4px 8px',
                background: palette.bg || '#0f172a',
                border: '1px solid ' + (palette.border || '#334155'),
                color: palette.text || '#e2e8f0',
                borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit',
                cursor: launchDisabled ? 'not-allowed' : 'pointer'
              }
            },
              [5, 10, 15, 20].map(function (n) {
                var costN = Math.ceil(n / mpt);
                var afford = ctx.tokens >= costN;
                return h('option', {
                  key: 'min-' + n,
                  value: n,
                  disabled: !afford && !launchDisabled
                }, n + ' min · ' + costN + ' 🪙');
              })
            ),
            h('div', { style: { flex: 1 } }),
            h('button', {
              onClick: handleLaunch,
              disabled: launchDisabled,
              'aria-label': 'Launch Concept Pictionary for ' + minutes + ' minutes (' + tokensCost + ' tokens)',
              style: {
                background: launchDisabled ? (palette.surface || '#1e293b') : (palette.accent || '#60a5fa'),
                color: launchDisabled ? (palette.textMute || '#a3a3a3') : (palette.onAccent || '#0f172a'),
                border: 'none', borderRadius: '8px', padding: '8px 16px',
                fontSize: '13px', fontWeight: 700,
                cursor: launchDisabled ? 'not-allowed' : 'pointer',
                opacity: launchDisabled ? 0.6 : 1, fontFamily: 'inherit'
              }
            },
              sessionActiveHere ? 'Running…'
              : sessionElsewhere ? 'Another game running'
              : !canAfford ? 'Need ' + tokensCost + ' 🪙'
              : 'Launch · ' + tokensCost + ' 🪙'
            )
          )
        );
      }

      // ── Loading phase (fetching concepts from AI) ──
      if (phase === 'loading') {
        return h('div', { style: cardStyle },
          h('div', { style: { textAlign: 'center', padding: '24px', color: palette.text || '#e2e8f0' } },
            h('div', { style: { fontSize: '28px', marginBottom: '8px' } }, '🎨'),
            h('div', { style: { fontSize: '13px', fontWeight: 700 } }, 'Loading concepts…'),
            h('div', {
              style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', marginTop: '4px' }
            },
              topicDraft.trim() ? 'AI is generating drawable concepts about "' + topicDraft.trim() + '".' : 'Loading concept pool…')
          )
        );
      }

      // ── Finished phase ──
      if (phase === 'finished') {
        var pct = roundsPlayed > 0 ? Math.round((score / roundsPlayed) * 100) : 0;
        return h('div', { style: cardStyle },
          h('div', { style: { textAlign: 'center', padding: '20px' } },
            h('div', { style: { fontSize: '36px', marginBottom: '8px' } }, score >= roundsPlayed * 0.7 ? '🎉' : '🎨'),
            h('div', { style: { fontSize: '18px', fontWeight: 800, color: palette.text || '#e2e8f0' } },
              'Round Complete'),
            h('div', {
              style: { fontSize: '14px', color: palette.text || '#e2e8f0', marginTop: '8px' }
            }, 'AI guessed ' + score + ' of ' + roundsPlayed + ' (' + pct + '%)'),
            h('div', {
              style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', marginTop: '6px', lineHeight: 1.5, maxWidth: '400px', margin: '6px auto 0' }
            },
              pct >= 80 ? 'Your drawings are clear enough that AI can read your understanding. That\'s the goal.'
              : pct >= 50 ? 'Solid run. The ones the AI missed are good ones to revisit — they\'re where your mental model didn\'t make it onto the page.'
              : 'AI struggled. That\'s useful information — it tells you which concepts are still fuzzy in your head. Try again with the ones AI missed.'),
            h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px' } },
              h('button', {
                onClick: _playAgain,
                style: {
                  background: palette.accent || '#60a5fa',
                  color: palette.onAccent || '#0f172a',
                  border: 'none', borderRadius: '8px', padding: '8px 16px',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                }
              }, 'Play Again'),
              h('button', {
                onClick: _endNow,
                style: {
                  background: palette.bg || '#0f172a',
                  color: palette.text || '#e2e8f0',
                  border: '1px solid ' + (palette.border || '#334155'),
                  borderRadius: '8px', padding: '8px 16px',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                }
              }, 'Close')
            )
          )
        );
      }

      // ── Playing / review phase: the game itself ──
      var currentConcept = concepts[roundIdx % Math.max(concepts.length, 1)] || '—';
      var hasGuess = !!aiGuess;

      return h('div', { style: cardStyle },
        // Game header
        h('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px'
          }
        },
          h('div', { style: { fontSize: '11px', color: palette.textMute || '#a3a3a3', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Draw:'),
          h('div', {
            style: {
              flex: 1, minWidth: '120px',
              fontSize: '16px', fontWeight: 800,
              color: palette.text || '#e2e8f0',
              background: palette.bg || '#0f172a',
              padding: '6px 12px', borderRadius: '8px',
              border: '1px solid ' + (palette.border || '#334155')
            }
          }, currentConcept),
          h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', fontWeight: 700 } },
            'Round ' + (roundsPlayed + 1) + ' / 5'),
          h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', fontWeight: 700 } },
            'Score: ' + score)
        ),

        // Pen toolbar
        h('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '8px',
            padding: '6px 8px', background: palette.bg || '#0f172a',
            border: '1px solid ' + (palette.border || '#334155'), borderRadius: '8px'
          }
        },
          [
            { hex: '#1a202c', label: 'Black' },
            { hex: '#c53030', label: 'Red' },
            { hex: '#2b6cb0', label: 'Blue' },
            { hex: '#2f855a', label: 'Green' },
            { hex: '#dd6b20', label: 'Orange' },
            { hex: '#6b46c1', label: 'Purple' },
          ].map(function (col) {
            var active = !isEraser && penColor === col.hex;
            return h('button', {
              key: col.hex,
              onClick: function () { setPenColor(col.hex); setIsEraser(false); },
              'aria-label': col.label + ' pen' + (active ? ' (selected)' : ''),
              'aria-pressed': active ? 'true' : 'false',
              style: {
                width: '24px', height: '24px', borderRadius: '50%',
                background: col.hex,
                border: '2px solid ' + (active ? (palette.text || '#e2e8f0') : 'transparent'),
                cursor: 'pointer', padding: 0
              }
            });
          }),
          h('div', { style: { width: '1px', height: '20px', background: palette.border || '#334155', margin: '0 4px' } }),
          h('button', {
            onClick: function () { setIsEraser(!isEraser); },
            'aria-pressed': isEraser ? 'true' : 'false',
            style: {
              padding: '4px 10px', fontSize: '11px', fontWeight: 700,
              background: isEraser ? (palette.accent || '#60a5fa') : 'transparent',
              color: isEraser ? (palette.onAccent || '#0f172a') : (palette.text || '#e2e8f0'),
              border: '1px solid ' + (palette.border || '#334155'),
              borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit'
            }
          }, '✏️ Eraser'),
          h('button', {
            onClick: _undo,
            'aria-label': 'Undo',
            style: {
              padding: '4px 10px', fontSize: '11px', fontWeight: 700,
              background: 'transparent', color: palette.text || '#e2e8f0',
              border: '1px solid ' + (palette.border || '#334155'),
              borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit'
            }
          }, '↶ Undo'),
          h('button', {
            onClick: _redoStroke,
            'aria-label': 'Redo',
            style: {
              padding: '4px 10px', fontSize: '11px', fontWeight: 700,
              background: 'transparent', color: palette.text || '#e2e8f0',
              border: '1px solid ' + (palette.border || '#334155'),
              borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit'
            }
          }, '↷ Redo'),
          h('button', {
            onClick: _clear,
            'aria-label': 'Clear canvas',
            style: {
              padding: '4px 10px', fontSize: '11px', fontWeight: 700,
              background: 'transparent', color: palette.text || '#e2e8f0',
              border: '1px solid ' + (palette.border || '#334155'),
              borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit'
            }
          }, '🗑 Clear')
        ),

        // Canvas
        h('div', {
          style: {
            border: '2px solid ' + (palette.border || '#334155'),
            borderRadius: '8px', background: '#ffffff', overflow: 'hidden',
            marginBottom: '10px'
          }
        },
          h('canvas', {
            ref: canvasRef,
            width: 720, height: 480,
            'aria-label': 'Drawing canvas for the concept ' + currentConcept,
            style: {
              display: 'block', width: '100%', height: 'auto',
              maxWidth: '720px', touchAction: 'none', cursor: phase === 'playing' ? 'crosshair' : 'default'
            },
            onMouseDown: _onPointerDown,
            onMouseMove: _onPointerMove,
            onMouseUp: _onPointerUp,
            onMouseLeave: _onPointerUp,
            onTouchStart: _onPointerDown,
            onTouchMove: _onPointerMove,
            onTouchEnd: _onPointerUp,
          })
        ),

        // AI guess area
        h('div', {
          style: {
            background: palette.bg || '#0f172a',
            border: '1px solid ' + (palette.border || '#334155'),
            borderRadius: '8px', padding: '10px 12px', marginBottom: '10px',
            minHeight: '60px'
          }
        },
          aiThinking ? h('div', {
            style: { fontSize: '12px', color: palette.text || '#e2e8f0' }
          }, '🤖 AI is looking at your drawing…')
          : hasGuess ? h('div', null,
              h('div', {
                style: {
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '13px', fontWeight: 800,
                  color: aiGuess.isCorrect ? '#34d399' : '#fbbf24'
                }
              },
                h('span', null, aiGuess.isCorrect ? '✓ Correct!' : '✗ Not quite'),
                difficulty === 'hard' && aiGuess.raw !== aiGuess.matched
                  ? h('span', {
                      style: { fontSize: '10px', fontWeight: 600, color: palette.textMute || '#a3a3a3' }
                    }, '(AI said "' + aiGuess.raw + '", closest match: "' + aiGuess.matched + '")')
                  : null
              ),
              h('div', {
                style: { fontSize: '12px', color: palette.text || '#e2e8f0', marginTop: '4px' }
              }, 'AI guess: ' + aiGuess.matched + (aiGuess.confidence != null ? ' (' + aiGuess.confidence + '% confident)' : '')),
              aiGuess.reasoning ? h('div', {
                style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', marginTop: '4px', fontStyle: 'italic' }
              }, '"' + aiGuess.reasoning + '"') : null,
              !aiGuess.isCorrect ? h('div', {
                style: { fontSize: '11px', color: palette.textMute || '#a3a3a3', marginTop: '4px' }
              }, 'The concept was: ' + aiGuess.correctConcept) : null
            )
          : h('div', {
              style: { fontSize: '11px', color: palette.textMute || '#a3a3a3', fontStyle: 'italic' }
            }, 'Draw the concept, then click Ask AI to see what it thinks.')
        ),

        // Error banner
        lastError ? h('div', {
          role: 'alert',
          style: {
            fontSize: '11px', color: '#fca5a5',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '6px', padding: '6px 10px', marginBottom: '10px'
          }
        }, lastError) : null,

        // Action buttons
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' } },
          hasGuess
            ? h('button', {
                onClick: _nextRound,
                style: {
                  background: palette.accent || '#60a5fa',
                  color: palette.onAccent || '#0f172a',
                  border: 'none', borderRadius: '8px', padding: '8px 16px',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                }
              }, roundsPlayed >= 4 ? 'Finish →' : 'Next Round →')
            : h(React.Fragment, null,
                h('button', {
                  onClick: _giveUp,
                  style: {
                    background: 'transparent',
                    color: palette.text || '#e2e8f0',
                    border: '1px solid ' + (palette.border || '#334155'),
                    borderRadius: '8px', padding: '8px 14px',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit'
                  }
                }, 'Skip — reveal answer'),
                h('button', {
                  onClick: _askAI,
                  disabled: aiThinking || strokesRef.current.length === 0,
                  style: {
                    background: palette.accent || '#60a5fa',
                    color: palette.onAccent || '#0f172a',
                    border: 'none', borderRadius: '8px', padding: '8px 16px',
                    fontSize: '13px', fontWeight: 700,
                    cursor: aiThinking ? 'not-allowed' : 'pointer',
                    opacity: aiThinking ? 0.6 : 1, fontFamily: 'inherit'
                  }
                }, aiThinking ? '🤖 Thinking…' : '🤖 Ask AI')
              )
        )
      );
    }
  });
  }  // end register()
})();
