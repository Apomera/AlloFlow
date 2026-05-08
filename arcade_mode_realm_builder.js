(function () {
  // ═══════════════════════════════════════════
  // arcade_mode_realm_builder.js — AlloHaven Arcade plugin (Phase B solo)
  //
  // Sibling to arcade_mode_boss_encounter.js. Reuses the same trading-card
  // primitive (decoration + glossary cards, action verb, written justification,
  // AI rubric grade) but replaces combat with constructive world-building:
  //
  //   card → verb (place / connect / cultivate / shelter / disrupt)
  //        → justification ("how does this fit the realm?")
  //        → AI grade {score, ackText, followUp}
  //        → on score ≥ 11: image-to-image edit evolves the realm canvas
  //        → milestones at 3 / 5 / 8 / 12 zones unlock token rewards
  //
  // Pedagogy preserved verbatim from Boss Encounter:
  //   - forced verb selection commits intent before justification
  //   - AI feedback is formative (ackText + followUp), never pass/fail
  //   - rubric explicitly generous toward autistic students and distant transfer
  //   - "resonant placements" (score ≥ 18) celebrated visually, not just numerically
  //
  // New pedagogy gained:
  //   - the `connect` verb requires picking a SECOND card, forcing students
  //     to articulate inter-concept relationships (systems thinking)
  //   - persistence enables long-arc projects (a unit-spanning Civics realm,
  //     a quarter-long Cell Biology realm) — the print packet of zones +
  //     justifications becomes IEP / parent-meeting evidence
  //
  // Plugin contract: window.AlloHavenArcade.registerMode (mirrors
  // arcade_mode_boss_encounter.js). render(ctx) returns either the launcher
  // card (no active session) or RealmBuilderMain (this mode's session active).
  //
  // Shared helpers consumed via window.AlloHavenArcade.* (extracted from
  // boss_encounter in Phase A): cardHelpers, gradeCardJustification,
  // BUILDING_VERBS.
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
          console.warn('[arcade_mode_realm_builder] AlloHavenArcade registry not found after 5s — plugin not registered.');
        }
      }
    }, 100);
  }

  waitForRegistry(function () {
    if (window.AlloHavenArcade.isRegistered && window.AlloHavenArcade.isRegistered('realm-builder')) {
      return;
    }
    register();
  });

  // ── Constants ──────────────────────────────────────────────────────
  var HAND_SIZE = 5;                   // visible cards at once
  var MAX_VISUAL_TRANSFORMS = 8;       // higher than combat (4) — visual is the point
  var MIN_DECK_FOR_LAUNCH = 3;
  var MILESTONES = [
    { level: 1, zones: 3,  label: 'Settlement', emoji: '📌', tokens: 2 },
    { level: 2, zones: 5,  label: 'Region',     emoji: '🗺️', tokens: 3 },
    { level: 3, zones: 8,  label: 'Continent',  emoji: '🏔️', tokens: 5 },
    { level: 4, zones: 12, label: 'World',      emoji: '🌍', tokens: 8 }
  ];

  // ── Lookup helpers (module-scope so they don't capture component state) ──
  function getBuildingVerbs() {
    return (window.AlloHavenArcade && window.AlloHavenArcade.BUILDING_VERBS) || [];
  }
  function getCardHelpers() {
    return (window.AlloHavenArcade && window.AlloHavenArcade.cardHelpers) || {};
  }
  function getGrader() {
    return window.AlloHavenArcade && window.AlloHavenArcade.gradeCardJustification;
  }

  // ── Generate a stable id for a fresh realm ──
  function newRealmId() {
    return 'realm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  // ── Default realm shape ──
  function emptyRealm() {
    return {
      id: newRealmId(),
      name: '',
      topic: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      canvas: null,           // base64 data URL of the evolving world image
      zones: [],
      milestones: [],         // [{ level, label, achievedAt, tokensAwarded }]
      transformCount: 0,
      isComplete: false
    };
  }

  function register() {
    window.AlloHavenArcade.registerMode('realm-builder', {
      label: 'Realm Builder',
      icon: '🌱',
      blurb: 'Build a world from your cards. Each card finds its place; the realm evolves with every justification. Solo for now.',
      timeCost: 10,
      partnerRequired: false,
      ready: true,
      render: function (ctx) {
        var React = ctx.React || window.React;
        var session = ctx.session;
        var inActiveSession = !!(session && session.modeId === 'realm-builder');
        if (inActiveSession) {
          return React.createElement(RealmBuilderMain, {
            key: 'rb-' + session.startedAt,
            ctx: ctx
          });
        }
        return React.createElement(RealmLauncherCard, { ctx: ctx });
      }
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // LAUNCHER CARD
  // Solo (default) plus class-mode branches when the user is in a live
  // AlloFlow session:
  //   - Host (teacher): "Start class realm" CTA → picks topic → all
  //     students in session see the same evolving canvas
  //   - Student (no class realm active): "Waiting for your teacher" hint
  //   - Student (class realm active): "Join class realm: [topic]" CTA
  // Solo continues to work for everyone, regardless of session state.
  // ────────────────────────────────────────────────────────────────────
  function RealmLauncherCard(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
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

    // In-progress local realm? Solo continuation path.
    var realms = (ctx.realms || []).filter(function (r) { return r && !r.isComplete; });
    var resumable = realms.length > 0 ? realms[realms.length - 1] : null;

    // ── Class-mode subscription ─────────────────────────────────────
    var sessionStateTuple = useState(null);
    var sessionState = sessionStateTuple[0];
    var setSessionState = sessionStateTuple[1];
    useEffect(function () {
      if (!ctx.sessionCode || typeof ctx.sessionSubscribe !== 'function') return;
      var unsubscribe = ctx.sessionSubscribe(function (data) { setSessionState(data); });
      return typeof unsubscribe === 'function' ? unsubscribe : function () {};
    }, [ctx.sessionCode]);

    var classRealm = sessionState && sessionState.realmBuilder;
    var hasOpenClassRealm = !!(classRealm && classRealm.status === 'open');
    var isInSession = !!ctx.sessionCode;

    function handleLaunch() {
      if (disabled) return;
      if (deckSize < MIN_DECK_FOR_LAUNCH) {
        ctx.addToast('You need at least ' + MIN_DECK_FOR_LAUNCH + ' cards to play (decorations + active glossary).');
        return;
      }
      window.__alloHavenRealmResume = null;
      window.__alloHavenRealmClassMode = null;
      ctx.onLaunch(minutesAsked);
    }

    function handleResume() {
      if (disabled || !resumable) return;
      window.__alloHavenRealmResume = { realmId: resumable.id };
      window.__alloHavenRealmClassMode = null;
      ctx.onLaunch(minutesAsked);
    }

    function handleStartClassRealm() {
      if (disabled) return;
      if (deckSize < MIN_DECK_FOR_LAUNCH) {
        ctx.addToast('You need at least ' + MIN_DECK_FOR_LAUNCH + ' cards to play.');
        return;
      }
      if (typeof ctx.sessionUpdate !== 'function') {
        ctx.addToast('Class mode unavailable — Firestore plumbing missing.');
        return;
      }
      window.__alloHavenRealmResume = null;
      window.__alloHavenRealmClassMode = {
        role: 'host',
        hostNickname: ctx.studentNickname || 'Teacher',
        startedAt: new Date().toISOString()
      };
      ctx.onLaunch(minutesAsked);
    }

    function handleJoinClassRealm() {
      if (disabled) return;
      if (!classRealm) {
        ctx.addToast('No class realm is active right now.');
        return;
      }
      if (deckSize < MIN_DECK_FOR_LAUNCH) {
        ctx.addToast('You need at least ' + MIN_DECK_FOR_LAUNCH + ' cards to play.');
        return;
      }
      window.__alloHavenRealmResume = null;
      window.__alloHavenRealmClassMode = {
        role: 'student',
        hostNickname: classRealm.hostNickname || 'Teacher',
        joinFromSession: true,
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
        h('span', { 'aria-hidden': 'true', style: { fontSize: '36px', lineHeight: 1 } }, '🌱'),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: '15px', fontWeight: 700, color: palette.text || '#e2e8f0', marginBottom: '3px' } },
            'Realm Builder'),
          h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', lineHeight: '1.45' } },
            'Pick a topic. Place cards from your room into a world that grows. Each card needs a justification — the realm evolves visually when your reasoning lands.')
        )
      ),
      // ── Class-mode strip ─────────────────────────────────────────
      // Visible when in a live session. Host + student roles each get
      // tailored UX:
      //   - Host, no class realm active → Start CTA
      //   - Host, class realm active → status banner ("Your class realm
      //     is active — students can join")
      //   - Student, no class realm → Waiting hint
      //   - Student, class realm active → prominent Join CTA
      isInSession ? (function () {
        if (ctx.isHost) {
          if (hasOpenClassRealm) {
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
                '🌐 Class realm active · ' + (classRealm.topic || 'untitled')),
              h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', marginBottom: '6px' } },
                'Students in session ' + ctx.sessionCode + ' can now join from their AlloHaven Arcades.'),
              h('button', {
                onClick: handleStartClassRealm,
                disabled: disabled || !canAfford,
                'aria-label': 'Re-enter your active class realm',
                style: {
                  background: 'transparent', color: palette.accent || '#60a5fa',
                  border: '1px solid ' + (palette.accent || '#60a5fa'),
                  borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700,
                  cursor: (disabled || !canAfford) ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  opacity: (disabled || !canAfford) ? 0.6 : 1
                }
              }, '↻ Re-enter as host (' + tokensCost + ' 🪙)')
            );
          }
          // Host, no active class realm — Start CTA
          return h('button', {
            onClick: handleStartClassRealm,
            disabled: disabled || !canAfford,
            'aria-label': 'Start a class realm for session ' + ctx.sessionCode,
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
              h('div', { style: { fontSize: '13px', fontWeight: 700 } }, 'Start class realm'),
              h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', marginTop: '2px' } },
                'Pick a topic; students in session ' + ctx.sessionCode + ' join from their Arcades. Same ' + tokensCost + ' 🪙 cost.')
            )
          );
        }
        // Student
        if (hasOpenClassRealm) {
          return h('button', {
            onClick: handleJoinClassRealm,
            disabled: disabled || !canAfford,
            'aria-label': 'Join class realm: ' + (classRealm.topic || 'untitled'),
            style: {
              display: 'flex', gap: '12px', alignItems: 'center',
              width: '100%',
              padding: '10px 12px',
              background: canAfford && !disabled ? (palette.accent || '#60a5fa') : 'transparent',
              color: canAfford && !disabled ? (palette.onAccent || '#0f172a') : (palette.textDim || '#cbd5e1'),
              border: '1.5px solid ' + (palette.accent || '#60a5fa'),
              borderRadius: '8px',
              cursor: (disabled || !canAfford) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
              marginBottom: '10px',
              opacity: (disabled || !canAfford) ? 0.6 : 1
            }
          },
            h('span', { 'aria-hidden': 'true', style: { fontSize: '20px' } }, '🌐'),
            h('span', { style: { flex: 1 } },
              h('div', { style: { fontSize: '13px', fontWeight: 700 } },
                'Join class realm: ' + (classRealm.topic || 'untitled')),
              h('div', { style: { fontSize: '11px', opacity: 0.85, marginTop: '2px' } },
                (classRealm.zones || []).length + ' zone' + ((classRealm.zones || []).length === 1 ? '' : 's') + ' so far · ' + tokensCost + ' 🪙 to join')
            )
          );
        }
        // Student, no active class realm
        return h('div', {
          role: 'status',
          style: {
            padding: '8px 12px', marginBottom: '10px',
            background: (palette.bg || '#0f172a') + 'aa',
            border: '1px dashed ' + (palette.border || '#334155'),
            borderRadius: '8px',
            fontSize: '11px', color: palette.textDim || '#cbd5e1', fontStyle: 'italic',
            lineHeight: '1.45'
          }
        }, '🌐 Waiting for your teacher to start a class realm in session ' + ctx.sessionCode + '. You can still build solo below.');
      })() : null,
      // Resume row, only when there's an in-progress local realm
      resumable ? h('button', {
        onClick: handleResume,
        disabled: disabled || !canAfford,
        'aria-label': 'Continue your realm: ' + (resumable.name || resumable.topic || 'untitled'),
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
            'Continue: ' + (resumable.name || resumable.topic || 'untitled realm')),
          h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', marginTop: '2px' } },
            (resumable.zones || []).length + ' zone' + ((resumable.zones || []).length === 1 ? '' : 's') + ' placed · ' + tokensCost + ' 🪙 to resume')
        )
      ) : null,
      h('button', {
        onClick: handleLaunch,
        disabled: disabled || !canAfford,
        'aria-label': 'Start a new realm (solo)',
        style: {
          display: 'flex', gap: '12px', alignItems: 'center',
          width: '100%',
          padding: '10px 12px',
          background: canAfford && !disabled && !isInSession ? (palette.accent || '#60a5fa') : 'transparent',
          color: canAfford && !disabled && !isInSession ? (palette.onAccent || '#0f172a') : (palette.text || '#e2e8f0'),
          border: '1.5px solid ' + (palette.accent || '#60a5fa'),
          borderRadius: '8px',
          cursor: (disabled || !canAfford) ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          opacity: (disabled || !canAfford) ? 0.6 : 1
        }
      },
        h('span', { 'aria-hidden': 'true', style: { fontSize: '20px' } }, '🌱'),
        h('span', { style: { flex: 1 } },
          h('div', { style: { fontSize: '13px', fontWeight: 700 } },
            isInSession ? 'Solo realm (just for you)' : (resumable ? 'Start a new realm' : 'Start building')),
          h('div', { style: { fontSize: '11px', opacity: 0.85, marginTop: '2px' } },
            tokensCost + ' 🪙 · ' + minutesAsked + ' min · ' + deckSize + ' cards in deck')
        )
      ),
      deckSize < MIN_DECK_FOR_LAUNCH ? h('div', {
        style: { fontSize: '11px', color: palette.warn || '#f59e0b', marginTop: '8px', fontStyle: 'italic', lineHeight: '1.45' }
      }, 'You need at least ' + MIN_DECK_FOR_LAUNCH + ' cards to build. Earn decorations or generate a unit glossary first.') : null
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // ACTIVE BUILD COMPONENT
  // All hooks live here so they run unconditionally.
  // ────────────────────────────────────────────────────────────────────
  function RealmBuilderMain(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useRef = React.useRef;
    var useMemo = React.useMemo;

    var ctx = props.ctx;
    var palette = ctx.palette || {};
    var verbs = getBuildingVerbs();
    var helpers = getCardHelpers();
    var grader = getGrader();

    // Resume-sentinel: if the launcher set it, hydrate from that realm.
    var resumeRef = useRef(null);
    if (resumeRef.current === null) {
      resumeRef.current = window.__alloHavenRealmResume || null;
      window.__alloHavenRealmResume = null;
    }
    var resumeId = resumeRef.current && resumeRef.current.realmId;
    var hostRealms = ctx.realms || [];
    var hydrate = resumeId ? hostRealms.filter(function (r) { return r.id === resumeId; })[0] : null;

    // ── Class-mode sentinel ────────────────────────────────────────
    // Captured ONCE on mount; cleared after read so re-mounts don't
    // re-trigger. Mirrors arcade_mode_boss_encounter's pattern. Null in
    // solo, { role: 'host'|'student', hostNickname, joinFromSession,
    // startedAt } in class mode.
    var classModeRef = useRef(null);
    if (classModeRef.current === null) {
      classModeRef.current = window.__alloHavenRealmClassMode || { role: 'solo' };
      window.__alloHavenRealmClassMode = null;
    }
    var classRole = (classModeRef.current && classModeRef.current.role) || 'solo';
    var isClassHost = classRole === 'host';
    var isClassStudent = classRole === 'student';
    var isClass = isClassHost || isClassStudent;
    var nickname = ctx.studentNickname || (isClassHost ? 'Teacher' : 'Student');

    // ── Class-mode session subscription ─────────────────────────────
    // Student: this drives the rendered realm (derived from session doc).
    // Host: useful for reading back the current submissions queue.
    // Solo: skipped — sessionCode will be null.
    var sessionStateTuple = useState(null);
    var sessionState = sessionStateTuple[0];
    var setSessionState = sessionStateTuple[1];
    useEffect(function () {
      if (!isClass) return;
      if (!ctx.sessionCode || typeof ctx.sessionSubscribe !== 'function') return;
      var unsubscribe = ctx.sessionSubscribe(function (data) { setSessionState(data); });
      return typeof unsubscribe === 'function' ? unsubscribe : function () {};
    }, [isClass, ctx.sessionCode]);

    // ── Build deck once per session (decorations + glossary) ──
    var deck = useMemo(function () {
      var decoCards = (ctx.decorations || []).map(helpers.decorationToCard || function (d) { return null; })
        .filter(function (c) { return !!c; });
      var glossCards = (ctx.glossaryEntries || []).map(function (g, i) {
        return helpers.glossaryEntryToCard ? helpers.glossaryEntryToCard(g, i) : null;
      }).filter(function (c) { return !!c; });
      return decoCards.concat(glossCards);
    }, []); // eslint-disable-line

    // ── Realm state ──
    // Solo + host: canonical state lives here. Host also broadcasts to
    // session.realmBuilder on every change.
    // Student: this local state is unused for the realm itself (the realm
    // is derived from sessionState.realmBuilder below) but we still keep
    // the slot so hooks order stays stable across role switches.
    var realmTuple = useState(function () {
      if (hydrate) return JSON.parse(JSON.stringify(hydrate)); // deep clone
      return emptyRealm();
    });
    var localRealm = realmTuple[0];
    var setLocalRealm = realmTuple[1];

    // Class-student realm: derived from session.realmBuilder, not local.
    var classRealm = sessionState && sessionState.realmBuilder
      ? sessionState.realmBuilder
      : null;

    // The realm the rest of this component reads. Student → session-derived;
    // solo + host → local state.
    var realm = isClassStudent
      ? (classRealm || emptyRealm())
      : localRealm;

    // Universal setRealm. Student writes are constrained — most state
    // updates from the play loop won't apply (the host owns the realm),
    // so student-side calls become no-ops with one exception (we still
    // track local picked-card / lastFeedback / submitting in component
    // state, those don't go through setRealm).
    function setRealm(updater) {
      if (isClassStudent) return; // host is the source of truth
      setLocalRealm(updater);
    }

    // Phase machine
    // 'topic' → name + topic input (host-only; student skips this)
    // 'gen-canvas' → loading starter image (host runs the call; student waits on session sync)
    // 'play' → main loop
    // 'complete' → terminal screen with print + close
    var phaseTuple = useState(function () {
      if (isClassStudent) return 'gen-canvas'; // overridden each render below
      if (hydrate && hydrate.topic && hydrate.canvas) return 'play';
      if (hydrate && hydrate.topic) return 'gen-canvas';
      return 'topic';
    });
    var localPhase = phaseTuple[0];
    var setLocalPhase = phaseTuple[1];

    // Student phase derives from the session realm: canvas present → play,
    // status closed → complete, else gen-canvas. Host/solo use localPhase.
    var phase;
    if (isClassStudent) {
      if (classRealm && classRealm.status === 'closed') phase = 'complete';
      else if (classRealm && classRealm.canvas) phase = 'play';
      else phase = 'gen-canvas';
    } else {
      phase = localPhase;
    }
    function setPhase(p) {
      if (isClassStudent) return;
      setLocalPhase(p);
    }

    var topicDraftTuple = useState(realm.topic || '');
    var topicDraft = topicDraftTuple[0];
    var setTopicDraft = topicDraftTuple[1];

    var nameDraftTuple = useState(realm.name || '');
    var nameDraft = nameDraftTuple[0];
    var setNameDraft = nameDraftTuple[1];

    var canvasLoadingTuple = useState(false);
    var canvasLoading = canvasLoadingTuple[0];
    var setCanvasLoading = canvasLoadingTuple[1];

    var canvasErrorTuple = useState(null);
    var canvasError = canvasErrorTuple[0];
    var setCanvasError = canvasErrorTuple[1];

    // ── Per-turn UI state ──
    var pickedCardTuple = useState(null);
    var pickedCard = pickedCardTuple[0];
    var setPickedCard = pickedCardTuple[1];

    var pickedVerbTuple = useState(null);
    var pickedVerb = pickedVerbTuple[0];
    var setPickedVerb = pickedVerbTuple[1];

    var partnerCardTuple = useState(null);   // for the 'connect' verb
    var partnerCard = partnerCardTuple[0];
    var setPartnerCard = partnerCardTuple[1];

    var justificationTuple = useState('');
    var justification = justificationTuple[0];
    var setJustification = justificationTuple[1];

    var submittingTuple = useState(false);
    var submitting = submittingTuple[0];
    var setSubmitting = submittingTuple[1];

    var lastFeedbackTuple = useState(null);  // { score, ackText, followUp, cardName, verbLabel }
    var lastFeedback = lastFeedbackTuple[0];
    var setLastFeedback = lastFeedbackTuple[1];

    var transformingTuple = useState(false);
    var transforming = transformingTuple[0];
    var setTransforming = transformingTuple[1];

    // ── Voice justification state (Phase G — parity with Boss Encounter) ──
    // Two engines via window.AlloFlowVoice:
    //   'webspeech': initWebSpeechCapture appends transcripts as the
    //     student speaks (free, browser-native; Chrome routes through Google).
    //   'whisper' / 'gemini': recordAudioBlob + transcribeAudio. Whisper is
    //     on-device once cached; Gemini is server-side per call.
    // Engine selected by saved Voice Quality preference; 'auto' picks
    // Whisper if loaded, else Gemini, else Web Speech.
    var voiceModeTuple = useState('idle'); // 'idle' | 'webspeech-live' | 'recording' | 'transcribing'
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
    // Cleanup on unmount: stop any active capture so the mic releases.
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

    // ── Hand: a rotating subset of `deck` ──
    // Mirrors the boss-encounter pattern. Re-shuffled on demand; cards
    // already-played stay in the deck (a card can be placed in multiple
    // zones with different verbs).
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

    // ── Persistence: every realm change emits to the AlloHaven host ──
    // Solo + class-host: writes locally so the realm shows in My Realms.
    // Class-student: skipped (host owns the canonical state).
    useEffect(function () {
      if (isClassStudent) return;
      if (typeof ctx.onRealmUpdate === 'function') {
        ctx.onRealmUpdate(localRealm);
      }
    }, [localRealm]); // eslint-disable-line

    // ── Class-mode: HOST broadcasts the realm to the session doc ──
    // Student clients subscribe and re-render when this lands. We trim
    // the broadcast payload — the canvas image is the heaviest field but
    // also the one students need to see, so we keep it; we drop the
    // verbose `raw` references inside zones if they sneak in.
    useEffect(function () {
      if (!isClassHost) return;
      if (typeof ctx.sessionUpdate !== 'function') return;
      // Only broadcast once we have a topic — there's nothing useful to
      // share before that point (and students would see noise).
      if (!localRealm.topic) return;
      var payload = {
        realmBuilder: {
          status: localRealm.isComplete ? 'closed' : 'open',
          hostNickname: nickname,
          startedAt: localRealm.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          realmId: localRealm.id,
          topic: localRealm.topic || '',
          name: localRealm.name || '',
          canvas: localRealm.canvas || null,
          zones: (localRealm.zones || []).map(function (z) {
            // Strip any nested raw refs that might have crept in.
            var copy = Object.assign({}, z);
            delete copy.raw;
            return copy;
          }),
          milestones: localRealm.milestones || [],
          transformCount: localRealm.transformCount || 0,
          isComplete: !!localRealm.isComplete
        }
      };
      Promise.resolve(ctx.sessionUpdate(payload)).catch(function () {
        // Silent — broadcast failures don't block local play.
      });
    }, [localRealm, isClassHost]); // eslint-disable-line

    // ── Class-mode STUDENT: claim the class-reward when host wraps up ──
    // Host writes session.realmBuilder.classRewardTokens + classRewardKey
    // when ending a class realm. Each student claims once per key via
    // metadata-based dedupe — checking ctx.getEarnings() for a prior
    // entry with the same realm-* key.
    var claimedRewardRef = useRef({});
    useEffect(function () {
      if (!isClassStudent) return;
      if (!sessionState || !sessionState.realmBuilder) return;
      var rb = sessionState.realmBuilder;
      var key = rb.classRewardKey;
      var amount = rb.classRewardTokens;
      if (!key || !amount) return;
      if (claimedRewardRef.current[key]) return;
      // Server-of-record dedupe: scan earnings for matching key.
      if (typeof ctx.getEarnings === 'function') {
        var earnings = ctx.getEarnings() || [];
        var alreadyClaimed = earnings.some(function (e) {
          return e && e.metadata && e.metadata.classRewardKey === key;
        });
        if (alreadyClaimed) {
          claimedRewardRef.current[key] = true;
          return;
        }
      }
      claimedRewardRef.current[key] = true;
      if (typeof ctx.onAwardTokens === 'function') {
        ctx.onAwardTokens(amount, 'realm-class-reward', { classRewardKey: key, realmId: rb.realmId });
      }
    }, [sessionState, isClassStudent]); // eslint-disable-line

    // ── Class-mode HOST: drain student submissions ──
    // Each student writes their graded play to session.realmBuilder.submissions[uuid].
    // Host iterates the queue, applies each one as a zone (just like a
    // local play), then clears the consumed submission via Firestore
    // delete-sentinel so the queue stays bounded.
    var processedSubsRef = useRef({});
    useEffect(function () {
      if (!isClassHost) return;
      if (!sessionState || !sessionState.realmBuilder) return;
      var subs = sessionState.realmBuilder.submissions || {};
      var keys = Object.keys(subs);
      if (keys.length === 0) return;
      // Order by submittedAt so simultaneous submits stay deterministic
      keys.sort(function (a, b) {
        var sa = subs[a] && subs[a].submittedAt || '';
        var sb = subs[b] && subs[b].submittedAt || '';
        return sa.localeCompare(sb);
      });
      var processed = processedSubsRef.current;
      keys.forEach(function (k) {
        if (processed[k]) return;
        var sub = subs[k];
        if (!sub || !sub.cardName || !sub.verb) return;
        processed[k] = true;
        applyZoneFromSubmission(sub);
        // Clear the submission so the queue stays small. Use a sentinel
        // that Firestore treats as a delete (set to null in this stack;
        // the host's set-merge wrapper accepts nulls as deletions).
        var clearPayload = { realmBuilder: { submissions: {} } };
        clearPayload.realmBuilder.submissions[k] = null;
        Promise.resolve(ctx.sessionUpdate(clearPayload)).catch(function () {});
      });
    }, [sessionState, isClassHost]); // eslint-disable-line

    // Apply a class-student submission as a zone on the host. Mirrors
    // applyZone() but reads card+verb+text from the submission record
    // instead of component picked-state. Visual evolution still runs.
    function applyZoneFromSubmission(sub) {
      var score = sub.score || 1;
      var willTransform = score >= 11;
      var isResonant = score >= 18;
      var nowIso = new Date().toISOString();
      var verbDef = (verbs.filter(function (v) { return v.id === sub.verb; })[0]) || { id: sub.verb, label: sub.verbLabel, editPrompt: '' };
      var newZone = {
        id: 'zone-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        cardId: sub.cardId,
        cardName: sub.cardName,
        cardSource: sub.cardSource,
        cardImageBase64: sub.cardImageBase64 || null,
        verb: sub.verb,
        verbLabel: sub.verbLabel,
        partnerCardId: sub.partnerCardId || null,
        partnerCardName: sub.partnerCardName || null,
        justification: sub.justification || '',
        score: score,
        ackText: sub.ackText || '',
        followUp: sub.followUp || '',
        addedAt: nowIso,
        transformed: false,
        resonant: isResonant,
        contributorNickname: sub.nickname || ''
      };
      // Use functional update so we don't race against other submissions
      // landing in the same render cycle.
      setLocalRealm(function (prev) {
        var nextZoneCount = (prev.zones || []).length + 1;
        var alreadyLevels = (prev.milestones || []).map(function (m) { return m.level; });
        var newMilestones = MILESTONES.filter(function (m) {
          return nextZoneCount >= m.zones && alreadyLevels.indexOf(m.level) === -1;
        }).map(function (m) {
          return { level: m.level, label: m.label, emoji: m.emoji, zones: m.zones, achievedAt: nowIso, tokensAwarded: m.tokens };
        });
        if (newMilestones.length > 0 && typeof ctx.onAwardTokens === 'function') {
          newMilestones.forEach(function (m) {
            ctx.onAwardTokens(m.tokens, 'realm-milestone', { realmId: prev.id, level: m.level });
            ctx.addToast(m.emoji + ' ' + m.label + ' unlocked (class) · +' + m.tokens + ' 🪙');
          });
        }
        var isComplete = prev.isComplete || nextZoneCount >= MILESTONES[MILESTONES.length - 1].zones;
        return Object.assign({}, prev, {
          zones: (prev.zones || []).concat([newZone]),
          milestones: (prev.milestones || []).concat(newMilestones),
          isComplete: isComplete,
          updatedAt: nowIso
        });
      });
      // Toast the host so they see a contribution
      ctx.addToast('🌐 ' + (sub.nickname || 'A student') + ' placed ' + sub.cardName + ' (' + sub.verbLabel + ', ' + score + '/20)');
      if (willTransform) {
        // Visual evolution — host's machine handles all image edits in
        // class mode. Pass the verb def so the right editPrompt is used.
        applyVisualEvolution(newZone, verbDef, isResonant);
      }
    }

    // ──────────────────────────────────────────────────────────────────
    // PHASE: TOPIC
    // ──────────────────────────────────────────────────────────────────
    function startNewRealm() {
      var topic = (topicDraft || '').trim();
      var name = (nameDraft || '').trim() || topic;
      if (topic.length < 2) {
        ctx.addToast('Give your realm a topic — what world are you building?');
        return;
      }
      setRealm(function (prev) {
        return Object.assign({}, prev, {
          topic: topic,
          name: name,
          updatedAt: new Date().toISOString()
        });
      });
      setPhase('gen-canvas');
    }

    // ──────────────────────────────────────────────────────────────────
    // PHASE: GEN-CANVAS — Imagen-generated establishing scene
    // ──────────────────────────────────────────────────────────────────
    useEffect(function () {
      if (phase !== 'gen-canvas') return;
      if (realm.canvas) { setPhase('play'); return; } // already have one
      // Class-student: don't generate; the host owns canvas creation.
      // The student's phase just signals "waiting for canvas" until the
      // session sync delivers one.
      if (isClassStudent) return;
      if (typeof ctx.callImagen !== 'function') {
        setCanvasError('Image generator unavailable. You can still build — the canvas will stay blank.');
        setPhase('play');
        return;
      }
      setCanvasLoading(true);
      var prompt = 'An evocative establishing scene for a world about "' + realm.topic + '". '
                 + 'Soft watercolor, painterly, single landscape with depth — foreground, midground, distant horizon. '
                 + 'No text, no labels, no characters, no boss creature. Inviting and open, room for new elements to be added.';
      Promise.resolve(ctx.callImagen(prompt))
        .then(function (result) {
          var b64 = (typeof result === 'string') ? result
                  : (result && result.imageBase64) ? result.imageBase64
                  : null;
          if (!b64) throw new Error('empty result');
          var img = (b64.indexOf('data:') === 0) ? b64 : ('data:image/png;base64,' + b64);
          setRealm(function (prev) { return Object.assign({}, prev, { canvas: img, updatedAt: new Date().toISOString() }); });
          setCanvasLoading(false);
          setPhase('play');
        })
        .catch(function (err) {
          setCanvasError('Could not generate the canvas (' + ((err && err.message) || 'unknown') + '). You can still build — the canvas will stay blank.');
          setCanvasLoading(false);
          setPhase('play');
        });
    }, [phase]); // eslint-disable-line

    // ──────────────────────────────────────────────────────────────────
    // VOICE HELPERS (Phase G — parity with Boss Encounter)
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
        lang: 'en-US',
        continuous: true,
        interimResults: false,
        onTranscript: function (text) {
          var trimmed = (text || '').trim();
          if (!trimmed || trimmed === lastFinal) return;
          lastFinal = trimmed;
          setJustification(function (prev) {
            var existing = (prev || '').trim();
            return existing ? existing + ' ' + trimmed : trimmed;
          });
        },
        onError: function (e) {
          setVoiceError(e && e.error ? e.error : 'Voice error');
          stopVoiceLive();
        },
        onEnd: function () {
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

    // ──────────────────────────────────────────────────────────────────
    // PHASE: PLAY — submit a card
    // ──────────────────────────────────────────────────────────────────
    function submitZone() {
      if (!pickedCard || !pickedVerb) {
        ctx.addToast('Pick a card and a way to place it first.');
        return;
      }
      if (pickedVerb.id === 'connect' && !partnerCard) {
        ctx.addToast('Pick a second card to connect to.');
        return;
      }
      var text = (justification || '').trim();
      if (text.length < 10) {
        ctx.addToast('Write at least a sentence about how this card fits the realm.');
        return;
      }
      if (typeof grader !== 'function') {
        ctx.addToast('AI grader unavailable. Try again later.');
        return;
      }
      setSubmitting(true);

      grader(ctx, {
        card: pickedCard,
        verb: pickedVerb,
        justification: text,
        topic: realm.topic,
        frameAs: 'building',
        context: { existingZoneCount: (realm.zones || []).length }
      }).then(function (parsed) {
        if (isClassStudent) {
          submitToClassQueue(parsed);
        } else {
          applyZone(parsed);
        }
      }).catch(function (err) {
        setSubmitting(false);
        ctx.addToast('Grading failed: ' + ((err && err.message) || 'unknown'));
      });
    }

    // Class-student submission: writes the GRADED play to a submissions
    // map keyed by uuid. The host's effect (below) drains this queue and
    // applies each entry as a zone, running the canvas evolution on its
    // own machine so we don't fan-out image-edit calls.
    function submitToClassQueue(parsed) {
      if (typeof ctx.sessionUpdate !== 'function') {
        ctx.addToast('Class sync unavailable. Try solo mode.');
        setSubmitting(false);
        return;
      }
      var subId = 'rs-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      var payload = {
        realmBuilder: {
          submissions: {}
        }
      };
      payload.realmBuilder.submissions[subId] = {
        subId: subId,
        nickname: nickname,
        cardId: pickedCard.id,
        cardName: pickedCard.name,
        cardSource: pickedCard.source,
        cardImageBase64: pickedCard.imageBase64 || null,
        verb: pickedVerb.id,
        verbLabel: pickedVerb.label,
        partnerCardId: partnerCard ? partnerCard.id : null,
        partnerCardName: partnerCard ? partnerCard.name : null,
        justification: (justification || '').trim(),
        score: parsed.score || 1,
        ackText: parsed.ackText || '',
        followUp: parsed.followUp || '',
        submittedAt: new Date().toISOString()
      };
      Promise.resolve(ctx.sessionUpdate(payload)).then(function () {
        // Local feedback so the student sees their score immediately,
        // even before the host applies the zone.
        var sc = parsed.score || 1;
        setLastFeedback({
          score: sc,
          ackText: parsed.ackText || '',
          followUp: parsed.followUp || '',
          cardName: pickedCard.name,
          verbLabel: pickedVerb.label,
          resonant: sc >= 18
        });
        // Reset turn UI
        setPickedCard(null);
        setPickedVerb(null);
        setPartnerCard(null);
        setJustification('');
        setSubmitting(false);
        refreshHand();
      }).catch(function (err) {
        setSubmitting(false);
        ctx.addToast('Submit failed: ' + ((err && err.message) || 'unknown'));
      });
    }

    function applyZone(parsed) {
      var score = parsed.score || 1;
      var willTransform = score >= 11;
      var isResonant = score >= 18;
      var nowIso = new Date().toISOString();

      var newZone = {
        id: 'zone-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        cardId: pickedCard.id,
        cardName: pickedCard.name,
        cardSource: pickedCard.source,
        cardImageBase64: pickedCard.imageBase64 || null,
        verb: pickedVerb.id,
        verbLabel: pickedVerb.label,
        partnerCardId: partnerCard ? partnerCard.id : null,
        partnerCardName: partnerCard ? partnerCard.name : null,
        justification: justification.trim(),
        score: score,
        ackText: parsed.ackText || '',
        followUp: parsed.followUp || '',
        addedAt: nowIso,
        transformed: false,            // updated when image edit resolves
        resonant: isResonant,
        // Class mode: tag the host's own zone with their nickname so the
        // shared feed shows attribution. Solo: omit (no other contributors).
        contributorNickname: isClass ? nickname : null
      };

      // Compute new milestone unlocks
      var nextZoneCount = realm.zones.length + 1;
      var alreadyAchievedLevels = (realm.milestones || []).map(function (m) { return m.level; });
      var newMilestones = MILESTONES.filter(function (m) {
        return nextZoneCount >= m.zones && alreadyAchievedLevels.indexOf(m.level) === -1;
      }).map(function (m) {
        return { level: m.level, label: m.label, emoji: m.emoji, zones: m.zones, achievedAt: nowIso, tokensAwarded: m.tokens };
      });

      // Award tokens for each new milestone hit this turn
      if (newMilestones.length > 0 && typeof ctx.onAwardTokens === 'function') {
        newMilestones.forEach(function (m) {
          ctx.onAwardTokens(m.tokens, 'realm-milestone', { realmId: realm.id, level: m.level });
          ctx.addToast(m.emoji + ' ' + m.label + ' unlocked · +' + m.tokens + ' 🪙');
        });
      }

      var isComplete = realm.isComplete || nextZoneCount >= MILESTONES[MILESTONES.length - 1].zones;

      setRealm(function (prev) {
        return Object.assign({}, prev, {
          zones: prev.zones.concat([newZone]),
          milestones: (prev.milestones || []).concat(newMilestones),
          isComplete: isComplete,
          updatedAt: nowIso
        });
      });

      setLastFeedback({
        score: score,
        ackText: parsed.ackText || '',
        followUp: parsed.followUp || '',
        cardName: pickedCard.name,
        verbLabel: pickedVerb.label,
        resonant: isResonant
      });

      // Reset turn UI
      setPickedCard(null);
      setPickedVerb(null);
      setPartnerCard(null);
      setJustification('');
      setSubmitting(false);
      refreshHand();

      // Visual evolution (fire-and-forget) — only when score lands
      if (willTransform) {
        applyVisualEvolution(newZone, pickedVerb, isResonant);
      }
    }

    // ──────────────────────────────────────────────────────────────────
    // VISUAL EVOLUTION — image-to-image edit on the realm canvas.
    // Mirrors boss-encounter's applyVisualSparkTransform but runs on every
    // mid+ score (vs only criticals) and uses constructive editPrompts.
    // ──────────────────────────────────────────────────────────────────
    function applyVisualEvolution(zone, verb, isResonant) {
      if (realm.transformCount >= MAX_VISUAL_TRANSFORMS) return;
      if (!realm.canvas) return;
      if (typeof window.callGeminiImageEdit !== 'function') return;

      var verbEdit = verb.editPrompt || 'with a subtle but visible change to one region of the scene';
      var cardName = zone.cardName || 'a new element';
      var rawBase64 = realm.canvas;
      var prefixMatch = rawBase64.match(/^data:[^;]+;base64,(.+)$/);
      if (prefixMatch) rawBase64 = prefixMatch[1];

      var intensity = isResonant ? 'a bold, unmistakable change' : 'a small but visible change';
      var editPrompt = 'The same realm-scene about "' + realm.topic + '", ' + verbEdit
                     + '. The change reflects a student adding "' + cardName
                     + '" to the realm. Maintain the same overall composition, lighting, and style; '
                     + intensity + '. No text, no labels.';

      setTransforming(true);
      setRealm(function (prev) { return Object.assign({}, prev, { transformCount: (prev.transformCount || 0) + 1 }); });

      Promise.resolve(window.callGeminiImageEdit(editPrompt, rawBase64))
        .then(function (result) {
          var newImg = (typeof result === 'string') ? result
                     : (result && result.imageBase64) ? result.imageBase64
                     : null;
          if (newImg) {
            if (newImg.indexOf('data:') !== 0) newImg = 'data:image/png;base64,' + newImg;
            setRealm(function (prev) {
              // Mark the just-added zone as transformed
              var zones = prev.zones.map(function (z) {
                return z.id === zone.id ? Object.assign({}, z, { transformed: true }) : z;
              });
              return Object.assign({}, prev, {
                canvas: newImg,
                zones: zones,
                updatedAt: new Date().toISOString()
              });
            });
          }
          setTransforming(false);
        })
        .catch(function () {
          // Silent fail — visual evolution is decorative
          setTransforming(false);
        });
    }

    // ──────────────────────────────────────────────────────────────────
    // EXIT: mark realm complete and close the arcade session
    // ──────────────────────────────────────────────────────────────────
    function endRealm() {
      var nowIso = new Date().toISOString();
      setRealm(function (prev) { return Object.assign({}, prev, { isComplete: true, updatedAt: nowIso }); });
      setPhase('complete');
      // Class-host wrap-up: write a class-reward token amount to the
      // session doc. Students' clients read this on next sync and claim
      // via ctx.onAwardTokens (with metadata-based dedupe so refreshing
      // doesn't double-pay). Reward scales with milestones reached.
      if (isClassHost && typeof ctx.sessionUpdate === 'function') {
        var milestonesHit = (localRealm.milestones || []).length;
        var classReward = Math.max(2, milestonesHit * 2); // floor 2, +2 per milestone
        Promise.resolve(ctx.sessionUpdate({
          realmBuilder: {
            classRewardTokens: classReward,
            classRewardKey: 'realm-' + (localRealm.id || 'unknown') + '-' + nowIso,
            classRewardWrittenAt: nowIso
          }
        })).catch(function () {});
      }
    }

    function closeArcade() {
      if (typeof ctx.onClose === 'function') ctx.onClose();
    }

    // ──────────────────────────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────────────────────────
    function renderHeader() {
      var classBadge = null;
      if (isClassHost) {
        classBadge = h('span', {
          style: { fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: palette.accent + '22' || 'rgba(96,165,250,0.18)', color: palette.accent || '#60a5fa', border: '1px solid ' + (palette.accent || '#60a5fa'), letterSpacing: '0.04em', textTransform: 'uppercase' }
        }, '🌐 Hosting');
      } else if (isClassStudent) {
        classBadge = h('span', {
          style: { fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: palette.accent + '22' || 'rgba(96,165,250,0.18)', color: palette.accent || '#60a5fa', border: '1px solid ' + (palette.accent || '#60a5fa'), letterSpacing: '0.04em', textTransform: 'uppercase' }
        }, '🌐 Joined · ' + ((realm && realm.hostNickname) || 'Teacher'));
      }
      return h('div', {
        style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }
      },
        h('span', { 'aria-hidden': 'true', style: { fontSize: '28px' } }, '🌱'),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('h2', { style: { margin: 0, fontSize: '17px', fontWeight: 700, color: palette.text || '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' } },
            h('span', null, realm.name || realm.topic || 'New realm'),
            classBadge),
          realm.topic ? h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1' } },
            (realm.zones || []).length + ' zone' + ((realm.zones || []).length === 1 ? '' : 's') + ' placed' +
            ((realm.milestones || []).length > 0 ? ' · last milestone: ' + realm.milestones[realm.milestones.length - 1].label : '')
          ) : null
        ),
        // Wrap-up: solo + host only. Students wait for the host to wrap;
        // when status flips to 'closed' their phase becomes 'complete'
        // automatically and they see the recap screen.
        (phase === 'play' && !isClassStudent) ? h('button', {
          onClick: endRealm,
          'aria-label': isClassHost ? 'Wrap up this class realm (saves to your room and rewards students)' : 'Wrap up this realm',
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
            'What world are you building?'),
          h('p', { style: { margin: '0 0 14px 0', color: palette.textDim || '#cbd5e1', fontSize: '12px', lineHeight: '1.55' } },
            'A topic, era, ecosystem, system, or theme. Examples: "the cell", "ancient Rome", "the water cycle", "a tide pool", "a small business".'),
          h('label', { htmlFor: 'rb-topic', style: { display: 'block', fontSize: '10px', fontWeight: 700, color: palette.textMute || palette.textDim || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' } }, 'Topic'),
          h('input', {
            id: 'rb-topic',
            type: 'text',
            value: topicDraft,
            onChange: function (e) { setTopicDraft(e.target.value.slice(0, 80)); },
            placeholder: 'the topic of your realm',
            autoFocus: true,
            style: { width: '100%', padding: '8px 10px', fontSize: '13px', fontFamily: 'inherit', color: palette.text || '#e2e8f0', background: palette.bg || '#0f172a', border: '1px solid ' + (palette.border || '#334155'), borderRadius: '6px', boxSizing: 'border-box', marginBottom: '12px' }
          }),
          h('label', { htmlFor: 'rb-name', style: { display: 'block', fontSize: '10px', fontWeight: 700, color: palette.textMute || palette.textDim || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' } }, 'Realm name (optional)'),
          h('input', {
            id: 'rb-name',
            type: 'text',
            value: nameDraft,
            onChange: function (e) { setNameDraft(e.target.value.slice(0, 80)); },
            placeholder: 'leave blank to use the topic',
            style: { width: '100%', padding: '8px 10px', fontSize: '13px', fontFamily: 'inherit', color: palette.text || '#e2e8f0', background: palette.bg || '#0f172a', border: '1px solid ' + (palette.border || '#334155'), borderRadius: '6px', boxSizing: 'border-box', marginBottom: '14px' }
          }),
          h('button', {
            onClick: startNewRealm,
            disabled: topicDraft.trim().length < 2,
            style: { padding: '8px 16px', fontSize: '13px', fontWeight: 700, background: palette.accent || '#60a5fa', color: palette.onAccent || '#0f172a', border: 'none', borderRadius: '8px', cursor: topicDraft.trim().length < 2 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: topicDraft.trim().length < 2 ? 0.6 : 1 }
          }, '🌍 Generate the canvas →')
        )
      );
    }

    function renderGenCanvasPhase() {
      var msg = isClassStudent
        ? 'Waiting for ' + ((realm && realm.hostNickname) || 'your teacher') + ' to set up the realm…'
        : 'Generating an establishing scene for "' + (realm.topic || '?') + '"…';
      return h('div', { style: { padding: '12px' } },
        renderHeader(),
        h('div', {
          'aria-busy': 'true',
          'aria-live': 'polite',
          style: { padding: '40px 16px', background: palette.surface || '#1e293b', border: '1px solid ' + (palette.border || '#334155'), borderRadius: '10px', textAlign: 'center' }
        },
          h('div', { style: { fontSize: '40px', marginBottom: '10px' } }, '🌍'),
          h('p', { style: { color: palette.textDim || '#cbd5e1', fontSize: '13px', fontStyle: 'italic', margin: 0, lineHeight: '1.55' } }, msg)
        )
      );
    }

    function renderCard(card, opts) {
      opts = opts || {};
      var picked = !!opts.picked;
      var onClick = opts.onClick || function () {};
      // Glossary tier badge — shows the curriculum tier (Tier 1/2/3) in
      // the corner so students see why a card is in their hand.
      var tierShort = card.tier ? String(card.tier).replace(/^Tier\s*/i, 'T') : '';
      return h('button', {
        key: 'card-' + card.id + (opts.suffix || ''),
        onClick: onClick,
        className: 'ah-arcade-card' + (picked ? ' is-picked' : ''),
        'aria-label': (picked ? 'Selected: ' : 'Pick: ') + card.name + (card.tier ? ' (' + card.tier + ')' : ''),
        'aria-pressed': picked ? 'true' : 'false',
        style: {
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
          padding: '6px',
          width: '92px',
          position: 'relative',
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
        }) : h('div', { 'aria-hidden': 'true', style: { width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', background: palette.bg || '#0f172a', borderRadius: '4px', border: '1px solid ' + (palette.border || '#334155') } }, card.source === 'glossary' ? '📖' : '🎴'),
        tierShort ? h('span', {
          className: 'ah-tier-badge',
          'aria-label': card.tier
        }, tierShort) : null,
        h('div', { style: { fontSize: '10px', fontWeight: 700, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' } },
          card.name)
      );
    }

    function renderPlayPhase() {
      var verbHint = pickedVerb ? pickedVerb.hint : 'Pick how this card joins the realm.';
      var connectMode = pickedVerb && pickedVerb.id === 'connect';
      var canSubmit = !!pickedCard && !!pickedVerb && (justification || '').trim().length >= 10
                      && (!connectMode || !!partnerCard) && !submitting;
      return h('div', { style: { padding: '12px' } },
        renderHeader(),
        // Realm canvas — `ah-realm-canvas` adds an inset radial vignette
        // overlay so the canvas reads as a window into a world rather
        // than a flat thumbnail.
        h('div', {
          className: 'ah-realm-canvas',
          style: { position: 'relative', marginBottom: '12px', borderRadius: '10px', overflow: 'hidden', border: '1px solid ' + (palette.border || '#334155'), boxShadow: '0 6px 20px rgba(0,0,0,0.28)' }
        },
          realm.canvas ? h('img', {
            src: realm.canvas, alt: 'Your realm: ' + realm.topic,
            style: { display: 'block', width: '100%', maxHeight: '320px', objectFit: 'cover' }
          }) : h('div', {
            style: { padding: '60px 16px', textAlign: 'center', background: palette.surface || '#1e293b', color: palette.textDim || '#cbd5e1' }
          }, '🌍 (canvas unavailable — keep building)'),
          transforming ? h('div', {
            'aria-live': 'polite', 'aria-busy': 'true',
            style: { position: 'absolute', top: 8, right: 8, padding: '4px 10px', background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: '999px', fontSize: '11px' }
          }, '✨ realm evolving…') : null,
          canvasError ? h('div', {
            role: 'alert',
            style: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px', background: 'rgba(220,38,38,0.85)', color: '#fff', fontSize: '11px' }
          }, canvasError) : null
        ),
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
          h('div', { style: { fontSize: '11px', fontWeight: 700, color: lastFeedback.resonant ? (palette.accent || '#60a5fa') : (palette.textMute || '#94a3b8'), textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' } },
            lastFeedback.resonant ? h('span', { className: 'ah-resonant-pulse', 'aria-label': 'Resonant placement', style: { fontSize: '14px' } }, '🌟') : null,
            h('span', null,
              (lastFeedback.resonant ? 'Resonant placement · ' : '') +
              lastFeedback.cardName + ' (' + lastFeedback.verbLabel + ')'),
            // Score-pop chip — animates in on render via CSS keyframe.
            h('span', {
              key: 'sp-' + lastFeedback.score + '-' + (lastFeedback.cardName || ''),
              className: 'ah-score-pop',
              style: {
                marginLeft: 'auto',
                fontVariantNumeric: 'tabular-nums',
                background: lastFeedback.score >= 18 ? (palette.accent || '#60a5fa') : (lastFeedback.score >= 11 ? (palette.accent + '22' || 'rgba(96,165,250,0.18)') : 'transparent'),
                color: lastFeedback.score >= 18 ? (palette.onAccent || '#0f172a') : (lastFeedback.score >= 11 ? (palette.accent || '#60a5fa') : (palette.textMute || '#94a3b8')),
                padding: '2px 9px', borderRadius: '999px',
                fontWeight: lastFeedback.score >= 18 ? 800 : 700,
                fontSize: '11px', letterSpacing: 0
              }
            }, lastFeedback.score + '/20')
          ),
          lastFeedback.ackText ? h('p', { style: { margin: '0 0 6px 0', fontSize: '13px', lineHeight: '1.5' } }, lastFeedback.ackText) : null,
          lastFeedback.followUp ? h('p', { style: { margin: 0, fontSize: '12px', fontStyle: 'italic', color: palette.textDim || '#cbd5e1' } }, '💭 ' + lastFeedback.followUp) : null
        ) : null,
        // Card picker
        h('div', { style: { marginBottom: '10px' } },
          h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.textMute || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
            h('span', null, '1. Pick a card'),
            h('button', {
              onClick: refreshHand,
              'aria-label': 'Shuffle hand',
              style: { background: 'transparent', color: palette.textDim || '#cbd5e1', border: '1px solid ' + (palette.border || '#334155'), borderRadius: '6px', padding: '2px 8px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'none', letterSpacing: 0 }
            }, '↻ Shuffle')
          ),
          h('div', {
            role: 'group', 'aria-label': 'Hand of cards',
            style: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }
          },
            hand.map(function (card) {
              return renderCard(card, {
                picked: pickedCard && pickedCard.id === card.id,
                onClick: function () { setPickedCard(card); }
              });
            })
          )
        ),
        // Verb picker
        h('div', { style: { marginBottom: '10px' } },
          h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.textMute || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' } },
            '2. How does it join the realm?'),
          h('div', { role: 'radiogroup', 'aria-label': 'Building verb',
            style: { display: 'flex', flexWrap: 'wrap', gap: '6px' }
          },
            verbs.map(function (v) {
              var active = pickedVerb && pickedVerb.id === v.id;
              return h('button', {
                key: 'verb-' + v.id,
                className: 'ah-arcade-verb' + (active ? ' is-active' : ''),
                role: 'radio',
                'aria-checked': active ? 'true' : 'false',
                onClick: function () {
                  setPickedVerb(v);
                  if (v.id !== 'connect') setPartnerCard(null);
                },
                style: {
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', fontSize: '12px', fontFamily: 'inherit',
                  background: active ? (palette.accent || '#60a5fa') : 'transparent',
                  color: active ? (palette.onAccent || '#0f172a') : (palette.text || '#e2e8f0'),
                  border: '1.5px solid ' + (active ? (palette.accent || '#60a5fa') : (palette.border || '#334155')),
                  borderRadius: '999px',
                  cursor: 'pointer'
                }
              },
                h('span', { style: { fontSize: active ? '15px' : '13px', lineHeight: 1, transition: 'font-size 140ms ease' } }, v.emoji),
                h('span', { style: { fontWeight: active ? 700 : 500 } }, v.label)
              );
            })
          ),
          pickedVerb ? h('div', { style: { fontSize: '11px', color: palette.textDim || '#cbd5e1', fontStyle: 'italic', marginTop: '4px' } }, verbHint) : null
        ),
        // Partner-card picker (connect verb only)
        connectMode ? h('div', { style: { marginBottom: '10px' } },
          h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.textMute || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' } },
            '2b. Connect to which card?'),
          realm.zones.length === 0 ? h('div', { style: { fontSize: '12px', color: palette.textDim || '#cbd5e1', fontStyle: 'italic' } },
            'No zones placed yet — pick a different verb until you have at least one card to connect to.') :
          h('div', { role: 'group', 'aria-label': 'Partner card',
            style: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }
          },
            realm.zones.map(function (z, i) {
              var partner = {
                id: z.cardId, name: z.cardName, source: z.cardSource, imageBase64: z.cardImageBase64,
                tier: null, conceptDef: null, raw: z
              };
              return renderCard(partner, {
                suffix: '-zone-' + i,
                picked: partnerCard && partnerCard.id === partner.id,
                onClick: function () { setPartnerCard(partner); }
              });
            })
          )
        ) : null,
        // Justification
        h('div', { style: { marginBottom: '10px' } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' } },
            h('label', { htmlFor: 'rb-just',
              style: { fontSize: '11px', fontWeight: 700, color: palette.textMute || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }
            }, '3. Justify it'),
            // Voice button (Phase G — UDL parity with Boss Encounter).
            // Hidden when no voice engine is available (resolveVoiceEngine()
            // returns 'off'); state-aware UI for idle / webspeech-live /
            // recording / transcribing.
            (function () {
              var engine = resolveVoiceEngine();
              if (engine === 'off') return null;
              var label, click, busy = false;
              if (voiceMode === 'idle') {
                label = '🎤 Speak';
                click = startVoice;
              } else if (voiceMode === 'webspeech-live') {
                label = '⏹ Stop · listening';
                click = stopVoice;
                busy = true;
              } else if (voiceMode === 'recording') {
                var sec = Math.floor((voiceElapsed || 0) / 1000);
                label = '⏹ Stop · ' + sec + 's';
                click = stopVoice;
                busy = true;
              } else {
                // transcribing
                label = '… transcribing';
                click = null;
                busy = true;
              }
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
            id: 'rb-just',
            value: justification,
            onChange: function (e) { setJustification(e.target.value.slice(0, 600)); },
            placeholder: pickedVerb ? (pickedVerb.hint + ' Be specific.') : 'How does this card belong here?',
            rows: 3,
            // Disable typing during transcribing — the value is about to be
            // replaced by the AI transcript. Submitting disables too.
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
            onClick: submitZone,
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
          }, submitting ? 'Grading…' : '🌱 Place into the realm')
        ),
        // Zones-so-far recap. In class mode this becomes the shared
        // "recent placements" feed visible to all participants — each
        // row carries the contributor's nickname so students see who
        // built what.
        (realm.zones || []).length > 0 ? h('div', { style: { marginTop: '14px', padding: '10px 12px', background: palette.surface || '#1e293b', border: '1px solid ' + (palette.border || '#334155'), borderRadius: '8px' } },
          h('div', { style: { fontSize: '11px', fontWeight: 700, color: palette.textMute || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' } },
            (isClass ? '🌐 Recent placements · ' : 'Zones in your realm · ') + realm.zones.length),
          h('ul', {
            role: 'list',
            style: { display: 'flex', flexDirection: 'column', gap: '4px', margin: 0, padding: 0, listStyle: 'none', maxHeight: '160px', overflowY: 'auto' }
          },
            realm.zones.slice().reverse().slice(0, 8).map(function (z) {
              return h('li', { key: 'zr-' + z.id, role: 'listitem', style: { listStyle: 'none', fontSize: '11px', color: palette.textDim || '#cbd5e1', display: 'flex', gap: '6px', alignItems: 'center' } },
                z.resonant ? h('span', { style: { fontSize: '12px' } }, '🌟') : h('span', { style: { color: palette.textMute || '#94a3b8' } }, '·'),
                // Inline thumbnail: card image clipped to a small circle so
                // the feed reads as a stream of placements, not just text.
                z.cardImageBase64 ? h('img', {
                  src: z.cardImageBase64, alt: '', 'aria-hidden': 'true',
                  style: { width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', border: '1px solid ' + (palette.border || '#334155'), flexShrink: 0 }
                }) : h('span', { 'aria-hidden': 'true', style: { width: '20px', height: '20px', borderRadius: '50%', background: palette.bg || '#0f172a', border: '1px solid ' + (palette.border || '#334155'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 } }, z.cardSource === 'glossary' ? '📖' : '🎴'),
                h('strong', { style: { color: palette.text || '#e2e8f0' } }, z.cardName),
                h('span', null, ' (' + z.verbLabel + ')'),
                z.partnerCardName ? h('span', null, ' ↔ ' + z.partnerCardName) : null,
                z.contributorNickname ? h('span', {
                  style: { fontSize: '10px', color: palette.textMute || '#94a3b8', fontStyle: 'italic' }
                }, ' · by ' + z.contributorNickname) : null,
                // Score chip color-coded by bucket (Phase I): low (1-10)
                // muted, mid (11-17) accent-tinted, high (18-20) accent-bold.
                (function () {
                  var sc = z.score || 0;
                  var bg, fg;
                  if (sc >= 18) { bg = (palette.accent || '#60a5fa'); fg = (palette.onAccent || '#0f172a'); }
                  else if (sc >= 11) { bg = (palette.accent + '22' || 'rgba(96,165,250,0.18)'); fg = (palette.accent || '#60a5fa'); }
                  else { bg = 'transparent'; fg = (palette.textMute || '#94a3b8'); }
                  return h('span', {
                    style: {
                      marginLeft: 'auto',
                      fontVariantNumeric: 'tabular-nums',
                      background: bg,
                      color: fg,
                      padding: sc >= 11 ? '1px 6px' : '0',
                      borderRadius: '999px',
                      fontWeight: sc >= 18 ? 700 : 400,
                      fontSize: '10px'
                    }
                  }, sc + '/20');
                })()
              );
            })
          ),
          realm.zones.length > 8 ? h('div', { style: { fontSize: '10px', color: palette.textMute || '#94a3b8', marginTop: '4px', fontStyle: 'italic' } }, 'showing newest 8 — full list in print packet') : null
        ) : null
      );
    }

    function renderCompletePhase() {
      var resonantCount = (realm.zones || []).filter(function(z) { return z.score >= 18; }).length;
      var canPrint = typeof ctx.onPrintRealm === 'function';
      function printRealm() {
        if (canPrint) ctx.onPrintRealm(realm.id);
      }
      return h('div', { style: { padding: '12px' } },
        renderHeader(),
        h('div', { style: { padding: '20px 16px', background: palette.surface || '#1e293b', border: '1.5px solid ' + (palette.accent || '#60a5fa'), borderRadius: '10px', textAlign: 'center' } },
          h('div', { style: { fontSize: '48px', marginBottom: '12px' } }, '🌍'),
          h('h3', { style: { margin: '0 0 8px 0', color: palette.text || '#e2e8f0', fontSize: '17px', fontWeight: 700 } },
            'Realm wrapped'),
          h('p', { style: { margin: '0 0 14px 0', color: palette.textDim || '#cbd5e1', fontSize: '13px', lineHeight: '1.55' } },
            'You placed ' + realm.zones.length + ' zone' + (realm.zones.length === 1 ? '' : 's') + ' across "' + realm.topic + '"'
            + (resonantCount > 0 ? ' · 🌟 ' + resonantCount + ' resonant placement' + (resonantCount === 1 ? '' : 's') : '')
            + '. Reopen this realm any time from the Memory Overview to keep building.'),
          h('div', { style: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' } },
            canPrint ? h('button', {
              onClick: printRealm,
              'aria-label': 'Print this realm',
              style: { padding: '8px 18px', fontSize: '13px', fontWeight: 700, background: 'transparent', color: palette.text || '#e2e8f0', border: '1.5px solid ' + (palette.border || '#334155'), borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }
            }, '🖨 Print this realm') : null,
            h('button', {
              onClick: closeArcade,
              style: { padding: '8px 18px', fontSize: '13px', fontWeight: 700, background: palette.accent || '#60a5fa', color: palette.onAccent || '#0f172a', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit' }
            }, 'Back to your room')
          )
        )
      );
    }

    if (phase === 'topic')      return renderTopicPhase();
    if (phase === 'gen-canvas') return renderGenCanvasPhase();
    if (phase === 'complete')   return renderCompletePhase();
    return renderPlayPhase();
  }

  // ── Export ──
  // No public exports; the plugin self-registers via window.AlloHavenArcade.
  if (typeof console !== 'undefined') {
    console.log('[CDN] arcade_mode_realm_builder loaded');
  }
})();
