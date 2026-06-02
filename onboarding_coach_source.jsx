/**
 * AlloFlow — Onboarding Coach Module (Tier 1)
 *
 * "Not sure? Ask AlloBot" floating launcher + static help panel that shows
 * the 4 LaunchPad mode descriptions with hand-written "Best if..." guidance,
 * plus a CTA to launch the existing TourOverlay.
 *
 * Tier 1 deliberately ships NO LLM, NO TTS, NO voice — it's a validity probe:
 * do 0-familiarity users actually engage an onboarding bot? If they do, Tier 2
 * adds screen-context helpers + contextual speak() calls. If they don't, the
 * whole LLM-Q&A arc gets cut before the build.
 *
 * Visibility: the host should render this only while LaunchPad is showing
 * (same conditional as <LaunchPadView/>) — see AlloFlowANTI.txt render site.
 *
 * Architecture: 1 CDN module, ~250 lines, ≤6 unavoidable AlloFlowANTI.txt
 * lines (loadModule + render + shim). No business logic touches the host.
 *
 * Source for built module: onboarding_coach_module.js (via
 * _build_onboarding_coach_module.js — same pattern as visual_supports).
 */
function OnboardingCoach(props) {
  var t = (typeof props.t === 'function') ? props.t : function(k){ return k; };
  var setRunTour = props.setRunTour;
  var _open = React.useState(false);
  var isOpen = _open[0]; var setIsOpen = _open[1];

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
      icon: '\u{1F6E0}️',
      title: t('launch_pad.educator_tools_title') || 'Educator Tools',
      desc:  t('launch_pad.educator_tools_desc')  || 'BehaviorLens, Report Writer, and professional clinical tools — password protected.',
      bestIf: t('onboarding.educator_best_if') ||
        'Best if you’re a teacher, clinician, or school psychologist on a password-protected workstation.',
    },
  ];

  var openTour = function() {
    setIsOpen(false);
    if (typeof setRunTour === 'function') setRunTour(true);
  };

  return (
    <React.Fragment>
      {/* Floating launcher — anchored bottom-right, visible whenever LaunchPad renders.
          z-index sits above LaunchPad content but below the panel overlay (9100). */}
      {!isOpen && (
        <button
          type="button"
          onClick={function(){ setIsOpen(true); }}
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
          onMouseDown={function(e){ e.currentTarget.style.transform = 'scale(0.97)'; }}
          onMouseUp={function(e){ e.currentTarget.style.transform = 'scale(1)'; }}
          onMouseLeave={function(e){ e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <span aria-hidden="true">{'\u{1F916}'}</span>
          <span>{t('onboarding.ask_allobot_label') || 'Not sure? Ask AlloBot'}</span>
        </button>
      )}

      {/* Panel overlay — centered modal with the 4 mode cards + tour CTA. */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('onboarding.panel_aria') || 'AlloBot onboarding help'}
          style={{
            position: 'fixed', inset: 0, zIndex: 9100,
            background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
          onClick={function(e){ if (e.target === e.currentTarget) setIsOpen(false); }}
          onKeyDown={function(e){ if (e.key === 'Escape') setIsOpen(false); }}
          tabIndex={-1}
        >
          <div
            onClick={function(e){ e.stopPropagation(); }}
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
                onClick={function(){ setIsOpen(false); }}
                aria-label={t('common.close') || 'Close'}
                style={{
                  background: 'rgba(255,255,255,0.18)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px', padding: '6px 12px',
                  cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                }}
              >{'✕'}</button>
            </div>

            {/* Mode cards */}
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {modes.map(function(m){
                return (
                  <div key={m.key} style={{
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
                <div style={{
                  marginTop: '6px', padding: '14px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%)',
                  border: '1px solid #fbbf24',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '12px', flexWrap: 'wrap',
                }}>
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
