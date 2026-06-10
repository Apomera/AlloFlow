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
  if (window.AlloModules && window.AlloModules.UIPolish) {
    console.log('[UIPolish] Already loaded, skipping');
    return;
  }
  if (!window.React) {
    console.warn('[UIPolish] React not available, skipping');
    return;
  }
  var React = window.React;
  var h = React.createElement;

  // ── EmptyState ──────────────────────────────────────────────────────
  // Friendly first-load placeholder. Replaces "nothing renders" with a
  // short "what goes here" prompt. Optional primary action button.
  //
  // Props: { emoji, title, hint, ctaLabel, onCta, accentColor }
  function EmptyState(props) {
    var emoji = props.emoji || '✨';
    var title = props.title || '';
    var hint = props.hint || '';
    var ctaLabel = props.ctaLabel || '';
    var onCta = props.onCta;
    var accent = props.accentColor || '#6366f1'; // indigo-500
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
        onClick: onCta,
        className: 'mt-4 px-4 py-2 rounded-lg text-sm font-bold text-white transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2',
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
    var lines = props.lines || 4;
    var variant = props.variant || 'list';
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
      'aria-label': props.ariaLabel || 'Loading',
    },
      h('div', { className: 'sr-only' }, props.ariaLabel || 'Loading…'),
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
    var state = props.state;
    var cls = state === 'correct' ? 'allo-correct-pulse'
            : state === 'wrong'   ? 'allo-wrong-nudge'
            : '';
    return h('div', {
      className: (props.className || '') + ' ' + cls,
      style: props.style,
    }, props.children);
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.UIPolish = { EmptyState: EmptyState, LoadingSkeleton: LoadingSkeleton, JuiceWrap: JuiceWrap };
  console.log('[UIPolish] Registered EmptyState + LoadingSkeleton + JuiceWrap');
})();
