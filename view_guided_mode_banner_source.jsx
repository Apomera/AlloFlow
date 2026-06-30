/**
 * AlloFlow — Guided Mode Banner Module
 *
 * Sticky banner shown atop the sidebar when the user enables Guided Mode, now a
 * hands-on tutorial rather than a passive table of contents:
 *   - Tier 1 (anchor + explain): a per-step "do this now" instruction plus a
 *     pulsing highlight ring drawn over the active tool (the monolith scrolls it
 *     into view and passes its screen rect as guidedRect).
 *   - Tier 2 (do-it-with-me): clicking the highlighted tool flips guidedEngaged,
 *     which surfaces the primary "Next step" button. The encouraging success note
 *     (✅), however, only appears once the step's work has *actually happened* — a
 *     new history item was produced (generate steps), real source text was entered
 *     (source step), or the tool was opened (the few interaction-only steps). This
 *     keeps "Analysis done" honest: it no longer flashes on the click that merely
 *     starts the (async) run.
 * Plus the expandable "About this step" markdown panel (now with a read-aloud
 * button reusing window.callTTS); on the source step, a "Try this example"
 * affordance that loads a real starter passage to run the genuine tools on; and
 * on every other step, a "Show an example" toggle that asks the host to render a
 * badged, display-only example card in the panel (onShowGuidedExample) — that card
 * is never written to history, so examples can't reach the resource pack.
 *
 * Extracted from AlloFlowANTI.txt (May 2026); hands-on tutorial pass (Jun 2026);
 * completion-gating + About TTS + example passage + per-step examples (Jun 2026).
 *
 * Required props:
 *   GUIDED_STEPS, GUIDED_TOUR_MAP, guidedStep, guidedRect, guidedEngaged,
 *   handleExitGuidedMode, handleGuidedSkip, setGuidedStep, setShowGuidedTip,
 *   showGuidedTip, t, tourSteps, history
 * Optional props:
 *   inputText, setInputText (enable the source-step "Try this example" button),
 *   onShowGuidedExample, guidedExampleId (enable the per-step "Show an example" toggle)
 *
 * The highlight ring is pointer-events-none (the teacher can still click the real
 * control) and aria-hidden, and it goes static under prefers-reduced-motion.
 */
// A real starter passage for the source step's "Try this example" affordance — a teacher exploring
// Guided Mode gets concrete text to run the *actual* tools on (no canned/faked tool output is ever
// shown; everything downstream is genuinely generated from this). Content-rich + structured so the
// analysis, glossary, organizer, etc. each have something meaningful to work with.
const GUIDED_SAMPLE_TEXT = "Photosynthesis is the process that plants, algae, and some bacteria use to turn sunlight into food. Inside a plant's leaves, a green pigment called chlorophyll captures energy from the sun. The plant takes in carbon dioxide from the air through tiny openings called stomata, and it absorbs water from the soil through its roots. Using the sun's energy, the plant combines the carbon dioxide and water to make glucose, a kind of sugar that stores energy for later. As a by-product, the plant releases oxygen back into the air — the same oxygen that animals and people need to breathe. Without photosynthesis, most life on Earth could not survive.";

function GuidedModeBanner({
  GUIDED_STEPS,
  allGuidedSteps,
  guidedSelectedIds,
  toggleGuidedStepId,
  GUIDED_TOUR_MAP,
  guidedStep,
  guidedRect,
  guidedEngaged,
  wizardOpen,
  handleExitGuidedMode,
  handleGuidedSkip,
  setGuidedStep,
  setShowGuidedTip,
  showGuidedTip,
  t,
  tourSteps,
  history,
  getDefaultTitle,
  inputText,
  setInputText,
  onShowGuidedExample,
  guidedExampleId,
}) {
  const step = GUIDED_STEPS[guidedStep] || {};
  const isLast = guidedStep >= GUIDED_STEPS.length - 1;
  const [showPicker, setShowPicker] = React.useState(false);

  // --- "Done" must mean the step's tool actually produced output, not merely that the teacher
  // clicked the ringed tool. The monolith flips `guidedEngaged` on the first *click* of the
  // highlighted control (so the "Next step" affordance can appear), but the ✅ success note has to
  // wait for the real, often-async result — otherwise "Analysis done" flashed the instant the
  // panel was clicked, before Analyze had even run. Completion signal = a new history item appeared
  // since we arrived at this step. (2026-06-30)
  // Interaction-only steps create no generated history item, so they keep a real-but-coarse signal:
  // the source step keys on actual entered text; Word Sounds / STEM Lab / Adventure / the final
  // download fall back to the click (`guidedEngaged`) — the best signal available for those.
  const GUIDED_CLICK_STEPS = ['ui-tool-wordsounds', 'math', 'adventure', '_final'];
  const _histLen = Array.isArray(history) ? history.length : 0;
  const _stepBaseRef = React.useRef(_histLen);
  const _prevStepRef = React.useRef(guidedStep);
  if (_prevStepRef.current !== guidedStep) {
    _prevStepRef.current = guidedStep;          // re-baseline synchronously on step change so a
    _stepBaseRef.current = _histLen;            // prior step's output can't flash this one "done"
  }
  const stepDone =
    step.id === 'source-input' ? ((inputText || '').trim().length > 20) :
    GUIDED_CLICK_STEPS.indexOf(step.id) !== -1 ? !!guidedEngaged :
    (_histLen > _stepBaseRef.current);

  // --- About-panel read-aloud: reuse the app's TTS (window.callTTS, the teacher's selected voice)
  // so a step explanation can be listened to instead of read. Leak-safe: the blob URL is revoked
  // when playback ends, the step changes, the panel closes, or the banner unmounts. A generation
  // token cancels an in-flight synth cleanly if the teacher stops or navigates mid-load. (2026-06-30)
  const [ttsState, setTtsState] = React.useState('idle'); // 'idle' | 'loading' | 'playing'
  const _ttsAudioRef = React.useRef(null);
  const _ttsUrlRef = React.useRef(null);
  const _ttsGenRef = React.useRef(0);
  const _stopTts = React.useCallback(() => {
    _ttsGenRef.current++;
    const a = _ttsAudioRef.current; _ttsAudioRef.current = null;
    if (a) { try { a.pause(); a.src = ''; } catch (_) {} }
    const u = _ttsUrlRef.current; _ttsUrlRef.current = null;
    if (u) { try { URL.revokeObjectURL(u); } catch (_) {} }
    setTtsState('idle');
  }, []);
  React.useEffect(() => _stopTts, [_stopTts]);                         // stop on unmount
  React.useEffect(() => { _stopTts(); }, [guidedStep, showGuidedTip, _stopTts]); // ...and on step/panel change
  const playAbout = async (rawText) => {
    if (ttsState !== 'idle') { _stopTts(); return; }                  // toggle: a second click stops
    if (typeof window === 'undefined' || typeof window.callTTS !== 'function') return;
    const plain = String(rawText || '').replace(/[#*`_>]/g, '').replace(/\s+/g, ' ').trim();
    if (!plain) return;
    const myGen = ++_ttsGenRef.current;
    setTtsState('loading');
    let url = null;
    try { url = await window.callTTS(plain, (window.__alloSelectedVoice || 'Puck'), (window.__alloPlaybackRate || 1), { maxRetries: 2 }); } catch (_) { url = null; }
    if (myGen !== _ttsGenRef.current) { if (url) { try { URL.revokeObjectURL(url); } catch (_) {} } return; } // superseded
    if (!url) { setTtsState('idle'); return; }
    _ttsUrlRef.current = url;
    const audio = new Audio(url); _ttsAudioRef.current = audio;
    audio.onended = _stopTts; audio.onerror = _stopTts;
    try { await audio.play(); if (myGen === _ttsGenRef.current) setTtsState('playing'); else _stopTts(); }
    catch (_) { _stopTts(); }
  };
  const allSteps = allGuidedSteps || GUIDED_STEPS;
  // null selection = every step on; source-input is always on (the pipeline needs it).
  const isStepOn = (id) => !guidedSelectedIds || id === 'source-input' || guidedSelectedIds.indexOf(id) !== -1;
  // End-of-flow recap: what the teacher actually built (from history).
  const humanize = (type) => (getDefaultTitle ? getDefaultTitle(type) : String(type || '').replace(/[-_]/g, ' '));
  const recapItems = isLast ? (history || []).filter(h => h && h.type && h.type !== 'udl-advice' && h.type !== 'guided').map(h => h.title || humanize(h.type)) : [];
  return (
    <>
      <style>{`@keyframes alloGuidedRingPulse{0%,100%{box-shadow:0 0 0 2px rgba(99,102,241,.7),0 0 22px rgba(99,102,241,.45)}50%{box-shadow:0 0 0 3px rgba(129,140,248,.95),0 0 36px rgba(99,102,241,.65)}}@media (prefers-reduced-motion: reduce){.allo-guided-ring{animation:none !important}}`}</style>
      {guidedRect && guidedRect.width > 0 && !wizardOpen && (
        <div aria-hidden="true" className="allo-guided-ring" style={{
          position: 'fixed', top: guidedRect.top - 6, left: guidedRect.left - 6,
          width: guidedRect.width + 12, height: guidedRect.height + 12,
          borderRadius: '18px', pointerEvents: 'none', zIndex: 9000,
          boxShadow: '0 0 0 2px rgba(99,102,241,.7), 0 0 22px rgba(99,102,241,.45)',
          animation: 'alloGuidedRingPulse 2s ease-in-out infinite',
        }} />
      )}
      <div style={{ background: 'linear-gradient(135deg, #312e81, #1e3a5f)', borderRadius: '20px', padding: '16px', marginBottom: '16px', border: '1px solid rgba(99,102,241,0.3)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>{t('guided.indicator_title')}</span>
          <span style={{ fontSize: '11px', color: '#c7d2fe', fontWeight: 600 }}>{t('guided.step_of').replace('{current}', Math.min(guidedStep + 1, GUIDED_STEPS.length)).replace('{total}', GUIDED_STEPS.length)}</span>
        </div>
        <p style={{ fontSize: '11px', color: '#c7d2fe', margin: '0 0 10px', fontWeight: 600 }}>{step.label || 'Complete!'}</p>
        <div style={{ width: '100%', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{ height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg, #818cf8, #6366f1)', transition: 'width 0.4s ease-out', width: ((guidedStep / GUIDED_STEPS.length) * 100) + '%' }} />
        </div>
        {step.action && (
          <div role="status" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: stepDone ? 'rgba(34,197,94,0.14)' : 'rgba(99,102,241,0.18)', border: '1px solid ' + (stepDone ? 'rgba(74,222,128,0.4)' : 'rgba(129,140,248,0.35)'), borderRadius: '12px', padding: '10px 12px', marginBottom: '10px' }}>
            <span aria-hidden="true" style={{ fontSize: '14px', lineHeight: '1.4' }}>{stepDone ? '✅' : '👉'}</span>
            <span style={{ fontSize: '11.5px', color: 'white', fontWeight: 600, lineHeight: '1.5' }}>{stepDone ? (step.success || step.action) : step.action}</span>
          </div>
        )}
        {step.id === 'source-input' && !stepDone && typeof setInputText === 'function' && (
          <button onClick={() => setInputText(GUIDED_SAMPLE_TEXT)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '8px 12px', marginBottom: '10px', fontSize: '11px', fontWeight: 700, color: '#e0e7ff', background: 'rgba(255,255,255,0.06)', border: '1px dashed rgba(165,180,252,0.5)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <span aria-hidden="true">✨</span>{t('guided.try_example') || 'New here? Try it with an example passage'}
          </button>
        )}
        {step.id !== 'source-input' && typeof onShowGuidedExample === 'function' && (
          <button onClick={() => onShowGuidedExample(step.id)} aria-pressed={guidedExampleId === step.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', padding: '8px 12px', marginBottom: '10px', fontSize: '11px', fontWeight: 700, color: guidedExampleId === step.id ? '#fde68a' : '#e0e7ff', background: guidedExampleId === step.id ? 'rgba(251,191,36,0.14)' : 'rgba(255,255,255,0.06)', border: '1px dashed ' + (guidedExampleId === step.id ? 'rgba(251,191,36,0.6)' : 'rgba(165,180,252,0.5)'), borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <span aria-hidden="true">👁</span>{guidedExampleId === step.id ? (t('guided.example_hide') || 'Hide the example') : (t('guided.example_show') || 'Show an example in the panel')}
          </button>
        )}
        {isLast && (
          <div role="status" style={{ marginBottom: '10px', padding: '11px 13px', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(74,222,128,0.35)', borderRadius: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'white', marginBottom: '6px' }}>🎉 {t('guided.recap_title') || 'Your lesson is built'}</div>
            {recapItems.length > 0 ? (
              <>
                <div style={{ fontSize: '11px', color: 'rgba(203,213,225,0.9)', marginBottom: '6px' }}>{(t('guided.recap_count') || 'You created {n} resources:').replace('{n}', recapItems.length)}</div>
                <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                  {recapItems.slice(0, 12).map((title, i) => (
                    <div key={i} style={{ fontSize: '11px', color: 'white', display: 'flex', gap: '6px', marginBottom: '2px', alignItems: 'flex-start' }}>
                      <span aria-hidden="true" style={{ color: '#4ade80' }}>✓</span><span>{title}</span>
                    </div>
                  ))}
                  {recapItems.length > 12 && <div style={{ fontSize: '11px', color: 'rgba(203,213,225,0.7)' }}>+{recapItems.length - 12} {t('guided.recap_more') || 'more'}</div>}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '11px', color: 'rgba(203,213,225,0.9)' }}>{t('guided.recap_empty') || 'Generate resources from the tools, then download your full pack below.'}</div>
            )}
            <div style={{ fontSize: '11px', color: 'rgba(203,213,225,0.8)', marginTop: '8px', fontStyle: 'italic' }}>{t('guided.recap_hub') || 'Looking for more? The Learning Hub has StoryForge, PoetTree, and LitLab.'}</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          {guidedStep === 0 && !guidedEngaged && <span style={{ flex: 1, padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: 'rgba(199,210,254,0.85)', fontStyle: 'italic', textAlign: 'center' }}>{t('guided.source_prompt')}</span>}
          {(guidedStep > 0 || guidedEngaged) && !isLast && <button onClick={handleGuidedSkip} style={{ flex: 1, padding: '6px 12px', fontSize: '11px', fontWeight: 800, color: 'white', background: guidedEngaged ? 'linear-gradient(135deg, #818cf8, #6366f1)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{guidedEngaged ? (t('guided.next_step') || 'Next step →') : (t('guided.skip_step') || t('guided.skip'))}</button>}
          {isLast && <button onClick={() => { setGuidedStep(0); handleExitGuidedMode(); }} style={{ flex: 1, padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #818cf8, #6366f1)', border: 'none', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{t('guided.all_done')}</button>}
          {toggleGuidedStepId && <button onClick={() => setShowPicker(p => !p)} aria-label={t('guided.customize') || 'Choose which steps to include'} aria-expanded={showPicker} title={t('guided.customize') || 'Choose which steps to include'} style={{ padding: '6px 10px', fontSize: '11px', fontWeight: 700, color: showPicker ? 'white' : '#c7d2fe', background: showPicker ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>⚙</button>}
          <button onClick={() => setShowGuidedTip(p => !p)} style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: showGuidedTip ? 'white' : '#c7d2fe', background: showGuidedTip ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{showGuidedTip ? '✕' : 'ℹ️'} {t('guided.about')}</button>
          <button onClick={handleExitGuidedMode} style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: 'rgba(248,113,113,0.9)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{t('guided.exit') || 'Exit'}</button>
        </div>
        {showPicker && toggleGuidedStepId && (
          <div role="group" aria-label={t('guided.choose_steps') || 'Choose which steps to include'} style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '220px', overflowY: 'auto', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(165,180,252,0.95)', marginBottom: '8px' }}>{t('guided.choose_steps') || 'Choose which steps to include'} ({allSteps.filter(s => isStepOn(s.id)).length}/{allSteps.length})</div>
            {allSteps.map(s => {
              const on = isStepOn(s.id);
              const locked = s.id === 'source-input';
              return (
                <button key={s.id} role="checkbox" aria-checked={on} disabled={locked} onClick={() => { if (!locked) toggleGuidedStepId(s.id); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '5px 6px', marginBottom: '2px', background: on ? 'rgba(99,102,241,0.16)' : 'transparent', border: 'none', borderRadius: '8px', cursor: locked ? 'default' : 'pointer', opacity: locked ? 0.6 : 1 }}>
                  <span aria-hidden="true" style={{ width: '14px', height: '14px', borderRadius: '4px', border: '1.5px solid ' + (on ? '#818cf8' : 'rgba(255,255,255,0.3)'), background: on ? '#6366f1' : 'transparent', color: 'white', fontSize: '10px', lineHeight: '12px', textAlign: 'center', flexShrink: 0 }}>{on ? '✓' : ''}</span>
                  <span style={{ fontSize: '11px', color: on ? 'white' : 'rgba(203,213,225,0.75)', fontWeight: 600 }}>{s.label}{locked ? ' ' + (t('guided.required') || '(required)') : ''}</span>
                </button>
              );
            })}
          </div>
        )}
        {showGuidedTip && (() => {
          const stepId = GUIDED_STEPS[guidedStep]?.id;
          const tourId = stepId ? GUIDED_TOUR_MAP[stepId] : null;
          const tourEntry = tourId ? tourSteps.find(s => s.id === tourId) : null;
          return tourEntry ? (
            <div style={{ marginTop: '10px', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(165,180,252,0.95)', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{t('guided.about_prefix')} {tourEntry.title}</span>
                {typeof window !== 'undefined' && typeof window.callTTS === 'function' && (
                  <button
                    onClick={() => playAbout((tourEntry.title || '') + '. ' + (tourEntry.text || ''))}
                    disabled={ttsState === 'loading'}
                    aria-label={ttsState === 'playing' ? (t('guided.stop_listening') || 'Stop reading aloud') : (t('guided.listen') || 'Read this aloud')}
                    title={ttsState === 'playing' ? (t('guided.stop_listening') || 'Stop reading aloud') : (t('guided.listen') || 'Read this aloud')}
                    style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', fontSize: '10px', fontWeight: 700, color: ttsState === 'playing' ? 'white' : '#c7d2fe', background: ttsState === 'playing' ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '8px', cursor: ttsState === 'loading' ? 'wait' : 'pointer', opacity: ttsState === 'loading' ? 0.7 : 1 }}
                  >
                    <span aria-hidden="true">{ttsState === 'loading' ? '⏳' : ttsState === 'playing' ? '⏹' : '🔊'}</span>
                    {ttsState === 'playing' ? (t('guided.stop') || 'Stop') : (t('guided.listen_short') || 'Listen')}
                  </button>
                )}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(203,213,225,0.85)', lineHeight: '1.6', margin: 0 }}>
                {(tourEntry.text || '').split(/\r?\n/).map((line, i) => {
                  const cleanLine = line.trim();
                  if (!cleanLine) return <div key={i} className="h-1.5" />;
                  const formatText = (text) => {
                    if (!text) return null;
                    return text.split('**').map((part, bIdx) => {
                      if (bIdx % 2 === 1) return <strong key={'b-'+bIdx} style={{ fontWeight: 800, color: 'rgba(199,210,254,0.95)' }}>{part}</strong>;
                      return part.split('*').map((sub, iIdx) => {
                        if (iIdx % 2 === 1) return <em key={'i-'+bIdx+'-'+iIdx} style={{ fontStyle: 'italic', color: '#c7d2fe' }}>{sub}</em>;
                        return sub;
                      });
                    });
                  };
                  if (cleanLine.startsWith('###')) {
                    const headerText = cleanLine.replace(/^###\s*/, '').trim();
                    return <h5 key={i} style={{ color: 'rgba(129,140,248,0.95)', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '10px', marginBottom: '4px', paddingBottom: '3px', borderBottom: '1px solid rgba(129,140,248,0.2)' }}>{formatText(headerText)}</h5>;
                  }
                  const isBullet = cleanLine.startsWith('•') || cleanLine.startsWith('-') || cleanLine.startsWith('* ');
                  if (isBullet) {
                    const bulletMarker = cleanLine.startsWith('* ') ? '* ' : cleanLine.charAt(0);
                    const bulletText = cleanLine.substring(bulletMarker.length).trim();
                    return <div key={i} style={{ display: 'grid', gridTemplateColumns: '10px 1fr', gap: '4px', marginBottom: '2px', alignItems: 'start' }}><span style={{ marginTop: '6px', width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(129,140,248,0.6)', display: 'inline-block' }} /><span style={{ color: 'rgba(203,213,225,0.9)', fontSize: '11px', lineHeight: '1.6' }}>{formatText(bulletText)}</span></div>;
                  }
                  return <p key={i} style={{ color: 'rgba(203,213,225,0.85)', margin: '0 0 4px', lineHeight: '1.6' }}>{formatText(cleanLine)}</p>;
                })}
              </div>
            </div>
          ) : null;
        })()}
      </div>
    </>
  );
}
