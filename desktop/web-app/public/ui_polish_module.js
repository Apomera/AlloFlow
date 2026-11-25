/**
 * AlloFlow UI Polish Module
 *
 * Three small, reusable polish primitives — exposed on
 * window.AlloModules.UIPolish for any view module / panel to drop in
 * without each one reimplementing its own loading/empty/juice UI.
 *
 * 2026-06-10 — created to give the high-density legacy view panels a
 * shared polish surface without surgical edits to their 1900-char
 * minified JSX. Each component is React-only, no hooks, no host deps;
 * uses only CSS classes defined inline in AlloFlowANTI.txt
 * (allo-correct-pulse, allo-wrong-nudge, allo-section-enter,
 * allo-empty-float, alloflow-skeleton).
 *
 * Pedagogically conservative: motion is subtle (≤480ms), gated by
 * prefers-reduced-motion, and reserved for ENGAGEMENT moments
 * (first-load empty states, AI generation in progress, correct/wrong
 * feedback). Never animates during sustained reading.
 *
 * Usage:
 *   const { EmptyState, LoadingSkeleton, JuiceWrap } =
 *     window.AlloModules.UIPolish;
 *   // …in render:
 *   if (!data) return React.createElement(EmptyState, {
 *     emoji: '📖', title: 'No glossary yet',
 *     hint: 'Generate one or paste your text to begin.',
 *   });
 */
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window) return;
  if (window.AlloModules && typeof window.AlloModules === 'object' && window.AlloModules.UIPolish) {
    if (typeof console !== 'undefined' && console.log) console.log('[UIPolish] Already loaded, skipping');
    return;
  }
  if (!window.React || typeof window.React.createElement !== 'function') {
    if (typeof console !== 'undefined' && console.warn) console.warn('[UIPolish] React not available, skipping');
    return;
  }
  var React = window.React;
  var h = React.createElement;

  var SAFE_COLOR_RE = /^(?:#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})|[a-z]{1,30}|(?:rgb|rgba|hsl|hsla)\([\d.,%\s]+\))$/i;
  function safeColor(v, fallback) {
    return (typeof v === 'string' && SAFE_COLOR_RE.test(v.trim())) ? v.trim() : fallback;
  }

  // ── EmptyState ──────────────────────────────────────────────────────
  // Friendly first-load placeholder. Replaces "nothing renders" with a
  // short "what goes here" prompt. Optional primary action button.
  //
  // Props: { emoji, title, hint, ctaLabel, onCta, accentColor }
  function EmptyState(props) {
    props = (props && typeof props === 'object') ? props : {};
    var emoji = props.emoji || '✨';
    var title = props.title || '';
    var hint = props.hint || '';
    var ctaLabel = props.ctaLabel || '';
    var onCta = typeof props.onCta === 'function' ? props.onCta : null;
    var accent = safeColor(props.accentColor, '#6366f1'); // indigo-500
    return h('div', {
      className: 'flex flex-col items-center justify-center py-12 px-6 text-center',
      role: 'status',
    },
      h('div', {
        className: 'text-5xl mb-3 allo-empty-float select-none',
        'aria-hidden': 'true',
      }, emoji),
      title && h('h3', { className: 'text-base font-bold text-slate-800 mb-1' }, title),
      hint && h('p', { className: 'text-sm text-slate-600 max-w-md leading-relaxed' }, hint),
      ctaLabel && onCta && h('button', {
        type: 'button',
        onClick: onCta,
        className: 'mt-4 px-4 py-2 rounded-lg text-sm font-bold text-white transition-transform motion-reduce:transition-none hover:scale-105 motion-reduce:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2',
        style: { background: accent },
      }, ctaLabel)
    );
  }

  // ── LoadingSkeleton ────────────────────────────────────────────────
  // Shape-placeholder for AI generation in progress. Renders N stacked
  // bars matching the rough layout of the result so the perceived speed
  // jumps even when actual speed is identical.
  //
  // Props: { lines, variant: 'card' | 'list' | 'table' | 'reader' }
  function LoadingSkeleton(props) {
    props = (props && typeof props === 'object') ? props : {};
    var hasLines = props.lines !== null && props.lines !== undefined && props.lines !== '' && typeof props.lines !== 'boolean';
    var rawLines = hasLines ? Number(props.lines) : NaN;
    var lines = Number.isFinite(rawLines) ? Math.max(1, Math.min(24, Math.floor(rawLines))) : 4;
    var variant = props.variant || 'list';
    var ariaLabel = typeof props.ariaLabel === 'string' && props.ariaLabel.trim() ? props.ariaLabel : '';
    var bars = [];
    for (var i = 0; i < lines; i++) {
      // Stagger widths so it looks like real content shapes, not bars.
      var w;
      if (variant === 'card')   w = i === 0 ? '60%' : (i === lines - 1 ? '40%' : '100%');
      else if (variant === 'reader') w = i % 4 === 3 ? '70%' : '100%';
      else if (variant === 'table')  w = ['25%', '40%', '20%', '15%'][i % 4];
      else                           w = i === lines - 1 ? '70%' : '100%';
      bars.push(h('div', {
        key: i,
        'aria-hidden': 'true',
        className: 'alloflow-skeleton',
        style: {
          height: variant === 'reader' ? '14px' : '12px',
          width: w,
          marginBottom: variant === 'reader' ? '10px' : '8px',
        },
      }));
    }
    return h('div', {
      className: 'py-3',
      role: 'status',
      'aria-busy': 'true',
      'aria-label': ariaLabel || 'Loading',
    },
      h('div', { className: 'sr-only' }, ariaLabel || 'Loading…'),
      bars
    );
  }

  // ── JuiceWrap ──────────────────────────────────────────────────────
  // Tiny wrapper that fires a one-shot CSS animation when its `state`
  // prop changes to 'correct' or 'wrong'. Useful around quiz answer
  // options without restructuring the option's existing className.
  //
  // Props: { state: 'idle' | 'correct' | 'wrong', children, ...rest }
  function JuiceWrap(props) {
    props = (props && typeof props === 'object') ? props : {};
    var state = props.state;
    var cls = state === 'correct' ? 'allo-correct-pulse'
            : state === 'wrong'   ? 'allo-wrong-nudge'
            : '';
    var baseCls = typeof props.className === 'string' ? props.className.trim() : '';
    var combined = baseCls && cls ? baseCls + ' ' + cls : (baseCls || cls);
    var safeStyle = (props.style && typeof props.style === 'object' && !Array.isArray(props.style)) ? props.style : undefined;
    return h('div', {
      className: combined,
      style: safeStyle,
    }, props.children);
  }

  window.AlloModules = (window.AlloModules && typeof window.AlloModules === 'object') ? window.AlloModules : {};
  window.AlloModules.UIPolish = Object.freeze({ EmptyState: EmptyState, LoadingSkeleton: LoadingSkeleton, JuiceWrap: JuiceWrap });
  if (typeof console !== 'undefined' && console.log) console.log('[UIPolish] Registered EmptyState + LoadingSkeleton + JuiceWrap');
})();
