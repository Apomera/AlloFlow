(function () {
  // ═══════════════════════════════════════════
  // arcade_mode_boss_encounter.js — AlloHaven Arcade plugin (Phase 3b solo)
  //
  // Cooperative-cousin to the planned class-vs-AI Boss Encounter.
  // This file ships the SOLO version first: a single student plays
  // their personal deck (AlloHaven decorations) against an AI-
  // generated boss tied to a topic. Validates the entire mechanic
  // (card play → action verb → justification → AI grade → boss damage
  // → win/loss) without needing Firestore live-session sync.
  //
  // Live class mode is a follow-up that wraps the same plugin with
  // session sync; image-to-image scene transformation + theme
  // registers (fantasy / sci-fi / plain) are Phase 3b.5 polish.
  //
  // Plugin contract: window.AlloHavenArcade.registerMode (mirrors
  // window.StemLab.registerTool). render(ctx) returns either:
  //   - the launcher card (when no Boss Encounter session is active)
  //   - the active encounter UI (when ctx.session.modeId === 'boss-encounter')
  //
  // Internal encounter state lives in a wrapper React component so
  // hooks-rules-of-hooks holds across the arcade hub's re-renders.
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
          console.warn('[arcade_mode_boss_encounter] AlloHavenArcade registry not found after 5s — plugin not registered.');
        }
      }
    }, 100);
  }

  waitForRegistry(function () {
    if (window.AlloHavenArcade.isRegistered && window.AlloHavenArcade.isRegistered('boss-encounter')) {
      return;
    }
    register();
  });

  // STEAM Spark verb set — universal across fantasy / sci-fi / plain registers.
  // Each Spark verb shapes the AI grader's framing of the action; mechanically
  // they all roll the same 1–20 score, but the verb gives the student a way to
  // declare INTENT before justifying.
  //
  // The `editPrompt` field is used by Phase 3b.5 for image-to-image scene
  // transformation on critical Sparks (score 18-20). Injected into a larger
  // prompt that ties the transformation back to the topic + card.
  var SPARK_VERBS = [
    { id: 'illuminate', label: 'Illuminate', emoji: '💡', hint: 'Reveal something hidden about the topic.',
      editPrompt: 'brighter, with warm light emerging from within, hidden details revealed' },
    { id: 'connect',    label: 'Connect',    emoji: '🔗', hint: 'Bridge this card to a different idea or example.',
      editPrompt: 'with new threads of glowing light linking outward, connecting to surrounding ideas' },
    { id: 'transform',  label: 'Transform',  emoji: '✨', hint: 'Show how applying this card changes the situation.',
      editPrompt: 'mid-metamorphosis, evolving, taking on a new form while keeping its identity' },
    { id: 'support',    label: 'Support',    emoji: '🛡️', hint: 'Defend a claim or build up an idea.',
      editPrompt: 'stronger and more defined, with steady inner glow, foundations visible' },
    { id: 'challenge',  label: 'Challenge',  emoji: '⚡', hint: 'Push back on an assumption or test the topic.',
      editPrompt: 'with internal structure being clarified, layers parted to show what\'s inside' }
  ];

  // Cap on image-to-image transforms per encounter so API cost stays bounded
  // even if the student lands many critical Sparks.
  var MAX_VISUAL_TRANSFORMS = 4;

  // Encounter constants — tunable in subsequent commits.
  var BOSS_HP_START = 60;
  var ROUND_TIME_MS = 90 * 1000;          // 90s per round (D&D-style window)
  var MAX_ROUNDS = 8;                     // hard cap so encounters end gracefully
  var HAND_SIZE = 5;                      // cards visible at once in hand
  var CLASS_ROUND_DURATION_MS = 90 * 1000;  // Phase 3b.full.d — D&D-style round window

  function register() {
    window.AlloHavenArcade.registerMode('boss-encounter', {
      label: 'Boss Encounter',
      icon: '🐉',
      blurb: 'Pick a topic, draw cards from your room, and Spark them through justifications. Solo vs. an AI-generated boss for now; live class mode comes next.',
      timeCost: 10,
      partnerRequired: false,
      ready: true,
      render: function (ctx) {
        var React = ctx.React || window.React;
        var session = ctx.session;
        // If THIS mode's session is active, show the active encounter UI.
        // Otherwise the launcher card.
        var inActiveSession = !!(session && session.modeId === 'boss-encounter');
        if (inActiveSession) {
          // Pass session.startedAt as a key so the encounter component
          // remounts (resetting its state) on every fresh launch.
          return React.createElement(BossEncounterMain, {
            key: 'be-' + session.startedAt,
            ctx: ctx
          });
        }
        return React.createElement(BossLauncherCard, { ctx: ctx });
      }
    });
  }

  // ── Launcher card ──────────────────────────────────────────────────
  // Phase 3b.full.b — adds class-mode branches when the user is in a
  // live AlloFlow session. Host (teacher) sees "Start class encounter";
  // students see "Join class encounter: [topic]" when host has created
  // one. Solo mode remains the default everyone-can-play path.
  function BossLauncherCard(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var ctx = props.ctx;
    var palette = ctx.palette;
    var session = ctx.session;
    var decoSize = (ctx.decorations || []).length;
    var glossSize = (ctx.glossaryEntries || []).length;
    var deckSize = decoSize + glossSize;
    var disabled = !!session; // an encounter (or another mode) is running
    var minutesAsked = 10;
    var tokensCost = Math.ceil(minutesAsked / (ctx.minutesPerToken || 5));
    var canAfford = ctx.tokens >= tokensCost && deckSize >= 3;

    // ── Class-mode subscription ─────────────────────────────────────
    // When in a live session, subscribe to the session doc so we can
    // surface an active class encounter (host has started one) or
    // detect that no encounter is active.
    var sessionStateTuple = useState(null);
    var sessionState = sessionStateTuple[0];
    var setSessionState = sessionStateTuple[1];
    useEffect(function () {
      if (!ctx.sessionCode || typeof ctx.sessionSubscribe !== 'function') return;
      var unsubscribe = ctx.sessionSubscribe(function (data) {
        setSessionState(data);
      });
      return typeof unsubscribe === 'function' ? unsubscribe : function () {};
    }, [ctx.sessionCode]);

    var classEncounter = sessionState && sessionState.bossEncounter;
    var hasOpenClassEncounter = !!(classEncounter && classEncounter.status === 'open');
    var isInSession = !!ctx.sessionCode;

    // Solo launch — existing behavior, unchanged
    function handleLaunch() {
      if (disabled) return;
      if (deckSize < 3) {
        ctx.addToast('You need at least 3 cards to play (decorations + active glossary). Generate a glossary or earn a few decorations first.');
        return;
      }
      // Clear any class-mode sentinel from a prior launch
      window.__alloHavenBossClassMode = null;
      ctx.onLaunch(minutesAsked);
    }

    // Class encounter — host creation path
    function handleStartClassEncounter() {
      if (disabled) return;
      if (deckSize < 3) {
        ctx.addToast('You need at least 3 cards to play (decorations + active glossary).');
        return;
      }
      if (typeof ctx.sessionUpdate !== 'function') {
        ctx.addToast('Class mode unavailable — Firestore plumbing missing.');
        return;
      }
      // Sentinel that BossEncounterMain reads on mount to know it should
      // run the encounter in HOST class mode (write topic+boss to session
      // doc once they're chosen, instead of keeping them local-only).
      window.__alloHavenBossClassMode = {
        role: 'host',
        hostNickname: ctx.studentNickname || 'Teacher',
        startedAt: new Date().toISOString()
      };
      ctx.onLaunch(minutesAsked);
    }

    // Class encounter — student join path
    function handleJoinClassEncounter() {
      if (disabled) return;
      if (!classEncounter) {
        ctx.addToast('No class encounter is active right now.');
        return;
      }
      if (deckSize < 3) {
        ctx.addToast('You need at least 3 cards to play.');
        return;
      }
      // Sentinel for student join — encounter data sourced from session.
      window.__alloHavenBossClassMode = {
        role: 'student',
        hostNickname: classEncounter.hostNickname || 'Teacher',
        joinFromSession: true,
        encounterTopic: classEncounter.topic,
        encounterBossImage: classEncounter.bossImageBase64 || null,
        startedAt: new Date().toISOString()
      };
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
        h('span', { 'aria-hidden': 'true', style: { fontSize: '36px', lineHeight: 1 } }, '🐉'),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: '15px', fontWeight: 700, color: palette.text || '#e2e8f0', marginBottom: '3px' } },
            'Boss Encounter'),
          h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', lineHeight: '1.45' } },
            'Pick a topic. Draw cards from your room. Spark each card by justifying how it fits the topic — the boss takes damage when your justifications land. Solo mode for now; live class mode is on the way.')
        )
      ),
      // ── Class-mode strip (Phase 3b.full.b) ─────────────────────────
      // Visible when in a live session. Shows different UX per role:
      //   - Host, no encounter active: "Start class encounter" CTA
      //   - Host, encounter active: status banner ("Your class encounter
      //     is active — students can join")
      //   - Student, no encounter active: "Waiting for your teacher" hint
      //   - Student, encounter active: prominent "🌐 Join: [topic]" CTA
      isInSession ? (function () {
        if (ctx.isHost) {
          if (hasOpenClassEncounter) {
            return h('div', {
              role: 'status',
              style: {
                padding: '10px 12px',
                background: (palette.bg || '#0f172a') + 'aa',
                border: '1.5px solid ' + (palette.accent || '#60a5fa'),
                borderRadius: '8px',
                marginBottom: '10px',
                fontSize: '12px',
                color: palette.text || '#e2e8f0',
                lineHeight: '1.45'
              }
            },
              h('div', { style: { fontWeight: 700, marginBottom: '2px' } },
                '🌐 Class encounter active · ' + (classEncounter.topic || 'untitled')),
              h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1' } },
                'Students in session ' + ctx.sessionCode + ' can now join from their AlloHaven Arcades.')
            );
          }
          // Host, no active encounter — Start CTA
          return h('button', {
            onClick: handleStartClassEncounter,
            disabled: disabled || !canAfford,
            'aria-label': 'Start a class-vs-AI encounter for session ' + ctx.sessionCode,
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
            h('span', { 'aria-hidden': 'true', style: { fontSize: '20px' } }, '🌐'),
            h('span', { style: { flex: 1 } },
              h('div', { style: { fontSize: '13px', fontWeight: 700 } }, 'Start class encounter'),
              h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', marginTop: '2px' } },
                'Pick a topic; students in session ' + ctx.sessionCode + ' can join. Same ' + tokensCost + ' 🪙 cost.')
            )
          );
        }
        // Student
        if (hasOpenClassEncounter) {
          return h('button', {
            onClick: handleJoinClassEncounter,
            disabled: disabled || !canAfford,
            'aria-label': 'Join the class encounter on ' + (classEncounter.topic || 'untitled'),
            style: {
              display: 'flex', gap: '12px', alignItems: 'center',
              width: '100%',
              padding: '10px 12px',
              background: (palette.accent || '#60a5fa') + '22',
              border: '1.5px solid ' + (palette.accent || '#60a5fa'),
              borderRadius: '8px',
              cursor: (disabled || !canAfford) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              color: palette.text || '#e2e8f0',
              textAlign: 'left',
              marginBottom: '10px',
              opacity: (disabled || !canAfford) ? 0.6 : 1
            }
          },
            h('span', { 'aria-hidden': 'true', style: { fontSize: '22px' } }, '🌐'),
            h('span', { style: { flex: 1 } },
              h('div', { style: { fontSize: '13px', fontWeight: 700 } },
                'Join class encounter: ' + (classEncounter.topic || 'untitled')),
              h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', marginTop: '2px' } },
                (classEncounter.hostNickname ? classEncounter.hostNickname + ' is hosting. ' : '')
                + 'Same ' + tokensCost + ' 🪙 cost. Solo still works below.')
            )
          );
        }
        // Student, no encounter — small waiting hint
        return h('div', {
          role: 'status',
          style: {
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 10px',
            background: (palette.bg || '#0f172a') + 'aa',
            border: '1px dashed ' + (palette.border || '#334155'),
            borderRadius: '8px',
            fontSize: '11px',
            color: palette.textDim || '#cbd5e1',
            marginBottom: '10px',
            lineHeight: '1.4'
          }
        },
          h('span', { 'aria-hidden': 'true', style: { fontSize: '14px' } }, '🌐'),
          h('span', { style: { flex: 1 } },
            'In session ', h('strong', null, ctx.sessionCode), '. ',
            'Waiting for your teacher to start a class encounter. Solo works any time.')
        );
      })() : null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
        h('div', { style: { fontSize: '11px', color: palette.textMute || '#a3a3a3', flex: 1 } },
          deckSize >= 3
            ? (decoSize + ' decoration' + (decoSize === 1 ? '' : 's')
                + (glossSize > 0 ? ' + ' + glossSize + ' unit card' + (glossSize === 1 ? '' : 's') : '')
                + ' ready')
            : ('Need ' + (3 - deckSize) + ' more card' + (3 - deckSize === 1 ? '' : 's')
                + ' (decorations or glossary) to start')
        ),
        h('button', {
          onClick: handleLaunch,
          disabled: disabled || !canAfford,
          'aria-label': 'Start a Boss Encounter (' + minutesAsked + ' minutes, ' + tokensCost + ' tokens)',
          style: {
            background: (disabled || !canAfford) ? (palette.surface || '#1e293b') : (palette.accent || '#60a5fa'),
            color: (disabled || !canAfford) ? (palette.textMute || '#a3a3a3') : (palette.onAccent || '#0f172a'),
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: (disabled || !canAfford) ? 'not-allowed' : 'pointer',
            opacity: (disabled || !canAfford) ? 0.6 : 1,
            fontFamily: 'inherit'
          }
        },
          disabled && session && session.modeId === 'boss-encounter' ? 'Resuming…'
          : disabled ? 'Another game running'
          : !canAfford && deckSize < 3 ? 'Need 3+ cards'
          : !canAfford ? 'Need ' + tokensCost + ' 🪙'
          : (isInSession ? 'Solo · ' : 'Start · ') + tokensCost + ' 🪙'
        )
      )
    );
  }

  // ── Active encounter component ─────────────────────────────────────
  // All hooks live here so they run unconditionally on every render of
  // this component instance.

  // Build a unified card shape from a heterogeneous source. Used by the
  // deck-construction useMemo to fold decorations + glossary entries
  // into one array of card-shaped objects the encounter renders.
  function decorationToCard(d) {
    return {
      id: 'card-deco-' + d.id,
      source: 'decoration',
      name: d.templateLabel || d.template || 'card',
      imageBase64: d.imageBase64 || null,
      conceptDef: (d.studentReflection || '').trim() || null,
      tier: null,
      raw: d
    };
  }
  function glossaryEntryToCard(g, idx) {
    var img = g.image || null;
    if (img && img.indexOf('data:') !== 0 && img.length > 200) {
      // bare base64 — add the prefix so the <img> renders
      img = 'data:image/png;base64,' + img;
    }
    return {
      id: 'card-gloss-' + (g.term || ('idx-' + idx)).replace(/\s+/g, '-').toLowerCase() + '-' + idx,
      source: 'glossary',
      name: g.term || 'concept',
      imageBase64: img,
      conceptDef: g.def || null,
      tier: g.tier || null,
      raw: g
    };
  }

  function BossEncounterMain(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useRef = React.useRef;
    var useMemo = React.useMemo;

    var ctx = props.ctx;
    var palette = ctx.palette;

    // Phase 3b.glossary — unified deck. Decorations + glossary entries
    // become card-shaped objects. The deck is computed once per
    // encounter (this component's lifetime); ctx.decorations and
    // ctx.glossaryEntries are stable for the duration of the session.
    var deck = useMemo(function () {
      var decoCards = (ctx.decorations || []).map(decorationToCard);
      var glossCards = (ctx.glossaryEntries || []).map(glossaryEntryToCard);
      return decoCards.concat(glossCards);
    }, []); // eslint-disable-line

    // Phase 3b.full.b — class-mode sentinel snapshot. Captured ONCE on
    // mount (sentinel cleared after read so re-mounts don't re-trigger).
    // Drives the encounter's initial state: solo (default), host
    // creating a class encounter, or student joining one.
    var classModeRef = useRef(null);
    if (classModeRef.current === null) {
      classModeRef.current = window.__alloHavenBossClassMode || { role: null };
      window.__alloHavenBossClassMode = null; // one-shot
    }
    var classMode = classModeRef.current;
    var isClassHost = classMode.role === 'host';
    var isClassStudent = classMode.role === 'student';
    var isClassMode = isClassHost || isClassStudent;

    // Encounter state machine: 'topic' | 'gen-boss' | 'play' | 'won' | 'lost' | 'expired'
    // Students joining a class encounter skip 'topic' + 'gen-boss' and
    // start in 'play' with topic + boss image from the host's session doc.
    var phaseTuple = useState(isClassStudent ? 'play' : 'topic');
    var phase = phaseTuple[0];
    var setPhase = phaseTuple[1];

    var topicTuple = useState(isClassStudent ? (classMode.encounterTopic || '') : '');
    var topic = topicTuple[0];
    var setTopic = topicTuple[1];

    var bossImageTuple = useState(isClassStudent ? (classMode.encounterBossImage || null) : null);
    var bossImage = bossImageTuple[0];
    var setBossImage = bossImageTuple[1];

    var bossErrTuple = useState(null);
    var bossErr = bossErrTuple[0];
    var setBossErr = bossErrTuple[1];

    var hpTuple = useState(BOSS_HP_START);
    var hp = hpTuple[0];
    var setHp = hpTuple[1];

    var roundTuple = useState(1);
    var round = roundTuple[0];
    var setRound = roundTuple[1];

    var historyTuple = useState([]);
    var history = historyTuple[0];      // [{ round, cardId, cardName, verb, justification, score, ackText, followUp }]
    var setHistory = historyTuple[1];

    var handTuple = useState([]);
    var hand = handTuple[0];
    var setHand = handTuple[1];

    // Per-turn UI state
    var pickedCardTuple = useState(null);
    var pickedCard = pickedCardTuple[0];
    var setPickedCard = pickedCardTuple[1];

    var pickedVerbTuple = useState(null);
    var pickedVerb = pickedVerbTuple[0];
    var setPickedVerb = pickedVerbTuple[1];

    var justificationTuple = useState('');
    var justification = justificationTuple[0];
    var setJustification = justificationTuple[1];

    var submittingTuple = useState(false);
    var submitting = submittingTuple[0];
    var setSubmitting = submittingTuple[1];

    var lastResultTuple = useState(null); // { score, ackText, followUp, damage, healed }
    var lastResult = lastResultTuple[0];
    var setLastResult = lastResultTuple[1];

    // Phase 3b.5 — image-to-image scene transformation on critical Sparks.
    // 'transforming' tracks an in-flight edit so the UI can show a glow.
    // 'transformCount' caps total edits per encounter (cost guard).
    var transformingTuple = useState(false);
    var transforming = transformingTuple[0];
    var setTransforming = transformingTuple[1];
    var transformCountTuple = useState(0);
    var transformCount = transformCountTuple[0];
    var setTransformCount = transformCountTuple[1];

    // Phase 3b.history — guard so we emit at most one encounter record per
    // session even if the end logic is touched from multiple paths
    // (won/lost branches in applySpark, expired branch in the session
    // watcher, forfeit branch in exitEncounter).
    var encounterRecordedRef = useRef(false);

    // Phase 3b.full.c — shared session-doc state for class encounters.
    // Captures the full sessions/{code} doc snapshot. Plugin reads
    // bossEncounter.submissions to compute shared HP + participant count.
    // null when not in class mode.
    var classSessionStateTuple = useState(null);
    var classSessionState = classSessionStateTuple[0];
    var setClassSessionState = classSessionStateTuple[1];
    useEffect(function () {
      if (!isClassMode) return;
      if (typeof ctx.sessionSubscribe !== 'function') return;
      var unsubscribe = ctx.sessionSubscribe(function (data) {
        setClassSessionState(data);
      });
      return typeof unsubscribe === 'function' ? unsubscribe : function () {};
      // eslint-disable-next-line
    }, []);

    // Derived class-encounter view (null in solo mode). Phase 3b.full.c
    // shipped submissions / sumDamage / participants / sharedHp; this
    // commit (3b.full.d) extends with round state (currentRound,
    // roundStartedAt, roundDurationMs, roundEndsAt) and 'I've submitted
    // this round' detection so the UI can disable the submit button
    // appropriately.
    var classView = (function () {
      if (!isClassMode || !classSessionState) return null;
      var be = classSessionState.bossEncounter || {};
      var submissionsMap = be.submissions || {};
      var subList = Object.keys(submissionsMap).map(function (k) {
        return Object.assign({ id: k }, submissionsMap[k] || {});
      }).sort(function (a, b) {
        return (a.submittedAt || '').localeCompare(b.submittedAt || '');
      });
      var sumDamage = subList.reduce(function (s, sub) { return s + (sub.damage || 0); }, 0);
      var nickSet = {};
      subList.forEach(function (sub) { if (sub.nickname) nickSet[sub.nickname] = true; });
      var participants = Object.keys(nickSet).length;
      var sharedHp = Math.max(0, BOSS_HP_START - sumDamage);

      // Round state
      var currentRound = typeof be.currentRound === 'number' ? be.currentRound : 1;
      var roundDurationMs = typeof be.roundDurationMs === 'number' ? be.roundDurationMs : CLASS_ROUND_DURATION_MS;
      var roundStartedAtMs = be.roundStartedAt ? new Date(be.roundStartedAt).getTime() : 0;
      var roundEndsAtMs = roundStartedAtMs ? roundStartedAtMs + roundDurationMs : 0;
      var maxRounds = typeof be.maxRounds === 'number' ? be.maxRounds : MAX_ROUNDS;

      // Has THIS user submitted in the current round?
      var myNickname = ctx.studentNickname || 'anon';
      var hasSubmittedThisRound = subList.some(function (s) {
        return s.nickname === myNickname && s.round === currentRound;
      });

      return {
        submissions: subList,
        sumDamage: sumDamage,
        participants: participants,
        sharedHp: sharedHp,
        sessionStatus: be.status,
        currentRound: currentRound,
        roundDurationMs: roundDurationMs,
        roundStartedAtMs: roundStartedAtMs,
        roundEndsAtMs: roundEndsAtMs,
        maxRounds: maxRounds,
        hasSubmittedThisRound: hasSubmittedThisRound
      };
    })();

    // Phase 3b.voice — voice justification state. Two engines exposed:
    //   'webspeech': live capture (initWebSpeechCapture) appends to the
    //     textarea as the student speaks. Free, browser-native, but
    //     Chrome routes audio through Google.
    //   'whisper' / 'gemini': record-then-transcribe via recordAudioBlob
    //     + transcribeAudio. Whisper is on-device once cached; Gemini is
    //     server-side per call but no model download.
    // The active path is selected by the saved Voice Quality preference;
    // 'auto' picks Whisper if loaded, else Gemini, else Web Speech.
    var voiceModeTuple = useState('idle');     // 'idle' | 'webspeech-live' | 'recording' | 'transcribing'
    var voiceMode = voiceModeTuple[0];
    var setVoiceMode = voiceModeTuple[1];
    var voiceElapsedTuple = useState(0);
    var voiceElapsed = voiceElapsedTuple[0];
    var setVoiceElapsed = voiceElapsedTuple[1];
    var voiceErrorTuple = useState(null);
    var voiceError = voiceErrorTuple[0];
    var setVoiceError = voiceErrorTuple[1];
    // Refs to the active capture controller — stop() is callable any time.
    var voiceRecorderRef = useRef(null);
    var voiceLiveRef = useRef(null);
    // Cleanup on unmount: stop any active capture.
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

    // Generate boss image when topic submitted
    function beginEncounter() {
      var t = (topic || '').trim();
      if (t.length < 3) {
        ctx.addToast('Pick a topic first (at least 3 characters).');
        return;
      }
      if (typeof ctx.callImagen !== 'function') {
        // Graceful degradation — proceed with no boss image
        publishClassEncounterStart(t, null);
        setPhase('play');
        drawHand();
        return;
      }
      setPhase('gen-boss');
      setBossErr(null);
      var prompt = 'Concept guardian for the topic "' + t + '". Friendly mythic creature, illustration style, soft watercolor, single subject centered, clean background. No text.';
      ctx.callImagen(prompt).then(function (result) {
        var img = (typeof result === 'string') ? result : (result && result.imageBase64);
        if (img) setBossImage(img);
        publishClassEncounterStart(t, img || null);
        setPhase('play');
        drawHand();
      }).catch(function (err) {
        // Boss image is decorative; proceed without it
        setBossErr((err && err.message) || 'Could not generate boss art.');
        publishClassEncounterStart(t, null);
        setPhase('play');
        drawHand();
      });
    }

    // Phase 3b.full.b — host writes the encounter to the session doc on
    // start so students can see "Join class encounter: [topic]" in their
    // own AlloHaven Arcades. No-op for solo + student-join paths.
    // Phase 3b.full.d — also seed round state (currentRound, roundStartedAt,
    // roundDurationMs) so all participants share a synchronized timer.
    function publishClassEncounterStart(topicText, bossImg) {
      if (!isClassHost) return;
      if (typeof ctx.sessionUpdate !== 'function') return;
      try {
        ctx.sessionUpdate({
          bossEncounter: {
            topic: topicText,
            bossImageBase64: bossImg || null,
            hostNickname: classMode.hostNickname || 'Teacher',
            status: 'open',
            startedAt: classMode.startedAt || new Date().toISOString(),
            currentRound: 1,
            roundStartedAt: new Date().toISOString(),
            roundDurationMs: CLASS_ROUND_DURATION_MS,
            maxRounds: MAX_ROUNDS
          }
        }).catch(function () { /* ignore — best-effort */ });
        ctx.addToast('🌐 Class encounter live. Students can join.');
      } catch (e) { /* ignore */ }
    }
    // Mark the session encounter completed when the host's encounter
    // ends (any terminal phase). Students who haven't joined yet won't
    // see a stale "Join" prompt; future encounters can overwrite cleanly.
    function publishClassEncounterEnd(outcome) {
      if (!isClassHost) return;
      if (typeof ctx.sessionUpdate !== 'function') return;
      try {
        ctx.sessionUpdate({
          bossEncounter: {
            status: 'completed',
            endedOutcome: outcome || 'completed',
            endedAt: new Date().toISOString()
          }
        }).catch(function () { /* ignore */ });
      } catch (e) { /* ignore */ }
    }

    // Phase 3b.full.b — students joining a class encounter skip the
    // topic + gen-boss phases (they came from the host's session doc).
    // Draw their hand on mount so they can play immediately.
    useEffect(function () {
      if (isClassStudent && phase === 'play') {
        drawHand();
      }
      // eslint-disable-next-line
    }, []);

    function drawHand() {
      var pool = deck.slice();
      // Shuffle (Fisher-Yates)
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
      }
      setHand(pool.slice(0, HAND_SIZE));
    }

    function discardAndDraw(playedCardId) {
      // Remove the played card; refill from the rest of the unified deck.
      var pool = deck.filter(function (c) {
        if (c.id === playedCardId) return false;
        return !hand.some(function (existing) { return existing.id === c.id; });
      });
      // Shuffle remainder
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
      }
      var keepers = hand.filter(function (c) { return c.id !== playedCardId; });
      var refill = pool.slice(0, HAND_SIZE - keepers.length);
      setHand(keepers.concat(refill));
    }

    // ── Voice capture helpers (Phase 3b.voice) ────────────────────────
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
      // Map UI labels to internal engine ids
      if (engine === 'best') engine = 'whisper';
      if (engine === 'fast') engine = 'webspeech';
      // Validate availability; fall back to webspeech if a chosen engine
      // isn't actually wired in this session
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
      // Live mode appends transcripts to the textarea as the student speaks.
      var startingText = (justification || '').trim();
      var lastFinal = '';
      var controller = window.AlloFlowVoice.initWebSpeechCapture({
        lang: 'en-US',
        continuous: true,
        interimResults: false,
        onTranscript: function (text) {
          // Append final transcripts; Web Speech fires onresult per chunk.
          var trimmed = (text || '').trim();
          if (!trimmed || trimmed === lastFinal) return;
          lastFinal = trimmed;
          setJustification(function (prev) {
            var existing = (prev || '').trim();
            // Add a space between existing text and new chunk.
            return existing ? existing + ' ' + trimmed : trimmed;
          });
        },
        onError: function (e) {
          setVoiceError(e && e.error ? e.error : 'Voice error');
          stopVoiceLive();
        },
        onEnd: function () {
          // Browser may end the session on its own (silence timeout);
          // bring the UI back to idle.
          if (voiceLiveRef.current === controller) {
            voiceLiveRef.current = null;
            setVoiceMode('idle');
          }
        }
      });
      if (!controller.supported) {
        ctx.addToast('Voice capture not supported in this browser.');
        return;
      }
      var ok = controller.start();
      if (!ok) {
        ctx.addToast('Could not start voice capture.');
        return;
      }
      voiceLiveRef.current = controller;
      setVoiceError(null);
      setVoiceMode('webspeech-live');
    }

    function stopVoiceLive() {
      if (voiceLiveRef.current) {
        try { voiceLiveRef.current.stop(); } catch (e) { /* ignore */ }
        voiceLiveRef.current = null;
      }
      setVoiceMode('idle');
    }

    function startRecordAndTranscribe(engine) {
      if (!window.AlloFlowVoice || typeof window.AlloFlowVoice.recordAudioBlob !== 'function') {
        ctx.addToast('Audio recording not available.');
        return;
      }
      setVoiceError(null);
      setVoiceElapsed(0);
      var controller = window.AlloFlowVoice.recordAudioBlob({
        maxDurationMs: 60 * 1000,
        onTick: function (ms) { setVoiceElapsed(ms); },
        onError: function (err) {
          setVoiceError((err && err.message) || 'Recording failed');
          voiceRecorderRef.current = null;
          setVoiceMode('idle');
        }
      });
      if (!controller.supported) {
        ctx.addToast('Microphone not supported in this browser.');
        return;
      }
      voiceRecorderRef.current = controller;
      setVoiceMode('recording');
      // When the controller's result resolves (user clicked stop, OR maxDurationMs
      // auto-stop fired), kick off transcription.
      controller.result.then(function (rec) {
        voiceRecorderRef.current = null;
        if (!rec || !rec.base64) { setVoiceMode('idle'); return; }
        setVoiceMode('transcribing');
        var transOpts = {
          engine: engine,
          mimeType: rec.mimeType || 'audio/webm',
          callGeminiAudio: ctx.callGeminiAudio
        };
        return window.AlloFlowVoice.transcribeAudio(rec.base64, transOpts);
      }).then(function (out) {
        if (!out) return;
        var transcript = (out.transcript || '').trim();
        if (!transcript) {
          setVoiceError('No speech detected — try recording again.');
          setVoiceMode('idle');
          return;
        }
        setJustification(function (prev) {
          var existing = (prev || '').trim();
          return existing ? existing + ' ' + transcript : transcript;
        });
        setVoiceMode('idle');
      }).catch(function (err) {
        if (err && err.message === 'cancelled') {
          setVoiceMode('idle');
          return;
        }
        setVoiceError((err && err.message) || 'Transcription failed');
        setVoiceMode('idle');
      });
    }

    function startVoice() {
      var engine = resolveVoiceEngine();
      if (engine === 'off') {
        ctx.addToast('Voice input is off in Settings → Voice quality.');
        return;
      }
      if (engine === 'webspeech') {
        startWebSpeechLive();
        return;
      }
      startRecordAndTranscribe(engine);
    }

    function stopVoice() {
      if (voiceMode === 'webspeech-live') {
        stopVoiceLive();
        return;
      }
      if (voiceMode === 'recording' && voiceRecorderRef.current) {
        try { voiceRecorderRef.current.stop(); } catch (e) { /* ignore */ }
      }
    }

    function cancelVoice() {
      if (voiceMode === 'webspeech-live') {
        stopVoiceLive();
        return;
      }
      if (voiceRecorderRef.current) {
        try { voiceRecorderRef.current.cancel(); } catch (e) { /* ignore */ }
        voiceRecorderRef.current = null;
      }
      setVoiceMode('idle');
    }

    function submitSpark() {
      if (!pickedCard || !pickedVerb) {
        ctx.addToast('Pick a card and a Spark first.');
        return;
      }
      var text = (justification || '').trim();
      if (text.length < 10) {
        ctx.addToast('Write at least a sentence to Spark this card.');
        return;
      }
      if (typeof ctx.callGemini !== 'function') {
        ctx.addToast('AI grader unavailable. Try again later.');
        return;
      }
      setSubmitting(true);

      // Build rubric prompt — uses voice_module's helper if available, else
      // inlines a simpler prompt as fallback. The unified card shape
      // (Phase 3b.glossary) makes cardSource + conceptDef + tier all
      // first-class in the rubric — the AI grader sees the same anchor
      // whether the card is a personal decoration or a unit glossary entry.
      var rubric = {
        bossTopic: topic,
        cardName: pickedCard.name,
        cardSource: pickedCard.source,                  // 'decoration' | 'glossary'
        conceptDef: pickedCard.conceptDef || '',
        tier: pickedCard.tier || 'Tier 2',
        actionVerb: pickedVerb.label
      };
      var prompt;
      if (window.AlloFlowVoice && typeof window.AlloFlowVoice.buildJustificationRubricPrompt === 'function') {
        // Adapt the audio rubric prompt for text-only by stripping the
        // 'transcript' field expectation. The output JSON shape stays.
        var audioPrompt = window.AlloFlowVoice.buildJustificationRubricPrompt(rubric);
        prompt = audioPrompt.replace(
          /"transcript":[^,]+,\s*/,
          ''
        ).replace(
          'evaluating a student\'s spoken justification',
          'evaluating a student\'s written justification'
        );
        prompt += '\n\nSTUDENT JUSTIFICATION:\n' + text;
      } else {
        // Fallback prompt
        prompt = [
          'Score this student\'s justification for a card play in an educational game.',
          'Topic: ' + topic,
          'Card: ' + pickedCard.name + ' (' + pickedCard.source + (pickedCard.tier ? ', tier: ' + pickedCard.tier : '') + ')',
          pickedCard.conceptDef ? 'Concept definition: ' + pickedCard.conceptDef : null,
          'Action: ' + pickedVerb.label,
          'Justification: ' + text,
          '',
          'Score 1-20 the QUALITY OF THE BRIDGE between the card and the topic.',
          'Equal reward for distant transfer: a creative bridge between an unrelated card and the topic',
          'deserves the SAME high score as a textbook-direct connection.',
          'Be GENEROUS with autistic students whose answers may be literal-but-correct.',
          '',
          'Respond with ONLY valid JSON, no surrounding prose, no markdown fences:',
          '{ "score": <int 1-20>, "ackText": "1 short supportive sentence", "followUp": "1 short follow-up question" }'
        ].filter(function (l) { return l !== null; }).join('\n');
      }

      ctx.callGemini(prompt).then(function (raw) {
        var parsed;
        if (window.AlloFlowVoice && typeof window.AlloFlowVoice.parseRubricResponse === 'function') {
          parsed = window.AlloFlowVoice.parseRubricResponse(raw);
        } else {
          parsed = parseFallback(raw);
        }
        applySpark(parsed);
      }).catch(function (err) {
        setSubmitting(false);
        ctx.addToast('Grading failed: ' + ((err && err.message) || 'unknown'));
      });
    }

    function parseFallback(raw) {
      var defaults = { score: 10, ackText: '', followUp: '' };
      if (!raw || typeof raw !== 'string') return defaults;
      var cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      var firstBrace = cleaned.indexOf('{');
      var lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1) return defaults;
      try {
        var p = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
        var s = Number(p.score);
        if (!isFinite(s) || s < 1) s = 1; if (s > 20) s = 20;
        return {
          score: Math.round(s),
          ackText: typeof p.ackText === 'string' ? p.ackText : '',
          followUp: typeof p.followUp === 'string' ? p.followUp : ''
        };
      } catch (e) { return defaults; }
    }

    // Phase 3b.5 — fire-and-forget image-to-image edit on critical Sparks.
    // Non-blocking: turn flow continues immediately; the new boss image
    // replaces the old one when the edit resolves. If the edit fails or
    // takes too long, we silently keep the prior image — visual is a
    // celebratory bonus, not a blocker.
    function applyVisualSparkTransform(card, verb, parsed) {
      if (parsed.score < 18) return;                      // only criticals trigger
      if (transformCount >= MAX_VISUAL_TRANSFORMS) return; // cost guard
      if (!bossImage) return;                              // nothing to transform
      if (typeof window.callGeminiImageEdit !== 'function') return;
      var verbDef = SPARK_VERBS.filter(function (v) { return v.id === verb.id; })[0] || verb;
      var verbEdit = verbDef.editPrompt || 'transformed by an idea, with a subtle inner change visible';
      var cardName = card.name || 'an idea';
      // Strip the data:image/...;base64, prefix that callImagen returns;
      // callGeminiImageEdit can take either form but the bare base64 is
      // safer across deployments.
      var rawBase64 = bossImage;
      var prefixMatch = rawBase64.match(/^data:[^;]+;base64,(.+)$/);
      if (prefixMatch) rawBase64 = prefixMatch[1];

      var editPrompt = 'The same Concept Guardian for "' + topic + '", ' + verbEdit
        + '. The Guardian was just sparked by the concept of "' + cardName
        + '". Maintain the same character, pose, and overall composition; '
        + 'show only the transformation. No text, no labels, single subject.';

      setTransforming(true);
      setTransformCount(transformCount + 1);
      // Don't await — let the turn proceed, swap image in when ready.
      Promise.resolve(window.callGeminiImageEdit(editPrompt, rawBase64))
        .then(function (result) {
          var newImg = (typeof result === 'string') ? result
            : (result && result.imageBase64) ? result.imageBase64
            : null;
          if (newImg) {
            // Ensure data URI prefix for <img> rendering
            if (newImg.indexOf('data:') !== 0) {
              newImg = 'data:image/png;base64,' + newImg;
            }
            setBossImage(newImg);
          }
          setTransforming(false);
        })
        .catch(function () {
          // Silent fail — visual transformation is decorative
          setTransforming(false);
        });
    }

    function applySpark(parsed) {
      var score = parsed.score || 1;
      // Damage curve:
      //   1-10  → 0 damage (Spark fizzles, no class HP loss)
      //   11-17 → score - 5 damage (6-12 HP)
      //   18-20 → score damage AND +2 class HP regen (we don't track class HP in solo, so the regen
      //           manifests as a small bonus visible in the UI)
      var damage = score < 11 ? 0 : (score >= 18 ? score : (score - 5));
      var healed = score >= 18; // future: class HP regen
      var newHp = Math.max(0, hp - damage);
      // Phase 3b.5 — fire image-to-image transform for critical Sparks.
      // Capture the played card + verb for the helper before we clear the
      // turn-UI state below.
      var willTransform = healed
        && transformCount < MAX_VISUAL_TRANSFORMS
        && bossImage
        && typeof window.callGeminiImageEdit === 'function';
      var entry = {
        round: round,
        cardId: pickedCard.id,
        cardName: pickedCard.name,
        cardSource: pickedCard.source,
        cardTier: pickedCard.tier || null,
        verb: pickedVerb.label,
        justification: justification,
        score: score,
        ackText: parsed.ackText,
        followUp: parsed.followUp,
        damage: damage,
        healed: healed,
        willTransform: willTransform
      };
      var nextHistory = history.concat([entry]);
      setHistory(nextHistory);
      setLastResult(entry);
      setHp(newHp);
      setSubmitting(false);
      // Phase 3b.full.c — in class mode, also write the submission to
      // the session doc so all participants see shared HP fall. The
      // local hp state stays for solo + as an optimistic-update echo;
      // class-mode HP rendering reads from classView.sharedHp instead.
      if (isClassMode && typeof ctx.sessionUpdate === 'function') {
        var subId = 'sub-' + (ctx.studentNickname || 'anon').replace(/\s+/g, '_') + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        var subFields = {};
        subFields[subId] = {
          nickname: ctx.studentNickname || 'anon',
          cardName: entry.cardName,
          cardSource: entry.cardSource,
          cardTier: entry.cardTier,
          verb: entry.verb,
          justification: entry.justification,
          score: entry.score,
          ackText: entry.ackText,
          followUp: entry.followUp,
          damage: entry.damage,
          healed: entry.healed,
          // Phase 3b.full.d — tag with the round number from the shared
          // session state so the host's auto-advance + per-round
          // 'already submitted' detection both work correctly.
          round: classView ? classView.currentRound : 1,
          submittedAt: new Date().toISOString()
        };
        try {
          ctx.sessionUpdate({
            bossEncounter: { submissions: subFields }
          }).catch(function () { /* best-effort */ });
        } catch (e) { /* ignore */ }
      }
      if (willTransform) {
        applyVisualSparkTransform(pickedCard, pickedVerb, parsed);
      }

      // Phase 3b.full.c — local HP only authoritative in solo mode.
      // In class mode, win condition is computed from the snapshot
      // (sum of all participants' damages) by the useEffect watcher.
      if (!isClassMode && newHp <= 0) {
        emitEncounterRecord('won', newHp);
        publishClassEncounterEnd('won');
        setPhase('won');
        return;
      }
      // Advance round. In solo mode, round overflow ends the encounter.
      // In class mode, an individual's round overflow ends THEIR turn-
      // taking but doesn't end the class encounter — they transition to
      // 'lost' locally (no further submissions) while peers play on.
      // We DON'T call publishClassEncounterEnd here because individual
      // round-out is not a group decision.
      var nextRound = round + 1;
      if (nextRound > MAX_ROUNDS) {
        emitEncounterRecord('lost', newHp);
        if (!isClassMode) publishClassEncounterEnd('lost');
        setPhase('lost');
        return;
      }
      setRound(nextRound);
      // Reset turn UI; refill hand
      discardAndDraw(pickedCard.id);
      setPickedCard(null);
      setPickedVerb(null);
      setJustification('');
    }

    // Phase 3b.history — build a self-contained encounter record + emit
    // it to the host. Dedup'd via encounterRecordedRef so multiple end
    // paths can call this without producing duplicate records.
    function buildEncounterRecord(outcome, finalHpOverride) {
      var sortedHistory = history.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
      var strongest = sortedHistory[0] || null;
      var totalDamage = history.reduce(function (s, e) { return s + (e.damage || 0); }, 0);
      var criticalCount = history.filter(function (e) { return (e.score || 0) >= 18; }).length;
      var sessionStartedAt = (ctx.session && ctx.session.startedAt) || new Date().toISOString();
      return {
        topic: topic,
        outcome: outcome,
        startedAt: sessionStartedAt,
        endedAt: new Date().toISOString(),
        roundsPlayed: history.length,
        roundsMax: MAX_ROUNDS,
        totalDamage: totalDamage,
        criticalCount: criticalCount,
        bossHpStart: BOSS_HP_START,
        bossHpFinal: typeof finalHpOverride === 'number' ? finalHpOverride : hp,
        bossImageBase64: bossImage,
        transformCount: transformCount,
        // Per-turn detail — drop the willTransform flag (internal-only)
        history: history.map(function (e) {
          return {
            round: e.round,
            cardName: e.cardName,
            cardSource: e.cardSource || 'decoration',
            cardTier: e.cardTier || null,
            verb: e.verb,
            justification: e.justification,
            score: e.score,
            ackText: e.ackText,
            followUp: e.followUp,
            damage: e.damage,
            healed: e.healed
          };
        }),
        strongestSpark: strongest ? {
          round: strongest.round,
          cardName: strongest.cardName,
          verb: strongest.verb,
          score: strongest.score,
          justification: strongest.justification
        } : null
      };
    }
    function emitEncounterRecord(outcome, finalHpOverride) {
      if (encounterRecordedRef.current) return;
      encounterRecordedRef.current = true;
      if (typeof ctx.onEncounterRecord !== 'function') return;
      try {
        ctx.onEncounterRecord(buildEncounterRecord(outcome, finalHpOverride));
      } catch (e) { /* ignore */ }
    }

    // Phase 3b.history — watch for the arcade session ending (timer
    // expiry) while we're still mid-play. The host's endArcadeSession
    // clears ctx.session; this effect fires the 'expired' record.
    useEffect(function () {
      if (phase !== 'play') return;
      // Once session disappears mid-play, the timer expired (or
      // user/host forced an end). Treat as expired.
      if (!ctx.session) {
        emitEncounterRecord('expired');
        publishClassEncounterEnd('expired');
        setPhase('expired');
      }
      // eslint-disable-next-line
    }, [ctx.session, phase]);

    // Phase 3b.full.d — countdown ticker so the per-round timer re-renders
    // smoothly even when no Firestore snapshot has fired. setInterval
    // bumps a local nowTick counter every second; the render reads
    // classView.roundEndsAtMs - Date.now() to compute remaining seconds.
    var nowTickTuple = useState(0);
    var nowTick = nowTickTuple[0];
    var setNowTick = nowTickTuple[1];
    useEffect(function () {
      if (!isClassMode || phase !== 'play') return;
      var iv = setInterval(function () { setNowTick(function (t) { return t + 1; }); }, 1000);
      return function () { clearInterval(iv); };
      // eslint-disable-next-line
    }, [isClassMode, phase]);

    // Phase 3b.full.d — host auto-advances rounds. When the current
    // round's timer expires, host writes currentRound++ + a fresh
    // roundStartedAt to the session doc. After MAX_ROUNDS, the host
    // ends the encounter with outcome 'lost' (or 'won' if HP already 0
    // — that branch is handled by the snapshot useEffect below).
    // Students never write round state — only host.
    useEffect(function () {
      if (!isClassHost) return;
      if (phase !== 'play') return;
      if (!classView) return;
      if (classView.sessionStatus !== 'open') return;
      if (!classView.roundEndsAtMs) return;
      var msLeft = classView.roundEndsAtMs - Date.now();
      if (msLeft > 100) return; // not yet expired
      // Round expired — advance or end
      var nextRound = (classView.currentRound || 1) + 1;
      if (nextRound > (classView.maxRounds || MAX_ROUNDS)) {
        // Out of rounds. If shared HP > 0, encounter ends 'lost' for
        // the class. The snapshot useEffect propagates to all
        // participants once the host writes status=completed.
        if (classView.sharedHp > 0) {
          publishClassEncounterEnd('lost');
        }
        // If sharedHp <= 0, the snapshot useEffect already set 'won' —
        // don't overwrite that with 'lost'.
        return;
      }
      // Advance round
      try {
        ctx.sessionUpdate({
          bossEncounter: {
            currentRound: nextRound,
            roundStartedAt: new Date().toISOString()
          }
        }).catch(function () { /* best-effort */ });
      } catch (e) { /* ignore */ }
      // eslint-disable-next-line
    }, [isClassHost, phase, classView && classView.roundEndsAtMs, nowTick]);

    // Phase 3b.full.c — class-mode terminal-phase detection from session
    // snapshot. Two trigger conditions:
    //   1. Shared HP drops to 0 → 'won' (every participant who's still
    //      in 'play' transitions; each emits their own encounter record)
    //   2. Host marks bossEncounter.status = 'completed' (e.g. via the
    //      teacher controls from 3b.full.e or via host's local exit) →
    //      whoever is still in 'play' transitions to the host's outcome
    useEffect(function () {
      if (!isClassMode || !classView) return;
      if (phase !== 'play') return;
      if (classView.sharedHp <= 0) {
        emitEncounterRecord('won', 0);
        // Host also marks the session encounter completed; students
        // skip publish because publishClassEncounterEnd is host-only.
        publishClassEncounterEnd('won');
        setPhase('won');
        return;
      }
      if (classView.sessionStatus === 'completed') {
        var hostOutcome = (classSessionState && classSessionState.bossEncounter && classSessionState.bossEncounter.endedOutcome) || 'lost';
        // If we already met the win condition locally, that wins; else
        // adopt the host's outcome.
        var localOutcome = (classView.sharedHp <= 0) ? 'won' : hostOutcome;
        emitEncounterRecord(localOutcome, classView.sharedHp);
        setPhase(localOutcome === 'won' ? 'won' : 'lost');
      }
      // eslint-disable-next-line
    }, [classView && classView.sharedHp, classView && classView.sessionStatus, phase]);

    function exitEncounter() {
      // Phase 3b.history — only record forfeits if we actually got into
      // play. Topic-input cancellations don't count as encounters.
      if (phase === 'play') {
        emitEncounterRecord('forfeit');
        publishClassEncounterEnd('forfeit');
      }
      // End the arcade session early
      if (typeof ctx.onEndSession === 'function') ctx.onEndSession('forfeit');
      ctx.onClose();
    }

    // ── Render ─────────────────────────────────────────────────────────
    // Phase 3b.full.c — in class mode, HP comes from the shared session
    // doc (sum of all participants' damages). Solo uses local hp state.
    var displayHp = isClassMode && classView ? classView.sharedHp : hp;
    var hpPct = Math.max(0, Math.min(100, Math.round((displayHp / BOSS_HP_START) * 100)));
    var topRow = h('div', {
      style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }
    },
      h('span', { 'aria-hidden': 'true', style: { fontSize: '24px' } }, isClassMode ? '🌐' : '🐉'),
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('div', { style: { fontSize: '13px', fontWeight: 700, color: palette.text } },
          (isClassMode ? 'Class Encounter' : 'Boss Encounter') + ' · ' + (topic || '...')),
        h('div', { style: { fontSize: '11px', color: palette.textDim } },
          isClassStudent && classMode.hostNickname ? (classMode.hostNickname + ' · ') : '',
          phase === 'play' ? ('Round ' + round + ' of ' + MAX_ROUNDS) : phase)
      ),
      h('button', {
        onClick: exitEncounter,
        'aria-label': 'Exit encounter',
        style: {
          background: 'transparent', color: palette.textMute,
          border: '1px solid ' + palette.border, borderRadius: '8px',
          padding: '4px 10px', fontSize: '11px', fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit'
        }
      }, 'Exit')
    );

    if (phase === 'topic') {
      return h('div', {
        style: {
          padding: '14px',
          background: palette.surface,
          border: '1.5px solid ' + palette.accent,
          borderRadius: '10px'
        }
      },
        topRow,
        h('p', { style: { fontSize: '12px', color: palette.textDim, marginBottom: '12px', lineHeight: '1.5' } },
          'Pick a topic for this encounter — anything you want to think hard about. The AI will conjure a Concept Guardian to embody it.'),
        h('input', {
          type: 'text',
          value: topic,
          onChange: function (e) { setTopic(e.target.value); },
          onKeyDown: function (e) { if (e.key === 'Enter') beginEncounter(); },
          placeholder: 'e.g. photosynthesis, the bill of rights, a character from your story…',
          'aria-label': 'Encounter topic',
          style: {
            width: '100%',
            padding: '10px 12px',
            background: palette.bg,
            border: '1px solid ' + palette.border,
            borderRadius: '8px',
            color: palette.text,
            fontSize: '13px',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            marginBottom: '12px'
          }
        }),
        h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'flex-end' } },
          h('button', {
            onClick: exitEncounter,
            style: {
              background: 'transparent', color: palette.textDim,
              border: '1px solid ' + palette.border, borderRadius: '8px',
              padding: '8px 14px', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit'
            }
          }, 'Cancel'),
          h('button', {
            onClick: beginEncounter,
            disabled: (topic || '').trim().length < 3,
            style: {
              background: (topic || '').trim().length >= 3 ? palette.accent : palette.surface,
              color: (topic || '').trim().length >= 3 ? palette.onAccent : palette.textMute,
              border: 'none', borderRadius: '8px',
              padding: '8px 18px', fontSize: '13px', fontWeight: 700,
              cursor: (topic || '').trim().length >= 3 ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              opacity: (topic || '').trim().length >= 3 ? 1 : 0.6
            }
          }, 'Begin encounter')
        )
      );
    }

    if (phase === 'gen-boss') {
      return h('div', {
        style: { padding: '24px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '10px', textAlign: 'center' }
      },
        topRow,
        h('div', { style: { fontSize: '40px', marginBottom: '8px' } }, '✨'),
        h('p', { style: { fontSize: '13px', color: palette.text, marginBottom: '4px' } }, 'Conjuring the Concept Guardian for "' + topic + '"…'),
        h('p', { style: { fontSize: '11px', color: palette.textDim, fontStyle: 'italic' } }, 'Usually 5–15 seconds.')
      );
    }

    if (phase === 'won' || phase === 'lost' || phase === 'expired') {
      var bestPlay = history.slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); })[0];
      return h('div', {
        style: { padding: '20px', background: palette.surface, border: '1.5px solid ' + palette.accent, borderRadius: '10px' }
      },
        topRow,
        h('div', { style: { fontSize: '36px', textAlign: 'center', marginBottom: '6px' } },
          phase === 'won' ? '🎉' : phase === 'lost' ? '🌫️' : '⏰'),
        h('div', { style: { fontSize: '17px', fontWeight: 800, color: palette.text, textAlign: 'center', marginBottom: '6px' } },
          phase === 'won' ? 'The Concept Guardian is illuminated!'
          : phase === 'lost' ? 'The Guardian retreats into the mist for now.'
          : 'Time\'s up — the Guardian remains.'
        ),
        h('p', { style: { fontSize: '12px', color: palette.textDim, textAlign: 'center', fontStyle: 'italic', marginBottom: '14px' } },
          phase === 'won' ? 'Your Sparks brought clarity. The topic glows.'
          : 'No shame — the topic is still yours to think about. Try again any time.'
        ),
        bestPlay ? h('div', {
          style: { padding: '10px 12px', background: palette.bg, border: '1px solid ' + palette.border, borderRadius: '8px', marginBottom: '14px' }
        },
          h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' } },
            'Strongest Spark this encounter'),
          h('div', { style: { fontSize: '12px', color: palette.text, marginBottom: '4px' } },
            bestPlay.cardName + ' · ' + bestPlay.verb + ' · score ' + bestPlay.score),
          h('div', { style: { fontSize: '11px', color: palette.textDim, fontStyle: 'italic', lineHeight: '1.45' } },
            '"' + (bestPlay.justification || '') + '"')
        ) : null,
        h('div', { style: { fontSize: '11px', color: palette.textMute, textAlign: 'center' } },
          'Sparks landed: ' + history.length + ' · Total damage: ' + history.reduce(function (s, e) { return s + (e.damage || 0); }, 0)),
        h('div', { style: { display: 'flex', justifyContent: 'center', marginTop: '14px' } },
          h('button', {
            onClick: exitEncounter,
            style: {
              background: palette.accent, color: palette.onAccent,
              border: 'none', borderRadius: '8px',
              padding: '10px 20px', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit'
            }
          }, 'Done')
        )
      );
    }

    // phase === 'play'
    return h('div', {
      style: {
        padding: '12px',
        background: palette.surface,
        border: '1.5px solid ' + palette.accent,
        borderRadius: '10px'
      }
    },
      topRow,
      // Boss panel — image + HP bar. When transforming, the image gets a
      // glowing accent border + a small overlay label, so the student can
      // see the Spark IS landing visually even while the API call resolves.
      h('div', {
        style: {
          display: 'flex', gap: '12px', alignItems: 'center',
          padding: '10px', background: palette.bg,
          border: '1px solid ' + (transforming ? palette.accent : palette.border),
          borderRadius: '8px',
          marginBottom: '12px',
          boxShadow: transforming ? ('0 0 16px ' + (palette.accent || '#60a5fa') + '88') : 'none',
          transition: 'box-shadow 320ms ease, border-color 320ms ease'
        }
      },
        h('div', {
          style: {
            position: 'relative',
            width: '72px', height: '72px', flexShrink: 0
          }
        },
          bossImage ? h('img', {
            src: bossImage,
            alt: 'Concept Guardian for ' + topic,
            style: { width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', border: '1px solid ' + palette.border, display: 'block' }
          }) : h('div', {
            'aria-hidden': 'true',
            style: { width: '72px', height: '72px', fontSize: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '8px' }
          }, '🐉'),
          transforming ? h('div', {
            'aria-live': 'polite',
            'aria-label': 'Spark transforming the Guardian',
            style: {
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.45)',
              borderRadius: '8px',
              fontSize: '18px',
              animation: 'none'
            }
          }, '✨') : null
        ),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: '12px', fontWeight: 700, color: palette.text, marginBottom: '4px' } }, 'Concept Guardian: ' + topic),
          h('div', {
            'aria-label': 'Boss HP ' + displayHp + ' of ' + BOSS_HP_START,
            style: { height: '12px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '999px', overflow: 'hidden', marginBottom: '4px' }
          },
            h('div', { style: { width: hpPct + '%', height: '100%', background: palette.accent, transition: 'width 320ms ease' } })
          ),
          h('div', { style: { fontSize: '10px', color: palette.textMute, fontVariantNumeric: 'tabular-nums' } },
            (function () {
              if (isClassMode && classView) {
                var roundLabel = 'Round ' + classView.currentRound + ' / ' + classView.maxRounds;
                var remainMs = Math.max(0, classView.roundEndsAtMs - Date.now());
                var remainSec = Math.ceil(remainMs / 1000);
                var participantsLabel = '🌐 ' + classView.participants + ' participant' + (classView.participants === 1 ? '' : 's');
                return displayHp + ' / ' + BOSS_HP_START + ' HP · ' + roundLabel + ' · ' + remainSec + 's left · ' + participantsLabel;
              }
              return displayHp + ' / ' + BOSS_HP_START + ' HP · Round ' + round + ' / ' + MAX_ROUNDS;
            })()
          ),
          bossErr ? h('div', { style: { fontSize: '10px', color: palette.textMute, fontStyle: 'italic', marginTop: '2px' } },
            '(Guardian art unavailable; encounter continues)') : null
        )
      ),
      // Phase 3b.full.c — class-mode peer feed. Last 5 submissions from
      // ANY participant, newest at the top. Lets students see each
      // other's Sparks landing in real time without exposing too much.
      // Hidden in solo mode.
      isClassMode && classView && classView.submissions.length > 0 ? h('div', {
        style: {
          padding: '8px 10px',
          background: palette.bg,
          border: '1px solid ' + palette.border,
          borderRadius: '8px',
          marginBottom: '12px'
        }
      },
        h('div', { style: { fontSize: '10px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' } },
          '🌐 Class Sparks · last ' + Math.min(5, classView.submissions.length) + ' of ' + classView.submissions.length),
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', color: palette.textDim } },
          classView.submissions.slice(-5).reverse().map(function (s) {
            var icon = s.score >= 18 ? '✨' : s.score >= 11 ? '💡' : '🌫️';
            return h('div', {
              key: 'cs-' + s.id,
              style: { display: 'flex', gap: '6px', alignItems: 'baseline' }
            },
              h('span', { 'aria-hidden': 'true' }, icon),
              h('strong', { style: { color: palette.text } }, s.nickname || 'anon'),
              h('span', null, ' · ' + (s.cardName || '?') + ' · ' + (s.verb || '?')),
              h('span', { style: { fontVariantNumeric: 'tabular-nums', color: palette.textMute } },
                ' · ' + s.score + (s.damage ? ' · -' + s.damage + ' HP' : ''))
            );
          })
        )
      ) : null,
      // Last-result feedback strip
      lastResult ? h('div', {
        role: 'status',
        'aria-live': 'polite',
        style: {
          padding: '10px 12px',
          background: lastResult.score >= 18 ? (palette.success || '#16a34a') + '22'
                    : lastResult.score >= 11 ? palette.bg
                    : palette.surface,
          border: '1px solid ' + (lastResult.score >= 18 ? (palette.success || palette.accent) : palette.border),
          borderRadius: '8px',
          marginBottom: '12px'
        }
      },
        h('div', { style: { fontSize: '12px', fontWeight: 700, color: palette.text, marginBottom: '2px' } },
          (lastResult.score >= 18 ? '✨ Critical Spark · ' : lastResult.score >= 11 ? '💡 Spark landed · ' : '🌫️ Spark fizzled · ')
          + 'score ' + lastResult.score + ' / 20 · '
          + (lastResult.damage > 0 ? lastResult.damage + ' damage' : 'no damage')
          + (lastResult.willTransform ? ' · 🎨 transforming the Guardian' : '')),
        lastResult.ackText ? h('div', { style: { fontSize: '11px', color: palette.textDim, lineHeight: '1.5', marginBottom: lastResult.followUp ? '4px' : 0 } },
          lastResult.ackText) : null,
        lastResult.followUp ? h('div', { style: { fontSize: '11px', color: palette.textMute, fontStyle: 'italic', lineHeight: '1.45' } },
          '💭 ' + lastResult.followUp) : null
      ) : null,
      // Hand of cards
      h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' } },
        'Your hand'),
      hand.length === 0 ? h('p', { style: { fontSize: '12px', color: palette.textDim, fontStyle: 'italic' } },
        'No more cards in your deck. End the encounter when you\'re ready.')
        : h('div', { style: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '12px' } },
          hand.map(function (card) {
            var picked = pickedCard && pickedCard.id === card.id;
            var isUnit = card.source === 'glossary';
            return h('button', {
              key: 'hc-' + card.id,
              onClick: function () { setPickedCard(picked ? null : card); },
              'aria-pressed': picked ? 'true' : 'false',
              'aria-label': card.name + (isUnit ? ' (unit card)' : '') + (card.tier ? ', ' + card.tier : ''),
              style: {
                flexShrink: 0,
                width: '92px',
                background: picked ? palette.accent : palette.bg,
                color: picked ? palette.onAccent : palette.text,
                border: '1.5px solid ' + (picked ? palette.accent : palette.border),
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'center',
                position: 'relative'
              }
            },
              // Source badge — top-left for unit (glossary) cards
              isUnit ? h('span', {
                'aria-hidden': 'true',
                style: {
                  position: 'absolute', top: '4px', left: '4px',
                  fontSize: '10px',
                  background: 'rgba(0,0,0,0.55)',
                  color: '#fff',
                  padding: '1px 4px',
                  borderRadius: '4px',
                  letterSpacing: '0.04em',
                  pointerEvents: 'none'
                }
              }, '📖') : null,
              card.imageBase64
                ? h('img', { src: card.imageBase64, alt: card.name, style: { width: '100%', height: '60px', objectFit: 'cover', borderRadius: '4px', marginBottom: '4px' } })
                : h('div', { 'aria-hidden': 'true', style: { width: '100%', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', background: palette.surface, borderRadius: '4px', marginBottom: '4px' } },
                  isUnit ? '📖' : '🎴'),
              h('div', { style: { fontSize: '10px', fontWeight: 700, lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, card.name),
              card.tier ? h('div', {
                style: { fontSize: '8px', color: picked ? palette.onAccent : palette.textMute, fontStyle: 'italic', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
              }, card.tier) : null
            );
          })
        ),
      // Verb picker — only enabled when a card is picked
      pickedCard ? h('div', null,
        h('div', { style: { fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' } },
          'Spark'),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' } },
          SPARK_VERBS.map(function (v) {
            var picked = pickedVerb && pickedVerb.id === v.id;
            return h('button', {
              key: 'sv-' + v.id,
              onClick: function () { setPickedVerb(v); },
              title: v.hint,
              'aria-pressed': picked ? 'true' : 'false',
              style: {
                background: picked ? palette.accent : 'transparent',
                color: picked ? palette.onAccent : palette.text,
                border: '1.5px solid ' + (picked ? palette.accent : palette.border),
                borderRadius: '999px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: picked ? 700 : 500,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }
            }, v.emoji + ' ' + v.label);
          })
        )
      ) : null,
      // Justification + submit — only when card + verb both picked
      pickedCard && pickedVerb ? h('div', null,
        h('label', {
          htmlFor: 'be-just',
          style: { display: 'block', fontSize: '11px', color: palette.textMute, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }
        }, 'Justification (1–3 sentences)'),
        h('textarea', {
          id: 'be-just',
          value: justification,
          onChange: function (e) { setJustification(e.target.value); },
          placeholder: 'How does your "' + pickedCard.name + '" ' + pickedVerb.label.toLowerCase() + ' the topic of "' + topic + '"?',
          rows: 3,
          'aria-label': 'Card-play justification',
          disabled: submitting,
          style: {
            width: '100%',
            padding: '10px 12px',
            background: palette.bg,
            border: '1px solid ' + palette.border,
            borderRadius: '8px',
            color: palette.text,
            fontSize: '13px',
            fontFamily: 'inherit',
            lineHeight: '1.5',
            resize: 'vertical',
            boxSizing: 'border-box',
            marginBottom: '8px'
          }
        }),
        // Phase 3b.voice — mic toolbar above the chars-counter row
        (function() {
          var prefs = (window.AlloFlowVoice && typeof window.AlloFlowVoice.loadPreference === 'function')
            ? window.AlloFlowVoice.loadPreference()
            : { engine: 'auto' };
          if (prefs.engine === 'off') return null;
          var resolved = resolveVoiceEngine();
          if (resolved === 'off') return null;
          var labelByEngine = {
            'whisper':   '🎙️ Voice (Whisper · on-device)',
            'gemini':    '🎙️ Voice (Gemini multimodal)',
            'webspeech': '🎙️ Voice (live)'
          };
          var idleLabel = labelByEngine[resolved] || '🎙️ Voice';
          var elapsedSec = Math.floor((voiceElapsed || 0) / 1000);
          var maxSec = 60;
          return h('div', {
            style: {
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px',
              background: palette.bg,
              border: '1px solid ' + palette.border,
              borderRadius: '8px',
              marginBottom: '8px',
              flexWrap: 'wrap'
            }
          },
            // Primary mic button — toggles based on current voice mode
            voiceMode === 'idle' ? h('button', {
              onClick: startVoice,
              disabled: submitting,
              style: {
                background: 'transparent',
                color: palette.accent,
                border: '1.5px solid ' + palette.accent,
                borderRadius: '999px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: submitting ? 0.5 : 1
              }
            }, idleLabel)
            : voiceMode === 'webspeech-live' ? h('button', {
              onClick: stopVoiceLive,
              'aria-label': 'Stop voice capture',
              style: {
                background: '#dc2626', color: '#fff',
                border: 'none', borderRadius: '999px',
                padding: '6px 14px', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                animation: 'ah-record-pulse 1.6s ease-in-out infinite'
              }
            }, '⏹ Stop · listening live')
            : voiceMode === 'recording' ? h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
              h('button', {
                onClick: stopVoice,
                'aria-label': 'Stop and transcribe',
                style: {
                  background: '#dc2626', color: '#fff',
                  border: 'none', borderRadius: '999px',
                  padding: '6px 14px', fontSize: '12px', fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  animation: 'ah-record-pulse 1.6s ease-in-out infinite'
                }
              }, '⏹ Stop & transcribe'),
              h('button', {
                onClick: cancelVoice,
                'aria-label': 'Cancel recording',
                style: {
                  background: 'transparent', color: palette.textMute,
                  border: '1px solid ' + palette.border, borderRadius: '999px',
                  padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit'
                }
              }, '✕ Cancel'),
              h('span', {
                'aria-live': 'polite',
                style: { fontSize: '11px', color: palette.textMute, fontVariantNumeric: 'tabular-nums', marginLeft: '4px' }
              }, elapsedSec + 's / ' + maxSec + 's')
            )
            : voiceMode === 'transcribing' ? h('span', {
              'aria-live': 'polite',
              style: { fontSize: '12px', color: palette.textDim, fontStyle: 'italic' }
            }, '✨ Transcribing…')
            : null,
            // Engine status hint — small, far-right, non-blocking
            voiceMode === 'idle' ? h('span', {
              style: { fontSize: '10px', color: palette.textMute, fontStyle: 'italic', marginLeft: 'auto' }
            },
              resolved === 'whisper' ? 'Audio stays on this device.'
              : resolved === 'gemini' ? 'Audio uploaded to Google.'
              : 'Speech routes through the browser.'
            ) : null,
            voiceError ? h('span', {
              role: 'alert',
              style: { fontSize: '11px', color: '#dc2626', fontStyle: 'italic', flexBasis: '100%' }
            }, voiceError) : null
          );
        })(),
        // Phase 3b.full.d — once-per-round in class mode. If the user
        // has already submitted this round, the Cast Spark button
        // becomes a "Spark cast — waiting for next round" indicator.
        (function () {
          var alreadyThisRound = isClassMode && classView && classView.hasSubmittedThisRound;
          var disabled = submitting || voiceMode !== 'idle' || (justification || '').trim().length < 10 || alreadyThisRound;
          return h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' } },
            h('div', { style: { fontSize: '10px', color: palette.textMute, fontVariantNumeric: 'tabular-nums' } },
              alreadyThisRound
                ? '✨ Spark cast this round — waiting for round ' + ((classView.currentRound || 1) + 1)
                : (justification || '').trim().length + ' chars'),
            h('button', {
              onClick: submitSpark,
              disabled: disabled,
              style: {
                background: disabled ? palette.surface : palette.accent,
                color: disabled ? palette.textMute : palette.onAccent,
                border: 'none', borderRadius: '8px',
                padding: '8px 18px', fontSize: '13px', fontWeight: 700,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                fontFamily: 'inherit'
              }
            },
              submitting ? 'Sparking…'
              : alreadyThisRound ? '✓ Cast'
              : '✨ Cast Spark')
          );
        })()
      ) : pickedCard ? h('p', { style: { fontSize: '11px', color: palette.textDim, fontStyle: 'italic' } },
        'Pick how you\'ll Spark this card.'
      ) : null
    );
  }
})();
