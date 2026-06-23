/**
 * AlloFlow — Guided Mode Banner Module
 *
 * Sticky banner shown atop the sidebar when the user enables Guided Mode, now a
 * hands-on tutorial rather than a passive table of contents:
 *   - Tier 1 (anchor + explain): a per-step "do this now" instruction plus a
 *     pulsing highlight ring drawn over the active tool (the monolith scrolls it
 *     into view and passes its screen rect as guidedRect).
 *   - Tier 2 (do-it-with-me): when the teacher actually engages the highlighted
 *     tool (guidedEngaged), the instruction flips to an encouraging success note
 *     and the passive "Skip" becomes a primary "Next step" button.
 * Plus the existing expandable "About this step" markdown panel and Exit.
 *
 * Extracted from AlloFlowANTI.txt (May 2026); hands-on tutorial pass (Jun 2026).
 *
 * Required props:
 *   GUIDED_STEPS, GUIDED_TOUR_MAP, guidedStep, guidedRect, guidedEngaged,
 *   handleExitGuidedMode, handleGuidedSkip, setGuidedStep, setShowGuidedTip,
 *   showGuidedTip, t, tourSteps
 *
 * The highlight ring is pointer-events-none (the teacher can still click the real
 * control) and aria-hidden, and it goes static under prefers-reduced-motion.
 */
function GuidedModeBanner({
  GUIDED_STEPS,
  GUIDED_TOUR_MAP,
  guidedStep,
  guidedRect,
  guidedEngaged,
  handleExitGuidedMode,
  handleGuidedSkip,
  setGuidedStep,
  setShowGuidedTip,
  showGuidedTip,
  t,
  tourSteps,
}) {
  const step = GUIDED_STEPS[guidedStep] || {};
  const isLast = guidedStep >= GUIDED_STEPS.length - 1;
  return (
    <>
      <style>{`@keyframes alloGuidedRingPulse{0%,100%{box-shadow:0 0 0 2px rgba(99,102,241,.7),0 0 22px rgba(99,102,241,.45)}50%{box-shadow:0 0 0 3px rgba(129,140,248,.95),0 0 36px rgba(99,102,241,.65)}}@media (prefers-reduced-motion: reduce){.allo-guided-ring{animation:none !important}}`}</style>
      {guidedRect && guidedRect.width > 0 && (
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
          <div role="status" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: guidedEngaged ? 'rgba(34,197,94,0.14)' : 'rgba(99,102,241,0.18)', border: '1px solid ' + (guidedEngaged ? 'rgba(74,222,128,0.4)' : 'rgba(129,140,248,0.35)'), borderRadius: '12px', padding: '10px 12px', marginBottom: '10px' }}>
            <span aria-hidden="true" style={{ fontSize: '14px', lineHeight: '1.4' }}>{guidedEngaged ? '✅' : '👉'}</span>
            <span style={{ fontSize: '11.5px', color: 'white', fontWeight: 600, lineHeight: '1.5' }}>{guidedEngaged ? (step.success || step.action) : step.action}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          {guidedStep === 0 && !guidedEngaged && <span style={{ flex: 1, padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: 'rgba(199,210,254,0.85)', fontStyle: 'italic', textAlign: 'center' }}>{t('guided.source_prompt')}</span>}
          {(guidedStep > 0 || guidedEngaged) && !isLast && <button onClick={handleGuidedSkip} style={{ flex: 1, padding: '6px 12px', fontSize: '11px', fontWeight: 800, color: 'white', background: guidedEngaged ? 'linear-gradient(135deg, #818cf8, #6366f1)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{guidedEngaged ? (t('guided.next_step') || 'Next step →') : (t('guided.skip_step') || t('guided.skip'))}</button>}
          {isLast && <button onClick={() => { setGuidedStep(0); handleExitGuidedMode(); }} style={{ flex: 1, padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #818cf8, #6366f1)', border: 'none', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{t('guided.all_done')}</button>}
          <button onClick={() => setShowGuidedTip(p => !p)} style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: showGuidedTip ? 'white' : '#c7d2fe', background: showGuidedTip ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{showGuidedTip ? '✕' : 'ℹ️'} {t('guided.about')}</button>
          <button onClick={handleExitGuidedMode} style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 700, color: 'rgba(248,113,113,0.9)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}>{t('guided.exit') || 'Exit'}</button>
        </div>
        {showGuidedTip && (() => {
          const stepId = GUIDED_STEPS[guidedStep]?.id;
          const tourId = stepId ? GUIDED_TOUR_MAP[stepId] : null;
          const tourEntry = tourId ? tourSteps.find(s => s.id === tourId) : null;
          return tourEntry ? (
            <div style={{ marginTop: '10px', padding: '12px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeIn 0.3s ease-out' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(165,180,252,0.95)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>{t('guided.about_prefix')} {tourEntry.title}</div>
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
