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
  var SPARK_VERBS = [
    { id: 'illuminate', label: 'Illuminate', emoji: '💡', hint: 'Reveal something hidden about the topic.' },
    { id: 'connect',    label: 'Connect',    emoji: '🔗', hint: 'Bridge this card to a different idea or example.' },
    { id: 'transform',  label: 'Transform',  emoji: '✨', hint: 'Show how applying this card changes the situation.' },
    { id: 'support',    label: 'Support',    emoji: '🛡️', hint: 'Defend a claim or build up an idea.' },
    { id: 'challenge',  label: 'Challenge',  emoji: '⚡', hint: 'Push back on an assumption or test the topic.' }
  ];

  // Encounter constants — tunable in subsequent commits.
  var BOSS_HP_START = 60;
  var ROUND_TIME_MS = 90 * 1000;          // 90s per round (D&D-style window)
  var MAX_ROUNDS = 8;                     // hard cap so encounters end gracefully
  var HAND_SIZE = 5;                      // cards visible at once in hand

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
  function BossLauncherCard(props) {
    var React = window.React;
    var h = React.createElement;
    var ctx = props.ctx;
    var palette = ctx.palette;
    var session = ctx.session;
    var deckSize = (ctx.decorations || []).length;
    var disabled = !!session; // an encounter (or another mode) is running
    var minutesAsked = 10;
    var tokensCost = Math.ceil(minutesAsked / (ctx.minutesPerToken || 5));
    var canAfford = ctx.tokens >= tokensCost && deckSize >= 3;

    function handleLaunch() {
      if (disabled) return;
      if (deckSize < 3) {
        ctx.addToast('You need at least 3 decorations in your room to play. Earn a few first.');
        return;
      }
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
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
        h('div', { style: { fontSize: '11px', color: palette.textMute || '#a3a3a3', flex: 1 } },
          deckSize >= 3
            ? deckSize + ' card' + (deckSize === 1 ? '' : 's') + ' ready in your deck'
            : 'Need ' + (3 - deckSize) + ' more decoration' + (3 - deckSize === 1 ? '' : 's') + ' to start'
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
          : 'Start · ' + tokensCost + ' 🪙'
        )
      )
    );
  }

  // ── Active encounter component ─────────────────────────────────────
  // All hooks live here so they run unconditionally on every render of
  // this component instance.
  function BossEncounterMain(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useRef = React.useRef;

    var ctx = props.ctx;
    var palette = ctx.palette;

    // Encounter state machine: 'topic' | 'gen-boss' | 'play' | 'won' | 'lost' | 'expired'
    var phaseTuple = useState('topic');
    var phase = phaseTuple[0];
    var setPhase = phaseTuple[1];

    var topicTuple = useState('');
    var topic = topicTuple[0];
    var setTopic = topicTuple[1];

    var bossImageTuple = useState(null);
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

    // Generate boss image when topic submitted
    function beginEncounter() {
      var t = (topic || '').trim();
      if (t.length < 3) {
        ctx.addToast('Pick a topic first (at least 3 characters).');
        return;
      }
      if (typeof ctx.callImagen !== 'function') {
        // Graceful degradation — proceed with no boss image
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
        setPhase('play');
        drawHand();
      }).catch(function (err) {
        // Boss image is decorative; proceed without it
        setBossErr((err && err.message) || 'Could not generate boss art.');
        setPhase('play');
        drawHand();
      });
    }

    function drawHand() {
      var pool = (ctx.decorations || []).slice();
      // Shuffle (Fisher-Yates)
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
      }
      setHand(pool.slice(0, HAND_SIZE));
    }

    function discardAndDraw(playedCardId) {
      // Remove the played card; refill from the rest of the deck.
      var pool = (ctx.decorations || []).filter(function (d) {
        if (d.id === playedCardId) return false;
        return !hand.some(function (h) { return h.id === d.id; });
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
      // inlines a simpler prompt as fallback.
      var rubric = {
        bossTopic: topic,
        cardName: pickedCard.templateLabel || pickedCard.template || 'card',
        cardSource: 'decoration',
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
          'Card: ' + (pickedCard.templateLabel || 'card'),
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
        ].join('\n');
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
      var entry = {
        round: round,
        cardId: pickedCard.id,
        cardName: pickedCard.templateLabel || pickedCard.template || 'card',
        verb: pickedVerb.label,
        justification: justification,
        score: score,
        ackText: parsed.ackText,
        followUp: parsed.followUp,
        damage: damage,
        healed: healed
      };
      var nextHistory = history.concat([entry]);
      setHistory(nextHistory);
      setLastResult(entry);
      setHp(newHp);
      setSubmitting(false);

      if (newHp <= 0) {
        setPhase('won');
        return;
      }
      // Advance round
      var nextRound = round + 1;
      if (nextRound > MAX_ROUNDS) {
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

    function exitEncounter() {
      // End the arcade session early
      if (typeof ctx.onEndSession === 'function') ctx.onEndSession('forfeit');
      ctx.onClose();
    }

    // ── Render ─────────────────────────────────────────────────────────
    var hpPct = Math.max(0, Math.min(100, Math.round((hp / BOSS_HP_START) * 100)));
    var topRow = h('div', {
      style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }
    },
      h('span', { 'aria-hidden': 'true', style: { fontSize: '24px' } }, '🐉'),
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('div', { style: { fontSize: '13px', fontWeight: 700, color: palette.text } }, 'Boss Encounter · ' + (topic || '...')),
        h('div', { style: { fontSize: '11px', color: palette.textDim } }, phase === 'play' ? ('Round ' + round + ' of ' + MAX_ROUNDS) : phase)
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
      // Boss panel — image + HP bar
      h('div', {
        style: {
          display: 'flex', gap: '12px', alignItems: 'center',
          padding: '10px', background: palette.bg,
          border: '1px solid ' + palette.border, borderRadius: '8px',
          marginBottom: '12px'
        }
      },
        bossImage ? h('img', {
          src: bossImage,
          alt: 'Concept Guardian for ' + topic,
          style: { width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0, border: '1px solid ' + palette.border }
        }) : h('div', {
          'aria-hidden': 'true',
          style: { width: '72px', height: '72px', flexShrink: 0, fontSize: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '8px' }
        }, '🐉'),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: '12px', fontWeight: 700, color: palette.text, marginBottom: '4px' } }, 'Concept Guardian: ' + topic),
          h('div', {
            'aria-label': 'Boss HP ' + hp + ' of ' + BOSS_HP_START,
            style: { height: '12px', background: palette.surface, border: '1px solid ' + palette.border, borderRadius: '999px', overflow: 'hidden', marginBottom: '4px' }
          },
            h('div', { style: { width: hpPct + '%', height: '100%', background: palette.accent, transition: 'width 320ms ease' } })
          ),
          h('div', { style: { fontSize: '10px', color: palette.textMute, fontVariantNumeric: 'tabular-nums' } },
            hp + ' / ' + BOSS_HP_START + ' HP · Round ' + round + ' / ' + MAX_ROUNDS),
          bossErr ? h('div', { style: { fontSize: '10px', color: palette.textMute, fontStyle: 'italic', marginTop: '2px' } },
            '(Guardian art unavailable; encounter continues)') : null
        )
      ),
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
          + (lastResult.damage > 0 ? lastResult.damage + ' damage' : 'no damage')),
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
            var name = card.templateLabel || card.template || 'card';
            return h('button', {
              key: 'hc-' + card.id,
              onClick: function () { setPickedCard(picked ? null : card); },
              'aria-pressed': picked ? 'true' : 'false',
              style: {
                flexShrink: 0,
                width: '88px',
                background: picked ? palette.accent : palette.bg,
                color: picked ? palette.onAccent : palette.text,
                border: '1.5px solid ' + (picked ? palette.accent : palette.border),
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'center'
              }
            },
              card.imageBase64
                ? h('img', { src: card.imageBase64, alt: name, style: { width: '100%', height: '60px', objectFit: 'cover', borderRadius: '4px', marginBottom: '4px' } })
                : h('div', { 'aria-hidden': 'true', style: { width: '100%', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', background: palette.surface, borderRadius: '4px', marginBottom: '4px' } }, '🎴'),
              h('div', { style: { fontSize: '10px', fontWeight: 700, lineHeight: '1.2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, name)
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
          placeholder: 'How does your "' + (pickedCard.templateLabel || 'card') + '" ' + pickedVerb.label.toLowerCase() + ' the topic of "' + topic + '"?',
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
        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' } },
          h('div', { style: { fontSize: '10px', color: palette.textMute, fontVariantNumeric: 'tabular-nums' } },
            (justification || '').trim().length + ' chars'),
          h('button', {
            onClick: submitSpark,
            disabled: submitting || (justification || '').trim().length < 10,
            style: {
              background: submitting ? palette.surface : palette.accent,
              color: submitting ? palette.textMute : palette.onAccent,
              border: 'none', borderRadius: '8px',
              padding: '8px 18px', fontSize: '13px', fontWeight: 700,
              cursor: (submitting || (justification || '').trim().length < 10) ? 'not-allowed' : 'pointer',
              opacity: (submitting || (justification || '').trim().length < 10) ? 0.5 : 1,
              fontFamily: 'inherit'
            }
          }, submitting ? 'Sparking…' : '✨ Cast Spark')
        )
      ) : pickedCard ? h('p', { style: { fontSize: '11px', color: palette.textDim, fontStyle: 'italic' } },
        'Pick how you\'ll Spark this card.'
      ) : null
    );
  }
})();
