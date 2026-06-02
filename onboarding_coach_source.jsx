/**
 * AlloFlow — Onboarding Coach Module (Tier 1 + Tier 2 + Tier 3)
 *
 * Tier 1 surface: "Not sure? Ask AlloBot" floating launcher + static help
 * panel that shows the 4 LaunchPad mode descriptions plus a CTA to launch
 * the existing TourOverlay.
 *
 * Tier 3 additions (this revision):
 *   - "Have a question? Ask AlloBot" expandable disclosure below the tour CTA
 *     (open by default on viewports ≥ 600px, collapsed on mobile to keep the
 *     calm 4-card LaunchPad feel for users who only want to pick a mode).
 *   - Chat conversation pane that displays the last 4 turn-pairs as alternating
 *     bubbles. Buffer is owned by AlloOnboarding so the panel can re-mount
 *     without losing the conversation.
 *   - Text input with 500-char hard cap + live counter (visible when > 450).
 *     Live FERPA scrub-preview banner appears under the input as the user
 *     types (debounced 300ms; uses AlloOnboarding.previewScrub).
 *   - Single-shot LLM call (no streaming) via AlloOnboarding.askCoach.
 *     Thinking indicator runs in 3 phases: immediate dots; "still working"
 *     sub-line at 2.5s; Cancel button at 8s.
 *   - First-run consent modal that gates the very first send with an
 *     honest Gemini disclosure. Persisted via recordCoachConsent().
 *   - Action chips render as pill buttons under the bot bubble: pick_mode
 *     dispatches through the host-provided pickMode(key) callback so the
 *     educator password gate stays single-source-of-truth in the host.
 *     start_tour fires setRunTour. open_help collapses the chat pane back
 *     to static help.
 *   - Error states surface distinct messages for no_compatible_backend,
 *     network, rate_limit_*, safety_blocked, consent_required, and
 *     pii_high_risk — each with a recovery affordance.
 *
 * Tier 2 additions (prior revision):
 *   - "Read help aloud" toggle row inside the panel, wired to
 *     window.AlloOnboarding.setOnboardingTTSEnabled (defaults OFF; layered
 *     ON TOP of the existing global mute — no parallel state).
 *   - Panel-open emits an aria-live announce() via window.AlloOnboarding.
 *     This is the AT-safe channel: NVDA/JAWS/VoiceOver users get the same
 *     orientation cue without any speech-synthesis collision.
 *   - "Start the tour" click is a user gesture, so it's safe to fire a
 *     short TTS cue if the user has opted in — satisfies iOS Safari's
 *     pre-gesture-unlock requirement on first use.
 *   - When the user flips the toggle ON, we play a tiny "Voice on…" cue
 *     so they get immediate confirmation TTS works on their device, and
 *     (separately) so iOS Safari's gesture-unlock is consumed inside the
 *     same click handler.
 *
 * Tier 2 wiring lives in onboarding_helpers_module.js. This file only
 * consumes the public window.AlloOnboarding surface. If the helpers
 * module hasn't loaded yet (or the CDN fetch failed), every Tier 2 path
 * here degrades to a silent no-op — Tier 1 still works.
 *
 * Visibility: the host should render this only while LaunchPad is showing
 * (same conditional as <LaunchPadView/>) — see AlloFlowANTI.txt render site.
 *
 * Source for built module: onboarding_coach_module.js (via
 * _build_onboarding_coach_module.js).
 */
function OnboardingCoach(props) {
  var t = (typeof props.t === 'function') ? props.t : function (k) { return k; };
  var setRunTour = props.setRunTour;
  // Tier 3 — host-provided callback that dispatches a mode-selection key
  // through the SAME setter sequence LaunchPad uses (including the educator
  // password gate). Keeps the gate logic single-source-of-truth in the host.
  // If absent, pick_mode chips degrade to a polite "select that card on the
  // LaunchPad behind me" message rather than firing setters directly.
  var pickMode = (typeof props.pickMode === 'function') ? props.pickMode : null;

  var _open = React.useState(false);
  var isOpen = _open[0]; var setIsOpen = _open[1];

  // Tier 2 — TTS opt-in state, sourced from AlloOnboarding (which itself
  // reads localStorage AND respects the global mute). Recomputed on every
  // panel open so a global-mute toggle elsewhere takes effect without
  // remounting the coach.
  var _tts = React.useState(false);
  var ttsEnabled = _tts[0]; var setTtsEnabled = _tts[1];
  var _mute = React.useState(false);
  var globalMuted = _mute[0]; var setGlobalMuted = _mute[1];

  React.useEffect(function () {
    if (!isOpen) return;
    var ao = window.AlloOnboarding;
    if (ao && typeof ao.isOnboardingTTSEnabled === 'function') {
      try { setTtsEnabled(!!ao.isOnboardingTTSEnabled()); } catch (_) {}
    }
    try {
      var muted = (typeof window.__alloIsGlobalMuted === 'function')
        ? !!window.__alloIsGlobalMuted()
        : (window.localStorage && window.localStorage.getItem('alloflow-global-muted') === 'true');
      setGlobalMuted(muted);
    } catch (_) { /* private mode — assume not muted */ }

    // AT-safe orientation cue (works regardless of TTS opt-in). The clear+
    // rewrite inside announce() makes the screen reader pick it up reliably.
    if (ao && typeof ao.announce === 'function') {
      var msg = t('onboarding.panel_open_announcement') ||
        ('AlloBot onboarding open. Four mode options are listed: Full AlloFlow, ' +
         'Guided Mode, Learning Tools, and Educator Tools. A Start the Tour ' +
         'button is at the bottom.');
      try { ao.announce(msg, { politeness: 'polite' }); } catch (_) {}
    }
  }, [isOpen]);

  // ═══════════════════════════════════════════════════════════════════════
  // TIER 3 — Q&A state + handlers
  // ═══════════════════════════════════════════════════════════════════════
  var _isMobile = (typeof window !== 'undefined' && window.innerWidth < 600);
  var _chatExp = React.useState(!_isMobile);
  var chatExpanded = _chatExp[0]; var setChatExpanded = _chatExp[1];

  var _inp = React.useState(''); var inputText = _inp[0]; var setInputText = _inp[1];
  var _inflight = React.useState(false); var inFlight = _inflight[0]; var setInFlight = _inflight[1];
  var _phase = React.useState(0); var thinkingPhase = _phase[0]; var setThinkingPhase = _phase[1];
  var _err = React.useState(null); var coachError = _err[0]; var setCoachError = _err[1];
  var _convo = React.useState([]); var conversation = _convo[0]; var setConversation = _convo[1];
  var _usage = React.useState({ remaining: 20, cap: 20, used: 0, isOnline: true });
  var usage = _usage[0]; var setUsage = _usage[1];
  var _scrub = React.useState({ flags: [], riskLevel: 'none', scrubbed: '' });
  var scrubPreview = _scrub[0]; var setScrubPreview = _scrub[1];
  var _consent = React.useState(false); var showConsent = _consent[0]; var setShowConsent = _consent[1];
  var _pending = React.useState(null); var pendingSend = _pending[0]; var setPendingSend = _pending[1];
  // Chips from the most recent bot reply (held outside AlloOnboarding's
  // text-only buffer so the helper module stays decoupled from UI shape).
  var _chips = React.useState([]); var lastChips = _chips[0]; var setLastChips = _chips[1];

  var abortRef = React.useRef(null);
  var thinkTimer1Ref = React.useRef(null);
  var thinkTimer2Ref = React.useRef(null);
  var scrubTimerRef = React.useRef(null);
  var chatPaneRef = React.useRef(null);
  var inputRef = React.useRef(null);

  // Refresh conversation buffer + usage when the panel opens or after each
  // successful turn — AlloOnboarding owns the buffer so the panel can be
  // unmounted/remounted without losing context.
  var refreshCoachState = function () {
    var ao = window.AlloOnboarding;
    if (!ao) return;
    try {
      if (typeof ao.getCoachBuffer === 'function') setConversation(ao.getCoachBuffer());
      if (typeof ao.getCoachUsage === 'function') setUsage(ao.getCoachUsage());
    } catch (_) {}
  };
  React.useEffect(function () { if (isOpen) refreshCoachState(); }, [isOpen]);

  // FERPA scrub preview — debounced 300ms.
  React.useEffect(function () {
    if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current);
    if (!inputText) { setScrubPreview({ flags: [], riskLevel: 'none', scrubbed: '' }); return; }
    scrubTimerRef.current = setTimeout(function () {
      var ao = window.AlloOnboarding;
      if (!ao || typeof ao.previewScrub !== 'function') return;
      try { setScrubPreview(ao.previewScrub(inputText)); } catch (_) {}
    }, 300);
    return function () { if (scrubTimerRef.current) clearTimeout(scrubTimerRef.current); };
  }, [inputText]);

  // Thinking-indicator phase escalation while a request is in flight.
  React.useEffect(function () {
    if (!inFlight) {
      setThinkingPhase(0);
      if (thinkTimer1Ref.current) clearTimeout(thinkTimer1Ref.current);
      if (thinkTimer2Ref.current) clearTimeout(thinkTimer2Ref.current);
      return;
    }
    setThinkingPhase(0);
    thinkTimer1Ref.current = setTimeout(function () { setThinkingPhase(1); }, 2500);
    thinkTimer2Ref.current = setTimeout(function () { setThinkingPhase(2); }, 8000);
    return function () {
      if (thinkTimer1Ref.current) clearTimeout(thinkTimer1Ref.current);
      if (thinkTimer2Ref.current) clearTimeout(thinkTimer2Ref.current);
    };
  }, [inFlight]);

  // Conditional auto-scroll — only stick to bottom when the user IS near
  // the bottom; otherwise leave their scroll position alone.
  React.useEffect(function () {
    var el = chatPaneRef.current;
    if (!el) return;
    var nearBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 40;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [conversation.length, inFlight]);

  var coachAvailable = (function () {
    var ao = window.AlloOnboarding;
    return !!(ao && typeof ao.isCoachAvailable === 'function' && ao.isCoachAvailable());
  })();

  var canSend = (function () {
    if (inFlight) return false;
    if (!inputText.trim()) return false;
    if (inputText.length > 500) return false;
    if (usage.remaining <= 0) return false;
    if (usage.cooldownMsRemaining && usage.cooldownMsRemaining > 0) return false;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    return true;
  })();

  // Send handler — gates on consent, then calls askCoach + handles the result.
  // Passes the live Tier 2 screen scan so the bot can ground its reply in
  // what's actually on-screen ("you're on the LaunchPad now, the four mode
  // cards are visible"). FERPA defense-in-depth still applies inside
  // askCoach — if the question text trips any PII pattern, screen + recent
  // are both dropped from the outbound payload.
  var doSend = function (questionText) {
    var ao = window.AlloOnboarding;
    if (!ao || typeof ao.askCoach !== 'function') return;
    setCoachError(null);
    setInFlight(true);
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    abortRef.current = controller;
    var screenCtx = null;
    try {
      if (typeof ao.readVisibleScreen === 'function') screenCtx = ao.readVisibleScreen();
    } catch (_) {}
    Promise.resolve(ao.askCoach({
      question: questionText,
      screen: screenCtx,
      signal: controller ? controller.signal : null,
    })).then(function (res) {
      setInFlight(false);
      abortRef.current = null;
      refreshCoachState();
      if (res && res.blocked) {
        setCoachError({ reason: res.blockedReason, answer: res.answer, meta: res.meta });
        // Polite aria-live announcement so screen readers know what happened.
        if (ao.announce && res.answer) {
          try { ao.announce(res.answer, { politeness: 'polite' }); } catch (_) {}
        }
        return;
      }
      setInputText('');
      setScrubPreview({ flags: [], riskLevel: 'none', scrubbed: '' });
      setLastChips(Array.isArray(res && res.actions) ? res.actions : []);
      // Refresh after the bot reply lands.
      refreshCoachState();
      if (ao.announce && res && res.answer) {
        try {
          ao.announce(
            (t('onboarding.coach_reply_announce_prefix') || 'AlloBot replied: ') +
              res.answer.slice(0, 160) +
              (res.actions && res.actions.length
                ? '. ' + res.actions.length + ' suggested action' + (res.actions.length === 1 ? '' : 's') + '.'
                : ''),
            { politeness: 'polite' }
          );
        } catch (_) {}
      }
    }).catch(function (e) {
      setInFlight(false);
      abortRef.current = null;
      setCoachError({ reason: 'network', answer: 'Something went wrong. Try again.' });
    });
  };

  var handleSendClick = function () {
    if (!canSend) return;
    var q = inputText.trim();
    var ao = window.AlloOnboarding;
    // Consent gate — show modal if first send.
    if (ao && typeof ao.hasCoachConsent === 'function' && !ao.hasCoachConsent()) {
      setPendingSend(q);
      setShowConsent(true);
      return;
    }
    doSend(q);
  };

  var handleConsentAccept = function () {
    var ao = window.AlloOnboarding;
    if (ao && typeof ao.recordCoachConsent === 'function') {
      try { ao.recordCoachConsent(); } catch (_) {}
    }
    setShowConsent(false);
    var q = pendingSend;
    setPendingSend(null);
    if (q) doSend(q);
  };
  var handleConsentDecline = function () {
    setShowConsent(false);
    setPendingSend(null);
  };

  var handleCancel = function () {
    if (abortRef.current) { try { abortRef.current.abort(); } catch (_) {} }
    setInFlight(false);
  };

  var handleResetConversation = function () {
    var ao = window.AlloOnboarding;
    if (ao && typeof ao.resetCoachConversation === 'function') {
      try { ao.resetCoachConversation({ resetCounter: false }); } catch (_) {}
    }
    setConversation([]);
    setCoachError(null);
    setLastChips([]);
    refreshCoachState();
  };

  // Action chip dispatcher — handles pick_mode (closes panel + pickMode),
  // start_tour (closes panel + setRunTour), open_help (collapses chat),
  // open_link (no-op for now; placeholder for future AI Backend Settings).
  var handleChipClick = function (chip) {
    if (!chip || !chip.kind) return;
    if (chip.kind === 'pick_mode') {
      var k = chip.key;
      if (!k) return;
      setIsOpen(false);
      if (pickMode) {
        try { pickMode(k); } catch (_) {}
      }
      return;
    }
    if (chip.kind === 'start_tour') {
      setIsOpen(false);
      if (typeof setRunTour === 'function') setRunTour(true);
      return;
    }
    if (chip.kind === 'open_help') {
      setChatExpanded(false);
      setCoachError(null);
      return;
    }
    if (chip.kind === 'open_link') {
      // Reserved for future — close the panel and let the host decide.
      setIsOpen(false);
      return;
    }
  };

  // Chip label — host overrides for pick_mode via t() to stay i18n-consistent.
  var chipLabel = function (chip) {
    if (chip.kind === 'pick_mode') {
      var titleKey = 'launch_pad.' + chip.key + '_title';
      var label = t(titleKey);
      if (!label || label === titleKey) {
        var fallback = {
          full: 'Full AlloFlow', guided: 'Guided Mode',
          learning_tools: 'Learning Tools', educator: 'Educator Tools',
        };
        label = fallback[chip.key] || chip.key;
      }
      return label;
    }
    if (chip.kind === 'start_tour')
      return t('onboarding.start_tour_cta') || 'Start the tour';
    if (chip.kind === 'open_help')
      return t('onboarding.show_offline_help') || 'Show offline help';
    if (chip.kind === 'open_link')
      return t('onboarding.open_settings') || 'Open settings';
    return '';
  };

  // The 4 LaunchPad modes. Title + description draw from the same i18n keys
  // LaunchPad itself uses (so any future lang-pack work flows through here too).
  // "Best if..." is hand-written guidance for 0-familiarity users — these are
  // new keys (onboarding.*_best_if); the t() fallback renders the English when
  // the lang pack hasn't been translated yet.
  var modes = [
    {
      key: 'full',
      icon: '\u{1F680}',
      title: t('launch_pad.full_title') || 'Full AlloFlow',
      desc:  t('launch_pad.full_desc')  || 'All AlloFlow features unlocked. Full power-user surface.',
      bestIf: t('onboarding.full_best_if') ||
        'Best if you want full control and you’re comfortable exploring on your own.',
    },
    {
      key: 'guided',
      icon: '\u{1F9ED}',
      title: t('launch_pad.guided_title') || 'Guided Mode',
      desc:  t('launch_pad.guided_desc')  || 'A simpler, step-by-step interface that walks you through each task.',
      bestIf: t('onboarding.guided_best_if') ||
        'Best if you’re brand new and want a calmer interface that holds your hand at each step.',
    },
    {
      key: 'learning_tools',
      icon: '\u{1F9E0}',
      title: t('launch_pad.learning_tools_title') || 'Learning Tools',
      desc:  t('launch_pad.learning_tools_desc')  || 'STEM Lab, StoryForge, SEL Hub & Research Hub — explore, create, investigate, and grow.',
      bestIf: t('onboarding.learning_tools_best_if') ||
        'Best if you’re a student or independent learner who wants to jump into activities right away.',
    },
    {
      key: 'educator',
      icon: '\u{1F6E0}\u{FE0F}',
      title: t('launch_pad.educator_tools_title') || 'Educator Tools',
      desc:  t('launch_pad.educator_tools_desc')  || 'BehaviorLens, Report Writer, and professional clinical tools — password protected.',
      bestIf: t('onboarding.educator_best_if') ||
        'Best if you’re a teacher, clinician, or school psychologist on a password-protected workstation.',
    },
  ];

  // Toggle handler — flips per-feature opt-in and (when turning ON) speaks
  // a tiny confirmation cue. The cue serves two purposes:
  //   1. UX: the user gets immediate confirmation TTS works on this device.
  //   2. Browser: the iOS Safari pre-gesture-unlock requirement is consumed
  //      inside this very click handler, so subsequent speak() calls within
  //      the same session are eligible to fire from useEffects later.
  var toggleTTS = function () {
    var next = !ttsEnabled;
    var ao = window.AlloOnboarding;
    if (ao && typeof ao.setOnboardingTTSEnabled === 'function') {
      try { ao.setOnboardingTTSEnabled(next); } catch (_) {}
    }
    setTtsEnabled(next);
    if (next && !globalMuted && ao && typeof ao.speak === 'function') {
      try { ao.speak(t('onboarding.tts_test_cue') || 'Voice on. I will read help out loud.'); } catch (_) {}
    } else if (!next && ao && typeof ao.cancel === 'function') {
      try { ao.cancel(); } catch (_) {}
    }
  };

  var openTour = function () {
    setIsOpen(false);
    var ao = window.AlloOnboarding;
    if (ao && typeof ao.isOnboardingTTSEnabled === 'function' && ao.isOnboardingTTSEnabled()) {
      try { ao.speak(t('onboarding.tour_starting_speech') || 'Starting the tour.'); } catch (_) {}
    }
    if (typeof setRunTour === 'function') setRunTour(true);
  };

  return (
    <React.Fragment>
      {/* Floating launcher — anchored bottom-right, visible whenever LaunchPad renders.
          z-index sits above LaunchPad content but below the panel overlay (9100). */}
      {!isOpen && (
        <button
          type="button"
          onClick={function () { setIsOpen(true); }}
          aria-label={t('onboarding.ask_allobot_aria') || 'Open AlloBot onboarding help'}
          data-help-key="onboarding_ask_allobot_button"
          style={{
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 9000,
            padding: '12px 20px', borderRadius: '999px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)',
            color: '#fff', border: 'none', fontWeight: 700, fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(124,58,237,0.45)',
            display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseDown={function (e) { e.currentTarget.style.transform = 'scale(0.97)'; }}
          onMouseUp={function (e) { e.currentTarget.style.transform = 'scale(1)'; }}
          onMouseLeave={function (e) { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <span aria-hidden="true">{'\u{1F916}'}</span>
          <span>{t('onboarding.ask_allobot_label') || 'Not sure? Ask AlloBot'}</span>
        </button>
      )}

      {/* Panel overlay — centered modal with the TTS toggle, 4 mode cards, and tour CTA. */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('onboarding.panel_aria') || 'AlloBot onboarding help'}
          data-help-key="onboarding_panel"
          style={{
            position: 'fixed', inset: 0, zIndex: 9100,
            background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
          onClick={function (e) { if (e.target === e.currentTarget) setIsOpen(false); }}
          onKeyDown={function (e) { if (e.key === 'Escape') setIsOpen(false); }}
          tabIndex={-1}
        >
          <div
            onClick={function (e) { e.stopPropagation(); }}
            style={{
              background: '#fff', borderRadius: '20px',
              maxWidth: '720px', width: '100%',
              maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
            }}
          >
            {/* Header — purple gradient to match the AlloBot brand chrome */}
            <div style={{
              padding: '18px 22px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderRadius: '20px 20px 0 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '32px' }} aria-hidden="true">{'\u{1F916}'}</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                    {t('onboarding.panel_title') || 'Hi! I’m AlloBot.'}
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.9 }}>
                    {t('onboarding.panel_subtitle') ||
                      'Pick the option that best fits how you’ll use AlloFlow today.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={function () { setIsOpen(false); }}
                aria-label={t('common.close') || 'Close'}
                style={{
                  background: 'rgba(255,255,255,0.18)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px', padding: '6px 12px',
                  cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                }}
              >{'✕'}</button>
            </div>

            {/* Body */}
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {/* Tier 2 — TTS toggle row.
                  Placement (above mode cards, below subtitle) per the a11y
                  reviewer: doesn't compete with the close button (header) and
                  isn't cropped on small viewports (footer). Honest sub-label
                  tells AT users to leave it OFF. */}
              <div
                data-help-key="onboarding_tts_row"
                style={{
                  padding: '12px 14px', borderRadius: '12px',
                  border: '1px solid #e2e8f0', background: '#f8fafc',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label htmlFor="allobot-tts-toggle" style={{
                    margin: 0, fontSize: '13px', fontWeight: 700, color: '#1e293b',
                    display: 'block', cursor: 'pointer',
                  }}>
                    <span aria-hidden="true">{'\u{1F50A} '}</span>
                    {t('onboarding.tts_toggle_label') || 'Read help aloud'}
                  </label>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                    {globalMuted
                      ? (t('onboarding.tts_unavailable_globally_muted') ||
                         'Sound is muted globally. Un-mute in the main toolbar to hear AlloBot.')
                      : (t('onboarding.tts_toggle_sublabel') ||
                         'Off by default. If you use a screen reader, leave this off — your reader already reads this panel.')}
                  </p>
                </div>
                <button
                  id="allobot-tts-toggle"
                  type="button"
                  role="switch"
                  aria-checked={ttsEnabled}
                  aria-label={t('onboarding.tts_toggle_label') || 'Read help aloud'}
                  onClick={toggleTTS}
                  style={{
                    flexShrink: 0,
                    width: '48px', height: '26px', borderRadius: '999px',
                    border: 'none', cursor: 'pointer', padding: 0,
                    background: ttsEnabled ? '#22c55e' : '#cbd5e1',
                    position: 'relative', transition: 'background 0.15s',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: '3px', left: ttsEnabled ? '25px' : '3px',
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: '#fff', transition: 'left 0.15s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    }}
                  />
                </button>
              </div>

              {/* Mode cards */}
              {modes.map(function (m) {
                return (
                  <div key={m.key}
                    data-help-key={'onboarding_mode_' + m.key}
                    style={{
                      border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px',
                      background: '#fafafa',
                      display: 'flex', alignItems: 'flex-start', gap: '14px',
                    }}>
                    <span style={{ fontSize: '34px', flexShrink: 0, lineHeight: 1 }} aria-hidden="true">
                      {m.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>
                        {m.title}
                      </h3>
                      <p style={{ margin: '4px 0 6px', fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                        {m.desc}
                      </p>
                      <p style={{
                        margin: 0, fontSize: '11px', color: '#7c3aed',
                        fontWeight: 700, lineHeight: 1.4,
                      }}>
                        <span aria-hidden="true">{'\u{1F4A1} '}</span>
                        {m.bestIf}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Tour CTA — only fires if setRunTour was actually wired by the host */}
              {typeof setRunTour === 'function' && (
                <div
                  data-help-key="onboarding_tour_cta"
                  style={{
                    marginTop: '6px', padding: '14px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)',
                    border: '1px solid #fbbf24',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '12px', flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#78350f' }}>
                      {t('onboarding.tour_offer_title') || 'Want me to show you around first?'}
                    </p>
                    <p style={{ margin: '3px 0 0', fontSize: '11px', color: '#92400e' }}>
                      {t('onboarding.tour_offer_desc') ||
                        'I’ll walk you through the workspace before you pick a mode.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openTour}
                    style={{
                      padding: '10px 18px', borderRadius: '999px',
                      background: '#d97706', color: '#fff', border: 'none',
                      fontWeight: 800, fontSize: '13px', cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(217,119,6,0.45)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span aria-hidden="true">{'\u{1F3AF} '}</span>
                    {t('onboarding.start_tour_cta') || 'Start the tour'}
                  </button>
                </div>
              )}

              {/* ════════════════════════════════════════════════════════
                  Tier 3 — "Have a question? Ask AlloBot" expandable
                  disclosure. Lives below the tour CTA so users who only want
                  to pick a mode aren't visually overwhelmed. Default open on
                  ≥ 600px, collapsed on mobile.
                  ════════════════════════════════════════════════════════ */}
              <div
                data-help-key="onboarding_coach_chat"
                style={{
                  marginTop: '4px', borderRadius: '14px',
                  border: '1px solid #e2e8f0', background: '#fff',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={function () { setChatExpanded(!chatExpanded); }}
                  aria-expanded={chatExpanded}
                  aria-controls="onboarding-coach-qa-body"
                  style={{
                    width: '100%', padding: '12px 14px', textAlign: 'left',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span aria-hidden="true" style={{ fontSize: '20px' }}>{'\u{1F4AC}'}</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>
                      {t('onboarding.coach_ask_disclosure') || 'Have a question? Ask AlloBot'}
                    </span>
                  </span>
                  <span aria-hidden="true" style={{
                    fontSize: '12px', color: '#7c3aed', fontWeight: 700,
                    transform: chatExpanded ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.15s',
                  }}>{'▾'}</span>
                </button>

                {chatExpanded && (
                  <div id="onboarding-coach-qa-body" style={{ padding: '0 14px 14px' }}>
                    {/* Coach unavailable — non-Gemini backend or missing callGemini */}
                    {!coachAvailable && (
                      <div style={{
                        marginBottom: '10px', padding: '10px 12px', borderRadius: '10px',
                        background: '#fff7ed', border: '1px solid #fb923c',
                        fontSize: '11px', color: '#9a3412', lineHeight: 1.5,
                      }}>
                        <strong>{t('onboarding.coach_no_backend_title') || 'AlloBot Coach needs Google Gemini.'}</strong>
                        <br />
                        {t('onboarding.coach_no_backend_body') ||
                          'Switch your AI backend to Google Gemini in Settings, or use the static help cards above.'}
                      </div>
                    )}

                    {/* Conversation pane */}
                    {coachAvailable && conversation.length > 0 && (
                      <div
                        ref={chatPaneRef}
                        aria-live="polite"
                        aria-label={t('onboarding.coach_conversation_aria') || 'AlloBot conversation'}
                        style={{
                          marginBottom: '10px', maxHeight: '260px', overflowY: 'auto',
                          padding: '4px 2px', display: 'flex', flexDirection: 'column', gap: '8px',
                        }}
                      >
                        {conversation.map(function (m, idx) {
                          var isUser = m.role === 'user';
                          return (
                            <div key={idx} style={{
                              display: 'flex',
                              justifyContent: isUser ? 'flex-end' : 'flex-start',
                            }}>
                              <div style={{
                                maxWidth: '85%', padding: '8px 12px', borderRadius: '14px',
                                fontSize: '12px', lineHeight: 1.5,
                                background: isUser ? '#f1f5f9' : '#f5f3ff',
                                color: isUser ? '#0f172a' : '#3b0764',
                                border: isUser ? '1px solid #e2e8f0' : '1px solid #ddd6fe',
                                borderTopRightRadius: isUser ? '4px' : '14px',
                                borderTopLeftRadius: isUser ? '14px' : '4px',
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                              }}>
                                {m.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Thinking indicator — 3 phases. Single AlloBot bubble. */}
                    {coachAvailable && inFlight && (
                      <div
                        aria-live="polite"
                        aria-busy="true"
                        style={{
                          marginBottom: '10px', display: 'flex',
                          justifyContent: 'flex-start',
                        }}
                      >
                        <div style={{
                          maxWidth: '85%', padding: '10px 14px', borderRadius: '14px',
                          background: '#f5f3ff', border: '1px solid #ddd6fe',
                          fontSize: '12px', color: '#3b0764', lineHeight: 1.5,
                          borderTopLeftRadius: '4px',
                        }}>
                          <span aria-hidden="true" style={{ display: 'inline-block', marginRight: '6px' }}>
                            {'\u{1F916}'}
                          </span>
                          <span style={{ opacity: 0.85, fontWeight: 700 }}>
                            {t('onboarding.coach_thinking') || 'AlloBot is thinking…'}
                          </span>
                          {thinkingPhase >= 1 && (
                            <div style={{ marginTop: '4px', fontSize: '11px', color: '#7c3aed' }}>
                              {t('onboarding.coach_thinking_long') ||
                                'Still working — Gemini is taking a moment.'}
                            </div>
                          )}
                          {thinkingPhase >= 2 && (
                            <button
                              type="button"
                              onClick={handleCancel}
                              style={{
                                marginTop: '6px', padding: '4px 10px', borderRadius: '999px',
                                background: '#fff', border: '1px solid #d4d4d8',
                                color: '#3f3f46', fontSize: '11px', fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {t('onboarding.coach_cancel') || 'Cancel'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action chips — from the latest bot reply or error */}
                    {coachAvailable && !inFlight && coachError && (
                      <div style={{
                        marginBottom: '10px', padding: '10px 12px', borderRadius: '10px',
                        background: '#fef2f2', border: '1px solid #fca5a5',
                        fontSize: '11px', color: '#7f1d1d', lineHeight: 1.5,
                      }}>
                        <strong>{(function () {
                          var r = coachError.reason;
                          if (r === 'consent_required') return t('onboarding.coach_consent_required') || 'Consent required.';
                          if (r === 'no_compatible_backend') return t('onboarding.coach_no_backend') || 'AlloBot Coach needs Google Gemini.';
                          if (r === 'network') return t('onboarding.coach_network_error') || 'Network problem.';
                          if (r === 'rate_limit_session') return t('onboarding.coach_rate_limit') || "You've used today's coach quota.";
                          if (r === 'rate_limit_cooldown') return t('onboarding.coach_cooldown') || 'One moment…';
                          if (r === 'rate_limit_upstream') return t('onboarding.coach_upstream') || 'AlloBot is taking a quick breather.';
                          if (r === 'pii_detected' || r === 'pii_high_risk') return t('onboarding.coach_pii') || 'Looks like student data.';
                          if (r === 'safety_blocked') return t('onboarding.coach_safety') || 'Cannot answer that.';
                          if (r === 'injection') return t('onboarding.coach_injection') || 'Can only help with onboarding.';
                          if (r === 'input_too_long') return t('onboarding.coach_too_long') || 'Question too long.';
                          if (r === 'off_topic') return t('onboarding.coach_off_topic') || 'Off topic.';
                          return t('onboarding.coach_error') || 'Something went wrong.';
                        })()}</strong>
                        {coachError.answer ? (<div style={{ marginTop: '4px' }}>{coachError.answer}</div>) : null}
                        {coachError.reason === 'network' && (
                          <button
                            type="button"
                            onClick={function () { if (inputText.trim()) doSend(inputText.trim()); }}
                            style={{
                              marginTop: '6px', padding: '4px 10px', borderRadius: '999px',
                              background: '#fff', border: '1px solid #fca5a5',
                              color: '#7f1d1d', fontSize: '11px', fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {t('onboarding.coach_retry') || 'Try again'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Action chips from the latest bot reply */}
                    {coachAvailable && !inFlight && lastChips.length > 0 && (
                      <div style={{
                        marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px',
                      }}>
                        {lastChips.map(function (chip, ci) {
                          var label = chipLabel(chip);
                          if (!label) return null;
                          var isEducator = (chip.kind === 'pick_mode' && chip.key === 'educator');
                          return (
                            <button
                              key={ci}
                              type="button"
                              onClick={function () { handleChipClick(chip); }}
                              aria-label={label + (isEducator ? ' (password-protected)' : '')}
                              style={{
                                padding: '8px 14px', borderRadius: '999px',
                                background: '#fff', border: '1px solid #c4b5fd',
                                color: '#5b21b6', fontSize: '12px', fontWeight: 700,
                                cursor: 'pointer',
                                minHeight: '40px',
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                              }}
                            >
                              <span aria-hidden="true">
                                {chip.kind === 'pick_mode' ? '\u{1F9ED}' :
                                 chip.kind === 'start_tour' ? '\u{1F3AF}' :
                                 chip.kind === 'open_help' ? '\u{1F4DA}' : '\u{1F517}'}
                              </span>
                              <span>{label}</span>
                              {isEducator && (
                                <span aria-hidden="true" style={{ fontSize: '10px', opacity: 0.7 }}>
                                  {'\u{1F510}'}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Live PII warning banner */}
                    {coachAvailable && scrubPreview.flags.length > 0 && (
                      <div
                        role="alert"
                        style={{
                          marginBottom: '10px', padding: '10px 12px', borderRadius: '10px',
                          background: scrubPreview.riskLevel === 'high' ? '#fef2f2' : '#fefce8',
                          border: '1px solid ' + (scrubPreview.riskLevel === 'high' ? '#fca5a5' : '#fde047'),
                          fontSize: '11px',
                          color: scrubPreview.riskLevel === 'high' ? '#7f1d1d' : '#713f12',
                          lineHeight: 1.5,
                        }}
                      >
                        <strong>
                          <span aria-hidden="true">{'\u{26A0}\u{FE0F} '}</span>
                          {scrubPreview.riskLevel === 'high'
                            ? (t('onboarding.coach_pii_high_warn') || 'Looks like student data.')
                            : (t('onboarding.coach_pii_low_warn') || 'Looks like a real name.')}
                        </strong>
                        <div style={{ marginTop: '3px' }}>
                          {scrubPreview.riskLevel === 'high'
                            ? (t('onboarding.coach_pii_high_advice') ||
                               'AlloBot will scrub this before sending. To send anyway, rephrase without identifiers.')
                            : (t('onboarding.coach_pii_low_advice') ||
                               'AlloBot can scrub the name before sending, or you can send as typed.')}
                        </div>
                      </div>
                    )}

                    {/* Input row */}
                    {coachAvailable && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                          <textarea
                            ref={inputRef}
                            data-help-key="onboarding_coach_input"
                            value={inputText}
                            onChange={function (e) { setInputText(e.target.value); }}
                            onKeyDown={function (e) {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendClick();
                              }
                            }}
                            maxLength={500}
                            rows={2}
                            disabled={inFlight}
                            placeholder={t('onboarding.coach_input_placeholder') ||
                              'Ask AlloBot anything about getting started…'}
                            aria-label={t('onboarding.coach_input_aria') || 'Ask AlloBot a question'}
                            style={{
                              width: '100%', boxSizing: 'border-box',
                              padding: '8px 10px', borderRadius: '10px',
                              border: '1px solid ' + (inputText.length > 480 ? '#f59e0b' : '#cbd5e1'),
                              fontSize: '13px', fontFamily: 'inherit', resize: 'vertical',
                              minHeight: '40px', maxHeight: '120px',
                              background: inFlight ? '#f8fafc' : '#fff',
                              color: '#0f172a',
                            }}
                          />
                          {(inputText.length > 450 || usage.remaining <= 5) && (
                            <div style={{
                              marginTop: '3px',
                              display: 'flex', justifyContent: 'space-between',
                              fontSize: '10px',
                              color: '#94a3b8',
                            }}>
                              <span>
                                {usage.remaining <= 5
                                  ? (usage.remaining === 0
                                      ? (t('onboarding.coach_limit_reached') ||
                                         "You've used today's coach quota. Reload to reset.")
                                      : ((usage.remaining + '') + ' ' +
                                         (t('onboarding.coach_questions_remaining') ||
                                           'questions left this session')))
                                  : ''}
                              </span>
                              <span style={{
                                color: inputText.length > 480 ? '#d97706' : '#94a3b8',
                              }}>{inputText.length}/500</span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleSendClick}
                          disabled={!canSend}
                          aria-label={t('onboarding.coach_send') || 'Send question to AlloBot'}
                          style={{
                            padding: '10px 16px', borderRadius: '999px',
                            background: canSend ? '#7c3aed' : '#cbd5e1',
                            color: '#fff', border: 'none',
                            fontWeight: 800, fontSize: '13px',
                            cursor: canSend ? 'pointer' : 'not-allowed',
                            whiteSpace: 'nowrap', flexShrink: 0,
                            boxShadow: canSend ? '0 2px 6px rgba(124,58,237,0.4)' : 'none',
                          }}
                        >
                          {inFlight
                            ? (t('onboarding.coach_sending') || '…')
                            : (t('onboarding.coach_send') || 'Send')}
                        </button>
                      </div>
                    )}

                    {coachAvailable && conversation.length > 0 && (
                      <button
                        type="button"
                        onClick={handleResetConversation}
                        style={{
                          marginTop: '8px',
                          background: 'transparent', border: 'none', padding: 0,
                          color: '#94a3b8', fontSize: '11px',
                          cursor: 'pointer', textDecoration: 'underline',
                        }}
                      >
                        {t('onboarding.coach_reset_conversation') || 'Start over'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <p style={{
                margin: '10px 0 0', fontSize: '10px', color: '#94a3b8',
                textAlign: 'center', fontStyle: 'italic',
              }}>
                {t('onboarding.panel_footer') ||
                  'You can change modes any time. Just close this and click whichever card looks right.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          Tier 3 — First-run consent modal. Gates the very first send
          with an honest Google Gemini disclosure. Persisted in
          localStorage via AlloOnboarding.recordCoachConsent(). Re-prompts
          on backend change or after 180 days.
          ═══════════════════════════════════════════════════════════════ */}
      {showConsent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('onboarding.coach_consent_title') || 'A heads-up about AlloBot'}
          style={{
            position: 'fixed', inset: 0, zIndex: 9200,
            background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div
            style={{
              background: '#fff', borderRadius: '20px',
              maxWidth: '520px', width: '100%',
              padding: '24px',
              boxShadow: '0 30px 70px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <span aria-hidden="true" style={{ fontSize: '36px' }}>{'\u{1F6E1}\u{FE0F}'}</span>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                {t('onboarding.coach_consent_title') || 'A heads-up about AlloBot'}
              </h2>
            </div>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#334155', lineHeight: 1.55 }}>
              {t('onboarding.coach_consent_body') || (
                "AlloBot is powered by Google Gemini. When you ask a question, the text you type is " +
                "sent over the internet to Google's servers and may be logged there. AlloFlow blocks " +
                "student data from your screen automatically, but it cannot read your mind — please " +
                "do not type student names, ID numbers, test scores, addresses, or birthdays into " +
                "the chat. Ask about strategies and tools in general terms."
              )}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleConsentDecline}
                style={{
                  padding: '10px 16px', borderRadius: '999px',
                  background: '#f1f5f9', color: '#475569', border: 'none',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                }}
              >
                {t('onboarding.coach_consent_decline') || 'Not now'}
              </button>
              <button
                type="button"
                onClick={handleConsentAccept}
                style={{
                  padding: '10px 18px', borderRadius: '999px',
                  background: '#7c3aed', color: '#fff', border: 'none',
                  fontWeight: 800, fontSize: '13px', cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(124,58,237,0.45)',
                }}
              >
                {t('onboarding.coach_consent_accept') || 'I understand — start using AlloBot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}
