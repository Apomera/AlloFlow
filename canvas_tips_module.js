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
  if (window.AlloModules && window.AlloModules.CanvasTips) {
    console.log('[CDN] CanvasTipsModule already loaded, skipping');
    return;
  }

const CANVAS_LOADING_TIPS = [
  "💡 Use the Wizard to auto-generate complete lesson plans in seconds",
  "🎨 Explore 18+ interactive STEM lab tools from the lesson toolbar",
  "🔊 Click any text to hear it read aloud in 30+ natural voices",
  "📊 BehaviorLens includes 80+ observation and analysis tools for educators",
  "✏️ The Report Writer creates clinical reports with AI accuracy checks",
  "🌐 Change your app language anytime in Settings — 40+ languages supported",
  "🎮 Try Boss Battle mode in quizzes for gamified classroom engagement",
  "📱 Share a session code with students for live participation and collaboration",
  "❓ Toggle Help Mode for guided tooltips on every button and feature",
  "🧭 Enable Guided Mode to walk through complex features step by step",
  "📡 Start a Live Session to sync content and quizzes with your students in real time",
];
function CanvasLoadingTips() {
  const [tipIdx, setTipIdx] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setTipIdx(i => (i + 1) % CANVAS_LOADING_TIPS.length), 4000);
    return () => clearInterval(timer);
  }, []);
  return React.createElement('p', {
    style: {
      color: '#475569', fontSize: '13px', fontStyle: 'italic',
      minHeight: '40px', transition: 'opacity 0.5s', lineHeight: 1.5
    }
  }, CANVAS_LOADING_TIPS[tipIdx]);
}

  if (typeof window !== 'undefined') {
    window.CANVAS_LOADING_TIPS = CANVAS_LOADING_TIPS;
    window.CanvasLoadingTips = CanvasLoadingTips;
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.CanvasTips = {
    CANVAS_LOADING_TIPS: CANVAS_LOADING_TIPS,
    CanvasLoadingTips: CanvasLoadingTips
  };

  if (typeof window._upgradeCanvasTips === 'function') {
    try { window._upgradeCanvasTips(); } catch (e) { console.warn('[CanvasTips] upgrade hook failed', e); }
  }

  console.log('[CDN] CanvasTipsModule loaded — ' + CANVAS_LOADING_TIPS.length + ' tips');
})();
