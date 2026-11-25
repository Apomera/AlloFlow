/**
 * AlloFlow — Canvas Loading Tips Module
 *
 * The CANVAS_LOADING_TIPS array (11 rotating tip strings) plus the small
 * CanvasLoadingTips React component that cycles through them every 4s.
 * Used during initial app load to give the user something to read.
 *
 * Pure data + 12-line React component. Zero external dependencies.
 *
 * Extracted verbatim from AlloFlowANTI.txt lines 41016-41041 (May 2026).
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window) return;
  if (window.AlloModules && typeof window.AlloModules === 'object' && window.AlloModules.CanvasTips) {
    if (typeof console !== 'undefined' && console.log) console.log('[CDN] CanvasTipsModule already loaded, skipping');
    return;
  }

const CANVAS_LOADING_TIPS = Object.freeze([
  "💡 Use the Wizard to auto-generate complete lesson plans in seconds",
  "🎨 Explore 18+ interactive STEAM lab tools from the lesson toolbar",
  "🔊 Click any text to hear it read aloud in 30+ natural voices",
  "📊 BehaviorLens includes 80+ observation and analysis tools for educators",
  "✏️ The Report Writer creates clinical reports with AI accuracy checks",
  "🌐 Change your app language anytime in Settings — 60+ languages supported",
  "🎮 Try Boss Battle mode in quizzes for gamified classroom engagement",
  "📱 Share a session code with students for live participation and collaboration",
  "❓ Toggle Help Mode for guided tooltips on every button and feature",
  "🧭 Enable Guided Mode to walk through complex features step by step",
  "📡 Start a Live Session to sync content and quizzes with your students in real time",
]);
function CanvasLoadingTips() {
  var _R = typeof React !== 'undefined' ? React : (typeof window !== 'undefined' && window ? window.React : null);
  if (!_R || typeof _R.useState !== 'function' || typeof _R.useEffect !== 'function' || typeof _R.createElement !== 'function') {
    return null;
  }
  const [tipIdx, setTipIdx] = _R.useState(0);
  var reducedMotion = false;
  try {
    reducedMotion = !!(typeof window !== 'undefined' && window && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (_) {}
  _R.useEffect(() => {
    if (!CANVAS_LOADING_TIPS.length || reducedMotion || typeof setInterval !== 'function') return undefined;
    const timer = setInterval(() => setTipIdx(i => ((Number.isFinite(i) && i >= 0 ? Math.floor(i) : 0) + 1) % CANVAS_LOADING_TIPS.length), 4000);
    return () => { if (typeof clearInterval === 'function') clearInterval(timer); };
  }, [reducedMotion]);
  const safeIdx = (Number.isFinite(tipIdx) && tipIdx >= 0) ? (Math.floor(tipIdx) % CANVAS_LOADING_TIPS.length) : 0;
  const tipText = CANVAS_LOADING_TIPS.length > 0 ? CANVAS_LOADING_TIPS[safeIdx] : '';
  return _R.createElement('p', {
    style: {
      color: '#475569', fontSize: '13px', fontStyle: 'italic',
      minHeight: '40px', transition: reducedMotion ? 'none' : 'opacity 0.5s', lineHeight: 1.5
    }
  }, tipText);
}

  window.CANVAS_LOADING_TIPS = CANVAS_LOADING_TIPS;
  window.CanvasLoadingTips = CanvasLoadingTips;

  window.AlloModules = (window.AlloModules && typeof window.AlloModules === 'object') ? window.AlloModules : {};
  window.AlloModules.CanvasTips = Object.freeze({
    CANVAS_LOADING_TIPS: CANVAS_LOADING_TIPS,
    CanvasLoadingTips: CanvasLoadingTips
  });

  if (typeof window._upgradeCanvasTips === 'function') {
    try { window._upgradeCanvasTips(); } catch (e) { if (typeof console !== 'undefined' && console.warn) console.warn('[CanvasTips] upgrade hook failed:', e && e.message ? e.message : String(e)); }
  }

  if (typeof console !== 'undefined' && console.log) console.log('[CDN] CanvasTipsModule loaded — ' + CANVAS_LOADING_TIPS.length + ' tips');
})();
