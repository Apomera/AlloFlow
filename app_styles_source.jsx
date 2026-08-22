// Canonical application style component extracted from AlloFlowANTI.txt.
// Runtime typography values remain props; the large CSS payload is CDN-cacheable.
const AppStyles = ({ disableAnimations = false, baseFontSize = 16, lineHeight = 1.5, letterSpacing = 0 }) => (
  <>
      {disableAnimations && (
        <style>{`
          *, *::before, *::after {
            animation: none !important;
            transition: none !important;
          }
        `}</style>
      )}
      {/* WCAG 2.3.1: Respect OS-level reduced motion preference as CSS safety net */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse, .animate-bounce, .animate-spin, .animate-ping {
            animation: none !important;
          }
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
      <style>{`
        @media screen { .theme-contrast .bg-yellow-200,
        .theme-contrast .bg-yellow-300,
        .theme-contrast .bg-yellow-400 {
            background-color: #FFFF00 !important;
            color: #000000 !important;
            border: 2px solid #FFFFFF !important;
        } }
      `}</style>
      {/* Layout fix — right-edge blank band / "header reaches further right
          than the workspace". The app header (view_header_module) carries
          Tailwind's `min-w-max`, which floors its width at its full, NON-wrapping
          content width (the whole toolbar). In a narrow Canvas iframe that is
          wider than the frame, so the header forces the DOCUMENT wider than the
          viewport while <main> stays at w-full (= viewport) — the header ends up
          further right than the panel and a blank strip opens on the right (plus
          a horizontal scrollbar). The header's inner controls already use
          flex-wrap, so dropping the min-width floor lets it wrap to the frame
          instead of forcing overflow; header and workspace then share the same
          right edge. Scoped to `header.min-w-max` so nothing else is touched. */}
      <style>{`
        header.min-w-max { min-width: 0 !important; }
      `}</style>
      <style data-docsuite-theme="v1">{`
/* ── Scoped theme remaps (GENERATED — do not hand-edit) ──
 * Source of truth: dev-tools/gen_docsuite_theme.cjs (re-apply via
 * dev-tools/_apply_docsuite_theme.cjs when any scanned file gains new
 * color utilities). Contrast matrix + drift enforced by
 * tests/docsuite_theme_contrast.test.js.
 * Scope class .allo-docsuite covers: docsuite (PDF remediation + Document Hub modals); selsuite (4 Tailwind SEL tools); appsuite (main-content artifact views + sidebar);
 * plus the main-content JSX region of ANTI. Union 1116 tokens,
 * plus 551 state-variant tokens (hover/focus/active/
 * group-hover/...) which the base selectors cannot reach.
 * NOT remapped (22): responsive and pseudo-element
 * variants — list them with: node dev-tools/gen_docsuite_theme.cjs --unsupported
 * (No backticks in this header: the whole block is pasted INTO a JSX template
 * literal, so one would end the literal and break the AppStyles module.) */
@media screen {
.theme-dark .allo-docsuite { color-scheme: dark; }
.theme-dark .allo-docsuite input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
.theme-dark .allo-docsuite textarea,
.theme-dark .allo-docsuite select {
  background-color:#1e293b;
  color:#e2e8f0;
  border-color:#334155;
}
.theme-contrast .allo-docsuite { color-scheme: dark; }
.theme-contrast .allo-docsuite input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
.theme-contrast .allo-docsuite textarea,
.theme-contrast .allo-docsuite select {
  background-color:#000000 !important;
  color:#ffff00 !important;
  border-color:#ffff00 !important;
}
.theme-contrast .allo-docsuite button {
  color:#00ff00 !important;
  border-color:#00ff00 !important;
}
.theme-contrast .allo-docsuite [class*="bg-gradient"] {
  background-image:none !important;
  background-color:#000000 !important;
}
.theme-dark .allo-docsuite .ring-sky-300, .theme-dark .allo-docsuite .ring-sky-400, .theme-dark .allo-docsuite [class~="ring-sky-500/20"] { --tw-ring-color:#0369a1 !important; }
.theme-dark .allo-docsuite .ring-emerald-200, .theme-dark .allo-docsuite .ring-emerald-300, .theme-dark .allo-docsuite [class~="ring-emerald-300/60"], .theme-dark .allo-docsuite .ring-emerald-400, .theme-dark .allo-docsuite .ring-emerald-500, .theme-dark .allo-docsuite [class~="ring-emerald-500/20"], .theme-dark .allo-docsuite .ring-emerald-600 { --tw-ring-color:#047857 !important; }
.theme-dark .allo-docsuite .ring-cyan-200, .theme-dark .allo-docsuite .ring-cyan-300, .theme-dark .allo-docsuite .ring-cyan-400, .theme-dark .allo-docsuite [class~="ring-cyan-400/50"], .theme-dark .allo-docsuite .ring-cyan-500, .theme-dark .allo-docsuite [class~="ring-cyan-500/20"] { --tw-ring-color:#0e7490 !important; }
.theme-dark .allo-docsuite .ring-teal-100, .theme-dark .allo-docsuite .ring-teal-200, .theme-dark .allo-docsuite .ring-teal-300, .theme-dark .allo-docsuite .ring-teal-400, .theme-dark .allo-docsuite .ring-teal-500, .theme-dark .allo-docsuite [class~="ring-teal-500/20"], .theme-dark .allo-docsuite .ring-teal-600 { --tw-ring-color:#0f766e !important; }
.theme-dark .allo-docsuite .ring-green-200, .theme-dark .allo-docsuite .ring-green-300, .theme-dark .allo-docsuite .ring-green-400, .theme-dark .allo-docsuite .ring-green-500 { --tw-ring-color:#15803d !important; }
.theme-dark .allo-docsuite .ring-blue-200, .theme-dark .allo-docsuite .ring-blue-400, .theme-dark .allo-docsuite .ring-blue-500, .theme-dark .allo-docsuite [class~="ring-blue-500/20"], .theme-dark .allo-docsuite .ring-blue-600 { --tw-ring-color:#1d4ed8 !important; }
.theme-dark .allo-docsuite .ring-indigo-100, .theme-dark .allo-docsuite .ring-indigo-200, .theme-dark .allo-docsuite [class~="ring-indigo-200/60"], .theme-dark .allo-docsuite .ring-indigo-300, .theme-dark .allo-docsuite [class~="ring-indigo-300/80"], .theme-dark .allo-docsuite .ring-indigo-400, .theme-dark .allo-docsuite [class~="ring-indigo-400/50"], .theme-dark .allo-docsuite .ring-indigo-500, .theme-dark .allo-docsuite [class~="ring-indigo-500/20"], .theme-dark .allo-docsuite [class~="ring-indigo-500/25"], .theme-dark .allo-docsuite [class~="ring-indigo-500/30"], .theme-dark .allo-docsuite .ring-indigo-600 { --tw-ring-color:#4338ca !important; }
.theme-dark .allo-docsuite .ring-slate-200, .theme-dark .allo-docsuite .ring-slate-300, .theme-dark .allo-docsuite .ring-slate-400, .theme-dark .allo-docsuite .ring-slate-500, .theme-dark .allo-docsuite .ring-slate-600, .theme-dark .allo-docsuite .ring-slate-700 { --tw-ring-color:#475569 !important; }
.theme-dark .allo-docsuite .ring-violet-200, .theme-dark .allo-docsuite .ring-violet-300, .theme-dark .allo-docsuite .ring-violet-400, .theme-dark .allo-docsuite [class~="ring-violet-400/40"], .theme-dark .allo-docsuite .ring-violet-500, .theme-dark .allo-docsuite [class~="ring-violet-500/20"], .theme-dark .allo-docsuite .ring-violet-600 { --tw-ring-color:#6d28d9 !important; }
.theme-dark .allo-docsuite .ring-purple-100, .theme-dark .allo-docsuite .ring-purple-200, .theme-dark .allo-docsuite .ring-purple-300, .theme-dark .allo-docsuite .ring-purple-400, .theme-dark .allo-docsuite .ring-purple-500, .theme-dark .allo-docsuite [class~="ring-purple-500/30"], .theme-dark .allo-docsuite .ring-purple-600 { --tw-ring-color:#7e22ce !important; }
.theme-dark .allo-docsuite .ring-yellow-100, .theme-dark .allo-docsuite .ring-yellow-200, .theme-dark .allo-docsuite .ring-yellow-300, .theme-dark .allo-docsuite .ring-yellow-400, .theme-dark .allo-docsuite [class~="ring-yellow-400/40"], .theme-dark .allo-docsuite [class~="ring-yellow-400/50"], .theme-dark .allo-docsuite .ring-yellow-500, .theme-dark .allo-docsuite .ring-yellow-600 { --tw-ring-color:#a16207 !important; }
.theme-dark .allo-docsuite .ring-fuchsia-400 { --tw-ring-color:#a21caf !important; }
.theme-dark .allo-docsuite .ring-amber-100, .theme-dark .allo-docsuite .ring-amber-200, .theme-dark .allo-docsuite .ring-amber-300, .theme-dark .allo-docsuite [class~="ring-amber-300/30"], .theme-dark .allo-docsuite .ring-amber-400, .theme-dark .allo-docsuite .ring-amber-500, .theme-dark .allo-docsuite [class~="ring-amber-500/20"], .theme-dark .allo-docsuite [class~="ring-amber-500/40"], .theme-dark .allo-docsuite .ring-amber-600 { --tw-ring-color:#b45309 !important; }
.theme-dark .allo-docsuite .ring-red-300, .theme-dark .allo-docsuite [class~="ring-red-300/30"], .theme-dark .allo-docsuite .ring-red-400, .theme-dark .allo-docsuite .ring-red-500 { --tw-ring-color:#b91c1c !important; }
.theme-dark .allo-docsuite .ring-rose-200, .theme-dark .allo-docsuite .ring-rose-300, .theme-dark .allo-docsuite .ring-rose-400, .theme-dark .allo-docsuite .ring-rose-500, .theme-dark .allo-docsuite [class~="ring-rose-500/20"], .theme-dark .allo-docsuite .ring-rose-600 { --tw-ring-color:#be123c !important; }
.theme-dark .allo-docsuite .ring-pink-200, .theme-dark .allo-docsuite .ring-pink-400, .theme-dark .allo-docsuite .ring-pink-500 { --tw-ring-color:#be185d !important; }
.theme-dark .allo-docsuite .ring-orange-300, .theme-dark .allo-docsuite .ring-orange-400, .theme-dark .allo-docsuite .ring-orange-500, .theme-dark .allo-docsuite [class~="ring-orange-500/20"] { --tw-ring-color:#c2410c !important; }
.theme-dark .allo-docsuite .bg-emerald-100, .theme-dark .allo-docsuite .bg-emerald-200, .theme-dark .allo-docsuite .bg-emerald-300, .theme-dark .allo-docsuite .bg-emerald-50, .theme-dark .allo-docsuite [class~="bg-emerald-50/40"], .theme-dark .allo-docsuite [class~="bg-emerald-50/50"], .theme-dark .allo-docsuite [class~="bg-emerald-50/60"], .theme-dark .allo-docsuite [class~="bg-emerald-50/70"] { background-color:#022c22 !important; }
.theme-dark .allo-docsuite .bg-teal-100, .theme-dark .allo-docsuite .bg-teal-200, .theme-dark .allo-docsuite [class~="bg-teal-200/60"], .theme-dark .allo-docsuite [class~="bg-teal-200/80"], .theme-dark .allo-docsuite .bg-teal-300, .theme-dark .allo-docsuite .bg-teal-50, .theme-dark .allo-docsuite [class~="bg-teal-50/50"], .theme-dark .allo-docsuite [class~="bg-teal-50/60"] { background-color:#042f2e !important; }
.theme-dark .allo-docsuite .bg-green-100, .theme-dark .allo-docsuite [class~="bg-green-100/50"], .theme-dark .allo-docsuite .bg-green-200, .theme-dark .allo-docsuite .bg-green-300, .theme-dark .allo-docsuite .bg-green-50, .theme-dark .allo-docsuite [class~="bg-green-50/50"] { background-color:#052e16 !important; }
.theme-dark .allo-docsuite .bg-sky-100, .theme-dark .allo-docsuite .bg-sky-200, .theme-dark .allo-docsuite .bg-sky-50, .theme-dark .allo-docsuite [class~="bg-sky-50/50"], .theme-dark .allo-docsuite [class~="bg-sky-50/70"] { background-color:#082f49 !important; }
.theme-dark .allo-docsuite .bg-cyan-100, .theme-dark .allo-docsuite [class~="bg-cyan-100/80"], .theme-dark .allo-docsuite .bg-cyan-200, .theme-dark .allo-docsuite [class~="bg-cyan-200/60"], .theme-dark .allo-docsuite [class~="bg-cyan-200/80"], .theme-dark .allo-docsuite .bg-cyan-50, .theme-dark .allo-docsuite [class~="bg-cyan-50/60"], .theme-dark .allo-docsuite [class~="bg-cyan-50/70"] { background-color:#083344 !important; }
.theme-dark .allo-docsuite .bg-slate-50, .theme-dark .allo-docsuite [class~="bg-slate-50/30"], .theme-dark .allo-docsuite [class~="bg-slate-50/50"], .theme-dark .allo-docsuite [class~="bg-slate-50/60"], .theme-dark .allo-docsuite [class~="bg-slate-50/70"], .theme-dark .allo-docsuite [class~="bg-slate-50/80"], .theme-dark .allo-docsuite [class~="bg-slate-50/90"], .theme-dark .allo-docsuite .bg-stone-50 { background-color:#0f172a !important; }
.theme-dark .allo-docsuite .bg-blue-100, .theme-dark .allo-docsuite [class~="bg-blue-100/50"], .theme-dark .allo-docsuite [class~="bg-blue-100/90"], .theme-dark .allo-docsuite .bg-blue-200, .theme-dark .allo-docsuite [class~="bg-blue-200/30"], .theme-dark .allo-docsuite [class~="bg-blue-200/60"], .theme-dark .allo-docsuite .bg-blue-300, .theme-dark .allo-docsuite .bg-blue-50, .theme-dark .allo-docsuite [class~="bg-blue-50/60"], .theme-dark .allo-docsuite [class~="bg-blue-50/95"] { background-color:#172554 !important; }
.theme-dark .allo-docsuite .bg-lime-50 { background-color:#1a2e05 !important; }
.theme-dark .allo-docsuite .bg-indigo-100, .theme-dark .allo-docsuite [class~="bg-indigo-100/20"], .theme-dark .allo-docsuite [class~="bg-indigo-100/50"], .theme-dark .allo-docsuite [class~="bg-indigo-100/60"], .theme-dark .allo-docsuite [class~="bg-indigo-100/80"], .theme-dark .allo-docsuite .bg-indigo-200, .theme-dark .allo-docsuite [class~="bg-indigo-200/20"], .theme-dark .allo-docsuite [class~="bg-indigo-200/50"], .theme-dark .allo-docsuite [class~="bg-indigo-200/60"], .theme-dark .allo-docsuite [class~="bg-indigo-200/80"], .theme-dark .allo-docsuite .bg-indigo-300, .theme-dark .allo-docsuite .bg-indigo-50, .theme-dark .allo-docsuite [class~="bg-indigo-50/30"], .theme-dark .allo-docsuite [class~="bg-indigo-50/40"], .theme-dark .allo-docsuite [class~="bg-indigo-50/50"], .theme-dark .allo-docsuite [class~="bg-indigo-50/60"], .theme-dark .allo-docsuite [class~="bg-indigo-50/70"], .theme-dark .allo-docsuite [class~="bg-indigo-50/80"] { background-color:#1e1b4b !important; }
.theme-dark .allo-docsuite .bg-slate-100, .theme-dark .allo-docsuite [class~="bg-slate-100/50"], .theme-dark .allo-docsuite [class~="bg-slate-100/90"], .theme-dark .allo-docsuite .bg-white { background-color:#1e293b !important; }
.theme-dark .allo-docsuite .bg-slate-200, .theme-dark .allo-docsuite [class~="bg-slate-200/50"] { background-color:#26334a !important; }
.theme-dark .allo-docsuite .bg-violet-100, .theme-dark .allo-docsuite [class~="bg-violet-100/50"], .theme-dark .allo-docsuite .bg-violet-200, .theme-dark .allo-docsuite .bg-violet-50, .theme-dark .allo-docsuite [class~="bg-violet-50/40"], .theme-dark .allo-docsuite [class~="bg-violet-50/50"], .theme-dark .allo-docsuite [class~="bg-violet-50/60"], .theme-dark .allo-docsuite [class~="bg-violet-50/70"] { background-color:#2e1065 !important; }
.theme-dark .allo-docsuite .bg-slate-300 { background-color:#334155 !important; }
.theme-dark .allo-docsuite .bg-purple-100, .theme-dark .allo-docsuite [class~="bg-purple-100/20"], .theme-dark .allo-docsuite [class~="bg-purple-100/50"], .theme-dark .allo-docsuite .bg-purple-200, .theme-dark .allo-docsuite [class~="bg-purple-200/15"], .theme-dark .allo-docsuite [class~="bg-purple-200/40"], .theme-dark .allo-docsuite .bg-purple-300, .theme-dark .allo-docsuite .bg-purple-50, .theme-dark .allo-docsuite [class~="bg-purple-50/50"] { background-color:#3b0764 !important; }
.theme-dark .allo-docsuite .bg-yellow-100, .theme-dark .allo-docsuite [class~="bg-yellow-100/5"], .theme-dark .allo-docsuite .bg-yellow-200, .theme-dark .allo-docsuite [class~="bg-yellow-200/30"], .theme-dark .allo-docsuite .bg-yellow-300, .theme-dark .allo-docsuite .bg-yellow-50, .theme-dark .allo-docsuite [class~="bg-yellow-50/60"] { background-color:#422006 !important; }
.theme-dark .allo-docsuite .bg-orange-100, .theme-dark .allo-docsuite [class~="bg-orange-100/50"], .theme-dark .allo-docsuite .bg-orange-200, .theme-dark .allo-docsuite [class~="bg-orange-200/30"], .theme-dark .allo-docsuite [class~="bg-orange-200/60"], .theme-dark .allo-docsuite [class~="bg-orange-200/80"], .theme-dark .allo-docsuite .bg-orange-300, .theme-dark .allo-docsuite .bg-orange-50, .theme-dark .allo-docsuite [class~="bg-orange-50/80"] { background-color:#431407 !important; }
.theme-dark .allo-docsuite .bg-red-100, .theme-dark .allo-docsuite [class~="bg-red-100/50"], .theme-dark .allo-docsuite .bg-red-200, .theme-dark .allo-docsuite .bg-red-300, .theme-dark .allo-docsuite .bg-red-50, .theme-dark .allo-docsuite [class~="bg-red-50/70"] { background-color:#450a0a !important; }
.theme-dark .allo-docsuite .bg-amber-100, .theme-dark .allo-docsuite [class~="bg-amber-100/50"], .theme-dark .allo-docsuite .bg-amber-200, .theme-dark .allo-docsuite [class~="bg-amber-200/50"], .theme-dark .allo-docsuite [class~="bg-amber-200/60"], .theme-dark .allo-docsuite .bg-amber-300, .theme-dark .allo-docsuite [class~="bg-amber-300/15"], .theme-dark .allo-docsuite [class~="bg-amber-300/50"], .theme-dark .allo-docsuite .bg-amber-50, .theme-dark .allo-docsuite [class~="bg-amber-50/50"], .theme-dark .allo-docsuite [class~="bg-amber-50/60"], .theme-dark .allo-docsuite [class~="bg-amber-50/70"], .theme-dark .allo-docsuite [class~="bg-amber-50/80"] { background-color:#451a03 !important; }
.theme-dark .allo-docsuite .bg-fuchsia-100, .theme-dark .allo-docsuite .bg-fuchsia-50, .theme-dark .allo-docsuite [class~="bg-fuchsia-50/50"], .theme-dark .allo-docsuite [class~="bg-fuchsia-50/60"] { background-color:#4a044e !important; }
.theme-dark .allo-docsuite .bg-rose-100, .theme-dark .allo-docsuite [class~="bg-rose-100/90"], .theme-dark .allo-docsuite .bg-rose-200, .theme-dark .allo-docsuite [class~="bg-rose-200/60"], .theme-dark .allo-docsuite .bg-rose-300, .theme-dark .allo-docsuite .bg-rose-50, .theme-dark .allo-docsuite [class~="bg-rose-50/50"], .theme-dark .allo-docsuite [class~="bg-rose-50/70"] { background-color:#4c0519 !important; }
.theme-dark .allo-docsuite .bg-pink-100, .theme-dark .allo-docsuite .bg-pink-200, .theme-dark .allo-docsuite .bg-pink-50, .theme-dark .allo-docsuite [class~="bg-pink-50/50"], .theme-dark .allo-docsuite [class~="bg-pink-50/60"] { background-color:#500724 !important; }
.theme-dark .allo-docsuite [class~="bg-white/10"], .theme-dark .allo-docsuite [class~="bg-white/15"], .theme-dark .allo-docsuite [class~="bg-white/20"], .theme-dark .allo-docsuite [class~="bg-white/30"], .theme-dark .allo-docsuite [class~="bg-white/35"], .theme-dark .allo-docsuite [class~="bg-white/5"], .theme-dark .allo-docsuite [class~="bg-white/50"], .theme-dark .allo-docsuite [class~="bg-white/60"], .theme-dark .allo-docsuite [class~="bg-white/70"], .theme-dark .allo-docsuite [class~="bg-white/80"] { background-color:rgba(30,41,59,0.85) !important; }
.theme-dark .allo-docsuite [class~="bg-white/90"] { background-color:rgba(30,41,59,0.9) !important; }
.theme-dark .allo-docsuite [class~="bg-white/95"] { background-color:rgba(30,41,59,0.95) !important; }
.theme-dark .allo-docsuite .from-emerald-50, .theme-dark .allo-docsuite .to-emerald-50 { background-image:none !important;background-color:#022c22 !important; }
.theme-dark .allo-docsuite .from-teal-50, .theme-dark .allo-docsuite [class~="from-teal-50/80"], .theme-dark .allo-docsuite [class~="to-teal-100/40"], .theme-dark .allo-docsuite .to-teal-50 { background-image:none !important;background-color:#042f2e !important; }
.theme-dark .allo-docsuite .from-green-50, .theme-dark .allo-docsuite [class~="via-green-50/30"] { background-image:none !important;background-color:#052e16 !important; }
.theme-dark .allo-docsuite .from-sky-50, .theme-dark .allo-docsuite [class~="from-sky-50/80"], .theme-dark .allo-docsuite .to-sky-50 { background-image:none !important;background-color:#082f49 !important; }
.theme-dark .allo-docsuite .from-cyan-50, .theme-dark .allo-docsuite [class~="from-cyan-50/60"], .theme-dark .allo-docsuite [class~="from-cyan-50/80"], .theme-dark .allo-docsuite [class~="to-cyan-100/40"], .theme-dark .allo-docsuite .to-cyan-50 { background-image:none !important;background-color:#083344 !important; }
.theme-dark .allo-docsuite .from-slate-50, .theme-dark .allo-docsuite .to-slate-50 { background-image:none !important;background-color:#0f172a !important; }
.theme-dark .allo-docsuite .from-blue-100, .theme-dark .allo-docsuite [class~="from-blue-100/50"], .theme-dark .allo-docsuite .from-blue-50, .theme-dark .allo-docsuite [class~="from-blue-50/60"], .theme-dark .allo-docsuite [class~="to-blue-200/30"], .theme-dark .allo-docsuite .to-blue-50, .theme-dark .allo-docsuite [class~="via-blue-50/40"] { background-image:none !important;background-color:#172554 !important; }
.theme-dark .allo-docsuite .to-lime-50 { background-image:none !important;background-color:#1a2e05 !important; }
.theme-dark .allo-docsuite .from-indigo-100, .theme-dark .allo-docsuite .from-indigo-200, .theme-dark .allo-docsuite .from-indigo-50, .theme-dark .allo-docsuite [class~="from-indigo-50/60"], .theme-dark .allo-docsuite [class~="from-indigo-50/80"], .theme-dark .allo-docsuite [class~="from-indigo-50/95"], .theme-dark .allo-docsuite .to-indigo-100, .theme-dark .allo-docsuite [class~="to-indigo-100/40"], .theme-dark .allo-docsuite .to-indigo-200, .theme-dark .allo-docsuite .to-indigo-300, .theme-dark .allo-docsuite .to-indigo-50, .theme-dark .allo-docsuite [class~="to-indigo-50/30"], .theme-dark .allo-docsuite .via-indigo-100, .theme-dark .allo-docsuite [class~="via-indigo-50/40"], .theme-dark .allo-docsuite [class~="via-indigo-50/50"] { background-image:none !important;background-color:#1e1b4b !important; }
.theme-dark .allo-docsuite .from-white, .theme-dark .allo-docsuite .to-white, .theme-dark .allo-docsuite .via-white { background-image:none !important;background-color:#1e293b !important; }
.theme-dark .allo-docsuite .from-violet-100, .theme-dark .allo-docsuite .from-violet-50, .theme-dark .allo-docsuite .to-violet-100, .theme-dark .allo-docsuite .to-violet-50, .theme-dark .allo-docsuite [class~="to-violet-50/30"], .theme-dark .allo-docsuite [class~="to-violet-50/40"] { background-image:none !important;background-color:#2e1065 !important; }
.theme-dark .allo-docsuite .from-purple-50, .theme-dark .allo-docsuite .to-purple-50, .theme-dark .allo-docsuite [class~="to-purple-50/80"], .theme-dark .allo-docsuite [class~="to-purple-50/95"] { background-image:none !important;background-color:#3b0764 !important; }
.theme-dark .allo-docsuite .from-yellow-300, .theme-dark .allo-docsuite .from-yellow-50, .theme-dark .allo-docsuite .to-yellow-300, .theme-dark .allo-docsuite .to-yellow-50 { background-image:none !important;background-color:#422006 !important; }
.theme-dark .allo-docsuite [class~="from-orange-50/80"], .theme-dark .allo-docsuite .to-orange-100, .theme-dark .allo-docsuite [class~="to-orange-100/40"], .theme-dark .allo-docsuite .to-orange-50, .theme-dark .allo-docsuite .via-orange-300, .theme-dark .allo-docsuite [class~="via-orange-50/40"] { background-image:none !important;background-color:#431407 !important; }
.theme-dark .allo-docsuite [class~="from-red-50/70"] { background-image:none !important;background-color:#450a0a !important; }
.theme-dark .allo-docsuite .from-amber-100, .theme-dark .allo-docsuite .from-amber-300, .theme-dark .allo-docsuite .from-amber-50, .theme-dark .allo-docsuite [class~="from-amber-50/80"], .theme-dark .allo-docsuite .to-amber-50, .theme-dark .allo-docsuite [class~="to-amber-50/40"] { background-image:none !important;background-color:#451a03 !important; }
.theme-dark .allo-docsuite .from-fuchsia-50, .theme-dark .allo-docsuite .to-fuchsia-100 { background-image:none !important;background-color:#4a044e !important; }
.theme-dark .allo-docsuite .from-rose-100, .theme-dark .allo-docsuite [class~="from-rose-100/50"], .theme-dark .allo-docsuite .from-rose-50, .theme-dark .allo-docsuite [class~="to-rose-200/30"], .theme-dark .allo-docsuite .to-rose-50, .theme-dark .allo-docsuite [class~="to-rose-50/30"] { background-image:none !important;background-color:#4c0519 !important; }
.theme-dark .allo-docsuite .from-pink-100, .theme-dark .allo-docsuite .to-pink-50 { background-image:none !important;background-color:#500724 !important; }
.theme-dark .allo-docsuite [class~="from-white/0"], .theme-dark .allo-docsuite [class~="to-white/20"], .theme-dark .allo-docsuite [class~="via-white/20"] { background-image:none !important;background-color:rgba(30,41,59,0.85) !important; }
.theme-dark .allo-docsuite [class~="via-white/95"] { background-image:none !important;background-color:rgba(30,41,59,0.95) !important; }
.theme-dark .allo-docsuite .border-sky-500, .theme-dark .allo-docsuite [class~="border-sky-500/30"], .theme-dark .allo-docsuite [class~="border-sky-500/40"], .theme-dark .allo-docsuite .border-sky-600 { border-color:#0369a1 !important; }
.theme-dark .allo-docsuite .border-emerald-400, .theme-dark .allo-docsuite [class~="border-emerald-400/40"], .theme-dark .allo-docsuite .border-emerald-500, .theme-dark .allo-docsuite [class~="border-emerald-500/30"], .theme-dark .allo-docsuite [class~="border-emerald-500/40"], .theme-dark .allo-docsuite [class~="border-emerald-500/50"], .theme-dark .allo-docsuite .border-emerald-600 { border-color:#047857 !important; }
.theme-dark .allo-docsuite .border-emerald-100, .theme-dark .allo-docsuite [class~="border-emerald-100/50"], .theme-dark .allo-docsuite .border-emerald-200, .theme-dark .allo-docsuite [class~="border-emerald-200/60"], .theme-dark .allo-docsuite .border-emerald-300, .theme-dark .allo-docsuite [class~="border-emerald-300/30"], .theme-dark .allo-docsuite [class~="border-emerald-300/40"], .theme-dark .allo-docsuite [class~="border-emerald-300/60"] { border-color:#065f46 !important; }
.theme-dark .allo-docsuite .border-sky-100, .theme-dark .allo-docsuite .border-sky-200, .theme-dark .allo-docsuite [class~="border-sky-200/60"], .theme-dark .allo-docsuite .border-sky-300, .theme-dark .allo-docsuite [class~="border-sky-300/30"] { border-color:#075985 !important; }
.theme-dark .allo-docsuite .border-cyan-400, .theme-dark .allo-docsuite .border-cyan-500, .theme-dark .allo-docsuite [class~="border-cyan-500/30"], .theme-dark .allo-docsuite .border-cyan-600 { border-color:#0e7490 !important; }
.theme-dark .allo-docsuite .border-teal-400, .theme-dark .allo-docsuite .border-teal-500, .theme-dark .allo-docsuite [class~="border-teal-500/30"], .theme-dark .allo-docsuite [class~="border-teal-500/40"], .theme-dark .allo-docsuite .border-teal-600 { border-color:#0f766e !important; }
.theme-dark .allo-docsuite .border-teal-100, .theme-dark .allo-docsuite [class~="border-teal-100/50"], .theme-dark .allo-docsuite .border-teal-200, .theme-dark .allo-docsuite .border-teal-300, .theme-dark .allo-docsuite [class~="border-teal-300/40"] { border-color:#115e59 !important; }
.theme-dark .allo-docsuite .border-cyan-100, .theme-dark .allo-docsuite .border-cyan-200, .theme-dark .allo-docsuite .border-cyan-300, .theme-dark .allo-docsuite [class~="border-cyan-300/25"], .theme-dark .allo-docsuite [class~="border-cyan-300/80"] { border-color:#155e75 !important; }
.theme-dark .allo-docsuite .border-green-400, .theme-dark .allo-docsuite .border-green-500, .theme-dark .allo-docsuite .border-green-600 { border-color:#15803d !important; }
.theme-dark .allo-docsuite .border-green-100, .theme-dark .allo-docsuite .border-green-200, .theme-dark .allo-docsuite .border-green-300 { border-color:#166534 !important; }
.theme-dark .allo-docsuite .border-blue-400, .theme-dark .allo-docsuite [class~="border-blue-400/50"], .theme-dark .allo-docsuite .border-blue-500, .theme-dark .allo-docsuite [class~="border-blue-500/30"], .theme-dark .allo-docsuite [class~="border-blue-500/40"], .theme-dark .allo-docsuite .border-blue-600 { border-color:#1d4ed8 !important; }
.theme-dark .allo-docsuite .border-blue-100, .theme-dark .allo-docsuite .border-blue-200, .theme-dark .allo-docsuite [class~="border-blue-200/50"], .theme-dark .allo-docsuite .border-blue-300, .theme-dark .allo-docsuite [class~="border-blue-300/30"], .theme-dark .allo-docsuite [class~="border-blue-300/40"] { border-color:#1e40af !important; }
.theme-dark .allo-docsuite .border-slate-100, .theme-dark .allo-docsuite .border-slate-200, .theme-dark .allo-docsuite [class~="border-slate-200/80"], .theme-dark .allo-docsuite [class~="border-slate-200/90"], .theme-dark .allo-docsuite .border-slate-50, .theme-dark .allo-docsuite .border-white, .theme-dark .allo-docsuite [class~="border-white/10"], .theme-dark .allo-docsuite [class~="border-white/15"], .theme-dark .allo-docsuite [class~="border-white/20"], .theme-dark .allo-docsuite [class~="border-white/25"], .theme-dark .allo-docsuite [class~="border-white/30"], .theme-dark .allo-docsuite [class~="border-white/40"], .theme-dark .allo-docsuite [class~="border-white/50"], .theme-dark .allo-docsuite [class~="border-white/90"], .theme-dark .allo-docsuite .divide-slate-100 > * + *, .theme-dark .allo-docsuite .divide-slate-200 > * + *, .theme-dark .allo-docsuite .divide-slate-700 > * + * { border-color:#334155 !important; }
.theme-dark .allo-docsuite .border-indigo-100, .theme-dark .allo-docsuite [class~="border-indigo-100/50"], .theme-dark .allo-docsuite .border-indigo-200, .theme-dark .allo-docsuite [class~="border-indigo-200/50"], .theme-dark .allo-docsuite [class~="border-indigo-200/60"], .theme-dark .allo-docsuite [class~="border-indigo-200/70"], .theme-dark .allo-docsuite .border-indigo-300, .theme-dark .allo-docsuite [class~="border-indigo-300/30"], .theme-dark .allo-docsuite .border-indigo-50 { border-color:#3730a3 !important; }
.theme-dark .allo-docsuite .border-lime-200, .theme-dark .allo-docsuite .border-lime-300 { border-color:#3f6212 !important; }
.theme-dark .allo-docsuite .border-indigo-400, .theme-dark .allo-docsuite [class~="border-indigo-400/30"], .theme-dark .allo-docsuite [class~="border-indigo-400/40"], .theme-dark .allo-docsuite .border-indigo-500, .theme-dark .allo-docsuite [class~="border-indigo-500/20"], .theme-dark .allo-docsuite [class~="border-indigo-500/30"], .theme-dark .allo-docsuite [class~="border-indigo-500/40"], .theme-dark .allo-docsuite [class~="border-indigo-500/50"], .theme-dark .allo-docsuite .border-indigo-600, .theme-dark .allo-docsuite [class~="border-indigo-600/60"] { border-color:#4338ca !important; }
.theme-dark .allo-docsuite .border-slate-300, .theme-dark .allo-docsuite .border-slate-400, .theme-dark .allo-docsuite .border-stone-300 { border-color:#475569 !important; }
.theme-dark .allo-docsuite [class~="border-lime-500/30"] { border-color:#4d7c0f !important; }
.theme-dark .allo-docsuite .border-violet-100, .theme-dark .allo-docsuite .border-violet-200, .theme-dark .allo-docsuite .border-violet-300, .theme-dark .allo-docsuite .border-violet-50, .theme-dark .allo-docsuite .divide-violet-100 > * + * { border-color:#5b21b6 !important; }
.theme-dark .allo-docsuite .border-purple-100, .theme-dark .allo-docsuite .border-purple-200, .theme-dark .allo-docsuite .border-purple-300 { border-color:#6b21a8 !important; }
.theme-dark .allo-docsuite .border-violet-400, .theme-dark .allo-docsuite .border-violet-500, .theme-dark .allo-docsuite [class~="border-violet-500/30"], .theme-dark .allo-docsuite .border-violet-600 { border-color:#6d28d9 !important; }
.theme-dark .allo-docsuite .border-purple-400, .theme-dark .allo-docsuite .border-purple-500, .theme-dark .allo-docsuite [class~="border-purple-500/30"], .theme-dark .allo-docsuite [class~="border-purple-500/40"], .theme-dark .allo-docsuite .border-purple-600 { border-color:#7e22ce !important; }
.theme-dark .allo-docsuite .border-yellow-100, .theme-dark .allo-docsuite .border-yellow-200, .theme-dark .allo-docsuite [class~="border-yellow-200/50"], .theme-dark .allo-docsuite .border-yellow-300 { border-color:#854d0e !important; }
.theme-dark .allo-docsuite .border-fuchsia-200, .theme-dark .allo-docsuite .border-fuchsia-300 { border-color:#86198f !important; }
.theme-dark .allo-docsuite .border-amber-100, .theme-dark .allo-docsuite [class~="border-amber-100/50"], .theme-dark .allo-docsuite .border-amber-200, .theme-dark .allo-docsuite [class~="border-amber-200/30"], .theme-dark .allo-docsuite [class~="border-amber-200/50"], .theme-dark .allo-docsuite [class~="border-amber-200/60"], .theme-dark .allo-docsuite .border-amber-300, .theme-dark .allo-docsuite [class~="border-amber-300/40"] { border-color:#92400e !important; }
.theme-dark .allo-docsuite .border-red-100, .theme-dark .allo-docsuite .border-red-200, .theme-dark .allo-docsuite [class~="border-red-200/60"], .theme-dark .allo-docsuite .border-red-300 { border-color:#991b1b !important; }
.theme-dark .allo-docsuite .border-orange-100, .theme-dark .allo-docsuite .border-orange-200, .theme-dark .allo-docsuite .border-orange-300, .theme-dark .allo-docsuite [class~="border-orange-300/30"] { border-color:#9a3412 !important; }
.theme-dark .allo-docsuite .border-pink-200, .theme-dark .allo-docsuite .border-pink-300 { border-color:#9d174d !important; }
.theme-dark .allo-docsuite .border-rose-100, .theme-dark .allo-docsuite .border-rose-200, .theme-dark .allo-docsuite .border-rose-300 { border-color:#9f1239 !important; }
.theme-dark .allo-docsuite .border-yellow-400, .theme-dark .allo-docsuite [class~="border-yellow-400/30"], .theme-dark .allo-docsuite .border-yellow-500, .theme-dark .allo-docsuite [class~="border-yellow-500/60"], .theme-dark .allo-docsuite .border-yellow-600 { border-color:#a16207 !important; }
.theme-dark .allo-docsuite .border-fuchsia-400, .theme-dark .allo-docsuite [class~="border-fuchsia-500/20"], .theme-dark .allo-docsuite [class~="border-fuchsia-500/30"], .theme-dark .allo-docsuite [class~="border-fuchsia-500/40"], .theme-dark .allo-docsuite [class~="border-fuchsia-500/50"], .theme-dark .allo-docsuite .border-fuchsia-600 { border-color:#a21caf !important; }
.theme-dark .allo-docsuite .border-amber-400, .theme-dark .allo-docsuite [class~="border-amber-400/40"], .theme-dark .allo-docsuite [class~="border-amber-400/50"], .theme-dark .allo-docsuite .border-amber-500, .theme-dark .allo-docsuite [class~="border-amber-500/30"], .theme-dark .allo-docsuite [class~="border-amber-500/40"], .theme-dark .allo-docsuite [class~="border-amber-500/50"], .theme-dark .allo-docsuite .border-amber-600, .theme-dark .allo-docsuite [class~="border-amber-600/30"], .theme-dark .allo-docsuite [class~="border-amber-600/40"] { border-color:#b45309 !important; }
.theme-dark .allo-docsuite .border-red-400, .theme-dark .allo-docsuite .border-red-500, .theme-dark .allo-docsuite .border-red-600, .theme-dark .allo-docsuite [class~="border-red-600/50"] { border-color:#b91c1c !important; }
.theme-dark .allo-docsuite .border-rose-400, .theme-dark .allo-docsuite .border-rose-500, .theme-dark .allo-docsuite [class~="border-rose-500/30"], .theme-dark .allo-docsuite [class~="border-rose-500/40"], .theme-dark .allo-docsuite [class~="border-rose-500/50"], .theme-dark .allo-docsuite .border-rose-600 { border-color:#be123c !important; }
.theme-dark .allo-docsuite .border-pink-400, .theme-dark .allo-docsuite .border-pink-500, .theme-dark .allo-docsuite [class~="border-pink-500/30"], .theme-dark .allo-docsuite .border-pink-600 { border-color:#be185d !important; }
.theme-dark .allo-docsuite .border-orange-400, .theme-dark .allo-docsuite .border-orange-500, .theme-dark .allo-docsuite .border-orange-600 { border-color:#c2410c !important; }
.theme-dark .allo-docsuite .text-teal-400, .theme-dark .allo-docsuite .text-teal-500, .theme-dark .allo-docsuite [class~="text-teal-500/70"], .theme-dark .allo-docsuite .text-teal-600, .theme-dark .allo-docsuite [class~="text-teal-600/60"], .theme-dark .allo-docsuite .text-teal-700, .theme-dark .allo-docsuite .text-teal-800, .theme-dark .allo-docsuite .text-teal-900, .theme-dark .allo-docsuite .text-teal-950 { color:#5eead4 !important; }
.theme-dark .allo-docsuite .text-cyan-500, .theme-dark .allo-docsuite .text-cyan-600, .theme-dark .allo-docsuite [class~="text-cyan-600/60"], .theme-dark .allo-docsuite .text-cyan-700, .theme-dark .allo-docsuite .text-cyan-800, .theme-dark .allo-docsuite .text-cyan-900, .theme-dark .allo-docsuite [class~="text-cyan-900/80"], .theme-dark .allo-docsuite .text-cyan-950 { color:#67e8f9 !important; }
.theme-dark .allo-docsuite .text-emerald-500, .theme-dark .allo-docsuite .text-emerald-600, .theme-dark .allo-docsuite [class~="text-emerald-600/70"], .theme-dark .allo-docsuite .text-emerald-700, .theme-dark .allo-docsuite [class~="text-emerald-700/70"], .theme-dark .allo-docsuite .text-emerald-800, .theme-dark .allo-docsuite .text-emerald-900, .theme-dark .allo-docsuite [class~="text-emerald-900/90"], .theme-dark .allo-docsuite .text-emerald-950 { color:#6ee7b7 !important; }
.theme-dark .allo-docsuite .text-sky-400, .theme-dark .allo-docsuite .text-sky-500, .theme-dark .allo-docsuite .text-sky-600, .theme-dark .allo-docsuite .text-sky-700, .theme-dark .allo-docsuite .text-sky-800, .theme-dark .allo-docsuite .text-sky-900, .theme-dark .allo-docsuite .text-sky-950 { color:#7dd3fc !important; }
.theme-dark .allo-docsuite .text-green-400, .theme-dark .allo-docsuite .text-green-500, .theme-dark .allo-docsuite .text-green-600, .theme-dark .allo-docsuite .text-green-700, .theme-dark .allo-docsuite [class~="text-green-700/70"], .theme-dark .allo-docsuite .text-green-800, .theme-dark .allo-docsuite .text-green-900, .theme-dark .allo-docsuite .text-green-950 { color:#86efac !important; }
.theme-dark .allo-docsuite .text-blue-400, .theme-dark .allo-docsuite .text-blue-500, .theme-dark .allo-docsuite .text-blue-600, .theme-dark .allo-docsuite .text-blue-700, .theme-dark .allo-docsuite .text-blue-800, .theme-dark .allo-docsuite [class~="text-blue-800/80"], .theme-dark .allo-docsuite .text-blue-900, .theme-dark .allo-docsuite .text-blue-950 { color:#93c5fd !important; }
.theme-dark .allo-docsuite .text-slate-400 { color:#a3b1c2 !important; }
.theme-dark .allo-docsuite .text-indigo-400, .theme-dark .allo-docsuite .text-indigo-500, .theme-dark .allo-docsuite .text-indigo-600, .theme-dark .allo-docsuite [class~="text-indigo-600/80"], .theme-dark .allo-docsuite .text-indigo-700, .theme-dark .allo-docsuite [class~="text-indigo-700/80"], .theme-dark .allo-docsuite .text-indigo-800, .theme-dark .allo-docsuite .text-indigo-900, .theme-dark .allo-docsuite [class~="text-indigo-900/80"], .theme-dark .allo-docsuite .text-indigo-950 { color:#a5b4fc !important; }
.theme-dark .allo-docsuite .text-slate-500 { color:#a9b7c8 !important; }
.theme-dark .allo-docsuite .text-lime-900 { color:#bef264 !important; }
.theme-dark .allo-docsuite .text-violet-400, .theme-dark .allo-docsuite .text-violet-500, .theme-dark .allo-docsuite .text-violet-600, .theme-dark .allo-docsuite .text-violet-700, .theme-dark .allo-docsuite [class~="text-violet-700/70"], .theme-dark .allo-docsuite .text-violet-800, .theme-dark .allo-docsuite .text-violet-900, .theme-dark .allo-docsuite .text-violet-950 { color:#c4b5fd !important; }
.theme-dark .allo-docsuite .text-gray-600, .theme-dark .allo-docsuite .text-slate-600, .theme-dark .allo-docsuite [class~="text-slate-600/50"] { color:#cbd5e1 !important; }
.theme-dark .allo-docsuite .text-purple-400, .theme-dark .allo-docsuite .text-purple-500, .theme-dark .allo-docsuite .text-purple-600, .theme-dark .allo-docsuite .text-purple-700, .theme-dark .allo-docsuite .text-purple-800, .theme-dark .allo-docsuite .text-purple-900, .theme-dark .allo-docsuite .text-purple-950 { color:#d8b4fe !important; }
.theme-dark .allo-docsuite .text-slate-700, .theme-dark .allo-docsuite .text-stone-700 { color:#e2e8f0 !important; }
.theme-dark .allo-docsuite .text-fuchsia-400, .theme-dark .allo-docsuite .text-fuchsia-500, .theme-dark .allo-docsuite .text-fuchsia-600, .theme-dark .allo-docsuite .text-fuchsia-700, .theme-dark .allo-docsuite .text-fuchsia-800, .theme-dark .allo-docsuite .text-fuchsia-900, .theme-dark .allo-docsuite .text-fuchsia-950 { color:#f0abfc !important; }
.theme-dark .allo-docsuite .text-black, .theme-dark .allo-docsuite [class~="text-black/10"], .theme-dark .allo-docsuite [class~="text-black/20"], .theme-dark .allo-docsuite .text-slate-800 { color:#f1f5f9 !important; }
.theme-dark .allo-docsuite .text-slate-900, .theme-dark .allo-docsuite [class~="text-slate-900/95"] { color:#f8fafc !important; }
.theme-dark .allo-docsuite .text-pink-600, .theme-dark .allo-docsuite .text-pink-700, .theme-dark .allo-docsuite .text-pink-800, .theme-dark .allo-docsuite .text-pink-900 { color:#f9a8d4 !important; }
.theme-dark .allo-docsuite .text-red-400, .theme-dark .allo-docsuite .text-red-500, .theme-dark .allo-docsuite .text-red-600, .theme-dark .allo-docsuite .text-red-700, .theme-dark .allo-docsuite [class~="text-red-700/70"], .theme-dark .allo-docsuite [class~="text-red-700/80"], .theme-dark .allo-docsuite .text-red-800, .theme-dark .allo-docsuite .text-red-900, .theme-dark .allo-docsuite .text-red-950 { color:#fca5a5 !important; }
.theme-dark .allo-docsuite .text-amber-400, .theme-dark .allo-docsuite [class~="text-amber-400/70"], .theme-dark .allo-docsuite .text-amber-500, .theme-dark .allo-docsuite .text-amber-600, .theme-dark .allo-docsuite .text-amber-700, .theme-dark .allo-docsuite [class~="text-amber-700/90"], .theme-dark .allo-docsuite .text-amber-800, .theme-dark .allo-docsuite .text-amber-900, .theme-dark .allo-docsuite .text-amber-950 { color:#fcd34d !important; }
.theme-dark .allo-docsuite .text-rose-400, .theme-dark .allo-docsuite .text-rose-500, .theme-dark .allo-docsuite .text-rose-600, .theme-dark .allo-docsuite .text-rose-700, .theme-dark .allo-docsuite .text-rose-800, .theme-dark .allo-docsuite .text-rose-900 { color:#fda4af !important; }
.theme-dark .allo-docsuite .text-orange-400, .theme-dark .allo-docsuite .text-orange-500, .theme-dark .allo-docsuite .text-orange-600, .theme-dark .allo-docsuite .text-orange-700, .theme-dark .allo-docsuite .text-orange-800, .theme-dark .allo-docsuite .text-orange-900 { color:#fdba74 !important; }
.theme-dark .allo-docsuite .text-yellow-400, .theme-dark .allo-docsuite .text-yellow-500, .theme-dark .allo-docsuite .text-yellow-600, .theme-dark .allo-docsuite [class~="text-yellow-600/70"], .theme-dark .allo-docsuite .text-yellow-700, .theme-dark .allo-docsuite .text-yellow-800, .theme-dark .allo-docsuite .text-yellow-900 { color:#fde047 !important; }
.theme-contrast .allo-docsuite .ring-amber-100, .theme-contrast .allo-docsuite .ring-amber-200, .theme-contrast .allo-docsuite .ring-amber-300, .theme-contrast .allo-docsuite [class~="ring-amber-300/30"], .theme-contrast .allo-docsuite .ring-amber-400, .theme-contrast .allo-docsuite .ring-amber-500, .theme-contrast .allo-docsuite [class~="ring-amber-500/20"], .theme-contrast .allo-docsuite [class~="ring-amber-500/40"], .theme-contrast .allo-docsuite .ring-amber-600, .theme-contrast .allo-docsuite .ring-amber-700, .theme-contrast .allo-docsuite .ring-blue-200, .theme-contrast .allo-docsuite .ring-blue-400, .theme-contrast .allo-docsuite .ring-blue-500, .theme-contrast .allo-docsuite [class~="ring-blue-500/20"], .theme-contrast .allo-docsuite .ring-blue-600, .theme-contrast .allo-docsuite .ring-cyan-200, .theme-contrast .allo-docsuite .ring-cyan-300, .theme-contrast .allo-docsuite .ring-cyan-400, .theme-contrast .allo-docsuite [class~="ring-cyan-400/50"], .theme-contrast .allo-docsuite .ring-cyan-500, .theme-contrast .allo-docsuite [class~="ring-cyan-500/20"], .theme-contrast .allo-docsuite .ring-cyan-700, .theme-contrast .allo-docsuite .ring-emerald-200, .theme-contrast .allo-docsuite .ring-emerald-300, .theme-contrast .allo-docsuite [class~="ring-emerald-300/60"], .theme-contrast .allo-docsuite .ring-emerald-400, .theme-contrast .allo-docsuite .ring-emerald-500, .theme-contrast .allo-docsuite [class~="ring-emerald-500/20"], .theme-contrast .allo-docsuite .ring-emerald-600, .theme-contrast .allo-docsuite .ring-emerald-700, .theme-contrast .allo-docsuite .ring-fuchsia-400, .theme-contrast .allo-docsuite .ring-green-200, .theme-contrast .allo-docsuite .ring-green-300, .theme-contrast .allo-docsuite .ring-green-400, .theme-contrast .allo-docsuite .ring-green-500, .theme-contrast .allo-docsuite .ring-green-800, .theme-contrast .allo-docsuite .ring-indigo-100, .theme-contrast .allo-docsuite .ring-indigo-200, .theme-contrast .allo-docsuite [class~="ring-indigo-200/60"], .theme-contrast .allo-docsuite .ring-indigo-300, .theme-contrast .allo-docsuite [class~="ring-indigo-300/80"], .theme-contrast .allo-docsuite .ring-indigo-400, .theme-contrast .allo-docsuite [class~="ring-indigo-400/50"], .theme-contrast .allo-docsuite .ring-indigo-500, .theme-contrast .allo-docsuite [class~="ring-indigo-500/20"], .theme-contrast .allo-docsuite [class~="ring-indigo-500/25"], .theme-contrast .allo-docsuite [class~="ring-indigo-500/30"], .theme-contrast .allo-docsuite .ring-indigo-600, .theme-contrast .allo-docsuite .ring-indigo-700, .theme-contrast .allo-docsuite .ring-orange-300, .theme-contrast .allo-docsuite .ring-orange-400, .theme-contrast .allo-docsuite .ring-orange-500, .theme-contrast .allo-docsuite [class~="ring-orange-500/20"], .theme-contrast .allo-docsuite .ring-pink-200, .theme-contrast .allo-docsuite .ring-pink-400, .theme-contrast .allo-docsuite .ring-pink-500, .theme-contrast .allo-docsuite .ring-purple-100, .theme-contrast .allo-docsuite .ring-purple-200, .theme-contrast .allo-docsuite .ring-purple-300, .theme-contrast .allo-docsuite .ring-purple-400, .theme-contrast .allo-docsuite .ring-purple-500, .theme-contrast .allo-docsuite [class~="ring-purple-500/30"], .theme-contrast .allo-docsuite .ring-purple-600, .theme-contrast .allo-docsuite .ring-red-300, .theme-contrast .allo-docsuite [class~="ring-red-300/30"], .theme-contrast .allo-docsuite .ring-red-400, .theme-contrast .allo-docsuite .ring-red-500, .theme-contrast .allo-docsuite .ring-red-700, .theme-contrast .allo-docsuite .ring-rose-200, .theme-contrast .allo-docsuite .ring-rose-300, .theme-contrast .allo-docsuite .ring-rose-400, .theme-contrast .allo-docsuite .ring-rose-500, .theme-contrast .allo-docsuite [class~="ring-rose-500/20"], .theme-contrast .allo-docsuite .ring-rose-600, .theme-contrast .allo-docsuite .ring-rose-700, .theme-contrast .allo-docsuite .ring-sky-300, .theme-contrast .allo-docsuite .ring-sky-400, .theme-contrast .allo-docsuite [class~="ring-sky-500/20"], .theme-contrast .allo-docsuite .ring-sky-700, .theme-contrast .allo-docsuite .ring-slate-200, .theme-contrast .allo-docsuite .ring-slate-300, .theme-contrast .allo-docsuite .ring-slate-400, .theme-contrast .allo-docsuite .ring-slate-500, .theme-contrast .allo-docsuite .ring-slate-600, .theme-contrast .allo-docsuite .ring-slate-700, .theme-contrast .allo-docsuite .ring-teal-100, .theme-contrast .allo-docsuite .ring-teal-200, .theme-contrast .allo-docsuite .ring-teal-300, .theme-contrast .allo-docsuite .ring-teal-400, .theme-contrast .allo-docsuite .ring-teal-500, .theme-contrast .allo-docsuite [class~="ring-teal-500/20"], .theme-contrast .allo-docsuite .ring-teal-600, .theme-contrast .allo-docsuite .ring-teal-700, .theme-contrast .allo-docsuite .ring-violet-200, .theme-contrast .allo-docsuite .ring-violet-300, .theme-contrast .allo-docsuite .ring-violet-400, .theme-contrast .allo-docsuite [class~="ring-violet-400/40"], .theme-contrast .allo-docsuite .ring-violet-500, .theme-contrast .allo-docsuite [class~="ring-violet-500/20"], .theme-contrast .allo-docsuite .ring-violet-600, .theme-contrast .allo-docsuite .ring-violet-700, .theme-contrast .allo-docsuite .ring-white, .theme-contrast .allo-docsuite [class~="ring-white/10"], .theme-contrast .allo-docsuite [class~="ring-white/20"], .theme-contrast .allo-docsuite [class~="ring-white/50"], .theme-contrast .allo-docsuite .ring-yellow-100, .theme-contrast .allo-docsuite .ring-yellow-200, .theme-contrast .allo-docsuite .ring-yellow-300, .theme-contrast .allo-docsuite .ring-yellow-400, .theme-contrast .allo-docsuite [class~="ring-yellow-400/40"], .theme-contrast .allo-docsuite [class~="ring-yellow-400/50"], .theme-contrast .allo-docsuite .ring-yellow-500, .theme-contrast .allo-docsuite .ring-yellow-600, .theme-contrast .allo-docsuite .ring-yellow-700 { --tw-ring-color:#ffff00 !important; }
.theme-contrast .allo-docsuite .bg-amber-100, .theme-contrast .allo-docsuite [class~="bg-amber-100/50"], .theme-contrast .allo-docsuite .bg-amber-200, .theme-contrast .allo-docsuite [class~="bg-amber-200/50"], .theme-contrast .allo-docsuite [class~="bg-amber-200/60"], .theme-contrast .allo-docsuite .bg-amber-300, .theme-contrast .allo-docsuite [class~="bg-amber-300/15"], .theme-contrast .allo-docsuite [class~="bg-amber-300/50"], .theme-contrast .allo-docsuite .bg-amber-400, .theme-contrast .allo-docsuite [class~="bg-amber-400/10"], .theme-contrast .allo-docsuite [class~="bg-amber-400/20"], .theme-contrast .allo-docsuite [class~="bg-amber-400/30"], .theme-contrast .allo-docsuite .bg-amber-50, .theme-contrast .allo-docsuite [class~="bg-amber-50/50"], .theme-contrast .allo-docsuite [class~="bg-amber-50/60"], .theme-contrast .allo-docsuite [class~="bg-amber-50/70"], .theme-contrast .allo-docsuite [class~="bg-amber-50/80"], .theme-contrast .allo-docsuite .bg-amber-500, .theme-contrast .allo-docsuite [class~="bg-amber-500/15"], .theme-contrast .allo-docsuite [class~="bg-amber-500/20"], .theme-contrast .allo-docsuite .bg-amber-600, .theme-contrast .allo-docsuite .bg-amber-700, .theme-contrast .allo-docsuite .bg-amber-800, .theme-contrast .allo-docsuite [class~="bg-amber-900/20"], .theme-contrast .allo-docsuite [class~="bg-amber-900/30"], .theme-contrast .allo-docsuite [class~="bg-amber-900/40"], .theme-contrast .allo-docsuite [class~="bg-amber-900/50"], .theme-contrast .allo-docsuite [class~="bg-amber-900/60"], .theme-contrast .allo-docsuite [class~="bg-amber-900/80"], .theme-contrast .allo-docsuite .bg-blue-100, .theme-contrast .allo-docsuite [class~="bg-blue-100/50"], .theme-contrast .allo-docsuite [class~="bg-blue-100/90"], .theme-contrast .allo-docsuite .bg-blue-200, .theme-contrast .allo-docsuite [class~="bg-blue-200/30"], .theme-contrast .allo-docsuite [class~="bg-blue-200/60"], .theme-contrast .allo-docsuite .bg-blue-300, .theme-contrast .allo-docsuite .bg-blue-400, .theme-contrast .allo-docsuite .bg-blue-50, .theme-contrast .allo-docsuite [class~="bg-blue-50/60"], .theme-contrast .allo-docsuite [class~="bg-blue-50/95"], .theme-contrast .allo-docsuite .bg-blue-600, .theme-contrast .allo-docsuite .bg-blue-700, .theme-contrast .allo-docsuite .bg-blue-800, .theme-contrast .allo-docsuite [class~="bg-blue-900/50"], .theme-contrast .allo-docsuite .bg-blue-950, .theme-contrast .allo-docsuite .bg-cyan-100, .theme-contrast .allo-docsuite [class~="bg-cyan-100/80"], .theme-contrast .allo-docsuite .bg-cyan-200, .theme-contrast .allo-docsuite [class~="bg-cyan-200/60"], .theme-contrast .allo-docsuite [class~="bg-cyan-200/80"], .theme-contrast .allo-docsuite .bg-cyan-400, .theme-contrast .allo-docsuite [class~="bg-cyan-400/20"], .theme-contrast .allo-docsuite .bg-cyan-50, .theme-contrast .allo-docsuite [class~="bg-cyan-50/60"], .theme-contrast .allo-docsuite [class~="bg-cyan-50/70"], .theme-contrast .allo-docsuite .bg-cyan-500, .theme-contrast .allo-docsuite .bg-cyan-600, .theme-contrast .allo-docsuite .bg-cyan-700, .theme-contrast .allo-docsuite .bg-cyan-800, .theme-contrast .allo-docsuite .bg-cyan-900, .theme-contrast .allo-docsuite [class~="bg-cyan-900/60"], .theme-contrast .allo-docsuite .bg-emerald-100, .theme-contrast .allo-docsuite .bg-emerald-200, .theme-contrast .allo-docsuite .bg-emerald-300, .theme-contrast .allo-docsuite .bg-emerald-400, .theme-contrast .allo-docsuite [class~="bg-emerald-400/20"], .theme-contrast .allo-docsuite .bg-emerald-50, .theme-contrast .allo-docsuite [class~="bg-emerald-50/40"], .theme-contrast .allo-docsuite [class~="bg-emerald-50/50"], .theme-contrast .allo-docsuite [class~="bg-emerald-50/60"], .theme-contrast .allo-docsuite [class~="bg-emerald-50/70"], .theme-contrast .allo-docsuite .bg-emerald-500, .theme-contrast .allo-docsuite [class~="bg-emerald-500/15"], .theme-contrast .allo-docsuite [class~="bg-emerald-500/20"], .theme-contrast .allo-docsuite [class~="bg-emerald-500/25"], .theme-contrast .allo-docsuite .bg-emerald-600, .theme-contrast .allo-docsuite .bg-emerald-700, .theme-contrast .allo-docsuite .bg-emerald-800, .theme-contrast .allo-docsuite [class~="bg-emerald-900/20"], .theme-contrast .allo-docsuite [class~="bg-emerald-900/30"], .theme-contrast .allo-docsuite .bg-emerald-950, .theme-contrast .allo-docsuite [class~="bg-emerald-950/70"], .theme-contrast .allo-docsuite .bg-fuchsia-100, .theme-contrast .allo-docsuite .bg-fuchsia-50, .theme-contrast .allo-docsuite [class~="bg-fuchsia-50/50"], .theme-contrast .allo-docsuite [class~="bg-fuchsia-50/60"], .theme-contrast .allo-docsuite .bg-fuchsia-500, .theme-contrast .allo-docsuite .bg-fuchsia-600, .theme-contrast .allo-docsuite [class~="bg-fuchsia-600/60"], .theme-contrast .allo-docsuite .bg-fuchsia-700, .theme-contrast .allo-docsuite [class~="bg-fuchsia-700/50"], .theme-contrast .allo-docsuite [class~="bg-fuchsia-900/40"], .theme-contrast .allo-docsuite .bg-green-100, .theme-contrast .allo-docsuite [class~="bg-green-100/50"], .theme-contrast .allo-docsuite .bg-green-200, .theme-contrast .allo-docsuite .bg-green-300, .theme-contrast .allo-docsuite .bg-green-400, .theme-contrast .allo-docsuite .bg-green-50, .theme-contrast .allo-docsuite [class~="bg-green-50/50"], .theme-contrast .allo-docsuite .bg-green-500, .theme-contrast .allo-docsuite .bg-green-600, .theme-contrast .allo-docsuite .bg-green-700, .theme-contrast .allo-docsuite .bg-green-800, .theme-contrast .allo-docsuite .bg-indigo-100, .theme-contrast .allo-docsuite [class~="bg-indigo-100/20"], .theme-contrast .allo-docsuite [class~="bg-indigo-100/50"], .theme-contrast .allo-docsuite [class~="bg-indigo-100/60"], .theme-contrast .allo-docsuite [class~="bg-indigo-100/80"], .theme-contrast .allo-docsuite .bg-indigo-200, .theme-contrast .allo-docsuite [class~="bg-indigo-200/20"], .theme-contrast .allo-docsuite [class~="bg-indigo-200/50"], .theme-contrast .allo-docsuite [class~="bg-indigo-200/60"], .theme-contrast .allo-docsuite [class~="bg-indigo-200/80"], .theme-contrast .allo-docsuite .bg-indigo-300, .theme-contrast .allo-docsuite .bg-indigo-400, .theme-contrast .allo-docsuite .bg-indigo-50, .theme-contrast .allo-docsuite [class~="bg-indigo-50/30"], .theme-contrast .allo-docsuite [class~="bg-indigo-50/40"], .theme-contrast .allo-docsuite [class~="bg-indigo-50/50"], .theme-contrast .allo-docsuite [class~="bg-indigo-50/60"], .theme-contrast .allo-docsuite [class~="bg-indigo-50/70"], .theme-contrast .allo-docsuite [class~="bg-indigo-50/80"], .theme-contrast .allo-docsuite .bg-indigo-500, .theme-contrast .allo-docsuite [class~="bg-indigo-500/10"], .theme-contrast .allo-docsuite [class~="bg-indigo-500/15"], .theme-contrast .allo-docsuite [class~="bg-indigo-500/20"], .theme-contrast .allo-docsuite [class~="bg-indigo-500/25"], .theme-contrast .allo-docsuite [class~="bg-indigo-500/30"], .theme-contrast .allo-docsuite .bg-indigo-600, .theme-contrast .allo-docsuite [class~="bg-indigo-600/30"], .theme-contrast .allo-docsuite [class~="bg-indigo-600/5"], .theme-contrast .allo-docsuite .bg-indigo-700, .theme-contrast .allo-docsuite .bg-indigo-800, .theme-contrast .allo-docsuite [class~="bg-indigo-800/50"], .theme-contrast .allo-docsuite .bg-indigo-900, .theme-contrast .allo-docsuite [class~="bg-indigo-900/20"], .theme-contrast .allo-docsuite [class~="bg-indigo-900/30"], .theme-contrast .allo-docsuite [class~="bg-indigo-900/40"], .theme-contrast .allo-docsuite [class~="bg-indigo-900/50"], .theme-contrast .allo-docsuite .bg-indigo-950, .theme-contrast .allo-docsuite [class~="bg-indigo-950/40"], .theme-contrast .allo-docsuite [class~="bg-indigo-950/80"], .theme-contrast .allo-docsuite .bg-lime-50, .theme-contrast .allo-docsuite .bg-lime-500, .theme-contrast .allo-docsuite .bg-lime-600, .theme-contrast .allo-docsuite .bg-orange-100, .theme-contrast .allo-docsuite [class~="bg-orange-100/50"], .theme-contrast .allo-docsuite .bg-orange-200, .theme-contrast .allo-docsuite [class~="bg-orange-200/30"], .theme-contrast .allo-docsuite [class~="bg-orange-200/60"], .theme-contrast .allo-docsuite [class~="bg-orange-200/80"], .theme-contrast .allo-docsuite .bg-orange-300, .theme-contrast .allo-docsuite .bg-orange-400, .theme-contrast .allo-docsuite [class~="bg-orange-400/15"], .theme-contrast .allo-docsuite .bg-orange-50, .theme-contrast .allo-docsuite [class~="bg-orange-50/80"], .theme-contrast .allo-docsuite .bg-orange-600, .theme-contrast .allo-docsuite .bg-orange-700, .theme-contrast .allo-docsuite .bg-pink-100, .theme-contrast .allo-docsuite .bg-pink-200, .theme-contrast .allo-docsuite .bg-pink-50, .theme-contrast .allo-docsuite [class~="bg-pink-50/50"], .theme-contrast .allo-docsuite [class~="bg-pink-50/60"], .theme-contrast .allo-docsuite .bg-pink-500, .theme-contrast .allo-docsuite .bg-pink-600, .theme-contrast .allo-docsuite .bg-pink-700, .theme-contrast .allo-docsuite .bg-purple-100, .theme-contrast .allo-docsuite [class~="bg-purple-100/20"], .theme-contrast .allo-docsuite [class~="bg-purple-100/50"], .theme-contrast .allo-docsuite .bg-purple-200, .theme-contrast .allo-docsuite [class~="bg-purple-200/15"], .theme-contrast .allo-docsuite [class~="bg-purple-200/40"], .theme-contrast .allo-docsuite .bg-purple-300, .theme-contrast .allo-docsuite .bg-purple-400, .theme-contrast .allo-docsuite .bg-purple-50, .theme-contrast .allo-docsuite [class~="bg-purple-50/50"], .theme-contrast .allo-docsuite .bg-purple-500, .theme-contrast .allo-docsuite .bg-purple-600, .theme-contrast .allo-docsuite [class~="bg-purple-600/5"], .theme-contrast .allo-docsuite .bg-purple-700, .theme-contrast .allo-docsuite .bg-red-100, .theme-contrast .allo-docsuite [class~="bg-red-100/50"], .theme-contrast .allo-docsuite .bg-red-200, .theme-contrast .allo-docsuite .bg-red-300, .theme-contrast .allo-docsuite .bg-red-400, .theme-contrast .allo-docsuite .bg-red-50, .theme-contrast .allo-docsuite [class~="bg-red-50/70"], .theme-contrast .allo-docsuite .bg-red-500, .theme-contrast .allo-docsuite [class~="bg-red-500/30"], .theme-contrast .allo-docsuite [class~="bg-red-500/80"], .theme-contrast .allo-docsuite .bg-red-600, .theme-contrast .allo-docsuite .bg-red-700, .theme-contrast .allo-docsuite .bg-red-800, .theme-contrast .allo-docsuite [class~="bg-red-900/50"], .theme-contrast .allo-docsuite [class~="bg-red-900/90"], .theme-contrast .allo-docsuite [class~="bg-red-950/40"], .theme-contrast .allo-docsuite .bg-rose-100, .theme-contrast .allo-docsuite [class~="bg-rose-100/90"], .theme-contrast .allo-docsuite .bg-rose-200, .theme-contrast .allo-docsuite [class~="bg-rose-200/60"], .theme-contrast .allo-docsuite .bg-rose-300, .theme-contrast .allo-docsuite .bg-rose-50, .theme-contrast .allo-docsuite [class~="bg-rose-50/50"], .theme-contrast .allo-docsuite [class~="bg-rose-50/70"], .theme-contrast .allo-docsuite .bg-rose-500, .theme-contrast .allo-docsuite .bg-rose-600, .theme-contrast .allo-docsuite .bg-rose-700, .theme-contrast .allo-docsuite .bg-rose-800, .theme-contrast .allo-docsuite [class~="bg-rose-800/90"], .theme-contrast .allo-docsuite [class~="bg-rose-900/20"], .theme-contrast .allo-docsuite [class~="bg-rose-900/30"], .theme-contrast .allo-docsuite [class~="bg-rose-900/40"], .theme-contrast .allo-docsuite .bg-sky-100, .theme-contrast .allo-docsuite .bg-sky-200, .theme-contrast .allo-docsuite .bg-sky-50, .theme-contrast .allo-docsuite [class~="bg-sky-50/50"], .theme-contrast .allo-docsuite [class~="bg-sky-50/70"], .theme-contrast .allo-docsuite .bg-sky-500, .theme-contrast .allo-docsuite [class~="bg-sky-500/15"], .theme-contrast .allo-docsuite [class~="bg-sky-500/25"], .theme-contrast .allo-docsuite .bg-sky-600, .theme-contrast .allo-docsuite .bg-sky-700, .theme-contrast .allo-docsuite .bg-sky-800, .theme-contrast .allo-docsuite .bg-slate-100, .theme-contrast .allo-docsuite [class~="bg-slate-100/50"], .theme-contrast .allo-docsuite [class~="bg-slate-100/90"], .theme-contrast .allo-docsuite .bg-slate-200, .theme-contrast .allo-docsuite [class~="bg-slate-200/50"], .theme-contrast .allo-docsuite .bg-slate-300, .theme-contrast .allo-docsuite .bg-slate-400, .theme-contrast .allo-docsuite .bg-slate-50, .theme-contrast .allo-docsuite [class~="bg-slate-50/30"], .theme-contrast .allo-docsuite [class~="bg-slate-50/50"], .theme-contrast .allo-docsuite [class~="bg-slate-50/60"], .theme-contrast .allo-docsuite [class~="bg-slate-50/70"], .theme-contrast .allo-docsuite [class~="bg-slate-50/80"], .theme-contrast .allo-docsuite [class~="bg-slate-50/90"], .theme-contrast .allo-docsuite .bg-slate-500, .theme-contrast .allo-docsuite [class~="bg-slate-500/20"], .theme-contrast .allo-docsuite .bg-slate-600, .theme-contrast .allo-docsuite .bg-slate-700, .theme-contrast .allo-docsuite [class~="bg-slate-700/90"], .theme-contrast .allo-docsuite .bg-slate-800, .theme-contrast .allo-docsuite [class~="bg-slate-800/40"], .theme-contrast .allo-docsuite [class~="bg-slate-800/50"], .theme-contrast .allo-docsuite [class~="bg-slate-800/60"], .theme-contrast .allo-docsuite [class~="bg-slate-800/70"], .theme-contrast .allo-docsuite [class~="bg-slate-800/80"], .theme-contrast .allo-docsuite [class~="bg-slate-800/90"], .theme-contrast .allo-docsuite [class~="bg-slate-800/95"], .theme-contrast .allo-docsuite .bg-slate-900, .theme-contrast .allo-docsuite [class~="bg-slate-900/40"], .theme-contrast .allo-docsuite [class~="bg-slate-900/50"], .theme-contrast .allo-docsuite [class~="bg-slate-900/60"], .theme-contrast .allo-docsuite [class~="bg-slate-900/70"], .theme-contrast .allo-docsuite [class~="bg-slate-900/80"], .theme-contrast .allo-docsuite [class~="bg-slate-900/85"], .theme-contrast .allo-docsuite [class~="bg-slate-900/90"], .theme-contrast .allo-docsuite [class~="bg-slate-900/95"], .theme-contrast .allo-docsuite .bg-slate-950, .theme-contrast .allo-docsuite [class~="bg-slate-950/20"], .theme-contrast .allo-docsuite [class~="bg-slate-950/40"], .theme-contrast .allo-docsuite [class~="bg-slate-950/55"], .theme-contrast .allo-docsuite [class~="bg-slate-950/60"], .theme-contrast .allo-docsuite [class~="bg-slate-950/70"], .theme-contrast .allo-docsuite [class~="bg-slate-950/75"], .theme-contrast .allo-docsuite [class~="bg-slate-950/80"], .theme-contrast .allo-docsuite [class~="bg-slate-950/90"], .theme-contrast .allo-docsuite [class~="bg-slate-950/95"], .theme-contrast .allo-docsuite .bg-stone-50, .theme-contrast .allo-docsuite .bg-stone-700, .theme-contrast .allo-docsuite .bg-teal-100, .theme-contrast .allo-docsuite .bg-teal-200, .theme-contrast .allo-docsuite [class~="bg-teal-200/60"], .theme-contrast .allo-docsuite [class~="bg-teal-200/80"], .theme-contrast .allo-docsuite .bg-teal-300, .theme-contrast .allo-docsuite .bg-teal-400, .theme-contrast .allo-docsuite .bg-teal-50, .theme-contrast .allo-docsuite [class~="bg-teal-50/50"], .theme-contrast .allo-docsuite [class~="bg-teal-50/60"], .theme-contrast .allo-docsuite .bg-teal-500, .theme-contrast .allo-docsuite [class~="bg-teal-500/15"], .theme-contrast .allo-docsuite .bg-teal-600, .theme-contrast .allo-docsuite .bg-teal-700, .theme-contrast .allo-docsuite .bg-teal-800, .theme-contrast .allo-docsuite .bg-teal-950, .theme-contrast .allo-docsuite .bg-violet-100, .theme-contrast .allo-docsuite [class~="bg-violet-100/50"], .theme-contrast .allo-docsuite .bg-violet-200, .theme-contrast .allo-docsuite .bg-violet-400, .theme-contrast .allo-docsuite .bg-violet-50, .theme-contrast .allo-docsuite [class~="bg-violet-50/40"], .theme-contrast .allo-docsuite [class~="bg-violet-50/50"], .theme-contrast .allo-docsuite [class~="bg-violet-50/60"], .theme-contrast .allo-docsuite [class~="bg-violet-50/70"], .theme-contrast .allo-docsuite .bg-violet-500, .theme-contrast .allo-docsuite .bg-violet-600, .theme-contrast .allo-docsuite [class~="bg-violet-600/30"], .theme-contrast .allo-docsuite [class~="bg-violet-600/40"], .theme-contrast .allo-docsuite [class~="bg-violet-600/60"], .theme-contrast .allo-docsuite .bg-violet-700, .theme-contrast .allo-docsuite [class~="bg-violet-700/20"], .theme-contrast .allo-docsuite .bg-violet-800, .theme-contrast .allo-docsuite .bg-white, .theme-contrast .allo-docsuite [class~="bg-white/10"], .theme-contrast .allo-docsuite [class~="bg-white/15"], .theme-contrast .allo-docsuite [class~="bg-white/20"], .theme-contrast .allo-docsuite [class~="bg-white/30"], .theme-contrast .allo-docsuite [class~="bg-white/35"], .theme-contrast .allo-docsuite [class~="bg-white/5"], .theme-contrast .allo-docsuite [class~="bg-white/50"], .theme-contrast .allo-docsuite [class~="bg-white/60"], .theme-contrast .allo-docsuite [class~="bg-white/70"], .theme-contrast .allo-docsuite [class~="bg-white/80"], .theme-contrast .allo-docsuite [class~="bg-white/90"], .theme-contrast .allo-docsuite [class~="bg-white/95"], .theme-contrast .allo-docsuite .bg-yellow-100, .theme-contrast .allo-docsuite [class~="bg-yellow-100/5"], .theme-contrast .allo-docsuite .bg-yellow-200, .theme-contrast .allo-docsuite [class~="bg-yellow-200/30"], .theme-contrast .allo-docsuite .bg-yellow-300, .theme-contrast .allo-docsuite .bg-yellow-400, .theme-contrast .allo-docsuite [class~="bg-yellow-400/20"], .theme-contrast .allo-docsuite [class~="bg-yellow-400/30"], .theme-contrast .allo-docsuite .bg-yellow-50, .theme-contrast .allo-docsuite [class~="bg-yellow-50/60"], .theme-contrast .allo-docsuite .bg-yellow-500, .theme-contrast .allo-docsuite [class~="bg-yellow-500/20"], .theme-contrast .allo-docsuite .bg-yellow-600, .theme-contrast .allo-docsuite .bg-yellow-700, .theme-contrast .allo-docsuite .bg-yellow-900, .theme-contrast .allo-docsuite .bg-zinc-500, .theme-contrast .allo-docsuite .bg-zinc-600 { background-color:#000000 !important; }
.theme-contrast .allo-docsuite .from-amber-100, .theme-contrast .allo-docsuite .from-amber-300, .theme-contrast .allo-docsuite .from-amber-400, .theme-contrast .allo-docsuite [class~="from-amber-400/20"], .theme-contrast .allo-docsuite .from-amber-50, .theme-contrast .allo-docsuite [class~="from-amber-50/80"], .theme-contrast .allo-docsuite .from-amber-500, .theme-contrast .allo-docsuite .from-amber-600, .theme-contrast .allo-docsuite [class~="from-amber-600/80"], .theme-contrast .allo-docsuite .from-amber-700, .theme-contrast .allo-docsuite .from-amber-800, .theme-contrast .allo-docsuite .from-amber-900, .theme-contrast .allo-docsuite [class~="from-amber-900/40"], .theme-contrast .allo-docsuite .from-black, .theme-contrast .allo-docsuite .from-blue-100, .theme-contrast .allo-docsuite [class~="from-blue-100/50"], .theme-contrast .allo-docsuite .from-blue-400, .theme-contrast .allo-docsuite .from-blue-50, .theme-contrast .allo-docsuite [class~="from-blue-50/60"], .theme-contrast .allo-docsuite .from-blue-500, .theme-contrast .allo-docsuite .from-blue-600, .theme-contrast .allo-docsuite .from-blue-700, .theme-contrast .allo-docsuite [class~="from-blue-900/40"], .theme-contrast .allo-docsuite .from-cyan-400, .theme-contrast .allo-docsuite .from-cyan-50, .theme-contrast .allo-docsuite [class~="from-cyan-50/60"], .theme-contrast .allo-docsuite [class~="from-cyan-50/80"], .theme-contrast .allo-docsuite .from-cyan-500, .theme-contrast .allo-docsuite .from-cyan-600, .theme-contrast .allo-docsuite [class~="from-cyan-900/40"], .theme-contrast .allo-docsuite [class~="from-emerald-400/20"], .theme-contrast .allo-docsuite .from-emerald-50, .theme-contrast .allo-docsuite .from-emerald-500, .theme-contrast .allo-docsuite .from-emerald-600, .theme-contrast .allo-docsuite .from-emerald-700, .theme-contrast .allo-docsuite [class~="from-emerald-900/40"], .theme-contrast .allo-docsuite .from-fuchsia-50, .theme-contrast .allo-docsuite .from-fuchsia-600, .theme-contrast .allo-docsuite .from-green-400, .theme-contrast .allo-docsuite .from-green-50, .theme-contrast .allo-docsuite .from-green-500, .theme-contrast .allo-docsuite .from-green-700, .theme-contrast .allo-docsuite .from-green-800, .theme-contrast .allo-docsuite .from-indigo-100, .theme-contrast .allo-docsuite .from-indigo-200, .theme-contrast .allo-docsuite .from-indigo-400, .theme-contrast .allo-docsuite .from-indigo-50, .theme-contrast .allo-docsuite [class~="from-indigo-50/60"], .theme-contrast .allo-docsuite [class~="from-indigo-50/80"], .theme-contrast .allo-docsuite [class~="from-indigo-50/95"], .theme-contrast .allo-docsuite .from-indigo-500, .theme-contrast .allo-docsuite .from-indigo-600, .theme-contrast .allo-docsuite .from-indigo-700, .theme-contrast .allo-docsuite [class~="from-indigo-900/40"], .theme-contrast .allo-docsuite [class~="from-indigo-900/50"], .theme-contrast .allo-docsuite .from-lime-600, .theme-contrast .allo-docsuite [class~="from-orange-50/80"], .theme-contrast .allo-docsuite .from-orange-500, .theme-contrast .allo-docsuite .from-orange-600, .theme-contrast .allo-docsuite .from-pink-100, .theme-contrast .allo-docsuite .from-pink-500, .theme-contrast .allo-docsuite .from-pink-600, .theme-contrast .allo-docsuite [class~="from-pink-900/40"], .theme-contrast .allo-docsuite .from-purple-50, .theme-contrast .allo-docsuite .from-purple-600, .theme-contrast .allo-docsuite .from-purple-900, .theme-contrast .allo-docsuite [class~="from-purple-900/40"], .theme-contrast .allo-docsuite [class~="from-red-50/70"], .theme-contrast .allo-docsuite .from-red-800, .theme-contrast .allo-docsuite .from-rose-100, .theme-contrast .allo-docsuite [class~="from-rose-100/50"], .theme-contrast .allo-docsuite .from-rose-50, .theme-contrast .allo-docsuite .from-rose-500, .theme-contrast .allo-docsuite .from-rose-600, .theme-contrast .allo-docsuite [class~="from-rose-900/40"], .theme-contrast .allo-docsuite .from-sky-50, .theme-contrast .allo-docsuite [class~="from-sky-50/80"], .theme-contrast .allo-docsuite .from-sky-500, .theme-contrast .allo-docsuite .from-sky-600, .theme-contrast .allo-docsuite [class~="from-sky-900/40"], .theme-contrast .allo-docsuite .from-slate-50, .theme-contrast .allo-docsuite .from-slate-600, .theme-contrast .allo-docsuite .from-slate-700, .theme-contrast .allo-docsuite .from-slate-800, .theme-contrast .allo-docsuite .from-slate-900, .theme-contrast .allo-docsuite .from-stone-600, .theme-contrast .allo-docsuite .from-teal-50, .theme-contrast .allo-docsuite [class~="from-teal-50/80"], .theme-contrast .allo-docsuite .from-teal-500, .theme-contrast .allo-docsuite .from-teal-600, .theme-contrast .allo-docsuite .from-teal-700, .theme-contrast .allo-docsuite .from-violet-100, .theme-contrast .allo-docsuite .from-violet-50, .theme-contrast .allo-docsuite .from-violet-500, .theme-contrast .allo-docsuite .from-violet-600, .theme-contrast .allo-docsuite .from-violet-700, .theme-contrast .allo-docsuite [class~="from-violet-900/40"], .theme-contrast .allo-docsuite .from-white, .theme-contrast .allo-docsuite [class~="from-white/0"], .theme-contrast .allo-docsuite .from-yellow-300, .theme-contrast .allo-docsuite .from-yellow-400, .theme-contrast .allo-docsuite .from-yellow-50, .theme-contrast .allo-docsuite .from-yellow-600, .theme-contrast .allo-docsuite .from-zinc-600, .theme-contrast .allo-docsuite .to-amber-50, .theme-contrast .allo-docsuite [class~="to-amber-50/40"], .theme-contrast .allo-docsuite .to-amber-500, .theme-contrast .allo-docsuite .to-amber-600, .theme-contrast .allo-docsuite .to-amber-800, .theme-contrast .allo-docsuite [class~="to-amber-800/20"], .theme-contrast .allo-docsuite [class~="to-amber-800/80"], .theme-contrast .allo-docsuite [class~="to-blue-200/30"], .theme-contrast .allo-docsuite .to-blue-50, .theme-contrast .allo-docsuite .to-blue-500, .theme-contrast .allo-docsuite .to-blue-600, .theme-contrast .allo-docsuite .to-blue-700, .theme-contrast .allo-docsuite [class~="to-blue-900/40"], .theme-contrast .allo-docsuite [class~="to-cyan-100/40"], .theme-contrast .allo-docsuite [class~="to-cyan-400/10"], .theme-contrast .allo-docsuite .to-cyan-50, .theme-contrast .allo-docsuite .to-cyan-500, .theme-contrast .allo-docsuite .to-cyan-600, .theme-contrast .allo-docsuite .to-cyan-700, .theme-contrast .allo-docsuite .to-emerald-400, .theme-contrast .allo-docsuite .to-emerald-50, .theme-contrast .allo-docsuite .to-emerald-500, .theme-contrast .allo-docsuite .to-emerald-600, .theme-contrast .allo-docsuite .to-emerald-700, .theme-contrast .allo-docsuite .to-emerald-800, .theme-contrast .allo-docsuite .to-emerald-900, .theme-contrast .allo-docsuite .to-fuchsia-100, .theme-contrast .allo-docsuite .to-fuchsia-500, .theme-contrast .allo-docsuite .to-fuchsia-600, .theme-contrast .allo-docsuite [class~="to-fuchsia-900/40"], .theme-contrast .allo-docsuite .to-gray-700, .theme-contrast .allo-docsuite .to-green-700, .theme-contrast .allo-docsuite .to-indigo-100, .theme-contrast .allo-docsuite [class~="to-indigo-100/40"], .theme-contrast .allo-docsuite .to-indigo-200, .theme-contrast .allo-docsuite .to-indigo-300, .theme-contrast .allo-docsuite .to-indigo-50, .theme-contrast .allo-docsuite [class~="to-indigo-50/30"], .theme-contrast .allo-docsuite .to-indigo-500, .theme-contrast .allo-docsuite .to-indigo-600, .theme-contrast .allo-docsuite .to-indigo-700, .theme-contrast .allo-docsuite [class~="to-indigo-900/40"], .theme-contrast .allo-docsuite .to-lime-50, .theme-contrast .allo-docsuite .to-orange-100, .theme-contrast .allo-docsuite [class~="to-orange-100/40"], .theme-contrast .allo-docsuite .to-orange-400, .theme-contrast .allo-docsuite .to-orange-50, .theme-contrast .allo-docsuite .to-orange-500, .theme-contrast .allo-docsuite [class~="to-orange-500/20"], .theme-contrast .allo-docsuite .to-orange-600, .theme-contrast .allo-docsuite .to-orange-700, .theme-contrast .allo-docsuite .to-orange-800, .theme-contrast .allo-docsuite .to-orange-900, .theme-contrast .allo-docsuite [class~="to-orange-900/40"], .theme-contrast .allo-docsuite .to-pink-50, .theme-contrast .allo-docsuite .to-pink-500, .theme-contrast .allo-docsuite .to-pink-600, .theme-contrast .allo-docsuite [class~="to-pink-900/40"], .theme-contrast .allo-docsuite .to-purple-50, .theme-contrast .allo-docsuite [class~="to-purple-50/80"], .theme-contrast .allo-docsuite [class~="to-purple-50/95"], .theme-contrast .allo-docsuite .to-purple-500, .theme-contrast .allo-docsuite .to-purple-600, .theme-contrast .allo-docsuite .to-purple-700, .theme-contrast .allo-docsuite .to-purple-800, .theme-contrast .allo-docsuite [class~="to-purple-900/40"], .theme-contrast .allo-docsuite .to-red-600, .theme-contrast .allo-docsuite .to-red-700, .theme-contrast .allo-docsuite [class~="to-rose-200/30"], .theme-contrast .allo-docsuite .to-rose-50, .theme-contrast .allo-docsuite [class~="to-rose-50/30"], .theme-contrast .allo-docsuite .to-rose-500, .theme-contrast .allo-docsuite .to-rose-600, .theme-contrast .allo-docsuite .to-rose-700, .theme-contrast .allo-docsuite .to-rose-800, .theme-contrast .allo-docsuite .to-rose-900, .theme-contrast .allo-docsuite [class~="to-rose-900/40"], .theme-contrast .allo-docsuite .to-sky-50, .theme-contrast .allo-docsuite .to-sky-600, .theme-contrast .allo-docsuite [class~="to-sky-900/40"], .theme-contrast .allo-docsuite .to-slate-50, .theme-contrast .allo-docsuite .to-slate-700, .theme-contrast .allo-docsuite .to-slate-800, .theme-contrast .allo-docsuite .to-slate-900, .theme-contrast .allo-docsuite .to-stone-600, .theme-contrast .allo-docsuite .to-stone-700, .theme-contrast .allo-docsuite [class~="to-teal-100/40"], .theme-contrast .allo-docsuite .to-teal-50, .theme-contrast .allo-docsuite .to-teal-500, .theme-contrast .allo-docsuite .to-teal-600, .theme-contrast .allo-docsuite .to-teal-700, .theme-contrast .allo-docsuite .to-violet-100, .theme-contrast .allo-docsuite .to-violet-50, .theme-contrast .allo-docsuite [class~="to-violet-50/30"], .theme-contrast .allo-docsuite [class~="to-violet-50/40"], .theme-contrast .allo-docsuite .to-violet-500, .theme-contrast .allo-docsuite .to-violet-600, .theme-contrast .allo-docsuite .to-violet-700, .theme-contrast .allo-docsuite .to-violet-800, .theme-contrast .allo-docsuite [class~="to-violet-900/50"], .theme-contrast .allo-docsuite .to-white, .theme-contrast .allo-docsuite [class~="to-white/20"], .theme-contrast .allo-docsuite .to-yellow-300, .theme-contrast .allo-docsuite .to-yellow-50, .theme-contrast .allo-docsuite .to-yellow-500, .theme-contrast .allo-docsuite .to-yellow-600, .theme-contrast .allo-docsuite .to-zinc-700, .theme-contrast .allo-docsuite .via-amber-400, .theme-contrast .allo-docsuite [class~="via-black/40"], .theme-contrast .allo-docsuite [class~="via-blue-50/40"], .theme-contrast .allo-docsuite [class~="via-green-50/30"], .theme-contrast .allo-docsuite .via-indigo-100, .theme-contrast .allo-docsuite [class~="via-indigo-50/40"], .theme-contrast .allo-docsuite [class~="via-indigo-50/50"], .theme-contrast .allo-docsuite .via-indigo-500, .theme-contrast .allo-docsuite .via-indigo-950, .theme-contrast .allo-docsuite .via-orange-300, .theme-contrast .allo-docsuite [class~="via-orange-50/40"], .theme-contrast .allo-docsuite .via-purple-500, .theme-contrast .allo-docsuite .via-purple-600, .theme-contrast .allo-docsuite .via-white, .theme-contrast .allo-docsuite [class~="via-white/20"], .theme-contrast .allo-docsuite [class~="via-white/95"] { background-image:none !important;background-color:#000000 !important; }
.theme-contrast .allo-docsuite .border-amber-100, .theme-contrast .allo-docsuite [class~="border-amber-100/50"], .theme-contrast .allo-docsuite .border-amber-200, .theme-contrast .allo-docsuite [class~="border-amber-200/30"], .theme-contrast .allo-docsuite [class~="border-amber-200/50"], .theme-contrast .allo-docsuite [class~="border-amber-200/60"], .theme-contrast .allo-docsuite .border-amber-300, .theme-contrast .allo-docsuite [class~="border-amber-300/40"], .theme-contrast .allo-docsuite .border-amber-400, .theme-contrast .allo-docsuite [class~="border-amber-400/40"], .theme-contrast .allo-docsuite [class~="border-amber-400/50"], .theme-contrast .allo-docsuite .border-amber-500, .theme-contrast .allo-docsuite [class~="border-amber-500/30"], .theme-contrast .allo-docsuite [class~="border-amber-500/40"], .theme-contrast .allo-docsuite [class~="border-amber-500/50"], .theme-contrast .allo-docsuite .border-amber-600, .theme-contrast .allo-docsuite [class~="border-amber-600/30"], .theme-contrast .allo-docsuite [class~="border-amber-600/40"], .theme-contrast .allo-docsuite .border-amber-700, .theme-contrast .allo-docsuite [class~="border-amber-700/50"], .theme-contrast .allo-docsuite .border-black, .theme-contrast .allo-docsuite [class~="border-black/20"], .theme-contrast .allo-docsuite [class~="border-black/5"], .theme-contrast .allo-docsuite .border-blue-100, .theme-contrast .allo-docsuite .border-blue-200, .theme-contrast .allo-docsuite [class~="border-blue-200/50"], .theme-contrast .allo-docsuite .border-blue-300, .theme-contrast .allo-docsuite [class~="border-blue-300/30"], .theme-contrast .allo-docsuite [class~="border-blue-300/40"], .theme-contrast .allo-docsuite .border-blue-400, .theme-contrast .allo-docsuite [class~="border-blue-400/50"], .theme-contrast .allo-docsuite .border-blue-500, .theme-contrast .allo-docsuite [class~="border-blue-500/30"], .theme-contrast .allo-docsuite [class~="border-blue-500/40"], .theme-contrast .allo-docsuite .border-blue-600, .theme-contrast .allo-docsuite .border-blue-700, .theme-contrast .allo-docsuite .border-blue-800, .theme-contrast .allo-docsuite .border-cyan-100, .theme-contrast .allo-docsuite .border-cyan-200, .theme-contrast .allo-docsuite .border-cyan-300, .theme-contrast .allo-docsuite [class~="border-cyan-300/25"], .theme-contrast .allo-docsuite [class~="border-cyan-300/80"], .theme-contrast .allo-docsuite .border-cyan-400, .theme-contrast .allo-docsuite .border-cyan-500, .theme-contrast .allo-docsuite [class~="border-cyan-500/30"], .theme-contrast .allo-docsuite .border-cyan-600, .theme-contrast .allo-docsuite .border-cyan-700, .theme-contrast .allo-docsuite .border-emerald-100, .theme-contrast .allo-docsuite [class~="border-emerald-100/50"], .theme-contrast .allo-docsuite .border-emerald-200, .theme-contrast .allo-docsuite [class~="border-emerald-200/60"], .theme-contrast .allo-docsuite .border-emerald-300, .theme-contrast .allo-docsuite [class~="border-emerald-300/30"], .theme-contrast .allo-docsuite [class~="border-emerald-300/40"], .theme-contrast .allo-docsuite [class~="border-emerald-300/60"], .theme-contrast .allo-docsuite .border-emerald-400, .theme-contrast .allo-docsuite [class~="border-emerald-400/40"], .theme-contrast .allo-docsuite .border-emerald-500, .theme-contrast .allo-docsuite [class~="border-emerald-500/30"], .theme-contrast .allo-docsuite [class~="border-emerald-500/40"], .theme-contrast .allo-docsuite [class~="border-emerald-500/50"], .theme-contrast .allo-docsuite .border-emerald-600, .theme-contrast .allo-docsuite .border-emerald-700, .theme-contrast .allo-docsuite .border-fuchsia-200, .theme-contrast .allo-docsuite .border-fuchsia-300, .theme-contrast .allo-docsuite .border-fuchsia-400, .theme-contrast .allo-docsuite [class~="border-fuchsia-500/20"], .theme-contrast .allo-docsuite [class~="border-fuchsia-500/30"], .theme-contrast .allo-docsuite [class~="border-fuchsia-500/40"], .theme-contrast .allo-docsuite [class~="border-fuchsia-500/50"], .theme-contrast .allo-docsuite .border-fuchsia-600, .theme-contrast .allo-docsuite .border-fuchsia-700, .theme-contrast .allo-docsuite .border-green-100, .theme-contrast .allo-docsuite .border-green-200, .theme-contrast .allo-docsuite .border-green-300, .theme-contrast .allo-docsuite .border-green-400, .theme-contrast .allo-docsuite .border-green-500, .theme-contrast .allo-docsuite .border-green-600, .theme-contrast .allo-docsuite .border-indigo-100, .theme-contrast .allo-docsuite [class~="border-indigo-100/50"], .theme-contrast .allo-docsuite .border-indigo-200, .theme-contrast .allo-docsuite [class~="border-indigo-200/50"], .theme-contrast .allo-docsuite [class~="border-indigo-200/60"], .theme-contrast .allo-docsuite [class~="border-indigo-200/70"], .theme-contrast .allo-docsuite .border-indigo-300, .theme-contrast .allo-docsuite [class~="border-indigo-300/30"], .theme-contrast .allo-docsuite .border-indigo-400, .theme-contrast .allo-docsuite [class~="border-indigo-400/30"], .theme-contrast .allo-docsuite [class~="border-indigo-400/40"], .theme-contrast .allo-docsuite .border-indigo-50, .theme-contrast .allo-docsuite .border-indigo-500, .theme-contrast .allo-docsuite [class~="border-indigo-500/20"], .theme-contrast .allo-docsuite [class~="border-indigo-500/30"], .theme-contrast .allo-docsuite [class~="border-indigo-500/40"], .theme-contrast .allo-docsuite [class~="border-indigo-500/50"], .theme-contrast .allo-docsuite .border-indigo-600, .theme-contrast .allo-docsuite [class~="border-indigo-600/60"], .theme-contrast .allo-docsuite .border-indigo-700, .theme-contrast .allo-docsuite .border-indigo-800, .theme-contrast .allo-docsuite .border-indigo-900, .theme-contrast .allo-docsuite [class~="border-indigo-900/20"], .theme-contrast .allo-docsuite .border-lime-200, .theme-contrast .allo-docsuite .border-lime-300, .theme-contrast .allo-docsuite [class~="border-lime-500/30"], .theme-contrast .allo-docsuite .border-orange-100, .theme-contrast .allo-docsuite .border-orange-200, .theme-contrast .allo-docsuite .border-orange-300, .theme-contrast .allo-docsuite [class~="border-orange-300/30"], .theme-contrast .allo-docsuite .border-orange-400, .theme-contrast .allo-docsuite .border-orange-500, .theme-contrast .allo-docsuite .border-orange-600, .theme-contrast .allo-docsuite .border-pink-200, .theme-contrast .allo-docsuite .border-pink-300, .theme-contrast .allo-docsuite .border-pink-400, .theme-contrast .allo-docsuite .border-pink-500, .theme-contrast .allo-docsuite [class~="border-pink-500/30"], .theme-contrast .allo-docsuite .border-pink-600, .theme-contrast .allo-docsuite .border-purple-100, .theme-contrast .allo-docsuite .border-purple-200, .theme-contrast .allo-docsuite .border-purple-300, .theme-contrast .allo-docsuite .border-purple-400, .theme-contrast .allo-docsuite .border-purple-500, .theme-contrast .allo-docsuite [class~="border-purple-500/30"], .theme-contrast .allo-docsuite [class~="border-purple-500/40"], .theme-contrast .allo-docsuite .border-purple-600, .theme-contrast .allo-docsuite [class~="border-purple-700/50"], .theme-contrast .allo-docsuite .border-red-100, .theme-contrast .allo-docsuite .border-red-200, .theme-contrast .allo-docsuite [class~="border-red-200/60"], .theme-contrast .allo-docsuite .border-red-300, .theme-contrast .allo-docsuite .border-red-400, .theme-contrast .allo-docsuite .border-red-500, .theme-contrast .allo-docsuite .border-red-600, .theme-contrast .allo-docsuite [class~="border-red-600/50"], .theme-contrast .allo-docsuite .border-red-700, .theme-contrast .allo-docsuite [class~="border-red-700/60"], .theme-contrast .allo-docsuite .border-rose-100, .theme-contrast .allo-docsuite .border-rose-200, .theme-contrast .allo-docsuite .border-rose-300, .theme-contrast .allo-docsuite .border-rose-400, .theme-contrast .allo-docsuite .border-rose-500, .theme-contrast .allo-docsuite [class~="border-rose-500/30"], .theme-contrast .allo-docsuite [class~="border-rose-500/40"], .theme-contrast .allo-docsuite [class~="border-rose-500/50"], .theme-contrast .allo-docsuite .border-rose-600, .theme-contrast .allo-docsuite .border-rose-700, .theme-contrast .allo-docsuite .border-sky-100, .theme-contrast .allo-docsuite .border-sky-200, .theme-contrast .allo-docsuite [class~="border-sky-200/60"], .theme-contrast .allo-docsuite .border-sky-300, .theme-contrast .allo-docsuite [class~="border-sky-300/30"], .theme-contrast .allo-docsuite .border-sky-500, .theme-contrast .allo-docsuite [class~="border-sky-500/30"], .theme-contrast .allo-docsuite [class~="border-sky-500/40"], .theme-contrast .allo-docsuite .border-sky-600, .theme-contrast .allo-docsuite .border-sky-700, .theme-contrast .allo-docsuite .border-slate-100, .theme-contrast .allo-docsuite .border-slate-200, .theme-contrast .allo-docsuite [class~="border-slate-200/80"], .theme-contrast .allo-docsuite [class~="border-slate-200/90"], .theme-contrast .allo-docsuite .border-slate-300, .theme-contrast .allo-docsuite .border-slate-400, .theme-contrast .allo-docsuite .border-slate-50, .theme-contrast .allo-docsuite .border-slate-500, .theme-contrast .allo-docsuite [class~="border-slate-500/30"], .theme-contrast .allo-docsuite [class~="border-slate-500/40"], .theme-contrast .allo-docsuite .border-slate-600, .theme-contrast .allo-docsuite .border-slate-700, .theme-contrast .allo-docsuite [class~="border-slate-700/50"], .theme-contrast .allo-docsuite .border-slate-800, .theme-contrast .allo-docsuite .border-slate-900, .theme-contrast .allo-docsuite .border-stone-300, .theme-contrast .allo-docsuite .border-stone-500, .theme-contrast .allo-docsuite [class~="border-stone-500/20"], .theme-contrast .allo-docsuite [class~="border-stone-500/30"], .theme-contrast .allo-docsuite [class~="border-stone-500/40"], .theme-contrast .allo-docsuite .border-stone-700, .theme-contrast .allo-docsuite .border-teal-100, .theme-contrast .allo-docsuite [class~="border-teal-100/50"], .theme-contrast .allo-docsuite .border-teal-200, .theme-contrast .allo-docsuite .border-teal-300, .theme-contrast .allo-docsuite [class~="border-teal-300/40"], .theme-contrast .allo-docsuite .border-teal-400, .theme-contrast .allo-docsuite .border-teal-500, .theme-contrast .allo-docsuite [class~="border-teal-500/30"], .theme-contrast .allo-docsuite [class~="border-teal-500/40"], .theme-contrast .allo-docsuite .border-teal-600, .theme-contrast .allo-docsuite .border-teal-700, .theme-contrast .allo-docsuite .border-teal-900, .theme-contrast .allo-docsuite .border-violet-100, .theme-contrast .allo-docsuite .border-violet-200, .theme-contrast .allo-docsuite .border-violet-300, .theme-contrast .allo-docsuite .border-violet-400, .theme-contrast .allo-docsuite .border-violet-50, .theme-contrast .allo-docsuite .border-violet-500, .theme-contrast .allo-docsuite [class~="border-violet-500/30"], .theme-contrast .allo-docsuite .border-violet-600, .theme-contrast .allo-docsuite .border-violet-700, .theme-contrast .allo-docsuite .border-violet-800, .theme-contrast .allo-docsuite .border-white, .theme-contrast .allo-docsuite [class~="border-white/10"], .theme-contrast .allo-docsuite [class~="border-white/15"], .theme-contrast .allo-docsuite [class~="border-white/20"], .theme-contrast .allo-docsuite [class~="border-white/25"], .theme-contrast .allo-docsuite [class~="border-white/30"], .theme-contrast .allo-docsuite [class~="border-white/40"], .theme-contrast .allo-docsuite [class~="border-white/50"], .theme-contrast .allo-docsuite [class~="border-white/90"], .theme-contrast .allo-docsuite .border-yellow-100, .theme-contrast .allo-docsuite .border-yellow-200, .theme-contrast .allo-docsuite [class~="border-yellow-200/50"], .theme-contrast .allo-docsuite .border-yellow-300, .theme-contrast .allo-docsuite .border-yellow-400, .theme-contrast .allo-docsuite [class~="border-yellow-400/30"], .theme-contrast .allo-docsuite .border-yellow-500, .theme-contrast .allo-docsuite [class~="border-yellow-500/60"], .theme-contrast .allo-docsuite .border-yellow-600, .theme-contrast .allo-docsuite [class~="border-zinc-500/30"], .theme-contrast .allo-docsuite .divide-slate-100 > * + *, .theme-contrast .allo-docsuite .divide-slate-200 > * + *, .theme-contrast .allo-docsuite .divide-slate-700 > * + *, .theme-contrast .allo-docsuite .divide-violet-100 > * + *, .theme-contrast .allo-docsuite .divide-white > * + * { border-color:#ffff00 !important; }
.theme-contrast .allo-docsuite .text-amber-100, .theme-contrast .allo-docsuite [class~="text-amber-100/70"], .theme-contrast .allo-docsuite [class~="text-amber-100/80"], .theme-contrast .allo-docsuite .text-amber-200, .theme-contrast .allo-docsuite [class~="text-amber-200/50"], .theme-contrast .allo-docsuite [class~="text-amber-200/80"], .theme-contrast .allo-docsuite .text-amber-300, .theme-contrast .allo-docsuite [class~="text-amber-300/60"], .theme-contrast .allo-docsuite [class~="text-amber-300/70"], .theme-contrast .allo-docsuite .text-amber-400, .theme-contrast .allo-docsuite [class~="text-amber-400/70"], .theme-contrast .allo-docsuite .text-amber-50, .theme-contrast .allo-docsuite .text-amber-500, .theme-contrast .allo-docsuite .text-amber-600, .theme-contrast .allo-docsuite .text-amber-700, .theme-contrast .allo-docsuite [class~="text-amber-700/90"], .theme-contrast .allo-docsuite .text-amber-800, .theme-contrast .allo-docsuite .text-amber-900, .theme-contrast .allo-docsuite .text-amber-950, .theme-contrast .allo-docsuite .text-black, .theme-contrast .allo-docsuite [class~="text-black/10"], .theme-contrast .allo-docsuite [class~="text-black/20"], .theme-contrast .allo-docsuite .text-blue-100, .theme-contrast .allo-docsuite .text-blue-200, .theme-contrast .allo-docsuite .text-blue-300, .theme-contrast .allo-docsuite .text-blue-400, .theme-contrast .allo-docsuite .text-blue-50, .theme-contrast .allo-docsuite .text-blue-500, .theme-contrast .allo-docsuite .text-blue-600, .theme-contrast .allo-docsuite .text-blue-700, .theme-contrast .allo-docsuite .text-blue-800, .theme-contrast .allo-docsuite [class~="text-blue-800/80"], .theme-contrast .allo-docsuite .text-blue-900, .theme-contrast .allo-docsuite .text-blue-950, .theme-contrast .allo-docsuite .text-cyan-100, .theme-contrast .allo-docsuite .text-cyan-200, .theme-contrast .allo-docsuite .text-cyan-300, .theme-contrast .allo-docsuite .text-cyan-500, .theme-contrast .allo-docsuite .text-cyan-600, .theme-contrast .allo-docsuite [class~="text-cyan-600/60"], .theme-contrast .allo-docsuite .text-cyan-700, .theme-contrast .allo-docsuite .text-cyan-800, .theme-contrast .allo-docsuite .text-cyan-900, .theme-contrast .allo-docsuite [class~="text-cyan-900/80"], .theme-contrast .allo-docsuite .text-cyan-950, .theme-contrast .allo-docsuite .text-emerald-100, .theme-contrast .allo-docsuite .text-emerald-200, .theme-contrast .allo-docsuite .text-emerald-300, .theme-contrast .allo-docsuite .text-emerald-500, .theme-contrast .allo-docsuite .text-emerald-600, .theme-contrast .allo-docsuite [class~="text-emerald-600/70"], .theme-contrast .allo-docsuite .text-emerald-700, .theme-contrast .allo-docsuite [class~="text-emerald-700/70"], .theme-contrast .allo-docsuite .text-emerald-800, .theme-contrast .allo-docsuite .text-emerald-900, .theme-contrast .allo-docsuite [class~="text-emerald-900/90"], .theme-contrast .allo-docsuite .text-emerald-950, .theme-contrast .allo-docsuite .text-fuchsia-100, .theme-contrast .allo-docsuite .text-fuchsia-200, .theme-contrast .allo-docsuite .text-fuchsia-300, .theme-contrast .allo-docsuite [class~="text-fuchsia-300/70"], .theme-contrast .allo-docsuite .text-fuchsia-400, .theme-contrast .allo-docsuite .text-fuchsia-500, .theme-contrast .allo-docsuite .text-fuchsia-600, .theme-contrast .allo-docsuite .text-fuchsia-700, .theme-contrast .allo-docsuite .text-fuchsia-800, .theme-contrast .allo-docsuite .text-fuchsia-900, .theme-contrast .allo-docsuite .text-fuchsia-950, .theme-contrast .allo-docsuite .text-gray-600, .theme-contrast .allo-docsuite .text-green-200, .theme-contrast .allo-docsuite .text-green-400, .theme-contrast .allo-docsuite .text-green-500, .theme-contrast .allo-docsuite .text-green-600, .theme-contrast .allo-docsuite .text-green-700, .theme-contrast .allo-docsuite [class~="text-green-700/70"], .theme-contrast .allo-docsuite .text-green-800, .theme-contrast .allo-docsuite .text-green-900, .theme-contrast .allo-docsuite .text-green-950, .theme-contrast .allo-docsuite .text-indigo-100, .theme-contrast .allo-docsuite [class~="text-indigo-100/70"], .theme-contrast .allo-docsuite .text-indigo-200, .theme-contrast .allo-docsuite .text-indigo-300, .theme-contrast .allo-docsuite .text-indigo-400, .theme-contrast .allo-docsuite .text-indigo-500, .theme-contrast .allo-docsuite .text-indigo-600, .theme-contrast .allo-docsuite [class~="text-indigo-600/80"], .theme-contrast .allo-docsuite .text-indigo-700, .theme-contrast .allo-docsuite [class~="text-indigo-700/80"], .theme-contrast .allo-docsuite .text-indigo-800, .theme-contrast .allo-docsuite .text-indigo-900, .theme-contrast .allo-docsuite [class~="text-indigo-900/80"], .theme-contrast .allo-docsuite .text-indigo-950, .theme-contrast .allo-docsuite .text-lime-300, .theme-contrast .allo-docsuite .text-lime-900, .theme-contrast .allo-docsuite .text-orange-100, .theme-contrast .allo-docsuite .text-orange-300, .theme-contrast .allo-docsuite .text-orange-400, .theme-contrast .allo-docsuite .text-orange-500, .theme-contrast .allo-docsuite .text-orange-600, .theme-contrast .allo-docsuite .text-orange-700, .theme-contrast .allo-docsuite .text-orange-800, .theme-contrast .allo-docsuite .text-orange-900, .theme-contrast .allo-docsuite .text-pink-200, .theme-contrast .allo-docsuite .text-pink-300, .theme-contrast .allo-docsuite .text-pink-600, .theme-contrast .allo-docsuite .text-pink-700, .theme-contrast .allo-docsuite .text-pink-800, .theme-contrast .allo-docsuite .text-pink-900, .theme-contrast .allo-docsuite .text-purple-200, .theme-contrast .allo-docsuite .text-purple-300, .theme-contrast .allo-docsuite .text-purple-400, .theme-contrast .allo-docsuite .text-purple-500, .theme-contrast .allo-docsuite .text-purple-600, .theme-contrast .allo-docsuite .text-purple-700, .theme-contrast .allo-docsuite .text-purple-800, .theme-contrast .allo-docsuite .text-purple-900, .theme-contrast .allo-docsuite .text-purple-950, .theme-contrast .allo-docsuite .text-red-200, .theme-contrast .allo-docsuite .text-red-300, .theme-contrast .allo-docsuite .text-red-400, .theme-contrast .allo-docsuite .text-red-500, .theme-contrast .allo-docsuite .text-red-600, .theme-contrast .allo-docsuite .text-red-700, .theme-contrast .allo-docsuite [class~="text-red-700/70"], .theme-contrast .allo-docsuite [class~="text-red-700/80"], .theme-contrast .allo-docsuite .text-red-800, .theme-contrast .allo-docsuite .text-red-900, .theme-contrast .allo-docsuite .text-red-950, .theme-contrast .allo-docsuite .text-rose-100, .theme-contrast .allo-docsuite .text-rose-200, .theme-contrast .allo-docsuite .text-rose-300, .theme-contrast .allo-docsuite .text-rose-400, .theme-contrast .allo-docsuite .text-rose-500, .theme-contrast .allo-docsuite .text-rose-600, .theme-contrast .allo-docsuite .text-rose-700, .theme-contrast .allo-docsuite .text-rose-800, .theme-contrast .allo-docsuite .text-rose-900, .theme-contrast .allo-docsuite .text-sky-100, .theme-contrast .allo-docsuite .text-sky-200, .theme-contrast .allo-docsuite .text-sky-300, .theme-contrast .allo-docsuite .text-sky-400, .theme-contrast .allo-docsuite .text-sky-500, .theme-contrast .allo-docsuite .text-sky-600, .theme-contrast .allo-docsuite .text-sky-700, .theme-contrast .allo-docsuite .text-sky-800, .theme-contrast .allo-docsuite .text-sky-900, .theme-contrast .allo-docsuite .text-sky-950, .theme-contrast .allo-docsuite .text-slate-100, .theme-contrast .allo-docsuite .text-slate-200, .theme-contrast .allo-docsuite .text-slate-300, .theme-contrast .allo-docsuite [class~="text-slate-300/60"], .theme-contrast .allo-docsuite .text-slate-400, .theme-contrast .allo-docsuite .text-slate-500, .theme-contrast .allo-docsuite .text-slate-600, .theme-contrast .allo-docsuite [class~="text-slate-600/50"], .theme-contrast .allo-docsuite .text-slate-700, .theme-contrast .allo-docsuite .text-slate-800, .theme-contrast .allo-docsuite .text-slate-900, .theme-contrast .allo-docsuite [class~="text-slate-900/95"], .theme-contrast .allo-docsuite .text-slate-950, .theme-contrast .allo-docsuite .text-stone-100, .theme-contrast .allo-docsuite .text-stone-300, .theme-contrast .allo-docsuite .text-stone-700, .theme-contrast .allo-docsuite .text-teal-100, .theme-contrast .allo-docsuite .text-teal-200, .theme-contrast .allo-docsuite .text-teal-300, .theme-contrast .allo-docsuite .text-teal-400, .theme-contrast .allo-docsuite .text-teal-50, .theme-contrast .allo-docsuite .text-teal-500, .theme-contrast .allo-docsuite [class~="text-teal-500/70"], .theme-contrast .allo-docsuite .text-teal-600, .theme-contrast .allo-docsuite [class~="text-teal-600/60"], .theme-contrast .allo-docsuite .text-teal-700, .theme-contrast .allo-docsuite .text-teal-800, .theme-contrast .allo-docsuite .text-teal-900, .theme-contrast .allo-docsuite .text-teal-950, .theme-contrast .allo-docsuite .text-violet-100, .theme-contrast .allo-docsuite .text-violet-200, .theme-contrast .allo-docsuite .text-violet-300, .theme-contrast .allo-docsuite .text-violet-400, .theme-contrast .allo-docsuite .text-violet-500, .theme-contrast .allo-docsuite .text-violet-600, .theme-contrast .allo-docsuite .text-violet-700, .theme-contrast .allo-docsuite [class~="text-violet-700/70"], .theme-contrast .allo-docsuite .text-violet-800, .theme-contrast .allo-docsuite .text-violet-900, .theme-contrast .allo-docsuite .text-violet-950, .theme-contrast .allo-docsuite .text-white, .theme-contrast .allo-docsuite [class~="text-white/20"], .theme-contrast .allo-docsuite [class~="text-white/50"], .theme-contrast .allo-docsuite [class~="text-white/60"], .theme-contrast .allo-docsuite [class~="text-white/70"], .theme-contrast .allo-docsuite [class~="text-white/80"], .theme-contrast .allo-docsuite [class~="text-white/85"], .theme-contrast .allo-docsuite [class~="text-white/90"], .theme-contrast .allo-docsuite .text-yellow-100, .theme-contrast .allo-docsuite .text-yellow-200, .theme-contrast .allo-docsuite .text-yellow-300, .theme-contrast .allo-docsuite [class~="text-yellow-300/50"], .theme-contrast .allo-docsuite .text-yellow-400, .theme-contrast .allo-docsuite .text-yellow-500, .theme-contrast .allo-docsuite .text-yellow-600, .theme-contrast .allo-docsuite [class~="text-yellow-600/70"], .theme-contrast .allo-docsuite .text-yellow-700, .theme-contrast .allo-docsuite .text-yellow-800, .theme-contrast .allo-docsuite .text-yellow-900, .theme-contrast .allo-docsuite .text-zinc-200, .theme-contrast .allo-docsuite .text-zinc-300 { color:#ffff00 !important; }
/* ── state variants (v3) ── */
.theme-dark .allo-docsuite [class~="focus-visible:ring-sky-500/20"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:ring-sky-400"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-sky-500/20"]:focus { --tw-ring-color:#0369a1 !important; }
.theme-dark .allo-docsuite [class~="focus-visible:ring-emerald-200"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-emerald-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-emerald-600"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:ring-emerald-200"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-emerald-300"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-emerald-400"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-emerald-500"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-emerald-500/20"]:focus, .theme-dark .allo-docsuite [class~="hover:ring-emerald-400"]:hover { --tw-ring-color:#047857 !important; }
.theme-dark .allo-docsuite [class~="focus-visible:ring-cyan-500/20"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:ring-cyan-200"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-cyan-300"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-cyan-400"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-cyan-500"]:focus { --tw-ring-color:#0e7490 !important; }
.theme-dark .allo-docsuite [class~="focus-visible:ring-teal-400"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-teal-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-teal-500/20"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:ring-teal-200"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-teal-300"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-teal-500"]:focus { --tw-ring-color:#0f766e !important; }
.theme-dark .allo-docsuite [class~="focus:ring-green-300"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-green-400"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-green-500"]:focus { --tw-ring-color:#15803d !important; }
.theme-dark .allo-docsuite [class~="focus-visible:ring-blue-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-blue-500/20"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-blue-600"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:ring-blue-200"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-blue-400"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-blue-500"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-blue-500/20"]:focus { --tw-ring-color:#1d4ed8 !important; }
.theme-dark .allo-docsuite [class~="focus-visible:ring-indigo-300"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-indigo-400"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-indigo-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-indigo-500/20"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-indigo-500/25"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-indigo-600"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:ring-indigo-100"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-indigo-200"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-indigo-300"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-indigo-400"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-indigo-500"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-indigo-500/20"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-indigo-500/30"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-indigo-600"]:focus { --tw-ring-color:#4338ca !important; }
.theme-dark .allo-docsuite [class~="focus-visible:ring-slate-300"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-slate-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-slate-600"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-slate-700"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:ring-slate-200"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-slate-400"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-slate-500"]:focus { --tw-ring-color:#475569 !important; }
.theme-dark .allo-docsuite [class~="focus-visible:ring-violet-500/20"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-violet-600"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:ring-violet-200"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-violet-300"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-violet-400"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-violet-500"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-violet-500/20"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-violet-600"]:focus { --tw-ring-color:#6d28d9 !important; }
.theme-dark .allo-docsuite [class~="focus-visible:ring-purple-400"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-purple-600"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:ring-purple-300"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-purple-400"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-purple-500"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-purple-500/30"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-purple-600"]:focus { --tw-ring-color:#7e22ce !important; }
.theme-dark .allo-docsuite [class~="focus-visible:ring-yellow-300"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-yellow-400"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-yellow-600"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:ring-yellow-100"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-yellow-400"]:focus { --tw-ring-color:#a16207 !important; }
.theme-dark .allo-docsuite [class~="focus:ring-fuchsia-400"]:focus { --tw-ring-color:#a21caf !important; }
.theme-dark .allo-docsuite [class~="focus-visible:ring-amber-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-amber-500/20"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-amber-600"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:ring-amber-300"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-amber-400"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-amber-500"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-amber-500/20"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-amber-500/40"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-amber-600"]:focus, .theme-dark .allo-docsuite [class~="hover:ring-amber-500"]:hover { --tw-ring-color:#b45309 !important; }
.theme-dark .allo-docsuite [class~="focus:ring-red-300"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-red-400"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-red-500"]:focus { --tw-ring-color:#b91c1c !important; }
.theme-dark .allo-docsuite [class~="focus-visible:ring-rose-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-rose-500/20"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-rose-600"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:ring-rose-200"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-rose-300"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-rose-400"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-rose-500"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-rose-600"]:focus, .theme-dark .allo-docsuite [class~="hover:ring-rose-400"]:hover, .theme-dark .allo-docsuite [class~="hover:ring-rose-500"]:hover { --tw-ring-color:#be123c !important; }
.theme-dark .allo-docsuite [class~="focus:ring-pink-200"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-pink-500"]:focus { --tw-ring-color:#be185d !important; }
.theme-dark .allo-docsuite [class~="focus-visible:ring-orange-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:ring-orange-500/20"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:ring-orange-300"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-orange-400"]:focus, .theme-dark .allo-docsuite [class~="focus:ring-orange-500"]:focus { --tw-ring-color:#c2410c !important; }
.theme-dark .allo-docsuite [class~="hover:bg-emerald-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-emerald-200"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-emerald-300"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-emerald-50"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-emerald-50/60"]:hover { background-color:#022c22 !important; }
.theme-dark .allo-docsuite [class~="hover:bg-teal-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-teal-200"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-teal-50"]:hover { background-color:#042f2e !important; }
.theme-dark .allo-docsuite .group:hover [class~="group-hover:bg-green-300"], .theme-dark .allo-docsuite [class~="hover:bg-green-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-green-200"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-green-300"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-green-50"]:hover { background-color:#052e16 !important; }
.theme-dark .allo-docsuite [class~="hover:bg-sky-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-sky-200"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-sky-50"]:hover { background-color:#082f49 !important; }
.theme-dark .allo-docsuite [class~="hover:bg-cyan-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-cyan-200"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-cyan-50"]:hover { background-color:#083344 !important; }
.theme-dark .allo-docsuite [class~="disabled:bg-slate-50"]:disabled, .theme-dark .allo-docsuite [class~="focus-visible:bg-slate-50"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-within:bg-slate-50"]:focus-within, .theme-dark .allo-docsuite [class~="focus:bg-slate-50"]:focus, .theme-dark .allo-docsuite [class~="hover:bg-slate-50"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-slate-50/70"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-stone-50"]:hover { background-color:#0f172a !important; }
.theme-dark .allo-docsuite .group:hover [class~="group-hover:bg-blue-300"], .theme-dark .allo-docsuite [class~="hover:bg-blue-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-blue-200"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-blue-300"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-blue-50"]:hover { background-color:#172554 !important; }
.theme-dark .allo-docsuite [class~="active:bg-indigo-100"]:active, .theme-dark .allo-docsuite [class~="focus-visible:bg-indigo-50/60"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:bg-indigo-100"]:focus, .theme-dark .allo-docsuite [class~="focus:bg-indigo-300"]:focus, .theme-dark .allo-docsuite [class~="focus:bg-indigo-50"]:focus, .theme-dark .allo-docsuite [class~="hover:bg-indigo-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-indigo-100/20"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-indigo-100/60"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-indigo-200"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-indigo-300"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-indigo-50"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-indigo-50/30"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-indigo-50/40"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-indigo-50/50"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-indigo-50/60"]:hover { background-color:#1e1b4b !important; }
.theme-dark .allo-docsuite [class~="disabled:bg-slate-100"]:disabled, .theme-dark .allo-docsuite [class~="disabled:hover:bg-white"]:disabled:hover, .theme-dark .allo-docsuite [class~="focus:bg-slate-100"]:focus, .theme-dark .allo-docsuite [class~="focus:bg-white"]:focus, .theme-dark .allo-docsuite .group:hover [class~="group-hover:bg-white"], .theme-dark .allo-docsuite [class~="hover:bg-slate-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-white"]:hover { background-color:#1e293b !important; }
.theme-dark .allo-docsuite [class~="disabled:bg-slate-200"]:disabled, .theme-dark .allo-docsuite [class~="hover:bg-slate-200"]:hover { background-color:#26334a !important; }
.theme-dark .allo-docsuite [class~="hover:bg-violet-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-violet-200"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-violet-50"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-violet-50/40"]:hover { background-color:#2e1065 !important; }
.theme-dark .allo-docsuite [class~="disabled:bg-slate-300"]:disabled, .theme-dark .allo-docsuite [class~="hover:bg-slate-300"]:hover { background-color:#334155 !important; }
.theme-dark .allo-docsuite [class~="disabled:bg-purple-100"]:disabled, .theme-dark .allo-docsuite [class~="hover:bg-purple-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-purple-100/20"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-purple-200"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-purple-300"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-purple-50"]:hover { background-color:#3b0764 !important; }
.theme-dark .allo-docsuite [class~="focus:bg-yellow-200"]:focus, .theme-dark .allo-docsuite [class~="hover:bg-yellow-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-yellow-200"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-yellow-300"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-yellow-50"]:hover { background-color:#422006 !important; }
.theme-dark .allo-docsuite [class~="hover:bg-orange-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-orange-200"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-orange-50"]:hover { background-color:#431407 !important; }
.theme-dark .allo-docsuite [class~="hover:bg-red-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-red-200"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-red-300"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-red-50"]:hover { background-color:#450a0a !important; }
.theme-dark .allo-docsuite [class~="hover:bg-amber-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-amber-100/50"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-amber-200"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-amber-200/50"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-amber-300"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-amber-300/50"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-amber-50"]:hover { background-color:#451a03 !important; }
.theme-dark .allo-docsuite [class~="hover:bg-fuchsia-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-fuchsia-50"]:hover { background-color:#4a044e !important; }
.theme-dark .allo-docsuite [class~="hover:bg-rose-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-rose-200"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-rose-300"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-rose-50"]:hover { background-color:#4c0519 !important; }
.theme-dark .allo-docsuite [class~="hover:bg-pink-100"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-pink-200"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-pink-50"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-pink-50/60"]:hover { background-color:#500724 !important; }
.theme-dark .allo-docsuite [class~="hover:bg-white/10"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-white/15"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-white/20"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-white/30"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-white/60"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-white/70"]:hover, .theme-dark .allo-docsuite [class~="hover:bg-white/80"]:hover { background-color:rgba(30,41,59,0.85) !important; }
.theme-dark .allo-docsuite [class~="hover:from-blue-100"]:hover { background-image:none !important;background-color:#172554 !important; }
.theme-dark .allo-docsuite .group:hover [class~="group-hover:from-indigo-200"], .theme-dark .allo-docsuite .group:hover [class~="group-hover:to-indigo-300"], .theme-dark .allo-docsuite [class~="hover:to-indigo-100"]:hover { background-image:none !important;background-color:#1e1b4b !important; }
.theme-dark .allo-docsuite [class~="hover:to-orange-100"]:hover { background-image:none !important;background-color:#431407 !important; }
.theme-dark .allo-docsuite [class~="hover:from-amber-100"]:hover { background-image:none !important;background-color:#451a03 !important; }
.theme-dark .allo-docsuite [class~="hover:from-rose-100"]:hover { background-image:none !important;background-color:#4c0519 !important; }
.theme-dark .allo-docsuite [class~="focus-visible:border-sky-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:border-sky-500"]:focus, .theme-dark .allo-docsuite [class~="focus:border-sky-600"]:focus { border-color:#0369a1 !important; }
.theme-dark .allo-docsuite [class~="focus:border-emerald-500"]:focus, .theme-dark .allo-docsuite [class~="focus:border-emerald-600"]:focus, .theme-dark .allo-docsuite [class~="hover:border-emerald-400"]:hover, .theme-dark .allo-docsuite [class~="hover:border-emerald-500"]:hover, .theme-dark .allo-docsuite [class~="hover:border-emerald-600"]:hover { border-color:#047857 !important; }
.theme-dark .allo-docsuite [class~="hover:border-emerald-200"]:hover, .theme-dark .allo-docsuite [class~="hover:border-emerald-300"]:hover { border-color:#065f46 !important; }
.theme-dark .allo-docsuite [class~="hover:border-sky-200"]:hover, .theme-dark .allo-docsuite [class~="hover:border-sky-300"]:hover { border-color:#075985 !important; }
.theme-dark .allo-docsuite [class~="focus-visible:border-cyan-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:border-cyan-400"]:focus, .theme-dark .allo-docsuite [class~="hover:border-cyan-400"]:hover, .theme-dark .allo-docsuite [class~="hover:border-cyan-600"]:hover { border-color:#0e7490 !important; }
.theme-dark .allo-docsuite [class~="focus-visible:border-teal-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:border-teal-400"]:focus, .theme-dark .allo-docsuite [class~="hover:border-teal-500"]:hover, .theme-dark .allo-docsuite [class~="hover:border-teal-600"]:hover { border-color:#0f766e !important; }
.theme-dark .allo-docsuite [class~="hover:border-teal-200"]:hover, .theme-dark .allo-docsuite [class~="hover:border-teal-300"]:hover { border-color:#115e59 !important; }
.theme-dark .allo-docsuite [class~="hover:border-cyan-200"]:hover, .theme-dark .allo-docsuite [class~="hover:border-cyan-300"]:hover { border-color:#155e75 !important; }
.theme-dark .allo-docsuite [class~="focus:border-green-500"]:focus, .theme-dark .allo-docsuite [class~="hover:border-green-400"]:hover { border-color:#15803d !important; }
.theme-dark .allo-docsuite [class~="hover:border-green-300"]:hover { border-color:#166534 !important; }
.theme-dark .allo-docsuite [class~="focus-visible:border-blue-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:border-blue-500"]:focus, .theme-dark .allo-docsuite [class~="hover:border-blue-600"]:hover { border-color:#1d4ed8 !important; }
.theme-dark .allo-docsuite [class~="hover:border-blue-200"]:hover, .theme-dark .allo-docsuite [class~="hover:border-blue-300"]:hover { border-color:#1e40af !important; }
.theme-dark .allo-docsuite [class~="disabled:border-slate-200"]:disabled, .theme-dark .allo-docsuite [class~="focus:border-white"]:focus, .theme-dark .allo-docsuite [class~="hover:border-slate-100"]:hover, .theme-dark .allo-docsuite [class~="hover:border-slate-200"]:hover, .theme-dark .allo-docsuite [class~="hover:border-white"]:hover, .theme-dark .allo-docsuite [class~="hover:border-white/30"]:hover { border-color:#334155 !important; }
.theme-dark .allo-docsuite [class~="focus:border-indigo-200"]:focus, .theme-dark .allo-docsuite [class~="focus:border-indigo-300"]:focus, .theme-dark .allo-docsuite [class~="hover:border-indigo-100"]:hover, .theme-dark .allo-docsuite [class~="hover:border-indigo-200"]:hover, .theme-dark .allo-docsuite [class~="hover:border-indigo-300"]:hover { border-color:#3730a3 !important; }
.theme-dark .allo-docsuite [class~="hover:border-lime-300"]:hover { border-color:#3f6212 !important; }
.theme-dark .allo-docsuite [class~="focus-visible:border-indigo-400"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:border-indigo-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus-visible:border-indigo-600"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:border-indigo-400"]:focus, .theme-dark .allo-docsuite [class~="focus:border-indigo-500"]:focus, .theme-dark .allo-docsuite [class~="focus:border-indigo-600"]:focus, .theme-dark .allo-docsuite .group:hover [class~="group-hover:border-indigo-400"], .theme-dark .allo-docsuite [class~="hover:border-indigo-400"]:hover, .theme-dark .allo-docsuite [class~="hover:border-indigo-500"]:hover, .theme-dark .allo-docsuite [class~="hover:border-indigo-600"]:hover { border-color:#4338ca !important; }
.theme-dark .allo-docsuite [class~="focus:border-slate-400"]:focus, .theme-dark .allo-docsuite [class~="hover:border-slate-300"]:hover, .theme-dark .allo-docsuite [class~="hover:border-slate-400"]:hover { border-color:#475569 !important; }
.theme-dark .allo-docsuite [class~="hover:border-violet-200"]:hover, .theme-dark .allo-docsuite [class~="hover:border-violet-300"]:hover { border-color:#5b21b6 !important; }
.theme-dark .allo-docsuite [class~="hover:border-purple-200"]:hover, .theme-dark .allo-docsuite [class~="hover:border-purple-300"]:hover { border-color:#6b21a8 !important; }
.theme-dark .allo-docsuite [class~="focus-visible:border-violet-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:border-violet-400"]:focus, .theme-dark .allo-docsuite [class~="focus:border-violet-500"]:focus, .theme-dark .allo-docsuite [class~="hover:border-violet-400"]:hover, .theme-dark .allo-docsuite [class~="hover:border-violet-500"]:hover, .theme-dark .allo-docsuite [class~="hover:border-violet-600"]:hover { border-color:#6d28d9 !important; }
.theme-dark .allo-docsuite [class~="focus:border-purple-500"]:focus, .theme-dark .allo-docsuite [class~="hover:border-purple-400"]:hover { border-color:#7e22ce !important; }
.theme-dark .allo-docsuite [class~="hover:border-yellow-200"]:hover, .theme-dark .allo-docsuite [class~="hover:border-yellow-300"]:hover { border-color:#854d0e !important; }
.theme-dark .allo-docsuite [class~="hover:border-fuchsia-300"]:hover { border-color:#86198f !important; }
.theme-dark .allo-docsuite [class~="hover:border-amber-200"]:hover, .theme-dark .allo-docsuite [class~="hover:border-amber-300"]:hover { border-color:#92400e !important; }
.theme-dark .allo-docsuite [class~="hover:border-red-100"]:hover, .theme-dark .allo-docsuite [class~="hover:border-red-200"]:hover, .theme-dark .allo-docsuite [class~="hover:border-red-300"]:hover { border-color:#991b1b !important; }
.theme-dark .allo-docsuite [class~="hover:border-orange-200"]:hover, .theme-dark .allo-docsuite [class~="hover:border-orange-300"]:hover { border-color:#9a3412 !important; }
.theme-dark .allo-docsuite [class~="hover:border-pink-200"]:hover, .theme-dark .allo-docsuite [class~="hover:border-pink-300"]:hover { border-color:#9d174d !important; }
.theme-dark .allo-docsuite [class~="focus:border-rose-300"]:focus, .theme-dark .allo-docsuite [class~="hover:border-rose-200"]:hover, .theme-dark .allo-docsuite [class~="hover:border-rose-300"]:hover { border-color:#9f1239 !important; }
.theme-dark .allo-docsuite [class~="focus-visible:border-yellow-400"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:border-yellow-400"]:focus { border-color:#a16207 !important; }
.theme-dark .allo-docsuite [class~="hover:border-fuchsia-500/50"]:hover { border-color:#a21caf !important; }
.theme-dark .allo-docsuite [class~="focus-visible:border-amber-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:border-amber-400"]:focus, .theme-dark .allo-docsuite [class~="focus:border-amber-500"]:focus, .theme-dark .allo-docsuite [class~="hover:border-amber-400"]:hover, .theme-dark .allo-docsuite [class~="hover:border-amber-400/50"]:hover, .theme-dark .allo-docsuite [class~="hover:border-amber-500/50"]:hover { border-color:#b45309 !important; }
.theme-dark .allo-docsuite [class~="hover:border-red-400"]:hover { border-color:#b91c1c !important; }
.theme-dark .allo-docsuite [class~="focus-visible:border-rose-500"]:focus-visible, .theme-dark .allo-docsuite [class~="hover:border-rose-400"]:hover, .theme-dark .allo-docsuite [class~="hover:border-rose-500/40"]:hover, .theme-dark .allo-docsuite [class~="hover:border-rose-500/50"]:hover, .theme-dark .allo-docsuite [class~="hover:border-rose-600"]:hover { border-color:#be123c !important; }
.theme-dark .allo-docsuite [class~="focus:border-pink-500"]:focus, .theme-dark .allo-docsuite [class~="hover:border-pink-400"]:hover { border-color:#be185d !important; }
.theme-dark .allo-docsuite [class~="focus-visible:border-orange-500"]:focus-visible, .theme-dark .allo-docsuite [class~="focus:border-orange-400"]:focus { border-color:#c2410c !important; }
.theme-dark .allo-docsuite .group:hover [class~="group-hover:text-teal-600"], .theme-dark .allo-docsuite .group:hover [class~="group-hover:text-teal-800"], .theme-dark .allo-docsuite [class~="hover:text-teal-600"]:hover, .theme-dark .allo-docsuite [class~="hover:text-teal-700"]:hover, .theme-dark .allo-docsuite [class~="hover:text-teal-800"]:hover { color:#5eead4 !important; }
.theme-dark .allo-docsuite .group:hover [class~="group-hover:text-cyan-600"], .theme-dark .allo-docsuite .group:hover [class~="group-hover:text-cyan-700"], .theme-dark .allo-docsuite [class~="hover:text-cyan-700"]:hover, .theme-dark .allo-docsuite [class~="hover:text-cyan-800"]:hover, .theme-dark .allo-docsuite [class~="hover:text-cyan-900"]:hover { color:#67e8f9 !important; }
.theme-dark .allo-docsuite [class~="hover:text-emerald-700"]:hover, .theme-dark .allo-docsuite [class~="hover:text-emerald-800"]:hover, .theme-dark .allo-docsuite [class~="hover:text-emerald-900"]:hover { color:#6ee7b7 !important; }
.theme-dark .allo-docsuite .group:hover [class~="group-hover:text-sky-700"], .theme-dark .allo-docsuite [class~="hover:text-sky-700"]:hover, .theme-dark .allo-docsuite [class~="hover:text-sky-900"]:hover, .theme-dark .allo-docsuite [class~="hover:text-sky-950"]:hover { color:#7dd3fc !important; }
.theme-dark .allo-docsuite [class~="hover:text-green-600"]:hover, .theme-dark .allo-docsuite [class~="hover:text-green-800"]:hover, .theme-dark .allo-docsuite [class~="hover:text-green-900"]:hover { color:#86efac !important; }
.theme-dark .allo-docsuite [class~="hover:text-blue-500"]:hover, .theme-dark .allo-docsuite [class~="hover:text-blue-600"]:hover, .theme-dark .allo-docsuite [class~="hover:text-blue-700"]:hover, .theme-dark .allo-docsuite [class~="hover:text-blue-800"]:hover { color:#93c5fd !important; }
.theme-dark .allo-docsuite [class~="disabled:text-slate-400"]:disabled { color:#a3b1c2 !important; }
.theme-dark .allo-docsuite .group:hover [class~="group-hover:text-indigo-600"], .theme-dark .allo-docsuite .group:hover [class~="group-hover:text-indigo-700"], .theme-dark .allo-docsuite .group:hover [class~="group-hover:text-indigo-900"], .theme-dark .allo-docsuite [class~="hover:text-indigo-400"]:hover, .theme-dark .allo-docsuite [class~="hover:text-indigo-500"]:hover, .theme-dark .allo-docsuite [class~="hover:text-indigo-600"]:hover, .theme-dark .allo-docsuite [class~="hover:text-indigo-700"]:hover, .theme-dark .allo-docsuite [class~="hover:text-indigo-800"]:hover, .theme-dark .allo-docsuite [class~="hover:text-indigo-900"]:hover { color:#a5b4fc !important; }
.theme-dark .allo-docsuite [class~="disabled:text-slate-500"]:disabled { color:#a9b7c8 !important; }
.theme-dark .allo-docsuite .group:hover [class~="group-hover:text-violet-600"], .theme-dark .allo-docsuite .group:hover [class~="group-hover:text-violet-700"], .theme-dark .allo-docsuite [class~="hover:text-violet-600"]:hover, .theme-dark .allo-docsuite [class~="hover:text-violet-700"]:hover, .theme-dark .allo-docsuite [class~="hover:text-violet-900"]:hover { color:#c4b5fd !important; }
.theme-dark .allo-docsuite [class~="disabled:hover:text-slate-600"]:disabled:hover, .theme-dark .allo-docsuite [class~="disabled:text-slate-600"]:disabled, .theme-dark .allo-docsuite [class~="hover:text-slate-600"]:hover { color:#cbd5e1 !important; }
.theme-dark .allo-docsuite [class~="disabled:text-purple-900"]:disabled, .theme-dark .allo-docsuite .group:hover [class~="group-hover:text-purple-600"], .theme-dark .allo-docsuite .group:hover [class~="group-hover:text-purple-700"], .theme-dark .allo-docsuite [class~="hover:text-purple-500"]:hover, .theme-dark .allo-docsuite [class~="hover:text-purple-700"]:hover, .theme-dark .allo-docsuite [class~="hover:text-purple-800"]:hover { color:#d8b4fe !important; }
.theme-dark .allo-docsuite [class~="hover:text-slate-700"]:hover { color:#e2e8f0 !important; }
.theme-dark .allo-docsuite .group:hover [class~="group-hover:text-black"], .theme-dark .allo-docsuite .group:hover [class~="group-hover:text-black/20"], .theme-dark .allo-docsuite [class~="hover:text-black"]:hover, .theme-dark .allo-docsuite [class~="hover:text-slate-800"]:hover { color:#f1f5f9 !important; }
.theme-dark .allo-docsuite [class~="hover:text-slate-900"]:hover { color:#f8fafc !important; }
.theme-dark .allo-docsuite [class~="hover:text-pink-600"]:hover { color:#f9a8d4 !important; }
.theme-dark .allo-docsuite [class~="hover:text-red-400"]:hover, .theme-dark .allo-docsuite [class~="hover:text-red-500"]:hover, .theme-dark .allo-docsuite [class~="hover:text-red-600"]:hover, .theme-dark .allo-docsuite [class~="hover:text-red-700"]:hover, .theme-dark .allo-docsuite [class~="hover:text-red-800"]:hover { color:#fca5a5 !important; }
.theme-dark .allo-docsuite .group:hover [class~="group-hover:text-amber-600"], .theme-dark .allo-docsuite .group:hover [class~="group-hover:text-amber-700"], .theme-dark .allo-docsuite [class~="hover:text-amber-600"]:hover, .theme-dark .allo-docsuite [class~="hover:text-amber-700"]:hover, .theme-dark .allo-docsuite [class~="hover:text-amber-800"]:hover, .theme-dark .allo-docsuite [class~="hover:text-amber-900"]:hover, .theme-dark .allo-docsuite [class~="hover:text-amber-950"]:hover { color:#fcd34d !important; }
.theme-dark .allo-docsuite .group:hover [class~="group-hover:text-rose-600"], .theme-dark .allo-docsuite .group:hover [class~="group-hover:text-rose-700"], .theme-dark .allo-docsuite [class~="hover:text-rose-500"]:hover, .theme-dark .allo-docsuite [class~="hover:text-rose-600"]:hover, .theme-dark .allo-docsuite [class~="hover:text-rose-700"]:hover, .theme-dark .allo-docsuite [class~="hover:text-rose-800"]:hover { color:#fda4af !important; }
.theme-dark .allo-docsuite [class~="hover:text-orange-600"]:hover { color:#fdba74 !important; }
.theme-dark .allo-docsuite [class~="hover:text-yellow-800"]:hover { color:#fde047 !important; }
.theme-contrast .allo-docsuite [class~="focus-visible:ring-amber-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-amber-500/20"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-amber-600"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-amber-700"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-blue-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-blue-500/20"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-blue-600"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-cyan-500/20"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-cyan-700"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-emerald-200"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-emerald-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-emerald-600"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-emerald-700"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-green-800"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-indigo-300"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-indigo-400"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-indigo-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-indigo-500/20"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-indigo-500/25"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-indigo-600"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-indigo-700"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-orange-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-orange-500/20"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-purple-400"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-purple-600"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-red-700"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-rose-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-rose-500/20"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-rose-600"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-rose-700"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-sky-500/20"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-sky-700"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-slate-300"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-slate-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-slate-600"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-slate-700"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-teal-400"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-teal-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-teal-500/20"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-teal-700"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-violet-500/20"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-violet-600"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-violet-700"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-white"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-yellow-300"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-yellow-400"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-yellow-600"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:ring-yellow-700"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-within:ring-cyan-700"]:focus-within, .theme-contrast .allo-docsuite [class~="focus-within:ring-indigo-700"]:focus-within, .theme-contrast .allo-docsuite [class~="focus-within:ring-rose-700"]:focus-within, .theme-contrast .allo-docsuite [class~="focus:ring-amber-300"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-amber-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-amber-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-amber-500/20"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-amber-500/40"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-amber-600"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-amber-700"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-blue-200"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-blue-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-blue-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-blue-500/20"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-cyan-200"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-cyan-300"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-cyan-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-cyan-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-emerald-200"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-emerald-300"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-emerald-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-emerald-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-emerald-500/20"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-fuchsia-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-green-300"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-green-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-green-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-indigo-100"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-indigo-200"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-indigo-300"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-indigo-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-indigo-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-indigo-500/20"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-indigo-500/30"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-indigo-600"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-indigo-700"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-orange-300"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-orange-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-orange-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-pink-200"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-pink-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-purple-300"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-purple-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-purple-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-purple-500/30"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-purple-600"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-red-300"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-red-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-red-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-rose-200"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-rose-300"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-rose-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-rose-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-rose-600"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-sky-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-sky-500/20"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-slate-200"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-slate-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-slate-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-teal-200"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-teal-300"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-teal-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-violet-200"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-violet-300"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-violet-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-violet-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-violet-500/20"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-violet-600"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-white"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-white/20"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-white/50"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-yellow-100"]:focus, .theme-contrast .allo-docsuite [class~="focus:ring-yellow-400"]:focus, .theme-contrast .allo-docsuite [class~="hover:ring-amber-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:ring-emerald-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:ring-rose-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:ring-rose-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:ring-rose-700"]:hover { --tw-ring-color:#ffff00 !important; }
.theme-contrast .allo-docsuite [class~="active:bg-indigo-100"]:active, .theme-contrast .allo-docsuite [class~="checked:bg-yellow-400"]:checked, .theme-contrast .allo-docsuite [class~="disabled:bg-purple-100"]:disabled, .theme-contrast .allo-docsuite [class~="disabled:bg-slate-100"]:disabled, .theme-contrast .allo-docsuite [class~="disabled:bg-slate-200"]:disabled, .theme-contrast .allo-docsuite [class~="disabled:bg-slate-300"]:disabled, .theme-contrast .allo-docsuite [class~="disabled:bg-slate-400"]:disabled, .theme-contrast .allo-docsuite [class~="disabled:bg-slate-50"]:disabled, .theme-contrast .allo-docsuite [class~="disabled:hover:bg-white"]:disabled:hover, .theme-contrast .allo-docsuite [class~="focus-visible:bg-indigo-50/60"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:bg-slate-50"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-within:bg-slate-50"]:focus-within, .theme-contrast .allo-docsuite [class~="focus:bg-indigo-100"]:focus, .theme-contrast .allo-docsuite [class~="focus:bg-indigo-300"]:focus, .theme-contrast .allo-docsuite [class~="focus:bg-indigo-50"]:focus, .theme-contrast .allo-docsuite [class~="focus:bg-indigo-600"]:focus, .theme-contrast .allo-docsuite [class~="focus:bg-indigo-700"]:focus, .theme-contrast .allo-docsuite [class~="focus:bg-slate-100"]:focus, .theme-contrast .allo-docsuite [class~="focus:bg-slate-50"]:focus, .theme-contrast .allo-docsuite [class~="focus:bg-white"]:focus, .theme-contrast .allo-docsuite [class~="focus:bg-yellow-200"]:focus, .theme-contrast .allo-docsuite .group:hover [class~="group-hover:bg-amber-500"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:bg-blue-300"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:bg-green-300"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:bg-indigo-400"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:bg-indigo-500"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:bg-white"], .theme-contrast .allo-docsuite [class~="hover:bg-amber-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-amber-100/50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-amber-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-amber-200/50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-amber-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-amber-300/50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-amber-400/10"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-amber-400/30"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-amber-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-amber-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-amber-500/20"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-amber-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-amber-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-amber-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-amber-900/60"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-blue-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-blue-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-blue-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-blue-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-blue-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-blue-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-blue-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-cyan-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-cyan-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-cyan-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-cyan-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-cyan-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-cyan-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-cyan-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-cyan-900"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-emerald-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-emerald-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-emerald-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-emerald-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-emerald-50/60"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-emerald-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-emerald-500/20"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-emerald-500/25"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-emerald-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-emerald-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-emerald-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-fuchsia-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-fuchsia-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-fuchsia-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-fuchsia-600/60"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-fuchsia-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-green-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-green-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-green-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-green-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-green-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-green-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-100/20"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-100/60"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-50/30"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-50/40"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-50/50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-50/60"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-500/25"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-900/40"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-indigo-900/50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-lime-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-orange-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-orange-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-orange-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-orange-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-pink-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-pink-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-pink-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-pink-50/60"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-pink-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-purple-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-purple-100/20"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-purple-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-purple-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-purple-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-purple-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-purple-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-red-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-red-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-red-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-red-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-red-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-red-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-red-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-red-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-rose-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-rose-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-rose-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-rose-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-rose-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-rose-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-rose-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-rose-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-sky-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-sky-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-sky-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-sky-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-sky-500/25"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-sky-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-sky-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-slate-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-slate-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-slate-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-slate-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-slate-50/70"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-slate-500/20"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-slate-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-slate-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-slate-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-slate-800/50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-slate-800/60"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-slate-800/70"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-slate-800/80"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-slate-900"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-stone-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-teal-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-teal-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-teal-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-teal-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-teal-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-teal-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-teal-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-violet-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-violet-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-violet-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-violet-50/40"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-violet-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-violet-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-violet-600/60"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-violet-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-violet-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-white"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-white/10"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-white/15"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-white/20"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-white/30"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-white/60"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-white/70"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-white/80"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-yellow-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-yellow-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-yellow-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-yellow-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-yellow-400/30"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-yellow-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-yellow-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-yellow-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-yellow-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-yellow-900"]:hover, .theme-contrast .allo-docsuite [class~="hover:bg-zinc-500"]:hover { background-color:#000000 !important; }
.theme-contrast .allo-docsuite .group:hover [class~="group-hover:from-indigo-200"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:from-indigo-600"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:from-teal-600"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:to-emerald-600"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:to-indigo-300"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:to-purple-600"], .theme-contrast .allo-docsuite [class~="hover:from-amber-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-amber-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-amber-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-amber-900"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-blue-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-blue-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-blue-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-emerald-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-emerald-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-green-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-indigo-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-indigo-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-rose-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-slate-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-teal-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-violet-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:from-violet-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-blue-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-cyan-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-emerald-900"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-indigo-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-indigo-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-orange-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-orange-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-orange-900"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-purple-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-purple-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-purple-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-rose-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-rose-900"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-slate-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-teal-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-teal-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-violet-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:to-violet-800"]:hover { background-image:none !important;background-color:#000000 !important; }
.theme-contrast .allo-docsuite [class~="disabled:border-slate-200"]:disabled, .theme-contrast .allo-docsuite [class~="focus-visible:border-amber-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:border-blue-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:border-cyan-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:border-indigo-400"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:border-indigo-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:border-indigo-600"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:border-orange-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:border-rose-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:border-sky-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:border-teal-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:border-violet-500"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus-visible:border-yellow-400"]:focus-visible, .theme-contrast .allo-docsuite [class~="focus:border-amber-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-amber-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-blue-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-cyan-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-emerald-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-emerald-600"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-green-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-indigo-200"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-indigo-300"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-indigo-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-indigo-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-indigo-600"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-indigo-700"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-orange-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-pink-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-purple-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-rose-300"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-sky-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-sky-600"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-slate-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-slate-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-teal-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-violet-400"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-violet-500"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-white"]:focus, .theme-contrast .allo-docsuite [class~="focus:border-yellow-400"]:focus, .theme-contrast .allo-docsuite .group:hover [class~="group-hover:border-indigo-400"], .theme-contrast .allo-docsuite [class~="hover:border-amber-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-amber-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-amber-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-amber-400/50"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-amber-500/50"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-blue-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-blue-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-blue-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-cyan-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-cyan-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-cyan-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-cyan-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-emerald-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-emerald-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-emerald-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-emerald-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-emerald-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-fuchsia-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-fuchsia-500/50"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-green-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-green-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-indigo-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-indigo-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-indigo-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-indigo-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-indigo-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-indigo-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-indigo-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-lime-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-orange-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-orange-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-pink-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-pink-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-pink-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-purple-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-purple-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-purple-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-red-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-red-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-red-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-red-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-rose-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-rose-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-rose-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-rose-500/40"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-rose-500/50"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-rose-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-sky-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-sky-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-slate-100"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-slate-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-slate-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-slate-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-slate-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-teal-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-teal-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-teal-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-teal-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-violet-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-violet-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-violet-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-violet-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-violet-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-white"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-white/30"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-yellow-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:border-yellow-300"]:hover { border-color:#ffff00 !important; }
.theme-contrast .allo-docsuite [class~="disabled:hover:text-slate-600"]:disabled:hover, .theme-contrast .allo-docsuite [class~="disabled:text-purple-900"]:disabled, .theme-contrast .allo-docsuite [class~="disabled:text-slate-400"]:disabled, .theme-contrast .allo-docsuite [class~="disabled:text-slate-500"]:disabled, .theme-contrast .allo-docsuite [class~="disabled:text-slate-600"]:disabled, .theme-contrast .allo-docsuite [class~="focus:text-white"]:focus, .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-amber-600"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-amber-700"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-black"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-black/20"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-cyan-600"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-cyan-700"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-indigo-600"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-indigo-700"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-indigo-900"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-purple-600"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-purple-700"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-rose-600"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-rose-700"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-sky-700"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-teal-600"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-teal-800"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-violet-600"], .theme-contrast .allo-docsuite .group:hover [class~="group-hover:text-violet-700"], .theme-contrast .allo-docsuite [class~="hover:text-amber-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-amber-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-amber-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-amber-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-amber-900"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-amber-950"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-black"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-blue-50"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-blue-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-blue-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-blue-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-blue-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-cyan-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-cyan-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-cyan-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-cyan-900"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-emerald-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-emerald-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-emerald-900"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-fuchsia-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-green-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-green-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-green-900"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-indigo-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-indigo-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-indigo-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-indigo-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-indigo-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-indigo-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-indigo-900"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-orange-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-pink-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-purple-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-purple-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-purple-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-purple-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-red-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-red-400"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-red-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-red-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-red-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-red-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-rose-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-rose-500"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-rose-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-rose-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-rose-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-sky-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-sky-900"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-sky-950"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-slate-200"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-slate-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-slate-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-slate-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-slate-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-slate-900"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-teal-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-teal-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-teal-800"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-violet-600"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-violet-700"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-violet-900"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-white"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-yellow-300"]:hover, .theme-contrast .allo-docsuite [class~="hover:text-yellow-800"]:hover { color:#ffff00 !important; }
}
      `}</style>
      <style>{`
        /* ── Polish pass May 2026: global a11y baselines ── */
        /* Respect prefers-reduced-motion across all CDN tools that animate. */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
            scroll-behavior: auto !important;
          }
        }
        /* Stronger keyboard focus ring for sighted keyboard users.
           Mouse clicks still get the default; only :focus-visible (kbd focus) gets the high-vis ring. */
        button:focus-visible,
        a:focus-visible,
        [role="button"]:focus-visible,
        [role="tab"]:focus-visible,
        [role="link"]:focus-visible,
        [role="menuitem"]:focus-visible,
        [role="option"]:focus-visible,
        [tabindex]:focus-visible:not([tabindex="-1"]),
        input:focus-visible,
        select:focus-visible,
        textarea:focus-visible,
        summary:focus-visible {
          outline: 3px solid #6366f1 !important;
          outline-offset: 2px !important;
          /* White halo outside the indigo ring so the indicator stays >=3:1 on ANY
             background — the bare #6366f1 ring measured ~2.4:1 on the header's
             purple-900 gradient and ~1.4:1 on indigo-600 panels (WCAG 1.4.11). */
          box-shadow: 0 0 0 5px rgba(255,255,255,0.85) !important;
          border-radius: 6px;
        }
        /* ── WCAG 1.4.10 Reflow — let multi-panel STEM tools reflow at 320px / 400% zoom ── */
        /* Any wide horizontal panel layout opts in to vertical-stacking via .allo-reflow.
           At ≤640px (Tailwind sm breakpoint) panels stack and inner overflow becomes scrollable
           instead of forcing a horizontal page scroll. */
        @media (max-width: 640px) {
          .allo-reflow,
          .allo-reflow > * {
            flex-direction: column !important;
            grid-template-columns: 1fr !important;
            min-width: 0 !important;
          }
          .allo-reflow [class*="grid-cols-2"],
          .allo-reflow [class*="grid-cols-3"],
          .allo-reflow [class*="grid-cols-4"],
          .allo-reflow [class*="grid-cols-5"],
          .allo-reflow [class*="grid-cols-6"] {
            grid-template-columns: 1fr !important;
          }
          /* Wide pre/code/table elements inside reflow containers scroll internally */
          .allo-reflow pre, .allo-reflow table, .allo-reflow code {
            max-width: 100%;
            overflow-x: auto;
          }
        }
        /* WCAG 1.4.12 Text Spacing — let user-overridden line/letter/word/paragraph
           spacing render without being clipped by fixed-height containers. The codebase
           already uses Tailwind leading- and tracking- classes (rem units) which scale
           naturally; this rule just ensures no inline height traps text overflow. */
        .allo-textbox, .allo-textbox * {
          line-height: inherit;
        }
        /* App-level skeleton shimmer for loading states */
        @keyframes alloflow-skeleton-shimmer {
          0%   { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .alloflow-skeleton {
          background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%);
          background-size: 800px 100%;
          animation: alloflow-skeleton-shimmer 1.4s infinite linear;
          border-radius: 6px;
        }
        @media (prefers-reduced-motion: reduce) {
          .alloflow-skeleton { animation: none; }
        }
        /* ── UI polish primitives (2026-06-10) — reusable juice classes for
         *    quiz feedback, reader transitions, empty states. All gated by
         *    prefers-reduced-motion so they degrade to instant changes for
         *    users who've requested calmer motion (vestibular-disorder safe).
         *    Subtle by design — pedagogy first, polish second. */
        @keyframes allo-correct-pulse {
          0%   { transform: scale(1);   box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          40%  { transform: scale(1.04); box-shadow: 0 0 0 6px rgba(34,197,94,0); }
          100% { transform: scale(1);   box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        .allo-correct-pulse { animation: allo-correct-pulse 480ms ease-out 1; }
        @keyframes allo-wrong-nudge {
          0%, 100% { transform: translateX(0); }
          25%      { transform: translateX(-3px); }
          50%      { transform: translateX(3px); }
          75%      { transform: translateX(-2px); }
        }
        .allo-wrong-nudge { animation: allo-wrong-nudge 360ms ease-in-out 1; }
        @keyframes allo-section-enter {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .allo-section-enter { animation: allo-section-enter 220ms ease-out 1; }
        @keyframes allo-empty-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        .allo-empty-float { animation: allo-empty-float 3200ms ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .allo-correct-pulse,
          .allo-wrong-nudge,
          .allo-section-enter,
          .allo-empty-float { animation: none; }
        }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; font-size: 12pt; }
          .print-container { padding: 0; max-width: 100%; margin: 0; }
          .print-section { margin-bottom: 2rem; page-break-inside: avoid; border-bottom: 1px solid #eee; padding-bottom: 1rem; }
          h1, h2, h3 { color: #333 !important; }
        }
        @keyframes indeterminate-slide {
            0% { left: -40%; }
            100% { left: 100%; }
        }
        .animate-indeterminate-slide {
            animation: indeterminate-slide 1.5s infinite linear;
            background: linear-gradient(90deg, transparent, #4f46e5, transparent);
        }
        /* ── STEAM Lab theme variables ──
         * Inline React styles in STEM tools can't be overridden by
         * the .theme-dark .bg-X CSS rules (those only touch Tailwind
         * utility classes). These custom properties give inline styles
         * a theme-responsive backing: tools use var(--allo-stem-X) and
         * the variable resolves per-theme.
         *
         * The dark palette below is preserved from the original
         * hardcoded values in stem_lab_module.js + many tool files —
         * those become the dark-theme variant. Light + contrast themes
         * get corresponding palettes.
         */
        :root, .theme-default {
            --allo-stem-canvas:       #ffffff;
            --allo-stem-panel:        #f8fafc;
            --allo-stem-deeper:       #e2e8f0;
            --allo-stem-text:         #0f172a;
            --allo-stem-text-soft:    #475569;
            --allo-stem-border:       #cbd5e1;
            --allo-stem-button-bg:    #f1f5f9;
            --allo-stem-button-text:  #0f172a;
            --allo-stem-button-border:#cbd5e1;
        }
        @media screen { .theme-dark {
            --allo-stem-canvas:       #0f172a;
            --allo-stem-panel:        #1e293b;
            --allo-stem-deeper:       #020617;
            --allo-stem-text:         #e2e8f0;
            --allo-stem-text-soft:    #94a3b8;
            --allo-stem-border:       #334155;
            --allo-stem-button-bg:    #1e293b;
            --allo-stem-button-text:  #e2e8f0;
            --allo-stem-button-border:#334155;

            background-color: #0B1120; /* Deepest Slate */
            background-image: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #0B1120 60%); /* Subtle top spotlight */
            color: #f1f5f9;
        } }
        /* High-contrast palette aligned to existing .theme-contrast rules:
         * black canvas + yellow text/borders + green-on-black for buttons.
         * Pure binary — no soft variants. Matches main-app pattern used at
         * AlloFlowANTI.txt:21957-21966 ( bg:#000, color:#ffff00, button:#00ff00 ). */
        @media screen { .theme-contrast {
            --allo-stem-canvas:       #000000;
            --allo-stem-panel:        #000000;
            --allo-stem-deeper:       #000000;
            --allo-stem-text:         #ffff00;
            --allo-stem-text-soft:    #ffff00;
            --allo-stem-border:       #ffff00;
            --allo-stem-button-bg:    #000000;
            --allo-stem-button-text:  #00ff00;
            --allo-stem-button-border:#00ff00;
        } }
        /* ──────────────────────────────────────────────────────────────
         * High-contrast override for STEAM Lab tools (Piece B).
         *
         * STEM tools were authored with inline styles using hardcoded
         * dark hex/rgba values (~180 hex + ~1300 rgba instances across
         * 101 tools). The CSS variables above only help tools that
         * opted in to var(--allo-stem-*). For everything else, these
         * attribute-selector rules catch the dominant inline patterns
         * when high-contrast theme is active.
         *
         * Scoped under .theme-contrast (already applied to main).
         * Property-name-aware: matches inline style strings, so
         * "background:" rules don't touch "color:" and vice versa.
         * Covers spacing variants ("background: #X" vs "background:#X").
         * SVG fill/stroke attributes deliberately untouched — those
         * encode information in visualizations, not chrome theming.
         * ──────────────────────────────────────────────────────────────
         */
        /* Dark canvas backgrounds → pure black */
        @media screen { .theme-contrast [style*="background: #0f172a"],
        .theme-contrast [style*="background:#0f172a"],
        .theme-contrast [style*="background: #1e293b"],
        .theme-contrast [style*="background:#1e293b"],
        .theme-contrast [style*="background: #020617"],
        .theme-contrast [style*="background: #0a0e1a"],
        .theme-contrast [style*="background: #0a0a18"],
        .theme-contrast [style*="background: #0b1220"],
        .theme-contrast [style*="background: #162032"],
        .theme-contrast [style*="backgroundColor: #0f172a"],
        .theme-contrast [style*="backgroundColor: #1e293b"] {
            background: #000 !important;
            background-color: #000 !important;
        } }
        /* Semi-transparent dark canvas (rgba slate-900 / slate-950 / slate-800) — all opacities */
        @media screen { .theme-contrast [style*="background: rgba(15,23,42"],
        .theme-contrast [style*="background:rgba(15,23,42"],
        .theme-contrast [style*="background: rgba(2,6,23"],
        .theme-contrast [style*="background:rgba(2,6,23"],
        .theme-contrast [style*="background: rgba(30,41,59"],
        .theme-contrast [style*="background:rgba(30,41,59"],
        .theme-contrast [style*="background: rgba(8,18,32"],
        .theme-contrast [style*="background: rgba(9,17,28"],
        .theme-contrast [style*="background: rgba(11,17,32"],
        .theme-contrast [style*="backgroundColor: rgba(15,23,42"],
        .theme-contrast [style*="backgroundColor: rgba(30,41,59"] {
            background: #000 !important;
            background-color: #000 !important;
        } }
        /* Inline light/pastel support tiles and panels -> pure black so forced yellow text remains readable. */
        @media screen { .theme-contrast [style*="background: white"],
        .theme-contrast [style*="background:#fff"],
        .theme-contrast [style*="background: #fff"],
        .theme-contrast [style*="background:#ffffff"],
        .theme-contrast [style*="background: #ffffff"],
        .theme-contrast [style*="background: rgb(255, 255, 255"],
        .theme-contrast [style*="background: #fef9c3"],
        .theme-contrast [style*="background: rgb(254, 249, 195"],
        .theme-contrast [style*="background: #dcfce7"],
        .theme-contrast [style*="background: rgb(220, 252, 231"],
        .theme-contrast [style*="background: #dbeafe"],
        .theme-contrast [style*="background: rgb(219, 234, 254"],
        .theme-contrast [style*="background: #f3f4f6"],
        .theme-contrast [style*="background: rgb(243, 244, 246"],
        .theme-contrast [style*="background: #fafafa"],
        .theme-contrast [style*="background: rgb(250, 250, 250"],
        .theme-contrast [style*="background: #f8fafc"],
        .theme-contrast [style*="background: rgb(248, 250, 252"],
        .theme-contrast [style*="background: #fffbeb"],
        .theme-contrast [style*="background: rgb(255, 251, 235"],
        .theme-contrast [style*="background: #eff6ff"],
        .theme-contrast [style*="background: rgb(239, 246, 255"],
        .theme-contrast [style*="background: #f0fdf4"],
        .theme-contrast [style*="background: rgb(240, 253, 244"],
        .theme-contrast [style*="background: #eef2ff"],
        .theme-contrast [style*="background: rgb(238, 242, 255"],
        .theme-contrast [style*="background: #e0e7ff"],
        .theme-contrast [style*="background: rgb(224, 231, 255"] {
            background: #000 !important;
            background-color: #000 !important;
        } }
        /* Light text on dark → high-contrast yellow */
        @media screen { .theme-contrast [style*="color: #cbd5e1"],
        .theme-contrast [style*="color:#cbd5e1"],
        .theme-contrast [style*="color: #e2e8f0"],
        .theme-contrast [style*="color: #f1f5f9"],
        .theme-contrast [style*="color: #f8fafc"],
        .theme-contrast [style*="color: #94a3b8"],
        .theme-contrast [style*="color: #a1a1aa"],
        .theme-contrast [style*="color: #a3a3a3"],
        .theme-contrast [style*="color: #9ca3af"],
        .theme-contrast [style*="color: #d1d5db"] {
            color: #ffff00 !important;
        } }
        /* Dark borders → high-contrast yellow */
        @media screen { .theme-contrast [style*="border: 1px solid #334155"],
        .theme-contrast [style*="border:1px solid #334155"],
        .theme-contrast [style*="borderColor: #334155"],
        .theme-contrast [style*="borderColor:#334155"],
        .theme-contrast [style*="border-color: #334155"],
        .theme-contrast [style*="border: 1px solid #475569"],
        .theme-contrast [style*="borderColor: #475569"] {
            border-color: #ffff00 !important;
        } }
        /* Reduce-motion respect: high-contrast users with the system
         * reduce-motion preference get no animation regardless of what
         * STEM tools attempt — already covered by the global
         * prefers-reduced-motion block above; noted for completeness. */

        /* ──────────────────────────────────────────────────────────────
         * Light-theme override for STEAM Lab dark-designed tools (Piece C).
         *
         * Of 104 stem tools (audit 2026-05-27, see project memory
         * stem-contrast-audit), 29 use pastels (#fbbf24, #86efac, #5eead4,
         * etc.) on translucent dark cards, designed for dark backgrounds.
         * In light theme the modal interior is white, so these pastels
         * fail WCAG AA contrast (ratios 1.2–2.5).
         *
         * This block does TWO things, both scoped to the modal in light
         * theme so the main app and Groups 1/3/4 tools aren't affected:
         *   1. Remap pastel 'color:' values to family-700 darker variants
         *      (passes AA on white bg).
         *   2. Remap translucent 'rgba(15,23,42,X)' and 'rgba(30,41,59,X)'
         *      card backgrounds to light slate-100 with same opacity,
         *      so the pastel-now-dark text reads on a light card instead
         *      of an invisible dark-on-dark card.
         *
         * Each pastel has two spacing variants '#X' / # X for selector
         * tolerance, same pattern as the .theme-contrast block above.
         *
         * NOT remapped (deliberately, to limit risk):
         *   - Solid dark hex bg ('#0f172a', '#0c1929', etc.) — some tools
         *     use these for intentional dramatic dark panels (e.g., kitchen
         *     theme #1c1410). Per-tool review needed for these.
         *   - Border colors — too easy to accidentally restyle a chart.
         *
         * To revert: delete this entire block.
         * ──────────────────────────────────────────────────────────────
         */
        /* amber 100..500 → amber-700 (#b45309 on white = 4.79:1) */
        .stem-lab-modal.theme-light [style*="color: #fef3c7"],
        .stem-lab-modal.theme-light [style*="color:#fef3c7"],
        .stem-lab-modal.theme-light [style*="color: #fde68a"],
        .stem-lab-modal.theme-light [style*="color:#fde68a"],
        .stem-lab-modal.theme-light [style*="color: #fcd34d"],
        .stem-lab-modal.theme-light [style*="color:#fcd34d"],
        .stem-lab-modal.theme-light [style*="color: #fbbf24"],
        .stem-lab-modal.theme-light [style*="color:#fbbf24"],
        .stem-lab-modal.theme-light [style*="color: #f59e0b"],
        .stem-lab-modal.theme-light [style*="color:#f59e0b"] {
            color: #b45309 !important;
        }
        /* emerald 200..500 → emerald-700 (#047857 on white = 5.13:1) */
        .stem-lab-modal.theme-light [style*="color: #a7f3d0"],
        .stem-lab-modal.theme-light [style*="color:#a7f3d0"],
        .stem-lab-modal.theme-light [style*="color: #6ee7b7"],
        .stem-lab-modal.theme-light [style*="color:#6ee7b7"],
        .stem-lab-modal.theme-light [style*="color: #34d399"],
        .stem-lab-modal.theme-light [style*="color:#34d399"],
        .stem-lab-modal.theme-light [style*="color: #10b981"],
        .stem-lab-modal.theme-light [style*="color:#10b981"] {
            color: #047857 !important;
        }
        /* green 100..500 → green-700 (#15803d on white = 5.36:1) */
        .stem-lab-modal.theme-light [style*="color: #dcfce7"],
        .stem-lab-modal.theme-light [style*="color:#dcfce7"],
        .stem-lab-modal.theme-light [style*="color: #bbf7d0"],
        .stem-lab-modal.theme-light [style*="color:#bbf7d0"],
        .stem-lab-modal.theme-light [style*="color: #86efac"],
        .stem-lab-modal.theme-light [style*="color:#86efac"],
        .stem-lab-modal.theme-light [style*="color: #4ade80"],
        .stem-lab-modal.theme-light [style*="color:#4ade80"],
        .stem-lab-modal.theme-light [style*="color: #22c55e"],
        .stem-lab-modal.theme-light [style*="color:#22c55e"] {
            color: #15803d !important;
        }
        /* teal 200..500 → teal-700 (#0f766e on white = 5.42:1) */
        .stem-lab-modal.theme-light [style*="color: #99f6e4"],
        .stem-lab-modal.theme-light [style*="color:#99f6e4"],
        .stem-lab-modal.theme-light [style*="color: #5eead4"],
        .stem-lab-modal.theme-light [style*="color:#5eead4"],
        .stem-lab-modal.theme-light [style*="color: #2dd4bf"],
        .stem-lab-modal.theme-light [style*="color:#2dd4bf"],
        .stem-lab-modal.theme-light [style*="color: #14b8a6"],
        .stem-lab-modal.theme-light [style*="color:#14b8a6"] {
            color: #0f766e !important;
        }
        /* sky 200..500 → sky-700 (#0369a1 on white = 6.39:1) */
        .stem-lab-modal.theme-light [style*="color: #bae6fd"],
        .stem-lab-modal.theme-light [style*="color:#bae6fd"],
        .stem-lab-modal.theme-light [style*="color: #7dd3fc"],
        .stem-lab-modal.theme-light [style*="color:#7dd3fc"],
        .stem-lab-modal.theme-light [style*="color: #38bdf8"],
        .stem-lab-modal.theme-light [style*="color:#38bdf8"],
        .stem-lab-modal.theme-light [style*="color: #0ea5e9"],
        .stem-lab-modal.theme-light [style*="color:#0ea5e9"] {
            color: #0369a1 !important;
        }
        /* cyan 300..500 → cyan-700 (#0e7490 on white = 5.40:1) */
        .stem-lab-modal.theme-light [style*="color: #67e8f9"],
        .stem-lab-modal.theme-light [style*="color:#67e8f9"],
        .stem-lab-modal.theme-light [style*="color: #22d3ee"],
        .stem-lab-modal.theme-light [style*="color:#22d3ee"],
        .stem-lab-modal.theme-light [style*="color: #06b6d4"],
        .stem-lab-modal.theme-light [style*="color:#06b6d4"] {
            color: #0e7490 !important;
        }
        /* blue 300..500 → blue-700 (#1d4ed8 on white = 7.85:1) */
        .stem-lab-modal.theme-light [style*="color: #93c5fd"],
        .stem-lab-modal.theme-light [style*="color:#93c5fd"],
        .stem-lab-modal.theme-light [style*="color: #60a5fa"],
        .stem-lab-modal.theme-light [style*="color:#60a5fa"],
        .stem-lab-modal.theme-light [style*="color: #3b82f6"],
        .stem-lab-modal.theme-light [style*="color:#3b82f6"] {
            color: #1d4ed8 !important;
        }
        /* indigo 200..400 → indigo-700 (#4338ca on white = 7.02:1) */
        .stem-lab-modal.theme-light [style*="color: #c7d2fe"],
        .stem-lab-modal.theme-light [style*="color:#c7d2fe"],
        .stem-lab-modal.theme-light [style*="color: #a5b4fc"],
        .stem-lab-modal.theme-light [style*="color:#a5b4fc"],
        .stem-lab-modal.theme-light [style*="color: #818cf8"],
        .stem-lab-modal.theme-light [style*="color:#818cf8"] {
            color: #4338ca !important;
        }
        /* violet 200..500 → violet-700 (#6d28d9 on white = 6.84:1) */
        .stem-lab-modal.theme-light [style*="color: #ddd6fe"],
        .stem-lab-modal.theme-light [style*="color:#ddd6fe"],
        .stem-lab-modal.theme-light [style*="color: #c4b5fd"],
        .stem-lab-modal.theme-light [style*="color:#c4b5fd"],
        .stem-lab-modal.theme-light [style*="color: #a78bfa"],
        .stem-lab-modal.theme-light [style*="color:#a78bfa"],
        .stem-lab-modal.theme-light [style*="color: #8b5cf6"],
        .stem-lab-modal.theme-light [style*="color:#8b5cf6"] {
            color: #6d28d9 !important;
        }
        /* purple 200..500 → purple-700 (#7e22ce on white = 6.27:1) */
        .stem-lab-modal.theme-light [style*="color: #e9d5ff"],
        .stem-lab-modal.theme-light [style*="color:#e9d5ff"],
        .stem-lab-modal.theme-light [style*="color: #d8b4fe"],
        .stem-lab-modal.theme-light [style*="color:#d8b4fe"],
        .stem-lab-modal.theme-light [style*="color: #c084fc"],
        .stem-lab-modal.theme-light [style*="color:#c084fc"],
        .stem-lab-modal.theme-light [style*="color: #a855f7"],
        .stem-lab-modal.theme-light [style*="color:#a855f7"] {
            color: #7e22ce !important;
        }
        /* pink 200..500 → pink-700 (#be185d on white = 6.37:1) */
        .stem-lab-modal.theme-light [style*="color: #fbcfe8"],
        .stem-lab-modal.theme-light [style*="color:#fbcfe8"],
        .stem-lab-modal.theme-light [style*="color: #f9a8d4"],
        .stem-lab-modal.theme-light [style*="color:#f9a8d4"],
        .stem-lab-modal.theme-light [style*="color: #f472b6"],
        .stem-lab-modal.theme-light [style*="color:#f472b6"],
        .stem-lab-modal.theme-light [style*="color: #ec4899"],
        .stem-lab-modal.theme-light [style*="color:#ec4899"] {
            color: #be185d !important;
        }
        /* rose/red 100..500 → red-700 (#b91c1c on white = 6.18:1) */
        .stem-lab-modal.theme-light [style*="color: #fee2e2"],
        .stem-lab-modal.theme-light [style*="color:#fee2e2"],
        .stem-lab-modal.theme-light [style*="color: #fecaca"],
        .stem-lab-modal.theme-light [style*="color:#fecaca"],
        .stem-lab-modal.theme-light [style*="color: #fca5a5"],
        .stem-lab-modal.theme-light [style*="color:#fca5a5"],
        .stem-lab-modal.theme-light [style*="color: #f87171"],
        .stem-lab-modal.theme-light [style*="color:#f87171"],
        .stem-lab-modal.theme-light [style*="color: #ef4444"],
        .stem-lab-modal.theme-light [style*="color:#ef4444"] {
            color: #b91c1c !important;
        }
        /* orange 200..500 → orange-700 (#c2410c on white = 5.06:1) */
        .stem-lab-modal.theme-light [style*="color: #fed7aa"],
        .stem-lab-modal.theme-light [style*="color:#fed7aa"],
        .stem-lab-modal.theme-light [style*="color: #fdba74"],
        .stem-lab-modal.theme-light [style*="color:#fdba74"],
        .stem-lab-modal.theme-light [style*="color: #fb923c"],
        .stem-lab-modal.theme-light [style*="color:#fb923c"],
        .stem-lab-modal.theme-light [style*="color: #f97316"],
        .stem-lab-modal.theme-light [style*="color:#f97316"] {
            color: #c2410c !important;
        }
        /* Translucent dark slate card bg → light slate-100 with same alpha.
         * This is the most common Group 2 pattern (rgba(15,23,42,X) in 1300+
         * places). Without this remap, the now-dark-via-Piece-C text would
         * sit on dark cards = still invisible. With it, dark text on
         * light-slate card = readable.
         *
         * Solid dark-hex backgrounds (#0f172a, #0c1929, etc.) are NOT
         * remapped — those tend to be intentional decorative panels and
         * deserve per-tool review. */
        .stem-lab-modal.theme-light [style*="background: rgba(15,23,42"],
        .stem-lab-modal.theme-light [style*="background:rgba(15,23,42"],
        .stem-lab-modal.theme-light [style*="background: rgba(2,6,23"],
        .stem-lab-modal.theme-light [style*="background:rgba(2,6,23"],
        .stem-lab-modal.theme-light [style*="background: rgba(30,41,59"],
        .stem-lab-modal.theme-light [style*="background:rgba(30,41,59"],
        .stem-lab-modal.theme-light [style*="backgroundColor: rgba(15,23,42"],
        .stem-lab-modal.theme-light [style*="backgroundColor: rgba(30,41,59"] {
            background: rgba(241,245,249,0.85) !important;
            background-color: rgba(241,245,249,0.85) !important;
        }

        @media screen { .theme-dark .bg-white {
            background-color: #162032 !important; /* Slightly lighter than bg */
            color: #f1f5f9 !important;
            border-color: #334155 !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3) !important;
        } }
        @media screen { .theme-dark .bg-slate-50,
        .theme-dark .bg-slate-50\\/50,
        .theme-dark .bg-slate-50\\/80 {
            background-color: #0f172a !important;
            color: #e2e8f0 !important;
            border-color: #1e293b !important;
        } }
        @media screen { .theme-dark .bg-slate-100, .theme-dark .bg-slate-100\\/50, .theme-dark .bg-slate-100\\/80 { background-color: #1e293b !important; border-color: #334155 !important; } }
        @media screen { .theme-dark .bg-slate-200 { background-color: #334155 !important; border-color: #475569 !important; } }
        @media screen { .theme-dark .bg-slate-300 { background-color: #475569 !important; border-color: #64748b !important; } }
        @media screen { .theme-dark .bg-slate-400 { background-color: #64748b !important; } }
        @media screen { .theme-dark .text-slate-900,
        .theme-dark .text-slate-800,
        .theme-dark .text-slate-700 { color: #f8fafc !important; } }
        @media screen { .theme-dark .text-slate-600 { color: #cbd5e1 !important; } } /* slate-300 — secondary text, AAA on dark bg */
        @media screen { .theme-dark .text-slate-500 { color: #94a3b8 !important; } } /* slate-400 — helper/label text */
        @media screen { .theme-dark .text-slate-400 { color: #94a3b8 !important; } } /* slate-400 — muted/helper text, AA on dark panels */
        @media screen { .theme-dark .border-slate-100,
        .theme-dark .border-slate-200,
        .theme-dark .border-slate-300 { border-color: #334155 !important; } }
        @media screen { .theme-dark .text-indigo-900 { color: #c7d2fe !important; } } /* Indigo-200 */
        @media screen { .theme-dark .text-indigo-800 { color: #a5b4fc !important; } } /* Indigo-300 */
        @media screen { .theme-dark .text-indigo-700 { color: #a5b4fc !important; } } /* Indigo-300 — 9:1 on dark bg */
        @media screen { .theme-dark .text-indigo-600 { color: #a5b4fc !important; } } /* Indigo-300 — 9:1 on dark bg, passes WCAG AA */
        @media screen { .theme-dark .text-indigo-500 { color: #a5b4fc !important; } } /* Indigo-300 — keep small modal action labels AA */
        @media screen { .theme-dark .bg-indigo-700,
        .theme-dark .bg-indigo-800,
        .theme-dark .bg-indigo-900 { background-color: #312e81 !important; border-color: #4338ca !important; } }
        @media screen { .theme-dark .bg-indigo-50 { background-color: rgba(49, 46, 129, 0.4) !important; border-color: #4338ca !important; } }
        @media screen { .theme-dark .bg-blue-50 { background-color: rgba(30, 58, 138, 0.4) !important; border-color: #1e40af !important; } }
        @media screen { .theme-dark .bg-green-50 { background-color: rgba(20, 83, 45, 0.4) !important; border-color: #15803d !important; } }
        @media screen { .theme-dark .bg-orange-50 { background-color: rgba(124, 45, 18, 0.4) !important; border-color: #c2410c !important; } }
        @media screen { .theme-dark .bg-red-50 { background-color: rgba(127, 29, 29, 0.4) !important; border-color: #b91c1c !important; } }
        @media screen { .theme-dark .bg-yellow-50 { background-color: rgba(113, 63, 18, 0.4) !important; border-color: #a16207 !important; } }
        @media screen { .theme-dark .bg-purple-50 { background-color: rgba(88, 28, 135, 0.4) !important; border-color: #7e22ce !important; } }
        @media screen { .theme-dark .bg-teal-50 { background-color: rgba(19, 78, 74, 0.4) !important; border-color: #0f766e !important; } }
        @media screen { .theme-dark .bg-rose-50, .theme-dark .bg-rose-50\\/80 { background-color: rgba(136, 19, 55, 0.4) !important; border-color: #be123c !important; } }
        @media screen { .theme-dark .bg-cyan-50 { background-color: rgba(22, 78, 99, 0.4) !important; border-color: #0e7490 !important; } }
        @media screen { .theme-dark .bg-indigo-100 { background-color: rgba(55, 48, 163, 0.55) !important; border-color: #4338ca !important; } }
        @media screen { .theme-dark .bg-blue-100 { background-color: rgba(30, 64, 175, 0.55) !important; border-color: #1e40af !important; } }
        @media screen { .theme-dark .bg-green-100 { background-color: rgba(22, 101, 52, 0.55) !important; border-color: #15803d !important; } }
        @media screen { .theme-dark .bg-orange-100 { background-color: rgba(154, 52, 18, 0.55) !important; border-color: #c2410c !important; } }
        @media screen { .theme-dark .bg-red-100 { background-color: rgba(153, 27, 27, 0.55) !important; border-color: #b91c1c !important; } }
        @media screen { .theme-dark .bg-yellow-100 { background-color: rgba(133, 77, 14, 0.55) !important; border-color: #a16207 !important; } }
        @media screen { .theme-dark .bg-amber-100 { background-color: rgba(146, 64, 14, 0.55) !important; border-color: #b45309 !important; } }
        @media screen { .theme-dark .bg-purple-100 { background-color: rgba(107, 33, 168, 0.55) !important; border-color: #7e22ce !important; } }
        @media screen { .theme-dark .bg-teal-100 { background-color: rgba(17, 94, 89, 0.55) !important; border-color: #0f766e !important; } }
        @media screen { .theme-dark .bg-rose-100 { background-color: rgba(159, 18, 57, 0.55) !important; border-color: #be123c !important; } }
        @media screen { .theme-dark .bg-cyan-100 { background-color: rgba(21, 94, 117, 0.55) !important; border-color: #0e7490 !important; } }
        @media screen { .theme-dark .bg-pink-100 { background-color: rgba(157, 23, 77, 0.55) !important; border-color: #be185d !important; } }
        @media screen { .theme-dark .bg-emerald-100 { background-color: rgba(6, 95, 70, 0.55) !important; border-color: #059669 !important; } }
        @media screen { .theme-dark .bg-violet-100 { background-color: rgba(91, 33, 182, 0.55) !important; border-color: #7c3aed !important; } }
        @media screen { .theme-dark .bg-sky-100 { background-color: rgba(7, 89, 133, 0.55) !important; border-color: #0284c7 !important; } }
        @media screen { .theme-dark .bg-fuchsia-100 { background-color: rgba(134, 25, 143, 0.55) !important; border-color: #a21caf !important; } }
        @media screen { .theme-dark .text-green-700, .theme-dark .text-green-800 { color: #86efac !important; } } /* Green-300 */
        @media screen { .theme-dark .text-red-700, .theme-dark .text-red-800 { color: #fca5a5 !important; } } /* Red-300 */
        @media screen { .theme-dark .text-yellow-700, .theme-dark .text-yellow-800 { color: #fde047 !important; } } /* Yellow-300 */
        @media screen { .theme-dark .text-blue-700, .theme-dark .text-blue-800 { color: #93c5fd !important; } } /* Blue-300 */
        @media screen { .theme-dark .text-purple-700, .theme-dark .text-purple-800 { color: #d8b4fe !important; } } /* Purple-300 */
        @media screen { .theme-dark .text-teal-700, .theme-dark .text-teal-800 { color: #5eead4 !important; } } /* Teal-300 */
        @media screen { .theme-dark .text-orange-700, .theme-dark .text-orange-800 { color: #fdba74 !important; } } /* Orange-300 */
        @media screen { .theme-dark .text-cyan-700, .theme-dark .text-cyan-800 { color: #67e8f9 !important; } } /* Cyan-300 */
        @media screen { .theme-dark .text-rose-700, .theme-dark .text-rose-800 { color: #fda4af !important; } } /* Rose-300 */
        @media screen { .theme-dark .text-green-500, .theme-dark .text-green-600 { color: #4ade80 !important; } } /* Green-400 */
        @media screen { .theme-dark .text-red-500, .theme-dark .text-red-600 { color: #f87171 !important; } } /* Red-400 */
        @media screen { .theme-dark .text-yellow-500, .theme-dark .text-yellow-600 { color: #facc15 !important; } } /* Yellow-400 */
        @media screen { .theme-dark .text-amber-500, .theme-dark .text-amber-600 { color: #fbbf24 !important; } } /* Amber-400 */
        @media screen { .theme-dark .text-blue-500, .theme-dark .text-blue-600 { color: #60a5fa !important; } } /* Blue-400 */
        @media screen { .theme-dark .text-purple-500, .theme-dark .text-purple-600 { color: #c084fc !important; } } /* Purple-400 */
        @media screen { .theme-dark .text-teal-500, .theme-dark .text-teal-600 { color: #2dd4bf !important; } } /* Teal-400 */
        @media screen { .theme-dark .text-orange-500, .theme-dark .text-orange-600 { color: #fb923c !important; } } /* Orange-400 */
        @media screen { .theme-dark .text-cyan-500, .theme-dark .text-cyan-600 { color: #22d3ee !important; } } /* Cyan-400 */
        @media screen { .theme-dark .text-rose-500, .theme-dark .text-rose-600 { color: #fb7185 !important; } } /* Rose-400 */
        @media screen { .theme-dark .text-pink-500, .theme-dark .text-pink-600 { color: #f472b6 !important; } } /* Pink-400 */
        @media screen { .theme-dark .text-emerald-500, .theme-dark .text-emerald-600 { color: #34d399 !important; } } /* Emerald-400 */
        @media screen { .theme-dark .text-violet-500, .theme-dark .text-violet-600 { color: #a78bfa !important; } } /* Violet-400 */
        @media screen { .theme-dark .text-sky-500, .theme-dark .text-sky-600 { color: #38bdf8 !important; } } /* Sky-400 */

        /* ── Theme-audit fill-ins (2026-05-19) ──
         * Newly-covered Tailwind classes used in main-app chrome that lacked
         * .theme-dark overrides. Pattern mirrors existing rules above:
         *   - Light shade (-50): rgba(<-900>, 0.4) bg + <-700> border
         *   - Light shade (-100): rgba(<-800/900>, 0.55) bg + <-600/700> border
         *   - Dark text (-700/-800/-900): light shade (<-300>) for contrast
         *   - Slate utility shades: progressively darker as the shade increases
         */
        @media screen { .theme-dark .bg-amber-50    { background-color: rgba(120, 53, 15, 0.4)  !important; border-color: #a16207 !important; } }
        @media screen { .theme-dark .bg-emerald-50  { background-color: rgba(6, 78, 59, 0.4)    !important; border-color: #047857 !important; } }
        @media screen { .theme-dark .bg-violet-50   { background-color: rgba(76, 29, 149, 0.4)  !important; border-color: #6d28d9 !important; } }
        @media screen { .theme-dark .bg-sky-50      { background-color: rgba(12, 74, 110, 0.4)  !important; border-color: #0369a1 !important; } }
        @media screen { .theme-dark .bg-fuchsia-50  { background-color: rgba(112, 26, 117, 0.4) !important; border-color: #a21caf !important; } }
        @media screen { .theme-dark .bg-pink-50     { background-color: rgba(131, 24, 67, 0.4)  !important; border-color: #9d174d !important; } }
        @media screen { .theme-dark .bg-lime-50     { background-color: rgba(54, 83, 20, 0.4)   !important; border-color: #4d7c0f !important; } }
        @media screen { .theme-dark .bg-lime-100    { background-color: rgba(77, 124, 15, 0.55) !important; border-color: #65a30d !important; } }
        /* Slate utility shades (used as chrome panel backgrounds) */
        @media screen { .theme-dark .bg-slate-500   { background-color: #334155 !important; } }
        @media screen { .theme-dark .bg-slate-600   { background-color: #1e293b !important; } }
        @media screen { .theme-dark .bg-slate-700   { background-color: #0f172a !important; } }
        @media screen { .theme-dark .bg-slate-800,
        .theme-dark .bg-slate-900   { background-color: #020617 !important; } }
        /* Dark text colors for previously-partial families (light-up to -300) */
        @media screen { .theme-dark .text-amber-700,   .theme-dark .text-amber-800,   .theme-dark .text-amber-900   { color: #fcd34d !important; } } /* Amber-300 */
        @media screen { .theme-dark .text-emerald-700, .theme-dark .text-emerald-800, .theme-dark .text-emerald-900 { color: #6ee7b7 !important; } } /* Emerald-300 */
        @media screen { .theme-dark .text-violet-700,  .theme-dark .text-violet-800,  .theme-dark .text-violet-900  { color: #c4b5fd !important; } } /* Violet-300 */
        @media screen { .theme-dark .text-sky-700,     .theme-dark .text-sky-800,     .theme-dark .text-sky-900     { color: #7dd3fc !important; } } /* Sky-300 */
        @media screen { .theme-dark .text-pink-700,    .theme-dark .text-pink-800,    .theme-dark .text-pink-900    { color: #f9a8d4 !important; } } /* Pink-300 */
        @media screen { .theme-dark .text-fuchsia-500, .theme-dark .text-fuchsia-600, .theme-dark .text-fuchsia-700, .theme-dark .text-fuchsia-800 { color: #f0abfc !important; } } /* Fuchsia-300 */
        @media screen { .theme-dark .text-lime-500,    .theme-dark .text-lime-600,    .theme-dark .text-lime-700,    .theme-dark .text-lime-800    { color: #bef264 !important; } } /* Lime-300 */
        @media screen { .theme-dark .text-orange-900   { color: #fdba74 !important; } } /* Orange-300, completing -700/-800/-900 */
        @media screen { .theme-dark .text-green-900    { color: #86efac !important; } } /* Green-300, completing -700/-800/-900 */
        @media screen { .theme-dark .text-red-900      { color: #fca5a5 !important; } } /* Red-300, completing */
        @media screen { .theme-dark .text-yellow-900   { color: #fde047 !important; } } /* Yellow-300, completing */
        @media screen { .theme-dark .text-blue-900     { color: #93c5fd !important; } } /* Blue-300, completing */
        @media screen { .theme-dark .text-purple-900   { color: #d8b4fe !important; } } /* Purple-300, completing */
        @media screen { .theme-dark .text-teal-900     { color: #5eead4 !important; } } /* Teal-300, completing */
        @media screen { .theme-dark .text-cyan-900     { color: #67e8f9 !important; } } /* Cyan-300, completing */
        @media screen { .theme-dark .text-rose-900     { color: #fda4af !important; } } /* Rose-300, completing */
        @media screen { .theme-dark { color-scheme: dark; } }
        @media screen { .theme-dark input, .theme-dark textarea, .theme-dark select {
            background-color: #0f172a !important;
            border-color: #475569 !important;
            color: #f8fafc !important;
        } }
        @media screen { .theme-dark select option {
            background-color: #1e293b !important;
            color: #f8fafc !important;
        } }
        @media screen { .theme-dark input::placeholder, .theme-dark textarea::placeholder { color: #94a3b8 !important; } }
        @media screen { .theme-dark input:focus, .theme-dark textarea:focus, .theme-dark select:focus {
            border-color: #818cf8 !important;
            --tw-ring-color: #4338ca !important;
            outline: 2px solid #818cf8 !important;
            outline-offset: 1px !important;
        } }
        @media screen { .theme-dark .border-4.bg-white { background-color: #1e293b !important; border-color: #6366f1 !important; } }
        @media screen { .theme-dark .sort-card { background-color: #1e293b !important; border-color: #475569 !important; } }
        @media screen { .theme-dark .bg-slate-300 { background-color: #334155 !important; border-color: #475569 !important; } } /* Grid lines */
        @media screen { .theme-dark .ring-1.ring-slate-300 { --tw-ring-color: #475569 !important; } }
        @media screen { .theme-dark .prose { color: #cbd5e1 !important; } }
        @media screen { .theme-dark .prose strong { color: #f1f5f9 !important; } }
        @media screen { .theme-dark .prose h1, .theme-dark .prose h2, .theme-dark .prose h3, .theme-dark .prose h4 { color: #f8fafc !important; } }
        @media screen { .theme-dark .prose code { color: #f1f5f9 !important; background-color: #334155 !important; } }
        @media screen { .theme-dark .prose a { color: #60a5fa !important; } }
        @media screen { .theme-contrast { background-color: #000000 !important; color: #ffff00 !important; } }
        @media screen { .theme-contrast .bg-white, .theme-contrast .bg-slate-50, .theme-contrast .bg-slate-100,
        .theme-contrast .bg-amber-50, .theme-contrast .bg-rose-50, .theme-contrast .bg-sky-50, .theme-contrast .bg-emerald-50 { background-color: #000000 !important; border: 2px solid #ffff00 !important; color: #ffff00 !important; } }
        @media screen { .theme-contrast .bg-amber-50 *, .theme-contrast .bg-rose-50 *, .theme-contrast .bg-sky-50 *, .theme-contrast .bg-emerald-50 * { color: #ffff00 !important; } }
        @media screen { .theme-contrast h1, .theme-contrast h2, .theme-contrast h3, .theme-contrast h4, .theme-contrast p, .theme-contrast span, .theme-contrast div, .theme-contrast li, .theme-contrast label {
            color: #ffff00 !important;
        } }
        @media screen { .theme-contrast .bg-indigo-700, .theme-contrast .bg-indigo-900 { background-color: #000000 !important; border-bottom: 4px solid #ffff00 !important; } }
        @media screen { .theme-contrast button { background-color: #000000 !important; border: 2px solid #00ff00 !important; color: #00ff00 !important; font-weight: bold !important; } }
        @media screen { .theme-contrast button:hover { background-color: #00ff00 !important; color: #000000 !important; } }
        @media screen { .theme-contrast :focus-visible,
        .theme-contrast button:focus-visible,
        .theme-contrast a:focus-visible,
        .theme-contrast [role="button"]:focus-visible {
            outline: 4px solid #ffff00 !important;
            outline-offset: 2px !important;
            box-shadow: 0 0 0 6px #000000, 0 0 0 10px #ffff00 !important;
        } }
        @media screen { .theme-contrast { color-scheme: dark; } }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-white,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-slate-50,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-indigo-50,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-blue-50,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-orange-50,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-green-50,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-yellow-50,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-purple-50,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-teal-50,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-rose-50,
        /* -100 light shades (2026-06-11): organizer cards (e.g. the static Venn overlap, which used
           bg-purple-100/95) + other content used -100 backgrounds that escaped the -50-only list above
           and stayed bright under reading themes while their -50 siblings went transparent. Theme-gated,
           so default/light mode is completely unaffected; reading themes just neutralize these too. */
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-slate-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-gray-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-indigo-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-blue-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-sky-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-cyan-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-teal-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-green-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-emerald-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-lime-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-yellow-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-amber-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-orange-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-red-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-rose-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-pink-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-fuchsia-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-purple-100,
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) .bg-violet-100 { background-color: transparent !important; }
        [data-reading-theme] [role="dialog"].bg-white,
        [data-reading-theme] .allo-popover-solid {
            background-color: #ffffff !important;
        }
        [data-reading-theme="warm"], [data-reading-theme="warm"] *,
        [data-reading-theme="sepia"], [data-reading-theme="sepia"] *,
        [data-reading-theme="blue"], [data-reading-theme="blue"] *,
        [data-reading-theme="green"], [data-reading-theme="green"] *,
        [data-reading-theme="rose"], [data-reading-theme="rose"] *,
        [data-reading-theme="dyslexia"], [data-reading-theme="dyslexia"] * {
            color: inherit;
        }
        [data-reading-theme="warm"] { --allo-rt-fg: #432714; --allo-rt-bg: #fdcba5; --allo-rt-hl: #f97e1f; --allo-rt-ok: #126836; --allo-rt-err: #b21f24; --allo-rt-link: #1e4ed2; --allo-rt-surface: #fff3e8; --allo-rt-surface-raised: #fffaf5; --allo-rt-surface-muted: #f6dcc9; --allo-rt-surface-hover: #f2cfb4; --allo-rt-border: #a85b2f; --allo-rt-muted: #6f4d3a; --allo-rt-control: #fffaf5; --allo-rt-focus: #1d4ed8; color: #432714 !important; }
        [data-reading-theme="sepia"] { --allo-rt-fg: #2a1f13; --allo-rt-bg: #d1bfa9; --allo-rt-hl: #b48950; --allo-rt-ok: #105b2f; --allo-rt-err: #9c1c20; --allo-rt-link: #1a44b7; --allo-rt-surface: #f3eadf; --allo-rt-surface-raised: #fffaf2; --allo-rt-surface-muted: #e5d6c0; --allo-rt-surface-hover: #e2cfb5; --allo-rt-border: #7f5e3d; --allo-rt-muted: #604c3b; --allo-rt-control: #fffaf2; --allo-rt-focus: #174ea6; color: #2a1f13 !important; }
        [data-reading-theme="blue"] { --allo-rt-fg: #16304b; --allo-rt-bg: #b9dbf4; --allo-rt-hl: #4aa9ed; --allo-rt-ok: #126836; --allo-rt-err: #b62025; --allo-rt-link: #1f50d6; --allo-rt-surface: #eaf5fd; --allo-rt-surface-raised: #f8fcff; --allo-rt-surface-muted: #d7eafa; --allo-rt-surface-hover: #cce5f7; --allo-rt-border: #3b78a5; --allo-rt-muted: #3b5269; --allo-rt-control: #f8fcff; --allo-rt-focus: #174ea6; color: #16304b !important; }
        [data-reading-theme="green"] { --allo-rt-fg: #123f21; --allo-rt-bg: #caeccf; --allo-rt-hl: #34c548; --allo-rt-ok: #15753d; --allo-rt-err: #c32228; --allo-rt-link: #295ae0; --allo-rt-surface: #eff9f0; --allo-rt-surface-raised: #fbfffb; --allo-rt-surface-muted: #dcefe0; --allo-rt-surface-hover: #d0e8d4; --allo-rt-border: #3b7f4c; --allo-rt-muted: #385742; --allo-rt-control: #fbfffb; --allo-rt-focus: #1455a5; color: #123f21 !important; }
        [data-reading-theme="rose"] { --allo-rt-fg: #561530; --allo-rt-bg: #f9c8d8; --allo-rt-hl: #f877a2; --allo-rt-ok: #126836; --allo-rt-err: #b21f24; --allo-rt-link: #1e4ed2; --allo-rt-surface: #fff0f5; --allo-rt-surface-raised: #fff9fb; --allo-rt-surface-muted: #f5dbe5; --allo-rt-surface-hover: #f3cddc; --allo-rt-border: #a7476b; --allo-rt-muted: #724557; --allo-rt-control: #fff9fb; --allo-rt-focus: #174ea6; color: #561530 !important; }
        [data-reading-theme="dyslexia"] { --allo-rt-fg: #3f3b31; --allo-rt-bg: #f4ebbe; --allo-rt-hl: #cfb017; --allo-rt-ok: #15793f; --allo-rt-err: #cc242a; --allo-rt-link: #2d5de1; --allo-rt-surface: #fffbed; --allo-rt-surface-raised: #fffef8; --allo-rt-surface-muted: #ede2ae; --allo-rt-surface-hover: #e8d991; --allo-rt-border: #8d7621; --allo-rt-muted: #5e5536; --allo-rt-control: #fffef8; --allo-rt-focus: #174ea6; color: #3f3b31 !important; }
        [data-reading-theme="dim"] { --allo-rt-fg: #000000; --allo-rt-bg: #adb3bd; --allo-rt-hl: #7486a4; --allo-rt-ok: #0e4e29; --allo-rt-err: #86181b; --allo-rt-link: #173ca1; --allo-rt-surface: #c2c8cf; --allo-rt-surface-raised: #d7dbe0; --allo-rt-surface-muted: #98a0aa; --allo-rt-surface-hover: #d0d5da; --allo-rt-border: #46505d; --allo-rt-muted: #2f3744; --allo-rt-control: #d7dbe0; --allo-rt-focus: #1d4ed8; color: #000000 !important; }
        [data-reading-theme="dark"] { --allo-rt-fg: #e2e8f0; --allo-rt-bg: #1a1a2e; --allo-rt-hl: #454589; --allo-rt-ok: #4ade80; --allo-rt-err: #fca5a5; --allo-rt-link: #93c5fd; --allo-rt-surface: #24243b; --allo-rt-surface-raised: #2f2f4a; --allo-rt-surface-muted: #30304c; --allo-rt-surface-hover: #39395a; --allo-rt-border: #7979ab; --allo-rt-muted: #bcc8d8; --allo-rt-control: #24243b; --allo-rt-focus: #fbbf24; }
        [data-reading-theme="highContrast"] { --allo-rt-fg: #ffff00; --allo-rt-bg: #000000; --allo-rt-hl: #4d4d00; --allo-rt-ok: #00ff00; --allo-rt-err: #ff6666; --allo-rt-link: #00ffff; --allo-rt-surface: #000000; --allo-rt-surface-raised: #000000; --allo-rt-surface-muted: #000000; --allo-rt-surface-hover: #ffff00; --allo-rt-border: #ffff00; --allo-rt-muted: #ffff00; --allo-rt-control: #000000; --allo-rt-focus: #ffff00; }
        /* The glossary term takes an isDarkBg prop that no simplified-view call
           site passes, so it always rendered indigo-600: 2.71:1 on dark, 3.34:1
           on high contrast, 2.98:1 on dim. Drive it from the theme instead. */
        [data-reading-theme] .allo-glossary-term { color: var(--allo-rt-link) !important; border-color: var(--allo-rt-link) !important; }
        /* Accents are themed, not fixed. Previously every theme painted the same
           hexes on its own background: yellow-200 highlight sat at 1.0:1 on warm
           and sepia (literally invisible), success ran 2.7-3.1:1 and error
           3.9-4.5:1 — all below AA. Each theme now supplies its own, solved
           against its own background. */
        [data-reading-theme="warm"] h1, [data-reading-theme="sepia"] h1, [data-reading-theme="blue"] h1, [data-reading-theme="green"] h1, [data-reading-theme="rose"] h1, [data-reading-theme="dyslexia"] h1, [data-reading-theme="dim"] h1, [data-reading-theme="warm"] h2, [data-reading-theme="sepia"] h2, [data-reading-theme="blue"] h2, [data-reading-theme="green"] h2, [data-reading-theme="rose"] h2, [data-reading-theme="dyslexia"] h2, [data-reading-theme="dim"] h2, [data-reading-theme="warm"] h3, [data-reading-theme="sepia"] h3, [data-reading-theme="blue"] h3, [data-reading-theme="green"] h3, [data-reading-theme="rose"] h3, [data-reading-theme="dyslexia"] h3, [data-reading-theme="dim"] h3, [data-reading-theme="warm"] h4, [data-reading-theme="sepia"] h4, [data-reading-theme="blue"] h4, [data-reading-theme="green"] h4, [data-reading-theme="rose"] h4, [data-reading-theme="dyslexia"] h4, [data-reading-theme="dim"] h4 { color: var(--allo-rt-fg) !important; }
        [data-reading-theme="warm"] mark, [data-reading-theme="sepia"] mark, [data-reading-theme="blue"] mark, [data-reading-theme="green"] mark, [data-reading-theme="rose"] mark, [data-reading-theme="dyslexia"] mark, [data-reading-theme="dim"] mark, [data-reading-theme="warm"] .allo-rt-highlight, [data-reading-theme="sepia"] .allo-rt-highlight, [data-reading-theme="blue"] .allo-rt-highlight, [data-reading-theme="green"] .allo-rt-highlight, [data-reading-theme="rose"] .allo-rt-highlight, [data-reading-theme="dyslexia"] .allo-rt-highlight, [data-reading-theme="dim"] .allo-rt-highlight { background-color: var(--allo-rt-hl) !important; color: var(--allo-rt-fg) !important; }
        [data-reading-theme="warm"] a, [data-reading-theme="sepia"] a, [data-reading-theme="blue"] a, [data-reading-theme="green"] a, [data-reading-theme="rose"] a, [data-reading-theme="dyslexia"] a, [data-reading-theme="dim"] a { color: var(--allo-rt-link) !important; }
        [data-reading-theme="warm"] .text-green-600, [data-reading-theme="sepia"] .text-green-600, [data-reading-theme="blue"] .text-green-600, [data-reading-theme="green"] .text-green-600, [data-reading-theme="rose"] .text-green-600, [data-reading-theme="dyslexia"] .text-green-600, [data-reading-theme="dim"] .text-green-600, [data-reading-theme="warm"] .text-green-700, [data-reading-theme="sepia"] .text-green-700, [data-reading-theme="blue"] .text-green-700, [data-reading-theme="green"] .text-green-700, [data-reading-theme="rose"] .text-green-700, [data-reading-theme="dyslexia"] .text-green-700, [data-reading-theme="dim"] .text-green-700, [data-reading-theme="warm"] .text-emerald-600, [data-reading-theme="sepia"] .text-emerald-600, [data-reading-theme="blue"] .text-emerald-600, [data-reading-theme="green"] .text-emerald-600, [data-reading-theme="rose"] .text-emerald-600, [data-reading-theme="dyslexia"] .text-emerald-600, [data-reading-theme="dim"] .text-emerald-600 { color: var(--allo-rt-ok) !important; }
        [data-reading-theme="warm"] .text-red-600, [data-reading-theme="sepia"] .text-red-600, [data-reading-theme="blue"] .text-red-600, [data-reading-theme="green"] .text-red-600, [data-reading-theme="rose"] .text-red-600, [data-reading-theme="dyslexia"] .text-red-600, [data-reading-theme="dim"] .text-red-600, [data-reading-theme="warm"] .text-red-700, [data-reading-theme="sepia"] .text-red-700, [data-reading-theme="blue"] .text-red-700, [data-reading-theme="green"] .text-red-700, [data-reading-theme="rose"] .text-red-700, [data-reading-theme="dyslexia"] .text-red-700, [data-reading-theme="dim"] .text-red-700, [data-reading-theme="warm"] .text-rose-600, [data-reading-theme="sepia"] .text-rose-600, [data-reading-theme="blue"] .text-rose-600, [data-reading-theme="green"] .text-rose-600, [data-reading-theme="rose"] .text-rose-600, [data-reading-theme="dyslexia"] .text-rose-600, [data-reading-theme="dim"] .text-rose-600 { color: var(--allo-rt-err) !important; }
        [data-reading-theme="dark"] .bg-white, [data-reading-theme="dark"] .bg-slate-50 { background-color: rgba(26,26,46,0.5) !important; color: #e2e8f0 !important; }
        [data-reading-theme="dark"] h1, [data-reading-theme="dark"] h2, [data-reading-theme="dark"] h3, [data-reading-theme="dark"] p, [data-reading-theme="dark"] span, [data-reading-theme="dark"] li, [data-reading-theme="dark"] div { color: #e2e8f0 !important; }
        [data-reading-theme="highContrast"] .bg-white, [data-reading-theme="highContrast"] .bg-slate-50 { background-color: #000 !important; color: #ffff00 !important; }
        [data-reading-theme="highContrast"] h1, [data-reading-theme="highContrast"] h2, [data-reading-theme="highContrast"] h3, [data-reading-theme="highContrast"] p, [data-reading-theme="highContrast"] span, [data-reading-theme="highContrast"] li { color: #ffff00 !important; }
        /* Reading-color interaction layer. The app theme controls the shell;
           this layer owns only the lesson/content surface. Keep every surface,
           field, focus ring, pressed state, and selection inside the same
           palette so a theme never leaves a bright island or an unreadable
           control behind. */
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) {
            background-color: var(--allo-rt-bg) !important;
            color: var(--allo-rt-fg) !important;
            color-scheme: light;
        }
        [data-reading-theme="dark"], [data-reading-theme="highContrast"] { color-scheme: dark; }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(h1, h2, h3, h4, h5, h6, p, li, td, th, label, legend, figcaption, blockquote, dt, dd, small, strong, em, code, pre, span, div) {
            color: inherit;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(.text-slate-400, .text-slate-500, .text-slate-600, .text-gray-400, .text-gray-500, .text-gray-600) {
            color: var(--allo-rt-muted) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(.bg-white, [class*="bg-white/"], .bg-slate-50, .bg-gray-50, .bg-stone-50, .bg-indigo-50, .bg-blue-50, .bg-sky-50, .bg-cyan-50, .bg-teal-50, .bg-green-50, .bg-emerald-50, .bg-lime-50, .bg-yellow-50, .bg-amber-50, .bg-orange-50, .bg-red-50, .bg-rose-50, .bg-pink-50, .bg-fuchsia-50, .bg-purple-50, .bg-violet-50) {
            background-color: var(--allo-rt-surface) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(.bg-slate-100, .bg-gray-100, .bg-stone-100, .bg-indigo-100, .bg-blue-100, .bg-sky-100, .bg-cyan-100, .bg-teal-100, .bg-green-100, .bg-emerald-100, .bg-lime-100, .bg-yellow-100, .bg-amber-100, .bg-orange-100, .bg-red-100, .bg-rose-100, .bg-pink-100, .bg-fuchsia-100, .bg-purple-100, .bg-violet-100) {
            background-color: var(--allo-rt-surface-muted) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where([role="dialog"], .allo-popover-solid, [role="menu"], [role="listbox"], details) {
            background-color: var(--allo-rt-surface-raised) !important;
            color: var(--allo-rt-fg) !important;
            border-color: var(--allo-rt-border) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(.border-slate-100, .border-slate-200, .border-slate-300, .border-gray-200, .border-gray-300, .border-indigo-100, .border-indigo-200) {
            border-color: var(--allo-rt-border) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, select) {
            background-color: var(--allo-rt-control) !important;
            color: var(--allo-rt-fg) !important;
            border: 1px solid var(--allo-rt-border) !important;
            accent-color: var(--allo-rt-link);
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(input[type="checkbox"], input[type="radio"], input[type="range"]) {
            accent-color: var(--allo-rt-link);
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(input, textarea)::placeholder {
            color: var(--allo-rt-muted) !important;
            opacity: 1;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(option) {
            background-color: var(--allo-rt-control) !important;
            color: var(--allo-rt-fg) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(button, [role="button"]) {
            background-image: none !important;
            background-color: var(--allo-rt-control) !important;
            color: var(--allo-rt-fg) !important;
            border: 1px solid var(--allo-rt-border) !important;
            box-shadow: none !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(button, [role="button"]):hover:not(:disabled) {
            background-color: var(--allo-rt-surface-hover) !important;
            color: var(--allo-rt-fg) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(button, [role="button"])[aria-pressed="true"],
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(button, [role="button"])[aria-checked="true"] {
            background-color: var(--allo-rt-hl) !important;
            color: var(--allo-rt-fg) !important;
            border-color: var(--allo-rt-border) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(a, button, input, textarea, select, summary, [role="button"]):focus-visible {
            outline: 3px solid var(--allo-rt-focus) !important;
            outline-offset: 2px !important;
            box-shadow: 0 0 0 2px var(--allo-rt-surface-raised) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(a) {
            color: var(--allo-rt-link) !important;
            text-decoration-thickness: 0.1em;
            text-underline-offset: 0.15em;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(mark, .allo-rt-highlight) {
            background-color: var(--allo-rt-hl) !important;
            color: var(--allo-rt-fg) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(.allo-glossary-term) {
            color: var(--allo-rt-link) !important;
            border-color: var(--allo-rt-link) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(.text-green-600, .text-green-700, .text-emerald-600, .text-emerald-700) {
            color: var(--allo-rt-ok) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(.text-red-600, .text-red-700, .text-rose-600, .text-rose-700) {
            color: var(--allo-rt-err) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(table, th, td, hr) {
            border-color: var(--allo-rt-border) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(th) {
            background-color: var(--allo-rt-surface-muted) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(td, tr:nth-child(even)) {
            background-color: var(--allo-rt-surface) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(pre, code) {
            background-color: var(--allo-rt-surface-muted) !important;
            color: var(--allo-rt-fg) !important;
        }
        [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) ::selection {
            background-color: var(--allo-rt-hl);
            color: var(--allo-rt-fg);
        }
        [data-reading-theme="dark"] :where(button, [role="button"]) { color: #e2e8f0 !important; }
        [data-reading-theme="highContrast"] :where(button, [role="button"]) {
            background-color: #000000 !important;
            color: #ffff00 !important;
            border: 2px solid #ffff00 !important;
            box-shadow: none !important;
        }
        [data-reading-theme="highContrast"] :where(button, [role="button"]):hover:not(:disabled),
        [data-reading-theme="highContrast"] :where(button, [role="button"])[aria-pressed="true"],
        [data-reading-theme="highContrast"] :where(button, [role="button"])[aria-checked="true"] {
            background-color: #ffff00 !important;
            color: #000000 !important;
        }
        [data-reading-theme="highContrast"] :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, select) {
            border-width: 2px !important;
        }
        @media (prefers-reduced-motion: reduce) {
            [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) {
                transition: none !important;
            }
        }
        @media screen { .theme-contrast input, .theme-contrast textarea, .theme-contrast select {
            background-color: #000000 !important;
            border: 2px solid #ffff00 !important;
            color: #ffff00 !important;
        } }
        @media screen { .theme-contrast select option {
            background-color: #000000 !important;
            color: #ffff00 !important;
        } }
        @media screen { .theme-contrast [class*="bg-"] { background-color: #000000 !important; } }
        @media screen { .theme-contrast .bg-yellow-200,
        .theme-contrast .bg-yellow-300,
        .theme-contrast .bg-yellow-400 {
            background-color: #FFFF00 !important;
            color: #000000 !important;
            border: 2px solid #FFFFFF !important;
        } }
        @font-face {
            font-family: 'OpenDyslexic';
            src: url('https://cdn.jsdelivr.net/npm/opendyslexic@2.1.0-beta1/open-dyslexic-regular.woff') format('woff');
            font-weight: normal;
            font-style: normal;
        }
        @font-face {
            font-family: 'OpenDyslexic';
            src: url('https://cdn.jsdelivr.net/npm/opendyslexic@2.1.0-beta1/open-dyslexic-bold.woff') format('woff');
            font-weight: bold;
            font-style: normal;
        }
        .font-dyslexic, .font-dyslexic * {
            font-family: 'OpenDyslexic', sans-serif !important;
            line-height: 1.6 !important;
        }
        .font-andika, .font-andika * {
            font-family: 'Andika', sans-serif !important;
        }
        .font-gentium, .font-gentium * {
            font-family: 'Gentium Book Plus', serif !important;
        }
        html {
            font-size: ${baseFontSize}px;
            transition: font-size 0.2s ease-out;
        }
        body, p, h1, h2, h3, h4, h5, h6, li, a, span, button, input, textarea, select {
            line-height: ${lineHeight} !important;
            letter-spacing: ${letterSpacing}em !important;
            transition: line-height 0.2s ease-out, letter-spacing 0.2s ease-out;
        }
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .rotate-y-0 { transform: rotateY(0deg); }
        @keyframes stamp {
          0% { opacity: 0; transform: scale(3); }
          100% { opacity: 0.8; transform: scale(1) rotate(-15deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes dashflow {
          to { stroke-dashoffset: -20; }
        }
        @keyframes bakingBubbleRise {
          0%   { transform: translateY(0) scale(0.4); opacity: 0; }
          15%  { opacity: 0.85; }
          70%  { opacity: 0.9; }
          100% { transform: translateY(-160%) scale(1.1); opacity: 0; }
        }
        @keyframes pop {
          0% { transform: scale(0.95); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .bg-dot-pattern {
            background-image: radial-gradient(#94a3b8 1px, transparent 1px);
            background-size: 24px 24px;
            opacity: 0.15;
        }
        @keyframes float-slow {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(20px, -20px); }
        }
        .animate-float {
            animation: float-slow 10s ease-in-out infinite;
        }
        .animate-float-delayed {
            animation: float-slow 12s ease-in-out infinite reverse;
        }
        .reduce-motion *,
        .reduce-motion *::before,
        .reduce-motion *::after {
            animation-duration: 0.001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.001ms !important;
            scroll-behavior: auto !important;
        }
        .reduce-motion .animate-pulse,
        .reduce-motion .animate-bounce,
        .reduce-motion .animate-spin,
        .reduce-motion .animate-ping,
        .reduce-motion .animate-float,
        .reduce-motion .animate-float-delayed,
        .reduce-motion [class*="animate-"] {
            animation: none !important;
        }

        /* App-theme / reading-theme compatibility bridge.
           The app's dark and contrast modes own the surrounding chrome. Once a
           non-default reading palette is selected, the lesson canvas owns its
           descendants. This final layer intentionally follows both the generated
           docsuite overrides and the broad app-theme rules above so changing the
           shell can never turn warm/blue/sepia content into dark-mode fragments or
           high-contrast yellow-on-tint text. Default is excluded and continues to
           follow the app theme exactly as before. */
        @media screen {
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) {
                background-color: var(--allo-rt-bg) !important;
                color: var(--allo-rt-fg) !important;
                color-scheme: light;
                isolation: isolate;
                scrollbar-color: var(--allo-rt-border) var(--allo-rt-surface);
            }
            :is(.theme-dark, .theme-contrast) .allo-docsuite :is([data-reading-theme="dark"], [data-reading-theme="highContrast"]) {
                color-scheme: dark;
            }

            /* Re-establish readable ink after broad .theme-dark text utilities and
               .theme-contrast element selectors. Purposeful hierarchy and semantic
               colors are restored by the more specific rules that follow. */
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(*) {
                color: inherit !important;
            }
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(.text-slate-400, .text-slate-500, .text-slate-600, .text-gray-400, .text-gray-500, .text-gray-600) {
                color: var(--allo-rt-muted) !important;
            }

            /* The generated shell themes flatten utility backgrounds. Clear those
               shell colors first, then rebuild content surfaces from reading tokens. */
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where([class*="bg-"], [class*="from-"], [class*="via-"], [class*="to-"]) {
                background-image: none !important;
                background-color: transparent !important;
            }
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(.bg-white, [class*="bg-white/"], .bg-slate-50, .bg-gray-50, .bg-stone-50, .bg-indigo-50, .bg-blue-50, .bg-sky-50, .bg-cyan-50, .bg-teal-50, .bg-green-50, .bg-emerald-50, .bg-lime-50, .bg-yellow-50, .bg-amber-50, .bg-orange-50, .bg-red-50, .bg-rose-50, .bg-pink-50, .bg-fuchsia-50, .bg-purple-50, .bg-violet-50) {
                background-color: var(--allo-rt-surface) !important;
            }
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(.bg-slate-100, .bg-gray-100, .bg-stone-100, .bg-indigo-100, .bg-blue-100, .bg-sky-100, .bg-cyan-100, .bg-teal-100, .bg-green-100, .bg-emerald-100, .bg-lime-100, .bg-yellow-100, .bg-amber-100, .bg-orange-100, .bg-red-100, .bg-rose-100, .bg-pink-100, .bg-fuchsia-100, .bg-purple-100, .bg-violet-100) {
                background-color: var(--allo-rt-surface-muted) !important;
            }
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where([role="dialog"], .allo-popover-solid, [role="menu"], [role="listbox"], details, pre, code) {
                background-color: var(--allo-rt-surface-raised) !important;
                border-color: var(--allo-rt-border) !important;
            }
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(.bg-yellow-200, .bg-yellow-300, .bg-yellow-400, mark, .allo-rt-highlight) {
                background-color: var(--allo-rt-hl) !important;
                color: var(--allo-rt-fg) !important;
            }

            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(.border-slate-100, .border-slate-200, .border-slate-300, .border-gray-200, .border-gray-300, .border-indigo-100, .border-indigo-200, table, th, td, hr, details, blockquote) {
                border-color: var(--allo-rt-border) !important;
            }
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(th, summary) {
                background-color: var(--allo-rt-surface-muted) !important;
                color: var(--allo-rt-fg) !important;
            }
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(td, tr:nth-child(even), blockquote) {
                background-color: var(--allo-rt-surface) !important;
            }

            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :is(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, select, option) {
                background-color: var(--allo-rt-control) !important;
                color: var(--allo-rt-fg) !important;
                border-color: var(--allo-rt-border) !important;
            }
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :is(input, textarea)::placeholder {
                color: var(--allo-rt-muted) !important;
                opacity: 1;
            }
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(input, textarea, select) {
                accent-color: var(--allo-rt-link);
            }

            /* Content actions use the reading palette even when contrast mode's
               global button rule is active. The visible border preserves meaning
               without relying on a saturated fill that may clash with the tint. */
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(button, [role="button"]) {
                background-image: none !important;
                background-color: var(--allo-rt-control) !important;
                color: var(--allo-rt-fg) !important;
                border-color: var(--allo-rt-border) !important;
                box-shadow: none !important;
            }
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(button, [role="button"]):hover:not(:disabled) {
                background-color: var(--allo-rt-surface-hover) !important;
                color: var(--allo-rt-fg) !important;
            }
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(button, [role="button"]):is([aria-pressed="true"], [aria-checked="true"], [aria-current="true"], [aria-current="page"]) {
                background-color: var(--allo-rt-hl) !important;
                color: var(--allo-rt-fg) !important;
                border-color: var(--allo-rt-border) !important;
            }
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme="highContrast"] :where(button, [role="button"]):is(:hover:not(:disabled), [aria-pressed="true"], [aria-checked="true"], [aria-current="true"], [aria-current="page"]) {
                background-color: #ffff00 !important;
                color: #000000 !important;
            }

            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(a, .allo-glossary-term) {
                color: var(--allo-rt-link) !important;
                border-color: var(--allo-rt-link) !important;
            }
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(.text-green-600, .text-green-700, .text-emerald-600, .text-emerald-700) {
                color: var(--allo-rt-ok) !important;
            }
            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(.text-red-600, .text-red-700, .text-rose-600, .text-rose-700) {
                color: var(--allo-rt-err) !important;
            }

            :is(.theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(a, button, input, textarea, select, summary, [role="button"], [tabindex]):focus-visible {
                outline: 3px solid var(--allo-rt-focus) !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 0 2px var(--allo-rt-surface-raised) !important;
            }
            .theme-contrast .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) :where(a, button, input, textarea, select, summary, [role="button"], [tabindex]):focus-visible {
                outline-width: 4px !important;
                box-shadow: 0 0 0 2px var(--allo-rt-bg), 0 0 0 6px var(--allo-rt-focus) !important;
            }

            /* A stable inset edge makes a tinted lesson feel deliberately nested
               inside dark/contrast chrome and avoids a jarring hard seam. */
            .theme-dark .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) {
                box-shadow: inset 0 0 0 2px var(--allo-rt-border), 0 14px 30px rgba(2, 6, 23, 0.24) !important;
            }
            .theme-contrast .allo-docsuite [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) {
                box-shadow: inset 0 0 0 3px var(--allo-rt-border) !important;
            }
        }

        /* Reading-theme previews remain truthful in every app shell. Main high
           contrast intentionally restyles ordinary buttons, but these radios are
           color samples: preserving each accessible fg/bg pair is their content. */
        button.allo-reading-theme-swatch {
            background-color: var(--allo-reading-swatch-bg) !important;
            color: var(--allo-reading-swatch-fg) !important;
            border-color: var(--allo-reading-swatch-border) !important;
            min-height: 44px;
            min-width: 0;
            box-shadow: none !important;
        }
        button.allo-reading-theme-swatch > span {
            color: var(--allo-reading-swatch-fg) !important;
        }
        button.allo-reading-theme-swatch > span:last-child {
            display: block;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        button.allo-reading-theme-swatch:hover:not(:disabled) {
            background-color: var(--allo-reading-swatch-bg) !important;
            color: var(--allo-reading-swatch-fg) !important;
            border-color: var(--allo-reading-swatch-focus) !important;
        }
        button.allo-reading-theme-swatch[aria-checked="true"] {
            background-color: var(--allo-reading-swatch-bg) !important;
            color: var(--allo-reading-swatch-fg) !important;
            border-color: var(--allo-reading-swatch-focus) !important;
            box-shadow: 0 0 0 2px var(--allo-reading-swatch-bg), 0 0 0 4px var(--allo-reading-swatch-focus) !important;
        }
        button.allo-reading-theme-swatch:focus-visible {
            outline: 3px solid var(--allo-reading-swatch-focus) !important;
            outline-offset: 3px !important;
        }
        .theme-contrast button.allo-reading-theme-swatch:focus-visible {
            outline-width: 4px !important;
        }

        @media (forced-colors: active) {
            [data-reading-theme]:not([data-reading-theme=""]):not([data-reading-theme="default"]) {
                forced-color-adjust: auto;
                box-shadow: inset 0 0 0 2px CanvasText !important;
            }
            button.allo-reading-theme-swatch,
            button.allo-reading-theme-swatch:hover:not(:disabled),
            button.allo-reading-theme-swatch[aria-checked="true"] {
                forced-color-adjust: auto;
                background-color: Canvas !important;
                color: CanvasText !important;
                border-color: CanvasText !important;
                box-shadow: none !important;
            }
            button.allo-reading-theme-swatch > span { color: CanvasText !important; }
        }
        /* Reading tints are a screen comfort aid, not printable ink. Print uses
           a deterministic black-on-white palette so dark/high-contrast lessons
           never become solid pages and app-shell utility colors cannot reduce
           text legibility. Images, SVGs, and canvas output remain untouched. */
        @media print {
            [data-reading-theme] {
                --allo-rt-fg: #000000;
                --allo-rt-bg: #ffffff;
                --allo-rt-hl: #d9d9d9;
                --allo-rt-ok: #000000;
                --allo-rt-err: #000000;
                --allo-rt-link: #000000;
                --allo-rt-surface: #ffffff;
                --allo-rt-surface-raised: #ffffff;
                --allo-rt-surface-muted: #f2f2f2;
                --allo-rt-surface-hover: #f2f2f2;
                --allo-rt-border: #555555;
                --allo-rt-muted: #333333;
                --allo-rt-control: #ffffff;
                --allo-rt-focus: #000000;
                background-color: #ffffff !important;
                color: #000000 !important;
                color-scheme: light !important;
                box-shadow: none !important;
                -webkit-print-color-adjust: economy;
                print-color-adjust: economy;
            }
            [data-reading-theme] :where(*) {
                color: #000000 !important;
                text-shadow: none !important;
            }
            [data-reading-theme] :is(h1, h2, h3, h4, h5, h6, p, li, td, th, label, legend, figcaption, blockquote, dt, dd, small, strong, em, code, pre, span, div) {
                color: #000000 !important;
            }
            :is(.theme-light, .theme-dark, .theme-contrast) .allo-docsuite [data-reading-theme] :where(*) {
                color: #000000 !important;
            }
            [data-reading-theme] :where([class*="bg-"], [class*="from-"], [class*="via-"], [class*="to-"]) {
                background-color: transparent !important;
                background-image: none !important;
            }
            [data-reading-theme] :where(a, .allo-glossary-term) {
                color: #000000 !important;
                text-decoration: underline !important;
            }
            [data-reading-theme] :where(mark, .allo-rt-highlight) {
                background-color: #d9d9d9 !important;
                color: #000000 !important;
            }
            [data-reading-theme] :where(button, input, textarea, select, option, pre, code, table, th, td, blockquote, details) {
                background-color: #ffffff !important;
                color: #000000 !important;
                border-color: #555555 !important;
                box-shadow: none !important;
            }
        }
      `}</style>
  </>
);

window.AlloModules = window.AlloModules || {};
window.AlloModules.AppStyles = { AppStyles };
