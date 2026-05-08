(function () {
  // ═══════════════════════════════════════════
  // arcade_mode_concept_atlas.js — AlloHaven Arcade plugin (Phase H solo)
  //
  // Sibling to Realm Builder + Boss Encounter. Same trading-card primitive
  // (decoration + glossary cards, action verb, written or voice
  // justification, AI rubric grade) but the OUTPUT is a labeled
  // relational graph instead of a scene or a fight:
  //
  //   FROM card + TO card + relation type
  //              + justification ("how does this card relate to that one?")
  //              → AI grade (frameAs:'atlas') {score, ackText, followUp}
  //              → directed labeled edge added to the atlas
  //              → both cards auto-added as nodes if new
  //              → milestones at 5 / 10 / 16 / 24 edges
  //
  // Pedagogy thesis: explicit relational reasoning. Where Realm Builder
  // asks "how does this card belong here?", Concept Atlas asks "how does
  // this card relate to that one?". Each play forces specificity about
  // the mechanism, direction, or condition of a relation. Strong for
  // science (causal chains, food webs), ELA (theme/character relations),
  // math (prerequisite chains), social studies (power dynamics).
  //
  // Reuses the Phase A primitive via window.AlloHavenArcade.{cardHelpers,
  // gradeCardJustification, ATLAS_VERBS}. Solo only in v1; class
  // collaboration follows the proven Realm-Builder Phase D pattern.
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
          console.warn('[arcade_mode_concept_atlas] AlloHavenArcade registry not found after 5s — plugin not registered.');
        }
      }
    }, 100);
  }

  waitForRegistry(function () {
    if (window.AlloHavenArcade.isRegistered && window.AlloHavenArcade.isRegistered('concept-atlas')) {
      return;
    }
    register();
  });

  // ── Constants ──────────────────────────────────────────────────────
  var HAND_SIZE = 5;
  var MIN_DECK_FOR_LAUNCH = 3;
  var MILESTONES = [
    { level: 1, edges: 5,  label: 'Schema',  emoji: '🧩', tokens: 2 },
    { level: 2, edges: 10, label: 'Network', emoji: '🌐', tokens: 3 },
    { level: 3, edges: 16, label: 'Map',     emoji: '🗺', tokens: 5 },
    { level: 4, edges: 24, label: 'Atlas',   emoji: '📚', tokens: 8 }
  ];

  function getAtlasVerbs() {
    return (window.AlloHavenArcade && window.AlloHavenArcade.ATLAS_VERBS) || [];
  }
  function getCardHelpers() {
    return (window.AlloHavenArcade && window.AlloHavenArcade.cardHelpers) || {};
  }
  function getGrader() {
    return window.AlloHavenArcade && window.AlloHavenArcade.gradeCardJustification;
  }

  function newAtlasId() {
    return 'atlas-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function emptyAtlas() {
    return {
      id: newAtlasId(),
      name: '',
      topic: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: [],          // [{ cardId, cardName, cardImageBase64, cardSource, addedAt, contributorNickname }]
      edges: [],          // [{ id, fromCardId, toCardId, fromCardName, toCardName, edgeType, edgeLabel, justification, score, ackText, followUp, addedAt, resonant, contributorNickname }]
      milestones: [],
      isComplete: false
    };
  }

  function register() {
    window.AlloHavenArcade.registerMode('concept-atlas', {
      label: 'Concept Atlas',
      icon: '🗺',
      blurb: 'Build a map of how concepts relate. Each card play draws a labeled edge between two cards — a structured graph of your understanding.',
      timeCost: 10,
      partnerRequired: false,
      ready: true,
      render: function (ctx) {
        var React = ctx.React || window.React;
        var session = ctx.session;
        var inActiveSession = !!(session && session.modeId === 'concept-atlas');
        if (inActiveSession) {
          return React.createElement(ConceptAtlasMain, {
            key: 'ca-' + session.startedAt,
            ctx: ctx
          });
        }
        return React.createElement(AtlasLauncherCard, { ctx: ctx });
      }
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // LAUNCHER CARD (solo only in v1)
  // ────────────────────────────────────────────────────────────────────
  function AtlasLauncherCard(props) {
    var React = window.React;
    var h = React.createElement;
    var ctx = props.ctx;
    var palette = ctx.palette || {};
    var session = ctx.session;
    var decoSize = (ctx.decorations || []).length;
    var glossSize = (ctx.glossaryEntries || []).length;
    var deckSize = decoSize + glossSize;
    var disabled = !!session;
    var minutesAsked = 10;
    var tokensCost = Math.ceil(minutesAsked / (ctx.minutesPerToken || 5));
    var canAfford = ctx.tokens >= tokensCost && deckSize >= MIN_DECK_FOR_LAUNCH;

    // In-progress local atlas? Resume path.
    var atlases = (ctx.atlases || []).filter(function (a) { return a && !a.isComplete; });
    var resumable = atlases.length > 0 ? atlases[atlases.length - 1] : null;

    function handleLaunch() {
      if (disabled) return;
      if (deckSize < MIN_DECK_FOR_LAUNCH) {
        ctx.addToast('You need at least ' + MIN_DECK_FOR_LAUNCH + ' cards to play (decorations + active glossary).');
        return;
      }
      window.__alloHavenAtlasResume = null;
      ctx.onLaunch(minutesAsked);
    }

    function handleResume() {
      if (disabled || !resumable) return;
      window.__alloHavenAtlasResume = { atlasId: resumable.id };
      ctx.onLaunch(minutesAsked);
    }

    return h('div', {
      style: {
        padding: '14px',
        background: palette.surface || '#1e293b',
        border: '1px solid ' + (palette.border || '#334155'),
        borderRadius: '10px'
      }
    },
      h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' } },
        h('span', { 'aria-hidden': 'true', style: { fontSize: '36px', lineHeight: 1 } }, '🗺'),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: '15px', fontWeight: 700, color: palette.text || '#e2e8f0', marginBottom: '3px' } },
            'Concept Atlas'),
          h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', lineHeight: '1.45' } },
            'Map how ideas relate. Pick two cards, name the relation (illuminates / connects / transforms / supports / contrasts), justify it. The atlas grows into a relational graph of your understanding.')
        )
      ),
      resumable ? h('button', {
        onClick: handleResume,
        disabled: disabled || !canAfford,
        'aria-label': 'Continue your atlas: ' + (resumable.name || resumable.topic || 'untitled'),
        style: {
          display: 'flex', gap: '12px', alignItems: 'center',
          width: '100%',
          padding: '10px 12px',
          background: 'transparent',
          border: '1.5px dashed ' + (palette.accent || '#60a5fa'),
          borderRadius: '8px',
          cursor: (disabled || !canAfford) ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          color: palette.text || '#e2e8f0',
          textAlign: 'left',
          marginBottom: '10px',
          opacity: (disabled || !canAfford) ? 0.6 : 1
        }
      },
        h('span', { 'aria-hidden': 'true', style: { fontSize: '20px' } }, '▶'),
        h('span', { style: { flex: 1 } },
          h('div', { style: { fontSize: '13px', fontWeight: 700 } },
            'Continue: ' + (resumable.name || resumable.topic || 'untitled atlas')),
          h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', marginTop: '2px' } },
            (resumable.nodes || []).length + ' nodes · ' + (resumable.edges || []).length + ' edges · ' + tokensCost + ' 🪙 to resume')
        )
      ) : null,
      h('button', {
        onClick: handleLaunch,
        disabled: disabled || !canAfford,
        'aria-label': 'Start a new atlas',
        style: {
          display: 'flex', gap: '12px', alignItems: 'center',
          width: '100%',
          padding: '10px 12px',
          background: canAfford && !disabled ? (palette.accent || '#60a5fa') : 'transparent',
          color: canAfford && !disabled ? (palette.onAccent || '#0f172a') : (palette.text || '#e2e8f0'),
          border: '1.5px solid ' + (palette.accent || '#60a5fa'),
          borderRadius: '8px',
          cursor: (disabled || !canAfford) ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          opacity: (disabled || !canAfford) ? 0.6 : 1
        }
      },
        h('span', { 'aria-hidden': 'true', style: { fontSize: '20px' } }, '🗺'),
        h('span', { style: { flex: 1 } },
          h('div', { style: { fontSize: '13px', fontWeight: 700 } }, resumable ? 'Start a new atlas' : 'Start mapping'),
          h('div', { style: { fontSize: '11px', opacity: 0.85, marginTop: '2px' } },
            tokensCost + ' 🪙 · ' + minutesAsked + ' min · ' + deckSize + ' cards in deck')
        )
      ),
      deckSize < MIN_DECK_FOR_LAUNCH ? h('div', {
        style: { fontSize: '11px', color: palette.warn || '#f59e0b', marginTop: '8px', fontStyle: 'italic', lineHeight: '1.45' }
      }, 'You need at least ' + MIN_DECK_FOR_LAUNCH + ' cards to map. Earn decorations or generate a unit glossary first.') : null
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // ACTIVE BUILD COMPONENT
  // ────────────────────────────────────────────────────────────────────
  function ConceptAtlasMain(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useRef = React.useRef;
    var useMemo = React.useMemo;

    var ctx = props.ctx;
    var palette = ctx.palette || {};
    var verbs = getAtlasVerbs();
    var helpers = getCardHelpers();
    var grader = getGrader();
    var nickname = ctx.studentNickname || 'Student';

    // Resume sentinel
    var resumeRef = useRef(null);
    if (resumeRef.current === null) {
      resumeRef.current = window.__alloHavenAtlasResume || null;
      window.__alloHavenAtlasResume = null;
    }
    var resumeId = resumeRef.current && resumeRef.current.atlasId;
    var hostAtlases = ctx.atlases || [];
    var hydrate = resumeId ? hostAtlases.filter(function (a) { return a.id === resumeId; })[0] : null;

    // Deck — same shape as Realm Builder / Boss Encounter
    var deck = useMemo(function () {
      var decoCards = (ctx.decorations || []).map(helpers.decorationToCard || function () { return null; })
        .filter(function (c) { return !!c; });
      var glossCards = (ctx.glossaryEntries || []).map(function (g, i) {
        return helpers.glossaryEntryToCard ? helpers.glossaryEntryToCard(g, i) : null;
      }).filter(function (c) { return !!c; });
      return decoCards.concat(glossCards);
    }, []); // eslint-disable-line

    // Atlas state
    var atlasTuple = useState(function () {
      if (hydrate) return JSON.parse(JSON.stringify(hydrate));
      return emptyAtlas();
    });
    var atlas = atlasTuple[0];
    var setAtlas = atlasTuple[1];

    // Phase machine: 'topic' | 'play' | 'complete'
    // No 'gen-canvas' phase — atlas has no canvas to generate.
    var phaseTuple = useState(function () {
      if (hydrate && hydrate.topic) return 'play';
      return 'topic';
    });
    var phase = phaseTuple[0];
    var setPhase = phaseTuple[1];

    var topicDraftTuple = useState(atlas.topic || '');
    var topicDraft = topicDraftTuple[0];
    var setTopicDraft = topicDraftTuple[1];

    var nameDraftTuple = useState(atlas.name || '');
    var nameDraft = nameDraftTuple[0];
    var setNameDraft = nameDraftTuple[1];

    // Per-edge UI state
    var fromCardTuple = useState(null);
    var fromCard = fromCardTuple[0];
    var setFromCard = fromCardTuple[1];

    var toCardTuple = useState(null);
    var toCard = toCardTuple[0];
    var setToCard = toCardTuple[1];

    var pickedVerbTuple = useState(null);
    var pickedVerb = pickedVerbTuple[0];
    var setPickedVerb = pickedVerbTuple[1];

    var justificationTuple = useState('');
    var justification = justificationTuple[0];
    var setJustification = justificationTuple[1];

    var submittingTuple = useState(false);
    var submitting = submittingTuple[0];
    var setSubmitting = submittingTuple[1];

    var lastFeedbackTuple = useState(null);
    var lastFeedback = lastFeedbackTuple[0];
    var setLastFeedback = lastFeedbackTuple[1];

    // ── Voice state (Phase G parity) ──
    var voiceModeTuple = useState('idle');
    var voiceMode = voiceModeTuple[0];
    var setVoiceMode = voiceModeTuple[1];
    var voiceElapsedTuple = useState(0);
    var voiceElapsed = voiceElapsedTuple[0];
    var setVoiceElapsed = voiceElapsedTuple[1];
    var voiceErrorTuple = useState(null);
    var voiceError = voiceErrorTuple[0];
    var setVoiceError = voiceErrorTuple[1];
    var voiceRecorderRef = useRef(null);
    var voiceLiveRef = useRef(null);
    useEffect(function () {
      return function () {
        if (voiceRecorderRef.current) {
          try { voiceRecorderRef.current.cancel(); } catch (e) { /* ignore */ }
          voiceRecorderRef.current = null;
        }
        if (voiceLiveRef.current) {
          try { voiceLiveRef.current.stop(); } catch (e) { /* ignore */ }
          voiceLiveRef.current = null;
        }
      };
    }, []);

    // Hand
    var handTuple = useState(function () {
      var d = deck.slice();
      shuffleInPlace(d);
      return d.slice(0, HAND_SIZE);
    });
    var hand = handTuple[0];
    var setHand = handTuple[1];

    function shuffleInPlace(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
    function refreshHand() {
      var d = deck.slice();
      shuffleInPlace(d);
      setHand(d.slice(0, HAND_SIZE));
    }

    // Persistence — every atlas change syncs to host
    useEffect(function () {
      if (typeof ctx.onAtlasUpdate === 'function') {
        ctx.onAtlasUpdate(atlas);
      }
    }, [atlas]); // eslint-disable-line

    // ──────────────────────────────────────────────────────────────────
    // VOICE HELPERS (mirror Phase G)
    // ──────────────────────────────────────────────────────────────────
    function resolveVoiceEngine() {
      if (!window.AlloFlowVoice) return 'off';
      var prefs = window.AlloFlowVoice.loadPreference
        ? window.AlloFlowVoice.loadPreference()
        : { engine: 'auto' };
      var engine = prefs.engine || 'auto';
      var caps = window.AlloFlowVoice.getCapabilities
        ? window.AlloFlowVoice.getCapabilities()
        : { webSpeech: false, mediaRecorder: false, whisperLoaded: false };
      if (engine === 'auto') {
        if (caps.whisperLoaded) return 'whisper';
        if (typeof ctx.callGeminiAudio === 'function') return 'gemini';
        if (caps.webSpeech) return 'webspeech';
        return 'off';
      }
      if (engine === 'best') engine = 'whisper';
      if (engine === 'fast') engine = 'webspeech';
      if (engine === 'whisper' && !caps.whisperLoaded) {
        return caps.webSpeech ? 'webspeech' : 'off';
      }
      if (engine === 'gemini' && typeof ctx.callGeminiAudio !== 'function') {
        return caps.webSpeech ? 'webspeech' : 'off';
      }
      if (engine === 'webspeech' && !caps.webSpeech) {
        return 'off';
      }
      return engine;
    }
    function startWebSpeechLive() {
      if (!window.AlloFlowVoice || typeof window.AlloFlowVoice.initWebSpeechCapture !== 'function') {
        ctx.addToast('Voice capture not supported in this browser.');
        return;
      }
      var lastFinal = '';
      var controller = window.AlloFlowVoice.initWebSpeechCapture({
        lang: 'en-US', continuous: true, interimResults: false,
        onTranscript: function (text) {
          var t = (text || '').trim();
          if (!t || t === lastFinal) return;
          lastFinal = t;
          setJustification(function (prev) {
            var existing = (prev || '').trim();
            return existing ? existing + ' ' + t : t;
          });
        },
        onError: function (e) { setVoiceError(e && e.error ? e.error : 'Voice error'); stopVoiceLive(); },
        onEnd: function () { if (voiceLiveRef.current === controller) { voiceLiveRef.current = null; setVoiceMode('idle'); } }
      });
      if (!controller.supported) { ctx.addToast('Voice capture not supported in this browser.'); return; }
      if (!controller.start()) { ctx.addToast('Could not start voice capture.'); return; }
      voiceLiveRef.current = controller;
      setVoiceError(null);
      setVoiceMode('webspeech-live');
    }
    function stopVoiceLive() {
      if (voiceLiveRef.current) { try { voiceLiveRef.current.stop(); } catch (e) { /* ignore */ } voiceLiveRef.current = null; }
      setVoiceMode('idle');
    }
    function startRecordAndTranscribe(engine) {
      if (!window.AlloFlowVoice || typeof window.AlloFlowVoice.recordAudioBlob !== 'function') {
        ctx.addToast('Audio recording not available.'); return;
      }
      setVoiceError(null);
      setVoiceElapsed(0);
      var controller = window.AlloFlowVoice.recordAudioBlob({
        maxDurationMs: 60 * 1000,
        onTick: function (ms) { setVoiceElapsed(ms); },
        onError: function (err) { setVoiceError((err && err.message) || 'Recording failed'); voiceRecorderRef.current = null; setVoiceMode('idle'); }
      });
      if (!controller.supported) { ctx.addToast('Microphone not supported in this browser.'); return; }
      voiceRecorderRef.current = controller;
      setVoiceMode('recording');
      controller.result.then(function (rec) {
        voiceRecorderRef.current = null;
        if (!rec || !rec.base64) { setVoiceMode('idle'); return; }
        setVoiceMode('transcribing');
        return window.AlloFlowVoice.transcribeAudio(rec.base64, {
          engine: engine,
          mimeType: rec.mimeType || 'audio/webm',
          callGeminiAudio: ctx.callGeminiAudio
        });
      }).then(function (out) {
        if (!out) return;
        var transcript = (out.transcript || '').trim();
        if (!transcript) { setVoiceError('No speech detected — try recording again.'); setVoiceMode('idle'); return; }
        setJustification(function (prev) {
          var existing = (prev || '').trim();
          return existing ? existing + ' ' + transcript : transcript;
        });
        setVoiceMode('idle');
      }).catch(function (err) {
        if (err && err.message === 'cancelled') { setVoiceMode('idle'); return; }
        setVoiceError((err && err.message) || 'Transcription failed');
        setVoiceMode('idle');
      });
    }
    function startVoice() {
      var engine = resolveVoiceEngine();
      if (engine === 'off') { ctx.addToast('Voice input is off in Settings → Voice quality.'); return; }
      if (engine === 'webspeech') { startWebSpeechLive(); return; }
      startRecordAndTranscribe(engine);
    }
    function stopVoice() {
      if (voiceMode === 'webspeech-live') { stopVoiceLive(); return; }
      if (voiceMode === 'recording' && voiceRecorderRef.current) {
        try { voiceRecorderRef.current.stop(); } catch (e) { /* ignore */ }
      }
    }
    function cancelVoice() {
      if (voiceMode === 'webspeech-live') { stopVoiceLive(); return; }
      if (voiceRecorderRef.current) {
        try { voiceRecorderRef.current.cancel(); } catch (e) { /* ignore */ }
        voiceRecorderRef.current = null;
      }
      setVoiceMode('idle');
    }

    // ──────────────────────────────────────────────────────────────────
    // PHASE: TOPIC
    // ──────────────────────────────────────────────────────────────────
    function startNewAtlas() {
      var topic = (topicDraft || '').trim();
      var name = (nameDraft || '').trim() || topic;
      if (topic.length < 2) {
        ctx.addToast('Give your atlas a topic — what concept space are you mapping?');
        return;
      }
      setAtlas(function (prev) {
        return Object.assign({}, prev, {
          topic: topic, name: name, updatedAt: new Date().toISOString()
        });
      });
      setPhase('play');
    }

    // ──────────────────────────────────────────────────────────────────
    // PHASE: PLAY — submit an edge
    // ──────────────────────────────────────────────────────────────────
    function submitEdge() {
      if (!fromCard || !toCard) {
        ctx.addToast('Pick a FROM card and a TO card first.');
        return;
      }
      if (fromCard.id === toCard.id) {
        ctx.addToast('FROM and TO must be different cards.');
        return;
      }
      if (!pickedVerb) {
        ctx.addToast('Pick a relation type first.');
        return;
      }
      var text = (justification || '').trim();
      if (text.length < 10) {
        ctx.addToast('Write at least a sentence about how these two cards relate.');
        return;
      }
      if (typeof grader !== 'function') {
        ctx.addToast('AI grader unavailable. Try again later.');
        return;
      }
      setSubmitting(true);

      grader(ctx, {
        card: fromCard,
        partnerCard: toCard,
        verb: pickedVerb,
        justification: text,
        topic: atlas.topic,
        frameAs: 'atlas',
        context: { existingEdgeCount: (atlas.edges || []).length }
      }).then(function (parsed) {
        applyEdge(parsed);
      }).catch(function (err) {
        setSubmitting(false);
        ctx.addToast('Grading failed: ' + ((err && err.message) || 'unknown'));
      });
    }

    function ensureNode(card, prevNodes, nowIso) {
      // Idempotent — adds the card as a node if not already present.
      // Returns the (possibly extended) nodes array.
      if (!card) return prevNodes;
      var found = prevNodes.some(function (n) { return n.cardId === card.id; });
      if (found) return prevNodes;
      return prevNodes.concat([{
        cardId: card.id,
        cardName: card.name,
        cardImageBase64: card.imageBase64 || null,
        cardSource: card.source,
        addedAt: nowIso,
        contributorNickname: nickname
      }]);
    }

    function applyEdge(parsed) {
      var score = parsed.score || 1;
      var isResonant = score >= 18;
      var nowIso = new Date().toISOString();
      var newEdge = {
        id: 'edge-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        fromCardId: fromCard.id,
        fromCardName: fromCard.name,
        toCardId: toCard.id,
        toCardName: toCard.name,
        edgeType: pickedVerb.id,
        edgeLabel: pickedVerb.label,
        justification: justification.trim(),
        score: score,
        ackText: parsed.ackText || '',
        followUp: parsed.followUp || '',
        addedAt: nowIso,
        resonant: isResonant,
        contributorNickname: nickname
      };

      var nextEdgeCount = (atlas.edges || []).length + 1;
      var alreadyLevels = (atlas.milestones || []).map(function (m) { return m.level; });
      var newMilestones = MILESTONES.filter(function (m) {
        return nextEdgeCount >= m.edges && alreadyLevels.indexOf(m.level) === -1;
      }).map(function (m) {
        return { level: m.level, label: m.label, emoji: m.emoji, edges: m.edges, achievedAt: nowIso, tokensAwarded: m.tokens };
      });
      if (newMilestones.length > 0 && typeof ctx.onAwardTokens === 'function') {
        newMilestones.forEach(function (m) {
          ctx.onAwardTokens(m.tokens, 'atlas-milestone', { atlasId: atlas.id, level: m.level });
          ctx.addToast(m.emoji + ' ' + m.label + ' unlocked · +' + m.tokens + ' 🪙');
        });
      }
      var isComplete = atlas.isComplete || nextEdgeCount >= MILESTONES[MILESTONES.length - 1].edges;

      setAtlas(function (prev) {
        var nodes = prev.nodes || [];
        nodes = ensureNode(fromCard, nodes, nowIso);
        nodes = ensureNode(toCard, nodes, nowIso);
        return Object.assign({}, prev, {
          nodes: nodes,
          edges: (prev.edges || []).concat([newEdge]),
          milestones: (prev.milestones || []).concat(newMilestones),
          isComplete: isComplete,
          updatedAt: nowIso
        });
      });

      setLastFeedback({
        score: score,
        ackText: parsed.ackText || '',
        followUp: parsed.followUp || '',
        fromCardName: fromCard.name,
        toCardName: toCard.name,
        verbLabel: pickedVerb.label,
        resonant: isResonant
      });

      // Reset turn UI — keep verb sticky so students can chain similar
      // relations quickly; explicit "different verb" click resets it.
      setFromCard(null);
      setToCard(null);
      setJustification('');
      setSubmitting(false);
      refreshHand();
    }

    function endAtlas() {
      var nowIso = new Date().toISOString();
      setAtlas(function (prev) { return Object.assign({}, prev, { isComplete: true, updatedAt: nowIso }); });
      setPhase('complete');
    }

    function closeArcade() {
      if (typeof ctx.onClose === 'function') ctx.onClose();
    }

    // ──────────────────────────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────────────────────────
    function renderHeader() {
      return h('div', {
        style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }
      },
        h('span', { 'aria-hidden': 'true', style: { fontSize: '28px' } }, '🗺'),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('h2', { style: { margin: 0, fontSize: '17px', fontWeight: 700, color: palette.text || '#e2e8f0' } },
            atlas.name || atlas.topic || 'New atlas'),
          atlas.topic ? h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1' } },
            (atlas.nodes || []).length + ' node' + ((atlas.nodes || []).length === 1 ? '' : 's')
            + ' · ' + (atlas.edges || []).length + ' edge' + ((atlas.edges || []).length === 1 ? '' : 's')
            + ((atlas.milestones || []).length > 0 ? ' · last milestone: ' + atlas.milestones[atlas.milestones.length - 1].label : '')
          ) : null
        ),
        phase === 'play' ? h('button', {
          onClick: endAtlas,
          'aria-label': 'Wrap up this atlas',
          style: { background: 'transparent', color: palette.textDim || '#cbd5e1', border: '1px solid ' + (palette.border || '#334155'), borderRadius: '8px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }
        }, 'Wrap up') : null,
        h('button', {
          onClick: closeArcade,
          'aria-label': 'Close arcade',
          style: { background: 'transparent', color: palette.textDim || '#cbd5e1', border: '1px solid ' + (palette.border || '#334155'), borderRadius: '8px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }
        }, '✕ Close')
      );
    }

    function renderTopicPhase() {
      return h('div', { style: { padding: '12px' } },
        renderHeader(),
        h('div', { style: { padding: '20px 16px', background: palette.surface || '#1e293b', border: '1px solid ' + (palette.border || '#334155'), borderRadius: '10px' } },
          h('h3', { style: { margin: '0 0 10px 0', color: palette.text || '#e2e8f0', fontSize: '15px', fontWeight: 700 } },
            'What concept space are you mapping?'),
          h('p', { style: { margin: '0 0 14px 0', color: palette.textDim || '#cbd5e1', fontSize: '12px', lineHeight: '1.55' } },
            'A topic, system, era, or domain. Examples: "the cell", "ancient Rome", "the water cycle", "the immune system", "Newton\'s laws".'),
          h('label', { htmlFor: 'ca-topic', style: { display: 'block', fontSize: '10px', fontWeight: 700, color: palette.textMute || palette.textDim || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' } }, 'Topic'),
          h('input', {
            id: 'ca-topic',
            type: 'text',
            value: topicDraft,
            onChange: function (e) { setTopicDraft(e.target.value.slice(0, 80)); },
            placeholder: 'the topic of your atlas',
            autoFocus: true,
            style: { width: '100%', padding: '8px 10px', fontSize: '13px', fontFamily: 'inherit', color: palette.text || '#e2e8f0', background: palette.bg || '#0f172a', border: '1px solid ' + (palette.border || '#334155'), borderRadius: '6px', boxSizing: 'border-box', marginBottom: '12px' }
          }),
          h('label', { htmlFor: 'ca-name', style: { display: 'block', fontSize: '10px', fontWeight: 700, color: palette.textMute || palette.textDim || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' } }, 'Atlas name (optional)'),
          h('input', {
            id: 'ca-name',
            type: 'text',
            value: nameDraft,
            onChange: function (e) { setNameDraft(e.target.value.slice(0, 80)); },
            placeholder: 'leave blank to use the topic',
            style: { width: '100%', padding: '8px 10px', fontSize: '13px', fontFamily: 'inherit', color: palette.text || '#e2e8f0', background: palette.bg || '#0f172a', border: '1px solid ' + (palette.border || '#334155'), borderRadius: '6px', boxSizing: 'border-box', marginBottom: '14px' }
          }),
          h('button', {
            onClick: startNewAtlas,
            disabled: topicDraft.trim().length < 2,
            style: { padding: '8px 16px', fontSize: '13px', fontWeight: 700, background: palette.accent || '#60a5fa', color: palette.onAccent || '#0f172a', border: 'none', borderRadius: '8px', cursor: topicDraft.trim().length < 2 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: topicDraft.trim().length < 2 ? 0.6 : 1 }
          }, '🗺 Begin mapping →')
        )
      );
    }

    function renderCard(card, opts) {
      opts = opts || {};
      var picked = !!opts.picked;
      var onClick = opts.onClick || function () {};
      return h('button', {
        key: 'card-' + card.id + (opts.suffix || ''),
        onClick: onClick,
        'aria-label': (picked ? 'Selected: ' : 'Pick: ') + card.name + (card.tier ? ' (' + card.tier + ')' : ''),
        'aria-pressed': picked ? 'true' : 'false',
        style: {
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          padding: '6px',
          width: '92px',
          background: picked ? (palette.accent || '#60a5fa') : (palette.surface || '#1e293b'),
          color: picked ? (palette.onAccent || '#0f172a') : (palette.text || '#e2e8f0'),
          border: '1.5px solid ' + (picked ? (palette.accent || '#60a5fa') : (palette.border || '#334155')),
          borderRadius: '8px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          flexShrink: 0
        }
      },
        card.imageBase64 ? h('img', {
          src: card.imageBase64, alt: '', 'aria-hidden': 'true',
          style: { width: '64px', height: '64px', objectFit: 'cover', borderRadius: '4px', border: '1px solid ' + (palette.border || '#334155') }
        }) : h('div', { 'aria-hidden': 'true', style: { width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', background: palette.bg || '#0f172a', borderRadius: '4px', border: '1px solid ' + (palette.border || '#334155') } },
          card.source === 'glossary' ? '📖' : '🎴'),
        h('div', { style: { fontSize: '10px', fontWeight: 700, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' } },
          card.name)
      );
    }

    // Combined picker source: existing nodes (so students can re-use already-placed
    // concepts) + current hand (to add new cards as nodes).
    function pickerSourceList() {
      var nodeCards = (atlas.nodes || []).map(function (n) {
        return {
          id: n.cardId, name: n.cardName, source: n.cardSource,
          imageBase64: n.cardImageBase64, conceptDef: null, tier: null, raw: n,
          _existingNode: true
        };
      });
      // Avoid duplicates between existing nodes and hand
      var nodeIds = {};
      nodeCards.forEach(function (c) { nodeIds[c.id] = true; });
      var freshHand = hand.filter(function (c) { return !nodeIds[c.id]; });
      return { nodes: nodeCards, hand: freshHand };
    }

    function renderPickerStrip(label, picked, onPick, excludeId) {
      var src = pickerSourceList();
      function cellsFor(arr, suffix) {
        return arr.filter(function (c) { return !excludeId || c.id !== excludeId; })
                  .map(function (c) {
                    return renderCard(c, {
                      suffix: suffix,
                      picked: picked && picked.id === c.id,
                      onClick: function () { onPick(c); }
                    });
                  });
      }
      return h('div', { style: { marginBottom: '10px' } },
        h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.textMute || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' } }, label),
        // Existing nodes row (only when there are any)
        src.nodes.length > 0 ? h('div', null,
          h('div', { style: { fontSize: '10px', color: palette.textMute || '#94a3b8', fontStyle: 'italic', marginBottom: '4px' } },
            'In your atlas:'),
          h('div', {
            role: 'group', 'aria-label': 'Existing nodes',
            style: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px' }
          }, cellsFor(src.nodes, '-node'))
        ) : null,
        // Hand row
        h('div', null,
          h('div', { style: { fontSize: '10px', color: palette.textMute || '#94a3b8', fontStyle: 'italic', marginBottom: '4px' } },
            src.nodes.length > 0 ? 'New cards from your hand:' : 'Your hand:'),
          h('div', {
            role: 'group', 'aria-label': 'Hand of cards',
            style: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }
          }, cellsFor(src.hand, '-hand'))
        )
      );
    }

    function renderPlayPhase() {
      var canSubmit = !!fromCard && !!toCard && fromCard.id !== toCard.id
                    && !!pickedVerb && (justification || '').trim().length >= 10
                    && !submitting && voiceMode !== 'transcribing';
      return h('div', { style: { padding: '12px' } },
        renderHeader(),
        // Last-feedback callout
        lastFeedback ? h('div', {
          role: 'status', 'aria-live': 'polite',
          style: {
            padding: '10px 12px', marginBottom: '12px',
            background: lastFeedback.resonant ? (palette.accent + '22' || 'rgba(96,165,250,0.18)') : (palette.surface || '#1e293b'),
            border: '1.5px solid ' + (lastFeedback.resonant ? (palette.accent || '#60a5fa') : (palette.border || '#334155')),
            borderRadius: '10px',
            color: palette.text || '#e2e8f0'
          }
        },
          h('div', { style: { fontSize: '11px', fontWeight: 700, color: lastFeedback.resonant ? (palette.accent || '#60a5fa') : (palette.textMute || '#94a3b8'), textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' } },
            (lastFeedback.resonant ? '🌟 Resonant relation · ' : '') +
            'Score ' + lastFeedback.score + '/20 · ' +
            lastFeedback.fromCardName + ' — ' + lastFeedback.verbLabel + ' → ' + lastFeedback.toCardName),
          lastFeedback.ackText ? h('p', { style: { margin: '0 0 6px 0', fontSize: '13px', lineHeight: '1.5' } }, lastFeedback.ackText) : null,
          lastFeedback.followUp ? h('p', { style: { margin: 0, fontSize: '12px', fontStyle: 'italic', color: palette.textDim || '#cbd5e1' } }, '💭 ' + lastFeedback.followUp) : null
        ) : null,
        // Step 1: FROM card
        renderPickerStrip('1. From card', fromCard, function (c) { setFromCard(c); }, toCard ? toCard.id : null),
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' } },
          h('button', {
            onClick: refreshHand,
            'aria-label': 'Shuffle hand',
            style: { background: 'transparent', color: palette.textDim || '#cbd5e1', border: '1px solid ' + (palette.border || '#334155'), borderRadius: '6px', padding: '2px 8px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' }
          }, '↻ Shuffle hand')
        ),
        // Step 2: TO card
        renderPickerStrip('2. To card', toCard, function (c) { setToCard(c); }, fromCard ? fromCard.id : null),
        // Step 3: relation type
        h('div', { style: { marginBottom: '10px' } },
          h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.textMute || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' } },
            '3. Relation type'),
          h('div', { role: 'radiogroup', 'aria-label': 'Atlas relation',
            style: { display: 'flex', flexWrap: 'wrap', gap: '6px' }
          },
            verbs.map(function (v) {
              var active = pickedVerb && pickedVerb.id === v.id;
              return h('button', {
                key: 'av-' + v.id,
                role: 'radio',
                'aria-checked': active ? 'true' : 'false',
                onClick: function () { setPickedVerb(v); },
                style: {
                  padding: '6px 12px', fontSize: '12px', fontFamily: 'inherit',
                  background: active ? (palette.accent || '#60a5fa') : 'transparent',
                  color: active ? (palette.onAccent || '#0f172a') : (palette.text || '#e2e8f0'),
                  border: '1.5px solid ' + (active ? (palette.accent || '#60a5fa') : (palette.border || '#334155')),
                  borderRadius: '999px',
                  cursor: 'pointer'
                }
              }, v.emoji + ' ' + v.label);
            })
          ),
          pickedVerb ? h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', fontStyle: 'italic', marginTop: '4px' } },
            (fromCard ? fromCard.name : 'FROM') + ' — ' + pickedVerb.label.toLowerCase() + ' → ' + (toCard ? toCard.name : 'TO') + '. ' + pickedVerb.hint
          ) : null
        ),
        // Step 4: justification (with voice button)
        h('div', { style: { marginBottom: '10px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' } },
            h('label', { htmlFor: 'ca-just',
              style: { fontSize: '11px', fontWeight: 700, color: palette.textMute || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }
            }, '4. Justify the relation'),
            (function () {
              var engine = resolveVoiceEngine();
              if (engine === 'off') return null;
              var label, click, busy = false;
              if (voiceMode === 'idle') { label = '🎤 Speak'; click = startVoice; }
              else if (voiceMode === 'webspeech-live') { label = '⏹ Stop · listening'; click = stopVoice; busy = true; }
              else if (voiceMode === 'recording') {
                var sec = Math.floor((voiceElapsed || 0) / 1000);
                label = '⏹ Stop · ' + sec + 's'; click = stopVoice; busy = true;
              } else { label = '… transcribing'; click = null; busy = true; }
              return h('div', { style: { display: 'flex', gap: '4px', alignItems: 'center' } },
                voiceMode === 'recording' ? h('button', {
                  onClick: cancelVoice,
                  'aria-label': 'Cancel voice recording',
                  style: { background: 'transparent', color: palette.textDim || '#cbd5e1', border: '1px solid ' + (palette.border || '#334155'), borderRadius: '999px', padding: '3px 10px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit' }
                }, 'Cancel') : null,
                h('button', {
                  onClick: click || function () {},
                  disabled: !click,
                  'aria-label': voiceMode === 'idle' ? 'Speak your justification' : label,
                  'aria-busy': busy ? 'true' : 'false',
                  style: {
                    background: voiceMode === 'idle' ? 'transparent' : (palette.accent + '22' || 'rgba(96,165,250,0.18)'),
                    color: voiceMode === 'idle' ? (palette.text || '#e2e8f0') : (palette.accent || '#60a5fa'),
                    border: '1px solid ' + (voiceMode === 'idle' ? (palette.border || '#334155') : (palette.accent || '#60a5fa')),
                    borderRadius: '999px',
                    padding: '4px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: click ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit'
                  }
                }, label)
              );
            })()
          ),
          h('textarea', {
            id: 'ca-just',
            value: justification,
            onChange: function (e) { setJustification(e.target.value.slice(0, 600)); },
            placeholder: pickedVerb
              ? 'How does ' + (fromCard ? fromCard.name : 'X') + ' ' + pickedVerb.label.toLowerCase() + ' ' + (toCard ? toCard.name : 'Y') + '? Be specific about the mechanism, direction, or condition.'
              : 'How do these two cards relate?',
            rows: 3,
            disabled: submitting || voiceMode === 'transcribing',
            'aria-busy': voiceMode === 'transcribing' ? 'true' : 'false',
            style: { width: '100%', padding: '8px 10px', fontSize: '13px', fontFamily: 'inherit', color: palette.text || '#e2e8f0', background: palette.bg || '#0f172a', border: '1px solid ' + (palette.border || '#334155'), borderRadius: '6px', boxSizing: 'border-box', lineHeight: '1.5', resize: 'vertical' }
          }),
          h('div', { style: { fontSize: '10px', color: palette.textMute || '#94a3b8', marginTop: '4px' } },
            justification.length + ' / 600 · need ≥ 10 chars to submit'),
          voiceError ? h('div', {
            role: 'alert',
            style: { fontSize: '10px', color: '#dc2626', marginTop: '4px', fontStyle: 'italic' }
          }, '🎤 ' + voiceError) : null
        ),
        // Submit
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: '8px' } },
          h('button', {
            onClick: submitEdge,
            disabled: !canSubmit,
            'aria-busy': submitting ? 'true' : 'false',
            style: {
              padding: '8px 18px', fontSize: '13px', fontWeight: 700,
              background: canSubmit ? (palette.accent || '#60a5fa') : 'transparent',
              color: canSubmit ? (palette.onAccent || '#0f172a') : (palette.textDim || '#cbd5e1'),
              border: '1.5px solid ' + (palette.accent || '#60a5fa'),
              borderRadius: '8px',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              opacity: canSubmit ? 1 : 0.6
            }
          }, submitting ? 'Grading…' : '🗺 Add edge to atlas')
        ),
        // Edges-so-far recap (with resonant edges flagged 🌟)
        (atlas.edges || []).length > 0 ? h('div', { style: { marginTop: '14px', padding: '10px 12px', background: palette.surface || '#1e293b', border: '1px solid ' + (palette.border || '#334155'), borderRadius: '8px' } },
          h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.textMute || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' } },
            'Edges in your atlas · ' + atlas.edges.length),
          h('ul', {
            role: 'list',
            style: { display: 'flex', flexDirection: 'column', gap: '4px', margin: 0, padding: 0, listStyle: 'none', maxHeight: '200px', overflowY: 'auto' }
          },
            atlas.edges.slice().reverse().slice(0, 8).map(function (e) {
              return h('li', { key: 'er-' + e.id, role: 'listitem', style: { listStyle: 'none', fontSize: '11px', color: palette.textDim || '#cbd5e1', display: 'flex', gap: '6px', alignItems: 'center' } },
                e.resonant ? h('span', null, '🌟') : h('span', null, '·'),
                h('strong', { style: { color: palette.text || '#e2e8f0' } }, e.fromCardName),
                h('span', null, ' — ' + e.edgeLabel + ' →'),
                h('strong', { style: { color: palette.text || '#e2e8f0' } }, ' ' + e.toCardName),
                h('span', { style: { marginLeft: 'auto', fontVariantNumeric: 'tabular-nums', color: palette.textMute || '#94a3b8' } }, e.score + '/20')
              );
            })
          ),
          atlas.edges.length > 8 ? h('div', { style: { fontSize: '10px', color: palette.textMute || '#94a3b8', marginTop: '4px', fontStyle: 'italic' } }, 'showing newest 8 — full list in print packet') : null
        ) : null
      );
    }

    function renderCompletePhase() {
      var resonantCount = (atlas.edges || []).filter(function (e) { return e.score >= 18; }).length;
      var canPrint = typeof ctx.onPrintAtlas === 'function';
      function printAtlas() { if (canPrint) ctx.onPrintAtlas(atlas.id); }
      return h('div', { style: { padding: '12px' } },
        renderHeader(),
        h('div', { style: { padding: '20px 16px', background: palette.surface || '#1e293b', border: '1.5px solid ' + (palette.accent || '#60a5fa'), borderRadius: '10px', textAlign: 'center' } },
          h('div', { style: { fontSize: '48px', marginBottom: '12px' } }, '🗺'),
          h('h3', { style: { margin: '0 0 8px 0', color: palette.text || '#e2e8f0', fontSize: '17px', fontWeight: 700 } },
            'Atlas wrapped'),
          h('p', { style: { margin: '0 0 14px 0', color: palette.textDim || '#cbd5e1', fontSize: '13px', lineHeight: '1.55' } },
            'You mapped ' + (atlas.nodes || []).length + ' concept' + ((atlas.nodes || []).length === 1 ? '' : 's')
            + ' and drew ' + (atlas.edges || []).length + ' edge' + ((atlas.edges || []).length === 1 ? '' : 's')
            + ' across "' + atlas.topic + '"'
            + (resonantCount > 0 ? ' · 🌟 ' + resonantCount + ' resonant relation' + (resonantCount === 1 ? '' : 's') : '')
            + '. Reopen this atlas any time from the Memory Overview to keep mapping.'),
          h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' } },
            canPrint ? h('button', {
              onClick: printAtlas,
              'aria-label': 'Print this atlas',
              style: { padding: '8px 18px', fontSize: '13px', fontWeight: 700, background: 'transparent', color: palette.text || '#e2e8f0', border: '1.5px solid ' + (palette.border || '#334155'), borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }
            }, '🖨 Print this atlas') : null,
            h('button', {
              onClick: closeArcade,
              style: { padding: '8px 18px', fontSize: '13px', fontWeight: 700, background: palette.accent || '#60a5fa', color: palette.onAccent || '#0f172a', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }
            }, 'Back to your room')
          )
        )
      );
    }

    if (phase === 'topic')    return renderTopicPhase();
    if (phase === 'complete') return renderCompletePhase();
    return renderPlayPhase();
  }

  if (typeof console !== 'undefined') {
    console.log('[CDN] arcade_mode_concept_atlas loaded');
  }
})();
