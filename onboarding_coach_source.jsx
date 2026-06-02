/**
 * AlloFlow — Onboarding Coach Module (Tier 1 + Tier 2)
 *
 * Tier 1 surface: "Not sure? Ask AlloBot" floating launcher + static help
 * panel that shows the 4 LaunchPad mode descriptions plus a CTA to launch
 * the existing TourOverlay.
 *
 * Tier 2 additions (this revision):
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
      desc:  t('launch_pad.learning_tools_desc')  || 'STEM Lab, StoryForge & SEL Hub — explore, create, and grow.',
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
    </React.Fragment>
  );
}
